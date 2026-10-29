import Dexie from "dexie";
import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { CaseRepository, ResearchDatabase, ResearchRepository } from "@hakimi/storage";
import { appendReadingCaseReview, type AppendReadingCaseReviewInput, type ReadingCaseReviewRepository } from "./reading-case-review-storage";
import { emptyReadingCaseReviewDraft, loadReadingCaseReviewTargets, parseReadingCaseReview, readReadingCaseReviewThread } from "./reading-case-review";
import { syntheticIndexedReport, syntheticReviewIndex, syntheticReviewNote } from "../test/reading-case-review-fixture";
import { getResearchJournalMutationSnapshot, resetResearchJournalMutationCoordinatorForTests } from "../components/research-journal-mutation-coordinator";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildStructuredReadingFeedback } from "./local-reading-feedback";

afterEach(() => resetResearchJournalMutationCoordinatorForTests());
async function setup() {
  const report = await syntheticIndexedReport(), target = (await loadReadingCaseReviewTargets(report))[0]!;
  const input: AppendReadingCaseReviewInput = { target, expectedLatest: null, draft: { ...emptyReadingCaseReviewDraft(),
    evaluation: { category: "not_yet_due", notes: "等到结论对应时间，再单独记录事实。" } } };
  return { report, input };
}
describe("case review append through the existing journal boundary", () => {
  it("persists and reloads report → fact/evaluation → correction in real isolated Schema13 storage without changing originals", async () => {
    const database = new ResearchDatabase(`case-review-synthetic-${crypto.randomUUID()}`, { targetSchema: 13, releaseWritesLocked: false });
    let now = "2026-10-24T02:00:00.000Z";
    try {
      const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26", timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
        location: { label: "Synthetic review storage", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "Synthetic only" }, WORKING_DEFAULT_RULE_PROFILE);
      const cases = new CaseRepository(database, () => now), repository = new ResearchRepository(database, () => now);
      const bundle = await cases.createCase({ alias: "合成案例复盘", calculated: chart }), revision = bundle.revisions[0]!;
      const fixture = await syntheticIndexedReport(syntheticReviewIndex({ caseId: revision.caseId, revisionId: revision.id, chartResultHash: revision.manifest.resultHash }));
      const report = await repository.createResearchNote({ caseId: revision.caseId, anchor: fixture.anchor, body: fixture.body, tags: fixture.tags, sourceRefs: [], lifecycle: "active" });
      const reportBefore = JSON.stringify(report), target = (await loadReadingCaseReviewTargets(report))[0]!;
      const feedback = await repository.createResearchNote({ caseId: revision.caseId, anchor: fixture.anchor,
        body: buildStructuredReadingFeedback(buildBaziPreliminaryAssessment(revision), { subjectId: target.conclusion.sourceSubjects[0], subjectLabel: target.conclusion.label,
          originalConclusion: "当时另一版原句\r\n不得改写", actualSituation: "旧反馈原文，并非本次填写的事实。", rating: "partial", aspect: "旧版本评价", occurredAt: "2026 年", requestedRevision: "保留个人原文" }),
        tags: ["解读反馈"], sourceRefs: [], lifecycle: "active" });
      const feedbackBefore = JSON.stringify(feedback);
      now = "2026-10-24T03:00:00.000Z";
      const first = await appendReadingCaseReview({ target, expectedLatest: null, draft: { ...emptyReadingCaseReviewDraft(),
        fact: { occurredAt: "2027 年 7 月", description: "先承担任务，暂未验收。" }, evaluation: { category: "evidence_insufficient", notes: "需要等待验收结果。" }, relatedFeedbackIds: [feedback.id] } }, repository);
      const firstBefore = JSON.stringify(first), notes = await repository.listResearchNotesByCase(revision.caseId, { includeArchived: true });
      const chain = await readReadingCaseReviewThread(target, notes);
      expect(chain.latest?.record.id).toBe(first.id); expect(chain.latest?.record.createdAt).toBe(now);
      expect(chain.latest?.value.relatedFeedback[0]?.body).toBe(feedback.body);
      expect(chain.latest?.value.fact.description).toBe("先承担任务，暂未验收。");
      expect(chain.latest?.value.evaluation.category).toBe("evidence_insufficient");
      now = "2026-10-24T04:00:00.000Z";
      const second = await appendReadingCaseReview({ target, expectedLatest: chain.latest!.ref, draft: { ...emptyReadingCaseReviewDraft(), correctionOf: chain.latest!.ref,
        correctionReason: "更正记忆中的月份。", fact: { occurredAt: "2027 年 8 月", description: "更正：承担任务实际在八月。" }, evaluation: { category: "not_evaluated", notes: "仍未验收，不作符合判断。" } } }, repository);
      const reloaded = await repository.listResearchNotesByCase(revision.caseId, { includeArchived: true });
      expect(reloaded).toHaveLength(4); expect(JSON.stringify(reloaded.find(record => record.id === report.id))).toBe(reportBefore);
      expect(JSON.stringify(reloaded.find(record => record.id === feedback.id))).toBe(feedbackBefore);
      expect(JSON.stringify(reloaded.find(record => record.id === first.id))).toBe(firstBefore);
      const final = await readReadingCaseReviewThread(target, reloaded);
      expect(final.canAppend).toBe(true); expect(final.entries.map(entry => entry.record.id)).toEqual([first.id, second.id]);
      expect(final.latest?.value.target.conclusion.text).toBe(target.conclusion.text);
      expect(getResearchJournalMutationSnapshot().status).toBe("idle");
    } finally { database.close(); await Dexie.delete(database.name); }
  });
  it("rejects a changed report or stale chain before the repository write", async () => {
    const { report, input } = await setup();
    const create = vi.fn(), repository = { listResearchNotesByCase: async () => [{ ...report, editVersion: 2 }], createResearchNote: create };
    await expect(appendReadingCaseReview(input, repository)).rejects.toThrow("原报告已变化"); expect(create).not.toHaveBeenCalled();
    const working: ReadingCaseReviewRepository = { listResearchNotesByCase: async () => [report], createResearchNote: async value => syntheticReviewNote(value.body) };
    const first = await appendReadingCaseReview(input, working);
    await expect(appendReadingCaseReview(input, { listResearchNotesByCase: async () => [report, first], createResearchNote: create })).rejects.toThrow("复盘已有变化");
    expect(create).not.toHaveBeenCalled(); expect(getResearchJournalMutationSnapshot().status).toBe("idle");
  });
  it("captures the original draft before awaiting storage so later UI edits cannot alter the saved entry", async () => {
    const { report, input } = await setup(); let release!: () => void;
    const wait = new Promise<void>(resolve => { release = resolve; });
    const pending = appendReadingCaseReview(input, { listResearchNotesByCase: async () => { await wait; return [report]; }, createResearchNote: async value => syntheticReviewNote(value.body) });
    input.draft.evaluation.notes = "提交之后另改的内容"; input.target.conclusion.text = "不得进入本次保存"; release();
    const saved = parseReadingCaseReview((await pending).body);
    expect(saved.kind).toBe("entry"); if (saved.kind !== "entry") throw new Error();
    expect(saved.value.evaluation.notes).toBe("等到结论对应时间，再单独记录事实。");
    expect(saved.value.target.conclusion.text).not.toBe("不得进入本次保存");
  });
  it("locks an unknown write outcome and refuses duplicate retries", async () => {
    const { report, input } = await setup();
    const create = vi.fn().mockRejectedValue(new Error("unknown commit outcome"));
    const repository = { listResearchNotesByCase: async () => [report], createResearchNote: create };
    await expect(appendReadingCaseReview(input, repository)).rejects.toThrow("保存结果尚未确认");
    expect(getResearchJournalMutationSnapshot()).toMatchObject({ status: "call_unknown", issue: { phase: "call_unknown", targetId: null } });
    await expect(appendReadingCaseReview(input, repository)).rejects.toThrow("等待核对"); expect(create).toHaveBeenCalledTimes(1);
  });
  it("keeps a returned but mismatched record as unreconciled rather than reporting success", async () => {
    const { report, input } = await setup(), wrongId = crypto.randomUUID();
    await expect(appendReadingCaseReview(input, { listResearchNotesByCase: async () => [report], createResearchNote: async value => syntheticReviewNote(value.body + "变更", { id: wrongId }) })).rejects.toThrow("保存结果尚未确认");
    expect(getResearchJournalMutationSnapshot()).toMatchObject({ status: "call_unknown", issue: { phase: "returned_unreconciled", targetId: wrongId } });
  });
});
