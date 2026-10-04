import { globalConfigPath } from "../../config/discover"
import { setToolEnabled } from "../../config/edit"
import { tools } from "../../tools/index"
import type { CliIo } from "./list"

/**
 * Handles `enable <id>` / `disable <id>`.
 *
 * Writes `tools[id].enabled` to the global kit config, creating it if needed,
 * and reports the result on stdout. Unknown or missing ids are user errors and
 * leave the filesystem untouched.
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

  if (!tools.some((tool) => tool.id === toolId)) {
    io.stderr(`opencode-kit: unknown tool "${toolId}"`)
    return 1
  }

  await setToolEnabled(globalConfigPath(io.home), toolId, enabled)
  io.stdout(`${toolId} ${enabled ? "enabled" : "disabled"}`)
  return 0
}
