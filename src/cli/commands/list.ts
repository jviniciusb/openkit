import { discoverKitConfigFiles } from "../../config/discover"
import { loadKitConfig } from "../../config/load"
import { resolveSkillConfig, resolveToolConfig } from "../../config/resolve"
import { skillDescription } from "../../core/skill"
import { skills } from "../../skills/index"
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
 * Prints every shipped tool and skill with its resolved enabled state.
 *
 * Enabled state is config-driven: config files are discovered from `io.cwd`
 * and `io.home`, loaded low → high precedence, and folded into each tool's
 * defaults via `resolveToolConfig` (and each skill's via `resolveSkillConfig`).
 * Output is a `tools:` section followed by a `skills:` section, one
 * `<id>\t<enabled|disabled>\t<description>` line each.
 */
export async function listCommand(io: CliIo): Promise<number> {
  const paths = discoverKitConfigFiles(io.cwd, io.home)
  const sources = await loadKitConfig(paths)

  io.stdout("tools:\n")
  for (const tool of tools) {
    const { enabled } = resolveToolConfig(tool, sources)
    io.stdout(`${tool.id}\t${enabled ? "enabled" : "disabled"}\t${tool.description}\n`)
  }

  io.stdout("skills:\n")
  for (const skill of skills) {
    const { enabled } = resolveSkillConfig(skill, sources)
    io.stdout(`${skill.id}\t${enabled ? "enabled" : "disabled"}\t${skillDescription(skill)}\n`)
  }

  return 0
}
