import { existsSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

/** Opening marker delimiting the generated tool entries in the barrel. */
const OPEN_MARKER = "// <kit:tools>"
/** Closing marker delimiting the generated tool entries in the barrel. */
const CLOSE_MARKER = "// </kit:tools>"

/** Valid tool ids: kebab-case, starting with a lowercase letter. */
const TOOL_ID_RE = /^[a-z][a-z0-9-]*$/

/** Converts a kebab-case id to its camelCase identifier (`my-tool` → `myTool`). */
export function camelCase(id: string): string {
  const parts = id.split(/[^a-zA-Z0-9]+/).filter((part) => part.length > 0)
  const [first, ...rest] = parts
  if (first === undefined) return ""
  return (
    first.toLowerCase() +
    rest.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join("")
  )
}

/** Converts a kebab-case id to a Title Case display name (`my-tool` → `My Tool`). */
function displayName(id: string): string {
  return id
    .split(/[^a-zA-Z0-9]+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

/** Builds the `src/tools/<id>/index.ts` source for a new tool. */
function renderTool(id: string): string {
  const name = displayName(id) || id
  return `import { defineTool } from "../../core/tool"

/** Settings accepted by the \`${id}\` tool. */
export interface ${pascalCase(id)}Settings {
  // Add settings fields here.
}

/**
 * ${name}: TODO describe what this tool does.
 *
 * TODO: replace this skeleton. It follows the same pattern as \`hello\`: declare
 * typed settings, a JSON Schema, then register one tool on the \`${id}\`
 * namespace via \`kit.tool\`.
 */
export default defineTool<${pascalCase(id)}Settings>({
  id: "${id}",
  name: "${name}",
  description: "TODO: describe ${id}.",
  defaultEnabled: false,
  defaultSettings: {},
  settingsSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  register(_ctx, _settings, kit) {
    kit.namespace("${id}")
    return kit.tool({
      name: "${id}",
      description: "TODO: describe ${id}.",
      input: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      execute: async () => ({ content: "TODO: implement ${id}." }),
    })
  },
})
`
}

/** Converts a kebab-case id to its PascalCase type prefix (`my-tool` → `MyTool`). */
function pascalCase(id: string): string {
  const camel = camelCase(id)
  return camel.charAt(0).toUpperCase() + camel.slice(1)
}

/**
 * Inserts the new tool's import and barrel entry into `src/tools/index.ts`.
 *
 * The array entry is placed immediately after the `// <kit:tools>` marker and
 * the import directly before the `tools` export, keeping both markers intact.
 */
function updateBarrel(barrel: string, id: string): string {
  const identifier = camelCase(id)
  if (identifier.length === 0) {
    throw new Error(`invalid tool id "${id}"`)
  }

  if (!barrel.includes(OPEN_MARKER) || !barrel.includes(CLOSE_MARKER)) {
    throw new Error(`src/tools/index.ts is missing the <kit:tools> markers`)
  }

  const withEntry = barrel.replace(OPEN_MARKER, `${OPEN_MARKER}\n  ${identifier},`)

  const toolsDecl = /^export const tools\b/m
  if (!toolsDecl.test(withEntry)) {
    throw new Error(`src/tools/index.ts is missing the tools export`)
  }
  const importLine = `import ${identifier} from "./${id}"`
  return withEntry.replace(toolsDecl, `${importLine}\n$&`)
}

/**
 * Scaffolds a new kit tool under `root`.
 *
 * Creates `src/tools/<id>/index.ts` from the standard template and registers it
 * in `src/tools/index.ts` between the `<kit:tools>` markers. Refuses to touch an
 * existing tool directory so an in-progress tool is never overwritten.
 *
 * @returns The absolute path of the created tool directory.
 */
export async function scaffoldTool(root: string, toolId: string): Promise<{ dir: string }> {
  // Validate the id before any filesystem access: a malformed id could produce a
  // broken barrel import or, worse, escape `src/tools` via path traversal.
  if (toolId.trim().length === 0) {
    throw new Error("tool id is required")
  }
  if (!TOOL_ID_RE.test(toolId)) {
    throw new Error(
      `invalid tool id "${toolId}": expected kebab-case matching ${TOOL_ID_RE.source}`,
    )
  }

  const dir = join(root, "src", "tools", toolId)
  if (existsSync(dir)) {
    throw new Error(`tool "${toolId}" already exists at ${dir}`)
  }

  const barrelPath = join(root, "src", "tools", "index.ts")
  let barrel: string
  try {
    barrel = await readFile(barrelPath, "utf8")
  } catch {
    throw new Error(`cannot read ${barrelPath}`)
  }

  // Validate and compute the barrel update before writing anything, so a bad
  // barrel never leaves a half-scaffolded tool behind.
  const updatedBarrel = updateBarrel(barrel, toolId)

  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, "index.ts"), renderTool(toolId), "utf8")
  await writeFile(barrelPath, updatedBarrel, "utf8")

  return { dir }
}
