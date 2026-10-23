import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { getWorkingBalance } from "../../../../packages/bazi-interpretation/src/structural-strength-assessment";
import { LOCAL_PERSONAL_READING_VERSION, type LocalPersonalReading } from "../lib/local-personal-reading";
import { ChartReadingWorkbench } from "./chart-reading-workbench";
import { PersonalReadingProvider } from "./personal-reading-note";

async function fixture() {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "2019-12-22", time: "11:23",
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "female", lunarLeapMonth: false,
    location: { label: "Public four-pillar example", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
  const assessment = buildBaziPreliminaryAssessment(revision);
  return { revision, assessment, comprehensive: buildBaziComprehensiveReading(revision, assessment) };
}
let input: Awaited<ReturnType<typeof fixture>>;
beforeAll(async () => { input = await fixture(); }, 60_000);
afterEach(cleanup);

describe("natal main judgment across the first screen and full report", () => {
  it("shows the evaluated pattern, local citations and useful sequence before individual stem explanations", () => {
    const original = JSON.stringify(input);
    render(<ChartReadingWorkbench {...input} caseName="公开合成例" />);
    const diagnosis = input.comprehensive.patternDiagnosis!;
    const button = screen.getByRole("button", { name: new RegExp(`^格局\\s*${diagnosis.headline}\\s*格局主判断$`) });
    fireEvent.click(button);
    const detail = document.getElementById(button.getAttribute("aria-controls")!)!;
    expect(within(detail).getByText(diagnosis.currentJudgment)).toBeTruthy();
    expect(detail.querySelector("details")!.open).toBe(false);
    fireEvent.click(within(detail).getByText("展开判断依据与出处"));
    const source = input.comprehensive.sources!.find((item) => item.id === "natal-zq-self-combination-not-removal")!;
    expect(detail.textContent).toContain(source.excerpt);
    expect(Array.from(detail.querySelectorAll("a")).some((link) => link.href === source.url)).toBe(true);
    fireEvent.click(screen.getByRole("tab", { name: "格局喜用" }));
    const useful = screen.getByRole("article", { name: "扶抑、格局与调候取向" });
    const order = within(useful).getByRole("heading", { name: "取用先后与分工" });
    const roles = within(useful).getByRole("region", { name: "本盘用字分工" });
    expect(order.compareDocumentPosition(roles) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const originalReading = order.closest("details")!;
    expect(originalReading.querySelector("summary")!.textContent).toContain("展开命局九章与专业分析");
    expect(originalReading.open).toBe(false);
    fireEvent.click(originalReading.querySelector("summary")!);
    expect(originalReading.open).toBe(true);
    const explanation = within(useful).getByText("展开取用判断过程与条件").closest("details")!;
    expect(explanation.open).toBe(false);
    expect(explanation.textContent).toContain(input.comprehensive.usefulGuidance!.verdict);
    fireEvent.click(within(useful).getByText("展开取用判断过程与条件"));
    expect(explanation.open).toBe(true);
    for (const priority of input.comprehensive.usefulGuidance!.priorities) expect(order.parentElement!.textContent).toContain(priority);
    expect(JSON.stringify(input)).toBe(original);
  });

  it("falls back to the preliminary judgment when the full reading belongs to another revision or hour range", () => {
    for (const binding of [{ revisionId: "different-revision" }, { includeHour: !input.assessment.sourceBinding.includeHour }]) {
      const comprehensive = { ...input.comprehensive, sourceBinding: { ...input.comprehensive.sourceBinding, ...binding } };
      const view = render(<ChartReadingWorkbench {...input} comprehensive={comprehensive} caseName="公开合成例" />);
      const button = screen.getByRole("button", { name: new RegExp(`^格局\\s*${input.assessment.pattern.headline}`) });
      expect(button.textContent).not.toContain("格局主判断");
      fireEvent.click(button);
      const detail = document.getElementById(button.getAttribute("aria-controls")!)!;
      expect(detail.textContent).toContain(input.assessment.pattern.summary);
      expect(detail.textContent).not.toContain("本身十干合之不爲合去");
      view.unmount();
    }
  });

  it("answers relative strength while retaining the old weighted result separately", () => {
    render(<ChartReadingWorkbench {...input} caseName="公开合成例" />);
    const working = getWorkingBalance(input.assessment);
    expect(working.band).toBe("balanced");
    expect(working.direction).toBe("conditional");
    expect(working.focus).toBe("rooted_peer_mixed_authority");
    expect(input.assessment.balance.structural.raw.supportWeight).toBe(9);
    expect(input.assessment.balance.structural.raw.demandWeight).toBe(13);
    const button = screen.getByRole("button", { name: /^扶抑/ });
    expect(button.textContent).toContain("强弱相对均衡");
    fireEvent.click(button);
    const detail = document.getElementById(button.getAttribute("aria-controls")!)!;
    expect(within(detail).getByRole("heading", { name: `当前旺衰判断 · ${working.label}` })).toBeTruthy();
    expect(within(detail).getByText(working.summary)).toBeTruthy();
    fireEvent.click(within(detail).getByText("展开判断依据与出处"));
    const oldResult = within(detail).getByText("原计权对照").closest("details")!;
    expect(oldResult.open).toBe(false);
    fireEvent.click(within(detail).getByText("原计权对照"));
    expect(oldResult.open).toBe(true);
    expect(oldResult.textContent).toContain(input.assessment.balance.baselineSummary);
    expect(detail.textContent).toContain("不作固定喜用");
    expect(working.favorableElements).toEqual([]);
  });

  it("uses the structure chapter's adopted feedback while preserving the original computed judgment", () => {
    const sourceBinding = { caseId: input.revision.caseId, revisionId: input.revision.id,
      chartResultHash: input.revision.manifest.resultHash, includeHour: input.assessment.sourceBinding.includeHour };
    const personal: LocalPersonalReading = { version: LOCAL_PERSONAL_READING_VERSION, sourceBinding, sourceVersions: [], issues: [],
      entries: [
        { subjectId: "chapter-structure", subjectLabel: "当前格局", originalConclusion: input.comprehensive.patternDiagnosis!.currentJudgment,
          readingVersions: [], state: "adopted", personalText: "这段格局说明采用我明确确认的补充。", effectiveConclusion: "这段格局说明采用我明确确认的补充。", feedback: [], selectedReviewRefs: [], issues: [] },
        { subjectId: "preliminary-preliminary-pattern", subjectLabel: "旧初判", originalConclusion: input.assessment.pattern.summary,
          readingVersions: [], state: "adopted", personalText: "仅针对旧初判的补充。", effectiveConclusion: "仅针对旧初判的补充。", feedback: [], selectedReviewRefs: [], issues: [] }
      ] };
    render(<PersonalReadingProvider reading={personal}><ChartReadingWorkbench {...input} caseName="公开合成例" /></PersonalReadingProvider>);
    const button = screen.getByRole("button", { name: new RegExp(`^格局\\s*${input.comprehensive.patternDiagnosis!.headline}\\s*格局主判断$`) });
    fireEvent.click(button);
    const detail = document.getElementById(button.getAttribute("aria-controls")!)!;
    expect(detail.textContent).toContain("这段格局说明采用我明确确认的补充。");
    expect(detail.textContent).not.toContain("仅针对旧初判的补充。");
    const original = within(detail).getByText(input.comprehensive.patternDiagnosis!.currentJudgment);
    expect(original.closest("details")!.open).toBe(false);
    fireEvent.click(within(detail).getByText("对照原计算解读"));
    expect(original.closest("details")!.open).toBe(true);
  });
});
