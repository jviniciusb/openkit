import { expect, test } from "bun:test"
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { parse } from "jsonc-parser"
import type { KitConfigFile } from "../../src/config/types"
import {
  setToolEnabled,
  setToolSetting,
  setSkillEnabled,
  seedSkills,
  ensurePluginEntry,
} from "../../src/config/edit"

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

test("setToolEnabled rejects when the target lies under a file, without overwriting", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const blocker = join(d, "blocker")
  writeFileSync(blocker, "not a directory")
  const f = join(blocker, "opencode-kit.jsonc")

  await expect(setToolEnabled(f, "a", true)).rejects.toThrow()

  // The file we could not traverse must be left byte-for-byte intact.
  expect(readFileSync(blocker, "utf8")).toBe("not a directory")
})

test("setToolEnabled refuses to edit a malformed config and leaves it intact", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "opencode-kit.jsonc")
  writeFileSync(f, "{ this is not json")

  await expect(setToolEnabled(f, "a", true)).rejects.toThrow(/malformed/)

  expect(readFileSync(f, "utf8")).toBe("{ this is not json")
})

test.each([
  ["empty", ""],
  ["whitespace-only", "  \n\t\n"],
  ["comment-only", "// nothing here\n/* block */\n"],
])("setToolEnabled seeds a default for a %s config", async (_name, contents) => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "opencode-kit.jsonc")
  writeFileSync(f, contents)

  await setToolEnabled(f, "a", true)

  const data = parse(readFileSync(f, "utf8")) as KitConfigFile
  expect(data.configVersion).toBe(1)
  expect(data.tools?.a?.enabled).toBe(true)
})

test("ensurePluginEntry appends through the element path and preserves the array", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "opencode.json")
  writeFileSync(f, `{\n  "plugins": [\n    // keep this comment\n    "other-plugin"\n  ]\n}`)

  await ensurePluginEntry(f, "opencode-kit")

  const text = readFileSync(f, "utf8")
  expect(text).toContain("// keep this comment")
  expect(text).toContain('"other-plugin"')
  const data = parse(text) as { plugins: unknown[] }
  expect(data.plugins).toEqual(["other-plugin", "opencode-kit"])

  // Idempotent: a second call must not duplicate the entry.
  await ensurePluginEntry(f, "opencode-kit")
  expect((parse(readFileSync(f, "utf8")) as { plugins: unknown[] }).plugins).toEqual([
    "other-plugin",
    "opencode-kit",
  ])
})

test("ensurePluginEntry creates the plugins array when it is absent", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "opencode.json")
  writeFileSync(f, `{ "theme": "dark" }`)

  await ensurePluginEntry(f, "opencode-kit")

  const data = parse(readFileSync(f, "utf8")) as { plugins: unknown[]; theme: string }
  expect(data.plugins).toEqual(["opencode-kit"])
  expect(data.theme).toBe("dark")
})

test("ensurePluginEntry refuses a non-array plugins value and leaves the file intact", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "opencode.json")
  const original = `{ "plugins": "opencode-kit" }\n`
  writeFileSync(f, original)

  await expect(ensurePluginEntry(f, "opencode-kit")).rejects.toThrow(/not an array/)

  expect(readFileSync(f, "utf8")).toBe(original)
})

test("setSkillEnabled flips value under skills and preserves comments", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "opencode-kit.jsonc")
  writeFileSync(f, `{\n  // keep me\n  "skills": { "sdd-flow": { "enabled": true } },\n}`)
  await setSkillEnabled(f, "sdd-flow", false)
  const text = readFileSync(f, "utf8")
  expect(text).toContain("// keep me")
  expect((parse(text) as KitConfigFile).skills?.["sdd-flow"]?.enabled).toBe(false)
})

test("setSkillEnabled refuses to edit a malformed config and leaves it intact", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "opencode-kit.jsonc")
  writeFileSync(f, "{ not json")
  await expect(setSkillEnabled(f, "s", false)).rejects.toThrow(/malformed/)
  expect(readFileSync(f, "utf8")).toBe("{ not json")
})

test("seedSkills only adds missing entries", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "opencode-kit.jsonc")
  writeFileSync(f, `{ "skills": { "a": { "enabled": false } } }`)
  await seedSkills(f, { a: { enabled: true }, b: { enabled: true } })
  const data = parse(readFileSync(f, "utf8")) as KitConfigFile
  expect(data.skills?.a?.enabled).toBe(false)
  expect(data.skills?.b?.enabled).toBe(true)
})
