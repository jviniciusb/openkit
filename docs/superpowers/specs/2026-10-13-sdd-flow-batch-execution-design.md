# opencode-kit — sdd-flow Batch Execution Redesign

- **Date:** 2026-10-13
- **Status:** Draft for approval
- **Author:** (agent-assisted)
- **Topic:** Reshape `sdd-flow` so the orchestrator drives the spec: brainstorm,
  interview, plan, then execute in **batches** (one step or several parallel
  steps), keeping the spec continuously updated.
- **Base:** `main` @ v0.13.0 (`ce4522d`), branch `feat/sdd-flow-batch-execution`.
- **Note:** This spec is the approval artifact (sdd-flow 1.8). Write no code and
  create no implementation worktree until it is approved.

## 1. Summary

Three agreed changes to `src/skills/sdd-flow/`, decided in an `interview`:

1. **Batch launch, per-step gate (Q1).** A *batch* is one step, or a set of
   independent steps launched in parallel. The orchestrator drives the spec: it
   *proposes* the next batch and the user approves what to start. The steps then
   run (background subagents where available), so the orchestrator stays free,
   and **each step as it finishes** is verified, reviewed, written to the spec,
   and gets its own what-next prompt (keep moving on / open a PR / refine or
   re-sync / stop). A step that surfaces a design change or a question raises it
   immediately, not at batch end.
2. **Brainstorm before the interview (Q2).** For architectural-size work, the
   orchestrator drafts 2–3 candidate approaches with tradeoffs before the
   interview, so the user reacts to concrete options.
3. **Continuous spec updates (Q3).** The spec absorbs every discovery and design
   change as it happens. Detail-level changes are written automatically;
   anything that changes agreed behavior, scope, or a user decision is put to
   the user first, then written.

## 2. Context and intent

- **Audience:** the author and users of opencode-kit.
- **Why now:** the user reviewed `sdd-flow` against a desired flow (explore →
  research → brainstorm → interview → break down → dependency graph → execute →
  keep the spec current). Most of it already ships; these three are the real
  gaps.
- **Posture:** behavior change to `sdd-flow` only. No new skills, no framework
  code.
- **Trade-off:** per-step gates prompt the user more often than one gate per
  batch, in exchange for faster decisions and earlier surfacing of design changes.

## 3. Facts and constraints

- Today's `sdd-flow` Phase 1: 1.0 Orient → 1.1 Bounded bypass → 1.2 Interview →
  1.3 Seams → 1.4 Write spec → 1.5 Plan steps → 1.6 External prerequisites →
  1.7 Self-review + gate. Phase 3 is a per-step loop (3a frontier → 3h gate).
- `sdd-flow` is `autoinvoke: false` (`@sdd-flow`), self-contained, and composes
  kit skills by id.
- **Test constraints** (`tests/unit/skills-barrel.test.ts:56-82`): keep the
  `# SDD Flow` heading, the `\n---\n` separator, the three files
  (`SKILL.md`, `spec-template.md`, `step-format.md`); the body must **not**
  contain `superpowers:` / `mattpocock-skills:` prefixes and must **not** contain
  the word `Explore`; the provenance comment must stay.
- Docs naming sdd-flow's composition: `AGENTS.md` (ll.22-28), `README.md`
  (ll.48-49, 281, 344-349), `.opencode/INSTALL.md` (ll.116-117).
- Its `generated.json` `outputHash` must be re-recorded after the edit.

## 4. Decisions

1. **Approve the batch, gate per step (Q1).** The orchestrator proposes a batch
   (one step, or independent steps with no shared files/interfaces), stating what
   is blocked and its recommendation; the user approves what to start. Each step
   then runs and, **as it finishes**, is verified, reviewed, and written to the
   spec, and gets its own prompt: keep moving on / open a PR / refine or re-sync
   / stop. Design changes and questions a step raises are surfaced immediately.
2. **Brainstorm beat, architectural only (Q2).** A new Phase 1 step, skipped for
   the bounded-bypass path.
3. **Continuous spec updates with a fork (Q3).** Auto for detail-level changes;
   ask first for behavior/scope/user-decision changes, then write.
4. **No new gates removed.** The spec-approval gate (1.8), the batch-approval go
   (3a), and the per-step go (3h) all remain.
5. **One PR**, one release (v0.14.0).

### Assumptions to confirm (from the interview)

- "Open a PR" opens one for the completed step.
- The post-step menu is exactly: keep moving on / open a PR / refine or re-sync
  / stop.
- The user accepts being prompted once per completed step (sooner questions,
  earlier design changes) rather than once per batch.

## 5. Changes

### 5.1 Phase 1 — brainstorm beat

Insert a new step and renumber the rest (+1):

- `1.0 Orient` (unchanged)
- `1.1 Bounded bypass` (unchanged)
- **`1.2 Brainstorm the approach` (new)** — for architectural-size work, the
  orchestrator drafts 2–3 candidate approaches with tradeoffs and a
  recommendation, and carries them into the interview's first round. Mark them
  as proposals (this is the orchestrator's synthesis, not a subagent design;
  1.0's "facts, not designs" rule still holds). Bounded work reached 1.1's bypass
  skips this.
- `1.3 Interview` (was 1.2) — round 1 opens with 1.2's candidate approaches.
- `1.4 Seams` (was 1.3)
- `1.5 Write the spec` (was 1.4)
- `1.6 Plan the steps` (was 1.5)
- `1.7 External prerequisites` (was 1.6)
- `1.8 Self-review, then the gate` (was 1.7)

Update every cross-reference: `SKILL.md` internal refs (1.0 → *1.5's "What
already exists"*; 1.0/1.2/1.3 refs; the conditional-section list) and
`spec-template.md` (`SKILL.md 1.3` → `1.4`, `1.4` → `1.5`, `1.6` → `1.7`).

### 5.2 Phase 3 — batch execution

Reframe Phase 3 around **batches of steps**:

- **Definition:** a batch is one step, or a set of independent steps
  that can run in parallel (no shared files or interfaces) — dispatched as
  background subagents where the environment provides them, so the orchestrator
  stays free to handle each completion.
- **3a Propose the batch** (was "Present the frontier"): compute the
  frontier, choose a batch with the recommendation, show what is blocked and on
  what. Then **stop** for the go. Keep the "recommendation is where delegation is
  honored; the go is still theirs" rule. Approving the batch starts the work; it
  does not waive the per-step gate.
- **3b–3e** run **per step in the batch**: expand/route → build (dispatch one
  subagent per step; independent steps in the batch run in parallel per
  `dispatching-parallel-agents`, as background subagents where available) →
  verify → `code-review`. Handle each step **as it completes**; do not wait for
  its siblings.
- **3f Complete the step** — update the spec (checkboxes, Execution findings,
  and §5.3 design updates), then Git per project instructions.
- **3g Handle review feedback** (unchanged).
- **3h Ask what next** (was "Gate"), **per completed step**: `keep moving on /
  open a PR / refine or re-sync / stop`. "Keep moving on" re-enters 3a with the
  next batch; "open a PR" opens one for the completed step. A step's design change
  or question is raised here, immediately — not held until the batch ends.
- Phase 3 intro: loop until every step is checked; **every step** ends at 3h.

Update the anti-patterns accordingly: keep "picking the next step yourself" and
"auto-dispatching"; add "batching steps that share files or interfaces" and
"holding a finished step's question or design change until its siblings finish".

### 5.3 Continuous spec updates

Add a short rule (near *Spec doc location* and enforced in 3c/3f/Phase 3.5): when
execution turns up a discovery or a design change, write it to the spec now.

- **Automatic** when the change is detail-level and stays inside agreed behavior
  and scope: update the spec and continue.
- **Ask first** when it changes agreed behavior, scope, or a decision the user
  made: put it to the user through the agreed decision process, then write the
  answer to the spec before the affected work proceeds.

Phase 3.5 (re-sync) stays, for structural drift the continuous updates cannot
absorb.

### 5.4 Docs, tests, provenance

- `AGENTS.md`, `README.md` (ll.48-49, 281, 344-349), `.opencode/INSTALL.md`
  (ll.116-117): describe the batch execution model and the brainstorm beat.
- `CHANGELOG.md`: `## [Unreleased]` → `### Changed` entry.
- `tests/unit/skills-barrel.test.ts`: keep the existing assertions; add ones for
  the new behavior (e.g. body contains a batch step and the "open a PR" option).
- Re-record `sdd-flow`'s `outputHash` in `skill-sources/generated.json`.

## 6. Implementation steps

> Executed inline on this branch; per-step loop = implement → test → independent
> review.

### Task 1: Phase 1 brainstorm beat
- [ ] Add 1.2, renumber 1.2–1.7 → 1.3–1.8, update all cross-references
      (`SKILL.md`, `spec-template.md`).

### Task 2: Phase 3 batch execution
- [ ] Rewrite Phase 3 around batch launch + per-step completion (3a propose +
      stop; per-step 3b–3e and 3f; 3h ask-what-next per step); update the intro
      and anti-patterns.

### Task 3: Continuous spec updates
- [ ] Add the auto-vs-ask rule and wire it into 3c/3f/Phase 3.5.

### Task 4: Docs, tests, provenance
- [ ] Update `AGENTS.md`, `README.md`, `.opencode/INSTALL.md`, `CHANGELOG.md`;
      extend the barrel test; re-record the `outputHash`; `check` clean.

### Task 5: Final gate + review + release
- [ ] `bun run typecheck && bun test`; whole-branch review; fix; re-review;
      commit, push, PR, merge, release (v0.14.0).

## 7. Success criteria

- The orchestrator proposes a batch to start; each step, as it finishes, gets
  its own completion step and a what-next prompt offering "open a PR".
- A step's question or design change reaches the user without waiting for its
  siblings.
- Architectural work gets 2–3 candidate approaches before the interview.
- The spec is updated continuously, with the auto-vs-ask fork.
- Both gates survive; `bun run typecheck && bun test` pass; `check` clean.
- Docs match the new behavior; one PR merged and v0.14.0 released.

## 8. Review Focus

1. **Both gates survive** — spec approval (1.8) and the per-step go (3h); the
   batch approval (3a) starts work but never waives the per-step gate, and there
   is no auto-dispatch.
2. **Batching respects independence** — never batch steps that share files or
   interfaces (the edge test, `step-format.md`).
3. **The auto-vs-ask fork is explicit** — no silent fill of a user decision.
4. **Self-containment and tests hold** — `# SDD Flow`, `\n---\n`, three files, no
   `Explore`, no external prefixes, provenance intact.
5. **Cross-references are consistent** after the Phase 1 renumbering.
