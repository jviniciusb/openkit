import { Ajv, type ValidateFunction } from "ajv"

import type { JsonSchema, KitTool } from "../core/tool"
import type { ResolvedToolConfig } from "./types"

/** Result of validating a tool's settings against its JSON Schema. */
export type ValidationResult = { valid: true } | { valid: false; errors: string[] }

/**
 * Compiled validators, keyed by schema identity.
 *
 * Each schema compiles against its own {@link Ajv} instance so two items whose
 * schemas happen to share an `$id` cannot collide (a module-level singleton
 * would throw on the second `compile`). The `WeakMap` keeps compilation to once
 * per schema object, and lets schemas be garbage-collected with their category.
 */
const validators = new WeakMap<object, ValidateFunction>()

function compileValidator(schema: object): ValidateFunction {
  const cached = validators.get(schema)
  if (cached !== undefined) return cached
  const validator = new Ajv({ allErrors: true, strict: false }).compile(schema)
  validators.set(schema, validator)
  return validator
}

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
 * When no schema is declared, every value is accepted. A schema that Ajv
 * cannot compile (malformed keywords, unresolvable `$ref`, async schema) is
 * reported as validation failure rather than thrown, so callers can degrade.
 */
export function validateToolSettings(
  schema: JsonSchema | undefined,
  settings: unknown,
): ValidationResult {
  if (schema === undefined) return { valid: true }

  try {
    const validate = compileValidator(schema)
    if (validate(settings)) return { valid: true }

    const errors = (validate.errors ?? []).map(formatError)
    return { valid: false, errors: errors.length > 0 ? errors : ["settings failed validation"] }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { valid: false, errors: [`schema compile error: ${message}`] }
  }
}

/**
 * Resolves a tool's config, validating settings against its schema.
 *
 * Valid settings pass through untouched. Invalid settings — or a schema that
 * fails to compile — never block loading: the tool falls back to its
 * `defaultSettings` and a `degraded` reason is reported so the caller can
 * surface the problem.
 */
export function resolveValidated<S>(
  tool: KitTool<S>,
  config: { enabled: boolean; settings: unknown },
): { config: ResolvedToolConfig<S>; degraded?: string } {
  const result = validateToolSettings(tool.settingsSchema, config.settings)

  if (result.valid) {
    return { config: { enabled: config.enabled, settings: config.settings as S } }
  }

  const reason = `Tool "${tool.id}" settings are invalid (or its schema failed to compile); using defaults: ${result.errors.join("; ")}`
  // Clone the defaults: the fallback must not hand a tool a live reference to
  // its own `defaultSettings` (a mutating tool would corrupt the shared value
  // for every later registration and reload).
  return {
    config: { enabled: config.enabled, settings: structuredClone(tool.defaultSettings) },
    degraded: reason,
  }
}
