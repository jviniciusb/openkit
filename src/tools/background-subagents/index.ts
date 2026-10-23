import type { ToolExecuteBeforeEvent } from "../../core/context"
import { defineTool, type KitTool } from "../../core/tool"

/** Effective name of OpenCode's built-in child-session tool. */
export const SUBAGENT_TOOL = "subagent"

/** No settings: the tool is a fixed, all-or-nothing behavior. */
export type BackgroundSubagentsSettings = Record<string, never>

/**
 * Forces every built-in `subagent` call into background mode.
 *
 * Registers a single `execute.before` tool hook. For the `subagent` tool only,
 * it replaces the input with the original fields plus `background: true`,
 * overriding an omitted or `false` value. Every other tool — including `shell`
 * — and every other subagent field is left untouched. OpenCode's native parent
 * result/failure reporting is used; no notification mechanism is added.
 */
export const backgroundSubagents: KitTool<BackgroundSubagentsSettings> = defineTool({
  id: "background-subagents",
  name: "Background Subagents",
  description: "Force every subagent call to run in the background.",
  defaultSettings: {},
  settingsSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  register(ctx) {
    return ctx.tool.hook("execute.before", (event: ToolExecuteBeforeEvent) => {
      if (event.tool !== SUBAGENT_TOOL) return
      const input = event.input
      if (typeof input !== "object" || input === null || Array.isArray(input)) return
      event.input = { ...(input as Record<string, unknown>), background: true }
    })
  },
})
