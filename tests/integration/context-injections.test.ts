import { afterAll, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { createFakeContext } from "../../src/core/testing"
import { bootstrap } from "../../src/plugin"
import { toolCategory } from "../../src/categories/tool"
import {
  BUILT_IN_RULES,
  contextInjections,
  RULES_HEADING,
  RULES_PREAMBLE,
} from "../../src/tools/context-injections"

const tempDirs: string[] = []

afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true })
})

function projectWithConfig(json: string) {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  tempDirs.push(home)
  const proj = join(home, "proj")
  mkdirSync(join(proj, ".opencode"), { recursive: true })
  writeFileSync(join(proj, ".opencode", "opencode-kit.jsonc"), json)
  return { home, proj }
}

test("enabling registers the hook; settings.rules deep-merges the defaults", async () => {
  const { home, proj } = projectWithConfig(
    `{ "tools": { "context-injections": { "enabled": true, "settings": { "rules": { "subagent-driven": false } } } } }`,
  )
  const { ctx, calls } = createFakeContext({ directory: proj, home })
  const res = await bootstrap(ctx, [{ ...toolCategory, items: [contextInjections] }])
  expect(res.degraded).toEqual([])
  expect(calls.hook).toEqual(["context"])

  const event = { system: [] as Array<{ type: string; text: string }> }
  await calls.hookHandlers[0]!(event)
  expect(event.system).toEqual([
    {
      type: "text",
      text: [
        RULES_HEADING,
        "",
        RULES_PREAMBLE,
        "",
        ...BUILT_IN_RULES.filter((rule) => rule.id !== "subagent-driven").map((rule) => `- ${rule.text}`),
      ].join("\n"),
    },
  ])
  await res.dispose()
})

test("an unknown rule id fails validation and degrades the tool", async () => {
  const { home, proj } = projectWithConfig(
    `{ "tools": { "context-injections": { "enabled": true, "settings": { "rules": { "typo-rule": false } } } } }`,
  )
  const { ctx } = createFakeContext({ directory: proj, home })
  const res = await bootstrap(ctx, [{ ...toolCategory, items: [contextInjections] }])
  expect(res.degraded.map((entry) => entry.id)).toEqual(["context-injections"])
  await res.dispose()
})

test("disabling the tool registers nothing", async () => {
  const { home, proj } = projectWithConfig(`{ "tools": { "context-injections": { "enabled": false } } }`)
  const { ctx, calls } = createFakeContext({ directory: proj, home })
  const res = await bootstrap(ctx, [{ ...toolCategory, items: [contextInjections] }])
  expect(calls.hook).toEqual([])
  await res.dispose()
})
