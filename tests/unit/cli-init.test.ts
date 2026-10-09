import { expect, test } from "bun:test"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { globalConfigPath, globalOpencodePath } from "../../src/config/discover"
import { initCommand } from "../../src/cli/commands/init"
import { runCli } from "../../src/cli/index"

test("init seeds config and adds plugin entry once", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const io = { cwd: home, home, stdout: () => {}, stderr: () => {} }
  await initCommand(io, {})
  const cfg = globalConfigPath(home)
  expect(existsSync(cfg)).toBe(true)
  expect(readFileSync(cfg, "utf8")).toContain("background-subagents")
  expect(readFileSync(cfg, "utf8")).not.toContain("hello")
  await initCommand(io, {}) // idempotent
  const oc = JSON.parse(readFileSync(globalOpencodePath(home), "utf8"))
  expect(oc.plugins.filter((p: string) => p === "opencode-kit").length).toBe(1)
})

test("init seeds shipped tools with their opt-in defaults", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const io = { cwd: home, home, stdout: () => {}, stderr: () => {} }
  await initCommand(io, {})
  const cfg = JSON.parse(readFileSync(globalConfigPath(home), "utf8"))
  expect(cfg.configVersion).toBe(1)
  expect(cfg.tools["background-subagents"].enabled).toBe(false)
  expect(cfg.tools["context-injections"].enabled).toBe(false)
  expect(cfg.tools.hello).toBeUndefined()
})

test("init does not clobber existing user edits or comments", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const dir = dirname(globalConfigPath(home))
  mkdirSync(dir, { recursive: true })
  const cfg = join(dir, "opencode-kit.jsonc")
  writeFileSync(cfg, '{\n  // keep me\n  "tools": { "hello": { "enabled": false } }\n}\n')
  const io = { cwd: home, home, stdout: () => {}, stderr: () => {} }
  await initCommand(io, {})
  const text = readFileSync(cfg, "utf8")
  expect(text).toContain("// keep me")
  expect(text).toContain('"enabled": false')
})

test("init --project writes to the project directory, not home", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const cwd = mkdtempSync(join(tmpdir(), "cwd-"))
  const io = { cwd, home, stdout: () => {}, stderr: () => {} }
  await initCommand(io, { project: true })
  expect(existsSync(join(cwd, ".opencode", "opencode-kit.jsonc"))).toBe(true)
  expect(existsSync(join(cwd, "opencode.json"))).toBe(true)
  expect(existsSync(globalConfigPath(home))).toBe(false)
})

test("init appends the plugin entry to an existing opencode.json", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const dir = dirname(globalConfigPath(home))
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, "opencode.json"), '{ "plugins": ["other-plugin"], "theme": "dark" }\n')
  const io = { cwd: home, home, stdout: () => {}, stderr: () => {} }
  await initCommand(io, {})
  const oc = JSON.parse(readFileSync(join(dir, "opencode.json"), "utf8"))
  expect(oc.plugins).toEqual(["other-plugin", "opencode-kit"])
  expect(oc.theme).toBe("dark")
})

test("init preserves comments and other entries inside the plugins array", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const dir = dirname(globalConfigPath(home))
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, "opencode.json"),
    '{\n  "plugins": [\n    // keep this comment\n    "other-plugin"\n  ]\n}\n',
  )
  const io = { cwd: home, home, stdout: () => {}, stderr: () => {} }
  await initCommand(io, {})
  const text = readFileSync(join(dir, "opencode.json"), "utf8")
  expect(text).toContain("// keep this comment")
  expect(text).toContain('"other-plugin"')
  expect(text).toContain('"opencode-kit"')
})

test("init refuses a non-array plugins value and leaves opencode.json intact", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const dir = dirname(globalConfigPath(home))
  mkdirSync(dir, { recursive: true })
  const original = '{ "plugins": "opencode-kit" }\n'
  writeFileSync(join(dir, "opencode.json"), original)
  let err = ""
  const io = { cwd: home, home, stdout: () => {}, stderr: (s: string) => { err += s } }
  expect(await runCli(["init"], io)).not.toBe(0)
  expect(err).toContain("not an array")
  expect(readFileSync(join(dir, "opencode.json"), "utf8")).toBe(original)
})

test("init seeds every skill with its declared default", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const io = { cwd: home, home, stdout: () => {}, stderr: () => {} }
  await initCommand(io, {})
  const cfg = JSON.parse(readFileSync(globalConfigPath(home), "utf8"))
  expect(cfg.skills["english-writing-assistant"].enabled).toBe(true)
  expect(cfg.skills["sdd-flow"].enabled).toBe(true)
})

test("init seeds a references section", async () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  await initCommand({ cwd: home, home, stdout: () => {}, stderr: () => {} }, {})
  const cfg = JSON.parse(readFileSync(globalConfigPath(home), "utf8"))
  expect(cfg.references).toEqual({})
})
