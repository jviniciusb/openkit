import type {
  CommandDefinition,
  CommandEditor,
  HookHandler,
  KitContext,
  KitStorage,
  Logger,
  Namespace,
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
 * registered hook names.
 */
export interface FakeContextCalls {
  tool: unknown[]
  command: unknown[]
  skill: unknown[]
  hook: string[]
  [key: string]: unknown[]
}

const noopRegistration: Registration = { dispose() {} }

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
 * Builds an in-memory {@link KitContext} for unit tests.
 *
 * Every `tool`/`command`/`skill` transform invokes its editor callback
 * synchronously against a recorder, so definitions land in `calls.tool` /
 * `calls.command` / `calls.skill`. `session.hook` records the hook's name in
 * `calls.hook`. Each transform/hook returns a `Registration` produced by
 * `onRegistration` (a no-op disposer by default).
 */
export function createFakeContext(overrides: FakeContextOptions = {}): {
  ctx: KitContext
  calls: FakeContextCalls
} {
  const calls: FakeContextCalls = { tool: [], command: [], skill: [], hook: [] }
  const makeRegistration = overrides.onRegistration ?? (() => noopRegistration)

  const storage: KitStorage = {
    async get() {
      return undefined
    },
    async set() {},
    async remove() {},
  }

  const log: Logger = { debug() {}, info() {}, warn() {}, error() {} }

  const options: Record<string, unknown> = {}
  if (overrides.home !== undefined) options.home = overrides.home

  const ctx: KitContext = {
    app: { version: "0.0.0" },
    location: { directory: overrides.directory ?? process.cwd() },
    options,
    storage,
    tool: {
      async transform(callback: (editor: ToolEditor) => void) {
        const editor = recordingEditor<ToolDefinition>(calls.tool)
        callback(editor)
        editor.finish()
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
    session: {
      async hook(name: string, _handler: HookHandler) {
        calls.hook.push(name)
        return makeRegistration()
      },
    },
  }

  return { ctx, calls }
}
