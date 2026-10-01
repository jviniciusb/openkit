import { expect, test } from "bun:test"
import { defineTool, type KitApi } from "../../src/core/tool"
import { type KitStorage } from "../../src/core/context"
import { registerTools } from "../../src/core/registry"
import { createFakeContext } from "../../src/core/testing"

const noop = () => ({ dispose() {} })
const kit: KitApi = {
  namespace() {},
  scriptPath: (n: string) => n,
  storage: {} as KitStorage,
  log: { debug(){}, info(){}, warn(){}, error(){} },
  version: "0.0.0",
  async tool() { return noop() },
  async command() { return noop() },
  async skill() { return noop() },
  async on() { return noop() },
}

const ok = defineTool({ id: "ok", name: "OK", description: "d", defaultSettings: {},
  register(ctx) { return ctx.tool.transform(() => {}) } })

// A tool that registers one thing, then throws: its partial registration must be disposed.
let disposed = 0
const boom = defineTool({ id: "boom", name: "Boom", description: "d", defaultSettings: {},
  async register(ctx) {
    await ctx.tool.transform(() => {})          // returns a disposable registration
    throw new Error("kaboom")
  } })

test("enabled tools register; disabled are skipped", async () => {
  const { ctx, calls } = createFakeContext()
  const res = await registerTools([ok], new Map([["ok", { enabled: true, settings: {} }]]), ctx, () => kit)
  expect(res.registrations.length).toBe(1)
  expect(calls.tool.length).toBe(1)
})

test("a throwing tool is isolated and its partial registrations disposed", async () => {
  const { ctx } = createFakeContext({ onRegistration: () => ({ dispose: async () => { disposed++ } }) })
  const res = await registerTools([ok, boom], new Map([
    ["ok", { enabled: true, settings: {} }], ["boom", { enabled: true, settings: {} }],
  ]), ctx, () => kit)
  expect(res.degraded.map(d => d.id)).toEqual(["boom"])
  expect(disposed).toBe(1)
  expect(res.registrations.length).toBe(1) // only "ok"
})
