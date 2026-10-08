import { expect, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"

import pkg from "../../package.json"
import plugin from "../../src/plugin"
import { loadSkill } from "../../src/core/skill"
import { skills } from "../../src/skills/index"

const root = new URL("../../", import.meta.url)

test("plugin entry exports { id, setup }", () => {
  expect(plugin.id).toBe("opencode-kit")
  expect(typeof plugin.setup).toBe("function")
})

test("package entry points at the shipped TypeScript source", () => {
  // Guards against regressing to a committed dist/ build.
  expect(pkg.main).toBe("./src/plugin.ts")
  expect(pkg.files).toContain("src")
  expect(existsSync(new URL(pkg.main, root))).toBe(true)
  expect(existsSync(new URL(pkg.bin["opencode-kit"], root))).toBe(true)
  expect(readFileSync(new URL("../../index.js", import.meta.url), "utf8")).toContain("./src/plugin.ts")
})

test("the kit ships the english-writing-assistant and sdd-flow skills", () => {
  const sdd = skills.find((s) => s.id === "sdd-flow")!
  expect(loadSkill(sdd).autoinvoke).toBe(false)
  expect(skills.map((s) => s.id)).toContain("english-writing-assistant")
})
