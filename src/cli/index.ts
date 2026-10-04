import { listCommand, type CliIo } from "./commands/list"

export type { CliIo }

/**
 * Entry point for the `opencode-kit` CLI.
 *
 * Dispatches the requested subcommand and returns a process exit code. No
 * process globals are read or written here, so callers (including tests) can
 * drive it with their own `argv` and `io`.
 */
export async function runCli(argv: string[], io: CliIo): Promise<number> {
  const [command] = argv

  switch (command) {
    case "list":
      return listCommand(io)
    case undefined:
      io.stderr("opencode-kit: missing command")
      return 1
    default:
      io.stderr(`opencode-kit: unknown command "${command}"`)
      return 1
  }
}
