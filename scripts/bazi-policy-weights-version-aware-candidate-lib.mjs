import { createHash } from "node:crypto";

import {
  isVerifiedBaziEngineeringValueSubjectGapVersionAwareCandidate,
  loadBaziEngineeringValueSubjectGapVersionAwareCandidate
} from "./bazi-engineering-value-subject-gap-version-aware-candidate-lib.mjs";
import {
  isVerifiedBaziBindingFreezeRequirementsV17,
  loadBaziBindingFreezeRequirementsV17
} from "./bazi-dtt-version-aware-readiness-lib.mjs";
import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";

const CRYPTO_CREATE_HASH = createHash;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const REFLECT_APPLY = Reflect.apply;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const NATIVE_WEAK_SET = WeakSet;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PUSH = Array.prototype.push;
const ARRAY_SORT = Array.prototype.sort;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const BUFFER_FROM = Buffer.from;
const NATIVE_BUFFER = Buffer;
const PROCESS_CWD = process.cwd;
const HASH_PROTOTYPE = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [CRYPTO_CREATE_HASH("sha256")]);
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const UINT8_ARRAY_PROTOTYPE = Uint8Array.prototype;
const TYPED_ARRAY_PROTOTYPE = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [UINT8_ARRAY_PROTOTYPE]);
const TYPED_ARRAY_BYTE_LENGTH_GETTER = REFLECT_APPLY(
  OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
  Object,
  [TYPED_ARRAY_PROTOTYPE, "byteLength"]
)?.get;

export const BAZI_POLICY_WEIGHTS_VERSION_AWARE_CANDIDATE_RELATIVE_PATH =
  "content/system-admission/bazi-policy-weights-value-evidence-candidate.v1.1.0.json";

const HISTORICAL_POLICY = OBJECT_FREEZE({
  path: "content/system-admission/bazi-policy-weights-value-evidence-candidate.v1.json",
  rawBytes: 10397,
  rawSha256: "91a6c9f10e1b56da1292133c6e276c437c7fb8b2c6dbca9bed2b54bcfa9726e6",
  candidateId: "hakimi.bazi/policy-weights-value-evidence-candidate/1.0.0",
  candidateDigest: "208ae39797d048b2fc869392528a3cf7d1858de232a8691bc0296366d6363088",
  schemaVersion: "1.0.0",
  recordType: "bazi_policy_weights_value_evidence_candidate_v1",
  status: "candidate_only_current_repository_values_observed_not_freeze_eligible",
  createdAt: "2026-08-29T00:00:00.000Z"
});
const CANDIDATE_GAP = OBJECT_FREEZE({
  path: "content/system-admission/bazi-engineering-binding-value-subject-gaps.v1.1.0.json",
  rawBytes: 71168,
  rawSha256: "f8ed780ce8e3fbaca59b295faff2f12b939a8b0c193bc0c20ce1198690528d4e",
  ledgerId:
    "hakimi.bazi.engineering_binding_value_subject_gaps.version-aware-candidate/1.1.0",
  ledgerDigest: "d578b6e76c325bf79593b728b78035d3481ec60fa7fb99c815748d9f806a8330"
});
const CANDIDATE_READINESS = OBJECT_FREEZE({
  path: "content/system-admission/bazi-binding-freeze-requirements.v1.7.0.json",
  rawBytes: 32629,
  rawSha256: "7565a1c1ae51c09c78cf8f906e544bd8ee822020f76587237bc909ef1e6408a2",
  ledgerId: "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.7.0",
  ledgerDigest: "afdebfa1fb7a797f02d136373eb9aef1afa26b38b755926f8930ea5de97316b8"
});
const ENGINEERING_PARENT = OBJECT_FREEZE({
  path: "content/bazi-strength-engineering-binding-candidates.v1.json",
  rawBytes: 21712,
  rawSha256: "95154d55d9e368351f5a69a1fa2ff63a51ba946d33a800dbd1f2460d9ac97b2f",
  ledgerId: "hakimi.bazi.strength.engineering-binding-candidates/1.0.0",
  ledgerDigest: "05ce9c6d9c03822cf246b0406d15616e8c4a6938650296135142827a00a5a28e"
});
const HISTORICAL_DIGEST_DOMAIN = "hakimi.bazi.policy-weights-value-evidence-candidate.v1";
const CANDIDATE_DIGEST_DOMAIN =
  "hakimi.bazi.policy-weights-value-evidence.version-aware-candidate.v1.1";
const EXPECTED_VALUE_SUBJECT_TUPLES = OBJECT_FREEZE([
  OBJECT_FREEZE({
    valueSubjectId: "bazi.engineering.weights.values.v1",
    projectionDigest: "7321a50bd8d46a0c4d5dce816544c6999c1e7e356bf4a33262b38f7408f02fd4"
  }),
  OBJECT_FREEZE({
    valueSubjectId: "bazi.engineering.weights.dispatch.v1",
    projectionDigest: "29f672fd738d2ace9fb6def48c8ff061f63f94d4fccf9e817d6d82dcb6290d8d"
  }),
  OBJECT_FREEZE({
    valueSubjectId: "bazi.engineering.weights.guard-and-consumers.v1",
    projectionDigest: "bbd5aee0c69926cd582bfc15782db3876c2d8d145d7796c469c001f8f0b25716"
  })
]);
const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 13295,
  rawSha256: "0b221bfc2669310298d9082711ad111b205c5881e419a90f92776229102f53c1",
  candidateDigest: "95a1edb8d0228231229b561c97fd4960385e581cef87c3e1f2aa57e979c12c5b"
});
const VERIFIED_RESULTS = new WeakSet();

export class BaziPolicyWeightsVersionAwareCandidateError extends Error {
  constructor(code, message, cause) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "BaziPolicyWeightsVersionAwareCandidateError";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new BaziPolicyWeightsVersionAwareCandidateError(code, message, cause);
}

function cloneJson(value) {
  return REFLECT_APPLY(JSON_PARSE, JSON, [REFLECT_APPLY(JSON_STRINGIFY, JSON, [value])]);
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object") return value;
  if (REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [value, keys[index]]);
    if (!descriptor || !("value" in descriptor)) {
      fail("NON_PASSIVE_OBJECT", "只接受无 accessor 的被动 JSON 值。");
    }
    deepFreeze(descriptor.value, seen);
  }
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function canonicalStringify(value) {
  if (value === null || typeof value !== "object") {
    return REFLECT_APPLY(JSON_STRINGIFY, JSON, [value]);
  }
  if (REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value])) {
    let text = "[";
    for (let index = 0; index < value.length; index += 1) {
      if (index > 0) text += ",";
      text += canonicalStringify(value[index]);
    }
    return `${text}]`;
  }
  const keys = [];
  const ownKeys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
  for (let index = 0; index < ownKeys.length; index += 1) {
    if (typeof ownKeys[index] !== "string") fail("NON_JSON_KEY", "JSON 工件不能含 symbol key。");
    const descriptor = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [value, ownKeys[index]]);
    if (!descriptor || !("value" in descriptor)) {
      fail("NON_PASSIVE_OBJECT", "JSON 工件不能含 accessor。");
    }
    REFLECT_APPLY(ARRAY_PUSH, keys, [ownKeys[index]]);
  }
  REFLECT_APPLY(ARRAY_SORT, keys, []);
  let text = "{";
  for (let index = 0; index < keys.length; index += 1) {
    if (index > 0) text += ",";
    const key = keys[index];
    text += `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [key])}:${canonicalStringify(value[key])}`;
  }
  return `${text}}`;
}

function exactJson(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function sha256Bytes(bytes) {
  const hash = CRYPTO_CREATE_HASH("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [bytes]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function domainSeparatedDigest(domain, value) {
  const hash = CRYPTO_CREATE_HASH("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [domain, "utf8"]);
  REFLECT_APPLY(HASH_UPDATE, hash, ["\0", "utf8"]);
  REFLECT_APPLY(HASH_UPDATE, hash, [canonicalStringify(value), "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function serialize(value) {
  return `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [value, null, 2])}\n`;
}

function snapshotForValue(value) {
  const bytes = REFLECT_APPLY(BUFFER_FROM, NATIVE_BUFFER, [serialize(value), "utf8"]);
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [{
    rawBytes: REFLECT_APPLY(TYPED_ARRAY_BYTE_LENGTH_GETTER, bytes, []),
    rawSha256: sha256Bytes(bytes),
    bytes
  }]);
}

export function computeBaziPolicyWeightsVersionAwareCandidateDigest(value) {
  const unsigned = cloneJson(value);
  delete unsigned.candidateDigest;
  return domainSeparatedDigest(CANDIDATE_DIGEST_DOMAIN, unsigned);
}

function assertCandidateGap(result) {
  if (!isVerifiedBaziEngineeringValueSubjectGapVersionAwareCandidate(result)) {
    fail("CANDIDATE_GAP_BRAND_REQUIRED", "必须消费同根 engineering gap v1.1 WeakSet 品牌。");
  }
  if (result.versionAwareCandidateEngineeringValueSubjectGapMechanicallyVerified !== true
    || result.ledgerId !== CANDIDATE_GAP.ledgerId
    || result.ledgerDigest !== CANDIDATE_GAP.ledgerDigest
    || result.artifact?.path !== CANDIDATE_GAP.path
    || result.artifact?.bytes !== CANDIDATE_GAP.rawBytes
    || result.artifact?.sha256 !== CANDIDATE_GAP.rawSha256
    || result.activeAdmissionEffect !== "none"
    || result.versionAwareCandidateParentArtifacts !== 2
    || result.historicalValueSubjectProjectionReusedAfterRawIdentityMatch !== true
    || result.bindingInventoryChanged !== false
    || result.parallelBindingsCreated !== 0
    || result.currentBindings !== 12
    || result.engineeringBindingsScoped !== 7
    || result.engineeringValueSubjectsObserved !== 33
    || result.valueSubjectsFreezeEligible !== 0
    || result.bindingRequired !== 12
    || result.bindingFrozenVerified !== 0
    || result.distributionPolicy !== "link_only"
    || result.formalSourceRightsRecordCount !== 0
    || result.formalSourceCarrierRecordCount !== 0
    || result.candidateNoticeProjectionReconciliationsResolved !== 1
    || result.activeNoticeDiscrepancyPromotionBlocks !== 1
    || result.candidateNoticeProjectionDiscrepancyPromotionBlocks !== 0
    || result.formalAdmissionPromotionBlocked !== true
    || result.formalActivationAllowed !== false
    || result.contentTruthEstablished !== false
    || result.expertTruthEstablished !== false
    || result.rightsLegalConclusionEstablished !== false
    || result.browserRuntimeEvidenceEstablished !== false
    || result.releaseReady !== false
    || result.publicDeploymentAuthorized !== false
    || result.expertClaimsAuthorized !== false
    || result.crossFileAtomicSnapshot !== false
    || result.mutationEpochAvailable !== false
    || result.mutationEpochReceipt !== null
    || result.intervalMutationExcludedAcrossFiles !== false
    || result.abaExcluded !== false) {
    fail("CANDIDATE_GAP_TUPLE_MISMATCH", "engineering gap v1.1 固定 tuple 或红门漂移。");
  }
  let scopedRow = null;
  let scopedRowCount = 0;
  const engineeringBindings = result.ledger?.engineeringBindings;
  if (!engineeringBindings || engineeringBindings.length !== 7) {
    fail("CANDIDATE_GAP_SCOPED_ROW_MISMATCH", "engineering gap 必须精确含七条工程 binding。");
  }
  for (let index = 0; index < engineeringBindings.length; index += 1) {
    if (engineeringBindings[index].bindingId === "binding:policy:weights") {
      scopedRow = engineeringBindings[index];
      scopedRowCount += 1;
    }
  }
  if (scopedRowCount !== 1
    || scopedRow?.order !== 4
    || scopedRow?.evidenceSubjectId !== "bazi.strength.binding.policy.weights.v1"
    || scopedRow?.candidateId !== "hakimi-strength-weights-0.1.0-engineering-candidate-v1"
    || scopedRow?.originType !== "project_engineering_heuristic"
    || scopedRow?.authorityBoundary !==
      "engineering_definition_only_no_classical_or_expert_authority"
    || scopedRow?.valueSubjectCount !== 3
    || scopedRow?.valueSubjects?.length !== 3
    || scopedRow?.valueSubjectCoverageComplete !== false
    || scopedRow?.engineeringRationaleFrozen !== false
    || scopedRow?.firstPartyAuthorshipLegallyEstablished !== false
    || scopedRow?.independentEngineeringReviewIds?.length !== 0
    || scopedRow?.independentDomainReviewIds?.length !== 0
    || scopedRow?.bindingFreezeEligible !== false
    || scopedRow?.freezeState !== "candidate_only_unbound"
    || scopedRow?.freezeEffect !== "none") {
    fail("CANDIDATE_GAP_SCOPED_ROW_MISMATCH", "policy weights gap 行或失败关闭边界漂移。");
  }
  for (let index = 0; index < EXPECTED_VALUE_SUBJECT_TUPLES.length; index += 1) {
    const subject = scopedRow.valueSubjects[index];
    const expected = EXPECTED_VALUE_SUBJECT_TUPLES[index];
    if (subject?.valueSubjectId !== expected.valueSubjectId
      || subject?.projectionDigest !== expected.projectionDigest
      || subject?.sourceOrRationaleRefs?.length !== 0
      || subject?.valueProvenanceFrozen !== false
      || subject?.independentDomainReviewed !== false
      || subject?.freezeEffect !== "none") {
      fail("CANDIDATE_GAP_SCOPED_SUBJECT_MISMATCH", "policy weights value-subject tuple 漂移。");
    }
  }
  return scopedRow;
}

function assertCandidateReadiness(result) {
  if (!isVerifiedBaziBindingFreezeRequirementsV17(result)) {
    fail("CANDIDATE_READINESS_BRAND_REQUIRED", "必须消费同根 candidate readiness WeakSet 品牌。");
  }
  if (result.versionAwareCandidateReadinessMechanicallyVerified !== true
    || result.ledgerId !== CANDIDATE_READINESS.ledgerId
    || result.ledgerDigest !== CANDIDATE_READINESS.ledgerDigest
    || result.artifact?.path !== CANDIDATE_READINESS.path
    || result.artifact?.bytes !== CANDIDATE_READINESS.rawBytes
    || result.artifact?.sha256 !== CANDIDATE_READINESS.rawSha256
    || result.activeAdmissionEffect !== "none"
    || result.candidateNoticeProjectionReconciliationsResolved !== 1
    || result.activeNoticeDiscrepancyPromotionBlocks !== 1
    || result.candidateNoticeProjectionDiscrepancyPromotionBlocks !== 0
    || result.formalAdmissionPromotionBlocked !== true
    || result.bindingRequired !== 12
    || result.bindingFrozenVerified !== 0
    || result.formalSourceRightsRecordCount !== 0
    || result.formalSourceCarrierRecordCount !== 0
    || result.sourceBundleComplete !== false
    || result.rightsBundleComplete !== false
    || result.expertReviewBundleComplete !== false
    || result.distributionPolicy !== "link_only"
    || result.releaseReady !== false
    || result.publicDeploymentAuthorized !== false
    || result.expertClaimsAuthorized !== false
    || result.crossFileAtomicSnapshot !== false
    || result.mutationEpochAvailable !== false
    || result.mutationEpochReceipt !== null
    || result.intervalMutationExcludedAcrossFiles !== false
    || result.abaExcluded !== false) {
    fail("CANDIDATE_READINESS_TUPLE_MISMATCH", "candidate readiness 固定 tuple 或红门漂移。");
  }
  let scopedRow = null;
  let scopedRowCount = 0;
  const bindings = result.readiness?.bindings;
  if (!bindings || bindings.length !== 12) {
    fail("CANDIDATE_READINESS_SCOPED_ROW_MISMATCH", "readiness 必须精确含十二条 binding。");
  }
  for (let index = 0; index < bindings.length; index += 1) {
    if (bindings[index].bindingId === "binding:policy:weights") {
      scopedRow = bindings[index];
      scopedRowCount += 1;
    }
  }
  if (scopedRowCount !== 1
    || scopedRow?.order !== 4
    || scopedRow?.evidenceSubjectId !== "bazi.strength.binding.policy.weights.v1"
    || scopedRow?.sourceId !== "hakimi-strength-policy-0.1.0"
    || scopedRow?.sourceType !== "engineering_contract"
    || scopedRow?.evidenceRole !== "defines_engineering_candidate"
    || scopedRow?.candidateState !== "project_engineering_candidate_envelope"
    || scopedRow?.candidateIds?.length !== 1
    || scopedRow.candidateIds[0] !== "hakimi-strength-weights-0.1.0-engineering-candidate-v1"
    || scopedRow?.candidateQuoteDigestCount !== 0
    || scopedRow?.currentDistributionBoundary !==
      "local_repository_only_no_distribution_clearance"
    || scopedRow?.freezeState !== "candidate_only_unbound"
    || scopedRow?.sourceBodyStored !== false
    || scopedRow?.sourceBodyDigest !== null
    || scopedRow?.exactQuoteTextStored !== false
    || scopedRow?.exactQuoteDigest !== null
    || scopedRow?.exactLocatorEstablishedForFreeze !== false
    || scopedRow?.workIdentityFrozen !== false
    || scopedRow?.editionIdentityFrozen !== false
    || scopedRow?.carrierIdentityFrozen !== false
    || scopedRow?.engineeringRationaleFrozen !== false
    || scopedRow?.ruleIds?.length !== 0
    || scopedRow?.workRightsEvidenceBound !== false
    || scopedRow?.editionRightsEvidenceBound !== false
    || scopedRow?.carrierRightsEvidenceBound !== false
    || scopedRow?.sourceRightsRecordId !== null
    || scopedRow?.sourceCarrierRecordId !== null
    || scopedRow?.formalDistributionPolicy !== null
    || scopedRow?.independentSourceRightsReviewerIds?.length !== 0
    || scopedRow?.independentDomainReviewIds?.length !== 0
    || scopedRow?.traditionalAuthorityClaimed !== false
    || scopedRow?.parameterAuthorityClaimed !== false
    || scopedRow?.frozenAt !== null
    || scopedRow?.supersedes !== null
    || scopedRow?.supersededBy !== null
    || scopedRow?.bindingDigest !== null) {
    fail("CANDIDATE_READINESS_SCOPED_ROW_MISMATCH", "policy weights readiness 行或红门漂移。");
  }
  return scopedRow;
}

async function readHistoricalPolicy(workspaceRoot) {
  const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, HISTORICAL_POLICY.path);
  if (snapshot.rawBytes !== HISTORICAL_POLICY.rawBytes
    || snapshot.rawSha256 !== HISTORICAL_POLICY.rawSha256) {
    fail("HISTORICAL_POLICY_RAW_DRIFT", "历史 policy weights candidate raw identity 漂移。");
  }
  const candidate = parseBaziDttStrictJsonArtifact(snapshot);
  if (candidate.schemaVersion !== HISTORICAL_POLICY.schemaVersion
    || candidate.recordType !== HISTORICAL_POLICY.recordType
    || candidate.candidateId !== HISTORICAL_POLICY.candidateId
    || candidate.candidateDigest !== HISTORICAL_POLICY.candidateDigest
    || candidate.status !== HISTORICAL_POLICY.status
    || candidate.createdAt !== HISTORICAL_POLICY.createdAt
    || domainSeparatedDigest(HISTORICAL_DIGEST_DOMAIN, (() => {
      const unsigned = cloneJson(candidate);
      delete unsigned.candidateDigest;
      return unsigned;
    })()) !== candidate.candidateDigest
    || candidate.basisArtifacts?.length !== 5
    || candidate.policyBinding?.bindingId !== "binding:policy:weights"
    || candidate.policyBinding?.valueSubjectIds?.length !== 3
    || candidate.valueEvidenceRecords?.length !== 3
    || candidate.parentLedgerRefs?.engineeringCandidateLedgerId !== ENGINEERING_PARENT.ledgerId
    || candidate.parentLedgerRefs?.engineeringCandidateLedgerDigest !== ENGINEERING_PARENT.ledgerDigest
    || candidate.scopeBoundary?.newBindingIdentityCreated !== false
    || candidate.scopeBoundary?.formalLifecycleIntegrationAssessed !== false
    || candidate.authorityBoundary?.bindingFreezeEligible !== false
    || candidate.authorityBoundary?.bindingFrozenVerified !== false
    || candidate.authorityBoundary?.contentTruthEstablished !== false
    || candidate.authorityBoundary?.expertTruthEstablished !== false
    || candidate.authorityBoundary?.rightsLegalConclusionEstablished !== false
    || candidate.authorityBoundary?.releaseReady !== false
    || candidate.authorityBoundary?.publicDeploymentAuthorized !== false
    || candidate.gateSummary?.currentPolicyWeightValuesObserved !== 4
    || candidate.gateSummary?.scopedValueSubjectsObserved !== 3
    || candidate.gateSummary?.bindingFreezeEligible !== false
    || candidate.gateSummary?.bindingFrozenVerified !== false
    || candidate.gateSummary?.formalActivationAllowed !== false
    || candidate.observationBoundary?.crossFileAtomicSnapshot !== false
    || candidate.observationBoundary?.mutationEpochAvailableForSchema13 !== false
    || candidate.observationBoundary?.mutationEpochReceipt !== null
    || candidate.observationBoundary?.intervalMutationExcluded !== false
    || candidate.observationBoundary?.abaExcluded !== false) {
    fail("HISTORICAL_POLICY_SEMANTIC_DRIFT", "历史 policy candidate identity 或红门漂移。");
  }
  return { candidate, snapshot };
}

async function verifyUnchangedBasis(workspaceRoot, entries) {
  const verified = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, entry.path);
    if (snapshot.rawBytes !== entry.bytes || snapshot.rawSha256 !== entry.sha256) {
      fail("UNCHANGED_BASIS_RAW_DRIFT", `${entry.path} raw identity 漂移。`);
    }
    REFLECT_APPLY(ARRAY_PUSH, verified, [{
      path: entry.path,
      role: entry.role,
      bytes: entry.bytes,
      sha256: entry.sha256,
      pointInTimeRawIdentityVerified: true,
      currentProjectionInspectionReexecutedByThisLayer: false
    }]);
  }
  return verified;
}

async function buildExpectedBundle(workspaceRoot) {
  const candidateGap = await loadBaziEngineeringValueSubjectGapVersionAwareCandidate(workspaceRoot);
  const scopedGapRow = assertCandidateGap(candidateGap);
  const candidateReadiness = await loadBaziBindingFreezeRequirementsV17(workspaceRoot);
  const scopedReadinessRow = assertCandidateReadiness(candidateReadiness);
  const historical = await readHistoricalPolicy(workspaceRoot);
  if (!exactJson(scopedGapRow.valueSubjects, historical.candidate.valueEvidenceRecords)
    || scopedGapRow.candidateId !== historical.candidate.policyBinding.engineeringCandidateId
    || scopedReadinessRow.candidateIds[0]
      !== historical.candidate.policyBinding.engineeringCandidateId) {
    fail("SCOPED_POLICY_PROJECTION_MISMATCH", "两个品牌父账未与历史三项 policy 投影精确交叉一致。");
  }
  const unchangedDefinitions = [
    historical.candidate.basisArtifacts[0],
    historical.candidate.basisArtifacts[3],
    historical.candidate.basisArtifacts[4]
  ];
  const unchangedBasis = await verifyUnchangedBasis(workspaceRoot, unchangedDefinitions);
  if (unchangedBasis.length !== 3) {
    fail("UNCHANGED_BASIS_COUNT_MISMATCH", "必须精确复核三项未变工程 basis。");
  }
  const basisArtifacts = [];
  REFLECT_APPLY(ARRAY_PUSH, basisArtifacts, [unchangedBasis[0]]);
  REFLECT_APPLY(ARRAY_PUSH, basisArtifacts, [{
    path: CANDIDATE_GAP.path,
    role: "version_aware_engineering_value_subject_gap_candidate_parent",
    bytes: CANDIDATE_GAP.rawBytes,
    sha256: CANDIDATE_GAP.rawSha256,
    pointInTimeRawIdentityVerified: true,
    currentProjectionInspectionReexecutedByThisLayer: false
  }]);
  REFLECT_APPLY(ARRAY_PUSH, basisArtifacts, [{
    path: CANDIDATE_READINESS.path,
    role: "version_aware_candidate_readiness_parent",
    bytes: CANDIDATE_READINESS.rawBytes,
    sha256: CANDIDATE_READINESS.rawSha256,
    pointInTimeRawIdentityVerified: true,
    currentProjectionInspectionReexecutedByThisLayer: false
  }]);
  REFLECT_APPLY(ARRAY_PUSH, basisArtifacts, [unchangedBasis[1]]);
  REFLECT_APPLY(ARRAY_PUSH, basisArtifacts, [unchangedBasis[2]]);
  const doesNotEstablish = cloneJson(historical.candidate.doesNotEstablish);
  REFLECT_APPLY(ARRAY_PUSH, doesNotEstablish, ["active_readiness_or_formal_admission"]);
  REFLECT_APPLY(ARRAY_PUSH, doesNotEstablish, ["formal_parent_identity"]);
  const unsigned = {
    schemaVersion: "1.1.0",
    recordType: "bazi_policy_weights_value_evidence_version_aware_candidate_v1_1",
    candidateId: "hakimi.bazi/policy-weights-value-evidence.version-aware-candidate/1.1.0",
    status: "candidate_only_version_aware_repository_values_observed_not_freeze_eligible",
    createdAt: "2026-08-30T00:00:00.000Z",
    releaseGovernance: cloneJson(historical.candidate.releaseGovernance),
    historicalLineage: {
      ...HISTORICAL_POLICY,
      role: "fixed_policy_weight_projection_template_only_not_current_capability"
    },
    versionedCandidateParentRebind: {
      activeAdmissionEffect: "none",
      candidateGapWeakSetBrandVerified: true,
      candidateReadinessWeakSetBrandVerified: true,
      candidateGap: CANDIDATE_GAP,
      candidateReadiness: CANDIDATE_READINESS,
      versionAwareCandidateParentArtifacts: 2,
      bindingIdentityChanged: false,
      policyWeightValueProjectionChanged: false,
      formalActivationAllowed: false
    },
    scopeBoundary: {
      ...cloneJson(historical.candidate.scopeBoundary),
      versionAwareCandidateParentRebound: true,
      activeAdmissionEffect: "none"
    },
    observationBoundary: {
      directHistoricalPolicyRawAndSemanticIdentityVerified: true,
      historicalPolicyWeightProjectionReusedAfterUnchangedDirectEngineeringBasisRawIdentityMatchAndBrandedParentRebind:
        true,
      unchangedDirectBasisPointInTimeRawIdentitiesVerified: unchangedBasis.length,
      upstreamBrandedDependenciesVerified: true,
      nestedVerifierSameBufferTransitivityClaimed: false,
      stableExecutableSyntaxProjectionReusedAfterRawIdentityMatch: true,
      generalControlFlowEquivalenceMechanicallyEstablished: false,
      generalDataFlowEquivalenceMechanicallyEstablished: false,
      runtimeExecutionObserved: false,
      endpointSnapshotOnly: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      intervalMutationExcluded: false,
      abaExcluded: false
    },
    policyBinding: cloneJson(historical.candidate.policyBinding),
    basisArtifacts,
    parentLedgerRefs: {
      engineeringCandidateLedgerId: ENGINEERING_PARENT.ledgerId,
      engineeringCandidateLedgerDigest: ENGINEERING_PARENT.ledgerDigest,
      valueSubjectGapLedgerId: CANDIDATE_GAP.ledgerId,
      valueSubjectGapLedgerDigest: CANDIDATE_GAP.ledgerDigest,
      freezeRequirementsLedgerId: CANDIDATE_READINESS.ledgerId,
      freezeRequirementsLedgerDigest: CANDIDATE_READINESS.ledgerDigest,
      parentLedgersResigned: false,
      activeAdmissionEffect: "none"
    },
    valueEvidenceRecords: cloneJson(historical.candidate.valueEvidenceRecords),
    externalEvidence: cloneJson(historical.candidate.externalEvidence),
    authorityBoundary: cloneJson(historical.candidate.authorityBoundary),
    gateSummary: {
      ...cloneJson(historical.candidate.gateSummary),
      versionAwareCandidateParentArtifacts: 2,
      historicalPolicyWeightProjectionReusedAfterUnchangedDirectEngineeringBasisRawIdentityMatchAndBrandedParentRebind:
        true,
      bindingIdentityChanged: false,
      parallelBindingsCreated: 0,
      activeAdmissionEffect: "none",
      formalAdmissionPromotionBlocked: true
    },
    digestBoundary: {
      ...cloneJson(historical.candidate.digestBoundary),
      domain: CANDIDATE_DIGEST_DOMAIN
    },
    doesNotEstablish
  };
  const candidate = deepFreeze({
    ...unsigned,
    candidateDigest: computeBaziPolicyWeightsVersionAwareCandidateDigest(unsigned)
  });
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [{
    candidate,
    snapshot: snapshotForValue(candidate)
  }]);
}

function assertExpectedRawPins(snapshot, candidate) {
  if (EXPECTED_PERSISTED.rawBytes <= 0
    || EXPECTED_PERSISTED.rawSha256.length !== 64
    || EXPECTED_PERSISTED.candidateDigest.length !== 64) {
    fail("RAW_PIN_NOT_FROZEN", "policy weights v1.1 raw／semantic identity 尚未冻结。");
  }
  if (snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
    || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256) {
    fail("PERSISTED_RAW_DRIFT", "policy weights v1.1 raw identity 漂移。");
  }
  if (candidate.candidateDigest !== EXPECTED_PERSISTED.candidateDigest
    || computeBaziPolicyWeightsVersionAwareCandidateDigest(candidate)
      !== candidate.candidateDigest) {
    fail("PERSISTED_DIGEST_DRIFT", "policy weights v1.1 semantic digest 漂移。");
  }
}

export async function loadBaziPolicyWeightsVersionAwareCandidate(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])
) {
  const expected = await buildExpectedBundle(workspaceRoot);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    BAZI_POLICY_WEIGHTS_VERSION_AWARE_CANDIDATE_RELATIVE_PATH
  );
  const persisted = parseBaziDttStrictJsonArtifact(snapshot);
  if (!exactJson(persisted, expected.candidate)) {
    fail("POLICY_V11_MISMATCH", "持久化 policy weights v1.1 不等于允许的版本化候选投影。");
  }
  assertExpectedRawPins(snapshot, persisted);
  const result = deepFreeze({
    versionAwarePolicyWeightsCandidateMechanicallyVerified: true,
    activeAdmissionEffect: "none",
    candidateId: persisted.candidateId,
    candidateDigest: persisted.candidateDigest,
    artifact: {
      path: BAZI_POLICY_WEIGHTS_VERSION_AWARE_CANDIDATE_RELATIVE_PATH,
      bytes: snapshot.rawBytes,
      sha256: snapshot.rawSha256
    },
    versionAwareCandidateParentArtifacts: 2,
    historicalPolicyWeightProjectionReusedAfterUnchangedDirectEngineeringBasisRawIdentityMatchAndBrandedParentRebind:
      true,
    bindingIdentityChanged: false,
    parallelBindingsCreated: 0,
    bindingId: "binding:policy:weights",
    policyVersion: "hakimi.bazi.strength_policy/0.1.0",
    policyWeightValueKeysObserved: 4,
    scopedValueSubjectCount: 3,
    stablePolicyDispatchSyntaxObserved: true,
    directConsumerCallShapeCount: 3,
    sourceEvidenceRefsBound: 0,
    formalSourceRightsRecordCount: 0,
    formalSourceCarrierRecordCount: 0,
    engineeringRationalesFrozen: 0,
    engineeringReviewsVerified: 0,
    expertReviewsVerified: 0,
    independentDomainReviewsVerified: 0,
    bindingFreezeEligible: false,
    scopedBindingFrozenVerified: false,
    scopedWeightsCurrentDistributionBoundary:
      "local_repository_only_no_distribution_clearance",
    sourceBundleComplete: false,
    rightsBundleComplete: false,
    expertReviewBundleComplete: false,
    formalAdmissionPromotionBlocked: true,
    formalActivationAllowed: false,
    contentTruthEstablished: false,
    expertTruthEstablished: false,
    rightsLegalConclusionEstablished: false,
    browserRuntimeEvidenceEstablished: false,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false,
    crossFileAtomicSnapshot: false,
    mutationEpochAvailableForSchema13: false,
    mutationEpochReceipt: null,
    intervalMutationExcludedAcrossFiles: false,
    abaExcluded: false
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedBaziPolicyWeightsVersionAwareCandidate(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value]);
}

export const baziPolicyWeightsVersionAwareCandidateTestOnly = OBJECT_FREEZE({
  HISTORICAL_POLICY,
  CANDIDATE_GAP,
  CANDIDATE_READINESS,
  ENGINEERING_PARENT,
  EXPECTED_PERSISTED,
  assertCandidateGap,
  assertCandidateReadiness,
  buildExpectedBundle,
  serialize,
  exactJson
});
