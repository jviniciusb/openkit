import { defineSkill, type KitSkill } from "../core/skill"

/**
 * Every skill shipped by opencode-kit.
 *
 * The skill scaffolder inserts new entries between the `<kit:skills>` markers
 * below; keep those comments intact.
 */
export const skills: KitSkill[] = [
  // <kit:skills>
  defineSkill({ id: "english-writing-assistant", dir: new URL("./english-writing-assistant/", import.meta.url) }),
  defineSkill({ id: "sdd-flow", dir: new URL("./sdd-flow/", import.meta.url), autoinvoke: false }),
  // </kit:skills>
]
