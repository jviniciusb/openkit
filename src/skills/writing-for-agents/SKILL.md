---
name: writing-for-agents
description: Use when writing or editing a document an agent will consume: instructions, a spec, an `AGENTS.md` or `CLAUDE.md`, a doc reached by a pointer, or a skill. Trigger on drafting, reviewing, or pruning agent-facing text. Do not use for human-only prose, or as a substitute for the skill-specific packaging rules in the skill-recipe rubric.
---

# Writing for Agents

An agent consumes a document by running a process, not by reading it once. Write so that process lands on the intended behavior on every run.

## Overview

Every document an agent consumes is a set of levers that make its behavior predictable. The packaging differs (a skill, an `AGENTS.md`, a spec, a doc reached by a pointer); the writing does not. The agent takes the same process each run, so the goal is not the same output but the same reliable path: material sits where the agent needs it, pointers fire when they should, steps close on a checkable bound, and every line earns the load it spends.

## When to Use

- You are authoring or editing a skill, an `AGENTS.md` or `CLAUDE.md`, a spec, or a doc reached by a pointer.
- An agent keeps missing, misreading, or over-applying existing instructions.
- You are pruning a document that has grown long, stale, or repetitive.

This is general authoring guidance. Skill-specific packaging rules live in the skill-recipe rubric, not here.

## Process

### 1. Point to material, do not restate it

A **context pointer** names out-of-context material and encodes the condition for reaching it. A skill's description is one; a line in `AGENTS.md` naming a doc is the same object. The pointer's wording, not its target, decides when the agent reaches the material, and how reliably. A must-have target behind weakly worded pointer is a variance bug: sharpen the wording first, and inline the material only if sharpening fails.

A pointer does two jobs: state what the material is, and list the distinct branches that should trigger reaching it. Front-load the leading word, keep one trigger per branch, and cut identity the body already carries. Every word of an always-loaded pointer costs on every turn, so it earns harder pruning than the body.

### 2. Spend the right load

Every document and pointer you add spends one of two budgets:

- **Context load** is the cost of always-loaded material on the agent's window: an `AGENTS.md` line, a skill description, anything sitting in context every turn, spending tokens and attention whether or not it fires.
- **Cognitive load** is the cost on the human: which documents exist and when to reach for each. The human is the index. It is not a cost to minimise blindly: it is the price of human agency, so spend it where human judgement matters and remove it where it does not.

Material reached only through a pointer escapes context load at the price of the pointer's own line; material with no pointer at all rides entirely on cognitive load.

### 3. Rank material on the information hierarchy

A document is built from two content types: **steps** (the ordered actions the agent performs) and **reference** (definitions, rules, facts consulted on demand). The two mix freely. The core decision is where each piece sits on the information hierarchy, a ladder ranked by how immediately the agent needs it:

1. **In-file step** is the primary tier: what the agent does, in order.
2. **In-file reference** is consulted on demand. A flat peer-set (every rule on one rung) is a fine arrangement, not a smell.
3. **Disclosed reference** is pushed out into a separate file, reached by a pointer, and loaded only when the pointer fires.

**Progressive disclosure** is the move down the ladder, out of the main file and behind a pointer, so the top stays legible. It is not primarily a token optimisation: it is how the hierarchy is protected. Branching is the cleanest disclosure test: inline what every branch needs, and disclose what only some branches reach. When a document has steps, in-file reference that should be disclosed buries them and turns attending to them into a coin flip.

Push too little down and the top bloats; push too much and you hide material the agent needs. That tension is the whole decision.

### 4. Close every step with a completion criterion

A **completion criterion** is the condition that tells the agent the work is done. Two properties make it a lever:

- **Clarity**: can the agent tell done from not-done? A vague bound invites **premature completion**, ending the step before it is genuinely done. Sharpen the bound first, since that is local and cheap; only if it is irreducibly fuzzy, split the sequence so the later steps leave context. Splitting works across a real context boundary (a hand-off or a subagent dispatch).
- **Demand**: how much the criterion requires. "Every modified model accounted for" forces thorough work where "produce a change list" does not. Demand is not step-bound: an exhaustiveness bar binds a body of flat reference just as it binds a sequence.

The strongest criteria are both checkable and exhaustive.

### 5. Compress with leading words

A **leading word** is a compact concept already living in the model's pretraining that the agent thinks with (_lesson_, _fog of war_, _tracer bullets_). Repeated as a token, never as a sentence, it accumulates a distributed definition and anchors a whole region of behavior in the fewest tokens. Reach for an existing word first: a made-up word recruits no priors and costs in definition tokens what a pretrained word gives free.

It anchors twice: in the body it focuses execution, and in a pointer it drives invocation. When the same word lives in your prompts, your docs, and your codebase, the agent links that shared language to the material and reaches it more reliably. Assume every document carries restatements a leading word can retire, and go find them.

### 6. Phrase positively

Steering by prohibition drags the forbidden behavior into context and makes it more available, not less. Prompt the **positive**: state the target behavior ("write one-line comments") so the banned one is never spoken. A prohibition earns its place only as a hard guardrail you cannot phrase positively; even then, pair it with the positive target so attention lands on what to do.

### 7. Prune duplication and sediment

- Keep each meaning in a **single source of truth**, so changing the behavior is a one-place edit. **Duplication** costs maintenance and tokens, and inflates a meaning's prominence past its real rank.
- The **environment** is a source of truth too (`package.json` scripts, config files, the directory layout, `--help` output). A document that restates it is a **cache**: a copy of a lookup, earning its load only when the lookup is expensive. Cache the unwritten convention, the reason behind a choice, the gotcha no config confesses; leave one-file, one-command lookups to the environment.
- Check every line for **relevance**: does it still bear on what the document does? Shorter documents are easier to keep relevant. Without a pruning discipline the default fate is **sediment**: stale layers that settle because adding feels safe and removing feels risky.
- Hunt **no-ops** sentence by sentence: an instruction the model already obeys by default pays load to say nothing. The test is whether it changes behavior versus the default. When a sentence fails, delete the whole sentence rather than trim words from it.

## Gates

- **Every piece sits on the hierarchy where the agent needs it.** Steps stay up; disclosed reference goes behind a pointer.
- **Pointers are sharp enough to fire.** The wording names the material and the branches that reach it.
- **Steps close on a completion criterion that is checkable and exhaustive.**
- **One meaning, one place.** No duplication, no caching a lookup the environment answers.
- **Every line earns its load.** No-ops and stale layers are deleted, not trimmed.

## Anti-patterns

- Restating material a pointer could name.
- Burying steps under reference that should be disclosed.
- Vague completion bounds that invite premature completion.
- Coining a word where a pretrained one already exists.
- Steering by prohibition where a positive target would do.
- Duplicating a meaning, or caching a lookup the environment already answers.
- Letting stale layers settle instead of pruning them.

<!-- generated by skill-recipe
from: mattpocock/skills@24fe0ef7737efae15c87225755e9f6f5965e4888 skills/productivity/writing-for-agents/SKILL.md
license: MIT (dev-only snapshot: skill-sources/mattpocock-skills/LICENSE in the repo) -->
