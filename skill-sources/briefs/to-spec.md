# Skill brief: to-spec

## Target id

`to-spec`

## Trigger / description

Use when explicitly invoked to turn the current conversation into a written spec.
Trigger on requests to write up what we have discussed as a spec, capture the
decisions so far, or produce a spec from this conversation. Do not use to
interview the user or to gather new requirements.

## Intent

Synthesize the current conversation into a written spec, without interviewing the
user for new requirements. Success: the spec preserves the exact decisions
already made, invents nothing, keeps undecided items as open questions, and lands
at the location the user names.

## Source paths

- `skill-sources/mattpocock-skills/skills/engineering/to-spec/SKILL.md`

## Keep / drop

- Keep:
  - Synthesizing the current conversation into a spec with clear sections
    (summary, intent/context, requirements, non-goals, open questions).
  - Preserving the exact decisions already made; never invent requirements.
  - Writing the spec to a location the user names.
  - Keeping undecided items as open questions rather than filling them in.
  - Reporting where the spec was written.
- Drop:
  - External kit references and `plugin:skill` prefixes.
  - Tracker-specific instructions (publishing to an issue tracker, triage
    labels, `/setup-*` commands).
  - The source's inline spec template; replace it with the kit's own section
    list.

## Desired structure

Overview, When to Use, Process, Gates, Anti-patterns. Self-contained: no
`superpowers:` or `mattpocock-skills:` references in the body. The spec is
written to the path the user names, with no interview for content. End the body
with the provenance HTML comment naming the source repo and path plus the
license.
