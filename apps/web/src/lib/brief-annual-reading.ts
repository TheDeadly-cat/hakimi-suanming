import type { RevisionRecord, TransitNodeRef } from "@hakimi/contracts";
import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import type { NatalWealthResourceTask } from "../../../../packages/bazi-interpretation/src/natal-wealth-resource-task";
import { buildAnnualReaderAnswer, ANNUAL_READER_ANSWER_VERSION } from "./annual-reader-answer";
import type { AnnualLifeStory, AnnualLifeStoryBasisRef } from "./annual-life-story";
import { annualLifeStorySubjectId } from "./annual-life-story-record";
import { annualEventFeedbackSubjectId } from "./local-annual-event-record";
import type { AnnualEventSegment, LocalAnnualEventReading } from "./local-annual-event-reading";
import { buildAnnualDomainReading, type AnnualReadingDomainId } from "./local-annual-domain-reading";
import type { LocalAnnualYear } from "./local-annual-outlook";
import type { LocalOutlookJudgment, OutlookAxisFinding, OutlookStemAction } from "./local-outlook-judgment";
import type { OutlookRescueTraceBundle } from "./outlook-rescue-trace";
import { createAnnualRelationshipTimingBuilder, ANNUAL_RELATIONSHIP_TIMING_VERSION, type AnnualRelationshipTiming, type AnnualRelationshipTimingSignal } from "./annual-relationship-timing";
import { buildContextualAnnualReadings, CONTEXTUAL_READING_VERSION, type ContextualDomainReading } from "./local-contextual-reading";
import type { LocalContextualReadingBundle } from "./local-contextual-reading-record";
import { readingContextDraftSchema, READING_CONTEXT_FORMAT, type ReadingContextWork, type ReadingContextRelationship } from "./local-reading-context";
import { buildLocalReadingAgeContext, type LocalReadingAgeContext, type LocalReadingAgeStage } from "./local-reading-age-context";
import { plainOutlookCaption, PLAIN_OUTLOOK_READING_VERSION } from "./plain-outlook-reading";
import { buildAnnualEventTendencies, ANNUAL_EVENT_TENDENCIES_VERSION, type AnnualEventTendency } from "./annual-event-tendencies";

export const BRIEF_ANNUAL_READING_VERSION = "hakimi.brief-annual-reading/0.3.1" as const;
export interface BuildBriefAnnualReadingInput {
  revision: RevisionRecord; assessment: BaziPreliminaryAssessment; year: LocalAnnualYear;
  events: LocalAnnualEventReading; story: AnnualLifeStory; contextual?: LocalContextualReadingBundle | null;
}
export interface BriefAnnualDomain {
  domain: AnnualReadingDomainId; title: string; text: string;
  verdict: BriefAnnualDomainVerdict;
  sourceSubjects: string[]; eventIds: string[]; basisRefs: AnnualLifeStoryBasisRef[];
  relationshipSignalIds: string[];
  relationshipBackgroundSignalIds: string[];
}
export interface BriefAnnualDomainVerdict {
  direction: "favorable" | "pressured" | "mixed" | "neutral" | "unknown";
  label: string;
  focus: "work_progress" | "returns" | "spending" | "allocation" | "support_use" | "relationship" | "companionship";
  relationshipChange: "progression" | "friction" | "adjustment" | "insufficient" | null;
  relationshipState: ReadingContextRelationship | null;
  /** A presentation of an existing effect or independent relationship signal, never a new score. */
  basis: "pattern" | "relationship_signals";
  axisId: string | null; actionIndexes: number[]; backgroundPressure: boolean; lensIds: string[];
}
export interface BriefAnnualSegment {
  id: string; branchId: "locked" | "forward" | "backward";
  startInstant: string; endExclusiveInstant: string; personalStartInstant: string;
  yearNodeRef: TransitNodeRef; backgroundRefs: TransitNodeRef[]; backgroundLabels: string[];
  age: LocalReadingAgeContext; headline: string; caption: string;
  domains: BriefAnnualDomain[]; sourceSubjects: string[]; sourceVersions: string[]; conditions: string[];
  eventTendencies: AnnualEventTendency[];
  /** The original products remain the complete detail, with their old feedback identities. */
  detailsRef: { year: number; branchId: BriefAnnualSegment["branchId"]; judgmentSegmentId: string; storySegmentId: string; eventSegmentId: string };
}
export interface BriefAnnualReading {
  version: typeof BRIEF_ANNUAL_READING_VERSION; sourceBinding: LocalAnnualEventReading["sourceBinding"];
  sourceVersions: string[]; year: number; status: LocalAnnualEventReading["status"];
  contextRef: LocalAnnualEventReading["contextRef"];
  branches: { id: BriefAnnualSegment["branchId"]; label: string; segments: BriefAnnualSegment[]; conditions: string[] }[];
  limitations: string[];
}
const unique = <T>(values: readonly T[]) => [...new Set(values)];
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const same = (a: unknown, b: unknown) => stable(a) === stable(b);
const check = (ok: boolean, message: string) => { if (!ok) throw new Error(`精简年度阅读：${message}`); };
type Setting = { work: string; result: string; learning: string; materials: string; title: string; moneyTitle: string; adult: boolean; role?: ReadingContextWork; stage?: LocalReadingAgeStage };
function baseSetting(stage: LocalReadingAgeStage, work: ReadingContextWork): Setting {
  if (stage === "young_child") return { work:"游戏和小活动", result:"动手的小成果", learning:"示范与尝试", materials:"玩具和活动用品", title:"成长与活动", moneyTitle:"时间与用品", adult:false };
  if (stage === "youth") return { work:"练习和同伴活动", result:"练习或作品", learning:"学习和练习", materials:"学习与活动用品", title:"学习与活动", moneyTitle:"时间与用品", adult:false };
  if (stage !== "adult") return { work:"手头事项", result:"已做的事情", learning:"理解和尝试", materials:"时间和用品", title:"做事与配合", moneyTitle:"时间与用品", adult:false };
  if (work === "student") return { work:"课程与实践", result:"课程作品", learning:"课程学习", materials:"课程与材料投入", title:"学习与实践", moneyTitle:"学习投入", adult:true };
  if (work === "caregiving") return { work:"照料和家务", result:"已经做完的照料安排", learning:"照料方法", materials:"照料用品与替补时间", title:"照料与日常", moneyTitle:"照料投入", adult:true };
  if (work === "retired") return { work:"自选活动", result:"经验分享", learning:"兴趣学习", materials:"日常与兴趣支出", title:"生活与参与", moneyTitle:"日常收支", adult:true };
  if (work === "seeking_work") return { work:"求职准备", result:"申请材料和作品", learning:"岗位学习", materials:"求职与进修支出", title:"求职与能力", moneyTitle:"求职投入", adult:true };
  if (work === "self_employed") return { work:"客户服务", result:"已交付服务", learning:"专业准备", materials:"服务成本和工具投入", title:"经营与服务", moneyTitle:"收入与成本", adult:true };
  return { work:work === "employed" ? "工作任务" : "任务或作品", result:"技能成果", learning:"培训与方法准备", materials:"培训、工具与试做投入", title:"事业", moneyTitle:"财运", adult:true };
}
function setting(stage: LocalReadingAgeStage, work: ReadingContextWork):Setting{return {...baseSetting(stage,work),role:work,stage};}
function domainVerdict(domain:AnnualReadingDomainId,pattern:OutlookAxisFinding,action:OutlookStemAction,s:Setting,task:NatalWealthResourceTask|null,timing:AnnualRelationshipTiming,state:ReadingContextRelationship,rescueTrace?:OutlookRescueTraceBundle):BriefAnnualDomainVerdict{
  const relations=pattern.taskLinks?.items.flatMap(link=>link.relations)??[];
  const backgroundPressure=relations.some(edge=>edge.contributesPressure&&edge.from.origin.kind!=="target");
  if(domain==="relationship"){
    const panels=timing.lenses.map(lens=>({id:lens.id,
      eligible:lens.signals.filter(signal=>lens.triggerSignalIds.includes(signal.id)&&(s.stage==="adult"||signal.kind==="palace_contact")),
      background:lens.signals.filter(signal=>signal.source==="dayun"&&(s.stage==="adult"||signal.kind==="palace_contact"))}));
    const active=panels.filter(lens=>lens.eligible.length>0);
    const eligible=active.flatMap(lens=>lens.eligible),background=active.flatMap(lens=>lens.background);
    const clash=eligible.some(signal=>signal.kind==="palace_contact"&&signal.relationType==="branch_six_clash");
    const friction=eligible.some(signal=>signal.relationType==="stem_clash")||background.some(signal=>signal.relationType==="branch_six_clash"||signal.relationType==="stem_clash");
    const change:BriefAnnualDomainVerdict["relationshipChange"]=!eligible.length?"insufficient":clash?"adjustment":friction?"friction":"progression";
    const adult=s.stage==="adult",labels=adult?(state==="separated"?{progression:"联系与关系发展有线索",friction:"旧关系事项易有分歧",adjustment:"旧关系安排易变动",insufficient:"旧关系变化线索不足"}
      :{progression:"感情有推进线索",friction:"关系推进伴随磨合",adjustment:"感情安排易有变动",insufficient:"感情变化线索不足"})
      :{progression:"共同活动更突出",friction:"相处易有磨合",adjustment:"相处安排易调整",insufficient:"相处变化线索不足"};
    const lensIds=active.filter(lens=>change==="insufficient"?false:change==="adjustment"?lens.eligible.some(signal=>signal.kind==="palace_contact"&&signal.relationType==="branch_six_clash")
      :change==="friction"?[...lens.eligible,...lens.background].some(signal=>signal.relationType==="stem_clash"||signal.relationType==="branch_six_clash"):lens.eligible.length>0).map(lens=>lens.id);
    const prefix=adult&&timing.lenses.length>1&&lensIds.length===1?"其中一种关系视角：":"";
    return {direction:change==="insufficient"?"unknown":"neutral",label:prefix+labels[change],focus:adult?"relationship":"companionship",relationshipChange:change,relationshipState:adult?state:"unspecified",
      basis:"relationship_signals",axisId:null,actionIndexes:[],backgroundPressure:false,lensIds};
  }
  // The original path effect already includes persistent background obstacles,
  // rescue limitations and both target actors. Do not count actors or re-score.
  const direction:BriefAnnualDomainVerdict["direction"]=({assists:"favorable",obstructs:"pressured",mixed:"mixed",neutral:"neutral",unresolved:"unknown"} as const)[pattern.effect];
  const hidden=pattern.stemActions!.items.find(item=>item.visibility==="main_hidden")!;
  const leading=["neutral","unresolved"].includes(action.effect)&&["assists","obstructs","mixed"].includes(hidden.effect)?hidden:action;
  const selected=task?.preferredPathId===pattern.pathId?task.task:null,wealth=["正财","偏财"].includes(leading.tenGod),output=["食神","伤官"].includes(leading.tenGod);
  // A wealth actor can describe pressure on necessary support or added killing
  // load. Only its verified concrete action selects these focuses, not its name.
  const wealthAffectsSupport=wealth&&["official-resource","killings-resource"].includes(pattern.pathId)&&relations.some(edge=>
    edge.contributesPressure&&edge.from.origin.kind==="target"&&edge.from.stem===leading.stem
    &&edge.from.visibility===leading.visibility&&edge.to.group==="resource");
  const wealthAddsKillingLoad=wealth&&pattern.pathId==="food-killings"&&rescueTrace?.items.some(item=>
    item.axisId===pattern.id&&item.pathId===pattern.pathId&&item.kind==="wealth_protects_food"&&item.counterEffects.some(effect=>
      effect.status==="present"&&effect.from.origin.kind==="target"&&effect.from.stem===leading.stem
      &&effect.from.visibility===leading.visibility&&effect.targets.some(target=>target.tenGod==="七杀")));
  const daily=!s.adult||["student","seeking_work","caregiving","retired"].includes(s.role??"");
  const focus:BriefAnnualDomainVerdict["focus"]=domain==="career"?"work_progress"
    :((selected==="wealth_first"||pattern.pathId==="resource-wealth")&&wealth)?"spending"
    :(selected==="resource_first"||selected==="official_joint")?"support_use"
    :wealthAffectsSupport?"support_use":wealthAddsKillingLoad?"spending"
    :wealth?(daily?"spending":"returns"):output?"spending":["比肩","劫财"].includes(leading.tenGod)?"allocation":"support_use";
  const labels:Record<NonNullable<BriefAnnualDomainVerdict["focus"]>,Record<BriefAnnualDomainVerdict["direction"],string>>={
    work_progress:{favorable:`${s.title}较顺`,pressured:`${s.title}较费力`,mixed:`${s.title}有机会，也有阻力`,neutral:`${s.title}暂无明显顺逆`,unknown:`${s.title}暂难定好坏`},
    returns:{favorable:"约定回报较易兑现",pressured:"回报兑现容易拖延",mixed:"有回报机会，兑现仍有阻力",neutral:"回报顺逆尚不明确",unknown:"回报暂难判断"},
    spending:{favorable:"投入较有成效",pressured:"支出与消耗压力较大",mixed:"投入能发挥作用，也有额外消耗",neutral:"投入安排暂无明显顺逆",unknown:"投入效果暂难判断"},
    allocation:{favorable:"合作分配较顺",pressured:"共同分担容易起争议",mixed:"协作有帮助，分配也有阻力",neutral:"共同分担暂无明显顺逆",unknown:"分配结果暂难判断"},
    support_use:{favorable:"配套投入更能用上",pressured:"投入成效受阻",mixed:"有支持机会，也有受阻环节",neutral:"配套投入暂无明显顺逆",unknown:"配套效果暂难判断"},
    relationship:{favorable:"",pressured:"",mixed:"",neutral:"",unknown:""},companionship:{favorable:"",pressured:"",mixed:"",neutral:"",unknown:""}
  };
  const label=!s.adult&&focus==="spending"&&direction==="pressured"?"时间与用品消耗较多":labels[focus][direction];
  return {direction,label,focus,relationshipChange:null,relationshipState:null,basis:"pattern",axisId:pattern.id,
    actionIndexes:pattern.stemActions!.items.map((_item,index)=>index),backgroundPressure,lensIds:[]};
}
type Line = { topic: string; help: string; pressure: string };
function roleLine(god: string, domain: "career" | "wealth", s: Setting): Line {
  const money = domain === "wealth";
  const table: Record<string, Line> = money ? {
    正印:{topic:`可能涉及${s.materials}的增加或重新使用`,help:`已有${s.materials}更容易派上用场，重复购买或从头准备的必要性降低`,pressure:`${s.materials}较易增加，却可能迟迟没有实际用上`},
    偏印:{topic:"可能涉及换工具、专项学习或两套办法并用",help:"专项办法补上缺口，旧工具与已有投入较容易继续使用",pressure:"新旧工具和做法两头占用，转换成本与重复支出较易增加"},
    食神:{topic:"可能涉及成果续用、用品维护或费用延续",help:s.adult?"已有成果较容易继续使用，续用、维护或原约定回报有延续机会":"已有作品较能继续使用，材料和用品更容易沿用",pressure:"反复完成花去更多时间用品，持续使用却容易中断"},
    伤官:{topic:"可能涉及试做成本、工具添置与追加投入",help:s.adult?"试做和工具投入较能产生实际用途，采用后的回报仍属后续环节":"试做材料较能用于实际作品，追加用品更容易补到缺口",pressure:"修改和试做反复消耗，追加投入较容易超过原安排"},
    正财:{topic:s.adult?"可能涉及原约定款项、费用归还或续用确认":"可能涉及物品归还、重复使用或交接",help:s.adult?"已有报酬或费用较容易获确认，结算与续用有推进机会":"物品归还或再次使用较容易落实",pressure:s.adult?"原约定款项容易延后确认，后续承担可能继续占用投入":"物品归还或续用容易拖延，后续承担可能增加"},
    偏财:{topic:"可能涉及新增花费、共同投入或新的分配安排",help:s.adult?"新用途较易带来合作与分配机会，已有成果可能接到另一项使用":"新活动较容易得到用品或共同支持",pressure:"新用途挤占原投入，临时花费或分担较容易反复"},
    正官:{topic:"可能涉及履行约定所需的工具、时间与配套",help:"时间、用品与原约定较能对应，必要配套较容易到位",pressure:"答应承担的内容增加，配套投入却容易不足"},
    七杀:{topic:"可能涉及集中用款、临时用品或补缺安排",help:"有限投入较能补到关键缺口，临时周转较有支持",pressure:"几项需要争用同一份时间用品，临时支出较易增加"},
    比肩:{topic:"可能涉及个人使用份额或共同费用的重新分配",help:"个人可用部分与共同份额较容易落实",pressure:"共同使用挤占个人份额，费用或物品分担容易起分歧"},
    劫财:{topic:"可能涉及共同出资、追加份额或投入分配",help:"共同投入较能补缺，分配约定较容易落实",pressure:"追加投入与原份额不一致，分配争议较易反复"}
  } : {
    正印:{topic:`可能有${s.learning}、任务指导或技能应用`,help:`指导补到难点，${s.result}较容易做完或进入实际使用`,pressure:`${s.learning}不断增加，${s.work}容易被推迟或反复修改`},
    偏印:{topic:`可能换一种办法处理${s.work}，专项学习与旧进度并行`,help:`专项办法补缺口，卡住的${s.work}较易恢复进度`,pressure:`新旧方法来回转换，${s.work}较易中断或返工`},
    食神:{topic:`可能重复完成${s.result}，或接续原来的工作方式`,help:`熟悉本领较能发挥，${s.result}更容易持续完成或再次被采用`,pressure:`${s.result}反复修改，稳定完成容易受阻`},
    伤官:{topic:`可能有${s.result}试用、方案修改或表达方式变化`,help:`${s.result}较易进入试用，小范围采用或改进机会增加`,pressure:`${s.result}与接受要求有差距，试用容易推后或退回修改`},
    正财:{topic:`可能涉及${s.result}的确认、收尾或再次使用`,help:`${s.result}较容易获得确认，原交付或续用可能推进`,pressure:`${s.result}较易被要求补说明，确认和收尾容易拖延`},
    偏财:{topic:`${s.result}可能进入新用途、临时安排或另一项合作`,help:`${s.result}较易接到新用途，可能增加合作或采用机会`,pressure:`新安排挤占${s.work}，原进度容易被临时事项打断`},
    正官:{topic:`可能涉及${s.work}的职责调整、完成标准或正式确认`,help:`要求与做法较能接上，${s.work}更容易按约完成或获得认可`,pressure:`${s.work}要求提高，方法和帮助却没跟上，执行较易延误`},
    七杀:{topic:`${s.work}可能出现集中要求、难点或临时承担`,help:`处理难点较有办法，集中的${s.work}更容易分步推进`,pressure:`${s.work}要求集中，临时承担与原任务较易相互挤压`},
    比肩:{topic:"可能独立负责一项任务，或重新划分共同分工",help:`自己负责的${s.work}较有支撑，独立成果更容易做出来`,pressure:`独立做法与共同安排不同步，交接或执行容易卡住`},
    劫财:{topic:"可能增加共同参与，或调整团队分工",help:`共同协作较能补到${s.work}，合作事项更容易推进`,pressure:`参与者和意见增加，${s.work}容易卡在分工或决定上`}
  };
  const value=table[god]; if (!value) throw new Error("精简年度阅读：没有对应的原角色。");
  if(god==="正财"&&s.adult){
    const career:Partial<Record<ReadingContextWork,string>>={student:"课程作品较易获得反馈，原成果可能进入评阅或再次使用",employed:"已完成任务较易获得认可，原交付确认或后续安排可能推进",self_employed:"已交付服务较易获客户确认，续用或追加需求可能推进",seeking_work:"申请材料和作品较易得到回应，反馈或进一步沟通机会增加",caregiving:"已完成的照料安排较易得到回应，交接或持续分工更易落实",retired:"经验分享较易得到回应，自愿活动可能获得再次参与的机会"};
    const financial:Partial<Record<ReadingContextWork,string>>={student:"课程费用、材料归还或续用约定较容易落实",employed:"已做工作的报酬或费用较易确认，原约定有兑现机会",self_employed:"已交付服务的结算较易推进，续用可能带来新的费用约定",seeking_work:"求职进修的费用安排较易落实，若有退款或报销约定也较有利",caregiving:"照料费用与共同分担较易落实，用品续用更有着落",retired:"日常费用、借用归还或活动分担较容易落实"};
    return {...value,help:(money?financial:career)[s.role??"unspecified"]??(money?"若有约定报酬、还款或费用，较容易确认兑现":"技能成果较易获确认，原交付或下一次采用机会增加")};
  }
  return value;
}
function taskLine(action: OutlookStemAction, domain: "career" | "wealth", s: Setting, pattern: OutlookAxisFinding, task: NatalWealthResourceTask | null): Line {
  const base=roleLine(action.tenGod,domain,s), money=domain==="wealth", wealth=["正财","偏财"].includes(action.tenGod), resource=["正印","偏印"].includes(action.tenGod), output=["食神","伤官"].includes(action.tenGod);
  const selected=task?.preferredPathId===pattern.pathId ? task.task : null;
  if ((selected==="wealth_first"||pattern.pathId==="resource-wealth")&&wealth) return {topic:money?"可能同时维护多套材料工具，现有依据还不能判断能否省下投入":"可能精简资料或改换做法，重复部分与必要指导仍同时存在",help:money?"重复投入较容易收拢，旧工具继续使用或减少重复准备的机会增加":"重复准备较容易减少，已有积累更容易直接用于完成任务",pressure:money?"旧工具维护与新投入可能同时发生，原本想减少的支出难停下来":"准备难以缩减，实际使用容易被反复说明或旧安排拖慢"};
  if(selected==="resource_first") {
    if(wealth) return {topic:money?"新增用途与原有学习、工具投入并行，可能重新分配使用范围":"可能接到原约定的确认或新用途，同时仍离不开指导和练习",help:money?"实际用途较能兼顾必要的学习和工具投入，原有支持较易持续":"实际用途与必要指导较能配合，原任务较容易接着完成",pressure:money?"新增承担挤占必要学习和工具，原投入难兼顾":`${action.tenGod==="正财"?"原约定的确认":"新用途"}占去必要指导和练习，任务容易停在缺帮助的一步`};
    if(resource) return {topic:money?"必要学习或工具可能进入使用环节，实际投入效果还不明确":"可能得到新的说明或指导，具体任务能否恢复仍无充分结论",help:money?"必要投入较能补到缺口，学习与工具较容易继续使用":"必要指导较能补缺，原任务恢复或练习取得进展的机会增加",pressure:money?"仍需使用的学习、工具和帮助无法按原安排投入":"必要指导或帮助未能接续，已开始的事情易停下"};
    if(output) return {...base,pressure:money?"继续完成花去更多时间用品，原支持未同步":"要做出的内容增加，指导与时间没有跟上"};
  }
  if(selected==="official_joint"&&wealth) return {topic:money?"可能同时涉及原交付配套、学习工具与续用投入":"可能谈原约定的确认或新增安排，完成要求与执行方法同时变化",help:money?"实际投入较能服务约定，必要工具或指导较容易继续使用":"配套投入较能接到执行，已有任务更容易按要求完成",pressure:money?`${action.tenGod==="正财"?"确认与续用":"新增安排"}占去执行支持，已承诺的投入仍要承担`:`${action.tenGod==="正财"?"原约定确认与续用":"新安排"}占去必要指导，已有要求没有减少`};
  if(pattern.pathId==="official-wealth"&&output) return {...base,pressure:s.stage==="young_child"?(money?"换玩法又花去时间和用品，原活动容易反复调整":"自己想换玩法却碰到活动约定，轮流或步骤容易起分歧"):money?"做法与约定不合，调整又花去时间和用品":"自己的表达或做法与约定要求不同，容易出现标准争议或退回修改"};
  if(["official-resource","killings-resource"].includes(pattern.pathId)&&resource) return {...base,
    help:money?"必要的学习、工具和配套投入较能用到执行环节":"具体指导较能接上职责，执行更有办法",
    pressure:money?"必要学习、工具或帮助的投入不足，原约定的配套容易拖延":"必要指导没接上，已经答应的要求却没有减少"};
  if(pattern.pathId==="food-killings"&&wealth) return {...base,pressure:money?"新投入还带来额外承担，用品和协作费用可能增加":"原解法有可获支持的一面，但新增要求使处理次序更难安排"};
  const edges=pattern.taskLinks?.items.flatMap(link=>link.relations).filter(edge=>edge.contributesPressure&&edge.from.origin.kind==="target"&&edge.from.stem===action.stem)??[];
  if(edges.some(edge=>edge.to.group==="resource"))return {...base,pressure:money?"现有安排占去必要工具或指导，原投入容易被迫挪用":"必要方法或帮助被当前安排占用，原任务容易卡住"};
  if(edges.some(edge=>edge.to.group==="authority"))return {...base,pressure:money?"做法与约定不一致，调整又占用时间和用品":"表达或做法与原要求不一致，职责或验收标准容易起争议"};
  return base;
}
function phrase(action: OutlookStemAction,line:Line):string {
  return action.effect==="assists"?line.help:action.effect==="obstructs"?line.pressure:action.effect==="mixed"?`${line.help}，但${line.pressure}`:line.topic;
}
function practical(action:OutlookStemAction,hidden:OutlookStemAction,domain:"career"|"wealth",s:Setting,pattern:OutlookAxisFinding,task:NatalWealthResourceTask|null):string {
  let value=phrase(action,taskLine(action,domain,s,pattern,task));
  if(["neutral","unresolved"].includes(action.effect)&&["assists","obstructs","mixed"].includes(hidden.effect)) {
    const front=action.tenGod==="比肩"?(domain==="wealth"?"可能调整个人与共同份额":"可能独立负责或调整分工"):action.tenGod==="劫财"?(domain==="wealth"?"可能增加共同投入":"可能增加协作或重新分工"):"本年新事项本身尚未定向";
    value=`${front}，${phrase(hidden,taskLine(hidden,domain,s,pattern,task))}`;
  } else if(hidden.tenGod!==action.tenGod&&["obstructs","mixed"].includes(hidden.effect)&&!["obstructs","mixed"].includes(action.effect)) {
    value+=`，但${taskLine(hidden,domain,s,pattern,task).pressure}`;
  } else if(action.tenGod==="正财"&&hidden.tenGod==="偏财"&&hidden.effect==="assists") value+=domain==="career"?"，另有新用途或合作机会":"，新参与也可能带来分配机会";
  const background=pattern.taskLinks?.items.flatMap(link=>link.relations).filter(edge=>edge.contributesPressure&&edge.from.origin.kind!=="target")??[];
  if(!["obstructs","mixed"].includes(action.effect)){
    if(background.some(edge=>edge.to.group==="output")&&!/(打断|中断|反复)/u.test(value)) value+=domain==="career"?"，但指导或改法仍易打断进度":"，额外准备仍会占用投入";
    else if(background.some(edge=>edge.to.group==="authority"))value+=domain==="career"?"，但既有要求与做法变化仍易发生冲突":"，已有投入也可能卡在原要求与执行安排上";
    else if(background.some(edge=>edge.to.group==="resource"))value+=domain==="career"?"，但必要指导仍可能被原安排占用":"，必要工具或学习投入仍有原有占用";
    else if(background.some(edge=>edge.to.group==="wealth"))value+=domain==="career"?"，但共同安排仍可能打断采用或交付":"，既有分担仍可能占去新增投入";
  }
  // Unknown or young settings never inherit financial return language.
  if(!s.adult)value=value.replaceAll("成本","用品消耗").replaceAll("支出","用品需要").replaceAll("职责","活动约定").replaceAll("培训","示范").replaceAll("收入","使用回应").replaceAll("回报","使用回应").replaceAll("报酬","回应");
  return `${value}。`;
}
function verifiedContext(input:BuildBriefAnnualReadingInput):{work:ReadingContextWork;relationship:ReadingContextRelationship;readings:ContextualDomainReading[]} {
  if(!input.contextual){check(input.events.contextRef===null,"原事项已使用现实背景，简稿缺少同一背景记录。");return {work:"unspecified",relationship:"unspecified",readings:[]};}
  const bundle=input.contextual,{document,reference}=bundle.contextSource;
  check(same(bundle.sourceBinding,input.events.sourceBinding)&&same(document.sourceBinding,input.events.sourceBinding)&&same(reference,input.events.contextRef),"现实背景与本年来源或记录不一致。");
  check(bundle.version===CONTEXTUAL_READING_VERSION&&document.format===READING_CONTEXT_FORMAT,"现实背景版本不一致。");
  const draft=readingContextDraftSchema.parse(document.context),domains=buildAnnualDomainReading(input);
  const expected=buildContextualAnnualReadings({revision:input.revision,assessment:input.assessment,context:draft,reading:domains});
  const supplied=bundle.readings.filter(item=>item.scope.kind==="annual"&&item.scope.year===input.year.year);
  check(same(supplied,expected),"现实背景正文不是本年真实分段的适配。");
  return {work:draft.work,relationship:draft.relationship,readings:expected};
}
function relationship(timing:AnnualRelationshipTiming,stage:LocalReadingAgeStage,state:ReadingContextRelationship):{text:string;signals:AnnualRelationshipTimingSignal[]} {
  const signals=unique(timing.lenses.flatMap(lens=>lens.triggerSignalIds.map(id=>lens.signals.find(signal=>signal.id===id)!)).filter(Boolean));
  const activeLenses=timing.lenses.filter(lens=>lens.triggerSignalIds.length>0);
  const backgroundPalaceClash=activeLenses.some(lens=>lens.signals.some(signal=>signal.source==="dayun"&&signal.kind==="palace_contact"&&signal.relationType==="branch_six_clash"));
  const backgroundStarClashLenses=activeLenses.filter(lens=>lens.signals.some(signal=>signal.source==="dayun"&&signal.kind==="star_stem_contact"&&signal.relationType==="stem_clash"));
  const has=(relation:AnnualRelationshipTimingSignal["relationType"])=>signals.some(signal=>signal.relationType===relation);
  const palaceClash=signals.some(signal=>signal.kind==="palace_contact"&&signal.relationType==="branch_six_clash"),palaceCombine=signals.some(signal=>signal.kind==="palace_contact"&&signal.relationType==="branch_six_combination");
  const adult=stage==="adult",young=stage==="young_child";
  if(!adult){return {text:palaceClash?`${young?"游戏与陪伴":"同伴相处"}较易有安排变化，可能换活动时间、玩法或参与方式。`:palaceCombine?`${young?"一起游戏、轮流或共同完成小事":"共同活动、结伴参与或持续来往"}的情形更突出。`:"本年暂无明确的相处变化线索。",signals};}
  if(!signals.length)return {text:"本年暂无明确的新增感情变化线索。",signals};
  if(palaceClash&&palaceCombine)return {text:"关系既有靠近和推进的线索，也容易出现节奏变化。可能一边谈交往或共同生活的下一步，一边重新讨论联系频率、个人空间和原来的承诺。",signals};
  if(palaceClash)return {text:state==="single"?"相识后的交往节奏较易变化，可能改期约见、改变联系频率，或重新决定双方愿意靠近的程度。":state==="separated"?"未结事项或联系边界较易重议，可能调整交接方式、联络安排或各自生活的界限。":state==="married"?"共同生活安排较易变动，可能重议陪伴、家庭分工或原定计划，磨合与分歧更容易浮到台面。":state==="partnered"?"交往节奏与共同计划较易变化，可能调整见面安排、讨论承诺，或重新商量关系下一步。":"关系安排较易变动：单身可能改变联系或约见节奏；已有伴侣可能重议共同计划、陪伴安排或原来的承诺。",signals};
  if(palaceCombine){
    const backgroundClash=backgroundPalaceClash;
    const starClashLenses=backgroundStarClashLenses;
    const starClashScope=starClashLenses.length<timing.lenses.length?"其中一种关系视角还提示，既有期待或承诺容易出现分歧":"既有期待或承诺也容易出现分歧";
    const progress=state==="single"?"已有相识更容易增加约见或持续交往，也可能谈到下一步关系。":state==="partnered"?"关系有进一步落实的线索，可能谈到共同生活、长期计划或更明确的承诺。":state==="married"?"共同生活计划更容易成为具体议题，可能落实家庭安排、陪伴或长期打算。":state==="separated"?"旧联系或共同事项可能再次推进，表现为重新联络、协商交接或明确今后的关系边界。":"感情有推进线索：单身可能增加约见或持续交往；已有伴侣可能谈共同生活、长期计划或承诺落实。";
    return {text:backgroundClash?`${progress}同时，原有相处节奏仍易变动，推进过程伴随磨合或计划重议。`:starClashLenses.length?`${progress}${starClashScope}。`:progress,signals};
  }
  if(has("stem_clash"))return {text:"彼此的期待或承诺容易碰撞，可能为交往节奏、关系定位或共同安排出现分歧。",signals};
  const text=state==="single"?"可能出现新相识、持续联络或更明确的好感表达，交往有进一步发展的线索。":state==="partnered"?"关系意愿较容易摆到台面，可能讨论长期安排、共同生活或原有承诺的落实。":state==="married"?"原有承诺与共同生活容易成为具体议题，可能落实长期安排，也可能重新讨论陪伴和家庭分工。":state==="separated"?"旧联系或未结承诺可能再成为话题，表现为重新联络、协商交接或明确今后的关系界限。":"单身可能出现新相识、持续联系或明确好感；已有伴侣可能讨论共同生活、长期安排和承诺落实。";
  return {text:text+(backgroundPalaceClash?"同时，既有相处节奏仍易变动，关系推进中可能出现磨合或计划反复。":backgroundStarClashLenses.length?"同时，该视角下既有期待或承诺也容易出现分歧。":""),signals};
}
/** Concise prose from the same exact inputs, never a new event or direction engine.
 * Invalid/stale inputs throw; the caller keeps the old report and adoption guards. */
export function buildBriefAnnualReading(input:BuildBriefAnnualReadingInput):BriefAnnualReading {
  const {year,story,events}=input,context=verifiedContext(input),timingBuilder=createAnnualRelationshipTimingBuilder(input.revision,input.assessment);
  check(story.year===year.year&&events.year===year.year&&same(story.sourceBinding,events.sourceBinding)&&same(story.contextRef,events.contextRef)
    &&events.sourceBinding.revisionId===input.revision.id&&events.sourceBinding.chartResultHash===input.revision.manifest.resultHash
    &&same(story.yearNodeRef,year.transitNodeRef)&&same(events.yearNodeRef,year.transitNodeRef),"年度、原故事或命盘来源不一致。");
  const sourceVersions=unique([BRIEF_ANNUAL_READING_VERSION,ANNUAL_EVENT_TENDENCIES_VERSION,ANNUAL_READER_ANSWER_VERSION,PLAIN_OUTLOOK_READING_VERSION,ANNUAL_RELATIONSHIP_TIMING_VERSION,...story.sourceVersions]);
  const branches=story.branches.map(branch=>({id:branch.id,label:branch.label,conditions:[...branch.conditions],segments:branch.segments.flatMap(section=>{
    const answer=buildAnnualReaderAnswer({...input,branchId:branch.id,segmentId:section.id});
    if(!answer)return [];
    const original=year.judgmentSegments.find(segment=>segment.branchId===branch.id&&segment.id===section.id)!;
    check(same(section.age,buildLocalReadingAgeContext(input.revision.timeCalibration.utcInstant,section.startInstant,section.endExclusiveInstant)),"年龄语境与实际出生瞬时不一致。");
    const eventSegment=events.branches.find(value=>value.id===branch.id)!.segments.find(value=>value.id===section.id)!;
    const pattern=original.judgment.axes.find(axis=>axis.axis==="pattern")!,actions=pattern.stemActions!.items;
    const visible=actions.find(action=>action.visibility==="visible")!,hidden=actions.find(action=>action.visibility==="main_hidden")!;
    const timing=timingBuilder(year,original);
    for(const item of eventSegment.items.filter(item=>item.relationshipTiming))check(same(item.relationshipTiming,timing),"原关系事项与同段星宫依据不一致。");
    const own=annualLifeStorySubjectId(story,section),base=[`annual-${year.year}`,own];
    const phases=section.age.segments.length?section.age.segments:[{stage:section.age.stage,label:section.age.label}];
    const domains=(['career','wealth','relationship'] as const).map((domain):BriefAnnualDomain=>{
      const items=eventSegment.items.filter(item=>item.domain===domain),matches=context.readings.filter(item=>item.scope.kind==="annual"&&item.scope.branchId===branch.id&&item.scope.segmentId===section.id&&item.scope.domainId===domain);
      const hasContext=matches.length===1,appliedWork=hasContext?context.work:"unspecified",appliedRelationship=hasContext?context.relationship:"unspecified";
      const texts=phases.map(phase=>{const s=setting(phase.stage,appliedWork);return domain==="relationship"?relationship(timing,phase.stage,appliedRelationship).text:practical(visible,hidden,domain,s,pattern,answer.originals.natalTask??null);});
      const text=phases.length>1&&new Set(texts).size>1?texts.map((value,index)=>`${phases[index]!.label}：${value}`).join(" "):texts[0]!;
      const s=setting(section.age.stage,appliedWork);
      const verdict=domainVerdict(domain,pattern,visible,s,answer.originals.natalTask??null,timing,appliedRelationship,answer.originals.rescueTrace);
      return {domain,title:domain==="career"?s.title:domain==="wealth"?s.moneyTitle:section.age.stage==="adult"?"感情":"相处",
        verdict,text,sourceSubjects:unique([...base,`annual-domain-${year.year}-${section.id}-${domain}`,...items.map(item=>annualEventFeedbackSubjectId(year.year,eventSegment,item)),...matches.map(item=>item.subjectId)]),
        eventIds:items.map(item=>item.id),basisRefs:domain==="relationship"?[]:structuredClone(section.basisRefs),relationshipSignalIds:domain==="relationship"?unique(timing.lenses.flatMap(lens=>lens.triggerSignalIds)):[],relationshipBackgroundSignalIds:domain==="relationship"?unique(timing.lenses.flatMap(lens=>lens.backgroundSignalIds)):[]};
    });
    const contextApplies=(domain:AnnualReadingDomainId)=>context.readings.some(item=>item.scope.kind==="annual"&&item.scope.branchId===branch.id&&item.scope.segmentId===section.id&&item.scope.domainId===domain);
    const eventTendencies=buildAnnualEventTendencies({revision:input.revision,eventSegment,year,segment:original,age:section.age,timing,
      work:contextApplies("career")?context.work:"unspecified",relationship:contextApplies("relationship")?context.relationship:"unspecified",
      natalTask:answer.originals.natalTask??null,rescueTrace:answer.originals.rescueTrace,
      sources:{career:domains[0]!,wealth:domains[1]!,relationship:domains[2]!}});
    return [{id:section.id,branchId:branch.id,startInstant:section.startInstant,endExclusiveInstant:section.endExclusiveInstant,personalStartInstant:section.personalStartInstant,
      yearNodeRef:structuredClone(year.transitNodeRef!),backgroundRefs:structuredClone(section.backgroundRefs),backgroundLabels:[...section.backgroundLabels],age:structuredClone(section.age),
      headline:plainOutlookCaption(original.judgment),caption:plainOutlookCaption(original.judgment),domains,sourceSubjects:unique(domains.flatMap(domain=>domain.sourceSubjects)),sourceVersions:unique([...sourceVersions,...timing.sourceVersions]),
      eventTendencies,
      conditions:unique([...section.conditions,...timing.conditions,...timing.lenses.flatMap(lens=>lens.conditions),...eventSegment.items.flatMap(item=>[...item.conditions,...item.applicability,...item.notApplicableWhen])]),
      detailsRef:{year:year.year,branchId:branch.id,judgmentSegmentId:original.id,storySegmentId:section.id,eventSegmentId:eventSegment.id}}];
  })}));
  return {version:BRIEF_ANNUAL_READING_VERSION,sourceBinding:structuredClone(events.sourceBinding),sourceVersions:unique([...sourceVersions,...branches.flatMap(branch=>branch.segments.flatMap(segment=>segment.sourceVersions))]),year:year.year,status:events.status,contextRef:structuredClone(events.contextRef),branches,
    limitations:unique([...story.limitations,"简稿保留原年份、交运和顺逆分段；具体情形须与现实相符，不表示已发生、必然收入或关系结果。"])};
}
