import { beforeAll, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlookRange, type LocalAnnualOutlook } from "./local-annual-outlook";
import { ANNUAL_DOMAIN_READING_VERSION, buildAnnualDomainReading } from "./local-annual-domain-reading";
import { buildReadingAnnualEvents } from "./local-annual-event-record";
import { buildAnnualLifeStory, buildReadingAnnualLifeStories, type BuildReadingAnnualLifeStoriesInput, type AnnualLifeStorySegment } from "./annual-life-story";

const cases = new Map<string, BuildReadingAnnualLifeStoriesInput>();
beforeAll(async () => {
  for (const [id, date, time, sex, from, to] of [["b", "1995-05-18", "08:26", "male", 2026, 2032],
    ["a", "1995-08-18", "08:26", "unspecified", 2027, 2028], ["child", "2019-12-22", "11:23", "female", 2025, 2027], ["r4", "1999-01-09", "02:26", "male", 2028, 2035],
    ["child-transition", "2019-12-22", "11:23", "female", 2037, 2037], ["resource-first", "1957-09-13", "00:26", "male", 2032, 2032], ["wealth-first", "1982-10-02", "10:26", "male", 2032, 2032]] as const) {
    const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex, lunarLeapMonth: false,
      location: { label: "Synthetic annual life summary", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
    const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
    const assessment = buildBaziPreliminaryAssessment(revision), annual = await buildLocalAnnualOutlookRange(revision, assessment, from, to);
    const annualDomains = { version: ANNUAL_DOMAIN_READING_VERSION, revisionId: revision.id, chartResultHash: revision.manifest.resultHash, includeHour: assessment.sourceBinding.includeHour,
      startYear: from, endYear: to, years: annual.years.map((year) => buildAnnualDomainReading({ revision, assessment, year })) };
    cases.set(id, { revision, assessment, annual, annualDomains, annualEvents: buildReadingAnnualEvents({ revision, assessment, annual, annualDomains }) });
  }
}, 60_000);
const input = (id: string) => structuredClone(cases.get(id)!);
const text = (segment: AnnualLifeStorySegment) => segment.paragraphs.map((p) => p.text).join("\n");

it("explains B2029's actual hidden food support without upgrading its neutral visible peer, on both sides of the handover", () => {
  const value = input("b"), result = buildReadingAnnualLifeStories(value).years.find(year=>year.year===2029)!;
  expect(result.branches[0]!.segments).toHaveLength(2);
  for (const segment of result.branches[0]!.segments) {
    const mainline=segment.paragraphs.find(p=>p.kind==="mainline")!.text;
    expect(mainline).toContain("这项本身尚未单独定顺");
    expect(mainline).toContain("年支内的辛食神");expect(mainline).toContain("稳定做完");
    expect(segment.paragraphs.some(p=>p.kind==="support")).toBe(false);
    expect(segment.caption).toBe(segment === result.branches[0]!.segments[0] ? "结构上较顺，需看承接与救应" : "结构上利弊并见，需看承接与救应");
    const original = value.annual.years.find(year=>year.year===2029)!.judgmentSegments.find((item) => item.id === segment.id)!;
    expect(segment.backgroundRefs).toEqual(original.judgment.backgroundRefs);
    expect(segment.startInstant).toBe(original.startInstant); expect(segment.endExclusiveInstant).toBe(original.endExclusiveInstant);
  }
  expect(text(result.branches[0]!.segments[1]!)).toContain("当前仍在场的大运背景");
  expect(text(result.branches[0]!.segments[0]!)).not.toContain("当前仍在场的大运背景");
  expect(Date.parse(result.branches[0]!.segments[1]!.startInstant)).toBe(Date.parse("2029-05-22T16:20:00Z"));
});

it("distinguishes B2030 trying a change from B2032 closing an existing matter, preserving independent relationship timing", () => {
  const value = input("b"), stories = buildReadingAnnualLifeStories(value);
  const proposal = stories.years.find((year) => year.year === 2030)!, settlement = stories.years.find((year) => year.year === 2032)!;
  const first = proposal.branches[0]!.segments[0]!, second = settlement.branches[0]!.segments[0]!;
  const proposalMatter = value.annualEvents.years.find((year) => year.year === 2030)!.branches[0]!.segments[0]!.items.find((item) => item.domain === "career")!;
  const settlementMatter = value.annualEvents.years.find((year) => year.year === 2032)!.branches[0]!.segments[0]!.items.find((item) => item.domain === "wealth")!;
  expect(settlementMatter.priority).toBe("primary");
  expect(proposalMatter.origin.ruleId).toMatch(/\/proposal$/);
  expect(settlementMatter.origin.ruleId).toMatch(/\/settlement$/);
  expect(first.headline).not.toBe(second.headline);
  expect(first.headline).toContain("改法进入试用"); expect(second.headline).toContain("进入确认");
  expect(first.paragraphs.find((p) => p.kind === "mainline")!.text).toContain("当前仍在场的大运背景");
  expect(first.paragraphs.find((p) => p.kind === "mainline")!.text).toContain("小范围试用");
  expect(second.paragraphs.find((p) => p.kind === "mainline")!.text).toContain("承担两件事");
  expect(second.paragraphs.find((p) => p.kind === "mainline")!.text).toContain("原约定中的回应");
  const settlementSupport=second.paragraphs.find(p=>p.kind==="mainline")!.text;
  expect(settlementSupport).toContain("年支内的癸偏财");
  expect(settlementSupport).toContain("不同用途");
  expect(first.paragraphs.find((p) => p.kind === "coordination")!.text).toContain("用品、试做花费和共同腾出的时间");
  expect(second.paragraphs.find((p) => p.kind === "coordination")!.sourceSubjects.some((subject) => subject.startsWith("annual-event-composed-2032-"))).toBe(true);
  expect(proposal.summary).toContain("利弊并见"); expect(settlement.summary).toContain("利弊并见");
  const original = value.annualEvents.years.find((year) => year.year === 2032)!.branches[0]!.segments[0]!.items.find((item) => item.domain === "relationship")!;
  const relation = second.paragraphs.find((p) => p.kind === "relationship")!;
  expect(relation.text).toBe(original.summary); expect(relation.text).toContain("把相处期待说清"); expect(relation.basisRefs).toEqual([]);
  expect(relation.sourceSubjects.some((subject) => subject.endsWith("-career"))).toBe(false);
  expect(text(first)).not.toMatch(/项目验收|回款|已经就业/);
});

it("preserves A2028's three exact scopes and the opposite seasonal side of the forward mixed judgment", () => {
  const value = input("a"), result = buildReadingAnnualLifeStories(value).years.find((year) => year.year === 2028)!;
  expect(result.branches.map((branch) => branch.id)).toEqual(["forward", "backward"]);
  const forward = result.branches[0]!.segments[0]!, backward = result.branches[1]!.segments;
  expect(forward.caption).toBe("利弊并见"); expect(backward).toHaveLength(2);
  expect(value.annual.years.find(year=>year.year===2028)!.judgmentSegments.find(segment=>segment.branchId==="forward")!.judgment.axes.find(axis=>axis.axis==="pattern")!.stemActions!.items).toEqual(expect.arrayContaining([expect.objectContaining({stem:"戊",tenGod:"正印",effect:"assists"})]));
  expect(text(forward)).toContain("一条说明或示范补上"); expect(text(forward)).toContain("调候还有另一面"); expect(text(forward)).toContain("戊可制约现有调候用字壬");
  const source = value.annual.years.find((year) => year.year === 2028)!.judgmentSegments[0]!.judgment.axes.find((axis) => axis.axis === "seasonal")!;
  const pressure = forward.paragraphs.find((p) => p.kind === "pressure")!;
  expect(pressure.basisRefs).toContainEqual({ axisId: source.id, field: "rescues", index: 0 });
  expect(forward.paragraphs.find(p=>p.kind==="mainline")!.basisRefs).toContainEqual({axisId:source.id,field:"summary"});
  for (const segment of backward) { expect(segment.caption).toContain("结构上有压力"); expect(text(segment)).toContain("尚不能当成阻碍已经解除"); }
  expect(backward[0]!.endExclusiveInstant).toBe(backward[1]!.startInstant);
  expect(Date.parse(backward[1]!.startInstant)).toBe(Date.parse("2028-12-20T20:58:00Z"));
  expect(text(backward[0]!)).not.toContain("庚辰"); expect(text(backward[1]!)).not.toContain("辛巳");
  for (const branch of result.branches) for (const segment of branch.segments) {
    const original = value.annualEvents.years.find((year) => year.year === 2028)!.branches.find((b) => b.id === branch.id)!.segments.find((s) => s.id === segment.id)!;
    expect(segment.paragraphs.find((p) => p.kind === "relationship")!.text).toBe(original.items.find((item) => item.domain === "relationship")!.summary);
  }
});

it("does not turn A2027's hidden resource assistance into food-output language or its neutral killing into pressure", () => {
  const value = input("a"), year = value.annual.years.find((item) => item.year === 2027)!;
  const original = year.judgmentSegments.find((segment) => segment.branchId === "forward")!;
  expect(original.judgment.axes.find((axis) => axis.axis === "pattern")!.stemActions!.items).toEqual(expect.arrayContaining([
    expect.objectContaining({ visibility: "visible", stem: "丁", tenGod: "七杀", effect: "neutral" }),
    expect.objectContaining({ visibility: "main_hidden", stem: "己", tenGod: "偏印", effect: "assists" })]));
  const result = buildReadingAnnualLifeStories(value).years.find((item) => item.year === 2027)!.branches.find((branch) => branch.id === "forward")!.segments[0]!;
  const main = result.paragraphs.find((paragraph) => paragraph.kind === "mainline")!;
  expect(main.text).toContain("年支内的己偏印"); expect(main.text).toContain("不同的解释或局部办法");
  expect(main.text).toContain("目前尚未单独判为压力增加或处理更顺");
  expect(result.paragraphs.some(p=>p.kind==="support")).toBe(false);
  expect(main.text).not.toContain("把熟悉本领做稳"); expect(main.text).not.toContain("稳定练习、细致表达与连续完成");
});

it("keeps the child's actual five/six age split and neutral new-activity year without employment or schooling assumptions", () => {
  const result = buildReadingAnnualLifeStories(input("child"));
  const first = result.years[0]!.branches[0]!.segments[0]!, neutral = result.years[2]!.branches[0]!.segments[0]!;
  expect(first.age.segments.map((segment) => segment.stage)).toEqual(["young_child", "youth"]);
  expect(text(first)).toContain("5周岁部分"); expect(text(first)).toContain("6周岁部分");
  expect(first.caption).toContain("有压力"); expect(text(first)).toContain("自己的表达或熟悉做法与原来约定的要求相遇");
  expect(first.paragraphs.find(p=>p.kind==="mainline")!.text).toContain("自己的表达或熟悉做法");
  expect(first.paragraphs.find(p=>p.kind==="mainline")!.text).not.toContain("额外准备或负荷");
  expect(neutral.paragraphs.some((p) => p.kind === "support")).toBe(false); expect(neutral.headline).toContain("新的用途与参与选择");
  expect([text(first), text(neutral)].join()).not.toMatch(/学分|已经入学|岗位|回款|必然|成绩上升/);
});

it("preserves every upstream object and keeps single-year content and feedback dependencies independent of the query window", async () => {
  const value = input("b"), before = structuredClone(value), result = buildReadingAnnualLifeStories(value);
  for (const story of result.years) {
    const year = value.annual.years.find((item) => item.year === story.year)!, domains = value.annualDomains.years.find((item) => item.year === story.year)!, events = value.annualEvents.years.find((item) => item.year === story.year)!;
    expect(story).toEqual(buildAnnualLifeStory({ revision: value.revision, assessment: value.assessment, year, domains, events }));
    for (const branch of story.branches) for (const segment of branch.segments) {
      const original = year.judgmentSegments.find((item) => item.id === segment.id)!;
      for (const ref of segment.basisRefs) { const axis = original.judgment.axes.find((item) => item.id === ref.axisId)!; expect(ref.field === "summary" ? axis.summary : axis[ref.field][ref.index!]).toBeTypeOf("string"); }
      expect(segment.sourceSubjects).toContain(`annual-${story.year}`);
    }
  }
  const annual: LocalAnnualOutlook = { ...value.annual, startYear: 2030, endYear: 2030, years: value.annual.years.filter((year) => year.year === 2030) };
  const short = buildReadingAnnualLifeStories({ ...value, annual, annualDomains: { ...value.annualDomains, startYear: 2030, endYear: 2030, years: value.annualDomains.years.filter((year) => year.year === 2030) },
    annualEvents: { ...value.annualEvents, startYear: 2030, endYear: 2030, years: value.annualEvents.years.filter((year) => year.year === 2030) } });
  expect(short.years[0]).toEqual(result.years.find((year) => year.year === 2030)); expect(value).toEqual(before);
});

it("rejects altered domain/event prose, wrong versions, duplicated years and wrong-scope nodes", () => {
  const original = input("b");
  const prose = structuredClone(original); prose.annualEvents.years[0]!.branches[0]!.segments[0]!.items[0]!.summary += "篡改"; expect(() => buildReadingAnnualLifeStories(prose)).toThrow("同修订重建");
  const domain = structuredClone(original); domain.annualDomains.years[0]!.branches[0]!.segments[0]!.domains[0]!.summary += "借用"; expect(() => buildReadingAnnualLifeStories(domain)).toThrow();
  const versions = structuredClone(original); versions.annualEvents.years[0]!.sourceVersions.push("other/9"); expect(() => buildReadingAnnualLifeStories(versions)).toThrow("同修订重建");
  const duplicate = structuredClone(original); duplicate.annualEvents.years[1] = duplicate.annualEvents.years[0]!; expect(() => buildReadingAnnualLifeStories(duplicate)).toThrow("窗口");
  const ref = structuredClone(original); ref.annual.years.find(year=>year.year===2029)!.judgmentSegments[1]!.judgment.backgroundRefs[0]!.startInstant = "2000-01-01T00:00:00Z"; expect(() => buildReadingAnnualLifeStories(ref)).toThrow();
});

it("carries the actual wealth-moderation task through the mainline, support and coordination without inventing a settlement", () => {
  const value=input("r4"), stories=buildReadingAnnualLifeStories(value);
  for(const year of [2028,2034,2035]) {
    const story=stories.years.find(item=>item.year===year)!, segment=story.branches[0]!.segments[0]!;
    const main=segment.paragraphs.find(item=>item.kind==="mainline")!;
    expect(main.text).toMatch(/准备|资料|用途/);
    expect(segment.paragraphs.find(item=>item.kind==="coordination")!.text).toContain("必要支持仍要留下");
    expect(text(segment)).not.toMatch(/回款|财生官|收入增长/);
    const original=value.annual.years.find(item=>item.year===year)!.judgmentSegments[0]!.judgment;
    expect(segment.caption).toContain(year===2034?"条件":year===2028?"利弊":"较顺");
    expect(segment.basisRefs.some(ref=>ref.axisId===original.axes.find(axis=>axis.axis==="pattern")!.id)).toBe(true);
    if(year===2034){expect(main.text).toContain("尚未单独定向");expect(main.text).not.toContain("这一项有可用的推进条件");}
    if(year===2035){expect(main.text).toContain("重复占用可以收拢");expect(segment.headline).toContain("减少重复准备");}
  }
});
it("keeps opposite native wealth/resource tasks distinct and retains both real eighteen-year phases", () => {
  const resource=buildReadingAnnualLifeStories(input("resource-first")).years[0]!.branches[0]!.segments[0]!;
  const wealth=buildReadingAnnualLifeStories(input("wealth-first")).years[0]!.branches[0]!.segments[0]!;
  expect(resource.headline).toMatch(/支持/);expect(wealth.headline).toMatch(/准备|积累/);
  expect(resource.paragraphs.find(item=>item.kind==="coordination")!.text).toContain("指导留位置");
  expect(wealth.paragraphs.find(item=>item.kind==="coordination")!.text).toContain("重复准备");
  const transition=buildReadingAnnualLifeStories(input("child-transition")).years[0]!.branches[0]!.segments[0]!;
  expect(transition.age.stage).toBe("adult_transition");
  expect(text(transition)).toContain("17周岁部分");expect(text(transition)).toContain("18周岁部分");
  expect(text(transition)).not.toMatch(/你已在职|已经录用|必然结婚/);
});

it("puts B2026's actual preparation pressure in its headline and main statement instead of a generic study heading",()=>{
 const value=input("b"),year=value.annual.years.find(item=>item.year===2026)!;
 const actors=year.judgmentSegments[0]!.judgment.axes.find(axis=>axis.axis==="pattern")!.stemActions!.items;
 expect(actors.find(actor=>actor.visibility==="visible")).toMatchObject({tenGod:"正印",effect:"obstructs"});
 const segment=buildReadingAnnualLifeStories(value).years.find(item=>item.year===2026)!.branches[0]!.segments[0]!;
 expect(segment.headline).toContain("准备增多");expect(segment.headline).toContain("被推后");
 const main=segment.paragraphs.find(p=>p.kind==="mainline")!;expect(main.text).toContain("原本要拿出来用的内容容易往后挪");
 const pressure=segment.paragraphs.find(p=>p.kind==="pressure");expect(pressure?.text??"").not.toContain("本年丙正印直接进入");
 expect(pressure?.text??"").not.toContain("原本要拿出来用的内容容易往后挪");
});
