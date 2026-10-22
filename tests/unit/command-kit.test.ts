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
  await cmd.execute({ prompt: { text: "list" }, sessionID: "s1" })

  expect(prompts.length).toBe(1)
  expect(prompts.every((p) => p.sessionID === "s1")).toBe(true)
  expect(prompts[0]!.text).toContain("background-subagents")
  expect(prompts[0]!.text).toContain("skills:")
})

test("`kit` prefers a synthetic message so output does not resume the model", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const { ctx, calls } = createFakeContext()
  const sent: Array<{ sessionID: string; text: string; resume?: boolean }> = []
  ctx.session.synthetic = (input) => {
    sent.push(input)
  }
  let prompts = 0
  ctx.session.prompt = () => {
    prompts++
  }
  await registerKitCommand(ctx, { home, cwd: home, reload: async () => {}, stdout: () => {} })
  const cmd = (calls.command as any[]).find((c) => c.name === "kit")
  await cmd.execute({ prompt: { text: "list" }, sessionID: "s1" })

  expect(sent.length).toBe(1)
  expect(sent[0]!.sessionID).toBe("s1")
  expect(sent[0]!.resume).toBe(false)
  expect(sent[0]!.text).toContain("background-subagents")
  expect(sent[0]!.text).toContain("skills:")
  expect(prompts).toBe(0)
})

test("`kit` with no subcommand lists every item", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  let out = ""
  const { ctx, calls } = createFakeContext()
  await registerKitCommand(ctx, { home, cwd: home, reload: async () => {}, stdout: (s) => { out += s } })
  const cmd = (calls.command as any[]).find((c) => c.name === "kit")
  await cmd.execute({ prompt: { text: "" }, sessionID: "s" })

  expect(out).toContain("tools:")
  expect(out).toContain("skills:")
  expect(out).not.toContain("kit enable")
})

test("`kit enable background-subagents` writes config and triggers reload", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  let reloaded = 0
  const { ctx, calls } = createFakeContext()
  await registerKitCommand(ctx, { home, cwd: home, reload: async () => { reloaded++ }, stdout: () => {} })
  const cmd = (calls.command as any[]).find((c) => c.name === "kit")
  await cmd.execute({ prompt: { text: "enable background-subagents" }, sessionID: "s", delivery: "steer" })
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

  await cmd.execute({ prompt: { text: "config background-subagents count 42" }, sessionID: "s" })

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
  await cmd.execute({ prompt: { text: "list" }, sessionID: "s" })
  expect(out).toContain("skills:")
  expect(out).toContain("sdd-flow")
})

test("`kit disable sdd-flow` writes the skills section and reloads", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  let reloaded = 0
  const { ctx, calls } = createFakeContext()
  await registerKitCommand(ctx, { home, cwd: home, reload: async () => { reloaded++ }, stdout: () => {} })
  const cmd = (calls.command as any[]).find((c) => c.name === "kit")

  await cmd.execute({ prompt: { text: "disable sdd-flow" }, sessionID: "s" })

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

  await cmd.execute({ prompt: { text: "config sdd-flow x 1" }, sessionID: "s" })

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

  await cmd.execute({ prompt: { text: "enable background-subagents" }, sessionID: "s" })

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

  await cmd.execute({ prompt: { text: "config set background-subagents count 42" }, sessionID: "s" })
  out = ""
  await cmd.execute({ prompt: { text: "config get background-subagents count" }, sessionID: "s" })

  expect(out).toBe("42")
})

test("`kit config get` reports missing arguments and settings-less categories", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  let out = ""
  const { ctx, calls } = createFakeContext()
  await registerKitCommand(ctx, { home, cwd: home, reload: async () => {}, stdout: (s) => { out += s } })
  const cmd = (calls.command as any[]).find((c) => c.name === "kit")

  await cmd.execute({ prompt: { text: "config get background-subagents" }, sessionID: "s" })
  expect(out).toContain("config get requires")

  out = ""
  await cmd.execute({ prompt: { text: "config get sdd-flow x" }, sessionID: "s" })
  expect(out).toContain("skills have no settings")
})
