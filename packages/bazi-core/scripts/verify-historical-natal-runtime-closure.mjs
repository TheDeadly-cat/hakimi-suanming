import { createHash } from "node:crypto";
import {
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse, parseExpression } from "@babel/parser";
import { resolveDefaultLifecyclePlan } from "../../../scripts/formal-npm-lifecycle-closure-lib.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultWorkspaceRoot = path.resolve(scriptDirectory, "../../..");

export const HISTORICAL_NATAL_RUNTIME_CLOSURE_ROOTS = Object.freeze([
  "packages/bazi-core/src/historical-natal-chart-executor-0.4.0.ts",
  "packages/bazi-core/src/index.ts"
]);

export const EXPECTED_RUNTIME_WORKSPACE_SOURCE_PATHS = Object.freeze([
  "packages/bazi-core/src/historical-natal-chart-executor-0.4.0.ts",
  "packages/bazi-core/src/index.ts",
  "packages/bazi-core/src/unsupported-calculation-error.ts",
  "packages/contracts/src/index.ts",
  "packages/integrity/src/index.ts",
  "packages/luck-core/src/index.ts",
  "packages/time-core/src/index.ts",
  "packages/tzdb-core/src/artifacts/iana-2025b.ts",
  "packages/tzdb-core/src/index.ts",
  "packages/tzdb-core/src/packed-resolver.ts"
]);

export const EXPECTED_RUNTIME_WORKSPACE_MANIFEST_PATHS = Object.freeze([
  "packages/bazi-core/package.json",
  "packages/contracts/package.json",
  "packages/integrity/package.json",
  "packages/luck-core/package.json",
  "packages/time-core/package.json",
  "packages/tzdb-core/package.json"
]);

export const EXPECTED_RUNTIME_EXTERNAL_INSTALL_PATHS = Object.freeze([
  "node_modules/@js-temporal/polyfill",
  "node_modules/jsbi",
  "node_modules/lunar-typescript",
  "node_modules/moment",
  "node_modules/moment-timezone",
  "node_modules/moment-timezone-2025b",
  "node_modules/zod"
]);

export const HISTORICAL_RUNTIME_VITE_ALIASES = Object.freeze([
  "@hakimi/bazi-core",
  "@hakimi/contracts",
  "@hakimi/integrity",
  "@hakimi/luck-core",
  "@hakimi/time-core",
  "@hakimi/tzdb-core"
]);

export const HISTORICAL_RUNTIME_BUNDLE_CONFIG_PATHS = Object.freeze([
  "apps/web/vite.config.ts",
  "apps/web/vite.cross-schema-upgrade.config.ts",
  "apps/web/vite.e2e.config.ts",
  "apps/web/vite.production-v13-to-v15.config.ts",
  "apps/web/vite.production-v13-to-v16.config.ts",
  "apps/web/vite.production-v14.config.ts",
  "apps/web/vite.production-v15.config.ts",
  "apps/web/vite.sw-upgrade.config.ts"
]);

export const HISTORICAL_RUNTIME_SCRIPT_MANIFEST_PATHS = Object.freeze([
  "apps/web/package.json",
  "package.json"
]);

const SIDECAR_RELATIVE_PATH = "packages/bazi-core/historical-natal-runtime-closure-v1.json";
const SCHEMA_RELATIVE_PATH = "packages/bazi-core/historical-natal-runtime-closure-v1.schema.json";
const VERIFIER_RELATIVE_PATH = "packages/bazi-core/scripts/verify-historical-natal-runtime-closure.mjs";
const TEST_RELATIVE_PATH = "packages/bazi-core/scripts/verify-historical-natal-runtime-closure.test.mjs";
const GATE_ID = "hakimi-bazi-core-historical-natal-runtime-closure-v1";
const EVIDENCE_SCOPE = "current_checkout_runtime_closure_not_historical_binary_or_expert_attestation";
const SIDECAR_SCHEMA_REFERENCE = "./historical-natal-runtime-closure-v1.schema.json";
const MAX_SIDECAR_BYTES = 2 * 1024 * 1024;
export const REVIEWED_RUNTIME_CLOSURE_SCHEMA_SHA256 = "ed17410b37e01b4d8efe5a970df5998a054b2e108be7587cae345d5351c04727";
export const REVIEWED_RUNTIME_CLOSURE_SCHEMA_BYTE_LENGTH = 10_119;

const RUNTIME_LF_PATHS = Object.freeze([
  ...EXPECTED_RUNTIME_WORKSPACE_SOURCE_PATHS,
  ...EXPECTED_RUNTIME_WORKSPACE_MANIFEST_PATHS,
  ...HISTORICAL_RUNTIME_BUNDLE_CONFIG_PATHS,
  ...HISTORICAL_RUNTIME_SCRIPT_MANIFEST_PATHS,
  SCHEMA_RELATIVE_PATH,
  SIDECAR_RELATIVE_PATH,
  VERIFIER_RELATIVE_PATH,
  TEST_RELATIVE_PATH
].filter((value, index, values) => values.indexOf(value) === index).sort());

function fail(message) {
  throw new Error(`Historical natal runtime-closure gate failed: ${message}`);
}

function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortRecord(record) {
  return Object.fromEntries(Object.entries(record).sort(([left], [right]) => compareText(left, right)));
}

export function canonicalJson(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("canonical JSON cannot contain a non-finite number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  }
  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
    fail("canonical JSON accepts only plain JSON objects");
  }
  const keys = Object.keys(value).sort(compareText);
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

function uint64Frame(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) fail(`${label} cannot be framed as an unsigned length`);
  const frame = Buffer.alloc(8);
  frame.writeBigUInt64BE(BigInt(value));
  return frame;
}

function domainSeparatedCanonicalSha256(domain, value) {
  const domainBytes = Buffer.from(domain, "utf8");
  const payloadBytes = Buffer.from(canonicalJson(value), "utf8");
  return createHash("sha256")
    .update(uint64Frame(domainBytes.byteLength, "canonical hash domain"))
    .update(domainBytes)
    .update(uint64Frame(payloadBytes.byteLength, "canonical hash payload"))
    .update(payloadBytes)
    .digest("hex");
}

export function assertCanonicalRelativePath(relativePath, label = "path") {
  if (typeof relativePath !== "string" || relativePath.length === 0) {
    fail(`${label} must be a non-empty string`);
  }
  if (
    relativePath.includes("\\") ||
    relativePath.includes("\0") ||
    relativePath.includes(":") ||
    path.posix.isAbsolute(relativePath) ||
    path.posix.normalize(relativePath) !== relativePath
  ) {
    fail(`${label} is not a canonical forward-slash relative path: ${JSON.stringify(relativePath)}`);
  }
  const segments = relativePath.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    fail(`${label} contains an empty, dot, or parent segment: ${JSON.stringify(relativePath)}`);
  }
  return relativePath;
}

function isMissingPathError(cause) {
  return cause && typeof cause === "object" && (cause.code === "ENOENT" || cause.code === "ENOTDIR");
}

function pathExists(absolutePath) {
  try {
    lstatSync(absolutePath);
    return true;
  } catch (cause) {
    if (isMissingPathError(cause)) return false;
    throw cause;
  }
}

function sameFilesystemPath(left, right) {
  const normalizedLeft = path.normalize(left);
  const normalizedRight = path.normalize(right);
  return process.platform === "win32"
    ? normalizedLeft.toLocaleLowerCase("en-US") === normalizedRight.toLocaleLowerCase("en-US")
    : normalizedLeft === normalizedRight;
}

function assertInsideRoot(root, absolutePath, label) {
  const relative = path.relative(root, absolutePath);
  if (relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) {
    return;
  }
  fail(`${label} escapes the allowed root`);
}

function assertExactEntryName(parentDirectory, expectedName, label) {
  const names = readdirSync(parentDirectory);
  const folded = expectedName.toLocaleLowerCase("en-US");
  const matches = names.filter((name) => name.toLocaleLowerCase("en-US") === folded);
  if (matches.length !== 1 || matches[0] !== expectedName) {
    fail(`${label} has missing or case-ambiguous path segment ${JSON.stringify(expectedName)}`);
  }
}

function assertPhysicalPath(root, relativePath, expectedType, label) {
  assertCanonicalRelativePath(relativePath, label);
  const absoluteRoot = path.resolve(root);
  const rootStat = lstatSync(absoluteRoot);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    fail(`${label} root must be a physical directory, not a symlink/reparse point`);
  }
  let cursor = absoluteRoot;
  const segments = relativePath.split("/");
  for (let index = 0; index < segments.length; index += 1) {
    assertExactEntryName(cursor, segments[index], label);
    cursor = path.join(cursor, segments[index]);
    assertInsideRoot(absoluteRoot, cursor, label);
    const stat = lstatSync(cursor);
    if (stat.isSymbolicLink()) {
      fail(`${label} must not traverse a symlink/reparse point at ${segments.slice(0, index + 1).join("/")}`);
    }
    if (index < segments.length - 1 && !stat.isDirectory()) {
      fail(`${label} traverses a non-directory path component`);
    }
  }
  const finalStat = lstatSync(cursor);
  if (expectedType === "file" && !finalStat.isFile()) fail(`${label} must resolve to a regular file`);
  if (expectedType === "directory" && !finalStat.isDirectory()) fail(`${label} must resolve to a directory`);
  const realRoot = realpathSync.native(absoluteRoot);
  const realCursor = realpathSync.native(cursor);
  const expectedRealCursor = path.resolve(realRoot, ...segments);
  if (!sameFilesystemPath(realCursor, expectedRealCursor)) {
    fail(`${label} traverses a reparse point`);
  }
  assertInsideRoot(realRoot, realCursor, label);
  return { absolutePath: cursor, stat: finalStat };
}

function readPhysicalFile(root, relativePath, label = relativePath) {
  const before = assertPhysicalPath(root, relativePath, "file", label);
  const bytes = readFileSync(before.absolutePath);
  const after = lstatSync(before.absolutePath);
  if (
    after.isSymbolicLink() ||
    !after.isFile() ||
    after.size !== before.stat.size ||
    after.mtimeMs !== before.stat.mtimeMs ||
    after.ino !== before.stat.ino
  ) {
    fail(`${label} changed while it was being read`);
  }
  return bytes;
}

function decodeUtf8(bytes, label, { requireLf = false } = {}) {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail(`${label} must not contain a UTF-8 BOM`);
  }
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail(`${label} is not valid UTF-8`);
  }
  if (requireLf) {
    if (source.includes("\r")) fail(`${label} must use LF line endings only`);
    if (!source.endsWith("\n")) fail(`${label} must end with one LF newline`);
  }
  return source;
}

function readLfUtf8File(root, relativePath) {
  const bytes = readPhysicalFile(root, relativePath);
  return { bytes, source: decodeUtf8(bytes, relativePath, { requireLf: true }) };
}

function parseJsonSource(source, label) {
  let expression;
  try {
    expression = parseExpression(source.trim(), {
      sourceFilename: label,
      sourceType: "script",
      errorRecovery: false,
      attachComment: false
    });
  } catch (cause) {
    fail(`${label} cannot be inspected for duplicate JSON keys: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
  walkAst(expression, (node) => {
    if (node.type !== "ObjectExpression") return;
    const keys = new Set();
    for (const property of node.properties) {
      if (property.type !== "ObjectProperty" || property.computed || property.key?.type !== "StringLiteral") {
        fail(`${label} contains a non-JSON object property`);
      }
      if (keys.has(property.key.value)) {
        fail(`${label} contains duplicate JSON object key ${JSON.stringify(property.key.value)}`);
      }
      keys.add(property.key.value);
    }
  });
  let value;
  try {
    value = JSON.parse(source);
  } catch (cause) {
    fail(`${label} is not valid JSON: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
  return value;
}

function readJsonFile(root, relativePath, { requireLf = false } = {}) {
  const bytes = readPhysicalFile(root, relativePath);
  const source = decodeUtf8(bytes, relativePath, { requireLf });
  return { bytes, source, value: parseJsonSource(source, relativePath) };
}

function parseTypeScriptSource(source, relativePath) {
  try {
    return parse(source, {
      sourceFilename: relativePath,
      sourceType: "module",
      plugins: relativePath.endsWith(".tsx") ? ["typescript", "jsx"] : ["typescript"],
      createImportExpressions: true,
      errorRecovery: false,
      attachComment: false
    });
  } catch (cause) {
    fail(`${relativePath} is not valid TypeScript: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
}

function walkAst(value, visitor) {
  if (Array.isArray(value)) {
    for (const item of value) walkAst(item, visitor);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (typeof value.type === "string") visitor(value);
  for (const [key, child] of Object.entries(value)) {
    if (
      key === "loc" || key === "start" || key === "end" || key === "extra" ||
      key === "errors" || key === "comments" || key === "tokens"
    ) continue;
    walkAst(child, visitor);
  }
}

function literalModuleSpecifier(node, relativePath, label) {
  if (!node || node.type !== "StringLiteral" || node.value.length === 0) {
    fail(`${relativePath} contains a non-literal or empty ${label} module specifier`);
  }
  return node.value;
}

export function analyzeRuntimeModuleDependencies(source, relativePath = "inline-source.ts") {
  const file = parseTypeScriptSource(source, relativePath);
  const edges = [];
  for (const statement of file.program.body) {
    if (statement.type === "ImportDeclaration") {
      const typeOnly = statement.importKind === "type" || (
        statement.specifiers.length > 0 &&
        statement.specifiers.every((specifier) =>
          specifier.type === "ImportSpecifier" && specifier.importKind === "type"
        )
      );
      if (typeOnly) continue;
      edges.push({
        kind: "static-import",
        specifier: literalModuleSpecifier(statement.source, relativePath, "static import")
      });
    } else if (
      (statement.type === "ExportNamedDeclaration" || statement.type === "ExportAllDeclaration") &&
      statement.source
    ) {
      const typeOnly = statement.exportKind === "type" || (
        statement.type === "ExportNamedDeclaration" &&
        statement.specifiers.length > 0 &&
        statement.specifiers.every((specifier) => specifier.exportKind === "type")
      );
      if (typeOnly) continue;
      edges.push({
        kind: "static-export",
        specifier: literalModuleSpecifier(statement.source, relativePath, "static export")
      });
    }
  }

  walkAst(file.program, (node) => {
    if (node.type === "TSImportEqualsDeclaration") {
      fail(`${relativePath} must not use import-equals or external-module-reference syntax`);
    }
    if (node.type === "ImportExpression") {
      edges.push({
        kind: "dynamic-import",
        specifier: literalModuleSpecifier(node.source, relativePath, "dynamic import")
      });
    }
    if (node.type === "CallExpression") {
      if (node.callee?.type === "Import") {
        if (node.arguments.length !== 1) fail(`${relativePath} dynamic import must have exactly one literal argument`);
        edges.push({
          kind: "dynamic-import",
          specifier: literalModuleSpecifier(node.arguments[0], relativePath, "dynamic import")
        });
      }
      if (node.callee?.type === "Identifier" && node.callee.name === "require") {
        fail(`${relativePath} must not use require()`);
      }
    }
  });

  return edges;
}

function staticPropertyName(node) {
  if (node?.type === "Identifier") return node.name;
  if (node?.type === "StringLiteral") return node.value;
  return null;
}

function exactObjectPropertyValue(objectExpression, propertyName, relativePath, label) {
  if (!objectExpression || objectExpression.type !== "ObjectExpression") {
    fail(`${relativePath} ${label} must be an object literal`);
  }
  const matches = objectExpression.properties.filter((property) =>
    property.type === "ObjectProperty" &&
    property.computed === false &&
    staticPropertyName(property.key) === propertyName
  );
  if (matches.length !== 1) {
    fail(`${relativePath} ${label} must contain exactly one ${propertyName} property`);
  }
  return matches[0].value;
}

function importedLocalName(file, sourceName, importedName, relativePath) {
  const matches = [];
  for (const statement of file.program.body) {
    if (statement.type !== "ImportDeclaration" || statement.source?.value !== sourceName) continue;
    for (const specifier of statement.specifiers) {
      if (importedName === "default" && specifier.type === "ImportDefaultSpecifier") {
        matches.push(specifier.local.name);
      }
      if (specifier.type === "ImportSpecifier") {
        const imported = specifier.imported.type === "Identifier" ? specifier.imported.name : specifier.imported.value;
        if (imported === importedName) matches.push(specifier.local.name);
      }
    }
  }
  if (matches.length !== 1) {
    fail(`${relativePath} must import exactly one ${importedName} binding from ${sourceName}`);
  }
  return matches[0];
}

function exactConstInitializer(file, variableName, relativePath) {
  const matches = [];
  for (const statement of file.program.body) {
    const declaration = statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
    if (declaration?.type !== "VariableDeclaration" || declaration.kind !== "const") continue;
    for (const declarator of declaration.declarations) {
      if (declarator.id?.type === "Identifier" && declarator.id.name === variableName && declarator.init) {
        matches.push(declarator.init);
      }
    }
  }
  if (matches.length !== 1) fail(`${relativePath} must define exactly one initialized const ${variableName}`);
  return matches[0];
}

function isIdentifierCall(node, identifierName, argumentCount) {
  return node?.type === "CallExpression" &&
    node.callee?.type === "Identifier" &&
    node.callee.name === identifierName &&
    node.arguments.length === argumentCount;
}

function isMemberCall(node, objectName, propertyName, argumentCount) {
  return node?.type === "CallExpression" &&
    node.callee?.type === "MemberExpression" &&
    node.callee.computed === false &&
    node.callee.object?.type === "Identifier" &&
    node.callee.object.name === objectName &&
    node.callee.property?.type === "Identifier" &&
    node.callee.property.name === propertyName &&
    node.arguments.length === argumentCount;
}

function isImportMetaUrl(node) {
  return node?.type === "MemberExpression" &&
    node.computed === false &&
    node.object?.type === "MetaProperty" &&
    node.object.meta?.type === "Identifier" &&
    node.object.meta.name === "import" &&
    node.object.property?.type === "Identifier" &&
    node.object.property.name === "meta" &&
    node.property?.type === "Identifier" &&
    node.property.name === "url";
}

export function extractHistoricalRuntimeViteAliases(
  source,
  relativePath = "apps/web/vite.config.ts"
) {
  const file = parseTypeScriptSource(source, relativePath);
  const pathLocal = importedLocalName(file, "node:path", "default", relativePath);
  const fileUrlLocal = importedLocalName(file, "node:url", "fileURLToPath", relativePath);
  const defineConfigLocal = importedLocalName(file, "vite", "defineConfig", relativePath);

  const appRoot = exactConstInitializer(file, "appRoot", relativePath);
  if (
    !isIdentifierCall(appRoot, fileUrlLocal, 1) ||
    appRoot.arguments[0]?.type !== "NewExpression" ||
    appRoot.arguments[0].callee?.type !== "Identifier" ||
    appRoot.arguments[0].callee.name !== "URL" ||
    appRoot.arguments[0].arguments.length !== 2 ||
    appRoot.arguments[0].arguments[0]?.type !== "StringLiteral" ||
    appRoot.arguments[0].arguments[0].value !== "." ||
    !isImportMetaUrl(appRoot.arguments[0].arguments[1])
  ) {
    fail(`${relativePath} appRoot binding changed from fileURLToPath(new URL(".", import.meta.url))`);
  }
  const workspaceRootBinding = exactConstInitializer(file, "workspaceRoot", relativePath);
  if (
    !isMemberCall(workspaceRootBinding, pathLocal, "resolve", 2) ||
    workspaceRootBinding.arguments[0]?.type !== "Identifier" ||
    workspaceRootBinding.arguments[0].name !== "appRoot" ||
    workspaceRootBinding.arguments[1]?.type !== "StringLiteral" ||
    workspaceRootBinding.arguments[1].value !== "../.."
  ) {
    fail(`${relativePath} workspaceRoot binding changed from path.resolve(appRoot, "../..")`);
  }

  const functions = [];
  for (const statement of file.program.body) {
    const declaration = statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
    if (declaration?.type === "FunctionDeclaration" && declaration.id?.name === "createWebViteConfig") {
      functions.push(declaration);
    }
  }
  if (functions.length !== 1) fail(`${relativePath} must define exactly one createWebViteConfig function`);
  const returns = functions[0].body.body.filter((statement) => statement.type === "ReturnStatement" && statement.argument);
  if (returns.length !== 1 || !isIdentifierCall(returns[0].argument, defineConfigLocal, 1)) {
    fail(`${relativePath} createWebViteConfig must directly return one defineConfig object literal`);
  }
  const configObject = returns[0].argument.arguments[0];
  const resolveObject = exactObjectPropertyValue(configObject, "resolve", relativePath, "Vite config");
  const aliasObject = exactObjectPropertyValue(resolveObject, "alias", relativePath, "Vite resolve config");
  if (aliasObject?.type !== "ObjectExpression") fail(`${relativePath} resolve.alias must remain an object literal`);
  const plugins = exactObjectPropertyValue(configObject, "plugins", relativePath, "Vite config");
  if (plugins?.type !== "ArrayExpression") fail(`${relativePath} plugins must remain an array literal`);
  const runtimeGatePlugins = plugins.elements.filter((element) =>
    isIdentifierCall(element, "historicalNatalRuntimeClosurePlugin", 0)
  );
  if (runtimeGatePlugins.length !== 1) {
    fail(`${relativePath} must install exactly one historicalNatalRuntimeClosurePlugin()`);
  }

  const aliases = [];
  for (const protectedAlias of HISTORICAL_RUNTIME_VITE_ALIASES) {
    const initializer = exactObjectPropertyValue(aliasObject, protectedAlias, relativePath, "Vite alias map");
    if (
      !isMemberCall(initializer, pathLocal, "resolve", 2) ||
      initializer.arguments[0]?.type !== "Identifier" ||
      initializer.arguments[0].name !== "workspaceRoot" ||
      initializer.arguments[1]?.type !== "StringLiteral"
    ) {
      fail(`${relativePath} alias ${protectedAlias} must be path.resolve(workspaceRoot, one literal path)`);
    }
    const target = initializer.arguments[1].value;
    assertCanonicalRelativePath(target, `${relativePath} alias ${protectedAlias}`);
    aliases.push({ specifier: protectedAlias, target });
  }
  aliases.sort((left, right) => compareText(left.specifier, right.specifier));
  return aliases;
}

export function verifyBundleVariantUsesBaseConfig(source, relativePath) {
  const file = parseTypeScriptSource(source, relativePath);
  const candidateBindings = [];
  for (const statement of file.program.body) {
    if (statement.type !== "ImportDeclaration" || statement.source?.value !== "./vite.config") continue;
    for (const specifier of statement.specifiers) {
      if (specifier.type === "ImportDefaultSpecifier") {
        candidateBindings.push({ local: specifier.local.name, binding: "default" });
      } else if (specifier.type === "ImportSpecifier") {
        const imported = specifier.imported.type === "Identifier" ? specifier.imported.name : specifier.imported.value;
        if (imported === "createWebViteConfig") {
          candidateBindings.push({ local: specifier.local.name, binding: "createWebViteConfig" });
        }
      }
    }
  }
  if (candidateBindings.length !== 1) {
    fail(`${relativePath} must import exactly one default or createWebViteConfig binding from ./vite.config`);
  }
  const defaultExports = file.program.body.filter((statement) => statement.type === "ExportDefaultDeclaration");
  if (defaultExports.length !== 1) fail(`${relativePath} must have exactly one default export`);
  const binding = candidateBindings[0];
  const declaration = defaultExports[0].declaration;
  const isDirectCreateCall = (node) =>
    binding.binding === "createWebViteConfig" &&
    node?.type === "CallExpression" &&
    node.callee?.type === "Identifier" &&
    node.callee.name === binding.local &&
    node.arguments.every((argument) => argument.type !== "SpreadElement");

  if (isDirectCreateCall(declaration)) return binding.binding;

  const mergeConfigLocal = importedLocalName(file, "vite", "mergeConfig", relativePath);
  const defineConfigLocal = importedLocalName(file, "vite", "defineConfig", relativePath);
  if (!isIdentifierCall(declaration, mergeConfigLocal, 2)) {
    fail(`${relativePath} default export must directly call createWebViteConfig(...) or mergeConfig(...)`);
  }
  const [baseArgument, extensionArgument] = declaration.arguments;
  const validBase = binding.binding === "default"
    ? baseArgument?.type === "Identifier" && baseArgument.name === binding.local
    : isDirectCreateCall(baseArgument);
  if (!validBase) {
    fail(`${relativePath} mergeConfig first argument must be its exact ./vite.config binding`);
  }
  if (!isIdentifierCall(extensionArgument, defineConfigLocal, 1)) {
    fail(`${relativePath} mergeConfig extension must be one direct defineConfig(...) call`);
  }
  const extensionObject = extensionArgument.arguments[0];
  if (extensionObject?.type !== "ObjectExpression") {
    fail(`${relativePath} mergeConfig extension must be a defineConfig object literal`);
  }
  for (const property of extensionObject.properties) {
    if (property.type !== "ObjectProperty" || property.computed || staticPropertyName(property.key) === null) {
      fail(`${relativePath} mergeConfig extension must not use spread, computed, or opaque properties`);
    }
    if (staticPropertyName(property.key) === "resolve") {
      fail(`${relativePath} mergeConfig extension must not override resolve or protected aliases`);
    }
  }
  return binding.binding;
}

const EXPECTED_ROOT_WEB_BUNDLE_SCRIPTS = Object.freeze([
  "build",
  "build:production-v13-to-v15:candidate",
  "build:production-v13-to-v16:candidate",
  "build:production-v14",
  "build:production-v15:candidate"
]);

const EXPECTED_WEB_VITE_BUNDLE_SCRIPTS = Object.freeze([
  "build",
  "build:e2e",
  "build:production-v13-to-v15:candidate",
  "build:production-v13-to-v16:candidate",
  "build:production-v14",
  "build:production-v15:candidate"
]);

const BUILD_ATTESTATION_SCRIPT =
  "npm run check:historical-natal-source-lock && npm run check:historical-natal-runtime-closure";
const ROOT_BUILD_PREHOOK_COMMAND = "npm run check:historical-natal-build-attestation";
const WEB_BUILD_PREHOOK_COMMAND = "npm --prefix ../.. run check:historical-natal-build-attestation";

// These are the existing terminal checks in the current-governance chain. This
// static inspection never loads or runs them, and does not accept opaque shell.
const REVIEWED_ROOT_PREHOOK_TERMINALS = new Set([
  "node scripts/verify-history-checkpoint.mjs",
  "node scripts/verify-current-index.mjs",
  "node scripts/verify-current-index-status.mjs",
  "node scripts/verify-system-contract-draft-boundaries.mjs",
  "node scripts/verify-current-independent-source-requirements.mjs",
  "node scripts/verify-current-independent-source-inventory.mjs",
  "node scripts/verify-bazi-engineering-binding-candidates.mjs",
  "node scripts/verify-bazi-knowledge-core-identity-rebound-binding-readiness.mjs",
  "node scripts/resolve-bazi-current-domain-manifest.mjs",
  "node scripts/resolve-bazi-current-expert-review-packet.mjs",
  "node scripts/verify-current-independent-domain-manifests.mjs",
  "node scripts/verify-current-independent-domain-inventory.mjs",
  "node scripts/verify-web-storage-import-boundary.mjs",
  "node packages/bazi-core/scripts/verify-historical-natal-source-lock.mjs",
  "node packages/bazi-core/scripts/verify-historical-natal-runtime-closure.mjs --check",
  "node scripts/verify-release-governance.mjs"
]);

function rootPrehookRequiresHistoricalAttestation(rootScripts, prehookName, entryIsInvocation = false) {
  const active = [];
  let requiresAttestation = false;
  function visitScript(name, required) {
    const command = rootScripts[name];
    if (command === undefined && !required) return;
    if (typeof command !== "string" || command.trim().length === 0) {
      fail(`root ${prehookName} requires missing npm script ${name}`);
    }
    if (active.includes(name)) {
      fail(`root ${prehookName} has a cyclic npm prehook chain: ${[...active, name].join(" -> ")}`);
    }
    if (/[\r\n]/u.test(command)) fail(`root ${name} prehook chain contains unsupported shell syntax`);
    active.push(name);
    try {
      for (const segment of command.split(/\s*&&\s*/u)) {
        const invocation = /^npm run ([a-z0-9][a-z0-9:_-]*)$/u.exec(segment.trim());
        if (invocation) {
          const target = invocation[1];
          if (/^build(?:$|:)/u.test(target)) fail(`root ${prehookName} must not recurse into ${target}`);
          // Explicit npm run invokes the target's pre/body/post lifecycle. Every
          // accepted edge is an && edge, so success cannot hide a failed check.
          visitScript(`pre${target}`, false);
          visitScript(target, true);
          visitScript(`post${target}`, false);
        } else if (!REVIEWED_ROOT_PREHOOK_TERMINALS.has(segment.trim())) {
          fail(`root ${name} prehook chain contains unsupported shell syntax or terminal command`);
        }
      }
      if (name === "check:historical-natal-build-attestation") requiresAttestation = true;
    } finally {
      active.pop();
    }
  }
  if (entryIsInvocation) visitScript(`pre${prehookName}`, false);
  visitScript(prehookName, true);
  if (entryIsInvocation) visitScript(`post${prehookName}`, false);
  return requiresAttestation;
}

export function verifyBundleScriptGateContracts(rootManifest, webManifest) {
  if (!rootManifest || typeof rootManifest !== "object" || Array.isArray(rootManifest)) {
    fail("root package manifest must be an object for bundle script verification");
  }
  if (!webManifest || typeof webManifest !== "object" || Array.isArray(webManifest)) {
    fail("web package manifest must be an object for bundle script verification");
  }
  const rootScripts = plainStringRecord(rootManifest.scripts, "root package scripts");
  const webScripts = plainStringRecord(webManifest.scripts, "web package scripts");
  if (rootScripts["check:historical-natal-build-attestation"] !== BUILD_ATTESTATION_SCRIPT) {
    fail("root historical natal build attestation script must run source-lock then runtime-closure check exactly");
  }
  const actualRootBundleScripts = Object.entries(rootScripts)
    .filter(([name, command]) =>
      (command.includes("--workspace @hakimi/web") && /(?:^|\s)npm run build(?:\s|:)/u.test(command))
      || (name === "build" && command === "node scripts/run-diagnostic-stage.mjs lifecycle build")
    )
    .map(([name]) => name)
    .sort(compareText);
  exactSortedSet(actualRootBundleScripts, EXPECTED_ROOT_WEB_BUNDLE_SCRIPTS, "root Web bundle scripts");
  const actualWebBundleScripts = Object.entries(webScripts)
    .filter(([, command]) => /(?:^|\s)vite build(?:\s|$)/u.test(command))
    .map(([name]) => name)
    .sort(compareText);
  exactSortedSet(actualWebBundleScripts, EXPECTED_WEB_VITE_BUNDLE_SCRIPTS, "direct Web Vite bundle scripts");

  for (const scriptName of EXPECTED_ROOT_WEB_BUNDLE_SCRIPTS) {
    if (scriptName === "build"
      && rootScripts.build === "node scripts/run-diagnostic-stage.mjs lifecycle build") {
      // The default coordinator moves the governance obligation out of npm's
      // short-circuiting pre hook. Its fixed plan retains the Web prebuild, and
      // the full governance chain must still include the attestation command.
      resolveDefaultLifecyclePlan("build", {
        root: { path: "package.json", packageJson: rootManifest },
        web: { path: "apps/web/package.json", packageJson: webManifest }
      });
      if (!rootPrehookRequiresHistoricalAttestation(rootScripts, "check:current-governance", true)) {
        fail("root build coordinator must retain the historical build-attestation obligation");
      }
      continue;
    }
    const prehookName = `pre${scriptName}`;
    if (!rootPrehookRequiresHistoricalAttestation(rootScripts, prehookName)) {
      fail(`root ${scriptName} must have a non-recursive ${prehookName} historical build-attestation prehook`);
    }
  }
  for (const scriptName of EXPECTED_WEB_VITE_BUNDLE_SCRIPTS) {
    const prehookName = `pre${scriptName}`;
    const command = webScripts[prehookName];
    if (command !== WEB_BUILD_PREHOOK_COMMAND) {
      fail(`web ${scriptName} must have exact ${prehookName} command ${WEB_BUILD_PREHOOK_COMMAND}`);
    }
    if (command.includes(`npm run ${scriptName}`)) fail(`web ${prehookName} must not recurse into ${scriptName}`);
  }
  return {
    rootBundleScripts: [...EXPECTED_ROOT_WEB_BUNDLE_SCRIPTS],
    webBundleScripts: [...EXPECTED_WEB_VITE_BUNDLE_SCRIPTS],
    rootPrehookCommand: ROOT_BUILD_PREHOOK_COMMAND,
    webPrehookCommand: WEB_BUILD_PREHOOK_COMMAND
  };
}

function aliasDescriptorMatches(descriptor, specifier) {
  if (descriptor.kind === "string") {
    return specifier === descriptor.find || specifier.startsWith(`${descriptor.find}/`);
  }
  if (descriptor.kind === "regexp") {
    let expression;
    try {
      expression = new RegExp(descriptor.source, descriptor.flags);
    } catch {
      fail(`resolved Vite alias contains invalid RegExp /${descriptor.source}/${descriptor.flags}`);
    }
    expression.lastIndex = 0;
    return expression.test(specifier);
  }
  fail(`resolved Vite alias has unsupported kind ${JSON.stringify(descriptor.kind)}`);
}

export function verifyResolvedHistoricalRuntimeAliases(
  aliases,
  workspaceRoot = defaultWorkspaceRoot,
  expectedTargets = null
) {
  if (!Array.isArray(aliases)) fail("resolved Vite aliases must be an array");
  if (!expectedTargets || typeof expectedTargets !== "object" || Array.isArray(expectedTargets)) {
    fail("resolved Vite aliases require targets from the verified runtime-closure attestation");
  }
  const targets = expectedTargets;
  exactSortedSet(Object.keys(targets), HISTORICAL_RUNTIME_VITE_ALIASES, "protected Vite alias targets");
  for (const [index, descriptor] of aliases.entries()) {
    assertObjectKeys(descriptor, descriptor.kind === "regexp"
      ? ["kind", "source", "flags", "replacement", "hasCustomResolver"]
      : ["kind", "find", "replacement", "hasCustomResolver"], `resolved Vite aliases[${index}]`);
    if (descriptor.kind === "string") assertNonEmptyString(descriptor.find, `resolved Vite aliases[${index}].find`);
    if (descriptor.kind === "regexp") {
      assertNonEmptyString(descriptor.source, `resolved Vite aliases[${index}].source`);
      if (typeof descriptor.flags !== "string") fail(`resolved Vite aliases[${index}].flags must be a string`);
    }
    assertNonEmptyString(descriptor.replacement, `resolved Vite aliases[${index}].replacement`);
    if (typeof descriptor.hasCustomResolver !== "boolean") {
      fail(`resolved Vite aliases[${index}].hasCustomResolver must be a boolean`);
    }
  }
  for (const specifier of HISTORICAL_RUNTIME_VITE_ALIASES) {
    const matches = aliases.filter((descriptor) => aliasDescriptorMatches(descriptor, specifier));
    if (
      matches.length !== 1 ||
      matches[0].kind !== "string" ||
      matches[0].find !== specifier ||
      matches[0].hasCustomResolver
    ) {
      fail(`resolved Vite aliases must contain exactly one exact string entry for ${specifier}, without customResolver or prefix/RegExp competitors`);
    }
    const target = targets[specifier];
    assertCanonicalRelativePath(target, `protected Vite alias ${specifier} target`);
    const expected = assertPhysicalPath(workspaceRoot, target, "file", `protected Vite alias ${specifier}`).absolutePath;
    if (!path.isAbsolute(matches[0].replacement)) {
      fail(`resolved Vite alias ${specifier} replacement must be an absolute path`);
    }
    const replacement = path.resolve(matches[0].replacement);
    if (!sameFilesystemPath(realpathSync.native(replacement), realpathSync.native(expected))) {
      fail(`resolved Vite alias ${specifier} expected ${expected}, got ${matches[0].replacement}`);
    }
  }
  return HISTORICAL_RUNTIME_VITE_ALIASES.map((specifier) => ({
    specifier,
    target: targets[specifier]
  }));
}

function isVirtualViteResolvedId(resolvedId) {
  return resolvedId.startsWith("virtual:") ||
    resolvedId.startsWith("/@id/") ||
    resolvedId.startsWith("/@vite/") ||
    resolvedId.includes("__x00__");
}

export function verifyResolvedHistoricalRuntimeAliasResolutions(
  resolutions,
  workspaceRoot = defaultWorkspaceRoot,
  expectedTargets = null
) {
  if (!Array.isArray(resolutions)) fail("resolved Vite alias resolutions must be an array");
  if (!expectedTargets || typeof expectedTargets !== "object" || Array.isArray(expectedTargets)) {
    fail("resolved Vite alias resolutions require targets from the verified runtime-closure attestation");
  }
  const targets = expectedTargets;
  exactSortedSet(Object.keys(targets), HISTORICAL_RUNTIME_VITE_ALIASES, "protected Vite alias targets");

  for (const [index, resolution] of resolutions.entries()) {
    const label = `resolved Vite alias resolutions[${index}]`;
    assertObjectKeys(resolution, ["specifier", "resolvedId", "external"], label);
    assertNonEmptyString(resolution.specifier, `${label}.specifier`);
    if (resolution.resolvedId === null) {
      fail(`${label}.resolvedId must not be null`);
    }
    assertNonEmptyString(resolution.resolvedId, `${label}.resolvedId`);
    if (typeof resolution.external !== "boolean") {
      fail(`${label}.external must be a boolean`);
    }
  }
  exactSortedSet(
    resolutions.map((resolution) => resolution.specifier),
    HISTORICAL_RUNTIME_VITE_ALIASES,
    "resolved Vite alias resolution specifiers"
  );

  const resolutionBySpecifier = new Map(
    resolutions.map((resolution) => [resolution.specifier, resolution])
  );
  return HISTORICAL_RUNTIME_VITE_ALIASES.map((specifier) => {
    const resolution = resolutionBySpecifier.get(specifier);
    if (resolution.external) {
      fail(`resolved Vite alias ${specifier} must not be external`);
    }
    const resolvedId = resolution.resolvedId;
    if (resolvedId.includes("\0")) {
      fail(`resolved Vite alias ${specifier} resolvedId must not contain NUL`);
    }
    if (isVirtualViteResolvedId(resolvedId)) {
      fail(`resolved Vite alias ${specifier} resolvedId must not be virtual`);
    }
    if (resolvedId.includes("?") || resolvedId.includes("#")) {
      fail(`resolved Vite alias ${specifier} resolvedId must not contain a query or fragment`);
    }
    if (!path.isAbsolute(resolvedId)) {
      fail(`resolved Vite alias ${specifier} resolvedId must be an absolute path`);
    }

    const target = targets[specifier];
    assertCanonicalRelativePath(target, `protected Vite alias ${specifier} target`);
    const expected = assertPhysicalPath(
      workspaceRoot,
      target,
      "file",
      `protected Vite alias ${specifier}`
    ).absolutePath;
    let actualRealPath;
    try {
      actualRealPath = realpathSync.native(resolvedId);
    } catch {
      fail(`resolved Vite alias ${specifier} resolvedId is not a physical path: ${resolvedId}`);
    }
    if (!sameFilesystemPath(actualRealPath, realpathSync.native(expected))) {
      fail(`resolved Vite alias ${specifier} expected ${expected}, got ${resolvedId}`);
    }
    return { specifier, target };
  });
}

function buildBundleResolverEvidence(workspaceRoot, catalogByName, manifestStates) {
  const configFiles = HISTORICAL_RUNTIME_BUNDLE_CONFIG_PATHS.map((relativePath) => {
    const { bytes, source } = readLfUtf8File(workspaceRoot, relativePath);
    const baseBinding = relativePath === "apps/web/vite.config.ts"
      ? "defines-createWebViteConfig"
      : verifyBundleVariantUsesBaseConfig(source, relativePath);
    return {
      path: relativePath,
      lfUtf8Sha256: sha256Hex(bytes),
      byteLength: bytes.byteLength,
      baseBinding
    };
  });
  const baseConfig = configFiles.find((entry) => entry.path === "apps/web/vite.config.ts");
  if (!baseConfig) fail("bundle resolver config list lost apps/web/vite.config.ts");
  const baseSource = readLfUtf8File(workspaceRoot, baseConfig.path).source;
  const extractedAliases = extractHistoricalRuntimeViteAliases(baseSource, baseConfig.path);
  const aliases = extractedAliases.map((alias) => {
    const descriptor = catalogByName.get(alias.specifier);
    const state = descriptor ? manifestStates.get(descriptor.manifestPath) : null;
    if (!descriptor || !state?.record) fail(`protected Vite alias ${alias.specifier} is outside the runtime manifest closure`);
    const target = path.posix.normalize(path.posix.join(descriptor.directoryPath, state.record.exports));
    assertCanonicalRelativePath(target, `protected Vite alias ${alias.specifier} manifest export`);
    if (alias.target !== target) {
      fail(`protected Vite alias ${alias.specifier} expected manifest export ${target}, got ${alias.target}`);
    }
    return {
      specifier: alias.specifier,
      manifestPath: descriptor.manifestPath,
      manifestExport: state.record.exports,
      target
    };
  });

  const scriptManifestData = HISTORICAL_RUNTIME_SCRIPT_MANIFEST_PATHS.map((relativePath) => {
    const { bytes, value } = readJsonFile(workspaceRoot, relativePath, { requireLf: true });
    return {
      path: relativePath,
      lfUtf8Sha256: sha256Hex(bytes),
      byteLength: bytes.byteLength,
      value
    };
  });
  const rootManifest = scriptManifestData.find((entry) => entry.path === "package.json")?.value;
  const webManifest = scriptManifestData.find((entry) => entry.path === "apps/web/package.json")?.value;
  const scriptContracts = verifyBundleScriptGateContracts(rootManifest, webManifest);
  return {
    configFiles,
    aliases,
    scriptManifests: scriptManifestData.map(({ value: _value, ...entry }) => entry),
    ...scriptContracts
  };
}

function plainStringRecord(value, label) {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    fail(`${label} must be a plain object`);
  }
  const result = {};
  const foldedKeys = new Set();
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== "string" || entry.length === 0) fail(`${label}.${key} must be a non-empty string`);
    const folded = key.toLocaleLowerCase("en-US");
    if (foldedKeys.has(folded)) fail(`${label} contains Windows case-fold duplicate key ${key}`);
    foldedKeys.add(folded);
    result[key] = entry;
  }
  return sortRecord(result);
}

function assertNoUnsupportedRuntimeDependencyKinds(manifest, label) {
  for (const field of ["optionalDependencies", "peerDependencies"]) {
    const entries = plainStringRecord(manifest[field], `${label} ${field}`);
    if (Object.keys(entries).length > 0) {
      fail(`${label} uses unsupported ${field}; runtime closure must model it before attestation`);
    }
  }
  if (manifest.bundledDependencies !== undefined || manifest.bundleDependencies !== undefined) {
    fail(`${label} uses unsupported bundled dependency metadata`);
  }
}

function packageRequestName(specifier, label) {
  if (
    typeof specifier !== "string" ||
    specifier.length === 0 ||
    specifier.startsWith(".") ||
    specifier.startsWith("/") ||
    specifier.startsWith("#") ||
    specifier.startsWith("node:") ||
    specifier.includes("\\") ||
    specifier.includes("\0")
  ) {
    fail(`${label} contains an unsupported package specifier ${JSON.stringify(specifier)}`);
  }
  const parts = specifier.split("/");
  if (specifier.startsWith("@")) {
    if (parts.length < 2 || parts[0].length < 2 || parts[1].length === 0) {
      fail(`${label} contains an invalid scoped package specifier ${JSON.stringify(specifier)}`);
    }
    return `${parts[0]}/${parts[1]}`;
  }
  return parts[0];
}

function resolveRelativeTypeScriptSource(workspaceRoot, sourcePath, specifier) {
  if ((!specifier.startsWith("./") && !specifier.startsWith("../")) || specifier.includes("\\")) {
    fail(`${sourcePath} has invalid relative module specifier ${JSON.stringify(specifier)}`);
  }
  if (specifier.includes("?") || specifier.includes("#") || specifier.includes("\0")) {
    fail(`${sourcePath} relative module specifier contains unsupported suffix data`);
  }
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(sourcePath), specifier));
  assertCanonicalRelativePath(base, `${sourcePath} resolved module base`);
  const hasExplicitTypeScriptExtension = /\.(?:ts|tsx|mts)$/u.test(base);
  const candidates = hasExplicitTypeScriptExtension
    ? [base]
    : [
      `${base}.ts`,
      `${base}.tsx`,
      `${base}.mts`,
      `${base}/index.ts`,
      `${base}/index.tsx`,
      `${base}/index.mts`
    ];
  const matches = candidates.filter((candidate) => {
    const absolute = path.resolve(workspaceRoot, ...candidate.split("/"));
    assertInsideRoot(path.resolve(workspaceRoot), absolute, `${sourcePath} module resolution`);
    try {
      return lstatSync(absolute).isFile() || lstatSync(absolute).isSymbolicLink();
    } catch (cause) {
      if (isMissingPathError(cause)) return false;
      throw cause;
    }
  });
  if (matches.length !== 1) {
    fail(`${sourcePath} module ${JSON.stringify(specifier)} resolved to ${matches.length} candidates: ${JSON.stringify(matches)}`);
  }
  if (!/\.(?:ts|tsx|mts)$/u.test(matches[0])) {
    fail(`${sourcePath} relative module ${JSON.stringify(specifier)} does not resolve to TypeScript source`);
  }
  assertPhysicalPath(workspaceRoot, matches[0], "file", `${sourcePath} resolved module`);
  return matches[0];
}

function loadWorkspacePackageCatalog(workspaceRoot) {
  const packagesDirectory = path.resolve(workspaceRoot, "packages");
  const catalogByName = new Map();
  const catalogByDirectory = new Map();
  for (const entry of readdirSync(packagesDirectory, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    const manifestPath = `packages/${entry.name}/package.json`;
    const absoluteManifestPath = path.resolve(workspaceRoot, ...manifestPath.split("/"));
    if (!pathExists(absoluteManifestPath)) continue;
    const { value } = readJsonFile(workspaceRoot, manifestPath);
    if (!value || typeof value !== "object" || Array.isArray(value) || typeof value.name !== "string") {
      fail(`${manifestPath} must define a package name`);
    }
    if (catalogByName.has(value.name)) {
      fail(`workspace package name ${value.name} is ambiguous between ${catalogByName.get(value.name).manifestPath} and ${manifestPath}`);
    }
    const descriptor = {
      directoryPath: `packages/${entry.name}`,
      manifestPath,
      manifest: value
    };
    catalogByName.set(value.name, descriptor);
    catalogByDirectory.set(descriptor.directoryPath, descriptor);
  }
  return { catalogByName, catalogByDirectory };
}

function ownerPackageDescriptor(sourcePath, catalogByDirectory) {
  const matches = [...catalogByDirectory.values()].filter((descriptor) =>
    sourcePath.startsWith(`${descriptor.directoryPath}/`)
  );
  matches.sort((left, right) => right.directoryPath.length - left.directoryPath.length);
  if (matches.length === 0) fail(`${sourcePath} is not owned by a physical workspace package`);
  return matches[0];
}

function packagePathSegments(requestName) {
  return requestName.startsWith("@") ? requestName.split("/") : [requestName];
}

function resolveInstalledPackagePath(workspaceRoot, requestName, fromDirectory) {
  packageRequestName(requestName, "installed dependency resolution");
  if (requestName.includes("/") && !requestName.startsWith("@")) {
    fail(`installed dependency request must be a package name, got ${requestName}`);
  }
  const absoluteRoot = path.resolve(workspaceRoot);
  let cursor = path.resolve(fromDirectory);
  assertInsideRoot(absoluteRoot, cursor, `dependency ${requestName} resolution origin`);
  while (true) {
    const candidate = path.join(cursor, "node_modules", ...packagePathSegments(requestName));
    if (pathExists(candidate)) {
      assertInsideRoot(absoluteRoot, candidate, `dependency ${requestName}`);
      const relative = path.relative(absoluteRoot, candidate).split(path.sep).join("/");
      assertPhysicalPath(workspaceRoot, relative, "directory", `dependency ${requestName}`);
      return relative;
    }
    if (sameFilesystemPath(cursor, absoluteRoot)) break;
    const parent = path.dirname(cursor);
    if (sameFilesystemPath(parent, cursor) || !path.relative(absoluteRoot, parent).startsWith("..")) {
      cursor = parent;
      continue;
    }
    break;
  }
  fail(`dependency ${requestName} is not installed from ${path.relative(absoluteRoot, fromDirectory) || "."}`);
}

function exactWorkspaceExportSource(workspaceRoot, descriptor, exported = descriptor.manifest.exports) {
  if (typeof exported !== "string" || !exported.startsWith("./")) {
    fail(`${descriptor.manifestPath} must expose one literal relative TypeScript entry`);
  }
  const relativePath = path.posix.normalize(path.posix.join(descriptor.directoryPath, exported));
  assertCanonicalRelativePath(relativePath, `${descriptor.manifestPath} exports`);
  if (!/\.(?:ts|tsx|mts)$/u.test(relativePath)) {
    fail(`${descriptor.manifestPath} export must be a TypeScript source file`);
  }
  assertPhysicalPath(workspaceRoot, relativePath, "file", `${descriptor.manifestPath} export`);
  return relativePath;
}

function assertWindowsCaseFoldUnique(values, label) {
  const seen = new Map();
  for (const value of values) {
    if (typeof value !== "string") fail(`${label} must contain only strings`);
    const folded = value.toLocaleLowerCase("en-US");
    const previous = seen.get(folded);
    if (previous !== undefined) {
      fail(`${label} contains Windows case-fold collision ${JSON.stringify(previous)} and ${JSON.stringify(value)}`);
    }
    seen.set(folded, value);
  }
}

function exactSortedSet(actualValues, expectedValues, label) {
  const actual = [...actualValues].sort(compareText);
  const expected = [...expectedValues].sort(compareText);
  assertWindowsCaseFoldUnique(actual, `${label} actual values`);
  assertWindowsCaseFoldUnique(expected, `${label} expected values`);
  if (
    new Set(actual).size !== actual.length ||
    new Set(expected).size !== expected.length ||
    canonicalJson(actual) !== canonicalJson(expected)
  ) {
    fail(`${label} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function installedRequestName(installPath) {
  const marker = "/node_modules/";
  const normalized = `/${installPath}`;
  const last = normalized.lastIndexOf(marker);
  const suffix = normalized.slice(last + marker.length);
  const parts = suffix.split("/");
  return parts[0].startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0];
}

function parsePlainSemver(version, label) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u.exec(version);
  if (!match) fail(`${label} must use a plain x.y.z version`);
  return match.slice(1).map(Number);
}

function satisfiesReviewedRange(version, range, label) {
  if (range === version) return true;
  if (!range.startsWith("^")) {
    fail(`${label} uses unsupported non-exact dependency range ${range}`);
  }
  const actual = parsePlainSemver(version, `${label} installed version`);
  const base = parsePlainSemver(range.slice(1), `${label} caret range`);
  const atLeastBase = actual[0] > base[0] ||
    (actual[0] === base[0] && actual[1] > base[1]) ||
    (actual[0] === base[0] && actual[1] === base[1] && actual[2] >= base[2]);
  if (!atLeastBase) return false;
  if (base[0] > 0) return actual[0] === base[0];
  if (base[1] > 0) return actual[0] === 0 && actual[1] === base[1];
  return actual[0] === 0 && actual[1] === 0 && actual[2] === base[2];
}

function assertExternalRequirementMatchesInstalled(requirement, installedName, installedVersion) {
  const label = `${requirement.provenance} dependency ${requirement.request}`;
  if (requirement.range.startsWith("npm:")) {
    const aliasMatch = /^npm:(@[^/]+\/[^@]+|[^@/]+)@(.+)$/u.exec(requirement.range);
    if (!aliasMatch) fail(`${label} has malformed npm alias range ${requirement.range}`);
    if (aliasMatch[1] !== installedName) {
      fail(`${label} alias expected installed package ${aliasMatch[1]}, got ${installedName}`);
    }
    if (aliasMatch[2] !== installedVersion) {
      fail(`${label} alias must pin exact installed version ${installedVersion}, got ${aliasMatch[2]}`);
    }
    return;
  }
  if (requirement.request !== installedName) {
    fail(`${label} expected installed package name ${requirement.request}, got ${installedName}`);
  }
  if (!satisfiesReviewedRange(installedVersion, requirement.range, label)) {
    fail(`${label} range ${requirement.range} does not admit installed ${installedVersion}`);
  }
}

export function aggregateInstalledPackageTree(packageRoot) {
  const absoluteRoot = path.resolve(packageRoot);
  const rootStat = lstatSync(absoluteRoot);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    fail(`installed package tree root must be a physical directory, not a symlink/reparse point: ${packageRoot}`);
  }
  const realRoot = realpathSync.native(absoluteRoot);
  if (!sameFilesystemPath(realRoot, absoluteRoot)) {
    fail(`installed package tree root resolves through a reparse point: ${packageRoot}`);
  }
  const records = [];
  let fileCount = 0;
  let directoryCount = 0;
  let byteLength = 0;

  function visit(absoluteDirectory, relativeDirectory) {
    const beforeDirectory = lstatSync(absoluteDirectory);
    if (!beforeDirectory.isDirectory() || beforeDirectory.isSymbolicLink()) {
      fail(`installed package tree directory became a symlink/reparse point: ${relativeDirectory || "."}`);
    }
    const realDirectory = realpathSync.native(absoluteDirectory);
    const expectedRealDirectory = relativeDirectory
      ? path.resolve(realRoot, ...relativeDirectory.split("/"))
      : realRoot;
    if (!sameFilesystemPath(realDirectory, expectedRealDirectory)) {
      fail(`installed package tree directory resolves through a reparse point: ${relativeDirectory || "."}`);
    }
    const entries = readdirSync(absoluteDirectory, { withFileTypes: true })
      .sort((left, right) => compareText(left.name, right.name));
    const foldedNames = new Set();
    for (const entry of entries) {
      const folded = entry.name.toLocaleLowerCase("en-US");
      if (foldedNames.has(folded)) {
        fail(`installed package tree has case-ambiguous entries below ${relativeDirectory || "."}`);
      }
      foldedNames.add(folded);
      if (entry.name.includes("/") || entry.name.includes("\\") || entry.name.includes("\0")) {
        fail(`installed package tree contains an invalid entry name`);
      }
      const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      const absolutePath = path.join(absoluteDirectory, entry.name);
      const before = lstatSync(absolutePath);
      if (before.isSymbolicLink()) {
        fail(`installed package tree must not contain symlink/reparse point ${relativePath}`);
      }
      if (before.isDirectory()) {
        directoryCount += 1;
        records.push({ kind: "directory", path: relativePath });
        visit(absolutePath, relativePath);
        continue;
      }
      if (!before.isFile()) {
        fail(`installed package tree contains non-regular entry ${relativePath}`);
      }
      const realFile = realpathSync.native(absolutePath);
      const expectedRealFile = path.resolve(realRoot, ...relativePath.split("/"));
      if (!sameFilesystemPath(realFile, expectedRealFile)) {
        fail(`installed package file resolves through a reparse point: ${relativePath}`);
      }
      const bytes = readFileSync(absolutePath);
      const after = lstatSync(absolutePath);
      if (
        after.isSymbolicLink() ||
        !after.isFile() ||
        after.size !== before.size ||
        after.mtimeMs !== before.mtimeMs ||
        after.ino !== before.ino
      ) {
        fail(`installed package file changed while being read: ${relativePath}`);
      }
      fileCount += 1;
      byteLength += bytes.byteLength;
      records.push({
        kind: "file",
        path: relativePath,
        byteLength: bytes.byteLength,
        sha256: sha256Hex(bytes)
      });
    }
    const afterDirectory = lstatSync(absoluteDirectory);
    if (
      afterDirectory.isSymbolicLink() ||
      !afterDirectory.isDirectory() ||
      afterDirectory.mtimeMs !== beforeDirectory.mtimeMs ||
      afterDirectory.ino !== beforeDirectory.ino
    ) {
      fail(`installed package directory changed while being scanned: ${relativeDirectory || "."}`);
    }
  }

  visit(absoluteRoot, "");
  if (fileCount === 0) fail(`installed package tree is empty: ${packageRoot}`);
  records.sort((left, right) => Buffer.compare(Buffer.from(left.path, "utf8"), Buffer.from(right.path, "utf8")));
  assertWindowsCaseFoldUnique(records.map((entry) => entry.path), "installed package tree paths");
  const hash = createHash("sha256");
  const domain = Buffer.from("hakimi-installed-package-tree-v1", "utf8");
  hash.update(uint64Frame(domain.byteLength, "installed tree domain"));
  hash.update(domain);
  hash.update(uint64Frame(records.length, "installed tree record count"));
  for (const record of records) {
    const pathBytes = Buffer.from(record.path, "utf8");
    hash.update(record.kind === "directory" ? Buffer.from([0x44]) : Buffer.from([0x46]));
    hash.update(uint64Frame(pathBytes.byteLength, "installed tree UTF-8 path"));
    hash.update(pathBytes);
    if (record.kind === "directory") {
      hash.update(uint64Frame(0, "installed tree directory content"));
    } else {
      hash.update(uint64Frame(record.byteLength, "installed tree file content"));
      hash.update(Buffer.from(record.sha256, "hex"));
    }
  }
  return {
    sha256: hash.digest("hex"),
    fileCount,
    directoryCount,
    byteLength
  };
}

function runtimeLfPolicyEntries(source) {
  const entries = new Map();
  const foldedPaths = new Map();
  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const normalized = line.replace(/\s+/gu, " ");
    const [attributePath] = normalized.split(" ");
    if (entries.has(attributePath)) fail(`.gitattributes contains duplicate policy entries for ${attributePath}`);
    const folded = attributePath.toLocaleLowerCase("en-US");
    const previous = foldedPaths.get(folded);
    if (previous !== undefined) {
      fail(`.gitattributes contains Windows case-fold collision ${previous} and ${attributePath}`);
    }
    foldedPaths.set(folded, attributePath);
    entries.set(attributePath, normalized);
  }
  return entries;
}

export function verifyRuntimeLfCheckoutPolicySource(source, expectedPaths = RUNTIME_LF_PATHS) {
  const entries = runtimeLfPolicyEntries(source);
  for (const relativePath of expectedPaths) {
    const expected = `/${relativePath} text eol=lf`;
    const actual = entries.get(`/${relativePath}`);
    if (actual !== expected) {
      fail(`.gitattributes runtime-closure LF policy expected ${expected}, got ${actual ?? "missing"}`);
    }
  }
  return { paths: [...expectedPaths], attributes: "text eol=lf" };
}

function verifyRuntimeLfCheckoutPolicy(workspaceRoot, { allowMissingSidecar = false } = {}) {
  const source = decodeUtf8(readPhysicalFile(workspaceRoot, ".gitattributes"), ".gitattributes");
  const policy = verifyRuntimeLfCheckoutPolicySource(source);
  for (const relativePath of RUNTIME_LF_PATHS) {
    if (allowMissingSidecar && relativePath === SIDECAR_RELATIVE_PATH) continue;
    readLfUtf8File(workspaceRoot, relativePath);
  }
  return policy;
}

export function verifyCheckedInSchema(
  workspaceRoot,
  {
    schemaPath = SCHEMA_RELATIVE_PATH,
    expectedSha256 = REVIEWED_RUNTIME_CLOSURE_SCHEMA_SHA256,
    expectedByteLength = REVIEWED_RUNTIME_CLOSURE_SCHEMA_BYTE_LENGTH
  } = {}
) {
  const { bytes, value } = readJsonFile(workspaceRoot, schemaPath, { requireLf: true });
  const actualSha256 = sha256Hex(bytes);
  if (bytes.byteLength !== expectedByteLength || actualSha256 !== expectedSha256) {
    fail(`${schemaPath} reviewed LF schema expected ${expectedByteLength} bytes / ${expectedSha256}, got ${bytes.byteLength} / ${actualSha256}`);
  }
  if (
    !value ||
    typeof value !== "object" ||
    value.$schema !== "https://json-schema.org/draft/2020-12/schema" ||
    value.$id !== "https://hakimi.local/schemas/historical-natal-runtime-closure-v1.schema.json" ||
    value.type !== "object" ||
    value.additionalProperties !== false
  ) {
    fail(`${schemaPath} does not expose the reviewed strict draft-2020-12 schema identity`);
  }
  return { path: schemaPath, lfUtf8Sha256: actualSha256, byteLength: bytes.byteLength };
}

export function buildRuntimeClosureAttestation({
  workspaceRoot = defaultWorkspaceRoot,
  roots = HISTORICAL_NATAL_RUNTIME_CLOSURE_ROOTS,
  expectedWorkspaceSourcePaths = EXPECTED_RUNTIME_WORKSPACE_SOURCE_PATHS,
  expectedWorkspaceManifestPaths = EXPECTED_RUNTIME_WORKSPACE_MANIFEST_PATHS,
  expectedExternalInstallPaths = EXPECTED_RUNTIME_EXTERNAL_INSTALL_PATHS,
  bundleResolverEvidence = null
} = {}) {
  const absoluteWorkspaceRoot = path.resolve(workspaceRoot);
  const { catalogByName, catalogByDirectory } = loadWorkspacePackageCatalog(absoluteWorkspaceRoot);
  const sourceQueue = [];
  const queuedSources = new Set();
  const sourceRecords = new Map();
  const packageQueue = [];
  const manifestStates = new Map();
  const externalQueue = [];
  const externalRequestByInstallPath = new Map();
  const externalRequirementsByInstallPath = new Map();

  function queueSource(relativePath) {
    assertCanonicalRelativePath(relativePath, "runtime source path");
    if (!queuedSources.has(relativePath) && !sourceRecords.has(relativePath)) {
      queuedSources.add(relativePath);
      sourceQueue.push(relativePath);
    }
  }

  function reachWorkspacePackage(descriptor, includeExport) {
    let state = manifestStates.get(descriptor.manifestPath);
    if (!state) {
      state = {
        descriptor,
        processed: false,
        includeExport: false,
        exportQueued: false,
        record: null
      };
      manifestStates.set(descriptor.manifestPath, state);
      packageQueue.push(state);
    }
    if (includeExport && !state.includeExport) {
      state.includeExport = true;
      if (state.processed && !state.exportQueued) packageQueue.push(state);
    }
    return state;
  }

  function queueExternal(installPath, requestName, requirement = null) {
    assertCanonicalRelativePath(installPath, `external package ${requestName} install path`);
    const derivedRequestName = installedRequestName(installPath);
    if (derivedRequestName !== requestName) {
      fail(`external alias ${requestName} did not resolve to its exact install path name: ${installPath}`);
    }
    const existing = externalRequestByInstallPath.get(installPath);
    if (existing && existing !== requestName) {
      fail(`external install path ${installPath} is ambiguously reached as ${existing} and ${requestName}`);
    }
    if (!existing) {
      externalRequestByInstallPath.set(installPath, requestName);
      externalQueue.push({ installPath, requestName });
    }
    if (requirement) {
      const requirements = externalRequirementsByInstallPath.get(installPath) ?? [];
      const normalizedRequirement = {
        request: requestName,
        range: requirement.range,
        provenanceKind: requirement.provenanceKind,
        provenance: requirement.provenance
      };
      const key = canonicalJson(normalizedRequirement);
      if (!requirements.some((entry) => canonicalJson(entry) === key)) requirements.push(normalizedRequirement);
      externalRequirementsByInstallPath.set(installPath, requirements);
    }
  }

  function resolveManifestDependency(owner, request, range) {
    const workspaceTarget = catalogByName.get(request);
    if (workspaceTarget) {
      reachWorkspacePackage(workspaceTarget, true);
      return { targetKind: "workspace-manifest", target: workspaceTarget.manifestPath };
    }
    const installPath = resolveInstalledPackagePath(
      absoluteWorkspaceRoot,
      request,
      path.resolve(absoluteWorkspaceRoot, ...owner.directoryPath.split("/"))
    );
    queueExternal(installPath, request, {
      range,
      provenanceKind: "workspace-manifest",
      provenance: owner.manifestPath
    });
    return { targetKind: "external-package", target: installPath };
  }

  function processPackageState(state) {
    const { descriptor } = state;
    if (!state.processed) {
      const { bytes, value } = readJsonFile(absoluteWorkspaceRoot, descriptor.manifestPath, { requireLf: true });
      if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${descriptor.manifestPath} must be an object`);
      if (value.name !== descriptor.manifest.name || typeof value.name !== "string") {
        fail(`${descriptor.manifestPath} package name changed during closure discovery`);
      }
      descriptor.manifest = value;
      if (typeof value.version !== "string" || value.version.length === 0) fail(`${descriptor.manifestPath} must pin a version`);
      if (typeof value.exports !== "string" || !value.exports.startsWith("./")) {
        fail(`${descriptor.manifestPath} must expose one literal relative entry`);
      }
      assertNoUnsupportedRuntimeDependencyKinds(value, descriptor.manifestPath);
      const dependencies = plainStringRecord(value.dependencies, `${descriptor.manifestPath} dependencies`);
      const dependencyRecords = Object.entries(dependencies).map(([request, range]) => ({
        request,
        range,
        ...resolveManifestDependency(descriptor, request, range)
      }));
      state.record = {
        path: descriptor.manifestPath,
        packageName: value.name,
        version: value.version,
        exports: value.exports,
        lfUtf8Sha256: sha256Hex(bytes),
        byteLength: bytes.byteLength,
        dependencies: dependencyRecords.sort((left, right) => compareText(left.request, right.request))
      };
      state.processed = true;
    }
    if (state.includeExport && !state.exportQueued) {
      state.exportQueued = true;
      queueSource(exactWorkspaceExportSource(absoluteWorkspaceRoot, descriptor, state.record.exports));
    }
  }

  for (const root of roots) {
    assertCanonicalRelativePath(root, "runtime closure root");
    assertPhysicalPath(absoluteWorkspaceRoot, root, "file", `runtime closure root ${root}`);
    const owner = ownerPackageDescriptor(root, catalogByDirectory);
    reachWorkspacePackage(owner, false);
    queueSource(root);
  }

  while (packageQueue.length > 0 || sourceQueue.length > 0) {
    while (packageQueue.length > 0) processPackageState(packageQueue.shift());
    while (sourceQueue.length > 0) {
      const sourcePath = sourceQueue.shift();
      queuedSources.delete(sourcePath);
      if (sourceRecords.has(sourcePath)) continue;
      const owner = ownerPackageDescriptor(sourcePath, catalogByDirectory);
      const ownerState = reachWorkspacePackage(owner, false);
      if (!ownerState.processed) processPackageState(ownerState);
      const { bytes, source } = readLfUtf8File(absoluteWorkspaceRoot, sourcePath);
      const dependencies = ownerState.record.dependencies;
      const declaredDependencyNames = new Set(dependencies.map((entry) => entry.request));
      const edges = analyzeRuntimeModuleDependencies(source, sourcePath).map(({ kind, specifier }) => {
        if (specifier.startsWith("./") || specifier.startsWith("../")) {
          const target = resolveRelativeTypeScriptSource(absoluteWorkspaceRoot, sourcePath, specifier);
          const targetOwner = ownerPackageDescriptor(target, catalogByDirectory);
          if (targetOwner.manifestPath !== owner.manifestPath) {
            fail(`${sourcePath} relative import ${specifier} crosses a workspace package boundary`);
          }
          queueSource(target);
          return { kind, specifier, targetKind: "workspace-source", target };
        }
        const request = packageRequestName(specifier, sourcePath);
        if (!declaredDependencyNames.has(request)) {
          fail(`${sourcePath} imports undeclared runtime dependency ${request}`);
        }
        const workspaceTarget = catalogByName.get(request);
        if (workspaceTarget) {
          if (specifier !== request) {
            fail(`${sourcePath} uses unsupported workspace package subpath ${specifier}`);
          }
          const targetState = reachWorkspacePackage(workspaceTarget, true);
          if (!targetState.processed) processPackageState(targetState);
          const target = exactWorkspaceExportSource(
            absoluteWorkspaceRoot,
            workspaceTarget,
            targetState.record.exports
          );
          queueSource(target);
          return { kind, specifier, targetKind: "workspace-source", target };
        }
        const installPath = resolveInstalledPackagePath(
          absoluteWorkspaceRoot,
          request,
          path.resolve(absoluteWorkspaceRoot, ...owner.directoryPath.split("/"))
        );
        queueExternal(installPath, request);
        return { kind, specifier, targetKind: "external-package", target: installPath };
      });
      edges.sort((left, right) =>
        compareText(left.kind, right.kind) ||
        compareText(left.specifier, right.specifier) ||
        compareText(left.targetKind, right.targetKind) ||
        compareText(left.target, right.target)
      );
      sourceRecords.set(sourcePath, {
        path: sourcePath,
        packageManifestPath: owner.manifestPath,
        lfUtf8Sha256: sha256Hex(bytes),
        byteLength: bytes.byteLength,
        edges
      });
    }
  }

  const lock = readJsonFile(absoluteWorkspaceRoot, "package-lock.json").value;
  if (!lock || typeof lock !== "object" || !lock.packages || typeof lock.packages !== "object") {
    fail("package-lock.json must contain a packages map");
  }
  for (const state of manifestStates.values()) {
    const packageLockPath = state.descriptor.directoryPath;
    const lockEntry = lock.packages[packageLockPath];
    if (!lockEntry || typeof lockEntry !== "object" || Array.isArray(lockEntry)) {
      fail(`package-lock.json is missing workspace importer ${packageLockPath}`);
    }
    const lockDependencies = plainStringRecord(
      lockEntry.dependencies,
      `${packageLockPath} workspace lock dependencies`
    );
    const manifestDependencies = Object.fromEntries(
      state.record.dependencies.map((dependency) => [dependency.request, dependency.range])
    );
    if (
      lockEntry.name !== state.record.packageName ||
      lockEntry.version !== state.record.version ||
      canonicalJson(lockDependencies) !== canonicalJson(sortRecord(manifestDependencies))
    ) {
      fail(`${packageLockPath} workspace lock importer does not exactly match ${state.record.path}`);
    }
    assertNoUnsupportedRuntimeDependencyKinds(lockEntry, `${packageLockPath} workspace lock importer`);
    state.record.packageLockPath = packageLockPath;
  }
  const externalRecords = new Map();
  while (externalQueue.length > 0) {
    const { installPath, requestName } = externalQueue.shift();
    if (externalRecords.has(installPath)) continue;
    const lockEntry = lock.packages[installPath];
    if (!lockEntry || typeof lockEntry !== "object" || Array.isArray(lockEntry)) {
      fail(`package-lock.json is missing exact external entry ${installPath}`);
    }
    const manifestPath = `${installPath}/package.json`;
    const installedManifest = readJsonFile(absoluteWorkspaceRoot, manifestPath).value;
    if (!installedManifest || typeof installedManifest !== "object" || Array.isArray(installedManifest)) {
      fail(`${manifestPath} must contain an object`);
    }
    if (typeof lockEntry.version !== "string" || lockEntry.version.length === 0) fail(`${installPath} lock version is missing`);
    assertRegistryResolvedUrl(lockEntry.resolved, `${installPath} lock resolved URL`);
    assertSri(lockEntry.integrity, `${installPath} lock SRI`);
    if (installedManifest.version !== lockEntry.version) {
      fail(`${installPath} installed version ${installedManifest.version} does not match lock ${lockEntry.version}`);
    }
    if (installedRequestName(installPath) !== requestName) {
      fail(`${installPath} cannot be re-derived from importer dependency request ${requestName}`);
    }
    if (installedManifest.name !== requestName && lockEntry.name !== installedManifest.name) {
      fail(`${installPath} alias lock entry must name installed package ${installedManifest.name}`);
    }
    const packageName = lockEntry.name ?? installedManifest.name;
    if (typeof packageName !== "string" || installedManifest.name !== packageName) {
      fail(`${installPath} installed package name does not match its lock alias identity`);
    }
    const lockDependencies = plainStringRecord(lockEntry.dependencies, `${installPath} lock dependencies`);
    const manifestDependencies = plainStringRecord(installedManifest.dependencies, `${manifestPath} dependencies`);
    assertNoUnsupportedRuntimeDependencyKinds(lockEntry, `${installPath} lock entry`);
    assertNoUnsupportedRuntimeDependencyKinds(installedManifest, manifestPath);
    if (canonicalJson(lockDependencies) !== canonicalJson(manifestDependencies)) {
      fail(`${installPath} installed dependency edges do not exactly match package-lock.json`);
    }
    const dependencyEdges = Object.entries(lockDependencies).map(([request, range]) => {
      const targetInstallPath = resolveInstalledPackagePath(
        absoluteWorkspaceRoot,
        request,
        path.resolve(absoluteWorkspaceRoot, ...installPath.split("/"))
      );
      queueExternal(targetInstallPath, request, {
        range,
        provenanceKind: "external-lock",
        provenance: installPath
      });
      return { request, range, targetInstallPath };
    }).sort((left, right) => compareText(left.request, right.request));
    externalRecords.set(installPath, {
      installPath,
      requestName,
      packageName,
      version: lockEntry.version,
      resolved: lockEntry.resolved,
      integrity: lockEntry.integrity,
      dependencyEdges,
      installedTree: aggregateInstalledPackageTree(path.resolve(absoluteWorkspaceRoot, ...installPath.split("/")))
    });
  }

  for (const [installPath, requirements] of externalRequirementsByInstallPath) {
    const installed = externalRecords.get(installPath);
    if (!installed) fail(`${installPath} has importer requirements but no external closure record`);
    for (const requirement of requirements) {
      assertExternalRequirementMatchesInstalled(requirement, installed.packageName, installed.version);
    }
  }

  const workspaceSources = [...sourceRecords.values()].sort((left, right) => compareText(left.path, right.path));
  const workspaceManifests = [...manifestStates.values()]
    .map((state) => state.record)
    .sort((left, right) => compareText(left.path, right.path));
  const externalPackages = [...externalRecords.values()].sort((left, right) => compareText(left.installPath, right.installPath));
  if (expectedWorkspaceSourcePaths) {
    exactSortedSet(workspaceSources.map((entry) => entry.path), expectedWorkspaceSourcePaths, "workspace runtime source closure");
  }
  if (expectedWorkspaceManifestPaths) {
    exactSortedSet(workspaceManifests.map((entry) => entry.path), expectedWorkspaceManifestPaths, "workspace runtime manifest closure");
  }
  if (expectedExternalInstallPaths) {
    exactSortedSet(externalPackages.map((entry) => entry.installPath), expectedExternalInstallPaths, "external runtime package closure");
  }
  const bundleResolver = bundleResolverEvidence ??
    buildBundleResolverEvidence(absoluteWorkspaceRoot, catalogByName, manifestStates);

  const body = {
    $schema: SIDECAR_SCHEMA_REFERENCE,
    schemaVersion: "1.0.0",
    gate: GATE_ID,
    scope: EVIDENCE_SCOPE,
    roots: [...roots].sort(compareText),
    workspaceSources,
    workspaceManifests,
    bundleResolver,
    externalPackages
  };
  return {
    ...body,
    overallSha256: domainSeparatedCanonicalSha256("hakimi-historical-natal-runtime-closure-v1", body)
  };
}

function assertObjectKeys(value, expectedKeys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    fail(`${label} must be a plain object`);
  }
  const actual = Object.keys(value).sort(compareText);
  const expected = [...expectedKeys].sort(compareText);
  if (canonicalJson(actual) !== canonicalJson(expected)) {
    fail(`${label} keys expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) fail(`${label} must be a non-empty string`);
}

function assertPackageRequest(value, label) {
  assertNonEmptyString(value, label);
  if (packageRequestName(value, label) !== value) fail(`${label} must be one exact package request name`);
  if (!/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/u.test(value)) {
    fail(`${label} must use canonical lowercase npm package-name syntax`);
  }
}

function assertSha256(value, label) {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/u.test(value)) fail(`${label} must be a lowercase SHA-256 hex digest`);
}

function assertSri(value, label) {
  if (typeof value !== "string") fail(`${label} must be an SRI digest`);
  const match = /^(sha256|sha384|sha512)-([A-Za-z0-9+/]+={0,2})$/u.exec(value);
  if (!match) fail(`${label} must be an SRI digest`);
  const decoded = Buffer.from(match[2], "base64");
  const expectedBytes = { sha256: 32, sha384: 48, sha512: 64 }[match[1]];
  if (decoded.byteLength !== expectedBytes || decoded.toString("base64") !== match[2]) {
    fail(`${label} has a non-canonical or wrong-length SRI payload`);
  }
}

function assertRegistryResolvedUrl(value, label) {
  assertNonEmptyString(value, label);
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail(`${label} must be an absolute registry URL`);
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "registry.npmjs.org" ||
    parsed.username ||
    parsed.password ||
    parsed.hash
  ) {
    fail(`${label} must be an uncredentialed HTTPS registry.npmjs.org URL without a fragment`);
  }
}

function assertPositiveInteger(value, label, allowZero = false) {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) fail(`${label} must be a safe integer`);
}

function assertArray(value, label) {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
}

function assertCanonicalSortedUniqueRecords(values, label, keyForValue) {
  const keys = values.map((value, index) => {
    const key = keyForValue(value, index);
    if (typeof key !== "string") fail(`${label}[${index}] does not have a canonical string key`);
    return key;
  });
  assertWindowsCaseFoldUnique(keys, label);
  const sorted = [...keys].sort(compareText);
  if (canonicalJson(keys) !== canonicalJson(sorted)) {
    fail(`${label} must be in canonical sorted order`);
  }
}

export function assertRuntimeClosureAttestationShape(value) {
  assertObjectKeys(value, [
    "$schema",
    "schemaVersion",
    "gate",
    "scope",
    "roots",
    "workspaceSources",
    "workspaceManifests",
    "bundleResolver",
    "externalPackages",
    "overallSha256"
  ], "runtime closure sidecar");
  if (value.$schema !== SIDECAR_SCHEMA_REFERENCE) fail("runtime closure sidecar schema reference changed");
  if (value.schemaVersion !== "1.0.0") fail("runtime closure sidecar schema version changed");
  if (value.gate !== GATE_ID) fail("runtime closure sidecar gate identity changed");
  if (value.scope !== EVIDENCE_SCOPE) fail("runtime closure sidecar evidence scope changed");
  assertArray(value.roots, "runtime closure roots");
  for (const [index, root] of value.roots.entries()) assertCanonicalRelativePath(root, `runtime closure roots[${index}]`);
  assertCanonicalSortedUniqueRecords(value.roots, "runtime closure roots", (root) => root);
  assertArray(value.workspaceSources, "workspaceSources");
  for (const [index, source] of value.workspaceSources.entries()) {
    const label = `workspaceSources[${index}]`;
    assertObjectKeys(source, ["path", "packageManifestPath", "lfUtf8Sha256", "byteLength", "edges"], label);
    assertCanonicalRelativePath(source.path, `${label}.path`);
    assertCanonicalRelativePath(source.packageManifestPath, `${label}.packageManifestPath`);
    assertSha256(source.lfUtf8Sha256, `${label}.lfUtf8Sha256`);
    assertPositiveInteger(source.byteLength, `${label}.byteLength`);
    assertArray(source.edges, `${label}.edges`);
    for (const [edgeIndex, edge] of source.edges.entries()) {
      const edgeLabel = `${label}.edges[${edgeIndex}]`;
      assertObjectKeys(edge, ["kind", "specifier", "targetKind", "target"], edgeLabel);
      if (!["static-import", "static-export", "dynamic-import"].includes(edge.kind)) fail(`${edgeLabel}.kind is unsupported`);
      assertNonEmptyString(edge.specifier, `${edgeLabel}.specifier`);
      if (!["workspace-source", "external-package"].includes(edge.targetKind)) fail(`${edgeLabel}.targetKind is unsupported`);
      assertCanonicalRelativePath(edge.target, `${edgeLabel}.target`);
    }
    assertCanonicalSortedUniqueRecords(
      source.edges,
      `${label}.edges`,
      (edge) => `${edge.kind}\0${edge.specifier}\0${edge.targetKind}\0${edge.target}`
    );
  }
  assertCanonicalSortedUniqueRecords(value.workspaceSources, "workspaceSources", (source) => source.path);
  assertArray(value.workspaceManifests, "workspaceManifests");
  for (const [index, manifest] of value.workspaceManifests.entries()) {
    const label = `workspaceManifests[${index}]`;
    assertObjectKeys(manifest, [
      "path", "packageLockPath", "packageName", "version", "exports", "lfUtf8Sha256", "byteLength", "dependencies"
    ], label);
    assertCanonicalRelativePath(manifest.path, `${label}.path`);
    assertCanonicalRelativePath(manifest.packageLockPath, `${label}.packageLockPath`);
    assertPackageRequest(manifest.packageName, `${label}.packageName`);
    assertNonEmptyString(manifest.version, `${label}.version`);
    assertNonEmptyString(manifest.exports, `${label}.exports`);
    assertSha256(manifest.lfUtf8Sha256, `${label}.lfUtf8Sha256`);
    assertPositiveInteger(manifest.byteLength, `${label}.byteLength`);
    assertArray(manifest.dependencies, `${label}.dependencies`);
    for (const [dependencyIndex, dependency] of manifest.dependencies.entries()) {
      const dependencyLabel = `${label}.dependencies[${dependencyIndex}]`;
      assertObjectKeys(dependency, ["request", "range", "targetKind", "target"], dependencyLabel);
      assertPackageRequest(dependency.request, `${dependencyLabel}.request`);
      assertNonEmptyString(dependency.range, `${dependencyLabel}.range`);
      if (!["workspace-manifest", "external-package"].includes(dependency.targetKind)) {
        fail(`${dependencyLabel}.targetKind is unsupported`);
      }
      assertCanonicalRelativePath(dependency.target, `${dependencyLabel}.target`);
    }
    assertCanonicalSortedUniqueRecords(manifest.dependencies, `${label}.dependencies`, (dependency) => dependency.request);
  }
  assertCanonicalSortedUniqueRecords(value.workspaceManifests, "workspaceManifests", (manifest) => manifest.path);
  const bundle = value.bundleResolver;
  assertObjectKeys(bundle, [
    "configFiles",
    "aliases",
    "scriptManifests",
    "rootBundleScripts",
    "webBundleScripts",
    "rootPrehookCommand",
    "webPrehookCommand"
  ], "bundleResolver");
  assertArray(bundle.configFiles, "bundleResolver.configFiles");
  for (const [index, configFile] of bundle.configFiles.entries()) {
    const label = `bundleResolver.configFiles[${index}]`;
    assertObjectKeys(configFile, ["path", "lfUtf8Sha256", "byteLength", "baseBinding"], label);
    assertCanonicalRelativePath(configFile.path, `${label}.path`);
    assertSha256(configFile.lfUtf8Sha256, `${label}.lfUtf8Sha256`);
    assertPositiveInteger(configFile.byteLength, `${label}.byteLength`);
    if (!["defines-createWebViteConfig", "createWebViteConfig", "default"].includes(configFile.baseBinding)) {
      fail(`${label}.baseBinding is unsupported`);
    }
  }
  assertCanonicalSortedUniqueRecords(bundle.configFiles, "bundleResolver.configFiles", (entry) => entry.path);
  exactSortedSet(
    bundle.configFiles.map((entry) => entry.path),
    HISTORICAL_RUNTIME_BUNDLE_CONFIG_PATHS,
    "bundle resolver config files"
  );
  assertArray(bundle.aliases, "bundleResolver.aliases");
  for (const [index, alias] of bundle.aliases.entries()) {
    const label = `bundleResolver.aliases[${index}]`;
    assertObjectKeys(alias, ["specifier", "manifestPath", "manifestExport", "target"], label);
    assertPackageRequest(alias.specifier, `${label}.specifier`);
    assertCanonicalRelativePath(alias.manifestPath, `${label}.manifestPath`);
    assertNonEmptyString(alias.manifestExport, `${label}.manifestExport`);
    if (!alias.manifestExport.startsWith("./")) fail(`${label}.manifestExport must be relative`);
    assertCanonicalRelativePath(alias.manifestExport.slice(2), `${label}.manifestExport`);
    assertCanonicalRelativePath(alias.target, `${label}.target`);
  }
  assertCanonicalSortedUniqueRecords(bundle.aliases, "bundleResolver.aliases", (entry) => entry.specifier);
  exactSortedSet(
    bundle.aliases.map((entry) => entry.specifier),
    HISTORICAL_RUNTIME_VITE_ALIASES,
    "bundle resolver aliases"
  );
  assertArray(bundle.scriptManifests, "bundleResolver.scriptManifests");
  for (const [index, manifest] of bundle.scriptManifests.entries()) {
    const label = `bundleResolver.scriptManifests[${index}]`;
    assertObjectKeys(manifest, ["path", "lfUtf8Sha256", "byteLength"], label);
    assertCanonicalRelativePath(manifest.path, `${label}.path`);
    assertSha256(manifest.lfUtf8Sha256, `${label}.lfUtf8Sha256`);
    assertPositiveInteger(manifest.byteLength, `${label}.byteLength`);
  }
  assertCanonicalSortedUniqueRecords(bundle.scriptManifests, "bundleResolver.scriptManifests", (entry) => entry.path);
  exactSortedSet(
    bundle.scriptManifests.map((entry) => entry.path),
    HISTORICAL_RUNTIME_SCRIPT_MANIFEST_PATHS,
    "bundle script manifests"
  );
  assertArray(bundle.rootBundleScripts, "bundleResolver.rootBundleScripts");
  assertArray(bundle.webBundleScripts, "bundleResolver.webBundleScripts");
  exactSortedSet(bundle.rootBundleScripts, EXPECTED_ROOT_WEB_BUNDLE_SCRIPTS, "bundleResolver root scripts");
  exactSortedSet(bundle.webBundleScripts, EXPECTED_WEB_VITE_BUNDLE_SCRIPTS, "bundleResolver web scripts");
  if (bundle.rootPrehookCommand !== ROOT_BUILD_PREHOOK_COMMAND) fail("bundleResolver root prehook command changed");
  if (bundle.webPrehookCommand !== WEB_BUILD_PREHOOK_COMMAND) fail("bundleResolver web prehook command changed");
  assertArray(value.externalPackages, "externalPackages");
  for (const [index, external] of value.externalPackages.entries()) {
    const label = `externalPackages[${index}]`;
    assertObjectKeys(external, [
      "installPath", "requestName", "packageName", "version", "resolved", "integrity",
      "dependencyEdges", "installedTree"
    ], label);
    assertCanonicalRelativePath(external.installPath, `${label}.installPath`);
    assertPackageRequest(external.requestName, `${label}.requestName`);
    assertPackageRequest(external.packageName, `${label}.packageName`);
    assertNonEmptyString(external.version, `${label}.version`);
    assertRegistryResolvedUrl(external.resolved, `${label}.resolved`);
    assertSri(external.integrity, `${label}.integrity`);
    assertArray(external.dependencyEdges, `${label}.dependencyEdges`);
    for (const [dependencyIndex, dependency] of external.dependencyEdges.entries()) {
      const dependencyLabel = `${label}.dependencyEdges[${dependencyIndex}]`;
      assertObjectKeys(dependency, ["request", "range", "targetInstallPath"], dependencyLabel);
      assertPackageRequest(dependency.request, `${dependencyLabel}.request`);
      assertNonEmptyString(dependency.range, `${dependencyLabel}.range`);
      assertCanonicalRelativePath(dependency.targetInstallPath, `${dependencyLabel}.targetInstallPath`);
    }
    assertCanonicalSortedUniqueRecords(
      external.dependencyEdges,
      `${label}.dependencyEdges`,
      (dependency) => dependency.request
    );
    assertObjectKeys(external.installedTree, ["sha256", "fileCount", "directoryCount", "byteLength"], `${label}.installedTree`);
    assertSha256(external.installedTree.sha256, `${label}.installedTree.sha256`);
    assertPositiveInteger(external.installedTree.fileCount, `${label}.installedTree.fileCount`);
    assertPositiveInteger(external.installedTree.directoryCount, `${label}.installedTree.directoryCount`, true);
    assertPositiveInteger(external.installedTree.byteLength, `${label}.installedTree.byteLength`);
  }
  assertCanonicalSortedUniqueRecords(value.externalPackages, "externalPackages", (external) => external.installPath);
  const sourcePaths = new Set(value.workspaceSources.map((source) => source.path));
  const manifestPaths = new Set(value.workspaceManifests.map((manifest) => manifest.path));
  const externalPaths = new Set(value.externalPackages.map((external) => external.installPath));
  for (const root of value.roots) {
    if (!sourcePaths.has(root)) fail(`runtime closure root is not present in workspaceSources: ${root}`);
  }
  for (const source of value.workspaceSources) {
    if (!manifestPaths.has(source.packageManifestPath)) {
      fail(`${source.path} refers to missing owner manifest ${source.packageManifestPath}`);
    }
    for (const edge of source.edges) {
      const targets = edge.targetKind === "workspace-source" ? sourcePaths : externalPaths;
      if (!targets.has(edge.target)) fail(`${source.path} edge refers to missing ${edge.targetKind} ${edge.target}`);
    }
  }
  for (const manifest of value.workspaceManifests) {
    for (const dependency of manifest.dependencies) {
      const targets = dependency.targetKind === "workspace-manifest" ? manifestPaths : externalPaths;
      if (!targets.has(dependency.target)) {
        fail(`${manifest.path} dependency refers to missing ${dependency.targetKind} ${dependency.target}`);
      }
    }
  }
  const manifestByPath = new Map(value.workspaceManifests.map((manifest) => [manifest.path, manifest]));
  for (const alias of bundle.aliases) {
    const manifest = manifestByPath.get(alias.manifestPath);
    if (!manifest) fail(`bundle alias ${alias.specifier} refers to missing manifest ${alias.manifestPath}`);
    const expectedTarget = path.posix.normalize(path.posix.join(path.posix.dirname(manifest.path), manifest.exports));
    if (alias.manifestExport !== manifest.exports || alias.target !== expectedTarget) {
      fail(`bundle alias ${alias.specifier} does not equal its workspace manifest export`);
    }
    if (!sourcePaths.has(alias.target)) {
      fail(`bundle alias ${alias.specifier} target is not in workspaceSources: ${alias.target}`);
    }
  }
  for (const external of value.externalPackages) {
    if (installedRequestName(external.installPath) !== external.requestName) {
      fail(`${external.installPath} does not match sidecar requestName ${external.requestName}`);
    }
    for (const dependency of external.dependencyEdges) {
      if (!externalPaths.has(dependency.targetInstallPath)) {
        fail(`${external.installPath} dependency refers to missing external package ${dependency.targetInstallPath}`);
      }
    }
  }
  assertSha256(value.overallSha256, "runtime closure sidecar overallSha256");
  const { overallSha256, ...body } = value;
  const recomputed = domainSeparatedCanonicalSha256("hakimi-historical-natal-runtime-closure-v1", body);
  if (overallSha256 !== recomputed) {
    fail(`runtime closure sidecar overall SHA-256 expected ${overallSha256}, recomputed ${recomputed}`);
  }
  return value;
}

function firstDifference(left, right, location = "$sidecar") {
  if (Object.is(left, right)) return null;
  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) return `${location}.length expected ${left.length}, got ${right.length}`;
    for (let index = 0; index < left.length; index += 1) {
      const difference = firstDifference(left[index], right[index], `${location}[${index}]`);
      if (difference) return difference;
    }
    return null;
  }
  if (
    left && right && typeof left === "object" && typeof right === "object" &&
    !Array.isArray(left) && !Array.isArray(right)
  ) {
    const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort(compareText);
    for (const key of keys) {
      if (!Object.hasOwn(left, key)) return `${location}.${key} is newly present`;
      if (!Object.hasOwn(right, key)) return `${location}.${key} is missing`;
      const difference = firstDifference(left[key], right[key], `${location}.${key}`);
      if (difference) return difference;
    }
    return null;
  }
  return `${location} expected ${JSON.stringify(left)}, got ${JSON.stringify(right)}`;
}

export function verifyAttestationAgainstCurrentState({
  workspaceRoot = defaultWorkspaceRoot,
  sidecarPath = SIDECAR_RELATIVE_PATH,
  validateProductShape = true,
  ...buildOptions
} = {}) {
  const bytes = readPhysicalFile(workspaceRoot, sidecarPath, sidecarPath);
  if (bytes.byteLength > MAX_SIDECAR_BYTES) fail(`${sidecarPath} exceeds ${MAX_SIDECAR_BYTES} bytes`);
  const source = decodeUtf8(bytes, sidecarPath, { requireLf: true });
  const parsed = parseJsonSource(source, sidecarPath);
  const expected = validateProductShape ? assertRuntimeClosureAttestationShape(parsed) : parsed;
  const actual = buildRuntimeClosureAttestation({ workspaceRoot, ...buildOptions });
  const difference = firstDifference(expected, actual);
  if (difference) fail(`checked-in sidecar does not match current state: ${difference}`);
  return actual;
}

export function writeRuntimeClosureAttestation({
  workspaceRoot = defaultWorkspaceRoot,
  sidecarPath = SIDECAR_RELATIVE_PATH,
  ...buildOptions
} = {}) {
  const attestation = buildRuntimeClosureAttestation({ workspaceRoot, ...buildOptions });
  assertCanonicalRelativePath(sidecarPath, "runtime closure sidecar output");
  const absolutePath = path.resolve(workspaceRoot, ...sidecarPath.split("/"));
  assertInsideRoot(path.resolve(workspaceRoot), absolutePath, "runtime closure sidecar output");
  const parentPath = path.posix.dirname(sidecarPath);
  assertPhysicalPath(workspaceRoot, parentPath, "directory", "runtime closure sidecar output parent");
  if (pathExists(absolutePath)) {
    assertPhysicalPath(workspaceRoot, sidecarPath, "file", "runtime closure sidecar output");
  }
  writeFileSync(absolutePath, `${JSON.stringify(attestation, null, 2)}\n`, { encoding: "utf8", flag: "w" });
  return attestation;
}

export function parseCliMode(arguments_) {
  if (arguments_.length === 0 || (arguments_.length === 1 && arguments_[0] === "--check")) return "check";
  if (arguments_.length === 1 && arguments_[0] === "--write") return "write";
  fail(
    `usage: node ${VERIFIER_RELATIVE_PATH} [--check|--write] or ` +
    `--check --resolved-vite-aliases-json <json> --resolved-vite-alias-resolutions-json <json>`
  );
}

export function parseCliArguments(arguments_) {
  if (arguments_.length === 0 || arguments_.length === 1) {
    return {
      mode: parseCliMode(arguments_),
      resolvedViteAliases: null,
      resolvedViteAliasResolutions: null
    };
  }
  if (arguments_[0] !== "--check" || arguments_.length % 2 !== 1) {
    return parseCliMode(arguments_);
  }

  const payloads = new Map();
  for (let index = 1; index < arguments_.length; index += 2) {
    const flag = arguments_[index];
    const payload = arguments_[index + 1];
    if (
      flag !== "--resolved-vite-aliases-json" &&
      flag !== "--resolved-vite-alias-resolutions-json"
    ) {
      return parseCliMode(arguments_);
    }
    if (payloads.has(flag)) fail(`CLI option ${flag} must appear exactly once`);
    if (payload.length > 64 * 1024) fail(`${flag} JSON exceeds 65536 characters`);
    payloads.set(flag, payload);
  }

  const aliasesJson = payloads.get("--resolved-vite-aliases-json");
  const resolutionsJson = payloads.get("--resolved-vite-alias-resolutions-json");
  if ((aliasesJson === undefined) !== (resolutionsJson === undefined)) {
    fail("resolved Vite alias table and resolution CLI payloads must be provided together");
  }
  if (aliasesJson === undefined) return parseCliMode(arguments_);

  const aliases = parseJsonSource(aliasesJson, "resolved Vite alias CLI payload");
  if (!Array.isArray(aliases)) fail("resolved Vite alias CLI payload must be an array");
  const resolutions = parseJsonSource(
    resolutionsJson,
    "resolved Vite alias resolution CLI payload"
  );
  if (!Array.isArray(resolutions)) fail("resolved Vite alias resolution CLI payload must be an array");
  return {
    mode: "check",
    resolvedViteAliases: aliases,
    resolvedViteAliasResolutions: resolutions
  };
}

export function verifyHistoricalNatalRuntimeClosure({
  workspaceRoot = defaultWorkspaceRoot,
  mode = "check",
  resolvedViteAliases = null,
  resolvedViteAliasResolutions = null
} = {}) {
  if (mode !== "check" && mode !== "write") fail(`unsupported runtime-closure mode ${JSON.stringify(mode)}`);
  if ((resolvedViteAliases === null) !== (resolvedViteAliasResolutions === null)) {
    fail("resolved Vite alias table and resolution payloads must be provided together");
  }
  if (mode === "write" && resolvedViteAliases !== null) {
    fail("write mode must not accept resolved Vite alias payloads");
  }
  verifyCheckedInSchema(workspaceRoot);
  const checkoutPolicy = verifyRuntimeLfCheckoutPolicy(workspaceRoot, { allowMissingSidecar: mode === "write" });
  const attestation = mode === "write"
    ? writeRuntimeClosureAttestation({ workspaceRoot })
    : verifyAttestationAgainstCurrentState({ workspaceRoot });
  if (mode === "write") readLfUtf8File(workspaceRoot, SIDECAR_RELATIVE_PATH);
  if (resolvedViteAliases !== null) {
    const attestedAliasTargets = Object.fromEntries(
      attestation.bundleResolver.aliases.map((alias) => [alias.specifier, alias.target])
    );
    verifyResolvedHistoricalRuntimeAliases(resolvedViteAliases, workspaceRoot, attestedAliasTargets);
    verifyResolvedHistoricalRuntimeAliasResolutions(
      resolvedViteAliasResolutions,
      workspaceRoot,
      attestedAliasTargets
    );
  }
  const installedFileCount = attestation.externalPackages.reduce(
    (total, entry) => total + entry.installedTree.fileCount,
    0
  );
  const installedByteLength = attestation.externalPackages.reduce(
    (total, entry) => total + entry.installedTree.byteLength,
    0
  );
  return {
    gate: GATE_ID,
    status: mode === "write" ? "written" : "passed",
    mode,
    evidenceScope: EVIDENCE_SCOPE,
    roots: attestation.roots,
    workspaceSourceCount: attestation.workspaceSources.length,
    workspaceManifestCount: attestation.workspaceManifests.length,
    externalPackageCount: attestation.externalPackages.length,
    installedFileCount,
    installedByteLength,
    overallSha256: attestation.overallSha256,
    resolvedViteAliasesChecked: resolvedViteAliases !== null,
    resolvedViteAliasResolutionsChecked: resolvedViteAliasResolutions !== null,
    checkoutPolicy
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const arguments_ = parseCliArguments(process.argv.slice(2));
  console.log(JSON.stringify(verifyHistoricalNatalRuntimeClosure(arguments_), null, 2));
}
