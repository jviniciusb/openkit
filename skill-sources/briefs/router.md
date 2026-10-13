# Skill brief: router

## Target id

`router`

## Trigger / description

Use when explicitly invoked to be pointed at the right opencode-kit skill or flow
for a request. Trigger on requests to route a situation to a skill, to ask which
skill or flow fits, or what to do next. Do not use to run the work the skill
names.

## Intent

Turn a user's request into one recommendation: the kit skill or flow that fits,
and the reason it fits. Success: the router names a real skill id, says why it
fits, and stops there, leaving the invocation and any sequence to the user. It is
a pointer, never an enforced chain.

## Source paths

- `skill-sources/mattpocock-skills/skills/engineering/ask-matt/SKILL.md`

## Keep / drop

- Keep:
  - Given the user's request, name the right skill or flow and why it fits.
  - Cover the kit's user-invoked skills (`@sdd-flow`, `@skill-recipe`,
    `@handoff`, `@retro`, `@finishing-a-branch`, `@to-spec`,
    `@improve-codebase-architecture`, `@router`, `@diagnosing-sessions`) and when
    to reach for a model-visible one.
  - Keep it a pointer, not an enforced chain.
- Drop:
  - External kit references and `plugin:skill` prefixes.
  - Upstream branding (`ask-matt`).
  - The source's `PHASE-BOUNDARIES.md` sibling-file pointer.

## Desired structure

Overview, When to Use, Process, Gates, Anti-patterns, plus a routing list of the
kit's user-invoked skills and its model-visible ones. Self-contained: no
`superpowers:` or `mattpocock-skills:` references in the body. End the body with
the provenance HTML comment naming the source repo and path plus the license.
