import { join } from "node:path"

import type {
  CommandDefinition,
  CommandEditor,
  HookHandler,
  KitContext,
  Logger,
  Namespace,
  Registration,
  SkillDefinition,
  SkillEditor,
  ToolDefinition,
  ToolEditor,
} from "./context"
import type { KitApi } from "./tool"

/** Builds the scoped logger surfaced to a single tool. */
function scopedLogger(toolId: string): Logger {
  const prefix = `[opencode-kit:${toolId}]`
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
 * for subsequently registered tools/commands/skills (defaulting to `toolId`),
 * and each helper applies the current namespace to the editor before adding
 * the definition. `scriptPath` resolves bundled scripts under the installed
 * package's `scripts/<toolId>/` directory.
 */
export function createKitApi(
  toolId: string,
  ctx: KitContext,
  packageRoot: string,
  version: string,
): KitApi {
  let namespaceName = toolId

  const applyNamespace = (
    editor: { namespace?(namespace: Namespace): void },
    description: string | undefined,
  ) => {
    if (typeof editor.namespace === "function") {
      editor.namespace({ name: namespaceName, description })
    }
  }

  return {
    namespace(name: string) {
      namespaceName = name
    },
    scriptPath(name: string) {
      return join(packageRoot, "scripts", toolId, name)
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
        applyNamespace(editor, def.description)
        editor.add(def)
      })
    },
    async skill(def: SkillDefinition): Promise<Registration> {
      return ctx.skill.transform((editor: SkillEditor) => {
        applyNamespace(editor, def.description)
        editor.add(def)
      })
    },
    async on(kind: string, handler: HookHandler): Promise<Registration> {
      return ctx.session.hook(kind, handler)
    },
  }
}
