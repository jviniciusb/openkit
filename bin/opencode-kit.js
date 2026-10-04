#!/usr/bin/env node
import { homedir } from "node:os"

import { runCli } from "../dist/cli.js"

process.exit(
  await runCli(process.argv.slice(2), {
    cwd: process.cwd(),
    home: process.env.HOME ?? homedir(),
    stdout: (s) => process.stdout.write(s + "\n"),
    stderr: (s) => process.stderr.write(s + "\n"),
  }),
)
