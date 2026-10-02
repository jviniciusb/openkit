import { defineTool, type KitTool } from "../../core/tool"

/** Settings accepted by the example `hello` tool. */
export interface HelloSettings {
  /** Message prefix used when greeting. */
  greeting: string
}

/**
 * A minimal example tool.
 *
 * Demonstrates the `KitTool` contract end to end: typed settings, a JSON
 * Schema for validation, and a single `register` that adds one `hello` tool to
 * the `hello` namespace.
 */
export const hello: KitTool<HelloSettings> = defineTool({
  id: "hello",
  name: "Hello",
  description: "Example tool that greets you.",
  defaultEnabled: true,
  defaultSettings: { greeting: "Hello" },
  settingsSchema: {
    type: "object",
    properties: { greeting: { type: "string" } },
    required: ["greeting"],
    additionalProperties: false,
  },
  register(ctx, settings, kit) {
    kit.namespace("hello")
    return ctx.tool.transform((editor) => {
      editor.add({
        name: "hello",
        description: settings.greeting,
        input: {
          type: "object",
          properties: { name: { type: "string" } },
          additionalProperties: false,
        },
        execute: () => settings.greeting,
      })
    })
  },
})
