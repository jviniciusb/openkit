import { readFileSync } from "node:fs"
import { parse, printParseErrorCode, type ParseError } from "jsonc-parser"
import type { KitConfigFile } from "./types"

/**
 * Loads and parses kit config files in the given order.
 *
 * Missing files are skipped. Files that cannot be read or parsed as JSONC are
 * logged with `console.warn` and skipped; this function never throws.
 */
export async function loadKitConfig(paths: string[]): Promise<KitConfigFile[]> {
  const configs: KitConfigFile[] = []

  for (const path of paths) {
    let raw: string
    try {
      raw = readFileSync(path, "utf8")
    } catch {
      continue
    }

    const errors: ParseError[] = []
    const parsed = parse(raw, errors, { allowTrailingComma: true, disallowComments: false })
    if (errors.length > 0) {
      const details = errors
        .map((e) => `${printParseErrorCode(e.error)} at offset ${e.offset}`)
        .join(", ")
      console.warn(`openkit: skipping malformed config ${path}: ${details}`)
      continue
    }

    configs.push(parsed as KitConfigFile)
  }

  return configs
}
