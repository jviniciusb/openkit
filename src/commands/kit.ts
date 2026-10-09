import { categories } from "../catalog"
import type { KitConfigFile } from "../config/types"
import type { KitContext, Registration } from "../core/context"
import {
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
 * harness exposes one, otherwise the injected `stdout` sink (CLI/tests).
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
          console.warn("opencode-kit: failed to deliver /kit output", error)
        })
      } catch (error) {
        console.warn("opencode-kit: failed to deliver /kit output", error)
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
  "kit config <id> <key> <value>",
  "<id> is a tool or skill id; config applies to tools only.",
].join("\n")

/**
 * Registers the `/kit` slash command.
 *
 * Supported forms:
 * - `list` — print every shipped tool with its resolved enabled state;
 * - `enable <id>` / `disable <id>` — write `tools[id].enabled` (or, for a
 *   shipped skill id, `skills[id].enabled`) to the global kit config, then
 *   reload;
 * - `config <id> <key> <value>` — write `tools[id].settings[key]` to the global
 *   kit config (scalar coercion, comment-preserving), then reload. Skill ids
 *   are rejected: skills have no settings.
 *
 * Each form delegates to the shared operations so `/kit` and the CLI never
 * diverge; this adapter only owns I/O routing and the `/kit`-specific usage and
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
      description: "Manage opencode-kit tools and skills (list, enable, disable, config)",
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
 * Guards `/kit`'s positional `config` form, then delegates to the shared
 * setter.
 *
 * `/kit` keeps its own arity message (rather than the operation's) so a bare
 * `config` reads as usage error, not as an unknown empty id.
 */
async function configure(deps: OperationDeps, parts: string[]): Promise<void> {
  const [toolId, key, ...valueParts] = parts

  if (toolId === undefined || key === undefined || valueParts.length === 0) {
    deps.out("kit: config requires <id> <key> <value>")
    return
  }

  await configSetOperation(categories, deps, toolId, key, valueParts)
}
