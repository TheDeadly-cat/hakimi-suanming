import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type ChartFacts, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { LunarUtil } from "lunar-typescript";
import { deriveBaziStrengthAssessment } from "./strength-assessment-core";
import { buildStructuralStrengthAssessment, evaluateStructuralStrength, getWorkingBalance, type StructuralStrengthInputFacts } from "./structural-strength-assessment";

async function revisionFor(date: string, time: string, sex: "male" | "female" = "male") {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex,
    lunarLeapMonth: false, location: { label: "Synthetic structural strength", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic, not ancient birth history" }, WORKING_DEFAULT_RULE_PROFILE);
  return storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
}
/** Only the fields consumed by the pure factor/structure functions are formed.
 * This is a classical or rule-variation assertion, never a birth Revision. */
function assertion(pillars: [string, string, string, string]): StructuralStrengthInputFacts {
  const positions = ["year", "month", "day", "hour"] as const, labels = ["年柱", "月柱", "日柱", "时柱"] as const, day = pillars[2][0]!;
  return { pillars: Object.fromEntries(pillars.map((ganZhi, index) => {
    const hidden = [...(LunarUtil.ZHI_HIDE_GAN as Record<string, string[]>)[ganZhi[1]!]!];
    return [positions[index], { name: positions[index], label: labels[index], ganZhi, stem: ganZhi[0], branch: ganZhi[1], hiddenStems: hidden,
      stemTenGod: index === 2 ? "日主" : (LunarUtil.SHI_SHEN as Record<string, string>)[day + ganZhi[0]!], branchTenGods: hidden.map((stem) => (LunarUtil.SHI_SHEN as Record<string, string>)[day + stem]) }];
  })) as StructuralStrengthInputFacts["pillars"] };
}
function pure(pillars: [string, string, string, string]) {
  const facts = assertion(pillars), raw = deriveBaziStrengthAssessment(facts as ChartFacts, true);
  return evaluateStructuralStrength({ facts, includeHour: true, raw });
}
const build = (revision: RevisionRecord) => buildStructuralStrengthAssessment({ revision, raw: deriveBaziStrengthAssessment(revision.facts, revision.input.timePrecision !== "unknown_hour" && revision.input.timePrecision !== "date_only") });
let exact: RevisionRecord, variation: RevisionRecord, resource: RevisionRecord, ordinary: RevisionRecord;
beforeAll(async () => { [exact, variation, resource, ordinary] = await Promise.all([
  revisionFor("1907-03-15", "02:26"), revisionFor("1972-09-25", "10:26"), revisionFor("2018-03-15", "00:26"), revisionFor("2019-12-22", "11:23", "female")
]); });

describe("versioned structural working strength alongside unchanged raw factors", () => {
  it.each([
    { date: "2018-11-19", time: "14:26", pillars: ["戊戌", "癸亥", "乙卯", "癸未"], wealth: "earth", weights: [14, 9] },
    { date: "1999-01-09", time: "02:26", pillars: ["戊寅", "乙丑", "辛酉", "己丑"], wealth: "wood", weights: [17, 7] }
  ])("identifies the rooted resource-wealth task in the actual $date chart while preserving raw factors and concrete stems", async ({ date, time, pillars, wealth, weights }) => {
    const revision = await revisionFor(date, time), original = structuredClone(revision), result = build(revision);
    expect(Object.values(revision.facts.pillars).map((pillar) => pillar.ganZhi)).toEqual(pillars);
    expect([result.raw.supportWeight, result.raw.demandWeight]).toEqual(weights);
    expect(result.raw).toEqual(deriveBaziStrengthAssessment(revision.facts, true));
    expect(result.working).toMatchObject({ selection: "structural_rule", ruleId: "rooted-resource-wealth-v1", focus: "wealth_moderates_resource", band: "strong", direction: "drain", label: "印旺身有根，财作裁印" });
    expect(result.working.favorableElements).toEqual([wealth]); expect(result.working.unfavorableElements).toEqual([]);
    expect(result.working.conditionalElements).toHaveLength(4);
    expect(result.facts.resourceStems.filter((actor) => actor.roots.length)).toHaveLength(2);
    expect(result.facts.demandStems).toHaveLength(1); expect(result.facts.demandStems[0]!.group).toBe("wealth");
    expect(result.working.summary).toContain(result.facts.demandStems[0]!.stem);
    expect(result.working.conditions.join()).toContain("不宣告合去、化成或自由裁印已成功");
    if (date === "2018-11-19") expect(result.working.evidence.join()).toContain("he_gan_5:戊癸");
    expect(getWorkingBalance({ balance: { structural: result } })).toEqual(result.working);
    expect(revision).toEqual(original);
  });

  it("does not turn only residual self roots, two wealth stems, hidden wealth or rootless wealth into the resource-wealth rule", async () => {
    for (const [date, time] of [["2018-11-29", "14:26"], ["1999-01-19", "02:26"], ["2021-02-27", "14:26"]]) {
      const revision = await revisionFor(date!, time!), result = build(revision);
      expect(result.working.selection).toBe("raw_fallback");
      expect(result.findings.find((finding) => finding.ruleId === "rooted-resource-wealth-v1")!.status).toBe("blocked");
      expect(result.raw).toEqual(deriveBaziStrengthAssessment(revision.facts, true));
    }
    const hiddenWealth = pure(["癸未", "癸亥", "乙卯", "癸未"]), unrootedWealth = pure(["戊子", "癸亥", "乙卯", "癸酉"]);
    for (const result of [hiddenWealth, unrootedWealth]) {
      expect(result.working.selection).toBe("raw_fallback");
      expect(result.findings.find((finding) => finding.ruleId === "rooted-resource-wealth-v1")!.blockers.join()).toContain("透财未齐、财无根");
    }
  });

  it("accepts a main self root outside the day branch but never borrows an unknown hour to complete the wealth-moderation predicate", async () => {
    const asserted = pure(["戊戌", "癸亥", "乙丑", "癸卯"]);
    expect(asserted.facts.dayMasterRoots.some((root) => root.position === "day" && root.layer === "main")).toBe(false);
    expect(asserted.facts.dayMasterRoots.some((root) => root.position === "hour" && root.layer === "main")).toBe(true);
    expect(asserted.working.focus).toBe("wealth_moderates_resource");
    const known = await revisionFor("2018-11-19", "14:26"), unknown = structuredClone(known);
    unknown.input.time = null; unknown.input.timePrecision = "unknown_hour";
    const projected = build(unknown);
    expect(projected.working.selection).toBe("raw_fallback");
    expect(projected.findings.find((finding) => finding.ruleId === "rooted-resource-wealth-v1")!.blockers.join()).toContain("两处透印连根未齐");
    expect(projected.facts.resourceStems.every((actor) => actor.position !== "hour")).toBe(true);
    unknown.facts.pillars.hour = structuredClone(ordinary.facts.pillars.hour);
    expect(build(unknown)).toEqual(projected);
  });

  it("verifies the modern same-pillars synthetic example without treating its birth as historical evidence", () => {
    expect(Object.values(exact.facts.pillars).map((pillar) => pillar.ganZhi)).toEqual(["丁未", "癸卯", "癸亥", "癸丑"]);
    const before = structuredClone(exact), result = build(exact);
    expect(result.raw.supportWeight).toBe(8); expect(result.raw.demandWeight).toBe(15); expect(result.raw.band).toBe("weak");
    expect(result.working.selection).toBe("structural_rule"); expect(result.working.band).toBe("strong");
    expect(result.working.direction).toBe("drain"); expect(result.working.focus).toBe("wealth_after_output");
    expect(result.working.favorableElements).toEqual(["fire"]); expect(result.working.unfavorableElements).toEqual([]);
    expect(result.working.conditionalElements).toEqual(expect.arrayContaining(["wood", "earth", "metal", "water"]));
    expect(result.disagreesWithRaw).toBe(true); expect(exact).toEqual(before);
    expect(getWorkingBalance({ sourceBinding: result.sourceBinding, balance: { structural: result } })).toEqual(result.working);
  });

  it("matches a real different day master and pillar set through the same food/peer/root predicate", () => {
    expect(Object.values(variation.facts.pillars).map((pillar) => pillar.ganZhi)).toEqual(["壬子", "己酉", "己未", "己巳"]);
    const result = build(variation);
    expect(result.working.ruleId).toBe("rooted-peer-food-wealth-v1"); expect(result.working.favorableElements).toEqual(["water"]);
    expect(result.facts.dayMasterRoots.some((root) => root.position === "day" && root.layer === "main")).toBe(true);
    expect(result.raw).toEqual(deriveBaziStrengthAssessment(variation.facts, true));
  });

  it("requires a self root independently of resource roots and selects only the actual output use", () => {
    const classical = pure(["戊戌", "乙卯", "丙午", "乙亥"]), modern = build(resource);
    expect(classical.working.ruleId).toBe("rooted-resource-output-v1");
    expect(modern.working.ruleId).toBe("rooted-resource-output-v1"); expect(modern.working.favorableElements).toEqual(["earth"]);
    expect(modern.working.focus).toBe("output_after_resource");
    expect(modern.facts.resourceStems.every((actor) => actor.roots.some((root) => root.stem === "乙"))).toBe(true);
    expect(modern.facts.dayMasterRoots.some((root) => root.position === "day" && root.branch === "午" && root.stem === "丁")).toBe(true);
    expect(modern.raw).toEqual(deriveBaziStrengthAssessment(resource.facts, true));
  });

  it("keeps the three independently labelled commentary counterexamples outside the strong structural rules", () => {
    const shen = pure(["丁亥", "癸卯", "癸卯", "甲寅"]), hu = pure(["戊戌", "壬戌", "丙子", "戊戌"]), chang = pure(["辛卯", "辛卯", "癸酉", "己未"]);
    for (const result of [shen, hu, chang]) expect(result.working.selection).toBe("raw_fallback");
    expect(shen.facts.dayMasterRoots.some((root) => root.layer === "main")).toBe(true);
    expect(shen.findings[0]!.blockers.join()).toContain("日支未见");
    expect(hu.facts.dayMasterRoots).toHaveLength(3); expect(hu.facts.dayMasterRoots.every((root) => root.layer === "other")).toBe(true);
    expect(chang.facts.resourceStems).toHaveLength(2); expect(chang.facts.resourceStems.every((actor) => actor.roots.length)).toBe(true);
    expect(chang.facts.dayMasterRoots).toEqual([]);
  });

  it("does not expand the food rule to hurting-officer months or ignore rooted extra output and authority", () => {
    const hurting = pure(["丁未", "壬寅", "癸亥", "癸丑"]), extraOutput = pure(["丁未", "癸卯", "癸亥", "甲寅"]), authority = pure(["己未", "癸卯", "癸亥", "癸丑"]);
    for (const result of [hurting, extraOutput, authority]) expect(result.working.selection).toBe("raw_fallback");
    expect(hurting.findings[0]!.status).toBe("not_applicable");
    expect(extraOutput.findings[0]!.blockers.join()).toContain("另有有根透食伤");
    expect(authority.findings[0]!.blockers.join()).toContain("官杀透出且有根");
  });

  it("records complete branch combinations and clashes without deleting actual roots", () => {
    const result = build(exact);
    expect(result.facts.interactions.some((fact) => fact.completeness === "complete_set")).toBe(true);
    expect(result.facts.dayMasterRoots.some((root) => root.position === "day" && root.branch === "亥")).toBe(true);
    expect(result.working.selection).toBe("structural_rule");
    expect(result.working.conditions.join()).toContain("不删除任何根");
  });

  it("excludes an unreliable hour from both evidence and required root/peer predicates", () => {
    const unknown = structuredClone(exact); unknown.input.time = null; unknown.input.timePrecision = "unknown_hour";
    const result = build(unknown);
    expect(result.working.selection).toBe("raw_fallback"); expect(result.inputFacts.pillars.hour).toBeUndefined();
    expect(result.facts.dayMasterRoots.every((root) => root.position !== "hour")).toBe(true);
    expect(result.facts.peerStems.every((actor) => actor.position !== "hour")).toBe(true);
    unknown.facts.pillars.hour = structuredClone(ordinary.facts.pillars.hour);
    expect(build(unknown)).toEqual(result);
  });

  it("retains the public Gui-Zi raw score while identifying rooted command and distinct wealth/officer/killing tasks", () => {
    expect(Object.values(ordinary.facts.pillars).map((pillar) => pillar.ganZhi)).toEqual(["己亥", "丙子", "癸巳", "戊午"]);
    const before = structuredClone(ordinary), result = build(ordinary);
    expect(result.raw.band).toBe("weak"); expect(result.raw.supportWeight).toBe(9); expect(result.raw.demandWeight).toBe(13);
    expect(result.raw).toEqual(deriveBaziStrengthAssessment(ordinary.facts, true));
    expect(result.working).toMatchObject({ selection: "structural_rule", ruleId: "rooted-peer-mixed-authority-v1", band: "balanced", direction: "conditional", focus: "rooted_peer_mixed_authority", label: "得令有根，强弱相对均衡" });
    expect(result.working.favorableElements).toEqual([]); expect(result.working.unfavorableElements).toEqual([]);
    expect(result.working.conditionalElements).toEqual(["wood", "fire", "earth", "metal", "water"]);
    expect(result.facts.dayMasterRoots.map((root) => [root.branch, root.stem, root.layer])).toEqual([["亥", "壬", "main"], ["子", "癸", "main"]]);
    expect(result.working.summary).toContain("月柱丙正财"); expect(result.working.summary).toContain("年柱己七杀"); expect(result.working.summary).toContain("时柱戊正官");
    expect(result.working.evidence.join()).toContain("chong:巳亥"); expect(result.working.evidence.join()).toContain("chong:子午");
    expect(result.working.evidence.join()).toContain("he_gan_5:戊癸");
    expect(result.working.conditions.join()).toContain("相合未判合去，相冲未判根已被拔");
    expect(result.working.sourceIds).toContain("structural-zq-lu-role-selection");
    expect(getWorkingBalance({ sourceBinding: result.sourceBinding, balance: { structural: result } })).toEqual(result.working);
    expect(ordinary).toEqual(before);
  });

  it("matches another actual date and a separately labelled other-element pillar assertion without a birthday selector", async () => {
    const second = await revisionFor("2019-12-12", "11:23", "female"), actual = build(second), earth = pure(["壬辰", "乙未", "戊寅", "甲子"]);
    expect(Object.values(second.facts.pillars).map((pillar) => pillar.ganZhi)).toEqual(["己亥", "丙子", "癸未", "戊午"]);
    for (const result of [actual, earth]) {
      expect(result.working.ruleId).toBe("rooted-peer-mixed-authority-v1");
      expect(result.working.direction).toBe("conditional");
      expect(result.working.band).toBe("balanced");
      expect(result.working.favorableElements).toEqual([]);
    }
    expect(earth.facts.dayMaster.element).toBe("earth");
    expect(earth.facts.monthCommand.tenGod).toBe("劫财");
    expect(actual.raw).toEqual(deriveBaziStrengthAssessment(second.facts, true));
  });

  it.each([
    { date: "2014-01-27", time: "04:26", pillars: ["癸巳", "乙丑", "戊戌", "甲寅"], element: "earth" },
    { date: "1980-06-12", time: "10:26", pillars: ["庚申", "壬午", "丙辰", "癸巳"], element: "fire" }
  ])("uses the same conditional roles for actual $element example $date without importing winter-Gui seasonal words", async ({ date, time, pillars, element }) => {
    const revision = await revisionFor(date, time), original = structuredClone(revision), result = build(revision);
    expect(Object.values(revision.facts.pillars).map((pillar) => pillar.ganZhi)).toEqual(pillars);
    expect(result.facts.dayMaster.element).toBe(element);
    expect(result.working.ruleId).toBe("rooted-peer-mixed-authority-v1");
    expect(result.working.direction).toBe("conditional");
    expect(result.working.favorableElements).toEqual([]);
    expect(result.working.summary).not.toMatch(/温通|解冻|丙火为先|辛金滋扶/);
    expect(result.raw).toEqual(deriveBaziStrengthAssessment(revision.facts, true));
    expect(revision).toEqual(original);
  });

  it("requires the distinct rooted roles and another main self root instead of promoting any command peer chart", () => {
    const cases = [
      { pillars: ["己丑", "丙子", "癸巳", "戊午"], missing: "月令之外未见同类本气根" },
      { pillars: ["己亥", "壬子", "癸巳", "戊午"], missing: "尚无实际透出且有根的财星" },
      { pillars: ["己亥", "丙子", "癸巳", "壬午"], missing: "正官未实际透根" },
      { pillars: ["乙亥", "丙子", "癸巳", "戊午"], missing: "七杀未实际透根" }
    ];
    for (const item of cases) {
      const result = pure(item.pillars as [string, string, string, string]);
      expect(result.working.selection).toBe("raw_fallback");
      expect(result.findings.find((finding) => finding.ruleId === "rooted-peer-mixed-authority-v1")!.blockers.join()).toContain(item.missing);
    }
    const printMonth = pure(["己亥", "丙申", "癸巳", "戊午"]);
    expect(printMonth.findings.find((finding) => finding.ruleId === "rooted-peer-mixed-authority-v1")!.status).toBe("not_applicable");
  });

  it("does not borrow the missing hour officer, its roots or its clashes for an unknown-hour Gui-Zi projection", () => {
    const unknown = structuredClone(ordinary); unknown.input.time = null; unknown.input.timePrecision = "unknown_hour";
    const result = build(unknown);
    expect(result.working.selection).toBe("raw_fallback");
    expect(result.findings.find((finding) => finding.ruleId === "rooted-peer-mixed-authority-v1")!.blockers.join()).toContain("正官未实际透根");
    expect(result.facts.demandStems.some((actor) => actor.position === "hour")).toBe(false);
    expect(result.facts.interactions.some((fact) => fact.participants.some((part) => part.position === "hour"))).toBe(false);
    unknown.facts.pillars.hour = structuredClone(exact.facts.pillars.hour);
    expect(build(unknown)).toEqual(result);
    const changed = build(ordinary); changed.working.direction = "balanced";
    expect(() => getWorkingBalance({ balance: { structural: changed } })).toThrow(/已改变/);
  });

  it("keeps A and B outside this conditional rule and preserves the two existing structural directions", async () => {
    const [a, b] = await Promise.all([revisionFor("1995-08-18", "08:26"), revisionFor("1995-05-18", "08:26")]);
    for (const revision of [a, b]) {
      const result = build(revision);
      expect(result.working.selection).toBe("raw_fallback"); expect(result.working.direction).toBe("balanced");
      expect(result.raw).toEqual(deriveBaziStrengthAssessment(revision.facts, true));
    }
    expect(build(exact).working.focus).toBe("wealth_after_output");
    expect(build(resource).working.focus).toBe("output_after_resource");
  });

  it("fails closed for missing structure, wrong raw, corrupted current direction, or mismatched source", () => {
    const result = build(exact), wrongRaw = structuredClone(result.raw); wrongRaw.supportWeight++;
    expect(() => buildStructuralStrengthAssessment({ revision: exact, raw: wrongRaw })).toThrow(/原计权结果/);
    expect(() => getWorkingBalance({ balance: {} } as Parameters<typeof getWorkingBalance>[0])).toThrow(/缺少/);
    const changed = structuredClone(result); changed.working.favorableElements = ["wood", "fire", "earth"];
    expect(() => getWorkingBalance({ balance: { structural: changed } })).toThrow(/已改变/);
    expect(() => getWorkingBalance({ sourceBinding: { ...result.sourceBinding, chartResultHash: "f".repeat(64) }, balance: { structural: result } })).toThrow(/来源不匹配/);
    const badFacts = structuredClone(result.inputFacts); badFacts.pillars.day.hiddenStems = [];
    expect(() => evaluateStructuralStrength({ facts: badFacts, includeHour: true, raw: result.raw })).toThrow(/透藏或十神/);
  });
});
