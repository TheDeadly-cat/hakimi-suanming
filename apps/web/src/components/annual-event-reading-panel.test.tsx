import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment, type BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlook } from "../lib/local-annual-outlook";
import type { LocalAnnualYear } from "../lib/local-annual-outlook";
import { annualReaderParagraphLabel, buildAnnualReaderAnswer } from "../lib/annual-reader-answer";
import { buildAnnualDomainReading } from "../lib/local-annual-domain-reading";
import { buildAnnualEventReading, type LocalAnnualEventReading } from "../lib/local-annual-event-reading";
import { annualEventFeedbackSubjectId, annualEventFeedbackText } from "../lib/local-annual-event-record";
import { composeAnnualEvents } from "../lib/local-annual-event-composition";
import { annualEventCompositionFeedbackText, annualEventCompositionSubjectId } from "../lib/local-annual-event-composition-record";
import { LOCAL_PERSONAL_READING_VERSION, type LocalPersonalReading } from "../lib/local-personal-reading";
import { readingFeedbackSource } from "../lib/local-reading-feedback";
import { PersonalReadingProvider } from "./personal-reading-note";
import { AnnualEventReadingPanel } from "./annual-event-reading-panel";
import { buildAnnualLifeStory, type AnnualLifeStory } from "../lib/annual-life-story";
import { annualLifeStorySubjectId } from "../lib/annual-life-story-record";

let revision: RevisionRecord, assessment: BaziPreliminaryAssessment, reading: LocalAnnualEventReading, beforeBirth: LocalAnnualEventReading;
let settlement: LocalAnnualEventReading, settlementRevision: RevisionRecord, settlementAssessment: BaziPreliminaryAssessment;
let readingStory: AnnualLifeStory, settlementStory: AnnualLifeStory, neutralReading: LocalAnnualEventReading, neutralStory: AnnualLifeStory;
let settlementAnnualYear: LocalAnnualYear;
let neutralAnnualYear: LocalAnnualYear;
beforeAll(async () => {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26", timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "unspecified", lunarLeapMonth: false,
    location: { label: "Synthetic event UI", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111", caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00.000Z" });
  assessment = buildBaziPreliminaryAssessment(revision);
  const [current, past] = await Promise.all([buildLocalAnnualOutlook(revision, assessment, 2028), buildLocalAnnualOutlook(revision, assessment, 1990)]);
  const build = (year: typeof current.years[number]) => buildAnnualEventReading({ revision, assessment, year, domains: buildAnnualDomainReading({ revision, assessment, year }), contextual: null });
  reading = build(current.years[0]!); beforeBirth = build(past.years[0]!);
  readingStory = buildAnnualLifeStory({ revision, assessment, year: current.years[0]!, domains: buildAnnualDomainReading({ revision, assessment, year: current.years[0]! }), events: reading });
  const resourceChart = await calculateChart({ ...revision.input, date: "1995-05-18", sex: "male" }, WORKING_DEFAULT_RULE_PROFILE);
  settlementRevision = storedRevisionRecordSchema.parse({ ...resourceChart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
  settlementAssessment = buildBaziPreliminaryAssessment(settlementRevision);
  const settlementYear = (await buildLocalAnnualOutlook(settlementRevision, settlementAssessment, 2032)).years[0]!;
  settlementAnnualYear = settlementYear;
  settlement = buildAnnualEventReading({ revision: settlementRevision, assessment: settlementAssessment, year: settlementYear,
    domains: buildAnnualDomainReading({ revision: settlementRevision, assessment: settlementAssessment, year: settlementYear }) });
  settlementStory = buildAnnualLifeStory({ revision: settlementRevision, assessment: settlementAssessment, year: settlementYear,
    domains: buildAnnualDomainReading({ revision: settlementRevision, assessment: settlementAssessment, year: settlementYear }), events: settlement });
  const neutralYear = (await buildLocalAnnualOutlook(settlementRevision, settlementAssessment, 2029)).years[0]!;
  neutralAnnualYear = neutralYear;
  const neutralDomains = buildAnnualDomainReading({ revision: settlementRevision, assessment: settlementAssessment, year: neutralYear });
  neutralReading = buildAnnualEventReading({ revision: settlementRevision, assessment: settlementAssessment, year: neutralYear, domains: neutralDomains });
  neutralStory = buildAnnualLifeStory({ revision: settlementRevision, assessment: settlementAssessment, year: neutralYear, domains: neutralDomains, events: neutralReading });
});

const personalText = "本人已经离职，这段时间主要用于完成课程。\n这是我明确采用的个人表述；完整保留，不修改通用计算。";
function personal(subjectId: string, originalConclusion: string, adopted: boolean): LocalPersonalReading {
  return { version: LOCAL_PERSONAL_READING_VERSION, sourceBinding: { caseId: revision.caseId, revisionId: revision.id, chartResultHash: revision.manifest.resultHash, includeHour: true }, sourceVersions: [reading.version], issues: [],
    entries: [{ subjectId, subjectLabel: "本年此段情境", originalConclusion, readingVersions: [reading.version], state: adopted ? "adopted" : "feedback_only", personalText: adopted ? personalText : null, effectiveConclusion: adopted ? personalText : originalConclusion, issues: [], selectedReviewRefs: [],
      feedback: [{ rootRef: { noteId: "33333333-3333-4333-8333-333333333333", editVersion: 1, bodySha256: "a".repeat(64), createdAt: "2026-10-16T01:00:00.000Z" }, latestReviewRef: adopted ? { noteId: "44444444-4444-4444-8444-444444444444", editVersion: 1, bodySha256: "b".repeat(64), createdAt: "2026-10-16T02:00:00.000Z" } : null,
        rating: "partial", aspect: "适用职业背景", occurredAt: "2028 年", actualSituation: "合成反馈：原在职情境与此阶段实际安排不同。", requestedRevision: personalText,
        reviewState: adopted ? "revised" : null, reviewNotes: adopted ? "本人明确采用" : null, revisedConclusion: adopted ? personalText : null, source: readingFeedbackSource(assessment), canReview: true, chainIssues: [] }] }] };
}

function settlementPersonal(subjectId: string, originalConclusion: string): LocalPersonalReading {
  const model = personal(subjectId, originalConclusion, true), composed = composeAnnualEvents(settlement);
  model.sourceBinding = { ...composed.sourceBinding }; model.sourceVersions = composed.sourceVersions;
  model.entries[0]!.readingVersions = composed.sourceVersions;
  model.entries[0]!.feedback[0]!.source = readingFeedbackSource(settlementAssessment);
  return model;
}

describe("annual event first reading", () => {
  it("shows the same-source reader answer first, retains the original and falls back for a stale year", () => {
    const branch = settlementStory.branches[0]!, segment = branch.segments[0]!;
    const before = JSON.stringify([settlementAnnualYear, settlementStory, settlement]);
    const answer = buildAnnualReaderAnswer({ year: settlementAnnualYear, story: settlementStory, events: settlement, branchId: branch.id, segmentId: segment.id, revision: settlementRevision, assessment: settlementAssessment })!;
    const view = render(<AnnualEventReadingPanel reading={settlement} annualLifeStory={settlementStory} annualYear={settlementAnnualYear} revision={settlementRevision} assessment={settlementAssessment} />);
    const visible = view.container.querySelector("[data-annual-reader-version]")!;
    expect(visible).not.toBeNull();
    for (const paragraph of answer.paragraphs) {
      const found = within(visible as HTMLElement).getByText(paragraph.text, { normalizer: (text) => text });
      expect(Boolean(found.closest("details"))).toBe(Boolean(paragraph.detailsOnly));
      const label = found.parentElement!.querySelector(".annual-life-summary-label, strong");
      expect(label!.textContent).toBe(annualReaderParagraphLabel(paragraph));
    }
    const original = screen.getByText("查看年度原判断与作用依据").closest("details")!;
    expect(original.open).toBe(false);
    for (const paragraph of segment.paragraphs.filter((p) => p.kind !== "relationship")) expect(original.textContent).toContain(paragraph.text);
    const stale = structuredClone(settlementAnnualYear); stale.year += 1;
    view.rerender(<AnnualEventReadingPanel reading={settlement} annualLifeStory={settlementStory} annualYear={stale} revision={settlementRevision} assessment={settlementAssessment} />);
    expect(view.container.querySelector("[data-annual-reader-version]")).toBeNull();
    expect(view.container.querySelector(".annual-life-summary h6")?.textContent).toBe(segment.headline);
    const wrongAssessment = structuredClone(settlementAssessment);
    wrongAssessment.sourceBinding.chartResultHash = "another-chart";
    view.rerender(<AnnualEventReadingPanel reading={settlement} annualLifeStory={settlementStory} annualYear={settlementAnnualYear} revision={settlementRevision} assessment={wrongAssessment} />);
    expect(view.container.querySelector("[data-annual-reader-version]")).toBeNull();
    expect(view.container.querySelector(".annual-life-summary h6")?.textContent).toBe(segment.headline);
    expect(JSON.stringify([settlementAnnualYear, settlementStory, settlement])).toBe(before);
  });

  it("keeps an adopted source ahead of the new answer and leaves its original event card accessible", () => {
    const branch = settlement.branches[0]!, segment = branch.segments[0]!, item = segment.items[0]!;
    const source = settlementPersonal(annualEventFeedbackSubjectId(settlement.year, segment, item), annualEventFeedbackText(settlement, branch, segment, item));
    const view = render(<AnnualEventReadingPanel reading={settlement} annualLifeStory={settlementStory} annualYear={settlementAnnualYear}
      annualLifeStoryPersonalSources={{ [`${settlement.year}:${segment.id}`]: source.entries }} />);
    const summary = view.container.querySelector<HTMLElement>("[data-annual-story-segment]")!;
    expect(within(summary).getByText(personalText, { normalizer: (text) => text })).toBeTruthy();
    const automatic = within(summary).getByText("对照原自动年度总评").closest("details")!;
    expect(automatic.open).toBe(false);
    expect(automatic.querySelector("[data-annual-reader-version]")).not.toBeNull();
    expect(view.container.querySelector(".annual-reader-original-items")).toBeNull();
  });

  it("replaces the generic introduction with each exact segment's answer before the original concrete events", async () => {
    const onFeedback = vi.fn();
    const view = render(<AnnualEventReadingPanel reading={neutralReading} annualLifeStory={neutralStory} onFeedback={onFeedback} />);
    expect(screen.queryByText(neutralReading.headline, { selector: "h4" })).toBeNull();
    expect(screen.getByText(neutralStory.headline, { selector: "h4" })).toBeTruthy();
    for (const branch of neutralStory.branches) for (const segment of branch.segments) {
      const region = [...view.container.querySelectorAll<HTMLElement>("[data-segment-id]")].find((item) => item.dataset.segmentId === segment.id)!;
      const repeated = region.querySelector<HTMLDetailsElement>(".annual-event-reading-repeated");
      if (repeated) await userEvent.click(repeated.querySelector("summary")!);
      const summary = region.querySelector<HTMLElement>("[data-annual-story-segment]")!;
      expect(summary).not.toBeNull();
      for (const paragraph of segment.paragraphs) expect(within(summary).getByText(paragraph.text, { normalizer: (value) => value })).toBeTruthy();
      expect(summary.compareDocumentPosition(region.querySelector("[data-event-id]")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(region.querySelectorAll("[data-event-id]")).toHaveLength(neutralReading.branches.find((item) => item.id === branch.id)!.segments.find((item) => item.id === segment.id)!.items.length);
      await userEvent.click(within(summary).getByRole("link", { name: "反馈这段年度总评" }));
      expect(onFeedback).toHaveBeenLastCalledWith(annualLifeStorySubjectId(neutralStory, segment));
    }
  });

  it("retains all unknown-direction handover summaries and rejects stale source or moved-period summaries", () => {
    const view = render(<AnnualEventReadingPanel reading={reading} annualLifeStory={readingStory} />);
    expect(view.container.querySelectorAll("[data-annual-story-segment]")).toHaveLength(3);
    for (const branch of readingStory.branches) {
      const region = screen.getByRole("region", { name: branch.label });
      expect(region.querySelectorAll("[data-annual-story-segment]")).toHaveLength(branch.segments.length);
    }
    const wrongSource = structuredClone(readingStory); wrongSource.sourceBinding.chartResultHash = "foreign";
    const wrongTime = structuredClone(readingStory); wrongTime.branches[0]!.segments[0]!.startInstant = "2028-06-01T00:00:00.000Z";
    for (const stale of [wrongSource, wrongTime, settlementStory]) {
      view.rerender(<AnnualEventReadingPanel reading={reading} annualLifeStory={stale} />);
      expect(view.container.querySelector("[data-annual-story-segment]")).toBeNull();
      expect(screen.getByText(reading.headline, { selector: "h4" })).toBeTruthy();
      expect(view.container.querySelectorAll("[data-event-id]").length).toBeGreaterThan(0);
    }
  });

  it("folds only the summary whose original source has an adopted entry supplied by the container", () => {
    const branch = reading.branches.find((item) => item.id === "backward")!, segment = branch.segments[0]!, item = segment.items[0]!;
    const source = personal(annualEventFeedbackSubjectId(reading.year, segment, item), annualEventFeedbackText(reading, branch, segment, item), true);
    const view = render(<AnnualEventReadingPanel reading={reading} annualLifeStory={readingStory}
      annualLifeStoryPersonalSources={{ [`${reading.year}:${segment.id}`]: source.entries }} />);
    const summaries = [...view.container.querySelectorAll<HTMLElement>("[data-annual-story-segment]")];
    const affected = summaries.find((summary) => summary.dataset.annualStorySegment === segment.id)!;
    expect(within(affected).getByText(personalText, { normalizer: (value) => value })).toBeTruthy();
    const comparison = within(affected).getByText("对照原自动年度总评").closest("details")!;
    expect(comparison.open).toBe(false);
    const original = readingStory.branches.find((entry) => entry.id === branch.id)!.segments[0]!;
    for (const paragraph of original.paragraphs) expect(comparison.textContent).toContain(paragraph.text);
    for (const summary of summaries.filter((entry) => entry !== affected)) {
      expect(within(summary).queryByText("对照原自动年度总评")).toBeNull();
      expect(summary.querySelector("[data-annual-story-kind]")).not.toBeNull();
    }
  });

  it("reads a single segment once without repeating its mainline in a second introduction", () => {
    const view = render(<AnnualEventReadingPanel reading={settlement} annualLifeStory={settlementStory} />);
    const segment = settlementStory.branches[0]!.segments[0]!;
    const mainline = segment.paragraphs.find((paragraph) => paragraph.kind === "mainline")!;
    const copies = screen.getAllByText(mainline.text, { normalizer: (text) => text });
    expect(copies.filter(node => !node.closest("details:not([open])"))).toHaveLength(1);
    expect(copies.some(node => node.closest(".annual-event-reading-members"))).toBe(true);
    expect(view.container.querySelector(".annual-event-reading-summary")).toBeNull();
    expect(view.container.querySelector("[data-composition-id]")).not.toBeNull();
  });

  it("reads an exactly bound relationship paragraph once and links the summary to its own concrete item", () => {
    const before = JSON.stringify([settlement, settlementStory]);
    const view = render(<AnnualEventReadingPanel reading={settlement} annualLifeStory={settlementStory} />);
    const segment = settlementStory.branches[0]!.segments[0]!, paragraph = segment.paragraphs.find((item) => item.kind === "relationship")!;
    expect(screen.getAllByText(paragraph.text, { normalizer: (text) => text })).toHaveLength(1);
    const link = screen.getByRole("link", { name: /^关系重点/u });
    const destination = view.container.querySelector(`[data-event-id="${paragraph.eventItemIds[0]}"]`)!;
    expect(decodeURIComponent(link.getAttribute("href")!.slice(1))).toBe(destination.id);
    const different = structuredClone(settlementStory);
    different.branches[0]!.segments[0]!.paragraphs.find((item) => item.kind === "relationship")!.eventItemIds = ["another-item"];
    view.rerender(<AnnualEventReadingPanel reading={settlement} annualLifeStory={different} />);
    expect(screen.queryByRole("link", { name: /^关系重点/u })).toBeNull();
    expect(screen.getAllByText(paragraph.text, { normalizer: (text) => text })).toHaveLength(2);
    expect(JSON.stringify([settlement, settlementStory])).toBe(before);
  });

  it("keeps the real B2029 handover changes open with both periods and original conditions", async () => {
    const before = JSON.stringify([neutralReading, neutralStory]);
    const feedback = vi.fn();
    const view = render(<AnnualEventReadingPanel reading={neutralReading} annualLifeStory={neutralStory} annualYear={neutralAnnualYear} onFeedback={feedback} />);
    const originals = neutralReading.branches[0]!.segments;
    const sections = [...view.container.querySelectorAll<HTMLElement>("[data-segment-id]")];
    expect(sections).toHaveLength(2);
    expect(sections[0]!.querySelector(".annual-event-reading-repeated")).toBeNull();
    expect(sections[1]!.querySelector(".annual-event-reading-repeated")).toBeNull();
    expect(neutralStory.branches[0]!.segments[0]!.paragraphs).not.toEqual(neutralStory.branches[0]!.segments[1]!.paragraphs);
    originals.forEach((source, index) => {
      const section = sections[index]!;
      expect(section.querySelector("time")!.dateTime).toBe(source.startInstant);
      expect(section.querySelectorAll("time")[1]!.dateTime).toBe(source.endExclusiveInstant);
      expect(within(section).getByText(source.ageLabel)).toBeTruthy();
      for (const condition of source.conditions) expect(section.textContent).toContain(condition);
      for (const item of source.items) {
        const event = section.querySelector(`[data-event-id="${item.id}"]`)!;
        for (const text of [item.summary, ...item.examples, ...item.why, ...item.conditions, ...item.evidence]) expect(event.textContent).toContain(text);
      }
    });
    await userEvent.click(within(sections[1]!).getByRole("link", { name: "反馈这段年度总评" }));
    expect(feedback).toHaveBeenCalledWith(annualLifeStorySubjectId(neutralStory, neutralStory.branches[0]!.segments[1]!));
    expect(JSON.stringify([neutralReading, neutralStory])).toBe(before);
  });

  it("keeps scoped personal revisions and unadopted feedback visible instead of folding them with repeated automatic prose", () => {
    const segment = neutralReading.branches[0]!.segments[1]!, item = segment.items[0]!;
    const source = settlementPersonal(annualEventFeedbackSubjectId(neutralReading.year, segment, item), item.summary);
    const view = render(<PersonalReadingProvider reading={source}><AnnualEventReadingPanel reading={neutralReading} annualLifeStory={neutralStory} /></PersonalReadingProvider>);
    expect(view.container.querySelector(".annual-event-reading-repeated")).toBeNull();
    expect(view.container.querySelector(".personal-reading-adopted > p")!.textContent).toBe(personalText);
    const retained = structuredClone(source); retained.entries[0]!.state = "needs_more"; retained.entries[0]!.personalText = null;
    view.rerender(<PersonalReadingProvider reading={retained}><AnnualEventReadingPanel reading={neutralReading} annualLifeStory={neutralStory} /></PersonalReadingProvider>);
    expect(view.container.querySelector(".annual-event-reading-repeated")).toBeNull();
    expect(view.container.querySelector(".personal-reading-adopted")).toBeNull();
    expect(screen.getByText("当前仍显示原解读，待补充更多事实。")).toBeTruthy();
    const unrelated = structuredClone(source); unrelated.sourceBinding.chartResultHash = "another-chart";
    view.rerender(<PersonalReadingProvider reading={unrelated}><AnnualEventReadingPanel reading={neutralReading} annualLifeStory={neutralStory} /></PersonalReadingProvider>);
    expect(view.container.querySelector(".annual-event-reading-repeated")).toBeNull();
    expect(view.container.querySelector(".personal-reading-adopted")).toBeNull();
  });

  it("does not fold different examples, applicability or age-stage transitions even under the same headline", () => {
    const view = render(<AnnualEventReadingPanel reading={neutralReading} annualLifeStory={neutralStory} />);
    for (const change of ["examples", "applicability", "notApplicableWhen", "age"] as const) {
      const changed = structuredClone(neutralReading), story = structuredClone(neutralStory);
      const next = changed.branches[0]!.segments[1]!;
      if (change === "age") {
        next.age.stage = "adult_transition"; next.age.segments[0]!.stage = "youth";
        story.branches[0]!.segments[1]!.age = structuredClone(next.age);
      } else next.items[0]![change].push(`只适用于当前时段的${change}`);
      view.rerender(<AnnualEventReadingPanel reading={changed} annualLifeStory={story} />);
      expect(view.container.querySelectorAll("[data-annual-story-segment]")).toHaveLength(2);
      expect(view.container.querySelector(".annual-event-reading-repeated")).toBeNull();
    }
  });

  it("keeps null and genuine pre-birth input free of personal event or feedback claims", () => {
    const { container, rerender } = render(<AnnualEventReadingPanel reading={null} />); expect(container.innerHTML).toBe("");
    expect(beforeBirth.status).toBe("before_birth");
    rerender(<AnnualEventReadingPanel reading={beforeBirth} onFeedback={vi.fn()} />);
    expect(screen.getByText(beforeBirth.summary, { selector: ".annual-event-reading-summary" })).toBeTruthy(); expect(screen.queryByRole("article")).toBeNull(); expect(screen.queryByRole("link")).toBeNull();
  });

  it("shows actual parallel branches and real within-year handover intervals without combining or ranking them", () => {
    const before = JSON.stringify(reading); render(<AnnualEventReadingPanel reading={reading} />);
    const forward = reading.branches.find((branch) => branch.id === "forward")!, backward = reading.branches.find((branch) => branch.id === "backward")!;
    expect(forward.segments).toHaveLength(1); expect(backward.segments).toHaveLength(2);
    for (const branch of reading.branches) {
      const region = screen.getByRole("region", { name: branch.label });
      const segments = [...region.querySelectorAll<HTMLElement>("[data-segment-id]")];
      expect(segments.map((item) => item.dataset.segmentId)).toEqual(branch.segments.map((item) => item.id));
      branch.segments.forEach((segment, index) => {
        const section = segments[index]!;
        expect(section.querySelectorAll("time")[0]!.dateTime).toBe(segment.startInstant);
        expect(section.querySelectorAll("time")[1]!.dateTime).toBe(segment.endExclusiveInstant);
        if (segment.backgroundLabels.length) expect(within(section).getByText(segment.backgroundLabels.join(" · "))).toBeTruthy();
        expect(within(section).getByText(segment.judgmentCaption)).toBeTruthy();
        expect([...section.querySelectorAll<HTMLElement>("[data-event-id]")].map((item) => item.dataset.eventId)).toEqual(segment.items.map((item) => item.id));
        expect([...section.querySelectorAll(".annual-event-reading-priority")].map((item) => item.textContent)).toEqual(segment.items.map((item) => item.priority === "primary" ? "优先对照" : "同时留意"));
      });
    }
    expect(backward.segments[0]!.endExclusiveInstant).toBe(backward.segments[1]!.startInstant);
    expect(JSON.stringify(reading)).toBe(before);
    expect(document.body.textContent).not.toMatch(/\d+(?:\.\d+)?\s*%|概率[：:为]\s*\d/u);
  });

  it("keeps answers and examples visible while preserving every reason inside expandable evidence", async () => {
    render(<AnnualEventReadingPanel reading={reading} />);
    for (const branch of reading.branches) {
      const region = screen.getByRole("region", { name: branch.label });
      for (const segment of branch.segments) {
        const section = [...region.querySelectorAll<HTMLElement>("[data-segment-id]")].find((item) => item.dataset.segmentId === segment.id)!;
        for (const item of segment.items) {
          const article = [...section.querySelectorAll<HTMLElement>("[data-event-id]")].find((element) => element.dataset.eventId === item.id)!;
          for (const text of [item.summary, ...item.examples.slice(0, 2), ...item.applicability]) {
            // Parallel perspectives retain their actual paragraph breaks.
            expect(within(article).getAllByText(text, { normalizer: (value) => value }).some((element) => !element.closest("details:not([open])"))).toBe(true);
          }
          const scope = within(article).getByText("阅读范围与不宜套用的情况").closest("details")!;
          expect(scope.open).toBe(false);
          await userEvent.click(within(article).getByText("阅读范围与不宜套用的情况")); expect(scope.open).toBe(true);
          for (const text of item.notApplicableWhen) expect(scope.textContent).toContain(text);
          const details = within(article).getByText("这项情境的完整条件与来源").closest("details")!; expect(details.open).toBe(false);
          await userEvent.click(within(article).getByText("这项情境的完整条件与来源")); expect(details.open).toBe(true);
          for (const text of [...item.conditions, ...item.evidence, ...item.why]) expect(details.textContent).toContain(text);
        }
      }
    }
  });

  it("routes feedback to the exact formatter subject while escaping source text", async () => {
    const copy = structuredClone(reading), branch = copy.branches.find((item) => item.id === "backward")!, segment = branch.segments[1]!, item = segment.items[0]!;
    item.evidence.push('<img src=x onerror="alert(1)">仅作原文显示');
    item.examples = ["合成首项情境", "合成第二项情境", "合成第三项情境完整保留"];
    item.why = ["合成主理由", "合成第二理由", "合成第三理由完整保留"];
    const callback = vi.fn(), { container } = render(<AnnualEventReadingPanel reading={copy} onFeedback={callback} />);
    const region = screen.getByRole("region", { name: branch.label });
    const section = [...region.querySelectorAll<HTMLElement>("[data-segment-id]")].find((element) => element.dataset.segmentId === segment.id)!;
    const article = [...section.querySelectorAll<HTMLElement>("[data-event-id]")].find((element) => element.dataset.eventId === item.id)!;
    const link = within(article).getByRole("link", { name: "反馈这项情境" }); expect(link.getAttribute("href")).toBe("#reading-feedback");
    await userEvent.click(link);
    expect(callback).toHaveBeenCalledExactlyOnceWith(annualEventFeedbackSubjectId(copy.year, segment, item));
    expect(callback).toHaveBeenCalledWith(`annual-event-${copy.year}-${segment.id}-${item.id}`);
    expect(within(article).getByText(item.evidence.at(-1)!)).toBeTruthy(); expect(container.querySelector("img")).toBeNull();
    expect(within(article).getByText("合成首项情境").closest("details:not([open])")).toBeNull();
    expect(within(article).getByText("合成第三项情境完整保留").closest("details:not([open])")).not.toBeNull();
    expect(within(article).getByText("合成主理由").closest("details:not([open])")).not.toBeNull();
    expect(within(article).getByText("合成第三理由完整保留").closest("details:not([open])")).not.toBeNull();
    await userEvent.click(within(article).getByText("这项情境的完整条件与来源"));
    expect(within(article).getByText("合成第三项情境完整保留").closest("details:not([open])")).toBeNull();
    expect(within(article).getByText("合成第三理由完整保留").closest("details:not([open])")).toBeNull();
  });

  it("uses adopted personal text only for its own item, retaining original applicability and an accessible feedback link", async () => {
    const copy = structuredClone(reading), branch = copy.branches.find((item) => item.id === "backward")!, segment = branch.segments[1]!, item = segment.items[0]!;
    item.applicability = ["若仍在职，此项用于对照职责与交付安排。"];
    const subjectId = annualEventFeedbackSubjectId(copy.year, segment, item), callback = vi.fn();
    render(<PersonalReadingProvider reading={personal(subjectId, annualEventFeedbackText(copy, branch, segment, item), true)}><AnnualEventReadingPanel reading={copy} onFeedback={callback} /></PersonalReadingProvider>);
    expect(screen.getAllByText("已采用的个人修订")).toHaveLength(1);
    const personalRegion = screen.getByRole("region", { name: "本年此段情境 · 个人阅读" });
    expect(personalRegion.querySelector(".personal-reading-adopted > p")!.textContent).toBe(personalText);
    const original = within(personalRegion).getByText("对照原计算解读").closest("details")!; expect(original.open).toBe(false);
    expect(within(original).getByText(item.summary, { normalizer: (value) => value })).toBeTruthy();
    const article = personalRegion.closest("article")!;
    expect(within(article).getByText(item.applicability[0]!).closest("details:not([open])")).toBeNull();
    expect(article.textContent!.indexOf(personalText)).toBeLessThan(article.textContent!.indexOf("原判断适用情境"));
    expect(within(article).getByText("原判断适用情境")).toBeTruthy();
    const link = within(article).getByRole("link", { name: "反馈这项情境" }); expect(original.contains(link)).toBe(false);
    await userEvent.click(link); expect(callback).toHaveBeenCalledExactlyOnceWith(subjectId);
  });

  it("does not adopt an unreviewed proposal or invent a feedback action", () => {
    const branch = reading.branches[0]!, segment = branch.segments[0]!, item = segment.items[0]!, subjectId = annualEventFeedbackSubjectId(reading.year, segment, item);
    render(<PersonalReadingProvider reading={personal(subjectId, annualEventFeedbackText(reading, branch, segment, item), false)}><AnnualEventReadingPanel reading={reading} /></PersonalReadingProvider>);
    expect(screen.queryByText("已采用的个人修订")).toBeNull(); expect(screen.getByText("尚未采用的个人修订建议")).toBeTruthy(); expect(screen.queryByRole("link")).toBeNull();
  });

  it("shows partial gaps without borrowing a missing segment and suppresses stale personal content for unavailable status", () => {
    const copy = structuredClone(reading), branch = copy.branches[0]!, original = branch.segments[0]!;
    copy.status = "partial"; copy.branches = [branch]; branch.segments = [];
    branch.gaps = [{ startInstant: original.startInstant, endExclusiveInstant: original.endExclusiveInstant, message: "合成缺口：本段未生成判断，不能借相邻大运补齐。" }];
    const view = render(<AnnualEventReadingPanel reading={copy} onFeedback={vi.fn()} />);
    expect(screen.getByText(branch.gaps[0]!.message)).toBeTruthy(); expect(screen.queryByRole("article")).toBeNull(); expect(screen.queryByRole("link")).toBeNull();
    view.rerender(<AnnualEventReadingPanel reading={{ ...reading, status: "unavailable", summary: "当前无法形成个人情境。" }} onFeedback={vi.fn()} />);
    expect(screen.getByText("当前无法形成个人情境。")).toBeTruthy(); expect(screen.queryByRole("article")).toBeNull(); expect(screen.queryByRole("link")).toBeNull();
  });

  it("presents real B2032 as one matter with two complete facets, while preserving both original feedback routes", async () => {
    const composed = composeAnnualEvents(settlement), branch = settlement.branches[0]!, segment = branch.segments[0]!, group = composed.branches[0]!.segments[0]!.items[0]!;
    expect(group.kind).toBe("settlement"); if (group.kind !== "settlement") throw new Error("Expected actual settlement pair");
    const callback = vi.fn(), { container } = render(<AnnualEventReadingPanel reading={settlement} onFeedback={callback} />);
    const article = container.querySelector<HTMLElement>("[data-composition-id]")!;
    const visibleArticles = screen.getAllByRole("article").filter((element) => !element.closest("details:not([open])"));
    expect(visibleArticles).toHaveLength(2);
    expect(visibleArticles.filter((element) => element.hasAttribute("data-composition-id"))).toEqual([article]);
    const relationship = segment.items.filter((item) => item.domain === "relationship");
    expect(relationship).toHaveLength(1);
    const relationshipArticle = container.querySelector<HTMLElement>(`[data-event-id="${relationship[0]!.id}"]`)!;
    expect(visibleArticles).toContain(relationshipArticle); expect(article.contains(relationshipArticle)).toBe(false);
    expect(group.members.map((member) => member.domain)).toEqual(["career", "wealth"]);
    expect(within(relationshipArticle).getByText(relationship[0]!.summary).closest("details:not([open])")).toBeNull();
    await userEvent.click(within(relationshipArticle).getByRole("link", { name: "反馈这项情境" }));
    expect(callback).toHaveBeenLastCalledWith(annualEventFeedbackSubjectId(2032, segment, relationship[0]!));
    expect(within(article).getAllByText(group.title).some((element) => !element.closest("details:not([open])"))).toBe(true);
    expect(within(article).getByText(group.summary).closest("details:not([open])")).toBeNull();
    for (const member of group.members) {
      const facet = within(article).getByRole("region", { name: member.domain === "career" ? "事业侧解释" : "资源侧解释" });
      expect(within(facet).getByText(member.summary)).toBeTruthy(); expect(within(facet).getByText(member.examples[0]!)).toBeTruthy();
    }
    const details = within(article).getByText("原事业与资源解读、依据和反馈").closest("details")!;
    expect(details.open).toBe(false);
    for (const member of group.members) for (const text of [member.title, member.summary, ...member.examples, ...member.why, ...member.evidence, ...member.conditions, ...member.applicability]) expect(details.textContent).toContain(text);
    const composedLink = within(article).getByRole("link", { name: "反馈这项收尾事项" });
    expect(composedLink.getAttribute("href")).toBe("#reading-feedback"); await userEvent.click(composedLink);
    expect(callback).toHaveBeenLastCalledWith(annualEventCompositionSubjectId(2032, segment, group));
    await userEvent.click(within(article).getByText("原事业与资源解读、依据和反馈"));
    for (const member of group.members) {
      const original = details.querySelector<HTMLElement>(`[data-event-id="${member.id}"]`)!;
      await userEvent.click(within(original).getByRole("link", { name: "反馈这项情境" }));
      expect(callback).toHaveBeenLastCalledWith(annualEventFeedbackSubjectId(2032, segment, member));
    }
    expect(document.body.textContent).not.toMatch(/\d+(?:\.\d+)?\s*%|概率[：:为]\s*\d/u);
  });

  it("does not transfer a member adoption to the whole matter, and keeps composite adoption separately scoped", async () => {
    const composed = composeAnnualEvents(settlement), branch = settlement.branches[0]!, segment = branch.segments[0]!, group = composed.branches[0]!.segments[0]!.items[0]!;
    if (group.kind !== "settlement") throw new Error("Expected actual settlement pair");
    const member = group.members[0], memberId = annualEventFeedbackSubjectId(2032, segment, member), groupId = annualEventCompositionSubjectId(2032, segment, group);
    const view = render(<PersonalReadingProvider reading={settlementPersonal(memberId, annualEventFeedbackText(settlement, branch, segment, member))}><AnnualEventReadingPanel reading={settlement} onFeedback={vi.fn()} /></PersonalReadingProvider>);
    expect(screen.getByText(group.summary).closest("details:not([open])")).toBeNull();
    const careerFacet = screen.getByRole("region", { name: "事业侧解释" });
    const memberRegion = within(careerFacet).getByRole("region", { name: "本年此段情境 · 个人阅读" });
    expect(memberRegion.querySelector(".personal-reading-adopted > p")!.textContent).toBe(personalText);
    expect(memberRegion.closest("details:not([open])")).toBeNull();
    expect(within(memberRegion).getByText(member.summary).closest("details:not([open])")).not.toBeNull();
    expect(within(screen.getByRole("region", { name: "资源侧解释" })).queryByText("已采用的个人修订")).toBeNull();
    await userEvent.click(screen.getByText("原事业与资源解读、依据和反馈"));
    const memberOriginal = view.container.querySelector<HTMLElement>(`[data-event-id="${member.id}"]`)!;
    expect(within(memberOriginal).getByRole("region", { name: "本年此段情境 · 个人阅读" })).toBeTruthy();
    const compositePersonal = settlementPersonal(groupId, annualEventCompositionFeedbackText(settlement, branch, segment, group));
    view.rerender(<PersonalReadingProvider reading={compositePersonal}><AnnualEventReadingPanel reading={settlement} onFeedback={vi.fn()} /></PersonalReadingProvider>);
    const region = screen.getByRole("region", { name: "本年此段情境 · 个人阅读" });
    expect(region.closest("[data-event-id]")).toBeNull();
    expect(region.contains(screen.getByRole("region", { name: "事业侧解释" }))).toBe(false);
    expect(region.contains(screen.getByRole("region", { name: "资源侧解释" }))).toBe(false);
    expect(region.querySelector(".personal-reading-adopted > p")!.textContent).toBe(personalText);
    expect(within(region).getByText(group.summary).closest("details:not([open])")).not.toBeNull();
    const originals = screen.getByText("原事业与资源解读、依据和反馈").closest("details")!;
    expect(region.contains(originals)).toBe(false);
    for (const original of group.members) expect(originals.querySelector(`[data-event-id="${original.id}"]`)).not.toBeNull();
    expect(screen.getByRole("link", { name: "反馈这项收尾事项" }).closest("details:not([open])")).toBeNull();
  });
});
