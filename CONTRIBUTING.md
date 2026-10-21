# Contributing

Thanks for your interest in openkit. This is a Bun + TypeScript project for
building OpenCode V2 tools, skills, and references.

## Development setup

```bash
bun install
bun run typecheck   # tsc --noEmit
bun test            # bun test
```

## Making changes

1. Create a branch from `main` (e.g. `feat/my-tool`).
2. Make the change, following the conventions below.
3. Run `bun run typecheck && bun test` and make sure both pass.
4. Keep commits focused and use [Conventional Commits](https://www.conventionalcommits.org/)
   messages (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
5. Open a pull request describing what changed and why.

## Code conventions

- **TypeScript, ESM, Bun.** No `any` in public surfaces; prefer explicit types.
- **Immutability at the edges.** Config resolution deep-merges copies rather than
  mutating inputs.
- **Isolation.** A tool's `register` runs inside try/catch; a failing tool is
  reported as degraded and must not prevent others from loading. Dispose partial
  registrations on failure.
- **Comment-preserving config edits.** Write config through the `jsonc-parser`
  helpers in `src/config/edit.ts`; never string-splice JSON.
- **Tests live with the behavior.** Unit tests under `tests/unit/`, integration
  tests under `tests/integration/`. Use `createFakeContext` from
  `src/core/testing.ts` to assert registrations without a live OpenCode.

## Adding a tool

```bash
openkit new my-tool
```

The scaffolder creates `src/tools/my-tool/index.ts` and registers it in the tool
barrel between the `<kit:tools>` markers. Then implement `register`, add tests,
and add an example entry to `docs/examples/openkit.jsonc`.

Every tool must:

- have a unique kebab-case `id` and a one-line `description`;
- declare `defaultEnabled` (opt-in unless it is universally useful);
- provide `defaultSettings` and, where practical, a `settingsSchema`;
- do all its work in `register(ctx, settings, kit)`.

## Reporting bugs

Open an issue with a minimal reproduction: the relevant `openkit.jsonc`,
the command or session action, and the output of `openkit doctor`.

## License

By contributing, you agree that your contributions are licensed under the MIT
License (see [LICENSE](LICENSE)).
