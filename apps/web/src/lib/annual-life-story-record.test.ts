import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type ResearchNoteRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlook, buildLocalAnnualOutlookRange } from "./local-annual-outlook";
import { ANNUAL_DOMAIN_READING_VERSION, buildAnnualDomainReading } from "./local-annual-domain-reading";
import { annualDomainFeedbackText, type LocalReadingAnnualDomains } from "./local-annual-domain-record";
import { annualEventFeedbackSubjectId, annualEventFeedbackText, buildReadingAnnualEvents } from "./local-annual-event-record";
import { annualEventCompositionChoices } from "./local-annual-event-composition-record";
import { buildReadingAnnualLifeStories, type BuildReadingAnnualLifeStoriesInput, type BuildAnnualLifeStoryInput, type AnnualLifeStory, type AnnualLifeStorySegment } from "./annual-life-story";
import { annualLifeStorySubjectId, annualLifeStoryFeedbackText, annualLifeStoryFeedbackVersions, annualLifeStoryPersonalSources, describeReadingAnnualLifeStories } from "./annual-life-story-record";
import { buildReadingFeedbackChoices, buildStructuredReadingFeedback, buildReadingFeedbackReview, readingFeedbackSource, type ReadingFeedbackChoice } from "./local-reading-feedback";
import { buildLocalPersonalReading } from "./local-personal-reading";
import { buildReadingContextRecord, resolveReadingContext, LOCAL_READING_CONTEXT_TAG } from "./local-reading-context";
import { buildContextualReadingBundle, contextualFeedbackText, contextualFeedbackVersions } from "./local-contextual-reading-record";
import { buildLocalReadingSnapshot } from "./local-reading-record";

function domainsFor(input: Pick<BuildReadingAnnualLifeStoriesInput, "revision" | "assessment" | "annual">): LocalReadingAnnualDomains {
  return { version: ANNUAL_DOMAIN_READING_VERSION, revisionId: input.revision.id, chartResultHash: input.revision.manifest.resultHash,
    includeHour: input.assessment.sourceBinding.includeHour, startYear: input.annual.startYear, endYear: input.annual.endYear,
    years: input.annual.years.map((year) => buildAnnualDomainReading({ ...input, year })) };
}
async function fixture(date: string, sex: "male" | "unspecified"): Promise<BuildReadingAnnualLifeStoriesInput> {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time: "08:26", timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex, lunarLeapMonth: false,
    location: { label: "Synthetic annual life record", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
  const assessment = buildBaziPreliminaryAssessment(revision), annual = await buildLocalAnnualOutlook(revision, assessment, 2026);
  const annualDomains = domainsFor({ revision, assessment, annual }), annualEvents = buildReadingAnnualEvents({ revision, assessment, annual, annualDomains });
  return { revision, assessment, annual, annualDomains, annualEvents };
}
let a: BuildReadingAnnualLifeStoriesInput, b: BuildReadingAnnualLifeStoriesInput;
let aStories: ReturnType<typeof buildReadingAnnualLifeStories>, bStories: ReturnType<typeof buildReadingAnnualLifeStories>;
beforeAll(async () => { [a, b] = await Promise.all([fixture("1995-08-18", "unspecified"), fixture("1995-05-18", "male")]);
  aStories = buildReadingAnnualLifeStories(a); bStories = buildReadingAnnualLifeStories(b); });
function yearInput(source: BuildReadingAnnualLifeStoriesInput, year: number): BuildAnnualLifeStoryInput {
  return { revision: source.revision, assessment: source.assessment, year: source.annual.years.find((item) => item.year === year)!,
    domains: source.annualDomains.years.find((item) => item.year === year)!, events: source.annualEvents.years.find((item) => item.year === year)!, contextual: source.contextual };
}
function ownChoice(story: AnnualLifeStory, segment: AnnualLifeStorySegment): ReadingFeedbackChoice {
  return { id: annualLifeStorySubjectId(story, segment), label: segment.headline,
    originalConclusion: annualLifeStoryFeedbackText(story, segment), sourceVersions: annualLifeStoryFeedbackVersions(story, segment) };
}
function note(source: BuildReadingAnnualLifeStoriesInput, body: string, minute: number, tags: string[]): ResearchNoteRecord {
  return { schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: source.revision.caseId, anchor: { kind: "revision", revisionId: source.revision.id }, bodyFormat: "markdown", body,
    tags, sourceRefs: [], lifecycle: "active", editVersion: 1, createdAt: `2026-10-16T00:0${minute}:00Z`, updatedAt: `2026-10-16T00:0${minute}:00Z` };
}
async function personalFor(source: BuildReadingAnnualLifeStoriesInput, choice: ReadingFeedbackChoice, state: "revised" | "retained" | "needs_more" | "proposal" = "revised") {
  const root = note(source, buildStructuredReadingFeedback(source.assessment, { subjectId: choice.id, subjectLabel: choice.label,
    originalConclusion: choice.originalConclusion, sourceVersions: choice.sourceVersions, rating: "partial", aspect: "合成年度总评",
    occurredAt: "2032", actualSituation: "合成反馈，不代表真实经历。", requestedRevision: "保留我的个人说明。" }), 1, ["解读反馈"]);
  const records = [root];
  if (state !== "proposal") records.push(note(source, await buildReadingFeedbackReview(root, null, readingFeedbackSource(source.assessment, choice.sourceVersions), {
    state, notes: "本人明确复核", revisedConclusion: state === "revised" ? "个人原文：本段以我确认的生活主线阅读。" : "", occurredAt: "2032"
  }), 2, ["解读反馈", "解读反馈复核"]));
  return buildLocalPersonalReading({ revision: source.revision, assessment: source.assessment, choices: [choice], records });
}

describe("annual life story exact originals and additive report", () => {
  it("records every original branch/segment and all new paragraphs, refs and conditions once without changing the inputs", () => {
    const before = JSON.stringify(a), text = describeReadingAnnualLifeStories(aStories, a).join("\n"), ids: string[] = [];
    expect(aStories.version).toBe("hakimi.annual-life-story/0.4.0");
    const story = aStories.years.find((item) => item.year === 2028)!;
    expect(story.branches.map((branch) => [branch.id, branch.segments.length])).toEqual([["forward", 1], ["backward", 2]]);
    expect(story.branches[1]!.segments[0]!.endExclusiveInstant).toBe("2028-12-20T20:58:00.000Z");
    for (const year of aStories.years) for (const branch of year.branches) for (const segment of branch.segments) {
      ids.push(annualLifeStorySubjectId(year, segment)); const feedback = annualLifeStoryFeedbackText(year, segment);
      expect(feedback.length).toBeLessThanOrEqual(30_000); expect(annualLifeStoryFeedbackVersions(year, segment)).toHaveLength(3);
      expect(annualLifeStoryFeedbackVersions(year, segment)[0]).toBe("hakimi.annual-life-story/0.4.0");
      expect(text).toContain(feedback); expect(feedback).toContain(JSON.stringify(segment.sourceVersions));
      expect(feedback).toContain(JSON.stringify(segment.backgroundRefs)); expect(feedback).not.toContain("总评覆盖年份");
      for (const paragraph of segment.paragraphs) { expect(feedback).toContain(paragraph.text); expect(feedback).toContain(JSON.stringify(paragraph.basisRefs)); }
      for (const condition of segment.conditions) expect(feedback).toContain(condition);
    }
    expect(new Set(ids).size).toBe(ids.length); expect(ids.every((id) => id.length <= 500)).toBe(true);
    expect(JSON.stringify(a)).toBe(before);
  });
  it("rejects changed prose, missing year/version and cross-branch or shifted original references at save", () => {
    for (const change of [
      (copy: typeof aStories) => { copy.years[0]!.branches[0]!.segments[0]!.paragraphs[0]!.text += "新断言"; },
      (copy: typeof aStories) => { copy.years.pop(); },
      (copy: typeof aStories) => { copy.years[0]!.branches[0]!.segments[0]!.sourceVersions = [copy.version]; },
      (copy: typeof aStories) => { const year = copy.years.find((item) => item.year === 2028)!; year.branches[0]!.segments[0]!.backgroundRefs = year.branches[1]!.segments[0]!.backgroundRefs; },
      (copy: typeof aStories) => { copy.years[0]!.branches[0]!.segments[0]!.startInstant = "2026-01-01T00:00:00Z"; }
    ]) { const copy = structuredClone(aStories); change(copy); expect(() => describeReadingAnnualLifeStories(copy, a)).toThrow("不一致"); }
    expect(() => describeReadingAnnualLifeStories(bStories, a)).toThrow();
  });
  it("recognizes explicit current year/domain/member/composition and own adoption while retaining the full automatic original", async () => {
    const story = bStories.years.find((item) => item.year === 2032)!, segment = story.branches[0]!.segments[0]!, source = yearInput(b, 2032);
    const domainBranch = source.domains.branches[0]!, domainSegment = domainBranch.segments[0]!, domain = domainSegment.domains[0]!;
    const eventBranch = source.events.branches[0]!, eventSegment = eventBranch.segments[0]!, item = eventSegment.items[0]!;
    const composed = annualEventCompositionChoices(b.annualEvents).filter((choice) => choice.id.startsWith(`annual-event-composed-2032-${segment.id}-`));
    expect(composed).toHaveLength(1);
    const choices: ReadingFeedbackChoice[] = [ownChoice(story, segment), ...buildReadingFeedbackChoices(b.assessment, b.annual, []).filter((choice) => choice.id === "annual-2032"),
      { id: `annual-domain-2032-${segment.id}-${domain.id}`, label: domain.title, originalConclusion: annualDomainFeedbackText(source.domains, domainBranch, domainSegment, domain), sourceVersions: [source.domains.version, ...source.domains.sourceVersions] },
      { id: annualEventFeedbackSubjectId(2032, eventSegment, item), label: item.title, originalConclusion: annualEventFeedbackText(source.events, eventBranch, eventSegment, item), sourceVersions: [b.annualEvents.version, ...source.events.sourceVersions] }, ...composed];
    for (const choice of choices) {
      const personal = await personalFor(b, choice);
      expect(annualLifeStoryPersonalSources(story, segment, personal, source).map((entry) => entry.subjectId)).toEqual([choice.id]);
      const text = describeReadingAnnualLifeStories(bStories, b, personal).join("\n");
      expect(text).toContain(personal.entries[0]!.personalText!); expect(text).toContain(JSON.stringify(personal.entries[0]!.selectedReviewRefs));
      expect(text).toContain(annualLifeStoryFeedbackText(story, segment)); expect(text).toContain("原计算对照");
    }
  });
  it("never transfers a source adoption across A's branches/transition, or applies unconfirmed, restored or stale text", async () => {
    const story = aStories.years.find((item) => item.year === 2028)!, source = yearInput(a, 2028), segment = story.branches[1]!.segments[0]!;
    const eventBranch = source.events.branches[1]!, eventSegment = eventBranch.segments[0]!, item = eventSegment.items[0]!;
    const choice: ReadingFeedbackChoice = { id: annualEventFeedbackSubjectId(2028, eventSegment, item), label: item.title,
      originalConclusion: annualEventFeedbackText(source.events, eventBranch, eventSegment, item), sourceVersions: [a.annualEvents.version, ...source.events.sourceVersions] };
    const personal = await personalFor(a, choice);
    expect(annualLifeStoryPersonalSources(story, segment, personal, source).map((entry) => entry.subjectId)).toEqual([choice.id]);
    for (const sibling of [story.branches[0]!.segments[0]!, story.branches[1]!.segments[1]!]) expect(annualLifeStoryPersonalSources(story, sibling, personal, source)).toEqual([]);
    for (const state of ["proposal", "retained", "needs_more"] as const) expect(annualLifeStoryPersonalSources(story, segment, await personalFor(a, choice, state), source)).toEqual([]);
    for (const change of [
      (copy: typeof personal) => { copy.entries[0]!.originalConclusion += "旧原文"; },
      (copy: typeof personal) => { copy.entries[0]!.readingVersions = ["old/1"]; },
      (copy: typeof personal) => { copy.entries[0]!.selectedReviewRefs = []; },
      (copy: typeof personal) => { copy.sourceBinding.revisionId = crypto.randomUUID(); }
    ]) { const copy = structuredClone(personal); change(copy); expect(annualLifeStoryPersonalSources(story, segment, copy, source)).toEqual([]); }
  });
  it("binds an adopted student context to its exact stored source and year segment", async () => {
    const contextRecord = note(b, await buildReadingContextRecord(b.revision, null, { work: "student", relationship: "unspecified", fromYear: 2026, toYear: 2035, notes: "合成成人学习背景" }), 0, [LOCAL_READING_CONTEXT_TAG]);
    const resolved = await resolveReadingContext({ revision: b.revision, records: [contextRecord] });
    const contextual = buildContextualReadingBundle({ revision: b.revision, assessment: b.assessment, comprehensive: null, annualDomains: b.annualDomains, context: resolved.latest, referenceYear: 2026 })!;
    const all = { ...b, contextual, annualEvents: buildReadingAnnualEvents({ ...b, contextual }) }, stories = buildReadingAnnualLifeStories(all);
    const story = stories.years.find((item) => item.year === 2032)!, segment = story.branches[0]!.segments[0]!, source = yearInput(all, 2032);
    const id = source.events.branches[0]!.segments[0]!.items.find((item) => item.origin.contextSubjectId)!.origin.contextSubjectId!;
    expect(segment.sourceSubjects).toContain(id);
    const reading = contextual.readings.find((item) => item.subjectId === id)!;
    const choice = { id, label: reading.title, originalConclusion: contextualFeedbackText(reading, contextual), sourceVersions: contextualFeedbackVersions(reading, contextual) };
    const personal = await personalFor(all, choice);
    expect(annualLifeStoryPersonalSources(story, segment, personal, source).map((entry) => entry.subjectId)).toEqual([id]);
    const next = stories.years.find((item) => item.year === 2030)!;
    expect(annualLifeStoryPersonalSources(next, next.branches[0]!.segments[0]!, personal, yearInput(all, 2030))).toEqual([]);
    const wrong = structuredClone(source); wrong.contextual!.contextSource.reference.bodySha256 = "f".repeat(64);
    expect(() => annualLifeStoryPersonalSources(story, segment, personal, wrong)).toThrow("现实背景不一致");
  });
  it("keeps an overlapping year's feedback byte-identical across annual windows and calculation observation times", async () => {
    const annual = await buildLocalAnnualOutlookRange(b.revision, b.assessment, 2030, 2032), annualDomains = domainsFor({ ...b, annual });
    const nextInput = { ...b, annual, annualDomains, annualEvents: buildReadingAnnualEvents({ ...b, annual, annualDomains }) };
    const reopened = buildReadingAnnualLifeStories(nextInput), old = bStories.years.find((item) => item.year === 2032)!, next = reopened.years.find((item) => item.year === 2032)!;
    expect(reopened.startYear).not.toBe(bStories.startYear);
    expect(annualLifeStoryFeedbackText(next, next.branches[0]!.segments[0]!)).toBe(annualLifeStoryFeedbackText(old, old.branches[0]!.segments[0]!));
    const choice = ownChoice(old, old.branches[0]!.segments[0]!), personal = await personalFor(b, choice);
    expect(annualLifeStoryPersonalSources(next, next.branches[0]!.segments[0]!, personal, yearInput(nextInput, 2032)).map((entry) => entry.subjectId)).toEqual([choice.id]);
    expect(annualLifeStoryFeedbackText(next, next.branches[0]!.segments[0]!)).not.toMatch(/当前浏览|定位瞬时|总评覆盖年份/);
  });
  it("adds only one new section and leaves the complete previous report byte-identical", () => {
    const extras = { sourceRevision: b.revision, annualDomains: b.annualDomains, annualEvents: b.annualEvents };
    const before = JSON.stringify(b), old = buildLocalReadingSnapshot(b.assessment, b.annual, extras);
    const body = buildLocalReadingSnapshot(b.assessment, b.annual, { ...extras, annualLifeStories: bStories });
    expect(body.split("## 这一年的生活总评")).toHaveLength(2);
    const description = describeReadingAnnualLifeStories(bStories, b).join("\n\n"), story = bStories.years.find((item) => item.year === 2032)!;
    const yearText = description.slice(description.indexOf("### 2032年"), description.indexOf("### 2033年"));
    expect(yearText).toContain("年度简介引用：");
    const mainline = story.branches[0]!.segments[0]!.paragraphs.find((paragraph) => paragraph.kind === "mainline")!;
    expect(story.summary).toBe(`${story.branches[0]!.segments[0]!.caption}。${mainline.text}`);
    expect(yearText).toContain(`"prefix":"${story.branches[0]!.segments[0]!.caption}。"`);
    expect(yearText.split(mainline.text)).toHaveLength(2);
    // The full report reuses exact pre-existing evidence lines inside the new
    // block; remove that actual block, not a standalone rendering without refs.
    const start = body.indexOf("## 这一年的生活总评"), end = body.indexOf("## 年度应事情境先读", start);
    expect(start).toBeGreaterThan(0); expect(end).toBeGreaterThan(start);
    expect(body.slice(0, start) + body.slice(end)).toBe(old);
    expect(JSON.stringify(b)).toBe(before);
    expect(() => buildLocalReadingSnapshot(b.assessment, b.annual, { ...extras, annualEvents: null, annualLifeStories: bStories })).toThrow("缺少原命盘");
  });
});
