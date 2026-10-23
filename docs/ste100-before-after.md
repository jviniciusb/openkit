# Structural pass for agent instructions

A style reference, not a gate. There is no word or sentence limit here: the goal
is to remove ambiguity, not to cut words. Apply it to text an agent must parse
without asking a follow-up question: injected rules, skill steps, `AGENTS.md`
lines, tool descriptions.

The rules themselves live in `src/skills/writing-for-agents/SKILL.md`, step 8.
This file shows one real rewrite from the kit.

## Before

Excerpt of the `careful-changes` rule in `src/tools/context-injections/index.ts`:

> Before editing, read the relevant code and trace the real flow. Optimize for
> the best coherent end state, not the smallest diff: when adding a feature,
> change or refactor existing design where that materially improves the
> integrated result, rather than preserving structure because it is already
> there. Keep refactors within the request and any agreed scope; do not expand
> behavior or scope without authorization. Get explicit user approval before
> destructive or externally visible actions unless the user authorized that
> specific action. Re-read each target immediately before changing it, and
> preserve unrelated or concurrent work.

## After

> Before you edit, read the relevant code and trace the real flow. Optimize for
> the best coherent end state, not the smallest diff. When you add a feature,
> change or refactor the existing design where that materially improves the
> integrated result. Do not preserve a structure only because it is already
> there. Keep refactors within the request and any agreed scope. Do not expand
> behavior or scope without authorization. Ask for explicit user approval before
> a destructive or externally visible action, unless the user already authorized
> that specific action. Re-read each target immediately before you change it.
> Preserve unrelated or concurrent work.

## What changed

| Rule | Before | After |
|---|---|---|
| Condition beside action | "...rather than preserving structure because it is already there" trails the command | "Do not preserve a structure only because it is already there." |
| Condition beside action | "Get explicit user approval ... unless the user authorized..." reads as optional | "Ask for explicit user approval ..., unless the user already authorized that specific action." |
| One action per sentence | One sentence carries two instructions and their exception | One sentence per instruction |
| Verb, not its noun | "Before editing" | "Before you edit" |
| Nothing dropped | "destructive or externally visible actions" | "a destructive or externally visible action" |

## Kept on purpose

- "where that materially improves the integrated result" keeps its hedge: a
  stronger rule ("always refactor") would change the behavior.
- "where the project supports them" stays conditional; not every repo has tests.
- "unless the user already authorized that specific action" stays an exception,
  not a general permission.
- "prefer" and "when it fits" elsewhere in the kit's rules are calibrated
  strength. Tighten structure, never strength.

## Boundaries

- Do not rewrite trigger text (`description:` frontmatter) into controlled
  vocabulary. Those strings exist to match a request, and narrowing the words
  costs matches.
- ASD-STE100 is free to download but copyrighted. Do not paste its dictionary or
  rule text into the repo.
