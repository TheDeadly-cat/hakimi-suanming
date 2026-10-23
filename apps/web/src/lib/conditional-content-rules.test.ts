import { expect, it } from "vitest";
import { CONDITIONAL_CONTENT_RULES, evaluateConditionalContentRules, lookupConditionalContentRule } from "./conditional-content-rules";
import { buildConcretePeriodProse, type ConcretePeriodInput } from "./concrete-period-prose";
import { buildLocalReadingAgeContext } from "./local-reading-age-context";
import type { LocalOutlookJudgment, OutlookEffect, OutlookStemAction } from "./local-outlook-judgment";
import type { AnnualEventTendency } from "./annual-event-tendencies";
import type { AnnualRelationshipTiming } from "./annual-relationship-timing";
import type { NatalWealthResourceTask } from "../../../../packages/bazi-interpretation/src/natal-wealth-resource-task";
import type { OutlookRescueTraceBundle } from "./outlook-rescue-trace";

// Explicit synthetic projection inputs test expression constraints, not a new chart.
const start="2032-02-04T00:00:00.000Z",end="2033-02-04T00:00:00.000Z";
const age=buildLocalReadingAgeContext("1990-01-01T00:00:00.000Z",start,end);
const actor=(god:string,effect:OutlookEffect,visibility:OutlookStemAction["visibility"]="visible"):OutlookStemAction=>({stem:visibility==="visible"?"壬":"癸",tenGod:god,visibility,effect,evidenceIndexes:[0],blockerIndexes:effect==="obstructs"?[0]:[],satisfiedConditionIndexes:[],summaryBasis:true});
function input(god="正财",effect:OutlookEffect="assists",pathId="food-wealth"):ConcretePeriodInput {
  return {domain:"wealth",age,work:"unspecified",judgment:{version:"synthetic",policyVersion:"synthetic",sourceBinding:{revisionId:"synthetic-one",chartResultHash:"hash-one",includeHour:true},targetRef:{nodeType:"year",id:"synthetic-year"},backgroundRefs:[],interval:{startInstant:start,endExclusiveInstant:end},label:"较顺",primaryAxis:"pattern",headline:"",summary:"",conflicts:[],conditions:[],coverageGaps:[],sourceIds:["original-method"],
    axes:[{id:"pattern:synthetic",axis:"pattern",effect,ruleId:"synthetic",pathId,summary:"",sourceIds:["original-method"],evidence:["exact supporting original"],blockers:["exact contrary original"],satisfiedConditions:[],unresolvedConditions:[],rescues:[],stemActions:{version:"hakimi.outlook-stem-actions/0.1.0",items:[actor(god,effect)]}}]} as unknown as LocalOutlookJudgment};
}
function eventFor(i:ConcretePeriodInput,category:AnnualEventTendency["category"]="money_inflow"):AnnualEventTendency {
  return {id:"synthetic-event",version:"hakimi.annual-event-tendencies/0.1.0",category,domain:category==="promotion"?"career":category==="romance"?"relationship":"wealth",level:"possible",direction:"supported",label:"candidate",text:"已有约定的款项有确认机会。",scope:{year:2032,branchId:"locked",segmentId:"segment-one",startInstant:start,endExclusiveInstant:end},applicableIntervals:[{startInstant:start,endExclusiveInstant:end}],workState:"unspecified",relationshipState:"unspecified",sourceSubjects:[],eventIds:[],sourceVersions:[],sourceIds:["event-method"],evidence:[{id:"support-one",kind:"actor",use:"support",origin:"year",nodeRef:i.judgment.targetRef,axisId:i.judgment.axes[0]!.id,actionIndex:0,signalId:null,lensId:null,original:"exact support"}],supportEvidenceIds:["support-one"],counterEvidenceIds:[],lensIds:[],ruleIds:[],conditions:[]};
}
it("registers exactly 24 usable conditional rules with explicit method versus modern-expression boundaries",()=>{
  expect(CONDITIONAL_CONTENT_RULES).toHaveLength(24);
  expect(new Set(CONDITIONAL_CONTENT_RULES.map(r=>r.id)).size).toBe(24);
  for(const r of CONDITIONAL_CONTENT_RULES){
    expect(lookupConditionalContentRule(r.id)).toBe(r);
    for(const field of [r.trigger,r.support,r.exclusions,r.backgrounds,r.allowedExpressions,r.forbiddenInferences,r.sourceBasis.existingEvidence,r.counterexamples])expect(field.length).toBeGreaterThan(0);
    expect(r.sourceBasis.kind).toBe("local_expression_constraint");
  }
  expect(lookupConditionalContentRule("unregistered")).toBeNull();
});
it("uses all ten actor rules with their own five effects, never the favorable overall label",()=>{
  for(const god of ["正印","偏印","食神","伤官","正财","偏财","正官","七杀","比肩","劫财"])for(const effect of ["assists","obstructs","mixed","neutral","unresolved"] as const){
    const i=input(god,effect),before=JSON.stringify(i),result=buildConcretePeriodProse(i),policy=result.contentRules!.actionPolicies[0]!;
    expect(policy.ruleIds.some(id=>id.startsWith("role-"))).toBe(true);
    expect(result.facts.every(f=>policy.allowedKinds.includes(f.kind))).toBe(true);
    if(effect==="neutral"||effect==="unresolved"){
      expect(result.facts.every(f=>f.kind==="topic")).toBe(true);
      expect(policy.ruleIds).toContain("undirected-is-topic");
      expect(result.headline).not.toMatch(/产生两套|容易遇到|垫付|到账机会/u);
    }
    expect(JSON.stringify(i)).toBe(before);
    expect(JSON.parse(JSON.stringify(result.contentRules))).toEqual(result.contentRules);
  }
});
it("gives exact task priority over same-name wealth, and rejects unrelated task routing",()=>{
  const cases=[
    ["hurting-wealth","wealth_first","trim_redundant_preparation"],
    ["hurting-resource","resource_first","protect_needed_support"],
    ["official-resource","official_joint","fund_execution_support"],
  ] as const;
  for(const [path,task,mechanism] of cases){
    const i=input("偏财","neutral",path);i.task={task,preferredPathId:path,sourceIds:["task-method"]} as NatalWealthResourceTask;
    const r=buildConcretePeriodProse(i);
    expect(r.contentRules!.actionPolicies[0]).toMatchObject({mechanism,incomeClaimAllowed:false,allowedKinds:["topic"]});
    expect(r.text).not.toMatch(/新客户|额外订单|到账|已经节省/u);
    expect(r.contentRules!.decisions.find(d=>d.support.some(f=>f.kind==="task"))?.sourceIds).toContain("task-method");
  }
  const wrong=input("偏财","assists","peer-output-wealth");wrong.task={task:"wealth_first",preferredPathId:"hurting-wealth",sourceIds:["unrelated-task"]} as NatalWealthResourceTask;
  expect(evaluateConditionalContentRules(wrong).actionPolicies[0]!.mechanism).toBe("role");
  expect(evaluateConditionalContentRules(wrong).decisions.flatMap(d=>d.sourceIds)).not.toContain("unrelated-task");
});
it("retains standards conflict instead of ordinary output failure, and necessary support instead of excess preparation",()=>{
  const standards=buildConcretePeriodProse({...input("食神","obstructs","official-wealth"),domain:"career"});
  expect(standards.text).toContain("既定规则");expect(standards.facts[0]!.ruleIds).toContain("output-authority-conflict");
  const guidance=buildConcretePeriodProse({...input("正印","obstructs","official-resource"),domain:"career"});
  expect(guidance.text).toContain("必要指导没接上");expect(guidance.facts[0]!.ruleIds).toContain("necessary-resource");
});
it("does not reuse an income event for financial actors in support-use or food-killing paths",()=>{
  for(const path of ["official-resource","killings-resource","food-killings","resource-wealth"]){
    const i=input("正财","assists",path),event=eventFor(i);i.lifeSignals={events:[event],horizon:"year"};
    const result=buildConcretePeriodProse(i),policy=result.contentRules!.eventPolicies[0]!;
    expect(policy.allowed).toBe(false);expect(result.text).not.toMatch(/工资|合同款|欠款|新增进账机会/u);
    expect(result.contentRules!.decisions.find(d=>d.targetId===event.id)!.exclusions).toContain("本期财作用不是可表达收入的作用或身份");
  }
  const normal=input();normal.lifeSignals={events:[eventFor(normal)],horizon:"year"};
  expect(buildConcretePeriodProse(normal).contentRules!.eventPolicies[0]!.allowed).toBe(true);
  expect(buildConcretePeriodProse(normal).sentences![0]!.ruleIds).toContain("independent-event-evidence");
  normal.lifeSignals.events[0]!.counterEvidenceIds.push("missing-counter");
  expect(buildConcretePeriodProse(normal).contentRules!.eventPolicies[0]!.allowed).toBe(false);
});
it("does not promote output alone to a promotion or reuse evidence from a neighboring interval",()=>{
  const output={...input("食神","assists"),domain:"career" as const};output.lifeSignals={events:[eventFor(output,"promotion")],horizon:"year"};
  expect(buildConcretePeriodProse(output).contentRules!.eventPolicies[0]!.allowed).toBe(false);
  const authority={...input("正官","assists","official-resource"),domain:"career" as const},e=eventFor(authority,"promotion");authority.lifeSignals={events:[e],horizon:"year"};
  expect(buildConcretePeriodProse(authority).contentRules!.eventPolicies[0]!.allowed).toBe(true);
  e.scope.startInstant="2032-03-01T00:00:00.000Z";
  expect(buildConcretePeriodProse(authority).contentRules!.eventPolicies[0]!.allowed).toBe(false);
});
it("keeps only current active relationship lenses and rejects a career actor masquerading as a relationship signal",()=>{
  const i={...input(),domain:"relationship" as const},j=i.judgment;
  const timing={sourceBinding:{...j.sourceBinding,sex:"unspecified"},scope:{year:2032,branchId:"locked",segmentId:"segment-one",startInstant:start,endExclusiveInstant:end,targetRef:j.targetRef,backgroundRefs:[]},lenses:[
    {id:"wealth",label:"财星视角",signals:[{id:"old",source:"dayun",nodeRef:{nodeType:"dayun",id:"old"},kind:"star_stem_contact",text:"背景冲"}],triggerSignalIds:[],backgroundSignalIds:["old"],sourceIds:["wealth-method"]},
    {id:"authority",label:"官星视角",signals:[{id:"entry",source:"year",nodeRef:j.targetRef,kind:"star_entry",relevance:"primary_star",text:"年星进入"}],triggerSignalIds:["entry"],backgroundSignalIds:[],sourceIds:["authority-method"]},
  ]} as unknown as AnnualRelationshipTiming;
  const e=eventFor(i,"romance");i.lifeSignals={events:[e],horizon:"year",relationshipTiming:timing};
  const first=buildConcretePeriodProse(i);expect(first.contentRules!.relationshipLensIds).toEqual(["authority"]);expect(first.contentRules!.eventPolicies[0]!.allowed).toBe(false);
  e.evidence[0]={...e.evidence[0]!,kind:"relationship_signal",lensId:"authority",signalId:"entry",axisId:null,actionIndex:null};
  expect(buildConcretePeriodProse(i).contentRules!.eventPolicies[0]!.allowed).toBe(true);
  e.evidence.push({...e.evidence[0]!,id:"other-lens-background",use:"counter",origin:"dayun",lensId:"wealth",signalId:"old",nodeRef:{nodeType:"dayun",id:"old"} as unknown as typeof j.targetRef});e.counterEvidenceIds=["other-lens-background"];
  expect(buildConcretePeriodProse(i).contentRules!.eventPolicies[0]!.allowed).toBe(false);
  e.evidence.pop();e.counterEvidenceIds=[];
  expect(first.contentRules!.decisions.find(d=>d.targetId==="wealth")!.status).toBe("excluded");
  timing.scope.startInstant="2032-03-01T00:00:00.000Z";
  expect(()=>buildConcretePeriodProse(i)).toThrow("关系依据不是同源同段");
});
it("keeps retired and child material scenes and rejects a missing verified work context",()=>{
  const i=input(),e=eventFor(i);e.workState="retired";i.lifeSignals={events:[e],horizon:"year"};
  expect(buildConcretePeriodProse(i).contentRules!.eventPolicies[0]!.allowed).toBe(false);
  i.work="retired";expect(buildConcretePeriodProse(i).text).not.toMatch(/工资|合同款|额外订单/u);
  i.age=buildLocalReadingAgeContext("2020-12-22T00:00:00.000Z",start,end);
  expect(buildConcretePeriodProse(i).contentRules!.adultScenes).toBe(false);
  expect(buildConcretePeriodProse(i).text).not.toMatch(/工资|客户|利润/u);
});
it("retains hidden support without assigning it to the neutral visible actor, with exact original refs",()=>{
  const i={...input("比肩","neutral"),domain:"career" as const};i.judgment.axes[0]!.stemActions!.items.push(actor("食神","assists","main_hidden"));
  const result=buildConcretePeriodProse(i),support=result.facts.find(f=>f.kind==="opportunity")!;
  expect(support).toMatchObject({actionIndex:1,actor:"食神",visibility:"main_hidden"});
  expect(support.ruleIds).toContain("hidden-is-auxiliary");
  expect(result.contentRules!.decisions.find(d=>d.ruleId==="role-food")!.support[1]).toMatchObject({id:"pattern:synthetic:evidence:0",detail:"exact supporting original"});
  expect(result.facts.find(f=>f.actionIndex===0)!.kind).toBe("topic");
});
it("keeps rescue constraints and exact source binding instead of treating a candidate as realized help",()=>{
  const i=input("偏财","obstructs","hurting-resource"),j=i.judgment;
  const rescue={version:"synthetic",sourceBinding:j.sourceBinding,targetRef:j.targetRef,backgroundRefs:[],interval:j.interval,scopeConditionRefs:[],items:[{id:"candidate",axisId:j.axes[0]!.id,kind:"wealth_resource_protection",candidateStatus:"constrained_candidate",constraintCheck:"checked",countsAsSupport:false,conditionRefs:[],blockerRefs:[{axisId:j.axes[0]!.id,field:"blockers",index:0}]}]} as unknown as OutlookRescueTraceBundle;
  i.lifeSignals={events:[],horizon:"year",rescueTrace:rescue};
  const result=buildConcretePeriodProse(i),decision=result.contentRules!.decisions.find(d=>d.ruleId==="rescue-is-candidate")!;
  expect(decision.allowedKinds).toEqual(["topic"]);expect(decision.counterFacts[0]!.detail).toBe("exact contrary original");
  expect(result.facts.some(f=>f.kind==="opportunity")).toBe(false);
  rescue.sourceBinding={...j.sourceBinding,revisionId:"different"};expect(()=>buildConcretePeriodProse(i)).toThrow("救应依据不是同源同段");
});
it("keeps same-stem background pressure on its original object instead of changing the target actor",()=>{
  const i={...input("比肩","neutral"),domain:"career" as const},axis=i.judgment.axes[0]!;
  axis.taskLinks={version:"synthetic",natalTaskVersion:"synthetic",items:[{id:"background-one",relations:[{operation:"control",contributesPressure:true,from:{stem:"壬",tenGod:"正印",visibility:"visible",origin:{kind:"background",nodeRef:{nodeType:"dayun",id:"old"}}},to:{stem:"辛",tenGod:"食神",group:"output"},refs:[{axisId:axis.id,field:"blockers",index:0}]}]}]} as unknown as NonNullable<typeof axis.taskLinks>;
  const result=buildConcretePeriodProse(i),background=result.facts.find(f=>f.relationId)!;
  expect(background).toMatchObject({kind:"caution",actionIndex:null,relationId:"background-one:0"});
  expect(background.ruleIds).toContain("persistent-background");
  expect(result.facts.find(f=>f.actionIndex===0)!.kind).toBe("topic");
  const decision=result.contentRules!.decisions.find(d=>d.ruleId==="persistent-background")!;
  expect(decision.support[0]!.origin).toBe("background:dayun");expect(decision.counterFacts[0]!.id).toBe(`${axis.id}:blockers:0`);
});
it("does not create events before birth or apply an adult candidate over an age transition",()=>{
  const i=input(),e=eventFor(i);i.lifeSignals={events:[e],horizon:"year"};
  i.age=buildLocalReadingAgeContext("2040-01-01T00:00:00.000Z",start,end);
  const unborn=buildConcretePeriodProse(i);expect(unborn.facts).toEqual([]);expect(unborn.text).toContain("不作个人经历");
  i.age=buildLocalReadingAgeContext("2014-12-22T00:00:00.000Z",start,end);
  const transition=buildConcretePeriodProse(i);expect(transition.contentRules!.adultScenes).toBe(false);
  expect(transition.contentRules!.eventPolicies[0]!.allowed).toBe(false);expect(transition.text).not.toMatch(/工资|货款|客户/u);
});
it("rejects background-only monthly income evidence and invalid original reference indices",()=>{
  const i=input(),event=eventFor(i);i.lifeSignals={events:[event],horizon:"month"};
  expect(buildConcretePeriodProse(i).contentRules!.eventPolicies[0]!.allowed).toBe(false);
  i.judgment.axes[0]!.stemActions!.items[0]!.evidenceIndexes=[100];
  expect(()=>buildConcretePeriodProse(i)).toThrow("角色原依据索引越界");
});
