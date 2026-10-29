import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import type { RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment, type BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading, type BaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { ComprehensiveReadingPanel } from "./comprehensive-reading-panel";
import { buildLocalReadingSnapshot } from "../lib/local-reading-record";

let assessment: BaziPreliminaryAssessment;
let reading: BaziComprehensiveReading;
let revision: RevisionRecord;
beforeAll(async () => {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26",
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
    location: { label: "合成正文", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  revision = { schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1,
    createdAt: "2026-10-15T00:00:00Z", ...chart };
  assessment = buildBaziPreliminaryAssessment(revision);
  reading = buildBaziComprehensiveReading(revision, assessment);
});
afterEach(cleanup);
describe("complete reading chapters", () => {
  it("leads the relationship chapter with the complete life answer and retains the original star-palace content", () => {
    const chapter = reading.chapters.find((chapter) => chapter.id === "relationships")!;
    const relationshipReading = { id: "relationships", title: "相处特点与回应", origin: "calculated" as const, lifeAdapted: true,
      sourceSubjects: ["chapter-relationships"], answer: "本盘相处倾向的合成直接判断。\n\n不同需要之间的具体磨合。",
      paragraphs: [chapter.verdict, ...chapter.paragraphs], conditions: ["本段条件。"], evidence: chapter.evidence };
    render(<ComprehensiveReadingPanel reading={reading} sources={assessment.sources} relationshipReading={relationshipReading} />);
    fireEvent.click(screen.getByRole("tab", { name: "关系家庭" }));
    const article = screen.getByRole("article", { name: chapter.title });
    for (const paragraph of relationshipReading.answer.split("\n\n")) expect(within(article).getByText(paragraph).closest("details")).toBeNull();
    const original = within(article).getByText("查看星宫与相处的原判断").closest("details")!;
    expect(original.open).toBe(false);
    for (const paragraph of [chapter.verdict, ...chapter.paragraphs]) expect(original.textContent).toContain(paragraph);
  });
  it("uses the age-adapted family answer in the full chapter and keeps every original paragraph in a labelled disclosure", () => {
    const family = reading.chapters.find((chapter) => chapter.id === "family")!;
    const familyReading = { id: "family", title: "成长中的家庭支持", origin: "calculated" as const, ageAdapted: true, sourceSubjects: ["chapter-family"],
      answer: "照料与学习中的合成支持说明。\n\n回应小约定，保留自主尝试。", paragraphs: [family.verdict, ...family.paragraphs], conditions: ["合成适龄范围。"], evidence: family.evidence };
    render(<ComprehensiveReadingPanel reading={reading} sources={assessment.sources} familyReading={familyReading} />);
    fireEvent.click(screen.getByRole("tab", { name: "关系家庭" }));
    const article = screen.getByRole("article", { name: family.title });
    for (const paragraph of familyReading.answer.split("\n\n")) expect(within(article).getByText(paragraph).closest("details")).toBeNull();
    const disclosure = within(article).getByText("家庭原判断（未按年龄转写）").closest("details")!;
    expect(disclosure.open).toBe(false);
    for (const original of [family.verdict, ...family.paragraphs, ...family.strengths, ...family.cautions, ...family.suggestions]) expect(disclosure.textContent).toContain(original);
    expect(within(article).getByText("合成适龄范围。").closest("details")).toBeTruthy();
  });
  it("shows every concrete useful stem and preserves its conditions in both the report and legacy presentation", () => {
    const guidance = reading.usefulGuidance!;
    expect(guidance.entries.length).toBeGreaterThan(0);
    const view = render(<ComprehensiveReadingPanel reading={reading} sources={assessment.sources} />);
    fireEvent.click(screen.getByRole("tab", { name: "格局喜用" }));
    const roles = screen.getByRole("region", { name: "本盘用字分工" });
    const saved = buildLocalReadingSnapshot(assessment, null, { sourceRevision: revision, comprehensive: reading });
    for (const entry of guidance.entries) {
      expect(roles.textContent).toContain(entry.presenceText);
      expect(roles.textContent).toContain(entry.judgment);
      expect(saved).toContain(entry.judgment);
      for (const condition of entry.conditions) {
        expect(roles.textContent).toContain(condition);
        expect(saved).toContain(condition);
      }
    }
    const summary = roles.querySelector("summary");
    if (summary) {
      fireEvent.click(summary);
      expect(summary.parentElement!.hasAttribute("open")).toBe(true);
    }
    view.unmount();
    const legacy = { ...reading, usefulGuidance: undefined };
    render(<ComprehensiveReadingPanel reading={legacy} sources={assessment.sources} />);
    fireEvent.click(screen.getByRole("tab", { name: "格局喜用" }));
    expect(screen.queryByRole("region", { name: "本盘用字分工" })).toBeNull();
    for (const paragraph of legacy.chapters.find((chapter) => chapter.id === "useful_elements")!.paragraphs) {
      expect(screen.getByRole("tabpanel").textContent).toContain(paragraph);
    }
  });
  it("shows every overview paragraph instead of truncating conclusions to the first sentence", () => {
    render(<ComprehensiveReadingPanel reading={reading} sources={assessment.sources} />);
    for (const chapter of reading.chapters.filter((item) => ["overview", "personality"].includes(item.id))) {
      const panel = screen.getByRole("tabpanel").textContent!;
      expect(panel).toContain(chapter.verdict);
      for (const paragraph of chapter.paragraphs) expect(panel).toContain(paragraph);
    }
  });
  it("switches complete career and wealth chapters, supports keyboard navigation and never loses their evidence", () => {
    render(<ComprehensiveReadingPanel reading={reading} sources={assessment.sources} />);
    fireEvent.click(screen.getByRole("tab", { name: "事业财务" }));
    for (const chapter of reading.chapters.filter((item) => ["career", "wealth"].includes(item.id))) {
      expect(screen.getByRole("tabpanel").textContent).toContain(chapter.verdict);
      expect(screen.getByRole("tabpanel").textContent).toContain(chapter.evidence[0]);
    }
    fireEvent.keyDown(screen.getByRole("tab", { name: "事业财务" }), { key: "End" });
    expect(screen.getByRole("tab", { name: "成长方向" }).getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "成长方向" }));
    expect(screen.getByRole("tabpanel").textContent).toContain(reading.chapters.find((item) => item.id === "development")!.verdict);
  });
});
