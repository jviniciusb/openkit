# opencode-kit

A framework of toggleable, configurable **tools, skills, and references** for [OpenCode](https://opencode.ai) V2.

`opencode-kit` is one plugin you install once. Inside it live independent items
grouped into **categories** — tools may contribute agent-callable functions,
slash commands, skills, hook injections, and bundled scripts; skills are
self-contained instruction packages you enable on their own; references package a
named content source (a local path or a git repository) the session can read. You
turn individual items on or off and tune their settings through configuration,
without touching the plugin itself.

Every category is an instance of one generic engine: a `KitCategory` descriptor
pairs shipped items with the policy the engine needs (default enabled state,
whether the category carries settings, and one registration hook). Adding a new
category is a descriptor plus a folder — the config, CLI, `/kit`, scaffolder,
schema, and lifecycle layers do not change. See
[Categories](#categories).

- **Framework-first:** the conventions for adding items matter more than any one
  item. A new tool is a folder plus a registration; a new skill or reference is a
  folder plus a barrel line.
- **Opt-in by default:** a tool or reference only activates when config says so
  (or when it explicitly declares `defaultEnabled: true`); bundled skills default
  to on.
- **Isolated:** one item failing to configure never stops the kit or the other
  items from loading.

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

The **references** category ships empty today; it is the supported home for
curated content sources. See [References](#references).

## Requirements

- OpenCode V2 `>= 2.0.4`.
- [Bun](https://bun.sh) to run the CLI from a checkout (`bun bin/opencode-kit.js <command>`). The plugin ships TypeScript and is transpiled by OpenCode's Bun at load — there is no build step, and the package is not consumable by plain Node.

## Install

### 1. Add the plugin

opencode-kit is distributed directly from GitHub (there is no npm package).

```bash
opencode plugin add "opencode-kit@git+https://github.com/jviniciusb/opencode-kit.git"
```

This installs the package into OpenCode's cache and loads every item that is
enabled in your config. Add the same spec to the `plugins` array of your
`opencode.json(c)` if it is not added for you.

To **pin a release** instead of tracking `main`, append a tag or a commit hash:

```bash
opencode plugin add "opencode-kit@git+https://github.com/jviniciusb/opencode-kit.git#v0.1.0"
```

### 2. Configure (optional)

Seeding is optional — an item that defaults to enabled (every bundled skill
does) works without a config file. To make the effective configuration explicit,
create `~/.config/opencode/opencode-kit.jsonc` (or
`<project>/.opencode/opencode-kit.jsonc`):

```jsonc
{
  "tools": {
    "hello": { "enabled": true }
  }
}
```

The CLI's `init` seeds this from every category's item defaults; run it from a
checkout (see [CLI access](#cli-access)). Restart OpenCode after changing
`plugins` so it picks up the new entry.

### 3. Verify

In a session, run `/kit list` to show every item and its resolved state; or from
a checkout run `bun bin/opencode-kit.js doctor` (see
[CLI access](#cli-access)).

`doctor` checks that your kit config files parse, that no item is degraded, that
every skill and reference loads, and — best effort — that `opencode-kit` is
listed in `opencode.json`.

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

## Categories

Every shipped item belongs to one of three categories, each a peer config
section:

| Category | Config key | Items | Settings? | Default |
| --- | --- | --- | --- | --- |
| **Tools** | `tools` | `KitTool` — a `register` hook that contributes tools, commands, skills, and hooks | yes | opt-in (`defaultEnabled: false`) |
| **Skills** | `skills` | `KitSkill` — a declarative `SKILL.md` package | no | on (`defaultEnabled: true`) |
| **References** | `references` | `KitReference` — a `reference.json` content source | yes | opt-in (`defaultEnabled: false`) |

The three categories are instances of one `KitCategory` descriptor consumed by a
single generic engine, so config resolution, the skip-if-disabled registration
loop, isolation/degraded reporting, the CLI, and `/kit` all work the same way for
each. A category declares how items default to enabled, whether it carries
settings, and one `registerItem` hook; everything else is shared. Adding a new
category is a descriptor plus a folder, with no changes to the engine, CLI, or
schema machinery beyond the closed config shape.

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
item defaultSettings (in code, settings-bearing categories)
  < global opencode-kit.jsonc
    < project opencode-kit.jsonc (farther → nearer)
      < opencode.json plugins[].options
```

`settings` objects deep-merge; `enabled` and arrays replace (arrays are **not**
concatenated). Settings apply only to settings-bearing categories (`tools` and
`references`); `skills` carry just `enabled`.

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
  },
  "references": {
    // References ship empty today; authors add them with `new reference <id>`.
    // Each reference is toggled and tuned by id, e.g.:
    // "my-docs": { "enabled": true, "settings": { "path": "./docs" } }
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

If a settings-bearing item's settings fail validation, the kit logs a warning and
uses that item's defaults; the kit and every other item keep loading.

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

## References

A **reference** packages one named content source — a local path or a git
repository — that the kit exposes to the session through OpenCode's
`ctx.reference` domain. Like skills, a reference is entirely declarative: a
directory with a `reference.json` and no per-reference code. Unlike skills, it is
**settings-bearing** and **opt-in by default**.

`reference.json` declares the source:

```jsonc
// local directory
{ "description": "Project docs", "type": "local", "path": "./docs" }
```

```jsonc
// git repository (branch optional)
{ "description": "Shared standard", "type": "git", "repository": "https://github.com/acme/standard", "branch": "main" }
```

References are toggled and tuned per id under `references.<id>` — a peer of the
`tools` section:

```jsonc
{
  "references": {
    "project-docs": { "enabled": true, "settings": { "path": "./docs/v2" } }
  }
}
```

`settings` are shallow-merged over the source read from `reference.json`: a
project can override the source's `path`, `repository`, or `branch` without
editing the packaged file. This replaces those fields individually (it is not a
general deep-merge), and `type` always comes from the file. A disabled reference
is not registered, and a reference whose file is missing or invalid degrades only
itself (and fails `doctor`).

No references ship with the kit today; the category is the supported home for
curated bundles. Add one with `new reference <id>` (see
[Adding a reference](#adding-a-reference-authors)).

## CLI reference

Run from a checkout: `bun bin/opencode-kit.js <command>`.
Edits made by `enable`, `disable`, and `config set` go to the **global** config
and preserve comments and formatting.

| Command | What it does |
| --- | --- |
| `init [--project]` | Create the kit config (global, or project with `--project`) seeded with every category's item defaults, and ensure `opencode-kit` is listed in the matching `opencode.json`. |
| `list` | List every item with its resolved enabled state and description. |
| `enable <id>` | Set `<category>.<id>.enabled` to `true` in the global config. |
| `disable <id>` | Set `<category>.<id>.enabled` to `false` in the global config. |
| `config get <id> <key>` | Print a settings-bearing item's effective setting (defaults merged with the global config) as JSON. |
| `config set <id> <key> <value>` | Write a setting to the global config. Values are coerced to `true`/`false`/`null`/number when they look like JSON scalars. |
| `new <category> <id>` | Scaffold a new item for `tool`, `skill`, or `reference` under the category's directory (`src/tools\|skills\|references/<id>`) and register it in the barrel (run from a checkout; for authors). |
| `new <tool-id>` | Alias for `new tool <tool-id>`. |
| `new-skill <skill-id>` | Alias for `new skill <skill-id>`. |
| `doctor` | Check that config parses, that no item is degraded, that every skill and reference loads, and whether the plugin is listed in `opencode.json`. |
| `version` | Print the CLI and plugin versions. |

`enable`/`disable` resolve the id across categories in catalog order (tools, then
skills, then references — ids share one namespace). `config get`/`config set`
address settings-bearing categories only (`tools` and `references`); skills
expose just `enabled`. Unknown commands and unknown ids exit non-zero; `doctor`
and config-mutating commands fail on malformed config (`list` skips malformed
files).

## The `/kit` command

To use the kit without a checkout, the plugin registers a `/kit` slash command
for in-session use:

```text
/kit list                        # show every item and its state
/kit enable <id>                 # enable an item in the global config
/kit disable <id>                # disable an item
/kit config <id> <key> <value>   # set a settings-bearing item's setting
```

Mutations edit the global config and trigger a reload, so the change takes effect
without restarting. Results are delivered through the session's `prompt`
channel when the harness exposes one; otherwise the kit falls back to its own
stdout sink (as when driving the command from a test harness).

## Adding a tool (authors)

From a checkout of the repo:

```bash
opencode-kit new tool my-tool
# `opencode-kit new my-tool` is an alias for `new tool my-tool`
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
opencode-kit new skill my-skill
# `opencode-kit new-skill my-skill` is an alias for `new skill my-skill`
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

## Adding a reference (authors)

From a checkout of the repo:

```bash
opencode-kit new reference my-reference
```

This creates `src/references/my-reference/reference.json` from the standard
template and inserts it into the references barrel (`src/references/index.ts`)
between the `<kit:references>` markers. Then:

1. Point the `reference.json` at real content: set `"path"` for a local source,
   or switch to `"type": "git"` with `"repository"` (and an optional `"branch"`).
2. Add an entry to `docs/examples/opencode-kit.jsonc`.
3. `bun run typecheck && bun test`.

A reference is a `KitReference`: a unique kebab-case `id` and the directory
holding its `reference.json`, with `defaultEnabled` defaulting to `false`. It is
settings-bearing, so users can override the source's `path`/`repository`/`branch`
under `references.<id>.settings`.

## Development

```bash
bun install
bun run typecheck
bun test
```

## License

MIT © 2026 Jader Barbosa. See [LICENSE](LICENSE).
