import { configCommand } from "./commands/config"
import { doctorCommand, versionCommand } from "./commands/doctor"
import { initCommand } from "./commands/init"
import { listCommand, type CliIo } from "./commands/list"
import { newCommand } from "./commands/new"
import { newSkillCommand } from "./commands/new-skill"
import { toggleCommand } from "./commands/toggle"

export type { CliIo }

/**
 * Entry point for the `openkit` CLI.
 *
 * Dispatches the requested subcommand and returns a process exit code. No
 * process globals are read or written here, so callers (including tests) can
 * drive it with their own `argv` and `io`. Errors thrown by a command (e.g. a
 * config file we must not overwrite) are reported on stderr and turned into a
 * non-zero exit code instead of escaping as an unhandled rejection.
 */
export async function runCli(argv: string[], io: CliIo): Promise<number> {
  try {
    return await dispatch(argv, io)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    io.stderr(`openkit: ${message}`)
    return 1
  }
}

/** Selects and runs the requested subcommand. */
async function dispatch(argv: string[], io: CliIo): Promise<number> {
  const [command, ...rest] = argv

  switch (command) {
    case "init":
      return initCommand(io, { project: rest.includes("--project") })
    case "doctor":
      return doctorCommand(io)
    case "version":
      return versionCommand(io)
    case "list":
      return listCommand(io)
    case "new":
      return newCommand(io, rest)
    case "new-skill":
      return newSkillCommand(io, rest[0])
    case "enable":
      return toggleCommand(io, rest[0], true)
    case "disable":
      return toggleCommand(io, rest[0], false)
    case "config":
      return configCommand(io, rest)
    case undefined:
      io.stderr("openkit: missing command")
      return 1
    default:
      io.stderr(`openkit: unknown command "${command}"`)
      return 1
  }
}
