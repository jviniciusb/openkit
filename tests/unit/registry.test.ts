import { expect, test } from "bun:test"
import { defineTool, type KitApi } from "../../src/core/tool"
import { type KitContext, type KitStorage } from "../../src/core/context"
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

test("wrapper construction does not throw for getter-backed or frozen context", async () => {
  let disposed = 0
  const { ctx } = createFakeContext({
    onRegistration: () => ({ dispose: async () => { disposed++ } }),
  })
  const real = ctx as unknown as Record<string, unknown>
  // Expose `tool`/`session` only as getter-backed inherited members (no
  // setter): a construction based on Object.assign/[[Set]] would throw here.
  const proto = {
    get tool() { return real.tool },
    get session() { return real.session },
  }
  const holder: Record<string, unknown> = {}
  for (const key of ["app", "location", "options", "storage", "command", "skill"]) {
    holder[key] = real[key]
  }
  const getterCtx = Object.freeze(Object.assign(Object.create(proto), holder)) as unknown as KitContext

  const a = defineTool({ id: "getter", name: "G", description: "d", defaultSettings: {},
    register(c) { return c.tool.transform(() => {}) } })

  const res = await registerTools(
    [a],
    new Map([["getter", { enabled: true, settings: {} }]]),
    getterCtx,
    () => kit,
  )

  expect(res.degraded).toEqual([])
  expect(res.registrations.length).toBe(1)
  for (const registration of res.registrations) await registration.dispose()
  expect(disposed).toBe(1)
})

test("tracking wrapper preserves getter/prototype context members", async () => {
  const { ctx } = createFakeContext()
  const { app: _inherited, ...rest } = ctx
  // `app` lives only on the prototype; a `{ ...ctx }` wrapper would drop it.
  const proto = { get app() { return { version: "9.9.9" } } }
  const protoCtx = Object.assign(Object.create(proto), rest) as typeof ctx

  let seen: string | undefined
  const probe = defineTool({ id: "probe", name: "Probe", description: "d", defaultSettings: {},
    register(c) { seen = c.app.version; return c.tool.transform(() => {}) } })

  await registerTools(
    [probe],
    new Map([["probe", { enabled: true, settings: {} }]]),
    protoCtx,
    () => kit,
  )
  expect(seen).toBe("9.9.9")
})
