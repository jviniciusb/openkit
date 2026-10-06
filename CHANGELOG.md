# Changelog

All notable changes to this project are documented in this file. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/jviniciusb/opencode-kit/compare/v0.5.2...HEAD
[0.5.2]: https://github.com/jviniciusb/opencode-kit/compare/v0.5.1...v0.5.2
[0.5.1]: https://github.com/jviniciusb/opencode-kit/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/jviniciusb/opencode-kit/compare/v0.4.0...v0.5.0
[0.1.0]: https://github.com/jviniciusb/opencode-kit/releases/tag/v0.1.0
