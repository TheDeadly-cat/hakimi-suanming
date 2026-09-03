import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { TextDecoder, types as utilTypes } from "node:util";
import { parseExpression } from "@babel/parser";

export const BAZI_EXPERT_AUTHORITY_MATERIAL_PRECHECK_RELATIVE_PATH =
  "content/system-admission/bazi-expert-authority-material-precheck.v1.json";

const RECORD_TYPE = "bazi_expert_authority_material_precheck_v1";
const LEDGER_ID = "hakimi.bazi.expert-authority-material-precheck/1.0.0";
const STATUS = "zero_instance_authority_material_contract_formal_intake_blocked";
const CREATED_AT = "2026-08-30T00:00:00.000Z";
const LEDGER_DIGEST_DOMAIN = "hakimi.bazi.expert-authority-material-precheck.v1";
const CANDIDATE_DIGEST_DOMAIN = "hakimi.bazi.expert-authority-material-candidate.v1";
const MAX_LEDGER_BYTES = 1_000_000;
const MAX_PARENT_BYTES = 2_000_000;
const MAX_SOURCE_BYTES = 2_000_000;
const MAX_INPUT_NODES = 100_000;
const MAX_INPUT_DEPTH = 64;
const MAX_INPUT_TEXT = 1_000_000;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const SAFE_ID_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,159}$/u;
const CANONICAL_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

const TYPED_ARRAY_PROTOTYPE = Object.getPrototypeOf(Uint8Array.prototype);
const TYPED_ARRAY_BUFFER_GETTER =
  Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "buffer").get;
const TYPED_ARRAY_BYTE_OFFSET_GETTER =
  Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "byteOffset").get;
const TYPED_ARRAY_BYTE_LENGTH_GETTER =
  Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "byteLength").get;
const ARRAY_BUFFER_RESIZABLE_GETTER =
  Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "resizable")?.get;
const UINT8_ARRAY_SET = Uint8Array.prototype.set;

const EXPECTED_LEDGER_RAW_IDENTITY = Object.freeze({
  rawBytes: 12_974,
  path: BAZI_EXPERT_AUTHORITY_MATERIAL_PRECHECK_RELATIVE_PATH,
  rawSha256: "ccfe28e4dfb8c1bd7a6764d6253cf818c37a712ea24225bd100092362cc1f2af"
});

const PARENT_IDENTITIES = Object.freeze({
  currentBindingReadiness: Object.freeze({
    digest: "97406785d688d3ab8b4dc824d7980c890a80bfc829a75279109edcc1c3d48f0c",
    digestKey: "ledgerDigest",
    id: "hakimi.bazi.strength.binding-freeze-readiness/1.6.0",
    idKey: "ledgerId",
    path: "content/system-admission/bazi-binding-freeze-requirements.v1.json",
    rawBytes: 30_655,
    rawSha256: "1db59e2f7d3c5448f27b32d96bc8cf5a75968e8470dd0592d70594b44b3ec809",
    recordType: "bazi_binding_freeze_readiness_requirements",
    schemaVersion: "1.6.0",
    status: "readiness_only_dtt_notice_reconciliation_blocked_bindings_frozen_0_of_12"
  }),
  expertReviewIntakeGap: Object.freeze({
    digest: "6cf349fda4c4fd2b8ddada22417e12741c37abc6fc884338dbf5c741e0fc1766",
    digestKey: "ledgerDigest",
    id: "hakimi.bazi.expert-review-intake-gap/1.0.0",
    idKey: "ledgerId",
    path: "content/system-admission/bazi-expert-review-intake-gap.v1.json",
    rawBytes: 4_309,
    rawSha256: "7d01f000358f6938675c34fbebf6379e55c3f56dadee12fab6a3d801b33ef6ac",
    recordType: "bazi_expert_review_intake_gap_v1",
    schemaVersion: "1.0.0",
    status: "zero_instance_intake_contract_not_collection_ready"
  }),
  expertReviewPacket: Object.freeze({
    digest: "cfe554b60b4698e0acd0a42e14484f4683eb7663d4f6862b767cf70404d2cd5f",
    digestKey: "packetDigest",
    id: "hakimi.bazi.strength.expert-review-packet/1.5.0",
    idKey: "packetId",
    path: "content/bazi-strength-expert-review-packet.v1.json",
    rawBytes: 12_684,
    rawSha256: "ba28de1b95d57de4320913e7a0b00fe780630d15408c5b22b84311977ea29163",
    recordType: "bazi_strength_expert_review_packet_candidate",
    schemaVersion: "1.0.0",
    status: "mechanically_bound_vacant_review_packet"
  }),
  publicCandidatePrescreen: Object.freeze({
    digest: "ba9878bfcf266d5f34c46cf0808b3bbc382ddaa8464b36bf1a63d8c77bdf6d21",
    digestKey: "ledgerDigest",
    id: "hakimi.bazi.expert-public-candidate-prescreen/1.0.0",
    idKey: "ledgerId",
    path: "content/system-admission/bazi-expert-public-candidate-prescreen.v1.json",
    rawBytes: 21_691,
    rawSha256: "88e5dabca1f3bb10cc8c8dfc2d2bfbdcf6b65a9a577b4747374e4e986c6988d9",
    recordType: "bazi_expert_public_candidate_prescreen_v1",
    schemaVersion: "1.0.0",
    status: "public_candidate_discovery_only_non_authoritative"
  }),
  publicEvidenceFollowup: Object.freeze({
    digest: "3cbe882b03294119b75a3ba8e13bfcf60202529029aff0ea3821bf232f7619f9",
    digestKey: "followupDigest",
    id: "hakimi.bazi.expert-public-evidence-followup/1.0.0",
    idKey: "followupId",
    path: "content/system-admission/bazi-expert-public-evidence-followup.v1.json",
    rawBytes: 11_989,
    rawSha256: "1961f1e9118f24eba8ea2a7c782afa6e3748ed56e3a4de2c4bca3bf5f481bce3",
    recordType: "bazi_expert_public_evidence_followup_v1",
    schemaVersion: "1.0.0",
    status: "link_only_operator_recorded_public_followup_non_authoritative_not_formal_expert_intake"
  })
});

const FORMAL_VERIFIER_HELPER_IDENTITY = Object.freeze({
  path: "scripts/bazi-expert-review-packet-lib.mjs",
  rawBytes: 139_453,
  rawSha256: "76046086e4d4b49cd7166b548f4b6999fb208db020ed9b06e1cdefa90c2cd669",
  role: "historical_formal_packet_and_intake_gap_verifier_source_identity"
});

const INTAKE_GAP_LOCKED_READINESS = Object.freeze({
  ledgerDigest: "feea402079cab44a5d3e0855f867114684da96e4005343a1b1a7cdc75fbee9ad",
  ledgerId: "hakimi.bazi.strength.binding-freeze-readiness/1.5.0",
  path: "content/system-admission/bazi-binding-freeze-requirements.v1.json",
  rawBytes: 26_038,
  rawSha256: "662c91e6269d5e860a0d207185680ea7c7b752f24e313859c0d987cb5b446201"
});

export const BAZI_EXPERT_AUTHORITY_PRECHECK_REVIEWER_SEAT_IDS = Object.freeze([
  "domain-expert-a",
  "domain-expert-b"
]);

export const BAZI_EXPERT_AUTHORITY_PRECHECK_REVIEW_QUESTION_IDS = Object.freeze([
  "month-command-hidden-stem-duplication",
  "relative-factor-weighting",
  "strength-band-thresholds",
  "strength-invalidation-structures"
]);

export const BAZI_EXPERT_AUTHORITY_PRECHECK_INDEPENDENCE_FACTOR_IDS = Object.freeze([
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

const COMPONENT_RECORD_TYPES = Object.freeze([
  "bazi_expert_verifier_authority_material_v1",
  "bazi_expert_reviewer_identity_material_v1",
  "bazi_expert_reviewer_credential_material_v1",
  "bazi_expert_reviewer_question_scope_material_v1",
  "bazi_expert_pairwise_independence_material_v1",
  "bazi_expert_authority_material_bundle_v1"
]);

const EVIDENCE_CATEGORIES = Object.freeze({
  pairwiseFactor: Object.freeze([
    "pairwise_factor_primary_declaration_record",
    "pairwise_factor_independent_corroboration"
  ]),
  reviewerCredential: Object.freeze([
    "reviewer_credential_primary_issuer_record",
    "reviewer_credential_independent_status_corroboration"
  ]),
  reviewerIdentity: Object.freeze([
    "reviewer_identity_primary_authoritative_record",
    "reviewer_identity_independent_corroboration"
  ]),
  reviewerQuestionScope: Object.freeze([
    "reviewer_question_scope_primary_work_record",
    "reviewer_question_scope_independent_corroboration"
  ]),
  verifierAuthority: Object.freeze([
    "verifier_authority_primary_grant_record",
    "verifier_authority_independent_registry_record"
  ])
});

const FIXED_DECISION_REASON_CODES = Object.freeze([
  "FORMAL_INTAKE_PARENT_DRIFT",
  "VERIFIER_AUTHORITY_REGISTRY_ZERO_INSTANCES",
  "REAL_IDENTITY_AND_CREDENTIAL_REALITY_NOT_ESTABLISHED"
]);

const FORBIDDEN_AUTHORITY_ISSUER_IDS = Object.freeze([
  "domain-reviewer",
  "engineering-reviewer",
  "generation-model",
  "project-owner",
  "source-rights-reviewer"
]);

const DOES_NOT_ESTABLISH = Object.freeze([
  "real_reviewer_or_verifier_identity",
  "reviewer_credentials_current_status_or_revocation_state",
  "reviewer_question_scope_fit",
  "verifier_identity_authority_scope_or_grant_authenticity",
  "pairwise_reviewer_independence",
  "private_dossier_authenticity_first_seen_or_custody",
  "expert_participation_consent_opinion_or_expert_truth",
  "content_truth_source_closure_rights_or_legal_conclusion",
  "formal_expert_intake_currentness_or_expert_gate_closure",
  "node_binary_loader_launcher_or_toolchain_identity",
  "same_session_or_cross_process_replay_exclusion",
  "mutation_epoch_cross_file_atomic_snapshot_interval_mutation_or_aba_exclusion",
  "release_readiness_public_deployment_or_public_release_authorization"
]);

const verifiedLedgerResults = new WeakSet();
const trustedMaterialPrecheckResults = new WeakSet();

export class BaziExpertAuthorityMaterialPrecheckError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "BaziExpertAuthorityMaterialPrecheckError";
    Object.defineProperties(this, {
      code: { value: code, enumerable: false, configurable: false, writable: false },
      safeForCli: { value: true, enumerable: false, configurable: false, writable: false }
    });
  }
}

function fail(code, message, cause) {
  throw new BaziExpertAuthorityMaterialPrecheckError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function walkAst(root, visitor) {
  const stack = [root];
  const seen = new Set();
  let count = 0;
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== "object" || seen.has(node)) continue;
    seen.add(node);
    count += 1;
    if (count > MAX_INPUT_NODES) fail("JSON_TOO_COMPLEX", "D authority precheck JSON AST 超过节点上限。");
    visitor(node);
    for (const [key, child] of Object.entries(node)) {
      if (key === "loc" || key === "start" || key === "end") continue;
      if (Array.isArray(child)) {
        for (let index = child.length - 1; index >= 0; index -= 1) stack.push(child[index]);
      } else if (child && typeof child === "object") {
        stack.push(child);
      }
    }
  }
}

function captureUint8Array(bytes, label, maxBytes) {
  if (utilTypes.isProxy(bytes)) fail("JSON_PROXY_FORBIDDEN", `${label} 不接受 Proxy 字节。`);
  if (!utilTypes.isUint8Array(bytes)
    || typeof TYPED_ARRAY_BUFFER_GETTER !== "function"
    || typeof TYPED_ARRAY_BYTE_OFFSET_GETTER !== "function"
    || typeof TYPED_ARRAY_BYTE_LENGTH_GETTER !== "function") {
    fail("JSON_BYTES_INVALID", `${label} 必须是内部 Uint8Array 字节视图。`);
  }
  let backingBuffer;
  let byteOffset;
  let byteLength;
  try {
    backingBuffer = Reflect.apply(TYPED_ARRAY_BUFFER_GETTER, bytes, []);
    byteOffset = Reflect.apply(TYPED_ARRAY_BYTE_OFFSET_GETTER, bytes, []);
    byteLength = Reflect.apply(TYPED_ARRAY_BYTE_LENGTH_GETTER, bytes, []);
  } catch (cause) {
    fail("JSON_BYTES_INVALID", `${label} 的内部字节槽不可读。`, cause);
  }
  if (!Number.isSafeInteger(byteOffset) || byteOffset < 0
    || !Number.isSafeInteger(byteLength) || byteLength < 0
    || !Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    fail("JSON_BYTES_INVALID", `${label} 的字节边界无效。`);
  }
  if (byteLength > maxBytes) fail("JSON_TOO_LARGE", `${label} 超过输入上限。`);
  if (typeof utilTypes.isSharedArrayBuffer === "function" && utilTypes.isSharedArrayBuffer(backingBuffer)) {
    fail("JSON_SHARED_BUFFER_FORBIDDEN", `${label} 不接受 SharedArrayBuffer。`);
  }
  if (!utilTypes.isArrayBuffer(backingBuffer)) fail("JSON_BYTES_INVALID", `${label} backing buffer 无效。`);
  if (typeof ARRAY_BUFFER_RESIZABLE_GETTER === "function") {
    let resizable;
    try {
      resizable = Reflect.apply(ARRAY_BUFFER_RESIZABLE_GETTER, backingBuffer, []);
    } catch (cause) {
      fail("JSON_BYTES_INVALID", `${label} backing buffer 状态不可读。`, cause);
    }
    if (resizable) fail("JSON_RESIZABLE_BUFFER_FORBIDDEN", `${label} 不接受 resizable ArrayBuffer。`);
  }
  const captured = new Uint8Array(byteLength);
  try {
    Reflect.apply(UINT8_ARRAY_SET, captured, [bytes]);
  } catch (cause) {
    fail("JSON_BYTES_INVALID", `${label} 无法复制到私有固定缓冲区。`, cause);
  }
  return captured;
}

function parseCapturedJson(captured, label) {
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
  if (!source.trim()) fail("JSON_INVALID", `${label} 为空。`);
  let expression;
  try {
    expression = parseExpression(source.trim(), {
      attachComment: false,
      errorRecovery: false,
      sourceFilename: "bazi-expert-authority-material-precheck.json",
      sourceType: "script"
    });
  } catch (cause) {
    fail("JSON_INVALID", `${label} 不能按严格 JSON 检查。`, cause);
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
    if (cause instanceof BaziExpertAuthorityMaterialPrecheckError) throw cause;
    fail("JSON_INVALID", `${label} 不是合法 JSON。`, cause);
  }
}

export function parseBaziExpertAuthorityMaterialPrecheckJsonBytes(
  bytes,
  label = "八字专家 authority 材料预检 JSON",
  maxBytes = MAX_LEDGER_BYTES
) {
  return parseCapturedJson(captureUint8Array(bytes, label, maxBytes), label);
}

function capturePassiveJsonValue(value, state, depth) {
  if (depth > MAX_INPUT_DEPTH) fail("INPUT_DEPTH_EXCEEDED", "D authority precheck 输入超过最大深度。");
  state.nodes += 1;
  if (state.nodes > MAX_INPUT_NODES) fail("INPUT_NODE_LIMIT_EXCEEDED", "D authority precheck 输入超过节点上限。");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) fail("INPUT_VALUE_INVALID", "D authority precheck 输入含无效数值。");
    return value;
  }
  if (typeof value === "string") {
    state.textCharacters += value.length;
    if (state.textCharacters > MAX_INPUT_TEXT) fail("INPUT_TEXT_LIMIT_EXCEEDED", "D authority precheck 输入超过文本上限。");
    return value;
  }
  if (typeof value !== "object") fail("INPUT_VALUE_INVALID", "D authority precheck 只接受 JSON 数据值。");
  if (utilTypes.isProxy(value)) fail("INPUT_PROXY_FORBIDDEN", "D authority precheck 输入不接受 Proxy。");
  if (state.active.has(value)) fail("INPUT_CYCLE_FORBIDDEN", "D authority precheck 输入不接受循环引用。");
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
      fail("INPUT_OBJECT_UNSAFE", "D authority precheck 输入不能被安全捕获。", cause);
    }
    const descriptorKeys = Reflect.ownKeys(descriptors);
    if (descriptorKeys.some((key) => typeof key === "symbol")) {
      fail("INPUT_SYMBOL_FORBIDDEN", "D authority precheck 输入不接受 Symbol 属性。");
    }
    if (array) {
      if (prototype !== Array.prototype) fail("INPUT_PROTOTYPE_INVALID", "D authority precheck 数组原型无效。");
      const lengthDescriptor = descriptors.length;
      const length = lengthDescriptor?.value;
      if (lengthDescriptor?.get || lengthDescriptor?.set
        || !Number.isSafeInteger(length) || length < 0 || length > MAX_INPUT_NODES) {
        fail("INPUT_ARRAY_INVALID", "D authority precheck 数组长度无效。");
      }
      const allowedKeys = new Set(["length", ...Array.from({ length }, (_entry, index) => String(index))]);
      if (descriptorKeys.some((key) => !allowedKeys.has(key))) {
        fail("INPUT_ARRAY_INVALID", "D authority precheck 数组含额外属性。");
      }
      const output = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
          fail("INPUT_ARRAY_INVALID", "D authority precheck 不接受稀疏数组或访问器元素。");
        }
        output.push(capturePassiveJsonValue(descriptor.value, state, depth + 1));
      }
      return output;
    }
    if (prototype !== Object.prototype) fail("INPUT_PROTOTYPE_INVALID", "D authority precheck 只接受普通对象。");
    const output = {};
    for (const key of descriptorKeys) {
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
        fail("INPUT_ACCESSOR_FORBIDDEN", "D authority precheck 不接受访问器或不可枚举字段。");
      }
      Object.defineProperty(output, key, {
        value: capturePassiveJsonValue(descriptor.value, state, depth + 1),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return output;
  } finally {
    state.active.delete(value);
  }
}

function capturePassiveJsonSnapshot(value) {
  return capturePassiveJsonValue(value, {
    active: new WeakSet(),
    nodes: 0,
    textCharacters: 0
  }, 0);
}

function canonicalValue(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value) && !Object.is(value, -0)) return value;
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const output = {};
    for (const key of Object.keys(value).sort(compareCodeUnits)) {
      Object.defineProperty(output, key, {
        value: canonicalValue(value[key]),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return output;
  }
  fail("NON_CANONICAL_JSON", "D authority precheck 只接受有限规范 JSON 值。");
}

export function canonicalStringifyBaziExpertAuthorityMaterialPrecheck(value) {
  return JSON.stringify(canonicalValue(capturePassiveJsonSnapshot(value)));
}

export function canonicalPrettyStringifyBaziExpertAuthorityMaterialPrecheck(value) {
  return JSON.stringify(canonicalValue(capturePassiveJsonSnapshot(value)), null, 2) + "\n";
}

function domainDigest(domain, value) {
  return createHash("sha256")
    .update(domain, "utf8")
    .update("\0", "utf8")
    .update(canonicalStringifyBaziExpertAuthorityMaterialPrecheck(value), "utf8")
    .digest("hex");
}

export function computeBaziExpertAuthorityMaterialPrecheckDigest(ledgerInput) {
  const ledger = capturePassiveJsonSnapshot(ledgerInput);
  const { ledgerDigest: _ignored, ...unsigned } = ledger;
  return domainDigest(LEDGER_DIGEST_DOMAIN, unsigned);
}

export function computeBaziExpertAuthorityMaterialCandidateDigest(candidateInput) {
  const candidate = capturePassiveJsonSnapshot(candidateInput);
  if (!candidate.integrity || typeof candidate.integrity !== "object" || Array.isArray(candidate.integrity)) {
    fail("CANDIDATE_INTEGRITY_INVALID", "候选材料 integrity 缺失。");
  }
  const integrity = { ...candidate.integrity };
  delete integrity.recordDigest;
  return domainDigest(CANDIDATE_DIGEST_DOMAIN, { ...candidate, integrity });
}

function deepFreezeJson(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreezeJson(child, seen);
  return Object.freeze(value);
}

function exactJson(left, right) {
  return canonicalStringifyBaziExpertAuthorityMaterialPrecheck(left)
    === canonicalStringifyBaziExpertAuthorityMaterialPrecheck(right);
}

function requireExactKeys(value, expectedKeys, label, code = "UNKNOWN_FIELD_FORBIDDEN") {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    fail(code, `${label} 必须是普通对象。`);
  }
  const actual = Object.keys(value).sort(compareCodeUnits);
  const expected = [...expectedKeys].sort(compareCodeUnits);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(code, `${label} 字段集合不精确。`);
}

function requireExactArray(value, expected, label, code = "BOUNDARY_MISMATCH") {
  if (!Array.isArray(value) || !exactJson(value, expected)) fail(code, `${label} 内容或顺序不匹配。`);
}

function requireFalse(value, label, code = "AUTHORITY_ESCALATION_FORBIDDEN") {
  if (value !== false) fail(code, `${label} 必须保持 false。`);
}

function requireSafeId(value, label) {
  if (typeof value !== "string" || !SAFE_ID_PATTERN.test(value)
    || /(?:mailto|https?|data|file|javascript):/iu.test(value)
    || value.includes("@") || value.includes("?") || value.includes("#")) {
    fail("OPAQUE_ID_INVALID", `${label} 必须是非个人、非 URL 的短 opaque ID。`);
  }
}

function requireSha256(value, label) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) fail("DIGEST_INVALID", `${label} 必须是小写 SHA-256 形状。`);
}

function requireCanonicalUtc(value, label) {
  if (typeof value !== "string" || !CANONICAL_UTC_PATTERN.test(value)) fail("TIMESTAMP_INVALID", `${label} 必须是 canonical UTC。`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.toISOString() !== value) fail("TIMESTAMP_INVALID", `${label} 不是有效 canonical UTC。`);
}

function safeWorkspaceFile(workspaceRoot, relativePath) {
  const segments = typeof relativePath === "string" ? relativePath.split("/") : [];
  if (typeof relativePath !== "string" || relativePath.length < 1 || relativePath.length > 320
    || relativePath.includes("\0") || relativePath.includes("\\") || relativePath.startsWith("/")
    || path.posix.normalize(relativePath) !== relativePath
    || segments.some((segment) => segment === "" || segment === "." || segment === ".." || segment.includes(":"))) {
    fail("UNSAFE_ARTIFACT_PATH", "D authority precheck 工件路径不安全。");
  }
  const root = path.resolve(workspaceRoot);
  const absolute = path.resolve(root, ...segments);
  const relative = path.relative(root, absolute);
  if (relative === "" || relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) {
    fail("UNSAFE_ARTIFACT_PATH", "D authority precheck 工件路径越界。");
  }
  return absolute;
}

function isSameOrWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative));
}

function sameFileEndpoint(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.nlink === right.nlink
    && left.size === right.size && left.mtimeNs === right.mtimeNs && left.ctimeNs === right.ctimeNs;
}

async function capturePlainDirectoryChain(workspaceRoot, absolutePath, code, label) {
  const root = path.resolve(workspaceRoot);
  const targetDirectory = path.dirname(path.resolve(absolutePath));
  if (!isSameOrWithin(root, targetDirectory)) fail(code, `${label}目录链越出工作区。`);
  const relative = path.relative(root, targetDirectory);
  const segments = relative === "" ? [] : relative.split(path.sep);
  const endpoints = [];
  let cursor = root;
  for (const segment of [null, ...segments]) {
    if (segment !== null) cursor = path.join(cursor, segment);
    let metadata;
    let resolvedPath;
    try {
      metadata = await lstat(cursor, { bigint: true });
      resolvedPath = await realpath(cursor);
    } catch (cause) {
      fail(code, `${label}目录链不可读。`, cause);
    }
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
      fail(code, `${label}目录链不能包含符号链接、junction 或特殊端点。`);
    }
    if (endpoints.length > 0 && !isSameOrWithin(endpoints[0].resolvedPath, resolvedPath)) {
      fail(code, `${label}目录链 realpath 越出工作区。`);
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
  let before;
  let actual;
  let directoryChainBefore;
  try {
    directoryChainBefore = await capturePlainDirectoryChain(workspaceRoot, absolute, options.invalidCode, options.label);
    [before, actual] = await Promise.all([lstat(absolute, { bigint: true }), realpath(absolute)]);
  } catch (cause) {
    if (cause instanceof BaziExpertAuthorityMaterialPrecheckError) throw cause;
    fail(options.missingCode, `${options.label}不存在。`, cause);
  }
  const resolvedRoot = directoryChainBefore[0].resolvedPath;
  if (!isSameOrWithin(resolvedRoot, actual) || before.isSymbolicLink() || !before.isFile()
    || before.nlink !== 1n || before.size <= 0n || before.size > BigInt(maxBytes)) {
    fail(options.invalidCode, `${options.label}必须是工作区内独立普通小文件。`);
  }
  const noFollow = typeof fsConstants.O_NOFOLLOW === "number" ? fsConstants.O_NOFOLLOW : 0;
  let handle;
  try {
    handle = await open(actual, fsConstants.O_RDONLY | noFollow);
  } catch (cause) {
    fail(options.invalidCode, `${options.label}无法安全打开。`, cause);
  }
  try {
    const opened = await handle.stat({ bigint: true });
    if (!opened.isFile() || opened.nlink !== 1n || !sameFileEndpoint(before, opened)) {
      fail(options.invalidCode, `${options.label}在打开前发生身份换绑。`);
    }
    const bytes = await readAtMost(handle, maxBytes, options.invalidCode, options.label);
    const [afterHandle, afterPath, actualAfter, directoryChainAfter] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(absolute, { bigint: true }),
      realpath(absolute),
      capturePlainDirectoryChain(workspaceRoot, absolute, options.invalidCode, options.label)
    ]);
    if (afterPath.isSymbolicLink() || !afterPath.isFile() || afterPath.nlink !== 1n
      || BigInt(bytes.byteLength) !== opened.size || !sameFileEndpoint(opened, afterHandle)
      || !sameFileEndpoint(opened, afterPath) || actualAfter !== actual
      || !sameDirectoryChain(directoryChainBefore, directoryChainAfter)) {
      fail(options.invalidCode, `${options.label}在读取端点之间发生变化。`);
    }
    return Object.freeze({
      bytes,
      path: relativePath,
      rawSha256: sha256(bytes),
      rawBytes: bytes.byteLength
    });
  } finally {
    await handle.close();
  }
}

function computePlainSelfDigest(value, digestKey) {
  const snapshot = capturePassiveJsonSnapshot(value);
  const unsigned = { ...snapshot };
  delete unsigned[digestKey];
  return sha256(Buffer.from(canonicalStringifyBaziExpertAuthorityMaterialPrecheck(unsigned), "utf8"));
}

function requireParentRawIdentity(snapshot, expected, label) {
  if (snapshot.path !== expected.path || snapshot.rawBytes !== expected.rawBytes
    || snapshot.rawSha256 !== expected.rawSha256) {
    fail("PARENT_IDENTITY_MISMATCH", `${label}原始字节身份漂移。`);
  }
}

function verifyParentJson(snapshot, expected, label) {
  requireParentRawIdentity(snapshot, expected, label);
  const parsed = parseBaziExpertAuthorityMaterialPrecheckJsonBytes(snapshot.bytes, label, MAX_PARENT_BYTES);
  if (parsed.schemaVersion !== expected.schemaVersion || parsed.recordType !== expected.recordType
    || parsed[expected.idKey] !== expected.id || parsed.status !== expected.status
    || parsed[expected.digestKey] !== expected.digest
    || computePlainSelfDigest(parsed, expected.digestKey) !== expected.digest) {
    fail("PARENT_SEMANTIC_IDENTITY_MISMATCH", `${label}语义身份或自摘要漂移。`);
  }
  return parsed;
}

async function readAndVerifyParents(workspaceRoot) {
  const entries = Object.entries(PARENT_IDENTITIES);
  const snapshots = await Promise.all(entries.map(([_key, expected]) => readStableWorkspaceFile(
    workspaceRoot,
    expected.path,
    MAX_PARENT_BYTES,
    { invalidCode: "PARENT_ENDPOINT_INVALID", label: "D authority precheck 父工件", missingCode: "PARENT_MISSING" }
  )));
  const helperSnapshot = await readStableWorkspaceFile(
    workspaceRoot,
    FORMAL_VERIFIER_HELPER_IDENTITY.path,
    MAX_SOURCE_BYTES,
    { invalidCode: "FORMAL_VERIFIER_ENDPOINT_INVALID", label: "历史 formal expert verifier helper", missingCode: "FORMAL_VERIFIER_MISSING" }
  );
  requireParentRawIdentity(helperSnapshot, FORMAL_VERIFIER_HELPER_IDENTITY, "历史 formal expert verifier helper");

  const parents = {};
  for (let index = 0; index < entries.length; index += 1) {
    const [key, expected] = entries[index];
    parents[key] = {
      parsed: verifyParentJson(snapshots[index], expected, `D authority precheck ${key} 父工件`),
      snapshot: snapshots[index]
    };
  }

  const gap = parents.expertReviewIntakeGap.parsed;
  if (!exactJson(gap.readinessLedgerBinding, INTAKE_GAP_LOCKED_READINESS)
    || !exactJson(gap.approvedPacketBinding, {
      packetDigest: PARENT_IDENTITIES.expertReviewPacket.digest,
      packetId: PARENT_IDENTITIES.expertReviewPacket.id,
      path: PARENT_IDENTITIES.expertReviewPacket.path,
      rawBytes: PARENT_IDENTITIES.expertReviewPacket.rawBytes,
      rawSha256: PARENT_IDENTITIES.expertReviewPacket.rawSha256
    })) {
    fail("FORMAL_PARENT_DRIFT_OBSERVATION_INVALID", "formal intake gap 的历史绑定不再匹配已冻结观察。 ");
  }
  if (gap.readinessLedgerBinding.rawBytes === parents.currentBindingReadiness.snapshot.rawBytes
    || gap.readinessLedgerBinding.rawSha256 === parents.currentBindingReadiness.snapshot.rawSha256
    || gap.readinessLedgerBinding.ledgerId === parents.currentBindingReadiness.parsed.ledgerId
    || gap.readinessLedgerBinding.ledgerDigest === parents.currentBindingReadiness.parsed.ledgerDigest) {
    fail("FORMAL_PARENT_DRIFT_OBSERVATION_INVALID", "formal intake gap 不再体现 1.5 到当前 1.6 的完整身份漂移。 ");
  }

  return Object.freeze({ helperSnapshot, parents });
}

function parentBinding(expected) {
  return Object.freeze({
    ledgerOrArtifactDigest: expected.digest,
    ledgerOrArtifactId: expected.id,
    path: expected.path,
    rawBytes: expected.rawBytes,
    rawSha256: expected.rawSha256,
    recordType: expected.recordType,
    schemaVersion: expected.schemaVersion,
    status: expected.status
  });
}

function buildUnsignedLedger() {
  return {
    artifactRole: "one_way_zero_instance_requirements_and_structural_precheck_child_only",
    authorityBoundary: {
      authenticityEstablished: false,
      contentTruthEstablished: false,
      domainAuthorityAuthorized: false,
      expertClaimsAuthorized: false,
      expertStatusVerified: false,
      expertTruthEstablished: false,
      formalAdmissionAuthorized: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      releaseReady: false,
      rightsLegalConclusionEstablished: false
    },
    authorityMaterialContract: {
      bundleRecordType: "bazi_expert_authority_material_bundle_v1",
      componentRecordTypes: COMPONENT_RECORD_TYPES,
      credentialMaterialRequirements: [
        "separate_primary_issuer_record_and_independent_current_status_corroboration",
        "issuer_identity_effective_period_current_status_and_revocation_check_fields_required",
        "credential_material_cannot_reuse_identity_scope_or_verifier_authority_evidence",
        "self_asserted_bio_public_role_label_course_page_or_generated_profile_cannot_qualify"
      ],
      evidenceReferenceContract: {
        allowedVisibilityValues: ["private_opaque", "public_link_only"],
        digestIsDigitalSignature: false,
        identityCredentialScopeAndAuthorityEvidenceMustNotReuseRecordDigestOrProvenanceGroup: true,
        independentCorroborationMustDifferByRecordDigestAndAllProvenanceGroups: true,
        publicRepositoryRawBodiesCredentialsDossiersOpinionsAndPiiAllowed: false,
        sameUpstreamRepackagingMayCountAsIndependentCorroboration: false
      },
      independenceMaterialRequirements: {
        assessorAuthorityBindingRequired: true,
        distinctRealNaturalPersonsRequiredButNotEstablishedHere: true,
        factorIds: BAZI_EXPERT_AUTHORITY_PRECHECK_INDEPENDENCE_FACTOR_IDS,
        factorMaterialPairRequired: true,
        reviewerDeclarationsAndExternalEvidenceRequired: true,
        sameUpstreamAgreementClassification: "agree_same_upstream_not_independent_corroboration",
        sharedDependenciesMustBeDisclosed: true,
        zeroInstanceV1AllowedOverallDisposition: "not_established"
      },
      privacyContract: {
        allowedRepositoryMaterial: "opaque_refs_digests_enums_and_zero_instance_counts_only",
        forbiddenRepositoryMaterial: [
          "legal_or_display_name",
          "email_phone_address_government_id_or_contact_handle",
          "raw_credential_or_private_dossier",
          "page_body_exact_quote_abstract_screenshot_or_original_opinion",
          "url_credentials_sensitive_query_fragment_login_or_auth_path",
          "operator_or_generated_biography_or_profile"
        ],
        persistedRealPersonInstancesAllowed: false
      },
      reviewerSeatIds: BAZI_EXPERT_AUTHORITY_PRECHECK_REVIEWER_SEAT_IDS,
      reviewQuestionIds: BAZI_EXPERT_AUTHORITY_PRECHECK_REVIEW_QUESTION_IDS,
      scopeMaterialRequirements: [
        "all_four_fixed_question_ids_require_separate_evidence_mapping",
        "general_bazi_topic_course_association_or_publication_label_cannot_substitute",
        "unrelated_system_expertise_cannot_substitute",
        "scope_material_cannot_reuse_identity_credential_or_verifier_authority_evidence"
      ],
      structuralPrecheckResultMayEstablishAuthority: false,
      verifierAuthorityRequirements: [
        "verifier_must_be_outside_both_reviewer_seats",
        "reviewer_self_verification_forbidden",
        "reviewer_seats_may_not_verify_each_other",
        "verifier_authority_material_ref_must_be_non_null_and_resolve",
        "grant_issuer_must_differ_from_verifier_reviewers_and_project_roles",
        "authority_scope_must_bind_system_surface_review_purpose_and_four_question_ids",
        "self_digest_is_not_signature_authenticity_identity_or_authority"
      ],
      version: "1.0.0"
    },
    bindingDirection: "child_to_existing_parents_only_no_parent_backlink",
    createdAt: CREATED_AT,
    doesNotEstablish: DOES_NOT_ESTABLISH,
    formalParentDrift: {
      childMayRepairRefreshOrResignParent: false,
      currentReadinessIdentity: {
        ledgerDigest: PARENT_IDENTITIES.currentBindingReadiness.digest,
        ledgerId: PARENT_IDENTITIES.currentBindingReadiness.id,
        rawBytes: PARENT_IDENTITIES.currentBindingReadiness.rawBytes,
        rawSha256: PARENT_IDENTITIES.currentBindingReadiness.rawSha256
      },
      firstFailureCodeDerivation: "deterministic_reproduction_of_exact_raw_binding_precondition_not_runtime_attestation",
      firstFailureCode: "INTAKE_GAP_BINDING_DRIFT",
      formalVerifierExecutedByThisChild: false,
      formalPacketVerifierPasses: false,
      intakeGapLockedReadinessIdentity: INTAKE_GAP_LOCKED_READINESS,
      intakeGapMatchesCurrentReadiness: false,
      parentBacklinkAdded: false,
      parentMutated: false
    },
    gateBoundary: {
      bindingFrozenRequired: 12,
      bindingFrozenVerified: 0,
      contentTruthEstablished: false,
      countsTowardExpertGate: false,
      expertGateEligible: false,
      expertReviewBundleComplete: false,
      expertTruthEstablished: false,
      releaseReady: false,
      sourceBindingClosureComplete: false,
      sourceRightsClosureComplete: false
    },
    integrationBoundary: {
      centralManifestModified: false,
      centralRegistryModified: false,
      crossSystemReceiptModified: false,
      expertPacketOrIntakeGapModified: false,
      parentBacklinkAdded: false,
      productOrBrowserRuntimeIntegration: "absent"
    },
    ledgerId: LEDGER_ID,
    observationBoundary: {
      abaExcluded: false,
      crossFileAtomicSnapshot: false,
      heldFileHandleReads: true,
      historicalExecutionAttested: false,
      intervalMutationExcluded: false,
      loaderIdentityEstablished: false,
      loadedModuleByteIdentityVerified: false,
      mutationEpochAvailable: false,
      nodeRuntimeIdentityEstablished: false,
      parentHashAndInspectionUseSameReadBuffer: true,
      pathEndpointRevalidated: true,
      plainDirectoryChainRequired: true,
      sameSessionReplayExcluded: false,
      runtimeLauncherIdentityEstablished: false,
      workspaceCustodyEstablished: false
    },
    parentBindings: {
      currentBindingReadiness: parentBinding(PARENT_IDENTITIES.currentBindingReadiness),
      expertReviewIntakeGap: parentBinding(PARENT_IDENTITIES.expertReviewIntakeGap),
      expertReviewPacket: parentBinding(PARENT_IDENTITIES.expertReviewPacket),
      formalVerifierHelper: FORMAL_VERIFIER_HELPER_IDENTITY,
      publicCandidatePrescreen: parentBinding(PARENT_IDENTITIES.publicCandidatePrescreen),
      publicEvidenceFollowup: parentBinding(PARENT_IDENTITIES.publicEvidenceFollowup)
    },
    persistedInstances: {
      authorityMaterialBundles: [],
      credentialVerificationEvents: [],
      pairwiseIndependenceMaterials: [],
      reviewerCredentialMaterials: [],
      reviewerIdentityMaterials: [],
      reviewerQuestionScopeMaterials: [],
      verifierAuthorityGrantMaterials: [],
      verifierIdentityMaterials: []
    },
    recordType: RECORD_TYPE,
    releaseGovernance: {
      activeLine: "legacy-v13",
      expertClaimsAuthorized: false,
      migrationId: null,
      mutationEpochBoundary: "preserved_not_proven_by_this_child",
      publicDeploymentAuthorized: false,
      targetSchema: 13
    },
    schemaVersion: "1.0.0",
    status: STATUS,
    zeroInstanceReceipt: {
      authenticityEstablished: false,
      credentialVerificationEvents: 0,
      credentialsVerified: 0,
      expertReviewBundles: 0,
      expertTruthEstablished: false,
      identitiesVerified: 0,
      identityVerified: false,
      pairwiseIndependenceEstablished: false,
      pairwiseIndependenceMaterials: 0,
      participationOrConsentVerified: false,
      realIdentityEstablished: false,
      realReviewerInstances: 0,
      reviewerSlotsDefined: 2,
      reviewerSlotsOccupied: 0,
      scopeFitsVerified: 0,
      scopeVerified: false,
      verifierAuthorityEstablished: false,
      verifierAuthorityGrantInstances: 0,
      verifierIdentityEstablished: false,
      verifierIdentityInstances: 0
    }
  };
}

export async function buildCurrentBaziExpertAuthorityMaterialPrecheck(workspaceRoot = process.cwd()) {
  await readAndVerifyParents(workspaceRoot);
  const unsigned = buildUnsignedLedger();
  return deepFreezeJson({
    ...unsigned,
    ledgerDigest: domainDigest(LEDGER_DIGEST_DOMAIN, unsigned)
  });
}

async function readPersistedLedgerSnapshot(workspaceRoot) {
  const snapshot = await readStableWorkspaceFile(
    workspaceRoot,
    BAZI_EXPERT_AUTHORITY_MATERIAL_PRECHECK_RELATIVE_PATH,
    MAX_LEDGER_BYTES,
    { invalidCode: "LEDGER_ENDPOINT_INVALID", label: "八字专家 authority 材料预检 child", missingCode: "LEDGER_MISSING" }
  );
  requireParentRawIdentity(snapshot, EXPECTED_LEDGER_RAW_IDENTITY, "八字专家 authority 材料预检 child");
  const ledger = parseBaziExpertAuthorityMaterialPrecheckJsonBytes(snapshot.bytes);
  const materialized = new TextDecoder("utf-8", { fatal: true }).decode(snapshot.bytes);
  if (materialized !== canonicalPrettyStringifyBaziExpertAuthorityMaterialPrecheck(ledger)) {
    fail("LEDGER_MATERIALIZATION_MISMATCH", "D authority precheck child 不是唯一 LF canonical pretty materialization。");
  }
  return Object.freeze({ ledger, snapshot });
}

export async function readBaziExpertAuthorityMaterialPrecheck(workspaceRoot = process.cwd()) {
  const { ledger } = await readPersistedLedgerSnapshot(workspaceRoot);
  return deepFreezeJson(capturePassiveJsonSnapshot(ledger));
}

export async function verifyBaziExpertAuthorityMaterialPrecheck(workspaceRoot, ledgerInput) {
  const callerLedger = capturePassiveJsonSnapshot(ledgerInput);
  const persisted = await readPersistedLedgerSnapshot(workspaceRoot);
  if (!exactJson(callerLedger, persisted.ledger)) {
    fail("CALLER_PERSISTED_LEDGER_MISMATCH", "调用方 D authority precheck child 与持久化原始字节不一致。");
  }
  if (callerLedger.ledgerDigest !== computeBaziExpertAuthorityMaterialPrecheckDigest(callerLedger)) {
    fail("LEDGER_DIGEST_MISMATCH", "D authority precheck child 自摘要不匹配。");
  }
  const expected = await buildCurrentBaziExpertAuthorityMaterialPrecheck(workspaceRoot);
  if (!exactJson(callerLedger, expected)) {
    fail("LEDGER_BOUNDARY_MISMATCH", "D authority precheck child 静态边界或父账绑定漂移。");
  }
  const result = deepFreezeJson({
    authorityMaterialContractStructurallyPrechecked: true,
    countsTowardExpertGate: false,
    expertClaimsAuthorized: false,
    expertTruthEstablished: false,
    firstFormalParentFailureCode: "INTAKE_GAP_BINDING_DRIFT",
    ledgerDigest: callerLedger.ledgerDigest,
    ledgerId: callerLedger.ledgerId,
    publicDeploymentAuthorized: false,
    realReviewerInstances: 0,
    releaseReady: false,
    status: "zero_instance_authority_precheck_contract_mechanically_verified",
    verifierAuthorityGrantInstances: 0
  });
  verifiedLedgerResults.add(result);
  return result;
}

export async function loadBaziExpertAuthorityMaterialPrecheck(workspaceRoot = process.cwd()) {
  const ledger = await readBaziExpertAuthorityMaterialPrecheck(workspaceRoot);
  return verifyBaziExpertAuthorityMaterialPrecheck(workspaceRoot, ledger);
}

export function isVerifiedBaziExpertAuthorityMaterialPrecheck(value) {
  return value !== null && typeof value === "object" && verifiedLedgerResults.has(value);
}

function createEvidenceRegistry() {
  return {
    evidenceRefs: new Set(),
    materialIds: new Set(),
    opaqueRefs: new Set(),
    provenanceGroups: new Set(),
    rawDigests: new Set()
  };
}

function registerUnique(registry, setName, value, code, message) {
  const set = registry[setName];
  if (set.has(value)) fail(code, message);
  set.add(value);
}

function validateEvidenceRef(ref, expectedCategory, registry, label) {
  requireExactKeys(ref, [
    "evidenceCategory", "evidenceRefId", "privateOpaqueContextRef", "provenance",
    "publicObservationRef", "rawSha256", "visibility"
  ], label, "EVIDENCE_SHAPE_INVALID");
  requireSafeId(ref.evidenceRefId, `${label}.evidenceRefId`);
  if (ref.evidenceCategory !== expectedCategory) fail("EVIDENCE_CATEGORY_INVALID", `${label} evidence category 不匹配。`);
  if (ref.visibility !== "private_opaque" && ref.visibility !== "public_link_only") {
    fail("EVIDENCE_VISIBILITY_INVALID", `${label} visibility 不匹配。`);
  }
  const publicRefPresent = typeof ref.publicObservationRef === "string";
  const privateRefPresent = typeof ref.privateOpaqueContextRef === "string";
  if ((ref.visibility === "public_link_only"
      && (!publicRefPresent || ref.privateOpaqueContextRef !== null))
    || (ref.visibility === "private_opaque"
      && (!privateRefPresent || ref.publicObservationRef !== null))) {
    fail("EVIDENCE_VISIBILITY_INVALID", `${label} public/private opaque ref 必须精确二选一。`);
  }
  const opaqueRef = publicRefPresent ? ref.publicObservationRef : ref.privateOpaqueContextRef;
  requireSafeId(opaqueRef, `${label}.opaqueRef`);
  requireSha256(ref.rawSha256, `${label}.rawSha256`);
  requireExactKeys(ref.provenance, [
    "contentLineageGroupId", "controlGroupId", "derivationGroupId"
  ], `${label}.provenance`, "EVIDENCE_PROVENANCE_INVALID");
  const groups = [
    ref.provenance.controlGroupId,
    ref.provenance.contentLineageGroupId,
    ref.provenance.derivationGroupId
  ];
  for (const group of groups) requireSafeId(group, `${label}.provenanceGroupId`);
  if (new Set(groups).size !== groups.length) {
    fail("EVIDENCE_PROVENANCE_NOT_INDEPENDENT", `${label} provenance group 在单条证据内重叠。`);
  }
  registerUnique(registry, "evidenceRefs", ref.evidenceRefId, "EVIDENCE_RECORD_REUSED", "同一 evidence record 不得双计。 ");
  registerUnique(registry, "opaqueRefs", opaqueRef, "EVIDENCE_RECORD_REUSED", "同一 opaque evidence ref 不得双计。 ");
  registerUnique(registry, "rawDigests", ref.rawSha256, "EVIDENCE_DIGEST_REUSED", "同一 evidence digest 不得双计。 ");
  for (const group of groups) {
    registerUnique(registry, "provenanceGroups", group, "EVIDENCE_PROVENANCE_REUSED", "同一 provenance group 不得双计为独立材料。 ");
  }
}

function validateEvidencePair(primary, corroborating, categories, registry, label) {
  validateEvidenceRef(primary, categories[0], registry, `${label}.primaryEvidence`);
  validateEvidenceRef(corroborating, categories[1], registry, `${label}.corroboratingEvidence`);
}

function validateAuthorityMaterial(material, reviewerIds, registry, createdAt) {
  requireExactKeys(material, [
    "authenticityEstablished", "authorityScope", "corroboratingEvidence", "custodyEstablished",
    "digestIsDigitalSignature", "firstSeenEstablished", "grantIssuerBindingId", "issuerIdentityEstablished",
    "materialId", "observedEffectiveFrom", "observedExpiresAt", "observedGrantStatus",
    "observedRevocationCheckedAt", "primaryEvidence", "verifierAuthorityEstablished",
    "verifierBindingId", "verifierIdentityEstablished"
  ], "verifierAuthorityMaterial", "AUTHORITY_MATERIAL_SHAPE_INVALID");
  requireSafeId(material.materialId, "verifierAuthorityMaterial.materialId");
  requireSafeId(material.verifierBindingId, "verifierAuthorityMaterial.verifierBindingId");
  requireSafeId(material.grantIssuerBindingId, "verifierAuthorityMaterial.grantIssuerBindingId");
  if (reviewerIds.includes(material.verifierBindingId)) fail("REVIEWER_VERIFIER_SEPARATION_REQUIRED", "reviewer 不得自核验或互核验。 ");
  if (material.grantIssuerBindingId === material.verifierBindingId
    || reviewerIds.includes(material.grantIssuerBindingId)
    || FORBIDDEN_AUTHORITY_ISSUER_IDS.includes(material.grantIssuerBindingId)) {
    fail("AUTHORITY_GRANT_ISSUER_INVALID", "authority grant issuer 缺少角色分离。 ");
  }
  requireExactKeys(material.authorityScope, [
    "reviewPurpose", "reviewQuestionIds", "reviewerSeatIds", "surface", "systemId"
  ], "verifierAuthorityMaterial.authorityScope", "AUTHORITY_SCOPE_INVALID");
  if (material.authorityScope.systemId !== "bazi-strength-v1.7"
    || material.authorityScope.reviewPurpose !== "expert_identity_credential_scope_and_independence_material_precheck"
    || !["pairwise_independence_assessment", "reviewer_identity_credential_scope_verification"].includes(material.authorityScope.surface)) {
    fail("AUTHORITY_SCOPE_INVALID", "verifier authority scope 越界或不匹配。 ");
  }
  requireExactArray(material.authorityScope.reviewQuestionIds, BAZI_EXPERT_AUTHORITY_PRECHECK_REVIEW_QUESTION_IDS, "verifier authority question scope", "AUTHORITY_SCOPE_INVALID");
  requireExactArray(material.authorityScope.reviewerSeatIds, BAZI_EXPERT_AUTHORITY_PRECHECK_REVIEWER_SEAT_IDS, "verifier authority seat scope", "AUTHORITY_SCOPE_INVALID");
  for (const [key, value] of [
    ["observedEffectiveFrom", material.observedEffectiveFrom],
    ["observedExpiresAt", material.observedExpiresAt],
    ["observedRevocationCheckedAt", material.observedRevocationCheckedAt]
  ]) requireCanonicalUtc(value, `verifierAuthorityMaterial.${key}`);
  if (new Date(material.observedEffectiveFrom) >= new Date(material.observedExpiresAt)
    || new Date(material.observedExpiresAt) <= new Date(createdAt)
    || new Date(material.observedRevocationCheckedAt) > new Date(createdAt)) {
    fail("AUTHORITY_GRANT_TEMPORAL_INVALID", "verifier authority observed temporal material 无效或已过期。 ");
  }
  if (material.observedGrantStatus !== "candidate_unverified") {
    fail("AUTHORITY_STATE_ESCALATION_FORBIDDEN", "verifier authority 状态只能是 candidate_unverified。 ");
  }
  for (const key of [
    "authenticityEstablished", "custodyEstablished", "digestIsDigitalSignature", "firstSeenEstablished",
    "issuerIdentityEstablished", "verifierAuthorityEstablished", "verifierIdentityEstablished"
  ]) requireFalse(material[key], `verifierAuthorityMaterial.${key}`);
  validateEvidencePair(
    material.primaryEvidence,
    material.corroboratingEvidence,
    EVIDENCE_CATEGORIES.verifierAuthority,
    registry,
    "verifierAuthorityMaterial"
  );
}

function validatePrivateDossierOpaqueContext(context, registry, label) {
  requireExactKeys(context, [
    "byteLength", "contextId", "contextRuntimeVerified", "custodianRef", "firstSeenRef",
    "redactedPublicBindingRef", "retrievalRef", "sha256"
  ], label, "PRIVATE_CONTEXT_SHAPE_INVALID");
  requireSafeId(context.contextId, `${label}.contextId`);
  requireSafeId(context.custodianRef, `${label}.custodianRef`);
  requireSafeId(context.firstSeenRef, `${label}.firstSeenRef`);
  requireSafeId(context.redactedPublicBindingRef, `${label}.redactedPublicBindingRef`);
  requireSafeId(context.retrievalRef, `${label}.retrievalRef`);
  requireSha256(context.sha256, `${label}.sha256`);
  if (!Number.isSafeInteger(context.byteLength) || context.byteLength <= 0 || context.byteLength > 5_000_000) {
    fail("PRIVATE_CONTEXT_SHAPE_INVALID", `${label}.byteLength 无效。`);
  }
  requireFalse(context.contextRuntimeVerified, `${label}.contextRuntimeVerified`);
  registerUnique(registry, "opaqueRefs", context.contextId, "PRIVATE_CONTEXT_REUSED", "private dossier opaque context 不得跨 reviewer 或层复用。 ");
  registerUnique(registry, "rawDigests", context.sha256, "PRIVATE_CONTEXT_REUSED", "private dossier digest 不得跨 reviewer 或层复用。 ");
}

function validateReviewerMaterial(material, reviewerIds, authorityById, registry, createdAt) {
  requireExactKeys(material, [
    "credentialMaterial", "identityMaterial", "questionScopeMaterial", "reviewerBindingId", "seatId",
    "verifierAuthorityMaterialRef", "verifierBindingId"
  ], "reviewerMaterial", "REVIEWER_MATERIAL_SHAPE_INVALID");
  requireSafeId(material.reviewerBindingId, "reviewerMaterial.reviewerBindingId");
  if (/^(?:bazi-)?public-lead-/u.test(material.reviewerBindingId)) {
    fail("PUBLIC_LEAD_PROMOTION_FORBIDDEN", "公开线索 ID 不得直接晋级 reviewer identity。 ");
  }
  if (material.seatId !== BAZI_EXPERT_AUTHORITY_PRECHECK_REVIEWER_SEAT_IDS[reviewerIds.indexOf(material.reviewerBindingId)]) {
    fail("REVIEWER_SEAT_BINDING_INVALID", "reviewer seat 与固定顺序不匹配。 ");
  }
  requireSafeId(material.verifierBindingId, "reviewerMaterial.verifierBindingId");
  requireSafeId(material.verifierAuthorityMaterialRef, "reviewerMaterial.verifierAuthorityMaterialRef");
  if (reviewerIds.includes(material.verifierBindingId)) fail("REVIEWER_VERIFIER_SEPARATION_REQUIRED", "reviewer 不得自核验或互核验。 ");
  const authority = authorityById.get(material.verifierAuthorityMaterialRef);
  if (!authority || authority.verifierBindingId !== material.verifierBindingId
    || authority.authorityScope.surface !== "reviewer_identity_credential_scope_verification") {
    fail("VERIFIER_AUTHORITY_BINDING_REQUIRED", "reviewer material 的 verifier authority ref 必须非空、解析且 scope 匹配。 ");
  }

  const identity = material.identityMaterial;
  requireExactKeys(identity, [
    "authenticityEstablished", "corroboratingEvidence", "custodyEstablished", "firstSeenEstablished",
    "identityEstablished", "identityState", "materialId", "primaryEvidence",
    "privateDossierOpaqueContextRef", "reviewerBindingId"
  ], "reviewerIdentityMaterial", "IDENTITY_MATERIAL_SHAPE_INVALID");
  requireSafeId(identity.materialId, "reviewerIdentityMaterial.materialId");
  registerUnique(registry, "materialIds", identity.materialId, "MATERIAL_ID_REUSED", "material ID 不得跨组件复用。 ");
  if (identity.reviewerBindingId !== material.reviewerBindingId || identity.identityState !== "candidate_unverified") {
    fail("IDENTITY_MATERIAL_BINDING_INVALID", "identity material reviewer 或状态不匹配。 ");
  }
  for (const key of ["authenticityEstablished", "custodyEstablished", "firstSeenEstablished", "identityEstablished"]) {
    requireFalse(identity[key], `reviewerIdentityMaterial.${key}`);
  }
  validatePrivateDossierOpaqueContext(identity.privateDossierOpaqueContextRef, registry, "reviewerIdentityMaterial.privateDossierOpaqueContextRef");
  validateEvidencePair(identity.primaryEvidence, identity.corroboratingEvidence, EVIDENCE_CATEGORIES.reviewerIdentity, registry, "reviewerIdentityMaterial");

  const credential = material.credentialMaterial;
  requireExactKeys(credential, [
    "authenticityEstablished", "corroboratingEvidence", "credentialState", "credentialVerified",
    "issuerBindingId", "issuerIdentityEstablished", "materialId", "observedEffectiveFrom",
    "observedExpiresAt", "observedRevocationCheckedAt", "primaryEvidence", "reviewerBindingId"
  ], "reviewerCredentialMaterial", "CREDENTIAL_MATERIAL_SHAPE_INVALID");
  requireSafeId(credential.materialId, "reviewerCredentialMaterial.materialId");
  registerUnique(registry, "materialIds", credential.materialId, "MATERIAL_ID_REUSED", "material ID 不得跨组件复用。 ");
  requireSafeId(credential.issuerBindingId, "reviewerCredentialMaterial.issuerBindingId");
  if (credential.reviewerBindingId !== material.reviewerBindingId
    || credential.issuerBindingId === material.reviewerBindingId
    || credential.credentialState !== "candidate_unverified") {
    fail("CREDENTIAL_MATERIAL_BINDING_INVALID", "credential material reviewer、issuer 或状态不匹配。 ");
  }
  for (const key of ["observedEffectiveFrom", "observedExpiresAt", "observedRevocationCheckedAt"]) {
    requireCanonicalUtc(credential[key], `reviewerCredentialMaterial.${key}`);
  }
  if (new Date(credential.observedEffectiveFrom) >= new Date(credential.observedExpiresAt)
    || new Date(credential.observedExpiresAt) <= new Date(createdAt)
    || new Date(credential.observedRevocationCheckedAt) > new Date(createdAt)) {
    fail("CREDENTIAL_TEMPORAL_INVALID", "credential observed temporal material 无效或已过期。 ");
  }
  for (const key of ["authenticityEstablished", "credentialVerified", "issuerIdentityEstablished"]) {
    requireFalse(credential[key], `reviewerCredentialMaterial.${key}`);
  }
  validateEvidencePair(credential.primaryEvidence, credential.corroboratingEvidence, EVIDENCE_CATEGORIES.reviewerCredential, registry, "reviewerCredentialMaterial");

  const scope = material.questionScopeMaterial;
  requireExactKeys(scope, [
    "coverage", "generalTopicMaySubstitute", "materialId", "reviewerBindingId", "scopeVerified",
    "unrelatedSystemExpertiseMaySubstitute"
  ], "reviewerQuestionScopeMaterial", "SCOPE_MATERIAL_SHAPE_INVALID");
  requireSafeId(scope.materialId, "reviewerQuestionScopeMaterial.materialId");
  registerUnique(registry, "materialIds", scope.materialId, "MATERIAL_ID_REUSED", "material ID 不得跨组件复用。 ");
  if (scope.reviewerBindingId !== material.reviewerBindingId) fail("SCOPE_MATERIAL_BINDING_INVALID", "scope material reviewer 不匹配。 ");
  requireFalse(scope.generalTopicMaySubstitute, "reviewerQuestionScopeMaterial.generalTopicMaySubstitute");
  requireFalse(scope.scopeVerified, "reviewerQuestionScopeMaterial.scopeVerified");
  requireFalse(scope.unrelatedSystemExpertiseMaySubstitute, "reviewerQuestionScopeMaterial.unrelatedSystemExpertiseMaySubstitute");
  if (!Array.isArray(scope.coverage) || scope.coverage.length !== BAZI_EXPERT_AUTHORITY_PRECHECK_REVIEW_QUESTION_IDS.length) {
    fail("QUESTION_SCOPE_COVERAGE_INCOMPLETE", "四个固定 review question 必须逐一映射。 ");
  }
  scope.coverage.forEach((coverage, index) => {
    requireExactKeys(coverage, ["corroboratingEvidence", "coverageState", "primaryEvidence", "questionId"], "questionScopeCoverage", "SCOPE_MATERIAL_SHAPE_INVALID");
    if (coverage.questionId !== BAZI_EXPERT_AUTHORITY_PRECHECK_REVIEW_QUESTION_IDS[index]
      || coverage.coverageState !== "candidate_unverified") {
      fail("QUESTION_SCOPE_COVERAGE_INCOMPLETE", "四个固定 review question 的顺序、状态或内容不完整。 ");
    }
    validateEvidencePair(coverage.primaryEvidence, coverage.corroboratingEvidence, EVIDENCE_CATEGORIES.reviewerQuestionScope, registry, `questionScopeCoverage.${index}`);
  });
}

function validatePairwiseMaterial(material, reviewerMaterials, authorityById, registry) {
  requireExactKeys(material, [
    "assessedBy", "countsTowardExpertGate", "factors", "materialId", "overallDisposition",
    "pairwiseIndependenceEstablished", "reviewerPair", "sameUpstreamAgreementClassification",
    "sharedDependencyDisclosures"
  ], "pairwiseIndependenceMaterial", "PAIRWISE_MATERIAL_SHAPE_INVALID");
  requireSafeId(material.materialId, "pairwiseIndependenceMaterial.materialId");
  registerUnique(registry, "materialIds", material.materialId, "MATERIAL_ID_REUSED", "material ID 不得跨组件复用。 ");
  requireExactKeys(material.assessedBy, ["assessorAuthorityMaterialRef", "assessorBindingId"], "pairwiseIndependenceMaterial.assessedBy", "PAIRWISE_ASSESSOR_INVALID");
  requireSafeId(material.assessedBy.assessorBindingId, "pairwiseIndependenceMaterial.assessedBy.assessorBindingId");
  requireSafeId(material.assessedBy.assessorAuthorityMaterialRef, "pairwiseIndependenceMaterial.assessedBy.assessorAuthorityMaterialRef");
  const reviewerIds = reviewerMaterials.map((entry) => entry.reviewerBindingId);
  if (reviewerIds.includes(material.assessedBy.assessorBindingId)) fail("PAIRWISE_ASSESSOR_INVALID", "reviewer 不得同时担任 independence assessor。 ");
  const assessorAuthority = authorityById.get(material.assessedBy.assessorAuthorityMaterialRef);
  if (!assessorAuthority || assessorAuthority.verifierBindingId !== material.assessedBy.assessorBindingId
    || assessorAuthority.authorityScope.surface !== "pairwise_independence_assessment") {
    fail("PAIRWISE_ASSESSOR_AUTHORITY_REQUIRED", "independence assessor authority ref 必须解析且 scope 匹配。 ");
  }
  if (!Array.isArray(material.reviewerPair) || material.reviewerPair.length !== 2) {
    fail("PAIRWISE_REVIEWER_BINDING_INVALID", "pairwise reviewer pair 必须精确两席。 ");
  }
  material.reviewerPair.forEach((entry, index) => {
    requireExactKeys(entry, ["credentialMaterialRef", "identityMaterialRef", "questionScopeMaterialRef", "reviewerBindingId", "seatId"], "pairwise reviewer", "PAIRWISE_REVIEWER_BINDING_INVALID");
    const expected = reviewerMaterials[index];
    if (!expected || entry.seatId !== expected.seatId || entry.reviewerBindingId !== expected.reviewerBindingId
      || entry.identityMaterialRef !== expected.identityMaterial.materialId
      || entry.credentialMaterialRef !== expected.credentialMaterial.materialId
      || entry.questionScopeMaterialRef !== expected.questionScopeMaterial.materialId) {
      fail("PAIRWISE_REVIEWER_BINDING_INVALID", "pairwise reviewer component refs 不匹配。 ");
    }
  });
  if (!Array.isArray(material.factors) || material.factors.length !== BAZI_EXPERT_AUTHORITY_PRECHECK_INDEPENDENCE_FACTOR_IDS.length) {
    fail("INDEPENDENCE_FACTOR_COVERAGE_INCOMPLETE", "十个 independence factor 必须逐一覆盖。 ");
  }
  material.factors.forEach((factor, index) => {
    requireExactKeys(factor, [
      "assessorDisposition", "corroboratingEvidence", "factorId", "primaryEvidence",
      "reviewerADeclaration", "reviewerBDeclaration"
    ], "pairwise factor", "PAIRWISE_FACTOR_SHAPE_INVALID");
    if (factor.factorId !== BAZI_EXPERT_AUTHORITY_PRECHECK_INDEPENDENCE_FACTOR_IDS[index]
      || factor.reviewerADeclaration !== "not_established"
      || factor.reviewerBDeclaration !== "not_established"
      || factor.assessorDisposition !== "not_established") {
      fail("INDEPENDENCE_FACTOR_COVERAGE_INCOMPLETE", "independence factor 顺序或零实例 disposition 不匹配。 ");
    }
    validateEvidencePair(factor.primaryEvidence, factor.corroboratingEvidence, EVIDENCE_CATEGORIES.pairwiseFactor, registry, `pairwiseFactor.${index}`);
  });
  if (!Array.isArray(material.sharedDependencyDisclosures) || material.sharedDependencyDisclosures.length !== 0) {
    fail("SHARED_DEPENDENCY_NOT_ADMITTED", "零实例 v1 不接纳 shared dependency 实例或独立性晋级。 ");
  }
  if (material.sameUpstreamAgreementClassification !== "agree_same_upstream_not_independent_corroboration"
    || material.overallDisposition !== "not_established") {
    fail("PAIRWISE_INDEPENDENCE_ESCALATION_FORBIDDEN", "same-upstream 或 overall disposition 不得晋级 independent。 ");
  }
  requireFalse(material.pairwiseIndependenceEstablished, "pairwiseIndependenceMaterial.pairwiseIndependenceEstablished");
  requireFalse(material.countsTowardExpertGate, "pairwiseIndependenceMaterial.countsTowardExpertGate");
}

function validateCandidateSystemBinding(binding) {
  requireExactKeys(binding, [
    "currentReadinessLedgerDigest", "currentReadinessLedgerId", "expertPacketDigest", "expertPacketId",
    "reviewPurpose", "reviewQuestionIds", "systemId"
  ], "candidate.systemBinding", "CANDIDATE_SYSTEM_BINDING_INVALID");
  if (binding.systemId !== "bazi-strength-v1.7"
    || binding.reviewPurpose !== "expert_identity_credential_scope_and_independence_material_precheck"
    || binding.expertPacketId !== PARENT_IDENTITIES.expertReviewPacket.id
    || binding.expertPacketDigest !== PARENT_IDENTITIES.expertReviewPacket.digest
    || binding.currentReadinessLedgerId !== PARENT_IDENTITIES.currentBindingReadiness.id
    || binding.currentReadinessLedgerDigest !== PARENT_IDENTITIES.currentBindingReadiness.digest) {
    fail("CANDIDATE_SYSTEM_BINDING_INVALID", "candidate 不能跨 packet、readiness、system 或 purpose 重放。 ");
  }
  requireExactArray(binding.reviewQuestionIds, BAZI_EXPERT_AUTHORITY_PRECHECK_REVIEW_QUESTION_IDS, "candidate.reviewQuestionIds", "CANDIDATE_SYSTEM_BINDING_INVALID");
}

function validateCandidateDecision(decision) {
  requireExactKeys(decision, [
    "authenticityEstablished", "contentTruthEstablished", "countsTowardExpertGate", "credentialVerified",
    "expertGateEligible", "expertStatusVerified", "expertTruthEstablished", "identityVerified",
    "pairwiseIndependenceEstablished", "publicDeploymentAuthorized", "reasonCodes", "releaseReady",
    "requestedDisposition", "rightsLegalConclusionEstablished", "scopeVerified", "verifierAuthorityEstablished"
  ], "candidate.decision", "CANDIDATE_DECISION_INVALID");
  if (decision.requestedDisposition !== "structural_precheck_only") {
    fail("CANDIDATE_DECISION_INVALID", "candidate 只能请求 structural_precheck_only。 ");
  }
  requireExactArray(decision.reasonCodes, FIXED_DECISION_REASON_CODES, "candidate.decision.reasonCodes", "CANDIDATE_DECISION_INVALID");
  for (const key of [
    "authenticityEstablished", "contentTruthEstablished", "countsTowardExpertGate", "credentialVerified",
    "expertGateEligible", "expertStatusVerified", "expertTruthEstablished", "identityVerified",
    "pairwiseIndependenceEstablished", "publicDeploymentAuthorized", "releaseReady",
    "rightsLegalConclusionEstablished", "scopeVerified", "verifierAuthorityEstablished"
  ]) requireFalse(decision[key], `candidate.decision.${key}`);
}

export function preflightBaziExpertAuthorityMaterialCandidate(verifiedLedger, candidateInput) {
  if (!isVerifiedBaziExpertAuthorityMaterialPrecheck(verifiedLedger)) {
    fail("VERIFIED_LEDGER_AUTHORITY_REQUIRED", "candidate preflight 必须绑定本模块当前验证结果。 ");
  }
  const candidate = capturePassiveJsonSnapshot(candidateInput);
  requireExactKeys(candidate, [
    "createdAt", "decision", "integrity", "pairwiseIndependenceMaterial", "recordId", "recordType",
    "recordVersion", "reviewerMaterials", "schemaVersion", "systemBinding", "verifierAuthorityMaterials"
  ], "authority material candidate", "CANDIDATE_SHAPE_INVALID");
  if (candidate.schemaVersion !== "1.0.0"
    || candidate.recordType !== "bazi_expert_authority_material_bundle_v1"
    || candidate.recordVersion !== "1.0.0") {
    fail("CANDIDATE_IDENTITY_INVALID", "candidate schema、record type 或 version 不匹配。 ");
  }
  requireSafeId(candidate.recordId, "candidate.recordId");
  requireCanonicalUtc(candidate.createdAt, "candidate.createdAt");
  validateCandidateSystemBinding(candidate.systemBinding);

  if (!Array.isArray(candidate.reviewerMaterials) || candidate.reviewerMaterials.length !== 2) {
    fail("REVIEWER_SEAT_BINDING_INVALID", "candidate 必须精确提供两个结构材料席位。 ");
  }
  const reviewerIds = candidate.reviewerMaterials.map((entry) => entry?.reviewerBindingId);
  if (reviewerIds.some((value) => typeof value !== "string") || new Set(reviewerIds).size !== 2) {
    fail("REVIEWER_SEAT_BINDING_INVALID", "两个 reviewer binding 必须存在且彼此不同。 ");
  }
  if (!Array.isArray(candidate.verifierAuthorityMaterials) || candidate.verifierAuthorityMaterials.length !== 3) {
    fail("VERIFIER_AUTHORITY_BINDING_REQUIRED", "candidate 必须提供两席 verifier 与 independence assessor 的三份 authority 材料。 ");
  }
  const registry = createEvidenceRegistry();
  const authorityById = new Map();
  for (const material of candidate.verifierAuthorityMaterials) {
    validateAuthorityMaterial(material, reviewerIds, registry, candidate.createdAt);
    registerUnique(registry, "materialIds", material.materialId, "MATERIAL_ID_REUSED", "material ID 不得跨组件复用。 ");
    if (authorityById.has(material.materialId)) fail("MATERIAL_ID_REUSED", "verifier authority material ID 不得复用。 ");
    authorityById.set(material.materialId, material);
  }
  const verifierIds = candidate.verifierAuthorityMaterials.map((entry) => entry.verifierBindingId);
  if (new Set(verifierIds).size !== verifierIds.length) {
    fail("VERIFIER_ID_REUSED", "两席 verifier 与 independence assessor 必须是三个不同 binding。 ");
  }
  const reviewerSurfaceAuthorities = candidate.verifierAuthorityMaterials.filter(
    (entry) => entry.authorityScope.surface === "reviewer_identity_credential_scope_verification"
  );
  const assessorSurfaceAuthorities = candidate.verifierAuthorityMaterials.filter(
    (entry) => entry.authorityScope.surface === "pairwise_independence_assessment"
  );
  if (reviewerSurfaceAuthorities.length !== 2 || assessorSurfaceAuthorities.length !== 1) {
    fail("AUTHORITY_MATERIAL_GRAPH_INVALID", "authority material 必须精确分成两席 verifier 与一名 independence assessor。 ");
  }

  candidate.reviewerMaterials.forEach((material) => {
    validateReviewerMaterial(material, reviewerIds, authorityById, registry, candidate.createdAt);
  });
  validatePairwiseMaterial(candidate.pairwiseIndependenceMaterial, candidate.reviewerMaterials, authorityById, registry);
  const consumedAuthorityRefs = [
    ...candidate.reviewerMaterials.map((entry) => entry.verifierAuthorityMaterialRef),
    candidate.pairwiseIndependenceMaterial.assessedBy.assessorAuthorityMaterialRef
  ];
  const declaredAuthorityRefs = candidate.verifierAuthorityMaterials.map((entry) => entry.materialId);
  if (new Set(consumedAuthorityRefs).size !== 3
    || consumedAuthorityRefs.some((ref) => !authorityById.has(ref))
    || declaredAuthorityRefs.some((ref) => !consumedAuthorityRefs.includes(ref))) {
    fail("AUTHORITY_MATERIAL_GRAPH_INVALID", "三份 authority material 必须各被对应角色精确消费一次且不得闲置。 ");
  }
  validateCandidateDecision(candidate.decision);
  requireExactKeys(candidate.integrity, [
    "authenticityEstablished", "digestDomain", "digestIsDigitalSignature", "hashAlgorithm", "recordDigest"
  ], "candidate.integrity", "CANDIDATE_INTEGRITY_INVALID");
  if (candidate.integrity.hashAlgorithm !== "sha256"
    || candidate.integrity.digestDomain !== CANDIDATE_DIGEST_DOMAIN) {
    fail("CANDIDATE_INTEGRITY_INVALID", "candidate digest contract 不匹配。 ");
  }
  requireFalse(candidate.integrity.authenticityEstablished, "candidate.integrity.authenticityEstablished");
  requireFalse(candidate.integrity.digestIsDigitalSignature, "candidate.integrity.digestIsDigitalSignature");
  requireSha256(candidate.integrity.recordDigest, "candidate.integrity.recordDigest");
  if (candidate.integrity.recordDigest !== computeBaziExpertAuthorityMaterialCandidateDigest(candidate)) {
    fail("CANDIDATE_DIGEST_MISMATCH", "candidate self-digest 不匹配。 ");
  }

  const result = deepFreezeJson({
    authenticityEstablished: false,
    candidateDigest: candidate.integrity.recordDigest,
    candidateDigestIsAnonymous: false,
    candidateDigestSafeToPublish: false,
    contentTruthEstablished: false,
    crossProcessReplayExcluded: false,
    countsAsCredentialVerificationRecord: false,
    countsAsExpertInstance: false,
    countsAsIdentityVerificationRecord: false,
    countsAsPairwiseIndependenceAssessment: false,
    countsTowardExpertGate: false,
    expertClaimsAuthorized: false,
    expertGateEligible: false,
    expertTruthEstablished: false,
    identityVerified: false,
    materialStructurePreflighted: true,
    pairwiseIndependenceEstablished: false,
    persistedInstance: false,
    personalDataPresenceAssessed: false,
    publicDeploymentAuthorized: false,
    releaseReady: false,
    rightsLegalConclusionEstablished: false,
    sameSessionReplayExcluded: false,
    scopeVerified: false,
    status: "zero_instance_authority_precheck_structure_only",
    resultIsAdmissionReceipt: false,
    verifierAuthorityEstablished: false
  });
  trustedMaterialPrecheckResults.add(result);
  return result;
}

export function preflightBaziExpertAuthorityMaterialCandidateJsonBytes(verifiedLedger, bytes) {
  const candidate = parseBaziExpertAuthorityMaterialPrecheckJsonBytes(bytes, "八字专家 authority 材料 candidate", MAX_LEDGER_BYTES);
  return preflightBaziExpertAuthorityMaterialCandidate(verifiedLedger, candidate);
}

export function isTrustedBaziExpertAuthorityMaterialPrecheckResult(value) {
  return value !== null && typeof value === "object" && trustedMaterialPrecheckResults.has(value);
}

export const baziExpertAuthorityMaterialPrecheckTestOnly = Object.freeze({
  candidateDigestDomain: CANDIDATE_DIGEST_DOMAIN,
  componentRecordTypes: COMPONENT_RECORD_TYPES,
  evidenceCategories: EVIDENCE_CATEGORIES,
  expectedLedgerRawIdentity: EXPECTED_LEDGER_RAW_IDENTITY,
  fixedDecisionReasonCodes: FIXED_DECISION_REASON_CODES,
  formalVerifierHelperIdentity: FORMAL_VERIFIER_HELPER_IDENTITY,
  intakeGapLockedReadiness: INTAKE_GAP_LOCKED_READINESS,
  parentIdentities: PARENT_IDENTITIES
});
