/** Per-tool entry inside a kit config file. */
export interface ToolConfigEntry {
  /** Explicit on/off switch for the tool. */
  enabled?: boolean
  /** User-supplied settings, deep-merged over the tool's defaults. */
  settings?: Record<string, unknown>
}

/** Shape of a single `opencode-kit.json[c]` file. */
export interface KitConfigFile {
  configVersion?: number
  tools?: Record<string, ToolConfigEntry>
}

/** A tool's fully resolved configuration after applying all sources. */
export interface ResolvedToolConfig<S> {
  enabled: boolean
  settings: S
}
