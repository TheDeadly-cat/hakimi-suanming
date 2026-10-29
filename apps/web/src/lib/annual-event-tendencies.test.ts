import {beforeAll,expect,it} from "vitest";
import {calculateChart} from "@hakimi/bazi-core";
import {storedRevisionRecordSchema} from "@hakimi/contracts";
import {WORKING_DEFAULT_RULE_PROFILE} from "@hakimi/rule-profiles";
import {buildBaziPreliminaryAssessment} from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import {buildLocalAnnualOutlookRange} from "./local-annual-outlook";
import {buildAnnualDomainReading} from "./local-annual-domain-reading";
import {buildAnnualEventReading} from "./local-annual-event-reading";
import {buildAnnualLifeStory} from "./annual-life-story";
import {buildBriefAnnualReading,type BuildBriefAnnualReadingInput} from "./brief-annual-reading";
import {buildAnnualReaderAnswer} from "./annual-reader-answer";
import {createAnnualRelationshipTimingBuilder} from "./annual-relationship-timing";
import {buildAnnualEventTendencies,type BuildAnnualEventTendenciesInput,type EventTendencyCategory} from "./annual-event-tendencies";

const cases=new Map<string,BuildBriefAnnualReadingInput>();
beforeAll(async()=>{
  for(const [id,date,time,sex,years] of [
    ["B","1995-05-18","08:26","male",[2029,2031,2032,2035]],
    ["A","1995-08-18","08:26","unspecified",[2026,2028,2031]],
    ["official","1971-04-09","14:26","male",[2029,2032]],
    ["food","1970-12-08","08:26","male",[2026]],
    ["protect","1957-09-13","00:26","male",[2032]],
    ["moderate","1982-10-02","10:26","male",[2032]],
    ["child","2019-12-22","11:23","female",[2025,2037]]
  ] as const){
    const chart=await calculateChart({schemaVersion:"1.0.0",calendarType:"gregorian",date,time,timePrecision:"exact_minute",timeZone:"Asia/Shanghai",sex,lunarLeapMonth:false,
      location:{label:"Synthetic event-tendency fixture",latitude:null,longitude:null,precision:"unknown"},sourceNote:"synthetic"},WORKING_DEFAULT_RULE_PROFILE);
    const revision=storedRevisionRecordSchema.parse({...chart,schemaVersion:"1.0.0",id:crypto.randomUUID(),caseId:crypto.randomUUID(),revisionNumber:1,createdAt:"2026-10-20T00:00:00Z"});
    const assessment=buildBaziPreliminaryAssessment(revision);
    for(const yearNumber of years){
      const year=(await buildLocalAnnualOutlookRange(revision,assessment,yearNumber,yearNumber)).years[0]!,domains=buildAnnualDomainReading({revision,assessment,year});
      const events=buildAnnualEventReading({revision,assessment,year,domains}),source={revision,assessment,year,domains,events};
      cases.set(`${id}-${yearNumber}`,{...source,story:buildAnnualLifeStory(source)});
    }
  }
},60000);
const parts=(key:string)=>buildBriefAnnualReading(cases.get(key)!).branches.flatMap(branch=>branch.segments);
const event=(key:string,category:EventTendencyCategory,index=0)=>parts(key)[index]!.eventTendencies.find(item=>item.category===category)!;
function pureInput(key:string,index=0):BuildAnnualEventTendenciesInput{
  const input=cases.get(key)!,part=parts(key)[index]!,segment=input.year.judgmentSegments.find(item=>item.branchId===part.branchId&&item.id===part.id)!;
  const answer=buildAnnualReaderAnswer({...input,branchId:part.branchId,segmentId:part.id})!;
  return {revision:input.revision,year:input.year,segment,age:part.age,eventSegment:input.events.branches.find(branch=>branch.id===part.branchId)!.segments.find(item=>item.id===part.id)!,
    timing:createAnnualRelationshipTimingBuilder(input.revision,input.assessment)(input.year,segment),work:"unspecified",relationship:"unspecified",
    natalTask:answer.originals.natalTask??null,rescueTrace:answer.originals.rescueTrace,sources:{career:part.domains[0]!,wealth:part.domains[1]!,relationship:part.domains[2]!}};
}
it("returns all seven independent scoped event items with genuine source evidence and unchanged originals",()=>{
  const input=cases.get("B-2032")!,saved=structuredClone(input),part=parts("B-2032")[0]!;
  expect(part.eventTendencies.map(item=>item.category)).toEqual(["promotion","job_change","money_inflow","money_loss","romance","commitment","separation"]);
  for(const item of part.eventTendencies){
    expect(item.scope).toMatchObject({year:2032,branchId:part.branchId,segmentId:part.id,startInstant:part.startInstant,endExclusiveInstant:part.endExclusiveInstant});
    expect(item.sourceSubjects).toEqual(part.domains.find(domain=>domain.domain===item.domain)!.sourceSubjects);
    expect(item.eventIds).toEqual(part.domains.find(domain=>domain.domain===item.domain)!.eventIds);
    for(const id of [...item.supportEvidenceIds,...item.counterEvidenceIds])expect(item.evidence.some(row=>row.id===id)).toBe(true);
    expect(item.conditions.join()).toContain("本地解释规则");
  }
  expect(input).toEqual(saved);
});
it("does not infer promotion or a job change from supported food output or a handover alone",()=>{
  const b=parts("B-2029");expect(b).toHaveLength(2);
  for(const part of b){
    expect(part.eventTendencies.find(item=>item.category==="promotion")!.level).toBe("none");
    expect(part.eventTendencies.find(item=>item.category==="job_change")!.level).toBe("none");
  }
  const official=parts("official-2032").map(part=>part.eventTendencies.find(item=>item.category==="promotion")!);
  expect(official.map(item=>item.level)).toEqual(["weak","possible"]);
  expect(official[0]!.counterEvidenceIds.length).toBeGreaterThan(0);expect(official[1]!.counterEvidenceIds).toEqual([]);
  expect(official[1]!.text).toContain("晋升或转正候选");
});
it("uses the actual annual month-pillar clash for a job-change candidate, preserving its original fact identity",()=>{
  const item=event("B-2031","job_change");expect(item.level).toBe("possible");expect(item.text).toContain("新的单位");
  const original=cases.get("B-2031")!.events.branches[0]!.segments[0]!.items.filter(item=>item.domain==="career").flatMap(item=>item.origin.relationFactIds);
  const fact=item.evidence.find(row=>row.kind==="pillar_relation")!;
  expect(original).toContain(fact.relationFactId);expect(fact.original).toContain("本命月柱辛巳");
});
it("separates return opportunities from wealth controlling support, moderating resources or increasing killing load",()=>{
  expect(event("B-2032","money_inflow").level).toBe("possible");
  expect(event("B-2032","money_inflow").text).toContain("结算到账");
  for(const key of ["official-2029","food-2026","protect-2032","moderate-2032"]){
    expect(event(key,"money_inflow").level).toBe("none");
    expect(event(key,"money_inflow").supportEvidenceIds).toEqual([]);
  }
  expect(event("food-2026","money_loss").level).toBe("possible");
  expect(event("food-2026","money_loss").text).toContain("协作或临时周转费用");
  expect(event("moderate-2032","money_loss").level).toBe("none");
});
it("gives distinct relationship event candidates without borrowing career direction or an inactive lens's background",()=>{
  expect(event("B-2032","romance").level).toBe("possible");
  expect(event("B-2032","commitment").level).toBe("weak");
  expect(event("B-2032","separation").level).toBe("none");
  expect(event("B-2035","separation").level).toBe("weak");
  expect(event("B-2035","separation").text).toContain("考虑分开");
  const backward=parts("A-2026").find(part=>part.branchId==="backward")!;
  const romance=backward.eventTendencies.find(item=>item.category==="romance")!;
  expect(romance.lensIds).toEqual(["authority"]);expect(romance.counterEvidenceIds).toEqual([]);
  expect(romance.evidence.every(row=>row.lensId==="authority")).toBe(true);
  expect(backward.eventTendencies.find(item=>item.category==="separation")!.level).toBe("none");
  const unknown=parts("A-2028");
  for(const part of unknown.filter(part=>part.branchId==="backward"))for(const category of ["romance","commitment"]){
    const item=part.eventTendencies.find(item=>item.category===category)!;
    expect(item.lensIds).toEqual(["wealth","authority"]);
    expect(item.evidence.filter(row=>item.counterEvidenceIds.includes(row.id)).every(row=>row.lensId==="wealth")).toBe(true);
    expect(item.text).toContain("其中一种关系视角另提示");
  }
  const combined=parts("A-2031").flatMap(part=>part.eventTendencies).filter(item=>item.category==="separation"&&item.level==="possible");
  expect(combined.length).toBeGreaterThan(0);
  expect(combined.every(item=>!item.text.includes("单一变化线索仍较弱"))).toBe(true);
});
it("keeps children and retirement outside adult employment candidates and narrows a crossing year to its adult interval",()=>{
  const child=parts("child-2025")[0]!;
  expect(child.eventTendencies.every(item=>item.level==="not_applicable"&&item.applicableIntervals.length===0)).toBe(true);
  const crossing=parts("child-2037")[0]!,adult=crossing.age.segments.find(part=>part.stage==="adult")!;
  expect(crossing.eventTendencies.every(item=>item.scope.startInstant===crossing.startInstant
    &&item.applicableIntervals[0]!.startInstant===adult.startInstant)).toBe(true);
  const retired=pureInput("B-2032");retired.work="retired";
  const result=buildAnnualEventTendencies(retired);
  expect(result.find(item=>item.category==="promotion")!.level).toBe("not_applicable");
  expect(result.find(item=>item.category==="job_change")!.level).toBe("not_applicable");
  expect(result.find(item=>item.category==="money_inflow")!.text).not.toMatch(/客户|工资|晋升/);
  retired.relationship="separated";
  expect(buildAnnualEventTendencies(retired).find(item=>item.category==="commitment")!.level).toBe("not_applicable");
});
it("rejects another interval, branch or original relationship source instead of silently generating a candidate",()=>{
  const input=pureInput("B-2032"),saved=structuredClone(input);
  const wrong=structuredClone(input);wrong.timing.scope.branchId="backward";expect(()=>buildAnnualEventTendencies(wrong)).toThrow("不一致");
  const timing=structuredClone(input);timing.timing.scope.endExclusiveInstant=input.segment.startInstant;expect(()=>buildAnnualEventTendencies(timing)).toThrow("不一致");
  const age=structuredClone(input);age.age.segments[0]!.startInstant="1900-01-01T00:00:00Z";expect(()=>buildAnnualEventTendencies(age)).toThrow();
  expect(input).toEqual(saved);
});
