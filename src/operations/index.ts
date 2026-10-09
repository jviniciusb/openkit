/**
 * Shared list/toggle/config operations used by both the CLI and the `/kit`
 * command, so the two frontends never duplicate the resolution and warning
 * logic.
 */
export type { OperationDeps, OperationResult } from "./list"
export { listOperation } from "./list"
export { toggleOperation } from "./toggle"
export { configGetOperation, configSetOperation } from "./config"
