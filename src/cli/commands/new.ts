import { categories } from "../../catalog"
import type { KitCategory } from "../../core/category"
import { scaffoldCategory, scaffoldTool } from "../scaffold"
import type { CliIo } from "./list"

/** Finds a category by its CLI name (singular or plural, case-insensitive). */
function findCategory(name: string): KitCategory<unknown> | undefined {
  const singular = name.toLowerCase().replace(/s$/, "")
  return categories.find((category) => category.key.toLowerCase().replace(/s$/, "") === singular)
}

/** Runs a scaffolder and reports the created directory on stdout. */
async function report(io: CliIo, scaffold: () => Promise<{ dir: string }>): Promise<number> {
  const { dir } = await scaffold()
  io.stdout(`created ${dir}`)
  return 0
}

/**
 * Handles `opencode-kit new <category> <id>`, `new <id>`, and their aliases.
 *
 * `new <id>` (one argument) is an alias for `new tool <id>`, except that a lone
 * category name (`tool`/`tools`, `skill`/`skills`, `reference`/`references`) is
 * rejected as a missing id rather than scaffolded as a tool. Two arguments are
 * read as `new <category> <id>` where the category is a category key or its
 * singular (`tool`, `skill`, `reference`). A missing id, an unknown category, or
 * extra arguments is a user error; a thrown scaffolder error (e.g. an existing
 * item) propagates and `runCli` turns it into a non-zero exit.
 */
export async function newCommand(io: CliIo, args: string[]): Promise<number> {
  const [first, ...rest] = args
  if (first === undefined || first.trim().length === 0) {
    io.stderr("opencode-kit: new requires a tool id")
    return 1
  }

  // A lone category name (key or singular) is a missing-id error, not a tool id.
  if (rest.length === 0) {
    if (categories.some((category) => category.key === first || category.singular === first)) {
      io.stderr("opencode-kit: new <category> requires an id")
      return 1
    }
    // `new <id>` stays an alias for `new tool <id>`.
    return report(io, () => scaffoldTool(io.cwd, first))
  }

  if (rest.length > 1) {
    io.stderr(`opencode-kit: new ${first} accepts a single id`)
    return 1
  }

  const id = rest[0] ?? ""
  if (id.trim().length === 0) {
    io.stderr(`opencode-kit: new ${first} requires an id`)
    return 1
  }

  const category = findCategory(first)
  if (category === undefined || category.scaffold === undefined) {
    io.stderr(`opencode-kit: unknown category "${first}"`)
    return 1
  }

  return report(io, () => scaffoldCategory(category, io.cwd, id))
}
