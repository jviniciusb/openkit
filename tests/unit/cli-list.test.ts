import { expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { globalConfigPath } from "../../src/config/discover"
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
  const globalFile = globalConfigPath(home)
  mkdirSync(dirname(globalFile), { recursive: true })
  writeFileSync(globalFile, '{ "tools": { "hello": { "enabled": false } } }')
  let out = ""
  const code = await runCli(["list"], { cwd: home, home, stdout: (s) => { out += s }, stderr: () => {} })
  expect(code).toBe(0)
  expect(out).toMatch(/hello\s+disabled/)
})

test("list reflects config-driven skill disable", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const globalFile = globalConfigPath(home)
  mkdirSync(dirname(globalFile), { recursive: true })
  writeFileSync(globalFile, '{ "skills": { "sdd-flow": { "enabled": false } } }')
  let out = ""
  const code = await runCli(["list"], { cwd: home, home, stdout: (s) => { out += s }, stderr: () => {} })
  expect(code).toBe(0)
  expect(out).toMatch(/sdd-flow\s+disabled/)
})

test("list prints a tools section and a skills section", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  let out = ""
  const code = await runCli(["list"], { cwd: home, home, stdout: (s) => { out += s }, stderr: () => {} })
  expect(code).toBe(0)
  expect(out).toContain("tools:")
  expect(out).toContain("skills:")
  expect(out).toMatch(/english-writing-assistant\s+enabled/)
  expect(out).toMatch(/sdd-flow\s+enabled/)
})

test("unknown command returns non-zero and reports to stderr", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  let err = ""
  const code = await runCli(["bogus"], { cwd: home, home, stdout: () => {}, stderr: (s) => { err += s } })
  expect(code).not.toBe(0)
  expect(err).toContain("bogus")
})
