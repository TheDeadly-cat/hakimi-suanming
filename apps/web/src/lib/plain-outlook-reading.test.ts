import { beforeAll, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { evaluateNatalWealthResourceTask } from "../../../../packages/bazi-interpretation/src/natal-wealth-resource-task";
import { buildLocalAnnualOutlookRange } from "./local-annual-outlook";
import { buildLocalReadingAgeContext } from "./local-reading-age-context";
import { createAnnualRelationshipTimingBuilder } from "./annual-relationship-timing";
import { buildPlainOutlookDomainReading, plainAnnualYearSegments, plainOutlookCaption, plainOutlookExample, type PlainOutlookDomainInput } from "./plain-outlook-reading";

async function fixture(date: string, time: string, from: number, to = from, sex: "male" | "female" = "male") {
  const chart = await calculateChart({ schemaVersion:"1.0.0",calendarType:"gregorian",date,time,timePrecision:"exact_minute",timeZone:"Asia/Shanghai",sex,lunarLeapMonth:false,
    location:{label:"Synthetic plain-reading fixture",latitude:null,longitude:null,precision:"unknown"},sourceNote:"synthetic" },WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({...chart,schemaVersion:"1.0.0",id:crypto.randomUUID(),caseId:crypto.randomUUID(),revisionNumber:1,createdAt:"2026-10-20T00:00:00Z"});
  const assessment = buildBaziPreliminaryAssessment(revision), annual = await buildLocalAnnualOutlookRange(revision,assessment,from,to);
  return {revision,assessment,annual};
}
let b:Awaited<ReturnType<typeof fixture>>,food:typeof b,protect:typeof b,moderate:typeof b,official:typeof b;
beforeAll(async()=>{[b,food,protect,moderate,official]=await Promise.all([fixture("1995-05-18","08:26",2029,2032),fixture("1970-12-08","08:26",2026),fixture("1957-09-13","00:26",2032),fixture("1982-10-02","10:26",2032),fixture("1971-04-09","14:26",2026,2029)]);});
function input(source:typeof b,year:number,segment=0,domain:PlainOutlookDomainInput["domain"]="career"):PlainOutlookDomainInput {
  const y=source.annual.years.find(y=>y.year===year)!,judgment=y.judgmentSegments[segment]!.judgment;
  return {judgment,domain,horizon:"year",task:evaluateNatalWealthResourceTask({facts:source.assessment.balance.structural.inputFacts,includeHour:true}),
    age:buildLocalReadingAgeContext(source.revision.timeCalibration.utcInstant,judgment.interval.startInstant,judgment.interval.endExclusiveInstant),
    original:{headline:"完整原题",summary:"完整原句",paragraphs:["原机制"],examples:["原情境一","原情境二"],conditions:["原条件"],evidence:["原依据"]}};
}
it("keeps the actual handover and classifies no neutral actor as a bad year",()=>{
  const year=b.annual.years[0]!,before=JSON.stringify(year),periods=plainAnnualYearSegments(year);
  expect(periods).toHaveLength(2);expect(periods[0]!.category).toBe("unresolved");expect(periods[1]!.category).toBe("mixed");
  expect(periods[0]!.caption).toBe("有可推进的机会");expect(periods[1]!.startInstant).toBe(periods[0]!.endExclusiveInstant);
  expect(JSON.stringify(year)).toBe(before);
});
it("explains B's real trial and confirmation separately and preserves the background obstacle",()=>{
  const trial=buildPlainOutlookDomainReading(input(b,2030))!,settlement=buildPlainOutlookDomainReading(input(b,2032))!;
  expect(trial.summary).toContain("试用");expect(settlement.summary).toContain("确认");expect(settlement.summary).toContain("新的地方");
  for(const value of [trial,settlement]){expect(value.summary).toContain("打断");expect(value.summary).not.toMatch(/条件性|承接|牵制|年支内/);}
  expect(trial.headline).not.toBe(settlement.headline);
  const wealth=buildPlainOutlookDomainReading(input(b,2032,0,"wealth"))!;expect(wealth.summary).toContain("原约定");expect(wealth.summary).toContain("新参与");
});
it("retains neutral independence, real hidden skill support and precise originals",()=>{
  const source=input(b,2029),saved=structuredClone(source),result=buildPlainOutlookDomainReading(source)!;
  expect(result.summary).toContain("这一事项主题本身不单独定顺逆");expect(result.summary).not.toContain("没有单独的顺逆判断");expect(result.summary).toContain("熟悉的本领较容易派上用场");expect(result.summary).not.toContain("都会慢下来");
  expect(plainOutlookCaption(source.judgment)).toBe("有可推进的机会");
  const later=buildPlainOutlookDomainReading(input(b,2029,1))!;expect(later.summary).toContain("都会慢下来");
  expect(result.originals).toEqual(source.original);expect(result.conditions).toEqual(source.original.conditions);expect(source).toEqual(saved);
});
it("keeps food's new requirements and the old interrupted method without duplicate wealth lines",()=>{
  const result=buildPlainOutlookDomainReading(input(food,2026))!;
  expect(result.summary).toContain("带来更多要处理的要求");expect(result.summary).toContain("补充指导或方法转换打断");
  expect(result.summary.split("花了时间或添了条件也未必更省力")).toHaveLength(2);
});
it("keeps necessary support protection opposite to unresolved moderation",()=>{
  const pressure=buildPlainOutlookDomainReading(input(protect,2032))!,pending=buildPlainOutlookDomainReading(input(moderate,2032))!;
  expect(pressure.summary).toContain("挤占仍必需的指导");expect(pending.summary).toContain("实际进展尚未明朗");
  expect(pending.headline).toContain("效果尚未明朗");expect(pending.summary).not.toContain("重复占用的资料、工具和学习投入较能收拢");
});
it("distinguishes authority targets from the resource support actually restricted",()=>{
  const duties=buildPlainOutlookDomainReading(input(official,2026))!,support=buildPlainOutlookDomainReading(input(official,2029))!;
  expect(duties.summary).toContain("既定要求对不上");expect(support.summary).toContain("仍然需要的方法或帮助");
  expect(support.summary).toContain("明确要求");
});
it("preserves complete unknown, cross-age and confirmed daily-role examples",()=>{
  for(const stage of ["unknown","young_child","youth","adult_transition"] as const){const source=input(b,2030);source.age={...source.age,stage};const result=buildPlainOutlookDomainReading(source)!;expect(result.summary).toContain("试用");expect(result.originals).toEqual(source.original);expect(result.summary).not.toMatch(/岗位|工资|伴侣|家庭费用/);expect(result.examples).toEqual(source.original.examples);}
  for(const appliedWork of ["student","caregiving","retired"] as const){const source={...input(b,2030),appliedWork};expect(buildPlainOutlookDomainReading(source)!.examples).toEqual(source.original.examples);}
  const month={...input(b,2030),horizon:"month" as const};month.original.examples=["若已有一个改法：用熟悉的办法做一小段试样，比较它有没有真正处理原来的难点。"];expect(buildPlainOutlookDomainReading(month)!.examples).toEqual(month.original.examples);
});
it("keeps the real child output-versus-rules pressure without inventing interrupted skill or money returns",async()=>{
  const child=await fixture("2019-12-22","11:23",2025,2025,"female"),source=input(child,2025),saved=structuredClone(source);
  const pattern=source.judgment.axes.find(axis=>axis.axis==="pattern")!;
  expect(pattern.pathId).toBe("official-wealth");expect(pattern.taskLinks == null).toBe(true);
  expect(pattern.stemActions!.items[0]).toMatchObject({tenGod:"食神",effect:"obstructs",blockerIndexes:[0,1]});
  expect(source.age.segments.map(segment=>segment.stage)).toEqual(["young_child","youth"]);
  const career=buildPlainOutlookDomainReading(source)!,wealth=buildPlainOutlookDomainReading({...source,domain:"wealth"})!;
  expect(career.headline).toContain("自己的做法与要求不同");expect(career.summary).toContain("自己的表达或熟悉做法与活动约定对不上");
  expect(career.summary).not.toMatch(/连续完成容易被打断|熟练做法难持续/);
  expect(wealth.summary).toContain("时间和用品还要用于调整");expect(wealth.summary).not.toMatch(/回报|收入|工资|费用/);
  for(const result of [career,wealth]){expect(result.examples).toEqual(source.original.examples);expect(result.originals).toEqual(source.original);}
  expect(source).toEqual(saved);
});
it("does not turn neutral or unresolved exact scenarios into pressure",()=>{
  const originals=["若已有一个改法：用熟悉的办法做一小段试样，比较它有没有真正处理原来的难点。","若已有练熟的步骤：完整做完一轮，再看下一轮能否按相近的方式继续。","若已有完成的作品或约定：对照实际完成的部分获得回应，尚待补做的内容另外列明。"];
  for(const original of originals)for(const effect of ["neutral","unresolved"] as const){const result=plainOutlookExample(original,effect,"career");expect(result).not.toMatch(/还有差距|容易.*中断|仍被要求|较容易|较能/);expect(result.split("：")[0]).toBe(original.split("：")[0]);}
  expect(plainOutlookExample("未登记完整句", "obstructs", "career")).toBe("未登记完整句");
});
it("uses separate relationship signals and rejects a different relationship scope",()=>{
  const source=input(b,2032,0,"relationship"),y=b.annual.years.find(y=>y.year===2032)!;
  expect(buildPlainOutlookDomainReading(source)).toBeNull();
  source.relationshipTiming=createAnnualRelationshipTimingBuilder(b.revision,b.assessment)(y,y.judgmentSegments[0]!);
  const result=buildPlainOutlookDomainReading(source)!;expect(result.summary).toContain("期待和回应");expect(result.summary).not.toContain("事业");expect(result.summary).toContain("谈婚安排的线索与实际成婚分开看");expect(result.summary).toContain("不直接断定结婚或分手");
  source.relationshipTiming.scope.startInstant="2032-01-01T00:00:00Z";expect(()=>buildPlainOutlookDomainReading(source)).toThrow("时段不一致");
  expect(plainOutlookCaption(source.judgment)).toBe("有机会，也有阻力");
});
