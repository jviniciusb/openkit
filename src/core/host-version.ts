/**
 * Numeric comparison of OpenCode host versions.
 *
 * Only the shape OpenCode reports (`major.minor.patch`, optionally followed by a
 * prerelease or build suffix) is understood; anything else is treated as
 * "unknown" and never produces a warning.
 */

/** Parses the leading `major.minor.patch` triple, ignoring any suffix. */
function parse(version: string): [number, number, number] | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version.trim())
  if (match === null) return undefined
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

/**
 * True when `version` is older than `minimum`.
 *
 * Unparseable input on either side returns `false`: a host that reports a
 * version the kit cannot read gets no warning rather than a wrong one. A
 * prerelease such as `2.2.5-beta.1` compares equal to `2.2.5`, because only the
 * numeric triple is compared.
 */
export function isVersionOlder(version: string, minimum: string): boolean {
  const actual = parse(version)
  const floor = parse(minimum)
  if (actual === undefined || floor === undefined) return false
  for (const index of [0, 1, 2] as const) {
    if (actual[index] !== floor[index]) return actual[index] < floor[index]
  }
  return false
}
