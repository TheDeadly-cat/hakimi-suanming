import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { TextDecoder, types as utilTypes } from "node:util";
import { parseExpression } from "@babel/parser";
import { loadBaziExpertPublicCandidatePrescreen } from "./bazi-expert-public-candidate-prescreen-lib.mjs";

export const BAZI_EXPERT_PUBLIC_EVIDENCE_FOLLOWUP_RELATIVE_PATH =
  "content/system-admission/bazi-expert-public-evidence-followup.v1.json";

const BASIS_RELATIVE_PATH = "docs/阶段D八字现实专家公开证据跟进-child-v1-2026-08-29.md";
const MAX_ARTIFACT_BYTES = 1_000_000;
const MAX_BASIS_BYTES = 1_000_000;
const MAX_INPUT_NODES = 100_000;
const MAX_INPUT_DEPTH = 64;
const MAX_INPUT_TEXT = 1_000_000;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const FOLLOWUP_ID = "hakimi.bazi.expert-public-evidence-followup/1.0.0";
const PARENT_STATE = "uncontacted_public_candidate_lead";
const FOLLOWUP_RAW_IDENTITY = Object.freeze({
  rawBytes: 11_989,
  rawSha256: "1961f1e9118f24eba8ea2a7c782afa6e3748ed56e3a4de2c4bca3bf5f481bce3"
});
const BASIS_IDENTITY = Object.freeze({
  path: BASIS_RELATIVE_PATH,
  role: "non_authoritative_link_only_public_followup_narrative_basis",
  rawBytes: 5_517,
  rawSha256: "8ac95f9ea52cdf3aef7db2cc96f12a7fd780b00ea06d3b139d5deb8b8a0a982e"
});
const EXPECTED_PARENT = Object.freeze({
  path: "content/system-admission/bazi-expert-public-candidate-prescreen.v1.json",
  rawBytes: 21_691,
  rawSha256: "88e5dabca1f3bb10cc8c8dfc2d2bfbdcf6b65a9a577b4747374e4e986c6988d9",
  ledgerId: "hakimi.bazi.expert-public-candidate-prescreen/1.0.0",
  ledgerDigest: "ba9878bfcf266d5f34c46cf0808b3bbc382ddaa8464b36bf1a63d8c77bdf6d21",
  candidateLeadIds: Object.freeze(["bazi-public-lead-002", "bazi-public-lead-003"])
});

export const BAZI_EXPERT_PUBLIC_EVIDENCE_FOLLOWUP_REVIEW_QUESTION_IDS = Object.freeze([
  "month-command-hidden-stem-duplication",
  "relative-factor-weighting",
  "strength-band-thresholds",
  "strength-invalidation-structures"
]);

const EXPECTED_SOURCE_GROUPS = Object.freeze([
  Object.freeze({
    sourceUpstreamGroupId: "JAPAN_DIVINATION_ASSOCIATION",
    publicOwnerLabel: "日本占術協会",
    observationIds: Object.freeze(["OYAMA-ASSOC-PAPER-TOPIC-20260829"])
  }),
  Object.freeze({
    sourceUpstreamGroupId: "HUNG_KUANG_PUBLIC_RECORD_FAMILY",
    publicOwnerLabel: "弘光科技大学公开角色与出版元数据发布族",
    observationIds: Object.freeze([
      "ZHANG-HK-ROLE-LABEL-OBSERVED-20260829",
      "ZHANG-DOI-METADATA-201105"
    ])
  })
]);

const EXPECTED_OBSERVATIONS = Object.freeze([
  Object.freeze({
    sourceObservationId: "OYAMA-ASSOC-PAPER-TOPIC-20260829",
    candidateLeadId: "bazi-public-lead-002",
    requestedUrl: "https://uranai-japan.or.jp/rp_archive/",
    sourceUpstreamGroupId: "JAPAN_DIVINATION_ASSOCIATION",
    sourceType: "public_association_research_archive_topic_record",
    observedAt: "2026-08-29",
    httpStatusOperatorRecorded: 200,
    contentTypeOperatorRecorded: "text/html; charset=UTF-8",
    deliveredBodyBytesOperatorRecorded: 223_916,
    deliveredBodySha256OperatorRecorded: "646effc26cf6bc6873a5eec908f0fb62bd38d1fd51f0e9e2e2ab1ee6834601e0",
    deliveredBodyHashBindsSemanticSummary: false,
    redirectObserved: false,
    doiLiteral: null,
    operatorRecordedSummary: "协会公开研究档案把《子平推命とは何か》与小山眞樹代关联，并显示月令／藏干、数值化强弱及内外格／从格主题；项目规则答案仍未建立。",
    supportsFollowupDiscoveryOnly: true,
    authoritative: false
  }),
  Object.freeze({
    sourceObservationId: "ZHANG-HK-ROLE-LABEL-OBSERVED-20260829",
    candidateLeadId: "bazi-public-lead-003",
    requestedUrl: "https://www.hk.edu.tw/remote/HK_PO37600939/",
    sourceUpstreamGroupId: "HUNG_KUANG_PUBLIC_RECORD_FAMILY",
    sourceType: "public_institution_role_label_record",
    observedAt: "2026-08-29",
    httpStatusOperatorRecorded: 200,
    contentTypeOperatorRecorded: "text/html; charset=UTF-8",
    deliveredBodyBytesOperatorRecorded: 70_483,
    deliveredBodySha256OperatorRecorded: "328e66f7f7bc0592b9121ce6463859e73755fae7d68310efa709aebe36548adb",
    deliveredBodyHashBindsSemanticSummary: false,
    redirectObserved: false,
    doiLiteral: null,
    operatorRecordedSummary: "弘光科技大学人事室公开委员会名册列出同显示名人员及通识教育中心副教授角色标签；只作机构角色线索。",
    supportsFollowupDiscoveryOnly: true,
    authoritative: false
  }),
  Object.freeze({
    sourceObservationId: "ZHANG-DOI-METADATA-201105",
    candidateLeadId: "bazi-public-lead-003",
    requestedUrl: "https://doi.org/10.29933/SHSS.201105.0005",
    sourceUpstreamGroupId: "HUNG_KUANG_PUBLIC_RECORD_FAMILY",
    sourceType: "public_doi_resolver_and_publication_metadata_record",
    observedAt: "2026-08-29",
    httpStatusOperatorRecorded: 302,
    contentTypeOperatorRecorded: "text/html;charset=utf-8",
    deliveredBodyBytesOperatorRecorded: 305,
    deliveredBodySha256OperatorRecorded: "985a94e85830b9845d8a4addf0bb849413b2a4744494499137de9d5ca55e1bd5",
    deliveredBodyHashBindsSemanticSummary: false,
    redirectObserved: true,
    doiLiteral: "10.29933/SHSS.201105.0005",
    operatorRecordedSummary: "公开 DOI 入口及出版元数据把《子平命學溯源－唐宋命學要籍考辨》、显示名張新智和该 DOI 关联；只支持子平研究主题相关性。",
    supportsFollowupDiscoveryOnly: true,
    authoritative: false
  })
]);

const EXPECTED_CANDIDATES = Object.freeze([
  Object.freeze({
    candidateLeadId: "bazi-public-lead-002",
    parentCandidateState: PARENT_STATE,
    followupState: "public_topic_relevance_observed_project_scope_unverified",
    observationIds: Object.freeze(["OYAMA-ASSOC-PAPER-TOPIC-20260829"]),
    sourceUpstreamGroupIds: Object.freeze(["JAPAN_DIVINATION_ASSOCIATION"]),
    deduplicatedSourceGroupCount: 1,
    scopeStates: Object.freeze([
      "adjacent_public_topic_signal_observed_exact_project_question_unassessed",
      "adjacent_public_topic_signal_observed_exact_project_question_unassessed",
      "no_direct_public_evidence_observed",
      "adjacent_public_topic_signal_observed_exact_project_question_unassessed"
    ]),
    publicTopicRelevanceObserved: true,
    institutionRoleLabelObserved: false,
    doiLiteralObserved: false
  }),
  Object.freeze({
    candidateLeadId: "bazi-public-lead-003",
    parentCandidateState: PARENT_STATE,
    followupState: "public_role_label_and_doi_metadata_observed_person_binding_unverified",
    observationIds: Object.freeze(["ZHANG-HK-ROLE-LABEL-OBSERVED-20260829", "ZHANG-DOI-METADATA-201105"]),
    sourceUpstreamGroupIds: Object.freeze(["HUNG_KUANG_PUBLIC_RECORD_FAMILY"]),
    deduplicatedSourceGroupCount: 1,
    scopeStates: Object.freeze([
      "not_assessed_in_this_followup",
      "not_assessed_in_this_followup",
      "not_assessed_in_this_followup",
      "not_assessed_in_this_followup"
    ]),
    publicTopicRelevanceObserved: true,
    institutionRoleLabelObserved: true,
    doiLiteralObserved: true
  })
]);

const EXPECTED_BINDING_BOUNDARY = Object.freeze({
  childToParentOnly: true,
  parentMutated: false,
  parentBacklinkAdded: false,
  formalPacketMutated: false,
  manifestMutated: false,
  registryMutated: false,
  crossSystemReceiptMutated: false,
  countsTowardFormalExpertIntake: false
});

const EXPECTED_STORAGE_BOUNDARY = Object.freeze({
  remoteResponseBodiesStored: 0,
  pageBodiesStored: 0,
  carrierFilesStored: 0,
  exactQuotesStored: 0,
  abstractsStored: 0,
  keywordsStored: 0,
  screenshotsStored: 0,
  personalContactDetailsStored: 0,
  privateIdentifiersStored: 0,
  credentialsUsed: false,
  loginOrProtectedBackendUsed: false,
  sourceUrlsStored: 3
});

const EXPECTED_RIGHTS_BOUNDARY = Object.freeze({
  distributionPolicy: "link_only",
  rightsLegalConclusion: "not_established",
  workRightsEstablished: false,
  editionRightsEstablished: false,
  carrierRightsEstablished: false,
  storageRightsEstablished: false,
  redistributionRightsEstablished: false,
  legalReviewVerified: false,
  publicRepositoryInclusionAuthorized: false,
  buildInclusionAuthorized: false
});

const EXPECTED_NETWORK_BOUNDARY = Object.freeze({
  operatorRecordedNetworkFacts: true,
  operatorRecordedSummariesMechanicallyVerified: false,
  automaticDecompressionClaimedByOperator: true,
  automaticDecompressionMechanicallyVerified: false,
  captureExecutionReceiptStored: false,
  remoteCaptureMechanicallyVerified: false,
  requestedToFinalUrlBindingEstablished: false,
  redirectChainCaptured: false,
  wireBytesCaptured: false,
  tlsPeerCertificateCaptured: false,
  futureFreshnessRevalidated: false,
  doiResolverCountsAsIndependentFactUpstream: false,
  publisherAuthenticityEstablished: false,
  remoteNetworkProvenanceEstablished: false
});

const EXPECTED_INTEGRITY_BOUNDARY = Object.freeze({
  heldHandleRead: true,
  sameBufferHashAndParse: true,
  basisSameBufferHashAndInspection: true,
  parentLoadedViaStrictVerifier: true,
  rawIdentityPinned: true,
  semanticDigestPinned: true,
  finalFileSymlinkRejected: true,
  directorySymlinkRejected: true,
  hardlinkRejected: true,
  unknownFieldsRejected: true,
  callerMatchesPersistedSnapshotRequired: true,
  fullLoadResultWeakSetBranded: true,
  crossFileAtomicSnapshot: false,
  mutationEpochAvailable: false,
  intervalMutationExcluded: false,
  abaExcluded: false
});

const EXPECTED_AUTHORITY_BOUNDARY = Object.freeze({
  candidateLeadsObserved: 2,
  formalExpertSeatsOccupied: 0,
  expertGateCount: 0,
  identityVerified: false,
  credentialVerified: false,
  scopeVerified: false,
  independenceVerified: false,
  expertStatusVerified: false,
  expertParticipationOrConsentVerified: false,
  expertOpinionStored: false,
  contentTruthEstablished: false,
  expertTruthEstablished: false,
  releaseReady: false,
  expertClaimsAuthorized: false,
  publicDeploymentAuthorized: false
});

const EXPECTED_DOES_NOT_ESTABLISH = Object.freeze([
  "real_person_identity",
  "current_role",
  "credential_validity",
  "candidate_to_record_person_identity_binding",
  "project_question_answer",
  "project_scope_verification",
  "pairwise_expert_independence",
  "expert_participation_or_consent",
  "expert_opinion",
  "content_truth",
  "expert_truth",
  "work_edition_carrier_rights",
  "legal_conclusion",
  "release_readiness",
  "expert_claim_authorization",
  "public_deployment_authorization",
  "remote_network_provenance",
  "publisher_authenticity",
  "cross_file_atomic_snapshot",
  "mutation_epoch_or_interval_mutation_or_aba_exclusion"
]);

const TYPED_ARRAY_PROTOTYPE = Object.getPrototypeOf(Uint8Array.prototype);
const TYPED_ARRAY_BUFFER_GETTER = Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "buffer")?.get;
const TYPED_ARRAY_BYTE_OFFSET_GETTER = Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "byteOffset")?.get;
const TYPED_ARRAY_BYTE_LENGTH_GETTER = Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "byteLength")?.get;
const ARRAY_BUFFER_RESIZABLE_GETTER = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "resizable")?.get;
const UINT8_ARRAY_SET = Uint8Array.prototype.set;
const VERIFIED_RESULTS = new WeakSet();

export class BaziExpertPublicEvidenceFollowupError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "BaziExpertPublicEvidenceFollowupError";
    Object.defineProperties(this, {
      code: { value: code, enumerable: false, configurable: false, writable: false },
      safeForCli: { value: true, enumerable: false, configurable: false, writable: false }
    });
  }
}

function fail(code, message, cause) {
  throw new BaziExpertPublicEvidenceFollowupError(
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
    if (count > MAX_INPUT_NODES) fail("JSON_TOO_COMPLEX", "D followup JSON AST 超过节点上限。");
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
      sourceFilename: "bazi-expert-public-evidence-followup.json",
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
    if (cause instanceof BaziExpertPublicEvidenceFollowupError) throw cause;
    fail("JSON_INVALID", `${label} 不是合法 JSON。`, cause);
  }
}

export function parseBaziExpertPublicEvidenceFollowupJsonBytes(
  bytes,
  label = "八字现实专家公开证据跟进 child",
  maxBytes = MAX_ARTIFACT_BYTES
) {
  return parseCapturedJson(captureUint8Array(bytes, label, maxBytes), label);
}

function capturePassiveJsonValue(value, state, depth) {
  if (depth > MAX_INPUT_DEPTH) fail("INPUT_DEPTH_EXCEEDED", "D followup 输入超过最大深度。");
  state.nodes += 1;
  if (state.nodes > MAX_INPUT_NODES) fail("INPUT_NODE_LIMIT_EXCEEDED", "D followup 输入超过节点上限。");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) fail("INPUT_VALUE_INVALID", "D followup 输入含无效数值。");
    return value;
  }
  if (typeof value === "string") {
    state.textCharacters += value.length;
    if (state.textCharacters > MAX_INPUT_TEXT) fail("INPUT_TEXT_LIMIT_EXCEEDED", "D followup 输入超过文本上限。");
    return value;
  }
  if (typeof value !== "object") fail("INPUT_VALUE_INVALID", "D followup 只接受 JSON 数据值。");
  if (utilTypes.isProxy(value)) fail("INPUT_PROXY_FORBIDDEN", "D followup 输入不接受 Proxy。");
  if (state.active.has(value)) fail("INPUT_CYCLE_FORBIDDEN", "D followup 输入不接受循环引用。");
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
      fail("INPUT_OBJECT_UNSAFE", "D followup 输入不能被安全捕获。", cause);
    }
    const descriptorKeys = Reflect.ownKeys(descriptors);
    if (descriptorKeys.some((key) => typeof key === "symbol")) {
      fail("INPUT_SYMBOL_FORBIDDEN", "D followup 输入不接受 Symbol 属性。");
    }
    if (array) {
      if (prototype !== Array.prototype) fail("INPUT_PROTOTYPE_INVALID", "D followup 数组原型无效。");
      const lengthDescriptor = descriptors.length;
      const length = lengthDescriptor?.value;
      if (lengthDescriptor?.get || lengthDescriptor?.set
        || !Number.isSafeInteger(length) || length < 0 || length > MAX_INPUT_NODES) {
        fail("INPUT_ARRAY_INVALID", "D followup 数组长度无效。");
      }
      const allowedKeys = new Set(["length", ...Array.from({ length }, (_entry, index) => String(index))]);
      if (descriptorKeys.some((key) => !allowedKeys.has(key))) {
        fail("INPUT_ARRAY_INVALID", "D followup 数组含额外属性。");
      }
      const output = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
          fail("INPUT_ARRAY_INVALID", "D followup 不接受稀疏数组或访问器元素。");
        }
        output.push(capturePassiveJsonValue(descriptor.value, state, depth + 1));
      }
      return output;
    }
    if (prototype !== Object.prototype) fail("INPUT_PROTOTYPE_INVALID", "D followup 只接受普通对象。");
    const output = {};
    for (const key of descriptorKeys) {
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
        fail("INPUT_ACCESSOR_FORBIDDEN", "D followup 不接受访问器或不可枚举字段。");
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
  fail("NON_CANONICAL_JSON", "D followup 只接受有限规范 JSON 值。");
}

export function canonicalStringifyBaziExpertPublicEvidenceFollowup(value) {
  return JSON.stringify(canonicalValue(capturePassiveJsonSnapshot(value)));
}

export function computeBaziExpertPublicEvidenceFollowupDigest(value) {
  const snapshot = capturePassiveJsonSnapshot(value);
  const { followupDigest: _followupDigest, ...unsigned } = snapshot;
  return createHash("sha256")
    .update(canonicalStringifyBaziExpertPublicEvidenceFollowup(unsigned), "utf8")
    .digest("hex");
}

function deepFreezeJson(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreezeJson(child, seen);
  return Object.freeze(value);
}

function assertExactKeys(value, expectedKeys, label, code = "UNKNOWN_FIELD_FORBIDDEN") {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    fail(code, `${label} 必须是普通对象。`);
  }
  const actual = Object.keys(value).sort(compareCodeUnits);
  const expected = [...expectedKeys].sort(compareCodeUnits);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(code, `${label} 字段集合不精确。`);
}

function exactJson(left, right) {
  return canonicalStringifyBaziExpertPublicEvidenceFollowup(left)
    === canonicalStringifyBaziExpertPublicEvidenceFollowup(right);
}

function validateRequestedUrl(value) {
  if (typeof value !== "string" || value.length > 512) fail("SOURCE_URL_INVALID", "公开来源 URL 无效。");
  let parsed;
  try {
    parsed = new URL(value);
  } catch (cause) {
    fail("SOURCE_URL_INVALID", "公开来源 URL 不能解析。", cause);
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.hash || parsed.href !== value) {
    fail("SOURCE_URL_INVALID", "公开来源 URL 必须是无凭据、无 fragment 的规范 HTTPS literal。");
  }
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(parsed.pathname).toLowerCase();
  } catch (cause) {
    fail("SOURCE_URL_INVALID", "公开来源 URL 路径编码无效。", cause);
  }
  if (/(?:^|\/)(?:login|signin|sign-in|auth|oauth|session)(?:\/|$)/u.test(decodedPath)) {
    fail("SOURCE_URL_FORBIDDEN", "公开来源 URL 不得指向登录或认证路径。");
  }
  for (const key of parsed.searchParams.keys()) {
    if (/(?:token|session|password|passwd|secret|api[_-]?key|auth|credential)/iu.test(key)) {
      fail("SOURCE_URL_FORBIDDEN", "公开来源 URL 不得包含敏感查询参数。");
    }
  }
}

function verifySourceGroups(sourceGroups) {
  if (!Array.isArray(sourceGroups) || sourceGroups.length !== EXPECTED_SOURCE_GROUPS.length) {
    fail("SOURCE_GROUP_CATALOG_MISMATCH", "D followup 上游来源组数量无效。");
  }
  const seenGroups = new Set();
  const seenObservations = new Set();
  for (let index = 0; index < EXPECTED_SOURCE_GROUPS.length; index += 1) {
    const actual = sourceGroups[index];
    const expected = EXPECTED_SOURCE_GROUPS[index];
    assertExactKeys(actual, ["sourceUpstreamGroupId", "publicOwnerLabel", "observationIds"], `sourceGroups[${index}]`);
    if (seenGroups.has(actual.sourceUpstreamGroupId)) fail("SOURCE_GROUP_DOUBLE_COUNT", "D followup 上游来源组重复。");
    seenGroups.add(actual.sourceUpstreamGroupId);
    if (!Array.isArray(actual.observationIds)) fail("SOURCE_GROUP_CATALOG_MISMATCH", "D followup observationIds 无效。");
    for (const observationId of actual.observationIds) {
      if (seenObservations.has(observationId)) fail("SOURCE_GROUP_DOUBLE_COUNT", "D followup 观察被跨组重复计数。");
      seenObservations.add(observationId);
    }
    if (!exactJson(actual, expected)) fail("SOURCE_GROUP_CATALOG_MISMATCH", "D followup 上游来源组目录不匹配。");
  }
}

const OBSERVATION_KEYS = Object.freeze([
  "sourceObservationId", "candidateLeadId", "requestedUrl", "sourceUpstreamGroupId", "sourceType",
  "observedAt", "httpStatusOperatorRecorded", "contentTypeOperatorRecorded",
  "deliveredBodyBytesOperatorRecorded", "deliveredBodySha256OperatorRecorded",
  "deliveredBodyHashBindsSemanticSummary", "redirectObserved", "doiLiteral",
  "operatorRecordedSummary", "supportsFollowupDiscoveryOnly", "authoritative"
]);

function verifySourceObservations(sourceObservations) {
  if (!Array.isArray(sourceObservations) || sourceObservations.length !== EXPECTED_OBSERVATIONS.length) {
    fail("SOURCE_OBSERVATION_CATALOG_MISMATCH", "D followup 公开观察数量无效。");
  }
  const seen = new Set();
  for (let index = 0; index < EXPECTED_OBSERVATIONS.length; index += 1) {
    const actual = sourceObservations[index];
    const expected = EXPECTED_OBSERVATIONS[index];
    assertExactKeys(actual, OBSERVATION_KEYS, `sourceObservations[${index}]`);
    if (seen.has(actual.sourceObservationId)) fail("SOURCE_OBSERVATION_DUPLICATE", "D followup 公开观察 ID 重复。");
    seen.add(actual.sourceObservationId);
    validateRequestedUrl(actual.requestedUrl);
    if (!DATE_PATTERN.test(actual.observedAt)
      || !Number.isInteger(actual.httpStatusOperatorRecorded)
      || actual.httpStatusOperatorRecorded < 100
      || actual.httpStatusOperatorRecorded > 599
      || !Number.isSafeInteger(actual.deliveredBodyBytesOperatorRecorded)
      || actual.deliveredBodyBytesOperatorRecorded <= 0
      || !SHA256_PATTERN.test(actual.deliveredBodySha256OperatorRecorded)
      || typeof actual.contentTypeOperatorRecorded !== "string"
      || actual.contentTypeOperatorRecorded.length === 0
      || actual.deliveredBodyHashBindsSemanticSummary !== false
      || actual.supportsFollowupDiscoveryOnly !== true
      || actual.authoritative !== false) {
      fail("SOURCE_OBSERVATION_INVALID", "D followup 公开观察字段无效或发生权威晋级。");
    }
    if (!exactJson(actual, expected)) {
      fail("SOURCE_OBSERVATION_CATALOG_MISMATCH", "D followup 公开观察目录不匹配。");
    }
  }
}

const CANDIDATE_KEYS = Object.freeze([
  "candidateLeadId", "parentCandidateState", "followupState", "observationIds",
  "sourceUpstreamGroupIds", "deduplicatedSourceGroupCount", "scopeSignalMatrix",
  "publicTopicRelevanceObserved", "institutionRoleLabelObserved", "doiLiteralObserved",
  "projectQuestionAnswered", "crossRecordPersonIdentityBindingVerified", "currentRoleVerified",
  "identityVerified", "credentialVerified", "scopeVerified", "independenceVerified",
  "expertStatusVerified", "countsTowardExpertGate", "slotAssignment"
]);

function verifyCandidateFollowups(candidateFollowups) {
  if (!Array.isArray(candidateFollowups) || candidateFollowups.length !== EXPECTED_CANDIDATES.length) {
    fail("CANDIDATE_CATALOG_MISMATCH", "D followup 候选数量无效。");
  }
  const seen = new Set();
  for (let index = 0; index < EXPECTED_CANDIDATES.length; index += 1) {
    const actual = candidateFollowups[index];
    const expected = EXPECTED_CANDIDATES[index];
    assertExactKeys(actual, CANDIDATE_KEYS, `candidateFollowups[${index}]`);
    if (seen.has(actual.candidateLeadId)) fail("CANDIDATE_DUPLICATE", "D followup 候选重复。");
    seen.add(actual.candidateLeadId);
    if (actual.parentCandidateState !== PARENT_STATE) fail("PARENT_CANDIDATE_STATE_DRIFT", "父账候选状态发生漂移。");
    if (actual.projectQuestionAnswered !== false
      || actual.crossRecordPersonIdentityBindingVerified !== false
      || actual.currentRoleVerified !== false
      || actual.identityVerified !== false
      || actual.credentialVerified !== false
      || actual.scopeVerified !== false
      || actual.independenceVerified !== false
      || actual.expertStatusVerified !== false
      || actual.countsTowardExpertGate !== false
      || actual.slotAssignment !== null) {
      fail("CANDIDATE_PROMOTION_FORBIDDEN", "D followup 候选不得晋级身份、范围、席位或专家门。");
    }
    if (!Array.isArray(actual.scopeSignalMatrix) || actual.scopeSignalMatrix.length !== 4) {
      fail("SCOPE_SIGNAL_INVALID", "D followup scope signal 数量无效。");
    }
    for (let questionIndex = 0; questionIndex < 4; questionIndex += 1) {
      const scope = actual.scopeSignalMatrix[questionIndex];
      assertExactKeys(scope, ["questionId", "state"], `candidateFollowups[${index}].scopeSignalMatrix[${questionIndex}]`);
      if (scope.questionId !== BAZI_EXPERT_PUBLIC_EVIDENCE_FOLLOWUP_REVIEW_QUESTION_IDS[questionIndex]
        || scope.state !== expected.scopeStates[questionIndex]) {
        fail("SCOPE_PROMOTION_FORBIDDEN", "公开主题线索不得改写成项目答案或 scope verified。");
      }
    }
    const expectedCandidate = {
      candidateLeadId: expected.candidateLeadId,
      parentCandidateState: expected.parentCandidateState,
      followupState: expected.followupState,
      observationIds: expected.observationIds,
      sourceUpstreamGroupIds: expected.sourceUpstreamGroupIds,
      deduplicatedSourceGroupCount: expected.deduplicatedSourceGroupCount,
      scopeSignalMatrix: BAZI_EXPERT_PUBLIC_EVIDENCE_FOLLOWUP_REVIEW_QUESTION_IDS.map((questionId, questionIndex) => ({
        questionId,
        state: expected.scopeStates[questionIndex]
      })),
      publicTopicRelevanceObserved: expected.publicTopicRelevanceObserved,
      institutionRoleLabelObserved: expected.institutionRoleLabelObserved,
      doiLiteralObserved: expected.doiLiteralObserved,
      projectQuestionAnswered: false,
      crossRecordPersonIdentityBindingVerified: false,
      currentRoleVerified: false,
      identityVerified: false,
      credentialVerified: false,
      scopeVerified: false,
      independenceVerified: false,
      expertStatusVerified: false,
      countsTowardExpertGate: false,
      slotAssignment: null
    };
    if (!exactJson(actual, expectedCandidate)) fail("CANDIDATE_CATALOG_MISMATCH", "D followup 候选目录不匹配。");
  }
}

function verifyBoundary(actual, expected, label, code) {
  assertExactKeys(actual, Object.keys(expected), label);
  if (!exactJson(actual, expected)) fail(code, `${label} 发生越权或漂移。`);
}

export function verifyBaziExpertPublicEvidenceFollowupArtifact(input) {
  const followup = capturePassiveJsonSnapshot(input);
  assertExactKeys(followup, [
    "schemaVersion", "recordType", "followupId", "status", "createdAt", "parentPrescreenArtifact",
    "basisArtifact", "reviewQuestionIds", "sourceGroupPolicy", "sourceGroups", "sourceObservations",
    "candidateFollowups", "bindingBoundary", "storageBoundary", "rightsBoundary",
    "networkObservationBoundary", "integrityBoundary", "authorityBoundary", "doesNotEstablish",
    "followupDigest"
  ], "followup");
  if (followup.schemaVersion !== "1.0.0"
    || followup.recordType !== "bazi_expert_public_evidence_followup_v1"
    || followup.followupId !== FOLLOWUP_ID
    || followup.status !== "link_only_operator_recorded_public_followup_non_authoritative_not_formal_expert_intake"
    || followup.createdAt !== "2026-08-29T00:00:00.000Z") {
    fail("FOLLOWUP_IDENTITY_INVALID", "D followup 根身份无效。");
  }
  assertExactKeys(followup.parentPrescreenArtifact, Object.keys(EXPECTED_PARENT), "parentPrescreenArtifact");
  if (!exactJson(followup.parentPrescreenArtifact, EXPECTED_PARENT)) fail("PARENT_BINDING_MISMATCH", "父预筛账绑定不匹配。");
  assertExactKeys(followup.basisArtifact, Object.keys(BASIS_IDENTITY), "basisArtifact");
  if (!exactJson(followup.basisArtifact, BASIS_IDENTITY)) fail("BASIS_BINDING_MISMATCH", "D followup basis 绑定不匹配。");
  if (!exactJson(followup.reviewQuestionIds, BAZI_EXPERT_PUBLIC_EVIDENCE_FOLLOWUP_REVIEW_QUESTION_IDS)) {
    fail("REVIEW_QUESTION_CATALOG_MISMATCH", "D followup 四题目录不匹配。");
  }
  assertExactKeys(followup.sourceGroupPolicy, [
    "deduplicationKey", "sameGroupObservationsCountOnce", "sourceObservationCount", "deduplicatedSourceGroupCount"
  ], "sourceGroupPolicy");
  if (!exactJson(followup.sourceGroupPolicy, {
    deduplicationKey: "sourceUpstreamGroupId",
    sameGroupObservationsCountOnce: true,
    sourceObservationCount: 3,
    deduplicatedSourceGroupCount: 2
  })) {
    fail("SOURCE_GROUP_POLICY_INVALID", "D followup 来源组策略无效。");
  }
  verifySourceGroups(followup.sourceGroups);
  verifySourceObservations(followup.sourceObservations);
  verifyCandidateFollowups(followup.candidateFollowups);
  verifyBoundary(followup.bindingBoundary, EXPECTED_BINDING_BOUNDARY, "bindingBoundary", "BINDING_PROMOTION_FORBIDDEN");
  verifyBoundary(followup.storageBoundary, EXPECTED_STORAGE_BOUNDARY, "storageBoundary", "STORAGE_PROMOTION_FORBIDDEN");
  verifyBoundary(followup.rightsBoundary, EXPECTED_RIGHTS_BOUNDARY, "rightsBoundary", "RIGHTS_PROMOTION_FORBIDDEN");
  verifyBoundary(followup.networkObservationBoundary, EXPECTED_NETWORK_BOUNDARY, "networkObservationBoundary", "NETWORK_PROMOTION_FORBIDDEN");
  verifyBoundary(followup.integrityBoundary, EXPECTED_INTEGRITY_BOUNDARY, "integrityBoundary", "INTEGRITY_CLAIM_INVALID");
  verifyBoundary(followup.authorityBoundary, EXPECTED_AUTHORITY_BOUNDARY, "authorityBoundary", "AUTHORITY_PROMOTION_FORBIDDEN");
  if (!exactJson(followup.doesNotEstablish, EXPECTED_DOES_NOT_ESTABLISH)) {
    fail("DOES_NOT_ESTABLISH_MISMATCH", "D followup 负向边界目录不匹配。");
  }
  if (typeof followup.followupDigest !== "string" || !SHA256_PATTERN.test(followup.followupDigest)) {
    fail("FOLLOWUP_DIGEST_INVALID", "followupDigest 必须是小写 SHA-256。");
  }
  if (computeBaziExpertPublicEvidenceFollowupDigest(followup) !== followup.followupDigest) {
    fail("FOLLOWUP_DIGEST_MISMATCH", "D followup canonical digest 不一致。");
  }
  return deepFreezeJson(followup);
}

function normalizePathIdentity(value) {
  const normalized = path.resolve(value);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function insideRoot(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function validateRelativePath(relativePath) {
  if (typeof relativePath !== "string" || !relativePath
    || relativePath.includes("\\") || relativePath.includes("\0") || relativePath.includes(":")) {
    fail("ARTIFACT_PATH_INVALID", "D followup 路径必须是仓内规范相对路径。");
  }
  const parts = relativePath.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) {
    fail("ARTIFACT_PATH_INVALID", "D followup 路径不得为空、绝对或逃逸。");
  }
  return parts;
}

function sameEndpoint(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.nlink === right.nlink
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

async function captureDirectoryChain(root, parts) {
  const snapshots = [];
  let cursor = root;
  for (const part of [null, ...parts]) {
    if (part !== null) cursor = path.join(cursor, part);
    let metadata;
    let resolved;
    try {
      [metadata, resolved] = await Promise.all([lstat(cursor, { bigint: true }), realpath(cursor)]);
    } catch (cause) {
      fail("DIRECTORY_CHAIN_INVALID", "D followup 目录链不可安全读取。", cause);
    }
    if (metadata.isSymbolicLink() || !metadata.isDirectory()
      || normalizePathIdentity(resolved) !== normalizePathIdentity(cursor)) {
      fail("DIRECTORY_CHAIN_INVALID", "D followup 目录链包含链接、别名或非目录端点。");
    }
    snapshots.push(Object.freeze({ path: cursor, resolved, metadata }));
  }
  return snapshots;
}

async function revalidateDirectoryChain(snapshots) {
  for (const snapshot of snapshots) {
    let metadata;
    let resolved;
    try {
      [metadata, resolved] = await Promise.all([
        lstat(snapshot.path, { bigint: true }),
        realpath(snapshot.path)
      ]);
    } catch (cause) {
      fail("ENDPOINT_CHANGED", "D followup 读取期间目录链发生变化。", cause);
    }
    if (metadata.isSymbolicLink() || !metadata.isDirectory()
      || !sameEndpoint(snapshot.metadata, metadata)
      || normalizePathIdentity(resolved) !== normalizePathIdentity(snapshot.resolved)) {
      fail("ENDPOINT_CHANGED", "D followup 读取期间目录链发生变化。");
    }
  }
}

async function readBoundedHandle(handle, maxBytes) {
  const buffer = Buffer.allocUnsafe(maxBytes + 1);
  let offset = 0;
  while (offset < buffer.byteLength) {
    const { bytesRead } = await handle.read(buffer, offset, buffer.byteLength - offset, offset);
    if (bytesRead === 0) break;
    offset += bytesRead;
  }
  if (offset > maxBytes) fail("FILE_SIZE_INVALID", "D followup 文件在读取时超过上限。");
  return buffer.subarray(0, offset);
}

async function readStableWorkspaceFile(workspaceRootInput, relativePath, maxBytes, testHooks = undefined) {
  const parts = validateRelativePath(relativePath);
  const requestedRoot = path.resolve(workspaceRootInput);
  const directoryChain = await captureDirectoryChain(requestedRoot, parts.slice(0, -1));
  const root = directoryChain[0].resolved;
  const absolutePath = path.resolve(root, ...parts);
  if (!insideRoot(root, absolutePath) || normalizePathIdentity(root) !== normalizePathIdentity(requestedRoot)) {
    fail("ARTIFACT_PATH_INVALID", "D followup 路径越出工作区或 root 为别名。");
  }
  let beforePath;
  let resolved;
  try {
    [beforePath, resolved] = await Promise.all([
      lstat(absolutePath, { bigint: true }),
      realpath(absolutePath)
    ]);
  } catch (cause) {
    fail("FILE_UNAVAILABLE", "D followup 文件不可读。", cause);
  }
  if (beforePath.isSymbolicLink() || !beforePath.isFile()
    || normalizePathIdentity(resolved) !== normalizePathIdentity(absolutePath)) {
    fail("SYMLINK_REJECTED", "D followup 文件拒绝符号链接或路径别名。");
  }
  if (beforePath.nlink !== 1n) fail("HARDLINK_REJECTED", "D followup 文件必须是单链接普通文件。");
  if (beforePath.size <= 0n || beforePath.size > BigInt(maxBytes)) {
    fail("FILE_SIZE_INVALID", "D followup 文件为空或超限。");
  }
  const noFollow = typeof fsConstants.O_NOFOLLOW === "number" ? fsConstants.O_NOFOLLOW : 0;
  let handle;
  try {
    handle = await open(absolutePath, fsConstants.O_RDONLY | noFollow);
  } catch (cause) {
    fail("FILE_UNAVAILABLE", "D followup held handle 打开失败。", cause);
  }
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || before.nlink !== 1n || !sameEndpoint(beforePath, before)) {
      fail("ENDPOINT_CHANGED", "D followup 文件在 held handle 打开前变化。");
    }
    if (typeof testHooks?.afterOpenBeforeRead === "function") {
      await testHooks.afterOpenBeforeRead(Object.freeze({ absolutePath, handle }));
    }
    const readBytes = await readBoundedHandle(handle, maxBytes);
    if (typeof testHooks?.afterBytesRead === "function") {
      await testHooks.afterBytesRead(Object.freeze({ absolutePath, handle, readBytes }));
    }
    const after = await handle.stat({ bigint: true });
    let afterPath;
    let afterResolved;
    try {
      [afterPath, afterResolved] = await Promise.all([
        lstat(absolutePath, { bigint: true }),
        realpath(absolutePath)
      ]);
    } catch (cause) {
      fail("ENDPOINT_CHANGED", "D followup 文件读取期间路径端点变化。", cause);
    }
    if (afterPath.isSymbolicLink() || !afterPath.isFile() || afterPath.nlink !== 1n
      || !sameEndpoint(before, after) || !sameEndpoint(after, afterPath)
      || BigInt(readBytes.byteLength) !== after.size
      || normalizePathIdentity(afterResolved) !== normalizePathIdentity(absolutePath)) {
      fail("ENDPOINT_CHANGED", "D followup 文件读取期间端点变化。");
    }
    await revalidateDirectoryChain(directoryChain);
    const bytes = captureUint8Array(readBytes, relativePath, maxBytes);
    return Object.freeze({
      path: relativePath,
      rawBytes: bytes.byteLength,
      rawSha256: sha256(bytes),
      bytes
    });
  } finally {
    await handle.close().catch(() => {});
  }
}

function inspectBasisBytes(bytes) {
  if (bytes.byteLength >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail("BASIS_INVALID", "D followup basis 不得包含 UTF-8 BOM。");
  }
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (cause) {
    fail("BASIS_INVALID", "D followup basis 不是严格 UTF-8。", cause);
  }
  const requiredMarkers = [
    "# 阶段 D：八字现实专家公开证据跟进 child",
    "bazi-public-lead-002",
    "bazi-public-lead-003",
    ...EXPECTED_OBSERVATIONS.map((entry) => entry.sourceObservationId),
    "0/2",
    "remoteCaptureMechanicallyVerified=false"
  ];
  if (requiredMarkers.some((marker) => !source.includes(marker))) {
    fail("BASIS_INVALID", "D followup basis 缺少本批次固定标记。");
  }
}

async function readFollowupArtifact(workspaceRoot, testHooks = undefined) {
  const snapshot = await readStableWorkspaceFile(
    workspaceRoot,
    BAZI_EXPERT_PUBLIC_EVIDENCE_FOLLOWUP_RELATIVE_PATH,
    MAX_ARTIFACT_BYTES,
    testHooks
  );
  if (snapshot.rawBytes !== FOLLOWUP_RAW_IDENTITY.rawBytes
    || snapshot.rawSha256 !== FOLLOWUP_RAW_IDENTITY.rawSha256) {
    fail("ARTIFACT_DRIFT", "D followup child 与冻结 bytes/SHA-256 不一致。");
  }
  return Object.freeze({
    followup: parseCapturedJson(snapshot.bytes, "D followup child"),
    artifact: Object.freeze({
      path: snapshot.path,
      rawBytes: snapshot.rawBytes,
      rawSha256: snapshot.rawSha256
    })
  });
}

function publicArtifactIdentity(snapshot) {
  return Object.freeze({
    path: snapshot.path,
    rawBytes: snapshot.rawBytes,
    rawSha256: snapshot.rawSha256
  });
}

async function buildVerifiedResult(workspaceRoot, persistedRead, callerInput = undefined) {
  const persisted = verifyBaziExpertPublicEvidenceFollowupArtifact(persistedRead.followup);
  if (callerInput !== undefined) {
    const caller = verifyBaziExpertPublicEvidenceFollowupArtifact(callerInput);
    if (!exactJson(caller, persisted)) fail("CALLER_PERSISTED_MISMATCH", "调用方输入与持久化 D followup child 不一致。");
  }
  let parent;
  try {
    parent = await loadBaziExpertPublicCandidatePrescreen(workspaceRoot);
  } catch (cause) {
    fail("PARENT_BINDING_MISMATCH", "严格父预筛账无法按 child 绑定完成验证。", cause);
  }
  if (parent.ledgerId !== EXPECTED_PARENT.ledgerId
    || parent.ledgerDigest !== EXPECTED_PARENT.ledgerDigest
    || !exactJson(parent.ledgerArtifact, {
      path: EXPECTED_PARENT.path,
      rawBytes: EXPECTED_PARENT.rawBytes,
      rawSha256: EXPECTED_PARENT.rawSha256
    })) {
    fail("PARENT_BINDING_MISMATCH", "严格父预筛账与 child 绑定不一致。");
  }
  for (const candidateLeadId of EXPECTED_PARENT.candidateLeadIds) {
    const candidate = parent.ledger.candidates.find((entry) => entry.candidateLeadId === candidateLeadId);
    if (!candidate || candidate.candidateState !== PARENT_STATE
      || candidate.identityVerified !== false || candidate.credentialVerified !== false
      || candidate.scopeVerified !== false || candidate.independenceVerified !== false
      || candidate.expertStatusVerified !== false || candidate.countsTowardExpertGate !== false
      || candidate.slotAssignment !== null) {
      fail("PARENT_CANDIDATE_STATE_DRIFT", "父预筛账候选状态或权威门发生漂移。");
    }
  }
  const basisSnapshot = await readStableWorkspaceFile(workspaceRoot, BASIS_RELATIVE_PATH, MAX_BASIS_BYTES);
  if (basisSnapshot.rawBytes !== BASIS_IDENTITY.rawBytes
    || basisSnapshot.rawSha256 !== BASIS_IDENTITY.rawSha256) {
    fail("BASIS_DRIFT", "D followup basis 已漂移。");
  }
  inspectBasisBytes(basisSnapshot.bytes);
  const result = deepFreezeJson({
    offlineFollowupArtifactMechanicallyVerified: true,
    status: persisted.status,
    followupId: persisted.followupId,
    followupDigest: persisted.followupDigest,
    parentPrescreenBound: true,
    candidateFollowups: persisted.candidateFollowups.length,
    sourceObservations: persisted.sourceObservations.length,
    deduplicatedSourceGroups: persisted.sourceGroups.length,
    expertGateCount: persisted.authorityBoundary.expertGateCount,
    remoteCaptureMechanicallyVerified: persisted.networkObservationBoundary.remoteCaptureMechanicallyVerified,
    identityVerified: persisted.authorityBoundary.identityVerified,
    credentialVerified: persisted.authorityBoundary.credentialVerified,
    scopeVerified: persisted.authorityBoundary.scopeVerified,
    independenceVerified: persisted.authorityBoundary.independenceVerified,
    expertStatusVerified: persisted.authorityBoundary.expertStatusVerified,
    releaseReady: persisted.authorityBoundary.releaseReady,
    expertClaimsAuthorized: persisted.authorityBoundary.expertClaimsAuthorized,
    publicDeploymentAuthorized: persisted.authorityBoundary.publicDeploymentAuthorized,
    followupArtifact: persistedRead.artifact,
    parentPrescreenArtifact: parent.ledgerArtifact,
    basisArtifact: publicArtifactIdentity(basisSnapshot),
    followup: persisted
  });
  VERIFIED_RESULTS.add(result);
  return result;
}

export async function readBaziExpertPublicEvidenceFollowup(workspaceRoot = process.cwd()) {
  const persistedRead = await readFollowupArtifact(workspaceRoot);
  return verifyBaziExpertPublicEvidenceFollowupArtifact(persistedRead.followup);
}

export async function loadBaziExpertPublicEvidenceFollowup(workspaceRoot = process.cwd()) {
  const persistedRead = await readFollowupArtifact(workspaceRoot);
  return buildVerifiedResult(workspaceRoot, persistedRead);
}

export async function verifyBaziExpertPublicEvidenceFollowup(
  workspaceRoot = process.cwd(),
  callerInput
) {
  const persistedRead = await readFollowupArtifact(workspaceRoot);
  return buildVerifiedResult(workspaceRoot, persistedRead, callerInput);
}

export function isVerifiedBaziExpertPublicEvidenceFollowup(value) {
  return Boolean(value && typeof value === "object" && VERIFIED_RESULTS.has(value));
}

export const baziExpertPublicEvidenceFollowupTestOnly = Object.freeze({
  FOLLOWUP_RAW_IDENTITY,
  BASIS_IDENTITY,
  EXPECTED_PARENT,
  readBoundedHandle,
  readFollowupArtifact,
  readStableWorkspaceFile
});
