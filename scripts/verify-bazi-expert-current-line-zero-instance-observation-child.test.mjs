import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import {
  BaziExpertCurrentLineZeroInstanceObservationChildError,
  baziExpertCurrentLineZeroInstanceObservationChildTestOnly as testOnly,
  buildBaziExpertCurrentLineZeroInstanceObservationChild,
  computeBaziExpertCurrentLineZeroInstanceObservationChildDigest,
  getBaziExpertCurrentLineZeroInstanceObservationChildSummary,
  isVerifiedBaziExpertCurrentLineZeroInstanceObservationChild,
  loadBaziExpertCurrentLineZeroInstanceObservationChild,
  serializeBaziExpertCurrentLineZeroInstanceObservationChild,
  verifyBaziExpertCurrentLineZeroInstanceObservationChild
} from "./bazi-expert-current-line-zero-instance-observation-child-lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const CLI = path.join(HERE, "verify-bazi-expert-current-line-zero-instance-observation-child.mjs");
const LIB = path.join(HERE, "bazi-expert-current-line-zero-instance-observation-child-lib.mjs");
const ARTIFACT = path.join(ROOT, "content", "system-admission", "bazi-expert-current-line-zero-instance-observation-child.v1.0.0.json");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function codeIs(expected) {
  return (error) => error instanceof BaziExpertCurrentLineZeroInstanceObservationChildError
    && error.code === expected;
}

test("exact persisted loader grants the private brand and builder does not", async () => {
  const built = await buildBaziExpertCurrentLineZeroInstanceObservationChild(ROOT);
  const loaded = await loadBaziExpertCurrentLineZeroInstanceObservationChild(ROOT);
  assert.equal(isVerifiedBaziExpertCurrentLineZeroInstanceObservationChild(built), false);
  assert.equal(isVerifiedBaziExpertCurrentLineZeroInstanceObservationChild(loaded), true);
  assert.deepEqual(built, loaded);
  assert.equal(Object.isFrozen(loaded), true);
});

test("persisted raw bytes, SHA-256, self digest and deterministic serialization are frozen", async () => {
  const bytes = await readFile(ARTIFACT);
  const parsed = JSON.parse(bytes.toString("utf8"));
  assert.equal(bytes.length, testOnly.EXPECTED_PERSISTED.rawBytes);
  assert.equal(sha256(bytes), testOnly.EXPECTED_PERSISTED.rawSha256);
  assert.equal(parsed.childDigest, testOnly.EXPECTED_PERSISTED.childDigest);
  assert.equal(parsed.childDigest, computeBaziExpertCurrentLineZeroInstanceObservationChildDigest(parsed));
  assert.equal(bytes.toString("utf8"), serializeBaziExpertCurrentLineZeroInstanceObservationChild(parsed));
});

test("both current parents are full-loader privately branded and exact", async () => {
  const { readiness, authority } = await testOnly.loadCurrentParents(ROOT);
  assert.doesNotThrow(() => testOnly.assertReadinessParent(readiness));
  assert.doesNotThrow(() => testOnly.assertAuthorityParent(authority));
  assert.throws(() => testOnly.assertReadinessParent({ ...readiness }), codeIs("READINESS_V19_BRAND_REQUIRED"));
  assert.throws(() => testOnly.assertAuthorityParent({ ...authority }), codeIs("AUTHORITY_PRECHECK_BRAND_REQUIRED"));
});

test("historical intake and privacy are same-buffer raw+self observations only", async () => {
  const history = await testOnly.loadHistoricalObservations(ROOT);
  assert.equal(history.intakeSnapshot.rawBytes, testOnly.HISTORICAL_INTAKE.rawBytes);
  assert.equal(history.intakeSnapshot.rawSha256, testOnly.HISTORICAL_INTAKE.rawSha256);
  assert.equal(history.privacySnapshot.rawBytes, testOnly.HISTORICAL_PRIVACY.rawBytes);
  assert.equal(history.privacySnapshot.rawSha256, testOnly.HISTORICAL_PRIVACY.rawSha256);
  assert.doesNotThrow(() => testOnly.assertHistoricalIntake(history.intake));
  assert.doesNotThrow(() => testOnly.assertHistoricalPrivacy(history.privacy));
});

test("historical changes remain rejected even after attacker self-reseals", async () => {
  const history = await testOnly.loadHistoricalObservations(ROOT);
  const intake = clone(history.intake);
  intake.intakeContractProjection.currentInstances.counts.originalOpinions = 1;
  intake.ledgerDigest = testOnly.computeHistoricalLedgerDigest(intake, testOnly.HISTORICAL_INTAKE.digestDomain);
  assert.throws(() => testOnly.assertHistoricalIntake(intake), codeIs("HISTORICAL_SELF_DIGEST_INVALID"));
  const privacy = clone(history.privacy);
  privacy.zeroInstanceGate.identitiesVerified = 1;
  privacy.ledgerDigest = testOnly.computeHistoricalLedgerDigest(privacy, testOnly.HISTORICAL_PRIVACY.digestDomain);
  assert.throws(() => testOnly.assertHistoricalPrivacy(privacy), codeIs("HISTORICAL_SELF_DIGEST_INVALID"));
});

test("strict historical parser rejects duplicate keys, BOM and invalid UTF-8", () => {
  assert.throws(
    () => testOnly.parseStrictJson({ bytes: Buffer.from('{"a":1,"\\u0061":2}', "utf8") }),
    codeIs("JSON_DUPLICATE_KEY")
  );
  assert.throws(
    () => testOnly.parseStrictJson({ bytes: Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d]) }),
    codeIs("JSON_BYTES_INVALID")
  );
  assert.throws(
    () => testOnly.parseStrictJson({ bytes: Buffer.from([0xc3, 0x28]) }),
    codeIs("JSON_BYTES_INVALID")
  );
});

test("review contract is exactly two vacant seats, four questions and ten factors", async () => {
  const child = await loadBaziExpertCurrentLineZeroInstanceObservationChild(ROOT);
  assert.deepEqual(child.reviewContract.reviewerSeatIds, ["domain-expert-a", "domain-expert-b"]);
  assert.equal(child.reviewContract.reviewerSeats.length, 2);
  assert.ok(child.reviewContract.reviewerSeats.every((seat) => seat.status === "vacant"));
  assert.equal(child.reviewContract.reviewQuestionIds.length, 4);
  assert.equal(child.reviewContract.independenceFactorIds.length, 10);
});

test("no-winner policy forbids voting, averaging, model choice and unresolved adoption", async () => {
  const policy = (await loadBaziExpertCurrentLineZeroInstanceObservationChild(ROOT)).reviewContract.noWinnerPolicy;
  assert.deepEqual(policy, {
    allowedUnresolvedDisposition: ["defer", "reject"],
    generatedModelWinnerSelectionAllowed: false,
    majorityVoteAllowed: false,
    opinionAveragingAllowed: false,
    unresolvedDisagreementMayBeAdopted: false
  });
});

test("all identity, credential, independence, opinion and bundle counters remain zero", async () => {
  const child = await loadBaziExpertCurrentLineZeroInstanceObservationChild(ROOT);
  assert.equal(child.currentMechanicalGate.bindingFrozenVerified, 0);
  assert.equal(child.currentMechanicalGate.bindingRequired, 12);
  assert.equal(child.currentMechanicalGate.domainExpertReviewsVerified, 0);
  const projection = child.historicalPersistedZeroInstanceProjection;
  for (const [key, value] of Object.entries(projection)) {
    if (key === "projectionIsCurrentRealityAttestation") assert.equal(value, false);
    else assert.equal(value, 0, key);
  }
});

test("collection, persistence, truth, legal, release and public authority stay false", async () => {
  const child = await loadBaziExpertCurrentLineZeroInstanceObservationChild(ROOT);
  for (const value of Object.values(child.authorityBoundary)) assert.equal(value, false);
  assert.equal(child.currentMechanicalGate.activeAdmissionEffect, "none");
  assert.equal(child.releaseGovernance.publicDeploymentAuthorized, false);
  assert.equal(child.releaseGovernance.expertClaimsAuthorized, false);
});

test("private material non-access is not promoted into a real-world absence claim", async () => {
  const boundary = (await loadBaziExpertCurrentLineZeroInstanceObservationChild(ROOT)).materialAccessBoundary;
  assert.equal(boundary.privateDossierArtifactsReadByThisChild, 0);
  assert.equal(boundary.privateOpinionFilesReadByThisChild, 0);
  assert.equal(boundary.realPersonMaterialCollectedByThisChild, 0);
  assert.equal(boundary.realWorldPrivateMaterialExistenceAssessed, false);
  assert.equal(boundary.absenceOfPrivateMaterialInRealityClaimed, false);
});

test("Manifest currentness and report drift receipt remain outside this child", async () => {
  const boundary = (await loadBaziExpertCurrentLineZeroInstanceObservationChild(ROOT)).manifestBoundary;
  assert.equal(boundary.manifestCurrentness, "not_assessed_by_this_child");
  assert.equal(boundary.formalManifestLoadedByThisChild, false);
  assert.equal(boundary.reportContractDriftReceiptConsumedByThisChild, false);
  assert.equal(boundary.currentFullDomainManifestEstablished, false);
});

test("knowledge-core old/new attribution is exact without invoking stale loaders", async () => {
  const drift = (await loadBaziExpertCurrentLineZeroInstanceObservationChild(ROOT)).knowledgeCoreDriftAttribution;
  assert.deepEqual(drift.previousIdentity, testOnly.PREVIOUS_KNOWLEDGE_CORE);
  assert.deepEqual(drift.currentIdentity, testOnly.CURRENT_KNOWLEDGE_CORE);
  assert.equal(drift.knownFailClosedCode, "BOUND_READINESS_BASIS_DRIFT");
  assert.equal(drift.staleIntakeOrPrivacyLoaderExecutedByThisChild, false);
});

test("library never imports stale intake/privacy full loaders", async () => {
  const source = await readFile(LIB, "utf8");
  assert.equal(source.includes('from "./bazi-expert-review-intake-gap-version-aware-candidate-lib.mjs"'), false);
  assert.equal(source.includes('from "./bazi-expert-privacy-formal-intake-reconciliation-lib.mjs"'), false);
  assert.equal(source.includes("loadBaziExpertReviewIntakeGapVersionAwareCandidate"), false);
  assert.equal(source.includes("loadBaziExpertPrivacyFormalIntakeReconciliation"), false);
});

test("clone and self-resealed authority elevation cannot gain the child brand", async () => {
  const loaded = await loadBaziExpertCurrentLineZeroInstanceObservationChild(ROOT);
  const forged = clone(loaded);
  forged.authorityBoundary.expertClaimsAuthorized = true;
  forged.childDigest = computeBaziExpertCurrentLineZeroInstanceObservationChildDigest(forged);
  assert.equal(isVerifiedBaziExpertCurrentLineZeroInstanceObservationChild(clone(loaded)), false);
  assert.equal(isVerifiedBaziExpertCurrentLineZeroInstanceObservationChild(forged), false);
  await assert.rejects(
    verifyBaziExpertCurrentLineZeroInstanceObservationChild(ROOT, forged),
    codeIs("CALLER_PERSISTED_MISMATCH")
  );
});

test("atomic, epoch, interval, ABA and replay boundaries remain false/null", async () => {
  const boundary = (await loadBaziExpertCurrentLineZeroInstanceObservationChild(ROOT)).observationBoundary;
  assert.equal(boundary.crossFileAtomicSnapshot, false);
  assert.equal(boundary.mutationEpochAvailableForSchema13, false);
  assert.equal(boundary.mutationEpochReceipt, null);
  assert.equal(boundary.intervalMutationExcludedAcrossFiles, false);
  assert.equal(boundary.abaExcluded, false);
  assert.equal(boundary.replayExcluded, false);
});

test("builder avoids Promise.all, Array push and array iteration after import", async () => {
  const parents = await testOnly.loadCurrentParents(ROOT);
  const history = await testOnly.loadHistoricalObservations(ROOT);
  const originalAll = Promise.all;
  const originalPush = Array.prototype.push;
  const originalIterator = Array.prototype[Symbol.iterator];
  try {
    Promise.all = () => { throw new Error("poisoned Promise.all"); };
    Array.prototype.push = () => { throw new Error("poisoned push"); };
    Array.prototype[Symbol.iterator] = function* poisonedIterator() { throw new Error("poisoned iterator"); };
    const child = testOnly.buildChild(
      parents.readiness,
      parents.authority,
      history.intakeSnapshot,
      history.privacySnapshot
    );
    assert.equal(child.currentMechanicalGate.bindingFrozenVerified, 0);
  } finally {
    Promise.all = originalAll;
    Array.prototype.push = originalPush;
    Array.prototype[Symbol.iterator] = originalIterator;
  }
});

test("captured child WeakSet intrinsics resist post-import poisoning", async () => {
  const loaded = await loadBaziExpertCurrentLineZeroInstanceObservationChild(ROOT);
  const originalAdd = WeakSet.prototype.add;
  const originalHas = WeakSet.prototype.has;
  try {
    WeakSet.prototype.add = () => { throw new Error("poisoned add"); };
    WeakSet.prototype.has = () => true;
    assert.equal(isVerifiedBaziExpertCurrentLineZeroInstanceObservationChild(loaded), true);
    assert.equal(isVerifiedBaziExpertCurrentLineZeroInstanceObservationChild(clone(loaded)), false);
  } finally {
    WeakSet.prototype.add = originalAdd;
    WeakSet.prototype.has = originalHas;
  }
});

test("captured Object.isFrozen prevents a mutable branded result after post-import poisoning", async () => {
  const nativeIsFrozen = Object.isFrozen;
  try {
    Object.isFrozen = () => true;
    const loaded = await loadBaziExpertCurrentLineZeroInstanceObservationChild(ROOT);
    assert.equal(isVerifiedBaziExpertCurrentLineZeroInstanceObservationChild(loaded), true);
    assert.equal(Reflect.apply(nativeIsFrozen, Object, [loaded]), true);
    assert.equal(Reflect.apply(nativeIsFrozen, Object, [loaded.currentMechanicalGate]), true);
    assert.equal(Reflect.apply(nativeIsFrozen, Object, [loaded.authorityBoundary]), true);
    assert.equal(Reflect.apply(nativeIsFrozen, Object, [loaded.releaseGovernance]), true);
    assert.throws(() => {
      loaded.currentMechanicalGate.domainExpertReviewsVerified = 2;
    }, TypeError);
    assert.throws(() => {
      loaded.authorityBoundary.expertTruthEstablished = true;
    }, TypeError);
    assert.throws(() => {
      loaded.releaseGovernance.releaseIdentity = "forged-release";
    }, TypeError);
    const summary = getBaziExpertCurrentLineZeroInstanceObservationChildSummary(loaded);
    assert.equal(summary.domainExpertsVerified, 0);
    assert.equal(summary.expertTruthEstablished, false);
    assert.equal(summary.releaseIdentity, "legacy-v13");
  } finally {
    Object.isFrozen = nativeIsFrozen;
  }
});

test("summary requires the exact loader brand and remains narrowly red", async () => {
  const loaded = await loadBaziExpertCurrentLineZeroInstanceObservationChild(ROOT);
  const summary = getBaziExpertCurrentLineZeroInstanceObservationChildSummary(loaded);
  assert.equal(summary.currentPrivateBrandsVerified, 2);
  assert.equal(summary.historicalRawSelfObservationsVerified, 2);
  assert.equal(summary.domainExpertsVerified, 0);
  assert.equal(summary.templateReviewerSeatsVacant, 2);
  assert.equal(summary.historicalPersistedOriginalOpinions, 0);
  assert.equal(summary.historicalPersistedPairwiseIndependenceAssessments, 0);
  assert.equal(summary.historicalPersistedDisagreementInventories, 0);
  assert.equal(summary.historicalPersistedExpertReviewBundles, 0);
  assert.equal(summary.historicalProjectionIsCurrentRealityAttestation, false);
  assert.equal(summary.realWorldPrivateMaterialExistenceAssessed, false);
  assert.equal(summary.absenceOfPrivateMaterialInRealityClaimed, false);
  assert.equal(summary.manifestCurrentness, "not_assessed_by_this_child");
  assert.throws(() => getBaziExpertCurrentLineZeroInstanceObservationChildSummary(clone(loaded)), codeIs("CHILD_BRAND_REQUIRED"));
});

test("CLI emits one calibrated non-authoritative summary", () => {
  const run = spawnSync(process.execPath, [CLI], { cwd: ROOT, encoding: "utf8", env: { ...process.env, NODE_OPTIONS: "" } });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stderr, "");
  assert.match(run.stdout, /^BAZI_EXPERT_CURRENT_LINE_ZERO_INSTANCE_OBSERVATION_CHILD_OK \{/u);
  const summary = JSON.parse(run.stdout.slice(run.stdout.indexOf("{")).trim());
  assert.equal(summary.bindingFrozenVerified, 0);
  assert.equal(summary.domainExpertsVerified, 0);
  assert.equal(summary.templateReviewerSeatsVacant, 2);
  assert.equal(summary.historicalPersistedOriginalOpinions, 0);
  assert.equal(summary.historicalProjectionIsCurrentRealityAttestation, false);
  assert.equal(summary.realWorldPrivateMaterialExistenceAssessed, false);
  assert.equal(summary.absenceOfPrivateMaterialInRealityClaimed, false);
  assert.equal("reviewerSlotsVacant" in summary, false);
  assert.equal("originalOpinions" in summary, false);
  assert.equal(summary.releaseReady, false);
  assert.equal(summary.publicDeploymentAuthorized, false);
  assert.equal(summary.expertClaimsAuthorized, false);
});

test("CLI rejects operands and visible preload options with fixed non-leaking output", () => {
  const operand = spawnSync(process.execPath, [CLI, "unexpected"], { cwd: ROOT, encoding: "utf8", env: { ...process.env, NODE_OPTIONS: "" } });
  assert.equal(operand.status, 1);
  assert.equal(operand.stdout, "");
  assert.equal(operand.stderr, "BAZI_EXPERT_CURRENT_LINE_ZERO_INSTANCE_OBSERVATION_CHILD_FAILED VERIFICATION_FAILED\n");
  const preload = spawnSync(process.execPath, [CLI], { cwd: ROOT, encoding: "utf8", env: { ...process.env, NODE_OPTIONS: "--trace-warnings" } });
  assert.equal(preload.status, 1);
  assert.equal(preload.stderr, "BAZI_EXPERT_CURRENT_LINE_ZERO_INSTANCE_OBSERVATION_CHILD_FAILED VERIFICATION_FAILED\n");
});

test("importing the CLI is side-effect free", () => {
  const code = `await import(${JSON.stringify(pathToFileURL(CLI).href)}); process.stdout.write("IMPORTED\\n");`;
  const run = spawnSync(process.execPath, ["--input-type=module", "-e", code], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "" }
  });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stderr, "");
  assert.equal(run.stdout, "IMPORTED\n");
});
