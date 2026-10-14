import { defineTool, type KitTool } from "../../core/tool"

/**
 * Built-in instruction rules shipped with the tool. The texts live here (not in
 * default settings) so the kit's arrays-replace merge can never drop them.
 */
export const BUILT_IN_RULES = [
  {
    id: "think-in-code",
    text: "Before substantive work, consider available skill descriptions and load the best fit when its workflow meaningfully applies, even if the request doesn't name it. Skip only speculative matches. For current facts, repository state, or requested operations, prefer available tools over memory and use the most specific MCP tool, CLI, or project script before shell; look up the exact tool path and signature rather than guessing. Shape reads and queries to the relevant fields, ranges, matches, or excerpts. When size or structure is unknown, inspect metadata or a small sample first and expand selectively. When a task needs several tool calls whose results you only use to compute one answer — chaining, fan-out, joins, filtering, counting, parsing, aggregation — write one short program (Code Mode, a script, or a CLI pipeline) that returns only the derived value, so the intermediates never enter your context; reserve it for several calls, a single call stays direct. Await every call whose result you use, run independent calls concurrently, and return a small, plain value. Read source directly when semantic understanding is needed; use code to reduce mechanical processing, not judgment.",
  },
  {
    id: "functional-programming",
    text: "Apply functional programming principles where they fit: prefer referentially transparent functions (same inputs give the same outputs, with no hidden mutable state), immutable data, and small functions that take arguments and return new values instead of mutating shared state, keeping side effects (I/O, mutation, time, randomness) at the edges. Apply this judiciously — where the language, codebase, or problem is idiomatic otherwise (for example UI code or stateful performance-critical loops), follow the idiomatic approach instead of forcing functional constructs that don't fit.",
  },
  {
    id: "decomposition",
    text: "Before executing a non-trivial task, break it into small, independent pieces, each with a single responsibility and explicit inputs and outputs. A piece is well-formed when it can be understood, implemented, and verified without reading the others; if two parts must change together, they are one piece. Map how the pieces depend on each other — a graph, not a linear list of steps — so what must wait and what can run in parallel is clear; the ready pieces can proceed in parallel. For trivial or strictly sequential work, skip this and act directly.",
  },
  {
    id: "subagent-driven",
    text: "Keep your context small and linear — an index of consolidated, validated results, not a workspace. You are the orchestrator: dispatch subagents in the background where the environment supports it, so you stay free to receive new input and are not stuck waiting on any single one. Delegate exploration, research, data-heavy analysis, and independent implementation or validation to subagents, and require each to hand back only its distilled conclusion. Fan out the independent pieces of your dependency graph (the decomposition rule) as parallel subagents, then fan in: consolidate their results, verify them against the goal, and keep only what matters. Never pull raw exploration, logs, or transcripts into your own context — that is the subagent's job. You still own the goal and the final result; don't delegate trivial, sequential, or overlapping work.",
  },
  {
    id: "careful-changes",
    text: "Before editing, read the relevant code and trace the real flow. Re-read each target immediately before changing it, keep edits scoped to the request, and preserve unrelated or concurrent work. Treat review feedback as a claim to verify against current, reachable behavior; apply, adapt, or reject it with a technical reason. Keep repository content out of public paste services.",
  },
] as const

/** Stable identifiers of the built-in rules. */
export type RuleId = (typeof BUILT_IN_RULES)[number]["id"]

/** Settings accepted by the `context-injections` tool. */
export interface ContextInjectionsSettings {
  /** Per-rule toggles; omitted rules keep their default (on). Deep-merged. */
  rules: Record<RuleId, boolean>
  /** Additional instructions appended after the enabled built-ins. */
  extra: string[]
}

/**
 * Injects instruction rules into the model's system prompt on every model
 * request (the `context` session hook). Built-in rules ship with the tool and
 * can be toggled individually; `extra` appends user instructions after them.
 * With no enabled rules and no extra instructions, no hook is registered.
 */
export const contextInjections: KitTool<ContextInjectionsSettings> = defineTool<ContextInjectionsSettings>({
  id: "context-injections",
  name: "Context Injections",
  description: "Injects built-in behavioral rules, plus your own, into the system prompt.",
  defaultEnabled: false,
  defaultSettings: {
    rules: {
      "think-in-code": true,
      "functional-programming": true,
      decomposition: true,
      "subagent-driven": true,
      "careful-changes": true,
    },
    extra: [],
  },
  settingsSchema: {
    type: "object",
    properties: {
      rules: {
        type: "object",
        properties: {
          "think-in-code": { type: "boolean" },
          "functional-programming": { type: "boolean" },
          decomposition: { type: "boolean" },
          "subagent-driven": { type: "boolean" },
          "careful-changes": { type: "boolean" },
        },
        additionalProperties: false,
      },
      extra: { type: "array", items: { type: "string" } },
    },
    additionalProperties: false,
  },
  register(_ctx, settings, kit) {
    const blocks = [
      ...BUILT_IN_RULES.filter((rule) => settings.rules[rule.id] !== false).map((rule) => rule.text),
      ...settings.extra.map((text) => text.trim()).filter((text) => text.length > 0),
    ]
    if (blocks.length === 0) return
    return kit.on("context", (event) => {
      const system = (event as { system?: Array<{ type: string; text: string }> }).system
      if (!Array.isArray(system)) return
      for (const text of blocks) system.push({ type: "text", text })
    })
  },
})
