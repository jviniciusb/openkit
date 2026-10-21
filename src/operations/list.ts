import type { KitCategory } from "../core/category"
import { itemId, resolveCategoryEffective } from "../core/engine"
import type { Env } from "../config/discover"
import { buildConfigLayers } from "../config/effective"
import type { KitConfigFile } from "../config/types"

/**
 * Environment an operation runs against, injected so `/kit` and tests can
 * share the same logic while owning their own I/O and lifecycle.
 */
export interface OperationDeps {
  /** Directory used to discover project-level config files. */
  cwd: string
  /** Home directory used to discover the global config file. */
  home: string
  /** Plugin-options layer (highest precedence), when the caller has one. */
  options?: KitConfigFile
  /** Environment used for `XDG_CONFIG_HOME` discovery; defaults to `process.env`. */
  env?: Env
  /** Sink for successful output. */
  out(s: string): void
  /** Sink for warnings and errors. */
  err(s: string): void
  /** Re-bootstraps the kit after a mutation; `/kit` only. */
  reload?(): Promise<void>
}

/** Outcome of an operation; `1` when the operation reported an error. */
export interface OperationResult {
  exitCode: number
}

/**
 * Finds the first `(category, item)` whose id matches, in catalog order.
 *
 * Ids are a single global namespace across categories, so the first match wins.
 */
export function findCategoryItem(
  categories: readonly KitCategory<unknown>[],
  id: string,
): { category: KitCategory<unknown>; item: unknown } | undefined {
  for (const category of categories) {
    for (const item of category.items) {
      if (itemId(item) === id) return { category, item }
    }
  }
  return undefined
}

/**
 * Prints every item in `categories` with its resolved enabled state.
 *
 * Each non-empty category gets a `<label>:` header, then one
 * `<id>\t<enabled|disabled>\t<description>` row per item. A `describe` hook
 * that throws degrades that row's description to `""` rather than failing the
 * whole listing. Enabled state is folded from every layer (discovered config
 * files low → high, then the plugin `options` layer) via the generic category
 * resolver, so it matches what the runtime bootstrap will register.
 */
export async function listOperation(
  categories: readonly KitCategory<unknown>[],
  deps: OperationDeps,
): Promise<OperationResult> {
  const layers = await buildConfigLayers(deps.cwd, deps.home, deps.env, deps.options)

  for (const category of categories) {
    if (category.items.length === 0) continue
    deps.out(`${category.label}:\n`)
    for (const item of category.items) {
      const { enabled } = resolveCategoryEffective(category, item, layers)
      let description = ""
      try {
        description = category.describe?.(item) ?? ""
      } catch {
        description = ""
      }
      deps.out(`${itemId(item)}\t${enabled ? "enabled" : "disabled"}\t${description}\n`)
    }
  }

  return { exitCode: 0 }
}
