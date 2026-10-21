import { expect, test } from "bun:test"
import { mkdtempSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { globalConfigPath } from "../../src/config/discover"
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
  expect(prompts.some((p) => p.text.includes("background-subagents"))).toBe(true)
})

test("`kit enable background-subagents` writes config and triggers reload", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  let reloaded = 0
  const { ctx, calls } = createFakeContext()
  await registerKitCommand(ctx, { home, cwd: home, reload: async () => { reloaded++ }, stdout: () => {} })
  const cmd = (calls.command as any[]).find((c) => c.name === "kit")
  await cmd.execute({ arguments: "enable background-subagents", sessionID: "s", prompt: {}, delivery: "steer" })
  expect(reloaded).toBe(1)
  expect(readFileSync(globalConfigPath(home), "utf8")).toContain("background-subagents")
})

test("setup disposes the lifecycle when command registration fails", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  let registered = 0
  let disposed = 0
  const { ctx } = createFakeContext({
    directory: home,
    home,
    onRegistration: () => {
      registered++
      return { dispose: async () => { disposed++ } }
    },
  })
  ;(ctx as { options: Record<string, unknown> }).options = {
    tools: { "background-subagents": { enabled: true } },
  }
  const broken = {
    ...ctx,
    command: { async transform() { throw new Error("boom") } },
  }
  await expect(plugin.setup(broken)).rejects.toThrow("boom")
  // The item(s) registered during bootstrap were all released.
  expect(registered).toBeGreaterThan(0)
  expect(disposed).toBe(registered)
})

test("`kit config` warns through its output when the write degrades the tool", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  let out = ""
  const { ctx, calls } = createFakeContext()
  await registerKitCommand(ctx, { home, cwd: home, reload: async () => {}, stdout: (s) => { out += s } })
  const cmd = (calls.command as any[]).find((c) => c.name === "kit")

  await cmd.execute({ arguments: "config background-subagents count 42", sessionID: "s" })

  expect(out).toContain("background-subagents.count = 42")
  expect(out).toContain("warning")
  expect(out).toContain("background-subagents")
})

test("`kit list` includes skills", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  let out = ""
  const { ctx, calls } = createFakeContext()
  await registerKitCommand(ctx, { home, cwd: home, reload: async () => {}, stdout: (s) => { out += s } })
  const cmd = (calls.command as any[]).find((c) => c.name === "kit")
  await cmd.execute({ arguments: "list", sessionID: "s" })
  expect(out).toContain("skills:")
  expect(out).toContain("sdd-flow")
})

test("`kit disable sdd-flow` writes the skills section and reloads", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  let reloaded = 0
  const { ctx, calls } = createFakeContext()
  await registerKitCommand(ctx, { home, cwd: home, reload: async () => { reloaded++ }, stdout: () => {} })
  const cmd = (calls.command as any[]).find((c) => c.name === "kit")

  await cmd.execute({ arguments: "disable sdd-flow", sessionID: "s" })

  expect(reloaded).toBe(1)
  const stored = JSON.parse(readFileSync(globalConfigPath(home), "utf8")) as {
    skills?: Record<string, { enabled?: boolean }>
  }
  expect(stored.skills?.["sdd-flow"]?.enabled).toBe(false)
})

test("`kit config` on a skill id reports that skills have no settings", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  let out = ""
  const { ctx, calls } = createFakeContext()
  await registerKitCommand(ctx, { home, cwd: home, reload: async () => {}, stdout: (s) => { out += s } })
  const cmd = (calls.command as any[]).find((c) => c.name === "kit")

  await cmd.execute({ arguments: "config sdd-flow x 1", sessionID: "s" })

  expect(out).toContain("skills have no settings")
  expect(out).toContain("sdd-flow")
})

test("`kit enable` warns when plugin options override the global write", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  let out = ""
  const { ctx, calls } = createFakeContext()
  ;(ctx as { options: Record<string, unknown> }).options = {
    tools: { "background-subagents": { enabled: false } },
  }
  await registerKitCommand(ctx, { home, cwd: home, reload: async () => {}, stdout: (s) => { out += s } })
  const cmd = (calls.command as any[]).find((c) => c.name === "kit")

  await cmd.execute({ arguments: "enable background-subagents", sessionID: "s" })

  expect(out).toContain("background-subagents enabled")
  expect(out).toContain("warning")
  expect(out).toContain("overridden")
  expect(out).toContain("plugin options")
})

test("`kit config set` then `kit config get` round-trips the value", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  let out = ""
  const { ctx, calls } = createFakeContext()
  await registerKitCommand(ctx, { home, cwd: home, reload: async () => {}, stdout: (s) => { out += s } })
  const cmd = (calls.command as any[]).find((c) => c.name === "kit")

  await cmd.execute({ arguments: "config set background-subagents count 42", sessionID: "s" })
  out = ""
  await cmd.execute({ arguments: "config get background-subagents count", sessionID: "s" })

  expect(out).toBe("42")
})

test("`kit config get` reports missing arguments and settings-less categories", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  let out = ""
  const { ctx, calls } = createFakeContext()
  await registerKitCommand(ctx, { home, cwd: home, reload: async () => {}, stdout: (s) => { out += s } })
  const cmd = (calls.command as any[]).find((c) => c.name === "kit")

  await cmd.execute({ arguments: "config get background-subagents", sessionID: "s" })
  expect(out).toContain("config get requires")

  out = ""
  await cmd.execute({ arguments: "config get sdd-flow x", sessionID: "s" })
  expect(out).toContain("skills have no settings")
})
