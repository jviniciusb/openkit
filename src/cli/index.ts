import { configCommand } from "./commands/config"
import { listCommand, type CliIo } from "./commands/list"
import { toggleCommand } from "./commands/toggle"

export type { CliIo }

/**
 * Entry point for the `opencode-kit` CLI.
 *
 * Dispatches the requested subcommand and returns a process exit code. No
 * process globals are read or written here, so callers (including tests) can
 * drive it with their own `argv` and `io`.
 */
export async function runCli(argv: string[], io: CliIo): Promise<number> {
  const [command, ...rest] = argv

  switch (command) {
    case "list":
      return listCommand(io)
    case "enable":
      return toggleCommand(io, rest[0], true)
    case "disable":
      return toggleCommand(io, rest[0], false)
    case "config":
      return configCommand(io, rest)
    case undefined:
      io.stderr("opencode-kit: missing command")
      return 1
    default:
      io.stderr(`opencode-kit: unknown command "${command}"`)
      return 1
  }
}
