import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BAZI_BINDING_FREEZE_REQUIREMENT_DEFINITIONS,
  buildCurrentBaziBindingFreezeRequirements,
  canonicalStringifyBaziBindingFreezeRequirements,
  readBaziBindingFreezeRequirements,
  verifyBaziBindingCandidateRightsTrustChain,
  verifyBaziDttNoticeReconciliationGate,
  verifyBaziBindingFreezeRequirements
} from "./bazi-binding-freeze-requirements-lib.mjs";
import { loadBaziDttNoticeReconciliation } from "./bazi-dtt-notice-reconciliation-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function expectMismatch(candidate) {
  await assert.rejects(
    verifyBaziBindingFreezeRequirements(workspaceRoot, candidate),
    /readiness 与当前 12 条注册表、工程候选账、来源候选账、三层权利账、DTT 告示 reconciliation 或失败关闭状态不一致/u
  );
}

test("current readiness ledger exactly binds all 12 bazi strength bindings", async () => {
  const ledger = await readBaziBindingFreezeRequirements(workspaceRoot);
  const expected = await buildCurrentBaziBindingFreezeRequirements(workspaceRoot, {
    createdAt: ledger.createdAt
  });
  assert.equal(
    canonicalStringifyBaziBindingFreezeRequirements(ledger),
    canonicalStringifyBaziBindingFreezeRequirements(expected)
  );
  const verified = await verifyBaziBindingFreezeRequirements(workspaceRoot, ledger);
  assert.equal(verified.bindingRequired, 12);
  assert.equal(verified.dttNoticeDiscrepancyPromotionBlocked, true);
  assert.equal(verified.sourceNoticeReconciliationsResolved, 0);
  assert.equal(new Set(ledger.bindings.map((entry) => entry.bindingId)).size, 12);
  assert.equal(new Set(ledger.bindings.map((entry) => entry.evidenceSubjectId)).size, 12);
});

test("versioned DTT C-L3 overlay is the mandatory deny-only notice reconciliation gate", async () => {
  const [ledger, evidence] = await Promise.all([
    readBaziBindingFreezeRequirements(workspaceRoot),
    loadBaziDttNoticeReconciliation(workspaceRoot)
  ]);
  const basis = (relativePath) => ledger.basisArtifacts.find((entry) => entry.path === relativePath);
  assert.deepEqual(
    verifyBaziDttNoticeReconciliationGate(evidence, {
      overlayArtifact: basis("content/system-admission/bazi-dtt-notice-reconciliation.v1.json"),
      sourceArtifact: basis("content/bazi-strength-source-binding-candidates.v1.json"),
      rightsArtifact: basis("content/bazi-strength-source-rights-candidates.v1.json")
    }),
    ledger.dttNoticeReconciliationGate
  );
  assert.equal(ledger.defaultClosureRequirements.activeParentNoticeReconciliationRequiredBeforePromotion, true);
  assert.equal(ledger.dttNoticeReconciliationGate.oldidMainSlotPdOldLiteralObserved, false);
  assert.equal(ledger.dttNoticeReconciliationGate.renderedPagePdOldDependencyObserved, true);
  assert.equal(ledger.dttNoticeReconciliationGate.oldidAlonePinsRenderedNotice, false);
  assert.equal(ledger.dttNoticeReconciliationGate.noticeDiscrepancyResolved, false);
  assert.equal(ledger.dttNoticeReconciliationGate.currentParentsVersionedSupersessionComplete, false);
  assert.equal(ledger.dttNoticeReconciliationGate.promotionBlocked, true);
  assert.equal(ledger.dttNoticeReconciliationGate.currentDistributionBoundary, "link_only_no_redistribution_clearance");
  assert.equal(ledger.dttNoticeReconciliationGate.formalSourceRightsRecordCount, 0);
  assert.equal(ledger.dttNoticeReconciliationGate.formalSourceCarrierRecordCount, 0);
  assert.equal(ledger.dttNoticeReconciliationGate.bindingFrozenVerified, 0);
  assert.equal(ledger.dttNoticeReconciliationGate.rightsLegalConclusionEstablished, false);
  assert.equal(ledger.dttNoticeReconciliationGate.publicDeploymentAuthorized, false);
  assert.equal(ledger.dttNoticeReconciliationGate.expertClaimsAuthorized, false);
  assert.throws(
    () => verifyBaziDttNoticeReconciliationGate(clone(evidence), {}),
    /完整 C-L3 loader/u
  );
});

test("readiness inventory keeps seven engineering four historical and one review-gate binding separate", async () => {
  const ledger = await readBaziBindingFreezeRequirements(workspaceRoot);
  assert.equal(ledger.gateSummary.projectEngineeringBindings, 7);
  assert.equal(ledger.gateSummary.historicalTextBindings, 4);
  assert.equal(ledger.gateSummary.reviewGateBindings, 1);
  assert.equal(BAZI_BINDING_FREEZE_REQUIREMENT_DEFINITIONS.length, 12);
  assert.equal(
    ledger.bindings.filter((entry) => entry.authorityBoundary === "engineering_definition_only_must_not_be_claimed_as_ancient_text").length,
    7
  );
  assert.equal(ledger.bindings.every((entry) => entry.traditionalAuthorityClaimed === false), true);
  assert.equal(ledger.bindings.every((entry) => entry.parameterAuthorityClaimed === false), true);
});

test("readiness trust chain cannot verify source and rights without branded C-L3 reconciliation", async () => {
  const [sourceLedger, rightsLedger, reconciliation] = await Promise.all([
    readFile(path.join(workspaceRoot, "content/bazi-strength-source-binding-candidates.v1.json"), "utf8").then(JSON.parse),
    readFile(path.join(workspaceRoot, "content/bazi-strength-source-rights-candidates.v1.json"), "utf8").then(JSON.parse),
    loadBaziDttNoticeReconciliation(workspaceRoot)
  ]);
  assert.throws(
    () => verifyBaziBindingCandidateRightsTrustChain(sourceLedger, rightsLedger),
    /必须消费完整品牌化 C-L3 reconciliation/u
  );
  assert.deepEqual(
    verifyBaziBindingCandidateRightsTrustChain(sourceLedger, rightsLedger, reconciliation),
    {
      sourceCandidatesVerified: 4,
      rightsCandidatesVerified: 4,
      carrierAnchorsVerified: 5
    }
  );

  const wrongRightsIdentity = clone(rightsLedger);
  wrongRightsIdentity.candidates[0].sourceCandidateId = rightsLedger.candidates[1].sourceCandidateId;
  assert.throws(
    () => verifyBaziBindingCandidateRightsTrustChain(sourceLedger, wrongRightsIdentity, reconciliation),
    /来源／三层权利候选信任链无效/u
  );

  const missingCarrier = clone(rightsLedger);
  missingCarrier.candidates[1].carrierLayers.pop();
  assert.throws(
    () => verifyBaziBindingCandidateRightsTrustChain(sourceLedger, missingCarrier, reconciliation),
    /来源／三层权利候选信任链无效/u
  );

  const forgedSourceRevision = clone(sourceLedger);
  forgedSourceRevision.candidates[0].carrierIdentity.revisionId += 1;
  assert.throws(
    () => verifyBaziBindingCandidateRightsTrustChain(forgedSourceRevision, rightsLedger, reconciliation),
    /来源／三层权利候选信任链无效/u
  );
});

test("seven engineering candidate envelopes remain unreviewed and unfrozen", async () => {
  const ledger = await readBaziBindingFreezeRequirements(workspaceRoot);
  const engineeringCandidates = ledger.bindings.filter(
    (entry) => entry.candidateState === "project_engineering_candidate_envelope"
  );
  assert.equal(engineeringCandidates.length, 7);
  assert.equal(ledger.gateSummary.engineeringCandidateEnvelopesMechanicallyVerified, 7);
  assert.equal(ledger.gateSummary.engineeringCandidateArtifactIdentitiesMechanicallyVerified, 7);
  assert.equal(ledger.gateSummary.engineeringRationaleDraftsObserved, 7);
  assert.equal(ledger.gateSummary.engineeringRationalesFrozen, 0);
  assert.equal(engineeringCandidates.every((entry) => entry.freezeState === "candidate_only_unbound"), true);
  assert.equal(engineeringCandidates.every((entry) => entry.engineeringRationaleFrozen === false), true);
});

test("four historical source candidates and six quote digests remain candidates only", async () => {
  const ledger = await readBaziBindingFreezeRequirements(workspaceRoot);
  const candidateBindings = ledger.bindings.filter(
    (entry) => entry.candidateState === "public_revision_and_facsimile_candidate"
  );
  assert.equal(candidateBindings.length, 4);
  assert.equal(ledger.gateSummary.sourceCandidatesObserved, 4);
  assert.equal(ledger.gateSummary.candidateQuoteDigestsObserved, 6);
  assert.equal(ledger.gateSummary.normalizedFacsimileCollationCandidatesObserved, 7);
  assert.equal(ledger.gateSummary.exactGlyphFacsimileCorrespondenceCandidatesObserved, 1);
  assert.equal(ledger.gateSummary.exactFacsimileCollationsVerified, 0);
  assert.equal(ledger.gateSummary.independentHumanFacsimileCollationsVerified, 0);
  assert.equal(ledger.gateSummary.registryLocatorsMechanicallyVerified, 10);
  assert.equal(ledger.gateSummary.registryLocatorsPendingManualTextualVerification, 2);
  assert.equal(candidateBindings.every((entry) => entry.sourceBodyStored === false), true);
  assert.equal(candidateBindings.every((entry) => entry.exactQuoteTextStored === false), true);
  assert.equal(candidateBindings.every((entry) => entry.formalDistributionPolicy === null), true);
});

test("every formal freeze rights and expert closure remains empty", async () => {
  const ledger = await readBaziBindingFreezeRequirements(workspaceRoot);
  assert.equal(ledger.gateSummary.bindingFrozenVerified, 0);
  for (const entry of ledger.bindings) {
    assert.equal(entry.sourceBodyDigest, null);
    assert.equal(entry.exactQuoteDigest, null);
    assert.equal(entry.exactLocatorEstablishedForFreeze, false);
    assert.equal(entry.workIdentityFrozen, false);
    assert.equal(entry.editionIdentityFrozen, false);
    assert.equal(entry.carrierIdentityFrozen, false);
    assert.equal(entry.engineeringRationaleFrozen, false);
    assert.deepEqual(entry.ruleIds, []);
    assert.equal(entry.workRightsEvidenceBound, false);
    assert.equal(entry.editionRightsEvidenceBound, false);
    assert.equal(entry.carrierRightsEvidenceBound, false);
    assert.equal(entry.sourceRightsRecordId, null);
    assert.equal(entry.sourceCarrierRecordId, null);
    assert.deepEqual(entry.independentSourceRightsReviewerIds, []);
    assert.deepEqual(entry.independentDomainReviewIds, []);
    assert.equal(entry.frozenAt, null);
    assert.equal(entry.bindingDigest, null);
  }
});

test("formal evidence authority and completion cannot be fabricated", async () => {
  const ledger = await readBaziBindingFreezeRequirements(workspaceRoot);
  const mutations = [
    (value) => { value.bindings[0].freezeState = "frozen_verified"; },
    (value) => { value.bindings[0].engineeringRationaleFrozen = true; },
    (value) => { value.bindings[0].traditionalAuthorityClaimed = true; },
    (value) => { value.bindings[7].exactQuoteTextStored = true; },
    (value) => { value.bindings[7].carrierRightsEvidenceBound = true; },
    (value) => { value.bindings[7].independentDomainReviewIds = ["expert:invented"]; },
    (value) => { value.gateSummary.bindingFrozenVerified = 1; },
    (value) => { value.gateSummary.sourceBundleComplete = true; },
    (value) => { value.dttNoticeReconciliationGate.noticeDiscrepancyResolved = true; },
    (value) => { value.dttNoticeReconciliationGate.promotionBlocked = false; },
    (value) => { value.dttNoticeReconciliationGate.oldidMainSlotPdOldLiteralObserved = true; },
    (value) => { value.dttNoticeReconciliationGate.formalSourceRightsRecordCount = 1; },
    (value) => { value.dttNoticeReconciliationGate.legalConclusion = "cleared"; },
    (value) => { value.dttNoticeReconciliationGate.crossFileAtomicSnapshot = true; },
    (value) => { value.gateSummary.sourceNoticeReconciliationsResolved = 1; },
    (value) => { value.gateSummary.sourceNoticeDiscrepancyPromotionBlocks = 0; }
  ];
  for (const mutate of mutations) {
    const candidate = clone(ledger);
    mutate(candidate);
    await expectMismatch(candidate);
  }
});

test("governance basis digests and exact fields fail closed", async () => {
  const ledger = await readBaziBindingFreezeRequirements(workspaceRoot);
  const mutations = [
    (value) => { value.releaseGovernance.targetSchema = 14; },
    (value) => { value.releaseGovernance.migrationId = "invented"; },
    (value) => { value.releaseGovernance.publicDeploymentAuthorized = true; },
    (value) => { value.releaseGovernance.expertClaimsAuthorized = true; },
    (value) => { value.basisArtifacts[0].sha256 = "0".repeat(64); },
    (value) => { value.bindings.pop(); },
    (value) => { value.legalConclusion = "cleared"; }
  ];
  for (const mutate of mutations) {
    const candidate = clone(ledger);
    mutate(candidate);
    await expectMismatch(candidate);
  }
});
