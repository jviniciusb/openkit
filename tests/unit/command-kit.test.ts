import { expect, test } from "bun:test"
import { mkdtempSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { registerKitCommand } from "../../src/commands/kit"
import { createFakeContext } from "../../src/core/testing"
import plugin from "../../src/plugin"

test("`kit` routes output through session.prompt when available", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const { ctx, calls } = createFakeContext()
  const prompts: Array<{ sessionID: string; text: string }> = []
  ctx.session.prompt = (input) => {
    prompts.push(input)
  }
  await registerKitCommand(ctx, { home, cwd: home, reload: async () => {}, stdout: () => {} })
  const cmd = (calls.command as any[]).find((c) => c.name === "kit")
  await cmd.execute({ arguments: "list", sessionID: "s1" })

  expect(prompts.length).toBeGreaterThan(0)
  expect(prompts.every((p) => p.sessionID === "s1")).toBe(true)
  expect(prompts.some((p) => p.text.includes("hello"))).toBe(true)
})

test("`kit enable hello` writes config and triggers reload", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  let reloaded = 0
  const { ctx, calls } = createFakeContext()
  await registerKitCommand(ctx, { home, cwd: home, reload: async () => { reloaded++ }, stdout: () => {} })
  const cmd = (calls.command as any[]).find((c) => c.name === "kit")
  await cmd.execute({ arguments: "enable hello", sessionID: "s", prompt: {}, delivery: "steer" })
  expect(reloaded).toBe(1)
  expect(readFileSync(join(home, ".config", "opencode", "opencode-kit.jsonc"), "utf8")).toContain("hello")
})

test("setup disposes the lifecycle when command registration fails", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  let disposed = 0
  const { ctx } = createFakeContext({
    directory: home,
    onRegistration: () => ({ dispose: async () => { disposed++ } }),
  })
  const broken = {
    ...ctx,
    command: { async transform() { throw new Error("boom") } },
  }
  await expect(plugin.setup(broken)).rejects.toThrow("boom")
  expect(disposed).toBe(1)
})
