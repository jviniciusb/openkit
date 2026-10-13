# Spec Template

The baseline structure for the single artifact `sdd-flow` produces. It carries the design (Problem Statement through Testing Decisions) and the dependency-ordered steps (Implementation Steps), so no separate plan file is needed.

Write it to a local, git-ignored path (see SKILL.md *Spec doc location*).

## Problem Statement

The problem that the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

Only the stories that change a decision. Each in the format:

1. As an <actor>, I want a <feature>, so that <benefit>

<user-story-example>
1. As a mobile bank customer, I want to see balance on my accounts, so that I can make better informed decisions about my spending
</user-story-example>

## Implementation Decisions

A numbered list of the implementation decisions that were made. Steps cite them by number (`decision 7`). This can include:

- The modules that will be built or modified
- The interfaces of those modules that will be modified
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

File paths are allowed. In a multi-module or cross-platform repository, concrete paths keep the spec unambiguous.

Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it within the relevant decision and note briefly that it came from a prototype. Trim to the decision-rich parts, not a working demo, just the important bits.

## Testing Decisions

A list of testing decisions that were made. Include:

- A description of what makes a good test (only test external behavior, not implementation details)
- Which modules will be tested
- The seams the feature will be tested at, using the vocabulary from SKILL.md 1.3
- Prior art for the tests (that is, similar types of tests in the codebase)

## Implementation Steps

The dependency-ordered steps, written to [step-format.md](step-format.md). Each step declares its track ID, intent, tags, and `needs` edges, and the `### Parallelism` DAG is drawn below them.

## Out of Scope

A description of the things that are out of scope for this spec.

## Further Notes

Any further notes about the feature.

## Conditional sections

Add these only when their trigger applies (SKILL.md 1.4):

- **What already exists.** Reuse, do not rebuild.
- **Root cause.** When the work is a defect.
- **Verified non-issues.** Do NOT do these.
- **Risks / open questions.** When something is unresolved at approval.
- **Rollback.** When the work touches schema or infrastructure, or has a wide blast radius.
- **Execution findings.** Written during Phase 3, carried forward by later step briefs.
