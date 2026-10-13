---
name: sdd-flow
description: Use ONLY when the user explicitly invokes this flow, by typing `@sdd-flow` or saying "use the sdd flow", "spec-driven development", "let's spec-drive this", or a similar explicit request. Do not auto-activate for generic feature work, bug reports, or creative requests.
---

# SDD Flow

The approved spec is the domain and behavior contract. It carries both the design and the dependency-ordered implementation steps in one artifact. Implement each step from that content, using the project's conventions and validation rules.

On activation, announce **"Using the sdd-flow skill."** then begin Phase 1.

## How this flow orchestrates skills

This flow sequences the work from specification through delivery. It composes kit skills by id, invoking each when its phase calls for it: `interview` to align on the design, `research` to settle facts, `code-review` to review each step, `codebase-design` for the seam vocabulary, `using-git-worktrees` for workspace isolation, and `dispatching-parallel-agents` for fan-out. A skill remains applicable when its own trigger applies, whether or not this flow names it; follow its guidance alongside project instructions.

## Project workflow authority

This skill coordinates specification, dependencies, skill invocations, gates, and handoffs; it does not define project policy. Before planning, read the active project's root and scoped instructions for architecture, platform routing, validation, size limits, external gates, workspace isolation, and Git and review workflow. Re-read the relevant current instructions before actions they govern, especially dispatch, validation, Git operations, and cleanup. The dependency graph expresses logical dependencies only; it does not prescribe project or Git operations. Follow higher-priority user and runtime instructions; if project guidance is missing or ambiguous, ask before taking a consequential action.

---

## Phase 1: Spec

### 1.0 Orient

Before deciding whether 1.1 applies, dispatch parallel read-only exploration subagents to survey the ground: what already exists for this behavior, which flows and screens it touches, which platforms surface it, how the closest analogous feature was built. Draft the raw material for 1.4's **What already exists** here; drafting it after the interview is too late to shape the interview.

The survey feeds the interview in **both** directions:

- **It answers questions.** Anything it establishes is settled, and must not be put to the user. Bring findings as stated facts, not as questions with a recommended answer.
- **It raises questions.** An existing pattern that conflicts with the ask, two callers where you assumed one, a flag or seam already in place, a constraint nobody mentioned. These are frontier questions the interview would never have reached; carry them into 1.2 as the first round.

The second is the reason this phase exists. A survey that only pre-answers what you already knew to ask has not paid for itself.

Dispatch read-only exploration subagents, one per question, all in one message, following the `dispatching-parallel-agents` skill for the fan-out mechanics. Each brief names its scope, the one question it answers, and that it must return findings with file paths, not proposals. A subagent that comes back with a suggested design has exceeded its brief: discard the design, keep the facts.

When an unknown is about a third-party library or API rather than this codebase, invoke `research` instead of an exploration subagent.

**One round, then move on.** Send the fan-out once, read what comes back, and go to 1.1, even with questions still open. Orient only widens the frontier; 1.2 is what closes it, and after the first round you finally know which facts are worth chasing.

What is still open hands off **by kind**, never in a lump: a **fact** enters 1.2 as a lookup, for which you dispatch `research`, and a **decision** goes to the user. Nothing that could be looked up ever becomes a question, in this phase or any round after it.

Stop early when the survey stops changing your picture of the work. Recurse only when a finding invalidates the premise of the fan-out itself, not merely because it raised something new, which is the success case.

Do not ask the user anything you have not tried to look up first.

### 1.1 Bounded bypass

If the work has agreed acceptance criteria **and** touches one flow that already exists in this repo, skip the interview: present a short design in chat, get an explicit yes, and go to 1.3. Otherwise run 1.2 onward in full.

### 1.2 Interview

Invoke `interview`. It works the design tree in rounds, asking the whole frontier at once with a recommended answer per question. Facts are yours to find; dispatch `research` or an exploration subagent rather than asking the user anything you could look up. Decisions are the user's.

Round 1 is 1.0's questions, the frontier the survey exposed. Everything the survey settled enters as a fact, never as a question.

The interview ends at shared understanding; it writes nothing. This flow writes the spec.

### 1.3 Seams

Name the seams the feature will be tested at and confirm them with the user. Use the seam vocabulary and its principles from the `codebase-design` skill (module, interface, seam, adapter, depth; the interface is the test surface; one adapter is a hypothetical seam), in this phase and in every brief downstream; invoke it by id when you need the definitions.

Use the project's architecture and existing test boundaries to choose the highest seam that still observes the behavior. Prefer existing seams; introduce fewer seams.

No test is written at an unconfirmed seam.

### 1.4 Write the spec

Follow [spec-template.md](spec-template.md): one artifact carrying the design and the dependency-ordered steps. To draft it from the conversation so far, invoke the `to-spec` skill. Add these sections when their trigger applies:

- **What already exists.** Reuse, do not rebuild. Whenever the work touches code that already exists. The APIs, flags, components, and files to mirror, with paths. Its absence is why a fresh agent rebuilds what is already there.
- **Root cause.** Whenever the work is a defect, not a feature. The template is feature-shaped and has no place for it.
- **Verified non-issues.** Do NOT do these. Whenever the interview rejected a plausible approach. Record the idea *and the evidence that killed it*, so the next session does not re-derive it wrongly.
- **Risks / open questions.** Whenever something is still unresolved at approval time.
- **Rollback.** Whenever the work touches schema or infrastructure, or has a wide blast radius.
- **Execution findings.** From the first completed step onward. Facts execution turned up that planning could not: a library trap, an API not shaped as its docs claim, a threshold that behaves unexpectedly. Number them and cite them from steps and briefs the way decisions are cited. Unlike every other section this one is written *during* Phase 3, by 3f; it is what 3c carries forward.

Number the entries under Implementation Decisions so steps can cite them (`decision 7`).

### 1.5 Plan the steps

Read [step-format.md](step-format.md) and write `## Implementation Steps` to it: project-defined track IDs, project-informed size estimates and tier tags, `needs` edges, a `### Parallelism` DAG, and a ticket map when the work spans more than one ticket.

### 1.6 External prerequisites

Write a `## Before starting` section for prerequisites required by the project, such as feature flags, localization, credentials, service configuration, or approvals. Name each prerequisite, confirm its state, and make dependent steps explicitly blocked until it is ready. Update this section if execution reveals another prerequisite.

Anything unconfirmed is a blocker on the steps that need it, not a footnote.

### 1.7 Self-review, then the gate

Re-read the spec with fresh eyes and fix inline:

1. **Placeholders.** Any TBD, TODO, or vague requirement?
2. **Consistency.** Do any sections contradict each other?
3. **Scope.** Focused enough to execute, or does it need decomposition?
4. **Ambiguity.** Could a requirement be read two ways? Pick one and make it explicit.
5. **Timelines.** Only when the spec writes agent instruction text, such as agent guidance or skills. For every trigger, moment, or command in it: name two real timelines it will meet, including one where the steps are separated in time or repeated; list the prior state each command assumes and either fold it in or state it as an explicit precondition; and ask which real moments fall into neither half of a rule that names one. The test is **"which real sequence of events makes this instruction technically satisfied but the goal missed?"**. If you cannot name one, you have not looked; if you can, that is the anchor to fix. Check 4 is too abstract to reach this on its own.

Then present the spec and **stop**.

**Do NOT create a worktree, write code, or take any implementation action until the user has approved the spec.** The artifact scales with the task; the approval gate never does.

### Spec doc location

A local working artifact, **never committed**. Write it to `docs/sdd-flow/specs/YYYY-MM-DD-<topic>-design.md` and verify the path is ignored:

```bash
git check-ignore <spec-path>
```

Exit 0 means ignored. Exit 1 means move it or add the path to `.gitignore` for the user to commit themselves. Never suggest a `docs(...)` commit for the spec. It is the only artifact that survives across sessions, so keep it accurate, especially checkbox state.

**One copy, in the checkout the flow was invoked in.** That path is canonical for the whole flow: worktrees never get their own copy, and every reader (you, an agent in a worktree, a later session) opens it there by absolute path. Record that absolute path in the spec's own header and pass it in every brief. Copying it into a worktree looks harmless and is exactly how the spec gets clobbered: the two copies diverge, and the sync that "fixes" it discards whichever side was ahead, taking the step splits and checkbox state that are the only record of where the flow had got to.

---

## Phase 2: Workspace setup

Follow the active project's workspace instructions for isolation, branch and worktree creation, local inputs, and baseline validation; invoke the `using-git-worktrees` skill for the isolation mechanics when the project workflow calls for a worktree. Use one isolated workspace per independently executing track when the project workflow allows it. Keep the spec in the checkout where the flow was invoked and pass its absolute path to every worker; do not create a competing copy. Track every workspace created this session for Phase 4. If the user asks to preview or move work between workspaces, follow the applicable project and environment instructions.

---

## Phase 3: Execution loop

Loop until every step is checked. Every step ends at 3h's gate; never run the next one without passing through it.

### 3a. Present the frontier

Refresh the execution state using the active project's workflow before presenting the frontier. If actual progress no longer matches the spec, go to Phase 3.5 first. Compute the frontier: steps whose logical blockers are complete and whose project-defined prerequisites for starting are satisfied. The dependency graph determines logical order; project instructions determine how that order maps to workspaces and Git operations. Your output has exactly three parts, in this order:

1. **The frontier.** Every startable step with its tags and project-informed size estimate, then what is blocked and on what.
2. **Your recommendation.** Which to run and why. This is where your judgment goes.
3. **The ask.** Reduced to one word wherever possible.

```
Ready to start: 2 steps
  X2   ~size   <surface for shared logic>
  Y2   ~size   <independent consumer>

Blocked: X3 (needs X2) · X4 (needs X3) · Y3 (needs Y2)

Recommend X2 + Y2 in parallel workspaces: independent tracks, no shared files.

Go? Or name a different pick.
```

Then **stop**. Presenting the frontier and starting work in the same message is skipping the gate.

**Advance delegation does not satisfy the gate.** "You choose", "I trust your judgment", "you decide the ordering" tell you what to *recommend*; they do not tell you to begin. Honor the delegation in part 2 by naming a pick instead of offering a menu; the go is still theirs, and it costs them one word. Ordering and permission-to-start are different questions, and only the first was delegated.

The user decides: one here, a subset, or several in parallel workspaces. If parallel, also walk step-format.md's *When several run in parallel* notes, follow the `dispatching-parallel-agents` skill for the fan-out mechanics, and follow project workspace rules for each track.

### 3b. Expand and route

Create or select the workspace first, following the active project's workspace and Git instructions.

Decompose the step into concrete tasks (files, changes, validating tests), tracked as a checkbox list under the step in the spec file.

Then route it using the active project's agent and platform-routing instructions. For a cross-layer step, follow the project's required sequence and keep dependent work on the same logical track.

Write directly only when project instructions allow direct work for that step; otherwise dispatch the project-designated orchestrator or skill.

### 3c. Build

**Dispatched steps.** Dispatch one subagent per step, with an independent reviewer per step at 3e. The brief must carry: the step's ID, intent, and tags; the spec's absolute path and the slice it implements; the confirmed seams; the **execution findings** earlier steps recorded (1.4); and the relevant implementation decisions and project guidance.

Treat the approved spec as the domain and behavior contract. Implement only the assigned slice, preserving those decisions and constraints; carry forward execution findings so later steps do not repeat discovered mistakes. Use project instructions for implementation conventions and required validation. If implementation exposes a domain ambiguity or contradiction, resolve it through the agreed decision process and update the spec before proceeding.

Independent tracks may run in parallel workspaces; steps that share files or interfaces run one at a time.

**Direct steps.** Implement the assigned slice from the approved spec. Resolve gaps from the spec through the agreed decision process rather than inventing behavior. Validate according to project instructions.

Refactoring is **not** part of this loop. It happens at 3e.

### 3d. Verify

Verification is evidence, not assertion. Before claiming a step passes, run the verification command in this session and read its full output: the test command showing zero failures, the linter showing zero errors, the build exiting 0, or the original symptom now passing. "Should pass", "looks right", and a prior run are not evidence. If a check cannot be run, say so; never claim it passed.

Follow the active project's instructions for validation scope, commands, and escalation. If they define no validation process, use the project's existing tooling to run tests relevant to the change and applicable lint, type-check, or build checks. Show fresh command output as evidence.

### 3e. Review and refactor

Invoke `code-review` against the step's cumulative diff and the originating spec. The reviewer runs independently of the implementer. Evaluate every finding against the actual code and the applicable project rule; check that the described state is reachable, not merely that a code path exists. Keep Standards and Spec findings distinct when the review process does so. Applying nothing, or applying a different fix, are valid outcomes; say which and why. Surface unresolved findings to the user. Then take the refactor pass this step earned.

Follow the project's requirements for tests, coverage, and other validation.

Skip 3e only when the project defines the change as trivial or a fresh review already covers it. Preserve any project-required cleanup or validation when skipping the review.

Independent reviews can surface race conditions, scope errors, missing requirements, and dead code. Catching them here is cheaper than carrying them into later steps.

### 3f. Complete the step

1. Run the project's scope and size checks for the step. If it exceeds a project limit, go to Phase 3.5 before marking it complete.
2. Flip the checkbox in the spec and add what the step learned to **Execution findings**, so later briefs can carry it forward.
3. Follow project instructions for staging, commits, branch synchronization, pushes, PRs, and dependency landing order. This skill does not prescribe Git commands, branch names or bases, or grant commit or push authorization. Record any project-required pending state beside the step.
4. After any project-required sync or review fix, repeat the affected validation and scope and size checks according to project instructions before advancing.

### 3g. Handle review feedback

When the project uses PRs or another review process, handle its feedback as part of the step, not as unrelated follow-up work.

1. Gather all outstanding review feedback through the project's review process.
2. **Evaluate each one against the code and the rule it cites.** Never apply on the reviewer's say-so: check the state it describes is actually reachable, and that any rule it quotes says what it claims to say. A finding can be right about the problem and wrong about the cause, and a reviewer can cite a precedent that itself violates the rule.
3. **When a finding turns on a magnitude, measure it before answering.** Performance, allocation, and memory claims arrive as assertions and get met with counter-assertions, and usually neither side has the number. Measure instead. An estimate here was wrong by 9x, in the direction that would have justified rejecting a real finding. The measurement is also the reply.
4. **Three outcomes, not two: apply it, reject it, or find the better solution.** A comment is a problem statement, not a prescription; before applying or reverting, ask what the underlying issue is, whether the codebase already has an idiomatic way to solve it, and whether an evolution exists that fixes the concern *and* improves the pattern. Reverting to sidestep a finding is the trap: a callback dispatched on the wrong thread may need the project's established navigation mechanism, not a rollback. Whichever you pick, **state the reason**; rejecting or diverging are valid, silently ignoring feedback is not.
5. Re-run 3d's validation and any project-defined scope and size checks; review fixes can change both behavior and scope.
6. Respond to and resolve feedback using the project's review process.
7. Return to 3h.

### 3h. Gate

Ask:

> Continue / refine remaining steps / pivot or re-sync / stop?

Continue goes back to 3a's frontier. Refine means the user edits the spec; wait for an explicit go. Pivot or re-sync goes to Phase 3.5. Stop goes to Phase 4.

---

## Phase 3.5: Re-sync after drift

Trigger whenever execution stops matching the step plan:

- Scope changed (descoped, expanded, bug found in QA)
- Structure changed (steps split, merged, or reordered)
- **A step came in over the size target**
- Actual implementation or review state no longer matches `## Implementation Steps`

Procedure:

1. **Snapshot.** Completed and unchecked steps, review state, and active workspaces. Consult project tooling for any additional execution state it tracks.
2. **Reshape the steps** so the remaining list is correctly ordered. Re-mark what shipped; add, remove, reorder, re-split, merge, or renumber as needed; reconcile each step with its actual implementation and review state; **redraw the DAG**. The spec is the source of truth for planned work. Read it back: if the frontier is confusing given actual progress, reshape it further.
3. **Diagnose the bug** when QA found one, before adding its fix as a step. Reproduce it with the smallest failing case. Isolate the cause: bisect the change, or trace the failing path to the line that sets the wrong state. Hypothesize what would make it fail and what would make it pass. Then verify the fix against the reproduction. Do not patch a symptom to make the reproduction pass. Add the verified fix as a step.
4. **Plan the moves using project instructions.** Apply the project's rules for workspace and Git changes; this flow does not prescribe branch bases, cherry-picks, rebases, pushes, or PR operations.
5. Re-enter Phase 3 at 3a.

---

## Phase 4: Wrap-up

1. **Summarize.** Completed and unchecked steps, review state, pending dependencies, uncommitted work, and any unresolved blockers.
2. **Workspace audit.** List active workspaces and identify which appear complete, abandoned, or still in flight. Verify that no needed work exists only in a workspace before cleanup, then follow project and user instructions for removing or retaining it. Ask for confirmation when required by those instructions.
3. **Spec doc** stays untracked. Do not suggest a `docs(...)` commit. If the user wants it for next session, give them the path.

---

## Anti-patterns

- **Auto-triggering on "let's build X".** Explicit invocation only.
- **Picking the next step yourself.** 3a presents the frontier; the user chooses. Auto-dispatching is the same violation, and so is presenting the frontier and then starting in the same message.
- **"They already delegated ordering, so I don't need a second confirmation."** The recommendation is where delegation is honored. The go is still theirs.
- **Taking the first unchecked box** instead of the frontier. With a graph, the first unchecked step is frequently blocked.
- **Writing feature code directly** when the step doesn't meet 3b's narrow exception.
- **Estimating size after the code exists.** The project's size policy is a planning constraint.
- **Starting the next step without passing 3h.**
- **Treating a step as finished before project-required validation or review is complete.**
- **Claiming a step passes without fresh evidence.** Run the command and read its output first.
- **Applying a review comment because a reviewer wrote it.** Evaluate it against the code and the rule it cites first, then apply, reject, or reach for the better pattern, with the reason in the reply.
- **Inferring branch, commit, or PR policy from the dependency graph.** Use the active project's Git workflow.
- **Taking Git actions based on authorization inferred from this skill's invocation.** Follow the user's and project's authorization rules.
- **Copying the spec into another workspace.** Keep one canonical file and pass its absolute path to readers; competing copies can diverge.
- **Answering a magnitude claim with an estimate.** Measure it; the measurement is the reply.
- **Leaving steps in stale order after a restructure.** If the frontier no longer names the genuine next action, re-sync before continuing.
- **Forgetting workspaces created during pivots.** Phase 4 accounts for every workspace created in the session.

<!-- generated by skill-recipe
from: obra/superpowers@bb92a77741419a4ab5f06e711a283343f1ada0c3 skills/subagent-driven-development/SKILL.md (+ executing-plans, verification-before-completion)
      mattpocock/skills@24fe0ef7737efae15c87225755e9f6f5965e4888 skills/engineering/implement-spec/SKILL.md (+ to-spec, to-tickets)
      src/skills/sdd-flow/SKILL.md (prior revision, evolved in place)
license: MIT (dev-only snapshots: skill-sources/superpowers/LICENSE, skill-sources/mattpocock-skills/LICENSE in the repo) -->
