/**
 * Minimal, hand-written reader for skill file frontmatter.
 *
 * Only the subset the kit needs is supported: `name`, `description`
 * (plain, quoted, folded `>`/`>-`, or literal `|`/`|-`),
 * `metadata.opencode/autoinvoke`, and `disable-model-invocation`.
 * Every other key is ignored. Malformed input never throws.
 */

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

/** Removes a leading frontmatter block, returning the full text when absent. */
export function stripFrontmatter(text: string): string {
  return splitFrontmatter(text).body
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
