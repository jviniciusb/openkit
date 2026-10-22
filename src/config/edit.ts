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
const DEFAULT_CONFIG: KitConfigFile = { configVersion: 1, tools: {}, skills: {} }

/** Parses JSONC options shared by every read in this module. */
const READ_OPTIONS = {
  allowTrailingComma: true,
  disallowComments: false,
  allowEmptyContent: true,
} as const

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
 * the file's comments and formatting. A missing (or empty) file yields
 * `fallback`. Any other read failure (permissions, a directory, EMFILE,
 * ENOTDIR, …) is rethrown — we must never silently clobber a config we could
 * not read. Existing files that fail to parse as JSONC are also rejected so a
 * later write cannot corrupt them.
 */
function readEditableText(path: string, fallback: string): string {
  let text: string
  try {
    text = readFileSync(path, "utf8")
  } catch (error) {
    if (isMissingFile(error)) return fallback
    throw error
  }

  const errors: ParseError[] = []
  const parsed = parse(text, errors, READ_OPTIONS)
  if (errors.length > 0) {
    const details = errors
      .map((error) => `${printParseErrorCode(error.error)} at offset ${error.offset}`)
      .join(", ")
    throw new Error(`refusing to edit malformed config ${path}: ${details}`)
  }

  // Empty / whitespace-only / comment-only documents parse to `undefined`, and a
  // document that is exactly `null` parses to `null`; neither is a usable config
  // object, so treat both like an absent file and seed the fallback. (Without
  // this, editing a `null` document throws inside `modify`.)
  if (parsed == null) return fallback

  return text
}

/** Reads a kit config file, defaulting to the seed config when absent. */
function readConfigText(path: string): string {
  return readEditableText(path, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`)
}

/** Applies `edits` to `text` and writes the result, creating parents. */
function applyAndWrite(path: string, text: string, edits: Edit[]): void {
  const next = applyEdits(text, edits)
  // A no-op edit (e.g. re-setting an identical value) would bump the mtime and
  // trigger the config watcher's reload for nothing.
  if (next === text) return
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, next)
}

/**
 * Sets `<category>[id].enabled` in the config at `path`.
 *
 * `category` is the top-level config map key (`tools`, `skills`). The file is
 * read as raw text (creating a default config when absent) and edited with
 * `jsonc-parser`'s `modify`/`applyEdits`, so existing comments, key order, and
 * indentation survive the round-trip. Missing intermediate objects (`category`,
 * the entry) are created.
 */
export async function setEntryEnabled(
  path: string,
  category: string,
  id: string,
  enabled: boolean,
): Promise<void> {
  const text = readConfigText(path)
  const edits = modify(text, [category, id, "enabled"], enabled, MODIFY_OPTIONS)
  applyAndWrite(path, text, edits)
}

/**
 * Sets `<category>[id].settings[key]` in the config at `path`.
 *
 * `category` is the top-level config map key (`tools`, `skills`). Same
 * comment-preserving read/modify/write as {@link setEntryEnabled}; missing
 * `category`, entry, or `settings` objects are created as needed.
 */
export async function setEntrySetting(
  path: string,
  category: string,
  id: string,
  key: string,
  value: unknown,
): Promise<void> {
  const text = readConfigText(path)
  const edits = modify(text, [category, id, "settings", key], value, MODIFY_OPTIONS)
  applyAndWrite(path, text, edits)
}
