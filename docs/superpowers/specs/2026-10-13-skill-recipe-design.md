# opencode-kit — Skill Recipe Design Spec

- **Date:** 2026-10-13
- **Status:** Draft for review
- **Author:** (agent-assisted)
- **Topic:** A repeatable "skill recipe" that derives self-contained `opencode-kit`
  skills from external agent-skill kits, plus its first output: an `interview`
  (alignment) skill.
- **Base:** `main` (category framework — tools / skills / references — merged in
  PR #23, v0.6.0).
- **Note:** By decision, this is a **single spec that also carries the
  implementation steps** (see §13). There is intentionally **no separate plan
  file**; §13 is the plan.

## 1. Summary

`opencode-kit` ships skills curated from any source, and the author wants to build
its skill set by **deriving** from two external kits — `obra/superpowers` and
`mattpocock/skills` — rather than hand-writing from scratch, with a pipeline that
can be re-run when upstream improves.

Two layers:

1. **Sourcing / tracking** — deterministic, dev-only tooling that vendors and pins
   upstream skills at exact commits and detects drift. Not shipped.
2. **Synthesis** — a shipped authoring skill (`skill-recipe`) plus a rubric that
   turns a brief + sources into a self-contained `SKILL.md`, with provenance and a
   no-silent-clobber review gate.

The first end-to-end output is the **`interview`** skill, synthesized from
superpowers `brainstorming` + pocock `grilling`.

## 2. Context and intent

- **Audience:** the kit's author and its users. The shipped artifact is the
  authoring skill + the derived skills; the sourcing tooling is the author's.
- **Posture:** framework-first — skills are first-class (`src/skills/`), but the
  recipe itself is a normal skill, not new framework machinery.
- **Why a recipe:** upstream kits evolve; hand-merging their ideas into our skills
  does not scale and loses provenance. A pinned snapshot + a written rubric makes
  re-derivation repeatable and reviewable.

## 3. Constraints and facts

- `main` already has the category framework: `src/core/category.ts`,
  `src/catalog.ts`, `src/categories/` (`tool`, `skill`, `reference`),
  `src/operations/`, `src/core/skill.ts`, `src/skills/index.ts`.
- **No build step.** Bun transpiles the TS source at load; `src` is the artifact.
- **Published package allowlist** — `package.json` `files` is
  `["src","bin","index.js",".opencode","opencode-kit.schema.json","README.md","LICENSE"]`.
  Repo-root `scripts/`, `skill-sources/`, `docs/`, and `tests/` are **not
  shipped**. Dev-only tooling therefore lives under `scripts/`.
- `tsconfig.json` `include` is `["src","tests"]`; dev-only `scripts/` must be
  added to be typechecked.
- **Licenses:** both upstream kits are **MIT** — superpowers © 2025 Jesse Vincent;
  mattpocock/skills © 2026 Matt Pocock. Derivation is permitted; retain the
  copyright + license notice and record provenance. Upstream text is **never**
  published in the package.
- Skills are declarative: a `src/skills/<id>/SKILL.md` directory + one barrel
  line. `defineSkill` defaults `defaultEnabled` to `true`; `autoinvoke: false`
  hides a skill from the model's advertised list while keeping it loadable by id.
- Existing skills: `english-writing-assistant` (model-visible) and `sdd-flow`
  (`autoinvoke: false`, `@sdd-flow`).

## 4. Resolved decisions

1. **Deliverable:** skills shipped inside `opencode-kit`'s `src/skills/` category.
2. **Dependency model:** hybrid recipe — deterministic sourcing tooling + a
   judgment-driven authoring skill; outputs are self-contained (no external kit
   references embedded in shipped skills).
3. **Sequence:** recipe first, validated by piloting one skill end-to-end.
4. **Sourcing:** vendored snapshots + a manifest, committed to the repo, offline.
5. **Pilot:** `interview`, from superpowers `brainstorming` + pocock `grilling`.
6. **Generation model:** per-skill brief + generic recipe.
7. **Names:** the dev script is `scripts/skill-source.ts`; its `add|update|list|check`
   are **script subcommands, not new `opencode-kit` CLI subcommands**. The shipped
   authoring skill is `skill-recipe`; the pilot skill is `interview`.
8. **Audience:** ship **`skill-recipe` as a general authoring skill** that works
   on any sources the user points it at. The `source` tooling and pinned
   `skill-sources/` are **dev-only** (not shipped).
9. **Documentation:** one spec with the implementation steps; no separate plan.
10. **`interview` invocation:** **model-visible** with a tightly-scoped trigger
    (aligning on design/requirements before implementation). It contains its own
    stop gate, so auto-invocation cannot cause implementation. Flip to
    `autoinvoke: false` if it over-fires.

## 5. Architecture

### 5.1 Component: shipped authoring skill — `skill-recipe`

A normal declarative skill that instructs an agent to synthesize a kit-style
skill from (a) a **brief** and (b) one or more **source** locations.

- Shipped model-visible? No — registered `autoinvoke: false`, invoked as
  `@skill-recipe`. It acts only when the author wants to derive a skill.
- It is **general**: sources may be any local path or repo the invoker has. It
  has no dependency on `skill-sources/`.
- Inputs (from the brief): target id, trigger, intent, source paths, keep/drop
  guidance, desired structure.
- Behavior: read brief + sources + `rubric.md`; synthesize a self-contained
  `SKILL.md`; show the draft/diff; never overwrite a hand-edited file without
  confirmation; add the barrel entry.
- Output: a `src/skills/<id>/SKILL.md` plus a provenance block.

Support files shipped beside it:

- `rubric.md` — §6, the house style and taste constraints.
- `brief-template.md` — a starting brief for a new target.

### 5.2 Component: dev-only sourcing tooling

A repo-root script (not shipped), run with Bun:

```text
scripts/skill-source.ts        # CLI + exported functions
skill-sources/
  sources.json                 # hand-edited intent + resolved pins
  generated.json               # target -> provenance + output hash
  briefs/<target-id>.md        # per-skill briefs
  <name>/LICENSE               # upstream license retained verbatim
  <name>/<upstream-path>/...   # snapshots mirrored at upstream paths
```

Commands (dispatched on `argv[2]` when run as a script):

- `add <name> <git-url> --ref <ref> --include <path> [--include ...]` — clone to a
  temp dir at the ref, copy the included paths (+ `LICENSE` if present) into
  `skill-sources/<name>/`, and upsert `sources.json`.
- `update [<name>] [--ref <ref>]` — re-fetch, refresh snapshots and pins, and
  print an added/changed/removed diff summary. Never touches generated skills.
- `list` — name, ref, commit, license, includes.
- `check` — compare each generated target's recorded output hash with the file on
  disk; report `clean`, `missing`, or `edited (regenerate/review)`.

`sources.json` entry shape:

```ts
interface SourcePin {
  name: string
  repository: string
  ref: string          // hand-edited intent (tag/branch/commit)
  commit: string       // resolved
  license?: string     // SPDX id: "MIT" when the upstream LICENSE matches MIT, else undefined
  retrievedAt: string
  include: string[]    // upstream-relative paths
}
```

`generated.json` entry shape:

```ts
interface GeneratedRecord {
  brief: string
  sources: Array<{ name: string; path: string; commit: string }>
  output: string       // repo-relative path to the generated SKILL.md
  outputHash: string
  generatedAt: string
}
```

Exported functions (importable by tests; no network for `check`/`list`):

```ts
addSource(root: string, spec: SourceSpec): Promise<SourcePin>
updateSource(root: string, name?: string, ref?: string): Promise<SourceDiff>
listSources(root: string): SourcePin[]
checkGenerated(root: string): GeneratedStatus[]
```

### 5.3 Generated skill format and provenance

- Standard `src/skills/<id>/SKILL.md` with `name`/`description` frontmatter and a
  self-contained body (no `superpowers:*` / `mattpocock-skills:*` references).
- A provenance HTML comment at the **end** of the body (ignored by the
  frontmatter reader, human-visible):

  ```html
  <!-- generated by skill-recipe
       from: obra/superpowers@<commit> skills/brainstorming/SKILL.md
             mattpocock/skills@<commit> skills/productivity/grilling/SKILL.md
       license: MIT (dev-only snapshot: skill-sources/<name>/LICENSE in the repo) -->
  ```

- `generated.json` records the target -> sources + output hash.
- Upstream licenses retained under `skill-sources/<name>/LICENSE`; a short
  attribution note in the repo (README or a `skill-sources/README.md`).

### 5.4 Re-generation safety

1. `bun scripts/skill-source.ts update` refreshes snapshots + pins and prints the
   upstream diff.
2. `@skill-recipe <brief>` re-synthesizes; the agent shows a diff.
3. `bun scripts/skill-source.ts check` reports a file whose hash no longer matches
   its `generated.json` record as `edited`.
4. The agent must stop and ask before overwriting an `edited` file.
5. No silent clobber, no auto-commit.

## 6. The rubric (house style + taste)

`src/skills/skill-recipe/rubric.md` encodes:

- **Description discipline:** `description` states only *when* to use the skill
  (triggers), never the workflow.
- **Structure:** Overview / core principle, When to Use, Process, Gates,
  Anti-patterns. Keep it lean; scale the artifact to the task.
- **Context engineering:** context pointers over restatement; progressive
  disclosure (in-file step -> in-file reference -> `references/`); leading words;
  positive phrasing; no em-dashes.
- **Taste constraints (explicit non-goals):** no TDD red-green-refactor ceremony,
  no separate plan file, no glossary/ADR requirement, no mandatory issue tracker,
  no enforced multi-skill chains.
- **Required behaviors:** the spec (or brief) is the contract; subagent-per-task
  with an independent reviewer; parallel execution where tasks are independent;
  human gates at consequential seams.
- **Provenance block format** (§5.3).

## 7. Pilot: `interview`

- **Sources:** `skill-sources/superpowers/skills/brainstorming/SKILL.md`;
  `skill-sources/mattpocock-skills/skills/productivity/grilling/SKILL.md`
  (with `skills/productivity/grill-me/SKILL.md` and
  `skills/engineering/grill-with-docs/SKILL.md` vendored as reference).
- **Keep:** superpowers' spike / bounded / architectural classification and its
  hard gate (no implementation before approval); pocock's rounds / frontier /
  recommended-answer mechanics and research-mid-round.
- **Drop:** glossary/ADR, enforced chains, the TDD/plan machinery.
- **Self-contained:** the output references no external kit.
- **Invocation:** model-visible (§4.10).
- **Output:** `src/skills/interview/SKILL.md` + barrel entry + provenance.

## 8. Testing

- **Dev tooling** (`tests/unit/skill-source.test.ts`): against a **local temp git
  repo fixture** (offline, deterministic) — `add` snapshots the included paths and
  writes pins; `update` refreshes and reports added/changed/removed; `list`
  round-trips; `check` reports `clean` / `edited` after a simulated edit; manifest
  parse/round-trip.
- **`skill-recipe`** (`tests/unit/skill-recipe.test.ts`): frontmatter parses;
  id/autoinvoke correct; `rubric.md` and `brief-template.md` exist and are
  non-empty.
- **Barrel/integration:** `tests/unit/skills-barrel.test.ts` and
  `tests/integration/plugin-loads.test.ts` include `skill-recipe` and `interview`
  with expected ids / `path` / `autoinvoke`.
- **Pilot content** (`tests/unit/interview.test.ts`): frontmatter parses; the body
  contains no **external skill invocation references** (no `superpowers:` or
  `mattpocock-skills:` prefixes). The provenance HTML comment is allowed — it names
  the upstream repos by design — and must be present.
- Gate: `bun run typecheck && bun test`.

## 9. Docs

- `README.md`: the **Skill recipe** note (`@skill-recipe`, arbitrary sources,
  dev-only `skill-sources/`); update every "two skills" count/table/config example
  to include `skill-recipe` and `interview`.
- `.opencode/INSTALL.md`: update the skill list/count so it matches `src/`
  (it currently enumerates exactly two skills).
- `AGENTS.md`: "Adding a skill" mentions the recipe as an authoring aid; update
  the "Two skills ship today" enumeration.
- `docs/examples/opencode-kit.jsonc`: add `skill-recipe` and `interview` entries.
- `CHANGELOG.md`: note the authoring skill and the `interview` skill.
- `skill-sources/README.md`: what the vendored sources are, their licenses, and
  that the directory is dev-only.

## 10. Non-goals and compatibility

- No runtime network access.
- No upstream text is published in the package.
- Only the one pilot skill now; the full set is later work.
- No changes to the category framework or the existing skills.
- Not a general document/YAML generator.
- Existing configs remain valid (purely additive: new skills + dev-only files).

## 11. Success criteria

- `bun scripts/skill-source.ts add/update/list/check` work offline after an
  initial fetch, driven by local fixtures in tests.
- `@skill-recipe` can take a brief + arbitrary sources and produce a self-contained
  kit-style `SKILL.md`.
- The generated `interview` skill has provenance and no external skill invocation
  references (the provenance comment is allowed).
- Re-running after a simulated upstream change yields a reviewable diff, and an
  edited file is reported `edited` rather than overwritten.
- `bun run typecheck && bun test` pass.

## 12. Review Focus

The spec is a vision document; these are the inputs/conditions it implies but no
step fully pins, most likely to bite:

1. **An upstream path that no longer exists at a new ref** (`--include`
   vanishes after `update`) — must fail loudly, not silently snapshot nothing.
2. **A missing upstream `LICENSE`** at the chosen ref — `add` must still succeed
   but record `license: undefined` and warn.
3. **A hand-edited generated skill** — `check` and the recipe must not overwrite
   it; this is the core safety property.
4. **A brief that names an unknown source id** — the recipe must refuse to
   synthesize rather than invent content. (An LLM-behavior requirement: pinned as
   mandatory instruction text in the `skill-recipe` skill, not a unit test.)
5. **Non-ASCII / CRLF in vendored upstream files** — snapshots and frontmatter
   reads must be byte-faithful and parse.

Items 1-3 and 5 are pinned by a test in the task that owns the code (§13); item 4
is pinned as required instruction text in Task 4.

## 13. Implementation Steps

> Executed inline from this spec (no separate plan). Steps use `- [ ]` for
> tracking. Each task ends with a verifiable result.

### Task 1: Dev-only source manifest + `add`

**Files:** Create `scripts/skill-source.ts`, `tests/unit/skill-source.test.ts`;
Modify `tsconfig.json`.

**Interfaces:**
- Produces: `SourceSpec`, `SourcePin`, `readManifest(root)`, `writeManifest(root, pins)`, `addSource(root, spec)`.

- [ ] **Step 1: Write the failing test** — create a temp git repo fixture (a bare
  origin is unnecessary; a local repo with one commit works), then assert
  `addSource` copies `--include` paths into `skill-sources/<name>/`, copies
  `LICENSE`, and records `repository`, `ref`, resolved `commit`, `license`,
  `retrievedAt`, `include` in `sources.json`. Include the Review Focus 2 case
  (no LICENSE -> `license` undefined, no throw) and 5 (a CRLF file is copied
  byte-faithfully).
- [ ] **Step 2: Run it and confirm it fails** — `bun test tests/unit/skill-source.test.ts`.
- [ ] **Step 3: Implement** `scripts/skill-source.ts` — types, manifest read/write,
  `git clone` into a temp dir (Bun `$`), copy includes, resolve `commit`
  (`git rev-parse HEAD`), derive the SPDX id from `LICENSE` (`"MIT"` when the text
  matches MIT, else undefined), and an `argv` dispatch stub. `--include` accepts a
  file or a directory; a directory is copied recursively.
- [ ] **Step 4: Add `"scripts"` to `tsconfig.json` `include`.**
- [ ] **Step 5: Run tests** — `bun test tests/unit/skill-source.test.ts` passes;
  `bun run typecheck` passes.

### Task 2: `update` + `list` + diff

**Files:** Modify `scripts/skill-source.ts`, `tests/unit/skill-source.test.ts`.

**Interfaces:**
- Consumes: Task 1 manifest functions.
- Produces: `updateSource(root, name?, ref?)`, `listSources(root)`, `SourceDiff = { added, changed, removed }`.

- [ ] **Step 1: Write the failing test** — commit a new/changed/removed file to the
  fixture upstream, run `updateSource`, and assert the snapshot refreshes, the pin
  `commit` advances, and the returned diff lists the change. Include Review Focus
  1 (an `--include` path missing at the new ref throws).
- [ ] **Step 2: Confirm it fails.**
- [ ] **Step 3: Implement** `updateSource` (re-clone at the new ref, replace the
  snapshot dir, re-pin) and `listSources`; render the three-part diff summary on
  the CLI path.
- [ ] **Step 4: Run tests** — pass; `bun run typecheck` passes.

### Task 3: `check` + generated provenance

**Files:** Modify `scripts/skill-source.ts`, `tests/unit/skill-source.test.ts`.

**Interfaces:**
- Produces: `GeneratedRecord`, `readGenerated(root)`, `writeGenerated(root, records)`, `checkGenerated(root)` -> `GeneratedStatus[]` (`clean | missing | edited`).

- [ ] **Step 1: Write the failing test** — write a `generated.json` record with a
  hash for an on-disk file; assert `clean`; edit the file and assert `edited`;
  remove it and assert `missing`. (Review Focus 3.)
- [ ] **Step 2: Confirm it fails.**
- [ ] **Step 3: Implement** SHA-256 hashing (Bun `crypto`), record read/write, and
  `checkGenerated`.
- [ ] **Step 4: Run tests** — pass; `bun run typecheck` passes.

### Task 4: Shipped `skill-recipe` authoring skill

**Files:** Create `src/skills/skill-recipe/SKILL.md`,
`src/skills/skill-recipe/rubric.md`, `src/skills/skill-recipe/brief-template.md`;
Modify `src/skills/index.ts`; Create `tests/unit/skill-recipe.test.ts`; Modify
`tests/unit/skills-barrel.test.ts`.

**Interfaces:**
- Consumes: `defineSkill`, `KitSkill`.
- Produces: a registered skill id `skill-recipe`, `autoinvoke: false`.

- [ ] **Step 1: Write the failing test** — assert the barrel includes
  `skill-recipe` with `autoinvoke: false`, its `SKILL.md` frontmatter parses, and
  `rubric.md`/`brief-template.md` exist and are non-empty.
- [ ] **Step 2: Confirm it fails.**
- [ ] **Step 3: Write** `SKILL.md` (self-contained instructions: read brief +
  sources + rubric -> draft SKILL.md -> show diff -> never overwrite a hand-edited
  file -> insert barrel entry; refuse an unknown source id — Review Focus 4).
  Write `rubric.md` (§6) and `brief-template.md`.
- [ ] **Step 4: Add the barrel entry** under `<kit:skills>`:
  `defineSkill({ id: "skill-recipe", dir: new URL("./skill-recipe/", import.meta.url), autoinvoke: false })`.
- [ ] **Step 5: Run tests** — pass; `bun run typecheck` passes.

### Task 5: Pilot — vendor sources and generate `interview`

**Files:** Create `skill-sources/sources.json`, `skill-sources/generated.json`,
`skill-sources/superpowers/**`, `skill-sources/mattpocock-skills/**`,
`skill-sources/briefs/interview.md`, `skill-sources/README.md`,
`src/skills/interview/SKILL.md`, `tests/unit/interview.test.ts`; Modify
`src/skills/index.ts`, `tests/unit/skills-barrel.test.ts`,
`tests/integration/plugin-loads.test.ts`.

**Interfaces:**
- Consumes: `addSource` (Task 1), the `skill-recipe` instructions (Task 4).
- Produces: registered skill id `interview`, model-visible.

- [ ] **Step 1: Vendor the sources** — **pin an immutable ref**: resolve each
  repo's newest release tag (or a specific commit) at execution and pass it as
  `--ref`; never a moving branch like `main`. Run
  `bun scripts/skill-source.ts add superpowers https://github.com/obra/superpowers --ref <resolved-tag> --include skills/brainstorming/SKILL.md --include LICENSE`
  and the `mattpocock-skills` add for `skills/productivity/grilling/SKILL.md`,
  `skills/productivity/grill-me/SKILL.md`,
  `skills/engineering/grill-with-docs/SKILL.md`, and `LICENSE`.
- [ ] **Step 2: Write the brief** `skill-sources/briefs/interview.md` (target id,
  trigger, intent, the two+ source paths, keep/drop per §7).
- [ ] **Step 3: Synthesize** — using `@skill-recipe` / the rubric, write
  `src/skills/interview/SKILL.md` (self-contained, provenance block, no external
  references).
- [ ] **Step 4: Register** — add the barrel entry under `<kit:skills>`.
- [ ] **Step 5: Write the test** — `interview` frontmatter parses; body has no
  `superpowers:` / `mattpocock-skills:` prefixes (provenance comment present and
  allowed); integration test sees it registered.
- [ ] **Step 6: Record provenance** — write the `interview` record in
  `generated.json` (output path + hash).
- [ ] **Step 7: Run tests & check** — `bun test` passes; `bun scripts/skill-source.ts check`
  reports `clean`.

### Task 6: Docs

**Files:** Modify `README.md`, `.opencode/INSTALL.md`, `AGENTS.md`,
`docs/examples/opencode-kit.jsonc`, `CHANGELOG.md`.

- [ ] **Step 1:** Add the **Skill recipe** note to `README.md` (`@skill-recipe`,
  arbitrary sources, dev-only `skill-sources/`) and update every "two skills"
  count/table/config example to include `skill-recipe` and `interview`.
- [ ] **Step 2:** Update `.opencode/INSTALL.md`'s skill list/count to match `src/`.
- [ ] **Step 3:** Mention the recipe in `AGENTS.md` "Adding a skill" and update its
  "Two skills ship today" enumeration.
- [ ] **Step 4:** Add `skill-recipe` and `interview` entries to
  `docs/examples/opencode-kit.jsonc`.
- [ ] **Step 5:** Add a `CHANGELOG.md` entry (`skill-recipe` + `interview`).
- [ ] **Step 6:** `bun run typecheck && bun test` pass.

### Task 7: Final verification

- [ ] `bun run typecheck` passes (including `scripts/`).
- [ ] `bun test` passes.
- [ ] `bun scripts/skill-source.ts list` and `check` behave as specified.
- [ ] Manual smoke: `@skill-recipe` on the `interview` brief reproduces a
  self-contained skill (diff reviewed, not auto-applied).
