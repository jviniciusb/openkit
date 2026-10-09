import { resolveValidated } from "../config/validate"
import type { KitCategory } from "../core/category"
import { createKitApi } from "../core/kit-api"
import { createTrackingContext } from "../core/tracking"
import type { KitTool } from "../core/tool"
import { tools } from "../tools/index"

/**
 * The tools category.
 *
 * Settings-bearing and opt-in by default. `registerItem` wraps `ctx` so every
 * registration the tool creates is tracked, validates the resolved settings
 * against the tool's schema, and only then calls `register`. Invalid settings
 * degrade the tool without registering it; a throwing `register` disposes the
 * partial registrations it created and rethrows so the engine tags it degraded
 * while sibling tools are unaffected.
 */
export const toolCategory: KitCategory<KitTool> = {
  key: "tools",
  label: "tools",
  items: tools,
  defaultEnabled: (tool) => tool.defaultEnabled ?? false,
  hasSettings: true,
  defaultSettings: (tool) => tool.defaultSettings as Record<string, unknown>,
  describe: (tool) => tool.description,
  async registerItem(tool, resolved, ctx) {
    const { ctx: tracked, created } = createTrackingContext(ctx)
    const { config, degraded } = resolveValidated(tool, {
      enabled: resolved.enabled,
      settings: resolved.settings ?? tool.defaultSettings,
    })
    if (degraded !== undefined) return { registrations: [], degraded }

    try {
      await tool.register(tracked, config.settings, createKitApi(tool.id, tracked, ctx.app.version))
      return { registrations: created }
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
