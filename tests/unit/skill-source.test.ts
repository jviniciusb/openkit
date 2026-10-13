import { afterEach, expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import {
  addSource,
  checkGenerated,
  deriveLicense,
  hashFile,
  listSources,
  readGenerated,
  readManifest,
  updateSource,
  writeGenerated,
  writeManifest,
  type GeneratedRecord,
} from "../../scripts/skill-source"

const roots: string[] = []

afterEach(() => {
  while (roots.length) rmSync(roots.pop() as string, { recursive: true, force: true })
})

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "skill-source-"))
  roots.push(root)
  return root
}

function write(repo: string, path: string, content: string | Buffer): void {
  const full = join(repo, path)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, content)
}

function commit(repo: string, message: string): string {
  execFileSync("git", ["add", "-A"], { cwd: repo })
  execFileSync("git", ["-c", "user.email=test@example.com", "-c", "user.name=Test", "commit", "-q", "-m", message], {
    cwd: repo,
  })
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).trim()
}

interface Fixture {
  repo: string
  head: string
}

function initRepo(build: (repo: string) => void): Fixture {
  const repo = tempRoot()
  execFileSync("git", ["init", "-q"], { cwd: repo })
  build(repo)
  const head = commit(repo, "init")
  return { repo, head }
}

const MIT_LICENSE = "MIT License\n\nCopyright (c) 2026 Test\n\nPermission is hereby granted, free of charge...\n"

// ---------------------------------------------------------------------------
// Task 1: manifest + add
// ---------------------------------------------------------------------------

test("manifest round-trips", () => {
  const root = tempRoot()
  const pins = [
    {
      name: "demo",
      repository: "https://example.com/demo.git",
      ref: "v1",
      commit: "abc",
      license: "MIT",
      retrievedAt: "2026-01-01T00:00:00.000Z",
      include: ["skills/a/SKILL.md"],
    },
  ]
  writeManifest(root, pins)
  expect(readManifest(root)).toEqual(pins)
  expect(readManifest(tempRoot())).toEqual([])
})

test("addSource snapshots includes (file + directory), copies LICENSE, and pins", async () => {
  const { repo, head } = initRepo((r) => {
    write(r, "LICENSE", MIT_LICENSE)
    write(r, "skills/foo/SKILL.md", "# foo\n")
    write(r, "skills/bar/one.md", "one\n")
    write(r, "skills/bar/nested/two.md", "two\n")
    write(r, "skills/ignored/SKILL.md", "ignored\n")
  })
  const root = tempRoot()

  const pin = await addSource(root, {
    name: "demo",
    repository: repo,
    ref: head,
    include: ["skills/foo/SKILL.md", "skills/bar"],
  })

  const dir = join(root, "skill-sources", "demo")
  expect(existsSync(join(dir, "LICENSE"))).toBe(true)
  expect(existsSync(join(dir, "skills/foo/SKILL.md"))).toBe(true)
  expect(existsSync(join(dir, "skills/bar/one.md"))).toBe(true)
  expect(existsSync(join(dir, "skills/bar/nested/two.md"))).toBe(true)
  expect(existsSync(join(dir, "skills/ignored/SKILL.md"))).toBe(false)

  expect(pin).toMatchObject({
    name: "demo",
    repository: repo,
    ref: head,
    commit: head,
    license: "MIT",
    include: ["skills/foo/SKILL.md", "skills/bar"],
  })
  expect(typeof pin.retrievedAt).toBe("string")
  expect(readManifest(root)).toEqual([pin])
})

test("addSource records license undefined and warns when LICENSE is absent", async () => {
  const { repo, head } = initRepo((r) => write(r, "skills/a/SKILL.md", "# a\n"))
  const root = tempRoot()
  const warnings: string[] = []
  const originalWarn = console.warn
  console.warn = (...args: unknown[]) => warnings.push(args.join(" "))

  let pin
  try {
    pin = await addSource(root, {
      name: "nol",
      repository: repo,
      ref: head,
      include: ["skills/a/SKILL.md"],
    })
  } finally {
    console.warn = originalWarn
  }

  expect(pin.license).toBeUndefined()
  expect(warnings.length).toBeGreaterThan(0)
  expect(readManifest(root)[0]?.license).toBeUndefined()
})

test("deriveLicense returns undefined for a non-MIT LICENSE", () => {
  const repo = tempRoot()
  write(repo, "LICENSE", "Apache License\nVersion 2.0, January 2004\n")
  expect(deriveLicense(repo)).toBeUndefined()
})

test("addSource fails loudly when an --include path is missing at the ref", async () => {
  const { repo, head } = initRepo((r) => write(r, "skills/a/SKILL.md", "# a\n"))
  const root = tempRoot()
  await expect(
    addSource(root, {
      name: "demo",
      repository: repo,
      ref: head,
      include: ["skills/does-not-exist/SKILL.md"],
    }),
  ).rejects.toThrow(/does-not-exist/)
  expect(existsSync(join(root, "skill-sources", "demo"))).toBe(false)
  expect(readManifest(root)).toEqual([])
})

test("addSource copies a CRLF file byte-faithfully (Review Focus 5)", async () => {
  const crlf = Buffer.from("line one\r\nline two\r\n", "utf8")
  const { repo, head } = initRepo((r) => write(r, "skills/crlf/SKILL.md", crlf))
  const root = tempRoot()

  await addSource(root, {
    name: "demo",
    repository: repo,
    ref: head,
    include: ["skills/crlf/SKILL.md"],
  })

  const copied = readFileSync(join(root, "skill-sources", "demo", "skills/crlf/SKILL.md"))
  expect(copied.equals(crlf)).toBe(true)
})

// ---------------------------------------------------------------------------
// Task 2: update + list + diff
// ---------------------------------------------------------------------------

test("updateSource refreshes the snapshot, advances the pin, and reports the diff", async () => {
  const { repo } = initRepo((r) => {
    write(r, "LICENSE", MIT_LICENSE)
    write(r, "skills/a/SKILL.md", "a v1\n")
    write(r, "skills/b/SKILL.md", "b v1\n")
  })
  const root = tempRoot()
  const first = await addSource(root, {
    name: "demo",
    repository: repo,
    ref: "HEAD",
    include: ["skills"],
  })

  write(repo, "skills/a/SKILL.md", "a v2\n")
  write(repo, "skills/c/SKILL.md", "c v1\n")
  rmSync(join(repo, "skills/b/SKILL.md"))
  const second = commit(repo, "change")
  expect(second).not.toBe(first.commit)

  const diff = await updateSource(root, "demo")

  expect(diff.added).toEqual(["demo/skills/c/SKILL.md"])
  expect(diff.changed).toEqual(["demo/skills/a/SKILL.md"])
  expect(diff.removed).toEqual(["demo/skills/b/SKILL.md"])

  const dir = join(root, "skill-sources", "demo")
  expect(readFileSync(join(dir, "skills/a/SKILL.md"), "utf8")).toBe("a v2\n")
  expect(existsSync(join(dir, "skills/c/SKILL.md"))).toBe(true)
  expect(existsSync(join(dir, "skills/b/SKILL.md"))).toBe(false)

  const pin = listSources(root)[0]
  expect(pin?.commit).toBe(second)
  expect(pin?.commit).not.toBe(first.commit)
})

test("updateSource throws when an --include path vanished at the new ref (Review Focus 1)", async () => {
  const { repo } = initRepo((r) => {
    write(r, "skills/a/SKILL.md", "a\n")
    write(r, "skills/temp/SKILL.md", "temp\n")
  })
  const root = tempRoot()
  await addSource(root, {
    name: "demo",
    repository: repo,
    ref: "HEAD",
    include: ["skills/a/SKILL.md", "skills/temp/SKILL.md"],
  })

  rmSync(join(repo, "skills/temp"), { recursive: true, force: true })
  commit(repo, "drop temp")

  await expect(updateSource(root, "demo")).rejects.toThrow(/skills\/temp/)
  // existing snapshot and pin are left untouched on failure
  expect(existsSync(join(root, "skill-sources", "demo", "skills/temp/SKILL.md"))).toBe(true)
})

test("listSources reads what addSource wrote", async () => {
  const { repo, head } = initRepo((r) => write(r, "skills/a/SKILL.md", "a\n"))
  const root = tempRoot()
  const pin = await addSource(root, {
    name: "demo",
    repository: repo,
    ref: head,
    include: ["skills/a/SKILL.md"],
  })
  expect(listSources(root)).toEqual([pin])
})

// ---------------------------------------------------------------------------
// Task 3: check + generated provenance
// ---------------------------------------------------------------------------

test("checkGenerated reports clean, edited, and missing (Review Focus 3)", () => {
  const root = tempRoot()
  const clean = join(root, "src/skills/clean/SKILL.md")
  const edited = join(root, "src/skills/edited/SKILL.md")
  mkdirSync(dirname(clean), { recursive: true })
  mkdirSync(dirname(edited), { recursive: true })
  writeFileSync(clean, "clean body\n")
  writeFileSync(edited, "original\n")

  const records: GeneratedRecord[] = [
    {
      brief: "skill-sources/briefs/clean.md",
      sources: [{ name: "demo", path: "skills/a/SKILL.md", commit: "abc" }],
      output: "src/skills/clean/SKILL.md",
      outputHash: hashFile(clean),
      generatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      brief: "skill-sources/briefs/edited.md",
      sources: [],
      output: "src/skills/edited/SKILL.md",
      outputHash: hashFile(edited),
      generatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      brief: "skill-sources/briefs/gone.md",
      sources: [],
      output: "src/skills/gone/SKILL.md",
      outputHash: hashFile(clean),
      generatedAt: "2026-01-01T00:00:00.000Z",
    },
  ]
  writeGenerated(root, records)
  expect(readGenerated(root)).toEqual(records)

  expect(checkGenerated(root).map((s) => s.status)).toEqual(["clean", "clean", "missing"])

  writeFileSync(edited, "hand edited\n")
  expect(checkGenerated(root).map((s) => s.status)).toEqual(["clean", "edited", "missing"])

  rmSync(clean)
  expect(checkGenerated(root).map((s) => s.status)).toEqual(["missing", "edited", "missing"])
})
