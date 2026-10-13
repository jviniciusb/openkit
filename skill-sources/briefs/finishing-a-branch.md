# Skill brief: finishing-a-branch

## Target id

`finishing-a-branch`

## Trigger / description

Use when implementation is complete and the tests pass and the branch needs to be
landed, kept, or discarded. Trigger on requests to finish, merge, land, or open a
PR for a branch, and on the question of what to do with completed work. Do not use
before the work is done or while tests are failing.

## Intent

Land completed work safely, or leave it deliberately in place. Success: the test
suite is verified green before any landing decision, the environment (normal repo,
linked worktree, detached HEAD) is detected so the right menu and cleanup apply,
the human picks from a fixed landing menu rather than the agent choosing for them,
discarding happens only after an explicit typed confirmation, and a local merge is
verified on the merged result before any cleanup.

## Source paths

- `skill-sources/superpowers/skills/finishing-a-development-branch/SKILL.md`
- `skill-sources/mattpocock-skills/skills/engineering/pr/SKILL.md`

## Keep / drop

- Keep:
  - Verify the full test suite first, and stop if it is red; the menu comes after a
    green suite.
  - Detect the environment: normal repo, linked worktree on a named branch, or
    detached HEAD. This selects the menu and how cleanup works.
  - Determine and confirm the base branch before merging; a wrong base is expensive
    to undo.
  - Present the landing menu: merge locally, push and open a PR, or keep as-is.
    Integration is the human's decision; wait for their choice.
  - Discard only in response to an explicit request, gated on a typed confirmation
    that lists what will be permanently deleted.
  - On a local merge, verify the tests on the merged result before removing the
    worktree or deleting the branch; a red merged result stops everything.
  - On a push-and-PR, keep the worktree for iterating on PR feedback, and report the
    PR URL.
  - The PR body shape: Summary (smallest view that makes the point), Evidence
    (before/after, concrete), and Merge Danger (one-way vs two-way door, blast
    radius), plus an explicit "is this safe to merge" call.
- Drop:
  - External kit references and `plugin:skill` prefixes.
  - Any destructive action without explicit confirmation.
  - The upstream `.worktrees/`-ownership heuristic and its "Superpowers created this
    worktree" cleanup guidance: adapt to the host's worktree tool, since worktrees
    may be host-owned.
  - The source `pr` skill's `GLOSSARY.md` pointer.

## Desired structure

Overview, When to Use, Process, Gates, Anti-patterns. Self-contained: no
`superpowers:` or `mattpocock-skills:` references in the body. The skill never
discards or force-deletes without an explicit typed confirmation, and never merges
a red branch. End the body with the provenance HTML comment naming both source
repos and paths plus the license.
