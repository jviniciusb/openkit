# AGENTS.md

Guidance for AI agents working in the **opencode-kit** repository.

## What this repo is

`opencode-kit` is an OpenCode V2 plugin that hosts independently toggleable
tools. The framework (config, registry, CLI, tool contract) is the product; tools
are added on top. Three tools ship today: `hello` (`src/tools/hello/index.ts`, the
enabled-by-default example), `background-subagents`
(`src/tools/background-subagents/index.ts`, opt-in; forces every subagent call
to run in the background), and `context-injections`
(`src/tools/context-injections/index.ts`, opt-in; injects configured
instructions into the system prompt).

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
  config/               # discover, load, merge, resolve, validate, edit, types
  core/                 # tool contract, registry, kit API, context, testing fakes
  cli/                  # CLI entry and commands; scaffold.ts
  tools/<id>/index.ts   # one folder per tool
  tools/index.ts        # explicit barrel with <kit:tools> markers
bin/opencode-kit.js     # CLI entry (runs the TS CLI via Bun)
index.js                # package plugin entry -> src/plugin.ts
opencode-kit.schema.json
tests/unit, tests/integration, tests/live   # tests/live = opt-in live acceptance (real opencode)
.opencode/INSTALL.md    # agent-driven install for consumers
```

## Ground rules

- **Match the real behavior.** `README.md` and `.opencode/INSTALL.md` must
  describe what `src/` actually does. Do not document commands or commands'
  flags that are not implemented. Implemented CLI subcommands: `init`, `list`,
  `enable`, `disable`, `config get|set`, `new`, `doctor`, `version`.
- **Isolation is a hard requirement.** Every tool's `register` runs in try/catch;
  failures become `degraded` entries and partial registrations are disposed.
  Never let one tool break the kit or its siblings.
- **Config edits preserve comments.** Use the `jsonc-parser` helpers in
  `src/config/edit.ts`. Do not rewrite config with `JSON.stringify`.
- **Explicit registration.** Tools are discovered from the typed barrel
  (`src/tools/index.ts`), not runtime globbing. Keep the `<kit:tools>` markers
  intact; `opencode-kit new` inserts between them.
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

- Global: `~/.config/opencode/opencode-kit.jsonc`
- Project: `<project>/.opencode/opencode-kit.jsonc`, discovered upward from the
  instance directory, nearest wins.

Precedence, low → high:

```text
tool.defaultSettings < global config < project config (farther→nearer)
  < opencode.json plugins[].options
```

`settings` deep-merge; `enabled` replaces; arrays replace.

## Adding a tool

1. `opencode-kit new my-tool` (run from the repo root).
2. Implement `register(ctx, settings, kit)` in `src/tools/my-tool/index.ts`.
3. Add tests.
4. Add an example entry to `docs/examples/opencode-kit.jsonc`.
5. `bun run typecheck && bun test`.

See `CONTRIBUTING.md` for the full contributor workflow.
