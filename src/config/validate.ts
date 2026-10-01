import { Ajv } from "ajv"

import type { JsonSchema, KitTool } from "../core/tool"
import type { ResolvedToolConfig } from "./types"

/** Result of validating a tool's settings against its JSON Schema. */
export type ValidationResult = { valid: true } | { valid: false; errors: string[] }

const ajv = new Ajv({ allErrors: true, strict: false })

/** Renders an Ajv error as a stable, human-readable string. */
function formatError(error: {
  instancePath?: string
  message?: string
  params?: Record<string, unknown>
}): string {
  const path = error.instancePath && error.instancePath.length > 0 ? error.instancePath : "/"
  const extra = Object.entries(error.params ?? {})
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(", ")
  const message = error.message ?? "invalid"
  return extra.length > 0 ? `${path} ${message} (${extra})` : `${path} ${message}`
}

/**
 * Validates `settings` against a tool's JSON Schema.
 *
 * When no schema is declared, every value is accepted.
 */
export function validateToolSettings(
  schema: JsonSchema | undefined,
  settings: unknown,
): ValidationResult {
  if (schema === undefined) return { valid: true }

  const validate = ajv.compile(schema)
  if (validate(settings)) return { valid: true }

  const errors = (validate.errors ?? []).map(formatError)
  return { valid: false, errors: errors.length > 0 ? errors : ["settings failed validation"] }
}

/**
 * Resolves a tool's config, validating settings against its schema.
 *
 * Valid settings pass through untouched. Invalid settings never block loading:
 * the tool falls back to its `defaultSettings` and a `degraded` reason is
 * reported so the caller can surface the problem.
 */
export function resolveValidated<S>(
  tool: KitTool<S>,
  config: { enabled: boolean; settings: unknown },
): { config: ResolvedToolConfig<S>; degraded?: string } {
  const result = validateToolSettings(tool.settingsSchema, config.settings)

  if (result.valid) {
    return { config: { enabled: config.enabled, settings: config.settings as S } }
  }

  const reason = `Tool "${tool.id}" settings are invalid; using defaults: ${result.errors.join("; ")}`
  return { config: { enabled: config.enabled, settings: tool.defaultSettings }, degraded: reason }
}
