import { watch, type FSWatcher } from "node:fs"
import { homedir } from "node:os"

import { categories } from "./catalog"
import { registerKitCommand } from "./commands/kit"
import type { KitCategory } from "./core/category"
import type { KitContext } from "./core/context"
import { registerCategories, type DegradedItem } from "./core/engine"
import { discoverKitConfigFiles } from "./config/discover"
import { loadKitConfig } from "./config/load"
import { deepMerge } from "./config/merge"
import type { KitConfigFile } from "./config/types"

/** Home directory used for the global config: `ctx.home`, then `options.home`, then the OS home. */
function resolveHome(ctx: KitContext): string {
  const explicit = (ctx as KitContext & { home?: string }).home
  if (typeof explicit === "string") return explicit
  const fromOptions = ctx.options.home
  if (typeof fromOptions === "string") return fromOptions
  return homedir()
}

export interface BootstrapResult {
  /** Disposes every registration created during bootstrap. */
  dispose(): Promise<void>
  /** Items that could not be fully configured (invalid settings or failed registration). */
  degraded: DegradedItem[]
}

/**
 * Boots the kit against a plugin context.
 *
 * Discovers global + project config files, loads and merges them (low → high
 * precedence, then `ctx.options`, then any explicit `options`), then resolves
 * and registers every enabled item across `categories` in catalog order. Per-item
 * failures are isolated and reported in `degraded`; the returned `dispose`
 * releases every registration made concurrently via `Promise.allSettled`, so one
 * failing disposer cannot block the rest.
 */
export async function bootstrap(
  ctx: KitContext,
  categories: readonly KitCategory<unknown>[],
  options?: Record<string, unknown>,
): Promise<BootstrapResult> {
  const home = resolveHome(ctx)
  const paths = discoverKitConfigFiles(ctx.location.directory, home)
  const loaded = await loadKitConfig(paths)

  // Plugin options stay the highest layer; explicit `options` layer on top
  // without dropping nested keys from `ctx.options` (deep, config-file merge).
  const sources: KitConfigFile[] = [
    ...loaded,
    deepMerge(ctx.options, options ?? {}) as KitConfigFile,
  ]

  // Every category shares one registration list so `dispose` releases them
  // together; disposal is concurrent and order-independent.
  const { registrations, degraded } = await registerCategories(categories, sources, ctx)

  // Surface every degraded item so a silently broken registration or invalid
  // setting is visible in the session logs (spec §5.1/§6.3).
  for (const entry of degraded) {
    console.warn(`openkit: ${entry.category} "${entry.id}" degraded: ${entry.error}`)
  }

  return {
    async dispose() {
      // Release every registration even if a disposer throws, so one faulty
      // item cannot leave the rest registered.
      const settled = await Promise.allSettled(registrations.map((r) => r.dispose()))
      for (const outcome of settled) {
        if (outcome.status === "rejected") {
          console.warn("openkit: a registration disposer threw", outcome.reason)
        }
      }
    },
    degraded,
  }
}

/** Debounce window applied to filesystem change bursts. */
const WATCH_DEBOUNCE_MS = 150

/**
 * Factory that starts watching `paths`, invoking `cb` on change, and returns a
 * teardown that stops watching. Tests inject a no-op; production uses
 * {@link defaultWatch}.
 */
export type WatchFactory = (paths: string[], cb: () => void) => () => void

/**
 * Default watcher: one `fs.watch` per config file, debounced ~150ms, so a burst
 * of writes triggers a single reload.
 */
export function defaultWatch(paths: string[], cb: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  const debounced = () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = undefined
      cb()
    }, WATCH_DEBOUNCE_MS)
  }

  const watchers: FSWatcher[] = []
  for (const path of paths) {
    try {
      const watcher = watch(path, debounced)
      // Watch errors are emitted asynchronously; log them rather than throwing
      // from an event callback, which would crash the process.
      watcher.on("error", (error) => {
        console.warn("openkit: config watcher error", error)
      })
      watchers.push(watcher)
    } catch {
      // The file may have vanished between discovery and watch; skip it.
    }
  }

  return () => {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
    for (const watcher of watchers) watcher.close()
  }
}

export interface Lifecycle {
  /** Disposes the current registrations, then bootstraps a fresh generation. */
  reload(): Promise<void>
  /** Disposes the current registrations and stops watching. */
  dispose(): Promise<void>
  /** Items degraded in the current generation. */
  degraded(): DegradedItem[]
}

/**
 * Wraps {@link bootstrap} with a reload lifecycle.
 *
 * The lifecycle owns one bootstrapped generation at a time. `reload` disposes
 * the prior generation before bootstrapping a fresh one (never mutating in
 * place). Every state change runs on a single serialized queue, so `dispose`
 * can await all pending reloads before releasing the latest generation — a
 * reload in flight when `dispose` is called still installs its generation, and
 * `dispose` then releases that one too (exactly once). A reload requested after
 * disposal is a no-op, and `dispose` is idempotent.
 */
export async function createLifecycle(
  ctx: KitContext,
  categories: readonly KitCategory<unknown>[],
  options?: Record<string, unknown>,
  watch: WatchFactory = defaultWatch,
): Promise<Lifecycle> {
  let current = await bootstrap(ctx, categories, options)
  let stopped = false

  /** Tail of the serialized operation chain; always settles, never rejects. */
  let queue: Promise<void> = Promise.resolve()
  let disposePromise: Promise<void> | undefined

  /** Appends `task` to the serialized chain and returns its own promise. */
  function enqueue(task: () => Promise<void>): Promise<void> {
    const run = queue.then(task)
    // Swallow failures on the tail so one rejection cannot stall later work.
    queue = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  const paths = discoverKitConfigFiles(ctx.location.directory, resolveHome(ctx))
  const unwatch = watch(paths, () => {
    reload().catch((error) => {
      console.warn("openkit: config reload failed", error)
    })
  })

  function reload(): Promise<void> {
    if (disposePromise !== undefined) return Promise.resolve()
    return enqueue(async () => {
      if (stopped) return
      await current.dispose()
      // Replace the disposed generation with an empty one before bootstrapping
      // so a bootstrap rejection cannot leave `current` pointing at an
      // already-disposed generation (which `dispose` would release twice).
      current = { async dispose() {}, degraded: [] }
      // If disposal began while the prior generation was being released, the
      // queued disposable will collect whatever this task installs below.
      current = await bootstrap(ctx, categories, options)
    })
  }

  function dispose(): Promise<void> {
    if (disposePromise !== undefined) return disposePromise
    stopped = true
    unwatch()
    // `enqueue` runs after every pending/queued reload, so `current` is then
    // the newest generation — including one installed by a reload that was
    // still bootstrapping when dispose() was called.
    disposePromise = enqueue(async () => {
      await current.dispose()
    })
    return disposePromise
  }

  return {
    reload,
    dispose,
    degraded: () => current.degraded,
  }
}

export default {
  id: "openkit",
  async setup(ctx: KitContext): Promise<() => Promise<void>> {
    const life = await createLifecycle(ctx, categories, ctx.options as Record<string, unknown>)
    // Register the `/kit` command alongside the tool lifecycle so it is
    // disposed with everything else. It lives for the whole session (not per
    // reload generation) and drives reloads after each config mutation.
    try {
      const command = await registerKitCommand(ctx, {
        home: resolveHome(ctx),
        cwd: ctx.location.directory,
        reload: () => life.reload(),
        stdout: (message) => console.log(message),
      })
      return async () => {
        await command.dispose()
        await life.dispose()
      }
    } catch (error) {
      // Command registration failed after tools were installed; release the
      // lifecycle so no registrations leak, then surface the failure.
      await life.dispose()
      throw error
    }
  },
}
