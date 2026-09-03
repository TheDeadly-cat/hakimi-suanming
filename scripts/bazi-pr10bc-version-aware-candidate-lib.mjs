import { createHash } from "node:crypto";

import {
  isVerifiedBaziDttVersionedParentSupersession,
  loadBaziDttVersionedParentSupersession,
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  isVerifiedBaziBindingFreezeRequirementsV17,
  loadBaziBindingFreezeRequirementsV17
} from "./bazi-dtt-version-aware-readiness-lib.mjs";

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

export const BAZI_PR10BC_VERSION_AWARE_CANDIDATE_RELATIVE_PATH =
  "content/system-admission/bazi-pr10bc-scope-reconciliation.v1.1.0.json";

const HISTORICAL_PR10BC = OBJECT_FREEZE({
  path: "content/system-admission/bazi-pr10bc-scope-reconciliation.v1.json",
  rawBytes: 31668,
  rawSha256: "0aa6dda66b5d3b47a69d1decb73220ae5811af7d779516858aeb32ef18a1abd6",
  ledgerId: "hakimi.bazi.pr10bc.scope-reconciliation/1.0.0",
  ledgerDigest: "5e742a8a92a8ca4ebf2337f5eb0866be6c962e53801e3d259de4571b0cd65116",
  schemaVersion: "1.0.0",
  status: "scope_reconciliation_only_no_binding_created",
  createdAt: "2026-08-29T00:00:00.000Z"
});
const CANDIDATE_READINESS = OBJECT_FREEZE({
  path: "content/system-admission/bazi-binding-freeze-requirements.v1.7.0.json",
  rawBytes: 32629,
  rawSha256: "7565a1c1ae51c09c78cf8f906e544bd8ee822020f76587237bc909ef1e6408a2",
  ledgerId: "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.7.0",
  ledgerDigest: "afdebfa1fb7a797f02d136373eb9aef1afa26b38b755926f8930ea5de97316b8"
});
const SOURCE_V16 = OBJECT_FREEZE({
  path: "content/bazi-strength-source-binding-candidates.v1.6.0.json",
  rawBytes: 50427,
  rawSha256: "62f6a68b99246a802bcf2055aa09a8ac8113df37a7ede1c55d8a2ea64deaea98",
  ledgerId: "hakimi.bazi.strength.source-binding-candidates/1.6.0",
  ledgerDigest: "6f008058b282613fd131344206b27fccb1d80596bb49789f0554acdd69c1e44c",
  candidateId: "dtt-chanwei-wikisource-r2600158-candidate-v2",
  candidateDigest: "2c59ee25081c6e0a88ee7f9da18395be2ea615bb289c28798e324e23befeeb59"
});
const RIGHTS_V12 = OBJECT_FREEZE({
  path: "content/bazi-strength-source-rights-candidates.v1.2.0.json",
  rawBytes: 23947,
  rawSha256: "678632a8875672f58bb5c9f1ec4a299a4f0c6e750b8ff4a02bfe4df889e1243a",
  ledgerId: "hakimi.bazi.strength.source-rights-candidates/1.2.0",
  ledgerDigest: "300e092c4913885cff626221b8734786128639c7d6cfd7c2be7bea2acc6bbefc",
  candidateId: "dtt-chanwei-wikisource-r2600158-rights-candidate-v2",
  candidateDigest: "674a0b64179f5fbb0dff331fdad6b6ac93e3093de4a8459abf6ff9bdd6cd418c"
});
const HISTORICAL_DTT_CANDIDATE_ID = "dtt-chanwei-wikisource-r2600158-candidate-v1";
const DTT_NOTICE_V2 = OBJECT_FREEZE({
  path: "content/system-admission/bazi-dtt-notice-reconciliation.v2.json",
  rawBytes: 8881,
  rawSha256: "e2656a19955db0ce908df88aa696cd40847e7536af58c79548ac1fbce9a7464b",
  reconciliationId: "hakimi.bazi.dtt-notice-reconciliation/2.0.0",
  reconciliationDigest: "2a47fc6fe281a4362c36dfc67c2a6dee195b5b069065ffc0e86ac1afcd7aa8a0"
});
const SUPERSESSION = OBJECT_FREEZE({
  path: "content/system-admission/bazi-dtt-versioned-parent-supersession.v1.json",
  rawBytes: 9229,
  rawSha256: "aa9e62089990d8ba699c441114914173141e8228f027605b47f5c5e238fac0e3",
  supersessionId: "hakimi.bazi.dtt-versioned-parent-supersession/1.0.0",
  supersessionDigest: "601b4e07b94e62b73812a7a26f1108a094272dca660a188bb660fa860f031264"
});
const ENGINEERING_CANDIDATES = OBJECT_FREEZE({
  path: "content/bazi-strength-engineering-binding-candidates.v1.json",
  rawBytes: 21712,
  rawSha256: "95154d55d9e368351f5a69a1fa2ff63a51ba946d33a800dbd1f2460d9ac97b2f"
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
  rawBytes: 38161,
  rawSha256: "edb367448f857972e50c735e86acc5252605a0b4d27a2f85c996fcd67d0ed2cc",
  ledgerDigest: "24851de28a762c426e2630c9a52666786274c3c5477b9fc0463f9129e43d20d1"
});
const VERIFIED_RESULTS = new WeakSet();

export class BaziPr10bcVersionAwareCandidateError extends Error {
  constructor(code, message, cause) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "BaziPr10bcVersionAwareCandidateError";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new BaziPr10bcVersionAwareCandidateError(code, message, cause);
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
    if (!descriptor || !("value" in descriptor)) fail("NON_PASSIVE_OBJECT", "只接受无 accessor 的被动 JSON 值。");
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
    if (!descriptor || !("value" in descriptor)) fail("NON_PASSIVE_OBJECT", "JSON 工件不能含 accessor。");
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

export function computeBaziPr10bcVersionAwareCandidateDigest(value) {
  const unsigned = cloneJson(value);
  delete unsigned.ledgerDigest;
  return sha256Canonical(unsigned);
}

function assertSupersession(result) {
  if (!isVerifiedBaziDttVersionedParentSupersession(result)) {
    fail("SUPERSESSION_BRAND_REQUIRED", "必须消费同根 supersession WeakSet 品牌。");
  }
  if (result.supersessionId !== SUPERSESSION.supersessionId
    || result.supersessionDigest !== SUPERSESSION.supersessionDigest
    || result.sourceLedgerId !== SOURCE_V16.ledgerId
    || result.sourceLedgerDigest !== SOURCE_V16.ledgerDigest
    || result.rightsLedgerId !== RIGHTS_V12.ledgerId
    || result.rightsLedgerDigest !== RIGHTS_V12.ledgerDigest
    || result.artifacts?.sourceBinding?.path !== SOURCE_V16.path
    || result.artifacts?.sourceBinding?.rawBytes !== SOURCE_V16.rawBytes
    || result.artifacts?.sourceBinding?.rawSha256 !== SOURCE_V16.rawSha256
    || result.artifacts?.sourceRights?.path !== RIGHTS_V12.path
    || result.artifacts?.sourceRights?.rawBytes !== RIGHTS_V12.rawBytes
    || result.artifacts?.sourceRights?.rawSha256 !== RIGHTS_V12.rawSha256
    || result.artifacts?.receipt?.path !== SUPERSESSION.path
    || result.artifacts?.receipt?.rawBytes !== SUPERSESSION.rawBytes
    || result.artifacts?.receipt?.rawSha256 !== SUPERSESSION.rawSha256
    || result.promotionBlocked !== true
    || result.distributionPolicy !== "link_only"
    || result.formalSourceRightsRecordCount !== 0
    || result.formalSourceCarrierRecordCount !== 0
    || result.bindingFrozenVerified !== 0
    || result.releaseReady !== false
    || result.publicDeploymentAuthorized !== false
    || result.expertClaimsAuthorized !== false
    || result.crossFileAtomicSnapshot !== false
    || result.mutationEpochAvailable !== false
    || result.mutationEpochReceipt !== null
    || result.intervalMutationExcludedAcrossFiles !== false
    || result.abaExcluded !== false
    || result.subjectLock?.supersedingSourceCandidateId !== SOURCE_V16.candidateId
    || result.subjectLock?.supersedingRightsCandidateId !== RIGHTS_V12.candidateId
    || result.supersedingParents?.sourceBinding?.dttCandidateDigest !== SOURCE_V16.candidateDigest
    || result.supersedingParents?.sourceRights?.dttCandidateDigest !== RIGHTS_V12.candidateDigest) {
    fail("SUPERSESSION_TUPLE_MISMATCH", "supersession 固定 tuple 或失败关闭边界漂移。");
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
    || result.releaseReady !== false
    || result.publicDeploymentAuthorized !== false
    || result.expertClaimsAuthorized !== false
    || result.distributionPolicy !== "link_only"
    || result.crossFileAtomicSnapshot !== false
    || result.mutationEpochAvailable !== false
    || result.mutationEpochReceipt !== null
    || result.intervalMutationExcludedAcrossFiles !== false
    || result.abaExcluded !== false) {
    fail("CANDIDATE_READINESS_TUPLE_MISMATCH", "candidate readiness 固定 tuple 或失败关闭边界漂移。");
  }
}

async function readHistoricalPr10bc(workspaceRoot) {
  const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, HISTORICAL_PR10BC.path);
  if (snapshot.rawBytes !== HISTORICAL_PR10BC.rawBytes
    || snapshot.rawSha256 !== HISTORICAL_PR10BC.rawSha256) {
    fail("HISTORICAL_PR10BC_RAW_DRIFT", "历史 PR10BC raw identity 漂移。");
  }
  const ledger = parseBaziDttStrictJsonArtifact(snapshot);
  if (ledger.schemaVersion !== HISTORICAL_PR10BC.schemaVersion
    || ledger.ledgerId !== HISTORICAL_PR10BC.ledgerId
    || ledger.ledgerDigest !== HISTORICAL_PR10BC.ledgerDigest
    || ledger.status !== HISTORICAL_PR10BC.status
    || ledger.createdAt !== HISTORICAL_PR10BC.createdAt
    || computeBaziPr10bcVersionAwareCandidateDigest(ledger) !== ledger.ledgerDigest
    || ledger.gateSummary?.scopeProjectionsReproduced !== 9
    || ledger.gateSummary?.parallelBindingsCreated !== 0
    || ledger.gateSummary?.bindingFrozenVerified !== 0
    || ledger.gateSummary?.contentTruthEstablished !== false
    || ledger.gateSummary?.expertTruthEstablished !== false
    || ledger.gateSummary?.rightsLegalConclusionEstablished !== false
    || ledger.gateSummary?.releaseReady !== false
    || ledger.gateSummary?.publicDeploymentAuthorized !== false
    || ledger.gateSummary?.expertClaimsAuthorized !== false) {
    fail("HISTORICAL_PR10BC_SEMANTIC_DRIFT", "历史 PR10BC semantic identity 或红门漂移。");
  }
  return { ledger, snapshot };
}

async function verifyCurrentArtifactObservations(workspaceRoot, observations) {
  const verified = [];
  for (let index = 0; index < observations.length; index += 1) {
    const observation = observations[index];
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, observation.path);
    if (snapshot.rawBytes !== observation.bytes || snapshot.rawSha256 !== observation.sha256) {
      fail("SCOPED_ARTIFACT_DRIFT", `${observation.path} raw identity 漂移。`);
    }
    REFLECT_APPLY(ARRAY_PUSH, verified, [cloneJson(observation)]);
  }
  return verified;
}

function buildAdjacentCandidateContexts(concepts) {
  const rebound = cloneJson(concepts);
  let count = 0;
  for (let conceptIndex = 0; conceptIndex < rebound.length; conceptIndex += 1) {
    const adjacent = rebound[conceptIndex].adjacentHistoricalCandidates;
    const contexts = [];
    for (let candidateIndex = 0; candidateIndex < adjacent.length; candidateIndex += 1) {
      const candidate = adjacent[candidateIndex];
      if (candidate.candidateId === HISTORICAL_DTT_CANDIDATE_ID) {
        REFLECT_APPLY(ARRAY_PUSH, contexts, [{
          ...candidate,
          candidateId: SOURCE_V16.candidateId,
          supersedesCandidateId: HISTORICAL_DTT_CANDIDATE_ID,
          candidateIdentityRebound: true,
          candidateParentRole: "superseding_candidate_input_only_not_active_formal_parent"
        }]);
        count += 1;
      } else {
        REFLECT_APPLY(ARRAY_PUSH, contexts, [{
          ...candidate,
          supersedesCandidateId: null,
          candidateIdentityRebound: false,
          candidateParentRole: "unchanged_historical_text_candidate_context"
        }]);
      }
    }
    delete rebound[conceptIndex].adjacentHistoricalCandidates;
    rebound[conceptIndex].adjacentCandidateContexts = contexts;
  }
  if (count !== 3) fail("DTT_CANDIDATE_REBIND_COUNT_MISMATCH", "DTT adjacent candidate 必须精确重绑三处。");
  return rebound;
}

async function buildExpectedBundle(workspaceRoot) {
  const supersession = await loadBaziDttVersionedParentSupersession(workspaceRoot);
  assertSupersession(supersession);
  const readiness = await loadBaziBindingFreezeRequirementsV17(workspaceRoot);
  assertCandidateReadiness(readiness);
  const historical = await readHistoricalPr10bc(workspaceRoot);
  const engineeringSnapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, ENGINEERING_CANDIDATES.path);
  if (engineeringSnapshot.rawBytes !== ENGINEERING_CANDIDATES.rawBytes
    || engineeringSnapshot.rawSha256 !== ENGINEERING_CANDIDATES.rawSha256) {
    fail("ENGINEERING_CANDIDATE_DRIFT", "工程候选账 raw identity 漂移。");
  }
  const artifactObservations = await verifyCurrentArtifactObservations(
    workspaceRoot,
    historical.ledger.artifactObservations
  );
  const concepts = buildAdjacentCandidateContexts(historical.ledger.concepts);
  const gateSummary = cloneJson(historical.ledger.gateSummary);
  gateSummary.conceptsWithAdjacentCandidateContexts =
    gateSummary.conceptsWithAdjacentHistoricalCandidates;
  delete gateSummary.conceptsWithAdjacentHistoricalCandidates;
  gateSummary.candidateBindingsReferencedAsAdjacentContext =
    gateSummary.historicalCandidateBindingsReferencedAsAdjacentContext;
  delete gateSummary.historicalCandidateBindingsReferencedAsAdjacentContext;
  const unsigned = {
    schemaVersion: "1.1.0",
    recordType: "bazi_pr10bc_version_aware_candidate_scope_reconciliation_v1_1",
    ledgerId: "hakimi.bazi.pr10bc.version-aware-candidate-scope-reconciliation/1.1.0",
    status: "candidate_scope_reconciliation_versioned_parent_rebound_no_binding_created",
    createdAt: "2026-08-30T00:00:00.000Z",
    releaseGovernance: RELEASE_GOVERNANCE,
    historicalLineage: {
      ...HISTORICAL_PR10BC,
      role: "fixed_projection_template_only_not_current_capability"
    },
    versionedCandidateParentRebind: {
      activeAdmissionEffect: "none",
      supersessionWeakSetBrandVerified: true,
      candidateReadinessWeakSetBrandVerified: true,
      candidateReadiness: CANDIDATE_READINESS,
      sourceBindingCandidateParent: SOURCE_V16,
      sourceRightsCandidateParent: RIGHTS_V12,
      dttNoticeCandidateProjection: DTT_NOTICE_V2,
      supersessionReceipt: SUPERSESSION,
      dttAdjacentCandidateReferenceRebinds: 3,
      uniqueSupersedingSourceCandidateParents: 1,
      semanticMappingAuthorityChanged: false,
      formalAdmissionPromotionBlocked: true
    },
    scopeInput: cloneJson(historical.ledger.scopeInput),
    mappingAuthorityBoundary: {
      ...cloneJson(historical.ledger.mappingAuthorityBoundary),
      candidateParentIdentityRebindOnly: true,
      activeAdmissionEffect: "none"
    },
    observationBoundary: {
      directHistoricalPr10bcRawAndSemanticIdentityVerified: true,
      historicalScopedInspectionProjectionReusedAfterRawIdentityMatch: true,
      scopedArtifactPointInTimeRawIdentitiesVerified: artifactObservations.length,
      upstreamBrandedDependenciesVerified: true,
      nestedVerifierSameBufferTransitivityClaimed: false,
      endpointSnapshotOnly: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      intervalMutationExcluded: false,
      abaExcluded: false
    },
    currentBindingInventory: cloneJson(historical.ledger.currentBindingInventory),
    basisArtifacts: [
      {
        path: CANDIDATE_READINESS.path,
        role: "version_aware_candidate_readiness_parent",
        bytes: CANDIDATE_READINESS.rawBytes,
        sha256: CANDIDATE_READINESS.rawSha256
      },
      {
        path: ENGINEERING_CANDIDATES.path,
        role: "engineering_binding_candidate_parent",
        bytes: ENGINEERING_CANDIDATES.rawBytes,
        sha256: ENGINEERING_CANDIDATES.rawSha256
      },
      {
        path: SOURCE_V16.path,
        role: "versioned_source_binding_candidate_parent",
        bytes: SOURCE_V16.rawBytes,
        sha256: SOURCE_V16.rawSha256
      },
      {
        path: RIGHTS_V12.path,
        role: "versioned_source_rights_candidate_parent",
        bytes: RIGHTS_V12.rawBytes,
        sha256: RIGHTS_V12.rawSha256
      },
      {
        path: DTT_NOTICE_V2.path,
        role: "dtt_candidate_notice_projection_parent",
        bytes: DTT_NOTICE_V2.rawBytes,
        sha256: DTT_NOTICE_V2.rawSha256
      },
      {
        path: SUPERSESSION.path,
        role: "paired_versioned_parent_supersession_receipt",
        bytes: SUPERSESSION.rawBytes,
        sha256: SUPERSESSION.rawSha256
      }
    ],
    artifactObservations,
    concepts,
    gateSummary: {
      ...gateSummary,
      dttAdjacentCandidateReferenceRebinds: 3,
      uniqueSupersedingSourceCandidateParents: 1,
      activeAdmissionEffect: "none",
      formalAdmissionPromotionBlocked: true,
      parallelBindingsCreated: 0,
      bindingFrozenVerified: 0,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      browserRuntimeEvidenceEstablished: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    evidenceLedger: {
      engineeringEvidence: "historical_pr10bc_scope_projection_current_scoped_artifact_raw_identities_and_versioned_candidate_parent_rebind_mechanically_verified",
      browserRuntimeEvidence: "not_assessed_source_consumer_observation_only",
      contentTruth: "not_established",
      expertTruth: "not_established",
      rightsLegalConclusion: "not_established",
      releaseReadiness: "not_ready",
      publicReleaseAuthorization: "not_authorized"
    },
    doesNotEstablish: [
      "active_readiness_or_formal_admission",
      "new_binding_or_parallel_binding_identity",
      "rule_table_value_provenance",
      "position_decay_definition_or_implementation",
      "formal_score_semantics",
      "semantic_equivalence_between_audit_topics_and_current_bindings",
      "repository_wide_rule_table_or_alternate_identifier_absence",
      "source_body_or_exact_quote_text",
      "binding_frozen_verification",
      "classical_or_traditional_authority",
      "content_truth",
      "expert_truth",
      "rights_or_legal_conclusion",
      "browser_or_runtime_validation",
      "cross_file_atomic_snapshot",
      "mutation_epoch_interval_or_aba_exclusion",
      "central_release_manifest_closure",
      "release_readiness",
      "public_release_authorization"
    ]
  };
  const ledger = deepFreeze({
    ...unsigned,
    ledgerDigest: computeBaziPr10bcVersionAwareCandidateDigest(unsigned)
  });
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [{ ledger, snapshot: snapshotForValue(ledger) }]);
}

function assertExpectedRawPins(snapshot, ledger) {
  if (EXPECTED_PERSISTED.rawBytes <= 0
    || EXPECTED_PERSISTED.rawSha256.length !== 64
    || EXPECTED_PERSISTED.ledgerDigest.length !== 64) {
    fail("RAW_PIN_NOT_FROZEN", "PR10BC v1.1 raw／semantic identity 尚未冻结。");
  }
  if (snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
    || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256) {
    fail("PERSISTED_RAW_DRIFT", "PR10BC v1.1 raw identity 漂移。");
  }
  if (ledger.ledgerDigest !== EXPECTED_PERSISTED.ledgerDigest
    || computeBaziPr10bcVersionAwareCandidateDigest(ledger) !== ledger.ledgerDigest) {
    fail("PERSISTED_DIGEST_DRIFT", "PR10BC v1.1 semantic digest 漂移。");
  }
}

export async function loadBaziPr10bcVersionAwareCandidate(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])
) {
  const expected = await buildExpectedBundle(workspaceRoot);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    BAZI_PR10BC_VERSION_AWARE_CANDIDATE_RELATIVE_PATH
  );
  const persisted = parseBaziDttStrictJsonArtifact(snapshot);
  if (!exactJson(persisted, expected.ledger)) {
    fail("PR10BC_V11_MISMATCH", "持久化 PR10BC v1.1 不等于允许的单一版本化候选重绑投影。");
  }
  assertExpectedRawPins(snapshot, persisted);
  const result = deepFreeze({
    versionAwareCandidateScopeReconciliationMechanicallyVerified: true,
    activeAdmissionEffect: "none",
    ledgerId: persisted.ledgerId,
    ledgerDigest: persisted.ledgerDigest,
    ledger: persisted,
    artifact: {
      path: BAZI_PR10BC_VERSION_AWARE_CANDIDATE_RELATIVE_PATH,
      bytes: snapshot.rawBytes,
      sha256: snapshot.rawSha256
    },
    scopeProjectionsReproduced: 9,
    dttAdjacentCandidateReferenceRebinds: 3,
    uniqueSupersedingSourceCandidateParents: 1,
    parallelBindingsCreated: 0,
    bindingRequired: 12,
    bindingFrozenVerified: 0,
    distributionPolicy: "link_only",
    formalSourceRightsRecordCount: 0,
    formalSourceCarrierRecordCount: 0,
    candidateNoticeProjectionReconciliationsResolved: 1,
    activeNoticeDiscrepancyPromotionBlocks: 1,
    candidateNoticeProjectionDiscrepancyPromotionBlocks: 0,
    formalAdmissionPromotionBlocked: true,
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

export function isVerifiedBaziPr10bcVersionAwareCandidate(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value]);
}

export const baziPr10bcVersionAwareCandidateTestOnly = OBJECT_FREEZE({
  HISTORICAL_PR10BC,
  CANDIDATE_READINESS,
  SOURCE_V16,
  RIGHTS_V12,
  DTT_NOTICE_V2,
  SUPERSESSION,
  ENGINEERING_CANDIDATES,
  EXPECTED_PERSISTED,
  buildExpectedBundle,
  serialize,
  exactJson
});
