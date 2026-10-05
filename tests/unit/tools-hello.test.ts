import { expect, test } from "bun:test"
import { tools } from "../../src/tools/index"
import { createFakeContext } from "../../src/core/testing"
import { createKitApi } from "../../src/core/kit-api"

test("hello registers exactly one tool named hello", async () => {
  const hello = tools.find((t) => t.id === "hello")!
  const { ctx, calls } = createFakeContext()
  const kit = createKitApi(hello.id, ctx, "0.0.0")
  await hello.register(ctx, { greeting: "hi" }, kit)
  expect(calls.tool.length).toBe(1)
  expect(JSON.stringify(calls.tool)).toContain("hello")
})
