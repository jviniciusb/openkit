// Dev-only maintainer tool: vendor external agent-skill sources into
// `skill-sources/`, pin them at exact commits, and report drift.
//
// This script is NOT shipped (see package.json `files`). It must stay
// standalone: it may use node builtins but must never import from `src/`.
//
// Invocation:
//   bun scripts/skill-source.ts add <name> <git-url> --ref <ref> --include <path> [--include ...]
//   bun scripts/skill-source.ts update [<name>] [--ref <ref>]
//   bun scripts/skill-source.ts list
//   bun scripts/skill-source.ts check

import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, relative, resolve } from "node:path"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SourceSpec {
  name: string
  repository: string
  ref: string
  include: string[]
}

export interface SourcePin {
  name: string
  repository: string
  ref: string
  commit: string
  license?: string
  retrievedAt: string
  include: string[]
}

export interface SourceDiff {
  added: string[]
  changed: string[]
  removed: string[]
}

export interface GeneratedRecord {
  brief: string
  sources: Array<{ name: string; path: string; commit: string }>
  output: string
  outputHash: string
  generatedAt: string
}

export type GeneratedState = "clean" | "missing" | "edited"

export interface GeneratedStatus {
  output: string
  status: GeneratedState
  expected?: string
  actual?: string
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

export function skillSourcesDir(root: string): string {
  return join(root, "skill-sources")
}

export function manifestPath(root: string): string {
  return join(skillSourcesDir(root), "sources.json")
}

export function generatedPath(root: string): string {
  return join(skillSourcesDir(root), "generated.json")
}

// ---------------------------------------------------------------------------
// Manifest (sources.json)
// ---------------------------------------------------------------------------

export function readManifest(root: string): SourcePin[] {
  const path = manifestPath(root)
  if (!existsSync(path)) return []
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"))
  if (!Array.isArray(parsed)) {
    throw new Error(`sources.json must contain an array: ${path}`)
  }
  return parsed as SourcePin[]
}

export function writeManifest(root: string, pins: SourcePin[]): void {
  mkdirSync(skillSourcesDir(root), { recursive: true })
  writeFileSync(manifestPath(root), `${JSON.stringify(pins, null, 2)}\n`)
}

// ---------------------------------------------------------------------------
// Generated provenance (generated.json)
// ---------------------------------------------------------------------------

export function readGenerated(root: string): GeneratedRecord[] {
  const path = generatedPath(root)
  if (!existsSync(path)) return []
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"))
  if (!Array.isArray(parsed)) {
    throw new Error(`generated.json must contain an array: ${path}`)
  }
  return parsed as GeneratedRecord[]
}

export function writeGenerated(root: string, records: GeneratedRecord[]): void {
  mkdirSync(skillSourcesDir(root), { recursive: true })
  writeFileSync(generatedPath(root), `${JSON.stringify(records, null, 2)}\n`)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function hashFile(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex")
}

function git(args: string[], cwd?: string): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim()
}

function assertSafeInclude(include: string): void {
  if (include.length === 0) throw new Error("--include path must not be empty")
  if (include.startsWith("/") || /^[A-Za-z]:[\\/]/.test(include)) {
    throw new Error(`--include must be upstream-relative, got absolute: ${include}`)
  }
  const parts = include.split(/[\\/]/)
  if (parts.some((p) => p === "..")) {
    throw new Error(`--include must not escape the repo root: ${include}`)
  }
}

function assertIncludeExists(cloneDir: string, include: string): void {
  const source = join(cloneDir, include)
  if (!existsSync(source)) {
    throw new Error(
      `include path "${include}" does not exist at the requested ref (looked in ${source})`,
    )
  }
}

export function deriveLicense(cloneDir: string): string | undefined {
  const licensePath = join(cloneDir, "LICENSE")
  if (!existsSync(licensePath)) {
    console.warn(`no LICENSE found at ${licensePath}; recording license: undefined`)
    return undefined
  }
  const text = readFileSync(licensePath, "utf8")
  if (/MIT License/i.test(text) || text.includes("Permission is hereby granted, free of charge")) {
    return "MIT"
  }
  return undefined
}

interface FileMap {
  [relativePath: string]: string
}

function snapshotFileMap(dir: string): FileMap {
  const map: FileMap = {}
  if (!existsSync(dir)) return map
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (entry.isFile()) {
        map[relative(dir, full).split("\\").join("/")] = hashFile(full)
      }
    }
  }
  walk(dir)
  return map
}

function diffFileMaps(before: FileMap, after: FileMap): SourceDiff {
  const added: string[] = []
  const changed: string[] = []
  const removed: string[] = []
  for (const key of Object.keys(after)) {
    if (!(key in before)) added.push(key)
    else if (before[key] !== after[key]) changed.push(key)
  }
  for (const key of Object.keys(before)) {
    if (!(key in after)) removed.push(key)
  }
  return { added: added.sort(), changed: changed.sort(), removed: removed.sort() }
}

function cloneAt(repository: string, ref: string, destParent: string): string {
  const cloneDir = mkdtempSync(join(destParent, "clone-"))
  git(["clone", "--quiet", repository, cloneDir])
  git(["checkout", "--quiet", ref], cloneDir)
  return cloneDir
}

/**
 * Copy the included paths (and LICENSE, when present) into a staging dir using
 * their upstream-relative paths, then swap the staging dir into place.
 * Returns the freshly materialized snapshot dir.
 */
function materializeSnapshot(
  cloneDir: string,
  name: string,
  include: string[],
  sourcesDir: string,
): { snapshotDir: string; fileMap: FileMap } {
  const stagingDir = join(sourcesDir, `.${name}.staging`)
  rmSync(stagingDir, { recursive: true, force: true })
  mkdirSync(stagingDir, { recursive: true })

  const seenLicense = include.includes("LICENSE")
  for (const entry of include) {
    assertSafeInclude(entry)
    assertIncludeExists(cloneDir, entry)
    const source = join(cloneDir, entry)
    const dest = join(stagingDir, entry)
    mkdirSync(dirname(dest), { recursive: true })
    cpSync(source, dest, { recursive: true })
  }

  if (!seenLicense && existsSync(join(cloneDir, "LICENSE"))) {
    cpSync(join(cloneDir, "LICENSE"), join(stagingDir, "LICENSE"))
  }

  const snapshotDir = join(sourcesDir, name)
  rmSync(snapshotDir, { recursive: true, force: true })
  renameSync(stagingDir, snapshotDir)
  return { snapshotDir, fileMap: snapshotFileMap(snapshotDir) }
}

// ---------------------------------------------------------------------------
// add
// ---------------------------------------------------------------------------

export async function addSource(root: string, spec: SourceSpec): Promise<SourcePin> {
  const sourcesDir = skillSourcesDir(root)
  mkdirSync(sourcesDir, { recursive: true })
  const tmp = mkdtempSync(join(tmpdir(), "skill-source-"))
  try {
    const cloneDir = cloneAt(spec.repository, spec.ref, tmp)
    const commit = git(["rev-parse", "HEAD"], cloneDir)
    const license = deriveLicense(cloneDir)
    materializeSnapshot(cloneDir, spec.name, spec.include, sourcesDir)

    const pin: SourcePin = {
      name: spec.name,
      repository: spec.repository,
      ref: spec.ref,
      commit,
      license,
      retrievedAt: new Date().toISOString(),
      include: [...spec.include],
    }
    const pins = readManifest(root).filter((p) => p.name !== spec.name)
    pins.push(pin)
    writeManifest(root, pins)
    return pin
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

// ---------------------------------------------------------------------------
// update + list
// ---------------------------------------------------------------------------

export async function updateSource(
  root: string,
  name?: string,
  ref?: string,
): Promise<SourceDiff> {
  const pins = readManifest(root)
  const targets = name ? pins.filter((p) => p.name === name) : pins
  if (name && targets.length === 0) {
    throw new Error(`unknown source: ${name}`)
  }

  const aggregate: SourceDiff = { added: [], changed: [], removed: [] }
  const updated: SourcePin[] = []

  for (const pin of targets) {
    const sourcesDir = skillSourcesDir(root)
    const snapshotDir = join(sourcesDir, pin.name)
    const before = snapshotFileMap(snapshotDir)

    const nextRef = ref ?? pin.ref
    const tmp = mkdtempSync(join(tmpdir(), "skill-source-"))
    try {
      const cloneDir = cloneAt(pin.repository, nextRef, tmp)
      const commit = git(["rev-parse", "HEAD"], cloneDir)
      const license = deriveLicense(cloneDir)
      const { fileMap: after } = materializeSnapshot(cloneDir, pin.name, pin.include, sourcesDir)
      const diff = diffFileMaps(before, after)
      aggregate.added.push(...diff.added.map((p) => `${pin.name}/${p}`))
      aggregate.changed.push(...diff.changed.map((p) => `${pin.name}/${p}`))
      aggregate.removed.push(...diff.removed.map((p) => `${pin.name}/${p}`))
      updated.push({
        ...pin,
        ref: nextRef,
        commit,
        license,
        retrievedAt: new Date().toISOString(),
      })
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  }

  const byName = new Map(updated.map((p) => [p.name, p]))
  writeManifest(
    root,
    pins.map((p) => byName.get(p.name) ?? p),
  )
  return aggregate
}

export function listSources(root: string): SourcePin[] {
  return readManifest(root)
}

// ---------------------------------------------------------------------------
// check
// ---------------------------------------------------------------------------

export function checkGenerated(root: string): GeneratedStatus[] {
  return readGenerated(root).map((record) => {
    const outputPath = resolve(root, record.output)
    if (!existsSync(outputPath)) {
      return { output: record.output, status: "missing", expected: record.outputHash }
    }
    const actual = hashFile(outputPath)
    if (actual === record.outputHash) {
      return { output: record.output, status: "clean", expected: record.outputHash, actual }
    }
    return { output: record.output, status: "edited", expected: record.outputHash, actual }
  })
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseFlagList(args: string[], flag: string): string[] {
  const values: string[] = []
  for (let i = 0; i < args.length; i++) {
    if (args[i] === flag && args[i + 1] !== undefined) values.push(args[i + 1] as string)
  }
  return values
}

function parseFlag(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag)
  return index >= 0 ? args[index + 1] : undefined
}

async function runCli(argv: string[], root: string): Promise<number> {
  const command = argv[0]
  const rest = argv.slice(1)

  switch (command) {
    case "add": {
      const name = rest.find((a) => !a.startsWith("--"))
      const repository = rest.filter((a) => !a.startsWith("--"))[1]
      const ref = parseFlag(rest, "--ref")
      const include = parseFlagList(rest, "--include")
      if (!name || !repository || !ref || include.length === 0) {
        console.error(
          "usage: skill-source add <name> <git-url> --ref <ref> --include <path> [--include ...]",
        )
        return 1
      }
      const pin = await addSource(root, { name, repository, ref, include })
      console.log(`added ${pin.name} @ ${pin.commit.slice(0, 12)} (${pin.license ?? "unknown"})`)
      return 0
    }
    case "update": {
      const name = rest.find((a) => !a.startsWith("--"))
      const ref = parseFlag(rest, "--ref")
      const diff = await updateSource(root, name, ref)
      printDiff(diff)
      return 0
    }
    case "list": {
      for (const pin of listSources(root)) {
        console.log(
          `${pin.name}\t${pin.ref}\t${pin.commit}\t${pin.license ?? "-"}\t${pin.include.join(",")}`,
        )
      }
      return 0
    }
    case "check": {
      let worst = 0
      for (const status of checkGenerated(root)) {
        if (status.status !== "clean") worst = 1
        console.log(`${status.status}\t${status.output}`)
      }
      return worst
    }
    default:
      console.error("usage: skill-source <add|update|list|check> ...")
      return 1
  }
}

function printDiff(diff: SourceDiff): void {
  const parts: string[] = []
  if (diff.added.length) parts.push(`added: ${diff.added.join(", ")}`)
  if (diff.changed.length) parts.push(`changed: ${diff.changed.join(", ")}`)
  if (diff.removed.length) parts.push(`removed: ${diff.removed.join(", ")}`)
  console.log(parts.length ? parts.join("\n") : "no changes")
}

if (import.meta.main) {
  runCli(process.argv.slice(2), process.cwd())
    .then((code) => {
      process.exitCode = code
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error))
      process.exitCode = 1
    })
}
