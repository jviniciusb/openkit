import type { KitTool } from "../core/tool"
import { hello } from "./hello/index"

/**
 * Every tool shipped by opencode-kit.
 *
 * The scaffolder inserts new entries between the `<kit:tools>` markers below;
 * keep those comments intact.
 */
export const tools: KitTool[] = [
  // <kit:tools>
  hello,
  // </kit:tools>
]
