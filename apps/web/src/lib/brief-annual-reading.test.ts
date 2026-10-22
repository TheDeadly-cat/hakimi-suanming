import { beforeAll, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type ResearchNoteRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlookRange } from "./local-annual-outlook";
import { buildAnnualDomainReading } from "./local-annual-domain-reading";
import { buildAnnualEventReading } from "./local-annual-event-reading";
import { buildAnnualLifeStory, type BuildAnnualLifeStoryInput } from "./annual-life-story";
import { buildReadingContextRecord, resolveReadingContext, type ReadingContextWork, type ReadingContextRelationship } from "./local-reading-context";
import { buildContextualReadingBundle } from "./local-contextual-reading-record";
import { buildBriefAnnualReading, type BuildBriefAnnualReadingInput } from "./brief-annual-reading";
import { buildAnnualReaderAnswer } from "./annual-reader-answer";

const cases=new Map<string,BuildBriefAnnualReadingInput & Pick<BuildAnnualLifeStoryInput,"domains">>();
beforeAll(async()=>{
  for(const [id,date,time,sex,years] of [
    ["b","1995-05-18","08:26","male",[2028,2029,2030,2032,2035]],
    ["a","1995-08-18","08:26","unspecified",[2026,2028]],
    ["child","2019-12-22","11:23","female",[2025,2037]],
    ["protect","1957-09-13","00:26","male",[2032]],
    ["moderate","1982-10-02","10:26","male",[2032]],
    ["official","1971-04-09","14:26","male",[2029,2032]],
    ["food","1970-12-08","08:26","male",[2026,2027]],
    ["joint","1944-08-09","04:26","male",[2028]]
  ] as const){
    const chart=await calculateChart({schemaVersion:"1.0.0",calendarType:"gregorian",date,time,timePrecision:"exact_minute",timeZone:"Asia/Shanghai",sex,lunarLeapMonth:false,
      location:{label:"Synthetic brief annual fixture",latitude:null,longitude:null,precision:"unknown"},sourceNote:"synthetic"},WORKING_DEFAULT_RULE_PROFILE);
    const revision=storedRevisionRecordSchema.parse({...chart,schemaVersion:"1.0.0",id:crypto.randomUUID(),caseId:crypto.randomUUID(),revisionNumber:1,createdAt:"2026-10-20T00:00:00Z"}),assessment=buildBaziPreliminaryAssessment(revision);
    for(const y of years){const year=(await buildLocalAnnualOutlookRange(revision,assessment,y,y)).years[0]!,domains=buildAnnualDomainReading({revision,assessment,year}),events=buildAnnualEventReading({revision,assessment,year,domains});
      const source={revision,assessment,year,domains,events};cases.set(`${id}-${y}`,{...source,story:buildAnnualLifeStory(source)});}
  }
},60000);
const segments=(input:BuildBriefAnnualReadingInput)=>buildBriefAnnualReading(input).branches.flatMap(branch=>branch.segments);
const text=(id:string)=>segments(cases.get(id)!).flatMap(segment=>segment.domains.map(domain=>domain.text)).join("\n");
async function contextFor(work:ReadingContextWork,relationship:ReadingContextRelationship="unspecified"){
  const base=cases.get("b-2032")!,body=await buildReadingContextRecord(base.revision,null,{work,relationship,fromYear:2032,toYear:2032,notes:"自由备注不选择规则：退休、升职、收入翻倍"});
  const note:ResearchNoteRecord={schemaVersion:"1.0.0",id:crypto.randomUUID(),caseId:base.revision.caseId,anchor:{kind:"revision",revisionId:base.revision.id},bodyFormat:"markdown",body,tags:["阅读背景"],sourceRefs:[],lifecycle:"active",editVersion:1,createdAt:"2026-10-20T00:00:00Z",updatedAt:"2026-10-20T00:00:00Z"};
  const context=(await resolveReadingContext({revision:base.revision,records:[note]})).latest;
  const contextual=buildContextualReadingBundle({revision:base.revision,assessment:base.assessment,comprehensive:null,context,annualDomains:{version:base.domains.version,revisionId:base.revision.id,chartResultHash:base.revision.manifest.resultHash,includeHour:true,startYear:2032,endYear:2032,years:[base.domains]},referenceYear:2032})!;
  const source={...base,contextual,events:buildAnnualEventReading({...base,contextual})};return {...source,story:buildAnnualLifeStory(source)};
}
it("gives B's distinct handover, trial, confirmation and responsibility years without changing any input",()=>{
  const source=cases.get("b-2029")!,saved=structuredClone(source),parts=segments(source);
  expect(parts).toHaveLength(2);expect(parts[0]!.endExclusiveInstant).toBe(parts[1]!.startInstant);
  expect(parts[0]!.domains[0]!.text).toContain("可能独立负责或调整分工");expect(parts[0]!.domains[0]!.text).toContain("熟悉本领较能发挥");
  expect(parts[1]!.domains[0]!.text).toContain("打断进度");expect(parts[0]!.domains[0]!.text).not.toContain("打断进度");
  expect(parts.map(part=>part.domains[0]!.verdict.direction)).toEqual(["favorable","mixed"]);
  expect(parts.map(part=>part.domains[1]!.verdict.focus)).toEqual(["spending","spending"]);
  expect(parts.map(part=>part.domains[1]!.verdict.direction)).toEqual(["favorable","mixed"]);
  const actors=source.year.judgmentSegments.map(segment=>segment.judgment.axes.find(axis=>axis.axis==="pattern")!.stemActions!.items.map(item=>({god:item.tenGod,effect:item.effect})));
  expect(actors[0]).toEqual(actors[1]);expect(actors[0]![0]).toMatchObject({god:"比肩",effect:"neutral"});
  const earlier=segments(cases.get("b-2028")!)[0]!;expect(earlier.domains[1]!.verdict.focus).toBe("spending");expect(earlier.domains[1]!.verdict.label).not.toMatch(/分配较顺|收入/);
  expect(text("b-2030")).toContain("试用");expect(text("b-2032")).toContain("确认");expect(text("b-2035")).not.toBe(text("b-2030"));expect(source).toEqual(saved);
});
it("keeps career acceptance separate from money confirmation, costs and allocation",()=>{
  const domains=segments(cases.get("b-2032")!)[0]!.domains;
  expect(domains[0]!.text).toContain("技能成果");expect(domains[1]!.text).toContain("若有约定报酬");expect(domains[1]!.text).toContain("确认兑现");expect(domains[1]!.text).toContain("分配");
  expect(domains[1]!.verdict).toMatchObject({direction:"mixed",focus:"returns",basis:"pattern"});
  expect(segments(cases.get("b-2030")!)[0]!.domains[1]!.verdict).toMatchObject({direction:"mixed",focus:"spending"});
  expect(domains[0]!.text).not.toBe(domains[1]!.text);expect(domains.map(x=>x.text).join()).not.toMatch(/必定|必然|一定|涨薪|升职|概率|收入翻倍/);
});
it("keeps separate relation signals and the actual opposed year versus background contact",()=>{
  const b=segments(cases.get("b-2032")!)[0]!.domains[2]!;expect(b.text).toContain("新相识");expect(b.text).toContain("共同生活");expect(b.text.length).toBeGreaterThanOrEqual(35);expect(b.relationshipSignalIds.length).toBeGreaterThan(0);expect(b.basisRefs).toEqual([]);
  expect(b.verdict).toMatchObject({direction:"neutral",relationshipChange:"progression",basis:"relationship_signals"});
  const changed=segments(cases.get("b-2035")!)[0]!.domains[2]!;expect(changed.text).toContain("改变联系或约见节奏");expect(changed.text).toContain("重议共同计划");expect(changed.verdict.relationshipChange).toBe("adjustment");
  const unknown=buildBriefAnnualReading(cases.get("a-2028")!);expect(unknown.branches.map(x=>x.id)).toEqual(["forward","backward"]);
  const forward=unknown.branches[0]!.segments[0]!.domains[2]!,backward=unknown.branches[1]!.segments[0]!.domains[2]!;
  expect(forward.text).toContain("原有相处节奏仍易变动");expect(backward.text).not.toContain("原有相处节奏仍易变动");expect(forward.text).not.toMatch(/一定结婚|必会分手/);
  expect(unknown.branches[0]!.segments[0]!.domains[0]!.verdict.direction).toBe("favorable");
  expect(unknown.branches[0]!.segments[0]!.caption).toBe("有机会，也有阻力");
  expect(forward.verdict.lensIds).toEqual(["wealth","authority"]);expect(backward.verdict.lensIds).toEqual(["wealth"]);
  const originalRelations=cases.get("a-2028")!.events.branches.find(branch=>branch.id==="backward")!.segments;
  for(const segment of originalRelations){const timing=segment.items.find(item=>item.relationshipTiming)!.relationshipTiming!;
    const lenses=timing.lenses.filter(lens=>lens.signals.some(signal=>signal.source==="dayun"&&signal.kind==="star_stem_contact"&&signal.relationType==="stem_clash"));
    expect(lenses.map(lens=>lens.id)).toEqual(["wealth"]);
    const brief=unknown.branches.find(branch=>branch.id==="backward")!.segments.find(item=>item.id===segment.id)!;
    expect(brief.domains[2]!.text).toContain("其中一种关系视角还提示");
  }
});
it("never joins an inactive relationship lens's background to another lens's annual trigger",()=>{
  const source=cases.get("a-2026")!,result=buildBriefAnnualReading(source);
  const inverse=source.events.branches.find(branch=>branch.id==="backward")!.segments[0]!.items.find(item=>item.relationshipTiming)!.relationshipTiming!;
  expect(inverse.lenses.filter(lens=>lens.triggerSignalIds.length).map(lens=>lens.id)).toEqual(["authority"]);
  expect(inverse.lenses.find(lens=>lens.id==="wealth")!.signals.some(signal=>signal.source==="dayun"&&signal.relationType==="stem_clash")).toBe(true);
  const forward=result.branches.find(branch=>branch.id==="forward")!.segments[0]!.domains[2]!,backward=result.branches.find(branch=>branch.id==="backward")!.segments[0]!.domains[2]!;
  expect(forward.verdict).toMatchObject({relationshipChange:"friction",lensIds:["authority"]});
  expect(backward.verdict).toMatchObject({relationshipChange:"progression",lensIds:["authority"]});
  expect(backward.text).not.toMatch(/分歧|磨合|反复/);expect(forward.text).toContain("磨合");
  for(const domain of [forward,backward])expect(domain.verdict.label).toContain("其中一种关系视角");
});
it("keeps the actual official-resource 2032 support but separates execution from necessary investment in both handover segments",()=>{
  const source=cases.get("official-2032")!,before=structuredClone(source),parts=segments(source);expect(parts).toHaveLength(2);
  expect(parts.map(part=>part.domains[0]!.verdict.direction)).toEqual(["mixed","favorable"]);
  expect(parts[0]!.domains[0]!.text).toContain("既有要求与做法变化");expect(parts[1]!.domains[0]!.text).not.toContain("既有要求与做法变化");
  for(const segment of parts){const judgment=source.year.judgmentSegments.find(item=>item.id===segment.id)!.judgment,pattern=judgment.axes.find(axis=>axis.axis==="pattern")!;
    expect(pattern.pathId).toBe("official-resource");expect(pattern.stemActions!.items.find(item=>item.visibility==="visible")).toMatchObject({tenGod:"偏印",effect:"assists"});
    expect(segment.domains[0]!.text).toContain("具体指导较能接上职责");expect(segment.domains[1]!.text).toContain("学习、工具和配套投入较能用到执行环节");
    expect(segment.domains[1]!.text).not.toBe(segment.domains[0]!.text);expect(segment.domains[1]!.text).not.toMatch(/收入|报酬|涨薪/);
  }
  expect(source).toEqual(before);
});
it("classifies actual wealth pressure on support or killing load without inventing return opportunities",()=>{
  const official=cases.get("official-2029")!,saved=structuredClone(official),part=segments(official)[0]!;
  const pattern=official.year.judgmentSegments[0]!.judgment.axes.find(axis=>axis.axis==="pattern")!;
  expect(pattern.pathId).toBe("official-resource");
  expect(pattern.stemActions!.items[0]).toMatchObject({stem:"己",tenGod:"正财",effect:"obstructs"});
  expect(pattern.taskLinks!.items.flatMap(link=>link.relations).some(edge=>edge.contributesPressure
    &&edge.from.origin.kind==="target"&&edge.from.stem==="己"&&edge.from.visibility==="visible"
    &&edge.to.stem==="壬"&&edge.to.group==="resource")).toBe(true);
  expect(part.domains[1]!.verdict).toMatchObject({direction:"mixed",focus:"support_use",label:"有支持机会，也有受阻环节"});
  expect(part.domains[1]!.text).toContain("现有安排占去必要工具或指导");
  expect(part.domains[1]!.verdict.label).not.toMatch(/回报|兑现/);expect(official).toEqual(saved);
  for(const year of [2026,2027]){
    const source=cases.get(`food-${year}`)!,before=structuredClone(source),segment=segments(source)[0]!;
    const answer=buildAnnualReaderAnswer({...source,branchId:segment.branchId,segmentId:segment.id})!;
    const axis=source.year.judgmentSegments[0]!.judgment.axes.find(axis=>axis.axis==="pattern")!,actor=axis.stemActions!.items[0]!;
    expect(axis.pathId).toBe("food-killings");expect(actor.effect).toBe("obstructs");
    expect(answer.originals.rescueTrace!.items.some(item=>item.axisId===axis.id&&item.kind==="wealth_protects_food"
      &&item.counterEffects.some(effect=>effect.status==="present"&&effect.from.origin.kind==="target"
        &&effect.from.stem===actor.stem&&effect.from.visibility===actor.visibility
        &&effect.targets.some(target=>target.tenGod==="七杀")))).toBe(true);
    expect(segment.domains[1]!.verdict).toMatchObject({direction:"pressured",focus:"spending",label:"支出与消耗压力较大"});
    expect(segment.domains[1]!.text).toContain("用品和协作费用可能增加");
    expect(segment.domains[1]!.verdict.label).not.toMatch(/回报|兑现/);expect(source).toEqual(before);
  }
  expect(segments(cases.get("b-2032")!)[0]!.domains[1]!.verdict).toMatchObject({focus:"returns",direction:"mixed"});
});
it("preserves real child phases and the exact eighteenth birthday without adult work or marriage assumptions",()=>{
  const child=segments(cases.get("child-2025")!)[0]!;expect(child.age.segments.map(x=>x.stage)).toEqual(["young_child","youth"]);
  expect(child.domains.map(x=>x.text).join()).not.toMatch(/收入|报酬|工资|客户|伴侣|婚姻|结婚|培训/);expect(child.domains[0]!.text).toContain("自己的表达或做法与约定要求不同");
  const crossing=segments(cases.get("child-2037")!)[0]!;expect(crossing.age.segments.map(x=>x.stage)).toEqual(["youth","adult"]);
  for(const phase of crossing.age.segments)expect(crossing.domains[2]!.text).toContain(phase.label);
});
it("retains contrary financial tasks and does not turn unresolved moderation into success",()=>{
  expect(text("protect-2032")).toContain("必要指导");expect(text("moderate-2032")).toContain("重复部分与必要指导仍同时存在");expect(text("moderate-2032")).toContain("还不能判断能否省下投入");
  expect(segments(cases.get("moderate-2032")!)[0]!.domains[1]!.verdict.direction).toBe("unknown");
  expect(segments(cases.get("protect-2032")!)[0]!.domains[1]!.verdict.label).toBe("有支持机会，也有受阻环节");
  expect(text("moderate-2032")).not.toContain("重复投入较能收拢");expect(text("joint-2028")).toContain("原约定");expect(text("joint-2028")).not.toContain("新试用");
});
it("uses only exactly verified work and relationship fields, preserving six distinct work settings",async()=>{
  const texts:string[]=[];
  for(const work of ["student","employed","self_employed","seeking_work","caregiving","retired"] as const){const source=await contextFor(work),result=segments(source)[0]!;texts.push(result.domains[0]!.text);
    expect(result.domains[0]!.sourceSubjects.some(id=>id.startsWith("contextual-"))).toBe(true);
    if(work==="caregiving"||work==="retired")expect(result.domains.map(x=>x.text).join()).not.toMatch(/岗位|客户|工资|入职/);
    if(["caregiving","retired","student","seeking_work"].includes(work))expect(result.domains[1]!.text).not.toMatch(/报酬|结算/);
    if(work==="retired"||work==="caregiving"||work==="student"){
      expect(result.eventTendencies.find(item=>item.category==="promotion")!.level).toBe("not_applicable");
      expect(result.eventTendencies.find(item=>item.category==="job_change")!.level).toBe("not_applicable");
    }
    for(const item of result.eventTendencies.filter(item=>item.domain!=="relationship"))expect(item.sourceSubjects.some(id=>id.startsWith("contextual-"))).toBe(true);
  }
  expect(new Set(texts).size).toBe(6);
  const relation:string[]=[];for(const state of ["single","partnered","married","separated"] as const)relation.push(segments(await contextFor("unspecified",state))[0]!.domains[2]!.text);
  expect(new Set(relation).size).toBe(4);expect(relation[3]).toContain("未结承诺");
  const separated=segments(await contextFor("unspecified","separated"))[0]!.domains[2]!;
  expect(separated.verdict).toMatchObject({relationshipChange:"progression",relationshipState:"separated",label:"旧关系事项有进展"});
  expect(separated.verdict.label).not.toContain("感情有推进");
  const separatedEvents=segments(await contextFor("unspecified","separated"))[0]!.eventTendencies;
  expect(separatedEvents.find(item=>item.category==="commitment")!.level).toBe("not_applicable");
  expect(separatedEvents.find(item=>item.category==="romance")!.text).toContain("不等于旧关系一定恢复");
});
it("binds domain-level personal dependencies and details to their own original segment",()=>{
  for(const source of cases.values())for(const segment of segments(source)){
    expect(segment.detailsRef.storySegmentId).toBe(segment.id);expect(segment.detailsRef.eventSegmentId).toBe(segment.id);
    const original=source.year.judgmentSegments.find(x=>x.branchId===segment.branchId&&x.id===segment.id)!;expect(segment.backgroundRefs).toEqual(original.judgment.backgroundRefs);
    for(const domain of segment.domains){expect(domain.sourceSubjects).toContain(`annual-${source.year.year}`);expect(domain.sourceSubjects).toContain(`annual-domain-${source.year.year}-${segment.id}-${domain.domain}`);
      expect(domain.sourceSubjects).toContain(`annual-life-story-${source.year.year}-${segment.branchId}-${segment.id}`);
      expect(domain.sourceSubjects.filter(x=>x.startsWith("annual-event-")).every(x=>x.includes(`-${domain.domain}-`))).toBe(true);
    }
  }
});
it("rejects a different original background, age, context and source without rewriting originals",async()=>{
  const original=cases.get("b-2029")!;
  const wrong=structuredClone(original);wrong.events.branches[0]!.segments[0]!.backgroundRefs=[];expect(()=>buildBriefAnnualReading(wrong)).toThrow();
  const age=structuredClone(original);age.story.branches[0]!.segments[0]!.age.stage="youth";expect(()=>buildBriefAnnualReading(age)).toThrow();
  const context=await contextFor("retired"),stale=structuredClone(context);stale.contextual.contextSource.document.context.work="employed";expect(()=>buildBriefAnnualReading(stale)).toThrow("现实背景正文");
  const missing=structuredClone(context);delete (missing as BuildBriefAnnualReadingInput).contextual;expect(()=>buildBriefAnnualReading(missing)).toThrow("缺少同一背景记录");
  const year=structuredClone(original);year.story.year=2028;expect(()=>buildBriefAnnualReading(year)).toThrow("来源不一致");
});
