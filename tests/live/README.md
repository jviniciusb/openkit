# Live acceptance: `background-subagents`

The design's Validation section lists six checks that only a real OpenCode
session can prove. `background-subagents-live.ts` automates five of them against
a throwaway project that loads this checkout as a plugin; the sixth (mid-flight
steering) is documented here with the evidence captured when it was run manually.

This is **not** part of `bun test` (the file name does not end in `.test.ts`).

## Running

```bash
bun tests/live/background-subagents-live.ts
```

It requires a working `opencode` with model credentials on `PATH`, creates a
throwaway project under the OS temp dir, makes several real model calls, and
costs tokens. Exit code is non-zero if any check fails.

## What the harness checks

| Check | Design Validation |
| --- | --- |
| Caller passes `background: false`; the subagent still returns a `metadata.status: "running"` handle | Step 1 + requirement 1 |
| Parent stays active (a shell `sleep`) and later receives exactly one `<subagent state="completed">` notification | Steps 2, 4 |
| Disabling the tool yields an inline `metadata.status: "completed"` child (no `background` field) | Step 6 |
| A short `shell` command is unchanged and returns synchronously | Step 5 |
| A child that fails (unavailable model) is reported once as `<subagent state="error">` | Step 4 |

Because the caller cannot be trusted to always send `background`, the unit test
`tests/unit/tools-background-subagents.test.ts` pins the explicit `false` and
omitted cases deterministically; the live run confirms the effective behavior
(the last run showed `input.background=false, metadata.status=running`).

## Step 3: mid-flight steering (manual)

Steering needs a user message delivered to the parent while a child runs. This
was verified manually against the shared OpenCode service:

1. The parent launched a 20s child (`shell sleep 20`), which returned a
   `running` handle at t≈488.5s.
2. A concurrent prompt (`Steering check: reply with exactly BANANA`) was sent to
   the same session and answered `BANANA` at t≈492.9s.
3. The child only finished at t≈512.9s (`probe-slow-ok`).

So the parent processed new input while the child was still active.

## Caveats (OpenCode behavior, not this tool)

- **Idle parent, late child.** In headless `opencode run`, the process exits when
  the parent session goes idle. A background child that finishes *after* that
  does not deliver its completion notification in that process: a 20s child
  completed successfully but the idle parent never received the synthetic, even
  after a later prompt. The harness therefore keeps the parent active (a `sleep`)
  while the notification check runs. The interactive TUI keeps the session live,
  so this is a headless-harness limitation.
- **`PWD` when spawning programmatically.** OpenCode's standalone server resolves
  the project from `PWD`. A process that sets only `cwd` (for example
  `Bun.spawnSync`) loads the *parent's* project and reports `Unknown agent` for
  agents defined in the throwaway project. The harness passes `PWD` explicitly.
- **First touch of a new directory.** A directory OpenCode has never seen can
  answer its very first call before project-local agents are registered. The
  harness reuses one project directory and retries a subagent run when the agent
  is not yet registered.
