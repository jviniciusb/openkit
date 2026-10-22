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

/** Payload OpenCode V2 passes to a slash command's `execute`. */
interface KitCommandInput {
  /** Text entered after the command name. */
  prompt?: { text?: string }
  /** Session that invoked the command; used to route output back to it. */
  sessionID?: string
}

/**
 * Buffers one command's output and delivers it as a single session message,
 * so a multi-line result (e.g. `/kit list`) is not split into one synthetic
 * message per line. Delivery order: `synthetic` (does not resume the model),
 * then `prompt`, then the injected `stdout` sink.
 */
function outputWriter(
  ctx: KitContext,
  deps: KitCommandDeps,
  sessionID: string | undefined,
): { write(s: string): void; flush(): void } {
  let buffer = ""
  return {
    write(text) {
      buffer += text
    },
    flush() {
      const text = buffer
      buffer = ""
      if (text.length === 0) return
      if (sessionID === undefined) {
        deps.stdout(text)
        return
      }
      const synthetic = ctx.session.synthetic
      const prompt = ctx.session.prompt
      const send =
        typeof synthetic === "function"
          ? () => synthetic.call(ctx.session, { sessionID, text, resume: false })
          : typeof prompt === "function"
            ? () => prompt.call(ctx.session, { sessionID, text })
            : undefined
      if (send === undefined) {
        deps.stdout(text)
        return
      }
      try {
        void Promise.resolve(send()).catch((error) => {
          console.warn("openkit: failed to deliver /kit output", error)
        })
      } catch (error) {
        console.warn("openkit: failed to deliver /kit output", error)
      }
    },
  }
}

/** Help text shown for missing or unknown subcommands. */
const USAGE = [
  "kit list",
  "kit enable <id>",
  "kit disable <id>",
  "kit config get <id> <key>",
  "kit config set <id> <key> <value>",
  "kit config <id> <key> <value>  (alias for config set)",
  "<id> is a tool or skill id; config applies to tools (skills have no settings).",
].join("\n")

/**
 * Registers the `/kit` slash command.
 *
 * Supported forms:
 * - `list` — print every shipped item with its resolved enabled state;
 * - `enable <id>` / `disable <id>` — write `<category>[id].enabled` (tools or
 *   skills) to the global kit config, then reload;
 * - `config get <id> <key>` — print a settings-bearing item's effective
 *   setting as JSON, resolving defaults, discovered config files, and plugin
 *   `options`;
 * - `config set <id> <key> <value>` — write `<category>[id].settings[key]` for a
 *   settings-bearing item (tools) to the global kit config (scalar coercion,
 *   comment-preserving), then reload. Skill ids are rejected: skills have no
 *   settings. The legacy `config <id> <key> <value>` form is an alias for
 *   `config set`.
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
      description: "Manage openkit tools and skills (list, enable, disable, config get/set)",
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
  const [sub, ...rest] = tokenize(input.prompt?.text ?? "")
  const writer = outputWriter(ctx, deps, input.sessionID)
  const opDeps: OperationDeps = {
    cwd: deps.cwd,
    home: deps.home,
    options: ctx.options as KitConfigFile,
    out: writer.write,
    err: writer.write,
    reload: deps.reload,
  }

  try {
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
        if (sub === undefined) {
          await listOperation(categories, opDeps)
        } else {
          writer.write(USAGE)
        }
    }
  } finally {
    writer.flush()
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
