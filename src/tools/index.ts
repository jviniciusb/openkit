import type { KitTool } from "../core/tool"
import { contextInjections } from "./context-injections/index"

/**
 * Every tool shipped by openkit.
 *
 * Add new tools between the `<kit:tools>` markers below; keep those comments
 * intact.
 */
export const tools: KitTool[] = [
  // <kit:tools>
  contextInjections,
  // </kit:tools>
]
