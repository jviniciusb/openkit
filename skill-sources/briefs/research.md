# Skill brief: research

## Target id

`research`

## Trigger / description

Use when you need cited findings from primary sources (official docs, source
code, upstream repos, specs, first-party APIs) to settle a factual question
before deciding or designing. Trigger on requests to research a topic, gather
docs or API facts, or verify a claim. Do not use when the answer is already
settled or the work is a matter of opinion.

## Intent

Settle a factual question with evidence rather than recall. Success: every claim
traces to a primary source that owns it, established fact is separated from
inference, anything unverified is said to be unverified, and the findings come
back structured and cited rather than as prose opinion.

## Source paths

- `skill-sources/mattpocock-skills/skills/engineering/research/SKILL.md`

## Keep / drop

- Keep:
  - Dispatching a background subagent to do the search, so the main thread keeps
    working while the reading happens.
  - Investigating against primary sources (official docs, source code, specs,
    first-party APIs), never a secondary write-up of them; follow every claim
    back to the source that owns it.
  - Citing a primary source (URL or file path) for every claim.
  - Returning structured findings, not prose opinions.
  - Distinguishing established fact from inference.
  - Stating plainly when something could not be verified.
- Drop:
  - External kit references and `plugin:skill` prefixes.
  - Tracker-specific instructions (where to file notes, repo note conventions).

## Desired structure

Overview, When to Use, Process, Gates, Anti-patterns. Self-contained: no
`superpowers:` or `mattpocock-skills:` references in the body. If the harness has
no background subagent, the skill degrades to a foreground lookup instead of
failing. End the body with the provenance HTML comment naming the source repo and
path plus the license.
