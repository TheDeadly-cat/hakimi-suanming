import { expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "./preliminary-assessment";
import { buildNatalPatternDiagnosis } from "./natal-pattern-diagnosis";

async function read(date: string, time: string, unknownHour = false) {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time,
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
    location: { label: "Synthetic resource wealth diagnosis", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
  if (unknownHour) { revision.input.time = null; revision.input.timePrecision = "unknown_hour"; }
  const assessment = buildBaziPreliminaryAssessment(revision);
  return { revision, assessment, diagnosis: buildNatalPatternDiagnosis(revision, assessment) };
}

it("uses the validated print-heavy branch and preserves both actual Wu-Gui ties without calling wealth a universal attack", async () => {
  const { revision, assessment, diagnosis } = await read("2018-11-19", "14:26");
  expect(Object.values(revision.facts.pillars).map((p) => p.ganZhi)).toEqual(["戊戌", "癸亥", "乙卯", "癸未"]);
  expect(assessment.balance).toMatchObject({ band: "strong", supportWeight: 14, demandWeight: 9 });
  expect(diagnosis.primaryPathId).toBe("resource-wealth");
  expect(diagnosis.currentJudgment).toContain("年干戊（正财）裁印");
  expect(diagnosis.currentJudgment).toContain("仍是学习与承接基础");
  expect(diagnosis.blockers.filter((item) => item.id === "moderating-wealth-combined")).toHaveLength(2);
  expect(diagnosis.blockers.some((item) => item.id === "wealth-controls-key-resource")).toBe(false);
  expect(diagnosis.status).toBe("obstructed");
  expect(diagnosis.conditions.join()).toContain("印轻财重时反须护印");
  expect(diagnosis.evidence.join()).toContain("outlook-zq-resource-wealth/resource-wealth-moderation");
  expect(diagnosis.evidence.join()).toContain("outlook-zq-resource-wealth/resource-wealth-opposite");
});

it("keeps the same structural task on a metal day without inventing a financial combination", async () => {
  const { revision, diagnosis } = await read("1999-01-09", "02:26");
  expect(Object.values(revision.facts.pillars).map((p) => p.ganZhi)).toEqual(["戊寅", "乙丑", "辛酉", "己丑"]);
  expect(diagnosis.primaryPathId).toBe("resource-wealth");
  expect(diagnosis.currentJudgment).toContain("月干乙（偏财）裁印");
  expect(diagnosis.blockers).toEqual([]);
  expect(diagnosis.status).toBe("basis_present");
  expect(diagnosis.wealthImplication).toContain("印轻财重时须另走护印分支");
});

it.each([
  ["2021-02-27", "14:26", false],
  ["1999-01-19", "02:26", false],
  ["2018-11-19", "14:26", true],
])("does not open resource wealth from an unqualified actual chart %s %s unknown=%s", async (date, time, unknown) => {
  const { assessment, diagnosis } = await read(date, time, unknown);
  expect(assessment.balance.structural.working.focus).not.toBe("wealth_moderates_resource");
  expect(diagnosis.primaryPathId).not.toBe("resource-wealth");
  expect(diagnosis.blockers.some((item) => item.id === "moderating-wealth-combined")).toBe(false);
  if (unknown) expect(diagnosis.sourceBinding.includeHour).toBe(false);
});

it("states the actual rooted-peer mixed authorities and never clears Wu through the Gui day master's own combination", async () => {
  const { revision, assessment, diagnosis } = await read("2019-12-22", "11:23");
  const before = structuredClone({ revision, assessment });
  expect(Object.values(revision.facts.pillars).map((pillar) => pillar.ganZhi)).toEqual(["己亥", "丙子", "癸巳", "戊午"]);
  expect(assessment.balance).toMatchObject({ band: "weak", supportWeight: 9, demandWeight: 13 });
  expect(assessment.balance.structural.working).toMatchObject({ band: "balanced", direction: "conditional" });
  expect(diagnosis.primaryPathId).toBe("official-wealth");
  expect(diagnosis.headline).toBe("建禄，财生官兼带七杀：官杀尚未取清");
  expect(diagnosis.currentJudgment).toContain("月干丙（正财）同时生时干戊（正官）与年干己（七杀）");
  expect(diagnosis.currentJudgment).toContain("时干戊（正官）与日主癸自合，本身自合不为合去，戊正官仍保留");
  expect(diagnosis.status).toBe("obstructed");
  expect(diagnosis.blockers.map((item) => item.id)).toEqual(["peer-authorities-not-cleared"]);
  expect(diagnosis.rescues).toEqual([]);
  expect(diagnosis.sourceIds).toEqual(expect.arrayContaining(["natal-zq-self-combination-not-removal", "natal-zq-lujie-authority-clearing"]));
  expect(diagnosis.evidence.join()).toContain("he_gan_5:戊癸");
  expect(diagnosis.conditions.join()).toContain("不直接等于全盘凶断");
  expect(diagnosis.conditions.join()).toContain("食伤与印均未透");
  expect(buildNatalPatternDiagnosis(revision, assessment)).toEqual(diagnosis);
  expect({ revision, assessment }).toEqual(before);
});

it.each([
  ["2014-01-27", "04:26", ["癸巳", "乙丑", "戊戌", "甲寅"]],
  ["1980-06-12", "10:26", ["庚申", "壬午", "丙辰", "癸巳"]],
] as const)("keeps monthly peer authority clearing separate from an unrelated self-wealth tie or no tie: %s", async (date, time, pillars) => {
  const { revision, assessment, diagnosis } = await read(date, time);
  expect(Object.values(revision.facts.pillars).map((pillar) => pillar.ganZhi)).toEqual(pillars);
  expect(assessment.balance.structural.working.focus).toBe("rooted_peer_mixed_authority");
  expect(diagnosis.headline).toBe("月劫，财生官兼带七杀：官杀尚未取清");
  expect(diagnosis.sourceIds).toContain("natal-zq-lujie-authority-clearing");
  expect(diagnosis.sourceIds).not.toContain("natal-zq-self-combination-not-removal");
  expect(diagnosis.currentJudgment).not.toContain("与日主");
  expect(diagnosis.currentJudgment).not.toContain("建禄");
});

it("does not borrow the excluded hour official or attach the new sources to an ordinary path", async () => {
  const unknown = await read("2019-12-22", "11:23", true);
  expect(unknown.assessment.balance.structural.working.focus).not.toBe("rooted_peer_mixed_authority");
  expect(unknown.diagnosis.currentJudgment).not.toContain("时干戊");
  expect(unknown.diagnosis.blockers.some((item) => item.id === "peer-authorities-not-cleared")).toBe(false);
  for (const diagnosis of [unknown.diagnosis, (await read("1995-08-18", "08:26")).diagnosis]) {
    expect(diagnosis.sourceIds.some((id) => id.startsWith("natal-zq-"))).toBe(false);
  }
});

it("still rejects a diagnosis paired with another revision", async () => {
  const { revision, assessment } = await read("2019-12-22", "11:23");
  expect(() => buildNatalPatternDiagnosis({ ...revision, id: "33333333-3333-4333-8333-333333333333" }, assessment)).toThrow("来源不匹配");
});

it.each([
  { date: "1957-09-13", time: "00:26", pillars: ["丁酉", "己酉", "戊子", "壬子"], task: "resource_first", path: "hurting-resource", headline: "先护印", raw: "very_weak", source: "natal-zq-hurting-wealth-heavy" },
  { date: "1982-10-02", time: "10:26", pillars: ["壬戌", "己酉", "戊午", "丁巳"], task: "wealth_first", path: "hurting-wealth", headline: "财调节印", raw: "balanced", source: "natal-zq-hurting-resource-heavy" },
  { date: "1944-08-09", time: "04:26", pillars: ["甲申", "壬申", "乙巳", "戊寅"], task: "official_joint", path: "official-resource", headline: "财印分位", raw: "weak", source: "natal-zq-official-wealth-resource-separated" },
])("gives distinct financial/resource tasks from the actual $date chart without changing its raw strength", async ({ date, time, pillars, task, path, headline, raw, source }) => {
  const { revision, assessment, diagnosis } = await read(date, time);
  expect(Object.values(revision.facts.pillars).map((pillar) => pillar.ganZhi)).toEqual(pillars);
  expect(assessment.balance.band).toBe(raw);
  expect(diagnosis.wealthResourceTask.task).toBe(task);
  expect(diagnosis.primaryPathId).toBe(path);
  expect(diagnosis.headline).toContain(headline);
  expect(diagnosis.sourceIds).toContain(source);
  expect(diagnosis.blockers.some((finding) => ["wealth-controls-key-resource", "wealth-combined"].includes(finding.id))).toBe(false);
  expect(diagnosis.rescues.some((finding) => finding.id === "peer-protects-resource")).toBe(false);
  expect(diagnosis.foundation.join()).toContain("实际隔着");
  expect(diagnosis.monthCommandRole).toMatchObject({ kind: "main_hidden", tenGod: task === "official_joint" ? "正官" : "伤官" });
  expect(diagnosis.conditions.join()).toContain("不把岁运来干排成第五柱");
  if (task !== "official_joint") {
    expect(diagnosis.wealthResourceTask.pairs[0]!.hasCombination).toBe(true);
    expect(diagnosis.evidence.join()).toContain("he_gan_5:丁壬");
    expect(diagnosis.foundation.join()).toContain("原丁壬等五合关系事实仍保留");
    expect(diagnosis.sourceIds).not.toContain("outlook-zq-official-month-example");
    expect(diagnosis.sourceIds).not.toContain("outlook-zq-killing-month-example");
  }
  if (task === "resource_first") {
    expect(diagnosis.currentJudgment).toContain("不再一概把更多财列为首选");
    expect(diagnosis.conditions.join()).toContain("印未见同类根");
  }
  if (task === "wealth_first") expect(diagnosis.wealthImplication).toContain("财缺少同类根");
  const before = structuredClone({ revision, assessment });
  expect(buildNatalPatternDiagnosis(revision, assessment)).toEqual(diagnosis);
  expect({ revision, assessment }).toEqual(before);
});

it("keeps the adjacent financial/resource combination in the original mixed-month counterexample", async () => {
  const { revision, diagnosis } = await read("1982-07-24", "06:26");
  expect(Object.values(revision.facts.pillars).map((pillar) => pillar.ganZhi)).toEqual(["壬戌", "丁未", "戊申", "乙卯"]);
  expect(diagnosis.wealthResourceTask.task).toBe("not_applicable");
  expect(diagnosis.wealthResourceTask.monthCommand.tenGod).toBe("劫财");
  expect(diagnosis.primaryPathId).toBe("official-resource");
  expect(diagnosis.blockers.find((finding) => finding.id === "wealth-controls-key-resource")!.text).toContain("相合");
  expect(diagnosis.status).toBe("obstructed");
  expect(diagnosis.sourceIds).toContain("natal-zq-official-wealth-resource-combined");
  expect(diagnosis.currentJudgment).not.toContain("财印分位并用");
});

it.each([["1957-09-13", "00:26"], ["1982-10-02", "10:26"], ["1944-08-09", "04:26"]])(
  "does not borrow an excluded hour to create a separated pair or change task priority: %s", async (date, time) => {
    const { revision, assessment, diagnosis } = await read(date!, time!, true);
    expect(diagnosis.sourceBinding.includeHour).toBe(false);
    expect(diagnosis.wealthResourceTask.task).toBe("not_applicable");
    expect(diagnosis.sourceIds.some((id) => id.startsWith("natal-zq-hurting-") || id.startsWith("natal-zq-official-wealth-resource-"))).toBe(false);
    const changed = structuredClone(revision);
    changed.facts.pillars.hour = structuredClone((await read("2019-12-22", "11:23")).revision.facts.pillars.hour);
    expect(buildNatalPatternDiagnosis(changed, assessment)).toEqual(diagnosis);
  });
