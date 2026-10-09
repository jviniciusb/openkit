import type { CategoryEntry } from "../core/category"

/** Per-item entry inside a kit config file, shared by every category. */
export type { CategoryEntry }

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
