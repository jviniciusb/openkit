import type { KitContext, SessionMessageInfo } from "../../core/context"
import { defineTool, type KitTool } from "../../core/tool"

export interface AutoCompactSettings {
  thresholdTokens: number
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function stringField(value: Record<string, unknown> | undefined, key: string) {
  const field = value?.[key]
  return typeof field === "string" ? field : undefined
}

function promptTokens(messages: readonly SessionMessageInfo[]) {
  let firstCurrentMessage = 0
  for (let i = 0; i < messages.length; i++) {
    if (messages[i]!.type === "compaction") firstCurrentMessage = i + 1
  }

  for (let i = messages.length - 1; i >= firstCurrentMessage; i--) {
    const message = messages[i]!
    const tokens = message.tokens
    if (message.type !== "assistant" || !tokens) continue
    if (![tokens.input, tokens.cache.read, tokens.cache.write].every(Number.isFinite)) return 0
    return tokens.input + tokens.cache.read + tokens.cache.write
  }
  return 0
}

function rootSession(sessionID: string, parents: ReadonlyMap<string, string>) {
  const visited = new Set<string>()
  let current = sessionID
  while (parents.has(current) && !visited.has(current)) {
    visited.add(current)
    current = parents.get(current)!
  }
  return current
}

function hasRelatedWork(
  sessionID: string,
  parents: ReadonlyMap<string, string>,
  activeSessions: ReadonlySet<string>,
  activeTools: ReadonlyMap<string, string>,
  activeShells: ReadonlyMap<string, string>,
) {
  const root = rootSession(sessionID, parents)
  const related = (candidate: string) => rootSession(candidate, parents) === root
  return (
    [...activeSessions].some(related) ||
    [...activeTools.values()].some(related) ||
    [...activeShells.values()].some(related)
  )
}

export const autoCompact: KitTool<AutoCompactSettings> = defineTool<AutoCompactSettings>({
  id: "auto-compact",
  name: "Auto Compact",
  description: "Compact at a prompt-token threshold after related sessions and background work are idle.",
  defaultEnabled: false,
  defaultSettings: { thresholdTokens: 250_000 },
  settingsSchema: {
    type: "object",
    properties: { thresholdTokens: { type: "integer", minimum: 1 } },
    additionalProperties: false,
  },
  register(ctx: KitContext, settings, kit) {
    const events = (ctx as unknown as { event?: { subscribe?: unknown } }).event
    const session = ctx.session as unknown as Record<string, unknown>
    if (
      typeof events?.subscribe !== "function" ||
      typeof session.wait !== "function" ||
      typeof session.context !== "function" ||
      typeof session.compact !== "function"
    ) {
      throw new Error("auto-compact requires the V2 event stream and session wait/context/compact APIs.")
    }

    const controller = new AbortController()
    const checking = new Set<string>()
    const pending = new Set<string>()
    const idleCandidates = new Set<string>()
    const parents = new Map<string, string>()
    const activeSessions = new Set<string>()
    const activeTools = new Map<string, string>()
    const activeShells = new Map<string, string>()

    const hasWork = (sessionID: string) =>
      hasRelatedWork(sessionID, parents, activeSessions, activeTools, activeShells)

    let retryCandidates = () => {}
    const checkCandidate = async (sessionID: string) => {
      if (!idleCandidates.has(sessionID) || checking.has(sessionID) || pending.has(sessionID)) return
      checking.add(sessionID)
      try {
        await ctx.session.wait({ sessionID })
        if (controller.signal.aborted || !idleCandidates.has(sessionID) || hasWork(sessionID)) return
        const messages = await ctx.session.context({ sessionID })
        if (controller.signal.aborted) return
        if (promptTokens(messages) < settings.thresholdTokens) {
          idleCandidates.delete(sessionID)
          return
        }
        idleCandidates.delete(sessionID)
        pending.add(sessionID)
        await ctx.session.compact({ sessionID, delivery: "queue" })
      } catch (error) {
        idleCandidates.delete(sessionID)
        pending.delete(sessionID)
        kit.log.error(`Auto-compaction failed for ${sessionID}.`, error)
      } finally {
        checking.delete(sessionID)
        if (idleCandidates.has(sessionID) && !controller.signal.aborted && !hasWork(sessionID)) {
          void checkCandidate(sessionID)
        }
      }
    }
    retryCandidates = () => idleCandidates.forEach((sessionID) => void checkCandidate(sessionID))

    const eventStream = ctx.event.subscribe({ signal: controller.signal })
    void (async () => {
      try {
        for await (const event of eventStream) {
          const data = record(event.data)
          const sessionID = stringField(data, "sessionID")
          switch (event.type) {
            case "session.created":
            case "session.forked": {
              const parentID = stringField(data, "parentID")
              if (sessionID && parentID) parents.set(sessionID, parentID)
              retryCandidates()
              break
            }
            case "session.execution.started":
              if (sessionID) {
                activeSessions.add(sessionID)
                idleCandidates.delete(sessionID)
              }
              break
            case "session.execution.succeeded":
            case "session.execution.failed":
            case "session.execution.interrupted":
              if (sessionID) activeSessions.delete(sessionID)
              retryCandidates()
              break
            case "session.status": {
              const status = stringField(record(data?.status), "type")
              if (!sessionID || !status) break
              if (status === "idle") {
                // `session.idle` is deprecated; seed from the status transition so
                // compaction still triggers when only `session.status` is emitted.
                activeSessions.delete(sessionID)
                idleCandidates.add(sessionID)
                void checkCandidate(sessionID)
              } else {
                activeSessions.add(sessionID)
                idleCandidates.delete(sessionID)
              }
              retryCandidates()
              break
            }
            case "session.idle":
              if (sessionID) {
                activeSessions.delete(sessionID)
                idleCandidates.add(sessionID)
                void checkCandidate(sessionID)
              }
              break
            case "session.viewed":
              if (sessionID) {
                idleCandidates.add(sessionID)
                void checkCandidate(sessionID)
              }
              break
            case "session.tool.called": {
              const id = stringField(data, "id")
              if (sessionID && id) activeTools.set(`${sessionID}\0${id}`, sessionID)
              break
            }
            case "session.tool.success":
            case "session.tool.failed": {
              const id = stringField(data, "id")
              if (sessionID && id) activeTools.delete(`${sessionID}\0${id}`)
              retryCandidates()
              break
            }
            case "session.shell.started": {
              const shell = record(data?.shell)
              const id = stringField(shell, "id")
              if (sessionID && id && stringField(shell, "status") === "running") {
                activeShells.set(`${sessionID}\0${id}`, sessionID)
              }
              break
            }
            case "session.shell.ended": {
              const shell = record(data?.shell)
              const id = stringField(shell, "id")
              if (sessionID && id) activeShells.delete(`${sessionID}\0${id}`)
              retryCandidates()
              break
            }
            case "session.compaction.ended":
            case "session.compaction.failed":
              if (sessionID) pending.delete(sessionID)
              retryCandidates()
              break
            case "session.deleted":
              if (sessionID) {
                parents.delete(sessionID)
                activeSessions.delete(sessionID)
                idleCandidates.delete(sessionID)
                pending.delete(sessionID)
                for (const [key, owner] of activeTools) if (owner === sessionID) activeTools.delete(key)
                for (const [key, owner] of activeShells) if (owner === sessionID) activeShells.delete(key)
              }
              retryCandidates()
              break
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) kit.log.error("Auto-compaction event stream failed.", error)
      }
    })()

    return { dispose: () => controller.abort() }
  },
})
