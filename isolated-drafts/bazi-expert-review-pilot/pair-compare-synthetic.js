import { buildFinalArtifacts, createPilotDraft } from "./contract.js";
import { comparePilotCompleteSubmissions } from "./pair-comparison.js";

const CYCLE = `pilot-review-cycle.${"c".repeat(64)}`;
const PIN_A = "a".repeat(64);
const PIN_B = "b".repeat(64);

const runButton = document.querySelector("#run");
const status = document.querySelector("#status");
const errorPanel = document.querySelector("#error");
const result = document.querySelector("#result");
const totalFields = document.querySelector("#total-fields");
const matchingFields = document.querySelector("#matching-fields");
const differenceFields = document.querySelector("#difference-fields");
const formalCount = document.querySelector("#formal-count");
const differenceSummary = document.querySelector("#difference-summary");

if (!(runButton instanceof HTMLButtonElement)
  || !(status instanceof HTMLElement)
  || !(errorPanel instanceof HTMLElement)
  || !(result instanceof HTMLElement)
  || !(totalFields instanceof HTMLElement)
  || !(matchingFields instanceof HTMLElement)
  || !(differenceFields instanceof HTMLElement)
  || !(formalCount instanceof HTMLElement)
  || !(differenceSummary instanceof HTMLElement)) {
  throw new Error("synthetic pair page identity invalid");
}

function completeDraft(draft, seatId) {
  draft.acknowledgements.pilotOnly = true;
  draft.acknowledgements.syntheticOnly = true;
  draft.acknowledgements.noCrossOpinionAccess = true;
  draft.acknowledgements.privateOffRepositoryHandling = true;
  draft.reviewerSelfDescription.selfDescribedTradition = `${seatId} 席合成传统标签`;
  draft.reviewerSelfDescription.selfDescribedScope = "仅用于程序内置合成场景的隔离启动自检。";
  for (const response of Object.values(draft.caseResponses)) {
    response.factAssessment = "insufficient_information";
    response.rulePosition = "conditional";
    response.reason = "合成意见：需要结合流派边界判断。";
    response.applicabilityConditions = "仅在内置合成题面内成立。";
    response.counterexamples = "特殊结构成立时可能失效。";
    response.invalidationStructures = ["无法判断"];
    response.highRiskDisposition = "defer";
    response.revisionSuggestion = "继续保留合成候选标签。";
  }
  if (seatId === "B") {
    draft.caseResponses.P01.factAssessment = "not_established";
    draft.caseResponses.P01.rulePosition = "oppose";
    draft.caseResponses.P01.reason = "B 席合成意见：P01 需要重新核对。";
  }
  for (const response of Object.values(draft.overallResponses)) {
    response.position = "conditional";
    response.expertOriginalText = "合成总体意见：只支持条件化判断。";
    response.rationale = "合成场景不能替代正式案例。";
    response.uncertainties = "现实身份、来源和内容真值均未建立。";
  }
  draft.usabilityFeedback.clarityRating = "4";
  draft.usabilityFeedback.difficultTerms = "无";
  draft.usabilityFeedback.workflowComments = "这是程序内置合成反馈。";
  return draft;
}

async function buildSyntheticPair() {
  const [draftA, draftB] = await Promise.all([
    createPilotDraft("A", { reviewCycleId: CYCLE, packageManifestRawSha256: PIN_A }),
    createPilotDraft("B", { reviewCycleId: CYCLE, packageManifestRawSha256: PIN_B })
  ]);
  const [artifactsA, artifactsB] = await Promise.all([
    buildFinalArtifacts(completeDraft(draftA, "A"), new Date("2030-01-02T03:04:05.000Z")),
    buildFinalArtifacts(completeDraft(draftB, "B"), new Date("2030-01-02T03:05:05.000Z"))
  ]);
  return comparePilotCompleteSubmissions({
    seatABytes: new TextEncoder().encode(artifactsA.completePackageText),
    seatBBytes: new TextEncoder().encode(artifactsB.completePackageText),
    expected: {
      reviewCycleId: CYCLE,
      seatAManifestRawSha256: PIN_A,
      seatBManifestRawSha256: PIN_B
    }
  });
}

async function runSyntheticCheck() {
  runButton.disabled = true;
  result.hidden = true;
  errorPanel.hidden = true;
  status.textContent = "正在本页内存中生成两份合成回件并机械比较……";
  try {
    const candidate = await buildSyntheticPair();
    totalFields.textContent = String(candidate.totalComparedFieldCount);
    matchingFields.textContent = String(candidate.exactMatchCount);
    differenceFields.textContent = String(candidate.unresolvedDifferenceCount);
    formalCount.textContent = String(candidate.comparisonBoundary.formalTwoOfTwoCountDelta);
    differenceSummary.textContent = `已识别 ${candidate.unresolvedDifferenceIds.length} 个规范字段差异；全部保持 unresolved。`;
    result.hidden = false;
    status.textContent = "合成自检完成；没有读取任何外部回件。";
    document.body.dataset.syntheticCheck = "passed";
    result.focus({ preventScroll: true });
    result.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    status.textContent = "合成自检失败。";
    errorPanel.textContent = error instanceof Error ? error.message : "无法完成合成自检。";
    errorPanel.hidden = false;
    errorPanel.focus();
    document.body.dataset.syntheticCheck = "failed";
  } finally {
    runButton.disabled = false;
  }
}

runButton.addEventListener("click", runSyntheticCheck);
