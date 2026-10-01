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
