import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlook } from "./local-annual-outlook";
import { createAnnualRelationshipTimingBuilder } from "./annual-relationship-timing";
import { buildAnnualRelationshipSignals } from "./annual-relationship-signals";
import { buildLocalReadingAgeContext } from "./local-reading-age-context";
import { buildAnnualEventReadingProse, type AnnualEventReadingProseInput } from "./annual-event-reading-prose";
import { createAnnualRelationshipNatalContextBuilder, type AnnualRelationshipNatalContext } from "./annual-relationship-natal-context";

const natalForInput = new WeakMap<AnnualEventReadingProseInput, AnnualRelationshipNatalContext>();
async function actual(date: string, sex: "male" | "female" | "unspecified", yearNumber: number, time = "08:26"): Promise<AnnualEventReadingProseInput[]> {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex,
    lunarLeapMonth: false, location: { label: "Synthetic relationship timing", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111", caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
  const assessment = buildBaziPreliminaryAssessment(revision), year = (await buildLocalAnnualOutlook(revision, assessment, yearNumber)).years[0]!;
  const timing = createAnnualRelationshipTimingBuilder(revision, assessment);
  const natal = createAnnualRelationshipNatalContextBuilder(revision, assessment);
  return year.judgmentSegments.map((segment) => {
    const signals = buildAnnualRelationshipSignals({ revision, year, segment });
    const input: AnnualEventReadingProseInput = { kind: "shared_arrangements", domain: "relationship", god: "比肩", path: "background", effect: "neutral", patternEffect: "neutral",
      age: buildLocalReadingAgeContext(revision.timeCalibration.utcInstant, segment.startInstant, segment.endExclusiveInstant),
      hasMonthBranchClash: false, hasMonthBranchCombination: false, hasDayStemInteraction: false,
      hasDayBranchClash: signals.some((signal) => signal.source === "year" && signal.relationType === "branch_six_clash"),
      hasDayBranchCombination: signals.some((signal) => signal.source === "year" && signal.relationType === "branch_six_combination"),
      appliedWork: null, appliedRelationship: "single", relationshipSignals: signals, relationshipTiming: timing(year, segment) };
    natalForInput.set(input, natal(input.relationshipTiming!));
    return input;
  });
}
let joined: AnnualEventReadingProseInput, entry: AnnualEventReadingProseInput, femaleJoined: AnnualEventReadingProseInput, femaleClash: AnnualEventReadingProseInput;
let contact: AnnualEventReadingProseInput, relatedOnly: AnnualEventReadingProseInput, concealed: AnnualEventReadingProseInput, child: AnnualEventReadingProseInput;
let unknown: AnnualEventReadingProseInput[], opposite: AnnualEventReadingProseInput[], oneLensOnly: AnnualEventReadingProseInput[];
let absent: AnnualEventReadingProseInput, childRecurrence: AnnualEventReadingProseInput;
beforeAll(async () => {
  const results = await Promise.all([
    actual("1995-08-18", "male", 2064), actual("1995-08-18", "male", 2034), actual("1995-08-18", "female", 2016), actual("1995-08-18", "female", 2067),
    actual("1995-08-18", "male", 2030), actual("1995-08-18", "male", 2025), actual("1995-05-18", "male", 2032), actual("2019-12-22", "female", 2028, "11:23"),
    actual("1995-08-18", "unspecified", 2064), actual("1995-08-18", "unspecified", 2028), actual("1995-08-18", "unspecified", 2034), actual("1991-07-08", "male", 2032, "06:26"), actual("2019-12-22", "female", 2029, "11:23")
  ]);
  [joined, entry, femaleJoined, femaleClash, contact, relatedOnly, concealed, child] = results.slice(0, 8).map((items) => items[0]!) as [AnnualEventReadingProseInput, AnnualEventReadingProseInput, AnnualEventReadingProseInput, AnnualEventReadingProseInput, AnnualEventReadingProseInput, AnnualEventReadingProseInput, AnnualEventReadingProseInput, AnnualEventReadingProseInput];
  unknown = results[8]!; opposite = results[9]!; oneLensOnly = results[10]!;
  absent = results[11]![0]!;
  childRecurrence = results[12]![0]!;
});
const prose = (input: AnnualEventReadingProseInput) => buildAnnualEventReadingProse(input);
const main = (input: AnnualEventReadingProseInput) => { const value = prose(input); return [value.title, value.summary, ...value.examples].join("\n"); };
const current = (input: AnnualEventReadingProseInput): AnnualEventReadingProseInput => ({ ...input, relationshipNatalContext: structuredClone(natalForInput.get(input)!) });

describe("relationship candidates from exact yearly star and palace combinations", () => {
  it("gives an adult single a real star-only candidate without requiring an existing partner", () => {
    expect(entry.relationshipTiming!.triggered).toBe(true); expect(entry.hasDayBranchClash || entry.hasDayBranchCombination).toBe(false);
    expect(prose(entry).title).toBe("新的认识与关系期待进入视野");
    expect(prose(entry).summary).toContain("本年甲正财明透");
    expect(prose(entry).examples.join()).toContain("进一步了解");
    expect(prose(entry).applicability.join()).toContain("不要求已经有对象");
    expect(prose(entry).notApplicableWhen.join()).not.toContain("只有日干互动或一般合作主题时");
  });

  it("distinguishes real primary-star plus palace-combination and killing plus palace-clash years", () => {
    expect(joined.hasDayBranchCombination).toBe(true); expect(femaleClash.hasDayBranchClash).toBe(true);
    expect(prose(joined).title).toBe("从认识走向稳定交往");
    expect(prose(femaleClash).title).toBe("认识机会与相处节奏同时变化");
    expect(prose(joined).summary).toContain("甲正财明透，并有日支六合");
    expect(prose(femaleClash).summary).toContain("丁七杀明透，并有日支六冲");
    expect(prose(femaleJoined).summary).toContain("正官视角着重持续约定");
    expect(prose(femaleClash).summary).toContain("七杀视角着重要求与推进节奏");
    expect(prose(joined).examples).not.toEqual(prose(femaleClash).examples);
    for (const input of [joined, entry, femaleJoined, femaleClash]) expect(main(input)).not.toMatch(/必定|一定结婚|必然结婚|大概率|\d+%|婚次/u);
  });

  it("does not promote indirect wealth alone and keeps every actual contact object in a contact reading", () => {
    expect(relatedOnly.relationshipTiming!.triggered).toBe(false);
    expect(relatedOnly.relationshipTiming!.lenses[0]!.signals.some((signal) => signal.source === "year" && signal.kind === "star_entry" && signal.relevance === "related_wealth")).toBe(true);
    const { relationshipTiming: _unused, ...legacy } = relatedOnly;
    expect(prose(relatedOnly)).toEqual(prose(legacy));
    const contacts = contact.relationshipTiming!.lenses[0]!.signals.filter((signal) => signal.source === "year" && signal.kind === "star_stem_contact");
    expect(contacts.length).toBeGreaterThan(0);
    for (const signal of contacts) expect(prose(contact).summary).toContain(signal.text);
    expect(prose(contact).title).toContain("原有投入");
    expect(prose(contact).summary).not.toContain("必有对象");
  });

  it("distinguishes a concealed original becoming visible in the year without claiming a first relationship", () => {
    expect(concealed.relationshipTiming!.lenses[0]!.signals.some((signal) => signal.kind === "hidden_to_visible" && signal.source === "year")).toBe(true);
    expect(prose(concealed).summary).toContain("原局只在支内的同字线索本年明透");
    expect(prose(concealed).summary).toContain("不表示这是第一次相识或首次有感情");
    expect(joined.relationshipTiming!.lenses[0]!.signals.some((signal) => signal.kind === "hidden_to_visible" && signal.source === "year")).toBe(false);
    expect(prose(joined).summary).not.toContain("由藏转显");
  });

  it("adapts known relationship states without treating separation as reconciliation or marriage as new dating", () => {
    const partnered = prose({ ...joined, appliedRelationship: "partnered" }), married = prose({ ...joined, appliedRelationship: "married" }), separated = prose({ ...joined, appliedRelationship: "separated" });
    expect(partnered.title).toContain("交往承诺"); expect(married.title).toContain("共同生活计划");
    expect(married.examples.join()).toContain("家务"); expect(separated.examples.join()).toContain("交接");
    expect(separated.summary).toContain("不等于复合");
    expect(new Set([prose(joined).summary, partnered.summary, married.summary, separated.summary]).size).toBe(4);
  });

  it("keeps unknown sex perspectives independent and uses only the exact same-branch background", () => {
    const input = unknown[0]!, before = structuredClone(input), output = prose(input);
    expect(input.relationshipTiming!.lenses.map((lens) => lens.id)).toEqual(["wealth", "authority"]);
    for (const lens of input.relationshipTiming!.lenses) expect(output.summary).toContain(lens.label + "：");
    expect(output.summary).toContain("没有本年主配偶星明透的触发");
    expect(output.summary).not.toMatch(/两种.*更高|概率提高|双倍/u);
    expect(input).toEqual(before);
    for (const item of oneLensOnly) {
      const inactive = item.relationshipTiming!.lenses.find((lens) => lens.focus !== "annual_focus");
      expect(inactive).toBeDefined();
      expect(prose(item).summary).toContain(`${inactive!.label}：本年没有独立的年度触发`);
      expect(prose(item).summary).not.toContain(`${inactive!.label}：${inactive!.label}`);
    }
    const forward = opposite.find((item) => item.relationshipTiming!.scope.branchId === "forward")!;
    const backwards = opposite.filter((item) => item.relationshipTiming!.scope.branchId === "backward");
    expect(prose(forward).summary).toContain("丁亥大运");
    for (const backward of backwards) expect(prose(backward).summary).not.toContain("丁亥大运");
    expect(backwards).toHaveLength(2);
    expect(prose(backwards[0]!).summary).not.toContain("庚辰大运背景");
    expect(prose(backwards[1]!).summary).toContain("庚辰大运背景");
    expect(prose(backwards[1]!).summary).toContain("偏财相关线索");
    expect(prose(backwards[1]!).summary).not.toBe(prose(backwards[0]!).summary);
  });

  it("uses actual child and neutral age contexts before adult status, and never borrows career effects", () => {
    expect(child.age.stage).toBe("youth");
    const childText = main({ ...child, appliedRelationship: "married" });
    expect(childText).toContain("同伴"); expect(childText).not.toMatch(/伴侣|婚恋|夫妻|约见|复合|配偶/u);
    const neutralAge = buildLocalReadingAgeContext(null, entry.relationshipTiming!.scope.startInstant, entry.relationshipTiming!.scope.endExclusiveInstant);
    const neutral = main({ ...entry, age: neutralAge, appliedRelationship: "married" });
    expect(neutral).not.toMatch(/孩子|家长|伴侣|婚恋|夫妻|客户|岗位/u);
    expect(prose({ ...joined, effect: "assists", patternEffect: "assists" })).toEqual(prose({ ...joined, effect: "obstructs", patternEffect: "obstructs" }));
    const beforeBirth = buildLocalReadingAgeContext("2099-01-01T00:00:00Z", entry.relationshipTiming!.scope.startInstant, entry.relationshipTiming!.scope.endExclusiveInstant);
    expect(prose({ ...entry, age: beforeBirth }).examples).toEqual([]);
  });
});

describe("answer-first relationship reading preserves its exact reasoning", () => {
  it("allows a real annual primary role when absent in the natal chart without inventing a first relationship", () => {
    const input = current(absent), output = prose(input);
    expect(input.relationshipNatalContext!.lenses[0]!.primary.presence).toBe("absent");
    expect(input.relationshipNatalContext!.lenses[0]!.related.presence).toBe("absent");
    expect(input.relationshipTiming!.lenses[0]!.signals.some((signal) => signal.source === "year" && signal.kind === "star_entry" && signal.stem === "壬")).toBe(true);
    expect(output.title).toBe("新的认识与关系期待进入视野");
    expect(output.reasoning!.join()).toContain("所选本命位置未见");
    expect(main(input)).not.toMatch(/无婚|没有婚姻|首次|第一段|必有|一定|必然/u);
  });
  it("distinguishes A's explicit commitment theme from B's less explicit expectations and expression rhythm", () => {
    const a = current(entry), b = current(concealed), ap = prose(a), bp = prose(b);
    expect(a.relationshipNatalContext!.lenses[0]!.primary.presence).toBe("visible");
    expect(b.relationshipNatalContext!.lenses[0]!.primary.presence).toBe("hidden_only");
    expect(a.relationshipNatalContext!.dayPalace.roleGroup).toBe("authority");
    expect(b.relationshipNatalContext!.dayPalace.roleGroup).toBe("output");
    expect(ap.summary).toContain("约定能否持续兑现"); expect(bp.summary).toContain("表达与回应节奏");
    expect(ap.summary).toContain("明确回应"); expect(bp.summary).toContain("相处期待说清");
    expect(bp.summary).not.toMatch(/含蓄|暗恋|平时没有|尚未明确|原先未说清/u);
    expect(ap.title).not.toBe(bp.title); expect(ap.examples).not.toEqual(bp.examples);
    expect(ap.reasoning!.join()).toContain("本命日柱辛巳"); expect(bp.reasoning!.join()).toContain("仅在支藏");
  });

  it("moves exact star, hidden-position and same-period background statements into complete reasoning", () => {
    for (const value of [entry, concealed, contact, femaleJoined, femaleClash, ...opposite]) {
      const input = current(value), before = structuredClone(input), output = prose(input);
      expect(main(input)).not.toMatch(/正财|偏财|正官|七杀|本气|明透|藏转显|天干|日支|大运|规则 |位置 /u);
      for (const lens of input.relationshipTiming!.lenses) for (const signal of lens.signals) expect(output.reasoning).toContain(signal.text);
      expect(output.reasoning!.join()).toContain("不是古籍逐字给出的事件保证");
      expect(input).toEqual(before);
    }
    expect(prose(current(concealed)).reasoning!.join()).toContain("不表示首次相识");
    // Existing calls without the new context retain their original output.
    expect(prose(concealed).summary).toContain("原局只在支内的同字线索本年明透");
    expect(prose(concealed).reasoning).toBeUndefined();
  });

  it("keeps life-level effects of exact opposite backgrounds and never borrows the next handover", () => {
    const forward = opposite.find((item) => item.relationshipTiming!.scope.branchId === "forward")!;
    const backwards = opposite.filter((item) => item.relationshipTiming!.scope.branchId === "backward");
    const f = prose(current(forward)), first = prose(current(backwards[0]!)), later = prose(current(backwards[1]!));
    expect(f.summary).toContain("重排旧节奏");
    for (const output of [first, later]) expect(output.summary).not.toContain("重排旧节奏");
    expect(first.reasoning!.join()).not.toContain("庚辰大运背景"); expect(later.reasoning!.join()).toContain("庚辰大运背景");
    expect(first.summary).not.toBe(later.summary);
    expect(later.summary).toContain("既有需要衔接的一面，也有需要重新划清的边界");
    for (const lens of current(forward).relationshipTiming!.lenses) expect(f.summary).toContain(`${lens.label}：`);
    const unspecified = prose({ ...current(backwards[0]!), appliedRelationship: "unspecified" });
    expect(unspecified.summary).toContain("本年的关系主题是把共同安排推进到具体确认");
    expect(unspecified.summary).not.toContain("关系状态未填写，本年先对照");
    expect(unspecified.applicability.join()).toContain("现实中的相应关系");
  });

  it("retains declared relationship states and prioritizes real age over adult assumptions", () => {
    const base = current(entry), views = (["single", "partnered", "married", "separated", "unspecified"] as const).map((appliedRelationship) => prose({ ...base, appliedRelationship }));
    expect(new Set(views.map((item) => item.summary)).size).toBe(5);
    expect(views[2]!.summary).toContain("共同生活"); expect(views[2]!.examples.join()).not.toContain("认识新的人");
    expect(views[3]!.summary).toContain("各自独立生活");
    const c = current(child);
    expect(main({ ...c, appliedRelationship: "married" })).not.toMatch(/伴侣|婚恋|夫妻|约见|复合|配偶/u);
    const recurring = current(childRecurrence), recurringText = prose(recurring);
    expect(recurring.relationshipNatalContext!.lenses[0]!.primary.occurrences.some((item) => item.stem === "己" && item.visibility === "visible")).toBe(true);
    expect(recurringText.title).toBe("同伴参与与家人约定更具体");
    expect(recurringText.summary).not.toMatch(/新的同伴|新人物|首次|丈夫|对象/u);
    const age = buildLocalReadingAgeContext(null, base.relationshipTiming!.scope.startInstant, base.relationshipTiming!.scope.endExclusiveInstant);
    expect(main({ ...base, age, appliedRelationship: "married" })).not.toMatch(/孩子|家长|伴侣|婚恋|夫妻|客户|岗位/u);
    expect(prose({ ...base, effect: "assists", patternEffect: "assists" })).toEqual(prose({ ...base, effect: "obstructs", patternEffect: "obstructs" }));
  });

  it("rejects mismatched natal sex, hour coverage or source before describing a current year", () => {
    for (const field of ["revisionId", "chartResultHash", "sex", "includeHour"] as const) {
      const value = current(entry);
      if (field === "includeHour") value.relationshipNatalContext!.sourceBinding.includeHour = false;
      else if (field === "sex") value.relationshipNatalContext!.sourceBinding.sex = "female";
      else value.relationshipNatalContext!.sourceBinding[field] = "different";
      expect(() => prose(value)).toThrow(/来源不一致/u);
    }
  });
});
