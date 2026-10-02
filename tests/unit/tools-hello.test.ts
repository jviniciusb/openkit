import { expect, test } from "bun:test"
import { tools } from "../../src/tools/index"
import { createFakeContext } from "../../src/core/testing"
import type { KitApi } from "../../src/core/tool"

/**
 * Minimal {@link KitApi} stand-in. `hello.register` only touches `namespace`,
 * but the full surface is stubbed so the test stays honest about the contract
 * (the brief's `{} as any` would hide a missing `namespace`).
 */
function stubKit(): KitApi {
  return {
    namespace() {},
    scriptPath: (name) => name,
    storage: {
      async get() {
        return undefined
      },
      async set() {},
      async remove() {},
    },
    log: { debug() {}, info() {}, warn() {}, error() {} },
    version: "0.0.0",
    tool: async () => ({ dispose() {} }),
    command: async () => ({ dispose() {} }),
    skill: async () => ({ dispose() {} }),
    on: async () => ({ dispose() {} }),
  }
}

test("hello registers exactly one tool named hello", async () => {
  const hello = tools.find((t) => t.id === "hello")!
  const { ctx, calls } = createFakeContext()
  await hello.register(ctx, { greeting: "hi" }, stubKit())
  expect(calls.tool.length).toBe(1)
  expect(JSON.stringify(calls.tool)).toContain("hello")
})
