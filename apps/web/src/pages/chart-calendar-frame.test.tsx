import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { withTimeRules } from "@hakimi/rule-profiles";
import { caseRecordSchema, storedRevisionRecordSchema } from "@hakimi/contracts";
import { caseRepository } from "@hakimi/storage";
import { buildSingleChartCalendarFramePresentation, exportSingleChartCalendarFrameMarkdown } from "../../../../packages/research-export/src/single-chart-calendar-frame";
import { resolveGregorianCalendarDate } from "@hakimi/time-core";
import { ChartPage } from "./chart-page";
import { installLegacyV13BootGovernance, clearBootGovernanceFixture } from "../test/boot-governance-fixture";

beforeEach(() => { installLegacyV13BootGovernance(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); clearBootGovernanceFixture(); window.history.replaceState({}, "", "/"); });

describe("local input and fixed-plus08 lunar presentation", () => {
  it.each([
    { timeZone: "Asia/Shanghai", time: "23:30", lunarDay: 1 },
    { timeZone: "America/New_York", time: "23:30", lunarDay: 2 },
    { timeZone: "Pacific/Kiritimati", time: "00:30", lunarDay: 30 }
  ])("$timeZone preserves the actual calculation and explains both date frames in UI and report", async ({ timeZone, time, lunarDay }) => {
    const chart = await calculateChart({
      schemaVersion: "1.0.0", calendarType: "lunar", date: "2024-01-01", time, timePrecision: "exact_minute",
      timeZone, sex: "male", lunarLeapMonth: false,
      location: { label: "Synthetic cross-date fixture", latitude: null, longitude: null, precision: "city" }, sourceNote: ""
    }, withTimeRules({ dayBoundary: "zi_start_23", dstAmbiguity: "require_user" }));
    const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111", caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-14T00:00:00.000Z" });
    const original = structuredClone(revision);
    const caseRecord = caseRecordSchema.parse({ schemaVersion: "1.0.0", recordVersion: 2, id: revision.caseId, alias: "跨日合成案例", tags: [], notes: "", favorite: false, deletedAt: null, createdAt: revision.createdAt, updatedAt: revision.createdAt, latestRevisionId: revision.id, revisionCount: 1 });
    vi.spyOn(caseRepository, "getCase").mockResolvedValue({ caseRecord, revisions: [revision] });
    window.history.replaceState({}, "", `/cases/${revision.caseId}/revisions/${revision.id}?view=overview`);
    render(<ChartPage caseId={revision.caseId} revisionId={revision.id} />);
    await waitFor(() => expect(screen.getByText("排盘当地公历")).toBeTruthy());
    expect(screen.getByText("同瞬时固定 UTC+08:00 农历候选").parentElement?.textContent).toContain(chart.facts.calendar.lunarText);
    const notice = "农历候选按固定 +08 日期显示，可能与当地出生日期的农历对照不同；原始输入保留。";
    expect(screen.getByText(notice)).toBeTruthy();
    expect(revision.facts.calendar.lunarDay).toBe(lunarDay);
    expect(resolveGregorianCalendarDate(revision.timeCalibration.calendarResolution!.resolvedGregorianDate).resolvedLunarDate).toBe("2024-01-01");
    const reportInput = { caseRecord, revision, researchNotes: [], events: [], eventTimeMigrationReceipts: [], citations: [], knowledgeDocuments: [], sourceRights: [] };
    for (const anonymized of [false, true]) {
      const presentation = await buildSingleChartCalendarFramePresentation(reportInput, { anonymized });
      const report = presentation.report;
      expect(presentation.calendarFrame.subtitle).toBe(`排盘当地公历：${chart.facts.calendar.solarText}；同瞬时固定 UTC+08:00 农历候选：${chart.facts.calendar.lunarText}。${notice}`);
      expect(report.subtitle).toBe(`${chart.facts.calendar.solarText} · ${chart.facts.calendar.lunarText}`);
      expect(report.birthRows.find((row) => row.label === "原始日期")?.value).toBe("2024-01-01");
      expect(exportSingleChartCalendarFrameMarkdown(presentation).content).toContain(presentation.calendarFrame.subtitle);
    }
    expect(revision).toEqual(original);
    expect(revision.manifest.resultHash).toBe(chart.manifest.resultHash);
  });
});
