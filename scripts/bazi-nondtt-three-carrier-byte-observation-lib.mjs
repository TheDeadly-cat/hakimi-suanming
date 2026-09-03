import { createHash } from "node:crypto";

import { canonicalStringifyBaziDttNoticeReconciliation } from "./bazi-dtt-notice-reconciliation-lib.mjs";
import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  getBaziSourceCarrierRecordReadinessSummary,
  isVerifiedBaziSourceCarrierRecordReadiness,
  loadBaziSourceCarrierRecordReadiness
} from "./bazi-source-carrier-record-readiness-lib.mjs";

export const BAZI_NONDTT_THREE_CARRIER_BYTE_OBSERVATION_PATH =
  "content/system-admission/bazi-nondtt-three-carrier-byte-observation.v1.json";

const SOURCE_PATH = "content/bazi-strength-source-binding-candidates.v1.6.0.json";
const RIGHTS_PATH = "content/bazi-strength-source-rights-candidates.v1.2.0.json";
const CARRIER_READINESS_PATH =
  "content/system-admission/bazi-source-carrier-record-readiness.v1.json";
const PRODUCER_PATH = "scripts/audit-bazi-nondtt-source-carrier-evidence-live.ps1";
const OBSERVATION_ID = "hakimi.bazi.nondtt-three-carrier-byte-observation/2026-08-31.1";
const OBSERVATION_DIGEST = "b2d4d98e94c6bc1c5446d03905f0f24884b55c966c4dd90ed7701ce52f8573dd";
const OBSERVATION_RAW_IDENTITY = Object.freeze({
  rawBytes: 16_936,
  rawSha256: "d33ddf6bbe1f820be53d41606f0970ce53915712c05eb4731f190c7d53de331d"
});
const SHA256 = /^[a-f0-9]{64}$/u;
const SHA1 = /^[a-f0-9]{40}$/u;
const UTC_MILLISECOND = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const UTC_SECOND = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;
const VERIFIED_RESULTS = new WeakSet();
const NATIVE_SET = Set;
const SET_ADD = Set.prototype.add;
const SET_HAS = Set.prototype.has;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_VALUES = Object.values;
const REFLECT_APPLY = Reflect.apply;
const CRYPTO_CREATE_HASH = createHash;
const HASH_PROTOTYPE = Object.getPrototypeOf(CRYPTO_CREATE_HASH("sha256"));
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;

const EXPECTED_RESULTS = Object.freeze([
  Object.freeze({
    candidateId: "smt-siku-v10-wikisource-r761703-candidate-v1",
    bindingId: "binding:smt-v10:whole-chart",
    evidenceSubjectId: "bazi.strength.binding.smt-v10.whole-chart.v1",
    quoteCandidateIds: Object.freeze([
      "smt-v10-yueling-minimal-v1",
      "smt-v10-tougan-minimal-v1"
    ]),
    anchorId: "smt-v10-gujin-volume-472-page-28-facsimile-v1"
  }),
  Object.freeze({
    candidateId: "smt-v5-wikisource-r2706483-candidate-v1",
    bindingId: "binding:smt-v5:relative-relations",
    evidenceSubjectId: "bazi.strength.binding.smt-v5.relative-relations.v1",
    quoteCandidateIds: Object.freeze(["smt-v5-relative-relations-minimal-v1"]),
    anchorId: "smt-v5-gujin-volume-470-page-115-facsimile-v1"
  }),
  Object.freeze({
    candidateId: "yhzp-wikisource-r2593607-candidate-v1",
    bindingId: "binding:yhzp:hidden-listing",
    evidenceSubjectId: "bazi.strength.binding.yhzp.hidden-listing.v1",
    quoteCandidateIds: Object.freeze(["yhzp-hidden-stem-listing-minimal-v1"]),
    anchorId: "yhzp-nlc416-15jh007754-99036-page-54-facsimile-v1"
  })
]);

const DOES_NOT_ESTABLISH = Object.freeze([
  "publisher_authenticity_or_network_provenance",
  "work_edition_transcription_or_carrier_legal_clearance",
  "platform_notice_accuracy_or_jurisdictional_applicability",
  "reproduction_quotation_or_redistribution_permission",
  "formal_source_rights_or_carrier_record",
  "source_body_quote_text_or_carrier_storage",
  "content_truth_or_expert_truth",
  "binding_freeze",
  "cross_file_atomic_snapshot_mutation_epoch_interval_mutation_or_aba_exclusion",
  "release_readiness_or_public_release_authorization"
]);

const FORBIDDEN_RAW_MATERIAL_KEYS = new Set([
  "sourceBody",
  "quoteText",
  "quoteTexts",
  "rawWikitext",
  "pageBody",
  "pageWikitext",
  "carrierFileBytes",
  "carrierBytesBase64",
  "rawCarrierBytes",
  "responseBody",
  "responseBodies"
]);

export class BaziNonDttThreeCarrierByteObservationError extends Error {
  constructor(code, message, cause) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "BaziNonDttThreeCarrierByteObservationError";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new BaziNonDttThreeCarrierByteObservationError(code, message, cause);
}

function passiveSnapshot(value, label) {
  try {
    return JSON.parse(canonicalStringifyBaziDttNoticeReconciliation(value));
  } catch (cause) {
    fail(cause?.code ?? "INPUT_INVALID", `${label} 必须是被动、有限、规范 JSON。`, cause);
  }
}

function canonicalEqual(left, right) {
  return canonicalStringifyBaziDttNoticeReconciliation(left)
    === canonicalStringifyBaziDttNoticeReconciliation(right);
}

export function computeBaziNonDttThreeCarrierByteObservationDigest(value) {
  const snapshot = passiveSnapshot(value, "三载体点时观察");
  const { observationDigest: _observationDigest, ...unsigned } = snapshot;
  const hash = CRYPTO_CREATE_HASH("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [
    canonicalStringifyBaziDttNoticeReconciliation(unsigned),
    "utf8"
  ]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

export function parseBaziNonDttThreeCarrierByteObservationJsonBytes(
  bytes,
  label = "三载体点时观察 JSON"
) {
  return parseBaziDttStrictJsonArtifact({ path: label, bytes });
}

function exactObject(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype) {
    fail("STRUCTURE_INVALID", `${label} 必须是普通 JSON 对象。`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail("STRUCTURE_INVALID", `${label} 字段集合不精确。`);
  }
  return value;
}

function exactArray(value, expected, label) {
  if (!Array.isArray(value) || !canonicalEqual(value, expected)) {
    fail("STRUCTURE_INVALID", `${label} 内容或顺序不精确。`);
  }
}

function assertSha256(value, label) {
  if (typeof value !== "string" || !SHA256.test(value)) {
    fail("IDENTITY_INVALID", `${label} 必须是小写 SHA-256。`);
  }
}

function assertSha1(value, label) {
  if (typeof value !== "string" || !SHA1.test(value)) {
    fail("IDENTITY_INVALID", `${label} 必须是小写 SHA-1。`);
  }
}

function assertPositiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    fail("STRUCTURE_INVALID", `${label} 必须是正安全整数。`);
  }
}

function utcTime(value, label) {
  if (typeof value !== "string" || !UTC_MILLISECOND.test(value)) {
    fail("TIME_INVALID", `${label} 必须是规范毫秒 UTC。`);
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    fail("TIME_INVALID", `${label} 不是实际存在的规范 UTC。`);
  }
  return parsed;
}

function utcSecondTime(value, label) {
  if (typeof value !== "string" || !UTC_SECOND.test(value)) {
    fail("TIME_INVALID", `${label} 必须是规范秒级 UTC。`);
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().replace(".000Z", "Z") !== value) {
    fail("TIME_INVALID", `${label} 不是实际存在的规范秒级 UTC。`);
  }
  return parsed;
}

function assertAllFalse(record, keys, label) {
  for (const key of keys) {
    if (record[key] !== false) {
      fail("AUTHORITY_PROMOTION_FORBIDDEN", `${label}.${key} 必须保持 false。`);
    }
  }
}

function scanForbiddenRawMaterial(value, path = "observation") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanForbiddenRawMaterial(entry, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (REFLECT_APPLY(SET_HAS, FORBIDDEN_RAW_MATERIAL_KEYS, [key])) {
      fail("RAW_MATERIAL_FORBIDDEN", `${path}.${key} 不得持久化正文、quote 或载体字节。`);
    }
    scanForbiddenRawMaterial(child, `${path}.${key}`);
  }
}

function assertArtifactIdentity(record, snapshot, parsed, label) {
  exactObject(record, ["path", "bytes", "sha256", "ledgerId", "ledgerDigest"], label);
  if (record.path !== snapshot.path
    || record.bytes !== snapshot.rawBytes
    || record.sha256 !== snapshot.rawSha256
    || record.ledgerId !== parsed.ledgerId
    || record.ledgerDigest !== parsed.ledgerDigest) {
    fail("PARENT_DRIFT", `${label} 与稳定读取的父工件不一致。`);
  }
}

function assertRequestReceipt(record, label, host, captureStart, captureEnd) {
  exactObject(record, [
    "host", "httpStatus", "contentType", "requestStartedAt", "requestCompletedAt",
    "deliveredBodyBytes", "deliveredBodySha256"
  ], label);
  if (record.host !== host || record.httpStatus !== 200
    || record.contentType !== "application/json; charset=utf-8") {
    fail("REMOTE_OBSERVATION_INVALID", `${label} 的 host/status/content-type 无效。`);
  }
  const start = utcTime(record.requestStartedAt, `${label}.requestStartedAt`);
  const end = utcTime(record.requestCompletedAt, `${label}.requestCompletedAt`);
  if (start < captureStart || end < start || end > captureEnd) {
    fail("TIME_INVALID", `${label} 不在 capture 区间内。`);
  }
  assertPositiveInteger(record.deliveredBodyBytes, `${label}.deliveredBodyBytes`);
  assertSha256(record.deliveredBodySha256, `${label}.deliveredBodySha256`);
}

function assertReadinessBoundary(readiness, sourceSnapshot, rightsSnapshot) {
  if (readiness.releaseGovernance?.activeLine !== "legacy-v13"
    || readiness.releaseGovernance?.targetSchema !== 13
    || readiness.releaseGovernance?.migrationId !== null
    || readiness.releaseGovernance?.mutationEpochBoundaryRequired !== true
    || readiness.releaseGovernance?.publicDeploymentAuthorized !== false
    || readiness.releaseGovernance?.expertClaimsAuthorized !== false) {
    fail("PARENT_BOUNDARY_INVALID", "SourceCarrier readiness 的发布治理边界漂移。 ");
  }
  const counts = readiness.counts;
  if (counts?.sourceBindingsRequired !== 12
    || counts?.sourceBindingsFrozen !== 0
    || counts?.knowledgeDocuments !== 0
    || counts?.formalSourceRightsRecords !== 0
    || counts?.formalSourceCarrierRecords !== 0
    || counts?.projectCopyMaterializationRecords !== 0
    || counts?.materializationsVerified !== 0
    || counts?.adjudicationReceiptsIssued !== 0
    || counts?.verifiedRightsReviewers !== 0
    || counts?.workLayersCleared !== 0
    || counts?.editionOrTranscriptionLayersCleared !== 0
    || counts?.carrierLayersCleared !== 0
    || counts?.redistributableSources !== 0) {
    fail("PARENT_BOUNDARY_INVALID", "SourceCarrier readiness 不能暗示正式记录、冻结、清权或可再分发。 ");
  }
  const sourceLock = readiness.parentLocks?.sourceBinding;
  const rightsLock = readiness.parentLocks?.sourceRights;
  if (sourceLock?.path !== sourceSnapshot.path
    || sourceLock?.rawBytes !== sourceSnapshot.rawBytes
    || sourceLock?.rawSha256 !== sourceSnapshot.rawSha256
    || rightsLock?.path !== rightsSnapshot.path
    || rightsLock?.rawBytes !== rightsSnapshot.rawBytes
    || rightsLock?.rawSha256 !== rightsSnapshot.rawSha256) {
    fail("PARENT_BOUNDARY_INVALID", "SourceCarrier readiness 未锁定当前 source/rights 父工件。 ");
  }
  if (readiness.integrityBoundary?.crossFileAtomicSnapshot !== false
    || readiness.integrityBoundary?.mutationEpochAvailableForSchema13 !== false
    || readiness.integrityBoundary?.mutationEpochReceipt !== null
    || readiness.integrityBoundary?.intervalMutationExcluded !== false
    || readiness.integrityBoundary?.abaExcluded !== false
    || readiness.integrityBoundary?.digestIsDigitalSignature !== false) {
    fail("AUTHORITY_PROMOTION_FORBIDDEN", "SourceCarrier readiness 完整性边界不得被提升。 ");
  }
  const authority = readiness.authorityBoundary;
  if (authority?.rightsEffect !== "none"
    || authority?.bindingFreezeEffect !== "none"
    || authority?.legalConclusion !== "not_established"
    || authority?.activeAdmissionEffect !== "none") {
    fail("AUTHORITY_PROMOTION_FORBIDDEN", "SourceCarrier readiness 不得产生准入或法律效力。 ");
  }
  assertAllFalse(authority, [
    "contentTruthEstablished", "expertTruthEstablished", "releaseReady",
    "publicDeploymentAuthorized", "expertClaimsAuthorized"
  ], "readiness.authorityBoundary");
}

function assertQuoteLocator(locator, parentQuote, label) {
  exactObject(locator, [
    "quoteCandidateId", "rawCharacterStartZeroBased", "rawCharacterEndExclusive",
    "quoteCharacters", "quoteUtf8Bytes", "quoteSha256", "occurrenceCount", "quoteTextStored"
  ], label);
  if (locator.quoteCandidateId !== parentQuote.quoteCandidateId
    || locator.rawCharacterStartZeroBased !== parentQuote.rawCharacterStartZeroBased
    || locator.rawCharacterEndExclusive !== parentQuote.rawCharacterEndExclusive
    || locator.quoteCharacters !== parentQuote.quoteCharacters
    || locator.quoteUtf8Bytes !== parentQuote.quoteUtf8Bytes
    || locator.quoteSha256 !== parentQuote.quoteSha256
    || locator.occurrenceCount !== 1
    || parentQuote.quoteOccurrenceInRawRevision !== "unique"
    || locator.quoteTextStored !== false
    || parentQuote.quoteTextStored !== false) {
    fail("QUOTE_LOCATOR_DRIFT", `${label} 与固定 source candidate 不一致。`);
  }
  assertSha256(locator.quoteSha256, `${label}.quoteSha256`);
}

function assertRightsCandidate(rightsCandidate, sourceCandidate, childResult, label) {
  if (!rightsCandidate || rightsCandidate.sourceCandidateId !== sourceCandidate.candidateId
    || rightsCandidate.bindingId !== sourceCandidate.bindingId) {
    fail("RIGHTS_PARENT_DRIFT", `${label} 缺少精确 rights candidate。`);
  }
  if (rightsCandidate.transcriptionLayer?.revisionId !== childResult.sourceRevision.revisionId
    || rightsCandidate.transcriptionLayer?.rawWikitextSha256
      !== childResult.sourceRevision.rawWikitextSha256) {
    fail("RIGHTS_PARENT_DRIFT", `${label} transcription 层未绑定同一 revision/body hash。`);
  }
  if (!canonicalEqual(
    rightsCandidate.workLayer?.observedTemplateNames,
    childResult.workNotice.observedTemplateNames
  ) || rightsCandidate.workLayer?.status !== "candidate_only_not_adjudicated"
    || rightsCandidate.workLayer?.jurisdictionAssessment !== null
    || rightsCandidate.workLayer?.legalReviewerIds?.length !== 0
    || rightsCandidate.transcriptionLayer?.status !== "terms_observed_not_cleared"
    || rightsCandidate.transcriptionLayer?.rightsReviewerIds?.length !== 0) {
    fail("RIGHTS_PARENT_DRIFT", `${label} 作品或转录权利层不得暗示已裁定。`);
  }
  const carrierLayer = rightsCandidate.carrierLayers?.find(
    (candidate) => candidate.anchorId === childResult.carrier.anchorId
  );
  if (!carrierLayer
    || carrierLayer.carrierFilePageId !== childResult.carrier.carrierFilePageId
    || carrierLayer.carrierFileTitle !== childResult.carrier.carrierFileTitle
    || carrierLayer.carrierSha256 !== childResult.carrier.rawByte.expectedSha256
    || carrierLayer.noticeState !== "commons_public_domain_metadata_observed_not_adjudicated"
    || carrierLayer.status !== "notice_observed_not_cleared"
    || carrierLayer.rightsReviewerIds?.length !== 0) {
    fail("RIGHTS_PARENT_DRIFT", `${label} 载体权利层未保持观察态。`);
  }
  const decision = rightsCandidate.decision;
  if (decision?.distributionPolicy !== "link_only"
    || decision?.legalConclusion !== "not_established"
    || decision?.rightsCandidateState !== "evidence_observed_human_legal_review_required"
    || decision?.reviewAttestations?.length !== 0
    || decision?.frozenAt !== null) {
    fail("AUTHORITY_PROMOTION_FORBIDDEN", `${label} rights decision 必须保持 link-only 未裁定。`);
  }
  assertAllFalse(decision, [
    "knowledgeDocumentCreated", "formalSourceRightsRecordCreated", "formalSourceCarrierRecordCreated",
    "workLayerCleared", "editionLayerCleared", "carrierLayerCleared"
  ], `${label}.decision`);
  return rightsCandidate;
}

function assertCarrierReadinessRow(
  readiness,
  expected,
  sourceCandidate,
  rightsCandidate,
  childResult,
  label
) {
  const gap = readiness.carrierGaps?.find(
    (candidate) => candidate.observedCarrierIdentity?.anchorId === expected.anchorId
  );
  if (!gap
    || gap.rowId !== `carrier-gap:${expected.anchorId}`
    || gap.bindingId !== expected.bindingId
    || gap.evidenceSubjectId !== expected.evidenceSubjectId
    || gap.sourceId !== sourceCandidate.sourceId
    || gap.sourceCandidateId !== sourceCandidate.candidateId
    || gap.sourceCandidateDigest !== sourceCandidate.candidateDigest
    || gap.rightsCandidateId !== rightsCandidate.rightsCandidateId
    || gap.rightsCandidateDigest !== rightsCandidate.candidateDigest) {
    fail("CARRIER_READINESS_ROW_DRIFT", `${label} 未与 readiness candidate digests 一一绑定。`);
  }
  const identity = gap.observedCarrierIdentity;
  if (identity.carrierFilePageId !== childResult.carrier.carrierFilePageId
    || identity.carrierFileTitle !== childResult.carrier.carrierFileTitle
    || identity.carrierRawSha256 !== childResult.carrier.rawByte.expectedSha256
    || identity.carrierBytes !== childResult.carrier.rawByte.expectedBytes
    || identity.carrierMime !== childResult.carrier.rawByte.contentType
    || identity.repositoryCarrierFileStored !== false
    || identity.repositoryPageImagesStored !== false
    || identity.storagePolicy !== "link_only"
    || identity.rightsStatus !== "notice_observed_not_cleared"
    || identity.rightsReviewerIds?.length !== 0
    || identity.publicDomainMarkCountsAsLicense !== false
    || identity.markerAuthorityAndAccuracyVerified !== false) {
    fail("CARRIER_READINESS_ROW_DRIFT", `${label} readiness carrier identity 或红边界漂移。`);
  }
  const target = gap.targetFieldReadiness;
  if (target?.carrierId !== null
    || target?.documentId !== null
    || target?.documentContentHash !== null
    || target?.contentDigest !== null
    || target?.sourceCarrierRecordId !== null
    || target?.projectCopyMaterializationRecordId !== null
    || target?.adjudicationReceiptIds?.length !== 0
    || target?.formalRecordCreated !== false
    || target?.eligibleForMaterialization !== false) {
    fail("CARRIER_READINESS_ROW_DRIFT", `${label} readiness target 不得暗示正式实例。`);
  }
  const decision = gap.decision;
  if (decision?.carrierByteIdentityObserved !== true
    || decision?.distributionPolicy !== "link_only"
    || decision?.legalConclusion !== "not_established"
    || decision?.admissionEffect !== "none") {
    fail("CARRIER_READINESS_ROW_DRIFT", `${label} readiness decision 漂移。`);
  }
  assertAllFalse(decision, [
    "carrierIdentityAdjudicated", "workLayerCleared", "editionOrTranscriptionLayerCleared",
    "carrierLayerCleared", "reproductionAllowed", "quotationAllowed", "redistributionAllowed"
  ], `${label}.readiness.decision`);
}

function assertResult(
  result,
  expected,
  sourceLedger,
  rightsLedger,
  readiness,
  captureStart,
  captureEnd,
  label
) {
  exactObject(result, [
    "candidateId", "bindingId", "evidenceSubjectId", "sourceRevision", "workNotice", "carrier"
  ], label);
  if (result.candidateId !== expected.candidateId
    || result.bindingId !== expected.bindingId
    || result.evidenceSubjectId !== expected.evidenceSubjectId) {
    fail("CANDIDATE_DRIFT", `${label} candidate/binding/evidenceSubject 身份漂移。`);
  }
  const parentCandidate = sourceLedger.candidates?.find(
    (candidate) => candidate.candidateId === expected.candidateId
  );
  if (!parentCandidate
    || parentCandidate.bindingId !== expected.bindingId
    || parentCandidate.evidenceSubjectId !== expected.evidenceSubjectId
    || parentCandidate.reviewState?.frozenAt !== null
    || parentCandidate.reviewState?.contentTruth !== "not_established") {
    fail("SOURCE_PARENT_DRIFT", `${label} source candidate 不存在或已被越权提升。`);
  }

  const revision = result.sourceRevision;
  exactObject(revision, [
    "pageId", "revisionId", "mediaWikiSha1", "rawWikitextCharacters", "rawWikitextUtf8Bytes",
    "rawWikitextSha256", "quoteLocators", "sourceBodyStored", "quoteTextsStored"
  ], `${label}.sourceRevision`);
  const carrierIdentity = parentCandidate.carrierIdentity;
  if (revision.pageId !== carrierIdentity.pageId
    || revision.revisionId !== carrierIdentity.revisionId
    || revision.mediaWikiSha1 !== carrierIdentity.mediaWikiSha1
    || revision.rawWikitextCharacters !== carrierIdentity.rawWikitextCharacters
    || revision.rawWikitextUtf8Bytes !== carrierIdentity.rawWikitextUtf8Bytes
    || revision.rawWikitextSha256 !== carrierIdentity.rawWikitextSha256
    || revision.sourceBodyStored !== false
    || revision.quoteTextsStored !== false
    || carrierIdentity.sourceBodyStored !== false
    || carrierIdentity.storagePolicy !== "link_only") {
    fail("SOURCE_REVISION_DRIFT", `${label}.sourceRevision 与 source parent 不一致。`);
  }
  assertSha1(revision.mediaWikiSha1, `${label}.sourceRevision.mediaWikiSha1`);
  assertSha256(revision.rawWikitextSha256, `${label}.sourceRevision.rawWikitextSha256`);
  exactArray(
    revision.quoteLocators.map((quote) => quote.quoteCandidateId),
    expected.quoteCandidateIds,
    `${label}.quoteCandidateIds`
  );
  if (revision.quoteLocators.length !== parentCandidate.quoteCandidates.length) {
    fail("QUOTE_LOCATOR_DRIFT", `${label} quote 数量与 source parent 不一致。`);
  }
  revision.quoteLocators.forEach((quote, index) => {
    assertQuoteLocator(quote, parentCandidate.quoteCandidates[index], `${label}.quoteLocators[${index}]`);
  });

  exactObject(result.workNotice, ["observedTemplateNames", "pageBodyStored", "legalConclusion"], `${label}.workNotice`);
  if (result.workNotice.pageBodyStored !== false
    || result.workNotice.legalConclusion !== "not_established") {
    fail("AUTHORITY_PROMOTION_FORBIDDEN", `${label}.workNotice 只能是未裁定元数据观察。`);
  }

  const anchor = parentCandidate.facsimileAnchors?.find((value) => value.anchorId === expected.anchorId);
  if (!anchor) fail("SOURCE_PARENT_DRIFT", `${label} 缺少预期 facsimile anchor。`);
  const carrier = result.carrier;
  exactObject(carrier, [
    "anchorId", "carrierFilePageId", "carrierFileTitle", "currentFilePageRevisionId",
    "currentFilePageParentRevisionId", "currentFilePageRevisionTimestamp", "currentFilePageMediaWikiSha1",
    "currentFilePageWikitextUtf8Bytes", "currentFilePageWikitextSha256", "pdScanTemplateObserved",
    "watermarkTemplateObserved", "licenseShortNameObserved", "usageTermsObserved",
    "attributionRequiredObserved", "copyrightedObserved", "noticeState", "rawByte",
    "workParseBodySha256", "carrierParseBodySha256", "carrierFileStored", "distributionPolicy",
    "workLayerCleared", "editionOrTranscriptionLayerCleared", "carrierLayerCleared",
    "reproductionAllowed", "quotationAllowed", "redistributionAllowed", "legalConclusion"
  ], `${label}.carrier`);
  if (carrier.anchorId !== anchor.anchorId
    || carrier.carrierFilePageId !== anchor.carrierFilePageId
    || carrier.carrierFileTitle !== anchor.carrierFileTitle
    || carrier.noticeState !== "commons_public_domain_metadata_observed_not_adjudicated"
    || carrier.licenseShortNameObserved !== "Public domain"
    || carrier.usageTermsObserved !== "Public domain"
    || carrier.attributionRequiredObserved !== "false"
    || carrier.copyrightedObserved !== "False"
    || carrier.carrierFileStored !== false
    || carrier.distributionPolicy !== "link_only"
    || carrier.legalConclusion !== "not_established") {
    fail("CARRIER_OBSERVATION_DRIFT", `${label}.carrier 元数据或 link-only 边界漂移。`);
  }
  assertAllFalse(carrier, [
    "workLayerCleared", "editionOrTranscriptionLayerCleared", "carrierLayerCleared",
    "reproductionAllowed", "quotationAllowed", "redistributionAllowed"
  ], `${label}.carrier`);
  assertPositiveInteger(carrier.currentFilePageRevisionId, `${label}.carrier.currentFilePageRevisionId`);
  assertPositiveInteger(carrier.currentFilePageParentRevisionId, `${label}.carrier.currentFilePageParentRevisionId`);
  utcSecondTime(carrier.currentFilePageRevisionTimestamp, `${label}.carrier.currentFilePageRevisionTimestamp`);
  assertSha1(carrier.currentFilePageMediaWikiSha1, `${label}.carrier.currentFilePageMediaWikiSha1`);
  assertPositiveInteger(carrier.currentFilePageWikitextUtf8Bytes, `${label}.carrier.currentFilePageWikitextUtf8Bytes`);
  assertSha256(carrier.currentFilePageWikitextSha256, `${label}.carrier.currentFilePageWikitextSha256`);
  assertSha256(carrier.workParseBodySha256, `${label}.carrier.workParseBodySha256`);
  assertSha256(carrier.carrierParseBodySha256, `${label}.carrier.carrierParseBodySha256`);

  const raw = carrier.rawByte;
  exactObject(raw, [
    "contentType", "contentLength", "etag", "lastModified", "expectedBytes", "expectedSha256",
    "downloadedBytes", "downloadedSha256", "requestStartedAt", "requestCompletedAt", "httpStatus",
    "expectedIdentityMatched", "rawByteVerificationStatus", "temporaryFileDeletedAfterVerification"
  ], `${label}.carrier.rawByte`);
  if (raw.contentType !== anchor.carrierMime
    || raw.contentLength !== anchor.carrierBytes
    || raw.expectedBytes !== anchor.carrierBytes
    || raw.downloadedBytes !== anchor.carrierBytes
    || raw.expectedSha256 !== anchor.carrierSha256
    || raw.downloadedSha256 !== anchor.carrierSha256
    || raw.httpStatus !== 200
    || raw.expectedIdentityMatched !== true
    || raw.rawByteVerificationStatus !== "verified"
    || raw.temporaryFileDeletedAfterVerification !== true) {
    fail("CARRIER_BYTE_IDENTITY_DRIFT", `${label}.carrier.rawByte 与固定 anchor 不一致。`);
  }
  const rawStart = utcTime(raw.requestStartedAt, `${label}.carrier.rawByte.requestStartedAt`);
  const rawEnd = utcTime(raw.requestCompletedAt, `${label}.carrier.rawByte.requestCompletedAt`);
  if (rawStart < captureStart || rawEnd < rawStart || rawEnd > captureEnd) {
    fail("TIME_INVALID", `${label}.carrier.rawByte 不在 capture 区间内。`);
  }
  assertSha256(raw.expectedSha256, `${label}.carrier.rawByte.expectedSha256`);
  assertSha256(raw.downloadedSha256, `${label}.carrier.rawByte.downloadedSha256`);
  if (typeof raw.etag !== "string" || raw.etag.length === 0
    || typeof raw.lastModified !== "string" || !Number.isFinite(Date.parse(raw.lastModified))) {
    fail("REMOTE_OBSERVATION_INVALID", `${label}.carrier.rawByte HTTP metadata 无效。`);
  }

  const rightsCandidate = rightsLedger.candidates?.find(
    (candidate) => candidate.sourceCandidateId === expected.candidateId
  );
  const verifiedRightsCandidate = assertRightsCandidate(
    rightsCandidate,
    parentCandidate,
    result,
    label
  );
  assertCarrierReadinessRow(
    readiness,
    expected,
    parentCandidate,
    verifiedRightsCandidate,
    result,
    label
  );
}

function validateObservation(input, context, options = {}) {
  const observation = passiveSnapshot(input, "三载体点时观察");
  scanForbiddenRawMaterial(observation);
  exactObject(observation, [
    "schemaVersion", "recordType", "observationId", "status", "captureStartedAt", "captureCompletedAt",
    "access", "producer", "parentArtifacts", "requestReceipts", "results", "counts",
    "releaseGovernance", "storageBoundary", "integrityBoundary", "rightsBoundary",
    "authorityBoundary", "doesNotEstablish", "observationDigest"
  ], "observation");
  if (observation.schemaVersion !== 1
    || observation.recordType !== "bazi_nondtt_three_carrier_byte_observation_v1"
    || observation.observationId !== OBSERVATION_ID
    || observation.status
      !== "operator_recorded_public_read_only_point_in_time_three_carrier_bytes_verified_no_rights_adjudication"
    || observation.access !== "public_read_only_unauthenticated") {
    fail("OBSERVATION_IDENTITY_INVALID", "三载体点时观察身份或访问边界无效。 ");
  }
  const captureStart = utcTime(observation.captureStartedAt, "observation.captureStartedAt");
  const captureEnd = utcTime(observation.captureCompletedAt, "observation.captureCompletedAt");
  if (captureEnd < captureStart) fail("TIME_INVALID", "captureCompletedAt 早于 captureStartedAt。 ");

  exactObject(observation.producer, ["path", "bytes", "sha256", "requestedMode", "requestedModeCompleted"], "producer");
  if (observation.producer.path !== context.producerSnapshot.path
    || observation.producer.bytes !== context.producerSnapshot.rawBytes
    || observation.producer.sha256 !== context.producerSnapshot.rawSha256
    || observation.producer.requestedMode !== "required"
    || observation.producer.requestedModeCompleted !== true) {
    fail("PRODUCER_DRIFT", "live audit producer 身份或 required 完成态漂移。 ");
  }

  exactObject(observation.parentArtifacts, ["source", "rights", "carrierReadiness"], "parentArtifacts");
  assertArtifactIdentity(
    observation.parentArtifacts.source,
    context.sourceSnapshot,
    context.sourceLedger,
    "parentArtifacts.source"
  );
  assertArtifactIdentity(
    observation.parentArtifacts.rights,
    context.rightsSnapshot,
    context.rightsLedger,
    "parentArtifacts.rights"
  );
  assertArtifactIdentity(
    observation.parentArtifacts.carrierReadiness,
    context.readinessSnapshot,
    context.readiness,
    "parentArtifacts.carrierReadiness"
  );
  assertReadinessBoundary(context.readiness, context.sourceSnapshot, context.rightsSnapshot);

  exactObject(observation.requestReceipts, ["sourceRevisionBatch", "carrierMetadataBatch"], "requestReceipts");
  assertRequestReceipt(
    observation.requestReceipts.sourceRevisionBatch,
    "requestReceipts.sourceRevisionBatch",
    "zh.wikisource.org",
    captureStart,
    captureEnd
  );
  assertRequestReceipt(
    observation.requestReceipts.carrierMetadataBatch,
    "requestReceipts.carrierMetadataBatch",
    "commons.wikimedia.org",
    captureStart,
    captureEnd
  );

  if (!Array.isArray(observation.results) || observation.results.length !== EXPECTED_RESULTS.length) {
    fail("STRUCTURE_INVALID", "results 必须精确包含三项。 ");
  }
  exactArray(
    observation.results.map((result) => result.candidateId),
    EXPECTED_RESULTS.map((result) => result.candidateId),
    "result candidate order"
  );
  observation.results.forEach((result, index) => assertResult(
    result,
    EXPECTED_RESULTS[index],
    context.sourceLedger,
    context.rightsLedger,
    context.readiness,
    captureStart,
    captureEnd,
    `results[${index}]`
  ));

  exactObject(observation.counts, [
    "nonDttSourceCandidates", "sourceRevisionBodiesRevalidatedWithoutStorage",
    "quoteLocatorsRevalidatedWithoutTextStorage", "carrierFilePageRevisionsObserved",
    "carrierRawByteIdentitiesRevalidated", "downloadedCarrierBytes", "formalKnowledgeDocuments",
    "formalSourceRightsRecords", "formalSourceCarrierRecords", "materializationsVerified",
    "rightsAdjudicationReceipts", "verifiedNaturalPersonRightsReviewers", "bindingFrozenVerified"
  ], "counts");
  const expectedDownloadedBytes = observation.results.reduce(
    (total, result) => total + result.carrier.rawByte.downloadedBytes,
    0
  );
  if (observation.counts.nonDttSourceCandidates !== 3
    || observation.counts.sourceRevisionBodiesRevalidatedWithoutStorage !== 3
    || observation.counts.quoteLocatorsRevalidatedWithoutTextStorage !== 4
    || observation.counts.carrierFilePageRevisionsObserved !== 3
    || observation.counts.carrierRawByteIdentitiesRevalidated !== 3
    || observation.counts.downloadedCarrierBytes !== expectedDownloadedBytes
    || expectedDownloadedBytes !== 50_699_301
    || observation.counts.formalKnowledgeDocuments !== 0
    || observation.counts.formalSourceRightsRecords !== 0
    || observation.counts.formalSourceCarrierRecords !== 0
    || observation.counts.materializationsVerified !== 0
    || observation.counts.rightsAdjudicationReceipts !== 0
    || observation.counts.verifiedNaturalPersonRightsReviewers !== 0
    || observation.counts.bindingFrozenVerified !== 0) {
    fail("COUNT_DRIFT", "观察计数不得暗示正式记录、清权、专家或 binding 冻结。 ");
  }

  exactObject(observation.releaseGovernance, [
    "activeLine", "targetSchema", "migrationId", "mutationEpochAvailable", "mutationEpochReceipt",
    "publicDeploymentAuthorized", "expertClaimsAuthorized"
  ], "releaseGovernance");
  if (observation.releaseGovernance.activeLine !== "legacy-v13"
    || observation.releaseGovernance.targetSchema !== 13
    || observation.releaseGovernance.migrationId !== null
    || observation.releaseGovernance.mutationEpochAvailable !== false
    || observation.releaseGovernance.mutationEpochReceipt !== null) {
    fail("RELEASE_GOVERNANCE_DRIFT", "发布治理必须保持 legacy-v13/schema13/null 且无 mutation epoch receipt。 ");
  }
  assertAllFalse(observation.releaseGovernance, [
    "publicDeploymentAuthorized", "expertClaimsAuthorized"
  ], "releaseGovernance");

  exactObject(observation.storageBoundary, [
    "sourceBodyStored", "quoteTextsStored", "carrierFilePageBodiesStored", "carrierFilesStored",
    "temporaryCarrierFilesDeletedAfterVerification", "distributionPolicy"
  ], "storageBoundary");
  assertAllFalse(observation.storageBoundary, [
    "sourceBodyStored", "quoteTextsStored", "carrierFilePageBodiesStored", "carrierFilesStored"
  ], "storageBoundary");
  if (observation.storageBoundary.temporaryCarrierFilesDeletedAfterVerification !== 3
    || observation.storageBoundary.distributionPolicy !== "link_only") {
    fail("STORAGE_BOUNDARY_INVALID", "观察必须保持零正文/载体留存及 link-only。 ");
  }

  exactObject(observation.integrityBoundary, [
    "operatorRecordedLivePublicResponses", "responseBodyDigestsMechanicallyComputedAtRuntime",
    "originalCarrierByteDigestsMechanicallyComputedAtRuntime", "remotePublisherAuthenticityEstablished",
    "tlsPeerIdentityAttestedIntoReceipt", "wireBytesCaptured", "signedTimestampEstablished",
    "futureFreshnessEstablished", "crossFileAtomicSnapshot", "intervalMutationExcluded", "abaExcluded",
    "observationDigestIsDigitalSignature"
  ], "integrityBoundary");
  if (observation.integrityBoundary.operatorRecordedLivePublicResponses !== true
    || observation.integrityBoundary.responseBodyDigestsMechanicallyComputedAtRuntime !== true
    || observation.integrityBoundary.originalCarrierByteDigestsMechanicallyComputedAtRuntime !== true) {
    fail("INTEGRITY_BOUNDARY_INVALID", "点时观察必须保留其机械摘要声明。 ");
  }
  assertAllFalse(observation.integrityBoundary, [
    "remotePublisherAuthenticityEstablished", "tlsPeerIdentityAttestedIntoReceipt", "wireBytesCaptured",
    "signedTimestampEstablished", "futureFreshnessEstablished", "crossFileAtomicSnapshot",
    "intervalMutationExcluded", "abaExcluded", "observationDigestIsDigitalSignature"
  ], "integrityBoundary");

  exactObject(observation.rightsBoundary, [
    "platformNoticeAccuracyVerified", "jurisdictionalApplicabilityEstablished", "workRightsEstablished",
    "editionOrTranscriptionRightsEstablished", "carrierRightsEstablished", "reproductionAllowed",
    "quotationAllowed", "redistributionAllowed", "rightsLegalConclusionEstablished"
  ], "rightsBoundary");
  assertAllFalse(observation.rightsBoundary, Object.keys(observation.rightsBoundary), "rightsBoundary");

  exactObject(observation.authorityBoundary, [
    "activeAdmissionEffect", "sourceIdentityBeyondObservedBytesEstablished", "contentTruthEstablished",
    "expertTruthEstablished", "sourceBundleComplete", "rightsBundleComplete", "releaseReady",
    "publicDeploymentAuthorized", "expertClaimsAuthorized"
  ], "authorityBoundary");
  if (observation.authorityBoundary.activeAdmissionEffect !== "none") {
    fail("AUTHORITY_PROMOTION_FORBIDDEN", "activeAdmissionEffect 必须为 none。 ");
  }
  assertAllFalse(observation.authorityBoundary, [
    "sourceIdentityBeyondObservedBytesEstablished", "contentTruthEstablished", "expertTruthEstablished",
    "sourceBundleComplete", "rightsBundleComplete", "releaseReady", "publicDeploymentAuthorized",
    "expertClaimsAuthorized"
  ], "authorityBoundary");
  exactArray(observation.doesNotEstablish, DOES_NOT_ESTABLISH, "doesNotEstablish");

  const computedDigest = computeBaziNonDttThreeCarrierByteObservationDigest(observation);
  if (observation.observationDigest !== computedDigest) {
    fail("DIGEST_MISMATCH", `observationDigest 应为 ${computedDigest}。`);
  }
  if (options.requirePinnedDigest === true && observation.observationDigest !== OBSERVATION_DIGEST) {
    fail("PINNED_DIGEST_DRIFT", "observationDigest 与 verifier 固定值不一致。 ");
  }
  return observation;
}

async function readInputs(workspaceRoot) {
  const [observationSnapshot, sourceSnapshot, rightsSnapshot, readinessSnapshot, producerSnapshot] =
    await Promise.all([
      readBaziDttStableWorkspaceArtifact(workspaceRoot, BAZI_NONDTT_THREE_CARRIER_BYTE_OBSERVATION_PATH),
      readBaziDttStableWorkspaceArtifact(workspaceRoot, SOURCE_PATH),
      readBaziDttStableWorkspaceArtifact(workspaceRoot, RIGHTS_PATH),
      readBaziDttStableWorkspaceArtifact(workspaceRoot, CARRIER_READINESS_PATH),
      readBaziDttStableWorkspaceArtifact(workspaceRoot, PRODUCER_PATH)
    ]);
  return {
    observationSnapshot,
    sourceSnapshot,
    rightsSnapshot,
    readinessSnapshot,
    producerSnapshot,
    observation: parseBaziDttStrictJsonArtifact(observationSnapshot),
    sourceLedger: parseBaziDttStrictJsonArtifact(sourceSnapshot),
    rightsLedger: parseBaziDttStrictJsonArtifact(rightsSnapshot),
    readiness: parseBaziDttStrictJsonArtifact(readinessSnapshot)
  };
}

function deepFreeze(value, seen = new NATIVE_SET()) {
  if (!value || typeof value !== "object" || REFLECT_APPLY(SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(SET_ADD, seen, [value]);
  for (const child of REFLECT_APPLY(OBJECT_VALUES, Object, [value])) deepFreeze(child, seen);
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function artifactIdentity(snapshot) {
  return Object.freeze({
    path: snapshot.path,
    rawBytes: snapshot.rawBytes,
    rawSha256: snapshot.rawSha256
  });
}

export async function verifyBaziNonDttThreeCarrierByteObservation(
  workspaceRoot = process.cwd(),
  callerInput
) {
  if (typeof workspaceRoot !== "string" || workspaceRoot.length === 0) {
    fail("WORKSPACE_ROOT_INVALID", "workspaceRoot 必须是非空 primitive string。 ");
  }
  const [carrierReadinessCapability, inputs] = await Promise.all([
    loadBaziSourceCarrierRecordReadiness(workspaceRoot),
    readInputs(workspaceRoot)
  ]);
  if (!isVerifiedBaziSourceCarrierRecordReadiness(carrierReadinessCapability)) {
    fail("UPSTREAM_BRAND_REQUIRED", "必须取得完整 SourceCarrier readiness 私有 brand。 ");
  }
  const carrierReadinessSummary = getBaziSourceCarrierRecordReadinessSummary(
    carrierReadinessCapability
  );
  if (carrierReadinessSummary.ledgerId !== inputs.readiness.ledgerId
    || carrierReadinessSummary.ledgerDigest !== inputs.readiness.ledgerDigest
    || carrierReadinessSummary.canonicalSourceRightsSupersessionBrandVerified !== true
    || carrierReadinessSummary.canonicalBindingReadinessV17BrandVerified !== true
    || carrierReadinessSummary.formalSourceRightsRecords !== 0
    || carrierReadinessSummary.formalSourceCarrierRecords !== 0
    || carrierReadinessSummary.projectCopyMaterializationRecords !== 0
    || carrierReadinessSummary.materializationsVerified !== 0
    || carrierReadinessSummary.adjudicationReceiptsIssued !== 0
    || carrierReadinessSummary.verifiedRightsReviewers !== 0
    || carrierReadinessSummary.sourceBindingsFrozen !== 0
    || carrierReadinessSummary.legalConclusion !== "not_established"
    || carrierReadinessSummary.activeAdmissionEffect !== "none"
    || carrierReadinessSummary.releaseReady !== false
    || carrierReadinessSummary.publicDeploymentAuthorized !== false
    || carrierReadinessSummary.expertClaimsAuthorized !== false
    || carrierReadinessSummary.crossFileAtomicSnapshot !== false
    || carrierReadinessSummary.mutationEpochAvailableForSchema13 !== false
    || carrierReadinessSummary.mutationEpochReceipt !== null
    || carrierReadinessSummary.intervalMutationExcluded !== false
    || carrierReadinessSummary.abaExcluded !== false) {
    fail("UPSTREAM_SUMMARY_DRIFT", "完整 SourceCarrier readiness brand summary 漂移。 ");
  }
  if (inputs.observationSnapshot.rawBytes !== OBSERVATION_RAW_IDENTITY.rawBytes
    || inputs.observationSnapshot.rawSha256 !== OBSERVATION_RAW_IDENTITY.rawSha256) {
    fail("OBSERVATION_ARTIFACT_DRIFT", "三载体点时观察 raw identity 漂移。 ");
  }
  if (callerInput !== undefined && !canonicalEqual(passiveSnapshot(callerInput, "调用方观察"), inputs.observation)) {
    fail("CALLER_INPUT_MISMATCH", "调用方观察与稳定读取的持久化工件不一致。 ");
  }
  const observation = validateObservation(inputs.observation, inputs, { requirePinnedDigest: true });
  const result = deepFreeze({
    status: observation.status,
    observationId: observation.observationId,
    observationDigest: observation.observationDigest,
    pointInTimeOnly: true,
    operatorRecordedCarrierRawByteIdentitiesRevalidated:
      observation.counts.carrierRawByteIdentitiesRevalidated,
    offlineVerifierNetworkRequestsPerformed: false,
    offlineVerifierReDownloadedCarrierFiles: false,
    downloadedCarrierBytes: observation.counts.downloadedCarrierBytes,
    formalKnowledgeDocuments: 0,
    formalSourceRightsRecords: 0,
    formalSourceCarrierRecords: 0,
    bindingFrozenVerified: 0,
    activeAdmissionEffect: "none",
    canonicalSourceRightsSupersessionBrandVerified: true,
    canonicalBindingReadinessV17BrandVerified: true,
    crossFileAtomicSnapshot: false,
    mutationEpochAvailable: false,
    intervalMutationExcluded: false,
    abaExcluded: false,
    rightsLegalConclusionEstablished: false,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false,
    artifacts: {
      observation: artifactIdentity(inputs.observationSnapshot),
      source: artifactIdentity(inputs.sourceSnapshot),
      rights: artifactIdentity(inputs.rightsSnapshot),
      carrierReadiness: artifactIdentity(inputs.readinessSnapshot),
      producer: artifactIdentity(inputs.producerSnapshot)
    }
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedBaziNonDttThreeCarrierByteObservation(value) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value]);
}

export const baziNonDttThreeCarrierByteObservationTestOnly = Object.freeze({
  SOURCE_PATH,
  RIGHTS_PATH,
  CARRIER_READINESS_PATH,
  PRODUCER_PATH,
  OBSERVATION_ID,
  OBSERVATION_DIGEST,
  OBSERVATION_RAW_IDENTITY,
  EXPECTED_RESULTS,
  DOES_NOT_ESTABLISH,
  deepFreeze,
  readInputs,
  validateObservation
});
