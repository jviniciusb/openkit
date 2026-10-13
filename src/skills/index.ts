import { defineSkill, type KitSkill } from "../core/skill"

/**
 * Every skill shipped by opencode-kit.
 *
 * The skill scaffolder inserts new entries between the `<kit:skills>` markers
 * below; keep those comments intact.
 */
export const skills: KitSkill[] = [
  // <kit:skills>
  defineSkill({ id: "skill-recipe", dir: new URL("./skill-recipe/", import.meta.url), autoinvoke: false }),
  defineSkill({ id: "english-writing-assistant", dir: new URL("./english-writing-assistant/", import.meta.url) }),
  defineSkill({ id: "sdd-flow", dir: new URL("./sdd-flow/", import.meta.url), autoinvoke: false }),
  defineSkill({ id: "interview", dir: new URL("./interview/", import.meta.url) }),
  defineSkill({ id: "research", dir: new URL("./research/", import.meta.url) }),
  defineSkill({ id: "handoff", dir: new URL("./handoff/", import.meta.url), autoinvoke: false }),
  defineSkill({ id: "code-review", dir: new URL("./code-review/", import.meta.url) }),
  defineSkill({ id: "diagnosing-bugs", dir: new URL("./diagnosing-bugs/", import.meta.url) }),
  defineSkill({ id: "verification", dir: new URL("./verification/", import.meta.url) }),
  defineSkill({ id: "prototype", dir: new URL("./prototype/", import.meta.url) }),
  defineSkill({ id: "retro", dir: new URL("./retro/", import.meta.url), autoinvoke: false }),
  defineSkill({ id: "finishing-a-branch", dir: new URL("./finishing-a-branch/", import.meta.url), autoinvoke: false }),
  defineSkill({ id: "dispatching-parallel-agents", dir: new URL("./dispatching-parallel-agents/", import.meta.url) }),
  defineSkill({ id: "using-git-worktrees", dir: new URL("./using-git-worktrees/", import.meta.url) }),
  defineSkill({ id: "writing-for-agents", dir: new URL("./writing-for-agents/", import.meta.url) }),
  defineSkill({ id: "codebase-design", dir: new URL("./codebase-design/", import.meta.url) }),
  defineSkill({ id: "improve-codebase-architecture", dir: new URL("./improve-codebase-architecture/", import.meta.url), autoinvoke: false }),
  defineSkill({ id: "to-spec", dir: new URL("./to-spec/", import.meta.url), autoinvoke: false }),
  defineSkill({ id: "wizard", dir: new URL("./wizard/", import.meta.url) }),
  // </kit:skills>
]
