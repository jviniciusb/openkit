# Skill brief: retro

## Target id

`retro`

## Trigger / description

Use when explicitly invoked after a session, to improve the agent's working
environment from what slowed the work down. Trigger on `@retro`, or on requests
to run a retrospective, review how a session went, or turn the session's friction
into concrete environment changes. Do not use mid-task or as a general code
review.

## Intent

Turn the friction of a finished session into concrete, minimal improvements to
the working environment. Success: the session is reviewed for what actually
slowed it down, each finding maps to one small change (an instruction, a script,
a skill, or a default) that would prevent the same friction next time, and the
changes are proposed to the user for acceptance rather than applied silently.

## Source paths

- `skill-sources/mattpocock-skills/skills/engineering/retro/SKILL.md`

## Keep / drop

- Keep:
  - Reviewing a finished session for what slowed the work down, with the user
    naming the session (defaulting to the current one).
  - Looking for improvement candidates in the categories that matter: navigation
    (pointers to the right files), automated checks and guardrails (lint, type,
    test, pre-commit, CI), coding standards for the reviewer, oversized steering
    files, tool economy, no-op instructions, and missing information access.
  - Classifying a violation as mechanical or a judgement call: mechanical ones
    want a deterministic check, judgement calls want a standard.
  - Preferring a change to the environment (instruction, script, skill, default)
    over a change to the code that happened to be under the session.
  - Keeping each change minimal and tied to a specific friction the session hit.
  - Proposing the changes for the user to accept, in order of severity, instead
    of altering policy on your own.
- Drop:
  - External kit references and `plugin:skill` prefixes.
  - Any mandatory tracker, ticket, or issue-filing step.
  - The source's `writing-for-agents` skill dependency and its writing-style
    guide hand-off.

## Desired structure

Overview, When to Use, Process, Gates, Anti-patterns. Self-contained: no
`superpowers:` or `mattpocock-skills:` references in the body. The skill proposes
changes and waits for the user to accept them; it never silently alters policy,
and it requires no tracker. End the body with the provenance HTML comment naming
the source repo and path plus the license.
