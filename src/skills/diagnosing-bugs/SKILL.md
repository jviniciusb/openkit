---
name: diagnosing-bugs
description: Use when a bug, failing test, or unexpected behavior must be root-caused before fixing. Trigger on reports of something broken, throwing, failing, slow, or otherwise misbehaving, and when a fix is proposed but the cause is not yet known.
---

# Diagnosing Bugs

Find the root cause before changing production code. A bug you cannot reproduce is a bug you cannot fix, and a fix without a demonstrated cause is a guess that will move the symptom rather than remove it.

## Overview

A hard bug has a cause, and the cause is reachable by evidence. The work is a gated loop: build a signal that goes red on this bug, shrink it to the smallest failing case, test one falsifiable hypothesis at a time, and only then change production code. The loop is the skill; the fix is mechanical once the cause is demonstrated. Redact secrets before showing any command, output, or captured artifact, and build loops against environment variables so credentials stay in the environment rather than in the transcript.

## When to Use

- A bug, failing test, or unexpected behavior must be fixed and the cause is not known.
- Something is broken, throwing, failing, slow, or producing wrong output.
- A fix is proposed, or one already failed, before the cause was demonstrated.
- The issue seems simple, you are under time pressure, or you have already tried multiple fixes.

## Process

### 1. Build a feedback loop that goes red

Produce one command, already run at least once, that drives the bug's code path and asserts the user's exact symptom, so it can go red on this bug and green once fixed. It must be deterministic, fast (seconds), and runnable unattended. Prefer a failing test at the seam that reaches the bug; fall back to an HTTP script, a CLI invocation against a fixture, a headless browser script, a replayed trace, or a throwaway harness.

Tighten the loop once it exists: make it faster, make the signal sharper (assert the specific symptom, not "did not crash"), and make it more deterministic (pin time, seed randomness, freeze the network). For non-deterministic bugs, stop chasing a clean repro and raise the reproduction rate until the bug is debuggable. If you genuinely cannot build a loop, stop and say so: list what you tried and ask for access to the environment, a redacted captured artifact, or permission to add temporary instrumentation. Do not hypothesize without a loop.

### 2. Reproduce and minimize

Run the loop and watch it go red. Confirm the failure is the one the user described, not a nearby failure, and capture the exact symptom so a later phase can verify the fix addresses it.

Then shrink the repro to the smallest scenario that still goes red. Cut inputs, callers, config, data, and steps one at a time, re-running the loop after each cut, and keep only what is load-bearing. Done when removing any remaining element makes the loop go green. A minimal repro shrinks the hypothesis space and becomes the regression test.

### 3. Form one hypothesis at a time

State a single falsifiable hypothesis: "If X is the cause, then changing Y will make the bug disappear, and changing Z will make it worse." If you cannot state the prediction, the hypothesis is a vibe; sharpen it or discard it. Test it by changing one variable at a time, using a debugger or REPL inspection first, then targeted logs at the boundaries that distinguish hypotheses. Never log everything and grep. Tag every temporary log with a unique prefix so cleanup is one search. For performance regressions, measure a baseline first, then bisect; do not reason from logs alone.

If the test does not confirm the hypothesis, form a new one and repeat. Do not stack fixes on top of an unconfirmed theory.

### 4. Verify the root cause before changing production code

This is the gate between diagnosis and repair. You may change production code only after the loop has demonstrated the root cause: the failing value or behavior is traced to the line that originates it, and you can explain why that line produces the symptom. Fix at the source, not at the point where the symptom appears. If three fixes have already failed, stop treating it as a hypothesis and question the design; each new fix revealing a new problem in a different place means the architecture, not the theory, is wrong.

### 5. Fix and verify

Turn the minimized repro into a regression test at a seam that exercises the real bug pattern at the call site, and watch it fail. Apply a single fix that addresses the demonstrated cause, with no bundled cleanup. Watch the test pass, confirm no other tests break, and re-run the original loop against the unminimized scenario. If the only available seam is too shallow to replicate the bug, say so: the missing seam is itself a finding about the codebase.

### 6. Clean up

Before declaring done, confirm the original repro no longer reproduces, the regression test passes or the absent seam is documented, every tagged instrument is removed, and throwaway prototypes are deleted. State the cause that turned out correct so the next debugger learns from it.

## Gates

- **No production change without a demonstrated root cause.** The cause is shown by the loop before code changes, never asserted from reading.
- **Reproduced and minimized first.** No hypothesizing until a red-capable loop exists and every remaining element is load-bearing.
- **One hypothesis at a time.** Each hypothesis is falsifiable and tested by changing one variable.
- **The fix is verified against the original symptom.** The unminimized repro is re-run after the fix, not just the new test.
- **Secrets are redacted.** Commands, outputs, and captured artifacts carry no credentials.
- **Instrumentation is removed.** Tagged logs and throwaway prototypes are gone before done.

## Anti-patterns

- Patching a symptom, or shipping any speculative fix, without a demonstrated root cause.
- Proposing a fix before the failing behavior is reproduced and its cause traced to its source.
- Reading code to build a theory before a red-capable loop exists.
- Changing several things at once, or stacking fixes on an unconfirmed hypothesis.
- Treating a nearby failure as the user's bug, or a different failure as the same one.
- Logging everything and grepping, or reasoning about performance from logs instead of a baseline measurement.
- Declaring done without re-running the original repro, or leaving tagged instrumentation behind.
- Showing credentials in a command, an output, or a captured artifact.

<!-- generated by skill-recipe
from: mattpocock/skills@24fe0ef7737efae15c87225755e9f6f5965e4888 skills/engineering/diagnosing-bugs/SKILL.md
      obra/superpowers@bb92a77741419a4ab5f06e711a283343f1ada0c3 skills/systematic-debugging/SKILL.md
license: MIT (dev-only snapshots: skill-sources/<name>/LICENSE in the repo) -->
