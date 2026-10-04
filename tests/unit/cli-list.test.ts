import { expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { runCli } from "../../src/cli/index"

test("list prints hello and its enabled state", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  let out = ""
  const code = await runCli(["list"], { cwd: home, home, stdout: (s) => { out += s }, stderr: () => {} })
  expect(code).toBe(0)
  expect(out).toContain("hello")
  expect(out).toMatch(/enabled|disabled/)
})

test("list reflects config-driven disable", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const globalDir = join(home, ".config", "opencode")
  mkdirSync(globalDir, { recursive: true })
  writeFileSync(join(globalDir, "opencode-kit.jsonc"), '{ "tools": { "hello": { "enabled": false } } }')
  let out = ""
  const code = await runCli(["list"], { cwd: home, home, stdout: (s) => { out += s }, stderr: () => {} })
  expect(code).toBe(0)
  expect(out).toMatch(/hello\s+disabled/)
})

test("unknown command returns non-zero and reports to stderr", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  let err = ""
  const code = await runCli(["bogus"], { cwd: home, home, stdout: () => {}, stderr: (s) => { err += s } })
  expect(code).not.toBe(0)
  expect(err).toContain("bogus")
})
