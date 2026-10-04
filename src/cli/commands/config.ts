import { globalConfigPath } from "../../config/discover"
import { setToolSetting } from "../../config/edit"
import { loadKitConfig } from "../../config/load"
import { resolveToolConfig } from "../../config/resolve"
import { tools } from "../../tools/index"
import type { CliIo } from "./list"

/** Matches JSON number literals (integer, fraction, and exponent forms). */
const NUMBER_RE = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/

/**
 * Coerces a CLI string to a JSON scalar.
 *
 * `true`/`false`/`null` and numeric literals become their typed values; every
 * other input is kept as a plain string. This is intentionally shallow — no
 * arrays or objects are parsed from the command line.
 */
export function coerceScalar(raw: string): unknown {
  if (raw === "true") return true
  if (raw === "false") return false
  if (raw === "null") return null
  if (NUMBER_RE.test(raw)) return Number(raw)
  return raw
}

/**
 * Handles `config get <id> <key>` and `config set <id> <key> <value>`.
 *
 * `get` prints the tool's effective setting (defaults merged with the global
 * config) as JSON. `set` coerces the value and writes it comment-preservingly.
 */
export async function configCommand(io: CliIo, args: string[]): Promise<number> {
  const [action, toolId, key, ...valueParts] = args

  if (action === "get") return configGet(io, toolId, key)
  if (action === "set") return configSet(io, toolId, key, valueParts)
  io.stderr(`opencode-kit: config expects "get" or "set"`)
  return 1
}

async function configGet(io: CliIo, toolId: string | undefined, key: string | undefined): Promise<number> {
  const tool = tools.find((t) => t.id === toolId)
  if (tool === undefined) {
    io.stderr(`opencode-kit: unknown tool "${toolId ?? ""}"`)
    return 1
  }
  if (key === undefined || key.length === 0) {
    io.stderr(`opencode-kit: config get requires a tool id and key`)
    return 1
  }

  const sources = await loadKitConfig([globalConfigPath(io.home)])
  const { settings } = resolveToolConfig(tool, sources)
  const value = (settings as Record<string, unknown>)[key]

  if (value === undefined) {
    io.stderr(`opencode-kit: "${toolId}.${key}" is not set`)
    return 1
  }

  io.stdout(JSON.stringify(value))
  return 0
}

async function configSet(
  io: CliIo,
  toolId: string | undefined,
  key: string | undefined,
  valueParts: string[],
): Promise<number> {
  const tool = tools.find((t) => t.id === toolId)
  if (tool === undefined) {
    io.stderr(`opencode-kit: unknown tool "${toolId ?? ""}"`)
    return 1
  }
  if (key === undefined || key.length === 0 || valueParts.length === 0) {
    io.stderr(`opencode-kit: config set requires a tool id, key, and value`)
    return 1
  }

  const value = coerceScalar(valueParts.join(" "))
  await setToolSetting(globalConfigPath(io.home), tool.id, key, value)
  io.stdout(`${tool.id}.${key} = ${JSON.stringify(value)}`)
  return 0
}
