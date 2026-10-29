import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type ResearchNoteRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlook, buildLocalAnnualOutlookRange } from "./local-annual-outlook";
import { buildLocalLifeOutlook } from "./local-detailed-outlook";
import { buildLifeStageStory } from "./local-life-stage-story";
import { buildLifeStageYears, type BuildLifeStageYearsInput } from "./local-life-stage-years";
import { ANNUAL_DOMAIN_READING_VERSION, buildAnnualDomainReading } from "./local-annual-domain-reading";
import { annualDomainFeedbackText, type LocalReadingAnnualDomains } from "./local-annual-domain-record";
import { buildReadingAnnualEvents, annualEventFeedbackSubjectId, annualEventFeedbackText } from "./local-annual-event-record";
import { annualEventCompositionChoices } from "./local-annual-event-composition-record";
import { buildLocalPersonalReading } from "./local-personal-reading";
import { buildReadingContextRecord, resolveReadingContext, LOCAL_READING_CONTEXT_TAG } from "./local-reading-context";
import { buildContextualReadingBundle, contextualFeedbackText, contextualFeedbackVersions } from "./local-contextual-reading-record";
import { buildReadingFeedbackChoices, buildReadingFeedbackReview, buildStructuredReadingFeedback, readingFeedbackSource, type ReadingFeedbackChoice } from "./local-reading-feedback";
import { lifeStageStoryFeedbackVersions, lifeStageStoryStageText, lifeStageStorySubjectId } from "./local-life-stage-story-record";
import { outlookJudgmentFeedbackText } from "./local-outlook-judgment-record";
import { buildLocalReadingSnapshot } from "./local-reading-record";
import { describeLifeStageYears, lifeStageYearSubjectId, lifeStageYearFeedbackText, lifeStageYearFeedbackVersions, lifeStageYearPersonalSources } from "./local-life-stage-years-record";

async function fixture(date: string, sex: "male" | "unspecified") {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time: "08:26", timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex, lunarLeapMonth: false,
    location: { label: "Synthetic stage-year record", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
  const assessment = buildBaziPreliminaryAssessment(revision);
  const [annual, life] = await Promise.all([buildLocalAnnualOutlook(revision, assessment, 2026), buildLocalLifeOutlook(revision, assessment, 2028)]);
  const lifeStageStory = buildLifeStageStory({ revision, assessment, life });
  const annualDomains = domains({ revision, assessment, annual });
  const annualEvents = buildReadingAnnualEvents({ revision, assessment, annual, annualDomains });
  return { revision, assessment, annual, life, lifeStageStory, annualDomains, annualEvents };
}
function domains(input: Pick<BuildLifeStageYearsInput, "revision" | "assessment" | "annual">): LocalReadingAnnualDomains {
  return { version: ANNUAL_DOMAIN_READING_VERSION, revisionId: input.revision.id, chartResultHash: input.revision.manifest.resultHash,
    includeHour: input.assessment.sourceBinding.includeHour, startYear: input.annual.startYear, endYear: input.annual.endYear,
    years: input.annual.years.map((year) => buildAnnualDomainReading({ ...input, year })) };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
let a: Fixture, b: Fixture, input: BuildLifeStageYearsInput, bridge: ReturnType<typeof buildLifeStageYears>;
beforeAll(async () => {
  [a, b] = await Promise.all([fixture("1995-08-18", "unspecified"), fixture("1995-05-18", "male")]);
  input = { ...b, selectedDecadeId: b.life.decades.find((decade) => decade.ganZhi === "丁丑")!.id };
  bridge = buildLifeStageYears(input);
});
function choiceFor(year: typeof bridge.years[number]): ReadingFeedbackChoice {
  return { id: lifeStageYearSubjectId(bridge, year), label: year.headline, originalConclusion: lifeStageYearFeedbackText(bridge, year), sourceVersions: lifeStageYearFeedbackVersions(bridge, year) };
}
async function personalFor(source: Fixture, choice: ReadingFeedbackChoice, state: "revised" | "retained" | "needs_more" | "proposal" = "revised") {
  const note = (body: string, minute: number, tags: string[]): ResearchNoteRecord => ({ schemaVersion: "1.0.0", id: crypto.randomUUID(),
    caseId: source.revision.caseId, anchor: { kind: "revision", revisionId: source.revision.id }, bodyFormat: "markdown", body, tags,
    sourceRefs: [], lifecycle: "active", editVersion: 1, createdAt: `2026-10-16T00:0${minute}:00Z`, updatedAt: `2026-10-16T00:0${minute}:00Z` });
  const root = note(buildStructuredReadingFeedback(source.assessment, { subjectId: choice.id, subjectLabel: choice.label,
    originalConclusion: choice.originalConclusion, sourceVersions: choice.sourceVersions, rating: "partial", aspect: "合成阶段年度对照",
    occurredAt: "2032", actualSituation: "纯合成反馈", requestedRevision: "这段以本人补充的内容为准。" }), 1, ["解读反馈"]);
  const records = [root];
  if (state !== "proposal") records.push(note(await buildReadingFeedbackReview(root, null, readingFeedbackSource(source.assessment, choice.sourceVersions), {
    state, notes: "本人明确复核", revisedConclusion: state === "revised" ? "个人原文：这一段的实际生活主线另有区别。" : "", occurredAt: "2032"
  }), 2, ["解读反馈", "解读反馈复核"]));
  return buildLocalPersonalReading({ revision: source.revision, assessment: source.assessment, choices: [choice], records });
}
function eventChoice(source: Fixture, year: number, branchId: string, segmentId: string): ReadingFeedbackChoice {
  const reading = source.annualEvents.years.find((item) => item.year === year)!, branch = reading.branches.find((item) => item.id === branchId)!;
  const segment = branch.segments.find((item) => item.id === segmentId)!, item = segment.items[0]!;
  return { id: annualEventFeedbackSubjectId(year, segment, item), label: item.title,
    originalConclusion: annualEventFeedbackText(reading, branch, segment, item), sourceVersions: [source.annualEvents.version, ...reading.sourceVersions] };
}

describe("stage-year exact feedback and full report records", () => {
  it("retains B's partial 2029 boundary, full prose and exact ordered references without changing sources", () => {
    const before = JSON.stringify(input), year = bridge.years.find((item) => item.year === 2029)!;
    expect(year.segments[0]!.startInstant).toBe("2029-05-22T16:20:00.000Z");
    expect(bridge.coverage.status).toBe("partial");
    const body = describeLifeStageYears(bridge, input).join("\n"), ids = bridge.years.map((item) => lifeStageYearSubjectId(bridge, item));
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of bridge.years) {
      const text = lifeStageYearFeedbackText(bridge, item);
      expect(text.length).toBeLessThanOrEqual(30_000); expect(body).toContain(text);
      expect(text).toContain(JSON.stringify(item.sourceVersions)); expect(text).toContain(JSON.stringify(item.yearNodeRef));
      expect(text).not.toContain("已载年度范围"); expect(text).not.toContain("定位瞬时");
      for (const segment of item.segments) {
        expect(text).toContain(JSON.stringify(segment.basisRefs)); expect(text).toContain(JSON.stringify(segment.backgroundRefs));
        expect(text).toContain(JSON.stringify(segment.annualActions));
        for (const paragraph of [...item.paragraphs, ...segment.paragraphs, ...segment.advantages, ...segment.pressures, ...segment.conditions]) expect(text).toContain(paragraph);
      }
    }
    expect(JSON.stringify(input)).toBe(before);
  });
  it("keeps A's same year separate across forward and both backward backgrounds", async () => {
    const selected = a.life.decades.filter((decade) => (decade.branchId === "forward" && decade.ganZhi === "丁亥")
      || (decade.branchId === "backward" && ["辛巳", "庚辰"].includes(decade.ganZhi)));
    expect(selected).toHaveLength(3);
    const sources = selected.map((decade) => ({ ...a, selectedDecadeId: decade.id }));
    const bridges = sources.map(buildLifeStageYears), years = bridges.map((value) => value.years.find((year) => year.year === 2028)!);
    expect(new Set(bridges.map((value, index) => lifeStageYearSubjectId(value, years[index]!))).size).toBe(3);
    const before = bridges.findIndex((value) => value.branchId === "backward" && value.stage.ganZhi === "辛巳");
    const after = bridges.findIndex((value) => value.branchId === "backward" && value.stage.ganZhi === "庚辰");
    expect(years[before]!.segments[0]!.endExclusiveInstant).toBe("2028-12-20T20:58:00.000Z");
    expect(years[after]!.segments[0]!.startInstant).toBe("2028-12-20T20:58:00.000Z");
    const choice = eventChoice(a, 2028, "backward", years[before]!.segments[0]!.id), personal = await personalFor(a, choice);
    expect(lifeStageYearPersonalSources(bridges[before]!, years[before]!, personal, sources[before]!).map((entry) => entry.subjectId)).toEqual([choice.id]);
    for (let index = 0; index < bridges.length; index++) if (index !== before) expect(lifeStageYearPersonalSources(bridges[index]!, years[index]!, personal, sources[index]!)).toEqual([]);
  });
  it("rejects changed text, a shifted interval, another year node, missing versions and changed source events before saving", () => {
    for (const change of [
      (copy: typeof bridge) => { copy.years[0]!.paragraphs.push("未登记断语"); },
      (copy: typeof bridge) => { copy.years[0]!.segments[0]!.startInstant = "2029-01-01T00:00:00Z"; },
      (copy: typeof bridge) => { copy.years[0]!.yearNodeRef = structuredClone(copy.years[1]!.yearNodeRef); },
      (copy: typeof bridge) => { copy.years[0]!.sourceVersions = [copy.version]; },
      (copy: typeof bridge) => { copy.years[0]!.segments[0]!.backgroundRefs = []; }
    ]) { const copy = structuredClone(bridge); change(copy); expect(() => describeLifeStageYears(copy, input)).toThrow("不一致"); }
    const changed = structuredClone(input); changed.annualEvents.years[0]!.branches[0]!.segments[0]!.items[0]!.summary += "未绑定";
    expect(() => describeLifeStageYears(bridge, changed)).toThrow();
    expect(() => describeLifeStageYears(bridge, { ...input, revision: { ...input.revision, id: crypto.randomUUID() } })).toThrow();
  });
  it("folds only explicitly adopted current stage/year/domain/event/member/combined sources and keeps their original text", async () => {
    const year = bridge.years.find((item) => item.year === 2032)!, decade = b.life.decades.find((item) => item.id === bridge.stage.decadeId)!;
    const reading = b.annualDomains.years.find((item) => item.year === 2032)!, branch = reading.branches.find((item) => item.id === bridge.branchId)!;
    const segment = branch.segments.find((item) => item.id === year.segments[0]!.id)!, domain = segment.domains[0]!;
    const composed = annualEventCompositionChoices(b.annualEvents).filter((choice) => choice.id.startsWith(`annual-event-composed-2032-${segment.id}-`));
    expect(composed).toHaveLength(1);
    const choices: ReadingFeedbackChoice[] = [choiceFor(year),
      { id: "life-overview", label: "当前阶段", originalConclusion: `${b.life.referenceLabel}\n${b.life.summary}\n岁运解读规则：${b.life.version}`, sourceVersions: [b.life.version] },
      { id: lifeStageStorySubjectId(b.lifeStageStory, bridge.stage), label: bridge.stage.headline, originalConclusion: lifeStageStoryStageText(b.lifeStageStory, bridge.stage), sourceVersions: lifeStageStoryFeedbackVersions(b.lifeStageStory) },
      { id: `decade-${decade.id}`, label: decade.headline, sourceVersions: [b.life.version], originalConclusion: `${decade.headline}\n${decade.branchLabel} · ${decade.startInstant} 至 ${decade.endExclusiveInstant}\n${decade.paragraphs.join("\n")}\n${outlookJudgmentFeedbackText(decade.judgment)}\n岁运解读规则：${b.life.version}` },
      ...buildReadingFeedbackChoices(b.assessment, b.annual, []).filter((choice) => choice.id === "annual-2032"),
      { id: `annual-domain-2032-${segment.id}-${domain.id}`, label: domain.title, originalConclusion: annualDomainFeedbackText(reading, branch, segment, domain), sourceVersions: [reading.version, ...reading.sourceVersions] },
      eventChoice(b, 2032, bridge.branchId, segment.id), ...composed];
    for (const choice of choices) {
      const personal = await personalFor(b, choice), adopted = lifeStageYearPersonalSources(bridge, year, personal, input);
      expect(adopted.map((entry) => entry.subjectId)).toEqual([choice.id]);
      const body = describeLifeStageYears(bridge, input, personal).join("\n");
      expect(body).toContain(personal.entries[0]!.personalText!); expect(body).toContain(JSON.stringify(personal.entries[0]!.selectedReviewRefs));
      expect(body).toContain(lifeStageYearFeedbackText(bridge, year)); expect(body).toContain("原计算对照");
    }
  });
  it("does not apply proposals, restored originals, stale text/version/revision or unconfirmed review references", async () => {
    const year = bridge.years.find((item) => item.year === 2032)!, choice = choiceFor(year);
    for (const state of ["retained", "needs_more", "proposal"] as const) expect(lifeStageYearPersonalSources(bridge, year, await personalFor(b, choice, state), input)).toEqual([]);
    const personal = await personalFor(b, choice);
    for (const change of [
      (copy: typeof personal) => { copy.entries[0]!.originalConclusion += "原文改变"; },
      (copy: typeof personal) => { copy.entries[0]!.readingVersions = ["old"]; },
      (copy: typeof personal) => { copy.entries[0]!.selectedReviewRefs = []; },
      (copy: typeof personal) => { copy.sourceBinding.revisionId = crypto.randomUUID(); }
    ]) { const copy = structuredClone(personal); change(copy); expect(lifeStageYearPersonalSources(bridge, year, copy, input)).toEqual([]); }
    const other = bridge.years.find((item) => item.year === 2030)!;
    expect(lifeStageYearPersonalSources(bridge, other, personal, input)).toEqual([]);
  });
  it("honors an explicitly adopted student-context source only for the referenced year, segment and exact context record", async () => {
    const contextBody = await buildReadingContextRecord(b.revision, null, { work: "student", relationship: "unspecified", fromYear: 2026, toYear: 2035, notes: "合成成人学习背景" });
    const contextRecord: ResearchNoteRecord = { schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: b.revision.caseId,
      anchor: { kind: "revision", revisionId: b.revision.id }, bodyFormat: "markdown", body: contextBody,
      tags: [LOCAL_READING_CONTEXT_TAG], sourceRefs: [], lifecycle: "active", editVersion: 1, createdAt: "2026-10-16T00:00:00Z", updatedAt: "2026-10-16T00:00:00Z" };
    const context = await resolveReadingContext({ revision: b.revision, records: [contextRecord] });
    const contextual = buildContextualReadingBundle({ revision: b.revision, assessment: b.assessment, comprehensive: null,
      annualDomains: b.annualDomains, context: context.latest, referenceYear: 2026 })!;
    const annualEvents = buildReadingAnnualEvents({ ...b, contextual });
    const source = { ...input, contextual, annualEvents }, current = buildLifeStageYears(source), year = current.years.find((item) => item.year === 2032)!;
    const contextId = year.segments.flatMap((segment) => segment.items).find((item) => item.origin.contextSubjectId)!.origin.contextSubjectId!;
    const reading = contextual.readings.find((item) => item.subjectId === contextId)!;
    expect(year.sourceSubjects).toContain(contextId);
    const choice: ReadingFeedbackChoice = { id: contextId, label: reading.title, originalConclusion: contextualFeedbackText(reading, contextual), sourceVersions: contextualFeedbackVersions(reading, contextual) };
    const personal = await personalFor(b, choice);
    expect(lifeStageYearPersonalSources(current, year, personal, source).map((entry) => entry.subjectId)).toEqual([contextId]);
    expect(lifeStageYearPersonalSources(current, current.years.find((item) => item.year === 2030)!, personal, source)).toEqual([]);
    expect(describeLifeStageYears(current, source, personal).join("\n")).toContain(personal.entries[0]!.personalText!);
    const wrongRef = structuredClone(source); wrongRef.contextual.contextSource.reference.bodySha256 = "f".repeat(64);
    expect(() => lifeStageYearPersonalSources(current, year, personal, wrongRef)).toThrow("背景来源不一致");
    const wrongScope = structuredClone(source), target = wrongScope.contextual.readings.find((item) => item.subjectId === contextId)!;
    if (target.scope.kind !== "annual") throw new Error("Expected an annual context fixture");
    target.scope.startInstant = "2032-01-01T00:00:00Z";
    expect(() => lifeStageYearPersonalSources(current, year, personal, wrongScope)).toThrow("背景主题区间不一致");
  });
  it("keeps feedback identical when reopening at a different instant and loading a different overlapping annual window", async () => {
    const life = await buildLocalLifeOutlook(b.revision, b.assessment, 2028, { atInstant: "2028-07-02T04:00:00.000Z" });
    const lifeStageStory = buildLifeStageStory({ ...b, life });
    const annual = await buildLocalAnnualOutlookRange(b.revision, b.assessment, 2028, 2035), annualDomains = domains({ ...b, annual });
    const annualEvents = buildReadingAnnualEvents({ ...b, annual, annualDomains });
    const reopenedInput = { ...input, life, lifeStageStory, annual, annualDomains, annualEvents }, reopened = buildLifeStageYears(reopenedInput);
    const year = bridge.years.find((item) => item.year === 2032)!, next = reopened.years.find((item) => item.year === 2032)!;
    expect(life.referenceInstant).not.toBe(b.life.referenceInstant); expect(annual.startYear).not.toBe(b.annual.startYear);
    expect(lifeStageYearFeedbackText(reopened, next)).toBe(lifeStageYearFeedbackText(bridge, year));
    expect(lifeStageYearFeedbackVersions(reopened, next)).toEqual(lifeStageYearFeedbackVersions(bridge, year));
    const personal = await personalFor(b, choiceFor(year));
    expect(lifeStageYearPersonalSources(reopened, next, personal, reopenedInput).map((entry) => entry.subjectId)).toEqual([choiceFor(year).id]);
  });
  it("adds the bridge once to the full report and preserves all old annual, stage and event originals", () => {
    const before = JSON.stringify(input), extras = { sourceRevision: b.revision, life: b.life, lifeStageStory: b.lifeStageStory,
      annualDomains: b.annualDomains, annualEvents: b.annualEvents };
    const old = buildLocalReadingSnapshot(b.assessment, b.annual, extras);
    const body = buildLocalReadingSnapshot(b.assessment, b.annual, { ...extras, lifeStageYears: bridge });
    expect(body.split("## 大运主线与逐年衔接")).toHaveLength(2);
    // The new section is one additive block; the complete prior report stays byte-identical.
    const addition = describeLifeStageYears(bridge, input).join("\n\n");
    expect(body.replace(`${addition}\n\n`, "")).toBe(old);
    expect(JSON.stringify(input)).toBe(before);
    expect(() => buildLocalReadingSnapshot(b.assessment, b.annual, { ...extras, annualEvents: null, lifeStageYears: bridge })).toThrow("缺少原命盘");
  });
});
