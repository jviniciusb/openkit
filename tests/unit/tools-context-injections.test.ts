import { expect, test } from "bun:test"
import { createKitApi } from "../../src/core/kit-api"
import { createFakeContext } from "../../src/core/testing"
import {
  BUILT_IN_RULES,
  contextInjections,
  type ContextInjectionsSettings,
} from "../../src/tools/context-injections"

async function register(settings: ContextInjectionsSettings) {
  const { ctx, calls } = createFakeContext()
  const kit = createKitApi(contextInjections.id, ctx, "0.0.0")
  await contextInjections.register(ctx, settings, kit)
  return { calls, handler: calls.hookHandlers[0] }
}

const defaults = (): ContextInjectionsSettings => ({
  rules: { ...contextInjections.defaultSettings.rules },
  extra: [],
})

test("injects all built-in rules in order by default", async () => {
  const { calls, handler } = await register(defaults())
  expect(calls.hook).toEqual(["context"])
  const event = { system: [] as Array<{ type: string; text: string }> }
  await handler!(event)
  expect(event.system.map((part) => part.text)).toEqual(BUILT_IN_RULES.map((rule) => rule.text))
})

test("omits a rule disabled through settings.rules", async () => {
  const settings = defaults()
  settings.rules["subagent-driven"] = false
  const { handler } = await register(settings)
  const event = { system: [] as Array<{ type: string; text: string }> }
  await handler!(event)
  expect(event.system.length).toBe(BUILT_IN_RULES.length - 1)
  expect(event.system.some((part) => part.text === BUILT_IN_RULES.find((r) => r.id === "subagent-driven")!.text)).toBe(false)
})

test("appends extra instructions after the built-ins, trimming blanks", async () => {
  const settings = defaults()
  settings.extra = ["  local rule  ", "", "   ", "second local rule"]
  const { handler } = await register(settings)
  const event = { system: [] as Array<{ type: string; text: string }> }
  await handler!(event)
  expect(event.system.map((part) => part.text)).toEqual([
    ...BUILT_IN_RULES.map((rule) => rule.text),
    "local rule",
    "second local rule",
  ])
})

test("registers no hook when every rule is disabled and there are no extras", async () => {
  const settings = defaults()
  for (const rule of BUILT_IN_RULES) settings.rules[rule.id] = false
  const { calls } = await register(settings)
  expect(calls.hook).toEqual([])
})

test("is an opt-in tool with every built-in on by default", () => {
  expect(contextInjections.id).toBe("context-injections")
  expect(contextInjections.defaultEnabled).toBe(false)
  for (const rule of BUILT_IN_RULES) {
    expect(contextInjections.defaultSettings.rules[rule.id]).toBe(true)
  }
  expect(contextInjections.defaultSettings.extra).toEqual([])
})
