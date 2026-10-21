import { categories } from "../catalog"
import type { KitConfigFile } from "../config/types"
import type { KitContext, Registration } from "../core/context"
import {
  configGetOperation,
  configSetOperation,
  listOperation,
  toggleOperation,
  type OperationDeps,
} from "../operations/index"

/** Injected environment for the `/kit` command (home, cwd, reload, output). */
export interface KitCommandDeps {
  /** Home directory holding the global kit config. */
  home: string
  /** Project directory used to discover project-level config files. */
  cwd: string
  /** Re-bootstraps the kit after a mutation so changes take effect. */
  reload(): Promise<void>
  /** Sink for command output. */
  stdout(s: string): void
}

/** Payload OpenCode passes to a slash command's `execute`. */
interface KitCommandInput {
  arguments?: string
  /** Session that invoked the command; used to route output through `prompt`. */
  sessionID?: string
}

/**
 * Resolves where command output goes: the session's `prompt` channel when the
 * harness exposes one, otherwise the injected `stdout` sink (tests).
 */
function outputWriter(
  ctx: KitContext,
  deps: KitCommandDeps,
  sessionID: string | undefined,
): (s: string) => void {
  const prompt = ctx.session.prompt
  if (typeof prompt === "function" && sessionID !== undefined) {
    return (text) => {
      try {
        void Promise.resolve(prompt.call(ctx.session, { sessionID, text })).catch((error) => {
          console.warn("openkit: failed to deliver /kit output", error)
        })
      } catch (error) {
        console.warn("openkit: failed to deliver /kit output", error)
      }
    }
  }
  return deps.stdout
}

/** Help text shown for missing or unknown subcommands. */
const USAGE = [
  "kit list",
  "kit enable <id>",
  "kit disable <id>",
  "kit config get <id> <key>",
  "kit config set <id> <key> <value>",
  "kit config <id> <key> <value>  (alias for config set)",
  "<id> is a tool, skill, or reference id; config applies to settings-bearing categories (tools and references).",
].join("\n")

/**
 * Registers the `/kit` slash command.
 *
 * Supported forms:
 * - `list` — print every shipped item with its resolved enabled state;
 * - `enable <id>` / `disable <id>` — write `<category>[id].enabled` (tools,
 *   skills, or references) to the global kit config, then reload;
 * - `config get <id> <key>` — print a settings-bearing item's effective
 *   setting as JSON, resolving defaults, discovered config files, and plugin
 *   `options`;
 * - `config set <id> <key> <value>` — write `<category>[id].settings[key]` for a
 *   settings-bearing item (tools and references) to the global kit config
 *   (scalar coercion, comment-preserving), then reload. Skill ids are rejected:
 *   skills have no settings. The legacy `config <id> <key> <value>` form is an
 *   alias for `config set`.
 *
 * Each form delegates to the shared operations so behavior stays in one place;
 * this adapter only owns I/O routing and the `/kit`-specific usage and
 * positional guards.
 *
 * The returned registration disposes the command; the caller owns its lifetime.
 */
export async function registerKitCommand(
  ctx: KitContext,
  deps: KitCommandDeps,
): Promise<Registration> {
  return ctx.command.transform((editor) => {
    editor.add({
      name: "kit",
      description: "Manage openkit tools, skills, and references (list, enable, disable, config get/set)",
      execute: (input: KitCommandInput) => executeKitCommand(input, ctx, deps),
    })
  })
}

/** Splits a slash-command argument string on whitespace, dropping empties. */
function tokenize(raw: string): string[] {
  return raw.trim().length === 0 ? [] : raw.trim().split(/\s+/)
}

/** Dispatches one `/kit` invocation to the shared operations. */
async function executeKitCommand(
  input: KitCommandInput,
  ctx: KitContext,
  deps: KitCommandDeps,
): Promise<void> {
  const [sub, ...rest] = tokenize(input.arguments ?? "")
  const writer = outputWriter(ctx, deps, input.sessionID)
  const opDeps: OperationDeps = {
    cwd: deps.cwd,
    home: deps.home,
    options: ctx.options as KitConfigFile,
    out: writer,
    err: writer,
    reload: deps.reload,
  }

  switch (sub) {
    case "list":
      await listOperation(categories, opDeps)
      return
    case "enable":
      await toggleOperation(categories, opDeps, rest[0], true)
      return
    case "disable":
      await toggleOperation(categories, opDeps, rest[0], false)
      return
    case "config":
      await configure(opDeps, rest)
      return
    default:
      writer(USAGE)
  }
}

/**
 * Dispatches `/kit config [get|set]` to the shared operations.
 *
 * Supports `config get <id> <key>`, `config set <id> <key> <value>`, and the
 * legacy `config <id> <key> <value>` setter. `/kit` keeps its own arity messages
 * (rather than the operation's) so a bare `config` reads as usage error, not as
 * an unknown empty id.
 */
async function configure(deps: OperationDeps, parts: string[]): Promise<void> {
  const [action, ...rest] = parts

  if (action === "get") {
    const [id, key] = rest
    if (id === undefined || key === undefined) {
      deps.out("kit: config get requires <id> <key>")
      return
    }
    await configGetOperation(categories, deps, id, key)
    return
  }

  const [id, key, ...valueParts] = action === "set" ? rest : parts
  if (id === undefined || key === undefined || valueParts.length === 0) {
    deps.out(`kit: config ${action === "set" ? "set " : ""}requires <id> <key> <value>`)
    return
  }

  await configSetOperation(categories, deps, id, key, valueParts)
}
