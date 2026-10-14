# AGENTS.md

Guidance for AI agents working in the **openkit** repository.

## What this repo is

`openkit` is an OpenCode V2 plugin that hosts independently toggleable items
grouped into **categories**: tools, skills, and references. The framework (config,
category engine, CLI, contracts) is the product; items are added on top. Every
category is one `KitCategory` descriptor consumed by the generic engine, so
config resolution, registration/isolation, the CLI, and `/kit` are shared. Three
tools ship today: `background-subagents`
(`src/tools/background-subagents/index.ts`, opt-in; forces every subagent call to
run in the background), `context-injections`
(`src/tools/context-injections/index.ts`, opt-in; injects built-in behavioral
rules, each individually toggleable, plus your own instructions), and
`auto-compact` (`src/tools/auto-compact/index.ts`, opt-in; queues compaction once
related sessions, tool calls, and shells are idle and the last prompt exceeds a
token threshold). The `hello`
example at `src/tools/hello/index.ts` is not registered at runtime. Twenty-one
skills ship today, all enabled by default: `english-writing-assistant`
(`src/skills/english-writing-assistant/SKILL.md`, model-visible), `sdd-flow`
(`src/skills/sdd-flow/SKILL.md`, registered `autoinvoke: false`, invoked with
`@sdd-flow`; a self-contained spec-driven development orchestrator that
brainstorms approaches before the interview for architectural work, then
executes approved specs in batches (one step, or independent steps in parallel)
with a per-step gate, composing the kit's own `interview`, `research`,
`code-review`, `codebase-design`, `using-git-worktrees`, and
`dispatching-parallel-agents` skills and naming `to-spec` for drafting the
initial spec), `interview`
(`src/skills/interview/SKILL.md`, model-visible; aligns on design before
implementation), `skill-recipe` (`src/skills/skill-recipe/SKILL.md`, registered
`autoinvoke: false`, the authoring recipe invoked with `@skill-recipe`),
`research` (`src/skills/research/SKILL.md`, model-visible; cited findings from
primary sources), `handoff` (`src/skills/handoff/SKILL.md`, registered
`autoinvoke: false`, invoked with `@handoff`; compacts the conversation into a
resumable document), `code-review` (`src/skills/code-review/SKILL.md`,
model-visible; reviews a change along Standards and Spec), `diagnosing-bugs`
(`src/skills/diagnosing-bugs/SKILL.md`, model-visible; root-causes a bug from
evidence before changing production code), `verification`
(`src/skills/verification/SKILL.md`, model-visible; proves a completion claim
against the current tree before reporting success), `prototype`
(`src/skills/prototype/SKILL.md`, model-visible; builds throwaway code to resolve
one design uncertainty), `retro` (`src/skills/retro/SKILL.md`, registered
`autoinvoke: false`, invoked with `@retro`; turns a finished session's friction
into proposed environment changes), `finishing-a-branch`
(`src/skills/finishing-a-branch/SKILL.md`, registered `autoinvoke: false`, invoked
with `@finishing-a-branch`; lands completed work safely or leaves it deliberately
in place), `dispatching-parallel-agents`
(`src/skills/dispatching-parallel-agents/SKILL.md`, model-visible; delegates one
agent per independent task and runs them concurrently), `using-git-worktrees`
(`src/skills/using-git-worktrees/SKILL.md`, model-visible; sets up or verifies an
isolated workspace before feature work), `writing-for-agents`
(`src/skills/writing-for-agents/SKILL.md`, model-visible; writes agent-facing
documents so the agent lands on the intended behavior), and `codebase-design`
(`src/skills/codebase-design/SKILL.md`, model-visible; designs deep modules
behind clean seams), `improve-codebase-architecture`
(`src/skills/improve-codebase-architecture/SKILL.md`, registered
`autoinvoke: false`, invoked with `@improve-codebase-architecture`; surveys a
codebase read-only for deepening opportunities),
`to-spec` (`src/skills/to-spec/SKILL.md`, registered `autoinvoke: false`, invoked
with `@to-spec`; distills the current conversation into a written spec),
`wizard` (`src/skills/wizard/SKILL.md`, model-visible; builds a guided
interactive script for steps only a human can take), `router`
(`src/skills/router/SKILL.md`, registered `autoinvoke: false`, invoked with
`@router`; points a request at the one kit skill or flow that fits), and
`diagnosing-sessions` (`src/skills/diagnosing-sessions/SKILL.md`, registered
`autoinvoke: false`, invoked with `@diagnosing-sessions`; forensically explains
why a past session went wrong). The **references**
category
(`src/references/<id>/reference.json`) ships empty today; references are
declarative, opt-in, settings-bearing content sources registered through
`ctx.reference`.

## Commands

Prepend Bun to your `PATH` (`~/.bun/bin`) if needed.

```bash
bun run typecheck   # must pass before you commit
bun test            # must pass before you commit
```

There is no build step: the plugin is the TypeScript source, transpiled by Bun
at load.

Run a single test file with `bun test tests/unit/<file>.test.ts`.

## Layout

```text
src/
  plugin.ts             # Plugin.define + bootstrap/lifecycle orchestration
  catalog.ts            # assembles categories from the descriptors
  categories/           # tool, skill, reference descriptors + scaffolder metadata
  operations/           # shared list/toggle/config ops used by the CLI and /kit
  config/               # discover, load, merge, effective, validate, edit, coerce, types
  core/                 # category contract + engine, item contracts, kit API, context, testing fakes
  cli/                  # CLI entry and commands; scaffold.ts
  tools/<id>/index.ts   # one folder per tool
  tools/index.ts        # explicit barrel with <kit:tools> markers
  skills/<id>/SKILL.md  # one folder per skill (+ optional support files)
  skills/index.ts       # explicit barrel with <kit:skills> markers
  references/<id>/reference.json  # one folder per reference
  references/index.ts   # explicit barrel with <kit:references> markers
bin/openkit.js     # CLI entry (runs the TS CLI via Bun)
index.js                # package plugin entry -> src/plugin.ts
openkit.schema.json
tests/unit, tests/integration, tests/live   # tests/live = opt-in live acceptance (real opencode)
.opencode/INSTALL.md    # agent-driven install for consumers
```

## Ground rules

- **Match the real behavior.** `README.md` and `.opencode/INSTALL.md` must
  describe what `src/` actually does. Do not document commands or commands'
  flags that are not implemented. Implemented CLI subcommands: `init`, `list`,
  `enable`, `disable`, `config get|set`, `new <category> <id>` (`new-skill` is
  an alias), `doctor`, `version`.
- **Isolation is a hard requirement.** Every item's registration runs in
  try/catch; failures become `degraded` entries and an item's partial
  registrations are disposed. Never let one item break the kit or its siblings.
- **Config edits preserve comments.** Use the `jsonc-parser` helpers in
  `src/config/edit.ts`. Do not rewrite config with `JSON.stringify`.
- **Explicit registration.** Items are discovered from typed barrels
  (`src/tools/index.ts`, `src/skills/index.ts`, `src/references/index.ts`), not
  runtime globbing. Keep the `<kit:tools>`, `<kit:skills>`, and
  `<kit:references>` markers intact; `openkit new <category> <id>` inserts
  between them.
- **Tests accompany behavior.** Use `createFakeContext` from
  `src/core/testing.ts` for harness-style assertions. Add tests for new config
  precedence, registry behavior, CLI output, and tool registration.
- **Conventional Commits.** Use `feat:`, `fix:`, `docs:`, `test:`, `chore:`.
  Run `bun run typecheck && bun test` before committing.
- **No build step — the TypeScript source is the artifact.** Consumers install
  directly from GitHub and Bun (OpenCode's runtime) transpiles `src/plugin.ts`
  on load, so there is no `dist/`. Keep `src` in `package.json` `files`, and keep
  `index.js`/`main` pointing at the TS entry.
- **Do not name scripts `build`, `prepare`, `prepack`, or `postinstall`.** For
  git-installed dependencies Bun runs (and, for untrusted git deps, blocks)
  those lifecycle names, which makes `opencode plugin add <git spec>` fail with
  `git dep preparation failed`. Keep the build step out of `package.json`
  entirely (there is none).

## Configuration model (memorize this)

Locations:

- Global: `~/.config/opencode/openkit.jsonc`
- Project: `<project>/.opencode/openkit.jsonc`, discovered upward from the
  instance directory, nearest wins.

Precedence, low → high:

```text
item defaultSettings (settings-bearing categories)
  < global config < project config (farther→nearer)
    < opencode.json plugins[].options
```

`settings` deep-merge; `enabled` replaces; arrays replace. Config stays
category-keyed (`tools`, `skills`, `references`).

## Adding a tool

1. `openkit new tool my-tool` (run from the repo root; `new my-tool` is an
   alias for `new tool my-tool`).
2. Implement `register(ctx, settings, kit)` in `src/tools/my-tool/index.ts`.
3. Add tests.
4. Add an example entry to `docs/examples/openkit.jsonc`.
5. `bun run typecheck && bun test`.

## Adding a skill

Prefer `@skill-recipe` (`src/skills/skill-recipe/SKILL.md`) to derive a skill
from a brief plus source skills: it drafts in the kit house style and adds the
barrel entry. The steps below are the manual equivalent.

1. `openkit new skill my-skill` (run from the repo root; `new-skill` is an
   alias for `new skill`).
2. Write `src/skills/my-skill/SKILL.md` (frontmatter `name`/`description` plus
   the instruction body; add support files beside it as needed).
3. Add tests.
4. Add an example entry to `docs/examples/openkit.jsonc`.
5. `bun run typecheck && bun test`.

A skill is declarative: a directory plus one barrel line, no code. `defineSkill`
defaults `defaultEnabled` to `true`; pass `autoinvoke: false` to hide it from the
model's advertised list while keeping it loadable by id (`@my-skill`).

## Adding a reference

1. `openkit new reference my-reference` (run from the repo root).
2. Point `src/references/my-reference/reference.json` at real content: `"path"`
   for a local source, or `"type": "git"` with `"repository"` (and optional
   `"branch"`).
3. Add tests.
4. Add an example entry to `docs/examples/openkit.jsonc`.
5. `bun run typecheck && bun test`.

A reference is declarative: a directory plus one barrel line, no code. It is
opt-in (`defaultEnabled` defaults to `false`) and settings-bearing; users override
its source under `references.<id>.settings`.

See `CONTRIBUTING.md` for the full contributor workflow.
