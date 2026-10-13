# Skill brief: sdd-flow

## Target id

`sdd-flow` (evolved in place; registered `autoinvoke: false`)

## Trigger / description

Use ONLY when the user explicitly invokes this flow, by typing `@sdd-flow` or
saying "use the sdd flow", "spec-driven development", "let's spec-drive this",
or a similar explicit request. Never auto-activate for generic feature work,
bug reports, or creative requests.

## Intent

Evolve the existing orchestrating flow into a self-contained one. It takes the
work from specification through delivery: align on the design, write one
approved spec that carries both the design and the dependency-ordered steps,
set up isolated workspaces, then run an execution loop where each step is
implemented by a subagent and reviewed independently. Success: the flow is
self-contained (no external skill references), composes the kit's `interview`,
`research`, and `code-review` skills by id, keeps the frontier gate, and drops
the rejected ceremony.

## Source paths

- `src/skills/sdd-flow/SKILL.md` (current revision, the starting point)
- `skill-sources/superpowers/skills/subagent-driven-development/SKILL.md`
- `skill-sources/superpowers/skills/executing-plans/SKILL.md`
- `skill-sources/superpowers/skills/verification-before-completion/SKILL.md`
- `skill-sources/mattpocock-skills/skills/engineering/implement-spec/SKILL.md`
- `skill-sources/mattpocock-skills/skills/engineering/to-spec/SKILL.md`
- `skill-sources/mattpocock-skills/skills/engineering/to-tickets/SKILL.md`

## Keep / drop

- Keep:
  - Explicit invocation only.
  - Phases: Spec, Workspace, Execution loop, Wrap-up.
  - The frontier gate: present the startable steps and a recommendation, then
    STOP for the user to choose; never start in the same message.
  - The approved spec as the single artifact carrying design plus
    dependency-ordered steps (no separate plan file).
  - Execution findings carried forward to later steps.
  - Subagent-per-task with an independent reviewer per task; parallel execution
    for independent tracks; verification with fresh evidence before claiming a
    step done.
- Compose (by skill id): `interview` to align on the design, `research` to
  settle facts, `code-review` to review each step.
- Inline: the "fresh evidence before claiming done" rule; the seam vocabulary
  (module / interface / seam / adapter / depth; the interface is the test
  surface; one adapter is a hypothetical seam); a short root-cause
  bug-diagnosis step (reproduce, isolate, hypothesize, verify the fix).
- Drop:
  - Every external skill reference (`superpowers:*`, `mattpocock-skills:*`, and
    bare ids such as `domain-modeling`).
  - TDD red-green-refactor ceremony.
  - Any separate plan file.
  - Glossary / ADR requirements.
  - Any mandatory issue tracker.
  - The `Explore`-agent brand name (say "read-only exploration subagents").

## Desired structure

Phases Spec, Workspace, Execution loop, Wrap-up, plus a re-sync phase and
Anti-patterns. Self-contained: no external invocation references in the body.
End the body with the provenance HTML comment naming the sources and the
license.
