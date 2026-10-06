# Context-injection personal guidance — Design Spec

- **Date:** 2026-10-06
- **Status:** Approved
- **Topic:** Reuse personal agent guidance through opencode-kit context injections

## 1. Summary

Improve the `context-injections` tool so portable, generally useful agent
guidance lives in the plugin, while machine-, account-, and repository-specific
preferences remain in the user's global `~/.config/opencode/AGENTS.md`.
Project instruction files are shared with other contributors and remain
unchanged.

## 2. Goals

- Make the existing `think-in-code` rule more precise and useful by incorporating
  the user's tool-first and context-minimization guidance.
- Add one individually toggleable `careful-changes` built-in rule for safe,
  narrowly scoped edits and evidence-based review handling.
- Remove from the user's global instruction file only guidance now covered by
  those plugin rules, so installing the updated plugin can carry those behaviors
  to the user's other machines.
- Keep account, environment, Git authority, and project-specific guidance local.

## 3. Proposed behavior

### 3.1 Improve `think-in-code`

Use the most specific available MCP tool, CLI, or project script before falling
back to shell. For bulk counting, comparison, filtering, parsing, or
summarization, inspect a small sample first, then use a short program or pipeline
and print only the result plus necessary evidence. Read source directly when
semantic understanding is needed; use code to reduce mechanical processing, not
judgment.

This narrows the current instruction to write a program for any data analysis and
adds the user's tool-first and sample-first practices.

### 3.2 Add `careful-changes`

Add a built-in rule, enabled by default whenever `context-injections` is enabled,
with an individual `settings.rules.careful-changes` toggle. Its instruction will:

- inspect relevant code and trace the real flow before editing;
- re-read each target immediately before changing it;
- keep edits within the request and preserve unrelated or concurrent work;
- verify review feedback against current, reachable behavior before applying,
  adapting, or rejecting it; and
- keep repository content out of public paste services.

The rule will be represented in `BUILT_IN_RULES`, inferred `RuleId`, default
settings, and the settings schema. Existing config files remain valid: rule
settings merge with defaults, so the new rule is enabled unless explicitly
disabled. `configVersion` does not change.

### 3.3 Keep the existing rule set focused

Do not change the functional-programming, decomposition, or subagent-driven
rules. Decomposition already covers breaking larger tasks into independently
useful pieces; delegation already limits delegation to appropriate independent
work.

### 3.4 Prune only the user's global instructions

Edit only `~/.config/opencode/AGENTS.md` among instruction files. Remove the
duplicate task-decomposition line; the targeted-edit/concurrent-change sentence;
the tool-first/context-minimization/public-paste guidance; and the review-feedback
guidance now represented by the built-ins. Preserve the remaining investigation
and decision-continuity guidance in the first file bullet.

Retain the user's identity, primary-checkout/worktree policy, Git permissions and
preferences, `rtk` details, Jira conventions, and the instruction not to edit the
global file without the user's direction. Do not edit project `AGENTS.md` or
`CLAUDE.md` files.

## 4. Configuration and documentation

- Existing enabled `context-injections` configurations inherit the new
  default-enabled rule; do not edit the user's kit config.
- Update `docs/examples/opencode-kit.jsonc` to include the new rule ID in its
  documented built-in rule list.
- Do not change the tool's opt-in status, unrelated tools, or other built-in
  defaults.

## 5. Tests and acceptance criteria

- The context-injection unit tests confirm the new rule is included by default,
  is individually suppressible, and is omitted when disabled.
- Existing tests continue to cover injection order, extra instructions, and no
  hook registration when all rules and extras are disabled.
- Typecheck and the complete test suite pass.
- The example lists every built-in rule ID.
- Only `~/.config/opencode/AGENTS.md` is changed among agent-instruction files;
  project instructions remain untouched.
- A final comparison confirms the global file no longer repeats transferred
  guidance while retaining user- and environment-specific rules.

## 6. Out of scope

- Changing project instruction files or the user's `opencode-kit.jsonc`.
- Moving Git permissions, worktree policy, account identity, Jira, or local shell
  environment instructions into the public plugin.
- Adding multiple new rules, changing config precedence, or migrating existing
  configuration versions.
