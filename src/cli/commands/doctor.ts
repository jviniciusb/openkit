import { readFileSync } from "node:fs"
import { parse, printParseErrorCode, type ParseError } from "jsonc-parser"

import { categories as catalogCategories } from "../../catalog"
import { discoverKitConfigFiles, globalOpencodePaths, opencodeConfigPaths } from "../../config/discover"
import type { KitConfigFile } from "../../config/types"
import { readPluginOptions } from "../../config/effective"
import type { KitCategory } from "../../core/category"
import { itemId, resolveCategoryEntry } from "../../core/engine"
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

/**
 * Package name of a plugin entry, or `undefined` when it has none.
 *
 * Handles every spec OpenCode accepts: `"openkit"`,
 * `"openkit@git+https://…"`, `"@acme/openkit@1.2.0"`, `{ package: "openkit" }`,
 * and `["openkit", options]`.
 */
function pluginPackageName(entry: unknown): string | undefined {
  if (typeof entry === "string") {
    const separator = entry.indexOf("@", entry.startsWith("@") ? 1 : 0)
    return separator === -1 ? entry : entry.slice(0, separator)
  }
  if (Array.isArray(entry)) return pluginPackageName(entry[0])
  if (typeof entry === "object" && entry !== null && "package" in entry) {
    return pluginPackageName((entry as { package?: unknown }).package)
  }
  return undefined
}

/** True when an OpenCode config at `path` lists `pluginId` in `plugins`. */
function opencodeListsPlugin(path: string, pluginId: string): boolean {
  try {
    const parsed = parse(readFileSync(path, "utf8"), [], READ_OPTIONS) as
      | { plugins?: unknown }
      | undefined
    const plugins = parsed?.plugins
    if (!Array.isArray(plugins)) return false
    return plugins.some((entry) => pluginPackageName(entry) === pluginId)
  } catch {
    return false
  }
}

/**
 * Handles `openkit doctor`.
 *
 * Reports whether every discovered kit config parses, runs each category's
 * `inspect` over its shipped items (invalid tool settings degrade, a skill or
 * reference whose file is missing errors), and — best effort — whether the
 * `openkit` plugin is listed in the relevant OpenCode config (`opencode.json`
 * or `opencode.jsonc`). Config parse
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

  // Fold the plugin-options layer (highest precedence) into resolution so
  // `inspect` sees the same effective config the runtime bootstrap would use,
  // matching `list`/`config get` and the toggle/set warnings.
  const optionLayer = readPluginOptions(io.cwd, io.home)
  const sources = optionLayer === undefined ? configs : [...configs, optionLayer]

  let fatal = 0
  for (const category of categories) {
    const issues: CategoryIssue[] = []
    for (const item of category.items) {
      const resolved = resolveCategoryEntry(category, item, sources)
      const reason = category.inspect?.(item, resolved)
      if (reason === undefined) continue
      issues.push({ id: itemId(item), reason, fatal: category.inspectFatal ?? true })
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

  const candidates = [...opencodeConfigPaths(io.cwd), ...globalOpencodePaths(io.home)]
  const active = candidates.some((path) => opencodeListsPlugin(path, "openkit"))
  io.stdout(`plugin: ${active ? "active" : "not listed (best effort)"}`)

  return errors.length > 0 || fatal > 0 ? 1 : 0
}

/** Handles `openkit version`: prints the CLI and plugin versions. */
export async function versionCommand(io: CliIo): Promise<number> {
  io.stdout(`openkit CLI ${pkg.version}`)
  io.stdout(`openkit plugin ${pkg.version}`)
  return 0
}
