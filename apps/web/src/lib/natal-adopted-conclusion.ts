import type { RevisionRecord } from "@hakimi/contracts";
import type { BaziPreliminaryAssessment, PreliminarySource } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import type { BaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import type { NatalUsefulEntry } from "../../../../packages/bazi-interpretation/src/natal-useful-guidance";
import type { FiveElement } from "../../../../packages/bazi-interpretation/src/strength-assessment-core";
import { strengthElementLabel } from "../../../../packages/bazi-interpretation/src/strength-assessment-core";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { buildNatalStructureDetail } from "../../../../packages/bazi-interpretation/src/natal-structure-detail";
import { getWorkingBalance } from "../../../../packages/bazi-interpretation/src/structural-strength-assessment";

export const NATAL_ADOPTED_CONCLUSION_VERSION = "hakimi.natal-adopted-conclusion/0.2.0" as const;
export type NatalConclusionPurpose = "pattern" | "balance" | "seasonal";
export interface NatalConclusionTarget {
  kind: "stem" | "element"; value: string; label: string;
  tenGod: string | null; presence: NatalUsefulEntry["presence"] | null;
}
export interface NatalConclusionUse {
  id: string; title: string; decision: string;
  targets: NatalConclusionTarget[]; purposes: NatalConclusionPurpose[];
  priorityReason: string; availability: string;
  conditions: string[]; evidence: string[]; sourceIds: string[]; sourceSubjects: string[];
  basis: "existing_task" | "checked_seasonal_clause" | "working_balance" | "specific_limit";
}
export interface NatalConclusionAvoid {
  id: string; title: string; decision: string;
  purposes: NatalConclusionPurpose[]; targets: NatalConclusionTarget[];
  conditions: string[]; evidence: string[]; sourceIds: string[]; sourceSubjects: string[];
}
export interface NatalConclusionAxis {
  title: string; decision: string; preferred: string[]; auxiliary: string[];
  conditions: string[]; evidence: string[]; sourceIds: string[]; sourceSubjects: string[];
}
export interface NatalAdoptedConclusion {
  version: typeof NATAL_ADOPTED_CONCLUSION_VERSION;
  /** A computed reading, never a user's personally adopted revision. */
  selectionKind: "local_synthesis";
  sourceBinding: { caseId: string; revisionId: string; chartResultHash: string; includeHour: boolean };
  sourceVersions: string[];
  headline: string; summary: string;
  pattern: { pathId: string; title: string; decision: string; status: "adopted_path" | "background_only";
    conditions: string[]; evidence: string[]; sourceIds: string[]; sourceSubjects: string[] };
  firstChoice: NatalConclusionUse;
  secondChoices: NatalConclusionUse[];
  /** Existing objects/companions are not automatically next-best useful gods. */
  retainedRoles: NatalConclusionUse[];
  avoid: NatalConclusionAvoid[];
  axes: { pattern: NatalConclusionAxis; balance: NatalConclusionAxis; seasonal: NatalConclusionAxis };
  scoreBasis: {
    supportWeight: number; demandWeight: number; supportRatio: number | null; rawLabel: string;
    workingLabel: string; selection: "structural_rule" | "raw_fallback"; ruleId: string;
    workingDirection: string; favorableElements: FiveElement[]; unfavorableElements: FiveElement[];
    sensitivityLabel: string; scenarioDirections: string[];
    explanation: string; evidence: string[];
  };
  sources: (PreliminarySource & { usageNote: string })[];
  sourceSubjects: string[]; conditions: string[];
}
export interface BuildNatalAdoptedConclusionInput {
  revision: RevisionRecord; assessment: BaziPreliminaryAssessment; comprehensive: BaziComprehensiveReading;
}

const unique=<T>(values:readonly T[])=>[...new Set(values)];
const stable=(value:unknown):string=>JSON.stringify(value,(_key,item)=>item&&typeof item==="object"&&!Array.isArray(item)
  ?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
const same=(a:unknown,b:unknown)=>stable(a)===stable(b);
const pathNames:Record<string,string>={
  "resource-output":"印格泄秀","peer-output-wealth":"禄劫用食伤生财","wealth-food":"财格用食伤生财",
  "food-wealth":"食神生财","hurting-wealth":"伤官取财","official-resource":"官印相生","killings-resource":"杀印相生",
  "official-wealth":"财官相生","food-killings":"食神制杀","hurting-resource":"伤官配印",
  "resource-preservation":"印食配合","resource-wealth":"印旺用财"
};
const output=(entry:NatalUsefulEntry)=>["食神","伤官"].includes(entry.tenGod);
const resource=(entry:NatalUsefulEntry)=>["正印","偏印"].includes(entry.tenGod);
const wealth=(entry:NatalUsefulEntry)=>["正财","偏财"].includes(entry.tenGod);

/** A current, explicit synthesis of already computed tasks and checked clauses.
 * It never changes a score/path or treats a personally adopted note as a model
 * conclusion. Callers guard each sourceSubjects set before showing this layer. */
export function buildNatalAdoptedConclusion({revision,assessment,comprehensive}:BuildNatalAdoptedConclusionInput):NatalAdoptedConclusion{
  const fail=(text:string):never=>{throw new Error(`本命采用结论：${text}`);};
  const expected=buildBaziPreliminaryAssessment(revision);
  if(!same(expected,assessment))return fail("初判或后台得分与本次修订不一致。");
  const expectedReading=buildBaziComprehensiveReading(revision,assessment);
  if(!same(expectedReading,comprehensive))return fail("格局、取用或完整解读不是同源当前版本。");
  const diagnosis=comprehensive.patternDiagnosis,guidance=comprehensive.usefulGuidance;
  if(!diagnosis||!guidance)return fail("缺少原格局与取用说明。");
  const detail=buildNatalStructureDetail({revision,assessment,comprehensive}),working=getWorkingBalance(assessment);
  const path=diagnosis.primaryPathId,task=diagnosis.wealthResourceTask,entries=guidance.entries;
  const selected=task.preferredPathId===path?task.task:null;
  const entryFor=(stem:string)=>entries.find(entry=>entry.stem===stem);
  const pick=(stems:readonly string[])=>unique(stems).map(stem=>entryFor(stem)??fail(`原取用中缺少${stem}。`));
  const subjects=(items:readonly NatalUsefulEntry[],pattern=true)=>unique([...(pattern?["chapter-structure"]:[]),"chapter-useful_elements",...items.map(entry=>`useful-stem-${entry.id}`)]);
  const target=(entry:NatalUsefulEntry):NatalConclusionTarget=>({kind:"stem",value:entry.stem,label:`${entry.stem}${entry.tenGod}`,tenGod:entry.tenGod,presence:entry.presence});
  const elementTarget=(element:FiveElement):NatalConclusionTarget=>({kind:"element",value:element,label:strengthElementLabel(element),tenGod:null,presence:null});
  const names=(items:readonly NatalUsefulEntry[])=>items.map(entry=>`${entry.stem}${entry.tenGod}`).join("、");
  const availability=(items:readonly NatalUsefulEntry[])=>items.map(entry=>`${entry.stem}${entry.presence==="exposed_rooted"?"已透有根":entry.presence==="exposed_unrooted"?"已透但缺同五行藏根":entry.presence==="hidden_only"?"仅藏于地支":"原局未见"}`).join("；");
  const itemConditions=(items:readonly NatalUsefulEntry[])=>unique(items.flatMap(entry=>[...entry.conditions,...entry.interactions.map(value=>value.text)]));
  const uses=(id:string,title:string,decision:string,items:NatalUsefulEntry[],purposes:NatalConclusionPurpose[],reason:string,basis:NatalConclusionUse["basis"],extraSources:string[]=[],conditions:string[]=[]):NatalConclusionUse=>({
    id,title,decision,targets:items.map(target),purposes,priorityReason:reason,availability:availability(items),basis,
    conditions:unique([...conditions,...itemConditions(items)]),evidence:unique(items.flatMap(entry=>[entry.presenceText,...entry.roles.filter(role=>purposes.includes(role.axis)).map(role=>role.text)])),
    sourceIds:unique([...extraSources,...items.flatMap(entry=>entry.sourceIds)]),sourceSubjects:subjects(items,purposes.includes("pattern"))
  });
  const primary=pick(guidance.answer.primaryStems),companions=pick(guidance.answer.companionStems);
  const guiZi=revision.facts.pillars.day.stem==="癸"&&revision.facts.pillars.month.branch==="子"
    &&assessment.seasonal.ruleId==="qiongtong-gui-zi-w2294674-v1"
    &&assessment.seasonal.sourceIds.includes("preliminary-qiongtong-gui-zi")
    &&entryFor("丙")?.roles.some(role=>role.kind==="seasonal_preferred")
    &&entryFor("辛")?.roles.some(role=>role.kind==="seasonal_conditional");
  const dual=detail.findings.find(finding=>finding.kind==="resource_food_controls_killing");
  const shallow=detail.findings.find(finding=>finding.kind==="protect_shallow_food");
  const chen=detail.findings.find(finding=>finding.kind==="chen_ren_resource_use");
  let patternName=selected==="resource_first"?"伤官财重，以印护身制伤":selected==="wealth_first"?"伤官印重，以财调印":
    selected==="official_joint"?"官格财印分用":working.focus==="rooted_peer_mixed_authority"?"禄劫背景，财生官兼带七杀":pathNames[path]??`${assessment.pattern.monthMainTenGod}月令背景`;
  const background=chen?"辰月杂气，壬印已透参与取用":`${revision.facts.pillars.month.branch}月${assessment.pattern.monthMainTenGod}当令`;
  const patternDecision=`${background}。当前主判采用${patternName}。${working.focus==="rooted_peer_mixed_authority"?"官杀尚未取清，因此不按纯正官格定论。":diagnosis.status==="background_only"?"已能确定月令背景，具体成局配合尚未齐备。":diagnosis.status==="obstructed"?"主路径已定，原局有具体受制环节，不能等同已经成格。":diagnosis.status==="rescue_candidate"?"主路径带有救应候选，救应的合克限制仍保留。":""}`;
  let action=selected==="resource_first"?`首用${names(primary)}护身、制伤，保住必要的印；财不再列为优先增补。`
    :selected==="wealth_first"?`首用${names(primary)}调节过多的印，使原有输出能够发挥；印仍保留支持基础。`
    :selected==="official_joint"?`财印并用：${names(primary.filter(wealth))}资官，${names(primary.filter(resource))}承官生身，两者各有用途。`
    :working.focus==="wealth_moderates_resource"?`首用${names(primary)}裁抑过多印的投入，保留必要印的支持。`
    :working.focus==="rooted_peer_mixed_authority"?`格局保留${names(primary)}的财作用，同时生官与生杀；官杀尚未取清，不把两种作用合成一项利好。`
    :["official-resource","killings-resource"].includes(path)?`首用${names(primary)}承接${path==="official-resource"?"官":"杀"}、支持日主，先保住执行与生身环节。`
    :path==="food-killings"?`首用${names(primary)}制杀${shallow?"，当前尤其要保护这条根浅而受印克的食神支点":"，七杀是被调节的对象，不是继续增加的首选"}。`
    :path==="resource-output"?`首用${names(primary)}泄秀${dual?"，同一食神还制约原有七杀，两个功能共享一个支点":"，把印的支持转成实际输出"}。`
    :path==="official-wealth"?`首用${names(primary)}为官提供配合，官的职责与财的负担分别保留。`
    :path==="hurting-resource"?`首用${names(primary)}制伤、扶身，伤官是需要配合的对象。`
    :primary.length?`首用${names(primary)}${primary.every(wealth)?"承接已有食伤产出":"负责产出与生财环节"}。`:"";
  const patternAction=action,adoptedPrimary=guiZi?pick(["丙"]):primary;
  if(guiZi)action=`首取丙火温通，辛金的滋扶排在丙的配用前提之后；${working.focus==="rooted_peer_mixed_authority"?"格局中的财生官杀另保留取舍":"原格局用字仍承担自己的作用"}。`;
  const primaryPurposes:NatalConclusionPurpose[]=guiZi?["seasonal"]:["pattern"];
  if(!guiZi&&primary.some(entry=>entry.roles.some(role=>role.kind==="seasonal_preferred")))primaryPurposes.push("seasonal");
  let firstChoice=uses("primary",guiZi?"首用丙：调候温通":selected==="official_joint"?"首用：财印分工":`首用${names(primary)}`,action,adoptedPrimary,primaryPurposes,
    guiZi?"已核癸日子月调候条明确丙的温通前提，不能由扶抑分数把辛排到丙之前。":selected&&task.preferredPathId?"原局财印透藏、根气和限定分用任务已决定当前先后。":shallow?"原食神制杀任务与浅食补断一致：先保护食神的具体作用，不以印能生身一概添印。":dual?"原印令泄秀路径与食神兼制杀任务一致，优先保护实际辛字，不把两功能重复计分。":"采用原取用主任务与实际透藏支点；后台得分只校验扶抑范围，不按分数高低排用神。",
    guiZi?"checked_seasonal_clause":"existing_task",unique([...guidance.answer.sourceIds,...(dual?.sourceIds??[]),...(shallow?.sourceIds??[]),...(chen?.sourceIds??[])]),
    [guidance.answer.condition,...(shallow?.conditions??[]),...(chen?.conditions??[])]);
  if(!guiZi){
    firstChoice.sourceSubjects=unique([...firstChoice.sourceSubjects,...subjects(entries.filter(entry=>entry.roles.some(role=>role.kind==="path_key"))),
      ...detail.findings.flatMap(finding=>finding.sourceSubjects)]);
    firstChoice.evidence=unique([...firstChoice.evidence,...detail.findings.flatMap(finding=>[finding.decision,...finding.evidence])]);
  }else if(entryFor("辛"))firstChoice.sourceSubjects=unique([...firstChoice.sourceSubjects,...subjects(pick(["辛"]),false)]);
  if(!adoptedPrimary.length){
    firstChoice={id:"primary-limit",title:working.favorableElements.length?"首取当前扶抑方向":"主路径已明，具体首用暂不指定",
      decision:working.favorableElements.length?`扶抑采用${working.favorableElements.map(strengthElementLabel).join("、")}的${working.direction==="support"?"生扶":"泄耗制衡"}作用；具体天干不从五行分数反推。`:`已确定${patternName}背景；当前未形成有原局配合支持的具体首用字。这个限制只针对用字，不取消月令与原局作用判断。`,
      targets:working.favorableElements.map(elementTarget),purposes:["balance"],priorityReason:"原取用答案没有指定透干首用，保留已经算出的扶抑方向，不补造缺失天干。",availability:"具体透藏沿原条目保留。",
      basis:working.favorableElements.length?"working_balance":"specific_limit",conditions:[...working.conditions],evidence:[...working.evidence],sourceIds:[...working.sourceIds],sourceSubjects:["chapter-structure","chapter-useful_elements"]};
  }
  const secondChoices:NatalConclusionUse[]=[],retainedRoles:NatalConclusionUse[]=[];
  if(guiZi&&primary.some(entry=>entry.stem!=="丙"))secondChoices.push(uses("pattern-companion",`格局配用${names(primary)}`,patternAction,primary,["pattern"],
    "丙温通属于调候先后；原格局用字继续负责原任务，不因调候优先而被替换。","existing_task",guidance.answer.sourceIds,[guidance.answer.condition]));
  const weakConflict=!guiZi&&!task.preferredPathId&&working.direction==="support"
    &&primary.some(entry=>entry.roles.some(role=>role.kind==="baseline_unfavorable"));
  if(weakConflict&&working.favorableElements.length){
    secondChoices.push({...firstChoice,id:"conditional-pattern",title:`格局配用${names(primary)}`,decision:`${action}这项格局作用排在扶身条件之后，不能把泄耗越多当作越好。`});
    firstChoice={id:"support-first",title:`首稳${working.favorableElements.map(strengthElementLabel).join("、")}的生扶`,decision:`当前扶抑判为${working.label}，首取${working.favorableElements.map(strengthElementLabel).join("、")}的生扶；${names(primary)}的格局任务保留为配用，不继续扩大泄耗。`,
      targets:working.favorableElements.map(elementTarget),purposes:["balance"],priorityReason:"原取用已记录格局用字与扶抑承受力相冲；先后以这个明确限制收束，不由单个分数排序。",availability:"原局有无相应支持，仍沿实际透藏。",
      basis:"working_balance",conditions:unique([...working.conditions,guidance.answer.condition]),evidence:[...working.evidence],sourceIds:unique([...working.sourceIds,...guidance.sourceIds]),sourceSubjects:subjects(primary)};
  }
  const checked=assessment.seasonal.coverage==="checked_classic_clause";
  const seasonalSource=assessment.sources.find(source=>assessment.seasonal.sourceIds.includes(source.id));
  const seasonalScope=seasonalSource?.provenance;
  const seasonalReason=seasonalScope?.scope==="season"?`采用已核《${seasonalScope.section}》季节总论，并按本盘节令月份匹配；不将总论冒作独立逐月专条。`
    :seasonalScope?.scope==="month_group"?`采用已核《${seasonalScope.section}》相邻月份合论，保留其中的组合条件。`
      :seasonalScope?.scope==="phase"?`采用已核《${seasonalScope.section}》月内阶段条文，具体先后仍受原阶段条件限制。`
        :"采用已经核对的日干月令条文。";
  const seasonalPreferred=checked?pick(assessment.seasonal.preferredStems):[];
  const seasonalConditional=checked?assessment.seasonal.conditionalStems:[],preferredNames=names(seasonalPreferred);
  let seasonalDecision=checked?`调候采用${preferredNames}，分别承担原条指定的气候用途。`:"当前只有简化季节观察，未核到这个日干月份的专条；不另指定调候首用。";
  if(assessment.seasonal.ruleId==="qiongtong-ji-si-w2294674-v1"){
    const xinTask=path==="resource-output"&&primary.some(entry=>entry.stem==="辛");
    seasonalDecision=`调候以癸水润土为先，丙火为配合；这项顺序与${xinTask?"辛食神的":"本盘"}格局主任务分别成立。${xinTask?"丙的调候配用不等于岁运逢火皆喜；新增火若合克辛，仍按这个支点受阻取舍。":""}`;
  }
  if(guiZi)seasonalDecision="调候以丙火温通为先，辛金滋扶须在配丙前提下使用，不能只添辛而略过丙。";
  const competingSeasonal=seasonalPreferred.filter(entry=>(path==="food-killings"&&entry.tenGod==="七杀")
    ||(selected==="resource_first"&&wealth(entry))||((selected==="wealth_first"||working.focus==="wealth_moderates_resource")&&resource(entry)));
  const seasonalSecondary=seasonalPreferred.filter(entry=>!competingSeasonal.includes(entry)&&!firstChoice.targets.some(target=>target.kind==="stem"&&target.value===entry.stem));
  const currentSeasonal=seasonalPreferred.filter(entry=>!competingSeasonal.includes(entry));
  if(competingSeasonal.length)seasonalDecision=`原调候条列${preferredNames}；本盘当前保留${names(currentSeasonal)}作气候配合，${names(competingSeasonal)}因与当前格局任务有取舍，只保留条件用途，不列作新增喜用。`;
  const seasonalTaskLimits=path==="food-killings"&&seasonalSecondary.some(wealth)
    ?[`${names(seasonalSecondary.filter(wealth))}若参与温通，也会生${names(entries.filter(entry=>entry.tenGod==="七杀"))}；当前保护食神的任务仍在，调候辅助不能抹去财生杀的另一面。`]:[];
  if(seasonalSecondary.length)secondChoices.push(uses("seasonal","调候辅助",competingSeasonal.length
    ?`调候辅助保留${names(seasonalSecondary)}；${names(competingSeasonal)}在原条中另有气候用途，但与本盘当前主任务有取舍，不直接列作新增辅助。`:seasonalDecision,seasonalSecondary,["seasonal"],
    `${seasonalReason}这里只给气候用途，不据此覆盖格局喜忌。`,"checked_seasonal_clause",assessment.seasonal.sourceIds,[...assessment.seasonal.conditions,...seasonalTaskLimits]));
  if(guiZi&&entryFor("辛"))secondChoices.push(uses("seasonal-companion","次配辛：滋扶须配丙","辛为条件配用，配合丙的温通而滋扶；原局未见辛时，不把配用写成已经到位。",pick(["辛"]),["seasonal"],
    "原调候条保留丙与辛的配合先后，辛的用途不能替代丙。","checked_seasonal_clause",assessment.seasonal.sourceIds,seasonalConditional.filter(item=>item.stem==="辛").map(item=>item.condition)));
  const moneyCompanions=companions.filter(entry=>wealth(entry)&&entry.roles.some(role=>role.kind==="path_key")
    &&!task.preferredPathId&&["peer-output-wealth","wealth-food","food-wealth","hurting-wealth"].includes(path));
  if(moneyCompanions.length)secondChoices.push(uses("output-to-wealth",`次配${names(moneyCompanions)}`,`${names(moneyCompanions)}承接食伤产出，排在已有产出环节之后；并非见财就一律有利。`,moneyCompanions,["pattern"],
    "原路径是先有产出、再由财承接；这是任务次序，不是预测事件发生先后。","existing_task",diagnosis.sourceIds));
  const consumed=new Set([firstChoice,...secondChoices].flatMap(item=>item.targets.filter(target=>target.kind==="stem").map(target=>target.value)));
  const remaining=unique([...companions,...competingSeasonal]).filter(entry=>!consumed.has(entry.stem));
  if(remaining.length)retainedRoles.push(uses("retained","保留的角色与条件用途",`${names(remaining)}保留原局角色或条文条件用途；未见、仅藏的字不作已透发挥，也不自动成为次喜用。`,remaining,["pattern"],
    "保留原取用答案的companion身份，同时区别有利配用和被制、被承接的对象。","existing_task",guidance.sourceIds));
  const avoid:NatalConclusionAvoid[]=[];
  const avoidItem=(id:string,title:string,decision:string,items:NatalUsefulEntry[],sourceIds:string[],conditions:string[]=[])=>avoid.push({id,title,decision,targets:items.map(target),purposes:["pattern"],
    conditions:unique([...conditions,...itemConditions(items)]),evidence:unique(items.flatMap(entry=>entry.interactions.map(item=>item.text))),sourceIds:unique([...sourceIds,...items.flatMap(entry=>entry.sourceIds)]),sourceSubjects:subjects(items)});
  if(selected==="resource_first")avoidItem("wealth-overload","忌财再重而伤必要印",`不把${names(entries.filter(wealth))}继续加重列为喜用；当前要保的是${names(primary)}护身制伤。`,entries.filter(wealth),task.sourceIds);
  else if(selected==="wealth_first"||working.focus==="wealth_moderates_resource")avoidItem("resource-excess","忌继续堆印、堵住输出","原印保留必要支持，忌继续增加重复的印而压住输出；用财调印也须保留财自身受合受克的限制。",entries.filter(resource),unique([...task.sourceIds,...working.sourceIds]),[guidance.answer.condition]);
  else if(path==="resource-output")avoidItem("resource-blocks-output","忌增印压住食伤出口",`印的生身作用保留，但不把加印当作普遍有利；${names(primary)}的泄秀${dual?"与制杀":""}作用不能被新的合克压住。`,entries.filter(resource),diagnosis.sourceIds);
  else if(path==="food-killings")avoidItem("resource-controls-food","忌印继续压食，杀的负担再增",`食神是当前制杀支点，忌印的克食作用继续加重${shallow?"；现有印生身的用途仍保留，不把印一概判忌":"，也不以财护食就忽略财可能生杀"}。`,entries.filter(resource),unique([...diagnosis.sourceIds,...(shallow?.sourceIds??[])]),shallow?.conditions??[]);
  else if(working.focus==="rooted_peer_mixed_authority")avoidItem("mixed-authority","忌官杀未清时笼统加官杀","财生官与财生杀并存，官杀未取清；不把继续加土或日主自合当作取清完成。",entries.filter(entry=>["正官","七杀"].includes(entry.tenGod)),diagnosis.sourceIds);
  else if(["official-resource","killings-resource","hurting-resource"].includes(path))avoidItem("protect-resource","忌破坏必要印的配合",selected==="official_joint"?"原局财印有条件分工，忌把后来新增财印的直接合克也套用原局隔护；不能笼统判原财为忌。":"必要印承担承官杀或制伤、生身的任务；忌财直接伤印，也不把缺根或受合的印当作无条件可用。",entries.filter(wealth),diagnosis.sourceIds);
  else if(["peer-output-wealth","wealth-food","food-wealth","hurting-wealth"].includes(path))avoidItem("protect-output-wealth","忌堵住产出或破坏财的承接","食伤与财各有任务；忌印夺食、比劫直接夺财等破坏原配合的作用，不能把同一五行的所有用法都判成吉凶。",entries.filter(entry=>resource(entry)||["比肩","劫财"].includes(entry.tenGod)),diagnosis.sourceIds);
  else avoidItem("specific-limits","忌项按具体作用限定","当前不指定全盘统一忌神；已见合克与原路径限制逐项保留，不从五行分数补造一个绝对忌项。",[],diagnosis.sourceIds,diagnosis.conditions);
  const balanceDecision=`扶抑采用“${working.label}”。${working.direction==="balanced"?"当前不固定偏向补某一组五行。":working.direction==="conditional"?"当前强弱工作判断已有结论，用字仍按具体官、杀、财、印任务取舍。":`这一轴以${working.favorableElements.map(strengthElementLabel).join("、")}的${working.direction==="support"?"生扶":"泄耗制衡"}为利，不等同所有这些五行的作用都好。`}`;
  const patternSubjects=unique(["chapter-structure",...detail.findings.flatMap(item=>item.sourceSubjects)]),axisSubjects=subjects(entries);
  const axes={pattern:{title:"格局用神",decision:patternAction||patternDecision,preferred:guidance.answer.primaryStems,auxiliary:moneyCompanions.map(entry=>entry.stem),conditions:unique([guidance.answer.condition,...diagnosis.conditions]),evidence:[...diagnosis.foundation],sourceIds:[...diagnosis.sourceIds],sourceSubjects:axisSubjects},
    balance:{title:"扶抑喜忌",decision:balanceDecision,preferred:working.favorableElements.map(strengthElementLabel),auxiliary:[],conditions:[...working.conditions],evidence:[...working.evidence],sourceIds:[...working.sourceIds],sourceSubjects:["chapter-structure","chapter-useful_elements"]},
    seasonal:{title:"调候用字",decision:seasonalDecision,preferred:currentSeasonal.map(entry=>entry.stem),auxiliary:seasonalConditional.map(item=>item.stem),conditions:unique([...assessment.seasonal.conditions,...seasonalTaskLimits,...seasonalConditional.map(item=>`${item.stem}：${item.condition}`)]),evidence:[...assessment.seasonal.evidence],sourceIds:[...assessment.seasonal.sourceIds],sourceSubjects:subjects(pick(unique([...assessment.seasonal.preferredStems,...seasonalConditional.map(item=>item.stem)])),false)}};
  const usedIds=unique([...diagnosis.sourceIds,...detail.sourceIds,...firstChoice.sourceIds,...secondChoices.flatMap(item=>item.sourceIds),...avoid.flatMap(item=>item.sourceIds),...working.sourceIds,...assessment.seasonal.sourceIds]);
  const pool=new Map([...assessment.sources,...(comprehensive.sources??[]),...detail.sources].map(source=>[source.id,source]));
  const sources=usedIds.flatMap(id=>{const source=pool.get(id);return source?[{...structuredClone(source),usageNote:"excerpt为原来源保存的短引；interpretation为既有本地释义。本层首选、次选和忌项的组合是本地综合采用，不冒称古籍统一排序。"}]:[];});
  return {version:NATAL_ADOPTED_CONCLUSION_VERSION,selectionKind:"local_synthesis",sourceBinding:{caseId:revision.caseId,...comprehensive.sourceBinding},
    sourceVersions:unique([NATAL_ADOPTED_CONCLUSION_VERSION,assessment.version,comprehensive.version,diagnosis.version,guidance.version,...detail.sourceVersions]),
    headline:patternName,summary:`${patternDecision}${firstChoice.decision}`,
    pattern:{pathId:path,title:patternName,decision:patternDecision,status:diagnosis.status==="background_only"?"background_only":"adopted_path",
      conditions:[...diagnosis.conditions],evidence:[...diagnosis.foundation],sourceIds:unique([...diagnosis.sourceIds,...detail.sourceIds]),sourceSubjects:patternSubjects},
    firstChoice,secondChoices,retainedRoles,avoid,axes,
    scoreBasis:{supportWeight:assessment.balance.supportWeight,demandWeight:assessment.balance.demandWeight,supportRatio:assessment.balance.supportRatio,rawLabel:assessment.balance.label,
      workingLabel:working.label,selection:working.selection,ruleId:working.ruleId,workingDirection:working.direction,favorableElements:[...working.favorableElements],unfavorableElements:[...working.unfavorableElements],
      sensitivityLabel:assessment.balance.sensitivityLabel,scenarioDirections:unique(assessment.balance.scenarioDirections.map(item=>item.direction)),
      explanation:`后台支持侧${assessment.balance.supportWeight}、泄耗克侧${assessment.balance.demandWeight}，用于${working.selection==="structural_rule"?"保留原计权并对照已命中的结构工作判断":"当前扶抑基线"}；实际采用${working.label}。这些数值不用于给天干排用神名次，根、透藏、任务和调候前提另列。`,
      evidence:unique([...assessment.balance.evidence,...working.evidence])},
    sources,sourceSubjects:unique([...patternSubjects,...firstChoice.sourceSubjects,...secondChoices.flatMap(item=>item.sourceSubjects),...retainedRoles.flatMap(item=>item.sourceSubjects),...avoid.flatMap(item=>item.sourceSubjects)]),
    conditions:unique(["这是本地综合采用结论，不是用户个人修订，不改原格局、分数或反馈原文。","首用与辅助表示当前用途优先；有用不等于该字已透、足量或不受制，亦不表示某五行越多越好。",
      ...(!comprehensive.sourceBinding.includeHour?["时柱已排除，结论只覆盖所选已知柱；未知时辰不能补成完整四柱结论。"]:[]),...guidance.conflicts])};
}
