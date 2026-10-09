import { categories } from "../../catalog"
import { configGetOperation, configSetOperation } from "../../operations/index"
import { cliOperationDeps, type CliIo } from "./list"

/**
 * Handles `config get <id> <key>` and `config set <id> <key> <value>`.
 *
 * Delegates to `configGetOperation` / `configSetOperation`: `get` prints the
 * item's effective setting as JSON; `set` coerces the value and writes it
 * comment-preservingly, then reports any advisory degradation/override.
 */
export async function configCommand(io: CliIo, args: string[]): Promise<number> {
  const [action, toolId, key, ...valueParts] = args
  const deps = cliOperationDeps(io)

  if (action === "get") return (await configGetOperation(categories, deps, toolId, key)).exitCode
  if (action === "set") {
    return (await configSetOperation(categories, deps, toolId, key, valueParts)).exitCode
  }
  io.stderr(`opencode-kit: config expects "get" or "set"`)
  return 1
}
