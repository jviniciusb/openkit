# opencode-kit

A framework of toggleable, configurable **tools** for [OpenCode](https://opencode.ai) V2.

`opencode-kit` is one plugin you install once. Inside it live independent tools —
each may contribute agent-callable functions, slash commands, skills, hook
injections, and bundled scripts. You turn individual tools on or off and tune
their settings through configuration, without touching the plugin itself.

- **Framework-first:** the conventions for adding tools matter more than any one
  tool. New tools are a folder plus a registration.
- **Opt-in by default:** a tool only activates when config says so (or when it
  explicitly declares `defaultEnabled: true`).
- **Isolated:** one tool failing to configure never stops the kit or the other
  tools from loading.

The package ships one example tool, [`hello`](src/tools/hello/index.ts), which is
enabled by default.

## Requirements

- OpenCode V2 `>= 2.0.4`.
- [Bun](https://bun.sh) for running the CLI from a checkout and for building.

## Install

### 1. Add the plugin

> **Status:** not yet published to npm. Install from git until then.

```bash
opencode plugin add "opencode-kit@git+https://github.com/jviniciusb/opencode-kit.git"
```

Once published to npm this becomes `opencode plugin add opencode-kit`. Either
installs the package into OpenCode's cache and loads every tool that is enabled
in your config. Add the same spec to the `plugins` array of your
`opencode.json(c)` if it is not added for you.

### 2. Configure (optional)

Seeding is optional — a tool with `defaultEnabled: true` works without a config
file. To make the effective configuration explicit, create
`~/.config/opencode/opencode-kit.jsonc` (or
`<project>/.opencode/opencode-kit.jsonc`):

```jsonc
{
  "tools": {
    "hello": { "enabled": true }
  }
}
```

The CLI's `init` seeds this from every tool's defaults; run it from a checkout
(see [CLI access](#cli-access)). Restart OpenCode after changing `plugins` so it
picks up the new entry.

### 3. Verify

In a session, run `/kit list` to show every tool and its resolved state; or from
a checkout run `bun bin/opencode-kit.js doctor` (see [CLI access](#cli-access)).

`doctor` checks that your kit config files parse, that no tool is degraded, and —
best effort — that `opencode-kit` is listed in `opencode.json`.

### Let an agent install it

Paste this into your OpenCode session:

> Fetch and follow instructions from
> https://raw.githubusercontent.com/jviniciusb/opencode-kit/main/.opencode/INSTALL.md

The agent installs the plugin, seeds the config, restarts OpenCode, and verifies
with `doctor`.

### CLI access

The CLI lives in the repo (it is not published to npm). Run it from a clone:

```bash
git clone https://github.com/jviniciusb/opencode-kit.git
cd opencode-kit && bun install
bun bin/opencode-kit.js <command>
```

The plugin also registers a `/kit` slash command for use inside a session (see
[The `/kit` command](#the-kit-command)).

## Configuration

opencode-kit reads JSONC (comments allowed) from two places:

| Scope   | Path                                              |
| ------- | ------------------------------------------------- |
| Global  | `~/.config/opencode/opencode-kit.jsonc`           |
| Project | `<project>/.opencode/opencode-kit.jsonc`          |

Project config is discovered from the OpenCode instance directory upward; the
nearest file wins. Both are optional.

### Precedence (low → high)

```text
tool.defaultSettings (in code)
  < global opencode-kit.jsonc
    < project opencode-kit.jsonc (farther → nearer)
      < opencode.json plugins[].options
```

`settings` objects deep-merge; `enabled` and arrays replace (arrays are **not**
concatenated).

### Example

```jsonc
// ~/.config/opencode/opencode-kit.jsonc
{
  "$schema": "https://raw.githubusercontent.com/jviniciusb/opencode-kit/main/opencode-kit.schema.json",
  "configVersion": 1,
  "tools": {
    "hello": {
      "enabled": true,
      "settings": { "greeting": "Hi there" }
    }
  }
}
```

A project file only needs what differs:

```jsonc
// <project>/.opencode/opencode-kit.jsonc
{
  "tools": {
    "hello": { "settings": { "greeting": "Hello, project" } }
  }
}
```

More in [`docs/examples/opencode-kit.jsonc`](docs/examples/opencode-kit.jsonc).

If a tool's settings fail validation, the kit logs a warning and uses that
tool's defaults; the kit and every other tool keep loading.

## CLI reference

Run from a checkout: `bun bin/opencode-kit.js <command>`.
Edits made by `enable`, `disable`, and `config set` go to the **global** config
and preserve comments and formatting.

| Command | What it does |
| --- | --- |
| `init [--project]` | Create the kit config (global, or project with `--project`) seeded with every tool's defaults, and ensure `opencode-kit` is listed in the matching `opencode.json`. |
| `list` | List every tool with its resolved enabled state and description. |
| `enable <tool>` | Set `tools.<tool>.enabled` to `true` in the global config. |
| `disable <tool>` | Set `tools.<tool>.enabled` to `false` in the global config. |
| `config get <tool> <key>` | Print a tool's effective setting (defaults merged with the global config) as JSON. |
| `config set <tool> <key> <value>` | Write a setting to the global config. Values are coerced to `true`/`false`/`null`/number when they look like JSON scalars. |
| `new <tool-id>` | Scaffold a new tool under `src/tools/<tool-id>` and register it in the barrel (run from a checkout; for authors). |
| `doctor` | Check that config parses, that no tool is degraded, and whether the plugin is listed in `opencode.json`. |
| `version` | Print the CLI and plugin versions. |

Unknown commands, unknown tool ids, and malformed config exit non-zero.

## The `/kit` command

If you install the plugin but neither `npx` nor a global CLI, the kit registers a
`/kit` slash command as the in-session fallback:

```text
/kit list                        # show tools and their state
/kit enable <tool>               # enable a tool in the global config
/kit disable <tool>              # disable a tool
/kit config <tool> <key> <value> # set a tool setting
```

Mutations edit the global config and trigger a reload, so the change takes effect
without restarting. Results are delivered through the session's `prompt`
channel when the harness exposes one; otherwise the kit falls back to its own
stdout sink (as when driving the command from a test harness).

## Adding a tool (authors)

From a checkout of the repo:

```bash
opencode-kit new my-tool
```

This creates `src/tools/my-tool/index.ts` from the standard template and inserts
it into the tool barrel (`src/tools/index.ts`) between the `<kit:tools>` markers.
Then:

1. Implement `register(ctx, settings, kit)` in the generated `index.ts` to declare
   what the tool contributes.
2. Add unit and harness tests under `tests/`.
3. Add an entry to `docs/examples/opencode-kit.jsonc`.

A tool is a `KitTool`: a unique kebab-case `id`, a display `name`, a one-line
`description`, typed `defaultSettings`, an optional `settingsSchema` (JSON
Schema, used for validation and future docs), and a single `register` that adds
tools/commands/skills/hooks through the kit context.

```ts
export default defineTool({
  id: "my-tool",
  name: "My Tool",
  description: "What it does, in one line.",
  defaultEnabled: false,
  defaultSettings: { /* ... */ },
  settingsSchema: { type: "object", properties: {}, additionalProperties: false },
  register(_ctx, settings, kit) {
    kit.namespace("my-tool")
    return kit.tool({
      name: "my-tool",
      description: "What the agent sees.",
      input: { type: "object", properties: {}, additionalProperties: false },
      execute: () => "result",
    })
  },
})
```

See `src/tools/hello/index.ts` for a complete, working example.

## Development

```bash
bun install
bun run typecheck
bun test
bun run compile
```

## License

MIT © 2026 Jader Barbosa. See [LICENSE](LICENSE).
