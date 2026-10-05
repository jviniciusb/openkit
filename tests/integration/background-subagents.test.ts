import { expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { createFakeContext } from "../../src/core/testing"
import { bootstrap } from "../../src/plugin"
import { backgroundSubagents } from "../../src/tools/background-subagents"

function projectWithConfig(json: string) {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const proj = join(home, "proj")
  mkdirSync(join(proj, ".opencode"), { recursive: true })
  writeFileSync(join(proj, ".opencode", "opencode-kit.jsonc"), json)
  return { home, proj }
}

test("enabling the tool registers exactly one execute.before hook", async () => {
  const { proj } = projectWithConfig(`{ "tools": { "background-subagents": { "enabled": true } } }`)
  const { ctx, calls } = createFakeContext({ directory: proj })
  const res = await bootstrap(ctx, [backgroundSubagents])
  expect(res.degraded).toEqual([])
  expect(calls.toolHook).toEqual(["execute.before"])
  await res.dispose()
})

test("disabling the tool registers nothing", async () => {
  const { proj } = projectWithConfig(`{ "tools": { "background-subagents": { "enabled": false } } }`)
  const { ctx, calls } = createFakeContext({ directory: proj })
  const res = await bootstrap(ctx, [backgroundSubagents])
  expect(calls.toolHook).toEqual([])
  await res.dispose()
})
