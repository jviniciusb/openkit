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

/** Minimal public event-stream item used by lifecycle tools. */
export interface KitEvent {
  type: string
  data: unknown
  created?: number
}

/** Public server events exposed by the V2 plugin context. */
export interface EventDomain {
  subscribe(options?: { signal?: AbortSignal }): AsyncIterable<KitEvent>
}

/** Token fields needed to estimate the latest model request's prompt size. */
export interface SessionMessageTokens {
  input: number
  cache: { read: number; write: number }
}

export interface SessionMessageInfo {
  type: string
  time?: { created?: number }
  tokens?: SessionMessageTokens
}

/** Structured logging surface handed to tools. */
export interface Logger {
  debug(message: string, meta?: unknown): void
  info(message: string, meta?: unknown): void
  warn(message: string, meta?: unknown): void
  error(message: string, meta?: unknown): void
}

/** One page of storage entries returned by {@link KitStorage.scan}. */
export interface StorageScanResult {
  entries: readonly { key: string; value: unknown }[]
  /** Opaque cursor for the next page; absent when the scan is exhausted. */
  next?: string
}

/** Durable JSON storage exposed to tools (structural subset of the V2 domain). */
export interface KitStorage {
  get(key: string): Promise<unknown | undefined>
  set(key: string, value: unknown): Promise<void>
  remove(key: string): Promise<void>
  /** Lists stored entries, optionally filtered by `prefix` and paged. */
  scan(options: { prefix: string; after?: string; limit?: number }): Promise<StorageScanResult>
}

/** Namespace metadata applied to the tool transform editor (V2 `Tool.Namespace`). */
export interface Namespace {
  name: string
  description: string
}

/** Result a tool executor returns (V2 `Tool.Content`-shaped). */
export interface ToolResult {
  content: unknown
}

/** Host-level tool options (V2 `Tool.Options`, including its `codemode`/`pinned` union). */
export type ToolOptions = {
  namespace?: string
  permission?: string
} & (
  | {
      /** Scriptable from Code Mode; otherwise the tool is only directly callable. */
      codemode?: true
      pinned?: boolean
    }
  | { codemode: boolean; pinned?: never }
)

export interface ToolDefinition {
  name: string
  description?: string
  input?: unknown
  options?: ToolOptions
  /** V2 tool executors are async and return `{ content }`. */
  execute?: (input: unknown, context?: unknown) => Promise<ToolResult> | ToolResult
  [key: string]: unknown
}

export interface ToolEditor {
  namespace(namespace: Namespace): void
  /**
   * `any` because the host types this against a generic tool schema the kit
   * does not model; a tool author's definition is typed by `KitApi.tool`.
   */
  add(definition: any): void
}

/** Payload of the built-in tool `execute.before` hook. `input` is mutable. */
export interface ToolExecuteBeforeEvent {
  /** Effective name of the tool about to run, e.g. `"subagent"`. */
  tool: string
  /** Mutable tool input; assign or mutate it to change what executes. */
  input: unknown
  /** Invocation identifiers provided by the host. */
  sessionID: string
  agent: string
  messageID: string
  id: string
  [key: string]: unknown
}

/** Tool domain: transforms add definitions; hooks intercept execution. */
export interface ToolDomain {
  transform(callback: (editor: ToolEditor) => void): Promise<Registration>
  /** Register a tool-execution hook, e.g. `"execute.before"`. */
  hook(name: string, handler: HookHandler): Promise<Registration>
}

export interface CommandDefinition {
  name: string
  description?: string
  execute?: (...args: never[]) => unknown
  [key: string]: unknown
}

export interface CommandEditor {
  /** `any` for the same reason as `ToolEditor.add`; `/kit` types its own definition. */
  add(definition: any): void
}

export interface SkillDefinition {
  id: string
  name: string
  description?: string
  path?: string
  content?: string
  autoinvoke?: boolean
  [key: string]: unknown
}

export interface SkillEditor {
  /** `any` for the same reason as `ToolEditor.add`; the kit types `SkillInfo` itself. */
  add(definition: any): void
}

/**
 * Session hook callback. The event payload differs per hook name; tools narrow
 * it themselves, so the kit stays agnostic here.
 */
export type HookHandler<Event = any> = (event: Event) => void | Promise<void>

export interface SessionDomain {
  hook(name: string, handler: HookHandler, opts?: unknown): Promise<Registration>
  wait(input: { sessionID: string }): Promise<void>
  context(input: { sessionID: string }): Promise<readonly SessionMessageInfo[]>
  compact(input: { sessionID: string; delivery?: "steer" | "queue" }): Promise<unknown>
  /**
   * In-session message without resuming the model. Preferred for command
   * output (e.g. `/kit list`); callers fall back to {@link prompt} and then to
   * their own stdout sink.
   */
  synthetic?(input: { sessionID: string; text: string; resume?: boolean }): Promise<unknown> | unknown
  /**
   * In-session prompt admission. Delivers command output at the cost of a
   * model turn; used only when `synthetic` is unavailable.
   */
  prompt?(input: { sessionID: string; text: string }): Promise<unknown> | unknown
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
  readonly tool: ToolDomain
  readonly command: {
    transform(callback: (editor: CommandEditor) => void): Promise<Registration>
  }
  readonly skill: {
    transform(callback: (editor: SkillEditor) => void): Promise<Registration>
  }
  readonly event: EventDomain
  readonly session: SessionDomain
}
