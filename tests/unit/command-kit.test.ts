import { expect, test } from "bun:test"
import { mkdtempSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { registerKitCommand } from "../../src/commands/kit"
import { createFakeContext } from "../../src/core/testing"

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
