import assert from "node:assert/strict";
import test from "node:test";

import {
  SINGLE_BINDING_INTEGRATED_BINDING_IDENTITY_DIGEST,
  SINGLE_BINDING_INTEGRATED_WORKFLOW_VERSION,
  createSingleBindingIntegratedDraft,
  finalizeSingleBindingIntegratedSubmission,
  prepareSingleBindingIntegratedReadback
} from "../single-binding-integrated-contract.js";
import {
  SINGLE_BINDING_INTEGRATED_HANDOFF_BOUNDARY,
  SINGLE_BINDING_INTEGRATED_HANDOFF_MUTATION_BOUNDARY,
  SINGLE_BINDING_INTEGRATED_PROFESSIONAL_FIELDS,
  SingleBindingIntegratedHandoffError,
  compareSingleBindingIntegratedCompleteReturns,
  createSingleBindingIntegratedHandoffArtifacts,
  isSingleBindingIntegratedCompleteReturnPreflightCandidate,
  isSingleBindingIntegratedHandoffArtifactsCandidate,
  isSingleBindingIntegratedPairComparisonCandidate,
  preflightSingleBindingIntegratedCompleteReturnBytes,
  singleBindingIntegratedFilenamesForSession
} from "../single-binding-integrated-handoff.js";
import {
  canonicalStringifySingleBindingIntegrated,
  serializeSingleBindingIntegratedUtf8Json,
  sha256SingleBindingIntegratedBytes,
  sha256SingleBindingIntegratedText
} from "../single-binding-integrated-json.js";
import {
  SYNTHETIC_REHEARSAL_FIXTURE_REF,
  createSingleBindingRehearsalDraft,
  finalizeSingleBindingRehearsal,
  prepareSingleBindingRehearsalReadback
} from "../single-binding-rehearsal-contract.js";

const COMPLETE_DOMAIN =
  "hakimi/bazi/expert-single-binding-nocode-synthetic-pilot/complete-return/v1";

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
    syntheticRehearsalManifestDigest:
      SYNTHETIC_REHEARSAL_FIXTURE_REF.syntheticRehearsalManifestDigest,
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
  for (const key of Object.keys(inner.finalConfirmations)) {
    inner.finalConfirmations[key] = true;
  }
}

async function completeIntegrated(binding, { suffix = binding.seatId, coordinator = true } = {}) {
  const draft = createSingleBindingIntegratedDraft(binding);
  fillInner(draft.innerDraft, { suffix, coordinator });
  const readback = await prepareSingleBindingIntegratedReadback(draft);
  confirmInner(draft.innerDraft);
  const submission = await finalizeSingleBindingIntegratedSubmission(draft, readback);
  const artifacts = await createSingleBindingIntegratedHandoffArtifacts(submission);
  return { binding, draft, readback, submission, artifacts };
}

function encoded(text) {
  return new TextEncoder().encode(text);
}

function pairExpected(a, b) {
  return {
    seatASessionBinding: a.binding,
    seatBSessionBinding: b.binding,
    seatACompleteReturnRawSha256: a.artifacts.completeReturnRawSha256,
    seatBCompleteReturnRawSha256: b.artifacts.completeReturnRawSha256
  };
}

async function comparePair(a, b, expected = pairExpected(a, b)) {
  return compareSingleBindingIntegratedCompleteReturns({
    seatABytes: encoded(a.artifacts.completeReturnText),
    seatBBytes: encoded(b.artifacts.completeReturnText),
    expected
  });
}

function expectHandoffCode(code) {
  return (error) => error instanceof SingleBindingIntegratedHandoffError
    && error.code === code;
}

async function resignComplete(record) {
  const { integrity: _integrity, ...unsigned } = record;
  record.integrity.recordDigest = await sha256SingleBindingIntegratedText(
    `${COMPLETE_DOMAIN}\0${canonicalStringifySingleBindingIntegrated(unsigned)}`
  );
  const text = serializeSingleBindingIntegratedUtf8Json(record);
  return {
    text,
    bytes: encoded(text),
    rawSha256: await sha256SingleBindingIntegratedText(text)
  };
}

test("builds one synthetic-pilot complete return with exact submission, seal and checksum crosslinks", async () => {
  const completed = await completeIntegrated(sessionBinding("A"));
  const { artifacts, submission } = completed;
  assert.equal(isSingleBindingIntegratedHandoffArtifactsCandidate(artifacts), true);
  assert.equal(isSingleBindingIntegratedHandoffArtifactsCandidate(structuredClone(artifacts)), false);
  assert.match(artifacts.recordType, /synthetic_pilot/u);
  assert.match(artifacts.completeReturnRecord.recordType, /synthetic_pilot/u);
  assert.match(artifacts.sealReceipt.recordType, /synthetic_pilot/u);
  assert.equal(artifacts.embeddedArtifacts.length, 3);
  assert.deepEqual(
    artifacts.embeddedArtifacts.map((entry) => entry.role),
    [
      "session_submission_original",
      "independent_file_seal_receipt",
      "session_submission_checksum_text"
    ]
  );
  assert.deepEqual(JSON.parse(artifacts.sessionSubmissionText), submission);
  assert.equal(
    artifacts.sealReceipt.rawSessionSubmissionArtifact.rawSha256,
    artifacts.sessionSubmissionRawSha256
  );
  assert.equal(
    artifacts.sealReceipt.rawSessionSubmissionArtifact.byteLength,
    artifacts.sessionSubmissionByteLength
  );
  assert.equal(
    artifacts.checksumText,
    `${artifacts.sessionSubmissionRawSha256}  ${artifacts.sessionSubmissionFilename}\n`
  );
  assert.equal(
    artifacts.completeReturnRawSha256,
    await sha256SingleBindingIntegratedText(artifacts.completeReturnText)
  );

  const preflight = await preflightSingleBindingIntegratedCompleteReturnBytes(
    encoded(artifacts.completeReturnText),
    {
      expectedSessionBinding: completed.binding,
      expectedCompleteReturnRawSha256: artifacts.completeReturnRawSha256
    }
  );
  assert.equal(isSingleBindingIntegratedCompleteReturnPreflightCandidate(preflight), true);
  assert.equal(
    isSingleBindingIntegratedCompleteReturnPreflightCandidate(structuredClone(preflight)),
    false
  );
  assert.equal(preflight.mechanicalChecks.strictUtf8AndJson, true);
  assert.equal(preflight.mechanicalChecks.sessionSubmissionSealAndChecksumCrosslinked, true);
  assert.equal(preflight.completeReturnRawSha256, artifacts.completeReturnRawSha256);
});

test("derives safe session-specific filenames so independent runs do not silently reuse one basename", () => {
  const a = singleBindingIntegratedFilenamesForSession(sessionBinding("A"));
  const aAgain = singleBindingIntegratedFilenamesForSession(sessionBinding("A"));
  const b = singleBindingIntegratedFilenamesForSession(sessionBinding("B"));
  const differentNonce = singleBindingIntegratedFilenamesForSession(sessionBinding("A", {
    seatSessionNonce: `single-binding-synthetic-seat-session.${"9".repeat(64)}`
  }));
  assert.deepEqual(aAgain, a);
  assert.notEqual(a.completeReturnFilename, b.completeReturnFilename);
  assert.notEqual(a.completeReturnFilename, differentNonce.completeReturnFilename);
  assert.match(
    a.completeReturnFilename,
    /^hakimi-bazi-single-binding-synthetic-pilot-seat-a-cycle-[a-f0-9]{8}-pair-[a-f0-9]{8}-session-[a-f0-9]{12}-complete-return\.json$/u
  );
  assert.doesNotMatch(a.completeReturnFilename, /[\\/:]/u);
  assert.equal(Object.isFrozen(a), true);
});

test("requires a live branded integrated submission and rejects a serialized clone", async () => {
  const completed = await completeIntegrated(sessionBinding("A"));
  await assert.rejects(
    () => createSingleBindingIntegratedHandoffArtifacts(structuredClone(completed.submission)),
    expectHandoffCode("LIVE_INTEGRATED_SUBMISSION_CAPABILITY_REQUIRED")
  );
});

test("compares exactly seven professional fields while keeping independent record context and no winner", async () => {
  const a = await completeIntegrated(sessionBinding("A"), { suffix: "A", coordinator: true });
  const b = await completeIntegrated(sessionBinding("B"), { suffix: "B", coordinator: false });
  const pair = await comparePair(a, b);
  assert.equal(isSingleBindingIntegratedPairComparisonCandidate(pair), true);
  assert.equal(isSingleBindingIntegratedPairComparisonCandidate(structuredClone(pair)), false);
  assert.equal(pair.totalComparedFieldCount, 7);
  assert.deepEqual(
    pair.professionalFieldRows.map((row) => row.fieldId),
    SINGLE_BINDING_INTEGRATED_PROFESSIONAL_FIELDS
  );
  assert.equal(pair.unresolvedDifferenceCount, 4);
  for (const row of pair.professionalFieldRows) {
    assert.equal(
      row.resolutionStatus,
      row.classification === "difference" ? "unresolved" : "no_difference_observed"
    );
  }
  assert.equal(pair.independentRecordContexts.A.captureContext.entryMethod, "coordinator_verbatim_transcription");
  assert.equal(pair.independentRecordContexts.B.captureContext.entryMethod, "expert_self_entered");
  assert.equal(Object.hasOwn(pair, "winnerSeatId"), false);
  assert.equal(pair.boundary.winnerSelectionAllowed, false);
  assert.equal(pair.boundary.majorityVoteAllowed, false);
  assert.equal(pair.boundary.opinionAveragingAllowed, false);
  assert.equal(pair.boundary.automaticMergeAllowed, false);
});

test("keeps 0/2, 0/12, schema 13 mutation and every authority gate fail-closed", () => {
  assert.equal(SINGLE_BINDING_INTEGRATED_HANDOFF_BOUNDARY.verifiedExpertCount, 0);
  assert.equal(SINGLE_BINDING_INTEGRATED_HANDOFF_BOUNDARY.requiredExpertCount, 2);
  assert.equal(SINGLE_BINDING_INTEGRATED_HANDOFF_BOUNDARY.frozenBindingCount, 0);
  assert.equal(SINGLE_BINDING_INTEGRATED_HANDOFF_BOUNDARY.requiredBindingCount, 12);
  assert.equal(SINGLE_BINDING_INTEGRATED_HANDOFF_MUTATION_BOUNDARY.schema13MutationEpochUsed, false);
  for (const key of [
    "formalPurposeReused", "formalRecordEmitted", "pilotToFormalConversionAllowed",
    "formalAdmissionAllowed", "expertVsAiAccuracyEvaluated", "predictiveAccuracyEvaluated",
    "accuracyStudyRecordEmitted", "contentTruthEstablished", "expertTruthEstablished",
    "rightsLegalConclusionEstablished", "releaseReady", "publicReleaseAuthorized",
    "publicDeploymentAuthorized", "expertClaimsAuthorized", "safeToPublish"
  ]) {
    assert.equal(SINGLE_BINDING_INTEGRATED_HANDOFF_BOUNDARY[key], false, key);
  }
});

test("rejects package-external cycle, pair, seat, package pin and nonce drift", async () => {
  const completed = await completeIntegrated(sessionBinding("B"));
  const bytes = encoded(completed.artifacts.completeReturnText);
  for (const [label, override] of [
    ["cycle", { reviewCycleId: `single-binding-synthetic-review-cycle.${"a".repeat(64)}` }],
    ["pair", { pairRunId: `single-binding-synthetic-pair-run.${"b".repeat(64)}` }],
    ["seat", { seatId: "A" }],
    ["package pin", { seatPackageManifestRawSha256: "c".repeat(64) }],
    ["nonce", { seatSessionNonce: `single-binding-synthetic-seat-session.${"d".repeat(64)}` }]
  ]) {
    await assert.rejects(
      () => preflightSingleBindingIntegratedCompleteReturnBytes(bytes, {
        expectedSessionBinding: sessionBinding("B", override),
        expectedCompleteReturnRawSha256: completed.artifacts.completeReturnRawSha256
      }),
      undefined,
      label
    );
  }
});

test("rejects cross-cycle, cross-pair, precommit, pair-manifest, nonce and package-pin pairings", async () => {
  const a = await completeIntegrated(sessionBinding("A"));
  const b = await completeIntegrated(sessionBinding("B"));
  for (const [label, override, code] of [
    ["cycle", { reviewCycleId: `single-binding-synthetic-review-cycle.${"a".repeat(64)}` }, "PAIR_COMMON_BINDING_MISMATCH"],
    ["pair", { pairRunId: `single-binding-synthetic-pair-run.${"b".repeat(64)}` }, "PAIR_COMMON_BINDING_MISMATCH"],
    ["precommit", { pairPrecommitRawSha256: "c".repeat(64) }, "PAIR_COMMON_BINDING_MISMATCH"],
    ["pair manifest", { pairManifestRawSha256: "d".repeat(64) }, "PAIR_COMMON_BINDING_MISMATCH"],
    ["nonce", { seatSessionNonce: a.binding.seatSessionNonce }, "PAIR_NONCES_NOT_DISTINCT"],
    ["package pin", { seatPackageManifestRawSha256: a.binding.seatPackageManifestRawSha256 }, "PAIR_PACKAGE_PINS_NOT_DISTINCT"]
  ]) {
    const expected = pairExpected(a, b);
    expected.seatBSessionBinding = sessionBinding("B", override);
    await assert.rejects(
      () => comparePair(a, b, expected),
      (error) => expectHandoffCode(code)(error),
      label
    );
  }
});

test("rejects an incorrect complete-return raw pin and same-file A/B input", async () => {
  const a = await completeIntegrated(sessionBinding("A"));
  const b = await completeIntegrated(sessionBinding("B"));
  await assert.rejects(
    () => preflightSingleBindingIntegratedCompleteReturnBytes(
      encoded(a.artifacts.completeReturnText),
      {
        expectedSessionBinding: a.binding,
        expectedCompleteReturnRawSha256: "e".repeat(64)
      }
    ),
    expectHandoffCode("COMPLETE_RETURN_RAW_SHA256_MISMATCH")
  );
  await assert.rejects(
    () => compareSingleBindingIntegratedCompleteReturns({
      seatABytes: encoded(a.artifacts.completeReturnText),
      seatBBytes: encoded(a.artifacts.completeReturnText),
      expected: pairExpected(a, b)
    }),
    expectHandoffCode("PAIR_COMPLETE_RETURN_BYTES_NOT_DISTINCT")
  );
});

test("rejects tampering even when the caller supplies the tampered outer raw SHA", async () => {
  const completed = await completeIntegrated(sessionBinding("A"));
  const tampered = structuredClone(completed.artifacts.completeReturnRecord);
  const original = tampered.embeddedArtifacts[0].exactUtf8Text;
  tampered.embeddedArtifacts[0].exactUtf8Text = original.replace(
    "只凭合成边界不能建立阈值有效性-A",
    "被改写的专业意见-A"
  );
  assert.notEqual(tampered.embeddedArtifacts[0].exactUtf8Text, original);
  const resigned = await resignComplete(tampered);
  await assert.rejects(
    () => preflightSingleBindingIntegratedCompleteReturnBytes(resigned.bytes, {
      expectedSessionBinding: completed.binding,
      expectedCompleteReturnRawSha256: resigned.rawSha256
    }),
    expectHandoffCode("EMBEDDED_ARTIFACT_RAW_BYTES_MISMATCH")
  );
});

test("strict bytes preflight rejects invalid UTF-8, BOM and duplicate keys with matching external raw pins", async () => {
  const completed = await completeIntegrated(sessionBinding("A"));
  const invalidUtf8Bytes = new Uint8Array([0x7b, 0xff, 0x7d]);
  const invalidUtf8Raw = await sha256SingleBindingIntegratedBytes(invalidUtf8Bytes);
  await assert.rejects(
    () => preflightSingleBindingIntegratedCompleteReturnBytes(invalidUtf8Bytes, {
      expectedSessionBinding: completed.binding,
      expectedCompleteReturnRawSha256: invalidUtf8Raw
    }),
    /严格 UTF-8/u
  );

  const bomBytes = encoded(`\ufeff${completed.artifacts.completeReturnText}`);
  const bomRaw = await sha256SingleBindingIntegratedBytes(bomBytes);
  await assert.rejects(
    () => preflightSingleBindingIntegratedCompleteReturnBytes(bomBytes, {
      expectedSessionBinding: completed.binding,
      expectedCompleteReturnRawSha256: bomRaw
    }),
    /BOM/u
  );

  const duplicateText = completed.artifacts.completeReturnText.replace(
    '{\n  "schemaVersion": "1.0.0",',
    '{\n  "schemaVersion": "1.0.0",\n  "schemaVersion": "1.0.0",'
  );
  const duplicateBytes = encoded(duplicateText);
  const duplicateRaw = await sha256SingleBindingIntegratedBytes(duplicateBytes);
  await assert.rejects(
    () => preflightSingleBindingIntegratedCompleteReturnBytes(duplicateBytes, {
      expectedSessionBinding: completed.binding,
      expectedCompleteReturnRawSha256: duplicateRaw
    }),
    /重复键/u
  );
});

test("strict bytes preflight requires an exact native Uint8Array", async () => {
  const completed = await completeIntegrated(sessionBinding("A"));
  const exactBytes = encoded(completed.artifacts.completeReturnText);
  const options = {
    expectedSessionBinding: completed.binding,
    expectedCompleteReturnRawSha256: completed.artifacts.completeReturnRawSha256
  };
  await assert.rejects(
    () => preflightSingleBindingIntegratedCompleteReturnBytes(Buffer.from(exactBytes), options),
    expectHandoffCode("COMPLETE_RETURN_BYTES_INVALID")
  );
  await assert.rejects(
    () => preflightSingleBindingIntegratedCompleteReturnBytes(new Uint16Array([1, 2]), options),
    expectHandoffCode("COMPLETE_RETURN_BYTES_INVALID")
  );
  class Uint8Subclass extends Uint8Array {}
  await assert.rejects(
    () => preflightSingleBindingIntegratedCompleteReturnBytes(new Uint8Subclass(exactBytes), options),
    expectHandoffCode("COMPLETE_RETURN_BYTES_INVALID")
  );
});

test("rejects an old unbound rehearsal submission even inside a re-digested new wrapper", async () => {
  const completed = await completeIntegrated(sessionBinding("A"));
  const oldDraft = createSingleBindingRehearsalDraft("A");
  fillInner(oldDraft, { suffix: "old" });
  const oldReadback = await prepareSingleBindingRehearsalReadback(oldDraft);
  confirmInner(oldDraft);
  const oldSubmission = await finalizeSingleBindingRehearsal(oldDraft, oldReadback);

  const wrapper = structuredClone(completed.artifacts.completeReturnRecord);
  const oldText = serializeSingleBindingIntegratedUtf8Json(oldSubmission);
  wrapper.embeddedArtifacts[0].exactUtf8Text = oldText;
  wrapper.embeddedArtifacts[0].rawSha256 = await sha256SingleBindingIntegratedText(oldText);
  wrapper.embeddedArtifacts[0].byteLength = encoded(oldText).byteLength;
  const resigned = await resignComplete(wrapper);
  await assert.rejects(
    () => preflightSingleBindingIntegratedCompleteReturnBytes(resigned.bytes, {
      expectedSessionBinding: completed.binding,
      expectedCompleteReturnRawSha256: resigned.rawSha256
    }),
    (error) => error?.code === "INPUT_SHAPE_INVALID"
  );
});

test("rejects winner fields in complete wrappers and pair call inputs", async () => {
  const a = await completeIntegrated(sessionBinding("A"));
  const b = await completeIntegrated(sessionBinding("B"));
  const winnerWrapper = structuredClone(a.artifacts.completeReturnRecord);
  winnerWrapper.winnerSeatId = "A";
  const resigned = await resignComplete(winnerWrapper);
  await assert.rejects(
    () => preflightSingleBindingIntegratedCompleteReturnBytes(resigned.bytes, {
      expectedSessionBinding: a.binding,
      expectedCompleteReturnRawSha256: resigned.rawSha256
    }),
    expectHandoffCode("COMPLETE_RETURN_SHAPE_INVALID")
  );

  await assert.rejects(
    () => compareSingleBindingIntegratedCompleteReturns({
      seatABytes: encoded(a.artifacts.completeReturnText),
      seatBBytes: encoded(b.artifacts.completeReturnText),
      expected: pairExpected(a, b),
      winnerSeatId: "A"
    }),
    expectHandoffCode("PAIR_INPUT_INVALID")
  );
});
