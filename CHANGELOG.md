# Changelog

All notable changes to this project are documented in this file. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/jviniciusb/opencode-kit/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/jviniciusb/opencode-kit/releases/tag/v0.1.0
