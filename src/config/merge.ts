import type { KitConfigFile } from "./types"

/**
 * The only key whose plain assignment mutates a prototype.
 *
 * `result[key] = …` on a fresh object literal invokes the `__proto__` accessor;
 * `constructor` and `prototype` are ordinary data keys and must NOT be skipped
 * (the kit ships a `prototype` skill, and settings may legitimately use those
 * names). Item ids cannot be `__proto__` (they must start with a lowercase
 * letter), so skipping it never drops a real entry.
 */
const UNSAFE_KEYS = new Set(["__proto__"])

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
 * - A `__proto__` key is ignored, so untrusted config (e.g. `ctx.options` or a
 *   parsed `opencode.json`) cannot pollute a prototype through the assignment
 *   below. Other keys — including `constructor` and `prototype` — merge
 *   normally, since assigning them creates ordinary data properties.
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
