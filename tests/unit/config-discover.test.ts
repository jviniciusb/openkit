import { expect, test } from "bun:test"
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { discoverKitConfigFiles } from "../../src/config/discover"

test("includes global then project ancestors farthest->nearest", () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const root = join(home, "proj")
  const child = join(root, "pkg")
  mkdirSync(child, { recursive: true })
  const globalDir = join(home, ".config", "opencode")
  mkdirSync(globalDir, { recursive: true })
  writeFileSync(join(globalDir, "opencode-kit.jsonc"), "{}")
  mkdirSync(join(root, ".opencode"), { recursive: true })
  writeFileSync(join(root, ".opencode", "opencode-kit.jsonc"), "{}")
  const files = discoverKitConfigFiles(child, home)
  expect(files[0]).toBe(join(globalDir, "opencode-kit.jsonc"))
  expect(files[files.length - 1]).toBe(join(root, ".opencode", "opencode-kit.jsonc"))
})
