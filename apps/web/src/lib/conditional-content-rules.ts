import type { ConcretePeriodInput } from "./concrete-period-prose";
import type { OutlookEffect } from "./local-outlook-judgment";

/** Local expression constraints, not a new calculation or an ancient event algorithm. */
export const CONDITIONAL_CONTENT_RULES_VERSION = "hakimi.conditional-content-rules/0.1.0" as const;
export type ContentClaimKind = "opportunity" | "caution" | "topic";
export type ConditionalContentRuleId =
  | "role-resource" | "role-owl" | "role-food" | "role-hurting" | "role-direct-wealth"
  | "role-indirect-wealth" | "role-official" | "role-killing" | "role-peer" | "role-rob"
  | "wealth-moderates-resource" | "wealth-protects-resource" | "authority-resource-funding"
  | "food-killing-cost" | "necessary-resource" | "output-authority-conflict"
  | "persistent-background" | "hidden-is-auxiliary" | "undirected-is-topic" | "rescue-is-candidate"
  | "age-scope" | "context-scope" | "relationship-lens-scope" | "independent-event-evidence";
export interface ConditionalContentRuleDefinition {
  id: ConditionalContentRuleId; title: string; trigger: string[]; support: string[]; exclusions: string[];
  backgrounds: string[]; allowedExpressions: string[]; forbiddenInferences: string[];
  sourceBasis: { kind: "local_expression_constraint"; existingEvidence: string[]; boundary: string };
  counterexamples: { when: string; mustNotSay: string }[];
}
export interface ConditionalContentFactRef {
  kind: "action" | "axis_field" | "task" | "task_relation" | "event_evidence" | "relationship_signal" | "rescue" | "scope";
  id: string; axisId: string | null; index: number | null; field: string | null;
  origin: string; detail: string;
}
export interface ConditionalContentDecision {
  id: string; ruleId: ConditionalContentRuleId; targetId: string; status: "applied" | "excluded";
  support: ConditionalContentFactRef[]; counterFacts: ConditionalContentFactRef[];
  exclusions: string[]; allowedKinds: ContentClaimKind[]; sourceIds: string[];
}
export type ConditionalActionMechanism = "role" | "trim_redundant_preparation" | "protect_needed_support"
  | "fund_execution_support" | "food_killing_cost" | "needed_support" | "authority_conflict";
export interface ConditionalActionPolicy {
  axisId: string; actionIndex: number; actionId: string; effect: OutlookEffect;
  mechanism: ConditionalActionMechanism; allowedKinds: ContentClaimKind[];
  incomeClaimAllowed: boolean; ruleIds: ConditionalContentRuleId[]; decisionIds: string[];
}
export interface ConditionalContentAssessment {
  version: typeof CONDITIONAL_CONTENT_RULES_VERSION;
  scope: { sourceBinding: ConcretePeriodInput["judgment"]["sourceBinding"] | null;
    targetRef: ConcretePeriodInput["judgment"]["targetRef"] | null;
    backgroundRefs: ConcretePeriodInput["judgment"]["backgroundRefs"];
    interval: ConcretePeriodInput["judgment"]["interval"] | null; domain: ConcretePeriodInput["domain"];
    ageStage: ConcretePeriodInput["age"]["stage"]; work: string; relationshipState: string };
  decisions: ConditionalContentDecision[]; actionPolicies: ConditionalActionPolicy[];
  eventPolicies: { eventId: string; allowed: boolean; ruleIds: ConditionalContentRuleId[]; decisionIds: string[] }[];
  relationshipLensIds: string[]; adultScenes: boolean; incomeScenes: boolean;
}

const sharedSourceBoundary = "沿原已计算作用及其来源；现代事件与生活表达属于本地解释，不冒充原典逐字规则，不代表发生概率。";
const roles = [
  ["role-resource", "正印", "指导、资历与常规准备", "指导能解决任务难点", "准备占用完成时间", "印出现即身弱或一律有贵人"],
  ["role-owl", "偏印", "专项方法与工具切换", "专项方法解决具体问题", "新旧方法切换或重复费用", "偏印一律凶或一律多花钱"],
  ["role-food", "食神", "熟悉技能与持续完成", "作品、服务继续被采用", "反复修改或延续中断", "有食神就升职或有收入"],
  ["role-hurting", "伤官", "表达、方案与改法试用", "方案进入试用", "做法与接受标准不合", "未定作用也必有冲突"],
  ["role-direct-wealth", "正财", "原约定的兑现与费用确认", "已有约定款项的确认", "原款项或费用核对受阻", "任何正财都代表工资上涨"],
  ["role-indirect-wealth", "偏财", "新增用途与合作安排", "实际合作的新报酬机会", "临时安排的预算占用", "任何偏财都代表额外收入"],
  ["role-official", "正官", "正式职责与审核", "职责确认或正式认可", "审核责任与期限压力", "正官出现就升职结婚"],
  ["role-killing", "七杀", "集中要求与难题", "集中难题有处理办法", "集中要求挤压时间", "七杀出现就受伤失业"],
  ["role-peer", "比肩", "自主承担与共同分工", "个人负责与协作接上", "主导权或份额分歧", "比肩出现就争财"],
  ["role-rob", "劫财", "协作参与与共同分配", "他人分担具体任务", "责任与共同费用争议", "劫财出现就破财被骗"],
] as const;
const roleRules: ConditionalContentRuleDefinition[] = roles.map(([id,god,title,help,pressure,forbidden]) => ({
  id,title,trigger:[`原pattern.stemActions中有${god}，保留明透或本气身份`],
  support:["assists只开放机会；obstructs只开放阻力；mixed分别保两者", "neutral/unresolved只开放事项，不从轴总分借方向"],
  exclusions:["同角色在特殊财印、官印、食杀任务时先用对应机制", "不能用别的柱位或背景角色代替当前角色"],
  backgrounds:["按真实年龄与已确认身份替换生活对象", "未填身份用条件情景，不断已有职业、收入或伴侣"],
  allowedExpressions:[help,pressure,`${title}成为事项，但该角色尚未单独定向`], forbiddenInferences:[forbidden,"实际发生保证、统计概率"],
  sourceBasis:{kind:"local_expression_constraint",existingEvidence:["matched pattern axis sourceIds / action evidenceIndexes"],boundary:sharedSourceBoundary},
  counterexamples:[{when:`${god}为neutral且支内另一字assists`,mustNotSay:`${god}本身带来好运`},{when:"特殊任务把该字用于必要支持取舍",mustNotSay:"普通角色事件已成立"}],
}));
const specific: [ConditionalContentRuleId,string,string,string,string,string,string][] = [
  ["wealth-moderates-resource","财调节重复准备","财角色且匹配wealth_first或resource-wealth","原任务preferredPathId一致或该原路径","无实际财角色、任务路径失配","缩减重复准备的可能用途","裁印等于进财；未定即已节省"],
  ["wealth-protects-resource","财与必要支持的取舍","财角色且匹配resource_first","匹配任务与财角色原effect","conditional/not_applicable或路径失配","保留必要指导与工具投入","财出现即收入机会；必要印都应删"],
  ["authority-resource-funding","官印配套费用","财角色且官印/杀印路径或匹配official_joint","职责与必要支持原路径及具体财作用","没有实际财角色","职责配套投入的使用或占用","财压印仍算进财；原约定改成新订单"],
  ["food-killing-cost","食杀中的投入与新增承担","食杀路径的实际财角色","原财作用和实际任务边关系","只凭食杀路径没有财角色","工具与协作费用、额外承担","财生杀等于收入；护食候选等于压力消失"],
  ["necessary-resource","必要指导不可写成多余准备","印角色且resource_first/官印/杀印路径","原印作用与必要支持任务","仅同神名称、未有相应路径","指导接到职责，或必要帮助未落实","所有印阻力都是准备过多"],
  ["output-authority-conflict","表达与要求不合","食伤在official-wealth或实际目标克合官星","本期作用、原保护对象与原阻力","背景边不得归到目标角色","做法与原要求不一致","改写成自身无能力或普通泄耗"],
  ["persistent-background","持续背景仍独立保留","真实background关系contributesPressure","边的from/to、operation、原refs","同干不同柱不得混并、target不作背景","同段大运/流年持续影响哪一环","背景阻力写到neutral目标；每项事件都受阻"],
  ["hidden-is-auxiliary","藏位支持只作辅助","main_hidden角色","该角色自己的effect与索引","不得转成明透或替明透改方向","支内另有辅助作用","藏字帮助等于全年明透事项都顺"],
  ["undirected-is-topic","未定和中性不造好坏","neutral或unresolved角色","原effect保留","排除机会/阻力主张","具体事项与过程而不宣告结果","无方向即坏；路径有用即该字已助"],
  ["rescue-is-candidate","缓解保候选和约束","原rescueTrace精确同源同段","countsAsSupport与candidateStatus、约束、反生作用","没检查约束不宣告无合克；不跨段救应","有条件缓解及实际限制","救应数量当概率；候选当成功"],
  ["age-scope","年龄与真实适用区间","所有内容投影","已算年龄分段、出生前和未知状态","非完整成人段不套成年职业婚恋事件","幼儿照料、少年学习、未知中性事项","跨18整段成人化；出生前编人生事件"],
  ["context-scope","已确认身份约束对象","已确认work/relationship状态","调用方验证的同范围context；事件状态一致","退休照料学生求职不默认报酬、separated不写复合","按实际身份保对应日常事项","由自由notes猜职业；分开等于必复合"],
  ["relationship-lens-scope","关系必须同视角同层","独立timing或月关系证据","仅当期活跃lens，背景仅在同lens作反向条件","无当期触发的另一lens不得拼接","相识、承诺或相处变化的独立线索","事业好坏推感情；无信号等于稳定"],
  ["independent-event-evidence","事件由自身证据支持","已有事件候选","同目标同区间的support证据及确切角色/关系","无支持、错段、特殊财任务进财、单输出升职","原候选级别与具体场景","换运即换工作；mixed给每项事件添阻力"],
];
export const CONDITIONAL_CONTENT_RULES: readonly ConditionalContentRuleDefinition[] = [...roleRules,...specific.map(([id,title,trigger,support,exclude,allowed,forbidden]):ConditionalContentRuleDefinition=>({
  id,title,trigger:[trigger],support:[support],exclusions:[exclude],backgrounds:["当前年龄、真实身份与精确时段；未知项原样保留"],
  allowedExpressions:[allowed],forbiddenInferences:[forbidden,"真实发生保证或统计概率"],
  sourceBasis:{kind:"local_expression_constraint",existingEvidence:["matched original axis/task/timing/rescue sourceIds and exact references"],boundary:sharedSourceBoundary},
  counterexamples:[{when:exclude,mustNotSay:allowed},{when:"仅总轴mixed，缺该事项自己的支持",mustNotSay:"该事项有机会且必有阻力"}],
}))];
export function lookupConditionalContentRule(id: string): ConditionalContentRuleDefinition | null {
  return CONDITIONAL_CONTENT_RULES.find(rule=>rule.id===id)??null;
}
const uniq=<T>(items:readonly T[])=>[...new Set(items)];
const stable=(value:unknown):string=>JSON.stringify(value,(_key,item)=>item&&typeof item==="object"&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
const same=(a:unknown,b:unknown)=>stable(a)===stable(b);
const kinds=(effect:OutlookEffect):ContentClaimKind[]=>effect==="assists"?["opportunity"]:effect==="obstructs"?["caution"]:effect==="mixed"?["opportunity","caution","topic"]:["topic"];
const ref=(kind:ConditionalContentFactRef["kind"],id:string,detail:string,axisId:string|null=null,index:number|null=null,field:string|null=null,origin="target"):ConditionalContentFactRef=>({kind,id,axisId,index,field,origin,detail});

/** Reads existing facts only. Policies are consumed by the prose builder; no score,
 * actor effect, event level, source object or feedback identity is changed. */
export function evaluateConditionalContentRules(input:ConcretePeriodInput):ConditionalContentAssessment {
  const j=input.judgment,axis=j.axes.find(item=>item.axis==="pattern"),actions=axis?.stemActions?.items??[];
  const adult=input.age.stage==="adult"&&input.age.segments.every(part=>part.stage==="adult");
  const work=input.work??"unspecified",income=adult&&!["retired","caregiving","student","seeking_work"].includes(work);
  const decisions:ConditionalContentDecision[]=[],actionPolicies:ConditionalActionPolicy[]=[],eventPolicies:ConditionalContentAssessment["eventPolicies"]=[];
  const add=(ruleId:ConditionalContentRuleId,targetId:string,support:ConditionalContentFactRef[],counterFacts:ConditionalContentFactRef[],exclusions:string[],allowedKinds:ContentClaimKind[],sourceIds:string[]=[])=>{
    const d:ConditionalContentDecision={id:`${ruleId}:${targetId}`,ruleId,targetId,status:exclusions.length?"excluded":"applied",support,counterFacts,exclusions,allowedKinds,sourceIds:uniq(sourceIds)};
    decisions.push(d);return d;
  };
  const ageDecision=add("age-scope","scope",[ref("scope","age",`${input.age.stage}; ${input.age.segments.map(s=>`${s.stage}:${s.startInstant}/${s.endExclusiveInstant}`).join(";")}`)],[],[],["topic"]);
  const contextDecision=add("context-scope","scope",[ref("scope","context",`${work}/${input.verdict?.relationshipState??"unspecified"}`)],[],[],["topic"]);
  const matchingTask=input.task?.preferredPathId===axis?.pathId?input.task:null;
  for(const [i,a] of actions.entries()){
    const id=`${axis!.id}:${i}`,actionRef=ref("action",id,`${a.stem}${a.tenGod}/${a.visibility}/${a.effect}`,axis!.id,i,"stemActions"),allowed=kinds(a.effect);
    const fields=(indexes:readonly number[],field:"evidence"|"blockers"|"satisfiedConditions")=>indexes.map(index=>{
      if(!Number.isInteger(index)||index<0||axis![field][index]===undefined)throw new Error("内容规则：角色原依据索引越界。");
      return ref("axis_field",`${axis!.id}:${field}:${index}`,axis![field][index]!,axis!.id,index,field);
    });
    const support=[actionRef,...fields(a.evidenceIndexes,"evidence"),...fields(a.satisfiedConditionIndexes,"satisfiedConditions")],counter=fields(a.blockerIndexes,"blockers");
    const own:ConditionalContentDecision[]=[],role=roles.find(row=>row[1]===a.tenGod);
    if(role)own.push(add(role[0],id,support,counter,[],allowed,axis!.sourceIds));
    let mechanism:ConditionalActionMechanism="role";
    const financial=["正财","偏财"].includes(a.tenGod),resource=["正印","偏印"].includes(a.tenGod),output=["食神","伤官"].includes(a.tenGod);
    let special:ConditionalContentRuleId|null=null;
    if(financial&&(matchingTask?.task==="wealth_first"||axis!.pathId==="resource-wealth")){mechanism="trim_redundant_preparation";special="wealth-moderates-resource";}
    else if(financial&&matchingTask?.task==="resource_first"){mechanism="protect_needed_support";special="wealth-protects-resource";}
    else if(financial&&(matchingTask?.task==="official_joint"||["official-resource","killings-resource"].includes(axis!.pathId))){mechanism="fund_execution_support";special="authority-resource-funding";}
    else if(financial&&axis!.pathId==="food-killings"){mechanism="food_killing_cost";special="food-killing-cost";}
    else if(resource&&(matchingTask?.task==="resource_first"||["official-resource","killings-resource"].includes(axis!.pathId))){mechanism="needed_support";special="necessary-resource";}
    const edges=axis!.taskLinks?.items.flatMap(link=>link.relations.flatMap((edge,index)=>edge.contributesPressure&&edge.from.origin.kind==="target"&&edge.from.stem===a.stem&&edge.from.visibility===a.visibility?[{link,index,edge}]:[]))??[];
    if(output&&(axis!.pathId==="official-wealth"||edges.some(({edge})=>edge.to.group==="authority"))){mechanism="authority_conflict";special="output-authority-conflict";}
    if(special){
      // The ordinary role meaning is explicitly superseded, not advertised as
      // another independent source of income/support in the same sentence.
      if(own[0]){own[0].status="excluded";own[0].exclusions.push("已有具体任务或实际保护对象，普通角色含义不单独采用");own[0].allowedKinds=[];}
      own.push(add(special,id,[...support,ref("task",axis!.pathId,matchingTask?`${matchingTask.task}/${matchingTask.preferredPathId}`:axis!.pathId)],counter,[],allowed,uniq([...axis!.sourceIds,...matchingTask?.sourceIds??[]])));
    }
    if(a.visibility==="main_hidden")own.push(add("hidden-is-auxiliary",id,[actionRef],[],[],allowed,axis!.sourceIds));
    if(["neutral","unresolved"].includes(a.effect))own.push(add("undirected-is-topic",id,[actionRef],counter,[],["topic"]));
    actionPolicies.push({axisId:axis!.id,actionIndex:i,actionId:id,effect:a.effect,mechanism,allowedKinds:allowed,
      incomeClaimAllowed:income&&financial&&mechanism==="role"&&["assists","mixed"].includes(a.effect),
      ruleIds:uniq([...own.filter(d=>d.status==="applied").map(d=>d.ruleId),ageDecision.ruleId,contextDecision.ruleId]),decisionIds:[...own.map(d=>d.id),ageDecision.id,contextDecision.id]});
  }
  for(const link of axis?.taskLinks?.items??[])for(const [i,edge] of link.relations.entries())if(edge.contributesPressure&&edge.from.origin.kind==="background"){
    add("persistent-background",`${axis!.id}:${link.id}:${i}`,[ref("task_relation",`${axis!.id}:${link.id}:${i}`,`${edge.from.stem}${edge.from.tenGod}/${edge.operation}/${edge.to.stem}${edge.to.tenGod}`,axis!.id,i,"taskLinks",`background:${edge.from.origin.nodeRef?.nodeType??"unknown"}`)],
      (edge.refs??[]).map(r=>ref("axis_field",`${r.axisId}:${r.field}:${r.index}`,j.axes.find(a=>a.id===r.axisId)?.[r.field][r.index]??"",r.axisId,r.index,r.field,"background")),[],["caution"],axis!.sourceIds);
  }
  const rescue=input.lifeSignals?.rescueTrace;
  if(rescue){
    if(!same(rescue.sourceBinding,j.sourceBinding)||!same(rescue.targetRef,j.targetRef)||!same(rescue.backgroundRefs,j.backgroundRefs)||!same(rescue.interval,j.interval))throw new Error("内容规则：救应依据不是同源同段。");
    for(const item of rescue.items)add("rescue-is-candidate",item.id,[ref("rescue",item.id,`${item.kind}/${item.candidateStatus}/${item.constraintCheck}/countsAsSupport=${item.countsAsSupport}`,item.axisId)],
      [...item.conditionRefs,...item.blockerRefs].map(r=>ref("axis_field",`${r.axisId}:${r.field}:${r.index}`,j.axes.find(a=>a.id===r.axisId)?.[r.field][r.index]??"",r.axisId,r.index,r.field)),[],item.countsAsSupport?["opportunity","topic"]:["topic"],j.axes.find(a=>a.id===item.axisId)?.sourceIds??[]);
  }
  const timing=input.lifeSignals?.relationshipTiming,relationshipLensIds:string[]=[];
  if(timing){
    if(timing.sourceBinding.revisionId!==j.sourceBinding?.revisionId||timing.sourceBinding.chartResultHash!==j.sourceBinding?.chartResultHash||timing.sourceBinding.includeHour!==j.sourceBinding?.includeHour||!same(timing.scope.targetRef,j.targetRef)||!same(timing.scope.backgroundRefs,j.backgroundRefs)||timing.scope.startInstant!==j.interval?.startInstant||timing.scope.endExclusiveInstant!==j.interval?.endExclusiveInstant)throw new Error("内容规则：关系依据不是同源同段。");
    for(const lens of timing.lenses){
      const active=lens.signals.filter(s=>lens.triggerSignalIds.includes(s.id)&&s.source==="year"&&same(s.nodeRef,j.targetRef));
      if(active.length)relationshipLensIds.push(lens.id);
      add("relationship-lens-scope",lens.id,active.map(s=>ref("relationship_signal",`${lens.id}:${s.id}`,s.text,null,null,s.kind,"target")),
        lens.signals.filter(s=>s.source==="dayun"&&lens.backgroundSignalIds.includes(s.id)).map(s=>ref("relationship_signal",`${lens.id}:${s.id}`,s.text,null,null,s.kind,"background")),active.length?[]:["该视角没有当期触发，背景不生成新事件"],["topic"],lens.sourceIds);
    }
  }
  for(const event of input.lifeSignals?.events.filter(event=>event.domain===input.domain)??[]){
    const evidence="evidence" in event?event.evidence:input.lifeSignals?.monthlyEvidence??[],support=evidence.filter(e=>event.supportEvidenceIds.includes(e.id)),counter=evidence.filter(e=>event.counterEvidenceIds.includes(e.id));
    const exclusions:string[]=[];
    if(!adult||!event.applicableIntervals.length)exclusions.push("没有完整成人适用段；保留原适龄正文");
    if(event.scope.startInstant!==j.interval?.startInstant||event.scope.endExclusiveInstant!==j.interval?.endExclusiveInstant)exclusions.push("事件区间与当前判断不一致");
    if(timing&&(event.scope.year!==timing.scope.year||event.scope.branchId!==timing.scope.branchId||event.scope.segmentId!==timing.scope.segmentId))exclusions.push("事件分支或分段与同源关系范围不一致");
    if("targetRef" in event.scope&&(!same(event.scope.targetRef,j.targetRef)||!same(event.scope.backgroundRefs,j.backgroundRefs)))exclusions.push("事件目标或背景引用失配");
    if(event.workState!==work)exclusions.push("事件身份与已确认身份不一致");
    if("origin" in event&&event.origin==="personal")exclusions.push("个人原文不由自动规则改写");
    const current=support.filter(e=>same(e.nodeRef,j.targetRef)&&e.origin===input.lifeSignals!.horizon);
    if(!current.length||support.length!==event.supportEvidenceIds.length)exclusions.push("缺少完整的当期独立支持证据");
    if(counter.length!==event.counterEvidenceIds.length)exclusions.push("事件反向依据未完整提供，不能删去限制后复用正文");
    const used=current.filter(e=>e.kind==="actor"&&e.axisId===axis?.id&&e.actionIndex!==null).flatMap(e=>actionPolicies[e.actionIndex!]? [actionPolicies[e.actionIndex!]]:[]);
    if(event.category==="money_inflow"&&(!income||!used.some(p=>p.incomeClaimAllowed)))exclusions.push("本期财作用不是可表达收入的作用或身份");
    if(event.category==="promotion"&&(!income||work==="self_employed"||!used.some(p=>["assists","mixed"].includes(p.effect)&&(["正官","七杀"].includes(actions[p.actionIndex]!.tenGod)||p.mechanism==="needed_support"))))exclusions.push("缺少本期职责或必要印支持，不把一般成果当升职");
    if(event.category==="money_loss"&&!used.some(p=>["obstructs","mixed"].includes(p.effect))&&!current.some(e=>["rescue_countereffect","task_relation"].includes(e.kind)))exclusions.push("缺少本期额外承担的反向作用，不把中性事项写成破财");
    if(event.category==="job_change"&&!current.some(e=>["pillar_relation","career_relation"].includes(e.kind)))exclusions.push("缺少工作位置的实际关系触发，不把换运或一般角色当换工作");
    if(event.domain==="relationship"){
      const active=current.filter(e=>e.lensId&&(timing?e.kind==="relationship_signal"&&relationshipLensIds.includes(e.lensId):["palace_relation","star_entry","star_relation"].includes(e.kind)));
      if(!active.length)exclusions.push("缺少同一活跃关系视角的当期支持");
      const activeLenses=new Set(active.map(e=>e.lensId));
      if(event.lensIds.some(id=>!activeLenses.has(id))||counter.some(e=>e.lensId&&!activeLenses.has(e.lensId)))exclusions.push("反向条件或结论混入没有当期触发的另一关系视角");
      if(input.verdict?.relationshipState&&event.relationshipState!==input.verdict.relationshipState)exclusions.push("关系状态与当前已确认状态不一致");
    }
    const mapEvidence=(e:typeof evidence[number])=>ref("event_evidence",e.id,"original" in e?e.original:e.text,e.axisId,e.actionIndex,e.kind,e.origin);
    const d=add("independent-event-evidence",event.id,support.map(mapEvidence),counter.map(mapEvidence),exclusions,exclusions.length?[]:event.direction==="pressured"?["caution","topic"]:event.direction==="mixed"?["opportunity","caution","topic"]:["opportunity","topic"],event.sourceIds);
    eventPolicies.push({eventId:event.id,allowed:!exclusions.length,ruleIds:uniq([d.ruleId,"age-scope","context-scope",...(event.domain==="relationship"?["relationship-lens-scope" as const]:[]),...used.flatMap(p=>p.ruleIds)]),decisionIds:[d.id,ageDecision.id,contextDecision.id,...used.flatMap(p=>p.decisionIds)]});
  }
  return {version:CONDITIONAL_CONTENT_RULES_VERSION,scope:{sourceBinding:j.sourceBinding??null,targetRef:j.targetRef??null,backgroundRefs:j.backgroundRefs??[],interval:j.interval??null,domain:input.domain,ageStage:input.age.stage,work,relationshipState:input.verdict?.relationshipState??"unspecified"},decisions,actionPolicies,eventPolicies,relationshipLensIds,adultScenes:adult,incomeScenes:income};
}
