# opencode-kit — Category Framework and References Design Spec

- **Date:** 2026-10-08
- **Status:** Draft for review
- **Author:** (agent-assisted)
- **Topic:** Generalize the kit's per-category machinery into one `KitCategory` descriptor + engine, unify the CLI and `/kit`, and add **references** as the third first-class category

## 1. Summary

The kit now has two first-class categories — **tools** and **skills** — added by
parallel construction. The duplication is broad (registry, config
resolve/effective/edit, CLI, `/kit`, scaffolder, schema, barrels) and leaky in
about ten ways, and a third category would ripple through every layer.

This spec:

- Introduces a **thin `KitCategory` descriptor** and a **generic engine** that
  owns the uniform machinery (config resolution, the skip-if-disabled /
  isolate / tag-degraded registration loop, CLI iteration).
- Makes **tools, skills, and references** instances of that descriptor.
- Adds a **shared `src/operations/` layer** so the CLI and the `/kit` slash
  command call the same `list`/`toggle`/`configSet` logic instead of two copies.
- Adds **references** as the third category: shipped `src/references/<id>/reference.json`
  packages, registered through `ctx.reference.transform`.
- Fixes real gaps in `KitApi`/`KitContext` (a dropped provider-scoping argument,
  missing `storage.scan`, no tool-hook helper, a hard-coded tracking wrapper).
- Keeps the authoring contracts (`defineTool`, `defineSkill`) and the public
  config shape (category-keyed) unchanged, and adds a unified
  `new <category> <id>` CLI with `new`/`new-skill` retained as aliases.

## 2. Context and intent

- **Audience:** the author plus public users of the open GitHub repo.
- **Posture:** framework-first, and now framework-honest. Two categories revealed
  the pattern; a third proves it. The goal is that adding category N is a
  descriptor plus a folder, with no edits to the engine.
- **Why generalize rather than copy again:** a third parallel copy would triple
  the duplication and make every future change a three-way edit. The end state —
  one engine, N descriptors — is the point.
- **Why references:** of the V2 domains, references are the strongest
  declarative candidate (`ctx.reference.transform` takes pure data:
  `{ type: "local", path }` or `{ type: "git", repository, branch }`). As with
  skills (which also have a native `.opencode/skills` discovery), the kit's value
  is shipping curated, independently toggleable bundles — not new capability.
- **Non-goals:**
  - Adding **MCP servers** as a category (plausible later; overlaps native
    `opencode.json` config). Deferred.
  - Adding **agents** as a category — V2 `AgentEditor` has no `add`, so plugins
    cannot create agents. Not viable.
  - Making **commands / websearch / VCS / worktree / providers / models /
    permissions / shell** first-class — all behavioral.
  - Changing `defineTool`/`defineSkill` authoring contracts.
  - Moving config under a single generic map (category-keyed config is more
    readable and is preserved).

## 3. Constraints and facts

- OpenCode V2 plugin context (per <https://opencode.ai/v2/docs/build/plugins>)
  exposes these registration domains: `tool`, `command`, `skill`, `reference`,
  `mcp`, `provider`, `model`, `agent`, `integration`, `vcs`, `worktree`,
  `websearch`, plus `session` hooks, `storage`, `event`, `generate`, `permission`.
- The kit deliberately declares a **structural subset** in `src/core/context.ts`
  (no dependency on `@opencode/plugin`). Isolation is enforced by a per-tool
  tracking wrapper in `src/core/registry.ts` that overrides exactly
  `tool`/`command`/`skill`/`session`/`storage`; a domain not in that list is not
  tracked or disposed on tool failure.
- `ctx.reference.transform((editor) => editor.add(name, source))` where
  `source` is `{ type: "local", path }` or `{ type: "git", repository, branch }`;
  the editor also has `list`/`get`/`remove`/`reload`. Pure data, no callbacks.
- Current duplication (verified): `registerTools`/`registerSkills`,
  `resolveToolConfig`/`resolveSkillConfig`, `resolveEffective`/`resolveSkillEffective`,
  `setToolEnabled`/`setSkillEnabled`, `seedTools`/`seedSkills`,
  `scaffoldTool`/`scaffoldSkill`, `updateBarrel`/`updateSkillBarrel`, two
  `Register*Result` shapes, two barrel-marker conventions, two schema blocks.
  `src/config/edit.ts` is the only partially generalized module
  (`setEntryEnabled`/`seedEntries`, internal).
- The tools/skills split is genuinely **non-uniform**: settings asymmetry
  (tools have `defaultSettings`/`settingsSchema`/`config get|set`), inverted
  default-enabled polarity (tool `?? false`, skill `?? true`), a fundamentally
  different registration model (imperative `register` + tracking wrapper vs
  declarative file load), different item payloads, a throwing description for
  skills, and a **global** id namespace.
- Config is a **closed** shape: `KitConfigFile` keys and the schema's top-level
  `additionalProperties: false` are explicit, so a new category edits types and
  schema regardless of the abstraction.
- No build step; `src` ships as-is; Bun transpiles. `package.json` `files`
  includes `src`.

## 4. Architecture

### 4.1 Components

- **`src/core/category.ts`** — the `KitCategory` descriptor, `CategoryEntry`,
  `ResolvedEntry`, `RegisterItemResult`, `CategoryScaffold`.
- **`src/core/engine.ts`** — generic `resolveCategoryEntry`,
  `resolveCategoryEffective`, and `registerCategories` (skip-if-disabled →
  `registerItem` in try/catch → tag degraded). Generalized `DegradedItem`.
- **`src/core/tracking.ts`** — the per-item tracking wrapper, extracted from
  `registry.ts`, extended to include the `reference` domain.
- **`src/categories/{tool,skill,reference}.ts`** — the three descriptors
  (each supplies only its non-uniform parts).
- **`src/catalog.ts`** — assembles `categories` from the descriptors.
- **`src/operations/`** — `list`, `toggle`, `configGet`, `configSet` shared by
  the CLI and `/kit`.
- **`src/references/`** — `index.ts` barrel (with `<kit:references>` markers)
  and `src/core/reference.ts` (`KitReference`, `defineReference`, `loadReference`,
  `registerReference`).
- **`src/plugin.ts`** — `bootstrap(ctx, categories, options?)` /
  `createLifecycle(ctx, categories, options?, watch?)`; `setup` passes the
  catalog.
- Existing `src/core/tool.ts`, `src/core/skill.ts`, `src/config/*`,
  `src/cli/*`, `src/commands/kit.ts` adapt to the generic shapes.

### 4.2 Data flow

```text
setup:   config files -> merge
           -> for each category: resolve entries (generic) -> registerItems (isolated)
           -> one dispose releases every registration from every category
runtime: a category's item is advertised/loaded by the harness from its registration
reload:  config change -> dispose all -> re-resolve all categories -> re-register
cli:     argv -> operations.<op> (generic over categories) -> frontend renders result
```

### 4.3 Repo layout (delta)

```text
src/
  core/
    category.ts     # NEW: KitCategory + entry/result/scaffold types
    engine.ts       # NEW: generic resolve + registerCategories + DegradedItem
    tracking.ts     # NEW: tracking wrapper (from registry.ts) incl. reference
    reference.ts    # NEW: KitReference, defineReference, loadReference, registerReference
    registry.ts     # retired: replaced by engine.ts + category descriptors
  categories/
    tool.ts         # NEW: toolCategory descriptor
    skill.ts        # NEW: skillCategory descriptor
    reference.ts    # NEW: referenceCategory descriptor
  catalog.ts        # NEW: categories = [toolCategory, skillCategory, referenceCategory]
  operations/
    list.ts, toggle.ts, config.ts   # NEW: shared CLI//kit operations
  references/
    index.ts        # NEW: barrel with <kit:references> markers (ships empty)
  config/           # generic over category keys
  cli/              # thin adapters; `new <category> <id>`
  commands/kit.ts   # thin adapter over operations/
```

## 5. Category contract and engine

### 5.1 `KitCategory`

Thin: data + policy + one required hook + three optional hooks.

```ts
export interface CategoryEntry {
  enabled?: boolean
  settings?: Record<string, unknown>
}

export interface ResolvedEntry {
  enabled: boolean
  settings?: Record<string, unknown>
}

export interface RegisterItemResult {
  registrations: Registration[]
  degraded?: string
}

export interface CategoryScaffold {
  dir: string                                  // e.g. "src/tools"
  entryFile: string                            // e.g. "index.ts" | "SKILL.md" | "reference.json"
  barrel: string                               // e.g. "src/tools/index.ts"
  markers: { open: string; close: string }     // e.g. "// <kit:tools>"
  render(id: string): string                   // file contents
  renderBarrelEntry(id: string): string        // barrel array entry
  importLine?(id: string): string              // tools only
  requiresImport?: string                      // e.g. "defineSkill"
}

export interface KitCategory<TItem> {
  /** Config key + CLI id, e.g. "tools". */
  key: string
  /** Human label for list/doctor sections, e.g. "tools". */
  label: string
  /** Singular noun for doctor messages, e.g. "tool". */
  singular: string
  /** Shipped items, from the category barrel. */
  items: readonly TItem[]
  /** Default enabled state when config is silent. */
  defaultEnabled(item: TItem): boolean
  /** Whether the category carries settings (drives config get/set + resolution). */
  hasSettings: boolean
  /** Default settings base for settings-bearing categories; tools return tool.defaultSettings. */
  defaultSettings?(item: TItem): Record<string, unknown>
  /** The only truly per-category behavior. */
  registerItem(item: TItem, resolved: ResolvedEntry, ctx: KitContext): Promise<RegisterItemResult>
  /** One-line description for list; may throw — callers tolerate. */
  describe?(item: TItem): string
  /** Doctor check; returns a reason or undefined. */
  inspect?(item: TItem, resolved: ResolvedEntry): string | undefined
  /** Whether an `inspect` reason is fatal (folds into the doctor exit code); default true. */
  inspectFatal?: boolean
  /** Scaffolder metadata. */
  scaffold?: CategoryScaffold
}
```

Descriptors are consumed through `KitCategory<unknown>` (method bivariance makes
`KitCategory<KitTool>` assignable); `catalog.ts` holds a single
`categories: readonly KitCategory<unknown>[]`.

### 5.2 Generic engine (`src/core/engine.ts`)

```ts
export interface DegradedItem { category: string; id: string; error: string }

export function resolveCategoryEntry<T>(
  category: KitCategory<T>, item: T, sources: KitConfigFile[],
): ResolvedEntry
// enabled: category.defaultEnabled(item), replaced by source[category.key]?.[item.id].enabled
// settings: deep-merged across sources only when category.hasSettings

export function resolveCategoryEffective<T>(
  category: KitCategory<T>, item: T, layers: ConfigLayer[],
): { enabled: boolean; enabledLayer?: ConfigLayer; settings?: Record<string, unknown>; settingLayers?: Record<string, ConfigLayer> }

export async function registerCategories(
  categories: readonly KitCategory<unknown>[], sources: KitConfigFile[], ctx: KitContext,
): Promise<{ registrations: Registration[]; degraded: DegradedItem[] }>
// for each category, each item: resolve; skip unless enabled; await category.registerItem
// in try/catch; collect registrations; tag degraded { category: category.key, id, error }
```

`registerCategories` replaces `registerTools`/`registerSkills`. The tool
category's `registerItem` keeps the per-tool tracking wrapper (from
`src/core/tracking.ts`), validates settings via the existing
`resolveValidated`, and returns any validation `degraded` reason. A `registerItem`
that throws (a missing skill/reference file) is caught by the engine and degrades
only that item.

### 5.3 Per-category descriptors

- **`toolCategory`** (`src/categories/tool.ts`): `defaultEnabled = tool.defaultEnabled ?? false`,
  `hasSettings = true`, `registerItem` builds the tracking context + `createKitApi`,
  validates settings, calls `tool.register`; `describe = tool.description`;
  `inspect` validates settings; scaffold = tools.
- **`skillCategory`** (`src/categories/skill.ts`): `defaultEnabled = skill.defaultEnabled ?? true`,
  `hasSettings = false`, `registerItem` calls `registerSkill`;
  `describe = skillDescription`; `inspect` calls `loadSkill`; scaffold = skills.
- **`referenceCategory`** (`src/categories/reference.ts`): `defaultEnabled = reference.defaultEnabled ?? false`,
  `hasSettings = true`, `registerItem` calls `registerReference` with
  `resolved.settings` merged over the file source; `describe = reference.description`;
  `inspect` calls `loadReference`; scaffold = references.

## 6. Configuration model

- Config remains **category-keyed**: `tools`, `skills`, `references` (readable,
  explicit, unchanged precedence).
- One generic entry type `CategoryEntry { enabled?, settings? }`. `hasSettings`
  decides whether settings are resolved/merged/validated and whether
  `config get|set` accepts the id. For settings-bearing categories the generic
  resolver seeds settings from `category.defaultSettings?.(item) ?? {}` before
  deep-merging sources; settings-less categories ignore both.
- `references.<id>.settings` deep-merge over the descriptor file's source
  (per-project overrides of `path`/`repository`/`branch`).
- `src/config/types.ts` adds `references?: Record<string, CategoryEntry>`; the
  existing `ToolConfigEntry`/`SkillConfigEntry` collapse into `CategoryEntry`.
- `src/config/resolve.ts` and `effective.ts` delegate to the engine's generic
  functions; the tool/skill-specific resolvers are removed.
- `src/config/edit.ts`: `setEntryEnabled`/`seedEntries` become the public generic
  editors (`category: string`); `setToolSetting` generalizes to
  `setEntrySetting(path, category, id, key, value)`. `DEFAULT_CONFIG` gains
  `references: {}`.

## 7. Registry, lifecycle, isolation

- `bootstrap(ctx, categories, options?)` and
  `createLifecycle(ctx, categories, options?, watch?)`. `BootstrapResult.degraded`
  is `DegradedItem[]`.
- `src/plugin.ts` `setup` imports `categories` from `src/catalog.ts` and passes
  it through.
- The tracking wrapper (`src/core/tracking.ts`) overrides
  `tool`/`command`/`skill`/`reference`/`session`/`storage`, so the new
  `reference` domain is tracked and disposed on tool failure exactly like the
  others.
- Degraded logging becomes `opencode-kit: <category> "<id>" degraded: <error>`.
- One `dispose` releases tool, skill, and reference registrations via
  `Promise.allSettled`.

## 8. CLI and `/kit` unified operations

`src/operations/` holds the shared logic once:

```ts
export interface OperationDeps {
  cwd: string
  home: string
  options?: KitConfigFile            // plugin-options layer
  out(s: string): void
  err(s: string): void
  reload?(): Promise<void>           // /kit only
}
export interface OperationResult { exitCode: number }

export async function listOperation(categories, deps): Promise<OperationResult>
export async function toggleOperation(categories, deps, id: string | undefined, enabled: boolean): Promise<OperationResult>
export async function configGetOperation(categories, deps, id, key): Promise<OperationResult>
export async function configSetOperation(categories, deps, id, key, valueParts): Promise<OperationResult>
```

- `list` prints a `<label>:` section per non-empty category, rows
  `<id>\t<enabled|disabled>\t<describe>`.
- `toggle` resolves the id across categories in catalog order (global id
  namespace preserved), writes `setEntryEnabled(path, category.key, id, enabled)`,
  re-resolves effective state, and emits the advisory override warning.
- `config get|set` accept any `hasSettings` category; an id in a settings-less
  category (skills) is rejected with `"<id>" has no settings`; unknown ids keep
  the existing error.
- **Frontends:** the CLI (`src/cli/commands/*`) maps `out`→stdout, `err`→stderr,
  `options`→`readPluginOptions(cwd, home)`, no reload, and the returned
  `exitCode`; `/kit` (`src/commands/kit.ts`) maps `out`/`err`→`session.prompt`
  (fallback stdout), `options`→`ctx.options`, `reload`→`life.reload`. The
  duplicated warning strings and layer logic disappear.
- `init` and `doctor` stay CLI-only but iterate `categories`:
  `init` seeds `{ enabled: defaultEnabled(item) }` (plus default settings for
  `hasSettings` categories) per category; `doctor` runs each category's
  `inspect` and reports `<label>: ok` when healthy, or
  `<singular>: <degraded|error> <id>: <reason>` per issue — `inspectFatal`
  (default true) selects `error` (folds into the exit code) vs `degraded`
  (advisory, like invalid tool settings).
- Scaffolding unifies to `new <category> <id>` (`new tool x`, `new skill x`,
  `new reference x`); `new` and `new-skill` remain aliases for
  `new tool` / `new skill`. An unknown category is a user error.

## 9. References category

- Package: `src/references/<id>/reference.json`:

  ```jsonc
  // local
  { "description": "Team handbook", "type": "local", "path": "./docs/handbook" }
  // git
  { "description": "Company standards", "type": "git", "repository": "https://github.com/acme/standards", "branch": "main" }
  ```

- `src/core/reference.ts`:

  ```ts
  export interface KitReference { id: string; dir: URL; defaultEnabled?: boolean }
  export function defineReference(ref: KitReference): KitReference
  export type ReferenceSource =
    | { type: "local"; path: string }
    | { type: "git"; repository: string; branch?: string }
  export interface LoadedReference { id: string; description?: string; source: ReferenceSource }
  export function loadReference(ref: KitReference): LoadedReference      // throws if missing/invalid
  export function referenceDescription(ref: KitReference): string        // best effort, never throws
  export async function registerReference(ctx, ref, settings?): Promise<Registration>
  // source = { ...loaded.source, ...settings }; ctx.reference.transform((e) => e.add(ref.id, source))
  ```

- `loadReference` validates `type` and the required fields (`path`, or
  `repository`); an invalid file throws (degrading only that reference).
- `src/references/index.ts` is an explicit barrel with `<kit:references>` markers,
  shipping **empty** (no bundled reference). `new reference <id>` scaffolds a
  `reference.json` and inserts the barrel entry.
- Config: `references.<id>.enabled` (opt-in, default off) and optional
  `references.<id>.settings`.

## 10. KitApi and context fixes

- **Forward provider scoping:** `SessionDomain.hook(name, handler, opts?)` and
  `KitApi.on(kind, handler, opts?)` pass `opts` through (currently dropped).
- **`storage.scan`:** add `scan(options): Promise<StorageScanResult>` to
  `KitStorage`.
- **Tool hooks:** add `KitApi.toolHook(name, handler)` so a tool can register
  `execute.before`/`execute.after` without reaching through raw `ctx`.
- **Reference domain:** add `ReferenceDomain`/`ReferenceEditor` to `KitContext`
  and include `reference` in the tracking wrapper, so a tool that registers a
  reference through raw `ctx` is tracked and disposed. The reference category
  registers through `ctx.reference.transform` directly; no `KitApi` helper is
  added in this spec.
- The broader domain set (mcp/provider/model/event/generate/permission) remains
  out of scope; the tracking model is documented so a future domain is added in
  one place.

## 11. Scaffolder, schema, packaging, docs

- `scaffoldCategory(category, root, id)` drives creation from `CategoryScaffold`
  metadata; `scaffoldTool`/`scaffoldSkill` become thin wrappers, and
  `scaffoldReference` is added. The id rule, existing-directory refusal, and
  compute-barrel-before-write ordering are shared.
- `opencode-kit.schema.json` adds a `references` property (`enabled` +
  `settings`), mirroring `tools`.
- Packaging/doc drift is reconciled: the `main` (`./src/plugin.ts`) vs
  `index.js` entrypoints are documented as intentional, and `AGENTS.md`'s
  `Plugin.define` claim is corrected to the actual `{ id, setup }` export.
- Docs updated: `README.md` (category framework + references section, unified
  `new <category> <id>`, `references.<id>`), `.opencode/INSTALL.md`,
  `docs/examples/opencode-kit.jsonc` (a `references` block), `AGENTS.md`
  (categories + references + `new reference`), `CHANGELOG.md`,
  `package.json` keywords.

## 12. Testing

- **Engine:** `resolveCategoryEntry` (default polarity per category, settings
  merge gated by `hasSettings`, unknown ids ignored); `resolveCategoryEffective`
  bookkeeping; `registerCategories` skip/isolation/degraded-tagging with a
  mixed catalog (a throwing skill degrades only itself while tools register).
- **Descriptors:** tool tracking wrapper + validation degradation; skill
  loading; reference loading + settings override.
- **References:** `loadReference` valid/invalid/missing; `registerReference`
  source merge; `referenceDescription` never throws; CLI list/toggle/config and
  `new reference`.
- **Operations:** `list`/`toggle`/`configSet` unit-tested once, plus the CLI and
  `/kit` frontends verified to call them (shared warning strings).
- **KitApi/context:** `on` forwards `opts`; `storage.scan`; `toolHook` registers
  an execute hook; the tracking wrapper includes `reference`.
- **Fake context:** record `reference`, add an optional `session.prompt`
  recorder and arbitrary `options`, so `/kit` routing and plugin-options
  precedence are testable.
- Existing suite updated for the new shapes; gate `bun run typecheck && bun test`.

## 13. Migration and compatibility

- Internal refactor is transparent to config: `tools`/`skills` keys and
  precedence are unchanged. `references` is additive; the schema widens.
- CLI adds `new <category> <id>`; `new`/`new-skill` remain aliases, so existing
  usage keeps working.
- `DegradedItem` shape changes from `{ kind, id, error }` to
  `{ category, id, error }` (internal; tests updated). The degraded log line
  changes from `<kind>` to `<category>`.
- No config migration required.

## 14. Resolved decisions

1. **Abstraction:** thin `KitCategory` descriptor + one engine (Approach 1), not
   a uniform `KitItem` contract.
2. **Public surface:** category-keyed config preserved; CLI unified to
   `new <category> <id>` with aliases.
3. **References representation:** shipped `reference.json` descriptor files.
4. **References settings:** yes — `config get/set` applies to references, and
   `references.<id>.settings` override the file source.
5. **Bundled references:** none shipped; mechanism + scaffolder + docs + tests.
6. **MCP / agents:** deferred / not viable (documented as non-goals).

## 15. Success criteria

- Adding category N is a descriptor in `src/categories/`, a barrel, a schema
  block, and docs — no edits to the engine, CLI, or `/kit`.
- Tools, skills, and references share one registration loop, one resolver, one
  editor, one list/toggle/config implementation, and one scaffolder.
- The CLI and `/kit` no longer duplicate `list`/`toggle`/`config` logic or
  warning strings.
- A failing item in any category degrades only itself; the kit and other
  categories keep loading; the reference domain is tracked/disposed.
- References can be added with `new reference <id>`, toggled with
  `references.<id>.enabled`, overridden with `references.<id>.settings`, and
  listed by `list`/`doctor`.
- The dropped provider-scoping `opts` is forwarded; `storage.scan` and
  `toolHook` exist.
- Existing configs remain valid; `bun run typecheck && bun test` pass.
