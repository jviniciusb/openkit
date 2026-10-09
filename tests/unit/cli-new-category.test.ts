import { expect, test } from "bun:test"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { runCli } from "../../src/cli/index"

function root() {
  const r = mkdtempSync(join(tmpdir(), "kit-"))
  for (const [dir, barrel] of [
    ["tools", `export const tools = [\n  // <kit:tools>\n  // </kit:tools>\n]\n`],
    ["skills", `import { defineSkill } from "../core/skill"\nexport const skills = [\n  // <kit:skills>\n  // </kit:skills>\n]\n`],
    ["references", `import { defineReference } from "../core/reference"\nexport const references = [\n  // <kit:references>\n  // </kit:references>\n]\n`],
  ] as const) {
    mkdirSync(join(r, "src", dir), { recursive: true })
    writeFileSync(join(r, "src", dir, "index.ts"), barrel)
  }
  return r
}

test("new reference scaffolds reference.json and a barrel entry", async () => {
  const r = root()
  const io = { cwd: r, home: r, stdout: () => {}, stderr: () => {} }
  expect(await runCli(["new", "reference", "std"], io)).toBe(0)
  expect(existsSync(join(r, "src", "references", "std", "reference.json"))).toBe(true)
  expect(readFileSync(join(r, "src", "references", "index.ts"), "utf8")).toContain('id: "std"')
  expect(readFileSync(join(r, "src", "references", "index.ts"), "utf8")).toContain("// </kit:references>")
  expect(await runCli(["new-skill", "my-skill"], io)).toBe(0)
  expect(existsSync(join(r, "src", "skills", "my-skill", "SKILL.md"))).toBe(true)
})

test("new tool scaffolds a tool and keeps new <id> as the tool alias", async () => {
  const r = root()
  const io = { cwd: r, home: r, stdout: () => {}, stderr: () => {} }
  expect(await runCli(["new", "tool", "cat"], io)).toBe(0)
  expect(existsSync(join(r, "src", "tools", "cat", "index.ts"))).toBe(true)
  expect(readFileSync(join(r, "src", "tools", "index.ts"), "utf8")).toContain(`import cat from "./cat"`)

  // `new <id>` still means a tool.
  expect(await runCli(["new", "dog"], io)).toBe(0)
  expect(existsSync(join(r, "src", "tools", "dog", "index.ts"))).toBe(true)
})

test("new skill dispatches to the skills category", async () => {
  const r = root()
  const io = { cwd: r, home: r, stdout: () => {}, stderr: () => {} }
  expect(await runCli(["new", "skill", "my-skill"], io)).toBe(0)
  expect(existsSync(join(r, "src", "skills", "my-skill", "SKILL.md"))).toBe(true)
  expect(readFileSync(join(r, "src", "skills", "index.ts"), "utf8")).toContain('id: "my-skill"')
})

test("new <category> with no id is a user error and scaffolds nothing", async () => {
  const r = root()
  const io = { cwd: r, home: r, stdout: () => {}, stderr: () => {} }
  expect(await runCli(["new", "reference"], io)).toBe(1)
  expect(existsSync(join(r, "src", "references", "reference"))).toBe(false)
  expect(existsSync(join(r, "src", "tools", "reference"))).toBe(false)
})

test("unknown category is a user error", async () => {
  const r = root()
  const io = { cwd: r, home: r, stdout: () => {}, stderr: () => {} }
  expect(await runCli(["new", "widget", "x"], io)).toBe(1)
  expect(existsSync(join(r, "src", "widget"))).toBe(false)
})
