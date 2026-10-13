# opencode-kit — Skill Kit Batch 2 Design Spec

- **Date:** 2026-10-13
- **Status:** Draft for review
- **Author:** (agent-assisted)
- **Topic:** Derive four more self-contained skills with the `skill-recipe`:
  `diagnosing-bugs`, `verification`, `prototype`, `retro`.
- **Base:** `main` @ v0.9.0 (`3b8c25d`), branch `feat/skill-kit-2`.
- **Note:** Single spec carrying the implementation steps (no separate plan file).

## 1. Summary

Batch 1 added `research`, `handoff`, `code-review`, and the evolved `sdd-flow`.
This batch fills the remaining workflow gaps with the same pipeline: each skill is
derived from pinned sources, self-contained (no external references), free of the
rejected ceremony (no TDD red-green, no separate plan file, no glossary/ADR, no
mandatory tracker), independently reviewed, then shipped.

1. **`diagnosing-bugs`** — a gated root-cause diagnosis loop for hard bugs.
2. **`verification`** — evidence before claiming work is done.
3. **`prototype`** — a throwaway prototype to answer a design question.
4. **`retro`** — improve the agent's working environment after a session.

## 2. Context and intent

- **Audience:** the author and users of opencode-kit.
- **Order:** diagnosing-bugs → verification → prototype → retro.
- **Reuse:** the `skill-recipe` + rubric, per-skill brief, independent review.

## 3. Facts and constraints

- Pinned sources already vendored: `superpowers` @ `v7.0.0`
  (`bb92a77741419a4ab5f06e711a283343f1ada0c3`), `mattpocock-skills` @ `v1.3.1`
  (`24fe0ef7737efae15c87225755e9f6f5965e4888`). Both MIT.
- New sources to vendor at the same pins:
  - `superpowers/skills/systematic-debugging/SKILL.md`
  - `mattpocock-skills/skills/engineering/diagnosing-bugs/SKILL.md`
  - `mattpocock-skills/skills/engineering/prototype/SKILL.md`
  - `mattpocock-skills/skills/engineering/retro/SKILL.md`
- Already vendored and reused: `superpowers/skills/verification-before-completion/SKILL.md`.
- `skill-recipe/rubric.md` is the house style; every derived skill follows it.
- `scripts/skill-source.ts` + `skill-sources/` stay dev-only.
- Adding new includes requires `add` with the FULL include list (it replaces the
  pin by name); `update` alone cannot add paths.

## 4. Decisions

1. **Reuse the recipe** for all four skills; per-skill brief + independent review.
2. **Self-contained:** no external invocation references in any body; the
   provenance comment is the only place a source repo is named.
3. **Invocation:**
   - `diagnosing-bugs` — model-visible (trigger: a bug, failing test, or
     unexpected behavior to root-cause).
   - `verification` — model-visible (trigger: about to claim work complete).
   - `prototype` — model-visible (trigger: a design question that needs runnable
     code to answer).
   - `retro` — `autoinvoke: false` (`@retro`), a deliberate post-session action.
4. **No new framework code.**
5. **One PR** for the batch; per-skill review in the loop; one release (v0.10.0).

## 5. Per-skill briefs

Each brief file follows `src/skills/skill-recipe/brief-template.md`; the
trigger/`description` comes from §4.3.

### 5.1 `diagnosing-bugs`
- **Sources:** `mattpocock-skills/skills/engineering/diagnosing-bugs/SKILL.md`;
  `superpowers/skills/systematic-debugging/SKILL.md`.
- **Keep:** a gated diagnosis loop for hard bugs — reproduce reliably, isolate the
  smallest failing case, form one hypothesis at a time, verify the cause before
  changing code, then verify the fix; do not patch symptoms; no fix without a
  demonstrated root cause.
- **Drop:** external references; tracker-specific instructions; the source's
  3-5 ranked-hypotheses requirement (superseded by the one-hypothesis-at-a-time
  loop); glossary/ADR requirements.
- **Output:** `src/skills/diagnosing-bugs/SKILL.md`.

### 5.2 `verification`
- **Sources:** `superpowers/skills/verification-before-completion/SKILL.md`.
- **Keep:** no completion claim without fresh verification evidence — run the
  command/test and show the output for the change at hand; report checks that
  could not be run; the claim is only as good as the evidence from the current
  tree.
- **Drop:** external references; the source's TDD red-green "regression tests"
  pattern and its "re-read the plan" requirement (no TDD ceremony, no plan file).
- **Output:** `src/skills/verification/SKILL.md`.

### 5.3 `prototype`
- **Sources:** `mattpocock-skills/skills/engineering/prototype/SKILL.md`.
- **Keep:** build the smallest throwaway artifact that answers one design
  question; keep it out of the real code path; report what was learned and delete
  or clearly mark the prototype; prefer the cheapest thing that resolves the
  uncertainty.
- **Drop:** external references; capturing the prototype to a throwaway branch
  with an issue pointer (keep it out of the real path and mark/delete it instead).
- **Output:** `src/skills/prototype/SKILL.md`.

### 5.4 `retro`
- **Sources:** `mattpocock-skills/skills/engineering/retro/SKILL.md`.
- **Keep:** after a session, review what slowed the work down and make a concrete,
  minimal change to the working environment (an instruction, a script, a skill, a
  default) that prevents the same friction next time; propose, do not silently
  change policy.
- **Drop:** external references; mandatory tracker.
- **Output:** `src/skills/retro/SKILL.md` (`autoinvoke: false`).

## 6. Implementation steps

> Executed inline; per-skill loop = brief → synthesize → register → test → review.

### Task 1: Vendor the new sources
- [ ] `add` each source with the FULL include list (existing + the new §3 paths +
      `LICENSE`); confirm `sources.json` lists them and `check` is clean.

### Task 2: `diagnosing-bugs`
- [ ] Brief `skill-sources/briefs/diagnosing-bugs.md`; synthesize
      `src/skills/diagnosing-bugs/SKILL.md` (model-visible); register; add
      `tests/unit/diagnosing-bugs.test.ts`; update the exact-array in
      `tests/unit/skills-barrel.test.ts`; record `generated.json`; review; fix;
      re-review.

### Task 3: `verification`
- [ ] Brief + synthesize + register (model-visible) + test + barrel + record;
      review; fix; re-review.

### Task 4: `prototype`
- [ ] Brief + synthesize + register (model-visible) + test + barrel + record;
      review; fix; re-review.

### Task 5: `retro`
- [ ] Brief + synthesize + register (`autoinvoke: false`) + test + barrel +
      record; review; fix; re-review.

### Task 6: Docs
- [ ] Update README (both skill-count mentions), `.opencode/INSTALL.md`,
      `AGENTS.md`, `docs/examples/opencode-kit.jsonc`, `CHANGELOG.md` to eleven
      skills; update the `skills-barrel.test.ts` test title too.

### Task 7: Final gate + whole-branch review
- [ ] `bun run typecheck && bun test`; `check` clean; re-record any edited
      generated skill's hash.
- [ ] Whole-branch review; fix; re-review.
- [ ] Commit, push, PR, merge, release (v0.10.0).

## 7. Success criteria

- Four new skills ship, each self-contained (no external invocation references),
  each with provenance and a test.
- `bun run typecheck && bun test` pass; `check` clean; docs match behavior.
- One PR merged and v0.10.0 released.

## 8. Review Focus

1. **`diagnosing-bugs` must not license speculative fixes** — it must gate a fix
   on a demonstrated root cause, and say so in its anti-patterns.
2. **`verification` must require evidence from the current tree**, not a prior
   run; it must not become a blanket "run everything" mandate.
3. **`prototype` must keep throwaway code out of the real path** and mark it.
4. **`retro` must propose changes, not silently alter policy**, and must not
   require a tracker.
5. **Barrel/tests** — each new id is unique and present in
   `tests/unit/skills-barrel.test.ts`'s exact array.
