# opencode-kit

A framework of toggleable, configurable **tools and skills** for [OpenCode](https://opencode.ai) V2.

`opencode-kit` is one plugin you install once. Inside it live independent tools
and skills — tools may contribute agent-callable functions, slash commands,
skills, hook injections, and bundled scripts, while skills are self-contained
instruction packages you enable on their own. You turn individual items on or off
and tune their settings through configuration, without touching the plugin
itself.

- **Framework-first:** the conventions for adding tools matter more than any one
  tool. New tools are a folder plus a registration.
- **Opt-in by default:** a tool only activates when config says so (or when it
  explicitly declares `defaultEnabled: true`).
- **Isolated:** one tool failing to configure never stops the kit or the other
  tools from loading.

The package ships three tools: the [`hello`](src/tools/hello/index.ts) example
(enabled by default), [`background-subagents`](src/tools/background-subagents/index.ts)
(opt-in; forces every subagent call to run in the background so the parent keeps
control while a child works), and
[`context-injections`](src/tools/context-injections/index.ts) (opt-in; injects
built-in behavioral rules — each individually toggleable — plus your own).

It also ships two skills, both enabled by default:
[`english-writing-assistant`](src/skills/english-writing-assistant/SKILL.md)
(model-visible) and [`sdd-flow`](src/skills/sdd-flow/SKILL.md) (invoked
explicitly with `@sdd-flow`). See [Skills](#skills).

## Requirements

- OpenCode V2 `>= 2.0.4`.
- [Bun](https://bun.sh) to run the CLI from a checkout (`bun bin/opencode-kit.js <command>`). The plugin ships TypeScript and is transpiled by OpenCode's Bun at load — there is no build step, and the package is not consumable by plain Node.

## Install

### 1. Add the plugin

opencode-kit is distributed directly from GitHub (there is no npm package).

```bash
opencode plugin add "opencode-kit@git+https://github.com/jviniciusb/opencode-kit.git"
```

This installs the package into OpenCode's cache and loads every tool and skill
that is enabled in your config. Add the same spec to the `plugins` array of your
`opencode.json(c)` if it is not added for you.

To **pin a release** instead of tracking `main`, append a tag or a commit hash:

```bash
opencode plugin add "opencode-kit@git+https://github.com/jviniciusb/opencode-kit.git#v0.1.0"
```

### 2. Configure (optional)

Seeding is optional — a tool or skill that defaults to enabled (every bundled
skill does) works without a config file. To make the effective configuration
explicit, create `~/.config/opencode/opencode-kit.jsonc` (or
`<project>/.opencode/opencode-kit.jsonc`):

```jsonc
{
  "tools": {
    "hello": { "enabled": true }
  }
}
```

The CLI's `init` seeds this from every tool's and skill's defaults; run it from a
checkout (see [CLI access](#cli-access)). Restart OpenCode after changing
`plugins` so it picks up the new entry.

### 3. Verify

In a session, run `/kit list` to show every tool and skill and its resolved
state; or from a checkout run `bun bin/opencode-kit.js doctor` (see
[CLI access](#cli-access)).

`doctor` checks that your kit config files parse, that no tool is degraded, that
every skill loads, and — best effort — that `opencode-kit` is listed in
`opencode.json`.

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
    },
    "background-subagents": { "enabled": true },
    "context-injections": { "enabled": true }
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

## Skills

A **skill** is a self-contained instruction package: a directory with a
`SKILL.md` (frontmatter plus a Markdown body) and optional supporting files.
Skills are entirely declarative — there is no per-skill code. OpenCode either
advertises a skill to the model so it can use it on its own, or hides it from
the model's list while keeping it loadable by id.

Two skills ship with the kit, both **enabled by default**:

| Skill | How it is used |
| --- | --- |
| [`english-writing-assistant`](src/skills/english-writing-assistant/SKILL.md) | Model-visible. Turns a Portuguese speaker's draft, bullets, or Portuguese–English mix into clear, idiomatic English, with a short explanation of what changed. |
| [`sdd-flow`](src/skills/sdd-flow/SKILL.md) | Registered with `autoinvoke: false`, so it stays off the model's advertised list. Invoke it explicitly with **`@sdd-flow`**. Spec-driven development: write an approved spec, then implement it in dependency-ordered slices. |

Skills are toggled per id under `skills.<id>.enabled` — a peer of the `tools`
section, with the same discovery and precedence:

```jsonc
{
  "skills": {
    "english-writing-assistant": { "enabled": true },
    "sdd-flow": { "enabled": false }
  }
}
```

Unlike tools, a skill takes no `settings`; only `enabled` is configurable. A
disabled skill is not registered at all. Toggle one with the CLI
(`bun bin/opencode-kit.js disable sdd-flow`) or in-session with
`/kit disable sdd-flow`.

**sdd-flow caveat:** its content is vendored verbatim from a Claude Code setup.
It references companion skills (`mattpocock-skills:*`, `superpowers:*`) and
`Explore`-style agents, and its text mentions `/sdd-flow`. Those companions
resolve only if installed separately, and in OpenCode the invocation is
`@sdd-flow` (there is no `/sdd-flow` command). Without the companions, the flow's
steps degrade.

## CLI reference

Run from a checkout: `bun bin/opencode-kit.js <command>`.
Edits made by `enable`, `disable`, and `config set` go to the **global** config
and preserve comments and formatting.

| Command | What it does |
| --- | --- |
| `init [--project]` | Create the kit config (global, or project with `--project`) seeded with every tool's and skill's defaults, and ensure `opencode-kit` is listed in the matching `opencode.json`. |
| `list` | List every tool and skill with its resolved enabled state and description. |
| `enable <id>` | Set `tools.<id>.enabled` (or `skills.<id>.enabled`) to `true` in the global config. |
| `disable <id>` | Set `tools.<id>.enabled` (or `skills.<id>.enabled`) to `false` in the global config. |
| `config get <tool> <key>` | Print a tool's effective setting (defaults merged with the global config) as JSON. |
| `config set <tool> <key> <value>` | Write a setting to the global config. Values are coerced to `true`/`false`/`null`/number when they look like JSON scalars. |
| `new <tool-id>` | Scaffold a new tool under `src/tools/<tool-id>` and register it in the barrel (run from a checkout; for authors). |
| `new-skill <skill-id>` | Scaffold a new skill under `src/skills/<skill-id>` and register it in the skills barrel (run from a checkout; for authors). |
| `doctor` | Check that config parses, that no tool is degraded, that every skill loads, and whether the plugin is listed in `opencode.json`. |
| `version` | Print the CLI and plugin versions. |

`enable`/`disable` resolve the id against tools first, then skills. `config
get`/`config set` address tool settings only — skills expose just `enabled`.
Unknown commands and unknown tool or skill ids exit non-zero; `doctor` and
config-mutating commands fail on malformed config (`list` skips malformed files).

## The `/kit` command

To use the kit without a checkout, the plugin registers a `/kit` slash command
for in-session use:

```text
/kit list                        # show tools and skills, and their state
/kit enable <id>                 # enable a tool or skill in the global config
/kit disable <id>                # disable a tool or skill
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
      execute: async () => ({ content: "result" }),
    })
  },
})
```

See `src/tools/hello/index.ts` for a complete, working example.

## Adding a skill (authors)

From a checkout of the repo:

```bash
opencode-kit new-skill my-skill
```

This creates `src/skills/my-skill/SKILL.md` from the standard template and
inserts it into the skills barrel (`src/skills/index.ts`) between the
`<kit:skills>` markers. Then:

1. Write the `SKILL.md`: a `---` frontmatter block with `name` and a
   `description` (when the model should use the skill), followed by the
   instruction body. Add any supporting files beside it; relative paths in the
   body resolve against the skill directory.
2. Add an entry to `docs/examples/opencode-kit.jsonc`.
3. `bun run typecheck && bun test`.

A skill is a `KitSkill`: a unique kebab-case `id` and the directory holding its
`SKILL.md`, with `defaultEnabled` defaulting to `true`. `defineSkill` also takes
an optional `autoinvoke`; set `autoinvoke: false` (as `sdd-flow` does) to keep
the skill off the model's advertised list while still loading it by id
(`@my-skill`).

## Development

```bash
bun install
bun run typecheck
bun test
```

## License

MIT © 2026 Jader Barbosa. See [LICENSE](LICENSE).
