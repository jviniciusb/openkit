import { expect, test } from "bun:test"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { defineReference, loadReference, referenceDescription, registerReference } from "../../src/core/reference"
import { createFakeContext } from "../../src/core/testing"

function ref(id: string, json: string) {
  const dir = mkdtempSync(join(tmpdir(), "ref-"))
  writeFileSync(join(dir, "reference.json"), json)
  return defineReference({ id, dir: pathToFileURL(`${dir}/`) })
}

test("loads a local reference and applies settings overrides on register", async () => {
  const r = ref("r", `{ "description": "Docs", "type": "local", "path": "./docs" }`)
  expect(loadReference(r)).toEqual({ id: "r", description: "Docs", source: { type: "local", path: "./docs" } })
  const { ctx, calls } = createFakeContext()
  await registerReference(ctx, r, { path: "./other" })
  expect((calls.reference[0] as { name: string; source: unknown }).name).toBe("r")
  expect((calls.reference[0] as { source: unknown }).source).toEqual({ type: "local", path: "./other" })
})

test("loads a git reference; repository required, branch optional", () => {
  const withBranch = ref("g", `{ "type": "git", "repository": "https://x/y", "branch": "main" }`)
  expect(loadReference(withBranch)).toEqual({
    id: "g",
    source: { type: "git", repository: "https://x/y", branch: "main" },
  })
  const noBranch = ref("g2", `{ "type": "git", "repository": "https://x/y" }`)
  expect(loadReference(noBranch).source).toEqual({ type: "git", repository: "https://x/y" })
  expect(() => loadReference(ref("bad", `{ "type": "git" }`))).toThrow()
})

test("settings cannot override the file's reference type", async () => {
  const r = ref("r", `{ "type": "local", "path": "./docs" }`)
  const { ctx, calls } = createFakeContext()
  await registerReference(ctx, r, { type: "git" })
  expect((calls.reference[0] as { source: unknown }).source).toEqual({
    type: "local",
    path: "./docs",
  })
})

test("invalid or missing reference files throw; description never throws", () => {
  expect(() => loadReference(ref("bad", `{ "type": "local" }`))).toThrow()
  const missing = defineReference({ id: "gone", dir: new URL("file:///no-such-ref/") })
  expect(referenceDescription(missing)).toBe("")
})
