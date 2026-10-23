import { resolveValidated } from "../config/validate"
import type { KitCategory } from "../core/category"
import { createKitApi } from "../core/kit-api"
import { createTrackingContext } from "../core/tracking"
import type { KitTool } from "../core/tool"
import { tools } from "../tools/index"

/**
 * The tools category.
 *
 * Settings-bearing and on by default. `registerItem` wraps `ctx` so every
 * registration the tool creates is tracked, validates the resolved settings
 * against the tool's schema, and calls `register`. Invalid settings do not
 * disable the tool: `resolveValidated` falls back to the tool's
 * `defaultSettings`, the tool still registers with those, and the validation
 * reason is returned as `degraded`. A throwing `register` disposes the partial
 * registrations it created and rethrows so the engine tags it degraded while
 * sibling tools are unaffected.
 */
export const toolCategory: KitCategory<KitTool> = {
  key: "tools",
  label: "tools",
  singular: "tool",
  items: tools,
  defaultEnabled: (tool) => tool.defaultEnabled ?? true,
  hasSettings: true,
  defaultSettings: (tool) => tool.defaultSettings as Record<string, unknown>,
  describe: (tool) => tool.description,
  inspectFatal: false,
  inspect: (tool, resolved) =>
    resolveValidated(tool, { enabled: resolved.enabled, settings: resolved.settings ?? {} })
      .degraded,
  async registerItem(tool, resolved, ctx) {
    const { ctx: tracked, created } = createTrackingContext(ctx)
    const { config, degraded } = resolveValidated(tool, {
      enabled: resolved.enabled,
      settings: resolved.settings,
    })
    try {
      const direct = await tool.register(tracked, config.settings, createKitApi(tool.id, tracked, ctx.app.version))
      if (direct !== undefined && !created.includes(direct)) created.push(direct)
      return degraded === undefined ? { registrations: created } : { registrations: created, degraded }
    } catch (error) {
      // Dispose what the tool managed to create before throwing; a failing
      // disposer must not mask the original registration error.
      for (const registration of created) {
        try {
          await registration.dispose()
        } catch {
          // Ignore: the registration error is the one that matters.
        }
      }
      throw error
    }
  },
}
