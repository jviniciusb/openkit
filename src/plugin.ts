import { watch, type FSWatcher } from "node:fs"
import { homedir } from "node:os"
import { fileURLToPath } from "node:url"

import { createKitApi } from "./core/kit-api"
import { registerTools, type DegradedTool } from "./core/registry"
import type { KitContext } from "./core/context"
import type { KitTool } from "./core/tool"
import { discoverKitConfigFiles } from "./config/discover"
import { loadKitConfig } from "./config/load"
import { deepMerge } from "./config/merge"
import { resolveToolConfig } from "./config/resolve"
import { resolveValidated } from "./config/validate"
import type { KitConfigFile, ResolvedToolConfig } from "./config/types"

/** Absolute path of this package's root, used to resolve bundled scripts. */
const PACKAGE_ROOT = fileURLToPath(new URL("..", import.meta.url))

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
  /** Tools that could not be fully configured (invalid settings or failed registration). */
  degraded: DegradedTool[]
}

/**
 * Boots the kit against a plugin context.
 *
 * Discovers global + project config files, loads and merges them (low → high
 * precedence, then `ctx.options`, then any explicit `options`), resolves and
 * validates each tool's effective config, then registers every enabled tool. Per-tool failures are
 * isolated and reported in `degraded`; the returned `dispose` releases every
 * registration made.
 */
export async function bootstrap(
  ctx: KitContext,
  tools: KitTool[],
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

  const resolved = new Map<string, ResolvedToolConfig<unknown>>()
  const degraded: DegradedTool[] = []

  for (const tool of tools) {
    const { config, degraded: reason } = resolveValidated(tool, resolveToolConfig(tool, sources))
    resolved.set(tool.id, config as ResolvedToolConfig<unknown>)
    if (reason !== undefined) degraded.push({ id: tool.id, error: reason })
  }

  const result = await registerTools(tools, resolved, ctx, (toolId) =>
    createKitApi(toolId, ctx, PACKAGE_ROOT, ctx.app.version),
  )
  degraded.push(...result.degraded)

  return {
    async dispose() {
      // Release every registration even if a disposer throws, so one faulty
      // tool cannot leave the rest registered.
      const settled = await Promise.allSettled(result.registrations.map((r) => r.dispose()))
      for (const outcome of settled) {
        if (outcome.status === "rejected") {
          console.warn("opencode-kit: a registration disposer threw", outcome.reason)
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
      watchers.push(watch(path, debounced))
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
  /** Tools degraded in the current generation. */
  degraded(): DegradedTool[]
}

/**
 * Wraps {@link bootstrap} with a reload lifecycle.
 *
 * The lifecycle owns one bootstrapped generation at a time. `reload` disposes
 * the prior generation before bootstrapping a fresh one (never mutating in
 * place); `dispose` releases the generation and tears down the watcher. Reloads
 * are serialized, and a reload requested after disposal is ignored.
 */
export async function createLifecycle(
  ctx: KitContext,
  tools: KitTool[],
  options?: Record<string, unknown>,
  watch: WatchFactory = defaultWatch,
): Promise<Lifecycle> {
  let current = await bootstrap(ctx, tools, options)
  let stopped = false
  let queue: Promise<unknown> = Promise.resolve()

  const paths = discoverKitConfigFiles(ctx.location.directory, resolveHome(ctx))
  const unwatch = watch(paths, () => {
    void reload()
  })

  function reload(): Promise<void> {
    const run = queue.then(async () => {
      if (stopped) return
      await current.dispose()
      if (stopped) return
      current = await bootstrap(ctx, tools, options)
    })
    // Keep the chain alive even if a generation fails to dispose or bootstrap.
    queue = run.catch(() => {})
    return run
  }

  async function dispose(): Promise<void> {
    if (stopped) return
    stopped = true
    unwatch()
    await current.dispose()
  }

  return {
    reload,
    dispose,
    degraded: () => current.degraded,
  }
}

// Task 8 provides the real tool barrel; until then the setup wiring stays minimal.
const tools: KitTool[] = []

export default {
  id: "opencode-kit",
  async setup(ctx: KitContext): Promise<() => Promise<void>> {
    const life = await createLifecycle(ctx, tools, ctx.options as Record<string, unknown>)
    return life.dispose
  },
}
