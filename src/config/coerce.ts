/** Matches JSON number literals (integer, fraction, and exponent forms). */
const NUMBER_RE = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/

/**
 * Coerces a string to a JSON scalar.
 *
 * `true`/`false`/`null` and numeric literals become their typed values; every
 * other input is kept as a plain string. This is intentionally shallow — no
 * arrays or objects are parsed. Used by the `/kit` config setter so values use
 * the same syntax as JSON scalars.
 */
export function coerceScalar(raw: string): unknown {
  if (raw === "true") return true
  if (raw === "false") return false
  if (raw === "null") return null
  if (NUMBER_RE.test(raw)) return Number(raw)
  return raw
}
