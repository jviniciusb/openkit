import { expect, spyOn, test } from "bun:test"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { MIN_OPENCODE_VERSION } from "../../src/constants"
import { isVersionOlder } from "../../src/core/host-version"
import { createFakeContext } from "../../src/core/testing"
import plugin from "../../src/plugin"

test("reports a host older than the floor", () => {
  expect(isVersionOlder("2.2.4", MIN_OPENCODE_VERSION)).toBe(true)
  expect(isVersionOlder("2.1.99", MIN_OPENCODE_VERSION)).toBe(true)
  expect(isVersionOlder("1.9.0", MIN_OPENCODE_VERSION)).toBe(true)
})

test("accepts the floor and newer hosts", () => {
  expect(isVersionOlder(MIN_OPENCODE_VERSION, MIN_OPENCODE_VERSION)).toBe(false)
  expect(isVersionOlder("2.3.1", MIN_OPENCODE_VERSION)).toBe(false)
  expect(isVersionOlder("3.0.0", MIN_OPENCODE_VERSION)).toBe(false)
})

test("compares only the numeric triple", () => {
  expect(isVersionOlder(`${MIN_OPENCODE_VERSION}-beta.1`, MIN_OPENCODE_VERSION)).toBe(false)
  expect(isVersionOlder("2.2.4+build.7", MIN_OPENCODE_VERSION)).toBe(true)
})

test("never warns on a version it cannot parse", () => {
  expect(isVersionOlder("dev", MIN_OPENCODE_VERSION)).toBe(false)
  expect(isVersionOlder("", MIN_OPENCODE_VERSION)).toBe(false)
  expect(isVersionOlder("2.2", MIN_OPENCODE_VERSION)).toBe(false)
})

/** Boots the plugin against a fake context isolated from the real user config. */
async function setupWith(version: string): Promise<string[]> {
  const warnings: string[] = []
  const warn = spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
    warnings.push(args.map(String).join(" "))
  })
  const home = mkdtempSync(join(tmpdir(), "openkit-home-"))
  try {
    const { ctx } = createFakeContext({ home, version })
    const dispose = await plugin.setup(ctx)
    await dispose()
  } finally {
    warn.mockRestore()
  }
  return warnings
}

test("setup warns when the host is older than the floor", async () => {
  const warnings = await setupWith("2.0.0")
  expect(warnings.join("\n")).toContain(`older than the supported ${MIN_OPENCODE_VERSION}`)
})

test("setup stays quiet on a supported host", async () => {
  expect(await setupWith(MIN_OPENCODE_VERSION)).toEqual([])
})
