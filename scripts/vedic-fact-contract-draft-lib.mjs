import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { TextDecoder, types as utilTypes } from "node:util";
import { parseExpression } from "@babel/parser";
import {
  canonicalPrettyStringifyVedicInputContractDraft,
  computeVedicInputContractDraftSemanticDigest,
  parseVedicInputContractDraftJsonBytes
} from "./vedic-input-contract-draft-lib.mjs";
import {
  canonicalPrettyStringifyVedicInputContractRequirements,
  computeVedicInputContractRequirementsDigest,
  parseVedicInputContractRequirementsJsonBytes
} from "./vedic-input-contract-requirements-lib.mjs";

export const VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH =
  "content/system-admission/vedic-fact-contract-draft.v0.1.0.schema.json";

const VEDIC_BOUNDARY_ADR_RELATIVE_PATH =
  "docs/吠陀占星独立产品化ADR-0001-2026-08-26.md";
const VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH =
  "content/system-admission/vedic-input-contract-draft.v0.1.0.schema.json";
const VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH =
  "content/system-admission/vedic-input-contract-requirements.v1.json";
const CONTRACT_VERSION = "hakimi.vedic.facts/0.1-draft";
const SCHEMA_ID = "urn:hakimi:vedic:fact-contract-draft:0.1.0";
const SCHEMA_SEMANTIC_DIGEST_DOMAIN = "hakimi.vedic.fact-contract-draft.semantic.v0.1.0";
const ADR_SEMANTIC_DIGEST_DOMAIN = "hakimi.vedic.independent-product-boundary-adr.v1";
const MAX_SCHEMA_BYTES = 1_000_000;
const MAX_BOUND_ARTIFACT_BYTES = 2_000_000;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const TYPED_ARRAY_BYTE_LENGTH_GETTER = Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(Uint8Array.prototype),
  "byteLength"
)?.get;

const EXPECTED_DRAFT_RAW_IDENTITY = Object.freeze({
  bytes: 14_240,
  path: VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH,
  sha256: "6fe875bcb156ae9c7756302e96d902b8c03668e58a8894b33bc0d5fab374a1fe"
});

const EXPECTED_ADR_RAW_IDENTITY = Object.freeze({
  bytes: 4_531,
  path: VEDIC_BOUNDARY_ADR_RELATIVE_PATH,
  sha256: "0e9b81505abb963b4d64426338b8071cd8a211eed8d02fe76065fada335dce63"
});

const EXPECTED_INPUT_DRAFT_RAW_IDENTITY = Object.freeze({
  bytes: 16_529,
  path: VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH,
  sha256: "4899e8fdf267a44e401295f23e11e2504e45f8e2f731c6be9b8ad1435e8dbf69"
});

const EXPECTED_INPUT_REQUIREMENTS_RAW_IDENTITY = Object.freeze({
  bytes: 15_859,
  path: VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
  sha256: "85409d7f4ed7ef6bddc4d34102ecff479fd8dbe4210a78416f90ee705a0f2e59"
});

const EXPECTED_ADR_SEMANTIC_DIGEST =
  "1a71b363132b0d61298f53f7e14eb77d58a3eb3f7d649d8d3c8f42fd1acd1a89";
const EXPECTED_INPUT_DRAFT_SEMANTIC_DIGEST =
  "ad9a1d568d63296d3ed19f30d91cb8f8e52f543afcec03f238178da4af70ee08";
const EXPECTED_INPUT_REQUIREMENTS_LEDGER_DIGEST =
  "e545c254d29902df58e29ca90f965333daca70f06bce03cca62ad9e2f4fc7ac0";
const EXPECTED_SCHEMA_SEMANTIC_DIGEST =
  "0eb3aa460403e42ca5542d1bafb3325d543a0e11429f40b8041f2c1bdf0bc5b1";

const FACT_FAMILY_IDS = Object.freeze([
  "observation_instant_fact",
  "graha_position_facts",
  "lagna_fact",
  "bhava_facts"
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

const FACT_FAMILY_BLOCKED_PREREQUISITE_MAP = Object.freeze({
  bhava_facts: Object.freeze([
    "accepted_input_and_evaluated_candidate_identity",
    "fact_generation_implementation_identity",
    "coordinate_frame_and_numeric_representation_semantics",
    "bhava_definition_geometry_and_assignment_semantics",
    "candidate_transition_provenance_semantics",
    "fact_completeness_uniqueness_and_cross_field_invariants",
    "rejection_channel_and_no_partial_fact_artifact"
  ]),
  graha_position_facts: Object.freeze([
    "accepted_input_and_evaluated_candidate_identity",
    "fact_generation_implementation_identity",
    "coordinate_frame_and_numeric_representation_semantics",
    "graha_catalog_and_position_semantics",
    "rahu_ketu_node_mode_and_position_invariant",
    "rashi_catalog_segmentation_and_boundary_semantics",
    "candidate_transition_provenance_semantics",
    "fact_completeness_uniqueness_and_cross_field_invariants",
    "rejection_channel_and_no_partial_fact_artifact"
  ]),
  lagna_fact: Object.freeze([
    "accepted_input_and_evaluated_candidate_identity",
    "fact_generation_implementation_identity",
    "coordinate_frame_and_numeric_representation_semantics",
    "lagna_definition_and_position_semantics",
    "rashi_catalog_segmentation_and_boundary_semantics",
    "candidate_transition_provenance_semantics",
    "fact_completeness_uniqueness_and_cross_field_invariants",
    "rejection_channel_and_no_partial_fact_artifact"
  ]),
  observation_instant_fact: Object.freeze([
    "accepted_input_and_evaluated_candidate_identity",
    "fact_generation_implementation_identity",
    "observation_instant_and_time_scale_semantics",
    "candidate_transition_provenance_semantics",
    "fact_completeness_uniqueness_and_cross_field_invariants",
    "rejection_channel_and_no_partial_fact_artifact"
  ])
});

const EXCLUDED_UNREVIEWED_CANDIDATE_METHODS = Object.freeze([
  "d9_divisional_chart",
  "d10_divisional_chart",
  "other_divisional_charts",
  "vimshottari_dasha",
  "chara_karaka",
  "shadbala",
  "ashtakavarga"
]);

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

const ADR_REQUIRED_MARKERS = Object.freeze([
  "# ADR-0001：吠陀占星保持独立研究、暂不集成",
  "- 状态：accepted-research-boundary",
  "- productStatus：`research-only`",
  "- integrationStatus：`not-integrated`",
  "- authorityStatus：`not-authoritative`",
  "- publicReleaseAuthorized：`false`",
  "在独立准入门关闭前，不创建占位计算结果、空数据库分区、伪成功回执、用户可点击入口或“综合命运”输出。",
  "任何缺失或歧义都必须结构化阻断，不能由默认值或生成模型补猜。",
  "未来事实和规则必须分别版本化。候选范围至少包括 D1、D9、D10 等分盘、Vimshottari Dasha、Chara Karaka、Shadbala 与 Ashtakavarga；本 ADR 不确认这些方法的具体实现、流派取舍或内容真值。",
  "不得借用八字、紫微或西洋的工程、来源、专家或权利证据为吠陀体系背书。"
]);

const EXPECTED_BOUNDARY = Object.freeze({
  angleRangeOrCoordinateSemanticsEstablished: false,
  artifactRole: "project_authored_isolated_fact_contract_draft",
  authenticityEstablished: false,
  authorityStatus: "not-authoritative",
  authorshipAuthenticityEstablished: false,
  authorshipClaim: "project_authored_clean_room_draft",
  baziArtifactRefs: Object.freeze([]),
  baziAuthorityInherited: false,
  blockedPrerequisiteIds: BLOCKED_PREREQUISITE_IDS,
  boundaryBindings: Object.freeze({
    bindingDirection: "fact_draft_to_adr_input_draft_and_input_requirements_only",
    inputContractDraft: Object.freeze({
      artifactRole: "project_authored_isolated_input_contract_draft",
      bytes: EXPECTED_INPUT_DRAFT_RAW_IDENTITY.bytes,
      path: EXPECTED_INPUT_DRAFT_RAW_IDENTITY.path,
      rawHashAndSemanticInspectionUseSameBuffer: true,
      schemaSemanticDigest: EXPECTED_INPUT_DRAFT_SEMANTIC_DIGEST,
      schemaStatus: "isolated_contract_draft",
      sha256: EXPECTED_INPUT_DRAFT_RAW_IDENTITY.sha256
    }),
    inputContractRequirements: Object.freeze({
      artifactRole: "non_product_governance_requirements_inventory",
      bytes: EXPECTED_INPUT_REQUIREMENTS_RAW_IDENTITY.bytes,
      inputContractGateSatisfied: false,
      ledgerDigest: EXPECTED_INPUT_REQUIREMENTS_LEDGER_DIGEST,
      path: EXPECTED_INPUT_REQUIREMENTS_RAW_IDENTITY.path,
      rawHashAndSemanticInspectionUseSameBuffer: true,
      requirementsResolved: 0,
      sha256: EXPECTED_INPUT_REQUIREMENTS_RAW_IDENTITY.sha256,
      status: "input_contract_draft_present_zero_instances_not_admitted"
    }),
    productBoundaryAdr: Object.freeze({
      bytes: EXPECTED_ADR_RAW_IDENTITY.bytes,
      path: EXPECTED_ADR_RAW_IDENTITY.path,
      rawHashAndSemanticInspectionUseSameBuffer: true,
      semanticDigest: EXPECTED_ADR_SEMANTIC_DIGEST,
      sha256: EXPECTED_ADR_RAW_IDENTITY.sha256
    })
  }),
  canonicalQuantityEncodingScope: "v0.1_nonnegative_decimal_text_shape_only",
  comparisonIncluded: false,
  countsTowardAdmission: false,
  deterministicFactsGateSatisfied: false,
  domainAuthorityAuthorized: false,
  excludedUnreviewedCandidateMethods: EXCLUDED_UNREVIEWED_CANDIDATE_METHODS,
  expertClaimsAuthorized: false,
  externalSourceRefs: Object.freeze([]),
  factContractGateSatisfied: false,
  factFamilyBlockedPrerequisiteMap: FACT_FAMILY_BLOCKED_PREREQUISITE_MAP,
  factFamilyIds: FACT_FAMILY_IDS,
  factGenerationCapability: false,
  factInstancesIncluded: 0,
  factReceiptCapability: false,
  factReceiptIssued: false,
  formalAdmissionAuthorized: false,
  inputAcceptanceReceiptIssued: false,
  inputContractGateSatisfied: false,
  integrationStatus: "not-integrated",
  methodSelectionsIncluded: 0,
  observationBoundary: Object.freeze({
    abaExcluded: false,
    crossFileAtomicSnapshot: false,
    heldFileHandleReads: true,
    intervalMutationExcluded: false,
    mutationEpochAvailable: false,
    mutationEpochReceipt: null,
    pathEndpointRevalidated: true,
    plainDirectoryChainRequired: true,
    schemaHashAndParseUseSameReadBuffer: true,
    upstreamArtifactHashAndInspectionUseSameReadBuffer: true
  }),
  productStatus: "research-only",
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  releaseReady: false,
  requirementSelectionsIncluded: 0,
  requirementsResolved: 0,
  rightsEstablished: false,
  schemaStatus: "isolated_contract_draft",
  sourceBindingEstablished: false,
  structuralPrecheckCountsAsFactValidation: false,
  structuralPrecheckOnly: true
});

export class VedicFactContractDraftError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "VedicFactContractDraftError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new VedicFactContractDraftError(code, message);
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function capturePassiveJsonValue(value, state, depth) {
  if (depth > 96) fail("INPUT_DEPTH_EXCEEDED", "吠陀事实合同草案对象超过最大深度。");
  state.nodes += 1;
  if (state.nodes > 200_000) fail("INPUT_NODE_LIMIT_EXCEEDED", "吠陀事实合同草案对象超过节点上限。");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      fail("INPUT_VALUE_INVALID", "吠陀事实合同草案对象含非规范 JSON 数值。");
    }
    return value;
  }
  if (typeof value === "string") {
    state.textCharacters += value.length;
    if (state.textCharacters > 2_000_000) fail("INPUT_TEXT_LIMIT_EXCEEDED", "吠陀事实合同草案文本超过上限。");
    return value;
  }
  if (typeof value !== "object") fail("INPUT_VALUE_INVALID", "吠陀事实合同草案对象 API 只接受 JSON 值。");
  if (utilTypes.isProxy(value)) fail("INPUT_PROXY_FORBIDDEN", "吠陀事实合同草案对象 API 不接受 Proxy。");
  if (state.active.has(value)) fail("INPUT_CYCLE_FORBIDDEN", "吠陀事实合同草案对象 API 不接受循环引用。");
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
      throw new VedicFactContractDraftError("INPUT_OBJECT_UNSAFE", "无法安全捕获吠陀事实合同草案对象。", { cause });
    }
    const descriptorKeys = Reflect.ownKeys(descriptors);
    if (descriptorKeys.some((key) => typeof key === "symbol")) {
      fail("INPUT_SYMBOL_FORBIDDEN", "吠陀事实合同草案对象 API 不接受 Symbol 属性。");
    }
    if (array) {
      if (prototype !== Array.prototype) fail("INPUT_PROTOTYPE_INVALID", "吠陀事实合同草案数组原型无效。");
      const lengthDescriptor = descriptors.length;
      const length = lengthDescriptor?.value;
      if (lengthDescriptor?.get || lengthDescriptor?.set
        || !Number.isSafeInteger(length) || length < 0 || length > 200_000) {
        fail("INPUT_ARRAY_INVALID", "吠陀事实合同草案数组长度无效。");
      }
      const allowedKeys = new Set(["length", ...Array.from({ length }, (_entry, index) => String(index))]);
      if (descriptorKeys.some((key) => !allowedKeys.has(key))) {
        fail("INPUT_ARRAY_INVALID", "吠陀事实合同草案数组含额外属性。");
      }
      const result = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
          fail("INPUT_ARRAY_INVALID", "吠陀事实合同草案对象 API 不接受稀疏数组或访问器元素。");
        }
        result.push(capturePassiveJsonValue(descriptor.value, state, depth + 1));
      }
      return result;
    }
    if (prototype !== Object.prototype) fail("INPUT_PROTOTYPE_INVALID", "吠陀事实合同草案只接受普通 JSON 对象。");
    const entries = [];
    for (const key of descriptorKeys) {
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
        fail("INPUT_ACCESSOR_FORBIDDEN", "吠陀事实合同草案对象 API 不接受访问器或不可枚举字段。");
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
  fail("NON_CANONICAL_JSON", "吠陀事实合同草案只接受有限规范 JSON 值。");
}

export function canonicalStringifyVedicFactContractDraft(value) {
  return JSON.stringify(canonicalValue(capturePassiveJsonSnapshot(value)));
}

export function canonicalPrettyStringifyVedicFactContractDraft(value) {
  return `${JSON.stringify(canonicalValue(capturePassiveJsonSnapshot(value)), null, 2)}\n`;
}

function domainSeparatedDigest(domain, value) {
  return createHash("sha256")
    .update(domain, "utf8")
    .update("\0", "utf8")
    .update(canonicalStringifyVedicFactContractDraft(value), "utf8")
    .digest("hex");
}

function semanticProjection(schema) {
  return {
    definitions: schema.$defs,
    boundary: schema["x-hakimiBoundary"],
    contractVersion: schema.properties?.contractVersion?.const,
    properties: schema.properties,
    required: schema.required,
    rootAdditionalProperties: schema.additionalProperties,
    rootType: schema.type,
    schemaId: schema.$id,
    schemaStandard: schema.$schema,
    systemId: schema.properties?.systemId?.const,
    title: schema.title
  };
}

export function computeVedicFactContractDraftSemanticDigest(schemaInput) {
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

export function parseVedicFactContractDraftJsonBytes(
  bytes,
  label = "吠陀事实合同草案 JSON",
  maxBytes = MAX_SCHEMA_BYTES
) {
  if (utilTypes.isProxy(bytes) || !utilTypes.isUint8Array(bytes)
    || typeof TYPED_ARRAY_BYTE_LENGTH_GETTER !== "function") {
    fail("JSON_INVALID", `${label} 必须是被动可检验的 Uint8Array 字节。`);
  }
  let byteLength;
  try {
    byteLength = Reflect.apply(TYPED_ARRAY_BYTE_LENGTH_GETTER, bytes, []);
  } catch (cause) {
    throw new VedicFactContractDraftError("JSON_INVALID", `${label} 的字节内建身份无效。`, { cause });
  }
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0 || byteLength > maxBytes) {
    fail("JSON_TOO_LARGE", `${label} 超过输入上限。`);
  }
  if (byteLength >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail("JSON_BOM_FORBIDDEN", `${label} 不得包含 UTF-8 BOM。`);
  }
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (cause) {
    throw new VedicFactContractDraftError("JSON_UTF8_INVALID", `${label} 不是严格 UTF-8。`, { cause });
  }
  if (!source.trim()) fail("JSON_INVALID", `${label} 为空。`);
  let expression;
  try {
    expression = parseExpression(source.trim(), {
      attachComment: false,
      errorRecovery: false,
      sourceFilename: "vedic-fact-contract-draft.json",
      sourceType: "script"
    });
  } catch (cause) {
    throw new VedicFactContractDraftError("JSON_INVALID", `${label} 不能按严格 JSON 检查。`, { cause });
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
    if (cause instanceof VedicFactContractDraftError) throw cause;
    throw new VedicFactContractDraftError("JSON_INVALID", `${label} 不是有效 JSON。`, { cause });
  }
}

function safeWorkspaceFile(workspaceRoot, relativePath) {
  const segments = typeof relativePath === "string" ? relativePath.split("/") : [];
  if (typeof relativePath !== "string" || relativePath.length < 1 || relativePath.length > 300
    || relativePath.includes("\0") || relativePath.includes("\\") || relativePath.startsWith("/")
    || path.posix.normalize(relativePath) !== relativePath
    || segments.some((segment) => segment === "" || segment === "." || segment === ".." || segment.includes(":"))) {
    fail("UNSAFE_ARTIFACT_PATH", "吠陀事实合同草案路径不安全。");
  }
  const root = path.resolve(workspaceRoot);
  const absolute = path.resolve(root, ...segments);
  const relative = path.relative(root, absolute);
  if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    fail("UNSAFE_ARTIFACT_PATH", "吠陀事实合同草案路径越界。");
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
    if (cause instanceof VedicFactContractDraftError) throw cause;
    throw new VedicFactContractDraftError(missingCode, `${label} 不存在。`, { cause });
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
    if (cause instanceof VedicFactContractDraftError) throw cause;
    throw new VedicFactContractDraftError("BOUND_ARTIFACT_UTF8_INVALID", `${label} 不是严格 UTF-8。`, { cause });
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
  const semanticDigest = domainSeparatedDigest(ADR_SEMANTIC_DIGEST_DOMAIN, ADR_SEMANTIC_IDENTITY);
  if (semanticDigest !== EXPECTED_ADR_SEMANTIC_DIGEST) {
    fail("ADR_SEMANTIC_MISMATCH", "吠陀产品边界 ADR 语义身份漂移。");
  }
  return semanticDigest;
}

function verifyInputDraftSnapshot(snapshot) {
  requireExactRawIdentity(snapshot, EXPECTED_INPUT_DRAFT_RAW_IDENTITY, "吠陀输入合同草案");
  let schema;
  try {
    schema = parseVedicInputContractDraftJsonBytes(snapshot.bytes);
  } catch (cause) {
    throw new VedicFactContractDraftError("INPUT_DRAFT_INVALID", "吠陀输入合同草案不能严格解析。", { cause });
  }
  const source = decodeStrictUtf8(snapshot.bytes, "吠陀输入合同草案");
  if (source !== canonicalPrettyStringifyVedicInputContractDraft(schema)) {
    fail("INPUT_DRAFT_MATERIALIZATION_MISMATCH", "吠陀输入合同草案不是 canonical materialization。");
  }
  const semanticDigest = computeVedicInputContractDraftSemanticDigest(schema);
  if (semanticDigest !== EXPECTED_INPUT_DRAFT_SEMANTIC_DIGEST
    || schema["x-hakimiBoundary"]?.schemaStatus !== "isolated_contract_draft"
    || schema["x-hakimiBoundary"]?.artifactRole !== "project_authored_isolated_input_contract_draft"
    || schema["x-hakimiBoundary"]?.inputContractGateSatisfied !== false
    || schema["x-hakimiBoundary"]?.requirementsResolved !== 0) {
    fail("INPUT_DRAFT_SEMANTIC_MISMATCH", "吠陀输入合同草案未保持未准入零选择边界。");
  }
  return semanticDigest;
}

function verifyInputRequirementsSnapshot(snapshot) {
  requireExactRawIdentity(snapshot, EXPECTED_INPUT_REQUIREMENTS_RAW_IDENTITY, "吠陀输入合同要求账");
  let ledger;
  try {
    ledger = parseVedicInputContractRequirementsJsonBytes(snapshot.bytes);
  } catch (cause) {
    throw new VedicFactContractDraftError("INPUT_REQUIREMENTS_INVALID", "吠陀输入合同要求账不能严格解析。", { cause });
  }
  const source = decodeStrictUtf8(snapshot.bytes, "吠陀输入合同要求账");
  if (source !== canonicalPrettyStringifyVedicInputContractRequirements(ledger)) {
    fail("INPUT_REQUIREMENTS_MATERIALIZATION_MISMATCH", "吠陀输入合同要求账不是 canonical materialization。");
  }
  if (ledger.ledgerDigest !== EXPECTED_INPUT_REQUIREMENTS_LEDGER_DIGEST
    || computeVedicInputContractRequirementsDigest(ledger) !== EXPECTED_INPUT_REQUIREMENTS_LEDGER_DIGEST
    || ledger.status !== "input_contract_draft_present_zero_instances_not_admitted"
    || ledger.systemIdentity?.artifactRole !== "non_product_governance_requirements_inventory"
    || ledger.requirementInventory?.requirementsResolved !== 0
    || ledger.requirementInventory?.inputContractGateSatisfied !== false
    || ledger.zeroInstanceRequirementsReceipt?.inputInstancesObserved !== 0
    || ledger.zeroInstanceRequirementsReceipt?.factReceiptIssued !== false) {
    fail("INPUT_REQUIREMENTS_SEMANTIC_MISMATCH", "吠陀输入合同要求账未保持零实例未准入状态。");
  }
  return ledger.ledgerDigest;
}

function exactJson(left, right) {
  return canonicalStringifyVedicFactContractDraft(left) === canonicalStringifyVedicFactContractDraft(right);
}

function walkJson(value, visitor, pathSegments = []) {
  visitor(value, pathSegments);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walkJson(entry, visitor, [...pathSegments, index]));
  } else if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) walkJson(entry, visitor, [...pathSegments, key]);
  }
}

function requireExactReference(branch, expectedDefinition, label) {
  if (!exactJson(branch, { $ref: `#/$defs/${expectedDefinition}` })) {
    fail("SCHEMA_REFERENCE_INVALID", `${label} 必须只引用本草案的 ${expectedDefinition}。`);
  }
}

function requireStaticDraftBoundary(schema) {
  const expectedRootKeys = [
    "$defs", "$id", "$schema", "additionalProperties", "properties", "required", "title", "type", "x-hakimiBoundary"
  ];
  if (!schema || typeof schema !== "object" || Array.isArray(schema)
    || !exactJson(Object.keys(schema).sort(compareCodeUnits), expectedRootKeys.sort(compareCodeUnits))
    || schema.$id !== SCHEMA_ID || schema.$schema !== "https://json-schema.org/draft/2020-12/schema"
    || schema.title !== "Hakimi Vedic fact contract draft 0.1.0"
    || schema.type !== "object" || schema.additionalProperties !== false) {
    fail("SCHEMA_IDENTITY_INVALID", "吠陀事实合同草案根身份无效。");
  }

  const expectedRequired = [
    "contractVersion", "systemId", "factSetId", "basis", "observationInstantFact",
    "grahaPositionFacts", "lagnaFact", "bhavaFacts"
  ];
  const expectedProperties = [...expectedRequired].sort(compareCodeUnits);
  if (!exactJson(schema.required, expectedRequired)
    || !schema.properties
    || !exactJson(Object.keys(schema.properties).sort(compareCodeUnits), expectedProperties)
    || schema.properties.contractVersion?.const !== CONTRACT_VERSION
    || schema.properties.systemId?.const !== "vedic") {
    fail("FACT_FIELD_SET_INVALID", "吠陀事实合同草案字段集合无效。");
  }

  const expectedDefinitions = [
    "canonicalQuantity", "identityReference", "positionFact", "rashiSegmentReference"
  ];
  if (!schema.$defs || !exactJson(Object.keys(schema.$defs).sort(compareCodeUnits), expectedDefinitions)) {
    fail("SCHEMA_DEFINITION_SET_INVALID", "吠陀事实合同草案定义集合无效。");
  }

  const basisRequired = [
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
  ];
  const basis = schema.properties.basis;
  if (basis?.type !== "object" || basis.additionalProperties !== false
    || !exactJson(basis.required, basisRequired)
    || !exactJson(Object.keys(basis.properties ?? {}).sort(compareCodeUnits), [...basisRequired].sort(compareCodeUnits))) {
    fail("BASIS_FIELD_SET_INVALID", "吠陀事实合同草案 basis 必须精确声明全部未决引用槽。");
  }
  for (const key of basisRequired) requireExactReference(basis.properties[key], "identityReference", `basis.${key}`);

  if (schema.properties.grahaPositionFacts?.type !== "array"
    || schema.properties.grahaPositionFacts.minItems !== 1
    || schema.properties.bhavaFacts?.properties?.boundaries?.minItems !== 1
    || schema.properties.bhavaFacts?.properties?.subject_assignments?.minItems !== 1) {
    fail("EMPTY_FACT_SHAPE_FORBIDDEN", "吠陀事实合同草案不能表达空事实族。");
  }
  requireExactReference(schema.properties.grahaPositionFacts.items, "positionFact", "grahaPositionFacts.items");
  requireExactReference(schema.properties.lagnaFact, "positionFact", "lagnaFact");

  const forbiddenTerms = ["success", "computed", "outcome", "producer", "projector"];
  const constPaths = [];
  walkJson(schema, (value, pathSegments) => {
    if (typeof value === "string") {
      const lowered = value.toLowerCase();
      if (forbiddenTerms.some((term) => lowered.includes(term))) {
        fail("SCHEMA_PREMATURE_SEMANTIC_FORBIDDEN", "吠陀事实合同草案含提前事实化或实现身份语义。");
      }
      return;
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    for (const key of Object.keys(value)) {
      const lowered = key.toLowerCase();
      if (["default", "example", "examples"].includes(lowered)) {
        fail("SCHEMA_DEFAULT_OR_EXAMPLE_FORBIDDEN", "吠陀事实合同草案不得携带 default 或 example。");
      }
      if (forbiddenTerms.some((term) => lowered.includes(term))) {
        fail("SCHEMA_PREMATURE_SEMANTIC_FORBIDDEN", "吠陀事实合同草案含提前事实化或实现身份语义。");
      }
    }
    if (Object.hasOwn(value, "enum")) {
      fail("SCHEMA_METHOD_ENUM_FORBIDDEN", "吠陀事实合同草案不得枚举未审定体系取值。");
    }
    if (Object.hasOwn(value, "const")) constPaths.push(pathSegments.join("."));
    if (Object.hasOwn(value, "$ref")) {
      if (typeof value.$ref !== "string" || !value.$ref.startsWith("#/$defs/")
        || !expectedDefinitions.includes(value.$ref.slice("#/$defs/".length))) {
        fail("SCHEMA_EXTERNAL_REF_FORBIDDEN", "吠陀事实合同草案不得引用外部或未知 schema。");
      }
    }
    if (value.type === "object" && value.additionalProperties !== false) {
      fail("SCHEMA_OBJECT_OPEN", "吠陀事实合同草案所有实例对象必须 additionalProperties=false。");
    }
  });
  if (!exactJson(constPaths.sort(compareCodeUnits), ["properties.contractVersion", "properties.systemId"])) {
    fail("SCHEMA_VALUE_SELECTION_FORBIDDEN", "吠陀事实合同草案除合同与体系身份外不得固定实例取值。");
  }

  if (!exactJson(schema["x-hakimiBoundary"], EXPECTED_BOUNDARY)) {
    fail("BOUNDARY_PROMOTED", "吠陀事实合同草案被提升为事实、权威、实现或发布能力。");
  }
  const digest = computeVedicFactContractDraftSemanticDigest(schema);
  if (!SHA256_PATTERN.test(digest) || digest !== EXPECTED_SCHEMA_SEMANTIC_DIGEST) {
    fail("SCHEMA_SEMANTIC_DIGEST_MISMATCH", "吠陀事实合同草案语义摘要漂移。");
  }
}

async function readDraftSnapshot(workspaceRoot) {
  const snapshot = await readStableWorkspaceFile(
    workspaceRoot,
    VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH,
    MAX_SCHEMA_BYTES,
    { invalidCode: "SCHEMA_ENDPOINT_INVALID", label: "吠陀事实合同草案", missingCode: "SCHEMA_MISSING" }
  );
  requireExactRawIdentity(snapshot, EXPECTED_DRAFT_RAW_IDENTITY, "吠陀事实合同草案");
  const schema = parseVedicFactContractDraftJsonBytes(snapshot.bytes);
  const source = decodeStrictUtf8(snapshot.bytes, "吠陀事实合同草案");
  if (source !== canonicalPrettyStringifyVedicFactContractDraft(schema)) {
    fail("SCHEMA_MATERIALIZATION_MISMATCH", "吠陀事实合同草案不是 canonical materialization。");
  }
  return Object.freeze({ schema, snapshot });
}

export async function buildCurrentVedicFactContractDraft(workspaceRoot) {
  const [draft, adrSnapshot, inputDraftSnapshot, inputRequirementsSnapshot] = await Promise.all([
    readDraftSnapshot(workspaceRoot),
    readStableWorkspaceFile(
      workspaceRoot,
      VEDIC_BOUNDARY_ADR_RELATIVE_PATH,
      MAX_BOUND_ARTIFACT_BYTES,
      { invalidCode: "ADR_ENDPOINT_INVALID", label: "吠陀产品边界 ADR", missingCode: "ADR_MISSING" }
    ),
    readStableWorkspaceFile(
      workspaceRoot,
      VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH,
      MAX_BOUND_ARTIFACT_BYTES,
      { invalidCode: "INPUT_DRAFT_ENDPOINT_INVALID", label: "吠陀输入合同草案", missingCode: "INPUT_DRAFT_MISSING" }
    ),
    readStableWorkspaceFile(
      workspaceRoot,
      VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
      MAX_BOUND_ARTIFACT_BYTES,
      {
        invalidCode: "INPUT_REQUIREMENTS_ENDPOINT_INVALID",
        label: "吠陀输入合同要求账",
        missingCode: "INPUT_REQUIREMENTS_MISSING"
      }
    )
  ]);
  const upstreamIdentities = {
    inputContractDraftSemanticDigest: verifyInputDraftSnapshot(inputDraftSnapshot),
    inputContractRequirementsLedgerDigest: verifyInputRequirementsSnapshot(inputRequirementsSnapshot),
    productBoundaryAdrSemanticDigest: verifyAdrSnapshot(adrSnapshot)
  };
  requireStaticDraftBoundary(draft.schema);
  return deepFreezeJson({
    rawIdentity: {
      bytes: draft.snapshot.size,
      path: VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH,
      sha256: draft.snapshot.sha256
    },
    schema: draft.schema,
    schemaSemanticDigest: computeVedicFactContractDraftSemanticDigest(draft.schema),
    upstreamIdentities
  });
}

export async function readVedicFactContractDraft(workspaceRoot) {
  const { schema } = await readDraftSnapshot(workspaceRoot);
  return schema;
}

export async function verifyVedicFactContractDraft(workspaceRoot, schemaInput) {
  const schema = capturePassiveJsonSnapshot(schemaInput);
  requireStaticDraftBoundary(schema);
  const current = await buildCurrentVedicFactContractDraft(workspaceRoot);
  if (canonicalStringifyVedicFactContractDraft(schema) !== canonicalStringifyVedicFactContractDraft(current.schema)) {
    fail("SCHEMA_CURRENT_CLOSURE_MISMATCH", "吠陀事实合同草案与当前批准的上游闭包不一致。");
  }
  const frozenSchema = deepFreezeJson(capturePassiveJsonSnapshot(schema));
  return deepFreezeJson({
    artifactRole: frozenSchema["x-hakimiBoundary"].artifactRole,
    blockedPrerequisiteIds: frozenSchema["x-hakimiBoundary"].blockedPrerequisiteIds,
    countsTowardAdmission: false,
    deterministicFactsGateSatisfied: false,
    factContractGateSatisfied: false,
    factFamiliesDefined: FACT_FAMILY_IDS.length,
    factFamilyIds: FACT_FAMILY_IDS,
    factGenerationCapability: false,
    factInstancesObserved: 0,
    factReceiptIssued: false,
    formalAdmissionAuthorized: false,
    inputAcceptanceReceiptIssued: false,
    inputContractGateSatisfied: false,
    methodSelectionsIncluded: 0,
    publicReleaseAuthorized: false,
    releaseReady: false,
    requirementSelectionsIncluded: 0,
    requirementsResolved: 0,
    schema: frozenSchema,
    schemaSemanticDigest: current.schemaSemanticDigest,
    schemaStatus: frozenSchema["x-hakimiBoundary"].schemaStatus,
    structuralPrecheckOnly: true,
    structuralPrecheckPassed: true,
    upstreamIdentities: current.upstreamIdentities
  });
}

export const vedicFactContractDraftTestOnly = Object.freeze({
  blockedPrerequisiteIds: BLOCKED_PREREQUISITE_IDS,
  contractVersion: CONTRACT_VERSION,
  excludedUnreviewedCandidateMethods: EXCLUDED_UNREVIEWED_CANDIDATE_METHODS,
  expectedAdrRawIdentity: EXPECTED_ADR_RAW_IDENTITY,
  expectedDraftRawIdentity: EXPECTED_DRAFT_RAW_IDENTITY,
  expectedInputDraftRawIdentity: EXPECTED_INPUT_DRAFT_RAW_IDENTITY,
  expectedInputRequirementsRawIdentity: EXPECTED_INPUT_REQUIREMENTS_RAW_IDENTITY,
  expectedSchemaSemanticDigest: EXPECTED_SCHEMA_SEMANTIC_DIGEST,
  factFamilyBlockedPrerequisiteMap: FACT_FAMILY_BLOCKED_PREREQUISITE_MAP,
  factFamilyIds: FACT_FAMILY_IDS,
  safeWorkspaceFile
});
