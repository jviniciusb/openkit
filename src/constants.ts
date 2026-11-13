/**
 * The plugin id this kit registers under, as listed in `opencode.json`.
 *
 * Also the package name; single-sourced here so the plugin entry, config
 * resolution, and tooling cannot drift apart.
 */
export const PLUGIN_ID = "openkit"

/**
 * Oldest OpenCode V2 release the kit's plugin-context contract is verified
 * against. `tests/unit/context-conformance.test.ts` pins the types; the plugin
 * warns (does not refuse to load) when the host reports an older version.
 * Keep this in step with the `README.md` requirement.
 */
export const MIN_OPENCODE_VERSION = "2.3.0"
