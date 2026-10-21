# openkit

> **Personal project.** This is an opinionated setup shared as-is. There is no
> support or response-time guarantee; issues and PRs are handled on a best-effort
> basis. Fork it and adapt it to your own workflow.

A framework of toggleable, configurable **tools, skills, and references** for [OpenCode](https://opencode.ai) V2.

`openkit` is one plugin you install once. Inside it live independent items
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

The package ships three tools: [`background-subagents`](src/tools/background-subagents/index.ts)
(opt-in; forces every subagent call to run in the background so the parent keeps
control while a child works), [`context-injections`](src/tools/context-injections/index.ts)
(opt-in; injects built-in behavioral rules — each individually toggleable — plus
your own), and [`auto-compact`](src/tools/auto-compact/index.ts) (opt-in;
compacts at a prompt-token threshold only after the session, child sessions,
tool calls, and background shells are idle).
[`hello`](src/tools/hello/index.ts) remains as an authoring example, but is not
registered or exposed at runtime.

`auto-compact` relies on provider-reported prompt usage. When it is enabled,
disable OpenCode's built-in automatic compaction separately in `opencode.json(c)`
with `"compaction": { "auto": false }`; otherwise native compaction may run
before related background work has finished. This also disables OpenCode's
automatic overflow-recovery compaction. If the provider does not report prompt
usage, the tool cannot trigger compaction.

It also ships twenty-one skills, all enabled by default:
[`english-writing-assistant`](src/skills/english-writing-assistant/SKILL.md)
(model-visible), [`sdd-flow`](src/skills/sdd-flow/SKILL.md) (invoked
explicitly with `@sdd-flow`; brainstorm, then gated batch execution),
[`interview`](src/skills/interview/SKILL.md)
(model-visible; aligns on design before implementation),
[`skill-recipe`](src/skills/skill-recipe/SKILL.md) (the authoring recipe,
invoked with `@skill-recipe`), [`research`](src/skills/research/SKILL.md)
(model-visible; cited findings from primary sources),
[`handoff`](src/skills/handoff/SKILL.md) (invoked with `@handoff`; compacts the
conversation into a resumable handoff),
[`code-review`](src/skills/code-review/SKILL.md) (model-visible; reviews a change
along Standards and Spec, and verifies feedback before acting),
[`diagnosing-bugs`](src/skills/diagnosing-bugs/SKILL.md) (model-visible;
root-causes a bug from evidence before changing production code),
[`verification`](src/skills/verification/SKILL.md) (model-visible; proves a
completion claim against the current tree before reporting success),
[`prototype`](src/skills/prototype/SKILL.md) (model-visible; builds throwaway
code to resolve one design uncertainty before committing to an approach),
[`retro`](src/skills/retro/SKILL.md) (invoked with `@retro`; turns a finished
session's friction into proposed environment changes),
[`finishing-a-branch`](src/skills/finishing-a-branch/SKILL.md) (invoked with
`@finishing-a-branch`; lands completed work safely or leaves it deliberately in
place), [`dispatching-parallel-agents`](src/skills/dispatching-parallel-agents/SKILL.md)
(model-visible; delegates one agent per independent task and runs them
concurrently), [`using-git-worktrees`](src/skills/using-git-worktrees/SKILL.md)
(model-visible; sets up or verifies an isolated workspace before feature work),
[`writing-for-agents`](src/skills/writing-for-agents/SKILL.md) (model-visible;
writes agent-facing documents so the agent lands on the intended behavior), and
[`codebase-design`](src/skills/codebase-design/SKILL.md) (model-visible; designs
deep modules behind clean seams),
[`improve-codebase-architecture`](src/skills/improve-codebase-architecture/SKILL.md)
(invoked with `@improve-codebase-architecture`; surveys a codebase read-only for
deepening opportunities),
[`to-spec`](src/skills/to-spec/SKILL.md) (invoked with `@to-spec`; distills the
current conversation into a written spec without re-interviewing),
[`wizard`](src/skills/wizard/SKILL.md) (model-visible; builds a guided interactive
script for steps only a human can take), [`router`](src/skills/router/SKILL.md)
(invoked with `@router`; points a request at the one kit skill or flow that fits),
and [`diagnosing-sessions`](src/skills/diagnosing-sessions/SKILL.md) (invoked with
`@diagnosing-sessions`; forensically explains why a past session went wrong). See
[Skills](#skills).

The **references** category ships empty today; it is the supported home for
curated content sources. See [References](#references).

## Requirements

- OpenCode V2 `>= 2.0.4`.
- [Bun](https://bun.sh) to run the CLI from a checkout (`bun bin/openkit.js <command>`). The plugin ships TypeScript and is transpiled by OpenCode's Bun at load — there is no build step, and the package is not consumable by plain Node.

## Install

### 1. Add the plugin

openkit is distributed directly from GitHub (there is no npm package).

```bash
opencode plugin add "openkit@git+https://github.com/jviniciusb/openkit.git"
```

This installs the package into OpenCode's cache and loads every item that is
enabled in your config. Add the same spec to the `plugins` array of your
`opencode.json(c)` if it is not added for you.

To **pin a release** instead of tracking `main`, append a tag or a commit hash:

```bash
opencode plugin add "openkit@git+https://github.com/jviniciusb/openkit.git#v0.21.3"
```

### 2. Configure (optional)

Seeding is optional — an item that defaults to enabled works without a config
file (every bundled skill does; the shipped tools are opt-in). To make the
effective configuration explicit, create
`~/.config/opencode/openkit.jsonc` (or
`<project>/.opencode/openkit.jsonc`):

```jsonc
{
  "tools": {
    "background-subagents": { "enabled": true },
    "auto-compact": {
      "enabled": true,
      "settings": { "thresholdTokens": 250000 }
    }
  }
}
```

Also set this in `opencode.json(c)` when using `auto-compact`:

```jsonc
{
  "compaction": { "auto": false }
}
```

The CLI's `init` seeds this from every category's item defaults; run it from a
checkout (see [CLI access](#cli-access)). Restart OpenCode after changing
`plugins` so it picks up the new entry.

### 3. Verify

In a session, run `/kit list` to show every item and its resolved state; or from
a checkout run `bun bin/openkit.js doctor` (see
[CLI access](#cli-access)).

`doctor` checks that your kit config files parse, that no item is degraded, that
every skill and reference loads, and — best effort — that `openkit` is
listed in `opencode.json`.

### Let an agent install it

Paste this into your OpenCode session:

> Fetch and follow instructions from
> https://raw.githubusercontent.com/jviniciusb/openkit/main/.opencode/INSTALL.md

The agent installs the plugin, seeds the config, restarts OpenCode, and verifies
with `doctor`.

### CLI access

The CLI lives in the repo (it is not published to npm). Run it from a clone:

```bash
git clone https://github.com/jviniciusb/openkit.git
cd openkit && bun install
bun bin/openkit.js <command>
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

openkit reads JSONC (comments allowed) from two places:

| Scope   | Path                                              |
| ------- | ------------------------------------------------- |
| Global  | `~/.config/opencode/openkit.jsonc`           |
| Project | `<project>/.opencode/openkit.jsonc`          |

Project config is discovered from the OpenCode instance directory upward; the
nearest file wins. Both are optional.

### Precedence (low → high)

```text
item defaultSettings (in code, settings-bearing categories)
  < global openkit.jsonc
    < project openkit.jsonc (farther → nearer)
      < opencode.json plugins[].options
```

`settings` objects deep-merge; `enabled` and arrays replace (arrays are **not**
concatenated). Settings apply only to settings-bearing categories (`tools` and
`references`); `skills` carry just `enabled`.

### Example

```jsonc
// ~/.config/opencode/openkit.jsonc
{
  "$schema": "https://raw.githubusercontent.com/jviniciusb/openkit/main/openkit.schema.json",
  "configVersion": 1,
  "tools": {
    "background-subagents": { "enabled": true },
    "context-injections": { "enabled": true },
    "auto-compact": {
      "enabled": true,
      "settings": { "thresholdTokens": 250000 }
    }
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
// <project>/.opencode/openkit.jsonc
{
  "tools": {
    "background-subagents": { "enabled": false }
  }
}
```

More in [`docs/examples/openkit.jsonc`](docs/examples/openkit.jsonc).

If a **tool**'s settings fail validation, the kit logs a warning and falls back
to that tool's defaults, and the tool still registers. An invalid
`references.<id>.settings` override is different: the merged source fails
validation, so the reference is not registered at all and is reported
`degraded` (`doctor` treats it as fatal). Either way, the kit and every other
item keep loading.

## Skills

A **skill** is a self-contained instruction package: a directory with a
`SKILL.md` (frontmatter plus a Markdown body) and optional supporting files.
Skills are entirely declarative — there is no per-skill code. OpenCode either
advertises a skill to the model so it can use it on its own, or hides it from
the model's list while keeping it loadable by id.

Twenty-one skills ship with the kit, all **enabled by default**:

| Skill | How it is used |
| --- | --- |
| [`english-writing-assistant`](src/skills/english-writing-assistant/SKILL.md) | Model-visible. Turns a Portuguese speaker's draft, bullets, or Portuguese–English mix into clear, idiomatic English, with a short explanation of what changed. |
| [`sdd-flow`](src/skills/sdd-flow/SKILL.md) | Registered with `autoinvoke: false`, so it stays off the model's advertised list. Invoke it explicitly with **`@sdd-flow`**. A self-contained spec-driven development orchestrator: brainstorm candidate approaches before the interview for architectural work, write an approved spec, then execute it in dependency-ordered batches — one step, or independent steps in parallel — with a gate on each completed step, keeping the spec continuously current and composing the kit's own `interview`, `research`, `code-review`, `codebase-design`, `using-git-worktrees`, and `dispatching-parallel-agents` skills along the way, and naming `to-spec` for the initial draft. |
| [`interview`](src/skills/interview/SKILL.md) | Model-visible. Aligns on design or requirements before implementation: maps every open decision as a design tree, works it in rounds, and holds implementation behind an approval gate. |
| [`skill-recipe`](src/skills/skill-recipe/SKILL.md) | Registered with `autoinvoke: false`. The authoring aid, invoked with **`@skill-recipe`**: turns a brief plus one or more source skills into a self-contained kit-style `SKILL.md`. |
| [`research`](src/skills/research/SKILL.md) | Model-visible. Settles a factual question with cited findings from primary sources (official docs, source code, specs, first-party APIs), dispatching the reading to a background subagent and keeping established fact separate from inference. |
| [`handoff`](src/skills/handoff/SKILL.md) | Registered with `autoinvoke: false`. Invoke it explicitly with **`@handoff`**: compacts the current conversation into one portable document a fresh session can resume from, carrying state, decisions, open threads, and the next action. |
| [`code-review`](src/skills/code-review/SKILL.md) | Model-visible. Reviews a change along two independent axes — Standards and Spec — so neither masks the other, and, on the receiving side, verifies every finding against the code before acting on it. |
| [`diagnosing-bugs`](src/skills/diagnosing-bugs/SKILL.md) | Model-visible. Root-causes a bug, failing test, or unexpected behavior before changing production code: builds a signal that goes red on the bug, shrinks it to the smallest failing case, and tests one falsifiable hypothesis at a time. |
| [`verification`](src/skills/verification/SKILL.md) | Model-visible. Before any completion claim, runs the check that proves it against the current tree and reads the output, stating the command, its observed result, and anything it could not run. |
| [`prototype`](src/skills/prototype/SKILL.md) | Model-visible. Builds the smallest throwaway artifact that answers one design question, keeps it out of the real code path, and lets the answer inform the implementation. |
| [`retro`](src/skills/retro/SKILL.md) | Registered with `autoinvoke: false`. Invoke it explicitly with **`@retro`**: turns a finished session's friction into a short list of concrete proposed changes to the working environment; the user decides which to accept. |
| [`finishing-a-branch`](src/skills/finishing-a-branch/SKILL.md) | Registered with `autoinvoke: false`. Invoke it explicitly with **`@finishing-a-branch`**: lands completed work safely — verify the tests, detect the environment, present the landing menu — or leaves it deliberately in place, cleaning up only what the workflow owns. |
| [`dispatching-parallel-agents`](src/skills/dispatching-parallel-agents/SKILL.md) | Model-visible. Delegates one agent per independent problem domain and dispatches them in one response so they run concurrently, keeping the coordinator's own context for review and integration. |
| [`using-git-worktrees`](src/skills/using-git-worktrees/SKILL.md) | Model-visible. Sets up or verifies an isolated workspace before feature work: detects existing isolation, prefers the harness's native worktree tool, and falls back to `git worktree` only when none exists. |
| [`writing-for-agents`](src/skills/writing-for-agents/SKILL.md) | Model-visible. Writes or edits a document an agent consumes — instructions, a spec, an `AGENTS.md`, a skill — so the agent lands on the intended behavior on every run, with pointers that fire and steps that close on a checkable bound. |
| [`codebase-design`](src/skills/codebase-design/SKILL.md) | Model-visible. Designs deep modules — a lot of behaviour behind a small interface at a clean seam — for leverage for callers, locality for maintainers, and testability through the interface. |
| [`improve-codebase-architecture`](src/skills/improve-codebase-architecture/SKILL.md) | Registered with `autoinvoke: false`. Invoke it explicitly with **`@improve-codebase-architecture`**: surveys a codebase read-only for deepening opportunities — turning shallow modules into deep ones — and reports a prioritized list for the human to choose from. |
| [`to-spec`](src/skills/to-spec/SKILL.md) | Registered with `autoinvoke: false`. Invoke it explicitly with **`@to-spec`**: distills the current conversation into a written spec, preserving decisions already made and leaving undecided items as open questions. |
| [`wizard`](src/skills/wizard/SKILL.md) | Model-visible. Builds a guided interactive script for steps only a human can take — credentials, approvals, external consoles — so a manual procedure becomes repeatable instead of re-explained. |
| [`router`](src/skills/router/SKILL.md) | Registered with `autoinvoke: false`. Invoke it explicitly with **`@router`**: names the one kit skill or flow that fits a request and why. It points; the user invokes. |
| [`diagnosing-sessions`](src/skills/diagnosing-sessions/SKILL.md) | Registered with `autoinvoke: false`. Invoke it explicitly with **`@diagnosing-sessions`**: forensically reads a past session's transcript and reports, with evidence, why it stalled, repeated work, ignored a plan, or produced a poor result. |

**Skill recipe:** `@skill-recipe` is the general authoring skill for deriving a
new kit skill from a brief and arbitrary sources — it reads whatever paths the
brief names. The vendored snapshots under `skill-sources/` are maintainer
tooling for the skills this repo ships; that directory is dev-only and is not
part of the runtime package.

Skills are toggled per id under `skills.<id>.enabled` — a peer of the `tools`
section, with the same discovery and precedence:

```jsonc
{
  "skills": {
    "english-writing-assistant": { "enabled": true },
    "sdd-flow": { "enabled": false },
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

Unlike tools, a skill takes no `settings`; only `enabled` is configurable. A
disabled skill is not registered at all. Toggle one with the CLI
(`bun bin/openkit.js disable sdd-flow`) or in-session with
`/kit disable sdd-flow`.

`sdd-flow` is a self-contained orchestrator: it sequences spec-driven
development end to end — brainstorming candidate approaches before the interview
for architectural work, then executing the approved spec in batches (one step, or
independent steps in parallel) with a gate on each completed step, keeping the
spec continuously current — and composes the kit's own `interview`, `research`,
`code-review`, `codebase-design`, `using-git-worktrees`, and
`dispatching-parallel-agents` skills by id, naming `to-spec` for drafting the
initial spec. It has no external companion skills and no `/sdd-flow` command —
invoke it with `@sdd-flow`.

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

Run from a checkout: `bun bin/openkit.js <command>`.
Edits made by `enable`, `disable`, and `config set` go to the **global** config
and preserve comments and formatting.

| Command | What it does |
| --- | --- |
| `init [--project]` | Create the kit config (global, or project with `--project`) seeded with every category's item defaults, and ensure `openkit` is listed in the matching `opencode.json`. |
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
openkit new tool my-tool
# `openkit new my-tool` is an alias for `new tool my-tool`
```

This creates `src/tools/my-tool/index.ts` from the standard template and inserts
it into the tool barrel (`src/tools/index.ts`) between the `<kit:tools>` markers.
Then:

1. Implement `register(ctx, settings, kit)` in the generated `index.ts` to declare
   what the tool contributes.
2. Add unit and harness tests under `tests/`.
3. Add an entry to `docs/examples/openkit.jsonc`.

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
openkit new skill my-skill
# `openkit new-skill my-skill` is an alias for `new skill my-skill`
```

This creates `src/skills/my-skill/SKILL.md` from the standard template and
inserts it into the skills barrel (`src/skills/index.ts`) between the
`<kit:skills>` markers. Then:

1. Write the `SKILL.md`: a `---` frontmatter block with `name` and a
   `description` (when the model should use the skill), followed by the
   instruction body. Add any supporting files beside it; relative paths in the
   body resolve against the skill directory.
2. Add an entry to `docs/examples/openkit.jsonc`.
3. `bun run typecheck && bun test`.

A skill is a `KitSkill`: a unique kebab-case `id` and the directory holding its
`SKILL.md`, with `defaultEnabled` defaulting to `true`. `defineSkill` also takes
an optional `autoinvoke`; set `autoinvoke: false` (as `sdd-flow` does) to keep
the skill off the model's advertised list while still loading it by id
(`@my-skill`).

## Adding a reference (authors)

From a checkout of the repo:

```bash
openkit new reference my-reference
```

This creates `src/references/my-reference/reference.json` from the standard
template and inserts it into the references barrel (`src/references/index.ts`)
between the `<kit:references>` markers. Then:

1. Point the `reference.json` at real content: set `"path"` for a local source,
   or switch to `"type": "git"` with `"repository"` (and an optional `"branch"`).
2. Add an entry to `docs/examples/openkit.jsonc`.
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

MIT © 2026 Jader Barbosa. See [LICENSE](LICENSE) and
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for third-party notices.
