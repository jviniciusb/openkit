import type { KitCategory } from "../core/category"
import { resolveCategoryEffective } from "../core/engine"
import { globalConfigPath } from "../config/discover"
import { setEntryEnabled } from "../config/edit"
import { buildConfigLayers } from "../config/effective"
import { findCategoryItem, type OperationDeps, type OperationResult } from "./list"

/**
 * Enables or disables a shipped item by id, writing
 * `<category>[id].enabled` to the global kit config.
 *
 * The id is resolved across categories in catalog order (ids share one global
 * namespace). An unknown or missing id is a user error and leaves the
 * filesystem untouched. After writing, the effective state is re-resolved
 * across all layers; if a project config or the plugin `options` overrides the
 * global write, an advisory warning names the overriding layer (exit stays 0).
 * The optional `deps.reload` re-bootstraps the kit once the write is done.
 */
export async function toggleOperation(
  categories: readonly KitCategory<unknown>[],
  deps: OperationDeps,
  id: string | undefined,
  enabled: boolean,
): Promise<OperationResult> {
  const verb = enabled ? "enable" : "disable"

  if (id === undefined || id.length === 0) {
    deps.err(`openkit: ${verb} requires a tool id`)
    return { exitCode: 1 }
  }

  const found = findCategoryItem(categories, id)
  if (found === undefined) {
    deps.err(`openkit: unknown tool "${id}"`)
    return { exitCode: 1 }
  }

  const { category, item } = found
  await setEntryEnabled(globalConfigPath(deps.home), category.key, id, enabled)
  deps.out(`${id} ${enabled ? "enabled" : "disabled"}`)

  // Resolve after the write so the global layer reflects the new value.
  const layers = await buildConfigLayers(deps.cwd, deps.home, deps.env, deps.options)
  const effective = resolveCategoryEffective(category, item, layers)
  if (effective.enabled !== enabled) {
    deps.err(
      `openkit: warning: "${id}" is effectively ${effective.enabled ? "enabled" : "disabled"}; your change is overridden by ${effective.enabledLayer?.label ?? "a higher-precedence layer"}`,
    )
  }

  await deps.reload?.()
  return { exitCode: 0 }
}
