import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { storedRevisionRecordSchema, type ResearchNoteRecord, type RevisionRecord } from "@hakimi/contracts";
import { buildBaziPreliminaryAssessment, type BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { LOCAL_PERSONAL_READING_VERSION, type LocalPersonalReading, type LocalPersonalReadingEntry } from "../lib/local-personal-reading";
import { buildReadingFeedbackReview, buildStructuredReadingFeedback, LOCAL_READING_REVIEW_TAG, parseReadingFeedback, readingFeedbackSource, readFeedbackThread, type ReadingFeedbackReviewDraft } from "../lib/local-reading-feedback";
import { PersonalReadingNote, PersonalReadingOverview, PersonalReadingProvider, PersonalReadingScope } from "./personal-reading-note";
import { ReadingFeedbackReview } from "./reading-feedback-review";

let revision: RevisionRecord, assessment: BaziPreliminaryAssessment;
beforeAll(async () => {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26", timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
    location: { label: "Synthetic personal reading", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111", caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00.000Z" });
  assessment = buildBaziPreliminaryAssessment(revision);
});
const original = "原计算：这一阶段重视表达与持续交付。";
const proposal = "我的实际情况是先完成学习，再逐步接手项目。";
function entry(state: LocalPersonalReadingEntry["state"] = "feedback_only"): LocalPersonalReadingEntry {
  const revised = state === "adopted";
  return { subjectId: "chapter-career", subjectLabel: "事业", originalConclusion: original, readingVersions: ["test-reading/1"], state,
    personalText: revised ? proposal : null, effectiveConclusion: revised ? proposal : original, selectedReviewRefs: [], issues: [],
    feedback: [{ rootRef: { noteId: "33333333-3333-4333-8333-333333333333", editVersion: 1, bodySha256: "a".repeat(64), createdAt: "2026-10-16T00:00:00.000Z" },
      latestReviewRef: revised ? { noteId: "44444444-4444-4444-8444-444444444444", editVersion: 1, bodySha256: "b".repeat(64), createdAt: "2026-10-16T01:00:00.000Z" } : null,
      rating: "partial", aspect: "时间与工作范围", occurredAt: "2025 年秋季", actualSituation: "当时仍在学习，项目由同事负责。", requestedRevision: proposal,
      reviewState: revised ? "revised" : null, reviewNotes: revised ? "本人采用上述个人修订。" : null, revisedConclusion: revised ? proposal : null,
      source: readingFeedbackSource(assessment), canReview: true, chainIssues: [] }] };
}
function model(entries: LocalPersonalReadingEntry[], issues: string[] = []): LocalPersonalReading {
  return { version: LOCAL_PERSONAL_READING_VERSION, sourceBinding: { caseId: revision.caseId, revisionId: revision.id, chartResultHash: revision.manifest.resultHash, includeHour: true },
    sourceVersions: [LOCAL_PERSONAL_READING_VERSION], entries, issues };
}
function note(body: string, review = false): ResearchNoteRecord {
  return { schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: revision.caseId, anchor: { kind: "revision", revisionId: revision.id },
    bodyFormat: "markdown", body, tags: ["解读反馈", ...(review ? [LOCAL_READING_REVIEW_TAG] : [])], sourceRefs: [], lifecycle: "active", editVersion: 1,
    createdAt: "2026-10-16T00:00:00.000Z", updatedAt: "2026-10-16T00:00:00.000Z" };
}
function feedbackRoot() {
  return note(buildStructuredReadingFeedback(assessment, { subjectId: "chapter-career", subjectLabel: "事业", originalConclusion: original, sourceVersions: ["test-reading/1"],
    rating: "partial", aspect: "时间与工作范围", occurredAt: "2025 年秋季", actualSituation: "当时仍在学习，项目由同事负责。", requestedRevision: proposal }));
}

describe("personal reading display without changing calculated text", () => {
  it("keeps an unconnected or unmatched scope unchanged", () => {
    const { container, rerender } = render(<PersonalReadingScope subjectId="unmatched"><p>{original}</p></PersonalReadingScope>);
    expect(container.innerHTML).toBe(`<p>${original}</p>`);
    rerender(<PersonalReadingProvider reading={model([entry()])}><PersonalReadingScope subjectId="other"><p>{original}</p></PersonalReadingScope></PersonalReadingProvider>);
    expect(container.innerHTML).toBe(`<p>${original}</p>`);
  });
  it("shows a proposal as unadopted and only delegates explicit adoption of its exact root", async () => {
    const value = entry(), before = JSON.stringify(value), onAdopt = vi.fn().mockResolvedValue(undefined);
    value.feedback[0]!.actualSituation = "<script>个人原文按文本显示</script>";
    render(<PersonalReadingNote entry={value} onAdopt={onAdopt}><p>{original}</p></PersonalReadingNote>);
    expect(screen.getByText(original)).toBeTruthy(); expect(screen.getByText("尚未采用的个人修订建议")).toBeTruthy();
    expect(screen.queryByText("已采用的个人修订")).toBeNull(); expect(onAdopt).not.toHaveBeenCalled();
    expect(document.querySelector("script")).toBeNull();
    const afterInput = JSON.stringify(value);
    await userEvent.click(screen.getByRole("button", { name: "采用这段个人修订" }));
    expect(onAdopt).toHaveBeenCalledExactlyOnceWith(value.feedback[0]!.rootRef.noteId, null);
    expect(screen.getByText(original)).toBeTruthy(); expect(screen.queryByText("已采用的个人修订")).toBeNull();
    expect(JSON.stringify(value)).toBe(afterInput); expect(before).not.toBe(afterInput);
  });
  it("puts adopted personal text first while preserving the original inside an initially closed comparison", async () => {
    const value = entry("adopted"); value.selectedReviewRefs = [value.feedback[0]!.latestReviewRef!];
    const before = JSON.stringify(value);
    render(<PersonalReadingNote entry={value}><p>{original}</p></PersonalReadingNote>);
    expect(screen.getByText(proposal)).toBeTruthy(); expect(screen.getByText("已采用的个人修订")).toBeTruthy();
    expect(screen.getByText(/当前采用你最新的明确复核：/).textContent).toContain("44444444");
    const comparison = screen.getByText("对照原计算解读").closest("details")!;
    expect(comparison.open).toBe(false); expect(within(comparison).getByText(original)).toBeTruthy();
    await userEvent.click(screen.getByText("对照原计算解读")); expect(comparison.open).toBe(true);
    expect(screen.getByText("当时仍在学习，项目由同事负责。")).toBeTruthy();
    expect(JSON.stringify(value)).toBe(before);
  });
  it("labels a verified old adoption and keeps its old original separate from the new automatic comparison", async () => {
    const value = entry("adopted"), feedback = value.feedback[0]!;
    value.selectedReviewRefs = [feedback.latestReviewRef!];
    // This component receives the already verified projection; producer and
    // scope verification is covered by local-personal-reading-legacy.test.ts.
    feedback.legacyReplay = { profileVersion: "hakimi.legacy-annual-reading-profile/event-0.5-prose-0.9/1",
      originalConclusion: "旧版原结论：<script>原字保留</script>", scope: {
        sourceBinding: { caseId: revision.caseId, revisionId: revision.id, chartResultHash: revision.manifest.resultHash, includeHour: true },
        family: "event", year: 2032, branchId: "locked", segmentId: "synthetic-segment", startInstant: "2032-02-04T00:00:00Z",
        endExclusiveInstant: "2033-02-04T00:00:00Z", personalStartInstant: "2032-02-04T00:00:00Z", targetRef: null, backgroundRefs: [],
        contextRef: null, domainId: "career", itemIds: ["synthetic-event"], monthId: null, decadeId: null, stageRef: null, segments: [] } };
    const before = JSON.stringify(value);
    render(<PersonalReadingNote entry={value}><p>{original}</p></PersonalReadingNote>);
    expect(screen.getByText("此前已采用的个人修订（旧版本）")).toBeTruthy();
    expect(screen.getByText(proposal)).toBeTruthy();
    const current = screen.getByText("对照新版自动解读").closest("details")!;
    const old = screen.getByText("这条反馈对应的旧版原结论").closest("details")!;
    expect(current.open).toBe(false); expect(old.open).toBe(false);
    await userEvent.click(screen.getByText("这条反馈对应的旧版原结论"));
    expect(old.open).toBe(true); expect(within(old).getByText(feedback.legacyReplay.originalConclusion)).toBeTruthy();
    expect(within(current).getByText(original)).toBeTruthy(); expect(document.querySelector("script")).toBeNull();
    expect(JSON.stringify(value)).toBe(before);
  });
  it("keeps retained and conflicted readings on the original and refuses an unsafe adoption action", () => {
    const value = entry("retained"); value.feedback[0]!.reviewState = "retained";
    const onAdopt = vi.fn();
    const { rerender } = render(<PersonalReadingNote entry={value} onAdopt={onAdopt}><p>{original}</p></PersonalReadingNote>);
    expect(screen.getByText(original)).toBeTruthy(); expect(screen.queryByRole("button", { name: "采用这段个人修订" })).toBeNull();
    const conflict = entry("conflict"); conflict.issues = ["两条修订无法自动确定先后。"];
    rerender(<PersonalReadingNote entry={conflict} onAdopt={onAdopt}><p>{original}</p></PersonalReadingNote>);
    expect(screen.getByText(original)).toBeTruthy(); expect(screen.queryByRole("button", { name: "采用这段个人修订" })).toBeNull();
    expect(screen.getByText("两条修订无法自动确定先后。").closest("details")!.open).toBe(false);
  });
  it("offers a compact overview including feedback for a currently hidden topic", async () => {
    const current = entry("adopted"), hidden = { ...entry(), subjectId: "old-pillar-topic", subjectLabel: "早年家庭" };
    render(<PersonalReadingProvider reading={model([current, hidden], ["另一旧版本反馈未套用。"])}><PersonalReadingOverview /><PersonalReadingScope subjectId="chapter-career"><p>{original}</p></PersonalReadingScope></PersonalReadingProvider>);
    const overview = screen.getByRole("complementary", { name: "个人阅读补充总览" });
    expect(within(overview).getByText("已按反馈采用 1 项个人修订")).toBeTruthy();
    const details = within(overview).getByText("查看全部个人反馈主题（2）").closest("details")!;
    expect(details.open).toBe(false); await userEvent.click(within(overview).getByText("查看全部个人反馈主题（2）"));
    expect(within(overview).getByRole("heading", { name: "早年家庭" })).toBeTruthy();
    expect(within(overview).getByText("另一旧版本反馈未套用。")).toBeTruthy();
  });
  it("labels issues-only historical records without claiming feedback was applied", async () => {
    const value = model([], ["旧原文与当前版本不同，尚未用于阅读。"]), before = JSON.stringify(value);
    render(<PersonalReadingProvider reading={value}><PersonalReadingOverview /></PersonalReadingProvider>);
    expect(screen.getByText("历史记录待核对")).toBeTruthy();
    expect(screen.queryByText("已保留你的个人反馈与补充")).toBeNull();
    expect(screen.queryByText("查看全部个人反馈主题（0）")).toBeNull();
    await userEvent.click(screen.getByText("查看未用于当前阅读的记录（1）"));
    expect(screen.getByText(value.issues[0]!).closest("details")!.open).toBe(true);
    expect(JSON.stringify(value)).toBe(before);
  });
  it("preserves a specific unknown-write error without claiming adoption succeeded", async () => {
    const onAdopt = vi.fn().mockRejectedValue(new Error("保存结果尚未确认，已停止重复写入。请先到解读记录核对。"));
    render(<PersonalReadingNote entry={entry()} onAdopt={onAdopt}><p>{original}</p></PersonalReadingNote>);
    await userEvent.click(screen.getByRole("button", { name: "采用这段个人修订" }));
    expect((await screen.findByRole("alert")).textContent).toContain("已停止重复写入");
    expect(screen.queryByRole("status")).toBeNull(); expect(screen.getByText(original)).toBeTruthy();
  });
  it("does not publish a late completion after switching to another subject", async () => {
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => { finish = resolve; }), onAdopt = vi.fn(() => pending);
    const { rerender } = render(<PersonalReadingNote entry={entry()} onAdopt={onAdopt}><p>{original}</p></PersonalReadingNote>);
    await userEvent.click(screen.getByRole("button", { name: "采用这段个人修订" }));
    expect(screen.getByRole("button", { name: "正在保存" }).hasAttribute("disabled")).toBe(true);
    const other = { ...entry(), subjectId: "chapter-family", subjectLabel: "家庭", originalConclusion: "另一个主题原结论" };
    rerender(<PersonalReadingNote entry={other} onAdopt={onAdopt}><p>另一个主题原结论</p></PersonalReadingNote>);
    await act(async () => { finish(); await pending; });
    expect(screen.queryByRole("status")).toBeNull(); expect(screen.getByText("另一个主题原结论")).toBeTruthy();
  });
});

describe("explicit adoption and restore on the existing feedback review", () => {
  it("appends adoption and retained restoration using exact prior IDs, preserving every earlier byte", async () => {
    const root = feedbackRoot(), rootBefore = JSON.stringify(root), records = [root];
    const append = vi.fn(async (draft: ReadingFeedbackReviewDraft, expectedLatestId: string | null) => {
      const thread = await readFeedbackThread(root, records);
      expect(expectedLatestId).toBe(thread.latest?.record.id ?? null);
      records.push(note(await buildReadingFeedbackReview(root, thread.latest?.record ?? null, readingFeedbackSource(assessment), draft), true));
    });
    const { rerender } = render(<ReadingFeedbackReview record={root} records={[...records]} onAppendReview={append} onExportThread={() => undefined} />);
    await userEvent.click(await screen.findByRole("button", { name: "采用这段个人修订" }));
    await waitFor(() => expect(records).toHaveLength(2));
    expect(append.mock.calls[0]![0]).toEqual({ state: "revised", notes: "本人选择将原反馈中提出的修订用于本项个人解读；实际情况与具体方面保留在原反馈。", revisedConclusion: proposal, occurredAt: "2025 年秋季" });
    const revisedBefore = JSON.stringify(records[1]);
    rerender(<ReadingFeedbackReview record={root} records={[...records]} onAppendReview={append} onExportThread={() => undefined} />);
    await userEvent.click(await screen.findByRole("button", { name: "恢复原解读" }));
    await waitFor(() => expect(records).toHaveLength(3));
    expect(append.mock.calls[1]![0].state).toBe("retained"); expect(append.mock.calls[1]![0].revisedConclusion).toBe("");
    expect(append.mock.calls[1]![1]).toBe(records[1]!.id);
    const parsed = parseReadingFeedback(records[2]!.body); expect(parsed.kind).toBe("review");
    if (parsed.kind !== "review") throw new Error("expected review");
    expect(parsed.value.previous?.noteId).toBe(records[1]!.id); expect(parsed.value.state).toBe("retained");
    expect(JSON.stringify(root)).toBe(rootBefore); expect(JSON.stringify(records[1])).toBe(revisedBefore);
  });
  it("does not mistake a corrupt last review for a fresh proposal that can be adopted", async () => {
    const root = feedbackRoot(), review = note(await buildReadingFeedbackReview(root, null, readingFeedbackSource(assessment), { state: "revised", notes: "合成复核", revisedConclusion: proposal, occurredAt: "2025" }), true);
    review.body += "改坏正文";
    render(<ReadingFeedbackReview record={root} records={[root, review]} onAppendReview={vi.fn()} onExportThread={() => undefined} />);
    await waitFor(() => expect(screen.getByText("关联待核对")).toBeTruthy());
    expect(screen.queryByRole("button", { name: "采用这段个人修订" })).toBeNull();
    expect(screen.queryByRole("button", { name: "恢复原解读" })).toBeNull();
  });
  it("retains legacy feedback without interpreting text as an adoption request", async () => {
    const root = note("# 历史反馈\n希望如何修订：这段只是旧正文。"), before = root.body;
    render(<ReadingFeedbackReview record={root} records={[root]} onAppendReview={vi.fn()} onExportThread={() => undefined} />);
    await waitFor(() => expect(screen.getByText("待复核")).toBeTruthy());
    expect(screen.queryByRole("button", { name: "采用这段个人修订" })).toBeNull(); expect(root.body).toBe(before);
  });
});
