import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { withTimeRules } from "@hakimi/rule-profiles";
import { caseRecordSchema, storedRevisionRecordSchema } from "@hakimi/contracts";
import {
  buildSingleChartResearchReport, exportSingleChartResearchMarkdown,
  validateSingleChartResearchReport, type SingleChartReportInput
} from "./single-chart-report";
import {
  buildSingleChartCalendarFramePresentation, exportSingleChartCalendarFrameMarkdown,
  readSingleChartCalendarFrameHeader, validateSingleChartCalendarFramePresentation,
  SINGLE_CHART_CALENDAR_FRAME_NOTICE, SINGLE_CHART_CALENDAR_FRAME_VERSION
} from "./single-chart-calendar-frame";

const examples = [
  { timeZone: "Asia/Shanghai", time: "23:30", lunarDay: 1 },
  { timeZone: "America/New_York", time: "23:30", lunarDay: 2 },
  { timeZone: "Pacific/Kiritimati", time: "00:30", lunarDay: 30 }
] as const;
const inputs: SingleChartReportInput[] = [];
beforeAll(async () => {
  for (const example of examples) {
    const chart = await calculateChart({
      schemaVersion: "1.0.0", calendarType: "lunar", date: "2024-01-01", time: example.time,
      timePrecision: "exact_minute", timeZone: example.timeZone, sex: "male", lunarLeapMonth: false,
      location: { label: "Synthetic cross-date fixture", latitude: null, longitude: null, precision: "city" }, sourceNote: ""
    }, withTimeRules({ dayBoundary: "zi_start_23", dstAmbiguity: "require_user" }));
    const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0",
      id: "11111111-1111-4111-8111-111111111111", caseId: "22222222-2222-4222-8222-222222222222",
      revisionNumber: 1, createdAt: "2026-10-14T00:00:00.000Z" });
    const caseRecord = caseRecordSchema.parse({ schemaVersion: "1.0.0", recordVersion: 2, id: revision.caseId,
      alias: "跨日合成案例", tags: [], notes: "", favorite: false, deletedAt: null,
      createdAt: revision.createdAt, updatedAt: revision.createdAt, latestRevisionId: revision.id, revisionCount: 1 });
    inputs.push({ caseRecord, revision, researchNotes: [], events: [], eventTimeMigrationReceipts: [], citations: [], knowledgeDocuments: [], sourceRights: [] });
  }
});

describe("independent calendar-frame report presentation", () => {
  it.each(examples.map((example, index) => ({ ...example, index })))
  ("preserves the $timeZone legacy payload and corrects both full and anonymous Markdown", async ({ index, lunarDay }) => {
    const input = inputs[index]!;
    const originalInput = JSON.stringify(input);
    const calendar = input.revision.facts.calendar;
    expect(calendar.lunarDay).toBe(lunarDay);
    for (const anonymized of [false, true]) {
      const presentation = await buildSingleChartCalendarFramePresentation(input, { anonymized });
      const report = presentation.report;
      const legacy = await buildSingleChartResearchReport(input, { anonymized });
      expect(report).toEqual(legacy);
      expect(report.subtitle).toBe(`${calendar.solarText} · ${calendar.lunarText}`);
      expect(Object.isFrozen(presentation)).toBe(true);
      expect(Object.isFrozen(presentation.calendarFrame)).toBe(true);
      expect(Object.isFrozen(report)).toBe(true);
      expect(readSingleChartCalendarFrameHeader(presentation, report).subtitle)
        .toBe(`排盘当地公历：${calendar.solarText}；同瞬时固定 UTC+08:00 农历候选：${calendar.lunarText}。${SINGLE_CHART_CALENDAR_FRAME_NOTICE}`);
      expect(report.birthRows.find((row) => row.label === "原始日期")?.value).toBe("2024-01-01");
      const oldMarkdown = exportSingleChartResearchMarkdown(report);
      expect(oldMarkdown.content.split("\n")[15]).toBe(`- ${report.subtitle}`);
      const currentMarkdown = exportSingleChartCalendarFrameMarkdown(presentation);
      expect(currentMarkdown.presentationVersion).toBe(SINGLE_CHART_CALENDAR_FRAME_VERSION);
      expect(currentMarkdown.content).toContain(`presentationVersion: "${SINGLE_CHART_CALENDAR_FRAME_VERSION}"`);
      expect(currentMarkdown.content).toContain(presentation.calendarFrame.subtitle);
      const restoredLines = currentMarkdown.content.split("\n");
      restoredLines.splice(6, 1);
      restoredLines[15] = `- ${report.subtitle}`;
      expect(restoredLines.join("\n")).toBe(oldMarkdown.content);
      expect(JSON.stringify(input)).toBe(originalInput);
    }
  });

  it("requires exact envelope reconstruction and keeps the legacy registered-object boundary", async () => {
    const input = inputs[1]!;
    const presentation = await buildSingleChartCalendarFramePresentation(input);
    const serialized = structuredClone(presentation);
    expect(() => readSingleChartCalendarFrameHeader(serialized)).toThrow(/当前模块构建/);
    expect(() => exportSingleChartCalendarFrameMarkdown(serialized)).toThrow(/当前模块构建/);
    const restored = await validateSingleChartCalendarFramePresentation(serialized, input);
    expect(restored).toEqual(presentation);
    expect(exportSingleChartCalendarFrameMarkdown(restored)).toEqual(exportSingleChartCalendarFrameMarkdown(presentation));
    expect(() => exportSingleChartResearchMarkdown({ ...presentation.report, subtitle: presentation.calendarFrame.subtitle })).toThrow(/当前模块构建/);
    await expect(validateSingleChartResearchReport(presentation.report, input)).resolves.toEqual(presentation.report);
    await expect(validateSingleChartCalendarFramePresentation({ ...serialized, presentationVersion: "unknown" }, input)).rejects.toThrow();
    await expect(validateSingleChartCalendarFramePresentation({ ...serialized, extra: true }, input)).rejects.toThrow();
    await expect(validateSingleChartCalendarFramePresentation({ ...serialized, calendarFrame: { ...serialized.calendarFrame, subtitle: "伪造日期解释" } }, input)).rejects.toThrow(/规范重建/);
    await expect(validateSingleChartCalendarFramePresentation(serialized, inputs[0]!)).rejects.toThrow(/规范重建/);
    await expect(validateSingleChartCalendarFramePresentation(serialized, input, { anonymized: false })).rejects.toThrow(/规范重建/);
    expect(() => readSingleChartCalendarFrameHeader(presentation, { ...presentation.report })).toThrow(/绑定同一报告/);
  });
});
