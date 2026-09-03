import { createHash } from "node:crypto";

import {
  isVerifiedBaziPr10bcVersionAwareCandidate,
  loadBaziPr10bcVersionAwareCandidate
} from "./bazi-pr10bc-version-aware-candidate-lib.mjs";
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
const ARRAY_SLICE = Array.prototype.slice;
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

export const BAZI_ENGINEERING_VALUE_SUBJECT_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH =
  "content/system-admission/bazi-engineering-binding-value-subject-gaps.v1.1.0.json";

const HISTORICAL_GAP = OBJECT_FREEZE({
  path: "content/system-admission/bazi-engineering-binding-value-subject-gaps.v1.json",
  rawBytes: 52073,
  rawSha256: "5c7a999738200b55f5e3e79a3ff7b2c73f59d8af61846046d26ea1e31987c4c0",
  ledgerId: "hakimi.bazi.engineering_binding_value_subject_gaps/1.0.0",
  ledgerDigest: "7a03874b6009928367bf8c5aa60a1312d519d0f8c4ee339c83bc7a40f0b8e81d",
  schemaVersion: "1.0.0",
  recordType: "bazi_engineering_binding_value_subject_gap_v1",
  status: "candidate_only_value_subject_gaps_open",
  createdAt: "2026-08-29T00:00:00.000Z"
});
const CANDIDATE_PR10BC = OBJECT_FREEZE({
  path: "content/system-admission/bazi-pr10bc-scope-reconciliation.v1.1.0.json",
  rawBytes: 38161,
  rawSha256: "edb367448f857972e50c735e86acc5252605a0b4d27a2f85c996fcd67d0ed2cc",
  ledgerId: "hakimi.bazi.pr10bc.version-aware-candidate-scope-reconciliation/1.1.0",
  ledgerDigest: "24851de28a762c426e2630c9a52666786274c3c5477b9fc0463f9129e43d20d1"
});
const CANDIDATE_READINESS = OBJECT_FREEZE({
  path: "content/system-admission/bazi-binding-freeze-requirements.v1.7.0.json",
  rawBytes: 32629,
  rawSha256: "7565a1c1ae51c09c78cf8f906e544bd8ee822020f76587237bc909ef1e6408a2",
  ledgerId: "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.7.0",
  ledgerDigest: "afdebfa1fb7a797f02d136373eb9aef1afa26b38b755926f8930ea5de97316b8"
});
const RELEASE_GOVERNANCE = OBJECT_FREEZE({
  activeLine: "legacy-v13",
  targetSchema: 13,
  migrationId: null,
  mutationEpochBoundaryRequired: true,
  publicDeploymentAuthorized: false,
  expertClaimsAuthorized: false
});
const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 71168,
  rawSha256: "f8ed780ce8e3fbaca59b295faff2f12b939a8b0c193bc0c20ce1198690528d4e",
  ledgerDigest: "d578b6e76c325bf79593b728b78035d3481ec60fa7fb99c815748d9f806a8330"
});
const VERIFIED_RESULTS = new WeakSet();

export class BaziEngineeringValueSubjectGapVersionAwareCandidateError extends Error {
  constructor(code, message, cause) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "BaziEngineeringValueSubjectGapVersionAwareCandidateError";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new BaziEngineeringValueSubjectGapVersionAwareCandidateError(code, message, cause);
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

function sha256Canonical(value) {
  return sha256Bytes(REFLECT_APPLY(BUFFER_FROM, NATIVE_BUFFER, [canonicalStringify(value), "utf8"]));
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

export function computeBaziEngineeringValueSubjectGapVersionAwareCandidateDigest(value) {
  const unsigned = cloneJson(value);
  delete unsigned.ledgerDigest;
  return sha256Canonical(unsigned);
}

function assertCandidatePr10bc(result) {
  if (!isVerifiedBaziPr10bcVersionAwareCandidate(result)) {
    fail("CANDIDATE_PR10BC_BRAND_REQUIRED", "必须消费同根 PR10BC v1.1 WeakSet 品牌。");
  }
  const inventory = result.ledger?.currentBindingInventory;
  if (result.ledgerId !== CANDIDATE_PR10BC.ledgerId
    || result.ledgerDigest !== CANDIDATE_PR10BC.ledgerDigest
    || result.artifact?.path !== CANDIDATE_PR10BC.path
    || result.artifact?.bytes !== CANDIDATE_PR10BC.rawBytes
    || result.artifact?.sha256 !== CANDIDATE_PR10BC.rawSha256
    || result.activeAdmissionEffect !== "none"
    || result.scopeProjectionsReproduced !== 9
    || result.dttAdjacentCandidateReferenceRebinds !== 3
    || result.uniqueSupersedingSourceCandidateParents !== 1
    || result.parallelBindingsCreated !== 0
    || inventory?.exactRegisteredSourceBindings !== 12
    || inventory?.projectEngineeringBindings !== 7
    || inventory?.historicalTextBindings !== 4
    || inventory?.reviewGateBindings !== 1
    || result.bindingRequired !== 12
    || result.bindingFrozenVerified !== 0
    || result.distributionPolicy !== "link_only"
    || result.formalSourceRightsRecordCount !== 0
    || result.formalSourceCarrierRecordCount !== 0
    || result.candidateNoticeProjectionReconciliationsResolved !== 1
    || result.activeNoticeDiscrepancyPromotionBlocks !== 1
    || result.candidateNoticeProjectionDiscrepancyPromotionBlocks !== 0
    || result.formalAdmissionPromotionBlocked !== true
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
    fail("CANDIDATE_PR10BC_TUPLE_MISMATCH", "PR10BC v1.1 固定 tuple 或失败关闭边界漂移。");
  }
}

function assertCandidateReadiness(result) {
  if (!isVerifiedBaziBindingFreezeRequirementsV17(result)) {
    fail("CANDIDATE_READINESS_BRAND_REQUIRED", "必须消费同根 candidate readiness WeakSet 品牌。");
  }
  if (result.ledgerId !== CANDIDATE_READINESS.ledgerId
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
    || result.distributionPolicy !== "link_only"
    || result.releaseReady !== false
    || result.publicDeploymentAuthorized !== false
    || result.expertClaimsAuthorized !== false
    || result.crossFileAtomicSnapshot !== false
    || result.mutationEpochAvailable !== false
    || result.mutationEpochReceipt !== null
    || result.intervalMutationExcludedAcrossFiles !== false
    || result.abaExcluded !== false) {
    fail("CANDIDATE_READINESS_TUPLE_MISMATCH", "candidate readiness 固定 tuple 或失败关闭边界漂移。");
  }
}

async function readHistoricalGap(workspaceRoot) {
  const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, HISTORICAL_GAP.path);
  if (snapshot.rawBytes !== HISTORICAL_GAP.rawBytes
    || snapshot.rawSha256 !== HISTORICAL_GAP.rawSha256) {
    fail("HISTORICAL_GAP_RAW_DRIFT", "历史 engineering gap raw identity 漂移。");
  }
  const ledger = parseBaziDttStrictJsonArtifact(snapshot);
  let engineeringValueSubjectsObserved = 0;
  if (ledger.engineeringBindings) {
    for (let index = 0; index < ledger.engineeringBindings.length; index += 1) {
      engineeringValueSubjectsObserved +=
        ledger.engineeringBindings[index].valueSubjects?.length ?? 0;
    }
  }
  if (ledger.schemaVersion !== HISTORICAL_GAP.schemaVersion
    || ledger.recordType !== HISTORICAL_GAP.recordType
    || ledger.ledgerId !== HISTORICAL_GAP.ledgerId
    || ledger.ledgerDigest !== HISTORICAL_GAP.ledgerDigest
    || ledger.status !== HISTORICAL_GAP.status
    || ledger.createdAt !== HISTORICAL_GAP.createdAt
    || computeBaziEngineeringValueSubjectGapVersionAwareCandidateDigest(ledger)
      !== ledger.ledgerDigest
    || !exactJson(ledger.releaseGovernance, RELEASE_GOVERNANCE)
    || ledger.currentBindingInventory?.bindingIds?.length !== 12
    || ledger.currentBindingInventory?.engineeringBindingIds?.length !== 7
    || ledger.currentBindingInventory?.bindingFrozenVerified !== 0
    || ledger.engineeringBindings?.length !== 7
    || engineeringValueSubjectsObserved !== 33
    || ledger.gateSummary?.valueSubjectsFreezeEligible !== 0
    || ledger.gateSummary?.bindingFrozenVerified !== 0
    || ledger.gateSummary?.formalSourceRightsRecords !== 0
    || ledger.gateSummary?.formalSourceCarrierRecords !== 0
    || ledger.gateSummary?.formalActivationAllowed !== false
    || ledger.gateSummary?.contentTruthEstablished !== false
    || ledger.gateSummary?.expertTruthEstablished !== false
    || ledger.gateSummary?.rightsLegalConclusionEstablished !== false
    || ledger.gateSummary?.browserRuntimeEvidenceEstablished !== false
    || ledger.gateSummary?.releaseReady !== false
    || ledger.gateSummary?.publicDeploymentAuthorized !== false
    || ledger.gateSummary?.expertClaimsAuthorized !== false
    || ledger.observationBoundary?.crossFileAtomicSnapshot !== false
    || ledger.observationBoundary?.mutationEpochAvailableForSchema13 !== false
    || ledger.observationBoundary?.mutationEpochReceipt !== null
    || ledger.observationBoundary?.intervalMutationExcluded !== false
    || ledger.observationBoundary?.abaExcluded !== false) {
    fail("HISTORICAL_GAP_SEMANTIC_DRIFT", "历史 engineering gap semantic identity 或红门漂移。");
  }
  return { ledger, snapshot };
}

async function verifyUnchangedBasis(workspaceRoot, basisArtifacts) {
  const verified = [];
  for (let index = 0; index < basisArtifacts.length; index += 1) {
    const entry = basisArtifacts[index];
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, entry.path);
    if (snapshot.rawBytes !== entry.bytes || snapshot.rawSha256 !== entry.sha256) {
      fail("UNCHANGED_BASIS_RAW_DRIFT", `${entry.path} raw identity 漂移。`);
    }
    REFLECT_APPLY(ARRAY_PUSH, verified, [cloneJson(entry)]);
  }
  return verified;
}

async function buildExpectedBundle(workspaceRoot) {
  const candidatePr10bc = await loadBaziPr10bcVersionAwareCandidate(workspaceRoot);
  assertCandidatePr10bc(candidatePr10bc);
  const candidateReadiness = await loadBaziBindingFreezeRequirementsV17(workspaceRoot);
  assertCandidateReadiness(candidateReadiness);
  const historical = await readHistoricalGap(workspaceRoot);
  if (historical.ledger.basisArtifacts?.length !== 16) {
    fail("HISTORICAL_BASIS_COUNT_MISMATCH", "历史 gap 必须精确含 16 项 basis。");
  }
  const unchangedBasis = await verifyUnchangedBasis(
    workspaceRoot,
    REFLECT_APPLY(ARRAY_SLICE, historical.ledger.basisArtifacts, [2])
  );
  if (unchangedBasis.length !== 14) {
    fail("UNCHANGED_BASIS_COUNT_MISMATCH", "必须精确复核 14 项未变工程 basis。");
  }
  const basisArtifacts = [
    {
      path: CANDIDATE_PR10BC.path,
      role: "version_aware_pr10bc_candidate_parent",
      bytes: CANDIDATE_PR10BC.rawBytes,
      sha256: CANDIDATE_PR10BC.rawSha256
    },
    {
      path: CANDIDATE_READINESS.path,
      role: "version_aware_candidate_readiness_parent",
      bytes: CANDIDATE_READINESS.rawBytes,
      sha256: CANDIDATE_READINESS.rawSha256
    }
  ];
  for (let index = 0; index < unchangedBasis.length; index += 1) {
    REFLECT_APPLY(ARRAY_PUSH, basisArtifacts, [unchangedBasis[index]]);
  }
  const doesNotEstablish = cloneJson(historical.ledger.doesNotEstablish);
  REFLECT_APPLY(ARRAY_PUSH, doesNotEstablish, ["active_readiness_or_formal_admission"]);
  REFLECT_APPLY(ARRAY_PUSH, doesNotEstablish, ["formal_parent_identity"]);
  const unsigned = {
    schemaVersion: "1.1.0",
    recordType: "bazi_engineering_binding_value_subject_gap_version_aware_candidate_v1_1",
    ledgerId:
      "hakimi.bazi.engineering_binding_value_subject_gaps.version-aware-candidate/1.1.0",
    status: "candidate_only_version_aware_value_subject_gaps_open_no_binding_created",
    createdAt: "2026-08-30T00:00:00.000Z",
    releaseGovernance: RELEASE_GOVERNANCE,
    historicalLineage: {
      ...HISTORICAL_GAP,
      role: "fixed_value_subject_projection_template_only_not_current_capability"
    },
    versionedCandidateParentRebind: {
      activeAdmissionEffect: "none",
      candidatePr10bcWeakSetBrandVerified: true,
      candidateReadinessWeakSetBrandVerified: true,
      candidatePr10bc: CANDIDATE_PR10BC,
      candidateReadiness: CANDIDATE_READINESS,
      versionAwareCandidateParentArtifacts: 2,
      bindingInventoryChanged: false,
      engineeringValueSubjectProjectionChanged: false,
      formalActivationAllowed: false
    },
    scopeBoundary: {
      ...cloneJson(historical.ledger.scopeBoundary),
      versionAwareCandidateParentRebound: true,
      activeAdmissionEffect: "none"
    },
    observationBoundary: {
      directHistoricalGapRawAndSemanticIdentityVerified: true,
      historicalValueSubjectProjectionReusedAfterBasisRawIdentityMatch: true,
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
    currentBindingInventory: cloneJson(historical.ledger.currentBindingInventory),
    basisArtifacts,
    valueSubjectBoundary: cloneJson(historical.ledger.valueSubjectBoundary),
    engineeringBindings: cloneJson(historical.ledger.engineeringBindings),
    crossBindingGaps: cloneJson(historical.ledger.crossBindingGaps),
    gateSummary: {
      ...cloneJson(historical.ledger.gateSummary),
      versionAwareCandidateParentArtifacts: 2,
      historicalValueSubjectProjectionReusedAfterRawIdentityMatch: true,
      bindingInventoryChanged: false,
      parallelBindingsCreated: 0,
      activeAdmissionEffect: "none",
      formalAdmissionPromotionBlocked: true
    },
    evidenceLedger: {
      ...cloneJson(historical.ledger.evidenceLedger),
      engineeringEvidence:
        "historical_seven_binding_33_value_subject_projection_reused_after_versioned_parent_and_current_basis_raw_identity_verification"
    },
    doesNotEstablish
  };
  const ledger = deepFreeze({
    ...unsigned,
    ledgerDigest: computeBaziEngineeringValueSubjectGapVersionAwareCandidateDigest(unsigned)
  });
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [{ ledger, snapshot: snapshotForValue(ledger) }]);
}

function assertExpectedRawPins(snapshot, ledger) {
  if (EXPECTED_PERSISTED.rawBytes <= 0
    || EXPECTED_PERSISTED.rawSha256.length !== 64
    || EXPECTED_PERSISTED.ledgerDigest.length !== 64) {
    fail("RAW_PIN_NOT_FROZEN", "engineering gap v1.1 raw／semantic identity 尚未冻结。");
  }
  if (snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
    || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256) {
    fail("PERSISTED_RAW_DRIFT", "engineering gap v1.1 raw identity 漂移。");
  }
  if (ledger.ledgerDigest !== EXPECTED_PERSISTED.ledgerDigest
    || computeBaziEngineeringValueSubjectGapVersionAwareCandidateDigest(ledger)
      !== ledger.ledgerDigest) {
    fail("PERSISTED_DIGEST_DRIFT", "engineering gap v1.1 semantic digest 漂移。");
  }
}

export async function loadBaziEngineeringValueSubjectGapVersionAwareCandidate(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])
) {
  const expected = await buildExpectedBundle(workspaceRoot);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    BAZI_ENGINEERING_VALUE_SUBJECT_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH
  );
  const persisted = parseBaziDttStrictJsonArtifact(snapshot);
  if (!exactJson(persisted, expected.ledger)) {
    fail("GAP_V11_MISMATCH", "持久化 engineering gap v1.1 不等于允许的版本化候选投影。");
  }
  assertExpectedRawPins(snapshot, persisted);
  const result = deepFreeze({
    versionAwareCandidateEngineeringValueSubjectGapMechanicallyVerified: true,
    activeAdmissionEffect: "none",
    ledgerId: persisted.ledgerId,
    ledgerDigest: persisted.ledgerDigest,
    ledger: persisted,
    artifact: {
      path: BAZI_ENGINEERING_VALUE_SUBJECT_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH,
      bytes: snapshot.rawBytes,
      sha256: snapshot.rawSha256
    },
    versionAwareCandidateParentArtifacts: 2,
    historicalValueSubjectProjectionReusedAfterRawIdentityMatch: true,
    bindingInventoryChanged: false,
    parallelBindingsCreated: 0,
    currentBindings: 12,
    engineeringBindingsScoped: 7,
    engineeringValueSubjectsObserved: 33,
    valueSubjectsFreezeEligible: 0,
    bindingRequired: 12,
    bindingFrozenVerified: 0,
    distributionPolicy: "link_only",
    formalSourceRightsRecordCount: 0,
    formalSourceCarrierRecordCount: 0,
    candidateNoticeProjectionReconciliationsResolved: 1,
    activeNoticeDiscrepancyPromotionBlocks: 1,
    candidateNoticeProjectionDiscrepancyPromotionBlocks: 0,
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
    mutationEpochAvailable: false,
    mutationEpochReceipt: null,
    intervalMutationExcludedAcrossFiles: false,
    abaExcluded: false
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedBaziEngineeringValueSubjectGapVersionAwareCandidate(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value]);
}

export const baziEngineeringValueSubjectGapVersionAwareCandidateTestOnly = OBJECT_FREEZE({
  HISTORICAL_GAP,
  CANDIDATE_PR10BC,
  CANDIDATE_READINESS,
  EXPECTED_PERSISTED,
  assertCandidatePr10bc,
  assertCandidateReadiness,
  buildExpectedBundle,
  serialize,
  exactJson
});
