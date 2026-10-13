# opencode-kit — Skill Kit Expansion Design Spec

- **Date:** 2026-10-13
- **Status:** Draft for review
- **Author:** (agent-assisted)
- **Topic:** Use the `skill-recipe` to derive four more self-contained skills and
  evolve `sdd-flow` into the kit's orchestrating flow.
- **Base:** `main` @ v0.8.0 (`b5a2e4d`), branch `feat/skill-kit`.
- **Note:** Single spec carrying the implementation steps (no separate plan file).

## 1. Summary

The `skill-recipe` pipeline (merged in v0.8.0) derives self-contained kit skills
from pinned upstream sources. This spec uses it to add the four capabilities the
author's workflow still lacks, all self-contained (no `superpowers:*` /
`mattpocock-skills:*` references) and free of the rejected ceremony (no TDD
red-green-refactor, no separate plan file, no glossary/ADR, no mandatory tracker):

1. **`research`** — validate facts from primary sources (feeds interview/design).
2. **`handoff`** — compact a conversation into a portable handoff document.
3. **`code-review`** — independent two-axis review of a change.
4. **`sdd-flow` (evolved)** — the orchestrating flow: spec → workspace →
   execution loop, composing the others.

## 2. Context and intent

- **Audience:** the author and users of opencode-kit.
- **Posture:** each skill is derived with `@skill-recipe` from pinned sources and
  reviewed independently before shipping; the recipe is validated a second time.
- **Order:** research → handoff → code-review → sdd-flow (the orchestrator last,
  because it composes the others).

## 3. Facts and constraints

- Pinned sources already vendored: `superpowers` @ `v7.0.0`
  (`bb92a77741419a4ab5f06e711a283343f1ada0c3`), `mattpocock-skills` @ `v1.3.1`
  (`24fe0ef7737efae15c87225755e9f6f5965e4888`).
- New sources to vendor at the same pins:
  - `superpowers/skills/requesting-code-review/SKILL.md`
  - `superpowers/skills/receiving-code-review/SKILL.md`
  - `superpowers/skills/subagent-driven-development/SKILL.md`
  - `superpowers/skills/executing-plans/SKILL.md`
  - `superpowers/skills/verification-before-completion/SKILL.md`
  - `mattpocock-skills/skills/engineering/research/SKILL.md`
  - `mattpocock-skills/skills/productivity/handoff/SKILL.md`
  - `mattpocock-skills/skills/engineering/code-review/SKILL.md`
  - `mattpocock-skills/skills/engineering/implement-spec/SKILL.md`
  - `mattpocock-skills/skills/engineering/to-tickets/SKILL.md`
  - `mattpocock-skills/skills/engineering/to-spec/SKILL.md`
- Both upstream kits are MIT; LICENSE files are already vendored per source.
- `skill-recipe/rubric.md` is the house style; every derived skill follows it
  (trigger-only `description`, lean structure, no em-dashes, provenance comment).
- The dev tooling (`scripts/skill-source.ts`) and `skill-sources/` stay dev-only.
- `sdd-flow`'s current content (`src/skills/sdd-flow/SKILL.md`) is the starting
  point for the evolved orchestrator; its `spec-template.md`, `step-format.md`,
  and `update-refs.sh` support files may be updated or removed.

## 4. Decisions

1. **Reuse the recipe** for skills 1-3; skill 4 evolves the existing `sdd-flow`
   (no upstream twin) using the same review loop.
2. **Self-contained:** no external skill references in any derived body (the
   provenance comment is the only place a source repo is named).
3. **Invocation:**
   - `research` — model-visible (trigger: cited findings from primary sources).
   - `handoff` — `autoinvoke: false` (`@handoff`), a deliberate action.
   - `code-review` — model-visible (trigger: reviewing a change before merge).
   - `sdd-flow` — `autoinvoke: false` (`@sdd-flow`), unchanged.
4. **No new framework code:** skills are declarative; no tool/category changes.
5. **One PR** for the batch; per-skill review inside the loop; one release
   (v0.9.0) at the end.

## 5. Per-skill briefs

Each brief file follows `src/skills/skill-recipe/brief-template.md`; the
trigger/`description` for each skill comes from §4.3.

### 5.1 `research`
- **Sources:** `mattpocock-skills/skills/engineering/research/SKILL.md`.
- **Keep:** dispatch a background agent; cite primary sources (URLs/files) for
  every claim; return structured findings, not prose opinions; distinguish
  established fact from inference.
- **Drop:** external references; anything tying it to a specific tracker.
- **Output:** `src/skills/research/SKILL.md`.

### 5.2 `handoff`
- **Sources:** `mattpocock-skills/skills/productivity/handoff/SKILL.md`.
- **Keep:** compact the conversation into a portable handoff doc (state, decisions,
  open threads, next action, pointers) another session can resume from.
- **Drop:** external references; ADR/glossary requirements.
- **Output:** `src/skills/handoff/SKILL.md` (+ `autoinvoke: false`).

### 5.3 `code-review`
- **Sources:** `mattpocock-skills/skills/engineering/code-review/SKILL.md`;
  `superpowers/skills/requesting-code-review/SKILL.md`;
  `superpowers/skills/receiving-code-review/SKILL.md`.
- **Keep:** independent review of a diff; two axes (Standards + Spec compliance)
  run in parallel; findings categorized by severity; on the receiving side,
  verify each finding against the code and rule (apply / reject / better fix),
  never apply on the reviewer's say-so.
- **Drop:** external references; mandatory tool-specific dispatch.
- **Output:** `src/skills/code-review/SKILL.md`.

### 5.4 `sdd-flow` (evolved orchestrator)
- **Sources:** `src/skills/sdd-flow/SKILL.md` (current);
  `superpowers/skills/subagent-driven-development/SKILL.md`,
  `.../executing-plans/SKILL.md`, `.../verification-before-completion/SKILL.md`;
  `mattpocock-skills/skills/engineering/to-spec/SKILL.md`,
  `.../to-tickets/SKILL.md`, `.../implement-spec/SKILL.md`.
- **Keep:** explicit invocation; phases Spec → Workspace → Execution loop →
  Wrap-up; the frontier gate (present startable steps, the user picks); the spec
  as the single artifact carrying design + dependency-ordered steps; execution
  findings carried forward; subagent-per-task with an independent reviewer;
  parallel execution for independent tracks; verification with fresh evidence.
- **Compose:** invoke `interview` to align, `research` to settle facts,
  `code-review` to review each step. (The orchestrator is the deliberate
  exception to the rubric's "no enforced multi-skill chains": composition is the
  point here.)
- **Replace the external references (explicit):**
  - `mattpocock-skills:grilling` → `interview`.
  - `mattpocock-skills:research` → `research`.
  - verification (`superpowers:verification-before-completion`) → inline the
    "fresh evidence before claiming done" rule.
  - review → `code-review`.
  - `mattpocock-skills:codebase-design` (Phase 1.3 Seams) → **inline** the seam
    vocabulary (module / interface / seam / adapter / depth; the interface is the
    test surface; one adapter is a hypothetical seam) and keep the phase.
  - `mattpocock-skills:diagnosing-bugs` (Phase 3.5) → **inline** a short
    root-cause bug-diagnosis step (reproduce → isolate → hypothesize → verify the
    fix) and keep the step.
  - bare `domain-modeling` (Phase 1.0) → **drop**; glossary/ADR is rejected.
- **Drop:** all `superpowers:*` / `mattpocock-skills:*` references and any other
  external skill id (prefixed or bare, e.g. `domain-modeling`); TDD
  red-green-refactor; any separate plan file; glossary/ADR; mandatory tracker.
- **Support files (pinned end state):** keep `spec-template.md` and
  `step-format.md` (update them to match the rewritten `SKILL.md`); remove
  `update-refs.sh` (it targets an external `npx skills` install and is unused).
- **Output:** updated `src/skills/sdd-flow/SKILL.md` + `spec-template.md` +
  `step-format.md`; `update-refs.sh` removed.

## 6. Implementation steps

> Executed inline from this spec; per-skill loop = brief → synthesize → register →
> test → review. A reviewer subagent gates each skill before the next.

### Task 1: Vendor the new sources
- [ ] Add the new paths to each source's pin with `add` (it replaces the pin by
      name), passing the FULL include list — the existing includes (superpowers:
      `skills/brainstorming/SKILL.md`; mattpocock:
      `skills/productivity/grilling/SKILL.md`,
      `skills/productivity/grill-me/SKILL.md`,
      `skills/engineering/grill-with-docs/SKILL.md`) PLUS the new §3 paths, and
      `LICENSE`. `update` alone cannot add paths. Confirm `sources.json` lists
      them and `check` is clean.

### Task 2: `research`
- [ ] Write brief `skill-sources/briefs/research.md` (from §5.1).
- [ ] Synthesize `src/skills/research/SKILL.md` via the recipe/rubric; register
      it (model-visible); add `tests/unit/research.test.ts`; update the barrel
      and the exact-equality array in `tests/unit/skills-barrel.test.ts`
      (`tests/integration/plugin-loads.test.ts` uses `toContain`, so it needs no
      change); record `generated.json`.
- [ ] Review (spec compliance + quality); fix findings; re-review.

### Task 3: `handoff`
- [ ] Brief `skill-sources/briefs/handoff.md` (from §5.2).
- [ ] Synthesize + register (`autoinvoke: false`) + tests + docs entries; review;
      fix; re-review.

### Task 4: `code-review`
- [ ] Brief `skill-sources/briefs/code-review.md` (from §5.3).
- [ ] Synthesize + register (model-visible) + tests; review; fix; re-review.

### Task 5: `sdd-flow` (evolved)
- [ ] Update `src/skills/sdd-flow/SKILL.md` and its support files per §5.4;
      update its test; review; fix; re-review.

### Task 6: Docs
- [ ] Update README, `.opencode/INSTALL.md`, `AGENTS.md`,
      `docs/examples/opencode-kit.jsonc`, `CHANGELOG.md` for the new skills.

### Task 7: Final gate + whole-branch review
- [ ] `bun run typecheck && bun test`; `scripts/skill-source.ts check` clean.
- [ ] Any review-driven edit to a generated `SKILL.md` invalidates its
      `generated.json` `outputHash`; re-record it before the final gate.
- [ ] Whole-branch review; fix; re-review.
- [ ] Commit, push, PR, merge, release (v0.9.0).

## 7. Success criteria

- Four new/updated skills ship, each self-contained (no external invocation
  references), each with provenance and a test.
- The recipe is used end-to-end for skills 1-3; the orchestrator composes them.
- `bun run typecheck && bun test` pass; `check` clean; docs match behavior.
- One PR merged and v0.9.0 released.

## 8. Review Focus

Inputs/conditions the spec implies but no step fully pins, most likely to bite:
1. **`research`'s background dispatch** when the harness has no background
   subagent — the skill must degrade to a foreground lookup, not fail.
2. **`handoff` written to a dev-only path** — it must name a portable location,
   not `skill-sources/`.
3. **`code-review` with an empty diff** — must say so, not invent findings.
4. **The orchestrator invoking `interview`/`research`/`code-review` by id** — the
   ids must match the shipped barrels, or the flow silently skips a step.
5. **`sdd-flow` support files** — `spec-template.md`/`step-format.md` must stay
   consistent with the rewritten `SKILL.md` (or be removed).
