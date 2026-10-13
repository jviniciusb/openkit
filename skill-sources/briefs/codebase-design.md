# Skill brief: codebase-design

## Target id

`codebase-design`

## Trigger / description

Use when designing modules and interfaces, or reviewing a structure for depth
and locality. Trigger on deciding where a seam goes, shaping a module's
interface, judging whether a module is deep or shallow, or making code more
testable or navigable. Do not use for routine implementation inside an
already-settled design.

## Intent

Give a shared vocabulary and a few principles for designing **deep modules**: a
lot of behaviour behind a small interface, at a clean seam, testable through
that interface. Success: the design maximizes leverage for callers and locality
for maintainers, the interface is treated as the test surface, and no seam is
introduced without something that actually varies across it.

## Source paths

- `skill-sources/mattpocock-skills/skills/engineering/codebase-design/SKILL.md`

## Keep / drop

- Keep:
  - The deep-module vocabulary: **module**, **interface**, **implementation**,
    **seam**, **adapter**, **depth**, **leverage**, **locality**.
  - **Depth is a property of the interface, not the implementation**: a deep
    module can be internally composed of small, swappable parts that are not
    part of its interface.
  - **The interface is the test surface**: callers and tests cross the same
    seam; testing past the interface means the module is the wrong shape.
  - **One adapter means a hypothetical seam; two adapters means a real one**:
    do not introduce a seam unless something actually varies across it.
  - Prefer **depth and locality** over shallow sprawl (large interface, thin
    implementation). The deletion test: if deleting the module scatters its
    complexity across N callers, it earned its keep.
  - Designing for testability: accept dependencies rather than create them,
    return results rather than produce side effects, keep the surface small.
- Drop:
  - External kit references and `plugin:skill` prefixes.
  - The glossary and ADR requirements; the vocabulary is woven into the prose
    instead of mandated as a separate artifact.
  - The source's `DEEPENING.md` and `DESIGN-IT-TWICE.md` sibling-file pointers.
  - The "rejected framings" essay (Ousterhout ratio, TypeScript `interface`
    keyword, DDD "boundary"); state the preferred term positively instead.

## Desired structure

Overview, When to Use, Process, Gates, Anti-patterns. Self-contained: no
`superpowers:` or `mattpocock-skills:` references in the body. The
"one adapter is a hypothetical seam" rule and the depth/locality preference must
appear in the Gates and Anti-patterns; the glossary/ADR requirement must not
return. End the body with the provenance HTML comment naming the source repo and
path plus the license.
