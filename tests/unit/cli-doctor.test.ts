import { expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import pkg from "../../package.json"
import { globalConfigPath } from "../../src/config/discover"
import { doctorCommand, versionCommand } from "../../src/cli/commands/doctor"
import { runCli } from "../../src/cli/index"

function io(home: string) {
  let out = ""
  let err = ""
  return {
    io: { cwd: home, home, stdout: (s: string) => { out += s }, stderr: (s: string) => { err += s } },
    out: () => out,
    err: () => err,
  }
}

test("doctor returns 0 for valid (or absent) config", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const h = io(home)
  const code = await doctorCommand(h.io)
  expect(code).toBe(0)
  expect(h.out()).toContain("config: ok")
})

test("doctor returns non-zero and reports a malformed config", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const dir = dirname(globalConfigPath(home))
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, "opencode-kit.jsonc"), '{ "tools": { ')
  const h = io(home)
  const code = await doctorCommand(h.io)
  expect(code).not.toBe(0)
  expect(h.out()).toContain("config: error")
})

test("doctor reports degraded tools without failing", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const dir = dirname(globalConfigPath(home))
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, "opencode-kit.jsonc"),
    '{ "tools": { "context-injections": { "settings": { "extra": 42 } } } }',
  )
  const h = io(home)
  const code = await doctorCommand(h.io)
  expect(code).toBe(0)
  expect(h.out()).toContain("degraded")
})

test("doctor reports plugin active when listed in opencode.json", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const dir = dirname(globalConfigPath(home))
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, "opencode.json"), '{ "plugins": ["opencode-kit"] }')
  const h = io(home)
  const code = await doctorCommand(h.io)
  expect(code).toBe(0)
  expect(h.out()).toContain("plugin: active")
})

test("version prints CLI and plugin versions", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const h = io(home)
  const code = await versionCommand(h.io)
  expect(code).toBe(0)
  expect(h.out()).toContain("CLI")
  expect(h.out()).toContain("plugin")
  expect(h.out()).toContain(pkg.version)
})

test("runCli dispatches init, doctor, and version", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const h = io(home)

  expect(await runCli(["init"], h.io)).toBe(0)
  expect(await runCli(["doctor"], h.io)).toBe(0)
  expect(await runCli(["version"], h.io)).toBe(0)
  expect(await runCli(["init", "--project"], h.io)).toBe(0)
})
