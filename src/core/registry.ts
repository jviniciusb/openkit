import type { KitContext, Registration } from "./context"
import type { KitApi, KitTool } from "./tool"
import type { ResolvedToolConfig } from "../config/types"

/** A tool whose `register` threw; its partial registrations were disposed. */
export interface DegradedTool {
  id: string
  error: string
}

export interface RegisterToolsResult {
  /** Disposables created by tools that registered successfully, in tool order. */
  registrations: Registration[]
  /** Tools that failed to register, in the order they were attempted. */
  degraded: DegradedTool[]
}

/**
 * Registers every enabled tool, isolating failures per tool.
 *
 * A tool is skipped unless `resolved` contains it with `enabled: true`. Each
 * enabled tool registers in array order against a context wrapper that tracks
 * every `Registration` it creates. If `register` throws, those partial
 * registrations are disposed and the tool is reported in `degraded`, leaving
 * other tools unaffected.
 *
 * `makeKit` is only forwarded to `register`; the registry never inspects it.
 */
export async function registerTools(
  tools: KitTool[],
  resolved: Map<string, ResolvedToolConfig<unknown>>,
  ctx: KitContext,
  makeKit: (toolId: string) => KitApi,
): Promise<RegisterToolsResult> {
  const registrations: Registration[] = []
  const degraded: DegradedTool[] = []

  for (const tool of tools) {
    const config = resolved.get(tool.id)
    if (config?.enabled !== true) continue

    const created: Registration[] = []
    const tracking: KitContext = {
      ...ctx,
      tool: {
        async transform(callback) {
          const registration = await ctx.tool.transform(callback)
          created.push(registration)
          return registration
        },
      },
      command: {
        async transform(callback) {
          const registration = await ctx.command.transform(callback)
          created.push(registration)
          return registration
        },
      },
      skill: {
        async transform(callback) {
          const registration = await ctx.skill.transform(callback)
          created.push(registration)
          return registration
        },
      },
      session: {
        async hook(name, handler) {
          const registration = await ctx.session.hook(name, handler)
          created.push(registration)
          return registration
        },
      },
    }

    try {
      await tool.register(tracking, config.settings, makeKit(tool.id))
      registrations.push(...created)
    } catch (error) {
      for (const registration of created) {
        try {
          await registration.dispose()
        } catch {
          // A failing disposer must not mask the original registration error.
        }
      }
      degraded.push({
        id: tool.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return { registrations, degraded }
}
