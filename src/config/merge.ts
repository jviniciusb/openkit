import type { KitConfigFile } from "./types"

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Merges `override` onto `base`.
 *
 * - Plain objects merge recursively.
 * - Arrays and scalars replace.
 * - `undefined` in `override` never removes a value from `base`.
 */
export function deepMerge<T>(base: T, override: unknown): T {
  if (override === undefined) return base
  if (isPlainObject(base) && isPlainObject(override)) {
    const result: Record<string, unknown> = { ...base }
    for (const key of Object.keys(override)) {
      result[key] = deepMerge(result[key], override[key])
    }
    return result as T
  }
  return override as T
}

/** Merges two config files, with `override` taking precedence. */
export function mergeConfigFiles(base: KitConfigFile, override: KitConfigFile): KitConfigFile {
  return deepMerge(base, override)
}
