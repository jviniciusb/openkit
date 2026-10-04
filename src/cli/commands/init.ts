import { join } from "node:path"

import { globalConfigPath, globalOpencodePath, projectConfigPath } from "../../config/discover"
import { ensurePluginEntry, seedTools } from "../../config/edit"
import type { ToolConfigEntry } from "../../config/types"
import { tools } from "../../tools/index"
import type { CliIo } from "./list"

/** Options accepted by {@link initCommand}. */
export interface InitOptions {
  /** Write the project-level config and `opencode.json` instead of the global ones. */
  project?: boolean
}

/** The plugin id OpenCode should load for the whole kit. */
const PLUGIN_ID = "opencode-kit"

/**
 * Handles `opencode-kit init [--project]`.
 *
 * Creates the kit config (global by default, project with `--project`) and seeds
 * every shipped tool with its declared default `enabled`/`settings`. It also
 * ensures the matching `opencode.json` lists `"opencode-kit"` in `plugins`,
 * creating that file when absent. Both writes are idempotent: existing tool
 * entries and plugin entries are never overwritten or duplicated.
 */
export async function initCommand(io: CliIo, options: InitOptions = {}): Promise<number> {
  const project = options.project ?? false

  const configPath = project ? projectConfigPath(io.cwd) : globalConfigPath(io.home)
  const opencodePath = project ? join(io.cwd, "opencode.json") : globalOpencodePath(io.home)

  const seeds: Record<string, ToolConfigEntry> = {}
  for (const tool of tools) {
    seeds[tool.id] = {
      enabled: tool.defaultEnabled ?? false,
      settings: tool.defaultSettings as Record<string, unknown>,
    }
  }

  await seedTools(configPath, seeds)
  await ensurePluginEntry(opencodePath, PLUGIN_ID)

  io.stdout(`${project ? "project" : "global"} config ready: ${configPath}`)
  io.stdout(`plugins: ${opencodePath}`)
  return 0
}
