import { beforeAll, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalLifeOutlook } from "./local-detailed-outlook";
import { buildLifeStageStory } from "./local-life-stage-story";
import { buildLocalAnnualOutlookRange, type LocalAnnualOutlook } from "./local-annual-outlook";
import { ANNUAL_DOMAIN_READING_VERSION, buildAnnualDomainReading } from "./local-annual-domain-reading";
import type { LocalReadingAnnualDomains } from "./local-annual-domain-record";
import { buildReadingAnnualEvents } from "./local-annual-event-record";
import { buildLifeStageYears, type BuildLifeStageYearsInput } from "./local-life-stage-years";
import { buildContextualAnnualReadings, CONTEXTUAL_READING_VERSION } from "./local-contextual-reading";
import type { LocalContextualReadingBundle } from "./local-contextual-reading-record";
import { READING_CONTEXT_FORMAT, type ReadingContextDraft } from "./local-reading-context";

const inputs = new Map<string, BuildLifeStageYearsInput>();
function domainsFor(input: Pick<BuildLifeStageYearsInput, "revision" | "assessment">, annual: LocalAnnualOutlook): LocalReadingAnnualDomains {
  return { version: ANNUAL_DOMAIN_READING_VERSION, revisionId: input.revision.id, chartResultHash: input.revision.manifest.resultHash,
    includeHour: input.assessment.sourceBinding.includeHour, startYear: annual.startYear, endYear: annual.endYear,
    years: annual.years.map((year) => buildAnnualDomainReading({ ...input, year })) };
}
beforeAll(async () => {
  for (const [id, date, time, sex, from, to, branchId, ganZhi] of [
    ["b", "1995-05-18", "08:26", "male", 2029, 2039, "locked", "丁丑"],
    ["a", "1995-08-18", "08:26", "unspecified", 2028, 2028, "forward", "丁亥"],
    ["r3", "2019-12-22", "11:23", "female", 2030, 2034, "locked", "丁丑"]
  ] as const) {
    const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex, lunarLeapMonth: false,
      location: { label: "Synthetic exact stage-year bridge", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
    const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
    const assessment = buildBaziPreliminaryAssessment(revision), life = await buildLocalLifeOutlook(revision, assessment, id === "r3" ? 2030 : 2026);
    const annual = await buildLocalAnnualOutlookRange(revision, assessment, from, to), annualDomains = domainsFor({ revision, assessment }, annual);
    inputs.set(id, { revision, assessment, life, lifeStageStory: buildLifeStageStory({ revision, assessment, life }), annual, annualDomains,
      annualEvents: buildReadingAnnualEvents({ revision, assessment, annual, annualDomains }), selectedDecadeId: life.decades.find((stage) => stage.branchId === branchId && stage.ganZhi === ganZhi)!.id });
  }
  for (const [id, date, time, year] of [
    ["resource-first", "1957-09-13", "00:26", 2032],
    ["wealth-first", "1982-10-02", "10:26", 2032],
    ["official-joint", "1944-08-09", "04:26", 2028]
  ] as const) {
    const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
      location: { label: "Synthetic task stage-year bridge", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic calendar fixture" }, WORKING_DEFAULT_RULE_PROFILE);
    const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-17T00:00:00Z" });
    const assessment = buildBaziPreliminaryAssessment(revision), life = await buildLocalLifeOutlook(revision, assessment, year);
    const annual = await buildLocalAnnualOutlookRange(revision, assessment, year, year), annualDomains = domainsFor({ revision, assessment }, annual);
    const original = annual.years[0]!.judgmentSegments[0]!, ref = original.judgment.backgroundRefs[0]!;
    const stage = life.decades.find(item => JSON.stringify(item.nodeRef) === JSON.stringify(ref))!;
    inputs.set(id, { revision, assessment, life, lifeStageStory: buildLifeStageStory({ revision, assessment, life }), annual, annualDomains,
      annualEvents: buildReadingAnnualEvents({ revision, assessment, annual, annualDomains }), selectedDecadeId: stage.id });
  }
}, 60_000);
const input = (id: string) => structuredClone(inputs.get(id)!);

it("carries the three exact natal tasks through stage connections and actor themes without changing their actions or event objects", () => {
  for (const id of ["resource-first", "wealth-first", "official-joint"]) {
    const value = input(id), before = structuredClone(value), result = buildLifeStageYears(value), segment = result.years[0]!.segments[0]!;
    const original = value.annual.years[0]!.judgmentSegments[0]!, pattern = original.judgment.axes.find(axis => axis.axis === "pattern")!;
    expect(segment.annualActions).toEqual(pattern.stemActions!.items);
    expect(segment.items).toEqual(value.annualEvents.years[0]!.branches[0]!.segments[0]!.items);
    expect(segment.backgroundRefs).toEqual(original.judgment.backgroundRefs);
    expect(result.sourceVersions.filter(version => version === "hakimi.natal-wealth-resource-task/0.1.0")).toHaveLength(1);
    const text = [...segment.paragraphs, ...segment.advantages, ...segment.pressures].join();
    if (id === "resource-first") {
      expect(text).toContain("仍不可缺少的指导"); expect(text).toContain("原来必需");
      expect(segment.pressures.join()).not.toContain("继续补准备可能挤掉");
      expect(text).not.toContain("哪些积累值得继续使用");
    } else if (id === "wealth-first") {
      expect(segment.annualActions.map(actor => actor.effect)).toEqual(["unresolved", "neutral"]);
      expect(segment.paragraphs.join()).toMatch(/准备.*取舍/);
      expect(segment.paragraphs.join()).not.toMatch(/实际用途，可以帮助筛选|个人本领由谁使用/);
      expect(segment.advantages.some(line => line.startsWith("本年壬偏财") || line.startsWith("年支内癸正财"))).toBe(false);
    } else {
      expect(segment.pressures.join()).toContain("原有要求仍在，配套却未同步");
      expect(text).not.toContain("新试用");
    }
    expect(value).toEqual(before);
  }
});

it("links all eleven actual B years to DingChou with exact partial endpoints, complete original items and no input changes", () => {
  const value = input("b"), before = structuredClone(value), result = buildLifeStageYears(value);
  expect(result.years.map((year) => year.year)).toEqual(Array.from({ length: 11 }, (_, i) => 2029 + i));
  expect(result.coverage).toEqual({ status: "complete", coveredIntervals: [{ startInstant: result.stage.startInstant, endExclusiveInstant: result.stage.endExclusiveInstant }], gaps: [] });
  expect(result.years[0]!.startInstant).toBe(result.stage.startInstant); expect(Date.parse(result.years[0]!.startInstant)).toBe(Date.parse("2029-05-22T16:20:00Z"));
  expect(result.years.at(-1)!.endExclusiveInstant).toBe(result.stage.endExclusiveInstant);
  expect(result.highlights).toHaveLength(4);
  for (const year of result.years) for (const segment of year.segments) {
    const original = value.annual.years.find((item) => item.year === year.year)!.judgmentSegments.find((item) => item.id === segment.id)!;
    const event = value.annualEvents.years.find((item) => item.year === year.year)!.branches.find((branch) => branch.id === result.branchId)!.segments.find((item) => item.id === segment.id)!;
    expect(segment.backgroundRefs).toEqual([result.stage.nodeRef]); expect(segment.items).toEqual(event.items);
    expect([segment.startInstant, segment.endExclusiveInstant]).toEqual([original.startInstant, original.endExclusiveInstant]);
    expect(segment.age).toEqual(event.age); expect(segment.sourceSubjects).toContain(`life-stage-story-${result.stage.decadeId}`);
    expect(segment.sourceSubjects).toContain(`annual-${year.year}`);
    for (const basis of segment.basisRefs) {
      const axis = original.judgment.axes.find((item) => item.id === basis.axisId)!;
      expect(basis.segmentId).toBe(original.id); expect(basis.year).toBe(year.year);
      expect(basis.field === "summary" ? axis.summary : axis[basis.field][basis.index!]).toBeTypeOf("string");
    }
  }
  expect(value).toEqual(before);
});

it("distinguishes B's annual proposal and settlement from its still obstructed decade and keeps 2029 visible neutral separate from hidden assistance", () => {
  const result = buildLifeStageYears(input("b"));
  const y29 = result.years[0]!.segments[0]!, y30 = result.years[1]!.segments[0]!, y32 = result.years[3]!.segments[0]!;
  expect(y29.annualActions).toEqual(expect.arrayContaining([
    expect.objectContaining({ stem: "己", visibility: "visible", effect: "neutral" }), expect.objectContaining({ stem: "辛", visibility: "main_hidden", effect: "assists" })]));
  expect(y29.paragraphs.join()).toContain("年支内的辛食神"); expect(y29.advantages.some((line) => line.startsWith("本年己比肩直接带来的配合"))).toBe(false);
  expect(y30.annualActions[0]).toEqual(expect.objectContaining({ stem: "庚", effect: "assists" }));
  expect(y32.annualActions[0]).toEqual(expect.objectContaining({ stem: "壬", effect: "assists" }));
  expect(y30.paragraphs[0]).toContain("改法进入试用"); expect(y32.paragraphs[0]).toContain("进入确认");
  for (const segment of [y30, y32]) { expect(segment.paragraphs.join()).toContain("当前仍在场的大运背景"); expect(segment.paragraphs.join()).not.toMatch(/已制住丁|压力解除|十年转好|牵制是：直接进入的主题：/); }
  expect(y30.paragraphs).not.toEqual(y32.paragraphs);
});

it("keeps A's forward full year and two backward handover pieces in separate selected stages", () => {
  const value = input("a"), forward = buildLifeStageYears(value);
  expect(forward.branchId).toBe("forward"); expect(forward.years[0]!.segments).toHaveLength(1);
  const before = value.life.decades.find((stage) => stage.branchId === "backward" && stage.ganZhi === "辛巳")!;
  const after = value.life.decades.find((stage) => stage.branchId === "backward" && stage.ganZhi === "庚辰")!;
  const earlier = buildLifeStageYears({ ...value, selectedDecadeId: before.id }), later = buildLifeStageYears({ ...value, selectedDecadeId: after.id });
  expect(earlier.years[0]!.endExclusiveInstant).toBe(after.startInstant); expect(later.years[0]!.startInstant).toBe(after.startInstant);
  expect(Date.parse(after.startInstant)).toBe(Date.parse("2028-12-20T20:58:00Z"));
  for (const [result, stage] of [[earlier, before], [later, after]] as const) {
    expect(result.years[0]!.segments).toHaveLength(1); expect(result.years[0]!.segments[0]!.backgroundRefs).toEqual([stage.nodeRef]);
    expect(result.years[0]!.segments[0]!.axisEffects).toContainEqual({ axis: "pattern", effect: "obstructs" });
    expect(result.years[0]!.segments[0]!.paragraphs.join()).not.toContain("丁亥");
  }
  expect(forward.years[0]!.segments[0]!.axisEffects).toContainEqual({ axis: "pattern", effect: "assists" });
  expect(forward.years[0]!.segments[0]!.axisEffects).toContainEqual({ axis: "seasonal", effect: "mixed" });
  expect(forward.years[0]!.segments[0]!.pressures.join()).toContain("调候");
});

it("preserves R3 childhood, neutral yearly guidance and the original unresolved decade without inventing adulthood", () => {
  const value = input("r3"), result = buildLifeStageYears(value), first = result.years[0]!.segments[0]!;
  expect(first.ageStage).toBe("youth"); expect(first.annualActions[0]).toEqual(expect.objectContaining({ stem: "庚", tenGod: "正印", effect: "neutral" }));
  expect(first.paragraphs.join()).toContain("理解方法、学习与接受指导");
  expect(first.paragraphs.join()).not.toMatch(/岗位|客户|回款|录用|结婚|成绩上升/);
  expect(result.stage.caption).toBe("条件性"); expect(result.coverage.status).toBe("partial");
  expect(result.years.at(-1)!.endExclusiveInstant).toBe(result.stage.endExclusiveInstant);
  expect(result.coverage.gaps[0]!.startInstant).toBe(result.stage.startInstant);
});

it("keeps every original age-phase example in the actual R3 year crossing six", async () => {
  const value = input("r3");
  const annual = await buildLocalAnnualOutlookRange(value.revision, value.assessment, 2025, 2025), annualDomains = domainsFor(value, annual);
  const annualEvents = buildReadingAnnualEvents({ ...value, annual, annualDomains });
  const result = buildLifeStageYears({ ...value, annual, annualDomains, annualEvents });
  const original = annualEvents.years[0]!.branches[0]!.segments[0]!, segment = result.years[0]!.segments[0]!;
  expect(original.age.segments.map((phase) => phase.stage)).toEqual(["young_child", "youth"]);
  const primary = original.items.find((item) => item.priority === "primary") ?? original.items[0]!;
  expect(primary.examples.some((text) => text.includes("5周岁"))).toBe(true);
  expect(primary.examples.some((text) => text.includes("6周岁"))).toBe(true);
  for (const example of primary.examples) expect(segment.paragraphs).toContain(`可以对照的具体表现是：${example}`);
  expect(segment.items).toEqual(original.items);
  expect([segment.startInstant, segment.endExclusiveInstant]).toEqual([original.startInstant, original.endExclusiveInstant]);
}, 30_000);

it("keeps identical year text and identity across a short window and the complete stage, with coverage and highlights separate", async () => {
  const value = input("b"), full = buildLifeStageYears(value);
  const annual = await buildLocalAnnualOutlookRange(value.revision, value.assessment, 2030, 2032), annualDomains = domainsFor(value, annual);
  const short = buildLifeStageYears({ ...value, annual, annualDomains, annualEvents: buildReadingAnnualEvents({ ...value, annual, annualDomains }) });
  expect(short.coverage.status).toBe("partial"); expect(short.coverage.gaps).toHaveLength(2);
  for (const year of short.years) expect(year).toEqual(full.years.find((item) => item.year === year.year));
  const old = value.life.decades[0]!;
  const outside = buildLifeStageYears({ ...value, selectedDecadeId: old.id });
  expect(outside.years).toEqual([]); expect(outside.coverage.status).toBe("unavailable");
  expect(outside.coverage.gaps).toEqual([expect.objectContaining({ startInstant: old.startInstant, endExclusiveInstant: old.endExclusiveInstant, reason: "outside_annual_window" })]);
}, 30_000);

it("rejects changed prose, source versions, branch/ref substitutions, duplicate years and unknown-hour reuse", () => {
  const base = input("b");
  const prose = structuredClone(base); prose.annualEvents.years[0]!.branches[0]!.segments[0]!.items[0]!.summary += "被修改";
  expect(() => buildLifeStageYears(prose)).toThrow("同修订重建");
  const domain = structuredClone(base); domain.annualDomains.years[0]!.branches[0]!.segments[0]!.domains[0]!.examples.push("借来情境");
  expect(() => buildLifeStageYears(domain)).toThrow();
  const missing = structuredClone(base); missing.annual.years.splice(1, 1); expect(() => buildLifeStageYears(missing)).toThrow("缺年");
  const version = structuredClone(base); version.annualEvents.years[0]!.sourceVersions.push("foreign/1"); expect(() => buildLifeStageYears(version)).toThrow("同修订重建");
  const ref = structuredClone(base); ref.annual.years[0]!.judgmentSegments[1]!.judgment.backgroundRefs[0]!.startInstant = "2020-01-01T00:00:00.000Z";
  expect(() => buildLifeStageYears(ref)).toThrow();
  const story = structuredClone(base); story.lifeStageStory.branches[0]!.stages[0]!.headline += "借来文本"; expect(() => buildLifeStageYears(story)).toThrow("阶段主线全文");
  const hour = structuredClone(base); hour.revision.input.timePrecision = "unknown_hour"; expect(() => buildLifeStageYears(hour)).toThrow();
  const other = input("a"); expect(() => buildLifeStageYears({ ...base, selectedDecadeId: other.selectedDecadeId })).toThrow("所选原大运");
});

it("requires the same verified reality context, preserves its original items and exposes its personal-subject dependency", () => {
  const value = input("b"), context: ReadingContextDraft = { work: "student", relationship: "unspecified", fromYear: 2030, toYear: 2032, notes: "仅为合成测试背景，不推断收入" };
  const sourceBinding = { caseId: value.revision.caseId, revisionId: value.revision.id, chartResultHash: value.revision.manifest.resultHash, includeHour: true };
  const contextual: LocalContextualReadingBundle = { version: CONTEXTUAL_READING_VERSION, sourceBinding, referenceYear: 2030,
    contextSource: { reference: { noteId: crypto.randomUUID(), editVersion: 1, bodySha256: "a".repeat(64) }, createdAt: "2026-10-16T00:00:00Z",
      document: { format: READING_CONTEXT_FORMAT, sourceBinding, previousRef: null, context } },
    readings: value.annualDomains.years.flatMap((reading) => buildContextualAnnualReadings({ revision: value.revision, assessment: value.assessment, reading, context })) };
  const annualEvents = buildReadingAnnualEvents({ ...value, contextual });
  const result = buildLifeStageYears({ ...value, annualEvents, contextual });
  const y30 = result.years.find((year) => year.year === 2030)!, original = annualEvents.years.find((year) => year.year === 2030)!.branches[0]!.segments[0]!;
  expect(y30.segments[0]!.items).toEqual(original.items); expect(y30.contextRef).toEqual(contextual.contextSource.reference);
  for (const item of original.items.filter((item) => item.origin.contextSubjectId)) expect(y30.sourceSubjects).toContain(item.origin.contextSubjectId);
  expect(() => buildLifeStageYears({ ...value, annualEvents })).toThrow("同修订重建");
  const bad = structuredClone(contextual); bad.contextSource.document.context.work = "retired";
  expect(() => buildLifeStageYears({ ...value, annualEvents, contextual: bad })).toThrow("背景适配正文");
});
