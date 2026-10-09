import { expect, test } from "bun:test"
import { createKitApi } from "../../src/core/kit-api"
import { createFakeContext } from "../../src/core/testing"

test("on forwards opts to session.hook", async () => {
  const { ctx, calls } = createFakeContext()
  const kit = createKitApi("t", ctx, "0.0.0")
  await kit.on("context", () => {}, { providerID: "openai" })
  expect(calls.hookOpts).toEqual([{ providerID: "openai" }])
})

test("toolHook registers an execute.before hook", async () => {
  const { ctx, calls } = createFakeContext()
  const kit = createKitApi("t", ctx, "0.0.0")
  await kit.toolHook("execute.before", () => {})
  expect(calls.toolHook).toEqual(["execute.before"])
})

test("fake storage exposes scan", async () => {
  const { ctx } = createFakeContext()
  expect(await ctx.storage.scan({ prefix: "" })).toEqual({ entries: [] })
})

test("fake reference transform records name and source", async () => {
  const { ctx, calls } = createFakeContext()
  await ctx.reference.transform((editor) => {
    editor.add("docs", { type: "local", path: "./docs" })
  })
  expect(calls.reference).toEqual([{ name: "docs", source: { type: "local", path: "./docs" } }])
})

test("fake records every hook opts value in order", async () => {
  const { ctx, calls } = createFakeContext()
  await ctx.session.hook("context", () => {}, { providerID: "openai" })
  await ctx.session.hook("event", () => {})
  expect(calls.hookOpts).toEqual([{ providerID: "openai" }, undefined])
})

test("fake prompt recorder records and delegates to the supplied function", async () => {
  const seen: string[] = []
  const { ctx, calls } = createFakeContext({ prompt: (input) => { seen.push(input.text) } })
  await ctx.session.prompt!({ sessionID: "s1", text: "hi" })
  expect(calls.prompt).toEqual([{ sessionID: "s1", text: "hi" }])
  expect(seen).toEqual(["hi"])
})

test("fake prompt stays undefined by default and when false", () => {
  expect(createFakeContext().ctx.session.prompt).toBeUndefined()
  expect(createFakeContext({ prompt: false }).ctx.session.prompt).toBeUndefined()
})

test("fake merges arbitrary options and keeps home", () => {
  const { ctx } = createFakeContext({ options: { tools: { a: { enabled: true } } }, home: "/h" })
  expect(ctx.options).toEqual({ tools: { a: { enabled: true } }, home: "/h" })
})
