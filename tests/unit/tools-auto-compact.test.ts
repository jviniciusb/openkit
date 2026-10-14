import { expect, test } from "bun:test"
import type { KitEvent, SessionMessageInfo } from "../../src/core/context"
import { createKitApi } from "../../src/core/kit-api"
import { createFakeContext } from "../../src/core/testing"
import { resolveValidated } from "../../src/config/validate"
import { tools } from "../../src/tools"
import { autoCompact } from "../../src/tools/auto-compact"

class EventChannel {
  private values: KitEvent[] = []
  private waiters: ((result: IteratorResult<KitEvent>) => void)[] = []
  closed = false

  send(event: KitEvent) {
    const waiter = this.waiters.shift()
    if (waiter) waiter({ done: false, value: event })
    else this.values.push(event)
  }

  close() {
    this.closed = true
    for (const waiter of this.waiters.splice(0)) waiter({ done: true, value: undefined })
  }

  private next(): Promise<IteratorResult<KitEvent>> {
    const value = this.values.shift()
    if (value) return Promise.resolve({ done: false, value })
    if (this.closed) return Promise.resolve({ done: true, value: undefined })
    return new Promise((resolve) => this.waiters.push(resolve))
  }

  async *listen(signal?: AbortSignal): AsyncGenerator<KitEvent> {
    const close = () => this.close()
    signal?.addEventListener("abort", close, { once: true })
    try {
      while (!signal?.aborted) {
        const result = await this.next()
        if (result.done) return
        yield result.value
      }
    } finally {
      signal?.removeEventListener("abort", close)
    }
  }
}

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

async function waitFor(predicate: () => boolean) {
  for (let attempt = 0; attempt < 50 && !predicate(); attempt++) await tick()
  expect(predicate()).toBe(true)
}

function prompt(tokens: number, created = 1, cacheRead = 0): SessionMessageInfo {
  return {
    type: "assistant",
    time: { created },
    tokens: { input: tokens, cache: { read: cacheRead, write: 0 } },
  }
}

function configure(messages: readonly SessionMessageInfo[]) {
  const { ctx } = createFakeContext()
  const events = new EventChannel()
  const calls: string[] = []
  ctx.event.subscribe = ({ signal } = {}) => events.listen(signal)
  ctx.session.wait = async ({ sessionID }) => { calls.push(`wait:${sessionID}`) }
  ctx.session.context = async ({ sessionID }) => {
    calls.push(`context:${sessionID}`)
    return messages
  }
  ctx.session.compact = async ({ sessionID, delivery }) => { calls.push(`compact:${sessionID}:${delivery}`) }
  return { ctx, events, calls }
}

test("catalog exposes auto-compact as an opt-in tool", () => {
  const item = tools.find(({ id }) => id === "auto-compact")
  expect(item).toBeDefined()
  expect(item?.defaultEnabled).toBe(false)
  expect(autoCompact.defaultSettings.thresholdTokens).toBe(250_000)
})

test("accepts a configured positive integer threshold", () => {
  const result = resolveValidated(autoCompact, {
    enabled: true,
    settings: { thresholdTokens: 180_000 },
  })
  expect(result.degraded).toBeUndefined()
  expect(result.config.settings.thresholdTokens).toBe(180_000)
})

test("compacts at the threshold after waiting for the idle session", async () => {
  const { ctx, events, calls } = configure([prompt(249_999, 1, 1)])
  const registration = await autoCompact.register(ctx, autoCompact.defaultSettings, createKitApi(autoCompact.id, ctx, "0.0.0"))

  events.send({ type: "session.idle", data: { sessionID: "root" } })
  await waitFor(() => calls.includes("compact:root:queue"))
  expect(calls).toEqual(["wait:root", "context:root", "compact:root:queue"])

  await registration?.dispose()
  expect(events.closed).toBe(true)
})

test("compacts from the non-deprecated session.status idle event", async () => {
  const { ctx, events, calls } = configure([prompt(250_000)])
  const registration = await autoCompact.register(ctx, autoCompact.defaultSettings, createKitApi(autoCompact.id, ctx, "0.0.0"))

  events.send({ type: "session.status", data: { sessionID: "root", status: { type: "idle" } } })
  await waitFor(() => calls.includes("compact:root:queue"))
  expect(calls).toEqual(["wait:root", "context:root", "compact:root:queue"])

  await registration?.dispose()
})

test("compacts when an existing idle session is viewed", async () => {
  const { ctx, events, calls } = configure([prompt(250_000)])
  const registration = await autoCompact.register(ctx, autoCompact.defaultSettings, createKitApi(autoCompact.id, ctx, "0.0.0"))

  events.send({ type: "session.viewed", data: { sessionID: "root", idle: 1 } })
  await waitFor(() => calls.includes("compact:root:queue"))
  expect(calls).toEqual(["wait:root", "context:root", "compact:root:queue"])

  await registration?.dispose()
})

test("does not compact while session.status reports the session busy", async () => {
  const { ctx, events, calls } = configure([prompt(300_000)])
  const registration = await autoCompact.register(ctx, autoCompact.defaultSettings, createKitApi(autoCompact.id, ctx, "0.0.0"))

  events.send({ type: "session.status", data: { sessionID: "root", status: { type: "busy" } } })
  await tick()
  expect(calls).toEqual([])

  await registration?.dispose()
})

test("does not compact stale pre-compaction usage or usage below threshold", async () => {
  const { ctx, events, calls } = configure([
    prompt(300_000, 1),
    { type: "compaction", time: { created: 2 } },
    prompt(249_999, 3),
  ])
  const registration = await autoCompact.register(ctx, autoCompact.defaultSettings, createKitApi(autoCompact.id, ctx, "0.0.0"))

  events.send({ type: "session.idle", data: { sessionID: "root" } })
  await waitFor(() => calls.includes("context:root"))
  await tick()
  expect(calls).toEqual(["wait:root", "context:root"])

  await registration?.dispose()
})

test("waits for related child agents, tools, and background shells before compacting", async () => {
  const { ctx, events, calls } = configure([prompt(250_000)])
  const registration = await autoCompact.register(ctx, autoCompact.defaultSettings, createKitApi(autoCompact.id, ctx, "0.0.0"))

  events.send({ type: "session.created", data: { sessionID: "child", parentID: "root" } })
  events.send({ type: "session.execution.started", data: { sessionID: "child" } })
  events.send({ type: "session.tool.called", data: { sessionID: "root", id: "background_call" } })
  events.send({
    type: "session.shell.started",
    data: { sessionID: "child", shell: { id: "shell_1", status: "running" } },
  })
  events.send({ type: "session.idle", data: { sessionID: "root" } })
  await waitFor(() => calls.includes("wait:root"))
  await tick()
  expect(calls).toEqual(["wait:root"])

  events.send({ type: "session.execution.succeeded", data: { sessionID: "child" } })
  await tick()
  expect(calls.filter((call) => call.startsWith("context:") || call.startsWith("compact:"))).toEqual([])

  events.send({
    type: "session.shell.ended",
    data: { sessionID: "child", shell: { id: "shell_1", status: "exited" } },
  })
  await tick()
  expect(calls.filter((call) => call.startsWith("context:") || call.startsWith("compact:"))).toEqual([])

  events.send({ type: "session.tool.success", data: { sessionID: "root", id: "background_call" } })
  await waitFor(() => calls.includes("compact:root:queue"))
  expect(calls.at(-1)).toBe("compact:root:queue")

  await registration?.dispose()
})
