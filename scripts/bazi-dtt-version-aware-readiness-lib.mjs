import { createHash } from "node:crypto";

import {
  isVerifiedBaziDttVersionedParentSupersession,
  loadBaziDttVersionedParentSupersession,
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
const UINT8_ARRAY_PROTOTYPE = Uint8Array.prototype;
const TYPED_ARRAY_PROTOTYPE = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [UINT8_ARRAY_PROTOTYPE]);
const TYPED_ARRAY_BYTE_LENGTH_GETTER = REFLECT_APPLY(
  OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
  Object,
  [TYPED_ARRAY_PROTOTYPE, "byteLength"]
)?.get;
const PROCESS_CWD = process.cwd;
const HASH_PROTOTYPE = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [CRYPTO_CREATE_HASH("sha256")]);
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;

export const DTT_NOTICE_RECONCILIATION_V2_RELATIVE_PATH =
  "content/system-admission/bazi-dtt-notice-reconciliation.v2.json";
export const BAZI_BINDING_FREEZE_REQUIREMENTS_V17_RELATIVE_PATH =
  "content/system-admission/bazi-binding-freeze-requirements.v1.7.0.json";

const HISTORICAL_RECONCILIATION = OBJECT_FREEZE({
  path: "content/system-admission/bazi-dtt-notice-reconciliation.v1.json",
  rawBytes: 8709,
  rawSha256: "e3f014e8f87457b09ae866b79fe2581f87553658829515db61f597c345f6ff68",
  reconciliationId: "hakimi.bazi.dtt-notice-reconciliation/1.0.0",
  reconciliationDigest: "fabf96fddf7f3710b86f22b0d3f7aa7844087351f30c53fbb823780f3d81ba2f"
});
const HISTORICAL_READINESS = OBJECT_FREEZE({
  path: "content/system-admission/bazi-binding-freeze-requirements.v1.json",
  rawBytes: 30655,
  rawSha256: "1db59e2f7d3c5448f27b32d96bc8cf5a75968e8470dd0592d70594b44b3ec809",
  ledgerId: "hakimi.bazi.strength.binding-freeze-readiness/1.6.0",
  ledgerDigest: "97406785d688d3ab8b4dc824d7980c890a80bfc829a75279109edcc1c3d48f0c",
  status: "readiness_only_dtt_notice_reconciliation_blocked_bindings_frozen_0_of_12",
  createdAt: "2026-08-26T00:00:00.000Z"
});
const SUPERSESSION = OBJECT_FREEZE({
  path: "content/system-admission/bazi-dtt-versioned-parent-supersession.v1.json",
  rawBytes: 9229,
  rawSha256: "aa9e62089990d8ba699c441114914173141e8228f027605b47f5c5e238fac0e3",
  supersessionId: "hakimi.bazi.dtt-versioned-parent-supersession/1.0.0",
  supersessionDigest: "601b4e07b94e62b73812a7a26f1108a094272dca660a188bb660fa860f031264"
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
const HISTORICAL_SOURCE = OBJECT_FREEZE({
  path: "content/bazi-strength-source-binding-candidates.v1.json",
  rawBytes: 47753,
  rawSha256: "e2ac6a7a0ea1209dd92a38dfae82c494df4792da1a102c11d2fdb2caa80e41f7",
  ledgerId: "hakimi.bazi.strength.source-binding-candidates/1.5.0",
  ledgerDigest: "44ed9e23490c11c625602b77574efbf7331305bd1bf87634c5b91f568e8b85af",
  candidateId: "dtt-chanwei-wikisource-r2600158-candidate-v1",
  candidateDigest: "26182f43d801dedb7433e53d8e390efc32195ef08555199d933e36a1ed65ca61"
});
const HISTORICAL_RIGHTS = OBJECT_FREEZE({
  path: "content/bazi-strength-source-rights-candidates.v1.json",
  rawBytes: 20806,
  rawSha256: "433116caf1a2b9c233739093b0a2436f13c7f268dfa8af6c1ce481964b48b179",
  ledgerId: "hakimi.bazi.strength.source-rights-candidates/1.1.0",
  ledgerDigest: "3776e4b8799ca5221c1765a735c3e34c637b4f4952c9243836fedfbf1ee30a36",
  candidateId: "dtt-chanwei-wikisource-r2600158-rights-candidate-v1",
  candidateDigest: "631f530ded6a17652c8a419246805b278d0f6f5511b96a1fd6274f386fce633d"
});

// Filled only after deterministic artifact generation. The loader refuses to
// operate until these literal raw identities match the persisted artifacts.
const EXPECTED_RECONCILIATION_V2 = OBJECT_FREEZE({
  rawBytes: 8881,
  rawSha256: "e2656a19955db0ce908df88aa696cd40847e7536af58c79548ac1fbce9a7464b",
  reconciliationDigest: "2a47fc6fe281a4362c36dfc67c2a6dee195b5b069065ffc0e86ac1afcd7aa8a0"
});
const EXPECTED_READINESS_V17 = OBJECT_FREEZE({
  rawBytes: 32629,
  rawSha256: "7565a1c1ae51c09c78cf8f906e544bd8ee822020f76587237bc909ef1e6408a2",
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
const FIXED_BASE_BASIS_PATHS = OBJECT_FREEZE([
  "content/bazi-strength-engineering-binding-candidates.v1.json",
  "content/bazi-strength-expert-review-packet.v1.json",
  "packages/bazi-interpretation/src/strength-claim-registry.ts",
  "packages/contracts/src/index.ts",
  "packages/knowledge-core/src/index.ts"
]);
const RECONCILIATION_BRAND = new WeakSet();
const READINESS_BRAND = new WeakSet();
const INTERNAL_BUILD_TOKEN = OBJECT_FREEZE({});

export class BaziDttVersionAwareReadinessError extends Error {
  constructor(code, message, cause) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "BaziDttVersionAwareReadinessError";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new BaziDttVersionAwareReadinessError(code, message, cause);
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
    text += `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [keys[index]])}:${canonicalStringify(value[keys[index]])}`;
  }
  return `${text}}`;
}

function sha256Bytes(bytes) {
  const hash = CRYPTO_CREATE_HASH("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [bytes]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function sha256Canonical(value) {
  return sha256Bytes(REFLECT_APPLY(BUFFER_FROM, NATIVE_BUFFER, [canonicalStringify(value), "utf8"]));
}

function exactJson(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function serialize(value) {
  return `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [value, null, 2])}\n`;
}

function snapshotForValue(relativePath, value) {
  const bytes = REFLECT_APPLY(BUFFER_FROM, NATIVE_BUFFER, [serialize(value), "utf8"]);
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [{
    path: relativePath,
    rawBytes: REFLECT_APPLY(TYPED_ARRAY_BYTE_LENGTH_GETTER, bytes, []),
    rawSha256: sha256Bytes(bytes),
    bytes
  }]);
}

function artifactIdentity(snapshot) {
  return deepFreeze({ path: snapshot.path, bytes: snapshot.rawBytes, sha256: snapshot.rawSha256 });
}

function computeDigest(value, field) {
  const unsigned = cloneJson(value);
  delete unsigned[field];
  return sha256Canonical(unsigned);
}

export function computeBaziDttNoticeReconciliationV2Digest(value) {
  return computeDigest(value, "reconciliationDigest");
}

export function computeBaziBindingFreezeRequirementsV17Digest(value) {
  return computeDigest(value, "ledgerDigest");
}

function assertExactSupersessionBrand(result) {
  if (!isVerifiedBaziDttVersionedParentSupersession(result)) {
    fail("SUPERSESSION_BRAND_REQUIRED", "必须消费当前模块链生成的 supersession WeakSet 品牌。");
  }
  const expected = {
    supersessionId: SUPERSESSION.supersessionId,
    supersessionDigest: SUPERSESSION.supersessionDigest,
    sourceLedgerId: SOURCE_V16.ledgerId,
    sourceLedgerDigest: SOURCE_V16.ledgerDigest,
    rightsLedgerId: RIGHTS_V12.ledgerId,
    rightsLedgerDigest: RIGHTS_V12.ledgerDigest,
    noticeProjectionCorrectedAtSupersedingCandidateParentLayer: true,
    boundReadinessConsumesSupersedingParents: false,
    boundReadinessStillPinsHistoricalParents: true,
    promotionBlocked: true,
    distributionPolicy: "link_only",
    formalSourceRightsRecordCount: 0,
    formalSourceCarrierRecordCount: 0,
    bindingFrozenVerified: 0,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false,
    crossFileAtomicSnapshot: false,
    mutationEpochAvailable: false,
    mutationEpochReceipt: null,
    intervalMutationExcludedAcrossFiles: false,
    abaExcluded: false
  };
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [expected]);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (!exactJson(result[key], expected[key])) fail("SUPERSESSION_TUPLE_MISMATCH", `supersession ${key} 漂移。`);
  }
  if (!exactJson(result.historicalParents, {
    sourceBinding: HISTORICAL_SOURCE,
    sourceRights: HISTORICAL_RIGHTS
  })) fail("SUPERSESSION_TUPLE_MISMATCH", "历史父账 tuple 漂移。");
  if (!exactJson(result.supersedingParents, {
    sourceBinding: {
      path: SOURCE_V16.path, rawBytes: SOURCE_V16.rawBytes, rawSha256: SOURCE_V16.rawSha256,
      ledgerId: SOURCE_V16.ledgerId, ledgerDigest: SOURCE_V16.ledgerDigest,
      dttCandidateId: SOURCE_V16.candidateId, dttCandidateDigest: SOURCE_V16.candidateDigest
    },
    sourceRights: {
      path: RIGHTS_V12.path, rawBytes: RIGHTS_V12.rawBytes, rawSha256: RIGHTS_V12.rawSha256,
      ledgerId: RIGHTS_V12.ledgerId, ledgerDigest: RIGHTS_V12.ledgerDigest,
      dttCandidateId: RIGHTS_V12.candidateId, dttCandidateDigest: RIGHTS_V12.candidateDigest
    }
  })) fail("SUPERSESSION_TUPLE_MISMATCH", "新版父账 tuple 漂移。");
  if (!exactJson(result.artifacts, {
    sourceBinding: { path: SOURCE_V16.path, rawBytes: SOURCE_V16.rawBytes, rawSha256: SOURCE_V16.rawSha256 },
    sourceRights: { path: RIGHTS_V12.path, rawBytes: RIGHTS_V12.rawBytes, rawSha256: RIGHTS_V12.rawSha256 },
    receipt: { path: SUPERSESSION.path, rawBytes: SUPERSESSION.rawBytes, rawSha256: SUPERSESSION.rawSha256 }
  })) fail("SUPERSESSION_TUPLE_MISMATCH", "supersession raw artifact tuple 漂移。");
}

function buildReconciliationV2(supersession) {
  assertExactSupersessionBrand(supersession);
  const unsigned = {
    schemaVersion: "2.0.0",
    recordType: "bazi_dtt_notice_reconciliation_overlay_v2",
    reconciliationId: "hakimi.bazi.dtt-notice-reconciliation/2.0.0",
    status: "candidate_notice_projection_reconciled_formal_admission_blocked",
    createdAt: "2026-08-30T00:00:00.000Z",
    releaseGovernance: RELEASE_GOVERNANCE,
    supersedes: HISTORICAL_RECONCILIATION,
    subjectLock: {
      bindingId: "binding:dtt:month-command",
      evidenceSubjectId: "bazi.strength.binding.dtt.month-command.v1",
      sourceId: "dtt-chanwei-wikisource-r2600158",
      sourceCandidateId: SOURCE_V16.candidateId,
      rightsCandidateId: RIGHTS_V12.candidateId,
      affectedAnchorIds: [
        "dtt-chanwei-ssid-11335994-pages-170-176-facsimile-v1",
        "dtt-chanwei-cadal-07005210-pages-178-184-facsimile-v1"
      ]
    },
    historicalEvidence: supersession.publicEvidence,
    historicalParents: supersession.historicalParents,
    currentCandidateParents: {
      sourceBinding: {
        ...SOURCE_V16,
        adoptionRole: "superseding_candidate_input_only_not_active_formal_parent",
        supersedesCandidateId: HISTORICAL_SOURCE.candidateId,
        inPlaceHistoricalParentMutationAccepted: false
      },
      sourceRights: {
        ...RIGHTS_V12,
        adoptionRole: "superseding_candidate_input_only_not_active_formal_parent",
        supersedesCandidateId: HISTORICAL_RIGHTS.candidateId,
        inPlaceHistoricalParentMutationAccepted: false
      }
    },
    supersessionReceipt: {
      ...SUPERSESSION,
      relationship: "paired_candidate_parent_supersession_basis"
    },
    noticeProjection: {
      oldidMainSlotPdOldLiteralObserved: false,
      renderedPagePdOldDependencyObserved: true,
      dependencyRevisionsPinnedAtCapture: true,
      oldidAlonePinsRenderedNotice: false,
      sourceSsidNotice: "commons_pd_scan_top_level_notice_observed_not_adjudicated",
      sourceCadalNotice: "commons_pd_old_top_level_notice_observed_without_pd_scan_template_not_adjudicated",
      rightsWorkNotice: "rendered_pd_old_dependency_observed_not_oldid_main_slot_literal",
      rightsSsidNotice: "pd_scan_top_level_observed_not_adjudicated",
      rightsCadalNotice: "pd_old_top_level_observed_without_pd_scan_template_not_adjudicated",
      parentNoticeProjectionReestablishedForAllCarriers: true,
      publicDomainMarkCountsAsLicense: false,
      markerAuthorityAndAccuracyVerified: false,
      noticeApplicabilityEstablished: false,
      legalConclusion: "not_established"
    },
    reconciliationDecision: {
      candidateProjectionResolved: true,
      candidateParentPairVersionedSupersessionReceiptComplete: true,
      candidateNoticeProjectionCorrected: true,
      candidateNoticeProjectionReconciliationPassed: true,
      candidateNoticeProjectionDiscrepancyResolved: true,
      noticeApplicabilityEstablished: false,
      rightsLegalConclusionEstablished: false,
      candidateNoticeDiscrepancyPromotionBlocked: false,
      formalAdmissionPromotionBlocked: true,
      promotionBlocked: true,
      activeAdmissionEffect: "none",
      distributionPolicy: "link_only",
      state: "candidate_projection_reconciled_formal_admission_prerequisites_open"
    },
    formalAdmissionBoundary: {
      bindingRequired: 12,
      bindingFrozenVerified: 0,
      formalSourceRightsRecordCount: 0,
      formalSourceCarrierRecordCount: 0,
      knowledgeDocumentCount: 0,
      workLayersCleared: 0,
      editionLayersCleared: 0,
      transcriptionLayersCleared: 0,
      carrierLayersCleared: 0,
      independentSourceRightsReviewsVerified: 0,
      independentDomainReviewsVerified: 0,
      legalConclusion: "not_established",
      redistributionAuthorized: false,
      formalAdmissionPromotionBlocked: true
    },
    integrityBoundary: {
      historicalParentsMutated: false,
      historicalParentBacklinksAdded: false,
      supersessionWeakSetBrandVerified: true,
      persistedArtifactsUseFixedPaths: true,
      stableSingleFileReadsUsed: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false,
      reconciliationDigestIsDigitalSignature: false
    },
    authorityBoundary: {
      contentTruthEstablished: false,
      baziRuleTruthEstablished: false,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false,
      expertTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      fullRepositoryTypecheckPassed: false,
      defaultWebBuildPassed: false,
      browserOrPwaAcceptancePassed: false,
      releaseEvidenceComplete: false,
      deploymentAndRollbackConfirmed: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    doesNotEstablish: [
      "active_formal_parent_or_active_admission",
      "notice_applicability_or_legal_conclusion",
      "source_body_or_exact_quote_text",
      "work_edition_transcription_or_carrier_identity",
      "work_edition_transcription_or_carrier_rights_clearance",
      "formal_source_rights_or_source_carrier_record",
      "knowledge_document",
      "binding_freeze",
      "content_truth",
      "bazi_rule_truth",
      "expert_truth",
      "cross_file_atomic_snapshot",
      "mutation_epoch_interval_or_aba_exclusion",
      "release_readiness",
      "public_release_authorization"
    ]
  };
  return deepFreeze({
    ...unsigned,
    reconciliationDigest: computeBaziDttNoticeReconciliationV2Digest(unsigned)
  });
}

function findBasisExactly(readiness, relativePath) {
  let match;
  let count = 0;
  for (let index = 0; index < readiness.basisArtifacts.length; index += 1) {
    const entry = readiness.basisArtifacts[index];
    if (entry.path === relativePath) {
      count += 1;
      match = entry;
    }
  }
  if (count !== 1) fail("HISTORICAL_READINESS_BASIS_MISMATCH", `${relativePath} 必须在旧 readiness 中精确出现一次。`);
  return match;
}

async function readHistoricalReadiness(workspaceRoot) {
  const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, HISTORICAL_READINESS.path);
  if (snapshot.rawBytes !== HISTORICAL_READINESS.rawBytes
    || snapshot.rawSha256 !== HISTORICAL_READINESS.rawSha256) {
    fail("HISTORICAL_READINESS_RAW_DRIFT", "旧 readiness raw identity 漂移。");
  }
  const readiness = parseBaziDttStrictJsonArtifact(snapshot);
  if (readiness.ledgerId !== HISTORICAL_READINESS.ledgerId
    || readiness.ledgerDigest !== HISTORICAL_READINESS.ledgerDigest
    || readiness.status !== HISTORICAL_READINESS.status
    || readiness.createdAt !== HISTORICAL_READINESS.createdAt
    || readiness.gateSummary?.bindingRequired !== 12
    || readiness.gateSummary?.bindingFrozenVerified !== 0
    || readiness.gateSummary?.sourceNoticeReconciliationsResolved !== 0
    || readiness.dttNoticeReconciliationGate?.promotionBlocked !== true
    || readiness.bindings?.length !== 12) {
    fail("HISTORICAL_READINESS_SEMANTIC_DRIFT", "旧 readiness 语义身份或失败关闭边界漂移。");
  }
  if (computeBaziBindingFreezeRequirementsV17Digest(readiness) !== readiness.ledgerDigest) {
    fail("HISTORICAL_READINESS_DIGEST_MISMATCH", "旧 readiness canonical digest 漂移。");
  }
  return { readiness, snapshot };
}

async function verifyFixedBaseBasis(workspaceRoot, historicalReadiness) {
  const result = [];
  for (let index = 0; index < FIXED_BASE_BASIS_PATHS.length; index += 1) {
    const relativePath = FIXED_BASE_BASIS_PATHS[index];
    const historicalIdentity = findBasisExactly(historicalReadiness, relativePath);
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, relativePath);
    if (snapshot.rawBytes !== historicalIdentity.bytes || snapshot.rawSha256 !== historicalIdentity.sha256) {
      fail("FIXED_BASE_BASIS_DRIFT", `${relativePath} raw identity 漂移。`);
    }
    REFLECT_APPLY(ARRAY_PUSH, result, [{
      path: relativePath,
      bytes: snapshot.rawBytes,
      sha256: snapshot.rawSha256
    }]);
  }
  return result;
}

function buildReadinessV17FromProjection(token, historicalReadiness, reconciliation, reconciliationSnapshot, fixedBaseBasis) {
  if (token !== INTERNAL_BUILD_TOKEN) fail("INTERNAL_BUILD_TOKEN_REQUIRED", "readiness 构建器不接受 caller projection。");
  const bindings = cloneJson(historicalReadiness.bindings);
  let dttCount = 0;
  for (let index = 0; index < bindings.length; index += 1) {
    const entry = bindings[index];
    if (entry.bindingId === "binding:dtt:month-command") {
      dttCount += 1;
      if (!exactJson(entry.candidateIds, [HISTORICAL_SOURCE.candidateId])
        || entry.freezeState !== "candidate_only_unbound"
        || entry.bindingDigest !== null) {
        fail("HISTORICAL_DTT_BINDING_DRIFT", "旧 readiness DTT binding identity 漂移。");
      }
      entry.candidateIds = [SOURCE_V16.candidateId];
    }
  }
  if (dttCount !== 1) fail("HISTORICAL_DTT_BINDING_DRIFT", "旧 readiness 必须精确含一条 DTT binding。");

  const basisArtifacts = [];
  for (let index = 0; index < fixedBaseBasis.length; index += 1) {
    REFLECT_APPLY(ARRAY_PUSH, basisArtifacts, [cloneJson(fixedBaseBasis[index])]);
  }
  REFLECT_APPLY(ARRAY_PUSH, basisArtifacts, [
    { path: SOURCE_V16.path, bytes: SOURCE_V16.rawBytes, sha256: SOURCE_V16.rawSha256 },
    { path: RIGHTS_V12.path, bytes: RIGHTS_V12.rawBytes, sha256: RIGHTS_V12.rawSha256 },
    { path: DTT_NOTICE_RECONCILIATION_V2_RELATIVE_PATH, bytes: reconciliationSnapshot.rawBytes,
      sha256: reconciliationSnapshot.rawSha256 },
    { path: SUPERSESSION.path, bytes: SUPERSESSION.rawBytes, sha256: SUPERSESSION.rawSha256 }
  ]);

  const old = historicalReadiness;
  const dttGate = {
    bindingId: "binding:dtt:month-command",
    evidenceSubjectId: "bazi.strength.binding.dtt.month-command.v1",
    evidenceArtifact: {
      path: DTT_NOTICE_RECONCILIATION_V2_RELATIVE_PATH,
      bytes: reconciliationSnapshot.rawBytes,
      sha256: reconciliationSnapshot.rawSha256,
      reconciliationId: reconciliation.reconciliationId,
      reconciliationDigest: reconciliation.reconciliationDigest
    },
    supersessionReceipt: {
      path: SUPERSESSION.path,
      bytes: SUPERSESSION.rawBytes,
      sha256: SUPERSESSION.rawSha256,
      supersessionId: SUPERSESSION.supersessionId,
      supersessionDigest: SUPERSESSION.supersessionDigest
    },
    historicalParentIdentities: {
      sourceBinding: HISTORICAL_SOURCE,
      sourceRights: HISTORICAL_RIGHTS
    },
    currentCandidateParentIdentities: {
      sourceBinding: SOURCE_V16,
      sourceRights: RIGHTS_V12
    },
    reconciliationMode: "paired_versioned_candidate_parent_projection_preserves_historical_parents",
    candidateProjectionResolved: true,
    candidateParentPairVersionedSupersessionReceiptComplete: true,
    candidateNoticeProjectionReconciliationPassed: true,
    candidateNoticeProjectionDiscrepancyResolved: true,
    noticeApplicabilityEstablished: false,
    rightsLegalConclusionEstablished: false,
    candidateNoticeDiscrepancyPromotionBlocked: false,
    formalAdmissionPromotionBlocked: true,
    promotionBlocked: true,
    promotionGateEffect: "formal_admission_remains_blocked_no_rights_or_binding_authority",
    activeAdmissionEffect: "none",
    currentDistributionBoundary: "link_only_no_redistribution_clearance",
    formalSourceRightsRecordCount: 0,
    formalSourceCarrierRecordCount: 0,
    bindingFrozenVerified: 0,
    contentTruthEstablished: false,
    expertTruthEstablished: false,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false,
    crossFileAtomicSnapshot: false,
    mutationEpochAvailable: false,
    mutationEpochReceipt: null,
    intervalMutationExcluded: false,
    abaExcluded: false
  };

  const unsigned = {
    schemaVersion: "1.7.0",
    recordType: "bazi_binding_freeze_version_aware_candidate_readiness_v1_7",
    ledgerId: "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.7.0",
    status: "candidate_readiness_only_dtt_notice_projection_reconciled_formal_admission_blocked_bindings_frozen_0_of_12",
    createdAt: "2026-08-30T00:00:00.000Z",
    releaseGovernance: RELEASE_GOVERNANCE,
    supersedes: HISTORICAL_READINESS,
    defaultClosureRequirements: cloneJson(old.defaultClosureRequirements),
    basisArtifacts,
    bindings,
    dttNoticeReconciliationGate: dttGate,
    gateSummary: {
      ...cloneJson(old.gateSummary),
      sourceNoticeReconciliationsResolved: 0,
      sourceNoticeDiscrepancyPromotionBlocks: 1,
      candidateNoticeProjectionReconciliationsResolved: 1,
      candidateNoticeProjectionDiscrepancyPromotionBlocks: 0,
      formalAdmissionPromotionBlocks: 1,
      bindingFrozenVerified: 0,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false,
      releaseReady: false
    },
    integrityBoundary: {
      supersessionWeakSetBrandVerified: true,
      reconciliationV2WeakSetBrandRequiredByLoader: true,
      candidateReadinessBasisArtifactsPointInTimeRawVerified: 9,
      stableSingleFileReadsUsed: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false,
      ledgerDigestIsDigitalSignature: false
    },
    evidenceLedger: {
      engineeringReadinessIdentity: "basis_artifacts_binding_inventory_engineering_candidate_envelopes_current_versioned_source_rights_candidate_pair_and_notice_projection_reconciliation_verified",
      browserRuntimeEvidence: "not_assessed_in_readiness_ledger",
      contentTruth: "not_established",
      expertTruth: "not_established",
      rightsLegalConclusion: "not_established",
      releaseReadiness: "not_ready",
      publicReleaseAuthorization: "not_authorized"
    },
    doesNotEstablish: [
      "active_formal_parent_or_active_admission",
      "notice_applicability_or_legal_conclusion",
      "source_body_or_exact_quote_text",
      "reliable_edition_or_carrier_identity",
      "binding_frozen_verification",
      "traditional_parameter_authority",
      "content_truth",
      "expert_truth",
      "rights_or_legal_conclusion",
      "browser_or_runtime_validation",
      "cross_file_atomic_snapshot",
      "mutation_epoch_interval_or_aba_exclusion",
      "release_readiness",
      "public_release_authorization"
    ]
  };
  return deepFreeze({ ...unsigned, ledgerDigest: computeBaziBindingFreezeRequirementsV17Digest(unsigned) });
}

async function buildExpectedBundle(workspaceRoot) {
  const supersession = await loadBaziDttVersionedParentSupersession(workspaceRoot);
  assertExactSupersessionBrand(supersession);
  const reconciliation = buildReconciliationV2(supersession);
  const reconciliationSnapshot = snapshotForValue(DTT_NOTICE_RECONCILIATION_V2_RELATIVE_PATH, reconciliation);
  const historical = await readHistoricalReadiness(workspaceRoot);
  const fixedBaseBasis = await verifyFixedBaseBasis(workspaceRoot, historical.readiness);
  const readiness = buildReadinessV17FromProjection(
    INTERNAL_BUILD_TOKEN,
    historical.readiness,
    reconciliation,
    reconciliationSnapshot,
    fixedBaseBasis
  );
  const readinessSnapshot = snapshotForValue(BAZI_BINDING_FREEZE_REQUIREMENTS_V17_RELATIVE_PATH, readiness);
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [
    { reconciliation, reconciliationSnapshot, readiness, readinessSnapshot }
  ]);
}

function assertExpectedRawPins(snapshot, expected, label) {
  if (expected.rawBytes <= 0 || expected.rawSha256.length !== 64) {
    fail("RAW_PIN_NOT_FROZEN", `${label} raw identity 尚未冻结。`);
  }
  if (snapshot.rawBytes !== expected.rawBytes || snapshot.rawSha256 !== expected.rawSha256) {
    fail("PERSISTED_RAW_DRIFT", `${label} raw identity 漂移。`);
  }
}

export async function loadBaziDttNoticeReconciliationV2(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])
) {
  const supersession = await loadBaziDttVersionedParentSupersession(workspaceRoot);
  assertExactSupersessionBrand(supersession);
  const expected = buildReconciliationV2(supersession);
  const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, DTT_NOTICE_RECONCILIATION_V2_RELATIVE_PATH);
  const persisted = parseBaziDttStrictJsonArtifact(snapshot);
  if (!exactJson(persisted, expected)) fail("RECONCILIATION_V2_MISMATCH", "持久化 C-L3 v2 不等于固定机械投影。");
  if (persisted.reconciliationDigest !== EXPECTED_RECONCILIATION_V2.reconciliationDigest
    || computeBaziDttNoticeReconciliationV2Digest(persisted) !== persisted.reconciliationDigest) {
    fail("RECONCILIATION_V2_DIGEST_MISMATCH", "C-L3 v2 semantic digest 漂移。");
  }
  assertExpectedRawPins(snapshot, EXPECTED_RECONCILIATION_V2, "C-L3 v2");
  const result = deepFreeze({
    candidateNoticeProjectionMechanicallyReconciled: true,
    activeAdmissionEffect: "none",
    reconciliationId: persisted.reconciliationId,
    reconciliationDigest: persisted.reconciliationDigest,
    reconciliation: persisted,
    artifact: artifactIdentity(snapshot),
    formalAdmissionPromotionBlocked: true,
    bindingFrozenVerified: 0,
    formalSourceRightsRecordCount: 0,
    formalSourceCarrierRecordCount: 0,
    distributionPolicy: "link_only",
    contentTruthEstablished: false,
    expertTruthEstablished: false,
    rightsLegalConclusionEstablished: false,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false,
    crossFileAtomicSnapshot: false,
    mutationEpochAvailable: false,
    mutationEpochReceipt: null,
    intervalMutationExcludedAcrossFiles: false,
    abaExcluded: false
  });
  REFLECT_APPLY(WEAK_SET_ADD, RECONCILIATION_BRAND, [result]);
  return result;
}

export function isVerifiedBaziDttNoticeReconciliationV2(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, RECONCILIATION_BRAND, [value]);
}

async function buildExpectedReadinessFromVerifiedReconciliation(workspaceRoot, reconciliationResult) {
  if (!isVerifiedBaziDttNoticeReconciliationV2(reconciliationResult)) {
    fail("RECONCILIATION_V2_BRAND_REQUIRED", "readiness 1.7 只消费本模块 C-L3 v2 WeakSet 品牌。");
  }
  const historical = await readHistoricalReadiness(workspaceRoot);
  const fixedBaseBasis = await verifyFixedBaseBasis(workspaceRoot, historical.readiness);
  return buildReadinessV17FromProjection(
    INTERNAL_BUILD_TOKEN,
    historical.readiness,
    reconciliationResult.reconciliation,
    {
      rawBytes: reconciliationResult.artifact.bytes,
      rawSha256: reconciliationResult.artifact.sha256
    },
    fixedBaseBasis
  );
}

export async function loadBaziBindingFreezeRequirementsV17(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])
) {
  const reconciliationResult = await loadBaziDttNoticeReconciliationV2(workspaceRoot);
  if (!isVerifiedBaziDttNoticeReconciliationV2(reconciliationResult)) {
    fail("RECONCILIATION_V2_BRAND_REQUIRED", "C-L3 v2 品牌验证失败。");
  }
  const expected = await buildExpectedReadinessFromVerifiedReconciliation(workspaceRoot, reconciliationResult);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    BAZI_BINDING_FREEZE_REQUIREMENTS_V17_RELATIVE_PATH
  );
  const persisted = parseBaziDttStrictJsonArtifact(snapshot);
  if (!exactJson(persisted, expected)) fail("READINESS_V17_MISMATCH", "持久化 readiness 1.7 不等于固定机械投影。");
  if (persisted.ledgerDigest !== EXPECTED_READINESS_V17.ledgerDigest
    || computeBaziBindingFreezeRequirementsV17Digest(persisted) !== persisted.ledgerDigest) {
    fail("READINESS_V17_DIGEST_MISMATCH", "readiness 1.7 semantic digest 漂移。");
  }
  assertExpectedRawPins(snapshot, EXPECTED_READINESS_V17, "readiness 1.7");
  const result = deepFreeze({
    versionAwareCandidateReadinessMechanicallyVerified: true,
    activeAdmissionEffect: "none",
    ledgerId: persisted.ledgerId,
    ledgerDigest: persisted.ledgerDigest,
    readiness: persisted,
    artifact: artifactIdentity(snapshot),
    candidateNoticeProjectionReconciliationsResolved: 1,
    activeNoticeDiscrepancyPromotionBlocks: 1,
    candidateNoticeProjectionDiscrepancyPromotionBlocks: 0,
    formalAdmissionPromotionBlocked: true,
    bindingRequired: 12,
    bindingFrozenVerified: 0,
    formalSourceRightsRecordCount: 0,
    formalSourceCarrierRecordCount: 0,
    sourceBundleComplete: false,
    rightsBundleComplete: false,
    expertReviewBundleComplete: false,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false,
    distributionPolicy: "link_only",
    crossFileAtomicSnapshot: false,
    mutationEpochAvailable: false,
    mutationEpochReceipt: null,
    intervalMutationExcludedAcrossFiles: false,
    abaExcluded: false
  });
  REFLECT_APPLY(WEAK_SET_ADD, READINESS_BRAND, [result]);
  return result;
}

export function isVerifiedBaziBindingFreezeRequirementsV17(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, READINESS_BRAND, [value]);
}

export const baziDttVersionAwareReadinessTestOnly = OBJECT_FREEZE({
  HISTORICAL_RECONCILIATION,
  HISTORICAL_READINESS,
  SUPERSESSION,
  SOURCE_V16,
  RIGHTS_V12,
  HISTORICAL_SOURCE,
  HISTORICAL_RIGHTS,
  EXPECTED_RECONCILIATION_V2,
  EXPECTED_READINESS_V17,
  buildReconciliationV2,
  buildExpectedBundle,
  buildExpectedReadinessFromVerifiedReconciliation,
  serialize,
  exactJson
});
