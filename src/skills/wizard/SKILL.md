---
name: wizard
description: Use when a step needs the human to do something an agent cannot (credentials, approvals, external consoles) and a guided interactive script would help. Trigger on requests to set up credentials or CI secrets, provision infrastructure, walk an unfamiliar third-party dashboard, or run a one-off migration or cutover. Do not use for steps the agent can perform itself.
---

# Wizard

A wizard is a small interactive script that walks a human through the manual steps only they can take: opening a console, copying a value, approving an action. It turns a tedious procedure into a guided, repeatable script instead of something re-explained to an agent every time.

## Overview

Some steps live outside the agent's reach: a credential only a human can mint, an approval only a human can grant, a console only a human can click through. A wizard turns that procedure into a guided, interactive script. It opens each URL, says exactly what to click and copy, captures each value, writes it where it belongs, and confirms at every stage. The human is the actor; the script is the guide. Scope the procedure precisely, keep prompts clear, validate input, never hardcode or echo a secret, and make the script safe to re-run.

## When to Use

- A step needs the human to do something an agent cannot: mint credentials, grant an approval, click through an external console.
- A procedure is tedious to do by hand and tedious to re-explain every time.
- Setting up credentials or CI secrets, provisioning infrastructure, or configuring a third-party service.
- Running a one-off migration or cutover that needs human decisions along the way.
- Do not use for steps the agent can perform itself.

## Process

### 1. Scope the procedure

Read the repo before asking anything. Find every manual step and every value the human must produce: `.env`, `.env.example`, README, `docker-compose*`, framework config, and CI workflow files (each `secrets.*` or `vars.*` reference is a value the wizard must produce). For a migration or cutover, map the current state, the target state, and every irreversible action between them. Show the ordered stages and the values each produces, and confirm; the human may add, drop, or reorder.

Done when every stage is named in order and, for each captured value, you know where the human gets it, where it is written, and whether it is secret.

### 2. Map each stage's journey

For each stage, write the precise path a human follows: which URL to open, what to do there, where a value is shown, and which variable it fills (for example, "Dashboard, Developers, API keys, Reveal test key, copy"). Where you do not know the current UI or exact command, say so and ask or check the docs. Never invent a step that may not exist.

Done when every stage traces to concrete instructions a stranger could follow.

### 3. Author the wizard

Write one stage per step, in dependency order. Each stage clears the screen, shows progress (stage N of M), and focuses on one task so nothing the human needs scrolls away. Build the shape inline:

- **Stage**: clear the screen, print the stage heading and progress count, then run its steps.
- **Prompt**: say what to do, and open the URL before asking for the value it produces.
- **Capture**: read public values with a normal prompt; read secrets with hidden, non-echoing entry.
- **Validate**: reject empty or malformed input and re-prompt; never proceed on a value that cannot be used.
- **Persist**: write each persisted value idempotently (an upsert, not an append), and set CI secrets only for the values CI actually needs.
- **Confirm**: gate any irreversible action behind an explicit confirmation.
- **Finish**: print a closing summary of what was written and where.

A wizard is ephemeral by default: build it for one run, save it to a scratch or `scripts/` path, and delete it when the job is done. Commit it only when the user wants a repeatable setup path that should live in the repo.

### 4. Verify and hand off

Check the script statically with `bash -n` and `shellcheck` when available, then mark it executable. Do not run it end-to-end yourself; it opens browsers and blocks on human input. Trace it instead: every value from step 1 is captured and lands where step 1 said, and every CI secret name matches a `secrets.*` reference. Tell the user how to run it. If it is a repeatable setup path, commit it and link it from the README so the next person runs the script instead of asking an agent.

## Gates

- **Never hardcode or echo a secret.** Secrets are read with hidden entry, held only in memory or the destination store, and never printed, logged, or written into the script.
- **Idempotent and resumable.** Re-running the script does not duplicate values or corrupt state; a human can stop and resume without starting over.
- **One focused task per stage.** The current step is the only thing on screen; nothing the human needs has scrolled away.
- **Open before asking.** The URL is opened before its value is requested.
- **Validate before persisting.** A value is checked before it is written; bad input is re-prompted, not stored.
- **Confirm before the irreversible.** Any destructive or one-way action is gated behind an explicit confirmation.
- **Every value lands where step 1 said.** The captured set and the written set match.

## Anti-patterns

- Hardcoding a secret, or echoing one to the screen, a log, or a file the script does not own.
- A script that duplicates or corrupts state when re-run.
- Dumping a wall of steps into one stage so the current instruction scrolls away.
- Asking for a value without opening the console or docs that produce it.
- Inventing UI steps or commands that may not exist.
- Writing a value without validating it, or proceeding on an empty or malformed one.
- Running an irreversible action without a confirmation gate.
- Running the wizard end-to-end yourself instead of tracing it statically.

<!-- generated by skill-recipe
from: mattpocock/skills@24fe0ef7737efae15c87225755e9f6f5965e4888 skills/engineering/wizard/SKILL.md
license: MIT (dev-only snapshot: skill-sources/mattpocock-skills/LICENSE in the repo) -->
