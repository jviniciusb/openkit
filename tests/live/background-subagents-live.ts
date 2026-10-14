/**
 * Live acceptance for the `background-subagents` tool.
 *
 * This file is NOT part of `bun test` (its name does not end in `.test.ts`).
 * It drives a real `opencode` process against a throwaway project that loads
 * this checkout as a plugin, then asserts on the resulting session transcript.
 *
 * Requirements: a working `opencode` with model credentials on `PATH`. It makes
 * several real model calls and costs tokens.
 *
 * Usage: bun tests/live/background-subagents-live.ts
 *
 * Covered (design Validation steps 1, 2, 4, 5 and disable-restores):
 *   1. caller passes `background: false` → forced to background (metadata running)
 *   2. parent turn ends while the child runs (implicit: tool returns a running handle)
 *   4. success and failure are each reported to the parent as one synthetic message
 *   5. a short shell command is unchanged and returns synchronously
 *   6. disabling the tool restores foreground behavior
 *
 * Not automated here: mid-flight steering (design step 3). It was verified
 * manually with a concurrent prompt and is described in `tests/live/README.md`.
 *
 * Note: a directory OpenCode has never seen can answer its very first call before
 * project-local agents are registered. The project directory is reused across
 * invocations and subagent runs retry on an unregistered agent.
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const REPO = resolve(import.meta.dir, "../..")
const BAD_MODEL = "openrouter/definitely-not-a-model-xyz"

/** Stable temp project so OpenCode's per-directory warm-up only happens once. */
const project = join(tmpdir(), "opencode-bg-live-acceptance")
mkdirSync(join(project, ".opencode"), { recursive: true })

let failures = 0
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`)
  if (!ok) failures++
}

function writeKitConfig(enabled: boolean) {
  writeFileSync(
    join(project, ".opencode", "openkit.jsonc"),
    JSON.stringify({ tools: { "background-subagents": { enabled } } }, null, 2),
  )
}

function writeProjectConfig(withBadAgent: boolean) {
  const agent: Record<string, unknown> = {
    probe: {
      mode: "subagent",
      description: "Live-test probe subagent.",
      prompt: "Reply with exactly: probe-ok",
    },
  }
  if (withBadAgent) {
    agent["probe-bad"] = {
      mode: "subagent",
      description: "Failing probe subagent.",
      prompt: "Reply with exactly: nope",
      model: BAD_MODEL,
    }
  }
  writeFileSync(
    join(project, "opencode.jsonc"),
    JSON.stringify({ $schema: "https://opencode.ai/config.json", plugins: [REPO], agent }, null, 2),
  )
}

function opencode(args: string[]): { code: number; stdout: string; stderr: string } {
  const proc = Bun.spawnSync(["opencode", ...args], {
    cwd: project,
    // OpenCode's standalone server resolves the project from `PWD`; Bun.spawnSync
    // sets `cwd` but not `PWD`, so without this it would load the parent's project.
    env: { ...process.env, PWD: project },
    stdout: "pipe",
    stderr: "pipe",
  })
  return { code: proc.exitCode ?? -1, stdout: proc.stdout.toString(), stderr: proc.stderr.toString() }
}

function runLive(prompt: string): { messages: any[]; sessionID: string } {
  const res = opencode(["run", "--standalone", "--auto", "--format", "json", "--title", "live-acceptance", prompt])
  if (res.code !== 0) throw new Error(`opencode run failed (${res.code}): ${res.stderr || res.stdout}`)
  const lines = res.stdout
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as any)
  const sessionID: string | undefined = lines.find((line) => typeof line.sessionID === "string")?.sessionID
  if (!sessionID) throw new Error(`no sessionID in run output: ${res.stdout}`)
  const exp = opencode(["session", "export", sessionID, "--standalone"])
  if (exp.code !== 0) throw new Error(`session export failed (${exp.code}): ${exp.stderr}`)
  return { messages: JSON.parse(exp.stdout).messages as any[], sessionID }
}

/**
 * Runs a prompt that should call the `subagent` tool, retrying while OpenCode's
 * first-touch cold start reports `Unknown agent`.
 */
function runSubagentLive(prompt: string, attempts = 4) {
  let last: { messages: any[]; sessionID: string } | undefined
  for (let attempt = 0; attempt < attempts; attempt++) {
    last = runLive(prompt)
    const part = toolPart(last.messages, "subagent")
    const message: string = part?.state?.error?.message ?? ""
    // Ready when the subagent call ran and OpenCode recorded its execution
    // metadata; retry through the first-touch cold start otherwise.
    const ready = Boolean(part?.state?.metadata) && !/Unknown agent/i.test(message)
    if (ready) return last
    Bun.sleepSync(4_000)
  }
  return last!
}

function toolPart(messages: any[], name: string): any {
  for (const message of messages) {
    for (const part of message.content ?? []) if (part.type === "tool" && part.name === name) return part
  }
  return undefined
}

function synthetic(messages: any[], state: string): any[] {
  return messages.filter(
    (message) =>
      message.type === "synthetic" && message.metadata?.source === "subagent" && message.metadata?.state === state,
  )
}

function exportMessages(sessionID: string): any[] {
  const exp = opencode(["session", "export", sessionID, "--standalone"])
  return exp.code === 0 ? (JSON.parse(exp.stdout).messages ?? []) : []
}

/** Re-exports until the parent records one subagent notification of `state`. */
function waitForSynthetic(sessionID: string, state: string, timeoutMs = 12_000): any[] {
  const deadline = Date.now() + timeoutMs
  let found = synthetic(exportMessages(sessionID), state)
  while (found.length === 0 && Date.now() < deadline) {
    Bun.sleepSync(1_000)
    found = synthetic(exportMessages(sessionID), state)
  }
  return found
}

try {
  // --- step 1: ON forces background even when the caller says false ----------
  writeKitConfig(true)
  writeProjectConfig(false)
  const on = runSubagentLive(
    'Call the `subagent` tool exactly once with agent="probe", description="Live probe", prompt="Reply with exactly: probe-ok", and background=false. Then run the shell tool exactly once with command "sleep 10" and workdir "/tmp". After the shell command finishes, reply with one short sentence. Do not call the subagent again.',
  )
  const onTool = toolPart(on.messages, "subagent")
  check("on: subagent tool was called", Boolean(onTool))
  check(
    "on: subagent forced to background (running handle returned)",
    onTool?.state?.status === "completed" && onTool?.state?.metadata?.status === "running",
    `input.background=${onTool?.state?.input?.background}, metadata.status=${onTool?.state?.metadata?.status}`,
  )
  check("on: success reported to parent exactly once", waitForSynthetic(on.sessionID, "completed").length === 1)

  // --- step 6: OFF restores foreground --------------------------------------
  writeKitConfig(false)
  const off = runSubagentLive(
    'Call the `subagent` tool exactly once with agent="probe", description="Live probe", prompt="Reply with exactly: probe-ok". Do not call any other tool. Then reply with one short sentence.',
  )
  const offTool = toolPart(off.messages, "subagent")
  check(
    "off: foreground child completes inline (no background)",
    offTool?.state?.input?.background === undefined &&
      offTool?.state?.status === "completed" &&
      offTool?.state?.metadata?.status === "completed",
    `input.background=${offTool?.state?.input?.background}, metadata.status=${offTool?.state?.metadata?.status}`,
  )

  // --- step 5: shell unchanged and synchronous ------------------------------
  writeKitConfig(true)
  const sh = runLive(
    'Run the shell tool exactly once with command "echo shell-sync-ok" and workdir "/tmp". Do not call any other tool. Then reply with one short sentence.',
  )
  const shTool = toolPart(sh.messages, "shell")
  check(
    "shell: input untouched and output returned synchronously",
    shTool?.state?.input?.background === undefined &&
      shTool?.state?.status === "completed" &&
      shTool?.state?.metadata?.exit === 0 &&
      JSON.stringify(shTool?.state?.content).includes("shell-sync-ok"),
    `exit=${shTool?.state?.metadata?.exit}`,
  )

  // --- step 4 (failure half): child failure reported once -------------------
  writeProjectConfig(true)
  const fail = runSubagentLive(
    'Call the `subagent` tool exactly once with agent="probe-bad", description="Live fail probe", prompt="Reply with exactly: nope". Do not call any other tool. Then reply with one short sentence.',
  )
  check("failure: child error reported to parent exactly once", synthetic(fail.messages, "error").length === 1)
} catch (error) {
  failures++
  console.error("LIVE HARNESS ERROR:", error instanceof Error ? error.message : error)
}

console.log(failures === 0 ? "\nALL LIVE CHECKS PASSED" : `\n${failures} LIVE CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
