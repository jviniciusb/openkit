import { expect, test } from "bun:test"
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { defineTool } from "../../src/core/tool"
import { defineSkill } from "../../src/core/skill"
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
  const res = await bootstrap(ctx, [a, b], [])
  expect(calls.tool.length).toBe(1)
  await res.dispose()
})

test("bootstrap returns one dispose that releases registrations", async () => {
  const { proj } = projectWithConfig(`{ "tools": { "a": { "enabled": true } } }`)
  let disposed = 0
  const { ctx } = createFakeContext({ directory: proj, onRegistration: () => ({ dispose: async () => { disposed++ } }) })
  const a = defineTool({ id: "a", name: "A", description: "d", defaultSettings: {},
    register(c) { return c.tool.transform(() => {}) } })
  const res = await bootstrap(ctx, [a], [])
  await res.dispose()
  expect(disposed).toBe(1)
})

test("explicit options layer over ctx.options without replacing it", async () => {
  const { proj } = projectWithConfig(`{ "tools": { "a": { "enabled": true } } }`)
  const { ctx } = createFakeContext({ directory: proj })
  // ctx.options is the plugin's own layer; the explicit `options` argument overrides only its keys.
  const scoped = { ...ctx, options: { tools: { a: { settings: { x: 1, y: 1 } } } } }
  let seen: unknown
  const a = defineTool({ id: "a", name: "A", description: "d", defaultSettings: {},
    register(_c, settings) { seen = settings } })
  const res = await bootstrap(scoped, [a], [], { tools: { a: { settings: { y: 2 } } } })
  expect(seen).toEqual({ x: 1, y: 2 })
  await res.dispose()
})

test("bootstrap logs a warning for each degraded tool", async () => {
  const { proj } = projectWithConfig(`{ "tools": { "a": { "enabled": true } } }`)
  const { ctx } = createFakeContext({ directory: proj })
  const warnings: string[] = []
  const original = console.warn
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(" "))
  }
  try {
    const a = defineTool({ id: "a", name: "A", description: "d", defaultSettings: {},
      register() { throw new Error("no-register") } })
    const res = await bootstrap(ctx, [a], [])
    expect(warnings.some((w) => w.includes('tool "a" degraded') && w.includes("no-register"))).toBe(true)
    await res.dispose()
  } finally {
    console.warn = original
  }
})

test("dispose releases remaining registrations when one disposer throws", async () => {
  const { proj } = projectWithConfig(`{ "tools": { "a": { "enabled": true } } }`)
  let made = 0
  let disposed = 0
  const { ctx } = createFakeContext({ directory: proj, onRegistration: () => {
    made++
    return made === 1
      ? { dispose: async () => { throw new Error("boom") } }
      : { dispose: async () => { disposed++ } }
  } })
  const a = defineTool({ id: "a", name: "A", description: "d", defaultSettings: {},
    async register(c) { await c.tool.transform(() => {}); await c.tool.transform(() => {}) } })
  const res = await bootstrap(ctx, [a], [])
  await res.dispose()
  expect(disposed).toBe(1)
})

test("bootstrap registers enabled skills and disposes them", async () => {
  const { proj } = projectWithConfig(`{ "skills": { "s": { "enabled": true } } }`)
  let disposed = 0
  const { ctx, calls } = createFakeContext({ directory: proj,
    onRegistration: () => ({ dispose: async () => { disposed++ } }) })
  const dir = mkdtempSync(join(tmpdir(), "skill-"))
  writeFileSync(join(dir, "SKILL.md"), "---\nname: S\n---\nbody")
  const skill = defineSkill({ id: "s", dir: pathToFileURL(`${dir}/`) })
  const res = await bootstrap(ctx, [], [skill])
  expect(calls.skill.length).toBe(1)
  await res.dispose()
  expect(disposed).toBe(1)
})
