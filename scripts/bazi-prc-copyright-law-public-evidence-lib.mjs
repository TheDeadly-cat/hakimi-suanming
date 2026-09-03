import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { TextDecoder, types as utilTypes } from "node:util";
import { parseExpression } from "@babel/parser";
import { verifyBaziSourceBindingCandidateLedger } from "./bazi-source-binding-candidate-lib.mjs";
import { verifyBaziSourceRightsCandidateLedger } from "./bazi-source-rights-candidate-lib.mjs";

export const BAZI_PRC_COPYRIGHT_LAW_PUBLIC_EVIDENCE_RELATIVE_PATH =
  "content/system-admission/bazi-prc-copyright-law-public-evidence.v1.json";

const BASIS_RELATIVE_PATH = "docs/阶段C中国现行著作权法公开证据观察-child-v1-2026-08-29.md";
const MAX_ARTIFACT_BYTES = 1_000_000;
const MAX_PARENT_BYTES = 1_000_000;
const MAX_BASIS_BYTES = 1_000_000;
const MAX_INPUT_NODES = 100_000;
const MAX_INPUT_DEPTH = 64;
const MAX_INPUT_TEXT = 1_000_000;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const OBSERVATION_ID = "hakimi.bazi.source-rights.prc-copyright-law-public-evidence/1.0.0";
const EXPECTED_OBSERVATION_DIGEST = "f2cbbbf2d34b6f6ee69272805799def74f582f0058de8cfbab3321a84a44146c";

const OBSERVATION_RAW_IDENTITY = Object.freeze({
  rawBytes: 19_961,
  rawSha256: "c0e91874bd0b9e7c99d4db2b79df1e68c483fc1e68ed06700be44d5bf6bc10cf"
});

const BASIS_IDENTITY = Object.freeze({
  path: BASIS_RELATIVE_PATH,
  role: "non_authoritative_link_only_public_law_observation_narrative_basis",
  rawBytes: 7_867,
  rawSha256: "737b271ebf526b34e10ad3462657fe3baa1eec4ef2ccf417bdeb098fc2d296c4"
});

const EXPECTED_SOURCE_PARENT = Object.freeze({
  path: "content/bazi-strength-source-binding-candidates.v1.json",
  rawBytes: 47_753,
  rawSha256: "e2ac6a7a0ea1209dd92a38dfae82c494df4792da1a102c11d2fdb2caa80e41f7",
  ledgerId: "hakimi.bazi.strength.source-binding-candidates/1.5.0",
  ledgerDigest: "44ed9e23490c11c625602b77574efbf7331305bd1bf87634c5b91f568e8b85af",
  candidateCount: 4
});

const EXPECTED_RIGHTS_PARENT = Object.freeze({
  path: "content/bazi-strength-source-rights-candidates.v1.json",
  rawBytes: 20_806,
  rawSha256: "433116caf1a2b9c233739093b0a2436f13c7f268dfa8af6c1ce481964b48b179",
  ledgerId: "hakimi.bazi.strength.source-rights-candidates/1.1.0",
  ledgerDigest: "3776e4b8799ca5221c1765a735c3e34c637b4f4952c9243836fedfbf1ee30a36",
  rightsCandidateIds: Object.freeze([
    "smt-siku-v10-wikisource-r761703-rights-candidate-v1",
    "dtt-chanwei-wikisource-r2600158-rights-candidate-v1",
    "smt-v5-wikisource-r2706483-rights-candidate-v1",
    "yhzp-wikisource-r2593607-rights-candidate-v1"
  ])
});

const RELEASE_GOVERNANCE = Object.freeze({
  activeLine: "legacy-v13",
  targetSchema: 13,
  migrationId: null,
  mutationEpochBoundaryRequired: true,
  publicDeploymentAuthorized: false,
  expertClaimsAuthorized: false
});

const PUBLICATION_LOCKS = Object.freeze([
  Object.freeze({
    publicationId: "NCAC-CONSOLIDATED-COPYRIGHT-LAW-2020",
    requestedUrl: "https://www.ncac.gov.cn/xxfb/flfg/flfg_532/202103/t20210309_50530.html",
    publicationRole: "operator_observed_page_labeled_consolidated_2020_amended_law_text",
    deliveredDecodedBodyBytes: 122_716,
    deliveredDecodedBodySha256: "e27fccf5c3a0f29439d7e165f09e4e3d148ac301c16f71d0210339c175cca4f3"
  }),
  Object.freeze({
    publicationId: "NCAC-2020-AMENDMENT-DECISION",
    requestedUrl: "https://www.ncac.gov.cn/xxfb/ywxx/202011/t20201112_47358.html",
    publicationRole: "operator_observed_page_labeled_2020_amendment_decision_and_effective_date",
    deliveredDecodedBodyBytes: 68_007,
    deliveredDecodedBodySha256: "46491a9386aa385e1b471e0021fe51bfe2972da57732ef3f0d2c0bb605d3c2a2"
  })
]);

const FRAGMENT_LOCKS = Object.freeze([
  Object.freeze({ id: "PRC-CRL-2020-ARTICLE-5", publicationId: PUBLICATION_LOCKS[0].publicationId, occurrences: 1, characters: 93, bytes: 271, sha256: "5e761fabbbf73db8697eec063954b4548064bbc0937e66231908c0b7932c96ab" }),
  Object.freeze({ id: "PRC-CRL-2020-ARTICLE-15", publicationId: PUBLICATION_LOCKS[0].publicationId, occurrences: 1, characters: 91, bytes: 271, sha256: "e3270ef19a9b93de8f445ac879c3fc1218b2354f918cee9a0aaa31f1cb0de8de" }),
  Object.freeze({ id: "PRC-CRL-2020-ARTICLE-16", publicationId: PUBLICATION_LOCKS[0].publicationId, occurrences: 1, characters: 78, bytes: 232, sha256: "505b5dce829d409dbbd3fac4122afc6331ebb997247bb099d7a57613b2f81986" }),
  Object.freeze({ id: "PRC-CRL-2020-ARTICLE-22", publicationId: PUBLICATION_LOCKS[0].publicationId, occurrences: 1, characters: 33, bytes: 97, sha256: "09cfb29f66b05e05a2a1d4bb92f28e3c9f03dc8c2980ae7478d709b7166540bc" }),
  Object.freeze({ id: "PRC-CRL-2020-ARTICLE-23", publicationId: PUBLICATION_LOCKS[0].publicationId, occurrences: 2, characters: 382, bytes: 1_092, sha256: "d9e57d2c9b8a9de204b93f37c6db7163e6d916c3df115876bcb7b8610c86ce33" }),
  Object.freeze({ id: "PRC-CRL-2020-ARTICLE-59", publicationId: PUBLICATION_LOCKS[0].publicationId, occurrences: 1, characters: 167, bytes: 497, sha256: "9cd94af4f7bb3fba82ab593352baaf601b22a7c31bf8d27aed5a1c1a7c0968f8" })
]);

const EFFECTIVE_DATE_LOCK = Object.freeze({
  id: "PRC-CRL-2020-AMENDMENT-EFFECTIVE-DATE",
  publicationId: PUBLICATION_LOCKS[1].publicationId,
  occurrenceCount: 1,
  effectiveDate: "2021-06-01",
  characters: 17,
  bytes: 39,
  sha256: "85aa3aa30011c60915cf46ee0dba5b38172d690c70c1bddff7a0cdfc4ab64cd4"
});

const CANDIDATE_LINK_LOCKS = Object.freeze([
  Object.freeze({
    rightsCandidateId: "smt-siku-v10-wikisource-r761703-rights-candidate-v1",
    bindingId: "binding:smt-v10:whole-chart",
    sourceId: "smt-siku-v10-wikisource-r761703"
  }),
  Object.freeze({
    rightsCandidateId: "dtt-chanwei-wikisource-r2600158-rights-candidate-v1",
    bindingId: "binding:dtt:month-command",
    sourceId: "dtt-chanwei-wikisource-r2600158"
  }),
  Object.freeze({
    rightsCandidateId: "smt-v5-wikisource-r2706483-rights-candidate-v1",
    bindingId: "binding:smt-v5:relative-relations",
    sourceId: "smt-v5-wikisource-r2706483"
  }),
  Object.freeze({
    rightsCandidateId: "yhzp-wikisource-r2593607-rights-candidate-v1",
    bindingId: "binding:yhzp:hidden-listing",
    sourceId: "yhzp-wikisource-r2593607"
  })
]);

const EXPECTED_BINDING_BOUNDARY = Object.freeze({
  childToParentsOnly: true,
  parentRightsLedgerMutated: false,
  parentSourceLedgerMutated: false,
  parentBacklinkAdded: false,
  bindingReadinessMutated: false,
  formalManifestMutated: false,
  registryMutated: false,
  crossSystemReceiptsMutated: false
});

const EXPECTED_STORAGE_BOUNDARY = Object.freeze({
  remoteResponseBodiesStored: 0,
  lawTextStored: 0,
  exactQuotesStored: 0,
  domSnapshotsStored: 0,
  screenshotsStored: 0,
  carrierFilesStored: 0,
  sourceUrlsStored: 2,
  fragmentDigestsStored: 7,
  credentialsUsed: false,
  loginOrProtectedBackendUsed: false,
  distributionPolicy: "link_only"
});

const EXPECTED_NETWORK_BOUNDARY = Object.freeze({
  operatorRecordedNetworkFacts: true,
  immediateStablePairEndpoints: 2,
  semanticCaptureEndpoints: 2,
  remoteCaptureMechanicallyVerified: false,
  captureExecutionReceiptStored: false,
  operatorRecordedFragmentDigestsMechanicallyVerified: false,
  automaticDecompressionMechanicallyVerified: false,
  requestedToFinalUrlBindingEstablished: false,
  redirectChainCaptured: false,
  wireBytesCaptured: false,
  tlsPeerCertificateCaptured: false,
  futureFreshnessRevalidated: false,
  ncacHostnameObservationCountsAsPublisherAuthentication: false,
  publisherAuthenticityEstablished: false,
  remoteNetworkProvenanceEstablished: false
});

const EXPECTED_RIGHTS_BOUNDARY = Object.freeze({
  operatorRecordedPrcStatutoryRulePageClaim: true,
  operatorRecordedLawVersionAndEffectiveDatePageClaim: true,
  article5AppliedToNcacHtmlCarrier: false,
  statuteApplicabilityToCandidateWorksEstablished: false,
  candidateAuthorIdentityVerified: false,
  candidateAuthorDeathDatesVerified: false,
  jointAuthorshipResolved: false,
  modernAnnotationArrangementRightsResolved: false,
  targetDistributionJurisdictionsSelected: false,
  conflictOfLawsAnalyzed: false,
  humanLegalReviewVerified: false,
  formalSourceRightsRecordsCreated: 0,
  formalSourceCarrierRecordsCreated: 0,
  workLayersCleared: 0,
  editionLayersCleared: 0,
  carrierLayersCleared: 0,
  redistributableSources: 0,
  legalConclusion: "not_established",
  publicRepositoryInclusionAuthorized: false,
  buildInclusionAuthorized: false
});

const EXPECTED_INTEGRITY_BOUNDARY = Object.freeze({
  heldHandleRead: true,
  sameBufferHashAndParse: true,
  basisSameBufferHashAndInspection: true,
  parentsLoadedFromHeldBuffersAndStrictlyVerified: true,
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
  bindingFrozenVerified: 0,
  bindingRequired: 12,
  realIndependentExpertsVerified: 0,
  expertSeatsRequired: 2,
  contentTruthEstablished: false,
  expertTruthEstablished: false,
  rightsLegalConclusionEstablished: false,
  releaseReady: false,
  expertClaimsAuthorized: false,
  publicDeploymentAuthorized: false
});

const EXPECTED_DOES_NOT_ESTABLISH = Object.freeze([
  "remote_publisher_authenticity",
  "candidate_author_identity_or_death_date",
  "candidate_work_jurisdiction_or_conflict_of_laws",
  "statute_application_to_any_candidate",
  "work_edition_or_carrier_clearance",
  "wikisource_or_commons_provenance_clearance",
  "legal_opinion_or_legal_conclusion",
  "formal_source_rights_or_carrier_record",
  "source_body_or_exact_quote",
  "binding_freeze",
  "content_truth",
  "expert_truth",
  "release_readiness",
  "public_release_authorization",
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

export class BaziPrcCopyrightLawPublicEvidenceError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "BaziPrcCopyrightLawPublicEvidenceError";
    Object.defineProperties(this, {
      code: { value: code, enumerable: false, configurable: false, writable: false },
      safeForCli: { value: true, enumerable: false, configurable: false, writable: false }
    });
  }
}

function fail(code, message, cause) {
  throw new BaziPrcCopyrightLawPublicEvidenceError(
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
    if (count > MAX_INPUT_NODES) fail("JSON_TOO_COMPLEX", "C law observation JSON AST 超过节点上限。");
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
  let bytePrototype;
  try {
    bytePrototype = Object.getPrototypeOf(bytes);
  } catch (cause) {
    fail("JSON_BYTES_INVALID", `${label} 的字节原型不可读。`, cause);
  }
  if (!utilTypes.isUint8Array(bytes)
    || (bytePrototype !== Uint8Array.prototype && bytePrototype !== Buffer.prototype)
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
      sourceFilename: "bazi-prc-copyright-law-public-evidence.json",
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
    if (cause instanceof BaziPrcCopyrightLawPublicEvidenceError) throw cause;
    fail("JSON_INVALID", `${label} 不是合法 JSON。`, cause);
  }
}

export function parseBaziPrcCopyrightLawPublicEvidenceJsonBytes(
  bytes,
  label = "八字中国著作权法公开证据观察 child",
  maxBytes = MAX_ARTIFACT_BYTES
) {
  return parseCapturedJson(captureUint8Array(bytes, label, maxBytes), label);
}

function capturePassiveJsonValue(value, state, depth) {
  if (depth > MAX_INPUT_DEPTH) fail("INPUT_DEPTH_EXCEEDED", "C law observation 输入超过最大深度。");
  state.nodes += 1;
  if (state.nodes > MAX_INPUT_NODES) fail("INPUT_NODE_LIMIT_EXCEEDED", "C law observation 输入超过节点上限。");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) fail("INPUT_VALUE_INVALID", "C law observation 输入含无效数值。");
    return value;
  }
  if (typeof value === "string") {
    state.textCharacters += value.length;
    if (state.textCharacters > MAX_INPUT_TEXT) fail("INPUT_TEXT_LIMIT_EXCEEDED", "C law observation 输入超过文本上限。");
    return value;
  }
  if (typeof value !== "object") fail("INPUT_VALUE_INVALID", "C law observation 只接受 JSON 数据值。");
  if (utilTypes.isProxy(value)) fail("INPUT_PROXY_FORBIDDEN", "C law observation 输入不接受 Proxy。");
  if (state.active.has(value)) fail("INPUT_CYCLE_FORBIDDEN", "C law observation 输入不接受循环引用。");
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
      fail("INPUT_OBJECT_UNSAFE", "C law observation 输入不能被安全捕获。", cause);
    }
    const descriptorKeys = Reflect.ownKeys(descriptors);
    if (descriptorKeys.some((key) => typeof key === "symbol")) {
      fail("INPUT_SYMBOL_FORBIDDEN", "C law observation 输入不接受 Symbol 属性。");
    }
    if (array) {
      if (prototype !== Array.prototype) fail("INPUT_PROTOTYPE_INVALID", "C law observation 数组原型无效。");
      const lengthDescriptor = descriptors.length;
      const length = lengthDescriptor?.value;
      if (lengthDescriptor?.get || lengthDescriptor?.set
        || !Number.isSafeInteger(length) || length < 0 || length > MAX_INPUT_NODES) {
        fail("INPUT_ARRAY_INVALID", "C law observation 数组长度无效。");
      }
      const allowedKeys = new Set(["length", ...Array.from({ length }, (_entry, index) => String(index))]);
      if (descriptorKeys.some((key) => !allowedKeys.has(key))) {
        fail("INPUT_ARRAY_INVALID", "C law observation 数组含额外属性。");
      }
      const output = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
          fail("INPUT_ARRAY_INVALID", "C law observation 不接受稀疏数组或访问器元素。");
        }
        output.push(capturePassiveJsonValue(descriptor.value, state, depth + 1));
      }
      return output;
    }
    if (prototype !== Object.prototype) fail("INPUT_PROTOTYPE_INVALID", "C law observation 只接受普通对象。");
    const output = {};
    for (const key of descriptorKeys) {
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
        fail("INPUT_ACCESSOR_FORBIDDEN", "C law observation 不接受访问器或不可枚举字段。");
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
  fail("NON_CANONICAL_JSON", "C law observation 只接受有限规范 JSON 值。");
}

export function canonicalStringifyBaziPrcCopyrightLawPublicEvidence(value) {
  return JSON.stringify(canonicalValue(capturePassiveJsonSnapshot(value)));
}

export function computeBaziPrcCopyrightLawPublicEvidenceDigest(value) {
  const snapshot = capturePassiveJsonSnapshot(value);
  const { observationDigest: _observationDigest, ...unsigned } = snapshot;
  return createHash("sha256")
    .update(canonicalStringifyBaziPrcCopyrightLawPublicEvidence(unsigned), "utf8")
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
  return canonicalStringifyBaziPrcCopyrightLawPublicEvidence(left)
    === canonicalStringifyBaziPrcCopyrightLawPublicEvidence(right);
}

function verifyBoundary(actual, expected, label, code) {
  assertExactKeys(actual, Object.keys(expected), label);
  if (!exactJson(actual, expected)) fail(code, `${label} 发生越权或漂移。`);
}

function canonicalUtc(value, label) {
  if (typeof value !== "string" || !UTC_PATTERN.test(value)) fail("CAPTURE_TIME_INVALID", `${label} 不是 canonical UTC。`);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) fail("CAPTURE_TIME_INVALID", `${label} 不是 canonical UTC。`);
  return parsed.getTime();
}

function validatePublicUrl(value, expected) {
  if (typeof value !== "string" || value.length > 512) fail("SOURCE_URL_INVALID", "公开来源 URL 无效。");
  let parsed;
  try {
    parsed = new URL(value);
  } catch (cause) {
    fail("SOURCE_URL_INVALID", "公开来源 URL 不能解析。", cause);
  }
  if (parsed.protocol !== "https:" || parsed.hostname !== "www.ncac.gov.cn" || parsed.port
    || parsed.username || parsed.password || parsed.hash || parsed.search || parsed.href !== value
    || value !== expected) {
    fail("SOURCE_URL_INVALID", "公开来源 URL 必须是固定国家版权局无凭据 HTTPS literal。");
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
}

const TRANSPORT_KEYS = Object.freeze([
  "ordinal", "startedAt", "completedAt", "httpStatus", "finalUrl", "redirected",
  "contentType", "contentEncoding", "deliveredDecodedBodyBytes", "deliveredDecodedBodySha256"
]);

function verifyTransportRead(read, label, ordinal, lock) {
  assertExactKeys(read, TRANSPORT_KEYS, label);
  const started = canonicalUtc(read.startedAt, `${label}.startedAt`);
  const completed = canonicalUtc(read.completedAt, `${label}.completedAt`);
  if (started > completed || read.ordinal !== ordinal || read.httpStatus !== 200
    || read.finalUrl !== lock.requestedUrl || read.redirected !== false
    || read.contentType !== "text/html" || read.contentEncoding !== null
    || read.deliveredDecodedBodyBytes !== lock.deliveredDecodedBodyBytes
    || read.deliveredDecodedBodySha256 !== lock.deliveredDecodedBodySha256) {
    fail("TRANSPORT_OBSERVATION_INVALID", `${label} 的操作员传输观察无效或发生晋级。`);
  }
  return { started, completed };
}

const PUBLICATION_KEYS = Object.freeze([
  "publicationId", "sourceUpstreamGroupId", "requestedUrl", "publicationRole",
  "operatorRecordedPublisherLabel", "immediateTransportReads", "immediatePairStableOperatorRecorded",
  "semanticCapture", "operatorRecordedSummary", "requestedUrlNcacHostnameObserved",
  "publisherAuthenticityEstablished"
]);

function verifyOfficialPublications(publications) {
  if (!Array.isArray(publications) || publications.length !== PUBLICATION_LOCKS.length) {
    fail("PUBLICATION_CATALOG_MISMATCH", "官方公开页面目录数量不匹配。");
  }
  const seen = new Set();
  for (let index = 0; index < PUBLICATION_LOCKS.length; index += 1) {
    const publication = publications[index];
    const lock = PUBLICATION_LOCKS[index];
    assertExactKeys(publication, PUBLICATION_KEYS, `operatorRecordedPublications[${index}]`);
    if (seen.has(publication.publicationId)) fail("PUBLICATION_DUPLICATE", "官方公开页面 ID 重复。");
    seen.add(publication.publicationId);
    validatePublicUrl(publication.requestedUrl, lock.requestedUrl);
    if (publication.publicationId !== lock.publicationId
      || publication.sourceUpstreamGroupId !== "PRC_NCAC_COPYRIGHT_LAW_2020_PUBLICATION_FAMILY"
      || publication.publicationRole !== lock.publicationRole
      || publication.operatorRecordedPublisherLabel !== "中华人民共和国国家版权局"
      || publication.immediatePairStableOperatorRecorded !== true
      || typeof publication.operatorRecordedSummary !== "string" || publication.operatorRecordedSummary.length === 0
      || publication.requestedUrlNcacHostnameObserved !== true
      || publication.publisherAuthenticityEstablished !== false
      || !Array.isArray(publication.immediateTransportReads)
      || publication.immediateTransportReads.length !== 2) {
      fail("PUBLICATION_CATALOG_MISMATCH", "操作员页面目录或非权威边界不匹配。");
    }
    const first = verifyTransportRead(publication.immediateTransportReads[0], `operatorRecordedPublications[${index}].immediateTransportReads[0]`, 1, lock);
    const second = verifyTransportRead(publication.immediateTransportReads[1], `operatorRecordedPublications[${index}].immediateTransportReads[1]`, 2, lock);
    const semantic = verifyTransportRead({ ordinal: 3, ...publication.semanticCapture }, `operatorRecordedPublications[${index}].semanticCapture`, 3, lock);
    if (first.completed > second.started || second.completed > semantic.started) {
      fail("CAPTURE_ORDER_INVALID", "官方公开页面 pair／semantic capture 时间顺序无效。");
    }
  }
}

const FRAGMENT_KEYS = Object.freeze([
  "provisionEvidenceId", "publicationId", "provisionLabel", "selectionRule", "sectionAnchor",
  "startMarker", "endMarker", "startOccurrencesInNormalizedBody", "normalizedCharacters",
  "utf8Bytes", "normalizedTextSha256", "operatorRecordedSummary", "exactTextStored",
  "humanLegalInterpretationVerified"
]);

function verifySemanticEvidence(semantic) {
  assertExactKeys(semantic, [
    "normalization", "lawProvisionFragments", "amendmentEffectiveDateEvidence",
    "operatorRecordedFragmentDigests", "fragmentDigestExecutionReceiptStored",
    "semanticSummaryMechanicallyVerified"
  ], "semanticEvidence");
  if (semantic.normalization !== "jsdom_body_text_nbsp_to_ascii_space_ecmascript_whitespace_collapse_trim_v1"
    || semantic.operatorRecordedFragmentDigests !== true
    || semantic.fragmentDigestExecutionReceiptStored !== false
    || semantic.semanticSummaryMechanicallyVerified !== false
    || !Array.isArray(semantic.lawProvisionFragments)
    || semantic.lawProvisionFragments.length !== FRAGMENT_LOCKS.length) {
    fail("SEMANTIC_EVIDENCE_INVALID", "法条片段观察边界无效。");
  }
  const seen = new Set();
  for (let index = 0; index < FRAGMENT_LOCKS.length; index += 1) {
    const fragment = semantic.lawProvisionFragments[index];
    const lock = FRAGMENT_LOCKS[index];
    assertExactKeys(fragment, FRAGMENT_KEYS, `semanticEvidence.lawProvisionFragments[${index}]`);
    if (seen.has(fragment.provisionEvidenceId)) fail("FRAGMENT_DUPLICATE", "法条片段证据 ID 重复。");
    seen.add(fragment.provisionEvidenceId);
    if (fragment.provisionEvidenceId !== lock.id || fragment.publicationId !== lock.publicationId
      || fragment.startOccurrencesInNormalizedBody !== lock.occurrences
      || fragment.normalizedCharacters !== lock.characters || fragment.utf8Bytes !== lock.bytes
      || fragment.normalizedTextSha256 !== lock.sha256
      || typeof fragment.provisionLabel !== "string" || fragment.provisionLabel.length === 0
      || typeof fragment.selectionRule !== "string" || fragment.selectionRule.length === 0
      || typeof fragment.startMarker !== "string" || fragment.startMarker.length === 0
      || typeof fragment.endMarker !== "string" || fragment.endMarker.length === 0
      || typeof fragment.operatorRecordedSummary !== "string" || fragment.operatorRecordedSummary.length === 0
      || fragment.exactTextStored !== false || fragment.humanLegalInterpretationVerified !== false) {
      fail("FRAGMENT_CATALOG_MISMATCH", "法条片段身份或非权威边界不匹配。");
    }
  }
  const effective = semantic.amendmentEffectiveDateEvidence;
  assertExactKeys(effective, [
    "provisionEvidenceId", "publicationId", "selectionRule", "occurrenceCount",
    "effectiveDateOperatorRecorded", "normalizedCharacters", "utf8Bytes",
    "normalizedTextSha256", "exactTextStored", "humanLegalInterpretationVerified"
  ], "semanticEvidence.amendmentEffectiveDateEvidence");
  if (effective.provisionEvidenceId !== EFFECTIVE_DATE_LOCK.id
    || effective.publicationId !== EFFECTIVE_DATE_LOCK.publicationId
    || effective.occurrenceCount !== EFFECTIVE_DATE_LOCK.occurrenceCount
    || effective.effectiveDateOperatorRecorded !== EFFECTIVE_DATE_LOCK.effectiveDate
    || effective.normalizedCharacters !== EFFECTIVE_DATE_LOCK.characters
    || effective.utf8Bytes !== EFFECTIVE_DATE_LOCK.bytes
    || effective.normalizedTextSha256 !== EFFECTIVE_DATE_LOCK.sha256
    || effective.selectionRule !== "exact_literal_unique_in_normalized_body"
    || effective.exactTextStored !== false || effective.humanLegalInterpretationVerified !== false) {
    fail("EFFECTIVE_DATE_EVIDENCE_MISMATCH", "施行日期片段身份或非权威边界不匹配。");
  }
}

const CANDIDATE_LINK_KEYS = Object.freeze([
  "rightsCandidateId", "bindingId", "sourceId", "ruleEvidenceIds", "ruleObservationOnlyNotApplied",
  "candidateAuthorIdentityAndDeathFactsVerified", "candidateWorkJurisdictionAssessmentCompleted",
  "modernEditionContributionRightsResolved", "workLayerCleared", "editionLayerCleared",
  "carrierLayerCleared"
]);

const EXPECTED_RULE_IDS = Object.freeze(FRAGMENT_LOCKS.slice(1).map((entry) => entry.id));

function verifyCandidateRuleLinks(links) {
  if (!Array.isArray(links) || links.length !== EXPECTED_RIGHTS_PARENT.rightsCandidateIds.length) {
    fail("CANDIDATE_LINK_CATALOG_MISMATCH", "候选规则链接数量不匹配。");
  }
  const seen = new Set();
  for (let index = 0; index < links.length; index += 1) {
    const link = links[index];
    const lock = CANDIDATE_LINK_LOCKS[index];
    assertExactKeys(link, CANDIDATE_LINK_KEYS, `candidateRuleLinks[${index}]`);
    if (seen.has(link.rightsCandidateId)) fail("CANDIDATE_LINK_DUPLICATE", "候选规则链接重复。");
    seen.add(link.rightsCandidateId);
    if (link.rightsCandidateId !== lock.rightsCandidateId
      || link.bindingId !== lock.bindingId || link.sourceId !== lock.sourceId
      || !exactJson(link.ruleEvidenceIds, EXPECTED_RULE_IDS)
      || link.ruleObservationOnlyNotApplied !== true
      || link.candidateAuthorIdentityAndDeathFactsVerified !== false
      || link.candidateWorkJurisdictionAssessmentCompleted !== false
      || link.modernEditionContributionRightsResolved !== false
      || link.workLayerCleared !== false || link.editionLayerCleared !== false
      || link.carrierLayerCleared !== false) {
      fail("CANDIDATE_RULE_APPLICATION_FORBIDDEN", "一般规则观察不得晋级为候选适用或三层核清。");
    }
  }
}

function verifyCandidateParentBindings(links, rightsLedger) {
  for (let index = 0; index < CANDIDATE_LINK_LOCKS.length; index += 1) {
    const lock = CANDIDATE_LINK_LOCKS[index];
    const parentCandidate = rightsLedger.candidates.find(
      (entry) => entry.rightsCandidateId === lock.rightsCandidateId
    );
    if (!parentCandidate || links[index].rightsCandidateId !== parentCandidate.rightsCandidateId
      || links[index].bindingId !== parentCandidate.bindingId
      || links[index].sourceId !== parentCandidate.sourceId) {
      fail("CANDIDATE_PARENT_BINDING_MISMATCH", "候选规则观察与严格父权利账映射不一致。");
    }
  }
}

export function verifyBaziPrcCopyrightLawPublicEvidenceArtifact(input) {
  const observation = capturePassiveJsonSnapshot(input);
  assertExactKeys(observation, [
    "schemaVersion", "recordType", "observationId", "status", "observedDate", "releaseGovernance",
    "parentSourceRightsLedger", "parentSourceBindingLedger", "basisArtifact",
    "operatorRecordedPublisherPageGroupPolicy", "operatorRecordedPublisherPageGroups",
    "operatorRecordedPublications", "semanticEvidence",
    "candidateRuleLinks", "bindingBoundary", "storageBoundary", "networkObservationBoundary",
    "rightsBoundary", "integrityBoundary", "authorityBoundary", "doesNotEstablish", "observationDigest"
  ], "observation");
  if (observation.schemaVersion !== "1.0.0"
    || observation.recordType !== "bazi_prc_copyright_law_public_evidence_observation_v1"
    || observation.observationId !== OBSERVATION_ID
    || observation.status !== "link_only_operator_recorded_ncac_page_claims_non_adjudicative_not_formal_rights_record"
    || observation.observedDate !== "2026-08-29" || !DATE_PATTERN.test(observation.observedDate)) {
    fail("OBSERVATION_IDENTITY_INVALID", "C law observation 根身份无效。");
  }
  verifyBoundary(observation.releaseGovernance, RELEASE_GOVERNANCE, "releaseGovernance", "RELEASE_GOVERNANCE_DRIFT");
  verifyBoundary(observation.parentSourceRightsLedger, EXPECTED_RIGHTS_PARENT, "parentSourceRightsLedger", "PARENT_BINDING_MISMATCH");
  verifyBoundary(observation.parentSourceBindingLedger, EXPECTED_SOURCE_PARENT, "parentSourceBindingLedger", "PARENT_BINDING_MISMATCH");
  verifyBoundary(observation.basisArtifact, BASIS_IDENTITY, "basisArtifact", "BASIS_BINDING_MISMATCH");
  verifyBoundary(observation.operatorRecordedPublisherPageGroupPolicy, {
    deduplicationKey: "sourceUpstreamGroupId",
    samePublisherPageGroupCountsOnce: true,
    operatorRecordedPublicationCount: 2,
    deduplicatedPublisherPageGroupCount: 1
  }, "operatorRecordedPublisherPageGroupPolicy", "AUTHORITY_GROUP_POLICY_INVALID");
  if (!Array.isArray(observation.operatorRecordedPublisherPageGroups)
    || observation.operatorRecordedPublisherPageGroups.length !== 1) {
    fail("AUTHORITY_GROUP_CATALOG_MISMATCH", "法律发布族必须精确为一个。");
  }
  verifyBoundary(observation.operatorRecordedPublisherPageGroups[0], {
    sourceUpstreamGroupId: "PRC_NCAC_COPYRIGHT_LAW_2020_PUBLICATION_FAMILY",
    operatorRecordedPublisherLabel: "中华人民共和国国家版权局",
    publicationIds: PUBLICATION_LOCKS.map((entry) => entry.publicationId)
  }, "operatorRecordedPublisherPageGroups[0]", "AUTHORITY_GROUP_CATALOG_MISMATCH");
  verifyOfficialPublications(observation.operatorRecordedPublications);
  verifySemanticEvidence(observation.semanticEvidence);
  verifyCandidateRuleLinks(observation.candidateRuleLinks);
  verifyBoundary(observation.bindingBoundary, EXPECTED_BINDING_BOUNDARY, "bindingBoundary", "BINDING_PROMOTION_FORBIDDEN");
  verifyBoundary(observation.storageBoundary, EXPECTED_STORAGE_BOUNDARY, "storageBoundary", "STORAGE_PROMOTION_FORBIDDEN");
  verifyBoundary(observation.networkObservationBoundary, EXPECTED_NETWORK_BOUNDARY, "networkObservationBoundary", "NETWORK_PROMOTION_FORBIDDEN");
  verifyBoundary(observation.rightsBoundary, EXPECTED_RIGHTS_BOUNDARY, "rightsBoundary", "RIGHTS_PROMOTION_FORBIDDEN");
  verifyBoundary(observation.integrityBoundary, EXPECTED_INTEGRITY_BOUNDARY, "integrityBoundary", "INTEGRITY_CLAIM_INVALID");
  verifyBoundary(observation.authorityBoundary, EXPECTED_AUTHORITY_BOUNDARY, "authorityBoundary", "AUTHORITY_PROMOTION_FORBIDDEN");
  if (!exactJson(observation.doesNotEstablish, EXPECTED_DOES_NOT_ESTABLISH)) {
    fail("DOES_NOT_ESTABLISH_MISMATCH", "C law observation 负向边界目录不匹配。");
  }
  if (typeof observation.observationDigest !== "string" || !SHA256_PATTERN.test(observation.observationDigest)) {
    fail("OBSERVATION_DIGEST_INVALID", "observationDigest 必须是小写 SHA-256。");
  }
  const computed = computeBaziPrcCopyrightLawPublicEvidenceDigest(observation);
  if (computed !== observation.observationDigest) {
    fail("OBSERVATION_DIGEST_MISMATCH", "C law observation canonical digest 不一致。");
  }
  if (observation.observationDigest !== EXPECTED_OBSERVATION_DIGEST) {
    fail("OBSERVATION_SELF_RESEAL_FORBIDDEN", "C law observation 不接受自重签后的目录或边界变化。");
  }
  return deepFreezeJson(observation);
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
    fail("ARTIFACT_PATH_INVALID", "C law observation 路径必须是仓内规范相对路径。");
  }
  const parts = relativePath.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) {
    fail("ARTIFACT_PATH_INVALID", "C law observation 路径不得为空、绝对或逃逸。");
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
      fail("DIRECTORY_CHAIN_INVALID", "C law observation 目录链不可安全读取。", cause);
    }
    if (metadata.isSymbolicLink() || !metadata.isDirectory()
      || normalizePathIdentity(resolved) !== normalizePathIdentity(cursor)) {
      fail("DIRECTORY_CHAIN_INVALID", "C law observation 目录链包含链接、别名或非目录端点。");
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
      fail("ENDPOINT_CHANGED", "C law observation 读取期间目录链发生变化。", cause);
    }
    if (metadata.isSymbolicLink() || !metadata.isDirectory()
      || !sameEndpoint(snapshot.metadata, metadata)
      || normalizePathIdentity(resolved) !== normalizePathIdentity(snapshot.resolved)) {
      fail("ENDPOINT_CHANGED", "C law observation 读取期间目录链发生变化。");
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
  if (offset > maxBytes) fail("FILE_SIZE_INVALID", "C law observation 文件在读取时超过上限。");
  return buffer.subarray(0, offset);
}

async function callTestHook(testHooks, phase, payload) {
  if (typeof testHooks?.[phase] === "function") await testHooks[phase](payload);
}

async function readStableWorkspaceFile(workspaceRootInput, relativePath, maxBytes, testHooks = undefined) {
  const parts = validateRelativePath(relativePath);
  const requestedRoot = path.resolve(workspaceRootInput);
  const directoryChain = await captureDirectoryChain(requestedRoot, parts.slice(0, -1));
  const root = directoryChain[0].resolved;
  const absolutePath = path.resolve(root, ...parts);
  if (!insideRoot(root, absolutePath) || normalizePathIdentity(root) !== normalizePathIdentity(requestedRoot)) {
    fail("ARTIFACT_PATH_INVALID", "C law observation 路径越出工作区或 root 为别名。");
  }
  let beforePath;
  let resolved;
  try {
    [beforePath, resolved] = await Promise.all([
      lstat(absolutePath, { bigint: true }),
      realpath(absolutePath)
    ]);
  } catch (cause) {
    fail("FILE_UNAVAILABLE", "C law observation 文件不可读。", cause);
  }
  if (beforePath.isSymbolicLink() || !beforePath.isFile()
    || normalizePathIdentity(resolved) !== normalizePathIdentity(absolutePath)) {
    fail("SYMLINK_REJECTED", "C law observation 文件拒绝符号链接或路径别名。");
  }
  if (beforePath.nlink !== 1n) fail("HARDLINK_REJECTED", "C law observation 文件必须是单链接普通文件。");
  if (beforePath.size <= 0n || beforePath.size > BigInt(maxBytes)) {
    fail("FILE_SIZE_INVALID", "C law observation 文件为空或超限。");
  }
  const noFollow = typeof fsConstants.O_NOFOLLOW === "number" ? fsConstants.O_NOFOLLOW : 0;
  let handle;
  try {
    handle = await open(absolutePath, fsConstants.O_RDONLY | noFollow);
  } catch (cause) {
    fail("FILE_UNAVAILABLE", "C law observation held handle 打开失败。", cause);
  }
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || before.nlink !== 1n || !sameEndpoint(beforePath, before)) {
      fail("ENDPOINT_CHANGED", "C law observation 文件在 held handle 打开前变化。");
    }
    await callTestHook(testHooks, "afterOpenBeforeRead", Object.freeze({ absolutePath, handle, relativePath }));
    const readBytes = await readBoundedHandle(handle, maxBytes);
    await callTestHook(testHooks, "afterBytesRead", Object.freeze({ absolutePath, handle, relativePath, readBytes }));
    const after = await handle.stat({ bigint: true });
    let afterPath;
    let afterResolved;
    try {
      [afterPath, afterResolved] = await Promise.all([
        lstat(absolutePath, { bigint: true }),
        realpath(absolutePath)
      ]);
    } catch (cause) {
      fail("ENDPOINT_CHANGED", "C law observation 文件读取期间路径端点变化。", cause);
    }
    if (afterPath.isSymbolicLink() || !afterPath.isFile() || afterPath.nlink !== 1n
      || !sameEndpoint(before, after) || !sameEndpoint(after, afterPath)
      || BigInt(readBytes.byteLength) !== after.size
      || normalizePathIdentity(afterResolved) !== normalizePathIdentity(absolutePath)) {
      fail("ENDPOINT_CHANGED", "C law observation 文件读取期间端点变化。");
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

function assertRawIdentity(snapshot, expected, code, label) {
  if (snapshot.rawBytes !== expected.rawBytes || snapshot.rawSha256 !== expected.rawSha256) {
    fail(code, `${label} 与固定 raw bytes/SHA-256 不一致。`);
  }
}

function publicArtifactIdentity(snapshot) {
  return Object.freeze({
    path: snapshot.path,
    rawBytes: snapshot.rawBytes,
    rawSha256: snapshot.rawSha256
  });
}

function inspectBasisBytes(bytes) {
  if (bytes.byteLength >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail("BASIS_INVALID", "C law observation basis 不得包含 UTF-8 BOM。");
  }
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (cause) {
    fail("BASIS_INVALID", "C law observation basis 不是严格 UTF-8。", cause);
  }
  const requiredMarkers = [
    "# 阶段 C：国家版权局页面标签公开证据观察 child",
    PUBLICATION_LOCKS[0].requestedUrl,
    PUBLICATION_LOCKS[1].requestedUrl,
    ...EXPECTED_RIGHTS_PARENT.rightsCandidateIds,
    "remoteCaptureMechanicallyVerified=false",
    "legalConclusion=not_established",
    "bindingFrozenVerified=0/12",
    "现实专家 `0/2`",
    "legacy-v13 / targetSchema 13 / migrationId null"
  ];
  if (requiredMarkers.some((marker) => !source.includes(marker))) {
    fail("BASIS_INVALID", "C law observation basis 缺少本批次固定标记。");
  }
}

async function readObservationArtifact(workspaceRoot, testHooks = undefined) {
  const snapshot = await readStableWorkspaceFile(
    workspaceRoot,
    BAZI_PRC_COPYRIGHT_LAW_PUBLIC_EVIDENCE_RELATIVE_PATH,
    MAX_ARTIFACT_BYTES,
    testHooks
  );
  assertRawIdentity(snapshot, OBSERVATION_RAW_IDENTITY, "ARTIFACT_DRIFT", "C law observation child");
  return Object.freeze({
    observation: parseCapturedJson(snapshot.bytes, "C law observation child"),
    artifact: publicArtifactIdentity(snapshot)
  });
}

async function readAndVerifyParents(workspaceRoot, testHooksByPath = undefined) {
  const sourceSnapshot = await readStableWorkspaceFile(
    workspaceRoot,
    EXPECTED_SOURCE_PARENT.path,
    MAX_PARENT_BYTES,
    testHooksByPath?.[EXPECTED_SOURCE_PARENT.path]
  );
  assertRawIdentity(sourceSnapshot, EXPECTED_SOURCE_PARENT, "SOURCE_PARENT_DRIFT", "父来源候选账");
  const sourceLedger = parseCapturedJson(sourceSnapshot.bytes, "父来源候选账");
  try {
    verifyBaziSourceBindingCandidateLedger(sourceLedger);
  } catch (cause) {
    fail("SOURCE_PARENT_INVALID", "父来源候选账未通过严格验证。", cause);
  }
  if (sourceLedger.ledgerId !== EXPECTED_SOURCE_PARENT.ledgerId
    || sourceLedger.ledgerDigest !== EXPECTED_SOURCE_PARENT.ledgerDigest
    || sourceLedger.candidates.length !== EXPECTED_SOURCE_PARENT.candidateCount) {
    fail("SOURCE_PARENT_DRIFT", "父来源候选账语义身份漂移。");
  }

  const rightsSnapshot = await readStableWorkspaceFile(
    workspaceRoot,
    EXPECTED_RIGHTS_PARENT.path,
    MAX_PARENT_BYTES,
    testHooksByPath?.[EXPECTED_RIGHTS_PARENT.path]
  );
  assertRawIdentity(rightsSnapshot, EXPECTED_RIGHTS_PARENT, "RIGHTS_PARENT_DRIFT", "父权利候选账");
  const rightsLedger = parseCapturedJson(rightsSnapshot.bytes, "父权利候选账");
  try {
    verifyBaziSourceRightsCandidateLedger(rightsLedger, sourceLedger);
  } catch (cause) {
    fail("RIGHTS_PARENT_INVALID", "父权利候选账未通过严格验证。", cause);
  }
  if (rightsLedger.ledgerId !== EXPECTED_RIGHTS_PARENT.ledgerId
    || rightsLedger.ledgerDigest !== EXPECTED_RIGHTS_PARENT.ledgerDigest
    || !exactJson(rightsLedger.candidates.map((entry) => entry.rightsCandidateId), EXPECTED_RIGHTS_PARENT.rightsCandidateIds)) {
    fail("RIGHTS_PARENT_DRIFT", "父权利候选账语义身份漂移。");
  }
  return Object.freeze({
    sourceLedger,
    rightsLedger,
    sourceArtifact: publicArtifactIdentity(sourceSnapshot),
    rightsArtifact: publicArtifactIdentity(rightsSnapshot)
  });
}

async function buildVerifiedResult(workspaceRoot, persistedRead, callerInput = undefined, testHooksByPath = undefined) {
  const parents = await readAndVerifyParents(workspaceRoot, testHooksByPath);
  const persisted = verifyBaziPrcCopyrightLawPublicEvidenceArtifact(persistedRead.observation);
  verifyCandidateParentBindings(persisted.candidateRuleLinks, parents.rightsLedger);
  if (callerInput !== undefined) {
    const caller = verifyBaziPrcCopyrightLawPublicEvidenceArtifact(callerInput);
    if (!exactJson(caller, persisted)) {
      fail("CALLER_PERSISTED_MISMATCH", "调用方输入与持久化 C law observation child 不一致。");
    }
  }
  const basisSnapshot = await readStableWorkspaceFile(
    workspaceRoot,
    BASIS_RELATIVE_PATH,
    MAX_BASIS_BYTES,
    testHooksByPath?.[BASIS_RELATIVE_PATH]
  );
  assertRawIdentity(basisSnapshot, BASIS_IDENTITY, "BASIS_DRIFT", "C law observation basis");
  inspectBasisBytes(basisSnapshot.bytes);
  const result = deepFreezeJson({
    offlineOperatorRecordedLinkHashObservationMechanicallyVerified: true,
    status: persisted.status,
    observationId: persisted.observationId,
    observationDigest: persisted.observationDigest,
    activeLine: persisted.releaseGovernance.activeLine,
    targetSchema: persisted.releaseGovernance.targetSchema,
    migrationId: persisted.releaseGovernance.migrationId,
    operatorRecordedPublications: persisted.operatorRecordedPublications.length,
    deduplicatedPublisherPageGroups: persisted.operatorRecordedPublisherPageGroups.length,
    candidateRuleLinks: persisted.candidateRuleLinks.length,
    formalSourceRightsRecordsCreated: persisted.rightsBoundary.formalSourceRightsRecordsCreated,
    formalSourceCarrierRecordsCreated: persisted.rightsBoundary.formalSourceCarrierRecordsCreated,
    bindingFrozenVerified: persisted.authorityBoundary.bindingFrozenVerified,
    bindingRequired: persisted.authorityBoundary.bindingRequired,
    realIndependentExpertsVerified: persisted.authorityBoundary.realIndependentExpertsVerified,
    expertSeatsRequired: persisted.authorityBoundary.expertSeatsRequired,
    remoteCaptureMechanicallyVerified: persisted.networkObservationBoundary.remoteCaptureMechanicallyVerified,
    publisherAuthenticityEstablished: persisted.networkObservationBoundary.publisherAuthenticityEstablished,
    statuteApplicabilityToCandidateWorksEstablished:
      persisted.rightsBoundary.statuteApplicabilityToCandidateWorksEstablished,
    legalConclusion: persisted.rightsBoundary.legalConclusion,
    contentTruthEstablished: persisted.authorityBoundary.contentTruthEstablished,
    expertTruthEstablished: persisted.authorityBoundary.expertTruthEstablished,
    releaseReady: persisted.authorityBoundary.releaseReady,
    expertClaimsAuthorized: persisted.authorityBoundary.expertClaimsAuthorized,
    publicDeploymentAuthorized: persisted.authorityBoundary.publicDeploymentAuthorized,
    observationArtifact: persistedRead.artifact,
    sourceParentArtifact: parents.sourceArtifact,
    rightsParentArtifact: parents.rightsArtifact,
    basisArtifact: publicArtifactIdentity(basisSnapshot),
    observation: persisted
  });
  VERIFIED_RESULTS.add(result);
  return result;
}

export async function readBaziPrcCopyrightLawPublicEvidence(workspaceRoot = process.cwd()) {
  const persistedRead = await readObservationArtifact(workspaceRoot);
  return verifyBaziPrcCopyrightLawPublicEvidenceArtifact(persistedRead.observation);
}

export async function loadBaziPrcCopyrightLawPublicEvidence(workspaceRoot = process.cwd()) {
  const persistedRead = await readObservationArtifact(workspaceRoot);
  return buildVerifiedResult(workspaceRoot, persistedRead);
}

export async function verifyBaziPrcCopyrightLawPublicEvidence(
  workspaceRoot = process.cwd(),
  callerInput
) {
  const persistedRead = await readObservationArtifact(workspaceRoot);
  return buildVerifiedResult(workspaceRoot, persistedRead, callerInput);
}

export function isVerifiedBaziPrcCopyrightLawPublicEvidence(value) {
  return Boolean(value && typeof value === "object" && VERIFIED_RESULTS.has(value));
}

export const baziPrcCopyrightLawPublicEvidenceTestOnly = Object.freeze({
  OBSERVATION_RAW_IDENTITY,
  BASIS_IDENTITY,
  EXPECTED_SOURCE_PARENT,
  EXPECTED_RIGHTS_PARENT,
  EXPECTED_OBSERVATION_DIGEST,
  readBoundedHandle,
  readObservationArtifact,
  readStableWorkspaceFile,
  async loadWithTestHooks(workspaceRoot, testHooksByPath = {}) {
    const persistedRead = await readObservationArtifact(
      workspaceRoot,
      testHooksByPath[BAZI_PRC_COPYRIGHT_LAW_PUBLIC_EVIDENCE_RELATIVE_PATH]
    );
    return buildVerifiedResult(workspaceRoot, persistedRead, undefined, testHooksByPath);
  }
});
