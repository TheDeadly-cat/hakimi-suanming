import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { TextDecoder, types as utilTypes } from "node:util";
import { parseExpression } from "@babel/parser";
import {
  canonicalPrettyStringifyVedicFactContractDraft,
  computeVedicFactContractDraftSemanticDigest,
  parseVedicFactContractDraftJsonBytes,
  vedicFactContractDraftTestOnly,
  verifyVedicFactContractDraft
} from "./vedic-fact-contract-draft-lib.mjs";
import {
  canonicalPrettyStringifyVedicInputContractDraft,
  computeVedicInputContractDraftSemanticDigest,
  parseVedicInputContractDraftJsonBytes,
  vedicInputContractDraftTestOnly,
  verifyVedicInputContractDraft
} from "./vedic-input-contract-draft-lib.mjs";
import {
  verifyVedicInputContractRequirementsLedger
} from "./vedic-input-contract-requirements-lib.mjs";

export const VEDIC_FACT_CONTRACT_REQUIREMENTS_RELATIVE_PATH =
  "content/system-admission/vedic-fact-contract-requirements.v1.json";

const VEDIC_BOUNDARY_ADR_RELATIVE_PATH =
  "docs/吠陀占星独立产品化ADR-0001-2026-08-26.md";
const VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH =
  "content/system-admission/vedic-input-contract-draft.v0.1.0.schema.json";
const VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH =
  "content/system-admission/vedic-input-contract-requirements.v1.json";
const VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH =
  "content/system-admission/vedic-fact-contract-draft.v0.1.0.schema.json";
const LEDGER_CREATED_AT = "2026-08-29T00:00:00.000Z";
const LEDGER_DIGEST_DOMAIN = "hakimi.vedic.fact-contract-requirements.v1";
const ADR_SEMANTIC_DIGEST_DOMAIN = "hakimi.vedic.independent-product-boundary-adr.v1";
const INPUT_DRAFT_SEMANTIC_DIGEST_DOMAIN = "hakimi.vedic.input-contract-draft.semantic.v0.1.0";
const FACT_DRAFT_SEMANTIC_DIGEST_DOMAIN = "hakimi.vedic.fact-contract-draft.semantic.v0.1.0";
const INPUT_REQUIREMENTS_SEMANTIC_DIGEST_DOMAIN =
  "hakimi.vedic.input-contract-requirements.binding.v1";
const MAX_LEDGER_BYTES = 1_000_000;
const MAX_BOUND_ARTIFACT_BYTES = 2_000_000;
const CANONICAL_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const TYPED_ARRAY_PROTOTYPE = Object.getPrototypeOf(Uint8Array.prototype);
const TYPED_ARRAY_BYTE_LENGTH_GETTER =
  Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "byteLength").get;
const UINT8_ARRAY_SET = Uint8Array.prototype.set;

const EXPECTED_ADR_RAW_IDENTITY = Object.freeze({
  path: VEDIC_BOUNDARY_ADR_RELATIVE_PATH,
  bytes: 4_531,
  sha256: "0e9b81505abb963b4d64426338b8071cd8a211eed8d02fe76065fada335dce63"
});

const EXPECTED_INPUT_DRAFT_RAW_IDENTITY = Object.freeze({
  path: VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH,
  bytes: 16_529,
  sha256: "4899e8fdf267a44e401295f23e11e2504e45f8e2f731c6be9b8ad1435e8dbf69"
});

const EXPECTED_INPUT_REQUIREMENTS_RAW_IDENTITY = Object.freeze({
  path: VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
  bytes: 15_859,
  sha256: "85409d7f4ed7ef6bddc4d34102ecff479fd8dbe4210a78416f90ee705a0f2e59"
});

const EXPECTED_FACT_DRAFT_RAW_IDENTITY = Object.freeze({
  path: VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH,
  bytes: 14_240,
  sha256: "6fe875bcb156ae9c7756302e96d902b8c03668e58a8894b33bc0d5fab374a1fe"
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
const EXPECTED_INPUT_DRAFT_SEMANTIC_DIGEST =
  "ad9a1d568d63296d3ed19f30d91cb8f8e52f543afcec03f238178da4af70ee08";
const EXPECTED_FACT_DRAFT_SEMANTIC_DIGEST =
  "0eb3aa460403e42ca5542d1bafb3325d543a0e11429f40b8041f2c1bdf0bc5b1";

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

const BLOCKED_PREREQUISITE_IDS = Object.freeze([
  "accepted_input_and_evaluated_candidate_identity",
  "fact_generation_implementation_identity",
  "observation_instant_and_time_scale_semantics",
  "coordinate_frame_and_numeric_representation_semantics",
  "graha_catalog_and_position_semantics",
  "rahu_ketu_node_mode_and_position_invariant",
  "lagna_definition_and_position_semantics",
  "rashi_catalog_segmentation_and_boundary_semantics",
  "bhava_definition_geometry_and_assignment_semantics",
  "candidate_transition_provenance_semantics",
  "fact_completeness_uniqueness_and_cross_field_invariants",
  "rejection_channel_and_no_partial_fact_artifact"
]);

const FACT_FAMILY_SPECS = Object.freeze([
  Object.freeze({
    factFamilyId: "observation_instant_fact",
    schemaPropertyPointer: "#/properties/observationInstantFact"
  }),
  Object.freeze({
    factFamilyId: "graha_position_facts",
    schemaPropertyPointer: "#/properties/grahaPositionFacts"
  }),
  Object.freeze({
    factFamilyId: "lagna_fact",
    schemaPropertyPointer: "#/properties/lagnaFact"
  }),
  Object.freeze({
    factFamilyId: "bhava_facts",
    schemaPropertyPointer: "#/properties/bhavaFacts"
  })
]);

const FACT_FAMILY_BLOCKED_PREREQUISITE_MAP =
  vedicFactContractDraftTestOnly.factFamilyBlockedPrerequisiteMap;

const PREREQUISITE_BASIS_PROPERTY_MAP = Object.freeze({
  accepted_input_and_evaluated_candidate_identity: Object.freeze([
    "input_contract_ref",
    "accepted_input_artifact_ref",
    "input_acceptance_receipt_ref",
    "evaluated_candidate_ref"
  ]),
  fact_generation_implementation_identity: Object.freeze([
    "fact_generation_implementation_ref",
    "runtime_artifact_set_ref"
  ]),
  observation_instant_and_time_scale_semantics: Object.freeze([
    "utc_conversion_definition_ref",
    "time_scale_definition_ref"
  ]),
  coordinate_frame_and_numeric_representation_semantics: Object.freeze([
    "coordinate_frame_definition_ref",
    "numeric_representation_definition_ref"
  ]),
  graha_catalog_and_position_semantics: Object.freeze([
    "ephemeris_definition_ref",
    "sidereal_zodiac_definition_ref",
    "ayanamsa_definition_ref",
    "graha_catalog_definition_ref"
  ]),
  rahu_ketu_node_mode_and_position_invariant: Object.freeze([
    "node_mode_definition_ref"
  ]),
  lagna_definition_and_position_semantics: Object.freeze([
    "ephemeris_definition_ref",
    "sidereal_zodiac_definition_ref",
    "ayanamsa_definition_ref"
  ]),
  rashi_catalog_segmentation_and_boundary_semantics: Object.freeze([
    "sidereal_zodiac_definition_ref",
    "ayanamsa_definition_ref",
    "rashi_catalog_definition_ref"
  ]),
  bhava_definition_geometry_and_assignment_semantics: Object.freeze([
    "bhava_definition_ref"
  ]),
  candidate_transition_provenance_semantics: Object.freeze([
    "evaluated_candidate_ref"
  ]),
  fact_completeness_uniqueness_and_cross_field_invariants: Object.freeze([
    "fact_generation_implementation_ref",
    "runtime_artifact_set_ref"
  ]),
  rejection_channel_and_no_partial_fact_artifact: Object.freeze([
    "input_acceptance_receipt_ref",
    "fact_generation_implementation_ref"
  ])
});

const BASIS_PROPERTY_IDS = Object.freeze([
  "input_contract_ref",
  "accepted_input_artifact_ref",
  "input_acceptance_receipt_ref",
  "evaluated_candidate_ref",
  "fact_generation_implementation_ref",
  "runtime_artifact_set_ref",
  "utc_conversion_definition_ref",
  "time_scale_definition_ref",
  "ephemeris_definition_ref",
  "sidereal_zodiac_definition_ref",
  "ayanamsa_definition_ref",
  "node_mode_definition_ref",
  "bhava_definition_ref",
  "coordinate_frame_definition_ref",
  "numeric_representation_definition_ref",
  "graha_catalog_definition_ref",
  "rashi_catalog_definition_ref"
]);

const PREREQUISITE_SPECS = Object.freeze(BLOCKED_PREREQUISITE_IDS.map((requirementId) =>
  Object.freeze({
    basisPropertyIds: PREREQUISITE_BASIS_PROPERTY_MAP[requirementId],
    requirementClass: "v0_1_scoped_fact_prerequisite",
    requirementId
  })));

const DOES_NOT_ESTABLISH = Object.freeze([
  "closed_or_exhaustive_vedic_fact_requirements_universe",
  "formally_admitted_or_semantically_selected_vedic_fact_contract",
  "fact_values_deterministic_facts_or_computation_capability",
  "fact_producer_projector_or_engine_profile_binding",
  "fact_failure_acceptance_or_success_receipt_instance",
  "utc_dst_time_scale_ephemeris_or_sidereal_correctness",
  "ayanamsa_node_bhava_perturbation_or_rule_policy_selection",
  "sample_real_or_synthetic_person_fact_instance",
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

export class VedicFactContractRequirementsError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "VedicFactContractRequirementsError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new VedicFactContractRequirementsError(code, message);
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function capturePassiveJsonValue(value, state, depth) {
  if (depth > 64) fail("INPUT_DEPTH_EXCEEDED", "吠陀事实要求账对象 API 超过最大深度。");
  state.nodes += 1;
  if (state.nodes > 200_000) fail("INPUT_NODE_LIMIT_EXCEEDED", "吠陀事实要求账对象 API 超过节点上限。");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      fail("INPUT_VALUE_INVALID", "吠陀事实要求账对象 API 含非规范 JSON 数值。");
    }
    return value;
  }
  if (typeof value === "string") {
    state.textCharacters += value.length;
    if (state.textCharacters > 2_000_000) {
      fail("INPUT_TEXT_LIMIT_EXCEEDED", "吠陀事实要求账对象 API 超过文本上限。");
    }
    return value;
  }
  if (typeof value !== "object") fail("INPUT_VALUE_INVALID", "吠陀事实要求账对象 API 只接受 JSON 数据值。");
  if (utilTypes.isProxy(value)) fail("INPUT_PROXY_FORBIDDEN", "吠陀事实要求账对象 API 不接受 Proxy。");
  if (state.active.has(value)) fail("INPUT_CYCLE_FORBIDDEN", "吠陀事实要求账对象 API 不接受循环引用。");
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
      throw new VedicFactContractRequirementsError(
        "INPUT_OBJECT_UNSAFE",
        "吠陀事实要求账对象 API 无法安全捕获对象描述符。",
        { cause }
      );
    }
    const descriptorKeys = Reflect.ownKeys(descriptors);
    if (descriptorKeys.some((key) => typeof key === "symbol")) {
      fail("INPUT_SYMBOL_FORBIDDEN", "吠陀事实要求账对象 API 不接受 Symbol 属性。");
    }
    if (array) {
      if (prototype !== Array.prototype) fail("INPUT_PROTOTYPE_INVALID", "吠陀事实要求账对象 API 数组原型无效。");
      const lengthDescriptor = descriptors.length;
      const length = lengthDescriptor?.value;
      if (lengthDescriptor?.get || lengthDescriptor?.set
        || !Number.isSafeInteger(length) || length < 0 || length > 200_000) {
        fail("INPUT_ARRAY_INVALID", "吠陀事实要求账对象 API 数组长度无效。");
      }
      const allowedKeys = new Set(["length", ...Array.from({ length }, (_entry, index) => String(index))]);
      if (descriptorKeys.some((key) => !allowedKeys.has(key))) {
        fail("INPUT_ARRAY_INVALID", "吠陀事实要求账对象 API 数组含额外属性。");
      }
      const result = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
          fail("INPUT_ARRAY_INVALID", "吠陀事实要求账对象 API 不接受稀疏数组或访问器元素。");
        }
        result.push(capturePassiveJsonValue(descriptor.value, state, depth + 1));
      }
      return result;
    }
    if (prototype !== Object.prototype) {
      fail("INPUT_PROTOTYPE_INVALID", "吠陀事实要求账对象 API 只接受普通 JSON 对象。");
    }
    const entries = [];
    for (const key of descriptorKeys) {
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
        fail("INPUT_ACCESSOR_FORBIDDEN", "吠陀事实要求账对象 API 不接受访问器或不可枚举字段。");
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
  fail("NON_CANONICAL_JSON", "吠陀事实要求账只接受有限规范 JSON 值。");
}

export function canonicalStringifyVedicFactContractRequirements(value) {
  return JSON.stringify(canonicalValue(capturePassiveJsonSnapshot(value)));
}

export function canonicalPrettyStringifyVedicFactContractRequirements(value) {
  return `${JSON.stringify(canonicalValue(capturePassiveJsonSnapshot(value)), null, 2)}\n`;
}

function domainSeparatedDigest(domain, value) {
  return createHash("sha256")
    .update(domain, "utf8")
    .update("\0", "utf8")
    .update(canonicalStringifyVedicFactContractRequirements(value), "utf8")
    .digest("hex");
}

export function computeVedicFactContractRequirementsDigest(ledgerInput) {
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

export function parseVedicFactContractRequirementsJsonBytes(
  bytes,
  label = "吠陀事实要求账 JSON",
  maxBytes = MAX_LEDGER_BYTES
) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    fail("JSON_TOO_LARGE", `${label} 超过输入上限。`);
  }
  if (bytes === null || typeof bytes !== "object") {
    fail("JSON_INVALID", `${label} 必须是字节。`);
  }
  if (utilTypes.isProxy(bytes)) {
    fail("JSON_PROXY_FORBIDDEN", `${label} 不接受 Proxy 字节视图。`);
  }
  if (!utilTypes.isUint8Array(bytes)) {
    fail("JSON_INVALID", `${label} 必须是具有内部 Uint8Array 品牌的字节视图。`);
  }
  let byteLength;
  try {
    byteLength = Reflect.apply(TYPED_ARRAY_BYTE_LENGTH_GETTER, bytes, []);
  } catch (cause) {
    throw new VedicFactContractRequirementsError(
      "JSON_INVALID",
      `${label} 的 Uint8Array 内部长度不可读取。`,
      { cause }
    );
  }
  if (!Number.isSafeInteger(byteLength) || byteLength > maxBytes) {
    fail("JSON_TOO_LARGE", `${label} 超过输入上限。`);
  }
  const capturedBytes = new Uint8Array(byteLength);
  try {
    Reflect.apply(UINT8_ARRAY_SET, capturedBytes, [bytes]);
  } catch (cause) {
    throw new VedicFactContractRequirementsError(
      "JSON_INVALID",
      `${label} 的 Uint8Array 无法按内部槽复制。`,
      { cause }
    );
  }
  if (byteLength >= 3
    && capturedBytes[0] === 0xef
    && capturedBytes[1] === 0xbb
    && capturedBytes[2] === 0xbf) {
    fail("JSON_BOM_FORBIDDEN", `${label} 不得包含 UTF-8 BOM。`);
  }
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(capturedBytes);
  } catch (cause) {
    throw new VedicFactContractRequirementsError("JSON_UTF8_INVALID", `${label} 不是严格 UTF-8。`, { cause });
  }
  if (!source.trim()) fail("JSON_INVALID", `${label} 为空。`);
  let expression;
  try {
    expression = parseExpression(source.trim(), {
      sourceFilename: "vedic-fact-contract-requirements.json",
      sourceType: "script",
      errorRecovery: false,
      attachComment: false
    });
  } catch (cause) {
    throw new VedicFactContractRequirementsError("JSON_INVALID", `${label} 不能按严格 JSON 检查。`, { cause });
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
    if (cause instanceof VedicFactContractRequirementsError) throw cause;
    throw new VedicFactContractRequirementsError("JSON_INVALID", `${label} 不是有效 JSON。`, { cause });
  }
}

function safeWorkspaceFile(workspaceRoot, relativePath) {
  const segments = typeof relativePath === "string" ? relativePath.split("/") : [];
  if (typeof relativePath !== "string" || relativePath.length < 1 || relativePath.length > 300
    || relativePath.includes("\0") || relativePath.includes("\\") || relativePath.startsWith("/")
    || path.posix.normalize(relativePath) !== relativePath
    || segments.some((segment) => segment === "" || segment === "." || segment === ".." || segment.includes(":"))) {
    fail("UNSAFE_ARTIFACT_PATH", "吠陀事实要求账文件路径不安全。");
  }
  const root = path.resolve(workspaceRoot);
  const absolute = path.resolve(root, ...segments);
  const relative = path.relative(root, absolute);
  if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    fail("UNSAFE_ARTIFACT_PATH", "吠陀事实要求账文件路径越界。");
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
    if (cause instanceof VedicFactContractRequirementsError) throw cause;
    throw new VedicFactContractRequirementsError(missingCode, `${label} 不存在。`, { cause });
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
    if (cause instanceof VedicFactContractRequirementsError) throw cause;
    throw new VedicFactContractRequirementsError("BOUND_ARTIFACT_UTF8_INVALID", `${label} 不是严格 UTF-8。`, { cause });
  }
}

function canonicalUtc(value) {
  if (typeof value !== "string" || !CANONICAL_UTC_PATTERN.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function exactJson(left, right) {
  return canonicalStringifyVedicFactContractRequirements(left)
    === canonicalStringifyVedicFactContractRequirements(right);
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

function inspectDraftSchemaKeywords(value, label) {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) inspectDraftSchemaKeywords(item, label);
    return;
  }
  if (Object.hasOwn(value, "default") || Object.hasOwn(value, "examples") || Object.hasOwn(value, "example")) {
    fail("DRAFT_SCHEMA_SEMANTIC_MISMATCH", `${label} 不得包含 default 或 example(s)。`);
  }
  if (Object.hasOwn(value, "$ref")
    && (typeof value.$ref !== "string" || !value.$ref.startsWith("#/"))) {
    fail("DRAFT_SCHEMA_SEMANTIC_MISMATCH", `${label} 不得包含外部 $ref。`);
  }
  for (const child of Object.values(value)) inspectDraftSchemaKeywords(child, label);
}

async function verifyInputDraftSchemaSnapshot(workspaceRoot, snapshot) {
  requireExactRawIdentity(snapshot, EXPECTED_INPUT_DRAFT_RAW_IDENTITY, "吠陀输入合同草案");
  let schema;
  try {
    schema = parseVedicInputContractDraftJsonBytes(snapshot.bytes);
  } catch (cause) {
    throw new VedicFactContractRequirementsError(
      typeof cause?.code === "string" ? `INPUT_DRAFT_${cause.code}` : "INPUT_DRAFT_INVALID",
      "吠陀输入合同草案不能严格解析。",
      { cause }
    );
  }
  if (canonicalPrettyStringifyVedicInputContractDraft(schema)
    !== decodeStrictUtf8(snapshot.bytes, "吠陀输入合同草案")) {
    fail("DRAFT_SCHEMA_MATERIALIZATION_MISMATCH", "吠陀输入合同草案不是批准的 canonical materialization。");
  }
  inspectDraftSchemaKeywords(schema, "吠陀输入合同草案");
  const semanticDigest = computeVedicInputContractDraftSemanticDigest(schema);
  let verified;
  try {
    verified = await verifyVedicInputContractDraft(workspaceRoot, schema);
  } catch (cause) {
    throw new VedicFactContractRequirementsError(
      typeof cause?.code === "string" ? `INPUT_DRAFT_${cause.code}` : "INPUT_DRAFT_INVALID",
      "吠陀输入合同草案未通过其当前闭包验证。",
      { cause }
    );
  }
  if (!exactJson(vedicInputContractDraftTestOnly.expectedDraftRawIdentity, EXPECTED_INPUT_DRAFT_RAW_IDENTITY)
    || vedicInputContractDraftTestOnly.expectedSchemaSemanticDigest
      !== EXPECTED_INPUT_DRAFT_SEMANTIC_DIGEST
    || semanticDigest !== EXPECTED_INPUT_DRAFT_SEMANTIC_DIGEST
    || verified.schemaSemanticDigest !== EXPECTED_INPUT_DRAFT_SEMANTIC_DIGEST
    || verified.artifactRole !== "project_authored_isolated_input_contract_draft"
    || verified.schemaStatus !== "isolated_contract_draft"
    || verified.requirementFieldsDefined !== 13
    || verified.requirementsResolved !== 0
    || verified.inputInstancesObserved !== 0
    || verified.inputContractGateSatisfied !== false
    || verified.factReceiptIssued !== false
    || verified.publicReleaseAuthorized !== false) {
    fail("DRAFT_SCHEMA_SEMANTIC_MISMATCH", "吠陀输入合同草案结构或失败关闭边界无效。");
  }
  return Object.freeze({ semanticDigest });
}

function inputRequirementsSemanticIdentityProjection(ledger) {
  return {
    artifactRole: ledger.systemIdentity.artifactRole,
    factReceiptIssued: ledger.authorityBoundary.factReceiptIssued,
    inputContractArtifacts: ledger.zeroInstanceRequirementsReceipt.inputContractArtifacts,
    inputContractGateSatisfied: ledger.requirementInventory.inputContractGateSatisfied,
    inputInstancesObserved: ledger.zeroInstanceRequirementsReceipt.inputInstancesObserved,
    ledgerDigest: ledger.ledgerDigest,
    ledgerId: ledger.ledgerId,
    publicReleaseAuthorized: ledger.authorityBoundary.publicReleaseAuthorized,
    requirementsDraftCovered: ledger.requirementInventory.requirementsDraftCovered,
    requirementsResolved: ledger.requirementInventory.requirementsResolved,
    status: ledger.status,
    successReceiptIssued: ledger.zeroInstanceRequirementsReceipt.successReceiptIssued
  };
}

async function verifyInputRequirementsSnapshot(workspaceRoot, snapshot) {
  requireExactRawIdentity(
    snapshot,
    EXPECTED_INPUT_REQUIREMENTS_RAW_IDENTITY,
    "吠陀输入合同要求账"
  );
  const ledger = parseVedicFactContractRequirementsJsonBytes(
    snapshot.bytes,
    "吠陀输入合同要求账 JSON",
    MAX_BOUND_ARTIFACT_BYTES
  );
  if (canonicalPrettyStringifyVedicFactContractRequirements(ledger)
    !== new TextDecoder("utf-8", { fatal: true }).decode(snapshot.bytes)) {
    fail("INPUT_REQUIREMENTS_MATERIALIZATION_MISMATCH", "吠陀输入合同要求账不是 canonical materialization。");
  }
  let verified;
  try {
    verified = await verifyVedicInputContractRequirementsLedger(workspaceRoot, ledger);
  } catch (cause) {
    throw new VedicFactContractRequirementsError(
      typeof cause?.code === "string" ? `INPUT_REQUIREMENTS_${cause.code}` : "INPUT_REQUIREMENTS_INVALID",
      "吠陀输入合同要求账未通过其当前闭包验证。",
      { cause }
    );
  }
  const projection = inputRequirementsSemanticIdentityProjection(verified.ledger);
  if (projection.artifactRole !== "non_product_governance_requirements_inventory"
    || projection.ledgerId !== "hakimi.vedic.input-contract-requirements/1.0.0"
    || projection.status !== "input_contract_draft_present_zero_instances_not_admitted"
    || projection.requirementsDraftCovered !== 13
    || projection.requirementsResolved !== 0
    || projection.inputContractArtifacts !== 1
    || projection.inputInstancesObserved !== 0
    || projection.inputContractGateSatisfied !== false
    || projection.factReceiptIssued !== false
    || projection.successReceiptIssued !== false
    || projection.publicReleaseAuthorized !== false) {
    fail("INPUT_REQUIREMENTS_SEMANTIC_MISMATCH", "吠陀输入合同要求账边界已漂移。 ");
  }
  return Object.freeze({
    projection,
    semanticDigest: domainSeparatedDigest(INPUT_REQUIREMENTS_SEMANTIC_DIGEST_DOMAIN, projection)
  });
}

async function verifyFactDraftSchemaSnapshot(workspaceRoot, snapshot) {
  requireExactRawIdentity(snapshot, EXPECTED_FACT_DRAFT_RAW_IDENTITY, "吠陀事实合同草案");
  let schema;
  try {
    schema = parseVedicFactContractDraftJsonBytes(snapshot.bytes);
  } catch (cause) {
    throw new VedicFactContractRequirementsError(
      typeof cause?.code === "string" ? `FACT_DRAFT_${cause.code}` : "FACT_DRAFT_INVALID",
      "吠陀事实合同草案不能严格解析。",
      { cause }
    );
  }
  if (canonicalPrettyStringifyVedicFactContractDraft(schema)
    !== decodeStrictUtf8(snapshot.bytes, "吠陀事实合同草案")) {
    fail("FACT_DRAFT_MATERIALIZATION_MISMATCH", "吠陀事实合同草案不是批准的 canonical materialization。");
  }
  inspectDraftSchemaKeywords(schema, "吠陀事实合同草案");
  const semanticDigest = computeVedicFactContractDraftSemanticDigest(schema);
  let verified;
  try {
    verified = await verifyVedicFactContractDraft(workspaceRoot, schema);
  } catch (cause) {
    throw new VedicFactContractRequirementsError(
      typeof cause?.code === "string" ? `FACT_DRAFT_${cause.code}` : "FACT_DRAFT_INVALID",
      "吠陀事实合同草案未通过其当前闭包验证。",
      { cause }
    );
  }
  const expectedFamilyIds = FACT_FAMILY_SPECS.map((entry) => entry.factFamilyId);
  const basis = schema.properties?.basis;
  const mappedBasisPropertyIds = [...new Set(
    PREREQUISITE_SPECS.flatMap((entry) => entry.basisPropertyIds)
  )].sort(compareCodeUnits);
  if (!exactJson(vedicFactContractDraftTestOnly.expectedDraftRawIdentity, EXPECTED_FACT_DRAFT_RAW_IDENTITY)
    || vedicFactContractDraftTestOnly.expectedSchemaSemanticDigest
      !== EXPECTED_FACT_DRAFT_SEMANTIC_DIGEST
    || semanticDigest !== EXPECTED_FACT_DRAFT_SEMANTIC_DIGEST
    || verified.schemaSemanticDigest !== EXPECTED_FACT_DRAFT_SEMANTIC_DIGEST
    || verified.artifactRole !== "project_authored_isolated_fact_contract_draft"
    || verified.schemaStatus !== "isolated_contract_draft"
    || verified.factFamiliesDefined !== FACT_FAMILY_SPECS.length
    || !exactJson(verified.factFamilyIds, expectedFamilyIds)
    || !exactJson(verified.blockedPrerequisiteIds, BLOCKED_PREREQUISITE_IDS)
    || !exactJson(
      vedicFactContractDraftTestOnly.factFamilyBlockedPrerequisiteMap,
      FACT_FAMILY_BLOCKED_PREREQUISITE_MAP
    )
    || !exactJson(basis?.required, BASIS_PROPERTY_IDS)
    || !exactJson(
      Object.keys(basis?.properties ?? {}).sort(compareCodeUnits),
      [...BASIS_PROPERTY_IDS].sort(compareCodeUnits)
    )
    || !exactJson(mappedBasisPropertyIds, [...BASIS_PROPERTY_IDS].sort(compareCodeUnits))
    || verified.requirementsResolved !== 0
    || verified.factInstancesObserved !== 0
    || verified.factGenerationCapability !== false
    || verified.factContractGateSatisfied !== false
    || verified.factReceiptIssued !== false
    || verified.publicReleaseAuthorized !== false) {
    fail("FACT_DRAFT_SEMANTIC_MISMATCH", "吠陀事实合同草案结构或失败关闭边界无效。");
  }
  return Object.freeze({ semanticDigest });
}

function factFamilyMapArtifactRefsForRequirement(requirementId) {
  return FACT_FAMILY_SPECS.flatMap(({ factFamilyId }) => {
    const position = FACT_FAMILY_BLOCKED_PREREQUISITE_MAP[factFamilyId].indexOf(requirementId);
    return position < 0 ? [] : [
      `${VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH}`
        + `#/x-hakimiBoundary/factFamilyBlockedPrerequisiteMap/${factFamilyId}/${position}`
    ];
  });
}

function emptyRequirement(spec, index) {
  const basisArtifactRefs = spec.basisPropertyIds.map((propertyId) =>
    `${VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH}#/properties/basis/properties/${propertyId}`);
  const coveredFactFamilyIds = FACT_FAMILY_SPECS
    .map((entry) => entry.factFamilyId)
    .filter((factFamilyId) =>
      FACT_FAMILY_BLOCKED_PREREQUISITE_MAP[factFamilyId].includes(spec.requirementId));
  const factFamilyMapArtifactRefs = factFamilyMapArtifactRefsForRequirement(spec.requirementId);
  return {
    algorithmBindingRefs: [],
    artifactRefs: [
      `${VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH}#/x-hakimiBoundary/blockedPrerequisiteIds/${index}`,
      ...basisArtifactRefs,
      ...factFamilyMapArtifactRefs
    ],
    basisArtifactRefs,
    coveredFactFamilyIds,
    defaultDefinition: null,
    evidenceRefs: [],
    expertRefs: [],
    factFamilyMapArtifactRefs,
    factValueInstances: [],
    order: index + 1,
    requirementClass: spec.requirementClass,
    requirementId: spec.requirementId,
    requirementState: "named_and_structurally_covered_semantics_unresolved",
    rightsRefs: [],
    selectedDefinition: null,
    sourceRefs: []
  };
}

function factFamilyCoverageEntry(spec, index) {
  return {
    artifactRefs: [
      `${VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH}${spec.schemaPropertyPointer}`,
      `${VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH}#/x-hakimiBoundary/factFamilyIds/${index}`,
      `${VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH}`
        + `#/x-hakimiBoundary/factFamilyBlockedPrerequisiteMap/${spec.factFamilyId}`
    ],
    blockedPrerequisiteIds: [...FACT_FAMILY_BLOCKED_PREREQUISITE_MAP[spec.factFamilyId]],
    factFamilyId: spec.factFamilyId,
    familyState: "draft_shape_covered_prerequisites_semantically_unresolved",
    order: index + 1,
    schemaPropertyPointer: spec.schemaPropertyPointer
  };
}

function factContractArtifactBinding(factDraftSnapshot, factDraftSemantic) {
  return {
    artifactRole: "project_authored_isolated_fact_contract_draft",
    bytes: factDraftSnapshot.size,
    path: VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH,
    rawHashAndSemanticInspectionUseSameBuffer: true,
    schemaSemanticDigest: factDraftSemantic.semanticDigest,
    schemaStatus: "isolated_contract_draft",
    sha256: factDraftSnapshot.sha256
  };
}

export async function buildCurrentVedicFactContractRequirementsLedger(workspaceRoot) {
  const [adrSnapshot, inputDraftSnapshot, inputRequirementsSnapshot, factDraftSnapshot] =
    await Promise.all([
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
          missingCode: "INPUT_DRAFT_SCHEMA_MISSING",
          invalidCode: "INPUT_DRAFT_SCHEMA_ENDPOINT_INVALID",
          label: "吠陀输入合同草案"
        }
      ),
      readStableWorkspaceFile(
        workspaceRoot,
        VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
        MAX_BOUND_ARTIFACT_BYTES,
        {
          missingCode: "INPUT_REQUIREMENTS_MISSING",
          invalidCode: "INPUT_REQUIREMENTS_ENDPOINT_INVALID",
          label: "吠陀输入合同要求账"
        }
      ),
      readStableWorkspaceFile(
        workspaceRoot,
        VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH,
        MAX_BOUND_ARTIFACT_BYTES,
        {
          missingCode: "FACT_DRAFT_SCHEMA_MISSING",
          invalidCode: "FACT_DRAFT_SCHEMA_ENDPOINT_INVALID",
          label: "吠陀事实合同草案"
        }
      )
    ]);
  const adrSemantic = verifyAdrSnapshot(adrSnapshot);
  const inputDraftSemantic = await verifyInputDraftSchemaSnapshot(
    workspaceRoot,
    inputDraftSnapshot
  );
  const inputRequirementsSemantic = await verifyInputRequirementsSnapshot(
    workspaceRoot,
    inputRequirementsSnapshot
  );
  const factDraftSemantic = await verifyFactDraftSchemaSnapshot(
    workspaceRoot,
    factDraftSnapshot
  );
  const requirements = PREREQUISITE_SPECS.map(emptyRequirement);
  const factFamilyCoverage = FACT_FAMILY_SPECS.map(factFamilyCoverageEntry);
  const factContractDraft = factContractArtifactBinding(factDraftSnapshot, factDraftSemantic);
  const unsigned = {
    authorityBoundary: {
      deterministicFactsGateSatisfied: false,
      domainAuthorityAuthorized: false,
      expertClaimsAuthorized: false,
      factContractAccepted: false,
      factReceiptIssued: false,
      formalAdmissionAuthorized: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      releaseReady: false,
      successReceiptIssued: false
    },
    boundaryBindings: {
      bindingDirection:
        "requirements_to_adr_input_draft_input_requirements_and_fact_draft_only",
      chainOrder: [
        VEDIC_BOUNDARY_ADR_RELATIVE_PATH,
        VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH,
        VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
        VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH
      ],
      factContractDraft,
      inputContractDraft: {
        artifactRole: "project_authored_isolated_input_contract_draft",
        bytes: inputDraftSnapshot.size,
        path: VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH,
        rawHashAndSemanticInspectionUseSameBuffer: true,
        schemaSemanticDigest: inputDraftSemantic.semanticDigest,
        schemaStatus: "isolated_contract_draft",
        sha256: inputDraftSnapshot.sha256
      },
      inputContractRequirements: {
        artifactRole: "non_product_governance_requirements_inventory",
        bytes: inputRequirementsSnapshot.size,
        inputContractArtifacts:
          inputRequirementsSemantic.projection.inputContractArtifacts,
        inputContractGateSatisfied:
          inputRequirementsSemantic.projection.inputContractGateSatisfied,
        inputInstancesObserved:
          inputRequirementsSemantic.projection.inputInstancesObserved,
        ledgerDigest: inputRequirementsSemantic.projection.ledgerDigest,
        path: VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
        rawHashAndSemanticInspectionUseSameBuffer: true,
        requirementsDraftCovered:
          inputRequirementsSemantic.projection.requirementsDraftCovered,
        requirementsResolved:
          inputRequirementsSemantic.projection.requirementsResolved,
        semanticDigest: inputRequirementsSemantic.semanticDigest,
        sha256: inputRequirementsSnapshot.sha256,
        status: inputRequirementsSemantic.projection.status
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
        factCandidates: 0,
        factContractArtifacts: 1,
        factFailureReceipts: 0,
        factInstances: 0,
        factProducerInstances: 0,
        factProjectorInstances: 0,
        factReceipts: 0,
        factValueInstances: 0,
        realPersonFactInstances: 0,
        sampleFactInstances: 0,
        successReceipts: 0,
        syntheticPersonFactInstances: 0
      },
      factCandidates: [],
      factContractArtifacts: [factContractDraft],
      factFailureReceipts: [],
      factInstances: [],
      factProducerInstances: [],
      factProjectorInstances: [],
      factReceipts: [],
      factValueInstances: [],
      successReceipts: []
    },
    doesNotEstablish: [...DOES_NOT_ESTABLISH],
    evidenceLedger: {
      browserRuntimeEvidence: "not_assessed",
      contentTruth: "not_established",
      engineeringIdentity:
        "isolated_fact_contract_v0_1_shape_twelve_named_open_prerequisites_and_zero_instances_only",
      expertTruth: "not_established",
      publicReleaseAuthorization: "not_authorized",
      releaseReadiness: "not_ready",
      rightsLegalConclusion: "not_established"
    },
    factFamilyCoverageSummary: {
      artifactRole: "non_requirement_fact_family_coverage_summary",
      factFamiliesDefined: factFamilyCoverage.length,
      factFamiliesDraftCovered: factFamilyCoverage.length,
      families: factFamilyCoverage,
      requirementsUniverseClosed: false
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
      missingOrAmbiguousPrerequisite:
        "block_without_fact_failure_acceptance_or_success_receipt",
      partialFactsPersisted: false,
      placeholderFactsMaterialized: false
    },
    integrityBoundary: {
      authenticityEstablished: false,
      digestAlgorithm: "SHA-256",
      digestDomain: LEDGER_DIGEST_DOMAIN,
      digestIsDigitalSignature: false,
      digitalSignature: null,
      signerIdentity: null
    },
    ledgerId: "hakimi.vedic.fact-contract-requirements/1.0.0",
    observationBoundary: {
      abaExcluded: false,
      boundArtifactHashAndInspectionUseSameReadBuffer: true,
      crossFileAtomicSnapshot: false,
      endpointSnapshotOnly: true,
      factDraftAndRequirementsAtomicSnapshot: false,
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
      factContract: "isolated_contract_draft",
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
    recordType: "vedic_fact_contract_requirements_v1",
    requirementInventory: {
      bindingRequired: null,
      bindingRequirementsInventoryDefined: false,
      factContractArtifactPresent: true,
      factContractGateSatisfied: false,
      inventoryScope: "v0.1_scoped",
      requirements,
      requirementsDraftCovered: requirements.length,
      requirementsDefined: requirements.length,
      requirementsInventoryDefined: true,
      requirementsResolved: 0,
      requirementsUniverseClosed: false
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
    status:
      "fact_contract_draft_present_zero_instances_values_producer_projector_absent_not_admitted",
    systemIdentity: {
      artifactRole: "non_product_governance_fact_requirements_inventory",
      contractSystemId: "vedic",
      productSystemId: "vedic-astrology"
    },
    zeroInstanceRequirementsReceipt: {
      countsTowardAdmission: false,
      factCandidatesObserved: 0,
      factContractArtifacts: 1,
      factContractGateSatisfied: false,
      factFailureReceipts: 0,
      factInstancesObserved: 0,
      factProducerInstances: 0,
      factProjectorInstances: 0,
      factReceiptIssued: false,
      factReceipts: 0,
      factValueInstances: 0,
      receiptClass: "fact_contract_draft_present_zero_instance_observation",
      receiptIsFactReceipt: false,
      receiptIsProductReceipt: false,
      receiptStatus:
        "fact_contract_draft_present_zero_instances_values_producer_projector_absent_not_admitted",
      requirementsDraftCovered: requirements.length,
      requirementsResolved: 0,
      requirementsUniverseClosed: false,
      successReceiptIssued: false,
      successReceipts: 0,
      zeroFailureReceiptsMeansNoExecutionObserved: true
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
  const expectedStatus =
    "fact_contract_draft_present_zero_instances_values_producer_projector_absent_not_admitted";
  if (!canonicalUtc(ledger.createdAt)
    || ledger.createdAt !== LEDGER_CREATED_AT
    || ledger.schemaVersion !== "1.0.0"
    || ledger.recordType !== "vedic_fact_contract_requirements_v1"
    || ledger.ledgerId !== "hakimi.vedic.fact-contract-requirements/1.0.0"
    || ledger.status !== expectedStatus) {
    fail("LEDGER_INVALID", "吠陀事实要求账根身份无效。");
  }

  const inventory = ledger.requirementInventory;
  if (inventory?.requirementsInventoryDefined !== true
    || inventory.inventoryScope !== "v0.1_scoped"
    || inventory.requirementsUniverseClosed !== false
    || inventory.bindingRequirementsInventoryDefined !== false
    || inventory.bindingRequired !== null
    || inventory.factContractArtifactPresent !== true
    || inventory.factContractGateSatisfied !== false
    || inventory.requirementsDefined !== PREREQUISITE_SPECS.length
    || inventory.requirementsDraftCovered !== PREREQUISITE_SPECS.length
    || inventory.requirementsResolved !== 0
    || !Array.isArray(inventory.requirements)
    || inventory.requirements.length !== PREREQUISITE_SPECS.length) {
    fail("REQUIREMENT_INVENTORY_INVALID", "吠陀事实要求清单摘要无效或错误声称闭合宇宙。");
  }
  for (let index = 0; index < PREREQUISITE_SPECS.length; index += 1) {
    const expected = PREREQUISITE_SPECS[index];
    const item = inventory.requirements[index];
    if (!exactJson(item, emptyRequirement(expected, index))) {
      fail("REQUIREMENT_ITEM_INVALID", "吠陀事实要求条目被闭合、选值、填充证据或改变顺序。");
    }
  }

  const expectedFactFamilyCoverage = {
    artifactRole: "non_requirement_fact_family_coverage_summary",
    factFamiliesDefined: FACT_FAMILY_SPECS.length,
    factFamiliesDraftCovered: FACT_FAMILY_SPECS.length,
    families: FACT_FAMILY_SPECS.map(factFamilyCoverageEntry),
    requirementsUniverseClosed: false
  };
  if (!exactJson(ledger.factFamilyCoverageSummary, expectedFactFamilyCoverage)) {
    fail("FACT_FAMILY_COVERAGE_INVALID", "四个事实 family 只能作为独立 shape coverage，不能冒充要求宇宙。");
  }

  const receipt = ledger.zeroInstanceRequirementsReceipt;
  if (receipt?.receiptClass !== "fact_contract_draft_present_zero_instance_observation"
    || receipt.receiptStatus !== expectedStatus
    || receipt.requirementsDraftCovered !== PREREQUISITE_SPECS.length
    || receipt.requirementsResolved !== 0
    || receipt.requirementsUniverseClosed !== false
    || receipt.factContractArtifacts !== 1
    || receipt.factCandidatesObserved !== 0
    || receipt.factInstancesObserved !== 0
    || receipt.factValueInstances !== 0
    || receipt.factProducerInstances !== 0
    || receipt.factProjectorInstances !== 0
    || receipt.factFailureReceipts !== 0
    || receipt.factReceipts !== 0
    || receipt.successReceipts !== 0
    || receipt.zeroFailureReceiptsMeansNoExecutionObserved !== true
    || receipt.factReceiptIssued !== false
    || receipt.successReceiptIssued !== false
    || receipt.receiptIsFactReceipt !== false
    || receipt.receiptIsProductReceipt !== false
    || receipt.countsTowardAdmission !== false
    || receipt.factContractGateSatisfied !== false) {
    fail("ZERO_INSTANCE_RECEIPT_INVALID", "吠陀事实要求零实例观察回执无效。");
  }

  const counts = ledger.currentInstances?.counts;
  if (!counts || counts.factContractArtifacts !== 1
    || Object.entries(counts).some(([key, value]) => key !== "factContractArtifacts" && value !== 0)
    || !allEmptyArrays(ledger.currentInstances, [
      "factCandidates", "factFailureReceipts", "factInstances", "factProducerInstances",
      "factProjectorInstances", "factReceipts", "factValueInstances", "successReceipts"
    ])
    || !exactJson(
      ledger.currentInstances.factContractArtifacts,
      [ledger.boundaryBindings?.factContractDraft]
    )) {
    fail("CURRENT_INSTANCES_INVALID", "吠陀事实要求账不能包含事实、producer、projector 或回执实例。");
  }

  if (!exactJson(ledger.failClosedInvariants, {
    crossSystemFallbackAccepted: false,
    defaultInference: "forbidden",
    generativeModelInference: "forbidden",
    missingOrAmbiguousPrerequisite:
      "block_without_fact_failure_acceptance_or_success_receipt",
    partialFactsPersisted: false,
    placeholderFactsMaterialized: false
  })) {
    fail("FAIL_CLOSED_INVARIANT_INVALID", "吠陀事实要求账 fail-closed 边界无效。");
  }

  if (!exactJson(ledger.productBoundary, {
    domainManifest: "absent",
    factContract: "isolated_contract_draft",
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
    fail("PRODUCT_BOUNDARY_INVALID", "吠陀事实要求账不能借入产品身份、Schema、producer、projector 或规则集。");
  }

  if (!exactJson(ledger.systemIdentity, {
    artifactRole: "non_product_governance_fact_requirements_inventory",
    contractSystemId: "vedic",
    productSystemId: "vedic-astrology"
  })) {
    fail("SYSTEM_IDENTITY_INVALID", "吠陀事实要求账必须保持非产品治理工件身份。");
  }

  if (!exactJson(ledger.evidenceLedger, {
    browserRuntimeEvidence: "not_assessed",
    contentTruth: "not_established",
    engineeringIdentity:
      "isolated_fact_contract_v0_1_shape_twelve_named_open_prerequisites_and_zero_instances_only",
    expertTruth: "not_established",
    publicReleaseAuthorization: "not_authorized",
    releaseReadiness: "not_ready",
    rightsLegalConclusion: "not_established"
  })) {
    fail("EVIDENCE_LEDGER_INVALID", "吠陀事实要求账不得混账工程、内容、专家、权利或发布证据。");
  }

  if (!allFalse(ledger.authorityBoundary)) {
    fail("AUTHORITY_BOUNDARY_INVALID", "吠陀事实要求账不能晋级任何事实、权威或发布状态。");
  }

  const source = ledger.sourceRightsBoundary;
  if (source?.bindingRequirementsInventoryDefined !== false
    || source.bindingRequired !== null
    || source.bindingFrozenVerified !== 0
    || source.sourceBindingEstablished !== false
    || source.licenseEstablished !== false
    || source.rightsEstablished !== false
    || !allEmptyArrays(source, [
      "exactLocatorRefs", "exactQuoteRefs", "licenseEvidenceRefs", "rightsEvidenceRefs",
      "sourceBodyRefs", "sourceCandidateIds"
    ])) {
    fail("SOURCE_RIGHTS_BOUNDARY_INVALID", "吠陀事实要求账不能填充来源、binding、许可或权利证据。");
  }

  const expert = ledger.expertBoundary;
  if (expert?.independentExpertsRequired !== 2
    || expert.independentExpertReviewsVerified !== 0
    || expert.identitiesVerified !== 0
    || expert.credentialsVerified !== 0
    || expert.opinionsVerified !== 0
    || expert.expertReviewBundle !== "absent"
    || expert.expertTruthEstablished !== false
    || !allEmptyArrays(expert, ["expertOpinionIds", "reviewerIds"])) {
    fail("EXPERT_BOUNDARY_INVALID", "吠陀事实要求账不能填充专家实例或专家真值。");
  }

  if (!exactJson(ledger.observationBoundary, {
    abaExcluded: false,
    boundArtifactHashAndInspectionUseSameReadBuffer: true,
    crossFileAtomicSnapshot: false,
    endpointSnapshotOnly: true,
    factDraftAndRequirementsAtomicSnapshot: false,
    heldFileHandleReads: true,
    intervalMutationExcluded: false,
    ledgerHashAndParseUseSameReadBuffer: true,
    mutationEpochAvailable: false,
    mutationEpochReceipt: null,
    pathEndpointRevalidated: true,
    plainDirectoryChainRequired: true
  })) {
    fail("OBSERVATION_BOUNDARY_INVALID", "吠陀事实要求账不能声称 epoch、原子快照或 ABA 排除。");
  }

  if (ledger.integrityBoundary?.digestAlgorithm !== "SHA-256"
    || ledger.integrityBoundary.digestDomain !== LEDGER_DIGEST_DOMAIN
    || ledger.integrityBoundary.digestIsDigitalSignature !== false
    || ledger.integrityBoundary.digitalSignature !== null
    || ledger.integrityBoundary.signerIdentity !== null
    || ledger.integrityBoundary.authenticityEstablished !== false) {
    fail("INTEGRITY_BOUNDARY_INVALID", "吠陀事实要求账 SHA-256 不能冒充签名或真实性。");
  }

  if (!Array.isArray(ledger.doesNotEstablish)
    || !exactJson(ledger.doesNotEstablish, [...DOES_NOT_ESTABLISH])) {
    fail("DOES_NOT_ESTABLISH_INVALID", "吠陀事实要求账否定边界无效。");
  }

  const bindings = ledger.boundaryBindings;
  if (bindings?.bindingDirection
      !== "requirements_to_adr_input_draft_input_requirements_and_fact_draft_only"
    || !exactJson(bindings.chainOrder, [
      VEDIC_BOUNDARY_ADR_RELATIVE_PATH,
      VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH,
      VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
      VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH
    ])
    || bindings.productBoundaryAdr?.rawHashAndSemanticInspectionUseSameBuffer !== true
    || bindings.productBoundaryAdr?.path !== EXPECTED_ADR_RAW_IDENTITY.path
    || bindings.productBoundaryAdr?.bytes !== EXPECTED_ADR_RAW_IDENTITY.bytes
    || bindings.productBoundaryAdr?.sha256 !== EXPECTED_ADR_RAW_IDENTITY.sha256
    || bindings.productBoundaryAdr?.semanticIdentity?.semanticDigest
      !== EXPECTED_ADR_SEMANTIC_DIGEST
    || bindings.inputContractDraft?.rawHashAndSemanticInspectionUseSameBuffer !== true
    || bindings.inputContractDraft?.bytes !== EXPECTED_INPUT_DRAFT_RAW_IDENTITY.bytes
    || bindings.inputContractDraft?.sha256 !== EXPECTED_INPUT_DRAFT_RAW_IDENTITY.sha256
    || bindings.inputContractDraft?.schemaSemanticDigest
      !== EXPECTED_INPUT_DRAFT_SEMANTIC_DIGEST
    || bindings.inputContractRequirements?.rawHashAndSemanticInspectionUseSameBuffer !== true
    || bindings.inputContractRequirements?.bytes !== EXPECTED_INPUT_REQUIREMENTS_RAW_IDENTITY.bytes
    || bindings.inputContractRequirements?.sha256 !== EXPECTED_INPUT_REQUIREMENTS_RAW_IDENTITY.sha256
    || bindings.factContractDraft?.rawHashAndSemanticInspectionUseSameBuffer !== true
    || bindings.factContractDraft?.bytes !== EXPECTED_FACT_DRAFT_RAW_IDENTITY.bytes
    || bindings.factContractDraft?.sha256 !== EXPECTED_FACT_DRAFT_RAW_IDENTITY.sha256
    || bindings.factContractDraft?.schemaSemanticDigest
      !== EXPECTED_FACT_DRAFT_SEMANTIC_DIGEST
    || bindings.inputContractDraft?.path !== VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH
    || bindings.inputContractRequirements?.path !== VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH
    || bindings.factContractDraft?.path !== VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH
    || bindings.inputContractDraft?.schemaStatus !== "isolated_contract_draft"
    || bindings.factContractDraft?.schemaStatus !== "isolated_contract_draft"
    || bindings.inputContractDraft?.artifactRole
      !== "project_authored_isolated_input_contract_draft"
    || bindings.inputContractRequirements?.artifactRole
      !== "non_product_governance_requirements_inventory"
    || bindings.factContractDraft?.artifactRole
      !== "project_authored_isolated_fact_contract_draft") {
    fail("BOUNDARY_BINDING_INVALID", "吠陀事实要求账必须保持只指向批准上游工件的无环边界。");
  }
  const bindingText = canonicalStringifyVedicFactContractRequirements(bindings);
  if (bindingText.includes("vedic-independent-productization-requirements")
    || bindingText.includes("four-system-admission")) {
    fail("PARENT_BACKLINK_FORBIDDEN", "吠陀事实要求账不得回绑 parent 或中央准入账。");
  }

  if (typeof ledger.ledgerDigest !== "string"
    || !SHA256_PATTERN.test(ledger.ledgerDigest)
    || computeVedicFactContractRequirementsDigest(ledger) !== ledger.ledgerDigest) {
    fail("LEDGER_DIGEST_MISMATCH", "吠陀事实要求账 ledgerDigest 无效。");
  }
}

export async function readVedicFactContractRequirementsLedger(workspaceRoot) {
  const snapshot = await readStableWorkspaceFile(
    workspaceRoot,
    VEDIC_FACT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
    MAX_LEDGER_BYTES,
    {
      missingCode: "LEDGER_MISSING",
      invalidCode: "LEDGER_ENDPOINT_INVALID",
      label: "吠陀事实要求账"
    }
  );
  const ledger = parseVedicFactContractRequirementsJsonBytes(snapshot.bytes);
  if (canonicalPrettyStringifyVedicFactContractRequirements(ledger)
    !== new TextDecoder("utf-8", { fatal: true }).decode(snapshot.bytes)) {
    fail("LEDGER_MATERIALIZATION_MISMATCH", "吠陀事实要求账不是 canonical materialization。");
  }
  return ledger;
}

export async function verifyVedicFactContractRequirementsLedger(workspaceRoot, ledgerInput) {
  const ledger = capturePassiveJsonSnapshot(ledgerInput);
  requireStaticFailClosedBoundary(ledger);
  const expected = await buildCurrentVedicFactContractRequirementsLedger(workspaceRoot);
  if (canonicalStringifyVedicFactContractRequirements(ledger)
    !== canonicalStringifyVedicFactContractRequirements(expected)) {
    fail("LEDGER_CURRENT_CLOSURE_MISMATCH", "吠陀事实要求账与当前批准边界不一致。");
  }
  const frozenLedger = deepFreezeJson(capturePassiveJsonSnapshot(ledger));
  return Object.freeze({
    ledger: frozenLedger,
    ledgerDigest: frozenLedger.ledgerDigest,
    status: frozenLedger.status,
    requirementsDraftCovered: frozenLedger.requirementInventory.requirementsDraftCovered,
    requirementsDefined: frozenLedger.requirementInventory.requirementsDefined,
    requirementsResolved: frozenLedger.requirementInventory.requirementsResolved,
    requirementsUniverseClosed: frozenLedger.requirementInventory.requirementsUniverseClosed,
    factContractArtifacts: frozenLedger.zeroInstanceRequirementsReceipt.factContractArtifacts,
    factInstancesObserved: frozenLedger.zeroInstanceRequirementsReceipt.factInstancesObserved,
    factContractGateSatisfied: frozenLedger.requirementInventory.factContractGateSatisfied,
    releaseReady: frozenLedger.authorityBoundary.releaseReady,
    publicReleaseAuthorized: frozenLedger.authorityBoundary.publicReleaseAuthorized
  });
}

export const vedicFactContractRequirementsTestOnly = Object.freeze({
  expectedAdrRawIdentity: EXPECTED_ADR_RAW_IDENTITY,
  expectedFactDraftRawIdentity: EXPECTED_FACT_DRAFT_RAW_IDENTITY,
  expectedFactDraftSemanticDigest: EXPECTED_FACT_DRAFT_SEMANTIC_DIGEST,
  expectedInputDraftRawIdentity: EXPECTED_INPUT_DRAFT_RAW_IDENTITY,
  expectedInputRequirementsRawIdentity: EXPECTED_INPUT_REQUIREMENTS_RAW_IDENTITY,
  basisPropertyIds: BASIS_PROPERTY_IDS,
  prerequisiteBasisPropertyMap: PREREQUISITE_BASIS_PROPERTY_MAP,
  requirementSpecs: PREREQUISITE_SPECS,
  blockedPrerequisiteIds: BLOCKED_PREREQUISITE_IDS,
  factFamilySpecs: FACT_FAMILY_SPECS,
  factFamilyBlockedPrerequisiteMap: FACT_FAMILY_BLOCKED_PREREQUISITE_MAP,
  safeWorkspaceFile
});
