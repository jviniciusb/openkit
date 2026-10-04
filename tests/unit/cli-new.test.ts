import { expect, test } from "bun:test"
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { scaffoldTool } from "../../src/cli/scaffold"

test("scaffolds a tool dir and updates the barrel", async () => {
  const root = mkdtempSync(join(tmpdir(), "kit-"))
  mkdirSync(join(root, "src", "tools"), { recursive: true })
  writeFileSync(join(root, "src", "tools", "index.ts"),
    `import { hello } from "./hello"\nexport const tools = [\n  // <kit:tools>\n  hello,\n  // </kit:tools>\n]\n`)
  await scaffoldTool(root, "my-tool")
  expect(existsSync(join(root, "src", "tools", "my-tool", "index.ts"))).toBe(true)
  const barrel = readFileSync(join(root, "src", "tools", "index.ts"), "utf8")
  expect(barrel).toContain("myTool")
})

test("refuses to overwrite an existing tool", async () => {
  const root = mkdtempSync(join(tmpdir(), "kit-"))
  mkdirSync(join(root, "src", "tools", "dup"), { recursive: true })
  await expect(scaffoldTool(root, "dup")).rejects.toThrow()
})
