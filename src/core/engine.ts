import type { ConfigLayer } from "../config/effective"
import { deepMerge, isPlainObject } from "../config/merge"
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
 * Normalizes a config `enabled` value.
 *
 * Booleans pass through; the JSON string forms `"true"`/`"false"` are accepted
 * so a hand-written config cannot silently flip an item by quoting the value.
 * Anything else returns `undefined` (ignored, keeping the prior value).
 */
function normalizeEnabled(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value
  if (value === "true") return true
  if (value === "false") return false
  return undefined
}

/** An item's state after folding every layer; bookkeeping names the winning layer. */
interface FoldedState {
  enabled: boolean
  enabledLayer?: ConfigLayer
  settings?: Record<string, unknown>
  settingLayers?: Record<string, ConfigLayer>
}

/**
 * Folds an item's effective config across `layers`, ordered low → high.
 *
 * Starts from the category's defaults — `enabled` from `defaultEnabled`, and,
 * for settings-bearing categories, `settings` from `defaultSettings`. Then folds
 * each layer that mentions the item: `enabled` replaces, `settings` deep-merges.
 * Settings-less categories ignore `settings` entirely. Layers for other ids or
 * other categories are ignored. The returned bookkeeping identifies which layer
 * last set `enabled` and which layer supplied each settings key, so callers can
 * name an overriding layer.
 */
function foldCategoryState<T>(
  category: KitCategory<T>,
  item: T,
  layers: readonly ConfigLayer[],
): FoldedState {
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

    const nextEnabled = normalizeEnabled(entry.enabled)
    if (nextEnabled !== undefined) {
      enabled = nextEnabled
      enabledLayer = layer
    }
    if (category.hasSettings && isPlainObject(entry.settings)) {
      for (const key of Object.keys(entry.settings)) settingLayers![key] = layer
      settings = deepMerge(settings ?? {}, entry.settings)
    }
  }

  return category.hasSettings
    ? { enabled, enabledLayer, settings, settingLayers }
    : { enabled, enabledLayer }
}

/**
 * Resolves an item's effective config from config-file `sources` ordered low →
 * high precedence.
 *
 * A thin view over {@link foldCategoryState} for callers that only have raw
 * config files and need no layer bookkeeping.
 */
export function resolveCategoryEntry<T>(
  category: KitCategory<T>,
  item: T,
  sources: KitConfigFile[],
): ResolvedEntry {
  const state = foldCategoryState(
    category,
    item,
    sources.map((config) => ({ label: "", config })),
  )
  return category.hasSettings
    ? { enabled: state.enabled, settings: state.settings }
    : { enabled: state.enabled }
}

/**
 * Resolves an item's effective `enabled`/`settings` across `layers`.
 *
 * A thin view over {@link foldCategoryState}, surfacing the layer bookkeeping so
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
  return foldCategoryState(category, item, layers)
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
