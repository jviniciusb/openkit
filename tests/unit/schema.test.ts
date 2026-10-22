import { expect, test } from "bun:test"
import { Ajv } from "ajv"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const schema = JSON.parse(
  readFileSync(join(import.meta.dir, "..", "..", "openkit.schema.json"), "utf8"),
)

const ajv = new Ajv({ allErrors: true, strict: false })
const validate = ajv.compile(schema)

test("config with $schema, configVersion and a tool is valid", () => {
  const config = {
    $schema: "./openkit.schema.json",
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

test("a skills section with enabled is valid", () => {
  expect(validate({ configVersion: 1, skills: { "sdd-flow": { enabled: false } } })).toBe(true)
})
test("skill settings are not allowed", () => {
  expect(validate({ configVersion: 1, skills: { s: { settings: {} } } })).toBe(false)
})

test("a references section is no longer accepted", () => {
  expect(validate({ configVersion: 1, references: { std: { enabled: true } } })).toBe(false)
})
