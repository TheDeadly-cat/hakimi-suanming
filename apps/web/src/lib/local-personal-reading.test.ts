import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type ResearchNoteRecord, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment, type BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildReadingFeedbackChoices, buildStructuredReadingFeedback, buildReadingFeedbackReview, readingFeedbackSource,
  LOCAL_READING_REVIEW_TAG, READING_FEEDBACK_FORMAT, type FeedbackReviewState, type ReadingFeedbackChoice } from "./local-reading-feedback";
import { buildLocalPersonalReading, LOCAL_PERSONAL_READING_VERSION } from "./local-personal-reading";

let revision: RevisionRecord, assessment: BaziPreliminaryAssessment, choice: ReadingFeedbackChoice;
beforeAll(async () => {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26",
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
    location: { label: "Synthetic personal reading", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00.000Z" });
  assessment = buildBaziPreliminaryAssessment(revision);
  choice = buildReadingFeedbackChoices(assessment, null, []).find((item) => item.id.startsWith("preliminary-"))!;
});
const instant = (minute: number) => new Date(Date.UTC(2026, 9, 16, 1, minute)).toISOString();
function note(body: string, minute: number, review = false): ResearchNoteRecord {
  return { schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: revision.caseId, anchor: { kind: "revision", revisionId: revision.id },
    bodyFormat: "markdown", body, tags: ["解读反馈", ...(review ? [LOCAL_READING_REVIEW_TAG] : [])], sourceRefs: [], lifecycle: "active", editVersion: 1,
    createdAt: instant(minute), updatedAt: instant(minute) };
}
function feedback(minute = 0, changedChoice: ReadingFeedbackChoice = choice, changedAssessment = assessment) {
  return note(buildStructuredReadingFeedback(changedAssessment, { subjectId: changedChoice.id, subjectLabel: changedChoice.label,
    originalConclusion: changedChoice.originalConclusion, ...(changedChoice.sourceVersions ? { sourceVersions: changedChoice.sourceVersions } : {}),
    rating: "partial", aspect: "实际推进顺序不同", occurredAt: "2024—2025", actualSituation: "先完成学习，之后才逐步承担具体任务。", requestedRevision: "希望以学习积累作为这一段的起点。" }), minute);
}
async function review(root: ResearchNoteRecord, previous: ResearchNoteRecord | null, state: FeedbackReviewState, minute: number, text = "按个人经历，这一段先学习，再逐步承担明确任务。", occurredAt = "2024—2025") {
  return note(await buildReadingFeedbackReview(root, previous, readingFeedbackSource(assessment, choice.sourceVersions),
    { state, notes: "已对照实际阶段与承担范围。", revisedConclusion: state === "revised" ? text : "", occurredAt }), minute, true);
}
const read = (records: readonly ResearchNoteRecord[], currentChoices: readonly ReadingFeedbackChoice[] = [choice]) => buildLocalPersonalReading({ revision, assessment, choices: currentChoices, records });

describe("personal reading from explicit, current-source user review actions", () => {
  it("does not manufacture empty entries and returns serializable source identities", async () => {
    const result = await read([]);
    expect(result.entries).toEqual([]); expect(result.issues).toEqual([]);
    expect(result.sourceVersions).toEqual(expect.arrayContaining([LOCAL_PERSONAL_READING_VERSION, READING_FEEDBACK_FORMAT, assessment.version]));
    expect(result.sourceBinding).toEqual({ caseId: revision.caseId, revisionId: revision.id, chartResultHash: revision.manifest.resultHash, includeHour: true });
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });
  it("keeps real feedback and requested text visible without treating a proposal as adopted", async () => {
    const root = feedback(), result = await read([root]), entry = result.entries[0]!;
    expect(entry.state).toBe("feedback_only"); expect(entry.personalText).toBeNull();
    expect(entry.effectiveConclusion).toBe(choice.originalConclusion);
    expect(entry.feedback[0]).toMatchObject({ actualSituation: "先完成学习，之后才逐步承担具体任务。", requestedRevision: "希望以学习积累作为这一段的起点。", rating: "partial", reviewState: null, canReview: true });
    expect(entry.feedback[0]!.rootRef).toMatchObject({ noteId: root.id, editVersion: 1, createdAt: root.createdAt });
    expect(entry.feedback[0]!.rootRef.bodySha256).toMatch(/^[a-f0-9]{64}$/);
  });
  it("adopts a valid latest personal review and leaves the actual chart, assessment and records byte-for-byte unchanged", async () => {
    const root = feedback(), revised = await review(root, null, "revised", 1), records = [root, revised];
    const before = JSON.stringify({ revision, assessment, choice, records });
    const result = await read(records), entry = result.entries[0]!;
    expect(entry.state).toBe("adopted"); expect(entry.personalText).toContain("先学习");
    expect(entry.effectiveConclusion).toBe(entry.personalText);
    expect(entry.originalConclusion).toBe(choice.originalConclusion);
    expect(entry.selectedReviewRefs.map((item) => item.noteId)).toEqual([revised.id]);
    expect(entry.feedback[0]!.source.readingVersions).toEqual(choice.sourceVersions);
    expect(JSON.stringify({ revision, assessment, choice, records })).toBe(before);
    expect(await read([revised, root])).toEqual(result);
  });
  it("retained and needs_more each stop using an earlier revised text without searching backwards", async () => {
    const root = feedback(), revised = await review(root, null, "revised", 1);
    for (const state of ["retained", "needs_more"] as const) {
      const latest = await review(root, revised, state, 2), entry = (await read([root, revised, latest])).entries[0]!;
      expect(entry.state).toBe(state); expect(entry.personalText).toBeNull(); expect(entry.effectiveConclusion).toBe(choice.originalConclusion);
      expect(entry.selectedReviewRefs[0]!.noteId).toBe(latest.id);
      expect(entry.feedback[0]!.latestReviewRef?.noteId).toBe(latest.id);
    }
  });
  it("a newer unreviewed root does not replace an adopted text; the latest explicit cross-root action does", async () => {
    const firstRoot = feedback(), first = await review(firstRoot, null, "revised", 1), newRoot = feedback(5);
    expect((await read([newRoot, firstRoot, first])).entries[0]!.personalText).toContain("先学习");
    const next = await review(newRoot, null, "revised", 6, "个人补充：学习与实践其实并行。");
    expect((await read([firstRoot, first, newRoot, next])).entries[0]!.personalText).toBe("个人补充：学习与实践其实并行。");
    const thirdRoot = feedback(7), restore = await review(thirdRoot, null, "retained", 8);
    const restored = (await read([next, firstRoot, restore, thirdRoot, first, newRoot])).entries[0]!;
    expect(restored.state).toBe("retained"); expect(restored.personalText).toBeNull();
    const more = await review(thirdRoot, restore, "needs_more", 9);
    expect((await read([firstRoot, first, newRoot, next, thirdRoot, restore, more])).entries[0]!.state).toBe("needs_more");
  });
  it("competing actions at exactly the same recorded instant conflict, while identical choices retain both provenances", async () => {
    const a = feedback(), b = feedback(), ar = await review(a, null, "revised", 1, "个人文本甲。"), br = await review(b, null, "revised", 1, "个人文本乙。");
    const conflict = (await read([a, ar, b, br])).entries[0]!;
    expect(conflict.state).toBe("conflict"); expect(conflict.personalText).toBeNull(); expect(conflict.feedback).toHaveLength(2);
    expect(conflict.issues.join()).toContain("同一记录时刻");
    const same = await review(b, null, "revised", 1, "个人文本甲。");
    const accepted = (await read([a, ar, b, same])).entries[0]!;
    expect(accepted.personalText).toBe("个人文本甲。"); expect(accepted.selectedReviewRefs).toHaveLength(2);
    const restore = await review(b, null, "retained", 1);
    expect((await read([a, ar, b, restore])).entries[0]!.state).toBe("conflict");
  });
  it("a bad current-source chain prevents choosing a competing valid chain or rolling back to an old review", async () => {
    const root = feedback(), first = await review(root, null, "revised", 1), last = await review(root, first, "needs_more", 2);
    const other = feedback(), accepted = await review(other, null, "revised", 3, "另一条链个人文本。");
    for (const broken of [[root, first, { ...last, body: last.body + "原文被编辑" }], [root, last], [root, first, await review(root, null, "revised", 2)]]) {
      const result = await read([...broken, other, accepted]);
      expect(result.entries[0]!.state).toBe("conflict"); expect(result.entries[0]!.personalText).toBeNull();
      expect(result.entries[0]!.issues.length).toBeGreaterThan(0);
    }
  });
  it("keeps old versions, old text, another case/chart/hour and unloaded subjects out of current personal text", async () => {
    const roots = [feedback(0, { ...choice, sourceVersions: ["old-reading/0.0"] }), feedback(0, { ...choice, originalConclusion: choice.originalConclusion + "旧文字" }),
      feedback(0, { ...choice, id: "unloaded-subject" }), { ...feedback(), caseId: crypto.randomUUID() }];
    for (const change of [{ version: "old-assessment/0.0" }, { sourceBinding: { ...assessment.sourceBinding, chartResultHash: "a".repeat(64) } }, { sourceBinding: { ...assessment.sourceBinding, includeHour: false } }]) {
      roots.push(feedback(0, choice, { ...assessment, ...change } as BaziPreliminaryAssessment));
    }
    const result = await read(roots);
    expect(result.entries).toEqual([]); expect(result.issues).toHaveLength(roots.length);
    for (const root of roots) expect(result.issues.join()).toContain(root.id);
    const altered = { ...assessment, sourceBinding: { ...assessment.sourceBinding, includeHour: false } };
    await expect(buildLocalPersonalReading({ revision, assessment: altered, choices: [choice], records: [] })).rejects.toThrow("绑定不一致");
  });
  it("does not adopt an otherwise valid personal review of legacy text without current content identity", async () => {
    const root = note("# 解读反馈\n历史原文与实际补充。", 0), revised = await review(root, null, "revised", 1);
    const result = await read([root, revised]);
    expect(result.entries).toEqual([]); expect(result.issues.join()).toContain(root.id);
  });
  it("uses recorded action time rather than experience time or an edited root's timestamp", async () => {
    const a = feedback(), b = feedback(), ar = await review(a, null, "revised", 2, "较早明确采用。", "2099 年"), br = await review(b, null, "revised", 3, "较晚明确采用。", "1999 年");
    a.updatedAt = instant(50);
    const result = await read([a, ar, b, br]);
    expect(result.entries[0]!.personalText).toBe("较晚明确采用。");
    const reversedTime = { ...br, createdAt: instant(-1), updatedAt: instant(-1) };
    expect((await read([a, ar, b, reversedTime])).entries[0]!.state).toBe("conflict");
  });
  it("does not choose duplicate identities, ambiguous current choices or an archived latest action", async () => {
    const root = feedback(), revised = await review(root, null, "revised", 1);
    const duplicate = { ...revised, editVersion: 2 };
    expect((await read([root, revised, duplicate])).entries[0]!.state).toBe("conflict");
    const unloaded = feedback(0, { ...choice, id: "not-currently-loaded" }), foreignLink = await review(unloaded, null, "revised", 2);
    const currentLink = { ...await review(root, revised, "revised", 3), id: foreignLink.id };
    // The first duplicate may point to an unloaded subject. Its other exact
    // envelope still identifies the current chain; array order cannot hide it.
    expect((await read([root, revised, unloaded, foreignLink, currentLink])).entries[0]!.state).toBe("conflict");
    expect((await read([root, revised], [choice, { ...choice, originalConclusion: "另一段同id原文。" }])).entries[0]!.state).toBe("conflict");
    expect((await read([root, { ...revised, lifecycle: "archived" }])).entries[0]!.state).toBe("conflict");
    expect((await read([{ ...root, lifecycle: "archived" }, revised])).entries).toEqual([]);
  });
});
