import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "./preliminary-assessment";
import { buildNatalPatternDiagnosis } from "./natal-pattern-diagnosis";
import { buildNatalUsefulGuidance } from "./natal-useful-guidance";

async function revisionFor(date: string, time = "08:26", sex: "male" | "female" = "male") {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute",
    timeZone: "Asia/Shanghai", sex, lunarLeapMonth: false, location: { label: "Synthetic useful-word reading", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  return storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
}
const read = (revision: RevisionRecord) => buildNatalUsefulGuidance(revision, buildBaziPreliminaryAssessment(revision));
let xin: RevisionRecord, weak: RevisionRecord, food: RevisionRecord, missing: RevisionRecord, combined: RevisionRecord;
beforeAll(async () => { [xin, weak, food, missing, combined] = await Promise.all([
  revisionFor("1995-08-18"), revisionFor("1995-03-18"), revisionFor("1991-02-08", "02:26"), revisionFor("1990-10-18", "20:26"), revisionFor("1995-05-17")
]); });

describe("natal useful words explain existing tasks without assigning a global favorable list", () => {
  it.each(["1995-05-18", "1995-06-17", "1995-07-17"])("preserves the checked Gui-first/Bing-second order for three-summer Ji: %s", async date => {
    const revision = await revisionFor(date), p = buildBaziPreliminaryAssessment(revision), before = structuredClone(p);
    expect(revision.facts.pillars.day.stem).toBe("己");
    expect(p.seasonal.preferredStems).toEqual(["癸", "丙"]);
    const result = buildNatalUsefulGuidance(revision, p), gui = result.entries.find(entry => entry.stem === "癸")!, bing = result.entries.find(entry => entry.stem === "丙")!;
    expect(gui.roles.find(role => role.kind === "seasonal_preferred")!.text).toContain("癸水润土为先");
    expect(bing.roles.find(role => role.kind === "seasonal_preferred")!.text).toContain("次用配合");
    expect(bing.roleLabel).toContain("调候次用");
    expect(bing.roleLabel).not.toContain("调候主取");
    expect(bing.roles.some(role => role.text.includes("优先考察丙"))).toBe(false);
    expect(p).toEqual(before);
  });

  it("does not promote all ordered seasonal lists to the Ji-summer prescription", () => {
    const p = buildBaziPreliminaryAssessment(xin), result = buildNatalUsefulGuidance(xin, p);
    expect(result.entries.find(entry => entry.stem === "壬")!.roleLabel).toContain("调候主取");
    expect(result.entries.flatMap(entry => entry.roles).some(role => role.text.includes("三夏己土"))).toBe(false);
  });

  it.each([
    ["1957-09-13", "00:26", "resource_first", "hurting-resource", ["丁"], ["壬"], "护身制伤", "natal-zq-hurting-wealth-heavy"],
    ["1982-10-02", "10:26", "wealth_first", "hurting-wealth", ["壬"], ["丁"], "调印", "natal-zq-hurting-resource-heavy"],
    ["1944-08-09", "04:26", "official_joint", "official-resource", ["戊", "壬"], ["庚"], "各司其职", "natal-zq-official-wealth-resource-separated"],
  ] as const)("gives the actual wealth/resource task priority for calculated same-pillar %s", async (date, time, task, path, primary, companions, phrase, source) => {
    const revision = await revisionFor(date, time), p = buildBaziPreliminaryAssessment(revision), before = structuredClone({ revision, p });
    const diagnosis = buildNatalPatternDiagnosis(revision, p), result = buildNatalUsefulGuidance(revision, p, diagnosis);
    expect(diagnosis.wealthResourceTask.task).toBe(task); expect(result.primaryPathId).toBe(path);
    expect(result.answer.primaryStems).toEqual([...primary]); expect(result.answer.companionStems).toEqual([...companions]);
    expect(result.answer.headline).toContain(phrase); expect(result.sourceIds).toContain(source);
    expect(result.answer.condition).not.toContain("不把来字排成第五柱");
    expect(result.answer.evidence.join("\n")).toContain("不把来字排成第五柱");
    expect(result.conditions.join("\n")).toContain("不把来字排成第五柱");
    if (task === "resource_first") {
      const gui = result.entries.find((entry) => entry.stem === "癸");
      expect(gui?.roles.some((role) => role.kind === "path_key") ?? false).toBe(false);
      expect(gui?.judgment ?? "").not.toContain("作为需要印来配合的表达与输出");
      if (p.seasonal.preferredStems.includes("癸") || p.seasonal.conditionalStems.some((entry) => entry.stem === "癸")) expect(gui).toBeDefined();
    }
    const command = result.entries.find((entry) => entry.stem === diagnosis.monthCommandRole!.stem)!;
    expect(command.presence).toBe("hidden_only"); expect(command.occurrences.every((item) => item.kind === "hidden")).toBe(true);
    expect(command.judgment).toContain("目前未透");
    if (task !== "official_joint") {
      expect(result.entries.find((entry) => entry.stem === primary[0])!.presence).toBe("exposed_unrooted");
      expect(result.answer.condition).toContain("虽透但所选支内未见同五行根");
      for (const entry of result.entries.filter((item) => ["丁", "壬"].includes(item.stem))) {
        expect(entry.interactions.some((item) => item.kind === "combination" && item.text.includes("保留五合事实"))).toBe(true);
        expect(entry.judgment).not.toContain("相合，现有作用带有牵连");
      }
      expect(result.entries.find((entry) => entry.stem === "壬")!.judgment).toContain("月柱己可克");
      if (task === "wealth_first") expect(result.answer.condition).toContain("月柱己可克年柱壬");
    }
    expect({ revision, p }).toEqual(before);
  });

  it("does not take over an unresolved wealth-resource task, use a missing hour, or erase the actual neighboring combination", async () => {
    const conditional = await revisionFor("1957-09-13", "02:26"), conditionalP = buildBaziPreliminaryAssessment(conditional), conditionalD = buildNatalPatternDiagnosis(conditional, conditionalP);
    expect(conditionalD.wealthResourceTask.task).toBe("conditional");
    const unchangedRoute = buildNatalUsefulGuidance(conditional, conditionalP, conditionalD);
    expect(unchangedRoute.primaryPathId).toBe("hurting-wealth");
    expect(unchangedRoute.answer.headline).not.toContain("先分清彼此牵制");
    const revision = await revisionFor("1982-07-24", "06:26"), p = buildBaziPreliminaryAssessment(revision), d = buildNatalPatternDiagnosis(revision, p), result = buildNatalUsefulGuidance(revision, p, d);
    expect(d.wealthResourceTask.task).toBe("not_applicable"); expect(result.answer.condition).toContain("月柱丁与年柱壬相合");
    const known = await revisionFor("1944-08-09", "04:26"), unknown = structuredClone(known);
    unknown.input.timePrecision = "unknown_hour"; unknown.input.time = null;
    const u = buildBaziPreliminaryAssessment(unknown), ud = buildNatalPatternDiagnosis(unknown, u), reading = buildNatalUsefulGuidance(unknown, u, ud);
    expect(ud.wealthResourceTask.task).toBe("not_applicable");
    expect(reading.entries.every((entry) => entry.occurrences.every((occurrence) => occurrence.position !== "hour"))).toBe(true);
    expect(reading.answer.headline).not.toContain("各司其职");
  });

  it.each([
    ["2018-11-19", "14:26", "戊", ["癸"], "earth"],
    ["1999-01-09", "02:26", "乙", ["戊", "己"], "wood"],
  ] as const)("puts the actual moderating wealth first while preserving resource foundations for %s", async (date, time, wealth, prints, element) => {
    const revision = await revisionFor(date, time), preliminary = buildBaziPreliminaryAssessment(revision);
    const before = structuredClone({ revision, preliminary }), result = buildNatalUsefulGuidance(revision, preliminary);
    expect(preliminary.balance.structural.working).toMatchObject({ focus: "wealth_moderates_resource", favorableElements: [element], unfavorableElements: [] });
    expect(result.primaryPathId).toBe("resource-wealth");
    expect(result.answer.primaryStems).toEqual([wealth]);
    expect(result.answer.companionStems).toEqual([...prints]);
    expect(result.answer.headline).toContain("裁印");
    expect(result.answer.summary).toContain("并非继续加印或把印一概去掉");
    expect(result.answer.condition).toContain("印轻财重时须转为护印");
    expect(result.answer.evidence.join()).toContain("rooted-resource-wealth-v1");
    expect(result.sourceIds).toContain("outlook-zq-resource-wealth");
    for (const stem of prints) {
      const entry = result.entries.find((item) => item.stem === stem)!;
      expect(entry.presence).toBe("exposed_rooted");
      expect(entry.roles.some((role) => role.kind === "baseline_unfavorable")).toBe(false);
      expect(entry.judgment).toContain("保留印的学习与承接基础");
    }
    if (wealth === "戊") {
      expect(result.answer.condition).toContain("年柱戊与月柱癸相合");
      expect(result.answer.condition).toContain("年柱戊与时柱癸相合");
      expect(result.answer.condition).toContain("不能同时按完全自由的制印来算");
    }
    expect({ revision, preliminary }).toEqual(before);
  });

  it("does not promote wealth over resource when the actual two-wealth chart misses the structural gate", async () => {
    const revision = await revisionFor("2021-02-27", "14:26"), result = read(revision);
    expect(result.primaryPathId).toBe("resource-preservation");
    expect(result.answer.primaryStems).toEqual(["乙"]);
    expect(result.answer.headline).not.toContain("裁印");
    expect(result.answer.condition).toContain("乙与月柱庚相合");
  });

  it.each([
    ["1907-03-15", "02:26", "丁", "乙", "fire"],
    ["1972-09-25", "10:26", "壬", "辛", "water"]
  ])("uses the actual wealth actor to receive existing food output for %s", async (date, time, wealthStem, foodStem, element) => {
    const revision = await revisionFor(date, time), preliminary = buildBaziPreliminaryAssessment(revision);
    const original = structuredClone({ revision, preliminary });
    const result = buildNatalUsefulGuidance(revision, preliminary);
    expect(preliminary.balance.structural.working).toMatchObject({ focus: "wealth_after_output", favorableElements: [element] });
    expect(result.answer.primaryStems).toEqual([wealthStem]);
    expect(result.answer.headline).toContain(`${wealthStem}`);
    expect(result.answer.headline).toContain("承接已有食神产出");
    expect(result.answer.summary).toContain(`${foodStem}食神未透，仍以月令背景参与配合`);
    expect(result.entries.find((entry) => entry.stem === foodStem)!.presence).toBe("hidden_only");
    expect(result.answer.primaryStems).not.toContain(foodStem);
    expect(result.answer.companionStems).toContain(foodStem);
    expect(result.answer.summary).toContain("不再一概追加食伤");
    expect(result.answer.condition).toContain("另增食伤或官杀负担");
    expect(result.answer.evidence.join()).toContain("rooted-peer-food-wealth-v1");
    if (wealthStem === "丁") {
      expect(result.answer.summary).toContain("庚原局未见");
      expect(result.answer.summary).toContain("仅庚辛重见时参酌制金");
      expect(result.answer.condition).toContain("癸可克年柱丁");
      expect(preliminary.balance).toMatchObject({ supportWeight: 8, demandWeight: 15, band: "weak" });
    }
    expect({ revision, preliminary }).toEqual(original);
  });

  it("prioritizes rooted output after resource without making wealth or missing seasonal Ren a current priority", async () => {
    const revision = await revisionFor("2018-03-15", "00:26"), preliminary = buildBaziPreliminaryAssessment(revision);
    const original = structuredClone({ revision, preliminary }), result = buildNatalUsefulGuidance(revision, preliminary);
    expect(preliminary.balance.structural.working).toMatchObject({ focus: "output_after_resource", favorableElements: ["earth"] });
    expect(result.answer.primaryStems).toEqual(["戊"]);
    expect(result.answer.headline).toContain("戊食神泄秀");
    expect(result.answer.summary).toContain("印的透根与日主坐下本气根分别有据");
    expect(result.answer.summary).toContain("财官与其他用字保留各自条件");
    expect(result.answer.summary).toContain("乙已透，提供印星支持");
    expect(result.answer.summary).toContain("壬原局未见");
    expect(result.answer.summary).toContain("壬水成片时制水");
    expect(result.answer.condition).toContain("乙可克年柱戊");
    expect(result.answer.condition).toContain("印的支持转为压住输出");
    expect(result.answer.primaryStems).not.toContain("壬");
    expect(result.entries.find((entry) => entry.stem === "壬")!.presence).toBe("absent");
    expect({ revision, preliminary }).toEqual(original);
  });

  it("answers the month's hidden Xin killing with Ding's actual food role while retaining its missing fire roots", async () => {
    const revision = await revisionFor("1995-09-21", "02:26"), result = read(revision);
    expect(result.version).toBe("hakimi.natal-useful-guidance/0.12.0");
    expect(result.primaryPathId).toBe("food-killings");
    const xin = result.entries.find((item) => item.stem === "辛")!, ding = result.entries.find((item) => item.stem === "丁")!;
    expect(xin.presence).toBe("hidden_only");
    expect(xin.occurrences.every((item) => item.kind === "hidden")).toBe(true);
    expect(xin.interactions).toEqual([]);
    expect(xin.roleLabel).toContain("月令背景支点");
    expect(xin.judgment).toContain("已存在的月令主气背景，目前未透");
    expect(xin.conditions.join()).toContain("不必等到透干才承认这条背景");
    expect(ding.presence).toBe("exposed_unrooted");
    expect(ding.sameElementRoots).toEqual([]);
    expect(ding.judgment).toContain("调节月令辛七杀的食神输出");
    expect(ding.conditions.join()).toContain("所选地支未见同五行藏根");
    expect(result.headline).toContain("丁食神制月令辛杀");
    expect(result.summary).toContain("月令辛仍藏，未按透干作用");
    expect(result.sourceIds).toContain("outlook-zq-killing-month-example");
    expect(result.priorities.some((line) => line.startsWith("辛"))).toBe(false);
  });

  it("does not retain the month-food route after its sole exposed hour partner becomes unknown", async () => {
    const revision = await revisionFor("1995-09-21", "02:26");
    revision.input.time = null; revision.input.timePrecision = "unknown_hour";
    const result = read(revision);
    expect(result.primaryPathId).toBe("seven_killings-background");
    expect(result.headline).not.toContain("配合已透丁");
    expect(result.entries.every((entry) => entry.occurrences.every((item) => item.position !== "hour") && entry.interactions.every((item) => !item.text.includes("时柱")))).toBe(true);
    expect(result.sourceIds).not.toContain("outlook-zq-killing-month-example");
  });

  it("names a strong Jia chart's peer month as background rather than declaring Yi its useful structure stem", async () => {
    const revision = await revisionFor("1993-04-03"), result = read(revision);
    expect(result.primaryPathId).toBe("peer-background");
    expect(result.headline).toBe("月令背景乙，调候考察庚");
    expect(result.headline).not.toContain("结构用字乙");
    expect(result.entries.find((entry) => entry.stem === "乙")!.roles.map((role) => role.kind)).toContain("baseline_unfavorable");
    expect(result.entries.find((entry) => entry.stem === "乙")!.roles.some((role) => role.axis === "seasonal")).toBe(false);
    expect(result.answer.summary).not.toContain("乙已透，作为调候考察字");
    expect(result.answer.summary).toContain("乙已透，保留月令比劫背景");
    expect(result.answer.summary).toContain("庚原局未见，作为调候考察字");
  });

  it("keeps Xin food's structural task despite the weak chart's metal-draining balance direction", () => {
    const result = read(food), entry = result.entries.find((item) => item.stem === "辛")!;
    expect(result.primaryPathId).toBe("food-killings");
    expect(entry.roles.map((role) => role.kind)).toEqual(expect.arrayContaining(["path_key", "baseline_unfavorable"]));
    expect(entry.roleLabel).toContain("格局支点");
    expect(entry.roles.find((role) => role.kind === "path_key")!.text).toContain("制约乙");
    expect(entry.judgment).toContain("不能直接把辛当作应被去掉的忌字");
    expect(result.balanceText).toContain("火、土");
  });

  it("distinguishes current balanced baseline from only alternative seasonal conflicts", () => {
    const result = read(xin), preliminary = buildBaziPreliminaryAssessment(xin);
    expect(preliminary.seasonal.balanceConflict).toBe(true);
    expect(preliminary.balance.baselineDirection).toBe("balanced");
    expect(result.seasonalBalanceConflict.baseline).toBe(false);
    expect(result.seasonalBalanceConflict.alternativeScenarioIds.length).toBeGreaterThan(0);
    expect(result.seasonalBalanceConflict.alternativeScenarioIds).not.toContain("baseline_current_candidate");
    expect(result.seasonalBalanceConflict.summary).toContain("部分原计权对照场景有不同取舍");
    expect(result.balanceText).toContain("不固定喜忌");
    expect(result.priorities[0]).toMatch(/^壬伤官/);
  });

  it("distinguishes exposed but unrooted Bing support from hidden Jia and Gui in the actual weak chart", () => {
    const result = read(weak), bing = result.entries.find((item) => item.stem === "丙")!, jia = result.entries.find((item) => item.stem === "甲")!, gui = result.entries.find((item) => item.stem === "癸")!;
    expect(bing.presence).toBe("exposed_unrooted"); expect(bing.sameElementRoots).toEqual([]);
    expect(bing.roles.map((role) => role.kind)).toContain("baseline_favorable");
    expect(jia.presence).toBe("hidden_only"); expect(gui.presence).toBe("hidden_only");
    expect(jia.roles.map((role) => role.kind)).toContain("baseline_unfavorable");
    expect(gui.roles.map((role) => role.kind)).toContain("baseline_unfavorable");
    expect(jia.interactions).toEqual([]); expect(gui.interactions).toEqual([]);
    expect(jia.judgment).toContain("甲木克日主戊土");
    expect(gui.judgment).toContain("日主戊土克癸水");
  });

  it("keeps absent seasonal Jia and Ren conditional even with same-element roots", () => {
    const result = read(missing);
    for (const stem of ["甲", "壬"]) {
      const entry = result.entries.find((item) => item.stem === stem)!;
      expect(entry.presence).toBe("absent"); expect(entry.occurrences).toEqual([]);
      expect(entry.sameElementRoots.length).toBeGreaterThan(0);
      expect(entry.interactions).toEqual([]); expect(entry.judgment).toContain("原局未见");
      expect(entry.conditions.join()).toContain("若" + stem + "以后透出");
    }
    const jia = result.entries.find((item) => item.stem === "甲")!, ren = result.entries.find((item) => item.stem === "壬")!;
    expect(jia.conditions.join()).toContain("庚可制甲"); expect(jia.conditions.join()).toContain("甲可制戊");
    expect(ren.roles.map((role) => role.kind)).toContain("baseline_unfavorable");
    expect(ren.conditions.join()).toContain("壬可制丙");
  });

  it("shows actual Bing-Xin combination and control without declaring the output removed", () => {
    const result = read(combined), xinEntry = result.entries.find((item) => item.stem === "辛")!;
    expect(result.primaryPathId).toBe("resource-output");
    expect(xinEntry.interactions.map((item) => item.kind)).toEqual(expect.arrayContaining(["combination", "controlled_by"]));
    expect(xinEntry.interactions.map((item) => item.text).join()).toContain("丙");
    expect(xinEntry.conditions.join()).toContain("不由关系本身宣告合去");
  });

  it("keeps every conditional seasonal clause and source, not just the first two cautions", () => {
    const p = buildBaziPreliminaryAssessment(xin), result = buildNatalUsefulGuidance(xin, p);
    for (const clause of p.seasonal.conditionalStems) {
      expect(result.entries.find((item) => item.stem === clause.stem)!.conditions).toContain(clause.condition);
    }
    expect(result.sourceIds).toEqual(expect.arrayContaining(result.entries.flatMap((item) => item.sourceIds)));
    expect(result.paragraphs.join()).not.toContain(result.entries[0]!.judgment);
    expect(result.entries.every((item) => !item.judgment.includes("。。") && !item.judgment.includes("本日干月令专条"))).toBe(true);
  });

  it("binds the supplied diagnosis and leaves original facts and all prior axes untouched", () => {
    const p = buildBaziPreliminaryAssessment(food), diagnosis = buildNatalPatternDiagnosis(food, p), before = structuredClone({ food, p, diagnosis });
    expect(buildNatalUsefulGuidance(food, p, diagnosis)).toEqual(buildNatalUsefulGuidance(food, p));
    expect({ food, p, diagnosis }).toEqual(before);
    const wrong = structuredClone(diagnosis); wrong.sourceBinding.chartResultHash = "f".repeat(64);
    expect(() => buildNatalUsefulGuidance(food, p, wrong)).toThrow("来源不匹配");
    const wrongPreliminary = structuredClone(p); wrongPreliminary.sourceBinding.includeHour = false;
    expect(() => buildNatalUsefulGuidance(food, wrongPreliminary)).toThrow("来源不匹配");
  });

  it("excludes cached hour facts in the declared unknown-hour projection boundary", () => {
    // Projection compatibility shape only, not a newly calculated unknown birth.
    const unknown = structuredClone(xin); unknown.input.time = null; unknown.input.timePrecision = "unknown_hour";
    const result = read(unknown); expect(result.sourceBinding.includeHour).toBe(false);
    expect(JSON.stringify(result.entries)).not.toContain("时柱");
    expect(result.entries.every((entry) => entry.occurrences.every((item) => item.position !== "hour") && entry.sameElementRoots.every((item) => item.position !== "hour"))).toBe(true);
    unknown.facts.pillars.hour = structuredClone(food.facts.pillars.hour);
    expect(read(unknown)).toEqual(result);
  });
});

describe("concise useful answers derive action, companion and adjustment from existing roles", () => {
  it("keeps rooted peer conditional roles separate from a fixed favorable list or an automatic strong conclusion", async () => {
    const revision = await revisionFor("2019-12-22", "11:23", "female"), p = buildBaziPreliminaryAssessment(revision), result = read(revision);
    expect(p.balance.structural.working).toMatchObject({ focus: "rooted_peer_mixed_authority", direction: "conditional", band: "balanced", favorableElements: [], unfavorableElements: [] });
    expect(result.answer.summary).toContain("戊正官的职责标准与己七杀的急迫要求");
    expect(result.answer.summary).toContain("财能生官，也会生杀");
    expect(result.entries.find((item) => item.stem === "己")).toMatchObject({ tenGod: "七杀", presence: "exposed_rooted" });
    expect(result.entries.find((item) => item.stem === "己")!.judgment).toContain("财生杀的负担另列");
    expect(result.entries.filter((item) => ["丙", "戊", "己"].includes(item.stem)).every((item) => item.roles.some((role) => role.kind === "working_role"))).toBe(true);
    expect(result.entries.every((item) => item.roles.every((role) => role.kind !== "baseline_favorable" && role.kind !== "baseline_unfavorable"))).toBe(true);
    expect(result.balanceText).toContain("五行不列统一喜忌");
    expect(result.balanceText).not.toMatch(/相对中和|当前先取金、水|偏弱/);
    expect(result.sourceIds).toEqual(expect.arrayContaining(p.balance.structural.working.sourceIds));
    expect(result.answer.evidence.join()).toContain("rooted-peer-mixed-authority-v1");
  });

  it("uses the actual summer Bing chart's wealth and two authority actors without importing winter Gui's warming order", async () => {
    const revision = await revisionFor("1980-06-12", "10:26"), p = buildBaziPreliminaryAssessment(revision), result = read(revision);
    expect(Object.values(revision.facts.pillars).map((pillar) => pillar.ganZhi)).toEqual(["庚申", "壬午", "丙辰", "癸巳"]);
    expect(p.balance.structural.working.focus).toBe("rooted_peer_mixed_authority");
    expect(result.answer.primaryStems).toEqual(["庚"]); expect(result.answer.companionStems).toEqual(["癸", "壬"]);
    expect(result.answer.summary).toContain("癸正官的职责标准与壬七杀的急迫要求");
    expect(result.answer.headline).not.toMatch(/温通|滋扶|辛未见/);
    expect(result.answer.summary).not.toMatch(/癸日子月|丙的温通为先|当前先取/);
    expect(result.entries.every((item) => item.roles.every((role) => role.kind !== "baseline_favorable" && role.kind !== "baseline_unfavorable"))).toBe(true);
  });

  it("does not retain an hour-only official or the rooted-peer result after hour exclusion", async () => {
    const source = await revisionFor("2019-12-22", "11:23", "female");
    const unknown = structuredClone(source); unknown.input.time = null; unknown.input.timePrecision = "unknown_hour";
    const p = buildBaziPreliminaryAssessment(unknown), result = buildNatalUsefulGuidance(unknown, p);
    expect(p.balance.structural.working.focus).not.toBe("rooted_peer_mixed_authority");
    expect(result.entries.every((entry) => entry.roles.every((role) => role.kind !== "working_role"))).toBe(true);
    expect(JSON.stringify(result.entries)).not.toContain("时柱");
    expect(result.answer.summary).not.toContain("戊正官的职责标准与己七杀的急迫要求");
  });

  it("keeps Gui-Zi's verified Bing/Xin prerequisites ahead of an automatic weak-score ordering", async () => {
    const revision = await revisionFor("2019-12-22", "11:23", "female"), assessment = buildBaziPreliminaryAssessment(revision), before = structuredClone({ revision, assessment });
    const result = buildNatalUsefulGuidance(revision, assessment), bing = result.entries.find((item) => item.stem === "丙")!, xin = result.entries.find((item) => item.stem === "辛")!;
    expect(assessment.balance.band).toBe("weak"); expect(assessment.balance.supportWeight).toBe(9); expect(assessment.balance.demandWeight).toBe(13);
    expect(bing.presence).toBe("exposed_rooted"); expect(xin.presence).toBe("absent");
    expect(result.answer.headline).toContain("丙已透有根"); expect(result.answer.headline).toContain("辛未见");
    expect(result.answer.summary).toContain("调候以丙的温通为先，辛的滋扶须与丙配合");
    expect(result.answer.summary).toContain("日柱巳中丙、时柱午中丁");
    expect(result.answer.summary).toContain("当前相对旺衰工作判断为“得令有根，强弱相对均衡”");
    expect(result.answer.summary).toContain("戊正官的职责标准与己七杀的急迫要求");
    expect(result.answer.primaryStems).toEqual(["丙"]); expect(result.answer.companionStems).toEqual(["戊", "己"]);
    expect(result.answer.summary).not.toContain("先照顾金、水"); expect(result.answer.summary).not.toContain("辛已透");
    expect(result.answer.condition).toContain("不因丙已出现就宣告温通完成");
    expect(result.answer.sourceIds).toContain("preliminary-qiongtong-gui-zi");
    expect({ revision, assessment }).toEqual(before);
  });

  it("puts the current Bing and unresolved authorities before absent Xin's conditional use without changing their facts", async () => {
    const revision = await revisionFor("2019-12-22", "11:23", "female"), p = buildBaziPreliminaryAssessment(revision);
    const before = structuredClone({ revision, p }), result = buildNatalUsefulGuidance(revision, p);
    expect(result.answer.summary).toContain("时干戊（正官）与日主癸自合，本身自合不为合去");
    expect(result.answer.summary).toContain("年干己（七杀）仍需单独辨别制化");
    expect(result.answer.condition).toContain("土不作笼统增补");
    expect(result.answer.headline).toContain("温通为先");
    expect(result.answer.headline).toContain("官杀仍须取清");
    expect(result.priorities[0]).toContain("丙透在月柱");
    expect(result.priorities[0]).toContain("温通任务在先");
    expect(result.priorities[1]).toContain("戊正官与己七杀均保留");
    expect(result.priorities[2]).toContain("辛原局未见，只列条件配用候选");
    expect(result.answer.primaryStems).toEqual(["丙"]);
    expect(result.answer.companionStems).toEqual(["戊", "己"]);
    expect(result.answer.sourceIds).toEqual(expect.arrayContaining(["natal-zq-lujie-authority-clearing", "natal-zq-self-combination-not-removal"]));
    expect(result.entries.find((entry) => entry.stem === "辛")!.presence).toBe("absent");
    expect({ revision, p }).toEqual(before);
  });

  it("does not invent Bing when Xin is exposed, nor promote a hidden Bing into a visible warming actor", async () => {
    const absent = read(await revisionFor("2020-12-26", "17:26", "female")), hidden = read(await revisionFor("2020-12-16", "17:26", "female"));
    expect(absent.entries.find((item) => item.stem === "丙")!.presence).toBe("absent");
    expect(absent.entries.find((item) => item.stem === "辛")!.presence).toBe("exposed_rooted");
    expect(absent.answer.headline).toContain("丙未见"); expect(absent.answer.summary).toContain("不能仅因辛已透就认作温通配齐");
    expect(absent.answer.primaryStems).not.toContain("丙");
    expect(absent.primaryPathId).toBe("official-resource");
    expect(absent.answer.primaryStems).toEqual(["庚", "辛"]); expect(absent.answer.companionStems).toEqual(["丙"]);
    expect(absent.answer.summary).toContain("庚正印、辛偏印作为承接戊正官要求、支持日主的印星环节");
    expect(hidden.entries.find((item) => item.stem === "丙")!.presence).toBe("hidden_only");
    expect(hidden.answer.headline).toContain("丙仅藏"); expect(hidden.answer.summary).toContain("未按丙已透发挥解释");
    expect(hidden.answer.primaryStems).not.toContain("丙");
    expect(hidden.answer.primaryStems).toEqual(["庚", "辛"]);
    expect(hidden.answer.summary).toContain("承接戊正官要求、支持日主的印星环节");
  });

  it("limits the Gui-Zi ordering to its exact checked catalog rule and source", async () => {
    const revision = await revisionFor("2019-12-22", "11:23", "female"), assessment = buildBaziPreliminaryAssessment(revision);
    for (const changed of [ { ...assessment, seasonal: { ...assessment.seasonal, ruleId: "different-rule" } },
      { ...assessment, seasonal: { ...assessment.seasonal, sourceIds: [] } } ]) {
      const result = buildNatalUsefulGuidance(revision, changed);
      expect(result.answer.summary).toContain("月令比劫与别支同类本气根提供了自身承接");
      expect(result.answer.summary).not.toContain("调候以丙的温通为先");
      expect(result.answer.headline).not.toMatch(/温通|滋扶/);
    }
    expect(read(food).answer.summary).toMatch(/^当前先照顾火、土的承接，再保留辛食神/);
  });

  it("uses A's shared Ren task once, with Jia/Yi companions and no promotion of hidden output", () => {
    const result = read(xin), answer = result.answer;
    expect(answer.primaryStems).toEqual(["壬"]);
    expect(answer.companionStems).toEqual(["甲", "乙"]);
    expect(answer.summary).toContain("壬也承担本条调候考察的任务");
    expect(answer.summary).toContain("甲已透，承接产出与资源兑现");
    expect(answer.summary).toContain("甲已透，承接产出与资源兑现；另有条件调候任务");
    expect(answer.headline).toContain("甲参与资源承接与条件调候");
    expect(answer.summary).not.toContain("乙已透，作为调候");
    expect(answer.condition).toContain("土重阻水时");
    expect(answer.primaryStems).not.toContain("癸");
    expect(answer.summary).not.toContain("当前扶抑基线有冲突");
    expect(answer.sourceIds).toContain("preliminary-qiongtong-xin-shen");
    expect(result.headline).toBe(answer.headline); expect(result.verdict).toBe(answer.summary);
  });

  it("keeps B's exposed Xin output separate from hidden Bing support and Gui moisture", async () => {
    const revision = await revisionFor("1995-05-18"), answer = read(revision).answer;
    expect(answer.primaryStems).toEqual(["辛"]);
    expect(answer.companionStems).toEqual(["丙", "癸"]);
    expect(answer.summary).toContain("丙仅藏，提供印的背景，未按透印发挥");
    expect(answer.summary).toContain("丙仅藏，提供印的背景，未按透印发挥；同时作为调候考察字");
    expect(answer.headline).toContain("丙藏作印背景与调候考察");
    expect(answer.summary).toContain("癸仅藏，作为调润考察字");
    expect(answer.condition).toContain("若以后透出");
    expect(answer.condition).toContain("印食轻重");
    expect(answer.sourceIds).toContain("preliminary-qiongtong-ji-si");
    expect(answer.evidence.join()).toContain("辛/pattern/path_key");
  });

  it("gives unrooted Ding an explicit task but never ranks hidden Xin killing as an added benefit", async () => {
    const answer = read(await revisionFor("1995-09-21", "02:26")).answer;
    expect(answer.primaryStems).toEqual(["丁"]);
    expect(answer.companionStems).not.toContain("辛");
    expect(answer.summary).toContain("调节月令辛七杀压力");
    expect(answer.summary).toContain("月令辛仍藏");
    expect(answer.condition).toContain("丁虽透，所选地支未见同五行藏根");
    expect(answer.sourceIds).toContain("outlook-zq-killing-month-example");
  });

  it("states the weak chart's carrying priority without deleting Xin's existing food task", () => {
    const answer = read(food).answer;
    expect(answer.primaryStems).toEqual(["辛"]);
    expect(answer.companionStems).toEqual(["丙"]);
    expect(answer.summary).toMatch(/^当前先照顾火、土的承接，再保留辛食神/);
    expect(answer.summary).toContain("调节乙七杀压力");
    expect(answer.summary).toContain("丙仅藏");
    expect(answer.condition).toContain("不等于继续增加泄耗");
  });

  it("puts an actual Bing-Xin tie into the answer condition without declaring Xin erased", () => {
    const answer = read(combined).answer;
    expect(answer.primaryStems).toContain("辛");
    expect(answer.condition).toContain("相合");
    expect(answer.condition).toContain("不把相合或受克直接判成该字失效");
    expect(answer.evidence.join()).toContain("he_gan_5:丙辛");
  });

  it("does not retain an hour-only action or promote an absent seasonal word when the hour is unknown", async () => {
    const revision = await revisionFor("1995-09-21", "02:26");
    revision.input.time = null; revision.input.timePrecision = "unknown_hour";
    const result = read(revision);
    expect(result.answer.primaryStems).toEqual([]);
    expect(result.answer.headline).toContain("月令背景辛");
    expect(result.answer.summary).not.toContain("丁食神");
    expect(result.answer.primaryStems).not.toContain("丙");
    expect(result.answer.sourceIds).not.toContain("outlook-zq-killing-month-example");
    expect(JSON.stringify(result.answer)).not.toContain("时柱");
  });

  it("binds every answer stem and source to existing entries while preserving all inputs", () => {
    const preliminary = buildBaziPreliminaryAssessment(xin), diagnosis = buildNatalPatternDiagnosis(xin, preliminary);
    const before = structuredClone({ xin, preliminary, diagnosis });
    const result = buildNatalUsefulGuidance(xin, preliminary, diagnosis);
    expect({ xin, preliminary, diagnosis }).toEqual(before);
    for (const stem of [...result.answer.primaryStems, ...result.answer.companionStems]) expect(result.entries.some((entry) => entry.stem === stem)).toBe(true);
    expect(result.sourceIds).toEqual(expect.arrayContaining(result.answer.sourceIds));
    for (const entry of result.entries) {
      expect(entry.roles.length).toBeGreaterThan(0);
      expect(entry.conditions.length).toBeGreaterThan(0);
      expect(entry.presenceText).not.toBe("");
    }
  });
});
