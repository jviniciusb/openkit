# Skill brief: verification

## Target id

`verification`

## Trigger / description

Use when about to claim work is complete, fixed, or passing, before committing or
reporting success. Trigger on any statement of completion or satisfaction about
work state, and before committing, opening a PR, or reporting a task done. Do not
use for in-progress updates that assert no success.

## Intent

Make completion claims evidence-backed. Success: every success claim is backed by
a fresh run of the check that proves it, against the current tree, with its output
shown; the check is scoped to the change at hand rather than a blanket re-run of
everything; and any check that could not be run is reported as unrun, never
implied to pass.

## Source paths

- `skill-sources/superpowers/skills/verification-before-completion/SKILL.md`

## Keep / drop

- Keep:
  - No completion claim without fresh verification evidence: run the command or
    test that proves the claim for the change at hand, and show its output.
  - The claim is only as good as evidence from the CURRENT tree; a prior run, a
    different branch, or a cached result does not count.
  - Report any check that could not be run, plainly.
  - Verify a delegated "success" independently before relaying it.
- Drop:
  - External kit references and `plugin:skill` prefixes.
  - The source's TDD red-green "regression tests" pattern.
  - The source's "re-read the plan" requirement (no TDD ceremony, no plan file).

## Desired structure

Overview, When to Use, Process, Gates, Anti-patterns. Self-contained: no
`superpowers:` or `mattpocock-skills:` references in the body. Verification stays
scoped to the claim: it must not become a blanket "run everything" mandate. End
the body with the provenance HTML comment naming the source repo and path plus
the license.
