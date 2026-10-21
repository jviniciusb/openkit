# Vendored skill sources (dev-only)

This directory holds pinned snapshots of upstream agent-skill kits that
`openkit` skills are derived from. It is **dev-only**: it is not listed in
`package.json` `files`, so nothing here is published.

## Layout

- `sources.json`: the resolved pins: repository, ref, commit, license, includes.
- `generated.json`: for each generated skill: its brief, the sources it came
  from, the output path, and the output hash.
- `briefs/<target-id>.md`: the per-skill brief the recipe reads.
- `<name>/LICENSE`: the upstream license, retained verbatim.
- `<name>/<upstream-path>/...`: the included files, mirrored at upstream paths.

## Vendored sources

| Name | Repository | Ref | License |
|------|------------|-----|---------|
| `superpowers` | https://github.com/obra/superpowers | `v7.0.0` | MIT |
| `mattpocock-skills` | https://github.com/mattpocock/skills | `v1.3.1` | MIT |

Both are MIT. The derived skills in `src/skills/` are listed with their upstream
sources in the root `THIRD_PARTY_NOTICES.md`, which ships with the package. The
vendored snapshots in this directory are dev-only and are not included in the
published package.

## Tooling

```bash
bun scripts/skill-source.ts add <name> <git-url> --ref <ref> --include <path> [--include ...]
bun scripts/skill-source.ts update [<name>] [--ref <ref>]
bun scripts/skill-source.ts list
bun scripts/skill-source.ts check
```

`check` compares each generated skill's recorded hash with the file on disk and
reports `clean`, `missing`, or `edited`.
