import { scaffoldTool } from "../scaffold"
import type { CliIo } from "./list"

/**
 * Handles `opencode-kit new <id>`.
 *
 * Scaffolds a new tool from the standard template and registers it in the
 * barrel, reporting the created directory on stdout. A missing id or a tool
 * that already exists is a user error; the latter propagates from
 * {@link scaffoldTool} and is turned into a non-zero exit by `runCli`.
 */
export async function newCommand(io: CliIo, toolId: string | undefined): Promise<number> {
  if (toolId === undefined || toolId.trim().length === 0) {
    io.stderr("opencode-kit: new requires a tool id")
    return 1
  }

  const { dir } = await scaffoldTool(io.cwd, toolId)
  io.stdout(`created ${dir}`)
  return 0
}
