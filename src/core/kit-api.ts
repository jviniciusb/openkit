import type {
  CommandDefinition,
  CommandEditor,
  HookHandler,
  KitContext,
  Logger,
  Registration,
  SkillDefinition,
  SkillEditor,
  ToolDefinition,
  ToolEditor,
} from "./context"
import type { KitApi } from "./tool"

/** Builds the scoped logger surfaced to a single tool. */
function scopedLogger(toolId: string): Logger {
  const prefix = `[openkit:${toolId}]`
  return {
    debug(message, meta) {
      console.debug(prefix, message, meta ?? "")
    },
    info(message, meta) {
      console.info(prefix, message, meta ?? "")
    },
    warn(message, meta) {
      console.warn(prefix, message, meta ?? "")
    },
    error(message, meta) {
      console.error(prefix, message, meta ?? "")
    },
  }
}

/**
 * Creates the per-tool {@link KitApi} handed to `KitTool.register`.
 *
 * The API is scoped to `toolId`: `namespace(name)` changes the name recorded
 * for subsequently registered tools (defaulting to `toolId`). Only tools carry
 * a namespace in V2; commands and skills are added as given.
 */
export function createKitApi(
  toolId: string,
  ctx: KitContext,
  version: string,
): KitApi {
  let namespaceName = toolId

  const applyNamespace = (
    editor: ToolEditor,
    description: string | undefined,
  ) => {
    editor.namespace({ name: namespaceName, description: description ?? namespaceName })
  }

  return {
    namespace(name: string) {
      namespaceName = name
    },
    storage: ctx.storage,
    log: scopedLogger(toolId),
    version,
    async tool(def: ToolDefinition): Promise<Registration> {
      return ctx.tool.transform((editor: ToolEditor) => {
        applyNamespace(editor, def.description)
        editor.add(def)
      })
    },
    async command(def: CommandDefinition): Promise<Registration> {
      return ctx.command.transform((editor: CommandEditor) => {
        editor.add(def)
      })
    },
    async skill(def: SkillDefinition): Promise<Registration> {
      return ctx.skill.transform((editor: SkillEditor) => {
        editor.add(def)
      })
    },
    async on(kind: string, handler: HookHandler, opts?: unknown): Promise<Registration> {
      return ctx.session.hook(kind, handler, opts)
    },
    async toolHook(name: string, handler: HookHandler): Promise<Registration> {
      return ctx.tool.hook(name, handler)
    },
  }
}
