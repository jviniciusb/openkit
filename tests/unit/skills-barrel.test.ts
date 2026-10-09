import { expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { skills } from "../../src/skills/index"
import { loadSkill } from "../../src/core/skill"
import { tools } from "../../src/tools/index"

test("ships the two expected skills with unique ids across tools and skills", () => {
  expect(skills.map((s) => s.id)).toEqual(["english-writing-assistant", "sdd-flow"])
  const ids = [...tools.map((t) => t.id), ...skills.map((s) => s.id)]
  expect(new Set(ids).size).toBe(ids.length)
})

test("english-writing-assistant parses its folded description and is model-visible", () => {
  const info = loadSkill(skills.find((s) => s.id === "english-writing-assistant")!)
  expect(info.description).toContain("Brazilian Portuguese")
  expect(info.description).not.toContain(">-")
  expect("autoinvoke" in info).toBe(false)
})

test("sdd-flow registers autoinvoke:false with a real directory and resolvable files", () => {
  const skill = skills.find((s) => s.id === "sdd-flow")!
  const info = loadSkill(skill)
  expect(info.autoinvoke).toBe(false)
  expect(info.content).toContain("# SDD Flow")
  expect(info.content).not.toContain("name: sdd-flow")
  expect(info.content).toContain("\n---\n")
  for (const file of ["SKILL.md", "spec-template.md", "step-format.md", "update-refs.sh"]) {
    expect(existsSync(new URL(file, skill.dir))).toBe(true)
  }
})
