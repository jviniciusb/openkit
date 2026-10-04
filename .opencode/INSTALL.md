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
- Decide whether the CLI is available: try `npx opencode-kit version` (or
  `bunx opencode-kit version`). If it works, `init` can do steps 2–3 for you.
- Locate the user's OpenCode config. It may be `opencode.json` or
  `opencode.jsonc`, either globally (`~/.config/opencode/opencode.json`) or in
  the project root. Prefer the file the user already uses.

Never overwrite existing configuration. Preserve comments, formatting, and any
existing `plugins` entries. If a file does not parse, stop and ask the user
instead of replacing it.

## Step 1 — Add the plugin entry

Add `"opencode-kit"` to the `plugins` array of `opencode.json(c)`.

If `opencode-kit` is already present (as a string or as the first element of a
`[name, options]` pair), skip this step.

```jsonc
{
  "plugins": [
    "opencode-kit"
  ]
}
```

If the array already has entries, append `"opencode-kit"` — do not remove or
reorder the existing ones. If there is no `plugins` key, add one.

## Step 2 — Seed the kit config

The kit reads `opencode-kit.jsonc` from the global
(`~/.config/opencode/opencode-kit.jsonc`) and/or project
(`<project>/.opencode/opencode-kit.jsonc`) locations.

**Preferred:** if the CLI is available, run:

```bash
npx opencode-kit init            # global config + global opencode.json
npx opencode-kit init --project  # project config + project opencode.json
```

`init` is idempotent — it never overwrites existing tool entries or duplicates
the plugin entry.

**Fallback:** create the file by hand, seeded with the shipped `hello` tool
(enabled by default):

```jsonc
// ~/.config/opencode/opencode-kit.jsonc
{
  "$schema": "https://raw.githubusercontent.com/jviniciusb/opencode-kit/main/opencode-kit.schema.json",
  "configVersion": 1,
  "tools": {
    "hello": { "enabled": true, "settings": { "greeting": "Hello" } }
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

```bash
npx opencode-kit doctor
```

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

You can also run `npx opencode-kit list` to show every tool and its enabled
state.

## Fallback: the `/kit` command

If neither `npx opencode-kit` nor a global `opencode-kit` is available, the
plugin exposes the same operations from inside a session:

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
