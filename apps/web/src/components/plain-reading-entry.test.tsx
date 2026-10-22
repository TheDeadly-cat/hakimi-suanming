import { render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type ResearchNoteRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { buildLocalLifeOutlook } from "../lib/local-detailed-outlook";
import { buildLocalAnnualOutlookRange } from "../lib/local-annual-outlook";
import { buildReadingSynthesis } from "../lib/local-reading-synthesis";
import { buildPlainNatalCards } from "../lib/plain-natal-summary";
import { plainYearPeriods, plainYearSummary } from "../lib/plain-year-overview";
import { buildStructuredReadingFeedback, buildReadingFeedbackReview, readingFeedbackSource, type ReadingFeedbackChoice } from "../lib/local-reading-feedback";
import { buildLocalPersonalReading } from "../lib/local-personal-reading";
import { buildAnnualDomainReading } from "../lib/local-annual-domain-reading";
import { annualDomainFeedbackText } from "../lib/local-annual-domain-record";
import { buildAnnualEventReading } from "../lib/local-annual-event-reading";
import { buildAnnualLifeStory } from "../lib/annual-life-story";
import { annualLifeStoryPersonalSources } from "../lib/annual-life-story-record";
import { PersonalReadingProvider } from "./personal-reading-note";
import { ReadingSynthesisPanel } from "./reading-synthesis-panel";
import { PlainYearOverviewPanel } from "./plain-year-overview-panel";

async function fixture(date: string, sex: "male" | "female" | "unspecified" = "male", time = "08:26", referenceYear = 2026) {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex,
    lunarLeapMonth: false, location: { label: "Synthetic plain reading entry", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-20T00:00:00.000Z" });
  const assessment = buildBaziPreliminaryAssessment(revision), comprehensive = buildBaziComprehensiveReading(revision, assessment);
  const life = await buildLocalLifeOutlook(revision, assessment, referenceYear);
  const synthesis = buildReadingSynthesis({ revision, assessment, comprehensive, life });
  return { revision, assessment, comprehensive, life, synthesis };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
let b: Fixture, unknownDirection: Fixture, child: Fixture, resourceFirst: Fixture, wealthFirst: Fixture;
let bYear: Awaited<ReturnType<typeof buildLocalAnnualOutlookRange>>, aYear: typeof bYear;
beforeAll(async () => {
  [b, unknownDirection, child, resourceFirst, wealthFirst] = await Promise.all([
    fixture("1995-05-18"), fixture("1995-08-18", "unspecified"), fixture("2019-12-22", "female", "11:23", 2030),
    fixture("1957-09-13", "male", "00:26"), fixture("1982-10-02", "male", "10:26")
  ]);
  [bYear, aYear] = await Promise.all([
    buildLocalAnnualOutlookRange(b.revision, b.assessment, 2029, 2029),
    buildLocalAnnualOutlookRange(unknownDirection.revision, unknownDirection.assessment, 2028, 2028)
  ]);
}, 60_000);

function chapterChoice(input: Fixture, id: string): ReadingFeedbackChoice {
  const chapter = input.comprehensive.chapters.find(item => item.id === id)!;
  return { id: `chapter-${id}`, label: chapter.title, sourceVersions: [input.comprehensive.version],
    originalConclusion: `${chapter.title} · ${chapter.headline}\n${chapter.verdict}\n${chapter.paragraphs.join("\n")}\n综合解读规则：${input.comprehensive.version}` };
}
function record(input: Fixture, body: string, minute: number, review = false): ResearchNoteRecord {
  const instant = new Date(Date.UTC(2026, 9, 20, 0, minute)).toISOString();
  return { schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: input.revision.caseId, anchor: { kind: "revision", revisionId: input.revision.id },
    bodyFormat: "markdown", body, tags: ["解读反馈", ...(review ? ["解读反馈复核"] : [])], sourceRefs: [], lifecycle: "active", editVersion: 1, createdAt: instant, updatedAt: instant };
}
async function adopted(input: Fixture, choices: ReadingFeedbackChoice[], text: string) {
  const records: ResearchNoteRecord[] = [];
  for (const choice of choices) {
    const root = record(input, buildStructuredReadingFeedback(input.assessment, { subjectId: choice.id, subjectLabel: choice.label,
      originalConclusion: choice.originalConclusion, sourceVersions: choice.sourceVersions, rating: "partial", aspect: "入口全文保留", occurredAt: "合成对照",
      actualSituation: "仅测试个人文字的显示，不代表真实经历。", requestedRevision: text }), 1);
    records.push(root, record(input, await buildReadingFeedbackReview(root, null, readingFeedbackSource(input.assessment, choice.sourceVersions), {
      state: "revised", notes: "明确采用合成个人原文", revisedConclusion: text, occurredAt: "合成对照"
    }), 2, true));
  }
  return buildLocalPersonalReading({ revision: input.revision, assessment: input.assessment, choices, records });
}
const cards = (input: Fixture) => buildPlainNatalCards(input.synthesis, input.comprehensive, { revision: input.revision, referenceInstant: input.life.referenceInstant });

describe("plain reading entry on real calculations and explicit adopted sources", () => {
  it("gives separate adult cards while retaining the complete source answer and conditions", () => {
    const before = JSON.stringify(b), values = cards(b);
    expect(values.map(value => value.title)).toEqual(["事业", "财运", "感情"]);
    expect(new Set(values.map(value => value.summary)).size).toBe(3);
    for (const value of values) {
      const source = b.synthesis.sections.find(section => section.id === value.id)!;
      expect(source.answer ?? source.paragraphs.join("\n\n")).toContain(value.summary);
      expect(value.sourceSubjects).toEqual(source.sourceSubjects);
    }
    expect(JSON.stringify(b)).toBe(before);
  });

  it("does not replace a child's learning and peer answers with adult path headlines", () => {
    const values = cards(child);
    for (const value of values) {
      const source = child.synthesis.sections.find(section => section.id === value.id)!;
      expect(value.title).toBe(source.title);
      expect(source.answer ?? source.paragraphs.join("\n\n")).toContain(value.summary);
    }
    expect(values.map(value => value.title).join(" ")).not.toMatch(/事业|财运|感情/);
    expect(values.map(value => value.headline).join(" ")).not.toMatch(/实际工作|合作分账|专业积累和责任感/);
  });

  it("keeps an excluded-hour compatibility projection out of adult labels and rejects a mismatched chart", () => {
    // This is an explicit historical-hour exclusion projection, not a claim that
    // calculateChart generated an unknown-hour single chart.
    const revision = structuredClone(b.revision);
    revision.input = { ...revision.input, time: null, timePrecision: "unknown_hour" };
    const assessment = buildBaziPreliminaryAssessment(revision), comprehensive = buildBaziComprehensiveReading(revision, assessment);
    const synthesis = buildReadingSynthesis({ revision, assessment, comprehensive });
    const values = buildPlainNatalCards(synthesis, comprehensive, { revision, referenceInstant: b.life.referenceInstant });
    expect(synthesis.sourceBinding.includeHour).toBe(false);
    for (const value of values) expect(value.title).toBe(synthesis.sections.find(section => section.id === value.id)!.title);
    expect(values.map(value => value.headline).join(" ")).not.toContain("靠专业本领积累");
    expect(() => buildPlainNatalCards(synthesis, b.comprehensive, { revision })).toThrow(/来源/);
    expect(() => buildPlainNatalCards(b.synthesis, b.comprehensive, { revision: child.revision })).toThrow(/来源/);
  });

  it("keeps resource-first and wealth-first tasks distinct instead of reverting to the old path-only headline", () => {
    expect(resourceFirst.comprehensive.patternDiagnosis!.wealthResourceTask.task).toBe("resource_first");
    expect(wealthFirst.comprehensive.patternDiagnosis!.wealthResourceTask.task).toBe("wealth_first");
    const support = cards(resourceFirst).filter(value => value.id !== "relationships").map(value => value.headline).join(" ");
    const application = cards(wealthFirst).filter(value => value.id !== "relationships").map(value => value.headline).join(" ");
    expect(support).toMatch(/支持|指导|帮助|方法/);
    expect(support).not.toMatch(/反复准备之间容易犹豫|准备和验证容易占用/);
    expect(application).toMatch(/准备|用途|应用/);
    expect(application).not.toBe(support);
  });

  it("preserves all adopted paragraphs verbatim in each compact card and keeps structural adoption from reviving path claims", async () => {
    const text = "第一段是我明确采用的个人说法。第二句不能被裁掉。\n\n第二段保留换行和限定：仅是我的经历。";
    const personal = await adopted(b, ["career", "wealth", "relationships"].map(id => chapterChoice(b, id)), text);
    const synthesis = buildReadingSynthesis({ ...b, personal });
    const values = buildPlainNatalCards(synthesis, b.comprehensive, { revision: b.revision, referenceInstant: b.life.referenceInstant });
    expect(values).toHaveLength(3);
    for (const value of values) { expect(value.origin).toBe("personal"); expect(value.summary).toBe(text); }
    render(<ReadingSynthesisPanel reading={synthesis} variant="summary" plainCards={values} />);
    for (const region of screen.getByLabelText("事业财运感情先读").querySelectorAll("section")) {
      expect(region.querySelector("p")?.textContent).toBe(text);
      expect(region.querySelector("p")?.closest("details:not([open])")).toBeNull();
    }
    const structural = await adopted(b, [chapterChoice(b, "structure")], text);
    const revised = buildReadingSynthesis({ ...b, personal: structural });
    const revisedCards = buildPlainNatalCards(revised, b.comprehensive, { revision: b.revision, referenceInstant: b.life.referenceInstant });
    expect(revisedCards.map(value => value.headline).join(" ")).not.toContain("靠专业本领积累");
  });

  it("retains B2029's exact handover and distinct before/after conclusions without modifying either judgment", () => {
    const before = JSON.stringify(bYear), original = bYear.years[0]!, values = plainYearPeriods(original);
    expect(values).toHaveLength(2);
    expect(values[0]!.endExclusiveInstant).toBe("2029-05-22T16:20:00.000Z");
    expect(values[1]!.startInstant).toBe(values[0]!.endExclusiveInstant);
    expect(values[1]!.label).toContain("2030/02/04前");
    expect(values[0]!.caption).not.toBe(values[1]!.caption);
    original.judgmentSegments.forEach((segment, index) => {
      expect(values[index]).toMatchObject({ segmentId: segment.id, branchId: segment.branchId, startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant });
      expect(plainYearSummary(original)).toContain(values[index]!.caption);
    });
    expect(JSON.stringify(bYear)).toBe(before);
  });

  it("retains all three A2028 periods in their two unknown-direction branches", () => {
    const original = aYear.years[0]!, values = plainYearPeriods(original);
    expect(values).toHaveLength(3);
    expect(values.filter(value => value.branchId === "forward")).toHaveLength(1);
    expect(values.filter(value => value.branchId === "backward")).toHaveLength(2);
    render(<PlainYearOverviewPanel annual={aYear} expectedSource={unknownDirection.synthesis.sourceBinding} />);
    for (const value of values) {
      const link = screen.getByRole("link", { name: value.label });
      expect(link.parentElement?.textContent).toContain(value.caption);
      expect(value.label).toContain(value.branchLabel);
    }
  });

  it("does not promote an actual conditional supporting axis into the clearly favorable group", () => {
    const candidates = [...bYear.years, ...aYear.years].flatMap(year => year.judgmentSegments
      .filter(segment => segment.judgment.label !== "较顺" && segment.judgment.axes.find(axis => axis.axis === segment.judgment.primaryAxis)?.effect === "assists")
      .map(segment => ({ year, segment })));
    expect(candidates.length).toBeGreaterThan(0);
    for (const { year, segment } of candidates) {
      const row = plainYearPeriods(year).find(value => value.segmentId === segment.id && value.branchId === segment.branchId)!;
      expect(row.group).not.toBe("favorable");
      expect(row.caption).not.toContain("较顺");
    }
  });

  it("lets a verified adopted domain suppress the automatic year labels rather than overruling the person's text", async () => {
    const year = bYear.years[0]!, domains = buildAnnualDomainReading({ revision: b.revision, assessment: b.assessment, year });
    const events = buildAnnualEventReading({ revision: b.revision, assessment: b.assessment, year, domains });
    const source = { revision: b.revision, assessment: b.assessment, year, domains, events }, story = buildAnnualLifeStory(source);
    const branch = domains.branches[0]!, segment = branch.segments[0]!, domain = segment.domains.find(item => item.id === "career")!;
    const choice: ReadingFeedbackChoice = { id: `annual-domain-${year.year}-${segment.id}-${domain.id}`, label: domain.title,
      originalConclusion: annualDomainFeedbackText(domains, branch, segment, domain), sourceVersions: [domains.version, ...domains.sourceVersions] };
    const personal = await adopted(b, [choice], "我已采用的本段工作说明。保留另一句和原条件。");
    const personalSources = Object.fromEntries(story.branches.flatMap(item => item.segments.map(period => [
      `${story.year}:${period.id}`, annualLifeStoryPersonalSources(story, period, personal, source)
    ])));
    expect(personalSources[`${story.year}:${segment.id}`]).toHaveLength(1);
    render(<PersonalReadingProvider reading={personal}><PlainYearOverviewPanel annual={bYear} expectedSource={b.synthesis.sourceBinding} personalSources={personalSources} /></PersonalReadingProvider>);
    expect(screen.getByRole("link", { name: "2029年 · 查看已采用原文" })).toBeTruthy();
    for (const value of plainYearPeriods(year)) expect(screen.queryByRole("link", { name: value.label })).toBeNull();
  });

  it("keeps an overview adoption complete and rejects a provider from another chart or hour scope", async () => {
    const text = "第一句采用原文。第二句保留，不能仅留标题。\n\n另一段同样保留。";
    const choice = { id: "annual-overview", label: "年度总览", originalConclusion: bYear.summary, sourceVersions: [bYear.version] };
    const personal = await adopted(b, [choice], text);
    const { container, rerender } = render(<PersonalReadingProvider reading={personal}><PlainYearOverviewPanel annual={bYear} expectedSource={b.synthesis.sourceBinding} /></PersonalReadingProvider>);
    expect(container.querySelector(".personal-reading-adopted p")?.textContent).toBe(text);
    for (const field of ["caseId", "revisionId", "chartResultHash", "includeHour"] as const) {
      const foreign = structuredClone(personal);
      if (field === "includeHour") foreign.sourceBinding[field] = !foreign.sourceBinding[field];
      else foreign.sourceBinding[field] = `different-${foreign.sourceBinding[field]}`;
      rerender(<PersonalReadingProvider reading={foreign}><PlainYearOverviewPanel annual={bYear} expectedSource={b.synthesis.sourceBinding} /></PersonalReadingProvider>);
      expect(container.querySelector(".personal-reading-adopted")).toBeNull();
      for (const value of plainYearPeriods(bYear.years[0]!)) expect(within(container).getByRole("link", { name: value.label })).toBeTruthy();
    }
  });
});
