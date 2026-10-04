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
import type { KitConfigFile, ToolConfigEntry } from "./types"

/** Options used when `modify` has to create a JSON property. */
const MODIFY_OPTIONS: ModificationOptions = {
  formattingOptions: { insertSpaces: true, tabSize: 2 },
}

/** Seed for a brand-new config file. */
const DEFAULT_CONFIG: KitConfigFile = { configVersion: 1, tools: {} }

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

  // Empty / whitespace-only / comment-only documents parse to `undefined`; treat
  // them like an absent file so the caller seeds a default config.
  if (parsed === undefined) return fallback

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

/** True when a config document already declares `tools[toolId]`. */
function hasToolEntry(text: string, toolId: string): boolean {
  const parsed = parse(text, [], READ_OPTIONS) as KitConfigFile | undefined
  return parsed?.tools?.[toolId] !== undefined
}

/**
 * Seeds tool entries into the kit config at `path`.
 *
 * Each seed is written only when `tools[id]` is absent, so re-running `init`
 * (and any hand-edited entry) is left untouched. Edits still go through
 * `modify`/`applyEdits`, preserving comments and formatting; a missing file is
 * created from the default config seed.
 */
export async function seedTools(
  path: string,
  seeds: Record<string, ToolConfigEntry>,
): Promise<void> {
  const text = readConfigText(path)

  let next = text
  for (const [toolId, entry] of Object.entries(seeds)) {
    if (hasToolEntry(next, toolId)) continue
    next = applyEdits(next, modify(next, ["tools", toolId], entry, MODIFY_OPTIONS))
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
 * an entry. The file is created when missing and edited comment-preservingly via
 * `jsonc-parser`, so the surrounding `opencode.json` content is retained.
 */
export async function ensurePluginEntry(path: string, pluginId: string): Promise<void> {
  const text = readEditableText(path, "{}\n")
  const parsed = parse(text, [], READ_OPTIONS) as { plugins?: unknown } | undefined
  const plugins = Array.isArray(parsed?.plugins) ? (parsed.plugins as unknown[]) : []

  if (hasPluginEntry(plugins, pluginId)) return

  const edits = modify(text, ["plugins"], [...plugins, pluginId], MODIFY_OPTIONS)
  applyAndWrite(path, text, edits)
}
