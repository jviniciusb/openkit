import { expect, test } from "bun:test"
import { defineTool } from "../../src/core/tool"
import { defineSkill, type KitSkill } from "../../src/core/skill"
import { resolveToolConfig, resolveSkillConfig } from "../../src/config/resolve"

const tool = defineTool({ id: "t", name: "T", description: "d",
  defaultEnabled: false, defaultSettings: { n: 1, list: ["a"] }, register() {} })

test("defaults used when no sources mention the tool", () => {
  expect(resolveToolConfig(tool, [])).toEqual({ enabled: false, settings: { n: 1, list: ["a"] } })
})
test("higher source overrides lower; unknown ids ignored", () => {
  const r = resolveToolConfig(tool, [
    { tools: { t: { settings: { n: 2 } }, ghost: { enabled: true } } },
    { tools: { t: { enabled: true, settings: { list: ["b"] } } } },
  ])
  expect(r).toEqual({ enabled: true, settings: { n: 2, list: ["b"] } })
})
test("empty settings/entry does not null defaults", () => {
  expect(resolveToolConfig(tool, [{ tools: { t: {} } }]))
    .toEqual({ enabled: false, settings: { n: 1, list: ["a"] } })
})

const skill: KitSkill = defineSkill({ id: "s", dir: new URL("file:///x/") })

test("skill defaults to enabled with no sources (missing skills key)", () => {
  expect(resolveSkillConfig(skill, [{ tools: { t: { enabled: true } } }])).toEqual({ enabled: true })
})
test("skill enable is replaced by the highest source; unknown ids ignored", () => {
  expect(resolveSkillConfig(skill, [
    { skills: { s: { enabled: false }, ghost: { enabled: true } } },
    { skills: { s: { enabled: true } } },
  ])).toEqual({ enabled: true })
})
test("defineSkill respects an explicit defaultEnabled:false", () => {
  const off = defineSkill({ id: "o", dir: new URL("file:///x/"), defaultEnabled: false })
  expect(resolveSkillConfig(off, [])).toEqual({ enabled: false })
})
