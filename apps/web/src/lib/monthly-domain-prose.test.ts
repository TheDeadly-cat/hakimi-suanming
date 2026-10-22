import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalMonthlyOutlook, type LocalMonthlyOutlook, type LocalMonthlyPeriod } from "./local-detailed-outlook";
import { buildLocalReadingAgeContext } from "./local-reading-age-context";
import { buildMonthlyDomainProse, MONTHLY_DOMAIN_PROSE_VERSION, type MonthlyDomainProseInput } from "./monthly-domain-prose";

async function fixture(date: string, sex: "male" | "female" | "unspecified" = "male", time = "08:26") {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex,
    lunarLeapMonth: false, location: { label: "Synthetic monthly prose", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111", caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
  return { revision, assessment: buildBaziPreliminaryAssessment(revision) };
}
let a: Awaited<ReturnType<typeof fixture>>, b: Awaited<ReturnType<typeof fixture>>, u: Awaited<ReturnType<typeof fixture>>;
let am: LocalMonthlyOutlook, bm: LocalMonthlyOutlook, um: LocalMonthlyOutlook, child: LocalMonthlyOutlook, early: LocalMonthlyOutlook;
beforeAll(async () => {
  [a, b, u] = await Promise.all([fixture("1995-08-18"), fixture("1995-05-18"), fixture("1995-08-18", "unspecified")]);
  [am, bm, um, child, early] = await Promise.all([buildLocalMonthlyOutlook(a.revision, a.assessment, 2032), buildLocalMonthlyOutlook(b.revision, b.assessment, 2032),
    buildLocalMonthlyOutlook(u.revision, u.assessment, 2028), buildLocalMonthlyOutlook(b.revision, b.assessment, 2005), buildLocalMonthlyOutlook(a.revision, a.assessment, 1998)]);
});
function input(f: typeof a, outlook: LocalMonthlyOutlook, month: LocalMonthlyPeriod, branchIndex = 0, segmentIndex = 0): MonthlyDomainProseInput {
  const branch = month.branches[branchIndex]!, judgment = branch.judgmentSegments[segmentIndex]!.judgment;
  return { ...f, month, yearGanZhi: outlook.yearGanZhi, judgment,
    age: buildLocalReadingAgeContext(f.revision.timeCalibration.utcInstant, judgment.interval.startInstant, judgment.interval.endExclusiveInstant),
    backgroundDayunLabels: branch.segments.filter((item) => judgment.backgroundRefs.some((ref) => ref.nodeType === "dayun" && ref.nodeId === item.nodeRef.nodeId)).map((item) => `${item.ganZhi}大运`) };
}
const prose = (f: typeof a, outlook: LocalMonthlyOutlook, n: number) => buildMonthlyDomainProse(input(f, outlook, outlook.months[n]!));

describe("month-specific life prose from exact segmented actors", () => {
  it("adds conditional adult situations from the actual supporting hidden actor without changing the judgment or relationships", () => {
    const source = input(b, bm, bm.months.find((month) => month.ganZhi === "戊申")!);
    const before = JSON.stringify(source);
    const unknownWork = buildMonthlyDomainProse(source);
    const retired = buildMonthlyDomainProse({ ...source, appliedWork: "retired" });
    for (const index of [0, 1]) {
      const next = unknownWork[index]!, prior = retired[index]!;
      expect(next.examples.slice(0, prior.examples.length)).toEqual(prior.examples);
      const added = next.examples.slice(prior.examples.length);
      expect(added.length).toBeGreaterThanOrEqual(2);
      expect(added.join("\n")).toContain("伤官这一项：若在职");
      expect(added.every((line) => line.includes("：若"))).toBe(true);
      expect(added.join("\n")).not.toMatch(/你已在职|已经录用|保证收入|必定/u);
      expect(next.summary).toBe(prior.summary);
      expect(next.opportunities).toEqual(prior.opportunities);
      expect(next.obstacles).toEqual(prior.obstacles);
    }
    expect(unknownWork[2]).toEqual(retired[2]);
    expect(JSON.stringify(source)).toBe(before);
  });

  it("B2032 adjacent months distinguish acceptance, new choices and responsibility in both work and resources", () => {
    const before = JSON.stringify({ b, bm }), results = [0, 1, 2].map((n) => prose(b, bm, n));
    expect(bm.months.slice(0, 3).map((month) => month.ganZhi)).toEqual(["壬寅", "癸卯", "甲辰"]);
    expect(results[0]![0]!.headline).toContain("已有成果");
    expect(results[1]![0]!.headline).toContain("不同使用方式");
    expect(results[2]![0]!.headline).toContain("已答应事项");
    expect(results[0]![1]!.headline).toContain("已有投入");
    expect(new Set(results.map((items) => items[0]!.summary)).size).toBe(3);
    expect(new Set(results.map((items) => items[1]!.examples.join())).size).toBe(3);
    for (const items of results) {
      expect(items[0]!.paragraphs).not.toEqual(items[1]!.paragraphs);
      expect(items[0]!.evidence.join()).toContain(MONTHLY_DOMAIN_PROSE_VERSION);
    }
    expect(JSON.stringify({ b, bm })).toBe(before);
  });
  it("the same Gui-Mao month has different natal roles and a day-branch clash only for B", () => {
    const left = prose(a, am, 1), right = prose(b, bm, 1);
    expect(left[0]!.evidence.join()).toContain("癸食神"); expect(right[0]!.evidence.join()).toContain("癸偏财");
    expect(left[0]!.headline).not.toBe(right[0]!.headline);
    expect(right[2]!.summary).toContain("日支有六冲");
    expect(left[2]!.summary).toContain("本月关系主题是");
    expect(left[2]!.conditions.join()).toContain("未检出覆盖范围内的日干日支直接二元合冲");
    expect(left[2]!.summary).not.toContain("日支有六冲");
    expect(right[2]!.evidence.join()).toContain("本命日柱己酉有地支六冲");
  });
  it("never reclassifies the verified month actor from a differently formatted evidence sentence", () => {
    const source = input(b, bm, bm.months[0]!), original = buildMonthlyDomainProse(source), changed = structuredClone(source);
    const pattern = changed.judgment.axes.find((axis) => axis.axis === "pattern")!;
    expect(pattern.evidence.some((line) => line.startsWith("节令月壬寅透壬（正财）") && line.endsWith("支持此路径分支。"))).toBe(true);
    pattern.evidence = pattern.evidence.map((line) => line.startsWith("节令月壬寅透壬（正财）") ? line.replace("节令月壬寅透壬", "流年壬子透壬") : line);
    expect(original[0]!.evidence.join()).toContain("原段列为结构支持");
    expect(buildMonthlyDomainProse(changed)[0]!.summary).toBe(original[0]!.summary);
  });
  it("keeps month-stem pressure distinct from hidden support and preserves the original concrete constraints", () => {
    const actual = input(a, am, am.months[2]!);
    expect(actual.month.ganZhi).toBe("甲辰");
    const original = actual.judgment.axes.find((axis) => axis.axis === "pattern")!.evidence;
    expect(original).toContain("节令月甲辰透甲（正财）作为透干作用：对该分支增加阻碍或负荷。");
    expect(original).toContain("节令月甲辰藏戊（正印）只作为支内本气承接，未当成透干：支持此路径分支。");
    const result = buildMonthlyDomainProse(actual);
    expect(result[0]!.evidence.join()).toContain("原段列为结构牵制或负荷");
    expect(result[0]!.evidence.join()).toContain("原段列为结构支持");
    expect(result[0]!.summary).toContain("牵制"); expect(result[0]!.summary).toContain("已有解释与帮助进入实际使用");
    expect(result[0]!.obstacles.length).toBeGreaterThan(0);
    expect(result[0]!.conditions).toEqual(expect.arrayContaining(actual.judgment.axes.flatMap((axis) => [...axis.blockers, ...axis.rescues, ...axis.unresolvedConditions])));
    const directSource=input(a,am,am.months.find(month=>month.ganZhi==="戊申")!),indirectSource=input(a,am,am.months.find(month=>month.ganZhi==="己酉")!);
    expect(directSource.judgment.axes.find(axis=>axis.axis==="pattern")!.stemActions!.items[0]).toMatchObject({tenGod:"正印",effect:"assists"});
    expect(indirectSource.judgment.axes.find(axis=>axis.axis==="pattern")!.stemActions!.items[0]).toMatchObject({tenGod:"偏印",effect:"assists"});
    const direct=buildMonthlyDomainProse(directSource),indirect=buildMonthlyDomainProse(indirectSource);
    for(const index of [0,1])expect(indirect[index]!.examples[0]).not.toBe(direct[index]!.examples[0]);
    expect(direct[0]!.examples[0]).toContain("说明或示范");expect(indirect[0]!.examples[0]).toContain("不同的解释或小范围尝试");
    expect(direct[1]!.examples[0]).toContain("已有的一件用品");expect(indirect[1]!.examples[0]).toContain("专项工具或替代材料");
  });
  it("retains unknown-sex handover segments without relabeling their old background as a monthly arrival", () => {
    const month = um.months.find((item) => item.branches.some((branch) => branch.judgmentSegments.length === 2))!;
    expect(month).toBeTruthy();
    const before = JSON.stringify({ u, month });
    const results = month.branches.flatMap((branch, branchIndex) => branch.judgmentSegments.map((_, segmentIndex) => {
      const source = input(u, um, month, branchIndex, segmentIndex), readings = buildMonthlyDomainProse(source);
      expect(readings[0]!.conditions).toEqual(expect.arrayContaining(source.judgment.conditions));
      expect(readings[0]!.evidence.join()).toContain(source.judgment.interval.startInstant);
      expect(readings[0]!.evidence.join()).toContain(source.judgment.interval.endExclusiveInstant);
      for (const label of source.backgroundDayunLabels) expect(readings[0]!.paragraphs.join()).toContain(label);
      expect(readings[0]!.conditions.join()).toContain("不当作本月又新增一次");
      expect(readings[0]!.paragraphs.join()).not.toContain("不当作本月又新增一次");
      return readings;
    }));
    expect(results).toHaveLength(3); expect(JSON.stringify({ u, month })).toBe(before);
  });
  it("uses school and materials for children and keeps a year-only pre-luck background intact", () => {
    const result = prose(b, child, 0), main = result.flatMap((item) => [item.headline, item.summary, ...item.paragraphs, ...item.examples]).join();
    expect(main).toContain("活动"); expect(main).toContain("材料");
    expect(main).not.toMatch(/薪酬|客户|结算|面谈|婚姻|婚恋/);
    const source = input(a, early, early.months[0]!);
    expect(source.judgment.backgroundRefs.some((ref) => ref.nodeType === "year")).toBe(true);
    expect(source.backgroundDayunLabels).toEqual([]);
    const before = JSON.stringify(source), yearOnly = buildMonthlyDomainProse(source);
    expect(yearOnly[0]!.paragraphs.join()).toContain("未绑定大运");
    expect(JSON.stringify(source)).toBe(before);
  });

  it("uses typed actions rather than Chinese direction suffixes and rejects missing, crossed or malformed action references", () => {
    const source = input(b, bm, bm.months[0]!), before = buildMonthlyDomainProse(source), changed = structuredClone(source);
    const axis = changed.judgment.axes.find((item) => item.axis === "pattern")!;
    axis.evidence = axis.evidence.map((line) => line.replace("支持此路径分支。", "同一对象的说明格式已调整。"));
    expect(buildMonthlyDomainProse(changed)[0]!.summary).toBe(before[0]!.summary);
    const changes = [
      (value: typeof axis) => { delete value.stemActions; },
      (value: typeof axis) => { value.stemActions!.items[0]!.stem = "丁"; },
      (value: typeof axis) => { value.stemActions!.items[1]!.visibility = "visible"; },
      (value: typeof axis) => { value.stemActions!.items[0]!.evidenceIndexes = [-1]; },
      (value: typeof axis) => { value.stemActions!.items[0]!.evidenceIndexes = [value.evidence.length]; },
      (value: typeof axis) => { const n = value.stemActions!.items[0]!.evidenceIndexes[0]!; value.stemActions!.items[0]!.evidenceIndexes = [n,n]; },
      (value: typeof axis) => { value.stemActions!.items[0]!.summaryBasis = undefined as never; },
    ];
    for (const mutate of changes) { const bad = structuredClone(source); mutate(bad.judgment.axes.find((item) => item.axis === "pattern")!); expect(() => buildMonthlyDomainProse(bad)).toThrow(); }
  });

  it("keeps neutral month stems neutral while the four B months expose their own supporting or obstructing hidden roles", () => {
    const rows = [
      ["甲辰", "正官", "劫财", "neutral"], ["乙巳", "七杀", "正印", "obstructs"],
      ["戊申", "劫财", "伤官", "assists"], ["己酉", "比肩", "食神", "assists"],
    ] as const;
    const results = rows.map(([ganZhi, god, hiddenGod, effect]) => {
      const month = bm.months.find((item) => item.ganZhi === ganZhi)!, source = input(b,bm,month), pattern = source.judgment.axes.find((item) => item.axis === "pattern")!;
      expect(pattern.stemActions!.items[0]).toMatchObject({tenGod:god,effect:"neutral"}); expect(pattern.stemActions!.items[1]).toMatchObject({tenGod:hiddenGod,effect});
      const result = buildMonthlyDomainProse(source);
      for(const domain of result.slice(0,2)) {
        if(effect !== "assists") expect(domain.opportunities).toEqual([]);
        if(effect === "neutral") { expect(domain.obstacles.filter(line=>!line.startsWith("原扶抑"))).toEqual([]); expect(domain.summary).not.toMatch(/较能发挥|容易遇到的牵制/u); }
        expect(domain.evidence.join()).toContain(`月干 neutral、支本气 ${effect}`);
        expect([domain.summary,...domain.examples.slice(0, 2)].join()).not.toMatch(/工资|客户|岗位|验收|培训|薪酬/u);
        expect(domain.examples.slice(2).every((example) => example.includes("：若"))).toBe(true);
      }
      return result;
    });
    expect(new Set(results.map(row=>row[0]!.summary)).size).toBe(4);expect(new Set(results.map(row=>row[1]!.summary)).size).toBe(4);
    expect(results[1]![0]!.summary).toContain("继续补说明");expect(results[2]![0]!.summary).toContain("具体改法");expect(results[3]![0]!.summary).toContain("熟悉的方法");
  });

  it("distinguishes increased output load, a real Ding-Ren print tie, and real collisions with authority instead of inferring targets from the path", async () => {
    const wealth = await fixture("1957-09-13","male","00:26"), official = await fixture("1944-08-09","male","04:26"), young = await fixture("2019-12-22","female","11:23");
    const [wm, om, ym] = await Promise.all([buildLocalMonthlyOutlook(wealth.revision,wealth.assessment,2032),buildLocalMonthlyOutlook(official.revision,official.assessment,2026),buildLocalMonthlyOutlook(young.revision,young.assessment,2029)]);
    const load=buildMonthlyDomainProse(input(wealth,wm,wm.months.find(m=>m.ganZhi==="庚戌")!));
    expect(load[0]!.summary).toContain("继续做或说的部分超过当前支持");expect(load[0]!.summary).not.toContain("额外准备");
    const tie=buildMonthlyDomainProse(input(official,om,om.months.find(m=>m.ganZhi==="丁酉")!));
    expect(tie[0]!.summary).toContain("原有指导、理解或帮助");expect(tie[0]!.summary).not.toContain("原先约定的要求对不上");expect(tie[0]!.evidence.join()).toContain("丁壬天干五合");
    for(const ganZhi of ["甲戌","乙亥"]) { const source=input(young,ym,ym.months.find(m=>m.ganZhi===ganZhi)!), result=buildMonthlyDomainProse(source);
      expect(result[0]!.summary).toContain("原先约定的要求");expect(result[1]!.summary).toContain("履行原");
      if(ganZhi==="甲戌") expect(result[0]!.summary).toContain("相互牵动"); else expect(result[0]!.summary).toContain("对不上");
      expect(result[0]!.evidence.join()).toContain("可克关键"); expect([result[0]!.summary,...result[0]!.examples].join()).not.toMatch(/工作|客户|岗位|婚姻/u);
    }
    const tiedWealth=buildMonthlyDomainProse(input(young,ym,ym.months.find(m=>m.ganZhi==="辛未")!));
    expect(tiedWealth[0]!.summary).toContain("已经投入的时间与可用条件");expect(tiedWealth[0]!.summary).not.toContain("方法来回切换");
  });

  it("keeps both age phases inside each actor example and leaves an unknown age in ordinary life rather than assuming school", async () => {
    const f=await fixture("2019-12-22","female","11:23"), m=await buildLocalMonthlyOutlook(f.revision,f.assessment,2025);
    const month=m.months.find(item=>item.label==="大雪月")!, source=input(f,m,month), result=buildMonthlyDomainProse(source);
    expect(source.age.segments.map(item=>item.startAge)).toEqual([5,6]);
    for(const domain of result.slice(0,2)) for(const example of domain.examples) {expect(example).toContain("5周岁段");expect(example).toContain("6周岁段");expect(example).toContain("熟悉游戏");expect(example).toContain("小练习");}
    const projected=structuredClone(input(b,bm,bm.months[0]!));projected.revision.timeCalibration.utcInstant=null;
    projected.age=buildLocalReadingAgeContext(null,projected.judgment.interval.startInstant,projected.judgment.interval.endExclusiveInstant);
    const neutral=buildMonthlyDomainProse(projected);
    expect(neutral.slice(0,2).flatMap(d=>[d.summary,...d.paragraphs,...d.examples]).join()).not.toMatch(/老师|家长|在校|同学|入学/u);
  });

  it("keeps the actual R4 unresolved wealth task as a question of selecting support, and does not turn an unresolved print into a benefit", async () => {
    const r4=await fixture("1999-01-09","male","02:26"), rm=await buildLocalMonthlyOutlook(r4.revision,r4.assessment,2034);
    let unresolved=0;
    for(const month of rm.months) for(const [bi,branch] of month.branches.entries()) for(const [si] of branch.judgmentSegments.entries()) {
      const source=input(r4,rm,month,bi,si), actor=source.judgment.axes.find(a=>a.axis==="pattern")!.stemActions!.items[0]!;
      if(["正财","偏财"].includes(actor.tenGod)) {
        expect(actor.effect).toBe("unresolved");unresolved++;const result=buildMonthlyDomainProse(source);
        expect(result[0]!.summary).toContain("已有准备与实际完成的取舍");expect(result[1]!.summary).toContain("必要与重复部分");
        for(const domain of result.slice(0,2)) {expect(domain.opportunities).toEqual([]);expect(domain.summary).not.toContain("较能发挥");}
        expect(result.slice(0,2).flatMap(d=>[d.summary,...d.examples]).join()).not.toMatch(/工资|结算|回款/u);
      }
    }
    expect(unresolved).toBe(2);
    const supportedMonths=await buildLocalMonthlyOutlook(r4.revision,r4.assessment,2028), supportInput=input(r4,supportedMonths,supportedMonths.months.find(month=>month.ganZhi==="乙卯")!);
    expect(supportInput.judgment.axes.find(axis=>axis.axis==="pattern")!.stemActions!.items[0]).toMatchObject({stem:"乙",tenGod:"偏财",effect:"assists",summaryBasis:true});
    const supported=buildMonthlyDomainProse(supportInput);
    const supportAxis=supportInput.judgment.axes.find(axis=>axis.axis==="pattern")!, supportActor=supportAxis.stemActions!.items[0]!;
    expect(supportActor.evidenceIndexes).toEqual([]);expect(supportActor.satisfiedConditionIndexes.length).toBeGreaterThan(0);
    for(const index of supportActor.satisfiedConditionIndexes) for(const domain of supported.slice(0,2)) expect(domain.evidence).toContain(supportAxis.satisfiedConditions[index]);
    expect(supported[0]!.summary).toContain("已有准备得到取舍");expect(supported[1]!.summary).toContain("用途重复的投入得到区分");
    expect(supported[0]!.opportunities).toContain("已有准备得到取舍，真正用得上的方法能够留出实际完成的空间");
    expect(supported.slice(0,2).flatMap(domain=>[domain.summary,...domain.examples]).join()).not.toMatch(/工资|结算|回款/u);
    const heavy=await fixture("1957-09-13","male","00:26"), hm=await buildLocalMonthlyOutlook(heavy.revision,heavy.assessment,2032), source=input(heavy,hm,hm.months.find(m=>m.ganZhi==="丁未")!);
    expect(source.judgment.axes.find(a=>a.axis==="pattern")!.stemActions!.items[0]).toMatchObject({tenGod:"正印",effect:"unresolved"});
    const result=buildMonthlyDomainProse(source);expect(result[0]!.headline).toContain("衔接");expect(result[0]!.summary).toContain("具体题目");expect(result[0]!.opportunities).toEqual([]);
    expect(result[0]!.headline).not.toContain("开始用起来");
    expect(result[0]!.examples[0]).toContain("到了实际使用环节");expect(result[1]!.examples[0]).toContain("还缺配套");
    expect(result.slice(0,2).flatMap(d=>d.examples).join()).not.toMatch(/拿已有|把一件已有用品/u);
    const indirect=prose(b,bm,4),direct=prose(b,bm,3);
    expect(bm.months[4]!.ganZhi).toBe("丙午");expect(indirect[0]!.summary).toContain("方法来回切换");
    expect(indirect[0]!.examples[1]).toContain("旧进度先停下来");expect(indirect[1]!.examples[1]).toContain("两头准备");
    expect(indirect[0]!.examples[1]).not.toBe(direct[0]!.examples[1]);
  });
});
