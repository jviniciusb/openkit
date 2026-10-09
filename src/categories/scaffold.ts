import type { CategoryScaffold } from "../core/category"

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

/** Converts a kebab-case id to its PascalCase type prefix (`my-tool` → `MyTool`). */
function pascalCase(id: string): string {
  const camel = camelCase(id)
  return camel.charAt(0).toUpperCase() + camel.slice(1)
}

/** Builds the `src/tools/<id>/index.ts` source for a new tool. */
export function renderTool(id: string): string {
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

/** Builds the `src/skills/<id>/SKILL.md` source for a new skill. */
export function renderSkill(id: string): string {
  const name = displayName(id) || id
  return `---
name: ${name}
description: "TODO: describe when and why to use the ${id} skill."
---

# ${name}

TODO: describe what this skill does and how to use it.
`
}

/**
 * Builds the `src/references/<id>/reference.json` source for a new reference.
 *
 * Ships a valid local placeholder so the reference loads as-is; authors point
 * `path` at real content (or switch `type` to `git`).
 */
export function renderReference(id: string): string {
  return `{
  "description": "TODO: describe the ${id} reference.",
  "type": "local",
  "path": "./TODO"
}
`
}

/**
 * Scaffolder metadata for the tools category.
 *
 * Tools use a per-file default export, so the barrel needs both an import line
 * and a camelCase array entry.
 */
export const toolScaffold: CategoryScaffold = {
  dir: "src/tools",
  entryFile: "index.ts",
  barrel: "src/tools/index.ts",
  markers: { open: "// <kit:tools>", close: "// </kit:tools>" },
  render: renderTool,
  renderBarrelEntry: (id) => `  ${camelCase(id)},`,
  importLine: (id) => `import ${camelCase(id)} from "./${id}"`,
}

/**
 * Scaffolder metadata for the skills category.
 *
 * Skills are declared inline in the barrel, so `defineSkill` must already be
 * imported there.
 */
export const skillScaffold: CategoryScaffold = {
  dir: "src/skills",
  entryFile: "SKILL.md",
  barrel: "src/skills/index.ts",
  markers: { open: "// <kit:skills>", close: "// </kit:skills>" },
  render: renderSkill,
  renderBarrelEntry: (id) => `  defineSkill({ id: "${id}", dir: new URL("./${id}/", import.meta.url) }),`,
  requiresImport: "defineSkill",
}

/**
 * Scaffolder metadata for the references category.
 *
 * References are declared inline in the barrel, so `defineReference` must
 * already be imported there.
 */
export const referenceScaffold: CategoryScaffold = {
  dir: "src/references",
  entryFile: "reference.json",
  barrel: "src/references/index.ts",
  markers: { open: "// <kit:references>", close: "// </kit:references>" },
  render: renderReference,
  renderBarrelEntry: (id) =>
    `  defineReference({ id: "${id}", dir: new URL("./${id}/", import.meta.url) }),`,
  requiresImport: "defineReference",
}
