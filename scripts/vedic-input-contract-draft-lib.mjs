import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { TextDecoder, types as utilTypes } from "node:util";
import { parseExpression } from "@babel/parser";

export const VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH =
  "content/system-admission/vedic-input-contract-draft.v0.1.0.schema.json";

const VEDIC_BOUNDARY_ADR_RELATIVE_PATH =
  "docs/吠陀占星独立产品化ADR-0001-2026-08-26.md";
const CONTRACT_VERSION = "hakimi.vedic.input/0.1-draft";
const SCHEMA_ID = "urn:hakimi:vedic:input-contract-draft:0.1.0";
const SCHEMA_SEMANTIC_DIGEST_DOMAIN = "hakimi.vedic.input-contract-draft.semantic.v0.1.0";
const MAX_SCHEMA_BYTES = 1_000_000;
const MAX_ADR_BYTES = 2_000_000;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const TYPED_ARRAY_PROTOTYPE = Object.getPrototypeOf(Uint8Array.prototype);
const TYPED_ARRAY_BUFFER_GETTER =
  Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "buffer").get;
const TYPED_ARRAY_BYTE_LENGTH_GETTER =
  Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "byteLength").get;
const ARRAY_BUFFER_RESIZABLE_GETTER =
  Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "resizable")?.get;
const UINT8_ARRAY_SET = Uint8Array.prototype.set;

const EXPECTED_DRAFT_RAW_IDENTITY = Object.freeze({
  bytes: 16_529,
  path: VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH,
  sha256: "4899e8fdf267a44e401295f23e11e2504e45f8e2f731c6be9b8ad1435e8dbf69"
});

const EXPECTED_ADR_RAW_IDENTITY = Object.freeze({
  bytes: 4_531,
  path: VEDIC_BOUNDARY_ADR_RELATIVE_PATH,
  sha256: "0e9b81505abb963b4d64426338b8071cd8a211eed8d02fe76065fada335dce63"
});

const EXPECTED_SCHEMA_SEMANTIC_DIGEST =
  "ad9a1d568d63296d3ed19f30d91cb8f8e52f543afcec03f238178da4af70ee08";

const REQUIREMENT_FIELDS = Object.freeze([
  "civil_calendar_and_date",
  "local_wall_time_and_precision",
  "birth_time_uncertainty_interval_or_candidates",
  "place_coordinates_and_precision",
  "iana_time_zone_and_tzdb_identity",
  "dst_gap_overlap_resolution",
  "utc_conversion_and_time_scale",
  "ephemeris_identity_version_and_coverage",
  "sidereal_zodiac_declaration",
  "ayanamsa_identity_and_version",
  "rahu_ketu_mode",
  "bhava_house_definition",
  "birth_time_perturbation_candidates_and_transition_points"
]);

const ID_VERSION_KEYS = Object.freeze({
  ayanamsa_identity_and_version: Object.freeze(["ayanamsa_id", "ayanamsa_version"]),
  bhava_house_definition: Object.freeze(["definition_id", "definition_version"]),
  birth_time_perturbation_candidates_and_transition_points: Object.freeze(["policy_id", "policy_version"]),
  birth_time_uncertainty_interval_or_candidates: Object.freeze(["model_id", "model_version"]),
  civil_calendar_and_date: Object.freeze(["calendar_id", "calendar_version"]),
  dst_gap_overlap_resolution: Object.freeze(["resolution_policy_id", "resolution_policy_version"]),
  ephemeris_identity_version_and_coverage: Object.freeze(["ephemeris_id", "ephemeris_version"]),
  iana_time_zone_and_tzdb_identity: Object.freeze(["iana_time_zone_id", "tzdb_version"]),
  local_wall_time_and_precision: Object.freeze(["precision_id", "precision_version"]),
  place_coordinates_and_precision: Object.freeze([
    "coordinate_reference_system_id",
    "coordinate_reference_system_version"
  ]),
  rahu_ketu_mode: Object.freeze(["mode_definition_id", "mode_definition_version"]),
  sidereal_zodiac_declaration: Object.freeze(["zodiac_id", "zodiac_version"]),
  utc_conversion_and_time_scale: Object.freeze([
    "conversion_id",
    "conversion_version",
    "input_time_scale_id",
    "input_time_scale_version",
    "output_time_scale_id",
    "output_time_scale_version"
  ])
});

const ADR_REQUIRED_MARKERS = Object.freeze([
  "# ADR-0001：吠陀占星保持独立研究、暂不集成",
  "- 状态：accepted-research-boundary",
  "- productStatus：`research-only`",
  "- integrationStatus：`not-integrated`",
  "- authorityStatus：`not-authoritative`",
  "- publicReleaseAuthorized：`false`",
  "任何缺失或歧义都必须结构化阻断，不能由默认值或生成模型补猜。",
  "不得借用八字、紫微或西洋的工程、来源、专家或权利证据为吠陀体系背书。",
  "在独立准入门关闭前，不创建占位计算结果、空数据库分区、伪成功回执、用户可点击入口或“综合命运”输出。"
]);

const EXPECTED_BOUNDARY = Object.freeze({
  acceptanceCapability: false,
  acceptedInputsIncluded: 0,
  artifactRole: "project_authored_isolated_input_contract_draft",
  authenticityEstablished: false,
  authorityStatus: "not-authoritative",
  authorshipAuthenticityEstablished: false,
  authorshipClaim: "project_authored_clean_room_draft",
  baziArtifactRefs: Object.freeze([]),
  baziAuthorityInherited: false,
  countsTowardAdmission: false,
  defaultInference: "forbidden",
  domainAuthorityAuthorized: false,
  expertClaimsAuthorized: false,
  externalSourceRefs: Object.freeze([]),
  factReceiptCapability: false,
  factReceiptIssued: false,
  formalAdmissionAuthorized: false,
  generativeModelInference: "forbidden",
  inputAcceptanceReceiptIssued: false,
  inputAccepted: false,
  inputContractGateSatisfied: false,
  inputInstancesIncluded: 0,
  integrationStatus: "not-integrated",
  missingOrAmbiguousInput: "reject",
  normalizationCapability: false,
  productBoundaryAdr: Object.freeze({
    bytes: EXPECTED_ADR_RAW_IDENTITY.bytes,
    path: EXPECTED_ADR_RAW_IDENTITY.path,
    rawHashAndSemanticInspectionUseSameBuffer: true,
    sha256: EXPECTED_ADR_RAW_IDENTITY.sha256
  }),
  productStatus: "research-only",
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  realPersonInputsIncluded: 0,
  releaseReady: false,
  requirementSelectionsIncluded: 0,
  requirementsResolved: 0,
  rightsEstablished: false,
  sampleInputsIncluded: 0,
  schemaStatus: "isolated_contract_draft",
  structuralPrecheckCountsAsAcceptance: false,
  structuralPrecheckOnly: true,
  successReceiptCapability: false,
  successReceiptIssued: false,
  syntheticPersonInputsIncluded: 0
});

export class VedicInputContractDraftError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "VedicInputContractDraftError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new VedicInputContractDraftError(code, message);
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function capturePassiveJsonValue(value, state, depth) {
  if (depth > 96) fail("INPUT_DEPTH_EXCEEDED", "吠陀输入合同草案对象超过最大深度。");
  state.nodes += 1;
  if (state.nodes > 200_000) fail("INPUT_NODE_LIMIT_EXCEEDED", "吠陀输入合同草案对象超过节点上限。");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      fail("INPUT_VALUE_INVALID", "吠陀输入合同草案对象含非规范 JSON 数值。");
    }
    return value;
  }
  if (typeof value === "string") {
    state.textCharacters += value.length;
    if (state.textCharacters > 2_000_000) fail("INPUT_TEXT_LIMIT_EXCEEDED", "吠陀输入合同草案文本超过上限。");
    return value;
  }
  if (typeof value !== "object") fail("INPUT_VALUE_INVALID", "吠陀输入合同草案对象 API 只接受 JSON 值。");
  if (utilTypes.isProxy(value)) fail("INPUT_PROXY_FORBIDDEN", "吠陀输入合同草案对象 API 不接受 Proxy。");
  if (state.active.has(value)) fail("INPUT_CYCLE_FORBIDDEN", "吠陀输入合同草案对象 API 不接受循环引用。");
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
      throw new VedicInputContractDraftError("INPUT_OBJECT_UNSAFE", "无法安全捕获吠陀输入合同草案对象。", { cause });
    }
    const descriptorKeys = Reflect.ownKeys(descriptors);
    if (descriptorKeys.some((key) => typeof key === "symbol")) {
      fail("INPUT_SYMBOL_FORBIDDEN", "吠陀输入合同草案对象 API 不接受 Symbol 属性。");
    }
    if (array) {
      if (prototype !== Array.prototype) fail("INPUT_PROTOTYPE_INVALID", "吠陀输入合同草案数组原型无效。");
      const lengthDescriptor = descriptors.length;
      const length = lengthDescriptor?.value;
      if (lengthDescriptor?.get || lengthDescriptor?.set
        || !Number.isSafeInteger(length) || length < 0 || length > 200_000) {
        fail("INPUT_ARRAY_INVALID", "吠陀输入合同草案数组长度无效。");
      }
      const allowedKeys = new Set(["length", ...Array.from({ length }, (_entry, index) => String(index))]);
      if (descriptorKeys.some((key) => !allowedKeys.has(key))) {
        fail("INPUT_ARRAY_INVALID", "吠陀输入合同草案数组含额外属性。");
      }
      const result = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
          fail("INPUT_ARRAY_INVALID", "吠陀输入合同草案对象 API 不接受稀疏数组或访问器元素。");
        }
        result.push(capturePassiveJsonValue(descriptor.value, state, depth + 1));
      }
      return result;
    }
    if (prototype !== Object.prototype) fail("INPUT_PROTOTYPE_INVALID", "吠陀输入合同草案只接受普通 JSON 对象。");
    const entries = [];
    for (const key of descriptorKeys) {
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
        fail("INPUT_ACCESSOR_FORBIDDEN", "吠陀输入合同草案对象 API 不接受访问器或不可枚举字段。");
      }
      entries.push([key, capturePassiveJsonValue(descriptor.value, state, depth + 1)]);
    }
    return Object.fromEntries(entries);
  } finally {
    state.active.delete(value);
  }
}

function capturePassiveJsonSnapshot(value) {
  return capturePassiveJsonValue(value, { active: new WeakSet(), nodes: 0, textCharacters: 0 }, 0);
}

function deepFreezeJson(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreezeJson(child);
  return Object.freeze(value);
}

function canonicalValue(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value) && !Object.is(value, -0)) return value;
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.keys(value).sort(compareCodeUnits).map((key) => [key, canonicalValue(value[key])]));
  }
  fail("NON_CANONICAL_JSON", "吠陀输入合同草案只接受有限规范 JSON 值。");
}

export function canonicalStringifyVedicInputContractDraft(value) {
  return JSON.stringify(canonicalValue(capturePassiveJsonSnapshot(value)));
}

export function canonicalPrettyStringifyVedicInputContractDraft(value) {
  return `${JSON.stringify(canonicalValue(capturePassiveJsonSnapshot(value)), null, 2)}\n`;
}

function domainSeparatedDigest(domain, value) {
  return createHash("sha256")
    .update(domain, "utf8")
    .update("\0", "utf8")
    .update(canonicalStringifyVedicInputContractDraft(value), "utf8")
    .digest("hex");
}

function semanticProjection(schema) {
  return {
    boundary: schema["x-hakimiBoundary"],
    contractVersion: schema.properties?.contractVersion?.const,
    properties: schema.properties,
    required: schema.required,
    rootAdditionalProperties: schema.additionalProperties,
    rootType: schema.type,
    schemaId: schema.$id,
    schemaStandard: schema.$schema
  };
}

export function computeVedicInputContractDraftSemanticDigest(schemaInput) {
  const schema = capturePassiveJsonSnapshot(schemaInput);
  return domainSeparatedDigest(SCHEMA_SEMANTIC_DIGEST_DOMAIN, semanticProjection(schema));
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
      } else if (value !== null && typeof value === "object") stack.push(value);
    }
  }
}

export function parseVedicInputContractDraftJsonBytes(bytes, label = "吠陀输入合同草案 JSON", maxBytes = MAX_SCHEMA_BYTES) {
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
    throw new VedicInputContractDraftError("JSON_INVALID", `${label} 的字节内建身份无效。`, { cause });
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
      throw new VedicInputContractDraftError("JSON_INVALID", `${label} 的 ArrayBuffer 状态不可读取。`, { cause });
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
    throw new VedicInputContractDraftError("JSON_INVALID", `${label} 的 Uint8Array 无法按内部槽复制。`, { cause });
  }
  if (capturedBytes.byteLength >= 3
    && capturedBytes[0] === 0xef && capturedBytes[1] === 0xbb && capturedBytes[2] === 0xbf) {
    fail("JSON_BOM_FORBIDDEN", `${label} 不得包含 UTF-8 BOM。`);
  }
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(capturedBytes);
  } catch (cause) {
    throw new VedicInputContractDraftError("JSON_UTF8_INVALID", `${label} 不是严格 UTF-8。`, { cause });
  }
  if (!source.trim()) fail("JSON_INVALID", `${label} 为空。`);
  let expression;
  try {
    expression = parseExpression(source.trim(), {
      attachComment: false,
      errorRecovery: false,
      sourceFilename: "vedic-input-contract-draft.json",
      sourceType: "script"
    });
  } catch (cause) {
    throw new VedicInputContractDraftError("JSON_INVALID", `${label} 不能按严格 JSON 检查。`, { cause });
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
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) fail("JSON_INVALID", `${label} 必须是 JSON 对象。`);
    return parsed;
  } catch (cause) {
    if (cause instanceof VedicInputContractDraftError) throw cause;
    throw new VedicInputContractDraftError("JSON_INVALID", `${label} 不是有效 JSON。`, { cause });
  }
}

function safeWorkspaceFile(workspaceRoot, relativePath) {
  const segments = typeof relativePath === "string" ? relativePath.split("/") : [];
  if (typeof relativePath !== "string" || relativePath.length < 1 || relativePath.length > 300
    || relativePath.includes("\0") || relativePath.includes("\\") || relativePath.startsWith("/")
    || path.posix.normalize(relativePath) !== relativePath
    || segments.some((segment) => segment === "" || segment === "." || segment === ".." || segment.includes(":"))) {
    fail("UNSAFE_ARTIFACT_PATH", "吠陀输入合同草案路径不安全。");
  }
  const root = path.resolve(workspaceRoot);
  const absolute = path.resolve(root, ...segments);
  const relative = path.relative(root, absolute);
  if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    fail("UNSAFE_ARTIFACT_PATH", "吠陀输入合同草案路径越界。");
  }
  return absolute;
}

function isSameOrWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function sameFileEndpoint(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.nlink === right.nlink
    && left.size === right.size && left.mtimeNs === right.mtimeNs && left.ctimeNs === right.ctimeNs;
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
    endpoints.push(Object.freeze({ absolutePath: cursor, metadata, resolvedPath }));
  }
  return Object.freeze(endpoints);
}

function sameDirectoryChain(left, right) {
  return left.length === right.length && left.every((entry, index) => {
    const other = right[index];
    return other !== undefined && entry.absolutePath === other.absolutePath
      && entry.resolvedPath === other.resolvedPath && sameFileEndpoint(entry.metadata, other.metadata);
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

async function readStableWorkspaceFile(workspaceRoot, relativePath, maxBytes, { invalidCode, label, missingCode }) {
  const absolute = safeWorkspaceFile(workspaceRoot, relativePath);
  let before;
  let actual;
  let directoryChainBefore;
  try {
    directoryChainBefore = await capturePlainDirectoryChain(workspaceRoot, absolute, invalidCode, label);
    [before, actual] = await Promise.all([lstat(absolute, { bigint: true }), realpath(absolute)]);
  } catch (cause) {
    if (cause instanceof VedicInputContractDraftError) throw cause;
    throw new VedicInputContractDraftError(missingCode, `${label} 不存在。`, { cause });
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
      sha256: createHash("sha256").update(bytes).digest("hex"),
      size: bytes.byteLength
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
    if (cause instanceof VedicInputContractDraftError) throw cause;
    throw new VedicInputContractDraftError("BOUND_ARTIFACT_UTF8_INVALID", `${label} 不是严格 UTF-8。`, { cause });
  }
}

function requireExactRawIdentity(snapshot, expected, label) {
  if (snapshot.size !== expected.bytes || snapshot.sha256 !== expected.sha256) {
    fail("BOUND_ARTIFACT_IDENTITY_MISMATCH", `${label} 原始字节身份漂移。`);
  }
}

function verifyAdrSnapshot(snapshot) {
  requireExactRawIdentity(snapshot, EXPECTED_ADR_RAW_IDENTITY, "吠陀产品边界 ADR");
  const text = decodeStrictUtf8(snapshot.bytes, "吠陀产品边界 ADR");
  for (const marker of ADR_REQUIRED_MARKERS) {
    if (!text.includes(marker)) fail("ADR_SEMANTIC_MISMATCH", "吠陀产品边界 ADR 缺少批准语义标记。");
  }
}

function exactJson(left, right) {
  return canonicalStringifyVedicInputContractDraft(left) === canonicalStringifyVedicInputContractDraft(right);
}

function walkJson(value, visitor, pathSegments = []) {
  visitor(value, pathSegments);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walkJson(entry, visitor, [...pathSegments, index]));
  } else if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) walkJson(entry, visitor, [...pathSegments, key]);
  }
}

function assertStringDeclaration(branch, keys, field) {
  if (branch?.type !== "object" || branch.additionalProperties !== false || !Array.isArray(branch.required)) {
    fail("REQUIREMENT_FIELD_INVALID", `吠陀输入字段 ${field} 必须是失败关闭对象。`);
  }
  for (const key of keys) {
    const property = branch.properties?.[key];
    if (!branch.required.includes(key) || property?.type !== "string" || property.minLength !== 1) {
      fail("DECLARATION_IDENTITY_INVALID", `吠陀输入字段 ${field} 缺少显式 ${key}。`);
    }
  }
}

function requireStaticDraftBoundary(schema) {
  const expectedRootKeys = [
    "$id", "$schema", "additionalProperties", "properties", "required", "title", "type", "x-hakimiBoundary"
  ];
  if (!schema || typeof schema !== "object" || Array.isArray(schema)
    || !exactJson(Object.keys(schema).sort(compareCodeUnits), expectedRootKeys.sort(compareCodeUnits))
    || schema.$id !== SCHEMA_ID || schema.$schema !== "https://json-schema.org/draft/2020-12/schema"
    || schema.title !== "Hakimi Vedic input contract draft 0.1.0"
    || schema.type !== "object" || schema.additionalProperties !== false) {
    fail("SCHEMA_IDENTITY_INVALID", "吠陀输入合同草案根身份无效。");
  }
  const expectedRequired = ["contractVersion", ...REQUIREMENT_FIELDS];
  const expectedPropertyKeys = [...expectedRequired].sort(compareCodeUnits);
  if (!exactJson(schema.required, expectedRequired)
    || !schema.properties || !exactJson(Object.keys(schema.properties).sort(compareCodeUnits), expectedPropertyKeys)
    || schema.properties.contractVersion?.const !== CONTRACT_VERSION) {
    fail("REQUIREMENT_FIELD_SET_INVALID", "吠陀输入合同草案必须精确覆盖 contractVersion 与十三项要求。");
  }
  for (const field of REQUIREMENT_FIELDS) {
    const declaration = schema.properties[field];
    const branches = Array.isArray(declaration?.oneOf) ? declaration.oneOf : [declaration];
    if (branches.length < 1) fail("REQUIREMENT_FIELD_INVALID", `吠陀输入字段 ${field} 没有声明分支。`);
    for (const branch of branches) assertStringDeclaration(branch, ID_VERSION_KEYS[field], field);
  }
  walkJson(schema, (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    for (const forbidden of ["default", "example", "examples"]) {
      if (Object.prototype.hasOwnProperty.call(value, forbidden)) {
        fail("SCHEMA_DEFAULT_OR_EXAMPLE_FORBIDDEN", "吠陀输入合同草案不得携带 default 或 example。" );
      }
    }
    if (Object.prototype.hasOwnProperty.call(value, "$ref")
      && (typeof value.$ref !== "string" || !value.$ref.startsWith("#/$defs/"))) {
      fail("SCHEMA_EXTERNAL_REF_FORBIDDEN", "吠陀输入合同草案不得引用外部 schema。" );
    }
    if (value.type === "object" && value.additionalProperties !== false) {
      fail("SCHEMA_OBJECT_OPEN", "吠陀输入合同草案所有实例对象必须 additionalProperties=false。" );
    }
  });
  if (!exactJson(schema["x-hakimiBoundary"], EXPECTED_BOUNDARY)) {
    fail("BOUNDARY_PROMOTED", "吠陀输入合同草案被提升为接纳、事实、权威或发布能力。" );
  }
  const digest = computeVedicInputContractDraftSemanticDigest(schema);
  if (!SHA256_PATTERN.test(digest) || digest !== EXPECTED_SCHEMA_SEMANTIC_DIGEST) {
    fail("SCHEMA_SEMANTIC_DIGEST_MISMATCH", "吠陀输入合同草案语义摘要漂移。" );
  }
}

async function readDraftSnapshot(workspaceRoot) {
  const snapshot = await readStableWorkspaceFile(
    workspaceRoot,
    VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH,
    MAX_SCHEMA_BYTES,
    { invalidCode: "SCHEMA_ENDPOINT_INVALID", label: "吠陀输入合同草案", missingCode: "SCHEMA_MISSING" }
  );
  requireExactRawIdentity(snapshot, EXPECTED_DRAFT_RAW_IDENTITY, "吠陀输入合同草案");
  const schema = parseVedicInputContractDraftJsonBytes(snapshot.bytes);
  const source = new TextDecoder("utf-8", { fatal: true }).decode(snapshot.bytes);
  if (source !== canonicalPrettyStringifyVedicInputContractDraft(schema)) {
    fail("SCHEMA_MATERIALIZATION_MISMATCH", "吠陀输入合同草案不是 canonical materialization。" );
  }
  return Object.freeze({ schema, snapshot });
}

export async function buildCurrentVedicInputContractDraft(workspaceRoot) {
  const [draft, adrSnapshot] = await Promise.all([
    readDraftSnapshot(workspaceRoot),
    readStableWorkspaceFile(
      workspaceRoot,
      VEDIC_BOUNDARY_ADR_RELATIVE_PATH,
      MAX_ADR_BYTES,
      { invalidCode: "ADR_ENDPOINT_INVALID", label: "吠陀产品边界 ADR", missingCode: "ADR_MISSING" }
    )
  ]);
  verifyAdrSnapshot(adrSnapshot);
  requireStaticDraftBoundary(draft.schema);
  return deepFreezeJson({
    rawIdentity: {
      bytes: draft.snapshot.size,
      path: VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH,
      sha256: draft.snapshot.sha256
    },
    schema: draft.schema,
    schemaSemanticDigest: computeVedicInputContractDraftSemanticDigest(draft.schema)
  });
}

export async function readVedicInputContractDraft(workspaceRoot) {
  const { schema } = await readDraftSnapshot(workspaceRoot);
  return schema;
}

export async function verifyVedicInputContractDraft(workspaceRoot, schemaInput) {
  const schema = capturePassiveJsonSnapshot(schemaInput);
  requireStaticDraftBoundary(schema);
  const current = await buildCurrentVedicInputContractDraft(workspaceRoot);
  if (canonicalStringifyVedicInputContractDraft(schema) !== canonicalStringifyVedicInputContractDraft(current.schema)) {
    fail("SCHEMA_CURRENT_CLOSURE_MISMATCH", "吠陀输入合同草案与当前批准的 draft → ADR 闭包不一致。" );
  }
  const frozenSchema = deepFreezeJson(capturePassiveJsonSnapshot(schema));
  return Object.freeze({
    artifactRole: frozenSchema["x-hakimiBoundary"].artifactRole,
    countsTowardAdmission: false,
    domainAuthorityAuthorized: false,
    factReceiptIssued: false,
    formalAdmissionAuthorized: false,
    inputAcceptanceReceiptIssued: false,
    inputAccepted: false,
    inputContractGateSatisfied: false,
    inputInstancesObserved: 0,
    publicReleaseAuthorized: false,
    releaseReady: false,
    requirementFieldsDefined: REQUIREMENT_FIELDS.length,
    requirementSelectionsIncluded: 0,
    requirementsResolved: 0,
    schema: frozenSchema,
    schemaSemanticDigest: current.schemaSemanticDigest,
    schemaStatus: frozenSchema["x-hakimiBoundary"].schemaStatus,
    structuralPrecheckOnly: true,
    structuralPrecheckPassed: true,
    successReceiptIssued: false
  });
}

export const vedicInputContractDraftTestOnly = Object.freeze({
  contractVersion: CONTRACT_VERSION,
  expectedAdrRawIdentity: EXPECTED_ADR_RAW_IDENTITY,
  expectedDraftRawIdentity: EXPECTED_DRAFT_RAW_IDENTITY,
  expectedSchemaSemanticDigest: EXPECTED_SCHEMA_SEMANTIC_DIGEST,
  requirementFields: REQUIREMENT_FIELDS,
  safeWorkspaceFile
});
