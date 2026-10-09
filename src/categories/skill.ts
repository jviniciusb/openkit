import { loadSkill, registerSkill, skillDescription, type KitSkill } from "../core/skill"
import type { KitCategory } from "../core/category"
import { skills } from "../skills/index"
import { skillScaffold } from "./scaffold"

/**
 * The skills category.
 *
 * Settings-less and enabled by default. `registerItem` loads the skill's
 * `SKILL.md` and registers it through `ctx.skill.transform`; a missing or
 * unreadable file throws and the engine degrades only that skill. `inspect`
 * reports that same load failure (or `undefined` when the file is readable).
 */
export const skillCategory: KitCategory<KitSkill> = {
  key: "skills",
  label: "skills",
  singular: "skill",
  items: skills,
  defaultEnabled: (skill) => skill.defaultEnabled ?? true,
  hasSettings: false,
  scaffold: skillScaffold,
  describe: skillDescription,
  inspect: (skill) => {
    try {
      loadSkill(skill)
      return undefined
    } catch (error) {
      return error instanceof Error ? error.message : String(error)
    }
  },
  async registerItem(skill, _resolved, ctx) {
    return { registrations: [await registerSkill(ctx, skill)] }
  },
}
