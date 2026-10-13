# opencode-kit — Skill Kit Batch 3 Design Spec

- **Date:** 2026-10-13
- **Status:** Draft for review
- **Author:** (agent-assisted)
- **Topic:** Derive five more self-contained skills: `finishing-a-branch`,
  `dispatching-parallel-agents`, `using-git-worktrees`, `writing-for-agents`,
  `codebase-design`.
- **Base:** `main` @ v0.10.0 (`389c3f3`), branch `feat/skill-kit-3`.
- **Note:** Single spec carrying the implementation steps (no separate plan file).
  Cross-batch gaps live in `docs/superpowers/skill-kit-gaps.md`.

## 1. Summary

Batch 3 fills the "landing work", "parallel fan-out", "workspace isolation",
"authoring guidance", and "codebase design" gaps with the same pipeline:
derive from pinned sources, self-contained (no external references), free of the
rejected ceremony, independently reviewed, then shipped.

1. **`finishing-a-branch`** — verify, then land the branch (merge / PR / keep /
   discard), including PR shape and the merge-danger call.
2. **`dispatching-parallel-agents`** — fan out independent work to isolated
   subagents and integrate the results.
3. **`using-git-worktrees`** — set up or verify an isolated workspace.
4. **`writing-for-agents`** — general guidance for authoring agent-consumed docs.
5. **`codebase-design`** — deep-module / seam vocabulary for designing interfaces.

## 2. Context and intent

- **Audience:** the author and users of opencode-kit.
- **Order:** finishing-a-branch → dispatching-parallel-agents →
  using-git-worktrees → writing-for-agents → codebase-design.
- **Reuse:** the `skill-recipe` + rubric, per-skill brief, independent review.
- **Scope boundary:** this batch does NOT modify `sdd-flow` or
  `skill-recipe/rubric.md`. The overlaps with `sdd-flow` (parallel tracks, Phase 2
  workspace setup, inlined §1.3 seam vocabulary) and with the rubric are deferred
  to the final gap pass (tracked in `docs/superpowers/skill-kit-gaps.md`).

## 3. Facts and constraints

- Pinned sources already vendored: `superpowers` @ `v7.0.0`
  (`bb92a77741419a4ab5f06e711a283343f1ada0c3`), `mattpocock-skills` @ `v1.3.1`
  (`24fe0ef7737efae15c87225755e9f6f5965e4888`). Both MIT.
- New sources to vendor at the same pins:
  - `superpowers/skills/finishing-a-development-branch/SKILL.md`
  - `superpowers/skills/dispatching-parallel-agents/SKILL.md`
  - `superpowers/skills/using-git-worktrees/SKILL.md`
  - `mattpocock-skills/skills/engineering/pr/SKILL.md`
  - `mattpocock-skills/skills/productivity/writing-for-agents/SKILL.md`
  - `mattpocock-skills/skills/engineering/codebase-design/SKILL.md`
- `skill-recipe/rubric.md` is the house style; every derived skill follows it.
- `scripts/skill-source.ts` + `skill-sources/` stay dev-only.
- Adding new includes requires `add` with the FULL include list.

## 4. Decisions

1. **Reuse the recipe**; per-skill brief + independent review.
2. **Self-contained:** no external invocation references in any body.
3. **Invocation:**
   - `finishing-a-branch` — `autoinvoke: false` (`@finishing-a-branch`); landing
     work is consequential and deliberate.
   - `dispatching-parallel-agents` — model-visible (trigger: two or more
     independent tasks).
   - `using-git-worktrees` — model-visible (trigger: starting work that needs
     isolation, or before executing a plan).
   - `writing-for-agents` — model-visible (trigger: authoring docs/instructions an
     agent will consume).
   - `codebase-design` — model-visible (trigger: designing modules/interfaces or
     reviewing structure).
4. **No new framework code.**
5. **One PR** for the batch; per-skill review in the loop; one release (v0.11.0).

## 5. Per-skill briefs

Each brief file follows `src/skills/skill-recipe/brief-template.md`; the
trigger/`description` comes from §4.3.

### 5.1 `finishing-a-branch`
- **Sources:** `superpowers/skills/finishing-a-development-branch/SKILL.md`;
  `mattpocock-skills/skills/engineering/pr/SKILL.md`.
- **Keep:** verify tests first; detect the environment (normal repo / worktree /
  detached HEAD); present the landing menu (merge locally / push + PR / keep
  as-is); discard only on an explicit, typed confirmation; on merge, verify the
  merged result before cleanup; PR body shape and the "is this safe to merge"
  call.
- **Drop:** external references; any destructive action without explicit
  confirmation; the upstream's `.worktrees/`-ownership heuristic and its
  "Superpowers created this worktree" cleanup guidance (adapt to the host's
  worktree tool — worktrees may be host-owned); the source `pr` skill's
  `GLOSSARY.md` pointer.
- **Output:** `src/skills/finishing-a-branch/SKILL.md` (`autoinvoke: false`).

### 5.2 `dispatching-parallel-agents`
- **Sources:** `superpowers/skills/dispatching-parallel-agents/SKILL.md`.
- **Keep:** one agent per independent problem domain; focused, self-contained
  prompts with the exact context and constraints; dispatch in parallel; review and
  integrate results; the "do not use" cases (related failures, shared state,
  needed full-system context).
- **Drop:** external references.
- **Output:** `src/skills/dispatching-parallel-agents/SKILL.md` (model-visible).

### 5.3 `using-git-worktrees`
- **Sources:** `superpowers/skills/using-git-worktrees/SKILL.md`.
- **Keep:** detect existing isolation first; prefer the harness's native worktree
  tool; fall back to `git worktree`; verify the worktree directory is ignored;
  run a clean baseline before starting; don't create a worktree inside a
  submodule.
- **Drop:** external references; harness-specific brand names. Name the concrete
  OpenCode tools instead: `worktree_create` / `worktree_list` / `worktree_remove`,
  and `session_move` when the worktree becomes the working directory.
- **Output:** `src/skills/using-git-worktrees/SKILL.md` (model-visible).

### 5.4 `writing-for-agents`
- **Sources:** `mattpocock-skills/skills/productivity/writing-for-agents/SKILL.md`.
- **Keep:** context pointers over restatement; separate context load from
  cognitive load; an information hierarchy with progressive disclosure; explicit
  completion criteria; leading words; positive phrasing; prune duplication and
  sediment.
- **Drop:** external references; em-dashes (house rule); the source's
  `SKILL-MECHANICS.md` sibling-file pointer.
- **Boundary:** general authoring guidance; it does not replace
  `skill-recipe/rubric.md` (which keeps skill-specific rules). No rubric change
  this batch.
- **Output:** `src/skills/writing-for-agents/SKILL.md` (model-visible).

### 5.5 `codebase-design`
- **Sources:** `mattpocock-skills/skills/engineering/codebase-design/SKILL.md`.
- **Keep:** the deep-module vocabulary (module / interface / seam / adapter /
  depth); the interface is the test surface; one adapter is a hypothetical seam
  (do not introduce a seam unless something varies across it); prefer depth and
  locality over shallow sprawl.
- **Drop:** external references; glossary/ADR requirements; the source's
  `DEEPENING.md` and `DESIGN-IT-TWICE.md` sibling-file pointers.
- **Output:** `src/skills/codebase-design/SKILL.md` (model-visible).

## 6. Implementation steps

> Executed inline; per-skill loop = brief → synthesize → register → test → review.

### Task 1: Vendor the new sources
- [ ] `add` each source with the FULL include list (the existing includes + the
      new §3 paths; keep the existing `LICENSE` entry — do not duplicate it);
      confirm `sources.json` lists them and `check` is clean.

### Task 2: `finishing-a-branch`
- [ ] Brief + synthesize + register (`autoinvoke: false`) + test + barrel +
      record; review; fix; re-review.

### Task 3: `dispatching-parallel-agents`
- [ ] Brief + synthesize + register (model-visible) + test + barrel + record;
      review; fix; re-review.

### Task 4: `using-git-worktrees`
- [ ] Brief + synthesize + register (model-visible) + test + barrel + record;
      review; fix; re-review.

### Task 5: `writing-for-agents`
- [ ] Brief + synthesize + register (model-visible) + test + barrel + record;
      review; fix; re-review.

### Task 6: `codebase-design`
- [ ] Brief + synthesize + register (model-visible) + test + barrel + record;
      review; fix; re-review.

### Task 7: Docs + gaps tracker
- [ ] Update README (the two prose counts, the skills table, and the inline
      `skills` example), `.opencode/INSTALL.md`, `AGENTS.md`,
      `docs/examples/opencode-kit.jsonc`, `CHANGELOG.md` to sixteen skills; update
      the `skills-barrel.test.ts` test title; update
      `docs/superpowers/skill-kit-gaps.md` (batch status, remaining candidates,
      trim/extend items).

### Task 8: Final gate + whole-branch review
- [ ] `bun run typecheck && bun test`; `check` clean; re-record any edited
      generated skill's hash.
- [ ] Whole-branch review; fix; re-review.
- [ ] Commit, push, PR, merge, release (v0.11.0).

## 7. Success criteria

- Five new skills ship, each self-contained, each with provenance and a test.
- `bun run typecheck && bun test` pass; `check` clean; docs match behavior.
- The gaps tracker reflects the batch and the remaining items.
- One PR merged and v0.11.0 released.

## 8. Review Focus

1. **`finishing-a-branch` must never discard or force-delete without an explicit,
   typed confirmation**, and must not merge a red branch.
2. **`dispatching-parallel-agents` must not fan out dependent work** — it must
   keep the "related/shared state → do not parallelize" guard.
3. **`using-git-worktrees` must verify the directory is gitignored** before the
   manual `git worktree` fallback (native tools own placement), and must not
   create one inside a submodule.
4. **`writing-for-agents` must be general**, not a duplicate of
   `skill-recipe/rubric.md`.
5. **`codebase-design` must not reintroduce glossary/ADR** and must keep the
   "one adapter is hypothetical" rule.
