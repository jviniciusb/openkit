import {
  loadReference,
  mergeReferenceSource,
  referenceDescription,
  registerReference,
  validateReferenceSource,
  type KitReference,
} from "../core/reference"
import type { KitCategory } from "../core/category"
import { references } from "../references/index"
import { referenceScaffold } from "./scaffold"

/**
 * The references category.
 *
 * Settings-bearing and opt-in by default. `registerItem` loads the reference's
 * `reference.json`, merges the resolved settings over its source, and registers
 * it through `ctx.reference.transform`; a missing or unreadable file, or a
 * settings override that makes the merged source invalid, throws and the engine
 * degrades only that reference. `inspect` reports that same load/merge failure
 * (or `undefined` when the file is readable and the merged source is valid).
 */
export const referenceCategory: KitCategory<KitReference> = {
  key: "references",
  label: "references",
  singular: "reference",
  items: references,
  defaultEnabled: (reference) => reference.defaultEnabled ?? false,
  hasSettings: true,
  defaultSettings: () => ({}),
  scaffold: referenceScaffold,
  describe: referenceDescription,
  inspect: (reference, resolved) => {
    try {
      const loaded = loadReference(reference)
      validateReferenceSource(mergeReferenceSource(loaded.source, resolved.settings))
      return undefined
    } catch (error) {
      return error instanceof Error ? error.message : String(error)
    }
  },
  async registerItem(reference, resolved, ctx) {
    return { registrations: [await registerReference(ctx, reference, resolved.settings)] }
  },
}
