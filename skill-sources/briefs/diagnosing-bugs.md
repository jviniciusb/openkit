# Skill brief: diagnosing-bugs

## Target id

`diagnosing-bugs`

## Trigger / description

Use when a bug, failing test, or unexpected behavior must be root-caused before
fixing. Trigger on reports of something broken, throwing, failing, slow, or
otherwise misbehaving, and when a fix is proposed but the cause is not yet known.

## Intent

Root-cause a hard bug before touching production code. Success: the bug is
reproduced reliably, the repro is minimized to the smallest failing case, one
falsifiable hypothesis is tested at a time, the root cause is demonstrated before
any production change, and the fix is verified against the original symptom.

## Source paths

- `skill-sources/mattpocock-skills/skills/engineering/diagnosing-bugs/SKILL.md`
- `skill-sources/superpowers/skills/systematic-debugging/SKILL.md`

## Keep / drop

- Keep:
  - A gated diagnosis loop for hard bugs: reproduce reliably, isolate the
    smallest failing case, form ONE hypothesis at a time and test it, verify the
    root cause before changing production code, then verify the fix.
  - Building a tight, red-capable feedback loop that asserts the user's exact
    symptom, and tightening it (faster, sharper, more deterministic).
  - Minimizing the repro one element at a time until every remaining element is
    load-bearing.
  - Falsifiable hypotheses with an explicit prediction, tested one variable at a
    time.
  - Instrumentation that maps to a specific prediction, tagged so cleanup is a
    single grep.
  - A regression test at the correct seam when one exists; when none exists, that
    absence is itself the finding.
  - Redacting secrets from commands, outputs, and captured artifacts.
- Drop:
  - External kit references and `plugin:skill` prefixes.
  - Tracker-specific instructions (where to file notes, commit/PR conventions).
  - The source's requirement to generate 3-5 ranked hypotheses (superseded by
    one hypothesis at a time).
  - Glossary and ADR requirements.

## Desired structure

Overview, When to Use, Process, Gates, Anti-patterns. Self-contained: no
`superpowers:` or `mattpocock-skills:` references in the body. The skill must not
license a speculative fix: a production change requires a demonstrated root cause,
and that rule is stated in the anti-patterns. End the body with the provenance
HTML comment naming both sources and the license.
