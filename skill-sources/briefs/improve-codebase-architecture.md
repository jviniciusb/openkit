# Skill brief: improve-codebase-architecture

## Target id

`improve-codebase-architecture`

## Trigger / description

Use when explicitly invoked to survey a codebase for structural improvements.
Trigger on requests to review a codebase's architecture, find deepening
opportunities, or surface structural friction. Do not use for routine
implementation, and do not refactor as part of the survey.

## Intent

Survey a codebase for deepening opportunities and report them as a prioritized
list, so a human can choose what to change. Success: each candidate names the
concrete change and its payoff, the list is ordered by recommendation strength,
and the survey stays read-only. The skill proposes; it never auto-refactors.

## Source paths

- `skill-sources/mattpocock-skills/skills/engineering/improve-codebase-architecture/SKILL.md`

## Keep / drop

- Keep:
  - Surveying the codebase for **deepening opportunities**: shallow modules,
    leaky seams, duplicated responsibility.
  - Reporting candidates as a structured, **prioritized** list, each with the
    concrete change and its payoff (locality, leverage, testability).
  - The recommendation-strength signal: `Strong`, `Worth exploring`,
    `Speculative`.
  - Scoping before scanning: weight recently changed areas, or take the
    direction the user named.
  - The deletion test as the shallow-module check.
  - **Propose, never auto-refactor**: the survey is read-only, and the skill
    hands the choice of what to tackle back to the human.
- Drop:
  - External kit references and `plugin:skill` prefixes.
  - The glossary and ADR requirements; mention a conflict with a recorded
    decision only when the friction is real, without mandating the artifacts.
  - The source's `HTML-REPORT.md` sibling-file pointer; describe the report
    format inline instead.

## Desired structure

Overview, When to Use, Process, Gates, Anti-patterns. Self-contained: no
`superpowers:` or `mattpocock-skills:` references in the body. The read-only,
propose-never-refactor rule must appear in the Gates and Anti-patterns. End the
body with the provenance HTML comment naming the source repo and path plus the
license.
