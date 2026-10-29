import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { buildLocalAnnualOutlook } from "./local-annual-outlook";
import { buildLocalLifeOutlook } from "./local-detailed-outlook";
import { buildReadingTimeline } from "./local-reading-timeline";
import { readingTimelineNarrativeSubjectId, readingTimelineNarrativeText } from "./local-reading-timeline-record";
import { buildReadingSynthesis } from "./local-reading-synthesis";
import { buildLocalReadingSnapshot } from "./local-reading-record";
import { buildReadingFeedbackChoices, buildStructuredReadingFeedback, parseReadingFeedback } from "./local-reading-feedback";

async function fixture(sex: "male" | "unspecified") {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1999-01-09", time: "02:26",
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex, lunarLeapMonth: false,
    location: { label: "Synthetic trajectory record", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
  const assessment = buildBaziPreliminaryAssessment(revision), comprehensive = buildBaziComprehensiveReading(revision, assessment);
  const [annual, life] = await Promise.all([buildLocalAnnualOutlook(revision, assessment, 2026), buildLocalLifeOutlook(revision, assessment, 2026)]);
  const timeline = buildReadingTimeline({ revision, annual, life });
  return { revision, assessment, comprehensive, annual, life, timeline };
}
let sources: Awaited<ReturnType<typeof fixture>>[];
beforeAll(async () => { sources = await Promise.all([fixture("male"), fixture("unspecified")]); });

describe("trajectory answers survive complete reporting and exact feedback", () => {
  it.each([0, 1])("keeps every statement and same-branch anchor for fixture %s", (index) => {
    const source = sources[index]!, before = JSON.stringify(source);
    const synthesis = buildReadingSynthesis(source);
    const body = buildLocalReadingSnapshot(source.assessment, source.annual, { sourceRevision: source.revision,
      comprehensive: source.comprehensive, life: source.life, timeline: source.timeline, synthesis });
    for (const branch of source.timeline.branches) {
      const originalConclusion = readingTimelineNarrativeText(source.timeline, branch);
      expect(body).toContain(originalConclusion);
      const choice = { id: readingTimelineNarrativeSubjectId(source.timeline, branch), label: `${branch.label}走势总评`, originalConclusion,
        sourceVersions: [source.timeline.version, ...source.timeline.sourceVersions] };
      expect(buildReadingFeedbackChoices(source.assessment, source.annual, [choice])).toContainEqual(choice);
      const feedback = parseReadingFeedback(buildStructuredReadingFeedback(source.assessment, { subjectId: choice.id, subjectLabel: choice.label,
        sourceVersions: choice.sourceVersions, originalConclusion, rating: "unverified", actualSituation: "仅合成测试，不填真实经历。" }));
      expect(feedback.kind).toBe("feedback");
      if (feedback.kind !== "feedback") throw new Error("expected structured feedback");
      expect(feedback.value.originalConclusion).toBe(originalConclusion);
      expect(feedback.value.source.readingVersions).toEqual(choice.sourceVersions);
      for (const statement of branch.narrative.statements) {
        expect(body).toContain(statement.text);
        expect([...synthesis.sections.flatMap((section) => [section.answer ?? "", ...section.paragraphs, ...section.evidence])].join("\n")).toContain(statement.text);
        for (const id of statement.stageIds) expect(source.timeline.stages.find((stage) => stage.id === id)?.branchId).toBe(branch.id);
        for (const id of statement.turningPointIds) expect(source.timeline.turningPoints.find((point) => point.id === id)?.branchId).toBe(branch.id);
      }
    }
    expect(JSON.stringify(source)).toBe(before);
  });

  it("rejects changed prose, omitted statements and a valid anchor borrowed from the other branch", () => {
    const source = sources[1]!, extras = { sourceRevision: source.revision, life: source.life };
    for (const change of ["text", "omit", "cross"] as const) {
      const altered = structuredClone(source.timeline), statement = altered.branches[0]!.narrative.statements[0]!;
      if (change === "text") statement.text = "已脱离原判断的新走势答案";
      else if (change === "omit") altered.branches[0]!.narrative.statements.pop();
      else statement.stageIds = [altered.branches[1]!.stageIds[0]!];
      expect(() => buildLocalReadingSnapshot(source.assessment, source.annual, { ...extras, timeline: altered })).toThrow("阶段走势正文、引用或原始计算不一致");
      expect(() => buildReadingSynthesis({ ...source, timeline: altered })).toThrow();
    }
  });
});
