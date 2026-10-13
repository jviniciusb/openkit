# Skill brief: dispatching-parallel-agents

## Target id

`dispatching-parallel-agents`

## Trigger / description

Use when two or more independent tasks can be worked without shared state or
sequential dependencies. Trigger on several unrelated failures, subsystems, or
problem domains that can be investigated or implemented concurrently. Do not use
when the tasks are related, share state, or need full-system context.

## Intent

Cut wall-clock time on independent work by delegating one agent per problem
domain. Success: each task is genuinely independent of the others, every agent
gets a focused and self-contained prompt carrying the exact context and
constraints it needs, all dispatches go out together so they run in parallel, and
the coordinator reviews and integrates the results afterward. Work that is
related, shares state, or needs the whole system stays sequential.

## Source paths

- `skill-sources/superpowers/skills/dispatching-parallel-agents/SKILL.md`

## Keep / drop

- Keep:
  - One agent per independent problem domain; group work by what is broken, not
    by what is convenient.
  - Focused, self-contained prompts: specific scope, clear goal, explicit
    constraints, and the expected output. Each agent carries the exact context it
    needs and never inherits the coordinator's session.
  - Dispatch in parallel: issue every subagent call in the same response so they
    run concurrently; one call per response is sequential.
  - Review and integrate afterward: read each summary, check for conflicts, run
    the full suite, and integrate the changes.
  - The explicit do-not-use cases: related failures (fixing one may fix others),
    shared state (agents would interfere), needing full-system context, and
    exploratory debugging when you do not yet know what is broken.
- Drop:
  - External kit references and `plugin:skill` prefixes.
  - The graphviz decision diagram and the session-specific worked example.
  - Harness-specific agent names from the source.

## Desired structure

Overview, When to Use, Process, Gates, Anti-patterns. Self-contained: no
`superpowers:` or `mattpocock-skills:` references in the body. The guard that
related or shared-state work is not parallelized stays prominent in When to Use,
Gates, and Anti-patterns; the skill never fans out dependent work. End the body
with the provenance HTML comment naming the source repo and path plus the
license.
