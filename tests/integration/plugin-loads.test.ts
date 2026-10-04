import { expect, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"

import pkg from "../../package.json"
import plugin from "../../src/plugin"

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
