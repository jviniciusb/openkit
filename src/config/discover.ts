import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

const CONFIG_FILE_NAME = "opencode-kit.jsonc"

/** Absolute path of the machine-global kit config file. */
export function globalConfigPath(home: string): string {
  return join(home, ".config", "opencode", CONFIG_FILE_NAME)
}

/** Absolute path of the project-level kit config for `directory`. */
function projectConfigPath(directory: string): string {
  return join(directory, ".opencode", CONFIG_FILE_NAME)
}

/**
 * Discovers existing kit config files, ordered low → high precedence.
 *
 * Returns existing config files, global first then project farthest → nearest;
 * the global file is included only when it exists, symmetric with the
 * project-level files. Project candidates are `<dir>/.opencode/opencode-kit.jsonc`
 * for `locationDirectory` and each ancestor up to the filesystem root, ordered
 * farthest → nearest so that nearer directories override farther ones.
 */
export function discoverKitConfigFiles(locationDirectory: string, home: string): string[] {
  const globalFile = globalConfigPath(home)

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
