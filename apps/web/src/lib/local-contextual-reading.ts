import { getWorkingBalance } from "../../../../packages/bazi-interpretation/src/structural-strength-assessment";
import { revisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { LunarUtil } from "lunar-typescript";
import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import type { BaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { canonicalizeStrengthTenGod, strengthTenGodGroup } from "../../../../packages/bazi-interpretation/src/strength-policy";
import type { AnnualDomainReading, AnnualReadingDomainId, LocalAnnualDomainReading } from "./local-annual-domain-reading";
import { buildLocalReadingAgeContext, type LocalReadingAgeContext } from "./local-reading-age-context";
import { readingContextDraftSchema, READING_CONTEXT_WORK_LABELS, READING_CONTEXT_RELATIONSHIP_LABELS, type ReadingContextDraft } from "./local-reading-context";

export const LOCAL_CONTEXTUAL_READING_VERSION = "hakimi.local-contextual-reading/0.2.0" as const;
export const CONTEXTUAL_READING_VERSION = LOCAL_CONTEXTUAL_READING_VERSION;
type Chapter = "career" | "wealth" | "relationships";
export interface ContextualDomainReading {
  subjectId: string; title: string; headline: string; summary: string;
  paragraphs: string[]; examples: string[]; focus: string[]; basis: string[];
  contextLabel: string; sourceVersions: string[];
  scope: { kind: "natal"; chapterId: Chapter; referenceYear: number }
    | { kind: "annual"; year: number; branchId: string; segmentId: string; domainId: AnnualReadingDomainId; startInstant: string; endExclusiveInstant: string };
}
interface BaseInput { revision: RevisionRecord; assessment: BaziPreliminaryAssessment; context: ReadingContextDraft }
export interface ContextualNatalReadingsInput extends BaseInput { comprehensive: BaziComprehensiveReading; referenceYear: number }
export interface ContextualAnnualReadingsInput extends BaseInput { reading: LocalAnnualDomainReading }
type Work = Exclude<ReadingContextDraft["work"], "unspecified">;
type Relationship = Exclude<ReadingContextDraft["relationship"], "unspecified">;
type Mode = "prepare" | "apply" | "steady" | "proposal" | "realize" | "opportunity" | "standards" | "solve" | "cooperate";
type LifeText = { headline: string; paragraphs: string[]; examples: string[]; focus: string[] };
const unique = <T>(values: readonly T[]) => [...new Set(values)];

// Editorial translations of existing roles into a declared life setting. These
// select tasks and questions, never a new auspiciousness score or event forecast.
const MODES: Record<Mode, { label: string; mechanism: string; check: string }> = {
  prepare: { label: "准备与取舍", mechanism: "准备的价值要由实际用途检验；继续收集方法之前，先明确哪一部分已经足够开始。", check: "准备何时结束、哪些信息确实会改变行动" },
  apply: { label: "把理解变成可用成果", mechanism: "已有知识需要经过一次真实应用，才能知道自己缺的是理解、练习，还是接受方的支持。", check: "学到的方法有没有进入实际完成过程" },
  steady: { label: "持续完成与质量", mechanism: "一次完成与能够重复完成不同；维持质量所需的准备、维护和收尾，也要算进安排。", check: "下一次能否在相近条件下再次完成" },
  proposal: { label: "改进方法与表达", mechanism: "改法要先解决具体问题，再让接受方看见变化；表达领先于实施条件时，解释和返工反而会增加。", check: "改进解决了什么、由谁试用和反馈" },
  realize: { label: "已有事项的确认与收尾", mechanism: "已经投入的事情需要走到明确的确认节点；做完、被认可与后续责任落实，可能并不同步。", check: "完成、确认和后续承担是否逐项对应" },
  opportunity: { label: "外部选择与承接", mechanism: "新增选择需要与现有安排一起比较；先判断持续完成的条件，再决定是否增加投入。", check: "新事项占用什么、何时可以停止或调整" },
  standards: { label: "标准、责任与支持", mechanism: "要求越清楚，越需要把实际责任、决定权限和配套支持对齐；接受要求不等于已经具备完成条件。", check: "谁能决定、谁提供支持、以什么标准完成" },
  solve: { label: "集中要求下的解决顺序", mechanism: "集中出现的要求要先区分核心问题与附带任务；解决一次难点后留下可复用的方法，避免每次重新救急。", check: "最先要解决的缺口和可以分担的部分" },
  cooperate: { label: "自主与共同分工", mechanism: "各自忙碌未必等于共同事项推进；把独立负责、需要协商和共同使用的资源分开，才能减少重复与空缺。", check: "负责边界、交接接口和共同决定的事项" }
};
const RESOURCE_MODES: Record<Mode, { label: string; mechanism: string; check: string }> = {
  prepare: { label: "准备投入与使用目的", mechanism: "课程、材料和工具的准备先对应一个真实用途；已经拥有但尚未使用的资源，未必需要继续增加。", check: "新增准备解决什么缺口、现有资源能否先使用" },
  apply: { label: "让知识与工具投入发挥实际用途", mechanism: "知识和工具投入后，要核对是否进入实际任务；准备更充分不自动带来更多回报，能被使用和复用才说明投入有了落点。", check: "投入过的学习、工具和时间是否正在被使用" },
  steady: { label: "连续投入与维护成本", mechanism: "持续完成需要持续的时间、材料和维护支持；核对重复使用的成本，才能判断原有安排是否仍可维持。", check: "重复投入、维护时间与可用支持是否匹配" },
  proposal: { label: "试用成本与投入范围", mechanism: "新方案先安排有限的试用范围，把验证所需的投入与已经答应的日常需要分开；得到关注并不等于已形成可兑现的价值。", check: "试用需要多少时间材料、依据什么决定继续或停止" },
  realize: { label: "完成确认与后续资源责任", mechanism: "把已有事项的完成记录、确认条件和后续维护分开核对；已经付出与已经得到约定回应之间，仍可能有需要落实的环节。", check: "完成记录、约定回应与后续维护由谁承担" },
  opportunity: { label: "新增选择与现有投入的取舍", mechanism: "新增选择先看占用的是哪一份已有资源，以及不继续时会留下什么责任；不把可选事项增加理解成可用资源增加。", check: "前期投入、已有占用与退出后的责任" },
  standards: { label: "履责所需的配套资源", mechanism: "承担明确责任时，同步核对工具、时间和协助来自哪里；责任扩大而配套未变，会占用原来留给其他事项的资源。", check: "责任变化与配套工具、时间和支持是否同步" },
  solve: { label: "集中需要中的资源调配", mechanism: "几项需要同时出现时，先区分必须立即满足与可以调整的部分；把实际缺口说清楚，比笼统增加投入更容易找到合适支持。", check: "急需资源、已有替代方案与可调整的时间" },
  cooperate: { label: "共同使用与分摊边界", mechanism: "共同事项要分别记录谁提供、谁使用、谁决定，以及结束后仍有哪些责任；口头上的共同投入不能代替具体分摊安排。", check: "使用权限、分摊记录和结束后的责任" }
};
const WORK_RESOURCES: Record<Work, { headline: string; example: string; focus: string }> = {
  student: { headline: "把学习投入用到实际练习", example: "列出已经拥有的课程、材料和工具，先选一项用于当前作品，再决定是否补充", focus: "课程与材料用途、指导支持和实际使用记录" },
  employed: { headline: "核对履责投入与岗位配套", example: "针对新增职责列出所需工具、协作时间和已确认的配套，区分自己可调配与需要沟通的部分", focus: "岗位配套、已有待遇约定与责任所需资源" },
  self_employed: { headline: "分清试用投入、验收结算与维护", example: "把一项客户需求拆成试用成本、正式交付、验收付款约定和后续维护，分别留下可核对记录", focus: "试用成本、验收结算条件、维护责任与实际记录" },
  seeking_work: { headline: "让求职投入服务有效验证", example: "复盘一轮求职花费的时间、材料准备和交通，区分带来有效反馈的投入与反复消耗", focus: "求职成本、信息质量与可核实的支持" },
  caregiving: { headline: "把照料资源与分担安排落到实处", example: "为一周照料列出用品、时间和可落实的替补，核对哪些需要已有人负责、哪些仍有缺口", focus: "照料用品、可替代支持与持续分担" },
  retired: { headline: "让日常需要与兴趣投入相容", example: "把日常固定需要与新活动所需的时间、材料分开列出，先确认持续参与条件再作安排", focus: "日常需要、兴趣投入和已确认的支持来源" }
};
const WORK: Record<Work, { headline: string; mechanism: string; resource: string; example: string; support: string; brake: string; focus: string }> = {
  student: { headline: "让学习进入练习与反馈", mechanism: "把课程理解、练习和真实反馈连起来。成年学习者若已有实习安排，可把它作为检验所学的机会；没有实习时，课程作品和模拟任务同样可以提供反馈。",
    resource: "资源先落在学习时间、课程材料与可获得的指导。比较投入是否解决实际学习困难，不把成绩、证书或活动经历直接换成未来收入。", example: "选一份课程作品，记录初稿、指导意见与修改后结果", support: "老师、同伴或指导者给出的具体反馈", brake: "减少同时铺开的课程与练习，为完成一项成果留出时间", focus: "学习目标、练习记录和可得到的指导" },
  employed: { headline: "把职责、协作与交付接起来", mechanism: "在已任职的背景下，先把自己负责的结果与同事提供的条件分开。改进或承担新事项前确认接口和权限，避免用个人加量弥补整个流程的缺口。",
    resource: "资源围绕岗位工具、协作时间与已经明确的待遇约定来核对。职责增加时先查配套是否同步，不能从在职状态推断薪酬高低或必然加薪。", example: "把一项职责画成自己的交付、同事的输入和共同验收三个环节", support: "明确的权限、协作接口与验收反馈", brake: "先核对新增责任的支持条件，再增加承诺", focus: "职责边界、接口等待和验收标准" },
  self_employed: { headline: "把客户需求接到可持续交付", mechanism: "自营或自由职业需要同时处理需求、报价范围与交付后的维护。先用一个可完成的项目验证客户真正需要什么，再决定是否扩大服务，避免把询问或关注当成已确认订单。",
    resource: "分别记录可投入成本、约定的验收付款条件与后续维护。机会只有落实到明确约定才可继续评估；当前身份本身不证明客源、收入或盈利。", example: "给一个真实询问写清交付内容、修改次数、验收节点和后续维护边界", support: "客户确认的范围和可执行的验收约定", brake: "把试用与正式承诺分开，防止新增需求挤占已经答应的交付", focus: "需求验证、交付范围、维护与结算条件" },
  seeking_work: { headline: "用求职材料验证适配", mechanism: "求职阶段先把经历整理为对方能核实的成果，再通过岗位要求和面谈反馈检验适配。调整材料要围绕具体缺口，避免不断扩大投递范围却没有形成有效反馈。",
    resource: "资源落在求职时间、交通、学习或材料准备的实际成本。比较每项投入是否提高信息质量，不假定目前没有收入，也不把面谈、意向或口头约定当成录用。", example: "选一类目标岗位，用同一份成果记录核对三条要求，再依据实际反馈修改材料", support: "可核实的经历、岗位信息与具体反馈", brake: "缩小验证范围，先补一项明确差距而非同时追逐所有岗位", focus: "岗位证据、材料差距和实际反馈" },
  caregiving: { headline: "把照料分工与自己的恢复放在一起", mechanism: "照料家庭时，可持续的安排依赖任务交接和替代支持。把必须亲自完成的事项与可分担部分分开，给休息、个人事务和临时变化留下可执行的空间。",
    resource: "这里的资源包括照料时间、用品、家人协助与可使用的服务。先核对谁能持续提供支持，不从照料身份推断经济依赖，也不把增加投入当作照料质量的保证。", example: "把一周照料事项列出执行者、替补与交接信息，同时保留自己的休息时段", support: "能落实的替补、协助与清楚的交接信息", brake: "先减去无法持续的重复安排，不让所有缺口都由一人承担", focus: "任务交接、替代支持和恢复时间" },
  retired: { headline: "安排生活节奏与经验传承", mechanism: "退休背景下，行动重点可以是自己选择的生活项目、兴趣和经验分享。参与多少由实际意愿与精力决定，已有经验宜整理成他人可使用的形式，不必重新承担在职式的持续责任。",
    resource: "资源围绕日常需要、兴趣投入、时间使用和已经确认的支持安排。先分清持续承诺与一次性参与，不依据退休身份推断养老金、资产或家庭供养情况。", example: "选择一项自愿参与的活动，把经验整理成一次分享并明确之后是否继续承担", support: "可自定的参与节奏和实际愿意承接的伙伴", brake: "给新增活动设退出与调整空间，不把经验自动变成无限责任", focus: "自选目标、参与边界和持续投入" }
};
const RELATIONSHIP: Record<Relationship, { headline: string; mechanism: string; example: string; focus: string }> = {
  single: { headline: "在相识中保留自己的空间", mechanism: "单身背景下，关系主题先落在如何相识、表达需要和决定靠近的节奏。通过具体互动了解对方，同时保留独处与原有生活安排；结构上的合冲不能当作某人一定出现的信号。", example: "一次相识后分别记录自己喜欢的相处方式、需要保留的空间和还不了解的部分", focus: "相识节奏、个人边界与真实互动" },
  partnered: { headline: "把沟通变成可回应的承诺", mechanism: "已有伴侣时，把希望得到的回应、已经答应的事情与尚未达成共识的期待分开。共同计划先从能够兑现的小安排开始，不把一方的默认期待当成双方已经同意。", example: "讨论一项近期共同计划，分别说明愿意承担什么、需要什么支持以及变化时如何通知", focus: "沟通、承诺和彼此回应" },
  married: { headline: "让家务与共同安排能够持续", mechanism: "已婚背景下，亲近不仅是表达，也落实在家务、时间和共同决定的日常分配。看见隐性的提醒与协调负担，安排变化时重新协商，而不是只比较谁完成的事项更多。", example: "选一项经常反复协调的家务，分清执行、提醒、收尾和临时替补由谁承担", focus: "家务分工、共同决定与个人时间" },
  separated: { headline: "先明确边界，再重建日常安排", mechanism: "分开或分居时，先区分仍需协商的共同事务与可以各自决定的生活。沟通围绕明确事项和实际需要，不把原有相处惯性继续当成义务，也不由结构推断会复合或必须彻底结束。", example: "列出确实仍需沟通的事项，约定联系目的和方式，同时恢复自己的日常计划", focus: "联系边界、未结事项与生活重建" }
};
const GOD_MODE: Record<string, Mode> = { 比肩: "cooperate", 劫财: "cooperate", 食神: "steady", 伤官: "proposal", 正财: "realize", 偏财: "opportunity", 正官: "standards", 七杀: "solve", 正印: "apply", 偏印: "prepare" };
function natalMode(revision: RevisionRecord, reading: BaziComprehensiveReading): Mode {
  const path = reading.patternDiagnosis?.primaryPathId;
  if (["resource-output", "official-resource", "killings-resource"].includes(path ?? "")) return "apply";
  if (path === "resource-preservation") return "prepare";
  if (path === "food-killings") return "solve";
  if (path === "official-wealth") return "standards";
  if (path === "hurting-resource" || path === "hurting-wealth") return "proposal";
  if (path === "food-wealth") return "steady";
  if (["peer-output-wealth", "wealth-food"].includes(path ?? "")) {
    const positions = reading.sourceBinding.includeHour ? ["year", "month", "hour"] as const : ["year", "month"] as const;
    return positions.some((p) => canonicalizeStrengthTenGod(revision.facts.pillars[p].stemTenGod) === "伤官") ? "proposal" : "steady";
  }
  return "cooperate";
}
function checked(input: BaseInput, binding: BaziComprehensiveReading["sourceBinding"]) {
  const revision = revisionRecordSchema.parse(input.revision), context = readingContextDraftSchema.parse(input.context);
  const includeHour = revision.input.timePrecision !== "unknown_hour" && revision.input.timePrecision !== "date_only";
  for (const value of [input.assessment.sourceBinding, binding]) if (value.revisionId !== revision.id
    || value.chartResultHash !== revision.manifest.resultHash || value.includeHour !== includeHour) throw new Error("背景解读与原命盘或时辰范围不一致。");
  return { revision, context };
}
function yearAge(revision: RevisionRecord, year: number) {
  if (!Number.isInteger(year) || year < 1900 || year > 2099) throw new Error("背景解读年份无效。");
  return buildLocalReadingAgeContext(revision.timeCalibration.utcInstant, `${year}-01-01T00:00:00.000Z`, `${year + 1}-01-01T00:00:00.000Z`);
}
const inYears = (context: ReadingContextDraft, year: number) => context.fromYear <= year && year <= context.toYear;
const workApplies = (context: ReadingContextDraft, age: LocalReadingAgeContext) => context.work !== "unspecified" && (age.stage === "adult" || (context.work === "student" && ["young_child", "youth"].includes(age.stage)));
const relationshipApplies = (context: ReadingContextDraft, age: LocalReadingAgeContext) => context.relationship !== "unspecified" && age.stage === "adult";
const contextLabel = (context: ReadingContextDraft) => `${context.fromYear}—${context.toYear}年 · ${READING_CONTEXT_WORK_LABELS[context.work]} · ${READING_CONTEXT_RELATIONSHIP_LABELS[context.relationship]}（你填写的背景）`;
const noteBasis = (context: ReadingContextDraft) => context.notes ? [`个人备注（仅展示用户自述，不据此选取规则或推断事件）：${context.notes}`] : [];

export function contextualReadingApplicabilityNotes({ revision, context, year }: { revision: RevisionRecord; context: ReadingContextDraft; year: number }): string[] {
  const draft = readingContextDraftSchema.parse(context), age = yearAge(revision, year);
  if (!inYears(draft, year)) return [`${year}年不在所填背景的${draft.fromYear}—${draft.toYear}年范围内，原完整解读照常保留。`];
  return [
    ...(draft.work !== "unspecified" && !workApplies(draft, age) ? [`${age.label}：本阶段未套用“${READING_CONTEXT_WORK_LABELS[draft.work]}”身份，原学习、生活或中性叙述保持完整。`] : []),
    ...(draft.relationship !== "unspecified" && !relationshipApplies(draft, age) ? [`${age.label}：本阶段未套用成年婚恋背景，原人际与生活叙述保持完整。`] : [])
  ];
}
function workText(work: Work, domain: "career" | "wealth", mode: Mode, age: LocalReadingAgeContext, assessment: BaziPreliminaryAssessment): LifeText {
  const role = WORK[work], resource = WORK_RESOURCES[work], action = domain === "wealth" ? RESOURCE_MODES[mode] : MODES[mode], minorStudent = work === "student" && age.stage !== "adult";
  if (minorStudent) {
    const early = age.stage === "young_child";
    return { headline: `${early ? "学习活动与日常支持" : "学习实践与所需支持"}：${action.label}`,
      paragraphs: [early ? "当前按学习活动理解：通过游戏、表达和熟悉的小任务探索，在照料者回应下调整节奏。" : "当前按学习与同伴实践理解：把理解、练习和老师或同伴的反馈连起来。",
        action.mechanism, domain === "wealth" ? "资源只指活动时间、材料和可以得到的帮助，先协调实际需要与现有支持。" : "先选择能完整做完的一项活动，观察完成过程，而不是用结果给孩子贴能力标签。"],
      examples: [early ? "用熟悉的材料完成一个小活动，再看哪里需要陪伴或调整" : "完成一份练习或小组作品，保留具体反馈再作一次修改"], focus: [action.check, "任务大小、材料与指导支持"] };
  }
  const working = getWorkingBalance(assessment);
  const pace = working.direction === "support"
    ? `当前${working.label}判断要求先保留承接余地；在这项背景里，优先${role.brake}。`
    : working.direction === "drain"
      ? `当前${working.label}判断偏向把已有力量用于具体事项；可先用一个有限任务检验${action.check}，不据此扩大责任或投入。`
      : `当前工作判断没有固定喜忌；此处以${action.check}观察进展，不把身份本身换成顺逆结论。`;
  return { headline: `${domain === "career" ? role.headline : resource.headline}：${action.label}`,
    paragraphs: [domain === "career" ? role.mechanism : role.resource, action.mechanism, pace],
    examples: [`${domain === "career" ? role.example : resource.example}；重点核对${action.check}。`],
    focus: [domain === "career" ? role.focus : resource.focus, action.check, domain === "career" ? `支持是否落实：${role.support}` : "只使用实际确认的资源和约定，不从身份估算收入"] };
}
function relationshipText(revision: RevisionRecord, state: Relationship): LifeText {
  const role = RELATIONSHIP[state], god = canonicalizeStrengthTenGod(revision.facts.pillars.day.branchTenGods[0]!);
  const group = strengthTenGodGroup(god);
  const need = group === "peer" ? "日支的比劫主题对应自主和对等；共同事项与个人决定要分开，靠近不应以取消个人空间为前提。"
    : group === "resource" ? "日支的印星主题对应理解与支持；先确认此刻需要倾听还是建议，避免把提供帮助变成新增要求。"
      : group === "output" ? `日支${god}对应表达与日常回应；${god === "食神" ? "把重视落实为连续的小回应，比偶尔表现更方便观察" : "容纳不同意见，区分表达感受和请对方接受改法"}。`
        : group === "wealth" ? "日支的财星主题对应实际行动与生活安排；时间、照顾和协调也属于投入，不能只以效率衡量彼此。"
          : "日支的官杀主题对应约定与责任；把必须交代的共同安排和可以不同的个人习惯分开。";
  return { headline: role.headline, paragraphs: [role.mechanism, need], examples: [role.example], focus: [role.focus, "以真实回应核对需要，不预测对方身份或结果"] };
}
function createItem(scope: ContextualDomainReading["scope"], text: LifeText, context: ReadingContextDraft, basis: string[], versions: string[]): ContextualDomainReading {
  const domain = scope.kind === "natal" ? scope.chapterId : scope.domainId;
  const summaryIndex = domain === "relationship" || domain === "relationships" || text.paragraphs.length < 2 ? 0 : 1;
  return { subjectId: scope.kind === "natal" ? `contextual-chapter-${scope.chapterId}` : `contextual-annual-${scope.year}-${scope.segmentId}-${scope.domainId}`,
    title: domain === "career" ? "结合背景看学习与工作" : domain === "wealth" ? "结合背景看资源安排" : "结合背景看关系相处",
    headline: text.headline, summary: text.paragraphs[summaryIndex]!, paragraphs: text.paragraphs.filter((_, index) => index !== summaryIndex), examples: text.examples, focus: text.focus,
    basis: unique([...basis, ...noteBasis(context)]), contextLabel: contextLabel(context), sourceVersions: unique([LOCAL_CONTEXTUAL_READING_VERSION, ...versions]), scope };
}

/** The caller supplies a confirmed context draft. Its saved identity is attached
 * separately by the record layer. Originals, judgments and inputs stay untouched. */
export function buildContextualNatalReadings(input: ContextualNatalReadingsInput): ContextualDomainReading[] {
  const { revision, context } = checked(input, input.comprehensive.sourceBinding), year = input.referenceYear;
  const age = yearAge(revision, year);
  if (!inYears(context, year) || age.stage === "before_birth") return [];
  const mode = natalMode(revision, input.comprehensive), result: ContextualDomainReading[] = [];
  for (const id of ["career", "wealth", "relationships"] as const) {
    if (id === "relationships" ? !relationshipApplies(context, age) : !workApplies(context, age)) continue;
    const chapter = input.comprehensive.chapters.find((entry) => entry.id === id);
    if (!chapter) continue;
    const text = id === "relationships" ? relationshipText(revision, context.relationship as Relationship)
      : workText(context.work as Work, id, mode, age, input.assessment);
    if (id === "relationships") {
      // The existing chapter keeps day-stem expression separate from day-branch
      // joint arrangements; do not upgrade either into a relationship event.
      if (chapter.paragraphs[1]) text.paragraphs.push(`原局互动的适用范围：${chapter.paragraphs[1]}`);
    }
    result.push(createItem({ kind: "natal", chapterId: id, referenceYear: year }, text, context,
      [age.label, `原章判断：${chapter.headline}；${chapter.verdict}`, ...chapter.evidence,
        ...chapter.cautions, ...(input.comprehensive.patternDiagnosis?.conditions ?? [])],
      [input.assessment.version, input.comprehensive.version, ...(input.comprehensive.patternDiagnosis ? [input.comprehensive.patternDiagnosis.version] : [])]));
  }
  return result;
}
export function buildContextualAnnualReadings(input: ContextualAnnualReadingsInput): ContextualDomainReading[] {
  const { revision, context } = checked(input, input.reading.sourceBinding), reading = input.reading;
  yearAge(revision, reading.year);
  if (!inYears(context, reading.year) || ["before_birth", "unavailable"].includes(reading.status)) return [];
  const stem = reading.yearGanZhi?.[0];
  const god = stem ? canonicalizeStrengthTenGod((LunarUtil.SHI_SHEN as Record<string, string>)[revision.facts.pillars.day.stem + stem] ?? "") : "";
  const mode = GOD_MODE[god] ?? "cooperate", result: ContextualDomainReading[] = [];
  for (const branch of reading.branches) for (const segment of branch.segments) {
    if (segment.branchId !== branch.id) throw new Error("背景年度解读的分支归属不一致。");
    const age = buildLocalReadingAgeContext(revision.timeCalibration.utcInstant, segment.startInstant, segment.endExclusiveInstant);
    for (const domain of segment.domains) {
      if (domain.id === "relationship" ? !relationshipApplies(context, age) : !workApplies(context, age)) continue;
      const text = domain.id === "relationship" ? relationshipText(revision, context.relationship as Relationship)
        : workText(context.work as Work, domain.id, mode, age, input.assessment);
      text.headline = `${reading.year}年 · ${text.headline}`;
      if (domain.id === "relationship") text.paragraphs.push(`本段已有互动说明：${domain.summary}`);
      else {
        const role = WORK[context.work as Work];
        const actorBasis = domain.evidence.find((line) => reading.yearGanZhi && line.startsWith(`${reading.yearGanZhi}透`));
        if (actorBasis) text.paragraphs.push(`本段已有作用依据：${actorBasis}`);
        text.paragraphs.push(`本段原综合判断为“${segment.judgmentCaption}”。${domain.opportunities.length ? `原文列出的发挥机会，需要${role.support}才能在这一背景里落实。` : "原领域没有单列可直接采用的发挥机会，先按实际任务核对条件。"}${domain.obstacles.length ? `原文保留的阻力，应结合“${role.brake}”处理。` : "原领域没有单列阻力，仍保留综合判断与原有条件，不据此断言事情自然顺利。"}背景只帮助选具体事项，未据此另算事业或资源吉凶。`);
      }
      result.push(createItem({ kind: "annual", year: reading.year, branchId: branch.id, segmentId: segment.id, domainId: domain.id,
        startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant }, text, context,
        annualBasis(domain, branch.label, segment.judgmentCaption, age.label, god, segment.backgroundRefs.map((ref) => ref.nodeId), branch.conditions),
        [input.assessment.version, reading.version, ...reading.sourceVersions, segment.judgmentVersion, segment.policyVersion]));
    }
  }
  return result;
}
function annualBasis(domain: AnnualDomainReading, branchLabel: string, caption: string, age: string, god: string, backgrounds: string[], conditions: string[]) {
  return [`${branchLabel}；${age}；原综合判断：${caption}`, `流年透干十神：${god || "未列明"}；只选择生活议题，不据此再定支持或阻力。`,
    `本段大运引用：${backgrounds.join("、") || "无已绑定大运"}`, `原领域说明：${domain.summary}`,
    ...domain.opportunities.map((line) => `原领域机会说明：${line}`), ...domain.obstacles.map((line) => `原领域阻力说明：${line}`),
    ...domain.evidence, ...domain.conditions, ...conditions];
}
