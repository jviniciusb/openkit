import { expect, test } from "bun:test"
import { deepMerge } from "../../src/config/merge"
import { valuesEqual } from "../../src/config/effective"

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
test("keeps legitimate constructor and prototype keys", () => {
  // The kit ships a `prototype` skill and settings may use these names, so the
  // pollution guard must not drop them.
  const merged = deepMerge(
    { skills: { prototype: { enabled: false } } },
    { skills: { prototype: { enabled: true } }, constructor: "kept" },
  )
  expect((merged as Record<string, any>).skills.prototype.enabled).toBe(true)
  expect(Object.getOwnPropertyDescriptor(merged, "constructor")?.value).toBe("kept")
})
test("valuesEqual is order-insensitive for object keys", () => {
  expect(valuesEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true)
  expect(valuesEqual({ a: [1, { x: 2, y: 3 }] }, { a: [1, { y: 3, x: 2 }] })).toBe(true)
  expect(valuesEqual({ a: 1 }, { a: 2 })).toBe(false)
  expect(valuesEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
  expect(valuesEqual([1, 2], [2, 1])).toBe(false)
})
