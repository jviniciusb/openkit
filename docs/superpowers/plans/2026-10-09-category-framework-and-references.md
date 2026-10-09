# Category Framework and References Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generalize opencode-kit's per-category machinery into one thin `KitCategory` descriptor + generic engine (tools, skills, references become instances), unify the CLI and `/kit` behind a shared operations layer, and add **references** as the third first-class category.

**Architecture:** A `KitCategory<TItem>` descriptor carries identity, policy, and one required hook (`registerItem`); a generic engine owns config resolution and the skip-if-disabled / isolate / tag-degraded registration loop. `catalog.ts` assembles the three descriptors from their barrels. A `src/operations/` layer serves both the CLI and the `/kit` command. References are declarative `src/references/<id>/reference.json` packages registered through `ctx.reference.transform`.

**Tech Stack:** TypeScript run by Bun (no build step), `bun:test`, `ajv` + `jsonc-parser` (existing deps). No new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-08-category-framework-and-references-design.md`

## Global Constraints

- No new runtime dependencies. TypeScript/Bun, no build step; `src` stays in `package.json` `files`.
- Config stays **category-keyed** (`tools`, `skills`, `references`); precedence unchanged. Comment-preserving edits only, via `jsonc-parser` in `src/config/edit.ts` (never `JSON.stringify`).
- Settings: `tools` and `references` have settings; `skills` do not (`hasSettings: false`). The generic resolver seeds settings from `category.defaultSettings?.(item) ?? {}`.
- Default-enabled: tools `?? false`, skills `?? true`, references `?? false`.
- Keep the `<kit:tools>`, `<kit:skills>`, and `<kit:references>` markers intact.
- Skill/tool/reference ids are **globally unique**; `enable`/`disable` resolve an id across categories in catalog order.
- Per-item isolation: a failing item degrades only itself; the kit and other categories keep loading.
- Degraded logging: `opencode-kit: <category> "<id>" degraded: <error>`.
- CLI scaffolding is `new <category> <id>` (`new tool|skill|reference`), with `new` and `new-skill` retained as aliases.
- `defineTool`/`defineSkill` authoring contracts are unchanged.
- Conventional Commits. Run `bun run typecheck && bun test` before committing.

## Review Focus

1. A `registerItem` that throws (a missing `SKILL.md`/`reference.json`) degrades only that item while sibling categories/items still register — Task 3.
2. Settings-bearing vs settings-less resolution: defaults seeded for tools/references; skills ignore `settings` entirely — Tasks 1 and 4.
3. A tool's partial registrations are still disposed on mid-register failure after the tracking wrapper is extracted from `registry.ts` — Tasks 3 and 5.
4. The provider-scoping `opts` argument actually reaches `session.hook` (currently dropped) — Task 2.
5. `new <category> <id>` plus the `new`/`new-skill` aliases preserve barrel markers and compute the barrel edit before writing — Task 11.

---

### Task 1: Category contract + resolution engine

**Files:**
- Create: `src/core/category.ts`
- Create: `src/core/engine.ts`
- Modify: `src/config/types.ts` (define `CategoryEntry`; type `tools`/`skills`/`references` as `Record<string, CategoryEntry>`; add a `categoryEntries` helper)
- Test: `tests/unit/engine.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // src/core/category.ts
  export interface CategoryEntry { enabled?: boolean; settings?: Record<string, unknown> }
  export interface ResolvedEntry { enabled: boolean; settings?: Record<string, unknown> }
  export interface RegisterItemResult { registrations: Registration[]; degraded?: string }
  export interface CategoryScaffold {
    dir: string
    entryFile: string
    barrel: string
    markers: { open: string; close: string }
    render(id: string): string
    renderBarrelEntry(id: string): string
    importLine?(id: string): string
    requiresImport?: string
  }
  export interface KitCategory<TItem> {
    key: string
    label: string
    items: readonly TItem[]
    defaultEnabled(item: TItem): boolean
    hasSettings: boolean
    defaultSettings?(item: TItem): Record<string, unknown>
    registerItem(item: TItem, resolved: ResolvedEntry, ctx: KitContext): Promise<RegisterItemResult>
    describe?(item: TItem): string
    inspect?(item: TItem, resolved: ResolvedEntry): string | undefined
    scaffold?: CategoryScaffold
  }
  // src/core/engine.ts
  export interface DegradedItem { category: string; id: string; error: string }
  export function resolveCategoryEntry<T>(category: KitCategory<T>, item: T, sources: KitConfigFile[]): ResolvedEntry
  export function resolveCategoryEffective<T>(category: KitCategory<T>, item: T, layers: ConfigLayer[]): {
    enabled: boolean
    enabledLayer?: ConfigLayer
    settings?: Record<string, unknown>
    settingLayers?: Record<string, ConfigLayer>
  }
  // src/config/types.ts
  export function categoryEntries(config: KitConfigFile, key: string): Record<string, CategoryEntry> | undefined
  ```

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/engine.test.ts
import { expect, test } from "bun:test"
import { resolveCategoryEntry, resolveCategoryEffective, type DegradedItem } from "../../src/core/engine"
import type { KitCategory } from "../../src/core/category"

type Fake = { id: string; defaultEnabled?: boolean; defaults?: Record<string, unknown> }
const widgets: KitCategory<Fake> = {
  key: "tools", label: "widgets", items: [],
  defaultEnabled: (i) => i.defaultEnabled ?? false,
  hasSettings: true,
  defaultSettings: (i) => i.defaults ?? {},
  async registerItem() { return { registrations: [] } },
}
const plain: KitCategory<Fake> = {
  key: "skills", label: "plain", items: [],
  defaultEnabled: (i) => i.defaultEnabled ?? true,
  hasSettings: false,
  async registerItem() { return { registrations: [] } },
}

test("seeds defaults then deep-merges source settings; enabled replaces", () => {
  expect(resolveCategoryEntry(widgets, { id: "a", defaults: { n: 1, list: ["a"] } }, []))
    .toEqual({ enabled: false, settings: { n: 1, list: ["a"] } })
  expect(resolveCategoryEntry(widgets, { id: "a", defaults: { n: 1, list: ["a"] } },
    [{ tools: { a: { enabled: true, settings: { n: 2, list: ["b"] } } } }]))
    .toEqual({ enabled: true, settings: { n: 2, list: ["b"] } })
})

test("settings-less category ignores settings and defaults", () => {
  expect(resolveCategoryEntry(plain, { id: "x" }, [{ skills: { x: { settings: { n: 1 } } } }]))
    .toEqual({ enabled: true })
})

test("resolveCategoryEffective records the layer that set enabled", () => {
  const layers = [
    { label: "global", config: { tools: { a: { enabled: false } } } },
    { label: "project", config: { tools: { a: { enabled: true } } } },
  ]
  const eff = resolveCategoryEffective(widgets, { id: "a", defaults: { n: 1 } }, layers)
  expect(eff.enabled).toBe(true)
  expect(eff.enabledLayer?.label).toBe("project")
  expect(eff.settings).toEqual({ n: 1 })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/unit/engine.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

Create `src/core/category.ts` with the types above (import `KitContext`, `Registration` from `./context`). Create `src/core/engine.ts` with `DegradedItem` and the two resolvers: `resolveCategoryEntry` starts `enabled` at `category.defaultEnabled(item)` and `settings` at `category.defaultSettings?.(item) ?? {}` (only when `hasSettings`), then folds `categoryEntries(source, category.key)?.[item.id]` (enabled replaces; settings deep-merge via `deepMerge`). `resolveCategoryEffective` mirrors it over `ConfigLayer[]`, tracking `enabledLayer`/`settingLayers`. In `src/config/types.ts`, define `CategoryEntry`, collapse `ToolConfigEntry`/`SkillConfigEntry` to it, type `tools`/`skills`/`references` as `Record<string, CategoryEntry>`, and add `categoryEntries(config, key)`. Keep the old `resolveToolConfig`/`resolveSkillConfig` for now (their callers migrate in later tasks).

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/unit/engine.test.ts && bun run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/category.ts src/core/engine.ts src/config/types.ts tests/unit/engine.test.ts
git commit -m "feat: add category contract and resolution engine"
```

---

### Task 2: Context and KitApi fixes

**Files:**
- Modify: `src/core/context.ts` (add `reference` domain; `SessionDomain.hook` `opts`; `KitStorage.scan`)
- Modify: `src/core/kit-api.ts` (`on` forwards `opts`; add `toolHook`)
- Modify: `src/core/testing.ts` (record `reference`; `scan`; `opts`; optional `session.prompt` recorder; arbitrary `options`)
- Test: `tests/unit/kit-api.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // context.ts
  export interface ReferenceSource { type: "local"; path: string } | { type: "git"; repository: string; branch?: string }
  export interface ReferenceEditor { add(name: string, source: ReferenceSource): void }
  export interface ReferenceDomain { transform(cb: (editor: ReferenceEditor) => void): Promise<Registration> }
  // KitContext gains: readonly reference: ReferenceDomain
  export interface StorageScanResult { entries: readonly { key: string; value: unknown }[]; next?: string }
  export interface KitStorage { get; set; remove; scan(options: { prefix: string; after?: string; limit?: number }): Promise<StorageScanResult> }
  export interface SessionDomain { hook(name: string, handler: HookHandler, opts?: unknown): Promise<Registration>; prompt? }
  // KitApi
  on(kind: string, handler: HookHandler, opts?: unknown): Promise<Registration>
  toolHook(name: string, handler: HookHandler): Promise<Registration>
  ```

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/kit-api.test.ts
import { expect, test } from "bun:test"
import { createKitApi } from "../../src/core/kit-api"
import { createFakeContext } from "../../src/core/testing"

test("on forwards opts to session.hook", async () => {
  const { ctx, calls } = createFakeContext()
  const kit = createKitApi("t", ctx, "0.0.0")
  await kit.on("context", () => {}, { providerID: "openai" })
  expect(calls.hookOpts).toEqual([{ providerID: "openai" }])
})

test("toolHook registers an execute.before hook", async () => {
  const { ctx, calls } = createFakeContext()
  const kit = createKitApi("t", ctx, "0.0.0")
  await kit.toolHook("execute.before", () => {})
  expect(calls.toolHook).toEqual(["execute.before"])
})

test("fake storage exposes scan", async () => {
  const { ctx } = createFakeContext()
  expect(await ctx.storage.scan({ prefix: "" })).toEqual({ entries: [] })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/unit/kit-api.test.ts`
Expected: FAIL — `calls.hookOpts`/`toolHook`/`scan` missing.

- [ ] **Step 3: Implement**

Add the `reference` domain and `StorageScanResult`/`scan` to `context.ts`; add `opts?` to `SessionDomain.hook`. In `kit-api.ts`, forward `opts` in `on` and add `toolHook(name, handler)` delegating to `ctx.tool.hook`. In `testing.ts`, add `reference` recording (`calls.reference`), `hookOpts`, a `scan` returning `{ entries: [] }`, an optional `session.prompt` recorder, and allow arbitrary `options` via `FakeContextOptions`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/unit/kit-api.test.ts && bun run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/context.ts src/core/kit-api.ts src/core/testing.ts tests/unit/kit-api.test.ts
git commit -m "feat: forward hook opts, add storage.scan and toolHook, add reference domain"
```

---

### Task 3: Tracking wrapper + generic registration

**Files:**
- Create: `src/core/tracking.ts`
- Modify: `src/core/engine.ts` (add `registerCategories`)
- Test: `tests/unit/engine.test.ts` (extend)

**Interfaces:**
- Consumes: `KitCategory`, `ResolvedEntry`, `RegisterItemResult` (Task 1); `KitContext`, `Registration` (Task 2).
- Produces:
  ```ts
  // src/core/tracking.ts
  export function createTrackingContext(ctx: KitContext): { ctx: KitContext; created: Registration[] }
  // src/core/engine.ts
  export async function registerCategories(
    categories: readonly KitCategory<unknown>[], sources: KitConfigFile[], ctx: KitContext,
  ): Promise<{ registrations: Registration[]; degraded: DegradedItem[] }>
  ```

- [ ] **Step 1: Write the failing test**

```ts
// append to tests/unit/engine.test.ts
import { registerCategories } from "../../src/core/engine"
import { createFakeContext } from "../../src/core/testing"

function cat(key: string, items: Array<{ id: string }>, registerItem: KitCategory<{ id: string }>["registerItem"]): KitCategory<{ id: string }> {
  return { key, label: key, items, defaultEnabled: () => true, hasSettings: false, registerItem }
}

test("registerCategories skips disabled, registers enabled, isolates throws", async () => {
  const { ctx, calls } = createFakeContext()
  const good = cat("tools", [{ id: "a" }], async (item, _r, c) => {
    const reg = await c.skill.transform(() => {}); return { registrations: [reg] }
  })
  const bad = cat("skills", [{ id: "b" }], async () => { throw new Error("boom") })
  const off = cat("skills", [{ id: "c" }], async () => { throw new Error("should not run") })
  const res = await registerCategories(
    [good, bad, off],
    [{ tools: { a: { enabled: true } }, skills: { b: { enabled: true }, c: { enabled: false } } }],
    ctx,
  )
  expect(calls.skill.length).toBe(1)
  expect(res.registrations.length).toBe(1)
  expect(res.degraded).toEqual([{ category: "skills", id: "b", error: "boom" }])
})

test("createTrackingContext tracks and disposes the tool/reference domains", async () => {
  let disposed = 0
  const { ctx } = createFakeContext({ onRegistration: () => ({ dispose: async () => { disposed++ } }) })
  const { ctx: tracked, created } = createTrackingContext(ctx)
  await tracked.tool.transform(() => {})
  await tracked.reference.transform(() => {})
  expect(created.length).toBe(2)
  for (const r of created) await r.dispose()
  expect(disposed).toBe(2)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/unit/engine.test.ts`
Expected: FAIL — `registerCategories` not exported.

- [ ] **Step 3: Implement**

Extract the tracking wrapper from `registry.ts` into `src/core/tracking.ts` (same `Object.create` + `defineProperties` over `tool`/`command`/`skill`/`reference`/`session`/`storage`, returning `{ ctx, created }`). Implement `registerCategories`: for each category, for each item, `resolveCategoryEntry`; skip unless `enabled === true`; `await category.registerItem(item, resolved, ctx)` in try/catch; collect `result.registrations`; push `result.degraded` (if any) and thrown errors as `{ category: category.key, id: item.id, error }`. Do not delete `registry.ts` yet (Task 5).

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/unit/engine.test.ts && bun run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/tracking.ts src/core/engine.ts tests/unit/engine.test.ts
git commit -m "feat: add generic category registration with tracking and isolation"
```

---

### Task 4: Generic comment-preserving config edits

**Files:**
- Modify: `src/config/edit.ts` (public generic `setEntryEnabled`/`setEntrySetting`/`seedEntries`; `DEFAULT_CONFIG` gains `references: {}`)
- Test: `tests/unit/config-edit.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export async function setEntryEnabled(path: string, category: string, id: string, enabled: boolean): Promise<void>
  export async function setEntrySetting(path: string, category: string, id: string, key: string, value: unknown): Promise<void>
  export async function seedEntries(path: string, category: string, seeds: Record<string, CategoryEntry>): Promise<void>
  ```

- [ ] **Step 1: Update the failing tests**

In `tests/unit/config-edit.test.ts`, add coverage for the generic editors (`setEntryEnabled`/`seedEntries` with `category: "tools"|"skills"`) and a `references` case. Leave the existing tool/skill wrapper tests in place — those wrappers still exist until Task 14.

```ts
test("setEntrySetting writes a nested setting for any settings category", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "opencode-kit.jsonc")
  writeFileSync(f, `{ "references": { "r": { "enabled": true } } }`)
  await setEntrySetting(f, "references", "r", "branch", "main")
  expect((parse(readFileSync(f, "utf8")) as KitConfigFile).references?.r?.settings).toEqual({ branch: "main" })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/unit/config-edit.test.ts`
Expected: FAIL — new exports missing.

- [ ] **Step 3: Implement**

Make `setEntryEnabled`/`seedEntries` public and add `setEntrySetting`; keep the `setToolEnabled`/`setSkillEnabled`/`seedTools`/`seedSkills` wrappers delegating to the generic editors (their callers migrate through Task 13). Update `DEFAULT_CONFIG` to include `references: {}`. Do NOT delete the old resolvers here — `resolveToolConfig`/`resolveSkillConfig`/`resolveEffective`/`resolveSkillEffective` are still called by the plugin/CLI/doctor until those tasks migrate; they are removed in Task 14.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/unit/config-edit.test.ts tests/unit/cli-config.test.ts && bun run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config/edit.ts tests/unit/config-edit.test.ts
git commit -m "refactor: generalize comment-preserving config edits across categories"
```

---

### Task 5: Category descriptors, catalog, and bootstrap wiring

**Files:**
- Create: `src/categories/tool.ts`, `src/categories/skill.ts`
- Create: `src/catalog.ts`
- Modify: `src/plugin.ts` (`bootstrap(ctx, categories, options?)`, `createLifecycle`, `setup`)
- Delete: `src/core/registry.ts`
- Delete: `tests/unit/registry.test.ts` (isolation/partial-disposal coverage moves to `tests/unit/engine.test.ts`, Task 3)
- Modify: `tests/unit/bootstrap.test.ts`, `tests/unit/reload.test.ts`

**Interfaces:**
- Consumes: `KitCategory` (Task 1), `registerCategories` (Task 3), `createTrackingContext` (Task 3), `createKitApi` (`src/core/kit-api.ts`), `resolveValidated` (`src/config/validate.ts`), `registerSkill` (`src/core/skill.ts`).
- Produces:
  ```ts
  export const toolCategory: KitCategory<KitTool>
  export const skillCategory: KitCategory<KitSkill>
  // src/catalog.ts
  export const categories: readonly KitCategory<unknown>[]
  // src/plugin.ts
  export async function bootstrap(ctx: KitContext, categories: readonly KitCategory<unknown>[], options?: Record<string, unknown>): Promise<BootstrapResult>
  export async function createLifecycle(ctx: KitContext, categories: readonly KitCategory<unknown>[], options?: Record<string, unknown>, watch?: WatchFactory): Promise<Lifecycle>
  ```

- [ ] **Step 1: Write the failing test**

```ts
// append to tests/unit/bootstrap.test.ts
import { bootstrap } from "../../src/plugin"
import { toolCategory } from "../../src/categories/tool"
import { skillCategory } from "../../src/categories/skill"

test("bootstrap registers tools and skills from descriptors and disposes both", async () => {
  const { proj } = projectWithConfig(`{ "tools": { "a": { "enabled": true } }, "skills": { "s": { "enabled": true } } }`)
  const dir = mkdtempSync(join(tmpdir(), "skill-"))
  writeFileSync(join(dir, "SKILL.md"), "---\nname: S\n---\nbody")
  const tool = defineTool({ id: "a", name: "A", description: "d", defaultSettings: {},
    register(c) { return c.tool.transform(() => {}) } })
  const skill = defineSkill({ id: "s", dir: pathToFileURL(`${dir}/`) })
  const { ctx, calls } = createFakeContext({ directory: proj })
  const res = await bootstrap(ctx, [
    { ...toolCategory, items: [tool] },
    { ...skillCategory, items: [skill] },
  ])
  expect(calls.tool.length).toBe(1)
  expect(calls.skill.length).toBe(1)
  await res.dispose()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/unit/bootstrap.test.ts`
Expected: FAIL — `toolCategory`/`skillCategory` missing; signature mismatch.

- [ ] **Step 3: Implement**

`toolCategory`: `defaultEnabled = t.defaultEnabled ?? false`, `hasSettings: true`, `defaultSettings = t.defaultSettings`, `registerItem` builds `createTrackingContext(ctx)`, validates settings with `resolveValidated(t, { enabled: resolved.enabled, settings: resolved.settings ?? t.defaultSettings })`, and on valid calls `t.register(tracked, validated.settings, createKitApi(t.id, tracked, ctx.app.version))`, returning `{ registrations: created, degraded }`; on invalid returns `{ registrations: [], degraded }`. `skillCategory`: `defaultEnabled = s.defaultEnabled ?? true`, `hasSettings: false`, `registerItem` returns `{ registrations: [await registerSkill(ctx, s)] }`, `describe = skillDescription`. `src/catalog.ts` exports `categories = [toolCategory, skillCategory]`. `plugin.ts` `bootstrap` builds `sources` (unchanged) and calls `registerCategories(categories, sources, ctx)`; `setup` passes `categories`. Delete `src/core/registry.ts` and update its callers/tests.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/unit/bootstrap.test.ts tests/unit/reload.test.ts tests/unit/engine.test.ts && bun run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/categories src/catalog.ts src/plugin.ts tests/unit
git rm src/core/registry.ts
git commit -m "refactor: drive tools and skills through category descriptors"
```

---

### Task 6: Shared operations layer

**Files:**
- Create: `src/operations/index.ts`, `src/operations/list.ts`, `src/operations/toggle.ts`, `src/operations/config.ts`
- Test: `tests/unit/operations.test.ts`

**Interfaces:**
- Consumes: `categories` (Task 5), `resolveCategoryEntry`/`resolveCategoryEffective` (Task 1), `setEntryEnabled`/`setEntrySetting` (Task 4), `buildConfigLayers`/`readPluginOptions` (`src/config/effective.ts`).
- Produces:
  ```ts
  export interface OperationDeps { cwd: string; home: string; options?: KitConfigFile; out(s: string): void; err(s: string): void; reload?(): Promise<void> }
  export interface OperationResult { exitCode: number }
  export function listOperation(categories, deps): Promise<OperationResult>
  export function toggleOperation(categories, deps, id: string | undefined, enabled: boolean): Promise<OperationResult>
  export function configGetOperation(categories, deps, id: string | undefined, key: string | undefined): Promise<OperationResult>
  export function configSetOperation(categories, deps, id: string | undefined, key: string | undefined, valueParts: string[]): Promise<OperationResult>
  ```

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/operations.test.ts
import { expect, test } from "bun:test"
import { mkdtempSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { parse } from "jsonc-parser"
import { listOperation, toggleOperation, configSetOperation } from "../../src/operations/index"
import { globalConfigPath } from "../../src/config/discover"
import { categories } from "../../src/catalog"

function deps(home: string) {
  let out = "", err = ""
  return { d: { cwd: home, home, out: (s: string) => { out += s }, err: (s: string) => { err += s } }, out: () => out, err: () => err }
}

test("toggle resolves a skill id across categories and writes skills.<id>", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const x = deps(home)
  expect(await toggleOperation(categories, x.d, "sdd-flow", false)).toEqual({ exitCode: 0 })
  expect((parse(readFileSync(globalConfigPath(home), "utf8")) as any).skills["sdd-flow"].enabled).toBe(false)
})

test("configSet rejects a settings-less skill id", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const x = deps(home)
  const res = await configSetOperation(categories, x.d, "sdd-flow", "x", ["1"])
  expect(res.exitCode).not.toBe(0)
  expect(x.err()).toContain("sdd-flow")
})

test("list prints a section per non-empty category", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const x = deps(home)
  await listOperation(categories, x.d)
  expect(x.out()).toContain("tools:")
  expect(x.out()).toContain("skills:")
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/unit/operations.test.ts`
Expected: FAIL — operations module missing.

- [ ] **Step 3: Implement**

Port the bodies of `cli/commands/list.ts`, `toggle.ts`, and `config.ts` into `src/operations/*`, parameterized by `categories` and `OperationDeps`. `list` prints `<label>:` per non-empty category then `<id>\t<enabled|disabled>\t<describe(item)>` (tolerate a throwing `describe` → `""`). `toggle` finds `(category, item)` by id in catalog order; unknown → `err` + exit 1; writes `setEntryEnabled(globalConfigPath(deps.home), category.key, id, enabled)`; warns on override using `resolveCategoryEffective` + `deps.options`; calls `deps.reload?.()`. `configGet`/`configSet` require `category.hasSettings` (else `err` "has no settings", exit 1), write `setEntrySetting`, and reuse the existing degraded/override warnings. `exitCode` is 1 on any `err`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/unit/operations.test.ts && bun run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/operations tests/unit/operations.test.ts
git commit -m "feat: add shared list/toggle/config operations"
```

---

### Task 7: CLI adapters over operations

**Files:**
- Modify: `src/cli/commands/list.ts`, `toggle.ts`, `config.ts`
- Test: `tests/unit/cli-list.test.ts`, `tests/unit/cli-config.test.ts` (must still pass)

**Interfaces:**
- Consumes: `listOperation`/`toggleOperation`/`configGetOperation`/`configSetOperation` (Task 6).

- [ ] **Step 1: No new behavior — existing CLI tests are the guard**

This task is a pure refactor (extract logic already covered by `tests/unit/cli-list.test.ts` and `tests/unit/cli-config.test.ts`). Do not add a new test; the existing suite must stay green.

- [ ] **Step 2: Run the guard tests to confirm they pass before the refactor**

Run: `bun test tests/unit/cli-list.test.ts tests/unit/cli-config.test.ts`
Expected: PASS.

- [ ] **Step 3: Implement**

Rewrite the three CLI commands as thin adapters: build `OperationDeps` from `CliIo` (`out → io.stdout`, `err → io.stderr`, `options: readPluginOptions(io.cwd, io.home)`, no `reload`), call the operation, return `result.exitCode`. Delete the now-duplicated logic. `src/cli/index.ts` dispatch is unchanged.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/unit/cli-list.test.ts tests/unit/cli-config.test.ts && bun run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cli/commands tests/unit
git commit -m "refactor: make CLI commands thin adapters over operations"
```

---

### Task 8: `/kit` adapter over operations

**Files:**
- Modify: `src/commands/kit.ts`
- Test: `tests/unit/command-kit.test.ts` (must still pass)

**Interfaces:**
- Consumes: the operations (Task 6), `OperationDeps`.

- [ ] **Step 1: Write the failing test**

```ts
// append to tests/unit/command-kit.test.ts
test("`kit list` includes a skills section (shared operation)", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  let out = ""
  const { ctx, calls } = createFakeContext()
  await registerKitCommand(ctx, { home, cwd: home, reload: async () => {}, stdout: (s) => { out += s } })
  const cmd = (calls.command as any[]).find((c) => c.name === "kit")
  await cmd.execute({ arguments: "list", sessionID: "s" })
  expect(out).toContain("skills:")
})
```

- [ ] **Step 2: Run test to verify it fails/passes**

Run: `bun test tests/unit/command-kit.test.ts`
Expected: PASS (behavior preserved); the task removes duplication.

- [ ] **Step 3: Implement**

Rewrite `list`/`toggle`/`configure` in `kit.ts` to call the shared operations with `OperationDeps` (`out`/`err` → `outputWriter`, `options: ctx.options`, `reload: deps.reload`). Keep `USAGE`, `tokenize`, `outputWriter`, and the command registration. Remove the duplicated layer/warning logic.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/unit/command-kit.test.ts && bun run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/commands/kit.ts tests/unit/command-kit.test.ts
git commit -m "refactor: make /kit a thin adapter over operations"
```

---

### Task 9: Reference core

**Files:**
- Create: `src/core/reference.ts`
- Test: `tests/unit/reference.test.ts`

**Interfaces:**
- Consumes: `KitContext`, `Registration`, `ReferenceSource` (Task 2).
- Produces:
  ```ts
  export interface KitReference { id: string; dir: URL; defaultEnabled?: boolean }
  export function defineReference(ref: KitReference): KitReference   // fills defaultEnabled: false
  export interface LoadedReference { id: string; description?: string; source: ReferenceSource }
  export function loadReference(ref: KitReference): LoadedReference
  export function referenceDescription(ref: KitReference): string
  export async function registerReference(ctx: KitContext, ref: KitReference, settings?: Record<string, unknown>): Promise<Registration>
  ```

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/reference.test.ts
import { expect, test } from "bun:test"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { defineReference, loadReference, referenceDescription, registerReference } from "../../src/core/reference"
import { createFakeContext } from "../../src/core/testing"

function ref(id: string, json: string) {
  const dir = mkdtempSync(join(tmpdir(), "ref-"))
  writeFileSync(join(dir, "reference.json"), json)
  return defineReference({ id, dir: pathToFileURL(`${dir}/`) })
}

test("loads a local reference and applies settings overrides on register", async () => {
  const r = ref("r", `{ "description": "Docs", "type": "local", "path": "./docs" }`)
  expect(loadReference(r)).toEqual({ id: "r", description: "Docs", source: { type: "local", path: "./docs" } })
  const { ctx, calls } = createFakeContext()
  await registerReference(ctx, r, { path: "./other" })
  expect((calls.reference[0] as { name: string; source: unknown }).name).toBe("r")
  expect((calls.reference[0] as { source: unknown }).source).toEqual({ type: "local", path: "./other" })
})

test("invalid or missing reference files throw; description never throws", () => {
  expect(() => loadReference(ref("bad", `{ "type": "local" }`))).toThrow()
  const missing = defineReference({ id: "gone", dir: new URL("file:///no-such-ref/") })
  expect(referenceDescription(missing)).toBe("")
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/unit/reference.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

`loadReference` reads `fileURLToPath(new URL("reference.json", ref.dir))`, JSON-parses, and validates: `type === "local"` requires a string `path`; `type === "git"` requires a string `repository` (optional `branch`); else throw. `referenceDescription` wraps it returning `description ?? ""`. `registerReference` loads, merges `settings` over `source`, and calls `ctx.reference.transform((e) => e.add(ref.id, merged))`. `defineReference` fills `defaultEnabled: false`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/unit/reference.test.ts && bun run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/reference.ts tests/unit/reference.test.ts
git commit -m "feat: add reference contract, loader, and registration"
```

---

### Task 10: References category, barrel, and catalog

**Files:**
- Create: `src/references/index.ts`
- Create: `src/categories/reference.ts`
- Modify: `src/catalog.ts`
- Test: `tests/unit/skills-barrel.test.ts` (extend to references) or new `tests/unit/references-category.test.ts`

**Interfaces:**
- Consumes: `KitReference`, `loadReference`, `registerReference`, `referenceDescription` (Task 9); `KitCategory` (Task 1).
- Produces:
  ```ts
  export const references: KitReference[]   // src/references/index.ts (empty; <kit:references> markers)
  export const referenceCategory: KitCategory<KitReference>
  ```

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/references-category.test.ts
import { expect, test } from "bun:test"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { referenceCategory } from "../../src/categories/reference"
import { defineReference } from "../../src/core/reference"
import { registerCategories } from "../../src/core/engine"
import { createFakeContext } from "../../src/core/testing"

test("referenceCategory registers an enabled reference with settings override", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ref-"))
  writeFileSync(join(dir, "reference.json"), `{ "type": "git", "repository": "https://x/y" }`)
  const ref = defineReference({ id: "std", dir: pathToFileURL(`${dir}/`) })
  const { ctx, calls } = createFakeContext()
  const res = await registerCategories(
    [{ ...referenceCategory, items: [ref] }],
    [{ references: { std: { enabled: true, settings: { branch: "main" } } } }],
    ctx,
  )
  expect(res.degraded).toEqual([])
  expect((calls.reference[0] as { source: { branch?: string } }).source.branch).toBe("main")
})

test("references barrel is empty and catalog includes the reference category", async () => {
  const { references } = await import("../../src/references/index")
  const { categories } = await import("../../src/catalog")
  expect(references).toEqual([])
  expect(categories.map((c) => c.key)).toEqual(["tools", "skills", "references"])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/unit/references-category.test.ts`
Expected: FAIL — modules missing.

- [ ] **Step 3: Implement**

`src/references/index.ts`: `export const references: KitReference[] = []` between `// <kit:references>` markers. `referenceCategory`: `defaultEnabled = r.defaultEnabled ?? false`, `hasSettings: true`, `defaultSettings = () => ({})`, `registerItem` returns `{ registrations: [await registerReference(ctx, r, resolved.settings)] }`, `describe = referenceDescription`, `inspect` calls `loadReference` in try/catch. Add `referenceCategory` to `src/catalog.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/unit/references-category.test.ts && bun run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/references src/categories/reference.ts src/catalog.ts tests/unit/references-category.test.ts
git commit -m "feat: add references as a first-class category"
```

---

### Task 11: Generic scaffolder + `new <category> <id>`

**Files:**
- Modify: `src/cli/scaffold.ts` (add `scaffoldCategory`; `scaffoldTool`/`scaffoldSkill` become wrappers; add reference scaffold metadata)
- Modify: `src/cli/commands/new.ts` (dispatch `new <category> <id>`; `new`/`new-skill` aliases)
- Modify: `src/cli/index.ts`
- Test: `tests/unit/cli-new.test.ts`, `tests/unit/cli-new-skill.test.ts`, new `tests/unit/cli-new-category.test.ts`

**Interfaces:**
- Consumes: `CategoryScaffold` (Task 1); descriptors (Tasks 5, 10).
- Produces:
  ```ts
  export async function scaffoldCategory(category: KitCategory<unknown>, root: string, id: string): Promise<{ dir: string }>
  ```

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/cli-new-category.test.ts
import { expect, test } from "bun:test"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { runCli } from "../../src/cli/index"

function root() {
  const r = mkdtempSync(join(tmpdir(), "kit-"))
  for (const [dir, barrel] of [
    ["tools", `export const tools = [\n  // <kit:tools>\n  // </kit:tools>\n]\n`],
    ["skills", `import { defineSkill } from "../core/skill"\nexport const skills = [\n  // <kit:skills>\n  // </kit:skills>\n]\n`],
    ["references", `import { defineReference } from "../core/reference"\nexport const references = [\n  // <kit:references>\n  // </kit:references>\n]\n`],
  ] as const) {
    mkdirSync(join(r, "src", dir), { recursive: true })
    writeFileSync(join(r, "src", dir, "index.ts"), barrel)
  }
  return r
}

test("new reference scaffolds reference.json and a barrel entry", async () => {
  const r = root()
  const io = { cwd: r, home: r, stdout: () => {}, stderr: () => {} }
  expect(await runCli(["new", "reference", "std"], io)).toBe(0)
  expect(existsSync(join(r, "src", "references", "std", "reference.json"))).toBe(true)
  expect(readFileSync(join(r, "src", "references", "index.ts"), "utf8")).toContain('id: "std"')
  expect(readFileSync(join(r, "src", "references", "index.ts"), "utf8")).toContain("// </kit:references>")
  expect(await runCli(["new-skill", "my-skill"], io)).toBe(0)
  expect(existsSync(join(r, "src", "skills", "my-skill", "SKILL.md"))).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/unit/cli-new-category.test.ts`
Expected: FAIL — `new <category> <id>` unsupported.

- [ ] **Step 3: Implement**

Attach a `scaffold` to each descriptor (tools, skills, references) with `dir`, `entryFile`, `barrel`, `markers`, `render`, `renderBarrelEntry`, optional `importLine`/`requiresImport`. Implement `scaffoldCategory(category, root, id)` (validate id, refuse existing dir, read barrel, compute edit before writing, write entry file + barrel). Make `scaffoldTool`/`scaffoldSkill` delegate. In `commands/new.ts`, parse `new <category> <id>` (or `new <id>` = tool, `new-skill <id>` = skill) and dispatch; unknown category → error.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/unit/cli-new.test.ts tests/unit/cli-new-skill.test.ts tests/unit/cli-new-category.test.ts && bun run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cli tests/unit
git commit -m "feat: unify scaffolding under new <category> <id>"
```

---

### Task 12: `init` generic over categories

**Files:**
- Modify: `src/cli/commands/init.ts`
- Test: `tests/unit/cli-init.test.ts`

**Interfaces:**
- Consumes: `categories` (Tasks 5, 10), `seedEntries` (Task 4).

- [ ] **Step 1: Write the failing test**

```ts
// append to tests/unit/cli-init.test.ts
test("init seeds a references section", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  await initCommand({ cwd: home, home, stdout: () => {}, stderr: () => {} }, {})
  const cfg = JSON.parse(readFileSync(globalConfigPath(home), "utf8"))
  expect(cfg.references).toEqual({})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/unit/cli-init.test.ts`
Expected: FAIL — no `references` key.

- [ ] **Step 3: Implement**

In `initCommand`, iterate `categories`: for each, build `Record<string, CategoryEntry>` (`{ enabled: category.defaultEnabled(item) }`, plus `settings: category.defaultSettings?.(item)` for `hasSettings`) and `await seedEntries(configPath, category.key, seeds)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/unit/cli-init.test.ts && bun run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cli/commands/init.ts tests/unit/cli-init.test.ts
git commit -m "refactor: seed every category from init"
```

---

### Task 13: `doctor` generic over categories

**Files:**
- Modify: `src/cli/commands/doctor.ts`
- Test: `tests/unit/cli-doctor.test.ts`

**Interfaces:**
- Consumes: `categories` (Tasks 5, 10), `resolveCategoryEntry` (Task 1), `category.inspect`.

- [ ] **Step 1: Write the failing test**

```ts
// append to tests/unit/cli-doctor.test.ts
test("doctor reports a references section", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const h = io(home)
  const code = await doctorCommand(h.io)
  expect(code).toBe(0)
  expect(h.out()).toContain("references: ok")
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/unit/cli-doctor.test.ts`
Expected: FAIL — no `references` line.

- [ ] **Step 3: Implement**

In `doctorCommand`, iterate `categories` (accept an injectable `categories` parameter defaulting to the catalog): for each item, resolve, and call `category.inspect?.(item, resolved)`; collect reasons; print `<label>: ok` or `<category>: error <id> <reason>`; fold any error into the exit code. Preserve config-parse and plugin checks. Update the existing doctor tests from the skills work that passed a bare `[skill]` as the second argument — they must now pass category descriptors (e.g. `[{ ...skillCategory, items: [skill] }]`).

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/unit/cli-doctor.test.ts && bun run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cli/commands/doctor.ts tests/unit/cli-doctor.test.ts
git commit -m "refactor: check every category from doctor"
```

---

### Task 14: Schema, docs, integration, and full gate

**Files:**
- Modify: `opencode-kit.schema.json`, `README.md`, `.opencode/INSTALL.md`, `docs/examples/opencode-kit.jsonc`, `AGENTS.md`, `CHANGELOG.md`, `package.json`
- Modify: `src/config/effective.ts`, `src/config/edit.ts` (remove now-unused tool/skill resolvers and edit wrappers); delete `src/config/resolve.ts` and `tests/unit/config-resolve.test.ts` if fully unused
- Test: `tests/unit/schema.test.ts`, `tests/integration/plugin-loads.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// append to tests/unit/schema.test.ts
test("a references section with enabled and settings is valid", () => {
  expect(validate({ configVersion: 1, references: { std: { enabled: true, settings: { branch: "main" } } } })).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/unit/schema.test.ts`
Expected: FAIL — schema rejects `references`.

- [ ] **Step 3: Implement**

Add a `references` property to `opencode-kit.schema.json` (`enabled` + `settings`), mirroring `tools`. Remove dead code once no caller references it: the tool/skill-specific resolvers (`resolveToolConfig`/`resolveSkillConfig`, `resolveEffective`/`resolveSkillEffective`) and the `setToolEnabled`/`setSkillEnabled`/`seedTools`/`seedSkills` wrappers; delete `src/config/resolve.ts` and `tests/unit/config-resolve.test.ts` if fully unused. Update docs: `README.md` (category framework, references section, `new <category> <id>`, `references.<id>`), `.opencode/INSTALL.md`, `docs/examples/opencode-kit.jsonc` (a `references` block), `AGENTS.md` (categories + references + `new reference`), `CHANGELOG.md`, `package.json` keywords. In `tests/integration/plugin-loads.test.ts`, assert `categories` has the three keys and the catalog still loads.

- [ ] **Step 4: Run the full gate**

Run: `bun run typecheck && bun test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add opencode-kit.schema.json README.md .opencode/INSTALL.md docs/examples/opencode-kit.jsonc AGENTS.md CHANGELOG.md package.json tests
git commit -m "docs: document the category framework and references"
```
