import { expect, test } from "bun:test"
import { createKitApi } from "../../src/core/kit-api"
import { createFakeContext } from "../../src/core/testing"
import { toolCategory } from "../../src/categories/tool"
import { resolveValidated } from "../../src/config/validate"
import { resolveCategoryEntry } from "../../src/core/engine"
import {
  BUILT_IN_RULES,
  contextInjections,
  RULES_HEADING,
  RULES_PREAMBLE,
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

/** The single headed block the tool injects for the given rules. */
const blockFor = (rules: readonly string[]) =>
  [RULES_HEADING, "", RULES_PREAMBLE, "", ...rules.map((rule) => `- ${rule}`)].join("\n")

const injectedText = (event: { system: Array<{ text: string }> }) =>
  event.system.map((part) => part.text).join("\n")

test("careful-changes is enabled by default and injected", async () => {
  const rules = contextInjections.defaultSettings.rules as Record<string, boolean>
  expect(rules["careful-changes"]).toBe(true)

  const rule = BUILT_IN_RULES.find(({ id }) => id === "careful-changes")
  expect(rule).toBeDefined()
  if (rule === undefined) return

  const { handler } = await register(defaults())
  const event = { system: [] as Array<{ type: string; text: string }> }
  await handler!(event)
  expect(injectedText(event)).toContain(rule.text)

  const text = rule.text.toLowerCase()
  expect(text).toContain("re-read")
  expect(text).toContain("unrelated")
  expect(text).toContain("concurrent")
  expect(text).toContain("reachable")
  expect(text).toContain("best coherent end state")
  expect(text).toContain("not the smallest diff")
  expect(text).toContain("change or refactor existing design")
  expect(text).toContain("within the request and any agreed scope")
  expect(text).toContain("without authorization")
  expect(text).toContain("unrelated or concurrent")
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
  const injected = injectedText(event)
  expect(injected).not.toContain(rule.text)
  expect(injected).toContain(BUILT_IN_RULES.find(({ id }) => id === "think-in-code")!.text)
})

test("partial existing rule settings inherit careful-changes default", () => {
  const resolved = resolveCategoryEntry(toolCategory, contextInjections, [
    { tools: { "context-injections": { settings: { rules: { "subagent-driven": false } } } } },
  ])
  expect((resolved.settings?.rules as Record<string, boolean>)["careful-changes"]).toBe(true)
})

test("careful-changes is accepted by the settings schema", () => {
  const settings = {
    ...defaults(),
    rules: { ...defaults().rules, "careful-changes": false },
  }
  expect(resolveValidated(contextInjections, { enabled: true, settings }).degraded).toBeUndefined()
})

test("proactive is enabled by default, injected, and defers to gates", async () => {
  const rules = contextInjections.defaultSettings.rules as Record<string, boolean>
  expect(rules["proactive"]).toBe(true)

  const rule = BUILT_IN_RULES.find(({ id }) => id === "proactive")
  expect(rule).toBeDefined()
  if (rule === undefined) return

  const { handler } = await register(defaults())
  const event = { system: [] as Array<{ type: string; text: string }> }
  await handler!(event)
  expect(injectedText(event)).toContain(rule.text)

  const text = rule.text.toLowerCase()
  expect(text).toContain("proactively")
  expect(text).toContain("no gate or instruction says to stop")
  expect(text).toContain("settle the facts yourself")
  expect(text).toContain("put the remaining decisions to the user")
  expect(text).toContain("high-confidence evidence")
})

test("proactive is accepted by the settings schema", () => {
  const settings = {
    ...defaults(),
    rules: { ...defaults().rules, proactive: false },
  }
  expect(resolveValidated(contextInjections, { enabled: true, settings }).degraded).toBeUndefined()
})

test("think-in-code uses skills for applicable workflows without speculative triggers", () => {
  const text = BUILT_IN_RULES.find(({ id }) => id === "think-in-code")!.text.toLowerCase()
  expect(text).toContain("skill descriptions")
  expect(text).toContain("workflow meaningfully applies")
  expect(text).toContain("even if the request doesn't name it")
  expect(text).toContain("skip only speculative matches")
  expect(text).toContain("prefer available tools over memory")
  expect(text).toContain("mcp")
  expect(text).toContain("relevant fields")
  expect(text).toContain("small sample")
  expect(text).toContain("semantic understanding")
  expect(text).toContain("current facts")
  expect(text).toContain("shape reads and queries")
})

test("functional-programming keeps the idiomatic-otherwise escape hatch", () => {
  const text = BUILT_IN_RULES.find(({ id }) => id === "functional-programming")!.text.toLowerCase()
  expect(text).toContain("referentially transparent")
  expect(text).toContain("immutable data")
  expect(text).toContain("side effects")
  expect(text).toContain("idiomatic otherwise")
  expect(text).toContain("codebase")
})

test("subagent-driven keeps the orchestrator free by dispatching subagents in the background", () => {
  const text = BUILT_IN_RULES.find(({ id }) => id === "subagent-driven")!.text.toLowerCase()
  expect(text).toContain("orchestrator")
  expect(text).toContain("background")
  expect(text).toContain("stay free")
  expect(text).toContain("not stuck waiting")
  expect(text).toContain("fan out")
  expect(text).toContain("fan in")
})

test("decomposition marks the parallel-ready pieces without prescribing dispatch", () => {
  const text = BUILT_IN_RULES.find(({ id }) => id === "decomposition")!.text.toLowerCase()
  expect(text).toContain("ready pieces can proceed in parallel")
  expect(text).not.toMatch(/background|dispatch/)
})

test("think-in-code writes one program for multi-call composition, not bulk only", () => {
  const text = BUILT_IN_RULES.find(({ id }) => id === "think-in-code")!.text.toLowerCase()
  expect(text).toContain("several tool calls")
  expect(text).toContain("returns only the derived value")
  expect(text).toContain("a single call stays direct")
  expect(text).toContain("await every call")
  expect(text).toContain("run independent calls concurrently")
  expect(text).toContain("small, plain value")
  expect(text).toContain("exact tool path and signature")
})

test("injects all built-in rules as one headed block by default", async () => {
  const { calls, handler } = await register(defaults())
  expect(calls.hook).toEqual(["context"])
  const event = { system: [] as Array<{ type: string; text: string }> }
  await handler!(event)
  expect(event.system).toEqual([
    { type: "text", text: blockFor(BUILT_IN_RULES.map((rule) => rule.text)) },
  ])
})

test("omits a rule disabled through settings.rules", async () => {
  const settings = defaults()
  settings.rules["subagent-driven"] = false
  const { handler } = await register(settings)
  const event = { system: [] as Array<{ type: string; text: string }> }
  await handler!(event)
  expect(event.system).toEqual([
    { type: "text", text: blockFor(BUILT_IN_RULES.filter((r) => r.id !== "subagent-driven").map((rule) => rule.text)) },
  ])
})

test("appends extra instructions after the built-ins, trimming blanks", async () => {
  const settings = defaults()
  settings.extra = ["  local rule  ", "", "   ", "second local rule"]
  const { handler } = await register(settings)
  const event = { system: [] as Array<{ type: string; text: string }> }
  await handler!(event)
  expect(event.system).toEqual([
    {
      type: "text",
      text: blockFor([...BUILT_IN_RULES.map((rule) => rule.text), "local rule", "second local rule"]),
    },
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
