import { expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { parse } from "jsonc-parser"
import { runCli } from "../../src/cli/index"

function home(): string {
  return mkdtempSync(join(tmpdir(), "home-"))
}

function globalConfig(h: string): string {
  return join(h, ".config", "opencode", "opencode-kit.jsonc")
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

  const code = await runCli(["enable", "hello"], streams)

  expect(code).toBe(0)
  expect(storedTools(h).hello?.enabled).toBe(true)
})

test("disable flips the value back to false", async () => {
  const h = home()
  await runCli(["enable", "hello"], io(h).io)

  const code = await runCli(["disable", "hello"], io(h).io)

  expect(code).toBe(0)
  expect(storedTools(h).hello?.enabled).toBe(false)
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
  await runCli(["config", "set", "hello", "count", "42"], io(h).io)
  await runCli(["config", "set", "hello", "active", "true"], io(h).io)
  await runCli(["config", "set", "hello", "greeting", "Hi"], io(h).io)

  const count = io(h)
  expect(await runCli(["config", "get", "hello", "count"], count.io)).toBe(0)
  expect(count.out().trim()).toBe("42")

  const active = io(h)
  await runCli(["config", "get", "hello", "active"], active.io)
  expect(active.out().trim()).toBe("true")

  const greeting = io(h)
  await runCli(["config", "get", "hello", "greeting"], greeting.io)
  expect(greeting.out().trim()).toBe(`"Hi"`)

  const stored = storedTools(h)
  expect(stored.hello?.settings).toEqual({ count: 42, active: true, greeting: "Hi" })
})

test("config set preserves an existing comment", async () => {
  const h = home()
  await runCli(["config", "set", "hello", "greeting", "Hi"], io(h).io)
  // rewrite with a comment then set again
  const f = globalConfig(h)
  writeFileSync(f, readFileSync(f, "utf8").replace("{", "{\n  // keep me"))

  await runCli(["config", "set", "hello", "greeting", "Yo"], io(h).io)

  const text = readFileSync(f, "utf8")
  expect(text).toContain("// keep me")
  expect(text).toContain(`"Yo"`)
})

test("config get for an unset key fails", async () => {
  const h = home()
  const { io: streams, err } = io(h)

  const code = await runCli(["config", "get", "hello", "missing"], streams)

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
  const code = await runCli(["config", "set", "hello", "greeting", "Hi"], streams)

  expect(code).not.toBe(0)
  expect(err()).toContain("malformed")
  expect(readFileSync(f, "utf8")).toBe("{ this is not json")
})
