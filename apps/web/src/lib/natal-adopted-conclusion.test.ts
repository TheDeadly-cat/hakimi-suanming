import {beforeAll,expect,it} from "vitest";
import {calculateChart} from "@hakimi/bazi-core";
import {storedRevisionRecordSchema} from "@hakimi/contracts";
import {WORKING_DEFAULT_RULE_PROFILE} from "@hakimi/rule-profiles";
import {buildBaziPreliminaryAssessment} from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import {buildBaziComprehensiveReading} from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import {buildNatalAdoptedConclusion,type BuildNatalAdoptedConclusionInput} from "./natal-adopted-conclusion";

const cases=new Map<string,BuildNatalAdoptedConclusionInput>();
beforeAll(async()=>{
  for(const [id,date,time,sex] of [
    ["B","1995-05-18","08:26","male"],["A","1995-08-18","08:26","unspecified"],
    ["food","1970-12-08","08:26","male"],["official","1971-04-09","14:26","male"],
    ["protect","1957-09-13","00:26","male"],["moderate","1982-10-02","10:26","male"],
    ["joint","1944-08-09","04:26","male"],["R3","2019-12-22","11:23","female"],
    ["gui26","2020-12-26","17:26","female"],["gui16","2020-12-16","17:26","female"]
  ] as const){
    const chart=await calculateChart({schemaVersion:"1.0.0",calendarType:"gregorian",date,time,timePrecision:"exact_minute",timeZone:"Asia/Shanghai",sex,lunarLeapMonth:false,
      location:{label:"Synthetic adopted-conclusion fixture",latitude:null,longitude:null,precision:"unknown"},sourceNote:"synthetic"},WORKING_DEFAULT_RULE_PROFILE);
    const revision=storedRevisionRecordSchema.parse({...chart,schemaVersion:"1.0.0",id:crypto.randomUUID(),caseId:crypto.randomUUID(),revisionNumber:1,createdAt:"2026-10-20T00:00:00Z"});
    const assessment=buildBaziPreliminaryAssessment(revision),comprehensive=buildBaziComprehensiveReading(revision,assessment);
    cases.set(id,{revision,assessment,comprehensive});
  }
},60000);
const result=(id:string)=>buildNatalAdoptedConclusion(cases.get(id)!);
const stems=(value:ReturnType<typeof result>["firstChoice"])=>value.targets.filter(target=>target.kind==="stem").map(target=>target.value);
it("adopts B's actual Xin task without inventing strength or ranking gods by the raw weights",()=>{
  const input=cases.get("B")!,before=structuredClone(input),r=result("B");
  expect(r.pattern.pathId).toBe("resource-output");expect(r.pattern.decision).toContain("印格泄秀");
  expect(stems(r.firstChoice)).toEqual(["辛"]);expect(r.firstChoice.decision).toContain("同一食神还制约原有七杀");
  expect(r.scoreBasis).toMatchObject({supportWeight:11,demandWeight:12,workingLabel:"相对中和",selection:"raw_fallback"});
  expect(r.axes.balance.preferred).toEqual([]);expect(r.firstChoice.decision).not.toMatch(/身强|身旺|已成格/);
  expect(input).toEqual(before);
});
it("keeps B's checked seasonal Gui-before-Bing order separate from the exposed structural Xin",()=>{
  const r=result("B"),seasonal=r.secondChoices.find(item=>item.id==="seasonal")!;
  expect(stems(seasonal)).toEqual(["癸","丙"]);expect(seasonal.purposes).toEqual(["seasonal"]);
  expect(seasonal.targets.every(target=>target.presence==="hidden_only")).toBe(true);
  expect(seasonal.decision).toContain("癸水润土为先，丙火为配合");
  expect(seasonal.decision).toContain("丙的调候配用不等于岁运逢火皆喜");
  expect(seasonal.decision).toContain("新增火若合克辛");
  expect(seasonal.priorityReason).toContain("三夏己土");
  expect(seasonal.priorityReason).toContain("季节总论");
  expect(seasonal.priorityReason).not.toContain("日干月令专条");
  expect(seasonal.evidence.some(text=>text.includes("丙火为癸水的次用配合"))).toBe(true);
  expect(seasonal.evidence.join(" ")).not.toContain("优先考察丙");
  expect(r.axes.balance.preferred).toEqual([]);
  expect(r.axes.balance.auxiliary).toEqual([]);
  expect(r.avoid[0]!.decision).toContain("印的生身作用保留");
  expect(r.sources.find(source=>source.id==="preliminary-qiongtong-ji-si")!.excerpt).toBe(cases.get("B")!.assessment.sources.find(source=>source.id==="preliminary-qiongtong-ji-si")!.excerpt);
  expect(r.sources.every(source=>source.usageNote.includes("本地综合采用"))).toBe(true);
});
it("preserves opposite wealth/resource priorities and does not call every companion a second useful god",()=>{
  const a=result("protect"),b=result("moderate"),joint=result("joint");
  expect(stems(a.firstChoice)).toEqual(["丁"]);expect(a.firstChoice.decision).toContain("护身、制伤");
  expect(a.firstChoice.targets[0]!.presence).toBe("exposed_unrooted");
  expect(a.secondChoices.flatMap(stems)).not.toContain("癸");expect(a.retainedRoles.flatMap(stems)).toContain("壬");
  expect(a.axes.seasonal.preferred).not.toContain("癸");expect(a.axes.seasonal.decision).toContain("不列作新增喜用");
  expect(a.avoid[0]!.title).toContain("财再重");
  expect(stems(b.firstChoice)).toEqual(["壬"]);expect(b.firstChoice.decision).toContain("调节过多的印");
  expect(b.secondChoices.flatMap(stems)).not.toContain("丙");expect(b.retainedRoles.flatMap(stems)).toContain("丁");
  expect(b.axes.seasonal.preferred).not.toContain("丙");
  expect(new Set(stems(joint.firstChoice))).toEqual(new Set(["戊","壬"]));
  expect(joint.firstChoice.decision).toContain("财印并用");expect(joint.avoid[0]!.decision).toContain("原局财印有条件分工");
});
it("protects the shallow food function without deleting the resource's separate support or promoting more killing",()=>{
  const r=result("food");
  expect(stems(r.firstChoice)).toEqual(["甲"]);expect(r.firstChoice.decision).toContain("根浅而受印克");
  expect(r.avoid[0]!.decision).toContain("现有印生身的用途仍保留");
  expect(r.secondChoices.flatMap(stems)).not.toContain("戊");expect(r.retainedRoles.flatMap(stems)).toContain("戊");
  expect(r.secondChoices.find(item=>item.id==="seasonal")!.conditions.join()).toContain("也会生戊七杀");
  expect(r.pattern.decision).toContain("子月劫财");expect(r.pattern.decision).not.toContain("七杀格");
});
it("keeps Chen mixed-month and Ren resource use precise without claiming hidden Gui exposed or rooted officers",()=>{
  const r=result("official");
  expect(r.pattern.decision).toContain("辰月杂气，壬印已透");
  expect(stems(r.firstChoice)).toEqual(["壬"]);expect(r.firstChoice.decision).toContain("承接官");
  expect(r.firstChoice.conditions.join()).toContain("不推广所有库月");
  expect(r.pattern.decision).not.toMatch(/正官格|癸印已透/);
});
it("keeps R3's seasonal priority distinct from its mixed authority task and raw score",()=>{
  const r=result("R3");expect(stems(r.firstChoice)).toEqual(["丙"]);expect(r.firstChoice.purposes).toEqual(["seasonal"]);
  expect(r.axes.pattern.decision).toContain("同时生官与生杀");
  expect(r.axes.seasonal.decision).toContain("辛金滋扶须在配丙前提下");
  expect(r.secondChoices.flatMap(stems)).toContain("辛");expect(r.secondChoices.flatMap(stems)).not.toContain("戊");
  expect(r.scoreBasis.supportWeight).toBe(9);expect(r.scoreBasis.demandWeight).toBe(13);
  expect(r.scoreBasis.workingLabel).toContain("强弱相对均衡");expect(r.avoid[0]!.decision).toContain("官杀未取清");
});
it("uses Bing as the actual seasonal target in both earlier Gui-Zi counterexamples while retaining their original pattern gods",()=>{
  for(const id of ["gui26","gui16"]){
    const input=cases.get(id)!,r=result(id),old=input.comprehensive.usefulGuidance!.answer.primaryStems;
    expect(input.revision.facts.pillars.day.stem).toBe("癸");expect(input.revision.facts.pillars.month.branch).toBe("子");
    expect(stems(r.firstChoice)).toEqual(["丙"]);expect(r.firstChoice.purposes).toEqual(["seasonal"]);
    expect(r.axes.pattern.preferred).toEqual(old);expect(r.axes.pattern.decision).not.toContain("首取丙火温通");
    for(const stem of old.filter(stem=>stem!=="丙"))expect(r.secondChoices.flatMap(stems)).toContain(stem);
  }
});
it("binds each visible conclusion to original chapters and actual useful-entry subjects",()=>{
  for(const id of cases.keys()){
    const input=cases.get(id)!,r=result(id),valid=new Set(input.comprehensive.usefulGuidance!.entries.map(entry=>`useful-stem-${entry.id}`));
    for(const item of [r.firstChoice,...r.secondChoices,...r.retainedRoles,...r.avoid]){
      expect(item.sourceSubjects).toContain("chapter-useful_elements");
      for(const subject of item.sourceSubjects.filter(id=>id.startsWith("useful-stem-")))expect(valid.has(subject)).toBe(true);
    }
    expect(r.selectionKind).toBe("local_synthesis");expect(r.sourceBinding.revisionId).toBe(input.revision.id);
  }
});
it("rejects changed scores, an edited prior recommendation or a different source instead of adopting it",()=>{
  const input=cases.get("B")!,score=structuredClone(input),use=structuredClone(input),other=structuredClone(input);
  score.assessment.balance.supportWeight+=100;expect(()=>buildNatalAdoptedConclusion(score)).toThrow("得分");
  use.comprehensive.usefulGuidance!.answer.primaryStems=["丙"];expect(()=>buildNatalAdoptedConclusion(use)).toThrow("同源当前版本");
  other.assessment=cases.get("A")!.assessment;expect(()=>buildNatalAdoptedConclusion(other)).toThrow("不一致");
});
