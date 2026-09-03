import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  BAZI_ENGINEERING_BINDING_CANDIDATE_DEFINITIONS,
  computeEngineeringBindingCandidateDigest,
  computeEngineeringBindingCandidateLedgerDigest,
  readBaziEngineeringBindingCandidateLedger,
  verifyBaziEngineeringBindingCandidateLedger
} from "./bazi-engineering-binding-candidate-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ledger = await readBaziEngineeringBindingCandidateLedger(workspaceRoot);

function refreshedLedger(mutator) {
  const candidate = structuredClone(ledger);
  mutator(candidate);
  candidate.candidates.forEach((entry) => {
    entry.candidateDigest = computeEngineeringBindingCandidateDigest(entry);
  });
  candidate.ledgerDigest = computeEngineeringBindingCandidateLedgerDigest(candidate);
  return candidate;
}

async function expectMismatch(mutator) {
  await assert.rejects(
    verifyBaziEngineeringBindingCandidateLedger(workspaceRoot, refreshedLedger(mutator)),
    /与当前七条注册表、代码身份、claim 消费者或失败关闭状态不一致/u
  );
}

test("accepts seven hash-only engineering binding candidate envelopes", async () => {
  const verified = await verifyBaziEngineeringBindingCandidateLedger(workspaceRoot, structuredClone(ledger));
  assert.equal(verified.candidatesVerified, 7);
  assert.equal(verified.bindingsFrozen, 0);
  assert.equal(BAZI_ENGINEERING_BINDING_CANDIDATE_DEFINITIONS.length, 7);
  assert.equal(new Set(ledger.candidates.map((entry) => entry.bindingId)).size, 7);
  assert.equal(ledger.gateSummary.uniqueRepositoryArtifactsLocked, 3);
  assert.equal(ledger.gateSummary.consumerClaimBindingLinksMechanicallyVerified, 9);
});

test("keeps rationale drafts unreviewed and all authority gates closed", async () => {
  assert.equal(ledger.gateSummary.rationaleDraftsPresent, 7);
  assert.equal(ledger.gateSummary.engineeringRationalesFrozen, 0);
  assert.equal(ledger.gateSummary.engineeringReviewsVerified, 0);
  assert.equal(ledger.gateSummary.independentDomainReviewsVerified, 0);
  assert.equal(ledger.gateSummary.classicalAuthorityClaims, 0);
  assert.equal(ledger.gateSummary.expertAuthorityClaims, 0);
  assert.equal(ledger.gateSummary.releaseReady, false);
  for (const candidate of ledger.candidates) {
    assert.equal(candidate.reviewState.engineeringRationaleFrozen, false);
    assert.equal(candidate.reviewState.bindingFreezeEffect, "none");
    assert.equal(candidate.authorityClaims.classicalAuthorityClaimed, false);
    assert.equal(candidate.authorityClaims.expertAuthorityClaimed, false);
  }
});

test("rejects candidate identity order and parallel binding drift", async () => {
  await expectMismatch((value) => { value.candidates.reverse(); });
  await expectMismatch((value) => { value.candidates[0].bindingId = "strength.parallel.binding"; });
  await expectMismatch((value) => { value.candidates[0].evidenceSubjectId = "parallel.subject"; });
});

test("rejects artifact hash stable-symbol and registry-locator drift", async () => {
  await expectMismatch((value) => { value.candidates[0].artifactLocks[0].sha256 = "f".repeat(64); });
  await expectMismatch((value) => { value.candidates[0].artifactLocks[0].stableSymbols.pop(); });
  await expectMismatch((value) => { value.candidates[0].registryLocator.value = "parallelSymbol"; });
});

test("rejects claim consumer and engineering rationale drift", async () => {
  await expectMismatch((value) => { value.candidates[1].consumerClaimIds.pop(); });
  await expectMismatch((value) => { value.candidates[3].rationaleDraft = "authoritative ancient rule"; });
  await expectMismatch((value) => { value.candidates[5].forbiddenClaims.pop(); });
});

test("rejects source-body copies rights promotion and fabricated review evidence", async () => {
  await expectMismatch((value) => { value.candidates[0].repositoryStorageObservation.separateSourceBodyCopied = true; });
  await expectMismatch((value) => { value.candidates[0].rightsState.redistributionClearanceEstablished = true; });
  await expectMismatch((value) => { value.candidates[0].reviewState.engineeringReviewIds = ["invented-review"]; });
  await expectMismatch((value) => { value.candidates[0].reviewState.independentDomainReviewIds = ["invented-expert"]; });
});

test("rejects freeze authority content truth or release promotion", async () => {
  await expectMismatch((value) => { value.candidates[0].reviewState.engineeringRationaleFrozen = true; });
  await expectMismatch((value) => { value.candidates[0].reviewState.bindingFreezeEffect = "frozen"; });
  await expectMismatch((value) => { value.candidates[0].authorityClaims.classicalAuthorityClaimed = true; });
  await expectMismatch((value) => { value.gateSummary.contentTruthEstablished = true; });
  await expectMismatch((value) => { value.gateSummary.releaseReady = true; });
});

test("rejects governance promotion unknown fields and stale digests", async () => {
  await expectMismatch((value) => { value.releaseGovernance.targetSchema = 14; });
  await expectMismatch((value) => { value.releaseGovernance.publicDeploymentAuthorized = true; });
  await expectMismatch((value) => { value.legalConclusion = "cleared"; });
  const stale = structuredClone(ledger);
  stale.candidates[0].rationaleDraft = "drift";
  await assert.rejects(
    verifyBaziEngineeringBindingCandidateLedger(workspaceRoot, stale),
    /与当前七条注册表、代码身份、claim 消费者或失败关闭状态不一致/u
  );
});
