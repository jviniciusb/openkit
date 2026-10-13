# Step Format

How `## Implementation Steps` is written. Read during Phase 1, before drafting steps.

## The step record

```
- [ ] **X2.** <one domain behavior or implementation outcome> *(<project size estimate> · <project-defined tag>)*, needs X1
```

Four fields: project-defined track-prefixed **ID**, one-line **intent**, **tags**, and **`needs` edges** (or `no blockers`).

Tags, in order:

| Tag | Values |
|---|---|
| Size | Project-defined estimate. Estimate every step; where estimating is not cheap, mark it uncertain and flag it if it may exceed the project limit |
| Reason | On combined steps, state why project constraints require them to be planned together |
| Tier | Use the project's review-risk or tier categories when defined |

A step may carry a `>` blockquote underneath for a trap, a correction found while implementing, or a decision that would otherwise be lost.

## Track identifiers

Use the active project's existing layer names and agent-routing conventions for step IDs. Number steps within each track. Combine tracks only when project constraints or a real dependency make them one implementation unit; state why in the step tag. Otherwise keep independent work separate so it can be scheduled independently. Do not invent platform codes or combination rules that the project does not use.

## Size

Read the project's step and PR size target, counting method, and verification tool from its active instructions. Estimate each step during planning with that method, and split before implementation when the estimate approaches the limit.

- Size estimates are planning constraints, not a substitute for the project's authoritative check.
- Follow the project's split guidance when a step does not fit. Do not assume a particular LOC threshold, counting script, PR gate, or platform recipe.
- A new module or screen may need multiple steps; follow the project's architecture and delivery guidance.

## Independence rules

Use these when breaking work into steps, subject to the active project's architecture and constraints:

1. **Separate independent tracks.** Split work by component, module, platform, or other project-defined boundary when the changes can be implemented and verified independently.
2. **Preserve compatibility.** Prefer incremental changes that keep existing consumers working; consult project rules for changes that must land atomically.
3. **Wide renames use expand, migrate, contract.** Add the new form beside the old, migrate call sites in independently verifiable steps, then remove the old form after no callers remain.
4. **Prefer small, behaviorally complete steps.** Extract a preparatory step only when it has value on its own or makes a later step safer and smaller.
5. **Reuse shared components and modules** according to the project's architecture rather than creating cross-feature dependencies ad hoc.
6. **The edge test.** Add an edge when a step cannot compile or be verified without another, or when reversing their implementation order would violate a project-defined safety condition. "Logically related" alone is not an edge; unnecessary edges serialize work that could run in parallel. The graph records logical dependencies. Follow project instructions for how those dependencies affect workspaces, branches, reviews, and landing order.

## The graph

Every step declares `needs <IDs>` or `no blockers`. A `### Parallelism` section draws the DAG:

```
X1 ──┬──► X2 ──► X4
     └──► Y1 ──┬──► Y2
               └──► Y3
```

The graph does three jobs:

- **Frontier.** A step is startable once its logical blockers are complete and project-defined start prerequisites are satisfied. This is the frontier Phase 3a proposes a batch from.
- **Dependency order.** Edges state which completed work a step depends on. They do not prescribe branch bases, branch names, PR timing, or Git operations.
- **Concurrency.** Independent frontier steps can run in parallel when the project's workspace rules allow it.

## Ticket map

Use when the project tracks work across multiple tickets. Map each step or track to its owning ticket according to the project's issue-tracking conventions.

| Steps | Ticket | Title | Owner |
|---|---|---|---|
| X1-X4 | <project ticket> | <track title> | |
| Y1-Y3 | <project ticket> | <track title> | |

Record here when a track is reference-only: included in the design, but not part of this execution.

## Workspace setup

Before validating in a fresh or isolated workspace, follow the active project's setup instructions for ignored inputs, submodules, generated state, and locally published artifacts. Re-establish any required state in each workspace before running the checks that depend on it.

### When several run in parallel

When steps run concurrently, name likely shared-file conflict points and keep spec edits to **one** writer. Parallel workers read the same canonical spec; the orchestrator updates checkboxes and findings, while workers report changes rather than editing competing copies.

## Anti-patterns

- **A combined step with no reason named.** That may be independent work grouped without cause.
- **Edges for steps that are merely related.** Serializes work for nothing.
- **A behaviorless plumbing step** shipped alone when it can be folded into a dependent step without violating project constraints.
- **Estimating after writing the code.** Use the project's size policy as a planning constraint, not a late delivery gate.
- **Turning graph edges into branch or PR policy.** Read those rules from the active project's setup.
