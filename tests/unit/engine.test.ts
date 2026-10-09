import { expect, test } from "bun:test"
import { resolveCategoryEntry, resolveCategoryEffective, type DegradedItem } from "../../src/core/engine"
import type { KitCategory } from "../../src/core/category"

type Fake = { id: string; defaultEnabled?: boolean; defaults?: Record<string, unknown> }
const widgets: KitCategory<Fake> = {
  key: "tools", label: "widgets", items: [],
  defaultEnabled: (i) => i.defaultEnabled ?? false,
  hasSettings: true,
  defaultSettings: (i) => i.defaults ?? {},
  async registerItem() { return { registrations: [] } },
}
const plain: KitCategory<Fake> = {
  key: "skills", label: "plain", items: [],
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
