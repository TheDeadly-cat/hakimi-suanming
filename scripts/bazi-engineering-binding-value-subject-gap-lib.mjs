import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { parse } from "@babel/parser";
import {
  parseBaziPr10bcScopeReconciliationJsonBytes,
  verifyBaziPr10bcScopeReconciliation
} from "./bazi-pr10bc-scope-reconciliation-lib.mjs";
import { verifyBaziBindingFreezeRequirements } from "./bazi-binding-freeze-requirements-lib.mjs";
import { verifyBaziEngineeringBindingCandidateLedger } from "./bazi-engineering-binding-candidate-lib.mjs";

export const BAZI_ENGINEERING_BINDING_VALUE_SUBJECT_GAP_RELATIVE_PATH =
  "content/system-admission/bazi-engineering-binding-value-subject-gaps.v1.json";

const PR10BC_RELATIVE_PATH = "content/system-admission/bazi-pr10bc-scope-reconciliation.v1.json";
const FREEZE_RELATIVE_PATH = "content/system-admission/bazi-binding-freeze-requirements.v1.json";
const ENGINEERING_RELATIVE_PATH = "content/bazi-strength-engineering-binding-candidates.v1.json";
const EXPERT_PACKET_RELATIVE_PATH = "content/bazi-strength-expert-review-packet.v1.json";
const POLICY_RELATIVE_PATH = "packages/bazi-interpretation/src/strength-policy.ts";
const CORE_RELATIVE_PATH = "packages/bazi-interpretation/src/strength-assessment-core.ts";
const SENSITIVITY_RELATIVE_PATH = "packages/bazi-interpretation/src/strength-sensitivity-review.ts";
const BAZI_CORE_RELATIVE_PATH = "packages/bazi-core/src/index.ts";
const PANEL_RELATIVE_PATH = "apps/web/src/components/bazi-interpretation-panel.tsx";
const REPORT_RELATIVE_PATH = "packages/research-export/src/single-chart-report.ts";
const LOCAL_AI_RELATIVE_PATH = "apps/web/src/lib/local-ai-draft-validation.ts";
const ENVELOPE_RELATIVE_PATH = "packages/bazi-interpretation/src/interpretation-evidence-envelope.ts";
const CONTRACTS_RELATIVE_PATH = "packages/contracts/src/index.ts";
const KNOWLEDGE_RELATIVE_PATH = "packages/knowledge-core/src/index.ts";
const SOURCE_REFS_RELATIVE_PATH = "packages/bazi-interpretation/src/source-refs.ts";
const PACKAGE_LOCK_RELATIVE_PATH = "package-lock.json";
const MAX_ARTIFACT_BYTES = 8 * 1024 * 1024;
const MAX_LEDGER_BYTES = 2 * 1024 * 1024;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const SRI_SHA512_PATTERN = /^sha512-[A-Za-z0-9+/]+={0,2}$/u;

const RELEASE_GOVERNANCE = Object.freeze({
  activeLine: "legacy-v13",
  targetSchema: 13,
  migrationId: null,
  mutationEpochBoundaryRequired: true,
  publicDeploymentAuthorized: false,
  expertClaimsAuthorized: false
});

const ENGINEERING_BINDING_IDS = Object.freeze([
  "binding:core:derive-assessment",
  "binding:policy:factor-inclusion",
  "binding:policy:direction-map",
  "binding:policy:weights",
  "binding:policy:month-duplication",
  "binding:policy:thresholds",
  "binding:sensitivity:six-scenarios"
]);

const TIME_PRECISIONS = Object.freeze([
  "exact_second",
  "exact_minute",
  "hour_range",
  "unknown_hour",
  "date_only"
]);
const PILLAR_ORDER = Object.freeze(["year", "month", "day", "hour"]);
const FACTOR_INCLUSION_KEYS = Object.freeze([
  "includeDayVisibleStem",
  "retainMonthCommandAndFirstHiddenStem",
  "excludeUnreliableHour"
]);
const WEIGHT_KEYS = Object.freeze(["monthCommand", "visibleStem", "firstHiddenStem", "otherHiddenStem"]);
const THRESHOLD_ROWS = Object.freeze([
  Object.freeze({ key: "veryWeakUpperExclusive", operator: "<", resultBand: "very_weak" }),
  Object.freeze({ key: "weakUpperExclusive", operator: "<", resultBand: "weak" }),
  Object.freeze({ key: "balancedUpperInclusive", operator: "<=", resultBand: "balanced" }),
  Object.freeze({ key: "strongUpperInclusive", operator: "<=", resultBand: "strong" })
]);
const TEN_GOD_ALIAS_KEYS = Object.freeze(["偏官", "枭神"]);
const TEN_GOD_GROUP_KEYS = Object.freeze([
  "比肩", "劫财", "正印", "偏印", "食神", "伤官", "正财", "偏财", "正官", "七杀"
]);
const GROUP_DIRECTION_ROWS = Object.freeze([
  Object.freeze({ group: "peer", direction: "support" }),
  Object.freeze({ group: "resource", direction: "support" }),
  Object.freeze({ group: "output", direction: "demand" }),
  Object.freeze({ group: "wealth", direction: "demand" }),
  Object.freeze({ group: "authority", direction: "demand" })
]);
const SCENARIO_IDS = Object.freeze([
  "baseline_current_candidate",
  "deduplicate_month_main",
  "equal_presence_deduplicated",
  "without_month_command_bonus",
  "without_visible_stems",
  "without_hidden_stems"
]);
const FACTOR_SOURCE_REF_IDS = Object.freeze(["dtt-strength", "smt-position", "smt-ten-gods"]);

const BASIS_DEFINITIONS = Object.freeze([
  Object.freeze({ path: PR10BC_RELATIVE_PATH, role: "current_binding_scope_basis", kind: "json" }),
  Object.freeze({ path: FREEZE_RELATIVE_PATH, role: "binding_freeze_gap_basis", kind: "json" }),
  Object.freeze({ path: ENGINEERING_RELATIVE_PATH, role: "engineering_candidate_basis", kind: "json" }),
  Object.freeze({ path: EXPERT_PACKET_RELATIVE_PATH, role: "expert_packet_drift_observation", kind: "json" }),
  Object.freeze({ path: POLICY_RELATIVE_PATH, role: "declared_engineering_policy_values", kind: "source" }),
  Object.freeze({ path: CORE_RELATIVE_PATH, role: "strength_factor_and_score_producer", kind: "source" }),
  Object.freeze({ path: SENSITIVITY_RELATIVE_PATH, role: "sensitivity_scenario_consumer", kind: "source" }),
  Object.freeze({ path: BAZI_CORE_RELATIVE_PATH, role: "upstream_chart_fact_table_consumer", kind: "source" }),
  Object.freeze({ path: PANEL_RELATIVE_PATH, role: "interactive_include_hour_consumer", kind: "source" }),
  Object.freeze({ path: REPORT_RELATIVE_PATH, role: "report_include_hour_consumer", kind: "source" }),
  Object.freeze({ path: LOCAL_AI_RELATIVE_PATH, role: "local_ai_include_hour_consumer", kind: "source" }),
  Object.freeze({ path: ENVELOPE_RELATIVE_PATH, role: "evidence_envelope_include_hour_gate", kind: "source" }),
  Object.freeze({ path: CONTRACTS_RELATIVE_PATH, role: "time_precision_contract", kind: "source" }),
  Object.freeze({ path: KNOWLEDGE_RELATIVE_PATH, role: "evidence_subject_locator_registry", kind: "source" }),
  Object.freeze({ path: SOURCE_REFS_RELATIVE_PATH, role: "legacy_interpretation_source_ref_registry", kind: "source" }),
  Object.freeze({ path: PACKAGE_LOCK_RELATIVE_PATH, role: "runtime_dependency_identity_basis", kind: "json" })
]);

export class BaziEngineeringBindingValueSubjectGapError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "BaziEngineeringBindingValueSubjectGapError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new BaziEngineeringBindingValueSubjectGapError(code, message);
}

function canonicalValue(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalValue);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]));
}

export function canonicalStringifyBaziEngineeringBindingValueSubjectGap(value) {
  return JSON.stringify(canonicalValue(value));
}

function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256Value(value) {
  return createHash("sha256")
    .update(canonicalStringifyBaziEngineeringBindingValueSubjectGap(value), "utf8")
    .digest("hex");
}

export function computeBaziEngineeringBindingValueSubjectGapDigest(ledger) {
  const { ledgerDigest: _ledgerDigest, ...unsigned } = ledger;
  return sha256Value(unsigned);
}

function safeWorkspaceFile(workspaceRoot, relativePath) {
  if (
    typeof relativePath !== "string"
    || !relativePath
    || relativePath.includes("\\")
    || relativePath.includes("\0")
    || path.isAbsolute(relativePath)
    || path.win32.isAbsolute(relativePath)
    || relativePath.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) fail("UNSAFE_PATH", `工程 value-subject 路径不安全：${relativePath}`);
  return path.resolve(workspaceRoot, ...relativePath.split("/"));
}

async function readBoundFile(workspaceRoot, relativePath, maxBytes = MAX_ARTIFACT_BYTES) {
  const root = await realpath(path.resolve(workspaceRoot));
  const absolute = safeWorkspaceFile(root, relativePath);
  let actual;
  let metadata;
  try {
    [actual, metadata] = await Promise.all([realpath(absolute), stat(absolute)]);
  } catch (cause) {
    throw new BaziEngineeringBindingValueSubjectGapError(
      "ARTIFACT_MISSING",
      `工程 value-subject 工件不存在：${relativePath}`,
      { cause }
    );
  }
  const relative = path.relative(root, actual);
  if (
    relative === ""
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative)
    || !metadata.isFile()
    || metadata.size <= 0
    || metadata.size > maxBytes
  ) fail("UNSAFE_PATH", `工程 value-subject 目标不是工作区内普通小文件：${relativePath}`);
  const bytes = await readFile(actual);
  if (bytes.length !== metadata.size) {
    fail("ARTIFACT_CHANGED_DURING_READ", `工程 value-subject 工件读取长度变化：${relativePath}`);
  }
  return Object.freeze({ bytes, metadata });
}

function decodeUtf8(bytes, label) {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail("ARTIFACT_BOM_FORBIDDEN", `${label} 不得包含 UTF-8 BOM。`);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (cause) {
    throw new BaziEngineeringBindingValueSubjectGapError(
      "ARTIFACT_UTF8_INVALID",
      `${label} 不是严格 UTF-8。`,
      { cause }
    );
  }
}

function parseTypeScript(source, label) {
  try {
    return parse(source, {
      sourceFilename: label,
      sourceType: "module",
      errorRecovery: false,
      attachComment: false,
      plugins: ["typescript", "jsx"]
    });
  } catch (cause) {
    throw new BaziEngineeringBindingValueSubjectGapError(
      "SOURCE_PARSE_FAILED",
      `${label} 不能按当前 TypeScript/TSX 语法解析。`,
      { cause }
    );
  }
}

function walkAst(root, visitor) {
  const stack = [root];
  const seen = new WeakSet();
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === null || typeof node !== "object" || seen.has(node)) continue;
    seen.add(node);
    if (typeof node.type === "string") visitor(node);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (let index = value.length - 1; index >= 0; index -= 1) stack.push(value[index]);
      } else if (value !== null && typeof value === "object") stack.push(value);
    }
  }
}

function unwrapExpression(node) {
  let current = node;
  while (
    current?.type === "TSAsExpression"
    || current?.type === "TSSatisfiesExpression"
    || current?.type === "TSTypeAssertion"
    || current?.type === "ParenthesizedExpression"
  ) current = current.expression;
  if (
    current?.type === "CallExpression"
    && current.arguments.length === 1
    && current.callee?.type === "MemberExpression"
    && !current.callee.computed
    && current.callee.object?.type === "Identifier"
    && current.callee.object.name === "Object"
    && current.callee.property?.type === "Identifier"
    && current.callee.property.name === "freeze"
  ) return unwrapExpression(current.arguments[0]);
  return current;
}

function findUniqueConst(ast, name) {
  const matches = [];
  for (const statement of ast.program?.body ?? []) {
    const declaration = statement.type === "ExportNamedDeclaration" || statement.type === "ExportDefaultDeclaration"
      ? statement.declaration
      : statement;
    if (declaration?.type !== "VariableDeclaration") continue;
    for (const node of declaration.declarations) {
      if (node.id?.type === "Identifier" && node.id.name === name) matches.push(node);
    }
  }
  if (matches.length !== 1 || !matches[0].init) {
    fail("SOURCE_SHAPE_DRIFT", `${name} 必须有且只有一个带初始化值的声明。`);
  }
  return matches[0].init;
}

function propertyKey(property, label) {
  if (property.type !== "ObjectProperty" || property.computed || property.method || property.shorthand) {
    fail("SOURCE_SHAPE_DRIFT", `${label} 禁止 spread、computed、method 或 shorthand。`);
  }
  if (property.key?.type === "Identifier") return property.key.name;
  if (property.key?.type === "StringLiteral") return property.key.value;
  fail("SOURCE_SHAPE_DRIFT", `${label} 属性键必须是直接 identifier 或 string literal。`);
}

function objectEntries(node, label) {
  const value = unwrapExpression(node);
  if (value?.type !== "ObjectExpression") fail("SOURCE_SHAPE_DRIFT", `${label} 必须是直接对象 literal。`);
  const result = [];
  const keys = new Set();
  for (const property of value.properties) {
    const key = propertyKey(property, label);
    if (keys.has(key)) fail("SOURCE_SHAPE_DRIFT", `${label} 含重复键 ${key}。`);
    keys.add(key);
    result.push([key, property.value]);
  }
  return result;
}

function objectMap(node, label) {
  return new Map(objectEntries(node, label));
}

function literalValue(node, label) {
  const value = unwrapExpression(node);
  if (value?.type === "StringLiteral" || value?.type === "NumericLiteral" || value?.type === "BooleanLiteral") {
    return value.value;
  }
  if (value?.type === "NullLiteral") return null;
  fail("SOURCE_SHAPE_DRIFT", `${label} 必须是直接 literal。`);
}

function exactKeys(entries, expected, label) {
  const actual = entries.map(([key]) => key);
  if (canonicalStringifyBaziEngineeringBindingValueSubjectGap(actual)
    !== canonicalStringifyBaziEngineeringBindingValueSubjectGap(expected)) {
    fail("SOURCE_SHAPE_DRIFT", `${label} 键集合或顺序已漂移。`);
  }
}

function extractLiteralObject(node, expected, label) {
  const entries = objectEntries(node, label);
  exactKeys(entries, expected, label);
  return Object.freeze(Object.fromEntries(
    entries.map(([key, value]) => [key, literalValue(value, `${label}.${key}`)])
  ));
}

function arrayItems(node, label) {
  const value = unwrapExpression(node);
  if (value?.type !== "ArrayExpression") fail("SOURCE_SHAPE_DRIFT", `${label} 必须是直接数组 literal。`);
  if (value.elements.some((entry) => !entry || entry.type === "SpreadElement")) {
    fail("SOURCE_SHAPE_DRIFT", `${label} 禁止空项或 spread。`);
  }
  return value.elements;
}

function extractLiteralArray(node, expected, label) {
  const result = arrayItems(node, label).map((entry, index) => literalValue(entry, `${label}[${index}]`));
  if (canonicalStringifyBaziEngineeringBindingValueSubjectGap(result)
    !== canonicalStringifyBaziEngineeringBindingValueSubjectGap(expected)) {
    fail("SOURCE_SHAPE_DRIFT", `${label} 有序值已漂移。`);
  }
  return Object.freeze(result);
}

function requireCodeSnippets(source, ast, snippets, label) {
  const opaqueRanges = [];
  for (const comment of ast.comments ?? []) {
    if (Number.isInteger(comment.start) && Number.isInteger(comment.end)) {
      opaqueRanges.push([comment.start, comment.end]);
    }
  }
  walkAst(ast, (node) => {
    if (
      (node.type === "StringLiteral" || node.type === "TemplateElement" || node.type === "DirectiveLiteral")
      && Number.isInteger(node.start)
      && Number.isInteger(node.end)
    ) opaqueRanges.push([node.start, node.end]);
  });
  for (const snippet of snippets) {
    let cursor = source.indexOf(snippet);
    let executableMatch = false;
    while (cursor >= 0) {
      const end = cursor + snippet.length;
      if (!opaqueRanges.some(([opaqueStart, opaqueEnd]) => cursor >= opaqueStart && end <= opaqueEnd)) {
        executableMatch = true;
        break;
      }
      cursor = source.indexOf(snippet, cursor + 1);
    }
    if (!executableMatch) fail("SOURCE_SHAPE_DRIFT", `${label} 缺少稳定可执行语义片段：${snippet}`);
  }
}

function rejectSemanticName(ast, name, label) {
  let found = false;
  walkAst(ast, (node) => {
    if (
      (node.type === "Identifier" && node.name === name)
      || (node.type === "StringLiteral" && node.value === name)
      || (
        node.type === "TemplateElement"
        && (node.value?.cooked === name || node.value?.raw === name)
      )
    ) found = true;
  });
  if (found) fail("SOURCE_SHAPE_DRIFT", `${label} 已出现 ${name} 的源码级消费，需要重新审定 value-subject。`);
}

function findUniqueFunction(ast, name) {
  const matches = [];
  for (const statement of ast.program?.body ?? []) {
    const declaration = statement.type === "ExportNamedDeclaration" || statement.type === "ExportDefaultDeclaration"
      ? statement.declaration
      : statement;
    if (declaration?.type === "FunctionDeclaration" && declaration.id?.name === name) matches.push(declaration);
  }
  if (matches.length !== 1) fail("SOURCE_SHAPE_DRIFT", `${name} 必须有且只有一个 function declaration。`);
  return matches[0];
}

function findUniqueVariableInitializer(root, name, label) {
  const matches = [];
  walkAst(root, (node) => {
    if (node.type === "VariableDeclarator" && node.id?.type === "Identifier" && node.id.name === name) {
      matches.push(node);
    }
  });
  if (matches.length !== 1 || !matches[0].init) {
    fail("SOURCE_SHAPE_DRIFT", `${label} 必须有且只有一个 ${name} 初始化值。`);
  }
  return matches[0].init;
}

function findUniqueDirectVariableInitializer(functionNode, name, label) {
  const matches = [];
  for (const statement of functionNode.body?.body ?? []) {
    if (statement.type !== "VariableDeclaration") continue;
    for (const declaration of statement.declarations) {
      if (declaration.id?.type === "Identifier" && declaration.id.name === name) matches.push(declaration);
    }
  }
  if (matches.length !== 1 || !matches[0].init) {
    fail("SOURCE_SHAPE_DRIFT", `${label} 必须在函数顶层精确声明一次 ${name}。`);
  }
  return matches[0].init;
}

function memberPath(node) {
  const value = unwrapExpression(node);
  if (value?.type === "Identifier") return [value.name];
  if (value?.type !== "MemberExpression" && value?.type !== "OptionalMemberExpression") return null;
  const objectPath = memberPath(value.object);
  if (!objectPath) return null;
  let property;
  if (!value.computed && value.property?.type === "Identifier") property = value.property.name;
  else if (value.computed && value.property?.type === "StringLiteral") property = value.property.value;
  else return null;
  return [...objectPath, property];
}

function sameStringArray(left, right) {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

function evaluateTimePrecisionPredicate(node, expectedPath, timePrecision, label) {
  const value = unwrapExpression(node);
  if (value?.type === "LogicalExpression" && (value.operator === "&&" || value.operator === "||")) {
    const left = evaluateTimePrecisionPredicate(value.left, expectedPath, timePrecision, label);
    const right = evaluateTimePrecisionPredicate(value.right, expectedPath, timePrecision, label);
    return value.operator === "&&" ? left && right : left || right;
  }
  if (value?.type !== "BinaryExpression" || !["===", "!=="].includes(value.operator)) {
    fail("SOURCE_SHAPE_DRIFT", `${label} 必须是由严格相等比较组成的 timePrecision 谓词。`);
  }
  const leftPath = memberPath(value.left);
  const rightPath = memberPath(value.right);
  const leftLiteral = unwrapExpression(value.left);
  const rightLiteral = unwrapExpression(value.right);
  let comparedValue;
  if (leftPath && sameStringArray(leftPath, expectedPath) && rightLiteral?.type === "StringLiteral") {
    comparedValue = rightLiteral.value;
  } else if (rightPath && sameStringArray(rightPath, expectedPath) && leftLiteral?.type === "StringLiteral") {
    comparedValue = leftLiteral.value;
  } else {
    fail("SOURCE_SHAPE_DRIFT", `${label} 比较对象必须是精确 timePrecision 路径与 string literal。`);
  }
  if (!TIME_PRECISIONS.includes(comparedValue)) {
    fail("SOURCE_SHAPE_DRIFT", `${label} 使用了未登记的 timePrecision 值 ${comparedValue}。`);
  }
  return value.operator === "===" ? timePrecision === comparedValue : timePrecision !== comparedValue;
}

function requireIdentifierUse(root, name, minimumCount, label) {
  let count = 0;
  walkAst(root, (node) => {
    if (node.type === "Identifier" && node.name === name) count += 1;
  });
  if (count < minimumCount) fail("SOURCE_SHAPE_DRIFT", `${label} 没有消费 ${name}。`);
}

function requireCallObjectShorthand(root, calleeName, argumentIndex, propertyName, label) {
  let matches = 0;
  let totalCalls = 0;
  walkAst(root, (node) => {
    if (
      node.type !== "CallExpression"
      || node.callee?.type !== "Identifier"
      || node.callee.name !== calleeName
    ) return;
    totalCalls += 1;
    if (node.arguments.length <= argumentIndex) return;
    const argument = unwrapExpression(node.arguments[argumentIndex]);
    if (argument?.type !== "ObjectExpression") return;
    const propertyMatches = argument.properties.filter((property) =>
      property.type === "ObjectProperty"
      && !property.computed
      && property.shorthand
      && property.key?.type === "Identifier"
      && property.key.name === propertyName
      && property.value?.type === "Identifier"
      && property.value.name === propertyName
    );
    if (propertyMatches.length === 1) matches += 1;
  });
  if (matches !== 1 || totalCalls !== 1) {
    fail(
      "SOURCE_SHAPE_DRIFT",
      `${label} 必须把 ${propertyName} 作为唯一 shorthand 参数传给 ${calleeName}。`
    );
  }
}

function extractVariablePrecisionPredicate(ast, functionName, variableName, expectedPath, label) {
  const declaration = findUniqueFunction(ast, functionName);
  const initializer = findUniqueDirectVariableInitializer(declaration, variableName, label);
  requireIdentifierUse(declaration, variableName, 2, label);
  return Object.freeze(Object.fromEntries(TIME_PRECISIONS.map((timePrecision) => [
    timePrecision,
    evaluateTimePrecisionPredicate(initializer, expectedPath, timePrecision, label)
  ])));
}

function extractReturnPrecisionPredicate(ast, functionName, expectedPath, label) {
  const declaration = findUniqueFunction(ast, functionName);
  const returns = [];
  walkAst(declaration.body, (node) => {
    if (node.type === "ReturnStatement" && node.argument) returns.push(node.argument);
  });
  if (returns.length !== 1) fail("SOURCE_SHAPE_DRIFT", `${label} 必须有且只有一个 return predicate。`);
  return Object.freeze(Object.fromEntries(TIME_PRECISIONS.map((timePrecision) => [
    timePrecision,
    evaluateTimePrecisionPredicate(returns[0], expectedPath, timePrecision, label)
  ])));
}

function requireExactTimeGuard(root, label) {
  let guards = 0;
  for (const node of root.body?.body ?? []) {
    if (node.type !== "IfStatement") continue;
    const test = unwrapExpression(node.test);
    const right = unwrapExpression(test?.right);
    if (
      test?.type === "LogicalExpression"
      && test.operator === "&&"
      && unwrapExpression(test.left)?.type === "Identifier"
      && unwrapExpression(test.left).name === "includeHour"
      && right?.type === "UnaryExpression"
      && right.operator === "!"
      && unwrapExpression(right.argument)?.type === "Identifier"
      && unwrapExpression(right.argument).name === "exactTime"
      && isThrowConsequent(node.consequent)
    ) guards += 1;
  }
  if (guards !== 1) fail("SOURCE_SHAPE_DRIFT", `${label} 必须以 includeHour && !exactTime 的唯一 throw guard 关闭。`);
}

function isThrowConsequent(node) {
  return node?.type === "ThrowStatement"
    || (node?.type === "BlockStatement" && node.body.length === 1 && node.body[0]?.type === "ThrowStatement");
}

function comparisonMatchesLiteral(node, expectedPath, expectedKind, expectedValue = undefined) {
  const value = unwrapExpression(node);
  if (value?.type !== "BinaryExpression" || value.operator !== "!==") return false;
  const pairs = [
    [value.left, value.right],
    [value.right, value.left]
  ];
  return pairs.some(([pathNode, literalNode]) => {
    const actualPath = memberPath(pathNode);
    const literal = unwrapExpression(literalNode);
    if (!actualPath || !sameStringArray(actualPath, expectedPath)) return false;
    if (expectedKind === "null") return literal?.type === "NullLiteral";
    return literal?.type === "BooleanLiteral" && literal.value === expectedValue;
  });
}

function flattenLogicalOr(node) {
  const value = unwrapExpression(node);
  if (value?.type === "LogicalExpression" && value.operator === "||") {
    return [...flattenLogicalOr(value.left), ...flattenLogicalOr(value.right)];
  }
  return [value];
}

function directObjectPropertyValue(node, targetKey, label) {
  const value = unwrapExpression(node);
  if (value?.type !== "ObjectExpression") fail("SOURCE_SHAPE_DRIFT", `${label} 必须是直接对象 literal。`);
  const matches = [];
  for (const property of value.properties) {
    if (
      property.type !== "ObjectProperty"
      || property.computed
      || property.method
    ) fail("SOURCE_SHAPE_DRIFT", `${label} 禁止 spread、computed 或 method 覆盖 authority 字段。`);
    const key = property.key?.type === "Identifier"
      ? property.key.name
      : property.key?.type === "StringLiteral"
        ? property.key.value
        : null;
    if (key === targetKey) matches.push(property.value);
  }
  if (matches.length !== 1) fail("SOURCE_SHAPE_DRIFT", `${label} 必须精确声明一次 ${targetKey}。`);
  return matches[0];
}

function extractSensitivityAuthorityProjection(ast) {
  const buildScenario = findUniqueFunction(ast, "buildScenario");
  const scenarioReturns = [];
  walkAst(buildScenario.body, (node) => {
    if (node.type === "ReturnStatement" && node.argument) scenarioReturns.push(node.argument);
  });
  if (scenarioReturns.length !== 1) {
    fail("SOURCE_SHAPE_DRIFT", "buildScenario 必须有且只有一个直接结果对象。 ");
  }
  const officialRuleCandidate = literalValue(
    directObjectPropertyValue(scenarioReturns[0], "officialRuleCandidate", "buildScenario return"),
    "buildScenario.officialRuleCandidate"
  );
  if (officialRuleCandidate !== false) {
    fail("AUTHORITY_STATE_DRIFT", "敏感性场景 officialRuleCandidate 必须由 builder 直接写为 false。 ");
  }

  const buildReview = findUniqueFunction(ast, "buildStrengthSensitivityReview");
  const reviewObject = findUniqueDirectVariableInitializer(
    buildReview,
    "review",
    "buildStrengthSensitivityReview"
  );
  const nullFields = [
    "selectedOfficialScenarioId", "expertStrengthVerdict", "overallGoodBad", "result"
  ];
  const projection = { officialRuleCandidate };
  for (const field of nullFields) {
    const fieldValue = literalValue(
      directObjectPropertyValue(reviewObject, field, "buildStrengthSensitivityReview.review"),
      `buildStrengthSensitivityReview.review.${field}`
    );
    if (fieldValue !== null) fail("AUTHORITY_STATE_DRIFT", `${field} 必须由 builder 直接写为 null。`);
    projection[field] = fieldValue;
  }

  const validate = findUniqueFunction(ast, "validateStrengthSensitivityReview");
  let directScenarioGuards = 0;
  for (const statement of validate.body.body) {
    if (statement.type !== "ForOfStatement" || statement.body?.type !== "BlockStatement") continue;
    for (const bodyStatement of statement.body.body) {
      if (
        bodyStatement.type === "IfStatement"
        && comparisonMatchesLiteral(
          bodyStatement.test,
          ["scenario", "officialRuleCandidate"],
          "boolean",
          false
        )
        && isThrowConsequent(bodyStatement.consequent)
      ) directScenarioGuards += 1;
    }
  }
  if (directScenarioGuards !== 1) {
    fail("AUTHORITY_STATE_DRIFT", "officialRuleCandidate 必须在 scenario loop 直接失败关闭。 ");
  }
  let directReviewGuards = 0;
  for (const statement of validate.body.body) {
    if (statement.type !== "IfStatement" || !isThrowConsequent(statement.consequent)) continue;
    const comparisons = flattenLogicalOr(statement.test);
    if (
      comparisons.length === nullFields.length
      && nullFields.every((field) => comparisons.some((comparison) =>
        comparisonMatchesLiteral(comparison, ["review", field], "null")
      ))
    ) directReviewGuards += 1;
  }
  if (directReviewGuards !== 1) {
    fail("AUTHORITY_STATE_DRIFT", "四个 review authority null 必须在 validator 顶层直接失败关闭。 ");
  }
  return Object.freeze(projection);
}

function extractExactTimeEnum(ast) {
  const matches = [];
  walkAst(ast, (node) => {
    if (node.type !== "ObjectProperty") return;
    const key = !node.computed && node.key?.type === "Identifier"
      ? node.key.name
      : !node.computed && node.key?.type === "StringLiteral"
        ? node.key.value
        : null;
    if (key !== "timePrecision") return;
    const value = unwrapExpression(node.value);
    if (
      value?.type !== "CallExpression"
      || value.callee?.type !== "MemberExpression"
      || value.callee.computed
      || value.callee.object?.type !== "Identifier"
      || value.callee.object.name !== "z"
      || value.callee.property?.type !== "Identifier"
      || value.callee.property.name !== "enum"
      || value.arguments.length !== 1
    ) return;
    matches.push(arrayItems(value.arguments[0], "timePrecision z.enum").map((entry, index) =>
      literalValue(entry, `timePrecision z.enum[${index}]`)
    ));
  });
  if (matches.length !== 1 || !sameStringArray(matches[0], TIME_PRECISIONS)) {
    fail("SOURCE_SHAPE_DRIFT", "timePrecision contract 必须保持当前精确五项有序 z.enum。 ");
  }
}

function subject(valueSubjectId, kind, repositoryProjection, observationState, producerRefs, consumerRefs = []) {
  return Object.freeze({
    valueSubjectId,
    kind,
    repositoryProjection,
    projectionDigest: sha256Value(repositoryProjection),
    observationState,
    producerRefs: Object.freeze([...producerRefs]),
    consumerRefs: Object.freeze([...consumerRefs]),
    syntaxProjectionMechanicallyObserved: true,
    generalControlFlowEquivalenceMechanicallyEstablished: false,
    generalDataFlowEquivalenceMechanicallyEstablished: false,
    runtimeExecutionObserved: false,
    sourceOrRationaleRefs: Object.freeze([]),
    valueProvenanceFrozen: false,
    independentDomainReviewed: false,
    freezeEffect: "none"
  });
}

function extractBindingEvidenceSubjectRegistry(source) {
  const ast = parseTypeScript(source, KNOWLEDGE_RELATIVE_PATH);
  const bindingIdItems = arrayItems(
    findUniqueConst(ast, "BAZI_STRENGTH_BINDING_IDS"),
    "BAZI_STRENGTH_BINDING_IDS"
  );
  const bindingIds = Object.freeze(bindingIdItems.map((entry, index) =>
    literalValue(entry, `BAZI_STRENGTH_BINDING_IDS[${index}]`)
  ));
  if (bindingIds.length !== 12 || new Set(bindingIds).size !== bindingIds.length) {
    fail("SOURCE_SHAPE_DRIFT", "binding EvidenceSubject registry 必须保持精确 12 个唯一 binding ID。 ");
  }
  const subjectIdsByBinding = extractLiteralObject(
    findUniqueConst(ast, "BAZI_STRENGTH_BINDING_EVIDENCE_SUBJECT_ID_BY_BINDING_ID"),
    bindingIds,
    "BAZI_STRENGTH_BINDING_EVIDENCE_SUBJECT_ID_BY_BINDING_ID"
  );
  if (new Set(Object.values(subjectIdsByBinding)).size !== bindingIds.length) {
    fail("SOURCE_SHAPE_DRIFT", "binding EvidenceSubject ID 必须保持一一对应。 ");
  }

  const mapped = unwrapExpression(findUniqueConst(ast, "BAZI_STRENGTH_BINDING_EVIDENCE_SUBJECTS"));
  const callback = mapped?.type === "CallExpression"
    && mapped.arguments.length === 1
    && mapped.callee?.type === "MemberExpression"
    && !mapped.callee.computed
    && mapped.callee.object?.type === "Identifier"
    && mapped.callee.object.name === "BAZI_STRENGTH_BINDING_IDS"
    && mapped.callee.property?.type === "Identifier"
    && mapped.callee.property.name === "map"
    ? mapped.arguments[0]
    : null;
  if (
    callback?.type !== "ArrowFunctionExpression"
    || callback.params.length !== 1
    || callback.params[0]?.type !== "Identifier"
    || callback.params[0].name !== "bindingId"
  ) fail("SOURCE_SHAPE_DRIFT", "binding EvidenceSubject 必须由当前 bindingIds 的直接 map 构造。 ");
  const fields = objectEntries(callback.body, "BAZI_STRENGTH_BINDING_EVIDENCE_SUBJECTS.map");
  exactKeys(fields, [
    "subjectId", "registryVersion", "status", "category", "label", "requiredForV1",
    "algorithmIds", "fieldPaths", "ruleProfilePaths"
  ], "BAZI_STRENGTH_BINDING_EVIDENCE_SUBJECTS.map");
  const fieldMap = new Map(fields);
  const subjectId = unwrapExpression(fieldMap.get("subjectId"));
  if (
    subjectId?.type !== "MemberExpression"
    || !subjectId.computed
    || subjectId.object?.type !== "Identifier"
    || subjectId.object.name !== "BAZI_STRENGTH_BINDING_EVIDENCE_SUBJECT_ID_BY_BINDING_ID"
    || subjectId.property?.type !== "Identifier"
    || subjectId.property.name !== "bindingId"
  ) fail("SOURCE_SHAPE_DRIFT", "binding EvidenceSubject subjectId 不再按 bindingId 精确索引。 ");
  if (
    literalValue(fieldMap.get("status"), "binding EvidenceSubject.status") !== "active"
    || literalValue(fieldMap.get("category"), "binding EvidenceSubject.category") !== "interpretive_claim"
    || literalValue(fieldMap.get("requiredForV1"), "binding EvidenceSubject.requiredForV1") !== false
  ) fail("SOURCE_SHAPE_DRIFT", "binding EvidenceSubject 准入属性已漂移。 ");
  const locatorCounts = {};
  for (const key of ["algorithmIds", "fieldPaths", "ruleProfilePaths"]) {
    const values = arrayItems(fieldMap.get(key), `binding EvidenceSubject.${key}`);
    locatorCounts[key] = values.length;
  }
  if (Object.values(locatorCounts).some((count) => count !== 0)) {
    fail("EVIDENCE_SUBJECT_STATE_DRIFT", "binding EvidenceSubject 已出现正式 locator，缺口账必须重审。 ");
  }
  const stringLiteralValues = [];
  walkAst(ast, (node) => {
    if (node.type === "StringLiteral") stringLiteralValues.push(node.value);
  });
  return Object.freeze({
    bindingIds,
    subjectIdsByBinding,
    subjectsWithAlgorithmIds: locatorCounts.algorithmIds === 0 ? 0 : bindingIds.length,
    subjectsWithFieldPaths: locatorCounts.fieldPaths === 0 ? 0 : bindingIds.length,
    subjectsWithRuleProfilePaths: locatorCounts.ruleProfilePaths === 0 ? 0 : bindingIds.length,
    stringLiteralValues: Object.freeze([...new Set(stringLiteralValues)].sort())
  });
}

function extractSourceRefRegistry(source) {
  const ast = parseTypeScript(source, SOURCE_REFS_RELATIVE_PATH);
  const items = arrayItems(findUniqueConst(ast, "BAZI_INTERPRETATION_SOURCE_REFS"), "BAZI_INTERPRETATION_SOURCE_REFS");
  const refs = items.map((item, index) => {
    const map = objectMap(item, `BAZI_INTERPRETATION_SOURCE_REFS[${index}]`);
    for (const key of ["id", "url", "evidenceClass"]) {
      if (!map.has(key)) fail("SOURCE_SHAPE_DRIFT", `source ref ${index} 缺少 ${key}。`);
    }
    return Object.freeze({
      id: literalValue(map.get("id"), `sourceRef[${index}].id`),
      url: literalValue(map.get("url"), `sourceRef[${index}].url`),
      evidenceClass: literalValue(map.get("evidenceClass"), `sourceRef[${index}].evidenceClass`)
    });
  });
  if (new Set(refs.map((entry) => entry.id)).size !== refs.length) {
    fail("SOURCE_SHAPE_DRIFT", "legacy interpretation sourceRef ID 必须唯一。 ");
  }
  return Object.freeze(refs);
}

export function extractCurrentBaziEngineeringValueObservations(sources) {
  const required = [
    "policy", "core", "sensitivity", "baziCore", "panel", "report", "localAi", "envelope",
    "contracts", "knowledge", "sourceRefs"
  ];
  if (!sources || required.some((key) => typeof sources[key] !== "string" || !sources[key])) {
    fail("SOURCE_SHAPE_DRIFT", "工程 value-subject 提取缺少必要源码。 ");
  }
  const policyAst = parseTypeScript(sources.policy, POLICY_RELATIVE_PATH);
  const coreAst = parseTypeScript(sources.core, CORE_RELATIVE_PATH);
  const sensitivityAst = parseTypeScript(sources.sensitivity, SENSITIVITY_RELATIVE_PATH);
  const baziCoreAst = parseTypeScript(sources.baziCore, BAZI_CORE_RELATIVE_PATH);
  const panelAst = parseTypeScript(sources.panel, PANEL_RELATIVE_PATH);
  const reportAst = parseTypeScript(sources.report, REPORT_RELATIVE_PATH);
  const localAiAst = parseTypeScript(sources.localAi, LOCAL_AI_RELATIVE_PATH);
  const envelopeAst = parseTypeScript(sources.envelope, ENVELOPE_RELATIVE_PATH);
  const contractsAst = parseTypeScript(sources.contracts, CONTRACTS_RELATIVE_PATH);
  const knowledgeAst = parseTypeScript(sources.knowledge, KNOWLEDGE_RELATIVE_PATH);
  const factorWeights = extractLiteralObject(
    findUniqueConst(policyAst, "BAZI_STRENGTH_FACTOR_WEIGHTS"), WEIGHT_KEYS, "BAZI_STRENGTH_FACTOR_WEIGHTS"
  );
  const thresholds = extractLiteralObject(
    findUniqueConst(policyAst, "BAZI_STRENGTH_BAND_THRESHOLDS"),
    THRESHOLD_ROWS.map((entry) => entry.key),
    "BAZI_STRENGTH_BAND_THRESHOLDS"
  );
  const aliases = extractLiteralObject(
    findUniqueConst(policyAst, "BAZI_STRENGTH_TEN_GOD_ALIASES"), TEN_GOD_ALIAS_KEYS,
    "BAZI_STRENGTH_TEN_GOD_ALIASES"
  );
  const groups = extractLiteralObject(
    findUniqueConst(policyAst, "BAZI_STRENGTH_TEN_GOD_GROUPS"), TEN_GOD_GROUP_KEYS,
    "BAZI_STRENGTH_TEN_GOD_GROUPS"
  );
  const policy = objectMap(findUniqueConst(policyAst, "BAZI_STRENGTH_POLICY"), "BAZI_STRENGTH_POLICY");
  if (!policy.has("factorInclusion") || !policy.has("monthMainDuplication")) {
    fail("SOURCE_SHAPE_DRIFT", "BAZI_STRENGTH_POLICY 缺少 factorInclusion 或 monthMainDuplication。 ");
  }
  const factorInclusion = extractLiteralObject(
    policy.get("factorInclusion"), FACTOR_INCLUSION_KEYS, "BAZI_STRENGTH_POLICY.factorInclusion"
  );
  const monthMainDuplication = literalValue(policy.get("monthMainDuplication"), "monthMainDuplication");
  const pillarOrder = extractLiteralArray(
    findUniqueConst(coreAst, "BAZI_STRENGTH_PILLAR_ORDER"), PILLAR_ORDER, "BAZI_STRENGTH_PILLAR_ORDER"
  );
  const scenarioItems = arrayItems(
    findUniqueConst(policyAst, "BAZI_STRENGTH_SENSITIVITY_SCENARIOS"),
    "BAZI_STRENGTH_SENSITIVITY_SCENARIOS"
  );
  const scenarios = Object.freeze(scenarioItems.map((item, index) => {
    const map = objectMap(item, `scenario[${index}]`);
    return Object.freeze({
      id: literalValue(map.get("id"), `scenario[${index}].id`),
      role: literalValue(map.get("role"), `scenario[${index}].role`),
      operation: literalValue(map.get("operation"), `scenario[${index}].operation`)
    });
  }));
  if (canonicalStringifyBaziEngineeringBindingValueSubjectGap(scenarios.map((entry) => entry.id))
    !== canonicalStringifyBaziEngineeringBindingValueSubjectGap(SCENARIO_IDS)) {
    fail("SOURCE_SHAPE_DRIFT", "敏感性场景必须保持当前精确六项顺序。 ");
  }
  const thresholdProjection = Object.freeze(THRESHOLD_ROWS.map((entry) => Object.freeze({
    thresholdId: entry.key,
    value: thresholds[entry.key],
    operator: entry.operator,
    resultBand: entry.resultBand
  })));
  const directionProjection = Object.freeze({
    aliases,
    groups,
    groupDirections: GROUP_DIRECTION_ROWS
  });

  requireCodeSnippets(sources.core, coreAst, [
    "const monthMainTenGod = month.branchTenGods[0];",
    "const monthMainStem = month.hiddenStems[0];",
    'id: `month-command:${month.branch}:${monthMainStem}`',
    'group: "month_command"',
    'if (position !== "day") {',
    'id: `visible:${position}:${pillar.stem}`',
    "pillar.hiddenStems.forEach((stem, index) => {",
    'id: `hidden:${position}:${stem}:${index}`',
    "if (!direction) return;",
    '.filter((factor) => factor.direction === "support")',
    '.filter((factor) => factor.direction === "demand")',
    "const supportRatio = total === 0 ? null : supportWeight / total;",
    'strengthFactorWeight("month_command")',
    'strengthFactorWeight("visible_stem")',
    'strengthFactorWeight("hidden_stem", index)',
    'sourceRefIds: ["dtt-strength", "smt-position"]',
    'sourceRefIds: ["smt-ten-gods", "smt-position"]',
    'sourceRefIds: ["dtt-strength", "smt-ten-gods"]'
  ], CORE_RELATIVE_PATH);
  rejectSemanticName(coreAst, "factorInclusion", CORE_RELATIVE_PATH);
  rejectSemanticName(coreAst, "monthMainDuplication", CORE_RELATIVE_PATH);
  rejectSemanticName(coreAst, "BAZI_STRENGTH_POLICY", CORE_RELATIVE_PATH);
  requireCodeSnippets(sources.policy, policyAst, [
    'return group === "peer" || group === "resource" ? "support" : "demand";',
    'if (!Number.isInteger(hiddenStemIndex) || (hiddenStemIndex as number) < 0)',
    'if (ratio < thresholds.veryWeakUpperExclusive) return "very_weak";',
    'if (ratio < thresholds.weakUpperExclusive) return "weak";',
    'if (ratio <= thresholds.balancedUpperInclusive) return "balanced";',
    'if (ratio <= thresholds.strongUpperInclusive) return "strong";'
  ], POLICY_RELATIVE_PATH);
  requireCodeSnippets(sources.sensitivity, sensitivityAst, [
    'const expectedHiddenId = monthStem ? `hidden:month:${monthStem}:0` : null;',
    'factor.id === expectedHiddenId && factor.group === "hidden_stem" && factor.direction === monthCommand?.direction',
    'combinedSourceWeight: detected ? monthCommand.weight + monthHiddenMain.weight : null',
    'if (definition.operation === "exclude_month_command") return factor.group === "month_command";',
    'if (definition.operation === "exclude_visible_stems") return factor.group === "visible_stem";',
    'if (definition.operation === "exclude_hidden_stems") return factor.group === "hidden_stem";',
    'appliedWeight: definition.operation === "equal_presence_deduplicated" ? 1 : factor.weight',
    'const stability: StrengthSensitivityStability = baseline.band === "undetermined"',
    '? "insufficient"',
    '? "direction_sensitive"',
    '? "band_sensitive"',
    ': "stable_across_engineering_scenarios";'
  ], SENSITIVITY_RELATIVE_PATH);
  rejectSemanticName(sensitivityAst, "monthMainDuplication", SENSITIVITY_RELATIVE_PATH);
  rejectSemanticName(sensitivityAst, "BAZI_STRENGTH_POLICY", SENSITIVITY_RELATIVE_PATH);
  requireCodeSnippets(sources.baziCore, baziCoreAst, [
    'import { LunarUtil, Solar, type Lunar } from "lunar-typescript";',
    "LunarUtil.ZHI_HIDE_GAN",
    "LunarUtil.SHI_SHEN",
    'verificationStatus: "experimental" as const'
  ], BAZI_CORE_RELATIVE_PATH);
  extractExactTimeEnum(contractsAst);
  const panelInterpretationPredicate = extractVariablePrecisionPredicate(
    panelAst,
    "useBaziInterpretation",
    "includeHour",
    ["revision", "input", "timePrecision"],
    `${PANEL_RELATIVE_PATH}#useBaziInterpretation`
  );
  requireCallObjectShorthand(
    findUniqueFunction(panelAst, "useBaziInterpretation"),
    "interpretBaziChart",
    1,
    "includeHour",
    `${PANEL_RELATIVE_PATH}#useBaziInterpretation`
  );
  const panelReliablePredicate = extractReturnPrecisionPredicate(
    panelAst,
    "includeReliableHour",
    ["revision", "input", "timePrecision"],
    `${PANEL_RELATIVE_PATH}#includeReliableHour`
  );
  if (
    canonicalStringifyBaziEngineeringBindingValueSubjectGap(panelInterpretationPredicate)
      !== canonicalStringifyBaziEngineeringBindingValueSubjectGap(panelReliablePredicate)
  ) fail("TIME_PRECISION_MAPPING_DRIFT", "Web 两个 includeHour consumer 已分歧。 ");
  const reportPredicate = extractVariablePrecisionPredicate(
    reportAst,
    "buildReportInterpretationEvidence",
    "includeHour",
    ["revision", "input", "timePrecision"],
    `${REPORT_RELATIVE_PATH}#buildReportInterpretationEvidence`
  );
  requireCallObjectShorthand(
    findUniqueFunction(reportAst, "buildReportInterpretationEvidence"),
    "interpretBaziChart",
    1,
    "includeHour",
    `${REPORT_RELATIVE_PATH}#buildReportInterpretationEvidence`
  );
  const localAiPredicate = extractVariablePrecisionPredicate(
    localAiAst,
    "prepareLocalAiDraftValidationContext",
    "includeHour",
    ["revision", "input", "timePrecision"],
    `${LOCAL_AI_RELATIVE_PATH}#prepareLocalAiDraftValidationContext`
  );
  requireCallObjectShorthand(
    findUniqueFunction(localAiAst, "prepareLocalAiDraftValidationContext"),
    "interpretBaziChart",
    1,
    "includeHour",
    `${LOCAL_AI_RELATIVE_PATH}#prepareLocalAiDraftValidationContext`
  );
  const envelopeFunction = findUniqueFunction(envelopeAst, "buildBaziInterpretationEvidenceEnvelope");
  const exactTimeInitializer = findUniqueDirectVariableInitializer(
    envelopeFunction,
    "exactTime",
    `${ENVELOPE_RELATIVE_PATH}#buildBaziInterpretationEvidenceEnvelope`
  );
  requireIdentifierUse(
    envelopeFunction,
    "exactTime",
    2,
    `${ENVELOPE_RELATIVE_PATH}#buildBaziInterpretationEvidenceEnvelope`
  );
  requireExactTimeGuard(envelopeFunction, `${ENVELOPE_RELATIVE_PATH}#buildBaziInterpretationEvidenceEnvelope`);
  const envelopePredicate = Object.freeze(Object.fromEntries(TIME_PRECISIONS.map((timePrecision) => [
    timePrecision,
    evaluateTimePrecisionPredicate(
      exactTimeInitializer,
      ["shapedRevision", "data", "input", "timePrecision"],
      timePrecision,
      `${ENVELOPE_RELATIVE_PATH}#exactTime`
    )
  ])));
  const observedTimePrecisionMatrix = Object.freeze(TIME_PRECISIONS.map((timePrecision) => Object.freeze({
    timePrecision,
    interactivePanelIncludesHour: panelInterpretationPredicate[timePrecision],
    reportIncludesHour: reportPredicate[timePrecision],
    localAiIncludesHour: localAiPredicate[timePrecision],
    evidenceEnvelopeAllowsIncludedHour: envelopePredicate[timePrecision]
  })));
  requireCodeSnippets(sources.knowledge, knowledgeAst, [
    "BAZI_STRENGTH_BINDING_EVIDENCE_SUBJECTS.length !== 12"
  ], KNOWLEDGE_RELATIVE_PATH);
  const bindingEvidenceSubjectRegistry = extractBindingEvidenceSubjectRegistry(sources.knowledge);
  const sensitivityAuthorityProjection = extractSensitivityAuthorityProjection(sensitivityAst);

  return Object.freeze({
    factorInclusion,
    factorWeights,
    thresholdProjection,
    directionProjection,
    monthMainDuplication,
    pillarOrder,
    scenarios,
    timePrecisionMatrix: observedTimePrecisionMatrix,
    legacySourceRefs: extractSourceRefRegistry(sources.sourceRefs),
    bindingEvidenceSubjectRegistry,
    sensitivityAuthorityProjection
  });
}

function dependencyIdentity(packageLock) {
  const dependency = packageLock?.packages?.["node_modules/lunar-typescript"];
  const baziCore = packageLock?.packages?.["packages/bazi-core"];
  if (
    !dependency
    || typeof dependency.version !== "string"
    || !SRI_SHA512_PATTERN.test(dependency.integrity ?? "")
    || typeof dependency.license !== "string"
    || baziCore?.dependencies?.["lunar-typescript"] !== dependency.version
  ) fail("DEPENDENCY_IDENTITY_DRIFT", "package-lock 未闭合 bazi-core 使用的 lunar-typescript 版本。 ");
  return Object.freeze({
    packageName: "lunar-typescript",
    version: dependency.version,
    tarballIntegrity: dependency.integrity,
    packageLicenseMetadata: dependency.license,
    identityClass: "lockfile_dependency_metadata_only",
    installedPackageBytesVerified: false,
    embeddedTableBytesVerified: false,
    zhiHideGanValueDigest: null,
    shiShenValueDigest: null,
    packageMetadataEstablishesTraditionalTableTruth: false,
    packageMetadataEstablishesEmbeddedTableRights: false
  });
}

function requireCandidateRed(candidate, bindingId) {
  if (!candidate || candidate.bindingId !== bindingId) fail("CANDIDATE_DRIFT", `缺少工程候选 ${bindingId}。`);
  if (
    candidate.originType !== "project_engineering_heuristic"
    || candidate.reviewState?.engineeringRationaleFrozen !== false
    || candidate.reviewState?.bindingFreezeAuthorized !== false
    || candidate.reviewState?.bindingFreezeEffect !== "none"
    || candidate.reviewState?.engineeringReviewIds?.length !== 0
    || candidate.reviewState?.independentDomainReviewIds?.length !== 0
    || candidate.rightsState?.firstPartyAuthorshipLegallyEstablished !== false
    || candidate.rightsState?.formalSourceRightsRecordId !== null
    || candidate.rightsState?.legalReviewVerified !== false
    || candidate.rightsState?.redistributionClearanceEstablished !== false
    || Object.values(candidate.authorityClaims ?? {}).some((entry) => entry !== false)
  ) fail("CANDIDATE_DRIFT", `${bindingId} 已离开当前失败关闭候选边界。`);
}

function buildSubjects(observed, dependency) {
  const core = Object.freeze([
    subject("bazi.engineering.core.upstream.zhi-hide-gan.v1", "lockfile_dependency_metadata_identity", {
      dependency,
      tableSymbol: "LunarUtil.ZHI_HIDE_GAN",
      fieldVerificationStatus: "experimental"
    }, "lockfile_metadata_observed_installed_and_table_bytes_unverified", [
      `${BAZI_CORE_RELATIVE_PATH}#buildPillar`, `${PACKAGE_LOCK_RELATIVE_PATH}#node_modules/lunar-typescript`
    ], [`${CORE_RELATIVE_PATH}#collectBaziStrengthFactors`]),
    subject("bazi.engineering.core.upstream.shi-shen.v1", "lockfile_dependency_metadata_identity", {
      dependency,
      tableSymbol: "LunarUtil.SHI_SHEN",
      fieldVerificationStatus: "experimental"
    }, "lockfile_metadata_observed_installed_and_table_bytes_unverified", [
      `${BAZI_CORE_RELATIVE_PATH}#buildPillar`, `${PACKAGE_LOCK_RELATIVE_PATH}#node_modules/lunar-typescript`
    ], [`${CORE_RELATIVE_PATH}#addFactor`]),
    subject("bazi.engineering.core.pillar-order.v1", "ordered_repository_value", observed.pillarOrder,
      "repository_value_observed_candidate_only", [`${CORE_RELATIVE_PATH}#BAZI_STRENGTH_PILLAR_ORDER`]),
    subject("bazi.engineering.core.month-factor-constructor.v1", "algorithm_surface", {
      idTemplate: "month-command:${month.branch}:${monthMainStem}", group: "month_command", position: "month",
      tenGodIndex: 0, hiddenStemIndex: 0
    }, "stable_executable_syntax_projection_observed_no_control_flow_or_value_provenance", [`${CORE_RELATIVE_PATH}#collectBaziStrengthFactors`]),
    subject("bazi.engineering.core.visible-factor-constructor.v1", "algorithm_surface", {
      idTemplate: "visible:${position}:${pillar.stem}", group: "visible_stem", dayVisibleExcluded: true
    }, "stable_executable_syntax_projection_observed_no_control_flow_or_value_provenance", [`${CORE_RELATIVE_PATH}#collectBaziStrengthFactors`]),
    subject("bazi.engineering.core.hidden-factor-constructor.v1", "algorithm_surface", {
      idTemplate: "hidden:${position}:${stem}:${index}", group: "hidden_stem", sourceOrderPreserved: true
    }, "stable_executable_syntax_projection_observed_upstream_table_and_control_flow_unbound", [`${CORE_RELATIVE_PATH}#collectBaziStrengthFactors`]),
    subject("bazi.engineering.core.unknown-ten-god-drop.v1", "fail_closed_algorithm_surface", {
      directionLookupMayReturnNull: true, factorDroppedWhenDirectionMissing: true
    }, "stable_executable_syntax_projection_observed_control_flow_and_semantic_review_missing", [
      `${POLICY_RELATIVE_PATH}#strengthFactorDirectionForTenGod`, `${CORE_RELATIVE_PATH}#addFactor`
    ]),
    subject("bazi.engineering.core.aggregate-and-ratio.v1", "algorithm_surface", {
      supportAggregation: "sum_weights_where_direction_support",
      demandAggregation: "sum_weights_where_direction_demand",
      supportRatio: "null_when_total_zero_else_support_div_total"
    }, "stable_executable_syntax_projection_observed_control_flow_and_score_semantics_unapproved", [`${CORE_RELATIVE_PATH}#deriveBaziStrengthAssessment`])
  ]);
  const factorInclusion = Object.freeze([
    subject("bazi.engineering.factor-inclusion.declaration.v1", "declared_policy_values", observed.factorInclusion,
      "declaration_observed_named_reference_absent_dynamic_or_aliased_dataflow_unproven", [`${POLICY_RELATIVE_PATH}#BAZI_STRENGTH_POLICY.factorInclusion`]),
    subject("bazi.engineering.factor-inclusion.day-visible.v1", "algorithm_surface", {
      predicate: "position !== day", declaredValue: observed.factorInclusion.includeDayVisibleStem,
      declarationNamedReferenceObserved: false
    }, "declaration_and_stable_executable_syntax_coexist_equivalence_not_bound", [`${CORE_RELATIVE_PATH}#collectBaziStrengthFactors`]),
    subject("bazi.engineering.factor-inclusion.month-and-hidden.v1", "algorithm_surface", {
      monthCommandAddedWhenMonthMainPresent: true, allHiddenStemsIterated: true,
      declaredRetainBoth: observed.factorInclusion.retainMonthCommandAndFirstHiddenStem,
      declarationNamedReferenceObserved: false
    }, "stable_executable_syntax_observed_declaration_not_consumed_control_flow_unproven", [`${CORE_RELATIVE_PATH}#collectBaziStrengthFactors`]),
    subject("bazi.engineering.factor-inclusion.time-precision-matrix.v1", "cross_consumer_value_matrix",
      observed.timePrecisionMatrix, "hour_range_consumer_conflict_observed_mapping_not_freezable", [
        `${CONTRACTS_RELATIVE_PATH}#birthInputSchema.timePrecision`
      ], [
        `${PANEL_RELATIVE_PATH}#useBaziInterpretation`, `${REPORT_RELATIVE_PATH}#buildReportInterpretationEvidence`,
        `${LOCAL_AI_RELATIVE_PATH}#prepareLocalAiDraftValidationContext`, `${ENVELOPE_RELATIVE_PATH}#buildBaziInterpretationEvidenceEnvelope`
      ])
  ]);
  const direction = Object.freeze([
    subject("bazi.engineering.direction.alias-and-group-table.v1", "declared_policy_table", {
      aliases: observed.directionProjection.aliases, groups: observed.directionProjection.groups
    }, "repository_table_observed_value_provenance_unbound", [`${POLICY_RELATIVE_PATH}#BAZI_STRENGTH_TEN_GOD_ALIASES`, `${POLICY_RELATIVE_PATH}#BAZI_STRENGTH_TEN_GOD_GROUPS`]),
    subject("bazi.engineering.direction.group-to-side.v1", "declared_algorithm_mapping",
      observed.directionProjection.groupDirections, "repository_mapping_observed_engineering_rationale_unfrozen",
      [`${POLICY_RELATIVE_PATH}#strengthFactorDirectionForTenGod`]),
    subject("bazi.engineering.direction.unknown-drop.v1", "fail_closed_algorithm_surface", {
      unknownGroupResult: null, addFactorEffect: "drop_factor"
    }, "stable_executable_syntax_projection_observed_control_flow_and_domain_review_missing", [
      `${POLICY_RELATIVE_PATH}#strengthTenGodGroup`, `${CORE_RELATIVE_PATH}#addFactor`
    ]),
    subject("bazi.engineering.direction.upstream-shi-shen.v1", "lockfile_dependency_metadata_identity", {
      dependency, tableSymbol: "LunarUtil.SHI_SHEN", valueDigest: null
    }, "lockfile_metadata_and_source_reference_observed_table_bytes_unverified", [`${BAZI_CORE_RELATIVE_PATH}#buildPillar`])
  ]);
  const weights = Object.freeze([
    subject("bazi.engineering.weights.values.v1", "declared_policy_values", observed.factorWeights,
      "repository_values_observed_engineering_rationale_unfrozen", [`${POLICY_RELATIVE_PATH}#BAZI_STRENGTH_FACTOR_WEIGHTS`]),
    subject("bazi.engineering.weights.dispatch.v1", "algorithm_surface", {
      monthCommand: "monthCommand", visibleStem: "visibleStem", hiddenIndexZero: "firstHiddenStem",
      hiddenOtherIndex: "otherHiddenStem"
    }, "stable_executable_syntax_indicates_policy_dispatch_general_control_flow_unproven", [`${POLICY_RELATIVE_PATH}#strengthFactorWeight`]),
    subject("bazi.engineering.weights.guard-and-consumers.v1", "fail_closed_consumer_surface", {
      invalidHiddenIndexRejected: true,
      consumerCalls: ["month_command", "visible_stem", "hidden_stem_with_index"]
    }, "stable_executable_syntax_of_guard_and_consumers_observed_value_provenance_unfrozen", [
      `${POLICY_RELATIVE_PATH}#strengthFactorWeight`
    ], [`${CORE_RELATIVE_PATH}#collectBaziStrengthFactors`])
  ]);
  const duplication = Object.freeze([
    subject("bazi.engineering.month-duplication.declaration.v1", "declared_policy_value", {
      value: observed.monthMainDuplication
    }, "declaration_observed_named_reference_absent_dynamic_or_aliased_dataflow_unproven", [`${POLICY_RELATIVE_PATH}#BAZI_STRENGTH_POLICY.monthMainDuplication`]),
    subject("bazi.engineering.month-duplication.factor-pair.v1", "algorithm_surface", {
      monthCommandIdTemplate: "month-command:${month.branch}:${monthMainStem}",
      hiddenMainIdTemplate: "hidden:month:${monthMainStem}:0"
    }, "separate_factor_syntax_observed_declaration_not_consumed_control_flow_unproven", [`${CORE_RELATIVE_PATH}#collectBaziStrengthFactors`]),
    subject("bazi.engineering.month-duplication.detector.v1", "algorithm_surface", {
      matchByStemAndDirection: true, hiddenIndex: 0
    }, "sensitivity_detector_stable_syntax_observed_not_control_flow_or_formal_rule", [`${SENSITIVITY_RELATIVE_PATH}#findDuplicateMonthMain`]),
    subject("bazi.engineering.month-duplication.combined-weight.v1", "derived_repository_value", {
      currentMonthCommandWeight: observed.factorWeights.monthCommand,
      currentFirstHiddenWeight: observed.factorWeights.firstHiddenStem,
      currentCombinedWeight: observed.factorWeights.monthCommand + observed.factorWeights.firstHiddenStem
    }, "derived_candidate_value_observed_no_classical_or_expert_authority", [
      `${POLICY_RELATIVE_PATH}#BAZI_STRENGTH_FACTOR_WEIGHTS`, `${SENSITIVITY_RELATIVE_PATH}#findDuplicateMonthMain`
    ])
  ]);
  const thresholds = Object.freeze([
    subject("bazi.engineering.thresholds.values-and-operators.v1", "declared_policy_table",
      observed.thresholdProjection, "repository_values_observed_no_case_expert_or_statistical_calibration",
      [`${POLICY_RELATIVE_PATH}#BAZI_STRENGTH_BAND_THRESHOLDS`, `${POLICY_RELATIVE_PATH}#classifyStrengthBand`]),
    subject("bazi.engineering.thresholds.input-guard.v1", "fail_closed_algorithm_surface", {
      finiteRequired: true, nonNegativeRequired: true
    }, "stable_guard_syntax_observed_general_control_flow_unproven", [`${POLICY_RELATIVE_PATH}#classifyStrengthBand`]),
    subject("bazi.engineering.thresholds.zero-total.v1", "algorithm_surface", {
      totalZeroBand: "undetermined", totalZeroRatio: null
    }, "stable_boundary_syntax_observed_control_flow_and_score_semantics_unapproved", [
      `${POLICY_RELATIVE_PATH}#classifyStrengthBand`, `${CORE_RELATIVE_PATH}#deriveBaziStrengthAssessment`
    ]),
    subject("bazi.engineering.thresholds.ratio-and-band-consumer.v1", "consumer_surface", {
      ratioFormula: "supportWeight/(supportWeight+demandWeight)", bandFunction: "classifyStrengthBand"
    }, "producer_consumer_stable_syntax_observed_control_flow_and_formal_score_semantics_absent", [`${CORE_RELATIVE_PATH}#deriveBaziStrengthAssessment`])
  ]);
  const sensitivity = Object.freeze([
    subject("bazi.engineering.sensitivity.scenario-definitions.v1", "ordered_policy_table", observed.scenarios,
      "repository_six_scenarios_observed_not_six_schools_or_official_rules", [`${POLICY_RELATIVE_PATH}#BAZI_STRENGTH_SENSITIVITY_SCENARIOS`]),
    subject("bazi.engineering.sensitivity.duplicate-identity.v1", "algorithm_surface", {
      monthCommandGroup: "month_command", monthPosition: "month", hiddenIdTemplate: "hidden:month:${stem}:0"
    }, "detector_stable_syntax_observed_control_flow_unproven_not_domain_truth", [`${SENSITIVITY_RELATIVE_PATH}#findDuplicateMonthMain`]),
    subject("bazi.engineering.sensitivity.exclusion-predicates.v1", "algorithm_surface", {
      deduplicate: "duplicateHiddenId", excludeMonth: "month_command", excludeVisible: "visible_stem", excludeHidden: "hidden_stem"
    }, "sensitivity_operation_stable_syntax_observed_general_control_flow_unproven", [`${SENSITIVITY_RELATIVE_PATH}#scenarioExcludesFactor`]),
    subject("bazi.engineering.sensitivity.equal-weight.v1", "declared_algorithm_value", {
      operation: "equal_presence_deduplicated", appliedWeight: 1
    }, "sensitivity_value_stable_syntax_observed_control_flow_unproven_not_formal_weight", [`${SENSITIVITY_RELATIVE_PATH}#buildScenario`]),
    subject("bazi.engineering.sensitivity.stability-order.v1", "algorithm_surface", {
      priority: ["insufficient_when_baseline_undetermined", "direction_sensitive", "band_sensitive", "stable"]
    }, "summary_semantics_stable_syntax_observed_control_flow_unproven_expert_review_missing", [`${SENSITIVITY_RELATIVE_PATH}#buildStrengthSensitivityReview`]),
    subject("bazi.engineering.sensitivity.authority-nulls.v1", "fail_closed_authority_surface", {
      ...observed.sensitivityAuthorityProjection
    }, "authority_fields_mechanically_closed", [`${SENSITIVITY_RELATIVE_PATH}#validateStrengthSensitivityReview`])
  ]);
  return Object.freeze([core, factorInclusion, direction, weights, duplication, thresholds, sensitivity]);
}

function bindingProjection(candidate, freeze, subjects, expectedBindingId) {
  if (!candidate) fail("CANDIDATE_MISSING", `${expectedBindingId} 缺少工程 binding candidate。`);
  requireCandidateRed(candidate, expectedBindingId);
  if (
    !freeze
    || freeze.bindingId !== candidate.bindingId
    || freeze.ruleIds?.length !== 0
    || freeze.freezeState !== "candidate_only_unbound"
    || freeze.engineeringRationaleFrozen !== false
    || freeze.independentDomainReviewIds?.length !== 0
    || freeze.bindingDigest !== null
  ) fail("FREEZE_STATE_DRIFT", `${candidate.bindingId} 不再满足 value-subject 预账失败关闭状态。`);
  return Object.freeze({
    order: candidate.order,
    bindingId: candidate.bindingId,
    evidenceSubjectId: candidate.evidenceSubjectId,
    candidateId: candidate.candidateId,
    originType: candidate.originType,
    authorityBoundary: candidate.authorityBoundary,
    artifactLocks: Object.freeze(candidate.artifactLocks.map((entry) => Object.freeze({
      path: entry.path, sha256: entry.sha256, stableSymbols: Object.freeze([...entry.stableSymbols])
    }))),
    valueSubjects: subjects,
    valueSubjectCount: subjects.length,
    ruleIds: Object.freeze([]),
    evidenceSubjectAlgorithmIds: Object.freeze([]),
    evidenceSubjectFieldPaths: Object.freeze([]),
    evidenceSubjectRuleProfilePaths: Object.freeze([]),
    valueSubjectCoverageComplete: false,
    engineeringRationaleFrozen: false,
    firstPartyAuthorshipLegallyEstablished: false,
    independentEngineeringReviewIds: Object.freeze([]),
    independentDomainReviewIds: Object.freeze([]),
    bindingFreezeEligible: false,
    freezeState: freeze.freezeState,
    freezeEffect: "none"
  });
}

function expertPacketDrift(packet, currentBaziCoreSha256) {
  const lock = packet?.artifactLocks?.find((entry) => entry.path === BAZI_CORE_RELATIVE_PATH);
  if (!lock || !SHA256_PATTERN.test(lock.sha256 ?? "")) {
    fail("EXPERT_PACKET_DRIFT_SHAPE", "专家包缺少有效 bazi-core artifact lock。 ");
  }
  const matches = lock.sha256 === currentBaziCoreSha256;
  if (matches) fail("EXPERT_PACKET_STATE_DRIFT", "专家包 bazi-core 漂移已变化，必须独立重审而不是静默升级。 ");
  return Object.freeze({
    packetPath: EXPERT_PACKET_RELATIVE_PATH,
    artifactPath: BAZI_CORE_RELATIVE_PATH,
    packetSavedSha256: lock.sha256,
    currentSha256: currentBaziCoreSha256,
    artifactLockMatchesCurrent: false,
    packetVerifierExpectedToPassCurrent: false,
    packetResignedByThisGate: false,
    usableForEngineeringValueFreeze: false,
    usableForDomainExpertTruth: false
  });
}

function artifactProjection(definition, file) {
  return Object.freeze({
    path: definition.path,
    role: definition.role,
    bytes: file.bytes.length,
    sha256: sha256Bytes(file.bytes)
  });
}

export async function buildCurrentBaziEngineeringBindingValueSubjectGap(workspaceRoot, options = {}) {
  const createdAt = options.createdAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(createdAt))) fail("LEDGER_INVALID", "createdAt 必须是 ISO 时间。 ");
  const files = await Promise.all(BASIS_DEFINITIONS.map((entry) => readBoundFile(workspaceRoot, entry.path)));
  const fileByPath = new Map(BASIS_DEFINITIONS.map((entry, index) => [entry.path, files[index]]));
  const json = (relativePath, label) => parseBaziPr10bcScopeReconciliationJsonBytes(
    fileByPath.get(relativePath).bytes, label
  );
  const pr10bc = json(PR10BC_RELATIVE_PATH, "PR10B/PR10C reconciliation basis");
  const freezeLedger = json(FREEZE_RELATIVE_PATH, "binding freeze basis");
  const engineeringLedger = json(ENGINEERING_RELATIVE_PATH, "engineering candidate basis");
  const expertPacket = json(EXPERT_PACKET_RELATIVE_PATH, "expert packet drift basis");
  const packageLock = json(PACKAGE_LOCK_RELATIVE_PATH, "package-lock basis");
  await Promise.all([
    verifyBaziPr10bcScopeReconciliation(workspaceRoot, pr10bc),
    verifyBaziBindingFreezeRequirements(workspaceRoot, freezeLedger),
    verifyBaziEngineeringBindingCandidateLedger(workspaceRoot, engineeringLedger)
  ]);
  if (
    canonicalStringifyBaziEngineeringBindingValueSubjectGap(pr10bc.releaseGovernance)
      !== canonicalStringifyBaziEngineeringBindingValueSubjectGap(RELEASE_GOVERNANCE)
    || pr10bc.currentBindingInventory.exactRegisteredSourceBindings !== 12
    || pr10bc.currentBindingInventory.projectEngineeringBindings !== 7
    || pr10bc.currentBindingInventory.historicalTextBindings !== 4
    || pr10bc.currentBindingInventory.reviewGateBindings !== 1
    || pr10bc.currentBindingInventory.bindingsFrozenVerified !== 0
  ) fail("RELEASE_OR_BINDING_DRIFT", "当前发布身份或 7/4/1 binding inventory 已漂移。 ");

  const sourceFor = (relativePath) => decodeUtf8(fileByPath.get(relativePath).bytes, relativePath);
  const observed = extractCurrentBaziEngineeringValueObservations({
    policy: sourceFor(POLICY_RELATIVE_PATH),
    core: sourceFor(CORE_RELATIVE_PATH),
    sensitivity: sourceFor(SENSITIVITY_RELATIVE_PATH),
    baziCore: sourceFor(BAZI_CORE_RELATIVE_PATH),
    panel: sourceFor(PANEL_RELATIVE_PATH),
    report: sourceFor(REPORT_RELATIVE_PATH),
    localAi: sourceFor(LOCAL_AI_RELATIVE_PATH),
    envelope: sourceFor(ENVELOPE_RELATIVE_PATH),
    contracts: sourceFor(CONTRACTS_RELATIVE_PATH),
    knowledge: sourceFor(KNOWLEDGE_RELATIVE_PATH),
    sourceRefs: sourceFor(SOURCE_REFS_RELATIVE_PATH)
  });
  const dependency = dependencyIdentity(packageLock);
  const subjectGroups = buildSubjects(observed, dependency);
  if (
    canonicalStringifyBaziEngineeringBindingValueSubjectGap(observed.bindingEvidenceSubjectRegistry.bindingIds)
      !== canonicalStringifyBaziEngineeringBindingValueSubjectGap(pr10bc.currentBindingInventory.bindingIds)
  ) fail("EVIDENCE_SUBJECT_DRIFT", "binding EvidenceSubject registry 与当前 12 条 binding inventory 不一致。 ");
  const valueSubjectIds = subjectGroups.flatMap((group) => group.map((entry) => entry.valueSubjectId));
  if (
    valueSubjectIds.length !== 33
    || new Set(valueSubjectIds).size !== valueSubjectIds.length
    || valueSubjectIds.some((id) => observed.bindingEvidenceSubjectRegistry.stringLiteralValues.includes(id))
  ) fail("EVIDENCE_SUBJECT_DRIFT", "33 个 value-subject 候选身份已重复或进入正式 EvidenceSubject registry。 ");
  const candidateByBinding = new Map(engineeringLedger.candidates.map((entry) => [entry.bindingId, entry]));
  const freezeByBinding = new Map(freezeLedger.bindings.map((entry) => [entry.bindingId, entry]));
  for (const bindingId of ENGINEERING_BINDING_IDS) {
    if (
      candidateByBinding.get(bindingId)?.evidenceSubjectId
      !== observed.bindingEvidenceSubjectRegistry.subjectIdsByBinding[bindingId]
    ) fail("EVIDENCE_SUBJECT_DRIFT", `${bindingId} 的工程候选与正式 EvidenceSubject 身份不一致。`);
  }
  const engineeringBindings = Object.freeze(ENGINEERING_BINDING_IDS.map((bindingId, index) => bindingProjection(
    candidateByBinding.get(bindingId), freezeByBinding.get(bindingId), subjectGroups[index], bindingId
  )));
  const valueSubjectCount = engineeringBindings.reduce((sum, entry) => sum + entry.valueSubjectCount, 0);
  if (valueSubjectCount !== 33) fail("VALUE_SUBJECT_INVENTORY_DRIFT", `工程 value-subject 应为精确 33 项，实际 ${valueSubjectCount}。`);

  const factorRefs = observed.legacySourceRefs.filter((entry) => FACTOR_SOURCE_REF_IDS.includes(entry.id));
  if (factorRefs.length !== FACTOR_SOURCE_REF_IDS.length) fail("SOURCE_REF_DRIFT", "因素 producer 的三个 legacy sourceRef 不完整。 ");
  const exactSourceRefBindingIdMatches = FACTOR_SOURCE_REF_IDS.filter((id) =>
    pr10bc.currentBindingInventory.bindingIds.includes(id)
  ).length;
  if (exactSourceRefBindingIdMatches !== 0) fail("SOURCE_REF_DRIFT", "legacy sourceRef 与工程 binding ID 边界已变化。 ");
  if (freezeLedger.bindings.some((entry) =>
    entry.sourceRightsRecordId !== null || entry.sourceCarrierRecordId !== null
  )) fail("RIGHTS_STATE_DRIFT", "当前 12 条 binding 已出现正式权利或载体记录，缺口账必须重建。 ");
  const precisionConflictRows = observed.timePrecisionMatrix.filter((entry) =>
    new Set([
      entry.interactivePanelIncludesHour,
      entry.reportIncludesHour,
      entry.localAiIncludesHour,
      entry.evidenceEnvelopeAllowsIncludedHour
    ]).size > 1
  );
  if (precisionConflictRows.length !== 1 || precisionConflictRows[0].timePrecision !== "hour_range") {
    fail("TIME_PRECISION_MAPPING_DRIFT", "includeHour 消费者差异必须精确限定于 hour_range。 ");
  }
  const currentBaziCoreSha256 = sha256Bytes(fileByPath.get(BAZI_CORE_RELATIVE_PATH).bytes);
  const packetDrift = expertPacketDrift(expertPacket, currentBaziCoreSha256);

  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: "bazi_engineering_binding_value_subject_gap_v1",
    ledgerId: "hakimi.bazi.engineering_binding_value_subject_gaps/1.0.0",
    status: "candidate_only_value_subject_gaps_open",
    createdAt,
    releaseGovernance: RELEASE_GOVERNANCE,
    scopeBoundary: {
      phase: "C_source_rights_and_binding_governance",
      batch: "PR10C_engineering_binding_value_subject_pre_freeze",
      scopedEngineeringBindings: 7,
      historicalTextBindingsExcludedFromThisGate: 4,
      reviewGateBindingsExcludedFromThisGate: 1,
      pr10bTableModelsRepresentedInThisGate: 0,
      currentInventoryParallelBindingRegistrations: 0,
      formalLifecycleIntegrationAssessed: false,
      centralManifestResigningAssessed: false,
      repositoryMutationSetMechanicallyEstablished: false
    },
    observationBoundary: {
      directBasisHashAndParseUseSameReadBuffer: true,
      directSourceHashAndAstInspectionUseSameReadBuffer: true,
      downstreamVerifierReadsReuseDirectBuffers: false,
      nestedVerifierSameBufferTransitivityClaimed: false,
      stableExecutableSyntaxFragmentsObserved: true,
      generalControlFlowEquivalenceMechanicallyEstablished: false,
      generalDataFlowEquivalenceMechanicallyEstablished: false,
      runtimeExecutionObserved: false,
      endpointSnapshotOnly: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      intervalMutationExcluded: false,
      abaExcluded: false
    },
    currentBindingInventory: {
      bindingIds: Object.freeze([...pr10bc.currentBindingInventory.bindingIds]),
      engineeringBindingIds: ENGINEERING_BINDING_IDS,
      exactRegisteredSourceBindings: 12,
      inventorySplit: Object.freeze({ engineering: 7, historicalText: 4, reviewGate: 1 }),
      bindingFrozenVerified: 0
    },
    basisArtifacts: Object.freeze(BASIS_DEFINITIONS.map((entry) => artifactProjection(entry, fileByPath.get(entry.path)))),
    valueSubjectBoundary: {
      subjectIdentityClass: "repository_authored_engineering_value_subject_candidate",
      formalEvidenceSubjectRegistrationObservedInAssessedRegistry: false,
      repositoryWideFormalEvidenceSubjectRegistrationAssessed: false,
      valueSubjectIdsObservedInCurrentBindingInventory: 0,
      wholeFileHashAloneEstablishesValueFreeze: false,
      engineeringDefinitionMayBeObservedWithoutClassicalAuthority: true,
      consumerAgreementRequiredForFreeze: true,
      upstreamTableIdentityAndValueDigestRequiredForFreeze: true,
      engineeringRationaleRequiredForFreeze: true,
      independentEngineeringAndDomainReviewRequiredForFreeze: true,
      sourceRightsAndCarrierRightsMustRemainSeparate: true
    },
    engineeringBindings,
    crossBindingGaps: {
      declaredPolicyConsumption: {
        factorInclusionDeclarationObserved: true,
        factorInclusionNamedReferenceInScopedFactorSource: false,
        monthMainDuplicationDeclarationObserved: true,
        monthMainDuplicationNamedReferenceInScopedFactorAndSensitivitySources: false,
        dynamicOrAliasedDeclarationDataFlowAbsenceEstablished: false,
        stableExecutableSyntaxMatchesSomeDeclaredValues: true,
        declaredValueToBehaviorEquivalenceMechanicallyEstablished: false,
        repositoryWideDeclarationConsumerAbsenceEstablished: false
      },
      includeHourConsumerMatrix: {
        rows: observed.timePrecisionMatrix,
        conflictPrecisionValues: Object.freeze(precisionConflictRows.map((entry) => entry.timePrecision)),
        allConsumersAgreeForAllPrecisionValues: false,
        hourRangeMappingFrozen: false,
        domainAndProductDecisionRequired: true
      },
      legacySourceRefCrosswalk: {
        factorSourceRefs: Object.freeze(factorRefs),
        currentBindingIds: Object.freeze([...pr10bc.currentBindingInventory.bindingIds]),
        exactStringIdMatches: 0,
        semanticCrosswalkRecordsEstablishedByThisGate: Object.freeze([]),
        repositoryWideSemanticCrosswalkInventoryAssessed: false,
        semanticEquivalenceMechanicallyEstablished: false,
        legacyUrlIsPinnedCurrentBindingEvidence: false
      },
      evidenceSubjectLocatorCoverage: {
        bindingEvidenceSubjects: observed.bindingEvidenceSubjectRegistry.bindingIds.length,
        subjectsWithAlgorithmIds: observed.bindingEvidenceSubjectRegistry.subjectsWithAlgorithmIds,
        subjectsWithFieldPaths: observed.bindingEvidenceSubjectRegistry.subjectsWithFieldPaths,
        subjectsWithRuleProfilePaths: observed.bindingEvidenceSubjectRegistry.subjectsWithRuleProfilePaths,
        valueSubjectIdsObservedInAssessedBindingEvidenceSubjectRegistry: 0,
        repositoryWideFormalEvidenceSubjectRegistrationAssessed: false,
        currentValueSubjectCoverageComplete: false
      },
      upstreamDependencyValueProvenance: {
        dependency,
        zhiHideGanSourceReferenceObserved: true,
        shiShenSourceReferenceObserved: true,
        runtimeProducerExecutionObserved: false,
        tableValueDigestsBound: 0,
        tableSourceProvenanceRecordsBound: 0,
        tableContentTruthEstablished: false,
        tableRightsLegalConclusionEstablished: false
      },
      expertPacketArtifactClosure: packetDrift
    },
    gateSummary: {
      currentBindings: 12,
      engineeringBindingsScoped: 7,
      engineeringValueSubjectsObserved: valueSubjectCount,
      valueSubjectsObservedInAssessedFormalEvidenceSubjectRegistry: 0,
      repositoryWideFormalEvidenceSubjectRegistrationAssessed: false,
      valueSubjectsWithFrozenProvenance: 0,
      valueSubjectsFreezeEligible: 0,
      policyDeclarationsWithoutNamedScopedSourceReference: 2,
      includeHourConsumerConflictPrecisions: 1,
      legacySourceRefSemanticCrosswalksEstablishedByThisGate: 0,
      evidenceSubjectsWithAlgorithmOrFieldLocators: 0,
      upstreamTableValueDigestsBound: 0,
      generalControlFlowOrDataFlowEquivalenceEstablished: false,
      expertPacketCurrentArtifactClosure: false,
      engineeringRationalesFrozen: 0,
      bindingFrozenVerified: 0,
      formalSourceRightsRecords: 0,
      formalSourceCarrierRecords: 0,
      independentEngineeringReviewsVerified: 0,
      independentDomainReviewsVerified: 0,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      browserRuntimeEvidenceEstablished: false,
      formalActivationAllowed: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    evidenceLedger: {
      engineeringEvidence: "seven_engineering_binding_literal_ast_and_stable_executable_syntax_gaps_observed_no_general_control_flow_or_data_flow_equivalence",
      browserRuntimeEvidence: "not_assessed_source_inspection_only",
      contentTruth: "not_established",
      expertTruth: "not_established",
      rightsLegalConclusion: "not_established",
      releaseReadiness: "not_ready",
      publicReleaseAuthorization: "not_authorized"
    },
    doesNotEstablish: [
      "pr10b_table_model_or_value_rows",
      "historical_text_binding_freeze",
      "new_or_parallel_binding_identity",
      "formal_evidence_subject_registration",
      "declared_policy_to_behavior_equivalence",
      "hour_range_include_hour_semantics",
      "legacy_source_ref_to_current_binding_semantic_equivalence",
      "lunar_typescript_table_value_identity_or_provenance",
      "engineering_rationale_freeze",
      "source_body_or_exact_quote_text",
      "work_edition_or_carrier_rights_clearance",
      "binding_frozen_verification",
      "classical_or_traditional_authority",
      "content_truth",
      "expert_truth",
      "rights_or_legal_conclusion",
      "browser_or_runtime_validation",
      "general_control_flow_or_data_flow_equivalence",
      "runtime_execution",
      "cross_file_atomic_snapshot",
      "interval_mutation_or_aba_exclusion",
      "central_release_manifest_closure",
      "release_readiness",
      "public_release_authorization"
    ]
  };
  return Object.freeze({
    ...unsigned,
    ledgerDigest: computeBaziEngineeringBindingValueSubjectGapDigest(unsigned)
  });
}

export function parseBaziEngineeringBindingValueSubjectGapJsonBytes(
  bytes,
  label = "工程 binding value-subject gap JSON"
) {
  return parseBaziPr10bcScopeReconciliationJsonBytes(bytes, label);
}

export async function readBaziEngineeringBindingValueSubjectGap(
  workspaceRoot,
  relativePath = BAZI_ENGINEERING_BINDING_VALUE_SUBJECT_GAP_RELATIVE_PATH
) {
  const file = await readBoundFile(workspaceRoot, relativePath, MAX_LEDGER_BYTES);
  return parseBaziEngineeringBindingValueSubjectGapJsonBytes(file.bytes);
}

export async function verifyBaziEngineeringBindingValueSubjectGap(workspaceRoot, ledgerInput) {
  if (!ledgerInput || typeof ledgerInput !== "object" || Array.isArray(ledgerInput)) {
    fail("LEDGER_INVALID", "工程 binding value-subject gap 必须是 JSON 对象。 ");
  }
  if (
    typeof ledgerInput.createdAt !== "string"
    || !Number.isFinite(Date.parse(ledgerInput.createdAt))
    || !SHA256_PATTERN.test(ledgerInput.ledgerDigest ?? "")
  ) fail("LEDGER_INVALID", "工程 binding value-subject gap 时间或摘要无效。 ");
  const expected = await buildCurrentBaziEngineeringBindingValueSubjectGap(workspaceRoot, {
    createdAt: ledgerInput.createdAt
  });
  if (
    canonicalStringifyBaziEngineeringBindingValueSubjectGap(ledgerInput)
    !== canonicalStringifyBaziEngineeringBindingValueSubjectGap(expected)
  ) fail(
    "LEDGER_MISMATCH",
    "工程 binding value-subject gap 与当前七条工程 binding、producer/consumer 或失败关闭状态不一致。"
  );
  return Object.freeze({
    ledger: ledgerInput,
    ledgerDigest: ledgerInput.ledgerDigest,
    engineeringBindingsScoped: ledgerInput.gateSummary.engineeringBindingsScoped,
    engineeringValueSubjectsObserved: ledgerInput.gateSummary.engineeringValueSubjectsObserved,
    valueSubjectsFreezeEligible: ledgerInput.gateSummary.valueSubjectsFreezeEligible,
    bindingsFrozen: ledgerInput.gateSummary.bindingFrozenVerified
  });
}
