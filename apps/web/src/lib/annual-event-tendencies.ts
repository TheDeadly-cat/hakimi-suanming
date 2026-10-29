import type { RevisionRecord, TransitNodeRef } from "@hakimi/contracts";
import { calculatePillarRelations } from "@hakimi/relations-core";
import type { NatalWealthResourceTask } from "../../../../packages/bazi-interpretation/src/natal-wealth-resource-task";
import type { AnnualRelationshipTiming, AnnualRelationshipTimingSignal } from "./annual-relationship-timing";
import type { LocalAnnualYear } from "./local-annual-outlook";
import type { LocalOutlookJudgmentSegment, OutlookStemAction } from "./local-outlook-judgment";
import type { LocalReadingAgeContext } from "./local-reading-age-context";
import type { ReadingContextRelationship, ReadingContextWork } from "./local-reading-context";
import type { OutlookRescueTraceBundle } from "./outlook-rescue-trace";
import type { AnnualEventSegment } from "./local-annual-event-reading";

export const ANNUAL_EVENT_TENDENCIES_VERSION = "hakimi.annual-event-tendencies/0.1.0" as const;
export type EventTendencyCategory = "promotion" | "job_change" | "money_inflow" | "money_loss" | "romance" | "commitment" | "separation";
export type EventTendencyLevel = "clear" | "possible" | "weak" | "none" | "not_applicable";
export type EventTendencyDirection = "supported" | "mixed" | "pressured" | "unindicated";
export type EventTendencyDomain = "career" | "wealth" | "relationship";
export interface AnnualEventTendencyEvidence {
  id: string;
  kind: "actor" | "task_relation" | "relationship_signal" | "rescue_countereffect" | "pillar_relation";
  use: "support" | "counter" | "context";
  origin: "year" | "dayun" | "natal";
  nodeRef: TransitNodeRef | null;
  axisId: string | null;
  actionIndex: number | null;
  signalId: string | null;
  lensId: "wealth" | "authority" | null;
  relationFactId?: string;
  original: string;
}
export interface AnnualEventTendency {
  id: string; version: typeof ANNUAL_EVENT_TENDENCIES_VERSION;
  category: EventTendencyCategory; domain: EventTendencyDomain;
  level: EventTendencyLevel; direction: EventTendencyDirection;
  label: string; text: string;
  scope: { year: number; branchId: "locked" | "forward" | "backward"; segmentId: string; startInstant: string; endExclusiveInstant: string };
  applicableIntervals: { startInstant: string; endExclusiveInstant: string }[];
  workState: ReadingContextWork; relationshipState: ReadingContextRelationship;
  sourceSubjects: string[]; eventIds: string[]; sourceVersions: string[]; sourceIds: string[];
  evidence: AnnualEventTendencyEvidence[];
  supportEvidenceIds: string[]; counterEvidenceIds: string[];
  lensIds: ("wealth" | "authority")[];
  ruleIds: string[]; conditions: string[];
}
export interface BuildAnnualEventTendenciesInput {
  /** Already verified original members from one exact annual segment. */
  revision: RevisionRecord; eventSegment: AnnualEventSegment;
  year: LocalAnnualYear; segment: LocalOutlookJudgmentSegment;
  age: LocalReadingAgeContext; timing: AnnualRelationshipTiming;
  work: ReadingContextWork; relationship: ReadingContextRelationship;
  natalTask: NatalWealthResourceTask | null;
  rescueTrace?: OutlookRescueTraceBundle;
  sources: Record<EventTendencyDomain, { sourceSubjects: string[]; eventIds: string[] }>;
}

const unique = <T>(values: readonly T[]) => [...new Set(values)];
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const same = (a: unknown, b: unknown) => stable(a) === stable(b);
const categories: EventTendencyCategory[] = ["promotion","job_change","money_inflow","money_loss","romance","commitment","separation"];
const labels: Record<EventTendencyCategory,string> = {promotion:"升职或职责提升",job_change:"换工作或岗位调整",money_inflow:"进财",money_loss:"破财或额外花费",romance:"恋爱",commitment:"谈婚论嫁",separation:"分开"};
const helps = (action:OutlookStemAction) => action.effect==="assists"||action.effect==="mixed";
const hurts = (action:OutlookStemAction) => action.effect==="obstructs"||action.effect==="mixed";
const isWealth = (action:OutlookStemAction) => ["正财","偏财"].includes(action.tenGod);
const isResource = (action:OutlookStemAction) => ["正印","偏印"].includes(action.tenGod);
const isAuthority = (action:OutlookStemAction) => ["正官","七杀"].includes(action.tenGod);
const rank:Record<EventTendencyLevel,number>={clear:3,possible:2,weak:1,none:0,not_applicable:-1};
const methodCondition="事件倾向是基于既有角色作用、星宫及岁运的本地解释规则；强弱指依据的具体程度，不是统计概率、原典逐字断语或已经发生的事实。";

/** Pure event interpretation after the caller has verified the original products.
 * Original effects are evidence. No overall mixed label is distributed to every
 * event, and no new fortune score or calculation is produced here. */
export function buildAnnualEventTendencies(input:BuildAnnualEventTendenciesInput):AnnualEventTendency[] {
  const {year,segment,timing,age}=input,j=segment.judgment;
  const fail=(message:string):never=>{throw new Error(`年度事件倾向：${message}`);};
  if(input.revision.id!==j.sourceBinding.revisionId||input.revision.manifest.resultHash!==j.sourceBinding.chartResultHash
    ||input.eventSegment.id!==segment.id||input.eventSegment.branchId!==segment.branchId
    ||input.eventSegment.startInstant!==segment.startInstant||input.eventSegment.endExclusiveInstant!==segment.endExclusiveInstant
    ||!same(input.eventSegment.age,age)||!same(input.eventSegment.backgroundRefs,j.backgroundRefs)
    ||!year.judgmentSegments.some(item=>same(item,segment))||!same(year.transitNodeRef,j.targetRef)
    ||timing.scope.year!==year.year||timing.scope.branchId!==segment.branchId||timing.scope.segmentId!==segment.id
    ||!same(timing.scope.targetRef,j.targetRef)||!same(timing.scope.backgroundRefs,j.backgroundRefs)
    ||timing.scope.startInstant!==segment.startInstant||timing.scope.endExclusiveInstant!==segment.endExclusiveInstant
    ||timing.sourceBinding.revisionId!==j.sourceBinding.revisionId||timing.sourceBinding.chartResultHash!==j.sourceBinding.chartResultHash
    ||timing.sourceBinding.includeHour!==j.sourceBinding.includeHour)fail("年份、分段或独立关系依据不一致。");
  if(input.rescueTrace&&(!same(input.rescueTrace.targetRef,j.targetRef)||!same(input.rescueTrace.backgroundRefs,j.backgroundRefs)
    ||!same(input.rescueTrace.interval,j.interval)||!same(input.rescueTrace.sourceBinding,j.sourceBinding)))fail("救应依据不属于同一时段。");
  const pattern=j.axes.find(axis=>axis.axis==="pattern");
  if(!pattern?.stemActions||pattern.stemActions.items.length!==2)return fail("缺少完整的原角色作用。");
  const actions=pattern.stemActions.items,links=pattern.taskLinks?.items??[],relations=links.flatMap(link=>link.relations);
  const applicableIntervals=age.segments.filter(part=>part.stage==="adult").map(part=>({startInstant:part.startInstant,endExclusiveInstant:part.endExclusiveInstant}));
  if(age.stage==="adult"&&!applicableIntervals.length)applicableIntervals.push({startInstant:segment.startInstant,endExclusiveInstant:segment.endExclusiveInstant});
  for(const part of applicableIntervals)if(Date.parse(part.startInstant)<Date.parse(segment.startInstant)||Date.parse(part.endExclusiveInstant)>Date.parse(segment.endExclusiveInstant)
    ||Date.parse(part.startInstant)>=Date.parse(part.endExclusiveInstant))fail("成年情境超出原分段。");
  const scope={year:year.year,branchId:segment.branchId,segmentId:segment.id,startInstant:segment.startInstant,endExclusiveInstant:segment.endExclusiveInstant};
  const evidence:AnnualEventTendencyEvidence[]=[];
  const actorEvidence=(index:number,use:AnnualEventTendencyEvidence["use"])=>{
    const actor=actions[index]!,id=`${pattern.id}:actor:${index}:${use}`;
    if(!evidence.some(item=>item.id===id)){
      const lines=[...actor.evidenceIndexes.map(i=>pattern.evidence[i]),...actor.blockerIndexes.map(i=>pattern.blockers[i]),...actor.satisfiedConditionIndexes.map(i=>pattern.satisfiedConditions[i])];
      if(lines.some(line=>line===undefined))fail("角色依据索引越界。");
      evidence.push({id,kind:"actor",use,origin:"year",nodeRef:j.targetRef,axisId:pattern.id,actionIndex:index,signalId:null,lensId:null,original:lines.join("\n")});
    }
    return id;
  };
  const edgeEvidence=(index:number,use:AnnualEventTendencyEvidence["use"])=>{
    const edge=relations[index]!,id=`${pattern.id}:task-relation:${index}:${use}`;
    if(!evidence.some(item=>item.id===id)){
      const original=edge.refs.map(ref=>{const axis=j.axes.find(axis=>axis.id===ref.axisId);return axis?.[ref.field][ref.index];});
      if(original.some(line=>line===undefined))fail("任务作用依据索引越界。");
      evidence.push({id,kind:"task_relation",use,origin:edge.from.origin.kind==="background"?"dayun":edge.from.origin.kind==="target"?"year":"natal",
        nodeRef:edge.from.origin.kind==="natal"?null:edge.from.origin.nodeRef,axisId:pattern.id,actionIndex:null,signalId:null,lensId:null,original:original.join("\n")});
    }
    return id;
  };
  const signalEvidence=(signal:AnnualRelationshipTimingSignal,lensId:"wealth"|"authority",use:AnnualEventTendencyEvidence["use"])=>{
    const id=`relationship:${lensId}:${signal.id}:${use}`;
    if(!evidence.some(item=>item.id===id))evidence.push({id,kind:"relationship_signal",use,origin:signal.source,nodeRef:signal.nodeRef,axisId:null,actionIndex:null,signalId:signal.id,lensId,original:signal.text});
    return id;
  };
  type Draft={level:EventTendencyLevel;text:string;support:string[];counter:string[];rule:string;label?:string;lensIds?:("wealth"|"authority")[];risk?:boolean;conditions?:string[]};
  const drafts=new Map<EventTendencyCategory,Draft>();
  const set=(category:EventTendencyCategory,draft:Draft)=>drafts.set(category,draft);
  const no=(category:EventTendencyCategory,text=`本段缺少明显的${labels[category]}线索。`,na=false)=>set(category,{level:na?"not_applicable":"none",text,support:[],counter:[],rule:na?"not-applicable":"no-specific-trigger"});
  for(const category of categories)no(category);
  const indexes=(predicate:(action:OutlookStemAction)=>boolean)=>actions.flatMap((action,index)=>predicate(action)?[index]:[]);
  const supports=(ids:number[])=>ids.map(index=>actorEvidence(index,"support"));
  const pressure=(groups:string[])=>relations.flatMap((edge,index)=>edge.contributesPressure&&groups.includes(edge.to.group)?[edgeEvidence(index,"counter")]:[]);
  const workEligible=!["student","caregiving","retired"].includes(input.work);
  const promotionEligible=workEligible&&input.work!=="self_employed"&&input.work!=="seeking_work";
  const workPrefix=input.work==="unspecified"?"若在职，":"";
  const authorityHelp=indexes(action=>isAuthority(action)&&helps(action));
  const resourceHelp=indexes(action=>isResource(action)&&helps(action));
  const authorityResource=["official-resource","killings-resource"].includes(pattern.pathId)
    &&links.some(link=>link.functions.some(edge=>edge.operation==="generate"&&edge.from.group==="authority"&&edge.to.group==="resource"));
  if(!promotionEligible)no("promotion","当前身份不套用单位升职；学习、经营或照料方面的变化保留在原领域解读。",true);
  else if(authorityHelp.length||(authorityResource&&resourceHelp.length)){
    const support=supports([...authorityHelp,...(authorityResource?resourceHelp:[])]),counter=pressure(["authority","resource"]);
    const visibleAuthority=authorityHelp.some(index=>actions[index]!.visibility==="visible");
    set("promotion",{level:visibleAuthority&&resourceHelp.length&&!counter.length?"clear":counter.length?"weak":"possible",support,counter,rule:"responsibility-support",
      label:counter.length?"升职有线索，推进易受阻":"升职或职责提升倾向",
      text:`${workPrefix}${visibleAuthority?"可能获得晋升、正式授权或带团队的机会":"可能因资历、专业支持而接手更重要的职责，成为晋升或转正候选"}${counter.length?"；原要求与执行支持仍有冲突，任命或落实可能反复。":"。"}`});
  }
  const authorityPressure=indexes(action=>isAuthority(action)&&hurts(action));
  if(promotionEligible&&drafts.get("promotion")!.level==="none"&&authorityPressure.length)
    set("promotion",{...drafts.get("promotion")!,counter:authorityPressure.map(index=>actorEvidence(index,"counter"))});
  const currentAuthorityEdges=relations.flatMap((edge,index)=>edge.contributesPressure&&edge.from.origin.kind==="target"&&edge.to.group==="authority"?[index]:[]);
  const month=input.revision.facts.pillars.month.ganZhi,target=year.yearGanZhi!;
  const careerFacts=input.eventSegment.items.filter(item=>item.domain==="career").flatMap(item=>item.origin.relationFactIds);
  const monthClashes=calculatePillarRelations({year:target,month,day:target,hour:month}).facts.filter(fact=>
    fact.completeness==="binary"&&fact.relationType==="branch_six_clash"&&fact.participants.length===2
    &&fact.participants.every(part=>part.component==="branch")
    &&fact.participants.some(part=>part.position==="year")&&fact.participants.some(part=>part.position==="month")
    &&careerFacts.includes(`month:${fact.id}`));
  const monthClashEvidence=monthClashes.map(fact=>{
    const id=`career-month:${fact.id}`;evidence.push({id,kind:"pillar_relation",use:"support",origin:"year",nodeRef:j.targetRef,
      axisId:null,actionIndex:null,signalId:null,lensId:null,relationFactId:`month:${fact.id}`,
      original:`本年${target}与本命月柱${month}构成地支六冲；原事业事项保留同一二元关系。`});return id;
  });
  if(!workEligible)no("job_change","当前身份不生成换工作倾向，原日常活动或学习安排仍单独保留。",true);
  else if(authorityPressure.length||currentAuthorityEdges.length||monthClashEvidence.length){
    const support=[...supports(authorityPressure),...currentAuthorityEdges.map(index=>edgeEvidence(index,"support")),...monthClashEvidence];
    set("job_change",{level:monthClashEvidence.length||authorityPressure.some(index=>actions[index]!.visibility==="visible")?"possible":"weak",support,counter:[],rule:monthClashEvidence.length?"annual-month-palace-change":"current-duty-conflict",
      label:input.work==="seeking_work"?"求职或岗位选择易变化":input.work==="self_employed"?"经营角色易调整":"换岗或换工作倾向",
      text:input.work==="seeking_work"?"求职目标或岗位要求容易变化，可能改投其他岗位、重新面试，或调整原定入职安排。":input.work==="self_employed"?"经营职责与合作要求容易出现分歧，可能换合作方式、转业务方向，或退出一项原有安排。":monthClashEvidence.length?`${workPrefix}工作环境、团队或岗位安排较易变化，可能调动、离开原岗位，或到新的单位发展。`:`${workPrefix}职责、考核或合作要求容易起变化，可能换项目、调岗，分歧明显时也会考虑换工作。`});
  }
  const selected=input.natalTask?.preferredPathId===pattern.pathId?input.natalTask.task:null;
  const wealthHelp=indexes(action=>isWealth(action)&&helps(action));
  const wealthPressure=indexes(action=>isWealth(action)&&hurts(action));
  const financialSpecial=selected==="resource_first"||selected==="wealth_first"||selected==="official_joint"
    ||["resource-wealth","official-resource","killings-resource","food-killings"].includes(pattern.pathId);
  const everydayMoney=["student","seeking_work","caregiving","retired"].includes(input.work);
  if(wealthHelp.length&&!financialSpecial){
    const counter=pressure(["output","wealth"]),support=supports(wealthHelp);
    const visible=wealthHelp.some(index=>actions[index]!.visibility==="visible");
    const main=actions[wealthHelp[0]!]!,direct=main.tenGod==="正财";
    const scene=input.work==="caregiving"?"共同分担、报销或用品费用归还可能落实":input.work==="retired"?"原有款项、借用归还或活动分担可能到账":input.work==="student"?"退款、报销或已约定的支持款可能落实":input.work==="seeking_work"?"若有已约定的报销、退款或有偿成果，可能得到确认":direct?"已完成事项较可能带来报酬确认、结算到账或原欠款归还":"合作、新客户或成果的新用途可能带来进账与分配机会";
    set("money_inflow",{level:visible&&!counter.length?"clear":visible?"possible":"weak",support,counter,rule:"supported-return-actor",
      label:everydayMoney?"原约定款项落实机会":"进财或结算机会",text:`${input.work==="unspecified"?"若有有偿成果或原款项约定，":""}${scene}。`,
      conditions:counter.length?["进财候选只取本年实际财作用；同段原任务的相反作用完整保留在反面依据，未据此另断到账时间。"]:[]});
  }
  else if(financialSpecial&&(wealthHelp.length||wealthPressure.length))
    set("money_inflow",{level:"none",text:"本段财的作用主要涉及投入、必要支持或新增承担，缺少可单列的进财线索。",
      support:[],counter:wealthPressure.map(index=>actorEvidence(index,"counter")),rule:"wealth-role-is-not-return"});
  const resourceCost=indexes(action=>isResource(action)&&hurts(action));
  const outputCost=indexes(action=>["食神","伤官","比肩","劫财"].includes(action.tenGod)&&hurts(action));
  const costEdges=relations.flatMap((edge,index)=>edge.contributesPressure&&["resource","output","wealth"].includes(edge.to.group)?[index]:[]);
  if(wealthPressure.length||resourceCost.length||outputCost.length||costEdges.length){
    const mainSupport=[...supports(wealthPressure),...supports(resourceCost),...supports(outputCost),...costEdges.map(index=>edgeEvidence(index,"support"))];
    const onlyBackground=!wealthPressure.length&&!resourceCost.length&&!outputCost.length;
    const scene=pattern.pathId==="food-killings"&&wealthPressure.length?"新增任务同时带来用品、协作或临时周转费用，可能出现计划外花费"
      :["official-resource","killings-resource"].includes(pattern.pathId)&&wealthPressure.length?"原安排占去必要工具或专业帮助，可能重复购买、重新学习，或为恢复执行追加费用"
      :selected==="resource_first"&&wealthPressure.length?"新承担挤占必要指导和工具，可能为补回帮助、练习或配套再花一笔钱"
      :resourceCost.length?"培训、资料、工具或新旧方法可能重复投入，出现花了钱却迟迟没用上的情况"
      :outputCost.length?"反复试做、返工或共同分担容易超出原预算，可能追加材料费或承担别人的一部分费用"
      :wealthPressure.length?"原约定款项可能拖延，临时花费或合作分担也容易增加"
      :"原安排仍占用时间、工具或服务，可能出现额外准备费、维护费或返工消耗";
    set("money_loss",{level:onlyBackground?"weak":"possible",support:mainSupport,counter:[],rule:"specific-investment-pressure",risk:true,
      label:"破财或额外花费倾向",text:`${scene}。`,conditions:["这里的破财包括预算外支出、重复投入或款项拖延，不据此推断投资亏损、盗失或确定金额。"]});
  }

  // Relationship candidates are assessed inside one active traditional lens.
  // Entry and hidden-to-visible are one star layer, never independent votes.
  for(const category of ["romance","commitment","separation"] as const){
    const candidates:Draft[]=[];
    for(const lens of timing.lenses){
      const annual=lens.signals.filter(signal=>lens.triggerSignalIds.includes(signal.id));
      if(!annual.length)continue;
      const background=lens.signals.filter(signal=>signal.source==="dayun");
      const star=annual.filter(signal=>signal.relevance==="primary_star"&&(signal.kind==="star_entry"||signal.kind==="hidden_to_visible"));
      const combine=annual.filter(signal=>signal.relationType==="branch_six_combination"||signal.relationType==="stem_five_combination");
      const clash=annual.filter(signal=>signal.relationType==="branch_six_clash"||signal.relationType==="stem_clash");
      const oldClash=background.filter(signal=>signal.relationType==="branch_six_clash"||signal.relationType==="stem_clash");
      const palaceCombine=combine.some(signal=>signal.kind==="palace_contact");
      const palaceClash=clash.some(signal=>signal.kind==="palace_contact");
      const starClash=clash.some(signal=>signal.kind==="star_stem_contact");
      let relevant:AnnualRelationshipTimingSignal[]=[],counter:AnnualRelationshipTimingSignal[]=[],level:EventTendencyLevel="none",text="";
      if(category==="romance"&&(star.length||combine.length)){
        relevant=[...star,...combine];counter=[...clash,...oldClash];level=star.length&&palaceCombine?"clear":star.length||palaceCombine?"possible":"weak";
        text=input.relationship==="separated"?"可能重新认识合适的人，或开始新的持续联络；这组线索不等于旧关系一定恢复。"
          :input.relationship==="partnered"?"现有交往可能更明确，见面、表达好感或关系定位有进一步发展的机会。"
          :input.relationship==="married"?"现有伴侣间可能增加亲近、表达或共同活动，不把这些线索解释为新恋情。"
          :"可能出现新相识、持续约会或更明确的好感，发展成恋爱关系的线索比平常更突出。";
      }
      if(category==="commitment"&&(star.length||combine.length)&&input.relationship!=="separated"){
        relevant=[...star,...combine];counter=[...clash,...oldClash];
        level=palaceCombine&&(star.length||input.relationship==="partnered")?"possible":"weak";
        text=input.relationship==="married"?"可能商量长期共同生活、家庭计划或重新落实原来的承诺，不表示再次结婚。"
          :input.relationship==="partnered"?"可能谈到婚事、见家人、共同居住或确定长期承诺，关系从交往走向具体安排。"
          :input.relationship==="single"?"新关系若持续发展，可能较快谈到认真交往或未来安排；单独看这一年，谈婚线索仍弱于相识机会。"
          :"已有稳定交往者，可能谈婚论嫁、见家人或讨论共同生活；单身者则更接近关系确定后的下一步。";
      }
      if(category==="separation"&&clash.length){
        relevant=clash;counter=combine;
        level=palaceClash&&starClash?"possible":"weak";
        text=input.relationship==="single"?"相识或联系可能中断、拉开距离，或发现彼此并不适合；这不表示已有婚姻发生分离。"
          :input.relationship==="separated"?"旧关系的交接、联系边界或未结事项可能再次调整，更接近旧事收尾，不是再次分手。"
          :input.relationship==="married"?"共同生活容易出现磨合或明显分歧，可能暂时分居、减少联系，或讨论关系是否继续。"
          :input.relationship==="partnered"?`交往可能因分歧而疏远、暂停，或讨论分开${level==="weak"?"；单一变化线索仍属于较弱候选":"，关系变化的线索较集中"}。`
          :`若已有伴侣，可能因计划、陪伴或期待分歧而疏远，甚至考虑分开${level==="weak"?"；单一变化线索仍较弱":"，关系变化的线索较集中"}。`;
      }
      if(level!=="none")candidates.push({level,text,support:relevant.map(signal=>signalEvidence(signal,lens.id,"support")),counter:counter.map(signal=>signalEvidence(signal,lens.id,"counter")),
        rule:`relationship-${category}`,lensIds:[lens.id],risk:category==="separation"});
    }
    if(candidates.length){
      const best=Math.max(...candidates.map(item=>rank[item.level])),chosen=candidates.filter(item=>rank[item.level]===best),first=chosen[0]!;
      const lensIds=unique(chosen.flatMap(item=>item.lensIds??[])),prefix=timing.lenses.length>1&&lensIds.length===1?"其中一种关系视角提示：":"";
      const counters=unique(chosen.flatMap(item=>item.counter)),counterLenses=unique(evidence.filter(item=>counters.includes(item.id)).map(item=>item.lensId).filter(Boolean));
      const counterText=category==="separation"||!counters.length?"":counterLenses.length<lensIds.length
        ?"其中一种关系视角另提示，原有期待或相处节奏可能使推进反复。"
        :category==="commitment"?"具体安排也可能因原有分歧而反复讨论。":"推进中也可能因既有期待或相处节奏出现反复。";
      set(category,{...first,text:prefix+first.text+counterText,support:unique(chosen.flatMap(item=>item.support)),counter:counters,lensIds,
        label:category==="romance"&&input.relationship==="married"?"伴侣亲近机会":category==="commitment"&&input.relationship==="married"?"长期共同承诺":category==="separation"&&input.relationship==="separated"?"旧关系事项收尾":category==="separation"&&input.relationship==="single"?"联系中断或疏远线索":undefined});
    }
    if(category==="commitment"&&input.relationship==="separated")no(category,"已分开背景下，不把旧联系或收尾事项归为谈婚论嫁。",true);
  }

  return categories.map(category=>{
    const domain:EventTendencyDomain=["promotion","job_change"].includes(category)?"career":["money_inflow","money_loss"].includes(category)?"wealth":"relationship";
    let draft=drafts.get(category)!;
    if(!applicableIntervals.length)draft={level:age.stage==="unknown"?"none":"not_applicable",support:[],counter:[],rule:"age-boundary",
      text:age.stage==="unknown"?"年龄范围未明确，暂不生成成人职业、财务或婚恋事件。":"本段不适用成人职业、财务或婚恋事件；原成长、活动与同伴解读仍保留。"};
    const ids=unique([...draft.support,...draft.counter]),used=evidence.filter(item=>ids.includes(item.id));
    const scopeLabel=timing.lenses.length>1&&(draft.lensIds?.length===1)?"其中一种关系视角：":"";
    const label=scopeLabel+(draft.label??labels[category])+(draft.level==="weak"&&!draft.label?"（较弱线索）":draft.level==="none"?"：缺少明显线索":draft.level==="not_applicable"?"：当前不适用":"");
    return {id:`annual-event-tendency-${year.year}-${segment.branchId}-${segment.id}-${category}`,version:ANNUAL_EVENT_TENDENCIES_VERSION,category,domain,level:draft.level,
      direction:draft.level==="none"||draft.level==="not_applicable"?"unindicated":draft.counter.length?"mixed":draft.risk?"pressured":"supported",
      label,text:draft.text,scope:{...scope},applicableIntervals:structuredClone(applicableIntervals),workState:input.work,relationshipState:input.relationship,
      sourceSubjects:[...input.sources[domain].sourceSubjects],eventIds:[...input.sources[domain].eventIds],sourceVersions:[ANNUAL_EVENT_TENDENCIES_VERSION,j.version,j.policyVersion,...(domain==="relationship"?timing.sourceVersions:[])],
      sourceIds:[...(domain==="relationship"?timing.sourceIds:pattern.sourceIds)],
      evidence:structuredClone(used),supportEvidenceIds:unique(draft.support),counterEvidenceIds:unique(draft.counter),lensIds:draft.lensIds??[],ruleIds:[`annual-event-tendency:${draft.rule}:v1`],
      conditions:unique([methodCondition,...(draft.conditions??[]),...(age.stage==="adult_transition"?["只在本段已满18周岁的实际区间使用成人事件表达，未成年部分不适用。"]:[]),
        ...(!j.sourceBinding.includeHour?["本次排除时柱，只使用已知柱及原时段证据，未补造未知时柱。"]:[])])};
  });
}
