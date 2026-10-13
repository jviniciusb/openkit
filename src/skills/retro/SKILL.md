---
name: retro
description: Use when explicitly invoked after a session to improve the agent's working environment from what slowed the work down. Trigger on `@retro`, or on requests to run a retrospective, review how a session went, or turn the session's friction into concrete environment changes. Do not use mid-task or as a general code review.
---

# Retro

A retrospective turns the friction of a finished session into small, concrete changes to the environment the next session runs in.

## Overview

A retro looks back at one session and asks what slowed it down. The output is not a report and not a verdict on the work: it is a short list of proposed changes to the working environment, each one minimal and tied to a specific friction the session hit. An environment change is an instruction, a script, a check, a skill, or a default. The skill **proposes** those changes; the user decides which to accept. It never edits steering files, policy, or defaults on its own, and it needs no tracker or ticket to operate.

## When to Use

- The user invokes `@retro`, or asks for a retrospective on a session.
- A session finished and something about the environment made it slower or rougher than it needed to be.
- The user wants a session's friction turned into concrete environment changes.
- You want to propose improvements to instructions, checks, scripts, skills, or defaults.

Do not use this mid-task: it reviews a session after the fact, not the code under change. It is not a general code review.

## Process

### 1. Pick the session

Use the session the user names. If none is named, use the current one. Read the primary sources for that session: the session log on this machine, plus the artifacts it touched.

### 2. Review what slowed the work down

Walk the session and note each point where it stalled, backtracked, or repeated itself. Look for friction the environment caused rather than mistakes in the work itself. A long hunt for a file, an error a check would have caught, a wrong turn a clearer instruction would have prevented.

### 3. Look for candidates

Consider the categories below, and read the repo's own setup before proposing anything, so a check that already exists but is unwired or silently broken is the finding rather than a reinvention.

- **Navigation**: was it hard to find the right files? Are there hidden dependencies between files? Would a pointer make it easier?
- **Automated checks**: could lint, typing, tests, or a filesystem linter have caught an error the agent made? Is there a guardrail (pre-commit hook or CI job running the repo's own check command)? A repo with no guardrail is itself a finding.
- **Coding standards**: should the reviewer be given a new rule, or an existing rule removed or clarified?
- **Steering files**: is `AGENTS.md` or another instruction file large or full of no-ops, so that some guidance belongs in standards or a check instead?
- **Tool economy**: were there expensive tool calls that a cheaper path could have avoided?
- **Information access**: was a crucial piece of information unavailable, and could access be added (dev-server logs, read-only access to a service)?

### 4. Classify each violation

A **mechanical** violation (a fixed syntactic pattern, a banned API, an import shape, a file-location rule) gets a deterministic check: a linter rule, a pre-commit hook, or a CI job, whichever is cheapest for this repo. Default to the check over the written rule. Reserve a coding-standards document for genuine **judgement calls** (cross-file consistency, "matches the surrounding style") that no check could substitute for.

### 5. Propose minimal changes

For each friction, state the smallest change that would prevent it next time. Prefer one instruction, script, skill, or default over a broad overhaul, and keep the change tied to the friction that motivated it. Say what the change is, where it goes, and why it helps. Order the proposals by severity.

### 6. Wait for acceptance

Present the proposals and stop. Do not apply a change, edit policy, or alter a default until the user accepts it. When the user accepts some, apply exactly those; leave the rest untouched.

## Gates

- **Proposed, not applied.** Changes are presented for the user to accept; nothing is altered silently.
- **Minimal and specific.** Each change is the smallest one that addresses a friction the session actually hit.
- **Environment, not the work.** The change targets instructions, checks, scripts, skills, or defaults, not the code that happened to be under the session.
- **Mechanical violations get a check.** Prefer a deterministic check over a written rule for anything a check can catch.
- **No tracker required.** The retro stands alone; no ticket, issue, or tracker step is needed.
- **Ordered by severity.** The most consequential friction is addressed first.

## Anti-patterns

- Editing steering files, policy, or defaults without asking.
- Proposing a broad overhaul where one small change would do.
- Proposing a change with no friction behind it.
- Writing a rule where a deterministic check is possible.
- Turning the retro into a general code review or a verdict on the work.
- Requiring a tracker, ticket, or issue to record findings.
- Reporting friction without proposing what would prevent it next time.

<!-- generated by skill-recipe
from: mattpocock/skills@24fe0ef7737efae15c87225755e9f6f5965e4888 skills/engineering/retro/SKILL.md
license: MIT (dev-only snapshot: skill-sources/mattpocock-skills/LICENSE in the repo) -->
