/**
 * Kit reference contract, loader, and registration.
 *
 * A reference packages one named content source (local path or git repository)
 * that the kit exposes to the session through `ctx.reference`. The loader is
 * strict about the file's shape so a broken reference degrades only itself.
 */

import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import type { KitContext, ReferenceSource, Registration } from "./context"

/** A reference packaged by the kit: an id and the directory holding its `reference.json`. */
export interface KitReference {
  id: string
  dir: URL
  defaultEnabled?: boolean
}

/** Normalizes a {@link KitReference}, defaulting `defaultEnabled` to `false`. */
export function defineReference(ref: KitReference): KitReference {
  return { ...ref, defaultEnabled: ref.defaultEnabled ?? false }
}

/** A loaded reference: its parsed description and validated source. */
export interface LoadedReference {
  id: string
  description?: string
  source: ReferenceSource
}

/** Validates a parsed `reference.json` body into a {@link ReferenceSource}. */
function parseSource(data: unknown): ReferenceSource {
  if (typeof data !== "object" || data === null) {
    throw new Error("reference.json must be a JSON object")
  }
  const record = data as Record<string, unknown>
  if (record.type === "local") {
    if (typeof record.path !== "string") {
      throw new Error('local reference requires a string "path"')
    }
    return { type: "local", path: record.path }
  }
  if (record.type === "git") {
    if (typeof record.repository !== "string") {
      throw new Error('git reference requires a string "repository"')
    }
    const source: ReferenceSource = { type: "git", repository: record.repository }
    if (typeof record.branch === "string") source.branch = record.branch
    return source
  }
  throw new Error('reference.json "type" must be "local" or "git"')
}

/**
 * Reads and validates a reference's `reference.json`.
 *
 * Throws only when the file is missing/unreadable or its contents are invalid
 * (unknown `type`, or a missing/non-string `path`/`repository`).
 */
export function loadReference(ref: KitReference): LoadedReference {
  const path = fileURLToPath(new URL("reference.json", ref.dir))
  const data: unknown = JSON.parse(readFileSync(path, "utf8"))
  const source = parseSource(data)
  const description = (data as Record<string, unknown>).description
  return typeof description === "string"
    ? { id: ref.id, description, source }
    : { id: ref.id, source }
}

/** Best-effort description read; returns `""` when the reference cannot be loaded. */
export function referenceDescription(ref: KitReference): string {
  try {
    return loadReference(ref).description ?? ""
  } catch {
    return ""
  }
}

/**
 * Loads a reference, merges `settings` over its source, and registers it
 * through `ctx.reference.transform`. `settings` only override source fields
 * (e.g. a different `path`); `type` is preserved from the loaded file.
 */
export async function registerReference(
  ctx: KitContext,
  ref: KitReference,
  settings?: Record<string, unknown>,
): Promise<Registration> {
  const { source } = loadReference(ref)
  const merged = { ...source, ...settings } as ReferenceSource
  return ctx.reference.transform((editor) => editor.add(ref.id, merged))
}
