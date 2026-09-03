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
const ARRAY_SLICE = Array.prototype.slice;
const ARRAY_SORT = Array.prototype.sort;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const NUMBER_IS_FINITE = Number.isFinite;
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

export const BAZI_PROJECT_COPY_MATERIALIZATION_VERSION_AWARE_CANDIDATE_RELATIVE_PATH =
  "content/system-admission/bazi-project-copy-materialization-requirements.v1.1.0.json";

const HISTORICAL_REQUIREMENTS = OBJECT_FREEZE({
  path: "content/system-admission/bazi-project-copy-materialization-requirements.v1.json",
  rawBytes: 6168,
  rawSha256: "c63a95514063fb64752d449f6ccb1c844544110e5ed9f1192de2ef7723efd13b",
  ledgerId: "hakimi.bazi.project-copy-materialization-requirements/1.0.0",
  ledgerDigest: "690320c5d9778bf61da5ca3e112aedc6f9e2760e27f628f4c992cb5b9a8af1cb",
  schemaVersion: "1.0.0",
  recordType: "bazi_project_copy_materialization_requirements_v1",
  status: "zero_instance_materialization_requirements_defined",
  createdAt: "2026-08-29T00:00:00.000Z"
});
const SOURCE_V16 = OBJECT_FREEZE({
  path: "content/bazi-strength-source-binding-candidates.v1.6.0.json",
  rawBytes: 50427,
  rawSha256: "62f6a68b99246a802bcf2055aa09a8ac8113df37a7ede1c55d8a2ea64deaea98",
  ledgerId: "hakimi.bazi.strength.source-binding-candidates/1.6.0",
  ledgerDigest: "6f008058b282613fd131344206b27fccb1d80596bb49789f0554acdd69c1e44c"
});
const RIGHTS_V12 = OBJECT_FREEZE({
  path: "content/bazi-strength-source-rights-candidates.v1.2.0.json",
  rawBytes: 23947,
  rawSha256: "678632a8875672f58bb5c9f1ec4a299a4f0c6e750b8ff4a02bfe4df889e1243a",
  ledgerId: "hakimi.bazi.strength.source-rights-candidates/1.2.0",
  ledgerDigest: "300e092c4913885cff626221b8734786128639c7d6cfd7c2be7bea2acc6bbefc"
});
const READINESS_V17 = OBJECT_FREEZE({
  path: "content/system-admission/bazi-binding-freeze-requirements.v1.7.0.json",
  rawBytes: 32629,
  rawSha256: "7565a1c1ae51c09c78cf8f906e544bd8ee822020f76587237bc909ef1e6408a2",
  ledgerId: "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.7.0",
  ledgerDigest: "afdebfa1fb7a797f02d136373eb9aef1afa26b38b755926f8930ea5de97316b8"
});
const SUPERSESSION_RECEIPT = OBJECT_FREEZE({
  path: "content/system-admission/bazi-dtt-versioned-parent-supersession.v1.json",
  rawBytes: 9229,
  rawSha256: "aa9e62089990d8ba699c441114914173141e8228f027605b47f5c5e238fac0e3",
  supersessionId: "hakimi.bazi.dtt-versioned-parent-supersession/1.0.0",
  supersessionDigest: "601b4e07b94e62b73812a7a26f1108a094272dca660a188bb660fa860f031264"
});
const UNCHANGED_NON_PARENT_BASIS = OBJECT_FREEZE([
  OBJECT_FREEZE({
    path: "content/knowledge/manifest.v2.json",
    role: "current_empty_bundled_knowledge_manifest",
    bytes: 48,
    sha256: "92e4d2c92aeb7f1e7898014be429f0fab92885dd52c36aee8eb1523941c55122"
  }),
  OBJECT_FREEZE({
    path: "packages/contracts/src/index.ts",
    role: "formal_source_carrier_schema_basis",
    bytes: 244747,
    sha256: "674a3fe1e2b3cd4fc99e481a758966a320ddc3c1113a9471eba190851d15e041"
  }),
  OBJECT_FREEZE({
    path: "packages/knowledge-core/src/index.ts",
    role: "knowledge_text_normalization_and_materialization_basis",
    bytes: 39595,
    sha256: "9e6420e8c6c5b3aafd892fdb3c5363af81ea9d9e24ebff6e11897300053524b0"
  })
]);
const RELEASE_GOVERNANCE = OBJECT_FREEZE({
  activeLine: "legacy-v13",
  expertClaimsAuthorized: false,
  migrationId: null,
  mutationEpochBoundaryRequired: true,
  publicDeploymentAuthorized: false,
  targetSchema: 13
});
const HISTORICAL_DIGEST_DOMAIN = "hakimi.bazi.project-copy-materialization-requirements.v1";
const CANDIDATE_DIGEST_DOMAIN =
  "hakimi.bazi.project-copy-materialization-requirements.version-aware-candidate.v1.1";
const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 10887,
  rawSha256: "7e98e6042cd1ccb00a2cff749f0000a989baacd683271edffc3158a80ee02b83",
  ledgerDigest: "d877ac00042d9e9635b0bf2cfe7b5f387f3aad82faa96c8a7214548299045d3f"
});
const VERIFIED_RESULTS = new WeakSet();

export class BaziProjectCopyMaterializationVersionAwareCandidateError extends Error {
  constructor(code, message, cause) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "BaziProjectCopyMaterializationVersionAwareCandidateError";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new BaziProjectCopyMaterializationVersionAwareCandidateError(code, message, cause);
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
      fail("NON_PASSIVE_OBJECT", "C-M1 version-aware candidate 只接受无 accessor 的被动值。");
    }
    deepFreeze(descriptor.value, seen);
  }
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function canonicalStringify(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return REFLECT_APPLY(JSON_STRINGIFY, JSON, [value]);
  }
  if (typeof value === "number") {
    if (!REFLECT_APPLY(NUMBER_IS_FINITE, null, [value])) {
      fail("NON_JSON_VALUE", "C-M1 JSON 不接受非有限数值。");
    }
    return REFLECT_APPLY(JSON_STRINGIFY, JSON, [value]);
  }
  if (value === null || typeof value !== "object") {
    fail("NON_JSON_VALUE", "C-M1 candidate 含非 JSON 值。");
  }
  if (REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value])) {
    let text = "[";
    for (let index = 0; index < value.length; index += 1) {
      if (index > 0) text += ",";
      const descriptor = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [value, index]);
      if (!descriptor || !("value" in descriptor)) fail("NON_PASSIVE_OBJECT", "C-M1 JSON 数组必须稠密且无 accessor。");
      text += canonicalStringify(descriptor.value);
    }
    return `${text}]`;
  }
  const keys = [];
  const ownKeys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
  for (let index = 0; index < ownKeys.length; index += 1) {
    const key = ownKeys[index];
    if (typeof key !== "string") fail("NON_JSON_KEY", "C-M1 JSON 不接受 symbol key。");
    const descriptor = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [value, key]);
    if (!descriptor || !("value" in descriptor)) fail("NON_PASSIVE_OBJECT", "C-M1 JSON 不接受 accessor。");
    REFLECT_APPLY(ARRAY_PUSH, keys, [key]);
  }
  REFLECT_APPLY(ARRAY_SORT, keys, []);
  let text = "{";
  for (let index = 0; index < keys.length; index += 1) {
    if (index > 0) text += ",";
    const key = keys[index];
    const descriptor = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [value, key]);
    if (!descriptor || !("value" in descriptor)) fail("NON_PASSIVE_OBJECT", "C-M1 JSON 不接受 accessor。");
    text += `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [key])}:${canonicalStringify(descriptor.value)}`;
  }
  return `${text}}`;
}

function canonicalValue(value) {
  return REFLECT_APPLY(JSON_PARSE, JSON, [canonicalStringify(value)]);
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
  return `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [canonicalValue(value), null, 2])}\n`;
}

function snapshotForValue(value) {
  const bytes = REFLECT_APPLY(BUFFER_FROM, NATIVE_BUFFER, [serialize(value), "utf8"]);
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [{
    rawBytes: REFLECT_APPLY(TYPED_ARRAY_BYTE_LENGTH_GETTER, bytes, []),
    rawSha256: sha256Bytes(bytes),
    bytes
  }]);
}

export function computeBaziProjectCopyMaterializationVersionAwareCandidateDigest(value) {
  const unsigned = canonicalValue(value);
  delete unsigned.ledgerDigest;
  return domainSeparatedDigest(CANDIDATE_DIGEST_DOMAIN, unsigned);
}

function assertSupersession(result) {
  if (!isVerifiedBaziDttVersionedParentSupersession(result)) {
    fail("SUPERSESSION_BRAND_REQUIRED", "C-M1 v1.1 必须消费同根 source/rights supersession WeakSet 品牌。");
  }
  if (result.offlineVersionedParentSupersessionMechanicallyVerified !== true
    || result.supersessionId !== SUPERSESSION_RECEIPT.supersessionId
    || result.supersessionDigest !== SUPERSESSION_RECEIPT.supersessionDigest
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
    || result.artifacts?.receipt?.path !== SUPERSESSION_RECEIPT.path
    || result.artifacts?.receipt?.rawBytes !== SUPERSESSION_RECEIPT.rawBytes
    || result.artifacts?.receipt?.rawSha256 !== SUPERSESSION_RECEIPT.rawSha256
    || result.noticeProjectionCorrectedAtSupersedingCandidateParentLayer !== true
    || result.boundReadinessConsumesSupersedingParents !== false
    || result.boundReadinessStillPinsHistoricalParents !== true
    || result.promotionBlocked !== true
    || result.distributionPolicy !== "link_only"
    || result.formalSourceRightsRecordCount !== 0
    || result.formalSourceCarrierRecordCount !== 0
    || result.bindingFrozenVerified !== 0
    || result.noticeProjection?.publicDomainMarkCountsAsLicense !== false
    || result.noticeProjection?.noticeApplicabilityEstablished !== false
    || result.noticeProjection?.legalConclusion !== "not_established"
    || result.releaseReady !== false
    || result.publicDeploymentAuthorized !== false
    || result.expertClaimsAuthorized !== false
    || result.crossFileAtomicSnapshot !== false
    || result.mutationEpochAvailable !== false
    || result.mutationEpochReceipt !== null
    || result.intervalMutationExcludedAcrossFiles !== false
    || result.abaExcluded !== false) {
    fail("SUPERSESSION_TUPLE_MISMATCH", "C-M1 source/rights supersession 身份、supporting receipt 或红门漂移。");
  }
  return {
    sourceBinding: {
      ...result.artifacts.sourceBinding,
      ledgerId: result.sourceLedgerId,
      ledgerDigest: result.sourceLedgerDigest
    },
    sourceRights: {
      ...result.artifacts.sourceRights,
      ledgerId: result.rightsLedgerId,
      ledgerDigest: result.rightsLedgerDigest
    },
    supportingSupersessionReceipt: {
      path: result.artifacts.receipt.path,
      rawBytes: result.artifacts.receipt.rawBytes,
      rawSha256: result.artifacts.receipt.rawSha256,
      supersessionId: result.supersessionId,
      supersessionDigest: result.supersessionDigest
    }
  };
}

function assertReadiness(result) {
  if (!isVerifiedBaziBindingFreezeRequirementsV17(result)) {
    fail("READINESS_BRAND_REQUIRED", "C-M1 v1.1 必须消费同根 readiness 1.7 WeakSet 品牌。");
  }
  const currentParents = result.readiness?.dttNoticeReconciliationGate?.currentCandidateParentIdentities;
  const reconciliationGate = result.readiness?.dttNoticeReconciliationGate;
  const receipt = reconciliationGate?.supersessionReceipt;
  if (result.versionAwareCandidateReadinessMechanicallyVerified !== true
    || result.activeAdmissionEffect !== "none"
    || result.ledgerId !== READINESS_V17.ledgerId
    || result.ledgerDigest !== READINESS_V17.ledgerDigest
    || result.artifact?.path !== READINESS_V17.path
    || result.artifact?.bytes !== READINESS_V17.rawBytes
    || result.artifact?.sha256 !== READINESS_V17.rawSha256
    || currentParents?.sourceBinding?.path !== SOURCE_V16.path
    || currentParents?.sourceBinding?.rawBytes !== SOURCE_V16.rawBytes
    || currentParents?.sourceBinding?.rawSha256 !== SOURCE_V16.rawSha256
    || currentParents?.sourceBinding?.ledgerId !== SOURCE_V16.ledgerId
    || currentParents?.sourceBinding?.ledgerDigest !== SOURCE_V16.ledgerDigest
    || currentParents?.sourceRights?.path !== RIGHTS_V12.path
    || currentParents?.sourceRights?.rawBytes !== RIGHTS_V12.rawBytes
    || currentParents?.sourceRights?.rawSha256 !== RIGHTS_V12.rawSha256
    || currentParents?.sourceRights?.ledgerId !== RIGHTS_V12.ledgerId
    || currentParents?.sourceRights?.ledgerDigest !== RIGHTS_V12.ledgerDigest
    || receipt?.path !== SUPERSESSION_RECEIPT.path
    || receipt?.bytes !== SUPERSESSION_RECEIPT.rawBytes
    || receipt?.sha256 !== SUPERSESSION_RECEIPT.rawSha256
    || receipt?.supersessionId !== SUPERSESSION_RECEIPT.supersessionId
    || receipt?.supersessionDigest !== SUPERSESSION_RECEIPT.supersessionDigest
    || reconciliationGate?.candidateProjectionResolved !== true
    || reconciliationGate?.candidateParentPairVersionedSupersessionReceiptComplete !== true
    || reconciliationGate?.candidateNoticeProjectionReconciliationPassed !== true
    || reconciliationGate?.noticeApplicabilityEstablished !== false
    || reconciliationGate?.rightsLegalConclusionEstablished !== false
    || reconciliationGate?.formalAdmissionPromotionBlocked !== true
    || reconciliationGate?.promotionBlocked !== true
    || reconciliationGate?.activeAdmissionEffect !== "none"
    || reconciliationGate?.currentDistributionBoundary !==
      "link_only_no_redistribution_clearance"
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
    || result.releaseReady !== false
    || result.publicDeploymentAuthorized !== false
    || result.expertClaimsAuthorized !== false
    || result.distributionPolicy !== "link_only"
    || result.crossFileAtomicSnapshot !== false
    || result.mutationEpochAvailable !== false
    || result.mutationEpochReceipt !== null
    || result.intervalMutationExcludedAcrossFiles !== false
    || result.abaExcluded !== false) {
    fail("READINESS_TUPLE_MISMATCH", "C-M1 readiness 1.7 身份、parent coherence 或红门漂移。");
  }
  return {
    sourceBinding: {
      path: currentParents.sourceBinding.path,
      rawBytes: currentParents.sourceBinding.rawBytes,
      rawSha256: currentParents.sourceBinding.rawSha256,
      ledgerId: currentParents.sourceBinding.ledgerId,
      ledgerDigest: currentParents.sourceBinding.ledgerDigest
    },
    sourceRights: {
      path: currentParents.sourceRights.path,
      rawBytes: currentParents.sourceRights.rawBytes,
      rawSha256: currentParents.sourceRights.rawSha256,
      ledgerId: currentParents.sourceRights.ledgerId,
      ledgerDigest: currentParents.sourceRights.ledgerDigest
    },
    supportingSupersessionReceipt: {
      path: receipt.path,
      rawBytes: receipt.bytes,
      rawSha256: receipt.sha256,
      supersessionId: receipt.supersessionId,
      supersessionDigest: receipt.supersessionDigest
    }
  };
}

async function readHistoricalRequirements(workspaceRoot) {
  const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, HISTORICAL_REQUIREMENTS.path);
  if (snapshot.rawBytes !== HISTORICAL_REQUIREMENTS.rawBytes
    || snapshot.rawSha256 !== HISTORICAL_REQUIREMENTS.rawSha256) {
    fail("HISTORICAL_REQUIREMENTS_RAW_DRIFT", "历史 C-M1 requirements raw identity 漂移。");
  }
  const ledger = parseBaziDttStrictJsonArtifact(snapshot);
  const unsigned = cloneJson(ledger);
  delete unsigned.ledgerDigest;
  if (ledger.schemaVersion !== HISTORICAL_REQUIREMENTS.schemaVersion
    || ledger.recordType !== HISTORICAL_REQUIREMENTS.recordType
    || ledger.ledgerId !== HISTORICAL_REQUIREMENTS.ledgerId
    || ledger.ledgerDigest !== HISTORICAL_REQUIREMENTS.ledgerDigest
    || ledger.status !== HISTORICAL_REQUIREMENTS.status
    || ledger.createdAt !== HISTORICAL_REQUIREMENTS.createdAt
    || domainSeparatedDigest(HISTORICAL_DIGEST_DOMAIN, unsigned) !== ledger.ledgerDigest
    || !exactJson(ledger.releaseGovernance, RELEASE_GOVERNANCE)
    || ledger.basisArtifacts?.length !== 6
    || ledger.currentInventory?.bundledManifestEntries !== 0
    || ledger.currentInventory?.formalSourceCarrierRecords !== 0
    || ledger.currentInventory?.formalSourceRightsRecords !== 0
    || ledger.currentInventory?.materializationsVerified !== 0
    || ledger.currentInventory?.projectCopyMaterializationRecords !== 0
    || ledger.currentInventory?.redistributableSources !== 0
    || ledger.currentInventory?.sourceBindingsFrozen !== 0
    || ledger.currentInventory?.sourceBindingsRequired !== 12
    || ledger.receiptRequirements?.currentPersistedReceiptIds?.length !== 0
    || ledger.receiptRequirements?.candidateSchemaVersion !== "1.0.0"
    || ledger.receiptRequirements?.receiptSchemaVersion !== "1.0.0"
    || ledger.normalizationProfile?.profileId !== "hakimi.knowledge.utf8-text-normalization/1.0.0"
    || ledger.gateSummary?.bindingFrozenVerified !== 0
    || ledger.gateSummary?.formalSourceCarrierRecords !== 0
    || ledger.gateSummary?.formalSourceRightsRecords !== 0
    || ledger.gateSummary?.materializationsVerified !== 0
    || ledger.gateSummary?.projectCopyMaterializationRecords !== 0
    || ledger.gateSummary?.releaseReady !== false
    || ledger.gateSummary?.publicDeploymentAuthorized !== false
    || ledger.authorityBoundary?.bindingFreezeEffect !== "none"
    || ledger.authorityBoundary?.rightsEffect !== "none"
    || ledger.authorityBoundary?.legalConclusion !== "not_established"
    || ledger.authorityBoundary?.contentTruthEstablished !== false
    || ledger.authorityBoundary?.expertTruthEstablished !== false
    || ledger.authorityBoundary?.expertClaimsAuthorized !== false
    || ledger.authorityBoundary?.releaseReady !== false
    || ledger.authorityBoundary?.publicDeploymentAuthorized !== false
    || ledger.observationBoundary?.crossFileAtomicSnapshot !== false
    || ledger.observationBoundary?.mutationEpochAvailableForSchema13 !== false
    || ledger.observationBoundary?.mutationEpochReceipt !== null
    || ledger.observationBoundary?.intervalMutationExcluded !== false
    || ledger.observationBoundary?.abaExcluded !== false) {
    fail("HISTORICAL_REQUIREMENTS_SEMANTIC_DRIFT", "历史 C-M1 requirements semantic identity、zero-instance 或红门漂移。");
  }
  for (let index = 0; index < UNCHANGED_NON_PARENT_BASIS.length; index += 1) {
    const historical = ledger.basisArtifacts[index];
    const expected = UNCHANGED_NON_PARENT_BASIS[index];
    if (historical?.path !== expected.path
      || historical?.role !== expected.role
      || historical?.bytes !== expected.bytes
      || historical?.sha256 !== expected.sha256) {
      fail("HISTORICAL_REQUIREMENTS_SEMANTIC_DRIFT", "历史 C-M1 三项 non-parent basis 身份漂移。");
    }
  }
  return { ledger, snapshot };
}

async function verifyUnchangedNonParentBasis(workspaceRoot) {
  const verified = [];
  for (let index = 0; index < UNCHANGED_NON_PARENT_BASIS.length; index += 1) {
    const expected = UNCHANGED_NON_PARENT_BASIS[index];
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, expected.path);
    if (snapshot.rawBytes !== expected.bytes || snapshot.rawSha256 !== expected.sha256) {
      fail("UNCHANGED_NON_PARENT_BASIS_RAW_DRIFT", `${expected.path} raw identity 漂移。`);
    }
    REFLECT_APPLY(ARRAY_PUSH, verified, [{
      path: expected.path,
      role: expected.role,
      bytes: expected.bytes,
      sha256: expected.sha256,
      pointInTimeRawIdentityVerified: true,
      currentProjectionInspectionReexecutedByThisLayer: false
    }]);
  }
  return verified;
}

function parentBasis(identity, role) {
  return {
    path: identity.path,
    role,
    bytes: identity.rawBytes,
    sha256: identity.rawSha256,
    pointInTimeRawIdentityVerified: true,
    currentProjectionInspectionReexecutedByThisLayer: false
  };
}

async function buildExpectedBundle(workspaceRoot) {
  const supersession = await loadBaziDttVersionedParentSupersession(workspaceRoot);
  const supersessionTuple = assertSupersession(supersession);
  const readiness = await loadBaziBindingFreezeRequirementsV17(workspaceRoot);
  const readinessTuple = assertReadiness(readiness);
  if (!exactJson(supersessionTuple, readinessTuple)) {
    fail("CROSS_BRAND_PARENT_TUPLE_MISMATCH", "supersession 与 readiness 品牌的 source/rights/receipt actual tuple 不一致。");
  }
  const historical = await readHistoricalRequirements(workspaceRoot);
  const unchangedBasis = await verifyUnchangedNonParentBasis(workspaceRoot);
  if (unchangedBasis.length !== 3) {
    fail("UNCHANGED_NON_PARENT_BASIS_COUNT_MISMATCH", "C-M1 v1.1 必须精确复核 3 项 non-parent basis。");
  }
  const basisArtifacts = REFLECT_APPLY(ARRAY_SLICE, unchangedBasis, [0]);
  REFLECT_APPLY(ARRAY_PUSH, basisArtifacts, [
    parentBasis(SOURCE_V16, "versioned_phase_c_source_candidate_parent_ledger"),
    parentBasis(RIGHTS_V12, "versioned_phase_c_rights_candidate_parent_ledger"),
    parentBasis(READINESS_V17, "version_aware_phase_c_binding_freeze_candidate_readiness_parent")
  ]);
  const doesNotEstablish = cloneJson(historical.ledger.doesNotEstablish);
  REFLECT_APPLY(ARRAY_PUSH, doesNotEstablish, [
    "active_readiness_or_formal_admission",
    "formal_parent_identity",
    "fresh_materialization_contract_or_runtime_reexecution_by_this_layer"
  ]);
  const unsigned = {
    authorityBoundary: cloneJson(historical.ledger.authorityBoundary),
    basisArtifacts,
    contractBoundary: cloneJson(historical.ledger.contractBoundary),
    createdAt: "2026-08-30T00:00:00.000Z",
    currentInventory: cloneJson(historical.ledger.currentInventory),
    doesNotEstablish,
    gateSummary: {
      ...cloneJson(historical.ledger.gateSummary),
      sourceRightsSupersessionWeakSetBrandVerified: true,
      candidateReadinessWeakSetBrandVerified: true,
      historicalMaterializationContractProjectionReusedAfterUnchangedNonParentBasisRawIdentityMatchAndBrandedParentRebind:
        true,
      historicalDirectParentSlotsRebound: 3,
      verifiedUpstreamCapabilityCount: 2,
      currentInventoryChanged: false,
      materializationContractProjectionChanged: false,
      materializationApiIntegratedByThisCandidate: false,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      browserRuntimeEvidenceEstablished: false,
      expertClaimsAuthorized: false,
      activeAdmissionEffect: "none",
      formalAdmissionPromotionBlocked: true,
      formalActivationAllowed: false
    },
    historicalLineage: {
      ...HISTORICAL_REQUIREMENTS,
      role: "fixed_zero_instance_materialization_contract_projection_template_only_not_current_capability"
    },
    integrityBoundary: {
      ...cloneJson(historical.ledger.integrityBoundary),
      digestDomain: CANDIDATE_DIGEST_DOMAIN
    },
    ledgerId:
      "hakimi.bazi.project-copy-materialization-requirements.version-aware-candidate/1.1.0",
    normalizationProfile: cloneJson(historical.ledger.normalizationProfile),
    observationBoundary: {
      directHistoricalRequirementsRawAndSemanticIdentityVerified: true,
      historicalMaterializationContractProjectionReusedAfterUnchangedNonParentBasisRawIdentityMatchAndBrandedParentRebind:
        true,
      unchangedDirectNonParentBasisPointInTimeRawIdentitiesVerified: unchangedBasis.length,
      upstreamBrandedCapabilitiesVerified: 2,
      nestedVerifierSameBufferTransitivityClaimed: false,
      currentProjectionInspectionReexecutedByThisLayer: false,
      runtimeExecutionObservedByThisLayer: false,
      endpointSnapshotOnly: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      intervalMutationExcluded: false,
      abaExcluded: false
    },
    receiptRequirements: cloneJson(historical.ledger.receiptRequirements),
    recordType: "bazi_project_copy_materialization_requirements_version_aware_candidate_v1_1",
    releaseGovernance: cloneJson(historical.ledger.releaseGovernance),
    schemaVersion: "1.1.0",
    status: "candidate_only_version_aware_zero_instance_materialization_requirements_no_admission_effect",
    versionedCandidateParentRebind: {
      activeAdmissionEffect: "none",
      sourceRightsSupersessionWeakSetBrandVerified: true,
      candidateReadinessWeakSetBrandVerified: true,
      sourceBindingParent: SOURCE_V16,
      sourceRightsParent: RIGHTS_V12,
      candidateReadinessParent: READINESS_V17,
      supportingSupersessionReceipt: SUPERSESSION_RECEIPT,
      historicalDirectParentSlotsRebound: 3,
      verifiedUpstreamCapabilityCount: 2,
      supportingReceiptArtifacts: 1,
      historicalParentArtifactsMutated: false,
      currentInventoryChanged: false,
      materializationContractProjectionChanged: false,
      materializationApiIntegratedByThisCandidate: false,
      formalActivationAllowed: false
    }
  };
  const ledger = deepFreeze({
    ...unsigned,
    ledgerDigest: computeBaziProjectCopyMaterializationVersionAwareCandidateDigest(unsigned)
  });
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [{ ledger, snapshot: snapshotForValue(ledger) }]);
}

function assertExpectedRawPins(snapshot, ledger) {
  if (EXPECTED_PERSISTED.rawBytes <= 0
    || EXPECTED_PERSISTED.rawSha256.length !== 64
    || EXPECTED_PERSISTED.ledgerDigest.length !== 64) {
    fail("RAW_PIN_NOT_FROZEN", "C-M1 v1.1 raw/semantic identity 尚未冻结。");
  }
  if (snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
    || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256) {
    fail("PERSISTED_RAW_DRIFT", "C-M1 v1.1 raw identity 漂移。");
  }
  if (ledger.ledgerDigest !== EXPECTED_PERSISTED.ledgerDigest
    || computeBaziProjectCopyMaterializationVersionAwareCandidateDigest(ledger)
      !== ledger.ledgerDigest) {
    fail("PERSISTED_DIGEST_DRIFT", "C-M1 v1.1 semantic digest 漂移。");
  }
}

export async function loadBaziProjectCopyMaterializationVersionAwareCandidate(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])
) {
  const expected = await buildExpectedBundle(workspaceRoot);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    BAZI_PROJECT_COPY_MATERIALIZATION_VERSION_AWARE_CANDIDATE_RELATIVE_PATH
  );
  const persisted = parseBaziDttStrictJsonArtifact(snapshot);
  if (!exactJson(persisted, expected.ledger)) {
    fail("C_M1_V11_MISMATCH", "持久化 C-M1 v1.1 不等于允许的 version-aware zero-instance 投影。");
  }
  assertExpectedRawPins(snapshot, persisted);
  const result = deepFreeze({
    versionAwareProjectCopyMaterializationRequirementsMechanicallyVerified: true,
    activeAdmissionEffect: "none",
    ledgerId: persisted.ledgerId,
    ledgerDigest: persisted.ledgerDigest,
    artifact: {
      path: BAZI_PROJECT_COPY_MATERIALIZATION_VERSION_AWARE_CANDIDATE_RELATIVE_PATH,
      bytes: snapshot.rawBytes,
      sha256: snapshot.rawSha256
    },
    historicalMaterializationContractProjectionReusedAfterUnchangedNonParentBasisRawIdentityMatchAndBrandedParentRebind:
      true,
    historicalDirectParentSlotsRebound: 3,
    verifiedUpstreamCapabilityCount: 2,
    unchangedDirectNonParentBasisCount: 3,
    materializationApiIntegratedByThisCandidate: false,
    materializationCandidateSchemaVersion: "1.0.0",
    materializationReceiptSchemaVersion: "1.0.0",
    normalizationProfileId: "hakimi.knowledge.utf8-text-normalization/1.0.0",
    bundledManifestEntryCount: 0,
    formalSourceCarrierRecordCount: 0,
    formalSourceRightsRecordCount: 0,
    materializationVerifiedCount: 0,
    projectCopyMaterializationRecordCount: 0,
    redistributableSourceCount: 0,
    bindingRequired: 12,
    bindingFrozenVerified: 0,
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

export function isVerifiedBaziProjectCopyMaterializationVersionAwareCandidate(value) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value]);
}

export const baziProjectCopyMaterializationVersionAwareCandidateTestOnly = OBJECT_FREEZE({
  HISTORICAL_REQUIREMENTS,
  SOURCE_V16,
  RIGHTS_V12,
  READINESS_V17,
  SUPERSESSION_RECEIPT,
  UNCHANGED_NON_PARENT_BASIS,
  EXPECTED_PERSISTED,
  assertSupersession,
  assertReadiness,
  readHistoricalRequirements,
  verifyUnchangedNonParentBasis,
  buildExpectedBundle,
  serialize,
  exactJson
});
