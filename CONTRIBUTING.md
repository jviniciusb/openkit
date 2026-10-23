# Contributing

Thanks for your interest in openkit. This is a Bun + TypeScript project for
building OpenCode V2 tools and skills.

## Development setup

```bash
bun install
bun run typecheck   # tsc --noEmit
bun test            # bun test
```

## Making changes

1. Create a branch from `main` (e.g. `feat/my-tool`).
2. Make the change, following the conventions below.
3. For text an agent must follow (injected rules, skill steps, `AGENTS.md`),
   apply the structural pass in `docs/ste100-before-after.md`. It has no word
   limit; it removes ambiguity.
4. Run `bun run typecheck && bun test` and make sure both pass.
5. Keep commits focused and use [Conventional Commits](https://www.conventionalcommits.org/)
   messages (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
6. Open a pull request describing what changed and why.

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

Create `src/tools/my-tool/index.ts` and add it to the tool barrel
(`src/tools/index.ts`) between the `<kit:tools>` markers. Then implement
`register`, add tests, and add an example entry to
`docs/examples/openkit.jsonc`.

Every tool must:

- have a unique kebab-case `id` and a one-line `description`;
- declare `defaultEnabled` (opt-in unless it is universally useful);
- provide `defaultSettings` and, where practical, a `settingsSchema`;
- do all its work in `register(ctx, settings, kit)`.

## Adding a skill

Prefer `@skill-recipe`. To do it manually, create `src/skills/<id>/SKILL.md` and
add an entry to `src/skills/index.ts` between the `<kit:skills>` markers.

## Reporting bugs

Open an issue with a minimal reproduction: the relevant `openkit.jsonc`, the
`/kit` action or session behavior, and — from a clone — the output of
`bun scripts/doctor.ts`.

## License

By contributing, you agree that your contributions are licensed under the MIT
License (see [LICENSE](LICENSE)).
