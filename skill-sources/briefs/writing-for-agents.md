# Skill brief: writing-for-agents

## Target id

`writing-for-agents`

## Trigger / description

Use when authoring or editing a document an agent will consume: instructions, a
spec, an `AGENTS.md` or `CLAUDE.md`, a doc reached by a pointer, or a skill.
Trigger on drafting, reviewing, or pruning agent-facing text. Do not use for
prose written only for humans, and do not use it as a substitute for the
skill-specific packaging rules in the skill-recipe rubric.

## Intent

Make agent-facing documents predictable, so the agent takes the same process on
every run rather than the same output. Success: material sits where the agent
needs it, pointers fire reliably, steps close on checkable completion criteria,
and every line earns its load.

## Source paths

- `skill-sources/mattpocock-skills/skills/productivity/writing-for-agents/SKILL.md`

## Keep / drop

- Keep:
  - Context pointers over restatement: a pointer names out-of-context material
    and encodes the condition for reaching it; sharpen the wording before inlining.
  - Separating context load (always-loaded material on the agent's window) from
    cognitive load (the cost on the human of knowing what exists and when to
    reach for it).
  - The information hierarchy with progressive disclosure: in-file step, then
    in-file reference, then disclosed reference behind a pointer; inline what
    every branch needs, disclose what only some branches reach.
  - Explicit completion criteria: clarity (done versus not-done, guarding against
    premature completion) and demand (how much the criterion forces).
  - Leading words: a compact pretrained concept repeated as a token to anchor
    behavior; reach for an existing word first.
  - Positive phrasing: state the target behavior so the banned one is never
    spoken.
  - Unambiguous instruction shape: condition beside action, one action per
    sentence, nothing dropped (subject, verb, article), one term per concept,
    the verb over its noun form, a list for sequences and gate sets, and every
    calibrated hedge ("prefer", "when it fits", "may", "unless") kept at its
    original strength during an edit.
  - Pruning: single source of truth, the environment as a source of truth, and
    the failure mode of sediment and no-ops.
- Drop:
  - External kit references and `plugin:skill` prefixes.
  - Em-dashes (house rule).
  - The source's `SKILL-MECHANICS.md` sibling-file pointer (skill-specific
    packaging belongs to the skill-recipe rubric).

## Boundary

This is general authoring guidance for any document an agent consumes. It does
not replace `src/skills/skill-recipe/rubric.md`, which keeps the skill-specific
rules. Do not duplicate the rubric.

## Desired structure

Overview, When to Use, Process, Gates, Anti-patterns. Self-contained: no
`superpowers:` or `mattpocock-skills:` references in the body. End the body with
the provenance HTML comment naming the source repo and path plus the license.
