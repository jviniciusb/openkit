import type { ConfigLayer } from "../config/effective"
import { deepMerge } from "../config/merge"
import { categoryEntries, type KitConfigFile } from "../config/types"
import type { KitCategory, ResolvedEntry } from "./category"
import type { KitContext, Registration } from "./context"

/** A category item whose registration failed, isolated from its siblings. */
export interface DegradedItem {
  category: string
  id: string
  error: string
}

/** Reads an item's config id; `KitCategory` stays unconstrained for bivariance. */
export function itemId<T>(item: T): string {
  return (item as { id: string }).id
}

/**
 * Resolves an item's effective config from sources ordered low → high precedence.
 *
 * Starts from the category's defaults — `enabled` from `defaultEnabled`, and,
 * for settings-bearing categories, `settings` from `defaultSettings`. Then folds
 * each source that mentions the item: `enabled` replaces, `settings` deep-merges.
 * Settings-less categories ignore `settings` entirely. Sources for other ids or
 * other categories are ignored.
 */
export function resolveCategoryEntry<T>(
  category: KitCategory<T>,
  item: T,
  sources: KitConfigFile[],
): ResolvedEntry {
  const id = itemId(item)
  let enabled = category.defaultEnabled(item)
  let settings: Record<string, unknown> | undefined

  if (category.hasSettings) {
    settings = { ...(category.defaultSettings?.(item) ?? {}) }
  }

  for (const source of sources) {
    const entry = categoryEntries(source, category.key)?.[id]
    if (entry === undefined) continue
    if (entry.enabled !== undefined) enabled = entry.enabled
    if (category.hasSettings && entry.settings !== undefined) {
      settings = deepMerge(settings ?? {}, entry.settings)
    }
  }

  return category.hasSettings ? { enabled, settings } : { enabled }
}

/**
 * Resolves an item's effective `enabled`/`settings` across `layers`.
 *
 * Layer order is low → high: `enabled` is replaced, `settings` deep-merge, only
 * for settings-bearing categories. The returned bookkeeping identifies which
 * layer last set `enabled` and which layer supplied each settings key, so
 * callers can name an overriding layer.
 */
export function resolveCategoryEffective<T>(
  category: KitCategory<T>,
  item: T,
  layers: ConfigLayer[],
): {
  enabled: boolean
  enabledLayer?: ConfigLayer
  settings?: Record<string, unknown>
  settingLayers?: Record<string, ConfigLayer>
} {
  const id = itemId(item)
  let enabled = category.defaultEnabled(item)
  let enabledLayer: ConfigLayer | undefined
  let settings: Record<string, unknown> | undefined
  let settingLayers: Record<string, ConfigLayer> | undefined

  if (category.hasSettings) {
    settings = { ...(category.defaultSettings?.(item) ?? {}) }
    settingLayers = {}
  }

  for (const layer of layers) {
    const entry = categoryEntries(layer.config, category.key)?.[id]
    if (entry === undefined) continue

    if (entry.enabled !== undefined) {
      enabled = entry.enabled
      enabledLayer = layer
    }
    if (category.hasSettings && entry.settings !== undefined) {
      for (const key of Object.keys(entry.settings)) settingLayers![key] = layer
      settings = deepMerge(settings ?? {}, entry.settings)
    }
  }

  return category.hasSettings
    ? { enabled, enabledLayer, settings, settingLayers }
    : { enabled, enabledLayer }
}

/**
 * Registers every enabled item across `categories`, isolating failures per item.
 *
 * Categories and their items are visited in array order. An item is skipped
 * unless `resolveCategoryEntry` yields `enabled: true`. Each enabled item's
 * `registerItem` runs in a try/catch; its `registrations` are collected and a
 * non-empty `degraded` reason (or a thrown error) becomes a tagged
 * {@link DegradedItem}, leaving the item's siblings and other categories
 * unaffected. Partial registrations a `registerItem` created before throwing
 * are that hook's to dispose — `registerItem` receives `ctx` directly and
 * returns the registrations it wants tracked.
 */
export async function registerCategories(
  categories: readonly KitCategory<unknown>[],
  sources: KitConfigFile[],
  ctx: KitContext,
): Promise<{ registrations: Registration[]; degraded: DegradedItem[] }> {
  const registrations: Registration[] = []
  const degraded: DegradedItem[] = []

  for (const category of categories) {
    for (const item of category.items) {
      const id = itemId(item)
      const resolved = resolveCategoryEntry(category, item, sources)
      if (resolved.enabled !== true) continue

      try {
        const result = await category.registerItem(item, resolved, ctx)
        registrations.push(...result.registrations)
        if (result.degraded !== undefined) {
          degraded.push({ category: category.key, id, error: result.degraded })
        }
      } catch (error) {
        degraded.push({
          category: category.key,
          id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }

  return { registrations, degraded }
}
