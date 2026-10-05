# Background Subagents (opencode-kit tool) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `background-subagents`, an opt-in opencode-kit tool that forces every built-in `subagent` call into background mode by rewriting its input through the V2 `ctx.tool.hook("execute.before")` hook.

**Architecture:** Extend the kit's minimal `KitContext` to expose tool-execution hooks and have the registry track them exactly like transforms (so they are disposed on reload/disable/failure). The tool registers one `execute.before` handler that, only for the `subagent` tool, replaces `event.input` with the original fields plus `background: true`; every other field and every other tool (including `shell`) is untouched. No notification mechanism is added — OpenCode's native parent result/failure reporting is used.

**Tech Stack:** Bun (runtime + test runner), TypeScript strict ESM. No new dependencies. Type-only knowledge of the OpenCode V2 plugin API; target host OpenCode V2 `>= 2.0.4` (verified against installed `opencode v2.0.22`).

**Spec:** `C:\Users\jader\Documents\Projects\2026-10-01-opencode-background-subagents-design.md`

> **Architecture note (user decision):** the design says "user-global V2 plugin ... store its source under the user's OpenCode configuration directory." This plan instead implements it as the first real opencode-kit tool. opencode-kit is itself the user-global plugin (installed once, loaded from the user's global config), and per-tool enable/disable is the kit's mechanism for the design's "disabling or removing the plugin restores normal behavior." No standalone file is written to the config directory.

## Global Constraints

- OpenCode V2 only. Do **not** import `@opencode/plugin` at runtime; the kit stays a plain structural `KitContext`.
- The `execute.before` event is `{ tool, sessionID, agent, messageID, id, input }` and `input` is mutable (confirmed in `opencode v2.0.22`). The built-in tool name is exactly `"subagent"`; its input is `{ agent, description, prompt, model?, sessionID?, background? }`.
- Force `background: true` for every subagent call, overriding an omitted or explicit `false` value. Preserve every other input field.
- Touch only the `subagent` tool. Never modify `shell` or any other tool's input.
- Add no second completion-notification mechanism; rely on OpenCode's native reporting.
- Registration isolation is a hard requirement: a throw degrades only this tool and disposes its partial registrations; other tools and the kit keep loading.
- Tool id is kebab-case `background-subagents`; it is opt-in (`defaultEnabled: false`) with empty settings.
- If an older host lacks `ctx.tool.hook`, the tool degrades in isolation (covered by a test) rather than breaking the kit.
- No `KitApi` helper is added for tool hooks; tools may call `ctx.tool.hook(...)` directly (the contract already allows a tool to return a `Registration` from a direct `ctx` call). YAGNI.
- `bun run typecheck && bun test` must pass before every commit. Conventional Commits.

## Review Focus

Failure modes and inputs the spec implies that no happy path exercises. Each is pinned by a test in the owning task:

1. Caller explicitly passes `background: false` → still forced to `true` (Task 2).
2. `input` absent, `null`, or a non-object (string/array) → handler leaves it untouched and does not throw (Task 2).
3. Non-subagent tool, especially `shell` → its input object is byte-for-byte unchanged (Task 2).
4. Populated `model` / `sessionID` / `agent` / `prompt` / `description` → preserved exactly, with only `background` changed (Task 2).
5. Hook registration must be disposed on disable/reload/tool failure, restoring OpenCode's native foreground/background choice (Task 1).

---

### Task 1: Tool-hook support in the kit core

**Files:**
- Modify: `src/core/context.ts`
- Modify: `src/core/registry.ts`
- Modify: `src/core/testing.ts`
- Test: `tests/unit/registry.test.ts`

**Interfaces:**
- Consumes: existing `Registration`, `HookHandler`, `KitContext`, `ToolEditor`, `createFakeContext`, `registerTools`.
- Produces:
  - `ToolExecuteBeforeEvent` (new): `{ tool: string; input: unknown; sessionID: string; agent: string; messageID: string; id: string; [key: string]: unknown }`.
  - `ToolDomain` (new): `{ transform(callback: (editor: ToolEditor) => void): Promise<Registration>; hook(name: string, handler: HookHandler): Promise<Registration> }`. `KitContext.tool` becomes `ToolDomain`.
  - `FakeContextCalls` gains `toolHook: string[]` (hook names, in call order) and `toolHookHandlers: HookHandler[]` (the handlers, same order).

- [ ] **Step 1: Write the failing tests**

Append to `tests/unit/registry.test.ts` (uses the existing `ok` tool and `kit` stub):

```ts
test("a tool's execute.before hook is tracked and disposed with the tool", async () => {
  let disposed = 0
  const { ctx, calls } = createFakeContext({
    onRegistration: () => ({ dispose: async () => { disposed++ } }),
  })
  const hooked = defineTool({ id: "hooked", name: "Hooked", description: "d", defaultSettings: {},
    register(c) { return c.tool.hook("execute.before", () => {}) } })

  const res = await registerTools(
    [hooked],
    new Map([["hooked", { enabled: true, settings: {} }]]),
    ctx,
    () => kit,
  )

  expect(res.degraded).toEqual([])
  expect(calls.toolHook).toEqual(["execute.before"])
  expect(res.registrations.length).toBe(1)
  await res.registrations[0]!.dispose()
  expect(disposed).toBe(1)
})

test("a tool whose hook registration throws is degraded without breaking siblings", async () => {
  const { ctx } = createFakeContext()
  // Simulate a host whose tool domain cannot register hooks: the tool must
  // degrade in isolation, never break the kit or its siblings.
  ;(ctx.tool as unknown as { hook(): Promise<never> }).hook = async () => {
    throw new Error("hook unsupported")
  }
  const bad = defineTool({ id: "bad", name: "Bad", description: "d", defaultSettings: {},
    register(c) { return c.tool.hook("execute.before", () => {}) } })

  const res = await registerTools(
    [ok, bad],
    new Map([["ok", { enabled: true, settings: {} }], ["bad", { enabled: true, settings: {} }]]),
    ctx,
    () => kit,
  )

  expect(res.degraded.map((d) => d.id)).toEqual(["bad"])
  expect(res.registrations.length).toBe(1)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test tests/unit/registry.test.ts`
Expected: FAIL — `ctx.tool.hook is not a function` (and `calls.toolHook` is `undefined`).

- [ ] **Step 3: Implement the contract**

In `src/core/context.ts`, add after the `ToolEditor` interface:

```ts
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
```

Replace the inline `tool` member of `KitContext` with:

```ts
  readonly tool: ToolDomain
```

- [ ] **Step 4: Track tool hooks in the registry**

In `src/core/registry.ts`, extend the `tool` override inside `overrides` so its `hook` is tracked like a transform:

```ts
      tool: {
        async transform(callback) {
          const registration = await ctx.tool.transform(callback)
          created.push(registration)
          return registration
        },
        async hook(name, handler) {
          const registration = await ctx.tool.hook(name, handler)
          created.push(registration)
          return registration
        },
      },
```

- [ ] **Step 5: Record tool hooks in the fake context**

In `src/core/testing.ts`:

1. Add to `FakeContextCalls` (and mention them in its doc comment):

```ts
  /** Tool `execute.before`/`execute.after` hooks, by name in call order. */
  toolHook: string[]
  /** The tool-hook handlers, in the same order as `toolHook`. */
  toolHookHandlers: HookHandler[]
```

2. Initialize the recorder:

```ts
  const calls: FakeContextCalls = { tool: [], command: [], skill: [], hook: [], toolHook: [], toolHookHandlers: [] }
```

3. Give the fake `tool` domain a `hook` implementation next to its `transform`:

```ts
      async hook(name: string, handler: HookHandler) {
        calls.toolHook.push(name)
        calls.toolHookHandlers.push(handler)
        return makeRegistration()
      },
```

- [ ] **Step 6: Run the tests and typecheck**

Run: `bun test tests/unit/registry.test.ts && bun run typecheck`
Expected: PASS; no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/core/context.ts src/core/registry.ts src/core/testing.ts tests/unit/registry.test.ts
git commit -m "feat(core): expose and track tool-execution hooks"
```

---

### Task 2: The `background-subagents` tool, barrel, tests, and docs

**Files:**
- Create: `src/tools/background-subagents/index.ts`
- Modify: `src/tools/index.ts`
- Modify: `docs/examples/opencode-kit.jsonc`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Test: `tests/unit/tools-background-subagents.test.ts`
- Test: `tests/integration/background-subagents.test.ts`

**Interfaces:**
- Consumes: `defineTool`, `KitTool` from `src/core/tool`; `ToolExecuteBeforeEvent` from `src/core/context`; `ctx.tool.hook` (Task 1).
- Produces:
  - `export const SUBAGENT_TOOL = "subagent"`.
  - `export const backgroundSubagents: KitTool<BackgroundSubagentsSettings>`, `id: "background-subagents"`, `defaultEnabled: false`, `defaultSettings: {}`, `settingsSchema: { type: "object", properties: {}, additionalProperties: false }`. Its `register` returns the `Registration` from `ctx.tool.hook("execute.before", handler)`.

- [ ] **Step 1: Write the failing behavior tests**

Create `tests/unit/tools-background-subagents.test.ts`:

```ts
import { expect, test } from "bun:test"
import type { ToolExecuteBeforeEvent } from "../../src/core/context"
import { createKitApi } from "../../src/core/kit-api"
import { createFakeContext } from "../../src/core/testing"
import { backgroundSubagents, SUBAGENT_TOOL } from "../../src/tools/background-subagents"

async function runHook(input: unknown, tool: string = SUBAGENT_TOOL) {
  const { ctx, calls } = createFakeContext()
  const kit = createKitApi(backgroundSubagents.id, ctx, "0.0.0")
  await backgroundSubagents.register(ctx, {}, kit)
  const handler = calls.toolHookHandlers[0]!
  const event: ToolExecuteBeforeEvent = {
    tool, input, sessionID: "ses_1", agent: "build", messageID: "msg_1", id: "call_1",
  }
  await handler(event)
  return event
}

test("forces background=true when the caller omitted it", async () => {
  const event = await runHook({ agent: "explore", description: "map auth", prompt: "map it" })
  expect(event.input).toEqual({ agent: "explore", description: "map auth", prompt: "map it", background: true })
})

test("overrides an explicit background=false", async () => {
  const event = await runHook({ agent: "explore", description: "d", prompt: "p", background: false })
  expect((event.input as { background: boolean }).background).toBe(true)
})

test("preserves model and sessionID while forcing background", async () => {
  const event = await runHook({
    agent: "explore", description: "d", prompt: "p",
    model: "anthropic/claude-sonnet-4-5", sessionID: "ses_child",
  })
  expect(event.input).toEqual({
    agent: "explore", description: "d", prompt: "p",
    model: "anthropic/claude-sonnet-4-5", sessionID: "ses_child", background: true,
  })
})

test("leaves other tools untouched (shell)", async () => {
  const event = await runHook({ command: "ls -la", workdir: "/tmp" }, "shell")
  expect(event.input).toEqual({ command: "ls -la", workdir: "/tmp" })
})

test("ignores non-object input without throwing", async () => {
  const event = await runHook("not-an-object")
  expect(event.input).toBe("not-an-object")
})

test("is an opt-in tool with the expected identity", () => {
  expect(backgroundSubagents.id).toBe("background-subagents")
  expect(backgroundSubagents.defaultEnabled).toBe(false)
})
```

- [ ] **Step 2: Write the failing wire-through test**

Create `tests/integration/background-subagents.test.ts`:

```ts
import { expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { createFakeContext } from "../../src/core/testing"
import { bootstrap } from "../../src/plugin"
import { backgroundSubagents } from "../../src/tools/background-subagents"

function projectWithConfig(json: string) {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const proj = join(home, "proj")
  mkdirSync(join(proj, ".opencode"), { recursive: true })
  writeFileSync(join(proj, ".opencode", "opencode-kit.jsonc"), json)
  return { home, proj }
}

test("enabling the tool registers exactly one execute.before hook", async () => {
  const { proj } = projectWithConfig(`{ "tools": { "background-subagents": { "enabled": true } } }`)
  const { ctx, calls } = createFakeContext({ directory: proj })
  const res = await bootstrap(ctx, [backgroundSubagents])
  expect(res.degraded).toEqual([])
  expect(calls.toolHook).toEqual(["execute.before"])
  await res.dispose()
})

test("disabling the tool registers nothing", async () => {
  const { proj } = projectWithConfig(`{ "tools": { "background-subagents": { "enabled": false } } }`)
  const { ctx, calls } = createFakeContext({ directory: proj })
  const res = await bootstrap(ctx, [backgroundSubagents])
  expect(calls.toolHook).toEqual([])
  await res.dispose()
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `bun test tests/unit/tools-background-subagents.test.ts tests/integration/background-subagents.test.ts`
Expected: FAIL — cannot find module `../../src/tools/background-subagents`.

- [ ] **Step 4: Implement the tool**

Create `src/tools/background-subagents/index.ts`:

```ts
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
  defaultEnabled: false,
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
```

- [ ] **Step 5: Register the tool in the barrel**

Modify `src/tools/index.ts` so the import and `<kit:tools>` entry are present, markers intact:

```ts
import type { KitTool } from "../core/tool"
import { backgroundSubagents } from "./background-subagents/index"
import { hello } from "./hello/index"

export const tools: KitTool[] = [
  // <kit:tools>
  hello,
  backgroundSubagents,
  // </kit:tools>
]
```

- [ ] **Step 6: Add the example config entry**

In `docs/examples/opencode-kit.jsonc`, add a comma after the `hello` entry and add the new tool next to it:

```jsonc
    "background-subagents": {
      // Opt-in: forces every `subagent` call to run in the background so the
      // parent keeps control while a child works.
      "enabled": false,
      "settings": {}
    }
```

- [ ] **Step 7: Update the prose that names the shipped tools**

- `README.md` (near line 17): replace the sentence that says the package ships one example tool with one that names both tools and their default states — `hello` (enabled by default) and `background-subagents` (opt-in, forces subagent calls to the background).
- `README.md` Configuration example: add `"background-subagents": { "enabled": true }` to the `tools` block so the new tool is discoverable.
- `AGENTS.md` (the "What this repo is" section): update "The only shipped tool today is `hello`" to also name `background-subagents`.

- [ ] **Step 8: Run the tests and typecheck**

Run: `bun test && bun run typecheck`
Expected: PASS, including the pre-existing CLI/config/registry suites (adding an opt-in tool must not change their assertions).

- [ ] **Step 9: Commit**

```bash
git add src/tools/background-subagents/index.ts src/tools/index.ts \
  docs/examples/opencode-kit.jsonc README.md AGENTS.md \
  tests/unit/tools-background-subagents.test.ts tests/integration/background-subagents.test.ts
git commit -m "feat(tools): add background-subagents tool"
```

---

### Task 3: Live acceptance against OpenCode

**Files:** none (manual verification; no commit).

This task reproduces the design's Validation steps in a real OpenCode session. If no live OpenCode is available, mark every step unverified and report that; do not claim the feature works.

- [ ] **Step 1: Confirm the automated suite is green**

Run: `bun run typecheck && bun test`
Expected: PASS.

- [ ] **Step 2: Enable the tool and confirm the resolved state**

Run:

```bash
bun bin/opencode-kit.js enable background-subagents
bun bin/opencode-kit.js list
```

Expected: `list` shows `background-subagents` as `enabled`.

- [ ] **Step 3: Restart OpenCode** so the plugin picks up the config change, then run these checks in a session:

1. **Hook filter** — confirm the built-in tool name and input shape still match: launching a subagent must trigger the hook for `tool === "subagent"` with `input.background` forced to `true`. (The design's Validation step 1.)
2. **Parent regains control** — ask the main agent to launch a subagent *without* requesting background. The parent must return control while the child runs. (Validation step 2.)
3. **Steering** — send a steering message (Enter) to the parent while the child is active; the parent must process it. (Validation step 3.)
4. **Reporting** — verify a child success and a child failure are each reported back to the parent exactly once. (Validation step 4.)
5. **Shell unchanged** — run a short shell command and verify its output still returns synchronously. (Validation step 5.)

- [ ] **Step 4: Verify disabling restores native behavior**

Run `bun bin/opencode-kit.js disable background-subagents`, restart OpenCode, and confirm a subagent launched without `background` waits for its result (normal foreground/background choice). (Validation step 6.)

---

## Self-Review Notes

- **Spec coverage:** Requirements 1/4 map to the `event.tool` filter plus `background: true` rewrite (Task 2); requirement 2 (parent continues + steering) and 3 (native reporting, no duplicates) are properties of OpenCode's background mode and are verified live in Task 3; requirement 5 (disable restores) is covered by the registry disposal test (Task 1) and the disable wire-through test plus live step (Tasks 2–3). Validation steps 1–6 map to Tasks 2–3.
- **Deviation recorded:** the design's "source under the user's OpenCode configuration directory" is intentionally not implemented; the architecture note explains the user-chosen opencode-kit-tool form.
- **Type consistency:** `ToolExecuteBeforeEvent`, `ToolDomain`, `calls.toolHook`, `calls.toolHookHandlers`, `SUBAGENT_TOOL`, and `backgroundSubagents` are used with the same names and shapes in every task.
