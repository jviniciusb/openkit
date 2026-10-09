import { loadReference, referenceDescription, registerReference, type KitReference } from "../core/reference"
import type { KitCategory } from "../core/category"
import { references } from "../references/index"
import { referenceScaffold } from "./scaffold"

/**
 * The references category.
 *
 * Settings-bearing and opt-in by default. `registerItem` loads the reference's
 * `reference.json`, merges the resolved settings over its source, and registers
 * it through `ctx.reference.transform`; a missing or unreadable file throws and
 * the engine degrades only that reference. `inspect` reports that same load
 * failure (or `undefined` when the file is readable).
 */
export const referenceCategory: KitCategory<KitReference> = {
  key: "references",
  label: "references",
  items: references,
  defaultEnabled: (reference) => reference.defaultEnabled ?? false,
  hasSettings: true,
  defaultSettings: () => ({}),
  scaffold: referenceScaffold,
  describe: referenceDescription,
  inspect: (reference) => {
    try {
      loadReference(reference)
      return undefined
    } catch (error) {
      return error instanceof Error ? error.message : String(error)
    }
  },
  async registerItem(reference, resolved, ctx) {
    return { registrations: [await registerReference(ctx, reference, resolved.settings)] }
  },
}
