# Skill brief: using-git-worktrees

## Target id

`using-git-worktrees`

## Trigger / description

Use when starting feature work that needs isolation from the current workspace,
or before executing an implementation plan. Trigger when a task would run on a
branch that must not be disturbed, or when a plan calls for its own workspace.
Do not use when the current workspace is already isolated.

## Intent

Ensure feature work happens in an isolated workspace. Success: the skill detects
existing isolation before creating anything, prefers the harness's native
worktree tool, falls back to `git worktree` only when no native tool exists,
verifies a project-local worktree directory is gitignored before creating it,
runs a clean baseline before feature work, and never creates a worktree inside a
submodule.

## Source paths

- `skill-sources/superpowers/skills/using-git-worktrees/SKILL.md`

## Keep / drop

- Keep:
  - Detect existing isolation first: a linked worktree has `git rev-parse
    --git-dir` different from `--git-common-dir`; if already isolated, do not
    create another.
  - The submodule guard: the same git-dir difference is true inside a submodule,
    so confirm with `git rev-parse --show-superproject-working-tree` and never
    create a worktree inside one.
  - Prefer the harness's native worktree tool; fall back to `git worktree add`
    only when no native tool exists.
  - For the project-local fallback, verify the directory is gitignored before
    creating it, since an unignored worktree directory commits the whole tree.
  - Run a clean baseline (the test suite) before starting feature work.
- Drop:
  - External kit references and `plugin:skill` prefixes.
  - Harness-specific brand names (e.g. `EnterWorktree`, `WorktreeCreate`, the
    `/worktree` command). Name the concrete OpenCode tools instead:
    `worktree_create` / `worktree_list` / `worktree_remove`, and `session_move`
    when the worktree becomes the working directory.
  - The source's language-specific setup snippets.

## Desired structure

Overview, When to Use, Process, Gates, Anti-patterns. Self-contained: no
`superpowers:` or `mattpocock-skills:` references in the body. The gitignore
check applies to the manual `git worktree` fallback, since native tools own
placement, and the skill must not create a worktree inside a submodule. End the
body with the provenance HTML comment naming the source repo and path plus the
license.
