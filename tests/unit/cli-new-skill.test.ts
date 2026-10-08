import { expect, test } from "bun:test"
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { scaffoldSkill } from "../../src/cli/scaffold"
import { runCli } from "../../src/cli/index"

function fixture(): { root: string; barrelPath: string; barrel: string } {
  const root = mkdtempSync(join(tmpdir(), "kit-"))
  mkdirSync(join(root, "src", "skills"), { recursive: true })
  const barrelPath = join(root, "src", "skills", "index.ts")
  const barrel = `import { defineSkill } from "../core/skill"\nexport const skills = [\n  // <kit:skills>\n  // </kit:skills>\n]\n`
  writeFileSync(barrelPath, barrel)
  return { root, barrelPath, barrel }
}

test("scaffolds a skill dir and inserts a barrel entry between the markers", async () => {
  const { root, barrelPath } = fixture()
  await scaffoldSkill(root, "my-skill")
  expect(existsSync(join(root, "src", "skills", "my-skill", "SKILL.md"))).toBe(true)
  const barrel = readFileSync(barrelPath, "utf8")
  const open = barrel.indexOf("// <kit:skills>")
  const entry = barrel.indexOf('id: "my-skill"')
  const close = barrel.indexOf("// </kit:skills>")
  expect(open).toBeGreaterThanOrEqual(0)
  expect(entry).toBeGreaterThan(open)
  expect(entry).toBeLessThan(close)
})

test("generated SKILL.md has frontmatter", async () => {
  const { root } = fixture()
  await scaffoldSkill(root, "my-skill")
  const md = readFileSync(join(root, "src", "skills", "my-skill", "SKILL.md"), "utf8")
  expect(md.startsWith("---")).toBe(true)
  expect(md).toContain("name:")
  expect(md).toContain("description:")
})

test("refuses an existing skill and invalid ids without writing", async () => {
  const { root } = fixture()
  mkdirSync(join(root, "src", "skills", "dup"), { recursive: true })
  await expect(scaffoldSkill(root, "dup")).rejects.toThrow()
  for (const bad of ["../evil", "123bad", "foo/bar", "Upper"]) {
    const f = fixture()
    await expect(scaffoldSkill(f.root, bad)).rejects.toThrow()
    expect(readdirSync(join(f.root, "src", "skills"))).toEqual(["index.ts"])
  }
})

test("runCli dispatches new-skill", async () => {
  const { root } = fixture()
  const io = { cwd: root, home: root, stdout: () => {}, stderr: () => {} }
  expect(await runCli(["new-skill", "cli-skill"], io)).toBe(0)
  expect(existsSync(join(root, "src", "skills", "cli-skill", "SKILL.md"))).toBe(true)
})
