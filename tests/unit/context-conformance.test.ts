import { expect, test } from "bun:test"
import type { Plugin } from "@opencode/plugin"
import type { KitContext } from "../../src/core/context"

/**
 * Compile-time contract: `setup` is handed a real V2 `Context`, so that value
 * must satisfy every member the kit consumes. If OpenCode removes or reshapes
 * one, `bun run typecheck` fails here instead of a user's session failing at
 * runtime. The import is type-only, so the published plugin still loads without
 * `@opencode/plugin` installed.
 */
const toKitContext = (ctx: Plugin.Context): KitContext => ctx

test("the V2 plugin context satisfies the kit's contract", () => {
  expect(typeof toKitContext).toBe("function")
})
