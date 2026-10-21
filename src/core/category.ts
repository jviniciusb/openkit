import type { KitContext, Registration } from "./context"

/** A single item's entry inside a kit config file, keyed by category. */
export interface CategoryEntry {
  /** Explicit on/off switch for the item. */
  enabled?: boolean
  /** User-supplied settings, deep-merged over the item's defaults. */
  settings?: Record<string, unknown>
}

/** An item's fully resolved configuration after applying all sources. */
export interface ResolvedEntry {
  enabled: boolean
  settings?: Record<string, unknown>
}

/** What a category's `registerItem` hook returns. */
export interface RegisterItemResult {
  registrations: Registration[]
  degraded?: string
}

/**
 * The contract every kit category implements.
 *
 * A category pairs shipped `items` with the policy the generic engine needs:
 * how to default `enabled`, whether it carries settings, and the one required
 * registration hook. Items are accessed by `id` through the engine.
 */
export interface KitCategory<TItem> {
  /** Config key, e.g. `"tools"`. */
  key: string
  /** Human label for list/diagnostic sections, e.g. `"tools"`. */
  label: string
  /** Singular noun for diagnostic messages, e.g. `"tool"`. */
  singular: string
  /** Shipped items, from the category barrel. */
  items: readonly TItem[]
  /** Default enabled state when config is silent. */
  defaultEnabled(item: TItem): boolean
  /** Whether the category carries settings (drives config get/set + resolution). */
  hasSettings: boolean
  /** Default settings base for settings-bearing categories. */
  defaultSettings?(item: TItem): Record<string, unknown>
  /** The only truly per-category behavior. */
  registerItem(item: TItem, resolved: ResolvedEntry, ctx: KitContext): Promise<RegisterItemResult>
  /** One-line description for list; may throw — callers tolerate. */
  describe?(item: TItem): string
  /** Diagnostic check; returns an error reason or undefined. */
  inspect?(item: TItem, resolved: ResolvedEntry): string | undefined
  /** Whether an `inspect` reason is fatal to the diagnostic; default true. */
  inspectFatal?: boolean
}
