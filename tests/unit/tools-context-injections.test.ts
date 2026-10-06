import { expect, test } from "bun:test"
import { createKitApi } from "../../src/core/kit-api"
import { createFakeContext } from "../../src/core/testing"
import { resolveToolConfig } from "../../src/config/resolve"
import { resolveValidated } from "../../src/config/validate"
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

test("careful-changes is enabled by default and injected", async () => {
  const rules = contextInjections.defaultSettings.rules as Record<string, boolean>
  expect(rules["careful-changes"]).toBe(true)

  const rule = BUILT_IN_RULES.find(({ id }) => id === "careful-changes")
  expect(rule).toBeDefined()
  if (rule === undefined) return

  const { handler } = await register(defaults())
  const event = { system: [] as Array<{ type: string; text: string }> }
  await handler!(event)
  expect(event.system.map((part) => part.text)).toContain(rule.text)

  const text = rule.text.toLowerCase()
  expect(text).toContain("re-read")
  expect(text).toContain("unrelated")
  expect(text).toContain("concurrent")
  expect(text).toContain("reachable")
  expect(text).toContain("public paste")
})

test("disabling careful-changes leaves other built-ins enabled", async () => {
  const rule = BUILT_IN_RULES.find(({ id }) => id === "careful-changes")
  expect(rule).toBeDefined()
  if (rule === undefined) return

  const settings = defaults()
  ;(settings.rules as Record<string, boolean>)["careful-changes"] = false
  const { handler } = await register(settings)
  const event = { system: [] as Array<{ type: string; text: string }> }
  await handler!(event)
  const injected = event.system.map((part) => part.text)
  expect(injected).not.toContain(rule.text)
  expect(injected).toContain(BUILT_IN_RULES.find(({ id }) => id === "think-in-code")!.text)
})

test("partial existing rule settings inherit careful-changes default", () => {
  const resolved = resolveToolConfig(contextInjections, [
    { tools: { "context-injections": { settings: { rules: { "subagent-driven": false } } } } },
  ])
  expect((resolved.settings.rules as Record<string, boolean>)["careful-changes"]).toBe(true)
})

test("careful-changes is accepted by the settings schema", () => {
  const settings = {
    ...defaults(),
    rules: { ...defaults().rules, "careful-changes": false },
  }
  expect(resolveValidated(contextInjections, { enabled: true, settings }).degraded).toBeUndefined()
})

test("think-in-code prefers focused tools and source reading", () => {
  const text = BUILT_IN_RULES.find(({ id }) => id === "think-in-code")!.text.toLowerCase()
  expect(text).toContain("mcp")
  expect(text).toContain("relevant fields")
  expect(text).toContain("small sample")
  expect(text).toContain("semantic understanding")
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
