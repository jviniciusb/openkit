# Changelog

All notable changes to this project are documented in this file. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `finishing-a-branch` skill (`autoinvoke: false`, invoked with
  `@finishing-a-branch`): lands completed work safely — verifies the tests,
  detects the environment, presents the landing menu, executes the human's
  choice — or leaves it deliberately in place, cleaning up only what the workflow
  owns.
- `dispatching-parallel-agents` skill (model-visible): delegates one agent per
  independent problem domain and dispatches them in one response so they run
  concurrently, keeping the coordinator's own context for review and integration.
- `using-git-worktrees` skill (model-visible): sets up or verifies an isolated
  workspace before feature work — detecting existing isolation, preferring the
  harness's native worktree tool, and falling back to `git worktree` only when
  none exists.
- `writing-for-agents` skill (model-visible): writes or edits a document an agent
  consumes — instructions, a spec, an `AGENTS.md`, a skill — so the agent lands on
  the intended behavior on every run.
- `codebase-design` skill (model-visible): designs deep modules — a lot of
  behaviour behind a small interface at a clean seam — for leverage for callers,
  locality for maintainers, and testability through the interface.

## [0.10.0] - 2026-10-13

### Added

- `diagnosing-bugs` skill (model-visible): root-causes a bug, failing test, or
  unexpected behavior before changing production code, building a signal that
  goes red on the bug and testing one falsifiable hypothesis at a time.
- `verification` skill (model-visible): before any completion claim, runs the
  check that proves it against the current tree and reads the output, stating the
  command, its observed result, and anything it could not run.
- `prototype` skill (model-visible): builds the smallest throwaway artifact that
  answers one design question, keeps it out of the real code path, and lets the
  answer inform the real implementation.
- `retro` skill (`autoinvoke: false`, invoked with `@retro`): turns a finished
  session's friction into a short list of concrete proposed changes to the
  working environment; the user decides which to accept.

## [0.9.0] - 2026-10-13

### Added

- `research` skill (model-visible): settles a factual question with cited
  findings from primary sources (official docs, source code, specs, first-party
  APIs), dispatching the reading to a background subagent and keeping established
  fact separate from inference.
- `handoff` skill (`autoinvoke: false`, invoked with `@handoff`): compacts the
  current conversation into one portable document a fresh session can resume
  from, carrying state, decisions, open threads, and the next action.
- `code-review` skill (model-visible): reviews a change along two independent
  axes — Standards and Spec — so neither masks the other, and verifies review
  feedback against the code before acting on it.

### Changed

- `sdd-flow` is now a self-contained spec-driven development orchestrator that
  composes the kit's own `interview`, `research`, and `code-review` skills by id.
  It no longer vendors content verbatim from a Claude Code setup and has no
  external companion skills or `/sdd-flow` command; invoke it with `@sdd-flow`.

## [0.8.0] - 2026-10-13

### Added

- `skill-recipe` authoring skill (`autoinvoke: false`, invoked with
  `@skill-recipe`): turns a brief plus one or more source skills into a
  self-contained kit-style `SKILL.md`.
- `interview` skill (model-visible): aligns on design or requirements before
  implementation by mapping the design as a tree and holding implementation
  behind an approval gate.

## [0.7.0] - 2026-10-13

### Added

- **`auto-compact`** tool (opt-in): queues compaction with `delivery: "queue"`
  once the session, its child sessions, tool calls, and background shells are
  idle and the last prompt exceeds `thresholdTokens` (250,000 by default). It
  uses the V2 event stream and `session.wait`/`context`/`compact`, seeds on the
  `session.status` idle transition, and aborts its event subscription when
  disabled. Pair it with `"compaction": { "auto": false }` in `opencode.json(c)`
  so OpenCode's native auto-compaction cannot run before related background work
  has finished.
- `ctx.event` and `session.wait`/`context`/`compact` on the plugin context
  contract, with fakes in `createFakeContext`.

### Fixed

- `toolCategory.registerItem` now tracks and disposes a `Registration` returned
  directly by a tool's `register`, so that cleanup path is isolated like every
  other registration.

## [0.6.0] - 2026-10-09

### Added

- **Skills** as a first-class, independently toggleable artifact category beside
  tools: a skill is a declarative `src/skills/<id>/SKILL.md` package with its own
  `skills.<id>.enabled` config section, resolved state, and registration
  lifecycle. Tools can still contribute skills at runtime through the kit
  context.
- Two bundled skills, both enabled by default: `english-writing-assistant`
  (model-visible) and `sdd-flow` (registered `autoinvoke: false`, invoked with
  `@sdd-flow`).
- `new-skill` CLI command, plus skill support in `list`, `enable`/`disable`,
  `init`, and `doctor`.
- **References** as a third first-class, independently toggleable category: a
  declarative `src/references/<id>/reference.json` content source (a local path
  or a git repository) exposed to the session through `ctx.reference`, with its
  own `references.<id>` config section (`enabled` + `settings`) and registration
  lifecycle. The category ships empty today.
- A generic `KitCategory` engine: tools, skills, and references are descriptors
  over one shared config resolver and registration/isolation loop, and a shared
  `src/operations/` layer backs both the CLI and `/kit`.
- Unified `new <category> <id>` CLI command (`new-skill` is retained as an alias
  for `new skill`), plus a top-level `references` section in the JSON Schema.

### Changed

- `enable`/`disable` resolve ids across tools, skills, and references; `config
  get|set` address any settings-bearing category (`tools` and `references`),
  while skills expose only `enabled`.
- `init`, `list`, and `doctor` iterate every category rather than hard-coding
  tools and skills.

## [0.5.2] - 2026-10-06

### Changed

- `think-in-code` now matches skills by workflow fit, including implicit matches,
  while skipping speculative triggers.

## [0.5.1] - 2026-10-06

### Changed

- `think-in-code` now checks for directly matching skills and prefers tools over
  memory for current facts, repository state, and requested operations.

## [0.5.0] - 2026-10-06

### Added

- `careful-changes` context-injection rule for scoped edits and evidence-based
  review handling.

### Changed

- `think-in-code` to prefer focused tools and queries, sample before bulk work,
  and read source directly for semantic understanding.

## [0.1.0] - 2026-10-01

The first release of the opencode-kit framework.

### Added

- Plugin runtime that loads, merges, and validates configuration and registers
  every enabled tool in isolation, disposing all registrations on unload.
- `KitTool` contract plus `defineTool()` for authoring tools with typed settings
  and an optional JSON Schema.
- Configuration layer: global (`~/.config/opencode/opencode-kit.jsonc`) and
  project (`<project>/.opencode/opencode-kit.jsonc`) files, deep-merge with
  predictable precedence, JSON Schema validation, and degraded-tool reporting.
- Per-tool enable/disable (`tools.<id>.enabled`) with `defaultEnabled` opt-in
  semantics.
- CLI commands: `init`, `list`, `enable`, `disable`, `config get|set`, `new`,
  `doctor`, and `version`, with comment-preserving JSONC edits.
- `new <tool-id>` scaffolder that creates a tool and updates the barrel.
- Config reload via debounced file watching.
- Example `hello` tool (enabled by default).
- `opencode-kit.schema.json` for editor validation.
- `README.md`, `CONTRIBUTING.md`, `AGENTS.md`, `.opencode/INSTALL.md`, and
  `docs/examples/opencode-kit.jsonc`.

[Unreleased]: https://github.com/jviniciusb/opencode-kit/compare/v0.10.0...HEAD
[0.10.0]: https://github.com/jviniciusb/opencode-kit/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/jviniciusb/opencode-kit/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/jviniciusb/opencode-kit/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/jviniciusb/opencode-kit/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/jviniciusb/opencode-kit/compare/v0.5.2...v0.6.0
[0.5.2]: https://github.com/jviniciusb/opencode-kit/compare/v0.5.1...v0.5.2
[0.5.1]: https://github.com/jviniciusb/opencode-kit/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/jviniciusb/opencode-kit/compare/v0.4.0...v0.5.0
[0.1.0]: https://github.com/jviniciusb/opencode-kit/releases/tag/v0.1.0
