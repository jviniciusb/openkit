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
  // </kit:skills>
]
