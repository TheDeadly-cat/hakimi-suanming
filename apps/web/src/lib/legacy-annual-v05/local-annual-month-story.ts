/** Frozen compatibility-only implementation. Original SHA-256: aa365315478cd7b8ccbbb13fd0e403774be19ff3a05b05d6b7d7a3c6f2896d36.
 * Never use this module for current automatic reading output. Import paths only are relocated. */
import type { TransitNodeRef } from "@hakimi/contracts";
import type { AnnualReadingDomainId, AnnualDomainBranchId, AnnualDomainReading } from "../legacy-outlook-v09/local-annual-domain-reading";
import type { ReadingContextReference } from "../local-reading-context";
import { buildAnnualMonthContext, type BuildAnnualMonthContextInput, type AnnualMonth, type AnnualMonthPeriod } from "./annual-month-context";
import type { AnnualEventItem } from "./local-annual-event-reading";

export const LOCAL_ANNUAL_MONTH_STORY_VERSION = "hakimi.local-annual-month-story/0.4.0" as const;
export type AnnualMonthStoryPhase = "preparation" | "trial" | "delivery" | "confirmation" | "coordination" | "new_contact" | "relationship" | "continuation";
export interface AnnualMonthStoryAnnualReference {
  year: number; branchId: AnnualDomainBranchId; segmentId: string; itemId: string; domainId: AnnualReadingDomainId;
  startInstant: string; endExclusiveInstant: string; targetNodeKey: string; backgroundNodeKeys: string[];
}
export interface AnnualMonthStoryMonthlyReference {
  monthId: string; branchId: AnnualDomainBranchId; segmentId: string; domainId: AnnualReadingDomainId;
  startInstant: string; endExclusiveInstant: string; targetNodeKey: string; backgroundNodeKeys: string[];
}
export interface AnnualMonthStoryDomain {
  id: AnnualReadingDomainId; title: string; summary: string; examples: string[]; phase: AnnualMonthStoryPhase;
  connection: "linked" | "monthly_only" | "annual_background";
  links: { annualEvents: AnnualMonthStoryAnnualReference[]; monthlyDomain: AnnualMonthStoryMonthlyReference };
  /** Only the bridge's added reasoning is repeated here; links preserve access
   * to complete original summaries, conditions and evidence in both sources. */
  conditions: string[]; evidence: string[]; sourceIds: string[];
}
export interface AnnualMonthStoryPeriod {
  id: string; branchId: AnnualDomainBranchId; startInstant: string; endExclusiveInstant: string; personalStartInstant: string;
  judgmentCaption: string; annualJudgmentCaption: string | null; backgroundLabels: string[];
  ageLabel: string; domains: AnnualMonthStoryDomain[]; conditions: string[];
}
export interface AnnualMonthStoryBranch {
  id: AnnualDomainBranchId; label: string; periods: AnnualMonthStoryPeriod[];
  gaps: { source: "monthly" | "annual" | "link"; startInstant: string | null; endExclusiveInstant: string | null; message: string }[];
  conditions: string[];
}
export interface AnnualMonthStoryMonth {
  monthId: string; label: string; ganZhi: string; startInstant: string; endExclusiveInstant: string;
  status: "ready" | "before_birth" | "unavailable"; branches: AnnualMonthStoryBranch[];
}
export interface LocalAnnualMonthStory {
  version: typeof LOCAL_ANNUAL_MONTH_STORY_VERSION;
  sourceBinding: { caseId: string; revisionId: string; chartResultHash: string; includeHour: boolean };
  sourceVersions: string[]; contextRef: ReadingContextReference | null;
  year: number; yearGanZhi: string | null; startInstant: string | null; endExclusiveInstant: string | null;
  status: "ready" | "partial" | "before_birth" | "unavailable"; headline: string; summary: string;
  nodes: { key: string; ref: TransitNodeRef }[]; months: AnnualMonthStoryMonth[]; limitations: string[];
}

export type BuildAnnualMonthStoryInput = BuildAnnualMonthContextInput;
type WorkPhase = Exclude<AnnualMonthStoryPhase, "relationship" | "continuation">;
type YearTask = "study" | "proposal" | "delivery" | "settlement" | "work_change" | "new_collaboration" | "resource_moderation";
const unique = <T>(values: readonly T[]) => [...new Set(values)];
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const fail = (message: string): never => { throw new Error(`年度月份叙事：${message}`); };
const PHASES: Record<string, { phase: WorkPhase; title: string }> = {
  正印: { phase: "preparation", title: "准备与实际应用" }, 偏印: { phase: "trial", title: "专项方法的小范围尝试" },
  食神: { phase: "delivery", title: "稳定完成与质量复核" }, 伤官: { phase: "trial", title: "表达改法与具体试用" },
  正财: { phase: "confirmation", title: "确认成果与后续责任" }, 偏财: { phase: "new_contact", title: "新增需求与可参与范围" },
  比肩: { phase: "coordination", title: "独立负责与协作接口" }, 劫财: { phase: "coordination", title: "多人分工与共同承担" },
  正官: { phase: "coordination", title: "要求与承担范围对齐" }, 七杀: { phase: "coordination", title: "集中要求中的先后安排" },
};
const YEAR_FOCUS: Record<YearTask, { career: string; wealth: string }> = {
  study: { career: "本年重在把理解和准备真正用起来", wealth: "本年重在已有学习、材料和帮助的实际用途" },
  proposal: { career: "本年重在自己的解法怎样得到实际试用", wealth: "本年重在改法所需的投入是否真正值得继续" },
  delivery: { career: "本年重在持续完成与稳定呈现", wealth: "本年重在持续使用所需的投入与维护" },
  settlement: { career: "本年重在给已做的事一个明确回应", wealth: "本年重在说明已有投入的用途与剩余承担" },
  work_change: { career: "本年重在各自参与和承担怎样落实", wealth: "本年重在现有条件怎样对应各自承担的部分" },
  new_collaboration: { career: "本年重在不同需要和新参与如何接到实际行动", wealth: "本年重在新选择与既有投入之间的取舍" },
  resource_moderation: { career: "本年重在保留真正有用的支持，让准备接到实际完成", wealth: "本年重在区分仍不可缺的支持与用途重复的投入" },
};
function annualTask(item: AnnualEventItem): YearTask {
  if (item.origin.judgmentAxisIds.includes("pattern:resource-wealth")) return "resource_moderation";
  const prefix = `annual-event/${item.domain}/`, kind = item.origin.ruleId.startsWith(prefix) ? item.origin.ruleId.slice(prefix.length) : "";
  if (!["study", "proposal", "delivery", "settlement", "work_change", "new_collaboration"].includes(kind)) fail("年度同域条目没有已支持的任务规则，不能按标题猜测。");
  return kind as YearTask;
}

function contentFor(month: AnnualMonth, period: AnnualMonthPeriod, domain: AnnualDomainReading, items: AnnualEventItem[]): Pick<AnnualMonthStoryDomain, "title" | "summary" | "examples" | "phase" | "connection" | "conditions" | "evidence"> {
  const annual = items[0];
  const originalExample = domain.examples[0];
  if (!originalExample) fail("原月份领域缺少可读情境，不能为完整十二月编造例子。");
  if (domain.id === "relationship") {
    const facts = month.monthlyRelationshipFacts;
    const clash = facts.some((fact) => fact.relationType === "branch_six_clash"), joined = facts.some((fact) => fact.relationType === "branch_six_combination");
    const independent = clash || joined;
    const connection = annual ? independent ? "linked" : "annual_background" : "monthly_only";
    const summary = independent ? clash
      ? `${annual ? "年度相处主题在本月落到" : "本月独立的相处主题是"}时间、参与范围与分工的重新匹配；变化针对具体安排，不直接说明关系结束。`
      : `${annual ? "年度相处主题在本月落到" : "本月独立的相处主题是"}共同安排的具体确认，参与时间、回应与各自负责的部分需要形成可执行的约定。`
      : annual ? "这一段先沿年度已经列出的相处主题延续，落点仍是现实中的参与与回应；本月没有据独立关系线索另列推进或调整时点。"
        : "这一段按原月度相处主题阅读，没有同域年度应事条目可连接，也未由年度事业或资源判断补出关系事件。";
    const example = annual?.origin.contextSubjectId && annual.examples[0]
      ? `按已确认适用背景对照：${annual.examples[0]}` : independent ? originalExample
        : annual?.examples[0] ? `年度背景对照，不表示本月新发生：${annual.examples[0]}` : originalExample;
    return { title: independent ? clash ? "相处节奏与分工的调整" : "共同安排的具体确认" : annual ? "年度相处主题在本月延续" : "本月相处的独立主题",
      summary, examples: [example], phase: independent ? "relationship" : "continuation", connection,
      conditions: ["本层只采用本月独立日支六合、六冲事实；未增加月度配偶星触发，也不把年度星再现重复算作本月新事件。",
        ...(independent ? [] : ["没有另列月度关系时点不等于现实中没有关系活动。"]), ...(!annual ? ["本段没有同域年度应事条目。"] : [])],
      evidence: facts.map((fact) => `本月关系事实 ${fact.factId}；规则 ${fact.ruleId}；本命日柱${fact.natalGanZhi}。`) };
  }
  const task = PHASES[month.stemTenGod];
  if (!task) fail("月透干角色不可识别，不能按原正文猜测任务阶段。");
  const phase = task.phase;
  const pattern = period.monthlyJudgment.axes.find((axis) => axis.axis === "pattern") ?? fail("本月缺少同段原格局轴。");
  const actions = pattern.stemActions?.items ?? fail("本月缺少原透干与支内作用，不能借总方向编写角色表现。");
  const visible = actions.find((action) => action.visibility === "visible"), hidden = actions.find((action) => action.visibility === "main_hidden");
  if (!visible || !hidden || actions.length !== 2 || visible.stem !== month.ganZhi[0] || visible.tenGod !== month.stemTenGod) return fail("本月角色与同段作用来源不一致。");
  // The checked monthly domain is the single source of the monthly meaning.
  // Rewording ten-god roles here previously lost precise financial/support
  // mechanisms and could contradict the detailed reading for the same period.
  const focus = annual ? YEAR_FOCUS[annualTask(annual)][domain.id] : "这一段按本月已有的独立事项阅读";
  const prefix = `${month.ganZhi}月：`;
  if (!domain.headline.startsWith(prefix) || !domain.headline.slice(prefix.length).trim() || !domain.summary.trim()) return fail("原月份领域缺少完整主结论。");
  const title = domain.headline.slice(prefix.length), summary = `${focus}。${domain.summary}`;
  const examples = [...domain.examples];
  if (annual?.origin.contextSubjectId && annual.examples[0]) examples.push(`按本年已确认适用背景对照：${annual.examples[0]}`);
  return { title, summary, examples, phase,
    connection: annual ? "linked" : "monthly_only", conditions: [...(!annual ? ["本段没有同域年度应事条目，未从其他领域借入年度主题。"] : []),
      "月干主题与支内配合分别按原作用阅读；支内助力不改写为中性月干有利，未单列方向不等于没有具体生活主题。"],
    evidence: [`月度阶段文字采用原月透干${month.ganZhi[0]}${month.stemTenGod}的任务含义，不据此改写原方向。`,
      ...(annual ? [`年度任务取自原规则 ${annual.origin.ruleId}，原结构路径 ${annual.origin.judgmentAxisIds.join("、")}；未按年度标题猜测事件。`] : []),
      ...actions.map((action) => `${action.visibility === "visible" ? "月干" : "支本气"}${action.stem}${action.tenGod}：${action.effect}；同段 ${pattern.id} 的 evidence[${action.evidenceIndexes.join(",")}]、blockers[${action.blockerIndexes.join(",")}]、satisfiedConditions[${action.satisfiedConditionIndexes.join(",")}]。`),
      ...unique(actions.flatMap((action) => action.blockerIndexes.map((index) => pattern.blockers[index]!))),
      `同域原说明与情境见月领域引用「${domain.headline}」；本层沿用该段完整主结论与情境，不另用角色模板重述或定向。`] };
}

/** Rebuild the strict bridge first. Store only added prose and exact references;
 * all full source objects remain in the original annual/monthly report. */
export function buildAnnualMonthStory(input: BuildAnnualMonthStoryInput): LocalAnnualMonthStory {
  const context = buildAnnualMonthContext(input), table = new Map<string, TransitNodeRef>();
  const register = (ref: TransitNodeRef): string => {
    const previous = table.get(ref.nodeId);
    if (previous && stable(previous) !== stable(ref)) fail("相同节点标识对应不同完整引用，拒绝覆盖。");
    if (!previous) table.set(ref.nodeId, structuredClone(ref));
    return ref.nodeId;
  };
  const yearKey = context.yearNodeRef ? register(context.yearNodeRef) : null;
  const months = context.months.map((month): AnnualMonthStoryMonth => {
    const monthKey = register(month.nodeRef);
    return { monthId: month.monthId, label: month.label, ganZhi: month.ganZhi, startInstant: month.startInstant, endExclusiveInstant: month.endExclusiveInstant, status: month.status,
      branches: month.branches.map((branch): AnnualMonthStoryBranch => ({ id: branch.id, label: branch.label, gaps: structuredClone(branch.gaps), conditions: [...branch.conditions],
        periods: branch.periods.map((period): AnnualMonthStoryPeriod => {
          const monthlyKeys = period.monthlySegment.backgroundRefs.map(register), annualKeys = period.annualSegment?.backgroundRefs.map(register) ?? [];
          const domains = period.monthlySegment.domains.map((domain): AnnualMonthStoryDomain => {
            const items = period.annualSegment?.items.filter((item) => item.domain === domain.id) ?? [];
            if (items.length > 1) fail("同段同域有多项年度事项，当前衔接规则不能擅选或合并。");
            const text = contentFor(month, period, domain, items);
            const annualEvents: AnnualMonthStoryAnnualReference[] = items.map((item) => {
              if (!period.annualSegment || !yearKey) return fail("年度事项缺少完整节点或原分段。");
              return { year: context.year, branchId: branch.id, segmentId: period.annualSegment.id, itemId: item.id, domainId: domain.id,
                startInstant: period.annualSegment.startInstant, endExclusiveInstant: period.annualSegment.endExclusiveInstant, targetNodeKey: yearKey, backgroundNodeKeys: [...annualKeys] };
            });
            return { id: domain.id, ...text, links: { annualEvents, monthlyDomain: { monthId: month.monthId, branchId: branch.id,
              segmentId: period.monthlySegment.id, domainId: domain.id, startInstant: period.monthlySegment.startInstant,
              endExclusiveInstant: period.monthlySegment.endExclusiveInstant, targetNodeKey: monthKey, backgroundNodeKeys: [...monthlyKeys] } },
              sourceIds: unique([...domain.sourceIds, ...items.flatMap((item) => item.sourceIds)]) };
          });
          return { id: period.id, branchId: branch.id, startInstant: period.startInstant, endExclusiveInstant: period.endExclusiveInstant,
            personalStartInstant: period.monthlySegment.personalStartInstant, judgmentCaption: period.monthlySegment.judgmentCaption,
            annualJudgmentCaption: period.annualSegment?.judgmentCaption ?? null, backgroundLabels: [...period.monthlySegment.backgroundLabels], ageLabel: period.monthlySegment.ageLabel,
            domains, conditions: [...period.conditions] };
        }) })) };
  });
  return { version: LOCAL_ANNUAL_MONTH_STORY_VERSION, sourceBinding: { ...context.sourceBinding }, sourceVersions: unique([LOCAL_ANNUAL_MONTH_STORY_VERSION, ...context.sourceVersions]),
    contextRef: structuredClone(context.contextRef), year: context.year, yearGanZhi: context.yearGanZhi, startInstant: context.startInstant, endExclusiveInstant: context.endExclusiveInstant,
    status: context.status, headline: `${context.year}年主事项与十二节令月`,
    summary: context.status === "before_birth" ? "本年仅保留出生前历法月份，不作个人事项衔接。" : context.status === "unavailable" ? "本年缺少完整月份资料，未生成个人月度衔接。"
      : "沿十二节令月阅读本年主事项在准备、尝试、完成与确认等环节的不同侧重；每个实际分段保留自己的方向和条件。",
    nodes: [...table].map(([key, ref]) => ({ key, ref })), months,
    limitations: unique(["这些环节是年、月原主题的本地文字衔接，不表示同一个现实项目必定按月份依次发生。",
      "原年度事项、月度领域全文、方向与全部依据通过完整引用保留；没有新增领域评分或发生概率。", ...context.limitations]) };
}
