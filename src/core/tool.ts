import type {
  CommandDefinition,
  HookHandler,
  KitContext,
  KitStorage,
  Logger,
  Registration,
  SkillDefinition,
  ToolDefinition,
} from "./context"

/** JSON Schema (draft-agnostic bag of keywords) for a tool's settings/inputs. */
export type JsonSchema = Record<string, unknown>

/** The contract every kit tool implements. */
export interface KitTool<S = unknown> {
  /** Unique, kebab-case identifier, e.g. `"conventional-commits"`. */
  id: string
  /** Display name. */
  name: string
  /** One line, shown in `openkit list`. */
  description: string
  /** Default false: tools are opt-in unless they say otherwise. */
  defaultEnabled?: boolean
  /** The tool's default settings, merged with user config. */
  defaultSettings: S
  /** JSON Schema validating `settings`. */
  settingsSchema?: JsonSchema
  /** Single registration mechanism: declare everything the tool needs here.
   * A tool may return the `Registration` from a direct `ctx` call so the caller
   * can dispose it; the registry also tracks registrations independently. */
  register(
    ctx: KitContext,
    settings: S,
    kit: KitApi,
  ): void | Registration | Promise<void | Registration>
}

/** Convenience API passed to `register`, scoped to a single tool. */
export interface KitApi {
  /** Sets the namespace applied by the `tool`/`command`/`skill` helpers. */
  namespace(toolId: string): void
  storage: KitStorage
  log: Logger
  version: string
  tool(def: ToolDefinition): Promise<Registration>
  command(def: CommandDefinition): Promise<Registration>
  skill(def: SkillDefinition): Promise<Registration>
  on(kind: string, handler: HookHandler, opts?: unknown): Promise<Registration>
  /** Registers a tool-execution hook, e.g. `"execute.before"`. */
  toolHook(name: string, handler: HookHandler): Promise<Registration>
}

/**
 * Adds typing and introspection to a tool definition, normalizing
 * `defaultEnabled` to a boolean (opt-in by default).
 */
export function defineTool<S>(tool: KitTool<S>): KitTool<S> {
  return { defaultEnabled: false, ...tool }
}
