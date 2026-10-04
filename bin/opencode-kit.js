#!/usr/bin/env bun
import { runCli } from "../dist/cli.js"

process.exit(
  await runCli(process.argv.slice(2), {
    cwd: process.cwd(),
    home: process.env.HOME ?? "",
    stdout: (s) => process.stdout.write(s + "\n"),
    stderr: (s) => process.stderr.write(s + "\n"),
  }),
)
