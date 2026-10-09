import { skillCategory } from "./categories/skill"
import { toolCategory } from "./categories/tool"
import type { KitCategory } from "./core/category"

/**
 * Every category shipped by opencode-kit, in registration order.
 *
 * Descriptors are consumed through `KitCategory<unknown>`; method bivariance
 * keeps the concretely-typed descriptors assignable.
 */
export const categories: readonly KitCategory<unknown>[] = [toolCategory, skillCategory]
