import { scaffoldSkill } from "../scaffold"
import type { CliIo } from "./list"

/**
 * Handles `opencode-kit new-skill <id>`.
 *
 * Scaffolds a new skill from the standard template and registers it in the
 * skills barrel, reporting the created directory on stdout. A missing id or a
 * skill that already exists is a user error; the latter propagates from
 * {@link scaffoldSkill} and is turned into a non-zero exit by `runCli`.
 */
export async function newSkillCommand(io: CliIo, skillId: string | undefined): Promise<number> {
  if (skillId === undefined || skillId.trim().length === 0) {
    io.stderr("opencode-kit: new-skill requires a skill id")
    return 1
  }

  const { dir } = await scaffoldSkill(io.cwd, skillId)
  io.stdout(`created ${dir}`)
  return 0
}
