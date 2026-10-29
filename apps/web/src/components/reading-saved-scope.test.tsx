import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ResearchNoteRecord } from "@hakimi/contracts";
import { ReadingSavedRecord } from "./reading-saved-record";
import { syntheticReviewIndex, syntheticReviewNote } from "../test/reading-case-review-fixture";
import { LOCAL_READING_SNAPSHOT_TAG } from "../lib/local-reading-record";
import { encodeReadingReportBundle } from "../lib/local-reading-report-bundle";
import { packReadingSnapshot } from "../lib/local-reading-snapshot-codec";
import * as plainModule from "../lib/reading-plain-summary";
import * as monthModule from "../lib/reading-month-preview";
import * as scopedModule from "../lib/scoped-reading-report";
import { loadReadingCaseReviewTargets } from "../lib/reading-case-review";

const createdAt = "2026-10-29T12:00:00.000Z";
const original = "保存时完整原文\r\n原句 🌿 e\u0301\n<script>这里只是原文，不执行</script>";
async function savedScope() {
  const index = syntheticReviewIndex();
  index.sourceSnapshot.includeHour = true;
  index.sourceSnapshot.input = { ...index.sourceSnapshot.input as Record<string, unknown>, time: "11:42", timePrecision: "exact_minute" };
  index.uncertainty.inputPrecision = "exact_minute";
  index.uncertainty.pillarStatus = "not_assessed";
  const source = index.conclusions[0]!;
  const versions = ["hakimi.plain-ten-year-reading/0.4.1", "hakimi.concrete-period-prose/0.4.2", "hakimi.conditional-content-rules/0.1.0"];
  const month = { ...structuredClone(source), stableId: `${index.sourceSnapshot.revisionId}/month:forward:2030:one:wealth`,
    label: "2030立春月 · 收入", domain: "wealth" as const, text: `保存时白话：先核对已有款项\n\n${original}`, sourceVersions: versions,
    scope: { level: "month" as const, year: 2030, branchId: "forward", startInstant: "2030-02-04T00:00:00.000Z", endExclusiveInstant: "2030-03-05T00:00:00.000Z" },
    evidence: { facts: ["该月独立原事实"], ruleApplications: [{ ruleId: "saved-month-rule", title: "保存时的月度规则", decision: "保存时的规则决定",
      support: ["保存时规则支持"], limitations: ["只在实际有约定款项时适用。"], sourceIds: ["saved-rule-only-source"], sourceSubjects: [...source.sourceSubjects] }],
      support: ["该月独立原支持"], limits: ["只在实际有约定款项时适用。"], unknowns: ["实际收款未确认。"], citations: ["saved-month-source"] } };
  index.sourceSnapshot.sourceVersions = versions;
  index.conclusions = [month];
  index.sources = ["saved-month-source", "saved-rule-only-source", "unrelated-month-source"].map(id => ({ id, title: id, url: "https://example.invalid/synthetic",
    locator: "合成来源位置", excerpt: `${id} 保存时的合成原文`, interpretation: "仅合成关联，不是预测证据。" }));
  index.citationBindings = [{ conclusionId: month.stableId, sourceId: "saved-month-source", producerField: "synthetic.month", usageNote: "只属于保存月份" }];
  monthModule.attachReadingMonthHeadline(month, monthModule.bindReadingMonthHeadline({
    key: month.stableId.slice(index.sourceSnapshot.revisionId.length + 1), scope: month.scope, domain: month.domain,
    title: "收入与开支", headline: "保存时白话：先核对已有款项", sourceSubjects: month.sourceSubjects, producerVersion: versions[0]!
  }));
  const report = await scopedModule.buildScopedReadingReport({ index,
    query: { topic: "month", year: 2030, branchId: "forward", monthId: month.stableId },
    reportId: crypto.randomUUID(), saveAttemptId: crypto.randomUUID(), createdAt });
  const body = await packReadingSnapshot(await scopedModule.encodeScopedReadingReport(report));
  const record = syntheticReviewNote(body, { tags: [LOCAL_READING_SNAPSHOT_TAG, scopedModule.SCOPED_READING_REPORT_TAG], createdAt, updatedAt: createdAt });
  return { index, report, record, month };
}
afterEach(() => vi.restoreAllMocks());

it("shows the saved month literals, original Unicode and own evidence without invoking current prose builders", async () => {
  const { report, record, month, index } = await savedScope();
  const originalBody = record.body;
  const plain = vi.spyOn(plainModule, "buildPlainReadingSummary").mockImplementation(() => { throw new Error("must not regenerate stored prose"); });
  const preview = vi.spyOn(monthModule, "buildReadingMonthPreview").mockImplementation(() => { throw new Error("must not regenerate stored month"); });
  const rebuild = vi.spyOn(scopedModule, "buildScopedReadingReport");
  month.text = "现在页面已经变化的内容";
  index.sourceSnapshot.sourceVersions = ["future-unmatched-producer/99"];
  const view = render(<ReadingSavedRecord record={record} defaultOpen />);
  const saved = await screen.findByRole("region", { name: "保存时的范围报告" });
  expect(saved.textContent).toContain(report.scope.title);
  expect(saved.textContent).toContain("保存时白话：先核对已有款项");
  expect(saved.textContent).toContain("只在实际有约定款项时适用。");
  expect(saved.textContent).toContain("当前辅助，不改动保存文字");
  expect(saved.textContent).toContain("本次未包含的内容与适用边界");
  for (const label of report.scope.excludedScopeLabels) expect(within(saved).getByText(label, { exact: true })).toBeTruthy();
  fireEvent.click(within(saved).getByText("查看保存时的完整原文"));
  expect(saved.querySelector(".reading-explanation-original")!.textContent).toBe(report.index.conclusions[0]!.text);
  expect(saved.textContent).toContain(original);
  expect(view.container.querySelectorAll("script")).toHaveLength(0);
  const evidence = within(saved).getByText(`查看依据 · ${report.index.conclusions[0]!.label}`).closest("details")!;
  evidence.open = true;
  fireEvent(evidence, new Event("toggle", { bubbles: true }));
  await waitFor(() => expect(within(saved).getByText("该月独立原事实")).toBeTruthy());
  expect(plain).not.toHaveBeenCalled(); expect(preview).not.toHaveBeenCalled(); expect(rebuild).not.toHaveBeenCalled();
  expect(record.body).toBe(originalBody);
  expect(screen.queryByText("现在页面已经变化的内容")).toBeNull();
  const targets = await loadReadingCaseReviewTargets(record);
  expect(targets).toHaveLength(1);
  expect(targets[0]!.conclusion).toEqual(report.index.conclusions[0]);
  expect(targets[0]!.sourceSnapshot).toEqual(report.index.sourceSnapshot);
  expect(targets[0]!.evidenceSources).toEqual(report.index.sources);
  expect(targets[0]!.evidenceSources.map(source => source.id)).toEqual(["saved-month-source", "saved-rule-only-source"]);
  expect(targets[0]!.citationBindings).toEqual(report.index.citationBindings);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(record.body));
  expect(targets[0]!.reportRef).toEqual({ noteId: record.id, editVersion: record.editVersion,
    bodySha256: [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("") });
  expect(plain).not.toHaveBeenCalled(); expect(preview).not.toHaveBeenCalled(); expect(rebuild).not.toHaveBeenCalled();
});

it("distinguishes scoped reports from legacy full reports without relabeling or replacing the old reading", async () => {
  const { record } = await savedScope();
  const legacyBody = await packReadingSnapshot(await encodeReadingReportBundle({ reading: "# 旧完整报告原文\n\n当时的完整阅读内容。", archive: "旧完整档案原文。", version: "hakimi.local-reading-edition/0.22.0" }));
  const legacy = syntheticReviewNote(legacyBody, { tags: [LOCAL_READING_SNAPSHOT_TAG] });
  const view = render(<><ReadingSavedRecord record={record} reportLabel="阅读报告" defaultOpen /><ReadingSavedRecord record={legacy} reportLabel="旧完整报告" defaultOpen /></>);
  await screen.findByRole("region", { name: "保存时的范围报告" });
  await screen.findByRole("heading", { name: "旧完整报告原文" });
  const summaries = [...view.container.querySelectorAll(".reading-saved-record > summary")].map(node => node.textContent);
  expect(summaries[0]).toContain("范围报告");
  expect(summaries[1]).toContain("旧完整报告");
  expect(summaries[1]).not.toContain("范围报告");
  expect(screen.getByRole("button", { name: "导出这个范围的全部内容" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "导出这份完整档案" })).toBeTruthy();
  expect(screen.getByText(/这份报告当时没有保存逐条结论与依据索引/)).toBeTruthy();
  expect(legacy.body).toBe(legacyBody);
});

it.each(["case", "revision", "time", "tags"] as const)("revalidates the same body when %s metadata changes and does not reuse another identity's decoded result or error", async kind => {
  const { record } = await savedScope();
  const view = render(<ReadingSavedRecord record={record} defaultOpen />);
  await screen.findByRole("region", { name: "保存时的范围报告" });
  const changed: ResearchNoteRecord = { ...record };
  if (kind === "case") changed.caseId = crypto.randomUUID();
  if (kind === "revision") changed.anchor = { kind: "revision", revisionId: crypto.randomUUID() };
  if (kind === "time") changed.createdAt = "2026-10-28T12:00:00.000Z";
  if (kind === "tags") changed.tags = [scopedModule.SCOPED_READING_REPORT_TAG];
  view.rerender(<ReadingSavedRecord record={changed} defaultOpen />);
  expect(screen.queryByRole("region", { name: "保存时的范围报告" })).toBeNull();
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("归属、类型或时间不一致"));
  expect(screen.queryByRole("button", { name: "导出这份范围阅读稿" })).toBeNull();
  view.rerender(<ReadingSavedRecord record={record} defaultOpen />);
  await screen.findByRole("region", { name: "保存时的范围报告" });
  expect(screen.queryByRole("alert")).toBeNull();
  expect(record.body).toBe(changed.body);
});
