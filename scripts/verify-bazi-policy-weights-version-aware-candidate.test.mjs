import test from "node:test";
import assert from "node:assert/strict";
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
import crypto, { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BAZI_POLICY_WEIGHTS_VERSION_AWARE_CANDIDATE_RELATIVE_PATH,
  computeBaziPolicyWeightsVersionAwareCandidateDigest,
  isVerifiedBaziPolicyWeightsVersionAwareCandidate,
  loadBaziPolicyWeightsVersionAwareCandidate,
  baziPolicyWeightsVersionAwareCandidateTestOnly
} from "./bazi-policy-weights-version-aware-candidate-lib.mjs";
import {
  verifyBaziPolicyWeightsValueEvidenceCandidate
} from "./bazi-policy-weights-value-evidence-candidate-lib.mjs";
import {
  loadBaziEngineeringValueSubjectGapVersionAwareCandidate
} from "./bazi-engineering-value-subject-gap-version-aware-candidate-lib.mjs";
import {
  loadBaziBindingFreezeRequirementsV17
} from "./bazi-dtt-version-aware-readiness-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(here, "..");
const HISTORICAL_POLICY_PATH =
  "content/system-admission/bazi-policy-weights-value-evidence-candidate.v1.json";
const CANDIDATE_GAP_PATH =
  "content/system-admission/bazi-engineering-binding-value-subject-gaps.v1.1.0.json";
const CANDIDATE_READINESS_PATH =
  "content/system-admission/bazi-binding-freeze-requirements.v1.7.0.json";
const ENGINEERING_PARENT_PATH =
  "content/bazi-strength-engineering-binding-candidates.v1.json";
const POLICY_SOURCE_PATH = "packages/bazi-interpretation/src/strength-policy.ts";
const ASSESSMENT_SOURCE_PATH =
  "packages/bazi-interpretation/src/strength-assessment-core.ts";

const EXPECTED_VALUE_SUBJECT_TUPLES = Object.freeze([
  Object.freeze({
    valueSubjectId: "bazi.engineering.weights.values.v1",
    projectionDigest: "7321a50bd8d46a0c4d5dce816544c6999c1e7e356bf4a33262b38f7408f02fd4"
  }),
  Object.freeze({
    valueSubjectId: "bazi.engineering.weights.dispatch.v1",
    projectionDigest: "29f672fd738d2ace9fb6def48c8ff061f63f94d4fccf9e817d6d82dcb6290d8d"
  }),
  Object.freeze({
    valueSubjectId: "bazi.engineering.weights.guard-and-consumers.v1",
    projectionDigest: "bbd5aee0c69926cd582bfc15782db3876c2d8d145d7796c469c001f8f0b25716"
  })
]);

const FIXTURE_PATHS = Object.freeze([
  "content/bazi-strength-source-binding-candidates.v1.json",
  "content/bazi-strength-source-rights-candidates.v1.json",
  "content/bazi-strength-source-binding-candidates.v1.6.0.json",
  "content/bazi-strength-source-rights-candidates.v1.2.0.json",
  ENGINEERING_PARENT_PATH,
  "content/bazi-strength-expert-review-packet.v1.json",
  "content/system-admission/bazi-prc-copyright-law-public-evidence.v1.json",
  "content/system-admission/bazi-dtt-month-command-public-evidence.v1.json",
  "content/system-admission/bazi-dtt-notice-reconciliation.v1.json",
  "content/system-admission/bazi-dtt-notice-reconciliation.v2.json",
  "content/system-admission/bazi-dtt-versioned-parent-supersession.v1.json",
  "content/system-admission/bazi-binding-freeze-requirements.v1.json",
  CANDIDATE_READINESS_PATH,
  "content/system-admission/bazi-pr10bc-scope-reconciliation.v1.json",
  "content/system-admission/bazi-pr10bc-scope-reconciliation.v1.1.0.json",
  "content/system-admission/bazi-engineering-binding-value-subject-gaps.v1.json",
  CANDIDATE_GAP_PATH,
  HISTORICAL_POLICY_PATH,
  BAZI_POLICY_WEIGHTS_VERSION_AWARE_CANDIDATE_RELATIVE_PATH,
  "docs/阶段C-DTT月令候选公开证据-child-v1-2026-08-29.md",
  ASSESSMENT_SOURCE_PATH,
  "packages/bazi-interpretation/src/strength-claim-registry.ts",
  POLICY_SOURCE_PATH,
  "packages/bazi-interpretation/src/strength-sensitivity-review.ts",
  "packages/bazi-interpretation/src/interpretation-evidence-envelope.ts",
  "packages/bazi-interpretation/src/source-refs.ts",
  "packages/bazi-core/src/index.ts",
  "apps/web/src/components/bazi-strength-evidence-ledger.tsx",
  "apps/web/src/components/bazi-interpretation-panel.tsx",
  "apps/web/src/lib/local-ai-draft-validation.ts",
  "packages/research-export/src/single-chart-report.ts",
  "packages/contracts/src/index.ts",
  "packages/knowledge-core/src/index.ts",
  "package-lock.json"
]);

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-policy-v11-test-"));
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

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sameLengthSemanticWhitespaceDrift(bytes) {
  const source = bytes.toString("utf8");
  const drifted = source.replace('  "schemaVersion"', '\t "schemaVersion"');
  assert.notEqual(drifted, source);
  const result = Buffer.from(drifted, "utf8");
  assert.equal(result.byteLength, bytes.byteLength);
  return result;
}

test("live policy v1.1 is narrow, private-branded and keeps every authority gate red", async () => {
  const result = await loadBaziPolicyWeightsVersionAwareCandidate(workspaceRoot);
  assert.equal(isVerifiedBaziPolicyWeightsVersionAwareCandidate(result), true);
  assert.deepEqual(Object.keys(result), [
    "versionAwarePolicyWeightsCandidateMechanicallyVerified",
    "activeAdmissionEffect",
    "candidateId",
    "candidateDigest",
    "artifact",
    "versionAwareCandidateParentArtifacts",
    "historicalPolicyWeightProjectionReusedAfterUnchangedDirectEngineeringBasisRawIdentityMatchAndBrandedParentRebind",
    "bindingIdentityChanged",
    "parallelBindingsCreated",
    "bindingId",
    "policyVersion",
    "policyWeightValueKeysObserved",
    "scopedValueSubjectCount",
    "stablePolicyDispatchSyntaxObserved",
    "directConsumerCallShapeCount",
    "sourceEvidenceRefsBound",
    "formalSourceRightsRecordCount",
    "formalSourceCarrierRecordCount",
    "engineeringRationalesFrozen",
    "engineeringReviewsVerified",
    "expertReviewsVerified",
    "independentDomainReviewsVerified",
    "bindingFreezeEligible",
    "scopedBindingFrozenVerified",
    "scopedWeightsCurrentDistributionBoundary",
    "sourceBundleComplete",
    "rightsBundleComplete",
    "expertReviewBundleComplete",
    "formalAdmissionPromotionBlocked",
    "formalActivationAllowed",
    "contentTruthEstablished",
    "expertTruthEstablished",
    "rightsLegalConclusionEstablished",
    "browserRuntimeEvidenceEstablished",
    "releaseReady",
    "publicDeploymentAuthorized",
    "expertClaimsAuthorized",
    "crossFileAtomicSnapshot",
    "mutationEpochAvailableForSchema13",
    "mutationEpochReceipt",
    "intervalMutationExcludedAcrossFiles",
    "abaExcluded"
  ]);
  assert.equal("candidate" in result, false);
  assert.equal("ledger" in result, false);
  assert.equal("readiness" in result, false);
  assert.equal(result.versionAwarePolicyWeightsCandidateMechanicallyVerified, true);
  assert.equal(result.activeAdmissionEffect, "none");
  assert.equal(result.versionAwareCandidateParentArtifacts, 2);
  assert.equal(
    result.historicalPolicyWeightProjectionReusedAfterUnchangedDirectEngineeringBasisRawIdentityMatchAndBrandedParentRebind,
    true
  );
  assert.equal(result.bindingIdentityChanged, false);
  assert.equal(result.parallelBindingsCreated, 0);
  assert.equal(result.bindingId, "binding:policy:weights");
  assert.equal(result.policyVersion, "hakimi.bazi.strength_policy/0.1.0");
  assert.equal(result.policyWeightValueKeysObserved, 4);
  assert.equal(result.scopedValueSubjectCount, 3);
  assert.equal(result.stablePolicyDispatchSyntaxObserved, true);
  assert.equal(result.directConsumerCallShapeCount, 3);
  assert.equal(result.sourceEvidenceRefsBound, 0);
  assert.equal(result.formalSourceRightsRecordCount, 0);
  assert.equal(result.formalSourceCarrierRecordCount, 0);
  assert.equal(result.engineeringRationalesFrozen, 0);
  assert.equal(result.engineeringReviewsVerified, 0);
  assert.equal(result.expertReviewsVerified, 0);
  assert.equal(result.independentDomainReviewsVerified, 0);
  assert.equal(result.bindingFreezeEligible, false);
  assert.equal(result.scopedBindingFrozenVerified, false);
  assert.equal(result.scopedWeightsCurrentDistributionBoundary,
    "local_repository_only_no_distribution_clearance");
  assert.equal(result.sourceBundleComplete, false);
  assert.equal(result.rightsBundleComplete, false);
  assert.equal(result.expertReviewBundleComplete, false);
  assert.equal(result.formalAdmissionPromotionBlocked, true);
  assert.equal(result.formalActivationAllowed, false);
  assert.equal(result.contentTruthEstablished, false);
  assert.equal(result.expertTruthEstablished, false);
  assert.equal(result.rightsLegalConclusionEstablished, false);
  assert.equal(result.browserRuntimeEvidenceEstablished, false);
  assert.equal(result.releaseReady, false);
  assert.equal(result.publicDeploymentAuthorized, false);
  assert.equal(result.expertClaimsAuthorized, false);
  assert.equal(result.crossFileAtomicSnapshot, false);
  assert.equal(result.mutationEpochAvailableForSchema13, false);
  assert.equal(result.mutationEpochReceipt, null);
  assert.equal(result.intervalMutationExcludedAcrossFiles, false);
  assert.equal(result.abaExcluded, false);
});

test("deterministic builder reproduces frozen raw and semantic identities", async () => {
  const first = await baziPolicyWeightsVersionAwareCandidateTestOnly
    .buildExpectedBundle(workspaceRoot);
  const second = await baziPolicyWeightsVersionAwareCandidateTestOnly
    .buildExpectedBundle(workspaceRoot);
  assert.deepEqual(first.candidate, second.candidate);
  assert.equal(first.snapshot.rawBytes,
    baziPolicyWeightsVersionAwareCandidateTestOnly.EXPECTED_PERSISTED.rawBytes);
  assert.equal(first.snapshot.rawSha256,
    baziPolicyWeightsVersionAwareCandidateTestOnly.EXPECTED_PERSISTED.rawSha256);
  assert.equal(first.candidate.candidateDigest,
    baziPolicyWeightsVersionAwareCandidateTestOnly.EXPECTED_PERSISTED.candidateDigest);
  assert.equal(computeBaziPolicyWeightsVersionAwareCandidateDigest(first.candidate),
    first.candidate.candidateDigest);
});

test("historical policy stays byte-for-byte frozen and template-only", async () => {
  const bytes = await readFile(path.join(workspaceRoot, HISTORICAL_POLICY_PATH));
  assert.equal(bytes.byteLength, 10397);
  assert.equal(sha256(bytes),
    "91a6c9f10e1b56da1292133c6e276c437c7fb8b2c6dbca9bed2b54bcfa9726e6");
  const next = JSON.parse(await readFile(path.join(workspaceRoot,
    BAZI_POLICY_WEIGHTS_VERSION_AWARE_CANDIDATE_RELATIVE_PATH), "utf8"));
  assert.equal(next.historicalLineage.candidateDigest,
    "208ae39797d048b2fc869392528a3cf7d1858de232a8691bc0296366d6363088");
  assert.equal(next.historicalLineage.role,
    "fixed_policy_weight_projection_template_only_not_current_capability");
});

test("binding, value, evidence and authority projections remain exact historical values", async () => {
  const historical = JSON.parse(await readFile(path.join(workspaceRoot,
    HISTORICAL_POLICY_PATH), "utf8"));
  const next = JSON.parse(await readFile(path.join(workspaceRoot,
    BAZI_POLICY_WEIGHTS_VERSION_AWARE_CANDIDATE_RELATIVE_PATH), "utf8"));
  assert.deepEqual(next.releaseGovernance, historical.releaseGovernance);
  assert.deepEqual(next.policyBinding, historical.policyBinding);
  assert.deepEqual(next.valueEvidenceRecords, historical.valueEvidenceRecords);
  assert.deepEqual(next.externalEvidence, historical.externalEvidence);
  assert.deepEqual(next.authorityBoundary, historical.authorityBoundary);
});

test("scope, gate and does-not-establish data only gain candidate-qualified metadata", async () => {
  const historical = JSON.parse(await readFile(path.join(workspaceRoot,
    HISTORICAL_POLICY_PATH), "utf8"));
  const next = JSON.parse(await readFile(path.join(workspaceRoot,
    BAZI_POLICY_WEIGHTS_VERSION_AWARE_CANDIDATE_RELATIVE_PATH), "utf8"));
  const scope = structuredClone(next.scopeBoundary);
  delete scope.versionAwareCandidateParentRebound;
  delete scope.activeAdmissionEffect;
  assert.deepEqual(scope, historical.scopeBoundary);
  const gate = structuredClone(next.gateSummary);
  delete gate.versionAwareCandidateParentArtifacts;
  delete gate.historicalPolicyWeightProjectionReusedAfterUnchangedDirectEngineeringBasisRawIdentityMatchAndBrandedParentRebind;
  delete gate.bindingIdentityChanged;
  delete gate.parallelBindingsCreated;
  delete gate.activeAdmissionEffect;
  delete gate.formalAdmissionPromotionBlocked;
  assert.deepEqual(gate, historical.gateSummary);
  assert.deepEqual(next.doesNotEstablish.slice(0, -2), historical.doesNotEstablish);
  assert.equal(next.doesNotEstablish.at(-2), "active_readiness_or_formal_admission");
  assert.equal(next.doesNotEstablish.at(-1), "formal_parent_identity");
});

test("two of five basis positions rebind while three direct raw identities remain exact", async () => {
  const historical = JSON.parse(await readFile(path.join(workspaceRoot,
    HISTORICAL_POLICY_PATH), "utf8"));
  const next = JSON.parse(await readFile(path.join(workspaceRoot,
    BAZI_POLICY_WEIGHTS_VERSION_AWARE_CANDIDATE_RELATIVE_PATH), "utf8"));
  assert.equal(next.basisArtifacts.length, 5);
  assert.equal(next.basisArtifacts[1].path, CANDIDATE_GAP_PATH);
  assert.equal(next.basisArtifacts[1].role,
    "version_aware_engineering_value_subject_gap_candidate_parent");
  assert.equal(next.basisArtifacts[2].path, CANDIDATE_READINESS_PATH);
  assert.equal(next.basisArtifacts[2].role, "version_aware_candidate_readiness_parent");
  for (const index of [0, 3, 4]) {
    const current = next.basisArtifacts[index];
    const old = historical.basisArtifacts[index];
    assert.deepEqual({
      path: current.path,
      role: current.role,
      bytes: current.bytes,
      sha256: current.sha256
    }, {
      path: old.path,
      role: old.role,
      bytes: old.bytes,
      sha256: old.sha256
    });
    assert.equal(current.pointInTimeRawIdentityVerified, true);
    assert.equal(current.currentProjectionInspectionReexecutedByThisLayer, false);
    assert.equal("heldFileHandleRead" in current, false);
    assert.equal("hashAndInspectionUseSameBuffer" in current, false);
  }
});

test("all three policy value, dispatch and guard-consumer projections stay exact", async () => {
  const next = JSON.parse(await readFile(path.join(workspaceRoot,
    BAZI_POLICY_WEIGHTS_VERSION_AWARE_CANDIDATE_RELATIVE_PATH), "utf8"));
  assert.deepEqual(next.policyBinding.valueSubjectIds,
    EXPECTED_VALUE_SUBJECT_TUPLES.map((entry) => entry.valueSubjectId));
  assert.deepEqual(next.valueEvidenceRecords.map((entry) => ({
    valueSubjectId: entry.valueSubjectId,
    projectionDigest: entry.projectionDigest
  })), EXPECTED_VALUE_SUBJECT_TUPLES);
  assert.deepEqual(next.valueEvidenceRecords[0].repositoryProjection, {
    monthCommand: 4,
    visibleStem: 2,
    firstHiddenStem: 2,
    otherHiddenStem: 1
  });
  assert.deepEqual(next.valueEvidenceRecords[1].repositoryProjection, {
    monthCommand: "monthCommand",
    visibleStem: "visibleStem",
    hiddenIndexZero: "firstHiddenStem",
    hiddenOtherIndex: "otherHiddenStem"
  });
  assert.deepEqual(next.valueEvidenceRecords[2].repositoryProjection, {
    invalidHiddenIndexRejected: true,
    consumerCalls: ["month_command", "visible_stem", "hidden_stem_with_index"]
  });
  assert.equal(next.valueEvidenceRecords.every((entry) =>
    entry.valueProvenanceFrozen === false
      && entry.independentDomainReviewed === false
      && entry.runtimeExecutionObserved === false
      && entry.freezeEffect === "none"), true);
});

test("observation wording separates direct raw checks from branded parent rebinds", async () => {
  const next = JSON.parse(await readFile(path.join(workspaceRoot,
    BAZI_POLICY_WEIGHTS_VERSION_AWARE_CANDIDATE_RELATIVE_PATH), "utf8"));
  assert.equal(next.observationBoundary.directHistoricalPolicyRawAndSemanticIdentityVerified, true);
  assert.equal(
    next.observationBoundary.historicalPolicyWeightProjectionReusedAfterUnchangedDirectEngineeringBasisRawIdentityMatchAndBrandedParentRebind,
    true
  );
  assert.equal(next.observationBoundary.unchangedDirectBasisPointInTimeRawIdentitiesVerified, 3);
  assert.equal(next.observationBoundary.upstreamBrandedDependenciesVerified, true);
  assert.equal(next.observationBoundary.nestedVerifierSameBufferTransitivityClaimed, false);
  assert.equal(next.observationBoundary.stableExecutableSyntaxProjectionReusedAfterRawIdentityMatch,
    true);
  assert.equal(next.observationBoundary.generalControlFlowEquivalenceMechanicallyEstablished,
    false);
  assert.equal(next.observationBoundary.generalDataFlowEquivalenceMechanicallyEstablished,
    false);
  assert.equal(next.observationBoundary.runtimeExecutionObserved, false);
  assert.equal("directBasisHashAndParseUseSameReadBuffer" in next.observationBoundary, false);
  assert.equal("directSourceHashAndAstInspectionUseSameReadBuffer" in next.observationBoundary,
    false);
});

test("this layer directly requires both upstream WeakSet brands and exact scoped rows", async () => {
  const candidateGap = await loadBaziEngineeringValueSubjectGapVersionAwareCandidate(workspaceRoot);
  const candidateReadiness = await loadBaziBindingFreezeRequirementsV17(workspaceRoot);
  const gapRow = baziPolicyWeightsVersionAwareCandidateTestOnly.assertCandidateGap(candidateGap);
  const readinessRow = baziPolicyWeightsVersionAwareCandidateTestOnly
    .assertCandidateReadiness(candidateReadiness);
  assert.equal(gapRow.bindingId, "binding:policy:weights");
  assert.deepEqual(gapRow.valueSubjects.map((entry) => ({
    valueSubjectId: entry.valueSubjectId,
    projectionDigest: entry.projectionDigest
  })), EXPECTED_VALUE_SUBJECT_TUPLES);
  assert.equal(gapRow.bindingFreezeEligible, false);
  assert.equal(gapRow.freezeEffect, "none");
  assert.equal(readinessRow.bindingId, "binding:policy:weights");
  assert.deepEqual(readinessRow.candidateIds,
    ["hakimi-strength-weights-0.1.0-engineering-candidate-v1"]);
  assert.equal(readinessRow.currentDistributionBoundary,
    "local_repository_only_no_distribution_clearance");
  assert.equal(readinessRow.formalDistributionPolicy, null);
  assert.equal(readinessRow.bindingDigest, null);
  assert.throws(() => baziPolicyWeightsVersionAwareCandidateTestOnly
    .assertCandidateGap(structuredClone(candidateGap)),
  expectCode("CANDIDATE_GAP_BRAND_REQUIRED"));
  assert.throws(() => baziPolicyWeightsVersionAwareCandidateTestOnly
    .assertCandidateReadiness(structuredClone(candidateReadiness)),
  expectCode("CANDIDATE_READINESS_BRAND_REQUIRED"));
  assert.throws(() => baziPolicyWeightsVersionAwareCandidateTestOnly
    .assertCandidateGap(candidateReadiness),
  expectCode("CANDIDATE_GAP_BRAND_REQUIRED"));
  assert.throws(() => baziPolicyWeightsVersionAwareCandidateTestOnly
    .assertCandidateReadiness(candidateGap),
  expectCode("CANDIDATE_READINESS_BRAND_REQUIRED"));
  const source = await readFile(path.join(workspaceRoot,
    "scripts/bazi-policy-weights-version-aware-candidate-lib.mjs"), "utf8");
  assert.match(source, /const scopedGapRow = assertCandidateGap\(candidateGap\);/u);
  assert.match(source,
    /const scopedReadinessRow = assertCandidateReadiness\(candidateReadiness\);/u);
});

test("clones, builder projections, old candidates and other brands never gain this brand", async () => {
  const branded = await loadBaziPolicyWeightsVersionAwareCandidate(workspaceRoot);
  const bundle = await baziPolicyWeightsVersionAwareCandidateTestOnly
    .buildExpectedBundle(workspaceRoot);
  const oldCandidate = JSON.parse(await readFile(path.join(workspaceRoot,
    HISTORICAL_POLICY_PATH), "utf8"));
  const gapBrand = await loadBaziEngineeringValueSubjectGapVersionAwareCandidate(workspaceRoot);
  const readinessBrand = await loadBaziBindingFreezeRequirementsV17(workspaceRoot);
  assert.equal(isVerifiedBaziPolicyWeightsVersionAwareCandidate(structuredClone(branded)), false);
  assert.equal(isVerifiedBaziPolicyWeightsVersionAwareCandidate(bundle.candidate), false);
  assert.equal(isVerifiedBaziPolicyWeightsVersionAwareCandidate(oldCandidate), false);
  assert.equal(isVerifiedBaziPolicyWeightsVersionAwareCandidate(gapBrand), false);
  assert.equal(isVerifiedBaziPolicyWeightsVersionAwareCandidate(readinessBrand), false);
  assert.equal(isVerifiedBaziPolicyWeightsVersionAwareCandidate({
    ...branded,
    candidateDigest: branded.candidateDigest
  }), false);
});

test("returned narrow capability is deeply frozen without exposing a full candidate", async () => {
  const result = await loadBaziPolicyWeightsVersionAwareCandidate(workspaceRoot);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.artifact), true);
  assert.equal("candidate" in result, false);
  assert.throws(() => {
    result.artifact.sha256 = "0".repeat(64);
  }, TypeError);
  assert.throws(() => {
    result.publicDeploymentAuthorized = true;
  }, TypeError);
});

test("legacy policy chain remains red before it can consume the independent v1.1 candidate", async () => {
  const historical = JSON.parse(await readFile(path.join(workspaceRoot,
    HISTORICAL_POLICY_PATH), "utf8"));
  await assert.rejects(
    verifyBaziPolicyWeightsValueEvidenceCandidate(workspaceRoot, historical),
    expectCode("PARENT_LEDGER_DRIFT")
  );
});

test("same-semantic whitespace drift fails the v1.1 raw pin", async (t) => {
  const root = await fixture(t);
  const target = path.join(root,
    BAZI_POLICY_WEIGHTS_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  const original = await readFile(target);
  await writeFile(target, sameLengthSemanticWhitespaceDrift(original));
  await assert.rejects(loadBaziPolicyWeightsVersionAwareCandidate(root),
    expectCode("PERSISTED_RAW_DRIFT"));
});

test("self-resealed value, freeze, rights and authority promotion is rejected", async (t) => {
  const root = await fixture(t);
  await mutateJson(root, BAZI_POLICY_WEIGHTS_VERSION_AWARE_CANDIDATE_RELATIVE_PATH,
    (value) => {
      value.valueEvidenceRecords[0].repositoryProjection.monthCommand = 40;
      value.authorityBoundary.bindingFreezeEligible = true;
      value.authorityBoundary.bindingFrozenVerified = true;
      value.externalEvidence.sourceRightsRecordId = "rights:forged";
      value.gateSummary.releaseReady = true;
      value.gateSummary.publicDeploymentAuthorized = true;
      value.candidateDigest = computeBaziPolicyWeightsVersionAwareCandidateDigest(value);
    });
  await assert.rejects(loadBaziPolicyWeightsVersionAwareCandidate(root),
    expectCode("POLICY_V11_MISMATCH"));
});

test("self-resealed atomicity epoch receipt and ABA promotion is rejected", async (t) => {
  const root = await fixture(t);
  await mutateJson(root, BAZI_POLICY_WEIGHTS_VERSION_AWARE_CANDIDATE_RELATIVE_PATH,
    (value) => {
      value.observationBoundary.crossFileAtomicSnapshot = true;
      value.observationBoundary.mutationEpochAvailableForSchema13 = true;
      value.observationBoundary.mutationEpochReceipt = "forged";
      value.observationBoundary.intervalMutationExcluded = true;
      value.observationBoundary.abaExcluded = true;
      value.candidateDigest = computeBaziPolicyWeightsVersionAwareCandidateDigest(value);
    });
  await assert.rejects(loadBaziPolicyWeightsVersionAwareCandidate(root),
    expectCode("POLICY_V11_MISMATCH"));
});

test("candidate gap raw drift cannot reach policy v1.1", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, CANDIDATE_GAP_PATH);
  await writeFile(target, sameLengthSemanticWhitespaceDrift(await readFile(target)));
  await assert.rejects(loadBaziPolicyWeightsVersionAwareCandidate(root),
    expectCode("PERSISTED_RAW_DRIFT"));
});

test("candidate readiness raw drift cannot reach policy v1.1", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, CANDIDATE_READINESS_PATH);
  await writeFile(target, sameLengthSemanticWhitespaceDrift(await readFile(target)));
  await assert.rejects(loadBaziPolicyWeightsVersionAwareCandidate(root),
    expectCode("PERSISTED_RAW_DRIFT"));
});

test("each unchanged engineering, policy and assessment basis drifting fails closed", async (t) => {
  for (const { relativePath, code } of [
    { relativePath: ENGINEERING_PARENT_PATH, code: "BOUND_READINESS_BASIS_DRIFT" },
    { relativePath: POLICY_SOURCE_PATH, code: "SCOPED_ARTIFACT_DRIFT" },
    { relativePath: ASSESSMENT_SOURCE_PATH, code: "SCOPED_ARTIFACT_DRIFT" }
  ]) {
    const root = await fixture(t);
    const target = path.join(root, relativePath);
    await writeFile(target, Buffer.concat([await readFile(target), Buffer.from("\n")]));
    await assert.rejects(loadBaziPolicyWeightsVersionAwareCandidate(root),
      expectCode(code), relativePath);
  }
});

test("historical policy raw drift cannot be hidden by its semantic digest", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, HISTORICAL_POLICY_PATH);
  await writeFile(target, Buffer.concat([await readFile(target), Buffer.from("\n")]));
  await assert.rejects(loadBaziPolicyWeightsVersionAwareCandidate(root),
    expectCode("HISTORICAL_POLICY_RAW_DRIFT"));
});

test("duplicate and escaped duplicate keys fail closed", async (t) => {
  const root = await fixture(t);
  const target = path.join(root,
    BAZI_POLICY_WEIGHTS_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  const source = await readFile(target, "utf8");
  await writeFile(target, source.replace('  "schemaVersion":',
    '  "schema\\u0056ersion": "9.9.9",\n  "schemaVersion":'), "utf8");
  await assert.rejects(loadBaziPolicyWeightsVersionAwareCandidate(root),
    expectCode("JSON_DUPLICATE_KEY"));
});

test("BOM and invalid UTF-8 persisted bytes fail closed", async (t) => {
  const bomRoot = await fixture(t);
  const bomTarget = path.join(bomRoot,
    BAZI_POLICY_WEIGHTS_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  await writeFile(bomTarget, Buffer.concat([
    Buffer.from([0xef, 0xbb, 0xbf]),
    await readFile(bomTarget)
  ]));
  await assert.rejects(loadBaziPolicyWeightsVersionAwareCandidate(bomRoot),
    expectCode("JSON_BOM_FORBIDDEN"));

  const utf8Root = await fixture(t);
  const utf8Target = path.join(utf8Root,
    BAZI_POLICY_WEIGHTS_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  await writeFile(utf8Target, Buffer.from([0xc3, 0x28]));
  await assert.rejects(loadBaziPolicyWeightsVersionAwareCandidate(utf8Root),
    expectCode("JSON_UTF8_INVALID"));
});

test("hard-linked persisted policy v1.1 is rejected", async (t) => {
  const root = await fixture(t);
  const target = path.join(root,
    BAZI_POLICY_WEIGHTS_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  try {
    await link(target, path.join(root, "policy-v11-hardlink.json"));
  } catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP", "EXDEV"].includes(error?.code)) {
      t.skip(`platform denied hardlink fixture: ${error.code}`);
      return;
    }
    throw error;
  }
  await assert.rejects(loadBaziPolicyWeightsVersionAwareCandidate(root),
    expectCode("HARDLINK_REJECTED"));
});

test("captured builtins survive post-import same-realm poisoning", async () => {
  const originals = {
    objectFreeze: Object.freeze,
    objectGetOwnPropertyDescriptor: Object.getOwnPropertyDescriptor,
    reflectOwnKeys: Reflect.ownKeys,
    weakSetAdd: WeakSet.prototype.add,
    weakSetHas: WeakSet.prototype.has,
    arraySlice: Array.prototype.slice,
    fsOpen: fsPromises.open,
    fsLstat: fsPromises.lstat,
    fsRealpath: fsPromises.realpath
  };
  const poison = () => { throw new Error("poisoned builtin invoked"); };
  try {
    Object.freeze = poison;
    Object.getOwnPropertyDescriptor = poison;
    Reflect.ownKeys = poison;
    WeakSet.prototype.add = poison;
    WeakSet.prototype.has = poison;
    Array.prototype.slice = poison;
    fsPromises.open = poison;
    fsPromises.lstat = poison;
    fsPromises.realpath = poison;
    syncBuiltinESMExports();
    const result = await loadBaziPolicyWeightsVersionAwareCandidate(workspaceRoot);
    assert.equal(result.policyWeightValueKeysObserved, 4);
    assert.equal(result.scopedBindingFrozenVerified, false);
  } finally {
    Object.freeze = originals.objectFreeze;
    Object.getOwnPropertyDescriptor = originals.objectGetOwnPropertyDescriptor;
    Reflect.ownKeys = originals.reflectOwnKeys;
    WeakSet.prototype.add = originals.weakSetAdd;
    WeakSet.prototype.has = originals.weakSetHas;
    Array.prototype.slice = originals.arraySlice;
    fsPromises.open = originals.fsOpen;
    fsPromises.lstat = originals.fsLstat;
    fsPromises.realpath = originals.fsRealpath;
    syncBuiltinESMExports();
  }
});

test("captured WeakSet has cannot be poisoned into forging the private brand", async () => {
  const branded = await loadBaziPolicyWeightsVersionAwareCandidate(workspaceRoot);
  const originalHas = WeakSet.prototype.has;
  try {
    WeakSet.prototype.has = () => true;
    assert.equal(isVerifiedBaziPolicyWeightsVersionAwareCandidate({}), false);
    assert.equal(isVerifiedBaziPolicyWeightsVersionAwareCandidate(branded), true);
  } finally {
    WeakSet.prototype.has = originalHas;
  }
});

test("same-length drift cannot be hidden by fs clean-clone, Hash or FileHandle poisoning", async (t) => {
  const root = await fixture(t);
  const target = path.resolve(root,
    BAZI_POLICY_WEIGHTS_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  const cleanClone = path.resolve(root, "policy-v11-clean-clone.json");
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
        const expected = baziPolicyWeightsVersionAwareCandidateTestOnly
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
    await assert.rejects(loadBaziPolicyWeightsVersionAwareCandidate(root),
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

test("a valid decoy and extra caller arguments cannot replace the fixed artifact", async (t) => {
  const root = await fixture(t);
  const target = path.join(root,
    BAZI_POLICY_WEIGHTS_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  const decoy = path.join(root, "policy-v11-decoy.json");
  const original = await readFile(target);
  await writeFile(decoy, original);
  await writeFile(target, sameLengthSemanticWhitespaceDrift(original));
  await assert.rejects(
    loadBaziPolicyWeightsVersionAwareCandidate(root, decoy, {
      candidatePath: decoy,
      publicDeploymentAuthorized: true
    }),
    expectCode("PERSISTED_RAW_DRIFT")
  );
});

test("CLI emits only the fixed narrow mechanical contract and every red gate", () => {
  const cliPath = path.join(here, "verify-bazi-policy-weights-version-aware-candidate.mjs");
  const run = spawnSync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.signal, null);
  assert.equal(run.stderr, "");
  const prefix = "BAZI_POLICY_WEIGHTS_VERSION_AWARE_CANDIDATE_MECHANICS_OK ";
  assert.equal(run.stdout.startsWith(prefix), true);
  assert.equal(run.stdout.endsWith("\n"), true);
  const payload = JSON.parse(run.stdout.slice(prefix.length));
  assert.deepEqual(Object.keys(payload).sort(), [
    "abaExcluded",
    "activeAdmissionEffect",
    "activeLine",
    "artifact",
    "bindingFreezeEligible",
    "bindingId",
    "bindingIdentityChanged",
    "browserRuntimeEvidenceEstablished",
    "candidateDigest",
    "candidateId",
    "contentTruthEstablished",
    "crossFileAtomicSnapshot",
    "directConsumerCallShapeCount",
    "engineeringRationalesFrozen",
    "engineeringReviewsVerified",
    "expertClaimsAuthorized",
    "expertReviewBundleComplete",
    "expertReviewsVerified",
    "expertTruthEstablished",
    "formalActivationAllowed",
    "formalAdmissionPromotionBlocked",
    "formalSourceCarrierRecordCount",
    "formalSourceRightsRecordCount",
    "historicalPolicyWeightProjectionReusedAfterUnchangedDirectEngineeringBasisRawIdentityMatchAndBrandedParentRebind",
    "independentDomainReviewsVerified",
    "intervalMutationExcludedAcrossFiles",
    "migrationId",
    "mutationEpochAvailableForSchema13",
    "mutationEpochReceipt",
    "parallelBindingsCreated",
    "policyVersion",
    "policyWeightValueKeysObserved",
    "publicDeploymentAuthorized",
    "releaseReady",
    "rightsBundleComplete",
    "rightsLegalConclusionEstablished",
    "scopedBindingFrozenVerified",
    "scopedValueSubjectCount",
    "scopedWeightsCurrentDistributionBoundary",
    "sourceBundleComplete",
    "sourceEvidenceRefsBound",
    "stablePolicyDispatchSyntaxObserved",
    "targetSchema",
    "versionAwareCandidateParentArtifacts",
    "versionAwarePolicyWeightsCandidateMechanicallyVerified"
  ].sort());
  assert.equal("candidate" in payload, false);
  assert.equal("ledger" in payload, false);
  assert.equal("readiness" in payload, false);
  for (const forbidden of ["factorWeights", "monthCommand", "visibleStem", "firstHiddenStem", "otherHiddenStem"]) {
    assert.equal(run.stdout.includes(`\"${forbidden}\"`), false, forbidden);
  }
  assert.equal(payload.activeLine, "legacy-v13");
  assert.equal(payload.targetSchema, 13);
  assert.equal(payload.migrationId, null);
  assert.equal(payload.activeAdmissionEffect, "none");
  assert.equal(payload.formalAdmissionPromotionBlocked, true);
  assert.equal(payload.formalActivationAllowed, false);
  for (const field of [
    "bindingFreezeEligible",
    "scopedBindingFrozenVerified",
    "sourceBundleComplete",
    "rightsBundleComplete",
    "expertReviewBundleComplete",
    "contentTruthEstablished",
    "expertTruthEstablished",
    "rightsLegalConclusionEstablished",
    "browserRuntimeEvidenceEstablished",
    "releaseReady",
    "publicDeploymentAuthorized",
    "expertClaimsAuthorized",
    "crossFileAtomicSnapshot",
    "mutationEpochAvailableForSchema13",
    "intervalMutationExcludedAcrossFiles",
    "abaExcluded"
  ]) {
    assert.equal(payload[field], false, field);
  }
  assert.equal(payload.mutationEpochReceipt, null);
});

test("every directly raw-bound policy text path is pinned to LF checkout semantics", async () => {
  const attributes = new Set((await readFile(path.join(workspaceRoot, ".gitattributes"), "utf8"))
    .split(/\r?\n/u));
  const requiredPaths = [
    HISTORICAL_POLICY_PATH,
    CANDIDATE_GAP_PATH,
    CANDIDATE_READINESS_PATH,
    ENGINEERING_PARENT_PATH,
    POLICY_SOURCE_PATH,
    ASSESSMENT_SOURCE_PATH,
    BAZI_POLICY_WEIGHTS_VERSION_AWARE_CANDIDATE_RELATIVE_PATH,
    "scripts/bazi-policy-weights-version-aware-candidate-lib.mjs",
    "scripts/verify-bazi-policy-weights-version-aware-candidate.mjs",
    "scripts/verify-bazi-policy-weights-version-aware-candidate.test.mjs",
    "docs/阶段C-policy-weights版本感知候选-v1-2026-08-30.md"
  ];
  for (const relativePath of requiredPaths) {
    assert.equal(attributes.has(`/${relativePath} text eol=lf`), true, relativePath);
  }
});

test("old C-M1, default and runtime consumers do not import the new policy capability", async () => {
  const paths = [
    "scripts/bazi-policy-weights-value-evidence-candidate-lib.mjs",
    "scripts/verify-bazi-policy-weights-value-evidence-candidate.mjs",
    "scripts/bazi-project-copy-materialization-lib.mjs",
    "scripts/verify-bazi-project-copy-materialization.mjs",
    "scripts/bazi-expert-review-packet-lib.mjs",
    "scripts/bazi-expert-authority-material-precheck-lib.mjs",
    "scripts/bazi-private-exact-quote-material-verifier-lib.mjs",
    "scripts/bazi-domain-release-manifest-lib.mjs",
    "scripts/system-admission-registry-lib.mjs",
    "scripts/cross-system-engineering-fact-receipt-lib.mjs",
    "packages/bazi-interpretation/src/index.ts",
    POLICY_SOURCE_PATH,
    ASSESSMENT_SOURCE_PATH,
    "packages/bazi-interpretation/src/strength-claim-registry.ts",
    "apps/web/src/components/bazi-interpretation-panel.tsx",
    "apps/web/src/components/bazi-strength-evidence-ledger.tsx"
  ];
  for (const relativePath of paths) {
    const source = await readFile(path.join(workspaceRoot, relativePath), "utf8");
    assert.equal(source.includes("bazi-policy-weights-version-aware-candidate"), false,
      relativePath);
    assert.equal(source.includes(BAZI_POLICY_WEIGHTS_VERSION_AWARE_CANDIDATE_RELATIVE_PATH),
      false, relativePath);
  }
  const packageJson = JSON.parse(await readFile(path.join(workspaceRoot, "package.json"), "utf8"));
  for (const scriptName of ["build", "test", "typecheck", "prebuild", "pretest", "pretypecheck"]) {
    const script = packageJson.scripts?.[scriptName] ?? "";
    assert.equal(script.includes("verify-bazi-policy-weights-version-aware-candidate"), false,
      scriptName);
    assert.equal(script.includes("bazi-policy-weights-version-aware-candidate"), false,
      scriptName);
  }
});
