import type {
  CommandDefinition,
  CommandEditor,
  HookHandler,
  KitEvent,
  KitContext,
  KitStorage,
  Logger,
  Namespace,
  ReferenceEditor,
  ReferenceSource,
  Registration,
  SkillDefinition,
  SkillEditor,
  ToolDefinition,
  ToolEditor,
} from "./context"

/** Overrides accepted by {@link createFakeContext}. */
export interface FakeContextOptions {
  /** Value returned from `ctx.location.directory`. Defaults to `process.cwd()`. */
  directory?: string
  /** Value exposed as `ctx.options.home`. Omitted from `options` when not given. */
  home?: string
  /** Arbitrary entries merged into `ctx.options` (applied before `home`). */
  options?: Record<string, unknown>
  /**
   * Installs `ctx.session.prompt` so tests can observe command output. `true`
   * records each call in `calls.prompt`; a function is installed directly (and
   * still recorded). Omit to leave `session.prompt` undefined.
   */
  prompt?: boolean | ((input: { sessionID: string; text: string }) => void | Promise<void>)
  /**
   * Factory for the disposable registration returned by every transform/hook.
   * Defaults to a no-op disposer. Use this to observe disposals in tests.
   */
  onRegistration?: () => Registration
}

/**
 * Recorded editor activity, in call order.
 *
 * `tool`/`command`/`skill` collect the definitions passed to `editor.add(...)`.
 * A transform whose callback adds nothing still records an invocation marker,
 * so `.length` reflects the number of transform calls. `hook` collects the
 * registered session hook names; `toolHook` collects tool-execution hook names
 * and `toolHookHandlers` the handlers, both in call order.
 */
export interface FakeContextCalls {
  tool: unknown[]
  command: unknown[]
  skill: unknown[]
  /** Reference additions, as `{ name, source }` in call order. */
  reference: unknown[]
  hook: string[]
  /** Session-hook handlers, in the same order as `hook`. */
  hookHandlers: HookHandler[]
  /** The `opts` passed to each session hook, in the same order as `hook`. */
  hookOpts: unknown[]
  /** Tool `execute.before`/`execute.after` hooks, by name in call order. */
  toolHook: string[]
  /** The tool-hook handlers, in the same order as `toolHook`. */
  toolHookHandlers: HookHandler[]
  /** `session.prompt` calls recorded when the `prompt` option is enabled. */
  prompt: { sessionID: string; text: string }[]
  [key: string]: unknown[]
}

const noopRegistration: Registration = { dispose() {} }

async function* emptyEvents(): AsyncGenerator<KitEvent> {}

/** A recording editor shared by the tool/command/skill transforms. */
interface RecordingEditor<D> {
  namespace(namespace: Namespace): void
  add(definition: D): void
}

/**
 * Builds a typed editor that records `add` definitions into `bucket`. Call
 * `finish` after the callback: if nothing was added, an invocation marker is
 * pushed so every transform call contributes at least one recorded entry.
 */
function recordingEditor<D>(bucket: unknown[]): RecordingEditor<D> & { finish(): void } {
  const before = bucket.length
  const namespaceSeen: Namespace[] = []
  return {
    namespace(namespace: Namespace) {
      namespaceSeen.push(namespace)
    },
    add(definition: D) {
      bucket.push(definition)
    },
    finish() {
      if (bucket.length === before) bucket.push({ namespace: namespaceSeen })
    },
  }
}

/**
 * Builds a reference editor that records `add(name, source)` into `bucket` as
 * `{ name, source }`. Like {@link recordingEditor}, a transform whose callback
 * adds nothing records an invocation marker so `.length` still counts calls.
 */
function recordingReferenceEditor(bucket: unknown[]): ReferenceEditor & { finish(): void } {
  const before = bucket.length
  return {
    add(name: string, source: ReferenceSource) {
      bucket.push({ name, source })
    },
    finish() {
      if (bucket.length === before) bucket.push({})
    },
  }
}

/**
 * Builds an in-memory {@link KitContext} for unit tests.
 *
 * Every `tool`/`command`/`skill`/`reference` transform invokes its editor
 * callback synchronously against a recorder, so definitions land in
 * `calls.tool` / `calls.command` / `calls.skill` / `calls.reference`.
 * `session.hook` records the hook's name in `calls.hook` and its `opts` in
 * `calls.hookOpts`. Each transform/hook returns a `Registration` produced by
 * `onRegistration` (a no-op disposer by default).
 */
export function createFakeContext(overrides: FakeContextOptions = {}): {
  ctx: KitContext
  calls: FakeContextCalls
} {
  const calls: FakeContextCalls = {
    tool: [], command: [], skill: [], reference: [],
    hook: [], hookHandlers: [], hookOpts: [],
    toolHook: [], toolHookHandlers: [], prompt: [],
  }
  const makeRegistration = overrides.onRegistration ?? (() => noopRegistration)

  const storage: KitStorage = {
    async get() {
      return undefined
    },
    async set() {},
    async remove() {},
    async scan() {
      return { entries: [] }
    },
  }

  const log: Logger = { debug() {}, info() {}, warn() {}, error() {} }

  const options: Record<string, unknown> = { ...overrides.options }
  if (overrides.home !== undefined) options.home = overrides.home

  const promptOption = overrides.prompt
  const promptRecorder =
    promptOption === undefined || promptOption === false
      ? undefined
      : async (input: { sessionID: string; text: string }): Promise<void> => {
          calls.prompt.push(input)
          if (typeof promptOption === "function") await promptOption(input)
        }

  const ctx: KitContext = {
    app: { version: "0.0.0" },
    location: { directory: overrides.directory ?? process.cwd() },
    options,
    storage,
    event: {
      subscribe() {
        return emptyEvents()
      },
    },
    tool: {
      async transform(callback: (editor: ToolEditor) => void) {
        const editor = recordingEditor<ToolDefinition>(calls.tool)
        callback(editor)
        editor.finish()
        return makeRegistration()
      },
      async hook(name: string, handler: HookHandler) {
        calls.toolHook.push(name)
        calls.toolHookHandlers.push(handler)
        return makeRegistration()
      },
    },
    command: {
      async transform(callback: (editor: CommandEditor) => void) {
        const editor = recordingEditor<CommandDefinition>(calls.command)
        callback(editor)
        editor.finish()
        return makeRegistration()
      },
    },
    skill: {
      async transform(callback: (editor: SkillEditor) => void) {
        const editor = recordingEditor<SkillDefinition>(calls.skill)
        callback(editor)
        editor.finish()
        return makeRegistration()
      },
    },
    reference: {
      async transform(callback: (editor: ReferenceEditor) => void) {
        const editor = recordingReferenceEditor(calls.reference)
        callback(editor)
        editor.finish()
        return makeRegistration()
      },
    },
    session: {
      async hook(name: string, handler: HookHandler, opts?: unknown) {
        calls.hook.push(name)
        calls.hookHandlers.push(handler)
        calls.hookOpts.push(opts)
        return makeRegistration()
      },
      async wait() {},
      async context() {
        return []
      },
      async compact() {},
      ...(promptRecorder === undefined ? {} : { prompt: promptRecorder }),
    },
  }

  return { ctx, calls }
}
