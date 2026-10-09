import { categories } from "../../catalog"
import { readPluginOptions } from "../../config/effective"
import { listOperation, type OperationDeps } from "../../operations/index"

/** Filesystem and stream handles the CLI needs, injected for testability. */
export interface CliIo {
  /** Directory used to discover project-level config files. */
  cwd: string
  /** Home directory used to discover the global config file. */
  home: string
  stdout(s: string): void
  stderr(s: string): void
}

/**
 * Builds the shared operation environment from the CLI's injected I/O.
 *
 * The CLI has no live plugin context, so the highest-precedence layer is
 * re-read from `opencode.json` on disk; the CLI never re-bootstraps the kit, so
 * no `reload` is supplied.
 */
export function cliOperationDeps(io: CliIo): OperationDeps {
  return {
    cwd: io.cwd,
    home: io.home,
    options: readPluginOptions(io.cwd, io.home),
    out: io.stdout,
    err: io.stderr,
  }
}

/**
 * Prints every shipped item with its resolved enabled state.
 *
 * Delegates to `listOperation`, which discovers config files from `io.cwd` and
 * `io.home`, loads them low → high precedence, and prints a `<label>:` section
 * per non-empty category followed by one
 * `<id>\t<enabled|disabled>\t<description>` line per item.
 */
export async function listCommand(io: CliIo): Promise<number> {
  const result = await listOperation(categories, cliOperationDeps(io))
  return result.exitCode
}
