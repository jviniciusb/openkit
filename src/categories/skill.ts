import { registerSkill, skillDescription, type KitSkill } from "../core/skill"
import type { KitCategory } from "../core/category"
import { skills } from "../skills/index"

/**
 * The skills category.
 *
 * Settings-less and enabled by default. `registerItem` loads the skill's
 * `SKILL.md` and registers it through `ctx.skill.transform`; a missing or
 * unreadable file throws and the engine degrades only that skill.
 */
export const skillCategory: KitCategory<KitSkill> = {
  key: "skills",
  label: "skills",
  items: skills,
  defaultEnabled: (skill) => skill.defaultEnabled ?? true,
  hasSettings: false,
  describe: skillDescription,
  async registerItem(skill, _resolved, ctx) {
    return { registrations: [await registerSkill(ctx, skill)] }
  },
}
