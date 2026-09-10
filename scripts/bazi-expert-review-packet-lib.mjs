import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TextDecoder, types as utilTypes } from "node:util";
import { parseExpression } from "@babel/parser";
import { verifyBaziEngineeringBindingCandidateLedger } from "./bazi-engineering-binding-candidate-lib.mjs";
import { verifyBaziSourceBindingCandidateLedger } from "./bazi-source-binding-candidate-lib.mjs";
import { verifyBaziSourceRightsCandidateLedger } from "./bazi-source-rights-candidate-lib.mjs";

export const BAZI_EXPERT_REVIEW_PACKET_RELATIVE_PATH =
  "content/bazi-strength-expert-review-packet.v1.json";
export const BAZI_EXPERT_REVIEW_INTAKE_GAP_RELATIVE_PATH =
  "content/system-admission/bazi-expert-review-intake-gap.v1.json";
export const BAZI_EXPERT_REVIEW_INTAKE_READINESS_BASIS_RELATIVE_PATH =
  "scripts/fixtures/bazi-expert-intake-readiness-1.5.original.json";

const BAZI_EXPERT_REVIEW_READINESS_LEDGER_RELATIVE_PATH =
  "content/system-admission/bazi-binding-freeze-requirements.v1.json";
const APPROVED_PACKET_ID = "hakimi.bazi.strength.expert-review-packet/1.5.0";
const APPROVED_PACKET_CREATED_AT = "2026-08-25T20:17:10.106Z";
const APPROVED_PACKET_DIGEST = "cfe554b60b4698e0acd0a42e14484f4683eb7663d4f6862b767cf70404d2cd5f";
const APPROVED_PACKET_RAW_BYTES = 12_684;
const APPROVED_PACKET_RAW_SHA256 = "ba28de1b95d57de4320913e7a0b00fe780630d15408c5b22b84311977ea29163";
const APPROVED_READINESS_LEDGER_ID = "hakimi.bazi.strength.binding-freeze-readiness/1.5.0";
const APPROVED_READINESS_LEDGER_DIGEST = "feea402079cab44a5d3e0855f867114684da96e4005343a1b1a7cdc75fbee9ad";
const APPROVED_READINESS_LEDGER_RAW_BYTES = 26_038;
const APPROVED_READINESS_LEDGER_RAW_SHA256 = "662c91e6269d5e860a0d207185680ea7c7b752f24e313859c0d987cb5b446201";
const APPROVED_INTAKE_GAP_LEDGER_DIGEST = "6cf349fda4c4fd2b8ddada22417e12741c37abc6fc884338dbf5c741e0fc1766";
const APPROVED_INTAKE_GAP_RAW_BYTES = 4_309;
const APPROVED_INTAKE_GAP_RAW_SHA256 = "7d01f000358f6938675c34fbebf6379e55c3f56dadee12fab6a3d801b33ef6ac";

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const MAX_PACKET_BYTES = 1_000_000;
const MAX_ARTIFACT_BYTES = 5_000_000;
const PRIVATE_ORIGINAL_OPINION_CONTEXT_TYPE = "bazi_private_original_opinion_context_v1";
const PRIVATE_IDENTITY_DOSSIER_CONTEXT_TYPE = "bazi_private_identity_dossier_context_v1";
const APPROVED_WORKSPACE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const privateOriginalOpinionContextState = new WeakMap();
const privateIdentityDossierContextState = new WeakMap();

const PRIVATE_ORIGINAL_OPINION_ARTIFACT_DOMAIN = Object.freeze({
  codePrefix: "PRIVATE_OPINION",
  label: "仓外 original opinion"
});
const PRIVATE_IDENTITY_DOSSIER_ARTIFACT_DOMAIN = Object.freeze({
  codePrefix: "PRIVATE_IDENTITY_DOSSIER",
  label: "仓外 identity dossier artifact"
});

const EXPECTED_ARTIFACTS = Object.freeze([
  ["bazi-core-fact-engine", "packages/bazi-core/src/index.ts", "engineering_input_fact_contract"],
  ["bazi-current-chart-fact-projection", "packages/bazi-interpretation/src/current-chart-review-snapshot.ts", "engineering_input_fact_contract"],
  ["bazi-strength-assessment-core", "packages/bazi-interpretation/src/strength-assessment-core.ts", "engineering_rule_candidate"],
  ["bazi-strength-claim-registry", "packages/bazi-interpretation/src/strength-claim-registry.ts", "content_claim_candidate"],
  ["bazi-strength-policy", "packages/bazi-interpretation/src/strength-policy.ts", "engineering_rule_candidate"],
  ["bazi-strength-sensitivity-review", "packages/bazi-interpretation/src/strength-sensitivity-review.ts", "engineering_sensitivity_evidence"],
  ["contracts", "packages/contracts/src/index.ts", "engineering_input_contract"],
  ["rule-profiles", "packages/rule-profiles/src/index.ts", "engineering_input_policy"],
  ["engineering-binding-candidate-ledger", "content/bazi-strength-engineering-binding-candidates.v1.json", "engineering_candidate_not_frozen_rationale"],
  ["source-binding-candidate-ledger", "content/bazi-strength-source-binding-candidates.v1.json", "source_candidate_not_content_truth"],
  ["source-rights-candidate-ledger", "content/bazi-strength-source-rights-candidates.v1.json", "rights_observation_not_legal_conclusion"],
  ["single-chart-report-v1.7-frozen-golden", "packages/research-export/src/golden/single-chart-report.contract.v1.7.json", "engineering_report_contract"]
]);

const EXPECTED_BINDING_IDS = Object.freeze([
  "binding:core:derive-assessment",
  "binding:policy:factor-inclusion",
  "binding:policy:direction-map",
  "binding:policy:weights",
  "binding:policy:month-duplication",
  "binding:policy:thresholds",
  "binding:sensitivity:six-scenarios",
  "binding:dtt:month-command",
  "binding:smt-v5:relative-relations",
  "binding:smt-v10:whole-chart",
  "binding:yhzp:hidden-listing",
  "binding:zpzz:review-gates"
]);

const EXPECTED_INDEPENDENCE_CHECKLIST = Object.freeze([
  "same_institution_or_organization",
  "teacher_student_or_lineage_relationship",
  "family_or_household_relationship",
  "shared_commercial_interest",
  "rule_or_case_set_coauthorship",
  "shared_professional_service",
  "reporting_or_supervision_relationship",
  "prior_exposure_to_other_reviewer_conclusion",
  "shared_unpublished_source_or_case_material",
  "same_upstream_algorithm_or_textbook_dependency"
]);

const EXPECTED_DISAGREEMENTS = Object.freeze([
  ["school_divergence", "split_versioned_school_profiles"],
  ["input_semantics", "split_versioned_input_policies"],
  ["base_edition_or_source_identity", "keep_affected_bindings_unverified"],
  ["rule_interpretation", "preserve_parallel_interpretations_no_winner"],
  ["engineering_error", "correct_artifact_and_repeat_both_reviews"],
  ["high_risk_expression", "apply_conservative_expression_or_no_release"],
  ["cannot_decide", "defer"]
]);

const EXPECTED_UNRESOLVED_STRUCTURES = Object.freeze(["从格", "专旺", "化气", "合化", "刑冲", "调候", "大运流年"]);
const EXPECTED_EXCLUDED_SCOPES = Object.freeze([
  "ziwei_domain_truth",
  "western_astrology_domain_truth",
  "vedic_astrology_domain_truth",
  "rights_or_legal_adjudication",
  "engineering_release_readiness",
  "individual_fortune_prediction",
  "public_deployment_authorization"
]);
const EXPECTED_REVIEW_QUESTIONS = Object.freeze([
  Object.freeze({
    questionId: "month-command-hidden-stem-duplication",
    title: "月令主气与首位藏干重复计权",
    question: "月令主气与同一月支首位藏干是否应同时计权；若同时计权，边界依据是什么？"
  }),
  Object.freeze({
    questionId: "relative-factor-weighting",
    title: "月令、透干与藏干相对权重",
    question: "透干、首位藏干、其余藏干与月令之间应采用怎样的相对权重，哪些反例会推翻当前‘月令 4、透干 2、首位藏干 2、其余藏干 1’候选？"
  }),
  Object.freeze({
    questionId: "strength-band-thresholds",
    title: "旺衰五档阈值",
    question: "0.25、0.43、0.57、0.75 分档阈值是否有可复核案例集支持？"
  }),
  Object.freeze({
    questionId: "strength-invalidation-structures",
    title: "基础旺衰结论失效或改写条件",
    question: "从格、专旺、化气、合化、刑冲、调候等结构应在何时使基础旺衰结论失效或改写？"
  })
]);
const EXPECTED_REVIEW_QUESTION_IDS = Object.freeze(
  EXPECTED_REVIEW_QUESTIONS.map((question) => question.questionId)
);
const EXPECTED_CANDIDATE_RECORD_FORMATS = Object.freeze([
  "bazi_expert_public_identity_binding_v1",
  "bazi_expert_original_opinion_v1",
  "bazi_expert_private_opinion_seal_receipt_v1",
  "bazi_expert_pairwise_independence_assessment_v1",
  "bazi_expert_disagreement_inventory_v1",
  "bazi_expert_reconciliation_note_v1",
  "bazi_expert_review_bundle_v1"
]);
export const BAZI_EXPERT_REVIEW_RECORD_TYPES = EXPECTED_CANDIDATE_RECORD_FORMATS;
export const BAZI_EXPERT_REVIEW_QUESTION_IDS = EXPECTED_REVIEW_QUESTION_IDS;
export const BAZI_EXPERT_REVIEW_INDEPENDENCE_FACTOR_IDS = EXPECTED_INDEPENDENCE_CHECKLIST;
const EXPECTED_ROLE_SEPARATION = Object.freeze([
  Object.freeze({
    roleId: "domain_expert",
    allowedScope: Object.freeze(["bazi_rule_interpretation", "school_profile", "counterexample_cases", "high_risk_expression_boundary"]),
    forbiddenScope: Object.freeze(["rights_legal_conclusion", "engineering_reproducibility_attestation", "public_release_authorization"])
  }),
  Object.freeze({
    roleId: "source_rights_reviewer",
    allowedScope: Object.freeze(["work_identity", "edition_identity", "carrier_identity", "license_evidence"]),
    forbiddenScope: Object.freeze(["bazi_domain_truth", "engineering_reproducibility_attestation", "public_release_authorization"])
  }),
  Object.freeze({
    roleId: "engineering_reproducibility_reviewer",
    allowedScope: Object.freeze(["input_lock", "algorithm_lock", "digest_reproduction", "test_evidence"]),
    forbiddenScope: Object.freeze(["bazi_school_truth", "rights_legal_conclusion", "public_release_authorization"])
  })
]);
const EXPECTED_PRIVATE_DOSSIER_FIELDS = Object.freeze([
  "legal_name", "contact_details", "credential_raw_evidence", "institution_raw_evidence",
  "review_history", "verification_process_raw_evidence"
]);
const EXPECTED_PUBLIC_BINDING_FIELDS = Object.freeze([
  "reviewerId", "displayNameOrControlledPseudonym", "verificationMethod", "credentialDigest",
  "verificationDate", "reviewScope", "evidenceType", "verifiedBy"
]);
const EXPECTED_PUBLIC_PROHIBITED_FIELDS = Object.freeze([
  "legalName", "email", "phone", "address", "governmentId", "rawCredentialDocument", "privateContactHandle"
]);
const EXPECTED_REVIEW_PROCESS_STEPS = Object.freeze([
  "freeze_input_rules_sources_rights_and_golden",
  "verify_reviewer_identity_credentials_scope_and_independence",
  "collect_expert_a_opinion_without_expert_b_opinion_access",
  "collect_expert_b_opinion_without_expert_a_opinion_access",
  "seal_and_preserve_both_original_opinions",
  "publish_parallel_agreement_and_disagreement_inventory",
  "collect_independent_supplements_if_needed",
  "issue_reconciliation_note_without_overwriting_originals"
]);

export class BaziExpertReviewPacketError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "BaziExpertReviewPacketError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new BaziExpertReviewPacketError(code, message);
}

function capturePassiveJsonValue(value, state, depth) {
  if (depth > 64) fail("INPUT_DEPTH_EXCEEDED", "专家审阅包对象 API 超过最大深度。");
  state.nodes += 1;
  if (state.nodes > 200_000) fail("INPUT_NODE_LIMIT_EXCEEDED", "专家审阅包对象 API 超过节点上限。");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("INPUT_VALUE_INVALID", "专家审阅包对象 API 含非有限数值。");
    return value;
  }
  if (typeof value === "string") {
    state.textCharacters += value.length;
    if (state.textCharacters > 2_000_000) fail("INPUT_TEXT_LIMIT_EXCEEDED", "专家审阅包对象 API 超过文本上限。");
    return value;
  }
  if (typeof value !== "object") fail("INPUT_VALUE_INVALID", "专家审阅包对象 API 只接受 JSON 数据值。");
  if (utilTypes.isProxy(value)) fail("INPUT_PROXY_FORBIDDEN", "专家审阅包对象 API 不接受 Proxy。");
  if (state.active.has(value)) fail("INPUT_CYCLE_FORBIDDEN", "专家审阅包对象 API 不接受循环引用。");
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
      throw new BaziExpertReviewPacketError(
        "INPUT_OBJECT_UNSAFE",
        "专家审阅包对象 API 无法安全捕获对象描述符。",
        { cause }
      );
    }
    const descriptorKeys = Reflect.ownKeys(descriptors);
    if (descriptorKeys.some((key) => typeof key === "symbol")) {
      fail("INPUT_SYMBOL_FORBIDDEN", "专家审阅包对象 API 不接受 Symbol 属性。");
    }
    if (array) {
      if (prototype !== Array.prototype) fail("INPUT_PROTOTYPE_INVALID", "专家审阅包对象 API 数组原型无效。");
      const lengthDescriptor = descriptors.length;
      const length = lengthDescriptor?.value;
      if (lengthDescriptor?.get || lengthDescriptor?.set
        || !Number.isSafeInteger(length) || length < 0 || length > 200_000) {
        fail("INPUT_ARRAY_INVALID", "专家审阅包对象 API 数组长度无效。");
      }
      const allowedKeys = new Set(["length", ...Array.from({ length }, (_entry, index) => String(index))]);
      if (descriptorKeys.some((key) => !allowedKeys.has(key))) {
        fail("INPUT_ARRAY_INVALID", "专家审阅包对象 API 数组含额外属性。");
      }
      const result = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
          fail("INPUT_ARRAY_INVALID", "专家审阅包对象 API 不接受稀疏数组或访问器元素。");
        }
        result.push(capturePassiveJsonValue(descriptor.value, state, depth + 1));
      }
      return result;
    }
    if (prototype !== Object.prototype) fail("INPUT_PROTOTYPE_INVALID", "专家审阅包对象 API 只接受普通 JSON 对象。");
    const entries = [];
    for (const key of descriptorKeys) {
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
        fail("INPUT_ACCESSOR_FORBIDDEN", "专家审阅包对象 API 不接受访问器或不可枚举字段。");
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

// Detached passive data only; this does not issue an intake or private-file brand.
export function copyBaziExpertPassiveJsonData(value) {
  return capturePassiveJsonSnapshot(value);
}

function deepFreezeJson(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreezeJson(child);
  return Object.freeze(value);
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

function parseBaziExpertJsonBytesByExpectedType(bytes, label, maxBytes, expectedType) {
  if (!(bytes instanceof Uint8Array)) fail("JSON_INVALID", `${label} 必须是字节。`);
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0 || bytes.length > maxBytes) {
    fail("JSON_TOO_LARGE", `${label} 超过输入上限。`);
  }
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail("JSON_BOM_FORBIDDEN", `${label} 不得包含 UTF-8 BOM。`);
  }
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (cause) {
    throw new BaziExpertReviewPacketError("JSON_UTF8_INVALID", `${label} 不是严格 UTF-8。`, { cause });
  }
  if (!source.trim()) fail("JSON_INVALID", `${label} 为空。`);
  let expression;
  try {
    expression = parseExpression(source.trim(), {
      sourceFilename: "bazi-expert-review.json",
      sourceType: "script",
      errorRecovery: false,
      attachComment: false
    });
  } catch (cause) {
    throw new BaziExpertReviewPacketError("JSON_INVALID", `${label} 不能按严格 JSON 检查。`, { cause });
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
    if (expectedType === "array") {
      if (!Array.isArray(parsed)) fail("JSON_INVALID", `${label} 必须是 JSON 数组。`);
    } else if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      fail("JSON_INVALID", `${label} 必须是 JSON 对象。`);
    }
    return parsed;
  } catch (cause) {
    if (cause instanceof BaziExpertReviewPacketError) throw cause;
    throw new BaziExpertReviewPacketError("JSON_INVALID", `${label} 不是有效 JSON。`, { cause });
  }
}

export function parseBaziExpertReviewJsonBytes(
  bytes,
  label = "专家审阅 JSON",
  maxBytes = MAX_ARTIFACT_BYTES
) {
  return parseBaziExpertJsonBytesByExpectedType(bytes, label, maxBytes, "object");
}

export function parseBaziExpertPrivateIntakeRequestJsonBytes(bytes) {
  return parseBaziExpertJsonBytesByExpectedType(bytes, "专家私有收件请求 JSON", MAX_ARTIFACT_BYTES, "array");
}

function canonicalValue(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]));
  }
  fail("NON_CANONICAL_JSON", "专家审阅包只接受有限规范 JSON 值。");
}

export function canonicalStringifyExpertReviewPacket(value) {
  return JSON.stringify(canonicalValue(value));
}

export function computeExpertReviewPacketDigest(packet) {
  const snapshot = capturePassiveJsonSnapshot(packet);
  const { packetDigest: _packetDigest, ...unsigned } = snapshot;
  return createHash("sha256").update(canonicalStringifyExpertReviewPacket(unsigned), "utf8").digest("hex");
}

function assertExactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("PACKET_INVALID", `${label} 必须是对象。`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail("PACKET_INVALID", `${label} 字段集合不匹配。`);
}

function assertExactArray(actual, expected, label) {
  if (!Array.isArray(actual) || JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail("PACKET_INVALID", `${label} 必须保持固定顺序与内容。`);
  }
}

function assertCanonicalEqual(actual, expected, label) {
  if (canonicalStringifyExpertReviewPacket(actual) !== canonicalStringifyExpertReviewPacket(expected)) {
    fail("PACKET_INVALID", `${label} 必须保持固定内容。`);
  }
}

const CANONICAL_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

function isCanonicalUtc(value) {
  if (typeof value !== "string" || !CANONICAL_UTC_PATTERN.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function computeCanonicalObjectDigest(value, digestKey) {
  const snapshot = capturePassiveJsonSnapshot(value);
  const { [digestKey]: _digest, ...unsigned } = snapshot;
  return createHash("sha256")
    .update(canonicalStringifyExpertReviewPacket(unsigned), "utf8")
    .digest("hex");
}

function safeWorkspaceFile(workspaceRoot, relativePath) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,299}$/u.test(relativePath)
    || relativePath.includes("..") || relativePath.startsWith("/") || relativePath.includes("\\")) {
    fail("UNSAFE_ARTIFACT_PATH", `专家审阅包文件路径不安全：${relativePath}`);
  }
  const root = path.resolve(workspaceRoot);
  const absolute = path.resolve(root, ...relativePath.split("/"));
  if (!absolute.startsWith(`${root}${path.sep}`)) fail("UNSAFE_ARTIFACT_PATH", `专家审阅包文件路径越界：${relativePath}`);
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
    && left.mtimeMs === right.mtimeMs
    && left.ctimeMs === right.ctimeMs;
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
    const metadata = await lstat(cursor);
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
    directoryChainBefore = await capturePlainDirectoryChain(
      workspaceRoot,
      absolute,
      invalidCode,
      label
    );
    [before, actual] = await Promise.all([
      lstat(absolute),
      realpath(absolute)
    ]);
  } catch (cause) {
    if (cause instanceof BaziExpertReviewPacketError) throw cause;
    throw new BaziExpertReviewPacketError(missingCode, `${label} 不存在：${relativePath}`, { cause });
  }
  const root = directoryChainBefore[0].resolvedPath;
  if (
    !isSameOrWithin(root, actual)
    || before.isSymbolicLink()
    || !before.isFile()
    || before.nlink !== 1
    || before.size <= 0
    || before.size > maxBytes
  ) {
    fail(invalidCode, `${label} 必须是工作区内独立普通小文件：${relativePath}`);
  }
  const handle = await open(actual, "r");
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.nlink !== 1 || !sameFileEndpoint(before, opened)) {
      fail(invalidCode, `${label} 在打开前发生身份换绑：${relativePath}`);
    }
    const bytes = await readAtMost(handle, maxBytes, invalidCode, label);
    const [afterHandle, afterPath, actualAfter, directoryChainAfter] = await Promise.all([
      handle.stat(),
      lstat(absolute),
      realpath(absolute),
      capturePlainDirectoryChain(workspaceRoot, absolute, invalidCode, label)
    ]);
    if (
      afterPath.isSymbolicLink()
      || !afterPath.isFile()
      || afterPath.nlink !== 1
      || bytes.byteLength !== opened.size
      || !sameFileEndpoint(opened, afterHandle)
      || !sameFileEndpoint(opened, afterPath)
      || actualAfter !== actual
      || !sameDirectoryChain(directoryChainBefore, directoryChainAfter)
    ) {
      fail(invalidCode, `${label} 在读取端点之间发生变化：${relativePath}`);
    }
    return Object.freeze({
      bytes,
      sha256: createHash("sha256").update(bytes).digest("hex")
    });
  } finally {
    await handle.close();
  }
}

function normalizeResolvedPrivatePath(value) {
  const normalized = path.normalize(value);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function sameResolvedPrivatePath(left, right) {
  return normalizeResolvedPrivatePath(left) === normalizeResolvedPrivatePath(right);
}

function privateArtifactFail(domain, suffix, message) {
  fail(`${domain.codePrefix}_${suffix}`, `${domain.label}${message}`);
}

function validatePrivateArtifactRelativePath(value, domain) {
  if (typeof value !== "string"
    || value.length === 0
    || value.length > 240
    || value.includes("\\")
    || value.includes("\0")
    || value.includes(":")) {
    privateArtifactFail(domain, "PATH_INVALID", " 必须使用短、规范化且不含 ADS 的正斜杠相对路径。");
  }
  if (path.posix.isAbsolute(value)
    || path.win32.isAbsolute(value)
    || /^[A-Za-z]:/u.test(value)
    || value.startsWith("//")) {
    privateArtifactFail(domain, "PATH_INVALID", " 路径不得是绝对、盘符或 UNC 路径。");
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")
    || path.posix.normalize(value) !== value) {
    privateArtifactFail(domain, "PATH_INVALID", " 路径不得含空、点或父目录段。");
  }
  return value;
}

function samePrivateEndpointIdentity(left, right) {
  return typeof left?.dev === "bigint"
    && typeof left?.ino === "bigint"
    && typeof right?.dev === "bigint"
    && typeof right?.ino === "bigint"
    && left.ino > 0n
    && right.ino > 0n
    && left.dev === right.dev
    && left.ino === right.ino;
}

function sameStablePrivateEndpoint(left, right) {
  return samePrivateEndpointIdentity(left, right)
    && left.nlink === right.nlink
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function assertPrivateDirectoryEndpoint(metadata, domain) {
  if (!metadata?.isDirectory()
    || metadata.isSymbolicLink()
    || typeof metadata.dev !== "bigint"
    || typeof metadata.ino !== "bigint"
    || metadata.ino <= 0n) {
    privateArtifactFail(
      domain,
      "DIRECTORY_INVALID",
      " 目录链不得包含符号链接、junction 或特殊端点。"
    );
  }
}

function assertPrivateArtifactFileEndpoint(metadata, maxBytes, domain) {
  if (!metadata?.isFile() || metadata.isSymbolicLink()) {
    privateArtifactFail(domain, "FILE_INVALID", " 必须是独立普通文件。");
  }
  if (typeof metadata.dev !== "bigint"
    || typeof metadata.ino !== "bigint"
    || metadata.ino <= 0n
    || metadata.nlink !== 1n) {
    privateArtifactFail(domain, "FILE_INVALID", " 不得是 hardlink 或不稳定端点。");
  }
  if (metadata.size <= 0n || metadata.size > BigInt(maxBytes)) {
    privateArtifactFail(domain, "FILE_INVALID", " 必须非空且不超过输入上限。");
  }
}

async function resolvePrivateArtifactRoot(workspaceRoot, privateRoot, domain) {
  if (typeof workspaceRoot !== "string"
    || workspaceRoot.length === 0
    || !path.isAbsolute(workspaceRoot)
    || typeof privateRoot !== "string"
    || !path.isAbsolute(privateRoot)) {
    privateArtifactFail(domain, "ROOT_INVALID", " 的 privateRoot 与 workspaceRoot 必须是显式绝对目录。");
  }
  try {
    const unresolvedWorkspace = path.resolve(workspaceRoot);
    const unresolvedRoot = path.resolve(privateRoot);
    const [
      workspaceLink,
      workspaceReal,
      approvedWorkspaceLink,
      approvedWorkspaceReal,
      privateRootLink,
      privateReal
    ] = await Promise.all([
      lstat(unresolvedWorkspace, { bigint: true }),
      realpath(unresolvedWorkspace),
      lstat(APPROVED_WORKSPACE_ROOT, { bigint: true }),
      realpath(APPROVED_WORKSPACE_ROOT),
      lstat(unresolvedRoot, { bigint: true }),
      realpath(unresolvedRoot)
    ]);
    assertPrivateDirectoryEndpoint(workspaceLink, domain);
    assertPrivateDirectoryEndpoint(approvedWorkspaceLink, domain);
    assertPrivateDirectoryEndpoint(privateRootLink, domain);
    const [workspaceStat, approvedWorkspaceStat, privateRootStat] = await Promise.all([
      stat(workspaceReal, { bigint: true }),
      stat(approvedWorkspaceReal, { bigint: true }),
      stat(privateReal, { bigint: true })
    ]);
    assertPrivateDirectoryEndpoint(workspaceStat, domain);
    assertPrivateDirectoryEndpoint(approvedWorkspaceStat, domain);
    if (!sameResolvedPrivatePath(workspaceReal, approvedWorkspaceReal)
      || !samePrivateEndpointIdentity(workspaceLink, workspaceStat)
      || !samePrivateEndpointIdentity(approvedWorkspaceLink, approvedWorkspaceStat)
      || !samePrivateEndpointIdentity(workspaceStat, approvedWorkspaceStat)) {
      privateArtifactFail(
        domain,
        "WORKSPACE_ROOT_UNTRUSTED",
        " workspaceRoot 必须绑定当前 verifier 模块所在的固定项目根。"
      );
    }
    assertPrivateDirectoryEndpoint(privateRootStat, domain);
    if (!samePrivateEndpointIdentity(privateRootLink, privateRootStat)
      || !sameResolvedPrivatePath(privateReal, await realpath(privateReal))) {
      privateArtifactFail(domain, "ROOT_INVALID", " privateRoot 端点身份不稳定。");
    }
    if (isSameOrWithin(workspaceReal, privateReal) || isSameOrWithin(privateReal, workspaceReal)) {
      privateArtifactFail(domain, "ROOT_OVERLAPS_WORKSPACE", " privateRoot 必须与工作区双向不重叠。");
    }
    return Object.freeze({ unresolvedRoot, resolvedRoot: privateReal });
  } catch (cause) {
    if (cause instanceof BaziExpertReviewPacketError) throw cause;
    privateArtifactFail(domain, "ROOT_INVALID", " privateRoot 无法安全解析。");
  }
}

async function capturePrivateArtifactDirectoryChain(root, absoluteTarget, domain) {
  const targetDirectory = path.dirname(path.resolve(absoluteTarget));
  if (!isSameOrWithin(root.unresolvedRoot, targetDirectory)) {
    privateArtifactFail(domain, "PATH_INVALID", " 目录链越出 privateRoot。");
  }
  const relative = path.relative(root.unresolvedRoot, targetDirectory);
  const segments = relative === "" ? [] : relative.split(path.sep);
  const endpoints = [];
  let cursor = root.unresolvedRoot;
  for (const segment of [null, ...segments]) {
    if (segment !== null) cursor = path.join(cursor, segment);
    const linkMetadata = await lstat(cursor, { bigint: true });
    assertPrivateDirectoryEndpoint(linkMetadata, domain);
    const resolvedPath = await realpath(cursor);
    if (!isSameOrWithin(root.resolvedRoot, resolvedPath)
      || (segment === null && !sameResolvedPrivatePath(resolvedPath, root.resolvedRoot))) {
      privateArtifactFail(domain, "DIRECTORY_INVALID", " 目录链 realpath 越界。");
    }
    const pathMetadata = await stat(resolvedPath, { bigint: true });
    assertPrivateDirectoryEndpoint(pathMetadata, domain);
    if (!sameStablePrivateEndpoint(linkMetadata, pathMetadata)) {
      privateArtifactFail(domain, "DIRECTORY_INVALID", " 目录链身份不稳定。");
    }
    endpoints.push(Object.freeze({
      unresolvedPath: cursor,
      resolvedPath,
      metadata: linkMetadata
    }));
  }
  return Object.freeze(endpoints);
}

function samePrivateDirectoryChain(left, right) {
  return left.length === right.length && left.every((entry, index) => {
    const other = right[index];
    return other !== undefined
      && sameResolvedPrivatePath(entry.unresolvedPath, other.unresolvedPath)
      && sameResolvedPrivatePath(entry.resolvedPath, other.resolvedPath)
      && sameStablePrivateEndpoint(entry.metadata, other.metadata);
  });
}

async function readStablePrivateArtifactFile(root, relativePath, maxBytes, domain) {
  validatePrivateArtifactRelativePath(relativePath, domain);
  const unresolved = path.resolve(root.unresolvedRoot, ...relativePath.split("/"));
  if (!isSameOrWithin(root.unresolvedRoot, unresolved)) {
    privateArtifactFail(domain, "PATH_INVALID", " 路径越出 privateRoot。");
  }
  let handle = null;
  try {
    const directoryChainBefore = await capturePrivateArtifactDirectoryChain(root, unresolved, domain);
    const beforeLink = await lstat(unresolved, { bigint: true });
    assertPrivateArtifactFileEndpoint(beforeLink, maxBytes, domain);
    const resolvedBeforeOpen = await realpath(unresolved);
    if (!isSameOrWithin(root.resolvedRoot, resolvedBeforeOpen)) {
      privateArtifactFail(domain, "PATH_INVALID", " realpath 越出 privateRoot。");
    }
    const pathStatBeforeOpen = await stat(resolvedBeforeOpen, { bigint: true });
    assertPrivateArtifactFileEndpoint(pathStatBeforeOpen, maxBytes, domain);
    if (!sameStablePrivateEndpoint(beforeLink, pathStatBeforeOpen)) {
      privateArtifactFail(domain, "FILE_CHANGED", " 在打开前发生端点换绑。");
    }

    const noFollowFlag = Number.isInteger(fsConstants.O_NOFOLLOW) ? fsConstants.O_NOFOLLOW : 0;
    handle = await open(unresolved, fsConstants.O_RDONLY | noFollowFlag);
    const handleStatBeforeRead = await handle.stat({ bigint: true });
    assertPrivateArtifactFileEndpoint(handleStatBeforeRead, maxBytes, domain);
    const [linkAfterOpen, resolvedAfterOpen, directoryChainAfterOpen] = await Promise.all([
      lstat(unresolved, { bigint: true }),
      realpath(unresolved),
      capturePrivateArtifactDirectoryChain(root, unresolved, domain)
    ]);
    assertPrivateArtifactFileEndpoint(linkAfterOpen, maxBytes, domain);
    const pathStatAfterOpen = await stat(resolvedAfterOpen, { bigint: true });
    assertPrivateArtifactFileEndpoint(pathStatAfterOpen, maxBytes, domain);
    if (!sameResolvedPrivatePath(resolvedBeforeOpen, resolvedAfterOpen)
      || !isSameOrWithin(root.resolvedRoot, resolvedAfterOpen)
      || !sameStablePrivateEndpoint(pathStatBeforeOpen, handleStatBeforeRead)
      || !sameStablePrivateEndpoint(handleStatBeforeRead, linkAfterOpen)
      || !sameStablePrivateEndpoint(handleStatBeforeRead, pathStatAfterOpen)
      || !samePrivateDirectoryChain(directoryChainBefore, directoryChainAfterOpen)) {
      privateArtifactFail(domain, "FILE_CHANGED", " 在打开期间发生变化。");
    }

    const bytes = await readAtMost(
      handle,
      maxBytes,
      `${domain.codePrefix}_FILE_INVALID`,
      domain.label
    );
    const [handleStatAfterRead, linkAfterRead, resolvedAfterRead, directoryChainAfterRead] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(unresolved, { bigint: true }),
      realpath(unresolved),
      capturePrivateArtifactDirectoryChain(root, unresolved, domain)
    ]);
    assertPrivateArtifactFileEndpoint(handleStatAfterRead, maxBytes, domain);
    assertPrivateArtifactFileEndpoint(linkAfterRead, maxBytes, domain);
    const pathStatAfterRead = await stat(resolvedAfterRead, { bigint: true });
    assertPrivateArtifactFileEndpoint(pathStatAfterRead, maxBytes, domain);
    if (BigInt(bytes.byteLength) !== handleStatAfterRead.size
      || !sameResolvedPrivatePath(resolvedBeforeOpen, resolvedAfterRead)
      || !isSameOrWithin(root.resolvedRoot, resolvedAfterRead)
      || !sameStablePrivateEndpoint(handleStatBeforeRead, handleStatAfterRead)
      || !sameStablePrivateEndpoint(handleStatAfterRead, linkAfterRead)
      || !sameStablePrivateEndpoint(handleStatAfterRead, pathStatAfterRead)
      || !samePrivateDirectoryChain(directoryChainBefore, directoryChainAfterRead)) {
      privateArtifactFail(domain, "FILE_CHANGED", " 在读取期间发生变化。");
    }
    return Object.freeze({
      bytes,
      sha256: createHash("sha256").update(bytes).digest("hex")
    });
  } catch (cause) {
    if (cause instanceof BaziExpertReviewPacketError) throw cause;
    privateArtifactFail(domain, "FILE_INVALID", " 无法安全读取。");
  } finally {
    if (handle !== null) {
      try {
        await handle.close();
      } catch {
        // The operation already fails closed; do not surface a path-bearing close error.
      }
    }
  }
}

// The caller receives the held buffer for immediate structural checks. Only its
// own verified consumer may issue a context; this reader issues no such brand.
export async function readBaziExpertPrivateArtifact(options) {
  try {
    if (arguments.length !== 1) {
      fail("PRIVATE_EXPERT_ARTIFACT_REQUEST_INVALID", "仓外专家材料读取只接受固定请求。");
    }
    const request = capturePassiveJsonSnapshot(options);
    assertBoundaryExactKeys(request, ["workspaceRoot", "privateRoot", "relativePath"],
      "PRIVATE_EXPERT_ARTIFACT_REQUEST_INVALID", "仓外专家材料请求");
    const domain = Object.freeze({ codePrefix: "PRIVATE_EXPERT_ARTIFACT", label: "仓外专家材料" });
    const root = await resolvePrivateArtifactRoot(request.workspaceRoot, request.privateRoot, domain);
    const file = await readStablePrivateArtifactFile(root, request.relativePath, MAX_ARTIFACT_BYTES, domain);
    return Object.freeze({ bytes: file.bytes, sha256: file.sha256, byteLength: file.bytes.byteLength });
  } catch (cause) {
    const code = cause instanceof BaziExpertReviewPacketError ? cause.code : "PRIVATE_EXPERT_ARTIFACT_FILE_INVALID";
    throw new BaziExpertReviewPacketError(code, "仓外专家材料未通过固定根、路径或稳定字节读取检查。");
  }
}

async function readArtifactSnapshots(workspaceRoot) {
  const entries = await Promise.all(EXPECTED_ARTIFACTS.map(async ([, relativePath]) => [
    relativePath,
    await readStableWorkspaceFile(workspaceRoot, relativePath, MAX_ARTIFACT_BYTES, {
      missingCode: "ARTIFACT_MISSING",
      invalidCode: "UNSAFE_ARTIFACT_PATH",
      label: "专家审阅包冻结文件"
    })
  ]));
  return new Map(entries);
}

function assertBoundaryExactKeys(value, keys, code, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(code, `${label} 必须是对象。`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(code, `${label} 字段集合不匹配。`);
  }
}

function assertBoundaryExactArray(actual, expected, code, label) {
  if (!Array.isArray(actual) || JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(code, `${label} 必须保持固定顺序与内容。`);
  }
}

function assertBoundaryCanonicalEqual(actual, expected, code, label) {
  if (canonicalStringifyExpertReviewPacket(actual) !== canonicalStringifyExpertReviewPacket(expected)) {
    fail(code, `${label} 必须保持固定内容。`);
  }
}

function verifyIntakeGapStaticBoundary(gap) {
  const code = "INTAKE_GAP_INVALID";
  assertBoundaryExactKeys(gap, [
    "schemaVersion", "recordType", "ledgerId", "status", "createdAt", "releaseGovernance",
    "approvedPacketBinding", "readinessLedgerBinding", "reviewQuestionIds",
    "independenceFactorIds", "candidateRecordFormats", "currentInstances", "currentReadiness",
    "expertReviewBundle", "gapSummary", "doesNotEstablish", "ledgerDigest"
  ], code, "expert intake gap");
  if (gap.schemaVersion !== "1.0.0"
    || gap.recordType !== "bazi_expert_review_intake_gap_v1"
    || gap.ledgerId !== "hakimi.bazi.expert-review-intake-gap/1.0.0"
    || gap.status !== "zero_instance_intake_contract_not_collection_ready"
    || gap.createdAt !== "2026-08-29T00:00:00.000Z"
    || !isCanonicalUtc(gap.createdAt)) {
    fail(code, "expert intake gap 身份或时间漂移。");
  }
  assertBoundaryCanonicalEqual(gap.releaseGovernance, {
    activeLine: "legacy-v13",
    targetSchema: 13,
    migrationId: null,
    mutationEpochBoundary: "preserved",
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  }, code, "expert intake gap.releaseGovernance");
  assertBoundaryCanonicalEqual(gap.approvedPacketBinding, {
    path: BAZI_EXPERT_REVIEW_PACKET_RELATIVE_PATH,
    packetId: APPROVED_PACKET_ID,
    packetDigest: APPROVED_PACKET_DIGEST,
    rawBytes: APPROVED_PACKET_RAW_BYTES,
    rawSha256: APPROVED_PACKET_RAW_SHA256
  }, code, "expert intake gap.approvedPacketBinding");
  assertBoundaryCanonicalEqual(gap.readinessLedgerBinding, {
    path: BAZI_EXPERT_REVIEW_READINESS_LEDGER_RELATIVE_PATH,
    ledgerId: APPROVED_READINESS_LEDGER_ID,
    ledgerDigest: APPROVED_READINESS_LEDGER_DIGEST,
    rawBytes: APPROVED_READINESS_LEDGER_RAW_BYTES,
    rawSha256: APPROVED_READINESS_LEDGER_RAW_SHA256
  }, code, "expert intake gap.readinessLedgerBinding");
  assertBoundaryExactArray(gap.reviewQuestionIds, EXPECTED_REVIEW_QUESTION_IDS, code, "expert intake gap.reviewQuestionIds");
  assertBoundaryExactArray(gap.independenceFactorIds, EXPECTED_INDEPENDENCE_CHECKLIST, code, "expert intake gap.independenceFactorIds");
  assertBoundaryExactArray(gap.candidateRecordFormats, EXPECTED_CANDIDATE_RECORD_FORMATS, code, "expert intake gap.candidateRecordFormats");

  assertBoundaryExactKeys(gap.currentInstances, [
    "publicIdentityBindings", "originalOpinions", "privateOpinionSealReceipts",
    "pairwiseIndependenceAssessments", "disagreementInventories", "reconciliationNotes",
    "overallBundles", "counts"
  ], code, "expert intake gap.currentInstances");
  for (const key of [
    "publicIdentityBindings", "originalOpinions", "privateOpinionSealReceipts",
    "pairwiseIndependenceAssessments", "disagreementInventories", "reconciliationNotes", "overallBundles"
  ]) {
    assertBoundaryExactArray(gap.currentInstances[key], [], code, `expert intake gap.currentInstances.${key}`);
  }
  assertBoundaryCanonicalEqual(gap.currentInstances.counts, {
    publicIdentityBindings: 0,
    originalOpinions: 0,
    privateOpinionSealReceipts: 0,
    pairwiseIndependenceAssessments: 0,
    disagreementInventories: 0,
    reconciliationNotes: 0,
    overallBundles: 0,
    sealedOriginalOpinions: 0,
    independentExpertReviewsVerified: 0
  }, code, "expert intake gap.currentInstances.counts");
  assertBoundaryCanonicalEqual(gap.currentReadiness, {
    packetArtifactLocksCurrent: false,
    bindingFrozenVerified: 0,
    bindingFrozenRequired: 12,
    sourceBindingClosureComplete: false,
    sourceRightsClosureComplete: false,
    candidateFeedbackCollectionReady: false,
    releaseClosureReviewReady: false
  }, code, "expert intake gap.currentReadiness");
  assertBoundaryCanonicalEqual(gap.expertReviewBundle, {
    state: "absent",
    count: 0,
    countsTowardExpertGate: false,
    contentTruthEstablished: false,
    expertTruthEstablished: false,
    releaseReady: false
  }, code, "expert intake gap.expertReviewBundle");
  assertBoundaryCanonicalEqual(gap.gapSummary, {
    candidateRecordFormatsDefined: 7,
    reviewQuestionsBound: 4,
    independenceFactorsBound: 10,
    currentRecordInstances: 0,
    currentSealedOriginalOpinions: 0,
    currentIndependentExpertReviewsVerified: 0,
    expertReviewBundleComplete: false,
    candidateFeedbackCollectionReady: false,
    releaseClosureReviewReady: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  }, code, "expert intake gap.gapSummary");
  assertBoundaryExactArray(gap.doesNotEstablish, [
    "real_reviewer_identity", "reviewer_credentials", "reviewer_independence",
    "expert_opinion_authenticity", "immutable_first_seen_chronology", "content_truth",
    "expert_truth", "rights_legal_conclusion", "cross_file_atomic_snapshot",
    "interval_mutation_or_aba_exclusion", "expert_gate_closure", "release_readiness",
    "public_release_authorization"
  ], code, "expert intake gap.doesNotEstablish");
  if (gap.ledgerDigest !== APPROVED_INTAKE_GAP_LEDGER_DIGEST
    || gap.ledgerDigest !== computeCanonicalObjectDigest(gap, "ledgerDigest")) {
    fail(code, "expert intake gap 自摘要不匹配。");
  }
}

export async function verifyBaziExpertReviewIntakeGapLedger(workspaceRoot, packet) {
  const packetSnapshot = capturePassiveJsonSnapshot(packet);
  const gapFile = await readStableWorkspaceFile(
    workspaceRoot,
    BAZI_EXPERT_REVIEW_INTAKE_GAP_RELATIVE_PATH,
    MAX_PACKET_BYTES,
    { missingCode: "INTAKE_GAP_INVALID", invalidCode: "INTAKE_GAP_INVALID", label: "专家审阅 intake gap" }
  );
  if (gapFile.bytes.byteLength !== APPROVED_INTAKE_GAP_RAW_BYTES
    || gapFile.sha256 !== APPROVED_INTAKE_GAP_RAW_SHA256) {
    fail("INTAKE_GAP_INVALID", "专家审阅 intake gap 原始字节身份漂移。");
  }
  const gap = parseBaziExpertReviewJsonBytes(gapFile.bytes, "专家审阅 intake gap", MAX_PACKET_BYTES);
  verifyIntakeGapStaticBoundary(gap);

  const [packetFile, readinessFile] = await Promise.all([
    readStableWorkspaceFile(
      workspaceRoot,
      BAZI_EXPERT_REVIEW_PACKET_RELATIVE_PATH,
      MAX_PACKET_BYTES,
      { missingCode: "PACKET_INVALID", invalidCode: "PACKET_INVALID", label: "批准专家审阅包" }
    ),
    readStableWorkspaceFile(
      workspaceRoot,
      BAZI_EXPERT_REVIEW_INTAKE_READINESS_BASIS_RELATIVE_PATH,
      MAX_ARTIFACT_BYTES,
      { missingCode: "INTAKE_GAP_INVALID", invalidCode: "INTAKE_GAP_INVALID", label: "专家审阅 binding readiness 账" }
    )
  ]);
  if (packetFile.bytes.byteLength !== APPROVED_PACKET_RAW_BYTES
    || packetFile.sha256 !== APPROVED_PACKET_RAW_SHA256
    || readinessFile.bytes.byteLength !== APPROVED_READINESS_LEDGER_RAW_BYTES
    || readinessFile.sha256 !== APPROVED_READINESS_LEDGER_RAW_SHA256) {
    fail("INTAKE_GAP_BINDING_DRIFT", "专家审阅 intake gap 的 packet 或 readiness 原始字节绑定漂移。");
  }
  const boundPacket = parseBaziExpertReviewJsonBytes(packetFile.bytes, "批准专家审阅包", MAX_PACKET_BYTES);
  verifyStaticBoundary(boundPacket);
  assertBoundaryCanonicalEqual(packetSnapshot, boundPacket, "PACKET_APPROVAL_BINDING_MISMATCH", "调用方 packet 与批准原始 packet");
  const readiness = parseBaziExpertReviewJsonBytes(
    readinessFile.bytes,
    "专家审阅 binding readiness 账",
    MAX_ARTIFACT_BYTES
  );
  if (readiness.ledgerId !== APPROVED_READINESS_LEDGER_ID
    || readiness.ledgerDigest !== APPROVED_READINESS_LEDGER_DIGEST
    || readiness.ledgerDigest !== computeCanonicalObjectDigest(readiness, "ledgerDigest")) {
    fail("INTAKE_GAP_BINDING_DRIFT", "专家审阅 readiness 账身份或自摘要漂移。");
  }
  return Object.freeze({
    ledger: deepFreezeJson(capturePassiveJsonSnapshot(gap)),
    ledgerDigest: gap.ledgerDigest,
    verificationScope: "historical_intake_gap_snapshot",
    currentApplicabilityAssessed: false,
    currentRecordInstances: 0,
    candidateFeedbackCollectionReady: false,
    releaseClosureReviewReady: false,
    independentExpertReviewsVerified: 0,
    expertReviewBundleComplete: false
  });
}

export async function readBaziExpertReviewPacket(workspaceRoot) {
  try {
    const snapshot = await readStableWorkspaceFile(
      workspaceRoot,
      BAZI_EXPERT_REVIEW_PACKET_RELATIVE_PATH,
      MAX_PACKET_BYTES,
      {
        missingCode: "PACKET_INVALID",
        invalidCode: "PACKET_INVALID",
        label: "专家审阅包"
      }
    );
    return parseBaziExpertReviewJsonBytes(snapshot.bytes, "专家审阅包", MAX_PACKET_BYTES);
  } catch (cause) {
    if (cause instanceof BaziExpertReviewPacketError) throw cause;
    throw new BaziExpertReviewPacketError("PACKET_INVALID", "专家审阅包不是有效 JSON。", { cause });
  }
}

function verifyStaticBoundary(packet) {
  assertExactKeys(packet, [
    "schemaVersion", "recordType", "packetId", "status", "createdAt", "releaseGovernance",
    "artifactLocks", "sourceLedgerBindings", "reviewScope", "reviewQuestions", "roleSeparation",
    "identityPrivacyPolicy", "independenceChecklist", "reviewerSlots", "reviewProcess",
    "disagreementPolicy", "automatedResolutionPolicy", "gateSummary", "doesNotEstablish", "packetDigest"
  ], "packet");
  if (packet.schemaVersion !== "1.0.0"
    || packet.recordType !== "bazi_strength_expert_review_packet_candidate"
    || packet.packetId !== APPROVED_PACKET_ID
    || packet.status !== "mechanically_bound_vacant_review_packet"
    || packet.createdAt !== APPROVED_PACKET_CREATED_AT
    || !isCanonicalUtc(packet.createdAt)) {
    fail("PACKET_IDENTITY_INVALID", "专家审阅包身份或时间无效。");
  }

  assertExactKeys(packet.releaseGovernance, [
    "releaseIdentity", "targetSchema", "migrationId", "mutationEpochBoundary",
    "publicDeploymentAuthorized", "expertClaimsAuthorized"
  ], "releaseGovernance");
  const release = packet.releaseGovernance;
  if (release.releaseIdentity !== "legacy-v13" || release.targetSchema !== 13 || release.migrationId !== null
    || release.mutationEpochBoundary !== "preserved" || release.publicDeploymentAuthorized !== false
    || release.expertClaimsAuthorized !== false) {
    fail("RELEASE_BOUNDARY_VIOLATION", "专家审阅包不得改变 v13、mutation epoch 或发布授权边界。");
  }

  assertExactKeys(packet.reviewScope, ["systemId", "surfaceId", "surfaceVersion", "bindingIds", "unresolvedStructures", "excludedScopes"], "reviewScope");
  if (packet.reviewScope.systemId !== "bazi" || packet.reviewScope.surfaceId !== "single-chart-report"
    || packet.reviewScope.surfaceVersion !== "1.7.0") {
    fail("REVIEW_SCOPE_DRIFT", "专家审阅范围不得外推到其他体系或版本。");
  }
  assertExactArray(packet.reviewScope.bindingIds, EXPECTED_BINDING_IDS, "reviewScope.bindingIds");
  assertExactArray(packet.reviewScope.unresolvedStructures, EXPECTED_UNRESOLVED_STRUCTURES, "reviewScope.unresolvedStructures");
  assertExactArray(packet.reviewScope.excludedScopes, EXPECTED_EXCLUDED_SCOPES, "reviewScope.excludedScopes");
  assertCanonicalEqual(packet.reviewQuestions, EXPECTED_REVIEW_QUESTIONS, "reviewQuestions");
  assertCanonicalEqual(packet.roleSeparation, EXPECTED_ROLE_SEPARATION, "roleSeparation");
  assertExactArray(packet.independenceChecklist, EXPECTED_INDEPENDENCE_CHECKLIST, "independenceChecklist");
  if (!Array.isArray(packet.disagreementPolicy)
    || packet.disagreementPolicy.length !== EXPECTED_DISAGREEMENTS.length) {
    fail("PACKET_INVALID", "disagreementPolicy 必须是固定长度数组。");
  }
  for (let index = 0; index < packet.disagreementPolicy.length; index += 1) {
    assertExactKeys(
      packet.disagreementPolicy[index],
      ["disagreementType", "requiredDisposition"],
      `disagreementPolicy.${index}`
    );
  }
  assertExactArray(
    packet.disagreementPolicy.map((entry) => [entry.disagreementType, entry.requiredDisposition]),
    EXPECTED_DISAGREEMENTS,
    "disagreementPolicy"
  );

  const identity = packet.identityPrivacyPolicy;
  assertExactKeys(identity, ["privateDossier", "publicIdentityBindingFields", "publicPacketProhibitedFields"], "identityPrivacyPolicy");
  assertExactKeys(identity.privateDossier, ["repositoryStorageAllowed", "encryptedOfflineStorageRequired", "fields"], "identityPrivacyPolicy.privateDossier");
  if (identity.privateDossier.repositoryStorageAllowed !== false
    || identity.privateDossier.encryptedOfflineStorageRequired !== true) {
    fail("PRIVATE_IDENTITY_EXPOSURE", "真实身份原始材料必须保持仓外加密离线存储。");
  }
  assertExactArray(identity.privateDossier.fields, EXPECTED_PRIVATE_DOSSIER_FIELDS, "identityPrivacyPolicy.privateDossier.fields");
  assertExactArray(identity.publicIdentityBindingFields, EXPECTED_PUBLIC_BINDING_FIELDS, "identityPrivacyPolicy.publicIdentityBindingFields");
  assertExactArray(identity.publicPacketProhibitedFields, EXPECTED_PUBLIC_PROHIBITED_FIELDS, "identityPrivacyPolicy.publicPacketProhibitedFields");

  if (!Array.isArray(packet.reviewerSlots) || packet.reviewerSlots.length !== 2) {
    fail("PACKET_INVALID", "reviewerSlots 必须是两个固定空席。 ");
  }
  const prohibitedKeys = new Set(identity.publicPacketProhibitedFields);
  for (let slotIndex = 0; slotIndex < packet.reviewerSlots.length; slotIndex += 1) {
    const slot = packet.reviewerSlots[slotIndex];
    assertExactKeys(slot, [
      "slotId", "reviewerBinding", "identityVerificationState", "credentialVerificationState",
      "scopeVerificationState", "independenceVerificationState", "originalOpinionDigest",
      "originalOpinionStored", "submittedAt", "priorExposureToOtherOpinion", "status"
    ], `reviewerSlots.${slotIndex}`);
    if (slot.reviewerBinding !== null || slot.identityVerificationState !== "absent"
      || slot.credentialVerificationState !== "absent" || slot.scopeVerificationState !== "absent"
      || slot.independenceVerificationState !== "absent" || slot.originalOpinionDigest !== null
      || slot.originalOpinionStored !== false || slot.submittedAt !== null
      || slot.priorExposureToOtherOpinion !== null || slot.status !== "vacant") {
      fail("FABRICATED_REVIEWER_EVIDENCE", "候选审阅包只能保留空席，不能伪造现实专家或意见。");
    }
    for (const key of Object.keys(slot)) {
      if (prohibitedKeys.has(key)) fail("PRIVATE_IDENTITY_EXPOSURE", `公开审阅包不得包含身份字段：${key}`);
    }
  }
  assertExactArray(packet.reviewerSlots.map((slot) => slot.slotId), ["domain-expert-a", "domain-expert-b"], "reviewerSlots");

  const process = packet.reviewProcess;
  assertExactKeys(process, [
    "steps", "sameQuestionSetRequired", "mutualDisclosureBeforeBothOpinionsSealedAllowed",
    "immutableOriginalOpinionsRequired", "supplementsMustBeSeparateRecords", "reconciliationMayOverwriteOriginals"
  ], "reviewProcess");
  assertExactArray(process.steps, EXPECTED_REVIEW_PROCESS_STEPS, "reviewProcess.steps");
  if (process.sameQuestionSetRequired !== true || process.mutualDisclosureBeforeBothOpinionsSealedAllowed !== false
    || process.immutableOriginalOpinionsRequired !== true || process.supplementsMustBeSeparateRecords !== true
    || process.reconciliationMayOverwriteOriginals !== false) {
    fail("REVIEW_PROCESS_VIOLATION", "双席独立审阅、原件封存和补充记录边界不得弱化。");
  }

  const resolution = packet.automatedResolutionPolicy;
  assertExactKeys(resolution, [
    "majorityVoteAllowed", "opinionAveragingAllowed", "generatedModelWinnerSelectionAllowed",
    "unresolvedDisagreementMayBeAdopted", "allowedUnresolvedDisposition"
  ], "automatedResolutionPolicy");
  if (resolution.majorityVoteAllowed !== false || resolution.opinionAveragingAllowed !== false
    || resolution.generatedModelWinnerSelectionAllowed !== false
    || resolution.unresolvedDisagreementMayBeAdopted !== false) {
    fail("AUTOMATED_EXPERT_RESOLUTION_FORBIDDEN", "专家分歧不得多数表决、平均或由生成模型选赢家。");
  }
  assertExactArray(resolution.allowedUnresolvedDisposition, ["defer", "reject"], "allowedUnresolvedDisposition");

  const gate = packet.gateSummary;
  assertExactKeys(gate, [
    "packetArtifactLocksVerified", "domainExpertsRequired", "reviewerSlotsOccupied", "identitiesVerified",
    "credentialsVerified", "scopesVerified", "independentExpertReviewsVerified", "sealedOriginalOpinions",
    "expertReviewBundleComplete", "contentTruthEstablished", "expertTruthEstablished",
    "rightsLegalConclusionEstablished", "releaseReady", "publicDeploymentAuthorized", "expertClaimsAuthorized"
  ], "gateSummary");
  const expectedGate = {
    packetArtifactLocksVerified: EXPECTED_ARTIFACTS.length,
    domainExpertsRequired: 2,
    reviewerSlotsOccupied: 0,
    identitiesVerified: 0,
    credentialsVerified: 0,
    scopesVerified: 0,
    independentExpertReviewsVerified: 0,
    sealedOriginalOpinions: 0,
    expertReviewBundleComplete: false,
    contentTruthEstablished: false,
    expertTruthEstablished: false,
    rightsLegalConclusionEstablished: false,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  };
  for (const [key, expected] of Object.entries(expectedGate)) {
    if (gate[key] !== expected) fail("GATE_PROMOTION_FORBIDDEN", `gateSummary.${key} 必须保持 ${expected}。`);
  }

  const requiredNonClaims = [
    "real_reviewer_identity", "reviewer_credentials", "reviewer_independence", "expert_opinion",
    "content_truth", "expert_truth", "rights_legal_conclusion", "cross_system_authority",
    "release_readiness", "public_release_authorization"
  ];
  assertExactArray(packet.doesNotEstablish, requiredNonClaims, "doesNotEstablish");
  if (!SHA256_PATTERN.test(packet.packetDigest)
    || packet.packetDigest !== APPROVED_PACKET_DIGEST
    || packet.packetDigest !== computeExpertReviewPacketDigest(packet)) {
    fail("PACKET_DIGEST_MISMATCH", "专家审阅包摘要不匹配。");
  }
}

function artifactSnapshot(snapshots, relativePath) {
  const snapshot = snapshots.get(relativePath);
  if (!snapshot) fail("ARTIFACT_MISSING", `专家审阅包缺少同一读取快照：${relativePath}`);
  return snapshot;
}

function parseArtifactJson(snapshots, relativePath, label) {
  try {
    return parseBaziExpertReviewJsonBytes(
      artifactSnapshot(snapshots, relativePath).bytes,
      label,
      MAX_ARTIFACT_BYTES
    );
  } catch (cause) {
    if (cause instanceof BaziExpertReviewPacketError) throw cause;
    throw new BaziExpertReviewPacketError("LEDGER_BINDING_MISMATCH", `${label} 不是有效 JSON。`, { cause });
  }
}

function verifyArtifactLocks(packet, snapshots) {
  if (!Array.isArray(packet.artifactLocks) || packet.artifactLocks.length !== EXPECTED_ARTIFACTS.length) {
    fail("ARTIFACT_LOCK_MISMATCH", "专家审阅包冻结文件数量不匹配。");
  }
  for (let index = 0; index < EXPECTED_ARTIFACTS.length; index += 1) {
    const lock = packet.artifactLocks[index];
    const [artifactId, relativePath, evidenceLayer] = EXPECTED_ARTIFACTS[index];
    assertExactKeys(lock, ["artifactId", "path", "sha256", "evidenceLayer"], `artifactLocks.${index}`);
    if (lock.artifactId !== artifactId || lock.path !== relativePath || lock.evidenceLayer !== evidenceLayer
      || !SHA256_PATTERN.test(lock.sha256)) {
      fail("ARTIFACT_LOCK_MISMATCH", `专家审阅包冻结项不匹配：${artifactId}`);
    }
    const actual = artifactSnapshot(snapshots, relativePath).sha256;
    if (actual !== lock.sha256) fail("ARTIFACT_DRIFT", `专家审阅包冻结文件已漂移：${relativePath}`);
  }
}

export function verifyBaziExpertReviewSourceTrustChain(sourceLedger, rightsLedger) {
  const sourceSnapshot = capturePassiveJsonSnapshot(sourceLedger);
  const rightsSnapshot = capturePassiveJsonSnapshot(rightsLedger);
  try {
    verifyBaziSourceBindingCandidateLedger(sourceSnapshot);
    verifyBaziSourceRightsCandidateLedger(rightsSnapshot, sourceSnapshot);
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : "unknown source/rights verifier failure";
    throw new BaziExpertReviewPacketError(
      "SOURCE_RIGHTS_TRUST_CHAIN_INVALID",
      `专家审阅包来源／三层权利候选信任链无效：${detail}`,
      { cause }
    );
  }
  return Object.freeze({
    sourceCandidatesVerified: sourceSnapshot.candidates.length,
    rightsCandidatesVerified: rightsSnapshot.candidates.length,
    carrierAnchorsVerified: sourceSnapshot.candidates.reduce(
      (count, candidate) => count + candidate.facsimileAnchors.length,
      0
    )
  });
}

const INTAKE_RECORD_DIGEST_DOMAIN = "hakimi.bazi.expert-review-intake-record.v1";
const INTAKE_RECORD_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{2,199}$/u;
const INTAKE_OPAQUE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{2,199}$/u;
const ALLOWED_REVIEW_PURPOSES = Object.freeze(["candidate_feedback_only", "release_closure_review"]);
const EXPECTED_DOMAIN_REVIEW_SCOPE = Object.freeze([
  "bazi_rule_interpretation",
  "school_profile",
  "counterexample_cases",
  "high_risk_expression_boundary"
]);
const PRIVATE_INTAKE_KEYS = Object.freeze(new Set([
  "legalName", "legal_name", "email", "phone", "address", "governmentId",
  "government_id", "rawCredentialDocument", "raw_credential_document", "credentialRawEvidence",
  "credential_raw_evidence", "contactDetails", "contact_details", "privateContactHandle",
  "private_contact_handle", "filesystemPath", "storagePath", "repositoryPath"
]));
const EXPECTED_INTAKE_GATE_PROJECTION = Object.freeze({
  identityBindingsVerified: 0,
  sealedOriginalOpinionsVerified: 0,
  pairwiseIndependenceVerified: 0,
  independentExpertReviewsVerified: 0,
  expertReviewBundleComplete: false,
  countsTowardExpertGate: false,
  contentTruthEstablished: false,
  expertTruthEstablished: false,
  releaseReady: false
});

function intakeFail(message) {
  fail("INTAKE_RECORD_INVALID", message);
}

function intakeKeys(value, keys, label) {
  assertBoundaryExactKeys(value, keys, "INTAKE_RECORD_INVALID", label);
}

function intakeArray(value, label, { length = null, allowEmpty = true } = {}) {
  if (!Array.isArray(value)
    || (length !== null && value.length !== length)
    || (!allowEmpty && value.length === 0)) {
    intakeFail(`${label} 必须是${length === null ? "" : `长度为 ${length} 的`}数组。`);
  }
  return value;
}

function intakeString(value, label, { min = 1, max = 20_000 } = {}) {
  if (typeof value !== "string" || value.length < min || value.length > max) {
    intakeFail(`${label} 必须是长度受限字符串。`);
  }
  return value;
}

function intakeId(value, label) {
  if (typeof value !== "string" || !INTAKE_RECORD_ID_PATTERN.test(value)) {
    intakeFail(`${label} 不是稳定记录标识。`);
  }
  return value;
}

function intakeOpaqueId(value, label) {
  if (typeof value !== "string" || !INTAKE_OPAQUE_ID_PATTERN.test(value)) {
    intakeFail(`${label} 必须是不含路径语义的不透明标识。`);
  }
  return value;
}

function intakeSha(value, label) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    intakeFail(`${label} 必须是小写 SHA-256。`);
  }
  return value;
}

function intakeEnum(value, allowed, label) {
  if (!allowed.includes(value)) intakeFail(`${label} 不在允许枚举中。`);
  return value;
}

function intakeUtc(value, label) {
  if (!isCanonicalUtc(value)) intakeFail(`${label} 必须是严格毫秒级 UTC 时间。`);
  return value;
}

function intakeNotAfter(left, right, label) {
  if (Date.parse(left) > Date.parse(right)) intakeFail(`${label} 时间顺序无效。`);
}

function intakeUniqueStrings(values, label) {
  intakeArray(values, label);
  const seen = new Set();
  for (const value of values) {
    intakeString(value, label, { max: 2_000 });
    if (seen.has(value)) intakeFail(`${label} 不得重复。`);
    seen.add(value);
  }
}

function intakeOrderedSubset(values, universe, label) {
  intakeArray(values, label);
  const expected = values.map((value) => {
    const index = universe.indexOf(value);
    if (index < 0) intakeFail(`${label} 含越界值。`);
    return index;
  });
  if (new Set(expected).size !== expected.length
    || expected.some((value, index) => index > 0 && value <= expected[index - 1])) {
    intakeFail(`${label} 必须按固定全集顺序排列且不重复。`);
  }
}

function intakeRecordRef(value, label) {
  intakeKeys(value, ["recordId", "recordDigest"], label);
  intakeId(value.recordId, `${label}.recordId`);
  intakeSha(value.recordDigest, `${label}.recordDigest`);
}

function intakeNullableRecordRef(value, label) {
  if (value !== null) intakeRecordRef(value, label);
}

function intakeResponseRef(value, label) {
  intakeKeys(value, ["recordId", "recordDigest", "responseId"], label);
  intakeId(value.recordId, `${label}.recordId`);
  intakeSha(value.recordDigest, `${label}.recordDigest`);
  intakeId(value.responseId, `${label}.responseId`);
}

function intakeResponseRefToken(value) {
  return `${value.recordDigest}:${value.recordId}:${value.responseId}`;
}

function intakeRecordRefs(values, label, { length = null, sorted = false } = {}) {
  intakeArray(values, label, { length });
  const tokens = [];
  for (let index = 0; index < values.length; index += 1) {
    intakeRecordRef(values[index], `${label}.${index}`);
    tokens.push(`${values[index].recordDigest}:${values[index].recordId}`);
  }
  if (new Set(tokens).size !== tokens.length) intakeFail(`${label} 不得重复。`);
  if (sorted && JSON.stringify(tokens) !== JSON.stringify([...tokens].sort())) {
    intakeFail(`${label} 必须按摘要和记录 ID 稳定排序。`);
  }
}

function rejectPrivateIntakeKeys(value, label = "intake record") {
  const stack = [value];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === null || typeof current !== "object") continue;
    if (Array.isArray(current)) {
      for (const child of current) stack.push(child);
      continue;
    }
    for (const [key, child] of Object.entries(current)) {
      if (PRIVATE_INTAKE_KEYS.has(key)) intakeFail(`${label} 不得包含私有身份或仓储路径字段：${key}`);
      stack.push(child);
    }
  }
}

function verifyIntakeSessionBinding(binding, expectedSessionBinding = undefined) {
  intakeKeys(binding, [
    "systemId", "surfaceId", "surfaceVersion", "packetId", "packetDigest", "packetRawSha256", "readinessLedgerId",
    "readinessLedgerDigest", "reviewQuestionIds", "independenceFactorIds"
  ], "sessionBinding");
  if (expectedSessionBinding !== undefined) {
    intakeKeys(expectedSessionBinding, [
      "systemId", "surfaceId", "surfaceVersion", "packetId", "packetDigest", "packetRawSha256",
      "readinessLedgerId", "readinessLedgerDigest", "reviewQuestionIds", "independenceFactorIds"
    ], "expectedSessionBinding");
    if (expectedSessionBinding.systemId !== "bazi"
      || expectedSessionBinding.surfaceId !== "single-chart-report"
      || expectedSessionBinding.surfaceVersion !== "1.7.0") {
      intakeFail("expectedSessionBinding 必须保留八字 single-chart-report 1.7 范围。");
    }
    intakeId(expectedSessionBinding.packetId, "expectedSessionBinding.packetId");
    intakeId(expectedSessionBinding.readinessLedgerId, "expectedSessionBinding.readinessLedgerId");
    for (const key of ["packetDigest", "packetRawSha256", "readinessLedgerDigest"]) {
      intakeSha(expectedSessionBinding[key], `expectedSessionBinding.${key}`);
    }
    assertBoundaryExactArray(expectedSessionBinding.reviewQuestionIds, EXPECTED_REVIEW_QUESTION_IDS,
      "INTAKE_RECORD_INVALID", "expectedSessionBinding.reviewQuestionIds");
    assertBoundaryExactArray(expectedSessionBinding.independenceFactorIds, EXPECTED_INDEPENDENCE_CHECKLIST,
      "INTAKE_RECORD_INVALID", "expectedSessionBinding.independenceFactorIds");
    assertBoundaryCanonicalEqual(binding, expectedSessionBinding, "INTAKE_RECORD_INVALID",
      "sessionBinding 必须与给定的完整结构契约一致");
    return;
  }
  if (binding.systemId !== "bazi"
    || binding.surfaceId !== "single-chart-report"
    || binding.surfaceVersion !== "1.7.0"
    || binding.packetId !== APPROVED_PACKET_ID
    || binding.packetDigest !== APPROVED_PACKET_DIGEST
    || binding.packetRawSha256 !== APPROVED_PACKET_RAW_SHA256
    || binding.readinessLedgerId !== APPROVED_READINESS_LEDGER_ID
    || binding.readinessLedgerDigest !== APPROVED_READINESS_LEDGER_DIGEST) {
    intakeFail("sessionBinding 未绑定批准 packet/readiness 身份。");
  }
  assertBoundaryExactArray(
    binding.reviewQuestionIds,
    EXPECTED_REVIEW_QUESTION_IDS,
    "INTAKE_RECORD_INVALID",
    "sessionBinding.reviewQuestionIds"
  );
  assertBoundaryExactArray(
    binding.independenceFactorIds,
    EXPECTED_INDEPENDENCE_CHECKLIST,
    "INTAKE_RECORD_INVALID",
    "sessionBinding.independenceFactorIds"
  );
}

export function computeBaziExpertReviewIntakeRecordDigest(record) {
  const snapshot = capturePassiveJsonSnapshot(record);
  if (typeof snapshot.recordType !== "string" || typeof snapshot.recordVersion !== "string") {
    intakeFail("intake record 缺少摘要域所需的类型或版本。");
  }
  const { integrity: _integrity, ...unsigned } = snapshot;
  const preimage = [
    INTAKE_RECORD_DIGEST_DOMAIN,
    snapshot.recordType,
    snapshot.recordVersion,
    canonicalStringifyExpertReviewPacket(unsigned)
  ].join("\u0000");
  return createHash("sha256").update(preimage, "utf8").digest("hex");
}

function verifyIdentityBindingPayload(payload, createdAt) {
  intakeKeys(payload, [
    "reviewerId", "displayNameOrControlledPseudonym", "roleId", "verificationMethod",
    "verificationDate", "reviewScope", "evidenceType", "verifiedBy", "credentialDigest",
    "privateDossierRef", "roleOverlapDisclosures"
  ], "identity binding payload");
  intakeId(payload.reviewerId, "payload.reviewerId");
  intakeString(payload.displayNameOrControlledPseudonym, "payload.displayNameOrControlledPseudonym", { max: 200 });
  if (payload.roleId !== "domain_expert") intakeFail("identity binding 角色必须是 domain_expert。");
  intakeEnum(payload.verificationMethod, [
    "private_dossier_review", "credential_issuer_confirmation",
    "professional_registry_check", "other_documented_method"
  ], "payload.verificationMethod");
  intakeUtc(payload.verificationDate, "payload.verificationDate");
  intakeNotAfter(payload.verificationDate, createdAt, "identity binding");
  assertBoundaryExactArray(payload.reviewScope, EXPECTED_DOMAIN_REVIEW_SCOPE, "INTAKE_RECORD_INVALID", "payload.reviewScope");
  intakeEnum(payload.evidenceType, ["credential_and_scope_evidence", "scope_experience_evidence"], "payload.evidenceType");
  intakeKeys(payload.verifiedBy, ["verifierId", "verifierBindingRef"], "payload.verifiedBy");
  intakeId(payload.verifiedBy.verifierId, "payload.verifiedBy.verifierId");
  if (payload.verifiedBy.verifierId === payload.reviewerId) intakeFail("identity binding 不得自我核验。");
  intakeNullableRecordRef(payload.verifiedBy.verifierBindingRef, "payload.verifiedBy.verifierBindingRef");
  intakeSha(payload.credentialDigest, "payload.credentialDigest");
  intakeKeys(payload.privateDossierRef, [
    "opaqueRecordId", "storageClass", "encryptedArtifactSha256", "repositoryStorageAllowed"
  ], "payload.privateDossierRef");
  intakeOpaqueId(payload.privateDossierRef.opaqueRecordId, "payload.privateDossierRef.opaqueRecordId");
  if (payload.privateDossierRef.storageClass !== "encrypted_offline_private"
    || payload.privateDossierRef.repositoryStorageAllowed !== false) {
    intakeFail("身份 dossier 只能是仓外加密离线不透明引用。");
  }
  intakeSha(payload.privateDossierRef.encryptedArtifactSha256, "payload.privateDossierRef.encryptedArtifactSha256");
  if (payload.credentialDigest !== payload.privateDossierRef.encryptedArtifactSha256) {
    intakeFail("公开 credentialDigest 只能绑定仓外加密 dossier artifact，不得绑定原始低熵身份材料。");
  }
  intakeArray(payload.roleOverlapDisclosures, "payload.roleOverlapDisclosures");
  const overlapTokens = new Set();
  for (let index = 0; index < payload.roleOverlapDisclosures.length; index += 1) {
    const disclosure = payload.roleOverlapDisclosures[index];
    intakeKeys(disclosure, ["overlapType", "opaqueDisclosureId"], `payload.roleOverlapDisclosures.${index}`);
    intakeEnum(disclosure.overlapType, [
      "source_rights_reviewer_role", "engineering_reproducibility_reviewer_role",
      "project_owner_role", "other_governed_role_overlap"
    ], `payload.roleOverlapDisclosures.${index}.overlapType`);
    intakeOpaqueId(disclosure.opaqueDisclosureId, `payload.roleOverlapDisclosures.${index}.opaqueDisclosureId`);
    const token = `${disclosure.overlapType}:${disclosure.opaqueDisclosureId}`;
    if (overlapTokens.has(token)) intakeFail("role overlap disclosure 不得重复。");
    overlapTokens.add(token);
  }
  const orderedOverlapTokens = [...overlapTokens];
  if (JSON.stringify(orderedOverlapTokens) !== JSON.stringify([...orderedOverlapTokens].sort())) {
    intakeFail("role overlap disclosures 必须按受控类型和不透明 ID 稳定排序。");
  }
}

function verifyOpinionPayload(payload, createdAt) {
  intakeKeys(payload, [
    "opinionKind", "slotId", "reviewerBindingRef", "independenceAssessmentRef",
    "independenceCompletedAt", "reviewStartedAt", "submittedAt", "priorExposureState",
    "responses", "scopeStatement", "excludedScopes", "parentOriginalOpinionRef"
  ], "original opinion payload");
  intakeEnum(payload.opinionKind, ["original", "supplement"], "payload.opinionKind");
  intakeEnum(payload.slotId, ["domain-expert-a", "domain-expert-b"], "payload.slotId");
  intakeRecordRef(payload.reviewerBindingRef, "payload.reviewerBindingRef");
  intakeRecordRef(payload.independenceAssessmentRef, "payload.independenceAssessmentRef");
  intakeUtc(payload.independenceCompletedAt, "payload.independenceCompletedAt");
  intakeUtc(payload.reviewStartedAt, "payload.reviewStartedAt");
  intakeUtc(payload.submittedAt, "payload.submittedAt");
  intakeNotAfter(payload.independenceCompletedAt, payload.reviewStartedAt, "independence completion/opinion start");
  intakeNotAfter(payload.reviewStartedAt, payload.submittedAt, "opinion review start/submission");
  intakeNotAfter(payload.submittedAt, createdAt, "opinion submission/creation");
  intakeEnum(payload.priorExposureState, ["none_declared", "exposure_disclosed", "unknown"], "payload.priorExposureState");
  if (payload.opinionKind === "original" && payload.priorExposureState !== "none_declared") {
    intakeFail("original opinion 必须声明未接触另一位专家意见。");
  }
  if (payload.opinionKind === "supplement"
    && !["none_declared", "exposure_disclosed"].includes(payload.priorExposureState)) {
    intakeFail("supplement priorExposureState 不得为 unknown。");
  }
  intakeArray(payload.responses, "payload.responses", { length: EXPECTED_REVIEW_QUESTION_IDS.length });
  const responseIds = new Set();
  for (let index = 0; index < payload.responses.length; index += 1) {
    const response = payload.responses[index];
    intakeKeys(response, [
      "responseId", "questionId", "position", "originalText", "rationale", "evidenceRefs",
      "uncertainties", "affectedBindingIds", "affectedStructures", "highRiskBoundary"
    ], `payload.responses.${index}`);
    intakeId(response.responseId, `payload.responses.${index}.responseId`);
    if (responseIds.has(response.responseId)) intakeFail("opinion responseId 必须全局唯一。");
    responseIds.add(response.responseId);
    if (response.questionId !== EXPECTED_REVIEW_QUESTION_IDS[index]) {
      intakeFail("opinion responses 必须按批准四题逐题且仅一次作答。");
    }
    intakeEnum(response.position, ["support", "oppose", "conditional", "cannot_decide"], `payload.responses.${index}.position`);
    intakeString(response.originalText, `payload.responses.${index}.originalText`);
    intakeString(response.rationale, `payload.responses.${index}.rationale`);
    intakeRecordRefs(response.evidenceRefs, `payload.responses.${index}.evidenceRefs`, { sorted: true });
    intakeUniqueStrings(response.uncertainties, `payload.responses.${index}.uncertainties`);
    intakeOrderedSubset(response.affectedBindingIds, EXPECTED_BINDING_IDS, `payload.responses.${index}.affectedBindingIds`);
    intakeOrderedSubset(response.affectedStructures, EXPECTED_UNRESOLVED_STRUCTURES, `payload.responses.${index}.affectedStructures`);
    intakeEnum(response.highRiskBoundary, [
      "conservative_expression_only", "defer", "no_release", "not_applicable"
    ], `payload.responses.${index}.highRiskBoundary`);
  }
  intakeString(payload.scopeStatement, "payload.scopeStatement");
  assertBoundaryExactArray(payload.excludedScopes, EXPECTED_EXCLUDED_SCOPES, "INTAKE_RECORD_INVALID", "payload.excludedScopes");
  if (payload.opinionKind === "original" && payload.parentOriginalOpinionRef !== null) {
    intakeFail("original opinion 不得覆盖或引用父原件。");
  }
  if (payload.opinionKind === "supplement") {
    intakeRecordRef(payload.parentOriginalOpinionRef, "payload.parentOriginalOpinionRef");
  }
}

function verifySealReceiptPayload(payload, createdAt) {
  intakeKeys(payload, [
    "sealReceiptId", "opinionRef", "reviewerBindingRef", "opinionSubmittedAt", "rawOpinionArtifact",
    "privateStorage", "sealedAt", "sealedByCustodian", "firstSeenReceiptRef",
    "retrievalVerificationReceiptRef"
  ], "private opinion seal receipt payload");
  intakeId(payload.sealReceiptId, "payload.sealReceiptId");
  intakeRecordRef(payload.opinionRef, "payload.opinionRef");
  intakeRecordRef(payload.reviewerBindingRef, "payload.reviewerBindingRef");
  intakeUtc(payload.opinionSubmittedAt, "payload.opinionSubmittedAt");
  intakeUtc(payload.sealedAt, "payload.sealedAt");
  intakeNotAfter(payload.opinionSubmittedAt, payload.sealedAt, "opinion submission/seal");
  intakeNotAfter(payload.sealedAt, createdAt, "opinion seal/receipt creation");
  intakeKeys(payload.rawOpinionArtifact, ["sha256", "byteLength", "mediaType", "encoding"], "payload.rawOpinionArtifact");
  intakeSha(payload.rawOpinionArtifact.sha256, "payload.rawOpinionArtifact.sha256");
  if (!Number.isSafeInteger(payload.rawOpinionArtifact.byteLength)
    || payload.rawOpinionArtifact.byteLength <= 0
    || payload.rawOpinionArtifact.byteLength > MAX_ARTIFACT_BYTES
    || payload.rawOpinionArtifact.mediaType !== "application/json"
    || payload.rawOpinionArtifact.encoding !== "utf-8") {
    intakeFail("raw opinion artifact 字节、媒体类型或编码无效。");
  }
  intakeKeys(payload.privateStorage, [
    "storageClass", "opaqueRecordId", "encryptedArtifactSha256", "repositoryStorageAllowed"
  ], "payload.privateStorage");
  if (payload.privateStorage.storageClass !== "encrypted_offline_private"
    || payload.privateStorage.repositoryStorageAllowed !== false) {
    intakeFail("original opinion 只能仓外加密离线封存。");
  }
  intakeOpaqueId(payload.privateStorage.opaqueRecordId, "payload.privateStorage.opaqueRecordId");
  intakeSha(payload.privateStorage.encryptedArtifactSha256, "payload.privateStorage.encryptedArtifactSha256");
  intakeId(payload.sealedByCustodian, "payload.sealedByCustodian");
  intakeNullableRecordRef(payload.firstSeenReceiptRef, "payload.firstSeenReceiptRef");
  intakeNullableRecordRef(payload.retrievalVerificationReceiptRef, "payload.retrievalVerificationReceiptRef");
}

function verifyIndependencePayload(payload, createdAt) {
  intakeKeys(payload, [
    "assessmentId", "reviewerPair", "assessedBy", "assessmentStartedAt", "assessmentCompletedAt",
    "factors", "sharedDependencyDisclosures", "overallDisposition", "collectionEligibility"
  ], "pairwise independence payload");
  intakeId(payload.assessmentId, "payload.assessmentId");
  intakeArray(payload.reviewerPair, "payload.reviewerPair", { length: 2 });
  const pairTokens = [];
  const reviewerIds = [];
  for (let index = 0; index < payload.reviewerPair.length; index += 1) {
    const reviewer = payload.reviewerPair[index];
    intakeKeys(reviewer, ["reviewerId", "bindingRef"], `payload.reviewerPair.${index}`);
    intakeId(reviewer.reviewerId, `payload.reviewerPair.${index}.reviewerId`);
    intakeRecordRef(reviewer.bindingRef, `payload.reviewerPair.${index}.bindingRef`);
    reviewerIds.push(reviewer.reviewerId);
    pairTokens.push(`${reviewer.bindingRef.recordDigest}:${reviewer.bindingRef.recordId}`);
  }
  if (new Set(reviewerIds).size !== 2 || new Set(pairTokens).size !== 2
    || JSON.stringify(pairTokens) !== JSON.stringify([...pairTokens].sort())) {
    intakeFail("pairwise independence 必须绑定两个不同且稳定排序的 reviewer。");
  }
  intakeId(payload.assessedBy, "payload.assessedBy");
  if (reviewerIds.includes(payload.assessedBy)) intakeFail("独立性 assessor 不得是任一被评专家。");
  intakeUtc(payload.assessmentStartedAt, "payload.assessmentStartedAt");
  intakeUtc(payload.assessmentCompletedAt, "payload.assessmentCompletedAt");
  intakeNotAfter(payload.assessmentStartedAt, payload.assessmentCompletedAt, "independence assessment");
  intakeNotAfter(payload.assessmentCompletedAt, createdAt, "independence assessment/record creation");
  intakeArray(payload.factors, "payload.factors", { length: EXPECTED_INDEPENDENCE_CHECKLIST.length });
  let allNoConflict = true;
  for (let index = 0; index < payload.factors.length; index += 1) {
    const factor = payload.factors[index];
    intakeKeys(factor, [
      "factorId", "reviewerADeclaration", "reviewerBDeclaration", "privateEvidenceRefs",
      "assessorDisposition", "disclosureDigest", "assessedAt"
    ], `payload.factors.${index}`);
    if (factor.factorId !== EXPECTED_INDEPENDENCE_CHECKLIST[index]) {
      intakeFail("independence factors 必须按批准十因素逐项且仅一次评估。");
    }
    const declarationValues = ["no_conflict_disclosed", "conflict_disclosed", "unknown", "not_applicable"];
    intakeEnum(factor.reviewerADeclaration, declarationValues, `payload.factors.${index}.reviewerADeclaration`);
    intakeEnum(factor.reviewerBDeclaration, declarationValues, `payload.factors.${index}.reviewerBDeclaration`);
    intakeRecordRefs(factor.privateEvidenceRefs, `payload.factors.${index}.privateEvidenceRefs`, { sorted: true });
    intakeEnum(factor.assessorDisposition, [
      "no_material_conflict_observed", "material_conflict", "unresolved"
    ], `payload.factors.${index}.assessorDisposition`);
    intakeSha(factor.disclosureDigest, `payload.factors.${index}.disclosureDigest`);
    intakeUtc(factor.assessedAt, `payload.factors.${index}.assessedAt`);
    intakeNotAfter(payload.assessmentStartedAt, factor.assessedAt, `payload.factors.${index} start/assessment`);
    intakeNotAfter(factor.assessedAt, payload.assessmentCompletedAt, `payload.factors.${index}`);
    if (factor.reviewerADeclaration !== "no_conflict_disclosed"
      || factor.reviewerBDeclaration !== "no_conflict_disclosed"
      || factor.assessorDisposition !== "no_material_conflict_observed") {
      allNoConflict = false;
    }
  }
  intakeOrderedSubset(
    payload.sharedDependencyDisclosures,
    EXPECTED_INDEPENDENCE_CHECKLIST,
    "payload.sharedDependencyDisclosures"
  );
  intakeEnum(payload.overallDisposition, ["not_established", "not_independent"], "payload.overallDisposition");
  if ((!allNoConflict || payload.sharedDependencyDisclosures.length > 0)
    && !["not_established", "not_independent"].includes(payload.overallDisposition)) {
    intakeFail("有共同依赖、冲突、unknown 或 unresolved 时只能保持未建立或不独立。");
  }
  intakeEnum(payload.collectionEligibility, [
    "blocked", "candidate_feedback_only_allowed", "release_closure_review_allowed"
  ], "payload.collectionEligibility");
  if (payload.collectionEligibility !== "blocked") {
    intakeFail("当前批准 session 的 packet drift、0/12 与 source/rights gap 只允许 blocked collectionEligibility。");
  }
}

function verifyDisagreementPayload(payload, createdAt) {
  intakeKeys(payload, [
    "inventoryId", "opinionRefs", "sealReceiptRefs", "comparedAt", "createdBy",
    "latestSealAt", "questionComparisons", "agreementItems", "disagreements", "comparisonMethod"
  ], "disagreement inventory payload");
  intakeId(payload.inventoryId, "payload.inventoryId");
  intakeRecordRefs(payload.opinionRefs, "payload.opinionRefs", { length: 2, sorted: true });
  intakeRecordRefs(payload.sealReceiptRefs, "payload.sealReceiptRefs", { length: 2, sorted: true });
  intakeUtc(payload.latestSealAt, "payload.latestSealAt");
  intakeUtc(payload.comparedAt, "payload.comparedAt");
  intakeNotAfter(payload.latestSealAt, payload.comparedAt, "latest seal/disagreement comparison");
  intakeNotAfter(payload.comparedAt, createdAt, "disagreement comparison/record creation");
  intakeId(payload.createdBy, "payload.createdBy");
  intakeArray(payload.questionComparisons, "payload.questionComparisons", { length: EXPECTED_REVIEW_QUESTION_IDS.length });
  const comparisonByQuestion = new Map();
  const questionCoverage = new Map(EXPECTED_REVIEW_QUESTION_IDS.map((questionId) => [questionId, 0]));
  for (let index = 0; index < payload.questionComparisons.length; index += 1) {
    const comparison = payload.questionComparisons[index];
    intakeKeys(comparison, [
      "questionId", "comparisonState", "expertAResponseRef", "expertBResponseRef"
    ], `payload.questionComparisons.${index}`);
    if (comparison.questionId !== EXPECTED_REVIEW_QUESTION_IDS[index]) {
      intakeFail("disagreement inventory 必须按批准四题逐项比较。");
    }
    intakeEnum(comparison.comparisonState, [
      "same_declared_position", "different_declared_position", "not_comparable"
    ], `payload.questionComparisons.${index}.comparisonState`);
    intakeResponseRef(comparison.expertAResponseRef, `payload.questionComparisons.${index}.expertAResponseRef`);
    intakeResponseRef(comparison.expertBResponseRef, `payload.questionComparisons.${index}.expertBResponseRef`);
    if (intakeResponseRefToken(comparison.expertAResponseRef)
      === intakeResponseRefToken(comparison.expertBResponseRef)) {
      intakeFail("question comparison 必须引用两个不同原始意见响应。");
    }
    comparisonByQuestion.set(comparison.questionId, comparison);
  }
  intakeArray(payload.agreementItems, "payload.agreementItems");
  const agreementIds = new Set();
  for (let index = 0; index < payload.agreementItems.length; index += 1) {
    const agreement = payload.agreementItems[index];
    intakeKeys(agreement, [
      "agreementId", "questionIds", "opinionEvidenceRefs", "declaredAgreementOnly", "consensusTruthEstablished"
    ], `payload.agreementItems.${index}`);
    intakeId(agreement.agreementId, `payload.agreementItems.${index}.agreementId`);
    if (agreementIds.has(agreement.agreementId)) intakeFail("agreementId 不得重复。");
    agreementIds.add(agreement.agreementId);
    intakeOrderedSubset(agreement.questionIds, EXPECTED_REVIEW_QUESTION_IDS, `payload.agreementItems.${index}.questionIds`);
    if (agreement.questionIds.length !== 1) intakeFail("每个 agreement item 必须精确覆盖一道题。");
    intakeArray(agreement.opinionEvidenceRefs, `payload.agreementItems.${index}.opinionEvidenceRefs`, { length: 2 });
    for (let refIndex = 0; refIndex < 2; refIndex += 1) {
      intakeResponseRef(agreement.opinionEvidenceRefs[refIndex], `payload.agreementItems.${index}.opinionEvidenceRefs.${refIndex}`);
    }
    if (intakeResponseRefToken(agreement.opinionEvidenceRefs[0])
      === intakeResponseRefToken(agreement.opinionEvidenceRefs[1])) {
      intakeFail("agreement item 必须并列两个不同原始意见响应。");
    }
    const agreementQuestionId = agreement.questionIds[0];
    const agreementComparison = comparisonByQuestion.get(agreementQuestionId);
    if (agreementComparison?.comparisonState !== "same_declared_position"
      || canonicalStringifyExpertReviewPacket(agreement.opinionEvidenceRefs) !== canonicalStringifyExpertReviewPacket([
        agreementComparison.expertAResponseRef,
        agreementComparison.expertBResponseRef
      ])) {
      intakeFail("agreement item 必须与该题 comparison 状态及响应引用精确一致。");
    }
    questionCoverage.set(agreementQuestionId, questionCoverage.get(agreementQuestionId) + 1);
    if (agreement.declaredAgreementOnly !== true || agreement.consensusTruthEstablished !== false) {
      intakeFail("并列一致项不得冒称共识真值。");
    }
  }
  intakeArray(payload.disagreements, "payload.disagreements");
  const disagreementIds = new Set();
  const dispositionMap = new Map(EXPECTED_DISAGREEMENTS);
  for (let index = 0; index < payload.disagreements.length; index += 1) {
    const disagreement = payload.disagreements[index];
    intakeKeys(disagreement, [
      "disagreementId", "disagreementType", "questionIds", "bindingIds", "structureIds",
      "opinionEvidenceRefs", "requiredDisposition", "status", "selectedWinner",
      "majorityVoteApplied", "opinionAveragingApplied", "generatedModelWinnerSelectionApplied",
      "requiresNewPacketAndBothReviews"
    ], `payload.disagreements.${index}`);
    intakeId(disagreement.disagreementId, `payload.disagreements.${index}.disagreementId`);
    if (disagreementIds.has(disagreement.disagreementId)) intakeFail("disagreementId 不得重复。");
    disagreementIds.add(disagreement.disagreementId);
    if (!dispositionMap.has(disagreement.disagreementType)
      || disagreement.requiredDisposition !== dispositionMap.get(disagreement.disagreementType)) {
      intakeFail("分歧类型与处置必须保持批准映射。");
    }
    intakeOrderedSubset(disagreement.questionIds, EXPECTED_REVIEW_QUESTION_IDS, `payload.disagreements.${index}.questionIds`);
    if (disagreement.questionIds.length !== 1) intakeFail("每个 disagreement 必须精确覆盖一道题。");
    intakeOrderedSubset(disagreement.bindingIds, EXPECTED_BINDING_IDS, `payload.disagreements.${index}.bindingIds`);
    intakeOrderedSubset(disagreement.structureIds, EXPECTED_UNRESOLVED_STRUCTURES, `payload.disagreements.${index}.structureIds`);
    intakeArray(disagreement.opinionEvidenceRefs, `payload.disagreements.${index}.opinionEvidenceRefs`, { length: 2 });
    for (let refIndex = 0; refIndex < 2; refIndex += 1) {
      intakeResponseRef(disagreement.opinionEvidenceRefs[refIndex], `payload.disagreements.${index}.opinionEvidenceRefs.${refIndex}`);
    }
    if (intakeResponseRefToken(disagreement.opinionEvidenceRefs[0])
      === intakeResponseRefToken(disagreement.opinionEvidenceRefs[1])) {
      intakeFail("disagreement 必须并列两个不同原始意见响应。");
    }
    const disagreementQuestionId = disagreement.questionIds[0];
    const disagreementComparison = comparisonByQuestion.get(disagreementQuestionId);
    if (!disagreementComparison
      || disagreementComparison.comparisonState === "same_declared_position"
      || canonicalStringifyExpertReviewPacket(disagreement.opinionEvidenceRefs) !== canonicalStringifyExpertReviewPacket([
        disagreementComparison.expertAResponseRef,
        disagreementComparison.expertBResponseRef
      ])) {
      intakeFail("disagreement 必须与该题 comparison 状态及响应引用精确一致。");
    }
    questionCoverage.set(disagreementQuestionId, questionCoverage.get(disagreementQuestionId) + 1);
    if (disagreement.status !== "unresolved" || disagreement.selectedWinner !== null
      || disagreement.majorityVoteApplied !== false || disagreement.opinionAveragingApplied !== false
      || disagreement.generatedModelWinnerSelectionApplied !== false) {
      intakeFail("分歧不得被自动采纳、表决、平均或选赢家。");
    }
    const engineeringError = disagreement.disagreementType === "engineering_error";
    if (disagreement.requiresNewPacketAndBothReviews !== engineeringError) {
      intakeFail("engineering_error 必须要求新 packet 与双方重审。");
    }
  }
  if (payload.comparisonMethod !== "human_side_by_side_no_winner") {
    intakeFail("disagreement inventory 只能并列比较且不选赢家。");
  }
  for (const [questionId, count] of questionCoverage) {
    if (count !== 1) intakeFail(`题目 ${questionId} 必须被 agreement/disagreement 精确覆盖一次。`);
  }
}

function verifyReconciliationPayload(payload, createdAt) {
  intakeKeys(payload, [
    "noteId", "inventoryRef", "opinionRefs", "sealReceiptRefs", "inventoryCreatedAt",
    "latestSealAt", "reconciledAt", "dispositions", "originalsOverwritten", "productMutation",
    "majorityVoteApplied", "opinionAveragingApplied", "generatedModelWinnerSelectionApplied"
  ], "reconciliation note payload");
  intakeId(payload.noteId, "payload.noteId");
  intakeRecordRef(payload.inventoryRef, "payload.inventoryRef");
  intakeRecordRefs(payload.opinionRefs, "payload.opinionRefs", { length: 2, sorted: true });
  intakeRecordRefs(payload.sealReceiptRefs, "payload.sealReceiptRefs", { length: 2, sorted: true });
  intakeUtc(payload.inventoryCreatedAt, "payload.inventoryCreatedAt");
  intakeUtc(payload.latestSealAt, "payload.latestSealAt");
  intakeUtc(payload.reconciledAt, "payload.reconciledAt");
  intakeNotAfter(payload.latestSealAt, payload.inventoryCreatedAt, "seal/inventory chronology");
  intakeNotAfter(payload.inventoryCreatedAt, payload.reconciledAt, "inventory/reconciliation chronology");
  intakeNotAfter(payload.reconciledAt, createdAt, "reconciliation/record creation");
  intakeArray(payload.dispositions, "payload.dispositions", { allowEmpty: false });
  const ids = new Set();
  const dispositionMap = new Map(EXPECTED_DISAGREEMENTS);
  for (let index = 0; index < payload.dispositions.length; index += 1) {
    const disposition = payload.dispositions[index];
    intakeKeys(disposition, [
      "disagreementId", "disagreementType", "disposition", "proposalRef", "selectedWinner",
      "requiresNewPacketAndBothReviews"
    ], `payload.dispositions.${index}`);
    intakeId(disposition.disagreementId, `payload.dispositions.${index}.disagreementId`);
    if (ids.has(disposition.disagreementId)) intakeFail("reconciliation disagreementId 不得重复。");
    ids.add(disposition.disagreementId);
    if (!dispositionMap.has(disposition.disagreementType)
      || disposition.disposition !== dispositionMap.get(disposition.disagreementType)
      || disposition.selectedWinner !== null) {
      intakeFail("reconciliation 必须遵循批准处置且不得选赢家。");
    }
    const engineeringError = disposition.disagreementType === "engineering_error";
    if (disposition.requiresNewPacketAndBothReviews !== engineeringError) {
      intakeFail("engineering_error reconciliation 必须要求新 packet 与双方重审。");
    }
    if (engineeringError) {
      if (disposition.proposalRef !== null) {
        intakeFail("engineering_error 只能触发新 packet 与双方重审，不得接受旧 session proposalRef。");
      }
    } else {
      intakeNullableRecordRef(disposition.proposalRef, `payload.dispositions.${index}.proposalRef`);
    }
  }
  if (payload.originalsOverwritten !== false || payload.productMutation !== false
    || payload.majorityVoteApplied !== false || payload.opinionAveragingApplied !== false
    || payload.generatedModelWinnerSelectionApplied !== false) {
    intakeFail("reconciliation 不得覆盖原件、直接变更产品、表决、平均或模型选赢家。");
  }
}

function verifyBundlePayload(payload, reviewPurpose, createdAt) {
  intakeKeys(payload, [
    "bundleId", "componentRefs", "componentChronology", "inputClosureBindings", "componentSetDigest",
    "derivedGateProjection", "publicDeploymentAuthorized", "expertClaimsAuthorized"
  ], "expert review bundle payload");
  intakeId(payload.bundleId, "payload.bundleId");
  intakeKeys(payload.componentRefs, [
    "identityBindings", "independenceAssessment", "opinions", "sealReceipts",
    "disagreementInventory", "reconciliationNote", "supplements"
  ], "payload.componentRefs");
  intakeRecordRefs(payload.componentRefs.identityBindings, "payload.componentRefs.identityBindings", { length: 2, sorted: true });
  intakeRecordRef(payload.componentRefs.independenceAssessment, "payload.componentRefs.independenceAssessment");
  intakeRecordRefs(payload.componentRefs.opinions, "payload.componentRefs.opinions", { length: 2, sorted: true });
  intakeRecordRefs(payload.componentRefs.sealReceipts, "payload.componentRefs.sealReceipts", { length: 2, sorted: true });
  intakeRecordRef(payload.componentRefs.disagreementInventory, "payload.componentRefs.disagreementInventory");
  intakeNullableRecordRef(payload.componentRefs.reconciliationNote, "payload.componentRefs.reconciliationNote");
  intakeRecordRefs(payload.componentRefs.supplements, "payload.componentRefs.supplements", { sorted: true });
  const allComponentRefs = [
    ...payload.componentRefs.identityBindings,
    payload.componentRefs.independenceAssessment,
    ...payload.componentRefs.opinions,
    ...payload.componentRefs.sealReceipts,
    payload.componentRefs.disagreementInventory,
    ...(payload.componentRefs.reconciliationNote === null ? [] : [payload.componentRefs.reconciliationNote]),
    ...payload.componentRefs.supplements
  ];
  const allComponentTokens = allComponentRefs.map((ref) => `${ref.recordDigest}:${ref.recordId}`);
  if (new Set(allComponentTokens).size !== allComponentTokens.length) {
    intakeFail("bundle component refs 不得跨角色重复。");
  }
  intakeKeys(payload.componentChronology, [
    "independenceCompletedAt", "expertAReviewStartedAt", "expertBReviewStartedAt",
    "expertASubmittedAt", "expertBSubmittedAt", "expertASealedAt", "expertBSealedAt",
    "inventoryCreatedAt", "reconciliationCreatedAt"
  ], "payload.componentChronology");
  for (const key of [
    "independenceCompletedAt", "expertAReviewStartedAt", "expertBReviewStartedAt",
    "expertASubmittedAt", "expertBSubmittedAt", "expertASealedAt", "expertBSealedAt",
    "inventoryCreatedAt"
  ]) intakeUtc(payload.componentChronology[key], `payload.componentChronology.${key}`);
  if (payload.componentChronology.reconciliationCreatedAt !== null) {
    intakeUtc(payload.componentChronology.reconciliationCreatedAt, "payload.componentChronology.reconciliationCreatedAt");
  }
  for (const slot of ["A", "B"]) {
    intakeNotAfter(
      payload.componentChronology.independenceCompletedAt,
      payload.componentChronology[`expert${slot}ReviewStartedAt`],
      `bundle independence/expert ${slot} start`
    );
    intakeNotAfter(
      payload.componentChronology[`expert${slot}ReviewStartedAt`],
      payload.componentChronology[`expert${slot}SubmittedAt`],
      `bundle expert ${slot} start/submission`
    );
    intakeNotAfter(
      payload.componentChronology[`expert${slot}SubmittedAt`],
      payload.componentChronology[`expert${slot}SealedAt`],
      `bundle expert ${slot} submission/seal`
    );
    intakeNotAfter(
      payload.componentChronology[`expert${slot}SealedAt`],
      payload.componentChronology.inventoryCreatedAt,
      `bundle expert ${slot} seal/inventory`
    );
  }
  intakeNotAfter(
    payload.componentChronology.reconciliationCreatedAt ?? payload.componentChronology.inventoryCreatedAt,
    createdAt,
    "bundle component chronology/record creation"
  );
  if (payload.componentRefs.reconciliationNote === null
    !== (payload.componentChronology.reconciliationCreatedAt === null)) {
    intakeFail("bundle reconciliation ref 与 chronology 必须同时存在或同时为空。");
  }
  if (payload.componentChronology.reconciliationCreatedAt !== null) {
    intakeNotAfter(
      payload.componentChronology.inventoryCreatedAt,
      payload.componentChronology.reconciliationCreatedAt,
      "bundle inventory/reconciliation"
    );
  }
  const expectedComponentSetDigest = createHash("sha256")
    .update(canonicalStringifyExpertReviewPacket(payload.componentRefs), "utf8")
    .digest("hex");
  if (payload.componentSetDigest !== expectedComponentSetDigest) {
    intakeFail("bundle componentSetDigest 不匹配。");
  }
  if (reviewPurpose === "candidate_feedback_only") {
    if (payload.inputClosureBindings !== null) {
      intakeFail("candidate feedback 不得携带或升级 release closure bindings。");
    }
  } else {
    intakeKeys(payload.inputClosureBindings, [
      "readinessLedgerRef", "packetArtifactLocksCurrent", "bindingFrozenVerified",
      "bindingFrozenRequired", "sourceBindingClosureComplete", "sourceRightsClosureComplete"
    ], "payload.inputClosureBindings");
    intakeKeys(payload.inputClosureBindings.readinessLedgerRef, ["ledgerId", "ledgerDigest"], "payload.inputClosureBindings.readinessLedgerRef");
    if (payload.inputClosureBindings.readinessLedgerRef.ledgerId !== APPROVED_READINESS_LEDGER_ID
      || payload.inputClosureBindings.readinessLedgerRef.ledgerDigest !== APPROVED_READINESS_LEDGER_DIGEST
      || payload.inputClosureBindings.packetArtifactLocksCurrent !== false
      || payload.inputClosureBindings.bindingFrozenVerified !== 0
      || payload.inputClosureBindings.bindingFrozenRequired !== 12
      || payload.inputClosureBindings.sourceBindingClosureComplete !== false
      || payload.inputClosureBindings.sourceRightsClosureComplete !== false) {
      intakeFail("release closure record 必须如实保持当前 drift、0/12 与 source/rights 未闭合状态。");
    }
  }
  assertBoundaryCanonicalEqual(
    payload.derivedGateProjection,
    EXPECTED_INTAKE_GATE_PROJECTION,
    "INTAKE_RECORD_INVALID",
    "payload.derivedGateProjection"
  );
  if (payload.publicDeploymentAuthorized !== false || payload.expertClaimsAuthorized !== false) {
    intakeFail("candidate bundle 不得赋予部署或专家声明授权。");
  }
}

const INTAKE_PAYLOAD_VERIFIERS = Object.freeze({
  bazi_expert_public_identity_binding_v1: verifyIdentityBindingPayload,
  bazi_expert_original_opinion_v1: verifyOpinionPayload,
  bazi_expert_private_opinion_seal_receipt_v1: verifySealReceiptPayload,
  bazi_expert_pairwise_independence_assessment_v1: verifyIndependencePayload,
  bazi_expert_disagreement_inventory_v1: verifyDisagreementPayload,
  bazi_expert_reconciliation_note_v1: verifyReconciliationPayload,
  bazi_expert_review_bundle_v1: verifyBundlePayload
});

function preflightBaziExpertReviewIntakeRecordInternal(record, allowBundleAssembly, expectedSessionBinding = undefined) {
  const snapshot = capturePassiveJsonSnapshot(record);
  intakeKeys(snapshot, [
    "schemaVersion", "recordType", "recordId", "recordVersion", "createdAt",
    "reviewPurpose", "sessionBinding", "payload", "integrity"
  ], "intake record");
  if (snapshot.schemaVersion !== "1.0.0" || snapshot.recordVersion !== "1.0.0") {
    intakeFail("intake record schemaVersion/recordVersion 无效。");
  }
  intakeEnum(snapshot.recordType, EXPECTED_CANDIDATE_RECORD_FORMATS, "recordType");
  intakeId(snapshot.recordId, "recordId");
  intakeUtc(snapshot.createdAt, "createdAt");
  intakeEnum(snapshot.reviewPurpose, ALLOWED_REVIEW_PURPOSES, "reviewPurpose");
  verifyIntakeSessionBinding(snapshot.sessionBinding, expectedSessionBinding);
  rejectPrivateIntakeKeys(snapshot);
  const verifier = INTAKE_PAYLOAD_VERIFIERS[snapshot.recordType];
  if (typeof verifier !== "function") intakeFail("intake recordType 没有批准 preflight。");
  if (snapshot.recordType === "bazi_expert_review_bundle_v1") {
    if (allowBundleAssembly !== true) {
      intakeFail("bundle 必须通过专用 preflight 并提供完整 component records。");
    }
    verifier(snapshot.payload, snapshot.reviewPurpose, snapshot.createdAt);
  } else {
    verifier(snapshot.payload, snapshot.createdAt);
  }
  intakeKeys(snapshot.integrity, [
    "hashAlgorithm", "digestDomain", "recordDigest", "digestIsDigitalSignature", "authenticityEstablished"
  ], "integrity");
  if (snapshot.integrity.hashAlgorithm !== "SHA-256"
    || snapshot.integrity.digestDomain !== INTAKE_RECORD_DIGEST_DOMAIN
    || snapshot.integrity.recordDigest !== computeBaziExpertReviewIntakeRecordDigest(snapshot)
    || snapshot.integrity.digestIsDigitalSignature !== false
    || snapshot.integrity.authenticityEstablished !== false) {
    intakeFail("intake record integrity 摘要或非签名边界无效。");
  }
  const frozenRecord = deepFreezeJson(snapshot);
  return Object.freeze({
    record: frozenRecord,
    recordType: frozenRecord.recordType,
    recordDigest: frozenRecord.integrity.recordDigest,
    reviewPurpose: frozenRecord.reviewPurpose,
    identityVerified: false,
    realIdentityEstablished: false,
    authenticityEstablished: false,
    opinionAuthenticityEstablished: false,
    independenceVerified: false,
    pairwiseIndependenceEstablished: false,
    countsTowardExpertGate: false,
    expertGateEligible: false,
    expertReviewBundleComplete: false,
    expertTruthEstablished: false,
    bindingFrozenVerified: 0,
    sourceBindingClosureComplete: false,
    sourceRightsClosureComplete: false,
    candidateFeedbackCollectionReady: false,
    releaseClosureReviewReady: false,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  });
}

export function preflightBaziExpertReviewIntakeRecord(record) {
  return preflightBaziExpertReviewIntakeRecordInternal(record, false);
}

// This public helper checks data against a supplied structural contract only.
// It neither establishes that the contract is current nor issues any private
// context brand. Current consumers must derive their own canonical session.
export function preflightBaziExpertPrivateIntakeRecordAgainstSession(record, expectedSessionBinding) {
  if (arguments.length !== 2) intakeFail("结构会话预检必须提供记录与完整会话契约。");
  const snapshot = capturePassiveJsonSnapshot(record);
  const expected = capturePassiveJsonSnapshot(expectedSessionBinding);
  if (![
    "bazi_expert_public_identity_binding_v1",
    "bazi_expert_original_opinion_v1",
    "bazi_expert_private_opinion_seal_receipt_v1"
  ].includes(snapshot?.recordType)) {
    intakeFail("结构会话预检只接受身份绑定、原始意见或封存回执格式。");
  }
  return preflightBaziExpertReviewIntakeRecordInternal(snapshot, false, expected);
}

export function preflightBaziExpertReviewIntakeJsonBytes(bytes) {
  const parsed = parseBaziExpertReviewJsonBytes(bytes, "专家审阅 intake record", MAX_ARTIFACT_BYTES);
  return preflightBaziExpertReviewIntakeRecord(parsed);
}

function preflightExpectedIntakeType(record, expectedType) {
  const result = preflightBaziExpertReviewIntakeRecord(record);
  if (result.recordType !== expectedType) intakeFail(`预期 ${expectedType}，实际为 ${result.recordType}。`);
  return result;
}

export const preflightBaziExpertPublicIdentityBinding = (record) =>
  preflightExpectedIntakeType(record, "bazi_expert_public_identity_binding_v1");
export const preflightBaziExpertOriginalOpinion = (record) =>
  preflightExpectedIntakeType(record, "bazi_expert_original_opinion_v1");
export const preflightBaziExpertPrivateOpinionSealReceipt = (record) =>
  preflightExpectedIntakeType(record, "bazi_expert_private_opinion_seal_receipt_v1");
export const preflightBaziExpertPairwiseIndependenceAssessment = (record) =>
  preflightExpectedIntakeType(record, "bazi_expert_pairwise_independence_assessment_v1");
export const preflightBaziExpertDisagreementInventory = (record) =>
  preflightExpectedIntakeType(record, "bazi_expert_disagreement_inventory_v1");
export const preflightBaziExpertReconciliationNote = (record) =>
  preflightExpectedIntakeType(record, "bazi_expert_reconciliation_note_v1");

function scrubPrivateIdentityDossierFailure(cause) {
  if (cause instanceof BaziExpertReviewPacketError) {
    return new BaziExpertReviewPacketError(cause.code, cause.message);
  }
  return new BaziExpertReviewPacketError(
    "PRIVATE_IDENTITY_DOSSIER_FILE_INVALID",
    "仓外 identity dossier artifact 校验失败。"
  );
}

export async function verifyBaziPrivateIdentityDossierArtifact(options) {
  try {
    const request = capturePassiveJsonSnapshot(options);
    assertBoundaryExactKeys(
      request,
      ["workspaceRoot", "privateRoot", "dossierRelativePath", "identityBindingRecord"],
      "PRIVATE_IDENTITY_DOSSIER_REQUEST_INVALID",
      "仓外 identity dossier artifact 请求"
    );

    // The public identity binding is fully preflighted before any private path is resolved or read.
    const identityResult = preflightBaziExpertPublicIdentityBinding(request.identityBindingRecord);
    const identity = identityResult.record;
    const root = await resolvePrivateArtifactRoot(
      request.workspaceRoot,
      request.privateRoot,
      PRIVATE_IDENTITY_DOSSIER_ARTIFACT_DOMAIN
    );
    const file = await readStablePrivateArtifactFile(
      root,
      request.dossierRelativePath,
      MAX_ARTIFACT_BYTES,
      PRIVATE_IDENTITY_DOSSIER_ARTIFACT_DOMAIN
    );
    if (file.sha256 !== identity.payload.credentialDigest
      || file.sha256 !== identity.payload.privateDossierRef.encryptedArtifactSha256) {
      fail(
        "PRIVATE_IDENTITY_DOSSIER_BINDING_INVALID",
        "仓外 identity dossier artifact 原始字节与公开 identity binding 的双摘要绑定不一致。"
      );
    }

    const context = deepFreezeJson({
      contextType: PRIVATE_IDENTITY_DOSSIER_CONTEXT_TYPE,
      contextVersion: "1.0.0",
      identityBindingRef: capturePassiveJsonSnapshot(recordRefFromRecord(identity)),
      reviewPurpose: identity.reviewPurpose,
      reviewerId: identity.payload.reviewerId,
      opaqueDossierRecordId: identity.payload.privateDossierRef.opaqueRecordId,
      dossierArtifact: {
        sha256: file.sha256,
        byteLength: file.bytes.byteLength
      },
      privateRootOutsideWorkspaceMechanicallyVerified: true,
      plainDirectoryChainMechanicallyVerified: true,
      heldHandleReadMechanicallyVerified: true,
      identityBindingStructurallyPreflighted: true,
      sameHeldBufferShaMatchesCredentialAndDossierDigests: true,
      privateIdentityDossierArtifactMechanicallyBound: true,
      artifactEncryptionEstablished: false,
      encryptedStorageEstablished: false,
      requiredPrivateDossierFieldsVerified: false,
      identityVerified: false,
      realIdentityEstablished: false,
      credentialsVerified: false,
      scopeVerified: false,
      verifierIdentityEstablished: false,
      verifierAuthorityEstablished: false,
      authenticityEstablished: false,
      opinionAuthenticityEstablished: false,
      firstSeenEstablished: false,
      immutableFirstSeenEstablished: false,
      custodyEstablished: false,
      privateStorageVerified: false,
      independenceVerified: false,
      pairwiseIndependenceEstablished: false,
      countsTowardExpertGate: false,
      expertGateEligible: false,
      expertReviewBundleComplete: false,
      expertTruthEstablished: false,
      bindingFrozenVerified: 0,
      sourceBindingClosureComplete: false,
      sourceRightsClosureComplete: false,
      candidateFeedbackCollectionReady: false,
      releaseClosureReviewReady: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    });
    privateIdentityDossierContextState.set(context, Object.freeze({
      identityBindingRecord: identity,
      dossierArtifact: Object.freeze({
        sha256: file.sha256,
        byteLength: file.bytes.byteLength
      })
    }));
    return context;
  } catch (cause) {
    throw scrubPrivateIdentityDossierFailure(cause);
  }
}

function scrubPrivateOriginalOpinionFailure(cause) {
  if (cause instanceof BaziExpertReviewPacketError) {
    return new BaziExpertReviewPacketError(cause.code, cause.message);
  }
  return new BaziExpertReviewPacketError(
    "PRIVATE_OPINION_FILE_INVALID",
    "仓外 original opinion 校验失败。"
  );
}

export async function verifyBaziPrivateOriginalOpinionFile(options) {
  try {
    const request = capturePassiveJsonSnapshot(options);
    assertBoundaryExactKeys(
      request,
      ["workspaceRoot", "privateRoot", "opinionRelativePath", "sealReceiptRecord"],
      "PRIVATE_OPINION_REQUEST_INVALID",
      "仓外 original opinion 请求"
    );
    const root = await resolvePrivateArtifactRoot(
      request.workspaceRoot,
      request.privateRoot,
      PRIVATE_ORIGINAL_OPINION_ARTIFACT_DOMAIN
    );
    const file = await readStablePrivateArtifactFile(
      root,
      request.opinionRelativePath,
      MAX_ARTIFACT_BYTES,
      PRIVATE_ORIGINAL_OPINION_ARTIFACT_DOMAIN
    );

    let parsedOpinion;
    try {
      // The exact held-handle Buffer used for the raw digest is also the strict JSON parser input.
      parsedOpinion = parseBaziExpertReviewJsonBytes(
        file.bytes,
        "仓外 original opinion JSON",
        MAX_ARTIFACT_BYTES
      );
    } catch (cause) {
      throw scrubPrivateOriginalOpinionFailure(cause);
    }
    const opinionResult = preflightBaziExpertOriginalOpinion(parsedOpinion);
    const sealResult = preflightBaziExpertPrivateOpinionSealReceipt(request.sealReceiptRecord);
    const opinion = opinionResult.record;
    const seal = sealResult.record;
    if (opinion.payload.opinionKind !== "original") {
      fail("PRIVATE_OPINION_BINDING_INVALID", "仓外 original opinion 端点不接受 supplement。");
    }
    if (opinionResult.reviewPurpose !== sealResult.reviewPurpose
      || canonicalStringifyExpertReviewPacket(opinion.sessionBinding)
        !== canonicalStringifyExpertReviewPacket(seal.sessionBinding)
      || intakeRefToken(seal.payload.opinionRef) !== intakeRefToken(intakeResultRef(opinionResult))
      || intakeRefToken(seal.payload.reviewerBindingRef)
        !== intakeRefToken(opinion.payload.reviewerBindingRef)
      || seal.payload.opinionSubmittedAt !== opinion.payload.submittedAt
      || seal.payload.rawOpinionArtifact.sha256 !== file.sha256
      || seal.payload.rawOpinionArtifact.byteLength !== file.bytes.byteLength
      || seal.payload.rawOpinionArtifact.mediaType !== "application/json"
      || seal.payload.rawOpinionArtifact.encoding !== "utf-8") {
      fail(
        "PRIVATE_OPINION_BINDING_INVALID",
        "仓外 original opinion 原始字节、记录、reviewer、提交时间或 seal receipt 绑定不一致。"
      );
    }
    intakeNotAfter(opinion.createdAt, seal.payload.sealedAt, "original opinion record/seal event");

    const context = deepFreezeJson({
      contextType: PRIVATE_ORIGINAL_OPINION_CONTEXT_TYPE,
      contextVersion: "1.0.0",
      recordId: opinion.recordId,
      recordDigest: opinionResult.recordDigest,
      reviewPurpose: opinion.reviewPurpose,
      slotId: opinion.payload.slotId,
      reviewerBindingRef: capturePassiveJsonSnapshot(opinion.payload.reviewerBindingRef),
      sealReceiptRef: capturePassiveJsonSnapshot(intakeResultRef(sealResult)),
      questionIds: [...EXPECTED_REVIEW_QUESTION_IDS],
      rawOpinionArtifact: {
        sha256: file.sha256,
        byteLength: file.bytes.byteLength,
        mediaType: "application/json",
        encoding: "utf-8"
      },
      privateRootOutsideWorkspaceMechanicallyVerified: true,
      plainDirectoryChainMechanicallyVerified: true,
      heldHandleReadMechanicallyVerified: true,
      sameBufferHashAndStrictJsonParse: true,
      originalOpinionStructurallyPreflighted: true,
      sealReceiptStructurallyPreflighted: true,
      rawArtifactMatchesSealReceipt: true,
      firstSeenReceiptReferencePresent: seal.payload.firstSeenReceiptRef !== null,
      retrievalVerificationReceiptReferencePresent: seal.payload.retrievalVerificationReceiptRef !== null,
      identityVerified: false,
      realIdentityEstablished: false,
      authenticityEstablished: false,
      opinionAuthenticityEstablished: false,
      firstSeenEstablished: false,
      immutableFirstSeenEstablished: false,
      custodyEstablished: false,
      privateStorageVerified: false,
      independenceVerified: false,
      pairwiseIndependenceEstablished: false,
      countsTowardExpertGate: false,
      expertGateEligible: false,
      expertReviewBundleComplete: false,
      expertTruthEstablished: false,
      bindingFrozenVerified: 0,
      sourceBindingClosureComplete: false,
      sourceRightsClosureComplete: false,
      candidateFeedbackCollectionReady: false,
      releaseClosureReviewReady: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    });
    privateOriginalOpinionContextState.set(context, Object.freeze({
      opinionRecord: opinion,
      sealReceiptRecord: seal
    }));
    return context;
  } catch (cause) {
    throw scrubPrivateOriginalOpinionFailure(cause);
  }
}

function resolvePrivateContextPair(value, stateMap, label, recordField) {
  if (utilTypes.isProxy(value) || !Array.isArray(value)) {
    intakeFail(`${label} 必须是不可代理的长度为 2 的数组。`);
  }
  let prototype;
  let descriptors;
  try {
    prototype = Object.getPrototypeOf(value);
    descriptors = Object.getOwnPropertyDescriptors(value);
  } catch {
    intakeFail(`${label} 无法安全读取描述符。`);
  }
  const keys = Reflect.ownKeys(descriptors);
  if (prototype !== Array.prototype
    || keys.some((key) => typeof key === "symbol")
    || keys.some((key) => !["0", "1", "length"].includes(key))
    || descriptors.length?.value !== 2
    || descriptors.length?.get
    || descriptors.length?.set) {
    intakeFail(`${label} 必须是 exact 长度为 2 的普通数组。`);
  }
  const contexts = [];
  for (const index of [0, 1]) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
      intakeFail(`${label} 不得含访问器或稀疏元素。`);
    }
    const context = descriptor.value;
    if (context === null || typeof context !== "object" || utilTypes.isProxy(context)) {
      intakeFail(`${label} 元素无效。`);
    }
    const state = stateMap.get(context);
    if (!state) intakeFail(`${label} 元素不是本模块本进程签发的 opaque context。`);
    contexts.push(Object.freeze({ context, state }));
  }
  if (contexts[0].context === contexts[1].context
    || intakeRefToken(recordRefFromRecord(contexts[0].state[recordField]))
      === intakeRefToken(recordRefFromRecord(contexts[1].state[recordField]))) {
    intakeFail(`${label} 不得重复绑定同一记录。`);
  }
  return Object.freeze(contexts);
}

function resolvePrivateOriginalOpinionContexts(value) {
  return resolvePrivateContextPair(
    value,
    privateOriginalOpinionContextState,
    "private original opinion contexts",
    "opinionRecord"
  );
}

function resolvePrivateIdentityDossierContexts(value) {
  const contexts = resolvePrivateContextPair(
    value,
    privateIdentityDossierContextState,
    "private identity dossier contexts",
    "identityBindingRecord"
  );
  const left = contexts[0].state;
  const right = contexts[1].state;
  if (left.dossierArtifact.sha256 === right.dossierArtifact.sha256
    || left.identityBindingRecord.payload.privateDossierRef.opaqueRecordId
      === right.identityBindingRecord.payload.privateDossierRef.opaqueRecordId) {
    intakeFail("private identity dossier contexts 不得重复绑定同一 artifact 或 opaque dossier ID。");
  }
  return contexts;
}

function recordRefFromRecord(record) {
  return Object.freeze({
    recordId: record.recordId,
    recordDigest: record.integrity.recordDigest
  });
}

function intakeResultRef(result) {
  return Object.freeze({
    recordId: result.record.recordId,
    recordDigest: result.recordDigest
  });
}

function intakeRefToken(ref) {
  return `${ref.recordDigest}:${ref.recordId}`;
}

function sortIntakeRefs(refs) {
  return [...refs].sort((left, right) => {
    const leftToken = intakeRefToken(left);
    const rightToken = intakeRefToken(right);
    return leftToken < rightToken ? -1 : leftToken > rightToken ? 1 : 0;
  });
}

function assertIntakeSameSessionAndPurpose(bundleResult, componentResults) {
  for (const result of componentResults) {
    if (result.reviewPurpose !== bundleResult.reviewPurpose
      || canonicalStringifyExpertReviewPacket(result.record.sessionBinding)
        !== canonicalStringifyExpertReviewPacket(bundleResult.record.sessionBinding)) {
      intakeFail("bundle component 必须与 bundle 使用完全相同的 reviewPurpose/sessionBinding。");
    }
  }
}

export function preflightBaziExpertReviewBundle(record, componentRecords) {
  const bundleResult = preflightBaziExpertReviewIntakeRecordInternal(record, true);
  if (bundleResult.recordType !== "bazi_expert_review_bundle_v1") {
    intakeFail(`预期 bazi_expert_review_bundle_v1，实际为 ${bundleResult.recordType}。`);
  }
  if (componentRecords === null || typeof componentRecords !== "object" || Array.isArray(componentRecords)) {
    intakeFail("bundle 必须提供 exact componentRecords 对象。");
  }
  const components = capturePassiveJsonSnapshot(componentRecords);
  intakeKeys(components, [
    "identityBindings", "independenceAssessment", "originalOpinions", "sealReceipts",
    "disagreementInventory", "reconciliationNote", "supplements"
  ], "bundle componentRecords");
  intakeArray(components.identityBindings, "componentRecords.identityBindings", { length: 2 });
  intakeArray(components.originalOpinions, "componentRecords.originalOpinions", { length: 2 });
  intakeArray(components.sealReceipts, "componentRecords.sealReceipts", { length: 2 });
  intakeArray(components.supplements, "componentRecords.supplements");

  const identityResults = components.identityBindings.map((entry) =>
    preflightExpectedIntakeType(entry, "bazi_expert_public_identity_binding_v1"));
  const independenceResult = preflightExpectedIntakeType(
    components.independenceAssessment,
    "bazi_expert_pairwise_independence_assessment_v1"
  );
  const opinionResults = components.originalOpinions.map((entry) =>
    preflightExpectedIntakeType(entry, "bazi_expert_original_opinion_v1"));
  const sealResults = components.sealReceipts.map((entry) =>
    preflightExpectedIntakeType(entry, "bazi_expert_private_opinion_seal_receipt_v1"));
  const inventoryResult = preflightExpectedIntakeType(
    components.disagreementInventory,
    "bazi_expert_disagreement_inventory_v1"
  );
  const reconciliationResult = components.reconciliationNote === null
    ? null
    : preflightExpectedIntakeType(components.reconciliationNote, "bazi_expert_reconciliation_note_v1");
  const supplementResults = components.supplements.map((entry) =>
    preflightExpectedIntakeType(entry, "bazi_expert_original_opinion_v1"));
  const componentResults = [
    ...identityResults,
    independenceResult,
    ...opinionResults,
    ...sealResults,
    inventoryResult,
    ...(reconciliationResult === null ? [] : [reconciliationResult]),
    ...supplementResults
  ];
  const componentRecordIds = [bundleResult.record.recordId, ...componentResults.map((result) => result.record.recordId)];
  if (new Set(componentRecordIds).size !== componentRecordIds.length) {
    intakeFail("bundle 与全部 component records 的 recordId 必须全局唯一，不能以不同摘要覆盖同一 ID。");
  }
  for (const result of componentResults) {
    intakeNotAfter(
      result.record.createdAt,
      bundleResult.record.createdAt,
      "component record/bundle record creation"
    );
  }
  assertIntakeSameSessionAndPurpose(bundleResult, componentResults);
  const globalResponseIds = new Set();
  for (const opinionResult of [...opinionResults, ...supplementResults]) {
    for (const response of opinionResult.record.payload.responses) {
      if (globalResponseIds.has(response.responseId)) {
        intakeFail("bundle 内 original/supplement responseId 必须全局唯一。");
      }
      globalResponseIds.add(response.responseId);
    }
  }

  const identityRefs = sortIntakeRefs(identityResults.map(intakeResultRef));
  const independenceRef = intakeResultRef(independenceResult);
  const opinionRefs = sortIntakeRefs(opinionResults.map(intakeResultRef));
  const sealRefs = sortIntakeRefs(sealResults.map(intakeResultRef));
  const inventoryRef = intakeResultRef(inventoryResult);
  const reconciliationRef = reconciliationResult === null ? null : intakeResultRef(reconciliationResult);
  const supplementRefs = sortIntakeRefs(supplementResults.map(intakeResultRef));
  assertBoundaryCanonicalEqual(bundleResult.record.payload.componentRefs, {
    identityBindings: identityRefs,
    independenceAssessment: independenceRef,
    opinions: opinionRefs,
    sealReceipts: sealRefs,
    disagreementInventory: inventoryRef,
    reconciliationNote: reconciliationRef,
    supplements: supplementRefs
  }, "INTAKE_RECORD_INVALID", "bundle component refs/full records");

  const identityByRef = new Map();
  const reviewerIds = new Set();
  for (const identityResult of identityResults) {
    const identityRef = intakeResultRef(identityResult);
    const reviewerId = identityResult.record.payload.reviewerId;
    if (reviewerIds.has(reviewerId)) intakeFail("bundle 两个 identity binding 必须绑定不同 reviewerId。");
    reviewerIds.add(reviewerId);
    identityByRef.set(intakeRefToken(identityRef), identityResult);
  }
  const pairRefs = sortIntakeRefs(
    independenceResult.record.payload.reviewerPair.map((entry) => entry.bindingRef)
  );
  assertBoundaryCanonicalEqual(pairRefs, identityRefs, "INTAKE_RECORD_INVALID", "bundle independence reviewer pair");
  for (const pairEntry of independenceResult.record.payload.reviewerPair) {
    const identityResult = identityByRef.get(intakeRefToken(pairEntry.bindingRef));
    if (!identityResult || identityResult.record.payload.reviewerId !== pairEntry.reviewerId) {
      intakeFail("bundle independence reviewerId/bindingRef 与 identity binding 不一致。");
    }
  }

  const opinionBySlot = new Map();
  const usedIdentityRefs = new Set();
  for (const opinionResult of opinionResults) {
    const opinion = opinionResult.record.payload;
    if (opinion.opinionKind !== "original") intakeFail("bundle originalOpinions 只能包含 original records。");
    if (opinionBySlot.has(opinion.slotId)) intakeFail("bundle original opinion slot 不得重复。");
    opinionBySlot.set(opinion.slotId, opinionResult);
    const reviewerRefToken = intakeRefToken(opinion.reviewerBindingRef);
    const identityResult = identityByRef.get(reviewerRefToken);
    if (!identityResult || usedIdentityRefs.has(reviewerRefToken)) {
      intakeFail("bundle 两份 original opinions 必须分别绑定两个 identity bindings。");
    }
    usedIdentityRefs.add(reviewerRefToken);
    if (intakeRefToken(opinion.independenceAssessmentRef) !== intakeRefToken(independenceRef)
      || opinion.independenceCompletedAt !== independenceResult.record.payload.assessmentCompletedAt) {
      intakeFail("bundle original opinion 必须绑定同一份先完成的 independence assessment。");
    }
    intakeNotAfter(
      independenceResult.record.createdAt,
      opinion.reviewStartedAt,
      "independence record/opinion start"
    );
    intakeNotAfter(
      identityResult.record.payload.verificationDate,
      independenceResult.record.payload.assessmentStartedAt,
      "identity verification/independence assessment start"
    );
    intakeNotAfter(
      identityResult.record.createdAt,
      independenceResult.record.payload.assessmentStartedAt,
      "identity record/independence assessment start"
    );
    intakeNotAfter(
      identityResult.record.payload.verificationDate,
      opinion.reviewStartedAt,
      "identity verification/opinion start"
    );
    intakeNotAfter(
      identityResult.record.createdAt,
      opinion.reviewStartedAt,
      "identity record/opinion start"
    );
  }
  const expertA = opinionBySlot.get("domain-expert-a");
  const expertB = opinionBySlot.get("domain-expert-b");
  if (!expertA || !expertB) intakeFail("bundle 必须精确包含 domain-expert-a/b 两份 original opinions。");

  const sealByOpinionRef = new Map();
  for (const sealResult of sealResults) {
    const seal = sealResult.record.payload;
    const opinionToken = intakeRefToken(seal.opinionRef);
    if (sealByOpinionRef.has(opinionToken)) intakeFail("bundle 每份 original opinion 只能有一个 seal receipt。");
    const opinionResult = opinionResults.find((candidate) =>
      intakeRefToken(intakeResultRef(candidate)) === opinionToken);
    if (!opinionResult
      || intakeRefToken(seal.reviewerBindingRef) !== intakeRefToken(opinionResult.record.payload.reviewerBindingRef)
      || seal.opinionSubmittedAt !== opinionResult.record.payload.submittedAt) {
      intakeFail("bundle seal 必须精确绑定对应 opinion、reviewer 与 submittedAt。");
    }
    intakeNotAfter(opinionResult.record.createdAt, seal.sealedAt, "opinion record/seal event");
    sealByOpinionRef.set(opinionToken, sealResult);
  }
  if (sealByOpinionRef.size !== 2) intakeFail("bundle 必须封存两份 original opinions。");
  const sealA = sealByOpinionRef.get(intakeRefToken(intakeResultRef(expertA)));
  const sealB = sealByOpinionRef.get(intakeRefToken(intakeResultRef(expertB)));
  if (!sealA || !sealB) intakeFail("bundle A/B original opinion seal 缺失。");

  assertBoundaryCanonicalEqual(
    inventoryResult.record.payload.opinionRefs,
    opinionRefs,
    "INTAKE_RECORD_INVALID",
    "bundle inventory opinion refs"
  );
  assertBoundaryCanonicalEqual(
    inventoryResult.record.payload.sealReceiptRefs,
    sealRefs,
    "INTAKE_RECORD_INVALID",
    "bundle inventory seal refs"
  );
  const latestSealAt = [sealA.record.payload.sealedAt, sealB.record.payload.sealedAt].sort().at(-1);
  if (inventoryResult.record.payload.latestSealAt !== latestSealAt) {
    intakeFail("bundle inventory latestSealAt 与两份 seal receipts 不一致。");
  }
  for (const sealResult of sealResults) {
    intakeNotAfter(
      sealResult.record.createdAt,
      inventoryResult.record.payload.comparedAt,
      "seal record/inventory comparison"
    );
  }
  for (let index = 0; index < EXPECTED_REVIEW_QUESTION_IDS.length; index += 1) {
    const comparison = inventoryResult.record.payload.questionComparisons[index];
    const responseA = expertA.record.payload.responses[index];
    const responseB = expertB.record.payload.responses[index];
    const expectedARef = { ...intakeResultRef(expertA), responseId: responseA.responseId };
    const expectedBRef = { ...intakeResultRef(expertB), responseId: responseB.responseId };
    if (comparison.questionId !== responseA.questionId
      || comparison.questionId !== responseB.questionId
      || canonicalStringifyExpertReviewPacket(comparison.expertAResponseRef)
        !== canonicalStringifyExpertReviewPacket(expectedARef)
      || canonicalStringifyExpertReviewPacket(comparison.expertBResponseRef)
        !== canonicalStringifyExpertReviewPacket(expectedBRef)) {
      intakeFail("bundle inventory 四题 response refs 必须精确绑定 A/B 原始意见。");
    }
    const expectedComparisonState = responseA.position === "cannot_decide"
      || responseB.position === "cannot_decide"
      ? "not_comparable"
      : responseA.position === responseB.position
        ? "same_declared_position"
        : "different_declared_position";
    if (comparison.comparisonState !== expectedComparisonState) {
      intakeFail("bundle inventory comparisonState 必须由 A/B 原始 response.position 唯一派生。");
    }
  }

  const disagreements = inventoryResult.record.payload.disagreements;
  const referencedSupplementTokens = new Set();
  if ((disagreements.length > 0) !== (reconciliationResult !== null)) {
    intakeFail("bundle reconciliation 必须仅在存在 disagreements 时出现。");
  }
  if (reconciliationResult !== null) {
    const reconciliation = reconciliationResult.record.payload;
    assertBoundaryCanonicalEqual(reconciliation.inventoryRef, inventoryRef, "INTAKE_RECORD_INVALID", "reconciliation inventory ref");
    assertBoundaryCanonicalEqual(reconciliation.opinionRefs, opinionRefs, "INTAKE_RECORD_INVALID", "reconciliation opinion refs");
    assertBoundaryCanonicalEqual(reconciliation.sealReceiptRefs, sealRefs, "INTAKE_RECORD_INVALID", "reconciliation seal refs");
    if (reconciliation.inventoryCreatedAt !== inventoryResult.record.createdAt
      || reconciliation.latestSealAt !== latestSealAt) {
      intakeFail("reconciliation chronology 必须绑定 inventory record 与最新 seal。");
    }
    const expectedDispositions = new Map(disagreements.map((entry) => [
      entry.disagreementId,
      `${entry.disagreementType}:${entry.requiredDisposition}`
    ]));
    if (reconciliation.dispositions.length !== expectedDispositions.size) {
      intakeFail("reconciliation dispositions 必须精确覆盖全部 disagreements。");
    }
    for (const disposition of reconciliation.dispositions) {
      if (expectedDispositions.get(disposition.disagreementId)
        !== `${disposition.disagreementType}:${disposition.disposition}`) {
        intakeFail("reconciliation disposition 与 inventory disagreement 不一致。");
      }
      if (disposition.proposalRef !== null
        && !supplementRefs.some((ref) => intakeRefToken(ref) === intakeRefToken(disposition.proposalRef))) {
        intakeFail("非空 reconciliation proposalRef 必须解析到 bundle 中一份 supplement record。");
      }
      if (disposition.proposalRef !== null) {
        referencedSupplementTokens.add(intakeRefToken(disposition.proposalRef));
      }
    }
  }

  if (supplementResults.length > 0 && (disagreements.length === 0 || reconciliationResult === null)) {
    intakeFail("supplements 只能在存在 disagreements 与 reconciliation 的 bundle 中出现。");
  }
  for (const supplementResult of supplementResults) {
    const supplement = supplementResult.record.payload;
    if (supplement.opinionKind !== "supplement") intakeFail("bundle supplements 只能包含 supplement records。");
    const parent = opinionResults.find((candidate) =>
      intakeRefToken(intakeResultRef(candidate)) === intakeRefToken(supplement.parentOriginalOpinionRef));
    if (!parent
      || intakeRefToken(parent.record.payload.reviewerBindingRef) !== intakeRefToken(supplement.reviewerBindingRef)
      || intakeRefToken(supplement.independenceAssessmentRef) !== intakeRefToken(independenceRef)
      || supplement.independenceCompletedAt !== independenceResult.record.payload.assessmentCompletedAt
      || supplement.slotId !== parent.record.payload.slotId) {
      intakeFail("supplement 必须绑定同一 reviewer、independence 与一份 original opinion。");
    }
    if (supplementResult.record.recordId === parent.record.recordId) {
      intakeFail("supplement recordId 不得与 parent original recordId 相同。");
    }
    const parentSeal = sealByOpinionRef.get(intakeRefToken(intakeResultRef(parent)));
    if (!parentSeal || reconciliationResult === null) {
      intakeFail("supplement 必须存在已封存 parent opinion 与 reconciliation。");
    }
    intakeNotAfter(parent.record.payload.submittedAt, parentSeal.record.payload.sealedAt, "parent opinion/seal before supplement");
    intakeNotAfter(parentSeal.record.payload.sealedAt, inventoryResult.record.createdAt, "parent seal/inventory before supplement");
    intakeNotAfter(inventoryResult.record.createdAt, supplement.reviewStartedAt, "inventory/supplement start");
    intakeNotAfter(supplement.submittedAt, reconciliationResult.record.payload.reconciledAt, "supplement submission/reconciliation");
    intakeNotAfter(supplementResult.record.createdAt, reconciliationResult.record.payload.reconciledAt, "supplement record/reconciliation event");
    intakeNotAfter(supplementResult.record.createdAt, reconciliationResult.record.createdAt, "supplement/reconciliation record creation");
  }
  for (const supplementRef of supplementRefs) {
    if (!referencedSupplementTokens.has(intakeRefToken(supplementRef))) {
      intakeFail("bundle 中每份 supplement 必须至少被一个 reconciliation disposition proposalRef 引用。");
    }
  }

  assertBoundaryCanonicalEqual(bundleResult.record.payload.componentChronology, {
    independenceCompletedAt: independenceResult.record.payload.assessmentCompletedAt,
    expertAReviewStartedAt: expertA.record.payload.reviewStartedAt,
    expertBReviewStartedAt: expertB.record.payload.reviewStartedAt,
    expertASubmittedAt: expertA.record.payload.submittedAt,
    expertBSubmittedAt: expertB.record.payload.submittedAt,
    expertASealedAt: sealA.record.payload.sealedAt,
    expertBSealedAt: sealB.record.payload.sealedAt,
    inventoryCreatedAt: inventoryResult.record.createdAt,
    reconciliationCreatedAt: reconciliationResult?.record.createdAt ?? null
  }, "INTAKE_RECORD_INVALID", "bundle component chronology/full records");

  return Object.freeze({
    ...bundleResult,
    bundleAssemblyStructurallyPreflighted: true,
    componentCounts: Object.freeze({
      identityBindings: identityResults.length,
      independenceAssessments: 1,
      originalOpinions: opinionResults.length,
      sealReceipts: sealResults.length,
      disagreementInventories: 1,
      reconciliationNotes: reconciliationResult === null ? 0 : 1,
      supplements: supplementResults.length
    })
  });
}

export function preflightBaziExpertReviewBundleFromPrivateOpinionContexts(
  record,
  privateOpinionContexts,
  componentRecords
) {
  const resolvedContexts = resolvePrivateOriginalOpinionContexts(privateOpinionContexts);
  if (componentRecords === null || typeof componentRecords !== "object" || Array.isArray(componentRecords)) {
    intakeFail("private-context bundle 必须提供其余 exact componentRecords 对象。");
  }
  const publicComponents = capturePassiveJsonSnapshot(componentRecords);
  intakeKeys(publicComponents, [
    "identityBindings", "independenceAssessment", "disagreementInventory",
    "reconciliationNote", "supplements"
  ], "private-context bundle componentRecords");
  const fullResult = preflightBaziExpertReviewBundle(record, {
    identityBindings: publicComponents.identityBindings,
    independenceAssessment: publicComponents.independenceAssessment,
    originalOpinions: resolvedContexts.map((entry) => entry.state.opinionRecord),
    sealReceipts: resolvedContexts.map((entry) => entry.state.sealReceiptRecord),
    disagreementInventory: publicComponents.disagreementInventory,
    reconciliationNote: publicComponents.reconciliationNote,
    supplements: publicComponents.supplements
  });
  return Object.freeze({
    ...fullResult,
    privateOriginalOpinionFilesMechanicallyBound: 2
  });
}

export function preflightBaziExpertReviewBundleFromPrivateEvidenceContexts(
  record,
  privateIdentityDossierContexts,
  privateOpinionContexts,
  componentRecords
) {
  const resolvedIdentityContexts = resolvePrivateIdentityDossierContexts(privateIdentityDossierContexts);
  const resolvedOpinionContexts = resolvePrivateOriginalOpinionContexts(privateOpinionContexts);
  if (componentRecords === null || typeof componentRecords !== "object" || Array.isArray(componentRecords)) {
    intakeFail("private-evidence-context bundle 必须提供其余 exact componentRecords 对象。");
  }
  const publicComponents = capturePassiveJsonSnapshot(componentRecords);
  intakeKeys(publicComponents, [
    "independenceAssessment", "disagreementInventory", "reconciliationNote", "supplements"
  ], "private-evidence-context bundle componentRecords");
  const fullResult = preflightBaziExpertReviewBundle(record, {
    identityBindings: resolvedIdentityContexts.map((entry) => entry.state.identityBindingRecord),
    independenceAssessment: publicComponents.independenceAssessment,
    originalOpinions: resolvedOpinionContexts.map((entry) => entry.state.opinionRecord),
    sealReceipts: resolvedOpinionContexts.map((entry) => entry.state.sealReceiptRecord),
    disagreementInventory: publicComponents.disagreementInventory,
    reconciliationNote: publicComponents.reconciliationNote,
    supplements: publicComponents.supplements
  });
  return Object.freeze({
    ...fullResult,
    privateIdentityDossierArtifactsMechanicallyBound: 2,
    privateOriginalOpinionFilesMechanicallyBound: 2,
    artifactEncryptionEstablished: false,
    encryptedStorageEstablished: false,
    requiredPrivateDossierFieldsVerified: false,
    identityVerified: false,
    realIdentityEstablished: false,
    credentialsVerified: false,
    scopeVerified: false,
    verifierIdentityEstablished: false,
    verifierAuthorityEstablished: false,
    authenticityEstablished: false,
    opinionAuthenticityEstablished: false,
    firstSeenEstablished: false,
    immutableFirstSeenEstablished: false,
    custodyEstablished: false,
    privateStorageVerified: false,
    independenceVerified: false,
    pairwiseIndependenceEstablished: false,
    countsTowardExpertGate: false,
    expertGateEligible: false,
    expertReviewBundleComplete: false,
    expertTruthEstablished: false,
    bindingFrozenVerified: 0,
    sourceBindingClosureComplete: false,
    sourceRightsClosureComplete: false,
    candidateFeedbackCollectionReady: false,
    releaseClosureReviewReady: false,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  });
}

async function verifyLedgerBindings(workspaceRoot, packet, snapshots) {
  assertExactKeys(packet.sourceLedgerBindings, [
    "engineeringBindingLedgerId", "engineeringBindingLedgerDigest",
    "sourceBindingLedgerId", "sourceBindingLedgerDigest", "sourceRightsLedgerId", "sourceRightsLedgerDigest"
  ], "sourceLedgerBindings");
  const engineeringLedger = parseArtifactJson(
    snapshots,
    "content/bazi-strength-engineering-binding-candidates.v1.json",
    "专家审阅包工程 Binding 候选账"
  );
  try {
    await verifyBaziEngineeringBindingCandidateLedger(workspaceRoot, engineeringLedger);
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : "unknown engineering verifier failure";
    throw new BaziExpertReviewPacketError(
      "ENGINEERING_TRUST_CHAIN_INVALID",
      `专家审阅包工程 Binding 候选信任链无效：${detail}`,
      { cause }
    );
  }
  const bindingLedger = parseArtifactJson(
    snapshots,
    "content/bazi-strength-source-binding-candidates.v1.json",
    "专家审阅包来源 Binding 候选账"
  );
  const rightsLedger = parseArtifactJson(
    snapshots,
    "content/bazi-strength-source-rights-candidates.v1.json",
    "专家审阅包三层权利候选账"
  );
  verifyBaziExpertReviewSourceTrustChain(bindingLedger, rightsLedger);
  const expected = {
    engineeringBindingLedgerId: engineeringLedger.ledgerId,
    engineeringBindingLedgerDigest: engineeringLedger.ledgerDigest,
    sourceBindingLedgerId: bindingLedger.ledgerId,
    sourceBindingLedgerDigest: bindingLedger.ledgerDigest,
    sourceRightsLedgerId: rightsLedger.ledgerId,
    sourceRightsLedgerDigest: rightsLedger.ledgerDigest
  };
  for (const [key, value] of Object.entries(expected)) {
    if (packet.sourceLedgerBindings[key] !== value) fail("LEDGER_BINDING_MISMATCH", `专家审阅包来源账绑定不匹配：${key}`);
  }
}

export async function verifyBaziExpertReviewPacket(workspaceRoot, packet) {
  const packetSnapshot = capturePassiveJsonSnapshot(packet);
  verifyStaticBoundary(packetSnapshot);
  const intakeGap = await verifyBaziExpertReviewIntakeGapLedger(workspaceRoot, packetSnapshot);
  const snapshots = await readArtifactSnapshots(workspaceRoot);
  verifyArtifactLocks(packetSnapshot, snapshots);
  await verifyLedgerBindings(workspaceRoot, packetSnapshot, snapshots);
  const frozenPacket = deepFreezeJson(packetSnapshot);
  return Object.freeze({
    packet: frozenPacket,
    packetDigest: frozenPacket.packetDigest,
    intakeGapLedgerDigest: intakeGap.ledgerDigest,
    artifactLocksVerified: frozenPacket.artifactLocks.length,
    reviewerSlotsOccupied: 0,
    independentExpertReviewsVerified: 0
  });
}
