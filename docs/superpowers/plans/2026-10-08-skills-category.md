# Skills Category Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add **skills** as a first-class, independently toggleable category in opencode-kit (parallel to tools), and ship `english-writing-assistant` and `sdd-flow`.

**Architecture:** A skill is a declarative `src/skills/<id>/SKILL.md` package enumerated by an explicit `<kit:skills>` barrel. A small loader reads the file, parses its V2 frontmatter, strips it, and registers the skill via the existing `ctx.skill.transform` with a real on-disk `path` (so a skill's supporting files resolve relative to its own directory). Config gains a `skills.<id>.enabled` section, and the CLI/`/kit` become category-aware. Per-item isolation is preserved: a broken skill degrades only itself.

**Tech Stack:** TypeScript (run by Bun, no build step), `bun:test`, `ajv` + `jsonc-parser` (already dependencies). No new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-08-skills-category-design.md`

## Global Constraints

- OpenCode V2 only. TypeScript source is the artifact; **no build step**, `src` stays in `package.json` `files`.
- **No new runtime dependencies.** The frontmatter reader is a hand-written focused subset parser.
- Skills default **enabled** (`defineSkill` sets `defaultEnabled: true`); tools stay opt-in.
- Frontmatter reader supports only: `name` (plain/quoted single-line), `description` (plain/quoted single-line, or folded `>`/`>-`, or literal `|`/`|-`), `metadata.opencode/autoinvoke`, and `disable-model-invocation`. When both `opencode/autoinvoke` and `disable-model-invocation` are present, `opencode/autoinvoke` wins.
- Config edits go through `jsonc-parser` `modify`/`applyEdits` in `src/config/edit.ts` and **never** rewrite config with `JSON.stringify`.
- Config shape: `tools.<id>.{enabled,settings}` and `skills.<id>.{enabled}` (no skill settings).
- Skill ids and tool ids are **globally unique**; `enable`/`disable` resolve an id across both.
- Keep the `// <kit:tools>` and `// <kit:skills>` markers intact.
- `list` prints a `tools:` section then a `skills:` section.
- `sdd-flow` is registered with `autoinvoke: false`; invocation is `@sdd-flow`.
- One failing tool/skill never breaks the kit or its siblings.
- Conventional Commits. Run `bun run typecheck && bun test` before committing.

## Review Focus

1. A missing/unreadable `SKILL.md` must degrade **only** that skill (kit, tools, other skills keep loading) — Task 6.
2. The folded `>-` description in `english-writing-assistant` must parse to a single-line description, not a literal `>` — Tasks 1 and 3.
3. An existing config with **no** `skills` key must still load, with skills defaulting enabled — Task 4.
4. A malformed or comment-only config must never be clobbered by skill edits — Task 5.
5. A registered skill's `path` must be the real absolute `SKILL.md` path so `sdd-flow`'s relative files resolve — Tasks 2 and 3.

---

### Task 1: Skill frontmatter reader

**Files:**
- Create: `src/core/skill.ts`
- Test: `tests/unit/skill.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export interface SkillFrontmatter {
    name?: string
    description?: string
    autoinvoke?: boolean
  }
  export function readSkillFrontmatter(text: string): SkillFrontmatter
  export function stripFrontmatter(text: string): string
  ```

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/skill.test.ts
import { expect, test } from "bun:test"
import { readSkillFrontmatter, stripFrontmatter } from "../../src/core/skill"

test("parses plain and quoted scalars and strips the frontmatter block", () => {
  const text = `---\nname: my-skill\ndescription: "A short line"\n---\n\n# Body\n`
  expect(readSkillFrontmatter(text)).toEqual({ name: "my-skill", description: "A short line" })
  expect(stripFrontmatter(text)).toBe("\n# Body\n")
})

test("joins a folded (>-) description into one line", () => {
  const text = `---\nname: s\ndescription: >-\n  first line\n  second line\n---\nbody`
  expect(readSkillFrontmatter(text).description).toBe("first line second line")
})

test("reads autoinvoke from metadata and disable-model-invocation", () => {
  expect(readSkillFrontmatter(`---\nmetadata:\n  opencode/autoinvoke: false\n---\nx`).autoinvoke).toBe(false)
  expect(readSkillFrontmatter(`---\ndisable-model-invocation: true\n---\nx`).autoinvoke).toBe(false)
})

test("opencode/autoinvoke wins over disable-model-invocation", () => {
  const text = `---\ndisable-model-invocation: true\nmetadata:\n  opencode/autoinvoke: true\n---\nx`
  expect(readSkillFrontmatter(text).autoinvoke).toBe(true)
})

test("no frontmatter yields empty fields and the full body", () => {
  expect(readSkillFrontmatter("# Just a body")).toEqual({})
  expect(stripFrontmatter("# Just a body")).toBe("# Just a body")
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/unit/skill.test.ts`
Expected: FAIL — `readSkillFrontmatter`/`stripFrontmatter` not exported.

- [ ] **Step 3: Implement `readSkillFrontmatter` and `stripFrontmatter`**

Frontmatter is the block between the first line exactly `---` and the next line exactly `---`. Share an internal `splitFrontmatter(text): { block?: string; body: string }`. Parse the block line-by-line: capture top-level `name`/`description` (folded `>`/`>-` joins deeper-indented following lines with spaces; literal `|`/`|-` joins with `\n`; strip surrounding quotes); scan a top-level `metadata:` block for `opencode/autoinvoke: true|false`; capture top-level `disable-model-invocation`. `autoinvoke` is set only when at least one of those keys is present, with `metadata.opencode/autoinvoke` taking precedence. Ignore all other keys. Never throw: on any malformed input return `{}` (and the full text for `stripFrontmatter`).

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/unit/skill.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/skill.ts tests/unit/skill.test.ts
git commit -m "feat: add skill frontmatter reader"
```

---

### Task 2: Skill loader and registration

**Files:**
- Modify: `src/core/skill.ts`
- Modify: `src/core/context.ts` (add `autoinvoke?: boolean` to `SkillDefinition`)
- Test: `tests/unit/skill.test.ts`

**Interfaces:**
- Consumes: `readSkillFrontmatter`, `stripFrontmatter` (Task 1); `KitContext`, `Registration` (`src/core/context.ts`).
- Produces:
  ```ts
  export interface KitSkill {
    id: string
    dir: URL
    defaultEnabled?: boolean
    /** Kit-packaging override; wins over the SKILL.md frontmatter value. */
    autoinvoke?: boolean
  }
  export function defineSkill(skill: KitSkill): KitSkill   // fills defaultEnabled: true
  export interface SkillInfo {
    id: string
    name: string
    description?: string
    path: string
    content: string
    autoinvoke?: boolean
  }
  export function loadSkill(skill: KitSkill): SkillInfo
  export function skillDescription(skill: KitSkill): string  // best effort, never throws
  export async function registerSkill(ctx: KitContext, skill: KitSkill): Promise<Registration>
  ```

- [ ] **Step 1: Write the failing test**

```ts
// append to tests/unit/skill.test.ts
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { defineSkill, loadSkill, registerSkill, skillDescription, type KitSkill } from "../../src/core/skill"
import { createFakeContext } from "../../src/core/testing"

function tempSkill(id: string, md: string): KitSkill {
  const dir = mkdtempSync(join(tmpdir(), "skill-"))
  writeFileSync(join(dir, "SKILL.md"), md)
  return defineSkill({ id, dir: pathToFileURL(`${dir}/`) })
}

test("defineSkill defaults defaultEnabled to true", () => {
  expect(defineSkill({ id: "s", dir: new URL("file:///x/") }).defaultEnabled).toBe(true)
})

test("loadSkill returns stripped content and a real absolute path", () => {
  const md = `---\nname: s\ndescription: d\n---\n\n# Body\n`
  const skill = tempSkill("s", md)
  const info = loadSkill(skill)
  expect(info.id).toBe("s")
  expect(info.name).toBe("s")
  expect(info.description).toBe("d")
  expect(info.content).not.toContain("---")
  expect(info.path.endsWith(join("SKILL.md"))).toBe(true)
  expect(info.path.startsWith("/")).toBe(true)
})

test("loadSkill marks autoinvoke:false and omits it otherwise", () => {
  expect(loadSkill(tempSkill("a", `---\ndisable-model-invocation: true\n---\nx`)).autoinvoke).toBe(false)
  expect("autoinvoke" in loadSkill(tempSkill("b", `---\nname: b\n---\nx`))).toBe(false)
})

test("skillDescription returns description or empty string without throwing", () => {
  expect(skillDescription(tempSkill("s", `---\ndescription: hi\n---\nx`))).toBe("hi")
  const missing = defineSkill({ id: "gone", dir: new URL("file:///nonexistent-dir/") })
  expect(skillDescription(missing)).toBe("")
})

test("the barrel autoinvoke override wins over frontmatter", () => {
  const dir = mkdtempSync(join(tmpdir(), "skill-"))
  writeFileSync(join(dir, "SKILL.md"), "---\nname: s\n---\nx")
  const skill = defineSkill({ id: "s", dir: pathToFileURL(`${dir}/`), autoinvoke: false })
  expect(loadSkill(skill).autoinvoke).toBe(false)
})

test("registerSkill adds the loaded info through ctx.skill.transform", async () => {
  const { ctx, calls } = createFakeContext()
  await registerSkill(ctx, tempSkill("s", `---\nname: S\ndescription: D\n---\nbody`))
  const info = calls.skill[0] as { id: string; name: string; description: string; content: string }
  expect(info.id).toBe("s")
  expect(info.name).toBe("S")
  expect(info.description).toBe("D")
  expect(info.content).toBe("body")
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/unit/skill.test.ts`
Expected: FAIL — `defineSkill`/`loadSkill`/`registerSkill` are not exported.

- [ ] **Step 3: Implement the loader and registration**

`loadSkill` reads `fileURLToPath(new URL("SKILL.md", skill.dir))` with `node:fs` `readFileSync` (throws if missing) and returns `{ id: skill.id, name: frontmatter.name ?? skill.id, description: frontmatter.description, path, content: stripFrontmatter(text) }`. Compute the effective autoinvoke as `skill.autoinvoke ?? frontmatter.autoinvoke`, adding `autoinvoke: false` only when that effective value is `false`. `skillDescription` wraps `loadSkill` in try/catch returning `description ?? ""`. `registerSkill` loads then calls `ctx.skill.transform((editor) => editor.add(info))` and returns the registration. Add `autoinvoke?: boolean` to `SkillDefinition` in `src/core/context.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/unit/skill.test.ts && bun run typecheck`
Expected: PASS and no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/core/skill.ts src/core/context.ts tests/unit/skill.test.ts
git commit -m "feat: add skill loader and registration"
```

---

### Task 3: Bundle the two skills and the barrel

**Files:**
- Create: `src/skills/index.ts`
- Create: `src/skills/english-writing-assistant/SKILL.md`
- Create: `src/skills/sdd-flow/SKILL.md`
- Create: `src/skills/sdd-flow/spec-template.md`
- Create: `src/skills/sdd-flow/step-format.md`
- Create: `src/skills/sdd-flow/update-refs.sh`
- Test: `tests/unit/skills-barrel.test.ts`

**Interfaces:**
- Consumes: `defineSkill`, `KitSkill`, `loadSkill` (Task 2); `tools` from `src/tools/index.ts`.
- Produces: `export const skills: KitSkill[]` from `src/skills/index.ts`.

- [ ] **Step 1: Copy the skill files verbatim**

Copy from `~/Documents/Projects/sdd-flow-and-english-writing-assistant/`:
`english-writing-assistant/SKILL.md` → `src/skills/english-writing-assistant/SKILL.md`;
`sdd-flow/SKILL.md`, `spec-template.md`, `step-format.md`, `update-refs.sh` → `src/skills/sdd-flow/`. Do not edit their contents.

- [ ] **Step 2: Create the barrel**

```ts
// src/skills/index.ts
import { defineSkill, type KitSkill } from "../core/skill"

/**
 * Every skill shipped by opencode-kit.
 *
 * The skill scaffolder inserts new entries between the `<kit:skills>` markers
 * below; keep those comments intact.
 */
export const skills: KitSkill[] = [
  // <kit:skills>
  defineSkill({ id: "english-writing-assistant", dir: new URL("./english-writing-assistant/", import.meta.url) }),
  defineSkill({ id: "sdd-flow", dir: new URL("./sdd-flow/", import.meta.url), autoinvoke: false }),
  // </kit:skills>
]
```

- [ ] **Step 3: Write the failing test**

```ts
// tests/unit/skills-barrel.test.ts
import { expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { skills } from "../../src/skills/index"
import { loadSkill } from "../../src/core/skill"
import { tools } from "../../src/tools/index"

test("ships the two expected skills with unique ids across tools and skills", () => {
  expect(skills.map((s) => s.id)).toEqual(["english-writing-assistant", "sdd-flow"])
  const ids = [...tools.map((t) => t.id), ...skills.map((s) => s.id)]
  expect(new Set(ids).size).toBe(ids.length)
})

test("english-writing-assistant parses its folded description and is model-visible", () => {
  const info = loadSkill(skills.find((s) => s.id === "english-writing-assistant")!)
  expect(info.description).toContain("Brazilian Portuguese")
  expect(info.description).not.toContain(">-")
  expect("autoinvoke" in info).toBe(false)
})

test("sdd-flow registers autoinvoke:false with a real directory and resolvable files", () => {
  const skill = skills.find((s) => s.id === "sdd-flow")!
  const info = loadSkill(skill)
  expect(info.autoinvoke).toBe(false)
  expect(info.content).not.toContain("---")
  for (const file of ["SKILL.md", "spec-template.md", "step-format.md", "update-refs.sh"]) {
    expect(existsSync(new URL(file, skill.dir))).toBe(true)
  }
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `bun test tests/unit/skills-barrel.test.ts`
Expected: FAIL — `src/skills/index.ts` does not exist.

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test tests/unit/skills-barrel.test.ts`
Expected: PASS. If the folded-description assertion fails, fix `readSkillFrontmatter`, not the vendored file.

- [ ] **Step 6: Commit**

```bash
git add src/skills tests/unit/skills-barrel.test.ts
git commit -m "feat: bundle english-writing-assistant and sdd-flow skills"
```

---

### Task 4: Skills config model (types, resolution, schema)

**Files:**
- Modify: `src/config/types.ts`
- Modify: `src/config/resolve.ts`
- Modify: `src/config/effective.ts`
- Modify: `opencode-kit.schema.json`
- Test: `tests/unit/config-resolve.test.ts`, `tests/unit/schema.test.ts`

**Interfaces:**
- Consumes: `KitSkill` (Task 2).
- Produces:
  ```ts
  export interface SkillConfigEntry { enabled?: boolean }
  export interface KitConfigFile { configVersion?: number; tools?: Record<string, ToolConfigEntry>; skills?: Record<string, SkillConfigEntry> }
  export interface ResolvedSkillConfig { enabled: boolean }
  export function resolveSkillConfig(skill: KitSkill, sources: KitConfigFile[]): ResolvedSkillConfig
  export function resolveSkillEffective(skill: KitSkill, layers: ConfigLayer[]): { enabled: boolean; enabledLayer?: ConfigLayer }
  ```

- [ ] **Step 1: Write the failing test**

```ts
// append to tests/unit/config-resolve.test.ts
import { defineSkill, type KitSkill } from "../../src/core/skill"
import { resolveSkillConfig } from "../../src/config/resolve"

const skill: KitSkill = defineSkill({ id: "s", dir: new URL("file:///x/") })

test("skill defaults to enabled with no sources (missing skills key)", () => {
  expect(resolveSkillConfig(skill, [{ tools: { t: { enabled: true } } }])).toEqual({ enabled: true })
})
test("skill enable is replaced by the highest source; unknown ids ignored", () => {
  expect(resolveSkillConfig(skill, [
    { skills: { s: { enabled: false }, ghost: { enabled: true } } },
    { skills: { s: { enabled: true } } },
  ])).toEqual({ enabled: true })
})
test("defineSkill respects an explicit defaultEnabled:false", () => {
  const off = defineSkill({ id: "o", dir: new URL("file:///x/"), defaultEnabled: false })
  expect(resolveSkillConfig(off, [])).toEqual({ enabled: false })
})
```

```ts
// append to tests/unit/schema.test.ts
test("a skills section with enabled is valid", () => {
  expect(validate({ configVersion: 1, skills: { "sdd-flow": { enabled: false } } })).toBe(true)
})
test("skill settings are not allowed", () => {
  expect(validate({ configVersion: 1, skills: { s: { settings: {} } } })).toBe(false)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/unit/config-resolve.test.ts tests/unit/schema.test.ts`
Expected: FAIL — `resolveSkillConfig` missing; schema rejects `skills`.

- [ ] **Step 3: Implement**

Add `SkillConfigEntry`, `KitConfigFile.skills`, and `ResolvedSkillConfig` to `src/config/types.ts`. Add `resolveSkillConfig` to `src/config/resolve.ts` mirroring `resolveToolConfig` but starting at `skill.defaultEnabled ?? true` and reading `source.skills?.[skill.id]` (only `enabled`). Add `resolveSkillEffective` to `src/config/effective.ts` returning `{ enabled, enabledLayer? }` by folding `layer.config.skills?.[skill.id].enabled`. Add a top-level `skills` property to `opencode-kit.schema.json` mirroring `tools` with only `enabled`; leave top-level `additionalProperties: false`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/unit/config-resolve.test.ts tests/unit/schema.test.ts && bun run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config/types.ts src/config/resolve.ts src/config/effective.ts opencode-kit.schema.json tests/unit/config-resolve.test.ts tests/unit/schema.test.ts
git commit -m "feat: add skills config model and schema"
```

---

### Task 5: Comment-preserving skill edits

**Files:**
- Modify: `src/config/edit.ts`
- Test: `tests/unit/config-edit.test.ts`

**Interfaces:**
- Consumes: `SkillConfigEntry` (Task 4).
- Produces:
  ```ts
  export async function setSkillEnabled(path: string, skillId: string, enabled: boolean): Promise<void>
  export async function seedSkills(path: string, seeds: Record<string, SkillConfigEntry>): Promise<void>
  ```

- [ ] **Step 1: Write the failing test**

```ts
// append to tests/unit/config-edit.test.ts
import { setSkillEnabled, seedSkills } from "../../src/config/edit"

test("setSkillEnabled flips value under skills and preserves comments", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "opencode-kit.jsonc")
  writeFileSync(f, `{\n  // keep me\n  "skills": { "sdd-flow": { "enabled": true } },\n}`)
  await setSkillEnabled(f, "sdd-flow", false)
  const text = readFileSync(f, "utf8")
  expect(text).toContain("// keep me")
  expect((parse(text) as KitConfigFile).skills?.["sdd-flow"]?.enabled).toBe(false)
})

test("setSkillEnabled refuses to edit a malformed config and leaves it intact", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "opencode-kit.jsonc")
  writeFileSync(f, "{ not json")
  await expect(setSkillEnabled(f, "s", false)).rejects.toThrow(/malformed/)
  expect(readFileSync(f, "utf8")).toBe("{ not json")
})

test("seedSkills only adds missing entries", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "opencode-kit.jsonc")
  writeFileSync(f, `{ "skills": { "a": { "enabled": false } } }`)
  await seedSkills(f, { a: { enabled: true }, b: { enabled: true } })
  const data = parse(readFileSync(f, "utf8")) as KitConfigFile
  expect(data.skills?.a?.enabled).toBe(false)
  expect(data.skills?.b?.enabled).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/unit/config-edit.test.ts`
Expected: FAIL — `setSkillEnabled`/`seedSkills` not exported.

- [ ] **Step 3: Implement**

Refactor the internals so tools and skills share one implementation: extract `setEntryEnabled(path, category, id, enabled)` and `seedEntries(path, category, seeds)`, then express `setToolEnabled`/`seedTools` (`category: "tools"`) and `setSkillEnabled`/`seedSkills` (`category: "skills"`) on top. Change `DEFAULT_CONFIG` to `{ configVersion: 1, tools: {}, skills: {} }`. The malformed-config and comment-preservation behavior must be preserved exactly.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/unit/config-edit.test.ts tests/unit/cli-config.test.ts`
Expected: PASS (existing tool edit tests still pass).

- [ ] **Step 5: Commit**

```bash
git add src/config/edit.ts tests/unit/config-edit.test.ts
git commit -m "feat: add comment-preserving skill config edits"
```

---

### Task 6: Skill registry and unified degradation

**Files:**
- Modify: `src/core/registry.ts`
- Modify: `src/plugin.ts` (degradation types/logging only; signatures change in Task 7)
- Test: `tests/unit/registry.test.ts`

**Interfaces:**
- Consumes: `KitSkill`, `registerSkill` (Task 2); `ResolvedSkillConfig` (Task 4).
- Produces:
  ```ts
  export interface DegradedItem { kind: "tool" | "skill"; id: string; error: string }
  export function registerTools(...): Promise<{ registrations: Registration[]; degraded: DegradedItem[] }>
  export async function registerSkills(
    skills: KitSkill[],
    resolved: Map<string, ResolvedSkillConfig>,
    ctx: KitContext,
  ): Promise<{ registrations: Registration[]; degraded: DegradedItem[] }>
  ```

- [ ] **Step 1: Write the failing test**

```ts
// append to tests/unit/registry.test.ts
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { defineSkill, type KitSkill } from "../../src/core/skill"
import { registerSkills } from "../../src/core/registry"

function skillDir(id: string, md: string | null): KitSkill {
  const dir = mkdtempSync(join(tmpdir(), "skill-"))
  if (md !== null) writeFileSync(join(dir, "SKILL.md"), md)
  return defineSkill({ id, dir: pathToFileURL(`${dir}/`) })
}

test("registerSkills registers enabled skills and skips disabled ones", async () => {
  const { ctx, calls } = createFakeContext()
  const res = await registerSkills(
    [skillDir("on", "---\nname: On\n---\nx"), skillDir("off", "---\nname: Off\n---\nx")],
    new Map([["on", { enabled: true }], ["off", { enabled: false }]]),
    ctx,
  )
  expect(calls.skill.length).toBe(1)
  expect(res.degraded).toEqual([])
  expect(res.registrations.length).toBe(1)
})

test("a skill missing SKILL.md degrades only itself, tagged kind: skill", async () => {
  const { ctx, calls } = createFakeContext()
  const res = await registerSkills(
    [skillDir("good", "---\nname: Good\n---\nx"), skillDir("broken", null)],
    new Map([["good", { enabled: true }], ["broken", { enabled: true }]]),
    ctx,
  )
  expect(calls.skill.length).toBe(1)
  expect(res.degraded).toEqual([{ kind: "skill", id: "broken", error: expect.any(String) }])
})

test("registerTools tags degraded entries kind: tool", async () => {
  const { ctx } = createFakeContext()
  const bad = defineTool({ id: "bad", name: "Bad", description: "d", defaultSettings: {},
    register() { throw new Error("nope") } })
  const res = await registerTools([bad], new Map([["bad", { enabled: true, settings: {} }]]), ctx, () => kit)
  expect(res.degraded).toEqual([{ kind: "tool", id: "bad", error: "nope" }])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/unit/registry.test.ts`
Expected: FAIL — `registerSkills` missing; degraded entries lack `kind`.

- [ ] **Step 3: Implement**

Rename `DegradedTool` to `DegradedItem` with a `kind` field; update `registerTools` to push `{ kind: "tool", id, error }`. Add `registerSkills`: for each skill whose resolved config is `enabled`, `await registerSkill(ctx, skill)` inside try/catch, collecting the registration; a throw pushes `{ kind: "skill", id, error }` and leaves siblings untouched. No tracking wrapper is needed because a skill creates exactly one registration.

Also update `src/plugin.ts` so the tree still compiles without changing the `bootstrap`/`createLifecycle` parameter lists yet: change the `DegradedTool` import and the `BootstrapResult.degraded`/`Lifecycle.degraded()` types to `DegradedItem`, add `kind: "tool"` to the settings-validation degraded push, and log each entry as `opencode-kit: <kind> "<id>" degraded: <error>` (keeps the existing `tool "a" degraded` assertion true).

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/unit/registry.test.ts tests/unit/bootstrap.test.ts && bun run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/registry.ts src/plugin.ts tests/unit/registry.test.ts
git commit -m "feat: register skills with per-item isolation"
```

---

### Task 7: Bootstrap and lifecycle wiring

**Files:**
- Modify: `src/plugin.ts`
- Test: `tests/unit/bootstrap.test.ts`, `tests/unit/reload.test.ts`

**Interfaces:**
- Consumes: `registerSkills`, `DegradedItem` (Task 6); `skills` barrel (Task 3); `resolveSkillConfig` (Task 4).
- Produces:
  ```ts
  export async function bootstrap(ctx: KitContext, tools: KitTool[], skills: KitSkill[], options?: Record<string, unknown>): Promise<BootstrapResult>
  export async function createLifecycle(ctx: KitContext, tools: KitTool[], skills: KitSkill[], options?: Record<string, unknown>, watch?: WatchFactory): Promise<Lifecycle>
  ```
  `BootstrapResult.degraded: DegradedItem[]`.

- [ ] **Step 1: Write the failing test**

```ts
// append to tests/unit/bootstrap.test.ts
import { pathToFileURL } from "node:url"
import { defineSkill } from "../../src/core/skill"

test("bootstrap registers enabled skills and disposes them", async () => {
  const { proj } = projectWithConfig(`{ "skills": { "s": { "enabled": true } } }`)
  let disposed = 0
  const { ctx, calls } = createFakeContext({ directory: proj,
    onRegistration: () => ({ dispose: async () => { disposed++ } }) })
  const dir = mkdtempSync(join(tmpdir(), "skill-"))
  writeFileSync(join(dir, "SKILL.md"), "---\nname: S\n---\nbody")
  const skill = defineSkill({ id: "s", dir: pathToFileURL(`${dir}/`) })
  const res = await bootstrap(ctx, [], [skill])
  expect(calls.skill.length).toBe(1)
  await res.dispose()
  expect(disposed).toBe(1)
})
```

Update existing `bootstrap(...)` calls to `bootstrap(ctx, tools, [])`, and `createLifecycle(...)` calls in `reload.test.ts` to `createLifecycle(ctx, tools, [], options, watch)`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/unit/bootstrap.test.ts tests/unit/reload.test.ts`
Expected: FAIL — signature mismatch / skills not registered.

- [ ] **Step 3: Implement**

Change signatures as above. In `bootstrap`: after the tools pass, compute skill configs with `resolveSkillConfig`, run `registerSkills`, merge its `degraded` into the unified list, and combine tool and skill registrations for `dispose`. Import `skills` from the barrel in `src/plugin.ts` and pass it through `createLifecycle(ctx, tools, skills, ctx.options)`. (The `DegradedItem`/logging change landed in Task 6.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/unit/bootstrap.test.ts tests/unit/reload.test.ts tests/unit/command-kit.test.ts && bun run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/plugin.ts tests/unit/bootstrap.test.ts tests/unit/reload.test.ts
git commit -m "feat: wire skills into bootstrap and lifecycle"
```

---

### Task 8: `list` shows tools and skills (CLI + `/kit`)

**Files:**
- Modify: `src/cli/commands/list.ts`
- Modify: `src/commands/kit.ts`
- Test: `tests/unit/cli-list.test.ts`, `tests/unit/command-kit.test.ts`

**Interfaces:**
- Consumes: `skills` barrel (Task 3), `resolveSkillConfig` (Task 4), `skillDescription` (Task 2).
- Produces: no new exports; `listCommand` output format changes.

- [ ] **Step 1: Write the failing test**

```ts
// append to tests/unit/cli-list.test.ts
test("list prints a tools section and a skills section", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  let out = ""
  const code = await runCli(["list"], { cwd: home, home, stdout: (s) => { out += s }, stderr: () => {} })
  expect(code).toBe(0)
  expect(out).toContain("tools:")
  expect(out).toContain("skills:")
  expect(out).toMatch(/english-writing-assistant\s+enabled/)
  expect(out).toMatch(/sdd-flow\s+enabled/)
})
```

```ts
// append to tests/unit/command-kit.test.ts
test("`kit list` includes skills", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  let out = ""
  const { ctx, calls } = createFakeContext()
  await registerKitCommand(ctx, { home, cwd: home, reload: async () => {}, stdout: (s) => { out += s } })
  const cmd = (calls.command as any[]).find((c) => c.name === "kit")
  await cmd.execute({ arguments: "list", sessionID: "s" })
  expect(out).toContain("skills:")
  expect(out).toContain("sdd-flow")
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/unit/cli-list.test.ts tests/unit/command-kit.test.ts`
Expected: FAIL — no `skills:` section.

- [ ] **Step 3: Implement**

In `listCommand`, print `tools:` then each tool line (`${id}\t${enabled?"enabled":"disabled"}\t${description}`), then `skills:` then each skill line (`${skill.id}\t${enabled?"enabled":"disabled"}\t${skillDescription(skill)}`). Mirror the same two sections in the `list` function of `src/commands/kit.ts`. Existing tests (`/hello\s+disabled/`, `includes("hello")`) must still pass.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/unit/cli-list.test.ts tests/unit/command-kit.test.ts tests/unit/cli-config.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cli/commands/list.ts src/commands/kit.ts tests/unit/cli-list.test.ts tests/unit/command-kit.test.ts
git commit -m "feat: list skills alongside tools"
```

---

### Task 9: Category-aware `enable`/`disable` (CLI + `/kit`)

**Files:**
- Modify: `src/cli/commands/toggle.ts`
- Modify: `src/cli/commands/config.ts`
- Modify: `src/commands/kit.ts`
- Test: `tests/unit/cli-config.test.ts`, `tests/unit/command-kit.test.ts`

**Interfaces:**
- Consumes: `setSkillEnabled` (Task 5), `resolveSkillEffective` (Task 4), `skills` barrel (Task 3).
- Produces: no new exports.

- [ ] **Step 1: Write the failing test**

```ts
// append to tests/unit/cli-config.test.ts
function storedSkills(h: string): Record<string, { enabled?: boolean }> {
  const data = parse(readFileSync(globalConfig(h), "utf8")) as { skills?: Record<string, { enabled?: boolean }> }
  return data.skills ?? {}
}

test("enable and disable a skill id write the skills section", async () => {
  const h = home()
  expect(await runCli(["disable", "sdd-flow"], io(h).io)).toBe(0)
  expect(storedSkills(h)["sdd-flow"]?.enabled).toBe(false)
  expect(await runCli(["enable", "sdd-flow"], io(h).io)).toBe(0)
  expect(storedSkills(h)["sdd-flow"]?.enabled).toBe(true)
})

test("config on a skill id fails and does not write", async () => {
  const h = home()
  const { io: streams, err } = io(h)
  const code = await runCli(["config", "set", "sdd-flow", "x", "1"], streams)
  expect(code).not.toBe(0)
  expect(err()).toContain("sdd-flow")
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/unit/cli-config.test.ts`
Expected: FAIL — `sdd-flow` reported as unknown tool.

- [ ] **Step 3: Implement**

In `toggleCommand`, resolve the id against `tools` first, then `skills`. For a tool, keep `setToolEnabled` + `resolveEffective`; for a skill, `setSkillEnabled` + `resolveSkillEffective` (same advisory warning). Mirror in `src/commands/kit.ts` `toggle`. In `configCommand` (and `/kit config`), when the id matches a skill, report `opencode-kit: skills have no settings: "<id>"` and return non-zero. Unknown ids keep the existing message.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/unit/cli-config.test.ts tests/unit/command-kit.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cli/commands/toggle.ts src/cli/commands/config.ts src/commands/kit.ts tests/unit/cli-config.test.ts tests/unit/command-kit.test.ts
git commit -m "feat: enable and disable skills from the CLI and /kit"
```

---

### Task 10: `init` seeds skills

**Files:**
- Modify: `src/cli/commands/init.ts`
- Test: `tests/unit/cli-init.test.ts`

**Interfaces:**
- Consumes: `seedSkills` (Task 5), `skills` barrel (Task 3).
- Produces: no new exports.

- [ ] **Step 1: Write the failing test**

```ts
// append to tests/unit/cli-init.test.ts
test("init seeds every skill with its declared default", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const io = { cwd: home, home, stdout: () => {}, stderr: () => {} }
  await initCommand(io, {})
  const cfg = JSON.parse(readFileSync(globalConfigPath(home), "utf8"))
  expect(cfg.skills["english-writing-assistant"].enabled).toBe(true)
  expect(cfg.skills["sdd-flow"].enabled).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/unit/cli-init.test.ts`
Expected: FAIL — `cfg.skills` is undefined.

- [ ] **Step 3: Implement**

In `initCommand`, build `skillSeeds: Record<string, SkillConfigEntry>` from the barrel (`{ enabled: skill.defaultEnabled ?? true }`) and `await seedSkills(configPath, skillSeeds)` after `seedTools`. Keep idempotence.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/unit/cli-init.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cli/commands/init.ts tests/unit/cli-init.test.ts
git commit -m "feat: seed skills from init"
```

---

### Task 11: `doctor` checks skills

**Files:**
- Modify: `src/cli/commands/doctor.ts`
- Test: `tests/unit/cli-doctor.test.ts`

**Interfaces:**
- Consumes: `loadSkill`, `KitSkill` (Task 2), `skills` barrel (Task 3).
- Produces: `doctorCommand(io, skills = shippedSkills): Promise<number>` (skills injectable for tests).

- [ ] **Step 1: Write the failing test**

```ts
// append to tests/unit/cli-doctor.test.ts
import { pathToFileURL } from "node:url"
import { defineSkill } from "../../src/core/skill"

test("doctor reports skills: ok for a loadable skill", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const dir = mkdtempSync(join(tmpdir(), "skill-"))
  writeFileSync(join(dir, "SKILL.md"), "---\nname: S\n---\nbody")
  const h = io(home)
  const code = await doctorCommand(h.io, [defineSkill({ id: "s", dir: pathToFileURL(`${dir}/`) })])
  expect(code).toBe(0)
  expect(h.out()).toContain("skills: ok")
})

test("doctor fails and names a skill whose SKILL.md is missing", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const h = io(home)
  const code = await doctorCommand(h.io, [defineSkill({ id: "broken", dir: new URL("file:///no-such-dir/") })])
  expect(code).not.toBe(0)
  expect(h.out()).toContain("skill: error broken")
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/unit/cli-doctor.test.ts`
Expected: FAIL — no skill checks.

- [ ] **Step 3: Implement**

Import the barrel as `shippedSkills`. Give `doctorCommand` a second parameter `skills: KitSkill[] = shippedSkills`. After the tools loop, `loadSkill` each skill: on success count it, on throw print `skill: error <id> <message>` and set an error flag. Print `skills: ok` when none errored. Return non-zero if there were config errors, skill errors, or (new) skill load failures. Existing doctor tests must still pass.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/unit/cli-doctor.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cli/commands/doctor.ts tests/unit/cli-doctor.test.ts
git commit -m "feat: doctor validates shipped skills"
```

---

### Task 12: `new-skill` scaffolder

**Files:**
- Modify: `src/cli/scaffold.ts`
- Create: `src/cli/commands/new-skill.ts`
- Modify: `src/cli/index.ts`
- Test: `tests/unit/cli-new-skill.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  ```ts
  export async function scaffoldSkill(root: string, skillId: string): Promise<{ dir: string }>
  ```

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/cli-new-skill.test.ts
import { expect, test } from "bun:test"
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { scaffoldSkill } from "../../src/cli/scaffold"
import { runCli } from "../../src/cli/index"

function fixture(): { root: string; barrelPath: string; barrel: string } {
  const root = mkdtempSync(join(tmpdir(), "kit-"))
  mkdirSync(join(root, "src", "skills"), { recursive: true })
  const barrelPath = join(root, "src", "skills", "index.ts")
  const barrel = `import { defineSkill } from "../core/skill"\nexport const skills = [\n  // <kit:skills>\n  // </kit:skills>\n]\n`
  writeFileSync(barrelPath, barrel)
  return { root, barrelPath, barrel }
}

test("scaffolds a skill dir and inserts a barrel entry between the markers", async () => {
  const { root, barrelPath } = fixture()
  await scaffoldSkill(root, "my-skill")
  expect(existsSync(join(root, "src", "skills", "my-skill", "SKILL.md"))).toBe(true)
  const barrel = readFileSync(barrelPath, "utf8")
  const open = barrel.indexOf("// <kit:skills>")
  const entry = barrel.indexOf('id: "my-skill"')
  const close = barrel.indexOf("// </kit:skills>")
  expect(open).toBeGreaterThanOrEqual(0)
  expect(entry).toBeGreaterThan(open)
  expect(entry).toBeLessThan(close)
})

test("generated SKILL.md has frontmatter", async () => {
  const { root } = fixture()
  await scaffoldSkill(root, "my-skill")
  const md = readFileSync(join(root, "src", "skills", "my-skill", "SKILL.md"), "utf8")
  expect(md.startsWith("---")).toBe(true)
  expect(md).toContain("name:")
  expect(md).toContain("description:")
})

test("refuses an existing skill and invalid ids without writing", async () => {
  const { root } = fixture()
  mkdirSync(join(root, "src", "skills", "dup"), { recursive: true })
  await expect(scaffoldSkill(root, "dup")).rejects.toThrow()
  for (const bad of ["../evil", "123bad", "foo/bar", "Upper"]) {
    const f = fixture()
    await expect(scaffoldSkill(f.root, bad)).rejects.toThrow()
    expect(readdirSync(join(f.root, "src", "skills"))).toEqual(["index.ts"])
  }
})

test("runCli dispatches new-skill", async () => {
  const { root } = fixture()
  const io = { cwd: root, home: root, stdout: () => {}, stderr: () => {} }
  expect(await runCli(["new-skill", "cli-skill"], io)).toBe(0)
  expect(existsSync(join(root, "src", "skills", "cli-skill", "SKILL.md"))).toBe(true)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/unit/cli-new-skill.test.ts`
Expected: FAIL — `scaffoldSkill` missing; `new-skill` unknown command.

- [ ] **Step 3: Implement**

In `src/cli/scaffold.ts` add `SKILL_OPEN_MARKER`/`SKILL_CLOSE_MARKER` (`// <kit:skills>` / `// </kit:skills>`), `renderSkill(id)` (frontmatter with a display `name` and a TODO `description`, then a minimal body), and `scaffoldSkill(root, id)` that validates the id with the existing `TOOL_ID_RE`, refuses an existing `src/skills/<id>/`, builds the barrel edit before writing (inserting `\n  defineSkill({ id: "<id>", dir: new URL("./<id>/", import.meta.url) }),` after the open marker and requiring the `skills` export), then writes `SKILL.md` and the barrel. Add `src/cli/commands/new-skill.ts` mirroring `new.ts` and dispatch `new-skill` in `src/cli/index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/unit/cli-new-skill.test.ts tests/unit/cli-new.test.ts && bun run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cli/scaffold.ts src/cli/commands/new-skill.ts src/cli/index.ts tests/unit/cli-new-skill.test.ts
git commit -m "feat: add new-skill scaffolder"
```

---

### Task 13: Documentation, integration test, and full gate

**Files:**
- Modify: `README.md`, `.opencode/INSTALL.md`, `docs/examples/opencode-kit.jsonc`, `AGENTS.md`, `CHANGELOG.md`, `package.json`
- Test: `tests/integration/plugin-loads.test.ts`

**Interfaces:**
- Consumes: everything above.
- Produces: docs and an integration assertion.

- [ ] **Step 1: Write the failing integration test**

```ts
// append to tests/integration/plugin-loads.test.ts
import { skills } from "../../src/skills/index"
import { loadSkill } from "../../src/core/skill"

test("the kit ships the english-writing-assistant and sdd-flow skills", () => {
  const sdd = skills.find((s) => s.id === "sdd-flow")!
  expect(loadSkill(sdd).autoinvoke).toBe(false)
  expect(skills.map((s) => s.id)).toContain("english-writing-assistant")
})
```

- [ ] **Step 2: Run test to verify it passes** (implementation already exists)

Run: `bun test tests/integration/plugin-loads.test.ts`
Expected: PASS.

- [ ] **Step 3: Update the documentation**

- `README.md`: tagline → "tools and skills"; add a **Skills** section (what a skill is, `skills.<id>.enabled`, the two bundled skills, `@sdd-flow` invocation and its external-skill caveat, how to disable one); add `new-skill` to the CLI table; add an "Adding a skill" subsection.
- `.opencode/INSTALL.md`: note that bundled skills ship enabled and how to disable one.
- `docs/examples/opencode-kit.jsonc`: add a `skills` block mirroring the tools block.
- `AGENTS.md`: update the shipped-tools description/layout to mention `skills`, and add a skill counterpart to "Adding a tool".
- `CHANGELOG.md`: note the new skills category and the two bundled skills.
- `package.json`: add `"skills"` to `keywords`.

- [ ] **Step 4: Run the full gate**

Run: `bun run typecheck && bun test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add README.md .opencode/INSTALL.md docs/examples/opencode-kit.jsonc AGENTS.md CHANGELOG.md package.json tests/integration/plugin-loads.test.ts
git commit -m "docs: document the skills category"
```
