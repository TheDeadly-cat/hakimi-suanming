import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { withDayBoundary } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "./preliminary-assessment";
import { buildNatalPatternDiagnosis } from "./natal-pattern-diagnosis";
import { canonicalizeStrengthTenGod } from "./strength-policy";
import { selectNatalPatternPath } from "./natal-pattern-path";
import { evaluateNatalWealthResourceTask } from "./natal-wealth-resource-task";

async function revisionFor(date: string, time: string) {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
    location: { label: "Synthetic month-command path", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, withDayBoundary("zi_start_23"));
  return storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111", caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00.000Z" });
}
let killing: RevisionRecord, official: RevisionRecord, noPartner: RevisionRecord, otherHidden: RevisionRecord;
beforeAll(async () => {
  [killing, official, noPartner, otherHidden] = await Promise.all([
    revisionFor("1995-09-21", "02:26"), revisionFor("2000-03-11", "10:26"), revisionFor("1995-09-21", "06:26"), revisionFor("1995-03-15", "02:26")
  ]);
});
function selected(revision: RevisionRecord) {
  const p = buildBaziPreliminaryAssessment(revision);
  return selectNatalPatternPath({ family: p.pattern.family, monthMainStem: p.pattern.monthMainStem, monthMainTenGod: p.pattern.monthMainTenGod,
    visibleTenGods: [revision.facts.pillars.year, revision.facts.pillars.month, revision.facts.pillars.hour].map((pillar) => canonicalizeStrengthTenGod(pillar.stemTenGod)) });
}

describe("month-command role supplements the unchanged visible path precedence", () => {
  it("requires the validated working focus to replace generic print preservation with the resource-wealth path", () => {
    const input = { family: "resource" as const, monthMainStem: "壬", monthMainTenGod: "正印", visibleTenGods: ["正财", "偏印", "偏印"] };
    expect(selectNatalPatternPath(input).id).toBe("resource-preservation");
    const selected = selectNatalPatternPath({ ...input, workingFocus: "wealth_moderates_resource" });
    expect(selected).toMatchObject({ id: "resource-wealth", title: "印旺用财", candidateId: "resource-wealth", protectedGroups: ["wealth"], monthCommandRole: null });
    expect(selected.required).toEqual([["正印", "偏印"], ["正财", "偏财"]]);
    expect(selectNatalPatternPath({ ...input, workingFocus: "raw_drain" }).id).toBe("resource-preservation");
    expect(selectNatalPatternPath({ ...input, family: "peer", workingFocus: "wealth_moderates_resource" }).id).not.toBe("resource-wealth");
    expect(selectNatalPatternPath({ ...input, visibleTenGods: ["偏印"], workingFocus: "wealth_moderates_resource" }).id).not.toBe("resource-wealth");
  });

  it("uses the actual classical structure's month Xin killing and exposed Ding food without promoting Xin to a stem", () => {
    expect(Object.values(killing.facts.pillars).map((pillar) => pillar.ganZhi)).toEqual(["乙亥", "乙酉", "乙卯", "丁丑"]);
    const before = JSON.stringify(killing), path = selected(killing), p = buildBaziPreliminaryAssessment(killing), diagnosis = buildNatalPatternDiagnosis(killing, p);
    expect(path.id).toBe("food-killings");
    expect(path.monthCommandRole).toEqual({ position: "month", kind: "main_hidden", stem: "辛", tenGod: "七杀" });
    expect(diagnosis.monthCommandRole).toEqual(path.monthCommandRole);
    expect(diagnosis.currentJudgment).toContain("月令辛七杀当令，时干丁（食神）已透");
    expect(diagnosis.foundation.join()).toContain("原局未透辛");
    expect(diagnosis.foundation.join()).toContain("未见同五行藏根");
    expect(diagnosis.sourceIds).toContain("outlook-zq-killing-month-example");
    expect(diagnosis.blockers.flatMap((item) => item.evidence).join()).not.toMatch(/(?:年干|月干|时干)辛/);
    expect(JSON.stringify(killing)).toBe(before);
  });

  it("uses a real hidden month official with a visible regular print, keeping both locations explicit", () => {
    expect(Object.values(official.facts.pillars).map((pillar) => pillar.ganZhi)).toEqual(["庚辰", "己卯", "戊辰", "丁巳"]);
    const path = selected(official), diagnosis = buildNatalPatternDiagnosis(official, buildBaziPreliminaryAssessment(official));
    expect(path.id).toBe("official-resource");
    expect(path.monthCommandRole?.stem).toBe("乙");
    expect(diagnosis.currentJudgment).toContain("月令乙正官当令，时干丁（正印）已透");
    expect(diagnosis.foundation.join()).toContain("原局未透乙");
    expect(diagnosis.sourceIds).toContain("outlook-zq-official-month-example");
  });

  it("does not invent a food or print partner merely because killing commands the month", () => {
    expect(noPartner.facts.pillars.month.ganZhi).toBe("乙酉");
    expect(noPartner.facts.pillars.hour.ganZhi).toBe("己卯");
    const path = selected(noPartner);
    expect(path.id).toBe("seven_killings-background");
    expect(path.monthCommandRole).toBeNull();
  });

  it("does not promote a non-month hidden killing when food is visible", () => {
    const p = buildBaziPreliminaryAssessment(otherHidden);
    expect(p.pattern.family).toBe("peer");
    expect(otherHidden.facts.pillars.hour.ganZhi).toBe("丁丑");
    expect(otherHidden.facts.pillars.hour.hiddenStems).toContain("辛");
    expect(selected(otherHidden).id).toBe("peer-output-wealth");
    expect(selected(otherHidden).monthCommandRole).toBeNull();
  });

  it("preserves all existing visible-path priorities ahead of the new month fallback", () => {
    const input = { family: "seven_killings" as const, monthMainStem: "辛", monthMainTenGod: "七杀" };
    for (const [visibleTenGods, id] of [
      [["正官", "正印", "食神"], "official-resource"],
      [["正官", "正财", "食神"], "official-wealth"],
      [["食神", "七杀", "正印"], "food-killings"],
      [["七杀", "正印"], "killings-resource"],
      [["伤官", "正印"], "hurting-resource"],
      [["食神", "偏印"], "resource-preservation"]
    ] as const) {
      const path = selectNatalPatternPath({ ...input, visibleTenGods });
      expect(path.id).toBe(id); expect(path.monthCommandRole).toBeNull();
    }
  });

  it("requires the matching official or killing month family and keeps food distinct from hurting", () => {
    expect(selectNatalPatternPath({ family: "official", monthMainStem: "乙", monthMainTenGod: "正官", visibleTenGods: ["正财"] }).id).toBe("official-wealth");
    expect(selectNatalPatternPath({ family: "seven_killings", monthMainStem: "辛", monthMainTenGod: "七杀", visibleTenGods: ["正印"] }).id).toBe("killings-resource");
    expect(selectNatalPatternPath({ family: "seven_killings", monthMainStem: "辛", monthMainTenGod: "七杀", visibleTenGods: ["伤官"] }).id).toBe("seven_killings-background");
    expect(selectNatalPatternPath({ family: "peer", monthMainStem: "乙", monthMainTenGod: "比肩", visibleTenGods: ["食神"] }).monthCommandRole).toBeNull();
  });
});

describe("same-natal wealth/resource task hints", () => {
  it("uses opposite verified hurting-month tasks while the legacy call keeps its original priority", async () => {
    for (const [date, time, expected, taskKind] of [
      ["1957-09-13", "00:26", "hurting-resource", "resource_first"],
      ["1982-10-02", "10:26", "hurting-wealth", "wealth_first"]
    ] as const) {
      const revision = await revisionFor(date, time), task = evaluateNatalWealthResourceTask({ facts: revision.facts, includeHour: true });
      const input = { family: "output" as const, monthMainStem: "辛", monthMainTenGod: "伤官",
        visibleTenGods: [revision.facts.pillars.year, revision.facts.pillars.month, revision.facts.pillars.hour].map((pillar) => canonicalizeStrengthTenGod(pillar.stemTenGod)) };
      expect(task.task).toBe(taskKind); expect(selectNatalPatternPath(input).id).toBe("hurting-wealth");
      const result = selectNatalPatternPath({ ...input, wealthResourceTask: task });
      expect(result.id).toBe(expected);
      expect(result.monthCommandRole).toEqual({ position: "month", kind: "main_hidden", stem: "辛", tenGod: "伤官" });
      expect(result.required).toContainEqual(["伤官"]); expect(result.required).toContainEqual(["正印", "偏印"]);
      expect(result.required).toContainEqual(["正财", "偏财"]);
      expect(input.visibleTenGods).not.toContain("伤官");
    }
  });

  it("keeps hidden month official and both visible partners distinct in the joint task", async () => {
    const revision = await revisionFor("1944-08-09", "04:26"), task = evaluateNatalWealthResourceTask({ facts: revision.facts, includeHour: true });
    const input = { family: "official" as const, monthMainStem: "庚", monthMainTenGod: "正官", visibleTenGods: ["劫财", "正印", "正财"] };
    expect(selectNatalPatternPath({ ...input, wealthResourceTask: task })).toMatchObject({ id: "official-resource", title: "官格财印分用",
      monthCommandRole: { position: "month", kind: "main_hidden", stem: "庚", tenGod: "正官" } });
    expect(selectNatalPatternPath(input).title).toBe("官印承接");
  });

  it("rejects a task hint borrowed from another month or inconsistent with the supplied visible roles", async () => {
    const revision = await revisionFor("1957-09-13", "00:26"), task = evaluateNatalWealthResourceTask({ facts: revision.facts, includeHour: true });
    const input = { family: "output" as const, monthMainStem: "辛", monthMainTenGod: "伤官", visibleTenGods: ["正印", "劫财", "偏财"], wealthResourceTask: task };
    expect(() => selectNatalPatternPath({ ...input, monthMainStem: "庚", monthMainTenGod: "食神" })).toThrow("月令");
    expect(() => selectNatalPatternPath({ ...input, visibleTenGods: ["正印", "劫财"] })).toThrow("透财");
    const changed = structuredClone(task); changed.preferredPathId = "hurting-wealth";
    expect(() => selectNatalPatternPath({ ...input, wealthResourceTask: changed })).toThrow("主路径提示");
  });
});
