import { expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { globalConfigPath } from "../../src/config/discover"
import { runCli } from "../../src/cli/index"

test("list prints shipped tools and their enabled state", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  let out = ""
  const code = await runCli(["list"], { cwd: home, home, stdout: (s) => { out += s }, stderr: () => {} })
  expect(code).toBe(0)
  expect(out).toContain("background-subagents")
  expect(out).not.toContain("hello")
  expect(out).toMatch(/enabled|disabled/)
})

test("list reflects config-driven disable", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const globalFile = globalConfigPath(home)
  mkdirSync(dirname(globalFile), { recursive: true })
  writeFileSync(globalFile, '{ "tools": { "background-subagents": { "enabled": false } } }')
  let out = ""
  const code = await runCli(["list"], { cwd: home, home, stdout: (s) => { out += s }, stderr: () => {} })
  expect(code).toBe(0)
  expect(out).toMatch(/background-subagents\s+disabled/)
})

test("unknown command returns non-zero and reports to stderr", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  let err = ""
  const code = await runCli(["bogus"], { cwd: home, home, stdout: () => {}, stderr: (s) => { err += s } })
  expect(code).not.toBe(0)
  expect(err).toContain("bogus")
})
