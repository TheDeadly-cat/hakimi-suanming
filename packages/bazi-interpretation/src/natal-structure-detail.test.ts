import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { storedRevisionRecordSchema, type RevisionRecord, type PillarFact } from "@hakimi/contracts";
import { LunarUtil } from "lunar-typescript";
import { buildBaziPreliminaryAssessment } from "./preliminary-assessment";
import { buildBaziComprehensiveReading } from "./comprehensive-reading";
import { buildNatalStructureDetail, type BuildNatalStructureDetailInput } from "./natal-structure-detail";
import { NATAL_STRUCTURE_DETAIL_SOURCES } from "./natal-structure-detail-sources";

async function revisionFor(date:string,time="08:26",sex:"male"|"female"|"unspecified"="male"){
  const chart=await calculateChart({schemaVersion:"1.0.0",calendarType:"gregorian",date,time,timePrecision:"exact_minute",timeZone:"Asia/Shanghai",sex,lunarLeapMonth:false,
    location:{label:"Synthetic calendar fixture",latitude:null,longitude:null,precision:"unknown"},sourceNote:"synthetic"},WORKING_DEFAULT_RULE_PROFILE);
  return storedRevisionRecordSchema.parse({...chart,schemaVersion:"1.0.0",id:"11111111-1111-4111-8111-111111111111",caseId:"22222222-2222-4222-8222-222222222222",revisionNumber:1,createdAt:"2026-10-17T00:00:00.000Z"});
}
function inputFor(revision:RevisionRecord):BuildNatalStructureDetailInput{
  const assessment=buildBaziPreliminaryAssessment(revision);return {revision,assessment,comprehensive:buildBaziComprehensiveReading(revision,assessment)};
}
/** Pure four-pillar counterfactual, not a claimed calendar birthday. */
function asserted(base:RevisionRecord,pillars:[string,string,string,string]){
  const r=structuredClone(base),positions=["year","month","day","hour"] as const,day=pillars[2][0]!;
  positions.forEach((position,index)=>{const ganZhi=pillars[index]!,stem=ganZhi[0]!,branch=ganZhi[1]!,hiddenStems=[...(LunarUtil.ZHI_HIDE_GAN as Record<string,string[]>)[branch]!];
    r.facts.pillars[position]={...r.facts.pillars[position],name:position,ganZhi,stem,branch,hiddenStems,
      stemTenGod:index===2?"日主":(LunarUtil.SHI_SHEN as Record<string,string>)[day+stem]!,branchTenGods:hiddenStems.map(hidden=>(LunarUtil.SHI_SHEN as Record<string,string>)[day+hidden]!)} as PillarFact;
  });return inputFor(r);
}
let b:BuildNatalStructureDetailInput,food:BuildNatalStructureDetailInput,official:BuildNatalStructureDetailInput,others:BuildNatalStructureDetailInput[];
beforeAll(async()=>{
  const revisions=await Promise.all([["1995-05-18","08:26"],["1970-12-08","08:26"],["1971-04-09","14:26"],["1995-08-18","08:26"],["2018-03-14","08:26"],["2019-12-22","11:23"],["1957-09-13","00:26"]].map(([date,time])=>revisionFor(date!,time)));
  [b,food,official]=revisions.slice(0,3).map(inputFor) as [BuildNatalStructureDetailInput,BuildNatalStructureDetailInput,BuildNatalStructureDetailInput];others=revisions.slice(3).map(inputFor);
});

describe("preserved natal facts with independent role-task details",()=>{
  it("makes B's rooted Xin both output and control of Yi without promoting hidden Bing or changing its primary path",()=>{
    const before=JSON.stringify(b),detail=buildNatalStructureDetail(b),f=detail.findings[0]!;
    expect(detail.findings.map(item=>item.kind)).toEqual(["resource_food_controls_killing"]);
    expect(f.facts.month).toEqual({branch:"巳",mainStem:"丙",mainTenGod:"正印"});
    expect(f.facts.actors.find(actor=>actor.stem==="辛")).toMatchObject({position:"month",visibility:"visible",tenGod:"食神",roots:expect.arrayContaining([expect.objectContaining({position:"day",branch:"酉",stem:"辛",layer:"main"})])});
    expect(f.facts.actors.find(actor=>actor.stem==="丙")).toMatchObject({visibility:"main_hidden"});
    expect(f.facts.interactions).toEqual(expect.arrayContaining([expect.objectContaining({operation:"generate",from:"day:visible:己",to:"month:visible:辛"}),expect.objectContaining({operation:"control",from:"month:visible:辛",to:"year:visible:乙"})]));
    expect(f.facts.interactions.some(edge=>edge.from==="month:main_hidden:丙"||edge.to==="month:main_hidden:丙")).toBe(false);
    expect(f.facts.interactions.some(edge=>edge.operation==="clash"&&edge.relationId)).toBe(true);
    for(const relation of b.assessment.balance.structural.facts.interactions.filter(fact=>fact.completeness==="binary"))expect(f.references.some(ref=>ref.kind==="relation"&&ref.id===relation.id)).toBe(true);
    expect(f.conditions.join()).toContain("六合");expect(f.conditions.join()).toContain("六冲");expect(f.conditions.join()).not.toMatch(/branch_|stem_/);
    expect(f.decision).toContain("泄秀与制杀共用同一个食神支点");expect(f.evidence.join()).toContain("月支藏丙正印");expect(f.evidence.join()).not.toContain("月干丙");
    expect(b.comprehensive.patternDiagnosis!.primaryPathId).toBe("resource-output");expect(JSON.stringify(b)).toBe(before);
  });
  it("keeps Jia-Chen's Wu main qi and exposed Ren separate from hidden Gui, including both rootless officials",()=>{
    const detail=buildNatalStructureDetail(official),f=detail.findings.find(item=>item.kind==="chen_ren_resource_use")!;
    expect(f).toBeDefined();expect(f.facts.month).toEqual({branch:"辰",mainStem:"戊",mainTenGod:"偏财"});
    expect(f.decision).toContain("壬并非辰藏癸的字面透出");expect(f.decision).toContain("不能以透官个数当作官重");
    const officers=f.facts.actors.filter(actor=>actor.tenGod==="正官");expect(officers.map(actor=>actor.position)).toEqual(["year","hour"]);expect(officers.every(actor=>actor.roots.length===0)).toBe(true);
    expect(f.facts.actors.find(actor=>actor.stem==="壬")!.roots.map(root=>root.id)).toEqual(["year:亥:壬","month:辰:癸","day:子:癸"]);
    expect(f.evidence.join()).toContain("月支藏戊偏财");expect(f.evidence.join()).not.toContain("月干戊");
    expect(official.comprehensive.patternDiagnosis!.primaryPathId).toBe("official-resource");
  });
  it("protects shallow Jia against the actual Geng restriction while retaining Geng's support of Ren",()=>{
    const before=JSON.stringify(food),detail=buildNatalStructureDetail(food),f=detail.findings.find(item=>item.kind==="protect_shallow_food")!;
    expect(f.status).toBe("priority_candidate");expect(f.facts.actors.find(actor=>actor.stem==="甲")!.roots).toEqual([{id:"hour:辰:乙",position:"hour",branch:"辰",stem:"乙",layer:"other"}]);
    expect(f.facts.actors.find(actor=>actor.stem==="戊")!.roots.filter(root=>root.layer==="main")).toHaveLength(3);
    expect(f.facts.interactions).toEqual(expect.arrayContaining([expect.objectContaining({operation:"generate",from:"year:visible:庚",to:"day:visible:壬"}),expect.objectContaining({operation:"control",from:"year:visible:庚",to:"hour:visible:甲"})]));
    expect(f.decision).toContain("同时保留印的生身用途");expect(f.conditions.join()).toContain("跨路径类比");expect(f.conditions.join()).toContain("食重杀轻");
    expect(food.assessment.pattern.monthMainTenGod).toBe("劫财");expect(food.comprehensive.patternDiagnosis!.primaryPathId).toBe("food-killings");expect(JSON.stringify(food)).toBe(before);
  });
  it("does not generalize shallow-food priority to the opposite classical food-heavy case or a real Changsheng root",()=>{
    const heavy=asserted(food.revision,["壬辰","甲辰","丙戌","戊戌"]);
    // Jia-Hai is not a legal sexagenary pillar: reject rather than invent roots.
    expect(()=>buildNatalStructureDetail(asserted(food.revision,["庚戌","戊子","壬戌","甲亥"]))).toThrow();
    const withBorn=asserted(food.revision,["辛亥","戊子","壬戌","甲辰"]);
    for(const example of [heavy,withBorn,b]) expect(buildNatalStructureDetail(example).findings.some(item=>item.kind==="protect_shallow_food")).toBe(false);
  });
  it("keeps mixed-month competing stems and the Chen-Xu countercondition outside the simplified gate",()=>{
    for(const pillars of [["丙寅","壬辰","甲子","辛未"],["戊辰","壬辰","甲子","辛未"],["辛亥","壬辰","甲戌","辛未"]] as [string,string,string,string][]){
      expect(buildNatalStructureDetail(asserted(official.revision,pillars)).findings.some(item=>item.kind==="chen_ren_resource_use")).toBe(false);
    }
  });
  it("does not attach local sources or new tasks when the known joint predicates do not match",()=>{
    for(const example of others){const detail=buildNatalStructureDetail(example);expect(detail.findings).toEqual([]);expect(detail.sourceIds).toEqual([]);expect(detail.sources).toEqual([]);}
  });
  it("excludes an unknown hour and its roots, without treating unknown sex as a missing pillar",()=>{
    const unknown=structuredClone(food.revision);unknown.input={...unknown.input,time:null,timePrecision:"unknown_hour"};
    expect(buildNatalStructureDetail(inputFor(unknown)).findings).toEqual([]);
    const unknownB=structuredClone(b.revision);unknownB.input={...unknownB.input,time:null,timePrecision:"unknown_hour"};
    const result=buildNatalStructureDetail(inputFor(unknownB));expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.facts.actors.every(actor=>actor.position!=="hour"&&actor.roots.every(root=>root.position!=="hour"))).toBe(true);
    const otherPlaceholder=structuredClone(unknownB);otherPlaceholder.facts.pillars.hour=structuredClone(official.revision.facts.pillars.hour);
    expect(buildNatalStructureDetail(inputFor(otherPlaceholder))).toEqual(result);
    const unknownSex=structuredClone(b.revision);unknownSex.input.sex="unspecified";expect(buildNatalStructureDetail(inputFor(unknownSex)).findings).toEqual(buildNatalStructureDetail(b).findings);
  });
  it("does not disguise an unknown-hour source as a fully calculated single natal revision",async()=>{
    const input={...food.revision.input,time:null,timePrecision:"unknown_hour" as const};
    expect(input.date).toBe("1970-12-08");
    await expect(calculateChart(input,WORKING_DEFAULT_RULE_PROFILE)).rejects.toThrow("未知时辰请使用候选探针入口");
    // The previous test is explicitly a selected-column projection. A real
    // candidate set is a different protocol, not one inferred natal chart.
  });
  it("rejects source, selected facts, roots and binary relation mismatches",()=>{
    const badBinding=structuredClone(b);badBinding.comprehensive.sourceBinding.chartResultHash="wrong";
    const badFact=structuredClone(b);badFact.assessment.balance.structural.inputFacts.pillars.month.hiddenStems=["丙"];
    const badRoot=structuredClone(b);badRoot.assessment.balance.structural.facts.demandStems.find(actor=>actor.stem==="辛")!.roots=[];
    const badRelation=structuredClone(b);badRelation.assessment.balance.structural.facts.interactions=badRelation.assessment.balance.structural.facts.interactions.filter(fact=>fact.relationType!=="stem_clash");
    for(const example of [badBinding,badFact,badRoot,badRelation])expect(()=>buildNatalStructureDetail(example)).toThrow();
  });
  it("binds every used local source and only existing useful entries, with unambiguous same-stem positions",()=>{
    for(const example of [b,food,official]){const detail=buildNatalStructureDetail(example),entries=example.comprehensive.usefulGuidance!.entries;
      expect(detail.sources).toEqual(NATAL_STRUCTURE_DETAIL_SOURCES.filter(source=>detail.sourceIds.includes(source.id)));
      for(const finding of detail.findings){
        expect(new Set(finding.facts.actors.map(actor=>actor.id)).size).toBe(finding.facts.actors.length);
        const expected=entries.filter(entry=>finding.facts.actors.some(actor=>actor.visibility==="visible"&&actor.stem===entry.stem)).map(entry=>`useful-stem-${entry.id}`);
        expect(finding.sourceSubjects).toEqual(["chapter-structure","chapter-useful_elements",...expected]);
        for(const edge of finding.facts.interactions)expect(finding.facts.actors.map(actor=>actor.id)).toEqual(expect.arrayContaining([edge.from,edge.to]));
      }
    }
  });
});
