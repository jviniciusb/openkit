# opencode-kit Framework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `opencode-kit`, a single OpenCode V2 plugin package that hosts independently toggleable, configurable tools, with a CLI and agent-driven setup.

**Architecture:** One npm package exports a zero-runtime-dependency V2 plugin (`export default { id, setup }`). `setup` discovers/merges JSONC config, resolves enabled tools, and registers each tool's capabilities through `ctx` transforms/hooks with per-tool isolation. Tool authors implement a `KitTool` contract. Config edits preserve comments via `jsonc-parser`; validation uses `ajv`.

**Tech Stack:** Bun (runtime, test runner, bundler), TypeScript (strict, ESM), `jsonc-parser`, `ajv`. No runtime dependency on `@opencode/plugin` (type-only).

**Spec:** `docs/superpowers/specs/2026-10-01-opencode-kit-design.md`

## Global Constraints

- OpenCode V2 only; target host version `>= 2.0.4` (developed against 2.0.21).
- Package name `opencode-kit`; plugin id `opencode-kit`; license MIT.
- TypeScript `strict: true`, ESM (`"type": "module"`).
- Tool ids are kebab-case and unique. Every tool registration is namespace-prefixed to avoid collisions.
- **No runtime import of `@opencode/plugin`.** Import types only; export a plain object default.
- Config precedence (low → high): `tool.defaultSettings` < global kit config < project kit config (farther→nearer) < `opencode.json` plugin `options`.
- Merge rules: `settings` objects deep-merge per tool; scalars replace; **arrays replace** (never concat).
- Missing `enabled` → `defaultEnabled ?? false`. A disabled tool's `register` never runs.
- Per-tool registration is isolated: a throw logs the tool as degraded and never blocks the kit or other tools; partial registrations from a mid-register failure are disposed.
- Config writes preserve comments; reading tolerates malformed JSONC (log + skip, never crash).
- Tool discovery is an explicit, typed barrel (`src/tools/index.ts`), never runtime globbing.

## Review Focus

Failure modes the spec implies that no single task's happy path exercises — each gets its own test in the owning task:

1. A tool whose `register` throws **after** creating some registrations must not leave those behind (Task 5).
2. A config file with **invalid JSONC** must be logged and skipped; the rest still loads (Task 3).
3. An **unknown tool id** in config must be ignored (no crash, no phantom tool) (Task 2).
4. Missing or empty `tools`/`settings` must not null out defaults (Task 2).
5. A **settings value that fails schema validation** must fall back to that tool's defaults and mark it degraded (Task 4).

---

## Prerequisites: Toolchain

The dev machine (WSL) has `git`, `curl`, `python3`, `tar`/`xz`, but **no `bun`, `node`, or `npm`**, no `apt`, and no passwordless `sudo`, and no `unzip`.

- [ ] **Install Bun (no unzip required)**

```bash
cd /tmp
curl -fsSL -o bun.zip https://github.com/oven-sh/bun/releases/latest/download/bun-linux-x64.zip
rm -rf bun-extract && mkdir -p bun-extract "$HOME/.bun/bin"
python3 -m zipfile -e bun.zip bun-extract
cp bun-extract/bun-linux-x64/bun "$HOME/.bun/bin/bun"
chmod +x "$HOME/.bun/bin/bun"
grep -q '.bun/bin' "$HOME/.bashrc" || echo 'export PATH="$HOME/.bun/bin:$PATH"' >> "$HOME/.bashrc"
export PATH="$HOME/.bun/bin:$PATH"
```

- [ ] **Verify:** run `bun --version` → prints a version (e.g. `1.x`).

---

### Task 1: Project scaffold + KitTool contract

**Files:**
- Create: `package.json`, `tsconfig.json`, `.gitignore`
- Create: `src/core/tool.ts`
- Create: `src/core/context.ts`
- Test: `tests/unit/tool.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `defineTool<S>(tool: KitTool<S>): KitTool<S>` — returns the tool with `defaultEnabled` normalized to a boolean.
  - `KitTool<S>`: `{ id: string; name: string; description: string; defaultEnabled?: boolean; defaultSettings: S; settingsSchema?: JsonSchema; register(ctx: KitContext, settings: S, kit: KitApi): void | Promise<void> }`
  - `KitApi`: `{ namespace(toolId: string): void; scriptPath(name: string): string; storage: KitStorage; log: Logger; version: string; tool(def): Promise<Registration>; command(def): Promise<Registration>; skill(def): Promise<Registration>; on(kind, handler, opts?): Promise<Registration> }`
    - `namespace(name)` sets the namespace applied by the `tool`/`command`/`skill` helpers (defaults to the tool id). Tools may also register directly through `ctx` and call `editor.namespace(...)` themselves; the helpers are the namespaced convenience path.
  - `KitContext` (minimal structural subset of the V2 plugin context; in `src/core/context.ts`).

- [ ] **Step 1: Scaffold the package**

`package.json`:

```json
{
  "name": "opencode-kit",
  "version": "0.1.0",
  "description": "A framework of toggleable, configurable tools for OpenCode V2",
  "type": "module",
  "license": "MIT",
  "main": "./dist/plugin.js",
  "bin": { "opencode-kit": "./bin/opencode-kit.js" },
  "files": ["dist", "bin", "skills", ".opencode", "opencode-kit.schema.json", "README.md", "LICENSE"],
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "bun test",
    "build": "bun run build:plugin && bun run build:cli",
    "build:plugin": "bun build src/plugin.ts --target=bun --outfile=dist/plugin.js",
    "build:cli": "bun build src/cli/index.ts --target=bun --outfile=dist/cli.js"
  },
  "dependencies": { "ajv": "^8.17.1", "jsonc-parser": "^3.3.1" },
  "devDependencies": { "@types/bun": "latest", "typescript": "^5.6.0" }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ESNext", "module": "ESNext", "moduleResolution": "Bundler",
    "strict": true, "noUncheckedIndexedAccess": true, "types": ["bun"],
    "esModuleInterop": true, "skipLibCheck": true, "noEmit": true
  },
  "include": ["src", "tests"]
}
```

`.gitignore`: `node_modules/`, `dist/`, `*.tgz`, `.DS_Store`.

Run: `bun install` → creates `node_modules/` and a lockfile.

- [ ] **Step 2: Write the failing test** — `tests/unit/tool.test.ts`

```ts
import { expect, test } from "bun:test"
import { defineTool } from "../../src/core/tool"

test("defineTool fills defaultEnabled=false when omitted", () => {
  const t = defineTool({ id: "x", name: "X", description: "d",
    defaultSettings: { a: 1 }, register() {} })
  expect(t.defaultEnabled).toBe(false)
})

test("defineTool preserves defaultEnabled=true", () => {
  const t = defineTool({ id: "x", name: "X", description: "d", defaultEnabled: true,
    defaultSettings: {}, register() {} })
  expect(t.defaultEnabled).toBe(true)
})
```

- [ ] **Step 3: Run it, expect failure** — `bun test tests/unit/tool.test.ts` → FAIL (module not found).

- [ ] **Step 4: Implement** `src/core/context.ts` (minimal `KitContext`, `Registration`, `KitStorage`, `Logger`) and `src/core/tool.ts` (`JsonSchema`, `KitTool`, `KitApi`, `defineTool`).

`defineTool` body: `return { defaultEnabled: false, ...tool }`.
`KitContext` declares only the members the kit uses: `location`, `options`, `app.version`, `storage`, and `tool`/`command`/`skill` transform methods plus `session.hook`. Each transform takes a synchronous editor callback and returns `Promise<Registration>`. `Logger` is `{ debug, info, warn, error(message: string, meta?: unknown): void }`.

- [ ] **Step 5: Run test + typecheck** — `bun test tests/unit/tool.test.ts` → PASS; `bun run typecheck` → no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json .gitignore src/core tests/unit/tool.test.ts bun.lock*
git commit -m "chore: scaffold package and KitTool contract"
```

---

### Task 2: Config merge + precedence resolution

**Files:**
- Create: `src/config/types.ts`, `src/config/merge.ts`, `src/config/resolve.ts`
- Test: `tests/unit/config-merge.test.ts`, `tests/unit/config-resolve.test.ts`

**Interfaces:**
- Consumes: `KitTool` (Task 1).
- Produces:
  - `ToolConfigEntry = { enabled?: boolean; settings?: Record<string, unknown> }`
  - `KitConfigFile = { configVersion?: number; tools?: Record<string, ToolConfigEntry> }`
  - `ResolvedToolConfig<S> = { enabled: boolean; settings: S }`
  - `deepMerge<T>(base: T, override: unknown): T` — objects merge recursively; arrays and scalars replace; `undefined` in override does not remove a base value.
  - `mergeConfigFiles(base: KitConfigFile, override: KitConfigFile): KitConfigFile`
  - `resolveToolConfig<S>(tool: KitTool<S>, sources: KitConfigFile[]): ResolvedToolConfig<S>` — sources ordered low→high.

- [ ] **Step 1: Write failing tests** — `tests/unit/config-merge.test.ts`

```ts
import { expect, test } from "bun:test"
import { deepMerge } from "../../src/config/merge"

test("deep-merges nested objects", () => {
  expect(deepMerge({ a: { b: 1, c: 2 } }, { a: { c: 9 } })).toEqual({ a: { b: 1, c: 9 } })
})
test("arrays replace, not concat", () => {
  expect(deepMerge({ list: [1, 2, 3] }, { list: [9] })).toEqual({ list: [9] })
})
test("undefined does not remove a base value", () => {
  expect(deepMerge({ a: 1, b: 2 }, { a: undefined })).toEqual({ a: 1, b: 2 })
})
```

`tests/unit/config-resolve.test.ts`

```ts
import { expect, test } from "bun:test"
import { defineTool } from "../../src/core/tool"
import { resolveToolConfig } from "../../src/config/resolve"

const tool = defineTool({ id: "t", name: "T", description: "d",
  defaultEnabled: false, defaultSettings: { n: 1, list: ["a"] }, register() {} })

test("defaults used when no sources mention the tool", () => {
  expect(resolveToolConfig(tool, [])).toEqual({ enabled: false, settings: { n: 1, list: ["a"] } })
})
test("higher source overrides lower; unknown ids ignored", () => {
  const r = resolveToolConfig(tool, [
    { tools: { t: { settings: { n: 2 } }, ghost: { enabled: true } } },
    { tools: { t: { enabled: true, settings: { list: ["b"] } } } },
  ])
  expect(r).toEqual({ enabled: true, settings: { n: 2, list: ["b"] } })
})
test("empty settings/entry does not null defaults", () => {
  expect(resolveToolConfig(tool, [{ tools: { t: {} } }]))
    .toEqual({ enabled: false, settings: { n: 1, list: ["a"] } })
})
```

- [ ] **Step 2: Run, expect failure** — `bun test tests/unit/config-*.test.ts` → FAIL.

- [ ] **Step 3: Implement** `deepMerge`, `mergeConfigFiles`, `resolveToolConfig`.
`resolveToolConfig` starts from `{ enabled: tool.defaultEnabled ?? false, settings: tool.defaultSettings }`, folds each source entry for `tool.id` via `deepMerge` for settings and scalar replace for `enabled`, and ignores ids not equal to `tool.id`.

- [ ] **Step 4: Run + typecheck** → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(config): merge and precedence resolution"`.

---

### Task 3: Config discovery + JSONC loading

**Files:**
- Create: `src/config/discover.ts`, `src/config/load.ts`
- Test: `tests/unit/config-discover.test.ts`, `tests/unit/config-load.test.ts`

**Interfaces:**
- Consumes: `KitConfigFile` (Task 2).
- Produces:
  - `discoverKitConfigFiles(locationDirectory: string, home: string): string[]` — returns `[<global>, ...project files farthest→nearest]`; global is `<home>/.config/opencode/opencode-kit.jsonc`; project files are `<dir>/.opencode/opencode-kit.jsonc` for `locationDirectory` and each ancestor up to filesystem root.
  - `loadKitConfig(paths: string[]): Promise<KitConfigFile[]>` — parses each existing file as JSONC; missing files skipped; malformed files logged and skipped.

- [ ] **Step 1: Write failing tests** — `tests/unit/config-load.test.ts`

```ts
import { expect, test } from "bun:test"
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { loadKitConfig } from "../../src/config/load"

test("parses JSONC with comments and trailing commas", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "opencode-kit.jsonc")
  writeFileSync(f, `{\n  // c\n  "tools": { "t": { "enabled": true, }, },\n}`)
  expect(await loadKitConfig([f])).toEqual([{ tools: { t: { enabled: true } } }])
})

test("malformed file is skipped, others still load", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const bad = join(d, "bad.jsonc"); writeFileSync(bad, "{ not json")
  const good = join(d, "good.jsonc"); writeFileSync(good, `{ "tools": {} }`)
  expect(await loadKitConfig([bad, good])).toEqual([{ tools: {} }])
})

test("missing files are skipped", async () => {
  expect(await loadKitConfig(["/nope/missing.jsonc"])).toEqual([])
})
```

`tests/unit/config-discover.test.ts`

```ts
import { expect, test } from "bun:test"
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { discoverKitConfigFiles } from "../../src/config/discover"

test("includes global then project ancestors farthest->nearest", () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const root = join(home, "proj")
  const child = join(root, "pkg")
  mkdirSync(child, { recursive: true })
  const globalDir = join(home, ".config", "opencode")
  mkdirSync(globalDir, { recursive: true })
  writeFileSync(join(globalDir, "opencode-kit.jsonc"), "{}")
  writeFileSync(join(root, ".opencode", "opencode-kit.jsonc"), "{}")  // ensure .opencode exists
  const files = discoverKitConfigFiles(child, home)
  expect(files[0]).toBe(join(globalDir, "opencode-kit.jsonc"))
  expect(files[files.length - 1]).toBe(join(root, ".opencode", "opencode-kit.jsonc"))
})
```

(Note: create `<dir>/.opencode/` before writing the project file.)

- [ ] **Step 2: Run, expect failure** → FAIL.

- [ ] **Step 3: Implement.** `discoverKitConfigFiles` builds the ancestor list from the location up to root, orders it farthest→nearest, and prefixes the global path. `loadKitConfig` uses `readFileSync` in a try/catch; parses with `jsonc-parser`'s `parse` (ignoring comments/trailing commas); on parse error logs `warn` and skips.

- [ ] **Step 4: Run + typecheck** → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(config): discovery and JSONC loading"`.

---

### Task 4: Settings schema validation

**Files:**
- Create: `src/config/validate.ts`
- Test: `tests/unit/config-validate.test.ts`

**Interfaces:**
- Consumes: `JsonSchema` (Task 1), `deepMerge` is not needed here.
- Produces:
  - `validateToolSettings(schema: JsonSchema | undefined, settings: unknown): { valid: true } | { valid: false; errors: string[] }` — no schema ⇒ always valid.
  - `resolveValidated<S>(tool: KitTool<S>, config: { enabled: boolean; settings: unknown }): { config: ResolvedToolConfig<S>; degraded?: string }` — when invalid, returns the tool's `defaultSettings` and a `degraded` reason.

- [ ] **Step 1: Write failing tests**

```ts
import { expect, test } from "bun:test"
import { validateToolSettings, resolveValidated } from "../../src/config/validate"
import { defineTool } from "../../src/core/tool"

const schema = { type: "object", properties: { n: { type: "integer" } }, required: ["n"] }

test("valid settings pass", () => {
  expect(validateToolSettings(schema, { n: 1 }).valid).toBe(true)
})
test("invalid settings report errors", () => {
  const r = validateToolSettings(schema, { n: "x" })
  expect(r.valid).toBe(false)
})
test("no schema is always valid", () => {
  expect(validateToolSettings(undefined, { anything: true }).valid).toBe(true)
})
test("invalid settings fall back to defaults and mark degraded", () => {
  const tool = defineTool({ id: "t", name: "T", description: "d",
    defaultSettings: { n: 5 }, settingsSchema: schema, register() {} })
  const r = resolveValidated(tool, { enabled: true, settings: { n: "x" } })
  expect(r.config).toEqual({ enabled: true, settings: { n: 5 } })
  expect(r.degraded).toBeDefined()
})
```

- [ ] **Step 2: Run, expect failure** → FAIL.

- [ ] **Step 3: Implement** using `ajv` (`new Ajv({ allErrors: true, strict: false })`), mapping `errors` to strings. `resolveValidated` returns the input config when valid, else defaults + reason.

- [ ] **Step 4: Run + typecheck** → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(config): settings schema validation with fallback"`.

---

### Task 5: Test harness + registry with isolation

**Files:**
- Create: `src/core/testing.ts`, `src/core/registry.ts`
- Test: `tests/unit/registry.test.ts`

**Interfaces:**
- Consumes: `KitTool`, `KitApi`, `KitContext`, `Registration` (Task 1); `ResolvedToolConfig` (Task 2).
- Produces:
  - `createFakeContext(overrides?): { ctx: KitContext; calls: Record<string, unknown[]> }` — records every `transform` callback's editor operations and every `hook` registration.
  - `registerTools(tools: KitTool[], resolved: Map<string, ResolvedToolConfig>, ctx: KitContext, makeKit: (toolId: string) => KitApi): Promise<{ registrations: Registration[]; degraded: { id: string; error: string }[] }>` — registers only tools present in `resolved` with `enabled: true`, in array order, each in try/catch; on throw, disposes that tool's registrations created so far and records it degraded.

- [ ] **Step 1: Write failing tests** — `tests/unit/registry.test.ts`

```ts
import { expect, test } from "bun:test"
import { defineTool } from "../../src/core/tool"
import { registerTools } from "../../src/core/registry"
import { createFakeContext } from "../../src/core/testing"

const kit = { namespace() {}, scriptPath: (n: string) => n, storage: {} as any,
  log: { debug(){}, info(){}, warn(){}, error(){} }, version: "0.0.0" }

const ok = defineTool({ id: "ok", name: "OK", description: "d", defaultSettings: {},
  register(ctx) { return ctx.tool.transform(() => {}) } })

// A tool that registers one thing, then throws: its partial registration must be disposed.
let disposed = 0
const boom = defineTool({ id: "boom", name: "Boom", description: "d", defaultSettings: {},
  async register(ctx) {
    await ctx.tool.transform(() => {})          // returns a disposable registration
    throw new Error("kaboom")
  } })

test("enabled tools register; disabled are skipped", async () => {
  const { ctx, calls } = createFakeContext()
  const res = await registerTools([ok], new Map([["ok", { enabled: true, settings: {} }]]), ctx, () => kit)
  expect(res.registrations.length).toBe(1)
  expect(calls.tool.length).toBe(1)
})

test("a throwing tool is isolated and its partial registrations disposed", async () => {
  const { ctx } = createFakeContext({ onRegistration: () => ({ dispose: async () => { disposed++ } }) })
  const res = await registerTools([ok, boom], new Map([
    ["ok", { enabled: true, settings: {} }], ["boom", { enabled: true, settings: {} }],
  ]), ctx, () => kit)
  expect(res.degraded.map(d => d.id)).toEqual(["boom"])
  expect(disposed).toBe(1)
  expect(res.registrations.length).toBe(1) // only "ok"
})
```

- [ ] **Step 2: Run, expect failure** → FAIL.

- [ ] **Step 3: Implement** `createFakeContext` (records `tool/command/skill` operator arrays and `hook` kinds; each transform returns a disposable `Registration`, customizable via `onRegistration`) and `registerTools` (iterate tools; skip unless `resolved.get(id)?.enabled`; push disposables into a per-tool list; on catch, dispose the per-tool list and record `{ id, error }`).

- [ ] **Step 4: Run + typecheck** → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(core): registry with per-tool isolation"`.

---

### Task 6: KitApi + plugin bootstrap

**Files:**
- Create: `src/core/kit-api.ts`, `src/plugin.ts`
- Test: `tests/unit/bootstrap.test.ts`

**Interfaces:**
- Consumes: `registerTools` (Task 5), config load/merge/resolve/validate (Tasks 2–4), `createKitApi`.
- Produces:
  - `createKitApi(toolId: string, ctx: KitContext, packageRoot: string, version: string): KitApi` — `namespace(name)` records the current namespace (default `toolId`); `tool`/`command`/`skill`/`on` wrap the matching `ctx` transform/hook and call `editor.namespace({ name, description })` when the editor supports it; `scriptPath(name)` resolves `join(packageRoot, "scripts", toolId, name)` as an absolute path.
  - `bootstrap(ctx: KitContext, tools: KitTool[], options?: Record<string, unknown>): Promise<{ dispose(): Promise<void>; degraded: { id: string; error: string }[] }>` — full setup: discover → load → merge → resolve/validate each tool → `registerTools` → returns combined dispose.
  - `default export { id: "opencode-kit", async setup(ctx) { ... } }` in `src/plugin.ts`.

- [ ] **Step 1: Write failing tests** — `tests/unit/bootstrap.test.ts`

```ts
import { expect, test } from "bun:test"
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { defineTool } from "../../src/core/tool"
import { bootstrap } from "../../src/plugin"
import { createFakeContext } from "../../src/core/testing"

function projectWithConfig(json: string) {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const proj = join(home, "proj")
  mkdirSync(join(proj, ".opencode"), { recursive: true })
  writeFileSync(join(proj, ".opencode", "opencode-kit.jsonc"), json)
  return { home, proj }
}

test("disabled tool does not register; enabled does", async () => {
  const { proj } = projectWithConfig(`{ "tools": { "a": { "enabled": true }, "b": { "enabled": false } } }`)
  const { ctx, calls } = createFakeContext({ directory: proj })
  const a = defineTool({ id: "a", name: "A", description: "d", defaultSettings: {},
    register(c) { return c.tool.transform(() => {}) } })
  const b = defineTool({ id: "b", name: "B", description: "d", defaultSettings: {},
    register(c) { return c.tool.transform(() => {}) } })
  const res = await bootstrap(ctx, [a, b])
  expect(calls.tool.length).toBe(1)
  await res.dispose()
})

test("bootstrap returns one dispose that releases registrations", async () => {
  const { proj } = projectWithConfig(`{ "tools": { "a": { "enabled": true } } }`)
  let disposed = 0
  const { ctx } = createFakeContext({ directory: proj, onRegistration: () => ({ dispose: async () => { disposed++ } }) })
  const a = defineTool({ id: "a", name: "A", description: "d", defaultSettings: {},
    register(c) { return c.tool.transform(() => {}) } })
  const res = await bootstrap(ctx, [a])
  await res.dispose()
  expect(disposed).toBe(1)
})
```

- [ ] **Step 2: Run, expect failure** → FAIL.

- [ ] **Step 3: Implement** `createKitApi` and `bootstrap`. `bootstrap` obtains `home` from `ctx` (add `home` to the fake context; real code uses `homedir()`), calls `discoverKitConfigFiles(ctx.location.directory, home)`, `loadKitConfig`, merges with `ctx.options` (highest), resolves+validates each tool, and calls `registerTools`. `src/plugin.ts` exports `{ id: "opencode-kit", setup }` where `setup` calls `bootstrap` with the real tool barrel and returns `res.dispose`.

- [ ] **Step 4: Run + typecheck** → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat: plugin bootstrap and KitApi"`.

---

### Task 7: Config reload

**Files:**
- Modify: `src/plugin.ts`
- Test: `tests/unit/reload.test.ts`

**Interfaces:**
- Consumes: `bootstrap` (Task 6).
- Produces:
  - `createLifecycle(ctx: KitContext, tools: KitTool[], options?: Record<string, unknown>, watch?: (paths: string[], cb: () => void) => () => void): Promise<{ reload(): Promise<void>; dispose(): Promise<void>; degraded(): { id: string; error: string }[] }>` — `reload` disposes current registrations then re-runs `bootstrap`; `dispose` disposes registrations and stops watching.

- [ ] **Step 1: Write failing test** — `tests/unit/reload.test.ts`

```ts
import { expect, test } from "bun:test"
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { defineTool } from "../../src/core/tool"
import { createLifecycle } from "../../src/plugin"
import { createFakeContext } from "../../src/core/testing"

test("reload disposes previous registrations then re-registers", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const proj = join(home, "proj"); mkdirSync(join(proj, ".opencode"), { recursive: true })
  const cfg = join(proj, ".opencode", "opencode-kit.jsonc")
  writeFileSync(cfg, `{ "tools": { "a": { "enabled": true } } }`)
  let disposed = 0
  const { ctx, calls } = createFakeContext({ directory: proj,
    onRegistration: () => ({ dispose: async () => { disposed++ } }) })
  const a = defineTool({ id: "a", name: "A", description: "d", defaultSettings: {},
    register(c) { return c.tool.transform(() => {}) } })
  const life = await createLifecycle(ctx, [a], {}, () => () => {})
  expect(calls.tool.length).toBe(1)
  await life.reload()
  expect(disposed).toBe(1)          // first generation released
  expect(calls.tool.length).toBe(2) // re-registered
  await life.dispose()
})
```

- [ ] **Step 2: Run, expect failure** → FAIL.

- [ ] **Step 3: Implement** `createLifecycle` in `src/plugin.ts`, and have `setup` use it with an `fs.watch`-based watcher (debounced ~150ms) over the discovered config files. Tests inject a no-op watcher.

- [ ] **Step 4: Run + typecheck** → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat: config reload lifecycle"`.

---

### Task 8: Example `hello` tool + barrel

**Files:**
- Create: `src/tools/hello/index.ts`, `src/tools/index.ts`
- Test: `tests/unit/tools-hello.test.ts`

**Interfaces:**
- Consumes: `defineTool` (Task 1), `KitContext`.
- Produces: `hello` (a `KitTool` with `id: "hello"`, `defaultEnabled: true`, settings `{ greeting: string }`, registering one tool named `hello` in namespace `hello`), and `export const tools: KitTool[]` from `src/tools/index.ts`.

- [ ] **Step 1: Write failing test** — `tests/unit/tools-hello.test.ts`

```ts
import { expect, test } from "bun:test"
import { tools } from "../../src/tools/index"
import { createFakeContext } from "../../src/core/testing"

test("hello registers exactly one tool named hello", async () => {
  const hello = tools.find(t => t.id === "hello")!
  const { ctx, calls } = createFakeContext()
  await hello.register(ctx, { greeting: "hi" }, {} as any)
  expect(JSON.stringify(calls.tool)).toContain("hello")
})
```

- [ ] **Step 2: Run, expect failure** → FAIL.

- [ ] **Step 3: Implement** `hello` (calls `ctx.tool.transform(editor => editor.add({ name: "hello", description, input, execute }))` and `kit.namespace("hello")`) and the barrel exporting `[hello]`.

- [ ] **Step 4: Run + typecheck** → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(tools): example hello tool and barrel"`.

---

### Task 9: CLI foundation + `list`

**Files:**
- Create: `src/cli/index.ts`, `src/cli/commands/list.ts`
- Create: `bin/opencode-kit.js`
- Test: `tests/unit/cli-list.test.ts`

**Interfaces:**
- Consumes: `tools` barrel (Task 8), `loadKitConfig`/`resolveToolConfig` (Tasks 2–3), `discoverKitConfigFiles` (Task 3).
- Produces:
  - `runCli(argv: string[], io: { cwd: string; home: string; stdout(s: string): void; stderr(s: string): void }): Promise<number>` — dispatches subcommands; returns exit code.
  - `listCommand(io): Promise<number>` — prints each tool: id, enabled (resolved), and description.

- [ ] **Step 1: Write failing test** — `tests/unit/cli-list.test.ts`

```ts
import { expect, test } from "bun:test"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { runCli } from "../../src/cli/index"

test("list prints hello and its enabled state", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  let out = ""
  const code = await runCli(["list"], { cwd: home, home, stdout: (s) => { out += s }, stderr: () => {} })
  expect(code).toBe(0)
  expect(out).toContain("hello")
  expect(out).toMatch(/enabled|disabled/)
})
```

- [ ] **Step 2: Run, expect failure** → FAIL.

- [ ] **Step 3: Implement** `runCli` (parse with `node:util` `parseArgs` or manual dispatch) and `list`. `bin/opencode-kit.js` is a shim: `import { runCli } from "../dist/cli.js"; process.exit(await runCli(process.argv.slice(2), {...}))`.

- [ ] **Step 4: Run + typecheck** → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(cli): foundation and list command"`.

---

### Task 10: CLI `enable`/`disable` + `config get|set` (comment-preserving)

**Files:**
- Create: `src/config/edit.ts`, `src/cli/commands/toggle.ts`, `src/cli/commands/config.ts`
- Test: `tests/unit/config-edit.test.ts`, `tests/unit/cli-config.test.ts`

**Interfaces:**
- Consumes: `KitConfigFile` (Task 2).
- Produces:
  - `setToolEnabled(path: string, toolId: string, enabled: boolean): Promise<void>`
  - `setToolSetting(path: string, toolId: string, key: string, value: unknown): Promise<void>`
  Both read the file if present (default `{ configVersion: 1, tools: {} }`), use `jsonc-parser`'s `modify` + `applyEdits` to preserve comments, and write back.

- [ ] **Step 1: Write failing test** — `tests/unit/config-edit.test.ts`

```ts
import { expect, test } from "bun:test"
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { setToolEnabled } from "../../src/config/edit"

test("enable flips value and preserves comments", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "opencode-kit.jsonc")
  writeFileSync(f, `{\n  // keep me\n  "tools": { "a": { "enabled": false } },\n}`)
  await setToolEnabled(f, "a", true)
  const text = readFileSync(f, "utf8")
  expect(text).toContain("// keep me")
  expect(text).toContain(`"enabled": true`)
})
```

- [ ] **Step 2: Run, expect failure** → FAIL.

- [ ] **Step 3: Implement** `edit.ts` helpers and wire `enable`/`disable`/`config get`/`config set` into `runCli`. `config set` coerces JSON scalars (`true`/`false`/numbers/`null`), else treats as string.

- [ ] **Step 4: Run + typecheck** → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(cli): enable/disable and config get/set"`.

---

### Task 11: CLI `init`, `doctor`, `version`

**Files:**
- Create: `src/cli/commands/init.ts`, `src/cli/commands/doctor.ts`
- Test: `tests/unit/cli-init.test.ts`

**Interfaces:**
- Consumes: `tools` barrel, config edit helpers, `deepMerge`.
- Produces:
  - `initCommand(io, { project?: boolean }): Promise<number>` — creates the kit config (global unless `--project`), seeds `tools[id] = { enabled: tool.defaultEnabled ?? false, settings: tool.defaultSettings }`, and ensures the `opencode.json` `plugins` array contains `"opencode-kit"` (creating the file if absent; never duplicating).
  - `doctorCommand(io): Promise<number>` — reports config validity + degraded tools + whether the plugin is active (best-effort; returns non-zero only on config errors).

- [ ] **Step 1: Write failing test**

```ts
import { expect, test } from "bun:test"
import { mkdtempSync, existsSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { initCommand } from "../../src/cli/commands/init"

test("init seeds config and adds plugin entry once", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const io = { cwd: home, home, stdout: () => {}, stderr: () => {} }
  await initCommand(io, {})
  const cfg = join(home, ".config", "opencode", "opencode-kit.jsonc")
  expect(existsSync(cfg)).toBe(true)
  expect(readFileSync(cfg, "utf8")).toContain("hello")
  await initCommand(io, {}) // idempotent
  const oc = JSON.parse(readFileSync(join(home, ".config", "opencode", "opencode.json"), "utf8"))
  expect(oc.plugins.filter((p: string) => p === "opencode-kit").length).toBe(1)
})
```

- [ ] **Step 2: Run, expect failure** → FAIL.

- [ ] **Step 3: Implement** `initCommand` (idempotent seeding; ensure `.config/opencode/` exists; add plugin entry only if missing) and `doctorCommand`/`version`.

- [ ] **Step 4: Run + typecheck** → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(cli): init, doctor, version"`.

---

### Task 12: CLI `new` scaffolder

**Files:**
- Create: `src/cli/commands/new.ts`, `src/cli/scaffold.ts`
- Test: `tests/unit/cli-new.test.ts`

**Interfaces:**
- Consumes: `defineTool` shape.
- Produces:
  - `scaffoldTool(root: string, toolId: string): Promise<{ dir: string }>` — creates `src/tools/<id>/index.ts` from a template and inserts an import + array entry into `src/tools/index.ts` between marker comments `// <kit:tools>` / `// </kit:tools>`; fails if the id already exists.
  - `newCommand(io, toolId): Promise<number>`.

- [ ] **Step 1: Write failing test** — `tests/unit/cli-new.test.ts`

```ts
import { expect, test } from "bun:test"
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { scaffoldTool } from "../../src/cli/scaffold"

test("scaffolds a tool dir and updates the barrel", async () => {
  const root = mkdtempSync(join(tmpdir(), "kit-"))
  mkdirSync(join(root, "src", "tools"), { recursive: true })
  writeFileSync(join(root, "src", "tools", "index.ts"),
    `import { hello } from "./hello"\nexport const tools = [\n  // <kit:tools>\n  hello,\n  // </kit:tools>\n]\n`)
  await scaffoldTool(root, "my-tool")
  expect(existsSync(join(root, "src", "tools", "my-tool", "index.ts"))).toBe(true)
  const barrel = readFileSync(join(root, "src", "tools", "index.ts"), "utf8")
  expect(barrel).toContain("myTool")
})

test("refuses to overwrite an existing tool", async () => {
  const root = mkdtempSync(join(tmpdir(), "kit-"))
  mkdirSync(join(root, "src", "tools", "dup"), { recursive: true })
  await expect(scaffoldTool(root, "dup")).rejects.toThrow()
})
```

- [ ] **Step 2: Run, expect failure** → FAIL.

- [ ] **Step 3: Implement** `scaffoldTool` + `newCommand`. The template `index.ts` imports `defineTool` and exports a default `defineTool({...})`. Convert kebab id to camelCase for the barrel identifier.

- [ ] **Step 4: Run + typecheck** → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(cli): new tool scaffolder"`.

---

### Task 13: Build, entrypoints, schema, live smoke

**Files:**
- Create: `index.js`, `opencode-kit.schema.json`
- Modify: `package.json`
- Test: `tests/integration/plugin-loads.test.ts`

**Interfaces:**
- Consumes: `src/plugin.ts` default export, `dist/` build output.
- Produces:
  - `index.js` (directory-form entry): `export { default } from "./dist/plugin.js"`.
  - `opencode-kit.schema.json`: JSON Schema for the kit config file.

- [ ] **Step 1: Add the schema and entrypoint**

`opencode-kit.schema.json` (Draft-07): `{ "type":"object", "properties": { "configVersion": {"type":"integer"}, "tools": { "type":"object", "additionalProperties": { "type":"object", "properties": { "enabled": {"type":"boolean"}, "settings": {"type":"object"} }, "additionalProperties": false } } }, "additionalProperties": false }`.

`index.js` as above.

Also add `"prepare": "bun run build"` to `package.json` scripts. (Deferred from Task 1: a `prepare` hook runs on `bun install` and fails until `src/plugin.ts` and `src/cli/index.ts` exist — they exist by now.)

- [ ] **Step 2: Write a failing integration test** — `tests/integration/plugin-loads.test.ts`

```ts
import { expect, test } from "bun:test"
import { spawnSync } from "node:child_process"

test("bun build produces dist/plugin.js exporting a plugin object", async () => {
  const b = spawnSync("bun", ["run", "build:plugin"], { cwd: process.cwd() })
  expect(b.status).toBe(0)
  const mod = await import("../../dist/plugin.js")
  expect(mod.default.id).toBe("opencode-kit")
  expect(typeof mod.default.setup).toBe("function")
})
```

- [ ] **Step 3: Run, expect failure** → FAIL (dist missing).

- [ ] **Step 4: Build + verify** — `bun run build` then `bun test tests/integration/plugin-loads.test.ts` → PASS.

- [ ] **Step 5: Live smoke against a real OpenCode** (manual verification, documented in Task 15's `INSTALL.md`)
Create a throwaway config that points `plugins` at this repo's absolute path (or run `opencode plugin add` against a packed tarball), start `opencode --standalone`, and confirm via `opencode api get /api/plugin` that `opencode-kit` is active and the `hello` tool is registered. Record the exact commands/output in the commit message.

- [ ] **Step 6: Commit** — `git commit -m "feat: build output, entrypoint, and config schema"`.

---

### Task 14: Docs, agent setup, and license

**Files:**
- Create: `README.md`, `LICENSE`, `CONTRIBUTING.md`, `CHANGELOG.md`, `AGENTS.md`
- Create: `.opencode/INSTALL.md`
- Create: `docs/examples/opencode-kit.jsonc`

**Interfaces:** none (documentation).

- [ ] **Step 1: Write `README.md`** — what it is, install (`opencode plugin add opencode-kit` / `npx opencode-kit init`), agent install one-liner, config example, adding a tool, CLI reference.
- [ ] **Step 2: Write `.opencode/INSTALL.md`** — Superpowers-style agent instructions: install the plugin, seed `opencode-kit.jsonc`, restart the service, verify with `doctor`; include the `/kit` fallback note.
- [ ] **Step 3: Write `LICENSE`** (MIT, "Jader Barbosa"), `CONTRIBUTING.md`, `CHANGELOG.md` (start at 0.1.0), `AGENTS.md`, and `docs/examples/opencode-kit.jsonc`.
- [ ] **Step 4: Verify** — `bun run typecheck && bun test` still pass; links in README resolve (spot-check).
- [ ] **Step 5: Commit** — `git commit -m "docs: README, agent install, license, and guides"`.

---

### Task 15: CI and publish workflows

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/publish.yml`

**Interfaces:** none.

- [ ] **Step 1: `ci.yml`** — on push/PR: `oven-sh/setup-bun`, `bun install --frozen-lockfile`, `bun run typecheck`, `bun test`.
- [ ] **Step 2: `publish.yml`** — on `v*` tag: setup-bun + node for publish, `bun install`, `bun run build`, `npm publish --access public` using an `NPM_TOKEN` secret.
- [ ] **Step 3: Verify locally** — `bun run typecheck && bun test && bun run build` all pass.
- [ ] **Step 4: Commit** — `git commit -m "ci: typecheck/test and publish workflows"`.

---

### Task 16: `/kit` slash command

**Files:**
- Create: `src/commands/kit.ts`
- Modify: `src/plugin.ts`
- Test: `tests/unit/command-kit.test.ts`

**Interfaces:**
- Consumes: `tools` barrel, config edit helpers (Task 10), lifecycle reload (Task 7), `KitContext`.
- Produces:
  - `registerKitCommand(ctx: KitContext, deps: { home: string; cwd: string; reload(): Promise<void>; stdout(s: string): void }): Promise<Registration>` — registers a command named `kit` whose `execute({ arguments })` handles `list`, `enable <id>`, `disable <id>`, and `config <id> <key> <value>`. Mutations edit the global kit config and then call `deps.reload()`.

- [ ] **Step 1: Write the failing test**

```ts
import { expect, test } from "bun:test"
import { mkdtempSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { registerKitCommand } from "../../src/commands/kit"
import { createFakeContext } from "../../src/core/testing"

test("`kit enable hello` writes config and triggers reload", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  let reloaded = 0
  const { ctx, calls } = createFakeContext()
  await registerKitCommand(ctx, { home, cwd: home, reload: async () => { reloaded++ }, stdout: () => {} })
  const cmd = (calls.command as any[]).find((c) => c.name === "kit")
  await cmd.execute({ arguments: "enable hello", sessionID: "s", prompt: {}, delivery: "steer" })
  expect(reloaded).toBe(1)
  expect(readFileSync(join(home, ".config", "opencode", "opencode-kit.jsonc"), "utf8")).toContain("hello")
})
```

- [ ] **Step 2: Run, expect failure** → FAIL.

- [ ] **Step 3: Implement** `registerKitCommand` and wire it into `setup` (Task 7's lifecycle) so the command is registered alongside tools and disposed with them.

- [ ] **Step 4: Run + typecheck** → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat: /kit slash command"`.

---

## Self-Review Notes

- **Spec coverage:** architecture/layout (Tasks 1–8, 13), KitTool contract + enable/disable (1, 2, 5), config model + reload (2–4, 7), CLI/install/packaging (9–13, 15), `/kit` command (16), isolation/testing/authoring (5, 12, 14), versioning/publishing (13, 15). All spec sections map to tasks.
- **Type consistency:** `ResolvedToolConfig`, `KitApi`, `KitContext`, `Registration`, `KitConfigFile` are defined once (Tasks 1–2) and reused by name thereafter.
- **Namespace clarification:** the spec's `KitApi.namespace(toolId)` is realized by making `namespace` set the default for `kit.tool/command/skill/on` helpers, which call `editor.namespace(...)` internally (V2 namespacing is per-transform-editor). Tools may still use `ctx` transforms directly and namespace themselves. This preserves the spec's surface while making the mechanism implementable.
- **Deferred from spec (intentionally):** `{env:VAR}` interpolation and auto-generated docs from `settingsSchema` (spec §12) are not in this plan; add as follow-ups if desired.
- **Open item to confirm:** whether `opencode plugin add` accepts a local directory/tarball for the Task 13 live smoke; if not, use a local `.opencode/plugins/opencode-kit` symlink to the repo.
