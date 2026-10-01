import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

const CONFIG_FILE_NAME = "opencode-kit.jsonc"

/** Absolute path of the machine-global kit config file. */
function globalConfigPath(home: string): string {
  return join(home, ".config", "opencode", CONFIG_FILE_NAME)
}

/** Absolute path of the project-level kit config for `directory`. */
function projectConfigPath(directory: string): string {
  return join(directory, ".opencode", CONFIG_FILE_NAME)
}

/**
 * Discovers candidate kit config files, ordered low → high precedence.
 *
 * Returns the global file first, followed by the project-level files that
 * actually exist for `locationDirectory` and each ancestor up to the
 * filesystem root, ordered farthest → nearest so that nearer directories
 * override farther ones.
 *
 * The global path is always returned even when the file is absent (callers may
 * want to create it); `loadKitConfig` skips it when missing.
 */
export function discoverKitConfigFiles(locationDirectory: string, home: string): string[] {
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
  return [globalConfigPath(home), ...projectFiles]
}
