import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import { applyEdits, modify, type Edit, type ModificationOptions } from "jsonc-parser"
import type { KitConfigFile } from "./types"

/** Options used when `modify` has to create a JSON property. */
const MODIFY_OPTIONS: ModificationOptions = {
  formattingOptions: { insertSpaces: true, tabSize: 2 },
}

/** Seed for a brand-new config file. */
const DEFAULT_CONFIG: KitConfigFile = { configVersion: 1, tools: {} }

/**
 * Reads a config file's raw text, falling back to a serialized default config.
 *
 * Returning text (rather than a parsed object) is what lets `modify` preserve
 * the file's comments and formatting. Parent directories are created on write,
 * not here.
 */
function readConfigText(path: string): string {
  try {
    return readFileSync(path, "utf8")
  } catch {
    return `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`
  }
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
