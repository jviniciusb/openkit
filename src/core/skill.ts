/**
 * Minimal, hand-written reader for skill file frontmatter.
 *
 * Only the subset the kit needs is supported: `name`, `description`
 * (plain, quoted, folded `>`/`>-`, or literal `|`/`|-`),
 * `metadata.opencode/autoinvoke`, and `disable-model-invocation`.
 * Every other key is ignored. Malformed input never throws.
 */

import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import type { KitContext, Registration } from "./context"

export interface SkillFrontmatter {
  name?: string
  description?: string
  autoinvoke?: boolean
}

interface FrontmatterSplit {
  /** The frontmatter contents, absent when the text has no valid block. */
  block?: string
  /** Everything after the closing delimiter (or the full text when absent). */
  body: string
}

const DELIMITER = "---"

function isIndented(line: string): boolean {
  return /^\s/.test(line)
}

/** Splits `---` fenced frontmatter from the body. Never throws. */
function splitFrontmatter(text: string): FrontmatterSplit {
  const lines = text.split("\n")
  if (lines[0] !== DELIMITER) return { body: text }
  const end = lines.indexOf(DELIMITER, 1)
  if (end === -1) return { body: text }
  return {
    block: lines.slice(1, end).join("\n"),
    body: lines.slice(end + 1).join("\n"),
  }
}

/**
 * Removes a leading frontmatter block, returning the full text when absent.
 *
 * When a valid block exists, bare `---` lines are also dropped from the body:
 * a bare fence has no meaning in an injected skill, and some vendored bodies
 * use `---` purely as a section separator. Text with no valid block is
 * returned untouched.
 */
export function stripFrontmatter(text: string): string {
  const { block, body } = splitFrontmatter(text)
  if (block === undefined) return body
  return body
    .split("\n")
    .filter((line) => line !== DELIMITER)
    .join("\n")
}

/** Reads the supported frontmatter fields; returns `{}` on missing/malformed input. */
export function readSkillFrontmatter(text: string): SkillFrontmatter {
  try {
    const { block } = splitFrontmatter(text)
    if (block === undefined) return {}
    return parseBlock(block)
  } catch {
    return {}
  }
}

function stripQuotes(value: string): string {
  if (value.length >= 2) {
    const first = value.charAt(0)
    const last = value.charAt(value.length - 1)
    if ((first === '"' || first === "'") && first === last) {
      return value.slice(1, -1)
    }
  }
  return value
}

function parseBoolean(value: string): boolean | undefined {
  if (value === "true") return true
  if (value === "false") return false
  return undefined
}

/** Reads a scalar value, consuming continuation lines for block styles. */
function readScalar(
  lines: string[],
  index: number,
  rawValue: string,
): { value: string; end: number } {
  if (rawValue === ">" || rawValue === ">-") {
    const parts: string[] = []
    let j = index + 1
    while (j < lines.length) {
      const line = lines[j] ?? ""
      if (!isIndented(line)) break
      parts.push(line.trim())
      j++
    }
    return { value: parts.join(" ").trim(), end: j - 1 }
  }

  if (rawValue === "|" || rawValue === "|-") {
    const parts: string[] = []
    let j = index + 1
    while (j < lines.length) {
      const line = lines[j] ?? ""
      if (!isIndented(line)) break
      parts.push(line.trim())
      j++
    }
    return { value: parts.join("\n"), end: j - 1 }
  }

  return { value: stripQuotes(rawValue), end: index }
}

/** Scans a `metadata:` block for `opencode/autoinvoke`. */
function readMetadata(
  lines: string[],
  index: number,
): { value: boolean; found: boolean; end: number } {
  let value = false
  let found = false
  let j = index + 1
  while (j < lines.length) {
    const line = lines[j] ?? ""
    if (!isIndented(line) && line.trim() !== "") break
    const colon = line.indexOf(":")
    if (colon !== -1 && line.slice(0, colon).trim() === "opencode/autoinvoke") {
      const parsed = parseBoolean(line.slice(colon + 1).trim())
      if (parsed !== undefined) {
        value = parsed
        found = true
      }
    }
    j++
  }
  return { value, found, end: j - 1 }
}

function parseBlock(block: string): SkillFrontmatter {
  const lines = block.split("\n")
  const result: SkillFrontmatter = {}
  let metadataAutoinvoke: boolean | undefined
  let hasMetadataAutoinvoke = false
  let disableInvocation: boolean | undefined
  let hasDisableInvocation = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ""
    if (line.trim() === "" || isIndented(line)) continue

    const colon = line.indexOf(":")
    if (colon === -1) continue
    const key = line.slice(0, colon).trim()
    const rawValue = line.slice(colon + 1).trim()

    if (key === "name" || key === "description") {
      const { value, end } = readScalar(lines, i, rawValue)
      if (key === "name") result.name = value
      else result.description = value
      i = end
    } else if (key === "metadata") {
      const { value, found, end } = readMetadata(lines, i)
      if (found) {
        metadataAutoinvoke = value
        hasMetadataAutoinvoke = true
      }
      i = end
    } else if (key === "disable-model-invocation") {
      const parsed = parseBoolean(rawValue)
      if (parsed !== undefined) {
        disableInvocation = parsed
        hasDisableInvocation = true
      }
    }
  }

  if (hasMetadataAutoinvoke) {
    result.autoinvoke = metadataAutoinvoke
  } else if (hasDisableInvocation) {
    result.autoinvoke = !disableInvocation
  }
  return result
}

/** A skill packaged by the kit: an id and the directory holding its `SKILL.md`. */
export interface KitSkill {
  id: string
  dir: URL
  defaultEnabled?: boolean
  /** Kit-packaging override; wins over the SKILL.md frontmatter value. */
  autoinvoke?: boolean
}

/** Normalizes a {@link KitSkill}, defaulting `defaultEnabled` to `true`. */
export function defineSkill(skill: KitSkill): KitSkill {
  return { ...skill, defaultEnabled: skill.defaultEnabled ?? true }
}

/** A loaded skill: frontmatter fields plus the real path and stripped body. */
export interface SkillInfo {
  id: string
  name: string
  description?: string
  path: string
  content: string
  autoinvoke?: boolean
}

/**
 * Reads a skill's `SKILL.md` into a {@link SkillInfo}.
 *
 * Throws only when the file is missing or unreadable; malformed frontmatter
 * falls back to defaults (via {@link readSkillFrontmatter}). `path` is the real
 * absolute path, so later tasks can resolve supporting files relative to it.
 */
export function loadSkill(skill: KitSkill): SkillInfo {
  const path = fileURLToPath(new URL("SKILL.md", skill.dir))
  const text = readFileSync(path, "utf8")
  const frontmatter = readSkillFrontmatter(text)
  const info: SkillInfo = {
    id: skill.id,
    name: frontmatter.name ?? skill.id,
    description: frontmatter.description,
    path,
    content: stripFrontmatter(text),
  }
  const autoinvoke = skill.autoinvoke ?? frontmatter.autoinvoke
  if (autoinvoke === false) info.autoinvoke = false
  return info
}

/** Best-effort description read; returns `""` when the skill cannot be loaded. */
export function skillDescription(skill: KitSkill): string {
  try {
    return loadSkill(skill).description ?? ""
  } catch {
    return ""
  }
}

/** Loads a skill and registers its info through `ctx.skill.transform`. */
export async function registerSkill(
  ctx: KitContext,
  skill: KitSkill,
): Promise<Registration> {
  const info = loadSkill(skill)
  // Spread into a fresh literal: object literals satisfy the index signature
  // `SkillDefinition` requires, while the `SkillInfo` interface does not.
  return ctx.skill.transform((editor) => editor.add({ ...info }))
}
