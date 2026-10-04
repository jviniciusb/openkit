import { expect, test } from "bun:test"
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { parse } from "jsonc-parser"
import type { KitConfigFile } from "../../src/config/types"
import { setToolEnabled, setToolSetting } from "../../src/config/edit"

function readConfig(path: string): { text: string; data: KitConfigFile } {
  const text = readFileSync(path, "utf8")
  return { text, data: parse(text) as KitConfigFile }
}

test("enable flips value and preserves comments", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "opencode-kit.jsonc")
  writeFileSync(f, `{\n  // keep me\n  "tools": { "a": { "enabled": false } },\n}`)
  await setToolEnabled(f, "a", true)
  const text = readFileSync(f, "utf8")
  expect(text).toContain("// keep me")
  expect(text).toContain(`"enabled": true`)
})

test("setToolEnabled creates the file and parents from scratch", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "nested", "dir", "opencode-kit.jsonc")

  await setToolEnabled(f, "a", true)

  expect(existsSync(f)).toBe(true)
  const data = parse(readFileSync(f, "utf8")) as KitConfigFile
  expect(data.configVersion).toBe(1)
  expect(data.tools?.a?.enabled).toBe(true)
})

test("setToolSetting writes a nested setting and keeps comments", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "opencode-kit.jsonc")
  writeFileSync(f, `{\n  // keep me\n  "tools": { "a": { "enabled": false } },\n}`)

  await setToolSetting(f, "a", "count", 3)

  const { text, data } = readConfig(f)
  expect(text).toContain("// keep me")
  expect(data.tools?.a?.settings).toEqual({ count: 3 })
  expect(data.tools?.a?.enabled).toBe(false)
})

test("setToolSetting creates a new tool entry without touching others", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "opencode-kit.jsonc")
  writeFileSync(f, `{ "tools": { "a": { "enabled": true } } }`)

  await setToolSetting(f, "b", "name", "hi")

  const { data } = readConfig(f)
  expect(data.tools?.a?.enabled).toBe(true)
  expect(data.tools?.b?.settings).toEqual({ name: "hi" })
})
