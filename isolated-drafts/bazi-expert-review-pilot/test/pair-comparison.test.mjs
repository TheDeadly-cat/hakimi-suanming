import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import { request } from "node:http";
import test from "node:test";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const {
  buildFinalArtifacts,
  createPilotDraft
} = await import("../contract.js");
const {
  PILOT_PAIR_COMPARISON_BOUNDARY,
  PilotPairComparisonError,
  comparePilotCompleteSubmissions,
  isPilotPairComparisonCandidate
} = await import("../pair-comparison.js");
const { createPairComparisonServer } = await import("../pair-compare-server.mjs");

const CYCLE = `pilot-review-cycle.${"c".repeat(64)}`;
const PIN_A = "a".repeat(64);
const PIN_B = "b".repeat(64);
const EXPECTED = Object.freeze({
  reviewCycleId: CYCLE,
  seatAManifestRawSha256: PIN_A,
  seatBManifestRawSha256: PIN_B
});

function completeDraft(draft, seat) {
  draft.acknowledgements.pilotOnly = true;
  draft.acknowledgements.syntheticOnly = true;
  draft.acknowledgements.noCrossOpinionAccess = true;
  draft.acknowledgements.privateOffRepositoryHandling = true;
  draft.reviewerSelfDescription.selfDescribedTradition = seat === "A"
    ? "A 席自述：子平旺衰。"
    : "B 席自述：子平旺衰。";
  draft.reviewerSelfDescription.selfDescribedScope = "仅复核合成场景中的权重、条件、反例和表达边界。";
  for (const response of Object.values(draft.caseResponses)) {
    response.factAssessment = "insufficient_information";
    response.rulePosition = "conditional";
    response.reason = "需要结合流派边界判断。";
    response.applicabilityConditions = "仅在题面显示因素内成立。";
    response.counterexamples = "特殊结构成立时可能失效。";
    response.invalidationStructures = ["无法判断"];
    response.highRiskDisposition = "defer";
    response.revisionSuggestion = "继续保留候选标签。";
  }
  if (seat === "B") {
    draft.caseResponses.P01.factAssessment = "not_established";
    draft.caseResponses.P01.rulePosition = "oppose";
    draft.caseResponses.P01.reason = "B 席认为当前事实与规则都需要重新核对。";
  }
  for (const response of Object.values(draft.overallResponses)) {
    response.position = "conditional";
    response.expertOriginalText = "只支持条件化判断。";
    response.rationale = "人工场景不能替代正式案例集。";
    response.uncertainties = "来源与现实专家核验尚未闭合。";
  }
  draft.usabilityFeedback.clarityRating = "4";
  draft.usabilityFeedback.difficultTerms = "无";
  draft.usabilityFeedback.workflowComments = "保留逐页结构。";
  return draft;
}

async function pairBytes() {
  const draftA = completeDraft(await createPilotDraft("A", {
    reviewCycleId: CYCLE,
    packageManifestRawSha256: PIN_A
  }), "A");
  const draftB = completeDraft(await createPilotDraft("B", {
    reviewCycleId: CYCLE,
    packageManifestRawSha256: PIN_B
  }), "B");
  const [artifactsA, artifactsB] = await Promise.all([
    buildFinalArtifacts(draftA, new Date("2030-01-02T03:04:05.000Z")),
    buildFinalArtifacts(draftB, new Date("2030-01-02T03:05:05.000Z"))
  ]);
  return {
    seatABytes: new TextEncoder().encode(artifactsA.completePackageText),
    seatBBytes: new TextEncoder().encode(artifactsB.completePackageText)
  };
}

test("compares same-cycle A/B originals field by field without selecting a winner", async () => {
  const bytes = await pairBytes();
  const candidate = await comparePilotCompleteSubmissions({ ...bytes, expected: EXPECTED });
  assert.equal(candidate.recordType, "bazi_expert_review_pilot_private_pair_comparison_candidate_v1");
  assert.equal(candidate.totalComparedFieldCount, 58);
  assert.equal(candidate.unresolvedDifferenceCount, 4);
  assert.equal(candidate.exactMatchCount, 54);
  assert.deepEqual(candidate.unresolvedDifferenceIds, [
    "reviewer_context/reviewer-context/selfDescribedTradition",
    "scenario/P01/factAssessment",
    "scenario/P01/rulePosition",
    "scenario/P01/reason"
  ]);
  assert.equal(candidate.scenarioRows.find((entry) => entry.sectionId === "P01" && entry.fieldId === "reason")?.seatBValue,
    "B 席认为当前事实与规则都需要重新核对。");
  for (const row of [...candidate.reviewerContextRows, ...candidate.scenarioRows, ...candidate.overallQuestionRows]) {
    assert.equal(row.machineRecommendedWinner, null);
    assert.equal(row.resolutionStatus, row.classification === "difference" ? "unresolved" : "no_difference_observed");
  }
  assert.equal(candidate.manualPilotFollowupDisposition, null);
  assert.equal(candidate.manualPilotFollowupRequired, true);
  assert.equal(candidate.authorityBoundary.countsTowardFormal2of2, false);
  assert.equal(candidate.comparisonBoundary.formalTwoOfTwoCountDelta, 0);
  assert.equal(candidate.comparisonBoundary.expertGateCountDelta, 0);
  assert.equal(candidate.mutationBoundary.productStorageMutationPerformed, false);
  assert.equal(candidate.releaseGovernance.releaseIdentity, "legacy-v13");
  assert.equal(candidate.releaseGovernance.targetSchema, 13);
  assert.equal(candidate.releaseGovernance.migrationId, null);
  assert.equal(isPilotPairComparisonCandidate(candidate), true);
  assert.equal(isPilotPairComparisonCandidate(structuredClone(candidate)), false);
});

test("keeps every adjudication, truth, AI comparison, release and persistence authority closed", () => {
  assert.deepEqual(PILOT_PAIR_COMPARISON_BOUNDARY, {
    comparisonPurpose: "pilot_private_side_by_side_difference_only",
    twoValidatedPilotSubmissionsRequired: true,
    originalOpinionValuesTransformed: false,
    originalOpinionValuesOverwritten: false,
    usabilityFeedbackUsedForDomainComparison: false,
    authorshipBlindingEstablished: false,
    actualHumanParticipationEstablished: false,
    actualHumanIndependenceEstablished: false,
    expertIdentityEstablished: false,
    opinionAuthenticityEstablished: false,
    syntheticFixtureOnly: true,
    realReturnLoadingAuthorized: false,
    browserProfileIsolationEstablished: false,
    preexistingServiceWorkerExcluded: false,
    browserExtensionInterceptionExcluded: false,
    externalAiUseExcluded: false,
    expertVsAiAccuracyEvaluated: false,
    predictiveAccuracyEvaluated: false,
    generatedModelAdjudicationAllowed: false,
    winnerSelectionAllowed: false,
    majorityVoteAllowed: false,
    averagingAllowed: false,
    automaticMergeAllowed: false,
    formalDisagreementInventoryEmitted: false,
    formalReconciliationEligible: false,
    formalReconciliationRecordEmitted: false,
    pilotToFormalConversionAllowed: false,
    formalTwoOfTwoCountDelta: 0,
    expertGateCountDelta: 0,
    formalAdmissionAllowed: false,
    safeToPublish: false,
    handlingClassification: "private_off_repository_in_memory_only"
  });
});

test("rejects wrong pins, wrong cycle, reused pins and changed complete-submission bytes", async () => {
  const bytes = await pairBytes();
  await assert.rejects(
    () => comparePilotCompleteSubmissions({
      ...bytes,
      expected: { ...EXPECTED, seatAManifestRawSha256: "d".repeat(64) }
    }),
    /manifest|摘要|绑定|review cycle|物理单席包/u
  );
  await assert.rejects(
    () => comparePilotCompleteSubmissions({
      ...bytes,
      expected: { ...EXPECTED, reviewCycleId: `pilot-review-cycle.${"d".repeat(64)}` }
    }),
    /review cycle|交接轮次/u
  );
  await assert.rejects(
    () => comparePilotCompleteSubmissions({
      ...bytes,
      expected: { ...EXPECTED, seatBManifestRawSha256: PIN_A }
    }),
    (error) => error instanceof PilotPairComparisonError && error.code === "EXPECTED_PINS_NOT_DISTINCT"
  );
  const changed = new Uint8Array(bytes.seatBBytes);
  changed[changed.byteLength - 2] ^= 1;
  await assert.rejects(
    () => comparePilotCompleteSubmissions({ ...bytes, seatBBytes: changed, expected: EXPECTED }),
    /JSON|integrity|摘要|回件/u
  );
});

test("deep-freezes the branded comparison and retains brand checks after WeakSet prototype poisoning", async () => {
  const candidate = await comparePilotCompleteSubmissions({ ...(await pairBytes()), expected: EXPECTED });
  const assertDeepFrozen = (value, seen = new Set()) => {
    if (value === null || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    assert.equal(Object.isFrozen(value), true);
    for (const child of Object.values(value)) assertDeepFrozen(child, seen);
  };
  assertDeepFrozen(candidate);
  assert.throws(() => {
    candidate.scenarioRows[0].seatAValue = "MUTATED";
  }, TypeError);
  const originalHas = WeakSet.prototype.has;
  const originalAdd = WeakSet.prototype.add;
  try {
    WeakSet.prototype.has = () => true;
    WeakSet.prototype.add = () => { throw new Error("poisoned add"); };
    assert.equal(isPilotPairComparisonCandidate(candidate), true);
    assert.equal(isPilotPairComparisonCandidate({}), false);
  } finally {
    WeakSet.prototype.has = originalHas;
    WeakSet.prototype.add = originalAdd;
  }
});

function fetchLoopback({ port, path = "/", method = "GET", hostHeader = `127.0.0.1:${port}` }) {
  return new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, path, method, headers: { Host: hostHeader } }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks).toString("utf8")
      }));
    });
    req.on("error", reject);
    req.end();
  });
}

test("serves only the pair-comparison allowlist on an exact loopback Host", async (t) => {
  const server = createPairComparisonServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const root = await fetchLoopback({ port: address.port });
  assert.equal(root.status, 200);
  assert.match(root.body, /两席试填差异并列/u);
  assert.match(root.headers["content-security-policy"], /connect-src 'none'/u);
  assert.equal((await fetchLoopback({ port: address.port, path: "/seat-a.html" })).status, 404);
  assert.equal((await fetchLoopback({ port: address.port, path: "/../contract.js" })).status, 404);
  assert.equal((await fetchLoopback({ port: address.port, method: "POST" })).status, 405);
  assert.equal((await fetchLoopback({ port: address.port, hostHeader: "localhost" })).status, 421);
});

test("pair page has no persistence, upload transport, active-content renderer, or service-worker API", async () => {
  const [pageSource, comparisonSource, html] = await Promise.all([
    readFile(new URL("../pair-compare.js", import.meta.url), "utf8"),
    readFile(new URL("../pair-comparison.js", import.meta.url), "utf8"),
    readFile(new URL("../pair-compare.html", import.meta.url), "utf8")
  ]);
  const browserCode = `${pageSource}\n${comparisonSource}\n${html}`;
  assert.doesNotMatch(browserCode, /localStorage|sessionStorage|indexedDB|document\.cookie|caches\.|serviceWorker|new\s+WebSocket|XMLHttpRequest|\bfetch\s*\(/u);
  assert.doesNotMatch(pageSource, /innerHTML|outerHTML|insertAdjacentHTML|\beval\s*\(|new\s+Function/u);
  assert.match(html, /connect-src 'none'/u);
  assert.match(html, /不得载入真实专家回件/u);
});
