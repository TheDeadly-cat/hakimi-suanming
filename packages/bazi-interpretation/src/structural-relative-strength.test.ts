import { beforeAll, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type RevisionRecord, type ChartFacts } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { LunarUtil } from "lunar-typescript";
import { deriveBaziStrengthAssessment } from "./strength-assessment-core";
import { buildStructuralStrengthAssessment, type StructuralStrengthInputFacts } from "./structural-strength-assessment";
import { evaluateStructuralRelativeStrength, STRUCTURAL_RELATIVE_POLICY } from "./structural-relative-strength";

async function chart(date: string, time = "11:23") {
  const result = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute", timeZone: "Asia/Shanghai",
    sex: "female", lunarLeapMonth: false, location: { label: "Synthetic relative strength", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  return storedRevisionRecordSchema.parse({ ...result, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
}
let publicChart: RevisionRecord, stronger: RevisionRecord;
beforeAll(async () => { [publicChart, stronger] = await Promise.all([chart("2019-12-22"), chart("1969-12-14")]); });
const evaluate = (r: RevisionRecord, includeHour = true) => evaluateStructuralRelativeStrength({ facts: r.facts, includeHour });

it("counts each branch reservoir once and distinguishes shared earth roots from two visible authority channels", () => {
  const before = structuredClone(publicChart), result = evaluate(publicChart);
  expect(result.band).toBe("balanced"); expect(result.supportShare).toBeCloseTo(0.58866, 4);
  expect(result.roots.filter((root) => root.element === "earth").map((root) => root.id)).toEqual(["day:巳:戊", "hour:午:己"]);
  expect(result.elements.find((element) => element.element === "earth")).toMatchObject({ channelQuantity: 0.5 });
  expect(result.elements.find((element) => element.element === "earth")!.rootQuantity).toBeCloseTo(0.45);
  for (const position of ["year", "month", "day", "hour"]) expect(result.roots.filter((root) => root.position === position).reduce((sum, root) => sum + root.quantity, 0)).toBeCloseTo(STRUCTURAL_RELATIVE_POLICY.branchBudget);
  expect(new Set(result.roots.map((root) => root.id)).size).toBe(result.roots.length);
  expect(publicChart).toEqual(before);
});

it("retains winter fire roots and the actual Yang growth root without adding an extra twelve-phase root", () => {
  const result = evaluate(publicChart), fire = result.elements.find((element) => element.element === "fire")!;
  expect(fire.seasonalState).toBe("死"); expect(fire.effectiveQuantity).toBeGreaterThan(0);
  expect(result.roots.filter((root) => root.element === "fire").map((root) => root.id)).toEqual(["day:巳:丙", "hour:午:丁"]);
  expect(result.roots.find((root) => root.id === "day:巳:庚")).toMatchObject({ kind: "other_yang_growth", layer: "other" });
  expect(result.roots.find((root) => root.id === "day:巳:庚")!.quantity).toBeCloseTo(0.15);
  expect(result.evidence.join()).toContain("工程量级比，非概率");
  expect(result.evidence.join()).toContain(JSON.stringify(STRUCTURAL_RELATIVE_POLICY));
  expect(result.conditions.join()).toContain("二元合冲不删除根");
  expect(result.conditions.join()).toContain("不另加权");
});

it("has a real legal R3 strong outcome without changing parameters or converting its conditional use into all-demand favorites", () => {
  expect(Object.values(stronger.facts.pillars).map((p) => p.ganZhi)).toEqual(["己酉", "丙子", "癸亥", "戊午"]);
  const result = evaluate(stronger), working = buildStructuralStrengthAssessment({ revision: stronger, raw: deriveBaziStrengthAssessment(stronger.facts, true) }).working;
  expect(result.band).toBe("strong"); expect(result.supportShare).toBeGreaterThan(STRUCTURAL_RELATIVE_POLICY.strongAbove);
  expect(working).toMatchObject({ band: "strong", direction: "conditional", focus: "rooted_peer_mixed_authority", favorableElements: [], unfavorableElements: [] });
  expect(working.label).toBe("得令有根，相对偏强");
});

it("excludes an unknown hour entirely and does not activate R3 from a three-pillar projection", () => {
  const projected = structuredClone(publicChart); projected.input.time = null; projected.input.timePrecision = "unknown_hour";
  const result = evaluate(projected, false);
  projected.facts.pillars.hour = structuredClone(stronger.facts.pillars.year);
  expect(evaluate(projected, false)).toEqual(result);
  expect(result.roots.every((root) => root.position !== "hour")).toBe(true);
  const structural = buildStructuralStrengthAssessment({ revision: projected, raw: deriveBaziStrengthAssessment(projected.facts, false) });
  expect(structural.working.focus).not.toBe("rooted_peer_mixed_authority");
  expect(structural.working.evidence.join()).not.toContain(result.version);
});

it("rejects duplicate roots, wrong selected pillar identity, invalid ten gods and borrowed stem-branch facts", () => {
  for (const change of [
    (facts: ChartFacts) => { facts.pillars.month.hiddenStems.push("癸"); },
    (facts: ChartFacts) => { facts.pillars.year.name = "hour"; },
    (facts: ChartFacts) => { facts.pillars.month.branchTenGods[0] = "正官"; },
    (facts: ChartFacts) => { facts.pillars.day.stemTenGod = "正印"; },
    (facts: ChartFacts) => { facts.pillars.hour.ganZhi = "甲丑"; }
  ]) { const changed = structuredClone(publicChart.facts); change(changed); expect(() => evaluateStructuralRelativeStrength({ facts: changed, includeHour: true })).toThrow(); }
});

it("keeps earth-month seasonal treatment neutral and makes its sensitivity visible", async () => {
  const actual = await chart("2014-01-27", "04:26"), result = evaluate(actual);
  expect(result.elements.every((element) => element.seasonalState === "未细分" && element.seasonalMultiplier === 1)).toBe(true);
  expect(result.band).toBe("balanced"); expect(result.sensitivity.find((row) => row.id === "main_share_80")!.band).toBe("strong");
  expect(result.conditions.join()).toContain("参数扰动会改变相对分档");
});

/** Classical pillar assertions are not fabricated historical birthdays. */
function asserted(pillars: [string, string, string, string]): StructuralStrengthInputFacts {
  const positions = ["year", "month", "day", "hour"] as const, labels = ["年柱", "月柱", "日柱", "时柱"] as const, day = pillars[2][0]!;
  return { pillars: Object.fromEntries(pillars.map((ganZhi, index) => { const hiddenStems = [...(LunarUtil.ZHI_HIDE_GAN as Record<string, string[]>)[ganZhi[1]!]!];
    return [positions[index], { name: positions[index], label: labels[index], ganZhi, stem: ganZhi[0], branch: ganZhi[1], hiddenStems,
      stemTenGod: index === 2 ? "日主" : (LunarUtil.SHI_SHEN as Record<string, string>)[day + ganZhi[0]!], branchTenGods: hiddenStems.map((stem) => (LunarUtil.SHI_SHEN as Record<string, string>)[day + stem]) }];
  })) as StructuralStrengthInputFacts["pillars"] };
}
it.each([
  ["丁亥", "癸卯", "癸卯", "甲寅"], ["戊戌", "壬戌", "丙子", "戊戌"], ["辛卯", "辛卯", "癸酉", "己未"]
] as [string, string, string, string][])("does not equate one self root, many residual roots or strong resource with a strong self: %s %s %s %s", (...pillars) => {
  const result = evaluateStructuralRelativeStrength({ facts: asserted(pillars), includeHour: true });
  expect(result.band).toBe("weak"); expect(result.label).not.toContain("得令");
});

it("preserves the explicit R1 rule despite the numeric proposal's known out-of-scope opposite result", async () => {
  const actual = await chart("1907-03-15", "02:26"), numeric = evaluate(actual), original = structuredClone(actual);
  expect(numeric.band).toBe("weak");
  const structural = buildStructuralStrengthAssessment({ revision: actual, raw: deriveBaziStrengthAssessment(actual.facts, true) });
  expect(structural.working).toMatchObject({ band: "strong", focus: "wealth_after_output" });
  expect(structural.working.sourceIds).not.toContain("structural-zq-relative-season-root");
  expect(structural.findings.flatMap((finding) => finding.sourceIds)).not.toContain("structural-zq-relative-season-root");
  expect(actual).toEqual(original);
});
