import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { LunarUtil } from "lunar-typescript";
import { evaluateNatalWealthResourceTask } from "./natal-wealth-resource-task";
import type { StructuralStrengthInputFacts } from "./structural-strength-assessment";

/** Classical assertions and local variations are facts, not fabricated dates. */
function asserted(pillars: [string, string, string, string]): StructuralStrengthInputFacts {
  const positions = ["year", "month", "day", "hour"] as const, day = pillars[2][0]!;
  return { pillars: Object.fromEntries(pillars.map((ganZhi, index) => {
    const hiddenStems = [...(LunarUtil.ZHI_HIDE_GAN as Record<string, string[]>)[ganZhi[1]!]!];
    return [positions[index], { name: positions[index], label: ["年柱", "月柱", "日柱", "时柱"][index], ganZhi, stem: ganZhi[0], branch: ganZhi[1], hiddenStems,
      stemTenGod: index === 2 ? "日主" : (LunarUtil.SHI_SHEN as Record<string, string>)[day + ganZhi[0]!],
      branchTenGods: hiddenStems.map((stem) => (LunarUtil.SHI_SHEN as Record<string, string>)[day + stem]) }];
  })) as StructuralStrengthInputFacts["pillars"] };
}
const evaluate = (pillars: [string, string, string, string]) => evaluateNatalWealthResourceTask({ facts: asserted(pillars), includeHour: true });
const cases = [
  { date: "1957-09-13", time: "00:26", pillars: ["丁酉", "己酉", "戊子", "壬子"], task: "resource_first" },
  { date: "1982-10-02", time: "10:26", pillars: ["壬戌", "己酉", "戊午", "丁巳"], task: "wealth_first" },
  { date: "1944-08-09", time: "04:26", pillars: ["甲申", "壬申", "乙巳", "戊寅"], task: "official_joint" },
  { date: "1982-07-24", time: "06:26", pillars: ["壬戌", "丁未", "戊申", "乙卯"], task: "not_applicable" }
] as const;
let actual: Awaited<ReturnType<typeof calculateChart>>[];
beforeAll(async () => {
  actual = await Promise.all(cases.map(({ date, time }) => calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time,
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
    location: { label: "Synthetic calendar counterpart, not a historical birthday", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE)));
});

describe("natal wealth and resource task", () => {
  it("distinguishes opposite hurting-month tasks without changing raw strength or promoting hidden Xin", () => {
    const support = evaluate(["丁酉", "己酉", "戊子", "壬子"]), moderate = evaluate(["壬戌", "己酉", "戊午", "丁巳"]);
    expect(support).toMatchObject({ applicable: true, task: "resource_first", preferredPathId: "hurting-resource", monthCommand: { stem: "辛", tenGod: "伤官" } });
    expect(moderate).toMatchObject({ applicable: true, task: "wealth_first", preferredPathId: "hurting-wealth" });
    expect(support.pairs[0]!.resource.roots).toEqual([]); expect(support.pairs[0]!.wealth.roots).not.toHaveLength(0);
    expect(moderate.pairs[0]!.resource.roots.some((root) => root.layer === "main")).toBe(true); expect(moderate.pairs[0]!.wealth.roots).toEqual([]);
    for (const result of [support, moderate]) {
      expect(result.pairs[0]!.intervening.map((item) => [item.stem, item.tenGod, item.isDayMaster])).toEqual([["己", "劫财", false], ["戊", "日主", true]]);
      expect(result.pairs[0]).toMatchObject({ separatedByPeers: true, hasCombination: true });
      expect(result.pairs[0]!.relations[0]!.participants.map((part) => part.position).sort()).toEqual(["hour", "year"]);
      expect(result).not.toHaveProperty("band"); expect(result).not.toHaveProperty("favorableElements");
      expect(result.conditions.join()).toContain("不是古籍根数公式");
    }
  });

  it("keeps the exact official-month wealth/print positions and does not confuse an unexposed officer with either actor", () => {
    const result = evaluate(["甲申", "壬申", "乙巳", "戊寅"]);
    expect(result).toMatchObject({ task: "official_joint", preferredPathId: "official-resource", monthCommand: { stem: "庚", tenGod: "正官" } });
    expect(result.pairs[0]).toMatchObject({ wealth: { position: "hour", stem: "戊", tenGod: "正财" }, resource: { position: "month", stem: "壬", tenGod: "正印" },
      intervening: [{ position: "day", stem: "乙", tenGod: "日主", isDayMaster: true }], separatedByPeers: true, hasCombination: false });
    expect(result.sourceIds).toContain("natal-zq-official-wealth-resource-separated");
  });

  it("verifies four legal modern calendar counterparts including another day master, without claiming the historical birth dates", () => {
    cases.forEach((example, index) => {
      const chart = actual[index]!, before = JSON.stringify(chart);
      expect(Object.values(chart.facts.pillars).map((pillar) => pillar.ganZhi)).toEqual(example.pillars);
      const result = evaluateNatalWealthResourceTask({ facts: chart.facts, includeHour: true });
      expect(result.task).toBe(example.task); expect(JSON.stringify(chart)).toBe(before);
    });
    // The book's adjacent-combination counterexample has Wei's Ji peer as main
    // qi; it must not be relabelled an official month to enter this new gate.
    expect(evaluateNatalWealthResourceTask({ facts: actual[3]!.facts, includeHour: true }).monthCommand.tenGod).toBe("劫财");
  });

  it("excludes an unknown hour completely, including its partner and roots", () => {
    for (const chart of actual.slice(0, 3)) {
      const supplied = structuredClone(chart.facts), result = evaluateNatalWealthResourceTask({ facts: supplied, includeHour: false });
      expect(result.task).toBe("not_applicable"); expect(result.pairs).toEqual([]);
      const without = structuredClone(supplied) as StructuralStrengthInputFacts;
      delete without.pillars.hour;
      expect(evaluateNatalWealthResourceTask({ facts: without, includeHour: false })).toEqual(result);
      supplied.pillars.hour.hiddenStems = ["bad"];
      expect(evaluateNatalWealthResourceTask({ facts: supplied, includeHour: false })).toEqual(result);
    }
  });

  it("keeps adjacent official-month Ding/Ren combined and does not open a separated exception", () => {
    // A local four-pillar variation; not a book example or calculated birthday.
    const result = evaluate(["壬戌", "丁卯", "戊申", "乙卯"]);
    expect(result).toMatchObject({ applicable: true, task: "conditional", preferredPathId: null });
    expect(result.pairs[0]).toMatchObject({ intervening: [], separatedByPeers: false, hasCombination: true });
    expect(result.pairs[0]!.relations).not.toHaveLength(0);
    expect(result.sourceIds).toContain("natal-zq-official-wealth-resource-combined");
  });

  it("rejects distance alone when a non-peer stands between the actual wealth and print", () => {
    const result = evaluate(["丁酉", "辛酉", "戊子", "壬子"]);
    expect(result).toMatchObject({ applicable: true, task: "conditional", preferredPathId: null });
    expect(result.pairs[0]!.intervening[0]).toMatchObject({ stem: "辛", tenGod: "伤官" });
    expect(result.pairs[0]).toMatchObject({ separatedByPeers: false, hasCombination: true });
  });

  it("does not choose one convenient pair when multiple visible wealth or print actors exist", () => {
    for (const pillars of [["壬子", "丁酉", "戊午", "癸丑"], ["壬申", "丁酉", "戊子", "丁巳"]] as [string, string, string, string][]) {
      const result = evaluate(pillars);
      expect(result.task).toBe("conditional"); expect(result.pairs).toHaveLength(2); expect(result.preferredPathId).toBeNull();
    }
  });

  it("keeps partial root combinations conditional rather than inverting the opposite rule", () => {
    const bothRooted = evaluate(["丁酉", "己酉", "戊午", "壬子"]);
    expect(bothRooted.pairs[0]!.separatedByPeers).toBe(true);
    expect(bothRooted.pairs[0]!.wealth.roots.length).toBeGreaterThan(0);
    expect(bothRooted.pairs[0]!.resource.roots.length).toBeGreaterThan(0);
    expect(bothRooted.task).toBe("conditional"); expect(bothRooted.preferredPathId).toBeNull();
    expect(evaluate(["戊戌", "癸亥", "乙卯", "癸未"]).task).toBe("not_applicable");
  });

  it("rejects altered selected pillar identities and ten-god/hidden-stem facts without mutating input", () => {
    const original = asserted(["丁酉", "己酉", "戊子", "壬子"]), before = JSON.stringify(original);
    evaluateNatalWealthResourceTask({ facts: original, includeHour: true }); expect(JSON.stringify(original)).toBe(before);
    for (const corrupt of [
      (facts: StructuralStrengthInputFacts) => { facts.pillars.month.name = "year"; },
      (facts: StructuralStrengthInputFacts) => { facts.pillars.hour!.hiddenStems = []; },
      (facts: StructuralStrengthInputFacts) => { facts.pillars.year.stemTenGod = "not-a-god"; },
      (facts: StructuralStrengthInputFacts) => { facts.pillars.day.branchTenGods = []; }
    ]) { const facts = structuredClone(original); corrupt(facts); expect(() => evaluateNatalWealthResourceTask({ facts, includeHour: true })).toThrow(); }
  });
});
