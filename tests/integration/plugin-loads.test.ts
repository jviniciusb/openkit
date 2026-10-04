import { expect, test } from "bun:test"
import { spawnSync } from "node:child_process"

test("bun build produces dist/plugin.js exporting a plugin object", async () => {
  const b = spawnSync("bun", ["run", "build:plugin"], { cwd: process.cwd() })
  expect(b.status).toBe(0)
  // @ts-expect-error dist/plugin.js is untyped build output; runtime shape is asserted below.
  const mod = await import("../../dist/plugin.js")
  expect(mod.default.id).toBe("opencode-kit")
  expect(typeof mod.default.setup).toBe("function")
})
