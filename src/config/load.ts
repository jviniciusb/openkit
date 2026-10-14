import { readFileSync } from "node:fs"
import { parse, printParseErrorCode, type ParseError } from "jsonc-parser"
import type { KitConfigFile } from "./types"

/** True only for a genuinely missing file (`ENOENT`). */
function isMissingFile(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "ENOENT"
  )
}

/**
 * Loads and parses kit config files in the given order.
 *
 * Missing files are skipped silently. Files that cannot be read for another
 * reason (permissions, EMFILE, …) or that cannot be parsed as JSONC are logged
 * with `console.warn` and skipped; this function never throws.
 */
export async function loadKitConfig(paths: string[]): Promise<KitConfigFile[]> {
  const configs: KitConfigFile[] = []

  for (const path of paths) {
    let raw: string
    try {
      raw = readFileSync(path, "utf8")
    } catch (error) {
      if (!isMissingFile(error)) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`openkit: cannot read config ${path}: ${message}`)
      }
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
