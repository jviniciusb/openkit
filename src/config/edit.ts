import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import {
  applyEdits,
  modify,
  parse,
  printParseErrorCode,
  type Edit,
  type ModificationOptions,
  type ParseError,
} from "jsonc-parser"
import type { KitConfigFile } from "./types"

/** Options used when `modify` has to create a JSON property. */
const MODIFY_OPTIONS: ModificationOptions = {
  formattingOptions: { insertSpaces: true, tabSize: 2 },
}

/** Seed for a brand-new config file. */
const DEFAULT_CONFIG: KitConfigFile = { configVersion: 1, tools: {} }

/** True only for a genuinely missing file (`ENOENT`). */
function isMissingFile(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "ENOENT"
  )
}

/**
 * Reads a config file's raw text, defaulting only when the file is absent.
 *
 * Returning text (rather than a parsed object) is what lets `modify` preserve
 * the file's comments and formatting. A missing file yields the serialized
 * default config. Any other read failure (permissions, a directory, EMFILE,
 * ENOTDIR, …) is rethrown — we must never silently clobber a config we could
 * not read. Existing files that fail to parse as JSONC are also rejected so a
 * later write cannot corrupt them.
 */
function readConfigText(path: string): string {
  let text: string
  try {
    text = readFileSync(path, "utf8")
  } catch (error) {
    if (isMissingFile(error)) return `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`
    throw error
  }

  const errors: ParseError[] = []
  const parsed = parse(text, errors, {
    allowTrailingComma: true,
    disallowComments: false,
    allowEmptyContent: true,
  })
  if (errors.length > 0) {
    const details = errors
      .map((error) => `${printParseErrorCode(error.error)} at offset ${error.offset}`)
      .join(", ")
    throw new Error(`refusing to edit malformed config ${path}: ${details}`)
  }

  // Empty / whitespace-only / comment-only documents parse to `undefined`; treat
  // them like an absent file so the caller seeds a default config.
  if (parsed === undefined) return `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`

  return text
}

/** Applies `edits` to `text` and writes the result, creating parents. */
function applyAndWrite(path: string, text: string, edits: Edit[]): void {
  const next = applyEdits(text, edits)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, next)
}

/**
 * Sets `tools[toolId].enabled` in the config at `path`.
 *
 * The file is read as raw text (creating a default config when absent) and
 * edited with `jsonc-parser`'s `modify`/`applyEdits`, so existing comments,
 * key order, and indentation survive the round-trip. Missing intermediate
 * objects (`tools`, the tool entry) are created.
 */
export async function setToolEnabled(path: string, toolId: string, enabled: boolean): Promise<void> {
  const text = readConfigText(path)
  const edits = modify(text, ["tools", toolId, "enabled"], enabled, MODIFY_OPTIONS)
  applyAndWrite(path, text, edits)
}

/**
 * Sets `tools[toolId].settings[key]` in the config at `path`.
 *
 * Same comment-preserving read/modify/write as {@link setToolEnabled}; missing
 * `tools`, tool, or `settings` objects are created as needed.
 */
export async function setToolSetting(
  path: string,
  toolId: string,
  key: string,
  value: unknown,
): Promise<void> {
  const text = readConfigText(path)
  const edits = modify(text, ["tools", toolId, "settings", key], value, MODIFY_OPTIONS)
  applyAndWrite(path, text, edits)
}
