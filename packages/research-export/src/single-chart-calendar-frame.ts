import { z } from "zod";
import {
  buildSingleChartResearchReport,
  exportSingleChartResearchMarkdown,
  singleChartMarkdownDocumentSchema,
  singleChartReportInputSchema,
  validateSingleChartResearchReport,
  type SingleChartReportInput,
  type SingleChartReportOptions,
  type SingleChartResearchReport,
  type SingleChartMarkdownDocument
} from "./single-chart-report";

export const SINGLE_CHART_CALENDAR_FRAME_VERSION = "hakimi.single-chart.calendar-frame/1.0.0" as const;
export const SINGLE_CHART_CALENDAR_FRAME_NOTICE = "农历候选按固定 +08 日期显示，可能与当地出生日期的农历对照不同；原始输入保留。" as const;
const KIND = "single_chart_calendar_frame_presentation" as const;
const registeredPresentations = new WeakSet<object>();

const calendarFrameSchema = z.strictObject({
  localGregorian: z.string(),
  fixedPlus08Lunar: z.string(),
  notice: z.literal(SINGLE_CHART_CALENDAR_FRAME_NOTICE),
  subtitle: z.string()
});
const presentationInputSchema = z.strictObject({
  presentationVersion: z.literal(SINGLE_CHART_CALENDAR_FRAME_VERSION),
  kind: z.literal(KIND),
  report: z.unknown(),
  calendarFrame: calendarFrameSchema
});

export interface SingleChartCalendarFramePresentation {
  readonly presentationVersion: typeof SINGLE_CHART_CALENDAR_FRAME_VERSION;
  readonly kind: typeof KIND;
  readonly report: SingleChartResearchReport;
  readonly calendarFrame: Readonly<z.infer<typeof calendarFrameSchema>>;
}

function registerPresentation(
  report: SingleChartResearchReport,
  input: z.infer<typeof singleChartReportInputSchema>
): SingleChartCalendarFramePresentation {
  const { solarText, lunarText } = input.revision.facts.calendar;
  // Keep the registered legacy report object and its subtitle exactly intact.
  if (report.subtitle !== `${solarText} · ${lunarText}`) {
    throw new Error("历法展示与已验证报告的日期内容不一致");
  }
  const calendarFrame = Object.freeze({
    localGregorian: solarText,
    fixedPlus08Lunar: lunarText,
    notice: SINGLE_CHART_CALENDAR_FRAME_NOTICE,
    subtitle: `排盘当地公历：${solarText}；同瞬时固定 UTC+08:00 农历候选：${lunarText}。${SINGLE_CHART_CALENDAR_FRAME_NOTICE}`
  });
  const presentation = Object.freeze({
    presentationVersion: SINGLE_CHART_CALENDAR_FRAME_VERSION,
    kind: KIND,
    report,
    calendarFrame
  });
  registeredPresentations.add(presentation);
  return presentation;
}

export async function buildSingleChartCalendarFramePresentation(
  rawInput: SingleChartReportInput,
  options: SingleChartReportOptions = {}
): Promise<SingleChartCalendarFramePresentation> {
  // Snapshot the facts before asynchronous validation so the heading and report
  // cannot observe different input states.
  const input = singleChartReportInputSchema.parse(rawInput);
  return registerPresentation(await buildSingleChartResearchReport(input, options), input);
}

export async function validateSingleChartCalendarFramePresentation(
  rawPresentation: unknown,
  rawInput: SingleChartReportInput,
  options: SingleChartReportOptions = {}
): Promise<SingleChartCalendarFramePresentation> {
  const candidate = presentationInputSchema.parse(rawPresentation);
  const input = singleChartReportInputSchema.parse(rawInput);
  const report = await validateSingleChartResearchReport(candidate.report, input, options);
  const expected = registerPresentation(report, input);
  for (const key of ["localGregorian", "fixedPlus08Lunar", "notice", "subtitle"] as const) {
    if (candidate.calendarFrame[key] !== expected.calendarFrame[key]) {
      throw new Error("历法展示与原始输入的规范重建结果不一致");
    }
  }
  return expected;
}

export function readSingleChartCalendarFrameHeader(
  presentation: SingleChartCalendarFramePresentation,
  expectedReport?: SingleChartResearchReport
): SingleChartCalendarFramePresentation["calendarFrame"] {
  if (!presentation || !registeredPresentations.has(presentation)
    || (expectedReport !== undefined && presentation.report !== expectedReport)) {
    throw new Error("历法展示必须由当前模块构建，或结合原始输入重新校验，并绑定同一报告");
  }
  return presentation.calendarFrame;
}

export type SingleChartCalendarFrameMarkdownDocument = SingleChartMarkdownDocument & {
  presentationVersion: typeof SINGLE_CHART_CALENDAR_FRAME_VERSION;
};

export function exportSingleChartCalendarFrameMarkdown(
  presentation: SingleChartCalendarFramePresentation
): SingleChartCalendarFrameMarkdownDocument {
  const calendarFrame = readSingleChartCalendarFrameHeader(presentation);
  const legacy = exportSingleChartResearchMarkdown(presentation.report);
  // Replace only the verified, fixed header line. Never search user notes or
  // change the registered payload; the remaining Markdown stays byte-identical.
  const lines = legacy.content.split("\n");
  if (lines[0] !== "---" || lines[15] !== `- ${presentation.report.subtitle}`) {
    throw new Error("旧报告 Markdown 头部与历法展示适配契约不一致");
  }
  lines[15] = `- ${calendarFrame.subtitle}`;
  lines.splice(6, 0, `presentationVersion: "${SINGLE_CHART_CALENDAR_FRAME_VERSION}"`);
  const document = singleChartMarkdownDocumentSchema.parse({ ...legacy, content: lines.join("\n") });
  return Object.freeze({ ...document, presentationVersion: SINGLE_CHART_CALENDAR_FRAME_VERSION });
}
