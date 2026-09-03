import assert from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

import {
  PILOT_AUTHORITY_BOUNDARY,
  PILOT_PRIVACY_BOUNDARY,
  RELEASE_GOVERNANCE,
  UNASSIGNED_PACKAGE_MANIFEST_RAW_SHA256,
  UNASSIGNED_REVIEW_CYCLE_ID,
  PilotContractError,
  assertPilotDraftExportable,
  assertPilotDraftStructure,
  buildFinalArtifacts,
  canonicalStringify,
  collectDraftExportErrors,
  collectFinalizeErrors,
  collectPilotSensitiveDataErrors,
  createPilotSessionContext,
  createPilotDraft,
  parseStrictJsonText,
  parsePilotDraft,
  preflightPilotCompleteSubmissionBytes,
  serializeUtf8Json
} from "../contract.js";
import { OVERALL_QUESTIONS } from "../data/questions.js";
import { SCENARIOS, SEAT_ORDERS } from "../data/scenarios.js";

const here = resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourceRoot = here;
const PHYSICAL_SESSION = Object.freeze({
  reviewCycleId: `pilot-review-cycle.${"b".repeat(64)}`,
  packageManifestRawSha256: "c".repeat(64)
});

function resignPilotRecord(record, domain) {
  const { integrity: _integrity, ...unsigned } = record;
  record.integrity.recordDigest = createHash("sha256")
    .update(`${domain}\0${canonicalStringify(unsigned)}`, "utf8")
    .digest("hex");
}

function completeDraft(draft) {
  draft.acknowledgements.pilotOnly = true;
  draft.acknowledgements.syntheticOnly = true;
  draft.acknowledgements.noCrossOpinionAccess = true;
  draft.acknowledgements.privateOffRepositoryHandling = true;
  draft.reviewerSelfDescription.selfDescribedTradition = "子平旺衰，自述范围仅限本次工程场景。";
  draft.reviewerSelfDescription.selfDescribedScope = "可复核权重、阈值、反例和风险边界；不判断权利或发布。";
  for (const response of Object.values(draft.caseResponses)) {
    response.factAssessment = "insufficient_information";
    response.rulePosition = "conditional";
    response.reason = "专家原文：需结合流派边界再判断。\n保留第二行与“引号”。";
    response.applicabilityConditions = "仅在当前 synthetic ledger 与已显示因素内成立。";
    response.counterexamples = "若特殊结构成立，当前基础分档可能失效。";
    response.invalidationStructures = ["无法判断"];
    response.highRiskDisposition = "defer";
    response.revisionSuggestion = "保留工程候选标签，并继续显示反例入口。";
  }
  for (const response of Object.values(draft.overallResponses)) {
    response.position = "conditional";
    response.expertOriginalText = "这是专家逐字原文；工具不得改写。";
    response.rationale = "五个场景只能支持条件化反馈。";
    response.uncertainties = "缺少正式案例集与独立来源闭合。";
  }
  draft.usabilityFeedback.clarityRating = "4";
  draft.usabilityFeedback.difficultTerms = "engineered stress ledger 需要更直白的中文说明。";
  draft.usabilityFeedback.workflowComments = "希望保留逐页进度与打印入口。";
  return draft;
}

test("freezes five no-person synthetic scenarios and mirrored A/B entry order", () => {
  assert.deepEqual(SCENARIOS.map((scenario) => scenario.id), ["P01", "P02", "P03", "P04", "P05"]);
  assert.equal(new Set(SEAT_ORDERS.A).size, 5);
  assert.deepEqual([...SEAT_ORDERS.A].sort(), [...SEAT_ORDERS.B].sort());
  assert.notDeepEqual(SEAT_ORDERS.A, SEAT_ORDERS.B);
  assert.deepEqual(SEAT_ORDERS.B, [...SEAT_ORDERS.A].reverse());
  const forbiddenKeys = new Set(["birthDate", "birthTime", "date", "time", "location", "coordinates", "sex", "gender", "events", "event", "notes", "personName"]);
  const inspect = (value) => {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      assert.equal(forbiddenKeys.has(key), false, `forbidden case key: ${key}`);
      inspect(child);
    }
  };
  for (const scenario of SCENARIOS) {
    assert.equal(scenario.synthetic, true);
    assert.equal(scenario.noPerson, true);
    assert.equal(scenario.isCurrentFormalOutput, false);
    assert.doesNotMatch(JSON.stringify(scenario), /\b\d{4}-\d{2}-\d{2}\b|\b\d{2}:\d{2}\b|@/u);
    inspect(scenario);
  }
  assert.equal(SCENARIOS.find((scenario) => scenario.id === "P03").scenarioKind, "deduplicate_month_main_sensitivity");
  assert.equal(SCENARIOS.find((scenario) => scenario.id === "P04").includeHour, false);
  assert.equal(SCENARIOS.find((scenario) => scenario.id === "P05").scenarioKind, "engineered_threshold_stress_ledger");
});

test("each visible factor ledger reconciles exactly to its declared totals", () => {
  for (const scenario of SCENARIOS) {
    const totals = scenario.factors.reduce((result, factor) => {
      if (factor.active) result[factor.side === "支持" ? "support" : "demand"] += factor.appliedWeight;
      return result;
    }, { support: 0, demand: 0 });
    assert.deepEqual(totals, { support: scenario.totals.support, demand: scenario.totals.demand }, scenario.id);
    const ratio = Number((100 * totals.support / (totals.support + totals.demand)).toFixed(2));
    assert.equal(ratio, scenario.totals.ratioPercent, `${scenario.id} ratio`);
  }
});

test("keeps every authority and release projection fail-closed", () => {
  assert.deepEqual(RELEASE_GOVERNANCE, {
    releaseIdentity: "legacy-v13",
    targetSchema: 13,
    migrationId: null,
    schema13MutationEpochUsed: false,
    productStorageMutationPerformed: false
  });
  for (const [key, value] of Object.entries(PILOT_AUTHORITY_BOUNDARY)) {
    assert.equal(value, key === "templateOnly" || key === "pilotOnly", `${key} must stay fail-closed`);
  }
  assert.deepEqual(PILOT_PRIVACY_BOUNDARY, {
    personDataPresenceAssessed: false,
    personDerivedDigestExcluded: false,
    safeToPublish: false,
    handlingClassification: "private_off_repository_only",
    repositoryStorageAllowed: false,
    toolAutomaticUploadPerformed: false,
    downloadDestinationControlledByBrowserOrOperatingSystem: true,
    alternateDataStreamsEnumerated: false,
    alternateDataStreamsExcluded: false
  });
});

test("creates distinct seat-bound drafts with an identical scenario/question set", async () => {
  const a = await createPilotDraft("A");
  const b = await createPilotDraft("B");
  await assertPilotDraftStructure(a, "A");
  await assertPilotDraftStructure(b, "B");
  assert.equal(a.sessionBinding.scenarioSetDigest, b.sessionBinding.scenarioSetDigest);
  assert.equal(a.sessionBinding.questionSetDigest, b.sessionBinding.questionSetDigest);
  assert.notEqual(a.sessionBinding.entryOrderDigest, b.sessionBinding.entryOrderDigest);
  await assert.rejects(() => assertPilotDraftStructure(a, "B"), PilotContractError);
  assert.equal(Object.keys(a.overallResponses).length, OVERALL_QUESTIONS.length);
  assert.equal(a.sessionBinding.reviewCycleId, UNASSIGNED_REVIEW_CYCLE_ID);
  assert.equal(a.sessionBinding.packageManifestRawSha256, UNASSIGNED_PACKAGE_MANIFEST_RAW_SHA256);
  assert.equal(a.sessionBinding.bindingMode, "development_preview_unassigned");
});

test("requires a nonzero physical package binding and carries it through every final artifact", async () => {
  const context = createPilotSessionContext(PHYSICAL_SESSION);
  const draft = completeDraft(await createPilotDraft("A", context));
  const artifacts = await buildFinalArtifacts(draft, new Date("2030-01-02T03:04:05.000Z"));
  for (const record of [
    artifacts.opinionRecord,
    artifacts.usabilityRecord,
    artifacts.sealReceipt,
    artifacts.completePackageRecord
  ]) {
    assert.equal(record.sessionBinding.reviewCycleId, PHYSICAL_SESSION.reviewCycleId);
    assert.equal(record.sessionBinding.packageManifestRawSha256, PHYSICAL_SESSION.packageManifestRawSha256);
    assert.equal(record.sessionBinding.bindingMode, "physical_seat_package");
  }
  assert.match(artifacts.opinionRecord.recordId, new RegExp(PHYSICAL_SESSION.reviewCycleId, "u"));
  assert.throws(
    () => createPilotSessionContext({
      reviewCycleId: UNASSIGNED_REVIEW_CYCLE_ID,
      packageManifestRawSha256: "d".repeat(64)
    }),
    PilotContractError
  );
});

test("reports required fields before finalize and accepts a complete draft", async () => {
  const draft = await createPilotDraft("A");
  const emptyErrors = await collectFinalizeErrors(draft);
  assert.ok(emptyErrors.length > 20);
  completeDraft(draft);
  assert.deepEqual(await collectFinalizeErrors(draft), []);
});

test("blocks identity, institution, contact and credential-like text in seat self-description", async () => {
  const draft = completeDraft(await createPilotDraft("A"));
  draft.reviewerSelfDescription.selfDescribedScope = "某机构，手机号 13800138000";
  const errors = await collectFinalizeErrors(draft);
  assert.ok(errors.some((error) => error.path === "reviewerSelfDescription.selfDescribedScope"));
  await assert.rejects(() => buildFinalArtifacts(draft), PilotContractError);
});

test("applies one sensitive-data preflight to every free-text category", async () => {
  const cases = [
    ["reviewerSelfDescription.selfDescribedTradition", (draft) => { draft.reviewerSelfDescription.selfDescribedTradition = "我叫测试甲"; }],
    ["reviewerSelfDescription.selfDescribedScope", (draft) => { draft.reviewerSelfDescription.selfDescribedScope = "单位：测试研究所"; }],
    ["caseResponses.P01.reason", (draft) => { draft.caseResponses.P01.reason = "生于 2000-01-02 的现实资料"; }],
    ["caseResponses.P01.applicabilityConditions", (draft) => { draft.caseResponses.P01.applicabilityConditions = "出生地：示例市"; }],
    ["caseResponses.P01.counterexamples", (draft) => { draft.caseResponses.P01.counterexamples = "电话：13900000000"; }],
    ["caseResponses.P01.revisionSuggestion", (draft) => { draft.caseResponses.P01.revisionSuggestion = "真实案例：某客户曾有现实事件"; }],
    [`overallResponses.${OVERALL_QUESTIONS[0].id}.expertOriginalText`, (draft) => { draft.overallResponses[OVERALL_QUESTIONS[0].id].expertOriginalText = "test@example.com"; }],
    [`overallResponses.${OVERALL_QUESTIONS[0].id}.rationale`, (draft) => { draft.overallResponses[OVERALL_QUESTIONS[0].id].rationale = "身份证 11010519491231002X"; }],
    [`overallResponses.${OVERALL_QUESTIONS[0].id}.uncertainties`, (draft) => { draft.overallResponses[OVERALL_QUESTIONS[0].id].uncertainties = "出生时间 08:30"; }],
    ["usabilityFeedback.difficultTerms", (draft) => { draft.usabilityFeedback.difficultTerms = "地址：示例市示例区"; }],
    ["usabilityFeedback.workflowComments", (draft) => { draft.usabilityFeedback.workflowComments = "坐标 39.1234, 116.1234"; }]
  ];
  for (const [expectedPath, mutate] of cases) {
    const draft = completeDraft(await createPilotDraft("A"));
    mutate(draft);
    const privacyErrors = collectPilotSensitiveDataErrors(draft);
    assert.ok(privacyErrors.some((error) => error.path === expectedPath), expectedPath);
    await assert.rejects(() => buildFinalArtifacts(draft), (error) => (
      error instanceof PilotContractError
      && error.errors.some((entry) => entry.path === expectedPath)
    ));
  }
});

test("blocks common Chinese personal-data phrasing at import, draft export, and sealing", async () => {
  const samples = [
    "微信号：wx_test_123",
    "QQ号：123456789",
    "护照号：E12345678",
    "出生时间为8点30分",
    "我有一位客户叫张三",
    "现居北京市朝阳区建国路88号",
    "微信号为 wx_test_123",
    "微信账号：wx_test_123",
    "QQ账号：123456789",
    "护照号为E12345678",
    "证件号码为ABC-12345",
    "电话号码：010-12345678",
    "单位是北京测试研究院",
    "本人是张三",
    "性别为男",
    "晚上八点半出生"
  ];
  for (const sample of samples) {
    const draft = completeDraft(await createPilotDraft("A"));
    draft.caseResponses.P01.reason = sample;
    assert.ok(collectPilotSensitiveDataErrors(draft).some((error) => error.path === "caseResponses.P01.reason"), sample);
    await assert.rejects(() => parsePilotDraft(serializeUtf8Json(draft), "A"), PilotContractError);
    await assert.rejects(() => assertPilotDraftExportable(draft), PilotContractError);
    await assert.rejects(() => buildFinalArtifacts(draft), PilotContractError);
  }
});

test("does not mistake ordinary school descriptions, numbered advice, or synthetic IDs for personal data", async () => {
  const samples = [
    "我是子平旺衰派，主要复核强弱判断。",
    "我有三点建议：先去重，再复核，最后保守表达。",
    "下面分三点说明当前规则的边界。",
    "编号 12345678 仅为人工构造的工程编号。"
  ];
  for (const sample of samples) {
    const draft = completeDraft(await createPilotDraft("A"));
    draft.caseResponses.P01.reason = sample;
    assert.deepEqual(collectPilotSensitiveDataErrors(draft), [], sample);
  }
});

test("rejects sensitive imported drafts with a field-specific error", async () => {
  const draft = completeDraft(await createPilotDraft("A"));
  draft.caseResponses.P01.reason = "生于 2000-01-02 08:30，出生地：示例市";
  await assert.rejects(
    () => parsePilotDraft(serializeUtf8Json(draft), "A"),
    (error) => error instanceof PilotContractError
      && error.errors.some((entry) => entry.path === "caseResponses.P01.reason")
  );
});

test("draft export requires private off-repository acknowledgement and reruns privacy preflight", async () => {
  const draft = await createPilotDraft("A");
  let errors = await collectDraftExportErrors(draft);
  assert.ok(errors.some((error) => error.path === "acknowledgements.privateOffRepositoryHandling"));
  await assert.rejects(() => assertPilotDraftExportable(draft), PilotContractError);

  draft.acknowledgements.privateOffRepositoryHandling = true;
  assert.equal(await assertPilotDraftExportable(draft), true);
  draft.usabilityFeedback.workflowComments = "联系方式：13900000000";
  errors = await collectDraftExportErrors(draft);
  assert.ok(errors.some((error) => error.path === "usabilityFeedback.workflowComments"));
  await assert.rejects(() => assertPilotDraftExportable(draft), PilotContractError);
});

test("preserves expert text verbatim and seals exact UTF-8 JSON bytes without authority claims", async () => {
  const draft = completeDraft(await createPilotDraft("A"));
  const expertOriginal = draft.caseResponses.P01.reason;
  const artifacts = await buildFinalArtifacts(draft, new Date("2030-01-02T03:04:05.000Z"));
  assert.equal(artifacts.opinionRecord.caseResponses[0].reason, expertOriginal);
  assert.equal(artifacts.opinionRecord.expertTextTransformationApplied, false);
  assert.equal(artifacts.opinionRecord.authorityBoundary.countsTowardFormal2of2, false);
  assert.equal(artifacts.opinionRecord.authorityBoundary.formalAdmissionAllowed, false);
  for (const record of [
    artifacts.opinionRecord,
    artifacts.usabilityRecord,
    artifacts.sealReceipt,
    artifacts.completePackageRecord
  ]) {
    assert.deepEqual(record.privacyBoundary, PILOT_PRIVACY_BOUNDARY);
    assert.equal(record.privacyBoundary.personDataPresenceAssessed, false);
    assert.equal(record.privacyBoundary.personDerivedDigestExcluded, false);
    assert.equal(record.privacyBoundary.safeToPublish, false);
    assert.equal(record.privacyBoundary.handlingClassification, "private_off_repository_only");
  }
  assert.equal(artifacts.opinionText.charCodeAt(0) === 0xfeff, false);
  assert.equal(artifacts.opinionText.endsWith("\n"), true);
  assert.equal(artifacts.opinionText.includes("\r\n"), false);
  const expectedRaw = createHash("sha256").update(Buffer.from(artifacts.opinionText, "utf8")).digest("hex");
  assert.equal(artifacts.rawOpinionSha256, expectedRaw);
  assert.equal(artifacts.sealReceipt.rawOpinionArtifact.sha256, expectedRaw);
  assert.equal(artifacts.sealReceipt.rawOpinionArtifact.byteLength, Buffer.byteLength(artifacts.opinionText, "utf8"));
  assert.equal(artifacts.sealReceipt.integrity.digestIsDigitalSignature, false);
  assert.equal(artifacts.sealReceipt.firstSeenEstablished, false);
  assert.equal(artifacts.sealReceipt.custodyEstablished, false);
  assert.equal(Object.hasOwn(artifacts.sealReceipt, "uploaded"), false);
  assert.equal(artifacts.sealReceipt.toolAutomaticUploadPerformed, false);
  assert.equal(artifacts.usabilityRecord.partOfDomainOpinion, false);
  assert.equal(artifacts.completePackageRecord.logicalArtifactsRemainSeparate, true);
  assert.equal(artifacts.completePackageRecord.usabilityIsPartOfDomainOpinion, false);
  assert.equal(artifacts.completePackageRecord.distributionAuthorized, false);
  assert.equal(Object.hasOwn(artifacts.completePackageRecord, "uploaded"), false);
  assert.equal(artifacts.completePackageRecord.toolAutomaticUploadPerformed, false);
  assert.deepEqual(
    artifacts.completePackageRecord.embeddedFiles.map((entry) => entry.role),
    [
      "domain_opinion_original",
      "usability_feedback_separate_from_domain_opinion",
      "file_seal_receipt",
      "opinion_checksum_text"
    ]
  );
  assert.equal(artifacts.completePackageRecord.embeddedFiles[0].exactUtf8Text, artifacts.opinionText);
  assert.deepEqual(JSON.parse(artifacts.completePackageText), artifacts.completePackageRecord);
  assert.equal(
    artifacts.completePackageRawSha256,
    createHash("sha256").update(Buffer.from(artifacts.completePackageText, "utf8")).digest("hex")
  );
});

test("deep-freezes the finalized artifact graph and keeps the print source equal to serialized JSON", async () => {
  const draft = completeDraft(await createPilotDraft("A"));
  const artifacts = await buildFinalArtifacts(draft, new Date("2030-01-02T03:04:05.000Z"));
  const seen = new WeakSet();
  const assertDeepFrozen = (value) => {
    if (value === null || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    assert.equal(Object.isFrozen(value), true);
    for (const child of Object.values(value)) assertDeepFrozen(child);
  };
  assertDeepFrozen(artifacts);
  assert.deepEqual(JSON.parse(artifacts.opinionText), artifacts.opinionRecord);
  assert.deepEqual(JSON.parse(artifacts.usabilityText), artifacts.usabilityRecord);
  assert.deepEqual(JSON.parse(artifacts.sealText), artifacts.sealReceipt);
  assert.throws(() => {
    artifacts.opinionRecord.caseResponses[0].reason = "MUTATED_AFTER_SEAL";
  }, TypeError);
  assert.equal(artifacts.opinionText.includes("MUTATED_AFTER_SEAL"), false);
});

test("imports only the expected seat and rejects drift or a BOM", async () => {
  const draft = await createPilotDraft("A");
  const serialized = serializeUtf8Json(draft);
  assert.deepEqual(await parsePilotDraft(serialized, "A"), draft);
  await assert.rejects(() => parsePilotDraft(serialized, "B"), PilotContractError);
  const drifted = JSON.parse(serialized);
  drifted.sessionBinding.scenarioSetDigest = "0".repeat(64);
  await assert.rejects(() => parsePilotDraft(JSON.stringify(drifted), "A"), /摘要失配/u);
  await assert.rejects(() => parsePilotDraft(`\ufeff${serialized}`, "A"), /BOM/u);
});

test("strict JSON rejects duplicate keys, including escape-equivalent object names", async () => {
  assert.throws(
    () => parseStrictJsonText('{"seatId":"A","seatId":"A"}', { label: "duplicate test" }),
    /重复键/u
  );
  assert.throws(
    () => parseStrictJsonText('{"seatId":"A","se\\u0061tId":"A"}', { label: "duplicate escape test" }),
    /重复键/u
  );
  const draft = await createPilotDraft("A");
  const duplicateDraft = serializeUtf8Json(draft).replace("{\n", '{\n  "schemaVersion": "1.0.0",\n');
  await assert.rejects(() => parsePilotDraft(duplicateDraft, "A"), /重复键/u);
});

test("restores a legacy draft only into the explicit unassigned development preview", async () => {
  const current = await createPilotDraft("A");
  const legacy = structuredClone(current);
  legacy.recordVersion = "1.0.0";
  legacy.sessionBinding.templateVersion = "hakimi.bazi.expert-review-pilot-template/0.1.0";
  delete legacy.sessionBinding.bindingMode;
  delete legacy.sessionBinding.reviewCycleId;
  delete legacy.sessionBinding.packageManifestRawSha256;
  const restored = await parsePilotDraft(serializeUtf8Json(legacy), "A");
  assert.equal(restored.recordVersion, "1.1.0");
  assert.equal(restored.sessionBinding.reviewCycleId, UNASSIGNED_REVIEW_CYCLE_ID);
  await assert.rejects(
    () => parsePilotDraft(serializeUtf8Json(legacy), "A", PHYSICAL_SESSION),
    /只能在明确的开发预览/u
  );

  const physical = await createPilotDraft("A", PHYSICAL_SESSION);
  assert.deepEqual(
    await parsePilotDraft(serializeUtf8Json(physical), "A", PHYSICAL_SESSION),
    physical
  );
  await assert.rejects(
    () => parsePilotDraft(serializeUtf8Json(physical), "A", {
      reviewCycleId: `pilot-review-cycle.${"7".repeat(64)}`,
      packageManifestRawSha256: PHYSICAL_SESSION.packageManifestRawSha256
    }),
    /不属于当前 review cycle/u
  );
});

test("preflights the exact four embedded artifacts and rejects digest or seat-cycle drift", async () => {
  const draft = completeDraft(await createPilotDraft("A", PHYSICAL_SESSION));
  const artifacts = await buildFinalArtifacts(draft, new Date("2030-01-02T03:04:05.000Z"));
  const bytes = new TextEncoder().encode(artifacts.completePackageText);
  const result = await preflightPilotCompleteSubmissionBytes(bytes, { seatId: "A", ...PHYSICAL_SESSION });
  assert.equal(result.mechanicalChecks.outerAndEmbeddedDigestsVerified, true);
  assert.equal(result.mechanicalChecks.opinionSealBytesCrossLinked, true);
  assert.equal(result.reviewCycleId, PHYSICAL_SESSION.reviewCycleId);

  const outerTamper = structuredClone(artifacts.completePackageRecord);
  outerTamper.embeddedFiles[0].rawSha256 = "d".repeat(64);
  await assert.rejects(
    () => preflightPilotCompleteSubmissionBytes(
      new TextEncoder().encode(serializeUtf8Json(outerTamper)),
      { seatId: "A", ...PHYSICAL_SESSION }
    ),
    /integrity|摘要/u
  );
  await assert.rejects(
    () => preflightPilotCompleteSubmissionBytes(bytes, {
      seatId: "A",
      reviewCycleId: `pilot-review-cycle.${"e".repeat(64)}`,
      packageManifestRawSha256: PHYSICAL_SESSION.packageManifestRawSha256
    }),
    /review cycle/u
  );
  await assert.rejects(
    () => preflightPilotCompleteSubmissionBytes(bytes, { seatId: "B", ...PHYSICAL_SESSION }),
    /seat/u
  );

  const sessionDrift = structuredClone(artifacts.completePackageRecord);
  sessionDrift.sessionBinding.entryOrderDigest = "f".repeat(64);
  resignPilotRecord(sessionDrift, "hakimi/bazi-expert-pilot/complete-submission-package/v1");
  await assert.rejects(
    () => preflightPilotCompleteSubmissionBytes(
      new TextEncoder().encode(serializeUtf8Json(sessionDrift)),
      { seatId: "A", ...PHYSICAL_SESSION }
    ),
    /session binding/u
  );
});

test("canonical JSON is key-order stable", () => {
  assert.equal(canonicalStringify({ z: 1, a: { y: 2, x: 3 } }), canonicalStringify({ a: { x: 3, y: 2 }, z: 1 }));
});

test("static application contains no persistence, service worker, network API or prohibited comparison labels", async () => {
  const files = ["app.js", "contract.js", "seat-a.html", "seat-b.html"];
  const contents = await Promise.all(files.map((file) => readFile(join(sourceRoot, file), "utf8")));
  const combined = contents.join("\n");
  assert.doesNotMatch(combined, /localStorage|sessionStorage|indexedDB|document\.cookie|serviceWorker|new\s+WebSocket|XMLHttpRequest|\bfetch\s*\(/u);
  assert.doesNotMatch(combined, /AI答案|accuracy|reviewCycleEpoch/u);
  assert.doesNotMatch(combined, /https?:\/\//u);
  for (const html of contents.slice(2)) {
    assert.match(html, /connect-src 'none'/u);
    assert.match(html, /data-seat="[AB]"/u);
  }
});

test("formal intake rejects a pilot opinion instead of converting or counting it", async () => {
  const { preflightBaziExpertOriginalOpinion } = await import("../../../scripts/bazi-expert-review-packet-lib.mjs");
  const draft = completeDraft(await createPilotDraft("A", PHYSICAL_SESSION));
  const artifacts = await buildFinalArtifacts(draft, new Date("2030-01-02T03:04:05.000Z"));
  assert.throws(
    () => preflightBaziExpertOriginalOpinion(artifacts.opinionRecord),
    (error) => error?.code === "INTAKE_RECORD_INVALID"
  );
  assert.equal(artifacts.opinionRecord.authorityBoundary.countsTowardFormal2of2, false);
  assert.equal(artifacts.opinionRecord.authorityBoundary.countsTowardExpertGate, false);
});
