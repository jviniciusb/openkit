import type { KitCategory } from "../core/category"
import { coerceScalar } from "../config/coerce"
import { globalConfigPath } from "../config/discover"
import { setEntrySetting } from "../config/edit"
import { buildConfigLayers, valuesEqual } from "../config/effective"
import { loadKitConfig } from "../config/load"
import { resolveValidated } from "../config/validate"
import { resolveCategoryEffective, resolveCategoryEntry } from "../core/engine"
import type { KitTool } from "../core/tool"
import { findCategoryItem, type OperationDeps, type OperationResult } from "./list"

/**
 * Resolves an id to a settings-bearing item, or reports the error to `deps`.
 *
 * An id in a settings-less category is rejected with a category-specific "has
 * no settings" message; an unknown id keeps the existing "unknown tool" error.
 */
function resolveSettingsItem(
  categories: readonly KitCategory<unknown>[],
  deps: OperationDeps,
  id: string | undefined,
): { category: KitCategory<unknown>; item: unknown; id: string } | undefined {
  if (id === undefined || id.length === 0) {
    deps.err(`opencode-kit: unknown tool "${id ?? ""}"`)
    return undefined
  }
  const found = findCategoryItem(categories, id)
  if (found === undefined) {
    deps.err(`opencode-kit: unknown tool "${id}"`)
    return undefined
  }
  if (!found.category.hasSettings) {
    deps.err(`opencode-kit: ${found.category.label} have no settings: "${id}"`)
    return undefined
  }
  return { category: found.category, item: found.item, id }
}

/**
 * Handles `config get <id> <key>`.
 *
 * Prints the item's effective setting (defaults merged with the global config)
 * as JSON. Settings-less categories and unknown ids are user errors.
 */
export async function configGetOperation(
  categories: readonly KitCategory<unknown>[],
  deps: OperationDeps,
  id: string | undefined,
  key: string | undefined,
): Promise<OperationResult> {
  const found = resolveSettingsItem(categories, deps, id)
  if (found === undefined) return { exitCode: 1 }
  if (key === undefined || key.length === 0) {
    deps.err(`opencode-kit: config get requires a tool id and key`)
    return { exitCode: 1 }
  }

  const sources = await loadKitConfig([globalConfigPath(deps.home)])
  const { settings } = resolveCategoryEntry(found.category, found.item, sources)
  const value = (settings as Record<string, unknown> | undefined)?.[key]

  if (value === undefined) {
    deps.err(`opencode-kit: "${found.id}.${key}" is not set`)
    return { exitCode: 1 }
  }

  deps.out(JSON.stringify(value))
  return { exitCode: 0 }
}

/**
 * Handles `config set <id> <key> <value>`.
 *
 * Coerces the value and writes it comment-preservingly. Two advisory warnings
 * follow: one when the write would make the item degrade to defaults, and one
 * when a higher-precedence layer overrides the value just written. The optional
 * `deps.reload` re-bootstraps the kit once the write is done.
 */
export async function configSetOperation(
  categories: readonly KitCategory<unknown>[],
  deps: OperationDeps,
  id: string | undefined,
  key: string | undefined,
  valueParts: string[],
): Promise<OperationResult> {
  const found = resolveSettingsItem(categories, deps, id)
  if (found === undefined) return { exitCode: 1 }
  if (key === undefined || key.length === 0 || valueParts.length === 0) {
    deps.err(`opencode-kit: config set requires a tool id, key, and value`)
    return { exitCode: 1 }
  }

  const { category, item, id: resolvedId } = found
  const value = coerceScalar(valueParts.join(" "))
  await setEntrySetting(globalConfigPath(deps.home), category.key, resolvedId, key, value)
  deps.out(`${resolvedId}.${key} = ${JSON.stringify(value)}`)

  // A typo can be written but never take effect: the item silently degrades to
  // defaults at load. Surface that here instead of reporting a clean success.
  const layers = await buildConfigLayers(deps.cwd, deps.home, process.env, deps.options)
  const effective = resolveCategoryEffective(category, item, layers)
  const { degraded } = resolveValidated(item as KitTool, {
    enabled: effective.enabled,
    settings: effective.settings ?? {},
  })
  if (degraded !== undefined) {
    deps.err(`opencode-kit: warning: ${degraded}`)
  }

  // A higher-precedence layer (project config or plugin options) can override
  // the value we just wrote globally. Report the mismatch, but stay advisory.
  const effectiveValue = effective.settings?.[key]
  if (!valuesEqual(effectiveValue, value)) {
    const layer = effective.settingLayers?.[key]
    deps.err(
      `opencode-kit: warning: "${resolvedId}.${key}" is effectively ${JSON.stringify(effectiveValue)}; your change is overridden by ${layer?.label ?? "a higher-precedence layer"}`,
    )
  }

  await deps.reload?.()
  return { exitCode: 0 }
}
