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

/**
 * Validates an unknown value into a {@link ReferenceSource}, returning a clean
 * object (unknown keys are dropped).
 *
 * Throws when the value is not an object, has an unknown `type`, a `local`
 * source lacks a string `path`, a `git` source lacks a string `repository`, or
 * a present `branch` is not a string.
 */
export function validateReferenceSource(source: unknown): ReferenceSource {
  if (typeof source !== "object" || source === null) {
    throw new Error("reference source must be an object")
  }
  const record = source as Record<string, unknown>
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
    if (record.branch !== undefined && typeof record.branch !== "string") {
      throw new Error('git reference "branch" must be a string')
    }
    const result: ReferenceSource = { type: "git", repository: record.repository }
    if (typeof record.branch === "string") result.branch = record.branch
    return result
  }
  throw new Error('reference source "type" must be "local" or "git"')
}

/**
 * Merges `settings` over a validated `source`, forcing `type` from the file so
 * a setting can never turn a `local` reference into a `git` source.
 *
 * The result is not validated here; callers pass it through
 * {@link validateReferenceSource} before registering it.
 */
export function mergeReferenceSource(
  source: ReferenceSource,
  settings?: Record<string, unknown>,
): ReferenceSource {
  return { ...source, ...settings, type: source.type } as ReferenceSource
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
  const source = validateReferenceSource(data)
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
 * through `ctx.reference.transform`. `settings` override only the source's
 * `path`/`repository`/`branch`; `type` is always taken from the loaded file, so
 * a setting cannot turn a `local` reference into an invalid `git` source. The
 * merged source is re-validated, so a setting that makes it invalid throws here
 * (and is reported by the doctor script and `/kit config set`).
 */
export async function registerReference(
  ctx: KitContext,
  ref: KitReference,
  settings?: Record<string, unknown>,
): Promise<Registration> {
  const { source } = loadReference(ref)
  const merged = validateReferenceSource(mergeReferenceSource(source, settings))
  return ctx.reference.transform((editor) => editor.add(ref.id, merged))
}
