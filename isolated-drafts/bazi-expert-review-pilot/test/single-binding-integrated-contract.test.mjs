import assert from "node:assert/strict";
import test from "node:test";

import {
  SINGLE_BINDING_INTEGRATED_BOUNDARY,
  SINGLE_BINDING_INTEGRATED_BINDING_IDENTITY_DIGEST,
  SINGLE_BINDING_INTEGRATED_RECORD_TYPES,
  SINGLE_BINDING_INTEGRATED_WORKFLOW_VERSION,
  SingleBindingIntegratedError,
  createSingleBindingIntegratedDraft,
  createSingleBindingIntegratedSessionBinding,
  finalizeSingleBindingIntegratedSubmission,
  isSingleBindingIntegratedReadbackCandidate,
  isSingleBindingIntegratedSubmissionCandidate,
  prepareSingleBindingIntegratedReadback,
  preflightSingleBindingIntegratedSubmissionValue
} from "../single-binding-integrated-contract.js";
import { SYNTHETIC_REHEARSAL_FIXTURE_REF } from "../single-binding-rehearsal-contract.js";

function sessionBinding(seatId = "A", overrides = {}) {
  return {
    schemaVersion: "1.0.0",
    recordType: "bazi_expert_single_binding_nocode_synthetic_pilot_session_binding_v1",
    workflowVersion: SINGLE_BINDING_INTEGRATED_WORKFLOW_VERSION,
    bindingMode: "source_tree_synthetic_integration_test",
    reviewCycleId: `single-binding-synthetic-review-cycle.${"1".repeat(64)}`,
    pairRunId: `single-binding-synthetic-pair-run.${"2".repeat(64)}`,
    seatId,
    seatSessionNonce: `single-binding-synthetic-seat-session.${(seatId === "A" ? "3" : "4").repeat(64)}`,
    pairPrecommitRawSha256: "5".repeat(64),
    pairManifestRawSha256: "6".repeat(64),
    seatPackageManifestRawSha256: (seatId === "A" ? "7" : "8").repeat(64),
    syntheticRehearsalManifestDigest: SYNTHETIC_REHEARSAL_FIXTURE_REF.syntheticRehearsalManifestDigest,
    fixtureContentDigest: SYNTHETIC_REHEARSAL_FIXTURE_REF.fixtureContentDigest,
    questionSetDigest: SYNTHETIC_REHEARSAL_FIXTURE_REF.questionSetDigest,
    candidateDigest: SYNTHETIC_REHEARSAL_FIXTURE_REF.candidateDigest,
    bindingId: SYNTHETIC_REHEARSAL_FIXTURE_REF.bindingId,
    bindingIdentityDigest: SINGLE_BINDING_INTEGRATED_BINDING_IDENTITY_DIGEST,
    selectedBindingCount: 1,
    ...overrides
  };
}

function fillInner(inner, { suffix = "A", coordinator = true } = {}) {
  inner.startAcknowledgement.syntheticOnly = true;
  inner.reviewResponse.position = "conditional";
  inner.reviewResponse.rationale = `只凭合成边界不能建立阈值有效性-${suffix}`;
  inner.reviewResponse.applicabilityConditions = `需要冻结流派口径-${suffix}`;
  inner.reviewResponse.counterexamplesOrNeededEvidence = `需要独立来源和合成反例-${suffix}`;
  inner.reviewResponse.highRiskDisposition = "defer";
  inner.reviewResponse.revisionSuggestion = `同时展示材料缺口-${suffix}`;
  inner.captureContext.entryMethod = coordinator
    ? "coordinator_verbatim_transcription"
    : "expert_self_entered";
  inner.captureContext.coordinatorVerbatimNoSummarySelfDeclared = coordinator;
  inner.captureContext.assistanceCategories = coordinator
    ? ["books_or_source_materials"]
    : ["none_declared"];
  return inner;
}

function confirmInner(inner) {
  for (const key of Object.keys(inner.finalConfirmations)) inner.finalConfirmations[key] = true;
}

async function complete(seatId = "A", suffix = seatId) {
  const draft = createSingleBindingIntegratedDraft(sessionBinding(seatId));
  fillInner(draft.innerDraft, { suffix });
  const readback = await prepareSingleBindingIntegratedReadback(draft);
  confirmInner(draft.innerDraft);
  const submission = await finalizeSingleBindingIntegratedSubmission(draft, readback);
  return { draft, readback, submission };
}

function expectCode(code) {
  return (error) => error instanceof SingleBindingIntegratedError && error.code === code;
}

test("freezes an exact pre-readback session binding without granting authority", () => {
  const binding = createSingleBindingIntegratedSessionBinding(sessionBinding("A"));
  assert.equal(Object.isFrozen(binding), true);
  assert.equal(binding.seatId, "A");
  assert.equal(binding.selectedBindingCount, 1);
  assert.equal(SINGLE_BINDING_INTEGRATED_BOUNDARY.sessionBindingMechanicallyCoveredByReadbackDigest, true);
  for (const key of [
    "sessionBindingPinProvenanceVerified", "sessionBindingSignatureVerified",
    "reviewerActuallyConfirmedSessionBindingEstablished", "actualHumanParticipationEstablished",
    "actualHumanIndependenceEstablished", "formalAdmissionAllowed", "expertVsAiAccuracyEvaluated",
    "contentTruthEstablished", "expertTruthEstablished", "rightsLegalConclusionEstablished",
    "releaseReady", "publicReleaseAuthorized", "expertClaimsAuthorized", "safeToPublish"
  ]) assert.equal(SINGLE_BINDING_INTEGRATED_BOUNDARY[key], false, key);
  assert.equal(SINGLE_BINDING_INTEGRATED_BOUNDARY.verifiedExpertCount, 0);
  assert.equal(SINGLE_BINDING_INTEGRATED_BOUNDARY.frozenBindingCount, 0);
  for (const override of [
    { reviewCycleId: `single-binding-synthetic-review-cycle.${"0".repeat(64)}` },
    { pairRunId: `single-binding-synthetic-pair-run.${"0".repeat(64)}` },
    { seatSessionNonce: `single-binding-synthetic-seat-session.${"0".repeat(64)}` }
  ]) {
    assert.throws(
      () => createSingleBindingIntegratedSessionBinding(sessionBinding("A", override)),
      expectCode("SESSION_BINDING_IDENTITY_INVALID")
    );
  }
  assert.throws(
    () => createSingleBindingIntegratedSessionBinding(sessionBinding("A", {
      bindingIdentityDigest: "f".repeat(64)
    })),
    expectCode("SESSION_BINDING_INPUT_IDENTITY_MISMATCH")
  );
});

test("covers session binding, inner readback and final confirmations in one live submission", async () => {
  const { readback, submission } = await complete("A");
  assert.equal(isSingleBindingIntegratedReadbackCandidate(readback), true);
  assert.equal(isSingleBindingIntegratedSubmissionCandidate(submission), true);
  assert.equal(submission.sessionReadbackSnapshot.sessionBinding.reviewCycleId, sessionBinding("A").reviewCycleId);
  assert.equal(submission.innerSubmission.reviewSnapshot.captureContext.entryMethod, "coordinator_verbatim_transcription");
  assert.equal(submission.boundary.formalAdmissionAllowed, false);
  assert.equal(submission.mutationBoundary.schema13MutationEpochUsed, false);
  const imported = await preflightSingleBindingIntegratedSubmissionValue(
    structuredClone(submission),
    { expectedSessionBinding: sessionBinding("A") }
  );
  assert.equal(imported.submissionDigest, submission.submissionDigest);
  assert.equal(isSingleBindingIntegratedSubmissionCandidate(imported), false);
});

test("does not allow a session to be attached after the old unbound rehearsal completed", async () => {
  const { submission } = await complete("A");
  await assert.rejects(
    () => preflightSingleBindingIntegratedSubmissionValue(
      submission.innerSubmission,
      { expectedSessionBinding: sessionBinding("A") }
    ),
    expectCode("INPUT_SHAPE_INVALID")
  );
});

test("rejects cross-draft readback, repeated completion and a superseded readback", async () => {
  const first = createSingleBindingIntegratedDraft(sessionBinding("A"));
  const second = createSingleBindingIntegratedDraft(sessionBinding("A", {
    seatSessionNonce: `single-binding-synthetic-seat-session.${"9".repeat(64)}`
  }));
  fillInner(first.innerDraft);
  fillInner(second.innerDraft);
  const firstReadback = await prepareSingleBindingIntegratedReadback(first);
  const secondReadback = await prepareSingleBindingIntegratedReadback(second);
  confirmInner(first.innerDraft);
  confirmInner(second.innerDraft);
  await assert.rejects(
    () => finalizeSingleBindingIntegratedSubmission(second, firstReadback),
    expectCode("INTEGRATED_READBACK_DRAFT_MISMATCH")
  );
  await finalizeSingleBindingIntegratedSubmission(first, firstReadback);
  await assert.rejects(
    () => finalizeSingleBindingIntegratedSubmission(first, firstReadback),
    expectCode("INTEGRATED_READBACK_ALREADY_CONSUMED")
  );
  await finalizeSingleBindingIntegratedSubmission(second, secondReadback);

  const third = createSingleBindingIntegratedDraft(sessionBinding("B"));
  fillInner(third.innerDraft);
  const older = await prepareSingleBindingIntegratedReadback(third);
  const newer = await prepareSingleBindingIntegratedReadback(third);
  confirmInner(third.innerDraft);
  await assert.rejects(
    () => finalizeSingleBindingIntegratedSubmission(third, older),
    expectCode("INTEGRATED_READBACK_SUPERSEDED")
  );
  await finalizeSingleBindingIntegratedSubmission(third, newer);
});

test("rejects expected cycle, pair, seat, nonce, pin and fixed-input drift", async () => {
  const { submission } = await complete("B");
  for (const [label, override] of [
    ["cycle", { reviewCycleId: `single-binding-synthetic-review-cycle.${"a".repeat(64)}` }],
    ["pair", { pairRunId: `single-binding-synthetic-pair-run.${"b".repeat(64)}` }],
    ["seat", { seatId: "A", seatSessionNonce: `single-binding-synthetic-seat-session.${"3".repeat(64)}`, seatPackageManifestRawSha256: "7".repeat(64) }],
    ["nonce", { seatSessionNonce: `single-binding-synthetic-seat-session.${"c".repeat(64)}` }],
    ["pin", { seatPackageManifestRawSha256: "d".repeat(64) }]
  ]) {
    await assert.rejects(
      () => preflightSingleBindingIntegratedSubmissionValue(
        structuredClone(submission),
        { expectedSessionBinding: sessionBinding("B", override) }
      ),
      (error) => expectCode("INTEGRATED_EXPECTED_SESSION_MISMATCH")(error),
      label
    );
  }
  assert.throws(
    () => createSingleBindingIntegratedSessionBinding(sessionBinding("A", { candidateDigest: "e".repeat(64) })),
    expectCode("SESSION_BINDING_INPUT_IDENTITY_MISMATCH")
  );
});

test("rejects outer or inner payload drift even when the expected session is unchanged", async () => {
  const { submission } = await complete("A");
  const outerDrift = structuredClone(submission);
  outerDrift.submissionDigest = "f".repeat(64);
  await assert.rejects(
    () => preflightSingleBindingIntegratedSubmissionValue(
      outerDrift,
      { expectedSessionBinding: sessionBinding("A") }
    ),
    expectCode("INTEGRATED_SUBMISSION_DIGEST_INVALID")
  );

  const innerDrift = structuredClone(submission);
  innerDrift.innerSubmission.reviewSnapshot.reviewResponse.rationale = "被改写";
  await assert.rejects(
    () => preflightSingleBindingIntegratedSubmissionValue(
      innerDrift,
      { expectedSessionBinding: sessionBinding("A") }
    ),
    (error) => error?.code === "SUBMISSION_DIGEST_INVALID"
  );
});

test("uses new integrated-only record types and rejects serialized capabilities", async () => {
  assert.deepEqual(SINGLE_BINDING_INTEGRATED_RECORD_TYPES, [
    "bazi_expert_single_binding_nocode_synthetic_pilot_session_binding_v1",
    "bazi_expert_single_binding_nocode_synthetic_pilot_session_draft_candidate_v1",
    "bazi_expert_single_binding_nocode_synthetic_pilot_session_readback_candidate_v1",
    "bazi_expert_single_binding_nocode_synthetic_pilot_session_submission_candidate_v1"
  ]);
  const draft = createSingleBindingIntegratedDraft(sessionBinding("A"));
  fillInner(draft.innerDraft);
  const readback = await prepareSingleBindingIntegratedReadback(draft);
  assert.equal(isSingleBindingIntegratedReadbackCandidate(structuredClone(readback)), false);
  confirmInner(draft.innerDraft);
  const submission = await finalizeSingleBindingIntegratedSubmission(draft, readback);
  assert.equal(isSingleBindingIntegratedSubmissionCandidate(structuredClone(submission)), false);
});

test("rejects identity, extra-field, inner-draft and session replacements on a branded draft", async () => {
  const identity = createSingleBindingIntegratedDraft(sessionBinding("A"));
  fillInner(identity.innerDraft);
  identity.recordType = "renamed-after-creation";
  await assert.rejects(
    () => prepareSingleBindingIntegratedReadback(identity),
    expectCode("INTEGRATED_DRAFT_IDENTITY_INVALID")
  );

  const extra = createSingleBindingIntegratedDraft(sessionBinding("A"));
  fillInner(extra.innerDraft);
  extra.unexpected = true;
  await assert.rejects(
    () => prepareSingleBindingIntegratedReadback(extra),
    expectCode("INPUT_SHAPE_INVALID")
  );

  const replacedInner = createSingleBindingIntegratedDraft(sessionBinding("A"));
  fillInner(replacedInner.innerDraft);
  replacedInner.innerDraft = createSingleBindingIntegratedDraft(sessionBinding("A")).innerDraft;
  await assert.rejects(
    () => prepareSingleBindingIntegratedReadback(replacedInner),
    expectCode("INTEGRATED_DRAFT_CAPABILITY_MISMATCH")
  );

  const replacedSession = createSingleBindingIntegratedDraft(sessionBinding("A"));
  fillInner(replacedSession.innerDraft);
  replacedSession.sessionBinding = createSingleBindingIntegratedSessionBinding(sessionBinding("A", {
    pairRunId: `single-binding-synthetic-pair-run.${"a".repeat(64)}`
  }));
  await assert.rejects(
    () => prepareSingleBindingIntegratedReadback(replacedSession),
    expectCode("INTEGRATED_DRAFT_CAPABILITY_MISMATCH")
  );
});
