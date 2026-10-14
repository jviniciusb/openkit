# Changelog

All notable changes to this project are documented in this file. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.20.1] - 2026-10-14

### Fixed

- `openkit doctor` reported `plugin: not listed` on a correctly installed
  setup. It now reads `opencode.jsonc` as well as `opencode.json`, and matches a
  `plugins` entry by package name, so a spec like
  `openkit@git+ssh://…#v0.20.0` is recognized. `readPluginOptions` reads both
  filenames too.

## [0.20.0] - 2026-10-14

### Changed

- **Renamed the project from `opencode-kit` to `openkit`.** The package name,
  CLI (`bin/openkit.js`, invoked as `openkit`), log prefixes, plugin id, kit
  config filename (`openkit.jsonc`), schema file (`openkit.schema.json`), and
  repository URL (`github.com/jviniciusb/openkit`) all change. The `/kit`
  command and the `<kit:*>` barrel markers are unchanged. Historical notes
  under `docs/superpowers/` keep the old name.

  **Breaking:** rename an existing `~/.config/opencode/opencode-kit.jsonc` to
  `openkit.jsonc`, and update the `plugins` entry in `opencode.json` to the
  `openkit@…` spec. Renaming the plugin id re-scopes `ctx.storage`, resetting
  auto-compact's idle tracking.

## [0.19.0] - 2026-10-14

### Changed

- `context-injections`: the enabled rules are now injected as one headed,
  imperative block (`# Operating rules (mandatory)` with a preamble and each
  rule as a bullet) instead of one bare, unlabeled text part per rule. The
  rules already reached the system prompt; the framing makes them read as
  standing instructions rather than ambient context, so they compete better
  against a project's `AGENTS.md`. No rule text, id, default, or schema
  change; `extra` instructions still append after the built-ins.

## [0.18.1] - 2026-10-14

### Fixed

- `auto-compact` now checks idle sessions when OpenCode emits `session.viewed`,
  so resumed sessions with an unviewed idle transition are checked against the
  configured threshold.

## [0.18.0] - 2026-10-14

### Changed

- `context-injections` built-in rules: a consistency and simplification pass,
  judged against `writing-for-agents`. Deduplicated the facts/decisions,
  trivial-work, and evidence guidance; removed a definition no-op in
  `functional-programming`; tightened `proactive`, `think-in-code`,
  `decomposition`, and `subagent-driven`; rephrased the raw-context guardrail
  positively. Every leading word, completion criterion, guardrail, and the
  `proactive` gate qualifier are preserved, and no instruction was dropped
  (636 → 571 words). No rule id, default, or schema changed.

## [0.17.0] - 2026-10-14

### Added

- `context-injections` rule `proactive` (default on): act proactively — continue
  when the instructions make the next step clear and no gate or instruction says
  to stop; when they are not clear, keep the job moving without crossing a gate by
  settling facts yourself (directly or with a subagent) through research,
  exploration, or a quick throwaway prototype, and putting the remaining decisions
  to the user rather than stalling; do not assume — act on high-confidence
  evidence. A separate, individually toggleable rule, so it defers to every
  existing gate (`sdd-flow`, `interview`, `finishing-a-branch`).

## [0.16.0] - 2026-10-14

### Changed

- `context-injections` rule `think-in-code`: generalized from "use a program for
  bulk work" to **write one program when a task needs several tool calls whose
  results you only use to compute one answer** — chaining, fan-out, joins,
  filtering, counting, parsing, aggregation — returning only the derived value so
  the intermediates never enter context. Adds discovery (look up the exact tool
  path and signature rather than guessing), awaiting every call whose result you
  use and running independent calls concurrently, and the guard that a single call
  stays direct. Grounded in OpenCode's own `execute` tool wording and the Code
  Mode interpreter limits; it deliberately claims no execution bounds and no "no
  network". Rule id is unchanged.

## [0.15.0] - 2026-10-14

### Changed

- `context-injections` built-in rules `subagent-driven` and `decomposition`:
  subagent work is now background-first, so the orchestrator stays free to
  receive input instead of blocking on a subagent, and the two rules work as a
  pair to fan out the dependency graph's ready pieces in parallel. Rule ids are
  unchanged, so existing config keys stay valid.

## [0.14.0] - 2026-10-13

### Changed

- `sdd-flow` executes an approved spec in **batches** — one step, or a set of
  independent steps run in parallel — launched as background subagents and gated
  **per step**: each completed step is verified, reviewed, written to the spec,
  and offered `keep moving on / open a PR / refine or re-sync / stop`. For
  architectural-size work it brainstorms 2–3 candidate approaches before the
  interview, and it keeps the spec continuously current (automatically for
  detail-level changes, asking first for changes to agreed behavior, scope, or a
  user decision). Terminology is normalized on **step** (the unit) and **batch**
  (the group launched together); the docs and the skill test match.

## [0.13.0] - 2026-10-13

### Changed

- Skill consistency pass (targeted for v0.13.0): `sdd-flow` now references the
  shipped `codebase-design` (seam vocabulary), `using-git-worktrees` (workspace
  isolation), and `dispatching-parallel-agents` (fan-out) skills instead of
  duplicating their content, and names `to-spec` for drafting the initial spec;
  `skill-recipe/rubric.md` and `improve-codebase-architecture` cross-reference
  `writing-for-agents` and `codebase-design`; the batch-1 provenance comments
  name real snapshots; `verification` wording is tightened; the vacuous
  `>-` test guards are removed. No new skills and no behavior change.

## [0.12.0] - 2026-10-13

### Added

- `improve-codebase-architecture` skill (`autoinvoke: false`, invoked with
  `@improve-codebase-architecture`): surveys a codebase read-only for deepening
  opportunities — turning shallow modules into deep ones — and reports a
  prioritized list for the human to choose from.
- `to-spec` skill (`autoinvoke: false`, invoked with `@to-spec`): distills the
  current conversation into a written spec, preserving decisions already made and
  leaving undecided items as open questions instead of interviewing the user.
- `wizard` skill (model-visible): builds a guided interactive script for steps
  only a human can take — credentials, approvals, external consoles — so a manual
  procedure becomes repeatable instead of re-explained.
- `router` skill (`autoinvoke: false`, invoked with `@router`): names the one kit
  skill or flow that fits a request and why. It points; the user invokes.
- `diagnosing-sessions` skill (`autoinvoke: false`, invoked with
  `@diagnosing-sessions`): forensically reads a past session's transcript and
  reports, with evidence, why it stalled, repeated work, ignored a plan, or
  produced a poor result.

## [0.11.0] - 2026-10-13

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

[Unreleased]: https://github.com/jviniciusb/opencode-kit/compare/v0.18.1...HEAD
[0.18.1]: https://github.com/jviniciusb/opencode-kit/compare/v0.18.0...v0.18.1
[0.18.0]: https://github.com/jviniciusb/opencode-kit/compare/v0.17.0...v0.18.0
[0.17.0]: https://github.com/jviniciusb/opencode-kit/compare/v0.16.0...v0.17.0
[0.16.0]: https://github.com/jviniciusb/opencode-kit/compare/v0.15.0...v0.16.0
[0.15.0]: https://github.com/jviniciusb/opencode-kit/compare/v0.14.0...v0.15.0
[0.14.0]: https://github.com/jviniciusb/opencode-kit/compare/v0.13.0...v0.14.0
[0.13.0]: https://github.com/jviniciusb/opencode-kit/compare/v0.12.0...v0.13.0
[0.12.0]: https://github.com/jviniciusb/opencode-kit/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/jviniciusb/opencode-kit/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/jviniciusb/opencode-kit/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/jviniciusb/opencode-kit/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/jviniciusb/opencode-kit/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/jviniciusb/opencode-kit/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/jviniciusb/opencode-kit/compare/v0.5.2...v0.6.0
[0.5.2]: https://github.com/jviniciusb/opencode-kit/compare/v0.5.1...v0.5.2
[0.5.1]: https://github.com/jviniciusb/opencode-kit/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/jviniciusb/opencode-kit/compare/v0.4.0...v0.5.0
[0.1.0]: https://github.com/jviniciusb/opencode-kit/releases/tag/v0.1.0
