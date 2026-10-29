import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { storedRevisionRecordSchema, type RevisionRecord, type ResearchNoteRecord } from "@hakimi/contracts";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildStructuredReadingFeedback, buildReadingFeedbackReview, parseReadingFeedback, readFeedbackThread,
  readingFeedbackSource, LOCAL_READING_REVIEW_TAG, type ReadingFeedbackDraft } from "./local-reading-feedback";
let revision: RevisionRecord;
beforeAll(async () => {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26",
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
    location: { label: "Synthetic feedback", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111", caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00.000Z" });
});
function note(body: string, review = false): ResearchNoteRecord {
  return { schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: revision.caseId, anchor: { kind: "revision", revisionId: revision.id },
    bodyFormat: "markdown", body, tags: ["解读反馈", ...(review ? [LOCAL_READING_REVIEW_TAG] : [])], sourceRefs: [], lifecycle: "active", editVersion: 1,
    createdAt: "2026-10-16T00:00:00.000Z", updatedAt: "2026-10-16T00:00:00.000Z" };
}
const draft: ReadingFeedbackDraft = { subjectId: "chapter-career", subjectLabel: "事业", originalConclusion: "原结论\n强调连续交付。", sourceVersions: ["synthetic-reading/0.2"],
  rating: "partial", aspect: "方向符合，但时间不同", occurredAt: "2024 年秋季", actualSituation: "实际先学习，后来才承担项目。", requestedRevision: "先写学习积累，再写交付。" };
const reviewDraft = { state: "revised" as const, notes: "补充了实际时间与承担范围。", revisedConclusion: "这一阶段先完成学习，再逐步承担明确任务。", occurredAt: "2024—2025" };
describe("append-only source-bound reading feedback", () => {
  it("round-trips rating, time, actual experience, requested revision and the untouched original/source versions", () => {
    const assessment = buildBaziPreliminaryAssessment(revision), before = JSON.stringify(assessment);
    const parsed = parseReadingFeedback(buildStructuredReadingFeedback(assessment, draft));
    expect(parsed.kind).toBe("feedback"); if (parsed.kind !== "feedback") throw new Error();
    expect(parsed.value).toMatchObject({ rating: "partial", aspect: draft.aspect, occurredAt: draft.occurredAt, originalConclusion: draft.originalConclusion,
      actualSituation: draft.actualSituation, requestedRevision: draft.requestedRevision, source: { revisionId: revision.id, chartResultHash: revision.manifest.resultHash, readingVersions: draft.sourceVersions } });
    expect(JSON.stringify(assessment)).toBe(before);
    expect(() => buildStructuredReadingFeedback(assessment, { ...draft, aspect: " " })).toThrow("哪方面");
    expect(() => buildStructuredReadingFeedback(assessment, { ...draft, actualSituation: " " })).toThrow("真实经历");
    expect(parseReadingFeedback(buildStructuredReadingFeedback(assessment, { ...draft, rating: "unverified", actualSituation: "", aspect: "" })).kind).toBe("feedback");
  });
  it("keeps legacy appended metadata literal and refuses corrupted structured bodies", () => {
    const body = buildStructuredReadingFeedback(buildBaziPreliminaryAssessment(revision), draft);
    expect(parseReadingFeedback(`# 历史反馈\n原结论没有改动。\n\n${body}`)).toEqual({ kind: "legacy" });
    expect(parseReadingFeedback(body + "篡改末尾").kind).toBe("invalid");
    expect(parseReadingFeedback(body.replace("\"partial\"", "\"matches\"")).kind).toBe("invalid");
    expect(parseReadingFeedback("<!-- hakimi.local-reading-feedback/99\n{}\n-->\n\n旧内容").kind).toBe("invalid");
  });
  it("appends a source-bound review chain without changing any earlier record", async () => {
    const assessment = buildBaziPreliminaryAssessment(revision), source = readingFeedbackSource(assessment);
    const root = note(buildStructuredReadingFeedback(assessment, draft)), before = JSON.stringify(root);
    const first = note(await buildReadingFeedbackReview(root, null, source, reviewDraft), true), firstBefore = JSON.stringify(first);
    const second = note(await buildReadingFeedbackReview(root, first, source, { state: "retained", notes: "补充对照后本次保留原结论。", revisedConclusion: "此字段不得被偷偷当成有效修订", occurredAt: "2026 年" }), true);
    const thread = await readFeedbackThread(root, [second, root, first]);
    expect(thread.canAppend).toBe(true); expect(thread.reviews.map((item) => item.record.id)).toEqual([first.id, second.id]);
    expect(thread.latest?.value.state).toBe("retained"); expect(thread.latest?.value.revisedConclusion).toBe("");
    expect(thread.latest?.value.previous?.noteId).toBe(first.id);
    expect(thread.reviews[0]!.value.source.readingVersions).toEqual(draft.sourceVersions);
    expect(JSON.stringify(root)).toBe(before); expect(JSON.stringify(first)).toBe(firstBefore);
    await expect(buildReadingFeedbackReview(root, first, source, { ...reviewDraft, revisedConclusion: " " })).rejects.toThrow("个人修订文本");
  });
  it("preserves legacy feedback text and unknown historical version while allowing a separately bound personal review", async () => {
    const root = note("# 解读反馈\r\n历史原结论与实际情况原样保留。"), before = root.body;
    const review = note(await buildReadingFeedbackReview(root, null, readingFeedbackSource(buildBaziPreliminaryAssessment(revision)), reviewDraft), true);
    const thread = await readFeedbackThread(root, [review]);
    expect(thread.canAppend).toBe(true); expect(thread.latest?.value.source.assessmentVersion).toBeNull();
    expect(thread.latest?.value.source.includeHour).toBeNull(); expect(thread.latest?.value.source.readingVersions).toEqual([]);
    expect(root.body).toBe(before); expect(review.body).toContain(root.id);
  });
  it("does not silently fall back when the last review is corrupted, edited, orphaned or forked", async () => {
    const assessment = buildBaziPreliminaryAssessment(revision), root = note(buildStructuredReadingFeedback(assessment, draft)), source = readingFeedbackSource(assessment);
    const first = note(await buildReadingFeedbackReview(root, null, source, reviewDraft), true);
    const corrupt = { ...first, body: first.body + "新增正文但未保持结构" };
    const corruptedThread = await readFeedbackThread(root, [corrupt]);
    expect(corruptedThread.canAppend).toBe(false); expect(corruptedThread.latest).toBeNull(); expect(corruptedThread.issues.join()).toContain("格式已变化");
    expect((await readFeedbackThread({ ...root, editVersion: 2, body: root.body + "编辑" }, [first])).canAppend).toBe(false);
    const second = note(await buildReadingFeedbackReview(root, first, source, reviewDraft), true);
    expect((await readFeedbackThread(root, [second])).canAppend).toBe(false);
    const parallel = note(await buildReadingFeedbackReview(root, null, source, reviewDraft), true);
    const fork = await readFeedbackThread(root, [first, parallel]);
    expect(fork.canAppend).toBe(false); expect(fork.latest).toBeNull(); expect(fork.issues.join()).toContain("并行");
    const anotherCase = { ...first, caseId: crypto.randomUUID() };
    expect((await readFeedbackThread(root, [anotherCase])).canAppend).toBe(false);
    await expect(buildReadingFeedbackReview(root, anotherCase, source, reviewDraft)).rejects.toThrow("前序复核");
  });
});
