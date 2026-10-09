import { readFileSync } from "node:fs"
import { join } from "node:path"
import { parse, printParseErrorCode, type ParseError } from "jsonc-parser"

import { categories as catalogCategories } from "../../catalog"
import { discoverKitConfigFiles, globalOpencodePath } from "../../config/discover"
import type { KitConfigFile } from "../../config/types"
import type { KitCategory } from "../../core/category"
import { resolveCategoryEntry } from "../../core/engine"
import pkg from "../../../package.json"
import type { CliIo } from "./list"

/** JSONC read options; mirrors the config loaders. */
const READ_OPTIONS = { allowTrailingComma: true, disallowComments: false } as const

/** Parsed kit configs plus any parse errors encountered. */
interface ConfigScan {
  configs: KitConfigFile[]
  errors: string[]
}

/** One item whose category `inspect` returned a reason. */
interface CategoryIssue {
  id: string
  reason: string
  fatal: boolean
}

/**
 * Reads and parses every discovered kit config file.
 *
 * Unlike the plugin loader (which skips malformed files so boot never fails),
 * `doctor` surfaces parse failures as errors so they can affect the exit code.
 */
function scanConfigs(io: CliIo): ConfigScan {
  const configs: KitConfigFile[] = []
  const errors: string[] = []

  for (const path of discoverKitConfigFiles(io.cwd, io.home)) {
    let raw: string
    try {
      raw = readFileSync(path, "utf8")
    } catch (error) {
      errors.push(`${path}: ${error instanceof Error ? error.message : String(error)}`)
      continue
    }

    const parseErrors: ParseError[] = []
    const parsed = parse(raw, parseErrors, READ_OPTIONS)
    if (parseErrors.length > 0) {
      const details = parseErrors
        .map((e) => `${printParseErrorCode(e.error)} at offset ${e.offset}`)
        .join(", ")
      errors.push(`${path}: ${details}`)
      continue
    }

    configs.push((parsed ?? {}) as KitConfigFile)
  }

  return { configs, errors }
}

/** True when an `opencode.json` at `path` lists `pluginId` in `plugins`. */
function opencodeListsPlugin(path: string, pluginId: string): boolean {
  try {
    const parsed = parse(readFileSync(path, "utf8"), [], READ_OPTIONS) as
      | { plugins?: unknown }
      | undefined
    const plugins = parsed?.plugins
    if (!Array.isArray(plugins)) return false
    return plugins.some((p) => p === pluginId || (Array.isArray(p) && p[0] === pluginId))
  } catch {
    return false
  }
}

/**
 * Handles `opencode-kit doctor`.
 *
 * Reports whether every discovered kit config parses, runs each category's
 * `inspect` over its shipped items (invalid tool settings degrade, a skill or
 * reference whose file is missing errors), and — best effort — whether the
 * `opencode-kit` plugin is listed in the relevant `opencode.json`. Config parse
 * errors and fatal inspect reasons make the command return non-zero; a
 * non-fatal reason (e.g. invalid tool settings) and a missing plugin entry are
 * advisory.
 *
 * `categories` is injectable so tests can exercise a category without touching
 * the shipped catalog; it defaults to the catalog.
 */
export async function doctorCommand(
  io: CliIo,
  categories: readonly KitCategory<unknown>[] = catalogCategories,
): Promise<number> {
  const { configs, errors } = scanConfigs(io)

  if (errors.length === 0) {
    io.stdout(`config: ok (${configs.length} file${configs.length === 1 ? "" : "s"})`)
  } else {
    for (const error of errors) io.stdout(`config: error ${error}`)
  }

  let fatal = 0
  for (const category of categories) {
    const issues: CategoryIssue[] = []
    for (const item of category.items) {
      const resolved = resolveCategoryEntry(category, item, configs)
      const reason = category.inspect?.(item, resolved)
      if (reason === undefined) continue
      issues.push({ id: (item as { id: string }).id, reason, fatal: category.inspectFatal ?? true })
    }

    if (issues.length === 0) {
      io.stdout(`${category.label}: ok`)
      continue
    }

    for (const issue of issues) {
      if (issue.fatal) fatal += 1
      const state = issue.fatal ? "error" : "degraded"
      io.stdout(`${category.singular}: ${state} ${issue.id}: ${issue.reason}`)
    }
  }

  const candidates = [
    join(io.cwd, "opencode.json"),
    globalOpencodePath(io.home),
  ]
  const active = candidates.some((path) => opencodeListsPlugin(path, "opencode-kit"))
  io.stdout(`plugin: ${active ? "active" : "not listed (best effort)"}`)

  return errors.length > 0 || fatal > 0 ? 1 : 0
}

/** Handles `opencode-kit version`: prints the CLI and plugin versions. */
export async function versionCommand(io: CliIo): Promise<number> {
  io.stdout(`opencode-kit CLI ${pkg.version}`)
  io.stdout(`opencode-kit plugin ${pkg.version}`)
  return 0
}
