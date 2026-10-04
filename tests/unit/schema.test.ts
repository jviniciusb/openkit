import { expect, test } from "bun:test"
import { Ajv } from "ajv"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const schema = JSON.parse(
  readFileSync(join(import.meta.dir, "..", "..", "opencode-kit.schema.json"), "utf8"),
)

const ajv = new Ajv({ allErrors: true, strict: false })
const validate = ajv.compile(schema)

test("config with $schema, configVersion and a tool is valid", () => {
  const config = {
    $schema: "./opencode-kit.schema.json",
    configVersion: 1,
    tools: {
      hello: { enabled: true, settings: { name: "world" } },
    },
  }
  expect(validate(config)).toBe(true)
})

test("unknown top-level key is invalid (additionalProperties: false)", () => {
  const config = {
    configVersion: 1,
    notARealKey: true,
  }
  expect(validate(config)).toBe(false)
})
