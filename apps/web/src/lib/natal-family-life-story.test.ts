import { beforeAll, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { buildNatalFamilyLifeStory, NATAL_FAMILY_LIFE_STORY_VERSION, type NatalFamilyLifeStoryInput } from "./natal-family-life-story";

const cases = new Map<string, NatalFamilyLifeStoryInput>();
const input = (id: string) => structuredClone(cases.get(id)!);
const body = (story: ReturnType<typeof buildNatalFamilyLifeStory>) => story.paragraphs.join("\n");
const asProjection = (source: NatalFamilyLifeStoryInput, precision: "unknown_hour" | "date_only") => {
  const revision = structuredClone(source.revision);
  revision.input.time = null; revision.input.timePrecision = precision;
  return { revision, comprehensive: buildBaziComprehensiveReading(revision, buildBaziPreliminaryAssessment(revision)), referenceInstant: source.referenceInstant };
};
beforeAll(async () => {
  for (const [id, date, time, sex] of [
    ["a-unknown", "1995-08-18", "08:26", "unspecified"], ["b", "1995-05-18", "08:26", "male"],
    ["r3", "2019-12-22", "11:23", "female"], ["r4", "2018-11-19", "14:26", "male"],
    ["resource-heavy", "1982-10-02", "10:26", "male"], ["hour-only", "1991-07-08", "16:26", "male"]
  ] as const) {
    const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex,
      lunarLeapMonth: false, location: { label: "Synthetic family age view", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic only" }, WORKING_DEFAULT_RULE_PROFILE);
    const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
    cases.set(id, { revision, comprehensive: buildBaziComprehensiveReading(revision, buildBaziPreliminaryAssessment(revision)), referenceInstant: "2026-10-16T04:00:00Z" });
  }
});

it("preserves the original complete default family answer for adults and unknown reference time", () => {
  for (const id of cases.keys()) {
    const source = input(id), family = source.comprehensive.relationshipFoundation!.family;
    for (const referenceInstant of ["2050-10-16T04:00:00Z", null]) {
      const value = { ...source, referenceInstant }, before = JSON.stringify(value), story = buildNatalFamilyLifeStory(value);
      expect(story.title).toBe("家庭与支持环境");
      expect(story.paragraphs).toEqual([family.verdict, ...family.paragraphs]);
      expect(story.evidence).toEqual(family.evidence);
      for (const caution of family.cautions) expect(story.conditions).toContain(caution);
      expect(story.sourceSubjects).toEqual(["chapter-family"]);
      expect(story.sourceVersions).toEqual([NATAL_FAMILY_LIFE_STORY_VERSION, source.comprehensive.version, source.comprehensive.relationshipFoundation!.version]);
      expect(story.referenceInstant).toBe(referenceInstant);
      expect(JSON.stringify(value)).toBe(before);
    }
  }
});

it("gives the actual R3 preschool and youth roles different complete family scenes without adult responsibilities", () => {
  const source = input("r3"), before = structuredClone(source);
  const young = buildNatalFamilyLifeStory({ ...source, referenceInstant: "2025-11-01T04:00:00Z" });
  const youth = buildNatalFamilyLifeStory({ ...source, referenceInstant: "2030-11-01T04:00:00Z" });
  expect(young.age!.stage).toBe("young_child"); expect(youth.age!.stage).toBe("youth");
  expect(young.paragraphs.length).toBeGreaterThanOrEqual(4); expect(youth.paragraphs.length).toBeGreaterThanOrEqual(4);
  expect(body(young)).toContain("陌生步骤或几件小事"); expect(source.revision.facts.pillars.month.stemTenGod).toBe("正财"); expect(body(young)).toContain("用过的玩具归回原处");
  expect(body(youth)).toContain("几项要求同时来到"); expect(body(youth)).toContain("借用的物品有交代");
  expect(body(youth)).toContain("规则若只剩催促");
  expect(body(youth).match(/若家中日程与学习或同伴活动碰在一起/gu)).toHaveLength(1); // Actual hour 戊正官; not a claim about children of the reader.
  expect(body(young)).not.toBe(body(youth));
  for (const result of [young, youth]) {
    expect(result.title).toBe("成长中的家庭支持");
    expect(body(result)).not.toMatch(/伴侣|夫妻|婚|家庭开销|固定开销|费用分摊|工资|客户|父母严厉|已有子女/);
    expect(result.evidence).toEqual(expect.arrayContaining(source.comprehensive.relationshipFoundation!.family.evidence));
    expect(result.sourceBinding.sex).toBe("female");
  }
  expect(source).toEqual(before);
});

it("distinguishes actual R4 steady support and alternative methods from R3 concentrated demands", () => {
  const r4 = buildNatalFamilyLifeStory(input("r4")), r3 = buildNatalFamilyLifeStory(input("r3"));
  expect(input("r4").revision.facts.pillars.year.stemTenGod).toBe("正财"); expect(input("r4").revision.facts.pillars.month.stemTenGod).toBe("偏印");
  expect(body(r4)).toContain("稳定陪伴与能够兑现的小约定"); expect(body(r4)).toContain("说明新办法解决哪一点");
  expect(body(r3)).toContain("难点中的及时协助"); expect(body(r3)).toContain("规律使用物品并回应已经答应的小事");
  expect(body(r4).match(/说明新办法解决哪一点/gu)).toHaveLength(1);
  expect(r4.conditions).toContain("月柱与时柱的明透角色相同，生活主题合并阅读，原位置与事实仍分别保留。");
  expect(body(r4)).not.toBe(body(r3));
  const familyFacts = input("r4").comprehensive.relationshipFoundation!.interactions.filter(item => item.fact.participants.some(part => part.position === "year" || part.position === "month"));
  for (const item of familyFacts) expect(r4.evidence.some(line => line.includes(item.fact.id))).toBe(true);
  expect(body(r4)).not.toMatch(/合去|冲散|一定会|必然|父亲|母亲|兄弟数量/);
});

it("keeps stem decisions and branch schedules separate for the existing binary participants", () => {
  const source = input("a-unknown"), child = buildNatalFamilyLifeStory({ ...source, referenceInstant: "2005-10-16T04:00:00Z" });
  expect(child.sourceBinding.sex).toBe("unspecified");
  const familyFacts = source.comprehensive.relationshipFoundation!.interactions.filter(item => item.fact.participants.some(part => part.position === "year" || part.position === "month"));
  expect(familyFacts.some(item => item.fact.relationType === "branch_six_clash")).toBe(true);
  expect(body(child)).toContain("在时间与节奏上");
  for (const item of familyFacts) expect(child.evidence.some(line => line.includes(item.fact.id))).toBe(true);
  expect(body(child)).not.toMatch(/两种视角|妻星|夫星|已有伴侣/);
  const wrong = structuredClone(source), first = wrong.comprehensive.relationshipFoundation!.interactions[0]!;
  first.fact.participants[0]!.value = "wrong";
  expect(() => buildNatalFamilyLifeStory(wrong)).toThrow("参与柱不匹配");
});

it("honours exact sixth/eighteenth birthdays and gives no personal story before birth", () => {
  const source = input("r3"), birth = new Date(source.revision.timeCalibration.utcInstant!);
  for (const [years, beforeStage, afterStage] of [[6, "young_child", "youth"], [18, "youth", "adult"]] as const) {
    const boundary = Date.UTC(birth.getUTCFullYear() + years, birth.getUTCMonth(), birth.getUTCDate(), birth.getUTCHours(), birth.getUTCMinutes(), birth.getUTCSeconds(), birth.getUTCMilliseconds());
    const before = buildNatalFamilyLifeStory({ ...source, referenceInstant: new Date(boundary - 1).toISOString() });
    const after = buildNatalFamilyLifeStory({ ...source, referenceInstant: new Date(boundary).toISOString() });
    expect(before.age!.stage).toBe(beforeStage); expect(after.age!.stage).toBe(afterStage);
    expect(body(before)).not.toBe(body(after));
    if (years === 18) expect(after.paragraphs).toEqual([source.comprehensive.relationshipFoundation!.family.verdict, ...source.comprehensive.relationshipFoundation!.family.paragraphs]);
  }
  const beforeBirth = buildNatalFamilyLifeStory({ ...source, referenceInstant: new Date(birth.getTime() - 1).toISOString() });
  expect(beforeBirth.age!.stage).toBe("before_birth"); expect(beforeBirth.paragraphs).toEqual([]);
});

it.each(["unknown_hour", "date_only"] as const)("uses no hour fact or invented child age in the explicit stored %s projection", precision => {
  const value = asProjection(input("hour-only"), precision), before = JSON.stringify(value);
  const result = buildNatalFamilyLifeStory(value);
  expect(result.sourceBinding.includeHour).toBe(false); expect(result.age!.stage).toBe("unknown");
  expect(result.paragraphs).toEqual([value.comprehensive.relationshipFoundation!.family.verdict, ...value.comprehensive.relationshipFoundation!.family.paragraphs]);
  expect(result.evidence.join("\n")).not.toMatch(/时柱明透|成长投影按时柱/);
  const changedHour = structuredClone(value); changedHour.revision.facts.pillars.hour = structuredClone(input("r3").revision.facts.pillars.hour);
  expect(buildNatalFamilyLifeStory(changedHour)).toEqual(result);
  expect(JSON.stringify(value)).toBe(before);
});

it("rejects mixed chapter, source, registered sex and selected-role facts without recomputing a chart", () => {
  const source = input("b");
  for (const binding of ["comprehensive", "foundation"] as const) {
    const value = structuredClone(source);
    (binding === "comprehensive" ? value.comprehensive : value.comprehensive.relationshipFoundation!).sourceBinding.chartResultHash = "0".repeat(64);
    expect(() => buildNatalFamilyLifeStory(value)).toThrow("来源不匹配");
  }
  const sex = structuredClone(source); sex.comprehensive.relationshipFoundation!.sourceBinding.sex = "female";
  expect(() => buildNatalFamilyLifeStory(sex)).toThrow("登记性别");
  const chapter = structuredClone(source); chapter.comprehensive.chapters.find(item => item.id === "family")!.paragraphs = ["modified"];
  expect(() => buildNatalFamilyLifeStory(chapter)).toThrow("家庭章节不一致");
  const role = structuredClone(source); role.revision.facts.pillars.year.stemTenGod = "invalid";
  expect(() => buildNatalFamilyLifeStory(role)).toThrow();
  expect(() => buildNatalFamilyLifeStory({ ...source, referenceInstant: "2030-01-01" })).toThrow("明确时区");
});
