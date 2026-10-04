import { expect, test } from "bun:test"
import { validateToolSettings, resolveValidated } from "../../src/config/validate"
import { defineTool } from "../../src/core/tool"

const schema = { type: "object", properties: { n: { type: "integer" } }, required: ["n"] }

test("valid settings pass", () => {
  expect(validateToolSettings(schema, { n: 1 }).valid).toBe(true)
})
test("invalid settings report errors", () => {
  const r = validateToolSettings(schema, { n: "x" })
  expect(r.valid).toBe(false)
})
test("no schema is always valid", () => {
  expect(validateToolSettings(undefined, { anything: true }).valid).toBe(true)
})
test("invalid settings fall back to defaults and mark degraded", () => {
  const tool = defineTool({ id: "t", name: "T", description: "d",
    defaultSettings: { n: 5 }, settingsSchema: schema, register() {} })
  const r = resolveValidated(tool, { enabled: true, settings: { n: "x" } })
  expect(r.config).toEqual({ enabled: true, settings: { n: 5 } })
  expect(r.degraded).toBeDefined()
})

test("malformed schema does not throw; degrades to defaults", () => {
  const bad = { type: 123 }
  expect(() => validateToolSettings(bad, { n: 1 })).not.toThrow()
  const v = validateToolSettings(bad, { n: 1 })
  expect(v.valid).toBe(false)

  const tool = defineTool({ id: "t", name: "T", description: "d",
    defaultSettings: { n: 5 }, settingsSchema: bad, register() {} })
  const r = resolveValidated(tool, { enabled: true, settings: { n: "x" } })
  expect(r.config).toEqual({ enabled: true, settings: { n: 5 } })
  expect(r.degraded).toBeDefined()
  expect(r.degraded).toContain("t")
})
