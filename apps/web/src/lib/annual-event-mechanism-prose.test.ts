import { beforeAll, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlook, buildLocalAnnualOutlookRange } from "./local-annual-outlook";
import { createAnnualEventSignalBuilder } from "./annual-event-signals";
import { buildLocalReadingAgeContext } from "./local-reading-age-context";
import { buildAnnualEventReadingProse, type AnnualEventReadingProseInput } from "./annual-event-reading-prose";

const inputs = new Map<string, AnnualEventReadingProseInput>();
beforeAll(async () => {
  for (const [id, date, time, years] of [
    ["r4", "1999-01-09", "02:26", [2028, 2030, 2035]], ["food", "1991-02-08", "02:26", [2026]],
    ["official", "1995-03-18", "08:26", [2026]], ["a", "1995-08-18", "08:26", [2028, 2031, 2032]],
    ["b", "1995-05-18", "08:26", [2028, 2030, 2032]], ["child", "2018-11-19", "14:26", [2032]],
    ["r3-child", "2019-12-22", "11:23", [2025, 2026, 2027, 2029, 2030, 2032, 2035, 2037]],
    ["resource-first", "1957-09-13", "00:26", [1963, 1975, 2027, 2030, 2032]],
    ["wealth-first", "1982-10-02", "10:26", [2026, 2032]],
    ["official-joint", "1944-08-09", "04:26", [2028]],
  ] as const) {
    const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: id === "r3-child" ? "female" : "male", lunarLeapMonth: false,
      location: { label: "Synthetic mechanism prose", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
    const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
    const assessment = buildBaziPreliminaryAssessment(revision), annual = await buildLocalAnnualOutlook(revision, assessment, Math.min(...years)), signals = createAnnualEventSignalBuilder(revision, assessment);
    const extraYears = await Promise.all(years.filter((year) => year > annual.endYear).map((year) => buildLocalAnnualOutlookRange(revision, assessment, year, year)));
    for (const year of [...annual.years, ...extraYears.flatMap((outlook) => outlook.years)].filter((year) => (years as readonly number[]).includes(year.year))) {
      const segment = year.judgmentSegments[0]!, derived = signals(year, segment), god = derived.targetAction.tenGod;
      const kind = ["正印", "偏印"].includes(god) ? "study" : god === "伤官" ? "proposal" : god === "食神" ? "delivery" : god === "正财" ? "settlement" : god === "偏财" ? "new_collaboration" : "work_change";
      inputs.set(`${id}/${year.year}`, { ...derived, kind, domain: "career", god, path: derived.patternContext.pathId, effect: derived.targetAction.effect, patternEffect: derived.patternContext.effect,
        age: buildLocalReadingAgeContext(revision.timeCalibration.utcInstant, segment.startInstant, segment.endExclusiveInstant),
        hasMonthBranchClash: false, hasMonthBranchCombination: false, hasDayBranchClash: false, hasDayBranchCombination: false, hasDayStemInteraction: false, appliedWork: null, appliedRelationship: null });
    }
  }
});
const input = (key: string) => structuredClone(inputs.get(key)!);

it("gives the three actual print years different progress, obstruction and support answers", () => {
  const values = [input("r4/2028"), input("food/2026"), input("official/2026")];
  const outputs = values.map(buildAnnualEventReadingProse);
  expect(new Set(outputs.map((item) => item.title)).size).toBe(3);
  expect(new Set(outputs.map((item) => item.summary)).size).toBe(3);
  expect(new Set(outputs.map((item) => item.examples[0])).size).toBe(3);
  expect(outputs[0]!.summary).toContain("准备、材料或方法继续加层");
  expect(outputs[1]!.summary).toContain("原解决步骤受到牵动");
  expect(outputs[2]!.summary).toContain("得到可依循的办法");
  for (let i = 0; i < values.length; i++) {
    expect(outputs[i]!.reasoning).toContain(values[i]!.patternContext!.summary);
    expect(outputs[i]!.summary).not.toContain(values[i]!.patternContext!.summary);
    for (const condition of values[i]!.patternContext!.unresolvedConditions) expect(outputs[i]!.reasoning).toContain(condition);
    expect(outputs[i]!.summary).not.toContain("模型边界：");
    expect(outputs[i]!.examples).toHaveLength(2);
  }
});

it("separates career progress from resource use while keeping the exact same actor and source constraints", () => {
  for (const key of ["r4/2028", "food/2026", "official/2026", "b/2030", "b/2032"]) {
    const value = input(key), original = structuredClone(value);
    const career = buildAnnualEventReadingProse(value), resources = buildAnnualEventReadingProse({ ...value, domain: "wealth" });
    expect(career.summary).not.toBe(resources.summary);
    expect(career.examples).not.toEqual(resources.examples);
    expect(resources.reasoning).toContain(value.patternContext!.summary);
    expect(value).toEqual(original);
  }
});

it("describes A2028's resource actor as preparation constraining output, not a peer allocation conflict", () => {
  const value = input("a/2028"); expect(value.god).toBe("正印"); expect(value.effect).toBe("obstructs");
  const result = buildAnnualEventReadingProse(value);
  expect(result.summary).toContain("新的准备、依据或指导占用实际呈现的时间");
  expect(result.summary).not.toContain("主导权、成果归属或投入分配发生拉扯");
  expect(result.examples.join()).toContain("原配合存在具体牵连");
  expect(result.examples.every(example=>example.startsWith("若"))).toBe(true);
  for (const rescue of value.patternContext!.rescues) expect(result.reasoning).toContain(rescue);
  expect(result.summary).toContain("转机");
});

it("keeps R4's obstructing print actor separate from the existing wealth rescue and supports the actual later wealth actor", () => {
  const print = input("r4/2028"), wealth = input("r4/2035");
  expect(print.effect).toBe("obstructs"); expect(print.patternEffect).toBe("mixed");
  expect(wealth.effect).toBe("assists");
  const first = buildAnnualEventReadingProse(print), later = buildAnnualEventReadingProse(wealth);
  for (const rescue of print.patternContext!.rescues) expect(first.reasoning).toContain(rescue);
  expect(first.summary).toContain("这还取决于用途能否落实");
  expect(later.summary).toContain("较有条件收拢到一个明确用途");
  expect(first.summary).not.toBe(later.summary);
  expect(first.examples).not.toEqual(later.examples);
});

it("retains A2031's actual named rescue and does not lend B2028's hidden assistance to its neutral visible stem", () => {
  const a = input("a/2031"), b = input("b/2028");
  expect(a.patternContext!.rescues.length).toBeGreaterThan(0);
  for (const rescue of a.patternContext!.rescues) expect(buildAnnualEventReadingProse(a).reasoning).toContain(rescue);
  const aText = buildAnnualEventReadingProse(a).summary;
  expect(aText).not.toMatch(/0\.8|1\.0|1\.2|模型边界/);
  expect(aText).toContain("可承担范围，现有判断仍有分歧");
  expect(b.effect).toBe("neutral"); expect(b.mainQiAction!.effect).toBe("assists");
  const text = buildAnnualEventReadingProse(b).summary;
  expect(text).toContain("仅凭这条线索，还不能判断进展是否顺利");
  expect(buildAnnualEventReadingProse(b).reasoning!.join()).toContain("后者另有支持线索，不能借此把透干主题改写成全年顺利");
});

it("keeps explicitly employed proposal and settlement observable examples distinct within the same path", () => {
  const proposal = buildAnnualEventReadingProse({ ...input("b/2030"), appliedWork: "employed" }), settlement = buildAnnualEventReadingProse({ ...input("b/2032"), appliedWork: "employed" });
  expect(proposal.title).toBe("提出改法并做一次实际试点");
  expect(settlement.title).toBe("已有项目验收、结算或续约");
  expect(proposal.title).not.toBe(settlement.title);
  expect(proposal.examples[0]).toContain("演示或试用");
  expect(settlement.examples[0]).toContain("完成确认");
  expect(proposal.examples[0]).not.toBe(settlement.examples[0]);
  expect(proposal.summary).toContain("流程改法、内部提案或小范围试点");
  expect(settlement.summary).toContain("已完成工作的验收、报销或待遇约定");
  expect(settlement.summary).not.toContain("准备较有条件离开资料");
  expect(settlement.summary).not.toContain("形成已有成果的验收");
  const resources = buildAnnualEventReadingProse({ ...input("b/2032"), domain: "wealth", appliedWork: "employed" });
  expect(resources.summary).toContain("已投入的时间、材料或费用较有条件随成果一并确认");
  expect(resources.summary).toContain("继续使用与后续维护");
  expect(resources.summary).not.toContain("过去投入不再只停在准备阶段");
});

it("uses the same actual obstructing mechanism in youth, young-child and unknown contexts without adult work assumptions", () => {
  const child = input("child/2032");
  expect(child.age.stage).toBe("youth"); expect(child.effect).toBe("obstructs");
  for (const stage of ["youth", "young_child", "unknown"] as const) {
    const current = { ...child, age: { ...child.age, stage }, appliedWork: "self_employed" as const };
    const output = buildAnnualEventReadingProse(current), text = [output.title, output.summary, ...output.examples].join();
    expect(output.summary).toContain("准备、材料或方法继续加层");
    expect(output.reasoning).toContain(child.patternContext!.summary);
    expect(text).not.toMatch(/岗位|客户|录用|收入增加|回款/);
    if (stage === "unknown") expect(text).not.toMatch(/孩子|照料者|课程/);
  }
});

it.each(["student", "caregiving", "retired"] as const)("keeps the %s background concrete without borrowing office examples", (work) => {
  const output = buildAnnualEventReadingProse({ ...input("r4/2028"), appliedWork: work });
  const text = [output.title, output.summary, ...output.examples].join();
  expect(text).toContain(work === "student" ? "课程、课题" : work === "caregiving" ? "照料日程" : "自愿活动");
  expect(text).not.toMatch(/客户|岗位|合同|回款|录用/);
});

it("rejects a changed actor identity or substituted aggregate effect and leaves the input untouched", () => {
  const value = input("r4/2028"), original = structuredClone(value);
  buildAnnualEventReadingProse(value); expect(value).toEqual(original);
  expect(() => buildAnnualEventReadingProse({ ...value, effect: value.patternEffect })).toThrow("作用来源");
  const forged = structuredClone(value); forged.targetAction!.stem = "甲";
  expect(() => buildAnnualEventReadingProse(forged)).toThrow("作用来源");
});

it("does not change relationship prose when unrelated mechanism fields are attached", () => {
  const value = input("r4/2028"), relationship: AnnualEventReadingProseInput = { ...value, kind: "shared_arrangements", domain: "relationship", hasDayBranchCombination: true, appliedRelationship: "married" };
  const plain = structuredClone(relationship); delete plain.patternContext; delete plain.targetAction; delete plain.mainQiAction;
  expect(buildAnnualEventReadingProse(relationship)).toEqual(buildAnnualEventReadingProse(plain));
});

it("gives the actual R3 child's concentrated requirements and new guidance different topics without adult or college assumptions", () => {
  const authority = input("r3-child/2029"), resource = input("r3-child/2030"), settlement = input("r3-child/2026");
  expect(authority.god).toBe("七杀"); expect(resource.god).toBe("正印");
  const first = buildAnnualEventReadingProse(authority), second = buildAnnualEventReadingProse(resource);
  expect(first.title).not.toBe(second.title);
  expect(first.summary).toContain("几项要求或活动靠在一起");
  expect(first.summary).not.toContain("原段对该透干");
  expect(first.summary).toContain("需要承担的要求增加");
  expect(first.reasoning).toContain("原段对该透干保留配合上的牵制，要求与实际可承担范围是本项需要核对的限制。");
  expect(second.summary).toContain("阅读、画画、手工或一种新的练习方法");
  expect(second.summary).toContain("暂不单独预判顺利或吃力");
  for (const value of [authority, resource, settlement]) {
    const text = buildAnnualEventReadingProse({ ...value, appliedWork: "self_employed" });
    expect([text.title, text.summary, ...text.examples].join()).not.toMatch(/客户|回款|岗位|待遇|学分|录用/);
    expect(text.reasoning).toContain(value.patternContext!.summary);
  }
});

it.each([
  ["employed", "岗位培训"], ["seeking_work", "目标岗位"], ["self_employed", "专业进修"],
  ["student", "课程练习"], ["caregiving", "照料方法"], ["retired", "兴趣课程"]
] as const)("keeps the %s self-report's concrete preparation in the first statement", (work, phrase) => {
  const value = input("a/2028"), result = buildAnnualEventReadingProse({ ...value, appliedWork: work });
  expect(result.summary.split("。")[0]).toContain(phrase);
  expect(result.summary).toContain("占用实际呈现的时间");
  expect(result.summary).not.toContain("本段的具体作用：");
  expect(result.summary).not.toContain(value.patternContext!.summary);
  if (work === "student" || work === "caregiving" || work === "retired") expect(result.summary).not.toMatch(/岗位|客户|回款|待遇/);
});

it("keeps actual overall friction in life language when the visible action itself assists", () => {
  const value = input("a/2032");
  expect(value.effect).toBe("assists"); expect(value.patternEffect).toBe("mixed");
  const result = buildAnnualEventReadingProse(value);
  expect(result.summary).toContain("本项虽有推进条件");
  expect(result.summary).toContain("另一层牵制");
  expect(result.reasoning).toContain(value.patternContext!.summary);
  for (const condition of value.patternContext!.unresolvedConditions) expect(result.reasoning).toContain(condition);
});

it("uses both actual age segments in R3's five-to-six-year delivery without report or office maintenance language", () => {
  const value = input("r3-child/2025"), before = structuredClone(value);
  expect(value.kind).toBe("delivery"); expect(value.age.stage).toBe("youth");
  expect(value.age.segments.map((segment) => segment.stage)).toEqual(["young_child", "youth"]);
  for (const domain of ["career", "wealth"] as const) {
    const output = buildAnnualEventReadingProse({ ...value, domain, appliedWork: "employed" });
    for (const segment of value.age.segments) expect(output.summary).toContain(`${segment.label}部分：`);
    expect(output.examples).toHaveLength(2); expect(output.examples[0]).toContain("5周岁部分"); expect(output.examples[1]).toContain("6周岁部分");
    expect([output.summary, ...output.examples].join()).not.toMatch(/阶段报告|课题|竞赛|交接与维护|岗位|客户|验收|决定权限/);
    expect(output.reasoning).toContain(value.patternContext!.summary);
  }
  expect(value).toEqual(before);
});

it("distinguishes a seven-to-eight-year new activity from teenage independent work without asserting school attendance", () => {
  const child = input("r3-child/2027"), teen = input("r3-child/2035");
  expect(child.age.startAge).toBe(7); expect(teen.age.startAge).toBe(15);
  const first = buildAnnualEventReadingProse(child), second = buildAnnualEventReadingProse(teen);
  expect(first.summary).toContain("新的游戏伙伴、兴趣活动或一起动手的尝试");
  expect(first.examples.join()).toContain("新的同伴带来一种游戏或动手活动");
  expect(second.summary).toContain("持续打磨的作品、自主练习与共同活动");
  expect(first.summary).not.toMatch(/课题|竞赛团队|实践项目|接洽/);
  expect([first.summary, ...first.examples, second.summary, ...second.examples].join()).not.toMatch(/正在上学|已经入学|所在班级|必然|学分|岗位|回款/);
  expect(first.examples).not.toEqual(second.examples);
});

it("keeps the actual seventeen/eighteen-year boundary and only uses a declared job setting on the adult side", () => {
  const value = input("r3-child/2037"); expect(value.age.stage).toBe("adult_transition");
  const output = buildAnnualEventReadingProse({ ...value, appliedWork: "employed" });
  const [first, second] = value.age.segments;
  expect(first!.stage).toBe("youth"); expect(second!.stage).toBe("adult");
  const childText = output.summary.split(`${second!.label}部分：`)[0]!;
  expect(childText).toContain(`${first!.label}部分：`); expect(childText).toContain("兴趣伙伴");
  expect(childText).not.toMatch(/供应商|岗位|回款|跨团队/);
  expect(output.summary.split(`${second!.label}部分：`)[1]).toContain("外部伙伴、供应商或跨团队合作");
  expect(output.examples[0]).toContain(`${first!.label}部分：`); expect(output.examples[1]).toContain(`${second!.label}部分：`);
  const unassigned = buildAnnualEventReadingProse(value);
  expect(unassigned.summary.split(`${second!.label}部分：`)[1]).toContain("新需求、短期合作或不同用途");
  expect(unassigned.examples.filter(line=>line.startsWith(`${second!.label}部分：`)).every(line=>line.includes("若"))).toBe(true);
  expect(unassigned.summary).not.toMatch(/供应商|岗位|客户/);
});

it("gives unassigned adults conditional occupational scenes while leaving their exact actions and reasoning intact", () => {
  for (const key of ["b/2030", "b/2032"]) for (const domain of ["career", "wealth"] as const) {
    const value = { ...input(key), domain }, before = structuredClone(value), output = buildAnnualEventReadingProse(value);
    expect(output.summary).not.toMatch(/默认在职|已经入职|已经取得收入/);
    expect(output.examples.length).toBeGreaterThanOrEqual(2);
    expect(output.examples.length).toBeLessThanOrEqual(3);
    expect(output.examples.every(line=>/^若(?:在职|正在求职或进修|有自营业务或实际合作)，/.test(line))).toBe(true);
    expect(output.reasoning).toContain(value.patternContext!.summary); expect(value).toEqual(before);
    expect(value.effect).toBe("assists");
    expect(value.patternContext!.effect).toBe("mixed");
    expect(value.patternContext!.taskLinks!.items.some(link => link.relations.some(relation => relation.contributesPressure
      && relation.from.origin.kind === "background"))).toBe(true);
    expect(output.summary).toContain("大运背景");
  }
  expect(buildAnnualEventReadingProse(input("b/2030")).summary).toContain("提出不同做法、展示样例");
  expect(buildAnnualEventReadingProse(input("b/2032")).summary).toContain("已有成果的确认");
});

it("separates B2030's conditional proposal action from its materials, trial spending and shared time", () => {
  const value = input("b/2030"), before = structuredClone(value);
  const career = buildAnnualEventReadingProse(value), wealth = buildAnnualEventReadingProse({ ...value, domain: "wealth" });
  expect(career.examples[0]).toContain("流程改进、内部提案或小范围试点");
  expect(wealth.examples[0]).not.toBe(career.examples[0]);
  expect(wealth.examples[0]).toContain("人员时间、材料与预算范围");
  expect(wealth.summary).not.toBe(career.summary);
  expect(wealth.reasoning).toContain(value.patternContext!.summary); expect(value).toEqual(before);
});

it("adapts the whole settlement and proposal process to caregiving and retirement rather than only changing object nouns", () => {
  for (const domain of ["career", "wealth"] as const) {
    const care = buildAnnualEventReadingProse({ ...input("b/2032"), domain, appliedWork: "caregiving" });
    expect(care.summary).toMatch(/接送|陪伴|照料/); expect(care.examples[0]).toContain("陪伴次数、用品购买或服务费用");
    expect(care.summary).not.toMatch(/成果.*评阅|验收|下一阶段范围|客户|回款/);
    const retired = buildAnnualEventReadingProse({ ...input("b/2030"), domain, appliedWork: "retired" });
    expect(retired.examples[0]).toContain("换一条路线、调整聚会时间");
    expect(retired.summary).not.toMatch(/样稿或演示|试点|提案|验收|岗位/);
  }
});

it("keeps the actual wealth-moderation task ahead of generic income scenes in an unassigned adult year", () => {
  const value=input("r4/2035");expect(value.effect).toBe("assists");expect(value.path).toBe("resource-wealth");
  for(const domain of ["career","wealth"] as const){
    const result=buildAnnualEventReadingProse({...value,domain});
    expect(result.examples.join()).toContain("必要与重复部分的取舍");
    expect(result.examples.join()).not.toMatch(/回款|待遇|账款|加薪/);
    expect(result.reasoning).toContain(value.patternContext!.summary);
  }
});

it("uses the real wealth-first task before hurting-wealth without turning an unresolved annual wealth actor into output adoption", () => {
  const value = input("wealth-first/2032"), before = structuredClone(value);
  expect(value.path).toBe("hurting-wealth"); expect(value.patternContext!.natalTask.task).toBe("wealth_first");
  expect(value.effect).toBe("unresolved"); expect(value.mainQiAction!.effect).toBe("neutral");
  for (const domain of ["career", "wealth"] as const) {
    const prose = buildAnnualEventReadingProse({ ...value, domain });
    expect(prose.summary).toContain("准备"); expect(prose.summary).toMatch(/必要|必需/);
    expect(prose.summary).toContain("未单独定向");
    expect(prose.examples.join()).toContain("必要与重复部分的取舍");
    expect([prose.title, prose.summary, ...prose.examples].join()).not.toMatch(/作品、改法或熟练成果的实际使用|改进试用|正式采用|较能|较有条件/);
    expect(prose.reasoning).toContain(value.patternContext!.summary);
  }
  expect(value).toEqual(before);
});

it("keeps support protection distinct from moderation, with the original output load and real rescue conditions", () => {
  const unready = input("resource-first/2027"), wealth = input("resource-first/2032"), output = input("resource-first/2030");
  expect(unready.patternContext!.natalTask.task).toBe("resource_first"); expect(unready.effect).toBe("unresolved");
  expect(wealth.effect).toBe("obstructs"); expect(output.god).toBe("食神"); expect(output.effect).toBe("obstructs");
  const a = buildAnnualEventReadingProse(unready), b = buildAnnualEventReadingProse(wealth), c = buildAnnualEventReadingProse(output);
  expect(a.summary).toContain("必要"); expect(a.summary).toContain("未单独定向");
  expect(b.summary).toContain("必需"); expect(b.summary).toContain("关键步骤");
  expect(c.summary).toContain("超过当前支持能接住的范围");
  expect(c.summary).not.toContain("补充依据继续占用");
  expect([a, b, c].flatMap(item => [item.title, item.summary, ...item.examples]).join()).not.toContain("新意见怎样经过依据校正");
  expect(wealth.patternContext!.rescues.length).toBeGreaterThan(0);
  for (const line of [...wealth.patternContext!.rescues, ...wealth.patternContext!.unresolvedConditions]) expect(b.reasoning).toContain(line);
  expect(b.summary).toContain("缓冲条件尚须落实");
});

it("keeps the actual official-joint regular wealth obstruction and its confirmation topic, not new collaboration or natal separation immunity", () => {
  const value = input("official-joint/2028");
  expect(value.patternContext!.natalTask.task).toBe("official_joint"); expect(value.god).toBe("正财"); expect(value.effect).toBe("obstructs");
  const prose = buildAnnualEventReadingProse(value);
  expect(prose.title).toContain("原约定确认"); expect(prose.summary).toContain("已做事项的确认与继续使用");
  expect(prose.summary).toContain("原有要求仍在，配套却未同步");
  expect(prose.summary).not.toMatch(/新试用|新客户|已获助力|相隔不碍.*免/);
  expect(prose.reasoning).toContain(value.patternContext!.summary);
});

it.each(["student", "employed", "self_employed", "seeking_work", "caregiving", "retired"] as const)("keeps %s task prose tied to moderation rather than the generic role fallback", (work) => {
  const value = input("wealth-first/2032");
  for (const domain of ["career", "wealth"] as const) {
    const prose = buildAnnualEventReadingProse({ ...value, domain, appliedWork: work });
    const text = [prose.summary, ...prose.examples].join();
    expect(text).toContain("准备"); expect(text).toContain("未单独定向");
    expect(text).toContain({ student: "课程", employed: "已有工作", self_employed: "已有服务", seeking_work: "岗位申请", caregiving: "照料", retired: "自愿活动" }[work]);
    expect(text).not.toMatch(/改进较有条件|成果已见|作品、改法或熟练成果的实际使用/);
    if (["student", "caregiving", "retired"].includes(work)) expect(text).not.toMatch(/客户|回款|岗位|待遇/);
  }
});

it("keeps actual task phases on both sides of six and eighteen, without borrowing a declared job for the young phase", () => {
  for (const key of ["resource-first/1963", "resource-first/1975"]) {
    const value = input(key), phases = value.age.segments;
    expect(phases).toHaveLength(2);
    const prose = buildAnnualEventReadingProse({ ...value, appliedWork: "employed" });
    for (const phase of phases) expect(prose.summary).toContain(`${phase.label}部分：`);
    const first = prose.summary.split(`${phases[1]!.label}部分：`)[0]!;
    expect(first).not.toMatch(/岗位|客户|回款|已有工作/);
    expect(first).toMatch(/讲解|示范|练习/);
    if (key.endsWith("1975")) expect(prose.summary.split(`${phases[1]!.label}部分：`)[1]).toContain("已有工作");
    expect(prose.reasoning).toContain(value.patternContext!.summary);
  }
});

it("rejects absent or mismatched task metadata and keeps unknown age neutral rather than borrowing the declared adult identity", () => {
  const value = input("wealth-first/2032"), wrong = structuredClone(value);
  wrong.patternContext!.natalTask.task = "resource_first";
  expect(() => buildAnnualEventReadingProse(wrong)).toThrow("本命任务");
  const missing = structuredClone(value); delete (missing.patternContext as unknown as { natalTask?: unknown }).natalTask;
  expect(() => buildAnnualEventReadingProse(missing)).toThrow("本命任务");
  const unknown = buildAnnualEventReadingProse({ ...value, appliedWork: "employed", age: { ...value.age, stage: "unknown", startAge: null, endAge: null, segments: [] } });
  expect([unknown.summary, ...unknown.examples].join()).not.toMatch(/岗位|客户|课程|孩子|照料者|已有工作/);
  expect(unknown.summary).toContain("未单独定向");
});
