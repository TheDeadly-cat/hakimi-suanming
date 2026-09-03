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
import {
  canonicalPrettyStringifyVedicRuleContractDraft,
  computeVedicRuleContractDraftSemanticDigest,
  parseVedicRuleContractDraftJsonBytes,
  vedicRuleContractDraftTestOnly,
  verifyVedicRuleContractDraft
} from "./vedic-rule-contract-draft-lib.mjs";

export const VEDIC_RULE_CONTRACT_REQUIREMENTS_RELATIVE_PATH =
  "content/system-admission/vedic-rule-contract-requirements.v1.json";

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
const VEDIC_RULE_CONTRACT_DRAFT_RELATIVE_PATH =
  "content/system-admission/vedic-rule-contract-draft.v0.1.0.schema.json";
const LEDGER_CREATED_AT = "2026-08-29T00:00:00.000Z";
const LEDGER_DIGEST_DOMAIN = "hakimi.vedic.rule-contract-requirements.v1";
const ADR_SEMANTIC_DIGEST_DOMAIN = "hakimi.vedic.independent-product-boundary-adr.v1";
const MAX_LEDGER_BYTES = 1_000_000;
const MAX_BOUND_ARTIFACT_BYTES = 2_000_000;
const CANONICAL_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const TYPED_ARRAY_PROTOTYPE = Object.getPrototypeOf(Uint8Array.prototype);
const TYPED_ARRAY_BYTE_LENGTH_GETTER =
  Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "byteLength").get;
const TYPED_ARRAY_BUFFER_GETTER =
  Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "buffer").get;
const ARRAY_BUFFER_RESIZABLE_GETTER =
  Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "resizable")?.get;
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
const EXPECTED_FACT_REQUIREMENTS_RAW_IDENTITY = Object.freeze({
  path: VEDIC_FACT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
  bytes: 42_634,
  sha256: "a20a1033ce063702548a79b6a651d21421e9f59a9a2ecd4da251cde42ae36b38"
});
const EXPECTED_RULE_DRAFT_RAW_IDENTITY = Object.freeze({
  path: VEDIC_RULE_CONTRACT_DRAFT_RELATIVE_PATH,
  bytes: 12_140,
  sha256: "1b0f118d5014aa8de0ab85bd756b710252565d643a5164ee88a7418d4a002f0d"
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
const EXPECTED_RULE_DRAFT_SEMANTIC_DIGEST =
  "3491132c1c5081eac5bb76f6fe1d67400da954ace73546589f34322dd11ae3f3";

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
  "未来事实和规则必须分别版本化。",
  "规则层必须声明流派、适用条件、冲突、反例、来源、版本和摘要。",
  "不得把工程权重、稳定性分数或格式化结果包装为传统原文或专家结论。",
  "不得借用八字、紫微或西洋的工程、来源、专家或权利证据为吠陀体系背书。",
  "在独立准入门关闭前，不创建占位计算结果、空数据库分区、伪成功回执、用户可点击入口或“综合命运”输出。"
]);

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

const PREREQUISITE_POINTER_MAP = Object.freeze({
  admitted_fact_contract_and_deterministic_fact_instances: Object.freeze([
    "/properties/ruleDefinitionEnvelope/properties/fact_dependency_contract_ref",
    "/properties/rulesetEnvelope/properties/fact_contract_ref",
    "/x-hakimiBoundary/factContractGateSatisfied",
    "/x-hakimiBoundary/factInstancesIncluded"
  ]),
  rule_school_identity_scope_and_lineage_semantics: Object.freeze([
    "/properties/ruleDefinitionEnvelope/properties/school_definition_ref",
    "/properties/rulesetEnvelope/properties/school_scope_ref"
  ]),
  rule_applicability_condition_semantics: Object.freeze([
    "/properties/ruleDefinitionEnvelope/properties/applicability_definition_ref"
  ]),
  rule_conflict_declaration_and_resolution_semantics: Object.freeze([
    "/properties/ruleDefinitionEnvelope/properties/conflict_definition_refs"
  ]),
  rule_counterexample_model_and_retention_semantics: Object.freeze([
    "/properties/ruleDefinitionEnvelope/properties/counterexample_definition_refs"
  ]),
  source_body_quote_locator_and_binding: Object.freeze([
    "/properties/ruleDefinitionEnvelope/properties/source_binding_refs",
    "/properties/rulesetEnvelope/properties/source_binding_policy_ref"
  ]),
  rule_and_ruleset_version_digest_and_summary_semantics: Object.freeze([
    "/properties/ruleDefinitionEnvelope/properties/rule_id_ref",
    "/properties/ruleDefinitionEnvelope/properties/rule_version_ref",
    "/properties/ruleDefinitionEnvelope/properties/rule_digest_ref",
    "/properties/ruleDefinitionEnvelope/properties/summary_ref",
    "/properties/rulesetEnvelope/properties/ruleset_id_ref",
    "/properties/rulesetEnvelope/properties/ruleset_version_ref",
    "/properties/rulesetEnvelope/properties/ruleset_digest_ref",
    "/properties/rulesetEnvelope/properties/summary_ref"
  ]),
  fact_dependency_contract_and_invariants: Object.freeze([
    "/properties/ruleDefinitionEnvelope/properties/fact_dependency_contract_ref",
    "/properties/rulesetEnvelope/properties/fact_contract_ref"
  ]),
  rule_completeness_uniqueness_and_cross_rule_invariants: Object.freeze([
    "/properties/rulesetEnvelope/properties/rule_definition_refs",
    "/$defs/nonEmptyOpaqueIdentityRefList/uniqueItems"
  ]),
  rights_license_and_redistribution_review: Object.freeze([
    "/properties/ruleDefinitionEnvelope/properties/rights_policy_ref",
    "/properties/rulesetEnvelope/properties/rights_policy_ref"
  ]),
  independent_expert_review_and_disagreement_retention: Object.freeze([
    "/properties/ruleDefinitionEnvelope/properties/expert_review_policy_ref",
    "/properties/rulesetEnvelope/properties/expert_review_policy_ref"
  ]),
  high_risk_output_policy_abstention_and_failure_semantics: Object.freeze([
    "/properties/ruleDefinitionEnvelope/properties/high_risk_policy_ref",
    "/properties/rulesetEnvelope/properties/high_risk_policy_ref"
  ]),
  executable_ruleset_implementation_identity_and_failure_channel: Object.freeze([
    "/properties/ruleDefinitionEnvelope/properties/implementation_artifact_set_ref",
    "/properties/ruleDefinitionEnvelope/properties/failure_channel_contract_ref",
    "/properties/rulesetEnvelope/properties/implementation_artifact_set_ref",
    "/properties/rulesetEnvelope/properties/failure_channel_contract_ref"
  ])
});

const PREREQUISITE_SPECS = Object.freeze(BLOCKED_PREREQUISITE_IDS.map((requirementId) =>
  Object.freeze({
    requirementClass: "v0_1_scoped_rule_prerequisite",
    requirementId,
    schemaPointers: PREREQUISITE_POINTER_MAP[requirementId]
  })));

const CHAIN_ORDER = Object.freeze([
  VEDIC_BOUNDARY_ADR_RELATIVE_PATH,
  VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH,
  VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
  VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH,
  VEDIC_FACT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
  VEDIC_RULE_CONTRACT_DRAFT_RELATIVE_PATH
]);

const DOES_NOT_ESTABLISH = Object.freeze([
  "closed_or_exhaustive_vedic_rule_requirements_universe",
  "formally_admitted_or_semantically_selected_vedic_rule_contract",
  "admitted_fact_contract_or_deterministic_fact_instances",
  "rule_definition_body_instance_evaluation_or_method_truth",
  "executable_rule_evaluator_implementation_or_versioned_ruleset",
  "rule_failure_rule_or_success_receipt_instance",
  "source_candidate_body_quote_locator_or_binding_inventory",
  "license_rights_or_legal_conclusion",
  "expert_identity_credentials_independence_opinion_or_truth",
  "high_risk_claim_authorization_or_abstention_policy_admission",
  "artifact_authenticity_digital_signature_or_signer_identity",
  "cross_system_authority_inheritance_or_concept_equivalence",
  "browser_runtime_storage_backup_recovery_or_deployment_evidence",
  "mutation_epoch_cross_file_atomic_snapshot_interval_mutation_or_aba_exclusion",
  "formal_admission_release_readiness_or_public_release_authorization"
]);

export class VedicRuleContractRequirementsError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "VedicRuleContractRequirementsError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new VedicRuleContractRequirementsError(code, message);
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function capturePassiveJsonValue(value, state, depth) {
  if (depth > 96) fail("INPUT_DEPTH_EXCEEDED", "吠陀规则合同要求账对象超过最大深度。");
  state.nodes += 1;
  if (state.nodes > 200_000) fail("INPUT_NODE_LIMIT_EXCEEDED", "吠陀规则合同要求账对象超过节点上限。");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      fail("INPUT_VALUE_INVALID", "吠陀规则合同要求账对象含非规范 JSON 数值。");
    }
    return value;
  }
  if (typeof value === "string") {
    state.textCharacters += value.length;
    if (state.textCharacters > 2_000_000) {
      fail("INPUT_TEXT_LIMIT_EXCEEDED", "吠陀规则合同要求账文本超过上限。");
    }
    return value;
  }
  if (typeof value !== "object") {
    fail("INPUT_VALUE_INVALID", "吠陀规则合同要求账对象 API 只接受 JSON 值。");
  }
  if (utilTypes.isProxy(value)) {
    fail("INPUT_PROXY_FORBIDDEN", "吠陀规则合同要求账对象 API 不接受 Proxy。");
  }
  if (state.active.has(value)) {
    fail("INPUT_CYCLE_FORBIDDEN", "吠陀规则合同要求账对象 API 不接受循环引用。");
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
      throw new VedicRuleContractRequirementsError(
        "INPUT_OBJECT_UNSAFE",
        "无法安全捕获吠陀规则合同要求账对象。",
        { cause }
      );
    }
    const descriptorKeys = Reflect.ownKeys(descriptors);
    if (descriptorKeys.some((key) => typeof key === "symbol")) {
      fail("INPUT_SYMBOL_FORBIDDEN", "吠陀规则合同要求账对象 API 不接受 Symbol 属性。");
    }
    if (array) {
      if (prototype !== Array.prototype) {
        fail("INPUT_PROTOTYPE_INVALID", "吠陀规则合同要求账数组原型无效。");
      }
      const lengthDescriptor = descriptors.length;
      const length = lengthDescriptor?.value;
      if (lengthDescriptor?.get || lengthDescriptor?.set
        || !Number.isSafeInteger(length) || length < 0 || length > 200_000) {
        fail("INPUT_ARRAY_INVALID", "吠陀规则合同要求账数组长度无效。");
      }
      const allowedKeys = new Set([
        "length",
        ...Array.from({ length }, (_entry, index) => String(index))
      ]);
      if (descriptorKeys.some((key) => !allowedKeys.has(key))) {
        fail("INPUT_ARRAY_INVALID", "吠陀规则合同要求账数组含额外属性。");
      }
      const result = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
          fail("INPUT_ARRAY_INVALID", "吠陀规则合同要求账不接受稀疏数组或访问器元素。");
        }
        result.push(capturePassiveJsonValue(descriptor.value, state, depth + 1));
      }
      return result;
    }
    if (prototype !== Object.prototype) {
      fail("INPUT_PROTOTYPE_INVALID", "吠陀规则合同要求账只接受普通 JSON 对象。");
    }
    const entries = [];
    for (const key of descriptorKeys) {
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
        fail("INPUT_ACCESSOR_FORBIDDEN", "吠陀规则合同要求账对象 API 不接受访问器或不可枚举字段。");
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
  fail("NON_CANONICAL_JSON", "吠陀规则合同要求账只接受有限规范 JSON 值。");
}

export function canonicalStringifyVedicRuleContractRequirements(value) {
  return JSON.stringify(canonicalValue(capturePassiveJsonSnapshot(value)));
}

export function canonicalPrettyStringifyVedicRuleContractRequirements(value) {
  return `${JSON.stringify(canonicalValue(capturePassiveJsonSnapshot(value)), null, 2)}\n`;
}

function domainSeparatedDigest(domain, value) {
  return createHash("sha256")
    .update(domain, "utf8")
    .update("\0", "utf8")
    .update(canonicalStringifyVedicRuleContractRequirements(value), "utf8")
    .digest("hex");
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

export function parseVedicRuleContractRequirementsJsonBytes(
  bytes,
  label = "吠陀规则合同要求账 JSON",
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
    throw new VedicRuleContractRequirementsError(
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
      throw new VedicRuleContractRequirementsError(
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
    throw new VedicRuleContractRequirementsError(
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
    throw new VedicRuleContractRequirementsError(
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
      sourceFilename: "vedic-rule-contract-requirements.json",
      sourceType: "script"
    });
  } catch (cause) {
    throw new VedicRuleContractRequirementsError(
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
    if (cause instanceof VedicRuleContractRequirementsError) throw cause;
    throw new VedicRuleContractRequirementsError(
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
    fail("UNSAFE_ARTIFACT_PATH", "吠陀规则合同要求账路径不安全。");
  }
  const root = path.resolve(workspaceRoot);
  const absolute = path.resolve(root, ...segments);
  const relative = path.relative(root, absolute);
  if (relative === ""
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative)) {
    fail("UNSAFE_ARTIFACT_PATH", "吠陀规则合同要求账路径越界。");
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
    if (cause instanceof VedicRuleContractRequirementsError) throw cause;
    throw new VedicRuleContractRequirementsError(missingCode, `${label} 不存在。`, { cause });
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
    if (cause instanceof VedicRuleContractRequirementsError) throw cause;
    throw new VedicRuleContractRequirementsError(
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

function canonicalUtc(value) {
  if (typeof value !== "string" || !CANONICAL_UTC_PATTERN.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
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
    if (!text.includes(marker)) {
      fail("ADR_SEMANTIC_MISMATCH", "吠陀产品边界 ADR 缺少批准的规则边界语义。");
    }
  }
  const projection = adrSemanticIdentityProjection();
  const semanticDigest = domainSeparatedDigest(ADR_SEMANTIC_DIGEST_DOMAIN, projection);
  if (semanticDigest !== EXPECTED_ADR_SEMANTIC_DIGEST) {
    fail("ADR_SEMANTIC_MISMATCH", "吠陀产品边界 ADR 语义身份无效。");
  }
  return Object.freeze({ projection, semanticDigest });
}

async function verifyInputDraftSnapshot(workspaceRoot, snapshot) {
  requireExactRawIdentity(snapshot, EXPECTED_INPUT_DRAFT_RAW_IDENTITY, "吠陀输入合同草案");
  let schema;
  try {
    schema = parseVedicInputContractDraftJsonBytes(snapshot.bytes);
  } catch (cause) {
    throw new VedicRuleContractRequirementsError(
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
    throw new VedicRuleContractRequirementsError(
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
  return Object.freeze({ semanticDigest });
}

async function verifyInputRequirementsSnapshot(workspaceRoot, snapshot) {
  requireExactRawIdentity(snapshot, EXPECTED_INPUT_REQUIREMENTS_RAW_IDENTITY, "吠陀输入合同要求账");
  let ledger;
  try {
    ledger = parseVedicInputContractRequirementsJsonBytes(snapshot.bytes);
  } catch (cause) {
    throw new VedicRuleContractRequirementsError(
      typeof cause?.code === "string"
        ? `INPUT_REQUIREMENTS_${cause.code}`
        : "INPUT_REQUIREMENTS_INVALID",
      "吠陀输入合同要求账不能严格解析。",
      { cause }
    );
  }
  if (canonicalPrettyStringifyVedicInputContractRequirements(ledger)
    !== decodeStrictUtf8(snapshot.bytes, "吠陀输入合同要求账")) {
    fail("INPUT_REQUIREMENTS_MATERIALIZATION_MISMATCH", "吠陀输入合同要求账不是 canonical materialization。");
  }
  let verified;
  try {
    verified = await verifyVedicInputContractRequirementsLedger(workspaceRoot, ledger);
  } catch (cause) {
    throw new VedicRuleContractRequirementsError(
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
  return Object.freeze({ ledgerDigest: ledger.ledgerDigest });
}

async function verifyFactDraftSnapshot(workspaceRoot, snapshot) {
  requireExactRawIdentity(snapshot, EXPECTED_FACT_DRAFT_RAW_IDENTITY, "吠陀事实合同草案");
  let schema;
  try {
    schema = parseVedicFactContractDraftJsonBytes(snapshot.bytes);
  } catch (cause) {
    throw new VedicRuleContractRequirementsError(
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
    throw new VedicRuleContractRequirementsError(
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
    || verified.publicReleaseAuthorized !== false) {
    fail("FACT_DRAFT_SEMANTIC_MISMATCH", "吠陀事实合同草案未保持零实例未准入边界。");
  }
  return Object.freeze({ semanticDigest });
}

async function verifyFactRequirementsSnapshot(workspaceRoot, snapshot) {
  requireExactRawIdentity(snapshot, EXPECTED_FACT_REQUIREMENTS_RAW_IDENTITY, "吠陀事实合同要求账");
  let ledger;
  try {
    ledger = parseVedicFactContractRequirementsJsonBytes(snapshot.bytes);
  } catch (cause) {
    throw new VedicRuleContractRequirementsError(
      typeof cause?.code === "string"
        ? `FACT_REQUIREMENTS_${cause.code}`
        : "FACT_REQUIREMENTS_INVALID",
      "吠陀事实合同要求账不能严格解析。",
      { cause }
    );
  }
  if (canonicalPrettyStringifyVedicFactContractRequirements(ledger)
    !== decodeStrictUtf8(snapshot.bytes, "吠陀事实合同要求账")) {
    fail("FACT_REQUIREMENTS_MATERIALIZATION_MISMATCH", "吠陀事实合同要求账不是 canonical materialization。");
  }
  let verified;
  try {
    verified = await verifyVedicFactContractRequirementsLedger(workspaceRoot, ledger);
  } catch (cause) {
    throw new VedicRuleContractRequirementsError(
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
  return Object.freeze({ ledgerDigest: ledger.ledgerDigest });
}

function resolveJsonPointer(root, pointer) {
  if (typeof pointer !== "string" || !pointer.startsWith("/")) {
    fail("RULE_DRAFT_POINTER_INVALID", "吠陀规则要求账含无效 JSON Pointer。");
  }
  let cursor = root;
  for (const encoded of pointer.slice(1).split("/")) {
    const segment = encoded.replaceAll("~1", "/").replaceAll("~0", "~");
    if (cursor === null || typeof cursor !== "object" || !Object.hasOwn(cursor, segment)) {
      fail("RULE_DRAFT_POINTER_UNRESOLVED", `吠陀规则要求账指针不能解析：${pointer}`);
    }
    cursor = cursor[segment];
  }
  return cursor;
}

function requirePointerCoverage(schema) {
  if (!exactJson(schema["x-hakimiBoundary"]?.blockedPrerequisiteIds, BLOCKED_PREREQUISITE_IDS)) {
    fail("RULE_DRAFT_PREREQUISITE_MISMATCH", "吠陀规则草案 prerequisite 顺序或集合漂移。");
  }
  for (let index = 0; index < PREREQUISITE_SPECS.length; index += 1) {
    const spec = PREREQUISITE_SPECS[index];
    const blockedPointer = `/x-hakimiBoundary/blockedPrerequisiteIds/${index}`;
    if (resolveJsonPointer(schema, blockedPointer) !== spec.requirementId) {
      fail("RULE_DRAFT_PREREQUISITE_MISMATCH", "吠陀规则草案 prerequisite 索引漂移。");
    }
    for (const pointer of spec.schemaPointers) resolveJsonPointer(schema, pointer);
  }
}

async function verifyRuleDraftSnapshot(workspaceRoot, snapshot) {
  requireExactRawIdentity(snapshot, EXPECTED_RULE_DRAFT_RAW_IDENTITY, "吠陀规则合同草案");
  let schema;
  try {
    schema = parseVedicRuleContractDraftJsonBytes(snapshot.bytes);
  } catch (cause) {
    throw new VedicRuleContractRequirementsError(
      typeof cause?.code === "string" ? `RULE_DRAFT_${cause.code}` : "RULE_DRAFT_INVALID",
      "吠陀规则合同草案不能严格解析。",
      { cause }
    );
  }
  if (canonicalPrettyStringifyVedicRuleContractDraft(schema)
    !== decodeStrictUtf8(snapshot.bytes, "吠陀规则合同草案")) {
    fail("RULE_DRAFT_MATERIALIZATION_MISMATCH", "吠陀规则合同草案不是 canonical materialization。");
  }
  const semanticDigest = computeVedicRuleContractDraftSemanticDigest(schema);
  let verified;
  try {
    verified = await verifyVedicRuleContractDraft(workspaceRoot, schema);
  } catch (cause) {
    throw new VedicRuleContractRequirementsError(
      typeof cause?.code === "string" ? `RULE_DRAFT_${cause.code}` : "RULE_DRAFT_INVALID",
      "吠陀规则合同草案未通过当前闭包验证。",
      { cause }
    );
  }
  requirePointerCoverage(schema);
  if (!exactJson(vedicRuleContractDraftTestOnly.expectedDraftRawIdentity, EXPECTED_RULE_DRAFT_RAW_IDENTITY)
    || !exactJson(vedicRuleContractDraftTestOnly.blockedPrerequisiteIds, BLOCKED_PREREQUISITE_IDS)
    || semanticDigest !== EXPECTED_RULE_DRAFT_SEMANTIC_DIGEST
    || verified.schemaSemanticDigest !== EXPECTED_RULE_DRAFT_SEMANTIC_DIGEST
    || verified.artifactRole !== "project_authored_isolated_rule_contract_draft"
    || verified.schemaStatus !== "isolated_contract_draft"
    || verified.blockedPrerequisitesDefined !== PREREQUISITE_SPECS.length
    || verified.blockedPrerequisitesResolved !== 0
    || verified.blockedPrerequisitesUniverseClosed !== false
    || verified.ruleDefinitionsIncluded !== 0
    || verified.ruleInstancesObserved !== 0
    || verified.rulesetInstancesObserved !== 0
    || verified.ruleEvaluationCapability !== false
    || verified.rulesetExecutionCapability !== false
    || verified.ruleContractGateSatisfied !== false
    || verified.versionedRulesetGateSatisfied !== false
    || verified.releaseReady !== false
    || verified.publicReleaseAuthorized !== false) {
    fail("RULE_DRAFT_SEMANTIC_MISMATCH", "吠陀规则合同草案未保持零实例未准入边界。");
  }
  return Object.freeze({ schema, semanticDigest });
}

function artifactBinding(snapshot, identity) {
  return {
    artifactRole: identity.artifactRole,
    bytes: snapshot.size,
    path: identity.path,
    rawHashAndSemanticInspectionUseSameBuffer: true,
    ...(identity.schemaSemanticDigest
      ? { schemaSemanticDigest: identity.schemaSemanticDigest, schemaStatus: "isolated_contract_draft" }
      : {}),
    ...(identity.ledgerDigest ? { ledgerDigest: identity.ledgerDigest } : {}),
    ...(identity.requirementsResolved !== undefined
      ? { requirementsResolved: identity.requirementsResolved }
      : {}),
    ...(identity.requirementsUniverseClosed !== undefined
      ? { requirementsUniverseClosed: identity.requirementsUniverseClosed }
      : {}),
    ...(identity.status ? { status: identity.status } : {}),
    sha256: snapshot.sha256
  };
}

function emptyRequirement(spec, index) {
  const schemaPointers = [
    `/x-hakimiBoundary/blockedPrerequisiteIds/${index}`,
    ...spec.schemaPointers
  ];
  return {
    algorithmBindingRefs: [],
    artifactRefs: schemaPointers.map((pointer) =>
      `${VEDIC_RULE_CONTRACT_DRAFT_RELATIVE_PATH}#${pointer}`),
    defaultDefinition: null,
    evidenceRefs: [],
    expertRefs: [],
    order: index + 1,
    requirementClass: spec.requirementClass,
    requirementId: spec.requirementId,
    requirementState: "named_and_structurally_covered_semantics_unresolved",
    rightsRefs: [],
    ruleDefinitionInstances: [],
    ruleEvaluationInstances: [],
    ruleInstances: [],
    rulesetInstances: [],
    schemaPointers,
    selectedDefinition: null,
    sourceRefs: []
  };
}

export async function buildCurrentVedicRuleContractRequirementsLedger(workspaceRoot) {
  const [
    adrSnapshot,
    inputDraftSnapshot,
    inputRequirementsSnapshot,
    factDraftSnapshot,
    factRequirementsSnapshot,
    ruleDraftSnapshot
  ] = await Promise.all([
    readStableWorkspaceFile(workspaceRoot, VEDIC_BOUNDARY_ADR_RELATIVE_PATH, MAX_BOUND_ARTIFACT_BYTES,
      { missingCode: "ADR_MISSING", invalidCode: "ADR_ENDPOINT_INVALID", label: "吠陀产品边界 ADR" }),
    readStableWorkspaceFile(workspaceRoot, VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH, MAX_BOUND_ARTIFACT_BYTES,
      { missingCode: "INPUT_DRAFT_MISSING", invalidCode: "INPUT_DRAFT_ENDPOINT_INVALID", label: "吠陀输入合同草案" }),
    readStableWorkspaceFile(workspaceRoot, VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH, MAX_BOUND_ARTIFACT_BYTES,
      { missingCode: "INPUT_REQUIREMENTS_MISSING", invalidCode: "INPUT_REQUIREMENTS_ENDPOINT_INVALID", label: "吠陀输入合同要求账" }),
    readStableWorkspaceFile(workspaceRoot, VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH, MAX_BOUND_ARTIFACT_BYTES,
      { missingCode: "FACT_DRAFT_MISSING", invalidCode: "FACT_DRAFT_ENDPOINT_INVALID", label: "吠陀事实合同草案" }),
    readStableWorkspaceFile(workspaceRoot, VEDIC_FACT_CONTRACT_REQUIREMENTS_RELATIVE_PATH, MAX_BOUND_ARTIFACT_BYTES,
      { missingCode: "FACT_REQUIREMENTS_MISSING", invalidCode: "FACT_REQUIREMENTS_ENDPOINT_INVALID", label: "吠陀事实合同要求账" }),
    readStableWorkspaceFile(workspaceRoot, VEDIC_RULE_CONTRACT_DRAFT_RELATIVE_PATH, MAX_BOUND_ARTIFACT_BYTES,
      { missingCode: "RULE_DRAFT_MISSING", invalidCode: "RULE_DRAFT_ENDPOINT_INVALID", label: "吠陀规则合同草案" })
  ]);

  const adrSemantic = verifyAdrSnapshot(adrSnapshot);
  const inputDraftSemantic = await verifyInputDraftSnapshot(workspaceRoot, inputDraftSnapshot);
  const inputRequirementsSemantic = await verifyInputRequirementsSnapshot(workspaceRoot, inputRequirementsSnapshot);
  const factDraftSemantic = await verifyFactDraftSnapshot(workspaceRoot, factDraftSnapshot);
  const factRequirementsSemantic = await verifyFactRequirementsSnapshot(workspaceRoot, factRequirementsSnapshot);
  const ruleDraftSemantic = await verifyRuleDraftSnapshot(workspaceRoot, ruleDraftSnapshot);
  const requirements = PREREQUISITE_SPECS.map(emptyRequirement);
  const ruleContractDraft = artifactBinding(ruleDraftSnapshot, {
    artifactRole: "project_authored_isolated_rule_contract_draft",
    path: VEDIC_RULE_CONTRACT_DRAFT_RELATIVE_PATH,
    schemaSemanticDigest: ruleDraftSemantic.semanticDigest
  });
  const unsigned = {
    authorityBoundary: {
      domainAuthorityAuthorized: false,
      expertClaimsAuthorized: false,
      formalAdmissionAuthorized: false,
      highRiskClaimsAuthorized: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      releaseReady: false,
      ruleContractAccepted: false,
      ruleContractGateSatisfied: false,
      ruleReceiptIssued: false,
      successReceiptIssued: false,
      versionedRulesetGateSatisfied: false
    },
    boundaryBindings: {
      bindingDirection:
        "requirements_to_adr_input_draft_input_requirements_fact_draft_fact_requirements_and_rule_draft_only",
      chainOrder: [...CHAIN_ORDER],
      factContractDraft: artifactBinding(factDraftSnapshot, {
        artifactRole: "project_authored_isolated_fact_contract_draft",
        path: VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH,
        schemaSemanticDigest: factDraftSemantic.semanticDigest
      }),
      factContractRequirements: artifactBinding(factRequirementsSnapshot, {
        artifactRole: "non_product_governance_fact_requirements_inventory",
        path: VEDIC_FACT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
        ledgerDigest: factRequirementsSemantic.ledgerDigest,
        requirementsResolved: 0,
        requirementsUniverseClosed: false,
        status: "fact_contract_draft_present_zero_instances_values_producer_projector_absent_not_admitted"
      }),
      inputContractDraft: artifactBinding(inputDraftSnapshot, {
        artifactRole: "project_authored_isolated_input_contract_draft",
        path: VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH,
        schemaSemanticDigest: inputDraftSemantic.semanticDigest
      }),
      inputContractRequirements: artifactBinding(inputRequirementsSnapshot, {
        artifactRole: "non_product_governance_requirements_inventory",
        path: VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
        ledgerDigest: inputRequirementsSemantic.ledgerDigest,
        requirementsResolved: 0,
        status: "input_contract_draft_present_zero_instances_not_admitted"
      }),
      productBoundaryAdr: {
        bytes: adrSnapshot.size,
        path: VEDIC_BOUNDARY_ADR_RELATIVE_PATH,
        rawHashAndSemanticInspectionUseSameBuffer: true,
        semanticIdentity: {
          ...adrSemantic.projection,
          semanticDigest: adrSemantic.semanticDigest
        },
        sha256: adrSnapshot.sha256
      },
      ruleContractDraft
    },
    createdAt: LEDGER_CREATED_AT,
    currentInstances: {
      counts: {
        ruleCandidates: 0,
        ruleContractArtifacts: 1,
        ruleDefinitions: 0,
        ruleEvaluatorInstances: 0,
        ruleFailureReceipts: 0,
        ruleImplementationInstances: 0,
        ruleInstances: 0,
        ruleReceipts: 0,
        rulesetInstances: 0,
        successReceipts: 0
      },
      ruleCandidates: [],
      ruleContractArtifacts: [ruleContractDraft],
      ruleDefinitions: [],
      ruleEvaluatorInstances: [],
      ruleFailureReceipts: [],
      ruleImplementationInstances: [],
      ruleInstances: [],
      ruleReceipts: [],
      rulesetInstances: [],
      successReceipts: []
    },
    doesNotEstablish: [...DOES_NOT_ESTABLISH],
    evidenceLedger: {
      browserRuntimeEvidence: "not_assessed",
      contentTruth: "not_established",
      engineeringIdentity:
        "isolated_rule_contract_v0_1_shape_thirteen_named_open_prerequisites_and_zero_instances_only",
      expertTruth: "not_established",
      highRiskPolicyAdmission: "not_admitted",
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
      missingOrAmbiguousPrerequisite:
        "block_without_rule_failure_acceptance_or_success_receipt",
      partialRulesPersisted: false,
      placeholderRulesMaterialized: false
    },
    highRiskBoundary: {
      abstentionPolicyAdmitted: false,
      highRiskClaimsAuthorized: false,
      highRiskPolicy: "absent",
      highRiskPolicyRefs: []
    },
    integrityBoundary: {
      authenticityEstablished: false,
      digestAlgorithm: "SHA-256",
      digestDomain: LEDGER_DIGEST_DOMAIN,
      digestIsDigitalSignature: false,
      digitalSignature: null,
      signerIdentity: null
    },
    ledgerId: "hakimi.vedic.rule-contract-requirements/1.0.0",
    observationBoundary: {
      abaExcluded: false,
      boundArtifactHashAndInspectionUseSameReadBuffer: true,
      crossFileAtomicSnapshot: false,
      endpointSnapshotOnly: true,
      heldFileHandleReads: true,
      intervalMutationExcluded: false,
      ledgerHashAndParseUseSameReadBuffer: true,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      pathEndpointRevalidated: true,
      plainDirectoryChainRequired: true,
      ruleDraftAndRequirementsAtomicSnapshot: false,
      upstreamAndRequirementsAtomicSnapshot: false
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
      ruleContract: "isolated_contract_draft",
      ruleEvaluator: "absent",
      targetSchema: null,
      versionedRuleset: "absent"
    },
    recordType: "vedic_rule_contract_requirements_v1",
    requirementInventory: {
      bindingRequired: null,
      bindingRequirementsInventoryDefined: false,
      inventoryScope: "v0.1_scoped",
      requirements,
      requirementsDefined: requirements.length,
      requirementsDraftCovered: requirements.length,
      requirementsInventoryDefined: true,
      requirementsResolved: 0,
      requirementsUniverseClosed: false,
      ruleContractArtifactPresent: true,
      ruleContractGateSatisfied: false,
      versionedRulesetGateSatisfied: false
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
      "rule_contract_draft_present_zero_rule_instances_evaluator_and_versioned_ruleset_absent_not_admitted",
    systemIdentity: {
      artifactRole: "non_product_governance_rule_requirements_inventory",
      contractSystemId: "vedic",
      productSystemId: "vedic-astrology"
    },
    zeroInstanceRequirementsReceipt: {
      countsTowardAdmission: false,
      receiptClass: "rule_contract_draft_present_zero_instance_observation",
      receiptIsProductReceipt: false,
      receiptIsRuleReceipt: false,
      receiptStatus:
        "rule_contract_draft_present_zero_rule_instances_evaluator_and_versioned_ruleset_absent_not_admitted",
      requirementsDraftCovered: requirements.length,
      requirementsResolved: 0,
      requirementsUniverseClosed: false,
      ruleCandidatesObserved: 0,
      ruleContractArtifacts: 1,
      ruleContractGateSatisfied: false,
      ruleDefinitionsObserved: 0,
      ruleEvaluatorInstances: 0,
      ruleFailureReceipts: 0,
      ruleImplementationInstances: 0,
      ruleInstancesObserved: 0,
      ruleReceiptIssued: false,
      ruleReceipts: 0,
      rulesetInstancesObserved: 0,
      successReceiptIssued: false,
      successReceipts: 0,
      versionedRulesetGateSatisfied: false,
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

function requireBindingIdentity(binding, expected, options = {}) {
  if (binding?.path !== expected.path
    || binding.bytes !== expected.bytes
    || binding.sha256 !== expected.sha256
    || binding.rawHashAndSemanticInspectionUseSameBuffer !== true
    || (options.artifactRole !== undefined && binding.artifactRole !== options.artifactRole)
    || (options.schemaSemanticDigest !== undefined
      && binding.schemaSemanticDigest !== options.schemaSemanticDigest)
    || (options.schemaStatus !== undefined && binding.schemaStatus !== options.schemaStatus)
    || (options.ledgerDigest !== undefined && binding.ledgerDigest !== options.ledgerDigest)
    || (options.status !== undefined && binding.status !== options.status)
    || (options.requirementsResolved !== undefined
      && binding.requirementsResolved !== options.requirementsResolved)
    || (options.requirementsUniverseClosed !== undefined
      && binding.requirementsUniverseClosed !== options.requirementsUniverseClosed)) {
    fail("BOUNDARY_BINDING_INVALID", `吠陀规则要求账上游身份无效：${expected.path}`);
  }
}

function requireStaticFailClosedBoundary(ledger) {
  const expectedStatus =
    "rule_contract_draft_present_zero_rule_instances_evaluator_and_versioned_ruleset_absent_not_admitted";
  if (!canonicalUtc(ledger.createdAt)
    || ledger.createdAt !== LEDGER_CREATED_AT
    || ledger.schemaVersion !== "1.0.0"
    || ledger.recordType !== "vedic_rule_contract_requirements_v1"
    || ledger.ledgerId !== "hakimi.vedic.rule-contract-requirements/1.0.0"
    || ledger.status !== expectedStatus) {
    fail("LEDGER_INVALID", "吠陀规则要求账根身份无效。");
  }

  const inventory = ledger.requirementInventory;
  if (inventory?.requirementsInventoryDefined !== true
    || inventory.inventoryScope !== "v0.1_scoped"
    || inventory.requirementsUniverseClosed !== false
    || inventory.bindingRequirementsInventoryDefined !== false
    || inventory.bindingRequired !== null
    || inventory.ruleContractArtifactPresent !== true
    || inventory.ruleContractGateSatisfied !== false
    || inventory.versionedRulesetGateSatisfied !== false
    || inventory.requirementsDefined !== PREREQUISITE_SPECS.length
    || inventory.requirementsDraftCovered !== PREREQUISITE_SPECS.length
    || inventory.requirementsResolved !== 0
    || !Array.isArray(inventory.requirements)
    || inventory.requirements.length !== PREREQUISITE_SPECS.length) {
    fail("REQUIREMENT_INVENTORY_INVALID", "吠陀规则要求清单摘要无效或错误声称闭合宇宙。");
  }
  for (let index = 0; index < PREREQUISITE_SPECS.length; index += 1) {
    if (!exactJson(inventory.requirements[index], emptyRequirement(PREREQUISITE_SPECS[index], index))) {
      fail("REQUIREMENT_ITEM_INVALID", "吠陀规则要求条目被闭合、选值、填充证据或改变顺序。");
    }
  }

  const receipt = ledger.zeroInstanceRequirementsReceipt;
  if (receipt?.receiptClass !== "rule_contract_draft_present_zero_instance_observation"
    || receipt.receiptStatus !== expectedStatus
    || receipt.requirementsDraftCovered !== PREREQUISITE_SPECS.length
    || receipt.requirementsResolved !== 0
    || receipt.requirementsUniverseClosed !== false
    || receipt.ruleContractArtifacts !== 1
    || receipt.ruleCandidatesObserved !== 0
    || receipt.ruleInstancesObserved !== 0
    || receipt.ruleDefinitionsObserved !== 0
    || receipt.rulesetInstancesObserved !== 0
    || receipt.ruleEvaluatorInstances !== 0
    || receipt.ruleImplementationInstances !== 0
    || receipt.ruleFailureReceipts !== 0
    || receipt.ruleReceipts !== 0
    || receipt.successReceipts !== 0
    || receipt.zeroFailureReceiptsMeansNoExecutionObserved !== true
    || receipt.ruleReceiptIssued !== false
    || receipt.successReceiptIssued !== false
    || receipt.receiptIsRuleReceipt !== false
    || receipt.receiptIsProductReceipt !== false
    || receipt.countsTowardAdmission !== false
    || receipt.ruleContractGateSatisfied !== false
    || receipt.versionedRulesetGateSatisfied !== false) {
    fail("ZERO_INSTANCE_RECEIPT_INVALID", "吠陀规则要求零实例观察回执无效。");
  }

  const counts = ledger.currentInstances?.counts;
  if (!counts || counts.ruleContractArtifacts !== 1
    || Object.entries(counts).some(([key, value]) => key !== "ruleContractArtifacts" && value !== 0)
    || !allEmptyArrays(ledger.currentInstances, [
      "ruleCandidates", "ruleDefinitions", "ruleEvaluatorInstances", "ruleFailureReceipts",
      "ruleImplementationInstances", "ruleInstances", "ruleReceipts", "rulesetInstances",
      "successReceipts"
    ])
    || !exactJson(
      ledger.currentInstances.ruleContractArtifacts,
      [ledger.boundaryBindings?.ruleContractDraft]
    )) {
    fail("CURRENT_INSTANCES_INVALID", "吠陀规则要求账不能包含规则、ruleset、evaluator 或回执实例。");
  }

  if (!exactJson(ledger.failClosedInvariants, {
    crossSystemFallbackAccepted: false,
    defaultInference: "forbidden",
    generativeModelInference: "forbidden",
    missingOrAmbiguousPrerequisite:
      "block_without_rule_failure_acceptance_or_success_receipt",
    partialRulesPersisted: false,
    placeholderRulesMaterialized: false
  })) {
    fail("FAIL_CLOSED_INVARIANT_INVALID", "吠陀规则要求账 fail-closed 边界无效。");
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
    ruleContract: "isolated_contract_draft",
    ruleEvaluator: "absent",
    targetSchema: null,
    versionedRuleset: "absent"
  })) {
    fail("PRODUCT_BOUNDARY_INVALID", "吠陀规则要求账不能借入产品、producer、evaluator 或 ruleset 身份。");
  }

  if (!exactJson(ledger.systemIdentity, {
    artifactRole: "non_product_governance_rule_requirements_inventory",
    contractSystemId: "vedic",
    productSystemId: "vedic-astrology"
  })) {
    fail("SYSTEM_IDENTITY_INVALID", "吠陀规则要求账必须保持非产品治理工件身份。");
  }

  if (!exactJson(ledger.evidenceLedger, {
    browserRuntimeEvidence: "not_assessed",
    contentTruth: "not_established",
    engineeringIdentity:
      "isolated_rule_contract_v0_1_shape_thirteen_named_open_prerequisites_and_zero_instances_only",
    expertTruth: "not_established",
    highRiskPolicyAdmission: "not_admitted",
    publicReleaseAuthorization: "not_authorized",
    releaseReadiness: "not_ready",
    rightsLegalConclusion: "not_established"
  })) {
    fail("EVIDENCE_LEDGER_INVALID", "吠陀规则要求账不得混账工程、内容、专家、权利或发布证据。");
  }

  if (!allFalse(ledger.authorityBoundary)) {
    fail("AUTHORITY_BOUNDARY_INVALID", "吠陀规则要求账不能晋级任何规则、权威、高风险或发布状态。");
  }

  if (!exactJson(ledger.highRiskBoundary, {
    abstentionPolicyAdmitted: false,
    highRiskClaimsAuthorized: false,
    highRiskPolicy: "absent",
    highRiskPolicyRefs: []
  })) {
    fail("HIGH_RISK_BOUNDARY_INVALID", "吠陀规则要求账不能填充或准入高风险政策。");
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
    fail("SOURCE_RIGHTS_BOUNDARY_INVALID", "吠陀规则要求账不能填充来源、binding、许可或权利证据。");
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
    fail("EXPERT_BOUNDARY_INVALID", "吠陀规则要求账不能填充专家实例或专家真值。");
  }

  if (!exactJson(ledger.observationBoundary, {
    abaExcluded: false,
    boundArtifactHashAndInspectionUseSameReadBuffer: true,
    crossFileAtomicSnapshot: false,
    endpointSnapshotOnly: true,
    heldFileHandleReads: true,
    intervalMutationExcluded: false,
    ledgerHashAndParseUseSameReadBuffer: true,
    mutationEpochAvailable: false,
    mutationEpochReceipt: null,
    pathEndpointRevalidated: true,
    plainDirectoryChainRequired: true,
    ruleDraftAndRequirementsAtomicSnapshot: false,
    upstreamAndRequirementsAtomicSnapshot: false
  })) {
    fail("OBSERVATION_BOUNDARY_INVALID", "吠陀规则要求账不能声称 epoch、原子快照或 ABA 排除。");
  }

  if (ledger.integrityBoundary?.digestAlgorithm !== "SHA-256"
    || ledger.integrityBoundary.digestDomain !== LEDGER_DIGEST_DOMAIN
    || ledger.integrityBoundary.digestIsDigitalSignature !== false
    || ledger.integrityBoundary.digitalSignature !== null
    || ledger.integrityBoundary.signerIdentity !== null
    || ledger.integrityBoundary.authenticityEstablished !== false) {
    fail("INTEGRITY_BOUNDARY_INVALID", "吠陀规则要求账 SHA-256 不能冒充签名或真实性。");
  }

  if (!exactJson(ledger.doesNotEstablish, [...DOES_NOT_ESTABLISH])) {
    fail("DOES_NOT_ESTABLISH_INVALID", "吠陀规则要求账否定边界无效。");
  }

  const bindings = ledger.boundaryBindings;
  if (bindings?.bindingDirection
      !== "requirements_to_adr_input_draft_input_requirements_fact_draft_fact_requirements_and_rule_draft_only"
    || !exactJson(bindings.chainOrder, [...CHAIN_ORDER])
    || new Set(bindings.chainOrder).size !== CHAIN_ORDER.length
    || bindings.chainOrder.includes(VEDIC_RULE_CONTRACT_REQUIREMENTS_RELATIVE_PATH)) {
    fail("BOUNDARY_CHAIN_INVALID", "吠陀规则要求账必须保持唯一、有序、单向且无自环的上游链。");
  }
  requireBindingIdentity(bindings.inputContractDraft, EXPECTED_INPUT_DRAFT_RAW_IDENTITY, {
    artifactRole: "project_authored_isolated_input_contract_draft",
    schemaSemanticDigest: EXPECTED_INPUT_DRAFT_SEMANTIC_DIGEST,
    schemaStatus: "isolated_contract_draft"
  });
  requireBindingIdentity(bindings.inputContractRequirements, EXPECTED_INPUT_REQUIREMENTS_RAW_IDENTITY, {
    artifactRole: "non_product_governance_requirements_inventory",
    ledgerDigest: EXPECTED_INPUT_REQUIREMENTS_LEDGER_DIGEST,
    requirementsResolved: 0,
    status: "input_contract_draft_present_zero_instances_not_admitted"
  });
  requireBindingIdentity(bindings.factContractDraft, EXPECTED_FACT_DRAFT_RAW_IDENTITY, {
    artifactRole: "project_authored_isolated_fact_contract_draft",
    schemaSemanticDigest: EXPECTED_FACT_DRAFT_SEMANTIC_DIGEST,
    schemaStatus: "isolated_contract_draft"
  });
  requireBindingIdentity(bindings.factContractRequirements, EXPECTED_FACT_REQUIREMENTS_RAW_IDENTITY, {
    artifactRole: "non_product_governance_fact_requirements_inventory",
    ledgerDigest: EXPECTED_FACT_REQUIREMENTS_LEDGER_DIGEST,
    requirementsResolved: 0,
    requirementsUniverseClosed: false,
    status: "fact_contract_draft_present_zero_instances_values_producer_projector_absent_not_admitted"
  });
  requireBindingIdentity(bindings.ruleContractDraft, EXPECTED_RULE_DRAFT_RAW_IDENTITY, {
    artifactRole: "project_authored_isolated_rule_contract_draft",
    schemaSemanticDigest: EXPECTED_RULE_DRAFT_SEMANTIC_DIGEST,
    schemaStatus: "isolated_contract_draft"
  });
  const { semanticDigest: boundAdrSemanticDigest, ...boundAdrProjection } =
    bindings.productBoundaryAdr?.semanticIdentity ?? {};
  if (bindings.productBoundaryAdr?.path !== EXPECTED_ADR_RAW_IDENTITY.path
    || bindings.productBoundaryAdr.bytes !== EXPECTED_ADR_RAW_IDENTITY.bytes
    || bindings.productBoundaryAdr.sha256 !== EXPECTED_ADR_RAW_IDENTITY.sha256
    || bindings.productBoundaryAdr.rawHashAndSemanticInspectionUseSameBuffer !== true
    || boundAdrSemanticDigest !== EXPECTED_ADR_SEMANTIC_DIGEST
    || !exactJson(boundAdrProjection, adrSemanticIdentityProjection())) {
    fail("BOUNDARY_BINDING_INVALID", "吠陀规则要求账 ADR 绑定无效。");
  }
  const bindingText = canonicalStringifyVedicRuleContractRequirements(bindings);
  if (bindingText.includes("vedic-independent-productization-requirements")
    || bindingText.includes("four-system-admission")) {
    fail("PARENT_BACKLINK_FORBIDDEN", "吠陀规则要求账不得回绑 parent 或中央准入账。");
  }

  if (typeof ledger.ledgerDigest !== "string"
    || !SHA256_PATTERN.test(ledger.ledgerDigest)
    || computeVedicRuleContractRequirementsDigest(ledger) !== ledger.ledgerDigest) {
    fail("LEDGER_DIGEST_MISMATCH", "吠陀规则要求账 ledgerDigest 无效。");
  }
}

export function computeVedicRuleContractRequirementsDigest(ledgerInput) {
  const ledger = capturePassiveJsonSnapshot(ledgerInput);
  const { ledgerDigest: _ledgerDigest, ...unsigned } = ledger;
  return domainSeparatedDigest(LEDGER_DIGEST_DOMAIN, unsigned);
}

export async function readVedicRuleContractRequirementsLedger(workspaceRoot) {
  const snapshot = await readStableWorkspaceFile(
    workspaceRoot,
    VEDIC_RULE_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
    MAX_LEDGER_BYTES,
    {
      missingCode: "LEDGER_MISSING",
      invalidCode: "LEDGER_ENDPOINT_INVALID",
      label: "吠陀规则要求账"
    }
  );
  const ledger = parseVedicRuleContractRequirementsJsonBytes(snapshot.bytes);
  if (canonicalPrettyStringifyVedicRuleContractRequirements(ledger)
    !== new TextDecoder("utf-8", { fatal: true }).decode(snapshot.bytes)) {
    fail("LEDGER_MATERIALIZATION_MISMATCH", "吠陀规则要求账不是 canonical materialization。");
  }
  return ledger;
}

export async function verifyVedicRuleContractRequirementsLedger(workspaceRoot, ledgerInput) {
  const ledger = capturePassiveJsonSnapshot(ledgerInput);
  requireStaticFailClosedBoundary(ledger);
  const expected = await buildCurrentVedicRuleContractRequirementsLedger(workspaceRoot);
  if (canonicalStringifyVedicRuleContractRequirements(ledger)
    !== canonicalStringifyVedicRuleContractRequirements(expected)) {
    fail("LEDGER_CURRENT_CLOSURE_MISMATCH", "吠陀规则要求账与当前批准边界不一致。");
  }
  const frozenLedger = deepFreezeJson(capturePassiveJsonSnapshot(ledger));
  return Object.freeze({
    ledger: frozenLedger,
    ledgerDigest: frozenLedger.ledgerDigest,
    status: frozenLedger.status,
    requirementsDefined: frozenLedger.requirementInventory.requirementsDefined,
    requirementsDraftCovered: frozenLedger.requirementInventory.requirementsDraftCovered,
    requirementsResolved: frozenLedger.requirementInventory.requirementsResolved,
    requirementsUniverseClosed: frozenLedger.requirementInventory.requirementsUniverseClosed,
    ruleContractArtifacts: frozenLedger.zeroInstanceRequirementsReceipt.ruleContractArtifacts,
    ruleInstancesObserved: frozenLedger.zeroInstanceRequirementsReceipt.ruleInstancesObserved,
    ruleContractGateSatisfied: frozenLedger.requirementInventory.ruleContractGateSatisfied,
    versionedRulesetGateSatisfied:
      frozenLedger.requirementInventory.versionedRulesetGateSatisfied,
    releaseReady: frozenLedger.authorityBoundary.releaseReady,
    publicReleaseAuthorized: frozenLedger.authorityBoundary.publicReleaseAuthorized
  });
}

export const vedicRuleContractRequirementsTestOnly = Object.freeze({
  blockedPrerequisiteIds: BLOCKED_PREREQUISITE_IDS,
  chainOrder: CHAIN_ORDER,
  expectedAdrRawIdentity: EXPECTED_ADR_RAW_IDENTITY,
  expectedFactDraftRawIdentity: EXPECTED_FACT_DRAFT_RAW_IDENTITY,
  expectedFactRequirementsRawIdentity: EXPECTED_FACT_REQUIREMENTS_RAW_IDENTITY,
  expectedInputDraftRawIdentity: EXPECTED_INPUT_DRAFT_RAW_IDENTITY,
  expectedInputRequirementsRawIdentity: EXPECTED_INPUT_REQUIREMENTS_RAW_IDENTITY,
  expectedRuleDraftRawIdentity: EXPECTED_RULE_DRAFT_RAW_IDENTITY,
  expectedRuleDraftSemanticDigest: EXPECTED_RULE_DRAFT_SEMANTIC_DIGEST,
  prerequisitePointerMap: PREREQUISITE_POINTER_MAP,
  requirementSpecs: PREREQUISITE_SPECS,
  safeWorkspaceFile
});

function exactJson(left, right) {
  return canonicalStringifyVedicRuleContractRequirements(left)
    === canonicalStringifyVedicRuleContractRequirements(right);
}
