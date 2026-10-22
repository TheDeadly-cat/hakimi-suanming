import { revisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { LunarUtil } from "lunar-typescript";
import { calculatePillarRelations } from "@hakimi/relations-core";
import { canonicalizeStrengthTenGod, strengthTenGodGroup } from "./strength-policy";
import { strengthElementForStem } from "./strength-assessment-core";
import { NATAL_STRUCTURE_DETAIL_SOURCES_VERSION, NATAL_STRUCTURE_DETAIL_SOURCES } from "./natal-structure-detail-sources";
import type { BaziPreliminaryAssessment, PreliminarySource } from "./preliminary-assessment";
import type { BaziComprehensiveReading } from "./comprehensive-reading";
import type { PillarPosition } from "./strength-assessment-core";
import { evaluateNatalStructureTasks } from "./natal-structure-tasks";

export const NATAL_STRUCTURE_DETAIL_VERSION = "hakimi.natal-structure-detail/0.1.0" as const;
export type NatalStructureDetailKind = "resource_food_controls_killing" | "chen_ren_resource_use" | "protect_shallow_food";
export interface NatalStructureDetailRoot {
  id: string; position: PillarPosition; branch: string; stem: string; layer: "main" | "other";
}
export interface NatalStructureDetailActor {
  id: string; position: PillarPosition; stem: string; tenGod: string;
  visibility: "visible" | "main_hidden" | "other_hidden"; roots: NatalStructureDetailRoot[];
}
export interface NatalStructureDetailInteraction {
  id: string; operation: "generate" | "control" | "combine" | "clash";
  from: string; to: string; relationId: string | null;
}
export interface NatalStructureDetailReference {
  kind: "pillar" | "root" | "relation" | "diagnosis"; id: string; path: string;
}
export interface NatalStructureDetailFinding {
  id: string; kind: NatalStructureDetailKind; title: string;
  status: "role_present" | "priority_candidate";
  decision: string; conditions: string[]; evidence: string[];
  facts: { month: { branch: string; mainStem: string; mainTenGod: string };
    actors: NatalStructureDetailActor[]; interactions: NatalStructureDetailInteraction[] };
  references: NatalStructureDetailReference[]; sourceIds: string[]; sourceSubjects: string[];
}
export interface NatalStructureDetail {
  version: typeof NATAL_STRUCTURE_DETAIL_VERSION;
  sourceBinding: { caseId: string; revisionId: string; chartResultHash: string; includeHour: boolean };
  sourceVersions: string[]; findings: NatalStructureDetailFinding[];
  conditions: string[]; sourceIds: string[]; sources: PreliminarySource[];
}
export interface BuildNatalStructureDetailInput {
  revision: RevisionRecord; assessment: BaziPreliminaryAssessment; comprehensive: BaziComprehensiveReading;
}


const POSITIONS: PillarPosition[] = ["year", "month", "day", "hour"];
const LABEL: Record<PillarPosition, string> = {year:"年干",month:"月干",day:"日干",hour:"时干"};
const ELEMENTS = ["wood", "fire", "earth", "metal", "water"];
const BRANCH_RELATION_NAMES:Record<string,string>={branch_six_combination:"六合",branch_six_clash:"六冲",branch_binary_punishment:"刑",branch_self_punishment:"自刑",branch_six_harm:"六害",branch_six_break:"六破"};
const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))) : item);
const same = (a:unknown,b:unknown) => stable(a)===stable(b);
const fail = (message:string):never => {throw new Error(`本命作用补断：${message}`);};
const where = (actor: NatalStructureDetailActor) => `${actor.visibility === "visible" ? LABEL[actor.position] : LABEL[actor.position].replace("干", "支藏")}${actor.stem}${actor.tenGod}`;
const rootText = (actor: NatalStructureDetailActor) => actor.roots.length
  ? actor.roots.map(root=>`${root.position === "year" ? "年支" : root.position === "month" ? "月支" : root.position === "day" ? "日支" : "时支"}${root.branch}中${root.stem}${root.layer === "main" ? "本气" : "其余藏气"}`).join("、") : "所选支内未见同五行藏根";
const link = (a:NatalStructureDetailActor,b:NatalStructureDetailActor,offset:number) =>
  (ELEMENTS.indexOf(strengthElementForStem(a.stem))+offset)%5===ELEMENTS.indexOf(strengthElementForStem(b.stem));

/** Independent explanation of the preserved natal facts. It never changes the
 * original balance, selected path, comprehensive reading or feedback wording. */
export function buildNatalStructureDetail({revision,assessment,comprehensive}:BuildNatalStructureDetailInput):NatalStructureDetail {
  const r=revisionRecordSchema.parse(revision),includeHour=r.input.timePrecision!=="unknown_hour"&&r.input.timePrecision!=="date_only";
  const binding={revisionId:r.id,chartResultHash:r.manifest.resultHash,includeHour};
  const selected=POSITIONS.filter(position=>includeHour||position!=="hour");
  const structural=assessment.balance.structural,diagnosis=comprehensive.patternDiagnosis,guidance=comprehensive.usefulGuidance;
  if(!structural||!diagnosis||!guidance||!same(structural.sourceBinding,binding)||!same(comprehensive.sourceBinding,binding)
    ||!same(diagnosis.sourceBinding,binding)||!same(guidance.sourceBinding,binding)
    ||!Object.entries(binding).every(([key,value])=>assessment.sourceBinding[key as keyof typeof binding]===value)) return fail("原命盘、初判或完整解读的来源不一致。");
  if(!same(structural.inputFacts,{pillars:Object.fromEntries(selected.map(position=>[position,r.facts.pillars[position]]))})) return fail("所选柱与原结构事实不一致。");
  const day=r.facts.pillars.day.stem;
  for(const position of selected){const pillar=r.facts.pillars[position],expected=(LunarUtil.ZHI_HIDE_GAN as Record<string,string[]>)[pillar.branch];
    if(pillar.name!==position||pillar.ganZhi!==pillar.stem+pillar.branch||LunarUtil.getJiaZiIndex(pillar.ganZhi)<0||!expected||!same(expected,pillar.hiddenStems)
      ||!same(pillar.branchTenGods.map(canonicalizeStrengthTenGod),expected.map(stem=>canonicalizeStrengthTenGod((LunarUtil.SHI_SHEN as Record<string,string>)[day+stem]!)))
      ||(position==="day"?pillar.stemTenGod!=="日主":canonicalizeStrengthTenGod(pillar.stemTenGod)!==canonicalizeStrengthTenGod((LunarUtil.SHI_SHEN as Record<string,string>)[day+pillar.stem]!))) return fail("原柱透藏或十神事实无效。");
  }
  const monthPillar=r.facts.pillars.month,mainStem=monthPillar.hiddenStems[0]!,mainTenGod=canonicalizeStrengthTenGod(monthPillar.branchTenGods[0]!);
  const month={branch:monthPillar.branch,mainStem,mainTenGod};
  if(assessment.pattern.monthMainStem!==mainStem||assessment.pattern.monthMainTenGod!==mainTenGod||!same(structural.facts.monthCommand,{branch:month.branch,mainStem,tenGod:mainTenGod,group:strengthTenGodGroup(mainTenGod)})) return fail("原月令事实不一致。");
  const rootsFor=(stem:string):NatalStructureDetailRoot[]=>selected.flatMap(position=>r.facts.pillars[position].hiddenStems.flatMap((hidden,index)=>
    strengthElementForStem(hidden)===strengthElementForStem(stem)?[{id:`${position}:${r.facts.pillars[position].branch}:${hidden}`,position,branch:r.facts.pillars[position].branch,stem:hidden,layer:index===0?"main" as const:"other" as const}]:[]));
  const actor=(position:PillarPosition,stem=r.facts.pillars[position].stem,visibility:NatalStructureDetailActor["visibility"]="visible"):NatalStructureDetailActor=>({id:`${position}:${visibility}:${stem}`,position,stem,
    tenGod:position==="day"&&visibility==="visible"?"日主":canonicalizeStrengthTenGod((LunarUtil.SHI_SHEN as Record<string,string>)[day+stem]!),visibility,roots:rootsFor(stem)});
  const dayActor=actor("day"),visible=selected.filter(position=>position!=="day").map(position=>actor(position));
  const structuralActors=[...structural.facts.peerStems,...structural.facts.resourceStems,...structural.facts.demandStems];
  if(structuralActors.length!==visible.length) return fail("原透干对象数不一致。");
  for(const item of visible){const original=structuralActors.find(value=>value.position===item.position);if(!original||original.stem!==item.stem||original.tenGod!==item.tenGod
    ||!same(original.roots,item.roots.map(({id:_id,...root})=>({...root,sameStem:root.stem===item.stem})))) return fail("原角色藏根不一致。");}
  if(!same(structural.facts.dayMasterRoots,dayActor.roots.map(({id:_id,...root})=>({...root,sameStem:root.stem===day})))) return fail("日主自身根与原事实不一致。");
  const calculatedRelations=calculatePillarRelations({year:r.facts.pillars.year.ganZhi,month:r.facts.pillars.month.ganZhi,day:r.facts.pillars.day.ganZhi,
    hour:includeHour?r.facts.pillars.hour.ganZhi:r.facts.pillars.day.ganZhi}).facts.filter(fact=>fact.completeness==="binary"&&fact.participants.every(part=>selected.includes(part.position)));
  const relations=structural.facts.interactions.filter(fact=>fact.completeness==="binary");
  if(!same(relations,calculatedRelations)) return fail("原二元互动与实际所选柱不一致。");
  const shown=(gods:readonly string[])=>visible.filter(value=>gods.includes(value.tenGod));
  const foods=shown(["食神"]),killings=shown(["七杀"]),prints=shown(["正印","偏印"]),officials=shown(["正官"]);
  const findings:NatalStructureDetailFinding[]=[];
  const tasks=evaluateNatalStructureTasks({facts:structural.inputFacts,includeHour}).tasks;
  const sourceId={parallel:"natal-zq-resource-output-killing-task",shallow:"natal-zq-food-killing-load-task",mixed:"natal-zq-mixed-month-resource"};
  function add(kind:NatalStructureDetailKind,title:string,decision:string,actors:NatalStructureDetailActor[],conditions:string[],source:string,status:NatalStructureDetailFinding["status"]="role_present"){
    const selectedActors=[...new Map(actors.map(item=>[item.id,item])).values()],ids=new Set(selectedActors.map(item=>item.id));
    const interactions:NatalStructureDetailInteraction[]=[];
    for(const from of selectedActors.filter(item=>item.visibility==="visible"))for(const to of selectedActors.filter(item=>item.visibility==="visible"&&item.id!==from.id)){
      for(const [offset,operation] of [[1,"generate"],[2,"control"]] as const)if(link(from,to,offset))interactions.push({id:`${operation}:${from.id}>${to.id}`,operation,from:from.id,to:to.id,relationId:null});
    }
    const relevant=relations.filter(fact=>["stem_five_combination","stem_clash"].includes(fact.relationType)&&fact.participants.every(part=>selectedActors.some(item=>item.position===part.position&&item.stem===part.value&&item.visibility==="visible")));
    const rootPositions=new Set(selectedActors.flatMap(item=>item.roots.map(root=>root.position)));
    const rootRelations=relations.filter(fact=>!fact.relationType.startsWith("stem_")&&fact.participants.some(part=>rootPositions.has(part.position)));
    for(const fact of relevant){const [a,b]=fact.participants;const from=selectedActors.find(item=>item.position===a!.position&&item.stem===a!.value&&item.visibility==="visible")!,to=selectedActors.find(item=>item.position===b!.position&&item.stem===b!.value&&item.visibility==="visible")!;
      interactions.push({id:fact.id,operation:fact.relationType==="stem_clash"?"clash":"combine",from:from.id,to:to.id,relationId:fact.id});}
    if(interactions.some(edge=>!ids.has(edge.from)||!ids.has(edge.to))) return fail("补断互动对象不完整。");
    const references:NatalStructureDetailReference[]=[{kind:"pillar",id:"month-background",path:"revision.facts.pillars.month"},
      ...selectedActors.map(item=>({kind:"pillar" as const,id:item.id,path:`revision.facts.pillars.${item.position}`})),
      ...[...new Map(selectedActors.flatMap(item=>item.roots).map(root=>[root.id,root])).values()].map(root=>({kind:"root" as const,id:root.id,path:`revision.facts.pillars.${root.position}.hiddenStems`})),
      ...[...relevant,...rootRelations].map(fact=>({kind:"relation" as const,id:fact.id,path:"assessment.balance.structural.facts.interactions"})),
      {kind:"diagnosis",id:diagnosis!.primaryPathId,path:"comprehensive.patternDiagnosis.primaryPathId"}];
    const usefulSubjects=guidance!.entries.filter(entry=>selectedActors.some(item=>item.visibility==="visible"&&item.stem===entry.stem)).map(entry=>`useful-stem-${entry.id}`);
    const ties=relevant.map(fact=>`${fact.participants.map(part=>`${LABEL[part.position]}${part.value}`).join("与")}原有${fact.relationType==="stem_clash"?"天干冲":"天干五合"}；作用关系仍保留，不据此删去对象或根。`);
    const rootTies=rootRelations.map(fact=>`${fact.participants.map(part=>`${LABEL[part.position].replace("干","支")}${part.value}`).join("与")}的原支关系（${BRANCH_RELATION_NAMES[fact.relationType]??"二元互动"}）涉及藏根位置；只保留原关系，不据此删除藏根或宣告合化。`);
    findings.push({id:kind,kind,title,status,decision,facts:{month:{...month},actors:structuredClone(selectedActors),interactions},references,
      conditions:unique([...conditions,...ties,...rootTies]),evidence:[`原主判断为${diagnosis!.headline}；原工作强弱${structural.working.label}未改。`,...selectedActors.map(item=>`${where(item)}${item.visibility==="visible"?"已透":"仅为月支本气背景"}；根：${rootText(item)}。`),...ties,...rootTies],
      sourceIds:[source],sourceSubjects:unique(["chapter-structure","chapter-useful_elements",...usefulSubjects])});
  }
  if(tasks.some(task=>task.kind==="resource_food_controls_killing")){
    const monthActor=actor("month",mainStem,"main_hidden");
    add("resource_food_controls_killing",`${foods.map(item=>item.stem).join("、")}食神既泄秀，又制${killings.map(item=>item.stem).join("、")}杀`,
      `${month.branch}月以${mainStem}${mainTenGod}为本气背景，${visible.some(item=>item.stem===mainStem)?`${mainStem}另有实际透出`:`${mainStem}目前仅藏`}。${foods.map(where).join("、")}既承接日主${day}的输出，又克制${killings.map(where).join("、")}；泄秀与制杀共用同一个食神支点。${foods.map(item=>`${item.stem}的根见${rootText(item)}`).join("；")}。`,
      [dayActor,monthActor,...visible],["这里确认的是两项实际作用，不把它们相加为两份已成功的优势；制杀适量仍受根气、支持与合克影响。",...(!prints.length?["原局没有透印；月令藏印只作背景，不当作已经自由制食或化杀的天干。"]:prints.map(item=>`${where(item)}还会制约食神并支持日主；两项作用需同时保留，不按有印就判获救或破坏。`)),"保留原印背景主路径，不据食杀同透直接改称七杀格或宣告身强印旺。"],sourceId.parallel);
  }
  const ren=shown(["偏印"]).filter(item=>item.stem==="壬");
  if(tasks.some(task=>task.kind==="chen_ren_resource_use")){
    add("chen_ren_resource_use","辰月杂气透壬，印的取用有具体对象",
      `甲日辰月，${ren.map(where).join("、")}已透，可按杂气章的甲辰透壬例保留印的取用；辰本气${mainStem}${mainTenGod}仍在，壬并非辰藏癸的字面透出。${ren.map(item=>`${item.stem}的水根见${rootText(item)}`).join("；")}。${officials.length?`${officials.map(where).join("、")}与壬形成官印相承；${officials.every(item=>!item.roots.length)?"官虽透出，所选地支却未见金根，不能以透官个数当作官重。":"官自己的根与印的根分别保留，不合并为同一份力量。"}`:"本条明确印的实际取用对象，不另补原局没有的官。"}`,
      [dayActor,actor("month",mainStem,"main_hidden"),...visible],["本条仅采用原典明确的甲日辰月透壬语境，不推广所有库月、所有同五行异干都等同字面透藏。","丙透、辰戌冲或另透财参与的杂气分支不在这条简化准入内；原书的兼透、会支、有情无情需另行判断。","实际所选柱的水根逐项保留；没有完整申子辰三支时，不宣告水局已经会成；有根也不直接定印足量或身强。","当前只补月令取用来源和官印根的区别，保留原主路径与总强弱。"],sourceId.mixed);
  }
  const restrictive=prints.filter(item=>foods.some(food=>link(item,food,2)));
  if(tasks.some(task=>task.kind==="protect_shallow_food")){
    const food=foods[0]!,killing=killings[0]!;
    add("protect_shallow_food",`先护${food.stem}的制杀支点，${restrictive.map(item=>item.stem).join("、")}印的两面分开看`,
      `${where(killing)}有${rootText(killing)}，${where(food)}仅有${rootText(food)}，两者的根并不相等。${restrictive.map(where).join("、")}既生${day}日主，又克${food.stem}食神。当前先保护、补足${food.stem}这条制杀支点，同时保留印的生身用途；继续增加印不能只按生扶的一面判断。`,
      [dayActor,...visible],["这是杀有本气根、食仅余气根且受透印克、日主另有本气根、无透官财竞争的本地保守联合谓词；根的枚数不是原典数值公式。","依据偏官篇的食杀轻重相反分支解释当前作用任务，是跨路径类比；月令与原主路径保持，不把本盘改称七杀格。","食重杀轻时印可调节过量食神，杀食均而身根轻时应另看助身；这两类不套本条护食优先。",`未据此判杀已制尽、印全为忌或${food.stem}已足量有效；相合相冲仍不删除原干、原根。`],sourceId.shallow,"priority_candidate");
  }
  const sourceIds=unique(findings.flatMap(item=>item.sourceIds));
  return {version:NATAL_STRUCTURE_DETAIL_VERSION,sourceBinding:{caseId:r.caseId,...binding},sourceVersions:unique([NATAL_STRUCTURE_DETAIL_VERSION,assessment.version,structural.version,comprehensive.version,diagnosis.version,guidance.version,...(findings.length?[NATAL_STRUCTURE_DETAIL_SOURCES_VERSION]:[])]),findings,
    conditions:["本层只解释实际本命作用及适用前提，不改原计算、强弱分档、主路径或旧反馈原文。","本命角色任务不等于岁运来字已经奏效，也不用于确定职业、婚期、收入或人生结果。"],sourceIds,sources:structuredClone(NATAL_STRUCTURE_DETAIL_SOURCES.filter(source=>sourceIds.includes(source.id)))};
}
