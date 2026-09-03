import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { TextDecoder, types as utilTypes } from "node:util";
import { parseExpression } from "@babel/parser";
import {
  canonicalPrettyStringifyVedicRuleContractRequirements,
  parseVedicRuleContractRequirementsJsonBytes,
  verifyVedicRuleContractRequirementsLedger
} from "./vedic-rule-contract-requirements-lib.mjs";
import {
  canonicalPrettyStringifyVedicRealIndependentExpertReviewPlan,
  parseVedicRealIndependentExpertReviewPlanJsonBytes,
  verifyVedicRealIndependentExpertReviewPlan
} from "./vedic-real-independent-expert-review-plan-lib.mjs";

export const VEDIC_HIGH_RISK_EXPRESSION_POLICY_DRAFT_RELATIVE_PATH =
  "content/system-admission/vedic-high-risk-expression-policy-draft.v0.1.0.json";

const ADR_RELATIVE_PATH = "docs/吠陀占星独立产品化ADR-0001-2026-08-26.md";
const RULE_REQUIREMENTS_RELATIVE_PATH =
  "content/system-admission/vedic-rule-contract-requirements.v1.json";
const EXPERT_PLAN_RELATIVE_PATH =
  "content/system-admission/vedic-real-independent-expert-review-plan.v1.json";
const POLICY_ID = "hakimi.vedic.high-risk-expression-policy-draft/0.1.0";
const POLICY_CREATED_AT = "2026-08-30T00:00:00.000Z";
const POLICY_DIGEST_DOMAIN = "hakimi.vedic.high-risk-expression-policy-draft.v0.1";
const ADR_SEMANTIC_DIGEST_DOMAIN = "hakimi.vedic.independent-product-boundary-adr.v1";
const MAX_POLICY_BYTES = 1_000_000;
const MAX_BOUND_FILE_BYTES = 2_000_000;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const TYPED_ARRAY_PROTOTYPE = Object.getPrototypeOf(Uint8Array.prototype);
const TYPED_ARRAY_BYTE_LENGTH_GETTER =
  Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "byteLength").get;
const TYPED_ARRAY_BUFFER_GETTER =
  Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "buffer").get;
const ARRAY_BUFFER_RESIZABLE_GETTER =
  Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "resizable")?.get;
const UINT8_ARRAY_SET = Uint8Array.prototype.set;

const EXPECTED_ADR_IDENTITY = Object.freeze({
  bytes: 4_531,
  path: ADR_RELATIVE_PATH,
  semanticDigest: "1a71b363132b0d61298f53f7e14eb77d58a3eb3f7d649d8d3c8f42fd1acd1a89",
  sha256: "0e9b81505abb963b4d64426338b8071cd8a211eed8d02fe76065fada335dce63"
});
const EXPECTED_RULE_REQUIREMENTS_IDENTITY = Object.freeze({
  bytes: 30_734,
  ledgerDigest: "fbaad8625fc10d112ccf47f7c5aae358a49305fe2d560a08d02f506194c4156f",
  path: RULE_REQUIREMENTS_RELATIVE_PATH,
  sha256: "ee34106b3dccdfd5d08d89d3871161ba2a12f7bcc983aff8b4850aa6ee42bc94"
});
const EXPECTED_EXPERT_PLAN_IDENTITY = Object.freeze({
  bytes: 37_131,
  path: EXPERT_PLAN_RELATIVE_PATH,
  planDigest: "2eb4dc9c037403e47f332cc105755bfb86aa8ad6dc0b95dbaf29e80d7bdfd1af",
  sha256: "9bcbff519dd38d40f26dfba1ccabe1c2987700200cf3a7f6eb7bf68254d7cf89"
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

const UPSTREAM_PROHIBITED_CLASSES = Object.freeze([
  "health",
  "legal",
  "financial",
  "death_or_lifespan",
  "disaster_or_calamity",
  "scientific_validity_claim",
  "prediction_accuracy_claim"
]);

const ADDITIONAL_CONSERVATIVE_CLASSES = Object.freeze([
  Object.freeze({
    classId: "pregnancy_fertility_or_reproductive_outcome",
    disposition: "block_or_abstain",
    rationale: "health_adjacent_sensitive_outcome_requires_separate_clinical_and_policy_authority"
  }),
  Object.freeze({
    classId: "caste_varna_jati_or_protected_characteristic_inference",
    disposition: "block",
    rationale: "protected_or_status_inference_must_not_be_derived_from_chart_material"
  }),
  Object.freeze({
    classId: "criminality_moral_worth_or_spiritual_worth_judgment",
    disposition: "block",
    rationale: "identity_and_moral_determinism_is_out_of_scope"
  }),
  Object.freeze({
    classId: "relationship_marriage_or_compatibility_inevitability",
    disposition: "block_or_abstain",
    rationale: "relationship_outcomes_must_not_be_presented_as_inevitable"
  }),
  Object.freeze({
    classId: "remedy_ritual_mantra_gemstone_substitution_or_spend_pressure",
    disposition: "block",
    rationale: "remedies_must_not_replace_professional_care_or_create_coercive_spend_pressure"
  }),
  Object.freeze({
    classId: "minor_targeted_deterministic_or_high_stakes_claim",
    disposition: "block",
    rationale: "minors_require_the_most_conservative_non_deterministic_boundary"
  }),
  Object.freeze({
    classId: "self_harm_crisis_or_violence",
    disposition: "block_and_direct_to_immediate_human_or_emergency_support_when_applicable",
    rationale: "chart_material_must_not_predict_normalize_or_direct_self_harm_crisis_or_violence"
  }),
  Object.freeze({
    classId: "privacy_sensitive_personal_or_third_party_inference",
    disposition: "block",
    rationale: "sensitive_personal_or_third_party_attributes_must_not_be_inferred_from_chart_material"
  }),
  Object.freeze({
    classId: "employment_education_or_irreversible_life_decision_determinism",
    disposition: "block_or_abstain",
    rationale: "high_impact_life_decisions_must_not_be_directed_as_deterministic_chart_outcomes"
  })
]);

const REQUIRED_BLOCKERS = Object.freeze([
  "vedic_product_not_integrated",
  "formal_input_contract_not_admitted",
  "deterministic_fact_producer_and_fact_receipts_absent",
  "versioned_ruleset_evaluator_and_rule_receipts_absent",
  "ayanamsa_ephemeris_time_scale_node_and_bhava_choices_not_frozen",
  "birth_time_timezone_dst_or_location_semantics_missing_or_ambiguous",
  "birth_time_uncertainty_or_school_conflict_unresolved",
  "source_binding_body_quote_or_locator_missing",
  "work_version_or_carrier_rights_evidence_missing",
  "rights_legal_conclusion_missing",
  "two_real_independent_expert_reviews_missing_or_disputed",
  "high_risk_policy_enforcement_and_runtime_receipts_absent",
  "release_evidence_or_public_deployment_authorization_absent",
  "cross_system_authority_or_concept_equivalence_borrowed",
  "requested_output_exceeds_frozen_fact_rule_source_rights_expert_scope"
]);

const DISAGREEMENT_TYPES = Object.freeze([
  Object.freeze({ disposition: "split_versioned_school_profiles_or_defer", type: "school" }),
  Object.freeze({ disposition: "split_input_policies_and_recompute_or_defer", type: "input_semantics" }),
  Object.freeze({ disposition: "keep_binding_unverified", type: "source_edition_or_carrier" }),
  Object.freeze({ disposition: "preserve_side_by_side_and_defer", type: "rule_interpretation" }),
  Object.freeze({ disposition: "repair_and_require_two_new_independent_reviews", type: "engineering_error" }),
  Object.freeze({ disposition: "more_conservative_expression_or_no_release", type: "high_risk_expression" }),
  Object.freeze({ disposition: "defer", type: "cannot_decide" })
]);

const POLICY_SCENARIOS = Object.freeze([
  Object.freeze({ expectedDisposition: "block", scenarioId: "synthetic-health-diagnosis", triggerClass: "health" }),
  Object.freeze({ expectedDisposition: "block", scenarioId: "synthetic-legal-guilt", triggerClass: "legal" }),
  Object.freeze({ expectedDisposition: "block", scenarioId: "synthetic-investment-guarantee", triggerClass: "financial" }),
  Object.freeze({ expectedDisposition: "block", scenarioId: "synthetic-lifespan-date", triggerClass: "death_or_lifespan" }),
  Object.freeze({ expectedDisposition: "block", scenarioId: "synthetic-disaster-certainty", triggerClass: "disaster_or_calamity" }),
  Object.freeze({ expectedDisposition: "block", scenarioId: "synthetic-scientific-proof", triggerClass: "scientific_validity_claim" }),
  Object.freeze({ expectedDisposition: "block", scenarioId: "synthetic-accuracy-rate", triggerClass: "prediction_accuracy_claim" }),
  Object.freeze({ expectedDisposition: "block", scenarioId: "synthetic-caste-inference", triggerClass: "caste_varna_jati_or_protected_characteristic_inference" }),
  Object.freeze({ expectedDisposition: "block", scenarioId: "synthetic-remedy-spend-pressure", triggerClass: "remedy_ritual_mantra_gemstone_substitution_or_spend_pressure" }),
  Object.freeze({ expectedDisposition: "block", scenarioId: "synthetic-self-harm-certainty", triggerClass: "self_harm_crisis_or_violence" }),
  Object.freeze({ expectedDisposition: "block", scenarioId: "synthetic-third-party-sensitive-inference", triggerClass: "privacy_sensitive_personal_or_third_party_inference" }),
  Object.freeze({ expectedDisposition: "abstain", scenarioId: "synthetic-missing-ayanamsa", triggerClass: "missing_prerequisite" }),
  Object.freeze({ expectedDisposition: "defer_or_no_release", scenarioId: "synthetic-unresolved-expert-disagreement", triggerClass: "expert_disagreement" }),
  Object.freeze({ expectedDisposition: "diagnostic_only", scenarioId: "synthetic-structural-precheck", triggerClass: "engineering_diagnostic" })
]);

export class VedicHighRiskExpressionPolicyDraftError extends Error {
  constructor(code, message, options = undefined) {
    super(`${code}: ${message}`, options);
    this.name = "VedicHighRiskExpressionPolicyDraftError";
    this.code = code;
  }
}

function fail(code, message, cause = undefined) {
  throw new VedicHighRiskExpressionPolicyDraftError(
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
  if (seen.has(value)) fail("NON_JSON_VALUE", `${label} 含循环引用。`);
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
    const descriptor = descriptors[key];
    if (isArray && key === "length") continue;
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

export function canonicalStringifyVedicHighRiskExpressionPolicyDraft(value) {
  assertPlainJson(value);
  return JSON.stringify(canonicalize(value));
}

export function canonicalPrettyStringifyVedicHighRiskExpressionPolicyDraft(value) {
  assertPlainJson(value);
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}

function domainDigest(domain, value) {
  return sha256(Buffer.from(`${domain}\0${canonicalStringifyVedicHighRiskExpressionPolicyDraft(value)}`, "utf8"));
}

function copyJson(value) {
  return JSON.parse(canonicalStringifyVedicHighRiskExpressionPolicyDraft(value));
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function withoutPolicyDigest(policyInput) {
  const policy = copyJson(policyInput);
  delete policy.policyDigest;
  return policy;
}

export function computeVedicHighRiskExpressionPolicyDraftDigest(policyInput) {
  return domainDigest(POLICY_DIGEST_DOMAIN, withoutPolicyDigest(policyInput));
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
    fail("JSON_INVALID", `${label} 必须是可读取内部槽的 Uint8Array。`, cause);
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
  if (captured.byteLength >= 3 && captured[0] === 0xef && captured[1] === 0xbb && captured[2] === 0xbf) {
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
      sourceFilename: "vedic-high-risk-expression-policy-draft.json",
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
        if (keys.has(property.key.value)) fail("JSON_DUPLICATE_KEY", `${label} 含重复对象键。`);
        keys.add(property.key.value);
      }
    }
    for (const [key, child] of Object.entries(node)) {
      if (key === "loc" || key === "start" || key === "end" || key === "extra") continue;
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

export function parseVedicHighRiskExpressionPolicyDraftJsonBytes(
  bytes,
  label = "吠陀高风险表达政策草案"
) {
  return parseStrictJsonBytes(bytes, label, MAX_POLICY_BYTES);
}

function safeWorkspaceFile(workspaceRoot, relativePath) {
  const segments = typeof relativePath === "string" ? relativePath.split("/") : [];
  if (typeof relativePath !== "string" || relativePath.length < 1 || relativePath.length > 320
    || relativePath.includes("\0") || relativePath.includes("\\") || relativePath.startsWith("/")
    || path.posix.normalize(relativePath) !== relativePath
    || segments.some((segment) => segment === "" || segment === "." || segment === ".." || segment.includes(":"))) {
    fail("UNSAFE_ARTIFACT_PATH", `路径不安全：${String(relativePath)}`);
  }
  const root = path.resolve(workspaceRoot);
  const absolute = path.resolve(root, ...segments);
  const relative = path.relative(root, absolute);
  if (relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) {
    fail("UNSAFE_ARTIFACT_PATH", `路径越出工作区：${relativePath}`);
  }
  return absolute;
}

function isSameOrWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function sameEndpoint(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.nlink === right.nlink
    && left.size === right.size && left.mtimeNs === right.mtimeNs && left.ctimeNs === right.ctimeNs;
}

async function captureDirectoryChain(workspaceRoot, absolutePath, code, label) {
  const root = path.resolve(workspaceRoot);
  const targetDirectory = path.dirname(absolutePath);
  if (!isSameOrWithin(root, targetDirectory)) fail(code, `${label}目录越出工作区。`);
  const relative = path.relative(root, targetDirectory);
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
  let actual;
  try {
    chainBefore = await captureDirectoryChain(workspaceRoot, absolute, options.invalidCode, options.label);
    [before, actual] = await Promise.all([lstat(absolute, { bigint: true }), realpath(absolute)]);
  } catch (cause) {
    if (cause instanceof VedicHighRiskExpressionPolicyDraftError) throw cause;
    fail(options.missingCode, `${options.label}不存在。`, cause);
  }
  if (!isSameOrWithin(chainBefore[0].resolvedPath, actual) || before.isSymbolicLink() || !before.isFile()
    || before.nlink !== 1n || before.size <= 0n || before.size > BigInt(maxBytes)) {
    fail(options.invalidCode, `${options.label}必须是工作区内独立普通小文件。`);
  }
  const noFollow = typeof fsConstants.O_NOFOLLOW === "number" ? fsConstants.O_NOFOLLOW : 0;
  const handle = await open(actual, fsConstants.O_RDONLY | noFollow);
  try {
    const opened = await handle.stat({ bigint: true });
    if (!opened.isFile() || opened.nlink !== 1n || !sameEndpoint(before, opened)) {
      fail(options.invalidCode, `${options.label}在打开前发生身份换绑。`);
    }
    const bytes = await readAtMost(handle, maxBytes, options.invalidCode, options.label);
    const [afterHandle, afterPath, actualAfter, chainAfter] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(absolute, { bigint: true }),
      realpath(absolute),
      captureDirectoryChain(workspaceRoot, absolute, options.invalidCode, options.label)
    ]);
    if (afterPath.isSymbolicLink() || !afterPath.isFile() || afterPath.nlink !== 1n
      || BigInt(bytes.byteLength) !== opened.size || !sameEndpoint(opened, afterHandle)
      || !sameEndpoint(opened, afterPath) || actualAfter !== actual
      || !sameDirectoryChain(chainBefore, chainAfter)) {
      fail(options.invalidCode, `${options.label}在读取端点之间发生变化。`);
    }
    return Object.freeze({ bytes, path: relativePath, sha256: sha256(bytes), size: bytes.byteLength });
  } finally {
    await handle.close();
  }
}

function requireIdentity(snapshot, expected, label) {
  if (snapshot.path !== expected.path || snapshot.size !== expected.bytes || snapshot.sha256 !== expected.sha256) {
    fail("UPSTREAM_IDENTITY_MISMATCH", `${label}原始字节身份漂移。`);
  }
}

function parseAdrSemanticIdentity(bytes) {
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (cause) {
    fail("ADR_UTF8_INVALID", "吠陀产品边界 ADR 不是严格 UTF-8。", cause);
  }
  const requiredMarkers = [
    "- 状态：accepted-research-boundary",
    "- productStatus：`research-only`",
    "- integrationStatus：`not-integrated`",
    "- authorityStatus：`not-authoritative`",
    "- publicReleaseAuthorized：`false`",
    "## 现实专家与高风险表达门",
    "在专家和来源门关闭前，任何输出只能是工程诊断或研究候选，不得生成健康、法律、财务、生死、灾祸等高风险断言，也不得声称科学有效性或预测准确率。",
    "## 重新评审条件"
  ];
  if (requiredMarkers.some((marker) => !text.includes(marker))) {
    fail("ADR_SEMANTIC_MISMATCH", "吠陀产品边界 ADR 的关键 fail-closed 语义缺失。");
  }
  const semanticIdentity = copyJson(ADR_SEMANTIC_IDENTITY);
  const digest = domainDigest(ADR_SEMANTIC_DIGEST_DOMAIN, semanticIdentity);
  if (digest !== EXPECTED_ADR_IDENTITY.semanticDigest) {
    fail("ADR_SEMANTIC_DIGEST_MISMATCH", "吠陀产品边界 ADR 语义摘要常量无效。");
  }
  return { ...semanticIdentity, semanticDigest: digest };
}

function assertExactJson(actual, expected, code, message) {
  if (canonicalStringifyVedicHighRiskExpressionPolicyDraft(actual)
    !== canonicalStringifyVedicHighRiskExpressionPolicyDraft(expected)) {
    fail(code, message);
  }
}

async function readAndVerifyUpstreams(workspaceRoot) {
  const [adrSnapshot, ruleSnapshot, expertSnapshot] = await Promise.all([
    readStableWorkspaceFile(workspaceRoot, ADR_RELATIVE_PATH, MAX_BOUND_FILE_BYTES, {
      invalidCode: "ADR_ENDPOINT_INVALID", label: "吠陀产品边界 ADR", missingCode: "ADR_MISSING"
    }),
    readStableWorkspaceFile(workspaceRoot, RULE_REQUIREMENTS_RELATIVE_PATH, MAX_BOUND_FILE_BYTES, {
      invalidCode: "RULE_REQUIREMENTS_ENDPOINT_INVALID", label: "吠陀规则合同要求账", missingCode: "RULE_REQUIREMENTS_MISSING"
    }),
    readStableWorkspaceFile(workspaceRoot, EXPERT_PLAN_RELATIVE_PATH, MAX_BOUND_FILE_BYTES, {
      invalidCode: "EXPERT_PLAN_ENDPOINT_INVALID", label: "吠陀现实独立专家计划", missingCode: "EXPERT_PLAN_MISSING"
    })
  ]);
  requireIdentity(adrSnapshot, EXPECTED_ADR_IDENTITY, "吠陀产品边界 ADR");
  requireIdentity(ruleSnapshot, EXPECTED_RULE_REQUIREMENTS_IDENTITY, "吠陀规则合同要求账");
  requireIdentity(expertSnapshot, EXPECTED_EXPERT_PLAN_IDENTITY, "吠陀现实独立专家计划");

  const adrSemanticIdentity = parseAdrSemanticIdentity(adrSnapshot.bytes);
  const ruleLedger = parseVedicRuleContractRequirementsJsonBytes(ruleSnapshot.bytes);
  const expertPlan = parseVedicRealIndependentExpertReviewPlanJsonBytes(expertSnapshot.bytes);
  if (new TextDecoder("utf-8", { fatal: true }).decode(ruleSnapshot.bytes)
      !== canonicalPrettyStringifyVedicRuleContractRequirements(ruleLedger)
    || new TextDecoder("utf-8", { fatal: true }).decode(expertSnapshot.bytes)
      !== canonicalPrettyStringifyVedicRealIndependentExpertReviewPlan(expertPlan)) {
    fail("UPSTREAM_MATERIALIZATION_MISMATCH", "上游 JSON 必须是唯一 canonical materialization。");
  }
  const [ruleResult, expertResult] = await Promise.all([
    verifyVedicRuleContractRequirementsLedger(workspaceRoot, ruleLedger),
    verifyVedicRealIndependentExpertReviewPlan(workspaceRoot, expertPlan)
  ]);
  if (ruleResult.ledgerDigest !== EXPECTED_RULE_REQUIREMENTS_IDENTITY.ledgerDigest
    || ruleLedger.ledgerDigest !== EXPECTED_RULE_REQUIREMENTS_IDENTITY.ledgerDigest) {
    fail("RULE_REQUIREMENTS_DIGEST_MISMATCH", "吠陀规则合同要求账摘要漂移。");
  }
  if (expertResult.planDigest !== EXPECTED_EXPERT_PLAN_IDENTITY.planDigest
    || expertPlan.planDigest !== EXPECTED_EXPERT_PLAN_IDENTITY.planDigest) {
    fail("EXPERT_PLAN_DIGEST_MISMATCH", "吠陀现实独立专家计划摘要漂移。");
  }
  const highRiskRequirement = ruleLedger.requirementInventory.requirements.find(
    (entry) => entry.requirementId === "high_risk_output_policy_abstention_and_failure_semantics"
  );
  assertExactJson(highRiskRequirement, {
    algorithmBindingRefs: [],
    artifactRefs: [
      "content/system-admission/vedic-rule-contract-draft.v0.1.0.schema.json#/x-hakimiBoundary/blockedPrerequisiteIds/11",
      "content/system-admission/vedic-rule-contract-draft.v0.1.0.schema.json#/properties/ruleDefinitionEnvelope/properties/high_risk_policy_ref",
      "content/system-admission/vedic-rule-contract-draft.v0.1.0.schema.json#/properties/rulesetEnvelope/properties/high_risk_policy_ref"
    ],
    defaultDefinition: null,
    evidenceRefs: [],
    expertRefs: [],
    order: 12,
    requirementClass: "v0_1_scoped_rule_prerequisite",
    requirementId: "high_risk_output_policy_abstention_and_failure_semantics",
    requirementState: "named_and_structurally_covered_semantics_unresolved",
    rightsRefs: [],
    ruleDefinitionInstances: [],
    ruleEvaluationInstances: [],
    ruleInstances: [],
    rulesetInstances: [],
    schemaPointers: [
      "/x-hakimiBoundary/blockedPrerequisiteIds/11",
      "/properties/ruleDefinitionEnvelope/properties/high_risk_policy_ref",
      "/properties/rulesetEnvelope/properties/high_risk_policy_ref"
    ],
    selectedDefinition: null,
    sourceRefs: []
  }, "RULE_HIGH_RISK_REQUIREMENT_MISMATCH", "吠陀规则高风险前提不再是零实例未决要求。");
  assertExactJson(ruleLedger.highRiskBoundary, {
    abstentionPolicyAdmitted: false,
    highRiskClaimsAuthorized: false,
    highRiskPolicy: "absent",
    highRiskPolicyRefs: []
  }, "RULE_HIGH_RISK_BOUNDARY_PROMOTED", "规则要求账不得把高风险政策冒充已准入。");
  assertExactJson(expertPlan.highRiskExpressionReviewPlan, {
    disagreementDisposition: "conservative_expression_or_no_release",
    highRiskPolicyEstablished: false,
    planDefined: true,
    prohibitedBeforeSeparatePolicyAndAdmission: [...UPSTREAM_PROHIBITED_CLASSES],
    reviewQuestionId: "rule-independent-review-disagreement-and-high-risk-expression",
    separateHighRiskPolicyGateStillRequired: true
  }, "EXPERT_HIGH_RISK_PLAN_MISMATCH", "专家计划中的独立高风险政策停止线漂移。");
  if (expertPlan.zeroInstanceReceipt.reviewerSlotsDefined !== 2
    || expertPlan.zeroInstanceReceipt.reviewerSlotsOccupied !== 0
    || expertPlan.zeroInstanceReceipt.independentExpertReviewsVerified !== 0
    || expertPlan.zeroInstanceReceipt.opinionsVerified !== 0
    || expertPlan.reviewStarted !== false
    || expertPlan.gateBoundary.expertReviewBundleComplete !== false
    || expertPlan.gateBoundary.countsTowardExpertGate !== false) {
    fail("EXPERT_ZERO_INSTANCE_BOUNDARY_PROMOTED", "现实专家仍必须保持 0/2 零实例红门。");
  }
  return Object.freeze({
    adr: {
      bytes: adrSnapshot.size,
      path: adrSnapshot.path,
      rawHashAndSemanticInspectionUseSameBuffer: true,
      semanticIdentity: adrSemanticIdentity,
      sha256: adrSnapshot.sha256
    },
    expertPlan: {
      bytes: expertSnapshot.size,
      path: expertSnapshot.path,
      planDigest: expertPlan.planDigest,
      rawHashAndSemanticInspectionUseSameBuffer: true,
      sha256: expertSnapshot.sha256,
      status: expertPlan.status
    },
    ruleRequirements: {
      bytes: ruleSnapshot.size,
      ledgerDigest: ruleLedger.ledgerDigest,
      path: ruleSnapshot.path,
      rawHashAndSemanticInspectionUseSameBuffer: true,
      sha256: ruleSnapshot.sha256,
      status: ruleLedger.status
    }
  });
}

function buildPolicy(upstream) {
  const base = {
    admissionProjection: {
      admissionGatesSatisfied: 0,
      admissionGatesRequired: 8,
      highRiskPolicyCandidatePresent: true,
      highRiskPolicyEstablished: false,
      highRiskPolicyGateSatisfied: false,
      parentLedgerUpdated: false,
      projectedRequirementState: "requirements_only_candidate_present_zero_enforcement_not_admitted",
      requirementsMaterialDefined: true,
      registryUpdated: false
    },
    authorityBoundary: {
      baziAuthorityInherited: false,
      contentTruthEstablished: false,
      domainAuthorityAuthorized: false,
      expertClaimsAuthorized: false,
      expertTruthEstablished: false,
      formalAdmissionAuthorized: false,
      highRiskClaimsAuthorized: false,
      policyAdmitted: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      releaseReady: false,
      rightsLegalConclusionEstablished: false
    },
    createdAt: POLICY_CREATED_AT,
    decisionContract: {
      allowedDispositions: ["block", "abstain", "defer", "diagnostic_only", "conservative_expression", "no_release"],
      defaultDisposition: "block",
      disagreementTypes: copyJson(DISAGREEMENT_TYPES),
      evaluationOrder: [
        "validate_system_and_input_prerequisites",
        "validate_fact_rule_source_rights_and_expert_scope",
        "detect_prohibited_or_sensitive_claim_class",
        "preserve_unresolved_disagreement_without_winner_selection",
        "emit_only_structured_block_abstention_defer_or_diagnostic_disposition"
      ],
      forbiddenResolutionMethods: [
        "majority_vote",
        "opinion_average",
        "weighted_cross_system_score",
        "generative_model_winner_selection",
        "silent_default_or_fallback",
        "merge_disagreements_into_middle_claim"
      ],
      missingAmbiguousOrUnverifiedPrerequisite: "block_or_abstain_without_content_claim",
      unresolvedHighRiskDisagreement: "more_conservative_expression_or_no_release"
    },
    doesNotEstablish: [
      "admitted_or_runtime_enforced_high_risk_policy",
      "vedic_input_fact_rule_or_report_contract_admission",
      "vedic_rule_definition_evaluator_ruleset_or_receipt",
      "source_body_quote_locator_or_frozen_binding",
      "work_version_carrier_rights_or_legal_conclusion",
      "expert_identity_credentials_independence_opinion_or_truth",
      "scientific_validity_prediction_accuracy_or_domain_truth",
      "health_legal_financial_or_other_high_stakes_authority",
      "cross_system_authority_inheritance_or_concept_equivalence",
      "browser_runtime_storage_backup_recovery_or_release_evidence",
      "mutation_epoch_cross_file_atomic_snapshot_interval_mutation_or_aba_exclusion",
      "formal_admission_release_readiness_public_deployment_or_public_release_authorization"
    ],
    enforcementBoundary: {
      browserValidated: false,
      classifierInstances: 0,
      enforcementImplemented: false,
      enforcementReceipts: 0,
      outputGeneratorInstances: 0,
      policyEvaluatorInstances: 0,
      productReportsObserved: 0,
      receiptIssued: false,
      runtimeIntegrated: false,
      runtimeExecutionsObserved: 0,
      successReceipts: 0,
      userInputsOrPersonDataIncluded: false
    },
    evidenceLedger: {
      browserRuntimeEvidence: "not_assessed",
      contentTruth: "not_established",
      engineeringIdentity: "project_authored_requirements_only_policy_material_with_three_current_upstream_identities",
      expertTruth: "not_established",
      policyMaterialCoverage: "complete_for_v0_1_draft",
      policyRuntimeEnforcement: "absent",
      publicReleaseAuthorization: "not_authorized",
      releaseReadiness: "not_ready",
      rightsLegalConclusion: "not_established"
    },
    expertBoundary: {
      expertReviewBundleComplete: false,
      expertReviewStarted: false,
      independentExpertReviewsVerified: 0,
      independentExpertsRequired: 2,
      modelMayFormatOrIndexOpinionsOnly: true,
      modelMaySelectWinner: false,
      opinionsVerified: 0,
      policyExpertReviewed: false,
      reviewerSeatsFilled: 0
    },
    integrityBoundary: {
      authenticityEstablished: false,
      digestAlgorithm: "SHA-256",
      digestDomain: POLICY_DIGEST_DOMAIN,
      digestIsDigitalSignature: false,
      digitalSignature: null,
      signerIdentity: null
    },
    observationBoundary: {
      abaExcluded: false,
      boundArtifactHashAndInspectionUseSameReadBuffer: true,
      crossFileAtomicSnapshot: false,
      heldFileHandleReads: true,
      intervalMutationExcluded: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      pathEndpointRevalidated: true,
      plainDirectoryChainRequired: true,
      policyHashAndParseUseSameReadBuffer: true,
      policyUpstreamsAtomicSnapshot: false
    },
    policyId: POLICY_ID,
    policyMaterial: {
      additionalConservativeClasses: copyJson(ADDITIONAL_CONSERVATIVE_CLASSES),
      allowedNonClaimOutputClasses: [
        "structured_block_notice",
        "structured_abstention_notice",
        "engineering_diagnostic_without_person_interpretation",
        "provenance_or_missing_prerequisite_inventory",
        "uncertainty_and_non_comparability_notice",
        "human_review_referral_without_authority_claim"
      ],
      anchoredRequiredProhibitedClasses: [...UPSTREAM_PROHIBITED_CLASSES],
      containsInterpretationTemplates: false,
      containsRuleBodies: false,
      policyMaterialCoverageComplete: true,
      prohibitedOutputPatterns: [
        "deterministic_or_guaranteed_outcome",
        "date_or_probability_for_death_disaster_disease_crime_profit_or_legal_result",
        "diagnosis_treatment_or_professional_advice_substitution",
        "scientific_validation_or_accuracy_rate_without_separate_admissible_evidence",
        "fear_pressure_urgency_or_paid_remedy_coercion",
        "protected_characteristic_status_or_moral_worth_inference",
        "cross_system_vote_average_weight_or_composite_destiny_score",
        "unresolved_expert_disagreement_hidden_or_auto_resolved"
      ],
      requiredBlockers: [...REQUIRED_BLOCKERS],
      riskUniverseClosed: false,
      scenarios: copyJson(POLICY_SCENARIOS)
    },
    productBoundary: {
      activeAdmissionEffect: "none",
      centralRegistryIntegration: "absent",
      domainManifest: "absent",
      integrationStatus: "not-integrated",
      legacyV13Inherited: false,
      migrationId: null,
      productStatus: "research-only",
      productSurface: "absent",
      releaseIdentity: null,
      schema13Inherited: false,
      targetSchema: null
    },
    recordType: "vedic_high_risk_expression_policy_draft_v0_1",
    sourceRightsBoundary: {
      bindingFrozenVerified: 0,
      bindingRequiredCurrentScoped: 38,
      requirementsUniverseClosed: false,
      rightsEstablished: false,
      rightsLegalConclusionEstablished: false,
      sourceBindingEstablished: false,
      sourceBodiesBound: 0,
      threeLayerRightsRecordsVerified: 0
    },
    status: "requirements_only_engineering_candidate_not_admitted",
    systemIdentity: {
      comparisonIncluded: false,
      systemId: "vedic",
      systemName: "Vedic astrology independent research boundary"
    },
    upstreamClosure: {
      bindingDirection: "adr_rule_requirements_and_expert_plan_to_policy_draft_only",
      childBindsOrRewritesUpstreams: false,
      productBoundaryAdr: upstream.adr,
      realIndependentExpertReviewPlan: upstream.expertPlan,
      ruleContractRequirements: upstream.ruleRequirements
    }
  };
  return { ...base, policyDigest: domainDigest(POLICY_DIGEST_DOMAIN, base) };
}

function verifyPolicyShape(policy) {
  if (!SHA256_PATTERN.test(policy.policyDigest ?? "")
    || computeVedicHighRiskExpressionPolicyDraftDigest(policy) !== policy.policyDigest) {
    fail("POLICY_DIGEST_MISMATCH", "吠陀高风险表达政策草案摘要无效。");
  }
  if (!policy.authorityBoundary
    || Object.values(policy.authorityBoundary).some((value) => value !== false)
    || policy.admissionProjection?.highRiskPolicyEstablished !== false
    || policy.admissionProjection?.highRiskPolicyGateSatisfied !== false
    || policy.admissionProjection?.admissionGatesSatisfied !== 0
    || policy.productBoundary?.activeAdmissionEffect !== "none"
    || policy.productBoundary?.releaseIdentity !== null
    || policy.productBoundary?.targetSchema !== null
    || policy.productBoundary?.migrationId !== null
    || policy.productBoundary?.legacyV13Inherited !== false
    || policy.productBoundary?.schema13Inherited !== false
    || policy.enforcementBoundary?.enforcementImplemented !== false
    || Object.entries(policy.enforcementBoundary ?? {}).some(([key, value]) =>
      ["browserValidated", "enforcementImplemented", "receiptIssued", "runtimeIntegrated", "userInputsOrPersonDataIncluded"].includes(key)
        ? value !== false
        : value !== 0)
    || policy.expertBoundary?.independentExpertReviewsVerified !== 0
    || policy.expertBoundary?.reviewerSeatsFilled !== 0
    || policy.expertBoundary?.opinionsVerified !== 0
    || policy.expertBoundary?.expertReviewStarted !== false
    || policy.expertBoundary?.expertReviewBundleComplete !== false
    || policy.expertBoundary?.policyExpertReviewed !== false
    || policy.sourceRightsBoundary?.bindingFrozenVerified !== 0
    || policy.sourceRightsBoundary?.sourceBodiesBound !== 0
    || policy.sourceRightsBoundary?.threeLayerRightsRecordsVerified !== 0
    || policy.sourceRightsBoundary?.sourceBindingEstablished !== false
    || policy.sourceRightsBoundary?.rightsEstablished !== false
    || policy.sourceRightsBoundary?.rightsLegalConclusionEstablished !== false
    || policy.sourceRightsBoundary?.requirementsUniverseClosed !== false
    || policy.policyMaterial?.containsInterpretationTemplates !== false
    || policy.policyMaterial?.containsRuleBodies !== false
    || policy.policyMaterial?.riskUniverseClosed !== false) {
    fail("AUTHORITY_PROMOTION_FORBIDDEN", "requirements-only 草案不得晋级任何领域、专家、权利、运行时或发布门。");
  }
  assertExactJson(
    policy.policyMaterial?.anchoredRequiredProhibitedClasses,
    [...UPSTREAM_PROHIBITED_CLASSES],
    "PROHIBITED_CLASS_SET_MISMATCH",
    "上游七类高风险禁区必须精确保留。"
  );
  if (!Array.isArray(policy.policyMaterial?.requiredBlockers)
    || policy.policyMaterial.requiredBlockers.length !== REQUIRED_BLOCKERS.length
    || new Set(policy.policyMaterial.requiredBlockers).size !== REQUIRED_BLOCKERS.length
    || !Array.isArray(policy.policyMaterial?.scenarios)
    || policy.policyMaterial.scenarios.length !== POLICY_SCENARIOS.length) {
    fail("POLICY_COVERAGE_MISMATCH", "草案阻断条件或固定 scenario 覆盖漂移。");
  }
}

export async function buildCurrentVedicHighRiskExpressionPolicyDraft(workspaceRoot) {
  const upstream = await readAndVerifyUpstreams(workspaceRoot);
  const policy = buildPolicy(upstream);
  verifyPolicyShape(policy);
  return deepFreeze(copyJson(policy));
}

export async function readVedicHighRiskExpressionPolicyDraft(workspaceRoot) {
  const snapshot = await readStableWorkspaceFile(
    workspaceRoot,
    VEDIC_HIGH_RISK_EXPRESSION_POLICY_DRAFT_RELATIVE_PATH,
    MAX_POLICY_BYTES,
    {
      invalidCode: "POLICY_ENDPOINT_INVALID",
      label: "吠陀高风险表达政策草案",
      missingCode: "POLICY_MISSING"
    }
  );
  const policy = parseVedicHighRiskExpressionPolicyDraftJsonBytes(snapshot.bytes);
  if (new TextDecoder("utf-8", { fatal: true }).decode(snapshot.bytes)
    !== canonicalPrettyStringifyVedicHighRiskExpressionPolicyDraft(policy)) {
    fail("POLICY_MATERIALIZATION_MISMATCH", "政策草案不是唯一 canonical LF materialization。");
  }
  verifyPolicyShape(policy);
  const expected = await buildCurrentVedicHighRiskExpressionPolicyDraft(workspaceRoot);
  if (canonicalStringifyVedicHighRiskExpressionPolicyDraft(policy)
    !== canonicalStringifyVedicHighRiskExpressionPolicyDraft(expected)) {
    fail("POLICY_CURRENT_EXPECTATION_MISMATCH", "固定路径政策草案与当前三份上游闭包不一致。");
  }
  return deepFreeze(copyJson(policy));
}

export async function verifyVedicHighRiskExpressionPolicyDraft(workspaceRoot, policyInput) {
  assertPlainJson(policyInput, "policyInput");
  verifyPolicyShape(policyInput);
  const expected = await buildCurrentVedicHighRiskExpressionPolicyDraft(workspaceRoot);
  if (canonicalStringifyVedicHighRiskExpressionPolicyDraft(policyInput)
    !== canonicalStringifyVedicHighRiskExpressionPolicyDraft(expected)) {
    fail("POLICY_CURRENT_EXPECTATION_MISMATCH", "政策草案与当前三份上游闭包不一致。");
  }
  return deepFreeze({
    activeAdmissionEffect: "none",
    admissionGatesSatisfied: 0,
    highRiskPolicyEstablished: false,
    highRiskPolicyGateSatisfied: false,
    policy: copyJson(expected),
    policyDigest: expected.policyDigest,
    policyEnforced: false,
    policyMaterialCoverageComplete: true,
    publicReleaseAuthorized: false,
    receiptIssued: false,
    status: expected.status
  });
}

export const vedicHighRiskExpressionPolicyDraftTestOnly = Object.freeze({
  additionalConservativeClasses: ADDITIONAL_CONSERVATIVE_CLASSES,
  expectedAdrIdentity: EXPECTED_ADR_IDENTITY,
  expectedExpertPlanIdentity: EXPECTED_EXPERT_PLAN_IDENTITY,
  expectedRuleRequirementsIdentity: EXPECTED_RULE_REQUIREMENTS_IDENTITY,
  policyScenarios: POLICY_SCENARIOS,
  readStableWorkspaceFile,
  requiredBlockers: REQUIRED_BLOCKERS,
  upstreamProhibitedClasses: UPSTREAM_PROHIBITED_CLASSES
});
