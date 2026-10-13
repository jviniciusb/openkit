# opencode-kit — Skill Kit Gap Pass Design Spec

- **Date:** 2026-10-13
- **Status:** Implemented (pending release)
- **Author:** (agent-assisted)
- **Topic:** The final gap pass across all four batches: dedupe overlaps, clear
  deferred minors repo-wide, resolve open decisions.
- **Base:** `main` @ v0.12.0 (`db38645`), branch `feat/skill-kit-gaps`.
- **Note:** Single spec carrying the implementation steps (no separate plan file).
  The authoritative list is `docs/superpowers/skill-kit-gaps.md`.

## 1. Summary

Batches 1-4 shipped twenty-one self-contained skills. This pass closes the gaps
tracked across those batches, with no new skills:

1. **Dedupe overlaps** between the derived skills and `sdd-flow` / the rubric.
2. **Clear deferred minors** repo-wide (test guards, provenance placeholders,
   wording).
3. **Resolve the open decision** (`interview` stays model-visible).

## 2. Context and intent

- **Audience:** the author and users of opencode-kit.
- **Posture:** consistency and correctness of the shipped kit; no behavior change
  to any skill's contract.
- **Rename/ids:** none; all ids stay as shipped.

## 3. Facts and constraints

- `sdd-flow` is `autoinvoke: false` and composes `interview`, `research`,
  `code-review` by id; it currently inlines the seam vocabulary (§1.3) and
  describes workspace setup (Phase 2) and parallel tracks inline.
- `skill-recipe/rubric.md` holds skill-specific authoring rules;
  `writing-for-agents` is the general authoring skill.
- `improve-codebase-architecture` is a workflow layer over `codebase-design`.
- Several batch-1 provenance comments still use the literal placeholder
  `skill-sources/<name>/LICENSE` instead of real snapshot names.
- Many skill tests carry a vacuous `expect(description).not.toContain(">-")`
  guard (the frontmatter reader resolves folded scalars, so it can never fail).
- `generated.json` is hash-based; any edit to a generated `SKILL.md` must
  re-record its `outputHash`.

## 4. Decisions

1. **`sdd-flow` references shipped skills** instead of duplicating their content:
   `codebase-design` (seams), `using-git-worktrees` (workspace), and
   `dispatching-parallel-agents` (fan-out); `to-spec` is named as an option for
   drafting the initial spec. `sdd-flow` keeps its own phases, frontier gate, and
   single-artifact spec.
2. **`skill-recipe/rubric.md` cross-references `writing-for-agents`** for general
   authoring depth; it keeps the skill-specific rules.
3. **`improve-codebase-architecture` cross-references `codebase-design`** for the
   vocabulary.
4. **`interview` stays model-visible** (open decision resolved).
5. **No new skills, no framework code.**
6. **One PR**, one release (v0.13.0).

## 5. Gaps to close

### 5.1 Dedupe
- `src/skills/sdd-flow/SKILL.md`: KEEP the gates ("one round then move on"; "no
  test at an unconfirmed seam"; the frontier gate) and replace only the duplicated
  vocabulary/mechanics — reference `codebase-design` for the seam vocabulary
  (§1.3), reference `using-git-worktrees` for workspace setup (Phase 2; a naming
  reference, since it currently inlines little), reference
  `dispatching-parallel-agents` for fan-out mechanics, and optionally name
  `to-spec` for drafting the initial spec.
- `src/skills/skill-recipe/rubric.md`: add a cross-reference to
  `writing-for-agents` (general authoring depth).
- `src/skills/improve-codebase-architecture/SKILL.md`: add a cross-reference to
  `codebase-design` (vocabulary).
- Verify and mark resolved in the tracker: `diagnosing-sessions` vs
  `diagnosing-bugs` stay distinct (session forensics vs code-bug root-causing);
  `router` points at `@skill-recipe`.

### 5.2 Deferred minors
- Remove the vacuous `expect(description).not.toContain(">-")` guard from every
  test that carries it (about 20 occurrences, including `skill-recipe.test.ts`
  and `skills-barrel.test.ts`), keeping all real assertions.
- Add a `router` test that extracts the `@id` tokens from the skill-list lines
  (e.g. match `` /^- `@([a-z0-9-]+)`/gm ``), NOT a body-wide `/@.../` scan — the
  provenance comment's `mattpocock/skills@24fe0ef...` and the `@id` syntax
  placeholder must not be captured — and assert each exists in
  `src/skills/index.ts`.
- Tighten `src/skills/verification/SKILL.md` wording: "Run the whole command
  **that proves the claim**" so it cannot read as a blanket mandate.
- Substitute the real snapshot names in the batch-1 provenance comments of
  `src/skills/code-review/SKILL.md`, `src/skills/sdd-flow/SKILL.md`, and
  `src/skills/interview/SKILL.md` (replace `skill-sources/<name>/LICENSE`).
- `generated.json` `generatedAt` hand-set values: accepted as-is (documented in
  the tracker).

### 5.3 Open decision
- Record `interview` = model-visible as resolved in the tracker.

## 6. Implementation steps

> Executed inline. Workstreams A and B touch disjoint files and run in parallel;
> C depends on A.

### Task 1 (Workstream A): skill content + hashes
- [x] `sdd-flow`: dedupe per §5.1 + provenance fix per §5.2.
- [x] `code-review`, `interview`: provenance fix per §5.2.
- [x] `skill-recipe/rubric.md` + `improve-codebase-architecture`: cross-refs.
- [x] `verification`: wording per §5.2.
- [x] Re-record the `outputHash` for every edited generated `SKILL.md` in
      `skill-sources/generated.json` (there is no record command — compute
      `sha256sum` of the raw bytes and write it); `bun scripts/skill-source.ts
      check` clean.

### Task 2 (Workstream B): test cleanup
- [x] Remove the vacuous `>-` guards from all skill tests.
- [x] Add the `router` `@id` cross-check test.
- [x] `bun test` green.

### Task 3 (Workstream C): docs + tracker
- [x] Update `docs/superpowers/skill-kit-gaps.md`: mark the dedupe + deferred
      minors resolved, record the `interview` decision (Batch 4 is already marked
      released).
- [x] Update `AGENTS.md` / `README.md` if `sdd-flow`'s description changes.
- [x] `CHANGELOG.md` entry.

### Task 4: Final gate + whole-branch review
- [x] `bun run typecheck && bun test`; `bun scripts/skill-source.ts check` clean.
- [x] Whole-branch review; fix; re-review.
- [ ] Commit, push, PR, merge, release (v0.13.0).

## 7. Success criteria

- No skill duplicates another's content; `sdd-flow` references the shipped skills.
- The deferred minors are cleared; no vacuous `>-` guard remains.
- The tracker reflects every gap as resolved or explicitly accepted.
- `bun run typecheck && bun test` pass; `check` clean.
- One PR merged and v0.13.0 released.

## 8. Review Focus

1. **`sdd-flow` must still be self-contained and coherent** after replacing
   inline content with references — no dangling reference, no lost gate.
2. **Provenance comments must name real snapshot paths**, and every edited
   `SKILL.md` hash must be re-recorded (`check` clean).
3. **Removing the `>-` guards must not remove any real assertion**; the remaining
   tests must still cover frontmatter, self-containment, and provenance.
4. **The `router` `@id` test must not false-positive** on the `@id` syntax
   placeholder.
