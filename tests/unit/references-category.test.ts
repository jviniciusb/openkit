import { expect, test } from "bun:test"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { referenceCategory } from "../../src/categories/reference"
import { defineReference } from "../../src/core/reference"
import { registerCategories } from "../../src/core/engine"
import { createFakeContext } from "../../src/core/testing"

test("referenceCategory registers an enabled reference with settings override", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ref-"))
  writeFileSync(join(dir, "reference.json"), `{ "type": "git", "repository": "https://x/y" }`)
  const ref = defineReference({ id: "std", dir: pathToFileURL(`${dir}/`) })
  const { ctx, calls } = createFakeContext()
  const res = await registerCategories(
    [{ ...referenceCategory, items: [ref] }],
    [{ references: { std: { enabled: true, settings: { branch: "main" } } } }],
    ctx,
  )
  expect(res.degraded).toEqual([])
  expect((calls.reference[0] as { source: { branch?: string } }).source.branch).toBe("main")
})

test("a reference with no config stays disabled", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ref-"))
  writeFileSync(join(dir, "reference.json"), `{ "type": "local", "path": "./docs" }`)
  const ref = defineReference({ id: "quiet", dir: pathToFileURL(`${dir}/`) })
  const { ctx, calls } = createFakeContext()
  const res = await registerCategories([{ ...referenceCategory, items: [ref] }], [], ctx)
  expect(res.degraded).toEqual([])
  expect(calls.reference.length).toBe(0)
})

test("inspect returns a reason for a missing reference.json", () => {
  const missing = defineReference({ id: "gone", dir: new URL("file:///no-such-reference-dir/") })
  const reason = referenceCategory.inspect?.(missing, { enabled: true, settings: {} })
  expect(typeof reason).toBe("string")
  expect(reason).toBeTruthy()
})

test("references barrel is empty and catalog includes the reference category", async () => {
  const { references } = await import("../../src/references/index")
  const { categories } = await import("../../src/catalog")
  expect(references).toEqual([])
  expect(categories.map((c) => c.key)).toEqual(["tools", "skills", "references"])
})
