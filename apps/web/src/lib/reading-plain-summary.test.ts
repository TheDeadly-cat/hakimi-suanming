import { expect, it } from "vitest";
import { buildPlainReadingSummary } from "./reading-plain-summary";
import type { ReadingConclusion, ReadingExplanationIndex } from "./reading-explanation-index";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { buildLocalLifeOutlook } from "./local-detailed-outlook";
import { buildReadingSynthesis } from "./local-reading-synthesis";
import { buildBriefReadingReport } from "./brief-reading-report";
import { buildReadingExplanationIndex } from "./reading-explanation-index";

const revisionId = "11111111-1111-4111-8111-111111111111";
const currentProvenance = "hakimi.natal-reading-rule-applications/0.1.0";
const currentConcrete = "hakimi.concrete-natal-prose/0.2.0";
const currentAdopted = "hakimi.natal-adopted-conclusion/0.2.1";
function fixture() {
  const conclusion: ReadingConclusion = {
    stableId: `${revisionId}/natal:career`, label: "专业积累与实际成果", text: "原文第一句不承担摘要。完整原文与限制必须保留。",
    domain: "career", origin: "calculated", direction: null, personalTextIds: [], sourceSubjects: ["chapter-career"], sourceVersions: [currentProvenance, currentConcrete],
    scope: { level: "natal", year: null, branchId: null, startInstant: null, endExclusiveInstant: null },
    evidence: { facts: ["此结论的独立事实"], support: ["此结论的独立支持"], limits: ["原始未获验证限制"], unknowns: ["现实身份未确定"], citations: ["own-source"],
      ruleApplications: [{ ruleId: "buildConcreteNatalProse.route", title: "实际正文选择", decision: "原规则决定", support: ["本项支持"], limitations: ["只有已有支持能实际承接时适用"],
        sourceSubjects: ["chapter-career"], sourceIds: ["own-source"], provenance: { version: currentProvenance, producerVersion: currentConcrete, selector: "buildConcreteNatalProse.route", selection: "career/resource-output", factRefs: ["patternDiagnosis.primaryPathId"] } }] }
  };
  // Pure projection fixture: only the fields consumed by the projection are
  // supplied. Wire-format validation and real producer coverage have own tests.
  const index = { sourceSnapshot: { revisionId, reportVersion: "hakimi.local-reading-edition/0.22.3", sourceVersions: [...conclusion.sourceVersions] }, conclusions: [conclusion],
    citationBindings: [{ conclusionId: conclusion.stableId, sourceId: "own-source" },
      { conclusionId: `${revisionId}/natal:wealth`, sourceId: "unrelated-source" }] } as ReadingExplanationIndex;
  return { index, conclusion };
}

it("uses the recorded producer selection and retains all identity, conditions and own evidence without mutating the index", () => {
  const { index, conclusion } = fixture(), before = JSON.stringify(index);
  const result = buildPlainReadingSummary(index, conclusion);
  expect(result.explanation).toContain("专业积累与实际产出");
  expect(result.explanation).not.toContain("原文第一句");
  expect(result.sourceConclusionId).toBe(conclusion.stableId);
  expect(result.sourceRevisionId).toBe(revisionId);
  expect(result.sourceReportVersion).toBe(index.sourceSnapshot.reportVersion);
  expect(result.sourceVersions).toEqual(conclusion.sourceVersions);
  expect(result.sourceVersions).not.toBe(conclusion.sourceVersions);
  expect(result.scope).toEqual(conclusion.scope);
  expect(result.conditions).toContain("只有已有支持能实际承接时适用");
  expect(result.limitations).toContain("原始未获验证限制");
  expect(result.unknowns).toEqual(["现实身份未确定"]);
  expect(result.evidenceRefs).toEqual([{ conclusionId: conclusion.stableId, sourceId: "own-source" }]);
  expect(result.reviewState).toBe("editorial_draft_not_expert_reviewed");
  expect(JSON.stringify(index)).toBe(before);
});

it("does not borrow another domain, infer a template from prose, or overwrite a personal interpretation", () => {
  const { index, conclusion } = fixture();
  conclusion.evidence.ruleApplications[0]!.provenance!.selection = "wealth/resource-output";
  conclusion.text = "官印相生，印格泄秀，一定升职。";
  const unmapped = buildPlainReadingSummary(index, conclusion);
  expect(unmapped.projectionState).toBe("original_required");
  expect(unmapped.plainTitle).toBe(conclusion.label);
  expect(unmapped.nextAction).toBe("查看原文及条件");
  expect(unmapped.explanation).not.toMatch(/一定升职|专业积累与实际产出/);
  conclusion.evidence.ruleApplications[0]!.provenance!.selection = "career/resource-output";
  conclusion.origin = "personal";
  const personal = buildPlainReadingSummary(index, conclusion);
  expect(personal.projectionState).toBe("personal_original");
  expect(personal.explanation).toContain("个人文字");
  expect(personal.explanation).not.toContain("专业积累与实际产出");
  expect(personal.evidenceRefs).toEqual([]);
  expect(personal.ruleRefs).toEqual([]);
  expect(conclusion.text).toBe("官印相生，印格泄秀，一定升职。");
});

it("preserves a specific month and branch rather than projecting a natal or annual direction onto it", () => {
  const { index, conclusion } = fixture();
  conclusion.scope = { level: "month", year: 2030, branchId: "backward", startInstant: "2030-02-04T00:00:00Z", endExclusiveInstant: "2030-03-05T00:00:00Z" };
  conclusion.direction = "unknown";
  const result = buildPlainReadingSummary(index, conclusion);
  expect(result.projectionState).toBe("original_required");
  expect(result.plainTitle).toBe(conclusion.label);
  expect(result.scope).toEqual(conclusion.scope);
  expect(result.explanation).not.toContain("专业积累与实际产出");
  expect(() => buildPlainReadingSummary(index, { ...conclusion, stableId: "another-revision/natal:career" })).toThrow("当前索引");
});

it("uses relationship-specific provenance, preserves separated status, and never infers a reunion", () => {
  const { index, conclusion } = fixture();
  conclusion.domain = "relationship";
  const rule = conclusion.evidence.ruleApplications[0]!;
  rule.ruleId = "buildConcreteNatalProse.relationship";
  rule.provenance!.selector = "buildConcreteNatalProse.relationship";
  rule.provenance!.selection = "正印/separated";
  const result = buildPlainReadingSummary(index, conclusion);
  expect(result.projectionState).toBe("mapped");
  expect(result.explanation).toContain("已记录分开背景");
  expect(result.explanation).toContain("不据此推断复合");
  expect(result.explanation).not.toContain("专业积累");
});

it.each(["hakimi.concrete-natal-prose/0.1.0", "hakimi.concrete-natal-prose/0.3.0", "unknown/1"])("does not apply current templates to unreviewed producer %s", producerVersion => {
  const { index, conclusion } = fixture();
  conclusion.evidence.ruleApplications[0]!.provenance!.producerVersion = producerVersion;
  conclusion.sourceVersions = [currentProvenance, producerVersion];
  index.sourceSnapshot.sourceVersions = [...conclusion.sourceVersions];
  const before = JSON.stringify(index), result = buildPlainReadingSummary(index, conclusion);
  expect(result.projectionState).toBe("original_required");
  expect(result.explanation).not.toContain("专业积累与实际产出");
  expect(result.sourceVersions).toContain(producerVersion);
  expect(JSON.stringify(index)).toBe(before);
});

it.each(["provenance-version", "conclusion-version", "snapshot-version", "rule-id", "duplicate-selector"])("requires a consistent provenance binding: %s", missing => {
  const { index, conclusion } = fixture();
  const rule = conclusion.evidence.ruleApplications[0]!;
  if (missing === "provenance-version") rule.provenance!.version = "hakimi.natal-reading-rule-applications/99.0.0";
  if (missing === "conclusion-version") conclusion.sourceVersions = [currentProvenance];
  if (missing === "snapshot-version") index.sourceSnapshot.sourceVersions = [currentProvenance];
  if (missing === "rule-id") rule.ruleId = "another-producer-same-selector";
  if (missing === "duplicate-selector") conclusion.evidence.ruleApplications.push(structuredClone(rule));
  expect(buildPlainReadingSummary(index, conclusion).projectionState).toBe("original_required");
});

it.each(["primary", "support-first"])("pins adopted %s to its producer version and exact conclusion key", ruleId => {
  const { index, conclusion } = fixture();
  conclusion.domain = "natal";
  conclusion.stableId = `${revisionId}/natal:use:${ruleId}`;
  conclusion.label = "当前采用项";
  conclusion.text = "原采用项的完整决定";
  conclusion.sourceVersions = [currentAdopted];
  index.sourceSnapshot.sourceVersions = [currentAdopted];
  const rule = conclusion.evidence.ruleApplications[0]!;
  rule.ruleId = ruleId; rule.title = conclusion.label; rule.decision = conclusion.text;
  delete rule.provenance;
  expect(buildPlainReadingSummary(index, conclusion).projectionState).toBe("mapped");
  conclusion.stableId = `${revisionId}/natal:use:unrelated`;
  expect(buildPlainReadingSummary(index, conclusion).projectionState).toBe("original_required");
  conclusion.stableId = `${revisionId}/natal:use:${ruleId}`;
  conclusion.sourceVersions = ["hakimi.natal-adopted-conclusion/0.2.0"];
  index.sourceSnapshot.sourceVersions = [...conclusion.sourceVersions];
  expect(buildPlainReadingSummary(index, conclusion).projectionState).toBe("original_required");
  conclusion.sourceVersions = [currentAdopted]; index.sourceSnapshot.sourceVersions = [currentAdopted];
  rule.decision = "另一个决定";
  expect(buildPlainReadingSummary(index, conclusion).projectionState).toBe("original_required");
});

it("provides a faithful mapped summary for the real synthetic first-use fixture including its unfinished structure", async () => {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1992-03-09", time: "17:18", timePrecision: "exact_minute",
    timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
    location: { label: "合成摘要回归", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: revisionId,
    caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-29T00:00:00Z" });
  const assessment = buildBaziPreliminaryAssessment(revision), comprehensive = buildBaziComprehensiveReading(revision, assessment);
  const life = await buildLocalLifeOutlook(revision, assessment, 2026);
  const synthesis = buildReadingSynthesis({ revision, assessment, comprehensive, life });
  const report = buildBriefReadingReport(assessment, null, { sourceRevision: revision, comprehensive, life, synthesis, explanationGeneratedAt: "2026-10-29T01:00:00Z" })!;
  const index = buildReadingExplanationIndex({ revision, assessment, report, synthesis, generatedAt: "2026-10-29T01:00:00Z" });
  const selected = index.conclusions.filter(item => item.scope.level === "natal" && (item.domain !== "natal" || item.stableId.endsWith("/natal:pattern") || item.stableId.includes("/natal:use:")));
  expect(selected.map(item => buildPlainReadingSummary(index, item).projectionState)).not.toContain("original_required");
  const pattern = selected.find(item => item.stableId.endsWith("/natal:pattern"))!;
  expect(buildPlainReadingSummary(index, pattern).explanation).toContain("配合尚未齐备");
  const career = selected.find(item => item.domain === "career")!;
  expect(buildPlainReadingSummary(index, career).explanation).toContain("尚未形成专门的发挥主线");
}, 60_000);
