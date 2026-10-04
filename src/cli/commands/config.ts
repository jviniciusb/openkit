import { coerceScalar } from "../../config/coerce"
import { globalConfigPath } from "../../config/discover"
import { setToolSetting } from "../../config/edit"
import {
  buildConfigLayers,
  readPluginOptions,
  resolveEffective,
  valuesEqual,
} from "../../config/effective"
import { loadKitConfig } from "../../config/load"
import { resolveToolConfig } from "../../config/resolve"
import { resolveValidated } from "../../config/validate"
import { tools } from "../../tools/index"
import type { CliIo } from "./list"

// Re-exported for callers that already reach the helper through the CLI module.
export { coerceScalar }

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

  // A typo can be written but never take effect: the tool silently degrades to
  // defaults at load. Surface that here instead of reporting a clean success.
  const layers = await buildConfigLayers(io.cwd, io.home, process.env, readPluginOptions(io.cwd, io.home))
  const effective = resolveEffective(tool, layers)
  const { degraded } = resolveValidated(tool, { enabled: effective.enabled, settings: effective.settings })
  if (degraded !== undefined) {
    io.stderr(`opencode-kit: warning: ${degraded}`)
  }

  // A higher-precedence layer (project config or plugin options) can override
  // the value we just wrote globally. Report the mismatch, but stay advisory.
  const effectiveValue = effective.settings[key]
  if (!valuesEqual(effectiveValue, value)) {
    const layer = effective.settingLayers[key]
    io.stderr(
      `opencode-kit: warning: "${tool.id}.${key}" is effectively ${JSON.stringify(effectiveValue)}; your change is overridden by ${layer?.label ?? "a higher-precedence layer"}`,
    )
  }

  return 0
}
