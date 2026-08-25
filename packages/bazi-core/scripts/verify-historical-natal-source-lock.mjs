import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "@babel/parser";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDirectory, "../../..");

const EXPECTED_LUNAR_TYPESCRIPT = Object.freeze({
  version: "1.8.6",
  integrity: "sha512-5Eo4T/cnuXfrgO4k5LCpOGHIUOuz5hCF/IfNv0T29WY2shR36Hiz+ecN9WjnUuxUKhql9gbOkPaQoqLFKtPRNA=="
});

const EXPECTED_BABEL_PARSER = Object.freeze({
  version: "7.29.8",
  integrity: "sha512-E8lTAYNB1KW+FH+VGJuZM1ioAx2E6oVlvQFRrf5P8ZZmsiJXYAD9vTFV7yyEURNzgh1dFqMZuO6tUwcARbqFCA=="
});

const SOURCE_LOCK = Object.freeze([
  Object.freeze({
    relativePath: "packages/bazi-core/src/historical-natal-chart-executor-0.4.0.ts",
    sha256: "09ce6e7516e38359ed37c7bc4b71c27c00f0be21244c2ecefd3966ff89450117",
    directImports: Object.freeze([
      "@hakimi/contracts",
      "@hakimi/integrity",
      "@hakimi/luck-core",
      "@hakimi/time-core",
      "./unsupported-calculation-error",
      "lunar-typescript"
    ])
  }),
  Object.freeze({
    relativePath: "packages/bazi-core/src/unsupported-calculation-error.ts",
    sha256: "3427769eaedd105af4a1ce7856cd91dfeb1f277529bf1412c750efb9ceba018e",
    directImports: Object.freeze([])
  })
]);

const FORBIDDEN_CURRENT_ENTRY_IMPORTS = new Set([
  "@hakimi/bazi-core",
  "./index",
  "./index.ts",
  "../index",
  "../index.ts"
]);

const LF_CHECKOUT_PATHS = Object.freeze([
  "packages/bazi-core/src/historical-natal-chart-executor-0.4.0.ts",
  "packages/bazi-core/src/unsupported-calculation-error.ts",
  "packages/bazi-core/src/index.ts",
  "packages/bazi-core/scripts/verify-historical-natal-source-lock.mjs"
]);

function fail(message) {
  throw new Error(`Historical natal executor source-lock gate failed: ${message}`);
}

function readLfUtf8Source(relativePath) {
  const absolutePath = path.resolve(workspaceRoot, relativePath);
  const bytes = readFileSync(absolutePath);
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail(`${relativePath} must not contain a UTF-8 BOM`);
  }
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail(`${relativePath} is not valid UTF-8`);
  }
  if (source.includes("\r")) {
    fail(`${relativePath} must use LF line endings only`);
  }
  if (!source.endsWith("\n")) {
    fail(`${relativePath} must end with one LF newline`);
  }
  return { bytes, source };
}

function parseTypeScriptSource(source, relativePath) {
  try {
    return parse(source, {
      sourceFilename: relativePath,
      sourceType: "module",
      plugins: relativePath.endsWith(".tsx") ? ["typescript", "jsx"] : ["typescript"],
      errorRecovery: false,
      attachComment: false
    });
  } catch (cause) {
    fail(`${relativePath} is not valid TypeScript: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
}

function stringModuleSpecifier(node, relativePath) {
  if (!node || node.type !== "StringLiteral") {
    fail(`${relativePath} contains a non-literal module specifier`);
  }
  return node.value;
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

export function analyzeStaticModuleDependencies(source, relativePath = "inline-source.ts") {
  const file = parseTypeScriptSource(source, relativePath);
  const specifiers = [];
  for (const statement of file.program.body) {
    if (statement.type === "ImportDeclaration") {
      specifiers.push(stringModuleSpecifier(statement.source, relativePath));
    } else if (
      (statement.type === "ExportNamedDeclaration" || statement.type === "ExportAllDeclaration") &&
      statement.source
    ) {
      specifiers.push(stringModuleSpecifier(statement.source, relativePath));
    } else if (statement.type === "TSImportEqualsDeclaration") {
      fail(`${relativePath} must not use import-equals or external-module-reference syntax`);
    }
  }

  walkAst(file.program, (node) => {
    if (node.type === "ImportExpression") {
      fail(`${relativePath} must not use dynamic import()`);
    }
    if (node.type === "CallExpression") {
      if (node.callee?.type === "Import") fail(`${relativePath} must not use dynamic import()`);
      if (node.callee?.type === "Identifier" && node.callee.name === "require") {
        fail(`${relativePath} must not use require()`);
      }
    }
  });
  return specifiers;
}

function assertExactStringSet(actualValues, expectedValues, label) {
  const actual = [...new Set(actualValues)].sort();
  const expected = [...new Set(expectedValues)].sort();
  if (actualValues.length !== actual.length || JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${label} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actualValues)}`);
  }
}

function verifySourceEntry(entry) {
  const { bytes, source } = readLfUtf8Source(entry.relativePath);
  const actualSha256 = createHash("sha256").update(bytes).digest("hex");
  if (actualSha256 !== entry.sha256) {
    fail(`${entry.relativePath} LF UTF-8 SHA-256 expected ${entry.sha256}, got ${actualSha256}`);
  }
  const imports = analyzeStaticModuleDependencies(source, entry.relativePath);
  assertExactStringSet(imports, entry.directImports, `${entry.relativePath} direct imports`);
  for (const specifier of imports) {
    if (FORBIDDEN_CURRENT_ENTRY_IMPORTS.has(specifier)) {
      fail(`${entry.relativePath} imports the current bazi-core entry ${specifier}`);
    }
  }
  return {
    path: entry.relativePath,
    lfUtf8Sha256: actualSha256,
    byteLength: bytes.byteLength,
    directImports: imports.sort()
  };
}

function verifyLunarTypescriptIdentity() {
  const rootManifest = JSON.parse(readFileSync(path.resolve(workspaceRoot, "package.json"), "utf8"));
  const packageManifest = JSON.parse(readFileSync(path.resolve(workspaceRoot, "packages/bazi-core/package.json"), "utf8"));
  const lock = JSON.parse(readFileSync(path.resolve(workspaceRoot, "package-lock.json"), "utf8"));
  const installed = JSON.parse(readFileSync(path.resolve(workspaceRoot, "node_modules/lunar-typescript/package.json"), "utf8"));
  const lockEntry = lock.packages?.["node_modules/lunar-typescript"];
  if (packageManifest.dependencies?.["lunar-typescript"] !== EXPECTED_LUNAR_TYPESCRIPT.version) {
    fail("@hakimi/bazi-core must depend on the exact lunar-typescript@1.8.6 version");
  }
  if (rootManifest.overrides?.["lunar-typescript"] !== EXPECTED_LUNAR_TYPESCRIPT.version) {
    fail("workspace override must pin lunar-typescript@1.8.6");
  }
  if (
    lockEntry?.version !== EXPECTED_LUNAR_TYPESCRIPT.version ||
    lockEntry?.integrity !== EXPECTED_LUNAR_TYPESCRIPT.integrity
  ) {
    fail("package-lock lunar-typescript identity/integrity does not match the reviewed 1.8.6 tarball");
  }
  if (installed.name !== "lunar-typescript" || installed.version !== EXPECTED_LUNAR_TYPESCRIPT.version) {
    fail(`installed dependency expected lunar-typescript@1.8.6, got ${installed.name}@${installed.version}`);
  }
  return {
    package: `lunar-typescript@${installed.version}`,
    packageLockIntegrity: lockEntry.integrity
  };
}

function verifyBabelParserIdentity() {
  const rootManifest = JSON.parse(readFileSync(path.resolve(workspaceRoot, "package.json"), "utf8"));
  const lock = JSON.parse(readFileSync(path.resolve(workspaceRoot, "package-lock.json"), "utf8"));
  const installed = JSON.parse(readFileSync(path.resolve(workspaceRoot, "node_modules/@babel/parser/package.json"), "utf8"));
  const lockEntry = lock.packages?.["node_modules/@babel/parser"];
  if (rootManifest.devDependencies?.["@babel/parser"] !== EXPECTED_BABEL_PARSER.version) {
    fail("workspace must directly pin @babel/parser@7.29.8 for the TypeScript AST gate");
  }
  if (lockEntry?.version !== EXPECTED_BABEL_PARSER.version || lockEntry?.integrity !== EXPECTED_BABEL_PARSER.integrity) {
    fail("package-lock @babel/parser identity/integrity does not match the reviewed 7.29.8 tarball");
  }
  if (installed.name !== "@babel/parser" || installed.version !== EXPECTED_BABEL_PARSER.version) {
    fail(`installed AST parser expected @babel/parser@7.29.8, got ${installed.name}@${installed.version}`);
  }
  return {
    package: `@babel/parser@${installed.version}`,
    packageLockIntegrity: lockEntry.integrity
  };
}

function isObjectFreezeCall(node) {
  return node?.type === "CallExpression" &&
    node.arguments.length === 1 &&
    node.callee?.type === "MemberExpression" &&
    node.callee.computed === false &&
    node.callee.object?.type === "Identifier" &&
    node.callee.object.name === "Object" &&
    node.callee.property?.type === "Identifier" &&
    node.callee.property.name === "freeze";
}

function requireObjectFreeze(node, label, relativePath) {
  if (!isObjectFreezeCall(node)) fail(`${relativePath} ${label} must be wrapped by one literal Object.freeze call`);
  return node.arguments[0];
}

function propertyNameText(name) {
  if (name?.type === "Identifier") return name.name;
  if (name?.type === "StringLiteral" || name?.type === "NumericLiteral") return String(name.value);
  return null;
}

function objectPropertyInitializer(objectLiteral, propertyName, relativePath) {
  const matches = objectLiteral.properties.filter((property) =>
    property.type === "ObjectProperty" && property.computed === false && propertyNameText(property.key) === propertyName
  );
  if (matches.length !== 1) {
    fail(`${relativePath} registry entry must contain exactly one ${propertyName} property`);
  }
  return matches[0].value;
}

export function verifyRegistryBindingSource(source, relativePath = "packages/bazi-core/src/index.ts") {
  const file = parseTypeScriptSource(source, relativePath);
  const importedLocals = new Map();
  for (const statement of file.program.body) {
    if (
      statement.type !== "ImportDeclaration" ||
      statement.source?.type !== "StringLiteral" ||
      statement.source.value !== "./historical-natal-chart-executor-0.4.0"
    ) continue;
    for (const element of statement.specifiers) {
      if (element.type !== "ImportSpecifier") {
        fail(`${relativePath} must use only named imports for the versioned 0.4.0 module`);
      }
      const importedName = element.imported.type === "Identifier" ? element.imported.name : element.imported.value;
      if (importedLocals.has(importedName)) {
        fail(`${relativePath} imports ${importedName} more than once from the versioned module`);
      }
      importedLocals.set(importedName, element.local.name);
    }
  }
  const engineLocal = importedLocals.get("HISTORICAL_NATAL_ENGINE_0_4_0");
  const calculationLocal = importedLocals.get("calculateHistoricalNatalChart040");
  if (!engineLocal || !calculationLocal) {
    fail(`${relativePath} is missing the real named imports for the 0.4.0 engine and kernel`);
  }

  const registryDeclarations = [];
  for (const statement of file.program.body) {
    const declarationStatement = statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
    if (declarationStatement?.type !== "VariableDeclaration") continue;
    for (const declaration of declarationStatement.declarations) {
      if (declaration.id?.type === "Identifier" && declaration.id.name === "HISTORICAL_NATAL_EXECUTOR_REGISTRY") {
        registryDeclarations.push({
          declaration,
          exported: statement.type === "ExportNamedDeclaration",
          declarationKind: declarationStatement.kind
        });
      }
    }
  }
  if (registryDeclarations.length !== 1 || !registryDeclarations[0].declaration.init) {
    fail(`${relativePath} must define exactly one initialized HISTORICAL_NATAL_EXECUTOR_REGISTRY`);
  }
  if (!registryDeclarations[0].exported || registryDeclarations[0].declarationKind !== "const") {
    fail(`${relativePath} HISTORICAL_NATAL_EXECUTOR_REGISTRY must remain an exported const`);
  }
  const registryArray = requireObjectFreeze(
    registryDeclarations[0].declaration.init,
    "registry initializer",
    relativePath
  );
  if (registryArray?.type !== "ArrayExpression") {
    fail(`${relativePath} registry initializer must be an Object.freeze-wrapped array literal`);
  }
  if (registryArray.elements.length !== 1) {
    fail(`${relativePath} 0.4.0 source lock expects the unchanged one-entry registry shape`);
  }
  const matchingEntries = [];
  for (const element of registryArray.elements) {
    const candidate = requireObjectFreeze(element, "registry entry", relativePath);
    if (candidate?.type !== "ObjectExpression") {
      fail(`${relativePath} registry entry must be an Object.freeze-wrapped object literal`);
    }
    const propertyNames = candidate.properties.map((property) => {
      if (property.type !== "ObjectProperty" || property.computed) {
        fail(`${relativePath} registry entry must use only static object properties`);
      }
      const name = propertyNameText(property.key);
      if (name === null) fail(`${relativePath} registry entry contains an unsupported property name`);
      return name;
    }).sort();
    if (JSON.stringify(propertyNames) !== JSON.stringify(["calculateChart", "engine", "executorId"])) {
      fail(`${relativePath} 0.4.0 registry entry shape changed: ${JSON.stringify(propertyNames)}`);
    }
    const executorId = objectPropertyInitializer(candidate, "executorId", relativePath);
    if (executorId?.type === "StringLiteral" && executorId.value === "hakimi-bazi-core:natal-chart-executor:0.4.0") {
      matchingEntries.push(candidate);
    }
  }
  if (matchingEntries.length !== 1) {
    fail(`${relativePath} registry must contain exactly one literal 0.4.0 executor entry`);
  }
  const engine = objectPropertyInitializer(matchingEntries[0], "engine", relativePath);
  const calculateChart = objectPropertyInitializer(matchingEntries[0], "calculateChart", relativePath);
  if (engine?.type !== "Identifier" || engine.name !== engineLocal) {
    fail(`${relativePath} 0.4.0 engine initializer must reference the real versioned import binding`);
  }
  if (calculateChart?.type !== "Identifier" || calculateChart.name !== calculationLocal) {
    fail(`${relativePath} 0.4.0 calculateChart initializer must reference the real versioned import binding`);
  }
  return {
    executorId: "hakimi-bazi-core:natal-chart-executor:0.4.0",
    engineBinding: engine.name,
    functionBinding: calculateChart.name
  };
}

function verifyRegistryBinding() {
  const relativePath = "packages/bazi-core/src/index.ts";
  const { source } = readLfUtf8Source(relativePath);
  return verifyRegistryBindingSource(source, relativePath);
}

export function verifyRequiredLfCheckoutPolicySource(
  source,
  expectedPaths = LF_CHECKOUT_PATHS,
  relativePath = ".gitattributes"
) {
  const entriesByPath = new Map();
  const foldedPaths = new Map();
  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const normalized = line.replace(/\s+/gu, " ");
    const [attributePath] = normalized.split(" ");
    if (entriesByPath.has(attributePath)) {
      fail(`${relativePath} contains duplicate policy entries for ${attributePath}`);
    }
    const folded = attributePath.toLocaleLowerCase("en-US");
    const previous = foldedPaths.get(folded);
    if (previous !== undefined) {
      fail(`${relativePath} contains case-fold duplicate policy entries for ${previous} and ${attributePath}`);
    }
    foldedPaths.set(folded, attributePath);
    entriesByPath.set(attributePath, normalized);
  }
  for (const expectedPath of expectedPaths) {
    const attributePath = `/${expectedPath}`;
    const expectedLine = `${attributePath} text eol=lf`;
    const actualLine = entriesByPath.get(attributePath);
    if (actualLine !== expectedLine) {
      fail(`${relativePath} LF policy expected ${expectedLine}, got ${actualLine ?? "missing"}`);
    }
  }
  return [...entriesByPath.values()];
}

function verifyLfCheckoutPolicy() {
  const attributesPath = path.resolve(workspaceRoot, ".gitattributes");
  const source = readFileSync(attributesPath, "utf8");
  verifyRequiredLfCheckoutPolicySource(source);
  for (const relativePath of LF_CHECKOUT_PATHS) {
    readLfUtf8Source(relativePath);
  }
  return { paths: [...LF_CHECKOUT_PATHS], attributes: "text eol=lf" };
}

export function verifyHistoricalNatalSourceLock() {
  return {
    gate: "hakimi-bazi-core-historical-natal-source-lock-v1",
    status: "passed",
    evidenceScope: "lf_utf8_source_lock_not_historical_binary_attestation",
    sources: SOURCE_LOCK.map(verifySourceEntry),
    checkoutPolicy: verifyLfCheckoutPolicy(),
    dependency: verifyLunarTypescriptIdentity(),
    astParser: verifyBabelParserIdentity(),
    registry: verifyRegistryBinding()
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  console.log(JSON.stringify(verifyHistoricalNatalSourceLock(), null, 2));
}
