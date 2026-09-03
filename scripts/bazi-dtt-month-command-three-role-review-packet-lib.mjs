import { createHash } from "node:crypto";
import { types as utilTypes } from "node:util";

import {
  computeCandidateDigest,
  computeLedgerDigest
} from "./bazi-source-binding-candidate-lib.mjs";
import {
  computeRightsCandidateDigest,
  computeRightsCandidateLedgerDigest
} from "./bazi-source-rights-candidate-lib.mjs";
import {
  computeBaziDttNoticeReconciliationV2Digest
} from "./bazi-dtt-version-aware-readiness-lib.mjs";
import {
  BAZI_DTT_MONTH_COMMAND_PUBLIC_EVIDENCE_RELATIVE_PATH,
  computeBaziDttMonthCommandPublicEvidenceDigest,
  isVerifiedBaziDttMonthCommandPublicEvidence,
  loadBaziDttMonthCommandPublicEvidence
} from "./bazi-dtt-month-command-public-evidence-lib.mjs";
import {
  computeBaziKnowledgeCoreIdentityReboundBindingReadinessDigest,
  isVerifiedBaziKnowledgeCoreIdentityReboundBindingReadiness,
  loadBaziKnowledgeCoreIdentityReboundBindingReadiness
} from "./bazi-knowledge-core-identity-rebound-binding-readiness-lib.mjs";
import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";

export const BAZI_DTT_MONTH_COMMAND_THREE_ROLE_REVIEW_PACKET_RELATIVE_PATH =
  "content/system-admission/bazi-dtt-month-command-three-role-review-packet.v1.json";

const PACKET_ID = "hakimi.bazi.dtt-month-command-three-role-review-packet/1.0.0";
const PACKET_DIGEST_DOMAIN = "hakimi.bazi.dtt-month-command-three-role-review-packet.v1";
const CREATED_AT = "2026-09-04T00:00:00.000Z";
const SHA256 = /^[a-f0-9]{64}$/u;
const VERIFIED_RESULTS = new WeakSet();
const PACKET_RAW_IDENTITY = Object.freeze({
  role: "persisted_append_only_three_role_review_packet",
  path: BAZI_DTT_MONTH_COMMAND_THREE_ROLE_REVIEW_PACKET_RELATIVE_PATH,
  rawBytes: 30_854,
  rawSha256: "252370b6a03e799321544948182351a96d42d148fe8e3039eacdb43385a4b5ca"
});

const PINS = Object.freeze({
  source: Object.freeze({
    role: "current_source_binding_candidate_ledger",
    path: "content/bazi-strength-source-binding-candidates.v1.7.0.json",
    rawBytes: 58_579,
    rawSha256: "03bc334a507e224d8658cd2af5fe5d5a11e1db0553fa7e54bf1287010147ccd2",
    semanticIdField: "ledgerId",
    semanticId: "hakimi.bazi.strength.source-binding-candidates/1.7.0",
    semanticDigestField: "ledgerDigest",
    semanticDigest: "e705ef32eb2dc0d6651f314a6020b71c18070ba5b6702c6965b628d01f1ef5d9"
  }),
  rights: Object.freeze({
    role: "current_source_rights_candidate_ledger",
    path: "content/bazi-strength-source-rights-candidates.v1.3.0.json",
    rawBytes: 25_852,
    rawSha256: "8b26eea65e9ee3e7876298c3f720c46c43d5ec7d444ad4a4252116fc1dc21f17",
    semanticIdField: "ledgerId",
    semanticId: "hakimi.bazi.strength.source-rights-candidates/1.3.0",
    semanticDigestField: "ledgerDigest",
    semanticDigest: "4b1183a85f1d2aeee537544a6b3711510406d98856a921730879c8a9ca782db1"
  }),
  reconciliation: Object.freeze({
    role: "dtt_notice_reconciliation_v2",
    path: "content/system-admission/bazi-dtt-notice-reconciliation.v2.json",
    rawBytes: 8_881,
    rawSha256: "e2656a19955db0ce908df88aa696cd40847e7536af58c79548ac1fbce9a7464b",
    semanticIdField: "reconciliationId",
    semanticId: "hakimi.bazi.dtt-notice-reconciliation/2.0.0",
    semanticDigestField: "reconciliationDigest",
    semanticDigest: "2a47fc6fe281a4362c36dfc67c2a6dee195b5b069065ffc0e86ac1afcd7aa8a0"
  }),
  readiness: Object.freeze({
    role: "current_binding_readiness_v1_9",
    path: "content/system-admission/bazi-binding-freeze-requirements.v1.9.0.json",
    rawBytes: 45_551,
    rawSha256: "e20145b5f34b5dc04464e482cda5da990f82e520236679efbf568b322637f797",
    semanticIdField: "ledgerId",
    semanticId: "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.9.0",
    semanticDigestField: "ledgerDigest",
    semanticDigest: "42930e63cb0960df969f5fe059617eb96a8ec9bd857c486cd4b33a28d37a8ae1"
  }),
  publicEvidence: Object.freeze({
    role: "current_dtt_month_command_public_evidence_observation",
    path: BAZI_DTT_MONTH_COMMAND_PUBLIC_EVIDENCE_RELATIVE_PATH,
    rawBytes: 31_062,
    rawSha256: "85788506067b50453545ec786c7a47b0e51a4cf004419cbe8c547f9384c01ae6",
    semanticIdField: "observationId",
    semanticId: "hakimi.bazi.dtt-month-command-public-evidence/2026-08-29T15:17:27.103Z",
    semanticDigestField: "observationDigest",
    semanticDigest: "01e61e4f77526270ef83a0d95fbcb165bf307d5efa09c5a0360ff49bf1735993"
  })
});

const SUBJECT = Object.freeze({
  bindingId: "binding:dtt:month-command",
  evidenceSubjectId: "bazi.strength.binding.dtt.month-command.v1",
  sourceId: "dtt-chanwei-wikisource-r2600158",
  sourceCandidateId: "dtt-chanwei-wikisource-r2600158-candidate-v2",
  sourceCandidateDigest: "2c59ee25081c6e0a88ee7f9da18395be2ea615bb289c28798e324e23befeeb59",
  rightsCandidateId: "dtt-chanwei-wikisource-r2600158-rights-candidate-v2",
  rightsCandidateDigest: "674a0b64179f5fbb0dff331fdad6b6ac93e3093de4a8459abf6ff9bdd6cd418c",
  quoteCandidateId: "dtt-yueling-minimal-v1"
});

const REVIEW_ROLES = Object.freeze([
  Object.freeze({
    roleId: "bibliographic_collation",
    seatsRequired: 1,
    allowedScope: Object.freeze([
      "work_edition_and_carrier_identity",
      "revision_and_page_locator",
      "facsimile_correspondence_and_collation"
    ]),
    forbiddenScope: Object.freeze([
      "rights_legal_conclusion",
      "dtt_domain_truth",
      "formal_admission_or_release_authorization"
    ])
  }),
  Object.freeze({
    roleId: "rights_legal",
    seatsRequired: 1,
    allowedScope: Object.freeze([
      "work_transcription_and_carrier_notice_applicability",
      "license_and_attribution_obligations",
      "redistribution_and_legal_disposition"
    ]),
    forbiddenScope: Object.freeze([
      "bibliographic_or_collation_identity_by_assertion",
      "dtt_domain_truth",
      "formal_admission_or_release_authorization"
    ])
  }),
  Object.freeze({
    roleId: "dtt_domain_expert",
    seatsRequired: 2,
    allowedScope: Object.freeze([
      "month_command_source_relevance",
      "traditional_context_and_school_scope",
      "counterexamples_disagreement_and_uncertainty"
    ]),
    forbiddenScope: Object.freeze([
      "bibliographic_or_collation_identity",
      "rights_legal_conclusion",
      "formal_admission_or_release_authorization"
    ])
  })
]);

function vacantSeat(seatId, roleId) {
  return Object.freeze({
    seatId,
    roleId,
    reviewerIds: Object.freeze([]),
    responses: Object.freeze([]),
    attestations: Object.freeze([]),
    status: "vacant_not_started"
  });
}

const REVIEWER_SEATS = Object.freeze([
  vacantSeat("bibliographic-collation-1", "bibliographic_collation"),
  vacantSeat("rights-legal-1", "rights_legal"),
  vacantSeat("domain-expert-a", "dtt_domain_expert"),
  vacantSeat("domain-expert-b", "dtt_domain_expert")
]);

const REVIEW_ITEMS = Object.freeze([
  ["bib-01-work-identity", "bibliographic_collation", "work_identity"],
  ["bib-02-edition-identity", "bibliographic_collation", "edition_identity"],
  ["bib-03-transcription-revision", "bibliographic_collation", "transcription_revision_locator"],
  ["bib-04-ssid-carrier", "bibliographic_collation", "ssid_carrier_identity"],
  ["bib-05-cadal-carrier", "bibliographic_collation", "cadal_carrier_identity"],
  ["bib-06-two-collations", "bibliographic_collation", "two_normalized_collation_candidates"],
  ["rights-01-work-notice", "rights_legal", "work_notice_applicability"],
  ["rights-02-transcription-terms", "rights_legal", "transcription_terms_and_attribution"],
  ["rights-03-carrier-notices", "rights_legal", "carrier_notice_applicability"],
  ["rights-04-redistribution", "rights_legal", "redistribution_and_legal_disposition"],
  ["domain-01-month-command", "dtt_domain_expert", "month_command_relevance_and_scope"],
  ["domain-02-independent-disposition", "dtt_domain_expert", "independent_opinions_and_disagreement"]
].map(([itemId, roleId, subject]) => Object.freeze({
  itemId,
  roleId,
  subject,
  responseRefs: Object.freeze([]),
  attestationRefs: Object.freeze([]),
  status: "open_unreviewed"
})));

const DOMAIN_ITEM_IDS = Object.freeze([
  "domain-01-month-command",
  "domain-02-independent-disposition"
]);

const DOMAIN_SEAT_ITEM_RESPONSE_REQUIREMENTS = Object.freeze(
  ["domain-expert-a", "domain-expert-b"].flatMap((seatId) =>
    DOMAIN_ITEM_IDS.map((itemId) => Object.freeze({
      seatId,
      itemId,
      principalId: null,
      responseRefs: Object.freeze([]),
      attestationRefs: Object.freeze([]),
      status: "required_unassigned_unanswered"
    })))
);

const DOES_NOT_ESTABLISH = Object.freeze([
  "source_body_or_quote_text",
  "exact_facsimile_collation_or_bibliographic_identity",
  "work_edition_transcription_or_carrier_rights",
  "notice_applicability_or_legal_conclusion",
  "formal_source_rights_source_carrier_or_knowledge_document",
  "binding_freeze_or_content_truth",
  "reviewer_identity_credential_scope_or_independence",
  "expert_opinion_expert_truth_or_dtt_authority",
  "cross_file_atomic_snapshot_interval_integrity_or_aba_exclusion",
  "release_readiness_public_deployment_or_expert_claims_authority"
]);

export class BaziDttMonthCommandThreeRoleReviewPacketError extends Error {
  constructor(code, message, cause) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "BaziDttMonthCommandThreeRoleReviewPacketError";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new BaziDttMonthCommandThreeRoleReviewPacketError(code, message, cause);
}

function canonicalStringify(value) {
  const active = new WeakSet();
  let nodes = 0;
  function visit(current, depth) {
    if (depth > 64 || ++nodes > 200_000) fail("NON_PASSIVE_JSON", "JSON exceeds fixed structural limits.");
    if (current === null || typeof current === "boolean" || typeof current === "string") {
      return JSON.stringify(current);
    }
    if (typeof current === "number") {
      if (!Number.isFinite(current) || Object.is(current, -0)) fail("NON_JSON_NUMBER", "Numbers must be finite and not -0.");
      return JSON.stringify(current);
    }
    if (typeof current !== "object" || utilTypes.isProxy(current)) {
      fail("NON_PASSIVE_JSON", "Only passive JSON objects are accepted.");
    }
    if (active.has(current)) fail("ALIASED_OR_CYCLIC_JSON", "Aliased or cyclic objects are rejected.");
    active.add(current);
    const array = Array.isArray(current);
    const prototype = Object.getPrototypeOf(current);
    if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) {
      fail("NON_CANONICAL_PROTOTYPE", "Custom prototypes are rejected.");
    }
    const descriptors = Object.getOwnPropertyDescriptors(current);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== "string")) fail("NON_JSON_KEY", "Symbol keys are rejected.");
    let output;
    if (array) {
      const length = descriptors.length?.value;
      if (!Number.isSafeInteger(length) || length < 0 || keys.length !== length + 1) {
        fail("NON_CANONICAL_ARRAY", "Arrays must be dense and without extra properties.");
      }
      const parts = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
          fail("NON_PASSIVE_JSON", "Array entries must be enumerable data properties.");
        }
        parts.push(visit(descriptor.value, depth + 1));
      }
      output = `[${parts.join(",")}]`;
    } else {
      keys.sort();
      const parts = [];
      for (const key of keys) {
        const descriptor = descriptors[key];
        if (!("value" in descriptor) || descriptor.enumerable !== true) {
          fail("NON_PASSIVE_JSON", "Object fields must be enumerable data properties.");
        }
        parts.push(`${JSON.stringify(key)}:${visit(descriptor.value, depth + 1)}`);
      }
      output = `{${parts.join(",")}}`;
    }
    active.delete(current);
    return output;
  }
  return visit(value, 0);
}

function cloneJson(value) {
  return JSON.parse(canonicalStringify(value));
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function exact(actual, expected, label, code = "SEMANTIC_MISMATCH") {
  if (canonicalStringify(actual) !== canonicalStringify(expected)) fail(code, `${label} drifted.`);
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function rawIdentity(pin) {
  return { path: pin.path, bytes: pin.rawBytes, sha256: pin.rawSha256 };
}

function assertSnapshot(snapshot, pin) {
  if (snapshot.path !== pin.path || snapshot.rawBytes !== pin.rawBytes || snapshot.rawSha256 !== pin.rawSha256) {
    fail("RAW_IDENTITY_MISMATCH", `${pin.role} raw identity drifted.`);
  }
}

function assertSemanticPin(value, pin) {
  if (value?.[pin.semanticIdField] !== pin.semanticId
    || value?.[pin.semanticDigestField] !== pin.semanticDigest) {
    fail("SEMANTIC_IDENTITY_MISMATCH", `${pin.role} semantic identity drifted.`);
  }
}

function assertFalse(value, label) {
  if (value !== false) fail("AUTHORITY_PROMOTION_FORBIDDEN", `${label} must remain false.`);
}

function assertZero(value, label) {
  if (value !== 0 || Object.is(value, -0)) fail("ZERO_GATE_DRIFT", `${label} must remain exact +0.`);
}

function selectOne(values, predicate, label) {
  const selected = values.filter(predicate);
  if (selected.length !== 1) fail("SUBJECT_REEXTRACTION_FAILED", `${label} must resolve exactly once.`);
  return selected[0];
}

function validateSource(source) {
  assertSemanticPin(source, PINS.source);
  if (computeLedgerDigest(source) !== source.ledgerDigest) fail("SOURCE_DIGEST_MISMATCH", "Source ledger digest does not recompute.");
  if (source.schemaVersion !== "1.7.0" || source.recordType !== "bazi_strength_source_binding_candidate_ledger") {
    fail("SOURCE_STRUCTURE_MISMATCH", "Source v1.7 envelope drifted.");
  }
  const candidate = selectOne(source.candidates, (entry) => entry.bindingId === SUBJECT.bindingId, "DTT source candidate");
  if (candidate.candidateId !== SUBJECT.sourceCandidateId
    || candidate.candidateDigest !== SUBJECT.sourceCandidateDigest
    || computeCandidateDigest(candidate) !== candidate.candidateDigest
    || candidate.evidenceSubjectId !== SUBJECT.evidenceSubjectId
    || candidate.sourceId !== SUBJECT.sourceId) {
    fail("SOURCE_SUBJECT_MISMATCH", "DTT source candidate identity or digest drifted.");
  }
  const quote = selectOne(candidate.quoteCandidates,
    (entry) => entry.quoteCandidateId === SUBJECT.quoteCandidateId, "DTT month-command quote locator");
  if (quote.quoteTextStored !== false || !SHA256.test(quote.quoteSha256)) {
    fail("PLAINTEXT_OR_DIGEST_BOUNDARY", "Month-command evidence must remain hash/locator-only.");
  }
  const collations = candidate.facsimileCollationCandidates.filter(
    (entry) => entry.quoteCandidateId === SUBJECT.quoteCandidateId
  );
  if (collations.length !== 2) fail("COLLATION_INVENTORY_MISMATCH", "Exactly two month-command collation candidates are required.");
  for (const collation of collations) {
    if (collation.exactGlyphSequenceEqual !== false
      || collation.carrierTextStored !== false
      || collation.repositoryInspectionDerivativeStored !== false
      || collation.rightsEffect !== "none"
      || collation.bindingFreezeEffect !== "none"
      || collation.humanCollatorAttestations?.length !== 0
      || collation.domainExpertReviewIds?.length !== 0
      || !SHA256.test(collation.collationDigest)) {
      fail("COLLATION_PROMOTION_FORBIDDEN", "Normalized collation candidates remain non-exact, vacant, and authority-free.");
    }
  }
  if (source.accessBoundary?.sourceBodiesStored !== false
    || source.accessBoundary?.quoteTextsStored !== false
    || source.facsimileAccessBoundary?.repositoryCarrierFilesStored !== false
    || source.facsimileAccessBoundary?.repositoryPageImagesStored !== false
    || candidate.rightsObservation?.rightsReviewAttestations?.length !== 0
    || candidate.rightsObservation?.legalConclusion !== "not_established") {
    fail("SOURCE_STORAGE_OR_AUTHORITY_DRIFT", "Source storage/review boundary drifted.");
  }
  return { candidate, quote, collations };
}

function validateRights(rights, source) {
  assertSemanticPin(rights, PINS.rights);
  if (computeRightsCandidateLedgerDigest(rights) !== rights.ledgerDigest) {
    fail("RIGHTS_DIGEST_MISMATCH", "Rights ledger digest does not recompute.");
  }
  if (rights.schemaVersion !== "1.3.0" || rights.recordType !== "bazi_strength_source_rights_candidate_ledger") {
    fail("RIGHTS_STRUCTURE_MISMATCH", "Rights v1.3 envelope drifted.");
  }
  if (rights.sourceBindingLedger?.path !== PINS.source.path
    || rights.sourceBindingLedger?.ledgerId !== source.ledgerId
    || rights.sourceBindingLedger?.ledgerDigest !== source.ledgerDigest) {
    fail("SOURCE_RIGHTS_LINK_MISMATCH", "Rights v1.3 does not bind source v1.7 exactly.");
  }
  const candidate = selectOne(rights.candidates, (entry) => entry.bindingId === SUBJECT.bindingId, "DTT rights candidate");
  if (candidate.rightsCandidateId !== SUBJECT.rightsCandidateId
    || candidate.sourceCandidateId !== SUBJECT.sourceCandidateId
    || candidate.candidateDigest !== SUBJECT.rightsCandidateDigest
    || computeRightsCandidateDigest(candidate) !== candidate.candidateDigest
    || candidate.sourceId !== SUBJECT.sourceId) {
    fail("RIGHTS_SUBJECT_MISMATCH", "DTT rights candidate identity or digest drifted.");
  }
  const emptyReviewerArrays = [
    candidate.workLayer?.legalReviewerIds,
    candidate.transcriptionLayer?.rightsReviewerIds,
    ...candidate.carrierLayers.map((entry) => entry.rightsReviewerIds),
    candidate.decision?.reviewAttestations
  ];
  if (emptyReviewerArrays.some((entry) => !Array.isArray(entry) || entry.length !== 0)
    || candidate.decision?.knowledgeDocumentCreated !== false
    || candidate.decision?.formalSourceRightsRecordCreated !== false
    || candidate.decision?.formalSourceCarrierRecordCreated !== false
    || candidate.decision?.workLayerCleared !== false
    || candidate.decision?.editionLayerCleared !== false
    || candidate.decision?.carrierLayerCleared !== false
    || candidate.decision?.legalConclusion !== "not_established"
    || candidate.decision?.distributionPolicy !== "link_only") {
    fail("RIGHTS_PROMOTION_FORBIDDEN", "DTT rights candidate must remain vacant, uncleared, and link-only.");
  }
  return candidate;
}

function validateReconciliation(reconciliation, sourceCandidate, rightsCandidate) {
  assertSemanticPin(reconciliation, PINS.reconciliation);
  if (computeBaziDttNoticeReconciliationV2Digest(reconciliation) !== reconciliation.reconciliationDigest) {
    fail("RECONCILIATION_DIGEST_MISMATCH", "DTT reconciliation v2 digest does not recompute.");
  }
  if (reconciliation.schemaVersion !== "2.0.0"
    || reconciliation.recordType !== "bazi_dtt_notice_reconciliation_overlay_v2") {
    fail("RECONCILIATION_STRUCTURE_MISMATCH", "DTT reconciliation v2 envelope drifted.");
  }
  exact(reconciliation.subjectLock, {
    bindingId: SUBJECT.bindingId,
    evidenceSubjectId: SUBJECT.evidenceSubjectId,
    sourceId: SUBJECT.sourceId,
    sourceCandidateId: SUBJECT.sourceCandidateId,
    rightsCandidateId: SUBJECT.rightsCandidateId,
    affectedAnchorIds: [
      "dtt-chanwei-ssid-11335994-pages-170-176-facsimile-v1",
      "dtt-chanwei-cadal-07005210-pages-178-184-facsimile-v1"
    ]
  }, "reconciliation subject lock");
  if (reconciliation.currentCandidateParents?.sourceBinding?.candidateDigest !== sourceCandidate.candidateDigest
    || reconciliation.currentCandidateParents?.sourceRights?.candidateDigest !== rightsCandidate.candidateDigest
    || reconciliation.reconciliationDecision?.candidateProjectionResolved !== true
    || reconciliation.reconciliationDecision?.candidateNoticeProjectionReconciliationPassed !== true
    || reconciliation.reconciliationDecision?.formalAdmissionPromotionBlocked !== true
    || reconciliation.reconciliationDecision?.promotionBlocked !== true
    || reconciliation.reconciliationDecision?.activeAdmissionEffect !== "none"
    || reconciliation.noticeProjection?.noticeApplicabilityEstablished !== false
    || reconciliation.noticeProjection?.legalConclusion !== "not_established") {
    fail("RECONCILIATION_BOUNDARY_MISMATCH", "Reconciliation v2 candidate-only boundary drifted.");
  }
  for (const key of ["contentTruthEstablished", "baziRuleTruthEstablished", "sourceBundleComplete",
    "rightsBundleComplete", "expertReviewBundleComplete", "expertTruthEstablished",
    "rightsLegalConclusionEstablished", "releaseReady", "publicDeploymentAuthorized", "expertClaimsAuthorized"]) {
    assertFalse(reconciliation.authorityBoundary?.[key], `reconciliation.${key}`);
  }
}

function fixedRevisionUrl(carrierFileTitle, revisionId) {
  if (typeof carrierFileTitle !== "string" || !Number.isSafeInteger(revisionId) || revisionId <= 0) {
    fail("PUBLIC_EVIDENCE_FIXED_REVISION_INVALID", "Fixed Commons revision title/id is invalid.");
  }
  return `https://commons.wikimedia.org/w/index.php?title=${encodeURIComponent(carrierFileTitle)}&oldid=${revisionId}`;
}

function assertFixedRevisionUrl(value, carrierFileTitle, revisionId) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch (cause) {
    fail("PUBLIC_EVIDENCE_FIXED_REVISION_URL_INVALID", "Fixed Commons revision URL is invalid.", cause);
  }
  if (parsed.protocol !== "https:" || parsed.hostname !== "commons.wikimedia.org"
    || parsed.pathname !== "/w/index.php"
    || parsed.searchParams.get("title") !== carrierFileTitle
    || parsed.searchParams.get("oldid") !== String(revisionId)
    || [...parsed.searchParams.keys()].sort().join(",") !== "oldid,title") {
    fail("PUBLIC_EVIDENCE_FIXED_REVISION_URL_INVALID",
      "Fixed Commons revision URL must bind exactly one title and matching oldid.");
  }
}

function validatePublicEvidence(evidence, capability, sourceSelection) {
  assertSemanticPin(evidence, PINS.publicEvidence);
  if (!isVerifiedBaziDttMonthCommandPublicEvidence(capability)) {
    fail("PUBLIC_EVIDENCE_PRIVATE_BRAND_REQUIRED", "The current public-evidence full-loader private brand is required.");
  }
  if (computeBaziDttMonthCommandPublicEvidenceDigest(evidence) !== evidence.observationDigest) {
    fail("PUBLIC_EVIDENCE_DIGEST_MISMATCH", "Public-evidence digest does not recompute.");
  }
  if (evidence.schemaVersion !== "1.0.0"
    || evidence.recordType !== "bazi_dtt_month_command_public_evidence_observation_v1"
    || evidence.subjectLock?.bindingId !== SUBJECT.bindingId
    || evidence.subjectLock?.evidenceSubjectId !== SUBJECT.evidenceSubjectId
    || evidence.subjectLock?.selectedQuoteCandidate?.quoteCandidateId !== SUBJECT.quoteCandidateId
    || evidence.subjectLock?.selectedQuoteCandidate?.quoteTextStored !== false) {
    fail("PUBLIC_EVIDENCE_STRUCTURE_MISMATCH", "Public-evidence subject structure drifted.");
  }
  exact(capability.observationArtifact, {
    path: PINS.publicEvidence.path,
    rawBytes: PINS.publicEvidence.rawBytes,
    rawSha256: PINS.publicEvidence.rawSha256
  }, "public-evidence full-loader raw identity");
  if (capability.observationId !== evidence.observationId
    || capability.observationDigest !== evidence.observationDigest
    || capability.bindingFrozenVerified !== 0 || capability.bindingRequired !== 12
    || capability.independentExpertReviewsVerified !== 0
    || capability.independentExpertReviewsRequired !== 2
    || capability.releaseReady !== false || capability.publicDeploymentAuthorized !== false
    || capability.expertClaimsAuthorized !== false) {
    fail("PUBLIC_EVIDENCE_CAPABILITY_MISMATCH", "Public-evidence capability projection drifted.");
  }
  if (!Array.isArray(evidence.carrierObservations) || evidence.carrierObservations.length !== 2) {
    fail("PUBLIC_EVIDENCE_CARRIER_COUNT_MISMATCH", "Exactly two public-evidence carrier observations are required.");
  }
  const projections = sourceSelection.collations.map((collation) => {
    const observation = selectOne(evidence.carrierObservations,
      (entry) => entry.anchorId === collation.anchorId, `public evidence ${collation.anchorId}`);
    if (observation.selectedCollationCandidateId !== collation.collationCandidateId
      || observation.selectedCollationDigest !== collation.collationDigest
      || observation.repositoryCarrierFileStored !== false
      || observation.repositoryPageImageStored !== false
      || !Number.isSafeInteger(observation.fixedFilePageRevisionId)
      || observation.fixedFilePageRevisionId <= 0
      || typeof observation.fixedFilePageRevisionTimestamp !== "string"
      || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(observation.fixedFilePageRevisionTimestamp)
      || !SHA256.test(observation.fixedFilePageMainSlotSha256)) {
      fail("PUBLIC_EVIDENCE_CARRIER_MISMATCH", "Fixed carrier observation identity or collation link drifted.");
    }
    const dynamicUrl = new URL(observation.carrierDescriptionUrl);
    if (dynamicUrl.protocol !== "https:" || dynamicUrl.hostname !== "commons.wikimedia.org"
      || dynamicUrl.searchParams.has("oldid")) {
      fail("PUBLIC_EVIDENCE_DYNAMIC_URL_INVALID", "Description URL must remain dynamic and without oldid.");
    }
    const revisionUrl = fixedRevisionUrl(
      observation.carrierFileTitle,
      observation.fixedFilePageRevisionId
    );
    assertFixedRevisionUrl(revisionUrl, observation.carrierFileTitle, observation.fixedFilePageRevisionId);
    return {
      anchorId: observation.anchorId,
      carrierFileTitle: observation.carrierFileTitle,
      dynamicDescriptionUrl: observation.carrierDescriptionUrl,
      dynamicDescriptionUrlRole: "discovery_only_not_fixed_rights_evidence",
      dynamicDescriptionUrlCountsAsFixedRightsEvidence: false,
      fixedFilePageRevisionId: observation.fixedFilePageRevisionId,
      fixedFilePageRevisionUrl: revisionUrl,
      fixedFilePageRevisionUrlDerivation:
        "derived_from_public_evidence_carrier_file_title_and_fixed_revision_id",
      fixedFilePageRevisionUrlOldidMatchesRevisionId: true,
      fixedFilePageRevisionTimestamp: observation.fixedFilePageRevisionTimestamp,
      fixedFilePageMainSlotSha256: observation.fixedFilePageMainSlotSha256,
      fixedRevisionEvidenceRole: "revision_specific_observation_locator_not_rights_or_legal_clearance"
    };
  });
  return projections;
}

function validateReadiness(readiness, capability) {
  assertSemanticPin(readiness, PINS.readiness);
  if (!isVerifiedBaziKnowledgeCoreIdentityReboundBindingReadiness(capability)) {
    fail("READINESS_PRIVATE_BRAND_REQUIRED", "The current v1.9 full-loader private brand is required.");
  }
  if (computeBaziKnowledgeCoreIdentityReboundBindingReadinessDigest(readiness) !== readiness.ledgerDigest) {
    fail("READINESS_DIGEST_MISMATCH", "Readiness v1.9 digest does not recompute.");
  }
  for (const pin of [PINS.source, PINS.rights, PINS.reconciliation]) {
    const basis = selectOne(readiness.basisArtifacts, (entry) => entry.path === pin.path, `${pin.role} readiness basis`);
    exact(basis, rawIdentity(pin), `${pin.role} readiness basis identity`);
  }
  const binding = selectOne(readiness.bindings, (entry) => entry.bindingId === SUBJECT.bindingId, "readiness DTT binding");
  if (binding.evidenceSubjectId !== SUBJECT.evidenceSubjectId
    || binding.candidateIds?.length !== 1 || binding.candidateIds[0] !== SUBJECT.sourceCandidateId
    || binding.freezeState !== "candidate_only_unbound"
    || binding.exactQuoteTextStored !== false
    || binding.independentDomainReviewIds?.length !== 0
    || binding.independentSourceRightsReviewerIds?.length !== 0) {
    fail("READINESS_DTT_BINDING_MISMATCH", "Readiness DTT row drifted.");
  }
  assertZero(readiness.gateSummary?.bindingFrozenVerified, "bindingFrozenVerified");
  if (readiness.gateSummary?.bindingRequired !== 12) fail("READINESS_COUNT_MISMATCH", "bindingRequired must remain 12.");
  assertZero(readiness.gateSummary?.independentDomainReviewsVerified, "independentDomainReviewsVerified");
  assertZero(readiness.gateSummary?.rightsLegalReviewCount, "rightsLegalReviewCount");
  for (const key of ["sourceBundleComplete", "rightsBundleComplete", "expertReviewBundleComplete", "releaseReady"]) {
    assertFalse(readiness.gateSummary?.[key], `readiness.${key}`);
  }
  if (capability.ledgerId !== readiness.ledgerId || capability.ledgerDigest !== readiness.ledgerDigest
    || capability.bindingRequired !== 12 || capability.bindingFrozenVerified !== 0
    || capability.domainExpertReviewCount !== 0 || capability.rightsLegalReviewCount !== 0
    || capability.releaseIdentity !== "legacy-v13" || capability.targetSchema !== 13
    || capability.migrationId !== null || capability.releaseReady !== false
    || capability.publicDeploymentAuthorized !== false || capability.expertClaimsAuthorized !== false) {
    fail("READINESS_CAPABILITY_MISMATCH", "Readiness v1.9 capability projection drifted.");
  }
  return binding;
}

function basisArtifact(pin) {
  const currentPrivateBrandConsumed = pin === PINS.readiness || pin === PINS.publicEvidence;
  return {
    role: pin.role,
    path: pin.path,
    bytes: pin.rawBytes,
    sha256: pin.rawSha256,
    semanticIdField: pin.semanticIdField,
    semanticId: pin.semanticId,
    semanticDigestField: pin.semanticDigestField,
    semanticDigest: pin.semanticDigest,
    privateBrandConsumed: currentPrivateBrandConsumed,
    verificationMode: currentPrivateBrandConsumed
      ? "exact_raw_semantic_and_current_full_loader_private_brand"
      : "exact_raw_digest_and_structural_reextraction_no_stale_private_brand"
  };
}

function quoteLocatorProjection(quote) {
  return {
    quoteCandidateId: quote.quoteCandidateId,
    conceptualTopics: cloneJson(quote.conceptualTopics),
    heading: quote.heading,
    rawRevisionLineStart: quote.rawRevisionLineStart,
    rawRevisionLineEnd: quote.rawRevisionLineEnd,
    rawCharacterStartZeroBased: quote.rawCharacterStartZeroBased,
    rawCharacterEndExclusive: quote.rawCharacterEndExclusive,
    quoteCharacters: quote.quoteCharacters,
    quoteUtf8Bytes: quote.quoteUtf8Bytes,
    quoteSha256: quote.quoteSha256,
    quoteOccurrenceInRawRevision: quote.quoteOccurrenceInRawRevision,
    quoteTextStored: false
  };
}

function carrierLocatorProjection(sourceCandidate, collation) {
  const anchor = selectOne(sourceCandidate.facsimileAnchors,
    (entry) => entry.anchorId === collation.anchorId, `carrier ${collation.anchorId}`);
  const page = selectOne(anchor.pageRefs,
    (entry) => entry.pageRefId === collation.pageRefId, `page ${collation.pageRefId}`);
  return {
    anchorId: anchor.anchorId,
    provider: anchor.provider,
    carrierFilePageId: anchor.carrierFilePageId,
    carrierFileTitle: anchor.carrierFileTitle,
    carrierDescriptionUrl: anchor.carrierDescriptionUrl,
    carrierMediaWikiSha1: anchor.carrierMediaWikiSha1,
    carrierSha256: anchor.carrierSha256,
    carrierBytes: anchor.carrierBytes,
    carrierPageCount: anchor.carrierPageCount,
    carrierMime: anchor.carrierMime,
    storagePolicy: anchor.storagePolicy,
    pageLocator: {
      pageRefId: page.pageRefId,
      scanPageNumber: page.scanPageNumber,
      printedPageLabel: page.printedPageLabel,
      visibleHeading: page.visibleHeading,
      pageUrl: page.pageUrl
    },
    collationCandidate: {
      collationCandidateId: collation.collationCandidateId,
      collationDigest: collation.collationDigest,
      transcriptionQuoteSha256: collation.transcriptionQuoteSha256,
      carrierGlyphSequenceSha256: collation.carrierGlyphSequenceSha256,
      transcriptionGlyphSequenceSha256: collation.transcriptionGlyphSequenceSha256,
      normalizedSequenceSha256: collation.normalizedSequenceSha256,
      normalizedSequenceCharacters: collation.normalizedSequenceCharacters,
      exactGlyphSequenceEqual: false,
      humanCollatorAttestations: [],
      domainExpertReviewIds: [],
      rightsEffect: "none",
      bindingFreezeEffect: "none"
    }
  };
}

function rightsCarrierLayerProjection(layer, fixedCarrierRevisionProjections) {
  const fixed = selectOne(
    fixedCarrierRevisionProjections,
    (entry) => entry.anchorId === layer.anchorId,
    `fixed rights-review carrier ${layer.anchorId}`
  );
  if (layer.carrierDescriptionUrl !== fixed.dynamicDescriptionUrl
    || !Array.isArray(layer.evidenceRefs)
    || !layer.evidenceRefs.includes(layer.carrierDescriptionUrl)) {
    fail("RIGHTS_FIXED_CARRIER_CROSSWALK_MISMATCH",
      "Rights carrier dynamic discovery fields do not match the fixed public-evidence anchor.");
  }
  assertFixedRevisionUrl(
    fixed.fixedFilePageRevisionUrl,
    fixed.carrierFileTitle,
    fixed.fixedFilePageRevisionId
  );
  return {
    anchorId: layer.anchorId,
    carrierFilePageId: layer.carrierFilePageId,
    dynamicCarrierDescriptionUrl: layer.carrierDescriptionUrl,
    dynamicCarrierDescriptionUrlRole: "discovery_only_not_fixed_rights_evidence",
    dynamicCarrierDescriptionUrlCountsAsFixedRightsEvidence: false,
    dynamicEvidenceRefs: cloneJson(layer.evidenceRefs),
    dynamicEvidenceRefsRole: "discovery_and_policy_context_only_not_fixed_carrier_rights_evidence",
    dynamicEvidenceRefsCountAsFixedRightsEvidence: false,
    carrierMediaWikiSha1: layer.carrierMediaWikiSha1,
    carrierSha256: layer.carrierSha256,
    fixedFilePageRevisionId: fixed.fixedFilePageRevisionId,
    fixedFilePageRevisionUrl: fixed.fixedFilePageRevisionUrl,
    fixedFilePageRevisionTimestamp: fixed.fixedFilePageRevisionTimestamp,
    fixedFilePageMainSlotSha256: fixed.fixedFilePageMainSlotSha256,
    fixedRevisionEvidenceRole: "fixed_revision_locator_for_rights_review_not_rights_or_legal_clearance",
    fixedRevisionCountsAsRightsClearance: false,
    noticeState: layer.noticeState,
    status: layer.status
  };
}

function buildExpectedPacket(bundle) {
  const { source, rights, reconciliation, readiness, readinessCapability, publicEvidence,
    sourceSelection, rightsCandidate, readinessBinding, fixedCarrierRevisionProjections } = bundle;
  const sourceCandidate = sourceSelection.candidate;
  exact(
    rightsCandidate.carrierLayers.map((entry) => entry.anchorId).sort(),
    fixedCarrierRevisionProjections.map((entry) => entry.anchorId).sort(),
    "rights/public-evidence fixed carrier one-to-one crosswalk",
    "RIGHTS_FIXED_CARRIER_CROSSWALK_MISMATCH"
  );
  const packet = {
    schemaVersion: "1.0.0",
    recordType: "bazi_dtt_month_command_three_role_review_packet_candidate_v1",
    packetId: PACKET_ID,
    status: "append_only_candidate_packet_vacant_no_authority",
    createdAt: CREATED_AT,
    releaseGovernance: {
      activeLine: readinessCapability.releaseIdentity,
      targetSchema: readinessCapability.targetSchema,
      migrationId: readinessCapability.migrationId,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    appendOnlyBoundary: {
      candidateOnly: true,
      existingArtifactMutationAllowed: false,
      supersedes: null,
      supersededBy: null,
      futureResponsesAndAttestationsMustBeSeparateAppendOnlyRecords: true,
      packetPresencePromotesAdmissionOrAuthority: false
    },
    basisArtifacts: [
      PINS.source,
      PINS.rights,
      PINS.reconciliation,
      PINS.readiness,
      PINS.publicEvidence
    ].map(basisArtifact),
    subjectLock: cloneJson(SUBJECT),
    lineageBoundary: {
      reconciliationV2CandidateParents: cloneJson(reconciliation.currentCandidateParents),
      reconciliationV2ParentsRewrittenToV17OrV13: false,
      dttSourceCandidateCarriedForwardUnchangedInV17: sourceCandidate.candidateDigest
        === reconciliation.currentCandidateParents.sourceBinding.candidateDigest,
      dttRightsCandidateCarriedForwardUnchangedInV13: rightsCandidate.candidateDigest
        === reconciliation.currentCandidateParents.sourceRights.candidateDigest,
      currentLedgerIdentities: {
        sourceBindingLedgerId: source.ledgerId,
        sourceBindingLedgerDigest: source.ledgerDigest,
        sourceRightsLedgerId: rights.ledgerId,
        sourceRightsLedgerDigest: rights.ledgerDigest
      }
    },
    publicEvidenceProjection: {
      observationId: publicEvidence.observationId,
      observationDigest: publicEvidence.observationDigest,
      observationArtifact: rawIdentity(PINS.publicEvidence),
      dynamicDescriptionUrlsAreDiscoveryOnly: true,
      dynamicDescriptionUrlsCountAsFixedRightsEvidence: false,
      fixedRevisionUrlsStoredByPublicEvidence: false,
      fixedRevisionUrlsDerivedFromPublicEvidenceFields: true,
      fixedCarrierPageRevisions: cloneJson(fixedCarrierRevisionProjections)
    },
    sourceMaterialProjection: {
      storagePolicy: "existing_url_locator_digest_and_metadata_only",
      sourceBodiesStored: false,
      quoteTextsStored: false,
      carrierFilesStored: false,
      pageImagesStored: false,
      transcriptionCarrier: {
        provider: sourceCandidate.carrierIdentity.provider,
        pageId: sourceCandidate.carrierIdentity.pageId,
        pageTitle: sourceCandidate.carrierIdentity.pageTitle,
        permanentUrl: sourceCandidate.carrierIdentity.permanentUrl,
        revisionId: sourceCandidate.carrierIdentity.revisionId,
        parentRevisionId: sourceCandidate.carrierIdentity.parentRevisionId,
        revisionTimestamp: sourceCandidate.carrierIdentity.revisionTimestamp,
        mediaWikiSha1: sourceCandidate.carrierIdentity.mediaWikiSha1,
        contentModel: sourceCandidate.carrierIdentity.contentModel,
        contentFormat: sourceCandidate.carrierIdentity.contentFormat,
        storagePolicy: sourceCandidate.carrierIdentity.storagePolicy
      },
      quoteLocator: quoteLocatorProjection(sourceSelection.quote),
      carrierLocators: sourceSelection.collations.map(
        (collation) => carrierLocatorProjection(sourceCandidate, collation)
      )
    },
    rightsEvidenceProjection: {
      workLayer: {
        sourceUrl: rightsCandidate.workLayer.sourceUrl,
        pageSpecificNoticeObservation: rightsCandidate.workLayer.pageSpecificNoticeObservation,
        status: rightsCandidate.workLayer.status,
        jurisdictionAssessment: rightsCandidate.workLayer.jurisdictionAssessment,
        evidenceRefs: cloneJson(rightsCandidate.workLayer.evidenceRefs)
      },
      transcriptionLayer: {
        provider: rightsCandidate.transcriptionLayer.provider,
        pageId: rightsCandidate.transcriptionLayer.pageId,
        revisionId: rightsCandidate.transcriptionLayer.revisionId,
        termsPolicyIds: cloneJson(rightsCandidate.transcriptionLayer.termsPolicyIds),
        status: rightsCandidate.transcriptionLayer.status,
        evidenceRefs: cloneJson(rightsCandidate.transcriptionLayer.evidenceRefs)
      },
      carrierLayers: rightsCandidate.carrierLayers.map(
        (layer) => rightsCarrierLayerProjection(layer, fixedCarrierRevisionProjections)
      ),
      distributionPolicy: rightsCandidate.decision.distributionPolicy,
      legalConclusion: rightsCandidate.decision.legalConclusion
    },
    reconciliationProjection: {
      reconciliationId: reconciliation.reconciliationId,
      reconciliationDigest: reconciliation.reconciliationDigest,
      candidateProjectionResolved: true,
      candidateNoticeProjectionReconciliationPassed: true,
      formalAdmissionPromotionBlocked: true,
      promotionBlocked: true,
      activeAdmissionEffect: "none",
      distributionPolicy: "link_only",
      noticeApplicabilityEstablished: false,
      rightsLegalConclusionEstablished: false
    },
    readinessProjection: {
      ledgerId: readiness.ledgerId,
      ledgerDigest: readiness.ledgerDigest,
      bindingId: readinessBinding.bindingId,
      evidenceSubjectId: readinessBinding.evidenceSubjectId,
      bindingRequired: 12,
      bindingFrozenVerified: 0,
      independentDomainReviewsRequired: 2,
      independentDomainReviewsVerified: 0,
      rightsLegalReviewsVerified: 0,
      formalKnowledgeDocumentCount: 0,
      formalSourceRightsRecordCount: 0,
      formalSourceCarrierRecordCount: 0,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false,
      releaseReady: false
    },
    reviewProtocol: {
      roles: cloneJson(REVIEW_ROLES),
      seats: cloneJson(REVIEWER_SEATS),
      reviewItems: cloneJson(REVIEW_ITEMS),
      domainSeatItemResponseRequirements: cloneJson(DOMAIN_SEAT_ITEM_RESPONSE_REQUIREMENTS),
      domainPrincipalSeparation: {
        seatIds: ["domain-expert-a", "domain-expert-b"],
        requiredItemIdsPerSeat: cloneJson(DOMAIN_ITEM_IDS),
        eachSeatMustAnswerSameTwoItems: true,
        principalsMustBeDistinct: true,
        samePrincipalMayOccupyBothSeats: false,
        principalIds: [],
        principalAssignmentsOccupied: 0,
        principalDistinctnessVerified: false
      },
      samePacketAndQuestionSetRequired: true,
      domainOpinionsMustBeIndependent: true,
      originalsMustRemainImmutable: true,
      supplementsAndReconciliationMustBeSeparateRecords: true,
      automatedWinnerSelectionAllowed: false,
      unresolvedDisagreementDisposition: "defer_or_reject"
    },
    gateSummary: {
      reviewRolesDefined: 3,
      reviewerSeatsRequired: 4,
      reviewerSeatsOccupied: 0,
      reviewItemsRequired: 12,
      reviewItemsCompleted: 0,
      domainSeatItemRequirementsDefined: 4,
      domainSeatItemAssignmentsOccupied: 0,
      domainSeatItemCompletions: 0,
      bindingRequired: 12,
      bindingFrozenVerified: 0,
      independentDomainReviewsRequired: 2,
      independentDomainReviewsVerified: 0,
      bibliographicCollationReviewsVerified: 0,
      rightsLegalReviewsVerified: 0,
      formalAdmissionComplete: false,
      rightsCleared: false,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      releaseReady: false
    },
    authorityBoundary: {
      formalAdmissionAuthorized: false,
      rightsLegalConclusionEstablished: false,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    integrityBoundary: {
      stableSingleFileReadsUsed: true,
      sourceV17ExactRawDigestAndStructureReextracted: true,
      rightsV13ExactRawDigestAndStructureReextracted: true,
      reconciliationV2ExactRawDigestAndStructureReextracted: true,
      reconciliationV2StaleHistoricalPrivateBrandConsumed: false,
      readinessV19CurrentPrivateBrandConsumed: true,
      publicEvidenceV1CurrentPrivateBrandConsumed: true,
      callerSuppliedParentObjectsAcceptedAsAuthority: false,
      persistedPacketReloadRequiredForCapability: true,
      cloneOrSelfSignedObjectConfersCapability: false,
      packetDigestIsDigitalSignature: false,
      signerIdentityEstablished: false,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false
    },
    doesNotEstablish: cloneJson(DOES_NOT_ESTABLISH)
  };
  packet.packetDigest = computeBaziDttMonthCommandThreeRoleReviewPacketDigest(packet);
  return deepFreeze(packet);
}

function assertPersisted(persisted, expected) {
  if (persisted?.schemaVersion !== "1.0.0"
    || persisted?.recordType !== "bazi_dtt_month_command_three_role_review_packet_candidate_v1"
    || persisted?.packetId !== PACKET_ID
    || persisted?.status !== "append_only_candidate_packet_vacant_no_authority"
    || persisted?.createdAt !== CREATED_AT
    || !SHA256.test(persisted?.packetDigest ?? "")
    || persisted.packetDigest !== computeBaziDttMonthCommandThreeRoleReviewPacketDigest(persisted)) {
    fail("PACKET_IDENTITY_MISMATCH", "Persisted packet identity or self digest drifted.");
  }
  exact(persisted, expected, "persisted three-role packet", "PACKET_SEMANTIC_MISMATCH");
}

async function loadExpectedBundle(workspaceRoot) {
  const [readinessCapability, publicEvidenceCapability, sourceSnapshot, rightsSnapshot,
    reconciliationSnapshot, readinessSnapshot, publicEvidenceSnapshot] =
    await Promise.all([
      loadBaziKnowledgeCoreIdentityReboundBindingReadiness(workspaceRoot),
      loadBaziDttMonthCommandPublicEvidence(workspaceRoot),
      readBaziDttStableWorkspaceArtifact(workspaceRoot, PINS.source.path),
      readBaziDttStableWorkspaceArtifact(workspaceRoot, PINS.rights.path),
      readBaziDttStableWorkspaceArtifact(workspaceRoot, PINS.reconciliation.path),
      readBaziDttStableWorkspaceArtifact(workspaceRoot, PINS.readiness.path),
      readBaziDttStableWorkspaceArtifact(workspaceRoot, PINS.publicEvidence.path)
    ]);
  const snapshots = [
    sourceSnapshot,
    rightsSnapshot,
    reconciliationSnapshot,
    readinessSnapshot,
    publicEvidenceSnapshot
  ];
  const pins = [PINS.source, PINS.rights, PINS.reconciliation, PINS.readiness, PINS.publicEvidence];
  for (let index = 0; index < pins.length; index += 1) assertSnapshot(snapshots[index], pins[index]);
  const source = parseBaziDttStrictJsonArtifact(sourceSnapshot);
  const rights = parseBaziDttStrictJsonArtifact(rightsSnapshot);
  const reconciliation = parseBaziDttStrictJsonArtifact(reconciliationSnapshot);
  const readiness = parseBaziDttStrictJsonArtifact(readinessSnapshot);
  const publicEvidence = parseBaziDttStrictJsonArtifact(publicEvidenceSnapshot);
  const sourceSelection = validateSource(source);
  const rightsCandidate = validateRights(rights, source);
  validateReconciliation(reconciliation, sourceSelection.candidate, rightsCandidate);
  const readinessBinding = validateReadiness(readiness, readinessCapability);
  const fixedCarrierRevisionProjections = validatePublicEvidence(
    publicEvidence,
    publicEvidenceCapability,
    sourceSelection
  );
  const bundle = {
    source,
    rights,
    reconciliation,
    readiness,
    publicEvidence,
    readinessCapability,
    publicEvidenceCapability,
    sourceSelection,
    rightsCandidate,
    readinessBinding,
    fixedCarrierRevisionProjections,
    snapshots
  };
  bundle.packet = buildExpectedPacket(bundle);
  return Object.freeze(bundle);
}

export function computeBaziDttMonthCommandThreeRoleReviewPacketDigest(value) {
  const unsigned = cloneJson(value);
  delete unsigned.packetDigest;
  return sha256Bytes(Buffer.from(`${PACKET_DIGEST_DOMAIN}\u0000${canonicalStringify(unsigned)}`, "utf8"));
}

export function serializeBaziDttMonthCommandThreeRoleReviewPacket(value) {
  canonicalStringify(value);
  return `${JSON.stringify(value, null, 2)}\n`;
}

export async function buildBaziDttMonthCommandThreeRoleReviewPacket(workspaceRoot = process.cwd()) {
  return (await loadExpectedBundle(workspaceRoot)).packet;
}

export async function loadBaziDttMonthCommandThreeRoleReviewPacket(workspaceRoot = process.cwd()) {
  const expected = await loadExpectedBundle(workspaceRoot);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    BAZI_DTT_MONTH_COMMAND_THREE_ROLE_REVIEW_PACKET_RELATIVE_PATH
  );
  assertSnapshot(snapshot, PACKET_RAW_IDENTITY);
  const persisted = parseBaziDttStrictJsonArtifact(snapshot);
  assertPersisted(persisted, expected.packet);
  const result = deepFreeze({
    dttMonthCommandThreeRoleReviewPacketMechanicallyVerified: true,
    packetId: persisted.packetId,
    packetDigest: persisted.packetDigest,
    artifact: { path: snapshot.path, bytes: snapshot.rawBytes, sha256: snapshot.rawSha256 },
    sourceLedgerId: PINS.source.semanticId,
    sourceLedgerDigest: PINS.source.semanticDigest,
    rightsLedgerId: PINS.rights.semanticId,
    rightsLedgerDigest: PINS.rights.semanticDigest,
    reconciliationId: PINS.reconciliation.semanticId,
    reconciliationDigest: PINS.reconciliation.semanticDigest,
    readinessLedgerId: PINS.readiness.semanticId,
    readinessLedgerDigest: PINS.readiness.semanticDigest,
    publicEvidenceObservationId: PINS.publicEvidence.semanticId,
    publicEvidenceObservationDigest: PINS.publicEvidence.semanticDigest,
    reviewRolesDefined: 3,
    reviewerSeatsRequired: 4,
    reviewerSeatsOccupied: 0,
    reviewItemsCompleted: 0,
    reviewItemsRequired: 12,
    domainSeatItemRequirementsDefined: 4,
    domainSeatItemAssignmentsOccupied: 0,
    domainSeatItemCompletions: 0,
    bindingFrozenVerified: 0,
    bindingRequired: 12,
    independentDomainReviewsVerified: 0,
    independentDomainReviewsRequired: 2,
    formalAdmissionAuthorized: false,
    rightsLegalConclusionEstablished: false,
    contentTruthEstablished: false,
    expertTruthEstablished: false,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false,
    releaseIdentity: "legacy-v13",
    targetSchema: 13,
    migrationId: null
  });
  VERIFIED_RESULTS.add(result);
  return result;
}

export function isVerifiedBaziDttMonthCommandThreeRoleReviewPacket(value) {
  return value !== null && typeof value === "object" && VERIFIED_RESULTS.has(value);
}

export const baziDttMonthCommandThreeRoleReviewPacketTestOnly = Object.freeze({
  PACKET_RAW_IDENTITY,
  PINS,
  SUBJECT,
  REVIEW_ROLES,
  REVIEWER_SEATS,
  REVIEW_ITEMS,
  DOMAIN_ITEM_IDS,
  DOMAIN_SEAT_ITEM_RESPONSE_REQUIREMENTS,
  DOES_NOT_ESTABLISH,
  canonicalStringify,
  cloneJson,
  fixedRevisionUrl,
  assertFixedRevisionUrl,
  assertPersisted,
  loadExpectedBundle
});
