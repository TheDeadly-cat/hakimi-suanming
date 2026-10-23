/** Frozen historical formatter; original SHA-256 8f643c8faaecd7d04310a89057f2743d8bd7640dbbe4a65fa160c95d5f0e3f0e. */
import { getWorkingBalance } from "../../../../../packages/bazi-interpretation/src/structural-strength-assessment";
import { revisionRecordSchema, transitNodeRefSchema, type RevisionRecord } from "@hakimi/contracts";
import { calculatePillarRelations, type RelationFact } from "@hakimi/relations-core";
import { LunarUtil } from "lunar-typescript";
import type { BaziPreliminaryAssessment } from "../../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { canonicalizeStrengthTenGod } from "../../../../../packages/bazi-interpretation/src/strength-policy";
import type { LocalAnnualYear } from "./local-annual-outlook";
import { LOCAL_OUTLOOK_JUDGMENT_VERSION, LOCAL_OUTLOOK_POLICY_VERSION, type LocalOutlookJudgment } from "./local-outlook-judgment";
import { annualEventContext, personalizeAnnualTopic } from "../annual-event-personalization";

export const ANNUAL_EVENT_SCENARIOS_VERSION = "hakimi.annual-event-scenarios/0.4.0" as const;
export interface AnnualEventScenario {
  id: string;
  domain: "career" | "wealth" | "relationship" | "change";
  title: string;
  summary: string;
  examples: string[];
  conditions: string[];
  evidence: string[];
}
type Position = "year" | "month" | "day";
type Interaction = { position: Position; fact: RelationFact; text: string };
type Topic = { title: string; meaning: string; examples: string[] };
const LABELS: Record<Position, string> = { year: "年柱", month: "月柱", day: "日柱" };
const RELATIONS: Partial<Record<RelationFact["relationType"], string>> = {
  stem_five_combination: "天干五合", stem_clash: "天干冲", branch_six_combination: "地支六合", branch_six_clash: "地支六冲"
};
const CAREER: Record<string, Topic> = {
  正官: { title: "岗位职责与考核", meaning: "事业上的重点偏向职责、标准和承诺是否兑现，外部评价会成为更具体的议题", examples: ["岗位职责、考核办法或项目负责范围出现调整", "工作进入资质审核、流程确认或成果验收的阶段"] },
  七杀: { title: "紧迫任务与责任承接", meaning: "事业上较突出的情境是任务变紧、要求提高，需要在期限和现有能力之间承接压力", examples: ["原有任务之外增加了临时职责，完成期限较紧", "多项要求同时到来，原定分工或推进顺序需要改变"] },
  正印: { title: "学习资质与专业积累", meaning: "事业主题偏向学习、资质和支持来源，已有经验怎样被认可比单纯扩大任务更突出", examples: ["遇到进修、考试、资格补充或系统培训的机会与要求", "长辈、前辈或组织提供指导，工作逐渐转向专业积累"] },
  偏印: { title: "专项学习与方法更新", meaning: "事业主题偏向专项能力和方法转换，原来的经验需要适应新的问题", examples: ["开始接触陌生工具、专项研究或不同于过去的工作方法", "任务需要独立钻研，现成流程暂时难以直接套用"] },
  食神: { title: "稳定产出与项目交付", meaning: "事业主题偏向持续产出，技能、作品或服务能否稳定落地成为重点", examples: ["工作进入连续交付、作品发布或服务维护的阶段", "已有能力被用于解决具体需求，质量与交付节奏受到关注"] },
  伤官: { title: "提案表达与流程改进", meaning: "事业上个人意见和解决问题的方式更突出，表达成果与既有标准之间需要协调", examples: ["出现提案、展示作品或主导改进的机会", "自己的改法与原有流程、上级要求存在需要讨论的差异"] },
  正财: { title: "成果兑现与执行管理", meaning: "事业主题偏向实际结果，项目能否完成、验收和兑现会比设想本身更受重视", examples: ["已有任务进入验收、结算或续约的节点", "项目进度、预算和交付责任成为工作中的集中议题"] },
  偏财: { title: "合作机会与渠道拓展", meaning: "事业主题偏向外部需求与合作渠道，机会的选择和资源如何投入会更突出", examples: ["接触新的客户、合作方或临时项目", "原有工作之外出现可以尝试的方向，同时需要权衡投入"] },
  比肩: { title: "自主推进与同辈协作", meaning: "事业主题偏向独立承担与平等协作，自己能够决定和负责的范围成为重点", examples: ["开始独立负责一项成果，或与同级伙伴共同推进事项", "工作接口重新划分，个人负责范围与团队安排需要衔接"] },
  劫财: { title: "团队分工与资源边界", meaning: "事业主题偏向同辈竞争与共同推进，任务、机会和资源怎样分配更容易成为议题", examples: ["团队成员、分工、项目份额或协作方式发生调整", "共同目标与个人诉求不完全一致，需要重新商定边界"] }
};
const WEALTH: Record<string, Topic> = {
  正官: { title: "履责所需的资源安排", meaning: "财务议题往往围绕已有职责展开，新增要求可能同时带来工具、资格或履约成本", examples: ["资质、工作工具或履约事项产生一笔需要安排的支出", "新增责任与工作回报是否匹配，成为协商的具体问题"] },
  七杀: { title: "任务压力下的投入取舍", meaning: "紧迫任务可能占用额外资源，时间、人力和开支之间的取舍更突出", examples: ["临时任务需要额外的人手、工具或时间投入", "几个目标同时需要资源，原有预算或安排出现挤压"] },
  正印: { title: "学习与能力建设投入", meaning: "财务主题偏向学习和能力建设，眼前兑现与长期积累之间会出现取舍", examples: ["课程、考试、工具或专业学习成为具体支出项目", "部分时间和资源转向长期积累，短期成果需要等待"] },
  偏印: { title: "专项工具与试验成本", meaning: "方法更新可能带来试用和学习成本，新的投入能否持续发挥作用成为问题", examples: ["研究、技能转换或新工具产生试验性投入", "原先购买的工具或服务，需要重新比较是否适合当前任务"] },
  食神: { title: "交付带来的兑现安排", meaning: "财务主题与连续产出相连，验收和结算是否跟上交付节奏会更突出", examples: ["产品或服务进入验收、结算，兑现条件需要进一步确认", "已有技能被用于持续服务，工作量与回报方式发生联系"] },
  伤官: { title: "专业输出与收入渠道", meaning: "财务主题与专业表达和成果转化相连，能展示什么与能兑现什么之间需要衔接", examples: ["作品、方案或专业服务成为洽谈合作的入口", "表达成果获得关注后，交付范围与结算办法成为新议题"] },
  正财: { title: "稳定兑现与日常预算", meaning: "财务重点偏向已有收入、固定支出与持续责任，日常收支的安排更具体", examples: ["固定收入、项目回款或日常预算进入重新核对的阶段", "长期责任带来持续的时间或资金投入"] },
  偏财: { title: "新渠道与弹性支出", meaning: "财务主题偏向新增合作与灵活资源，机会和额外投入可能一同出现", examples: ["额外项目、新客户或合作渠道带来新的兑现条件", "抓住新机会需要先投入资源，回报与投入的时间并不同步"] },
  比肩: { title: "独立投入与共同分摊", meaning: "自主事项和同辈合作可能同时占用资源，个人与共同投入之间需要分清", examples: ["独立项目开始占用更多时间或预算", "与伙伴共同承担成本，成果归属或分摊办法需要协商"] },
  劫财: { title: "合作份额与支出边界", meaning: "财务主题偏向共同资源的分配，人情往来与明确约定之间可能出现拉扯", examples: ["合作投入、份额、支出权限或退出安排需要重谈", "人情支持与需要结算的共同事项交织，责任边界变得重要"] }
};
const unique = <T>(items: readonly T[]) => [...new Set(items)];
const isClash = (interaction: Interaction) => interaction.fact.relationType === "branch_six_clash" || interaction.fact.relationType === "stem_clash";
const datePlus08 = (instant: string) => new Date(Date.parse(instant) + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);

function interactions(annual: string, revision: RevisionRecord): Interaction[] {
  return (["year", "month", "day"] as const).flatMap((position) => {
    const natal = revision.facts.pillars[position].ganZhi;
    // Only the exact binary year/month pair is retained. Placeholder slots never
    // enter evidence, so an unknown natal hour cannot influence these scenarios.
    return calculatePillarRelations({ year: annual, month: natal, day: annual, hour: natal }).facts
      .filter((fact) => fact.completeness === "binary" && fact.participants.length === 2 && RELATIONS[fact.relationType]
        && fact.participants.some((part) => part.position === "year") && fact.participants.some((part) => part.position === "month"))
      .map((fact) => ({ position, fact, text: `流年${annual}与本命${LABELS[position]}${natal}见${RELATIONS[fact.relationType]}；规则 ${fact.ruleId}（${fact.participants.map((part) => part.value).join("—")}）。` }));
  });
}

/** Modern event-topic interpretation; it neither reports events nor replays a node. */
export function buildAnnualEventScenarios(revision: RevisionRecord, preliminary: BaziPreliminaryAssessment, year: LocalAnnualYear): AnnualEventScenario[] {
  const input = revisionRecordSchema.parse(revision);
  const includeHour = input.input.timePrecision !== "unknown_hour" && input.input.timePrecision !== "date_only";
  if (preliminary.sourceBinding.revisionId !== input.id || preliminary.sourceBinding.chartResultHash !== input.manifest.resultHash
    || preliminary.sourceBinding.includeHour !== includeHour) throw new Error("年度情境与初判的源盘或时柱范围不匹配。");
  if (!year.transitNodeRef || !year.yearGanZhi || !year.startInstant || !year.endExclusiveInstant) return [];
  const ref = transitNodeRefSchema.parse(year.transitNodeRef);
  if (ref.revisionId !== input.id || ref.chartResultHash !== input.manifest.resultHash || ref.nodeType !== "year"
    || ref.startInstant !== year.startInstant) throw new Error("年度情境的流年引用与源盘或年度起点不匹配。");
  const start = Date.parse(year.startInstant), end = Date.parse(year.endExclusiveInstant);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error("年度情境缺少有效年度区间。");
  const birth = input.timeCalibration.utcInstant ? Date.parse(input.timeCalibration.utcInstant) : null;
  if ((birth !== null && end <= birth) || year.label === "暂不可判") return [];
  const expectedGanZhi = LunarUtil.JIA_ZI[((year.year - 1984) % 60 + 60) % 60];
  if (year.yearGanZhi !== expectedGanZhi) throw new Error("年度情境的年份与流年干支不匹配。");
  for (const segment of year.dayunSegments) {
    const segmentRef = transitNodeRefSchema.parse(segment.nodeRef);
    if (segmentRef.revisionId !== input.id || segmentRef.chartResultHash !== input.manifest.resultHash || segmentRef.nodeType !== "dayun"
      || segmentRef.ruleProfileDigest !== ref.ruleProfileDigest || segmentRef.luckCycleRuleDigest !== ref.luckCycleRuleDigest
      || segmentRef.timelineVersion !== ref.timelineVersion || segmentRef.startInstant !== segment.sourceStartInstant
      || segmentRef.manualDirection !== (segment.direction === "locked" ? null : segment.direction)) throw new Error("年度情境的大运分段引用不匹配。");
    const partStart = Date.parse(segment.startInstant), partEnd = Date.parse(segment.endExclusiveInstant);
    const sourceStart = Date.parse(segment.sourceStartInstant), sourceEnd = Date.parse(segment.sourceEndExclusiveInstant);
    if (![partStart, partEnd, sourceStart, sourceEnd].every(Number.isFinite) || partStart !== Math.max(start, sourceStart)
      || partEnd !== Math.min(end, sourceEnd) || partStart >= partEnd) throw new Error("年度情境的大运分段区间不匹配。");
  }
  const checkJudgment = (judgment: LocalOutlookJudgment | null, from: string, to: string) => {
    if (!judgment) return;
    if (judgment.version !== LOCAL_OUTLOOK_JUDGMENT_VERSION || judgment.policyVersion !== LOCAL_OUTLOOK_POLICY_VERSION
      || judgment.sourceBinding.revisionId !== input.id || judgment.sourceBinding.chartResultHash !== input.manifest.resultHash
      || judgment.sourceBinding.includeHour !== includeHour
      || JSON.stringify(transitNodeRefSchema.parse(judgment.targetRef)) !== JSON.stringify(ref)
      || judgment.interval.startInstant !== from || judgment.interval.endExclusiveInstant !== to) throw new Error("年度情境的综合判断源盘、时柱范围或区间不匹配。");
    for (const background of judgment.backgroundRefs) {
      if (!year.dayunSegments.some((segment) => JSON.stringify(transitNodeRefSchema.parse(segment.nodeRef)) === JSON.stringify(transitNodeRefSchema.parse(background)))) {
        throw new Error("年度情境的综合判断背景引用不匹配。");
      }
    }
  };
  checkJudgment(year.judgment, year.startInstant, year.endExclusiveInstant);
  checkJudgment(year.ownJudgment, year.startInstant, year.endExclusiveInstant);
  for (const segment of year.judgmentSegments) {
    if (Date.parse(segment.startInstant) < start || Date.parse(segment.endExclusiveInstant) > end || !(Date.parse(segment.startInstant) < Date.parse(segment.endExclusiveInstant))) throw new Error("年度情境的综合判断分段区间不匹配。");
    checkJudgment(segment.judgment, segment.startInstant, segment.endExclusiveInstant);
  }
  const god = canonicalizeStrengthTenGod((LunarUtil.SHI_SHEN as Record<string, string>)[`${input.facts.pillars.day.stem}${year.yearGanZhi[0]}`] ?? "");
  if (!CAREER[god]) throw new Error("年度情境无法识别流年十神。");
  const facts = interactions(year.yearGanZhi, input), dayFacts = facts.filter((fact) => fact.position === "day");
  const externalClashes = facts.filter((fact) => fact.position !== "day" && isClash(fact));
  const handoverDirections = unique(year.dayunSegments.map((segment) => segment.direction))
    .filter((direction) => year.dayunSegments.filter((segment) => segment.direction === direction).length > 1);
  const annualEvidence = `流年${year.yearGanZhi}天干对日主${input.facts.pillars.day.stem}为${god}；上游 LunarUtil.SHI_SHEN。`;
  const working = getWorkingBalance(preliminary);
  const natalEvidence = `本命月柱${input.facts.pillars.month.ganZhi}；${preliminary.pattern.headline}；当前扶抑判断${working.label}。`;
  const segmentEvidence = year.dayunSegments.map((segment) => `${segment.direction === "locked" ? "当前规则" : segment.direction === "forward" ? "若按顺行" : "若按逆行"}：${segment.ganZhi}大运（${segment.stemTenGod}）覆盖 ${segment.startInstant} 至 ${segment.endExclusiveInstant}；节点 ${segment.nodeRef.nodeId}。`);
  const context = annualEventContext(input, preliminary, year, god);
  const commonConditions = [
    "以下是传统命理初判经本地现代规则转译的可能情境，用来对照现实，不表示已经发生，也不提供发生概率。",
    ...context.conditions,
    ...(birth !== null && start < birth ? [`本年与出生区间相交，只解释 ${input.timeCalibration.utcInstant} 出生之后的部分。`] : []),
    ...(year.dayunStatus !== "resolved" ? ["大运顺逆或覆盖尚有条件；流年主题先单独成立，大运背景按下列分段分别阅读。"] : []),
    ...working.conditions
  ];
  const scenarios: AnnualEventScenario[] = [];
  const add = (domain: AnnualEventScenario["domain"], rule: string, base: Topic, evidence: string[], conditions: string[] = [], dayInteraction?: { branch: boolean; clash: boolean }) => {
    const { topic, rule: personalizedRule } = personalizeAnnualTopic(domain, base, context, dayInteraction);
    scenarios.push({
    id: `annual-event:${year.year}:${domain}:${rule}:${personalizedRule}`, domain, title: topic.title,
    summary: `${year.yearGanZhi}年见${god}，${topic.meaning}。`, examples: topic.examples,
    conditions: unique([...commonConditions, ...conditions]),
    evidence: [`触发规则 ${rule}；${ANNUAL_EVENT_SCENARIOS_VERSION}。`,
      `源修订 ${input.id}；结果 ${input.manifest.resultHash}；流年节点 ${ref.nodeId}；区间 ${year.startInstant} 至 ${year.endExclusiveInstant}。`,
      annualEvidence, natalEvidence, `情境选择 ${personalizedRule}；本项并未把整年总标签复制成该领域的吉凶。`,
      ...(year.judgment ? [`本年综合判断：${year.judgment.label}；${year.judgment.version}；${year.judgment.policyVersion}。`] : []), ...unique([...context.evidence, ...evidence])]
  }); };
  const careerFacts = facts.filter((fact) => fact.position !== "day");
  add("career", `stem-${god}`, CAREER[god]!, [...careerFacts.map((fact) => fact.text), ...segmentEvidence]);
  const wealthVisible = (["year", "month", ...(includeHour ? ["hour" as const] : [])] as const)
    .filter((position) => /^(正财|偏财)$/.test(canonicalizeStrengthTenGod(input.facts.pillars[position].stemTenGod)));
  const wealthTriggered = ["正财", "偏财", "食神", "比肩", "劫财", "正印"].includes(god) || wealthVisible.length > 0;
  if (wealthTriggered) add("wealth", `resources-${god}`, WEALTH[god]!, [
    ...wealthVisible.map((position) => `本命${input.facts.pillars[position].label}${input.facts.pillars[position].stem}为${canonicalizeStrengthTenGod(input.facts.pillars[position].stemTenGod)}。`), ...segmentEvidence
  ], [context.stage === "adult" ? "资源与收入情境仍需对应现实工作或合作；不据此推断收益额度或投资结果。"
    : context.stage === "unknown" ? "本项只对应现实日常或共同事项的资源安排，未假定本人收入、家庭供给或具体生活阶段。"
      : "本项先对应现实家庭、学习和日常资源安排；不假定本人已有工作或收入。"]);
  if (dayFacts.length) {
    const branchFacts = dayFacts.filter((fact) => fact.fact.relationType.startsWith("branch_"));
    const relationshipFacts = branchFacts.length ? branchFacts : dayFacts;
    const dayClashes = relationshipFacts.some(isClash), dayCombinations = relationshipFacts.some((fact) => !isClash(fact));
    add("relationship", dayClashes && dayCombinations ? "day-combine-and-clash" : dayClashes ? "day-clash" : "day-combination", {
      title: !branchFacts.length ? "个人取舍与合作协商" : dayClashes ? "关系约定与共同安排调整" : "共同计划与承诺落实",
      meaning: !branchFacts.length ? "流年作用于日干，个人意愿、角色和合作承诺之间的协调较突出"
        : dayClashes ? "流年触及日支，可对应亲近关系或长期合作中需要重新协调安排的情境" : "流年与日支有合的互动，可对应双方靠近共同目标、讨论承诺与共同计划的情境",
      examples: !branchFacts.length ? ["个人想法与合作方的期待需要对齐，自己的角色或承诺进入讨论", "面对新的邀约或职责，需要在自主安排与共同要求之间作取舍"]
        : dayClashes ? ["双方的时间安排或责任分工不再完全一致，原有约定需要调整", "一方工作或生活任务变化，牵动共同计划与相处节奏"] : ["共同生活、长期合作或一项需要双方承诺的计划进入讨论", "关系从表达意愿转向落实时间、责任和实际投入"]
    }, relationshipFacts.map((fact) => fact.text), [!branchFacts.length ? "本项只由日干互动触发，解读个人与协作议题；未据此推断婚恋或夫妻宫变化。" : "有相应关系或合作背景时才对照这些情境；合不保证关系确定，冲不等于分离或婚变。"], { branch: branchFacts.length > 0, clash: dayClashes });
  }
  if (handoverDirections.length || externalClashes.length) {
    const transitions = handoverDirections.flatMap((direction) => year.dayunSegments.filter((segment) => segment.direction === direction)
      .slice(1).map((segment) => `${direction === "locked" ? "" : direction === "forward" ? "若按顺行，" : "若按逆行，"}${datePlus08(segment.startInstant)}（UTC+08）转入${segment.ganZhi}大运`));
    add("change", handoverDirections.length ? "dayun-handover" : "natal-external-clash", {
      title: handoverDirections.length ? "交运前后的任务与生活安排" : "工作与生活节奏重排",
      meaning: handoverDirections.length ? "年内有大运背景切换，适合把前后任务和生活安排分段比较" : "流年与年月位置有冲的互动，可对应外部安排、工作接口或日常节奏需要调整的情境",
      examples: handoverDirections.length ? ["既有任务进入收尾，新职责或新的合作方式逐步接上", "工作与生活重心前后不同，原有计划需要分阶段安排"] : ["岗位接口、项目排期或协作安排出现需要重新衔接的变化", "若现实中已有地点变动，通勤、工作地点或居住安排会成为具体议题"]
    }, [...externalClashes.map((fact) => fact.text), ...segmentEvidence], [...transitions, "交运或冲只提供时间与互动背景；不单独断定换工作、搬家或事情好坏。"]);
  }
  if (scenarios.length === 1) {
    add("change", `method-${god}`, {
      title: god === "七杀" ? "任务优先级与应对节奏" : "方法更新与阶段安排",
      meaning: god === "七杀" ? "七杀的行动要求可对应任务变紧、需要调整应对方式的主题" : `${god}的主题可对应学习方法、表达方式或项目推进节奏的更新`,
      examples: god === "七杀" ? ["紧迫任务改变原定先后次序，部分事项需要延后", "任务难度超出现有安排，需要增加协助或缩小完成范围"] : ["原有方法遇到新要求，出现试用另一种做法的机会", "学习、提案或项目推进的阶段目标发生调整"]
    }, [], ["这一主题来自流年十神，不代表已检出环境突变、搬家或年内交运。"]);
  }
  return scenarios;
}
