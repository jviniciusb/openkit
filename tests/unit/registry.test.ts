import { expect, test } from "bun:test"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { defineTool, type KitApi } from "../../src/core/tool"
import { type KitContext, type KitStorage } from "../../src/core/context"
import { defineSkill, type KitSkill } from "../../src/core/skill"
import { registerTools, registerSkills } from "../../src/core/registry"
import { createFakeContext } from "../../src/core/testing"

const noop = () => ({ dispose() {} })
const kit: KitApi = {
  namespace() {},
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

test("a tool's execute.before hook is tracked and disposed with the tool", async () => {
  let disposed = 0
  const { ctx, calls } = createFakeContext({
    onRegistration: () => ({ dispose: async () => { disposed++ } }),
  })
  const hooked = defineTool({ id: "hooked", name: "Hooked", description: "d", defaultSettings: {},
    register(c) { return c.tool.hook("execute.before", () => {}) } })

  const res = await registerTools(
    [hooked],
    new Map([["hooked", { enabled: true, settings: {} }]]),
    ctx,
    () => kit,
  )

  expect(res.degraded).toEqual([])
  expect(calls.toolHook).toEqual(["execute.before"])
  expect(res.registrations.length).toBe(1)
  await res.registrations[0]!.dispose()
  expect(disposed).toBe(1)
})

test("a tool whose hook registration throws is degraded without breaking siblings", async () => {
  const { ctx } = createFakeContext()
  // Simulate a host whose tool domain cannot register hooks: the tool must
  // degrade in isolation, never break the kit or its siblings.
  ;(ctx.tool as unknown as { hook(): Promise<never> }).hook = async () => {
    throw new Error("hook unsupported")
  }
  const bad = defineTool({ id: "bad", name: "Bad", description: "d", defaultSettings: {},
    register(c) { return c.tool.hook("execute.before", () => {}) } })

  const res = await registerTools(
    [ok, bad],
    new Map([["ok", { enabled: true, settings: {} }], ["bad", { enabled: true, settings: {} }]]),
    ctx,
    () => kit,
  )

  expect(res.degraded.map((d) => d.id)).toEqual(["bad"])
  expect(res.registrations.length).toBe(1)
})

function skillDir(id: string, md: string | null): KitSkill {
  const dir = mkdtempSync(join(tmpdir(), "skill-"))
  if (md !== null) writeFileSync(join(dir, "SKILL.md"), md)
  return defineSkill({ id, dir: pathToFileURL(`${dir}/`) })
}

test("registerSkills registers enabled skills and skips disabled ones", async () => {
  const { ctx, calls } = createFakeContext()
  const res = await registerSkills(
    [skillDir("on", "---\nname: On\n---\nx"), skillDir("off", "---\nname: Off\n---\nx")],
    new Map([["on", { enabled: true }], ["off", { enabled: false }]]),
    ctx,
  )
  expect(calls.skill.length).toBe(1)
  expect(res.degraded).toEqual([])
  expect(res.registrations.length).toBe(1)
})

test("a skill missing SKILL.md degrades only itself, tagged kind: skill", async () => {
  const { ctx, calls } = createFakeContext()
  const res = await registerSkills(
    [skillDir("good", "---\nname: Good\n---\nx"), skillDir("broken", null)],
    new Map([["good", { enabled: true }], ["broken", { enabled: true }]]),
    ctx,
  )
  expect(calls.skill.length).toBe(1)
  expect(res.degraded).toEqual([{ kind: "skill", id: "broken", error: expect.any(String) }])
})

test("registerTools tags degraded entries kind: tool", async () => {
  const { ctx } = createFakeContext()
  const bad = defineTool({ id: "bad", name: "Bad", description: "d", defaultSettings: {},
    register() { throw new Error("nope") } })
  const res = await registerTools([bad], new Map([["bad", { enabled: true, settings: {} }]]), ctx, () => kit)
  expect(res.degraded).toEqual([{ kind: "tool", id: "bad", error: "nope" }])
})
