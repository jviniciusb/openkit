import { expect, test } from "bun:test"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import {
  defineSkill,
  loadSkill,
  readSkillFrontmatter,
  registerSkill,
  skillDescription,
  stripFrontmatter,
  type KitSkill,
} from "../../src/core/skill"
import { createFakeContext } from "../../src/core/testing"

test("parses plain and quoted scalars and strips the frontmatter block", () => {
  const text = `---\nname: my-skill\ndescription: "A short line"\n---\n\n# Body\n`
  expect(readSkillFrontmatter(text)).toEqual({ name: "my-skill", description: "A short line" })
  expect(stripFrontmatter(text)).toBe("\n# Body\n")
})

test("CRLF line endings are normalized so frontmatter is detected and stripped", () => {
  const text = `---\r\nname: s\r\ndescription: hi\r\n---\r\n\r\nbody\r\n`
  expect(readSkillFrontmatter(text)).toEqual({ name: "s", description: "hi" })
  const body = stripFrontmatter(text)
  expect(body).not.toContain("---")
  expect(body).toContain("body")
})

test("joins a folded (>-) description into one line", () => {
  const text = `---\nname: s\ndescription: >-\n  first line\n  second line\n---\nbody`
  expect(readSkillFrontmatter(text).description).toBe("first line second line")
})

test("reads autoinvoke from metadata and disable-model-invocation", () => {
  expect(readSkillFrontmatter(`---\nmetadata:\n  opencode/autoinvoke: false\n---\nx`).autoinvoke).toBe(false)
  expect(readSkillFrontmatter(`---\ndisable-model-invocation: true\n---\nx`).autoinvoke).toBe(false)
})

test("opencode/autoinvoke wins over disable-model-invocation", () => {
  const text = `---\ndisable-model-invocation: true\nmetadata:\n  opencode/autoinvoke: true\n---\nx`
  expect(readSkillFrontmatter(text).autoinvoke).toBe(true)
})

test("no frontmatter yields empty fields and the full body", () => {
  expect(readSkillFrontmatter("# Just a body")).toEqual({})
  expect(stripFrontmatter("# Just a body")).toBe("# Just a body")
})

test("joins a literal (|-) description with newlines", () => {
  const text = `---\nname: s\ndescription: |-\n  first line\n  second line\n---\nbody`
  expect(readSkillFrontmatter(text).description).toBe("first line\nsecond line")
})

test("malformed or unterminated frontmatter never throws", () => {
  const unterminated = `---\nname: broken\n# no closing fence`
  expect(readSkillFrontmatter(unterminated)).toEqual({})
  expect(stripFrontmatter(unterminated)).toBe(unterminated)

  expect(readSkillFrontmatter(`---\n: : :\nnot valid\n  indented\n---\nbody`)).toEqual({})
  expect(stripFrontmatter("")).toBe("")
})

function tempSkill(id: string, md: string): KitSkill {
  const dir = mkdtempSync(join(tmpdir(), "skill-"))
  writeFileSync(join(dir, "SKILL.md"), md)
  return defineSkill({ id, dir: pathToFileURL(`${dir}/`) })
}

test("defineSkill defaults defaultEnabled to true", () => {
  expect(defineSkill({ id: "s", dir: new URL("file:///x/") }).defaultEnabled).toBe(true)
})

test("loadSkill returns stripped content and a real absolute path", () => {
  const md = `---\nname: s\ndescription: d\n---\n\n# Body\n`
  const skill = tempSkill("s", md)
  const info = loadSkill(skill)
  expect(info.id).toBe("s")
  expect(info.name).toBe("s")
  expect(info.description).toBe("d")
  expect(info.content).not.toContain("---")
  expect(info.path.endsWith(join("SKILL.md"))).toBe(true)
  expect(info.path.startsWith("/")).toBe(true)
})

test("loadSkill marks autoinvoke:false and omits it otherwise", () => {
  expect(loadSkill(tempSkill("a", `---\ndisable-model-invocation: true\n---\nx`)).autoinvoke).toBe(false)
  expect("autoinvoke" in loadSkill(tempSkill("b", `---\nname: b\n---\nx`))).toBe(false)
})

test("skillDescription returns description or empty string without throwing", () => {
  expect(skillDescription(tempSkill("s", `---\ndescription: hi\n---\nx`))).toBe("hi")
  const missing = defineSkill({ id: "gone", dir: new URL("file:///nonexistent-dir/") })
  expect(skillDescription(missing)).toBe("")
})

test("the barrel autoinvoke override wins over frontmatter", () => {
  const dir = mkdtempSync(join(tmpdir(), "skill-"))
  writeFileSync(join(dir, "SKILL.md"), "---\nname: s\n---\nx")
  const skill = defineSkill({ id: "s", dir: pathToFileURL(`${dir}/`), autoinvoke: false })
  expect(loadSkill(skill).autoinvoke).toBe(false)
})

test("registerSkill adds the loaded info through ctx.skill.transform", async () => {
  const { ctx, calls } = createFakeContext()
  await registerSkill(ctx, tempSkill("s", `---\nname: S\ndescription: D\n---\nbody`))
  const info = calls.skill[0] as { id: string; name: string; description: string; content: string }
  expect(info.id).toBe("s")
  expect(info.name).toBe("S")
  expect(info.description).toBe("D")
  expect(info.content).toBe("body")
})
