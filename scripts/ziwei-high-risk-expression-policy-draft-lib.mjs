import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { TextDecoder, types as utilTypes } from "node:util";
import { parse, parseExpression } from "@babel/parser";

export const ZIWEI_HIGH_RISK_EXPRESSION_POLICY_DRAFT_RELATIVE_PATH =
  "content/system-admission/ziwei-high-risk-expression-policy-draft.v0.1.0.json";

export const ZIWEI_HIGH_RISK_EXPRESSION_POLICY_SOURCE_RELATIVE_PATH =
  "packages/ziwei-iztro-adapter-draft/src/browser-preview/high-risk-expression-egress-policy.ts";

const CHILD_ID = "hakimi.ziwei.high-risk-expression-policy-draft/0.1.0";
const CHILD_DIGEST_DOMAIN = "hakimi.ziwei.high-risk-expression-policy-draft.v0.1";
const CATEGORY_DIGEST_DOMAIN = "hakimi.ziwei.high-risk-expression-policy-draft.risk-categories.v0.1";
const SURFACE_DIGEST_DOMAIN = "hakimi.ziwei.high-risk-expression-policy-draft.egress-surfaces.v0.1";
const MAX_ARTIFACT_BYTES = 500_000;
const MAX_SOURCE_BYTES = 200_000;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const TYPED_ARRAY_PROTOTYPE = Object.getPrototypeOf(Uint8Array.prototype);
const TYPED_ARRAY_BYTE_LENGTH_GETTER =
  Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "byteLength").get;
const TYPED_ARRAY_BUFFER_GETTER =
  Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "buffer").get;
const ARRAY_BUFFER_RESIZABLE_GETTER =
  Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "resizable")?.get;
const UINT8_ARRAY_SET = Uint8Array.prototype.set;

const EXPECTED_SOURCE_IDENTITY = Object.freeze({
  bytes: 34_053,
  path: ZIWEI_HIGH_RISK_EXPRESSION_POLICY_SOURCE_RELATIVE_PATH,
  sha256: "7b10bb23fe0194b0dc564eec895d9dc1bb99658ad5fcc710f8edd14d1fdd8616"
});

const EXPECTED_POLICY_IDENTITY = Object.freeze({
  canonicalDigest: "f2be6ba54f97522ceadc776a4db1f599c33d48dcfe7ba77a2a740aec1123b715",
  canonicalDigestAlgorithm: "SHA-256",
  policyId: "hakimi.ziwei.high-risk-expression-egress-policy/0.1.0",
  policyStatus: "isolated_first_party_conservative_engineering_policy",
  policyVersion: "0.1.0",
  surfaceRegistryVersion: "hakimi.ziwei.candidate-egress-surfaces/0.1.0"
});

const EXPECTED_CATEGORY_IDS = Object.freeze([
  "deterministic_personal_outcome",
  "health_medical_reproductive",
  "legal_criminal",
  "financial_investment",
  "death_disaster_violence_self_harm",
  "relationships_family",
  "employment_social_identity",
  "mental_health_personality_diagnosis"
]);

const EXPECTED_SURFACE_IDS = Object.freeze([
  "ziwei.candidate.core-minor-star.base",
  "ziwei.candidate.core-minor-star.palace",
  "ziwei.candidate.core-minor-star.sanfang-review",
  "ziwei.candidate.core-minor-star.sanfang-feedback-preflight",
  "ziwei.candidate.major-star.base",
  "ziwei.candidate.major-star.combination-review",
  "ziwei.candidate.major-star.palace",
  "ziwei.candidate.palace-role.base",
  "ziwei.candidate.major-star.same-star-synthesis",
  "ziwei.candidate.natal-transformation.base",
  "ziwei.candidate.natal-transformation.palace",
  "ziwei.candidate.natal-transformation.palace-feedback-preflight",
  "ziwei.candidate.natal-transformation.review",
  "ziwei.candidate.palace.first-synthesis",
  "ziwei.candidate.palace.four-part-synthesis",
  "ziwei.projection.browser-display"
]);

export class ZiweiHighRiskExpressionPolicyDraftError extends Error {
  constructor(code, message, options = undefined) {
    super(message, options);
    this.name = "ZiweiHighRiskExpressionPolicyDraftError";
    this.code = code;
  }
}

function fail(code, message, cause = undefined) {
  throw new ZiweiHighRiskExpressionPolicyDraftError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function assertPlainJson(value, label = "value", seen = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      fail("NON_JSON_VALUE", `${label} 含非有限数字或负零。`);
    }
    return;
  }
  if (typeof value !== "object" || utilTypes.isProxy(value)) {
    fail("NON_JSON_VALUE", `${label} 必须是普通 JSON 值。`);
  }
  if (seen.has(value)) fail("NON_JSON_VALUE", `${label} 含循环或共享引用。`);
  seen.add(value);
  const isArray = Array.isArray(value);
  const prototype = Object.getPrototypeOf(value);
  if ((isArray && prototype !== Array.prototype)
    || (!isArray && prototype !== Object.prototype && prototype !== null)) {
    fail("NON_JSON_VALUE", `${label} 含非普通 JSON 原型。`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some((key) => typeof key !== "string")) {
    fail("NON_JSON_VALUE", `${label} 含 Symbol 属性。`);
  }
  if (isArray) {
    const expectedKeys = Array.from({ length: value.length }, (_, index) => String(index));
    const actualKeys = keys.filter((key) => key !== "length");
    if (actualKeys.length !== expectedKeys.length
      || actualKeys.some((key, index) => key !== expectedKeys[index])) {
      fail("NON_JSON_VALUE", `${label} 含稀疏或额外数组属性。`);
    }
  }
  for (const key of keys) {
    if (isArray && key === "length") continue;
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      fail("NON_JSON_VALUE", `${label}.${key} 含 accessor 或非枚举属性。`);
    }
    assertPlainJson(descriptor.value, `${label}.${key}`, seen);
  }
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

export function canonicalStringifyZiweiHighRiskExpressionPolicyDraft(value) {
  assertPlainJson(value);
  return JSON.stringify(canonicalize(value));
}

export function canonicalPrettyStringifyZiweiHighRiskExpressionPolicyDraft(value) {
  assertPlainJson(value);
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}

function copyJson(value) {
  return JSON.parse(canonicalStringifyZiweiHighRiskExpressionPolicyDraft(value));
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function domainDigest(domain, value) {
  return sha256(Buffer.from(
    `${domain}\0${canonicalStringifyZiweiHighRiskExpressionPolicyDraft(value)}`,
    "utf8"
  ));
}

function withoutChildDigest(value) {
  const copy = copyJson(value);
  delete copy.childDigest;
  return copy;
}

export function computeZiweiHighRiskExpressionPolicyDraftDigest(value) {
  return domainDigest(CHILD_DIGEST_DOMAIN, withoutChildDigest(value));
}

function parseStrictJsonBytes(bytes, label, maxBytes) {
  if (bytes === null || (typeof bytes !== "object" && typeof bytes !== "function")
    || utilTypes.isProxy(bytes)
    || typeof utilTypes.isUint8Array !== "function"
    || !utilTypes.isUint8Array(bytes)) {
    fail("JSON_INVALID", `${label} 必须是非 Proxy Uint8Array。`);
  }
  let byteLength;
  let backingBuffer;
  try {
    byteLength = Reflect.apply(TYPED_ARRAY_BYTE_LENGTH_GETTER, bytes, []);
    backingBuffer = Reflect.apply(TYPED_ARRAY_BUFFER_GETTER, bytes, []);
  } catch (cause) {
    fail("JSON_INVALID", `${label} 必须具有可读取的 Uint8Array 内部槽。`, cause);
  }
  if (typeof utilTypes.isSharedArrayBuffer === "function"
    && utilTypes.isSharedArrayBuffer(backingBuffer)) {
    fail("JSON_SHARED_BUFFER_FORBIDDEN", `${label} 不接受 SharedArrayBuffer。`);
  }
  if (!utilTypes.isArrayBuffer(backingBuffer)) {
    fail("JSON_INVALID", `${label} 的 backing buffer 无效。`);
  }
  if (typeof ARRAY_BUFFER_RESIZABLE_GETTER === "function") {
    let resizable;
    try {
      resizable = Reflect.apply(ARRAY_BUFFER_RESIZABLE_GETTER, backingBuffer, []);
    } catch (cause) {
      fail("JSON_INVALID", `${label} 的 ArrayBuffer 状态不可读取。`, cause);
    }
    if (resizable) fail("JSON_RESIZABLE_BUFFER_FORBIDDEN", `${label} 不接受可变 ArrayBuffer。`);
  }
  if (!Number.isSafeInteger(byteLength) || byteLength < 2 || byteLength > maxBytes) {
    fail("JSON_TOO_LARGE", `${label} 为空、过短或超过输入上限。`);
  }
  const captured = new Uint8Array(byteLength);
  try {
    Reflect.apply(UINT8_ARRAY_SET, captured, [bytes]);
  } catch (cause) {
    fail("JSON_INVALID", `${label} 无法按内部槽复制。`, cause);
  }
  if (captured.byteLength >= 3
    && captured[0] === 0xef && captured[1] === 0xbb && captured[2] === 0xbf) {
    fail("JSON_BOM_FORBIDDEN", `${label} 不得包含 UTF-8 BOM。`);
  }
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(captured);
  } catch (cause) {
    fail("JSON_UTF8_INVALID", `${label} 不是严格 UTF-8。`, cause);
  }
  let expression;
  try {
    expression = parseExpression(source.trim(), {
      attachComment: false,
      errorRecovery: false,
      sourceFilename: "ziwei-high-risk-expression-policy-draft.json",
      sourceType: "script"
    });
  } catch (cause) {
    fail("JSON_INVALID", `${label} 不能按严格 JSON 检查。`, cause);
  }
  const stack = [expression];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    if (node.type === "ObjectExpression") {
      const keys = new Set();
      for (const property of node.properties) {
        if (property.type !== "ObjectProperty" || property.computed
          || property.key?.type !== "StringLiteral") {
          fail("JSON_INVALID", `${label} 含非 JSON 对象属性。`);
        }
        if (keys.has(property.key.value)) {
          fail("JSON_DUPLICATE_KEY", `${label} 含重复对象键。`);
        }
        keys.add(property.key.value);
      }
    }
    for (const [key, child] of Object.entries(node)) {
      if (["loc", "start", "end", "extra"].includes(key)) continue;
      if (Array.isArray(child)) stack.push(...child);
      else if (child && typeof child === "object" && typeof child.type === "string") stack.push(child);
    }
  }
  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch (cause) {
    fail("JSON_INVALID", `${label} 不是有效 JSON。`, cause);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    fail("JSON_INVALID", `${label} 必须是 JSON 对象。`);
  }
  assertPlainJson(parsed, label);
  return parsed;
}

export function parseZiweiHighRiskExpressionPolicyDraftJsonBytes(
  bytes,
  label = "紫微高风险表达政策 child"
) {
  return parseStrictJsonBytes(bytes, label, MAX_ARTIFACT_BYTES);
}

function safeWorkspaceFile(workspaceRoot, relativePath) {
  const segments = typeof relativePath === "string" ? relativePath.split("/") : [];
  if (typeof relativePath !== "string" || relativePath.length < 1 || relativePath.length > 500
    || relativePath.includes("\0") || relativePath.includes("\\") || relativePath.startsWith("/")
    || path.posix.normalize(relativePath) !== relativePath
    || segments.some((segment) => segment === "" || segment === "." || segment === ".." || segment.includes(":"))) {
    fail("UNSAFE_ARTIFACT_PATH", `路径不安全：${String(relativePath)}`);
  }
  const root = path.resolve(workspaceRoot);
  const absolute = path.resolve(root, ...segments);
  const relative = path.relative(root, absolute);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    fail("UNSAFE_ARTIFACT_PATH", `路径越出工作区：${relativePath}`);
  }
  return absolute;
}

function isSameOrWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === ""
    || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function sameEndpoint(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.nlink === right.nlink
    && left.size === right.size && left.mtimeNs === right.mtimeNs && left.ctimeNs === right.ctimeNs;
}

async function captureDirectoryChain(workspaceRoot, absolutePath, code, label) {
  const root = path.resolve(workspaceRoot);
  const directory = path.dirname(absolutePath);
  if (!isSameOrWithin(root, directory)) fail(code, `${label}目录越出工作区。`);
  const relative = path.relative(root, directory);
  const segments = relative === "" ? [] : relative.split(path.sep);
  const entries = [];
  let cursor = root;
  for (const segment of [null, ...segments]) {
    if (segment !== null) cursor = path.join(cursor, segment);
    const metadata = await lstat(cursor, { bigint: true });
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
      fail(code, `${label}目录链不能包含符号链接、junction 或特殊端点。`);
    }
    const resolvedPath = await realpath(cursor);
    if (entries.length > 0 && !isSameOrWithin(entries[0].resolvedPath, resolvedPath)) {
      fail(code, `${label}目录链 realpath 越界。`);
    }
    entries.push(Object.freeze({ absolutePath: cursor, metadata, resolvedPath }));
  }
  return Object.freeze(entries);
}

function sameDirectoryChain(left, right) {
  return left.length === right.length && left.every((entry, index) => {
    const other = right[index];
    return other && entry.absolutePath === other.absolutePath && entry.resolvedPath === other.resolvedPath
      && sameEndpoint(entry.metadata, other.metadata);
  });
}

async function readAtMost(handle, maxBytes, code, label) {
  const chunks = [];
  let total = 0;
  while (total <= maxBytes) {
    const capacity = Math.min(64 * 1024, maxBytes + 1 - total);
    const chunk = Buffer.allocUnsafe(capacity);
    const { bytesRead } = await handle.read(chunk, 0, capacity, total);
    if (bytesRead === 0) break;
    chunks.push(Buffer.from(chunk.subarray(0, bytesRead)));
    total += bytesRead;
  }
  if (total > maxBytes) fail(code, `${label}超过输入上限。`);
  return Buffer.concat(chunks, total);
}

async function readStableWorkspaceFile(workspaceRoot, relativePath, maxBytes, options) {
  const absolute = safeWorkspaceFile(workspaceRoot, relativePath);
  let chainBefore;
  let before;
  let resolved;
  try {
    chainBefore = await captureDirectoryChain(workspaceRoot, absolute, options.invalidCode, options.label);
    [before, resolved] = await Promise.all([lstat(absolute, { bigint: true }), realpath(absolute)]);
  } catch (cause) {
    if (cause instanceof ZiweiHighRiskExpressionPolicyDraftError) throw cause;
    fail(options.missingCode, `${options.label}不存在。`, cause);
  }
  if (!isSameOrWithin(chainBefore[0].resolvedPath, resolved) || before.isSymbolicLink()
    || !before.isFile() || before.nlink !== 1n || before.size <= 0n
    || before.size > BigInt(maxBytes)) {
    fail(options.invalidCode, `${options.label}必须是工作区内独立普通小文件。`);
  }
  const noFollow = typeof fsConstants.O_NOFOLLOW === "number" ? fsConstants.O_NOFOLLOW : 0;
  const handle = await open(resolved, fsConstants.O_RDONLY | noFollow);
  try {
    const opened = await handle.stat({ bigint: true });
    if (!opened.isFile() || opened.nlink !== 1n || !sameEndpoint(before, opened)) {
      fail(options.invalidCode, `${options.label}在打开前发生身份换绑。`);
    }
    const bytes = await readAtMost(handle, maxBytes, options.invalidCode, options.label);
    const [afterHandle, afterPath, resolvedAfter, chainAfter] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(absolute, { bigint: true }),
      realpath(absolute),
      captureDirectoryChain(workspaceRoot, absolute, options.invalidCode, options.label)
    ]);
    if (afterPath.isSymbolicLink() || !afterPath.isFile() || afterPath.nlink !== 1n
      || BigInt(bytes.byteLength) !== opened.size || !sameEndpoint(opened, afterHandle)
      || !sameEndpoint(opened, afterPath) || resolvedAfter !== resolved
      || !sameDirectoryChain(chainBefore, chainAfter)) {
      fail(options.invalidCode, `${options.label}在读取端点之间发生变化。`);
    }
    return Object.freeze({
      bytes,
      path: relativePath,
      sha256: sha256(bytes),
      size: bytes.byteLength
    });
  } finally {
    await handle.close();
  }
}

function decodeStrictUtf8(bytes, label) {
  if (bytes.byteLength >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail("SOURCE_UTF8_INVALID", `${label}不得包含 UTF-8 BOM。`);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (cause) {
    fail("SOURCE_UTF8_INVALID", `${label}不是严格 UTF-8。`, cause);
  }
}

function collectTopLevelConstInitializers(program) {
  const declarations = new Map();
  for (const statement of program.body) {
    const candidate = statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
    if (candidate?.type !== "VariableDeclaration" || candidate.kind !== "const") continue;
    for (const declarator of candidate.declarations) {
      if (declarator.id?.type !== "Identifier" || !declarator.init) continue;
      if (declarations.has(declarator.id.name)) {
        fail("SOURCE_AST_INVALID", `源码含重复顶层 const：${declarator.id.name}`);
      }
      declarations.set(declarator.id.name, declarator.init);
    }
  }
  return declarations;
}

function createStaticEvaluator(declarations) {
  const cache = new Map();
  const active = new Set();

  function evaluateIdentifier(name) {
    if (cache.has(name)) return cache.get(name);
    const initializer = declarations.get(name);
    if (!initializer || active.has(name)) {
      fail("SOURCE_AST_INVALID", `源码静态值不可解析：${name}`);
    }
    active.add(name);
    const value = evaluate(initializer);
    active.delete(name);
    cache.set(name, value);
    return value;
  }

  function evaluate(node) {
    if (!node || typeof node !== "object") fail("SOURCE_AST_INVALID", "源码静态节点缺失。");
    if (["TSAsExpression", "TSSatisfiesExpression", "TypeCastExpression", "ParenthesizedExpression"].includes(node.type)) {
      return evaluate(node.expression);
    }
    if (node.type === "StringLiteral" || node.type === "NumericLiteral"
      || node.type === "BooleanLiteral") return node.value;
    if (node.type === "NullLiteral") return null;
    if (node.type === "Identifier") return evaluateIdentifier(node.name);
    if (node.type === "ArrayExpression") {
      if (node.elements.some((element) => element === null || element.type === "SpreadElement")) {
        fail("SOURCE_AST_INVALID", "源码静态数组不得稀疏或展开。");
      }
      return node.elements.map(evaluate);
    }
    if (node.type === "CallExpression" && node.callee?.type === "Identifier"
      && ["frozenArray", "frozenRecord"].includes(node.callee.name)
      && node.arguments.length === 1 && node.arguments[0]?.type !== "SpreadElement") {
      const material = evaluate(node.arguments[0]);
      if (!Array.isArray(material)) fail("SOURCE_AST_INVALID", `${node.callee.name} 参数不是数组。`);
      if (node.callee.name === "frozenArray") return material;
      const record = Object.create(null);
      for (const entry of material) {
        if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== "string"
          || Object.hasOwn(record, entry[0])) {
          fail("SOURCE_AST_INVALID", "frozenRecord 静态条目无效或重复。");
        }
        record[entry[0]] = entry[1];
      }
      return record;
    }
    fail("SOURCE_AST_INVALID", `不支持的源码静态节点：${node.type}`);
  }

  return Object.freeze({ evaluateIdentifier });
}

function assertExactList(actual, expected, code, label) {
  if (!Array.isArray(actual) || actual.length !== expected.length
    || actual.some((value, index) => value !== expected[index])
    || new Set(actual).size !== expected.length) {
    fail(code, `${label}必须精确匹配固定顺序且无重复。`);
  }
}

function inspectPolicySource(snapshot) {
  if (snapshot.path !== EXPECTED_SOURCE_IDENTITY.path
    || snapshot.size !== EXPECTED_SOURCE_IDENTITY.bytes
    || snapshot.sha256 !== EXPECTED_SOURCE_IDENTITY.sha256) {
    fail("SOURCE_IDENTITY_MISMATCH", "紫微高风险表达 policy 源码原始字节身份漂移。");
  }
  const source = decodeStrictUtf8(snapshot.bytes, "紫微高风险表达 policy 源码");
  let ast;
  try {
    ast = parse(source, {
      attachComment: false,
      errorRecovery: false,
      plugins: ["typescript"],
      sourceFilename: ZIWEI_HIGH_RISK_EXPRESSION_POLICY_SOURCE_RELATIVE_PATH,
      sourceType: "module"
    });
  } catch (cause) {
    fail("SOURCE_AST_INVALID", "紫微高风险表达 policy 源码无法按 TypeScript AST 解析。", cause);
  }
  const evaluator = createStaticEvaluator(collectTopLevelConstInitializers(ast.program));
  const policy = evaluator.evaluateIdentifier("POLICY_BASE");
  const policyId = evaluator.evaluateIdentifier("POLICY_ID");
  const policyVersion = evaluator.evaluateIdentifier("POLICY_VERSION");
  const policyStatus = evaluator.evaluateIdentifier("POLICY_STATUS");
  const digestAlgorithm = evaluator.evaluateIdentifier("POLICY_DIGEST_ALGORITHM");
  const declaredDigest = evaluator.evaluateIdentifier("POLICY_DIGEST");
  const surfaceRegistryVersion = evaluator.evaluateIdentifier("SURFACE_REGISTRY_VERSION");
  assertPlainJson(policy, "POLICY_BASE");
  const computedDigest = sha256(Buffer.from(
    canonicalStringifyZiweiHighRiskExpressionPolicyDraft(policy),
    "utf8"
  ));
  if (policyId !== EXPECTED_POLICY_IDENTITY.policyId
    || policyVersion !== EXPECTED_POLICY_IDENTITY.policyVersion
    || policyStatus !== EXPECTED_POLICY_IDENTITY.policyStatus
    || digestAlgorithm !== EXPECTED_POLICY_IDENTITY.canonicalDigestAlgorithm
    || declaredDigest !== EXPECTED_POLICY_IDENTITY.canonicalDigest
    || surfaceRegistryVersion !== EXPECTED_POLICY_IDENTITY.surfaceRegistryVersion
    || computedDigest !== declaredDigest
    || policy.policyId !== policyId || policy.policyVersion !== policyVersion
    || policy.policyStatus !== policyStatus
    || policy.surfaceRegistryVersion !== surfaceRegistryVersion) {
    fail("SOURCE_POLICY_IDENTITY_MISMATCH", "源码 policy 身份或 canonical digest 不一致。");
  }
  const categoryIds = policy.riskCategories?.map((entry) => entry?.categoryId);
  const surfaceIds = policy.surfaceRegistry?.map((entry) => entry?.surfaceId);
  assertExactList(categoryIds, EXPECTED_CATEGORY_IDS, "RISK_CATEGORY_SET_MISMATCH", "八类风险类别");
  assertExactList(surfaceIds, EXPECTED_SURFACE_IDS, "EGRESS_SURFACE_SET_MISMATCH", "十六个 egress surface");
  if (policy.outputBoundary?.semanticCoverageComplete !== false
    || policy.outputBoundary?.unstructuredFreeTextSafetyEstablished !== false
    || policy.outputBoundary?.surfaceCallerAuthenticityEstablished !== false
    || policy.outputBoundary?.registeredSurfaceCallGraphClosureEstablished !== false
    || policy.integrationBoundary?.candidateCallSitesWiredToGate !== false
    || policy.integrationBoundary?.mainAppReachable !== false
    || policy.integrationBoundary?.targetSchema !== null
    || policy.integrationBoundary?.migrationId !== null
    || policy.integrationBoundary?.mutationEpochAvailable !== false
    || policy.integrityBoundary?.preImportIntrinsicIntegrityEstablished !== false
    || policy.integrityBoundary?.postImportIntrinsicHardeningOnly !== true
    || Object.entries(policy.authorityBoundary ?? {}).some(([key, value]) =>
      key === "independentExpertReviewsVerified" ? value !== 0 : value !== false)) {
    fail("SOURCE_FAIL_CLOSED_BOUNDARY_MISMATCH", "源码 policy 的 fail-closed 边界发生晋级或漂移。");
  }
  return deepFreeze({
    categoryIds: copyJson(categoryIds),
    categoryRegistryDigest: domainDigest(CATEGORY_DIGEST_DOMAIN, policy.riskCategories),
    policy: copyJson(policy),
    policyCanonicalDigest: computedDigest,
    surfaceIds: copyJson(surfaceIds),
    surfaceRegistryDigest: domainDigest(SURFACE_DIGEST_DOMAIN, policy.surfaceRegistry)
  });
}

async function readAndInspectCurrentSource(workspaceRoot) {
  const snapshot = await readStableWorkspaceFile(
    workspaceRoot,
    ZIWEI_HIGH_RISK_EXPRESSION_POLICY_SOURCE_RELATIVE_PATH,
    MAX_SOURCE_BYTES,
    {
      invalidCode: "SOURCE_ENDPOINT_INVALID",
      label: "紫微高风险表达 policy 源码",
      missingCode: "SOURCE_MISSING"
    }
  );
  return { inspection: inspectPolicySource(snapshot), snapshot };
}

function buildArtifact(source) {
  const policy = source.inspection.policy;
  const base = {
    admissionProjection: {
      activeAdmissionEffect: "none",
      admissionGatesSatisfied: 0,
      admissionGatesTotal: 8,
      candidateCallSitesWiredToGate: false,
      callgraphIntegrityEstablished: false,
      centralFourSystemRegistryUpdated: false,
      domainManifestUpdated: false,
      highRiskPolicyEstablished: false,
      highRiskPolicyGateSatisfied: false,
      policyArtifactAdmitted: false,
      preImportIntrinsicIntegrityEstablished: false,
      semanticCoverageComplete: false,
      sourceRequirementsLedgerUpdated: false
    },
    authorityBoundary: copyJson(policy.authorityBoundary),
    childId: CHILD_ID,
    doesNotEstablish: [
      "content_truth_or_domain_authority",
      "expert_identity_qualification_independence_or_opinion",
      "work_edition_carrier_rights_or_redistribution_permission",
      "candidate_call_site_wiring_or_callgraph_closure",
      "semantic_coverage_for_unstructured_free_text",
      "pre_import_intrinsic_integrity",
      "browser_runtime_pwa_service_worker_or_cross_browser_evidence",
      "release_readiness_deployment_rollback_or_public_release_authorization",
      "bazi_legacy_v13_or_target_schema_13_inheritance"
    ],
    evidenceAccounts: {
      browserRuntimeEvidenceVerified: false,
      contentTruthEstablished: false,
      engineeringSourceBindingEstablished: true,
      expertTruthEstablished: false,
      publicReleaseAuthorized: false,
      releaseReadinessEstablished: false,
      rightsLegalConclusionEstablished: false
    },
    observationBoundary: {
      abaExcluded: false,
      artifactAndSourceAtomicSnapshot: false,
      heldFileHandleReads: true,
      intervalMutationExcluded: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      pathEndpointRevalidated: true,
      sourceHashAndSemanticInspectionUseSameReadBuffer: true
    },
    policyBinding: {
      policyCanonicalDigest: source.inspection.policyCanonicalDigest,
      policyCanonicalDigestAlgorithm: EXPECTED_POLICY_IDENTITY.canonicalDigestAlgorithm,
      policyCanonicalDigestRecomputedFromStaticAst: true,
      policyId: policy.policyId,
      policyStatus: policy.policyStatus,
      policyVersion: policy.policyVersion,
      riskCategoryCount: source.inspection.categoryIds.length,
      riskCategoryIds: copyJson(source.inspection.categoryIds),
      riskCategoryRegistryDigest: source.inspection.categoryRegistryDigest,
      surfaceCount: source.inspection.surfaceIds.length,
      surfaceIds: copyJson(source.inspection.surfaceIds),
      surfaceRegistryDigest: source.inspection.surfaceRegistryDigest,
      surfaceRegistryVersion: policy.surfaceRegistryVersion
    },
    policyFailClosedBoundary: {
      candidateCallSitesWiredToGate: policy.integrationBoundary.candidateCallSitesWiredToGate,
      mainAppReachable: policy.integrationBoundary.mainAppReachable,
      packageExportsEmpty: policy.integrationBoundary.packageExportsEmpty,
      packagePrivate: policy.integrationBoundary.packagePrivate,
      postImportIntrinsicHardeningOnly: policy.integrityBoundary.postImportIntrinsicHardeningOnly,
      preImportIntrinsicIntegrityEstablished:
        policy.integrityBoundary.preImportIntrinsicIntegrityEstablished,
      productionImport: policy.integrationBoundary.productionImport,
      registeredSurfaceCallGraphClosureEstablished:
        policy.outputBoundary.registeredSurfaceCallGraphClosureEstablished,
      semanticCoverageComplete: policy.outputBoundary.semanticCoverageComplete,
      surfaceCallerAuthenticityEstablished: policy.outputBoundary.surfaceCallerAuthenticityEstablished,
      unstructuredFreeTextSafetyEstablished:
        policy.outputBoundary.unstructuredFreeTextSafetyEstablished
    },
    recordType: "ziwei_high_risk_expression_policy_draft_child",
    schemaVersion: "1.0.0",
    sourceBinding: {
      bytes: source.snapshot.size,
      path: source.snapshot.path,
      policySourceExecuted: false,
      rawHashAndSemanticInspectionUseSameReadBuffer: true,
      sha256: source.snapshot.sha256,
      staticAstInspectionOnly: true,
      surfaceSourceBodiesIndependentlyRehashed: false
    },
    status: "source_bound_non_authoritative_engineering_child_not_admitted",
    systemIdentity: {
      activeReleaseLineInherited: false,
      baziAuthorityInherited: false,
      contractSystemId: "ziwei",
      migrationId: null,
      productSystemId: "ziwei-doushu",
      releaseIdentity: null,
      targetSchema: null
    }
  };
  return { ...base, childDigest: domainDigest(CHILD_DIGEST_DOMAIN, base) };
}

function assertExactJson(actual, expected, code, message) {
  if (canonicalStringifyZiweiHighRiskExpressionPolicyDraft(actual)
    !== canonicalStringifyZiweiHighRiskExpressionPolicyDraft(expected)) {
    fail(code, message);
  }
}

function verifyArtifactShape(artifact) {
  if (!SHA256_PATTERN.test(artifact.childDigest ?? "")
    || computeZiweiHighRiskExpressionPolicyDraftDigest(artifact) !== artifact.childDigest) {
    fail("CHILD_DIGEST_MISMATCH", "紫微高风险表达 policy child 摘要无效。");
  }
  if (artifact.sourceBinding?.path !== EXPECTED_SOURCE_IDENTITY.path
    || artifact.sourceBinding?.bytes !== EXPECTED_SOURCE_IDENTITY.bytes
    || artifact.sourceBinding?.sha256 !== EXPECTED_SOURCE_IDENTITY.sha256
    || artifact.policyBinding?.policyId !== EXPECTED_POLICY_IDENTITY.policyId
    || artifact.policyBinding?.policyVersion !== EXPECTED_POLICY_IDENTITY.policyVersion
    || artifact.policyBinding?.policyStatus !== EXPECTED_POLICY_IDENTITY.policyStatus
    || artifact.policyBinding?.policyCanonicalDigest !== EXPECTED_POLICY_IDENTITY.canonicalDigest
    || artifact.policyBinding?.policyCanonicalDigestAlgorithm
      !== EXPECTED_POLICY_IDENTITY.canonicalDigestAlgorithm
    || artifact.policyBinding?.surfaceRegistryVersion
      !== EXPECTED_POLICY_IDENTITY.surfaceRegistryVersion) {
    fail("SOURCE_IDENTITY_MISMATCH", "child 与固定源码或 policy 身份脱离。");
  }
  assertExactList(
    artifact.policyBinding?.riskCategoryIds,
    EXPECTED_CATEGORY_IDS,
    "RISK_CATEGORY_SET_MISMATCH",
    "child 八类风险类别"
  );
  assertExactList(
    artifact.policyBinding?.surfaceIds,
    EXPECTED_SURFACE_IDS,
    "EGRESS_SURFACE_SET_MISMATCH",
    "child 十六个 egress surface"
  );
  const authorityPromoted = !artifact.authorityBoundary
    || Object.entries(artifact.authorityBoundary).some(([key, value]) =>
      key === "independentExpertReviewsVerified" ? value !== 0 : value !== false)
    || artifact.admissionProjection?.activeAdmissionEffect !== "none"
    || artifact.admissionProjection?.admissionGatesSatisfied !== 0
    || artifact.admissionProjection?.candidateCallSitesWiredToGate !== false
    || artifact.admissionProjection?.callgraphIntegrityEstablished !== false
    || artifact.admissionProjection?.centralFourSystemRegistryUpdated !== false
    || artifact.admissionProjection?.domainManifestUpdated !== false
    || artifact.admissionProjection?.highRiskPolicyEstablished !== false
    || artifact.admissionProjection?.highRiskPolicyGateSatisfied !== false
    || artifact.admissionProjection?.policyArtifactAdmitted !== false
    || artifact.admissionProjection?.preImportIntrinsicIntegrityEstablished !== false
    || artifact.admissionProjection?.semanticCoverageComplete !== false
    || artifact.admissionProjection?.sourceRequirementsLedgerUpdated !== false
    || artifact.policyFailClosedBoundary?.candidateCallSitesWiredToGate !== false
    || artifact.policyFailClosedBoundary?.mainAppReachable !== false
    || artifact.policyFailClosedBoundary?.preImportIntrinsicIntegrityEstablished !== false
    || artifact.policyFailClosedBoundary?.registeredSurfaceCallGraphClosureEstablished !== false
    || artifact.policyFailClosedBoundary?.semanticCoverageComplete !== false
    || artifact.policyFailClosedBoundary?.surfaceCallerAuthenticityEstablished !== false
    || artifact.policyFailClosedBoundary?.unstructuredFreeTextSafetyEstablished !== false
    || artifact.evidenceAccounts?.browserRuntimeEvidenceVerified !== false
    || artifact.evidenceAccounts?.contentTruthEstablished !== false
    || artifact.evidenceAccounts?.expertTruthEstablished !== false
    || artifact.evidenceAccounts?.publicReleaseAuthorized !== false
    || artifact.evidenceAccounts?.releaseReadinessEstablished !== false
    || artifact.evidenceAccounts?.rightsLegalConclusionEstablished !== false
    || artifact.observationBoundary?.abaExcluded !== false
    || artifact.observationBoundary?.artifactAndSourceAtomicSnapshot !== false
    || artifact.observationBoundary?.intervalMutationExcluded !== false
    || artifact.observationBoundary?.mutationEpochAvailable !== false
    || artifact.systemIdentity?.activeReleaseLineInherited !== false
    || artifact.systemIdentity?.baziAuthorityInherited !== false
    || artifact.systemIdentity?.migrationId !== null
    || artifact.systemIdentity?.releaseIdentity !== null
    || artifact.systemIdentity?.targetSchema !== null;
  if (authorityPromoted) {
    fail("AUTHORITY_PROMOTION_FORBIDDEN", "child 不得晋级任何 admission、authority、运行时或发布边界。");
  }
  if (artifact.policyBinding.riskCategoryCount !== EXPECTED_CATEGORY_IDS.length
    || artifact.policyBinding.surfaceCount !== EXPECTED_SURFACE_IDS.length
    || artifact.policyBinding.policyCanonicalDigestRecomputedFromStaticAst !== true
    || artifact.sourceBinding.rawHashAndSemanticInspectionUseSameReadBuffer !== true
    || artifact.sourceBinding.staticAstInspectionOnly !== true
    || artifact.sourceBinding.policySourceExecuted !== false
    || artifact.sourceBinding.surfaceSourceBodiesIndependentlyRehashed !== false
    || artifact.evidenceAccounts.engineeringSourceBindingEstablished !== true
    || artifact.observationBoundary.heldFileHandleReads !== true
    || artifact.observationBoundary.pathEndpointRevalidated !== true
    || artifact.observationBoundary.sourceHashAndSemanticInspectionUseSameReadBuffer !== true
    || artifact.observationBoundary.mutationEpochReceipt !== null
    || artifact.policyFailClosedBoundary.packageExportsEmpty !== true
    || artifact.policyFailClosedBoundary.packagePrivate !== true
    || artifact.policyFailClosedBoundary.postImportIntrinsicHardeningOnly !== true
    || artifact.policyFailClosedBoundary.productionImport !== "forbidden") {
    fail("BOUNDARY_MISMATCH", "child 的 source-bound 或 fail-closed 机械边界漂移。");
  }
}

export async function buildCurrentZiweiHighRiskExpressionPolicyDraft(workspaceRoot) {
  const source = await readAndInspectCurrentSource(workspaceRoot);
  const artifact = buildArtifact(source);
  verifyArtifactShape(artifact);
  return deepFreeze(copyJson(artifact));
}

export async function readZiweiHighRiskExpressionPolicyDraft(workspaceRoot) {
  const snapshot = await readStableWorkspaceFile(
    workspaceRoot,
    ZIWEI_HIGH_RISK_EXPRESSION_POLICY_DRAFT_RELATIVE_PATH,
    MAX_ARTIFACT_BYTES,
    {
      invalidCode: "CHILD_ENDPOINT_INVALID",
      label: "紫微高风险表达 policy child",
      missingCode: "CHILD_MISSING"
    }
  );
  const artifact = parseZiweiHighRiskExpressionPolicyDraftJsonBytes(snapshot.bytes);
  if (decodeStrictUtf8(snapshot.bytes, "紫微高风险表达 policy child")
    !== canonicalPrettyStringifyZiweiHighRiskExpressionPolicyDraft(artifact)) {
    fail("CHILD_MATERIALIZATION_MISMATCH", "child 不是唯一 canonical LF materialization。");
  }
  verifyArtifactShape(artifact);
  const expected = await buildCurrentZiweiHighRiskExpressionPolicyDraft(workspaceRoot);
  assertExactJson(
    artifact,
    expected,
    "CHILD_CURRENT_EXPECTATION_MISMATCH",
    "固定 child 与当前 policy 源码闭包不一致。"
  );
  return deepFreeze(copyJson(artifact));
}

export async function verifyZiweiHighRiskExpressionPolicyDraft(workspaceRoot, artifactInput) {
  assertPlainJson(artifactInput, "artifactInput");
  const artifact = copyJson(artifactInput);
  verifyArtifactShape(artifact);
  const expected = await buildCurrentZiweiHighRiskExpressionPolicyDraft(workspaceRoot);
  assertExactJson(
    artifact,
    expected,
    "CHILD_CURRENT_EXPECTATION_MISMATCH",
    "candidate child 与当前 policy 源码闭包不一致。"
  );
  return deepFreeze({
    activeAdmissionEffect: "none",
    admissionGatesSatisfied: 0,
    artifact: copyJson(expected),
    candidateCallSitesWiredToGate: false,
    childDigest: expected.childDigest,
    engineeringSourceBindingVerified: true,
    highRiskPolicyEstablished: false,
    highRiskPolicyGateSatisfied: false,
    policyCanonicalDigest: expected.policyBinding.policyCanonicalDigest,
    preImportIntrinsicIntegrityEstablished: false,
    publicReleaseAuthorized: false,
    riskCategoryCount: EXPECTED_CATEGORY_IDS.length,
    semanticCoverageComplete: false,
    status: expected.status,
    surfaceCount: EXPECTED_SURFACE_IDS.length
  });
}

export const ziweiHighRiskExpressionPolicyDraftTestOnly = Object.freeze({
  expectedCategoryIds: EXPECTED_CATEGORY_IDS,
  expectedPolicyIdentity: EXPECTED_POLICY_IDENTITY,
  expectedSourceIdentity: EXPECTED_SOURCE_IDENTITY,
  expectedSurfaceIds: EXPECTED_SURFACE_IDS,
  inspectPolicySource,
  readStableWorkspaceFile
});
