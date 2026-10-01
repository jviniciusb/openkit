import type { KitTool } from "../core/tool"
import { deepMerge } from "./merge"
import type { KitConfigFile, ResolvedToolConfig } from "./types"

/**
 * Resolves a tool's effective config from sources ordered low → high precedence.
 *
 * Starts from the tool defaults, then folds each source that mentions the tool:
 * `enabled` replaces, `settings` deep-merges. Sources for other tool ids are ignored.
 */
export function resolveToolConfig<S>(
  tool: KitTool<S>,
  sources: KitConfigFile[],
): ResolvedToolConfig<S> {
  let enabled = tool.defaultEnabled ?? false
  let settings = tool.defaultSettings

  for (const source of sources) {
    const entry = source.tools?.[tool.id]
    if (entry === undefined) continue
    if (entry.enabled !== undefined) enabled = entry.enabled
    if (entry.settings !== undefined) settings = deepMerge(settings, entry.settings)
  }

  return { enabled, settings }
}
