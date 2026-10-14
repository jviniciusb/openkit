import { expect, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"

import pkg from "../../package.json"
import plugin from "../../src/plugin"
import { categories } from "../../src/catalog"
import { loadSkill } from "../../src/core/skill"
import { skills } from "../../src/skills/index"

const root = new URL("../../", import.meta.url)

test("plugin entry exports { id, setup }", () => {
  expect(plugin.id).toBe("openkit")
  expect(typeof plugin.setup).toBe("function")
})

test("package entry points at the shipped TypeScript source", () => {
  // Guards against regressing to a committed dist/ build.
  expect(pkg.main).toBe("./src/plugin.ts")
  expect(pkg.files).toContain("src")
  expect(existsSync(new URL(pkg.main, root))).toBe(true)
  expect(existsSync(new URL(pkg.bin["openkit"], root))).toBe(true)
  expect(readFileSync(new URL("../../index.js", import.meta.url), "utf8")).toContain("./src/plugin.ts")
})

test("package files exclude dev-only trees so upstream text is never published", () => {
  // skill-sources/ holds vendored upstream text; scripts/, docs/, and tests/ are
  // maintainer-only. None may ship in the published package.
  for (const excluded of ["skill-sources", "scripts", "docs", "tests"]) {
    const shipped = pkg.files.some(
      (entry) => entry === excluded || entry.startsWith(`${excluded}/`),
    )
    expect(shipped).toBe(false)
  }
})

test("the kit ships the english-writing-assistant, sdd-flow, and interview skills", () => {
  const sdd = skills.find((s) => s.id === "sdd-flow")!
  expect(loadSkill(sdd).autoinvoke).toBe(false)
  expect(skills.map((s) => s.id)).toContain("english-writing-assistant")
  const interview = skills.find((s) => s.id === "interview")
  expect(interview).toBeDefined()
  expect(loadSkill(interview!).name).toBe("interview")
  expect("autoinvoke" in loadSkill(interview!)).toBe(false)
})

test("the catalog loads tools, skills, and references categories", () => {
  expect(categories.map((c) => c.key)).toEqual(["tools", "skills", "references"])
  for (const category of categories) {
    expect(Array.isArray(category.items)).toBe(true)
    expect(typeof category.registerItem).toBe("function")
  }
})
