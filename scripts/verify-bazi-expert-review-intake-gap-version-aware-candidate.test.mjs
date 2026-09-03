import test from "node:test";
import assert from "node:assert/strict";
import crypto, { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fsPromises, {
  copyFile,
  link,
  mkdir,
  mkdtemp,
  open,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BAZI_EXPERT_REVIEW_INTAKE_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH,
  computeBaziExpertReviewIntakeGapVersionAwareCandidateDigest,
  isVerifiedBaziExpertReviewIntakeGapVersionAwareCandidate,
  loadBaziExpertReviewIntakeGapVersionAwareCandidate,
  baziExpertReviewIntakeGapVersionAwareCandidateTestOnly
} from "./bazi-expert-review-intake-gap-version-aware-candidate-lib.mjs";
import {
  isVerifiedBaziDttVersionedParentSupersession,
  loadBaziDttVersionedParentSupersession
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  isVerifiedBaziBindingFreezeRequirementsV17,
  loadBaziBindingFreezeRequirementsV17
} from "./bazi-dtt-version-aware-readiness-lib.mjs";
import {
  readBaziExpertReviewPacket,
  verifyBaziExpertReviewPacket
} from "./bazi-expert-review-packet-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(here, "..");
const HISTORICAL_PACKET_PATH = "content/bazi-strength-expert-review-packet.v1.json";
const HISTORICAL_GAP_PATH =
  "content/system-admission/bazi-expert-review-intake-gap.v1.json";
const SOURCE_V16_PATH = "content/bazi-strength-source-binding-candidates.v1.6.0.json";
const RIGHTS_V12_PATH = "content/bazi-strength-source-rights-candidates.v1.2.0.json";
const READINESS_V17_PATH =
  "content/system-admission/bazi-binding-freeze-requirements.v1.7.0.json";
const SUPERSESSION_RECEIPT_PATH =
  "content/system-admission/bazi-dtt-versioned-parent-supersession.v1.json";
const BAZI_CORE_PATH = "packages/bazi-core/src/index.ts";
const CURRENT_CHART_PATH =
  "packages/bazi-interpretation/src/current-chart-review-snapshot.ts";
const VERSION_AWARE_LIB_PATH =
  "scripts/bazi-expert-review-intake-gap-version-aware-candidate-lib.mjs";
const VERSION_AWARE_TEST_PATH =
  "scripts/verify-bazi-expert-review-intake-gap-version-aware-candidate.test.mjs";
const VERSION_AWARE_CLI_PATH =
  "scripts/verify-bazi-expert-review-intake-gap-version-aware-candidate.mjs";

const FIXTURE_PATHS = Object.freeze([
  "content/bazi-strength-source-binding-candidates.v1.json",
  "content/bazi-strength-source-rights-candidates.v1.json",
  SOURCE_V16_PATH,
  RIGHTS_V12_PATH,
  "content/bazi-strength-engineering-binding-candidates.v1.json",
  HISTORICAL_PACKET_PATH,
  "content/system-admission/bazi-prc-copyright-law-public-evidence.v1.json",
  "content/system-admission/bazi-dtt-month-command-public-evidence.v1.json",
  "content/system-admission/bazi-dtt-notice-reconciliation.v1.json",
  "content/system-admission/bazi-dtt-notice-reconciliation.v2.json",
  SUPERSESSION_RECEIPT_PATH,
  "content/system-admission/bazi-binding-freeze-requirements.v1.json",
  READINESS_V17_PATH,
  HISTORICAL_GAP_PATH,
  BAZI_EXPERT_REVIEW_INTAKE_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH,
  "docs/阶段C-DTT月令候选公开证据-child-v1-2026-08-29.md",
  BAZI_CORE_PATH,
  CURRENT_CHART_PATH,
  "packages/bazi-interpretation/src/strength-assessment-core.ts",
  "packages/bazi-interpretation/src/strength-claim-registry.ts",
  "packages/bazi-interpretation/src/strength-policy.ts",
  "packages/bazi-interpretation/src/strength-sensitivity-review.ts",
  "packages/contracts/src/index.ts",
  "packages/knowledge-core/src/index.ts",
  "packages/rule-profiles/src/index.ts",
  "packages/research-export/src/golden/single-chart-report.contract.v1.7.json"
]);

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-expert-intake-v11-test-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  for (const relativePath of FIXTURE_PATHS) {
    const target = path.join(root, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(workspaceRoot, relativePath), target);
  }
  return root;
}

async function mutateJson(root, relativePath, mutate) {
  const target = path.join(root, relativePath);
  const value = JSON.parse(await readFile(target, "utf8"));
  mutate(value);
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function expectCode(code) {
  return (error) => error?.code === code;
}

function expectOneOfCodes(codes) {
  return (error) => codes.includes(error?.code);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sameLengthSemanticWhitespaceDrift(bytes) {
  const source = bytes.toString("utf8");
  const drifted = source.replace('\n  "', '\n\t "');
  assert.notEqual(drifted, source);
  const result = Buffer.from(drifted, "utf8");
  assert.equal(result.byteLength, bytes.byteLength);
  assert.deepEqual(JSON.parse(drifted), JSON.parse(source));
  return result;
}

function assertDeepFrozen(value, seen = new Set()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && "value" in descriptor) assertDeepFrozen(descriptor.value, seen);
  }
}

test("live expert intake v1.1 is narrow, private-branded, vacant and fully red", async () => {
  const result = await loadBaziExpertReviewIntakeGapVersionAwareCandidate(workspaceRoot);
  assert.equal(isVerifiedBaziExpertReviewIntakeGapVersionAwareCandidate(result), true);
  assert.deepEqual(Object.keys(result), [
    "versionAwareExpertReviewIntakeGapMechanicallyVerified",
    "activeAdmissionEffect",
    "ledgerId",
    "ledgerDigest",
    "artifact",
    "historicalTemplateArtifactCount",
    "historicalDirectParentSlotsRebound",
    "verifiedUpstreamPrivateBrandCount",
    "supportingSupersessionReceiptArtifactCount",
    "historicalPacketArtifactLockSlots",
    "sourceRightsArtifactLockSlotsRebound",
    "unchangedPacketArtifactLockSlotsChecked",
    "candidateProjectedArtifactLockExactMatches",
    "candidateProjectedArtifactLockDrifts",
    "packetArtifactLocksCurrent",
    "domainExpertsRequired",
    "reviewerSlotsOccupied",
    "candidateRecordFormatsDefined",
    "currentRecordInstances",
    "sealedOriginalOpinions",
    "independentExpertReviewsVerified",
    "expertReviewBundleComplete",
    "candidateFeedbackCollectionReady",
    "countsTowardExpertGate",
    "bindingRequired",
    "bindingFrozenVerified",
    "sourceBundleComplete",
    "rightsBundleComplete",
    "formalAdmissionPromotionBlocked",
    "formalActivationAllowed",
    "contentTruthEstablished",
    "expertTruthEstablished",
    "rightsLegalConclusionEstablished",
    "releaseReady",
    "publicDeploymentAuthorized",
    "expertClaimsAuthorized",
    "crossFileAtomicSnapshot",
    "mutationEpochAvailableForSchema13",
    "mutationEpochReceipt",
    "intervalMutationExcludedAcrossFiles",
    "abaExcluded"
  ]);
  assert.equal(result.versionAwareExpertReviewIntakeGapMechanicallyVerified, true);
  assert.equal(result.activeAdmissionEffect, "none");
  assert.equal(result.ledgerId,
    "hakimi.bazi.expert-review-intake-gap.version-aware-candidate/1.1.0");
  assert.equal(result.ledgerDigest,
    "5318b9543bad20c52e5129901e94aa2ca3d2dd68f342ba11ab9611f4f767d582");
  assert.deepEqual(result.artifact, {
    path: BAZI_EXPERT_REVIEW_INTAKE_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH,
    bytes: 32579,
    sha256: "7a7088a3fdc660ccca3ef0d9765e36421563c7feee1c3dfa6bc4d7169d0f91df"
  });
  assert.equal(result.historicalTemplateArtifactCount, 2);
  assert.equal(result.historicalDirectParentSlotsRebound, 3);
  assert.equal(result.verifiedUpstreamPrivateBrandCount, 2);
  assert.equal(result.supportingSupersessionReceiptArtifactCount, 1);
  assert.equal(result.historicalPacketArtifactLockSlots, 12);
  assert.equal(result.sourceRightsArtifactLockSlotsRebound, 2);
  assert.equal(result.unchangedPacketArtifactLockSlotsChecked, 10);
  assert.equal(result.candidateProjectedArtifactLockExactMatches, 11);
  assert.equal(result.candidateProjectedArtifactLockDrifts, 1);
  assert.equal(result.packetArtifactLocksCurrent, false);
  assert.equal(result.domainExpertsRequired, 2);
  assert.equal(result.reviewerSlotsOccupied, 0);
  assert.equal(result.candidateRecordFormatsDefined, 7);
  assert.equal(result.bindingRequired, 12);
  assert.equal(result.formalAdmissionPromotionBlocked, true);
  for (const field of [
    "currentRecordInstances",
    "sealedOriginalOpinions",
    "independentExpertReviewsVerified",
    "bindingFrozenVerified"
  ]) assert.equal(result[field], 0, field);
  for (const field of [
    "expertReviewBundleComplete",
    "candidateFeedbackCollectionReady",
    "countsTowardExpertGate",
    "sourceBundleComplete",
    "rightsBundleComplete",
    "formalActivationAllowed",
    "contentTruthEstablished",
    "expertTruthEstablished",
    "rightsLegalConclusionEstablished",
    "releaseReady",
    "publicDeploymentAuthorized",
    "expertClaimsAuthorized",
    "crossFileAtomicSnapshot",
    "mutationEpochAvailableForSchema13",
    "intervalMutationExcludedAcrossFiles",
    "abaExcluded"
  ]) assert.equal(result[field], false, field);
  assert.equal(result.mutationEpochReceipt, null);
  assertDeepFrozen(result);
});

test("deterministic builder reproduces the final frozen raw and semantic identities", async () => {
  const first = await baziExpertReviewIntakeGapVersionAwareCandidateTestOnly
    .buildExpectedBundle(workspaceRoot);
  const second = await baziExpertReviewIntakeGapVersionAwareCandidateTestOnly
    .buildExpectedBundle(workspaceRoot);
  assert.deepEqual(first.ledger, second.ledger);
  assert.equal(first.snapshot.rawBytes, 32579);
  assert.equal(first.snapshot.rawSha256,
    "7a7088a3fdc660ccca3ef0d9765e36421563c7feee1c3dfa6bc4d7169d0f91df");
  assert.equal(first.ledger.ledgerDigest,
    "5318b9543bad20c52e5129901e94aa2ca3d2dd68f342ba11ab9611f4f767d582");
  assert.equal(computeBaziExpertReviewIntakeGapVersionAwareCandidateDigest(first.ledger),
    first.ledger.ledgerDigest);
  const persisted = await readFile(path.join(workspaceRoot,
    BAZI_EXPERT_REVIEW_INTAKE_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH));
  assert.equal(persisted.byteLength, first.snapshot.rawBytes);
  assert.equal(sha256(persisted), first.snapshot.rawSha256);
  assert.deepEqual(JSON.parse(persisted.toString("utf8")), first.ledger);
  assert.equal(persisted.toString("utf8"),
    baziExpertReviewIntakeGapVersionAwareCandidateTestOnly.serialize(first.ledger));
});

test("historical packet and intake gap stay raw-and-semantic frozen and unmodified", async () => {
  const packetBytes = await readFile(path.join(workspaceRoot, HISTORICAL_PACKET_PATH));
  const gapBytes = await readFile(path.join(workspaceRoot, HISTORICAL_GAP_PATH));
  assert.equal(packetBytes.byteLength, 12684);
  assert.equal(sha256(packetBytes),
    "ba28de1b95d57de4320913e7a0b00fe780630d15408c5b22b84311977ea29163");
  assert.equal(gapBytes.byteLength, 4309);
  assert.equal(sha256(gapBytes),
    "7d01f000358f6938675c34fbebf6379e55c3f56dadee12fab6a3d801b33ef6ac");
  const historical = await baziExpertReviewIntakeGapVersionAwareCandidateTestOnly
    .readHistoricalTemplates(workspaceRoot);
  assert.equal(historical.packet.packetDigest,
    "cfe554b60b4698e0acd0a42e14484f4683eb7663d4f6862b767cf70404d2cd5f");
  assert.equal(historical.gap.ledgerDigest,
    "6cf349fda4c4fd2b8ddada22417e12741c37abc6fc884338dbf5c741e0fc1766");
  assert.deepEqual(historical.gap.readinessLedgerBinding,
    baziExpertReviewIntakeGapVersionAwareCandidateTestOnly.HISTORICAL_GAP_READINESS);
  assert.equal(historical.packet.artifactLocks.length, 12);
  assert.equal(historical.packet.reviewerSlots.length, 2);
  assert.equal(historical.gap.currentInstances.originalOpinions.length, 0);
  assert.equal(historical.gap.currentInstances.overallBundles.length, 0);
  assert.equal(historical.gap.gapSummary.currentRecordInstances, 0);
  await baziExpertReviewIntakeGapVersionAwareCandidateTestOnly.buildExpectedBundle(workspaceRoot);
  assert.equal(sha256(await readFile(path.join(workspaceRoot, HISTORICAL_PACKET_PATH))),
    sha256(packetBytes));
  assert.equal(sha256(await readFile(path.join(workspaceRoot, HISTORICAL_GAP_PATH))),
    sha256(gapBytes));
});

test("three parent slots are rebound through two actual private brands and one supporting receipt", async () => {
  const supersession = await loadBaziDttVersionedParentSupersession(workspaceRoot);
  const readiness = await loadBaziBindingFreezeRequirementsV17(workspaceRoot);
  assert.equal(isVerifiedBaziDttVersionedParentSupersession(supersession), true);
  assert.equal(isVerifiedBaziBindingFreezeRequirementsV17(readiness), true);
  const supersessionTuple = baziExpertReviewIntakeGapVersionAwareCandidateTestOnly
    .assertSupersession(supersession);
  const readinessTuple = baziExpertReviewIntakeGapVersionAwareCandidateTestOnly
    .assertReadiness(readiness);
  assert.equal(baziExpertReviewIntakeGapVersionAwareCandidateTestOnly
    .exactJson(supersessionTuple, readinessTuple), true);
  assert.deepEqual(supersessionTuple.sourceBinding,
    baziExpertReviewIntakeGapVersionAwareCandidateTestOnly.SOURCE_V16);
  assert.deepEqual(supersessionTuple.sourceRights,
    baziExpertReviewIntakeGapVersionAwareCandidateTestOnly.RIGHTS_V12);
  assert.deepEqual(supersessionTuple.supportingSupersessionReceipt,
    baziExpertReviewIntakeGapVersionAwareCandidateTestOnly.SUPERSESSION_RECEIPT);

  const built = await baziExpertReviewIntakeGapVersionAwareCandidateTestOnly
    .buildExpectedBundle(workspaceRoot);
  const dependency = built.ledger.dependencyBoundary;
  assert.equal(dependency.historicalDirectParentSlotsRebound, 3);
  assert.equal(dependency.readinessLedgerBindingSlotsRebound, 1);
  assert.equal(dependency.verifiedUpstreamPrivateBrandCount, 2);
  assert.equal(dependency.supportingSupersessionReceiptArtifactCount, 1);
  assert.equal(dependency.crossBrandActualSourceRightsReceiptTupleExact, true);
  assert.equal(dependency.readinessHistoricalPacketBasisRawIdentityExact, true);
  assert.equal(dependency.activeAdmissionEffect, "none");
  assert.deepEqual(built.ledger.intakeContractProjection.historicalReadinessLedgerBindingTemplate,
    baziExpertReviewIntakeGapVersionAwareCandidateTestOnly.HISTORICAL_GAP_READINESS);
  assert.deepEqual(built.ledger.intakeContractProjection.readinessLedgerBinding,
    baziExpertReviewIntakeGapVersionAwareCandidateTestOnly.READINESS_V17);
  assert.equal(built.ledger.intakeContractProjection.readinessLedgerBindingSlotsRebound, 1);
});

test("projected packet has exactly twelve locks, eleven current and one fixed bazi-core drift", async () => {
  const built = await baziExpertReviewIntakeGapVersionAwareCandidateTestOnly
    .buildExpectedBundle(workspaceRoot);
  const projection = built.ledger.packetTemplateProjection;
  const summary = projection.artifactLockSummary;
  assert.equal(projection.artifactLocks.length, 12);
  assert.equal(projection.artifactLockInspection.length, 12);
  assert.deepEqual(summary, {
    historicalPacketArtifactLockSlots: 12,
    sourceRightsArtifactLockSlotsRebound: 2,
    unchangedPacketArtifactLockSlotsChecked: 10,
    candidateProjectedArtifactLockExactMatches: 11,
    candidateProjectedArtifactLockDrifts: 1,
    packetArtifactLocksCurrent: false,
    historicalPacketDeclaredArtifactLocksVerified: 12,
    historicalDeclaredCountInterpretedAsCurrentClaim: false
  });
  const drift = projection.artifactLockInspection.filter((entry) => !entry.lockCurrent);
  assert.deepEqual(drift, [{
    artifactId: "bazi-core-fact-engine",
    path: BAZI_CORE_PATH,
    evidenceLayer: "engineering_input_fact_contract",
    lockedSha256: "73e0be8dbb2f40132158ee5dba26e493e18b686f9c888552c3e596c713301b2f",
    observedBytes: 46847,
    observedSha256: "4c9b7fc5a16cbd3e3f5ca0bed90cd950b8ef3750f204427a332a6c1a1b4e7e7f",
    lockCurrent: false
  }]);
  const sourceLock = projection.artifactLocks.find((entry) =>
    entry.artifactId === "source-binding-candidate-ledger");
  const rightsLock = projection.artifactLocks.find((entry) =>
    entry.artifactId === "source-rights-candidate-ledger");
  assert.equal(sourceLock.path, SOURCE_V16_PATH);
  assert.equal(sourceLock.sha256,
    baziExpertReviewIntakeGapVersionAwareCandidateTestOnly.SOURCE_V16.rawSha256);
  assert.equal(rightsLock.path, RIGHTS_V12_PATH);
  assert.equal(rightsLock.sha256,
    baziExpertReviewIntakeGapVersionAwareCandidateTestOnly.RIGHTS_V12.rawSha256);
});

test("two-seat same-question blinded opinions and no-winner disagreement contract is unchanged", async () => {
  const built = await baziExpertReviewIntakeGapVersionAwareCandidateTestOnly
    .buildExpectedBundle(workspaceRoot);
  const packet = built.ledger.packetTemplateProjection;
  assert.equal(packet.reviewQuestions.length, 4);
  assert.equal(packet.independenceChecklist.length, 10);
  assert.equal(packet.roleSeparation.length, 3);
  assert.equal(packet.reviewerSlots.length, 2);
  assert.equal(packet.reviewerSlots.every((slot) => slot.status === "vacant"), true);
  assert.equal(packet.reviewProcess.sameQuestionSetRequired, true);
  assert.equal(packet.reviewProcess.mutualDisclosureBeforeBothOpinionsSealedAllowed, false);
  assert.equal(packet.reviewProcess.immutableOriginalOpinionsRequired, true);
  assert.equal(packet.reviewProcess.supplementsMustBeSeparateRecords, true);
  assert.equal(packet.reviewProcess.reconciliationMayOverwriteOriginals, false);
  assert.equal(packet.disagreementPolicy.length, 7);
  assert.deepEqual(packet.automatedResolutionPolicy, {
    majorityVoteAllowed: false,
    opinionAveragingAllowed: false,
    generatedModelWinnerSelectionAllowed: false,
    unresolvedDisagreementMayBeAdopted: false,
    allowedUnresolvedDisposition: ["defer", "reject"]
  });
  const ruleInterpretation = packet.disagreementPolicy.find((entry) =>
    entry.disagreementType === "rule_interpretation");
  assert.equal(ruleInterpretation.requiredDisposition,
    "preserve_parallel_interpretations_no_winner");
});

test("historical intake projection and every expert, collection, authority and release gate stay red", async () => {
  const built = await baziExpertReviewIntakeGapVersionAwareCandidateTestOnly
    .buildExpectedBundle(workspaceRoot);
  const ledger = built.ledger;
  const intake = ledger.intakeContractProjection;
  const arrays = [
    "publicIdentityBindings",
    "originalOpinions",
    "privateOpinionSealReceipts",
    "pairwiseIndependenceAssessments",
    "disagreementInventories",
    "reconciliationNotes",
    "overallBundles"
  ];
  for (const key of arrays) assert.deepEqual(intake.currentInstances[key], [], key);
  assert.equal(Object.values(intake.currentInstances.counts).every((value) => value === 0),
    true);
  assert.equal(intake.expertReviewBundle.state, "absent");
  assert.equal(intake.expertReviewBundle.count, 0);
  assert.equal(intake.currentReadiness.candidateFeedbackCollectionReady, false);
  assert.equal(intake.currentReadiness.releaseClosureReviewReady, false);
  for (const field of [
    "identitiesVerified",
    "credentialsVerified",
    "scopesVerified",
    "reviewerSlotsOccupied",
    "currentRecordInstances",
    "sealedOriginalOpinions",
    "independentExpertReviewsVerified",
    "bindingFrozenVerified"
  ]) assert.equal(ledger.gateSummary[field], 0, field);
  for (const field of [
    "expertReviewBundleComplete",
    "candidateFeedbackCollectionReady",
    "countsTowardExpertGate",
    "sourceBundleComplete",
    "rightsBundleComplete",
    "formalActivationAllowed",
    "contentTruthEstablished",
    "expertTruthEstablished",
    "rightsLegalConclusionEstablished",
    "releaseReady",
    "publicDeploymentAuthorized",
    "expertClaimsAuthorized"
  ]) assert.equal(ledger.gateSummary[field], false, field);
  assert.equal(ledger.gateSummary.formalAdmissionPromotionBlocked, true);
  assert.deepEqual(ledger.authorityBoundary, {
    feedbackCollectionAuthorized: false,
    expertGateClosureAuthorized: false,
    formalActivationAllowed: false,
    bindingFreezeEffect: "none",
    rightsEffect: "none",
    legalConclusion: "not_established",
    contentTruthEstablished: false,
    expertTruthEstablished: false,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  });
  assert.equal(ledger.integrityBoundary.crossFileAtomicSnapshot, false);
  assert.equal(ledger.integrityBoundary.mutationEpochAvailableForSchema13, false);
  assert.equal(ledger.integrityBoundary.mutationEpochReceipt, null);
  assert.equal(ledger.integrityBoundary.intervalMutationExcludedAcrossFiles, false);
  assert.equal(ledger.integrityBoundary.abaExcluded, false);
});

test("clones, self-resealed ledgers, historical objects and cross-brand results cannot gain the brand", async () => {
  const result = await loadBaziExpertReviewIntakeGapVersionAwareCandidate(workspaceRoot);
  const built = await baziExpertReviewIntakeGapVersionAwareCandidateTestOnly
    .buildExpectedBundle(workspaceRoot);
  const historical = await baziExpertReviewIntakeGapVersionAwareCandidateTestOnly
    .readHistoricalTemplates(workspaceRoot);
  const supersession = await loadBaziDttVersionedParentSupersession(workspaceRoot);
  const readiness = await loadBaziBindingFreezeRequirementsV17(workspaceRoot);
  assert.equal(isVerifiedBaziExpertReviewIntakeGapVersionAwareCandidate(result), true);
  for (const value of [
    { ...result },
    structuredClone(result),
    JSON.parse(JSON.stringify(result)),
    built.ledger,
    structuredClone(built.ledger),
    historical.packet,
    historical.gap,
    supersession,
    readiness
  ]) assert.equal(isVerifiedBaziExpertReviewIntakeGapVersionAwareCandidate(value), false);
  assert.throws(
    () => baziExpertReviewIntakeGapVersionAwareCandidateTestOnly.assertSupersession(readiness),
    expectCode("SUPERSESSION_BRAND_REQUIRED")
  );
  assert.throws(
    () => baziExpertReviewIntakeGapVersionAwareCandidateTestOnly.assertReadiness(supersession),
    expectCode("READINESS_BRAND_REQUIRED")
  );
});

test("public capability exposes no full ledger, upstream parent body, expert PII or opinion body", async () => {
  const result = await loadBaziExpertReviewIntakeGapVersionAwareCandidate(workspaceRoot);
  const serialized = JSON.stringify(result);
  for (const forbidden of [
    '"dependencyBoundary":',
    '"packetTemplateProjection":',
    '"intakeContractProjection":',
    '"historicalTemplateLineage":',
    '"currentSourceBindingParent":',
    '"currentSourceRightsParent":',
    '"currentCandidateReadinessParent":',
    '"supportingSupersessionReceipt":',
    '"artifactLockInspection":',
    '"reviewerSlots":',
    '"originalOpinions":',
    '"body":',
    '"content":',
    '"legalName":',
    '"email":'
  ]) assert.equal(serialized.includes(forbidden), false, forbidden);
  assert.equal(path.isAbsolute(result.artifact.path), false);
});

test("legacy formal verifier remains exactly 44/47 red with INTAKE_GAP_BINDING_DRIFT first", async () => {
  const packet = await readBaziExpertReviewPacket(workspaceRoot);
  await assert.rejects(
    verifyBaziExpertReviewPacket(workspaceRoot, packet),
    expectCode("INTAKE_GAP_BINDING_DRIFT")
  );
  const childEnvironment = { ...process.env };
  delete childEnvironment.NODE_TEST_CONTEXT;
  delete childEnvironment.NODE_OPTIONS;
  const oldTests = spawnSync(process.execPath, [
    "--test",
    path.join(here, "verify-bazi-expert-review-packet.test.mjs")
  ], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: childEnvironment
  });
  const combined = `${oldTests.stdout}\n${oldTests.stderr}`;
  assert.equal(oldTests.status, 1);
  assert.match(combined, /tests 47/u);
  assert.match(combined, /pass 44/u);
  assert.match(combined, /fail 3/u);
  assert.match(combined, /INTAKE_GAP_BINDING_DRIFT/u);
  const oldCli = spawnSync(process.execPath, [
    path.join(here, "verify-bazi-expert-review-packet.mjs")
  ], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: childEnvironment
  });
  assert.equal(oldCli.status, 1);
  assert.match(oldCli.stderr, /packet 或 readiness 原始字节绑定漂移/u);
});

test("same-semantic candidate raw drift fails the final frozen raw pin", async (t) => {
  const root = await fixture(t);
  const target = path.join(root,
    BAZI_EXPERT_REVIEW_INTAKE_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  await writeFile(target, sameLengthSemanticWhitespaceDrift(await readFile(target)));
  await assert.rejects(loadBaziExpertReviewIntakeGapVersionAwareCandidate(root),
    expectCode("PERSISTED_RAW_DRIFT"));
});

test("self-resealed expert instances, collection readiness and authority promotion are rejected", async (t) => {
  const root = await fixture(t);
  await mutateJson(root,
    BAZI_EXPERT_REVIEW_INTAKE_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH,
    (value) => {
      value.intakeContractProjection.currentInstances.originalOpinions.push({ forged: true });
      value.intakeContractProjection.currentInstances.counts.originalOpinions = 1;
      value.intakeContractProjection.currentReadiness.candidateFeedbackCollectionReady = true;
      value.gateSummary.currentRecordInstances = 1;
      value.gateSummary.sealedOriginalOpinions = 1;
      value.gateSummary.independentExpertReviewsVerified = 2;
      value.gateSummary.expertReviewBundleComplete = true;
      value.gateSummary.countsTowardExpertGate = true;
      value.authorityBoundary.feedbackCollectionAuthorized = true;
      value.authorityBoundary.expertGateClosureAuthorized = true;
      value.ledgerDigest = computeBaziExpertReviewIntakeGapVersionAwareCandidateDigest(value);
    });
  await assert.rejects(loadBaziExpertReviewIntakeGapVersionAwareCandidate(root),
    expectCode("EXPERT_INTAKE_V11_MISMATCH"));
});

test("self-resealed truth, binding, release, atomicity and epoch promotion are rejected", async (t) => {
  const root = await fixture(t);
  await mutateJson(root,
    BAZI_EXPERT_REVIEW_INTAKE_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH,
    (value) => {
      value.gateSummary.bindingFrozenVerified = 12;
      value.gateSummary.formalAdmissionPromotionBlocked = false;
      value.gateSummary.formalActivationAllowed = true;
      value.gateSummary.contentTruthEstablished = true;
      value.gateSummary.expertTruthEstablished = true;
      value.gateSummary.rightsLegalConclusionEstablished = true;
      value.gateSummary.releaseReady = true;
      value.gateSummary.publicDeploymentAuthorized = true;
      value.gateSummary.expertClaimsAuthorized = true;
      value.integrityBoundary.crossFileAtomicSnapshot = true;
      value.integrityBoundary.mutationEpochAvailableForSchema13 = true;
      value.integrityBoundary.mutationEpochReceipt = "forged";
      value.integrityBoundary.intervalMutationExcludedAcrossFiles = true;
      value.integrityBoundary.abaExcluded = true;
      value.ledgerDigest = computeBaziExpertReviewIntakeGapVersionAwareCandidateDigest(value);
    });
  await assert.rejects(loadBaziExpertReviewIntakeGapVersionAwareCandidate(root),
    expectCode("EXPERT_INTAKE_V11_MISMATCH"));
});

test("source, rights, readiness and supporting receipt raw drift each fail before intake", async (t) => {
  const cases = [
    [SOURCE_V16_PATH, ["SOURCE_SUPERSESSION_RAW_DRIFT"]],
    [RIGHTS_V12_PATH, ["RIGHTS_SUPERSESSION_RAW_DRIFT"]],
    [READINESS_V17_PATH, ["PERSISTED_RAW_DRIFT"]],
    [SUPERSESSION_RECEIPT_PATH, ["PERSISTED_RAW_DRIFT", "SUPERSESSION_RECEIPT_RAW_DRIFT"]]
  ];
  for (const [relativePath, codes] of cases) {
    const root = await fixture(t);
    const target = path.join(root, relativePath);
    await writeFile(target, sameLengthSemanticWhitespaceDrift(await readFile(target)));
    await assert.rejects(
      loadBaziExpertReviewIntakeGapVersionAwareCandidate(root),
      expectOneOfCodes(codes),
      relativePath
    );
  }
});

test("historical packet and gap raw drift cannot be hidden behind historical semantic identities", async (t) => {
  const packetRoot = await fixture(t);
  const packetTarget = path.join(packetRoot, HISTORICAL_PACKET_PATH);
  await writeFile(packetTarget, Buffer.concat([await readFile(packetTarget), Buffer.from("\n")]));
  await assert.rejects(
    loadBaziExpertReviewIntakeGapVersionAwareCandidate(packetRoot),
    expectOneOfCodes([
      "HISTORICAL_PACKET_RAW_DRIFT",
      "BOUND_READINESS_BASIS_DRIFT",
      "SCOPED_ARTIFACT_DRIFT"
    ])
  );

  const gapRoot = await fixture(t);
  const gapTarget = path.join(gapRoot, HISTORICAL_GAP_PATH);
  await writeFile(gapTarget, Buffer.concat([await readFile(gapTarget), Buffer.from("\n")]));
  await assert.rejects(loadBaziExpertReviewIntakeGapVersionAwareCandidate(gapRoot),
    expectCode("HISTORICAL_GAP_RAW_DRIFT"));
});

test("a newly drifting current lock and a changed bazi-core drift both fail closed", async (t) => {
  const currentRoot = await fixture(t);
  const currentTarget = path.join(currentRoot, CURRENT_CHART_PATH);
  await writeFile(currentTarget, Buffer.concat([await readFile(currentTarget), Buffer.from("\n")]));
  await assert.rejects(
    loadBaziExpertReviewIntakeGapVersionAwareCandidate(currentRoot),
    expectOneOfCodes([
      "PROJECTED_ARTIFACT_LOCK_COUNTS_MISMATCH",
      "BOUND_READINESS_BASIS_DRIFT",
      "SCOPED_ARTIFACT_DRIFT"
    ])
  );

  const driftRoot = await fixture(t);
  const driftTarget = path.join(driftRoot, BAZI_CORE_PATH);
  await writeFile(driftTarget, Buffer.concat([await readFile(driftTarget), Buffer.from("\n")]));
  await assert.rejects(loadBaziExpertReviewIntakeGapVersionAwareCandidate(driftRoot),
    expectCode("UNEXPECTED_PRODUCTION_ARTIFACT_DRIFT"));
});

test("literal duplicates, escaped duplicates, BOM and invalid UTF-8 fail closed", async (t) => {
  for (const escaped of [false, true]) {
    const root = await fixture(t);
    const target = path.join(root,
      BAZI_EXPERT_REVIEW_INTAKE_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
    const source = await readFile(target, "utf8");
    const duplicate = escaped
      ? '  "schema\\u0056ersion": "9.9.9",\n  "schemaVersion":'
      : '  "schemaVersion": "9.9.9",\n  "schemaVersion":';
    await writeFile(target, source.replace('  "schemaVersion":', duplicate), "utf8");
    await assert.rejects(loadBaziExpertReviewIntakeGapVersionAwareCandidate(root),
      expectCode("JSON_DUPLICATE_KEY"));
  }

  const bomRoot = await fixture(t);
  const bomTarget = path.join(bomRoot,
    BAZI_EXPERT_REVIEW_INTAKE_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  await writeFile(bomTarget, Buffer.concat([
    Buffer.from([0xef, 0xbb, 0xbf]),
    await readFile(bomTarget)
  ]));
  await assert.rejects(loadBaziExpertReviewIntakeGapVersionAwareCandidate(bomRoot),
    expectCode("JSON_BOM_FORBIDDEN"));

  const utf8Root = await fixture(t);
  const utf8Target = path.join(utf8Root,
    BAZI_EXPERT_REVIEW_INTAKE_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  await writeFile(utf8Target, Buffer.from([0xc3, 0x28]));
  await assert.rejects(loadBaziExpertReviewIntakeGapVersionAwareCandidate(utf8Root),
    expectCode("JSON_UTF8_INVALID"));
});

test("Map, Date, custom instances, array holes, symbols and extra properties are non-canonical", () => {
  class CustomValue {
    constructor() {
      this.value = 1;
    }
  }
  for (const value of [new Map(), new Date(0), new CustomValue()]) {
    assert.throws(
      () => computeBaziExpertReviewIntakeGapVersionAwareCandidateDigest(value),
      expectCode("NON_JSON_OBJECT_PROTOTYPE")
    );
  }
  const hole = [];
  hole.length = 1;
  const symbolArray = [];
  symbolArray[Symbol("hidden")] = true;
  const extraArray = [];
  extraArray.extra = true;
  for (const value of [hole, symbolArray, extraArray]) {
    assert.throws(
      () => computeBaziExpertReviewIntakeGapVersionAwareCandidateDigest(value),
      expectCode("NON_JSON_ARRAY_SHAPE")
    );
  }
  const symbolObject = { value: 1 };
  symbolObject[Symbol("hidden")] = true;
  assert.throws(
    () => computeBaziExpertReviewIntakeGapVersionAwareCandidateDigest(symbolObject),
    expectCode("NON_JSON_KEY")
  );
});

test("hard-linked persisted candidate is rejected", async (t) => {
  const root = await fixture(t);
  const target = path.join(root,
    BAZI_EXPERT_REVIEW_INTAKE_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  try {
    await link(target, path.join(root, "expert-intake-v11-hardlink.json"));
  } catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP", "EXDEV"].includes(error?.code)) {
      t.skip(`platform denied hardlink fixture: ${error.code}`);
      return;
    }
    throw error;
  }
  await assert.rejects(loadBaziExpertReviewIntakeGapVersionAwareCandidate(root),
    expectCode("HARDLINK_REJECTED"));
});

test("fixed artifact path ignores a valid decoy and all extra caller arguments", async (t) => {
  const root = await fixture(t);
  const target = path.join(root,
    BAZI_EXPERT_REVIEW_INTAKE_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  const decoy = path.join(root, "expert-intake-v11-decoy.json");
  const original = await readFile(target);
  await writeFile(decoy, original);
  await writeFile(target, sameLengthSemanticWhitespaceDrift(original));
  await assert.rejects(
    loadBaziExpertReviewIntakeGapVersionAwareCandidate(root, decoy, {
      candidatePath: decoy,
      reviewerSlotsOccupied: 2,
      expertClaimsAuthorized: true
    }),
    expectCode("PERSISTED_RAW_DRIFT")
  );
});

test("candidate intrinsics survive while inherited upstream poisoning fails closed without a brand", async () => {
  const branded = await loadBaziExpertReviewIntakeGapVersionAwareCandidate(workspaceRoot);
  const digestInput = { beta: [1, true, null], alpha: "stable" };
  const expectedDigest =
    computeBaziExpertReviewIntakeGapVersionAwareCandidateDigest(digestInput);
  const originals = {
    numberIsFinite: Number.isFinite,
    objectFreeze: Object.freeze,
    objectGetOwnPropertyDescriptor: Object.getOwnPropertyDescriptor,
    objectGetPrototypeOf: Object.getPrototypeOf,
    reflectOwnKeys: Reflect.ownKeys,
    weakSetAdd: WeakSet.prototype.add,
    weakSetHas: WeakSet.prototype.has,
    arraySort: Array.prototype.sort,
    fsOpen: fsPromises.open,
    fsLstat: fsPromises.lstat,
    fsRealpath: fsPromises.realpath
  };
  const poison = () => { throw new Error("poisoned builtin invoked"); };
  let observedDigest;
  let brandedStillVerified;
  let forgedVerified;
  let upstreamError;
  try {
    Number.isFinite = poison;
    Object.freeze = poison;
    Object.getOwnPropertyDescriptor = poison;
    Object.getPrototypeOf = poison;
    Reflect.ownKeys = poison;
    WeakSet.prototype.add = poison;
    WeakSet.prototype.has = poison;
    Array.prototype.sort = poison;
    fsPromises.open = poison;
    fsPromises.lstat = poison;
    fsPromises.realpath = poison;
    syncBuiltinESMExports();
    observedDigest =
      computeBaziExpertReviewIntakeGapVersionAwareCandidateDigest(digestInput);
    brandedStillVerified =
      isVerifiedBaziExpertReviewIntakeGapVersionAwareCandidate(branded);
    forgedVerified =
      isVerifiedBaziExpertReviewIntakeGapVersionAwareCandidate({});
    try {
      await loadBaziExpertReviewIntakeGapVersionAwareCandidate(workspaceRoot);
    } catch (error) {
      upstreamError = error;
    }
  } finally {
    Number.isFinite = originals.numberIsFinite;
    Object.freeze = originals.objectFreeze;
    Object.getOwnPropertyDescriptor = originals.objectGetOwnPropertyDescriptor;
    Object.getPrototypeOf = originals.objectGetPrototypeOf;
    Reflect.ownKeys = originals.reflectOwnKeys;
    WeakSet.prototype.add = originals.weakSetAdd;
    WeakSet.prototype.has = originals.weakSetHas;
    Array.prototype.sort = originals.arraySort;
    fsPromises.open = originals.fsOpen;
    fsPromises.lstat = originals.fsLstat;
    fsPromises.realpath = originals.fsRealpath;
    syncBuiltinESMExports();
  }
  assert.equal(observedDigest, expectedDigest);
  assert.equal(brandedStillVerified, true);
  assert.equal(forgedVerified, false);
  assert.equal(upstreamError?.code, "JSON_BYTES_INVALID");
  assert.match(upstreamError?.cause?.cause?.cause?.message ?? "",
    /poisoned builtin invoked/);
  assert.equal(
    isVerifiedBaziExpertReviewIntakeGapVersionAwareCandidate(upstreamError),
    false
  );
});

test("WeakSet poisoning cannot forge or erase the private candidate brand", async () => {
  const branded = await loadBaziExpertReviewIntakeGapVersionAwareCandidate(workspaceRoot);
  const originalHas = WeakSet.prototype.has;
  try {
    WeakSet.prototype.has = () => true;
    assert.equal(isVerifiedBaziExpertReviewIntakeGapVersionAwareCandidate({}), false);
    assert.equal(isVerifiedBaziExpertReviewIntakeGapVersionAwareCandidate(branded), true);
  } finally {
    WeakSet.prototype.has = originalHas;
  }
});

test("accessors and caller toJSON are never invoked by candidate digesting", () => {
  let invocations = 0;
  const hostile = {
    get toJSON() {
      invocations += 1;
      return () => ({ expertClaimsAuthorized: true });
    }
  };
  assert.throws(
    () => computeBaziExpertReviewIntakeGapVersionAwareCandidateDigest(hostile),
    expectCode("NON_PASSIVE_OBJECT")
  );
  assert.equal(invocations, 0);
});

test("same-length drift cannot be hidden by fs clean-clone, Hash or FileHandle poisoning", async (t) => {
  const root = await fixture(t);
  const target = path.resolve(root,
    BAZI_EXPERT_REVIEW_INTAKE_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  const cleanClone = path.resolve(root, "expert-intake-v11-clean-clone.json");
  const originalBytes = await readFile(target);
  const driftedBytes = sameLengthSemanticWhitespaceDrift(originalBytes);
  await writeFile(cleanClone, originalBytes);
  await writeFile(target, driftedBytes);

  const originalOpen = fsPromises.open;
  const originalLstat = fsPromises.lstat;
  const originalRealpath = fsPromises.realpath;
  const originalCreateHash = crypto.createHash;
  const hashPrototype = Object.getPrototypeOf(createHash("sha256"));
  const originalHashUpdate = hashPrototype.update;
  const originalHashDigest = hashPrototype.digest;
  const targetedHashes = new WeakSet();
  const probe = await open(target, "r");
  const fileHandlePrototype = Object.getPrototypeOf(probe);
  const originalHandleReadFile = fileHandlePrototype.readFile;
  await probe.close();
  const targetKey = target.toLowerCase();
  const redirectsTarget = (value) => typeof value === "string"
    && path.resolve(value).toLowerCase() === targetKey;
  try {
    fsPromises.open = (value, ...args) => originalOpen(
      redirectsTarget(value) ? cleanClone : value,
      ...args
    );
    fsPromises.lstat = (value, ...args) => originalLstat(
      redirectsTarget(value) ? cleanClone : value,
      ...args
    );
    fsPromises.realpath = (value, ...args) => originalRealpath(value, ...args);
    crypto.createHash = (...args) => Reflect.apply(originalCreateHash, crypto, args);
    hashPrototype.update = function poisonedUpdate(data, ...args) {
      const observed = Buffer.isBuffer(data)
        ? data
        : Buffer.from(data, typeof args[0] === "string" ? args[0] : "utf8");
      if (observed.equals(driftedBytes)) targetedHashes.add(this);
      return Reflect.apply(originalHashUpdate, this, [data, ...args]);
    };
    hashPrototype.digest = function poisonedDigest(...args) {
      if (targetedHashes.has(this)) {
        const expected = baziExpertReviewIntakeGapVersionAwareCandidateTestOnly
          .EXPECTED_PERSISTED.rawSha256;
        return args[0] === "hex" ? expected : Buffer.from(expected, "hex");
      }
      return Reflect.apply(originalHashDigest, this, args);
    };
    fileHandlePrototype.readFile = async function poisonedReadFile(...args) {
      const actual = await Reflect.apply(originalHandleReadFile, this, args);
      return actual.equals(driftedBytes) ? Buffer.from(originalBytes) : actual;
    };
    syncBuiltinESMExports();
    await assert.rejects(loadBaziExpertReviewIntakeGapVersionAwareCandidate(root),
      expectCode("PERSISTED_RAW_DRIFT"));
  } finally {
    fsPromises.open = originalOpen;
    fsPromises.lstat = originalLstat;
    fsPromises.realpath = originalRealpath;
    crypto.createHash = originalCreateHash;
    hashPrototype.update = originalHashUpdate;
    hashPrototype.digest = originalHashDigest;
    fileHandlePrototype.readFile = originalHandleReadFile;
    syncBuiltinESMExports();
  }
});

test("CLI is mandatory and emits only the exact narrow red candidate contract", () => {
  const cliPath = path.join(workspaceRoot, VERSION_AWARE_CLI_PATH);
  const childEnvironment = { ...process.env };
  delete childEnvironment.NODE_TEST_CONTEXT;
  delete childEnvironment.NODE_OPTIONS;
  const run = spawnSync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: childEnvironment
  });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stderr, "");
  const prefix =
    "BAZI_EXPERT_REVIEW_INTAKE_GAP_VERSION_AWARE_CANDIDATE_MECHANICS_OK ";
  assert.equal(run.stdout.startsWith(prefix), true);
  const payload = JSON.parse(run.stdout.slice(prefix.length));
  assert.deepEqual(Object.keys(payload), [
    "versionAwareExpertReviewIntakeGapMechanicallyVerified",
    "candidateResultWeakSetBrandVerified",
    "ledgerId",
    "ledgerDigest",
    "artifact",
    "fixedDefaultGovernance",
    "activeAdmissionEffect",
    "parentAccounting",
    "artifactLockAccounting",
    "reviewerSeatAccounting",
    "collectionRedGates",
    "authorityRedGates",
    "observationRedGates",
    "releaseRedGates"
  ]);
  assert.equal(payload.versionAwareExpertReviewIntakeGapMechanicallyVerified, true);
  assert.equal(payload.candidateResultWeakSetBrandVerified, true);
  assert.equal(payload.activeAdmissionEffect, "none");
  assert.equal(payload.ledgerDigest,
    "5318b9543bad20c52e5129901e94aa2ca3d2dd68f342ba11ab9611f4f767d582");
  assert.deepEqual(payload.fixedDefaultGovernance, {
    activeLine: "legacy-v13",
    targetSchema: 13,
    migrationId: null
  });
  assert.deepEqual(payload.parentAccounting, {
    historicalDirectParentSlotsRebound: 3,
    verifiedUpstreamPrivateBrandCount: 2,
    supportingReceiptArtifactCount: 1
  });
  assert.deepEqual(payload.artifactLockAccounting, {
    packetArtifactLocksRequired: 12,
    candidateProjectedArtifactLockExactMatches: 11,
    candidateProjectedArtifactLockDrifts: 1,
    packetArtifactLocksCurrent: false
  });
  assert.deepEqual(payload.reviewerSeatAccounting, {
    domainExpertsRequired: 2,
    vacantReviewerSeats: 2,
    realReviewerInstances: 0,
    independentExpertReviewsVerified: 0
  });
  assert.deepEqual(payload.collectionRedGates, {
    currentRecordInstances: 0,
    sealedOriginalOpinions: 0,
    candidateFeedbackCollectionReady: false,
    expertReviewBundleComplete: false
  });
  assert.equal(payload.authorityRedGates.formalAdmissionPromotionBlocked, true);
  assert.equal(payload.authorityRedGates.bindingRequired, 12);
  assert.equal(payload.authorityRedGates.bindingFrozenVerified, 0);
  for (const group of [
    payload.collectionRedGates,
    payload.authorityRedGates,
    payload.observationRedGates,
    payload.releaseRedGates
  ]) {
    for (const [key, value] of Object.entries(group)) {
      if (["bindingRequired", "currentRecordInstances", "sealedOriginalOpinions",
        "bindingFrozenVerified", "mutationEpochReceipt"].includes(key)) continue;
      if (key === "formalAdmissionPromotionBlocked") assert.equal(value, true);
      else assert.equal(value, false, key);
    }
  }
  assert.equal(payload.observationRedGates.mutationEpochReceipt, null);
  assert.equal(path.isAbsolute(payload.artifact.path), false);
  const serialized = JSON.stringify(payload);
  for (const forbidden of [
    "dependencyBoundary",
    "packetTemplateProjection",
    "intakeContractProjection",
    "currentSourceBindingParent",
    "supportingSupersessionReceipt",
    "reviewerSlots",
    "originalOpinions",
    "legalName",
    "email",
    workspaceRoot
  ]) assert.equal(serialized.includes(forbidden), false, forbidden);

  const argvRun = spawnSync(process.execPath, [cliPath, "--candidate", "forged.json"], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: childEnvironment
  });
  assert.equal(argvRun.status, 1);
  assert.equal(argvRun.stdout, "");
  assert.equal(argvRun.stderr,
    "BAZI_EXPERT_REVIEW_INTAKE_GAP_VERSION_AWARE_CANDIDATE_MECHANICS_FAILED CLI_ARGUMENTS_FORBIDDEN\n");

  const injectedRun = spawnSync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: { ...childEnvironment, NODE_OPTIONS: "--no-warnings" }
  });
  assert.equal(injectedRun.status, 1);
  assert.equal(injectedRun.stdout, "");
  assert.equal(injectedRun.stderr,
    "BAZI_EXPERT_REVIEW_INTAKE_GAP_VERSION_AWARE_CANDIDATE_MECHANICS_FAILED VISIBLE_NODE_LOADER_OPTIONS_FORBIDDEN\n");
});

test("every directly raw-bound text file and the new slice use LF bytes", async () => {
  const paths = [
    ...FIXTURE_PATHS,
    VERSION_AWARE_LIB_PATH,
    VERSION_AWARE_CLI_PATH,
    VERSION_AWARE_TEST_PATH
  ];
  for (const relativePath of new Set(paths)) {
    const bytes = await readFile(path.join(workspaceRoot, relativePath));
    assert.equal(bytes.includes(0x0d), false, `${relativePath} contains CR bytes`);
    assert.equal(bytes.at(-1), 0x0a, `${relativePath} lacks final LF`);
  }
});

test("old, default, runtime, C-M1, policy, engineering-gap and PR chains remain isolated", async () => {
  const capabilityName = "bazi-expert-review-intake-gap-version-aware-candidate";
  const candidateArtifact =
    BAZI_EXPERT_REVIEW_INTAKE_GAP_VERSION_AWARE_CANDIDATE_RELATIVE_PATH;
  const consumers = [
    "scripts/bazi-expert-review-packet-lib.mjs",
    "scripts/verify-bazi-expert-review-packet.mjs",
    "scripts/bazi-expert-authority-material-precheck-lib.mjs",
    "scripts/bazi-expert-public-candidate-prescreen-lib.mjs",
    "scripts/bazi-expert-public-evidence-followup-lib.mjs",
    "scripts/bazi-domain-release-manifest-lib.mjs",
    "scripts/system-admission-registry-lib.mjs",
    "scripts/bazi-project-copy-materialization-lib.mjs",
    "scripts/bazi-project-copy-materialization-version-aware-candidate-lib.mjs",
    "scripts/bazi-policy-weights-value-evidence-candidate-lib.mjs",
    "scripts/bazi-policy-weights-version-aware-candidate-lib.mjs",
    "scripts/bazi-engineering-binding-value-subject-gap-lib.mjs",
    "scripts/bazi-engineering-value-subject-gap-version-aware-candidate-lib.mjs",
    "scripts/bazi-pr10bc-scope-reconciliation-lib.mjs",
    "scripts/bazi-pr10bc-version-aware-candidate-lib.mjs",
    "packages/bazi-interpretation/src/index.ts",
    "apps/web/src/components/bazi-interpretation-panel.tsx",
    "apps/web/src/components/bazi-strength-evidence-ledger.tsx"
  ];
  for (const relativePath of consumers) {
    const source = await readFile(path.join(workspaceRoot, relativePath), "utf8");
    assert.equal(source.includes(capabilityName), false, relativePath);
    assert.equal(source.includes(candidateArtifact), false, relativePath);
  }
  const newLib = await readFile(path.join(workspaceRoot, VERSION_AWARE_LIB_PATH), "utf8");
  for (const unrelated of [
    "bazi-project-copy-materialization-version-aware-candidate",
    "bazi-policy-weights-version-aware-candidate",
    "bazi-policy-weights-value-evidence-candidate",
    "bazi-engineering-value-subject-gap-version-aware-candidate",
    "bazi-engineering-binding-value-subject-gap",
    "bazi-pr10bc-version-aware-candidate",
    "bazi-pr10bc-scope-reconciliation"
  ]) assert.equal(newLib.includes(unrelated), false, unrelated);
  const packageJson = JSON.parse(await readFile(path.join(workspaceRoot, "package.json"), "utf8"));
  for (const scriptName of ["build", "test", "typecheck", "prebuild", "pretest", "pretypecheck"]) {
    const script = packageJson.scripts?.[scriptName] ?? "";
    assert.equal(script.includes(capabilityName), false, scriptName);
  }
});
