import { revisionRecordSchema, type RevisionRecord, type TransitNodeRef } from "@hakimi/contracts";
import { LunarUtil } from "lunar-typescript";
import { calculatePillarRelations, type RelationFact } from "@hakimi/relations-core";
import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { canonicalizeStrengthTenGod, strengthTenGodGroup } from "../../../../packages/bazi-interpretation/src/strength-policy";
import { LOCAL_ANNUAL_OUTLOOK_VERSION, type LocalAnnualYear } from "./local-annual-outlook";
import { buildLocalReadingAgeContext, type LocalReadingAgeContext, type LocalReadingAgeStage } from "./local-reading-age-context";
import type { LocalOutlookJudgment, OutlookAxisFinding } from "./local-outlook-judgment";
import { buildReadingTimeline } from "./local-reading-timeline";
import { outlookDirectionCaption } from "./outlook-judgment-presentation";

export const ANNUAL_DOMAIN_READING_VERSION = "hakimi.local-annual-domain-reading/0.1.0" as const;
export type AnnualReadingDomainId = "career" | "wealth" | "relationship";
export type AnnualDomainBranchId = "locked" | "forward" | "backward";
export interface AnnualDomainReading {
  id: AnnualReadingDomainId; title: string; headline: string; summary: string; paragraphs: string[];
  opportunities: string[]; obstacles: string[]; examples: string[]; watchPoints: string[];
  conditions: string[]; evidence: string[]; sourceIds: string[];
}
export interface AnnualDomainSegment {
  id: string; branchId: AnnualDomainBranchId; startInstant: string; endExclusiveInstant: string; personalStartInstant: string;
  backgroundRefs: TransitNodeRef[]; judgmentVersion: string; policyVersion: string; judgmentCaption: string;
  ageStage: LocalReadingAgeStage; ageLabel: string; domains: AnnualDomainReading[];
}
export interface AnnualDomainGap { startInstant: string | null; endExclusiveInstant: string | null; message: string }
export interface AnnualDomainBranch { id: AnnualDomainBranchId; label: string; segments: AnnualDomainSegment[]; gaps: AnnualDomainGap[]; conditions: string[] }
export interface LocalAnnualDomainReading {
  version: typeof ANNUAL_DOMAIN_READING_VERSION;
  sourceBinding: { revisionId: string; chartResultHash: string; includeHour: boolean };
  sourceVersions: string[]; year: number; yearGanZhi: string | null; yearNodeRef: TransitNodeRef | null;
  startInstant: string | null; endExclusiveInstant: string | null; status: "ready" | "partial" | "before_birth" | "unavailable";
  headline: string; summary: string; branches: AnnualDomainBranch[]; limitations: string[];
}
export interface AnnualDomainReadingInput { revision: RevisionRecord; assessment: BaziPreliminaryAssessment; year: LocalAnnualYear }

type Actor = { stem: string; god: string; kind: "visible" | "main_hidden"; action: "support" | "pressure" | "none" | "unrecorded"; evidence: string[] };
type Interaction = { scope: "annual" | "dayun"; position: "year" | "month" | "day"; fact: RelationFact; text: string };
type Topic = { headline: string; focus: string; examples: string[]; watch: string };
type Context = { revision: RevisionRecord; assessment: BaziPreliminaryAssessment; year: LocalAnnualYear; judgment: LocalOutlookJudgment;
  visible: Actor; main: Actor; age: LocalReadingAgeContext; interactions: Interaction[]; pattern: OutlookAxisFinding; balance: OutlookAxisFinding | undefined; seasonal: OutlookAxisFinding | undefined };
const unique = <T>(items: readonly T[]) => [...new Set(items)];
const LABELS = { year: "年柱", month: "月柱", day: "日柱" };
const RELATION_NAMES: Partial<Record<RelationFact["relationType"], string>> = { stem_five_combination: "天干五合", stem_clash: "天干冲", branch_six_combination: "地支六合", branch_six_clash: "地支六冲" };
const FLOW = ["peer-output-wealth", "wealth-food", "food-wealth", "hurting-wealth"];
const SCHOOL: Record<string, { focus: string; example: string }> = {
  比肩: { focus: "自主尝试与同伴协作", example: "自己负责的练习或活动，与小组共同完成的部分需要衔接" },
  劫财: { focus: "小组分工与活动资源", example: "同伴参与方式、材料使用和活动分工成为具体讨论内容" },
  食神: { focus: "稳定练习与作品完成", example: "练习逐步形成一份可展示的作品，完成节奏与质量得到具体反馈" },
  伤官: { focus: "表达想法与尝试不同方法", example: "提出不同做法或展示自己的想法，学习要求与表达方式需要对齐" },
  正财: { focus: "任务完成与材料安排", example: "已有学习任务进入完成与检查阶段，时间和材料要跟上" },
  偏财: { focus: "新活动选择与弹性安排", example: "出现不同活动或合作选择，参与方式与所需支持需要具体比较" },
  正官: { focus: "规则要求与责任分工", example: "活动规则、老师的要求或小组责任变得更明确" },
  七杀: { focus: "集中任务与应对节奏", example: "几项要求集中出现，练习进度与可得到的帮助需要衔接" },
  正印: { focus: "理解方法与接受指导", example: "老师或家人的指导进入具体练习，理解与实际完成逐步衔接" },
  偏印: { focus: "专项探索与方法转换", example: "接触新的工具或学习方法，需要试用后找到适合自己的做法" }
};
const CAREER: Record<string, Topic> = {
  比肩: { headline: "独立承担与共同分工同时成为重点", focus: "个人负责范围、同伴协作和成果归属", examples: ["一项成果由自己独立推进，同时需要与同级伙伴对接", "原有协作讨论谁负责完成、谁拥有决定权"], watch: "个人负责范围、协作接口与成果归属是否一致" },
  劫财: { headline: "共同事项更突出参与份额与主导边界", focus: "团队参与方式、任务份额和共同资源", examples: ["同伴或合作方参与增加，任务份额与接口需要明确", "同一目标下出现不同推进意见，主导与配合方式进入讨论"], watch: "新增参与者、决策权限与交付责任的对应" },
  食神: { headline: "稳定交付与技能应用走到前台", focus: "持续产出、服务维护和成果质量", examples: ["已有技能用于连续服务或一系列具体成果", "事项从单次完成转向持续交付，质量与节奏受到关注"], watch: "连续完成能力、质量反馈与维护时间" },
  伤官: { headline: "提案表达与方法改进更为突出", focus: "方案表达、解决问题和流程改法", examples: ["已有方法或作品进入展示、试用或提案讨论", "个人改法与原有标准需要对接，重点转向能否实际落地"], watch: "提案是否有实施条件、标准与完成范围是否清楚" },
  正财: { headline: "已有成果进入验收与兑现衔接", focus: "执行进度、验收责任和持续兑现", examples: ["已推进事项开始核对成果、验收和后续衔接", "责任范围与可兑现结果需要逐项对应"], watch: "完成记录、验收标准与兑现条件的衔接" },
  偏财: { headline: "外部需求与合作选择成为焦点", focus: "合作渠道、弹性任务和资源筛选", examples: ["接触不同于原安排的合作需求或临时事项", "几种合作路径同时存在，需要分清投入与后续承接"], watch: "对方需求、自己能承担的范围与合作持续条件" },
  正官: { headline: "职责与标准的落实更突出", focus: "责任确认、考核标准和既有约定", examples: ["任务进入审核、责任确认或成果验收阶段", "已有做法需要符合更明确的标准与流程"], watch: "实际责任与能够得到的支持是否匹配" },
  七杀: { headline: "集中要求考验方法与承接节奏", focus: "紧迫任务、解决问题和职责承接", examples: ["几项要求在相近时段集中，原推进顺序需要调整", "任务标准提高，现有方法与支持能否接住成为关键"], watch: "完成期限、可用协助和最需要解决的问题" },
  正印: { headline: "学习准备与实际应用需要衔接", focus: "专业准备、资质与支持来源", examples: ["系统学习或资质准备进入原有任务安排", "已有经验与外部指导需要变成可实际使用的方法"], watch: "准备内容是否服务真实任务、支持是否落实" },
  偏印: { headline: "专项方法的更新进入实际任务", focus: "专项探索、新工具和方法适应", examples: ["遇到现有流程难以直接处理的事项，开始试用新方法", "专项准备与原来完成安排需要重新协调"], watch: "试用成本、方法适配性和阶段性成果" }
};
const WEALTH: Record<string, Topic> = {
  比肩: { headline: "个人投入与共同分摊需要对应", focus: "自主事项的资源占用与伙伴分摊", examples: ["独立负责事项与共同事项同时使用时间或材料", "共同投入开始核对各自承担和成果归属"], watch: "个人承担、共同分摊与实际使用记录" },
  劫财: { headline: "资源份额与使用边界更突出", focus: "共同资源、支出权限和份额安排", examples: ["共同事项讨论资源由谁提供、由谁使用", "人情支持与需要明确记录的投入交织"], watch: "使用权限、分摊约定和退出条件" },
  食神: { headline: "连续产出与兑现节奏相衔接", focus: "稳定交付后的验收与资源回流", examples: ["连续完成的服务或成果进入验收与后续安排", "维护工作量与兑现节奏需要同步确认"], watch: "交付频率、验收节点与维护成本" },
  伤官: { headline: "专业成果能否转成资源成为重点", focus: "方案、作品与专业服务的转化条件", examples: ["展示的作品或方案成为讨论合作的入口", "获得关注后，实际完成范围与兑现办法需要落实"], watch: "关注度能否对应真实需求、交付与兑现是否衔接" },
  正财: { headline: "既有兑现与持续责任需要落到实处", focus: "已约定的回报、日常预算和持续投入", examples: ["已有事项进入验收、结算或持续责任核对", "固定需要与可使用资源重新对应"], watch: "实际到账或交付记录、固定责任与持续支出" },
  偏财: { headline: "弹性机会与新增投入需要筛选", focus: "新增渠道、临时合作与资源调配", examples: ["额外合作出现不同投入方式与兑现条件", "几种机会占用同一份时间或工具，需要作取舍"], watch: "实际资源来源、前期投入和后续兑现条件" },
  正官: { headline: "履责所需的资源与回报需要匹配", focus: "责任配套的工具、时间与持续支持", examples: ["承担事项需要同步安排工具或支持条件", "履责范围变化后，资源配置需要重新对应"], watch: "新增责任是否有配套资源和明确回报条件" },
  七杀: { headline: "集中任务使资源承接更关键", focus: "紧迫需要与现有支持的调配", examples: ["集中任务要求临时协调人手、材料或时间", "几项需要同时占用可用资源，先后次序进入讨论"], watch: "实际缺口、可用支持与任务优先顺序" },
  正印: { headline: "能力建设投入与眼前兑现并行", focus: "学习准备、专业工具与长期使用价值", examples: ["课程、准备或工具成为具体投入项目", "部分资源用于积累，当前任务与长期用途需要衔接"], watch: "投入是否服务真实需要、使用条件是否持续" },
  偏印: { headline: "专项试用的成本与用途需要对应", focus: "新方法、试验材料和工具适配", examples: ["一项新工具或方法进入试用，需要了解实际成本", "旧有资源用途改变，比较能否适合当前事项"], watch: "试用范围、后续维护和实际适配结果" }
};

type PracticalReading = { mechanism: string; opening: string; tension: string };
// Modern life-language translations of the already selected topic and action.
// These do not classify a stem, assign a domain rating, or predict an event.
const PRACTICAL_CAREER: Record<string, PracticalReading> = {
  比肩: { mechanism: "独立推进与团队配合同时出现时，真正的进展取决于各自负责的部分能否接上；自己完成更多，不一定等于共同事项完成更多。", opening: "把自己熟悉的部分独立做成，再与伙伴的成果衔接，个人能力更容易成为可见贡献。", tension: "各自推进容易占用同一份时间、资源或决定权，个人节奏与共同交付可能互相挤压。" },
  劫财: { mechanism: "参与者增加会带来新的协作方式，也让任务份额和决定权更需要对应；谁愿意参与与谁能持续完成，是两件实际要核对的事。", opening: "借助已有伙伴的互补能力，原来由一人承担的事项可以拆成明确分工。", tension: "参与意见增加可能先占用协调时间，共同负责的事项容易出现重复投入或接口空缺。" },
  食神: { mechanism: "重点从单次表现转向持续完成：已有技能能否稳定服务真实需要，比偶尔做出亮点更影响后续安排。", opening: "把成熟方法用于连续交付，质量、反馈和重复使用的价值能够逐步积累。", tension: "连续任务会占用维护和收尾时间，准备环节或额外要求挤入时，原有完成节奏可能被打断。" },
  伤官: { mechanism: "有自己的改法只是起点，方案要被采用，还需要让接受方看见实际用途，并与原有标准、人员和流程接上。", opening: "把改法做成可试用的方案或作品，具体解决问题的能力更容易被看见。", tension: "提出的改法与原有标准可能不一致，表达走得比实施条件快时，容易增加解释、返工和协调。" },
  正财: { mechanism: "重点在已经推进的事项能否真正完成：成果、验收标准和后续责任要一一对应，做完与得到确认可能处于不同节奏。", opening: "将已有成果交到明确的验收节点，能让责任范围和后续兑现更清楚。", tension: "任务已完成但确认条件未齐，或持续责任增加，都可能拖慢收尾并占用下一项任务的时间。" },
  偏财: { mechanism: "外部需求让可选事项增加，真正适合承接的机会需要同时满足对方需求与自己的持续完成能力。", opening: "从实际需要中筛选互补的合作，把已有能力用到新的具体场景。", tension: "多条合作同时占用时间时，容易先接下需要，再发现完成范围和后续支持尚未对齐。" },
  正官: { mechanism: "责任或标准更明确时，表现重点在能否按约定完成；被要求负责，还需要有相应权限和支持。", opening: "以稳定完成和清楚记录建立可信度，让承担的职责有具体成果支撑。", tension: "责任、期限与实际权限不一致时，承担者可能需要反复协调，完成压力先于支持到位。" },
  七杀: { mechanism: "要求集中时，关键在于能否把问题拆成可完成步骤；现有方法和可用协助，决定任务能否接得住。", opening: "把已有解决问题的方法用于最明确的一项要求，集中力量完成关键环节。", tension: "几项要求抢占同一段时间，临时应对可能挤掉必要准备，推进顺序需要调整。" },
  正印: { mechanism: "学习、资质或准备要转成实际进展，需要留出应用和交付时间；准备得更充分，与眼前事项完成得更快并不总同步。", opening: "将已有指导和积累用到具体任务，让准备直接改善完成质量。", tension: "课程、准备或支持流程占用原有交付时间时，可能出现准备不断增加、成果迟迟未落地的拉扯。" },
  偏印: { mechanism: "新工具或专项方法需要在真实任务里试用，适合探索的做法未必立即适合稳定交付。", opening: "用小范围试用解决现有方法处理不了的问题，逐步形成适合自己的工具和流程。", tension: "方法反复切换或专项准备增加时，原有完成安排容易中断，试用与交付需要分阶段衔接。" }
};
const PRACTICAL_WEALTH: Record<string, PracticalReading> = {
  比肩: { mechanism: "自主事项与共同事项会同时占用资源，分摊是否清楚会影响最终能保留和持续使用的部分。", opening: "将个人投入与共同使用分开记录，使已有资源更准确地服务实际事项。", tension: "个人与伙伴的需要同时增加时，同一份时间、工具或资金可能被反复占用。" },
  劫财: { mechanism: "资源重点在参与份额和使用权限，愿意共同投入与实际如何分担、使用，需要落到同一份安排上。", opening: "已有共同资源可以服务互补任务，明确使用份额能减少重复投入。", tension: "共同使用和个人承担不对等时，资源投入可能先增加，而成果归属或分摊尚未落实。" },
  食神: { mechanism: "稳定产出为资源衔接提供基础，但持续维护、验收和兑现各有节奏，不能只看完成次数。", opening: "让连续交付与明确确认节点衔接，已有成果更容易形成可持续使用的资源。", tension: "持续维护或准备占用增加，可能使完成量上升而可自由安排的资源没有同步增加。" },
  伤官: { mechanism: "作品或方案带来的关注，需要转成真实需求、完成范围和兑现条件，才有可持续的资源意义。", opening: "把专业成果对应到具体需求，给方案、作品或服务找到清楚的承接方式。", tension: "展示和改法先投入了时间，但需求确认、实施或兑现尚未跟上时，转化过程会拉长。" },
  正财: { mechanism: "资源重点是已有约定怎样兑现，验收、结算与持续支出不一定同步，实际可用部分取决于这些环节的衔接。", opening: "已有成果进入清楚的确认与结算流程，有助于把预期安排落实为可核对的资源。", tension: "验收或结算延后，而固定责任仍在持续时，会形成投入与可用资源之间的时间差。" },
  偏财: { mechanism: "新增合作或临时需要会改变资源用途，不同渠道的前期投入与后续兑现条件需要分别辨认。", opening: "从新需求中找到已有资源的其他用途，选择投入范围清楚的合作方式。", tension: "多个渠道需要先投入时，时间和材料可能被分散，后续兑现却仍依赖不同条件。" },
  正官: { mechanism: "履责需要配套工具、时间和支持，责任落实与资源配置是否一致，会影响持续承担的空间。", opening: "把资源配置与实际承担事项对应，使已有支持更有效地服务明确责任。", tension: "责任增加但配套资源未跟上时，需要从原有安排中挪用时间或工具。" },
  七杀: { mechanism: "集中任务可能要求临时调配资源，紧迫需要能否被已有支持接住，比同时铺开更多事项更关键。", opening: "把可用支持集中到明确缺口，让现有资源先完成最关键的一环。", tension: "临时需要集中出现时，原本分配给其他事项的资源可能被占用。" },
  正印: { mechanism: "学习、工具或准备属于能力建设投入，其价值常要经过实际应用才显现，与眼前兑现可能不同步。", opening: "让已有准备直接服务正在推进的事项，使投入逐步转成可重复使用的能力。", tension: "准备和工具投入增加，而应用与兑现尚未跟上时，短期可使用资源会受到牵制。" },
  偏印: { mechanism: "专项试用会带来适配和维护成本，新方法能否解决真实需要，决定这些投入有没有持续用途。", opening: "在具体需要中验证工具和方法，保留确有用途、可重复使用的部分。", tension: "试用反复或用途不稳定时，投入可能停留在准备阶段，并挤占原来事项所需资源。" }
};

function practicalReading(domain: "career" | "wealth", c: Context): PracticalReading {
  if (c.age.stage === "adult") return (domain === "career" ? PRACTICAL_CAREER : PRACTICAL_WEALTH)[c.visible.god]!;
  const topic = SCHOOL[c.visible.god]!, early = c.age.stage === "young_child";
  return domain === "career" ? {
    mechanism: early ? "新的表达与活动需要反复回应，熟悉的节奏和能得到的帮助，会影响孩子如何参与。" : `${topic.focus}要通过具体任务体现；理解方法、实际尝试和完成所需时间，需要彼此配合。`,
    opening: early ? "在熟悉的陪伴和活动中逐步尝试，让表达与回应建立稳定配合。" : `把已有方法用于${topic.focus}对应的具体练习，逐步形成可看到的完成结果。`,
    tension: early ? "活动要求与日常节奏不一致时，需要照料者调整回应和陪伴安排。" : "额外要求或准备占用增多时，原定练习和完成节奏可能需要调整。"
  } : {
    mechanism: early ? "活动用品、陪伴与照料时间需要共同安排，增加一项活动也会改变家人的投入方式。" : `${topic.focus}所需的时间、材料与帮助需要落实；愿意参与和实际获得支持，可能处在不同节奏。`,
    opening: early ? "把已有陪伴和材料用于熟悉的活动，使日常需要得到稳定回应。" : "将已有材料、时间和协作支持用于明确事项，让资源发挥实际用途。",
    tension: early ? "不同活动争用照料时间或材料时，家人的原有安排可能需要协调。" : "几项需要同时使用材料或时间时，原定支持可能出现分配上的取舍。"
  };
}

function actor(stem: string, kind: Actor["kind"], revision: RevisionRecord, year: LocalAnnualYear, pattern: OutlookAxisFinding): Actor {
  const god = canonicalizeStrengthTenGod((LunarUtil.SHI_SHEN as Record<string, string>)[revision.facts.pillars.day.stem + stem]!);
  if (!CAREER[god]) throw new Error("年度领域解读缺少可识别十神。");
  const prefix = `流年${year.yearGanZhi}${kind === "visible" ? "透" : "藏"}${stem}（${god}）`;
  const evidence = pattern.evidence.filter((line) => line.startsWith(prefix));
  // Read the current judgment's exact actor attribution. No role is inferred
  // from the aggregate label or from the other branch. Unknown wording stays
  // unrecorded rather than being recomputed by a second classification table.
  const action = evidence.some((line) => line.endsWith("支持此路径分支。")) ? "support"
    : evidence.some((line) => line.endsWith("对该分支增加阻碍或负荷。")) ? "pressure"
      : evidence.some((line) => line.endsWith("未单独定向。")) ? "none" : "unrecorded";
  return { stem, god, kind, action, evidence };
}
function interactions(ganZhi: string, scope: Interaction["scope"], revision: RevisionRecord): Interaction[] {
  return (["year", "month", "day"] as const).flatMap((position) => {
    const natal = revision.facts.pillars[position].ganZhi;
    return calculatePillarRelations({ year: ganZhi, month: natal, day: ganZhi, hour: natal }).facts.filter((fact) => fact.completeness === "binary" && fact.participants.length === 2
      && RELATION_NAMES[fact.relationType] && fact.participants.some((part) => part.position === "year") && fact.participants.some((part) => part.position === "month"))
      .map((fact) => ({ scope, position, fact, text: `${scope === "annual" ? "流年" : "本段大运"}${ganZhi}与本命${LABELS[position]}${natal}有${RELATION_NAMES[fact.relationType]}（${fact.participants.map((part) => part.value).join("、")}）。` }));
  });
}
function topicFor(domain: "career" | "wealth", c: Context): Topic {
  if (c.age.stage === "adult") return (domain === "career" ? CAREER : WEALTH)[c.visible.god]!;
  const neutral = c.age.stage === "unknown", early = c.age.stage === "young_child", topic = SCHOOL[c.visible.god]!;
  if (domain === "career") return { headline: early ? "探索表达与日常习惯进入新的配合" : neutral ? `学习或协作中的${topic.focus}成为阅读重点` : `${topic.focus}成为本段学习与实践的重点`,
    focus: early ? "表达、游戏和日常活动" : topic.focus,
    examples: early ? ["新的游戏、表达或日常活动，需要照料者反复回应", "活动习惯与外部要求逐步建立熟悉的配合"] : [topic.example, "已有方法被用于一项具体学习、练习或协作事项"],
    watch: early ? "日常节奏、表达需要与照料回应" : "具体任务、完成方式与能得到的支持" };
  return { headline: neutral ? "日常资源用途与共同事项相衔接" : early ? "照料时间与活动条件需要衔接" : "学习与实践所需资源成为具体议题",
    focus: neutral ? "时间、材料与共同事项" : early ? "照料时间、日常用品与活动条件" : `${topic.focus}所需的时间、材料和活动条件`,
    examples: neutral ? ["一项日常或协作事项讨论需要哪些时间与材料", "已有资源与新的用途需要具体对应"] : early ? ["活动需求与照料时间需要配合", "家人协调日常用品、材料与陪伴安排"] : [`${topic.focus}对应的材料或活动条件进入讨论`, "不同学习或实践事项需要分配时间与可用支持"],
    watch: neutral ? "资源实际用途和共同使用方式" : "实际活动需要、可用材料与支持时间" };
}
function actorReading(c: Context): string {
  const term = (a: Actor) => a.action === "support" ? "在既有结构分支中提供支持" : a.action === "pressure" ? "在既有结构分支中增加牵制或负荷" : a.action === "none" ? "基础分支未单独定向，具体合克仍另行保留" : "未取得可单列的作用归因";
  return `${c.year.yearGanZhi}透${c.visible.stem}${c.visible.god}，${term(c.visible)}；${c.year.yearGanZhi![1]}支本气${c.main.stem}${c.main.god}${term(c.main)}。支内承接只说明可用条件，不当作该字已经透出或事情已经发生。`;
}
function domainReading(domain: AnnualReadingDomainId, c: Context): AnnualDomainReading {
  const personal = c.age.stage === "adult", basis = actorReading(c), pattern = c.pattern, group = strengthTenGodGroup(c.visible.god);
  const month = c.interactions.filter((item) => item.scope === "annual" && item.position === "month");
  const day = c.interactions.filter((item) => item.scope === "annual" && item.position === "day");
  const dayBranch = day.filter((item) => item.fact.relationType.startsWith("branch_"));
  const dayStem = day.filter((item) => item.fact.relationType.startsWith("stem_"));
  const oldDay = c.interactions.filter((item) => item.scope === "dayun" && item.position === "day");
  const monthClash = month.some((item) => item.fact.relationType.includes("clash"));
  const conditions = [...c.age.conditions, ...c.judgment.conditions,
    "这是依据传统计算与现代生活语境形成的可能事项，不是已经发生的事实；未给领域准确率、概率或收益保证。"];
  const evidence = [ `规则 ${ANNUAL_DOMAIN_READING_VERSION}；主路径 ${pattern.pathId}；本段原综合判断 ${c.judgment.headline}。`,
    `原节点 ${c.judgment.targetRef.nodeId}；区间 ${c.judgment.interval.startInstant} 至 ${c.judgment.interval.endExclusiveInstant}（不含终点）。`, ...c.visible.evidence, ...c.main.evidence ];
  if (c.age.stage === "adult_transition") conditions.push("本段跨18周岁：先按学习与实践理解，成年部分只有确有工作、合作或本人资源责任时才对照成人情境。");
  let title: string, headline: string, summary: string, paragraphs: string[], opportunities: string[], obstacles: string[], examples: string[], watchPoints: string[];
  if (domain === "relationship") {
    title = personal ? "关系与共同安排" : c.age.stage === "unknown" ? "关系与协作" : "家人与同伴";
    const clash = dayBranch.some((item) => item.fact.relationType === "branch_six_clash");
    const issue = group === "wealth" ? "共同投入、时间和资源安排" : group === "output" ? "表达方式、完成节奏与彼此期待" : group === "peer" ? "自主空间、平等分工与共同边界" : group === "resource" ? "支持方式、照顾与独立空间" : "责任、承诺与彼此承担";
    headline = dayBranch.length ? clash ? "共同安排更突出不同节奏的协调" : "共同意愿更容易进入具体安排" : dayStem.length ? "个人取舍与协作角色成为重点" : `${issue}构成本年的关系阅读重点`;
    summary = dayBranch.length ? `${c.year.yearGanZhi}与本命日支有${clash ? "冲" : "合"}，本段关系主题落在${issue}；${clash ? "已有约定可能需要回应不同任务或时间节奏" : "共同意愿可能走向更明确的参与、时间与责任安排"}。`
      : dayStem.length ? `${c.year.yearGanZhi}触及本命日干，个人决定与他人的要求需要衔接，本段更贴近角色协商与承诺安排。`
        : `本年可对照${issue}怎样承接实际任务。${oldDay.length ? "日支或日干的互动来自本段大运背景，当前流年没有重复当成一次新增关系转折。" : "当前覆盖的年度二元关系未检出日柱直接合冲，关系重点沿现有共同事项展开。"}`;
    paragraphs = [dayBranch.length ? personal ? "有亲近关系或长期合作时，具体表现可能是双方投入不同步，或共同计划从意愿转向实际安排。" : c.age.stage === "unknown" ? "年龄与具体关系身份未锁定，本项对应共同事项、沟通回应与实际参与方式，不预设照料或成人关系背景。" : "放在当前年龄中，具体对应照料、家人约定与同伴活动的相处节奏。"
      : dayStem.length ? personal ? "日干互动说明个人意愿与外部安排的联系，不能直接当作亲密关系或婚姻状态变化。" : "日干互动说明个人意愿与外部安排的联系，未据此推断具体关系状态改变。" : `透干${c.visible.stem}${c.visible.god}提示的${issue}只是共同事项语境，不另推断关系吉凶。`,
      ...(monthClash ? [`本年另有月柱冲动，外部${personal ? "学习或工作" : "学习、活动或协作"}安排的改变若确实发生，才会进一步影响共同时间与责任分配。`] : [])];
    opportunities = [dayBranch.length && !clash ? "把已有共同意愿落实为可持续的时间与参与方式。" : "已有关系或协作中，可以把各自实际需要与可承担范围具体表达出来。"];
    obstacles = dayBranch.length && clash ? ["双方任务、时间或期待可能不在同一节奏，需要重新协调原来默认的安排。"] : dayStem.length ? ["个人选择与共同承诺可能需要取舍，不能只按自己的推进节奏理解对方。"] : ["尚无可单列的年度关系阻碍；其他领域的总体助阻不直接当作关系结果。"];
    examples = c.age.stage === "young_child" ? ["照料者与孩子的日常回应方式进入磨合", "活动或陪伴安排改变后，需要建立熟悉的节奏"]
      : !personal && c.age.stage !== "unknown" ? ["家人约定的活动、作息或责任需要具体对应", "同伴参与方式与个人意愿进入讨论"]
        : dayBranch.length ? clash ? ["双方原来的时间安排不再完全一致，共同计划需要重排", "一方实际任务变化，牵动双方的投入与相处安排"] : ["共同活动或长期事项开始落实具体时间与参与责任", "既有意愿转为实际投入，双方需要确认承担范围"]
          : dayStem.length ? ["新的邀约或职责让个人安排与共同承诺需要对齐", "自己的参与方式与合作方的期待进入协商"] : [`一项已有共同事项开始讨论${issue}`, "沟通内容从笼统期待转向具体时间与实际参与方式"];
    watchPoints = ["现实中是否已有对应关系或合作背景", "实际时间投入、承诺履行与对方清楚表达的需要"];
    conditions.push(dayBranch.length ? "日支合冲不保证关系确定，也不等于分离或婚变。" : "未检出日支合冲不等于不会有关系变化；这里不借事业或资源的综合标签补造关系结论。");
    evidence.push(...[...day, ...oldDay, ...month].flatMap((item) => [item.text, item.fact.ruleId, item.fact.id]));
  } else {
    const topic = topicFor(domain, c), practical = practicalReading(domain, c), hiddenHelp = c.visible.action !== "support" && c.main.action === "support";
    title = domain === "career" ? personal ? "事业与任务" : c.age.stage === "unknown" ? "学习与协作任务" : "学习与实践" : personal ? "资源与兑现" : "资源与日常支持";
    headline = topic.headline;
    const route = FLOW.includes(pattern.pathId) ? "产出与资源兑现的衔接" : pattern.pathId === "resource-output" ? "学习支持经自身承接后转成成果" : pattern.pathId === "food-killings" ? "具体方法对接高要求任务" : ["official-resource", "killings-resource", "official-wealth"].includes(pattern.pathId) ? "职责与支持条件的配合" : "既有能力与实际任务的配合";
    summary = `${c.year.yearGanZhi}的${c.visible.stem}${c.visible.god}使${topic.focus}成为本段的前台主题；本命沿${route}发挥。${hiddenHelp ? `本段已算出的支持另来自${c.main.stem}${c.main.god}的支内承接，更像在具体任务中使用已有技能或条件，不能说${c.visible.stem}透干本身已带来这项助力。` : c.visible.action === "support" ? `透干${c.visible.stem}已有对应的结构支持，${domain === "career" ? "发挥点落在把本项能力用于明确任务" : "发挥点落在让实际投入与可兑现成果对接"}。` : c.visible.action === "pressure" ? `透干${c.visible.stem}也带来已识别的牵制，${domain === "career" ? "任务与完成条件需要同步" : "资源用途与可承担范围需要一并核对"}。` : "具体助力与牵制仍按本段列出的作用对象区分。"}`;
    const targeted = pattern.blockers.filter((text) => domain === "career" ? true : /财|食|伤|承接|负荷/.test(text));
    paragraphs = [practical.mechanism,
      ...(domain === "career" && month.length ? [monthClash
        ? `若现有${personal ? "工作或学习" : c.age.stage === "unknown" ? "日常协作" : "学习活动"}排期、任务接口或方法确有调整，原来的完成方式需要随之衔接，新的安排与旧任务可能在一段时间内并行。`
        : `现有方法与外部要求的配合更值得留意，能否得到接受、如何接入实际${personal ? "工作或学习" : "活动"}安排，会影响完成过程。`] : [])];
    opportunities = [hiddenHelp ? personal
      ? (domain === "career" ? PRACTICAL_CAREER : PRACTICAL_WEALTH)[c.main.god]!.opening
      : `${SCHOOL[c.main.god]!.focus}可成为使用已有方法和支持的切入点。`
      : practical.opening];
    obstacles = targeted.length || c.visible.action === "pressure" ? [practical.tension]
      : c.main.action === "pressure" ? [personal ? (domain === "career" ? PRACTICAL_CAREER : PRACTICAL_WEALTH)[c.main.god]!.tension : practical.tension]
        : [];
    if (c.balance?.effect === "obstructs" || c.balance?.effect === "mixed") obstacles.push(domain === "career"
      ? "任务增加时，完成时间与协助必须跟得上；可能需要分期推进或缩小同时承接的范围。"
      : personal ? "投入与兑现未必同步，实际可承担的时间和资源应与事项范围对应。" : "几项活动同时推进时，时间、材料和支持未必同时到位，需要分清先后安排。");
    conditions.push("可发挥之处是对应本段主题的现实着力点；没有被原判断单列支持的作用，不因此改判为有利。", "阻力文字转述原结构或扶抑中已识别的牵制；未另列阻力时，不等于现实没有困难。");
    examples = [...topic.examples];
    if (hiddenHelp) examples[0] = personal ? domain === "career" ? `协作或既有任务中，${SCHOOL[c.main.god]!.focus}成为具体完成条件，未必表现为公开角色变化` : `已有${SCHOOL[c.main.god]!.focus}被用于资源衔接，仍要经过实际完成与确认` : `${SCHOOL[c.main.god]!.example}，支内线索只说明可能使用的条件`;
    if (monthClash) examples.push(personal ? "若外部排期或工作接口确有调整，原来完成与资源衔接的安排需要重排" : "若学习或活动安排确有调整，原来的时间与材料衔接需要重排");
    watchPoints = [topic.watch, domain === "career" ? "已有方法是否真正用于本段任务、所需支持是否落实" : personal ? "资源实际来源、用途与可验证的兑现记录" : "资源实际来源、用途与事项的完成记录"];
    if (pattern.rescues.length) conditions.push(...pattern.rescues, "列出的救应只属于本分段；受牵连候选不能当成已完成保护，也不推广到另一顺逆分支。");
    if (c.seasonal && ["obstructs", "mixed"].includes(c.seasonal.effect)) conditions.push(`调候另有取舍：${c.seasonal.summary}；未将它直接换成事业或资源结果。`);
    evidence.push(basis, ...pattern.evidence, ...pattern.blockers, ...pattern.rescues, ...(c.balance?.evidence ?? []), ...(c.seasonal?.evidence ?? []), ...month.flatMap((item) => [item.text, item.fact.ruleId]));
  }
  return { id: domain, title, headline, summary, paragraphs, opportunities, obstacles, examples, watchPoints,
    conditions: unique(conditions), evidence: unique(evidence), sourceIds: unique(domain === "relationship" ? [] : [...pattern.sourceIds, ...(c.balance?.sourceIds ?? []), ...(c.seasonal?.sourceIds ?? [])]) };
}

/** Separate domain narratives for each supplied branch/segment. All fortune
 * judgments, intervals and background identities remain the upstream facts. */
export function buildAnnualDomainReading({ revision, assessment, year }: AnnualDomainReadingInput): LocalAnnualDomainReading {
  const r = revisionRecordSchema.parse(revision), includeHour = r.input.timePrecision !== "unknown_hour" && r.input.timePrecision !== "date_only";
  const sourceBinding = { revisionId: r.id, chartResultHash: r.manifest.resultHash, includeHour };
  if (assessment.sourceBinding.revisionId !== r.id || assessment.sourceBinding.chartResultHash !== r.manifest.resultHash || assessment.sourceBinding.includeHour !== includeHour) throw new Error("年度领域解读与初判来源不匹配。");
  // Reuse the existing pure branch/identity guard with a one-year envelope. It
  // supplies no facts and does not recalculate or replace the year's judgment.
  const checked = buildReadingTimeline({ revision: r, annual: { version: LOCAL_ANNUAL_OUTLOOK_VERSION, revisionId: r.id, chartResultHash: r.manifest.resultHash,
    startYear: year.year, endYear: year.year, yearBoundary: "原年度节点", summary: year.summary, years: [year], limitations: [] } });
  const judgments = [year.ownJudgment, year.judgment, ...year.judgmentSegments.map((segment) => segment.judgment)].filter((item): item is LocalOutlookJudgment => Boolean(item));
  const sourceVersions = unique([assessment.version, LOCAL_ANNUAL_OUTLOOK_VERSION, ...judgments.flatMap((item) => [item.version, item.policyVersion])]);
  const beforeBirth = Boolean(year.endExclusiveInstant && r.timeCalibration.utcInstant && Date.parse(year.endExclusiveInstant) <= Date.parse(r.timeCalibration.utcInstant));
  const unavailable = !year.transitNodeRef || !year.yearGanZhi || !year.startInstant || !year.endExclusiveInstant || year.label === "暂不可判";
  const base = { version: ANNUAL_DOMAIN_READING_VERSION, sourceBinding, sourceVersions, year: year.year, yearGanZhi: year.yearGanZhi, yearNodeRef: structuredClone(year.transitNodeRef), startInstant: year.startInstant, endExclusiveInstant: year.endExclusiveInstant,
    limitations: ["三个领域是传统计算的现代情境解释，没有独立准确率、吉凶分数或事件概率。", "各分支、交运段分别阅读；综合结论仅作背景，不复制为每个领域的结果。", "具体职业、收入、婚恋与家庭状态未知；可能情境须有对应现实背景，未断定收益、婚变或医疗事件。"] };
  if (beforeBirth || unavailable) return { ...base, status: beforeBirth ? "before_birth" : "unavailable", headline: beforeBirth ? `${year.year}年在出生之前` : `${year.year}年暂缺可用个人年度依据`, summary: year.summary, branches: [] };
  const expected = LunarUtil.JIA_ZI[((year.year - 1984) % 60 + 60) % 60];
  if (year.yearGanZhi !== expected) throw new Error("年度领域解读的年份与干支不匹配。");
  const mainStem = (LunarUtil.ZHI_HIDE_GAN as Record<string, string[]>)[year.yearGanZhi![1]!]![0]!;
  const branches: AnnualDomainBranch[] = checked.branches.map((branch) => {
    if (branch.id === "unresolved") throw new Error("年度领域解读缺少明确的条件分支。");
    const segments = year.judgmentSegments.filter((segment) => segment.branchId === branch.id).map((segment): AnnualDomainSegment => {
      const judgment = segment.judgment, pattern = judgment.axes.find((axis) => axis.axis === "pattern");
      if (!pattern) throw new Error("年度领域解读缺少当前分段的结构依据。");
      const age = buildLocalReadingAgeContext(r.timeCalibration.utcInstant, segment.startInstant, segment.endExclusiveInstant);
      const context: Context = { revision: r, assessment, year, judgment, pattern, age, visible: actor(year.yearGanZhi![0]!, "visible", r, year, pattern), main: actor(mainStem, "main_hidden", r, year, pattern),
        balance: judgment.axes.find((axis) => axis.axis === "balance"), seasonal: judgment.axes.find((axis) => axis.axis === "seasonal"),
        interactions: [...interactions(year.yearGanZhi!, "annual", r), ...judgment.backgroundRefs.flatMap((ref) => {
          const background = year.dayunSegments.find((item) => item.direction === branch.id && item.nodeRef.nodeId === ref.nodeId)!;
          return interactions(background.ganZhi, "dayun", r);
        })] };
      return { id: segment.id, branchId: segment.branchId, startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant, personalStartInstant: age.personalStartInstant,
        backgroundRefs: structuredClone(judgment.backgroundRefs), judgmentVersion: judgment.version, policyVersion: judgment.policyVersion,
        judgmentCaption: outlookDirectionCaption(judgment, year.label), ageStage: age.stage, ageLabel: age.label,
        domains: (["career", "wealth", "relationship"] as const).map((domain) => domainReading(domain, context)) };
    });
    return { id: branch.id, label: branch.label, segments, gaps: checked.gaps.filter((gap) => gap.branchId === branch.id).map(({ startInstant, endExclusiveInstant, message }) => ({ startInstant, endExclusiveInstant, message })),
      conditions: [...branch.conditions, ...year.conditions] };
  });
  const first = branches[0]?.segments[0];
  const headline = first ? `${year.year}年：${first.domains.map((domain) => domain.headline).join("；")}` : `${year.year}年暂缺可分段的个人年度依据`;
  const god = canonicalizeStrengthTenGod((LunarUtil.SHI_SHEN as Record<string, string>)[r.facts.pillars.day.stem + year.yearGanZhi![0]!]!);
  const group = strengthTenGodGroup(god);
  const relationFocus = group === "wealth" ? "共同投入与时间安排" : group === "output" ? "表达方式与彼此期待" : group === "peer" ? "自主空间与共同边界" : group === "resource" ? "支持方式与独立空间" : "责任与彼此承担";
  const summary = first ? `本年${first.ageStage === "adult" ? `任务重在${CAREER[god]!.focus}，资源重在${WEALTH[god]!.focus}` : first.ageStage === "young_child" ? "活动重在表达与熟悉节奏，资源重在陪伴和日常条件" : `学习或协作重在${SCHOOL[god]!.focus}，资源重在时间、材料与实际支持`}，关系关注${relationFocus}${branches.length > 1 ? "；顺逆未定时，各分支的助力与牵制分别阅读" : branches[0]!.segments.length > 1 ? "；交运前后按各段实际条件区分" : ""}。` : "当前缺少可分段的个人年度依据。";
  return { ...base, status: !first ? "unavailable" : branches.some((branch) => branch.gaps.length > 0) ? "partial" : "ready", headline, summary, branches };
}
