import type { KitContext, Registration } from "./context"

/**
 * Wraps `ctx` so every registration created through its `tool`/`command`/
 * `skill`/`reference`/`session` domains is recorded in `created`, in call order.
 *
 * This is how a category's `registerItem` isolates a partial failure: the
 * registrations a tool creates before throwing are all in `created`, so the
 * caller can dispose them and leave the kit (and sibling items) untouched.
 *
 * The wrapper is built with `ctx` as its prototype rather than by spreading it.
 * A real V2 context may expose members through getters or on the prototype;
 * spreading would copy only own enumerable properties and silently drop them.
 * We override just the domains we need to track, and use `defineProperties`
 * (not `Object.assign`/[[Set]]) so a frozen `ctx` or a getter/readonly member
 * cannot make the wrapper construction throw. `storage` is forwarded unchanged
 * because it exposes no registration surface.
 */
export function createTrackingContext(ctx: KitContext): { ctx: KitContext; created: Registration[] } {
  const created: Registration[] = []
  const overrides: Pick<
    KitContext,
    "tool" | "command" | "skill" | "reference" | "session" | "storage"
  > = {
    tool: {
      async transform(callback) {
        const registration = await ctx.tool.transform(callback)
        created.push(registration)
        return registration
      },
      async hook(name, handler) {
        const registration = await ctx.tool.hook(name, handler)
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
    reference: {
      async transform(callback) {
        const registration = await ctx.reference.transform(callback)
        created.push(registration)
        return registration
      },
    },
    session: {
      async hook(name, handler, opts) {
        const registration = await ctx.session.hook(name, handler, opts)
        created.push(registration)
        return registration
      },
    },
    storage: ctx.storage,
  }
  const tracking = Object.defineProperties(Object.create(ctx) as KitContext, {
    tool: { value: overrides.tool, enumerable: true, configurable: true, writable: true },
    command: { value: overrides.command, enumerable: true, configurable: true, writable: true },
    skill: { value: overrides.skill, enumerable: true, configurable: true, writable: true },
    reference: { value: overrides.reference, enumerable: true, configurable: true, writable: true },
    session: { value: overrides.session, enumerable: true, configurable: true, writable: true },
    storage: { value: overrides.storage, enumerable: true, configurable: true, writable: true },
  })
  return { ctx: tracking, created }
}
