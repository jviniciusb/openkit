import { defineTool, type KitTool } from "../../core/tool"

/** Settings accepted by the `context-injections` tool. */
export interface ContextInjectionsSettings {
  /** Instruction blocks pushed into the system prompt, in array order. */
  instructions: string[]
}

/**
 * Injects configured instructions into the model's system prompt on every model
 * request (the `context` session hook). Each non-empty string in
 * `settings.instructions` becomes its own system part, in array order.
 *
 * This is the generic vehicle for arbitrary instructions. A "think in code"
 * block — the idea popularized by context-mode (https://github.com/mksglu/context-mode)
 * — is documented as a sample in the README, not shipped as a default (kit
 * settings arrays replace, so a default list would be lost on any override).
 */
export const contextInjections: KitTool<ContextInjectionsSettings> = defineTool<ContextInjectionsSettings>({
  id: "context-injections",
  name: "Context Injections",
  description: "Injects configured instructions into the model's system prompt.",
  defaultEnabled: false,
  defaultSettings: { instructions: [] },
  settingsSchema: {
    type: "object",
    properties: { instructions: { type: "array", items: { type: "string" } } },
    additionalProperties: false,
  },
  register(_ctx, settings, kit) {
    const blocks = settings.instructions.map((text) => text.trim()).filter((text) => text.length > 0)
    if (blocks.length === 0) return
    return kit.on("context", (event) => {
      const system = (event as { system?: Array<{ type: string; text: string }> }).system
      if (!Array.isArray(system)) return
      for (const text of blocks) system.push({ type: "text", text })
    })
  },
})
