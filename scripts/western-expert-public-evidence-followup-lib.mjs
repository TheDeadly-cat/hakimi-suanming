import { createHash } from "node:crypto";
import { TextDecoder, types as utilTypes } from "node:util";
import {
  readBaziDttStableWorkspaceArtifact,
  parseBaziDttStrictJsonArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  WESTERN_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_RELATIVE_PATH,
  loadWesternExpertPublicCandidatePrescreen,
  isVerifiedWesternExpertPublicCandidatePrescreen
} from "./western-expert-public-candidate-prescreen-lib.mjs";

export const WESTERN_EXPERT_PUBLIC_EVIDENCE_FOLLOWUP_RELATIVE_PATH =
  "content/system-admission/western-expert-public-evidence-followup.v1.json";

const BASIS_RELATIVE_PATH =
  "docs/阶段D-E-西洋现实专家公开证据跟进-child-v1-2026-08-31.md";
const FOLLOWUP_ID = "hakimi.western.expert-public-evidence-followup/1.0.0";
const STATUS =
  "link_only_same_process_two_read_operator_recorded_public_followup_non_authoritative_not_formal_expert_intake";
const CREATED_AT = "2026-08-31T07:54:09.0436262Z";
const DIGEST_DOMAIN = "hakimi-western-expert-public-evidence-followup-v1\0";
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const MAX_ARTIFACT_BYTES = 1_000_000;

const REFLECT_APPLY = Reflect.apply;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_FIND = Array.prototype.find;
const ARRAY_MAP = Array.prototype.map;
const ARRAY_PUSH = Array.prototype.push;
const ARRAY_SOME = Array.prototype.some;
const ARRAY_SORT = Array.prototype.sort;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_ENTRIES = Object.entries;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_IS = Object.is;
const OBJECT_IS_FROZEN = Object.isFrozen;
const OBJECT_KEYS = Object.keys;
const OBJECT_VALUES = Object.values;
const OBJECT_PROTOTYPE = Object.prototype;
const ARRAY_PROTOTYPE = Array.prototype;
const NUMBER_IS_FINITE = Number.isFinite;
const NUMBER_IS_SAFE_INTEGER = Number.isSafeInteger;
const JSON_STRINGIFY = JSON.stringify;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const NATIVE_STRING = String;
const STRING_INCLUDES = String.prototype.includes;
const REGEXP_EXEC = RegExp.prototype.exec;
const NATIVE_SET = Set;
const SET_ADD = Set.prototype.add;
const SET_HAS = Set.prototype.has;
const NATIVE_WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_DELETE = WeakSet.prototype.delete;
const WEAK_SET_HAS = WeakSet.prototype.has;
const IS_PROXY = utilTypes.isProxy;
const IS_UINT8_ARRAY = utilTypes.isUint8Array;
const IS_SHARED_ARRAY_BUFFER = utilTypes.isSharedArrayBuffer;
const IS_ARRAY_BUFFER = utilTypes.isArrayBuffer;
const NATIVE_TEXT_DECODER = TextDecoder;
const TEXT_DECODER_DECODE = TextDecoder.prototype.decode;
const NATIVE_UINT8_ARRAY = Uint8Array;
const NATIVE_ARRAY_BUFFER = ArrayBuffer;
const TYPED_ARRAY_PROTOTYPE = OBJECT_GET_PROTOTYPE_OF(NATIVE_UINT8_ARRAY.prototype);
const TYPED_ARRAY_BUFFER_GETTER = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(TYPED_ARRAY_PROTOTYPE, "buffer")?.get;
const TYPED_ARRAY_BYTE_OFFSET_GETTER = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(TYPED_ARRAY_PROTOTYPE, "byteOffset")?.get;
const TYPED_ARRAY_BYTE_LENGTH_GETTER = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(TYPED_ARRAY_PROTOTYPE, "byteLength")?.get;
const ARRAY_BUFFER_RESIZABLE_GETTER = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(NATIVE_ARRAY_BUFFER.prototype, "resizable")?.get;
const UINT8_ARRAY_SET = NATIVE_UINT8_ARRAY.prototype.set;
const HASH_PROTOTYPE = OBJECT_GET_PROTOTYPE_OF(createHash("sha256"));
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const PROCESS_OBJECT = process;
const PROCESS_CWD = process.cwd;
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

const EXPECTED_PERSISTED_RAW = OBJECT_FREEZE({
  rawBytes: 13_937,
  rawSha256: "32deead24ee4a0e3727000b9ebbcd38069de7cb1957fd4fdc0961049bc5dd5d3"
});

const BASIS_ARTIFACT = OBJECT_FREEZE({
  path: BASIS_RELATIVE_PATH,
  role: "non_authoritative_link_only_public_followup_narrative_basis",
  rawBytes: 4_675,
  rawSha256: "5d89011599e14aa4aa2a03e7f7e5f556c11c890117f05d174fc6c32118f710d4"
});

const PARENT_ARTIFACT = OBJECT_FREEZE({
  path: WESTERN_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_RELATIVE_PATH,
  rawBytes: 29_938,
  rawSha256: "5b98910325b953cbd29af3d194dbd31588ebc03e64319234088d17dfdca31ea8",
  ledgerId: "hakimi.western.expert-public-candidate-prescreen/1.0.0",
  ledgerDigest: "7c573831d6af8904192e069298a1b91c0d9c5b9635753aeb56250d21bf204880",
  candidateLeadIds: OBJECT_FREEZE(["western-public-lead-003"]),
  sourceObservationIds: OBJECT_FREEZE([
    "SCOFIELD-PAA-BOARD",
    "SCOFIELD-PAA-CERTIFIED"
  ]),
  sourceUpstreamGroupIds: OBJECT_FREEZE(["PAA_NCGR"])
});

const REVIEW_QUESTION_IDS = OBJECT_FREEZE([
  "technical-time-coordinate-astronomy",
  "zodiac-house-node-aspect",
  "dignity-retrograde-transit-progression",
  "interpretation-high-risk-boundary",
  "source-rights-role-boundary",
  "uncertainty-counterexamples-abstention"
]);

const FORMAL_CONTEXT_PATHS = OBJECT_FREEZE([
  WESTERN_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_RELATIVE_PATH,
  "content/system-admission/western-source-binding-requirements.v1.json",
  "content/domain-release/western-astrology.engineering-draft.v0.1.0.json",
  "content/system-admission/western-independent-productization-version-aware-observation-candidate.v1.0.0.json",
  "content/system-admission/four-system-current-observation-registry.v2.json"
]);

const SOURCE_OBSERVATIONS = OBJECT_FREEZE([
  OBJECT_FREEZE({
    parentSourceObservationId: "SCOFIELD-PAA-BOARD",
    candidateLeadId: "western-public-lead-003",
    requestedUrl: "https://www.astrologersalliance.org/ncgr-paa-board",
    sourceUpstreamGroupId: "PAA_NCGR",
    sourceType: "public_professional_board_page",
    observationWindowStartedAt: "2026-08-31T07:54:04.9600402Z",
    observationWindowEndedAt: "2026-08-31T07:54:08.6777534Z",
    readAttempts: OBJECT_FREEZE([
      OBJECT_FREEZE({
        attemptIndex: 1,
        startedAt: "2026-08-31T07:54:04.9600402Z",
        endedAt: "2026-08-31T07:54:08.4202608Z",
        httpStatusOperatorRecorded: 200,
        finalUrlEqualsRequestedUrlOperatorRecorded: true,
        contentTypeOperatorRecorded: "text/html; charset=UTF-8",
        deliveredBodyBytesOperatorRecorded: 492_253,
        deliveredBodySha256OperatorRecorded:
          "00030e65acb8dbe3ffa61d6194ec56cdc069296bfe95e95bd30a4b3ee311dadb",
        candidateTokenObservedOperatorRecorded: true
      }),
      OBJECT_FREEZE({
        attemptIndex: 2,
        startedAt: "2026-08-31T07:54:08.4424360Z",
        endedAt: "2026-08-31T07:54:08.6777534Z",
        httpStatusOperatorRecorded: 200,
        finalUrlEqualsRequestedUrlOperatorRecorded: true,
        contentTypeOperatorRecorded: "text/html; charset=UTF-8",
        deliveredBodyBytesOperatorRecorded: 492_253,
        deliveredBodySha256OperatorRecorded:
          "00030e65acb8dbe3ffa61d6194ec56cdc069296bfe95e95bd30a4b3ee311dadb",
        candidateTokenObservedOperatorRecorded: true
      })
    ]),
    repeatedReadsCount: 2,
    repeatedReadsStableOperatorRecorded: true,
    supportsFollowupDiscoveryOnly: true,
    authoritative: false
  }),
  OBJECT_FREEZE({
    parentSourceObservationId: "SCOFIELD-PAA-CERTIFIED",
    candidateLeadId: "western-public-lead-003",
    requestedUrl: "https://www.astrologersalliance.org/certified-astrologers-1",
    sourceUpstreamGroupId: "PAA_NCGR",
    sourceType: "public_certified_list_page",
    observationWindowStartedAt: "2026-08-31T07:54:08.7134642Z",
    observationWindowEndedAt: "2026-08-31T07:54:09.0436262Z",
    readAttempts: OBJECT_FREEZE([
      OBJECT_FREEZE({
        attemptIndex: 1,
        startedAt: "2026-08-31T07:54:08.7134642Z",
        endedAt: "2026-08-31T07:54:08.8812750Z",
        httpStatusOperatorRecorded: 200,
        finalUrlEqualsRequestedUrlOperatorRecorded: true,
        contentTypeOperatorRecorded: "text/html; charset=UTF-8",
        deliveredBodyBytesOperatorRecorded: 596_252,
        deliveredBodySha256OperatorRecorded:
          "a33a03958ab0b856f00725cea4691fbaed4dcfd1c90c727a5afc3936c6cc957a",
        candidateTokenObservedOperatorRecorded: true
      }),
      OBJECT_FREEZE({
        attemptIndex: 2,
        startedAt: "2026-08-31T07:54:08.8829889Z",
        endedAt: "2026-08-31T07:54:09.0436262Z",
        httpStatusOperatorRecorded: 200,
        finalUrlEqualsRequestedUrlOperatorRecorded: true,
        contentTypeOperatorRecorded: "text/html; charset=UTF-8",
        deliveredBodyBytesOperatorRecorded: 596_252,
        deliveredBodySha256OperatorRecorded:
          "a33a03958ab0b856f00725cea4691fbaed4dcfd1c90c727a5afc3936c6cc957a",
        candidateTokenObservedOperatorRecorded: true
      })
    ]),
    repeatedReadsCount: 2,
    repeatedReadsStableOperatorRecorded: true,
    supportsFollowupDiscoveryOnly: true,
    authoritative: false
  })
]);

const BINDING_BOUNDARY = OBJECT_FREEZE({
  childToParentOnly: true,
  parentFullLoaderWeakSetBrandRequired: true,
  parentRawIdentityPinned: true,
  parentSemanticIdentityPinned: true,
  parentCandidateAndObservationIdsPinned: true,
  parentMutated: false,
  parentBacklinkAdded: false,
  formalContextsMutated: false,
  formalContextsBacklinkAdded: false,
  countsTowardFormalExpertIntake: false,
  crossSystemAuthorityInherited: false,
  noBacklinkContextPaths: FORMAL_CONTEXT_PATHS
});

const STORAGE_BOUNDARY = OBJECT_FREEZE({
  distributionPolicy: "link_only",
  remoteResponseBodiesPersisted: 0,
  remoteResponseBodiesPrinted: 0,
  pageBodiesStored: 0,
  exactQuotesStored: 0,
  abstractsStored: 0,
  keywordsStored: 0,
  screenshotsStored: 0,
  personalContactDetailsStored: 0,
  privateDossiersStored: 0,
  credentialDocumentsStored: 0,
  originalExpertOpinionsStored: 0,
  credentialsUsed: false,
  loginOrProtectedBackendUsed: false,
  sourceUrlsStored: 2
});

const RIGHTS_BOUNDARY = OBJECT_FREEZE({
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

const NETWORK_BOUNDARY = OBJECT_FREEZE({
  operatorRecordedNetworkFacts: true,
  operatorRecordedSummariesMechanicallyVerified: false,
  sameProcessSequentialReadsOperatorRecorded: true,
  twoReadsPerUrlOperatorRecorded: true,
  repeatedReadStabilityOperatorRecorded: true,
  http200OperatorRecorded: true,
  finalUrlEqualsRequestedUrlOperatorRecorded: true,
  bodyLengthAndSha256OperatorRecorded: true,
  candidateTokenObservedOperatorRecorded: true,
  captureExecutionReceiptStored: false,
  operatorRecordedFactsMechanicallyReplayed: false,
  stableTwoReadEstablishesNetworkAttestation: false,
  remoteCaptureMechanicallyVerified: false,
  networkAttestationEstablished: false,
  requestedToFinalUrlBindingMechanicallyVerified: false,
  redirectChainCaptured: false,
  wireBytesCaptured: false,
  tlsPeerCertificateCaptured: false,
  publisherAuthenticityEstablished: false,
  futureFreshnessRevalidated: false
});

const INTEGRITY_BOUNDARY = OBJECT_FREEZE({
  heldHandleRead: true,
  sameBufferHashAndParse: true,
  basisSameBufferHashAndInspection: true,
  parentLoadedViaFullVerifier: true,
  parentFullLoadWeakSetBrandVerified: true,
  parentRawIdentityPinned: true,
  parentSemanticDigestPinned: true,
  persistedRawIdentityPinned: true,
  canonicalPrettyBytesRequired: true,
  finalFileSymlinkRejected: true,
  directorySymlinkOrJunctionRejected: true,
  hardlinkRejected: true,
  endpointRevalidated: true,
  unknownFieldsRejected: true,
  callerMatchesPersistedSnapshotRequired: true,
  fullLoadResultWeakSetBranded: true,
  crossFileAtomicSnapshot: false,
  mutationEpochAvailable: false,
  mutationEpochReceipt: null,
  intervalMutationExcludedAcrossFiles: false,
  abaExcluded: false
});

const GATE_SUMMARY = OBJECT_FREEZE({
  publicCandidateLeadsFollowedUp: 1,
  publicSourceObservationsFollowedUp: 2,
  readAttemptsOperatorRecorded: 4,
  deduplicatedSourceGroups: 1,
  reviewerSlotsRequired: 2,
  reviewerSlotsOccupied: 0,
  identitiesVerified: 0,
  credentialsVerified: 0,
  scopeFitsVerified: 0,
  participationConsentsVerified: 0,
  pairwiseIndependenceAssessmentsCompleted: 0,
  independentExpertReviewsVerified: 0,
  sealedOriginalOpinions: 0,
  sourceBindingsRequired: 28,
  sourceBindingsFrozenVerified: 0,
  expertReviewBundleStatus: "absent/0",
  formalExpertGateCount: 0
});

const AUTHORITY_BOUNDARY = OBJECT_FREEZE({
  candidateDiscoveryOnly: true,
  identityVerified: false,
  currentRoleVerified: false,
  credentialValidityVerified: false,
  scopeVerified: false,
  independenceVerified: false,
  participationConsentVerified: false,
  expertStatusVerified: false,
  expertOpinionEstablished: false,
  contentTruthEstablished: false,
  expertTruthEstablished: false,
  rightsLegalConclusionEstablished: false,
  formalAdmissionAuthorized: false,
  releaseReady: false,
  expertClaimsAuthorized: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  crossSystemAuthorityInheritanceAuthorized: false
});

const DOES_NOT_ESTABLISH = OBJECT_FREEZE([
  "capture_receipt_or_network_attestation",
  "publisher_authenticity_or_future_freshness",
  "real_person_identity_or_cross_record_person_binding",
  "current_role_or_credential_validity",
  "six_question_scope_fit",
  "pairwise_independence_or_participation_consent",
  "expert_status_or_expert_opinion",
  "content_truth_or_expert_truth",
  "source_body_exact_quote_or_binding",
  "rights_or_legal_conclusion",
  "formal_review_gate_or_admission",
  "release_readiness_or_expert_claim_authorization",
  "public_deployment_or_public_release_authorization",
  "cross_system_authority_inheritance",
  "cross_file_atomic_snapshot_mutation_epoch_interval_integrity_or_aba_exclusion"
]);

export class WesternExpertPublicEvidenceFollowupError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "WesternExpertPublicEvidenceFollowupError";
    OBJECT_DEFINE_PROPERTY(this, "code", { value: code, enumerable: false });
    OBJECT_DEFINE_PROPERTY(this, "safeForCli", { value: true, enumerable: false });
  }
}

function fail(code, message, cause) {
  throw new WesternExpertPublicEvidenceFollowupError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function regexpMatches(pattern, value) {
  return REFLECT_APPLY(REGEXP_EXEC, pattern, [value]) !== null;
}

function passiveCapture(value, state, depth) {
  if (depth > 64) fail("INPUT_DEPTH_EXCEEDED", "西洋 follow-up child 超过最大深度。");
  state.nodes += 1;
  if (state.nodes > 100_000) fail("INPUT_NODE_LIMIT_EXCEEDED", "西洋 follow-up child 超过节点上限。");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!NUMBER_IS_FINITE(value) || OBJECT_IS(value, -0)) {
      fail("INPUT_VALUE_INVALID", "西洋 follow-up child 含无效数值。");
    }
    return value;
  }
  if (typeof value === "string") {
    state.text += value.length;
    if (state.text > 1_000_000) fail("INPUT_TEXT_LIMIT_EXCEEDED", "西洋 follow-up child 超过文本上限。");
    return value;
  }
  if (typeof value !== "object") fail("INPUT_VALUE_INVALID", "西洋 follow-up child 只接受 JSON 数据值。");
  if (IS_PROXY(value)) fail("INPUT_PROXY_FORBIDDEN", "西洋 follow-up child 不接受 Proxy。");
  if (REFLECT_APPLY(WEAK_SET_HAS, state.active, [value])) fail("INPUT_CYCLE_FORBIDDEN", "西洋 follow-up child 不接受循环引用。");
  if (REFLECT_APPLY(WEAK_SET_HAS, state.seen, [value])) fail("INPUT_ALIAS_FORBIDDEN", "西洋 follow-up child 不接受对象别名。");
  REFLECT_APPLY(WEAK_SET_ADD, state.active, [value]);
  REFLECT_APPLY(WEAK_SET_ADD, state.seen, [value]);
  try {
    let array;
    let prototype;
    let descriptors;
    try {
      array = ARRAY_IS_ARRAY(value);
      prototype = OBJECT_GET_PROTOTYPE_OF(value);
      descriptors = OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(value);
    } catch (cause) {
      fail("INPUT_OBJECT_UNSAFE", "西洋 follow-up child 对象不能被安全捕获。", cause);
    }
    const descriptorKeys = REFLECT_OWN_KEYS(descriptors);
    if (REFLECT_APPLY(ARRAY_SOME, descriptorKeys, [(key) => typeof key === "symbol"])) {
      fail("INPUT_SYMBOL_FORBIDDEN", "西洋 follow-up child 不接受 Symbol 属性。");
    }
    if (array) {
      if (prototype !== ARRAY_PROTOTYPE) fail("INPUT_PROTOTYPE_INVALID", "西洋 follow-up child 数组原型无效。");
      const lengthDescriptor = descriptors.length;
      const length = lengthDescriptor?.value;
      if (lengthDescriptor?.get || lengthDescriptor?.set
        || !NUMBER_IS_SAFE_INTEGER(length) || length < 0 || length > 100_000) {
        fail("INPUT_ARRAY_INVALID", "西洋 follow-up child 数组长度无效。");
      }
      const allowed = new NATIVE_SET();
      REFLECT_APPLY(SET_ADD, allowed, ["length"]);
      for (let index = 0; index < length; index += 1) REFLECT_APPLY(SET_ADD, allowed, [NATIVE_STRING(index)]);
      for (let index = 0; index < descriptorKeys.length; index += 1) {
        if (!REFLECT_APPLY(SET_HAS, allowed, [descriptorKeys[index]])) {
          fail("INPUT_ARRAY_INVALID", "西洋 follow-up child 数组含额外属性。");
        }
      }
      const output = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[NATIVE_STRING(index)];
        if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
          fail("INPUT_ARRAY_INVALID", "西洋 follow-up child 不接受稀疏数组或访问器元素。");
        }
        REFLECT_APPLY(ARRAY_PUSH, output, [passiveCapture(descriptor.value, state, depth + 1)]);
      }
      return output;
    }
    if (prototype !== OBJECT_PROTOTYPE) fail("INPUT_PROTOTYPE_INVALID", "西洋 follow-up child 只接受普通对象。");
    const output = {};
    for (let index = 0; index < descriptorKeys.length; index += 1) {
      const key = descriptorKeys[index];
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
        fail("INPUT_ACCESSOR_FORBIDDEN", "西洋 follow-up child 不接受访问器或不可枚举字段。");
      }
      OBJECT_DEFINE_PROPERTY(output, key, {
        value: passiveCapture(descriptor.value, state, depth + 1),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return output;
  } finally {
    REFLECT_APPLY(WEAK_SET_DELETE, state.active, [value]);
  }
}

function capturePassiveJson(value) {
  return passiveCapture(value, {
    active: new NATIVE_WEAK_SET(),
    seen: new NATIVE_WEAK_SET(),
    nodes: 0,
    text: 0
  }, 0);
}

function captureUint8Array(bytes, label, maxBytes) {
  if (IS_PROXY(bytes)) fail("JSON_PROXY_FORBIDDEN", `${label} 不接受 Proxy 字节。`);
  if (!IS_UINT8_ARRAY(bytes)
    || typeof TYPED_ARRAY_BUFFER_GETTER !== "function"
    || typeof TYPED_ARRAY_BYTE_OFFSET_GETTER !== "function"
    || typeof TYPED_ARRAY_BYTE_LENGTH_GETTER !== "function") {
    fail("JSON_BYTES_INVALID", `${label} 必须是内部 Uint8Array 字节视图。`);
  }
  let backingBuffer;
  let byteOffset;
  let byteLength;
  try {
    backingBuffer = REFLECT_APPLY(TYPED_ARRAY_BUFFER_GETTER, bytes, []);
    byteOffset = REFLECT_APPLY(TYPED_ARRAY_BYTE_OFFSET_GETTER, bytes, []);
    byteLength = REFLECT_APPLY(TYPED_ARRAY_BYTE_LENGTH_GETTER, bytes, []);
  } catch (cause) {
    fail("JSON_BYTES_INVALID", `${label} 内部字节槽不可读。`, cause);
  }
  if (!NUMBER_IS_SAFE_INTEGER(byteOffset) || byteOffset < 0
    || !NUMBER_IS_SAFE_INTEGER(byteLength) || byteLength < 0
    || !NUMBER_IS_SAFE_INTEGER(maxBytes) || maxBytes <= 0) {
    fail("JSON_BYTES_INVALID", `${label} 字节边界无效。`);
  }
  if (byteLength > maxBytes) fail("JSON_TOO_LARGE", `${label} 超过输入上限。`);
  if (typeof IS_SHARED_ARRAY_BUFFER === "function" && IS_SHARED_ARRAY_BUFFER(backingBuffer)) {
    fail("JSON_SHARED_BUFFER_FORBIDDEN", `${label} 不接受 SharedArrayBuffer。`);
  }
  if (!IS_ARRAY_BUFFER(backingBuffer)) fail("JSON_BYTES_INVALID", `${label} backing buffer 无效。`);
  if (typeof ARRAY_BUFFER_RESIZABLE_GETTER === "function"
    && REFLECT_APPLY(ARRAY_BUFFER_RESIZABLE_GETTER, backingBuffer, [])) {
    fail("JSON_RESIZABLE_BUFFER_FORBIDDEN", `${label} 不接受 resizable ArrayBuffer。`);
  }
  const captured = new NATIVE_UINT8_ARRAY(byteLength);
  try {
    REFLECT_APPLY(UINT8_ARRAY_SET, captured, [bytes]);
  } catch (cause) {
    fail("JSON_BYTES_INVALID", `${label} 无法复制到私有固定缓冲区。`, cause);
  }
  return captured;
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object" || REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const descriptors = OBJECT_VALUES(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(value));
  for (let index = 0; index < descriptors.length; index += 1) {
    const descriptor = descriptors[index];
    if (REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
      deepFreeze(descriptor.value, seen);
    }
  }
  return OBJECT_FREEZE(value);
}

function canonicalValue(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number" && NUMBER_IS_FINITE(value) && !OBJECT_IS(value, -0)) return value;
  if (ARRAY_IS_ARRAY(value)) {
    const output = [];
    OBJECT_DEFINE_PROPERTY(output, "toJSON", { value: null });
    for (let index = 0; index < value.length; index += 1) {
      REFLECT_APPLY(ARRAY_PUSH, output, [canonicalValue(value[index])]);
    }
    return output;
  }
  if (value && typeof value === "object" && OBJECT_GET_PROTOTYPE_OF(value) === OBJECT_PROTOTYPE) {
    const output = OBJECT_CREATE(null);
    const keys = OBJECT_KEYS(value);
    REFLECT_APPLY(ARRAY_SORT, keys, [compareCodeUnits]);
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      OBJECT_DEFINE_PROPERTY(output, key, {
        value: canonicalValue(value[key]),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return output;
  }
  fail("NON_CANONICAL_JSON", "西洋 follow-up child 只接受有限规范 JSON 值。");
}

export function canonicalStringifyWesternExpertPublicEvidenceFollowup(value) {
  return JSON_STRINGIFY(canonicalValue(capturePassiveJson(value)));
}

export function serializeWesternExpertPublicEvidenceFollowup(value) {
  return JSON_STRINGIFY(canonicalValue(capturePassiveJson(value)), null, 2) + "\n";
}

export function computeWesternExpertPublicEvidenceFollowupDigest(value) {
  const snapshot = capturePassiveJson(value);
  const unsigned = {};
  const keys = OBJECT_KEYS(snapshot);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (key === "followupDigest") continue;
    OBJECT_DEFINE_PROPERTY(unsigned, key, {
      value: snapshot[key], enumerable: true, configurable: true, writable: true
    });
  }
  const hash = createHash("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [DIGEST_DOMAIN, "utf8"]);
  REFLECT_APPLY(HASH_UPDATE, hash, [canonicalStringifyWesternExpertPublicEvidenceFollowup(unsigned), "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

export function parseWesternExpertPublicEvidenceFollowupJsonBytes(
  bytes,
  label = WESTERN_EXPERT_PUBLIC_EVIDENCE_FOLLOWUP_RELATIVE_PATH,
  maxBytes = MAX_ARTIFACT_BYTES
) {
  const captured = captureUint8Array(bytes, label, maxBytes);
  try {
    return parseBaziDttStrictJsonArtifact({ path: label, bytes: captured });
  } catch (cause) {
    fail(cause?.code ?? "FOLLOWUP_JSON_INVALID", `${label} 不是严格 JSON。`, cause);
  }
}

function copyArray(value) {
  const output = [];
  for (let index = 0; index < value.length; index += 1) {
    REFLECT_APPLY(ARRAY_PUSH, output, [value[index]]);
  }
  return output;
}

function mapArray(value, callback) {
  const output = [];
  for (let index = 0; index < value.length; index += 1) {
    REFLECT_APPLY(ARRAY_PUSH, output, [callback(value[index], index, value)]);
  }
  return output;
}

function copyObservation(observation) {
  return {
    parentSourceObservationId: observation.parentSourceObservationId,
    candidateLeadId: observation.candidateLeadId,
    requestedUrl: observation.requestedUrl,
    sourceUpstreamGroupId: observation.sourceUpstreamGroupId,
    sourceType: observation.sourceType,
    observationWindowStartedAt: observation.observationWindowStartedAt,
    observationWindowEndedAt: observation.observationWindowEndedAt,
    readAttempts: mapArray(observation.readAttempts, (attempt) => ({ ...attempt })),
    repeatedReadsCount: observation.repeatedReadsCount,
    repeatedReadsStableOperatorRecorded: observation.repeatedReadsStableOperatorRecorded,
    deliveredBodyHashBindsSemanticSummary: false,
    candidateTokenBindsRealPersonIdentity: false,
    supportsFollowupDiscoveryOnly: observation.supportsFollowupDiscoveryOnly,
    authoritative: observation.authoritative
  };
}

export function buildExpectedWesternExpertPublicEvidenceFollowup() {
  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: "western_expert_public_evidence_followup_v1",
    followupId: FOLLOWUP_ID,
    status: STATUS,
    createdAt: CREATED_AT,
    operatorObservationWindow: {
      startedAt: "2026-08-31T07:54:04.9600402Z",
      endedAt: "2026-08-31T07:54:09.0436262Z",
      parentSourceObservationCount: 2,
      readAttemptCount: 4
    },
    reviewQuestionIds: copyArray(REVIEW_QUESTION_IDS),
    parentPrescreenArtifact: {
      path: PARENT_ARTIFACT.path,
      rawBytes: PARENT_ARTIFACT.rawBytes,
      rawSha256: PARENT_ARTIFACT.rawSha256,
      ledgerId: PARENT_ARTIFACT.ledgerId,
      ledgerDigest: PARENT_ARTIFACT.ledgerDigest,
      candidateLeadIds: copyArray(PARENT_ARTIFACT.candidateLeadIds),
      sourceObservationIds: copyArray(PARENT_ARTIFACT.sourceObservationIds),
      sourceUpstreamGroupIds: copyArray(PARENT_ARTIFACT.sourceUpstreamGroupIds)
    },
    basisArtifact: { ...BASIS_ARTIFACT },
    sourceGroupPolicy: {
      deduplicationKey: "sourceUpstreamGroupId",
      sameGroupObservationsCountOnce: true,
      repeatedReadsDoNotAddSourceGroups: true,
      parentSourceObservationCount: 2,
      readAttemptCount: 4,
      deduplicatedSourceGroupCount: 1
    },
    sourceGroups: [{
      sourceUpstreamGroupId: "PAA_NCGR",
      publicOwnerLabel: "Professional Astrologers Alliance / NCGR public record family",
      parentSourceObservationIds: copyArray(PARENT_ARTIFACT.sourceObservationIds),
      readAttemptCount: 4
    }],
    sourceObservations: mapArray(SOURCE_OBSERVATIONS, copyObservation),
    candidateFollowup: {
      candidateLeadId: "western-public-lead-003",
      parentCandidateState: "uncontacted_public_candidate_lead",
      followupState: "same_upstream_public_page_double_read_stable_operator_recorded_non_authoritative",
      parentSourceObservationIds: copyArray(PARENT_ARTIFACT.sourceObservationIds),
      sourceUpstreamGroupIds: ["PAA_NCGR"],
      deduplicatedSourceGroupCount: 1,
      scopeSignalMatrix: mapArray(REVIEW_QUESTION_IDS, (questionId) => ({
        questionId,
        state: "not_assessed_in_this_response_identity_followup"
      })),
      candidateTokenObservedOperatorRecorded: true,
      projectQuestionAnswered: false,
      crossRecordPersonIdentityBindingVerified: false,
      currentRoleVerified: false,
      identityVerified: false,
      credentialVerified: false,
      scopeVerified: false,
      independenceVerified: false,
      participationConsentVerified: false,
      expertStatusVerified: false,
      expertOpinionCollected: false,
      sealedOriginalOpinion: false,
      countsTowardExpertGate: false,
      reviewerSlot: null,
      formalExpertIntakeRef: null,
      formalReviewPacketRef: null,
      seatAssignmentRef: null
    },
    bindingBoundary: {
      ...BINDING_BOUNDARY,
      noBacklinkContextPaths: copyArray(FORMAL_CONTEXT_PATHS)
    },
    storageBoundary: { ...STORAGE_BOUNDARY },
    rightsBoundary: { ...RIGHTS_BOUNDARY },
    networkObservationBoundary: { ...NETWORK_BOUNDARY },
    integrityBoundary: { ...INTEGRITY_BOUNDARY },
    gateSummary: { ...GATE_SUMMARY },
    authorityBoundary: { ...AUTHORITY_BOUNDARY },
    doesNotEstablish: copyArray(DOES_NOT_ESTABLISH)
  };
  return deepFreeze({
    ...unsigned,
    followupDigest: computeWesternExpertPublicEvidenceFollowupDigest(unsigned)
  });
}

function scanForbiddenPayload(value) {
  if (ARRAY_IS_ARRAY(value)) {
    for (let index = 0; index < value.length; index += 1) scanForbiddenPayload(value[index]);
    return;
  }
  if (!value || typeof value !== "object") return;
  const keys = OBJECT_KEYS(value);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (regexpMatches(/^(?:pageBody|rawBody|responseBody|bodyBase64|bodyText|html|rawText|fullText|excerpt|quote|exactQuote)$/iu, key)) {
      fail("PAGE_BODY_OR_QUOTE_FIELD_FORBIDDEN", "西洋 follow-up child 不得保存页面正文或 exact quote。");
    }
    if (regexpMatches(/^(?:email|phone|telephone|address|contactDetails|privateDossier|credentialDocument|certificateImage|rawOpinion|expertName|assignedExpertSeat)$/iu, key)) {
      fail("PRIVATE_OR_FORMAL_FIELD_FORBIDDEN", "西洋 follow-up child 不得保存私人 dossier、意见或正式席位字段。");
    }
    scanForbiddenPayload(value[key]);
  }
}

function currentWorkingDirectory() {
  return REFLECT_APPLY(PROCESS_CWD, PROCESS_OBJECT, []);
}

function hasExactReviewQuestionIds(value) {
  if (!ARRAY_IS_ARRAY(value) || value.length !== REVIEW_QUESTION_IDS.length) return false;
  for (let index = 0; index < REVIEW_QUESTION_IDS.length; index += 1) {
    if (value[index] !== REVIEW_QUESTION_IDS[index]) return false;
  }
  return true;
}

function assertFailClosedBoundaries(followup) {
  if (!hasExactReviewQuestionIds(followup?.reviewQuestionIds)) {
    fail("REVIEW_QUESTION_IDS_INVALID", "西洋 follow-up child 必须精确继承 parent 六个 review question IDs。");
  }
  const gate = followup?.gateSummary;
  if (!gate || gate.reviewerSlotsOccupied !== 0
    || gate.identitiesVerified !== 0
    || gate.credentialsVerified !== 0
    || gate.scopeFitsVerified !== 0
    || gate.participationConsentsVerified !== 0
    || gate.pairwiseIndependenceAssessmentsCompleted !== 0
    || gate.independentExpertReviewsVerified !== 0
    || gate.sealedOriginalOpinions !== 0
    || gate.sourceBindingsFrozenVerified !== 0
    || gate.formalExpertGateCount !== 0
    || gate.reviewerSlotsRequired !== 2
    || gate.sourceBindingsRequired !== 28
    || gate.expertReviewBundleStatus !== "absent/0") {
    fail("ZERO_INSTANCE_PROMOTION_FORBIDDEN", "西洋 follow-up child 必须保持 0/2、0/28 与零专家实例。");
  }
  if (!followup?.authorityBoundary || followup.authorityBoundary.candidateDiscoveryOnly !== true) {
    fail("AUTHORITY_BOUNDARY_INVALID", "西洋 follow-up child 必须保持 candidateDiscoveryOnly。");
  }
  const authorityEntries = OBJECT_ENTRIES(followup.authorityBoundary);
  for (let index = 0; index < authorityEntries.length; index += 1) {
    const key = authorityEntries[index][0];
    const value = authorityEntries[index][1];
    if (key !== "candidateDiscoveryOnly" && value !== false) {
      fail("AUTHORITY_PROMOTION_FORBIDDEN", `authorityBoundary.${key} 必须保持 false。`);
    }
  }
  const candidate = followup?.candidateFollowup;
  if (!candidate || candidate.reviewerSlot !== null
    || candidate.formalExpertIntakeRef !== null
    || candidate.formalReviewPacketRef !== null
    || candidate.seatAssignmentRef !== null
    || candidate.projectQuestionAnswered !== false
    || candidate.crossRecordPersonIdentityBindingVerified !== false
    || candidate.currentRoleVerified !== false
    || candidate.identityVerified !== false
    || candidate.credentialVerified !== false
    || candidate.scopeVerified !== false
    || candidate.independenceVerified !== false
    || candidate.participationConsentVerified !== false
    || candidate.expertStatusVerified !== false
    || candidate.expertOpinionCollected !== false
    || candidate.sealedOriginalOpinion !== false
    || candidate.countsTowardExpertGate !== false) {
    fail("CANDIDATE_PROMOTION_FORBIDDEN", "公开 follow-up 不得晋级候选身份、资质、scope、席位或意见。");
  }
  if (!ARRAY_IS_ARRAY(candidate.scopeSignalMatrix)
    || candidate.scopeSignalMatrix.length !== REVIEW_QUESTION_IDS.length) {
    fail("SCOPE_SIGNAL_INVALID", "西洋 follow-up child 必须保留六个未评估 scope signal。");
  }
  for (let index = 0; index < REVIEW_QUESTION_IDS.length; index += 1) {
    const signal = candidate.scopeSignalMatrix[index];
    if (!signal || signal.questionId !== REVIEW_QUESTION_IDS[index]
      || signal.state !== "not_assessed_in_this_response_identity_followup") {
      fail("SCOPE_PROMOTION_FORBIDDEN", "response/identity follow-up 不得回答项目问题或晋级 scope。");
    }
  }
  if (!ARRAY_IS_ARRAY(followup?.sourceObservations)
    || followup.sourceObservations.length !== SOURCE_OBSERVATIONS.length
    || REFLECT_APPLY(ARRAY_SOME, followup.sourceObservations, [(observation) =>
      observation?.deliveredBodyHashBindsSemanticSummary !== false
      || observation?.candidateTokenBindsRealPersonIdentity !== false])) {
    fail("OBSERVATION_BINDING_PROMOTION_FORBIDDEN", "body hash 与 candidate token 不得绑定语义摘要或真实个人身份。");
  }
  if (followup?.storageBoundary?.remoteResponseBodiesPersisted !== 0
    || followup.storageBoundary.remoteResponseBodiesPrinted !== 0
    || followup.storageBoundary.pageBodiesStored !== 0
    || followup.storageBoundary.exactQuotesStored !== 0
    || followup.storageBoundary.distributionPolicy !== "link_only") {
    fail("STORAGE_PROMOTION_FORBIDDEN", "西洋 follow-up child 必须保持 link-only 与零正文/quote。");
  }
  if (followup?.rightsBoundary?.distributionPolicy !== "link_only"
    || followup.rightsBoundary.redistributionRightsEstablished !== false
    || followup.rightsBoundary.publicRepositoryInclusionAuthorized !== false
    || followup.rightsBoundary.buildInclusionAuthorized !== false) {
    fail("RIGHTS_PROMOTION_FORBIDDEN", "西洋 follow-up child 不得晋级权利或纳入授权。");
  }
  if (followup?.networkObservationBoundary?.captureExecutionReceiptStored !== false
    || followup.networkObservationBoundary.operatorRecordedSummariesMechanicallyVerified !== false
    || followup.networkObservationBoundary.remoteCaptureMechanicallyVerified !== false
    || followup.networkObservationBoundary.networkAttestationEstablished !== false
    || followup.networkObservationBoundary.publisherAuthenticityEstablished !== false) {
    fail("NETWORK_PROMOTION_FORBIDDEN", "操作员双读不得晋级 capture receipt、网络鉴证或发布者真实性。");
  }
  if (followup?.integrityBoundary?.crossFileAtomicSnapshot !== false
    || followup.integrityBoundary.mutationEpochAvailable !== false
    || followup.integrityBoundary.mutationEpochReceipt !== null
    || followup.integrityBoundary.intervalMutationExcludedAcrossFiles !== false
    || followup.integrityBoundary.abaExcluded !== false) {
    fail("INTEGRITY_PROMOTION_FORBIDDEN", "child 没有跨文件原子、mutation epoch、interval 或 ABA 证明。");
  }
}

export function verifyWesternExpertPublicEvidenceFollowupArtifact(input) {
  const followup = capturePassiveJson(input);
  scanForbiddenPayload(followup);
  assertFailClosedBoundaries(followup);
  if (typeof followup.followupDigest !== "string"
    || !regexpMatches(SHA256_PATTERN, followup.followupDigest)) {
    fail("FOLLOWUP_DIGEST_INVALID", "西洋 follow-up child 必须具有小写 SHA-256 digest。");
  }
  if (computeWesternExpertPublicEvidenceFollowupDigest(followup) !== followup.followupDigest) {
    fail("FOLLOWUP_DIGEST_MISMATCH", "西洋 follow-up child digest 不匹配。");
  }
  const expected = buildExpectedWesternExpertPublicEvidenceFollowup();
  if (canonicalStringifyWesternExpertPublicEvidenceFollowup(followup)
    !== canonicalStringifyWesternExpertPublicEvidenceFollowup(expected)) {
    fail("FOLLOWUP_CONTRACT_MISMATCH", "西洋 follow-up child 与固定 parent、观察、group 和失败关闭合同不一致。");
  }
  return deepFreeze(followup);
}

function decodeUtf8(bytes, label) {
  try {
    const decoder = new NATIVE_TEXT_DECODER("utf-8", { fatal: true });
    return REFLECT_APPLY(TEXT_DECODER_DECODE, decoder, [bytes]);
  } catch (cause) {
    fail("UTF8_INVALID", `${label} 不是严格 UTF-8。`, cause);
  }
}

async function readStableArtifact(workspaceRoot, relativePath, label = relativePath) {
  try {
    return await readBaziDttStableWorkspaceArtifact(workspaceRoot, relativePath);
  } catch (cause) {
    fail(cause?.code ?? "ARTIFACT_ENDPOINT_INVALID", `${label} 无法按 held handle 稳定读取。`, cause);
  }
}

async function verifyBasis(workspaceRoot) {
  const snapshot = await readStableArtifact(workspaceRoot, BASIS_ARTIFACT.path, "西洋 follow-up basis");
  if (snapshot.rawBytes !== BASIS_ARTIFACT.rawBytes || snapshot.rawSha256 !== BASIS_ARTIFACT.rawSha256) {
    fail("BASIS_RAW_IDENTITY_DRIFT", "西洋 follow-up basis raw identity 漂移。");
  }
  const text = decodeUtf8(snapshot.bytes, "西洋 follow-up basis");
  const markers = [
    "# 阶段 D-E：西洋现实专家公开证据跟进 child",
    "western-public-lead-003",
    "SCOFIELD-PAA-BOARD",
    "SCOFIELD-PAA-CERTIFIED",
    "PAA_NCGR",
    "0/2",
    "0/28",
    "link_only"
  ];
  if (REFLECT_APPLY(ARRAY_SOME, markers, [
    (marker) => !REFLECT_APPLY(STRING_INCLUDES, text, [marker])
  ])) {
    fail("BASIS_MARKER_MISSING", "西洋 follow-up basis 缺少固定边界标记。");
  }
  return snapshot;
}

function assertParentBinding(parent) {
  if (!isVerifiedWesternExpertPublicCandidatePrescreen(parent)) {
    fail("PARENT_PRIVATE_BRAND_REQUIRED", "必须消费 parent full loader 的真实 WeakSet brand。");
  }
  if (parent.ledgerId !== PARENT_ARTIFACT.ledgerId
    || parent.ledgerDigest !== PARENT_ARTIFACT.ledgerDigest
    || parent.ledgerArtifact.path !== PARENT_ARTIFACT.path
    || parent.ledgerArtifact.rawBytes !== PARENT_ARTIFACT.rawBytes
    || parent.ledgerArtifact.rawSha256 !== PARENT_ARTIFACT.rawSha256) {
    fail("PARENT_BINDING_MISMATCH", "西洋 parent raw 或 semantic identity 漂移。");
  }
  if (!hasExactReviewQuestionIds(parent.ledger.reviewQuestionIds)) {
    fail("PARENT_REVIEW_QUESTION_IDS_DRIFT", "parent 六个 review question IDs 漂移。");
  }
  const candidate = REFLECT_APPLY(ARRAY_FIND, parent.ledger.candidates, [
    (entry) => entry.candidateLeadId === "western-public-lead-003"
  ]);
  if (!candidate || candidate.candidateState !== "uncontacted_public_candidate_lead"
    || candidate.reviewerSlot !== null
    || candidate.identityVerified !== false
    || candidate.credentialVerified !== false
    || candidate.scopeVerified !== false
    || candidate.independenceVerified !== false
    || candidate.participationConsentVerified !== false
    || candidate.expertStatusVerified !== false
    || candidate.expertOpinionCollected !== false
    || candidate.sealedOriginalOpinion !== false
    || candidate.countsTowardExpertGate !== false) {
    fail("PARENT_CANDIDATE_STATE_DRIFT", "parent candidate 003 不再保持未联系零实例状态。");
  }
  const observations = mapArray(PARENT_ARTIFACT.sourceObservationIds, (observationId) =>
    REFLECT_APPLY(ARRAY_FIND, parent.ledger.sourceObservations, [
      (entry) => entry.sourceObservationId === observationId
    ]));
  if (REFLECT_APPLY(ARRAY_SOME, observations, [(entry) => !entry])
    || REFLECT_APPLY(ARRAY_SOME, observations, [(entry) => entry.candidateLeadId !== "western-public-lead-003"
      || entry.sourceUpstreamGroupId !== "PAA_NCGR"
      || entry.supportsCandidateDiscoveryOnly !== true
      || entry.authoritative !== false])) {
    fail("PARENT_OBSERVATION_BINDING_DRIFT", "parent 两条 PAA_NCGR observation 漂移。");
  }
  const receipt = parent.ledger.zeroInstanceReceipt;
  if (receipt.reviewerSlotsRequired !== 2 || receipt.reviewerSlotsOccupied !== 0
    || receipt.sourceBindingsRequired !== 28 || receipt.sourceBindingsFrozenVerified !== 0
    || receipt.independentExpertReviewsVerified !== 0 || receipt.formalExpertGateCount !== 0) {
    fail("PARENT_ZERO_STATE_DRIFT", "parent 必须保持 0/2、0/28 和零正式专家门。");
  }
}

async function verifyNoBacklinks(workspaceRoot) {
  for (let index = 0; index < FORMAL_CONTEXT_PATHS.length; index += 1) {
    const relativePath = FORMAL_CONTEXT_PATHS[index];
    const snapshot = await readStableArtifact(workspaceRoot, relativePath, `no-backlink context ${relativePath}`);
    const text = decodeUtf8(snapshot.bytes, relativePath);
    if (REFLECT_APPLY(STRING_INCLUDES, text, [FOLLOWUP_ID])
      || REFLECT_APPLY(STRING_INCLUDES, text, [WESTERN_EXPERT_PUBLIC_EVIDENCE_FOLLOWUP_RELATIVE_PATH])) {
      fail("UPSTREAM_BACKLINK_FORBIDDEN", `${relativePath} 不得反向消费西洋 follow-up child。`);
    }
  }
}

async function verifyParentAndNoBacklinks(workspaceRoot) {
  let parent;
  try {
    parent = await loadWesternExpertPublicCandidatePrescreen(workspaceRoot);
  } catch (cause) {
    fail("PARENT_FULL_LOAD_FAILED", "西洋 parent full loader 未完成。", cause);
  }
  assertParentBinding(parent);
  await verifyNoBacklinks(workspaceRoot);
  return parent;
}

export async function preflightWesternExpertPublicEvidenceFollowup(workspaceRoot = currentWorkingDirectory()) {
  const basis = await verifyBasis(workspaceRoot);
  const parent = await verifyParentAndNoBacklinks(workspaceRoot);
  return deepFreeze({
    prerequisitesMechanicallyVerified: true,
    basisArtifact: { path: basis.path, rawBytes: basis.rawBytes, rawSha256: basis.rawSha256 },
    parentArtifact: { ...parent.ledgerArtifact },
    parentPrivateBrandVerified: isVerifiedWesternExpertPublicCandidatePrescreen(parent),
    noBacklinkContextsVerified: FORMAL_CONTEXT_PATHS.length
  });
}

async function readPersistedFollowupArtifact(workspaceRoot) {
  if (EXPECTED_PERSISTED_RAW.rawBytes <= 0
    || !regexpMatches(SHA256_PATTERN, EXPECTED_PERSISTED_RAW.rawSha256)) {
    fail("PERSISTED_IDENTITY_UNSET", "西洋 follow-up child raw identity 尚未冻结。");
  }
  const snapshot = await readStableArtifact(
    workspaceRoot,
    WESTERN_EXPERT_PUBLIC_EVIDENCE_FOLLOWUP_RELATIVE_PATH,
    "西洋 follow-up child"
  );
  if (snapshot.rawBytes !== EXPECTED_PERSISTED_RAW.rawBytes
    || snapshot.rawSha256 !== EXPECTED_PERSISTED_RAW.rawSha256) {
    fail("FOLLOWUP_RAW_IDENTITY_DRIFT", "西洋 follow-up child raw identity 漂移。");
  }
  const parsed = parseWesternExpertPublicEvidenceFollowupJsonBytes(snapshot.bytes, snapshot.path);
  const followup = verifyWesternExpertPublicEvidenceFollowupArtifact(parsed);
  if (decodeUtf8(snapshot.bytes, "西洋 follow-up child")
    !== serializeWesternExpertPublicEvidenceFollowup(followup)) {
    fail("FOLLOWUP_CANONICAL_BYTES_DRIFT", "西洋 follow-up child 必须保持唯一 pretty JSON 与 LF 终止。");
  }
  return { snapshot, followup };
}

function publicIdentity(snapshot) {
  return OBJECT_FREEZE({
    path: snapshot.path,
    rawBytes: snapshot.rawBytes,
    rawSha256: snapshot.rawSha256
  });
}

async function buildFullResult(workspaceRoot, persisted, callerInput = undefined) {
  if (callerInput !== undefined) {
    const caller = verifyWesternExpertPublicEvidenceFollowupArtifact(callerInput);
    if (canonicalStringifyWesternExpertPublicEvidenceFollowup(caller)
      !== canonicalStringifyWesternExpertPublicEvidenceFollowup(persisted.followup)) {
      fail("CALLER_PERSISTED_MISMATCH", "调用方输入与持久化西洋 follow-up child 不一致。");
    }
  }
  const basis = await verifyBasis(workspaceRoot);
  const parent = await verifyParentAndNoBacklinks(workspaceRoot);
  const followup = persisted.followup;
  const result = deepFreeze({
    offlineFollowupArtifactMechanicallyVerified: true,
    status: followup.status,
    followupId: followup.followupId,
    followupDigest: followup.followupDigest,
    parentPrivateBrandVerified: isVerifiedWesternExpertPublicCandidatePrescreen(parent),
    parentPrescreenBound: true,
    candidateFollowups: followup.gateSummary.publicCandidateLeadsFollowedUp,
    sourceObservations: followup.gateSummary.publicSourceObservationsFollowedUp,
    readAttemptsOperatorRecorded: followup.gateSummary.readAttemptsOperatorRecorded,
    deduplicatedSourceGroups: followup.gateSummary.deduplicatedSourceGroups,
    reviewerSlots: `${followup.gateSummary.reviewerSlotsOccupied}/${followup.gateSummary.reviewerSlotsRequired}`,
    sourceBindings: `${followup.gateSummary.sourceBindingsFrozenVerified}/${followup.gateSummary.sourceBindingsRequired}`,
    expertGateCount: followup.gateSummary.formalExpertGateCount,
    remoteResponseBodiesPersisted: followup.storageBoundary.remoteResponseBodiesPersisted,
    remoteResponseBodiesPrinted: followup.storageBoundary.remoteResponseBodiesPrinted,
    remoteCaptureMechanicallyVerified: followup.networkObservationBoundary.remoteCaptureMechanicallyVerified,
    networkAttestationEstablished: followup.networkObservationBoundary.networkAttestationEstablished,
    identityVerified: followup.authorityBoundary.identityVerified,
    credentialValidityVerified: followup.authorityBoundary.credentialValidityVerified,
    scopeVerified: followup.authorityBoundary.scopeVerified,
    independenceVerified: followup.authorityBoundary.independenceVerified,
    expertStatusVerified: followup.authorityBoundary.expertStatusVerified,
    expertClaimsAuthorized: followup.authorityBoundary.expertClaimsAuthorized,
    releaseReady: followup.authorityBoundary.releaseReady,
    publicDeploymentAuthorized: followup.authorityBoundary.publicDeploymentAuthorized,
    publicReleaseAuthorized: followup.authorityBoundary.publicReleaseAuthorized,
    followupArtifact: publicIdentity(persisted.snapshot),
    parentArtifact: { ...parent.ledgerArtifact },
    basisArtifact: publicIdentity(basis),
    noBacklinkContextsVerified: FORMAL_CONTEXT_PATHS.length,
    followup
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export async function readWesternExpertPublicEvidenceFollowup(workspaceRoot = currentWorkingDirectory()) {
  return (await readPersistedFollowupArtifact(workspaceRoot)).followup;
}

export async function loadWesternExpertPublicEvidenceFollowup(workspaceRoot = currentWorkingDirectory()) {
  const persisted = await readPersistedFollowupArtifact(workspaceRoot);
  return buildFullResult(workspaceRoot, persisted);
}

export async function verifyWesternExpertPublicEvidenceFollowup(
  workspaceRoot = currentWorkingDirectory(),
  callerInput
) {
  const persisted = await readPersistedFollowupArtifact(workspaceRoot);
  return buildFullResult(workspaceRoot, persisted, callerInput);
}

export function isVerifiedWesternExpertPublicEvidenceFollowup(value) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value])
    && OBJECT_IS_FROZEN(value);
}

export const westernExpertPublicEvidenceFollowupTestOnly = OBJECT_FREEZE({
  EXPECTED_PERSISTED_RAW,
  BASIS_ARTIFACT,
  PARENT_ARTIFACT,
  REVIEW_QUESTION_IDS,
  FORMAL_CONTEXT_PATHS,
  SOURCE_OBSERVATIONS,
  BINDING_BOUNDARY,
  STORAGE_BOUNDARY,
  RIGHTS_BOUNDARY,
  NETWORK_BOUNDARY,
  INTEGRITY_BOUNDARY,
  GATE_SUMMARY,
  AUTHORITY_BOUNDARY,
  DOES_NOT_ESTABLISH,
  DIGEST_DOMAIN,
  readStableArtifact,
  readPersistedFollowupArtifact,
  verifyNoBacklinks
});
