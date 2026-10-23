import { revisionRecordSchema, type RevisionRecord, type PillarFact } from "@hakimi/contracts";
import { calculatePillarRelations, type RelationFact } from "@hakimi/relations-core";
import type { BaziPreliminaryAssessment, PreliminarySource } from "./preliminary-assessment";
import { buildNatalPatternDiagnosis, type NatalPatternDiagnosis } from "./natal-pattern-diagnosis";
import { OUTLOOK_CLASSICAL_SOURCES } from "./outlook-classical-sources";
import { NATAL_AUTHORITY_SOURCES } from "./natal-authority-sources";
import { NATAL_WEALTH_RESOURCE_SOURCES } from "./natal-wealth-resource-sources";
import { buildNatalUsefulGuidance, type NatalUsefulGuidance } from "./natal-useful-guidance";
import { canonicalizeStrengthTenGod, strengthTenGodGroup, type TenGodGroup } from "./strength-policy";
import { strengthElementForStem, strengthElementLabel, type PillarPosition } from "./strength-assessment-core";
import { getWorkingBalance } from "./structural-strength-assessment";
import { buildNatalRelationshipFoundation } from "./natal-relationship-foundation";
import { NATAL_PATTERN_PATH_VERSION } from "./natal-pattern-path";
import { NATAL_READING_RULE_APPLICATIONS_VERSION, NATAL_READING_PROVENANCE_LIMIT, type NatalReadingRuleApplication } from "./natal-reading-rule-application";

export const BAZI_COMPREHENSIVE_READING_VERSION = "hakimi.bazi-comprehensive-reading/0.15.0" as const;
export type BaziComprehensiveChapterId = "overview" | "structure" | "useful_elements" | "personality" | "career" | "wealth" | "relationships" | "family" | "development";
export interface BaziComprehensiveChapter {
  id: BaziComprehensiveChapterId;
  title: string;
  headline: string;
  verdict: string;
  paragraphs: string[];
  strengths: string[];
  cautions: string[];
  suggestions: string[];
  evidence: string[];
  sourceIds: string[];
  ruleApplications?: NatalReadingRuleApplication[];
}
export interface BaziComprehensiveReading {
  version: typeof BAZI_COMPREHENSIVE_READING_VERSION;
  sourceBinding: { revisionId: string; chartResultHash: string; includeHour: boolean };
  title: string;
  summary: string;
  chapters: BaziComprehensiveChapter[];
  limitations: string[];
  sources?: PreliminarySource[];
  patternDiagnosis?: NatalPatternDiagnosis;
  usefulGuidance?: NatalUsefulGuidance;
  relationshipFoundation?: ReturnType<typeof buildNatalRelationshipFoundation>;
  ruleApplicationsVersion?: typeof NATAL_READING_RULE_APPLICATIONS_VERSION;
}

type Occurrence = { position: PillarPosition; pillar: PillarFact; stem: string; god: string; group: TenGodGroup; visible: boolean };
type Context = {
  revision: RevisionRecord; preliminary: BaziPreliminaryAssessment; includeHour: boolean;
  working: ReturnType<typeof getWorkingBalance>;
  positions: PillarPosition[]; occurrences: Occurrence[]; relations: RelationFact[];
};
const ORDER: PillarPosition[] = ["year", "month", "day", "hour"];
const LABELS: Record<PillarPosition, string> = { year: "年柱", month: "月柱", day: "日柱", hour: "时柱" };
const GROUP_LABELS: Record<TenGodGroup, string> = { peer: "比劫", resource: "印星", output: "食伤", wealth: "财星", authority: "官杀" };
const WORK_FOCUS: Record<TenGodGroup, string> = { peer: "自主", resource: "理解", output: "表达", wealth: "实效", authority: "标准" };
const CLOSE_FOCUS: Record<TenGodGroup, string> = { peer: "尊重", resource: "支持", output: "沟通", wealth: "行动", authority: "承诺" };
const GROUP_THEMES: Record<TenGodGroup, string> = {
  peer: "自主决定、同辈协作与边界", resource: "学习理解、支持资源与积累",
  output: "表达方法、作品与实际交付", wealth: "资源安排、成果兑现与现实责任", authority: "规则、责任与行动要求"
};
// Editorial synthesis: these describe possible everyday expressions of the
// computed roles. They are not a second set of calculation weights.
const LIFE: Record<TenGodGroup, { motive: string; work: string; need: string; strength: string; risk: string; action: string }> = {
  peer: { motive: "自己作主", work: "先形成自己的判断，再决定怎样与人合作", need: "保留决定空间，也在意合作是否对等", strength: "独立推进和同辈协作", risk: "意见不同时先守立场，事情可能卡在谁来决定", action: "把共同决定与各自负责的事项分开，让自主与合作同时有位置" },
  resource: { motive: "先弄明白", work: "理解依据、准备充分，再进入行动", need: "得到理解、解释与稳定支持", strength: "吸收知识和整理经验", risk: "不断补充准备，却迟迟没有拿出可检验的成果", action: "为准备设置一个终点，交出小成果后再决定还需补什么" },
  output: { motive: "把想法做出来", work: "通过讲清问题、改进方法和持续产出来证明价值", need: "沟通畅通，想法能被听见", strength: "表达、解决问题与实际交付", risk: "表达太快时，容易遗漏对方需要时间消化的部分", action: "先听完整个问题，再给一个清楚可行的回应" },
  wealth: { motive: "把事情办成", work: "关注事情是否有效，时间和资源是否值得投入", need: "看到实际投入和可靠的生活安排", strength: "结果意识和资源统筹", risk: "容易把效率标准带入亲近关系，忽略情绪回应", action: "用能兑现的行动表达重视，也给对方说明感受的时间" },
  authority: { motive: "把责任落实", work: "用标准、约定和完成情况交代责任", need: "明确的承诺、责任和可预期的节奏", strength: "标准感和责任意识", risk: "把不同节奏理解成不负责任，容易提高对彼此的要求", action: "提前讲清哪些承诺必须做到，哪些安排可以商量调整" }
};
const RELATION_LABELS: Partial<Record<RelationFact["relationType"], string>> = {
  stem_five_combination: "天干五合", stem_clash: "天干冲", branch_six_combination: "地支六合", branch_six_clash: "地支六冲"
};
const unique = <T>(items: readonly T[]): T[] => [...new Set(items)];
const groupOf = (god: string): TenGodGroup => {
  const group = strengthTenGodGroup(canonicalizeStrengthTenGod(god));
  if (!group) throw new Error("综合解读包含无法识别的十神事实。");
  return group;
};
const where = (item: Occurrence) => `${LABELS[item.position]}${item.visible ? "透" : "藏"}${item.stem}（${item.god}）`;
const inGroup = (c: Context, group: TenGodGroup, visible?: boolean) => c.occurrences.filter((item) => item.group === group && (visible === undefined || item.visible === visible));
const hasVisible = (c: Context, group: TenGodGroup) => inGroup(c, group, true).length > 0;
const pillarEvidence = (c: Context, position: PillarPosition) => {
  const pillar = c.revision.facts.pillars[position];
  return `${LABELS[position]}${pillar.ganZhi}：${position === "day" ? `日主${pillar.stem}` : `透${pillar.stem}为${canonicalizeStrengthTenGod(pillar.stemTenGod)}`}；藏${pillar.hiddenStems.map((stem, index) => `${stem}（${canonicalizeStrengthTenGod(pillar.branchTenGods[index]!)}）`).join("、")}。`;
};
const groupEvidence = (c: Context, group: TenGodGroup) => {
  const items = inGroup(c, group);
  return items.length ? items.map(where).join("、") + "。" : `所选${c.includeHour ? "四" : "三"}柱未见${GROUP_LABELS[group]}透藏。`;
};
const groupNarrative = (c: Context, group: TenGodGroup) => {
  const shown = inGroup(c, group, true), hidden = inGroup(c, group, false);
  if (shown.length) return `${shown.map(where).join("、")}，使${LIFE[group].strength}更直接进入做事方式；${hidden.length ? `支内${hidden.map(where).join("、")}提供了相应的承接线索` : "支内缺少同类藏干，发挥时更依赖外部条件与持续训练"}。`;
  return hidden.length ? `${GROUP_LABELS[group]}藏于${hidden.map(where).join("、")}。${LIFE[group].strength}更需要合适的任务和环境带动，而不是一开始就表现得很外显。`
    : `${GROUP_LABELS[group]}在所选柱中不显，${LIFE[group].strength}宜通过实际训练和协作逐步建立。`;
};
const relationEvidence = (fact: RelationFact) => `${fact.participants.map((part) => `${LABELS[part.position]}${part.ganZhi}的${part.value}`).join("与")}见${RELATION_LABELS[fact.relationType]}；规则 ${fact.ruleId}；事实 ${fact.id}。`;
const touches = (fact: RelationFact, position: PillarPosition) => fact.participants.some((part) => part.position === position);
const isClash = (fact: RelationFact) => fact.relationType === "stem_clash" || fact.relationType === "branch_six_clash";
const relationsFor = (c: Context, positions: PillarPosition[]) => c.relations.filter((fact) => positions.some((position) => touches(fact, position)));
const relationSummary = (c: Context, positions: PillarPosition[], focus: string) => {
  const facts = relationsFor(c, positions), clashes = facts.filter(isClash), combinations = facts.filter((fact) => !isClash(fact));
  const detail = facts.slice(0, 3).map((fact) => `${fact.participants.map((part) => `${LABELS[part.position]}${part.value}`).join("与")}${RELATION_LABELS[fact.relationType]}`).join("；");
  return facts.length
    ? `${detail}。${clashes.length && combinations.length ? `${focus}既想靠近共同目标，也需要调整各自节奏；事情变化时，先重谈安排，比要求对方一切照旧更有帮助` : clashes.length ? `${focus}容易出现不同需求同时拉扯的情境，适合给变化留余地，把分歧拆成可以逐项解决的事情` : `${focus}重在共同安排和协作承诺；靠近之后，仍需保留各自能决定的空间`}。`
    : `${focus}以已有位置和十神配合为主：先建立稳定的习惯，再根据实际反馈调整。`;
};
const pace = (c: Context) => c.working.focus === "wealth_after_output" ? "把已有产出接上验收、经营与兑现，不只继续增加表达"
  : c.working.focus === "wealth_moderates_resource" ? "用实际用途筛选准备和投入，让财裁印而保留必要支持"
  : c.working.focus === "output_after_resource" ? "让已有知识和支持转成可见成果，先落实一个稳定输出的出口"
  : c.working.focus === "rooted_peer_mixed_authority" ? "先把财的投入与正官职责、七杀压力分别配好"
  : c.working.direction === "conditional" ? "按已知支点分别安排投入与职责，保留未决的承接条件"
  : c.working.direction === "support"
  ? "先补承接能力，再增加任务和资源规模"
  : c.working.direction === "drain" ? "把现有力量用到产出、履责和兑现，减少同类堆积" : "在投入、产出和恢复之间保持可调整的比例";
const basis = (c: Context) => `当前工作判断：${c.working.label}；规则${c.working.ruleId}。原计权对照为${c.preliminary.balance.label}，支持侧${c.preliminary.balance.supportWeight}、泄耗克侧${c.preliminary.balance.demandWeight}；原计数不替代结构作用，也不是能力或人生分数。`;
const candidate = (c: Context, id: string) => c.preliminary.pattern.candidates.find((item) => item.id === id);
const positionGroup = (c: Context, position: PillarPosition) => groupOf(position === "day"
  ? c.revision.facts.pillars.day.branchTenGods[0]! : c.revision.facts.pillars[position].stemTenGod);

function everydayTension(c: Context): string {
  if (c.occurrences.some((item) => item.visible && item.god === "伤官") && inGroup(c, "authority").length) {
    return "这组配合容易表现为：很快看出问题，也敢于提出改法，同时又希望责任和承诺有交代。说话的锋芒与做事的责任感会同时出现；先讲共同目标，再讲哪里需要改，往往更容易把意见变成推进事情的力量。";
  }
  if ((hasVisible(c, "peer") || groupOf(c.preliminary.pattern.monthMainTenGod) === "peer") && inGroup(c, "wealth").length) {
    return "本盘既在意自己能作主，也在意事情最后有没有实际成果。合作顺畅时，这能成为主动推进的动力；分歧出现时，容易同时争论方法、决定权和资源分配。先定共同成果，再分别讨论怎么做和谁负责，能减少这些问题纠缠在一起。";
  }
  if (inGroup(c, "resource").length && inGroup(c, "output").length) {
    return "本盘有理解积累与表达应用两种需要。准备能提高质量，但准备过久也会压住行动；把所学先做成一个小成果，用实际反馈再补知识，比一直等待完全准备好更容易形成进步。";
  }
  const outer = positionGroup(c, "month"), inner = positionGroup(c, "day");
  return outer === inner ? `外部做事与日常相处都围绕“${LIFE[outer].motive}”，习惯容易保持一致；需要留意${LIFE[outer].risk}。`
    : `对外更倾向${LIFE[outer].work}，贴近日常时却更需要${LIFE[inner].need}。两种需要并不矛盾，关键是让别人知道：办事时的标准与亲近时希望得到的回应可能不同。`;
}

type CareerRoute = { id: string; name: string; reason: string; mechanism: string; resourceLink: string; risk: string; action: string };
function careerRoute(c: Context, diagnosis: NatalPatternDiagnosis): CareerRoute {
  const pathId = diagnosis.primaryPathId, monthRole = diagnosis.monthCommandRole;
  if (pathId === "resource-wealth") return { id: "resource-wealth", name: "以实际用途调节积累与投入", reason: "印当令、两处印透根与自身另有本气根，已透有根的财提供裁抑过多印投入的支点",
    mechanism: "本盘更需要把已经具备的知识和支持用在一个明确需求上。先确定要解决什么、做到哪一步，再筛选必要的资料、训练和工具；避免准备不断加层，却迟迟没有进入实际使用。这里的裁印是让支持适量，不是跳过学习或把所有准备都否定。",
    resourceLink: "财在这条路径中先用于调节投入。时间、费用和可用工具要能回答正在支持哪项具体用途，已有支持才能与现实安排配合；扩大经营规模并不是裁印已经有效的证明。",
    risk: "财承担调节任务，但财受合克时仍有牵连；不能把印旺用财理解成财越多越好", action: "先列一项实际需求和必要准备，为暂时用不上的投入设定停止或延后条件" };
  if (["peer-output-wealth", "wealth-food", "food-wealth", "hurting-wealth"].includes(pathId)) {
    const outputGods = unique(inGroup(c, "output", true).map((item) => item.god));
    const hiddenMonthOutput = !outputGods.length && c.preliminary.pattern.family === "output" ? c.preliminary.pattern : null;
    const food = (outputGods.includes("食神") || hiddenMonthOutput?.monthMainTenGod === "食神") && !outputGods.includes("伤官");
    const both = outputGods.includes("食神") && outputGods.includes("伤官");
    if (both) return { id: "mixed-output-wealth", name: "稳定交付与改进兑现", reason: "食神、伤官与财星均有实际透干，稳定产出与改进方法都进入资源联系",
      mechanism: "本盘同时有把事情做熟与把办法改好的线索，两种输出不必互相取代。先保持已经有效的质量和节奏，再为明确的问题试新方法；若每次都重做，积累难以留下，若从不调整，改进线索也难发挥。",
      resourceLink: "资源联系需要分清已经可以重复交付的部分，与仍需试验和验证的部分，不让尚未完成的改进挤占已经答应的成果。",
      risk: "食神与伤官并透不能自动合并成更强的优势，稳定与改进的节奏仍要分别安排。", action: "分别列出可以稳定完成的成果和需要验证的改进，让两者各有时间" };
    return { id: food ? "food-wealth" : "hurting-wealth", name: food ? "稳定产出与成果兑现" : "技能交付与成果兑现",
      reason: hiddenMonthOutput ? `月令主气${hiddenMonthOutput.monthMainStem}${hiddenMonthOutput.monthMainTenGod}与实际透出的财星配合，产出与资源之间有可辨的连接；${hiddenMonthOutput.monthMainTenGod}仍在藏干层` : `${food ? "食神" : "伤官"}与财星实际透出，产出与资源之间有可辨的连接`,
      mechanism: food ? "这条路径重在把方法做熟、把成品做稳，让同一份能力可以连续使用。生活中的对应情境是：别人需要的不只是一次漂亮表现，还包括下次能否按相近标准完成；质量、节奏与持续性共同构成价值。"
        : "这条路径重在发现原办法的不足，提出更有效的解法，再让改进变成可验收的成果。生活中的对应情境是：能说出问题还不够，必须让接受意见的人看见改变后解决了什么，表达才会转成合作机会。",
      resourceLink: food ? "资源更适合围绕可重复的成品、服务或方法形成连续联系，核心是做稳一件事之后能否再次交付。"
        : "资源连接在改进和解决问题之后：先说明问题值不值得解决，再展示成果，最后才讨论投入与回报如何分配。",
      risk: food ? "连续产出容易变成连续承担，日主需要支持时，维持质量比不断加量更关键。" : "表达、接单和收益不是同一步，交付能力不足时，机会也会增加消耗",
      action: food ? "先稳定一项成果的质量和交付周期，再决定能增加多少任务" : "把一个可交付成果、验收标准和回款安排连在一起，再扩展任务" };
  }
  if (pathId === "official-resource") return { id: "official-resource", name: "专业积累与责任承接", reason: monthRole ? `月令主气${monthRole.stem}正官与实际透出的印星配合，明确的职责要求与学习支持构成待配合的路径；正官仍在藏干层` : "正官和印星透出，明确的职责要求与学习支持构成待配合的路径",
    mechanism: "本盘的着力点是把要求弄清、把依据学透，再用稳定完成情况建立信任。相比不断证明自己敢承担，更有价值的是能解释为什么这样做，并在相同要求下反复做对；职责、训练与反馈需要连成一条线。",
    resourceLink: "资源议题宜先接在专业能力和职责完成之后：支持是否足够、成果是否得到认可，是比单独追求经营规模更靠前的环节。",
    risk: "资格和责任增加不等于承接已经充足，仍要看支持能否落实", action: "优先积累可验证的专业成果，并给新责任配套时间、权限和支持" };
  if (pathId === "killings-resource") return { id: "killing-resource", name: "压力转化与专业承接", reason: monthRole ? `月令主气${monthRole.stem}七杀与实际透出的印星配合，紧迫要求与理解、方法之间存在转化线索；七杀仍在藏干层` : "七杀和印星透出，紧迫要求与理解、方法之间存在转化线索",
    mechanism: "本盘更值得培养的是面对陌生或紧迫问题时，先找到处理框架，再决定怎样接手。这里的长处不在永远扛得住，而在能否把压力翻译为步骤、工具和边界；只有要求、没有解释和支持时，这条路径会更费力。",
    resourceLink: "资源应先用于缩小不确定性：找到方法、补齐信息与获得配合，再讨论扩大承担。把紧急任务都接下来，并不能替代真正可持续的资源来源。",
    risk: "七杀与印同现只是路径线索，不能当作压力已化解；印的支持必须能接到实际任务上", action: "面对急难事项先确认处理方法、支援者和停止条件，再承诺范围" };
  if (pathId === "food-killings") return { id: "food-killing", name: "解决难题与方法交付", reason: monthRole ? `月令主气${monthRole.stem}七杀与实际透出的食神配合，稳定方法回应紧迫要求的支点已见；七杀仍在藏干层，是否有效还取决于食神有无受制、根气与轻重` : "食神与七杀透出，稳定方法回应紧迫要求的支点已见，是否有效还取决于食神有无受制",
    mechanism: "这里的输出有明确对象：把难点拆开，让可重复的方法处理原本只能硬扛的要求。生活中的对应情境是，事情越急，越需要保留测试、核对和完成一个步骤的时间；只增加速度却破坏方法，反而会失去本盘这条配合的支点。",
    resourceLink: "资源更先用于保证解决难题的条件，而非一开始就扩大经营。方法能否稳定减轻任务负担，是成果获得认可前需要先验证的一环。",
    risk: "有方法线索不等于压力已被制住，过量任务仍可能打断产出", action: "先解决一个明确难点，用可复用流程替代不断加班应对" };
  if (pathId === "hurting-resource") return { id: "hurting-resource", name: "依据校正与表达应用", reason: "伤官与印星有实际配合，改进意见可由知识依据校正",
    mechanism: "本盘不只需要敢提出不同看法，还需要把看法讲得有依据。表达与学习的配合，适合落在解释复杂问题、整理经验、验证新办法这些环节；知识若只用来反复否定自己的想法，输出会被压住，表达若绕开事实又容易失去支撑。",
    resourceLink: "先让解释和方法成为别人可理解、可复用的成果，再建立资源联系；单纯掌握更多材料，未必能自动变成可兑现的价值。",
    risk: "准备过多会压住输出，表达过快也可能失去依据", action: "把一条改进意见连同依据和小范围验证结果一起交出" };
  if (pathId === "resource-output") return { id: "resource-output", name: "知识转化与表达应用", reason: "印格背景与食伤有实际配合，已有积累需要通过应用形成出口",
    mechanism: "本盘的重点不是再累积一层准备，而是让已经理解的东西被用起来。生活中的对应情境是：把资料整理为说明，把经验做成方法，把学会的东西教清或做出来；真正的进展来自知识能否离开准备阶段进入使用。",
    resourceLink: "资源联系更容易从知识的使用价值展开：成果是否让别人少走一步、少费一份力，比材料有多少更能检验这条路径。",
    risk: "准备过多会压住输出，表达过快也可能失去依据", action: "每次学习都配一个小成果，用反馈决定下一轮补充什么" };
  if (pathId === "official-wealth") return { id: "wealth-official", name: "资源统筹与规则履责", reason: monthRole ? `月令主气${monthRole.stem}正官与实际透出的财星配合，资源安排和责任要求形成联系；正官仍在藏干层` : "财星与官星透出，资源安排和责任要求同时显现", mechanism: "本盘需要把资源与职责一起考虑：手里有多少条件、承担多大责任、谁能决定怎样使用，彼此需要对应。只重结果而忽略规则，或只接受责任却拿不到资源，都会使这条路径难以连续。", resourceLink: "经营对象同时带来责任，衡量资源时需要一并看后续维护、协作与交付要求，而不是只看表面规模。", risk: "资源越多未必越轻松，预算与责任要一起核算", action: "在承接项目之前写清预算、决策权限和交付责任" };
  const month = groupOf(c.preliminary.pattern.monthMainTenGod);
  const routes: Record<TenGodGroup, { name: string; action: string; risk: string }> = {
    peer: { name: hasVisible(c, "wealth") ? "自主推进与合作经营" : "独立推进与同辈协作", action: "先明确自己负责的成果，再约定合作分工", risk: "自主性与协作可以并存，但意见和资源分配需要落到规则" },
    resource: { name: "学习积累与专业支持", action: "把知识、工具或支持整理成能实际使用的工作方法", risk: "积累本身不是交付，需要安排应用出口" },
    output: { name: "技能表达与稳定产出", action: "建立连续产出的节奏，并用真实反馈校正方法", risk: "只有表达而无验收机制，成果容易停留在想法层面" },
    wealth: { name: "资源管理与成果经营", action: "围绕可控资源设定一个清晰的完成目标", risk: "见财只是经营对象显现，不等于收益已经得到" },
    authority: { name: "专业履责与任务治理", action: "将外部要求拆为有优先级和资源支持的任务", risk: "只接受要求而缺少自主安排，容易形成持续被动" }
  };
  const fallback: Record<TenGodGroup, string> = {
    peer: hasVisible(c, "wealth") && !hasVisible(c, "output") ? "本盘自主与资源主题已经外显，食伤却未透出。现在更需要补上从想法到成果的中间环节：有主见、有对象，也还要让别人看见方法和成品，才能减少只围绕决定权反复讨论。" : "本盘先从自己的判断和同辈协作发力。比较有用的能力是把不同意见整理成分工，让每个人知道自己完成什么；自主不能只停在不愿被安排，还要能拿出可交付的部分。",
    resource: "本盘以理解和积累为起点，适合先弄清问题的来龙去脉。发挥的关键是准备有没有被真正使用：资料能帮助选择、方法能帮助完成，支持才不只是停留在想法中。",
    output: "本盘以表达和产出为起点，适合把复杂想法整理成别人能使用的形式。接下来的重点是明确谁需要这份成果、怎样确认完成，避免不断输出却找不到实际承接。",
    wealth: "本盘以现实事务和资源安排为起点，容易把注意力放在事情是否有用。更完整的发挥是同时看清投入、维护与完成标准，让效率和质量彼此支持。",
    authority: "本盘以责任和要求为起点，明确标准能够帮助组织行动。发挥关键在于要求是否可理解、可安排；把责任拆成能完成的步骤，比单纯提高对自己的要求更能形成稳定性。"
  };
  return { ...routes[month], id: `${month}-background`, mechanism: fallback[month], resourceLink: `${routes[month].name}先形成可观察的成果，再连接资源；本版尚未以透干认出更具体的兑现组合。`, reason: `${c.preliminary.pattern.background}构成起点，${LABELS.month}${c.revision.facts.pillars.month.stem}的${canonicalizeStrengthTenGod(c.revision.facts.pillars.month.stemTenGod)}使${GROUP_THEMES[positionGroup(c, "month")]}更直接显现` };
}

function supportReading(c: Context): string {
  const shown = inGroup(c, "resource", true), concealed = inGroup(c, "resource", false);
  const places = unique((shown.length ? shown : concealed).map((item) => LABELS[item.position])).join("、");
  const location = shown.length ? `印星透在${places}，学习、解释或方法支持是本盘可直接展开的主题` : concealed.length ? `印星只藏在${places}，支持议题在盘里有线索，却没有透在表面` : "已知柱中未见印星，当前不能直接指定由哪一处提供学习或方法支持";
  const condition = shown.length ? "重点是把理解变成实际可调用的方法，而非只得到一番认可" : concealed.length ? "所需帮助更要说具体：缺哪一步知识、哪项工具、哪段时间，不能把潜在支持当作已经有人接手" : "可先从任务本身列出知识、工具和协作缺口，再在现实中逐项建立";
  return `${location}。${condition}。${c.working.focus === "wealth_moderates_resource" ? "本盘已有两处印透根及自身本气根，当前更需要筛选支持的用途，让财对过多投入作调节；仍保留必要基础，不把印整体列为忌，也不机械追加食伤泄耗。" : c.working.focus === "wealth_after_output" ? "本盘已经有产出与自身承接，支持更应帮助已有成果得到验收和回报，而非继续叠加准备或表达。" : c.working.direction === "conditional" ? "自身根气与现实任务都有具体支点，新增帮助应对准正在承担的职责或压力，支持的用途比一概增加准备更重要。" : c.working.direction === "support" ? "当前判断需要生扶，这一环节应先于增加任务；支持到位后再扩大承诺，优点才不容易变成持续消耗。" : c.working.direction === "drain" ? "当前判断更需要输出，已有理解应转成自己能完成的成果；继续增加准备未必是最需要的一步。" : "当前判断相对中和，支持宜围绕具体卡点进入，用到问题解决即可，不必让准备取代行动。"}`;
}

function capacityReading(c: Context, route: CareerRoute): string {
  if (c.working.focus === "wealth_moderates_resource") return "印当令又两处透根，自身另有本气根，本次取用不再以增加支持为先。已透有根的财用于裁抑过多印的投入，让知识、方法和协助按实际用途发挥；财与印若有相合或受克，调节便带有条件，不能把有财直接写成已经完成制印。";
  if (c.working.focus === "rooted_peer_mixed_authority") {
    const names = (gods: string[]) => unique(c.occurrences.filter((item) => item.visible && gods.includes(item.god)).map((item) => `${item.stem}${item.god}`)).join("、");
    return `月令比劫与别支同类本气根提供自身承接，${names(["正财", "偏财"])}也已透有根。${names(["正官"])}侧重明确职责与完成标准，${names(["七杀"])}侧重紧迫要求与制约，两种要求需要分别安排；财的投入可以支持职责，也会增加杀的负担。当前先分清一项资源投入究竟在完成哪项责任、同时增加了什么压力，再决定承担范围；原有合冲与根气条件继续保留。`;
  }
  if (c.working.focus === "wealth_after_output") return "本盘自身根气与透出的同类提供了承接，食神的产出也已明显；当前重点是把已有成果接到明确的需求、验收与回报安排。继续增加表达或任务数量，不一定解决兑现环节的问题，先让一条从完成到确认的路径顺畅起来。";
  if (c.working.focus === "output_after_resource") return "本盘印的支持与自身根气分别有据，已有的理解、经验或帮助需要落成可用成果。发展重点是从准备进入应用：选定一个能实际完成、能得到反馈的输出出口，而不是把更多资料继续堆在准备阶段。";
  if (c.working.direction === "support") return `本盘不是缺少${route.id === "food-killing" ? "回应要求的办法" : route.id === "official-resource" || route.id === "killing-resource" ? "承担责任的方向" : "产出或经营的方向"}，当前更费力的是持续承接。任务增加时，${route.id === "food-wealth" ? "重复交付会持续消耗时间与精力，不能因为做得稳定就默认还能无限加量" : route.id === "food-killing" ? "解决难题的方法也需要完整的执行时间，接下更多急件可能让原本有效的步骤失去空间" : "需要的知识、协助和恢复也要同步增加"}；因此先做稳有边界的一段，比同时维持许多目标更合适。`;
  if (c.working.direction === "drain") return `本盘已有较多承接来源，关键在力量有没有流向成果。${hasVisible(c, "output") ? "食伤已有透出，可以把想法落成作品、方法或解决方案，持续交付比继续证明自己有能力更重要" : "食伤未透，不能把有主见直接当成已有输出通道；先做出一个别人能用的结果，能补上自主与兑现之间的环节"}。`;
  if (c.working.direction === "conditional") return "当前承接与任务之间仍有未决条件；先按已见用字和实际分工判断每项投入的作用，再决定增加支持还是调整要求。";
  return `本盘相对中和，${route.id === "hurting-wealth" ? "问题不在一味增加表达或一味压住表达，而在改进、交付与现实需求是否同频" : "发挥不宜只押在增加支持或增加任务一端，重点是各环节是否互相接住"}。能把范围、完成标准和兑现顺序连起来时，这条路径更容易连续；任一环节过快，都可能让其余部分跟不上。`;
}

function outputPositionReading(c: Context): string {
  const visible = inGroup(c, "output", true), concealed = inGroup(c, "output", false);
  if (c.working.focus === "wealth_moderates_resource") return `${concealed.length ? `食伤仅见于${unique(concealed.map((item) => LABELS[item.position])).join("、")}藏干层` : "所选柱未见食伤透藏"}，本次未把它们冒充已经透出的泄秀出口。当前明确的是财对印的调节，现实中的应用与完成仍可练习，不据此另列所有食伤为喜。`;
  if (!visible.length) return concealed.length ? `食伤留在${unique(concealed.map((item) => LABELS[item.position])).join("、")}藏干层，输出通道需要用具体任务带出来。知道怎样做与让别人看见成果之间，还有一次实际表达、演示或交付。` : "已知柱未见食伤透藏，当前主线不以现成表达优势为前提；先从已有责任或资源中选一个问题，练习把完成过程讲清楚。";
  const scenes: Record<PillarPosition, string> = { year: "与外部交流、分享经验的议题相接", month: "与眼前任务、方法选择的议题相接", day: "与日常表达的议题相接", hour: "与长期打磨、整理成果的议题相接" };
  return `${visible.map((item) => `${where(item)}，${scenes[item.position]}`).join("；")}。${visible.some((item) => item.god === "食神") && visible.some((item) => item.god === "伤官") ? "稳定做成和主动改进两种方式都在，不必把每一次重复都当作停滞，也不必每次都推翻旧方法。" : visible.some((item) => item.god === "食神") ? "更可取的发挥是把一次经验整理为可以重复完成的步骤，让成品质量有连续性。" : "更可取的发挥是把发现的问题连同改法一起说清，让批评变成有验收标准的提案。"}`;
}

function createContext(revision: RevisionRecord, preliminary: BaziPreliminaryAssessment): Context {
  const parsed = revisionRecordSchema.parse(revision);
  const includeHour = parsed.input.timePrecision !== "unknown_hour" && parsed.input.timePrecision !== "date_only";
  if (preliminary.sourceBinding.revisionId !== parsed.id || preliminary.sourceBinding.chartResultHash !== parsed.manifest.resultHash
    || preliminary.sourceBinding.includeHour !== includeHour) throw new Error("综合解读与初判的修订、结果哈希或时柱范围不匹配。");
  if (preliminary.balance.dayMasterElement !== strengthElementForStem(parsed.facts.pillars.day.stem)
    || preliminary.pattern.monthMainStem !== parsed.facts.pillars.month.hiddenStems[0]) throw new Error("综合解读与初判的日主或月令事实不匹配。");
  const positions = ORDER.filter((position) => includeHour || position !== "hour");
  const occurrences: Occurrence[] = [];
  for (const position of positions) {
    const pillar = parsed.facts.pillars[position];
    if (pillar.name !== position || pillar.ganZhi !== pillar.stem + pillar.branch || !pillar.hiddenStems.length || pillar.hiddenStems.length !== pillar.branchTenGods.length) throw new Error("综合解读的四柱或透藏事实没有一一对应。");
    if (position !== "day") occurrences.push({ position, pillar, stem: pillar.stem, god: canonicalizeStrengthTenGod(pillar.stemTenGod), group: groupOf(pillar.stemTenGod), visible: true });
    pillar.hiddenStems.forEach((stem, index) => occurrences.push({ position, pillar, stem, god: canonicalizeStrengthTenGod(pillar.branchTenGods[index]!), group: groupOf(pillar.branchTenGods[index]!), visible: false }));
  }
  const pillars = parsed.facts.pillars;
  // The relation engine takes four positions. Unknown-hour input uses a public
  // day-pillar placeholder; every retained binary fact must exclude that slot.
  const relations = calculatePillarRelations({ year: pillars.year.ganZhi, month: pillars.month.ganZhi, day: pillars.day.ganZhi,
    hour: includeHour ? pillars.hour.ganZhi : pillars.day.ganZhi }).facts.filter((fact) => fact.completeness === "binary"
      && RELATION_LABELS[fact.relationType] && fact.participants.every((part) => positions.includes(part.position)));
  return { revision: parsed, preliminary, includeHour, positions, occurrences, relations, working: getWorkingBalance(preliminary) };
}

/** Local synthesis of the supplied chart facts and bound preliminary axes. */
export function buildBaziComprehensiveReading(revision: RevisionRecord, preliminary: BaziPreliminaryAssessment): BaziComprehensiveReading {
  const c = createContext(revision, preliminary), p = c.preliminary, working = c.working, pillars = c.revision.facts.pillars;
  const diagnosis = buildNatalPatternDiagnosis(c.revision, p);
  const guidance = buildNatalUsefulGuidance(c.revision, p, diagnosis);
  const rootedMixedAuthority = working.focus === "rooted_peer_mixed_authority";
  const wealthResourceAnswer = Boolean(diagnosis.wealthResourceTask.preferredPathId);
  const relationshipFoundation = buildNatalRelationshipFoundation(c.revision, p);
  const route = careerRoute(c, diagnosis), chapters: BaziComprehensiveChapter[] = [];
  const monthGroup = groupOf(p.pattern.monthMainTenGod), monthVisibleGroup = positionGroup(c, "month"), dayGroup = positionGroup(c, "day");
  const sources = [...new Map([
    ...OUTLOOK_CLASSICAL_SOURCES.filter((source) => diagnosis.sourceIds.includes(source.id) || guidance.sourceIds.includes(source.id)),
    ...NATAL_AUTHORITY_SOURCES.filter((source) => diagnosis.sourceIds.includes(source.id)),
    ...NATAL_WEALTH_RESOURCE_SOURCES.filter((source) => diagnosis.sourceIds.includes(source.id)),
    ...relationshipFoundation.sources
  ].map((source) => [source.id, source])).values()];
  const sourceIds = new Set([...p.sources, ...sources].map((source) => source.id));
  const add = (chapter: BaziComprehensiveChapter) => chapters.push({ ...chapter,
    evidence: unique(chapter.evidence), suggestions: unique(chapter.suggestions), sourceIds: unique(chapter.sourceIds).filter((id) => sourceIds.has(id)) });
  const baseSources = [...p.pattern.sourceIds, ...p.balance.sourceIds, ...working.sourceIds, ...diagnosis.sourceIds, "hakimi-editorial"];
  const domainRules = (domain: "career" | "wealth"): NatalReadingRuleApplication[] => {
    const subjects = [`chapter-${domain}`, "chapter-structure", "chapter-useful_elements"];
    const application = (ruleId: string, title: string, decision: string, support: string[], limitations: string[], ids: string[],
      selector: string, selection: string, factRefs: string[], producerVersion: string): NatalReadingRuleApplication => ({
      ruleId, title, decision, support: unique(support), limitations: unique([...limitations, NATAL_READING_PROVENANCE_LIMIT]),
      sourceIds: unique(ids).filter(id => sourceIds.has(id)), sourceSubjects: subjects,
      provenance: { version: NATAL_READING_RULE_APPLICATIONS_VERSION, producerVersion, selector, selection, factRefs }
    });
    return [
      application(diagnosis.primaryPathId, "本命主路径选择", `本领域采用${diagnosis.paths.find(item => item.role === "primary")!.label}作为结构路径；${domain === "career" ? "解释能力与职责怎样衔接" : "解释投入、用途与兑现的关系"}，不据路径名称断定实际成就。`,
        diagnosis.foundation, diagnosis.conditions, diagnosis.sourceIds, "selectNatalPatternPath", diagnosis.primaryPathId,
        ["pattern.monthMainStem", "pattern.monthMainTenGod", ...c.occurrences.filter(item => item.visible).map(item => `${item.position}:visible:${item.stem}`)], NATAL_PATTERN_PATH_VERSION),
      application(working.ruleId, "当前承受与取用基线", `${working.summary}；仅作为本领域承担范围与取用条件，不把计权当成职业或财富分数。`,
        working.evidence, working.conditions, working.sourceIds, "getWorkingBalance", `${working.selection}/${working.focus}/${working.direction}`,
        ["balance.structural.working", "balance.supportWeight", "balance.demandWeight"], working.version),
      ...(diagnosis.wealthResourceTask.applicable ? [application(diagnosis.wealthResourceTask.task, "财印任务的实际选择", diagnosis.wealthResourceTask.summary,
        diagnosis.wealthResourceTask.evidence, diagnosis.wealthResourceTask.conditions, diagnosis.wealthResourceTask.sourceIds,
        "evaluateNatalWealthResourceTask", diagnosis.wealthResourceTask.task, ["patternDiagnosis.wealthResourceTask.pairs", "patternDiagnosis.wealthResourceTask.monthCommand"], diagnosis.wealthResourceTask.version)] : []),
      ...[...diagnosis.blockers.map(finding => ({ finding, kind: "blocker" })), ...diagnosis.rescues.map(finding => ({ finding, kind: "rescue" }))].map(({ finding, kind }) =>
        application(finding.id, kind === "blocker" ? "原局具体阻碍" : "原局救应候选", finding.text, finding.evidence,
          [...diagnosis.conditions, kind === "rescue" ? "救应保留原有条件，不因候选存在就认定阻碍已经解除。" : "这项作用不等于现实事件已经发生。", `原判断范围：${finding.scope === "primary" ? "当前主路径" : "另列备选路径，不替代主判"}。`],
          [finding.sourceId], `buildNatalPatternDiagnosis.${kind}`, `${finding.scope}/${finding.id}`, finding.passageIds.map(id => `${finding.sourceId}/${id}`), diagnosis.version))
    ];
  };
  const roots = c.occurrences.filter((item) => !item.visible && strengthElementForStem(item.stem) === p.balance.dayMasterElement);
  const rootText = roots.length ? `日主同类根气见于${roots.map(where).join("、")}，自身有承接来源，关键在这些力量能否用到当下的任务中。`
    : "所选地支没有日主同五行藏干，承接任务时更要依靠印星支持、准备与现实协作。";
  const mainCandidate = p.pattern.candidates.find((item) => item.id === diagnosis.primaryCandidateId);
  const monthTransmission = p.pattern.monthHiddenStems.map((item) => `${pillars.month.branch}中${item.stem}为${item.tenGod}，${item.visibleAt.length ? `透在${item.visibleAt.filter((position) => c.positions.includes(position)).map((position) => LABELS[position]).join("、")}` : "留在藏干层"}`).join("；");
  const sensitivity = working.selection === "structural_rule"
    ? `本次以${working.label}为主线，适用条件见结构依据。原计权及其扰动场景只作旧法对照，不替代这条结构判断。`
    : p.balance.direction === "conditional"
      ? `当前结构规则尚未覆盖，以原计权的${working.label}作为工作判断。原计权对照场景存在分歧，具体差异保留在依据中。`
      : `当前结构规则尚未覆盖，原计权对照场景同向，暂采用“${pace(c)}”的安排。`;
  // Short chapter conclusions summarize the already selected primary finding;
  // the full practical explanation appears once in the corresponding body.
  const primaryObstacle = diagnosis.blockers.find((item) => item.scope === "primary")?.id;
  const chapterObstacle: Record<string, { career: string; wealth: string }> = {
    "output-resource-combined": { career: "当前先理顺支持与表达的牵连，再扩大承担。", wealth: "兑现要给支持与输出的衔接留下空间，不能只增加经营对象。" },
    "resource-controls-food": { career: "支持与准备也会牵制产出，稳定方法能否持续执行是当前关键。", wealth: "资源先用于保住执行方法的条件，而不是继续叠加要求。" },
    "owl-controls-food": { career: "现有产出受到准备与理解方式的牵制，先让方法能够连续使用。", wealth: "当前优先保护交付条件，让准备投入能转成实际成果。" },
    "wealth-controls-key-resource": { career: "资源事务也在牵制必要支持，承担责任前要先保住承接条件。", wealth: "扩大资源对象之前，要核实它是否挤占了原本需要的支持。" },
    "moderating-wealth-combined": { career: "财与印的相合使实际投入和准备互相牵连，先明确哪些支持要保留、哪些安排可调整。", wealth: "当前财的裁印任务受相合牵连，投入与支持的共同约束应先说清楚。" },
    "peer-controls-moderating-wealth": { career: "用于调节准备的现实资源受到同辈牵制，先厘清可支配范围。", wealth: "比劫对财的牵制可能限制裁印任务，不能把更多同类支持一概当作有利。" },
    "official-hurting": { career: "改进表达与职责要求之间有直接拉扯，先把改法接到共同标准上。", wealth: "成果兑现须同时照顾既有职责，不能只把表达或要求加量。" },
    "wealth-combined": { career: "成果兑现已有牵连，先说清共同安排和使用权限。", wealth: "资源的归属、权限与维护责任需要先说清楚。" }
  };
  const obstacle = primaryObstacle ? chapterObstacle[primaryObstacle] : undefined;

  add({ id: "overview", title: "命局总论", headline: rootedMixedAuthority || wealthResourceAnswer ? diagnosis.headline : `${route.name}，先看支点如何配合`,
    verdict: wealthResourceAnswer ? `${guidance.answer.headline}。${diagnosis.currentJudgment}` : rootedMixedAuthority ? `${working.label}。身势判断与用字任务分看，官杀取清仍须单独处理。${diagnosis.currentJudgment}`
      : working.direction === "conditional" ? `${working.label}，本盘先沿${route.name}理解。${guidance.answer.headline}。当前安排以“${pace(c)}”为先，承接轻重保留条件。`
      : `本盘先沿${route.name}发展。${diagnosis.blockers.length ? diagnosis.currentJudgment : `日主${working.label}，推进时宜${pace(c)}；把这条路做扎实，再扩大任务范围。`}`,
    paragraphs: rootedMixedAuthority || wealthResourceAnswer ? [guidance.answer.summary] : [
      `${pillars.day.stem}${strengthElementLabel(p.balance.dayMasterElement)}日主生于${pillars.month.branch}月，月令主气${p.pattern.monthMainStem}为${p.pattern.monthMainTenGod}，形成${p.pattern.background}。${route.reason}。放到现实里，${["food-wealth", "hurting-wealth", "mixed-output-wealth"].includes(route.id) ? "更适合靠专业输出、解决问题和稳定交付争取资源；别人愿意把事情交给你，往往是因为成果能解决实际需要" : ["official-resource", "killing-resource"].includes(route.id) ? "较适合把知识、资质和做事标准积累起来，逐步承接更明确的责任；有支持的成长路径比单独硬扛更重要" : `更容易从${LIFE[monthGroup].strength}切入；把这些方式落实为具体成果，才能进一步获得认可与协作`}。`,
      route.mechanism,
      `${rootText}${working.selection === "structural_rule" ? capacityReading(c, route) : working.direction === "support" ? "机会增多时，先确认时间、协助和能力是否跟得上；把一个领域做稳，再扩大任务范围。" : working.direction === "drain" ? "力量已有来源，接下来更需要出口。把想法拿去做项目、承担结果，比反复证明自己有道理更有价值。" : "本盘更需要调配节奏：投入与产出接得上时容易形成连续性，接得太多或一直停在准备阶段都会打乱这种配合。"}`,
    ], strengths: rootedMixedAuthority || wealthResourceAnswer ? [guidance.answer.headline] : [mainCandidate ? `${mainCandidate.label}已有实际透干依据，可作为组织能力与资源的路径。` : `${p.pattern.background}提供了明确的结构起点，可先围绕${GROUP_THEMES[monthGroup]}积累经验。`, `${route.name}能把已有透藏线索串成可执行方向。`],
    cautions: wealthResourceAnswer ? (guidance.answer.condition ? [guidance.answer.condition] : []) : rootedMixedAuthority ? [guidance.answer.condition, ...diagnosis.conditions] : [route.risk, sensitivity, "这是结构和节奏的本地初步综合；不由此宣告特格成立或确定人生层次。"],
    suggestions: rootedMixedAuthority || wealthResourceAnswer ? [] : [route.action, `将当前计划按“${pace(c)}”排序，先验证一条路径再扩大。`],
    evidence: [...p.pattern.evidence, basis(c), `原计权对照：${p.balance.sensitivitySummary}`, ...c.relations.map(relationEvidence), ...(rootedMixedAuthority || wealthResourceAnswer ? diagnosis.evidence : []), ...(wealthResourceAnswer ? [...diagnosis.conditions, ...guidance.answer.evidence] : [])], sourceIds: baseSources });

  add({ id: "structure", title: "月令与格局结构", headline: diagnosis.headline,
    verdict: diagnosis.currentJudgment,
    paragraphs: [
      `月柱${pillars.month.ganZhi}中，${monthTransmission}。透出的部分更容易进入现实任务，留在藏干层的部分则更依赖具体条件带动。因此同一月令中，不同十神可以各有分工。`,
      `成立支点：${diagnosis.foundation.join("")}`,
      `受阻环节：${diagnosis.blockers.length ? diagnosis.blockers.map((item) => item.text).join("") : "当前覆盖的透干作用中未检出直接阻断此主线的环节；这只表示本版未检出，不代表所有配合已成立。"}`,
      `可用救应：${diagnosis.rescues.length ? diagnosis.rescues.map((item) => item.text).join("") : diagnosis.blockers.length ? "未检出可以直接指定的透干救应；保留受阻处，不把藏干或另一候选自动当作已经补上。" : "当前以保护已有支点为先，不为未检出的阻碍虚设救应。"}`,
      ...(diagnosis.paths.length > 1 ? [`其他候选：${diagnosis.paths.filter((item) => item.role === "alternative").map((item) => item.label).join("、")}。这些同现线索保留作比较，不与主线叠算为已经成立的优势。`] : [])
    ], strengths: [...diagnosis.foundation, rootText],
    cautions: [...diagnosis.conditions, ...(mainCandidate?.conditions ?? p.pattern.conditions)],
    suggestions: [`优先检验${route.name}在实际学习、项目或合作中的表现。`, "把透干、藏干和互动分别记录，避免见一个格名就套用所有结论。"],
    evidence: [...p.pattern.evidence, ...diagnosis.evidence, ...relationsFor(c, ["month"]).map(relationEvidence)], sourceIds: [...p.pattern.sourceIds, ...(mainCandidate?.sourceIds ?? []), ...diagnosis.sourceIds, "hakimi-editorial"] });

  add({ id: "useful_elements", title: "扶抑、格局与调候取向", headline: guidance.headline,
    verdict: guidance.verdict,
    paragraphs: [...guidance.paragraphs, ...guidance.entries.map((entry) => `${entry.stem}（${entry.tenGod}）· ${entry.roleLabel}：${entry.presenceText} ${entry.judgment}${entry.conditions.length ? ` 条件：${entry.conditions.join("；")}` : ""}`)],
    strengths: guidance.priorities,
    cautions: guidance.conditions,
    suggestions: ["结合逐字分工比较同一个作用怎样影响承接、主路径与季节需要，先保留当前明确的作用支点。", "记录原判断与实际反馈；条件改变时再复核对应字的作用，不用一个五行标签覆盖所有位置。"],
    evidence: guidance.evidence, sourceIds: guidance.sourceIds });

  const personalityLink = monthVisibleGroup === monthGroup
    ? `月干与月令主气同属${GROUP_LABELS[monthGroup]}，外部表现与内在组织方式较容易围绕同一类任务展开`
    : `月干${pillars.month.stem}的${canonicalizeStrengthTenGod(pillars.month.stemTenGod)}与月令${p.pattern.monthMainTenGod}分属不同侧重，外部会更直接表现${GROUP_THEMES[monthVisibleGroup]}，而内部驱动力仍带有${GROUP_THEMES[monthGroup]}`;
  const visibleGod = canonicalizeStrengthTenGod(pillars.month.stemTenGod);
  const exactStyle: Record<string, string> = {
    比肩: "先形成自己的判断，再决定愿意怎样配合", 劫财: "关注同辈之间怎样分工，既要参与感也要决定空间",
    食神: "把一件事讲清、做稳，偏重连续而完整的表达", 伤官: "发现不合适的地方并提出改法，偏重表达自己的判断",
    正财: "让投入和结果有交代，偏重能持续履行的安排", 偏财: "关注不同资源怎样组合，偏重变化中的协调与取舍",
    正官: "先看约定和完成标准，偏重可预期的责任", 七杀: "先辨眼前要求和问题，偏重对紧迫事项作出回应",
    正印: "先理解完整依据，偏重有来由、有解释的行动", 偏印: "寻找适合问题的理解角度，偏重自己的方法与判断框架"
  };
  add({ id: "personality", title: "性格与做事方式", headline: monthVisibleGroup === dayGroup ? `重${WORK_FOCUS[monthVisibleGroup]}，也要给不同节奏留空间` : `做事求${WORK_FOCUS[monthVisibleGroup]}，相处重${CLOSE_FOCUS[dayGroup]}`,
    verdict: `本盘对外做事的主调是${exactStyle[visibleGod] ?? LIFE[monthVisibleGroup].work}；亲近日常时，更需要${LIFE[dayGroup].need}。${working.direction === "support" ? "有足够支持时更容易发挥，持续加码反而可能让优点变成负担。" : working.direction === "drain" ? "主见需要转成成果，才能更充分地获得理解与认可。" : "把不同场景里的期待表达清楚，比要求自己只有一种性格更合适。"}`,
    paragraphs: [
      `${personalityLink}。${monthVisibleGroup === monthGroup ? "做事主线较集中，熟悉的方法容易反复发挥；遇到不同环境，也需要留出换一种方式的余地。" : `这让“${LIFE[monthVisibleGroup].motive}”与“${LIFE[monthGroup].motive}”同时存在，遇到选择时需要兼顾实际任务与自己的驱动力。`}`,
      everydayTension(c),
      `日柱${pillars.day.ganZhi}以${canonicalizeStrengthTenGod(pillars.day.branchTenGods[0]!)}为支内主气，贴近生活时更需要${LIFE[dayGroup].need}。${LIFE[dayGroup].risk}。可${LIFE[dayGroup].action}。${working.direction === "support" ? "当精力或支持不够，先缩小承诺，比勉强维持所有标准更合适。" : "把期待说成对方可以回应的具体行动，能减少各自猜测。"}`,
      `月干${visibleGod}的方式与${route.name}这条路径合看，${route.id === "food-killing" ? "反应快与处理稳需要并存：先把急迫感放进明确步骤，才不容易把所有谈话都变成解决问题的任务。" : route.id === "hurting-wealth" ? "表达最好有一个能够兑现的落点。说清楚为什么要改、改后解决什么，比单纯指出不足更能让别人接住自己的判断。" : route.id === "food-wealth" ? "稳定与耐心需要有自己的节奏。愿意把事情做完整是可取的一面，也应让别人知道连续完成需要哪些条件。" : route.id === "official-resource" ? "认真履责与独立判断需要一起培养。理解标准之后，能够说明自己的选择，比只是不断提高完成要求更有空间。" : `${working.direction === "drain" ? "自我判断更需要通过结果得到检验，允许反馈改变原来的做法。" : "先说明自己的需要和能够承担的部分，能让外部期待与日常节奏更容易配合。"}`}`
    ], strengths: [`能把${GROUP_THEMES[monthVisibleGroup]}落实到可观察的做事环节。`, monthVisibleGroup === dayGroup ? "外部做事与日常相处的主题相近，容易建立一致的工作习惯。" : `外部与日常侧重不同，可分别发挥${GROUP_LABELS[monthVisibleGroup]}和${GROUP_LABELS[dayGroup]}的功能。`],
    cautions: [monthVisibleGroup === monthGroup ? "同一主题被反复强调时，也要给其他做事方式留空间。" : "外部要求与内部节奏不完全相同，不宜靠一种反应方式应对所有场景。", "这些是传统结构的现代行为解释，不能替代实际性格观察或心理诊断。"],
    suggestions: [LIFE[dayGroup].action + "。", c.occurrences.some((item) => item.visible && item.god === "伤官") ? "指出问题前先说清希望共同达到什么，再提出一项可执行的改法。" : LIFE[monthVisibleGroup].action + "。"],
    evidence: [pillarEvidence(c, "month"), pillarEvidence(c, "day"), basis(c), ...relationsFor(c, ["month", "day"]).map(relationEvidence)], sourceIds: [...working.sourceIds, ...p.balance.sourceIds, "smt-ten-gods", "smt-position", "hakimi-editorial"] });

  add({ id: "career", title: "事业与能力发展", headline: `事业主线：${route.name}`,
    verdict: working.focus === "wealth_moderates_resource" ? `事业重点是用实际需求筛选准备，让已有知识与支持进入使用。财在这里承担裁印任务，先为一件事确定用途、范围与投入，不再通过增加材料和训练证明已经准备充分。${obstacle?.career ?? ""}`
      : working.focus === "rooted_peer_mixed_authority" ? "事业重点是让已有资源对应明确任务，把正官的职责标准与七杀的紧迫要求分开安排。自身当令有根，财官杀也都有实际支点；先确认投入在完成什么、同时增加了什么负担，再决定承担范围。"
      : `本盘的事业发展先沿${route.name}展开。${route.id === "food-wealth" ? "核心是把方法做熟、成品做稳，形成可连续交付的价值。" : route.id === "hurting-wealth" ? "核心是让改进解决实际问题，再由成果连接合作与资源。" : route.id === "mixed-output-wealth" ? "核心是守住稳定交付，再让有依据的改进接到成果上。" : route.id === "food-killing" ? "核心是让稳定方法接住紧迫要求，把难题拆成能反复完成的步骤。" : route.id === "official-resource" ? "核心是以专业训练和稳定完成建立信任，让支持配得上责任。" : route.id === "killing-resource" ? "核心是把急难压力转成可理解、可执行的框架，再决定承担范围。" : `把${LIFE[monthGroup].strength}做成别人能看到的成果，再以成果争取空间和认可。`}${obstacle?.career ?? ""}${working.direction === "support" ? "当前先守住承接与质量，再增加任务。" : working.direction === "drain" ? "当前应把已有力量转成实际出口，少在准备或主张上反复堆积。" : "当前重点是连接各环节，让投入、完成和兑现同频。"}`,
    paragraphs: [
      `${p.pattern.headline}提供依据：${route.reason}。月柱${pillars.month.ganZhi}透${canonicalizeStrengthTenGod(pillars.month.stemTenGod)}，工作中更重视“${LIFE[monthVisibleGroup].motive}”，适合用具体任务承载这种倾向。`,
      route.mechanism,
      diagnosis.careerImplication,
      ...(candidate(c, "output-wealth") && !["food-wealth", "hurting-wealth", "mixed-output-wealth"].includes(route.id) ? [`另外，${["食神", "伤官"].filter((god) => inGroup(c, "output", true).some((item) => item.god === god)).join("、")}与财星均有实际透干，形成食伤生财候选；它与当前月令主线分开保留。稳定交付与改进都可以训练，但不因同现就宣布已经取得主用地位。`] : []),
      outputPositionReading(c),
      capacityReading(c, route),
      supportReading(c)
    ], strengths: [route.reason + "。", `月柱明确呈现${GROUP_THEMES[monthVisibleGroup]}，可作为训练和选任务的切入点。`],
    cautions: [route.risk, candidate(c, "official-hurting") ? "官伤并见时，表达改进意见与遵循既有规则之间尤其需要明确沟通次序。" : "结构取向不能直接保证职位、行业匹配或晋升结果。"],
    suggestions: [route.action, working.direction === "support" ? "新任务先确认谁提供支持、边界在哪里，再确认目标。" : "用成果、验收和复盘代替仅以投入时长证明努力。"],
    evidence: [pillarEvidence(c, "month"), groupEvidence(c, "output"), groupEvidence(c, "authority"), basis(c), ...diagnosis.evidence, ...(mainCandidate?.evidence ?? []), ...relationsFor(c, ["month"]).map(relationEvidence)], sourceIds: baseSources, ruleApplications: domainRules("career") });

  const wealthShown = inGroup(c, "wealth", true), wealthHidden = inGroup(c, "wealth", false);
  const peerShown = hasVisible(c, "peer"), outputWealth = ["food-wealth", "hurting-wealth", "mixed-output-wealth"].includes(route.id);
  const wealthLead = working.focus === "wealth_moderates_resource" ? "财用于裁抑过多印的投入，先让支持与实际用途相配"
    : working.focus === "rooted_peer_mixed_authority" ? "财已有透根，先分清资源是在支持职责还是增加压力"
    : outputWealth ? route.id === "food-wealth" ? "以稳定成品形成兑现，先守住连续交付的能力" : route.id === "mixed-output-wealth" ? "稳定成果与改进成果分读，分别安排兑现条件" : "以改进和解决问题连接资源，先打通交付与兑现"
    : wealthShown.length ? !hasVisible(c, "output") && monthGroup === "peer" ? "自主与财星已显，先补上从主见到成品的环节" : "财星已显，资源安排要与承受能力配套"
    : route.id === "official-resource" ? "财星藏而未透，先把专业承接接到资源认可"
    : route.id === "food-killing" ? "财星藏而未透，先把解决难题的方法做成可认可成果"
    : wealthHidden.length ? `财星藏而未透，以${route.name}建立兑现条件` : `财星未显，先从${route.name}建立资源联系`;
  const wealthRoles = wealthShown.length ? unique(wealthShown.map((item) => item.god)) : unique(wealthHidden.map((item) => item.god));
  const wealthStyle = wealthRoles.includes("正财") && wealthRoles.includes("偏财")
    ? "正财与偏财在所选柱中都有具体位置，资源主题可以分成连续维护与临时协调两部分。一个要求稳定兑现，一个要求面对变化做取舍；两边若都临时处理，时间和责任容易互相挤占。"
    : wealthRoles.includes("正财") ? "本盘所见财星以正财为线索，资源解释更贴近持续维护、明确对价与稳定完成。值得关注的是一件事怎样连续做好，以及维护成本是否有相应承接。"
    : wealthRoles.includes("偏财") ? "本盘所见财星以偏财为线索，资源解释更贴近不同对象之间的协调和机会取舍。值得关注的是选择之后谁来持续完成，而不是把接触面直接当成已经得到的回报。"
    : "没有可直接采用的财星透藏线索时，资源章节从实际能力和可用条件出发，不把缺字翻译为没有收入或不会经营。";
  add({ id: "wealth", title: "财富与资源经营", headline: wealthLead,
    verdict: `${wealthLead}。${obstacle?.wealth ?? ""}${working.focus === "wealth_moderates_resource" ? "保留必要学习与支持，把暂时用不上的投入减下来；这项结构任务不等于已经有收入，也不证明增加财的数量总会更好" : working.focus === "rooted_peer_mixed_authority" ? "财生正官与财生七杀分开阅读，现有投入要与明确责任、可承受要求对应，承接能力和负担不能只凭得令有根一并判定" : working.focus === "output_after_resource" ? "当前先把准备与知识变成可用成果，财的经营仍需看后续配合，不直接列为喜用" : working.direction === "support" ? "当前判断偏向先增强承接，再扩大经营对象" : working.direction === "drain" ? "当前可把经营当作已有成果兑现的出口，但不等于任意扩大都合适" : "当前判断不固定把财判为喜或忌，重点看产出、资源和自身安排能否接得上"}。`,
    paragraphs: [
      groupNarrative(c, "wealth"),
      wealthStyle,
      diagnosis.wealthImplication,
      `${outputWealth ? route.id === "food-wealth" ? "资源上的关键拉扯是维持质量与增加数量。相同做法能够重复，不代表时间和精力没有上限；兑现安排需要给准备、制作和交付留出完整周期。" : "资源上的关键拉扯是改进价值与现实需求。自己觉得更好的办法，仍要经过对方理解和验收；先让改进产生可观察的帮助，才有基础讨论回报。" : route.id === "food-killing" ? "解决难题容易把注意力全部吸引到眼前要求，成果是否留下、方法能否复用也要有位置。若每次只完成救急而没有形成可移交的结果，资源联系就难以连续。" : route.id === "official-resource" ? "专业投入与认可之间需要一个看得见的连接。学到了什么、承担了什么、完成标准怎样变化，宜有清楚记录；持续接受要求不等于已经获得相应支持。" : route.resourceLink}结合日主${working.label}，本次更宜${pace(c)}。`,
      peerShown || monthGroup === "peer" ? `比劫${peerShown ? "透出" : "当令"}与财星同读时，自主和共同资源需要一起安排。合作前把投入、回报与决定权谈清楚，能让精力留在经营本身，减少事后为“谁付出更多”反复拉扯。`
        : "资源安排宜围绕已经能做到的事情建立节奏：保留稳定交付的基础，再增加新的责任。外部机会到来时，也先确认自己最缺的是能力、协助还是时间。"
    ], strengths: [outputWealth ? "食伤与财的可见联系，可支持以成果带动兑现的实践路径。" : wealthShown.length ? "财星位置清楚，便于把经营对象和责任具体化。" : `可先以${route.name}积累现实能力，再逐步建立兑现环节。`, groupEvidence(c, "wealth")],
    cautions: [working.direction === "support" ? "经营对象和承诺增加时，自身承接也必须同步，不宜只追求数量。" : "有泄耗或经营出口不等于已经形成稳定回报。", "比劫、财星或合冲都不直接等于破财、暴富或某项投资适合。"],
    suggestions: [outputWealth ? "将产出、验收、兑现分开记录，找出哪一环真正受阻。" : "先确认自己已经具备的技能、时间和资源，再设置可兑现目标。", "共同事项写清投入、分工和退出安排，不用命盘代替现实判断。"],
    evidence: [groupEvidence(c, "wealth"), groupEvidence(c, "output"), groupEvidence(c, "peer"), basis(c), ...diagnosis.evidence, ...(candidate(c, "output-wealth")?.evidence ?? [])], sourceIds: baseSources, ruleApplications: domainRules("wealth") });

  add({ id: "relationships", title: "亲密关系与合作", ...relationshipFoundation.relationship });
  add({ id: "family", title: "家庭与支持环境", ...relationshipFoundation.family });
  const hourGroup = c.includeHour ? positionGroup(c, "hour") : null;
  add({ id: "development", title: "成长路径与长期安排", headline: `先把${route.name}做成可持续的能力`,
    verdict: `长期发展优先采用“${pace(c)}”，以${route.name}为实践主线；${c.includeHour ? `时柱再补充${GROUP_THEMES[hourGroup!]}的观察角度` : "时辰未定，长期安排只依据已知三柱与基线，不借用候选时柱"}。`,
    paragraphs: [
      `${route.reason}。${route.id === "food-wealth" ? "长期积累优先保留可以重复使用的质量标准与完成节奏，让熟练带来余地，而不只是带来更多任务。" : route.id === "hurting-wealth" ? "长期积累优先把改进经验整理成可复用方案，让每次发现问题都能留下更好的方法，而不只是当时说得有道理。" : route.id === "official-resource" ? "长期积累优先留下能证明职责完成的作品、过程与方法，让信任建立在可观察的能力上。" : route.id === "food-killing" ? "长期积累优先把解决过的难点整理成步骤，让下一次遇到相似要求时不必重新硬扛。" : route.mechanism}`,
      c.includeHour ? `时柱${pillars.hour.ganZhi}透${canonicalizeStrengthTenGod(pillars.hour.stemTenGod)}，长期积累可着重培养${LIFE[hourGroup!].strength}。${hourGroup === "output" ? "把解决过的问题整理成作品、方法或经验，下一次就不必从头开始。" : hourGroup === "wealth" ? "让投入的时间与资源留下可重复使用的成果，逐步减少只靠临时发挥。" : LIFE[hourGroup!].action + "。"}${relationSummary(c, ["hour"], "长期计划与其他安排")}`
        : "时辰未定，长期安排采用已知三柱：先从月令主线选一项能持续练习的能力，再用实际成果判断投入是否合适。",
      `复盘时分开看三个问题：事情是否完成，承接是否吃力，得到的回报或支持是否真实。${working.direction === "support" ? "如果完成了却持续吃力，下一步优先补支持或缩小范围。" : working.direction === "drain" ? "如果投入很多却没有成果，下一步优先增加明确的交付与验收。" : "如果某一环节持续失衡，就调整节奏，不必一口气推翻整条方向。"}`
    ], strengths: [`${route.name}有同盘事实作为起点，能够设计具体实践而不是等待一个抽象结论。`, c.includeHour ? `时柱${pillars.hour.ganZhi}提供了长期安排的额外主题，可与月柱事务主线比较。` : "已知三柱仍能支持有边界的成长安排，不依赖未定出生时刻。"],
    cautions: ["本命位置不等于某个固定年龄会发生事件；年度或阶段趋势需另读实际运限。", `原计权对照：${p.balance.sensitivitySummary}`],
    suggestions: [route.action, "复盘时记录原判断、采取的行动与实际结果，允许保留反例，避免把所有结果都解释成命中。"],
    evidence: [basis(c), ...p.pattern.evidence, ...(c.includeHour ? [pillarEvidence(c, "hour"), ...relationsFor(c, ["hour"]).map(relationEvidence)] : ["时辰未定：本章不采用时柱事实或其互动。"])], sourceIds: baseSources });

  return { version: BAZI_COMPREHENSIVE_READING_VERSION,
    sourceBinding: { revisionId: c.revision.id, chartResultHash: c.revision.manifest.resultHash, includeHour: c.includeHour },
    title: `${pillars.day.stem}${strengthElementLabel(p.balance.dayMasterElement)}命局综合解读`,
    summary: rootedMixedAuthority || wealthResourceAnswer ? `${working.label}。${diagnosis.currentJudgment}${guidance.answer.headline}。`
      : `${p.headline}。本盘主线为${route.name}，总体安排以“${pace(c)}”为先。${guidance.seasonalBalanceConflict.summary}`,
    chapters, sources, patternDiagnosis: diagnosis, usefulGuidance: guidance, relationshipFoundation, ruleApplicationsVersion: NATAL_READING_RULE_APPLICATIONS_VERSION,
    limitations: [
      "各章为本地规则结合传统结构的现代综合解释；sourceIds 指向术语和方法来源，不表示古籍逐句支持每条现实建议。0.6.0 将已有取用角色按主任务、配合对象与实际条件组织为主结论，不另设全盘喜忌分数；生活情境仍是按本命路径、承接基线与透藏位置组织的编辑模型。",
      "扶抑权重沿用本地初判基线，敏感性分歧继续保留；透藏与互动不自动证明成格、从格、专旺或真化。",
      "关系覆盖天干五合、天干冲、地支六合与六冲的二元事实；不把合冲次数换算为吉凶分数或事件概率。",
      "事业、财富、关系、家庭主题不构成现实事件保证；不推算财富额度、亲属经历、健康寿命或必然婚变。",
      "本命事业与资源说明是能力发展方向，不表示已经就业或有收入；现实就学、职业与婚恋状态未知，九章未按当前年龄改写。",
      ...(c.includeHour ? [] : ["时辰未定：时柱透藏、位置解释及所有时柱参与的关系均已排除。"])
    ] };
}
