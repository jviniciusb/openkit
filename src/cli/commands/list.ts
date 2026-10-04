import { discoverKitConfigFiles } from "../../config/discover"
import { loadKitConfig } from "../../config/load"
import { resolveToolConfig } from "../../config/resolve"
import { tools } from "../../tools/index"

/** Filesystem and stream handles the CLI needs, injected for testability. */
export interface CliIo {
  /** Directory used to discover project-level config files. */
  cwd: string
  /** Home directory used to discover the global config file. */
  home: string
  stdout(s: string): void
  stderr(s: string): void
}

/**
 * Prints every shipped tool with its resolved enabled state and description.
 *
 * Enabled state is config-driven: config files are discovered from `io.cwd`
 * and `io.home`, loaded low → high precedence, and folded into each tool's
 * defaults via `resolveToolConfig`.
 */
export async function listCommand(io: CliIo): Promise<number> {
  const paths = discoverKitConfigFiles(io.cwd, io.home)
  const sources = await loadKitConfig(paths)

  for (const tool of tools) {
    const { enabled } = resolveToolConfig(tool, sources)
    io.stdout(`${tool.id}\t${enabled ? "enabled" : "disabled"}\t${tool.description}`)
  }

  return 0
}
