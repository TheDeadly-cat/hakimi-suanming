import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ResearchNoteRecord } from "@hakimi/contracts";
import { storedRevisionRecordSchema, researchNoteRecordSchema } from "@hakimi/contracts";
import { calculateChart } from "@hakimi/bazi-core";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { buildLocalReadingReport } from "../lib/local-reading-edition";
import { buildLocalPersonalReading } from "../lib/local-personal-reading";
import { buildStructuredReadingFeedback, buildReadingFeedbackReview, readingFeedbackSource } from "../lib/local-reading-feedback";
import * as codec from "../lib/local-reading-snapshot-codec";
import * as reportBundle from "../lib/local-reading-report-bundle";
import { ReadingSavedRecord } from "./reading-saved-record";
import { ReadingReportText } from "./reading-report-text";

function note(body: string): ResearchNoteRecord {
  return { schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222", anchor: { kind: "case" },
    bodyFormat: "markdown", body, tags: ["本地解读快照"], sourceRefs: [], lifecycle: "active", editVersion: 1,
    createdAt: "2026-10-16T00:00:00.000Z", updatedAt: "2026-10-16T00:00:00.000Z" };
}
function deferred() {
  let resolve!: (value: string) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<string>((accept, deny) => { resolve = accept; reject = deny; });
  return { promise, resolve, reject };
}
async function toggle(container: HTMLElement) {
  await userEvent.click(container.querySelector("summary")!);
}
afterEach(() => vi.restoreAllMocks());

describe("saved reading text publication", () => {
  it("scrolls chapter and condition targets only inside their reader while focus never scrolls the page", () => {
    render(<ReadingReportText text={"# 通读稿\n\n## 一、整盘主线\n正文[注1](#reading-condition-1)。\n\n## 二、命局九章详读\n另一章。\n\n## 适用条件注释\n以下条件均保留原文，同一句只记录一次；每条列明本稿中引用它的范围。\n\n### 注1\n原条件。"} />);
    const reader = screen.getByRole("article", { name: "已保存的通读报告" });
    const scroll = vi.fn(), pageScroll = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    Object.defineProperty(reader, "scrollTo", { configurable: true, value: scroll });
    Object.defineProperty(reader, "scrollTop", { configurable: true, writable: true, value: 70 });
    Object.defineProperty(reader, "clientTop", { configurable: true, value: 2 });
    vi.spyOn(reader, "getBoundingClientRect").mockReturnValue({ top: 200 } as DOMRect);
    for (const name of ["二、命局九章详读", "注1"]) {
      const target = screen.getByRole("heading", { name }), outerScroll = vi.fn();
      Object.defineProperty(target, "scrollIntoView", { configurable: true, value: outerScroll });
      vi.spyOn(target, "getBoundingClientRect").mockReturnValue({ top: 450 } as DOMRect);
      const focus = vi.spyOn(target, "focus");
      fireEvent.click(screen.getByRole("link", { name }));
      expect(scroll).toHaveBeenLastCalledWith({ top: 302 });
      expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
      expect(outerScroll).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(target);
    }
    expect(pageScroll).not.toHaveBeenCalled();
  });
  it("renders the real formatter's adopted fenced text literally and navigates only its generated chapters and notes", async () => {
    const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-05-18", time: "08:26", timePrecision: "exact_minute",
      sex: "male", timeZone: "Asia/Shanghai", lunarLeapMonth: false, location: { label: "Synthetic saved reader", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
    const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
    const assessment = buildBaziPreliminaryAssessment(revision), comprehensive = buildBaziComprehensiveReading(revision, assessment);
    const chapter = comprehensive.chapters.find(item => item.id === "career")!;
    const choice = { id: `chapter-${chapter.id}`, label: chapter.title, originalConclusion: `${chapter.title} · ${chapter.headline}\n${chapter.verdict}\n${chapter.paragraphs.join("\n")}\n综合解读规则：${comprehensive.version}`, sourceVersions: [comprehensive.version] };
    const personalText = '本人完整原文\n## 四、已读年份与具体生活事项\n### 注1\n{"evidence":"不可当技术数据清理"}\n[注1](#reading-condition-1)\n````\n最后一行完整保留。';
    const root = researchNoteRecordSchema.parse({ schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: revision.caseId, anchor: { kind: "revision", revisionId: revision.id }, bodyFormat: "markdown",
      body: buildStructuredReadingFeedback(assessment, { subjectId: choice.id, subjectLabel: choice.label, sourceVersions: choice.sourceVersions, originalConclusion: choice.originalConclusion, rating: "unverified", actualSituation: "仅合成验证" }),
      tags: ["解读反馈"], sourceRefs: [], lifecycle: "active", editVersion: 1, createdAt: "2026-10-16T00:00:00Z", updatedAt: "2026-10-16T00:00:00Z" });
    const review = researchNoteRecordSchema.parse({ ...root, id: crypto.randomUUID(), tags: ["解读反馈复核"],
      body: await buildReadingFeedbackReview(root, null, readingFeedbackSource(assessment, choice.sourceVersions), { state: "revised", notes: "仅合成采用", revisedConclusion: personalText, occurredAt: "测试" }),
      createdAt: "2026-10-16T00:01:00Z", updatedAt: "2026-10-16T00:01:00Z" });
    const personalReading = await buildLocalPersonalReading({ revision, assessment, choices: [choice], records: [root, review] });
    const report = buildLocalReadingReport(assessment, null, { sourceRevision: revision, comprehensive, personalReading });
    expect(report.reading).toContain(`\x60\x60\x60\x60\x60text\n${personalText}\n\x60\x60\x60\x60\x60`);
    const encoded = await reportBundle.encodeReadingReportBundle(report), record = note(await codec.packReadingSnapshot(encoded));
    const before = JSON.stringify(record), view = render(<ReadingSavedRecord record={record} />);
    await toggle(view.container);
    const article = await screen.findByRole("article", { name: "已保存的通读报告" });
    expect(screen.getByLabelText("已采用个人原文").textContent).toBe(personalText);
    expect(screen.getByLabelText("已采用个人原文").querySelector("a,h2,h3,h4,h5,h6")).toBeNull();
    const navigation = screen.getByRole("navigation", { name: "通读报告章节" });
    expect(navigation.querySelectorAll("a")).toHaveLength(7);
    expect(screen.getAllByRole("heading", { name: "四、已读年份与具体生活事项" })).toHaveLength(1);
    await userEvent.click([...navigation.querySelectorAll("a")].find(item => item.textContent === "四、已读年份与具体生活事项")!);
    expect(document.activeElement?.textContent).toBe("四、已读年份与具体生活事项");
    const noteLink = [...article.querySelectorAll("a")].find(item => item.textContent === "注1")!;
    expect(noteLink).toBeTruthy();
    const conditionDetails = noteLink.closest("details")!;
    expect(conditionDetails.open).toBe(false);
    expect(conditionDetails.querySelector("summary")?.textContent).toMatch(/^本段适用条件（\d+条注释）$/u);
    await userEvent.click(conditionDetails.querySelector("summary")!);
    expect(conditionDetails.open).toBe(true);
    await userEvent.click(noteLink);
    expect(document.activeElement?.textContent).toBe("注1");
    expect(document.activeElement?.nextElementSibling?.textContent).toContain("适用范围：");
    expect(await reportBundle.decodeReadingReportBundle(await codec.unpackReadingSnapshot(record.body))).toEqual(report);
    expect(JSON.stringify(record)).toBe(before);
  }, 20000);
  it("renders only internal generated condition links, scoped to this report, without interpreting personal HTML or external protocols", async () => {
    const text = "# 通读报告\n\n## 本人原文\n### 注1\n本人文字仍保留。<img src=x onerror=alert(1)>\n[危险](javascript:alert(1))\n\n- 第一项\n- 第二项\n\n本段[注1](#reading-condition-1)。\n\n## 适用条件注释\n以下条件均保留原文，同一句只记录一次；每条列明本稿中引用它的范围。\n\n### 注1\n原条件完整内容。\n\n## 原文与来源\n版本仍在。";
    const view = render(<><ReadingReportText text={text} /><ReadingReportText text={text} /></>);
    const links = screen.getAllByRole("link", { name: "注1" });
    expect(links).toHaveLength(2);
    expect(links[0]!.getAttribute("href")).not.toBe(links[1]!.getAttribute("href"));
    expect(view.container.querySelector("img")).toBeNull();
    expect(view.container.querySelector('a[href^="javascript"]')).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    await userEvent.click(links[0]!);
    expect(document.activeElement?.textContent).toBe("注1");
    expect(document.activeElement?.nextElementSibling?.textContent).toContain("原条件完整内容");
    expect(view.container.textContent).toContain("本人文字仍保留");
  });
  it("opens the saved reading edition by default, renders text safely, and keeps its complete archive separately available", async () => {
    const report = { reading: "# 我的通读报告\n\n## 主要结论\n原结论完整保留。\n<script>alert(1)</script>\n- 第一项\n- 最后一项🌿",
      archive: "# 完整依据档案\n" + "旧计算及条件全部保留。\n".repeat(22_000), version: "edition/1" };
    const record = note(await codec.packReadingSnapshot(await reportBundle.encodeReadingReportBundle(report)));
    const before = JSON.stringify(record);
    const view = render(<ReadingSavedRecord record={record} />);
    await toggle(view.container);
    await screen.findByRole("article", { name: "已保存的通读报告" });
    expect(screen.getByRole("heading", { name: "主要结论" })).toBeTruthy();
    expect(view.container.textContent).toContain("最后一项🌿");
    expect(view.container.querySelector("script")).toBeNull();
    expect(screen.queryByLabelText("已保存完整档案全文")).toBeNull();
    await userEvent.click(screen.getByText("查看已保存的完整档案"));
    await waitFor(() => expect(screen.getByLabelText("已保存完整档案全文").textContent).toBe(report.archive));
    await toggle(view.container);
    await toggle(view.container);
    expect(screen.getByRole("article", { name: "已保存的通读报告" }).textContent).toContain("原结论完整保留");
    expect(JSON.stringify(record)).toBe(before);
  });

  it("does not show or export a damaged recognized bundle as ordinary text", async () => {
    const encoded = await reportBundle.encodeReadingReportBundle({ reading: "# 阅读稿", archive: "原始档案", version: "edition/1" });
    const record = note(encoded.replace("原始档案", "错误档案")), before = JSON.stringify(record);
    const view = render(<ReadingSavedRecord record={record} />);
    await toggle(view.container);
    await screen.findByRole("alert");
    expect(screen.queryByRole("button", { name: /导出/ })).toBeNull();
    expect(screen.queryByRole("article")).toBeNull();
    expect(view.container.querySelector("pre")).toBeNull();
    expect(JSON.stringify(record)).toBe(before);
  });

  it.each(["success", "error"] as const)("does not publish late bundle %s after switching the saved body", async outcome => {
    let resolve!: (value: reportBundle.ReadingReportBundle) => void;
    let reject!: (reason: unknown) => void;
    const pending = new Promise<reportBundle.ReadingReportBundle>((yes, no) => { resolve = yes; reject = no; });
    const oldBody = `${reportBundle.READING_REPORT_BUNDLE_MARKER}\nold`;
    vi.spyOn(reportBundle, "decodeReadingReportBundle").mockImplementation(() => pending);
    const view = render(<ReadingSavedRecord record={note(oldBody)} />);
    await toggle(view.container);
    await waitFor(() => expect(reportBundle.decodeReadingReportBundle).toHaveBeenCalledWith(oldBody));
    view.rerender(<ReadingSavedRecord record={note("当前旧式原文 B")} />);
    await act(async () => {
      if (outcome === "success") resolve({ reading: "旧报告 A", archive: "旧档案 A", version: "edition/1" });
      else reject(new Error("旧报告错误 A"));
      await pending.catch(() => undefined);
    });
    expect(view.container.querySelector("pre")?.textContent).toBe("当前旧式原文 B");
    expect(view.container.textContent).not.toContain("旧报告");
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("keeps legacy plain text and feedback literal without passing them through decompression", async () => {
    const record = note("# 历史原文\r\n原结论与反馈保持原样。\n<script>literal only</script>");
    record.tags = ["解读反馈"];
    const original = JSON.stringify(record);
    const decode = vi.spyOn(codec, "unpackReadingSnapshot");
    const { container } = render(<ReadingSavedRecord record={record} />);
    await toggle(container);
    expect(container.querySelector("pre")?.textContent).toBe(record.body);
    expect(container.querySelector("script")).toBeNull();
    expect(decode).not.toHaveBeenCalled();
    expect(JSON.stringify(record)).toBe(original);
  });

  it("opens and reopens every character of a real long encoded report without changing its stored body", async () => {
    const text = "# 合成完整解读\n" + "结构、调候与岁运🌿\n每项条件、原始依据与版本完整保留。\n".repeat(9_000);
    const body = await codec.packReadingSnapshot(text);
    expect(text.length).toBeGreaterThan(200_000);
    expect(codec.isPackedReadingSnapshot(body)).toBe(true);
    const record = note(body), before = JSON.stringify(record);
    const { container } = render(<ReadingSavedRecord record={record} />);
    expect(container.querySelector("pre")).toBeNull();
    await toggle(container);
    await waitFor(() => expect(container.querySelector("pre")?.textContent === text).toBe(true));
    await toggle(container);
    expect(container.querySelector("details")!.open).toBe(false);
    await toggle(container);
    expect(container.querySelector("details")!.open).toBe(true);
    expect(container.querySelector("pre")?.textContent === text).toBe(true);
    expect(JSON.stringify(record)).toBe(before);
  });

  it("reports a broken envelope without mutating it and clears that error when the same record gets plain text", async () => {
    const record = note(`${codec.READING_SNAPSHOT_ENVELOPE}\n{"broken":true}`), before = JSON.stringify(record);
    const { container, rerender } = render(<ReadingSavedRecord record={record} />);
    await toggle(container);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("原记录仍保留"));
    expect(container.querySelector("pre")).toBeNull();
    expect(JSON.stringify(record)).toBe(before);
    rerender(<ReadingSavedRecord record={{ ...record, body: "更新后的普通正文" }} />);
    expect(container.querySelector("pre")?.textContent).toBe("更新后的普通正文");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it.each(["success", "error"] as const)("does not publish a late %s for an older body after the current body is opened", async (outcome) => {
    const older = deferred(), current = deferred();
    const oldBody = `${codec.READING_SNAPSHOT_ENVELOPE}\nsynthetic-deferred-A`;
    const newBody = `${codec.READING_SNAPSHOT_ENVELOPE}\nsynthetic-deferred-B`;
    const decode = vi.spyOn(codec, "unpackReadingSnapshot").mockImplementation((body) => body === oldBody ? older.promise : current.promise);
    const record = note(oldBody), before = JSON.stringify(record);
    const { container, rerender } = render(<ReadingSavedRecord record={record} />);
    await toggle(container);
    await waitFor(() => expect(decode).toHaveBeenCalledWith(oldBody));
    rerender(<ReadingSavedRecord record={{ ...record, body: newBody, editVersion: 2 }} />);
    await waitFor(() => expect(decode).toHaveBeenCalledWith(newBody));
    await act(async () => { current.resolve("当前正文 B"); await current.promise; });
    expect(container.querySelector("pre")?.textContent).toBe("当前正文 B");
    await act(async () => {
      if (outcome === "success") older.resolve("旧正文 A");
      else older.reject(new Error("旧正文 A 的迟到错误"));
      await older.promise.catch(() => undefined);
    });
    expect(container.querySelector("pre")?.textContent).toBe("当前正文 B");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(container.textContent).not.toContain("旧正文 A");
    expect(JSON.stringify(record)).toBe(before);
  });
});
