import type { KitConfigFile } from "./types"

/** Keys whose assignment would mutate an object's prototype; never merged. */
const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"])

/** True when `value` is a non-null, non-array object. */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Merges `override` onto `base`.
 *
 * - Plain objects merge recursively.
 * - Arrays and scalars replace.
 * - `undefined` in `override` never removes a value from `base`.
 * - `__proto__`, `constructor`, and `prototype` keys are ignored, so untrusted
 *   config (e.g. `ctx.options` or a parsed `opencode.json`) cannot pollute a
 *   prototype through the assignment below.
 */
export function deepMerge<T>(base: T, override: unknown): T {
  if (override === undefined) return base
  if (isPlainObject(base) && isPlainObject(override)) {
    const result: Record<string, unknown> = { ...base }
    for (const key of Object.keys(override)) {
      if (UNSAFE_KEYS.has(key)) continue
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
