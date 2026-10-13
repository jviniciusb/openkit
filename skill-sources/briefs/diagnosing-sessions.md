# Skill brief: diagnosing-sessions

## Target id

`diagnosing-sessions`

## Trigger / description

Use when explicitly invoked to investigate why a past agent session went wrong.
Trigger on `@diagnosing-sessions`, or on requests to diagnose, review, or explain
a session that stalled, repeated work, ignored a plan, ran over budget, or
produced a poor result, for the current session or one named by id or path. Do not
use to run the session's work or to change the environment.

## Intent

Produce a forensic report of a session that went wrong. Success: the problem is
scoped with the user before analysis, the session is resolved to a verified
transcript, the report gives a timeline of what happened and where it diverged
from intent, and every finding carries a file/line or log citation. The skill
reports findings; it never silently "fixes" the session or mutates the
environment.

## Source paths

- `skill-sources/superpowers/skills/diagnosing-superpowers/SKILL.md`

## Keep / drop

- Keep:
  - Scoping the problem with the user before any analysis: the session, the turn
    range if known, what was expected, what happened, and the observable they care
    about.
  - Resolving the session to a verified absolute transcript path, confirming a
    past session by quoting its first prompt and timestamp, listing rejected
    candidates, and enumerating subagent transcripts.
  - Reading the reported region yourself, then dispatching one analyst subagent
    per dimension in parallel, each given an absolute transcript path.
  - A forensic report: a timeline of what happened, where it diverged from
    intent, and evidence with file/line or log citations.
  - Every number (time, tokens, cost) computed from the transcript or a command
    you ran, never from memory.
  - Read-only handling of session files, human prompts only as the user's words,
    and reporting rather than fixing.
- Drop:
  - External references; upstream branding (`superpowers`); the `superpowers`
    workspace and issue-filing conventions.
  - The source's `prompts/`, `templates/`, and `references/` sibling directories
    and their pointers.
  - The bundle-export and scrubbing pipeline; the issue-tracker search and filing
    steps.

## Desired structure

Overview, When to Use, Process, Gates, Anti-patterns. Self-contained: no
`superpowers:` or `mattpocock-skills:` references in the body. The skill must
report with citations and must not silently mutate the environment: no session
file is modified, moved, or deleted, and no fix is applied without the user
asking. End the body with the provenance HTML comment naming the source repo and
path plus the license.
