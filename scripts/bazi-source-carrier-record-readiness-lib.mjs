import { createHash } from "node:crypto";
import { TextDecoder as NodeTextDecoder } from "node:util";
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

const NATIVE_TEXT_DECODER = NodeTextDecoder;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_SORT = Array.prototype.sort;
const JSON_STRINGIFY = JSON.stringify;
const OBJECT_KEYS = Object.keys;
const REFLECT_APPLY = Reflect.apply;

const DIGEST_DOMAIN = "hakimi.bazi.source-carrier-record-readiness.v1";
const CHILD_PATH = "content/system-admission/bazi-source-carrier-record-readiness.v1.json";
const CHILD_LEDGER_ID = "hakimi.bazi.source-carrier-record-readiness/1.0.0";
const CHILD_LEDGER_DIGEST = "7b34f976c58b541895747177a2326af82241d76432acba3dbbd8fac2b68ad3c5";
const CHILD_STATUS = "candidate_only_five_carrier_gap_inventory_zero_instance_no_admission_effect";
const CHILD_REFERENCE_MARKERS = Object.freeze([
  CHILD_PATH,
  CHILD_LEDGER_ID
]);

const ARTIFACTS = Object.freeze({
  source: Object.freeze({
    path: "content/bazi-strength-source-binding-candidates.v1.6.0.json",
    rawBytes: 50_427,
    rawSha256: "62f6a68b99246a802bcf2055aa09a8ac8113df37a7ede1c55d8a2ea64deaea98",
    ledgerId: "hakimi.bazi.strength.source-binding-candidates/1.6.0",
    ledgerDigest: "6f008058b282613fd131344206b27fccb1d80596bb49789f0554acdd69c1e44c"
  }),
  rights: Object.freeze({
    path: "content/bazi-strength-source-rights-candidates.v1.2.0.json",
    rawBytes: 23_947,
    rawSha256: "678632a8875672f58bb5c9f1ec4a299a4f0c6e750b8ff4a02bfe4df889e1243a",
    ledgerId: "hakimi.bazi.strength.source-rights-candidates/1.2.0",
    ledgerDigest: "300e092c4913885cff626221b8734786128639c7d6cfd7c2be7bea2acc6bbefc"
  }),
  readiness: Object.freeze({
    path: "content/system-admission/bazi-binding-freeze-requirements.v1.7.0.json",
    rawBytes: 32_629,
    rawSha256: "7565a1c1ae51c09c78cf8f906e544bd8ee822020f76587237bc909ef1e6408a2",
    ledgerId: "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.7.0",
    ledgerDigest: "afdebfa1fb7a797f02d136373eb9aef1afa26b38b755926f8930ea5de97316b8"
  }),
  contracts: Object.freeze({
    path: "packages/contracts/src/index.ts",
    rawBytes: 244_747,
    rawSha256: "674a3fe1e2b3cd4fc99e481a758966a320ddc3c1113a9471eba190851d15e041"
  }),
  materialization: Object.freeze({
    path: "content/system-admission/bazi-project-copy-materialization-requirements.v1.1.0.json",
    rawBytes: 10_887,
    rawSha256: "7e98e6042cd1ccb00a2cff749f0000a989baacd683271edffc3158a80ee02b83",
    ledgerId: "hakimi.bazi.project-copy-materialization-requirements.version-aware-candidate/1.1.0",
    ledgerDigest: "d877ac00042d9e9635b0bf2cfe7b5f387f3aad82faa96c8a7214548299045d3f"
  }),
  child: Object.freeze({
    path: CHILD_PATH,
    rawBytes: 27_322,
    rawSha256: "d5624c796f715b3e4a9846714a036621a8ccc66d8e3433a91e7bf69beba291e9"
  })
});

const EXPECTED_SOURCE_CANDIDATES = Object.freeze([
  Object.freeze({
    candidateId: "smt-siku-v10-wikisource-r761703-candidate-v1",
    candidateDigest: "e726f93c6b8001a75c1ae58e17506976f970b483728f7f8ef21e37313981f92a",
    rightsCandidateId: "smt-siku-v10-wikisource-r761703-rights-candidate-v1",
    rightsCandidateDigest: "5ac820401e53d6268c0250232bb2de3c813f2fbe5ed7a05ff46200c7f72fca16",
    anchorIds: Object.freeze(["smt-v10-gujin-volume-472-page-28-facsimile-v1"])
  }),
  Object.freeze({
    candidateId: "dtt-chanwei-wikisource-r2600158-candidate-v2",
    candidateDigest: "2c59ee25081c6e0a88ee7f9da18395be2ea615bb289c28798e324e23befeeb59",
    rightsCandidateId: "dtt-chanwei-wikisource-r2600158-rights-candidate-v2",
    rightsCandidateDigest: "674a0b64179f5fbb0dff331fdad6b6ac93e3093de4a8459abf6ff9bdd6cd418c",
    anchorIds: Object.freeze([
      "dtt-chanwei-ssid-11335994-pages-170-176-facsimile-v1",
      "dtt-chanwei-cadal-07005210-pages-178-184-facsimile-v1"
    ])
  }),
  Object.freeze({
    candidateId: "smt-v5-wikisource-r2706483-candidate-v1",
    candidateDigest: "c9dead89c020772224db8e0802373797d939839b184a32ab0d6db05c7a2c2b62",
    rightsCandidateId: "smt-v5-wikisource-r2706483-rights-candidate-v1",
    rightsCandidateDigest: "4b6b1187147e81ecee5e7f45b219a7c627b7da3d63a845f6faaf192ee9480d43",
    anchorIds: Object.freeze(["smt-v5-gujin-volume-470-page-115-facsimile-v1"])
  }),
  Object.freeze({
    candidateId: "yhzp-wikisource-r2593607-candidate-v1",
    candidateDigest: "8a2d7aa5705cd8735af2b9563bb094f09b0d9bcd9881bb6d711dc108f9fc0257",
    rightsCandidateId: "yhzp-wikisource-r2593607-rights-candidate-v1",
    rightsCandidateDigest: "2a4ed5ce56564eac5813bdd75378fff0d3288b92d3f9d4bb46cd2429c9c0ad43",
    anchorIds: Object.freeze(["yhzp-nlc416-15jh007754-99036-page-54-facsimile-v1"])
  })
]);

const SOURCE_CARRIER_FIELDS = Object.freeze([
  "schemaVersion", "recordType", "carrierId", "documentId", "documentContentHash",
  "carrierType", "provider", "sourceUrl", "acquiredAt", "accessMethod",
  "contentDigest", "imageDigest", "ocrDigest", "rights", "storagePolicy",
  "review", "editVersion", "createdAt", "updatedAt"
]);

const PROMOTION_BLOCKERS = Object.freeze([
  "knowledge_document_absent",
  "formal_source_rights_record_absent",
  "formal_source_carrier_record_absent",
  "work_layer_not_cleared",
  "edition_or_transcription_layer_not_cleared",
  "carrier_layer_not_cleared",
  "jurisdiction_and_notice_applicability_not_adjudicated",
  "carrier_permission_matrix_not_adjudicated",
  "independent_rights_reviewer_identity_scope_and_independence_unverified",
  "carrier_custody_acquisition_and_access_record_absent",
  "normalized_text_content_digest_absent",
  "project_copy_materialization_absent",
  "platform_notice_is_observation_not_legal_conclusion",
  "carrier_raw_digest_is_not_normalized_document_digest"
]);

const CAPABILITY_CONSTRUCTION_TOKEN = {};

class VerifiedBaziSourceCarrierRecordReadinessCapability {
  #summary;

  constructor(token) {
    if (token !== CAPABILITY_CONSTRUCTION_TOKEN) {
      fail("CAPABILITY_CONSTRUCTION_FORBIDDEN", "verified capability construction is private to the full loader.");
    }
    this.#summary = {
      ledgerId: CHILD_LEDGER_ID,
      ledgerDigest: CHILD_LEDGER_DIGEST,
      status: CHILD_STATUS,
      canonicalSourceRightsSupersessionBrandVerified: true,
      canonicalBindingReadinessV17BrandVerified: true,
      carrierObservationLayers: 5,
      dttCarrierObservationLayers: 2,
      formalSourceRightsRecords: 0,
      formalSourceCarrierRecords: 0,
      projectCopyMaterializationRecords: 0,
      materializationsVerified: 0,
      adjudicationReceiptsIssued: 0,
      verifiedRightsReviewers: 0,
      sourceBindingsFrozen: 0,
      legalConclusion: "not_established",
      activeAdmissionEffect: "none",
      releaseReady: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      intervalMutationExcluded: false,
      abaExcluded: false
    };
  }

  static is(value) {
    return value !== null
      && typeof value === "object"
      && #summary in value;
  }

  static read(value) {
    if (value === null
      || typeof value !== "object"
      || !(#summary in value)) {
      fail("CAPABILITY_REQUIRED", "a full-loader-issued carrier readiness capability is required.");
    }
    const summary = value.#summary;
    return {
      ledgerId: summary.ledgerId,
      ledgerDigest: summary.ledgerDigest,
      status: summary.status,
      canonicalSourceRightsSupersessionBrandVerified:
        summary.canonicalSourceRightsSupersessionBrandVerified,
      canonicalBindingReadinessV17BrandVerified:
        summary.canonicalBindingReadinessV17BrandVerified,
      carrierObservationLayers: summary.carrierObservationLayers,
      dttCarrierObservationLayers: summary.dttCarrierObservationLayers,
      formalSourceRightsRecords: summary.formalSourceRightsRecords,
      formalSourceCarrierRecords: summary.formalSourceCarrierRecords,
      projectCopyMaterializationRecords: summary.projectCopyMaterializationRecords,
      materializationsVerified: summary.materializationsVerified,
      adjudicationReceiptsIssued: summary.adjudicationReceiptsIssued,
      verifiedRightsReviewers: summary.verifiedRightsReviewers,
      sourceBindingsFrozen: summary.sourceBindingsFrozen,
      legalConclusion: summary.legalConclusion,
      activeAdmissionEffect: summary.activeAdmissionEffect,
      releaseReady: summary.releaseReady,
      publicDeploymentAuthorized: summary.publicDeploymentAuthorized,
      expertClaimsAuthorized: summary.expertClaimsAuthorized,
      crossFileAtomicSnapshot: summary.crossFileAtomicSnapshot,
      mutationEpochAvailableForSchema13: summary.mutationEpochAvailableForSchema13,
      mutationEpochReceipt: summary.mutationEpochReceipt,
      intervalMutationExcluded: summary.intervalMutationExcluded,
      abaExcluded: summary.abaExcluded
    };
  }
}

const IS_VERIFIED_CAPABILITY = VerifiedBaziSourceCarrierRecordReadinessCapability.is;
const READ_VERIFIED_CAPABILITY = VerifiedBaziSourceCarrierRecordReadinessCapability.read;

export class BaziSourceCarrierRecordReadinessError extends Error {
  constructor(code, message, cause) {
    super(`BAZI_SOURCE_CARRIER_READINESS_${code}: ${message}`, cause ? { cause } : undefined);
    this.name = "BaziSourceCarrierRecordReadinessError";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new BaziSourceCarrierRecordReadinessError(code, message, cause);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !ARRAY_IS_ARRAY(value);
}

function assertRecord(value, label) {
  if (!isRecord(value)) fail("SHAPE_INVALID", `${label} must be an object.`);
}

function assertArray(value, label) {
  if (!ARRAY_IS_ARRAY(value)) fail("SHAPE_INVALID", `${label} must be an array.`);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    fail(
      "SEMANTIC_DRIFT",
      `${label} expected ${REFLECT_APPLY(JSON_STRINGIFY, undefined, [expected])}, got ${REFLECT_APPLY(JSON_STRINGIFY, undefined, [actual])}.`
    );
  }
}

function canonicalJson(value) {
  if (ARRAY_IS_ARRAY(value)) {
    let output = "[";
    for (let index = 0; index < value.length; index += 1) {
      if (index > 0) output += ",";
      output += canonicalJson(value[index]);
    }
    return `${output}]`;
  }
  if (isRecord(value)) {
    const keys = REFLECT_APPLY(OBJECT_KEYS, undefined, [value]);
    REFLECT_APPLY(ARRAY_SORT, keys, []);
    let output = "{";
    for (let index = 0; index < keys.length; index += 1) {
      if (index > 0) output += ",";
      const key = keys[index];
      output += `${REFLECT_APPLY(JSON_STRINGIFY, undefined, [key])}:${canonicalJson(value[key])}`;
    }
    return `${output}}`;
  }
  return REFLECT_APPLY(JSON_STRINGIFY, undefined, [value]);
}

function sha256Text(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function semanticDigest(domain, value) {
  return sha256Text(`${domain}\u0000${canonicalJson(value)}`);
}

function computeBaziSourceCarrierRecordReadinessDigest(ledger) {
  assertRecord(ledger, "ledger");
  const { ledgerDigest: _ledgerDigest, ...unsigned } = ledger;
  return semanticDigest(DIGEST_DOMAIN, unsigned);
}

function assertRawIdentity(snapshot, expected, label) {
  assertEqual(snapshot.path, expected.path, `${label}.path`);
  assertEqual(snapshot.rawBytes, expected.rawBytes, `${label}.rawBytes`);
  assertEqual(snapshot.rawSha256, expected.rawSha256, `${label}.rawSha256`);
}

function assertLedgerIdentity(ledger, expected, label) {
  assertRecord(ledger, label);
  assertEqual(ledger.ledgerId, expected.ledgerId, `${label}.ledgerId`);
  assertEqual(ledger.ledgerDigest, expected.ledgerDigest, `${label}.ledgerDigest`);
}

function assertNoChildBacklink(snapshot, label) {
  let text;
  try {
    text = new NATIVE_TEXT_DECODER("utf-8", { fatal: true }).decode(snapshot.bytes);
  } catch (cause) {
    fail("UTF8_INVALID", `${label} is not strict UTF-8.`, cause);
  }
  for (const marker of CHILD_REFERENCE_MARKERS) {
    if (text.includes(marker)) fail("PARENT_BACKLINK_FORBIDDEN", `${label} contains child backlink ${marker}.`);
  }
  return text;
}

function assertContractBasis(contractText) {
  for (const anchor of [
    "export const SOURCE_CARRIER_SCHEMA_VERSION = \"1.0.0\" as const;",
    "export const sourceCarrierRecordSchema = z.strictObject({",
    "documentContentHash: sha256Schema,",
    "contentDigest: sha256Schema.nullable(),",
    "storagePolicy: z.enum([\"public_repo\", \"private_vault\", \"link_only\", \"do_not_store\"])",
    "公开仓库存储必须绑定实际正文摘要、逐项允许复制、引用和再分发并完成双人复核"
  ]) {
    if (!contractText.includes(anchor)) fail("CONTRACT_DRIFT", `SourceCarrierRecord contract anchor missing: ${anchor}`);
  }
}

function verifyParentSemantics(source, rights, readiness, materialization) {
  assertLedgerIdentity(source, ARTIFACTS.source, "source parent");
  assertLedgerIdentity(rights, ARTIFACTS.rights, "rights parent");
  assertLedgerIdentity(readiness, ARTIFACTS.readiness, "readiness basis");
  assertLedgerIdentity(materialization, ARTIFACTS.materialization, "materialization basis");

  assertArray(source.candidates, "source.candidates");
  assertArray(rights.candidates, "rights.candidates");
  assertEqual(source.candidates.length, 4, "source candidate count");
  assertEqual(rights.candidates.length, 4, "rights candidate count");
  assertEqual(source.gateSummary?.bindingRequired, 12, "source required binding count");
  assertEqual(source.gateSummary?.bindingFrozenVerified, 0, "source frozen binding count");
  assertEqual(source.gateSummary?.corroboratingFacsimileAnchors, 5, "source carrier observation count");
  assertEqual(source.gateSummary?.sourceBodiesStored, 0, "source body count");
  assertEqual(source.gateSummary?.quoteTextsStored, 0, "quote text count");
  assertEqual(rights.gateSummary?.formalSourceRightsRecordsCreated, 0, "formal SourceRightsRecord count");
  assertEqual(rights.gateSummary?.formalSourceCarrierRecordsCreated, 0, "formal SourceCarrierRecord count");
  assertEqual(rights.gateSummary?.legalReviewsVerified, 0, "legal review count");
  assertEqual(rights.gateSummary?.carrierLayersCleared, 0, "cleared carrier layer count");
  assertEqual(rights.gateSummary?.redistributableSources, 0, "redistributable source count");
  assertEqual(rights.gateSummary?.carrierFilesStored, 0, "stored carrier count");
  assertEqual(readiness.releaseGovernance?.activeLine, "legacy-v13", "active release line");
  assertEqual(readiness.releaseGovernance?.targetSchema, 13, "target schema");
  assertEqual(readiness.releaseGovernance?.migrationId, null, "migration id");
  assertEqual(readiness.releaseGovernance?.mutationEpochBoundaryRequired, true, "mutation epoch requirement");
  assertEqual(readiness.gateSummary?.bindingRequired, 12, "readiness required binding count");
  assertEqual(readiness.gateSummary?.bindingFrozenVerified, 0, "readiness frozen binding count");
  assertEqual(readiness.gateSummary?.carrierIdentitiesFrozen, 0, "frozen carrier identity count");
  assertEqual(readiness.gateSummary?.carrierRightsEvidenceBound, 0, "bound carrier rights count");
  assertEqual(readiness.gateSummary?.independentSourceRightsReviewsVerified, 0, "independent rights review count");
  assertEqual(materialization.currentInventory?.formalSourceCarrierRecords, 0, "materialization formal carrier count");
  assertEqual(materialization.currentInventory?.projectCopyMaterializationRecords, 0, "project copy record count");
  assertEqual(materialization.currentInventory?.materializationsVerified, 0, "verified materialization count");
  assertEqual(materialization.gateSummary?.formalActivationAllowed, false, "materialization formal activation");
  assertEqual(materialization.gateSummary?.activeAdmissionEffect, "none", "materialization admission effect");
  assertEqual(source.supersession?.pairedRightsLedger?.ledgerId, ARTIFACTS.rights.ledgerId, "source paired rights id");
  assertEqual(rights.supersession?.pairedSourceLedger?.ledgerId, ARTIFACTS.source.ledgerId, "rights paired source id");
  assertEqual(rights.supersession?.pairedSourceLedger?.ledgerDigest, ARTIFACTS.source.ledgerDigest, "rights paired source digest");
}

function buildParentLock(artifact, ledger, candidateDigests) {
  return {
    path: artifact.path,
    rawBytes: artifact.rawBytes,
    rawSha256: artifact.rawSha256,
    ledgerId: ledger.ledgerId,
    ledgerDigest: ledger.ledgerDigest,
    candidateDigests
  };
}

function buildFieldReadiness() {
  return {
    schemaVersion: "contract_observed_no_instance",
    recordType: "not_instantiated",
    carrierId: null,
    documentId: null,
    documentContentHash: null,
    carrierType: "not_formally_adjudicated",
    provider: "observed_candidate_not_formalized",
    sourceUrl: "observed_candidate_not_formalized",
    acquiredAt: null,
    accessMethod: null,
    contentDigest: null,
    imageDigest: "carrier_raw_sha256_observed_not_formalized",
    ocrDigest: null,
    rights: "unknown_not_adjudicated",
    storagePolicy: "link_only_candidate_default_not_formal_record",
    review: "unreviewed_zero_attestations",
    editVersion: null,
    createdAt: null,
    updatedAt: null,
    alignedSourceRightsRecordId: null,
    sourceCarrierRecordId: null,
    projectCopyMaterializationRecordId: null,
    adjudicationReceiptIds: [],
    formalRecordCreated: false,
    eligibleForMaterialization: false
  };
}

function buildCarrierGaps(source, rights) {
  const rightsBySourceCandidate = new Map(rights.candidates.map((candidate) => [candidate.sourceCandidateId, candidate]));
  const rows = [];
  const seenAnchors = new Set();
  const seenCarrierFingerprints = new Set();

  EXPECTED_SOURCE_CANDIDATES.forEach((lock, sourceIndex) => {
    const sourceCandidate = source.candidates[sourceIndex];
    const rightsCandidate = rights.candidates[sourceIndex];
    assertEqual(sourceCandidate?.candidateId, lock.candidateId, `source[${sourceIndex}].candidateId`);
    assertEqual(sourceCandidate?.candidateDigest, lock.candidateDigest, `source[${sourceIndex}].candidateDigest`);
    assertEqual(rightsCandidate?.rightsCandidateId, lock.rightsCandidateId, `rights[${sourceIndex}].rightsCandidateId`);
    assertEqual(rightsCandidate?.candidateDigest, lock.rightsCandidateDigest, `rights[${sourceIndex}].candidateDigest`);
    assertEqual(rightsCandidate?.sourceCandidateId, lock.candidateId, `rights[${sourceIndex}].sourceCandidateId`);
    assertEqual(rightsBySourceCandidate.get(lock.candidateId), rightsCandidate, `rights parent join ${lock.candidateId}`);
    assertArray(sourceCandidate.facsimileAnchors, `${lock.candidateId}.facsimileAnchors`);
    assertArray(rightsCandidate.carrierLayers, `${lock.rightsCandidateId}.carrierLayers`);
    assertEqual(sourceCandidate.facsimileAnchors.length, lock.anchorIds.length, `${lock.candidateId} anchor count`);
    assertEqual(rightsCandidate.carrierLayers.length, lock.anchorIds.length, `${lock.rightsCandidateId} carrier count`);

    lock.anchorIds.forEach((anchorId, anchorIndex) => {
      const sourceCarrier = sourceCandidate.facsimileAnchors[anchorIndex];
      const rightsCarrier = rightsCandidate.carrierLayers[anchorIndex];
      assertEqual(sourceCarrier?.anchorId, anchorId, `${lock.candidateId}.anchor[${anchorIndex}]`);
      assertEqual(rightsCarrier?.anchorId, anchorId, `${lock.rightsCandidateId}.carrier[${anchorIndex}]`);
      for (const key of [
        "carrierFilePageId", "carrierFileTitle", "carrierDescriptionUrl",
        "carrierMediaWikiSha1", "carrierSha256"
      ]) {
        assertEqual(rightsCarrier[key], sourceCarrier[key], `${anchorId}.${key}`);
      }
      assertEqual(rightsCarrier.status, "notice_observed_not_cleared", `${anchorId}.rights status`);
      assertEqual(rightsCarrier.rightsReviewerIds?.length, 0, `${anchorId}.reviewer count`);
      assertEqual(sourceCarrier.storagePolicy, "link_only", `${anchorId}.storage policy`);
      assertEqual(sourceCarrier.repositoryCarrierFileStored, false, `${anchorId}.repository carrier stored`);
      assertEqual(sourceCarrier.repositoryPageImagesStored, false, `${anchorId}.repository page images stored`);
      if (seenAnchors.has(anchorId)) fail("CARRIER_SET_INVALID", `duplicate anchor ${anchorId}.`);
      seenAnchors.add(anchorId);
      const fingerprint = `${sourceCarrier.carrierFilePageId}:${sourceCarrier.carrierMediaWikiSha1}:${sourceCarrier.carrierSha256}`;
      if (seenCarrierFingerprints.has(fingerprint)) fail("CARRIER_SET_INVALID", `duplicate carrier fingerprint ${anchorId}.`);
      seenCarrierFingerprints.add(fingerprint);

      rows.push({
        rowId: `carrier-gap:${anchorId}`,
        ordinal: rows.length + 1,
        bindingId: sourceCandidate.bindingId,
        evidenceSubjectId: sourceCandidate.evidenceSubjectId,
        sourceId: sourceCandidate.sourceId,
        sourceCandidateId: sourceCandidate.candidateId,
        sourceCandidateDigest: sourceCandidate.candidateDigest,
        rightsCandidateId: rightsCandidate.rightsCandidateId,
        rightsCandidateDigest: rightsCandidate.candidateDigest,
        observedCarrierIdentity: {
          anchorId,
          anchorRole: sourceCarrier.anchorRole,
          provider: sourceCarrier.provider,
          carrierFilePageId: sourceCarrier.carrierFilePageId,
          carrierFileTitle: sourceCarrier.carrierFileTitle,
          carrierDescriptionUrl: sourceCarrier.carrierDescriptionUrl,
          carrierFileTimestamp: sourceCarrier.carrierFileTimestamp,
          carrierMediaWikiSha1: sourceCarrier.carrierMediaWikiSha1,
          carrierRawSha256: sourceCarrier.carrierSha256,
          carrierBytes: sourceCarrier.carrierBytes,
          carrierPageCount: sourceCarrier.carrierPageCount,
          carrierMime: sourceCarrier.carrierMime,
          licenseOrNoticeObserved: sourceCarrier.licenseOrNoticeObserved,
          sourceProvenanceObservation: sourceCarrier.sourceProvenanceObservation,
          editionRelation: sourceCarrier.editionRelation,
          comparisonScope: sourceCarrier.comparisonScope,
          exactCollationStatus: sourceCarrier.exactCollationStatus,
          repositoryCarrierFileStored: sourceCarrier.repositoryCarrierFileStored,
          repositoryPageImagesStored: sourceCarrier.repositoryPageImagesStored,
          storagePolicy: sourceCarrier.storagePolicy,
          rightsNoticeState: rightsCarrier.noticeState,
          reusePolicyId: rightsCarrier.reusePolicyId,
          rightsStatus: rightsCarrier.status,
          rightsEvidenceRefCount: rightsCarrier.evidenceRefs.length,
          rightsEvidenceRefsDigest: semanticDigest("hakimi.bazi.carrier-rights-evidence-refs.v1", rightsCarrier.evidenceRefs),
          rightsReviewerIds: [],
          fixedFilePageRevisionId: rightsCarrier.fixedFilePageRevisionId ?? null,
          publicDomainMarkCountsAsLicense: rightsCarrier.publicDomainMarkCountsAsLicense ?? false,
          markerAuthorityAndAccuracyVerified: rightsCarrier.markerAuthorityAndAccuracyVerified ?? false
        },
        targetFieldReadiness: buildFieldReadiness(),
        promotionBlockerCodes: [...PROMOTION_BLOCKERS],
        decision: {
          carrierByteIdentityObserved: true,
          carrierIdentityAdjudicated: false,
          workLayerCleared: false,
          editionOrTranscriptionLayerCleared: false,
          carrierLayerCleared: false,
          reproductionAllowed: false,
          quotationAllowed: false,
          redistributionAllowed: false,
          distributionPolicy: "link_only",
          legalConclusion: "not_established",
          admissionEffect: "none"
        }
      });
    });
  });
  assertEqual(rows.length, 5, "carrier gap count");
  assertEqual(rows.filter((row) => row.bindingId === "binding:dtt:month-command").length, 2, "DTT carrier gap count");
  return rows;
}

function buildBaziSourceCarrierRecordReadinessLedger({ source, rights, readiness, materialization }) {
  verifyParentSemantics(source, rights, readiness, materialization);
  const sourceCandidateDigests = EXPECTED_SOURCE_CANDIDATES.map(({ candidateId, candidateDigest }) => ({
    candidateId,
    candidateDigest
  }));
  const rightsCandidateDigests = EXPECTED_SOURCE_CANDIDATES.map(({ rightsCandidateId, rightsCandidateDigest }) => ({
    rightsCandidateId,
    candidateDigest: rightsCandidateDigest
  }));
  const ledger = {
    schemaVersion: "1.0.0",
    recordType: "bazi_source_carrier_record_readiness_v1",
    ledgerId: CHILD_LEDGER_ID,
    status: CHILD_STATUS,
    createdAt: "2026-08-30T00:00:00.000Z",
    releaseGovernance: {
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      mutationEpochBoundaryRequired: true,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    parentLocks: {
      sourceBinding: buildParentLock(ARTIFACTS.source, source, sourceCandidateDigests),
      sourceRights: buildParentLock(ARTIFACTS.rights, rights, rightsCandidateDigests),
      bindingReadiness: {
        path: ARTIFACTS.readiness.path,
        rawBytes: ARTIFACTS.readiness.rawBytes,
        rawSha256: ARTIFACTS.readiness.rawSha256,
        ledgerId: readiness.ledgerId,
        ledgerDigest: readiness.ledgerDigest
      },
      supportingBasis: [
        {
          path: ARTIFACTS.contracts.path,
          rawBytes: ARTIFACTS.contracts.rawBytes,
          rawSha256: ARTIFACTS.contracts.rawSha256,
          role: "existing_source_carrier_schema_v1_basis_not_parallel_schema",
          sourceCarrierSchemaVersion: "1.0.0"
        },
        {
          path: ARTIFACTS.materialization.path,
          rawBytes: ARTIFACTS.materialization.rawBytes,
          rawSha256: ARTIFACTS.materialization.rawSha256,
          role: "supporting_zero_instance_materialization_basis_not_parent_or_admission_capability",
          ledgerId: materialization.ledgerId,
          ledgerDigest: materialization.ledgerDigest
        }
      ],
      parentBacklinksToThisChildObserved: false,
      parentArtifactsMutatedByThisChild: false
    },
    sourceCarrierSchemaProjection: {
      schemaVersion: "1.0.0",
      requiredTopLevelFields: [...SOURCE_CARRIER_FIELDS],
      parallelCarrierSchemaCreated: false,
      formalSchemaParseOrAdmissionClaimed: false
    },
    carrierGaps: buildCarrierGaps(source, rights),
    reviewAdjudicationRequirements: {
      currentReceiptIds: [],
      adjudicationReceiptsIssued: 0,
      reviewerSlots: [],
      verifiedNaturalPersonRightsReviewers: 0,
      minimumIndependentNaturalPersonReviewersForFutureFormalUse: 2,
      reviewerIdentityMayBeSelfDeclared: false,
      reviewerRegistryAndCredentialVerificationRequired: true,
      reviewerScopeAndIndependenceVerificationRequired: true,
      futureReceiptMustBind: [
        "source_parent_raw_and_semantic_identity",
        "rights_parent_raw_and_semantic_identity",
        "source_and_rights_candidate_digests",
        "exact_carrier_anchor_and_raw_byte_identity",
        "work_edition_or_transcription_and_carrier_layer_separation",
        "jurisdiction_and_notice_applicability",
        "reproduction_quotation_and_redistribution_decisions",
        "evidence_revision_identity",
        "reviewer_identity_role_scope_independence_and_signed_tuple"
      ],
      disagreementPolicy: "unresolved_no_majority_no_averaging_no_model_arbitration",
      automaticPromotionAllowed: false,
      thisLedgerMayIssueReceipt: false,
      formalUseRequiresSeparateOwnerAuthorizedGate: true
    },
    counts: {
      sourceCandidatesObserved: 4,
      rightsCandidatesObserved: 4,
      distinctSourceCandidateFamilies: 4,
      carrierObservationLayers: 5,
      dttCarrierObservationLayers: 2,
      sourceBindingsRequired: 12,
      sourceBindingsFrozen: 0,
      knowledgeDocuments: 0,
      formalSourceRightsRecords: 0,
      formalSourceCarrierRecords: 0,
      projectCopyMaterializationRecords: 0,
      materializationsVerified: 0,
      adjudicationReceiptsIssued: 0,
      verifiedRightsReviewers: 0,
      workLayersCleared: 0,
      editionOrTranscriptionLayersCleared: 0,
      carrierLayersCleared: 0,
      redistributableSources: 0
    },
    integrityBoundary: {
      digestAlgorithm: "SHA-256",
      digestDomain: DIGEST_DOMAIN,
      digestIsDigitalSignature: false,
      digitalSignature: null,
      signerIdentity: null,
      parentRawAndSemanticIdentityPinned: true,
      persistedChildMustEqualMechanicallyRebuiltExpected: true,
      endpointSnapshotOnly: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      intervalMutationExcluded: false,
      abaExcluded: false
    },
    authorityBoundary: {
      rightsEffect: "none",
      bindingFreezeEffect: "none",
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      legalConclusion: "not_established",
      activeAdmissionEffect: "none",
      releaseReady: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    doesNotEstablish: [
      "source_carrier_record_instance",
      "carrier_authenticity_or_chain_of_custody",
      "lawful_material_access",
      "work_edition_transcription_or_carrier_rights_legal_conclusion",
      "platform_notice_applicability_or_accuracy",
      "carrier_raw_digest_as_normalized_knowledge_document_digest",
      "reviewer_real_identity_credentials_scope_or_independence",
      "adjudication_receipt",
      "knowledge_document_or_project_copy_materialization",
      "content_truth",
      "expert_truth",
      "binding_freeze",
      "cross_file_atomic_snapshot_mutation_epoch_interval_or_aba_exclusion",
      "release_readiness",
      "public_release_authorization"
    ],
    ledgerDigest: ""
  };
  ledger.ledgerDigest = computeBaziSourceCarrierRecordReadinessDigest(ledger);
  return ledger;
}

function verifyPersistedChild(persisted, expected) {
  assertRecord(persisted, "persisted child");
  assertEqual(persisted.schemaVersion, "1.0.0", "child schema version");
  assertEqual(persisted.recordType, "bazi_source_carrier_record_readiness_v1", "child record type");
  assertEqual(persisted.ledgerId, CHILD_LEDGER_ID, "child ledger id");
  assertEqual(persisted.ledgerDigest, CHILD_LEDGER_DIGEST, "child frozen ledger digest");
  assertEqual(persisted.ledgerDigest, computeBaziSourceCarrierRecordReadinessDigest(persisted), "child ledger digest");
  if (canonicalJson(persisted) !== canonicalJson(expected)) {
    fail("EXPECTED_PROJECTION_MISMATCH", "persisted child does not equal the projection rebuilt from fixed parent bytes.");
  }
}

function assertPersistedRedBoundary(persisted) {
  assertRecord(persisted.counts, "persisted child counts");
  assertEqual(persisted.counts.sourceCandidatesObserved, 4, "persisted source candidate count");
  assertEqual(persisted.counts.rightsCandidatesObserved, 4, "persisted rights candidate count");
  assertEqual(persisted.counts.carrierObservationLayers, 5, "persisted carrier observation count");
  assertEqual(persisted.counts.dttCarrierObservationLayers, 2, "persisted DTT carrier count");
  assertEqual(persisted.counts.sourceBindingsRequired, 12, "persisted required binding count");
  assertEqual(persisted.counts.sourceBindingsFrozen, 0, "persisted frozen binding count");
  assertEqual(persisted.counts.knowledgeDocuments, 0, "persisted knowledge document count");
  assertEqual(persisted.counts.formalSourceRightsRecords, 0, "persisted formal rights count");
  assertEqual(persisted.counts.formalSourceCarrierRecords, 0, "persisted formal carrier count");
  assertEqual(persisted.counts.projectCopyMaterializationRecords, 0, "persisted materialization record count");
  assertEqual(persisted.counts.materializationsVerified, 0, "persisted verified materialization count");
  assertEqual(persisted.counts.adjudicationReceiptsIssued, 0, "persisted adjudication receipt count");
  assertEqual(persisted.counts.verifiedRightsReviewers, 0, "persisted verified reviewer count");
  assertEqual(persisted.counts.workLayersCleared, 0, "persisted cleared work layer count");
  assertEqual(
    persisted.counts.editionOrTranscriptionLayersCleared,
    0,
    "persisted cleared edition or transcription layer count"
  );
  assertEqual(persisted.counts.carrierLayersCleared, 0, "persisted cleared carrier layer count");
  assertEqual(persisted.counts.redistributableSources, 0, "persisted redistributable source count");

  assertRecord(persisted.releaseGovernance, "persisted release governance");
  assertEqual(persisted.releaseGovernance.activeLine, "legacy-v13", "persisted active line");
  assertEqual(persisted.releaseGovernance.targetSchema, 13, "persisted target schema");
  assertEqual(persisted.releaseGovernance.migrationId, null, "persisted migration id");
  assertEqual(
    persisted.releaseGovernance.mutationEpochBoundaryRequired,
    true,
    "persisted mutation epoch boundary requirement"
  );
  assertEqual(
    persisted.releaseGovernance.publicDeploymentAuthorized,
    false,
    "persisted release governance public deployment authority"
  );
  assertEqual(
    persisted.releaseGovernance.expertClaimsAuthorized,
    false,
    "persisted release governance expert claims authority"
  );

  assertRecord(persisted.integrityBoundary, "persisted integrity boundary");
  assertEqual(persisted.integrityBoundary.digestIsDigitalSignature, false, "persisted signature claim");
  assertEqual(persisted.integrityBoundary.digitalSignature, null, "persisted digital signature");
  assertEqual(persisted.integrityBoundary.signerIdentity, null, "persisted signer identity");
  assertEqual(persisted.integrityBoundary.endpointSnapshotOnly, true, "persisted endpoint snapshot scope");
  assertEqual(persisted.integrityBoundary.crossFileAtomicSnapshot, false, "persisted atomic snapshot claim");
  assertEqual(
    persisted.integrityBoundary.mutationEpochAvailableForSchema13,
    false,
    "persisted schema 13 mutation epoch availability"
  );
  assertEqual(persisted.integrityBoundary.mutationEpochReceipt, null, "persisted mutation epoch receipt");
  assertEqual(persisted.integrityBoundary.intervalMutationExcluded, false, "persisted interval mutation claim");
  assertEqual(persisted.integrityBoundary.abaExcluded, false, "persisted ABA claim");

  assertRecord(persisted.authorityBoundary, "persisted authority boundary");
  assertEqual(persisted.authorityBoundary.rightsEffect, "none", "persisted rights effect");
  assertEqual(persisted.authorityBoundary.bindingFreezeEffect, "none", "persisted binding freeze effect");
  assertEqual(persisted.authorityBoundary.contentTruthEstablished, false, "persisted content truth claim");
  assertEqual(persisted.authorityBoundary.expertTruthEstablished, false, "persisted expert truth claim");
  assertEqual(persisted.authorityBoundary.legalConclusion, "not_established", "persisted legal conclusion");
  assertEqual(persisted.authorityBoundary.activeAdmissionEffect, "none", "persisted admission effect");
  assertEqual(persisted.authorityBoundary.releaseReady, false, "persisted release readiness");
  assertEqual(
    persisted.authorityBoundary.publicDeploymentAuthorized,
    false,
    "persisted public deployment authority"
  );
  assertEqual(persisted.authorityBoundary.expertClaimsAuthorized, false, "persisted expert claims authority");

  assertRecord(persisted.reviewAdjudicationRequirements, "persisted adjudication requirements");
  assertEqual(
    persisted.reviewAdjudicationRequirements.adjudicationReceiptsIssued,
    0,
    "persisted adjudication requirements receipt count"
  );
  assertEqual(
    persisted.reviewAdjudicationRequirements.verifiedNaturalPersonRightsReviewers,
    0,
    "persisted natural person reviewer count"
  );
  assertEqual(
    persisted.reviewAdjudicationRequirements.automaticPromotionAllowed,
    false,
    "persisted automatic promotion authority"
  );
  assertEqual(
    persisted.reviewAdjudicationRequirements.thisLedgerMayIssueReceipt,
    false,
    "persisted receipt issuance authority"
  );
  assertEqual(
    persisted.reviewAdjudicationRequirements.formalUseRequiresSeparateOwnerAuthorizedGate,
    true,
    "persisted separate owner gate requirement"
  );

  assertArray(persisted.carrierGaps, "persisted carrier gaps");
  assertEqual(persisted.carrierGaps.length, 5, "persisted carrier gap length");
  for (let index = 0; index < persisted.carrierGaps.length; index += 1) {
    const row = persisted.carrierGaps[index];
    assertRecord(row, `persisted carrier gap ${index}`);
    assertRecord(row.decision, `persisted carrier gap ${index} decision`);
    assertEqual(row.decision.carrierIdentityAdjudicated, false, `persisted row ${index} carrier adjudication`);
    assertEqual(row.decision.workLayerCleared, false, `persisted row ${index} work clearance`);
    assertEqual(
      row.decision.editionOrTranscriptionLayerCleared,
      false,
      `persisted row ${index} edition or transcription clearance`
    );
    assertEqual(row.decision.carrierLayerCleared, false, `persisted row ${index} carrier clearance`);
    assertEqual(row.decision.reproductionAllowed, false, `persisted row ${index} reproduction authority`);
    assertEqual(row.decision.quotationAllowed, false, `persisted row ${index} quotation authority`);
    assertEqual(row.decision.redistributionAllowed, false, `persisted row ${index} redistribution authority`);
    assertEqual(row.decision.distributionPolicy, "link_only", `persisted row ${index} distribution policy`);
    assertEqual(row.decision.legalConclusion, "not_established", `persisted row ${index} legal conclusion`);
    assertEqual(row.decision.admissionEffect, "none", `persisted row ${index} admission effect`);
    assertRecord(row.targetFieldReadiness, `persisted carrier gap ${index} target readiness`);
    assertEqual(row.targetFieldReadiness.carrierId, null, `persisted row ${index} carrier id`);
    assertEqual(row.targetFieldReadiness.documentId, null, `persisted row ${index} document id`);
    assertEqual(
      row.targetFieldReadiness.documentContentHash,
      null,
      `persisted row ${index} document content hash`
    );
    assertEqual(row.targetFieldReadiness.contentDigest, null, `persisted row ${index} content digest`);
    assertEqual(row.targetFieldReadiness.formalRecordCreated, false, `persisted row ${index} formal record`);
    assertEqual(
      row.targetFieldReadiness.eligibleForMaterialization,
      false,
      `persisted row ${index} materialization eligibility`
    );
  }
}

function assertFinalPrimitiveRedBoundary(persisted, expected) {
  const persistedAuthority = persisted.authorityBoundary;
  const expectedAuthority = expected.authorityBoundary;
  const persistedCounts = persisted.counts;
  const expectedCounts = expected.counts;
  const persistedGovernance = persisted.releaseGovernance;
  const expectedGovernance = expected.releaseGovernance;
  const persistedIntegrity = persisted.integrityBoundary;
  const expectedIntegrity = expected.integrityBoundary;
  const persistedReview = persisted.reviewAdjudicationRequirements;
  const expectedReview = expected.reviewAdjudicationRequirements;
  const persistedRows = persisted.carrierGaps;
  const expectedRows = expected.carrierGaps;
  if (
    persisted.ledgerId !== CHILD_LEDGER_ID
    || expected.ledgerId !== CHILD_LEDGER_ID
    || persisted.ledgerDigest !== CHILD_LEDGER_DIGEST
    || expected.ledgerDigest !== CHILD_LEDGER_DIGEST
    || persisted.status !== CHILD_STATUS
    || expected.status !== CHILD_STATUS
    || persistedCounts.carrierObservationLayers !== 5
    || expectedCounts.carrierObservationLayers !== 5
    || persistedCounts.dttCarrierObservationLayers !== 2
    || expectedCounts.dttCarrierObservationLayers !== 2
    || persistedCounts.sourceBindingsFrozen !== 0
    || expectedCounts.sourceBindingsFrozen !== 0
    || persistedCounts.formalSourceRightsRecords !== 0
    || expectedCounts.formalSourceRightsRecords !== 0
    || persistedCounts.formalSourceCarrierRecords !== 0
    || expectedCounts.formalSourceCarrierRecords !== 0
    || persistedCounts.projectCopyMaterializationRecords !== 0
    || expectedCounts.projectCopyMaterializationRecords !== 0
    || persistedCounts.materializationsVerified !== 0
    || expectedCounts.materializationsVerified !== 0
    || persistedCounts.adjudicationReceiptsIssued !== 0
    || expectedCounts.adjudicationReceiptsIssued !== 0
    || persistedCounts.verifiedRightsReviewers !== 0
    || expectedCounts.verifiedRightsReviewers !== 0
    || persistedGovernance.activeLine !== "legacy-v13"
    || expectedGovernance.activeLine !== "legacy-v13"
    || persistedGovernance.targetSchema !== 13
    || expectedGovernance.targetSchema !== 13
    || persistedGovernance.migrationId !== null
    || expectedGovernance.migrationId !== null
    || persistedGovernance.publicDeploymentAuthorized !== false
    || expectedGovernance.publicDeploymentAuthorized !== false
    || persistedGovernance.expertClaimsAuthorized !== false
    || expectedGovernance.expertClaimsAuthorized !== false
    || persistedAuthority.rightsEffect !== "none"
    || expectedAuthority.rightsEffect !== "none"
    || persistedAuthority.bindingFreezeEffect !== "none"
    || expectedAuthority.bindingFreezeEffect !== "none"
    || persistedAuthority.contentTruthEstablished !== false
    || expectedAuthority.contentTruthEstablished !== false
    || persistedAuthority.expertTruthEstablished !== false
    || expectedAuthority.expertTruthEstablished !== false
    || persistedAuthority.legalConclusion !== "not_established"
    || expectedAuthority.legalConclusion !== "not_established"
    || persistedAuthority.activeAdmissionEffect !== "none"
    || expectedAuthority.activeAdmissionEffect !== "none"
    || persistedAuthority.releaseReady !== false
    || expectedAuthority.releaseReady !== false
    || persistedAuthority.publicDeploymentAuthorized !== false
    || expectedAuthority.publicDeploymentAuthorized !== false
    || persistedAuthority.expertClaimsAuthorized !== false
    || expectedAuthority.expertClaimsAuthorized !== false
    || persistedIntegrity.crossFileAtomicSnapshot !== false
    || expectedIntegrity.crossFileAtomicSnapshot !== false
    || persistedIntegrity.mutationEpochAvailableForSchema13 !== false
    || expectedIntegrity.mutationEpochAvailableForSchema13 !== false
    || persistedIntegrity.mutationEpochReceipt !== null
    || expectedIntegrity.mutationEpochReceipt !== null
    || persistedIntegrity.intervalMutationExcluded !== false
    || expectedIntegrity.intervalMutationExcluded !== false
    || persistedIntegrity.abaExcluded !== false
    || expectedIntegrity.abaExcluded !== false
    || persistedReview.currentReceiptIds.length !== 0
    || expectedReview.currentReceiptIds.length !== 0
    || persistedReview.adjudicationReceiptsIssued !== 0
    || expectedReview.adjudicationReceiptsIssued !== 0
    || persistedReview.reviewerSlots.length !== 0
    || expectedReview.reviewerSlots.length !== 0
    || persistedReview.verifiedNaturalPersonRightsReviewers !== 0
    || expectedReview.verifiedNaturalPersonRightsReviewers !== 0
    || persistedReview.minimumIndependentNaturalPersonReviewersForFutureFormalUse !== 2
    || expectedReview.minimumIndependentNaturalPersonReviewersForFutureFormalUse !== 2
    || persistedReview.reviewerIdentityMayBeSelfDeclared !== false
    || expectedReview.reviewerIdentityMayBeSelfDeclared !== false
    || persistedReview.reviewerRegistryAndCredentialVerificationRequired !== true
    || expectedReview.reviewerRegistryAndCredentialVerificationRequired !== true
    || persistedReview.reviewerScopeAndIndependenceVerificationRequired !== true
    || expectedReview.reviewerScopeAndIndependenceVerificationRequired !== true
    || persistedReview.disagreementPolicy !== "unresolved_no_majority_no_averaging_no_model_arbitration"
    || expectedReview.disagreementPolicy !== "unresolved_no_majority_no_averaging_no_model_arbitration"
    || persistedReview.automaticPromotionAllowed !== false
    || expectedReview.automaticPromotionAllowed !== false
    || persistedReview.thisLedgerMayIssueReceipt !== false
    || expectedReview.thisLedgerMayIssueReceipt !== false
    || persistedReview.formalUseRequiresSeparateOwnerAuthorizedGate !== true
    || expectedReview.formalUseRequiresSeparateOwnerAuthorizedGate !== true
    || persistedRows.length !== 5
    || expectedRows.length !== 5
  ) {
    fail(
      "FINAL_RED_BOUNDARY_DRIFT",
      "persisted or rebuilt carrier readiness authority changed after the final callback-bearing validation pass."
    );
  }
  for (let index = 0; index < 5; index += 1) {
    const persistedRow = persistedRows[index];
    const expectedRow = expectedRows[index];
    const persistedDecision = persistedRow.decision;
    const expectedDecision = expectedRow.decision;
    const persistedTarget = persistedRow.targetFieldReadiness;
    const expectedTarget = expectedRow.targetFieldReadiness;
    if (
      persistedDecision.carrierByteIdentityObserved !== true
      || expectedDecision.carrierByteIdentityObserved !== true
      || persistedDecision.carrierIdentityAdjudicated !== false
      || expectedDecision.carrierIdentityAdjudicated !== false
      || persistedDecision.workLayerCleared !== false
      || expectedDecision.workLayerCleared !== false
      || persistedDecision.editionOrTranscriptionLayerCleared !== false
      || expectedDecision.editionOrTranscriptionLayerCleared !== false
      || persistedDecision.carrierLayerCleared !== false
      || expectedDecision.carrierLayerCleared !== false
      || persistedDecision.reproductionAllowed !== false
      || expectedDecision.reproductionAllowed !== false
      || persistedDecision.quotationAllowed !== false
      || expectedDecision.quotationAllowed !== false
      || persistedDecision.redistributionAllowed !== false
      || expectedDecision.redistributionAllowed !== false
      || persistedDecision.distributionPolicy !== "link_only"
      || expectedDecision.distributionPolicy !== "link_only"
      || persistedDecision.legalConclusion !== "not_established"
      || expectedDecision.legalConclusion !== "not_established"
      || persistedDecision.admissionEffect !== "none"
      || expectedDecision.admissionEffect !== "none"
      || persistedTarget.carrierId !== null
      || expectedTarget.carrierId !== null
      || persistedTarget.documentId !== null
      || expectedTarget.documentId !== null
      || persistedTarget.documentContentHash !== null
      || expectedTarget.documentContentHash !== null
      || persistedTarget.contentDigest !== null
      || expectedTarget.contentDigest !== null
      || persistedTarget.alignedSourceRightsRecordId !== null
      || expectedTarget.alignedSourceRightsRecordId !== null
      || persistedTarget.sourceCarrierRecordId !== null
      || expectedTarget.sourceCarrierRecordId !== null
      || persistedTarget.projectCopyMaterializationRecordId !== null
      || expectedTarget.projectCopyMaterializationRecordId !== null
      || persistedTarget.adjudicationReceiptIds.length !== 0
      || expectedTarget.adjudicationReceiptIds.length !== 0
      || persistedTarget.formalRecordCreated !== false
      || expectedTarget.formalRecordCreated !== false
      || persistedTarget.eligibleForMaterialization !== false
      || expectedTarget.eligibleForMaterialization !== false
    ) {
      fail(
        "FINAL_RED_BOUNDARY_DRIFT",
        `persisted or rebuilt carrier readiness row ${index} changed after the final callback-bearing validation pass.`
      );
    }
  }
}

function assertFinalAuthorityLatch(persisted, expected) {
  const persistedCounts = persisted.counts;
  const expectedCounts = expected.counts;
  const persistedGovernance = persisted.releaseGovernance;
  const expectedGovernance = expected.releaseGovernance;
  const persistedAuthority = persisted.authorityBoundary;
  const expectedAuthority = expected.authorityBoundary;
  if (
    persistedCounts.sourceBindingsFrozen !== 0
    || expectedCounts.sourceBindingsFrozen !== 0
    || persistedCounts.formalSourceRightsRecords !== 0
    || expectedCounts.formalSourceRightsRecords !== 0
    || persistedCounts.formalSourceCarrierRecords !== 0
    || expectedCounts.formalSourceCarrierRecords !== 0
    || persistedCounts.projectCopyMaterializationRecords !== 0
    || expectedCounts.projectCopyMaterializationRecords !== 0
    || persistedCounts.adjudicationReceiptsIssued !== 0
    || expectedCounts.adjudicationReceiptsIssued !== 0
    || persistedCounts.verifiedRightsReviewers !== 0
    || expectedCounts.verifiedRightsReviewers !== 0
    || persistedGovernance.publicDeploymentAuthorized !== false
    || expectedGovernance.publicDeploymentAuthorized !== false
    || persistedGovernance.expertClaimsAuthorized !== false
    || expectedGovernance.expertClaimsAuthorized !== false
    || persistedAuthority.rightsEffect !== "none"
    || expectedAuthority.rightsEffect !== "none"
    || persistedAuthority.bindingFreezeEffect !== "none"
    || expectedAuthority.bindingFreezeEffect !== "none"
    || persistedAuthority.contentTruthEstablished !== false
    || expectedAuthority.contentTruthEstablished !== false
    || persistedAuthority.expertTruthEstablished !== false
    || expectedAuthority.expertTruthEstablished !== false
    || persistedAuthority.legalConclusion !== "not_established"
    || expectedAuthority.legalConclusion !== "not_established"
    || persistedAuthority.activeAdmissionEffect !== "none"
    || expectedAuthority.activeAdmissionEffect !== "none"
    || persistedAuthority.releaseReady !== false
    || expectedAuthority.releaseReady !== false
    || persistedAuthority.publicDeploymentAuthorized !== false
    || expectedAuthority.publicDeploymentAuthorized !== false
    || persistedAuthority.expertClaimsAuthorized !== false
    || expectedAuthority.expertClaimsAuthorized !== false
  ) {
    fail(
      "FINAL_AUTHORITY_LATCH_DRIFT",
      "carrier readiness authority changed after the final review and row reads."
    );
  }
}

export async function loadBaziSourceCarrierRecordReadiness(workspaceRoot) {
  if (typeof workspaceRoot !== "string" || workspaceRoot.length === 0) {
    fail("WORKSPACE_ROOT_INVALID", "workspaceRoot must be a non-empty primitive string.");
  }
  const [
    supersessionCapability,
    readinessCapability,
    sourceSnapshot,
    rightsSnapshot,
    readinessSnapshot,
    contractsSnapshot,
    materializationSnapshot,
    childSnapshot
  ] =
    await Promise.all([
      loadBaziDttVersionedParentSupersession(workspaceRoot),
      loadBaziBindingFreezeRequirementsV17(workspaceRoot),
      readBaziDttStableWorkspaceArtifact(workspaceRoot, ARTIFACTS.source.path),
      readBaziDttStableWorkspaceArtifact(workspaceRoot, ARTIFACTS.rights.path),
      readBaziDttStableWorkspaceArtifact(workspaceRoot, ARTIFACTS.readiness.path),
      readBaziDttStableWorkspaceArtifact(workspaceRoot, ARTIFACTS.contracts.path),
      readBaziDttStableWorkspaceArtifact(workspaceRoot, ARTIFACTS.materialization.path),
      readBaziDttStableWorkspaceArtifact(workspaceRoot, ARTIFACTS.child.path)
    ]);
  if (!isVerifiedBaziDttVersionedParentSupersession(supersessionCapability)) {
    fail("UPSTREAM_BRAND_REQUIRED", "source/rights supersession canonical private brand is required.");
  }
  if (!isVerifiedBaziBindingFreezeRequirementsV17(readinessCapability)) {
    fail("UPSTREAM_BRAND_REQUIRED", "binding readiness 1.7 canonical private brand is required.");
  }
  assertEqual(supersessionCapability.sourceLedgerId, ARTIFACTS.source.ledgerId, "branded source ledger id");
  assertEqual(supersessionCapability.sourceLedgerDigest, ARTIFACTS.source.ledgerDigest, "branded source ledger digest");
  assertEqual(supersessionCapability.rightsLedgerId, ARTIFACTS.rights.ledgerId, "branded rights ledger id");
  assertEqual(supersessionCapability.rightsLedgerDigest, ARTIFACTS.rights.ledgerDigest, "branded rights ledger digest");
  assertEqual(supersessionCapability.formalSourceRightsRecordCount, 0, "branded formal rights count");
  assertEqual(supersessionCapability.formalSourceCarrierRecordCount, 0, "branded formal carrier count");
  assertEqual(supersessionCapability.bindingFrozenVerified, 0, "branded supersession frozen binding count");
  assertEqual(supersessionCapability.releaseReady, false, "branded supersession release readiness");
  assertEqual(readinessCapability.ledgerId, ARTIFACTS.readiness.ledgerId, "branded readiness ledger id");
  assertEqual(readinessCapability.ledgerDigest, ARTIFACTS.readiness.ledgerDigest, "branded readiness ledger digest");
  assertEqual(readinessCapability.bindingRequired, 12, "branded readiness binding count");
  assertEqual(readinessCapability.bindingFrozenVerified, 0, "branded readiness frozen binding count");
  assertEqual(readinessCapability.formalSourceRightsRecordCount, 0, "branded readiness formal rights count");
  assertEqual(readinessCapability.formalSourceCarrierRecordCount, 0, "branded readiness formal carrier count");
  assertEqual(readinessCapability.activeAdmissionEffect, "none", "branded readiness admission effect");
  assertEqual(readinessCapability.releaseReady, false, "branded readiness release readiness");
  assertRawIdentity(sourceSnapshot, ARTIFACTS.source, "source parent");
  assertRawIdentity(rightsSnapshot, ARTIFACTS.rights, "rights parent");
  assertRawIdentity(readinessSnapshot, ARTIFACTS.readiness, "readiness basis");
  assertRawIdentity(contractsSnapshot, ARTIFACTS.contracts, "contracts basis");
  assertRawIdentity(materializationSnapshot, ARTIFACTS.materialization, "materialization basis");
  const sourceText = assertNoChildBacklink(sourceSnapshot, "source parent");
  const rightsText = assertNoChildBacklink(rightsSnapshot, "rights parent");
  const readinessText = assertNoChildBacklink(readinessSnapshot, "readiness basis");
  const materializationText = assertNoChildBacklink(materializationSnapshot, "materialization basis");
  void sourceText;
  void rightsText;
  void readinessText;
  void materializationText;
  const contractsText = assertNoChildBacklink(contractsSnapshot, "contracts basis");
  assertContractBasis(contractsText);
  const source = parseBaziDttStrictJsonArtifact(sourceSnapshot);
  const rights = parseBaziDttStrictJsonArtifact(rightsSnapshot);
  const readiness = parseBaziDttStrictJsonArtifact(readinessSnapshot);
  const materialization = parseBaziDttStrictJsonArtifact(materializationSnapshot);
  const persisted = parseBaziDttStrictJsonArtifact(childSnapshot);
  assertPersistedRedBoundary(persisted);
  assertRawIdentity(childSnapshot, ARTIFACTS.child, "child");
  const expected = buildBaziSourceCarrierRecordReadinessLedger({ source, rights, readiness, materialization });
  verifyPersistedChild(persisted, expected);
  assertPersistedRedBoundary(persisted);
  assertPersistedRedBoundary(expected);
  assertEqual(expected.ledgerId, CHILD_LEDGER_ID, "rebuilt child ledger id after comparison");
  assertEqual(expected.ledgerDigest, CHILD_LEDGER_DIGEST, "rebuilt child ledger digest after comparison");
  assertEqual(expected.status, CHILD_STATUS, "rebuilt child status after comparison");
  assertFinalPrimitiveRedBoundary(persisted, expected);
  assertFinalAuthorityLatch(persisted, expected);
  return new VerifiedBaziSourceCarrierRecordReadinessCapability(CAPABILITY_CONSTRUCTION_TOKEN);
}

export function isVerifiedBaziSourceCarrierRecordReadiness(value) {
  return IS_VERIFIED_CAPABILITY(value);
}

export function getBaziSourceCarrierRecordReadinessSummary(value) {
  return READ_VERIFIED_CAPABILITY(value);
}

export const baziSourceCarrierRecordReadinessTestOnly = Object.freeze({
  buildBaziSourceCarrierRecordReadinessLedger,
  canonicalJson,
  computeBaziSourceCarrierRecordReadinessDigest,
  semanticDigest
});
