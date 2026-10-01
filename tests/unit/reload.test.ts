import { expect, test } from "bun:test"
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { defineTool } from "../../src/core/tool"
import { createLifecycle } from "../../src/plugin"
import { createFakeContext } from "../../src/core/testing"

test("reload disposes previous registrations then re-registers", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const proj = join(home, "proj"); mkdirSync(join(proj, ".opencode"), { recursive: true })
  const cfg = join(proj, ".opencode", "opencode-kit.jsonc")
  writeFileSync(cfg, `{ "tools": { "a": { "enabled": true } } }`)
  let disposed = 0
  const { ctx, calls } = createFakeContext({ directory: proj,
    onRegistration: () => ({ dispose: async () => { disposed++ } }) })
  const a = defineTool({ id: "a", name: "A", description: "d", defaultSettings: {},
    register(c) { return c.tool.transform(() => {}) } })
  const life = await createLifecycle(ctx, [a], {}, () => () => {})
  expect(calls.tool.length).toBe(1)
  await life.reload()
  expect(disposed).toBe(1)          // first generation released
  expect(calls.tool.length).toBe(2) // re-registered
  await life.dispose()
})
