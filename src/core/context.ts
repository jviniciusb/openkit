/**
 * Minimal local structural subset of the OpenCode V2 plugin context.
 *
 * This project deliberately does not import `@opencode/plugin`: the real type
 * lives outside the compiler's sight (and pulling it in would couple the kit to
 * a runtime package it never calls). Instead we declare only the members the kit
 * actually uses. Because TypeScript is structural, a real V2 `Context` satisfies
 * this shape; the kit never depends on the rest of it.
 */

/** A disposable returned by every `transform`/`hook` registration. */
export interface Registration {
  dispose(): void | Promise<void>
}

/** Structured logging surface handed to tools. */
export interface Logger {
  debug(message: string, meta?: unknown): void
  info(message: string, meta?: unknown): void
  warn(message: string, meta?: unknown): void
  error(message: string, meta?: unknown): void
}

/** Durable JSON storage exposed to tools (structural subset of the V2 domain). */
export interface KitStorage {
  get(key: string): Promise<unknown | undefined>
  set(key: string, value: unknown): Promise<void>
  remove(key: string): Promise<void>
}

/** Namespace metadata applied to a transform editor (V2 `Tool.Namespace`). */
export interface Namespace {
  name: string
  description?: string
}

export interface ToolDefinition {
  name: string
  description?: string
  input?: unknown
  execute?: (...args: never[]) => unknown
  [key: string]: unknown
}

export interface ToolEditor {
  namespace(namespace: Namespace): void
  add(definition: ToolDefinition): void
}

export interface CommandDefinition {
  name: string
  description?: string
  execute?: (...args: never[]) => unknown
  [key: string]: unknown
}

export interface CommandEditor {
  add(definition: CommandDefinition): void
  namespace?(namespace: Namespace): void
}

export interface SkillDefinition {
  id: string
  name: string
  description?: string
  path?: string
  content?: string
  [key: string]: unknown
}

export interface SkillEditor {
  add(definition: SkillDefinition): void
  namespace?(namespace: Namespace): void
}

/**
 * Session hook callback. The event payload differs per hook name; tools narrow
 * it themselves, so the kit stays agnostic here.
 */
export type HookHandler<Event = any> = (event: Event) => void | Promise<void>

export interface SessionDomain {
  hook(name: string, handler: HookHandler): Promise<Registration>
}

/**
 * The slice of the V2 plugin context the kit uses: instance location and
 * options, the app version, storage, the tool/command/skill transform editors,
 * and the session hook registrar.
 */
export interface KitContext {
  readonly app: { readonly version: string }
  readonly location: { readonly directory: string }
  readonly options: Readonly<Record<string, unknown>>
  readonly storage: KitStorage
  readonly tool: {
    transform(callback: (editor: ToolEditor) => void): Promise<Registration>
  }
  readonly command: {
    transform(callback: (editor: CommandEditor) => void): Promise<Registration>
  }
  readonly skill: {
    transform(callback: (editor: SkillEditor) => void): Promise<Registration>
  }
  readonly session: SessionDomain
}
