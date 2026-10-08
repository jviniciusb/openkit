import { globalConfigPath } from "../../config/discover"
import { setSkillEnabled, setToolEnabled } from "../../config/edit"
import {
  buildConfigLayers,
  readPluginOptions,
  resolveEffective,
  resolveSkillEffective,
} from "../../config/effective"
import { skills } from "../../skills/index"
import { tools } from "../../tools/index"
import type { CliIo } from "./list"

/**
 * Handles `enable <id>` / `disable <id>`.
 *
 * The id is resolved against the shipped tools first, then the shipped skills.
 * For a tool, `tools[id].enabled` is written to the global kit config; for a
 * skill, `skills[id].enabled` is written instead. Unknown or missing ids are
 * user errors and leave the filesystem untouched. After writing, the effective
 * state is resolved across all layers; if a project config or plugin `options`
 * overrides the global write, an advisory warning names the overriding layer
 * (exit stays 0).
 */
export async function toggleCommand(
  io: CliIo,
  toolId: string | undefined,
  enabled: boolean,
): Promise<number> {
  const verb = enabled ? "enable" : "disable"

  if (toolId === undefined || toolId.length === 0) {
    io.stderr(`opencode-kit: ${verb} requires a tool id`)
    return 1
  }

  const tool = tools.find((candidate) => candidate.id === toolId)
  const skill = skills.find((candidate) => candidate.id === toolId)
  if (tool === undefined && skill === undefined) {
    io.stderr(`opencode-kit: unknown tool "${toolId}"`)
    return 1
  }

  if (tool !== undefined) {
    await setToolEnabled(globalConfigPath(io.home), toolId, enabled)
    io.stdout(`${toolId} ${enabled ? "enabled" : "disabled"}`)

    // Resolve after the write so the global layer reflects the new value.
    const layers = await buildConfigLayers(
      io.cwd,
      io.home,
      process.env,
      readPluginOptions(io.cwd, io.home),
    )
    const effective = resolveEffective(tool, layers)
    if (effective.enabled !== enabled) {
      io.stderr(
        `opencode-kit: warning: "${toolId}" is effectively ${effective.enabled ? "enabled" : "disabled"}; your change is overridden by ${effective.enabledLayer?.label ?? "a higher-precedence layer"}`,
      )
    }

    return 0
  }

  if (skill !== undefined) {
    await setSkillEnabled(globalConfigPath(io.home), toolId, enabled)
    io.stdout(`${toolId} ${enabled ? "enabled" : "disabled"}`)

    const layers = await buildConfigLayers(
      io.cwd,
      io.home,
      process.env,
      readPluginOptions(io.cwd, io.home),
    )
    const effective = resolveSkillEffective(skill, layers)
    if (effective.enabled !== enabled) {
      io.stderr(
        `opencode-kit: warning: "${toolId}" is effectively ${effective.enabled ? "enabled" : "disabled"}; your change is overridden by ${effective.enabledLayer?.label ?? "a higher-precedence layer"}`,
      )
    }
  }

  return 0
}
