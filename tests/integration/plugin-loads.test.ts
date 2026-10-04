import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"

import plugin from "../../src/plugin"

test("plugin entry exports { id, setup }", () => {
  expect(plugin.id).toBe("opencode-kit")
  expect(typeof plugin.setup).toBe("function")
})

test("root index.js re-exports the TypeScript plugin entry", () => {
  const source = readFileSync(new URL("../../index.js", import.meta.url), "utf8")
  expect(source).toContain("./src/plugin.ts")
})
