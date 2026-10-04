import { expect, test } from "bun:test"
import { defineTool } from "../../src/core/tool"

test("defineTool fills defaultEnabled=false when omitted", () => {
  const t = defineTool({ id: "x", name: "X", description: "d",
    defaultSettings: { a: 1 }, register() {} })
  expect(t.defaultEnabled).toBe(false)
})

test("defineTool preserves defaultEnabled=true", () => {
  const t = defineTool({ id: "x", name: "X", description: "d", defaultEnabled: true,
    defaultSettings: {}, register() {} })
  expect(t.defaultEnabled).toBe(true)
})
