import { expect, test } from "bun:test"
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { parse } from "jsonc-parser"
import type { KitConfigFile } from "../../src/config/types"
import {
  setEntryEnabled,
  setEntrySetting,
} from "../../src/config/edit"

function readConfig(path: string): { text: string; data: KitConfigFile } {
  const text = readFileSync(path, "utf8")
  return { text, data: parse(text) as KitConfigFile }
}

test("enable flips value and preserves comments", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "openkit.jsonc")
  writeFileSync(f, `{\n  // keep me\n  "tools": { "a": { "enabled": false } },\n}`)
  await setEntryEnabled(f, "tools", "a", true)
  const text = readFileSync(f, "utf8")
  expect(text).toContain("// keep me")
  expect(text).toContain(`"enabled": true`)
})

test("setEntryEnabled creates the file and parents from scratch", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "nested", "dir", "openkit.jsonc")

  await setEntryEnabled(f, "tools", "a", true)

  expect(existsSync(f)).toBe(true)
  const data = parse(readFileSync(f, "utf8")) as KitConfigFile
  expect(data.configVersion).toBe(1)
  expect(data.tools?.a?.enabled).toBe(true)
})

test("setEntrySetting writes a nested setting and keeps comments", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "openkit.jsonc")
  writeFileSync(f, `{\n  // keep me\n  "tools": { "a": { "enabled": false } },\n}`)

  await setEntrySetting(f, "tools", "a", "count", 3)

  const { text, data } = readConfig(f)
  expect(text).toContain("// keep me")
  expect(data.tools?.a?.settings).toEqual({ count: 3 })
  expect(data.tools?.a?.enabled).toBe(false)
})

test("setEntrySetting creates a new tool entry without touching others", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "openkit.jsonc")
  writeFileSync(f, `{ "tools": { "a": { "enabled": true } } }`)

  await setEntrySetting(f, "tools", "b", "name", "hi")

  const { data } = readConfig(f)
  expect(data.tools?.a?.enabled).toBe(true)
  expect(data.tools?.b?.settings).toEqual({ name: "hi" })
})

test("setEntryEnabled rejects when the target lies under a file, without overwriting", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const blocker = join(d, "blocker")
  writeFileSync(blocker, "not a directory")
  const f = join(blocker, "openkit.jsonc")

  await expect(setEntryEnabled(f, "tools", "a", true)).rejects.toThrow()

  // The file we could not traverse must be left byte-for-byte intact.
  expect(readFileSync(blocker, "utf8")).toBe("not a directory")
})

test("setEntryEnabled refuses to edit a malformed config and leaves it intact", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "openkit.jsonc")
  writeFileSync(f, "{ this is not json")

  await expect(setEntryEnabled(f, "tools", "a", true)).rejects.toThrow(/malformed/)

  expect(readFileSync(f, "utf8")).toBe("{ this is not json")
})

test.each([
  ["empty", ""],
  ["whitespace-only", "  \n\t\n"],
  ["comment-only", "// nothing here\n/* block */\n"],
])("setEntryEnabled seeds a default for a %s config", async (_name, contents) => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "openkit.jsonc")
  writeFileSync(f, contents)

  await setEntryEnabled(f, "tools", "a", true)

  const data = parse(readFileSync(f, "utf8")) as KitConfigFile
  expect(data.configVersion).toBe(1)
  expect(data.tools?.a?.enabled).toBe(true)
})

test("setEntryEnabled flips value under skills and preserves comments", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "openkit.jsonc")
  writeFileSync(f, `{\n  // keep me\n  "skills": { "sdd-flow": { "enabled": true } },\n}`)
  await setEntryEnabled(f, "skills", "sdd-flow", false)
  const text = readFileSync(f, "utf8")
  expect(text).toContain("// keep me")
  expect((parse(text) as KitConfigFile).skills?.["sdd-flow"]?.enabled).toBe(false)
})

test("setEntryEnabled refuses to edit a malformed config and leaves it intact", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "openkit.jsonc")
  writeFileSync(f, "{ not json")
  await expect(setEntryEnabled(f, "skills", "s", false)).rejects.toThrow(/malformed/)
  expect(readFileSync(f, "utf8")).toBe("{ not json")
})

test("setEntryEnabled flips enabled under an arbitrary category and preserves comments", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "openkit.jsonc")
  writeFileSync(f, `{\n  // keep me\n  "tools": { "a": { "enabled": false } },\n}`)

  await setEntryEnabled(f, "tools", "a", true)

  const text = readFileSync(f, "utf8")
  expect(text).toContain("// keep me")
  expect((parse(text) as KitConfigFile).tools?.a?.enabled).toBe(true)
})

test("setEntryEnabled works for the skills category", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "openkit.jsonc")

  await setEntryEnabled(f, "skills", "sdd-flow", false)

  const data = parse(readFileSync(f, "utf8")) as KitConfigFile
  expect(data.skills?.["sdd-flow"]?.enabled).toBe(false)
})

test("setEntrySetting writes a nested setting for any settings category", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "openkit.jsonc")
  writeFileSync(f, `{ "tools": { "r": { "enabled": true } } }`)
  await setEntrySetting(f, "tools", "r", "branch", "main")
  expect((parse(readFileSync(f, "utf8")) as KitConfigFile).tools?.r?.settings).toEqual({ branch: "main" })
})

test("setEntrySetting keeps the existing enabled value and comments", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "openkit.jsonc")
  writeFileSync(f, `{\n  // keep me\n  "tools": { "r": { "enabled": false } },\n}`)

  await setEntrySetting(f, "tools", "r", "branch", "main")

  const { text, data } = readConfig(f)
  expect(text).toContain("// keep me")
  expect(data.tools?.r?.settings).toEqual({ branch: "main" })
  expect(data.tools?.r?.enabled).toBe(false)
})

test("setEntryEnabled seeds a default config with tools and skills maps", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "openkit.jsonc")

  await setEntryEnabled(f, "tools", "r", true)

  const data = parse(readFileSync(f, "utf8")) as KitConfigFile
  expect(data.configVersion).toBe(1)
  expect(data.skills).toEqual({})
  expect(data.tools?.r?.enabled).toBe(true)
})
