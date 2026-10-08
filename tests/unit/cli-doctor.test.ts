import { expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { pathToFileURL } from "node:url"
import pkg from "../../package.json"
import { globalConfigPath } from "../../src/config/discover"
import { defineSkill } from "../../src/core/skill"
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
    '{ "tools": { "hello": { "settings": { "greeting": 42 } } } }',
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

test("doctor reports skills: ok for a loadable skill", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const dir = mkdtempSync(join(tmpdir(), "skill-"))
  writeFileSync(join(dir, "SKILL.md"), "---\nname: S\n---\nbody")
  const h = io(home)
  const code = await doctorCommand(h.io, [defineSkill({ id: "s", dir: pathToFileURL(`${dir}/`) })])
  expect(code).toBe(0)
  expect(h.out()).toContain("skills: ok")
})

test("doctor fails and names a skill whose SKILL.md is missing", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const h = io(home)
  const code = await doctorCommand(h.io, [defineSkill({ id: "broken", dir: new URL("file:///no-such-dir/") })])
  expect(code).not.toBe(0)
  expect(h.out()).toContain("skill: error broken")
})

test("runCli dispatches init, doctor, and version", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const h = io(home)

  expect(await runCli(["init"], h.io)).toBe(0)
  expect(await runCli(["doctor"], h.io)).toBe(0)
  expect(await runCli(["version"], h.io)).toBe(0)
  expect(await runCli(["init", "--project"], h.io)).toBe(0)
})
