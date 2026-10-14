#!/usr/bin/env bun
import { homedir } from "node:os"

import { runCli } from "../src/cli/index.ts"

process.exit(
  await runCli(process.argv.slice(2), {
    cwd: process.cwd(),
    home: process.env.HOME ?? homedir(),
    stdout: (s) => process.stdout.write(s + "\n"),
    stderr: (s) => process.stderr.write(s + "\n"),
  }),
)
