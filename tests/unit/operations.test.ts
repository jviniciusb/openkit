import { expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { parse } from "jsonc-parser"
import { listOperation, toggleOperation, configSetOperation, configGetOperation } from "../../src/operations/index"
import { globalConfigPath } from "../../src/config/discover"
import type { KitCategory } from "../../src/core/category"
import { categories } from "../../src/catalog"

function deps(home: string, options?: import("../../src/config/types").KitConfigFile) {
  let out = "", err = ""
  return { d: { cwd: home, home, options, out: (s: string) => { out += s }, err: (s: string) => { err += s } }, out: () => out, err: () => err }
}

test("toggle resolves a skill id across categories and writes skills.<id>", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const x = deps(home)
  expect(await toggleOperation(categories, x.d, "sdd-flow", false)).toEqual({ exitCode: 0 })
  expect((parse(readFileSync(globalConfigPath(home), "utf8")) as any).skills["sdd-flow"].enabled).toBe(false)
})

test("configSet rejects a settings-less skill id", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const x = deps(home)
  const res = await configSetOperation(categories, x.d, "sdd-flow", "x", ["1"])
  expect(res.exitCode).not.toBe(0)
  expect(x.err()).toContain("sdd-flow")
})

test("list prints a section per non-empty category", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const x = deps(home)
  await listOperation(categories, x.d)
  expect(x.out()).toContain("tools:")
  expect(x.out()).toContain("skills:")
})

test("toggle on an unknown id reports the id and exits non-zero", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const x = deps(home)
  const res = await toggleOperation(categories, x.d, "ghost", true)
  expect(res.exitCode).toBe(1)
  expect(x.err()).toContain("ghost")
})

test("list tolerates a throwing describe, printing an empty description", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const x = deps(home)
  const throwing: KitCategory<{ id: string }> = {
    key: "tools",
    label: "widgets",
    singular: "widget",
    items: [{ id: "w" }],
    defaultEnabled: () => true,
    hasSettings: false,
    describe: () => {
      throw new Error("boom")
    },
    async registerItem() {
      return { registrations: [] }
    },
  }
  expect(await listOperation([throwing], x.d)).toEqual({ exitCode: 0 })
  expect(x.out()).toContain("w\tenabled\t\n")
})

test("list reflects a plugin-options disable", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const x = deps(home, { tools: { "background-subagents": { enabled: false } } })
  await listOperation(categories, x.d)
  expect(x.out()).toMatch(/background-subagents\s+disabled/)
})

test("configGet reads the effective value from the plugin-options layer", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const x = deps(home, { tools: { "background-subagents": { settings: { greeting: "yo" } } } })
  expect(await configGetOperation(categories, x.d, "background-subagents", "greeting")).toEqual({ exitCode: 0 })
  expect(x.out()).toBe(`"yo"`)
})

test("configGet reads a value set in a project config, not just global", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const projectConfig = join(home, ".opencode", "openkit.jsonc")
  mkdirSync(dirname(projectConfig), { recursive: true })
  writeFileSync(projectConfig, '{ "tools": { "background-subagents": { "settings": { "greeting": "proj" } } } }')
  const x = deps(home)
  expect(await configGetOperation(categories, x.d, "background-subagents", "greeting")).toEqual({ exitCode: 0 })
  expect(x.out()).toBe(`"proj"`)
})

test("configSet writes a tool setting and configGet reads it back", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const set = deps(home)
  expect(await configSetOperation(categories, set.d, "background-subagents", "greeting", ["Hi"])).toEqual({ exitCode: 0 })
  expect((parse(readFileSync(globalConfigPath(home), "utf8")) as any).tools["background-subagents"].settings.greeting).toBe("Hi")

  const get = deps(home)
  expect(await configGetOperation(categories, get.d, "background-subagents", "greeting")).toEqual({ exitCode: 0 })
  expect(get.out()).toBe(`"Hi"`)
})

test("configSet warns via the category inspect hook when the write degrades a tool", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const x = deps(home)
  // `count` is not in background-subagents' schema (additionalProperties:
  // false), so the written settings are invalid; the warning comes from
  // `category.inspect`.
  expect(await configSetOperation(categories, x.d, "background-subagents", "count", ["42"])).toEqual({ exitCode: 0 })
  expect(x.err()).toContain("warning")
  expect(x.err()).toContain("invalid")
})
