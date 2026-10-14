import { expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { parse } from "jsonc-parser"
import { globalConfigPath } from "../../src/config/discover"
import { runCli } from "../../src/cli/index"

function home(): string {
  return mkdtempSync(join(tmpdir(), "home-"))
}

function globalConfig(h: string): string {
  return globalConfigPath(h)
}

function storedTools(h: string): Record<string, { enabled?: boolean; settings?: Record<string, unknown> }> {
  const data = parse(readFileSync(globalConfig(h), "utf8")) as {
    tools?: Record<string, { enabled?: boolean; settings?: Record<string, unknown> }>
  }
  return data.tools ?? {}
}

function io(h: string) {
  let out = ""
  let err = ""
  return {
    io: { cwd: h, home: h, stdout: (s: string) => { out += s }, stderr: (s: string) => { err += s } },
    out: () => out,
    err: () => err,
  }
}

test("enable writes an enabled entry to the global config", async () => {
  const h = home()
  const { io: streams } = io(h)

  const code = await runCli(["enable", "background-subagents"], streams)

  expect(code).toBe(0)
  expect(storedTools(h)["background-subagents"]?.enabled).toBe(true)
})

test("disable flips the value back to false", async () => {
  const h = home()
  await runCli(["enable", "background-subagents"], io(h).io)

  const code = await runCli(["disable", "background-subagents"], io(h).io)

  expect(code).toBe(0)
  expect(storedTools(h)["background-subagents"]?.enabled).toBe(false)
})

test("enable with an unknown tool fails and does not write", async () => {
  const h = home()
  const { io: streams, err } = io(h)

  const code = await runCli(["enable", "ghost"], streams)

  expect(code).not.toBe(0)
  expect(err()).toContain("ghost")
  expect(() => readFileSync(globalConfig(h), "utf8")).toThrow()
})

test("config set coerces JSON scalars and config get reads them back", async () => {
  const h = home()
  await runCli(["config", "set", "background-subagents", "count", "42"], io(h).io)
  await runCli(["config", "set", "background-subagents", "active", "true"], io(h).io)
  await runCli(["config", "set", "background-subagents", "greeting", "Hi"], io(h).io)

  const count = io(h)
  expect(await runCli(["config", "get", "background-subagents", "count"], count.io)).toBe(0)
  expect(count.out().trim()).toBe("42")

  const active = io(h)
  await runCli(["config", "get", "background-subagents", "active"], active.io)
  expect(active.out().trim()).toBe("true")

  const greeting = io(h)
  await runCli(["config", "get", "background-subagents", "greeting"], greeting.io)
  expect(greeting.out().trim()).toBe(`"Hi"`)

  const stored = storedTools(h)
  expect(stored["background-subagents"]?.settings).toEqual({ count: 42, active: true, greeting: "Hi" })
})

test("config set preserves an existing comment", async () => {
  const h = home()
  await runCli(["config", "set", "background-subagents", "greeting", "Hi"], io(h).io)
  // rewrite with a comment then set again
  const f = globalConfig(h)
  writeFileSync(f, readFileSync(f, "utf8").replace("{", "{\n  // keep me"))

  await runCli(["config", "set", "background-subagents", "greeting", "Yo"], io(h).io)

  const text = readFileSync(f, "utf8")
  expect(text).toContain("// keep me")
  expect(text).toContain(`"Yo"`)
})

test("config get for an unset key fails", async () => {
  const h = home()
  const { io: streams, err } = io(h)

  const code = await runCli(["config", "get", "background-subagents", "missing"], streams)

  expect(code).not.toBe(0)
  expect(err()).toContain("missing")
})

test("config set on a malformed config fails gracefully without clobbering it", async () => {
  const h = home()
  const f = globalConfig(h)
  mkdirSync(dirname(f), { recursive: true })
  writeFileSync(f, "{ this is not json")
  const { io: streams, err } = io(h)

  // Must not reject out of runCli.
  const code = await runCli(["config", "set", "background-subagents", "greeting", "Hi"], streams)

  expect(code).not.toBe(0)
  expect(err()).toContain("malformed")
  expect(readFileSync(f, "utf8")).toBe("{ this is not json")
})

test("config set seeds an empty global config", async () => {
  const h = home()
  const f = globalConfig(h)
  mkdirSync(dirname(f), { recursive: true })
  writeFileSync(f, "")
  const { io: streams } = io(h)

  const code = await runCli(["config", "set", "background-subagents", "greeting", "Hi"], streams)

  expect(code).toBe(0)
  expect(storedTools(h)["background-subagents"]?.settings?.greeting).toBe("Hi")
})

test("config set warns (advisory) when the write degrades the tool", async () => {
  const h = home()
  const { io: streams, out, err } = io(h)

  const code = await runCli(["config", "set", "background-subagents", "count", "42"], streams)

  expect(code).toBe(0)
  expect(out()).toContain("background-subagents.count = 42")
  expect(err()).toContain("background-subagents")
  expect(err()).toContain("invalid")
  // The value is still persisted; the warning tells the user it will not apply.
  expect(storedTools(h)["background-subagents"]?.settings?.count).toBe(42)
})

test("config set warns when a project config overrides the value", async () => {
  const h = home()
  const cwd = mkdtempSync(join(tmpdir(), "cwd-"))
  mkdirSync(join(cwd, ".opencode"), { recursive: true })
  const project = join(cwd, ".opencode", "openkit.jsonc")
  writeFileSync(project, '{ "tools": { "background-subagents": { "settings": { "greeting": "Project" } } } }')

  const { io: streams, err } = io(h)
  streams.cwd = cwd

  const code = await runCli(["config", "set", "background-subagents", "greeting", "Global"], streams)

  expect(code).toBe(0)
  expect(err()).toContain("overridden")
  expect(err()).toContain(project)
})

test("enable warns when a project config overrides the global write", async () => {
  const h = home()
  const cwd = mkdtempSync(join(tmpdir(), "cwd-"))
  mkdirSync(join(cwd, ".opencode"), { recursive: true })
  const project = join(cwd, ".opencode", "openkit.jsonc")
  writeFileSync(project, '{ "tools": { "background-subagents": { "enabled": false } } }')

  const { io: streams, err } = io(h)
  streams.cwd = cwd

  const code = await runCli(["enable", "background-subagents"], streams)

  expect(code).toBe(0)
  expect(storedTools(h)["background-subagents"]?.enabled).toBe(true)
  expect(err()).toContain("overridden")
  expect(err()).toContain(project)
})

test("enable warns when opencode.json plugin options override the global write", async () => {
  const h = home()
  const cwd = mkdtempSync(join(tmpdir(), "cwd-"))
  writeFileSync(
    join(cwd, "opencode.json"),
    '{ "plugins": [["openkit", { "tools": { "background-subagents": { "enabled": false } } }]] }',
  )

  const { io: streams, err } = io(h)
  streams.cwd = cwd

  const code = await runCli(["enable", "background-subagents"], streams)

  expect(code).toBe(0)
  expect(err()).toContain("overridden")
  expect(err()).toContain("plugin options")
})

function storedSkills(h: string): Record<string, { enabled?: boolean }> {
  const data = parse(readFileSync(globalConfig(h), "utf8")) as { skills?: Record<string, { enabled?: boolean }> }
  return data.skills ?? {}
}

test("enable and disable a skill id write the skills section", async () => {
  const h = home()
  expect(await runCli(["disable", "sdd-flow"], io(h).io)).toBe(0)
  expect(storedSkills(h)["sdd-flow"]?.enabled).toBe(false)
  expect(await runCli(["enable", "sdd-flow"], io(h).io)).toBe(0)
  expect(storedSkills(h)["sdd-flow"]?.enabled).toBe(true)
})

test("enabling a previously disabled skill does not report an override", async () => {
  const h = home()
  await runCli(["disable", "sdd-flow"], io(h).io)
  const { io: streams, err } = io(h)

  const code = await runCli(["enable", "sdd-flow"], streams)

  expect(code).toBe(0)
  expect(storedSkills(h)["sdd-flow"]?.enabled).toBe(true)
  expect(err()).not.toContain("overridden")
})

test("config on a skill id fails and does not write", async () => {
  const h = home()
  const { io: streams, err } = io(h)
  const code = await runCli(["config", "set", "sdd-flow", "x", "1"], streams)
  expect(code).not.toBe(0)
  expect(err()).toContain("sdd-flow")
})

test("CLI honors an explicit XDG_CONFIG_HOME and restores the ambient value", async () => {
  const h = home()
  const xdg = mkdtempSync(join(tmpdir(), "xdg-"))
  const dir = join(xdg, "opencode")
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, "openkit.jsonc"), '{ "tools": { "background-subagents": { "enabled": true } } }')

  const previous = process.env.XDG_CONFIG_HOME
  process.env.XDG_CONFIG_HOME = xdg
  try {
    let out = ""
    const code = await runCli(["list"], {
      cwd: h,
      home: h,
      stdout: (s) => { out += s },
      stderr: () => {},
    })
    expect(code).toBe(0)
    expect(out).toMatch(/background-subagents\s+enabled/)
  } finally {
    if (previous === undefined) delete process.env.XDG_CONFIG_HOME
    else process.env.XDG_CONFIG_HOME = previous
  }
})
