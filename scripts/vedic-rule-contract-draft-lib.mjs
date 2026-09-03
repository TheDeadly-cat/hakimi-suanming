import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { TextDecoder, types as utilTypes } from "node:util";
import { parseExpression } from "@babel/parser";
import {
  canonicalPrettyStringifyVedicInputContractDraft,
  computeVedicInputContractDraftSemanticDigest,
  parseVedicInputContractDraftJsonBytes,
  verifyVedicInputContractDraft
} from "./vedic-input-contract-draft-lib.mjs";
import {
  canonicalPrettyStringifyVedicInputContractRequirements,
  computeVedicInputContractRequirementsDigest,
  parseVedicInputContractRequirementsJsonBytes,
  verifyVedicInputContractRequirementsLedger
} from "./vedic-input-contract-requirements-lib.mjs";
import {
  canonicalPrettyStringifyVedicFactContractDraft,
  computeVedicFactContractDraftSemanticDigest,
  parseVedicFactContractDraftJsonBytes,
  verifyVedicFactContractDraft
} from "./vedic-fact-contract-draft-lib.mjs";
import {
  canonicalPrettyStringifyVedicFactContractRequirements,
  computeVedicFactContractRequirementsDigest,
  parseVedicFactContractRequirementsJsonBytes,
  verifyVedicFactContractRequirementsLedger
} from "./vedic-fact-contract-requirements-lib.mjs";

export const VEDIC_RULE_CONTRACT_DRAFT_RELATIVE_PATH =
  "content/system-admission/vedic-rule-contract-draft.v0.1.0.schema.json";

const VEDIC_BOUNDARY_ADR_RELATIVE_PATH =
  "docs/吠陀占星独立产品化ADR-0001-2026-08-26.md";
const VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH =
  "content/system-admission/vedic-input-contract-draft.v0.1.0.schema.json";
const VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH =
  "content/system-admission/vedic-input-contract-requirements.v1.json";
const VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH =
  "content/system-admission/vedic-fact-contract-draft.v0.1.0.schema.json";
const VEDIC_FACT_CONTRACT_REQUIREMENTS_RELATIVE_PATH =
  "content/system-admission/vedic-fact-contract-requirements.v1.json";
const CONTRACT_VERSION = "hakimi.vedic.rule-contract/0.1-draft";
const SCHEMA_ID = "urn:hakimi:vedic:rule-contract-draft:0.1.0";
const SCHEMA_SEMANTIC_DIGEST_DOMAIN =
  "hakimi.vedic.rule-contract-draft.semantic.v0.1.0";
const ADR_SEMANTIC_DIGEST_DOMAIN =
  "hakimi.vedic.independent-product-boundary-adr.v1";
const MAX_SCHEMA_BYTES = 1_000_000;
const MAX_BOUND_ARTIFACT_BYTES = 2_000_000;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const TYPED_ARRAY_PROTOTYPE = Object.getPrototypeOf(Uint8Array.prototype);
const TYPED_ARRAY_BYTE_LENGTH_GETTER =
  Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "byteLength")?.get;
const TYPED_ARRAY_BUFFER_GETTER =
  Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "buffer")?.get;
const ARRAY_BUFFER_RESIZABLE_GETTER =
  Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "resizable")?.get;
const UINT8_ARRAY_SET = Uint8Array.prototype.set;

const EXPECTED_DRAFT_RAW_IDENTITY = Object.freeze({
  bytes: 12_140,
  path: VEDIC_RULE_CONTRACT_DRAFT_RELATIVE_PATH,
  sha256: "1b0f118d5014aa8de0ab85bd756b710252565d643a5164ee88a7418d4a002f0d"
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

const EXPECTED_FACT_DRAFT_RAW_IDENTITY = Object.freeze({
  bytes: 14_240,
  path: VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH,
  sha256: "6fe875bcb156ae9c7756302e96d902b8c03668e58a8894b33bc0d5fab374a1fe"
});

const EXPECTED_FACT_REQUIREMENTS_RAW_IDENTITY = Object.freeze({
  bytes: 42_634,
  path: VEDIC_FACT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
  sha256: "a20a1033ce063702548a79b6a651d21421e9f59a9a2ecd4da251cde42ae36b38"
});

const EXPECTED_ADR_SEMANTIC_DIGEST =
  "1a71b363132b0d61298f53f7e14eb77d58a3eb3f7d649d8d3c8f42fd1acd1a89";
const EXPECTED_INPUT_DRAFT_SEMANTIC_DIGEST =
  "ad9a1d568d63296d3ed19f30d91cb8f8e52f543afcec03f238178da4af70ee08";
const EXPECTED_INPUT_REQUIREMENTS_LEDGER_DIGEST =
  "e545c254d29902df58e29ca90f965333daca70f06bce03cca62ad9e2f4fc7ac0";
const EXPECTED_FACT_DRAFT_SEMANTIC_DIGEST =
  "0eb3aa460403e42ca5542d1bafb3325d543a0e11429f40b8041f2c1bdf0bc5b1";
const EXPECTED_FACT_REQUIREMENTS_LEDGER_DIGEST =
  "a33eeee2652559faa0f83c404980ec78acc6dc94be3f6476f25b0e8fdd5eb6b8";
const EXPECTED_SCHEMA_SEMANTIC_DIGEST =
  "3491132c1c5081eac5bb76f6fe1d67400da954ace73546589f34322dd11ae3f3";

const BLOCKED_PREREQUISITE_IDS = Object.freeze([
  "admitted_fact_contract_and_deterministic_fact_instances",
  "rule_school_identity_scope_and_lineage_semantics",
  "rule_applicability_condition_semantics",
  "rule_conflict_declaration_and_resolution_semantics",
  "rule_counterexample_model_and_retention_semantics",
  "source_body_quote_locator_and_binding",
  "rule_and_ruleset_version_digest_and_summary_semantics",
  "fact_dependency_contract_and_invariants",
  "rule_completeness_uniqueness_and_cross_rule_invariants",
  "rights_license_and_redistribution_review",
  "independent_expert_review_and_disagreement_retention",
  "high_risk_output_policy_abstention_and_failure_semantics",
  "executable_ruleset_implementation_identity_and_failure_channel"
]);

const EXCLUDED_UNREVIEWED_CANDIDATE_METHOD_IDS = Object.freeze([
  "d1_divisional_chart",
  "d9_divisional_chart",
  "d10_divisional_chart",
  "vimshottari_dasha",
  "chara_karaka",
  "shadbala",
  "ashtakavarga"
]);

const CHAIN_ORDER = Object.freeze([
  VEDIC_BOUNDARY_ADR_RELATIVE_PATH,
  VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH,
  VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
  VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH,
  VEDIC_FACT_CONTRACT_REQUIREMENTS_RELATIVE_PATH
]);

const DOES_NOT_ESTABLISH = Object.freeze([
  "admitted_fact_contract_or_deterministic_fact_instances",
  "rule_school_applicability_conflict_counterexample_or_method_truth",
  "rule_source_body_quote_locator_or_binding",
  "rule_rights_license_or_legal_conclusion",
  "expert_identity_opinion_or_truth",
  "executable_rule_evaluator_or_versioned_ruleset",
  "rule_fact_or_success_receipt",
  "mutation_epoch_cross_file_atomic_snapshot_interval_mutation_or_aba_exclusion",
  "formal_admission_release_readiness_or_public_release_authorization"
]);

const EXPECTED_OBSERVATION_BOUNDARY = Object.freeze({
  abaExcluded: false,
  crossFileAtomicSnapshot: false,
  heldFileHandleReads: true,
  intervalMutationExcluded: false,
  mutationEpochAvailable: false,
  mutationEpochReceipt: null,
  pathEndpointRevalidated: true,
  plainDirectoryChainRequired: true,
  ruleDraftAndUpstreamsAtomicSnapshot: false,
  schemaHashAndParseUseSameReadBuffer: true,
  upstreamArtifactHashAndInspectionUseSameReadBuffer: true
});

const EXPECTED_BOUNDARY_BINDINGS = Object.freeze({
  bindingDirection: "rule_draft_to_adr_input_and_fact_closures_only",
  chainOrder: CHAIN_ORDER,
  factContractDraft: Object.freeze({
    artifactRole: "project_authored_isolated_fact_contract_draft",
    bytes: EXPECTED_FACT_DRAFT_RAW_IDENTITY.bytes,
    path: EXPECTED_FACT_DRAFT_RAW_IDENTITY.path,
    rawHashAndSemanticInspectionUseSameBuffer: true,
    schemaSemanticDigest: EXPECTED_FACT_DRAFT_SEMANTIC_DIGEST,
    schemaStatus: "isolated_contract_draft",
    sha256: EXPECTED_FACT_DRAFT_RAW_IDENTITY.sha256
  }),
  factContractRequirements: Object.freeze({
    artifactRole: "non_product_governance_fact_requirements_inventory",
    bytes: EXPECTED_FACT_REQUIREMENTS_RAW_IDENTITY.bytes,
    ledgerDigest: EXPECTED_FACT_REQUIREMENTS_LEDGER_DIGEST,
    path: EXPECTED_FACT_REQUIREMENTS_RAW_IDENTITY.path,
    rawHashAndSemanticInspectionUseSameBuffer: true,
    requirementsResolved: 0,
    requirementsUniverseClosed: false,
    sha256: EXPECTED_FACT_REQUIREMENTS_RAW_IDENTITY.sha256,
    status:
      "fact_contract_draft_present_zero_instances_values_producer_projector_absent_not_admitted"
  }),
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
});

const EXPECTED_DEFINITIONS = Object.freeze({
  nonEmptyOpaqueIdentityRefList: Object.freeze({
    items: Object.freeze({ $ref: "#/$defs/opaqueIdentityRef" }),
    minItems: 1,
    type: "array",
    uniqueItems: true
  }),
  opaqueIdentityRef: Object.freeze({
    maxLength: 300,
    minLength: 1,
    pattern: "^[A-Za-z0-9][A-Za-z0-9._:/#-]{0,299}$",
    type: "string"
  }),
  opaqueIdentityRefList: Object.freeze({
    items: Object.freeze({ $ref: "#/$defs/opaqueIdentityRef" }),
    type: "array",
    uniqueItems: true
  })
});

const RULE_DEFINITION_REQUIRED = Object.freeze([
  "rule_id_ref",
  "rule_version_ref",
  "rule_digest_ref",
  "summary_ref",
  "school_definition_ref",
  "applicability_definition_ref",
  "conflict_definition_refs",
  "counterexample_definition_refs",
  "source_binding_refs",
  "fact_dependency_contract_ref",
  "rights_policy_ref",
  "expert_review_policy_ref",
  "high_risk_policy_ref",
  "implementation_artifact_set_ref",
  "failure_channel_contract_ref"
]);

const RULESET_REQUIRED = Object.freeze([
  "ruleset_id_ref",
  "ruleset_version_ref",
  "ruleset_digest_ref",
  "summary_ref",
  "school_scope_ref",
  "rule_definition_refs",
  "fact_contract_ref",
  "source_binding_policy_ref",
  "rights_policy_ref",
  "expert_review_policy_ref",
  "high_risk_policy_ref",
  "implementation_artifact_set_ref",
  "failure_channel_contract_ref"
]);

const EXPECTED_BOUNDARY_SCALARS = Object.freeze({
  artifactRole: "project_authored_isolated_rule_contract_draft",
  authenticityEstablished: false,
  authorityStatus: "not-authoritative",
  authorshipAuthenticityEstablished: false,
  authorshipClaim: "project_authored_clean_room_draft",
  baziAuthorityInherited: false,
  blockedPrerequisitesDefined: BLOCKED_PREREQUISITE_IDS.length,
  blockedPrerequisitesResolved: 0,
  blockedPrerequisitesUniverseClosed: false,
  countsTowardAdmission: false,
  domainAuthorityAuthorized: false,
  expertClaimsAuthorized: false,
  factContractGateSatisfied: false,
  factInstancesIncluded: 0,
  factReceiptIssued: false,
  formalAdmissionAuthorized: false,
  highRiskClaimsAuthorized: false,
  inputAcceptanceReceiptIssued: false,
  inputContractGateSatisfied: false,
  integrationStatus: "not-integrated",
  methodSelectionsIncluded: 0,
  productStatus: "research-only",
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  releaseReady: false,
  requirementSelectionsIncluded: 0,
  requirementsResolved: 0,
  requirementsUniverseClosed: false,
  rightsEstablished: false,
  ruleBodiesIncluded: 0,
  ruleContractGateSatisfied: false,
  ruleDefinitionsIncluded: 0,
  ruleEvaluationCapability: false,
  ruleInstancesIncluded: 0,
  ruleReceiptCapability: false,
  ruleReceiptIssued: false,
  rulesetExecutionCapability: false,
  rulesetInstancesIncluded: 0,
  schemaStatus: "isolated_contract_draft",
  schoolSelectionsIncluded: 0,
  sourceBindingEstablished: false,
  sourceBodiesIncluded: 0,
  structuralPrecheckCountsAsRuleValidation: false,
  structuralPrecheckOnly: true,
  successReceiptCapability: false,
  successReceiptIssued: false,
  versionedRulesetGateSatisfied: false
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
  "规则层必须声明流派、适用条件、冲突、反例、来源、版本和摘要。不得把工程权重、稳定性分数或格式化结果包装为传统原文或专家结论。",
  "不得借用八字、紫微或西洋的工程、来源、专家或权利证据为吠陀体系背书。"
]);

export class VedicRuleContractDraftError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "VedicRuleContractDraftError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new VedicRuleContractDraftError(code, message);
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function capturePassiveJsonValue(value, state, depth) {
  if (depth > 96) fail("INPUT_DEPTH_EXCEEDED", "吠陀规则合同草案对象超过最大深度。");
  state.nodes += 1;
  if (state.nodes > 200_000) fail("INPUT_NODE_LIMIT_EXCEEDED", "吠陀规则合同草案对象超过节点上限。");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      fail("INPUT_VALUE_INVALID", "吠陀规则合同草案对象含非规范 JSON 数值。");
    }
    return value;
  }
  if (typeof value === "string") {
    state.textCharacters += value.length;
    if (state.textCharacters > 2_000_000) {
      fail("INPUT_TEXT_LIMIT_EXCEEDED", "吠陀规则合同草案文本超过上限。");
    }
    return value;
  }
  if (typeof value !== "object") {
    fail("INPUT_VALUE_INVALID", "吠陀规则合同草案对象 API 只接受 JSON 值。");
  }
  if (utilTypes.isProxy(value)) {
    fail("INPUT_PROXY_FORBIDDEN", "吠陀规则合同草案对象 API 不接受 Proxy。");
  }
  if (state.active.has(value)) {
    fail("INPUT_CYCLE_FORBIDDEN", "吠陀规则合同草案对象 API 不接受循环引用。");
  }
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
      throw new VedicRuleContractDraftError(
        "INPUT_OBJECT_UNSAFE",
        "无法安全捕获吠陀规则合同草案对象。",
        { cause }
      );
    }
    const descriptorKeys = Reflect.ownKeys(descriptors);
    if (descriptorKeys.some((key) => typeof key === "symbol")) {
      fail("INPUT_SYMBOL_FORBIDDEN", "吠陀规则合同草案对象 API 不接受 Symbol 属性。");
    }
    if (array) {
      if (prototype !== Array.prototype) {
        fail("INPUT_PROTOTYPE_INVALID", "吠陀规则合同草案数组原型无效。");
      }
      const lengthDescriptor = descriptors.length;
      const length = lengthDescriptor?.value;
      if (lengthDescriptor?.get || lengthDescriptor?.set
        || !Number.isSafeInteger(length) || length < 0 || length > 200_000) {
        fail("INPUT_ARRAY_INVALID", "吠陀规则合同草案数组长度无效。");
      }
      const allowedKeys = new Set([
        "length",
        ...Array.from({ length }, (_entry, index) => String(index))
      ]);
      if (descriptorKeys.some((key) => !allowedKeys.has(key))) {
        fail("INPUT_ARRAY_INVALID", "吠陀规则合同草案数组含额外属性。");
      }
      const result = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
          fail("INPUT_ARRAY_INVALID", "吠陀规则合同草案不接受稀疏数组或访问器元素。");
        }
        result.push(capturePassiveJsonValue(descriptor.value, state, depth + 1));
      }
      return result;
    }
    if (prototype !== Object.prototype) {
      fail("INPUT_PROTOTYPE_INVALID", "吠陀规则合同草案只接受普通 JSON 对象。");
    }
    const entries = [];
    for (const key of descriptorKeys) {
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
        fail("INPUT_ACCESSOR_FORBIDDEN", "吠陀规则合同草案对象 API 不接受访问器或不可枚举字段。");
      }
      entries.push([key, capturePassiveJsonValue(descriptor.value, state, depth + 1)]);
    }
    return Object.fromEntries(entries);
  } finally {
    state.active.delete(value);
  }
}

function capturePassiveJsonSnapshot(value) {
  return capturePassiveJsonValue(
    value,
    { active: new WeakSet(), nodes: 0, textCharacters: 0 },
    0
  );
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
    return Object.fromEntries(
      Object.keys(value)
        .sort(compareCodeUnits)
        .map((key) => [key, canonicalValue(value[key])])
    );
  }
  fail("NON_CANONICAL_JSON", "吠陀规则合同草案只接受有限规范 JSON 值。");
}

export function canonicalStringifyVedicRuleContractDraft(value) {
  return JSON.stringify(canonicalValue(capturePassiveJsonSnapshot(value)));
}

export function canonicalPrettyStringifyVedicRuleContractDraft(value) {
  return `${JSON.stringify(canonicalValue(capturePassiveJsonSnapshot(value)), null, 2)}\n`;
}

function domainSeparatedDigest(domain, value) {
  return createHash("sha256")
    .update(domain, "utf8")
    .update("\0", "utf8")
    .update(canonicalStringifyVedicRuleContractDraft(value), "utf8")
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

export function computeVedicRuleContractDraftSemanticDigest(schemaInput) {
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
      } else if (value !== null && typeof value === "object") {
        stack.push(value);
      }
    }
  }
}

export function parseVedicRuleContractDraftJsonBytes(
  bytes,
  label = "吠陀规则合同草案 JSON",
  maxBytes = MAX_SCHEMA_BYTES
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
  if (!utilTypes.isUint8Array(bytes)
    || typeof TYPED_ARRAY_BYTE_LENGTH_GETTER !== "function"
    || typeof TYPED_ARRAY_BUFFER_GETTER !== "function") {
    fail("JSON_INVALID", `${label} 必须是具有内部 Uint8Array 品牌的字节视图。`);
  }
  let byteLength;
  let backingBuffer;
  try {
    byteLength = Reflect.apply(TYPED_ARRAY_BYTE_LENGTH_GETTER, bytes, []);
    backingBuffer = Reflect.apply(TYPED_ARRAY_BUFFER_GETTER, bytes, []);
  } catch (cause) {
    throw new VedicRuleContractDraftError(
      "JSON_INVALID",
      `${label} 的 Uint8Array 内部槽不可读取。`,
      { cause }
    );
  }
  if (typeof utilTypes.isSharedArrayBuffer === "function"
    && utilTypes.isSharedArrayBuffer(backingBuffer)) {
    fail("JSON_SHARED_BUFFER_FORBIDDEN", `${label} 不接受 SharedArrayBuffer 字节。`);
  }
  if (!utilTypes.isArrayBuffer(backingBuffer)) {
    fail("JSON_INVALID", `${label} 的字节 backing 无效。`);
  }
  if (typeof ARRAY_BUFFER_RESIZABLE_GETTER === "function") {
    let resizable;
    try {
      resizable = Reflect.apply(ARRAY_BUFFER_RESIZABLE_GETTER, backingBuffer, []);
    } catch (cause) {
      throw new VedicRuleContractDraftError(
        "JSON_INVALID",
        `${label} 的 ArrayBuffer 状态不可读取。`,
        { cause }
      );
    }
    if (resizable) {
      fail("JSON_RESIZABLE_BUFFER_FORBIDDEN", `${label} 不接受可变 ArrayBuffer 字节。`);
    }
  }
  if (!Number.isSafeInteger(byteLength) || byteLength > maxBytes) {
    fail("JSON_TOO_LARGE", `${label} 超过输入上限。`);
  }
  const capturedBytes = new Uint8Array(byteLength);
  try {
    Reflect.apply(UINT8_ARRAY_SET, capturedBytes, [bytes]);
  } catch (cause) {
    throw new VedicRuleContractDraftError(
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
    throw new VedicRuleContractDraftError(
      "JSON_UTF8_INVALID",
      `${label} 不是严格 UTF-8。`,
      { cause }
    );
  }
  if (!source.trim()) fail("JSON_INVALID", `${label} 为空。`);
  let expression;
  try {
    expression = parseExpression(source.trim(), {
      attachComment: false,
      errorRecovery: false,
      sourceFilename: "vedic-rule-contract-draft.json",
      sourceType: "script"
    });
  } catch (cause) {
    throw new VedicRuleContractDraftError(
      "JSON_INVALID",
      `${label} 不能按严格 JSON 检查。`,
      { cause }
    );
  }
  walkAst(expression, (node) => {
    if (node.type !== "ObjectExpression") return;
    const keys = new Set();
    for (const property of node.properties) {
      if (property.type !== "ObjectProperty"
        || property.computed
        || property.key?.type !== "StringLiteral") {
        fail("JSON_INVALID", `${label} 含非 JSON 对象属性。`);
      }
      if (keys.has(property.key.value)) {
        fail("JSON_DUPLICATE_KEY", `${label} 含重复对象键。`);
      }
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
    if (cause instanceof VedicRuleContractDraftError) throw cause;
    throw new VedicRuleContractDraftError(
      "JSON_INVALID",
      `${label} 不是有效 JSON。`,
      { cause }
    );
  }
}

function safeWorkspaceFile(workspaceRoot, relativePath) {
  const segments = typeof relativePath === "string" ? relativePath.split("/") : [];
  if (typeof relativePath !== "string"
    || relativePath.length < 1
    || relativePath.length > 300
    || relativePath.includes("\0")
    || relativePath.includes("\\")
    || relativePath.startsWith("/")
    || path.posix.normalize(relativePath) !== relativePath
    || segments.some((segment) =>
      segment === "" || segment === "." || segment === ".." || segment.includes(":"))) {
    fail("UNSAFE_ARTIFACT_PATH", "吠陀规则合同草案路径不安全。");
  }
  const root = path.resolve(workspaceRoot);
  const absolute = path.resolve(root, ...segments);
  const relative = path.relative(root, absolute);
  if (relative === ""
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative)) {
    fail("UNSAFE_ARTIFACT_PATH", "吠陀规则合同草案路径越界。");
  }
  return absolute;
}

function isSameOrWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === ""
    || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
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
  if (!isSameOrWithin(root, targetDirectory)) {
    fail(invalidCode, `${label} 的目录链越出工作区。`);
  }
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
  { invalidCode, label, missingCode }
) {
  const absolute = safeWorkspaceFile(workspaceRoot, relativePath);
  let before;
  let actual;
  let directoryChainBefore;
  try {
    directoryChainBefore = await capturePlainDirectoryChain(
      workspaceRoot,
      absolute,
      invalidCode,
      label
    );
    [before, actual] = await Promise.all([
      lstat(absolute, { bigint: true }),
      realpath(absolute)
    ]);
  } catch (cause) {
    if (cause instanceof VedicRuleContractDraftError) throw cause;
    throw new VedicRuleContractDraftError(missingCode, `${label} 不存在。`, { cause });
  }
  const root = directoryChainBefore[0].resolvedPath;
  if (!isSameOrWithin(root, actual)
    || before.isSymbolicLink()
    || !before.isFile()
    || before.nlink !== 1n
    || before.size <= 0n
    || before.size > BigInt(maxBytes)) {
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
    if (afterPath.isSymbolicLink()
      || !afterPath.isFile()
      || afterPath.nlink !== 1n
      || BigInt(bytes.byteLength) !== opened.size
      || !sameFileEndpoint(opened, afterHandle)
      || !sameFileEndpoint(opened, afterPath)
      || actualAfter !== actual
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
  if (bytes.length >= 3
    && bytes[0] === 0xef
    && bytes[1] === 0xbb
    && bytes[2] === 0xbf) {
    fail("BOUND_ARTIFACT_BOM_FORBIDDEN", `${label} 不得包含 UTF-8 BOM。`);
  }
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (!text.trim()) fail("BOUND_ARTIFACT_INVALID", `${label} 为空。`);
    return text;
  } catch (cause) {
    if (cause instanceof VedicRuleContractDraftError) throw cause;
    throw new VedicRuleContractDraftError(
      "BOUND_ARTIFACT_UTF8_INVALID",
      `${label} 不是严格 UTF-8。`,
      { cause }
    );
  }
}

function requireExactRawIdentity(snapshot, expected, label) {
  if (snapshot.size !== expected.bytes || snapshot.sha256 !== expected.sha256) {
    fail("BOUND_ARTIFACT_IDENTITY_MISMATCH", `${label} 原始字节身份漂移。`);
  }
}

function exactJson(left, right) {
  return canonicalStringifyVedicRuleContractDraft(left)
    === canonicalStringifyVedicRuleContractDraft(right);
}

function verifyAdrSnapshot(snapshot) {
  requireExactRawIdentity(snapshot, EXPECTED_ADR_RAW_IDENTITY, "吠陀产品边界 ADR");
  const text = decodeStrictUtf8(snapshot.bytes, "吠陀产品边界 ADR");
  for (const marker of ADR_REQUIRED_MARKERS) {
    if (!text.includes(marker)) {
      fail("ADR_SEMANTIC_MISMATCH", "吠陀产品边界 ADR 缺少批准语义标记。");
    }
  }
  const digest = domainSeparatedDigest(ADR_SEMANTIC_DIGEST_DOMAIN, ADR_SEMANTIC_IDENTITY);
  if (digest !== EXPECTED_ADR_SEMANTIC_DIGEST) {
    fail("ADR_SEMANTIC_MISMATCH", "吠陀产品边界 ADR 语义身份漂移。");
  }
  return digest;
}

async function verifyInputDraftSnapshot(workspaceRoot, snapshot) {
  requireExactRawIdentity(snapshot, EXPECTED_INPUT_DRAFT_RAW_IDENTITY, "吠陀输入合同草案");
  let schema;
  try {
    schema = parseVedicInputContractDraftJsonBytes(snapshot.bytes);
  } catch (cause) {
    throw new VedicRuleContractDraftError(
      typeof cause?.code === "string" ? `INPUT_DRAFT_${cause.code}` : "INPUT_DRAFT_INVALID",
      "吠陀输入合同草案不能严格解析。",
      { cause }
    );
  }
  if (canonicalPrettyStringifyVedicInputContractDraft(schema)
    !== decodeStrictUtf8(snapshot.bytes, "吠陀输入合同草案")) {
    fail("INPUT_DRAFT_MATERIALIZATION_MISMATCH", "吠陀输入合同草案不是 canonical materialization。");
  }
  const semanticDigest = computeVedicInputContractDraftSemanticDigest(schema);
  let verified;
  try {
    verified = await verifyVedicInputContractDraft(workspaceRoot, schema);
  } catch (cause) {
    throw new VedicRuleContractDraftError(
      typeof cause?.code === "string" ? `INPUT_DRAFT_${cause.code}` : "INPUT_DRAFT_INVALID",
      "吠陀输入合同草案未通过当前闭包验证。",
      { cause }
    );
  }
  if (semanticDigest !== EXPECTED_INPUT_DRAFT_SEMANTIC_DIGEST
    || verified.schemaSemanticDigest !== EXPECTED_INPUT_DRAFT_SEMANTIC_DIGEST
    || verified.artifactRole !== "project_authored_isolated_input_contract_draft"
    || verified.schemaStatus !== "isolated_contract_draft"
    || verified.inputContractGateSatisfied !== false
    || verified.requirementsResolved !== 0
    || verified.publicReleaseAuthorized !== false) {
    fail("INPUT_DRAFT_SEMANTIC_MISMATCH", "吠陀输入合同草案未保持零选择未准入边界。");
  }
  return semanticDigest;
}

async function verifyInputRequirementsSnapshot(workspaceRoot, snapshot) {
  requireExactRawIdentity(snapshot, EXPECTED_INPUT_REQUIREMENTS_RAW_IDENTITY, "吠陀输入合同要求账");
  let ledger;
  try {
    ledger = parseVedicInputContractRequirementsJsonBytes(snapshot.bytes);
  } catch (cause) {
    throw new VedicRuleContractDraftError(
      typeof cause?.code === "string"
        ? `INPUT_REQUIREMENTS_${cause.code}`
        : "INPUT_REQUIREMENTS_INVALID",
      "吠陀输入合同要求账不能严格解析。",
      { cause }
    );
  }
  if (canonicalPrettyStringifyVedicInputContractRequirements(ledger)
    !== decodeStrictUtf8(snapshot.bytes, "吠陀输入合同要求账")) {
    fail(
      "INPUT_REQUIREMENTS_MATERIALIZATION_MISMATCH",
      "吠陀输入合同要求账不是 canonical materialization。"
    );
  }
  let verified;
  try {
    verified = await verifyVedicInputContractRequirementsLedger(workspaceRoot, ledger);
  } catch (cause) {
    throw new VedicRuleContractDraftError(
      typeof cause?.code === "string"
        ? `INPUT_REQUIREMENTS_${cause.code}`
        : "INPUT_REQUIREMENTS_INVALID",
      "吠陀输入合同要求账未通过当前闭包验证。",
      { cause }
    );
  }
  if (ledger.ledgerDigest !== EXPECTED_INPUT_REQUIREMENTS_LEDGER_DIGEST
    || computeVedicInputContractRequirementsDigest(ledger)
      !== EXPECTED_INPUT_REQUIREMENTS_LEDGER_DIGEST
    || verified.ledgerDigest !== EXPECTED_INPUT_REQUIREMENTS_LEDGER_DIGEST
    || verified.status !== "input_contract_draft_present_zero_instances_not_admitted"
    || verified.requirementsDefined !== 13
    || verified.requirementsDraftCovered !== 13
    || verified.requirementsResolved !== 0
    || verified.inputInstancesObserved !== 0
    || verified.inputContractGateSatisfied !== false
    || verified.releaseReady !== false
    || verified.publicReleaseAuthorized !== false) {
    fail("INPUT_REQUIREMENTS_SEMANTIC_MISMATCH", "吠陀输入合同要求账边界已漂移。");
  }
  return ledger.ledgerDigest;
}

async function verifyFactDraftSnapshot(workspaceRoot, snapshot) {
  requireExactRawIdentity(snapshot, EXPECTED_FACT_DRAFT_RAW_IDENTITY, "吠陀事实合同草案");
  let schema;
  try {
    schema = parseVedicFactContractDraftJsonBytes(snapshot.bytes);
  } catch (cause) {
    throw new VedicRuleContractDraftError(
      typeof cause?.code === "string" ? `FACT_DRAFT_${cause.code}` : "FACT_DRAFT_INVALID",
      "吠陀事实合同草案不能严格解析。",
      { cause }
    );
  }
  if (canonicalPrettyStringifyVedicFactContractDraft(schema)
    !== decodeStrictUtf8(snapshot.bytes, "吠陀事实合同草案")) {
    fail("FACT_DRAFT_MATERIALIZATION_MISMATCH", "吠陀事实合同草案不是 canonical materialization。");
  }
  const semanticDigest = computeVedicFactContractDraftSemanticDigest(schema);
  let verified;
  try {
    verified = await verifyVedicFactContractDraft(workspaceRoot, schema);
  } catch (cause) {
    throw new VedicRuleContractDraftError(
      typeof cause?.code === "string" ? `FACT_DRAFT_${cause.code}` : "FACT_DRAFT_INVALID",
      "吠陀事实合同草案未通过当前闭包验证。",
      { cause }
    );
  }
  if (semanticDigest !== EXPECTED_FACT_DRAFT_SEMANTIC_DIGEST
    || verified.schemaSemanticDigest !== EXPECTED_FACT_DRAFT_SEMANTIC_DIGEST
    || verified.artifactRole !== "project_authored_isolated_fact_contract_draft"
    || verified.schemaStatus !== "isolated_contract_draft"
    || verified.factInstancesObserved !== 0
    || verified.factGenerationCapability !== false
    || verified.factContractGateSatisfied !== false
    || verified.factReceiptIssued !== false
    || verified.publicReleaseAuthorized !== false) {
    fail("FACT_DRAFT_SEMANTIC_MISMATCH", "吠陀事实合同草案未保持零实例未准入边界。");
  }
  return semanticDigest;
}

async function verifyFactRequirementsSnapshot(workspaceRoot, snapshot) {
  requireExactRawIdentity(snapshot, EXPECTED_FACT_REQUIREMENTS_RAW_IDENTITY, "吠陀事实合同要求账");
  let ledger;
  try {
    ledger = parseVedicFactContractRequirementsJsonBytes(snapshot.bytes);
  } catch (cause) {
    throw new VedicRuleContractDraftError(
      typeof cause?.code === "string"
        ? `FACT_REQUIREMENTS_${cause.code}`
        : "FACT_REQUIREMENTS_INVALID",
      "吠陀事实合同要求账不能严格解析。",
      { cause }
    );
  }
  if (canonicalPrettyStringifyVedicFactContractRequirements(ledger)
    !== decodeStrictUtf8(snapshot.bytes, "吠陀事实合同要求账")) {
    fail(
      "FACT_REQUIREMENTS_MATERIALIZATION_MISMATCH",
      "吠陀事实合同要求账不是 canonical materialization。"
    );
  }
  let verified;
  try {
    verified = await verifyVedicFactContractRequirementsLedger(workspaceRoot, ledger);
  } catch (cause) {
    throw new VedicRuleContractDraftError(
      typeof cause?.code === "string"
        ? `FACT_REQUIREMENTS_${cause.code}`
        : "FACT_REQUIREMENTS_INVALID",
      "吠陀事实合同要求账未通过当前闭包验证。",
      { cause }
    );
  }
  if (ledger.ledgerDigest !== EXPECTED_FACT_REQUIREMENTS_LEDGER_DIGEST
    || computeVedicFactContractRequirementsDigest(ledger)
      !== EXPECTED_FACT_REQUIREMENTS_LEDGER_DIGEST
    || verified.ledgerDigest !== EXPECTED_FACT_REQUIREMENTS_LEDGER_DIGEST
    || verified.status
      !== "fact_contract_draft_present_zero_instances_values_producer_projector_absent_not_admitted"
    || verified.requirementsDefined !== 12
    || verified.requirementsDraftCovered !== 12
    || verified.requirementsResolved !== 0
    || verified.requirementsUniverseClosed !== false
    || verified.factContractArtifacts !== 1
    || verified.factInstancesObserved !== 0
    || verified.factContractGateSatisfied !== false
    || verified.releaseReady !== false
    || verified.publicReleaseAuthorized !== false) {
    fail("FACT_REQUIREMENTS_SEMANTIC_MISMATCH", "吠陀事实合同要求账边界已漂移。");
  }
  return ledger.ledgerDigest;
}

function walkJson(value, visitor, pathSegments = []) {
  visitor(value, pathSegments);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walkJson(entry, visitor, [...pathSegments, index]));
  } else if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      walkJson(entry, visitor, [...pathSegments, key]);
    }
  }
}

function requireExactReference(branch, expectedDefinition, label) {
  if (!exactJson(branch, { $ref: `#/$defs/${expectedDefinition}` })) {
    fail("SCHEMA_REFERENCE_INVALID", `${label} 必须只引用本草案的 ${expectedDefinition}。`);
  }
}

function requireEnvelope(envelope, required, referenceTypes, label) {
  if (envelope?.type !== "object"
    || envelope.additionalProperties !== false
    || !exactJson(envelope.required, required)
    || !exactJson(
      Object.keys(envelope.properties ?? {}).sort(compareCodeUnits),
      [...required].sort(compareCodeUnits)
    )) {
    fail("RULE_ENVELOPE_INVALID", `${label} 字段集合无效。`);
  }
  for (const [field, definition] of Object.entries(referenceTypes)) {
    requireExactReference(envelope.properties[field], definition, `${label}.${field}`);
  }
}

function requireStaticDraftBoundary(schema) {
  const expectedRootKeys = [
    "$defs",
    "$id",
    "$schema",
    "additionalProperties",
    "properties",
    "required",
    "title",
    "type",
    "x-hakimiBoundary"
  ];
  if (!schema || typeof schema !== "object" || Array.isArray(schema)
    || !exactJson(Object.keys(schema).sort(compareCodeUnits), expectedRootKeys)
    || schema.$id !== SCHEMA_ID
    || schema.$schema !== "https://json-schema.org/draft/2020-12/schema"
    || schema.title !== "Hakimi Vedic rule contract draft 0.1.0"
    || schema.type !== "object"
    || schema.additionalProperties !== false) {
    fail("SCHEMA_IDENTITY_INVALID", "吠陀规则合同草案根身份无效。");
  }
  const rootRequired = [
    "contractVersion",
    "systemId",
    "ruleDefinitionEnvelope",
    "rulesetEnvelope"
  ];
  if (!exactJson(schema.required, rootRequired)
    || !exactJson(
      Object.keys(schema.properties ?? {}).sort(compareCodeUnits),
      [...rootRequired].sort(compareCodeUnits)
    )
    || !exactJson(schema.$defs, EXPECTED_DEFINITIONS)
    || !exactJson(schema.properties.contractVersion, { const: CONTRACT_VERSION, type: "string" })
    || !exactJson(schema.properties.systemId, { const: "vedic", type: "string" })) {
    fail("SCHEMA_FIELD_SET_INVALID", "吠陀规则合同草案字段或定义集合无效。");
  }

  requireEnvelope(
    schema.properties.ruleDefinitionEnvelope,
    RULE_DEFINITION_REQUIRED,
    {
      applicability_definition_ref: "opaqueIdentityRef",
      conflict_definition_refs: "opaqueIdentityRefList",
      counterexample_definition_refs: "opaqueIdentityRefList",
      expert_review_policy_ref: "opaqueIdentityRef",
      fact_dependency_contract_ref: "opaqueIdentityRef",
      failure_channel_contract_ref: "opaqueIdentityRef",
      high_risk_policy_ref: "opaqueIdentityRef",
      implementation_artifact_set_ref: "opaqueIdentityRef",
      rights_policy_ref: "opaqueIdentityRef",
      rule_digest_ref: "opaqueIdentityRef",
      rule_id_ref: "opaqueIdentityRef",
      rule_version_ref: "opaqueIdentityRef",
      school_definition_ref: "opaqueIdentityRef",
      source_binding_refs: "nonEmptyOpaqueIdentityRefList",
      summary_ref: "opaqueIdentityRef"
    },
    "ruleDefinitionEnvelope"
  );
  requireEnvelope(
    schema.properties.rulesetEnvelope,
    RULESET_REQUIRED,
    {
      expert_review_policy_ref: "opaqueIdentityRef",
      fact_contract_ref: "opaqueIdentityRef",
      failure_channel_contract_ref: "opaqueIdentityRef",
      high_risk_policy_ref: "opaqueIdentityRef",
      implementation_artifact_set_ref: "opaqueIdentityRef",
      rights_policy_ref: "opaqueIdentityRef",
      rule_definition_refs: "nonEmptyOpaqueIdentityRefList",
      ruleset_digest_ref: "opaqueIdentityRef",
      ruleset_id_ref: "opaqueIdentityRef",
      ruleset_version_ref: "opaqueIdentityRef",
      school_scope_ref: "opaqueIdentityRef",
      source_binding_policy_ref: "opaqueIdentityRef",
      summary_ref: "opaqueIdentityRef"
    },
    "rulesetEnvelope"
  );

  const knownDefinitions = Object.keys(EXPECTED_DEFINITIONS);
  const constPaths = [];
  const forbiddenInstanceTerms = [
    "rule_body",
    "predicate",
    "expression",
    "weight",
    "score",
    "computed",
    "outcome",
    "hit_result",
    "interpretation_text",
    "traditional_quote",
    "expert_disposition",
    "producer",
    "projector",
    "executable"
  ];
  const instanceSchema = { $defs: schema.$defs, properties: schema.properties };
  walkJson(instanceSchema, (value, pathSegments) => {
    if (typeof value === "string") {
      const lowered = value.toLowerCase();
      if (forbiddenInstanceTerms.some((term) => lowered.includes(term))) {
        fail(
          "SCHEMA_PREMATURE_SEMANTIC_FORBIDDEN",
          "吠陀规则合同草案含规则正文、执行或提前真值语义。"
        );
      }
      return;
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    for (const key of Object.keys(value)) {
      const lowered = key.toLowerCase();
      if (["default", "example", "examples"].includes(lowered)) {
        fail("SCHEMA_DEFAULT_OR_EXAMPLE_FORBIDDEN", "吠陀规则合同草案不得携带 default 或 example。");
      }
      if (forbiddenInstanceTerms.some((term) => lowered.includes(term))) {
        fail(
          "SCHEMA_PREMATURE_SEMANTIC_FORBIDDEN",
          "吠陀规则合同草案含规则正文、执行或提前真值语义。"
        );
      }
    }
    if (Object.hasOwn(value, "enum")) {
      fail("SCHEMA_METHOD_ENUM_FORBIDDEN", "吠陀规则合同草案不得枚举未审定取值。");
    }
    if (Object.hasOwn(value, "const")) constPaths.push(pathSegments.join("."));
    if (Object.hasOwn(value, "$ref")) {
      if (typeof value.$ref !== "string"
        || !value.$ref.startsWith("#/$defs/")
        || !knownDefinitions.includes(value.$ref.slice("#/$defs/".length))) {
        fail("SCHEMA_EXTERNAL_REF_FORBIDDEN", "吠陀规则合同草案不得引用外部或未知 schema。");
      }
    }
    if (value.type === "object" && value.additionalProperties !== false) {
      fail("SCHEMA_OBJECT_OPEN", "吠陀规则合同草案所有实例对象必须 additionalProperties=false。");
    }
  });
  if (!exactJson(
    constPaths.sort(compareCodeUnits),
    ["properties.contractVersion", "properties.systemId"]
  )) {
    fail("SCHEMA_VALUE_SELECTION_FORBIDDEN", "吠陀规则合同草案除合同与体系身份外不得固定实例取值。");
  }

  const boundary = schema["x-hakimiBoundary"];
  const expectedBoundaryKeys = [
    ...Object.keys(EXPECTED_BOUNDARY_SCALARS),
    "baziArtifactRefs",
    "blockedPrerequisiteIds",
    "boundaryBindings",
    "doesNotEstablish",
    "excludedUnreviewedCandidateMethodIds",
    "externalSourceRefs",
    "implementationArtifactRefs",
    "observationBoundary"
  ].sort(compareCodeUnits);
  if (!boundary
    || !exactJson(Object.keys(boundary).sort(compareCodeUnits), expectedBoundaryKeys)) {
    fail("BOUNDARY_FIELD_SET_INVALID", "吠陀规则合同草案边界字段集合无效。");
  }
  for (const [key, expected] of Object.entries(EXPECTED_BOUNDARY_SCALARS)) {
    if (!Object.is(boundary[key], expected)) {
      fail("BOUNDARY_PROMOTED", `吠陀规则合同草案边界 ${key} 被提升。`);
    }
  }
  if (!exactJson(boundary.baziArtifactRefs, [])
    || !exactJson(boundary.externalSourceRefs, [])
    || !exactJson(boundary.implementationArtifactRefs, [])
    || !exactJson(boundary.blockedPrerequisiteIds, BLOCKED_PREREQUISITE_IDS)
    || !exactJson(boundary.excludedUnreviewedCandidateMethodIds,
      EXCLUDED_UNREVIEWED_CANDIDATE_METHOD_IDS)
    || !exactJson(boundary.doesNotEstablish, DOES_NOT_ESTABLISH)
    || !exactJson(boundary.observationBoundary, EXPECTED_OBSERVATION_BOUNDARY)) {
    fail("BOUNDARY_PROMOTED", "吠陀规则合同草案零实例、未决或上游绑定边界已漂移。");
  }
  const bindings = boundary.boundaryBindings;
  const chain = bindings?.chainOrder;
  if (!Array.isArray(chain)
    || new Set(chain).size !== chain.length
    || chain.includes(VEDIC_RULE_CONTRACT_DRAFT_RELATIVE_PATH)
    || canonicalStringifyVedicRuleContractDraft(bindings)
      .includes("vedic-independent-productization-requirements")
    || canonicalStringifyVedicRuleContractDraft(bindings).includes("four-system")) {
    fail("BOUNDARY_GRAPH_CYCLIC", "吠陀规则合同草案上游图必须单向、无环且不回绑 parent/registry。");
  }
  if (!exactJson(bindings, EXPECTED_BOUNDARY_BINDINGS)) {
    fail("BOUNDARY_PROMOTED", "吠陀规则合同草案上游闭包身份已漂移。");
  }

  const methodOccurrences = new Map(
    EXCLUDED_UNREVIEWED_CANDIDATE_METHOD_IDS.map((methodId) => [methodId, []])
  );
  walkJson(schema, (value, pathSegments) => {
    if (typeof value === "string" && methodOccurrences.has(value)) {
      methodOccurrences.get(value).push(pathSegments.join("."));
    }
  });
  for (const [methodId, paths] of methodOccurrences) {
    if (paths.length !== 1
      || !paths[0].startsWith("x-hakimiBoundary.excludedUnreviewedCandidateMethodIds.")) {
      fail(
        "SCHEMA_METHOD_SELECTION_FORBIDDEN",
        `未经审阅的候选方法 ${methodId} 只能出现在排除清单。`
      );
    }
  }

  const digest = computeVedicRuleContractDraftSemanticDigest(schema);
  if (!SHA256_PATTERN.test(digest) || digest !== EXPECTED_SCHEMA_SEMANTIC_DIGEST) {
    fail("SCHEMA_SEMANTIC_DIGEST_MISMATCH", "吠陀规则合同草案语义摘要漂移。");
  }
}

async function readDraftSnapshot(workspaceRoot) {
  const snapshot = await readStableWorkspaceFile(
    workspaceRoot,
    VEDIC_RULE_CONTRACT_DRAFT_RELATIVE_PATH,
    MAX_SCHEMA_BYTES,
    {
      invalidCode: "SCHEMA_ENDPOINT_INVALID",
      label: "吠陀规则合同草案",
      missingCode: "SCHEMA_MISSING"
    }
  );
  requireExactRawIdentity(snapshot, EXPECTED_DRAFT_RAW_IDENTITY, "吠陀规则合同草案");
  const schema = parseVedicRuleContractDraftJsonBytes(snapshot.bytes);
  const source = decodeStrictUtf8(snapshot.bytes, "吠陀规则合同草案");
  if (source !== canonicalPrettyStringifyVedicRuleContractDraft(schema)) {
    fail("SCHEMA_MATERIALIZATION_MISMATCH", "吠陀规则合同草案不是 canonical materialization。");
  }
  return Object.freeze({ schema, snapshot });
}

export async function buildCurrentVedicRuleContractDraft(workspaceRoot) {
  const [
    draft,
    adrSnapshot,
    inputDraftSnapshot,
    inputRequirementsSnapshot,
    factDraftSnapshot,
    factRequirementsSnapshot
  ] = await Promise.all([
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
      {
        invalidCode: "INPUT_DRAFT_ENDPOINT_INVALID",
        label: "吠陀输入合同草案",
        missingCode: "INPUT_DRAFT_MISSING"
      }
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
    ),
    readStableWorkspaceFile(
      workspaceRoot,
      VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH,
      MAX_BOUND_ARTIFACT_BYTES,
      {
        invalidCode: "FACT_DRAFT_ENDPOINT_INVALID",
        label: "吠陀事实合同草案",
        missingCode: "FACT_DRAFT_MISSING"
      }
    ),
    readStableWorkspaceFile(
      workspaceRoot,
      VEDIC_FACT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
      MAX_BOUND_ARTIFACT_BYTES,
      {
        invalidCode: "FACT_REQUIREMENTS_ENDPOINT_INVALID",
        label: "吠陀事实合同要求账",
        missingCode: "FACT_REQUIREMENTS_MISSING"
      }
    )
  ]);
  const upstreamIdentities = {
    factContractDraftSemanticDigest:
      await verifyFactDraftSnapshot(workspaceRoot, factDraftSnapshot),
    factContractRequirementsLedgerDigest:
      await verifyFactRequirementsSnapshot(workspaceRoot, factRequirementsSnapshot),
    inputContractDraftSemanticDigest:
      await verifyInputDraftSnapshot(workspaceRoot, inputDraftSnapshot),
    inputContractRequirementsLedgerDigest:
      await verifyInputRequirementsSnapshot(workspaceRoot, inputRequirementsSnapshot),
    productBoundaryAdrSemanticDigest: verifyAdrSnapshot(adrSnapshot)
  };
  requireStaticDraftBoundary(draft.schema);
  return deepFreezeJson({
    rawIdentity: {
      bytes: draft.snapshot.size,
      path: VEDIC_RULE_CONTRACT_DRAFT_RELATIVE_PATH,
      sha256: draft.snapshot.sha256
    },
    schema: draft.schema,
    schemaSemanticDigest: computeVedicRuleContractDraftSemanticDigest(draft.schema),
    upstreamIdentities
  });
}

export async function readVedicRuleContractDraft(workspaceRoot) {
  const { schema } = await readDraftSnapshot(workspaceRoot);
  return schema;
}

export async function verifyVedicRuleContractDraft(workspaceRoot, schemaInput) {
  const schema = capturePassiveJsonSnapshot(schemaInput);
  requireStaticDraftBoundary(schema);
  const current = await buildCurrentVedicRuleContractDraft(workspaceRoot);
  if (canonicalStringifyVedicRuleContractDraft(schema)
    !== canonicalStringifyVedicRuleContractDraft(current.schema)) {
    fail("SCHEMA_CURRENT_CLOSURE_MISMATCH", "吠陀规则合同草案与当前批准的上游闭包不一致。");
  }
  const frozenSchema = deepFreezeJson(capturePassiveJsonSnapshot(schema));
  return deepFreezeJson({
    artifactRole: frozenSchema["x-hakimiBoundary"].artifactRole,
    blockedPrerequisiteIds: frozenSchema["x-hakimiBoundary"].blockedPrerequisiteIds,
    blockedPrerequisitesDefined: BLOCKED_PREREQUISITE_IDS.length,
    blockedPrerequisitesResolved: 0,
    blockedPrerequisitesUniverseClosed: false,
    countsTowardAdmission: false,
    factContractGateSatisfied: false,
    factInstancesObserved: 0,
    formalAdmissionAuthorized: false,
    inputContractGateSatisfied: false,
    methodSelectionsIncluded: 0,
    publicReleaseAuthorized: false,
    releaseReady: false,
    requirementSelectionsIncluded: 0,
    requirementsResolved: 0,
    ruleBodiesIncluded: 0,
    ruleContractGateSatisfied: false,
    ruleDefinitionsIncluded: 0,
    ruleEvaluationCapability: false,
    ruleInstancesObserved: 0,
    ruleReceiptIssued: false,
    rulesetExecutionCapability: false,
    rulesetInstancesObserved: 0,
    schema: frozenSchema,
    schemaSemanticDigest: current.schemaSemanticDigest,
    schemaStatus: frozenSchema["x-hakimiBoundary"].schemaStatus,
    sourceBodiesIncluded: 0,
    structuralPrecheckOnly: true,
    structuralPrecheckPassed: true,
    successReceiptIssued: false,
    upstreamIdentities: current.upstreamIdentities,
    versionedRulesetGateSatisfied: false
  });
}

export const vedicRuleContractDraftTestOnly = Object.freeze({
  blockedPrerequisiteIds: BLOCKED_PREREQUISITE_IDS,
  chainOrder: CHAIN_ORDER,
  contractVersion: CONTRACT_VERSION,
  excludedUnreviewedCandidateMethodIds: EXCLUDED_UNREVIEWED_CANDIDATE_METHOD_IDS,
  expectedAdrRawIdentity: EXPECTED_ADR_RAW_IDENTITY,
  expectedDraftRawIdentity: EXPECTED_DRAFT_RAW_IDENTITY,
  expectedFactDraftRawIdentity: EXPECTED_FACT_DRAFT_RAW_IDENTITY,
  expectedFactRequirementsRawIdentity: EXPECTED_FACT_REQUIREMENTS_RAW_IDENTITY,
  expectedInputDraftRawIdentity: EXPECTED_INPUT_DRAFT_RAW_IDENTITY,
  expectedInputRequirementsRawIdentity: EXPECTED_INPUT_REQUIREMENTS_RAW_IDENTITY,
  expectedObservationBoundary: EXPECTED_OBSERVATION_BOUNDARY,
  expectedSchemaSemanticDigest: EXPECTED_SCHEMA_SEMANTIC_DIGEST,
  ruleDefinitionRequired: RULE_DEFINITION_REQUIRED,
  rulesetRequired: RULESET_REQUIRED,
  safeWorkspaceFile
});
