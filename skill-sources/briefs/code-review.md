# Skill brief: code-review

## Target id

`code-review`

## Trigger / description

Use when reviewing a change (a diff, a PR, or a completed task) before it
merges, and when receiving review feedback. Trigger on requests to review a
branch, PR, or diff, and when handed review comments to act on.

## Intent

Review a change along two independent axes, Standards and Spec, so neither masks
the other, and report findings by severity. On the receiving side, treat each
finding as a claim to verify against the actual code and the rule it cites before
applying it, rejecting it, or finding a better fix. Success: no invented
findings, each axis reported separately, and every accepted or rejected finding
carries its reason.

## Source paths

- `skill-sources/mattpocock-skills/skills/engineering/code-review/SKILL.md`
- `skill-sources/superpowers/skills/requesting-code-review/SKILL.md`
- `skill-sources/superpowers/skills/receiving-code-review/SKILL.md`

## Keep / drop

- Keep:
  - Independent review of a diff.
  - TWO axes reviewed in parallel: Standards (quality/conventions) and Spec
    (does it match the requirements/plan).
  - Findings categorized by severity (Critical/Important/Minor).
  - On the receiving side, verify EACH finding against the actual code and the
    rule it cites, then apply / reject / find a better fix, stating the reason.
- Drop:
  - External kit references.
  - Any tool-specific dispatch mandate.

## Desired structure

Overview, When to Use, Process (reviewing a change; receiving review feedback),
Gates, Anti-patterns. Self-contained: no `superpowers:` or `mattpocock-skills:`
references in the body. An empty diff is reported as such, never padded with
invented findings. End the body with the provenance HTML comment naming all
three sources and the license.
