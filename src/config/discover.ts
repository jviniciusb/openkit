import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

const CONFIG_FILE_NAME = "openkit.jsonc"

/** OpenCode's own config file names; both are accepted, JSONC last. */
const OPENCODE_FILE_NAMES = ["opencode.json", "opencode.jsonc"] as const

/** Environment lookup used to honor `XDG_CONFIG_HOME`. */
export interface Env {
  [key: string]: string | undefined
  XDG_CONFIG_HOME?: string
}

/**
 * Absolute path of the machine-global OpenCode config directory.
 *
 * Honors `XDG_CONFIG_HOME` when set (non-empty), matching OpenCode and other
 * XDG-aware tools; otherwise falls back to `~/.config/opencode`.
 */
export function globalConfigDir(env: Env, home: string): string {
  const xdg = env.XDG_CONFIG_HOME
  return xdg !== undefined && xdg.length > 0 ? join(xdg, "opencode") : join(home, ".config", "opencode")
}

/** Absolute path of the machine-global kit config file. */
export function globalConfigPath(home: string, env: Env = process.env): string {
  return join(globalConfigDir(env, home), CONFIG_FILE_NAME)
}

/** Absolute path of the machine-global OpenCode config (`opencode.json`). */
export function globalOpencodePath(home: string, env: Env = process.env): string {
  return join(globalConfigDir(env, home), "opencode.json")
}

/** Candidate OpenCode config paths in `directory` (`.json` and `.jsonc`). */
export function opencodeConfigPaths(directory: string): string[] {
  return OPENCODE_FILE_NAMES.map((name) => join(directory, name))
}

/** Candidate machine-global OpenCode config paths (`.json` and `.jsonc`). */
export function globalOpencodePaths(home: string, env: Env = process.env): string[] {
  return opencodeConfigPaths(globalConfigDir(env, home))
}

/** Absolute path of the project-level kit config for `directory`. */
export function projectConfigPath(directory: string): string {
  return join(directory, ".opencode", CONFIG_FILE_NAME)
}

/**
 * Discovers existing kit config files, ordered low → high precedence.
 *
 * Returns existing config files, global first then project farthest → nearest;
 * the global file is included only when it exists, symmetric with the
 * project-level files. Project candidates are `<dir>/.opencode/openkit.jsonc`
 * for `locationDirectory` and each ancestor up to the filesystem root, ordered
 * farthest → nearest so that nearer directories override farther ones.
 */
export function discoverKitConfigFiles(
  locationDirectory: string,
  home: string,
  env: Env = process.env,
): string[] {
  const globalFile = globalConfigPath(home, env)

  const ancestors: string[] = []
  let current = resolve(locationDirectory)

  for (;;) {
    ancestors.push(current)
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }

  const projectFiles = ancestors
    .reverse()
    .map(projectConfigPath)
    .filter((candidate) => existsSync(candidate))

  return existsSync(globalFile) ? [globalFile, ...projectFiles] : projectFiles
}
