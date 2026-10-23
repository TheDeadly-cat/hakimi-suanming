import "fake-indexeddb/auto";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { CaseRepository, ResearchDatabase, ResearchRepository, researchRepository } from "@hakimi/storage";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { packReadingSnapshot, READING_SNAPSHOT_ENVELOPE } from "../lib/local-reading-snapshot-codec";
import { ResearchJournal } from "./research-journal";
import { resetResearchJournalMutationCoordinatorForTests } from "./research-journal-mutation-coordinator";
import { LOCAL_READING_CASE_REVIEW_TAG } from "../lib/reading-case-review";

describe("research journal complete reading records", () => {
  it("reads a packed snapshot without offering its envelope to the ordinary editor, while ordinary notes remain editable", async () => {
    const database = new ResearchDatabase(`journal-packed-reading-${crypto.randomUUID()}`, { targetSchema: 13, releaseWritesLocked: false });
    let unmount = () => {};
    resetResearchJournalMutationCoordinatorForTests();
    try {
      const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26",
        timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
        location: { label: "合成阅读管理", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
      const bundle = await new CaseRepository(database).createCase({ alias: "合成阅读管理", calculated: chart });
      const revision = bundle.revisions[0]!, repository = new ResearchRepository(database);
      const plain = "# 合成长篇解读\n" + "完整结论、规则、条件与依据保持。\n".repeat(15_000);
      const body = await packReadingSnapshot(plain);
      const snapshot = await repository.createResearchNote({ caseId: revision.caseId, anchor: { kind: "revision", revisionId: revision.id },
        body, tags: ["本地解读快照"], sourceRefs: [], lifecycle: "active" });
      await repository.createResearchNote({ caseId: revision.caseId, anchor: { kind: "revision", revisionId: revision.id },
        body: "普通研究笔记可编辑", tags: [], sourceRefs: [], lifecycle: "active" });
      const taggedReview = await repository.createResearchNote({ caseId: revision.caseId, anchor: { kind: "revision", revisionId: revision.id },
        body: "迁入的复盘原文，只能另行追加更正。", tags: [LOCAL_READING_CASE_REVIEW_TAG], sourceRefs: [], lifecycle: "active" });
      const markerReview = await repository.createResearchNote({ caseId: revision.caseId, anchor: { kind: "revision", revisionId: revision.id },
        body: "<!-- hakimi.reading-case-review/99\n{}\n-->\n\n尚不支持的历史复盘格式。", tags: [], sourceRefs: [], lifecycle: "active" });
      vi.spyOn(researchRepository, "readResearchJournalSnapshot").mockImplementation((...args) => repository.readResearchJournalSnapshot(...args));
      const update = vi.spyOn(researchRepository, "updateResearchNote").mockImplementation((...args) => repository.updateResearchNote(...args));
      const view = render(<ResearchJournal caseId={revision.caseId} revision={revision} selection={{ pillar: "day", field: "stem" }} />);
      unmount = view.unmount;
      const packedArticle = (await screen.findByText("本地解读快照", { exact: true })).closest("article")!;
      expect(within(packedArticle).queryByRole("button", { name: "编辑笔记" })).toBeNull();
      expect(within(packedArticle).getByRole("button", { name: "归档笔记" })).toBeTruthy();
      expect(packedArticle.textContent?.includes(READING_SNAPSHOT_ENVELOPE)).toBe(false);
      await userEvent.click(within(packedArticle).getByText("解读快照", { exact: true }));
      await waitFor(() => expect(packedArticle.querySelector("pre")?.textContent === plain).toBe(true));
      for (const original of [taggedReview, markerReview]) {
        const reviewArticle = [...view.container.querySelectorAll("pre")].find(element => element.textContent === original.body)!.closest("article")!;
        expect(within(reviewArticle).queryByRole("button", { name: "编辑笔记" })).toBeNull();
        expect(reviewArticle.textContent).toContain("围绕原结论追加一条记录");
        expect(within(reviewArticle).getByRole("button", { name: "归档笔记" })).toBeTruthy();
      }
      const ordinaryArticle = screen.getByText("普通研究笔记可编辑", { exact: true }).closest("article")!;
      await userEvent.click(within(ordinaryArticle).getByRole("button", { name: "编辑笔记" }));
      expect((screen.getByRole("textbox", { name: /Markdown 笔记/ }) as HTMLTextAreaElement).value).toBe("普通研究笔记可编辑");
      expect(Array.from(view.container.querySelectorAll("textarea")).some((field) => field.value.includes(READING_SNAPSHOT_ENVELOPE))).toBe(false);
      expect(update).not.toHaveBeenCalled();
      expect((await repository.listResearchNotesByCase(revision.caseId)).find((item) => item.id === snapshot.id)?.body).toBe(body);
    } finally {
      unmount(); vi.restoreAllMocks(); resetResearchJournalMutationCoordinatorForTests(); await database.delete();
    }
  });
});
