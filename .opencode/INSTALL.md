# Install openkit

Instructions for an AI coding agent to install **openkit** into a user's
OpenCode V2 setup. If you can read this file, follow it.

> Canonical instruction to give an agent:
> *Fetch and follow instructions from
> https://raw.githubusercontent.com/jviniciusb/openkit/main/.opencode/INSTALL.md*

openkit is one OpenCode V2 plugin that hosts independently toggleable
items — tools, skills, and references. Installing it means: register the plugin,
seed its config, restart OpenCode, and verify. Do the four steps below in order
and report the result to the user.

## Before you start

- Confirm OpenCode V2 `>= 2.0.4` is installed (`opencode --version`).
- The CLI is in the repo (not on npm). If the user has a checkout they can run
  `bun bin/openkit.js <command>`; otherwise use the `/kit` command or edit
  the config by hand.
- Locate the user's OpenCode config. It may be `opencode.json` or
  `opencode.jsonc`, either globally (`~/.config/opencode/opencode.json`) or in
  the project root. Prefer the file the user already uses.

Never overwrite existing configuration. Preserve comments, formatting, and any
existing `plugins` entries. If a file does not parse, stop and ask the user
instead of replacing it.

## Step 1 — Add the plugin entry

> **Status:** `openkit` is distributed directly from GitHub (there is no npm
> package). Add the git spec below. To pin a release, append a tag:
> `#v0.21.3`.

Add the git spec to the `plugins` array of `opencode.json(c)`:

```jsonc
{
  "plugins": [
    "openkit@git+https://github.com/jviniciusb/openkit.git"
  ]
}
```

If `openkit` or its git spec is already present, skip this step. If the
array already has entries, append — do not remove or reorder existing ones. If
there is no `plugins` key, add one.

## Step 2 — Seed the kit config

The kit reads `openkit.jsonc` from the global
(`~/.config/opencode/openkit.jsonc`) and/or project
(`<project>/.opencode/openkit.jsonc`) locations.

**Preferred:** in an OpenCode session, use `/kit list` (and `/kit enable <id>`,
`/kit disable <id>`) to see and toggle items. To seed a config file from every
category's item defaults, run the CLI from a checkout:

```bash
bun bin/openkit.js init            # global config + global opencode.json
bun bin/openkit.js init --project  # project config + project opencode.json
```

`init` is idempotent — it never overwrites existing tool, skill, or reference
entries, or duplicates the plugin entry.

**Fallback:** create the file by hand, seeded with the shipped tools —
`background-subagents` (opt-in; forces every subagent call to run in the
background) and `context-injections` (opt-in; injects built-in behavioral rules,
each individually toggleable, plus your own):

```jsonc
// ~/.config/opencode/openkit.jsonc
{
  "$schema": "https://raw.githubusercontent.com/jviniciusb/openkit/main/openkit.schema.json",
  "configVersion": 1,
  "tools": {
    "background-subagents": { "enabled": false },
    "context-injections": { "enabled": false }
  },
  "skills": {
    "english-writing-assistant": { "enabled": true },
    "sdd-flow": { "enabled": true },
    "interview": { "enabled": true },
    "skill-recipe": { "enabled": true },
    "research": { "enabled": true },
    "handoff": { "enabled": true },
    "code-review": { "enabled": true },
    "diagnosing-bugs": { "enabled": true },
    "verification": { "enabled": true },
    "prototype": { "enabled": true },
    "retro": { "enabled": true },
    "finishing-a-branch": { "enabled": true },
    "dispatching-parallel-agents": { "enabled": true },
    "using-git-worktrees": { "enabled": true },
    "writing-for-agents": { "enabled": true },
    "codebase-design": { "enabled": true },
    "improve-codebase-architecture": { "enabled": true },
    "to-spec": { "enabled": true },
    "wizard": { "enabled": true },
    "router": { "enabled": true },
    "diagnosing-sessions": { "enabled": true }
  },
  "references": {}
}
```

The kit also ships twenty-one **skills**, all enabled by default:
`english-writing-assistant` (model-visible), `sdd-flow` (a self-contained
spec-driven development orchestrator — brainstorm, then gated batch execution,
keeping the spec current — invoked explicitly with `@sdd-flow`),
`interview` (model-visible; aligns on design before implementation),
`skill-recipe` (the authoring recipe, invoked with `@skill-recipe`), `research`
(model-visible; cited findings from primary sources), `handoff` (invoked with
`@handoff`; compacts the conversation into a resumable document),
`code-review` (model-visible; reviews a change along Standards and Spec),
`diagnosing-bugs` (model-visible; root-causes a bug from evidence before changing
production code), `verification` (model-visible; proves a completion claim
against the current tree before reporting success), `prototype` (model-visible;
builds throwaway code to resolve one design uncertainty), `retro` (invoked with
`@retro`; turns a finished session's friction into proposed environment
changes), `finishing-a-branch` (invoked with `@finishing-a-branch`; lands
completed work safely or leaves it deliberately in place),
`dispatching-parallel-agents` (model-visible; delegates one agent per independent
task and runs them concurrently), `using-git-worktrees` (model-visible; sets up
or verifies an isolated workspace before feature work), `writing-for-agents`
(model-visible; writes agent-facing documents so the agent lands on the intended
behavior), `codebase-design` (model-visible; designs deep modules behind
clean seams), `improve-codebase-architecture` (invoked with
`@improve-codebase-architecture`; surveys a codebase read-only for deepening
opportunities), `to-spec` (invoked with `@to-spec`; distills the current
conversation into a written spec), `wizard` (model-visible; builds a guided
interactive script for steps only a human can take), `router` (invoked with
`@router`; points a request at the one kit skill or flow that fits), and
`diagnosing-sessions` (invoked with `@diagnosing-sessions`; forensically explains
why a past session went wrong). Skills take no `settings` — only `enabled`.
Disable one with
`/kit disable <skill-id>` in a session, or
`bun bin/openkit.js disable <skill-id>` from a checkout.

**References** are the third category (a `references` config section). A
reference packages a content source (local path or git repository) for the
session; references are opt-in and settings-bearing, and none ship today. See the
[README references section](https://github.com/jviniciusb/openkit#references).

Do not create a config if the user already has one; merge missing tool, skill, and
reference entries into it instead.

A project file only needs the values that differ from global. Settings
deep-merge (settings-bearing categories only); `enabled` and arrays replace.
Precedence, low → high: item `defaultSettings` < global config < project config
(farther → nearer) < `opencode.json` plugin `options`.

## Step 3 — Restart OpenCode

Plugins load at OpenCode startup. Restart the service so it picks up the new
entry. For example:

```bash
opencode service restart
```

or quit and relaunch OpenCode. If the user has a long-lived session they care
about, tell them a restart is required before continuing.

## Step 4 — Verify

From a checkout:

```bash
bun bin/openkit.js doctor
```

Or in-session, `/kit list`.

Success looks like:

```text
config: ok (1 file)
tools: ok
skills: ok
references: ok
plugin: active
```

- `config: error …` means a kit config file does not parse — fix it or ask the
  user.
- `tool: degraded …` means a tool's settings failed validation. The kit still
  loads and that tool uses its defaults; report it, and fix the settings.
- `skill: error …` means a bundled skill's `SKILL.md` could not be loaded; the
  kit still loads the other skills. Report it (doctor exits non-zero).
- `reference: error …` means a reference's `reference.json` is missing or
  invalid; the kit still loads the others. Report it (doctor exits non-zero).
- `plugin: not listed (best effort)` means no `opencode.json` in the project or
  global location lists `openkit`. If you added the entry, confirm the file
  path and restart.

You can also run `/kit list` in a session, or `bun bin/openkit.js list` from
a checkout, to show every item and its enabled state.

## Fallback: the `/kit` command

The plugin exposes these operations from inside a session (no CLI needed):

```text
/kit list                        # show every item and its state
/kit enable <id>                 # enable an item (global config)
/kit disable <id>                # disable an item (global config)
/kit config <id> <key> <value>   # set a settings-bearing item's setting (global config)
```

Use `/kit` to seed state or verify, but the manual edits above still cover a
fresh install.

## What to report back

Tell the user, concisely:

1. Which `opencode.json(c)` you edited and that `openkit` was added.
2. Which config file you created or updated.
3. That OpenCode needs a restart (done or pending).
4. The `doctor` output showing config/tools/skills/references/plugin status.
