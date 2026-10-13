# opencode-kit — Skill Kit Batch 4 Design Spec

- **Date:** 2026-10-13
- **Status:** Draft for review
- **Author:** (agent-assisted)
- **Topic:** Derive the remaining compatible candidates:
  `improve-codebase-architecture`, `to-spec`, `wizard`, `router` (from pocock
  `ask-matt`), `diagnosing-sessions` (from superpowers `diagnosing-superpowers`).
- **Base:** `main` @ v0.11.0 (`92e17a3`), branch `feat/skill-kit-4`.
- **Note:** Single spec carrying the implementation steps (no separate plan file).
  Cross-batch gaps live in `docs/superpowers/skill-kit-gaps.md`.

## 1. Summary

Batch 4 clears the remaining compatible candidates with the same pipeline:
derive from pinned sources, self-contained (no external references), free of the
rejected ceremony, independently reviewed, then shipped.

1. **`improve-codebase-architecture`** — survey deepening opportunities and
   propose them; never auto-refactor.
2. **`to-spec`** — synthesize a conversation into a spec.
3. **`wizard`** — generate an interactive script for human-only steps.
4. **`router`** — point the user at the right skill/flow (from pocock `ask-matt`).
5. **`diagnosing-sessions`** — a forensic report of a session that went wrong
   (from superpowers `diagnosing-superpowers`).

## 2. Context and intent

- **Audience:** the author and users of opencode-kit.
- **Renames:** two source skills are branded (`ask-matt`,
  `diagnosing-superpowers`); they ship as `router` and `diagnosing-sessions`.
- **Order:** improve-codebase-architecture → to-spec → wizard → router →
  diagnosing-sessions.
- **Scope boundary:** this batch does NOT modify `sdd-flow` or the existing
  skills; the overlaps (to-spec vs `sdd-flow` spec phase; codebase-design vs
  improve-codebase-architecture) are deferred to the final gap pass (tracked).

## 3. Facts and constraints

- Pinned sources already vendored: `superpowers` @ `v7.0.0`
  (`bb92a77741419a4ab5f06e711a283343f1ada0c3`), `mattpocock-skills` @ `v1.3.1`
  (`24fe0ef7737efae15c87225755e9f6f5965e4888`). Both MIT.
- New sources to vendor at the same pins (four; `to-spec` is ALREADY vendored as
  a source of `sdd-flow` — do not add it again):
  - `mattpocock-skills/skills/engineering/improve-codebase-architecture/SKILL.md`
  - `mattpocock-skills/skills/engineering/wizard/SKILL.md`
  - `mattpocock-skills/skills/engineering/ask-matt/SKILL.md`
  - `superpowers/skills/diagnosing-superpowers/SKILL.md`
- `skill-recipe/rubric.md` is the house style.
- `scripts/skill-source.ts` + `skill-sources/` stay dev-only.
- Adding new includes requires `add` with the FULL include list (keep the
  existing `LICENSE` entry; do not duplicate it).

## 4. Decisions

1. **Reuse the recipe**; per-skill brief + independent review.
2. **Self-contained:** no external invocation references in any body.
3. **Invocation:**
   - `improve-codebase-architecture` — `autoinvoke: false`
     (`@improve-codebase-architecture`); a deliberate survey.
   - `to-spec` — `autoinvoke: false` (`@to-spec`); a deliberate synthesis.
   - `wizard` — model-visible (trigger: a step needs the human to do something an
     agent cannot).
   - `router` — `autoinvoke: false` (`@router`); discovery aid.
   - `diagnosing-sessions` — `autoinvoke: false` (`@diagnosing-sessions`); a
     deliberate forensic action.
4. **Renames:** `ask-matt` → `router`; `diagnosing-superpowers` →
   `diagnosing-sessions` (drop upstream branding).
5. **No new framework code.**
6. **One PR** for the batch; per-skill review in the loop; one release (v0.12.0).

## 5. Per-skill briefs

Each brief file follows `src/skills/skill-recipe/brief-template.md`; the
trigger/`description` comes from §4.3.

### 5.1 `improve-codebase-architecture`
- **Sources:** `mattpocock-skills/skills/engineering/improve-codebase-architecture/SKILL.md`.
- **Keep:** survey the codebase for deepening opportunities (shallow modules,
  leaky seams, duplicated responsibility); report them as a structured, prioritized
  list with the concrete change and its payoff; PROPOSE, never auto-refactor;
  keep the survey read-only.
- **Drop:** external references; glossary/ADR requirements; the source's
  `HTML-REPORT.md` sibling-file pointer (describe the report format inline).
- **Output:** `src/skills/improve-codebase-architecture/SKILL.md`
  (`autoinvoke: false`).

### 5.2 `to-spec`
- **Sources:** `mattpocock-skills/skills/engineering/to-spec/SKILL.md`.
- **Keep:** synthesize the current conversation into a spec with clear sections
  (summary, intent, requirements, non-goals, open questions); preserve the exact
  decisions made; write it to a location the user names.
- **Drop:** external references; tracker-specific instructions; replace the
  source's inline spec template with the kit's own section list.
- **Output:** `src/skills/to-spec/SKILL.md` (`autoinvoke: false`).

### 5.3 `wizard`
- **Sources:** `mattpocock-skills/skills/engineering/wizard/SKILL.md`.
- **Keep:** generate a small interactive script that walks the human through
  steps an agent cannot do (credentials, approvals, external consoles); clear
  prompts and validation; never hardcode secrets; safe to re-run.
- **Drop:** external references; any tracker pointer; the source's `template.sh`
  sibling library (describe the wizard shape inline; do not ship or point at a
  support file).
- **Output:** `src/skills/wizard/SKILL.md` (model-visible).

### 5.4 `router`
- **Sources:** `mattpocock-skills/skills/engineering/ask-matt/SKILL.md`.
- **Keep:** given the user's request, name the right skill or flow and why; cover
  the kit's user-invoked skills (`@sdd-flow`, `@skill-recipe`, `@handoff`,
  `@retro`, `@finishing-a-branch`, `@to-spec`, `@improve-codebase-architecture`,
  `@router`, `@diagnosing-sessions`) and when to reach for a model-visible one;
  keep it a pointer, not an enforced chain.
- **Drop:** external references; upstream branding (`ask-matt`); the source's
  `PHASE-BOUNDARIES.md` sibling-file pointer.
- **Output:** `src/skills/router/SKILL.md` (`autoinvoke: false`).

### 5.5 `diagnosing-sessions`
- **Sources:** `superpowers/skills/diagnosing-superpowers/SKILL.md`.
- **Keep:** produce a forensic report of a session that went wrong — a timeline
  of what happened, where it diverged, and evidence with file/line or log
  citations; report findings, do not silently "fix" the session.
- **Drop:** external references; upstream branding (`superpowers`); the source's
  `prompts/`, `templates/`, and `references/` sibling directories.
- **Output:** `src/skills/diagnosing-sessions/SKILL.md` (`autoinvoke: false`).

## 6. Implementation steps

> Executed inline; per-skill loop = brief → synthesize → register → test → review.

### Task 1: Vendor the new sources
- [ ] `add` each source with the FULL include list (existing includes + the new
      §3 paths; keep the existing `LICENSE` entry); confirm `sources.json` lists
      them and `bun scripts/skill-source.ts check` is clean.

### Task 2: `improve-codebase-architecture`
- [ ] Brief + synthesize + register (`autoinvoke: false`) + test + barrel +
      record; review; fix; re-review.

### Task 3: `to-spec`
- [ ] Brief + synthesize + register (`autoinvoke: false`) + test + barrel +
      record; review; fix; re-review.

### Task 4: `wizard`
- [ ] Brief + synthesize + register (model-visible) + test + barrel + record;
      review; fix; re-review.

### Task 5: `router`
- [ ] Brief + synthesize + register (`autoinvoke: false`) + test + barrel +
      record; review; fix; re-review.

### Task 6: `diagnosing-sessions`
- [ ] Brief + synthesize + register (`autoinvoke: false`) + test + barrel +
      record; review; fix; re-review.

### Task 7: Docs + gaps tracker
- [ ] Update README (the two prose counts, the skills table, the inline `skills`
      example), `.opencode/INSTALL.md`, `AGENTS.md`,
      `docs/examples/opencode-kit.jsonc`, `CHANGELOG.md` to twenty-one skills;
      update the `skills-barrel.test.ts` test title; update
      `docs/superpowers/skill-kit-gaps.md`.

### Task 8: Final gate + whole-branch review
- [ ] `bun run typecheck && bun test`; `bun scripts/skill-source.ts check` clean;
      re-record any edited generated skill's hash.
- [ ] Whole-branch review; fix; re-review.
- [ ] Commit, push, PR, merge, release (v0.12.0).

## 7. Success criteria

- Five new skills ship, each self-contained, each with provenance and a test.
- `bun run typecheck && bun test` pass; `check` clean; docs match behavior.
- The gaps tracker reflects the batch.
- One PR merged and v0.12.0 released.

## 8. Review Focus

1. **`improve-codebase-architecture` must stay read-only** — propose, never
   auto-refactor.
2. **`to-spec` must preserve the exact decisions** and not invent requirements;
   it must write where the user says.
3. **`wizard` must never hardcode or echo secrets** and must be safe to re-run.
4. **`router` must stay a pointer**, not an enforced chain, and must name real
   skill ids.
5. **`diagnosing-sessions` must report with citations and not silently mutate**
   the environment.
