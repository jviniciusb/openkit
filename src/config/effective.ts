import { existsSync, readFileSync } from "node:fs"
import { parse } from "jsonc-parser"

import { PLUGIN_ID } from "../constants"
import {
  discoverKitConfigFiles,
  globalConfigPath,
  globalOpencodePaths,
  opencodeConfigPaths,
  type Env,
} from "./discover"
import { loadKitConfig } from "./load"
import { deepMerge, isPlainObject } from "./merge"
import type { KitConfigFile } from "./types"

/** JSONC read options; mirrors the config loaders. */
const READ_OPTIONS = { allowTrailingComma: true, disallowComments: false } as const

/** A single config layer participating in effective resolution, ordered low → high. */
export interface ConfigLayer {
  /** Human-readable label naming where the layer came from. */
  label: string
  config: KitConfigFile
}

/**
 * True when two resolved values are equal for advisory comparisons.
 *
 * Order-insensitive for object keys (unlike a `JSON.stringify` comparison), so
 * a reordered settings object does not look like a change and trigger a
 * spurious "overridden by a higher-precedence layer" warning.
 */
export function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((value, index) => valuesEqual(value, b[index]))
    )
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = Object.keys(a)
    return (
      keys.length === Object.keys(b).length &&
      keys.every((key) => Object.hasOwn(b, key) && valuesEqual(a[key], b[key]))
    )
  }
  return false
}

/** Labels a discovered config path as global or project for warning messages. */
function layerLabel(path: string, home: string, env: Env): string {
  return path === globalConfigPath(home, env)
    ? `global config ${path}`
    : `project config ${path}`
}

/**
 * Builds the ordered config layers used to compute a tool's effective state.
 *
 * Layers are the global kit config, then project kit configs (farthest →
 * nearest), then the caller-supplied plugin `options` layer (highest). Malformed
 * files are skipped by the loader, so a broken layer simply does not participate.
 */
export async function buildConfigLayers(
  cwd: string,
  home: string,
  env: Env = process.env,
  pluginOptions?: KitConfigFile,
): Promise<ConfigLayer[]> {
  const layers: ConfigLayer[] = []

  for (const path of discoverKitConfigFiles(cwd, home, env)) {
    const [config] = await loadKitConfig([path])
    if (config === undefined) continue
    layers.push({ label: layerLabel(path, home, env), config })
  }

  if (pluginOptions !== undefined) {
    layers.push({ label: "plugin options (opencode.json)", config: pluginOptions })
  }

  return layers
}

/** Extracts the options object from an `opencode.json` `plugins` array entry. */
function pluginOptionsFrom(plugins: unknown): KitConfigFile | undefined {
  if (!Array.isArray(plugins)) return undefined

  let merged: KitConfigFile | undefined
  for (const entry of plugins) {
    if (!Array.isArray(entry) || entry[0] !== PLUGIN_ID) continue
    const options = entry[1]
    if (typeof options !== "object" || options === null || Array.isArray(options)) continue
    merged = deepMerge(merged ?? {}, options) as KitConfigFile
  }
  return merged
}

/**
 * Best-effort read of the `openkit` plugin options from the global and
 * project (`cwd`) OpenCode config (`opencode.json`/`opencode.jsonc`), lower
 * precedence first.
 *
 * The doctor script has no access to the live plugin context, so it re-reads
 * the plugin's `options` from disk to detect a layer that overrides a global
 * write.
 */
export function readPluginOptions(
  cwd: string,
  home: string,
  env: Env = process.env,
): KitConfigFile | undefined {
  const candidates = [...globalOpencodePaths(home, env), ...opencodeConfigPaths(cwd)]
  let merged: KitConfigFile | undefined

  for (const path of candidates) {
    if (!existsSync(path)) continue
    let parsed: { plugins?: unknown } | undefined
    try {
      parsed = parse(readFileSync(path, "utf8"), [], READ_OPTIONS) as
        | { plugins?: unknown }
        | undefined
    } catch {
      continue
    }
    const found = pluginOptionsFrom(parsed?.plugins)
    if (found !== undefined) merged = deepMerge(merged ?? {}, found) as KitConfigFile
  }

  return merged
}

