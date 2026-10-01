import { expect, test } from "bun:test"
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { defineTool } from "../../src/core/tool"
import { bootstrap } from "../../src/plugin"
import { createFakeContext } from "../../src/core/testing"

function projectWithConfig(json: string) {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const proj = join(home, "proj")
  mkdirSync(join(proj, ".opencode"), { recursive: true })
  writeFileSync(join(proj, ".opencode", "opencode-kit.jsonc"), json)
  return { home, proj }
}

test("disabled tool does not register; enabled does", async () => {
  const { proj } = projectWithConfig(`{ "tools": { "a": { "enabled": true }, "b": { "enabled": false } } }`)
  const { ctx, calls } = createFakeContext({ directory: proj })
  const a = defineTool({ id: "a", name: "A", description: "d", defaultSettings: {},
    register(c) { return c.tool.transform(() => {}) } })
  const b = defineTool({ id: "b", name: "B", description: "d", defaultSettings: {},
    register(c) { return c.tool.transform(() => {}) } })
  const res = await bootstrap(ctx, [a, b])
  expect(calls.tool.length).toBe(1)
  await res.dispose()
})

test("bootstrap returns one dispose that releases registrations", async () => {
  const { proj } = projectWithConfig(`{ "tools": { "a": { "enabled": true } } }`)
  let disposed = 0
  const { ctx } = createFakeContext({ directory: proj, onRegistration: () => ({ dispose: async () => { disposed++ } }) })
  const a = defineTool({ id: "a", name: "A", description: "d", defaultSettings: {},
    register(c) { return c.tool.transform(() => {}) } })
  const res = await bootstrap(ctx, [a])
  await res.dispose()
  expect(disposed).toBe(1)
})
