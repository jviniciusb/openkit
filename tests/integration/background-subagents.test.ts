import { afterAll, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { createFakeContext } from "../../src/core/testing"
import { bootstrap } from "../../src/plugin"
import { backgroundSubagents } from "../../src/tools/background-subagents"

const tempDirs: string[] = []

afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true })
})

function projectWithConfig(json: string): string {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  tempDirs.push(home)
  const proj = join(home, "proj")
  mkdirSync(join(proj, ".opencode"), { recursive: true })
  writeFileSync(join(proj, ".opencode", "opencode-kit.jsonc"), json)
  return proj
}

test("enabling the tool registers exactly one execute.before hook", async () => {
  const proj = projectWithConfig(`{ "tools": { "background-subagents": { "enabled": true } } }`)
  const { ctx, calls } = createFakeContext({ directory: proj })
  const res = await bootstrap(ctx, [backgroundSubagents], [])
  expect(res.degraded).toEqual([])
  expect(calls.toolHook).toEqual(["execute.before"])
  await res.dispose()
})

test("disabling the tool registers nothing", async () => {
  const proj = projectWithConfig(`{ "tools": { "background-subagents": { "enabled": false } } }`)
  const { ctx, calls } = createFakeContext({ directory: proj })
  const res = await bootstrap(ctx, [backgroundSubagents], [])
  expect(calls.toolHook).toEqual([])
  await res.dispose()
})
