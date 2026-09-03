import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFile,
  link,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  BAZI_DTT_MONTH_COMMAND_PUBLIC_EVIDENCE_RELATIVE_PATH,
  BaziDttMonthCommandPublicEvidenceError,
  baziDttMonthCommandPublicEvidenceTestOnly,
  canonicalStringifyBaziDttMonthCommandPublicEvidence,
  computeBaziDttMonthCommandPublicEvidenceDigest,
  isVerifiedBaziDttMonthCommandPublicEvidence,
  loadBaziDttMonthCommandPublicEvidence,
  parseBaziDttMonthCommandPublicEvidenceJsonBytes,
  readBaziDttMonthCommandPublicEvidence,
  verifyBaziDttMonthCommandPublicEvidence,
  verifyBaziDttMonthCommandPublicEvidenceArtifact
} from "./bazi-dtt-month-command-public-evidence-lib.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OBSERVATION_PATH = path.join(
  PROJECT_ROOT,
  ...BAZI_DTT_MONTH_COMMAND_PUBLIC_EVIDENCE_RELATIVE_PATH.split("/")
);
const BASIS_RELATIVE_PATH = "docs/阶段C-DTT月令候选公开证据-child-v1-2026-08-29.md";
const SOURCE_PARENT_RELATIVE_PATH = "content/bazi-strength-source-binding-candidates.v1.json";
const RIGHTS_PARENT_RELATIVE_PATH = "content/bazi-strength-source-rights-candidates.v1.json";
const RELATED_LAW_RELATIVE_PATH =
  "content/system-admission/bazi-prc-copyright-law-public-evidence.v1.json";
const CLI_PATH = path.join(
  PROJECT_ROOT,
  "scripts",
  "verify-bazi-dtt-month-command-public-evidence.mjs"
);

const persistedObservation = JSON.parse(await readFile(OBSERVATION_PATH, "utf8"));

function clone(value = persistedObservation) {
  return JSON.parse(JSON.stringify(value));
}

function reseal(value) {
  value.observationDigest = computeBaziDttMonthCommandPublicEvidenceDigest(value);
  return value;
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof BaziDttMonthCommandPublicEvidenceError);
    assert.equal(error.code, code);
    return true;
  });
}

async function expectCodeAsync(fn, code) {
  await assert.rejects(fn, (error) => {
    assert.ok(error instanceof BaziDttMonthCommandPublicEvidenceError);
    assert.equal(error.code, code);
    return true;
  });
}

async function expectDttFailureAsync(fn) {
  await assert.rejects(fn, (error) => {
    assert.ok(error instanceof BaziDttMonthCommandPublicEvidenceError);
    assert.match(error.code, /^[A-Z][A-Z0-9_]+$/u);
    return true;
  });
}

function expectDttFailure(fn) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof BaziDttMonthCommandPublicEvidenceError);
    assert.match(error.code, /^[A-Z][A-Z0-9_]+$/u);
    return true;
  });
}

async function copyWorkspaceFile(root, relativePath) {
  const source = path.join(PROJECT_ROOT, ...relativePath.split("/"));
  const target = path.join(root, ...relativePath.split("/"));
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(source, target);
  return target;
}

async function makeWorkspaceFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-bazi-dtt-month-command-"));
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
  });
  return {
    root,
    observationTarget: await copyWorkspaceFile(
      root,
      BAZI_DTT_MONTH_COMMAND_PUBLIC_EVIDENCE_RELATIVE_PATH
    ),
    basisTarget: await copyWorkspaceFile(root, BASIS_RELATIVE_PATH),
    sourceParentTarget: await copyWorkspaceFile(root, SOURCE_PARENT_RELATIVE_PATH),
    rightsParentTarget: await copyWorkspaceFile(root, RIGHTS_PARENT_RELATIVE_PATH),
    relatedLawTarget: await copyWorkspaceFile(root, RELATED_LAW_RELATIVE_PATH)
  };
}

test("persisted DTT child passes full load and only the full result is branded", async () => {
  const result = await loadBaziDttMonthCommandPublicEvidence(PROJECT_ROOT);
  assert.equal(isVerifiedBaziDttMonthCommandPublicEvidence(result), true);
  assert.equal(isVerifiedBaziDttMonthCommandPublicEvidence({ ...result }), false);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.observation));
  assert.ok(Object.isFrozen(result.observation.subjectLock));
  assert.ok(Object.isFrozen(result.observation.carrierObservations[0]));

  const readOnly = await readBaziDttMonthCommandPublicEvidence(PROJECT_ROOT);
  assert.equal(isVerifiedBaziDttMonthCommandPublicEvidence(readOnly), false);
  assert.equal(isVerifiedBaziDttMonthCommandPublicEvidence(clone()), false);
  const verifiedCaller = await verifyBaziDttMonthCommandPublicEvidence(PROJECT_ROOT, clone());
  assert.equal(isVerifiedBaziDttMonthCommandPublicEvidence(verifiedCaller), true);
});

test("release governance stays legacy-v13 schema 13 with no migration or authorization", () => {
  const observation = verifyBaziDttMonthCommandPublicEvidenceArtifact(persistedObservation);
  assert.deepEqual(observation.releaseGovernance, {
    activeLine: "legacy-v13",
    targetSchema: 13,
    migrationId: null,
    mutationEpochBoundaryRequired: true,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  });
  assert.equal(observation.integrityBoundary.crossFileAtomicSnapshot, false);
  assert.equal(observation.integrityBoundary.mutationEpochAvailable, false);
  assert.equal(observation.integrityBoundary.intervalMutationExcluded, false);
  assert.equal(observation.integrityBoundary.abaExcluded, false);
});

test("subject lock contains only the DTT month-command yueling quote", () => {
  const subject = verifyBaziDttMonthCommandPublicEvidenceArtifact(persistedObservation).subjectLock;
  assert.equal(subject.bindingId, "binding:dtt:month-command");
  assert.equal(subject.evidenceSubjectId, "bazi.strength.binding.dtt.month-command.v1");
  assert.equal(subject.sourceCandidateId, "dtt-chanwei-wikisource-r2600158-candidate-v1");
  assert.equal(subject.rightsCandidateId, "dtt-chanwei-wikisource-r2600158-rights-candidate-v1");
  assert.equal(subject.selectedQuoteCandidate.quoteCandidateId, "dtt-yueling-minimal-v1");
  assert.equal(subject.selectedQuoteCandidate.quoteSha256,
    "03df5322e1504e142e673e7d11c2d0ad4e08fa84ddbdea3d5c75532d520cc3b9");
  assert.equal(subject.selectedQuoteCandidate.quoteTextStored, false);
  assert.equal(subject.projectedQuoteCandidateCount, 1);
  assert.equal(subject.otherQuoteCandidatesProjected, 0);
  assert.equal(JSON.stringify(subject).includes("dtt-rooting-minimal-v1"), false);
});

test("exactly two yueling normalized collations remain non-exact and authority-free", () => {
  const subject = verifyBaziDttMonthCommandPublicEvidenceArtifact(persistedObservation).subjectLock;
  assert.equal(subject.projectedNormalizedCollationCandidateCount, 2);
  assert.equal(subject.otherCollationCandidatesProjected, 0);
  assert.deepEqual(subject.selectedNormalizedCollationCandidates.map((entry) => entry.collationCandidateId), [
    "dtt-yueling-ssid-11335994-page-170-normalized-collation-v1",
    "dtt-yueling-cadal-07005210-page-178-normalized-collation-v1"
  ]);
  assert.deepEqual(subject.selectedNormalizedCollationCandidates.map((entry) => entry.collationDigest), [
    "154645461e0b47de7a04c660f7f56a89493e8ce8722fc6041f5baabaff936bc9",
    "b4ef49ed4c0369c12c97137370481059860068d068444a00f8b552a54adbc5d0"
  ]);
  for (const collation of subject.selectedNormalizedCollationCandidates) {
    assert.equal(collation.quoteCandidateId, "dtt-yueling-minimal-v1");
    assert.equal(collation.exactGlyphSequenceEqual, false);
    assert.equal(collation.result, "normalized_correspondence_observed_not_exact_transcription");
    assert.equal(collation.humanCollatorAttestationCount, 0);
    assert.equal(collation.domainExpertReviewCount, 0);
    assert.equal(collation.rightsEffect, "none");
    assert.equal(collation.bindingFreezeEffect, "none");
  }
});

test("two carrier byte identities count as one Commons upstream and zero independent witnesses", () => {
  const observation = verifyBaziDttMonthCommandPublicEvidenceArtifact(persistedObservation);
  assert.equal(observation.carrierObservations.length, 2);
  assert.notEqual(
    observation.carrierObservations[0].download.downloadedSha256,
    observation.carrierObservations[1].download.downloadedSha256
  );
  assert.deepEqual(observation.sourceGroupAccounting, {
    ...observation.sourceGroupAccounting,
    distinctCarrierByteIdentityCount: 2,
    commonsUpstreamGroupCount: 1,
    independentEditionWitnessCount: 0,
    independentRightsSourceCount: 0,
    mediaInfoCountsAsIndependentRightsSource: false,
    twoCarriersCountAsTwoIndependentEditions: false,
    twoCarriersCountAsTwoIndependentLegalOpinions: false
  });
  assert.equal(observation.relationBoundary.twoCarrierFilesAreNotTwoIndependentEditionWitnesses, true);
  assert.equal(observation.relationBoundary.sameEditionRelationshipIndependentlyEstablished, false);
});

test("same uploader label and id do not establish a verified person or independent authority", () => {
  const observation = verifyBaziDttMonthCommandPublicEvidenceArtifact(persistedObservation);
  assert.equal(observation.sourceGroupAccounting.sharedUploaderLabel, "Bot for Freedom");
  assert.equal(observation.sourceGroupAccounting.sharedUploaderId, 11190818);
  assert.equal(observation.sourceGroupAccounting.sharedUploaderIdentityVerified, false);
  assert.equal(observation.sourceGroupAccounting.independentRightsSourceCount, 0);
});

test("Wikisource oldid does not alone freeze its dynamically rendered PD-old notice", () => {
  const wikisource = verifyBaziDttMonthCommandPublicEvidenceArtifact(persistedObservation)
    .operatorRecordedCaptures.wikisource;
  const dependencies = persistedObservation.operatorRecordedCaptures.renderedNoticeDependencies;
  assert.equal(wikisource.revisionId, 2600158);
  assert.equal(wikisource.oldidMainSlotPdOldLiteralObserved, false);
  assert.equal(dependencies.oldidMainSlotPdOldLiteralObserved, false);
  assert.equal(dependencies.renderedPagePdOldDependencyObserved, true);
  assert.equal(dependencies.dependencyRevisionsPinnedAtCapture, true);
  assert.equal(dependencies.oldidAlonePinsRenderedNotice, false);
  assert.deepEqual(dependencies.renderedTemplateNamesObserved, [
    "Template:License", "Template:PD-old", "Template:清朝作品"
  ]);
  assert.deepEqual(dependencies.sourceOldidMainSlotLiteralTemplateNamesObserved, ["Template:清朝作品"]);
  assert.equal(dependencies.responseBodiesStored, 0);
});

test("SSID PD-scan and CADAL PD-old observations remain distinct and unresolved", () => {
  const observation = verifyBaziDttMonthCommandPublicEvidenceArtifact(persistedObservation);
  const [ssid, cadal] = observation.carrierObservations;
  assert.equal(ssid.pdScanTemplateOccurrenceCount, 1);
  assert.equal(ssid.pdOldTemplateOccurrenceCount, 0);
  assert.equal(ssid.topLevelNoticeObservation, "pd_scan_top_level_observed");
  assert.equal(ssid.parentNoticeProjectionReestablished, true);
  assert.equal(cadal.pdScanTemplateOccurrenceCount, 0);
  assert.equal(cadal.pdOldTemplateOccurrenceCount, 1);
  assert.equal(cadal.topLevelNoticeObservation, "pd_old_top_level_observed_without_pd_scan_template");
  assert.equal(cadal.parentNoticeProjectionReestablished, false);
  assert.equal(observation.parentNoticeDiscrepancy.affectedAnchorId, cadal.anchorId);
  assert.equal(observation.parentNoticeDiscrepancy.parentNoticeProjectionReestablishedForAllCarriers, false);
  assert.equal(observation.parentNoticeDiscrepancy.discrepancyState,
    "unresolved_parent_not_mutated_reconciliation_required");
  assert.equal(observation.parentNoticeDiscrepancy.promotionBlocked, true);
  assert.equal(observation.parentNoticeDiscrepancy.rightsEffect, "none");
  assert.equal(observation.parentNoticeDiscrepancy.bindingFreezeEffect, "none");
});

test("viewer page locators are not Page namespace revisions or proofreading receipts", () => {
  const observation = verifyBaziDttMonthCommandPublicEvidenceArtifact(persistedObservation);
  assert.equal(observation.relationBoundary.viewerPageLocatorIsNotPageNamespaceRevision, true);
  assert.equal(observation.relationBoundary.selectedPageNamespaceRevisionCount, 0);
  for (const carrier of observation.carrierObservations) {
    assert.equal(carrier.selectedPageRef.pageId, null);
    assert.equal(carrier.selectedPageRef.pageRevisionId, null);
    assert.equal(carrier.selectedPageRef.pageRevisionTimestamp, null);
    assert.equal(carrier.selectedPageRef.pageMediaWikiSha1, null);
    assert.equal(carrier.selectedPageRef.pageTranscriptionQualityState,
      "not_applicable_no_page_namespace_revision");
  }
});

test("CADAL aggregate revision, main slot and MediaInfo slot stay separately accounted", () => {
  const observation = verifyBaziDttMonthCommandPublicEvidenceArtifact(persistedObservation);
  const capture = observation.operatorRecordedCaptures.cadalAllSlots;
  const cadal = observation.carrierObservations[1];
  assert.equal(capture.revisionAggregateSize, 4306);
  assert.equal(capture.revisionAggregateMediaWikiSha1,
    "3df322a75e5f71d1772344c139dcf21833d5534b");
  assert.equal(capture.mainSlotUtf8Bytes, 975);
  assert.equal(capture.mainSlotSha256,
    "30194bbd8c92409dc8efb02f536b0909a6b29fa793528bc6ac81063bb04bc001");
  assert.equal(capture.mediaInfoSlotContentModel, "wikibase-mediainfo");
  assert.equal(capture.mediaInfoSlotUtf8Bytes, 2402);
  assert.equal(capture.mediaInfoSlotSha256,
    "cb1703b72f307f1a12f9efed976d1e95d9e39bd94554f037d465c21f410a4394");
  assert.equal(capture.mainSlotBodyStored, false);
  assert.equal(capture.mediaInfoSlotBodyStored, false);
  assert.equal(capture.mediaInfoCountsAsIndependentRightsSource, false);
  assert.equal(cadal.fixedFilePageRevisionAggregateSize, 4306);
  assert.equal(cadal.fixedFilePageMainSlotUtf8Bytes, 975);
  assert.equal(cadal.mediaInfoSlotUtf8Bytes, 2402);
  assert.equal(cadal.mediaInfoCountsAsIndependentRightsSource, false);
});

test("six exact Index and Page namespace probes are all point-in-time missing", () => {
  const observation = verifyBaziDttMonthCommandPublicEvidenceArtifact(persistedObservation);
  const probe = observation.operatorRecordedCaptures.wikisourcePageNamespaceProbe;
  assert.equal(probe.deliveredDecodedBodyBytes, 1179);
  assert.equal(probe.deliveredDecodedBodySha256,
    "b6bb339591b4a605f104c54070839da3dee0eb0133c4dd35ebc2efdc9ad8a56c");
  assert.equal(probe.exactTitleCount, 6);
  assert.equal(probe.missingTitleCount, 6);
  assert.equal(probe.pointInTimeOnly, true);
  assert.equal(probe.responseBodyStored, false);
  assert.equal(probe.titles.length, 6);
  assert.deepEqual(probe.titles.map((entry) => entry.namespaceId), [106, 104, 104, 106, 104, 104]);
  for (const entry of probe.titles) {
    assert.equal(entry.missing, true);
    assert.equal(entry.pageId, null);
  }
  assert.equal(observation.relationBoundary.exactPageNamespaceTitlesProbed, 6);
  assert.equal(observation.relationBoundary.exactPageNamespaceTitlesMissingAtCapture, 6);
  assert.equal(observation.relationBoundary.pageNamespaceAbsenceIsPointInTimeOnly, true);
});

test("CC-PD-Mark labels are not licenses and their marker authority is unverified", () => {
  const observation = verifyBaziDttMonthCommandPublicEvidenceArtifact(persistedObservation);
  const [ssid, cadal] = observation.carrierObservations;
  assert.ok(ssid.categoryTokensObserved.includes("CC-PD-Mark"));
  assert.ok(cadal.categoryTokensObserved.includes("CC-PD-Mark"));
  assert.equal(ssid.publicDomainMarkCountsAsLicense, false);
  assert.equal(cadal.publicDomainMarkCountsAsLicense, false);
  assert.equal(observation.parentNoticeDiscrepancy.publicDomainMarkCountsAsLicense, false);
  assert.equal(observation.parentNoticeDiscrepancy.markerAuthorityAndAccuracyVerified, false);
  assert.equal(observation.rightsBoundary.publicDomainMarkCountsAsLicense, false);
  assert.equal(observation.rightsBoundary.markerAuthorityAndAccuracyVerified, false);
});

test("link-only storage keeps every source body, response, quote, image and carrier count at zero", () => {
  const storage = verifyBaziDttMonthCommandPublicEvidenceArtifact(persistedObservation).storageBoundary;
  assert.equal(storage.distributionPolicy, "link_only");
  for (const key of [
    "sourceBodiesStored", "apiResponseBodiesStored", "quoteTextsStored", "pageImagesStored",
    "carrierFilesStored", "carrierGlyphSequencesStored", "repositoryInspectionDerivativesStored",
    "materializedSourcePackagesStored"
  ]) assert.equal(storage[key], 0, key);
  assert.equal(storage.temporaryCarrierFilesDeletedAfterHashing, true);
});

test("rights, binding, content, expert, engineering and release authority all remain closed", () => {
  const observation = verifyBaziDttMonthCommandPublicEvidenceArtifact(persistedObservation);
  const rights = observation.rightsBoundary;
  for (const key of [
    "workLayerCleared", "editionLayerCleared", "transcriptionLayerCleared", "carrierLayerCleared",
    "applicableTermsResolved", "noticeDiscrepancyResolved", "redistributionAuthorized",
    "publicRepositoryBodyInclusionAuthorized", "publicBuildInclusionAuthorized"
  ]) assert.equal(rights[key], false, key);
  for (const key of [
    "formalSourceRightsRecordCount", "formalSourceCarrierRecordCount", "knowledgeDocumentCount",
    "redistributableSourceCount"
  ]) assert.equal(rights[key], 0, key);
  assert.deepEqual(rights.humanLegalReviewerIds, []);
  assert.equal(rights.legalConclusion, "not_established");

  assert.equal(observation.bindingBoundary.bindingFrozen, false);
  assert.equal(observation.bindingBoundary.bindingFrozenVerified, 0);
  assert.equal(observation.bindingBoundary.bindingRequired, 12);
  assert.equal(observation.bindingBoundary.bindingDigest, null);

  const authority = observation.authorityBoundary;
  assert.equal(authority.independentExpertReviewsVerified, 0);
  assert.equal(authority.independentExpertReviewsRequired, 2);
  for (const key of [
    "contentTruthEstablished", "baziRuleTruthEstablished", "sourceBundleComplete",
    "rightsBundleComplete", "expertReviewBundleComplete", "expertTruthEstablished",
    "fullRepositoryTypecheckPassed", "defaultWebBuildPassed", "browserOrPwaAcceptancePassed",
    "releaseEvidenceComplete", "deploymentAndRollbackConfirmed", "releaseReady",
    "publicDeploymentAuthorized", "expertClaimsAuthorized"
  ]) assert.equal(authority[key], false, key);
});

test("remote hashes and point-in-time transport do not authenticate a publisher", () => {
  const network = verifyBaziDttMonthCommandPublicEvidenceArtifact(persistedObservation)
    .networkObservationBoundary;
  assert.equal(network.operatorRecordedNetworkFacts, true);
  assert.equal(network.pointInTimeOnly, true);
  assert.equal(network.publicReadOnly, true);
  assert.equal(network.fullCarrierFileSha256RecomputedByOperator, true);
  for (const key of [
    "credentialsUsed", "loginOrProtectedBackendUsed", "remoteCaptureMechanicallyVerifiedByOfflineVerifier",
    "networkProvenanceEstablished", "publisherAuthenticityEstablished", "redirectChainCaptured",
    "wireBytesCaptured", "tlsPeerCertificateCaptured", "futureFreshnessEstablished"
  ]) assert.equal(network[key], false, key);
});

test("child stays one-way and cannot resign parents, registry or cross-system receipts", () => {
  const observation = verifyBaziDttMonthCommandPublicEvidenceArtifact(persistedObservation);
  assert.equal(observation.parentSourceBindingLedger.parentMutated, false);
  assert.equal(observation.parentSourceBindingLedger.parentBacklinkAdded, false);
  assert.equal(observation.parentSourceRightsLedger.parentMutated, false);
  assert.equal(observation.parentSourceRightsLedger.parentBacklinkAdded, false);
  assert.equal(observation.integrityBoundary.oneWayChildToParentLinksOnly, true);
  assert.equal(observation.integrityBoundary.parentFilesMutated, false);
  assert.equal(observation.integrityBoundary.parentBacklinksAdded, false);
  assert.equal(observation.integrityBoundary.centralRegistryResigned, false);
  assert.equal(observation.integrityBoundary.crossSystemReceiptsResigned, false);
  assert.equal(observation.integrityBoundary.observationDigestIsDigitalSignature, false);
});

test("subject, quote and collation catalogs reject rebinding even after reseal", () => {
  const mutations = [
    (value) => { value.subjectLock.bindingId = "binding:dtt:rooting"; },
    (value) => { value.subjectLock.selectedQuoteCandidate.quoteCandidateId = "dtt-rooting-minimal-v1"; },
    (value) => { value.subjectLock.selectedQuoteCandidate.quoteSha256 = "a".repeat(64); },
    (value) => { value.subjectLock.selectedNormalizedCollationCandidates.reverse(); },
    (value) => { value.subjectLock.selectedNormalizedCollationCandidates[0].collationDigest = "b".repeat(64); },
    (value) => { value.subjectLock.otherQuoteCandidatesProjected = 1; },
    (value) => { value.subjectLock.otherCollationCandidatesProjected = 1; }
  ];
  for (const mutate of mutations) {
    const observation = clone();
    mutate(observation);
    expectDttFailure(() => verifyBaziDttMonthCommandPublicEvidenceArtifact(reseal(observation)));
  }
});

test("normalized correspondence cannot be promoted to exact or human/expert collation", () => {
  const mutations = [
    ["exactGlyphSequenceEqual", true],
    ["result", "exact_transcription"],
    ["humanCollatorAttestationCount", 1],
    ["domainExpertReviewCount", 1],
    ["rightsEffect", "cleared"],
    ["bindingFreezeEffect", "freeze"]
  ];
  for (const [key, value] of mutations) {
    const observation = clone();
    observation.subjectLock.selectedNormalizedCollationCandidates[0][key] = value;
    expectDttFailure(() => verifyBaziDttMonthCommandPublicEvidenceArtifact(reseal(observation)));
  }
  for (const [boundary, key] of [
    ["relationBoundary", "exactGlyphCollationEstablished"],
    ["relationBoundary", "humanCollationEstablished"],
    ["bindingBoundary", "exactQuoteVerifiedForFreeze"]
  ]) {
    const observation = clone();
    observation[boundary][key] = true;
    expectDttFailure(() => verifyBaziDttMonthCommandPublicEvidenceArtifact(reseal(observation)));
  }
});

test("carrier count, Commons upstream and uploader label cannot be promoted into independence", () => {
  const cases = [
    ["distinctCarrierByteIdentityCount", 3],
    ["commonsUpstreamGroupCount", 2],
    ["sharedUploaderIdentityVerified", true],
    ["independentEditionWitnessCount", 2],
    ["independentRightsSourceCount", 2],
    ["mediaInfoCountsAsIndependentRightsSource", true],
    ["twoCarriersCountAsTwoIndependentEditions", true],
    ["twoCarriersCountAsTwoIndependentLegalOpinions", true]
  ];
  for (const [key, value] of cases) {
    const observation = clone();
    observation.sourceGroupAccounting[key] = value;
    expectDttFailure(() => verifyBaziDttMonthCommandPublicEvidenceArtifact(reseal(observation)));
  }
});

test("Wikisource oldid cannot be made to pin a dynamic rendered notice", () => {
  const cases = [
    ["oldidMainSlotPdOldLiteralObserved", true],
    ["renderedPagePdOldDependencyObserved", false],
    ["dependencyRevisionsPinnedAtCapture", false],
    ["oldidAlonePinsRenderedNotice", true],
    ["responseBodiesStored", 1]
  ];
  for (const [key, value] of cases) {
    const observation = clone();
    observation.operatorRecordedCaptures.renderedNoticeDependencies[key] = value;
    expectDttFailure(() => verifyBaziDttMonthCommandPublicEvidenceArtifact(reseal(observation)));
  }
});

test("CADAL multi-slot accounting cannot collapse aggregate, main and MediaInfo identities", () => {
  const cases = [
    ["revisionAggregateSize", 975],
    ["mainSlotUtf8Bytes", 4306],
    ["mediaInfoSlotUtf8Bytes", 4306],
    ["mediaInfoSlotSha256", persistedObservation.operatorRecordedCaptures.cadalAllSlots.mainSlotSha256],
    ["mediaInfoCountsAsIndependentRightsSource", true],
    ["mediaInfoSlotBodyStored", true]
  ];
  for (const [key, value] of cases) {
    const observation = clone();
    observation.operatorRecordedCaptures.cadalAllSlots[key] = value;
    expectDttFailure(() => verifyBaziDttMonthCommandPublicEvidenceArtifact(reseal(observation)));
  }
});

test("Page namespace absence cannot become a revision, proofread state or timeless fact", () => {
  const cases = [
    (value) => { value.operatorRecordedCaptures.wikisourcePageNamespaceProbe.titles[1].missing = false; },
    (value) => { value.operatorRecordedCaptures.wikisourcePageNamespaceProbe.titles[1].pageId = 1; },
    (value) => { value.operatorRecordedCaptures.wikisourcePageNamespaceProbe.pointInTimeOnly = false; },
    (value) => { value.relationBoundary.pageNamespaceAbsenceIsPointInTimeOnly = false; },
    (value) => { value.relationBoundary.selectedPageNamespaceRevisionCount = 1; },
    (value) => { value.carrierObservations[0].selectedPageRef.pageRevisionId = 1; },
    (value) => { value.carrierObservations[0].selectedPageRef.pageTranscriptionQualityState = "proofread"; }
  ];
  for (const mutate of cases) {
    const observation = clone();
    mutate(observation);
    expectDttFailure(() => verifyBaziDttMonthCommandPublicEvidenceArtifact(reseal(observation)));
  }
});

test("PD labels, PDM marker and parent notice discrepancy cannot become rights clearance", () => {
  const cases = [
    ["parentNoticeDiscrepancy", "parentNoticeProjectionReestablishedForAllCarriers", true],
    ["parentNoticeDiscrepancy", "discrepancyState", "resolved"],
    ["parentNoticeDiscrepancy", "promotionBlocked", false],
    ["parentNoticeDiscrepancy", "publicDomainMarkCountsAsLicense", true],
    ["parentNoticeDiscrepancy", "markerAuthorityAndAccuracyVerified", true],
    ["rightsBoundary", "noticeDiscrepancyResolved", true],
    ["rightsBoundary", "publicDomainMarkCountsAsLicense", true],
    ["rightsBoundary", "markerAuthorityAndAccuracyVerified", true],
    ["rightsBoundary", "carrierLayerCleared", true],
    ["rightsBoundary", "redistributionAuthorized", true]
  ];
  for (const [boundary, key, value] of cases) {
    const observation = clone();
    observation[boundary][key] = value;
    expectDttFailure(() => verifyBaziDttMonthCommandPublicEvidenceArtifact(reseal(observation)));
  }
  const cadal = clone();
  cadal.carrierObservations[1].pdScanTemplateOccurrenceCount = 1;
  cadal.carrierObservations[1].topLevelNoticeObservation = "pd_scan_top_level_observed";
  cadal.carrierObservations[1].parentNoticeProjectionReestablished = true;
  expectDttFailure(() => verifyBaziDttMonthCommandPublicEvidenceArtifact(reseal(cadal)));
});

test("formal records, binding, truth, engineering and release gates reject promotion after reseal", () => {
  const cases = [
    ["rightsBoundary", "formalSourceRightsRecordCount", 1],
    ["rightsBoundary", "formalSourceCarrierRecordCount", 1],
    ["rightsBoundary", "knowledgeDocumentCount", 1],
    ["rightsBoundary", "legalConclusion", "cleared"],
    ["bindingBoundary", "bindingFrozen", true],
    ["bindingBoundary", "bindingFrozenVerified", 1],
    ["integrityBoundary", "centralRegistryResigned", true],
    ["integrityBoundary", "crossSystemReceiptsResigned", true],
    ["integrityBoundary", "crossFileAtomicSnapshot", true],
    ["integrityBoundary", "mutationEpochAvailable", true],
    ["authorityBoundary", "contentTruthEstablished", true],
    ["authorityBoundary", "independentExpertReviewsVerified", 2],
    ["authorityBoundary", "fullRepositoryTypecheckPassed", true],
    ["authorityBoundary", "defaultWebBuildPassed", true],
    ["authorityBoundary", "browserOrPwaAcceptancePassed", true],
    ["authorityBoundary", "releaseReady", true],
    ["authorityBoundary", "publicDeploymentAuthorized", true]
  ];
  for (const [boundary, key, value] of cases) {
    const observation = clone();
    observation[boundary][key] = value;
    expectDttFailure(() => verifyBaziDttMonthCommandPublicEvidenceArtifact(reseal(observation)));
  }
});

test("remote hashes cannot be rebound into network or publisher authenticity", () => {
  const cases = [
    ["remoteCaptureMechanicallyVerifiedByOfflineVerifier", true],
    ["networkProvenanceEstablished", true],
    ["publisherAuthenticityEstablished", true],
    ["redirectChainCaptured", true],
    ["wireBytesCaptured", true],
    ["tlsPeerCertificateCaptured", true],
    ["futureFreshnessEstablished", true]
  ];
  for (const [key, value] of cases) {
    const observation = clone();
    observation.networkObservationBoundary[key] = value;
    expectDttFailure(() => verifyBaziDttMonthCommandPublicEvidenceArtifact(reseal(observation)));
  }
  const rebound = clone();
  rebound.operatorRecordedCaptures.wikisource.deliveredDecodedBodySha256 = "a".repeat(64);
  expectDttFailure(() => verifyBaziDttMonthCommandPublicEvidenceArtifact(reseal(rebound)));
});

test("unknown body, quote, page image, formal record and backlink fields are forbidden", () => {
  const injections = [
    [[], "surprise", false],
    [["operatorRecordedCaptures", "wikisource"], "responseBody", "forbidden"],
    [["subjectLock", "selectedQuoteCandidate"], "quoteText", "forbidden"],
    [["carrierObservations", 0], "pageImage", "forbidden"],
    [[], "sourceRightsRecord", {}],
    [[], "sourceCarrierRecord", {}],
    [[], "knowledgeDocument", {}],
    [[], "materializationReceipt", {}],
    [[], "registryBacklink", {}],
    [[], "manifestReceipt", {}]
  ];
  for (const [segments, key, value] of injections) {
    const observation = clone();
    let target = observation;
    for (const segment of segments) target = target[segment];
    target[key] = value;
    expectDttFailure(() => verifyBaziDttMonthCommandPublicEvidenceArtifact(reseal(observation)));
  }
});

test("negative boundary catalog cannot be shortened after reseal", () => {
  const observation = clone();
  observation.doesNotEstablish.pop();
  expectDttFailure(() => verifyBaziDttMonthCommandPublicEvidenceArtifact(reseal(observation)));
});

test("unsafe HTTP, credential, suffix-domain, login and fragment URL rebinding fails closed", () => {
  const urls = [
    "http://zh.wikisource.org/w/api.php?action=query",
    "https://user:pass@zh.wikisource.org/w/api.php?action=query",
    "https://zh.wikisource.org.example.invalid/w/api.php?action=query",
    "https://zh.wikisource.org:444/w/api.php?action=query",
    "https://zh.wikisource.org/w/index.php?title=Special:UserLogin",
    "https://zh.wikisource.org/w/api.php?action=query#secret"
  ];
  for (const requestedUrl of urls) {
    const observation = clone();
    observation.operatorRecordedCaptures.wikisource.requestedUrl = requestedUrl;
    expectDttFailure(() => verifyBaziDttMonthCommandPublicEvidenceArtifact(reseal(observation)));
  }
});

test("strict byte parser rejects duplicate keys, BOM, invalid UTF-8, empty and oversized input", () => {
  expectCode(
    () => parseBaziDttMonthCommandPublicEvidenceJsonBytes(
      Buffer.from('{"schemaVersion":"1.0.0","schemaVersion":"1.0.0"}', "utf8")
    ),
    "JSON_DUPLICATE_KEY"
  );
  expectCode(
    () => parseBaziDttMonthCommandPublicEvidenceJsonBytes(Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])),
    "JSON_BOM_FORBIDDEN"
  );
  expectCode(
    () => parseBaziDttMonthCommandPublicEvidenceJsonBytes(Buffer.from([0xc3, 0x28])),
    "JSON_UTF8_INVALID"
  );
  expectCode(() => parseBaziDttMonthCommandPublicEvidenceJsonBytes(Buffer.alloc(0)), "JSON_INVALID");
  expectCode(
    () => parseBaziDttMonthCommandPublicEvidenceJsonBytes(Buffer.alloc(1_000_001, 0x61)),
    "JSON_TOO_LARGE"
  );
});

test("byte parser rejects Proxy, subclasses, SharedArrayBuffer and resizable ArrayBuffer", () => {
  expectCode(
    () => parseBaziDttMonthCommandPublicEvidenceJsonBytes(new Proxy(new Uint8Array([0x7b, 0x7d]), {})),
    "JSON_PROXY_FORBIDDEN"
  );
  class DerivedBytes extends Uint8Array {}
  expectCode(
    () => parseBaziDttMonthCommandPublicEvidenceJsonBytes(new DerivedBytes([0x7b, 0x7d])),
    "JSON_BYTES_INVALID"
  );
  if (typeof SharedArrayBuffer === "function") {
    expectCode(
      () => parseBaziDttMonthCommandPublicEvidenceJsonBytes(new Uint8Array(new SharedArrayBuffer(8))),
      "JSON_SHARED_BUFFER_FORBIDDEN"
    );
  }
  try {
    const resizable = new ArrayBuffer(8, { maxByteLength: 16 });
    if (resizable.resizable === true) {
      expectCode(
        () => parseBaziDttMonthCommandPublicEvidenceJsonBytes(new Uint8Array(resizable)),
        "JSON_RESIZABLE_BUFFER_FORBIDDEN"
      );
    }
  } catch {
    // Runtime without resizable ArrayBuffer support.
  }
});

test("passive object capture rejects accessors without invocation, Proxy, Symbol, sparse arrays and -0", () => {
  const accessorObservation = clone();
  let invoked = false;
  Object.defineProperty(accessorObservation.authorityBoundary, "contentTruthEstablished", {
    enumerable: true,
    get() {
      invoked = true;
      return false;
    }
  });
  expectCode(
    () => verifyBaziDttMonthCommandPublicEvidenceArtifact(accessorObservation),
    "INPUT_ACCESSOR_FORBIDDEN"
  );
  assert.equal(invoked, false);
  expectCode(
    () => verifyBaziDttMonthCommandPublicEvidenceArtifact(new Proxy(clone(), {})),
    "INPUT_PROXY_FORBIDDEN"
  );
  const symbolObservation = clone();
  symbolObservation[Symbol("hidden")] = true;
  expectCode(() => verifyBaziDttMonthCommandPublicEvidenceArtifact(symbolObservation), "INPUT_SYMBOL_FORBIDDEN");
  const sparseObservation = clone();
  sparseObservation.carrierObservations = new Array(2);
  expectCode(() => verifyBaziDttMonthCommandPublicEvidenceArtifact(sparseObservation), "INPUT_ARRAY_INVALID");
  const negativeZeroObservation = clone();
  negativeZeroObservation.sourceGroupAccounting.distinctCarrierByteIdentityCount = -0;
  expectCode(
    () => verifyBaziDttMonthCommandPublicEvidenceArtifact(negativeZeroObservation),
    "INPUT_VALUE_INVALID"
  );
});

test("canonical stringifier rejects accessor and Proxy without invoking user code", () => {
  let invoked = false;
  const accessor = {};
  Object.defineProperty(accessor, "value", {
    enumerable: true,
    get() {
      invoked = true;
      return "forbidden";
    }
  });
  expectCode(
    () => canonicalStringifyBaziDttMonthCommandPublicEvidence(accessor),
    "INPUT_ACCESSOR_FORBIDDEN"
  );
  assert.equal(invoked, false);
  expectCode(
    () => canonicalStringifyBaziDttMonthCommandPublicEvidence(new Proxy({ value: "x" }, {})),
    "INPUT_PROXY_FORBIDDEN"
  );
});

test("caller object must match the persisted child before a branded result is returned", async () => {
  const caller = clone();
  caller.authorityBoundary.releaseReady = true;
  await expectDttFailureAsync(
    () => verifyBaziDttMonthCommandPublicEvidence(PROJECT_ROOT, reseal(caller))
  );
});

test("artifact reader rejects a symlinked child endpoint", async (t) => {
  const { root, observationTarget } = await makeWorkspaceFixture(t);
  const realTarget = `${observationTarget}.real`;
  await copyFile(observationTarget, realTarget);
  await rm(observationTarget);
  try {
    await symlink(realTarget, observationTarget, "file");
  } catch (error) {
    if (["EPERM", "EACCES", "UNKNOWN"].includes(error?.code)) {
      t.skip(`symlink creation unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  await expectCodeAsync(() => loadBaziDttMonthCommandPublicEvidence(root), "SYMLINK_REJECTED");
});

test("artifact reader rejects a hardlinked child endpoint", async (t) => {
  const { root, observationTarget } = await makeWorkspaceFixture(t);
  const realTarget = `${observationTarget}.real`;
  await copyFile(observationTarget, realTarget);
  await rm(observationTarget);
  try {
    await link(realTarget, observationTarget);
  } catch (error) {
    if (["EPERM", "EACCES", "UNKNOWN", "ENOTSUP"].includes(error?.code)) {
      t.skip(`hardlink creation unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  await expectCodeAsync(() => loadBaziDttMonthCommandPublicEvidence(root), "HARDLINK_REJECTED");
});

test("artifact reader rejects a directory junction", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-bazi-dtt-junction-"));
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
  });
  const realContent = path.join(root, "real-content");
  const realArtifact = path.join(realContent, "system-admission", path.basename(OBSERVATION_PATH));
  await mkdir(path.dirname(realArtifact), { recursive: true });
  await copyFile(OBSERVATION_PATH, realArtifact);
  try {
    await symlink(realContent, path.join(root, "content"), "junction");
  } catch (error) {
    if (["EPERM", "EACCES", "UNKNOWN"].includes(error?.code)) {
      t.skip(`junction creation unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  await expectCodeAsync(
    () => baziDttMonthCommandPublicEvidenceTestOnly.readObservationArtifact(root),
    "DIRECTORY_CHAIN_INVALID"
  );
});

test("artifact reader rejects a workspace-root junction alias", async (t) => {
  const realRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-bazi-dtt-real-root-"));
  const aliasParent = await mkdtemp(path.join(os.tmpdir(), "hakimi-bazi-dtt-alias-parent-"));
  t.after(async () => {
    await rm(aliasParent, { recursive: true, force: true });
    await rm(realRoot, { recursive: true, force: true });
  });
  await copyWorkspaceFile(realRoot, BAZI_DTT_MONTH_COMMAND_PUBLIC_EVIDENCE_RELATIVE_PATH);
  const alias = path.join(aliasParent, "workspace-alias");
  try {
    await symlink(realRoot, alias, "junction");
  } catch (error) {
    if (["EPERM", "EACCES", "UNKNOWN"].includes(error?.code)) {
      t.skip(`root junction creation unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  await expectDttFailureAsync(
    () => baziDttMonthCommandPublicEvidenceTestOnly.readObservationArtifact(alias)
  );
});

test("artifact reader detects post-open growth and post-read path replacement", async (t) => {
  const growthRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-bazi-dtt-growth-"));
  t.after(async () => {
    await rm(growthRoot, { recursive: true, force: true });
  });
  const growthTarget = await copyWorkspaceFile(
    growthRoot,
    BAZI_DTT_MONTH_COMMAND_PUBLIC_EVIDENCE_RELATIVE_PATH
  );
  await expectCodeAsync(
    () => baziDttMonthCommandPublicEvidenceTestOnly.readObservationArtifact(growthRoot, {
      async afterOpenBeforeRead() {
        await writeFile(growthTarget, Buffer.alloc(1_000_001, 0x61));
      }
    }),
    "FILE_SIZE_INVALID"
  );

  const replacementRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-bazi-dtt-replace-"));
  t.after(async () => {
    await rm(replacementRoot, { recursive: true, force: true });
  });
  const target = await copyWorkspaceFile(
    replacementRoot,
    BAZI_DTT_MONTH_COMMAND_PUBLIC_EVIDENCE_RELATIVE_PATH
  );
  const replacement = `${target}.replacement`;
  const displaced = `${target}.displaced`;
  await copyFile(OBSERVATION_PATH, replacement);
  await expectCodeAsync(
    () => baziDttMonthCommandPublicEvidenceTestOnly.readObservationArtifact(replacementRoot, {
      async afterBytesRead() {
        await rename(target, displaced);
        await rename(replacement, target);
      }
    }),
    "ENDPOINT_CHANGED"
  );
});

test("child, basis, source parent, rights parent and C-L1 related observation drift independently", async (t) => {
  const cases = [
    ["observationTarget", "ARTIFACT_DRIFT"],
    ["basisTarget", "BASIS_DRIFT"],
    ["sourceParentTarget", "SOURCE_PARENT_DRIFT"],
    ["rightsParentTarget", "RIGHTS_PARENT_DRIFT"],
    ["relatedLawTarget", "RELATED_LAW_DRIFT"]
  ];
  for (const [targetKey, code] of cases) {
    const fixture = await makeWorkspaceFixture(t);
    await writeFile(fixture[targetKey], Buffer.concat([
      await readFile(fixture[targetKey]), Buffer.from("\n", "utf8")
    ]));
    await expectCodeAsync(() => loadBaziDttMonthCommandPublicEvidence(fixture.root), code);
  }
});

test("checked-in child, basis and parent raw identities remain externally pinned", async () => {
  const result = await loadBaziDttMonthCommandPublicEvidence(PROJECT_ROOT);
  assert.deepEqual(result.observationArtifact, {
    path: BAZI_DTT_MONTH_COMMAND_PUBLIC_EVIDENCE_RELATIVE_PATH,
    rawBytes: 31_062,
    rawSha256: "85788506067b50453545ec786c7a47b0e51a4cf004419cbe8c547f9384c01ae6"
  });
  assert.equal(result.observation.observationDigest,
    "01e61e4f77526270ef83a0d95fbcb165bf307d5efa09c5a0360ff49bf1735993");
  assert.equal(computeBaziDttMonthCommandPublicEvidenceDigest(result.observation),
    "01e61e4f77526270ef83a0d95fbcb165bf307d5efa09c5a0360ff49bf1735993");
  assert.deepEqual(result.basisArtifact, {
    path: BASIS_RELATIVE_PATH,
    rawBytes: 10_165,
    rawSha256: "9d0c09d9add17785f41bfdb56628771c12b091b9b0ef3db7caef558a270140cb"
  });
  assert.deepEqual(result.sourceParentArtifact, {
    path: SOURCE_PARENT_RELATIVE_PATH,
    rawBytes: 47_753,
    rawSha256: "e2ac6a7a0ea1209dd92a38dfae82c494df4792da1a102c11d2fdb2caa80e41f7"
  });
  assert.deepEqual(result.rightsParentArtifact, {
    path: RIGHTS_PARENT_RELATIVE_PATH,
    rawBytes: 20_806,
    rawSha256: "433116caf1a2b9c233739093b0a2436f13c7f268dfa8af6c1ce481964b48b179"
  });
  assert.deepEqual(result.relatedLawArtifact, {
    path: RELATED_LAW_RELATIVE_PATH,
    rawBytes: 19_961,
    rawSha256: "c0e91874bd0b9e7c99d4db2b79df1e68c483fc1e68ed06700be44d5bf6bc10cf"
  });
});

test("CLI success is calibrated as offline mechanical verification only", () => {
  const run = spawnSync(process.execPath, [CLI_PATH], {
    cwd: PROJECT_ROOT,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stderr, "");
  const output = JSON.parse(run.stdout);
  assert.equal(Object.hasOwn(output, "ok"), false);
  assert.equal(output.offlineCheckedInObservationContractMechanicallyVerified, true);
  assert.equal(output.activeLine, "legacy-v13");
  assert.equal(output.targetSchema, 13);
  assert.equal(output.migrationId, null);
  assert.equal(output.distinctCarrierByteIdentityCount, 2);
  assert.equal(output.commonsUpstreamGroupCount, 1);
  assert.equal(output.sharedUploaderIdentityVerified, false);
  assert.equal(output.independentEditionWitnessCount, 0);
  assert.equal(output.independentRightsSourceCount, 0);
  assert.equal(output.mediaInfoCountsAsIndependentRightsSource, false);
  assert.equal(output.oldidMainSlotPdOldLiteralObserved, false);
  assert.equal(output.renderedPagePdOldDependencyObserved, true);
  assert.equal(output.dependencyRevisionsPinnedAtCapture, true);
  assert.equal(output.oldidAlonePinsRenderedNotice, false);
  assert.equal(output.noticeDiscrepancyResolved, false);
  assert.equal(output.noticeDiscrepancyPromotionBlocked, true);
  for (const key of [
    "remoteCaptureMechanicallyVerifiedByOfflineVerifier",
    "networkProvenanceEstablished",
    "publisherAuthenticityEstablished",
    "exactGlyphCollationEstablished",
    "humanCollationEstablished",
    "rightsEvidenceComplete",
    "bindingFrozen",
    "contentTruthEstablished",
    "expertTruthEstablished",
    "fullRepositoryTypecheckPassed",
    "defaultWebBuildPassed",
    "browserOrPwaAcceptancePassed",
    "releaseReady",
    "publicDeploymentAuthorized",
    "expertClaimsAuthorized",
    "crossFileAtomicSnapshot",
    "mutationEpochAvailable",
    "intervalMutationExcluded",
    "abaExcluded"
  ]) {
    assert.equal(output[key], false, `${key} must remain false`);
  }
});

test("CLI emits a fixed fail-closed code and no success output when basis drifts", async (t) => {
  const fixture = await makeWorkspaceFixture(t);
  await writeFile(fixture.basisTarget, Buffer.concat([
    await readFile(fixture.basisTarget),
    Buffer.from("\n", "utf8")
  ]));
  const run = spawnSync(process.execPath, [CLI_PATH], {
    cwd: fixture.root,
    encoding: "utf8"
  });
  assert.equal(run.status, 1);
  assert.equal(run.stdout, "");
  assert.deepEqual(JSON.parse(run.stderr), {
    offlineCheckedInObservationContractMechanicallyVerified: false,
    code: "BASIS_DRIFT"
  });
});
