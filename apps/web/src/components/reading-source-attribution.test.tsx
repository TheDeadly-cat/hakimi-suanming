import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import type { RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { ChartReadingWorkbench } from "./chart-reading-workbench";
import { ComprehensiveReadingPanel } from "./comprehensive-reading-panel";
import { buildLocalReadingSnapshot } from "../lib/local-reading-record";

const examples: RevisionRecord[] = [];
beforeAll(async () => {
  for (const date of ["1995-01-14", "1995-08-18"]) {
    const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time: "08:26",
      timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
      location: { label: "合成来源核对", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
    examples.push({ schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1,
      createdAt: "2026-10-15T00:00:00Z", ...chart });
  }
});
afterEach(cleanup);

describe("reading source attribution", () => {
  it("shows and exports the natal diagnosis sources even when no annual outlook is generated", async () => {
    const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-05-18", time: "08:26",
      timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
      location: { label: "合成格局来源核对", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
    const revision: RevisionRecord = { schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1,
      createdAt: "2026-10-16T00:00:00Z", ...chart };
    const assessment = buildBaziPreliminaryAssessment(revision);
    const reading = buildBaziComprehensiveReading(revision, assessment);
    const structure = reading.chapters.find((chapter) => chapter.id === "structure")!;
    const addedSources = (reading.sources ?? []).filter((source) => structure.sourceIds.includes(source.id)
      && !assessment.sources.some((existing) => existing.id === source.id));
    expect(addedSources.length).toBeGreaterThan(0);
    const view = render(<ComprehensiveReadingPanel reading={reading} sources={assessment.sources} />);
    fireEvent.click(screen.getByRole("tab", { name: "格局喜用" }));
    const snapshot = buildLocalReadingSnapshot(assessment, null, { sourceRevision: revision, comprehensive: reading });
    for (const source of addedSources) {
      expect(view.container.textContent).toContain(source.title);
      expect([...view.container.querySelectorAll("a")].some((link) => link.href === source.url)).toBe(true);
      expect(snapshot).toContain(source.url);
      expect(snapshot).toContain(source.title);
    }
    expect(snapshot).toContain("本命格局与岁运判断来源");
    expect(snapshot).toContain("hakimi.outlook-classical-sources/0.4.0");
  });
  it.each(["workbench", "comprehensive"] as const)("keeps facsimile and Wikisource attribution distinct in %s", (surface) => {
    for (const [index, revision] of examples.entries()) {
      const assessment = buildBaziPreliminaryAssessment(revision);
      if (index === 0) expect(assessment.seasonal.ruleId).toBe("qiongtong-yi-chou-nlc48608-p69-v1");
      else expect(assessment.seasonal.ruleId).toBe("qiongtong-xin-shen-v1");
      const view = surface === "workbench"
        ? render(<ChartReadingWorkbench revision={revision} caseName="合成来源核对" assessment={assessment} />)
        : render(<ComprehensiveReadingPanel reading={buildBaziComprehensiveReading(revision, assessment)} sources={assessment.sources} />);
      if (surface === "comprehensive") fireEvent.click(screen.getByRole("tab", { name: "格局喜用" }));
      const content = view.container.textContent!;
      if (index === 0) {
        expect(content).toContain("影印大字原文：国图藏本");
        expect(content).toContain("PDF 第 69 页");
        expect(content).not.toContain("原文转录：维基文库贡献者");
        expect(content).not.toContain("CC BY-SA 4.0");
        expect([...view.container.querySelectorAll("a")].some((link) => link.textContent === "影印来源与权利说明" && link.href.includes("commons.wikimedia.org"))).toBe(true);
      } else {
        expect(content).toContain("原文转录：维基文库贡献者");
        expect(content).toContain("CC BY-SA 4.0");
        expect(content).not.toContain("影印大字原文：国图藏本");
      }
      cleanup();
    }
  });
});
