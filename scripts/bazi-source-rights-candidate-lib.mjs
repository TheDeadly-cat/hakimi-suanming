import { createHash } from "node:crypto";
import { verifyBaziSourceBindingCandidateLedger } from "./bazi-source-binding-candidate-lib.mjs";

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const SHA1_PATTERN = /^[a-f0-9]{40}$/u;

const EXPECTED_POLICY_EVIDENCE = Object.freeze([
  Object.freeze({
    policyId: "wmf-terms-r554823",
    provider: "Wikimedia Foundation Governance Wiki",
    title: "Policy:Terms of Use",
    permanentUrl: "https://foundation.wikimedia.org/w/index.php?title=Policy%3ATerms_of_Use&oldid=554823#7._Licensing_of_Content",
    pageId: 21261,
    revisionId: 554823,
    parentRevisionId: 554674,
    revisionTimestamp: "2026-02-21T02:54:13Z",
    mediaWikiSha1: "2ed02699a89770800d4297b97a3b61d07bce2588"
  }),
  Object.freeze({
    policyId: "cc-by-sa-4.0-legal-code",
    provider: "Creative Commons",
    title: "Attribution-ShareAlike 4.0 International Legal Code",
    permanentUrl: "https://creativecommons.org/licenses/by-sa/4.0/legalcode",
    pageId: null,
    revisionId: null,
    parentRevisionId: null,
    revisionTimestamp: null,
    mediaWikiSha1: null
  }),
  Object.freeze({
    policyId: "commons-reuse-r1259943424",
    provider: "Wikimedia Commons",
    title: "Commons:Reusing content outside Wikimedia",
    permanentUrl: "https://commons.wikimedia.org/w/index.php?title=Commons%3AReusing_content_outside_Wikimedia&oldid=1259943424",
    pageId: 1130401,
    revisionId: 1259943424,
    parentRevisionId: 1259943327,
    revisionTimestamp: "2026-08-11T22:45:52Z",
    mediaWikiSha1: "76bb7ffb1b9561c3a83b684d6f69d502ca050ef6"
  })
]);

const EXPECTED_CANDIDATES = Object.freeze([
  Object.freeze({
    rightsCandidateId: "smt-siku-v10-wikisource-r761703-rights-candidate-v1",
    sourceCandidateId: "smt-siku-v10-wikisource-r761703-candidate-v1",
    pageSpecificNoticeObservation: "pd_old_template_observed",
    observedTemplateNames: Object.freeze(["Template:PD-old"])
  }),
  Object.freeze({
    rightsCandidateId: "dtt-chanwei-wikisource-r2600158-rights-candidate-v1",
    sourceCandidateId: "dtt-chanwei-wikisource-r2600158-candidate-v1",
    pageSpecificNoticeObservation: "pd_old_template_observed",
    observedTemplateNames: Object.freeze(["Template:PD-old"])
  }),
  Object.freeze({
    rightsCandidateId: "smt-v5-wikisource-r2706483-rights-candidate-v1",
    sourceCandidateId: "smt-v5-wikisource-r2706483-candidate-v1",
    pageSpecificNoticeObservation: "no_page_specific_pd_template_observed",
    observedTemplateNames: Object.freeze([])
  }),
  Object.freeze({
    rightsCandidateId: "yhzp-wikisource-r2593607-rights-candidate-v1",
    sourceCandidateId: "yhzp-wikisource-r2593607-candidate-v1",
    pageSpecificNoticeObservation: "pd_old_template_observed",
    observedTemplateNames: Object.freeze(["Template:PD-old"])
  })
]);

function fail(message) {
  throw new Error(`Bazi source-rights candidate gate failed: ${message}`);
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertExactKeys(value, keys, label) {
  if (!isRecord(value)) fail(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${label} keys expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertExactArray(actual, expected, label) {
  if (!Array.isArray(actual) || JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${label} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertUrls(refs, label) {
  if (!Array.isArray(refs) || refs.length === 0
    || refs.some((ref) => typeof ref !== "string" || !URL.canParse(ref))) {
    fail(`${label} must contain auditable public URLs`);
  }
}

export function canonicalRightsCandidateJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalRightsCandidateJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalRightsCandidateJson(value[key])}`
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256Value(value) {
  return createHash("sha256").update(canonicalRightsCandidateJson(value), "utf8").digest("hex");
}

export function computeRightsCandidateDigest(candidate) {
  const { candidateDigest: _candidateDigest, ...unsigned } = candidate;
  return sha256Value(unsigned);
}

export function computeRightsCandidateLedgerDigest(ledger) {
  const { ledgerDigest: _ledgerDigest, ...unsigned } = ledger;
  return sha256Value(unsigned);
}

function verifyPolicyEvidence(policy, lock, index) {
  const label = `policyEvidence[${index}]`;
  assertExactKeys(policy, [
    "policyId", "provider", "title", "permanentUrl", "pageId", "revisionId",
    "parentRevisionId", "revisionTimestamp", "mediaWikiSha1", "observation", "legalConclusion"
  ], label);
  for (const key of [
    "policyId", "provider", "title", "permanentUrl", "pageId", "revisionId",
    "parentRevisionId", "revisionTimestamp", "mediaWikiSha1"
  ]) {
    if (policy[key] !== lock[key]) fail(`${label}.${key} does not match the acquired policy lock`);
  }
  if (!URL.canParse(policy.permanentUrl) || typeof policy.observation !== "string" || !policy.observation
    || policy.legalConclusion !== "not_established") {
    fail(`${label} must remain an observed policy, not a legal conclusion`);
  }
  if (policy.revisionId === null) {
    if (policy.pageId !== null || policy.parentRevisionId !== null
      || policy.revisionTimestamp !== null || policy.mediaWikiSha1 !== null) {
      fail(`${label} non-MediaWiki policy must not imply a revision lock`);
    }
  } else if (!Number.isInteger(policy.pageId) || !Number.isInteger(policy.parentRevisionId)
    || Number.isNaN(Date.parse(policy.revisionTimestamp)) || !SHA1_PATTERN.test(policy.mediaWikiSha1)
    || !policy.permanentUrl.includes(`oldid=${policy.revisionId}`)) {
    fail(`${label} MediaWiki policy revision identity is invalid`);
  }
}

function verifyCarrierLayer(carrier, sourceAnchor, policyIds, label) {
  assertExactKeys(carrier, [
    "anchorId", "carrierFilePageId", "carrierFileTitle", "carrierDescriptionUrl",
    "carrierMediaWikiSha1", "carrierSha256", "metadataObservation", "noticeState",
    "reusePolicyId", "status", "evidenceRefs", "rightsReviewerIds"
  ], label);
  for (const key of [
    "anchorId", "carrierFilePageId", "carrierFileTitle", "carrierDescriptionUrl",
    "carrierMediaWikiSha1", "carrierSha256"
  ]) {
    if (carrier[key] !== sourceAnchor[key]) fail(`${label}.${key} does not match the source facsimile lock`);
  }
  if (!SHA1_PATTERN.test(carrier.carrierMediaWikiSha1) || !SHA256_PATTERN.test(carrier.carrierSha256)) {
    fail(`${label} digests are invalid`);
  }
  assertExactKeys(carrier.metadataObservation, [
    "licenseShortName", "usageTerms", "attributionRequired", "copyrighted", "licenseUrl", "restrictions"
  ], `${label}.metadataObservation`);
  const expectedMetadata = {
    licenseShortName: "Public domain",
    usageTerms: "Public domain",
    attributionRequired: "false",
    copyrighted: "False",
    licenseUrl: "",
    restrictions: ""
  };
  for (const [key, expected] of Object.entries(expectedMetadata)) {
    if (carrier.metadataObservation[key] !== expected) {
      fail(`${label}.metadataObservation.${key} does not match the observed Commons metadata`);
    }
  }
  if (carrier.noticeState !== "commons_public_domain_metadata_observed_not_adjudicated"
    || carrier.reusePolicyId !== "commons-reuse-r1259943424" || !policyIds.has(carrier.reusePolicyId)
    || carrier.status !== "notice_observed_not_cleared"
    || !Array.isArray(carrier.rightsReviewerIds) || carrier.rightsReviewerIds.length !== 0) {
    fail(`${label} cannot imply carrier reuse clearance`);
  }
  assertUrls(carrier.evidenceRefs, `${label}.evidenceRefs`);
}

function verifyCandidate(candidate, lock, sourceCandidate, policyIds) {
  const label = candidate.rightsCandidateId;
  assertExactKeys(candidate, [
    "rightsCandidateId", "sourceCandidateId", "bindingId", "sourceId", "workLayer",
    "transcriptionLayer", "carrierLayers", "decision", "candidateDigest"
  ], label);
  if (candidate.rightsCandidateId !== lock.rightsCandidateId
    || candidate.sourceCandidateId !== lock.sourceCandidateId) {
    fail(`${label} identity does not match the rights candidate lock`);
  }
  for (const key of ["bindingId", "sourceId"]) {
    if (candidate[key] !== sourceCandidate[key]) fail(`${label}.${key} does not match the source candidate`);
  }

  const work = candidate.workLayer;
  assertExactKeys(work, [
    "title", "attributedAuthor", "sourceUrl", "pageSpecificNoticeObservation",
    "observedTemplateNames", "status", "jurisdictionAssessment", "evidenceRefs", "legalReviewerIds"
  ], `${label}.workLayer`);
  if (work.title !== sourceCandidate.workIdentity.title
    || work.attributedAuthor !== sourceCandidate.workIdentity.attributedAuthor
    || work.sourceUrl !== sourceCandidate.carrierIdentity.permanentUrl
    || work.pageSpecificNoticeObservation !== lock.pageSpecificNoticeObservation) {
    fail(`${label}.workLayer does not match the acquired work observation lock`);
  }
  assertExactArray(work.observedTemplateNames, [...lock.observedTemplateNames], `${label}.observedTemplateNames`);
  if (work.status !== "candidate_only_not_adjudicated" || work.jurisdictionAssessment !== null
    || !Array.isArray(work.legalReviewerIds) || work.legalReviewerIds.length !== 0) {
    fail(`${label}.workLayer must remain unadjudicated and unreviewed`);
  }
  assertUrls(work.evidenceRefs, `${label}.workLayer.evidenceRefs`);

  const transcription = candidate.transcriptionLayer;
  assertExactKeys(transcription, [
    "provider", "pageId", "revisionId", "rawWikitextSha256", "termsPolicyIds",
    "contributionLicenseObservation", "attributionPathObservation", "provenanceState",
    "status", "evidenceRefs", "rightsReviewerIds"
  ], `${label}.transcriptionLayer`);
  if (transcription.provider !== sourceCandidate.carrierIdentity.provider
    || transcription.pageId !== sourceCandidate.carrierIdentity.pageId
    || transcription.revisionId !== sourceCandidate.carrierIdentity.revisionId
    || transcription.rawWikitextSha256 !== sourceCandidate.carrierIdentity.rawWikitextSha256
    || !SHA256_PATTERN.test(transcription.rawWikitextSha256)) {
    fail(`${label}.transcriptionLayer does not match the source revision lock`);
  }
  assertExactArray(transcription.termsPolicyIds, ["wmf-terms-r554823", "cc-by-sa-4.0-legal-code"], `${label}.termsPolicyIds`);
  if (transcription.termsPolicyIds.some((id) => !policyIds.has(id))
    || transcription.contributionLicenseObservation !== "wmf_default_cc_by_sa_4_or_gfdl_with_project_exceptions_observed"
    || transcription.attributionPathObservation !== "permalink_or_history_required_if_reused"
    || transcription.provenanceState !== "import_and_contribution_provenance_not_independently_verified"
    || transcription.status !== "terms_observed_not_cleared"
    || !Array.isArray(transcription.rightsReviewerIds) || transcription.rightsReviewerIds.length !== 0) {
    fail(`${label}.transcriptionLayer cannot imply edition or transcription clearance`);
  }
  assertUrls(transcription.evidenceRefs, `${label}.transcriptionLayer.evidenceRefs`);

  if (!Array.isArray(candidate.carrierLayers)
    || candidate.carrierLayers.length !== sourceCandidate.facsimileAnchors.length) {
    fail(`${label}.carrierLayers count must match the source facsimile anchors`);
  }
  candidate.carrierLayers.forEach((carrier, index) => {
    verifyCarrierLayer(carrier, sourceCandidate.facsimileAnchors[index], policyIds, `${label}.carrierLayers[${index}]`);
  });

  const decision = candidate.decision;
  assertExactKeys(decision, [
    "knowledgeDocumentCreated", "formalSourceRightsRecordCreated", "formalSourceCarrierRecordCreated",
    "workLayerCleared", "editionLayerCleared", "carrierLayerCleared", "reviewAttestations",
    "distributionPolicy", "legalConclusion", "rightsCandidateState", "frozenAt"
  ], `${label}.decision`);
  for (const key of [
    "knowledgeDocumentCreated", "formalSourceRightsRecordCreated", "formalSourceCarrierRecordCreated",
    "workLayerCleared", "editionLayerCleared", "carrierLayerCleared"
  ]) {
    if (decision[key] !== false) fail(`${label}.decision.${key} must remain false`);
  }
  if (!Array.isArray(decision.reviewAttestations) || decision.reviewAttestations.length !== 0
    || decision.distributionPolicy !== "link_only" || decision.legalConclusion !== "not_established"
    || decision.rightsCandidateState !== "evidence_observed_human_legal_review_required"
    || decision.frozenAt !== null) {
    fail(`${label}.decision cannot imply formal records, legal review, clearance, or freezing`);
  }
  const expectedDigest = computeRightsCandidateDigest(candidate);
  if (candidate.candidateDigest !== expectedDigest) {
    fail(`${label}.candidateDigest expected ${expectedDigest}, got ${candidate.candidateDigest}`);
  }
}

export function verifyBaziSourceRightsCandidateLedger(ledger, sourceLedger) {
  verifyBaziSourceBindingCandidateLedger(sourceLedger);
  assertExactKeys(ledger, [
    "schemaVersion", "recordType", "ledgerId", "status", "observedAt", "sourceBindingLedger",
    "accessBoundary", "policyEvidence", "candidates", "gateSummary", "doesNotEstablish", "ledgerDigest"
  ], "ledger");
  if (ledger.schemaVersion !== "1.1.0"
    || ledger.recordType !== "bazi_strength_source_rights_candidate_ledger"
    || ledger.ledgerId !== "hakimi.bazi.strength.source-rights-candidates/1.1.0"
    || ledger.status !== "research_observations_only" || Number.isNaN(Date.parse(ledger.observedAt))) {
    fail("ledger identity or observedAt is invalid");
  }

  assertExactKeys(ledger.sourceBindingLedger, ["path", "ledgerId", "ledgerDigest", "candidateCount"], "sourceBindingLedger");
  if (ledger.sourceBindingLedger.path !== "content/bazi-strength-source-binding-candidates.v1.json"
    || ledger.sourceBindingLedger.ledgerId !== sourceLedger.ledgerId
    || ledger.sourceBindingLedger.ledgerDigest !== sourceLedger.ledgerDigest
    || ledger.sourceBindingLedger.candidateCount !== sourceLedger.candidates.length) {
    fail("sourceBindingLedger does not match the verified source candidate ledger");
  }

  assertExactKeys(ledger.accessBoundary, [
    "publicReadOnly", "authenticatedAccessUsed", "accessControlBypassed", "sourceBodiesStored",
    "quoteTextsStored", "carrierFilesStored", "pageImagesStored", "storagePolicy"
  ], "accessBoundary");
  if (ledger.accessBoundary.publicReadOnly !== true
    || ledger.accessBoundary.authenticatedAccessUsed !== false
    || ledger.accessBoundary.accessControlBypassed !== false
    || ledger.accessBoundary.sourceBodiesStored !== false
    || ledger.accessBoundary.quoteTextsStored !== false
    || ledger.accessBoundary.carrierFilesStored !== false
    || ledger.accessBoundary.pageImagesStored !== false
    || ledger.accessBoundary.storagePolicy !== "link_only") {
    fail("accessBoundary must remain public, read-only, unauthenticated, repository-empty, and link-only");
  }

  if (!Array.isArray(ledger.policyEvidence) || ledger.policyEvidence.length !== EXPECTED_POLICY_EVIDENCE.length) {
    fail("policyEvidence count is invalid");
  }
  ledger.policyEvidence.forEach((policy, index) => verifyPolicyEvidence(policy, EXPECTED_POLICY_EVIDENCE[index], index));
  const policyIds = new Set(ledger.policyEvidence.map((policy) => policy.policyId));

  assertExactArray(
    ledger.candidates.map((candidate) => candidate.rightsCandidateId),
    EXPECTED_CANDIDATES.map((candidate) => candidate.rightsCandidateId),
    "rights candidate order"
  );
  const sourceById = new Map(sourceLedger.candidates.map((candidate) => [candidate.candidateId, candidate]));
  ledger.candidates.forEach((candidate, index) => {
    const sourceCandidate = sourceById.get(candidate.sourceCandidateId);
    if (!sourceCandidate) fail(`${candidate.rightsCandidateId} references an unknown source candidate`);
    verifyCandidate(candidate, EXPECTED_CANDIDATES[index], sourceCandidate, policyIds);
  });

  assertExactKeys(ledger.gateSummary, [
    "rightsCandidateCount", "pageSpecificPdNoticeObserved", "pageSpecificPdNoticeAbsent",
    "commonsPublicDomainMetadataObserved", "formalSourceRightsRecordsCreated",
    "formalSourceCarrierRecordsCreated", "legalReviewsVerified", "workLayersCleared",
    "editionLayersCleared", "carrierLayersCleared", "redistributableSources",
    "sourceBodiesStored", "quoteTextsStored", "carrierFilesStored", "rightsBundleComplete",
    "releaseReady", "publicDeploymentAuthorized", "expertClaimsAuthorized"
  ], "gateSummary");
  const expectedGate = {
    rightsCandidateCount: 4,
    pageSpecificPdNoticeObserved: 3,
    pageSpecificPdNoticeAbsent: 1,
    commonsPublicDomainMetadataObserved: 5,
    formalSourceRightsRecordsCreated: 0,
    formalSourceCarrierRecordsCreated: 0,
    legalReviewsVerified: 0,
    workLayersCleared: 0,
    editionLayersCleared: 0,
    carrierLayersCleared: 0,
    redistributableSources: 0,
    sourceBodiesStored: 0,
    quoteTextsStored: 0,
    carrierFilesStored: 0,
    rightsBundleComplete: false,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  };
  for (const [key, expected] of Object.entries(expectedGate)) {
    if (ledger.gateSummary[key] !== expected) fail(`gateSummary.${key} expected ${expected}`);
  }
  assertExactArray(ledger.doesNotEstablish, [
    "work_public_domain_legal_conclusion",
    "transcription_or_edition_license_clearance",
    "carrier_reuse_legal_clearance",
    "jurisdiction_analysis",
    "formal_source_rights_record",
    "formal_source_carrier_record",
    "content_truth",
    "expert_truth",
    "release_readiness",
    "public_release_authorization"
  ], "doesNotEstablish");
  if (!SHA256_PATTERN.test(ledger.ledgerDigest)) fail("ledgerDigest is invalid");
  const expectedDigest = computeRightsCandidateLedgerDigest(ledger);
  if (ledger.ledgerDigest !== expectedDigest) {
    fail(`ledgerDigest expected ${expectedDigest}, got ${ledger.ledgerDigest}`);
  }
  return ledger;
}
