import {expect,it} from "vitest";
import {buildConcretePeriodProse,concretePeriodCaption,concreteDirectionExplanation,concreteFinancialYearMonthContrast} from "./concrete-period-prose";
import {buildLocalReadingAgeContext} from "./local-reading-age-context";
import type {LocalOutlookJudgment,OutlookAxisFinding,OutlookStemAction,OutlookEffect} from "./local-outlook-judgment";
import type {BriefAnnualDomainVerdict} from "./brief-annual-reading";
import type {NatalWealthResourceTask} from "../../../../packages/bazi-interpretation/src/natal-wealth-resource-task";

const age=buildLocalReadingAgeContext("1990-01-01T00:00:00.000Z","2026-02-04T00:00:00.000Z","2027-02-04T00:00:00.000Z");
const action=(tenGod:string,effect:OutlookEffect,visibility:OutlookStemAction["visibility"]="visible"):OutlookStemAction=>({tenGod,effect,visibility,stem:visibility === "visible"?"丙":"庚",evidenceIndexes:[],blockerIndexes:[],satisfiedConditionIndexes:[],summaryBasis:true});
function judgment(actions:OutlookStemAction[],pathId="resource-output",effect:OutlookEffect="mixed"):LocalOutlookJudgment {
  const axis:OutlookAxisFinding={id:`pattern:${pathId}`,axis:"pattern",effect,ruleId:"test",pathId,summary:"",sourceIds:[],evidence:[],blockers:[],satisfiedConditions:[],unresolvedConditions:[],rescues:[],stemActions:{version:"hakimi.outlook-stem-actions/0.1.0",items:actions}};
  // Projection inputs deliberately contain no reusable prose. Every tested
  // sentence must come from action/mechanism/context, not source text parsing.
  return {primaryAxis:"pattern",axes:[axis]} as LocalOutlookJudgment;
}
function background(j:LocalOutlookJudgment):LocalOutlookJudgment {
  const result=structuredClone(j),axis=result.axes[0]!;
  axis.taskLinks={version:"hakimi.outlook-natal-task-links/0.1.0",natalTaskVersion:"test",items:[{id:"held-output",taskId:"test",relations:[{operation:"control",contributesPressure:true,from:{origin:{kind:"background"},tenGod:"正印",visibility:"visible"},to:{group:"output"}}]}]} as unknown as NonNullable<OutlookAxisFinding["taskLinks"]>;
  return result;
}

it("keeps hidden support and visible pressure as independent concrete possibilities without changing the effect",()=>{
  const source=judgment([action("正印","obstructs"),action("伤官","assists","main_hidden")]),before=JSON.stringify(source);
  const work=buildConcretePeriodProse({judgment:source,domain:"career",age});
  expect(work.text).toContain("机会：提出的新方案");expect(work.text).toContain("阻力：被要求补资料");
  expect(work.facts.find(f=>f.kind === "opportunity")).toMatchObject({actor:"伤官",visibility:"main_hidden",actionIndex:1});
  expect(work.headline).toContain("补资料");expect(JSON.stringify(source)).toBe(before);
});

it("keeps each neutral current theme and attaches persistent pressure to that task instead of repeating an old sentence",()=>{
  const official=buildConcretePeriodProse({judgment:background(judgment([action("正官","neutral")],"resource-output","obstructs")),domain:"career",age});
  const urgent=buildConcretePeriodProse({judgment:background(judgment([action("七杀","neutral")],"resource-output","obstructs")),domain:"career",age});
  expect(official.text).toContain("审核");expect(official.text).toContain("当前重点");
  expect(urgent.text).toContain("集中任务");expect(urgent.text).toContain("临时急任务");
  expect(official.text).not.toBe(urgent.text);expect(official.headline).not.toBe(urgent.headline);
  expect(official.facts.some(f=>f.actionIndex===null&&f.relationId==="held-output:0")).toBe(true);
});

it("interprets wealth actors through their actual path rather than promising cash in every chart",()=>{
  for(const path of ["resource-wealth","official-resource","killings-resource","food-killings"]){
    const result=buildConcretePeriodProse({judgment:judgment([action("偏财","assists")],path,"assists"),domain:"wealth",age});
    expect(result.text).not.toMatch(/新客户|新增收入|到账|结算|额外订单/u);
    expect(result.text).toMatch(/课程|工具|费用|帮助/u);
  }
  const needed={preferredPathId:"resource-output",task:"resource_first"} as unknown as NatalWealthResourceTask;
  const result=buildConcretePeriodProse({judgment:judgment([action("正财","obstructs")]),domain:"wealth",age,task:needed});
  expect(result.text).toContain("挪用了原本留给学习、工具和帮助的费用");expect(result.text).not.toContain("款项");
  const normal=buildConcretePeriodProse({judgment:judgment([action("正财","assists")],"food-wealth","assists"),domain:"wealth",age});
  expect(normal.text).toContain("有已约定工资、货款、报销或还款时");
});

it("does not project adult partnership money or romance onto children, unknown age or retired context",()=>{
  const child=buildLocalReadingAgeContext("2019-12-22T00:00:00.000Z","2026-02-04T00:00:00.000Z","2027-02-04T00:00:00.000Z");
  const unknown=buildLocalReadingAgeContext(null,"2026-02-04T00:00:00.000Z","2027-02-04T00:00:00.000Z");
  for(const input of [{age:child},{age:unknown},{age,work:"retired" as const}])for(const effect of ["assists","obstructs","neutral"] as const){
    const money=buildConcretePeriodProse({...input,judgment:judgment([action("劫财",effect)],"resource-output",effect),domain:"wealth"});
    expect(money.text+money.headline).not.toMatch(/出资|垫付|分账|利润|订单|客户/u);
    expect(money.text).toMatch(/用品|活动|分工/u);
  }
  const relationship=buildConcretePeriodProse({judgment:judgment([action("食神","assists")]),domain:"relationship",age:child});
  expect(relationship.text).not.toMatch(/恋爱|结婚|婚期|伴侣/u);
});

it("keeps separated relationship context about handover rather than resuming intimacy",()=>{
  for(const change of ["insufficient","progression","friction","adjustment"] as const){
    const verdict={relationshipState:"separated",relationshipChange:change} as BriefAnnualDomainVerdict;
    const result=buildConcretePeriodProse({judgment:judgment([action("食神","assists")]),domain:"relationship",age,verdict});
    expect(result.text+result.headline).not.toMatch(/一起吃饭|稳定.*陪伴|见面.*推进/u);
    expect(result.text).toContain("交接");
  }
});

it("narrows work/money captions when the comprehensive axis is favorable but these domains lack mapped support",()=>{
  for(const overall of ["assists","mixed"] as const)for(const patternEffect of ["obstructs","neutral","unresolved"] as const){
    const source=judgment([action("正印",patternEffect)],"resource-output",patternEffect);
    source.primaryAxis="seasonal";source.axes.push({...source.axes[0]!,id:"seasonal:test",axis:"seasonal",effect:overall});
    const result=buildConcretePeriodProse({judgment:source,domain:"career",age});
    const caption=concretePeriodCaption(overall,result.facts);
    expect(caption).not.toMatch(/相对较顺|有推进机会/u);expect(caption).toContain("综合");
    expect(source.axes[1]!.effect).toBe(overall);expect(result.facts.some(f=>f.kind === "opportunity")).toBe(false);
  }
});

it("does not manufacture career pressure from a neutral role when independent life signals are available",()=>{
  for(const god of ["正印","偏印","正官","七杀"]){
    const result=buildConcretePeriodProse({judgment:judgment([action(god,"neutral")],"resource-output","neutral"),domain:"career",age,lifeSignals:{events:[],horizon:"year"}});
    expect(result.sentences?.some(sentence=>sentence.kind === "caution")).toBe(false);
    expect(result.headline).not.toMatch(/受制|制约|受限|卡/u);
    expect(result.sentences?.every(sentence=>sentence.sources[0]?.detail?.includes("visible/neutral"))).toBe(true);
  }
});

it("names only the supported domain in a mixed month caption",()=>{
  const result=buildConcretePeriodProse({judgment:judgment([action("伤官","assists")],"resource-output","assists"),domain:"career",age});
  const caption=concretePeriodCaption("mixed",result.facts);
  expect(caption).toContain("事业有局部机会");expect(caption).not.toContain("财运有");expect(caption).toContain("牵制");
});

it("does not announce support from a mixed protect-resource axis with only pressure and conditional relief",()=>{
  const source=judgment([action("食神","obstructs"),action("偏财","obstructs","main_hidden")],"hurting-resource","mixed");
  source.axes[0]!.summary="庚食神继续增加输出，护身制伤问题仍在；缓解尚有成立条件。";
  const prose=buildConcretePeriodProse({judgment:source,domain:"career",age}),before=JSON.stringify(source);
  expect(prose.facts.some(fact=>fact.kind === "opportunity")).toBe(false);
  for(const facts of [prose.facts,[]]){
    expect(concretePeriodCaption("mixed",facts)).toContain("综合取舍仍有条件");
    expect(concretePeriodCaption("mixed",facts)).not.toContain("支持");
    expect(concreteDirectionExplanation(source,facts)).toBe(`综合判断还保留以下配合与限制：${source.axes[0]!.summary}`);
  }
  expect(JSON.stringify(source)).toBe(before);
  const actualSupport=structuredClone(source);actualSupport.axes[0]!.stemActions!.items[1]=action("正印","assists","main_hidden");
  expect(concreteDirectionExplanation(actualSupport,prose.facts)).toContain("综合支持来自庚正印的实际作用");
  const favorable=structuredClone(source);favorable.axes[0]!.effect="assists";
  expect(concreteDirectionExplanation(favorable,prose.facts)).toContain("综合支持来自格局配合");
  expect(concretePeriodCaption("assists",prose.facts)).toContain("综合另有支持条件");
});

it("separates new annual opportunities from monthly settlement and excludes special support paths and non-income contexts",()=>{
  const annual=judgment([action("偏财","assists")],"food-wealth","assists"),monthly=judgment([action("正财","assists")],"food-wealth","assists");
  const result=concreteFinancialYearMonthContrast({annual,judgment:monthly,age});
  expect(result).toContain("已有款项的确认和结算");expect(result).toContain("不能把新合作的线索当作已经到账");
  expect(concreteFinancialYearMonthContrast({annual,judgment:monthly,age,work:"retired"})).toBe("");
  expect(concreteFinancialYearMonthContrast({annual,judgment:judgment([action("正财","assists")],"official-resource","assists"),age})).toBe("");
});
