import { homedir } from "node:os"
import { fileURLToPath } from "node:url"

import { createKitApi } from "./core/kit-api"
import { registerTools, type DegradedTool } from "./core/registry"
import type { KitContext } from "./core/context"
import type { KitTool } from "./core/tool"
import { discoverKitConfigFiles } from "./config/discover"
import { loadKitConfig } from "./config/load"
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
 * precedence, with `ctx.options` highest), resolves and validates each tool's
 * effective config, then registers every enabled tool. Per-tool failures are
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

  const sources: KitConfigFile[] = [...loaded, { ...(options ?? ctx.options) } as KitConfigFile]

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
      for (const registration of result.registrations) {
        await registration.dispose()
      }
    },
    degraded,
  }
}

// Task 8 provides the real tool barrel; until then the setup wiring stays minimal.
const tools: KitTool[] = []

export default {
  id: "opencode-kit",
  async setup(ctx: KitContext): Promise<() => Promise<void>> {
    const result = await bootstrap(ctx, tools, ctx.options as Record<string, unknown>)
    return result.dispose
  },
}
