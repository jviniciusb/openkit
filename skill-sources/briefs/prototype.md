# Skill brief: prototype

## Target id

`prototype`

## Trigger / description

Use when a design question needs runnable code to answer, before committing to an
approach. Trigger on uncertainty about whether a state model or piece of logic
feels right, what an interface should look like, or which approach to take, when
the answer is cheaper to find by building than by reasoning. Do not use to build
production features.

## Intent

Resolve a design uncertainty with the smallest throwaway artifact. Success: the
prototype answers exactly one design question, stays out of the real code path,
is trivial to run, makes the uncertain state observable, reports what was learned,
and is deleted or clearly marked throwaway once the validated decision has been
folded into the real code.

## Source paths

- `skill-sources/mattpocock-skills/skills/engineering/prototype/SKILL.md`

## Keep / drop

- Keep:
  - Build the smallest throwaway artifact that answers ONE design question; the
    question decides the shape.
  - Keep the prototype out of the real code path; it never becomes the
    implementation.
  - Make it trivial to run, and surface the relevant state after every action so
    the answer is visible.
  - Report what was learned: the verdict and the question it settled.
  - Delete the prototype or clearly mark it as throwaway when done; the real code
    keeps only the validated decision.
  - Prefer the cheapest thing that resolves the uncertainty.
- Drop:
  - External kit references and `plugin:skill` prefixes.
  - The source's `LOGIC.md` / `UI.md` branch files and their kit-specific
    instructions.
  - Capturing the prototype to a throwaway branch with an issue pointer.

## Desired structure

Overview, When to Use, Process, Gates, Anti-patterns. Self-contained: no
`superpowers:` or `mattpocock-skills:` references in the body. The throwaway
prototype stays out of the real code path and is deleted or clearly marked as
throwaway when done; that rule is stated in the Gates and Anti-patterns. End the
body with the provenance HTML comment naming the source repo and path plus the
license.
