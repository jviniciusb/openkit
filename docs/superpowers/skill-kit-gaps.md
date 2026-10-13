# opencode-kit — Skill Kit Gaps Tracker

Persistent tracker for the skill-kit expansion. Updated as batches land; used at
the end to fix all gaps in one pass. Dev-facing (not shipped).

## Batches

| Batch | Skills | Release | Status |
|---|---|---|---|
| 1 | `interview` (derived), `skill-recipe`, `research`, `handoff`, `code-review`, `sdd-flow` (evolved) | v0.9.0 | done |
| 2 | `diagnosing-bugs`, `verification`, `prototype`, `retro` | v0.10.0 | done |
| 3 | `finishing-a-branch`, `dispatching-parallel-agents`, `using-git-worktrees`, `writing-for-agents`, `codebase-design` | v0.11.0 | done |
| 4 | `improve-codebase-architecture`, `to-spec`, `wizard`, `router`, `diagnosing-sessions` | v0.12.0 | merged, pending release |

## Current skills (21)

`english-writing-assistant`, `sdd-flow`, `interview`, `skill-recipe`, `research`,
`handoff`, `code-review`, `diagnosing-bugs`, `verification`, `prototype`, `retro`,
`finishing-a-branch`, `dispatching-parallel-agents`, `using-git-worktrees`,
`writing-for-agents`, `codebase-design`, `improve-codebase-architecture`,
`to-spec`, `wizard`, `router`, `diagnosing-sessions`.

## Remaining candidates (compatible with the author's dislikes)

Not yet derived; niche productivity extras for a later batch or the final gap
pass:

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

## Trim / extend items (fix in the final gap pass)

### Overlaps to dedupe
- `codebase-design` is standalone, but `sdd-flow` §1.3 still inlines the same
  depth/seam guidance — replace the inline text with a reference to the skill.
- `improve-codebase-architecture` (read-only survey that proposes deepening) vs
  `codebase-design` (designs a module's seam) — keep the boundary explicit: the
  survey points, `codebase-design` builds.
- `to-spec` vs `sdd-flow`'s spec phase — `to-spec` distills an existing
  conversation, `sdd-flow` interviews then writes. Decide whether `sdd-flow`
  references `to-spec` for the write-up.
- `diagnosing-sessions` vs `diagnosing-bugs` — near-identical names; confirm the
  router and README keep session forensics and code-bug root-causing distinct.
- `router` vs `skill-recipe` — both are discovery/authoring aids; ensure the
  router points at `@skill-recipe` rather than duplicating its rubric.
- `dispatching-parallel-agents` vs `sdd-flow` parallel tracks — decide the
  boundary (ad-hoc fan-out vs in-flow), or have `sdd-flow` reference it.
- `using-git-worktrees` vs `sdd-flow` Phase 2 workspace setup — same boundary.
- `writing-for-agents` vs `skill-recipe/rubric.md` — decide whether the rubric
  should reference the general authoring skill instead of duplicating rules.

### Deferred minors (non-blocking)
- Vacuous `expect(description).not.toContain(">-")` guards in several skill tests
  (`interview`, `research`, `handoff`, `code-review`, `diagnosing-bugs`,
  `verification`, `prototype`, `retro`, `finishing-a-branch`,
  `dispatching-parallel-agents`, `using-git-worktrees`, `writing-for-agents`,
  `codebase-design`, `improve-codebase-architecture`, `to-spec`, `wizard`,
  `router`, `diagnosing-sessions`) — replace or drop repo-wide.
- `verification` wording: "Run the whole command" vs Gate 3 "do not blanket-run
  everything" — tighten.
- `generated.json` `generatedAt` values are hand-set, not machine-generated.
- Unsubstituted `skill-sources/<name>/LICENSE` placeholder in the provenance
  comments of `code-review`, `sdd-flow`, and `interview` (batch 1) — substitute
  real snapshot names for consistency with the batch-2 skills.

### Open decisions
- `interview` is model-visible; confirm or flip to `@interview`-only.
- `improve-codebase-architecture` shipped as its own skill in v0.12.0 (resolved);
  it stays separate from `codebase-design`.
