---
name: finishing-a-branch
description: Use when implementation is complete and the tests pass and the branch needs to be landed, kept, or discarded. Trigger on requests to finish, merge, land, or open a PR for a branch, and on the question of what to do with completed work. Do not use before the work is done or while tests are failing.
---

# Finishing a Branch

Land completed work safely, or leave it deliberately in place. Verify tests, detect the environment, present the landing menu, execute the human's choice, then clean up only what this workflow owns.

## Overview

Finishing a branch is a decision, not a reflex. The work is done and the tests pass, and now the branch has to be merged, published as a PR, or kept as-is. The human owns that decision, so the agent presents a fixed menu and waits. Two rules keep the path safe: nothing is merged until the suite is green on the tree being integrated, and nothing is discarded or force-deleted without an explicit typed confirmation. The environment shapes the menu and the cleanup, because a branch may live in a normal checkout, a linked worktree, or a detached HEAD that belongs to the host.

## When to Use

- Implementation is complete and the tests pass.
- The user asks to finish, land, or merge a branch, or to open a PR for it.
- The user asks what to do with completed work, or explicitly asks to keep or discard it.
- A local merge is about to happen and the merged result needs verifying before cleanup.

Do not use before the work is done, or while the suite is failing: the menu comes after a green run.

## Process

### 1. Verify the tests first

Run the project's full test suite on the tree you are about to integrate. If it is red, report the failures and stop. Nothing lands until the suite is green, and a green run only proves the tree it ran on.

### 2. Detect the environment

Determine where the branch lives, because it selects the menu and the cleanup:

- **Normal repo**: the git dir and common dir are the same. Standard menu, no worktree to clean up.
- **Linked worktree on a named branch**: the git dir differs from the common dir. Standard menu, with worktree cleanup possible.
- **Detached HEAD**: `git rev-parse --abbrev-ref HEAD` returns `HEAD`, so no branch is checked out. This can happen in a normal checkout as well as a linked worktree. Reduced menu, with no local merge; the workspace is externally managed, so leave it in place.

Capture the worktree path now, before any step changes directory.

### 3. Determine and confirm the base branch

The base is what the work forked from, usually named in the conversation, a plan, or the branch's upstream. If it is not already known, ask, and confirm before merging. Merging into the wrong base is expensive to undo.

### 4. Present the landing menu

Present the options and wait; integration is the human's decision.

```
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)

Which option?
```

On a detached HEAD, offer the reduced menu: push as a new branch and open a PR, or keep as-is. Do not offer a local merge.

Discarding is not on the menu. It happens only when the human explicitly asks for it, and only through the confirmation in step 5.

### 5. Execute the choice

**Merge locally.** From the main repo root, check out the base, update it, and merge the feature branch. Then run the tests on the merged result. If they are red, stop, leave the worktree and branch in place, and investigate: nothing has been pushed, so the merge is local and recoverable. Only once the merged result is green, clean up the worktree and delete the branch with a safe delete.

**Push and open a PR.** Push the branch to the remote, naming a new branch if the HEAD is detached. Create the pull request against the base with the forge's tooling, following the repo's template and conventions if present, and report the URL. Keep the worktree: PR feedback gets fixed there.

Write the PR body in three parts:

- **Summary**: the smallest view that makes the key point clear, such as a diff sketch, a call tree, a short file tree, or a small diagram.
- **Evidence**: concrete proof the change works, before and after. Prefer a test run or console output; screenshots when the change is visual.
- **Merge Danger**: whether this is a one-way or a two-way door, and the blast radius if it goes wrong.

End with an explicit call on whether the change is safe to merge, and why.

**Keep as-is.** Report the branch name and the worktree path, and stop. The worktree is preserved.

**Discard (explicit request only).** This path exists only because the human asked to throw the work away. Confirm first, listing exactly what will be permanently deleted: the branch, its commits, and the worktree. Wait for the typed confirmation before doing anything. Then clean up the worktree and force-delete the branch.

### 6. Clean up the workspace

Cleanup runs only for a local merge and for a confirmed discard; push-and-PR and keep-as-is always preserve the worktree. Remove the worktree from outside it, using the path captured in step 2.

- **Normal repo**: nothing to clean up.
- **Worktree**: worktrees may be host-owned. If the host provides a worktree tool, use it. Remove a worktree only when this workflow owns it, never on a guess.
- **Removal refused**: a refusal means the worktree holds files that exist nowhere else. Never force-remove on your own initiative. Show the human what is at stake and ask before proceeding.
- **Otherwise**: the host owns the workspace, so leave it in place.

## Gates

- **Tests green before the menu.** A failing suite stops everything; nothing lands from a red branch.
- **The human picks the landing.** Present the menu and wait; never decide integration for them.
- **Base branch confirmed before merging.** Do not merge into a guessed base.
- **The merged result is verified before cleanup.** A red merged result stops the merge, and the branch and worktree stay in place.
- **Discard needs an explicit typed confirmation.** The human's request starts it; the typed confirmation authorizes it. No confirmation, no deletion.
- **Never force-delete or force-remove on your own initiative.** A refusal or a rejected push is investigated and shown to the human, never forced.
- **Clean up only what this workflow owns.** Worktrees may be host-owned; leave the rest alone.
- **The PR states whether it is safe to merge.** The body carries the Summary, Evidence, and Merge Danger, and an explicit merge call.

## Anti-patterns

- Presenting the menu before the suite is green, or merging a red branch.
- Choosing a landing option for the human, or treating obvious intent as consent.
- Merging into an unconfirmed base.
- Cleaning up the worktree or deleting the branch before the merged result is verified.
- Offering discard on the menu, or acting on "yeah, get rid of it" instead of the typed confirmation.
- Force-deleting a branch, or force-removing a worktree, to finish cleanup.
- Cleaning up a host-owned worktree because it looks stale.
- Force-pushing after a rejected push instead of investigating.
- Removing the worktree on PR feedback that is still being addressed.

<!-- generated by skill-recipe
from: obra/superpowers@bb92a77741419a4ab5f06e711a283343f1ada0c3 skills/finishing-a-development-branch/SKILL.md
      mattpocock/skills@24fe0ef7737efae15c87225755e9f6f5965e4888 skills/engineering/pr/SKILL.md
license: MIT (dev-only snapshots: skill-sources/superpowers/LICENSE, skill-sources/mattpocock-skills/LICENSE in the repo) -->
