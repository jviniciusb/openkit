import { coerceScalar } from "../config/coerce"
import { discoverKitConfigFiles, globalConfigPath } from "../config/discover"
import { setSkillEnabled, setToolEnabled, setToolSetting } from "../config/edit"
import {
  buildConfigLayers,
  resolveEffective,
  resolveSkillEffective,
  valuesEqual,
} from "../config/effective"
import { loadKitConfig } from "../config/load"
import { resolveSkillConfig, resolveToolConfig } from "../config/resolve"
import type { KitConfigFile } from "../config/types"
import { resolveValidated } from "../config/validate"
import type { KitContext, Registration } from "../core/context"
import { skillDescription } from "../core/skill"
import { skills } from "../skills/index"
import { tools } from "../tools/index"

/** Injected environment for the `/kit` command (home, cwd, reload, output). */
export interface KitCommandDeps {
  /** Home directory holding the global kit config. */
  home: string
  /** Project directory used to discover project-level config files. */
  cwd: string
  /** Re-bootstraps the kit after a mutation so changes take effect. */
  reload(): Promise<void>
  /** Sink for command output. */
  stdout(s: string): void
}

/** Payload OpenCode passes to a slash command's `execute`. */
interface KitCommandInput {
  arguments?: string
  /** Session that invoked the command; used to route output through `prompt`. */
  sessionID?: string
}

/**
 * Resolves where command output goes: the session's `prompt` channel when the
 * harness exposes one, otherwise the injected `stdout` sink (CLI/tests).
 */
function outputWriter(
  ctx: KitContext,
  deps: KitCommandDeps,
  sessionID: string | undefined,
): (s: string) => void {
  const prompt = ctx.session.prompt
  if (typeof prompt === "function" && sessionID !== undefined) {
    return (text) => {
      try {
        void Promise.resolve(prompt.call(ctx.session, { sessionID, text })).catch((error) => {
          console.warn("opencode-kit: failed to deliver /kit output", error)
        })
      } catch (error) {
        console.warn("opencode-kit: failed to deliver /kit output", error)
      }
    }
  }
  return deps.stdout
}

/** Help text shown for missing or unknown subcommands. */
const USAGE = [
  "kit list",
  "kit enable <id>",
  "kit disable <id>",
  "kit config <id> <key> <value>",
].join("\n")

/**
 * Registers the `/kit` slash command.
 *
 * Supported forms:
 * - `list` — print every shipped tool with its resolved enabled state;
 * - `enable <id>` / `disable <id>` — write `tools[id].enabled` (or, for a
 *   shipped skill id, `skills[id].enabled`) to the global kit config, then
 *   reload;
 * - `config <id> <key> <value>` — write `tools[id].settings[key]` to the global
 *   kit config (scalar coercion, comment-preserving), then reload. Skill ids
 *   are rejected: skills have no settings.
 *
 * The returned registration disposes the command; the caller owns its lifetime.
 */
export async function registerKitCommand(
  ctx: KitContext,
  deps: KitCommandDeps,
): Promise<Registration> {
  return ctx.command.transform((editor) => {
    editor.add({
      name: "kit",
      description: "Manage opencode-kit tools (list, enable, disable, config)",
      execute: (input: KitCommandInput) => executeKitCommand(input, ctx, deps),
    })
  })
}

/** Splits a slash-command argument string on whitespace, dropping empties. */
function tokenize(raw: string): string[] {
  return raw.trim().length === 0 ? [] : raw.trim().split(/\s+/)
}

/** Dispatches one `/kit` invocation. */
async function executeKitCommand(
  input: KitCommandInput,
  ctx: KitContext,
  deps: KitCommandDeps,
): Promise<void> {
  const [sub, ...rest] = tokenize(input.arguments ?? "")
  const scoped: KitCommandDeps = { ...deps, stdout: outputWriter(ctx, deps, input.sessionID) }
  const pluginOptions = ctx.options as KitConfigFile

  switch (sub) {
    case "list":
      return list(scoped)
    case "enable":
      return toggle(scoped, rest[0], true, pluginOptions)
    case "disable":
      return toggle(scoped, rest[0], false, pluginOptions)
    case "config":
      return configure(scoped, rest, pluginOptions)
    default:
      scoped.stdout(USAGE)
  }
}

/** Prints every shipped tool and skill with its resolved enabled state. */
async function list(deps: KitCommandDeps): Promise<void> {
  const paths = discoverKitConfigFiles(deps.cwd, deps.home)
  const sources = await loadKitConfig(paths)

  deps.stdout("tools:\n")
  for (const tool of tools) {
    const { enabled } = resolveToolConfig(tool, sources)
    deps.stdout(`${tool.id}\t${enabled ? "enabled" : "disabled"}\t${tool.description}\n`)
  }

  deps.stdout("skills:\n")
  for (const skill of skills) {
    const { enabled } = resolveSkillConfig(skill, sources)
    deps.stdout(`${skill.id}\t${enabled ? "enabled" : "disabled"}\t${skillDescription(skill)}\n`)
  }
}

/** Enables or disables a known tool or skill in the global config, then reloads. */
async function toggle(
  deps: KitCommandDeps,
  toolId: string | undefined,
  enabled: boolean,
  pluginOptions: KitConfigFile,
): Promise<void> {
  const verb = enabled ? "enable" : "disable"

  if (toolId === undefined || toolId.length === 0) {
    deps.stdout(`kit: ${verb} requires a tool id`)
    return
  }

  const tool = tools.find((candidate) => candidate.id === toolId)
  const skill = skills.find((candidate) => candidate.id === toolId)
  if (tool === undefined && skill === undefined) {
    deps.stdout(`kit: unknown tool "${toolId}"`)
    return
  }

  if (tool !== undefined) {
    await setToolEnabled(globalConfigPath(deps.home), toolId, enabled)
    deps.stdout(`${toolId} ${enabled ? "enabled" : "disabled"}`)

    // Resolve after the write so the global layer reflects the new value.
    const layers = await buildConfigLayers(deps.cwd, deps.home, process.env, pluginOptions)
    const effective = resolveEffective(tool, layers)
    if (effective.enabled !== enabled) {
      deps.stdout(
        `kit: warning: "${toolId}" is effectively ${effective.enabled ? "enabled" : "disabled"}; your change is overridden by ${effective.enabledLayer?.label ?? "a higher-precedence layer"}`,
      )
    }
  } else if (skill !== undefined) {
    await setSkillEnabled(globalConfigPath(deps.home), toolId, enabled)
    deps.stdout(`${toolId} ${enabled ? "enabled" : "disabled"}`)

    const layers = await buildConfigLayers(deps.cwd, deps.home, process.env, pluginOptions)
    const effective = resolveSkillEffective(skill, layers)
    if (effective.enabled !== enabled) {
      deps.stdout(
        `kit: warning: "${toolId}" is effectively ${effective.enabled ? "enabled" : "disabled"}; your change is overridden by ${effective.enabledLayer?.label ?? "a higher-precedence layer"}`,
      )
    }
  }

  await deps.reload()
}

/** Sets a tool setting in the global config, then reloads. */
async function configure(
  deps: KitCommandDeps,
  parts: string[],
  pluginOptions: KitConfigFile,
): Promise<void> {
  const [toolId, key, ...valueParts] = parts

  if (toolId === undefined || key === undefined || valueParts.length === 0) {
    deps.stdout("kit: config requires <id> <key> <value>")
    return
  }
  const tool = tools.find((candidate) => candidate.id === toolId)
  if (tool === undefined) {
    if (skills.some((skill) => skill.id === toolId)) {
      deps.stdout(`kit: skills have no settings: "${toolId}"`)
      return
    }
    deps.stdout(`kit: unknown tool "${toolId}"`)
    return
  }

  const value = coerceScalar(valueParts.join(" "))
  await setToolSetting(globalConfigPath(deps.home), toolId, key, value)
  deps.stdout(`${toolId}.${key} = ${JSON.stringify(value)}`)

  const layers = await buildConfigLayers(deps.cwd, deps.home, process.env, pluginOptions)
  const effective = resolveEffective(tool, layers)
  const { degraded } = resolveValidated(tool, { enabled: effective.enabled, settings: effective.settings })
  if (degraded !== undefined) {
    deps.stdout(`kit: warning: ${degraded}`)
  }

  const effectiveValue = effective.settings[key]
  if (!valuesEqual(effectiveValue, value)) {
    deps.stdout(
      `kit: warning: "${toolId}.${key}" is effectively ${JSON.stringify(effectiveValue)}; your change is overridden by ${effective.settingLayers[key]?.label ?? "a higher-precedence layer"}`,
    )
  }

  await deps.reload()
}
