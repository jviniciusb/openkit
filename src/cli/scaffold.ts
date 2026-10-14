import { existsSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { skillCategory } from "../categories/skill"
import { toolCategory } from "../categories/tool"
import type { CategoryScaffold, KitCategory } from "../core/category"

/**
 * Valid tool, skill, and reference ids: kebab-case, starting with a lowercase
 * letter. Hyphens separate non-empty segments, so a trailing or doubled hyphen
 * (`foo-`, `foo--bar`) is rejected — those would collide with `foo`/`foo-bar`
 * once camel-cased into a barrel import.
 */
const ITEM_ID_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

/**
 * Inserts a new item's entry (and import, when the category needs one) into its
 * barrel.
 *
 * The array entry is placed immediately after the category's opening marker and
 * an optional import directly before the category's export, keeping both markers
 * intact. Every check runs before the returned string is written, so a barrel
 * that cannot be updated throws instead of leaving a half-scaffolded item.
 */
function updateBarrel(
  barrel: string,
  scaffold: CategoryScaffold,
  key: string,
  id: string,
): string {
  const { open, close } = scaffold.markers
  if (!barrel.includes(open) || !barrel.includes(close)) {
    throw new Error(`${scaffold.barrel} is missing the ${open} markers`)
  }

  const exportDecl = new RegExp(`^export const ${key}\\b`, "m")
  if (!exportDecl.test(barrel)) {
    throw new Error(`${scaffold.barrel} is missing the ${key} export`)
  }

  if (scaffold.requiresImport !== undefined) {
    const importRe = new RegExp(`import\\s*\\{[^}]*\\b${scaffold.requiresImport}\\b`)
    if (!importRe.test(barrel)) {
      throw new Error(`${scaffold.barrel} is missing the ${scaffold.requiresImport} import`)
    }
  }

  let updated = barrel.replace(open, `${open}\n${scaffold.renderBarrelEntry(id)}`)
  if (scaffold.importLine !== undefined) {
    updated = updated.replace(exportDecl, `${scaffold.importLine(id)}\n$&`)
  }
  return updated
}

/**
 * Scaffolds a new item for `category` under `root`, driven by its
 * `CategoryScaffold` metadata.
 *
 * Validates the id, refuses to touch an existing item directory, reads the
 * category barrel, computes the updated barrel *before* writing anything, then
 * writes the entry file and the barrel. A malformed id could otherwise produce a
 * broken barrel entry or escape the category directory via path traversal, and
 * a bad barrel could otherwise leave a half-scaffolded item behind.
 *
 * @returns The absolute path of the created item directory.
 */
export async function scaffoldCategory(
  category: KitCategory<unknown>,
  root: string,
  id: string,
): Promise<{ dir: string }> {
  const scaffold = category.scaffold
  if (scaffold === undefined) {
    throw new Error(`category "${category.key}" does not support scaffolding`)
  }

  // Validate the id before any filesystem access.
  if (id.trim().length === 0) {
    throw new Error(`${category.key} id is required`)
  }
  if (!ITEM_ID_RE.test(id)) {
    throw new Error(
      `invalid ${category.key} id "${id}": expected kebab-case matching ${ITEM_ID_RE.source}`,
    )
  }

  const dir = join(root, scaffold.dir, id)
  if (existsSync(dir)) {
    throw new Error(`${category.key} "${id}" already exists at ${dir}`)
  }

  const barrelPath = join(root, scaffold.barrel)
  let barrel: string
  try {
    barrel = await readFile(barrelPath, "utf8")
  } catch {
    throw new Error(`cannot read ${barrelPath}`)
  }

  // Validate and compute the barrel update before writing anything, so a bad
  // barrel never leaves a half-scaffolded item behind.
  const updatedBarrel = updateBarrel(barrel, scaffold, category.key, id)

  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, scaffold.entryFile), scaffold.render(id), "utf8")
  await writeFile(barrelPath, updatedBarrel, "utf8")

  return { dir }
}

/**
 * Scaffolds a new kit tool under `root`.
 *
 * Thin wrapper over {@link scaffoldCategory} using the tools category metadata.
 */
export async function scaffoldTool(root: string, toolId: string): Promise<{ dir: string }> {
  return scaffoldCategory(toolCategory, root, toolId)
}

/**
 * Scaffolds a new kit skill under `root`.
 *
 * Thin wrapper over {@link scaffoldCategory} using the skills category metadata.
 */
export async function scaffoldSkill(root: string, skillId: string): Promise<{ dir: string }> {
  return scaffoldCategory(skillCategory, root, skillId)
}
