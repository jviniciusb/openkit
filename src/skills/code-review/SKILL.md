---
name: code-review
description: Use when reviewing a change (a diff, a PR, or a completed task) before it merges, and when receiving review feedback on your own work. Trigger on requests to review a branch, PR, or diff, and when handed review comments to act on.
---

# Code Review

Review a change along two independent axes, Standards and Spec, so neither masks the other. On the receiving side, verify every finding against the code and the rule it cites before acting on it.

## Overview

A code review answers two separate questions about a change: does it follow this repo's standards, and does it implement what was asked. A change can pass one axis and fail the other, so the two are reviewed independently and reported side by side, never merged into a single ranking. Findings carry a severity: Critical, Important, or Minor. Reviewing and receiving are the same discipline from opposite ends. Both run on evidence over impression, and both verify a claim about the code against the code before accepting or acting on it.

## When to Use

- A change is about to merge and needs review: a diff, a branch, a PR, or a completed task.
- The user asks to review work, or to review the changes since a fixed point.
- You receive review feedback on your own change and need to act on it.
- A finding is unclear or technically questionable and needs verification rather than agreement.

## Process

### Reviewing a change

#### 1. Pin the fixed point and read the diff

Take the fixed point the user gives (a commit, branch, tag, or merge-base). Compare against it with a three-dot diff so the comparison runs against the merge-base, and note the commits in range. Confirm the ref resolves and the diff is non-empty before going further.

**An empty diff is the finding.** If there is no change, report that plainly and stop. Never invent findings to fill a review.

#### 2. Gather the two contracts

- **Standards**: the repo's documented coding standards, conventions, and contributing rules.
- **Spec**: the originating requirements, issue, plan, or brief. If none exists, the Spec axis reports "no spec available" instead of guessing.

#### 3. Review both axes in parallel

Run the two axes independently, in parallel when the harness supports it, so neither pollutes the other's context. If the harness has no parallel path, run them in sequence and keep the findings separate.

**Standards axis.** Per file and hunk, report:

- every place the change violates a documented standard, citing the standard (file and the rule);
- judgement-call smells (naming, duplication, feature envy, primitive obsession, and similar) named as heuristics, never as hard violations;
- a documented repo standard overrides any baseline heuristic, and rules that tooling already enforces are skipped.

**Spec axis.** Report:

- requirements the spec asked for that are missing or partial;
- behaviour in the change that was not asked for (scope creep);
- requirements that look implemented but where the implementation looks wrong.

Quote the spec line for each finding. If the spec is missing, skip this axis and note that in the report.

#### 4. Report side by side

Present the two axes under separate headings, verbatim or lightly cleaned. Do not merge or rerank across axes: the separation exists so one axis cannot mask the other. Label every finding Critical, Important, or Minor. End with a one-line summary of the finding count per axis and the worst issue within each axis. Do not pick a single winner across axes.

### Receiving review feedback

#### 1. Read and understand

Read the feedback in full before reacting. Restate each requirement in your own words. If any item is unclear, ask before implementing anything: related items mean partial understanding leads to a wrong fix.

#### 2. Verify each finding

For every finding, check it against the actual code and the rule it cites. Confirm the code behaves as the finding claims and that the cited rule applies here. Do not accept a finding on authority, and do not reject one to avoid the work.

#### 3. Apply, reject, or find a better fix

For each finding, either apply it, reject it with a technical reason, or find a better fix, and state the reason. When a suggestion is wrong for this codebase, push back with technical reasoning and evidence (code, tests), not defensiveness. When you were wrong, say so factually and move on.

#### 4. Order the work

Clarify anything unclear first. Then fix blocking issues (breaks, security), then simple fixes, then complex ones. Verify after each fix.

## Gates

- **Empty diff reported as such.** No change means no findings; findings are never invented.
- **Two axes, reported separately.** Standards and Spec stay distinct and are never merged or reranked across.
- **Every finding cites its contract.** A standards finding cites the standard (file and rule); a spec finding quotes the spec line.
- **Severity assigned.** Each finding is Critical, Important, or Minor.
- **Findings verified before acted on.** On the receiving side, each finding is checked against the code and the rule it cites before it is applied or rejected.
- **Rejection carries a reason.** A rejected finding comes with the technical reason it does not apply.

## Anti-patterns

- Inventing findings when the diff is empty.
- Merging the two axes into a single ranking, letting one mask the other.
- Reporting a standards breach without citing the standard, or a spec gap without quoting the spec.
- Treating a judgement-call smell as a hard violation, or overriding a documented repo standard with a heuristic.
- Accepting review feedback on authority without verifying it against the code.
- Rejecting a finding to avoid the work, or agreeing performatively to keep the peace.
- Implementing a batch of feedback before clarifying the items that are unclear.

<!-- generated by skill-recipe
     from: mattpocock/skills@24fe0ef7737efae15c87225755e9f6f5965e4888 skills/engineering/code-review/SKILL.md
           obra/superpowers@bb92a77741419a4ab5f06e711a283343f1ada0c3 skills/requesting-code-review/SKILL.md
           obra/superpowers@bb92a77741419a4ab5f06e711a283343f1ada0c3 skills/receiving-code-review/SKILL.md
     license: MIT (dev-only snapshots: skill-sources/mattpocock-skills/LICENSE, skill-sources/superpowers/LICENSE in the repo) -->
