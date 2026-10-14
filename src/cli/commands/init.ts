import { join } from "node:path"

import { categories } from "../../catalog"
import { globalConfigPath, globalOpencodePath, projectConfigPath } from "../../config/discover"
import { ensurePluginEntry, seedEntries } from "../../config/edit"
import type { CategoryEntry } from "../../config/types"
import { itemId } from "../../core/engine"
import type { CliIo } from "./list"

/** Options accepted by {@link initCommand}. */
export interface InitOptions {
  /** Write the project-level config and `opencode.json` instead of the global ones. */
  project?: boolean
}

/** The plugin id OpenCode should load for the whole kit. */
const PLUGIN_ID = "openkit"

/**
 * Handles `openkit init [--project]`.
 *
 * Creates the kit config (global by default, project with `--project`) and seeds
 * every shipped item of every category with its declared defaults: `enabled`
 * from the category's `defaultEnabled`, plus `settings` for settings-bearing
 * categories. It also ensures the matching `opencode.json` lists
 * `"openkit"` in `plugins`, creating that file when absent. Both writes are
 * idempotent: existing entries, and plugin entries, are never overwritten or
 * duplicated.
 */
export async function initCommand(io: CliIo, options: InitOptions = {}): Promise<number> {
  const project = options.project ?? false

  const configPath = project ? projectConfigPath(io.cwd) : globalConfigPath(io.home)
  const opencodePath = project ? join(io.cwd, "opencode.json") : globalOpencodePath(io.home)

  for (const category of categories) {
    const seeds: Record<string, CategoryEntry> = {}
    for (const item of category.items) {
      const entry: CategoryEntry = { enabled: category.defaultEnabled(item) }
      if (category.hasSettings) entry.settings = category.defaultSettings?.(item)
      seeds[itemId(item)] = entry
    }
    await seedEntries(configPath, category.key, seeds)
  }

  await ensurePluginEntry(opencodePath, PLUGIN_ID)

  io.stdout(`${project ? "project" : "global"} config ready: ${configPath}`)
  io.stdout(`plugins: ${opencodePath}`)
  return 0
}
