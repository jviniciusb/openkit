import { expect, test } from "bun:test"
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  discoverKitConfigFiles,
  globalConfigDir,
  globalConfigPath,
  globalOpencodePath,
  globalOpencodePaths,
  opencodeConfigPaths,
} from "../../src/config/discover"

test("includes global then project ancestors farthest->nearest", () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const root = join(home, "proj")
  const child = join(root, "pkg")
  mkdirSync(child, { recursive: true })
  const globalDir = join(home, ".config", "opencode")
  mkdirSync(globalDir, { recursive: true })
  writeFileSync(join(globalDir, "openkit.jsonc"), "{}")
  mkdirSync(join(root, ".opencode"), { recursive: true })
  writeFileSync(join(root, ".opencode", "openkit.jsonc"), "{}")
  const files = discoverKitConfigFiles(child, home)
  expect(files[0]).toBe(join(globalDir, "openkit.jsonc"))
  expect(files[files.length - 1]).toBe(join(root, ".opencode", "openkit.jsonc"))
})

test("omits the global path when it does not exist", () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const root = join(home, "proj")
  mkdirSync(join(root, ".opencode"), { recursive: true })
  writeFileSync(join(root, ".opencode", "openkit.jsonc"), "{}")
  const files = discoverKitConfigFiles(root, home)
  expect(files).toEqual([join(root, ".opencode", "openkit.jsonc")])
})

test("globalConfigDir honors XDG_CONFIG_HOME and falls back without it", () => {
  expect(globalConfigDir({ XDG_CONFIG_HOME: "/xdg" }, "/home/u")).toBe(join("/xdg", "opencode"))
  expect(globalConfigDir({}, "/home/u")).toBe(join("/home/u", ".config", "opencode"))
  // An empty XDG_CONFIG_HOME is treated as unset.
  expect(globalConfigDir({ XDG_CONFIG_HOME: "" }, "/home/u")).toBe(
    join("/home/u", ".config", "opencode"),
  )
})

test("globalConfigPath and globalOpencodePath follow XDG_CONFIG_HOME", () => {
  const withXdg = { XDG_CONFIG_HOME: "/xdg" }
  expect(globalConfigPath("/home/u", withXdg)).toBe(
    join("/xdg", "opencode", "openkit.jsonc"),
  )
  expect(globalOpencodePath("/home/u", withXdg)).toBe(join("/xdg", "opencode", "opencode.json"))

  expect(globalConfigPath("/home/u", {})).toBe(
    join("/home/u", ".config", "opencode", "openkit.jsonc"),
  )
  expect(globalOpencodePath("/home/u", {})).toBe(
    join("/home/u", ".config", "opencode", "opencode.json"),
  )
})

test("opencodeConfigPaths and globalOpencodePaths cover both .json and .jsonc", () => {
  expect(opencodeConfigPaths("/proj")).toEqual([
    join("/proj", "opencode.json"),
    join("/proj", "opencode.jsonc"),
  ])
  expect(globalOpencodePaths("/home/u", { XDG_CONFIG_HOME: "/xdg" })).toEqual([
    join("/xdg", "opencode", "opencode.json"),
    join("/xdg", "opencode", "opencode.jsonc"),
  ])
})

test("discoverKitConfigFiles honors XDG_CONFIG_HOME", () => {
  const home = mkdtempSync(join(tmpdir(), "home-"))
  const xdg = mkdtempSync(join(tmpdir(), "xdg-"))
  mkdirSync(join(xdg, "opencode"), { recursive: true })
  writeFileSync(join(xdg, "opencode", "openkit.jsonc"), "{}")
  const files = discoverKitConfigFiles(home, home, { XDG_CONFIG_HOME: xdg })
  expect(files[0]).toBe(join(xdg, "opencode", "openkit.jsonc"))
})
