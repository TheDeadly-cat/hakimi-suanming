import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  computeBaziSourceCarrierRecordReadinessVersionAwareCandidateDigest,
  getBaziSourceCarrierRecordReadinessVersionAwareCandidateSummary,
  isVerifiedBaziSourceCarrierRecordReadinessVersionAwareCandidate,
  loadBaziSourceCarrierRecordReadinessVersionAwareCandidate,
  baziSourceCarrierRecordReadinessVersionAwareCandidateTestOnly as testOnly
} from "./bazi-source-carrier-record-readiness-version-aware-candidate-lib.mjs";
import {
  loadBaziSmtV10VersionedParentSupersession
} from "./bazi-smt-v10-versioned-parent-supersession-lib.mjs";
import {
  loadBaziSourceCarrierRecordReadiness
} from "./bazi-source-carrier-record-readiness-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactPath = path.join(
  workspaceRoot,
  "content/system-admission/bazi-source-carrier-record-readiness.v1.1.0.json"
);

const bundle = await testOnly.loadExpectedBundle(workspaceRoot);
const verified = await loadBaziSourceCarrierRecordReadinessVersionAwareCandidate(workspaceRoot);
const smtSupersession = await loadBaziSmtV10VersionedParentSupersession(workspaceRoot);
const predecessorCapability = await loadBaziSourceCarrierRecordReadiness(workspaceRoot);
const persistedText = await readFile(artifactPath, "utf8");
const persisted = JSON.parse(persistedText);
const predecessor = JSON.parse(await readFile(path.join(workspaceRoot, testOnly.PREDECESSOR.path), "utf8"));
const source = JSON.parse(await readFile(path.join(workspaceRoot, testOnly.SOURCE_V17.path), "utf8"));
const rights = JSON.parse(await readFile(path.join(workspaceRoot, testOnly.RIGHTS_V13.path), "utf8"));
const receipt = JSON.parse(await readFile(path.join(workspaceRoot, testOnly.SUPERSESSION_RECEIPT.path), "utf8"));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function forgeDigest(value) {
  value.ledgerDigest = computeBaziSourceCarrierRecordReadinessVersionAwareCandidateDigest(value);
  return value;
}

function rejectsProjection(value) {
  assert.throws(
    () => testOnly.assertPersistedCandidateSemantic(forgeDigest(value), bundle.ledger),
    (error) => error?.code === "EXPECTED_PROJECTION_MISMATCH"
  );
}

test("loader returns the module-private WeakSet brand and a recursively frozen result", () => {
  assert.equal(isVerifiedBaziSourceCarrierRecordReadinessVersionAwareCandidate(verified), true);
  assert.equal(Object.isFrozen(verified), true);
  assert.equal(Object.isFrozen(verified.artifact), true);
  assert.equal(isVerifiedBaziSourceCarrierRecordReadinessVersionAwareCandidate(clone(verified)), false);
});

test("summary requires the original brand and preserves all red boundary primitives", () => {
  const summary = getBaziSourceCarrierRecordReadinessVersionAwareCandidateSummary(verified);
  assert.equal(summary.carrierObservationLayers, 6);
  assert.equal(summary.distinctSourceFamilies, 4);
  assert.equal(summary.smtV10CarrierObservationLayers, 2);
  assert.equal(summary.dttCarrierObservationLayers, 2);
  assert.equal(summary.bindingFrozenVerified, 0);
  assert.equal(summary.bindingRequired, 12);
  assert.equal(summary.activeAdmissionEffect, "none");
  assert.equal(summary.releaseReady, false);
  assert.throws(
    () => getBaziSourceCarrierRecordReadinessVersionAwareCandidateSummary(clone(verified)),
    (error) => error?.code === "VERIFIED_BRAND_REQUIRED"
  );
});

test("persisted artifact is byte-for-byte the canonical mechanical projection", () => {
  assert.equal(persistedText, testOnly.serialize(bundle.ledger));
  assert.equal(Buffer.byteLength(persistedText), testOnly.EXPECTED_PERSISTED.rawBytes);
  assert.equal(
    createHash("sha256").update(persistedText).digest("hex"),
    testOnly.EXPECTED_PERSISTED.rawSha256
  );
  assert.equal(persisted.ledgerDigest, testOnly.EXPECTED_PERSISTED.ledgerDigest);
});

test("all five predecessor rows remain field-for-field reachable through their full-row digests", () => {
  assert.equal(persisted.predecessorProjection.predecessorRowCount, 5);
  assert.equal(persisted.predecessorProjection.everyPredecessorFieldPreservedByFullRowDigest, true);
  assert.equal(persisted.predecessorProjection.predecessorFullRowsRepeatedInSuccessorArtifact, false);
  for (let index = 0; index < predecessor.carrierGaps.length; index += 1) {
    const lock = persisted.predecessorProjection.rows[index];
    const row = predecessor.carrierGaps[index];
    assert.equal(lock.ordinal, index + 1);
    assert.equal(lock.rowId, row.rowId);
    assert.equal(lock.fullRowDigest, testOnly.digest(testOnly.ROW_DIGEST_DOMAIN, row));
  }
});

test("sixth row locks the CADAL anchor byte identity and page count", () => {
  const carrier = persisted.successorCarrierGap.observedCarrierIdentity;
  assert.equal(persisted.successorCarrierGap.ordinal, 6);
  assert.equal(carrier.anchorId, testOnly.ANCHOR.anchorId);
  assert.equal(carrier.carrierBytes, 8321599);
  assert.equal(carrier.carrierRawSha256, "d532196ef4aa46c747c2a703c7c47c5fdb9cfce9bea8a654a652d6657b4e6fbe");
  assert.equal(carrier.carrierPageCount, 176);
});

test("version-aware rebind is confined to this successor while Binding readiness and C-M1 remain historical", () => {
  assert.equal(persisted.versionAwareParentRebind.rebindScope, "this_successor_candidate_only");
  assert.equal(persisted.versionAwareParentRebind.sourceBinding.path, testOnly.SOURCE_V17.path);
  assert.equal(persisted.versionAwareParentRebind.sourceRights.path, testOnly.RIGHTS_V13.path);
  assert.equal(persisted.unreboundConsumers.bindingReadiness.consumesSupersedingParents, false);
  assert.equal(persisted.unreboundConsumers.projectCopyMaterializationCandidateCM1.consumesSupersedingParents, false);
  assert.equal(
    persisted.unreboundConsumers.bindingReadiness.historicalSourceParentPath,
    "content/bazi-strength-source-binding-candidates.v1.6.0.json"
  );
});

test("formal, reviewer, expert, legal, materialization and release authority stay at zero or false", () => {
  const counts = persisted.counts;
  for (const key of [
    "knowledgeDocuments", "formalSourceRightsRecords", "formalSourceCarrierRecords",
    "projectCopyMaterializationRecords", "materializationsVerified", "verifiedNaturalPersonRightsReviewers",
    "domainExpertReviews", "rightsLegalReviews", "sourceBindingsFrozen"
  ]) assert.equal(counts[key], 0, key);
  assert.equal(persisted.reviewAndRightsBoundary.legalConclusion, "not_established");
  assert.equal(persisted.reviewAndRightsBoundary.reproductionAuthorized, false);
  assert.equal(persisted.authorityBoundary.expertTruthEstablished, false);
  assert.equal(persisted.authorityBoundary.releaseReady, false);
  assert.equal(persisted.authorityBoundary.activeAdmissionEffect, "none");
});

test("edition, provenance, live replay and integrity caveats remain false/null", () => {
  assert.equal(persisted.editionAndProvenanceBoundary.sameEditionVerified, false);
  assert.equal(persisted.editionAndProvenanceBoundary.specificWikisourceCarrierProvenanceEstablished, false);
  assert.equal(persisted.editionAndProvenanceBoundary.externalCarrierLiveVerifiedThisRun, false);
  assert.equal(persisted.releaseGovernance.activeLine, "legacy-v13");
  assert.equal(persisted.releaseGovernance.targetSchema, 13);
  assert.equal(persisted.releaseGovernance.migrationId, null);
  assert.equal(persisted.integrityBoundary.crossFileAtomicSnapshot, false);
  assert.equal(persisted.integrityBoundary.mutationEpochAvailableForSchema13, false);
  assert.equal(persisted.integrityBoundary.mutationEpochReceipt, null);
  assert.equal(persisted.integrityBoundary.intervalMutationExcludedAcrossFiles, false);
  assert.equal(persisted.integrityBoundary.abaExcluded, false);
});

test("upstream verification accepts the two genuine private brands", () => {
  assert.doesNotThrow(() => testOnly.assertVerifiedUpstreams(smtSupersession, predecessorCapability));
});

test("clone of SMT supersession summary cannot forge its WeakSet brand", () => {
  assert.throws(
    () => testOnly.assertVerifiedUpstreams(clone(smtSupersession), predecessorCapability),
    (error) => error?.code === "SUPERSESSION_BRAND_REQUIRED"
  );
});

test("shape-compatible object cannot forge predecessor readiness private brand", () => {
  assert.throws(
    () => testOnly.assertVerifiedUpstreams(smtSupersession, {}),
    (error) => error?.code === "PREDECESSOR_BRAND_REQUIRED"
  );
});

test("descriptor-safe canonicalization rejects accessors without invoking them", () => {
  let invoked = false;
  const hostile = {};
  Object.defineProperty(hostile, "value", {
    enumerable: true,
    get() {
      invoked = true;
      return 1;
    }
  });
  assert.throws(() => testOnly.canonicalStringify(hostile), (error) => error?.code === "NON_PASSIVE_OBJECT");
  assert.equal(invoked, false);
});

test("descriptor-safe canonicalization rejects symbol keys and sparse arrays", () => {
  const symbolObject = { ok: true };
  symbolObject[Symbol("hidden")] = true;
  assert.throws(() => testOnly.canonicalStringify(symbolObject), (error) => error?.code === "NON_JSON_KEY");
  const sparse = [];
  sparse.length = 2;
  sparse[1] = "x";
  assert.throws(() => testOnly.canonicalStringify(sparse), (error) => error?.code === "NON_PASSIVE_OBJECT");
});

test("canonical digest forgery cannot change ledger identity", () => {
  const forged = clone(persisted);
  forged.ledgerId = "hakimi.bazi.source-carrier-record-readiness.version-aware-candidate/9.9.9";
  assert.throws(
    () => testOnly.assertPersistedCandidateSemantic(forgeDigest(forged), bundle.ledger),
    (error) => error?.code === "SEMANTIC_DRIFT"
  );
});

test("old/new source-rights mixing in the sixth row is rejected even with a recomputed digest", () => {
  const forged = clone(persisted);
  forged.successorCarrierGap.sourceCandidateId = "smt-siku-v10-wikisource-r761703-candidate-v1";
  forged.successorCarrierGap.rightsCandidateId = "smt-siku-v10-wikisource-r761703-rights-candidate-v1";
  rejectsProjection(forged);
});

test("deleting the sixth sequence row is rejected even with a recomputed digest", () => {
  const forged = clone(persisted);
  forged.carrierGapSequence.pop();
  rejectsProjection(forged);
});

test("omitting any predecessor carrier row is rejected even with a recomputed digest", () => {
  const forged = clone(persisted);
  forged.carrierGapSequence.splice(1, 1);
  rejectsProjection(forged);
});

test("merging the two DTT rows is rejected even with a recomputed digest", () => {
  const forged = clone(persisted);
  forged.carrierGapSequence[2].rowId = forged.carrierGapSequence[1].rowId;
  forged.carrierGapSequence[2].fullRowDigest = forged.carrierGapSequence[1].fullRowDigest;
  rejectsProjection(forged);
});

test("reordering the fifth and sixth rows is rejected even with a recomputed digest", () => {
  const forged = clone(persisted);
  [forged.carrierGapSequence[4], forged.carrierGapSequence[5]] =
    [forged.carrierGapSequence[5], forged.carrierGapSequence[4]];
  rejectsProjection(forged);
});

test("changing the sixth carrier byte digest is rejected even with a recomputed digest", () => {
  const forged = clone(persisted);
  forged.successorCarrierGap.observedCarrierIdentity.carrierRawSha256 = "0".repeat(64);
  rejectsProjection(forged);
});

test("formal and rights escalation is rejected even with a recomputed digest", () => {
  const forged = clone(persisted);
  forged.counts.formalSourceCarrierRecords = 1;
  forged.reviewAndRightsBoundary.reproductionAuthorized = true;
  forged.reviewAndRightsBoundary.legalConclusion = "established";
  rejectsProjection(forged);
});

test("expert, release, binding and consumer-rebind escalation is rejected even with a recomputed digest", () => {
  const forged = clone(persisted);
  forged.authorityBoundary.expertTruthEstablished = true;
  forged.authorityBoundary.releaseReady = true;
  forged.releaseGovernance.publicDeploymentAuthorized = true;
  forged.counts.sourceBindingsFrozen = 12;
  forged.unreboundConsumers.bindingReadiness.consumesSupersedingParents = true;
  forged.unreboundConsumers.projectCopyMaterializationCandidateCM1.consumesSupersedingParents = true;
  rejectsProjection(forged);
});

test("raw source input with historical SMT candidate mixed into v1.7 is rejected", () => {
  const mixedSource = clone(source);
  mixedSource.candidates[0].candidateId = "smt-siku-v10-wikisource-r761703-candidate-v1";
  assert.throws(
    () => testOnly.verifyInputs(mixedSource, rights, receipt, predecessor),
    (error) => error?.code === "SEMANTIC_DRIFT"
  );
});
