/** Per-tool entry inside a kit config file. */
export interface ToolConfigEntry {
  /** Explicit on/off switch for the tool. */
  enabled?: boolean
  /** User-supplied settings, deep-merged over the tool's defaults. */
  settings?: Record<string, unknown>
}

/** Per-skill entry inside a kit config file. */
export interface SkillConfigEntry {
  /** Explicit on/off switch for the skill. */
  enabled?: boolean
}

/** Shape of a single `opencode-kit.json[c]` file. */
export interface KitConfigFile {
  configVersion?: number
  tools?: Record<string, ToolConfigEntry>
  skills?: Record<string, SkillConfigEntry>
}

/** A tool's fully resolved configuration after applying all sources. */
export interface ResolvedToolConfig<S> {
  enabled: boolean
  settings: S
}

/** A skill's fully resolved configuration after applying all sources. */
export interface ResolvedSkillConfig {
  enabled: boolean
}
