# opencode-kit — Skill Kit Gaps Tracker

Persistent tracker for the skill-kit expansion. Updated as batches land; used at
the end to fix all gaps in one pass. Dev-facing (not shipped).

## Batches

| Batch | Skills | Release | Status |
|---|---|---|---|
| 1 | `interview` (derived), `skill-recipe`, `research`, `handoff`, `code-review`, `sdd-flow` (evolved) | v0.9.0 | done |
| 2 | `diagnosing-bugs`, `verification`, `prototype`, `retro` | v0.10.0 | done |
| 3 | `finishing-a-branch`, `dispatching-parallel-agents`, `using-git-worktrees`, `writing-for-agents`, `codebase-design` | v0.11.0 | in progress |

## Current skills (11)

`english-writing-assistant`, `sdd-flow`, `interview`, `skill-recipe`, `research`,
`handoff`, `code-review`, `diagnosing-bugs`, `verification`, `prototype`, `retro`.

## Remaining candidates (compatible with the author's dislikes)

Not yet derived; candidates for later batches or the final gap pass:

| Candidate | Source | Fit | Notes |
|---|---|---|---|
| `improve-codebase-architecture` | pocock | high | deep-module survey; pairs with `codebase-design` |
| `to-spec` | pocock | medium | mostly covered by `sdd-flow` spec phase |
| `wizard` | pocock | low-med | interactive bash for human-only steps |
| `diagnosing-superpowers` | superpowers | low-med | forensic session report (meta) |
| `ask-matt` | pocock | low-med | router over skills; discovery aid as the kit grows |
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
- `dispatching-parallel-agents` vs `sdd-flow` parallel tracks — decide the
  boundary (ad-hoc fan-out vs in-flow), or have `sdd-flow` reference it.
- `using-git-worktrees` vs `sdd-flow` Phase 2 workspace setup — same boundary.
- `codebase-design` is currently inlined in `sdd-flow` §1.3 — after shipping the
  standalone skill, replace the inline text with a reference.
- `writing-for-agents` vs `skill-recipe/rubric.md` — decide whether the rubric
  should reference the general authoring skill instead of duplicating rules.

### Deferred minors (non-blocking)
- Vacuous `expect(description).not.toContain(">-")` guards in several skill tests
  (`interview`, `research`, `handoff`, `code-review`, `diagnosing-bugs`,
  `verification`, `prototype`, `retro`) — replace or drop repo-wide.
- `verification` wording: "Run the whole command" vs Gate 3 "do not blanket-run
  everything" — tighten.
- `generated.json` `generatedAt` values are hand-set, not machine-generated.
- Unsubstituted `skill-sources/<name>/LICENSE` placeholder in the provenance
  comments of `code-review`, `sdd-flow`, and `interview` (batch 1) — substitute
  real snapshot names for consistency with the batch-2 skills.

### Open decisions
- `interview` is model-visible; confirm or flip to `@interview`-only.
- Whether `codebase-design` ships standalone or is folded into
  `improve-codebase-architecture`.
