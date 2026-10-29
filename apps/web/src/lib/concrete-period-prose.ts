import { evaluateConditionalContentRules, type ConditionalContentAssessment, type ConditionalContentRuleId, type ConditionalActionPolicy } from "./conditional-content-rules";
import type { NatalWealthResourceTask } from "../../../../packages/bazi-interpretation/src/natal-wealth-resource-task";
import type { BriefAnnualDomainVerdict } from "./brief-annual-reading";
import type { LocalReadingAgeContext } from "./local-reading-age-context";
import type { ReadingContextWork } from "./local-reading-context";
import type { LocalOutlookJudgment, OutlookAxisFinding, OutlookStemAction, OutlookEffect } from "./local-outlook-judgment";
import type { AnnualEventTendency } from "./annual-event-tendencies";
import type { KeyMonthEventTendency, KeyMonthEventEvidence } from "./key-month-event-tendencies";
import type { AnnualRelationshipTiming } from "./annual-relationship-timing";
import type { OutlookRescueTraceBundle } from "./outlook-rescue-trace";

export const CONCRETE_PERIOD_PROSE_VERSION = "hakimi.concrete-period-prose/0.4.2" as const;
export interface ConcreteLifeSentence {
  text:string; kind:"opportunity"|"caution"|"topic";
  ruleIds?:ConditionalContentRuleId[]; ruleDecisionIds?:string[];
  sources:{kind:"event"|"action"|"task_relation"|"relationship_signal"|"rescue"|"scope";id:string;detail?:string}[];
}
export interface ConcretePeriodFact {
  kind: "opportunity" | "caution" | "topic";
  domain: "career" | "wealth";
  text: string;
  /** References the already calculated axis, never a newly inferred score. */
  axisId: string; actionIndex: number | null; relationId: string | null;
  actor: string; visibility: string; mechanism: string;
  /** Financial consequence when the work scene for this same action is shown. */
  companionText?: string;
  eventId?:string; evidenceIds?:string[];
  shortText?:string;
  ruleIds?:ConditionalContentRuleId[]; ruleDecisionIds?:string[];
}
export interface ConcretePeriodProse {
  headline: string; text: string; facts: ConcretePeriodFact[]; signature: string;
  sentences?:ConcreteLifeSentence[];
  contentRules?:ConditionalContentAssessment;
}
export interface ConcretePeriodInput {
  judgment: LocalOutlookJudgment; domain: "career" | "wealth" | "relationship";
  age: LocalReadingAgeContext; work?: ReadingContextWork;
  task?: NatalWealthResourceTask | null; verdict?: BriefAnnualDomainVerdict;
  lifeSignals?:{events:readonly (AnnualEventTendency|KeyMonthEventTendency)[];monthlyEvidence?:readonly KeyMonthEventEvidence[];
    relationshipTiming?:AnnualRelationshipTiming;rescueTrace?:OutlookRescueTraceBundle;horizon:"year"|"month"};
}
type Scene = { work: string; result: string; guidance: string; purchases: string; resourceReuseSaving?: string; standard: string; shared: string; money: boolean };
function scene(age: LocalReadingAgeContext, role: ReadingContextWork = "unspecified"): Scene {
  if (age.stage === "young_child") return {work:"游戏和小活动",result:"拼搭或手工作品",guidance:"家人的示范",purchases:"玩具和活动用品",standard:"轮流、收拾和活动规则",shared:"玩具使用和活动分工",money:false};
  if (age.stage === "youth") return {work:"作业和小组活动",result:"作业或展示作品",guidance:"老师的讲解和练习",purchases:"文具、材料和活动用品",standard:"作业要求和活动规则",shared:"小组分工和材料使用",money:false};
  if (age.stage !== "adult" || age.segments.some(part => part.stage !== "adult")) return {work:"手头事情",result:"已经完成的任务",guidance:"说明和示范",purchases:"日常用品",standard:"事先约好的要求",shared:"时间安排和用品分配",money:false};
  if (role === "retired") return {work:"兴趣活动和日常安排",result:"经验分享或兴趣作品",guidance:"兴趣课程和他人指导",purchases:"日常用品和兴趣器材",resourceReuseSaving:"能少一次用品或器材的重复添置",standard:"活动规则和预约安排",shared:"活动费用和家务分工",money:false};
  if (role === "caregiving") return {work:"照料家人和家务",result:"照料计划和已经做完的家务",guidance:"照料方法和家人帮助",purchases:"照料用品和替班服务",resourceReuseSaving:"能少重复购买用品或追加替班服务",standard:"照料时间和家人的约定",shared:"家务轮班和照料费用",money:false};
  if (role === "student") return {work:"课程、考试准备和实践",result:"课程作业或实践作品",guidance:"课程讲解和导师指导",purchases:"教材、课程和实践材料",standard:"课程要求和提交期限",shared:"小组分工和材料费用",money:false};
  if (role === "seeking_work") return {work:"投递简历和面试准备",result:"简历、作品集或面试作业",guidance:"岗位学习和面试辅导",purchases:"培训、交通和求职工具",standard:"招聘要求和面试时间",shared:"求职帮助和培训费用",money:false};
  if (role === "self_employed") return {work:"接单和客户服务",result:"已交付的产品或服务",guidance:"专业培训和业务指导",purchases:"经营工具、设备和课程",standard:"合同要求和交货日期",shared:"合作分工、成本和利润",money:true};
  return {work:role === "employed"?"工作任务":"工作或个人项目",result:"已经做好的方案或产品",guidance:"培训、资料和他人指导",purchases:"课程、软件和设备",standard:"审核标准和完成期限",shared:"合作分工、费用和报酬",money:true};
}
type Words = { help: string; pressure: string; topic: string; mechanism: string };
function ongoingPressure(actor:OutlookStemAction|undefined,domain:"career"|"wealth",s:Scene,group:string,operation:"control"|"combine"):string|null {
  if(!["output","resource","authority"].includes(group))return null;
  if(group === "output"){
    const scenes:Record<string,[string,string]>={
      食神:[`手头的熟悉任务仍需补改，接着做下一项时容易撞上完成期限`,`已经用过的材料或作品还要补改，维护费和下一批用品可能一起增加`],
      伤官:[`方案或作品试用中又被要求按原要求修改，演示和改版容易多做几轮`,`样品或方案改了又改，每一轮试用都可能再花材料和工具的钱`],
      正财:[`${s.result}确认交付后仍可能要补材料或修改，检查和收尾容易后推`,s.money?`交付后仍需补材料或修改，验收与结算可能后推`:`完成后还要补材料，用品归还或费用核对可能后推`],
      偏财:[`${s.money?"新合作来询问":"新活动或任务来了"}，旧任务尚未收尾，追加修改占掉承接时间`,`${s.money?"新合作要先安排费用":"新活动要先准备用品"}，旧任务还在补改，两边的费用容易一起增加`],
      正官:[`${s.standard}与完成材料反复确认，容易等审核、等指导或重做`,`为原约定反复补材料或改做法，办事费用和用品消耗可能增加`],
      七杀:[`临时急任务和原任务返工碰到一起，更容易赶工或错过原定时间`,`急用的用品和原任务返工一起出现，临时补买和加急花费容易增加`],
      正印:[`补资料或学习之余，原任务还在修改，准备和实际完成容易两头拖`,`新的${s.purchases}还要安排，原任务补改又需要时间和用品`],
      偏印:[`试新办法时，旧步骤又要保留或重做，容易来回切换`,`新工具已开始使用，旧办法还没停，可能同时付两套维护或材料费用`],
      比肩:[`各自负责的部分还在修改，交接时容易互相等，下一步迟迟接不上`,`各自负责的任务都要补改，共用用品与费用由谁承担可能再谈一次`],
      劫财:[`协作的人或分工在变，原任务又要返工，容易重新分配谁来补做`,`原任务补改与新的共同安排同时出现，准备用品和分担费用容易反复商量`],
    };
    const selected=scenes[actor?.tenGod??""];
    if(selected)return selected[domain === "career"?0:1]+(operation === "combine"?"，另一项已有安排也会占用同一份时间":"");
  }
  const cause=group === "resource"?`必要的${s.guidance}还未补齐`:group === "authority"?`做法与${s.standard}仍不一致`
    :operation === "combine"?`原有安排仍占用完成任务的时间`:`原来的指导或改法仍会带来修改`;
  const money=domain === "wealth";
  const phase:Record<string,[string,string]>={
    正财:[`事情到了检查、交付或收尾环节`,s.money?`核对款项或费用时`:`核对费用和归还用品时`],
    偏财:[s.money?`出现新合作或临时项目时`:`准备参加新活动或接新任务时`,s.money?`商量新合作费用时`:`安排新活动的用品和费用时`],
    正官:[`确认职责、审核要求或期限时`,`为约好的任务准备费用和用品时`],
    七杀:[`几项急事集中、需要赶期限时`,`急用的用品或费用集中出现时`],
    食神:[`接着完成熟悉任务、展示已有成果时`,`安排旧物维护或下一次使用时`],
    伤官:[`展示方案、试用改法时`,`为试做或改版安排材料时`],
    正印:[`补学方法或准备材料时`,`安排${s.purchases}时`],
    偏印:[`试新工具或换办法时`,`打算换工具、补课程时`],
    比肩:[`商量独立负责范围和交接时`,`核对各自承担多少费用和用品时`],
    劫财:[`增加协作人员、重新分工时`,`重谈出钱、出力和分配时`],
  };
  const current=phase[actor?.tenGod??""]??[`推进${s.work}时`,`安排${s.purchases}时`];
  return money?`${current[1]}，${cause}，可能再花一次材料、工具或帮助的费用`
    :`${current[0]}，${cause}，新旧任务容易挤在一起、推迟完成`;
}
function words(action: OutlookStemAction, domain: "career" | "wealth", s: Scene, axis: OutlookAxisFinding, task?: NatalWealthResourceTask | null, policy?:ConditionalActionPolicy): Words {
  const money = domain === "wealth", financial = ["正财", "偏财"].includes(action.tenGod), resource = ["正印", "偏印"].includes(action.tenGod), output = ["食神", "伤官"].includes(action.tenGod);
  const role = task?.preferredPathId === axis.pathId ? task.task : null;
  const table: Record<string, Omit<Words, "mechanism">> = money ? {
    正印:{help:`买过的${s.purchases}更容易真正用起来，${s.resourceReuseSaving??"能少买一份或少上一轮课"}`,pressure:`购买${s.purchases}的钱可能先花出去，任务却还没做完，容易继续加钱或添置`,topic:`${s.purchases}的购买、报销或使用安排会成为具体事项`},
    偏印:{help:`现有工具有机会替代一项新购买，专项学习较能解决眼前的问题`,pressure:`换工具或换方法后又要买配件、补课程，旧东西也未必能停用`,topic:`可能试用新工具或课程，先核对是否与已有的重复`},
    食神:{help:s.money?`现有技能、产品或服务有继续被采用的机会；已有付费约定时，可接着做下一批或续单`:`现有作品和用品有继续使用的机会，少一次重做或重新购买`,pressure:`同一件事反复做，维护和补材料的费用增加；原有安排也可能中断`,topic:`旧物维护、下一批材料或继续使用的费用需要安排`},
    伤官:{help:`试做、演示或改版较可能被采用，已经买的材料和工具较能发挥作用`,pressure:`样品、试用或改版反复追加费用，原预算容易不够`,topic:`先花一笔钱做样品、试用或改版，是否采用还需确认`},
    正财:{help:s.money?`有已约定工资、货款、报销或还款时，较有机会确认金额、完成结算`:`已约好的费用分摊、报销或物品归还较容易落实`,pressure:s.money?`已有款项可能要补单据、重新确认金额或推迟到账`:`费用分摊或物品归还可能拖延，自己需要先垫一部分`,topic:s.money?`重点是已约定的钱何时结算，不把未谈成的机会当成收入`:`重点是费用核对、分摊和借用物品归还`},
    偏财:{help:s.money?`可能接触新客户、额外订单或短期合作，谈妥报酬后才算新增收入机会`:`新活动较容易获得用品或费用上的帮助`,pressure:s.money?`临时合作可能要求先垫钱、加预算，回款却还没定下来`:`临时活动或新用途增加花费，原定用品和时间可能不够`,topic:s.money?`可能谈一笔额外订单或合作费用，需要先确定谁出钱、钱怎么分`:`新活动的费用和用品需要重新安排`},
    正官:{help:`按约定准备的${s.purchases}较能派上用场，费用更容易对应实际需要`,pressure:`为了满足${s.standard}而追加费用，原先答应的部分还得承担`,topic:`履行已有约定需要的费用和用品要逐项确认`},
    七杀:{help:`赶进度需要的临时用品或帮助较容易补到，能先处理最急的一项`,pressure:`几项急事同时要钱或用品，临时添置和加急费用容易增加`,topic:`可能集中处理几项急用的费用，先后次序需要重排`},
    比肩:{help:`${s.shared}较容易说清楚，各自承担的部分有机会落实`,pressure:s.money?`一起用的钱或用品挤占个人份额，容易争论谁多出、谁少出`:`共同使用的用品或时间不够，谁先用、谁负责收拾容易起分歧`,topic:`${s.shared}需要重新商量，各自承担多少要写清楚`},
    劫财:{help:s.money?`他人较能分担费用或提供用品，约定好的分账有机会落实`:`他人较能分担准备或提供用品，轮流使用和共同分工较容易落实`,pressure:s.money?`合作中可能追加出资或临时垫付，最后分到的部分却未说清楚`:`参加的人变多，用品和活动时间需要重新分配，谁负责准备也容易反复`,topic:s.money?`可能有人加入共同事项，需要重谈出钱、出力与分配方式`:`可能有人加入活动，需要重谈谁准备用品、怎样轮流使用`},
  } : {
    正印:{help:`${s.guidance}较能解决难点，卡住的${s.work}有机会继续做完`,pressure:`被要求补资料、再学习或等指导，${s.work}容易一拖再拖`,topic:`可能补学一项方法、准备材料，或得到新的指导`},
    偏印:{help:`换一种工具或方法，有机会解决原先卡住的任务`,pressure:`新旧工具或办法来回换，已经做过的部分容易返工`,topic:`可能试用新的工具或方法，先从一项具体任务检验`},
    食神:{help:`熟悉的本领较能发挥，${s.result}有机会做完、展示或接着被采用`,pressure:`${s.result}反复修改或被打断，按原节奏完成会更费力`,topic:`重点是接着完成熟悉的任务，把已经会的本领用出来`},
    伤官:{help:`提出的新方案、演示或改法较有机会被试用，能靠解决具体问题被看到`,pressure:`自己的做法与${s.standard}不合，方案可能退回修改或暂缓采用`,topic:`可能展示方案、提出改法或尝试不同做法`},
    正财:{help:`${s.result}较有机会通过检查、确认交付，再谈下一步安排`,pressure:`完成后还可能被要求补说明或补细节，验收与收尾容易拖延`,topic:`重点是核对完成内容、确认交付和下一步由谁负责`},
    偏财:{help:s.money?`可能遇到新的合作需求、临时项目或客户询问，现有本领有另一处用武之地`:`可能参加新的活动或接到另一项任务，已有作品有机会再次使用`,pressure:`临时安排不断插进来，原任务的时间被挤走，容易两头都没做完`,topic:`可能出现新任务或另一项合作，需要先确认能否接得住`},
    正官:{help:`职责和${s.standard}较容易说清楚，已经做好的部分有机会得到正式确认`,pressure:`审核、责任或期限要求变多，已答应的任务不能随意推后`,topic:`可能面对一次审核、分工确认或完成期限的调整`},
    七杀:{help:`紧急或难办的任务较有办法拆开处理，有机会解决一件拖着的难题`,pressure:`几项任务或要求一起压过来，容易赶期限、临时救急`,topic:`可能遇到集中任务或更紧的期限，需要先处理最急的一件`},
    比肩:{help:`自己负责的部分与他人的分工较容易接上，合作推进会省力一些`,pressure:`同一件事各有主张，容易争论谁决定、谁负责，交接被拖慢`,topic:`可能独立负责一部分任务，同时重谈合作分工`},
    劫财:{help:`有人加入协作或接走一部分任务，原先忙不过来的环节较能补上`,pressure:`参与的人变多，意见和责任却未统一，可能抢着决定又互相等`,topic:`可能增加协作人员，任务由谁完成需要重新说明`},
  };
  let value: Words = { ...(table[action.tenGod] ?? {help:"已开始的事情有继续推进的条件",pressure:"已开始的事情仍有受阻环节",topic:"现有事项的下一步需要确认"}), mechanism:`role:${action.tenGod}` };
  // A wealth actor may reduce excessive preparation or remove essential help.
  // Its name alone must never turn either operation into a claim of income.
  if (policy ? policy.mechanism === "trim_redundant_preparation" : financial && (role === "wealth_first" || axis.pathId === "resource-wealth")) value = {mechanism:"trim_redundant_preparation",
    help:money?`有机会停掉重复课程、少买一套工具，把已买的东西真正用起来`:`有机会少补一轮资料或培训，直接把已经会的部分做出来`,
    pressure:money?`想省下的课程、工具或维护费还停不下来，又可能增加新开销`:`一边要求实际完成，一边仍要补材料或等指导，进度容易卡住`,
    topic:money?`重点是能否省下重复购买和准备的费用，不能据此认定会进账`:`重点是缩短准备时间，进入实际完成任务的阶段`};
  else if (policy ? policy.mechanism === "protect_needed_support" : financial && (role === "resource_first" || role === "official_joint")) value = {mechanism:"protect_needed_support",
    help:money?`实际任务的费用与必要课程、工具较能兼顾，不必拆东补西`:`任务安排较能兼顾必要指导，已经开始的事情有条件接着做`,
    pressure:money?`新任务或约定挪用了原本留给学习、工具和帮助的费用`:`答应的新任务占走学习、指导或练习时间，原任务容易停在不会做的一步`,
    topic:money?`要同时安排任务费用与必要学习、工具的钱`:`已有要求与必要指导需要同时落实`};
  else if (policy ? policy.mechanism === "needed_support" : resource && (role === "resource_first" || ["official-resource", "killings-resource"].includes(axis.pathId))) value = {mechanism:"needed_support",
    help:money?`必要课程、工具或帮助较能到位，已经花的钱较容易用到眼前任务上`:`得到的讲解、示范或协助较能解决具体难点，任务有机会恢复进度`,
    pressure:money?`真正需要的课程、工具或帮助未能到位，已有费用难换来实际进展`:`必要指导没接上，已有任务和期限却没有减少`,
    topic:money?`重点是必须用到的课程、工具或帮助能否落实`:`重点是把必要指导接到实际任务上`};
  else if (policy ? ["fund_execution_support","food_killing_cost"].includes(policy.mechanism) : financial && ["official-resource","killings-resource","food-killings"].includes(axis.pathId)) value = {mechanism:"fund_execution_support",
    help:money?`已有费用、工具或他人帮助较能用到急需解决的任务上`:`现有工具或协作较能帮助解决眼前难题，任务有继续推进的条件`,
    pressure:money?`完成任务所需的工具和帮助可能被别的安排占用，又要临时补费用`:`新的安排挤占原来解决问题需要的帮助，任务容易更难协调`,
    topic:money?`重点是完成任务所需的费用和帮助，不据此推断新增收入`:`重点是工具、帮助与实际任务能否接得上`};
  if (policy ? policy.mechanism === "authority_conflict" : output && axis.pathId === "official-wealth") value.pressure = money?`方案不符合原约定，重新做样品或修改又多花一次钱和材料`:`自己的改法碰到既定规则，容易因标准不一致被退回修改`;
  const pressureEdges = axis.taskLinks?.items.flatMap(link => link.relations).filter(edge => edge.contributesPressure && edge.from.origin.kind === "target" && edge.from.stem === action.stem && edge.from.visibility === action.visibility) ?? [];
  if (pressureEdges.some(edge => edge.to.group === "resource")) {value.mechanism += ":support_displaced";value.pressure = money?`当前任务挪用了必要课程、工具或协助的费用，原本需要的帮助难以落实`:`新安排占走必要指导或练习时间，任务容易卡在缺少帮助的一步`;}
  if (pressureEdges.some(edge => edge.to.group === "authority")) {value.mechanism += ":standard_conflict";value.pressure = money?`做法与约定不一致，退回重做会再花时间和材料`:`做法与审核要求或约定不同，容易被要求重做、重新确认责任`;}
  if (financial && axis.pathId === "food-killings") {value.mechanism += ":added_demand";value.pressure = money?`新安排同时带来加急、协作或补工具的费用，原预算可能不够`:`接到的安排又增加期限和要求，原任务与新任务容易争时间`;}
  return value;
}
function relation(input: ConcretePeriodInput, s: Scene): ConcretePeriodProse {
  const v = input.verdict, adult = input.age.stage === "adult" && input.age.segments.every(part => part.stage === "adult");
  const state = v?.relationshipState ?? "unspecified", change = v?.relationshipChange ?? "insufficient";
  const pattern = input.judgment.axes.find(axis => axis.axis === "pattern"), actor = pattern?.stemActions?.items.find(item => item.visibility === "visible");
  const topics: Record<string,string> = {正印:"学习、工作忙碌时，能否得到理解和实际帮助",偏印:"双方做事方式不同，是否愿意解释并给彼此空间",食神:"一起吃饭、休闲或完成小事，能否形成稳定的见面和陪伴",伤官:"表达意见、争论做法时，能否把不满说具体",正财:"日常开支、赴约时间和已经答应的事能否兑现",偏财:"新活动或社交安排增加时，如何协调时间与费用",正官:"相处规则、家庭责任和已经说好的安排",七杀:"忙碌或临时任务出现时，怎样重新安排见面与照顾",比肩:"各自的时间、主见与共同决定如何协调",劫财:"朋友、家人参与共同事情时，分工和边界如何说清楚"};
  const old = state === "separated";
  const oldTopics:Record<string,string>={正印:"交接说明和必要材料如何准备",偏印:"处理旧事项的方法不同，如何减少来回修改",食神:"后续联系频率和遗留事项如何收尾",伤官:"表达分歧时，如何把需要处理的事说具体",正财:"费用核对、物品归还和已答应的交接",偏财:"新增事项的费用和责任由谁承担",正官:"旧关系中的责任分担和交接时间",七杀:"临时事务出现时如何调整交接次序",比肩:"各自空间与共同事项的界线",劫财:"其他人参与交接时，责任和边界如何说清楚"};
  const daily = adult ? (old?oldTopics:topics)[actor?.tenGod ?? ""] ?? "联系与日常分工" : `家人和同伴如何配合${s.work}，以及时间、用品和活动规则怎么商量`;
  const headline = !adult ? change === "adjustment" ? "相处安排容易调整" : change === "friction" ? "家人、同伴间需要磨合" : "主要看家人、同伴的相处"
    : change === "insufficient" ? old ? "旧关系主要处理日常交接" : "感情先看日常相处，暂无明确转折"
      : change === "adjustment" ? old ? "旧关系的交接安排容易变化" : "关系和共同安排容易调整"
        : change === "friction" ? old?"旧关系的交接容易有分歧":"有接触或推进，也容易起分歧" : old ? "旧关系事项有推进线索" : "感情和共同安排有推进线索";
  const condition = old ? "仍有旧关系事项时，先处理约好的交接。" : "";
  const action = !adult ? `具体看${daily}；${change === "adjustment" ? "共同活动或相处时间可能需要调整" : change === "friction" ? "不同意见需要有人帮助协调" : "不把成年人的感情事件套在这里"}。`
    : change === "insufficient" ? `主要是日常相处：${daily}。`
    : change === "adjustment" ? old?"可能重新商量交接时间、财物或原有责任，原安排也可能改期。":`可能重新商量见面、居住或责任分工，原安排也可能改期；不能仅据此断定分开。`
      : change === "friction" ? `${old?"旧事项的交接":"联系或共同事情"}有往前走的线索，但容易在${daily}上出现分歧。`
        : `${old?"旧事项的交接":"联系、见面或共同安排"}有推进线索，具体看${daily}。`;
  return {headline,text:condition+action,facts:[],signature:`relationship:${change}:${state}:${actor?.tenGod??"unknown"}:${input.age.stage}`};
}

function concreteHeadline(actor:OutlookStemAction|undefined,domain:"career"|"wealth",s:Scene,axis:OutlookAxisFinding,task?:NatalWealthResourceTask|null,policy?:ConditionalActionPolicy):string {
  if(!actor)return "这一时段缺少完整判断";
  const detail=words(actor,domain,s,axis,task,policy),help=["assists","mixed"].includes(actor.effect),pressure=["obstructs","mixed"].includes(actor.effect);
  if(detail.mechanism.startsWith("trim_redundant_preparation"))return domain === "career"?"重点是少做重复准备，让事情做完":"重点是收拢重复购买和准备的费用";
  if(detail.mechanism.startsWith("needed_support")||detail.mechanism.startsWith("protect_needed_support")||detail.mechanism.startsWith("fund_execution_support"))return domain === "career"?"必要指导和协助能否跟上任务是关键":"必要工具、课程和协助的钱要留出来";
  const career:Record<string,string>={正印:pressure?"补资料或培训容易拖慢任务":"指导和学习能否用于实际任务是重点",偏印:pressure?"换工具、换办法容易返工":"新工具、新办法值得小范围试用",食神:help?"熟悉的任务和作品更容易做成":"原有任务能否持续做完是重点",伤官:help?"方案或改法有被试用的机会":pressure?"方案容易遇到标准或修改上的分歧":"方案表达与改法试用是重点",正财:"交付、验收和收尾是重点",偏财:s.money?"新合作和临时项目是重点":"新活动和临时任务是重点",正官:"职责、审核和完成期限是重点",七杀:"急任务、集中要求与赶工是重点",比肩:"独立负责与合作交接需要说清楚",劫财:"协作参与和任务分工可能调整"};
  const wealth:Record<string,string>={正印:`${s.purchases}的花费要看实际用途`,偏印:pressure?"换工具或补课程，容易产生两套费用":"专项工具与课程的用途是重点",食神:s.money?"已有服务的延续和维护费用是重点":"旧用品的沿用和维护是重点",伤官:"试做、改版和追加材料的花费是重点",正财:s.money?(help?"原约定款项有确认、结算机会":pressure?"已有款项容易卡在确认和到账":"已有约定的钱要核对清楚"):"费用分摊和用品归还是重点",偏财:s.money?(help?"额外合作有机会，先谈清报酬":pressure?"临时垫付与追加预算要留意":"新合作的费用与分配是重点"):"新活动的费用和用品要先安排",正官:"履行约定所需的费用不能漏算",七杀:"几项急用费用可能集中出现",比肩:"各自出多少、分多少需要说清楚",劫财:"追加出资和费用分担需要说清楚"};
  if(domain === "wealth"&&!s.money&&["比肩","劫财"].includes(actor.tenGod))return "用品使用、活动时间和共同分担要说清楚";
  return (domain === "career"?career:wealth)[actor.tenGod]??"现有事项需要确认具体安排";
}

/** A comprehensive axis may differ from the work/money pattern axis. Preserve
 * its effect in the model but do not promise a visible opportunity we cannot
 * map from that axis into these two domains. */
export function concretePeriodCaption(effect:OutlookEffect|null,facts:readonly ConcretePeriodFact[],labels:{career:string;wealth:string}={career:"事业",wealth:"财运"}):string {
  const help=facts.some(fact=>fact.kind === "opportunity"),pressure=facts.some(fact=>fact.kind === "caution");
  const names=(kind:ConcretePeriodFact["kind"])=>[...new Set(facts.filter(fact=>fact.kind===kind).map(fact=>labels[fact.domain]))].join("、");
  if(effect === "mixed"&&!help)return pressure?`已见${names("caution")}阻力，综合取舍仍有条件`:"综合取舍仍有条件，尚未形成具体机会";
  if(effect === "assists"&&!help)return pressure?`${names("caution")}仍需留意，综合另有支持条件`:"综合有支持条件，各领域尚未形成具体机会";
  if(effect === "mixed"&&help)return `${names("opportunity")}有局部机会，${pressure?`${names("caution")}仍有阻力`:"综合仍有牵制"}`;
  return effect?({assists:"这段月份相对较顺",mixed:"有推进机会，也容易反复",obstructs:"这段月份较费力",neutral:"有具体事项，综合顺逆未定",unresolved:"有具体事项，综合条件未定"} as const)[effect]:"本月没有完整方向判断";
}

export function concreteDirectionExplanation(judgment:LocalOutlookJudgment,facts:readonly ConcretePeriodFact[]):string {
  const primary=judgment.axes.find(axis=>axis.axis===judgment.primaryAxis),help=facts.some(fact=>fact.kind === "opportunity"),pressure=facts.some(fact=>fact.kind === "caution");
  if(primary&&["mixed","obstructs"].includes(primary.effect)&&!pressure){
    const edge=judgment.axes.flatMap(axis=>axis.taskLinks?.items.flatMap(link=>link.relations)??[]).find(edge=>edge.contributesPressure);
    if(edge)return `综合牵制仍在：${edge.from.stem}${edge.from.tenGod}与${edge.to.stem}${edge.to.tenGod}${edge.operation === "combine"?"有合的联系":"有克的作用"}，这部分限制尚未消失。`;
    if(primary.blockers[0])return `综合还保留这一阻力：${primary.blockers[0]}`;
    if(primary.effect === "obstructs")return `综合阻力来自${primary.axis === "seasonal"?"原局用字的调候配合":primary.axis === "balance"?"承接能力与可用支持":"格局配合"}：${primary.summary}`;
  }
  if(primary&&["mixed","assists"].includes(primary.effect)&&!help){
    const actor=primary.stemActions?.items.find(item=>["assists","mixed"].includes(item.effect));
    if(actor)return `综合支持来自${actor.stem}${actor.tenGod}的实际作用，尚不能直接把它扩大成职务提升或收入增加。`;
    if(primary.effect === "mixed")return `综合判断还保留以下配合与限制：${primary.summary}`;
    return `综合支持来自${primary.axis === "seasonal"?"原局用字的调候配合":primary.axis === "balance"?"承接能力与可用支持":"格局配合"}：${primary.summary}`;
  }
  return "";
}

export function concreteFinancialYearMonthContrast(input: Omit<ConcretePeriodInput,"domain"> & {annual:LocalOutlookJudgment}):string {
  const pattern=input.judgment.axes.find(axis=>axis.axis === "pattern"),yearPattern=input.annual.axes.find(axis=>axis.axis === "pattern");
  const yearly=yearPattern?.stemActions?.items.find(action=>action.visibility === "visible"),monthly=pattern?.stemActions?.items.find(action=>action.visibility === "visible");
  const financial=(action:OutlookStemAction|undefined)=>action&&["正财","偏财"].includes(action.tenGod)&&["assists","mixed"].includes(action.effect);
  const special=["official-resource","killings-resource","food-killings","resource-wealth"].includes(pattern?.pathId??"")
    ||(input.task?.preferredPathId===pattern?.pathId&&["resource_first","wealth_first","official_joint"].includes(input.task?.task??""));
  if(!scene(input.age,input.work).money||special||!financial(yearly)||!financial(monthly)||yearly!.tenGod===monthly!.tenGod)return "";
  return monthly!.tenGod === "正财"?"全年侧重新合作或额外任务的机会；本月更偏已有款项的确认和结算，须先有约定，不能把新合作的线索当作已经到账。"
    :"全年侧重原约定款项的兑现；本月另外留意新合作或额外任务，原有结算与新增收入要分开看。";
}

type LifeEvent=AnnualEventTendency|KeyMonthEventTendency;
const lifeRank={clear:3,possible:2,weak:1,none:0,not_applicable:-1} as const;
/** A financial actor in these paths describes support allocation, not cash.
 * Undecided and neutral actions must remain topics; mixed is not proof that
 * its conditional support has already taken effect. */
function supportAllocationProse(action:OutlookStemAction,domain:"career"|"wealth"):{headline:string;text:string;kind:ConcreteLifeSentence["kind"]}{
  const career=domain === "career";
  const byEffect:Record<OutlookEffect,{headline:string;text:string;kind:ConcreteLifeSentence["kind"]}>={
    assists:{headline:career?"任务与必要支持有协调空间":"资金与执行支持的配合有改善条件",text:career?"这项财的作用有助于调节负担、保留必要支持，让已有任务更有条件完成；不能据此直接说业务扩张或收入增加。":"这项财的作用有助于协调资金与必要支持的安排；这是执行条件的改善，不直接等于新增收入。",kind:"opportunity"},
    obstructs:{headline:career?"发展关键在任务与必要支持能否衔接":"必要支持与新增承担有冲突，财务安排受限",text:career?"新增承担与必要支持之间有冲突，事业发展更容易受制于能否保住执行条件，而不是单纯机会多少。":"资金与必要支持的安排受到牵制，须先确认哪些承担占用了执行条件；这项作用本身不等于已经发生额外支出。",kind:"caution"},
    mixed:{headline:career?"任务与必要支持的配合仍有取舍":"资金与执行支持的配合仍有取舍",text:career?"这项财涉及调节负担与保留必要支持，当前配合与限制并存；任务能否更顺利完成，仍取决于所列条件。":"资金与必要支持的安排同时有配合与限制，改善能否落实仍有条件；不能直接换成增收或额外支出的判断。",kind:"topic"},
    neutral:{headline:career?"任务与必要支持的衔接是当前议题":"资金与必要支持的安排是当前议题",text:career?"这项财落在任务与必要支持的衔接上，本身未给出新增发展机会或受阻方向。":"这项财落在资金与必要支持的安排上，本身未形成新增进账、额外支出或安排改善的判断。",kind:"topic"},
    unresolved:{headline:career?"任务与必要支持能否衔接尚待条件":"资金与执行支持能否改善尚未判清",text:career?"这项财能否调节负担、接上必要支持尚未判清，不能据此定为发展机会或受阻。":"资金与必要支持是否能够衔接尚未判清，未据此判断安排已经改善、收入增加或额外支出。",kind:"topic"},
  };
  const result=byEffect[action.effect];
  return action.visibility === "main_hidden"?{...result,text:`支内辅助条件：${result.text}`} : result;
}
function differentiatedLifeProse(input:ConcretePeriodInput,contentRules:ConditionalContentAssessment):ConcretePeriodProse {
  const signals=input.lifeSignals!,axis=input.judgment.axes.find(item=>item.axis === "pattern"),s=scene(input.age,input.work);
  const period=signals.horizon === "year"?"本年":"本月";
  // Unknown ages and non-working contexts retain their validated, age-specific
  // domain scenes. They must not enter an adult career/income translation.
  const adult=contentRules.adultScenes;
  if(!adult||input.domain !== "relationship"&&!s.money){
    const original=buildConcretePeriodProse({...input,lifeSignals:undefined});
    const current=signals.events.filter(event=>event.domain===input.domain&&lifeRank[event.level]>0);
    if(current.length) return {...original,text:current.map(event=>event.text).join(""),sentences:current.map(event=>({text:event.text,kind:event.direction === "pressured"?"caution":"topic",sources:[{kind:"event",id:event.id}]}))};
    return original;
  }
  const sentences:ConcreteLifeSentence[]=[],facts:ConcretePeriodFact[]=[];
  const events=signals.events.filter(event=>event.domain===input.domain&&lifeRank[event.level]>0&&!("origin" in event&&event.origin === "personal"));
  const add=(text:string,kind:ConcreteLifeSentence["kind"],sources:ConcreteLifeSentence["sources"],event?:LifeEvent,actorIndex?:number)=>{
    if(!text||sentences.some(sentence=>sentence.text===text))return;
    sentences.push({text,kind,sources});
    if(input.domain !== "relationship")facts.push({text:text.replace(/。$/u,""),kind,domain:input.domain,axisId:axis?.id??"",actionIndex:actorIndex??null,relationId:null,
      actor:actorIndex!==undefined?axis?.stemActions?.items[actorIndex]?.tenGod??"":"",visibility:actorIndex!==undefined?axis?.stemActions?.items[actorIndex]?.visibility??"":"",
      mechanism:event?`event:${event.category}:${event.direction}`:`life:${sources.map(source=>source.id).join("|")}`,
      ...(event?{eventId:event.id,evidenceIds:[...event.supportEvidenceIds,...event.counterEvidenceIds]}:{})});
  };
  const eventLine=(event:LifeEvent)=>`${event.text}${event.level === "weak"&&!event.text.includes("较弱")?"这项线索较弱。":""}`;
  const eventSources=(event:LifeEvent):ConcreteLifeSentence["sources"]=>[{kind:"event",id:event.id,detail:`${event.level}/${event.direction}; support=${event.supportEvidenceIds.join(",")}; counter=${event.counterEvidenceIds.join(",")}`}];
  const actions=axis?.stemActions?.items??[],visibleIndex=actions.findIndex(action=>action.visibility === "visible"),visible=actions[visibleIndex];
  const actionSources=(index:number):ConcreteLifeSentence["sources"]=>[{kind:"action",id:`${axis!.id}:${index}`,detail:`${actions[index]!.stem}${actions[index]!.tenGod}/${actions[index]!.visibility}/${actions[index]!.effect}`}];
  const actorRefs=(event:LifeEvent)=>{
    const evidence="evidence" in event?event.evidence:signals.monthlyEvidence??[];
    return evidence.filter(item=>event.supportEvidenceIds.includes(item.id)&&item.kind === "actor"&&item.axisId === axis?.id&&item.actionIndex!==null)
      .flatMap(item=>actions[item.actionIndex!]?[{index:item.actionIndex!,action:actions[item.actionIndex!]}]:[]);
  };
  let headline="";
  if(input.domain === "relationship"){
    const romance=events.find(event=>event.category === "romance"),commitment=events.find(event=>event.category === "commitment"),separation=events.find(event=>event.category === "separation");
    headline=romance?.relationshipState === "separated"?"联系与关系发展有线索"
      :!romance&&!commitment&&separation?.relationshipState === "separated"?separation.level === "weak"?"旧事交接或联系边界可能调整，线索较弱":"旧事交接或联系边界有调整线索"
      :romance&&commitment?lifeRank[romance.level]>lifeRank[commitment.level]?"先看认识和关系发展，承诺落实的线索稍弱":"关系有向明确承诺推进的线索"
      :romance?"认识、联系或现有关系发展更突出":commitment?"共同生活与承诺落实更突出":separation?separation.level === "weak"?"相处安排有调整信号，结束关系的依据较弱":"关系分歧与是否继续成为重点":"本期未见独立突出的感情变化线索";
    for(const event of [romance,commitment,separation].filter((item):item is LifeEvent=>Boolean(item)))add(eventLine(event),event.category === "separation"?"caution":"opportunity",eventSources(event),event);
    const timing=signals.relationshipTiming;
    if(timing){
      for(const lens of timing.lenses.filter(lens=>contentRules.relationshipLensIds.includes(lens.id))){
        const active=lens.signals.filter(signal=>lens.triggerSignalIds.includes(signal.id));
        if(!active.length)continue;
        const star=active.filter(signal=>signal.relevance === "primary_star"&&(signal.kind === "star_entry"||signal.kind === "hidden_to_visible"));
        const palace=active.filter(signal=>signal.kind === "palace_contact");
        const contact=active.filter(signal=>signal.kind === "star_stem_contact");
        const parts=[star.length?"本年新增伴侣角色的线索":"",...palace.map(signal=>signal.relationType === "branch_six_clash"?"夫妻宫受冲，重点落在相处与共同生活安排的调整":"夫妻宫有合的联系，较偏向靠拢、协商共同安排"),
          ...contact.map(signal=>signal.relationType === "stem_clash"?"伴侣角色原有的联系受到冲动，互动或期待容易有分歧":"伴侣角色原有的联系被牵动，接触与共同事项更突出")].filter(Boolean);
        if(parts.length)add(`${timing.lenses.length>1?`${lens.label}：`:"依据是"}${[...new Set(parts)].join("；")}。`,"topic",active.map(signal=>({kind:"relationship_signal",id:`${lens.id}:${signal.id}`,detail:signal.relationType??signal.kind})));
      }
      if(!sentences.length)add("全年未见明确的婚恋转折信号，短期机会看月份。","topic",[{kind:"scope",id:`relationship:${timing.scope.segmentId}`,detail:"no annual trigger; monthly triggers remain independent"}]);
    }else if(!sentences.length)add("本月没有独立突出的相识、承诺或关系冲突信号；缺少信号不代表关系必然稳定。","topic",[{kind:"scope",id:input.judgment.targetRef?.nodeType??"month",detail:"no active relationship event"}]);
  }else if(input.domain === "wealth"){
    const inflow=events.find(event=>event.category === "money_inflow"),loss=events.find(event=>event.category === "money_loss");
    const inflowActors=inflow?actorRefs(inflow):[],leadingInflow=inflowActors.find(item=>item.action.visibility === "visible")??inflowActors[0];
    const direct=leadingInflow?.action.tenGod === "正财",extra=leadingInflow?.action.tenGod === "偏财",hiddenOnly=leadingInflow?.action.visibility === "main_hidden";
    const special=axis&&(["resource-wealth","official-resource","killings-resource","food-killings"].includes(axis.pathId)||input.task?.preferredPathId===axis.pathId&&["wealth_first","resource_first","official_joint"].includes(input.task?.task??""));
    const financialActor=actions.find(action=>action.visibility === "visible"&&["正财","偏财"].includes(action.tenGod))??actions.find(action=>["正财","偏财"].includes(action.tenGod));
    const specialProse=special&&financialActor?supportAllocationProse(financialActor,"wealth"):null;
    headline=inflow?hiddenOnly?"收入有辅助性线索，先看已有实际安排":direct?"已有报酬与回款的兑现更突出":extra?"新增合作与额外收入机会更突出":"有款项确认或进账线索"
      :specialProse&&(!loss||["obstructs","mixed"].includes(financialActor!.effect))?specialProse.headline:loss?loss.level === "weak"?actorRefs(loss).length?"额外承担有较弱线索，先看实际收支":"旧有开支与负担仍影响结余":"财运更看能留下多少，支出压力较突出":"现有收支安排是重点，增收线索不突出";
    if(inflow){
      const text=hiddenOnly?`收入支持只在支内，属于辅助条件。${direct?"若已有报酬或欠款约定，可留意确认与兑现":"若现实中已有额外任务或合作，可留意其款项分配"}，不能据此直接推成新增客户或收入扩张。`
        :direct?"看点是已有工资、报酬、合同款或欠款能否确认与到账，偏向稳定来源的兑现，不自动等于工资上涨。"
          :extra?"看点是新客户、额外订单、项目合作或成果的新用途，属于固定收入之外的机会，先有成交和分配约定才谈新增进账。":eventLine(inflow);
      const auxiliary=inflowActors.some(item=>item!==leadingInflow&&item.action.visibility === "main_hidden"&&item.action.tenGod!==leadingInflow?.action.tenGod)?"支内另有另一类款项的辅助线索，不能与透干主线等量看待。":"";
      add(text+auxiliary+(inflow.level === "weak"&&!hiddenOnly?"目前只是较弱线索。":""),"opportunity",eventSources(inflow),inflow,leadingInflow?.index);
    }
    if(loss){
      const used=actorRefs(loss),peer=used.filter(item=>["比肩","劫财"].includes(item.action.tenGod)),financial=used.filter(item=>["正财","偏财"].includes(item.action.tenGod)),resource=used.filter(item=>["正印","偏印"].includes(item.action.tenGod)),output=used.filter(item=>["食神","伤官"].includes(item.action.tenGod));
      const text=peer.length?"同业或合作中的竞争、利益分配更要留意；可能自己承担较多，最终分到的报酬却未同步，重点是收益份额。"
        :financial.length&&!special?"原约定款项的兑现容易拖延，临时周转或合作支出又可能增加；这是回款与现金安排的压力，不直接等于收入来源消失。"
          :resource.length?"付出的时间、支持成本与最终回报不容易接上，可能先承担职业、经营或家庭方面的必要费用，收益却还未落实；重点是结余被消耗。"
            :output.length?"有工作或成果要继续完成，但成本、返工或后续服务容易吃掉收益；要区分做了多少与真正留下多少收入。"
              :special?"本段资金更多用于维持必要条件或处理额外承担；改善这些安排不等于新增收入，费用与回报仍需分别确认。"
                :inflow?"这项收入机会仍受旧事项占用，业务机会、回款与到手结余不能画等号。":"原有负担继续影响结余，重点仍在资金周转和旧事项收尾。";
      add(text+(loss.level === "weak"?"额外花费仅有较弱线索。":""),"caution",eventSources(loss),loss,used[0]?.index);
    }
    if(!inflow&&!loss){
      if(specialProse&&financialActor){const index=actions.indexOf(financialActor);add(specialProse.text,specialProse.kind,actionSources(index),undefined,index);}
      else add(signals.horizon === "month"?"本月未形成独立增收或额外支出的判断。":"这一段主要看现实中的收支安排，计算未单列出新增进账或明显额外支出的强信号。","topic",[{kind:"scope",id:"income-events",detail:"no specific income event or applicable financial actor"}]);
    }
    if(inflow?.counterEvidenceIds.length&&!loss)add("进账机会与同段阻力同时存在，可能有业务或款项可谈，但完成、确认、到账不一定同步。","caution",eventSources(inflow),inflow);
  }else{
    const promotion=events.find(event=>event.category === "promotion"),change=events.find(event=>event.category === "job_change");
    headline=promotion&&change?"职责提升与工作变动都值得留意":promotion?"地位、授权或重要职责有发展机会":change?"工作环境、岗位或业务方式可能调整":"";
    for(const event of [promotion,change].filter((item):item is LifeEvent=>Boolean(item)))add(eventLine(event),event.category === "job_change"?"topic":event.direction === "pressured"?"caution":event.direction === "mixed"?"topic":"opportunity",eventSources(event),event);
    const concurrentOutput=actions.findIndex(action=>["食神","伤官"].includes(action.tenGod)&&["assists","mixed"].includes(action.effect));
    if((promotion||change)&&concurrentOutput>=0)add((actions[concurrentOutput]!.visibility === "main_hidden"?"另有支内辅助：":"同时，")+(actions[concurrentOutput]!.tenGod === "食神"?"已有技能和稳定成果仍有发挥空间，可以靠做成事情增加继续承接工作的依据。":"方案、技术或解决问题的能力有可用之处，工作变化与能力获得采用可以同时出现。"),"opportunity",actionSources(concurrentOutput),undefined,concurrentOutput);
    if(!promotion&&!change&&visible){
      const helps=actions.filter(action=>["assists","mixed"].includes(action.effect)),leadingHelp=helps.find(action=>action.visibility === "visible")??helps[0];
      const output=leadingHelp&&["食神","伤官"].includes(leadingHelp.tenGod)?leadingHelp:undefined;
      const supportAllocation=axis&&(["resource-wealth","official-resource","killings-resource","food-killings"].includes(axis.pathId)||input.task?.preferredPathId===axis.pathId&&["wealth_first","resource_first","official_joint"].includes(input.task?.task??""));
      const wealth=supportAllocation?undefined:helps.find(action=>["正财","偏财"].includes(action.tenGod));
      if(supportAllocation&&["正财","偏财"].includes(visible.tenGod)){
        const projection=supportAllocationProse(visible,"career");headline=projection.headline;
        add(projection.text,projection.kind,actionSources(visibleIndex),undefined,visibleIndex);
      }
      if(output){const index=actions.indexOf(output);headline=output.visibility === "main_hidden"?"能力和成果另有辅助发挥空间":"更利于凭能力和成果争取发展";add((output.visibility === "main_hidden"?"支内另有辅助机会：":"")+(output.tenGod === "食神"?"稳定产出、专业服务或已有业务更有发挥空间，成果可成为继续承接任务的依据。":"方案、技术、表达或解决难题的能力有可用之处，可留意成果被采用的机会。"),"opportunity",actionSources(index),undefined,index);}
      else if(wealth){const index=actions.indexOf(wealth);headline=wealth.tenGod === "偏财"?"外部需求和业务机会更突出":"已有业务的确认与落地更突出";add(wealth.tenGod === "偏财"?"新的需求、合作渠道或业务机会值得留意，发展重点在能否接住外部机会，而不只是原岗位里的日常任务。":"发展重点在把已有业务、合同责任或成果落实下来，完成确认后更有条件争取后续安排。","opportunity",actionSources(index),undefined,index);}
      const theme:Record<string,[string,string]>={
        正印:["发展更受组织支持与成果认可制约",`职业资历、平台支持与实际能力发挥之间需要接上；${period}更容易卡在成果能否被认可、能否获得施展空间这一环。`],
        偏印:["专业路线和工作方式需要取舍","专业方法、岗位适配或原有工作路线更容易出现分歧，发展上要处理的是方向与实际岗位需求能否契合。"],
        正官:["职责、考核与职业位置更突出","主要议题是职责、考核标准和正式安排；现有牵制影响落实，承担要求与实际获得的权限、认可未必同步。"],
        七杀:["责任压力与发展空间需要重新平衡","任务和外部要求更集中，职业上更像承受压力、处理难题和检验能力；忙碌增加不能直接当成地位上升。"],
        比肩:["自主承担与同业竞争更突出","发展重点在自主性、同级竞争或合作中的主导位置；自己的投入、决定权和成果归属需要一致。"],
        劫财:["合作竞争与业务份额更突出","合作伙伴、同业竞争和业务份额更值得留意；能否把合作转成自己的发展空间，要看权责与成果分配。"],
        食神:["稳住专业产出与现有业务","发展更偏向把专业成果和现有业务持续做成，实际产出能否换来认可比单纯承担更多任务更关键。"],
        伤官:["能力表现与组织要求容易不一致","个人能力、表达和改进意愿更突出，但可能与原岗位、客户或组织的要求不一致，发展机会需要实际被采用。"],
        正财:["已有业务兑现与职业落实是重点","主要看已有职责和业务能否落实，完成并得到确认，才更有条件延续工作或争取下一步。"],
        偏财:["外部机会与实际承接能力要匹配","新业务、外部合作或临时需求是这一段的主题，能否扩大业务还取决于已有工作与支持条件能否接住。"],
      };
      const fallback=theme[visible.tenGod];
      const neutral:Record<string,[string,string]>={正印:["专业资历与组织支持是重点","专业资历、平台或他人支持与实际成果之间的衔接，是这一段的职业议题。"],偏印:["专业路线与工作适配是重点","专业路线、方法和岗位适配是这一段的职业议题，现有角色本身尚未给出明确的扩张或受阻方向。"],正官:["职责、考核与正式安排是重点","主要议题是职责、考核标准和正式安排，角色出现本身不等于已经升职或受阻。"],七杀:["集中任务与责任要求是重点","任务、责任和外部要求更突出，重点是实际承接的范围，角色出现本身不等于地位变化。"]};
      if(fallback&&wealth!==visible&&!(supportAllocation&&["正财","偏财"].includes(visible.tenGod))){
        const pressure=["obstructs","mixed"].includes(visible.effect),favorable=visible.effect === "assists";
        const roleTopic=words(visible,"career",s,axis!,input.task,contentRules.actionPolicies.find(p=>p.actionIndex===visibleIndex));
        const selected=!pressure&&!favorable?(neutral[visible.tenGod]??[concreteHeadline(visible,"career",s,axis!,input.task,contentRules.actionPolicies.find(p=>p.actionIndex===visibleIndex)),roleTopic.topic+"。"]) : fallback;
        if(!headline)headline=selected[0];
        const text=favorable&&["正印","偏印"].includes(visible.tenGod)?"专业资历、组织或他人支持有助于当前任务，发展机会在于把支持真正接到职责与成果上。":selected[1];
        add(text,pressure?"caution":favorable?"opportunity":"topic",actionSources(visibleIndex),undefined,visibleIndex);
      }
    }
  }
  if(signals.horizon === "month")for(const fact of facts){
    const event=signals.events.find(event=>event.id===fact.eventId),actor=fact.actionIndex===null?undefined:actions[fact.actionIndex];
    if(event?.category === "promotion")fact.shortText=fact.kind === "caution"?"职责或任命落实仍受原有要求与支持条件牵制":`职责、考核认可或正式授权有推进线索${event.level === "weak"?"，依据较弱":""}${event.counterEvidenceIds.length?"，任命落实仍有牵制":""}`;
    else if(event?.category === "job_change")fact.shortText="工作位置或职责要求被本月触动，可留意岗位、团队或合作安排调整";
    else if(event?.category === "money_inflow")fact.shortText=fact.kind === "caution"?"完成、确认与到账可能不同步，进账机会仍受原有牵制":actor?.visibility === "main_hidden"?"支内只有辅助收入线索，先看已有款项或真实合作的兑现":actor?.tenGod === "正财"?"已有报酬、合同款或欠款更有确认与结算机会":"新增合作或额外任务有收入线索，先谈妥报酬与分配";
    else if(event?.category === "money_loss"){
      const kinds=actorRefs(event).map(item=>item.action.tenGod);
      const special=["resource-wealth","official-resource","killings-resource","food-killings"].includes(axis!.pathId)||input.task?.preferredPathId===axis!.pathId&&["wealth_first","resource_first","official_joint"].includes(input.task?.task??"");
      fact.shortText=kinds.some(god=>["比肩","劫财"].includes(god))?"收益分配与共同承担更易起争议，留意自己留下的份额":kinds.some(god=>["正财","偏财"].includes(god))?special?"新增任务与必要支持争用资金，可能追加承担费用":"原款项可能延后，临时支出或周转压力增加":kinds.some(god=>["正印","偏印"].includes(god))?"支持成本可能先出现，回报尚未落实，结余容易受挤压":kinds.length?"成果的成本、返工或后续承担容易吃掉收益":"旧事项仍占资金，留意回款与实际结余";
    }else if(fact.domain === "career"&&actor){
      const fallback=words(actor,"career",s,axis!,input.task,contentRules.actionPolicies.find(p=>p.actionIndex===fact.actionIndex));
      const financialSupportOnly=["resource-wealth","official-resource","killings-resource","food-killings"].includes(axis!.pathId)||input.task?.preferredPathId===axis!.pathId&&["wealth_first","resource_first","official_joint"].includes(input.task?.task??"");
      fact.shortText=fact.kind === "opportunity"?["食神","伤官"].includes(actor.tenGod)?`${actor.visibility === "main_hidden"?"另有支内助力，":""}${actor.tenGod === "食神"?"熟悉技能、持续服务或稳定产出有继续被采用的机会":"新方案、技术改进或解决难题有被试用的机会"}`:["正财","偏财"].includes(actor.tenGod)?financialSupportOnly?"必要支持与任务之间有可协调的条件，不直接表示业务扩张":"业务或合作有可推进之处，是否扩张仍要看承接条件":"专业支持有利于任务落实"
        :fact.kind === "caution"?actor.tenGod === "正印"?"组织或专业支持与既有成果不易接上，职业认可和施展空间受制":actor.tenGod === "偏印"?"专项方法或职业路线与实际需求不合，变更和适配更费力":fallback.pressure
          :["正官","七杀"].includes(actor.tenGod)?"本月重点在职责、标准与任务承接，本身未单独定顺逆":fact.text;
    }
  }
  if(!headline)headline="按已有领域条件推进";
  return {headline,text:sentences.map(sentence=>sentence.text).join(""),facts,sentences,signature:JSON.stringify([input.domain,headline,sentences.map(sentence=>[sentence.text,sentence.sources.map(source=>source.id)])])};
}

/** Exact task and rescue operations explain why two superficially similar
 * years differ. Target, long-term background and conditional relief stay apart. */
export function concretePeriodMechanism(input:ConcretePeriodInput):ConcreteLifeSentence[] {
  const contentRules=evaluateConditionalContentRules(input);
  const axis=input.judgment.axes.find(item=>item.axis === "pattern"),sentences:ConcreteLifeSentence[]=[],relations=axis?.taskLinks?.items.flatMap(link=>link.relations.map((edge,index)=>({link,index,edge})))??[];
  for(const origin of ["target","dayun","year"] as const){
    const edges=relations.filter(({edge})=>edge.contributesPressure&&(origin === "target"?edge.from.origin.kind === "target":edge.from.origin.kind === "background"&&edge.from.origin.nodeRef.nodeType===origin));
    if(!edges.length)continue;
    const grouped=new Map<string,typeof edges>();
    for(const item of edges){const key=`${item.edge.from.stem}:${item.edge.to.stem}`;grouped.set(key,[...(grouped.get(key)??[]),item]);}
    const clauses=[...grouped.values()].map(items=>{
      const edge=items[0]!.edge,ops=[...new Set(items.map(item=>item.edge.operation))],operation=ops.includes("combine")&&ops.includes("control")?"有合及克的作用":ops.includes("combine")?"有合的联系":"有克的作用";
      return `${edge.from.stem}${edge.from.tenGod}与${edge.to.stem}${edge.to.tenGod}${operation}`;
    });
    sentences.push({text:`${origin === "target"?"本期新增的阻力":origin === "dayun"?"同段大运持续的阻力":"同年流年持续的阻力"}是${clauses.join("、")}；${edges.some(({edge})=>edge.to.group === "output")?"影响的是原来依靠能力、成果发挥作用的环节":edges.some(({edge})=>edge.to.group === "authority")?"影响的是职责、规则与职业安排的配合":"影响的是原来需要保留的支持条件"}。`,kind:"caution",sources:edges.map(({link,index,edge})=>({kind:"task_relation",id:`${axis!.id}:${link.id}:${index}`,detail:`${origin}/${edge.operation}/${edge.from.stem}->${edge.to.stem}`}))});
  }
  const rescue=input.lifeSignals?.rescueTrace;
  for(const trace of rescue?.items.filter(item=>item.axisId===axis?.id&&item.helpers.some(helper=>helper.origin.kind === "target"))??[]){
    const actors=trace.helpers.filter(helper=>helper.origin.kind === "target");
    const action=trace.operation === "combine"?"牵合":trace.operation === "control"?"制约":"疏通";
    const text=`本期另有缓解条件：${[...new Set(actors.map(actor=>actor.stem+actor.tenGod))].join("、")}${action}${[...new Set(trace.obstacles.map(actor=>actor.stem+actor.tenGod))].join("、")}，可给${[...new Set(trace.protectedObjects.map(actor=>actor.stem+actor.tenGod))].join("、")}留出发挥空间。${trace.countsAsSupport?"已有局部支持，但原阻力没有因此全部消失。":"这是有条件的缓解候选，还不能认定已经奏效。"}`;
    const constraints=[...new Set(trace.constraints.map(edge=>`${edge.from.stem}${edge.from.tenGod}${edge.operation === "combine"?"牵合":"制约"}${edge.to.stem}${edge.to.tenGod}`))];
    const counter=trace.counterEffects.filter(effect=>effect.status === "present").map(effect=>`${effect.from.stem}${effect.from.tenGod}又生助${[...new Set(effect.targets.map(target=>target.stem+target.tenGod))].join("、")}`);
    const complete=text+(constraints.length?`同时，${constraints.join("、")}，缓解自身仍受限制。`:"")+(counter.length?`${[...new Set(counter)].join("、")}，这项新增作用也要保留。`:"");
    if(!sentences.some(sentence=>sentence.text===complete))sentences.push({text:complete,kind:trace.countsAsSupport?"opportunity":"topic",sources:[{kind:"rescue",id:trace.id,detail:`${trace.kind}/${trace.candidateStatus}/countsAsSupport=${trace.countsAsSupport}; ${trace.conditionRefs.map(ref=>`${ref.axisId}:${ref.field}:${ref.index}`).join(",")}`}]});
  }
  return sentences.map(sentence=>{
    const ids=new Set(sentence.sources.map(source=>source.id));
    const decisions=contentRules.decisions.filter(d=>d.status==="applied"&&ids.has(d.targetId));
    return {...sentence,ruleIds:[...new Set(decisions.map(d=>d.ruleId))],ruleDecisionIds:decisions.map(d=>d.id)};
  });
}

/** Translates computed actions into possible everyday situations. Overall
 * good/bad is copied from the axis; counting these scenes never re-scores it. */
function generateConcretePeriodProse(input: ConcretePeriodInput,contentRules:ConditionalContentAssessment): ConcretePeriodProse {
  if(input.lifeSignals)return differentiatedLifeProse(input,contentRules);
  const s = scene(input.age, input.work);
  if (input.domain === "relationship") return relation(input,s);
  const domain = input.domain, axis = input.judgment.axes.find(item => item.axis === "pattern"), facts: ConcretePeriodFact[] = [];
  if (!axis) return {headline:"这一时段缺少完整判断",text:"现有计算未形成完整结论，未补写具体好坏或事件。",facts,signature:"missing-pattern"};
  for (const [index,action] of (axis.stemActions?.items ?? []).entries()) {
    const policy=contentRules.actionPolicies.find(p=>p.actionIndex===index);
    const line = words(action,domain,s,axis,input.task,policy);
    const add = (kind:ConcretePeriodFact["kind"],text:string) => {
      const companionText=domain === "wealth"&&kind === "opportunity"&&line.mechanism === "role:食神"?(s.money?"已有付费约定时，可继续谈下一批报酬或续单":"旧材料和用品也较容易沿用")
        :domain === "wealth"&&kind === "opportunity"&&line.mechanism === "role:伤官"?"为试做买的材料和工具较能派上用场":undefined;
      if (!facts.some(f => f.kind === kind && f.text === text)) facts.push({kind,domain,text,axisId:axis.id,actionIndex:index,relationId:null,actor:action.tenGod,visibility:action.visibility,mechanism:line.mechanism,...(companionText?{companionText}:{})});
    };
    if (policy?.allowedKinds.includes("opportunity")) add("opportunity",line.help);
    if (policy?.allowedKinds.includes("caution")) add("caution",line.pressure);
    if (policy?.allowedKinds.length===1&&policy.allowedKinds[0]==="topic") add("topic",line.topic);
  }
  for (const link of axis.taskLinks?.items ?? []) for (const [index,edge] of link.relations.entries()) {
    if (!edge.contributesPressure || edge.from.origin.kind === "target") continue;
    const text=ongoingPressure(axis.stemActions?.items.find(item=>item.visibility === "visible"),domain,s,edge.to.group,edge.operation);
    if (text && !facts.some(f => f.text === text)) facts.push({kind:"caution",domain,text,axisId:axis.id,actionIndex:null,relationId:`${link.id}:${index}`,actor:edge.from.tenGod,visibility:edge.from.visibility,mechanism:`background:${edge.operation}:${edge.to.group}`,
      ...(domain === "wealth"?{companionText:"因此可能再花一次材料、工具或帮助的费用"}:{})});
  }
  const opportunity = facts.filter(f => f.kind === "opportunity"), caution = facts.filter(f => f.kind === "caution"), topic = facts.filter(f => f.kind === "topic");
  const visibleIndex=axis.stemActions?.items.findIndex(item=>item.visibility === "visible");
  const headline = concreteHeadline(axis.stemActions?.items.find(item=>item.visibility === "visible"),domain,s,axis,input.task,contentRules.actionPolicies.find(p=>p.actionIndex===visibleIndex));
  // The annual main answer leads with one concrete situation of each sign.
  // All actor and background facts remain available to monthly selection and
  // detailed evidence, including the hidden actor that supplies the help.
  const currentTopic = topic.find(f=>f.visibility === "visible") ?? topic[0];
  const text = [currentTopic?`当前重点：${currentTopic.text}。`:"",opportunity.length?`机会：${opportunity[0]!.visibility === "main_hidden"?"支内另有辅助，":""}${opportunity[0]!.text}。`:"",caution.length?`阻力：${caution[0]!.visibility === "main_hidden"?"支内作用提示，":""}${caution[0]!.text}。`:"",
    !opportunity.length&&!caution.length&&!currentTopic?"主要事项：先确认眼前事项的实际安排。":""].filter(Boolean).join("");
  return {headline,text,facts,signature:JSON.stringify([axis.effect,input.age.stage,input.work??"unspecified",facts.map(({kind,actor,mechanism,text})=>[kind,actor,mechanism,text])])};
}

/** Rule decisions select the actual meaning/allowed signs above and gate event
 * reuse. Original event texts and computed objects remain untouched. */
export function buildConcretePeriodProse(input:ConcretePeriodInput):ConcretePeriodProse {
  const contentRules=evaluateConditionalContentRules(input);
  if(input.age.stage==="before_birth")return {headline:"本区间早于出生",text:"本区间不作个人经历或生活事件解读。",facts:[],sentences:[{text:"本区间不作个人经历或生活事件解读。",kind:"topic",sources:[{kind:"scope",id:"age"}],ruleIds:["age-scope"],ruleDecisionIds:["age-scope:scope"]}],signature:"before-birth",contentRules};
  const allowed=new Set(contentRules.eventPolicies.filter(policy=>policy.allowed).map(policy=>policy.eventId));
  const selected=input.lifeSignals?{...input,lifeSignals:{...input.lifeSignals,events:input.lifeSignals.events.filter(event=>allowed.has(event.id))}}:input;
  const result=generateConcretePeriodProse(selected,contentRules);
  const attach=(sources:ConcreteLifeSentence["sources"])=>{
    const targets=new Set(sources.map(source=>source.id));
    const eventDecisions=new Set(contentRules.eventPolicies.filter(policy=>targets.has(policy.eventId)).flatMap(policy=>policy.decisionIds));
    const decisions=contentRules.decisions.filter(d=>d.status==="applied"&&(targets.has(d.targetId)||eventDecisions.has(d.id)||d.targetId==="scope"));
    return {ruleIds:[...new Set(decisions.map(d=>d.ruleId))],ruleDecisionIds:decisions.map(d=>d.id)};
  };
  const facts=result.facts.map(fact=>{
    const sources:ConcreteLifeSentence["sources"]=fact.eventId?[{kind:"event",id:fact.eventId}]:fact.actionIndex!==null?[{kind:"action",id:`${fact.axisId}:${fact.actionIndex}`}]:fact.relationId?[{kind:"task_relation",id:`${fact.axisId}:${fact.relationId}`}]:[{kind:"scope",id:"scope"}];
    return {...fact,...attach(sources)};
  });
  // The direct, age-specific route also receives a sentence-level map. Only
  // the three facts actually printed in its summary are cited, not every fact
  // retained for expanded evidence.
  const printed=result.sentences??[facts.find(f=>f.kind==="topic"&&f.visibility==="visible")??facts.find(f=>f.kind==="topic"),facts.find(f=>f.kind==="opportunity"),facts.find(f=>f.kind==="caution")]
    .filter((fact):fact is typeof facts[number]=>Boolean(fact)).map(fact=>({text:fact.text,kind:fact.kind,sources:fact.actionIndex!==null?[{kind:"action" as const,id:`${fact.axisId}:${fact.actionIndex}`}]:fact.relationId?[{kind:"task_relation" as const,id:`${fact.axisId}:${fact.relationId}`}]:[{kind:"scope" as const,id:"scope"}]}));
  const sentences=printed.map(sentence=>({...sentence,...attach(sentence.sources)}));
  return {...result,facts,...(sentences?{sentences}:{}),contentRules};
}
