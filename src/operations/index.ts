/**
 * Shared list/toggle/config operations used by the `/kit` command, so the
 * resolution and warning logic lives in one place.
 */
export type { OperationDeps, OperationResult } from "./list"
export { listOperation } from "./list"
export { toggleOperation } from "./toggle"
export { configGetOperation, configSetOperation } from "./config"
