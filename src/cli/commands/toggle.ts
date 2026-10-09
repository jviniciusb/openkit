import { categories } from "../../catalog"
import { toggleOperation } from "../../operations/index"
import { cliOperationDeps, type CliIo } from "./list"

/**
 * Handles `enable <id>` / `disable <id>`.
 *
 * Delegates to `toggleOperation`, which resolves the id across categories in
 * catalog order and writes `<category>[id].enabled` to the global kit config.
 * Unknown or missing ids are user errors that leave the filesystem untouched.
 */
export async function toggleCommand(
  io: CliIo,
  toolId: string | undefined,
  enabled: boolean,
): Promise<number> {
  const result = await toggleOperation(categories, cliOperationDeps(io), toolId, enabled)
  return result.exitCode
}
