import { expect, test } from "bun:test"
import { readSkillFrontmatter, stripFrontmatter } from "../../src/core/skill"

test("parses plain and quoted scalars and strips the frontmatter block", () => {
  const text = `---\nname: my-skill\ndescription: "A short line"\n---\n\n# Body\n`
  expect(readSkillFrontmatter(text)).toEqual({ name: "my-skill", description: "A short line" })
  expect(stripFrontmatter(text)).toBe("\n# Body\n")
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
