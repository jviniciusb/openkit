# Skill brief: interview

## Target id

`interview`

## Trigger / description

Use when the user wants to align on design or requirements before implementation,
or asks to stress-test a plan, decision, or idea. Trigger on requests such as
"interview me", "grill me", or "let's align on the design", and on starting a
feature, component, or project whose intent is still fuzzy. Not for quick, fully
specified tasks.

## Intent

Turn a rough idea into a shared, written understanding before anything gets
built. Success: the design tree is fully visited, the frontier is empty, and the
user confirms you share an understanding while no implementation has started.

## Source paths

- `skill-sources/superpowers/skills/brainstorming/SKILL.md`
- `skill-sources/mattpocock-skills/skills/productivity/grilling/SKILL.md`
- `skill-sources/mattpocock-skills/skills/productivity/grill-me/SKILL.md` (vendored reference)
- `skill-sources/mattpocock-skills/skills/engineering/grill-with-docs/SKILL.md` (vendored reference)

## Keep / drop

- Keep:
  - superpowers `brainstorming`: the spike / bounded / architectural
    classification, and the hard gate that no implementation happens before the
    design or spec is approved.
  - pocock `grilling` / `grill-me`: rounds, the "frontier" of open questions asked
    together, a recommended answer per question, and looking facts up (research)
    mid-round instead of asking the user.
- Drop:
  - glossary / ADR requirements (from `grill-with-docs`).
  - enforced multi-skill chains (calling other skills by id).
  - TDD red-green-refactor ceremony and separate plan-file machinery.

## Desired structure

Overview, When to Use, Process, Gates, Anti-patterns. Self-contained: no
`superpowers:` or `mattpocock-skills:` references in the body. End the body with
the provenance HTML comment naming each source repo and path plus the license.
