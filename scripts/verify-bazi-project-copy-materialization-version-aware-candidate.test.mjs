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
  BAZI_PROJECT_COPY_MATERIALIZATION_VERSION_AWARE_CANDIDATE_RELATIVE_PATH,
  computeBaziProjectCopyMaterializationVersionAwareCandidateDigest,
  isVerifiedBaziProjectCopyMaterializationVersionAwareCandidate,
  loadBaziProjectCopyMaterializationVersionAwareCandidate,
  baziProjectCopyMaterializationVersionAwareCandidateTestOnly
} from "./bazi-project-copy-materialization-version-aware-candidate-lib.mjs";
import {
  loadBaziDttVersionedParentSupersession
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  loadBaziBindingFreezeRequirementsV17
} from "./bazi-dtt-version-aware-readiness-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(here, "..");
const HISTORICAL_REQUIREMENTS_PATH =
  "content/system-admission/bazi-project-copy-materialization-requirements.v1.json";
const SOURCE_V16_PATH = "content/bazi-strength-source-binding-candidates.v1.6.0.json";
const RIGHTS_V12_PATH = "content/bazi-strength-source-rights-candidates.v1.2.0.json";
const READINESS_V17_PATH =
  "content/system-admission/bazi-binding-freeze-requirements.v1.7.0.json";
const SUPERSESSION_RECEIPT_PATH =
  "content/system-admission/bazi-dtt-versioned-parent-supersession.v1.json";
const MANIFEST_PATH = "content/knowledge/manifest.v2.json";
const CONTRACTS_PATH = "packages/contracts/src/index.ts";
const KNOWLEDGE_CORE_PATH = "packages/knowledge-core/src/index.ts";
const VERSION_AWARE_CLI_PATH =
  "scripts/verify-bazi-project-copy-materialization-version-aware-candidate.mjs";
const VERSION_AWARE_DOC_PATH =
  "docs/阶段C-C-M1项目物化版本感知候选-v1-2026-08-30.md";

const FIXTURE_PATHS = Object.freeze([
  "content/bazi-strength-source-binding-candidates.v1.json",
  "content/bazi-strength-source-rights-candidates.v1.json",
  SOURCE_V16_PATH,
  RIGHTS_V12_PATH,
  "content/bazi-strength-engineering-binding-candidates.v1.json",
  "content/bazi-strength-expert-review-packet.v1.json",
  "content/system-admission/bazi-prc-copyright-law-public-evidence.v1.json",
  "content/system-admission/bazi-dtt-month-command-public-evidence.v1.json",
  "content/system-admission/bazi-dtt-notice-reconciliation.v1.json",
  "content/system-admission/bazi-dtt-notice-reconciliation.v2.json",
  SUPERSESSION_RECEIPT_PATH,
  "content/system-admission/bazi-binding-freeze-requirements.v1.json",
  READINESS_V17_PATH,
  "docs/阶段C-DTT月令候选公开证据-child-v1-2026-08-29.md",
  "packages/bazi-interpretation/src/strength-assessment-core.ts",
  "packages/bazi-interpretation/src/strength-claim-registry.ts",
  "packages/bazi-interpretation/src/strength-policy.ts",
  "packages/bazi-interpretation/src/strength-sensitivity-review.ts",
  CONTRACTS_PATH,
  KNOWLEDGE_CORE_PATH,
  MANIFEST_PATH,
  HISTORICAL_REQUIREMENTS_PATH,
  BAZI_PROJECT_COPY_MATERIALIZATION_VERSION_AWARE_CANDIDATE_RELATIVE_PATH
]);

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-c-m1-v11-test-"));
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

test("live C-M1 v1.1 is narrow, private-branded, zero-instance and fully red", async () => {
  const result = await loadBaziProjectCopyMaterializationVersionAwareCandidate(workspaceRoot);
  assert.equal(isVerifiedBaziProjectCopyMaterializationVersionAwareCandidate(result), true);
  assert.deepEqual(Object.keys(result), [
    "versionAwareProjectCopyMaterializationRequirementsMechanicallyVerified",
    "activeAdmissionEffect",
    "ledgerId",
    "ledgerDigest",
    "artifact",
    "historicalMaterializationContractProjectionReusedAfterUnchangedNonParentBasisRawIdentityMatchAndBrandedParentRebind",
    "historicalDirectParentSlotsRebound",
    "verifiedUpstreamCapabilityCount",
    "unchangedDirectNonParentBasisCount",
    "materializationApiIntegratedByThisCandidate",
    "materializationCandidateSchemaVersion",
    "materializationReceiptSchemaVersion",
    "normalizationProfileId",
    "bundledManifestEntryCount",
    "formalSourceCarrierRecordCount",
    "formalSourceRightsRecordCount",
    "materializationVerifiedCount",
    "projectCopyMaterializationRecordCount",
    "redistributableSourceCount",
    "bindingRequired",
    "bindingFrozenVerified",
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
  assert.equal(result.versionAwareProjectCopyMaterializationRequirementsMechanicallyVerified,
    true);
  assert.equal(result.activeAdmissionEffect, "none");
  assert.equal(result.ledgerId,
    "hakimi.bazi.project-copy-materialization-requirements.version-aware-candidate/1.1.0");
  assert.equal(result.artifact.path,
    BAZI_PROJECT_COPY_MATERIALIZATION_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  assert.equal(result.artifact.bytes,
    baziProjectCopyMaterializationVersionAwareCandidateTestOnly.EXPECTED_PERSISTED.rawBytes);
  assert.equal(result.artifact.sha256,
    baziProjectCopyMaterializationVersionAwareCandidateTestOnly.EXPECTED_PERSISTED.rawSha256);
  assert.equal(
    result.historicalMaterializationContractProjectionReusedAfterUnchangedNonParentBasisRawIdentityMatchAndBrandedParentRebind,
    true
  );
  assert.equal(result.historicalDirectParentSlotsRebound, 3);
  assert.equal(result.verifiedUpstreamCapabilityCount, 2);
  assert.equal(result.unchangedDirectNonParentBasisCount, 3);
  assert.equal(result.materializationApiIntegratedByThisCandidate, false);
  assert.equal(result.materializationCandidateSchemaVersion, "1.0.0");
  assert.equal(result.materializationReceiptSchemaVersion, "1.0.0");
  assert.equal(result.normalizationProfileId,
    "hakimi.knowledge.utf8-text-normalization/1.0.0");
  for (const field of [
    "bundledManifestEntryCount",
    "formalSourceCarrierRecordCount",
    "formalSourceRightsRecordCount",
    "materializationVerifiedCount",
    "projectCopyMaterializationRecordCount",
    "redistributableSourceCount",
    "bindingFrozenVerified"
  ]) {
    assert.equal(result[field], 0, field);
  }
  assert.equal(result.bindingRequired, 12);
  assert.equal(result.formalAdmissionPromotionBlocked, true);
  for (const field of [
    "sourceBundleComplete",
    "rightsBundleComplete",
    "expertReviewBundleComplete",
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
    "intervalMutationExcludedAcrossFiles",
    "abaExcluded"
  ]) {
    assert.equal(result[field], false, field);
  }
  assert.equal(result.mutationEpochReceipt, null);
});

test("deterministic builder reproduces the frozen raw and semantic identities", async () => {
  const first = await baziProjectCopyMaterializationVersionAwareCandidateTestOnly
    .buildExpectedBundle(workspaceRoot);
  const second = await baziProjectCopyMaterializationVersionAwareCandidateTestOnly
    .buildExpectedBundle(workspaceRoot);
  assert.deepEqual(first.ledger, second.ledger);
  assert.equal(first.snapshot.rawBytes,
    baziProjectCopyMaterializationVersionAwareCandidateTestOnly.EXPECTED_PERSISTED.rawBytes);
  assert.equal(first.snapshot.rawSha256,
    baziProjectCopyMaterializationVersionAwareCandidateTestOnly.EXPECTED_PERSISTED.rawSha256);
  assert.equal(first.ledger.ledgerDigest,
    baziProjectCopyMaterializationVersionAwareCandidateTestOnly.EXPECTED_PERSISTED.ledgerDigest);
  assert.equal(computeBaziProjectCopyMaterializationVersionAwareCandidateDigest(first.ledger),
    first.ledger.ledgerDigest);
});

test("historical C-M1 stays byte-for-byte frozen and template-only", async () => {
  const bytes = await readFile(path.join(workspaceRoot, HISTORICAL_REQUIREMENTS_PATH));
  assert.equal(bytes.byteLength, 6168);
  assert.equal(sha256(bytes),
    "c63a95514063fb64752d449f6ccb1c844544110e5ed9f1192de2ef7723efd13b");
  const historical = JSON.parse(bytes.toString("utf8"));
  assert.equal(historical.ledgerDigest,
    "690320c5d9778bf61da5ca3e112aedc6f9e2760e27f628f4c992cb5b9a8af1cb");
  const next = JSON.parse(await readFile(path.join(workspaceRoot,
    BAZI_PROJECT_COPY_MATERIALIZATION_VERSION_AWARE_CANDIDATE_RELATIVE_PATH), "utf8"));
  assert.equal(next.historicalLineage.ledgerDigest, historical.ledgerDigest);
  assert.equal(next.historicalLineage.role,
    "fixed_zero_instance_materialization_contract_projection_template_only_not_current_capability");
});

test("zero-instance inventory remains the exact historical projection", async () => {
  const historical = JSON.parse(await readFile(path.join(workspaceRoot,
    HISTORICAL_REQUIREMENTS_PATH), "utf8"));
  const next = JSON.parse(await readFile(path.join(workspaceRoot,
    BAZI_PROJECT_COPY_MATERIALIZATION_VERSION_AWARE_CANDIDATE_RELATIVE_PATH), "utf8"));
  assert.deepEqual(next.currentInventory, historical.currentInventory);
  assert.deepEqual(next.currentInventory, {
    bundledManifestEntries: 0,
    formalSourceCarrierRecords: 0,
    formalSourceRightsRecords: 0,
    materializationsVerified: 0,
    projectCopyMaterializationRecords: 0,
    redistributableSources: 0,
    sourceBindingsFrozen: 0,
    sourceBindingsRequired: 12
  });
});

test("materialization contract, normalization and receipt schemas remain exact", async () => {
  const historical = JSON.parse(await readFile(path.join(workspaceRoot,
    HISTORICAL_REQUIREMENTS_PATH), "utf8"));
  const next = JSON.parse(await readFile(path.join(workspaceRoot,
    BAZI_PROJECT_COPY_MATERIALIZATION_VERSION_AWARE_CANDIDATE_RELATIVE_PATH), "utf8"));
  assert.deepEqual(next.contractBoundary, historical.contractBoundary);
  assert.deepEqual(next.normalizationProfile, historical.normalizationProfile);
  assert.deepEqual(next.receiptRequirements, historical.receiptRequirements);
  assert.equal(next.receiptRequirements.currentPersistedReceiptIds.length, 0);
  assert.equal(next.receiptRequirements.candidateSchemaVersion, "1.0.0");
  assert.equal(next.receiptRequirements.receiptSchemaVersion, "1.0.0");
  assert.equal(next.normalizationProfile.profileId,
    "hakimi.knowledge.utf8-text-normalization/1.0.0");
});

test("release, authority and historical gate projections remain red with only scoped metadata", async () => {
  const historical = JSON.parse(await readFile(path.join(workspaceRoot,
    HISTORICAL_REQUIREMENTS_PATH), "utf8"));
  const next = JSON.parse(await readFile(path.join(workspaceRoot,
    BAZI_PROJECT_COPY_MATERIALIZATION_VERSION_AWARE_CANDIDATE_RELATIVE_PATH), "utf8"));
  assert.deepEqual(next.releaseGovernance, historical.releaseGovernance);
  assert.deepEqual(next.authorityBoundary, historical.authorityBoundary);
  const gate = structuredClone(next.gateSummary);
  for (const key of [
    "sourceRightsSupersessionWeakSetBrandVerified",
    "candidateReadinessWeakSetBrandVerified",
    "historicalMaterializationContractProjectionReusedAfterUnchangedNonParentBasisRawIdentityMatchAndBrandedParentRebind",
    "historicalDirectParentSlotsRebound",
    "verifiedUpstreamCapabilityCount",
    "currentInventoryChanged",
    "materializationContractProjectionChanged",
    "materializationApiIntegratedByThisCandidate",
    "sourceBundleComplete",
    "rightsBundleComplete",
    "expertReviewBundleComplete",
    "contentTruthEstablished",
    "expertTruthEstablished",
    "browserRuntimeEvidenceEstablished",
    "expertClaimsAuthorized",
    "activeAdmissionEffect",
    "formalAdmissionPromotionBlocked",
    "formalActivationAllowed"
  ]) {
    delete gate[key];
  }
  assert.deepEqual(gate, historical.gateSummary);
  assert.equal(next.gateSummary.sourceRightsSupersessionWeakSetBrandVerified, true);
  assert.equal(next.gateSummary.candidateReadinessWeakSetBrandVerified, true);
  assert.equal(next.gateSummary.currentInventoryChanged, false);
  assert.equal(next.gateSummary.materializationContractProjectionChanged, false);
  assert.equal(next.gateSummary.materializationApiIntegratedByThisCandidate, false);
  assert.equal(next.gateSummary.formalAdmissionPromotionBlocked, true);
  assert.equal(next.gateSummary.formalActivationAllowed, false);
  assert.deepEqual(next.doesNotEstablish.slice(0, -3), historical.doesNotEstablish);
  assert.deepEqual(next.doesNotEstablish.slice(-3), [
    "active_readiness_or_formal_admission",
    "formal_parent_identity",
    "fresh_materialization_contract_or_runtime_reexecution_by_this_layer"
  ]);
});

test("six basis positions preserve three direct artifacts and rebind exactly three parent slots", async () => {
  const historical = JSON.parse(await readFile(path.join(workspaceRoot,
    HISTORICAL_REQUIREMENTS_PATH), "utf8"));
  const next = JSON.parse(await readFile(path.join(workspaceRoot,
    BAZI_PROJECT_COPY_MATERIALIZATION_VERSION_AWARE_CANDIDATE_RELATIVE_PATH), "utf8"));
  assert.equal(next.basisArtifacts.length, 6);
  for (const index of [0, 1, 2]) {
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
    assert.equal("hashAndInspectionUseSameBuffer" in current, false);
  }
  assert.deepEqual(next.basisArtifacts.slice(3).map((entry) => ({
    path: entry.path,
    role: entry.role,
    bytes: entry.bytes,
    sha256: entry.sha256
  })), [
    {
      path: SOURCE_V16_PATH,
      role: "versioned_phase_c_source_candidate_parent_ledger",
      bytes: 50427,
      sha256: "62f6a68b99246a802bcf2055aa09a8ac8113df37a7ede1c55d8a2ea64deaea98"
    },
    {
      path: RIGHTS_V12_PATH,
      role: "versioned_phase_c_rights_candidate_parent_ledger",
      bytes: 23947,
      sha256: "678632a8875672f58bb5c9f1ec4a299a4f0c6e750b8ff4a02bfe4df889e1243a"
    },
    {
      path: READINESS_V17_PATH,
      role: "version_aware_phase_c_binding_freeze_candidate_readiness_parent",
      bytes: 32629,
      sha256: "7565a1c1ae51c09c78cf8f906e544bd8ee822020f76587237bc909ef1e6408a2"
    }
  ]);
  assert.equal(next.basisArtifacts.slice(3).every((entry) =>
    entry.pointInTimeRawIdentityVerified === true
      && entry.currentProjectionInspectionReexecutedByThisLayer === false), true);
  assert.equal(next.versionedCandidateParentRebind.historicalDirectParentSlotsRebound, 3);
  assert.equal(next.versionedCandidateParentRebind.historicalParentArtifactsMutated, false);
});

test("both upstream WeakSet seams produce one exact source-rights-receipt actual tuple", async () => {
  const supersession = await loadBaziDttVersionedParentSupersession(workspaceRoot);
  const readiness = await loadBaziBindingFreezeRequirementsV17(workspaceRoot);
  const supersessionTuple = baziProjectCopyMaterializationVersionAwareCandidateTestOnly
    .assertSupersession(supersession);
  const readinessTuple = baziProjectCopyMaterializationVersionAwareCandidateTestOnly
    .assertReadiness(readiness);
  assert.deepEqual(supersessionTuple, readinessTuple);
  assert.equal(supersessionTuple.sourceBinding.ledgerId,
    "hakimi.bazi.strength.source-binding-candidates/1.6.0");
  assert.equal(supersessionTuple.sourceRights.ledgerId,
    "hakimi.bazi.strength.source-rights-candidates/1.2.0");
  assert.equal(supersessionTuple.supportingSupersessionReceipt.supersessionId,
    "hakimi.bazi.dtt-versioned-parent-supersession/1.0.0");
  assert.throws(() => baziProjectCopyMaterializationVersionAwareCandidateTestOnly
    .assertSupersession(structuredClone(supersession)),
  expectCode("SUPERSESSION_BRAND_REQUIRED"));
  assert.throws(() => baziProjectCopyMaterializationVersionAwareCandidateTestOnly
    .assertReadiness(structuredClone(readiness)),
  expectCode("READINESS_BRAND_REQUIRED"));
  assert.throws(() => baziProjectCopyMaterializationVersionAwareCandidateTestOnly
    .assertSupersession(readiness),
  expectCode("SUPERSESSION_BRAND_REQUIRED"));
  assert.throws(() => baziProjectCopyMaterializationVersionAwareCandidateTestOnly
    .assertReadiness(supersession),
  expectCode("READINESS_BRAND_REQUIRED"));
  const source = await readFile(path.join(workspaceRoot,
    "scripts/bazi-project-copy-materialization-version-aware-candidate-lib.mjs"), "utf8");
  assert.match(source, /const supersessionTuple = assertSupersession\(supersession\);/u);
  assert.match(source, /const readinessTuple = assertReadiness\(readiness\);/u);
  assert.match(source, /if \(!exactJson\(supersessionTuple, readinessTuple\)\)/u);
  assert.match(source, /CROSS_BRAND_PARENT_TUPLE_MISMATCH/u);
});

test("observation wording denies fresh inspection, runtime, transitive same-buffer and epoch claims", async () => {
  const next = JSON.parse(await readFile(path.join(workspaceRoot,
    BAZI_PROJECT_COPY_MATERIALIZATION_VERSION_AWARE_CANDIDATE_RELATIVE_PATH), "utf8"));
  assert.equal(next.observationBoundary.directHistoricalRequirementsRawAndSemanticIdentityVerified,
    true);
  assert.equal(
    next.observationBoundary.historicalMaterializationContractProjectionReusedAfterUnchangedNonParentBasisRawIdentityMatchAndBrandedParentRebind,
    true
  );
  assert.equal(next.observationBoundary.unchangedDirectNonParentBasisPointInTimeRawIdentitiesVerified,
    3);
  assert.equal(next.observationBoundary.upstreamBrandedCapabilitiesVerified, 2);
  assert.equal(next.observationBoundary.nestedVerifierSameBufferTransitivityClaimed, false);
  assert.equal(next.observationBoundary.currentProjectionInspectionReexecutedByThisLayer, false);
  assert.equal(next.observationBoundary.runtimeExecutionObservedByThisLayer, false);
  assert.equal(next.observationBoundary.endpointSnapshotOnly, true);
  assert.equal(next.observationBoundary.crossFileAtomicSnapshot, false);
  assert.equal(next.observationBoundary.mutationEpochAvailableForSchema13, false);
  assert.equal(next.observationBoundary.mutationEpochReceipt, null);
  assert.equal(next.observationBoundary.intervalMutationExcluded, false);
  assert.equal(next.observationBoundary.abaExcluded, false);
});

test("clones, builder ledgers, history and both upstream brands never gain the C-M1 brand", async () => {
  const branded = await loadBaziProjectCopyMaterializationVersionAwareCandidate(workspaceRoot);
  const bundle = await baziProjectCopyMaterializationVersionAwareCandidateTestOnly
    .buildExpectedBundle(workspaceRoot);
  const historical = JSON.parse(await readFile(path.join(workspaceRoot,
    HISTORICAL_REQUIREMENTS_PATH), "utf8"));
  const supersession = await loadBaziDttVersionedParentSupersession(workspaceRoot);
  const readiness = await loadBaziBindingFreezeRequirementsV17(workspaceRoot);
  assert.equal(isVerifiedBaziProjectCopyMaterializationVersionAwareCandidate(
    structuredClone(branded)), false);
  assert.equal(isVerifiedBaziProjectCopyMaterializationVersionAwareCandidate(bundle.ledger),
    false);
  assert.equal(isVerifiedBaziProjectCopyMaterializationVersionAwareCandidate(historical), false);
  assert.equal(isVerifiedBaziProjectCopyMaterializationVersionAwareCandidate(supersession), false);
  assert.equal(isVerifiedBaziProjectCopyMaterializationVersionAwareCandidate(readiness), false);
  assert.equal(isVerifiedBaziProjectCopyMaterializationVersionAwareCandidate({
    ...branded,
    ledgerDigest: branded.ledgerDigest
  }), false);
});

test("returned capability is deeply frozen and exposes no full ledger, upstream or body", async () => {
  const result = await loadBaziProjectCopyMaterializationVersionAwareCandidate(workspaceRoot);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.artifact), true);
  assert.throws(() => {
    result.artifact.sha256 = "0".repeat(64);
  }, TypeError);
  assert.throws(() => {
    result.publicDeploymentAuthorized = true;
  }, TypeError);
  const serialized = JSON.stringify(result);
  for (const forbidden of [
    '"ledger":',
    '"candidate":',
    '"supersession":',
    '"readiness":',
    '"versionedCandidateParentRebind":',
    '"sourceBindingParent":',
    '"sourceRightsParent":',
    '"supportingSupersessionReceipt":',
    '"currentInventory":',
    '"contractBoundary":',
    '"normalizationProfile":',
    '"receiptRequirements":',
    '"body":',
    '"content":'
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
  assert.equal(serialized.includes("hakimi.bazi.dtt-versioned-parent-supersession/1.0.0"),
    false);
  assert.equal(serialized.includes("hakimi.bazi.strength.source-binding-candidates/1.6.0"),
    false);
  assert.equal(serialized.includes("hakimi.bazi.strength.source-rights-candidates/1.2.0"),
    false);
});

test("legacy C-M1 remains exactly 19/23 red and its CLI fails on the old basis", () => {
  const childEnvironment = { ...process.env };
  delete childEnvironment.NODE_TEST_CONTEXT;
  const oldTests = spawnSync(process.execPath, [
    "--test",
    path.join(here, "verify-bazi-project-copy-materialization.test.mjs")
  ], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: childEnvironment
  });
  const combined = `${oldTests.stdout}\n${oldTests.stderr}`;
  assert.equal(oldTests.status, 1);
  assert.match(combined, /tests 23/u);
  assert.match(combined, /pass 19/u);
  assert.match(combined, /fail 4/u);
  assert.match(combined, /BASIS_ARTIFACT_IDENTITY_MISMATCH|C-M1 依据文件字节身份已变化/u);

  const oldCli = spawnSync(process.execPath, [
    path.join(here, "verify-bazi-project-copy-materialization.mjs")
  ], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: childEnvironment
  });
  assert.equal(oldCli.status, 1);
  assert.match(oldCli.stderr, /"code":"BASIS_ARTIFACT_IDENTITY_MISMATCH"/u);
});

test("same-semantic whitespace drift fails the C-M1 v1.1 raw pin", async (t) => {
  const root = await fixture(t);
  const target = path.join(root,
    BAZI_PROJECT_COPY_MATERIALIZATION_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  const original = await readFile(target);
  await writeFile(target, sameLengthSemanticWhitespaceDrift(original));
  await assert.rejects(loadBaziProjectCopyMaterializationVersionAwareCandidate(root),
    expectCode("PERSISTED_RAW_DRIFT"));
});

test("self-resealed inventory, contract, normalization and schema promotion is rejected", async (t) => {
  const root = await fixture(t);
  await mutateJson(root,
    BAZI_PROJECT_COPY_MATERIALIZATION_VERSION_AWARE_CANDIDATE_RELATIVE_PATH,
    (value) => {
      value.currentInventory.materializationsVerified = 1;
      value.currentInventory.projectCopyMaterializationRecords = 1;
      value.contractBoundary.ocrCanBePromotedByReceipt = true;
      value.normalizationProfile.profileId = "forged-profile";
      value.receiptRequirements.candidateSchemaVersion = "9.9.9";
      value.ledgerDigest =
        computeBaziProjectCopyMaterializationVersionAwareCandidateDigest(value);
    });
  await assert.rejects(loadBaziProjectCopyMaterializationVersionAwareCandidate(root),
    expectCode("C_M1_V11_MISMATCH"));
});

test("self-resealed authority, rights, truth and release promotion is rejected", async (t) => {
  const root = await fixture(t);
  await mutateJson(root,
    BAZI_PROJECT_COPY_MATERIALIZATION_VERSION_AWARE_CANDIDATE_RELATIVE_PATH,
    (value) => {
      value.authorityBoundary.bindingFreezeEffect = "verified";
      value.authorityBoundary.rightsEffect = "cleared";
      value.authorityBoundary.legalConclusion = "established";
      value.authorityBoundary.contentTruthEstablished = true;
      value.authorityBoundary.expertTruthEstablished = true;
      value.authorityBoundary.expertClaimsAuthorized = true;
      value.gateSummary.releaseReady = true;
      value.gateSummary.publicDeploymentAuthorized = true;
      value.releaseGovernance.publicDeploymentAuthorized = true;
      value.ledgerDigest =
        computeBaziProjectCopyMaterializationVersionAwareCandidateDigest(value);
    });
  await assert.rejects(loadBaziProjectCopyMaterializationVersionAwareCandidate(root),
    expectCode("C_M1_V11_MISMATCH"));
});

test("self-resealed atomicity, epoch receipt, interval and ABA promotion is rejected", async (t) => {
  const root = await fixture(t);
  await mutateJson(root,
    BAZI_PROJECT_COPY_MATERIALIZATION_VERSION_AWARE_CANDIDATE_RELATIVE_PATH,
    (value) => {
      value.observationBoundary.crossFileAtomicSnapshot = true;
      value.observationBoundary.mutationEpochAvailableForSchema13 = true;
      value.observationBoundary.mutationEpochReceipt = "forged";
      value.observationBoundary.intervalMutationExcluded = true;
      value.observationBoundary.abaExcluded = true;
      value.ledgerDigest =
        computeBaziProjectCopyMaterializationVersionAwareCandidateDigest(value);
    });
  await assert.rejects(loadBaziProjectCopyMaterializationVersionAwareCandidate(root),
    expectCode("C_M1_V11_MISMATCH"));
});

test("source v1.6 raw drift cannot reach C-M1 v1.1", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, SOURCE_V16_PATH);
  await writeFile(target, sameLengthSemanticWhitespaceDrift(await readFile(target)));
  await assert.rejects(loadBaziProjectCopyMaterializationVersionAwareCandidate(root),
    expectCode("SOURCE_SUPERSESSION_RAW_DRIFT"));
});

test("rights v1.2 raw drift cannot reach C-M1 v1.1", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, RIGHTS_V12_PATH);
  await writeFile(target, sameLengthSemanticWhitespaceDrift(await readFile(target)));
  await assert.rejects(loadBaziProjectCopyMaterializationVersionAwareCandidate(root),
    expectCode("RIGHTS_SUPERSESSION_RAW_DRIFT"));
});

test("readiness 1.7 raw drift cannot reach C-M1 v1.1", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, READINESS_V17_PATH);
  await writeFile(target, sameLengthSemanticWhitespaceDrift(await readFile(target)));
  await assert.rejects(loadBaziProjectCopyMaterializationVersionAwareCandidate(root),
    expectCode("PERSISTED_RAW_DRIFT"));
});

test("each of the three unchanged manifest, contract and normalization bases fails closed on drift", async (t) => {
  for (const relativePath of [MANIFEST_PATH, CONTRACTS_PATH, KNOWLEDGE_CORE_PATH]) {
    const root = await fixture(t);
    const target = path.join(root, relativePath);
    await writeFile(target, Buffer.concat([await readFile(target), Buffer.from("\n")]));
    await assert.rejects(
      loadBaziProjectCopyMaterializationVersionAwareCandidate(root),
      expectOneOfCodes([
        "UNCHANGED_NON_PARENT_BASIS_RAW_DRIFT",
        "SCOPED_ARTIFACT_DRIFT",
        "BOUND_READINESS_BASIS_DRIFT",
        "BASIS_ARTIFACT_IDENTITY_MISMATCH"
      ]),
      relativePath
    );
  }
});

test("historical C-M1 raw drift cannot be hidden by its semantic digest", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, HISTORICAL_REQUIREMENTS_PATH);
  await writeFile(target, Buffer.concat([await readFile(target), Buffer.from("\n")]));
  await assert.rejects(loadBaziProjectCopyMaterializationVersionAwareCandidate(root),
    expectCode("HISTORICAL_REQUIREMENTS_RAW_DRIFT"));
});

test("literal and escaped duplicate keys fail closed", async (t) => {
  for (const escaped of [false, true]) {
    const root = await fixture(t);
    const target = path.join(root,
      BAZI_PROJECT_COPY_MATERIALIZATION_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
    const source = await readFile(target, "utf8");
    const duplicate = escaped
      ? '  "schema\\u0056ersion": "9.9.9",\n  "schemaVersion":'
      : '  "schemaVersion": "9.9.9",\n  "schemaVersion":';
    await writeFile(target, source.replace('  "schemaVersion":', duplicate), "utf8");
    await assert.rejects(loadBaziProjectCopyMaterializationVersionAwareCandidate(root),
      expectCode("JSON_DUPLICATE_KEY"));
  }
});

test("BOM and invalid UTF-8 persisted bytes fail closed", async (t) => {
  const bomRoot = await fixture(t);
  const bomTarget = path.join(bomRoot,
    BAZI_PROJECT_COPY_MATERIALIZATION_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  await writeFile(bomTarget, Buffer.concat([
    Buffer.from([0xef, 0xbb, 0xbf]),
    await readFile(bomTarget)
  ]));
  await assert.rejects(loadBaziProjectCopyMaterializationVersionAwareCandidate(bomRoot),
    expectCode("JSON_BOM_FORBIDDEN"));

  const utf8Root = await fixture(t);
  const utf8Target = path.join(utf8Root,
    BAZI_PROJECT_COPY_MATERIALIZATION_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  await writeFile(utf8Target, Buffer.from([0xc3, 0x28]));
  await assert.rejects(loadBaziProjectCopyMaterializationVersionAwareCandidate(utf8Root),
    expectCode("JSON_UTF8_INVALID"));
});

test("hard-linked persisted C-M1 v1.1 is rejected", async (t) => {
  const root = await fixture(t);
  const target = path.join(root,
    BAZI_PROJECT_COPY_MATERIALIZATION_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  try {
    await link(target, path.join(root, "c-m1-v11-hardlink.json"));
  } catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP", "EXDEV"].includes(error?.code)) {
      t.skip(`platform denied hardlink fixture: ${error.code}`);
      return;
    }
    throw error;
  }
  await assert.rejects(loadBaziProjectCopyMaterializationVersionAwareCandidate(root),
    expectCode("HARDLINK_REJECTED"));
});

test("captured Number, WeakSet, Array slice and fs survive while upstream Array poison fails closed", async () => {
  const originals = {
    numberIsFinite: Number.isFinite,
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
  let result;
  try {
    Number.isFinite = poison;
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
    result = await loadBaziProjectCopyMaterializationVersionAwareCandidate(workspaceRoot);
  } finally {
    Number.isFinite = originals.numberIsFinite;
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
  assert.equal(result.bundledManifestEntryCount, 0);
  assert.equal(result.publicDeploymentAuthorized, false);

  const originalArrayIsArray = Array.isArray;
  let upstreamError;
  try {
    Array.isArray = poison;
    try {
      await loadBaziProjectCopyMaterializationVersionAwareCandidate(workspaceRoot);
    } catch (error) {
      upstreamError = error;
    }
  } finally {
    Array.isArray = originalArrayIsArray;
  }
  assert.equal(upstreamError?.code, "JSON_INVALID");
  assert.match(String(upstreamError?.cause?.cause ?? upstreamError?.cause ?? ""),
    /poisoned builtin invoked/u);
});

test("captured WeakSet has cannot forge the private C-M1 brand", async () => {
  const branded = await loadBaziProjectCopyMaterializationVersionAwareCandidate(workspaceRoot);
  const originalHas = WeakSet.prototype.has;
  try {
    WeakSet.prototype.has = () => true;
    assert.equal(isVerifiedBaziProjectCopyMaterializationVersionAwareCandidate({}), false);
    assert.equal(isVerifiedBaziProjectCopyMaterializationVersionAwareCandidate(branded), true);
  } finally {
    WeakSet.prototype.has = originalHas;
  }
});

test("live String poisoning and caller toJSON cannot collapse canonical identity", () => {
  const originalString = globalThis.String;
  try {
    globalThis.String = () => "0";
    assert.equal(baziProjectCopyMaterializationVersionAwareCandidateTestOnly
      .exactJson([1, 2], [1, 3]), false);
  } finally {
    globalThis.String = originalString;
  }

  let getterInvocations = 0;
  const hostile = {
    get toJSON() {
      getterInvocations += 1;
      return () => ({ publicDeploymentAuthorized: true });
    }
  };
  assert.throws(
    () => computeBaziProjectCopyMaterializationVersionAwareCandidateDigest(hostile),
    expectCode("NON_PASSIVE_OBJECT")
  );
  assert.equal(getterInvocations, 0);
});

test("same-length drift cannot be hidden by fs clean-clone, Hash or FileHandle poisoning", async (t) => {
  const root = await fixture(t);
  const target = path.resolve(root,
    BAZI_PROJECT_COPY_MATERIALIZATION_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  const cleanClone = path.resolve(root, "c-m1-v11-clean-clone.json");
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
        const expected = baziProjectCopyMaterializationVersionAwareCandidateTestOnly
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
    await assert.rejects(loadBaziProjectCopyMaterializationVersionAwareCandidate(root),
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

test("a valid decoy and extra caller arguments cannot replace the fixed C-M1 artifact", async (t) => {
  const root = await fixture(t);
  const target = path.join(root,
    BAZI_PROJECT_COPY_MATERIALIZATION_VERSION_AWARE_CANDIDATE_RELATIVE_PATH);
  const decoy = path.join(root, "c-m1-v11-decoy.json");
  const original = await readFile(target);
  await writeFile(decoy, original);
  await writeFile(target, sameLengthSemanticWhitespaceDrift(original));
  await assert.rejects(
    loadBaziProjectCopyMaterializationVersionAwareCandidate(root, decoy, {
      candidatePath: decoy,
      materializationsVerified: 1,
      publicDeploymentAuthorized: true
    }),
    expectCode("PERSISTED_RAW_DRIFT")
  );
});

test("CLI emits only the narrow red mechanical contract", () => {
  const cliPath = path.join(workspaceRoot, VERSION_AWARE_CLI_PATH);
  const run = spawnSync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stderr, "");
  const prefix =
    "BAZI_PROJECT_COPY_MATERIALIZATION_VERSION_AWARE_CANDIDATE_MECHANICS_OK ";
  assert.equal(run.stdout.startsWith(prefix), true);
  const payload = JSON.parse(run.stdout.slice(prefix.length));
  assert.deepEqual(Object.keys(payload), [
    "versionAwareProjectCopyMaterializationRequirementsMechanicallyVerified",
    "candidateResultWeakSetBrandVerified",
    "ledgerId",
    "ledgerDigest",
    "artifact",
    "fixedDefaultGovernance",
    "activeAdmissionEffect",
    "parentAccounting",
    "historicalProjectionReuse",
    "materializationApi",
    "zeroInstanceCounts",
    "redGates"
  ]);
  for (const forbidden of ["ledger", "candidate", "supersession", "readiness", "body", "content"]) {
    assert.equal(forbidden in payload, false, forbidden);
  }
  assert.deepEqual(payload.fixedDefaultGovernance, {
    activeLine: "legacy-v13",
    targetSchema: 13,
    migrationId: null
  });
  assert.equal(payload.activeAdmissionEffect, "none");
  assert.equal(payload.versionAwareProjectCopyMaterializationRequirementsMechanicallyVerified,
    true);
  assert.equal(payload.candidateResultWeakSetBrandVerified, true);
  assert.deepEqual(payload.parentAccounting, {
    directBasisArtifactCount: 6,
    historicalDirectParentSlotsRebound: 3,
    verifiedUpstreamPrivateBrandCount: 2,
    supportingReceiptArtifactCount: 1,
    unchangedDirectNonParentBasisCount: 3
  });
  assert.deepEqual(payload.historicalProjectionReuse, {
    materializationContractProjectionReused: true
  });
  assert.deepEqual(payload.materializationApi, {
    integratedByThisCandidate: false,
    candidateSchemaVersion: "1.0.0",
    receiptSchemaVersion: "1.0.0",
    normalizationProfileId: "hakimi.knowledge.utf8-text-normalization/1.0.0"
  });
  assert.deepEqual(payload.zeroInstanceCounts, {
    bundledManifestEntryCount: 0,
    formalSourceCarrierRecordCount: 0,
    formalSourceRightsRecordCount: 0,
    materializationVerifiedCount: 0,
    projectCopyMaterializationRecordCount: 0,
    redistributableSourceCount: 0
  });
  assert.equal(payload.redGates.formalAdmissionPromotionBlocked, true);
  assert.equal(payload.redGates.bindingRequired, 12);
  assert.equal(payload.redGates.bindingFrozenVerified, 0);
  for (const field of [
    "sourceBundleComplete",
    "rightsBundleComplete",
    "expertReviewBundleComplete",
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
    "intervalMutationExcludedAcrossFiles",
    "abaExcluded"
  ]) {
    assert.equal(payload.redGates[field], false, field);
  }
  assert.equal(payload.materializationApi.integratedByThisCandidate, false);
  assert.equal(payload.redGates.mutationEpochReceipt, null);
});

test("every directly raw-bound C-M1 v1.1 text path is pinned to LF checkout semantics", async () => {
  const attributes = new Set((await readFile(path.join(workspaceRoot, ".gitattributes"), "utf8"))
    .split(/\r?\n/u));
  const requiredPaths = [
    HISTORICAL_REQUIREMENTS_PATH,
    SOURCE_V16_PATH,
    RIGHTS_V12_PATH,
    READINESS_V17_PATH,
    SUPERSESSION_RECEIPT_PATH,
    MANIFEST_PATH,
    CONTRACTS_PATH,
    KNOWLEDGE_CORE_PATH,
    BAZI_PROJECT_COPY_MATERIALIZATION_VERSION_AWARE_CANDIDATE_RELATIVE_PATH,
    "scripts/bazi-project-copy-materialization-version-aware-candidate-lib.mjs",
    VERSION_AWARE_CLI_PATH,
    "scripts/verify-bazi-project-copy-materialization-version-aware-candidate.test.mjs",
    VERSION_AWARE_DOC_PATH
  ];
  for (const relativePath of requiredPaths) {
    assert.equal(attributes.has(`/${relativePath} text eol=lf`), true, relativePath);
  }
});

test("old, default, runtime and both policy chains do not import the independent C-M1 capability", async () => {
  const capabilityName = "bazi-project-copy-materialization-version-aware-candidate";
  const paths = [
    "scripts/bazi-project-copy-materialization-lib.mjs",
    "scripts/verify-bazi-project-copy-materialization.mjs",
    "scripts/bazi-policy-weights-value-evidence-candidate-lib.mjs",
    "scripts/verify-bazi-policy-weights-value-evidence-candidate.mjs",
    "scripts/bazi-policy-weights-version-aware-candidate-lib.mjs",
    "scripts/verify-bazi-policy-weights-version-aware-candidate.mjs",
    "scripts/bazi-expert-review-packet-lib.mjs",
    "scripts/bazi-expert-authority-material-precheck-lib.mjs",
    "scripts/bazi-private-exact-quote-material-verifier-lib.mjs",
    "scripts/bazi-domain-release-manifest-lib.mjs",
    "scripts/system-admission-registry-lib.mjs",
    "scripts/cross-system-engineering-fact-receipt-lib.mjs",
    "packages/bazi-interpretation/src/index.ts",
    "packages/bazi-interpretation/src/strength-policy.ts",
    "packages/bazi-interpretation/src/strength-assessment-core.ts",
    "packages/bazi-interpretation/src/strength-claim-registry.ts",
    "apps/web/src/components/bazi-interpretation-panel.tsx",
    "apps/web/src/components/bazi-strength-evidence-ledger.tsx"
  ];
  for (const relativePath of paths) {
    const source = await readFile(path.join(workspaceRoot, relativePath), "utf8");
    assert.equal(source.includes(capabilityName), false, relativePath);
    assert.equal(source.includes(
      BAZI_PROJECT_COPY_MATERIALIZATION_VERSION_AWARE_CANDIDATE_RELATIVE_PATH),
    false, relativePath);
  }
  const newLib = await readFile(path.join(workspaceRoot,
    "scripts/bazi-project-copy-materialization-version-aware-candidate-lib.mjs"), "utf8");
  assert.equal(newLib.includes("bazi-policy-weights-value-evidence-candidate"), false);
  assert.equal(newLib.includes("bazi-policy-weights-version-aware-candidate"), false);
  const packageJson = JSON.parse(await readFile(path.join(workspaceRoot, "package.json"), "utf8"));
  for (const scriptName of ["build", "test", "typecheck", "prebuild", "pretest", "pretypecheck"]) {
    const script = packageJson.scripts?.[scriptName] ?? "";
    assert.equal(script.includes("verify-bazi-project-copy-materialization-version-aware-candidate"),
      false, scriptName);
    assert.equal(script.includes(capabilityName), false, scriptName);
  }
});
