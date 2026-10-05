# Install opencode-kit

Instructions for an AI coding agent to install **opencode-kit** into a user's
OpenCode V2 setup. If you can read this file, follow it.

> Canonical instruction to give an agent:
> *Fetch and follow instructions from
> https://raw.githubusercontent.com/jviniciusb/opencode-kit/main/.opencode/INSTALL.md*

opencode-kit is one OpenCode V2 plugin that hosts independently toggleable tools.
Installing it means: register the plugin, seed its config, restart OpenCode, and
verify. Do the four steps below in order and report the result to the user.

## Before you start

- Confirm OpenCode V2 `>= 2.0.4` is installed (`opencode --version`).
- The CLI is in the repo (not on npm). If the user has a checkout they can run
  `bun bin/opencode-kit.js <command>`; otherwise use the `/kit` command or edit
  the config by hand.
- Locate the user's OpenCode config. It may be `opencode.json` or
  `opencode.jsonc`, either globally (`~/.config/opencode/opencode.json`) or in
  the project root. Prefer the file the user already uses.

Never overwrite existing configuration. Preserve comments, formatting, and any
existing `plugins` entries. If a file does not parse, stop and ask the user
instead of replacing it.

## Step 1 — Add the plugin entry

> **Status:** `opencode-kit` is distributed directly from GitHub (there is no npm
> package). Add the git spec below. To pin a release, append a tag:
> `#v0.1.0`.

Add the git spec to the `plugins` array of `opencode.json(c)`:

```jsonc
{
  "plugins": [
    "opencode-kit@git+https://github.com/jviniciusb/opencode-kit.git"
  ]
}
```

If `opencode-kit` or its git spec is already present, skip this step. If the
array already has entries, append — do not remove or reorder existing ones. If
there is no `plugins` key, add one.

## Step 2 — Seed the kit config

The kit reads `opencode-kit.jsonc` from the global
(`~/.config/opencode/opencode-kit.jsonc`) and/or project
(`<project>/.opencode/opencode-kit.jsonc`) locations.

**Preferred:** in an OpenCode session, use `/kit list` (and `/kit enable <tool>`)
to see and toggle tools. To seed a config file from every tool's defaults, run
the CLI from a checkout:

```bash
bun bin/opencode-kit.js init            # global config + global opencode.json
bun bin/opencode-kit.js init --project  # project config + project opencode.json
```

`init` is idempotent — it never overwrites existing tool entries or duplicates
the plugin entry.

**Fallback:** create the file by hand, seeded with the shipped tools — `hello`
(enabled by default) and `background-subagents` (opt-in; forces every subagent
call to run in the background):

```jsonc
// ~/.config/opencode/opencode-kit.jsonc
{
  "$schema": "https://raw.githubusercontent.com/jviniciusb/opencode-kit/main/opencode-kit.schema.json",
  "configVersion": 1,
  "tools": {
    "hello": { "enabled": true, "settings": { "greeting": "Hello" } },
    "background-subagents": { "enabled": false }
  }
}
```

Do not create a config if the user already has one; merge missing tool entries
into it instead.

A project file only needs the values that differ from global. Settings
deep-merge; `enabled` and arrays replace. Precedence, low → high:
`tool.defaultSettings` < global config < project config (farther → nearer)
< `opencode.json` plugin `options`.

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
bun bin/opencode-kit.js doctor
```

Or in-session, `/kit list`.

Success looks like:

```text
config: ok (1 file)
tools: ok
plugin: active
```

- `config: error …` means a kit config file does not parse — fix it or ask the
  user.
- `tool: degraded …` means a tool's settings failed validation. The kit still
  loads and that tool uses its defaults; report it, and fix the settings.
- `plugin: not listed (best effort)` means no `opencode.json` in the project or
  global location lists `opencode-kit`. If you added the entry, confirm the file
  path and restart.

You can also run `/kit list` in a session, or `bun bin/opencode-kit.js list` from
a checkout, to show every tool and its enabled state.

## Fallback: the `/kit` command

The plugin exposes these operations from inside a session (no CLI needed):

```text
/kit list                        # show tools and their state
/kit enable <tool>               # enable a tool (global config)
/kit disable <tool>              # disable a tool (global config)
/kit config <tool> <key> <value> # set a tool setting (global config)
```

Use `/kit` to seed state or verify, but the manual edits above still cover a
fresh install.

## What to report back

Tell the user, concisely:

1. Which `opencode.json(c)` you edited and that `opencode-kit` was added.
2. Which config file you created or updated.
3. That OpenCode needs a restart (done or pending).
4. The `doctor` output showing config/tools/plugin status.
