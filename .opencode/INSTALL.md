# Install openkit

Instructions for an AI coding agent to install **openkit** into a user's
OpenCode V2 setup. If you can read this file, follow it.

> Canonical instruction to give an agent:
> *Fetch and follow instructions from
> https://raw.githubusercontent.com/jviniciusb/openkit/main/.opencode/INSTALL.md*

openkit is one OpenCode V2 plugin that hosts independently toggleable
items — tools and skills. Installing it means: register the plugin,
optionally configure it, restart OpenCode, and verify. Do the four steps below in
order and report the result to the user.

## Before you start

- Confirm OpenCode V2 `>= 2.0.4` is installed (`opencode --version`).
- No CLI or checkout is required. The plugin registers `/kit` after OpenCode
  restarts; use it to list, toggle, and configure items in-session.
- Locate the user's OpenCode config. It may be `opencode.json` or
  `opencode.jsonc`, either globally (`~/.config/opencode/opencode.json`) or in
  the project root. Prefer the file the user already uses.

Never overwrite existing configuration. Preserve comments, formatting, and any
existing `plugins` entries. If a file does not parse, stop and ask the user
instead of replacing it.

## Step 1 — Add the plugin entry

> **Status:** `openkit` is distributed directly from GitHub (there is no npm
> package). Add the git spec below. To pin a release, append a tag:
> `#v0.23.1`.

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

## Step 2 — Configure (optional)

The kit reads `openkit.jsonc` from the global
(`~/.config/opencode/openkit.jsonc`) and/or project
(`<project>/.opencode/openkit.jsonc`) locations. Both are optional: shipped
skills default to on and tools default to off, so the plugin works without a
config file.

**Preferred:** after the Step 3 restart, use `/kit list` to see items, `/kit enable <id>` or
`/kit disable <id>` to toggle them, and `/kit config set <id> <key> <value>` to
write a setting.

**Manual:** create the file by hand, seeded with the shipped tools —
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
  }
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
why a past session went wrong). Skills take no `settings` — only `enabled`. A
disabled skill is not registered and cannot be loaded by `@<id>`; a skill
packaged with `autoinvoke: false` stays loadable by `@<id>` but is hidden from
the model. Disable one with `/kit disable <skill-id>` in a session.

Do not create a config if the user already has one; merge missing tool and skill
entries into it instead.

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

In a session, run:

```text
/kit list
```

Success shows `tools:` and `skills:` sections with each item and its resolved
state. The two shipped tools are `background-subagents` and
`context-injections`; twenty-one skills should be listed.

- If `/kit` is not available after a restart, the plugin did not load. Check
  that `opencode.json(c)` parses, that the `plugins` entry is present, and check
  the OpenCode logs.
- If an item is missing or unexpectedly disabled, check the config files and
  plugin `options`.
- For a deeper check from a clone, run `bun scripts/doctor.ts`. It reports config
  parse errors, degraded items, and whether `openkit` is listed; it is
  maintainer tooling and is not shipped with the plugin.

## Fallback: the `/kit` command

The plugin exposes these operations from inside a session:

```text
/kit list                          # show every item and its state
/kit enable <id>                   # enable an item (global config)
/kit disable <id>                  # disable an item (global config)
/kit config get <id> <key>         # print an item's effective setting
/kit config set <id> <key> <value> # write a settings-bearing item's setting
/kit config <id> <key> <value>     # alias for config set
```

Use `/kit` to configure or verify after installation, or edit the config files
manually when you need a project-scoped setup.

## What to report back

Tell the user, concisely:

1. Which `opencode.json(c)` you edited and that `openkit` was added.
2. Whether you created or updated a config file (optional).
3. That OpenCode needs a restart (done or pending).
4. The `/kit list` result, or the error if `/kit` is unavailable.
