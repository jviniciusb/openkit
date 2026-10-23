import { expect, test } from "bun:test"
import type { ToolExecuteBeforeEvent } from "../../src/core/context"
import { createKitApi } from "../../src/core/kit-api"
import { createFakeContext } from "../../src/core/testing"
import { backgroundSubagents, SUBAGENT_TOOL } from "../../src/tools/background-subagents"

async function runHook(input: unknown, tool: string = SUBAGENT_TOOL) {
  const { ctx, calls } = createFakeContext()
  const kit = createKitApi(backgroundSubagents.id, ctx, "0.0.0")
  await backgroundSubagents.register(ctx, {}, kit)
  const handler = calls.toolHookHandlers[0]!
  const event: ToolExecuteBeforeEvent = {
    tool, input, sessionID: "ses_1", agent: "build", messageID: "msg_1", id: "call_1",
  }
  await handler(event)
  return event
}

test("forces background=true when the caller omitted it", async () => {
  const event = await runHook({ agent: "explore", description: "map auth", prompt: "map it" })
  expect(event.input).toEqual({ agent: "explore", description: "map auth", prompt: "map it", background: true })
})

test("overrides an explicit background=false", async () => {
  const event = await runHook({ agent: "explore", description: "d", prompt: "p", background: false })
  expect((event.input as { background: boolean }).background).toBe(true)
})

test("preserves model and sessionID while forcing background", async () => {
  const event = await runHook({
    agent: "explore", description: "d", prompt: "p",
    model: "anthropic/claude-sonnet-4-5", sessionID: "ses_child",
  })
  expect(event.input).toEqual({
    agent: "explore", description: "d", prompt: "p",
    model: "anthropic/claude-sonnet-4-5", sessionID: "ses_child", background: true,
  })
})

test("leaves other tools untouched (shell, same reference)", async () => {
  const shellInput = { command: "ls -la", workdir: "/tmp" }
  const event = await runHook(shellInput, "shell")
  expect(event.input).toBe(shellInput)
})

test("ignores non-object input without throwing", async () => {
  const event = await runHook("not-an-object")
  expect(event.input).toBe("not-an-object")
})

test("leaves null, undefined, and array input untouched without throwing", async () => {
  for (const input of [null, undefined, [1, 2]]) {
    const event = await runHook(input)
    expect(event.input).toBe(input)
  }
})

test("is enabled by default with the expected identity", () => {
  expect(backgroundSubagents.id).toBe("background-subagents")
  expect(backgroundSubagents.defaultEnabled).toBe(true)
})
