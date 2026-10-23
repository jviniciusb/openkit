import { expect, test } from "bun:test"
import { defineTool } from "../../src/core/tool"

test("defineTool fills defaultEnabled=true when omitted", () => {
  const t = defineTool({ id: "x", name: "X", description: "d",
    defaultSettings: { a: 1 }, register() {} })
  expect(t.defaultEnabled).toBe(true)
})

test("defineTool preserves defaultEnabled=false", () => {
  const t = defineTool({ id: "x", name: "X", description: "d", defaultEnabled: false,
    defaultSettings: {}, register() {} })
  expect(t.defaultEnabled).toBe(false)
})
