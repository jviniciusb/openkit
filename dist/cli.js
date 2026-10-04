// src/config/coerce.ts
var NUMBER_RE = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/;
function coerceScalar(raw) {
  if (raw === "true")
    return true;
  if (raw === "false")
    return false;
  if (raw === "null")
    return null;
  if (NUMBER_RE.test(raw))
    return Number(raw);
  return raw;
}

// src/config/discover.ts
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
var CONFIG_FILE_NAME = "opencode-kit.jsonc";
function globalConfigDir(env, home) {
  const xdg = env.XDG_CONFIG_HOME;
  return xdg !== undefined && xdg.length > 0 ? join(xdg, "opencode") : join(home, ".config", "opencode");
}
function globalConfigPath(home, env = process.env) {
  return join(globalConfigDir(env, home), CONFIG_FILE_NAME);
}
function globalOpencodePath(home, env = process.env) {
  return join(globalConfigDir(env, home), "opencode.json");
}
function projectConfigPath(directory) {
  return join(directory, ".opencode", CONFIG_FILE_NAME);
}
function discoverKitConfigFiles(locationDirectory, home, env = process.env) {
  const globalFile = globalConfigPath(home, env);
  const ancestors = [];
  let current = resolve(locationDirectory);
  for (;; ) {
    ancestors.push(current);
    const parent = dirname(current);
    if (parent === current)
      break;
    current = parent;
  }
  const projectFiles = ancestors.reverse().map(projectConfigPath).filter((candidate) => existsSync(candidate));
  return existsSync(globalFile) ? [globalFile, ...projectFiles] : projectFiles;
}

// src/config/edit.ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname as dirname2 } from "node:path";
import {
  applyEdits,
  modify,
  parse,
  printParseErrorCode
} from "jsonc-parser";
var MODIFY_OPTIONS = {
  formattingOptions: { insertSpaces: true, tabSize: 2 }
};
var DEFAULT_CONFIG = { configVersion: 1, tools: {} };
var READ_OPTIONS = {
  allowTrailingComma: true,
  disallowComments: false,
  allowEmptyContent: true
};
function isMissingFile(error) {
  return typeof error === "object" && error !== null && error.code === "ENOENT";
}
function readEditableText(path, fallback) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    if (isMissingFile(error))
      return fallback;
    throw error;
  }
  const errors = [];
  const parsed = parse(text, errors, READ_OPTIONS);
  if (errors.length > 0) {
    const details = errors.map((error) => `${printParseErrorCode(error.error)} at offset ${error.offset}`).join(", ");
    throw new Error(`refusing to edit malformed config ${path}: ${details}`);
  }
  if (parsed === undefined)
    return fallback;
  return text;
}
function readConfigText(path) {
  return readEditableText(path, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}
`);
}
function applyAndWrite(path, text, edits) {
  const next = applyEdits(text, edits);
  mkdirSync(dirname2(path), { recursive: true });
  writeFileSync(path, next);
}
async function setToolEnabled(path, toolId, enabled) {
  const text = readConfigText(path);
  const edits = modify(text, ["tools", toolId, "enabled"], enabled, MODIFY_OPTIONS);
  applyAndWrite(path, text, edits);
}
async function setToolSetting(path, toolId, key, value) {
  const text = readConfigText(path);
  const edits = modify(text, ["tools", toolId, "settings", key], value, MODIFY_OPTIONS);
  applyAndWrite(path, text, edits);
}
function hasToolEntry(text, toolId) {
  const parsed = parse(text, [], READ_OPTIONS);
  return parsed?.tools?.[toolId] !== undefined;
}
async function seedTools(path, seeds) {
  const text = readConfigText(path);
  let next = text;
  for (const [toolId, entry] of Object.entries(seeds)) {
    if (hasToolEntry(next, toolId))
      continue;
    next = applyEdits(next, modify(next, ["tools", toolId], entry, MODIFY_OPTIONS));
  }
  mkdirSync(dirname2(path), { recursive: true });
  writeFileSync(path, next);
}
function hasPluginEntry(plugins, pluginId) {
  return plugins.some((entry) => entry === pluginId || Array.isArray(entry) && entry[0] === pluginId);
}
async function ensurePluginEntry(path, pluginId) {
  const text = readEditableText(path, `{}
`);
  const parsed = parse(text, [], READ_OPTIONS);
  const plugins = parsed?.plugins;
  if (plugins !== undefined && !Array.isArray(plugins)) {
    throw new Error(`refusing to edit ${path}: "plugins" is not an array`);
  }
  if (Array.isArray(plugins)) {
    if (hasPluginEntry(plugins, pluginId))
      return;
    const edits = modify(text, ["plugins", plugins.length], pluginId, MODIFY_OPTIONS);
    applyAndWrite(path, text, edits);
    return;
  }
  const edits = modify(text, ["plugins"], [pluginId], MODIFY_OPTIONS);
  applyAndWrite(path, text, edits);
}

// src/config/effective.ts
import { existsSync as existsSync2, readFileSync as readFileSync3 } from "node:fs";
import { join as join2 } from "node:path";
import { parse as parse3 } from "jsonc-parser";

// src/config/load.ts
import { readFileSync as readFileSync2 } from "node:fs";
import { parse as parse2, printParseErrorCode as printParseErrorCode2 } from "jsonc-parser";
async function loadKitConfig(paths) {
  const configs = [];
  for (const path of paths) {
    let raw;
    try {
      raw = readFileSync2(path, "utf8");
    } catch {
      continue;
    }
    const errors = [];
    const parsed = parse2(raw, errors, { allowTrailingComma: true, disallowComments: false });
    if (errors.length > 0) {
      const details = errors.map((e) => `${printParseErrorCode2(e.error)} at offset ${e.offset}`).join(", ");
      console.warn(`opencode-kit: skipping malformed config ${path}: ${details}`);
      continue;
    }
    configs.push(parsed);
  }
  return configs;
}

// src/config/merge.ts
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function deepMerge(base, override) {
  if (override === undefined)
    return base;
  if (isPlainObject(base) && isPlainObject(override)) {
    const result = { ...base };
    for (const key of Object.keys(override)) {
      result[key] = deepMerge(result[key], override[key]);
    }
    return result;
  }
  return override;
}

// src/config/effective.ts
var PLUGIN_ID = "opencode-kit";
var READ_OPTIONS2 = { allowTrailingComma: true, disallowComments: false };
function valuesEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
function layerLabel(path, home, env) {
  return path === globalConfigPath(home, env) ? `global config ${path}` : `project config ${path}`;
}
async function buildConfigLayers(cwd, home, env = process.env, pluginOptions) {
  const layers = [];
  for (const path of discoverKitConfigFiles(cwd, home, env)) {
    const [config] = await loadKitConfig([path]);
    if (config === undefined)
      continue;
    layers.push({ label: layerLabel(path, home, env), config });
  }
  if (pluginOptions !== undefined) {
    layers.push({ label: "plugin options (opencode.json)", config: pluginOptions });
  }
  return layers;
}
function pluginOptionsFrom(plugins) {
  if (!Array.isArray(plugins))
    return;
  let merged;
  for (const entry of plugins) {
    if (!Array.isArray(entry) || entry[0] !== PLUGIN_ID)
      continue;
    const options = entry[1];
    if (typeof options !== "object" || options === null || Array.isArray(options))
      continue;
    merged = deepMerge(merged ?? {}, options);
  }
  return merged;
}
function readPluginOptions(cwd, home, env = process.env) {
  const candidates = [globalOpencodePath(home, env), join2(cwd, "opencode.json")];
  let merged;
  for (const path of candidates) {
    if (!existsSync2(path))
      continue;
    let parsed;
    try {
      parsed = parse3(readFileSync3(path, "utf8"), [], READ_OPTIONS2);
    } catch {
      continue;
    }
    const found = pluginOptionsFrom(parsed?.plugins);
    if (found !== undefined)
      merged = deepMerge(merged ?? {}, found);
  }
  return merged;
}
function resolveEffective(tool, layers) {
  let enabled = tool.defaultEnabled ?? false;
  let enabledLayer;
  let settings = { ...tool.defaultSettings };
  const settingLayers = {};
  for (const layer of layers) {
    const entry = layer.config.tools?.[tool.id];
    if (entry === undefined)
      continue;
    if (entry.enabled !== undefined) {
      enabled = entry.enabled;
      enabledLayer = layer;
    }
    if (entry.settings !== undefined) {
      for (const key of Object.keys(entry.settings))
        settingLayers[key] = layer;
      settings = deepMerge(settings, entry.settings);
    }
  }
  return { enabled, settings, enabledLayer, settingLayers };
}

// src/config/resolve.ts
function resolveToolConfig(tool, sources) {
  let enabled = tool.defaultEnabled ?? false;
  let settings = tool.defaultSettings;
  for (const source of sources) {
    const entry = source.tools?.[tool.id];
    if (entry === undefined)
      continue;
    if (entry.enabled !== undefined)
      enabled = entry.enabled;
    if (entry.settings !== undefined)
      settings = deepMerge(settings, entry.settings);
  }
  return { enabled, settings };
}

// src/config/validate.ts
import { Ajv } from "ajv";
var ajv = new Ajv({ allErrors: true, strict: false });
function formatError(error) {
  const path = error.instancePath && error.instancePath.length > 0 ? error.instancePath : "/";
  const extra = Object.entries(error.params ?? {}).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join(", ");
  const message = error.message ?? "invalid";
  return extra.length > 0 ? `${path} ${message} (${extra})` : `${path} ${message}`;
}
function validateToolSettings(schema, settings) {
  if (schema === undefined)
    return { valid: true };
  try {
    const validate = ajv.compile(schema);
    if (validate(settings))
      return { valid: true };
    const errors = (validate.errors ?? []).map(formatError);
    return { valid: false, errors: errors.length > 0 ? errors : ["settings failed validation"] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { valid: false, errors: [`schema compile error: ${message}`] };
  }
}
function resolveValidated(tool, config) {
  const result = validateToolSettings(tool.settingsSchema, config.settings);
  if (result.valid) {
    return { config: { enabled: config.enabled, settings: config.settings } };
  }
  const reason = `Tool "${tool.id}" settings are invalid (or its schema failed to compile); using defaults: ${result.errors.join("; ")}`;
  return { config: { enabled: config.enabled, settings: tool.defaultSettings }, degraded: reason };
}

// src/core/tool.ts
function defineTool(tool) {
  return { defaultEnabled: false, ...tool };
}

// src/tools/hello/index.ts
var hello = defineTool({
  id: "hello",
  name: "Hello",
  description: "Example tool that greets you.",
  defaultEnabled: true,
  defaultSettings: { greeting: "Hello" },
  settingsSchema: {
    type: "object",
    properties: { greeting: { type: "string" } },
    required: ["greeting"],
    additionalProperties: false
  },
  register(ctx, settings, kit) {
    kit.namespace("hello");
    return kit.tool({
      name: "hello",
      description: settings.greeting,
      input: {
        type: "object",
        properties: { name: { type: "string" } },
        additionalProperties: false
      },
      execute: async () => ({ content: settings.greeting })
    });
  }
});

// src/tools/index.ts
var tools = [
  hello
];

// src/cli/commands/config.ts
async function configCommand(io, args) {
  const [action, toolId, key, ...valueParts] = args;
  if (action === "get")
    return configGet(io, toolId, key);
  if (action === "set")
    return configSet(io, toolId, key, valueParts);
  io.stderr(`opencode-kit: config expects "get" or "set"`);
  return 1;
}
async function configGet(io, toolId, key) {
  const tool = tools.find((t) => t.id === toolId);
  if (tool === undefined) {
    io.stderr(`opencode-kit: unknown tool "${toolId ?? ""}"`);
    return 1;
  }
  if (key === undefined || key.length === 0) {
    io.stderr(`opencode-kit: config get requires a tool id and key`);
    return 1;
  }
  const sources = await loadKitConfig([globalConfigPath(io.home)]);
  const { settings } = resolveToolConfig(tool, sources);
  const value = settings[key];
  if (value === undefined) {
    io.stderr(`opencode-kit: "${toolId}.${key}" is not set`);
    return 1;
  }
  io.stdout(JSON.stringify(value));
  return 0;
}
async function configSet(io, toolId, key, valueParts) {
  const tool = tools.find((t) => t.id === toolId);
  if (tool === undefined) {
    io.stderr(`opencode-kit: unknown tool "${toolId ?? ""}"`);
    return 1;
  }
  if (key === undefined || key.length === 0 || valueParts.length === 0) {
    io.stderr(`opencode-kit: config set requires a tool id, key, and value`);
    return 1;
  }
  const value = coerceScalar(valueParts.join(" "));
  await setToolSetting(globalConfigPath(io.home), tool.id, key, value);
  io.stdout(`${tool.id}.${key} = ${JSON.stringify(value)}`);
  const layers = await buildConfigLayers(io.cwd, io.home, process.env, readPluginOptions(io.cwd, io.home));
  const effective = resolveEffective(tool, layers);
  const { degraded } = resolveValidated(tool, { enabled: effective.enabled, settings: effective.settings });
  if (degraded !== undefined) {
    io.stderr(`opencode-kit: warning: ${degraded}`);
  }
  const effectiveValue = effective.settings[key];
  if (!valuesEqual(effectiveValue, value)) {
    const layer = effective.settingLayers[key];
    io.stderr(`opencode-kit: warning: "${tool.id}.${key}" is effectively ${JSON.stringify(effectiveValue)}; your change is overridden by ${layer?.label ?? "a higher-precedence layer"}`);
  }
  return 0;
}

// src/cli/commands/doctor.ts
import { readFileSync as readFileSync4 } from "node:fs";
import { join as join3 } from "node:path";
import { parse as parse4, printParseErrorCode as printParseErrorCode3 } from "jsonc-parser";
// package.json
var package_default = {
  name: "opencode-kit",
  version: "0.1.0",
  description: "A framework of toggleable, configurable tools for OpenCode V2",
  keywords: [
    "opencode",
    "opencode-plugin",
    "opencode-v2",
    "ai",
    "coding-agent",
    "tools"
  ],
  homepage: "https://github.com/jviniciusb/opencode-kit#readme",
  repository: {
    type: "git",
    url: "git+https://github.com/jviniciusb/opencode-kit.git"
  },
  bugs: {
    url: "https://github.com/jviniciusb/opencode-kit/issues"
  },
  author: "Jader Barbosa",
  license: "MIT",
  type: "module",
  main: "./dist/plugin.js",
  bin: { "opencode-kit": "./bin/opencode-kit.js" },
  files: ["dist", "bin", "index.js", "scripts", ".opencode", "opencode-kit.schema.json", "README.md", "LICENSE"],
  engines: { bun: ">=1.1.39", node: ">=18.0.0" },
  publishConfig: { access: "public" },
  scripts: {
    typecheck: "tsc --noEmit",
    prepare: "bun run build",
    test: "bun test",
    build: "bun run build:plugin && bun run build:cli",
    "build:plugin": "bun build src/plugin.ts --target=bun --outfile=dist/plugin.js",
    "build:cli": "bun build src/cli/index.ts --target=node --outfile=dist/cli.js --external ajv --external jsonc-parser"
  },
  dependencies: { ajv: "^8.17.1", "jsonc-parser": "^3.3.1" },
  devDependencies: { "@types/bun": "latest", typescript: "^5.6.0" }
};

// src/cli/commands/doctor.ts
var READ_OPTIONS3 = { allowTrailingComma: true, disallowComments: false };
function scanConfigs(io) {
  const configs = [];
  const errors = [];
  for (const path of discoverKitConfigFiles(io.cwd, io.home)) {
    let raw;
    try {
      raw = readFileSync4(path, "utf8");
    } catch (error) {
      errors.push(`${path}: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    const parseErrors = [];
    const parsed = parse4(raw, parseErrors, READ_OPTIONS3);
    if (parseErrors.length > 0) {
      const details = parseErrors.map((e) => `${printParseErrorCode3(e.error)} at offset ${e.offset}`).join(", ");
      errors.push(`${path}: ${details}`);
      continue;
    }
    configs.push(parsed ?? {});
  }
  return { configs, errors };
}
function opencodeListsPlugin(path, pluginId) {
  try {
    const parsed = parse4(readFileSync4(path, "utf8"), [], READ_OPTIONS3);
    const plugins = parsed?.plugins;
    if (!Array.isArray(plugins))
      return false;
    return plugins.some((p) => p === pluginId || Array.isArray(p) && p[0] === pluginId);
  } catch {
    return false;
  }
}
async function doctorCommand(io) {
  const { configs, errors } = scanConfigs(io);
  if (errors.length === 0) {
    io.stdout(`config: ok (${configs.length} file${configs.length === 1 ? "" : "s"})`);
  } else {
    for (const error of errors)
      io.stdout(`config: error ${error}`);
  }
  let degraded = 0;
  for (const tool of tools) {
    const { degraded: reason } = resolveValidated(tool, resolveToolConfig(tool, configs));
    if (reason !== undefined) {
      degraded += 1;
      io.stdout(`tool: degraded ${reason}`);
    }
  }
  if (degraded === 0)
    io.stdout("tools: ok");
  const candidates = [
    join3(io.cwd, "opencode.json"),
    globalOpencodePath(io.home)
  ];
  const active = candidates.some((path) => opencodeListsPlugin(path, "opencode-kit"));
  io.stdout(`plugin: ${active ? "active" : "not listed (best effort)"}`);
  return errors.length > 0 ? 1 : 0;
}
async function versionCommand(io) {
  io.stdout(`opencode-kit CLI ${package_default.version}`);
  io.stdout(`opencode-kit plugin ${package_default.version}`);
  return 0;
}

// src/cli/commands/init.ts
import { join as join4 } from "node:path";
var PLUGIN_ID2 = "opencode-kit";
async function initCommand(io, options = {}) {
  const project = options.project ?? false;
  const configPath = project ? projectConfigPath(io.cwd) : globalConfigPath(io.home);
  const opencodePath = project ? join4(io.cwd, "opencode.json") : globalOpencodePath(io.home);
  const seeds = {};
  for (const tool of tools) {
    seeds[tool.id] = {
      enabled: tool.defaultEnabled ?? false,
      settings: tool.defaultSettings
    };
  }
  await seedTools(configPath, seeds);
  await ensurePluginEntry(opencodePath, PLUGIN_ID2);
  io.stdout(`${project ? "project" : "global"} config ready: ${configPath}`);
  io.stdout(`plugins: ${opencodePath}`);
  return 0;
}

// src/cli/commands/list.ts
async function listCommand(io) {
  const paths = discoverKitConfigFiles(io.cwd, io.home);
  const sources = await loadKitConfig(paths);
  for (const tool of tools) {
    const { enabled } = resolveToolConfig(tool, sources);
    io.stdout(`${tool.id}	${enabled ? "enabled" : "disabled"}	${tool.description}`);
  }
  return 0;
}

// src/cli/scaffold.ts
import { existsSync as existsSync3 } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join as join5 } from "node:path";
var OPEN_MARKER = "// <kit:tools>";
var CLOSE_MARKER = "// </kit:tools>";
var TOOL_ID_RE = /^[a-z][a-z0-9-]*$/;
function camelCase(id) {
  const parts = id.split(/[^a-zA-Z0-9]+/).filter((part) => part.length > 0);
  const [first, ...rest] = parts;
  if (first === undefined)
    return "";
  return first.toLowerCase() + rest.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join("");
}
function displayName(id) {
  return id.split(/[^a-zA-Z0-9]+/).filter((part) => part.length > 0).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
function renderTool(id) {
  const name = displayName(id) || id;
  return `import { defineTool } from "../../core/tool"

/** Settings accepted by the \`${id}\` tool. */
export interface ${pascalCase(id)}Settings {
  // Add settings fields here.
}

/**
 * ${name}: TODO describe what this tool does.
 *
 * TODO: replace this skeleton. It follows the same pattern as \`hello\`: declare
 * typed settings, a JSON Schema, then register one tool on the \`${id}\`
 * namespace via \`kit.tool\`.
 */
export default defineTool<${pascalCase(id)}Settings>({
  id: "${id}",
  name: "${name}",
  description: "TODO: describe ${id}.",
  defaultEnabled: false,
  defaultSettings: {},
  settingsSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  register(_ctx, _settings, kit) {
    kit.namespace("${id}")
    return kit.tool({
      name: "${id}",
      description: "TODO: describe ${id}.",
      input: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      execute: () => "TODO: implement ${id}.",
    })
  },
})
`;
}
function pascalCase(id) {
  const camel = camelCase(id);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}
function updateBarrel(barrel, id) {
  const identifier = camelCase(id);
  if (identifier.length === 0) {
    throw new Error(`invalid tool id "${id}"`);
  }
  if (!barrel.includes(OPEN_MARKER) || !barrel.includes(CLOSE_MARKER)) {
    throw new Error(`src/tools/index.ts is missing the <kit:tools> markers`);
  }
  const withEntry = barrel.replace(OPEN_MARKER, `${OPEN_MARKER}
  ${identifier},`);
  const toolsDecl = /^export const tools\b/m;
  if (!toolsDecl.test(withEntry)) {
    throw new Error(`src/tools/index.ts is missing the tools export`);
  }
  const importLine = `import ${identifier} from "./${id}"`;
  return withEntry.replace(toolsDecl, `${importLine}
$&`);
}
async function scaffoldTool(root, toolId) {
  if (toolId.trim().length === 0) {
    throw new Error("tool id is required");
  }
  if (!TOOL_ID_RE.test(toolId)) {
    throw new Error(`invalid tool id "${toolId}": expected kebab-case matching ${TOOL_ID_RE.source}`);
  }
  const dir = join5(root, "src", "tools", toolId);
  if (existsSync3(dir)) {
    throw new Error(`tool "${toolId}" already exists at ${dir}`);
  }
  const barrelPath = join5(root, "src", "tools", "index.ts");
  let barrel;
  try {
    barrel = await readFile(barrelPath, "utf8");
  } catch {
    throw new Error(`cannot read ${barrelPath}`);
  }
  const updatedBarrel = updateBarrel(barrel, toolId);
  await mkdir(dir, { recursive: true });
  await writeFile(join5(dir, "index.ts"), renderTool(toolId), "utf8");
  await writeFile(barrelPath, updatedBarrel, "utf8");
  return { dir };
}

// src/cli/commands/new.ts
async function newCommand(io, toolId) {
  if (toolId === undefined || toolId.trim().length === 0) {
    io.stderr("opencode-kit: new requires a tool id");
    return 1;
  }
  const { dir } = await scaffoldTool(io.cwd, toolId);
  io.stdout(`created ${dir}`);
  return 0;
}

// src/cli/commands/toggle.ts
async function toggleCommand(io, toolId, enabled) {
  const verb = enabled ? "enable" : "disable";
  if (toolId === undefined || toolId.length === 0) {
    io.stderr(`opencode-kit: ${verb} requires a tool id`);
    return 1;
  }
  const tool = tools.find((candidate) => candidate.id === toolId);
  if (tool === undefined) {
    io.stderr(`opencode-kit: unknown tool "${toolId}"`);
    return 1;
  }
  await setToolEnabled(globalConfigPath(io.home), toolId, enabled);
  io.stdout(`${toolId} ${enabled ? "enabled" : "disabled"}`);
  const layers = await buildConfigLayers(io.cwd, io.home, process.env, readPluginOptions(io.cwd, io.home));
  const effective = resolveEffective(tool, layers);
  if (effective.enabled !== enabled) {
    io.stderr(`opencode-kit: warning: "${toolId}" is effectively ${effective.enabled ? "enabled" : "disabled"}; your change is overridden by ${effective.enabledLayer?.label ?? "a higher-precedence layer"}`);
  }
  return 0;
}

// src/cli/index.ts
async function runCli(argv, io) {
  try {
    return await dispatch(argv, io);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(`opencode-kit: ${message}`);
    return 1;
  }
}
async function dispatch(argv, io) {
  const [command, ...rest] = argv;
  switch (command) {
    case "init":
      return initCommand(io, { project: rest.includes("--project") });
    case "doctor":
      return doctorCommand(io);
    case "version":
      return versionCommand(io);
    case "list":
      return listCommand(io);
    case "new":
      return newCommand(io, rest[0]);
    case "enable":
      return toggleCommand(io, rest[0], true);
    case "disable":
      return toggleCommand(io, rest[0], false);
    case "config":
      return configCommand(io, rest);
    case undefined:
      io.stderr("opencode-kit: missing command");
      return 1;
    default:
      io.stderr(`opencode-kit: unknown command "${command}"`);
      return 1;
  }
}
export {
  runCli
};
