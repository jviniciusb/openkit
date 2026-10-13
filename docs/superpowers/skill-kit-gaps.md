# opencode-kit — Skill Kit Gaps Tracker

Persistent tracker for the skill-kit expansion. Updated as batches land; used at
the end to fix all gaps in one pass. Dev-facing (not shipped).

## Batches

| Batch | Skills | Release | Status |
|---|---|---|---|
| 1 | `interview` (derived), `skill-recipe`, `research`, `handoff`, `code-review`, `sdd-flow` (evolved) | v0.9.0 | done |
| 2 | `diagnosing-bugs`, `verification`, `prototype`, `retro` | v0.10.0 | done |
| 3 | `finishing-a-branch`, `dispatching-parallel-agents`, `using-git-worktrees`, `writing-for-agents`, `codebase-design` | v0.11.0 | done |
| 4 | `improve-codebase-architecture`, `to-spec`, `wizard`, `router`, `diagnosing-sessions` | v0.12.0 | done |
| Gap pass | none (dedupe + consistency pass over the 21 shipped skills) | v0.13.0 | in review |

## Current skills (21)

`english-writing-assistant`, `sdd-flow`, `interview`, `skill-recipe`, `research`,
`handoff`, `code-review`, `diagnosing-bugs`, `verification`, `prototype`, `retro`,
`finishing-a-branch`, `dispatching-parallel-agents`, `using-git-worktrees`,
`writing-for-agents`, `codebase-design`, `improve-codebase-architecture`,
`to-spec`, `wizard`, `router`, `diagnosing-sessions`.

## Remaining candidates (compatible with the author's dislikes)

Not yet derived; niche productivity extras for a later batch, if ever:

| Candidate | Source | Fit | Notes |
|---|---|---|---|
| `teach` | pocock | low | multi-session teaching workspace |
| `to-questionnaire` | pocock | low | decision questionnaire |
| `wait-what` | pocock | low | re-pitch a message that didn't land |

## Excluded (against the author's dislikes)

- `writing-plans` — separate plan files.
- `test-driven-development` / `tdd` — TDD ceremony.
- `domain-modeling` — glossary/ADR.
- `to-tickets`, `triage`, `wayfinder` — ticket/tracker machinery.
- `using-superpowers` — enforced auto-trigger bootstrap.
- `setup-*` / `setup-matt-pocock-skills` — tooling configuration.

## Gaps — final pass (v0.13.0)

All tracked gaps are now resolved or explicitly accepted. No new skills ship in
this pass; the work is dedupe and consistency only.

### Overlaps — deduped
- `sdd-flow` §1.3 no longer inlines the depth/seam guidance: it references the
  `codebase-design` skill for the seam vocabulary (keeping its own gates).
  **Resolved.**
- `improve-codebase-architecture` vs `codebase-design` — the boundary stays
  explicit (the survey points, `codebase-design` builds) and the survey now
  cross-references `codebase-design` for the vocabulary. **Resolved.**
- `to-spec` vs `sdd-flow`'s spec phase — the two stay distinct (distill an
  existing conversation vs interview then write); `sdd-flow` now names `to-spec`
  as the option for drafting the initial spec. **Resolved.**
- `diagnosing-sessions` vs `diagnosing-bugs` — kept distinct: session forensics
  vs code-bug root-causing; the router and README keep them separate.
  **Resolved (no change needed).**
- `router` vs `skill-recipe` — the router points at `@skill-recipe` rather than
  duplicating its rubric. **Resolved.**
- `dispatching-parallel-agents` vs `sdd-flow` parallel tracks — `sdd-flow` now
  references the skill for the fan-out mechanics. **Resolved.**
- `using-git-worktrees` vs `sdd-flow` Phase 2 workspace setup — `sdd-flow` now
  references the skill for the isolation mechanics. **Resolved.**
- `writing-for-agents` vs `skill-recipe/rubric.md` — the rubric cross-references
  `writing-for-agents` for general authoring depth, keeping only the
  skill-specific rules. **Resolved.**

### Deferred minors — resolved
- Vacuous `expect(description).not.toContain(">-")` guards — removed repo-wide
  (all real assertions kept). **Resolved.**
- `verification` wording — now "Run the whole command **that proves the
  claim**", so it cannot read as a blanket mandate. **Resolved.**
- Batch-1 provenance placeholders (`skill-sources/<name>/LICENSE`) — the
  comments in `code-review`, `sdd-flow`, and `interview` now name real snapshot
  paths. **Resolved.**
- `router` `@id` cross-check test — added; it matches only the skill-list lines
  (`` /^- `@([a-z0-9-]+)`/gm ``) and asserts each id exists in
  `src/skills/index.ts`, so the provenance `...@24fe0ef...` hash and the `@id`
  syntax placeholder are not captured. **Resolved.**
- `generated.json` `generatedAt` hand-set values — **accepted as-is**:
  `bun scripts/skill-source.ts check` validates only each record's `outputHash`,
  never `generatedAt`, so the hand-set values are inert metadata.

### Open decisions — resolved
- `interview` stays **model-visible**. **Resolved.**
- `improve-codebase-architecture` shipped as its own skill in v0.12.0, separate
  from `codebase-design`. **Resolved.**
