import { expect, test } from "bun:test"
import { createKitApi } from "../../src/core/kit-api"
import { createFakeContext } from "../../src/core/testing"
import { contextInjections } from "../../src/tools/context-injections"

async function register(instructions: string[]) {
  const { ctx, calls } = createFakeContext()
  const kit = createKitApi(contextInjections.id, ctx, "0.0.0")
  await contextInjections.register(ctx, { instructions }, kit)
  return { calls, handler: calls.hookHandlers[0] }
}

test("registers one context hook and injects each instruction in order", async () => {
  const { calls, handler } = await register(["first rule", "second rule"])
  expect(calls.hook).toEqual(["context"])
  const event = { system: [] as Array<{ type: string; text: string }> }
  await handler!(event)
  expect(event.system).toEqual([
    { type: "text", text: "first rule" },
    { type: "text", text: "second rule" },
  ])
})

test("trims each instruction and skips blank ones", async () => {
  const { handler } = await register(["  keep  ", "   ", ""])
  const event = { system: [] as Array<{ type: string; text: string }> }
  await handler!(event)
  expect(event.system).toEqual([{ type: "text", text: "keep" }])
})

test("registers no hook when there are no instructions", async () => {
  const { calls } = await register([])
  expect(calls.hook).toEqual([])
})

test("is an opt-in tool with the expected identity and defaults", () => {
  expect(contextInjections.id).toBe("context-injections")
  expect(contextInjections.defaultEnabled).toBe(false)
  expect(contextInjections.defaultSettings).toEqual({ instructions: [] })
})
