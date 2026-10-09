/** Per-item entry inside a kit config file, shared by every category. */
export interface CategoryEntry {
  /** Explicit on/off switch for the item. */
  enabled?: boolean
  /** User-supplied settings, deep-merged over the item's defaults. */
  settings?: Record<string, unknown>
}

/**
 * @deprecated Collapsed into {@link CategoryEntry}; kept for callers that have
 * not yet migrated to the generic category engine.
 */
export type ToolConfigEntry = CategoryEntry

/**
 * @deprecated Collapsed into {@link CategoryEntry}; kept for callers that have
 * not yet migrated to the generic category engine.
 */
export type SkillConfigEntry = CategoryEntry

/** Shape of a single `opencode-kit.json[c]` file. */
export interface KitConfigFile {
  configVersion?: number
  tools?: Record<string, CategoryEntry>
  skills?: Record<string, CategoryEntry>
  references?: Record<string, CategoryEntry>
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

/**
 * Reads a category's item map from a config file.
 *
 * Config stays category-keyed (`tools`, `skills`, `references`); this helper
 * looks one up by key so the generic engine never hard-codes a category.
 */
export function categoryEntries(
  config: KitConfigFile,
  key: string,
): Record<string, CategoryEntry> | undefined {
  return (config as Record<string, Record<string, CategoryEntry> | undefined>)[key]
}
