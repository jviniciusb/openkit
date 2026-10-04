import { readFileSync } from "node:fs"
import { join } from "node:path"
import { parse, printParseErrorCode, type ParseError } from "jsonc-parser"

import { discoverKitConfigFiles } from "../../config/discover"
import { resolveToolConfig } from "../../config/resolve"
import type { KitConfigFile } from "../../config/types"
import { resolveValidated } from "../../config/validate"
import { tools } from "../../tools/index"
import pkg from "../../../package.json"
import type { CliIo } from "./list"

/** JSONC read options; mirrors the config loaders. */
const READ_OPTIONS = { allowTrailingComma: true, disallowComments: false } as const

/** Parsed kit configs plus any parse errors encountered. */
interface ConfigScan {
  configs: KitConfigFile[]
  errors: string[]
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
 * Reports whether every discovered kit config parses, which tools are degraded
 * (invalid settings), and — best effort — whether the `opencode-kit` plugin is
 * listed in the relevant `opencode.json`. Only genuine config errors make the
 * command return non-zero; a missing plugin entry is advisory.
 */
export async function doctorCommand(io: CliIo): Promise<number> {
  const { configs, errors } = scanConfigs(io)

  if (errors.length === 0) {
    io.stdout(`config: ok (${configs.length} file${configs.length === 1 ? "" : "s"})`)
  } else {
    for (const error of errors) io.stdout(`config: error ${error}`)
  }

  let degraded = 0
  for (const tool of tools) {
    const { degraded: reason } = resolveValidated(tool, resolveToolConfig(tool, configs))
    if (reason !== undefined) {
      degraded += 1
      io.stdout(`tool: degraded ${reason}`)
    }
  }
  if (degraded === 0) io.stdout("tools: ok")

  const candidates = [
    join(io.cwd, "opencode.json"),
    join(io.home, ".config", "opencode", "opencode.json"),
  ]
  const active = candidates.some((path) => opencodeListsPlugin(path, "opencode-kit"))
  io.stdout(`plugin: ${active ? "active" : "not listed (best effort)"}`)

  return errors.length > 0 ? 1 : 0
}

/** Handles `opencode-kit version`: prints the CLI and plugin versions. */
export async function versionCommand(io: CliIo): Promise<number> {
  io.stdout(`opencode-kit CLI ${pkg.version}`)
  io.stdout(`opencode-kit plugin ${pkg.version}`)
  return 0
}
