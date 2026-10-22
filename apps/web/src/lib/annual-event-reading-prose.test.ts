import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { calculateTransitSnapshot } from "@hakimi/transit-core";
import { calculatePillarRelations } from "@hakimi/relations-core";
import { LunarUtil } from "lunar-typescript";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalOutlookJudgment } from "./local-outlook-judgment";
import { buildLocalReadingAgeContext } from "./local-reading-age-context";
import { buildAnnualEventReadingProse, type AnnualEventReadingProseInput } from "./annual-event-reading-prose";
import { buildLocalAnnualOutlook } from "./local-annual-outlook";
import { buildAnnualRelationshipSignals } from "./annual-relationship-signals";

async function actualInput(date: string, year: number, kind: AnnualEventReadingProseInput["kind"], domain: AnnualEventReadingProseInput["domain"], manualDirection?: "forward" | "backward"): Promise<AnnualEventReadingProseInput> {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time: "08:26", timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: manualDirection ? "unspecified" : "male", lunarLeapMonth: false,
    location: { label: "Synthetic annual event prose", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111", caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00.000Z" });
  const snapshot = await calculateTransitSnapshot({ revision, atInstant: `${year}-07-01T04:00:00.000Z`, ...(manualDirection ? { manualDirection } : {}) });
  if (snapshot.slots.year.status !== "resolved") throw new Error("Synthetic year is not resolved");
  const node = snapshot.slots.year.node;
  const dayun = snapshot.slots.dayun.status === "resolved" ? snapshot.slots.dayun.node : null;
  const startInstant = new Date(Math.max(Date.parse(node.startInstant), dayun ? Date.parse(dayun.startInstant) : -Infinity)).toISOString();
  const endExclusiveInstant = new Date(Math.min(Date.parse(node.endExclusiveInstant), dayun ? Date.parse(dayun.endExclusiveInstant) : Infinity)).toISOString();
  const judgment = buildLocalOutlookJudgment(revision, buildBaziPreliminaryAssessment(revision), { target: node, background: dayun ? { dayun } : undefined, startInstant, endExclusiveInstant });
  const axis = judgment.axes.find((entry) => entry.axis === "pattern")!;
  const actor = axis.evidence.find((line) => line.startsWith(`流年${node.ganZhi}透`) && line.includes("作为透干作用")) ?? "";
  const relationTypes = (position: "month" | "day") => calculatePillarRelations({ year: node.ganZhi, month: revision.facts.pillars[position].ganZhi, day: node.ganZhi, hour: revision.facts.pillars[position].ganZhi }).facts
    .filter((fact) => fact.completeness === "binary" && fact.participants.length === 2 && fact.participants.some((part) => part.position === "year") && fact.participants.some((part) => part.position === "month")).map((fact) => fact.relationType);
  const month = relationTypes("month"), day = relationTypes("day");
  return { kind, domain, god: LunarUtil.SHI_SHEN[revision.facts.pillars.day.stem + node.ganZhi[0]], path: axis.pathId,
    effect: actor.includes("支持此路径分支") ? "assists" : actor.includes("增加阻碍或负荷") ? "obstructs" : "neutral", patternEffect: axis.effect,
    age: buildLocalReadingAgeContext(revision.timeCalibration.utcInstant, judgment.interval.startInstant, judgment.interval.endExclusiveInstant),
    hasMonthBranchClash: month.includes("branch_six_clash"), hasMonthBranchCombination: month.includes("branch_six_combination"),
    hasDayBranchClash: day.includes("branch_six_clash"), hasDayBranchCombination: day.includes("branch_six_combination"),
    hasDayStemInteraction: day.some((type) => type === "stem_five_combination" || type === "stem_clash"), appliedWork: null, appliedRelationship: null };
}
let b26: AnnualEventReadingProseInput, b30: AnnualEventReadingProseInput, b32: AnnualEventReadingProseInput,
  a31: AnnualEventReadingProseInput, a35: AnnualEventReadingProseInput, a05: AnnualEventReadingProseInput, b28: AnnualEventReadingProseInput, a28forward: AnnualEventReadingProseInput, a28backward: AnnualEventReadingProseInput;
let roleYears: AnnualEventReadingProseInput[], childRoleYears: AnnualEventReadingProseInput[], youngChildRole: AnnualEventReadingProseInput;
let relationshipPeriods: { branch: string; start: string; end: string; input: AnnualEventReadingProseInput }[];
let childhoodRelationshipPeriods: typeof relationshipPeriods;
let b31: AnnualEventReadingProseInput, b33: AnnualEventReadingProseInput, crossingSix: AnnualEventReadingProseInput;
beforeAll(async () => {
  [b31, b33, crossingSix] = await Promise.all([
    actualInput("1995-05-18", 2031, "delivery", "career"),
    actualInput("1995-05-18", 2033, "new_collaboration", "career"),
    actualInput("2019-12-22", 2025, "delivery", "career")
  ]);
  [b26, b30, b32, a31, a35, a05, b28, a28forward, a28backward] = await Promise.all([
    actualInput("1995-05-18", 2026, "study", "career"), actualInput("1995-05-18", 2030, "proposal", "career"), actualInput("1995-05-18", 2032, "settlement", "wealth"),
    actualInput("1995-08-18", 2031, "shared_arrangements", "relationship"), actualInput("1995-08-18", 2035, "shared_arrangements", "relationship"),
    actualInput("1995-08-18", 2005, "study", "career"), actualInput("1995-05-18", 2028, "work_change", "career"),
    actualInput("1995-08-18", 2028, "study", "career", "forward"), actualInput("1995-08-18", 2028, "study", "career", "backward"),
  ]);
  roleYears = [b28, ...await Promise.all([2029, 2034, 2035].map((year) => actualInput("1995-05-18", year, "work_change", "career")))];
  childRoleYears = await Promise.all([2008, 2009, 2004, 2005].map((year) => actualInput("1995-05-18", year, "work_change", "career")));
  youngChildRole = await actualInput("1995-05-18", 1998, "work_change", "career");
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26", timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "unspecified", lunarLeapMonth: false,
    location: { label: "Synthetic relationship periods", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
  const year = (await buildLocalAnnualOutlook(revision, buildBaziPreliminaryAssessment(revision), 2028)).years[0]!;
  relationshipPeriods = year.judgmentSegments.map((segment) => {
    const signals = buildAnnualRelationshipSignals({ revision, year, segment });
    return { branch: segment.branchId, start: segment.startInstant, end: segment.endExclusiveInstant,
      input: { ...a31, god: LunarUtil.SHI_SHEN[revision.facts.pillars.day.stem + year.yearGanZhi![0]], path: segment.judgment.axes.find((axis) => axis.axis === "pattern")!.pathId,
        patternEffect: segment.judgment.axes.find((axis) => axis.axis === "pattern")!.effect, effect: "neutral",
        hasDayBranchClash: signals.some((signal) => signal.source === "year" && signal.relationType === "branch_six_clash"),
        hasDayBranchCombination: signals.some((signal) => signal.source === "year" && signal.relationType === "branch_six_combination"),
        age: buildLocalReadingAgeContext(revision.timeCalibration.utcInstant, segment.startInstant, segment.endExclusiveInstant), relationshipSignals: signals } };
  });
  const childChart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-05-18", time: "08:26", timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
    location: { label: "Synthetic child relationship handover", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const childRevision = storedRevisionRecordSchema.parse({ ...childChart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
  const childYear = (await buildLocalAnnualOutlook(childRevision, buildBaziPreliminaryAssessment(childRevision), 1999)).years[0]!;
  childhoodRelationshipPeriods = childYear.judgmentSegments.map((segment) => {
    const signals = buildAnnualRelationshipSignals({ revision: childRevision, year: childYear, segment });
    return { branch: segment.branchId, start: segment.startInstant, end: segment.endExclusiveInstant,
      input: { ...a31, god: LunarUtil.SHI_SHEN[childRevision.facts.pillars.day.stem + childYear.yearGanZhi![0]], path: segment.judgment.axes.find((axis) => axis.axis === "pattern")!.pathId,
        patternEffect: segment.judgment.axes.find((axis) => axis.axis === "pattern")!.effect, effect: "neutral",
        hasDayBranchClash: signals.some((signal) => signal.source === "year" && signal.relationType === "branch_six_clash"),
        hasDayBranchCombination: signals.some((signal) => signal.source === "year" && signal.relationType === "branch_six_combination"),
        age: buildLocalReadingAgeContext(childRevision.timeCalibration.utcInstant, segment.startInstant, segment.endExclusiveInstant), relationshipSignals: signals } };
  });
});

describe("specific annual event prose consumes facts without selecting events or outcomes", () => {
  it("answers six real adult themes with conditional settings when employment is unfilled, without assigning a job", () => {
    const inputs = [b28, b26, b30, b31, b32, b33];
    expect(inputs.map((input) => input.kind)).toEqual(["work_change", "study", "proposal", "delivery", "settlement", "new_collaboration"]);
    for (const domain of ["career", "wealth"] as const) {
      const results = inputs.map((input) => buildAnnualEventReadingProse({ ...input, domain }));
      expect(new Set(results.map((result) => result.title)).size).toBe(6);
      expect(new Set(results.map((result) => result.summary)).size).toBe(6);
      expect(new Set(results.map((result) => result.examples.join())).size).toBe(6);
      for (let index = 0; index < results.length; index++) {
        const result = results[index]!;
        expect([result.title, result.summary, ...result.examples].join()).not.toMatch(/已经入职|已被录用|必然|保证收入/);
        expect(result.examples.every(example=>/^若(?:在职|正在求职或进修|有自营业务或实际合作)，/.test(example))).toBe(true);
        expect(result).toEqual(buildAnnualEventReadingProse({ ...inputs[index]!, domain, appliedWork: "unspecified" }));
        expect(result.examples.length).toBeGreaterThanOrEqual(1);
      }
    }
    expect(buildAnnualEventReadingProse(b30).examples.join()).toContain("流程改进、内部提案或小范围试点");
    expect(buildAnnualEventReadingProse(b31).summary).toContain("熟练完成");
    expect(buildAnnualEventReadingProse(b32).examples.join()).toContain("已发生费用、报销记录和原待遇约定");
    expect(buildAnnualEventReadingProse({ ...b32, appliedWork: "employed" }).title).toContain("回款条件");
  });

  it("uses both real age segments in a year crossing six even without mechanism enrichment", () => {
    expect(crossingSix.age.segments.map((segment) => segment.stage)).toEqual(["young_child", "youth"]);
    const result = buildAnnualEventReadingProse({ ...crossingSix, appliedWork: "employed" });
    for (const segment of crossingSix.age.segments) {
      expect(result.summary).toContain(`${segment.label}这一段`);
      expect(result.examples.some((text) => text.startsWith(`${segment.label}这一段`))).toBe(true);
    }
    expect(result.examples.join()).toContain("5周岁这一段：一段熟悉游戏");
    expect([result.title, result.summary, ...result.examples].join()).not.toMatch(/阶段报告|课题|竞赛|交接|维护|验收|客户|岗位/);
    // Role subjects use the same exact age partition instead of the last age.
    const role = buildAnnualEventReadingProse({ ...crossingSix, kind: "work_change", god: "比肩" });
    for (const segment of crossingSix.age.segments) expect(role.summary).toContain(`${segment.label}这一段`);
    expect(role.summary).not.toMatch(/岗位|客户|课题/);
  });

  it("gives five adult relationship backgrounds distinct concrete matters for both the actual yearly combination and clash", () => {
    const joined = relationshipPeriods.find((period) => period.branch === "backward")!.input;
    const states = ["single", "partnered", "married", "separated", "unspecified"] as const;
    for (const input of [joined, a31]) {
      const outputs = states.map((state) => buildAnnualEventReadingProse({ ...input, appliedRelationship: state }));
      expect(new Set(outputs.map((item) => item.title)).size).toBe(5);
      expect(new Set(outputs.map((item) => item.summary)).size).toBe(5);
      expect(new Set(outputs.map((item) => item.examples.join())).size).toBe(5);
      expect(outputs.every((item) => item.examples.length === 2)).toBe(true);
      expect(outputs[0]!.summary).toContain("已有接触");
      expect(outputs[1]!.examples.join()).toMatch(/计划|日程|联系/);
      expect(outputs[2]!.examples.join()).toMatch(/家务|居住|照料/);
      expect(outputs[3]!.examples.join()).toContain("交接");
      expect(outputs[4]!.summary).toContain("关系状态未填写");
      for (const output of outputs) expect([output.title, output.summary, ...output.examples].join()).not.toMatch(/大概率|必定|一定结婚|必然分手|[0-9]+%|桃花旺/);
    }
    for (const state of states) {
      const combination = buildAnnualEventReadingProse({ ...joined, appliedRelationship: state }), clash = buildAnnualEventReadingProse({ ...a31, appliedRelationship: state });
      expect(combination.summary).not.toBe(clash.summary); expect(combination.examples).not.toEqual(clash.examples);
    }
  });

  it("keeps the real forward year's combination and decade clash together without lending them to either backward handover segment", () => {
    expect(relationshipPeriods.filter((period) => period.branch === "backward")).toHaveLength(2);
    const forward = relationshipPeriods.find((period) => period.branch === "forward")!, backward = relationshipPeriods.filter((period) => period.branch === "backward");
    expect(forward.input.relationshipSignals!.map((signal) => [signal.source, signal.relationType])).toEqual([
      ["year", "branch_six_combination"], ["dayun", "branch_six_clash"]]);
    const original = structuredClone(relationshipPeriods);
    const result = buildAnnualEventReadingProse({ ...forward.input, appliedRelationship: "married" });
    expect(result.summary).toContain("共同生活中已经认同的计划做实");
    expect(result.summary).toContain("本段丁亥大运另有日支六冲背景");
    expect(result.summary).toContain("旧安排怎样调整一起处理");
    for (const period of backward) {
      expect(period.input.relationshipSignals!.every((signal) => signal.source === "year")).toBe(true);
      expect(buildAnnualEventReadingProse({ ...period.input, appliedRelationship: "married" }).summary).not.toContain("大运另有日支六冲背景");
    }
    expect(backward[0]!.end).toBe(backward[1]!.start);
    const crossed = { ...backward[0]!.input, relationshipSignals: [...backward[0]!.input.relationshipSignals!, ...forward.input.relationshipSignals!.filter((signal) => signal.source === "dayun")] };
    expect(buildAnnualEventReadingProse({ ...crossed, appliedRelationship: "married" }).summary).not.toContain("丁亥大运");
    expect(relationshipPeriods).toEqual(original);
  });

  it("does not turn a background-only or day-stem-only interaction into dating, and keeps career effects out of relationship prose", () => {
    const forward = relationshipPeriods.find((period) => period.branch === "forward")!.input;
    const noYear = { ...forward, hasDayBranchClash: false, hasDayBranchCombination: false,
      relationshipSignals: forward.relationshipSignals!.filter((signal) => signal.source === "dayun"), appliedRelationship: "married" as const };
    const neutral = buildAnnualEventReadingProse({ ...forward, appliedRelationship: "married", effect: "neutral", patternEffect: "unresolved" });
    expect(buildAnnualEventReadingProse({ ...forward, appliedRelationship: "married", effect: "assists", patternEffect: "obstructs" })).toEqual(neutral);
    expect(neutral.notApplicableWhen.join()).not.toMatch(/透干未单独|不借支内|原段结构未给/);
    expect(neutral.notApplicableWhen.join()).toContain("同一分支、同一实际时段");
    expect(buildAnnualEventReadingProse(noYear).title).toBe("表达立场与协作承诺的协调");
    expect(buildAnnualEventReadingProse(noYear).summary).not.toContain("丁亥大运");
    expect(buildAnnualEventReadingProse(noYear).notApplicableWhen.join()).not.toContain("年度日支互动说明");
  });

  it("uses age-specific yearly and exact-background matters before an adult relationship self-description", () => {
    const forward = relationshipPeriods.find((period) => period.branch === "forward")!.input;
    const ages = [buildLocalReadingAgeContext("2025-08-18T00:26:00Z", "2028-02-04T00:00:00Z", "2029-02-04T00:00:00Z"),
      buildLocalReadingAgeContext("2018-08-18T00:26:00Z", "2028-02-04T00:00:00Z", "2029-02-04T00:00:00Z"),
      buildLocalReadingAgeContext("2010-08-18T00:26:00Z", "2028-02-04T00:00:00Z", "2029-02-04T00:00:00Z"),
      buildLocalReadingAgeContext(null, "2028-02-04T00:00:00Z", "2029-02-04T00:00:00Z")];
    expect(ages.map((age) => age.stage)).toEqual(["young_child", "youth", "adult_transition", "unknown"]);
    for (const age of ages) {
      const outputs = (["single", "partnered", "married", "separated", "unspecified"] as const).map((state) => buildAnnualEventReadingProse({ ...forward, age, appliedRelationship: state }));
      expect(outputs.every((output) => JSON.stringify(output) === JSON.stringify(outputs[0]))).toBe(true);
      const main = [outputs[0]!.title, outputs[0]!.summary, ...outputs[0]!.examples].join();
      expect(main).not.toMatch(/伴侣|约见|婚|物品交接/);
      expect(main).toContain("丁亥大运");
      const clash = buildAnnualEventReadingProse({ ...a31, age, appliedRelationship: "married" });
      expect(clash.summary).not.toBe(outputs[0]!.summary); expect(clash.examples).not.toEqual(outputs[0]!.examples);
      if (age.stage === "unknown") expect(main).not.toMatch(/孩子|照料者|学生/);
      const stemOnly = buildAnnualEventReadingProse({ ...a35, age, appliedRelationship: "married" });
      expect(stemOnly.summary).not.toContain("大运"); expect(stemOnly.title).not.toMatch(/伴侣|婚|约见/);
    }
  });

  it("lets the actual childhood first-decade boundary change the care background without turning it into a partner event", () => {
    expect(childhoodRelationshipPeriods).toHaveLength(2);
    const [before, after] = childhoodRelationshipPeriods;
    expect(before!.end).toBe("1999-05-22T16:20:00.000Z"); expect(after!.start).toBe(before!.end);
    expect(before!.input.age.stage).toBe("young_child"); expect(after!.input.age.stage).toBe("young_child");
    expect(before!.input.relationshipSignals!.map((signal) => signal.source)).toEqual(["year"]);
    expect(after!.input.relationshipSignals!.map((signal) => [signal.source, signal.relationType])).toEqual([
      ["year", "branch_six_clash"], ["dayun", "branch_six_combination"]]);
    const earlier = buildAnnualEventReadingProse({ ...before!.input, appliedRelationship: "married" });
    const later = buildAnnualEventReadingProse({ ...after!.input, appliedRelationship: "married" });
    expect(earlier.title).toBe("照料节奏与交接方式调整"); expect(earlier.summary).not.toContain("大运");
    expect(later.summary).toContain("本段庚辰大运另有日支六合背景，照料交接与熟悉节奏");
    expect(later.summary).not.toBe(earlier.summary);
    expect([earlier.summary, later.summary, ...earlier.examples, ...later.examples].join()).not.toMatch(/伴侣|约见|婚|复合|分手/);
  });

  it("separates four real neutral exposed roles in both career and resource themes", () => {
    expect(roleYears.map((input) => input.god)).toEqual(["劫财", "比肩", "正官", "七杀"]);
    expect(roleYears.every((input) => input.effect === "neutral")).toBe(true);
    expect(roleYears[0]!.patternEffect).toBe("assists");
    for (const domain of ["career", "wealth"] as const) {
      const products = roleYears.map((input) => buildAnnualEventReadingProse({ ...input, domain }));
      expect(new Set(products.map((item) => item.title)).size).toBe(4);
      expect(new Set(products.map((item) => item.summary)).size).toBe(4);
      expect(new Set(products.map((item) => item.examples.join())).size).toBe(4);
      for (const item of products) {
        expect(item.summary).toContain("仅凭这条线索，还不能判断进展是否顺利");
        expect(item.summary).not.toMatch(/必然|升职|裁员|破财|已经增加压力|合作必利/);
      }
    }
    expect(buildAnnualEventReadingProse(roleYears[1]!).summary).toContain("独立完成");
    expect(buildAnnualEventReadingProse({ ...roleYears[0]!, domain: "wealth" }).summary).toContain("共同投入的分摊");
    expect(buildAnnualEventReadingProse(roleYears[2]!).summary).toContain("正式确认");
    expect(buildAnnualEventReadingProse(roleYears[3]!).summary).toContain("限时要求的先后安排");
  });

  it.each([null, "unspecified", "employed", "self_employed", "seeking_work", "student", "caregiving", "retired"] as const)("keeps four roles and two domains distinct for background %s", (work) => {
    for (const domain of ["career", "wealth"] as const) {
      const products = roleYears.map((input) => buildAnnualEventReadingProse({ ...input, domain, appliedWork: work }));
      expect(new Set(products.map((item) => item.title)).size).toBe(4);
      expect(new Set(products.map((item) => item.summary)).size).toBe(4);
      expect(new Set(products.map((item) => item.examples.join())).size).toBe(4);
      if (work === null || work === "unspecified") expect(products.every((item) => item.examples.every((example) => /^若(?:在职|正在求职或进修|有自营业务或实际合作)，/.test(example)))).toBe(true);
      if (["student", "caregiving", "retired"].includes(work ?? "")) {
        expect(products.flatMap((item) => [item.summary, ...item.examples]).join()).not.toMatch(/客户|录用|回款|岗位职责|考核要求|工作安排/);
      }
    }
    for (const input of roleYears) {
      const career = buildAnnualEventReadingProse({ ...input, appliedWork: work });
      const wealth = buildAnnualEventReadingProse({ ...input, domain: "wealth", appliedWork: work });
      expect(career.summary).not.toBe(wealth.summary); expect(career.examples).not.toEqual(wealth.examples);
    }
  });

  it("uses actual childhood roles and neutral unknown-age situations regardless of an adult self-description", () => {
    expect(childRoleYears.map((input) => input.god)).toEqual(["劫财", "比肩", "正官", "七杀"]);
    expect(childRoleYears.every((input) => input.age.stage === "youth")).toBe(true);
    expect(youngChildRole.age.stage).toBe("young_child");
    for (const domain of ["career", "wealth"] as const) {
      const children = childRoleYears.map((input) => buildAnnualEventReadingProse({ ...input, domain, appliedWork: "employed" }));
      const unknown = roleYears.map((input) => buildAnnualEventReadingProse({ ...input, domain, appliedWork: "self_employed", age: buildLocalReadingAgeContext(null, "2028-02-04T00:00:00Z", "2029-02-04T00:00:00Z") }));
      expect(new Set(children.map((item) => item.summary)).size).toBe(4);
      expect(new Set(unknown.map((item) => item.summary)).size).toBe(4);
      expect([...children, ...unknown].flatMap((item) => [item.title, item.summary, ...item.examples]).join()).not.toMatch(/客户|岗位|收入|录用|回款|婚姻/);
      expect(unknown.flatMap((item) => [item.summary, ...item.examples]).join()).not.toMatch(/孩子|家长|照料者|学生|课题/);
      expect(buildAnnualEventReadingProse({ ...youngChildRole, domain, appliedWork: "employed" }).examples.join()).not.toMatch(/岗位|考试|报名|合同/);
    }
  });

  it("does not change the role theme when only an overall pattern effect is changed", () => {
    const neutral = roleYears[0]!, before = structuredClone(neutral);
    const support = buildAnnualEventReadingProse(neutral), pressure = buildAnnualEventReadingProse({ ...neutral, patternEffect: "obstructs" });
    expect(pressure).toEqual(support); expect(neutral).toEqual(before);
    const unresolved = buildAnnualEventReadingProse({ ...neutral, effect: "unresolved" });
    expect(unresolved.summary).toBe(support.summary);
    const sameRolePressure = buildAnnualEventReadingProse({ ...neutral, effect: "obstructs" });
    expect(sameRolePressure.title).toBe(support.title);
    expect(sameRolePressure.summary).toContain("对该透干保留配合上的牵制");
  });

  it("B2026 distinguishes learning/qualification work from its cost and retains the output constraint", () => {
    expect([b26.god, b26.path, b26.effect]).toEqual(["正印", "resource-output", "obstructs"]);
    const career = buildAnnualEventReadingProse({ ...b26, appliedWork: "employed" });
    const wealth = buildAnnualEventReadingProse({ ...b26, appliedWork: "employed", domain: "wealth" });
    expect(career.title).toContain("进修考证"); expect(wealth.title).toContain("课程、资格与工具投入");
    expect(career.summary).toContain("挤占已经答应的交付时间");
    expect(career.summary).not.toBe(wealth.summary); expect(career.examples).not.toEqual(wealth.examples);
  });

  it("B2030 improvement and B2032 existing settlement remain distinct for confirmed employment despite their shared supportive pattern", () => {
    expect([b30.god, b32.god]).toEqual(["伤官", "正财"]);
    expect([b30.patternEffect, b32.patternEffect]).toEqual(["assists", "assists"]);
    const proposal = buildAnnualEventReadingProse({ ...b30, appliedWork: "employed" }), settlement = buildAnnualEventReadingProse({ ...b32, appliedWork: "employed" });
    expect(proposal.title).toContain("试点"); expect(settlement.title).toContain("回款条件");
    expect(proposal.examples.join()).toContain("改法"); expect(settlement.examples.join()).toContain("验收");
    expect(proposal.summary).not.toBe(settlement.summary);
    expect(settlement.summary).toContain("不把完成工作直接当作钱已到账");
  });

  it("A2031's exact day-branch clash adapts actual relationship status without inventing a breakup", () => {
    expect(a31.hasDayBranchClash).toBe(true);
    const married = buildAnnualEventReadingProse({ ...a31, appliedRelationship: "married" });
    const single = buildAnnualEventReadingProse({ ...a31, appliedRelationship: "single" });
    expect(married.title).toContain("家务、居住"); expect(single.title).toContain("个人生活节奏");
    expect(married.examples).not.toEqual(single.examples);
    expect(married.notApplicableWhen.join()).toContain("不保证相识、结婚或分手");
    expect(single.title).not.toContain("结婚");
  });

  it("A2035's day-stem-only interaction cannot become a shared-life or dating event", () => {
    expect(a35.hasDayStemInteraction).toBe(true);
    expect(a35.hasDayBranchClash || a35.hasDayBranchCombination).toBe(false);
    const result = buildAnnualEventReadingProse({ ...a35, appliedRelationship: "married" });
    expect(result.title).toContain("表达立场");
    expect(result.title).not.toMatch(/家务|居住|约见|交往/);
    expect(result.notApplicableWhen.join()).toContain("不扩为婚恋事件");
  });

  it("actual childhood and unknown age do not inherit adult work or relationship assertions", () => {
    expect(a05.age.stage).toBe("youth");
    const child = buildAnnualEventReadingProse({ ...a05, appliedWork: "employed", appliedRelationship: "married" });
    expect(child.title).toContain("学习方法");
    expect(child.examples.join()).not.toMatch(/岗位|资格|客户|录用|伴侣/);
    const unknown = buildAnnualEventReadingProse({ ...a31, age: buildLocalReadingAgeContext(null, "2031-02-04T00:00:00Z", "2032-02-04T00:00:00Z"), appliedRelationship: "married" });
    expect(unknown.examples.join()).not.toMatch(/婚|伴侣|结算|客户/);
    expect(unknown.applicability.join()).toContain("不套用成年工作和婚恋身份");
    expect(child.summary + unknown.summary).not.toMatch(/收入|婚恋|岗位/);
  });

  it("adult unspecified background gives conditional concrete examples; caregiving remains about actual living costs", () => {
    const unspecified = buildAnnualEventReadingProse(b32);
    expect(unspecified.examples.every((example) => example.startsWith("若"))).toBe(true);
    expect(unspecified.applicability.join()).toContain("职业背景未填写");
    const care = buildAnnualEventReadingProse({ ...b32, appliedWork: "caregiving" });
    expect(care.title).toContain("照料费用"); expect(care.examples.join()).toContain("用品");
    expect(care.examples.join()).not.toMatch(/客户|录用|岗位|回款/);
  });

  it("B2028 never attributes hidden-output support to the neutral exposed peer actor", () => {
    expect(b28.effect).toBe("neutral"); expect(b28.patternEffect).toBe("assists");
    const result = buildAnnualEventReadingProse(b28);
    expect(result.notApplicableWhen.join()).toContain("不借支内或大运背景的作用改判该透干");
    expect(result.summary).not.toMatch(/戊.*助力|必然|保证/);
  });

  it("unknown-sex A2028 keeps preparation constraining output on its actual obstructed branch", () => {
    expect([a28forward.god, a28backward.god]).toEqual(["正印", "正印"]);
    expect(a28forward.effect).toBe("assists"); expect(a28backward.effect).toBe("obstructs");
    const forward = buildAnnualEventReadingProse({ ...a28forward, appliedWork: "employed" }), backward = buildAnnualEventReadingProse({ ...a28backward, appliedWork: "employed" });
    expect(forward.summary).not.toBe(backward.summary);
    expect(backward.summary).toContain("挤占已经答应的交付时间");
    expect(forward.summary).not.toContain("挤占已经答应的交付时间");
    expect(backward.summary).toContain("产出接上经营与兑现");
    expect(buildAnnualEventReadingProse(b26).summary).toContain("学习积累转成可见成果");
  });

  it("leaves all exact facts, original effects and context inputs unchanged", () => {
    const input = { ...b26, appliedWork: "self_employed" as const }, before = structuredClone(input);
    const result = buildAnnualEventReadingProse(input);
    expect(input).toEqual(before); expect(result.examples.join()).toContain("客户");
    expect(result).not.toHaveProperty("priority"); expect(result).not.toHaveProperty("effect");
  });
});
