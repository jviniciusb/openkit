# Context-Injection Personal Guidance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make reusable personal agent guidance available through `opencode-kit` and remove only the duplicated guidance from the user's global agent file.

**Architecture:** Refine the existing `think-in-code` built-in rule, add one default-on `careful-changes` rule to `context-injections`, and update its tests and example config. Merge and activate the plugin update before pruning overlapping text from `~/.config/opencode/AGENTS.md`.

**Tech Stack:** TypeScript, Bun, OpenCode V2 plugin hooks, JSONC configuration.

**Spec:** `docs/superpowers/specs/2026-10-06-context-injection-personal-guidance-design.md`

## Global Constraints

- The `context-injections` tool remains opt-in; `careful-changes` is enabled by default only when the tool is enabled.
- Existing config files remain valid; rule settings merge with defaults and `configVersion` does not change.
- Edit only the user's `~/.config/opencode/AGENTS.md` among instruction files; leave project `AGENTS.md` and `CLAUDE.md` files untouched.
- Keep account, environment, Git authority, and project-specific guidance in the user's global file.

## Review Focus

- Existing config with only old rule IDs inherits `careful-changes: true` — test partial settings resolution in Task 1.
- Explicit `careful-changes: false` passes settings validation and removes only that injection — test while asserting other built-ins remain in Task 1.
- Every-rule-off plus no extras still registers no context hook — retain and run the existing test in Task 1.
- `think-in-code` recommends scripts only for bulk/mechanical work, not semantic reading — assert the text carries tool-first, sample-first, and source-reading guidance in Task 1.
- Pruning does not remove personal safety or environment settings — verify the global-file diff retains identity, worktree/Git policy, `rtk`, Jira, and its self-edit guard in Task 3.

---

### Task 1: Update the context-injection rule set

**Files:**
- Modify: `src/tools/context-injections/index.ts`
- Test: `tests/unit/tools-context-injections.test.ts`
- Modify: `docs/examples/opencode-kit.jsonc`

**Interfaces:**
- Consumes: `BUILT_IN_RULES`, `ContextInjectionsSettings`, and existing default/schema-driven rule toggles.
- Produces: a `careful-changes` rule ID, enabled in default settings and accepted by the settings schema; revised `think-in-code` wording.

- [x] **Step 1: Write failing tests**

In `tests/unit/tools-context-injections.test.ts`, add:

- `careful-changes is enabled by default and injected`: assert the default toggle is `true`, the event contains its rule text, and that text covers rereading targets, preserving unrelated work, verifying current/reachable review findings, and avoiding public pastes.
- `disabling careful-changes leaves other built-ins enabled`: disable only this rule; assert its text is absent and `think-in-code` remains.
- `partial existing rule settings inherit careful-changes default`: resolve settings with only `subagent-driven: false`; assert `careful-changes` resolves to `true`.
- `careful-changes is accepted by the settings schema`: validate settings with `careful-changes: false`; assert the tool is not degraded.
- `think-in-code prefers focused tools and source reading`: assert the text refers to MCP/CLI/project tools, focused query results, sampling before bulk work, and reading source for semantic understanding.

- [x] **Step 2: Run the focused test and verify the expected failures**

Run: `npx --yes bun test tests/unit/tools-context-injections.test.ts`

Expected: failures for the missing `careful-changes` rule/default and the current `think-in-code` text.

- [x] **Step 3: Implement the rule changes**

Add `careful-changes` to `BUILT_IN_RULES`, `defaultSettings.rules`, and `settingsSchema.properties`. Update `think-in-code` with the approved tool-first, focused-query, and sample-first wording. Add `careful-changes` to the example's list of built-in IDs. Keep the other built-in texts and defaults unchanged.

- [x] **Step 4: Run focused and full verification**

Run `npx --yes bun test tests/unit/tools-context-injections.test.ts`, then `npx --yes bun run typecheck` and `npx --yes bun test`.

Expected: the focused tests and full repository suite pass; typecheck exits zero.

- [x] **Step 5: Commit the plugin change**

Use a Conventional Commit such as `feat: add careful changes context rule`.

### Task 2: Merge and activate the plugin update

**Files:**
- No further source files; integrate Task 1's commit.

**Interfaces:**
- Consumes: Task 1's merged default rule and updated plugin package on `main`.
- Produces: the installed OpenCode plugin running the updated `context-injections` rules.

- [ ] **Step 1: Sync and re-verify before opening the PR**

Fetch and rebase onto `origin/main`; rerun typecheck and the full test suite on the rebased tree.

- [ ] **Step 2: Open the PR and review it**

Describe the rule behavior and its default/toggle semantics. Resolve review findings and wait for CI to pass.

- [ ] **Step 3: Merge the PR**

Merge only after review and required checks are clear; record the resulting main commit.

- [ ] **Step 4: Update and restart the installed plugin**

Run `opencode plugin update "opencode-kit@git+https://github.com/jviniciusb/opencode-kit.git"`, then `opencode service restart` and `opencode service status`. In an OpenCode session, run `/kit list` and confirm `context-injections` is enabled.

### Task 3: Remove transferred duplicates from the user's global file

**Files:**
- Modify: `~/.config/opencode/AGENTS.md`

**Interfaces:**
- Consumes: the merged and activated `think-in-code` and `careful-changes` instructions from Task 2.
- Produces: a shorter user-level file retaining only guidance not owned by the plugin and all user/environment-specific rules.

- [ ] **Step 1: Re-read the global file immediately before editing**

Confirm the targeted text still matches the spec and account for any concurrent user edits.

- [ ] **Step 2: Remove only transferred guidance**

Remove the duplicate task-decomposition line; the targeted-edit/concurrent-change sentence; the tool-first, context-minimization, and public-paste guidance; and the review-feedback guidance. Keep the remaining investigation/decision-continuity text in the first file bullet and preserve identity, worktree/Git permissions, `rtk`, Jira, and the self-edit guard. Rename the now-misleading `Tools before shell` heading to `Shell output` above the retained `rtk` instructions.

- [ ] **Step 3: Verify the final global-file diff**

Confirm only intended duplicate text was removed, personal/environment-specific instructions remain, and no project instruction file changed.
