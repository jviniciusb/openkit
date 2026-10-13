# Skill brief: wizard

## Target id

`wizard`

## Trigger / description

Use when a step needs the human to do something an agent cannot (credentials,
approvals, external consoles) and a guided interactive script would help.
Trigger on requests to set up credentials or CI secrets, provision
infrastructure, walk an unfamiliar third-party dashboard, or run a one-off
migration or cutover. Do not use for steps the agent can perform itself.

## Intent

Turn a human-only procedure into a small interactive script that guides the
human step by step. Success: the wizard opens each URL before asking for its
value, captures and validates every value, writes each one where it belongs,
never hardcodes or echoes a secret, and is safe to re-run without duplicating or
corrupting state.

## Source paths

- `skill-sources/mattpocock-skills/skills/engineering/wizard/SKILL.md`

## Keep / drop

- Keep:
  - Generate a small interactive script that walks the human through the steps
    only they can perform (credentials, approvals, external consoles).
  - Clear, focused prompts with progress (stage N of M) and one task per stage.
  - Open the console or docs before asking for the value they produce.
  - Validate input and re-prompt rather than persisting a bad value.
  - Never hardcode or echo secrets; read them with hidden entry.
  - Safe to re-run: idempotent writes and a procedure a human can resume.
  - Confirm before any irreversible action.
  - Trace the script statically instead of running it end-to-end.
- Drop:
  - External kit references and `plugin:skill` prefixes.
  - Any tracker pointer.
  - The source's `template.sh` sibling library: describe the wizard shape inline
    instead of shipping or pointing at a support file.

## Desired structure

Overview, When to Use, Process, Gates, Anti-patterns. Self-contained: no
`superpowers:` or `mattpocock-skills:` references in the body. The Gates and
Anti-patterns state the no-secret rule (never hardcode or echo a secret) and the
safe-to-re-run rule (idempotent, resumable). End the body with the provenance
HTML comment naming the source repo and path plus the license.
