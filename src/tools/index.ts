import type { KitTool } from "../core/tool"
import { autoCompact } from "./auto-compact/index"
import { backgroundSubagents } from "./background-subagents/index"
import { contextInjections } from "./context-injections/index"

/**
 * Every tool shipped by opencode-kit.
 *
 * The scaffolder inserts new entries between the `<kit:tools>` markers below;
 * keep those comments intact.
 */
export const tools: KitTool[] = [
  // <kit:tools>
  autoCompact,
  backgroundSubagents,
  contextInjections,
  // </kit:tools>
]
