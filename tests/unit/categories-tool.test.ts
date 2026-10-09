import { expect, test } from "bun:test"
import { toolCategory } from "../../src/categories/tool"
import type { KitContext } from "../../src/core/context"
import { defineTool } from "../../src/core/tool"
import { createFakeContext } from "../../src/core/testing"

test("toolCategory.registerItem disposes partial registrations when register throws", async () => {
  let disposed = 0
  const { ctx } = createFakeContext({
    onRegistration: () => ({ dispose: async () => { disposed++ } }),
  })
  const tool = defineTool({
    id: "boom", name: "Boom", description: "d", defaultSettings: {},
    async register(c) {
      await c.tool.transform(() => {})
      throw new Error("boom")
    },
  })

  await expect(
    toolCategory.registerItem(tool, { enabled: true, settings: {} }, ctx),
  ).rejects.toThrow("boom")
  expect(disposed).toBe(1)
})

test("toolCategory.registerItem handles a getter-backed frozen context", async () => {
  let disposed = 0
  const { ctx } = createFakeContext({
    onRegistration: () => ({ dispose: async () => { disposed++ } }),
  })
  const real = ctx as unknown as Record<string, unknown>
  // Expose `tool`/`session` only as getter-backed inherited members (no
  // setter): a tracking-wrapper construction based on Object.assign/[[Set]]
  // would throw here.
  const proto = {
    get tool() { return real.tool },
    get session() { return real.session },
  }
  const holder: Record<string, unknown> = {}
  for (const key of ["app", "location", "options", "storage", "command", "skill", "reference"]) {
    holder[key] = real[key]
  }
  const getterCtx = Object.freeze(Object.assign(Object.create(proto), holder)) as unknown as KitContext

  const tool = defineTool({
    id: "getter", name: "G", description: "d", defaultSettings: {},
    register(c) { return c.tool.transform(() => {}) },
  })

  const res = await toolCategory.registerItem(tool, { enabled: true, settings: {} }, getterCtx)
  expect(res.degraded).toBeUndefined()
  expect(res.registrations.length).toBe(1)
  for (const registration of res.registrations) await registration.dispose()
  expect(disposed).toBe(1)
})
