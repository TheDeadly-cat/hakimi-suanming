import { beforeAll, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { buildNatalLifeStory, NATAL_LIFE_STORY_VERSION, type NatalLifeStoryInput } from "./natal-life-story";
import type { ReadingContextDraft } from "./local-reading-context";

const values = new Map<string, NatalLifeStoryInput>();
const body = (value: ReturnType<typeof buildNatalLifeStory>) => [value.headline, value.strength.text, value.obstacle.text,
  ...value.mainParagraphs.map((item) => item.text), ...value.workWealthParagraphs.map((item) => item.text)].join("\n");
const context = (work: ReadingContextDraft["work"], changes: Partial<ReadingContextDraft> = {}): ReadingContextDraft => ({ work, relationship: "unspecified", fromYear: 2026, toYear: 2026, notes: "合成自述，非真实个人资料", ...changes });
beforeAll(async () => {
  for (const [id, date, time] of [
    ["a", "1995-08-18", "08:26"], ["b", "1995-05-18", "08:26"], ["r3", "2019-12-22", "11:23"],
    ["r4-child", "2018-11-19", "14:26"], ["r4-metal", "1999-01-09", "02:26"],
    ["r1", "1907-03-15", "02:26"], ["r2", "2018-03-15", "00:26"],
    ["food", "1970-12-08", "08:26"], ["official", "1971-04-09", "14:26"], ["background", "1993-04-03", "08:26"],
    ["official-joint", "1944-08-09", "04:26"], ["wealth-heavy", "1957-09-13", "00:26"],
    ["resource-heavy", "1982-10-02", "10:26"], ["official-combined", "1982-07-24", "06:26"]
  ]) {
    const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: date!, time: time!, timePrecision: "exact_minute", timeZone: "Asia/Shanghai",
      sex: id === "r3" ? "female" : "male", lunarLeapMonth: false, location: { label: "Synthetic natal life narrative", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
    const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
    const assessment = buildBaziPreliminaryAssessment(revision), comprehensive = buildBaziComprehensiveReading(revision, assessment);
    values.set(id!, { revision, assessment, comprehensive, referenceInstant: "2026-10-16T04:00:00Z" });
  }
});
const input = (id: string) => structuredClone(values.get(id)!);

it("distinguishes A's actual hurting output from B's food output without inventing a natal blocker or rescue", () => {
  const a = input("a"), b = input("b"), before = structuredClone([a, b]);
  expect(a.comprehensive.patternDiagnosis!.blockers).toEqual([]); expect(b.comprehensive.patternDiagnosis!.blockers).toEqual([]);
  expect(a.comprehensive.patternDiagnosis!.rescues).toEqual([]); expect(b.comprehensive.patternDiagnosis!.rescues).toEqual([]);
  const first = buildNatalLifeStory(a), second = buildNatalLifeStory(b);
  expect(first.pathId).toBe("peer-output-wealth"); expect(second.pathId).toBe("resource-output");
  expect(first.mainParagraphs[0]!.text).toContain("改进"); expect(second.mainParagraphs[0]!.text).toContain("细致说明、耐心打磨");
  expect(second.mainParagraphs[0]!.text).not.toContain("推翻");
  for (const result of [first, second]) { expect(body(result)).not.toMatch(/原局.*救应|本盘已有.*牵制|已就业|工资上涨|收入增加/); expect(result.evidence.some((line) => line.startsWith("原局阻碍"))).toBe(false); }
  expect([a, b]).toEqual(before);
});

it("keeps actual R3 mixed authorities as the child's main tension without changing balanced strength into an easy outcome", () => {
  const source = input("r3"), before = structuredClone(source), result = buildNatalLifeStory({ ...source, context: context("self_employed") });
  expect(source.assessment.balance.structural.working).toMatchObject({ band: "balanced", direction: "conditional", focus: "rooted_peer_mixed_authority" });
  expect(source.comprehensive.patternDiagnosis!.status).toBe("obstructed");
  expect(result.appliedWork).toBeNull(); expect(result.age!.stage).toBe("youth");
  expect(body(result)).toContain("明确规矩与较急的要求同时出现");
  expect(body(result)).not.toMatch(/客户|工资|回款|行政职业|父母严厉|已去官|能力不足，因此/);
  expect(result.mainParagraphs[2]!.text).toContain("成长中容易反复");
  expect(result.mainParagraphs[2]!.text).not.toMatch(/机会|规模|维护|投入加重承担/);
  expect(result.workWealthParagraphs.map((item) => item.label)).toEqual(["学习与活动", "时间与用品"]);
  expect(result.evidence).toContain(source.comprehensive.patternDiagnosis!.currentJudgment);
  expect(source).toEqual(before);
});

it("separates the actual bound wealth-moderating-print child from the untied adult metal chart", () => {
  const child = input("r4-child"), adult = input("r4-metal");
  expect(child.comprehensive.patternDiagnosis!.blockers).toHaveLength(2); expect(adult.comprehensive.patternDiagnosis!.blockers).toEqual([]);
  const first = buildNatalLifeStory(child), second = buildNatalLifeStory(adult);
  expect(first.pathId).toBe("resource-wealth"); expect(second.pathId).toBe("resource-wealth");
  expect(body(first)).toContain("取舍不是完全自由"); expect(body(second)).not.toContain("取舍不是完全自由");
  expect(body(first)).toContain("小作品"); expect(body(first)).not.toMatch(/收入|客户|岗位|财生官/);
  expect(body(second)).toContain("重复课程、闲置材料或多余工具");
  expect(body(second)).not.toContain("财生官");
});

it("retains the existing R1 and R2 current task priorities instead of reducing both to generic output advice", () => {
  const r1 = buildNatalLifeStory(input("r1")), r2 = buildNatalLifeStory(input("r2"));
  expect(body(r1)).toContain("把已经能够持续做出的内容接到真实用途");
  expect(body(r2)).toContain("实际表达和应用更值得放到前面");
  expect(input("r1").assessment.balance.structural.working.focus).toBe("wealth_after_output");
  expect(input("r2").assessment.balance.structural.working.focus).toBe("output_after_resource");
});

it.each([
  ["employed", "岗位职责", "验收"], ["self_employed", "客户需求", "约定结算"], ["seeking_work", "面谈", "书面条件"],
  ["student", "课程、课题", "学习时间"], ["caregiving", "照料日程", "照料用品"], ["retired", "兴趣", "活动费用"]
] as const)("projects both domains independently into the actually supplied %s background", (work, careerPhrase, resourcePhrase) => {
  const result = buildNatalLifeStory({ ...input("b"), context: context(work) });
  expect(result.appliedWork).toBe(work);
  const career = result.workWealthParagraphs.find((item) => item.domain === "career")!, wealth = result.workWealthParagraphs.find((item) => item.domain === "wealth")!;
  expect(career.text).toContain(careerPhrase); expect(wealth.text).toContain(resourcePhrase);
  expect(career.sourceSubjects).toContain("chapter-career"); expect(career.sourceSubjects).not.toContain("chapter-wealth");
  expect(wealth.sourceSubjects).toContain("chapter-wealth"); expect(wealth.sourceSubjects).not.toContain("chapter-career");
  expect(career.sourceSubjects).toContain("contextual-chapter-career"); expect(wealth.sourceSubjects).toContain("contextual-chapter-wealth");
  if (["student", "caregiving", "retired"].includes(work)) expect(body(result)).not.toMatch(/客户|回款|录用|岗位职责|工资/);
});

it("does not silently apply an out-of-year background, parse notes, or default unknown age to a child or an adult career", () => {
  const source = input("b"), plain = buildNatalLifeStory(source);
  const old = buildNatalLifeStory({ ...source, context: context("self_employed", { fromYear: 2025, toYear: 2025 }) });
  expect(old.appliedWork).toBeNull(); expect(old.mainParagraphs).toEqual(plain.mainParagraphs); expect(old.workWealthParagraphs).toEqual(plain.workWealthParagraphs);
  const one = buildNatalLifeStory({ ...source, context: context("student", { notes: "总资产很多，正在创业" }) }), two = buildNatalLifeStory({ ...source, context: context("student", { notes: "没有具体自述" }) });
  expect(one).toEqual(two);
  const unknown = buildNatalLifeStory({ ...source, referenceInstant: null, context: context("self_employed") });
  expect(unknown.referenceYear).toBeNull(); expect(unknown.age).toBeNull(); expect(unknown.appliedWork).toBeNull();
  expect(body(unknown)).not.toMatch(/儿童|孩子|幼儿|客户|岗位|回款/);
  expect(() => buildNatalLifeStory({ ...source, referenceInstant: "2026-10-16" })).toThrow("参考瞬时");
});

it("excludes all hour facts in an explicitly labelled stored unknown-hour projection and creates no prebirth life history", () => {
  const source = input("r3"), revision = structuredClone(source.revision);
  revision.input.time = null; revision.input.timePrecision = "unknown_hour";
  const assessment = buildBaziPreliminaryAssessment(revision), comprehensive = buildBaziComprehensiveReading(revision, assessment);
  const result = buildNatalLifeStory({ revision, assessment, comprehensive, referenceInstant: source.referenceInstant });
  expect(result.sourceBinding.includeHour).toBe(false); expect(result.age!.stage).toBe("unknown");
  expect(result.evidence.join()).not.toMatch(/时干戊|时柱戊/); expect(body(result)).not.toContain("固定标准与较急的要求同时存在");
  const prebirth = buildNatalLifeStory({ ...source, referenceInstant: "2019-01-01T00:00:00Z" });
  expect(prebirth.age!.stage).toBe("before_birth"); expect(prebirth.mainParagraphs).toEqual([]); expect(prebirth.workWealthParagraphs).toEqual([]);
});

it("rejects mixed source bindings and keeps a background-only path from borrowing a supported route", () => {
  const source = input("a");
  for (const layer of ["assessment", "comprehensive"] as const) { const value = structuredClone(source); value[layer].sourceBinding.revisionId = crypto.randomUUID(); expect(() => buildNatalLifeStory(value)).toThrow("来源不匹配"); }
  const wrongHour = structuredClone(source); wrongHour.comprehensive.patternDiagnosis!.sourceBinding.includeHour = false;
  expect(() => buildNatalLifeStory(wrongHour)).toThrow("来源不匹配");
  const wrongHash = structuredClone(source); wrongHash.comprehensive.usefulGuidance!.sourceBinding.chartResultHash = "0".repeat(64);
  expect(() => buildNatalLifeStory(wrongHash)).toThrow("来源不匹配");
  const background = buildNatalLifeStory(input("background")); expect(background.pathId).toContain("background");
  expect(background.mainParagraphs[0]!.text).toContain("尚未选择完整的跨域主线");
});

it("retains an unfamiliar primary finding as an explicit limitation instead of presenting the path as unblocked", () => {
  // Display forward-compatibility check only; no new chart finding is calculated.
  const source = input("r4-child"), originalFinding = source.comprehensive.patternDiagnosis!.blockers[0]!;
  originalFinding.id = "future-primary-finding";
  const result = buildNatalLifeStory(source);
  expect(result.obstacle.text).toContain("本盘这条发挥方式仍有明确牵制");
  expect(result.mainParagraphs.some((paragraph) => paragraph.text.includes("本盘这条发挥方式仍有明确牵制"))).toBe(true);
  expect(result.evidence).toContain(`原局阻碍 future-primary-finding：${originalFinding.text}`);
  expect(body(buildNatalLifeStory(input("a")))).not.toContain("本盘这条发挥方式仍有明确牵制");
});

it("gives three actually selected wealth-resource tasks different life answers without changing their source facts", () => {
  const headings = new Set<string>();
  for (const [id, kind, phrase, sourceId] of [
    ["official-joint", "official_joint", "方法与实际条件各有分工", "natal-zq-official-wealth-resource-separated"],
    ["wealth-heavy", "resource_first", "先找回能继续做下去的方法", "natal-zq-hurting-wealth-heavy"],
    ["resource-heavy", "wealth_first", "让实际用途决定留下什么", "natal-zq-hurting-resource-heavy"]
  ] as const) {
    const value = input(id), before = JSON.stringify(value), task = value.comprehensive.patternDiagnosis!.wealthResourceTask;
    expect(task.task).toBe(kind); expect(task.preferredPathId).toBe(value.comprehensive.patternDiagnosis!.primaryPathId);
    const result = buildNatalLifeStory(value);
    headings.add(result.headline); expect(result.version).toBe(NATAL_LIFE_STORY_VERSION); expect(result.headline).toContain(phrase);
    expect(result.sourceVersions).toContain(task.version); expect(result.evidence).toContain(task.summary);
    expect(result.evidence.join("\n")).toContain(sourceId);
    for (const condition of task.conditions) expect(result.conditions).toContain(condition);
    for (const evidence of task.evidence) expect(result.evidence).toContain(evidence);
    expect(result.mainParagraphs[0]!.sourceSubjects).toEqual(["chapter-structure", "chapter-useful_elements"]);
    expect(result.workWealthParagraphs[0]!.text).not.toBe(result.workWealthParagraphs[1]!.text);
    expect(body(result)).not.toMatch(/已就业|已入职|工资上涨|发财|收入增加|过去.*经历|某年/);
    expect(JSON.stringify(value)).toBe(before);
  }
  expect(headings.size).toBe(3);
});

it("keeps joint official support as two different practical roles rather than replacing help with more spending", () => {
  const result = buildNatalLifeStory(input("official-joint"));
  expect(result.mainParagraphs[0]!.text).toContain("时间、用品与他人的配合");
  expect(result.mainParagraphs[0]!.text).toContain("理解、示范与练习");
  expect(result.obstacle.text).toContain("有时缺的是时间或用品，有时缺的是说明与练习");
  expect(result.workWealthParagraphs.find((item) => item.domain === "wealth")!.text).toContain("不能用追加投入代替把方法学会");
  expect(body(result)).not.toMatch(/官星已透|已经成格|全部.*有利|收入保证/);
});

it("retains the opposing priorities of help before additional output and actual use before more preparation", () => {
  const support = buildNatalLifeStory(input("wealth-heavy")), use = buildNatalLifeStory(input("resource-heavy"));
  expect(support.mainParagraphs[0]!.text).toContain("不是继续多做、多投入");
  expect(support.mainParagraphs[1]!.text).toContain("补上真正缺少的步骤");
  expect(use.mainParagraphs[0]!.text).toContain("把准备带到实际使用");
  expect(use.mainParagraphs[1]!.text).toContain("还不能等同已经取得回报");
  expect(use.mainParagraphs[2]!.text).toContain("急着撤掉所有支持也会走向另一端");
  expect(support.headline).not.toBe(use.headline);
});

it("uses age before adult self-description and leaves unknown age in neutral daily life for all three tasks", () => {
  for (const id of ["official-joint", "wealth-heavy", "resource-heavy"]) {
    const value = input(id), birthYear = Number(value.revision.input.date.slice(0, 4));
    const young = buildNatalLifeStory({ ...value, referenceInstant: `${birthYear + 4}-11-01T04:00:00Z`,
      context: context("self_employed", { fromYear: birthYear + 4, toYear: birthYear + 4 }) });
    expect(young.age!.stage).toBe("young_child"); expect(young.appliedWork).toBeNull();
    expect(young.workWealthParagraphs.map((item) => item.label)).toEqual(["学习与活动", "时间与用品"]);
    expect(body(young)).toContain("玩具"); expect(body(young)).not.toMatch(/客户|岗位|收入|工资|经营|结算|面谈/);
    const unknown = buildNatalLifeStory({ ...value, referenceInstant: null, context: context("employed") });
    expect(unknown.age).toBeNull(); expect(unknown.appliedWork).toBeNull();
    expect(body(unknown)).not.toMatch(/客户|岗位|收入|工资|幼儿|课程作品/);
  }
});

it("adapts the new tasks to the actual supplied student, caregiving and retired settings without inventing employment", () => {
  for (const id of ["official-joint", "wealth-heavy", "resource-heavy"]) for (const work of ["student", "caregiving", "retired"] as const) {
    const result = buildNatalLifeStory({ ...input(id), context: context(work) });
    expect(result.appliedWork).toBe(work);
    expect(body(result)).toContain(work === "student" ? "课程、课题与实践" : work === "caregiving" ? "照料日程" : "自选活动");
    expect(body(result)).not.toMatch(/客户|岗位职责|工资|回款|已退休|已在校/);
    for (const item of result.workWealthParagraphs) expect(item.sourceSubjects).toContain(`contextual-chapter-${item.domain}`);
  }
});

it("does not project a complete-hour task through an unknown-hour stored projection or unresolved pair", () => {
  for (const id of ["official-joint", "wealth-heavy", "resource-heavy"]) {
    const value = input(id), revision = structuredClone(value.revision);
    revision.input.time = null; revision.input.timePrecision = "unknown_hour";
    const assessment = buildBaziPreliminaryAssessment(revision), comprehensive = buildBaziComprehensiveReading(revision, assessment);
    const result = buildNatalLifeStory({ revision, assessment, comprehensive, referenceInstant: value.referenceInstant });
    expect(result.sourceBinding.includeHour).toBe(false);
    expect(result.sourceVersions).not.toContain(comprehensive.patternDiagnosis!.wealthResourceTask.version);
    expect(result.evidence.some((line) => line.startsWith("财印任务来源："))).toBe(false);
    expect(result.headline).not.toBe(buildNatalLifeStory(value).headline);
  }
  const unresolved = input("official-combined");
  expect(unresolved.comprehensive.patternDiagnosis!.wealthResourceTask.task).toBe("not_applicable");
  expect(buildNatalLifeStory(unresolved).evidence.some((line) => line.startsWith("财印任务来源："))).toBe(false);
});


it("gives unknown-occupation adults distinct ability and financial explanations without asserting a job", () => {
  const a = buildNatalLifeStory(input("a")), b = buildNatalLifeStory(input("b"));
  for (const story of [a, b]) {
    expect(story.appliedWork).toBeNull();
    expect(story.workWealthParagraphs.map((part) => part.label)).toEqual(["事业与能力发挥", "财务与回报"]);
    const [career, wealth] = story.workWealthParagraphs;
    expect(career!.text).toContain("若在职"); expect(career!.text).toContain("若求职");
    expect(wealth!.text).toMatch(/若有合作|若有工作/);
    expect(wealth!.text).toMatch(/报酬|回报/); expect(wealth!.text).toContain("约定");
    expect(career!.text).not.toBe(wealth!.text);
    expect(career!.sourceSubjects).toEqual(["chapter-structure", "chapter-useful_elements", "chapter-career"]);
    expect(wealth!.sourceSubjects).toEqual(["chapter-structure", "chapter-useful_elements", "chapter-wealth"]);
    expect(body(story)).not.toMatch(/你已经|收入将|必有|必然获得|投资|买入|卖出/);
  }
  expect(a.workWealthParagraphs[0]!.text).toContain("发现问题、拿出改法");
  expect(a.workWealthParagraphs[1]!.text).toContain("个人成果与共同分配");
  expect(b.workWealthParagraphs[0]!.text).toContain("细致、稳定");
  expect(b.workWealthParagraphs[1]!.text).toContain("持续使用");
  expect(b.mainParagraphs[1]!.text).toContain("修正细节");
  expect(b.mainParagraphs[1]!.text).not.toMatch(/准备.*推后|资料.*迟迟/);
  expect(b.mainParagraphs[2]!.text).toContain("实际呈现却不断向后挪");
});

it("keeps moderation, preservation and official support different from ordinary earnings", () => {
  const r4 = buildNatalLifeStory(input("r4-metal"));
  const protect = buildNatalLifeStory(input("wealth-heavy"));
  const moderate = buildNatalLifeStory(input("resource-heavy"));
  const joint = buildNatalLifeStory(input("official-joint"));
  const money = (story: ReturnType<typeof buildNatalLifeStory>) => story.workWealthParagraphs.find((part) => part.domain === "wealth")!.text;
  expect(money(r4)).toContain("限定准备"); expect(money(r4)).toContain("不把财的作用直接理解为进账");
  expect(money(protect)).toContain("保住完成所需的支持");
  expect(money(moderate)).toContain("筛选准备"); expect(money(moderate)).toContain("并非已经得到报酬");
  expect(money(joint)).toContain("财务配套与学习支持需要分开");
  expect(new Set([r4, protect, moderate, joint].map(money)).size).toBe(4);
  // A new financial label does not erase a previously calculated obstruction.
  const bound = buildNatalLifeStory({ ...input("r4-child"), referenceInstant: "2040-10-16T04:00:00Z" });
  expect(bound.age!.stage).toBe("adult");
  expect(money(bound)).toContain("取舍还牵动原有支持");
  expect(bound.evidence.some((line) => line.startsWith("原局阻碍 moderating-wealth-combined"))).toBe(true);
});

it("limits the new adult scenarios to an actual adult reference and preserves supplied non-work settings", () => {
  const source = input("b"), birthday = new Date(source.revision.timeCalibration.utcInstant!);
  birthday.setUTCFullYear(birthday.getUTCFullYear() + 18);
  const child = buildNatalLifeStory({ ...source, referenceInstant: new Date(birthday.getTime() - 1).toISOString() });
  const adult = buildNatalLifeStory({ ...source, referenceInstant: birthday.toISOString() });
  expect(child.age!.stage).toBe("youth"); expect(adult.age!.stage).toBe("adult");
  expect(child.workWealthParagraphs.map((part) => part.label)).toEqual(["学习与活动", "时间与用品"]);
  expect(body(child)).not.toMatch(/若在职|若求职|报酬|收入|有偿/);
  expect(body(adult)).toContain("若在职");
  for (const work of ["student", "caregiving", "retired"] as const) {
    const story = buildNatalLifeStory({ ...source, context: context(work) });
    expect(story.appliedWork).toBe(work);
    expect(body(story)).not.toMatch(/若在职|若求职|若有自主合作|名义报酬/);
  }
  expect(body(buildNatalLifeStory({ ...source, referenceInstant: null }))).not.toMatch(/若在职|若求职|有偿服务/);
});
