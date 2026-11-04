import { expect, test } from "bun:test"
import type { Plugin } from "@opencode/plugin"
import type { KitContext } from "../../src/core/context"

/**
 * Compile-time contract: `setup` is handed a real V2 `Context`, so that value
 * must satisfy every member the kit consumes. If OpenCode removes or reshapes
 * one, `bun run typecheck` fails here instead of a user's session failing at
 * runtime. The import is type-only, so the published plugin still loads without
 * `@opencode/plugin` installed.
 *
 * Scope: this catches removed, renamed, or reshaped members. Editor `add`
 * parameters stay loosely typed because the kit does not model the host's
 * generic tool/skill schemas, so a changed argument *list* (e.g. a new required
 * second parameter) would still slip through; the opt-in `tests/live` run is
 * the check for that.
 */
const toKitContext = (ctx: Plugin.Context): KitContext => ctx

test("the V2 plugin context satisfies the kit's contract", () => {
  expect(typeof toKitContext).toBe("function")
})
