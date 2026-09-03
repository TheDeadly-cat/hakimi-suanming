import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import {
  BAZI_SMT_V10_VERSION_AWARE_BINDING_READINESS_RELATIVE_PATH,
  baziSmtV10VersionAwareBindingReadinessTestOnly as testOnly,
  computeBaziSmtV10VersionAwareBindingReadinessDigest,
  isVerifiedBaziSmtV10VersionAwareBindingReadiness,
  loadBaziSmtV10VersionAwareBindingReadiness
} from "./bazi-smt-v10-version-aware-binding-readiness-lib.mjs";
import {
  loadBaziBindingFreezeRequirementsV17
} from "./bazi-dtt-version-aware-readiness-lib.mjs";
import {
  loadBaziSmtV10VersionedParentSupersession
} from "./bazi-smt-v10-versioned-parent-supersession-lib.mjs";
import {
  loadBaziSourceCarrierRecordReadinessVersionAwareCandidate
} from "./bazi-source-carrier-record-readiness-version-aware-candidate-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.resolve(workspaceRoot, "scripts/verify-bazi-smt-v10-version-aware-binding-readiness.mjs");
const loadFixture = async () => {
  const result = await loadBaziSmtV10VersionAwareBindingReadiness(workspaceRoot);
  const predecessor = await loadBaziBindingFreezeRequirementsV17(workspaceRoot);
  const persisted = JSON.parse(await readFile(
    path.resolve(workspaceRoot, BAZI_SMT_V10_VERSION_AWARE_BINDING_READINESS_RELATIVE_PATH),
    "utf8"
  ));
  return { result, predecessor, persisted };
};
const fixturePromise = loadFixture();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function resign(value) {
  value.ledgerDigest = computeBaziSmtV10VersionAwareBindingReadinessDigest(value);
  return value;
}

function rejectsSemantic(value, predecessor, expected) {
  assert.throws(
    () => testOnly.assertPersistedSemantic(resign(value), expected, predecessor.readiness),
    /MISMATCH/
  );
}

test("loader returns a private branded v1.8 result with frozen raw and semantic identity", async () => {
  const { result } = await fixturePromise;
  assert.equal(isVerifiedBaziSmtV10VersionAwareBindingReadiness(result), true);
  assert.equal(result.ledgerId, "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.8.0");
  assert.equal(result.ledgerDigest, "6ed301be956d160e06126eed63a7155ab8182adbcbc7e0def2690e8271e50866");
  assert.deepEqual(result.artifact, {
    path: BAZI_SMT_V10_VERSION_AWARE_BINDING_READINESS_RELATIVE_PATH,
    bytes: 35616,
    sha256: "f612019e19255f47be03a569bb4cf3e61227146a924c4c63a2b75f1b28649ab3"
  });
});

test("artifact bytes independently match the frozen raw hash", async () => {
  const bytes = await readFile(path.resolve(workspaceRoot, BAZI_SMT_V10_VERSION_AWARE_BINDING_READINESS_RELATIVE_PATH));
  assert.equal(bytes.byteLength, 35616);
  assert.equal(createHash("sha256").update(bytes).digest("hex"),
    "f612019e19255f47be03a569bb4cf3e61227146a924c4c63a2b75f1b28649ab3");
});

test("all three private upstream brands are required", async () => {
  const predecessor = await loadBaziBindingFreezeRequirementsV17(workspaceRoot);
  const supersession = await loadBaziSmtV10VersionedParentSupersession(workspaceRoot);
  const carrier = await loadBaziSourceCarrierRecordReadinessVersionAwareCandidate(workspaceRoot);
  assert.doesNotThrow(() => testOnly.assertVerifiedUpstreams(predecessor, supersession, carrier));
  assert.throws(() => testOnly.assertVerifiedUpstreams({}, supersession, carrier), /PREDECESSOR_BRAND_REQUIRED/);
  assert.throws(() => testOnly.assertVerifiedUpstreams(predecessor, {}, carrier), /SMT_SUPERSESSION_BRAND_REQUIRED/);
  assert.throws(() => testOnly.assertVerifiedUpstreams(predecessor, supersession, {}), /CARRIER_READINESS_BRAND_REQUIRED/);
});

test("clones and test-only exports cannot mint the successor private brand", async () => {
  const { result } = await fixturePromise;
  assert.equal(isVerifiedBaziSmtV10VersionAwareBindingReadiness(clone(result)), false);
  assert.equal(isVerifiedBaziSmtV10VersionAwareBindingReadiness(testOnly), false);
  assert.equal(Object.isFrozen(result), true);
});

test("source 1.7 and rights 1.3 raw and semantic identities are pinned", async () => {
  const { result, persisted } = await fixturePromise;
  assert.equal(result.sourceLedgerId, testOnly.SOURCE_V17.ledgerId);
  assert.equal(result.sourceLedgerDigest, testOnly.SOURCE_V17.ledgerDigest);
  assert.equal(result.rightsLedgerId, testOnly.RIGHTS_V13.ledgerId);
  assert.equal(result.rightsLedgerDigest, testOnly.RIGHTS_V13.ledgerDigest);
  assert.deepEqual(persisted.basisArtifacts[5], {
    path: testOnly.SOURCE_V17.path, bytes: testOnly.SOURCE_V17.rawBytes, sha256: testOnly.SOURCE_V17.rawSha256
  });
  assert.deepEqual(persisted.basisArtifacts[6], {
    path: testOnly.RIGHTS_V13.path, bytes: testOnly.RIGHTS_V13.rawBytes, sha256: testOnly.RIGHTS_V13.rawSha256
  });
});

test("twelve binding rows retain order and only SMT-v10 candidate v1 becomes v2", async () => {
  const { predecessor, persisted } = await fixturePromise;
  assert.equal(persisted.bindings.length, 12);
  for (let index = 0; index < 12; index += 1) {
    assert.equal(persisted.bindings[index].bindingId, predecessor.readiness.bindings[index].bindingId);
    assert.equal(persisted.bindings[index].order, predecessor.readiness.bindings[index].order);
    const expected = clone(predecessor.readiness.bindings[index]);
    if (index === 9) expected.candidateIds[0] = testOnly.NEW_SMT_CANDIDATE_ID;
    assert.equal(testOnly.canonicalStringify(persisted.bindings[index]), testOnly.canonicalStringify(expected));
  }
});

test("mechanical observation counts advance to 6/9/8/2 while quote count remains 6", async () => {
  const { result, persisted } = await fixturePromise;
  assert.deepEqual([
    result.carrierObservationLayersObserved,
    result.visualPageCorrespondencesObserved,
    result.normalizedFacsimileCollationCandidatesObserved,
    result.exactGlyphFacsimileCorrespondenceCandidatesObserved,
    result.candidateQuoteDigestsObserved
  ], [6, 9, 8, 2, 6]);
  assert.deepEqual([
    persisted.gateSummary.carrierObservationLayersObserved,
    persisted.gateSummary.visualPageCorrespondencesObserved,
    persisted.gateSummary.normalizedFacsimileCollationCandidatesObserved,
    persisted.gateSummary.exactGlyphFacsimileCorrespondenceCandidatesObserved,
    persisted.gateSummary.candidateQuoteDigestsObserved
  ], [6, 9, 8, 2, 6]);
});

test("formal, rights, materialization, reviewer, legal, expert and binding gates remain red", async () => {
  const { result, persisted } = await fixturePromise;
  assert.deepEqual([
    result.formalKnowledgeDocumentCount,
    result.formalSourceRightsRecordCount,
    result.formalSourceCarrierRecordCount,
    result.projectCopyMaterializationRecordCount,
    result.materializationsVerified,
    result.verifiedNaturalPersonRightsReviewers,
    result.domainExpertReviewCount,
    result.rightsLegalReviewCount,
    result.bindingFrozenVerified
  ], [0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual([
    persisted.gateSummary.sourceBundleComplete,
    persisted.gateSummary.rightsBundleComplete,
    persisted.gateSummary.expertReviewBundleComplete,
    result.releaseReady,
    result.publicDeploymentAuthorized,
    result.expertClaimsAuthorized
  ], [false, false, false, false, false, false]);
  assert.equal(result.activeAdmissionEffect, "none");
});

test("legacy-v13 governance and atomic/epoch/interval/ABA red boundary remain exact", async () => {
  const { result, persisted } = await fixturePromise;
  assert.deepEqual(persisted.releaseGovernance, {
    activeLine: "legacy-v13", expertClaimsAuthorized: false, migrationId: null,
    mutationEpochBoundaryRequired: true, publicDeploymentAuthorized: false, targetSchema: 13
  });
  assert.deepEqual([
    result.crossFileAtomicSnapshot,
    result.mutationEpochAvailableForSchema13,
    result.mutationEpochReceipt,
    result.intervalMutationExcludedAcrossFiles,
    result.abaExcluded
  ], [false, false, null, false, false]);
});

test("recomputed digest cannot preserve the old SMT-v10 candidate", async () => {
  const { predecessor, persisted } = await fixturePromise;
  const forged = clone(persisted);
  forged.bindings[9].candidateIds[0] = testOnly.OLD_SMT_CANDIDATE_ID;
  rejectsSemantic(forged, predecessor, persisted);
});

test("recomputed digest cannot alter any of the eleven preserved rows", async () => {
  const { predecessor, persisted } = await fixturePromise;
  const forged = clone(persisted);
  forged.bindings[8].candidateIds[0] = "forged-candidate";
  rejectsSemantic(forged, predecessor, persisted);
});

test("recomputed digest cannot omit, append, or reorder binding rows", async () => {
  const { predecessor, persisted } = await fixturePromise;
  const omitted = clone(persisted);
  omitted.bindings.splice(2, 1);
  rejectsSemantic(omitted, predecessor, persisted);
  const appended = clone(persisted);
  appended.bindings.push(clone(appended.bindings[0]));
  rejectsSemantic(appended, predecessor, persisted);
  const reordered = clone(persisted);
  [reordered.bindings[0], reordered.bindings[1]] = [reordered.bindings[1], reordered.bindings[0]];
  rejectsSemantic(reordered, predecessor, persisted);
});

test("recomputed digest cannot mix old source or rights parents", async () => {
  const { predecessor, persisted } = await fixturePromise;
  const oldSource = clone(persisted);
  oldSource.basisArtifacts[5].path = "content/bazi-strength-source-binding-candidates.v1.6.0.json";
  rejectsSemantic(oldSource, predecessor, persisted);
  const oldRights = clone(persisted);
  oldRights.smtV10VersionAwareRebindGate.rightsParent.ledgerId =
    "hakimi.bazi.strength.source-rights-candidates/1.2.0";
  rejectsSemantic(oldRights, predecessor, persisted);
});

test("recomputed digest cannot forge count progress or authority", async () => {
  const { predecessor, persisted } = await fixturePromise;
  const count = clone(persisted);
  count.gateSummary.bindingFrozenVerified = 1;
  rejectsSemantic(count, predecessor, persisted);
  const authority = clone(persisted);
  authority.smtV10VersionAwareRebindGate.publicDeploymentAuthorized = true;
  rejectsSemantic(authority, predecessor, persisted);
});

test("recomputed digest cannot forge formal records, materialization, review, legal, or expert progress", async () => {
  const { predecessor, persisted } = await fixturePromise;
  for (const field of [
    "formalKnowledgeDocumentCount", "formalSourceRightsRecordCount", "formalSourceCarrierRecordCount",
    "projectCopyMaterializationRecordCount", "materializationsVerified",
    "verifiedNaturalPersonRightsReviewers", "domainExpertReviewCount", "rightsLegalReviewCount"
  ]) {
    const forged = clone(persisted);
    forged.gateSummary[field] = 1;
    rejectsSemantic(forged, predecessor, persisted);
  }
});

test("recomputed digest cannot turn atomic, epoch, interval, or ABA boundary green", async () => {
  const { predecessor, persisted } = await fixturePromise;
  for (const field of ["crossFileAtomicSnapshot", "mutationEpochAvailable", "intervalMutationExcludedAcrossFiles", "abaExcluded"]) {
    const forged = clone(persisted);
    forged.integrityBoundary[field] = true;
    rejectsSemantic(forged, predecessor, persisted);
  }
});

test("canonicalization rejects getters without invoking them", () => {
  let invoked = 0;
  const forged = {};
  Object.defineProperty(forged, "ledgerId", { enumerable: true, get() { invoked += 1; return "forged"; } });
  assert.throws(() => testOnly.canonicalStringify(forged), /NON_PASSIVE_JSON/);
  assert.equal(invoked, 0);
});

test("canonicalization rejects custom prototypes and aliases", () => {
  assert.throws(() => testOnly.canonicalStringify(Object.create({ privileged: true })), /NON_CANONICAL_PROTOTYPE/);
  const shared = {};
  assert.throws(() => testOnly.canonicalStringify({ left: shared, right: shared }), /ALIASED_OR_CYCLIC_JSON/);
});

test("canonicalization rejects negative zero instead of aliasing it to zero", () => {
  assert.throws(() => testOnly.canonicalStringify({ count: -0 }), /NON_JSON_NUMBER/);
  assert.throws(
    () => computeBaziSmtV10VersionAwareBindingReadinessDigest({ ledgerDigest: "", count: -0 }),
    /NON_JSON_NUMBER/
  );
});

test("CLI is an observation with explicit runtime distrust calibration", () => {
  const child = spawnSync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    encoding: "utf8"
  });
  assert.equal(child.status, 0, child.stderr);
  const prefix = "BAZI_SMT_V10_VERSION_AWARE_BINDING_READINESS_OBSERVATION_OK ";
  assert.equal(child.stdout.startsWith(prefix), true);
  const output = JSON.parse(child.stdout.slice(prefix.length));
  assert.equal(output.mechanicalObservationVerified, true);
  assert.deepEqual(output.runtimeTrustCalibration, {
    hiddenPreloadExcluded: false,
    nodeRuntimeIdentityEstablished: false,
    loaderIdentityEstablished: false,
    runtimeLauncherIdentityEstablished: false,
    cliOutputTrustedAttestation: false,
    visibleLoaderGuardIsSecurityBoundary: false,
    mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution: true
  });
  assert.equal(output.bindingFrozenVerified, 0);
  assert.equal(output.publicDeploymentAuthorized, false);
});

test("CLI rejects operands and visible NODE_OPTIONS with fixed non-leaking failures", () => {
  const operand = spawnSync(process.execPath, [cliPath, "unexpected"], {
    cwd: workspaceRoot,
    encoding: "utf8"
  });
  assert.equal(operand.status, 1);
  assert.equal(operand.stdout, "");
  assert.equal(operand.stderr,
    "BAZI_SMT_V10_VERSION_AWARE_BINDING_READINESS_FAILED CLI_ARGUMENTS_FORBIDDEN\n");

  const visibleOptions = spawnSync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "--no-warnings" }
  });
  assert.equal(visibleOptions.status, 1);
  assert.equal(visibleOptions.stdout, "");
  assert.equal(visibleOptions.stderr,
    "BAZI_SMT_V10_VERSION_AWARE_BINDING_READINESS_FAILED VISIBLE_NODE_LOADER_OPTIONS_FORBIDDEN\n");
});

test("importing the CLI is side-effect free", () => {
  const child = spawnSync(process.execPath, [
    "--input-type=module",
    "--eval",
    `await import(${JSON.stringify(pathToFileURL(cliPath).href)}); process.stdout.write("IMPORT_OK\\n");`
  ], {
    cwd: workspaceRoot,
    encoding: "utf8"
  });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout, "IMPORT_OK\n");
  assert.equal(child.stderr, "");
});

test("persisted artifact is the deterministic expected builder projection", async () => {
  const { persisted } = await fixturePromise;
  const expected = await testOnly.loadExpectedBundle(workspaceRoot);
  assert.equal(testOnly.canonicalStringify(persisted), testOnly.canonicalStringify(expected.ledger));
  assert.equal(computeBaziSmtV10VersionAwareBindingReadinessDigest(persisted), persisted.ledgerDigest);
});
