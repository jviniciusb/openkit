import type { KitTool } from "../core/tool"
import { backgroundSubagents } from "./background-subagents/index"
import { contextInjections } from "./context-injections/index"

/**
 * Every tool shipped by openkit.
 *
 * The scaffolder inserts new entries between the `<kit:tools>` markers below;
 * keep those comments intact.
 */
export const tools: KitTool[] = [
  // <kit:tools>
  backgroundSubagents,
  contextInjections,
  // </kit:tools>
]
