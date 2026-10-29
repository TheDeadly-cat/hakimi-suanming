import { beforeAll, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type ResearchNoteRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { buildNatalRelationshipLifeStory, NATAL_RELATIONSHIP_LIFE_STORY_VERSION, type NatalRelationshipLifeStoryInput } from "./natal-relationship-life-story";
import { buildReadingContextRecord, resolveReadingContext, LOCAL_READING_CONTEXT_TAG, type ReadingContextRelationship } from "./local-reading-context";
import { buildContextualReadingBundle } from "./local-contextual-reading-record";

const cases = new Map<string, NatalRelationshipLifeStoryInput>();
const input = (id: string) => structuredClone(cases.get(id)!);
const body = (value: ReturnType<typeof buildNatalRelationshipLifeStory>) => value.paragraphs.join("\n");
beforeAll(async () => {
  for (const [id, date, time, sex] of [
    ["a", "1995-08-18", "08:26", "unspecified"], ["b", "1995-05-18", "08:26", "male"],
    ["r3", "2019-12-22", "11:23", "female"], ["r4", "2018-11-19", "14:26", "male"],
    ["resource-heavy", "1982-10-02", "10:26", "male"], ["different-resource", "1982-10-10", "10:26", "male"]
  ] as const) {
    const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex,
      lunarLeapMonth: false, location: { label: "Synthetic relationship life view", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic only" }, WORKING_DEFAULT_RULE_PROFILE);
    const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
    const assessment = buildBaziPreliminaryAssessment(revision);
    cases.set(id, { revision, assessment, comprehensive: buildBaziComprehensiveReading(revision, assessment), referenceInstant: "2026-10-16T04:00:00Z" });
  }
});
async function withContext(value: NatalRelationshipLifeStoryInput, relationship: ReadingContextRelationship, year = 2026, notes = "合成背景；不作真实人物经历") {
  const revision = value.revision;
  const body = await buildReadingContextRecord(revision, null, { work: "unspecified", relationship, fromYear: year, toYear: year, notes });
  const record: ResearchNoteRecord = { schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: revision.caseId, anchor: { kind: "revision", revisionId: revision.id },
    bodyFormat: "markdown", body, tags: [LOCAL_READING_CONTEXT_TAG], sourceRefs: [], lifecycle: "active", editVersion: 1,
    createdAt: "2026-10-16T00:00:00.000Z", updatedAt: "2026-10-16T00:00:00.000Z" };
  const context = await resolveReadingContext({ revision, records: [record] });
  expect(context.issues).toEqual([]);
  const contextual = buildContextualReadingBundle({ revision, assessment: value.assessment, comprehensive: value.comprehensive, annualDomains: null, context: context.latest, referenceYear: year });
  return { ...value, contextual };
}

it("gives actual official, food, direct and indirect resource palaces different answers without borrowing career strength", () => {
  const a = input("a"), b = input("b"), direct = input("resource-heavy"), indirect = input("different-resource");
  expect(a.comprehensive.relationshipFoundation!.dayPalace.mainTenGod).toBe("正官");
  expect(b.comprehensive.relationshipFoundation!.dayPalace.mainTenGod).toBe("食神");
  expect(direct.comprehensive.relationshipFoundation!.dayPalace.mainTenGod).toBe("正印");
  expect(indirect.comprehensive.relationshipFoundation!.dayPalace.mainTenGod).toBe("偏印");
  const stories = [a, b, direct, indirect].map(value => buildNatalRelationshipLifeStory(value));
  expect(new Set(stories.map(story => story.title)).size).toBe(4);
  expect(stories[0]!.paragraphs[0]).toContain("检查和催促");
  expect(stories[1]!.paragraphs[0]).toContain("细小而持续的回应");
  expect(stories[2]!.paragraphs[0]).toContain("倾听、建议与代办");
  expect(stories[3]!.paragraphs[0]).toContain("省略了中间过程");
  for (const story of stories) {
    expect(story.version).toBe(NATAL_RELATIONSHIP_LIFE_STORY_VERSION);
    expect(story.paragraphs.length).toBeGreaterThanOrEqual(3); expect(story.paragraphs.length).toBeLessThanOrEqual(5);
    expect(story.appliedRelationship).toBeNull(); expect(story.contextRef).toBeNull();
    expect(story.sourceSubjects).toEqual(["chapter-relationships"]);
    expect(body(story)).not.toMatch(/事业.*顺利|收入增加|必婚|必离|婚期|概率|几段婚姻/);
  }
});

it("preserves visible and concealed roles, parallel perspectives and actual palace/stem layers", () => {
  for (const id of ["a", "b", "resource-heavy"]) {
    const value = input(id), before = JSON.stringify(value), f = value.comprehensive.relationshipFoundation!, story = buildNatalRelationshipLifeStory(value);
    for (const evidence of f.relationship.evidence) expect(story.evidence).toContain(evidence);
    for (const caution of f.relationship.cautions) expect(story.conditions).toContain(caution);
    expect(JSON.stringify(value)).toBe(before);
  }
  const a = buildNatalRelationshipLifeStory(input("a")), b = buildNatalRelationshipLifeStory(input("b"));
  expect(a.paragraphs[2]).toContain("投入视角"); expect(a.paragraphs[2]).toContain("约定要求视角");
  expect(body(a)).toContain("愿意一起安排与仍有节奏差别可以同时存在");
  expect(body(a)).toContain("明透角色的冲突另落在说法与决定上");
  expect(b.paragraphs[2]).toContain("只在原局藏位");
  expect(b.paragraphs[2]).toContain("不当成对方已经明确表达的态度");
});

it("uses four verified current adult backgrounds with genuinely different scenes and exact dependencies", async () => {
  const scenes = new Set<string>();
  for (const status of ["single", "partnered", "married", "separated"] as const) {
    const value = await withContext(input("b"), status), before = JSON.stringify(value), story = buildNatalRelationshipLifeStory(value);
    expect(story.appliedRelationship).toBe(status);
    expect(story.contextRef).toEqual(value.contextual!.contextSource.reference);
    expect(story.sourceSubjects).toEqual(["chapter-relationships", "contextual-chapter-relationships"]);
    expect(story.sourceVersions).toContain(value.contextual!.version);
    scenes.add(story.paragraphs[1]!);
    expect(body(story)).not.toMatch(/必.*复合|一定.*相识|已有子女|已经离婚|已经同居/);
    expect(JSON.stringify(value)).toBe(before);
    if (status === "single") expect(story.paragraphs[1]).toContain("多次交流");
    if (status === "partnered") expect(story.paragraphs[1]).toContain("一起吃饭、散步");
    if (status === "married") expect(story.paragraphs[1]).toContain("执行、提醒与收尾");
    if (status === "separated") expect(story.paragraphs[1]).toContain("确实还需协商");
  }
  expect(scenes.size).toBe(4);
});

it("requires the exact contextual item, rejects tampering and never parses notes as a relationship state", async () => {
  const value = await withContext(input("b"), "single"), plain = buildNatalRelationshipLifeStory(input("b"));
  const wrong = structuredClone(value); wrong.contextual!.readings.find(item => item.subjectId === "contextual-chapter-relationships")!.paragraphs[0] += "changed";
  expect(() => buildNatalRelationshipLifeStory(wrong)).toThrow("背景正文");
  const absent = structuredClone(value); absent.contextual!.readings = [];
  expect(buildNatalRelationshipLifeStory(absent).paragraphs).toEqual(plain.paragraphs);
  expect(buildNatalRelationshipLifeStory(absent).appliedRelationship).toBeNull();
  const outOfYear = await withContext(input("b"), "married", 2025);
  expect(buildNatalRelationshipLifeStory(outOfYear).paragraphs).toEqual(plain.paragraphs);
  expect(buildNatalRelationshipLifeStory(outOfYear).contextRef).toBeNull();
  const noted = await withContext(input("b"), "single", 2026, "已婚并有孩子，## 条件\n{relationship: married}");
  expect(buildNatalRelationshipLifeStory(noted).paragraphs).toEqual(buildNatalRelationshipLifeStory(value).paragraphs);
  expect(buildNatalRelationshipLifeStory(noted).appliedRelationship).toBe("single");
});

it("keeps existing contextual answers literally when reference/age is unknown, without claiming the adult state applies", async () => {
  const known = await withContext(input("b"), "married"), contextual = known.contextual!.readings.find(item => item.subjectId === "contextual-chapter-relationships")!;
  const unknown = buildNatalRelationshipLifeStory({ ...known, referenceInstant: null });
  expect(unknown.age).toBeNull(); expect(unknown.appliedRelationship).toBeNull();
  expect(unknown.paragraphs).toEqual([contextual.summary, ...contextual.paragraphs]);
  expect(unknown.contextRef).toEqual(known.contextual!.contextSource.reference);
  const source = input("b"), revision = structuredClone(source.revision);
  revision.input.time = null; revision.input.timePrecision = "unknown_hour";
  const assessment = buildBaziPreliminaryAssessment(revision), comprehensive = buildBaziComprehensiveReading(revision, assessment);
  const noContext = buildNatalRelationshipLifeStory({ revision, assessment, comprehensive, referenceInstant: source.referenceInstant });
  expect(noContext.paragraphs).toHaveLength(2);
  expect(body(noContext)).not.toMatch(/未另列|未列日支|缺少某种互动/);
  expect(noContext.conditions).toContain("原层未列日支或明透星干的二元合冲情境；未见互动不作关系好坏结论，不补写已经发生的矛盾。");
  const projected = await withContext({ revision, assessment, comprehensive, referenceInstant: source.referenceInstant }, "single");
  const result = buildNatalRelationshipLifeStory(projected), original = projected.contextual!.readings.find(item => item.subjectId === "contextual-chapter-relationships")!;
  expect(result.age!.stage).toBe("unknown"); expect(result.sourceBinding.includeHour).toBe(false); expect(result.appliedRelationship).toBeNull();
  expect(result.paragraphs).toEqual([original.summary, ...original.paragraphs]);
  const changedHour = structuredClone(projected); changedHour.revision.facts.pillars.hour = input("r3").revision.facts.pillars.hour;
  expect(buildNatalRelationshipLifeStory(changedHour)).toEqual(result);
});

it("uses preschool/youth scenes before adult status, and generates no story before birth", async () => {
  const source = input("r3"), future = await withContext(source, "married", 2040);
  const young = buildNatalRelationshipLifeStory({ ...future, referenceInstant: "2025-11-01T04:00:00Z" });
  const youth = buildNatalRelationshipLifeStory({ ...future, referenceInstant: "2030-11-01T04:00:00Z" });
  expect(young.age!.stage).toBe("young_child"); expect(youth.age!.stage).toBe("youth");
  for (const story of [young, youth, buildNatalRelationshipLifeStory(input("r4"))]) {
    expect(story.appliedRelationship).toBeNull(); expect(story.contextRef).toBeNull(); expect(story.sourceSubjects).toEqual(["chapter-relationships"]);
    expect(body(story)).not.toMatch(/伴侣|妻星|夫星|婚|开销|工资|恋爱|共同生活/);
    expect(story.paragraphs).toHaveLength(3);
  }
  expect(young.paragraphs[0]).not.toBe(youth.paragraphs[0]);
  expect(source.comprehensive.relationshipFoundation!.dayPalace.mainTenGod).toBe("正财");
  expect(body(young)).toContain("用过的玩具放回原处"); expect(body(youth)).toContain("已经答应的小事有交代");
  const birth = new Date(source.revision.timeCalibration.utcInstant!);
  expect(buildNatalRelationshipLifeStory({ ...source, referenceInstant: new Date(birth.getTime() - 1).toISOString() }).paragraphs).toEqual([]);
  const sixth = new Date(birth); sixth.setUTCFullYear(sixth.getUTCFullYear() + 6);
  const eighteenth = new Date(birth); eighteenth.setUTCFullYear(eighteenth.getUTCFullYear() + 18);
  for (const [instant, before, after] of [[sixth, "young_child", "youth"], [eighteenth, "youth", "adult"]] as const) {
    expect(buildNatalRelationshipLifeStory({ ...source, referenceInstant: new Date(instant.getTime() - 1).toISOString() }).age!.stage).toBe(before);
    expect(buildNatalRelationshipLifeStory({ ...source, referenceInstant: instant.toISOString() }).age!.stage).toBe(after);
  }
});

it("rejects foreign source, sex, day-palace, visibility and contextual identity", async () => {
  const source = input("a");
  const wrong = structuredClone(source); wrong.comprehensive.relationshipFoundation!.sourceBinding.sex = "female";
  expect(() => buildNatalRelationshipLifeStory(wrong)).toThrow("登记性别");
  const foreign = structuredClone(source); foreign.assessment.sourceBinding.revisionId = crypto.randomUUID();
  expect(() => buildNatalRelationshipLifeStory(foreign)).toThrow("来源不匹配");
  const palace = structuredClone(source); palace.comprehensive.relationshipFoundation!.dayPalace.mainTenGod = "食神";
  expect(() => buildNatalRelationshipLifeStory(palace)).toThrow("日支事实");
  const hidden = input("b"), occurrence = hidden.comprehensive.relationshipFoundation!.perspectives[0]!.occurrences[0]!;
  occurrence.visibility = "visible";
  expect(() => buildNatalRelationshipLifeStory(hidden)).toThrow("透藏对象");
  const context = await withContext(input("b"), "single"); context.contextual!.contextSource.document.sourceBinding.caseId = crypto.randomUUID();
  expect(() => buildNatalRelationshipLifeStory(context)).toThrow("背景来源");
  expect(() => buildNatalRelationshipLifeStory({ ...source, referenceInstant: "2026-10-16" })).toThrow("明确时区");
});
