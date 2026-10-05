import { afterAll, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { createFakeContext } from "../../src/core/testing"
import { bootstrap } from "../../src/plugin"
import { contextInjections } from "../../src/tools/context-injections"

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

test("enabling with an instruction list registers the context hook", async () => {
  const proj = projectWithConfig(
    `{ "tools": { "context-injections": { "enabled": true, "settings": { "instructions": ["always X"] } } } }`,
  )
  const { ctx, calls } = createFakeContext({ directory: proj })
  const res = await bootstrap(ctx, [contextInjections])
  expect(res.degraded).toEqual([])
  expect(calls.hook).toEqual(["context"])
  await res.dispose()
})

test("enabling with no instructions registers nothing", async () => {
  const proj = projectWithConfig(`{ "tools": { "context-injections": { "enabled": true } } }`)
  const { ctx, calls } = createFakeContext({ directory: proj })
  const res = await bootstrap(ctx, [contextInjections])
  expect(calls.hook).toEqual([])
  await res.dispose()
})
