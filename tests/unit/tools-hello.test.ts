import { expect, test } from "bun:test"
import { tools } from "../../src/tools/index"
import { hello } from "../../src/tools/hello/index"
import { createFakeContext } from "../../src/core/testing"
import { createKitApi } from "../../src/core/kit-api"

test("hello example is not in the shipped tool registry", () => {
  expect(tools.some((tool) => tool.id === "hello")).toBe(false)
})

test("hello example registers exactly one tool named hello", async () => {
  const { ctx, calls } = createFakeContext()
  const kit = createKitApi(hello.id, ctx, "0.0.0")
  await hello.register(ctx, { greeting: "hi" }, kit)
  expect(calls.tool.length).toBe(1)
  expect(JSON.stringify(calls.tool)).toContain("hello")
})
