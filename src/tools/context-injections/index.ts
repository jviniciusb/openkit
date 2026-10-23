import { defineTool, type KitTool } from "../../core/tool"

/**
 * Built-in instruction rules shipped with the tool. The texts live here (not in
 * default settings) so the kit's arrays-replace merge can never drop them.
 */
export const BUILT_IN_RULES = [
  {
    id: "proactive",
    text: "Act proactively. When the next step is clear and no gate or instruction says to stop, continue without pausing to confirm. When it is not clear, settle the facts yourself without crossing a gate — research, explore, build a throwaway prototype, or dispatch a subagent. Ask about choices that materially affect behavior, scope, risk, or a decision the user owns; for low-impact, reversible details, choose a sensible default and state the assumption. Act only on high-confidence evidence, and say plainly when you lack it.",
  },
  {
    id: "think-in-code",
    text: "Before substantive work, consider available skill descriptions and load the best fit when its workflow meaningfully applies, even if the request doesn't name it; skip only speculative matches. For current facts, repository state, or requested operations, prefer available tools over memory, using the most specific MCP tool, CLI, or project script before shell, and look up the exact tool path and signature. Shape reads and queries to the relevant fields, ranges, matches, or excerpts; when size or structure is unknown, inspect metadata or a small sample first. When several tool calls feed one answer, write one short program (Code Mode, script, or CLI pipeline) that returns only the derived value and keeps intermediates out of context; a single call stays direct. Await every call whose result you use, run independent calls concurrently, and return a small, plain value. Read source directly when semantic understanding is needed; use code to reduce mechanical processing, not judgment.",
  },
  {
    id: "functional-programming",
    text: "Apply functional programming where it fits: pure, referentially transparent functions, immutable data, and small functions that return new values instead of mutating shared state; keep side effects at the edges. Where the language, codebase, or problem is idiomatic otherwise — UI code, performance-critical stateful loops — follow the idiom rather than forcing functional constructs that don't fit.",
  },
  {
    id: "decomposition",
    text: "Before a non-trivial task, break it into small, independent pieces, each with one responsibility and explicit inputs and outputs. A piece is well-formed when it can be understood, implemented, and verified without reading the others; if two parts must change together, they are one piece. Map dependencies as a graph, not a list. Actively look for worthwhile safe parallelism rather than defaulting to serial work. Identify which independent pieces are ready; keep dependent or shared-state work together, and never cross an approval gate. For trivial or strictly sequential work, act directly.",
  },
  {
    id: "subagent-driven",
    text: "Keep your context small and linear — an index of consolidated, validated results, not a workspace. You are the orchestrator: delegate independent, substantive exploration, research, data-heavy analysis, implementation, or validation to background subagents where supported, so you stay free to receive new input and are not stuck waiting. When choosing a delegate, consider available OpenCode- and project-defined agent descriptions and prefer the agent whose specialization best fits the piece; use a general-purpose agent when no clear match is available. Use concurrent tool calls instead for bounded queries. Delegate only work that can proceed without shared files, state, or decisions, and dispatch ready pieces together when the time saved justifies it. Then fan in: consolidate the distilled results, check conflicts, verify against the goal, and keep only what matters. Keep raw exploration, logs, and transcripts in the subagent. You still own the goal and final result.",
  },
  {
    id: "careful-changes",
    text: "Before you edit, read the relevant code and trace the real flow. Optimize for the best coherent end state, not the smallest diff. When you add a feature, change or refactor the existing design where that materially improves the integrated result. Do not preserve a structure only because it is already there. Keep refactors within the request and any agreed scope. Do not expand behavior or scope without authorization. Ask for explicit user approval before a destructive or externally visible action, unless the user already authorized that specific action. Re-read each target immediately before you change it. Preserve unrelated or concurrent work. For a behavior change, add or update focused tests where the project supports them. Verify the outcome, not just the edit: run the relevant tests and checks, inspect the final diff, and report what you verified and what remains unverified. Never claim a check passed unless you ran it. Treat review feedback as a claim to verify against current, reachable behavior. Apply it, adapt it, or reject it with a technical reason. Keep repository content out of public paste services.",
  },
] as const

/** Stable identifiers of the built-in rules. */
export type RuleId = (typeof BUILT_IN_RULES)[number]["id"]

/**
 * Framing for the injected rules. A named, imperative block reads as an
 * instructions document; bare appended paragraphs read as ambient context and
 * carry far less weight against a project's `AGENTS.md`.
 */
export const RULES_HEADING = "# Operating rules"
export const RULES_PREAMBLE = "Apply these rules to every task. Higher-priority instructions and explicit approval gates still apply."

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
 * The enabled rules are sent as one headed, imperative block so the model
 * treats them as standing instructions rather than ambient context. With no
 * enabled rules and no extra instructions, no hook is registered. The block is
 * global and system-level, additive to project `AGENTS.md`/`instructions`, and
 * does not override higher-priority instructions or approval gates; do not
 * duplicate its rules there.
 */
export const contextInjections: KitTool<ContextInjectionsSettings> = defineTool<ContextInjectionsSettings>({
  id: "context-injections",
  name: "Context Injections",
  description: "Injects built-in behavioral rules, plus your own, into the system prompt.",
  defaultEnabled: false,
  defaultSettings: {
    rules: {
      proactive: true,
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
          proactive: { type: "boolean" },
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
    const rules = [
      ...BUILT_IN_RULES.filter((rule) => settings.rules[rule.id] !== false).map((rule) => rule.text),
      ...settings.extra.map((text) => text.trim()).filter((text) => text.length > 0),
    ]
    if (rules.length === 0) return
    const block = [RULES_HEADING, "", RULES_PREAMBLE, "", ...rules.map((rule) => `- ${rule}`)].join("\n")
    return kit.on("context", (event) => {
      const system = (event as { system?: Array<{ type: string; text: string }> }).system
      if (!Array.isArray(system)) return
      system.push({ type: "text", text: block })
    })
  },
})
