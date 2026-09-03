import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  canonicalJson,
  computeCandidateDigest,
  computeFacsimileCollationCandidateDigest,
  computeLedgerDigest
} from "./bazi-source-binding-candidate-lib.mjs";
import {
  computeRightsCandidateDigest,
  computeRightsCandidateLedgerDigest
} from "./bazi-source-rights-candidate-lib.mjs";
import {
  baziDttVersionedParentSupersessionTestOnly,
  isVerifiedBaziDttVersionedParentSupersession,
  loadBaziDttVersionedParentSupersession,
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";

const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_NAMES = Object.getOwnPropertyNames;
const ARRAY_IS_ARRAY = Array.isArray;
const REFLECT_APPLY = Reflect.apply;
const WEAK_SET_HAS = WeakSet.prototype.has;
const WEAK_SET_ADD = WeakSet.prototype.add;
const NATIVE_WEAK_SET = WeakSet;
const BUFFER_EQUALS = Buffer.prototype.equals;
const BUFFER_FROM = Buffer.from;
const ARRAY_INCLUDES = Array.prototype.includes;
const ARRAY_PUSH = Array.prototype.push;
const CRYPTO_CREATE_HASH = createHash;
const HASH_PROTOTYPE = Object.getPrototypeOf(CRYPTO_CREATE_HASH("sha256"));
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;

export const SOURCE_SUPERSESSION_RELATIVE_PATH =
  "content/bazi-strength-source-binding-candidates.v1.7.0.json";
export const RIGHTS_SUPERSESSION_RELATIVE_PATH =
  "content/bazi-strength-source-rights-candidates.v1.3.0.json";
export const SUPERSESSION_RECEIPT_RELATIVE_PATH =
  "content/system-admission/bazi-smt-v10-versioned-parent-supersession.v1.json";

const CREATED_AT = "2026-08-30T23:19:43.506Z";
const SOURCE_LEDGER_ID = "hakimi.bazi.strength.source-binding-candidates/1.7.0";
const RIGHTS_LEDGER_ID = "hakimi.bazi.strength.source-rights-candidates/1.3.0";
const RECEIPT_ID = "hakimi.bazi.smt-v10-versioned-parent-supersession/1.0.0";
const OLD_SOURCE_CANDIDATE_ID = "smt-siku-v10-wikisource-r761703-candidate-v1";
const NEW_SOURCE_CANDIDATE_ID = "smt-siku-v10-wikisource-r761703-candidate-v2";
const OLD_RIGHTS_CANDIDATE_ID = "smt-siku-v10-wikisource-r761703-rights-candidate-v1";
const NEW_RIGHTS_CANDIDATE_ID = "smt-siku-v10-wikisource-r761703-rights-candidate-v2";
const ANCHOR_ID = "smt-v10-cadal-06056486-pages-3-4-facsimile-v1";

const HISTORICAL_SOURCE = OBJECT_FREEZE({
  path: "content/bazi-strength-source-binding-candidates.v1.6.0.json",
  rawBytes: 50427,
  rawSha256: "62f6a68b99246a802bcf2055aa09a8ac8113df37a7ede1c55d8a2ea64deaea98",
  ledgerId: "hakimi.bazi.strength.source-binding-candidates/1.6.0",
  ledgerDigest: "6f008058b282613fd131344206b27fccb1d80596bb49789f0554acdd69c1e44c",
  candidateId: OLD_SOURCE_CANDIDATE_ID,
  candidateDigest: "e726f93c6b8001a75c1ae58e17506976f970b483728f7f8ef21e37313981f92a"
});

const HISTORICAL_RIGHTS = OBJECT_FREEZE({
  path: "content/bazi-strength-source-rights-candidates.v1.2.0.json",
  rawBytes: 23947,
  rawSha256: "678632a8875672f58bb5c9f1ec4a299a4f0c6e750b8ff4a02bfe4df889e1243a",
  ledgerId: "hakimi.bazi.strength.source-rights-candidates/1.2.0",
  ledgerDigest: "300e092c4913885cff626221b8734786128639c7d6cfd7c2be7bea2acc6bbefc",
  candidateId: OLD_RIGHTS_CANDIDATE_ID,
  candidateDigest: "5ac820401e53d6268c0250232bb2de3c813f2fbe5ed7a05ff46200c7f72fca16"
});

const BINDING_READINESS = OBJECT_FREEZE({
  path: "content/system-admission/bazi-binding-freeze-requirements.v1.7.0.json",
  rawBytes: 32629,
  rawSha256: "7565a1c1ae51c09c78cf8f906e544bd8ee822020f76587237bc909ef1e6408a2",
  ledgerId: "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.7.0",
  ledgerDigest: "afdebfa1fb7a797f02d136373eb9aef1afa26b38b755926f8930ea5de97316b8"
});

const CARRIER_READINESS = OBJECT_FREEZE({
  path: "content/system-admission/bazi-source-carrier-record-readiness.v1.json",
  rawBytes: 27322,
  rawSha256: "d5624c796f715b3e4a9846714a036621a8ccc66d8e3433a91e7bf69beba291e9",
  ledgerId: "hakimi.bazi.source-carrier-record-readiness/1.0.0",
  ledgerDigest: "7b34f976c58b541895747177a2326af82241d76432acba3dbbd8fac2b68ad3c5"
});

const EXPECTED_NEW_SOURCE = OBJECT_FREEZE({
  path: SOURCE_SUPERSESSION_RELATIVE_PATH,
  rawBytes: 58579,
  rawSha256: "03bc334a507e224d8658cd2af5fe5d5a11e1db0553fa7e54bf1287010147ccd2",
  ledgerId: SOURCE_LEDGER_ID,
  ledgerDigest: "e705ef32eb2dc0d6651f314a6020b71c18070ba5b6702c6965b628d01f1ef5d9",
  candidateId: NEW_SOURCE_CANDIDATE_ID,
  candidateDigest: "2465b64080d4a9f0283212c994b1bd78ebe59ece26ed71e41601cc43a67d2d1d"
});

const EXPECTED_NEW_RIGHTS = OBJECT_FREEZE({
  path: RIGHTS_SUPERSESSION_RELATIVE_PATH,
  rawBytes: 25852,
  rawSha256: "8b26eea65e9ee3e7876298c3f720c46c43d5ec7d444ad4a4252116fc1dc21f17",
  ledgerId: RIGHTS_LEDGER_ID,
  ledgerDigest: "4b1183a85f1d2aeee537544a6b3711510406d98856a921730879c8a9ca782db1",
  candidateId: NEW_RIGHTS_CANDIDATE_ID,
  candidateDigest: "aed5031acb007b74092db96de4338d4148bc8518b4fb392cc59e18a0ba54295d"
});

const EXPECTED_RECEIPT = OBJECT_FREEZE({
  path: SUPERSESSION_RECEIPT_RELATIVE_PATH,
  rawBytes: 12256,
  rawSha256: "e44740e013b4182a2a2aa4125ceda67cbf3c071c5f36db54fcdd35b7b17217b5",
  supersessionId: RECEIPT_ID,
  supersessionDigest: "a30313260723bfa24eff2704cb0d1f108b6b6fdfbf5e67639b4285745159e6bd"
});

const WIKISOURCE = OBJECT_FREEZE({
  pageId: 260849,
  revisionId: 761703,
  parentRevisionId: 657383,
  revisionTimestamp: "2016-10-24T13:15:01Z",
  mediaWikiSha1: "43ac68d5e4a84bdfa98524557a8b3e9b3f1f8426",
  rawWikitextSha256: "0a20dc53a4156211b5c8ba89dbb6a8f07f056fde573e37699e28b021b6d026b6",
  permanentUrl: "https://zh.wikisource.org/w/index.php?title=%E4%B8%89%E5%91%BD%E9%80%9A%E6%9C%83_(%E5%9B%9B%E5%BA%AB%E5%85%A8%E6%9B%B8%E6%9C%AC)/%E5%8D%B710&oldid=761703"
});

const CADAL = OBJECT_FREEZE({
  filePageId: 85346504,
  fileTitle: "File:CADAL06056486 三命通會·卷十.djvu",
  descriptionUrl: "https://commons.wikimedia.org/wiki/File:CADAL06056486_%E4%B8%89%E5%91%BD%E9%80%9A%E6%9C%83%C2%B7%E5%8D%B7%E5%8D%81.djvu",
  fixedFilePageRevisionUrl: "https://commons.wikimedia.org/w/index.php?title=File%3ACADAL06056486_%E4%B8%89%E5%91%BD%E9%80%9A%E6%9C%83%C2%B7%E5%8D%B7%E5%8D%81.djvu&oldid=1207460960",
  fixedFilePageRevisionId: 1207460960,
  fixedFilePageParentRevisionId: 1104189925,
  fixedFilePageRevisionTimestamp: "2026-05-03T01:57:41Z",
  fixedFilePageRevisionMediaWikiSha1: "8f0179b677c342dc1f2a1ab1714a2679c543790d",
  fileTimestamp: "2019-12-28T15:03:00Z",
  fileMediaWikiSha1: "01e1cde49e92697abd4ec7c671e96c28f07e854c",
  carrierSha256: "d532196ef4aa46c747c2a703c7c47c5fdb9cfce9bea8a654a652d6657b4e6fbe",
  carrierBytes: 8321599,
  pageCount: 176,
  mime: "image/vnd.djvu",
  page3Url: "https://commons.wikimedia.org/w/index.php?title=File%3ACADAL06056486_%E4%B8%89%E5%91%BD%E9%80%9A%E6%9C%83%C2%B7%E5%8D%B7%E5%8D%81.djvu&oldid=1207460960&page=3",
  page4Url: "https://commons.wikimedia.org/w/index.php?title=File%3ACADAL06056486_%E4%B8%89%E5%91%BD%E9%80%9A%E6%9C%83%C2%B7%E5%8D%B7%E5%8D%81.djvu&oldid=1207460960&page=4",
  internetArchiveMetadataUrl: "https://archive.org/metadata/06056486.cn",
  internetArchiveRightsUrl: "https://help.archive.org/help/rights/"
});

const VERIFIED_RESULTS = new WeakSet();

export class BaziSmtV10VersionedParentSupersessionError extends Error {
  constructor(message) {
    super(message);
    this.name = "BaziSmtV10VersionedParentSupersessionError";
  }
}

function fail(message) {
  throw new BaziSmtV10VersionedParentSupersessionError(message);
}

function cloneJson(value) {
  return JSON_PARSE(JSON_STRINGIFY(value));
}

function sha256Bytes(bytes) {
  const hash = CRYPTO_CREATE_HASH("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [bytes]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function sha256Canonical(value) {
  const hash = CRYPTO_CREATE_HASH("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [canonicalJson(value), "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function serializeArtifact(value) {
  return REFLECT_APPLY(BUFFER_FROM, Buffer, [`${JSON_STRINGIFY(value, null, 2)}\n`, "utf8"]);
}

function computeReceiptDigest(receipt) {
  const unsigned = cloneJson(receipt);
  delete unsigned.supersessionDigest;
  return sha256Canonical(unsigned);
}

function findExactlyOne(entries, predicate, label) {
  if (!ARRAY_IS_ARRAY(entries)) fail(`${label} must be an array`);
  let match;
  let count = 0;
  for (let index = 0; index < entries.length; index += 1) {
    if (predicate(entries[index])) {
      match = entries[index];
      count += 1;
    }
  }
  if (count !== 1) fail(`${label} must contain exactly one match`);
  return match;
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) fail(`${label} mismatch`);
}

function assertCanonicalEqual(actual, expected, label) {
  if (canonicalJson(actual) !== canonicalJson(expected)) fail(`${label} mismatch`);
}

function appendUnique(values, additions) {
  const result = [...values];
  for (const value of additions) {
    if (!REFLECT_APPLY(ARRAY_INCLUDES, result, [value])) {
      REFLECT_APPLY(ARRAY_PUSH, result, [value]);
    }
  }
  return result;
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object"
    || REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const keys = OBJECT_GET_OWN_PROPERTY_NAMES(value);
  for (let index = 0; index < keys.length; index += 1) {
    deepFreeze(value[keys[index]], seen);
  }
  return OBJECT_FREEZE(value);
}

function artifactIdentity(path, bytes, semantic = {}) {
  return {
    path,
    rawBytes: bytes.byteLength,
    rawSha256: sha256Bytes(bytes),
    ...semantic
  };
}

function verifySnapshotIdentity(snapshot, expected, label) {
  assertEqual(snapshot.path, expected.path, `${label} path`);
  assertEqual(snapshot.rawBytes, expected.rawBytes, `${label} rawBytes`);
  assertEqual(snapshot.rawSha256, expected.rawSha256, `${label} rawSha256`);
}

function verifyExpectedBytes(snapshot, expectedBytes, label) {
  assertEqual(snapshot.rawBytes, expectedBytes.byteLength, `${label} rawBytes`);
  assertEqual(snapshot.rawSha256, sha256Bytes(expectedBytes), `${label} rawSha256`);
  if (!REFLECT_APPLY(BUFFER_EQUALS, snapshot.bytes, [expectedBytes])) {
    fail(`${label} raw bytes differ from the deterministic builder`);
  }
}

function buildCadalAnchor() {
  return {
    anchorId: ANCHOR_ID,
    anchorRole: "same_siku_label_visual_candidate_not_bibliographic_or_edition_identity_proof",
    provider: "Wikimedia Commons (CADAL carrier; Zhejiang University source credit)",
    carrierFilePageId: CADAL.filePageId,
    carrierFileTitle: CADAL.fileTitle,
    carrierDescriptionUrl: CADAL.descriptionUrl,
    carrierFileTimestamp: CADAL.fileTimestamp,
    carrierMediaWikiSha1: CADAL.fileMediaWikiSha1,
    carrierSha256: CADAL.carrierSha256,
    carrierBytes: CADAL.carrierBytes,
    carrierPageCount: CADAL.pageCount,
    carrierMime: CADAL.mime,
    licenseOrNoticeObserved: "commons_pd_old_and_public_domain_mark_observed_without_pd_scan_template_not_adjudicated",
    sourceProvenanceObservation: "shared_title_author_and_siku_label_only_no_shared_carrier_identifier_or_direct_derivation_chain",
    editionRelation: "siku_labeled_scan_with_two_local_passage_correspondences_not_independently_collated",
    comparisonScope: "visual_heading_and_passage_correspondence_only",
    exactCollationStatus: "not_performed",
    repositoryCarrierFileStored: false,
    repositoryPageImagesStored: false,
    storagePolicy: "link_only",
    pageRefs: [
      {
        pageRefId: "smt-v10-cadal-06056486-page-3",
        quoteCandidateIds: ["smt-v10-yueling-minimal-v1"],
        scanPageNumber: 3,
        printedPageLabel: null,
        visibleHeading: "看命口訣",
        pageUrl: CADAL.page3Url,
        pageId: null,
        pageRevisionId: null,
        pageRevisionTimestamp: null,
        pageMediaWikiSha1: null,
        pageTranscriptionQualityLevel: null,
        pageTranscriptionQualityState: "not_applicable_no_page_namespace_revision",
        correspondenceState: "visual_passage_correspondence_observed_not_collated"
      },
      {
        pageRefId: "smt-v10-cadal-06056486-page-4",
        quoteCandidateIds: ["smt-v10-tougan-minimal-v1"],
        scanPageNumber: 4,
        printedPageLabel: null,
        visibleHeading: null,
        pageUrl: CADAL.page4Url,
        pageId: null,
        pageRevisionId: null,
        pageRevisionTimestamp: null,
        pageMediaWikiSha1: null,
        pageTranscriptionQualityLevel: null,
        pageTranscriptionQualityState: "not_applicable_no_page_namespace_revision",
        correspondenceState: "visual_passage_correspondence_observed_not_collated"
      }
    ]
  };
}

function sealCollation(collation) {
  collation.collationDigest = computeFacsimileCollationCandidateDigest(collation);
  return collation;
}

function buildCadalCollations() {
  return [
    sealCollation({
      collationCandidateId: "smt-v10-yueling-cadal-06056486-page-3-normalized-collation-v1",
      anchorId: ANCHOR_ID,
      pageRefId: "smt-v10-cadal-06056486-page-3",
      quoteCandidateId: "smt-v10-yueling-minimal-v1",
      observedAt: CREATED_AT,
      method: "visual_character_comparison_of_rendered_public_scan_page",
      observerClass: "automated_agent_nonexpert_visual_inspection",
      carrierSha256: CADAL.carrierSha256,
      transcriptionQuoteSha256: "b7f2c66c97d311fe3e1b3d1048dddbbcdafd5e71cfd4454f0b40ae89c3d4a53f",
      carrierGlyphSequenceSha256: "a2dcb5a44deae965e6eec1926651a73a43b7bb5532385b03184efbd38507d029",
      transcriptionGlyphSequenceSha256: "b7f2c66c97d311fe3e1b3d1048dddbbcdafd5e71cfd4454f0b40ae89c3d4a53f",
      comparisonNormalization: "map_three_observed_glyph_variants_to_pinned_transcription_for_comparison_only",
      normalizedSequenceCharacters: 16,
      normalizedSequenceSha256: "b7f2c66c97d311fe3e1b3d1048dddbbcdafd5e71cfd4454f0b40ae89c3d4a53f",
      scriptVariantPairCount: 3,
      punctuationDifferenceObserved: false,
      exactGlyphSequenceEqual: false,
      result: "normalized_correspondence_observed_not_exact_transcription",
      humanCollatorAttestations: [],
      domainExpertReviewIds: [],
      rightsEffect: "none",
      bindingFreezeEffect: "none",
      carrierTextStored: false,
      repositoryInspectionDerivativeStored: false
    }),
    sealCollation({
      collationCandidateId: "smt-v10-tougan-cadal-06056486-page-4-exact-glyph-candidate-v1",
      anchorId: ANCHOR_ID,
      pageRefId: "smt-v10-cadal-06056486-page-4",
      quoteCandidateId: "smt-v10-tougan-minimal-v1",
      observedAt: CREATED_AT,
      method: "visual_character_comparison_of_rendered_public_scan_page",
      observerClass: "automated_agent_nonexpert_visual_inspection",
      carrierSha256: CADAL.carrierSha256,
      transcriptionQuoteSha256: "b652a600ae2db57b8035fb95c38c4fc67f45bd6cbf03e5b62ffbd5a6bbbcccee",
      carrierGlyphSequenceSha256: "b652a600ae2db57b8035fb95c38c4fc67f45bd6cbf03e5b62ffbd5a6bbbcccee",
      transcriptionGlyphSequenceSha256: "b652a600ae2db57b8035fb95c38c4fc67f45bd6cbf03e5b62ffbd5a6bbbcccee",
      comparisonNormalization: "none_direct_exact_glyph_sequence_observation",
      normalizedSequenceCharacters: 19,
      normalizedSequenceSha256: "b652a600ae2db57b8035fb95c38c4fc67f45bd6cbf03e5b62ffbd5a6bbbcccee",
      scriptVariantPairCount: 0,
      punctuationDifferenceObserved: false,
      exactGlyphSequenceEqual: true,
      result: "exact_glyph_correspondence_observed_nonexpert_not_verified_collation",
      humanCollatorAttestations: [],
      domainExpertReviewIds: [],
      rightsEffect: "none",
      bindingFreezeEffect: "none",
      carrierTextStored: false,
      repositoryInspectionDerivativeStored: false
    })
  ];
}

function buildExpectedSourceSupersession(parentSource) {
  assertEqual(parentSource.ledgerId, HISTORICAL_SOURCE.ledgerId, "historical source ledgerId");
  assertEqual(parentSource.ledgerDigest, HISTORICAL_SOURCE.ledgerDigest, "historical source ledgerDigest");
  const historicalCandidate = findExactlyOne(
    parentSource.candidates,
    (entry) => entry.candidateId === OLD_SOURCE_CANDIDATE_ID,
    "historical SMT-v10 source candidate"
  );
  assertEqual(historicalCandidate.candidateDigest, HISTORICAL_SOURCE.candidateDigest,
    "historical SMT-v10 source candidateDigest");

  const ledger = cloneJson(parentSource);
  ledger.schemaVersion = "1.7.0";
  ledger.ledgerId = SOURCE_LEDGER_ID;
  ledger.status = "candidate_only_smt_v10_same_siku_label_cadal_carrier_added_no_admission_promotion";
  ledger.acquiredAt = CREATED_AT;
  ledger.facsimileInspectedAt = CREATED_AT;
  ledger.facsimileCollationInspectedAt = CREATED_AT;

  const candidate = findExactlyOne(ledger.candidates,
    (entry) => entry.candidateId === OLD_SOURCE_CANDIDATE_ID,
    "historical SMT-v10 source candidate clone");
  candidate.candidateId = NEW_SOURCE_CANDIDATE_ID;
  REFLECT_APPLY(ARRAY_PUSH, candidate.facsimileAnchors, [buildCadalAnchor()]);
  REFLECT_APPLY(ARRAY_PUSH, candidate.facsimileCollationCandidates, buildCadalCollations());
  candidate.rightsObservation.carrierLayer = "notices_observed_human_review_required";
  candidate.rightsObservation.licenseOrNoticeObserved =
    "wikisource_page_notice_plus_per_carrier_commons_notices_observed_not_adjudicated";
  candidate.rightsObservation.evidenceRefs = appendUnique(candidate.rightsObservation.evidenceRefs, [
    CADAL.fixedFilePageRevisionUrl,
    CADAL.page3Url,
    CADAL.page4Url,
    "https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia",
    "https://creativecommons.org/publicdomain/mark/1.0/",
    CADAL.internetArchiveMetadataUrl,
    CADAL.internetArchiveRightsUrl
  ]);
  candidate.reviewState.bindingCandidateState =
    "revision_locator_quote_hash_and_two_facsimile_anchor_candidates_not_frozen";
  candidate.reviewState.sourceIdentityBeyondRevisionMetadata =
    "same_siku_label_candidate_specific_transcription_provenance_and_edition_identity_not_established";
  candidate.reviewState.supersedes = OLD_SOURCE_CANDIDATE_ID;
  candidate.candidateDigest = computeCandidateDigest(candidate);

  ledger.gateSummary.corroboratingFacsimileAnchors = 6;
  ledger.gateSummary.visualPageCorrespondencesObserved = 9;
  ledger.gateSummary.normalizedFacsimileCollationCandidatesObserved = 8;
  ledger.gateSummary.exactGlyphFacsimileCorrespondenceCandidatesObserved = 2;
  ledger.doesNotEstablish = appendUnique(ledger.doesNotEstablish, [
    "same_edition_or_same_copy_identity_for_cadal_06056486",
    "specific_wikisource_oldid_transcription_provenance_from_cadal_06056486",
    "wikisource_index_page_or_proofread_chain_for_cadal_06056486",
    "carrier_public_domain_mark_as_license_or_legal_guarantee"
  ]);
  ledger.supersession = {
    supersedes: {
      path: HISTORICAL_SOURCE.path,
      ledgerId: HISTORICAL_SOURCE.ledgerId,
      ledgerDigest: HISTORICAL_SOURCE.ledgerDigest,
      rawBytes: HISTORICAL_SOURCE.rawBytes,
      rawSha256: HISTORICAL_SOURCE.rawSha256,
      smtCandidateId: HISTORICAL_SOURCE.candidateId,
      smtCandidateDigest: HISTORICAL_SOURCE.candidateDigest
    },
    pairedRightsLedger: {
      path: RIGHTS_SUPERSESSION_RELATIVE_PATH,
      ledgerId: RIGHTS_LEDGER_ID
    },
    evidence: {
      pinnedWikisourceRevisionId: WIKISOURCE.revisionId,
      fixedCommonsFilePageRevisionId: CADAL.fixedFilePageRevisionId,
      fixedCommonsFilePageRevisionMediaWikiSha1: CADAL.fixedFilePageRevisionMediaWikiSha1,
      carrierRawBytes: CADAL.carrierBytes,
      carrierRawSha256: CADAL.carrierSha256,
      pageRefs: ["smt-v10-cadal-06056486-page-3", "smt-v10-cadal-06056486-page-4"]
    },
    historicalLedgerAcquiredAt: parentSource.acquiredAt,
    carrierCandidateRecordedAt: CREATED_AT,
    supersessionCreatedAt: CREATED_AT,
    changeScope: "smt_v10_add_same_siku_label_cadal_carrier_candidate_and_two_hash_only_collations_no_admission_promotion",
    historicalParentMutated: false,
    historicalParentBacklinkAdded: false,
    formalAdmissionEffect: "none"
  };
  ledger.ledgerDigest = computeLedgerDigest(ledger);
  return ledger;
}

function buildCadalRightsLayer() {
  return {
    anchorId: ANCHOR_ID,
    carrierFilePageId: CADAL.filePageId,
    carrierFileTitle: CADAL.fileTitle,
    carrierDescriptionUrl: CADAL.descriptionUrl,
    carrierMediaWikiSha1: CADAL.fileMediaWikiSha1,
    carrierSha256: CADAL.carrierSha256,
    metadataObservation: {
      licenseShortName: "Public domain",
      usageTerms: "Public domain",
      attributionRequired: "false",
      copyrighted: "False",
      licenseUrl: "",
      restrictions: ""
    },
    noticeState: "pd_old_and_public_domain_mark_observed_without_pd_scan_template_not_adjudicated",
    reusePolicyId: "commons-reuse-r1259943424",
    status: "notice_observed_not_cleared",
    evidenceRefs: [
      CADAL.fixedFilePageRevisionUrl,
      "https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia",
      "https://creativecommons.org/publicdomain/mark/1.0/",
      CADAL.internetArchiveMetadataUrl,
      CADAL.internetArchiveRightsUrl
    ],
    rightsReviewerIds: [],
    fixedFilePageRevisionId: CADAL.fixedFilePageRevisionId,
    publicDomainMarkCountsAsLicense: false,
    markerAuthorityAndAccuracyVerified: false
  };
}

function buildExpectedRightsSupersession(parentRights, sourceLedger) {
  assertEqual(parentRights.ledgerId, HISTORICAL_RIGHTS.ledgerId, "historical rights ledgerId");
  assertEqual(parentRights.ledgerDigest, HISTORICAL_RIGHTS.ledgerDigest, "historical rights ledgerDigest");
  const historicalCandidate = findExactlyOne(
    parentRights.candidates,
    (entry) => entry.rightsCandidateId === OLD_RIGHTS_CANDIDATE_ID,
    "historical SMT-v10 rights candidate"
  );
  assertEqual(historicalCandidate.candidateDigest, HISTORICAL_RIGHTS.candidateDigest,
    "historical SMT-v10 rights candidateDigest");

  const ledger = cloneJson(parentRights);
  ledger.schemaVersion = "1.3.0";
  ledger.ledgerId = RIGHTS_LEDGER_ID;
  ledger.status = "candidate_only_smt_v10_cadal_carrier_notice_observed_no_rights_promotion";
  ledger.observedAt = CREATED_AT;
  ledger.sourceBindingLedger = {
    path: SOURCE_SUPERSESSION_RELATIVE_PATH,
    ledgerId: sourceLedger.ledgerId,
    ledgerDigest: sourceLedger.ledgerDigest,
    candidateCount: sourceLedger.candidates.length
  };

  const candidate = findExactlyOne(ledger.candidates,
    (entry) => entry.rightsCandidateId === OLD_RIGHTS_CANDIDATE_ID,
    "historical SMT-v10 rights candidate clone");
  candidate.rightsCandidateId = NEW_RIGHTS_CANDIDATE_ID;
  candidate.sourceCandidateId = NEW_SOURCE_CANDIDATE_ID;
  REFLECT_APPLY(ARRAY_PUSH, candidate.carrierLayers, [buildCadalRightsLayer()]);
  candidate.decision.rightsCandidateState =
    "same_siku_label_carrier_notice_observed_human_legal_review_required";
  candidate.decision.supersedes = OLD_RIGHTS_CANDIDATE_ID;
  candidate.candidateDigest = computeRightsCandidateDigest(candidate);

  ledger.gateSummary.commonsPublicDomainMetadataObserved = 6;
  ledger.doesNotEstablish = appendUnique(ledger.doesNotEstablish, [
    "same_edition_or_specific_transcription_provenance_for_cadal_06056486",
    "public_domain_mark_as_license_or_legal_guarantee",
    "internet_archive_missing_rights_fields_as_authorization"
  ]);
  ledger.supersession = {
    supersedes: {
      path: HISTORICAL_RIGHTS.path,
      ledgerId: HISTORICAL_RIGHTS.ledgerId,
      ledgerDigest: HISTORICAL_RIGHTS.ledgerDigest,
      rawBytes: HISTORICAL_RIGHTS.rawBytes,
      rawSha256: HISTORICAL_RIGHTS.rawSha256,
      smtRightsCandidateId: HISTORICAL_RIGHTS.candidateId,
      smtRightsCandidateDigest: HISTORICAL_RIGHTS.candidateDigest
    },
    pairedSourceLedger: {
      path: SOURCE_SUPERSESSION_RELATIVE_PATH,
      ledgerId: sourceLedger.ledgerId,
      ledgerDigest: sourceLedger.ledgerDigest
    },
    evidence: {
      fixedCommonsFilePageRevisionId: CADAL.fixedFilePageRevisionId,
      observedTemplateNames: ["Template:PD-old", "Template:CC-PD-Mark"],
      pdScanTemplateObserved: false,
      internetArchiveRightsFieldPresent: false,
      internetArchiveLicenseUrlFieldPresent: false
    },
    historicalLedgerObservedAt: parentRights.observedAt,
    carrierNoticeObservedAt: CREATED_AT,
    supersessionCreatedAt: CREATED_AT,
    changeScope: "smt_v10_add_cadal_carrier_notice_projection_only_no_clearance",
    historicalParentMutated: false,
    historicalParentBacklinkAdded: false,
    formalAdmissionEffect: "none"
  };
  ledger.ledgerDigest = computeRightsCandidateLedgerDigest(ledger);
  return ledger;
}

function verifyBindingReadiness(readiness) {
  assertEqual(readiness.ledgerId, BINDING_READINESS.ledgerId, "binding readiness ledgerId");
  assertEqual(readiness.ledgerDigest, BINDING_READINESS.ledgerDigest, "binding readiness ledgerDigest");
  assertEqual(readiness.releaseGovernance.activeLine, "legacy-v13", "binding readiness activeLine");
  assertEqual(readiness.releaseGovernance.targetSchema, 13, "binding readiness targetSchema");
  assertEqual(readiness.releaseGovernance.migrationId, null, "binding readiness migrationId");
  assertEqual(readiness.gateSummary.bindingFrozenVerified, 0, "binding readiness frozen count");
  const binding = findExactlyOne(readiness.bindings,
    (entry) => entry.bindingId === "binding:smt-v10:whole-chart", "binding readiness SMT-v10 row");
  assertCanonicalEqual(binding.candidateIds, [OLD_SOURCE_CANDIDATE_ID],
    "binding readiness historical SMT candidate pin");
  assertEqual(binding.freezeState, "candidate_only_unbound", "binding readiness SMT freeze state");
}

function verifyCarrierReadiness(readiness) {
  assertEqual(readiness.ledgerId, CARRIER_READINESS.ledgerId, "carrier readiness ledgerId");
  assertEqual(readiness.ledgerDigest, CARRIER_READINESS.ledgerDigest, "carrier readiness ledgerDigest");
  assertEqual(readiness.counts.carrierObservationLayers, 5, "carrier readiness row count");
  assertEqual(readiness.counts.formalSourceCarrierRecords, 0, "carrier readiness formal record count");
  assertEqual(readiness.parentLocks.sourceBinding.path, HISTORICAL_SOURCE.path,
    "carrier readiness historical source path");
  assertEqual(readiness.parentLocks.sourceBinding.ledgerDigest, HISTORICAL_SOURCE.ledgerDigest,
    "carrier readiness historical source digest");
  assertEqual(readiness.parentLocks.sourceRights.path, HISTORICAL_RIGHTS.path,
    "carrier readiness historical rights path");
  assertEqual(readiness.parentLocks.sourceRights.ledgerDigest, HISTORICAL_RIGHTS.ledgerDigest,
    "carrier readiness historical rights digest");
  const row = findExactlyOne(readiness.carrierGaps,
    (entry) => entry.bindingId === "binding:smt-v10:whole-chart", "carrier readiness SMT-v10 row");
  assertEqual(row.sourceCandidateId, OLD_SOURCE_CANDIDATE_ID,
    "carrier readiness historical SMT source candidate pin");
  assertEqual(row.rightsCandidateId, OLD_RIGHTS_CANDIDATE_ID,
    "carrier readiness historical SMT rights candidate pin");
}

function buildExpectedReceipt(sourceBytes, sourceLedger, rightsBytes, rightsLedger,
  bindingReadinessSnapshot, bindingReadiness, carrierReadinessSnapshot, carrierReadiness) {
  const sourceCandidate = findExactlyOne(sourceLedger.candidates,
    (entry) => entry.candidateId === NEW_SOURCE_CANDIDATE_ID, "new SMT source candidate");
  const rightsCandidate = findExactlyOne(rightsLedger.candidates,
    (entry) => entry.rightsCandidateId === NEW_RIGHTS_CANDIDATE_ID, "new SMT rights candidate");
  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: "bazi_smt_v10_versioned_parent_supersession_receipt_v1",
    supersessionId: RECEIPT_ID,
    status: "paired_versioned_candidate_parents_created_not_promoted_to_active_readiness",
    createdAt: CREATED_AT,
    releaseGovernance: {
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      mutationEpochBoundaryRequired: true,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    subjectLock: {
      bindingId: "binding:smt-v10:whole-chart",
      evidenceSubjectId: "bazi.strength.binding.smt-v10.whole-chart.v1",
      sourceId: "smt-siku-v10-wikisource-r761703",
      historicalSourceCandidateId: OLD_SOURCE_CANDIDATE_ID,
      supersedingSourceCandidateId: NEW_SOURCE_CANDIDATE_ID,
      historicalRightsCandidateId: OLD_RIGHTS_CANDIDATE_ID,
      supersedingRightsCandidateId: NEW_RIGHTS_CANDIDATE_ID,
      newAnchorId: ANCHOR_ID
    },
    historicalParents: {
      sourceBinding: cloneJson(HISTORICAL_SOURCE),
      sourceRights: cloneJson(HISTORICAL_RIGHTS)
    },
    supersedingParents: {
      sourceBinding: artifactIdentity(SOURCE_SUPERSESSION_RELATIVE_PATH, sourceBytes, {
        ledgerId: sourceLedger.ledgerId,
        ledgerDigest: sourceLedger.ledgerDigest,
        smtCandidateId: sourceCandidate.candidateId,
        smtCandidateDigest: sourceCandidate.candidateDigest
      }),
      sourceRights: artifactIdentity(RIGHTS_SUPERSESSION_RELATIVE_PATH, rightsBytes, {
        ledgerId: rightsLedger.ledgerId,
        ledgerDigest: rightsLedger.ledgerDigest,
        smtRightsCandidateId: rightsCandidate.rightsCandidateId,
        smtRightsCandidateDigest: rightsCandidate.candidateDigest
      })
    },
    evidenceChain: {
      pinnedWikisourceTranscription: cloneJson(WIKISOURCE),
      commonsCarrier: {
        anchorId: ANCHOR_ID,
        filePageId: CADAL.filePageId,
        fileTitle: CADAL.fileTitle,
        fixedFilePageRevisionUrl: CADAL.fixedFilePageRevisionUrl,
        fixedFilePageRevisionId: CADAL.fixedFilePageRevisionId,
        fixedFilePageParentRevisionId: CADAL.fixedFilePageParentRevisionId,
        fixedFilePageRevisionTimestamp: CADAL.fixedFilePageRevisionTimestamp,
        fixedFilePageRevisionMediaWikiSha1: CADAL.fixedFilePageRevisionMediaWikiSha1,
        fileTimestamp: CADAL.fileTimestamp,
        fileMediaWikiSha1: CADAL.fileMediaWikiSha1,
        operatorRecordedCarrierRawBytes: CADAL.carrierBytes,
        operatorRecordedCarrierRawSha256: CADAL.carrierSha256,
        carrierMime: CADAL.mime,
        carrierPageCount: CADAL.pageCount,
        pageUrls: [CADAL.page3Url, CADAL.page4Url],
        rawCarrierStoredInRepository: false,
        inspectionDerivativeStoredInRepository: false,
        offlineVerifierRedownloadsCarrier: false
      },
      pageCorrespondences: [
        {
          page: 3,
          quoteCandidateId: "smt-v10-yueling-minimal-v1",
          transcriptionQuoteSha256: "b7f2c66c97d311fe3e1b3d1048dddbbcdafd5e71cfd4454f0b40ae89c3d4a53f",
          carrierGlyphSequenceSha256: "a2dcb5a44deae965e6eec1926651a73a43b7bb5532385b03184efbd38507d029",
          normalizedSequenceSha256: "b7f2c66c97d311fe3e1b3d1048dddbbcdafd5e71cfd4454f0b40ae89c3d4a53f",
          scriptVariantPairCount: 3,
          exactGlyphSequenceEqual: false,
          observerClass: "automated_agent_nonexpert_visual_inspection"
        },
        {
          page: 4,
          quoteCandidateId: "smt-v10-tougan-minimal-v1",
          transcriptionQuoteSha256: "b652a600ae2db57b8035fb95c38c4fc67f45bd6cbf03e5b62ffbd5a6bbbcccee",
          carrierGlyphSequenceSha256: "b652a600ae2db57b8035fb95c38c4fc67f45bd6cbf03e5b62ffbd5a6bbbcccee",
          normalizedSequenceSha256: "b652a600ae2db57b8035fb95c38c4fc67f45bd6cbf03e5b62ffbd5a6bbbcccee",
          scriptVariantPairCount: 0,
          exactGlyphSequenceEqual: true,
          observerClass: "automated_agent_nonexpert_visual_inspection"
        }
      ],
      internetArchiveMetadataObservation: {
        metadataUrl: CADAL.internetArchiveMetadataUrl,
        rightsFaqUrl: CADAL.internetArchiveRightsUrl,
        rightsFieldPresent: false,
        licenseUrlFieldPresent: false,
        countsAsAuthorization: false,
        establishesCommonsCarrierProvenance: false
      },
      boundReadiness: {
        bindingReadiness: artifactIdentity(bindingReadinessSnapshot.path,
          bindingReadinessSnapshot.bytes, {
            ledgerId: bindingReadiness.ledgerId,
            ledgerDigest: bindingReadiness.ledgerDigest,
            smtCandidateIds: [OLD_SOURCE_CANDIDATE_ID],
            bindingFrozenVerified: 0
          }),
        carrierReadiness: artifactIdentity(carrierReadinessSnapshot.path,
          carrierReadinessSnapshot.bytes, {
            ledgerId: carrierReadiness.ledgerId,
            ledgerDigest: carrierReadiness.ledgerDigest,
            carrierObservationLayers: 5,
            smtSourceCandidateId: OLD_SOURCE_CANDIDATE_ID,
            smtRightsCandidateId: OLD_RIGHTS_CANDIDATE_ID
          }),
        relationship: "historical_consumers_remain_pinned_no_backlink_or_rebind"
      }
    },
    editionAndProvenanceBoundary: {
      sameSikuLabelObserved: true,
      twoLocalPassageCorrespondencesObserved: true,
      sameEditionVerified: false,
      sameCopyVerified: false,
      bibliographicIdentityEstablished: false,
      specificWikisourceCarrierProvenanceEstablished: false,
      wikisourceIndexOrPageChainEstablished: false,
      wikisourceProofreadChainEstablished: false,
      commonsGlobalUsageBacklinkObserved: false,
      commonsUploadLaterThanPinnedWikisourceRevision: true,
      directDerivationChainEstablished: false,
      contentTruthEstablished: false,
      bindingFreezeEffect: "none"
    },
    rightsBoundary: {
      commonsPdOldTemplateObserved: true,
      commonsPublicDomainMarkObserved: true,
      commonsPdScanTemplateObserved: false,
      publicDomainMarkCountsAsLicense: false,
      markerAuthorityAndAccuracyVerified: false,
      workLayerCleared: false,
      editionOrTranscriptionLayerCleared: false,
      carrierLayerCleared: false,
      reproductionAuthorized: false,
      quotationAuthorized: false,
      redistributionAuthorized: false,
      rightsReviewerIds: [],
      legalConclusion: "not_established",
      distributionPolicy: "link_only"
    },
    storageBoundary: {
      distributionPolicy: "link_only",
      sourceBodiesStored: 0,
      quoteTextsStored: 0,
      carrierFilesStored: 0,
      pageImagesStored: 0,
      inspectionDerivativesStored: 0,
      materializedSourcePackagesStored: 0
    },
    formalAdmissionBoundary: {
      formalKnowledgeDocumentCount: 0,
      formalSourceRightsRecordCount: 0,
      formalSourceCarrierRecordCount: 0,
      humanFacsimileCollatorAttestations: 0,
      domainExpertReviewCount: 0,
      rightsLegalReviewCount: 0,
      bindingFrozenVerified: 0,
      bindingRequired: 12,
      activeAdmissionEffect: "none",
      boundReadinessConsumesSupersedingParents: false,
      boundReadinessStillPinsHistoricalParents: true,
      sourceCarrierReadinessSuccessorCreated: false,
      promotionBlocked: true
    },
    integrityBoundary: {
      historicalParentsMutated: false,
      historicalParentBacklinksAdded: false,
      newParentsMechanicallyDerivedAndCompared: true,
      singleFileStableReadsUsed: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false,
      supersessionDigestIsDigitalSignature: false
    },
    authorityBoundary: {
      contentTruthEstablished: false,
      baziRuleTruthEstablished: false,
      expertTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false,
      fullRepositoryTypecheckPassed: false,
      defaultWebBuildPassed: false,
      completeApplicationRuntimePassed: false,
      browserOrPwaAcceptancePassed: false,
      publicHostVerified: false,
      releaseEvidenceComplete: false,
      deploymentAndRollbackConfirmed: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    doesNotEstablish: [
      "same_edition_same_copy_or_bibliographic_identity",
      "specific_wikisource_transcription_provenance_or_direct_derivation_chain",
      "wikisource_index_page_or_proofread_chain",
      "publisher_authenticity_or_future_freshness",
      "formal_parent_promotion_or_active_readiness_rebind",
      "source_body_quote_text_carrier_or_page_image_storage",
      "work_edition_transcription_or_carrier_rights_clearance",
      "public_domain_or_license_legal_conclusion",
      "formal_knowledge_document_source_rights_or_source_carrier_record",
      "binding_freeze_content_truth_bazi_rule_truth_or_expert_truth",
      "cross_file_atomic_snapshot_mutation_epoch_interval_or_aba_exclusion",
      "release_readiness_or_public_release_authorization"
    ]
  };
  return {
    ...unsigned,
    supersessionDigest: computeReceiptDigest(unsigned)
  };
}

function validateUniqueSmtTransformation(parentSource, source, parentRights, rights) {
  assertEqual(parentSource.candidates.length, source.candidates.length, "source candidate count");
  assertEqual(parentRights.candidates.length, rights.candidates.length, "rights candidate count");
  for (let index = 1; index < parentSource.candidates.length; index += 1) {
    assertCanonicalEqual(source.candidates[index], parentSource.candidates[index],
      `non-SMT source candidate ${index}`);
  }
  for (let index = 1; index < parentRights.candidates.length; index += 1) {
    assertCanonicalEqual(rights.candidates[index], parentRights.candidates[index],
      `non-SMT rights candidate ${index}`);
  }
  const sourceCandidate = source.candidates[0];
  const rightsCandidate = rights.candidates[0];
  assertEqual(sourceCandidate.facsimileAnchors.length,
    parentSource.candidates[0].facsimileAnchors.length + 1, "SMT source anchor increment");
  assertEqual(sourceCandidate.facsimileCollationCandidates.length,
    parentSource.candidates[0].facsimileCollationCandidates.length + 2,
    "SMT source collation increment");
  assertEqual(rightsCandidate.carrierLayers.length,
    parentRights.candidates[0].carrierLayers.length + 1, "SMT rights carrier increment");
  assertEqual(computeCandidateDigest(sourceCandidate), sourceCandidate.candidateDigest,
    "new SMT source candidate digest");
  for (const collation of sourceCandidate.facsimileCollationCandidates) {
    assertEqual(computeFacsimileCollationCandidateDigest(collation), collation.collationDigest,
      `collation digest ${collation.collationCandidateId}`);
  }
  assertEqual(computeLedgerDigest(source), source.ledgerDigest, "new source ledger digest");
  assertEqual(computeRightsCandidateDigest(rightsCandidate), rightsCandidate.candidateDigest,
    "new SMT rights candidate digest");
  assertEqual(computeRightsCandidateLedgerDigest(rights), rights.ledgerDigest,
    "new rights ledger digest");
}

async function buildBaziSmtV10VersionedParentSupersessionBundle(workspaceRoot) {
  const verifiedDttParent = await loadBaziDttVersionedParentSupersession(workspaceRoot);
  if (!isVerifiedBaziDttVersionedParentSupersession(verifiedDttParent)) {
    fail("verified DTT parent supersession brand is required");
  }
  const parentBundle = await baziDttVersionedParentSupersessionTestOnly
    .buildBaziDttVersionedParentSupersessionBundle(workspaceRoot);
  verifySnapshotIdentity(parentBundle.sourceSnapshot, HISTORICAL_SOURCE, "historical source parent");
  verifySnapshotIdentity(parentBundle.rightsSnapshot, HISTORICAL_RIGHTS, "historical rights parent");

  const bindingReadinessSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot, BINDING_READINESS.path
  );
  const carrierReadinessSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot, CARRIER_READINESS.path
  );
  verifySnapshotIdentity(bindingReadinessSnapshot, BINDING_READINESS, "binding readiness");
  verifySnapshotIdentity(carrierReadinessSnapshot, CARRIER_READINESS, "carrier readiness");
  const bindingReadiness = parseBaziDttStrictJsonArtifact(bindingReadinessSnapshot);
  const carrierReadiness = parseBaziDttStrictJsonArtifact(carrierReadinessSnapshot);
  verifyBindingReadiness(bindingReadiness);
  verifyCarrierReadiness(carrierReadiness);

  const source = buildExpectedSourceSupersession(parentBundle.source);
  const sourceBytes = serializeArtifact(source);
  const rights = buildExpectedRightsSupersession(parentBundle.rights, source);
  const rightsBytes = serializeArtifact(rights);
  validateUniqueSmtTransformation(parentBundle.source, source, parentBundle.rights, rights);
  const receipt = buildExpectedReceipt(sourceBytes, source, rightsBytes, rights,
    bindingReadinessSnapshot, bindingReadiness, carrierReadinessSnapshot, carrierReadiness);
  const receiptBytes = serializeArtifact(receipt);
  verifySnapshotIdentity(artifactIdentity(SOURCE_SUPERSESSION_RELATIVE_PATH, sourceBytes),
    EXPECTED_NEW_SOURCE, "built SMT source supersession");
  verifySnapshotIdentity(artifactIdentity(RIGHTS_SUPERSESSION_RELATIVE_PATH, rightsBytes),
    EXPECTED_NEW_RIGHTS, "built SMT rights supersession");
  verifySnapshotIdentity(artifactIdentity(SUPERSESSION_RECEIPT_RELATIVE_PATH, receiptBytes),
    EXPECTED_RECEIPT, "built SMT supersession receipt");
  assertEqual(source.ledgerId, EXPECTED_NEW_SOURCE.ledgerId, "built SMT source ledgerId");
  assertEqual(source.ledgerDigest, EXPECTED_NEW_SOURCE.ledgerDigest, "built SMT source ledgerDigest");
  assertEqual(source.candidates[0].candidateDigest, EXPECTED_NEW_SOURCE.candidateDigest,
    "built SMT source candidateDigest");
  assertEqual(rights.ledgerId, EXPECTED_NEW_RIGHTS.ledgerId, "built SMT rights ledgerId");
  assertEqual(rights.ledgerDigest, EXPECTED_NEW_RIGHTS.ledgerDigest, "built SMT rights ledgerDigest");
  assertEqual(rights.candidates[0].candidateDigest, EXPECTED_NEW_RIGHTS.candidateDigest,
    "built SMT rights candidateDigest");
  assertEqual(receipt.supersessionId, EXPECTED_RECEIPT.supersessionId,
    "built SMT receipt supersessionId");
  assertEqual(receipt.supersessionDigest, EXPECTED_RECEIPT.supersessionDigest,
    "built SMT receipt supersessionDigest");
  return {
    source,
    sourceBytes,
    rights,
    rightsBytes,
    receipt,
    receiptBytes,
    parentSource: parentBundle.source,
    parentRights: parentBundle.rights,
    bindingReadiness,
    carrierReadiness
  };
}

export async function writeBaziSmtV10VersionedParentSupersession(workspaceRoot = process.cwd()) {
  const bundle = await buildBaziSmtV10VersionedParentSupersessionBundle(workspaceRoot);
  await writeFile(resolve(workspaceRoot, SOURCE_SUPERSESSION_RELATIVE_PATH), bundle.sourceBytes, { flag: "w" });
  await writeFile(resolve(workspaceRoot, RIGHTS_SUPERSESSION_RELATIVE_PATH), bundle.rightsBytes, { flag: "w" });
  await writeFile(resolve(workspaceRoot, SUPERSESSION_RECEIPT_RELATIVE_PATH), bundle.receiptBytes, { flag: "w" });
  return {
    source: artifactIdentity(SOURCE_SUPERSESSION_RELATIVE_PATH, bundle.sourceBytes, {
      ledgerId: bundle.source.ledgerId,
      ledgerDigest: bundle.source.ledgerDigest
    }),
    rights: artifactIdentity(RIGHTS_SUPERSESSION_RELATIVE_PATH, bundle.rightsBytes, {
      ledgerId: bundle.rights.ledgerId,
      ledgerDigest: bundle.rights.ledgerDigest
    }),
    receipt: artifactIdentity(SUPERSESSION_RECEIPT_RELATIVE_PATH, bundle.receiptBytes, {
      supersessionId: bundle.receipt.supersessionId,
      supersessionDigest: bundle.receipt.supersessionDigest
    })
  };
}

export async function loadBaziSmtV10VersionedParentSupersession(workspaceRoot = process.cwd()) {
  const expected = await buildBaziSmtV10VersionedParentSupersessionBundle(workspaceRoot);
  const sourceSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot, SOURCE_SUPERSESSION_RELATIVE_PATH
  );
  const rightsSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot, RIGHTS_SUPERSESSION_RELATIVE_PATH
  );
  const receiptSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot, SUPERSESSION_RECEIPT_RELATIVE_PATH
  );
  verifySnapshotIdentity(sourceSnapshot, EXPECTED_NEW_SOURCE, "persisted fixed SMT source supersession");
  verifySnapshotIdentity(rightsSnapshot, EXPECTED_NEW_RIGHTS, "persisted fixed SMT rights supersession");
  verifySnapshotIdentity(receiptSnapshot, EXPECTED_RECEIPT, "persisted fixed SMT supersession receipt");
  verifyExpectedBytes(sourceSnapshot, expected.sourceBytes, "persisted SMT source supersession");
  verifyExpectedBytes(rightsSnapshot, expected.rightsBytes, "persisted SMT rights supersession");
  verifyExpectedBytes(receiptSnapshot, expected.receiptBytes, "persisted SMT supersession receipt");
  const source = parseBaziDttStrictJsonArtifact(sourceSnapshot);
  const rights = parseBaziDttStrictJsonArtifact(rightsSnapshot);
  const receipt = parseBaziDttStrictJsonArtifact(receiptSnapshot);
  assertCanonicalEqual(source, expected.source, "persisted SMT source semantics");
  assertCanonicalEqual(rights, expected.rights, "persisted SMT rights semantics");
  assertCanonicalEqual(receipt, expected.receipt, "persisted SMT receipt semantics");
  assertEqual(computeReceiptDigest(receipt), receipt.supersessionDigest, "SMT receipt digest");

  const result = deepFreeze({
    offlineVersionedParentSupersessionMechanicallyVerified: true,
    supersessionId: receipt.supersessionId,
    supersessionDigest: receipt.supersessionDigest,
    sourceLedgerId: source.ledgerId,
    sourceLedgerDigest: source.ledgerDigest,
    rightsLedgerId: rights.ledgerId,
    rightsLedgerDigest: rights.ledgerDigest,
    operatorRecordedSameSikuLabelObserved: true,
    sameEditionVerified: false,
    specificWikisourceCarrierProvenanceEstablished: false,
    wikisourceIndexOrPageChainEstablished: false,
    operatorRecordedCarrierRawBytes: CADAL.carrierBytes,
    operatorRecordedCarrierRawSha256: CADAL.carrierSha256,
    externalCarrierLiveVerifiedThisRun: false,
    observationSource: "persisted_operator_recorded_public_evidence_not_live_replayed_by_offline_loader",
    normalizedCollationCandidatesAdded: 1,
    exactGlyphCandidatesAdded: 1,
    humanFacsimileCollatorAttestations: 0,
    domainExpertReviewCount: 0,
    rightsLegalReviewCount: 0,
    formalKnowledgeDocumentCount: 0,
    formalSourceRightsRecordCount: 0,
    formalSourceCarrierRecordCount: 0,
    bindingFrozenVerified: 0,
    bindingRequired: 12,
    boundReadinessConsumesSupersedingParents: false,
    boundReadinessStillPinsHistoricalParents: true,
    sourceCarrierReadinessSuccessorCreated: false,
    distributionPolicy: "link_only",
    legalConclusion: "not_established",
    releaseReady: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false,
    crossFileAtomicSnapshot: false,
    mutationEpochAvailable: false,
    mutationEpochReceipt: null,
    intervalMutationExcludedAcrossFiles: false,
    abaExcluded: false,
    artifacts: {
      source: artifactIdentity(sourceSnapshot.path, sourceSnapshot.bytes),
      rights: artifactIdentity(rightsSnapshot.path, rightsSnapshot.bytes),
      receipt: artifactIdentity(receiptSnapshot.path, receiptSnapshot.bytes)
    }
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedBaziSmtV10VersionedParentSupersession(value) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value]);
}

export const baziSmtV10VersionedParentSupersessionTestOnly = OBJECT_FREEZE({
  HISTORICAL_SOURCE,
  HISTORICAL_RIGHTS,
  BINDING_READINESS,
  CARRIER_READINESS,
  EXPECTED_NEW_SOURCE,
  EXPECTED_NEW_RIGHTS,
  EXPECTED_RECEIPT,
  WIKISOURCE,
  CADAL,
  SOURCE_LEDGER_ID,
  RIGHTS_LEDGER_ID,
  RECEIPT_ID,
  OLD_SOURCE_CANDIDATE_ID,
  NEW_SOURCE_CANDIDATE_ID,
  OLD_RIGHTS_CANDIDATE_ID,
  NEW_RIGHTS_CANDIDATE_ID,
  ANCHOR_ID,
  computeReceiptDigest,
  serializeArtifact,
  buildExpectedSourceSupersession,
  buildExpectedRightsSupersession,
  buildExpectedReceipt,
  buildBaziSmtV10VersionedParentSupersessionBundle
});
