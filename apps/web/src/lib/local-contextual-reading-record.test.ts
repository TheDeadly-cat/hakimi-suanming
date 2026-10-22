import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { CaseRepository, ResearchDatabase, ResearchRepository } from "@hakimi/storage";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { buildReadingContextRecord, resolveReadingContext, LOCAL_READING_CONTEXT_TAG } from "./local-reading-context";
import { buildContextualReadingBundle, contextualFeedbackText, contextualFeedbackVersions } from "./local-contextual-reading-record";
import { buildLocalPersonalReading } from "./local-personal-reading";
import { buildStructuredReadingFeedback, buildReadingFeedbackReview, readingFeedbackSource } from "./local-reading-feedback";
import { buildLocalReadingSnapshot } from "./local-reading-record";

describe("contextual reading persistence and feedback binding", () => {
  it("binds an adopted contextual correction to the saved background, and keeps it out after a different background is declared", async () => {
    const database = new ResearchDatabase(`contextual-record-${crypto.randomUUID()}`, { targetSchema: 13, releaseWritesLocked: false });
    try {
      const calculated = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-05-18", time: "08:26",
        timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
        location: { label: "合成背景绑定", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
      const revision = (await new CaseRepository(database).createCase({ alias: "合成背景绑定", calculated })).revisions[0]!;
      const assessment = buildBaziPreliminaryAssessment(revision), comprehensive = buildBaziComprehensiveReading(revision, assessment);
      const repository = new ResearchRepository(database);
      const append = (body: string, tag: string) => repository.createResearchNote({ caseId: revision.caseId,
        anchor: { kind: "revision", revisionId: revision.id }, body, tags: [tag], sourceRefs: [], lifecycle: "active" });
      const draft = { work: "seeking_work" as const, relationship: "single" as const, fromYear: 2026, toYear: 2026, notes: "合成自述；不可自动推断已录用。" };
      const first = await append(await buildReadingContextRecord(revision, null, draft), LOCAL_READING_CONTEXT_TAG);
      const resolved = await resolveReadingContext({ revision, records: [first] });
      const bundle = buildContextualReadingBundle({ revision, assessment, comprehensive, annualDomains: null, context: resolved.latest, referenceYear: 2026 })!;
      const reading = bundle.readings.find((item) => item.subjectId === "contextual-chapter-career")!;
      const choice = { id: reading.subjectId, label: reading.title, originalConclusion: contextualFeedbackText(reading, bundle),
        sourceVersions: contextualFeedbackVersions(reading, bundle) };
      const root = await append(buildStructuredReadingFeedback(assessment, { subjectId: choice.id, subjectLabel: choice.label,
        sourceVersions: choice.sourceVersions, originalConclusion: choice.originalConclusion, rating: "unverified",
        actualSituation: "合成案例反馈。", requestedRevision: "合成个人改写：先整理作品，再选择合适岗位。" }), "解读反馈");
      const review = await append(await buildReadingFeedbackReview(root, null, readingFeedbackSource(assessment, choice.sourceVersions), {
        state: "revised", notes: "合成测试明确采用。", revisedConclusion: "合成个人改写：先整理作品，再选择合适岗位。", occurredAt: "" }), "解读反馈");
      const personal = await buildLocalPersonalReading({ revision, assessment, records: [root, review], choices: [choice] });
      expect(personal.entries[0]!.state).toBe("adopted");
      const savedBody = buildLocalReadingSnapshot(assessment, null, { sourceRevision: revision, comprehensive, contextual: bundle, personalReading: personal });
      expect(savedBody).toContain(first.id);
      expect(savedBody).toContain(resolved.latest!.ref.bodySha256);
      expect(savedBody).toContain("合成个人改写：先整理作品，再选择合适岗位。");
      const second = await append(await buildReadingContextRecord(revision, first, { ...draft, work: "employed" }), LOCAL_READING_CONTEXT_TAG);
      const changed = await resolveReadingContext({ revision, records: [first, second] });
      const nextBundle = buildContextualReadingBundle({ revision, assessment, comprehensive, annualDomains: null, context: changed.latest, referenceYear: 2026 })!;
      const nextReading = nextBundle.readings.find((item) => item.subjectId === choice.id)!;
      const nextPersonal = await buildLocalPersonalReading({ revision, assessment, records: [root, review], choices: [{ id: nextReading.subjectId,
        label: nextReading.title, originalConclusion: contextualFeedbackText(nextReading, nextBundle), sourceVersions: contextualFeedbackVersions(nextReading, nextBundle) }] });
      expect(nextPersonal.entries).toHaveLength(0);
      expect(nextPersonal.issues.join("\n")).toContain("版本与当前内容不同");
      expect(nextReading.paragraphs.join("\n")).toContain("已任职");
      expect((await repository.listResearchNotesByCase(revision.caseId)).find((item) => item.id === first.id)!.body).toBe(first.body);
      expect(buildLocalReadingSnapshot(assessment, null, { sourceRevision: revision, comprehensive, contextual: bundle, personalReading: personal })).toBe(savedBody);
    } finally { await database.delete(); }
  });
});
