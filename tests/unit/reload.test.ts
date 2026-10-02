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

test("dispose during an in-flight reload releases the newest generation exactly once", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const proj = join(home, "proj"); mkdirSync(join(proj, ".opencode"), { recursive: true })
  writeFileSync(join(proj, ".opencode", "opencode-kit.jsonc"),
    `{ "tools": { "a": { "enabled": true } } }`)
  // Tag each registration with its creation order so we can prove the *right*
  // generation was disposed — a double-dispose of gen1 with gen2 leaked would
  // also total 2.
  let nextId = 0
  const disposedIds: number[] = []
  const { ctx, calls } = createFakeContext({ directory: proj,
    onRegistration: () => {
      const id = nextId++
      return { dispose: async () => { disposedIds.push(id) } }
    } })

  // Gate the second register call so the reload's bootstrap can be paused
  // mid-flight while dispose() is invoked.
  let releaseSecond = () => {}
  const secondGate = new Promise<void>((resolve) => { releaseSecond = resolve })
  let reachedSecond = () => {}
  const secondStarted = new Promise<void>((resolve) => { reachedSecond = resolve })
  let registrations = 0
  const a = defineTool({ id: "a", name: "A", description: "d", defaultSettings: {},
    async register(c) {
      registrations++
      if (registrations === 2) { reachedSecond(); await secondGate }
      return c.tool.transform(() => {})
    } })

  let onChange: () => void = () => {}
  const life = await createLifecycle(ctx, [a], {}, (_paths, cb) => {
    onChange = cb
    return () => {}
  })
  expect(calls.tool.length).toBe(1)
  expect(disposedIds).toEqual([])

  onChange()                        // starts a reload
  await secondStarted               // reload released gen1 and is bootstrapping gen2
  expect(disposedIds).toEqual([0])  // gen1 (only) released so far

  const disposing = life.dispose()  // queued behind the in-flight reload
  releaseSecond()                   // let gen2's bootstrap finish
  await disposing

  expect(calls.tool.length).toBe(2)     // gen2 was installed
  expect(disposedIds).toEqual([0, 1])   // gen1 once, then gen2 once — no leak/double
})
