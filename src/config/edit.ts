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
import { categoryEntries, type CategoryEntry, type KitConfigFile } from "./types"

/** Options used when `modify` has to create a JSON property. */
const MODIFY_OPTIONS: ModificationOptions = {
  formattingOptions: { insertSpaces: true, tabSize: 2 },
}

/** Seed for a brand-new config file. */
const DEFAULT_CONFIG: KitConfigFile = { configVersion: 1, tools: {}, skills: {}, references: {} }

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
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, next)
}

/**
 * Sets `<category>[id].enabled` in the config at `path`.
 *
 * `category` is the top-level config map key (`tools`, `skills`, `references`,
 * …). The file is read as raw text (creating a default config when absent) and
 * edited with `jsonc-parser`'s `modify`/`applyEdits`, so existing comments,
 * key order, and indentation survive the round-trip. Missing intermediate
 * objects (`category`, the entry) are created.
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
 * `category` is the top-level config map key (`tools`, `skills`, `references`,
 * …). Same comment-preserving read/modify/write as {@link setEntryEnabled};
 * missing `category`, entry, or `settings` objects are created as needed.
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

/** True when a config document already declares `<category>[id]`. */
function hasEntry(text: string, category: string, id: string): boolean {
  // `parse("null")` yields `null`, so guard both nullish cases before indexing.
  const parsed = parse(text, [], READ_OPTIONS) as KitConfigFile | undefined
  return parsed != null && categoryEntries(parsed, category)?.[id] !== undefined
}

/**
 * Seeds entries into the kit config at `path` under `category`.
 *
 * Each seed is written only when `category[id]` is absent, so re-running
 * `init` (and any hand-edited entry) is left untouched. Edits still go through
 * `modify`/`applyEdits`, preserving comments and formatting; a missing file is
 * created from the default config seed.
 */
export async function seedEntries(
  path: string,
  category: string,
  seeds: Record<string, CategoryEntry>,
): Promise<void> {
  const text = readConfigText(path)

  let next = text
  for (const [id, entry] of Object.entries(seeds)) {
    if (hasEntry(next, category, id)) continue
    next = applyEdits(next, modify(next, [category, id], entry, MODIFY_OPTIONS))
  }

  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, next)
}

/** Whether `plugins` already references `pluginId` (as a string or `[id, opts]`). */
function hasPluginEntry(plugins: unknown[], pluginId: string): boolean {
  return plugins.some(
    (entry) => entry === pluginId || (Array.isArray(entry) && entry[0] === pluginId),
  )
}

/**
 * Ensures the `opencode.json` at `path` lists `pluginId` in its `plugins` array.
 *
 * The plugin id is appended only when absent, so repeated calls never duplicate
 * an entry. A missing file (or missing `plugins` key) is created with
 * `[pluginId]`. When `plugins` is an existing array, the element is appended via
 * its index path so comments, trailing commas, and formatting inside the array
 * survive. A non-array `plugins` value is refused rather than overwritten.
 */
export async function ensurePluginEntry(path: string, pluginId: string): Promise<void> {
  const text = readEditableText(path, "{}\n")
  const parsed = parse(text, [], READ_OPTIONS) as { plugins?: unknown } | undefined
  const plugins = parsed?.plugins

  if (plugins !== undefined && !Array.isArray(plugins)) {
    throw new Error(`refusing to edit ${path}: "plugins" is not an array`)
  }

  if (Array.isArray(plugins)) {
    if (hasPluginEntry(plugins, pluginId)) return
    // Append through the element path so the existing array text is untouched.
    const edits = modify(text, ["plugins", plugins.length], pluginId, MODIFY_OPTIONS)
    applyAndWrite(path, text, edits)
    return
  }

  const edits = modify(text, ["plugins"], [pluginId], MODIFY_OPTIONS)
  applyAndWrite(path, text, edits)
}
