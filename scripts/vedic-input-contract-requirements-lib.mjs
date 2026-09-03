import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { TextDecoder, types as utilTypes } from "node:util";
import { parseExpression } from "@babel/parser";

export const VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH =
  "content/system-admission/vedic-input-contract-requirements.v1.json";

const VEDIC_BOUNDARY_ADR_RELATIVE_PATH =
  "docs/吠陀占星独立产品化ADR-0001-2026-08-26.md";
const VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH =
  "content/system-admission/vedic-input-contract-draft.v0.1.0.schema.json";
const LEDGER_CREATED_AT = "2026-08-29T00:00:00.000Z";
const LEDGER_DIGEST_DOMAIN = "hakimi.vedic.input-contract-requirements.v1";
const ADR_SEMANTIC_DIGEST_DOMAIN = "hakimi.vedic.independent-product-boundary-adr.v1";
const DRAFT_SEMANTIC_DIGEST_DOMAIN = "hakimi.vedic.input-contract-draft.semantic.v0.1.0";
const MAX_LEDGER_BYTES = 1_000_000;
const MAX_BOUND_ARTIFACT_BYTES = 2_000_000;
const CANONICAL_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const TYPED_ARRAY_PROTOTYPE = Object.getPrototypeOf(Uint8Array.prototype);
const TYPED_ARRAY_BUFFER_GETTER =
  Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "buffer").get;
const TYPED_ARRAY_BYTE_LENGTH_GETTER =
  Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "byteLength").get;
const ARRAY_BUFFER_RESIZABLE_GETTER =
  Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "resizable")?.get;
const UINT8_ARRAY_SET = Uint8Array.prototype.set;

const EXPECTED_ADR_RAW_IDENTITY = Object.freeze({
  path: VEDIC_BOUNDARY_ADR_RELATIVE_PATH,
  bytes: 4_531,
  sha256: "0e9b81505abb963b4d64426338b8071cd8a211eed8d02fe76065fada335dce63"
});

const EXPECTED_DRAFT_RAW_IDENTITY = Object.freeze({
  path: VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH,
  bytes: 16_529,
  sha256: "4899e8fdf267a44e401295f23e11e2504e45f8e2f731c6be9b8ad1435e8dbf69"
});

const ADR_SEMANTIC_IDENTITY = Object.freeze({
  authorityStatus: "not-authoritative",
  boundaryId: "hakimi.vedic.independent-product-boundary/1.0.0",
  decisionStatus: "accepted-research-boundary",
  integrationStatus: "not-integrated",
  productStatus: "research-only",
  publicReleaseAuthorized: false,
  rereviewRequirementIds: Object.freeze([
    "own_input_fact_and_rule_drafts",
    "runtime_and_bundle_size_proposal",
    "three_layer_source_rights_ledger",
    "two_independent_real_expert_review_plan",
    "independent_storage_backup_recovery_and_rollback_design",
    "independent_browser_gate_and_release_evidence_design",
    "owner_scope_license_and_deployment_decision"
  ])
});

const EXPECTED_ADR_SEMANTIC_DIGEST =
  "1a71b363132b0d61298f53f7e14eb77d58a3eb3f7d649d8d3c8f42fd1acd1a89";

const ADR_REQUIRED_MARKERS = Object.freeze([
  "# ADR-0001：吠陀占星保持独立研究、暂不集成",
  "- 状态：accepted-research-boundary",
  "- productStatus：`research-only`",
  "- integrationStatus：`not-integrated`",
  "- authorityStatus：`not-authoritative`",
  "- publicReleaseAuthorized：`false`",
  "- 原始民用出生时间、地点、IANA 时区、DST 歧义和时间不确定区间；",
  "- UTC 转换、历书/星历版本与时间尺度；",
  "- sidereal zodiac 与 ayanamsa；",
  "- Rahu/Ketu 采用 mean 还是 true；",
  "- Bhava/宫位口径；",
  "- 出生时间扰动的候选集合和跃迁点。",
  "任何缺失或歧义都必须结构化阻断，不能由默认值或生成模型补猜。",
  "不得借用八字、紫微或西洋的工程、来源、专家或权利证据为吠陀体系背书。",
  "在独立准入门关闭前，不创建占位计算结果、空数据库分区、伪成功回执、用户可点击入口或“综合命运”输出。"
]);

const REQUIREMENT_SPECS = Object.freeze([
  Object.freeze({ requirementId: "civil_calendar_and_date", requirementClass: "input_declaration" }),
  Object.freeze({ requirementId: "local_wall_time_and_precision", requirementClass: "input_declaration" }),
  Object.freeze({ requirementId: "birth_time_uncertainty_interval_or_candidates", requirementClass: "input_declaration" }),
  Object.freeze({ requirementId: "place_coordinates_and_precision", requirementClass: "input_declaration" }),
  Object.freeze({ requirementId: "iana_time_zone_and_tzdb_identity", requirementClass: "input_declaration" }),
  Object.freeze({ requirementId: "dst_gap_overlap_resolution", requirementClass: "input_declaration" }),
  Object.freeze({ requirementId: "utc_conversion_and_time_scale", requirementClass: "calculation_policy_declaration" }),
  Object.freeze({ requirementId: "ephemeris_identity_version_and_coverage", requirementClass: "calculation_policy_declaration" }),
  Object.freeze({ requirementId: "sidereal_zodiac_declaration", requirementClass: "calculation_policy_declaration" }),
  Object.freeze({ requirementId: "ayanamsa_identity_and_version", requirementClass: "calculation_policy_declaration" }),
  Object.freeze({ requirementId: "rahu_ketu_mode", requirementClass: "calculation_policy_declaration" }),
  Object.freeze({ requirementId: "bhava_house_definition", requirementClass: "calculation_policy_declaration" }),
  Object.freeze({
    requirementId: "birth_time_perturbation_candidates_and_transition_points",
    requirementClass: "calculation_policy_declaration"
  })
]);

const DOES_NOT_ESTABLISH = Object.freeze([
  "formally_admitted_or_semantically_selected_vedic_input_contract",
  "input_normalization_or_acceptance_capability",
  "utc_dst_time_scale_or_ephemeris_correctness",
  "ayanamsa_node_house_or_perturbation_policy_selection",
  "sample_real_or_synthetic_person_input",
  "fact_producer_projector_deterministic_facts_or_fact_receipt",
  "versioned_ruleset_or_domain_manifest",
  "source_candidate_body_quote_locator_or_binding_inventory",
  "license_rights_or_legal_conclusion",
  "expert_identity_credentials_independence_opinion_or_truth",
  "artifact_authenticity_digital_signature_or_signer_identity",
  "cross_system_authority_inheritance_or_concept_equivalence",
  "browser_runtime_storage_backup_recovery_or_deployment_evidence",
  "mutation_epoch_cross_file_atomic_snapshot_interval_mutation_or_aba_exclusion",
  "formal_admission_release_readiness_or_public_release_authorization"
]);

export class VedicInputContractRequirementsError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "VedicInputContractRequirementsError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new VedicInputContractRequirementsError(code, message);
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function capturePassiveJsonValue(value, state, depth) {
  if (depth > 64) fail("INPUT_DEPTH_EXCEEDED", "吠陀输入要求账对象 API 超过最大深度。");
  state.nodes += 1;
  if (state.nodes > 200_000) fail("INPUT_NODE_LIMIT_EXCEEDED", "吠陀输入要求账对象 API 超过节点上限。");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      fail("INPUT_VALUE_INVALID", "吠陀输入要求账对象 API 含非规范 JSON 数值。");
    }
    return value;
  }
  if (typeof value === "string") {
    state.textCharacters += value.length;
    if (state.textCharacters > 2_000_000) {
      fail("INPUT_TEXT_LIMIT_EXCEEDED", "吠陀输入要求账对象 API 超过文本上限。");
    }
    return value;
  }
  if (typeof value !== "object") fail("INPUT_VALUE_INVALID", "吠陀输入要求账对象 API 只接受 JSON 数据值。");
  if (utilTypes.isProxy(value)) fail("INPUT_PROXY_FORBIDDEN", "吠陀输入要求账对象 API 不接受 Proxy。");
  if (state.active.has(value)) fail("INPUT_CYCLE_FORBIDDEN", "吠陀输入要求账对象 API 不接受循环引用。");
  state.active.add(value);
  try {
    let array;
    let prototype;
    let descriptors;
    try {
      array = Array.isArray(value);
      prototype = Object.getPrototypeOf(value);
      descriptors = Object.getOwnPropertyDescriptors(value);
    } catch (cause) {
      throw new VedicInputContractRequirementsError(
        "INPUT_OBJECT_UNSAFE",
        "吠陀输入要求账对象 API 无法安全捕获对象描述符。",
        { cause }
      );
    }
    const descriptorKeys = Reflect.ownKeys(descriptors);
    if (descriptorKeys.some((key) => typeof key === "symbol")) {
      fail("INPUT_SYMBOL_FORBIDDEN", "吠陀输入要求账对象 API 不接受 Symbol 属性。");
    }
    if (array) {
      if (prototype !== Array.prototype) fail("INPUT_PROTOTYPE_INVALID", "吠陀输入要求账对象 API 数组原型无效。");
      const lengthDescriptor = descriptors.length;
      const length = lengthDescriptor?.value;
      if (lengthDescriptor?.get || lengthDescriptor?.set
        || !Number.isSafeInteger(length) || length < 0 || length > 200_000) {
        fail("INPUT_ARRAY_INVALID", "吠陀输入要求账对象 API 数组长度无效。");
      }
      const allowedKeys = new Set(["length", ...Array.from({ length }, (_entry, index) => String(index))]);
      if (descriptorKeys.some((key) => !allowedKeys.has(key))) {
        fail("INPUT_ARRAY_INVALID", "吠陀输入要求账对象 API 数组含额外属性。");
      }
      const result = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
          fail("INPUT_ARRAY_INVALID", "吠陀输入要求账对象 API 不接受稀疏数组或访问器元素。");
        }
        result.push(capturePassiveJsonValue(descriptor.value, state, depth + 1));
      }
      return result;
    }
    if (prototype !== Object.prototype) {
      fail("INPUT_PROTOTYPE_INVALID", "吠陀输入要求账对象 API 只接受普通 JSON 对象。");
    }
    const entries = [];
    for (const key of descriptorKeys) {
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
        fail("INPUT_ACCESSOR_FORBIDDEN", "吠陀输入要求账对象 API 不接受访问器或不可枚举字段。");
      }
      entries.push([key, capturePassiveJsonValue(descriptor.value, state, depth + 1)]);
    }
    return Object.fromEntries(entries);
  } finally {
    state.active.delete(value);
  }
}

function capturePassiveJsonSnapshot(value) {
  return capturePassiveJsonValue(value, {
    nodes: 0,
    textCharacters: 0,
    active: new WeakSet()
  }, 0);
}

function deepFreezeJson(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreezeJson(child);
  return Object.freeze(value);
}

function canonicalValue(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.keys(value).sort(compareCodeUnits).map((key) => [key, canonicalValue(value[key])])
    );
  }
  fail("NON_CANONICAL_JSON", "吠陀输入要求账只接受有限规范 JSON 值。");
}

export function canonicalStringifyVedicInputContractRequirements(value) {
  return JSON.stringify(canonicalValue(capturePassiveJsonSnapshot(value)));
}

export function canonicalPrettyStringifyVedicInputContractRequirements(value) {
  return `${JSON.stringify(canonicalValue(capturePassiveJsonSnapshot(value)), null, 2)}\n`;
}

function domainSeparatedDigest(domain, value) {
  return createHash("sha256")
    .update(domain, "utf8")
    .update("\0", "utf8")
    .update(canonicalStringifyVedicInputContractRequirements(value), "utf8")
    .digest("hex");
}

export function computeVedicInputContractRequirementsDigest(ledgerInput) {
  const ledger = capturePassiveJsonSnapshot(ledgerInput);
  const { ledgerDigest: _ledgerDigest, ...unsigned } = ledger;
  return domainSeparatedDigest(LEDGER_DIGEST_DOMAIN, unsigned);
}

function walkAst(root, visitor) {
  const stack = [root];
  const seen = new Set();
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === null || typeof node !== "object" || seen.has(node)) continue;
    seen.add(node);
    if (typeof node.type === "string") visitor(node);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (let index = value.length - 1; index >= 0; index -= 1) stack.push(value[index]);
      } else if (value !== null && typeof value === "object") {
        stack.push(value);
      }
    }
  }
}

export function parseVedicInputContractRequirementsJsonBytes(
  bytes,
  label = "吠陀输入要求账 JSON",
  maxBytes = MAX_LEDGER_BYTES
) {
  if (utilTypes.isProxy(bytes)
    || !utilTypes.isUint8Array(bytes)
    || typeof TYPED_ARRAY_BUFFER_GETTER !== "function"
    || typeof TYPED_ARRAY_BYTE_LENGTH_GETTER !== "function") {
    fail("JSON_INVALID", `${label} 必须是被动可检验的 Uint8Array 字节。`);
  }
  let backingBuffer;
  let byteLength;
  try {
    backingBuffer = Reflect.apply(TYPED_ARRAY_BUFFER_GETTER, bytes, []);
    byteLength = Reflect.apply(TYPED_ARRAY_BYTE_LENGTH_GETTER, bytes, []);
  } catch (cause) {
    throw new VedicInputContractRequirementsError("JSON_INVALID", `${label} 的字节内建身份无效。`, { cause });
  }
  if (utilTypes.isSharedArrayBuffer(backingBuffer)) {
    fail("JSON_INVALID", `${label} 不接受 SharedArrayBuffer 字节。`);
  }
  if (!utilTypes.isArrayBuffer(backingBuffer)) {
    fail("JSON_INVALID", `${label} 的字节 backing 无效。`);
  }
  if (typeof ARRAY_BUFFER_RESIZABLE_GETTER === "function") {
    let resizable;
    try {
      resizable = Reflect.apply(ARRAY_BUFFER_RESIZABLE_GETTER, backingBuffer, []);
    } catch (cause) {
      throw new VedicInputContractRequirementsError("JSON_INVALID", `${label} 的 ArrayBuffer 状态不可读取。`, { cause });
    }
    if (resizable) fail("JSON_INVALID", `${label} 不接受可变 ArrayBuffer 字节。`);
  }
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0 || byteLength > maxBytes) {
    fail("JSON_TOO_LARGE", `${label} 超过输入上限。`);
  }
  const capturedBytes = new Uint8Array(byteLength);
  try {
    Reflect.apply(UINT8_ARRAY_SET, capturedBytes, [bytes]);
  } catch (cause) {
    throw new VedicInputContractRequirementsError("JSON_INVALID", `${label} 的 Uint8Array 无法按内部槽复制。`, { cause });
  }
  if (capturedBytes.byteLength >= 3
    && capturedBytes[0] === 0xef && capturedBytes[1] === 0xbb && capturedBytes[2] === 0xbf) {
    fail("JSON_BOM_FORBIDDEN", `${label} 不得包含 UTF-8 BOM。`);
  }
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(capturedBytes);
  } catch (cause) {
    throw new VedicInputContractRequirementsError("JSON_UTF8_INVALID", `${label} 不是严格 UTF-8。`, { cause });
  }
  if (!source.trim()) fail("JSON_INVALID", `${label} 为空。`);
  let expression;
  try {
    expression = parseExpression(source.trim(), {
      sourceFilename: "vedic-input-contract-requirements.json",
      sourceType: "script",
      errorRecovery: false,
      attachComment: false
    });
  } catch (cause) {
    throw new VedicInputContractRequirementsError("JSON_INVALID", `${label} 不能按严格 JSON 检查。`, { cause });
  }
  walkAst(expression, (node) => {
    if (node.type !== "ObjectExpression") return;
    const keys = new Set();
    for (const property of node.properties) {
      if (property.type !== "ObjectProperty" || property.computed || property.key?.type !== "StringLiteral") {
        fail("JSON_INVALID", `${label} 含非 JSON 对象属性。`);
      }
      if (keys.has(property.key.value)) fail("JSON_DUPLICATE_KEY", `${label} 含重复对象键。`);
      keys.add(property.key.value);
    }
  });
  try {
    const parsed = JSON.parse(source);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      fail("JSON_INVALID", `${label} 必须是 JSON 对象。`);
    }
    return parsed;
  } catch (cause) {
    if (cause instanceof VedicInputContractRequirementsError) throw cause;
    throw new VedicInputContractRequirementsError("JSON_INVALID", `${label} 不是有效 JSON。`, { cause });
  }
}

function safeWorkspaceFile(workspaceRoot, relativePath) {
  const segments = typeof relativePath === "string" ? relativePath.split("/") : [];
  if (typeof relativePath !== "string" || relativePath.length < 1 || relativePath.length > 300
    || relativePath.includes("\0") || relativePath.includes("\\") || relativePath.startsWith("/")
    || path.posix.normalize(relativePath) !== relativePath
    || segments.some((segment) => segment === "" || segment === "." || segment === ".." || segment.includes(":"))) {
    fail("UNSAFE_ARTIFACT_PATH", "吠陀输入要求账文件路径不安全。");
  }
  const root = path.resolve(workspaceRoot);
  const absolute = path.resolve(root, ...segments);
  const relative = path.relative(root, absolute);
  if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    fail("UNSAFE_ARTIFACT_PATH", "吠陀输入要求账文件路径越界。");
  }
  return absolute;
}

function isSameOrWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (
    relative !== ".."
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative)
  );
}

function sameFileEndpoint(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.nlink === right.nlink
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

async function capturePlainDirectoryChain(workspaceRoot, absolutePath, invalidCode, label) {
  const root = path.resolve(workspaceRoot);
  const targetDirectory = path.dirname(path.resolve(absolutePath));
  if (!isSameOrWithin(root, targetDirectory)) fail(invalidCode, `${label} 的目录链越出工作区。`);
  const relative = path.relative(root, targetDirectory);
  const segments = relative === "" ? [] : relative.split(path.sep);
  const endpoints = [];
  let cursor = root;
  for (const segment of [null, ...segments]) {
    if (segment !== null) cursor = path.join(cursor, segment);
    const metadata = await lstat(cursor, { bigint: true });
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
      fail(invalidCode, `${label} 的目录链不能包含符号链接、junction 或特殊端点。`);
    }
    const resolvedPath = await realpath(cursor);
    if (endpoints.length > 0 && !isSameOrWithin(endpoints[0].resolvedPath, resolvedPath)) {
      fail(invalidCode, `${label} 的目录链 realpath 越出工作区。`);
    }
    endpoints.push(Object.freeze({ absolutePath: cursor, resolvedPath, metadata }));
  }
  return Object.freeze(endpoints);
}

function sameDirectoryChain(left, right) {
  return left.length === right.length && left.every((entry, index) => {
    const other = right[index];
    return other !== undefined
      && entry.absolutePath === other.absolutePath
      && entry.resolvedPath === other.resolvedPath
      && sameFileEndpoint(entry.metadata, other.metadata);
  });
}

async function readAtMost(handle, maxBytes, invalidCode, label) {
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
  if (total > maxBytes) fail(invalidCode, `${label} 超过输入上限。`);
  return Buffer.concat(chunks, total);
}

async function readStableWorkspaceFile(
  workspaceRoot,
  relativePath,
  maxBytes,
  { missingCode, invalidCode, label }
) {
  const absolute = safeWorkspaceFile(workspaceRoot, relativePath);
  let before;
  let actual;
  let directoryChainBefore;
  try {
    directoryChainBefore = await capturePlainDirectoryChain(workspaceRoot, absolute, invalidCode, label);
    [before, actual] = await Promise.all([lstat(absolute, { bigint: true }), realpath(absolute)]);
  } catch (cause) {
    if (cause instanceof VedicInputContractRequirementsError) throw cause;
    throw new VedicInputContractRequirementsError(missingCode, `${label} 不存在。`, { cause });
  }
  const root = directoryChainBefore[0].resolvedPath;
  if (!isSameOrWithin(root, actual) || before.isSymbolicLink() || !before.isFile()
    || before.nlink !== 1n || before.size <= 0n || before.size > BigInt(maxBytes)) {
    fail(invalidCode, `${label} 必须是工作区内独立普通小文件。`);
  }
  const noFollow = typeof fsConstants.O_NOFOLLOW === "number" ? fsConstants.O_NOFOLLOW : 0;
  const handle = await open(actual, fsConstants.O_RDONLY | noFollow);
  try {
    const opened = await handle.stat({ bigint: true });
    if (!opened.isFile() || opened.nlink !== 1n || !sameFileEndpoint(before, opened)) {
      fail(invalidCode, `${label} 在打开前发生身份换绑。`);
    }
    const bytes = await readAtMost(handle, maxBytes, invalidCode, label);
    const [afterHandle, afterPath, actualAfter, directoryChainAfter] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(absolute, { bigint: true }),
      realpath(absolute),
      capturePlainDirectoryChain(workspaceRoot, absolute, invalidCode, label)
    ]);
    if (afterPath.isSymbolicLink() || !afterPath.isFile() || afterPath.nlink !== 1n
      || BigInt(bytes.byteLength) !== opened.size || !sameFileEndpoint(opened, afterHandle)
      || !sameFileEndpoint(opened, afterPath) || actualAfter !== actual
      || !sameDirectoryChain(directoryChainBefore, directoryChainAfter)) {
      fail(invalidCode, `${label} 在读取端点之间发生变化。`);
    }
    return Object.freeze({
      bytes,
      size: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex")
    });
  } finally {
    await handle.close();
  }
}

function decodeStrictUtf8(bytes, label) {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail("BOUND_ARTIFACT_BOM_FORBIDDEN", `${label} 不得包含 UTF-8 BOM。`);
  }
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (!text.trim()) fail("BOUND_ARTIFACT_INVALID", `${label} 为空。`);
    return text;
  } catch (cause) {
    if (cause instanceof VedicInputContractRequirementsError) throw cause;
    throw new VedicInputContractRequirementsError("BOUND_ARTIFACT_UTF8_INVALID", `${label} 不是严格 UTF-8。`, { cause });
  }
}

function canonicalUtc(value) {
  if (typeof value !== "string" || !CANONICAL_UTC_PATTERN.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function exactJson(left, right) {
  return canonicalStringifyVedicInputContractRequirements(left)
    === canonicalStringifyVedicInputContractRequirements(right);
}

function requireExactRawIdentity(snapshot, expected, label) {
  if (snapshot.size !== expected.bytes || snapshot.sha256 !== expected.sha256) {
    fail("BOUND_ARTIFACT_IDENTITY_MISMATCH", `${label} 原始字节身份漂移。`);
  }
}

function adrSemanticIdentityProjection() {
  return {
    authorityStatus: ADR_SEMANTIC_IDENTITY.authorityStatus,
    boundaryId: ADR_SEMANTIC_IDENTITY.boundaryId,
    decisionStatus: ADR_SEMANTIC_IDENTITY.decisionStatus,
    integrationStatus: ADR_SEMANTIC_IDENTITY.integrationStatus,
    productStatus: ADR_SEMANTIC_IDENTITY.productStatus,
    publicReleaseAuthorized: ADR_SEMANTIC_IDENTITY.publicReleaseAuthorized,
    rereviewRequirementIds: [...ADR_SEMANTIC_IDENTITY.rereviewRequirementIds]
  };
}

function verifyAdrSnapshot(snapshot) {
  requireExactRawIdentity(snapshot, EXPECTED_ADR_RAW_IDENTITY, "吠陀产品边界 ADR");
  const text = decodeStrictUtf8(snapshot.bytes, "吠陀产品边界 ADR");
  for (const marker of ADR_REQUIRED_MARKERS) {
    if (!text.includes(marker)) fail("ADR_SEMANTIC_MISMATCH", "吠陀产品边界 ADR 缺少批准语义标记。");
  }
  const projection = adrSemanticIdentityProjection();
  const semanticDigest = domainSeparatedDigest(ADR_SEMANTIC_DIGEST_DOMAIN, projection);
  if (semanticDigest !== EXPECTED_ADR_SEMANTIC_DIGEST) {
    fail("ADR_SEMANTIC_MISMATCH", "吠陀产品边界 ADR 语义身份无效。");
  }
  return Object.freeze({ projection, semanticDigest });
}

function inspectDraftSchemaKeywords(value) {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) inspectDraftSchemaKeywords(item);
    return;
  }
  if (Object.hasOwn(value, "default") || Object.hasOwn(value, "examples") || Object.hasOwn(value, "example")) {
    fail("DRAFT_SCHEMA_SEMANTIC_MISMATCH", "吠陀输入合同草案不得包含 default 或 example(s)。");
  }
  if (Object.hasOwn(value, "$ref")
    && (typeof value.$ref !== "string" || !value.$ref.startsWith("#/"))) {
    fail("DRAFT_SCHEMA_SEMANTIC_MISMATCH", "吠陀输入合同草案不得包含外部 $ref。");
  }
  for (const child of Object.values(value)) inspectDraftSchemaKeywords(child);
}

function draftSemanticIdentityProjection(schema) {
  return {
    boundary: schema["x-hakimiBoundary"],
    contractVersion: schema.properties.contractVersion.const,
    properties: schema.properties,
    required: schema.required,
    rootAdditionalProperties: schema.additionalProperties,
    rootType: schema.type,
    schemaId: schema.$id,
    schemaStandard: schema.$schema
  };
}

function verifyDraftSchemaSnapshot(snapshot) {
  requireExactRawIdentity(snapshot, EXPECTED_DRAFT_RAW_IDENTITY, "吠陀输入合同草案");
  const schema = parseVedicInputContractRequirementsJsonBytes(
    snapshot.bytes,
    "吠陀输入合同草案 JSON Schema",
    MAX_BOUND_ARTIFACT_BYTES
  );
  if (canonicalPrettyStringifyVedicInputContractRequirements(schema)
    !== new TextDecoder("utf-8", { fatal: true }).decode(snapshot.bytes)) {
    fail("DRAFT_SCHEMA_MATERIALIZATION_MISMATCH", "吠陀输入合同草案不是批准的 canonical materialization。");
  }
  inspectDraftSchemaKeywords(schema);
  const requirementIds = REQUIREMENT_SPECS.map((entry) => entry.requirementId);
  const required = ["contractVersion", ...requirementIds];
  const propertyKeys = Object.keys(schema.properties ?? {}).sort(compareCodeUnits);
  const expectedPropertyKeys = [...required].sort(compareCodeUnits);
  const boundary = schema["x-hakimiBoundary"];
  if (schema.$id !== "urn:hakimi:vedic:input-contract-draft:0.1.0"
    || schema.$schema !== "https://json-schema.org/draft/2020-12/schema"
    || schema.type !== "object" || schema.additionalProperties !== false
    || schema.title !== "Hakimi Vedic input contract draft 0.1.0"
    || !exactJson(schema.required, required)
    || !exactJson(propertyKeys, expectedPropertyKeys)
    || !exactJson(schema.properties.contractVersion, { const: "hakimi.vedic.input/0.1-draft" })
    || requirementIds.some((requirementId) => {
      const property = schema.properties[requirementId];
      return !property || typeof property !== "object" || Array.isArray(property);
    })
    || boundary?.artifactRole !== "project_authored_isolated_input_contract_draft"
    || boundary.schemaStatus !== "isolated_contract_draft"
    || boundary.productStatus !== "research-only"
    || boundary.integrationStatus !== "not-integrated"
    || boundary.authorityStatus !== "not-authoritative"
    || boundary.structuralPrecheckOnly !== true
    || boundary.structuralPrecheckCountsAsAcceptance !== false
    || boundary.inputAccepted !== false
    || boundary.acceptanceCapability !== false
    || boundary.normalizationCapability !== false
    || boundary.factReceiptCapability !== false
    || boundary.successReceiptCapability !== false
    || boundary.inputAcceptanceReceiptIssued !== false
    || boundary.factReceiptIssued !== false
    || boundary.successReceiptIssued !== false
    || boundary.inputContractGateSatisfied !== false
    || boundary.countsTowardAdmission !== false
    || boundary.requirementsResolved !== 0
    || boundary.requirementSelectionsIncluded !== 0
    || boundary.inputInstancesIncluded !== 0
    || boundary.acceptedInputsIncluded !== 0
    || boundary.realPersonInputsIncluded !== 0
    || boundary.sampleInputsIncluded !== 0
    || boundary.syntheticPersonInputsIncluded !== 0
    || boundary.baziAuthorityInherited !== false
    || boundary.domainAuthorityAuthorized !== false
    || boundary.expertClaimsAuthorized !== false
    || boundary.formalAdmissionAuthorized !== false
    || boundary.publicDeploymentAuthorized !== false
    || boundary.publicReleaseAuthorized !== false
    || boundary.releaseReady !== false
    || boundary.rightsEstablished !== false
    || boundary.authenticityEstablished !== false
    || !exactJson(boundary.baziArtifactRefs, [])
    || !exactJson(boundary.externalSourceRefs, [])
    || boundary.productBoundaryAdr?.path !== EXPECTED_ADR_RAW_IDENTITY.path
    || boundary.productBoundaryAdr?.bytes !== EXPECTED_ADR_RAW_IDENTITY.bytes
    || boundary.productBoundaryAdr?.sha256 !== EXPECTED_ADR_RAW_IDENTITY.sha256
    || boundary.productBoundaryAdr?.rawHashAndSemanticInspectionUseSameBuffer !== true) {
    fail("DRAFT_SCHEMA_SEMANTIC_MISMATCH", "吠陀输入合同草案结构或失败关闭边界无效。");
  }
  const projection = draftSemanticIdentityProjection(schema);
  return Object.freeze({
    projection,
    semanticDigest: domainSeparatedDigest(DRAFT_SEMANTIC_DIGEST_DOMAIN, projection)
  });
}

function emptyRequirement(spec, index) {
  return {
    artifactRefs: [`${VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH}#/properties/${spec.requirementId}`],
    defaultValue: null,
    evidenceRefs: [],
    expertRefs: [],
    instanceValues: [],
    order: index + 1,
    requirementClass: spec.requirementClass,
    requirementId: spec.requirementId,
    requirementState: "draft_shape_defined_value_unselected",
    rightsRefs: [],
    selectedValue: null,
    sourceRefs: []
  };
}

export async function buildCurrentVedicInputContractRequirementsLedger(workspaceRoot) {
  const [adrSnapshot, draftSnapshot] = await Promise.all([
    readStableWorkspaceFile(
      workspaceRoot,
      VEDIC_BOUNDARY_ADR_RELATIVE_PATH,
      MAX_BOUND_ARTIFACT_BYTES,
      {
        missingCode: "ADR_MISSING",
        invalidCode: "ADR_ENDPOINT_INVALID",
        label: "吠陀产品边界 ADR"
      }
    ),
    readStableWorkspaceFile(
      workspaceRoot,
      VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH,
      MAX_BOUND_ARTIFACT_BYTES,
      {
        missingCode: "DRAFT_SCHEMA_MISSING",
        invalidCode: "DRAFT_SCHEMA_ENDPOINT_INVALID",
        label: "吠陀输入合同草案"
      }
    )
  ]);
  const adrSemantic = verifyAdrSnapshot(adrSnapshot);
  const draftSemantic = verifyDraftSchemaSnapshot(draftSnapshot);
  const requirements = REQUIREMENT_SPECS.map(emptyRequirement);
  const unsigned = {
    authorityBoundary: {
      domainAuthorityAuthorized: false,
      expertClaimsAuthorized: false,
      factReceiptIssued: false,
      formalAdmissionAuthorized: false,
      inputContractAccepted: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      releaseReady: false
    },
    boundaryBindings: {
      bindingDirection: "requirements_to_draft_and_adr_only",
      inputContractDraft: {
        artifactRole: "project_authored_isolated_input_contract_draft",
        bytes: draftSnapshot.size,
        path: VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH,
        rawHashAndSemanticInspectionUseSameBuffer: true,
        schemaSemanticDigest: draftSemantic.semanticDigest,
        schemaStatus: "isolated_contract_draft",
        sha256: draftSnapshot.sha256
      },
      productBoundaryAdr: {
        bytes: adrSnapshot.size,
        path: VEDIC_BOUNDARY_ADR_RELATIVE_PATH,
        rawHashAndSemanticInspectionUseSameBuffer: true,
        semanticIdentity: {
          ...adrSemantic.projection,
          semanticDigest: adrSemantic.semanticDigest
        },
        sha256: adrSnapshot.sha256
      }
    },
    createdAt: LEDGER_CREATED_AT,
    currentInstances: {
      counts: {
        acceptedInputs: 0,
        factReceipts: 0,
        inputAcceptanceReceipts: 0,
        inputCandidates: 0,
        inputContractArtifacts: 1,
        inputRejectionReceipts: 0,
        normalizationReceipts: 0,
        realPersonInputs: 0,
        sampleInputs: 0,
        syntheticPersonInputs: 0,
        timeResolutionReceipts: 0
      },
      factReceipts: [],
      inputAcceptanceReceipts: [],
      inputCandidates: [],
      inputContractArtifacts: [{
        artifactRole: "project_authored_isolated_input_contract_draft",
        bytes: draftSnapshot.size,
        path: VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH,
        rawHashAndSemanticInspectionUseSameBuffer: true,
        schemaSemanticDigest: draftSemantic.semanticDigest,
        schemaStatus: "isolated_contract_draft",
        sha256: draftSnapshot.sha256
      }],
      inputRejectionReceipts: [],
      normalizationReceipts: [],
      timeResolutionReceipts: []
    },
    doesNotEstablish: [...DOES_NOT_ESTABLISH],
    evidenceLedger: {
      browserRuntimeEvidence: "not_assessed",
      contentTruth: "not_established",
      engineeringIdentity: "isolated_input_contract_draft_shape_and_zero_instance_boundary_only",
      expertTruth: "not_established",
      publicReleaseAuthorization: "not_authorized",
      releaseReadiness: "not_ready",
      rightsLegalConclusion: "not_established"
    },
    expertBoundary: {
      credentialsVerified: 0,
      expertOpinionIds: [],
      expertReviewBundle: "absent",
      expertTruthEstablished: false,
      identitiesVerified: 0,
      independentExpertReviewsVerified: 0,
      independentExpertsRequired: 2,
      opinionsVerified: 0,
      reviewerIds: []
    },
    failClosedInvariants: {
      crossSystemFallbackAccepted: false,
      defaultInference: "forbidden",
      generativeModelInference: "forbidden",
      missingOrAmbiguousInput: "reject_without_contract_or_fact_receipt",
      partialFactsPersisted: false
    },
    integrityBoundary: {
      authenticityEstablished: false,
      digestAlgorithm: "SHA-256",
      digestDomain: LEDGER_DIGEST_DOMAIN,
      digestIsDigitalSignature: false,
      digitalSignature: null,
      signerIdentity: null
    },
    ledgerId: "hakimi.vedic.input-contract-requirements/1.0.0",
    observationBoundary: {
      abaExcluded: false,
      boundArtifactHashAndInspectionUseSameReadBuffer: true,
      draftAndRequirementsAtomicSnapshot: false,
      crossFileAtomicSnapshot: false,
      endpointSnapshotOnly: true,
      heldFileHandleReads: true,
      intervalMutationExcluded: false,
      ledgerHashAndParseUseSameReadBuffer: true,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      pathEndpointRevalidated: true,
      plainDirectoryChainRequired: true
    },
    productBoundary: {
      domainManifest: "absent",
      factContract: "absent",
      factProducer: "absent",
      inputContract: "isolated_contract_draft",
      migrationId: null,
      mutationEpochCapability: "absent_no_admitted_product_schema",
      productSurface: "absent",
      projector: "absent",
      releaseIdentity: null,
      targetSchema: null,
      versionedRuleset: "absent"
    },
    recordType: "vedic_input_contract_requirements_v1",
    requirementInventory: {
      inputContractArtifactPresent: true,
      inputContractGateSatisfied: false,
      requirements,
      requirementsDraftCovered: requirements.length,
      requirementsDefined: requirements.length,
      requirementsInventoryDefined: true,
      requirementsResolved: 0
    },
    schemaVersion: "1.0.0",
    sourceRightsBoundary: {
      bindingFrozenVerified: 0,
      bindingRequired: null,
      bindingRequirementsInventoryDefined: false,
      exactLocatorRefs: [],
      exactQuoteRefs: [],
      licenseEstablished: false,
      licenseEvidenceRefs: [],
      rightsEstablished: false,
      rightsEvidenceRefs: [],
      sourceBindingEstablished: false,
      sourceBodyRefs: [],
      sourceCandidateIds: []
    },
    status: "input_contract_draft_present_zero_instances_not_admitted",
    systemIdentity: {
      artifactRole: "non_product_governance_requirements_inventory",
      contractSystemId: "vedic",
      productSystemId: "vedic-astrology"
    },
    zeroInstanceRequirementsReceipt: {
      acceptedInputs: 0,
      countsTowardAdmission: false,
      factReceiptIssued: false,
      factReceipts: 0,
      inputAcceptanceReceiptIssued: false,
      inputContractArtifacts: 1,
      inputContractGateSatisfied: false,
      inputInstancesObserved: 0,
      normalizationReceipts: 0,
      receiptClass: "input_contract_draft_present_zero_instance_observation",
      receiptIsFactReceipt: false,
      receiptIsProductReceipt: false,
      receiptStatus: "input_contract_draft_present_zero_instances_not_admitted",
      rejectedInputs: 0,
      requirementsDefined: requirements.length,
      requirementsDraftCovered: requirements.length,
      requirementsResolved: 0,
      successReceiptIssued: false,
      timeResolutionReceipts: 0,
      zeroRejectedInputsMeansNoExecutionObserved: true
    }
  };
  return deepFreezeJson({
    ...unsigned,
    ledgerDigest: domainSeparatedDigest(LEDGER_DIGEST_DOMAIN, unsigned)
  });
}

function allFalse(record) {
  return record && typeof record === "object" && !Array.isArray(record)
    && Object.values(record).every((value) => value === false);
}

function allEmptyArrays(record, keys) {
  return keys.every((key) => Array.isArray(record?.[key]) && record[key].length === 0);
}

function requireStaticFailClosedBoundary(ledger) {
  if (!canonicalUtc(ledger.createdAt)
    || ledger.createdAt !== LEDGER_CREATED_AT
    || ledger.schemaVersion !== "1.0.0"
    || ledger.recordType !== "vedic_input_contract_requirements_v1"
    || ledger.ledgerId !== "hakimi.vedic.input-contract-requirements/1.0.0"
    || ledger.status !== "input_contract_draft_present_zero_instances_not_admitted") {
    fail("LEDGER_INVALID", "吠陀输入要求账根身份无效。");
  }
  const inventory = ledger.requirementInventory;
  if (inventory?.requirementsInventoryDefined !== true
    || inventory.inputContractArtifactPresent !== true
    || inventory.inputContractGateSatisfied !== false
    || inventory.requirementsDefined !== REQUIREMENT_SPECS.length
    || inventory.requirementsDraftCovered !== REQUIREMENT_SPECS.length
    || inventory.requirementsResolved !== 0
    || !Array.isArray(inventory.requirements)
    || inventory.requirements.length !== REQUIREMENT_SPECS.length) {
    fail("REQUIREMENT_INVENTORY_INVALID", "吠陀输入要求清单摘要无效。");
  }
  for (let index = 0; index < REQUIREMENT_SPECS.length; index += 1) {
    const expected = REQUIREMENT_SPECS[index];
    const item = inventory.requirements[index];
    if (item?.order !== index + 1
      || item.requirementId !== expected.requirementId
      || item.requirementClass !== expected.requirementClass
      || item.requirementState !== "draft_shape_defined_value_unselected"
      || item.selectedValue !== null || item.defaultValue !== null
      || !exactJson(item.artifactRefs, [
        `${VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH}#/properties/${expected.requirementId}`
      ])
      || !allEmptyArrays(item, ["evidenceRefs", "expertRefs", "instanceValues", "rightsRefs", "sourceRefs"])) {
      fail("REQUIREMENT_ITEM_INVALID", "吠陀输入要求条目被选值、填充证据或改变顺序。");
    }
  }
  const receipt = ledger.zeroInstanceRequirementsReceipt;
  if (receipt?.receiptClass !== "input_contract_draft_present_zero_instance_observation"
    || receipt.receiptStatus !== ledger.status
    || receipt.requirementsDefined !== REQUIREMENT_SPECS.length
    || receipt.requirementsDraftCovered !== REQUIREMENT_SPECS.length
    || receipt.requirementsResolved !== 0
    || receipt.inputContractArtifacts !== 1
    || receipt.inputInstancesObserved !== 0
    || receipt.acceptedInputs !== 0 || receipt.rejectedInputs !== 0
    || receipt.normalizationReceipts !== 0 || receipt.timeResolutionReceipts !== 0
    || receipt.factReceipts !== 0
    || receipt.zeroRejectedInputsMeansNoExecutionObserved !== true
    || receipt.inputAcceptanceReceiptIssued !== false
    || receipt.factReceiptIssued !== false
    || receipt.successReceiptIssued !== false
    || receipt.receiptIsFactReceipt !== false
    || receipt.receiptIsProductReceipt !== false
    || receipt.countsTowardAdmission !== false
    || receipt.inputContractGateSatisfied !== false) {
    fail("ZERO_INSTANCE_RECEIPT_INVALID", "吠陀输入要求零实例回执无效。");
  }
  const counts = ledger.currentInstances?.counts;
  if (!counts || counts.inputContractArtifacts !== 1
    || Object.entries(counts).some(([key, value]) => key !== "inputContractArtifacts" && value !== 0)
    || !allEmptyArrays(ledger.currentInstances, [
      "factReceipts", "inputAcceptanceReceipts", "inputCandidates", "inputRejectionReceipts",
      "normalizationReceipts", "timeResolutionReceipts"
    ])
    || !exactJson(ledger.currentInstances.inputContractArtifacts, [ledger.boundaryBindings?.inputContractDraft])) {
    fail("CURRENT_INSTANCES_INVALID", "吠陀输入要求账不能包含实例或回执。");
  }
  if (!exactJson(ledger.failClosedInvariants, {
    crossSystemFallbackAccepted: false,
    defaultInference: "forbidden",
    generativeModelInference: "forbidden",
    missingOrAmbiguousInput: "reject_without_contract_or_fact_receipt",
    partialFactsPersisted: false
  })) {
    fail("FAIL_CLOSED_INVARIANT_INVALID", "吠陀输入要求账 fail-closed 边界无效。");
  }
  if (!exactJson(ledger.productBoundary, {
    domainManifest: "absent",
    factContract: "absent",
    factProducer: "absent",
    inputContract: "isolated_contract_draft",
    migrationId: null,
    mutationEpochCapability: "absent_no_admitted_product_schema",
    productSurface: "absent",
    projector: "absent",
    releaseIdentity: null,
    targetSchema: null,
    versionedRuleset: "absent"
  })) {
    fail("PRODUCT_BOUNDARY_INVALID", "吠陀输入要求账不能借入产品身份、Schema、producer 或 projector。");
  }
  if (!allFalse(ledger.authorityBoundary)) {
    fail("AUTHORITY_BOUNDARY_INVALID", "吠陀输入要求账不能晋级任何权威或发布状态。");
  }
  const source = ledger.sourceRightsBoundary;
  if (source?.bindingRequirementsInventoryDefined !== false
    || source.bindingRequired !== null || source.bindingFrozenVerified !== 0
    || source.sourceBindingEstablished !== false || source.licenseEstablished !== false
    || source.rightsEstablished !== false
    || !allEmptyArrays(source, [
      "exactLocatorRefs", "exactQuoteRefs", "licenseEvidenceRefs", "rightsEvidenceRefs",
      "sourceBodyRefs", "sourceCandidateIds"
    ])) {
    fail("SOURCE_RIGHTS_BOUNDARY_INVALID", "吠陀输入要求账不能填充来源、binding、许可或权利证据。");
  }
  const expert = ledger.expertBoundary;
  if (expert?.independentExpertsRequired !== 2
    || expert.independentExpertReviewsVerified !== 0
    || expert.identitiesVerified !== 0 || expert.credentialsVerified !== 0
    || expert.opinionsVerified !== 0 || expert.expertReviewBundle !== "absent"
    || expert.expertTruthEstablished !== false
    || !allEmptyArrays(expert, ["expertOpinionIds", "reviewerIds"])) {
    fail("EXPERT_BOUNDARY_INVALID", "吠陀输入要求账不能填充专家实例或专家真值。");
  }
  if (!exactJson(ledger.observationBoundary, {
    abaExcluded: false,
    boundArtifactHashAndInspectionUseSameReadBuffer: true,
    crossFileAtomicSnapshot: false,
    draftAndRequirementsAtomicSnapshot: false,
    endpointSnapshotOnly: true,
    heldFileHandleReads: true,
    intervalMutationExcluded: false,
    ledgerHashAndParseUseSameReadBuffer: true,
    mutationEpochAvailable: false,
    mutationEpochReceipt: null,
    pathEndpointRevalidated: true,
    plainDirectoryChainRequired: true
  })) {
    fail("OBSERVATION_BOUNDARY_INVALID", "吠陀输入要求账不能声称 epoch、原子快照或 ABA 排除。");
  }
  if (ledger.integrityBoundary?.digestAlgorithm !== "SHA-256"
    || ledger.integrityBoundary.digestDomain !== LEDGER_DIGEST_DOMAIN
    || ledger.integrityBoundary.digestIsDigitalSignature !== false
    || ledger.integrityBoundary.digitalSignature !== null
    || ledger.integrityBoundary.signerIdentity !== null
    || ledger.integrityBoundary.authenticityEstablished !== false) {
    fail("INTEGRITY_BOUNDARY_INVALID", "吠陀输入要求账 SHA-256 不能冒充签名或真实性。");
  }
  if (!Array.isArray(ledger.doesNotEstablish) || !exactJson(ledger.doesNotEstablish, [...DOES_NOT_ESTABLISH])) {
    fail("DOES_NOT_ESTABLISH_INVALID", "吠陀输入要求账否定边界无效。");
  }
  if (ledger.boundaryBindings?.bindingDirection !== "requirements_to_draft_and_adr_only"
    || ledger.boundaryBindings.productBoundaryAdr?.rawHashAndSemanticInspectionUseSameBuffer !== true
    || ledger.boundaryBindings.inputContractDraft?.rawHashAndSemanticInspectionUseSameBuffer !== true
    || ledger.boundaryBindings.inputContractDraft?.path !== VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH
    || ledger.boundaryBindings.inputContractDraft?.schemaStatus !== "isolated_contract_draft"
    || ledger.boundaryBindings.inputContractDraft?.artifactRole
      !== "project_authored_isolated_input_contract_draft") {
    fail("BOUNDARY_BINDING_INVALID", "吠陀输入要求账必须保持只指向批准草案与 ADR 的无环边界。");
  }
  if (typeof ledger.ledgerDigest !== "string" || !SHA256_PATTERN.test(ledger.ledgerDigest)
    || computeVedicInputContractRequirementsDigest(ledger) !== ledger.ledgerDigest) {
    fail("LEDGER_DIGEST_MISMATCH", "吠陀输入要求账 ledgerDigest 无效。");
  }
}

export async function readVedicInputContractRequirementsLedger(workspaceRoot) {
  const snapshot = await readStableWorkspaceFile(
    workspaceRoot,
    VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
    MAX_LEDGER_BYTES,
    {
      missingCode: "LEDGER_MISSING",
      invalidCode: "LEDGER_ENDPOINT_INVALID",
      label: "吠陀输入要求账"
    }
  );
  const ledger = parseVedicInputContractRequirementsJsonBytes(snapshot.bytes);
  if (canonicalPrettyStringifyVedicInputContractRequirements(ledger)
    !== new TextDecoder("utf-8", { fatal: true }).decode(snapshot.bytes)) {
    fail("LEDGER_MATERIALIZATION_MISMATCH", "吠陀输入要求账不是 canonical materialization。");
  }
  return ledger;
}

export async function verifyVedicInputContractRequirementsLedger(workspaceRoot, ledgerInput) {
  const ledger = capturePassiveJsonSnapshot(ledgerInput);
  requireStaticFailClosedBoundary(ledger);
  const expected = await buildCurrentVedicInputContractRequirementsLedger(workspaceRoot);
  if (canonicalStringifyVedicInputContractRequirements(ledger)
    !== canonicalStringifyVedicInputContractRequirements(expected)) {
    fail("LEDGER_CURRENT_CLOSURE_MISMATCH", "吠陀输入要求账与当前批准边界不一致。");
  }
  const frozenLedger = deepFreezeJson(capturePassiveJsonSnapshot(ledger));
  return Object.freeze({
    ledger: frozenLedger,
    ledgerDigest: frozenLedger.ledgerDigest,
    status: frozenLedger.status,
    requirementsDraftCovered: frozenLedger.requirementInventory.requirementsDraftCovered,
    requirementsDefined: frozenLedger.requirementInventory.requirementsDefined,
    requirementsResolved: frozenLedger.requirementInventory.requirementsResolved,
    inputContractArtifacts: frozenLedger.zeroInstanceRequirementsReceipt.inputContractArtifacts,
    inputInstancesObserved: frozenLedger.zeroInstanceRequirementsReceipt.inputInstancesObserved,
    inputContractGateSatisfied: frozenLedger.requirementInventory.inputContractGateSatisfied,
    releaseReady: frozenLedger.authorityBoundary.releaseReady,
    publicReleaseAuthorized: frozenLedger.authorityBoundary.publicReleaseAuthorized
  });
}

export const vedicInputContractRequirementsTestOnly = Object.freeze({
  expectedAdrRawIdentity: EXPECTED_ADR_RAW_IDENTITY,
  expectedDraftRawIdentity: EXPECTED_DRAFT_RAW_IDENTITY,
  requirementSpecs: REQUIREMENT_SPECS,
  safeWorkspaceFile
});
