import { expect, test } from "bun:test"
import { deepMerge } from "../../src/config/merge"

test("deep-merges nested objects", () => {
  expect(deepMerge({ a: { b: 1, c: 2 } }, { a: { c: 9 } })).toEqual({ a: { b: 1, c: 9 } })
})
test("arrays replace, not concat", () => {
  expect(deepMerge({ list: [1, 2, 3] }, { list: [9] })).toEqual({ list: [9] })
})
test("undefined does not remove a base value", () => {
  expect(deepMerge({ a: 1, b: 2 }, { a: undefined })).toEqual({ a: 1, b: 2 })
})
test("ignores prototype-polluting keys", () => {
  const malicious = JSON.parse('{"__proto__": {"polluted": true}, "b": 2}')
  const merged = deepMerge({ a: 1 } as Record<string, unknown>, malicious)
  expect(merged.b).toBe(2)
  expect((merged as Record<string, unknown>).polluted).toBeUndefined()
  expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  expect(Object.getPrototypeOf(merged)).toBe(Object.prototype)
})
test("ignores constructor and prototype keys", () => {
  const malicious = JSON.parse('{"constructor": {"x": 1}, "prototype": {"y": 1}, "ok": true}')
  const merged = deepMerge({ a: 1 } as Record<string, unknown>, malicious)
  expect(merged.ok).toBe(true)
  expect(Object.hasOwn(merged, "prototype")).toBe(false)
})
