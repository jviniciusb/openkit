import { expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { pathToFileURL } from "node:url"
import { doctorCommand } from "../../scripts/doctor"
import { skillCategory } from "../../src/categories/skill"
import { globalConfigPath } from "../../src/config/discover"
import { defineSkill } from "../../src/core/skill"

function io(home: string) {
  let out = ""
  return {
    io: { cwd: home, home, stdout: (s: string) => { out += s } },
    out: () => out,
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
  writeFileSync(join(dir, "openkit.jsonc"), '{ "tools": { ')
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
    join(dir, "openkit.jsonc"),
    '{ "tools": { "context-injections": { "settings": { "extra": 42 } } } }',
  )
  const h = io(home)
  const code = await doctorCommand(h.io)
  expect(code).toBe(0)
  expect(h.out()).toContain("degraded")
})

test("doctor folds the plugin-options layer into inspect", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const dir = dirname(globalConfigPath(home))
  mkdirSync(dir, { recursive: true })
  // Invalid settings supplied only through `plugins[].options` must still
  // surface, matching list/config get and the runtime bootstrap.
  writeFileSync(
    join(dir, "opencode.json"),
    '{ "plugins": [["openkit", { "tools": { "context-injections": { "settings": { "extra": 42 } } } }]] }',
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
  writeFileSync(join(dir, "opencode.json"), '{ "plugins": ["openkit"] }')
  const h = io(home)
  const code = await doctorCommand(h.io)
  expect(code).toBe(0)
  expect(h.out()).toContain("plugin: active")
})

test("doctor reports plugin active when listed in opencode.jsonc", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const dir = dirname(globalConfigPath(home))
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, "opencode.jsonc"),
    '{ "plugins": ["openkit@git+ssh://git@github.com/jviniciusb/openkit.git#v0.20.0"] }',
  )
  const h = io(home)
  const code = await doctorCommand(h.io)
  expect(code).toBe(0)
  expect(h.out()).toContain("plugin: active")
})

test("doctor matches the plugin by package name across spec forms", async () => {
  const specs = [
    "openkit@git+https://github.com/jviniciusb/openkit.git",
    "openkit",
    { package: "openkit", options: {} },
  ]
  for (const spec of specs) {
    const home = mkdtempSync(join(tmpdir(), "home-"))
    const dir = dirname(globalConfigPath(home))
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, "opencode.json"), JSON.stringify({ plugins: [spec] }))
    const h = io(home)
    await doctorCommand(h.io)
    expect(h.out()).toContain("plugin: active")
  }
})

test("doctor does not match a different package name", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const dir = dirname(globalConfigPath(home))
  mkdirSync(dir, { recursive: true })
  // A different package, including a scoped one, must not match by prefix.
  writeFileSync(join(dir, "opencode.json"), '{ "plugins": ["openkit-fork", "@acme/openkit"] }')
  const h = io(home)
  await doctorCommand(h.io)
  expect(h.out()).toContain("plugin: not listed")
})

test("doctor reports skills: ok for a loadable skill", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const dir = mkdtempSync(join(tmpdir(), "skill-"))
  writeFileSync(join(dir, "SKILL.md"), "---\nname: S\n---\nbody")
  const h = io(home)
  const skill = defineSkill({ id: "s", dir: pathToFileURL(`${dir}/`) })
  const code = await doctorCommand(h.io, [{ ...skillCategory, items: [skill] }])
  expect(code).toBe(0)
  expect(h.out()).toContain("skills: ok")
})

test("doctor fails and names a skill whose SKILL.md is missing", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const h = io(home)
  const skill = defineSkill({ id: "broken", dir: new URL("file:///no-such-dir/") })
  const code = await doctorCommand(h.io, [{ ...skillCategory, items: [skill] }])
  expect(code).not.toBe(0)
  expect(h.out()).toContain("skill: error broken")
})

test("doctor reports only the shipped categories", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const h = io(home)
  const code = await doctorCommand(h.io)
  expect(code).toBe(0)
  expect(h.out()).not.toContain("references:")
})
