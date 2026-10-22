import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { caseRecordSchema, storedRevisionRecordSchema } from "@hakimi/contracts";
import { withTimeRules } from "@hakimi/rule-profiles";
import { caseRepository, type SingleChartExportSnapshot } from "@hakimi/storage";
import type { ReportExportPort } from "@hakimi/platform";
import {
  buildSingleChartCalendarFramePresentation, SINGLE_CHART_CALENDAR_FRAME_VERSION,
  SINGLE_CHART_CALENDAR_FRAME_NOTICE
} from "../../../../packages/research-export/src/single-chart-calendar-frame";
import { SingleChartReport } from "./single-chart-report";
import { SingleChartReportExport } from "./single-chart-report-export";
import { resetPreparedFileDeliveryCoordinatorForTests } from "./prepared-file-delivery-coordinator";

const { toBlobMock } = vi.hoisted(() => ({ toBlobMock: vi.fn() }));
vi.mock("html-to-image", () => ({ toBlob: toBlobMock }));
let input: SingleChartExportSnapshot;
let heading: string;
beforeAll(async () => {
  const chart = await calculateChart({
    schemaVersion: "1.0.0", calendarType: "lunar", date: "2024-01-01", time: "23:30",
    timePrecision: "exact_minute", timeZone: "America/New_York", sex: "male", lunarLeapMonth: false,
    location: { label: "Synthetic cross-date fixture", latitude: null, longitude: null, precision: "city" }, sourceNote: ""
  }, withTimeRules({ dayBoundary: "zi_start_23", dstAmbiguity: "require_user" }));
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0",
    id: "11111111-1111-4111-8111-111111111111", caseId: "22222222-2222-4222-8222-222222222222",
    revisionNumber: 1, createdAt: "2026-10-14T00:00:00.000Z" });
  const caseRecord = caseRecordSchema.parse({ schemaVersion: "1.0.0", recordVersion: 2, id: revision.caseId,
    alias: "跨日合成案例", tags: [], notes: "", favorite: false, deletedAt: null,
    createdAt: revision.createdAt, updatedAt: revision.createdAt, latestRevisionId: revision.id, revisionCount: 1 });
  input = { caseRecord, revision, revisionCalculationReceiptLedgerStatus: "schema_unavailable", revisionCalculationReceipts: [],
    researchNotes: [], events: [], eventTimeMigrationReceipts: [], citations: [], knowledgeDocuments: [], sourceRights: [] };
  heading = `排盘当地公历：${chart.facts.calendar.solarText}；同瞬时固定 UTC+08:00 农历候选：${chart.facts.calendar.lunarText}。${SINGLE_CHART_CALENDAR_FRAME_NOTICE}`;
});
beforeEach(() => {
  resetPreparedFileDeliveryCoordinatorForTests();
  vi.spyOn(caseRepository, "readSingleChartExportSnapshot").mockImplementation(async () => structuredClone(input));
  toBlobMock.mockReset().mockResolvedValue(new Blob(["synthetic-png"], { type: "image/png" }));
});
afterEach(() => { vi.restoreAllMocks(); });
function portFixture() {
  const saveFile = vi.fn<ReportExportPort["saveFile"]>(async (_blob, filename) => ({ status: "download_requested", filename, method: "browser_download" }));
  const printReport = vi.fn<ReportExportPort["printReport"]>(async () => {
    expect(document.querySelector(".single-chart-report-print-root")?.textContent).toContain(heading);
  });
  const port: ReportExportPort = {
    getCapabilities: () => ({ canDownloadFiles: true, canChooseSaveLocation: false, canShareFiles: false }),
    saveFile, printReport,
    saveFileToChosenLocation: vi.fn(), shareFile: vi.fn()
  };
  return { port, saveFile, printReport };
}
function renderExport(anonymized: boolean, port: ReportExportPort) {
  render(<SingleChartReportExport caseId={input.caseRecord.id} revisionId={input.revision.id} exportPort={port} />);
  if (!anonymized) fireEvent.click(screen.getByRole("checkbox"));
}

describe("calendar-frame report preview and actual export component wiring", () => {
  it.each([true, false])("keeps the corrected header in preview, PNG source and print DOM (anonymous=%s)", async (anonymized) => {
    const { port, printReport } = portFixture();
    renderExport(anonymized, port);
    fireEvent.click(screen.getByRole("button", { name: /预览当前修订报告/ }));
    const dialog = await screen.findByRole("dialog", { name: /单盘报告预览/ });
    expect(within(dialog).getByText(heading)).toBeTruthy();
    const report = dialog.querySelector(".single-chart-report-print-root")!;
    expect(report.getAttribute("data-calendar-frame-version")).toBe(SINGLE_CHART_CALENDAR_FRAME_VERSION);
    fireEvent.click(within(dialog).getByRole("button", { name: "打印 / 保存 PDF" }));
    await waitFor(() => expect(printReport).toHaveBeenCalledTimes(1));
    await waitFor(() => expect((screen.getByRole("button", { name: "准备长图 PNG" }) as HTMLButtonElement).disabled).toBe(false));
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(2400);
    fireEvent.click(within(dialog).getByRole("button", { name: "准备长图 PNG" }));
    await waitFor(() => expect(toBlobMock).toHaveBeenCalledTimes(1));
    const pngRoot = toBlobMock.mock.calls[0]![0] as HTMLElement;
    expect(pngRoot.textContent).toContain(heading);
    expect(pngRoot.getAttribute("data-calendar-frame-version")).toBe(SINGLE_CHART_CALENDAR_FRAME_VERSION);
    expect(pngRoot.querySelector(".single-chart-report-cover")?.textContent).not.toContain(`${input.revision.facts.calendar.solarText} · ${input.revision.facts.calendar.lunarText}`);
    expect(await screen.findByRole("dialog", { name: /待交付文件已在本机生成/ })).toBeTruthy();
  });

  it.each([true, false])("delivers corrected versioned Markdown through the existing file dialog (anonymous=%s)", async (anonymized) => {
    const { port, saveFile } = portFixture();
    renderExport(anonymized, port);
    fireEvent.click(screen.getByRole("button", { name: /准备单盘 Markdown/ }));
    const dialog = await screen.findByRole("dialog", { name: /待交付文件已在本机生成/ });
    fireEvent.click(within(dialog).getByRole("button", { name: /下载文件/ }));
    await waitFor(() => expect(saveFile).toHaveBeenCalledTimes(1));
    const blob = saveFile.mock.calls[0]![0];
    const content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader(); reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve(String(reader.result)); reader.readAsText(blob);
    });
    expect(content).toContain(heading);
    expect(content).toContain(`presentationVersion: "${SINGLE_CHART_CALENDAR_FRAME_VERSION}"`);
  });

  it("preserves the legacy view API and refuses an unregistered or mismatched presentation", async () => {
    const presentation = await buildSingleChartCalendarFramePresentation(input);
    const view = render(<SingleChartReport report={presentation.report} />);
    expect(screen.getByText(presentation.report.subtitle)).toBeTruthy();
    expect(screen.queryByText(heading)).toBeNull();
    view.rerender(<SingleChartReport report={presentation.report} calendarPresentation={structuredClone(presentation)} />);
    expect(screen.getByRole("alert").textContent).toContain("历法展示未通过当前报告身份绑定");
    view.rerender(<SingleChartReport report={{ ...presentation.report }} calendarPresentation={presentation} />);
    expect(screen.getByRole("alert").textContent).toContain("历法展示未通过当前报告身份绑定");
  });
});
