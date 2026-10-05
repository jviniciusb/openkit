import { expect, test } from "bun:test"
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { scaffoldTool } from "../../src/cli/scaffold"

/** Creates a temp root with a barrel containing the `<kit:tools>` markers. */
function fixture(): { root: string; barrelPath: string; barrel: string } {
  const root = mkdtempSync(join(tmpdir(), "kit-"))
  mkdirSync(join(root, "src", "tools"), { recursive: true })
  const barrelPath = join(root, "src", "tools", "index.ts")
  const barrel = `import { hello } from "./hello"\nexport const tools = [\n  // <kit:tools>\n  hello,\n  // </kit:tools>\n]\n`
  writeFileSync(barrelPath, barrel)
  return { root, barrelPath, barrel }
}

test("scaffolds a tool dir and updates the barrel", async () => {
  const { root, barrelPath } = fixture()
  await scaffoldTool(root, "my-tool")

  expect(existsSync(join(root, "src", "tools", "my-tool", "index.ts"))).toBe(true)

  const barrel = readFileSync(barrelPath, "utf8")
  const openMarker = "// <kit:tools>"
  const closeMarker = "// </kit:tools>"

  // Both markers survive and the import + entry are inserted for the camelCase id.
  expect(barrel).toContain(openMarker)
  expect(barrel).toContain(closeMarker)
  expect(barrel).toContain(`import myTool from "./my-tool"`)

  // The `myTool,` array entry sits strictly between the two markers.
  const openAt = barrel.indexOf(openMarker)
  const entryAt = barrel.indexOf("myTool,")
  const closeAt = barrel.indexOf(closeMarker)
  expect(openAt).toBeGreaterThanOrEqual(0)
  expect(entryAt).toBeGreaterThan(openAt)
  expect(entryAt).toBeLessThan(closeAt)
})

test("generated tool uses the V2 executor shape (async → { content })", async () => {
  const { root } = fixture()
  await scaffoldTool(root, "my-tool")

  const source = readFileSync(join(root, "src", "tools", "my-tool", "index.ts"), "utf8")
  // Guards against the bare-string executor that fails at runtime.
  expect(source).toContain("execute: async () => ({ content:")
  expect(source).toContain("kit.tool(")
})

test("refuses to overwrite an existing tool", async () => {
  const { root } = fixture()
  mkdirSync(join(root, "src", "tools", "dup"), { recursive: true })

  await expect(scaffoldTool(root, "dup")).rejects.toThrow()
})

test("rejects invalid ids without writing anything", async () => {
  for (const bad of ["../evil", "123bad", "foo/bar", "Upper", "with_underscore"]) {
    const { root, barrelPath, barrel } = fixture()

    await expect(scaffoldTool(root, bad)).rejects.toThrow()

    // Neither the barrel nor any escaped tool path was touched.
    expect(readFileSync(barrelPath, "utf8")).toBe(barrel)
    expect(readdirSync(join(root, "src", "tools"))).toEqual(["index.ts"])
  }
})
