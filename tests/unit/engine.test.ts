import { expect, test } from "bun:test"
import {
  registerCategories,
  resolveCategoryEntry,
  resolveCategoryEffective,
  type DegradedItem,
} from "../../src/core/engine"
import { createTrackingContext } from "../../src/core/tracking"
import { createFakeContext } from "../../src/core/testing"
import type { KitCategory } from "../../src/core/category"

type Fake = { id: string; defaultEnabled?: boolean; defaults?: Record<string, unknown> }
const widgets: KitCategory<Fake> = {
  key: "tools", label: "widgets", singular: "widget", items: [],
  defaultEnabled: (i) => i.defaultEnabled ?? false,
  hasSettings: true,
  defaultSettings: (i) => i.defaults ?? {},
  async registerItem() { return { registrations: [] } },
}
const plain: KitCategory<Fake> = {
  key: "skills", label: "plain", singular: "plain", items: [],
  defaultEnabled: (i) => i.defaultEnabled ?? true,
  hasSettings: false,
  async registerItem() { return { registrations: [] } },
}

test("seeds defaults then deep-merges source settings; enabled replaces", () => {
  expect(resolveCategoryEntry(widgets, { id: "a", defaults: { n: 1, list: ["a"] } }, []))
    .toEqual({ enabled: false, settings: { n: 1, list: ["a"] } })
  expect(resolveCategoryEntry(widgets, { id: "a", defaults: { n: 1, list: ["a"] } },
    [{ tools: { a: { enabled: true, settings: { n: 2, list: ["b"] } } } }]))
    .toEqual({ enabled: true, settings: { n: 2, list: ["b"] } })
})

test("settings-less category ignores settings and defaults", () => {
  expect(resolveCategoryEntry(plain, { id: "x" }, [{ skills: { x: { settings: { n: 1 } } } }]))
    .toEqual({ enabled: true })
})

test("resolveCategoryEffective records the layer that set enabled", () => {
  const layers = [
    { label: "global", config: { tools: { a: { enabled: false } } } },
    { label: "project", config: { tools: { a: { enabled: true } } } },
  ]
  const eff = resolveCategoryEffective(widgets, { id: "a", defaults: { n: 1 } }, layers)
  expect(eff.enabled).toBe(true)
  expect(eff.enabledLayer?.label).toBe("project")
  expect(eff.settings).toEqual({ n: 1 })
})

function cat(
  key: string,
  items: Array<{ id: string }>,
  registerItem: KitCategory<{ id: string }>["registerItem"],
): KitCategory<{ id: string }> {
  return { key, label: key, singular: key, items, defaultEnabled: () => true, hasSettings: false, registerItem }
}

test("registerCategories skips disabled, registers enabled, isolates throws", async () => {
  const { ctx, calls } = createFakeContext()
  const good = cat("tools", [{ id: "a" }], async (item, _r, c) => {
    const reg = await c.skill.transform(() => {}); return { registrations: [reg] }
  })
  const bad = cat("skills", [{ id: "b" }], async () => { throw new Error("boom") })
  const off = cat("skills", [{ id: "c" }], async () => { throw new Error("should not run") })
  const res = await registerCategories(
    [good, bad, off],
    [{ tools: { a: { enabled: true } }, skills: { b: { enabled: true }, c: { enabled: false } } }],
    ctx,
  )
  expect(calls.skill.length).toBe(1)
  expect(res.registrations.length).toBe(1)
  expect(res.degraded).toEqual([{ category: "skills", id: "b", error: "boom" }])
})

test("registerCategories tags a registerItem's own degraded reason", async () => {
  const { ctx } = createFakeContext()
  const flaky = cat("tools", [{ id: "a" }], async () => ({ registrations: [], degraded: "bad settings" }))
  const res = await registerCategories([flaky], [{ tools: { a: { enabled: true } } }], ctx)
  expect(res.degraded).toEqual([{ category: "tools", id: "a", error: "bad settings" }])
})

test("createTrackingContext tracks and disposes the tool/reference domains", async () => {
  let disposed = 0
  const { ctx } = createFakeContext({ onRegistration: () => ({ dispose: async () => { disposed++ } }) })
  const { ctx: tracked, created } = createTrackingContext(ctx)
  await tracked.tool.transform(() => {})
  await tracked.reference.transform(() => {})
  expect(created.length).toBe(2)
  for (const r of created) await r.dispose()
  expect(disposed).toBe(2)
})

test("createTrackingContext forwards session hook opts to the real context", async () => {
  const { ctx, calls } = createFakeContext()
  const { ctx: tracked } = createTrackingContext(ctx)
  await tracked.session.hook("context", () => {}, { providerID: "openai" })
  expect(calls.hookOpts).toEqual([{ providerID: "openai" }])
})
