# Skill brief: handoff

## Target id

`handoff`

## Trigger / description

Use when you want to compact the current conversation into a portable handoff
document that another session (or you, later) can resume from. Trigger on
requests to hand off, write a handoff, summarize where we are, or capture state
for a fresh session.

## Intent

Compact the current conversation into a single portable document a fresh session
can resume from with no other memory. Success: the document is self-contained,
concise, written to a location the user can reach, and carries the current state,
the decisions made and why, the open threads, the immediate next action, and
pointers to the artifacts involved.

## Source paths

- `skill-sources/mattpocock-skills/skills/productivity/handoff/SKILL.md`

## Keep / drop

- Keep:
  - Capturing the essentials another session needs: current state, decisions
    made and why, open threads and questions, the immediate next action, and
    pointers (files, paths, commands).
  - Keeping the document concise and self-contained so a fresh session can resume
    from it alone.
  - Referencing existing artifacts (specs, plans, commits, diffs) by path or URL
    instead of duplicating their content.
  - Redacting sensitive information such as API keys, passwords, and personally
    identifiable information.
- Drop:
  - External kit references and `plugin:skill` prefixes.
  - The "suggested skills" section that names skills for the next agent to call.
  - ADR/glossary requirements.

## Desired structure

Overview, When to Use, Process, Gates, Anti-patterns. Self-contained: no
`superpowers:` or `mattpocock-skills:` references in the body. The document is
written to a portable location chosen by the user (a path they name, or the
repo/workspace root), never to the dev-only `skill-sources/` directory. End the
body with the provenance HTML comment naming the source repo and path plus the
license.
