import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import {
  SINGLE_BINDING_REHEARSAL_BOUNDARY,
  SINGLE_BINDING_REHEARSAL_RECORD_TYPES,
  SINGLE_BINDING_REHEARSAL_RELEASE_GOVERNANCE,
  SYNTHETIC_REHEARSAL_FIXTURE_REF,
  SYNTHETIC_SINGLE_BINDING_FIXTURE,
  SingleBindingRehearsalError,
  collectSyntheticRehearsalSensitiveTextErrors,
  computeSyntheticRehearsalIdentityDigests,
  createSingleBindingRehearsalDraft,
  finalizeSingleBindingRehearsal,
  isSingleBindingRehearsalReadbackCandidate,
  isSingleBindingRehearsalSubmissionCandidate,
  preflightSingleBindingRehearsalSubmissionValue,
  prepareSingleBindingRehearsalReadback
} from "../single-binding-rehearsal-contract.js";
import {
  createSingleBindingRehearsalServer,
  loadSingleBindingRehearsalPayloadsFromSourceCandidate,
  singleBindingRehearsalPayloadPaths
} from "../single-binding-rehearsal-server.mjs";

const SOURCE_ROOT = join(import.meta.dirname, "..");

function validDraft(seatId = "A", { coordinator = false, cannotDecide = false } = {}) {
  const draft = createSingleBindingRehearsalDraft(seatId);
  draft.startAcknowledgement.syntheticOnly = true;
  draft.reviewResponse.position = cannotDecide ? "cannot_decide" : "conditional";
  draft.reviewResponse.cannotDecideReason = cannotDecide ? "materials_insufficient" : null;
  draft.reviewResponse.rationale = "本页只给出临界例子，尚不足以建立阈值有效性。";
  draft.reviewResponse.applicabilityConditions = "需先固定流派口径并补足可靠案例集。";
  draft.reviewResponse.counterexamplesOrNeededEvidence = "需要覆盖临界值两侧的合成反例与独立来源依据。";
  draft.reviewResponse.highRiskDisposition = "defer";
  draft.reviewResponse.revisionSuggestion = "把候选分界和材料缺口同时展示。";
  draft.captureContext.entryMethod = coordinator
    ? "coordinator_verbatim_transcription"
    : "expert_self_entered";
  draft.captureContext.coordinatorVerbatimNoSummarySelfDeclared = coordinator;
  draft.captureContext.assistanceCategories = coordinator
    ? ["books_or_source_materials", "ai_or_software_tool"]
    : ["none_declared"];
  return draft;
}

function confirmFinal(draft) {
  for (const key of Object.keys(draft.finalConfirmations)) draft.finalConfirmations[key] = true;
  return draft;
}

function expectCode(code) {
  return (error) => error instanceof SingleBindingRehearsalError && error.code === code;
}

test("freezes one synthetic thresholds binding and keeps every authority/count ledger red", () => {
  assert.equal(SYNTHETIC_SINGLE_BINDING_FIXTURE.bindingId, "binding:policy:thresholds");
  assert.equal(SYNTHETIC_SINGLE_BINDING_FIXTURE.availableMaterials.length, 4);
  assert.equal(SYNTHETIC_SINGLE_BINDING_FIXTURE.missingMaterials.length, 5);
  assert.deepEqual(
    SYNTHETIC_SINGLE_BINDING_FIXTURE.boundaryExamples.map((entry) => entry.supportPercent),
    [42, 43, 57, 58]
  );
  assert.deepEqual(SINGLE_BINDING_REHEARSAL_RELEASE_GOVERNANCE, {
    releaseIdentity: "legacy-v13",
    targetSchema: 13,
    migrationId: null,
    schema13MutationEpochUsed: false,
    reviewCycleEpochIsSchema13MutationEpoch: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  });
  assert.equal(SINGLE_BINDING_REHEARSAL_BOUNDARY.syntheticOnly, true);
  assert.equal(SINGLE_BINDING_REHEARSAL_BOUNDARY.syntheticFixtureOnly, true);
  assert.equal(SINGLE_BINDING_REHEARSAL_BOUNDARY.freeTextSyntheticOnlyVerified, false);
  assert.equal(SINGLE_BINDING_REHEARSAL_BOUNDARY.userFreeTextContentClass, "unassessed_private");
  assert.equal(
    SINGLE_BINDING_REHEARSAL_BOUNDARY.handlingClassification,
    "private_in_memory_synthetic_fixture_with_unassessed_free_text"
  );
  assert.equal(SINGLE_BINDING_REHEARSAL_BOUNDARY.selectedBindingCount, 1);
  assert.equal(SINGLE_BINDING_REHEARSAL_BOUNDARY.formalPurposeReused, false);
  assert.equal(SINGLE_BINDING_REHEARSAL_BOUNDARY.realPersonDataCollectionAuthorized, false);
  assert.equal(SINGLE_BINDING_REHEARSAL_BOUNDARY.personDataPresenceAssessed, false);
  assert.equal(SINGLE_BINDING_REHEARSAL_BOUNDARY.personDerivedDigestExcluded, false);
  assert.equal(SINGLE_BINDING_REHEARSAL_BOUNDARY.formalAdmissionAllowed, false);
  assert.equal(SINGLE_BINDING_REHEARSAL_BOUNDARY.formalTwoOfTwoCountDelta, 0);
  assert.equal(SINGLE_BINDING_REHEARSAL_BOUNDARY.expertGateCountDelta, 0);
  assert.equal(SINGLE_BINDING_REHEARSAL_BOUNDARY.verifiedExpertCount, 0);
  assert.equal(SINGLE_BINDING_REHEARSAL_BOUNDARY.requiredExpertCount, 2);
  assert.equal(SINGLE_BINDING_REHEARSAL_BOUNDARY.frozenBindingCount, 0);
  assert.equal(SINGLE_BINDING_REHEARSAL_BOUNDARY.requiredBindingCount, 12);
  assert.equal(SINGLE_BINDING_REHEARSAL_BOUNDARY.expertVsAiAccuracyEvaluated, false);
  assert.equal(SINGLE_BINDING_REHEARSAL_BOUNDARY.predictiveAccuracyEvaluated, false);
  assert.equal(SINGLE_BINDING_REHEARSAL_BOUNDARY.seatCrossOpinionVisibilityProvided, false);
  assert.equal(SINGLE_BINDING_REHEARSAL_BOUNDARY.winnerSelectionAllowed, false);
});

test("pins a non-formal synthetic manifest identity to the exact fixture and question set", async () => {
  assert.deepEqual(SYNTHETIC_REHEARSAL_FIXTURE_REF, {
    identityClass: "synthetic_rehearsal_manifest_identity_only",
    syntheticRehearsalManifestId:
      "bazi-single-binding-synthetic-rehearsal-manifest/d97377310d2877cb980ca5e9137ad281e4e102c984be269436a595e3485c1109",
    syntheticRehearsalManifestDigest: "d97377310d2877cb980ca5e9137ad281e4e102c984be269436a595e3485c1109",
    fixtureId: "bazi-single-binding-nocode-rehearsal/thresholds-synthetic-v1",
    fixtureContentDigest: "2c735950ac976a942de7f38f93fec517f077e1739cf87f7ad57b412998d36d21",
    questionSetId: "bazi-single-binding-synthetic-rehearsal-question-set/1.0.0",
    questionSetDigest: "fe9bcb2dfc2d32f20eae1411cbd47d4ac55e500c6e53049508c502a9252a5b31",
    bindingId: "binding:policy:thresholds",
    evidenceSubjectId: "bazi.strength.binding.policy.thresholds.v1",
    candidateId: "synthetic-rehearsal:hakimi-strength-thresholds-engineering-candidate-v1",
    candidateDigest: "b4f0d3564a6ad8b1d2174061ddf42b855b6929fb9d9f54f5512366e3d82ff373",
    candidateStatusCode: "pre_freeze_candidate",
    formalBindingDigest: null,
    formalReviewInputManifestAuthorityEstablished: false,
    currentWorkspaceCandidateIdentityVerified: false
  });
  assert.deepEqual(
    await computeSyntheticRehearsalIdentityDigests(),
    {
      questionSetDigest: SYNTHETIC_REHEARSAL_FIXTURE_REF.questionSetDigest,
      candidateDigest: SYNTHETIC_REHEARSAL_FIXTURE_REF.candidateDigest,
      fixtureContentDigest: SYNTHETIC_REHEARSAL_FIXTURE_REF.fixtureContentDigest,
      syntheticRehearsalManifestDigest: SYNTHETIC_REHEARSAL_FIXTURE_REF.syntheticRehearsalManifestDigest,
      syntheticRehearsalManifestId: SYNTHETIC_REHEARSAL_FIXTURE_REF.syntheticRehearsalManifestId
    }
  );
});

test("question or material drift changes the synthetic identity and the readback carries the full fixture", async () => {
  const changedQuestion = structuredClone(SYNTHETIC_SINGLE_BINDING_FIXTURE);
  changedQuestion.question += " 漂移";
  const questionDigests = await computeSyntheticRehearsalIdentityDigests(changedQuestion);
  assert.notEqual(questionDigests.questionSetDigest, SYNTHETIC_REHEARSAL_FIXTURE_REF.questionSetDigest);
  assert.notEqual(questionDigests.fixtureContentDigest, SYNTHETIC_REHEARSAL_FIXTURE_REF.fixtureContentDigest);
  assert.notEqual(
    questionDigests.syntheticRehearsalManifestDigest,
    SYNTHETIC_REHEARSAL_FIXTURE_REF.syntheticRehearsalManifestDigest
  );

  const changedExample = structuredClone(SYNTHETIC_SINGLE_BINDING_FIXTURE);
  changedExample.boundaryExamples[0].candidateBand = "漂移";
  const exampleDigests = await computeSyntheticRehearsalIdentityDigests(changedExample);
  assert.equal(exampleDigests.questionSetDigest, SYNTHETIC_REHEARSAL_FIXTURE_REF.questionSetDigest);
  assert.notEqual(exampleDigests.fixtureContentDigest, SYNTHETIC_REHEARSAL_FIXTURE_REF.fixtureContentDigest);
  assert.notEqual(
    exampleDigests.syntheticRehearsalManifestDigest,
    SYNTHETIC_REHEARSAL_FIXTURE_REF.syntheticRehearsalManifestDigest
  );

  const readback = await prepareSingleBindingRehearsalReadback(validDraft());
  assert.deepEqual(readback.reviewSnapshot.syntheticFixtureSnapshot, SYNTHETIC_SINGLE_BINDING_FIXTURE);
  assert.equal(readback.reviewSnapshot.fixtureRef.formalBindingDigest, null);
  assert.equal(readback.reviewSnapshot.fixtureRef.candidateStatusCode, "pre_freeze_candidate");
});

test("creates isolated A/B drafts with no other-seat opinion or formal-purpose field", () => {
  const a = createSingleBindingRehearsalDraft("A");
  const b = createSingleBindingRehearsalDraft("B");
  assert.equal(a.seatId, "A");
  assert.equal(b.seatId, "B");
  assert.equal(a.reviewPurpose, "synthetic_single_binding_question_surface_rehearsal_only");
  assert.equal(JSON.stringify(a).includes("binding_freeze_evidence"), false);
  assert.equal(JSON.stringify(b).includes("post_freeze_reaffirmation"), false);
  assert.equal(Object.hasOwn(a, "otherSeatOpinion"), false);
  assert.throws(() => createSingleBindingRehearsalDraft("domain-expert-a"), expectCode("SEAT_INVALID"));
});

test("requires a structured reason when the reviewer cannot decide", async () => {
  const draft = validDraft("A", { cannotDecide: true });
  draft.reviewResponse.cannotDecideReason = null;
  await assert.rejects(
    () => prepareSingleBindingRehearsalReadback(draft),
    (error) => error instanceof SingleBindingRehearsalError
      && error.code === "READBACK_PREFLIGHT_FAILED"
      && error.errors.some((entry) => entry.code === "cannot_reason_required")
  );
  draft.reviewResponse.cannotDecideReason = "source_or_version_unclear";
  const readback = await prepareSingleBindingRehearsalReadback(draft);
  assert.equal(readback.reviewSnapshot.reviewResponse.cannotDecideReason, "source_or_version_unclear");
});

test("forbids a cannot-decide reason when a substantive position was selected", async () => {
  const draft = validDraft();
  draft.reviewResponse.cannotDecideReason = "materials_insufficient";
  await assert.rejects(
    () => prepareSingleBindingRehearsalReadback(draft),
    (error) => error instanceof SingleBindingRehearsalError
      && error.errors.some((entry) => entry.code === "cannot_reason_not_applicable")
  );
});

test("self-entry completes a branded readback and authority-none submission", async () => {
  const draft = validDraft("A");
  const readback = await prepareSingleBindingRehearsalReadback(draft);
  assert.equal(isSingleBindingRehearsalReadbackCandidate(readback), true);
  assert.equal(readback.reviewerReadbackVerified, false);
  assert.equal(readback.formalAdmissionAllowed, false);
  confirmFinal(draft);
  const submission = await finalizeSingleBindingRehearsal(draft, readback);
  assert.equal(isSingleBindingRehearsalSubmissionCandidate(submission), true);
  assert.equal(submission.boundary.formalAdmissionAllowed, false);
  assert.equal(submission.boundary.verifiedExpertCount, 0);
  assert.equal(submission.boundary.frozenBindingCount, 0);
  assert.equal(submission.boundary.expertVsAiAccuracyEvaluated, false);
  assert.equal(submission.mutationBoundary.schema13MutationEpochUsed, false);
  assert.equal(Object.isFrozen(submission), true);
  assert.equal(Object.isFrozen(submission.reviewSnapshot.reviewResponse), true);
});

test("coordinator transcription requires no-summary declaration and preserves AI disclosure as self-report only", async () => {
  const draft = validDraft("B", { coordinator: true });
  draft.captureContext.coordinatorVerbatimNoSummarySelfDeclared = false;
  await assert.rejects(
    () => prepareSingleBindingRehearsalReadback(draft),
    (error) => error instanceof SingleBindingRehearsalError
      && error.errors.some((entry) => entry.code === "verbatim_ack_required")
  );
  draft.captureContext.coordinatorVerbatimNoSummarySelfDeclared = true;
  const readback = await prepareSingleBindingRehearsalReadback(draft);
  assert.deepEqual(readback.reviewSnapshot.captureContext.assistanceCategories, [
    "books_or_source_materials",
    "ai_or_software_tool"
  ]);
  assert.equal(readback.boundary.assistanceDisclosureIsSelfDeclarationOnly, true);
  assert.equal(readback.boundary.externalAssistanceExcluded, false);
  assert.equal(readback.boundary.coordinatorVerbatimEntryVerified, false);
});

test("requires assistance disclosure and keeps none/unknown mutually exclusive", async () => {
  const draft = validDraft();
  draft.captureContext.assistanceCategories = [];
  await assert.rejects(
    () => prepareSingleBindingRehearsalReadback(draft),
    (error) => error instanceof SingleBindingRehearsalError
      && error.errors.some((entry) => entry.code === "assistance_required")
  );
  draft.captureContext.assistanceCategories = ["none_declared", "ai_or_software_tool"];
  await assert.rejects(
    () => prepareSingleBindingRehearsalReadback(draft),
    (error) => error instanceof SingleBindingRehearsalError
      && error.errors.some((entry) => entry.code === "assistance_exclusive")
  );
  draft.captureContext.assistanceCategories = ["ai_or_software_tool", "books_or_source_materials"];
  await assert.rejects(
    () => prepareSingleBindingRehearsalReadback(draft),
    (error) => error instanceof SingleBindingRehearsalError
      && error.errors.some((entry) => entry.code === "assistance_order")
  );
});

test("requires all four final confirmations including exact readback and accuracy-study exclusion", async () => {
  const draft = validDraft();
  const readback = await prepareSingleBindingRehearsalReadback(draft);
  draft.finalConfirmations.fullTextReadBackAndAccurate = true;
  draft.finalConfirmations.noCrossSeatOpinionAccess = true;
  draft.finalConfirmations.privateSyntheticHandling = true;
  await assert.rejects(
    () => finalizeSingleBindingRehearsal(draft, readback),
    (error) => error instanceof SingleBindingRehearsalError
      && error.code === "FINAL_PREFLIGHT_FAILED"
      && error.errors.some((entry) => entry.path === "finalConfirmations.accuracyStudyExcluded")
  );
});

test("rejects stale readback after any substantive text changes", async () => {
  const draft = validDraft();
  const readback = await prepareSingleBindingRehearsalReadback(draft);
  confirmFinal(draft);
  draft.reviewResponse.rationale += " 新增一句。";
  await assert.rejects(() => finalizeSingleBindingRehearsal(draft, readback), expectCode("READBACK_STALE"));
});

test("process-local brands reject serialized clones", async () => {
  const draft = validDraft();
  const readback = await prepareSingleBindingRehearsalReadback(draft);
  const readbackClone = structuredClone(readback);
  assert.equal(isSingleBindingRehearsalReadbackCandidate(readbackClone), false);
  confirmFinal(draft);
  await assert.rejects(() => finalizeSingleBindingRehearsal(draft, readbackClone), expectCode("READBACK_BRAND_REQUIRED"));
  const submission = await finalizeSingleBindingRehearsal(draft, readback);
  assert.equal(isSingleBindingRehearsalSubmissionCandidate(structuredClone(submission)), false);
});

test("binds each readback to the exact draft capability and consumes it once", async () => {
  const first = validDraft("A");
  const second = validDraft("A");
  const readback = await prepareSingleBindingRehearsalReadback(first);
  for (const key of Object.keys(first.finalConfirmations)) {
    first.finalConfirmations[key] = true;
    second.finalConfirmations[key] = true;
  }
  await assert.rejects(
    () => finalizeSingleBindingRehearsal(second, readback),
    expectCode("READBACK_DRAFT_MISMATCH")
  );
  const submission = await finalizeSingleBindingRehearsal(first, readback);
  assert.equal(isSingleBindingRehearsalSubmissionCandidate(submission), true);
  await assert.rejects(
    () => finalizeSingleBindingRehearsal(first, readback),
    expectCode("READBACK_ALREADY_CONSUMED")
  );
  await assert.rejects(
    () => prepareSingleBindingRehearsalReadback(first),
    expectCode("DRAFT_ALREADY_FINALIZED")
  );
});

test("a newer readback invalidates an older capability for the same draft", async () => {
  const draft = validDraft("B");
  const older = await prepareSingleBindingRehearsalReadback(draft);
  const newer = await prepareSingleBindingRehearsalReadback(draft);
  for (const key of Object.keys(draft.finalConfirmations)) draft.finalConfirmations[key] = true;
  await assert.rejects(
    () => finalizeSingleBindingRehearsal(draft, older),
    expectCode("READBACK_DRAFT_MISMATCH")
  );
  const submission = await finalizeSingleBindingRehearsal(draft, newer);
  assert.equal(isSingleBindingRehearsalSubmissionCandidate(submission), true);
});

test("forbids final confirmations set before readback issuance", async () => {
  const draft = validDraft("A");
  confirmFinal(draft);
  await assert.rejects(
    () => prepareSingleBindingRehearsalReadback(draft),
    (error) => error instanceof SingleBindingRehearsalError
      && error.code === "READBACK_PREFLIGHT_FAILED"
      && error.errors.every((entry) => entry.code === "confirmation_before_readback_forbidden")
      && error.errors.length === 4
  );
});

test("serializes concurrent finalize attempts and consumes one readback exactly once", async () => {
  const draft = validDraft("B");
  const readback = await prepareSingleBindingRehearsalReadback(draft);
  confirmFinal(draft);
  const outcomes = await Promise.allSettled([
    finalizeSingleBindingRehearsal(draft, readback),
    finalizeSingleBindingRehearsal(draft, readback)
  ]);
  assert.equal(outcomes.filter((entry) => entry.status === "fulfilled").length, 1);
  const [rejected] = outcomes.filter((entry) => entry.status === "rejected");
  assert.equal(rejected.reason instanceof SingleBindingRehearsalError, true);
  assert.equal(rejected.reason.code, "READBACK_ALREADY_CONSUMED");
});

test("revalidates a serialized submission without restoring its process-local brand", async () => {
  const draft = validDraft("A", { coordinator: true });
  const readback = await prepareSingleBindingRehearsalReadback(draft);
  for (const key of Object.keys(draft.finalConfirmations)) draft.finalConfirmations[key] = true;
  const submission = await finalizeSingleBindingRehearsal(draft, readback);
  const imported = await preflightSingleBindingRehearsalSubmissionValue(
    structuredClone(submission),
    { expectedSeatId: "A" }
  );
  assert.equal(imported.submissionDigest, submission.submissionDigest);
  assert.equal(isSingleBindingRehearsalSubmissionCandidate(imported), false);

  const drift = structuredClone(submission);
  drift.reviewSnapshot.reviewResponse.rationale = "篡改后的理由";
  await assert.rejects(
    () => preflightSingleBindingRehearsalSubmissionValue(drift, { expectedSeatId: "A" }),
    expectCode("SUBMISSION_DIGEST_INVALID")
  );
  await assert.rejects(
    () => preflightSingleBindingRehearsalSubmissionValue(structuredClone(submission), { expectedSeatId: "B" }),
    expectCode("SUBMISSION_SEAT_OR_PURPOSE_INVALID")
  );
});

test("blocks obvious identity, contact, birth and real-case text before readback", async () => {
  const variants = [
    "联系电话：13800138000",
    "姓名：测试专家",
    "出生地：测试城市",
    "我的客户真实案例发生了某事件"
  ];
  for (const value of variants) {
    const draft = validDraft();
    draft.reviewResponse.rationale = value;
    assert.ok(collectSyntheticRehearsalSensitiveTextErrors(draft).length > 0);
    await assert.rejects(
      () => prepareSingleBindingRehearsalReadback(draft),
      (error) => error instanceof SingleBindingRehearsalError
        && error.errors.some((entry) => entry.path === "reviewResponse.rationale")
    );
  }
});

test("rejects Chinese-numeral personal details and expert/AI accuracy claims as one regression", async () => {
  const draft = validDraft();
  draft.reviewResponse.rationale =
    "张三，一九八八年六月七日，北京朝阳；对照十个样本，专家命中九个，AI 命中三个，专家准确率 90%。";
  const errors = collectSyntheticRehearsalSensitiveTextErrors(draft);
  assert.ok(errors.some((entry) => entry.code === "birth_detail"));
  assert.ok(errors.some((entry) => entry.code === "accuracy_study_detail"));
  await assert.rejects(
    () => prepareSingleBindingRehearsalReadback(draft),
    (error) => error instanceof SingleBindingRehearsalError
      && error.code === "READBACK_PREFLIGHT_FAILED"
      && error.errors.some((entry) => entry.code === "accuracy_study_detail")
  );
});

test("allows evidence-needs language and ordinary accurate-wording advice", async () => {
  const draft = validDraft();
  draft.reviewResponse.rationale = "术语需要准确表达，但本页材料仍不足。";
  draft.reviewResponse.counterexamplesOrNeededEvidence = "需要可靠且带结果标签的案例集。";
  draft.reviewResponse.revisionSuggestion = "请准确说明这只是候选分界。";
  assert.equal(
    collectSyntheticRehearsalSensitiveTextErrors(draft).some((entry) => entry.code === "accuracy_study_detail"),
    false
  );
  const readback = await prepareSingleBindingRehearsalReadback(draft);
  assert.equal(isSingleBindingRehearsalReadbackCandidate(readback), true);
});

test("rejects unknown fields, accessors and fixed-boundary drift", async () => {
  const unknown = validDraft();
  unknown.formalAdmissionAllowed = true;
  await assert.rejects(() => prepareSingleBindingRehearsalReadback(unknown), expectCode("INPUT_SHAPE_INVALID"));

  const accessor = validDraft();
  Object.defineProperty(accessor.reviewResponse, "rationale", { enumerable: true, get() { return "伪造"; } });
  await assert.rejects(() => prepareSingleBindingRehearsalReadback(accessor), expectCode("INPUT_ACCESSOR_FORBIDDEN"));

  const drift = validDraft();
  drift.boundary.formalAdmissionAllowed = true;
  await assert.rejects(() => prepareSingleBindingRehearsalReadback(drift), expectCode("FIXED_BOUNDARY_MISMATCH"));
});

test("uses three rehearsal-only record types that do not reuse formal evidence types", () => {
  assert.deepEqual(SINGLE_BINDING_REHEARSAL_RECORD_TYPES, [
    "bazi_expert_single_binding_nocode_rehearsal_draft_v1",
    "bazi_expert_single_binding_nocode_rehearsal_readback_candidate_v1",
    "bazi_expert_single_binding_nocode_rehearsal_submission_candidate_v1"
  ]);
  for (const recordType of SINGLE_BINDING_REHEARSAL_RECORD_TYPES) {
    assert.doesNotMatch(recordType, /private_envelope_v3|opaque_binding_v3|formal_correction_candidate_v3/u);
  }
});

test("static expert surface contains no file, persistence, upload, cross-seat or accuracy scoring interface", async () => {
  const sourceFiles = await Promise.all([
    readFile(join(SOURCE_ROOT, "single-binding-rehearsal-a.html"), "utf8"),
    readFile(join(SOURCE_ROOT, "single-binding-rehearsal-b.html"), "utf8"),
    readFile(join(SOURCE_ROOT, "single-binding-rehearsal.js"), "utf8")
  ]);
  const combined = sourceFiles.join("\n");
  assert.doesNotMatch(combined, /type=["']file|contenteditable|localStorage|sessionStorage|indexedDB|serviceWorker|XMLHttpRequest|WebSocket|navigator\.clipboard|\bfetch\s*\(/iu);
  assert.doesNotMatch(combined, /选择赢家|采用 A 席|采用 B 席|准确度分数按钮/u);
  assert.match(combined, /不比较专家和 AI 谁更准/u);
  assert.match(combined, /协调人只能逐字代录/u);
  assert.match(combined, /这些文字准确表达我的意见/u);
});

test("loopback server exposes only the selected seat and exact static allowlist", async (t) => {
  const payloads = await loadSingleBindingRehearsalPayloadsFromSourceCandidate("A");
  assert.deepEqual([...payloads.keys()].sort(), [...singleBindingRehearsalPayloadPaths("A")]);
  const server = createSingleBindingRehearsalServer({ seatId: "A", payloads });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;

  const root = await fetch(`${origin}/`);
  assert.equal(root.status, 200);
  assert.match(root.headers.get("content-security-policy"), /connect-src 'none'/u);
  assert.match(await root.text(), /独立席位 A/u);

  const head = await fetch(`${origin}/single-binding-rehearsal-a.html`, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");

  assert.equal((await fetch(`${origin}/single-binding-rehearsal-b.html`)).status, 404);
  assert.equal((await fetch(`${origin}/pair-compare.html`)).status, 404);
  assert.equal((await fetch(`${origin}/`, { method: "POST" })).status, 405);
  assert.equal((await fetch(`${origin}/../seat-a.html`)).status, 404);
});
