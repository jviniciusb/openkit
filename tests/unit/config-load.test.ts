import { expect, test } from "bun:test"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { loadKitConfig } from "../../src/config/load"

test("parses JSONC with comments and trailing commas", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const f = join(d, "opencode-kit.jsonc")
  writeFileSync(f, `{\n  // c\n  "tools": { "t": { "enabled": true, }, },\n}`)
  expect(await loadKitConfig([f])).toEqual([{ tools: { t: { enabled: true } } }])
})

test("malformed file is skipped, others still load", async () => {
  const d = mkdtempSync(join(tmpdir(), "kit-"))
  const bad = join(d, "bad.jsonc"); writeFileSync(bad, "{ not json")
  const good = join(d, "good.jsonc"); writeFileSync(good, `{ "tools": {} }`)
  expect(await loadKitConfig([bad, good])).toEqual([{ tools: {} }])
})

test("missing files are skipped", async () => {
  expect(await loadKitConfig(["/nope/missing.jsonc"])).toEqual([])
})
