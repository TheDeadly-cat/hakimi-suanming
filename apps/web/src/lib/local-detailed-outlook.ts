import { storedRevisionRecordSchema, type RevisionRecord, type TransitNode, type TransitNodeRef, type TransitSnapshot } from "@hakimi/contracts";
import { calculateTransitSnapshot, CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR } from "@hakimi/transit-core";
import { calculateLuckCycle, type ExactLuckAge, type LuckCycleResult, type LuckDirection } from "@hakimi/luck-core";
import { calculatePillarRelations, type RelationType } from "@hakimi/relations-core";
import { strengthElementForStem, strengthElementLabel, type FiveElement } from "@hakimi/bazi-interpretation";
import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import type { AnnualDirection } from "./local-annual-outlook";
import { buildLocalOutlookJudgment, combineLocalOutlookJudgments,
  type LocalOutlookJudgment, type LocalOutlookJudgmentSegment } from "./local-outlook-judgment";
import { buildDetailedPersonalizedContent } from "./local-detailed-personalization";
import { getWorkingBalance } from "../../../../packages/bazi-interpretation/src/structural-strength-assessment";

export const LOCAL_DETAILED_OUTLOOK_VERSION = "hakimi.local-detailed-outlook/0.6.0" as const;
const ENGINE_RANGE = CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR.timeZoneDatabase.supportedRange;
export const LOCAL_DETAILED_QUERY_RANGE = Object.freeze({
  fromYear: Number(ENGINE_RANGE.from.slice(0, 4)),
  toYear: Number(ENGINE_RANGE.to.slice(0, 4)),
  // A complete Lichun year includes January and early February of the next year.
  monthlyToYear: Number(ENGINE_RANGE.to.slice(0, 4)) - 1
});
type BranchId = "locked" | "forward" | "backward";
type Status = "available" | "partial" | "unavailable";
export interface LocalDetailedTheme { id: "career" | "wealth" | "relationship"; title: string; text: string; evidence: string[] }
export interface LocalDetailedSensitivity { id: string; label: string; direction: AnnualDirection; evidence: string[] }
export interface LocalDetailedLuckSegment {
  ganZhi: string; stemTenGod: string; startInstant: string; endExclusiveInstant: string;
  sourceStartInstant: string; sourceEndExclusiveInstant: string; nodeRef: TransitNodeRef;
}
export interface LocalLifeDecade {
  id: string; index: number; branchId: BranchId; branchLabel: string; luckDirection: LuckDirection;
  ganZhi: string; stemTenGod: string; startInstant: string; endExclusiveInstant: string;
  startYear: number; endYear: number; ageLabel: string; isCurrent: boolean; stagePosition: "past" | "current" | "future";
  direction: AnnualDirection | null; headline: string; paragraphs: string[]; judgment: LocalOutlookJudgment;
  career: LocalDetailedTheme; wealth: LocalDetailedTheme; relationship: LocalDetailedTheme;
  evidence: string[]; conditions: string[]; sensitivity: LocalDetailedSensitivity[]; nodeRef: TransitNodeRef;
}
export interface LocalLifeBranch {
  id: BranchId; label: string; direction: LuckDirection | null; status: "available" | "unavailable";
  currentDecadeId: string | null; handoverInstant: string | null; summary: string; conditions: string[];
}
export interface LocalLifeOutlook {
  version: string; revisionId: string; chartResultHash: string;
  status: Status; referenceInstant: string; referenceLabel: string; summary: string;
  branches: LocalLifeBranch[]; decades: LocalLifeDecade[]; limitations: string[];
}
export interface LocalMonthlyBranch {
  id: BranchId; label: string; direction: AnnualDirection | null; summary: string;
  segments: LocalDetailedLuckSegment[]; evidence: string[]; conditions: string[];
  judgment: LocalOutlookJudgment | null; judgmentSegments: LocalOutlookJudgmentSegment[];
}
export interface LocalMonthlyPeriod {
  id: string; label: string; ganZhi: string; stemTenGod: string; startInstant: string; endExclusiveInstant: string;
  direction: AnnualDirection | null; ownDirection: AnnualDirection | null; headline: string; paragraphs: string[];
  themes: LocalDetailedTheme[]; evidence: string[]; conditions: string[]; branches: LocalMonthlyBranch[];
  sensitivity: LocalDetailedSensitivity[]; nodeRef: TransitNodeRef;
  judgment: LocalOutlookJudgment | null; ownJudgment: LocalOutlookJudgment | null; judgmentSegments: LocalOutlookJudgmentSegment[];
}
export interface LocalMonthlyOutlook {
  version: string; revisionId: string; chartResultHash: string;
  status: Status; year: number; yearGanZhi: string | null; startInstant: string | null; endExclusiveInstant: string | null;
  yearNodeRef: TransitNodeRef | null; summary: string; months: LocalMonthlyPeriod[]; limitations: string[];
}

type LuckContext = { id: BranchId; label: string; nodes: TransitNode[]; luck: LuckCycleResult | null; issue: string; source: TransitSnapshot["luckCycleRuleSource"] };
type PairFact = { type: RelationType; natalPosition: string | null; text: string };
type Balance = { favorable: readonly FiveElement[]; adverse: readonly FiveElement[] };
const POSITIONS = ["year", "month", "day", "hour"] as const;
const POSITION_LABELS = { year: "年柱", month: "月柱", day: "日柱", hour: "时柱" };
const BRANCH_ELEMENTS: Readonly<Record<string, FiveElement>> = { 子: "water", 丑: "earth", 寅: "wood", 卯: "wood", 辰: "earth", 巳: "fire", 午: "fire", 未: "earth", 申: "metal", 酉: "metal", 戌: "earth", 亥: "water" };
const PAIR_LABELS: Partial<Record<RelationType, string>> = { stem_five_combination: "天干五合", stem_clash: "天干冲", branch_six_combination: "地支六合", branch_six_clash: "地支六冲" };
const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];
const fixedEight = (instant: string) => new Date(Date.parse(instant) + 8 * 3_600_000).toISOString().slice(0, 19);
const yearOf = (instant: string) => Number(fixedEight(instant).slice(0, 4));
const period = (node: Pick<TransitNode, "startInstant" | "endExclusiveInstant">) => `${fixedEight(node.startInstant).replace("T", " ")} 至 ${fixedEight(node.endExclusiveInstant).replace("T", " ")}（UTC+08，不含终点）`;
const BASE_LIMITATIONS = [
  "这些段落由本地规则生成，描述可关注的主题与条件，不保证升职、收益、婚恋变化或其他具体事件；没有概率或吉凶分数。",
  "方向来自扶抑、结构与调候的分轴判断；中和只表示扶抑未固定喜忌，结构及调候仍按具体条件独立解释。模型分歧与救应条件保留，不按票数或分数抵消。",
  "合冲只取关系引擎已计算的天干五合/冲、地支六合/六冲二元事实；合不等于合化或必成，冲不等于破败或必散。三合三会、刑害及完整藏干作用不在本层范围。",
  "大运按修订冻结的起运规则；节令月按固定 UTC+08 精确十二节，非公历自然月或农历月份。引擎节令精度为秒，工程事实仍不是外部历表金标或专家裁决。"
];

function capture(revision: RevisionRecord, assessment: BaziPreliminaryAssessment) {
  const savedRevision = storedRevisionRecordSchema.parse(structuredClone(revision));
  const savedAssessment = structuredClone(assessment);
  if (savedAssessment.sourceBinding.revisionId !== savedRevision.id
    || savedAssessment.sourceBinding.chartResultHash !== savedRevision.manifest.resultHash) {
    throw new Error("岁运深读与当前命盘初判不匹配，已拒绝混用。");
  }
  const includeHour = savedRevision.input.timePrecision !== "unknown_hour" && savedRevision.input.timePrecision !== "date_only";
  if (savedAssessment.sourceBinding.includeHour !== includeHour) {
    throw new Error("岁运深读的时柱使用范围与出生时间精度不匹配。");
  }
  return { revision: savedRevision, assessment: savedAssessment };
}
function assertYear(year: number, monthly = false) {
  const maximum = monthly ? LOCAL_DETAILED_QUERY_RANGE.monthlyToYear : LOCAL_DETAILED_QUERY_RANGE.toYear;
  if (!Number.isInteger(year) || year < LOCAL_DETAILED_QUERY_RANGE.fromYear || year > maximum) {
    throw new RangeError(`${monthly ? "完整节令年度" : "定位年度"}须为 ${LOCAL_DETAILED_QUERY_RANGE.fromYear}—${maximum} 内的整数。${monthly ? "末月会进入次年，不延伸到引擎声明范围外。" : ""}`);
  }
}
function judgmentDirection(judgment: LocalOutlookJudgment): AnnualDirection | null {
  return judgment.label === "条件性" || judgment.label === "暂不可判" ? null : judgment.label;
}
function influence(nodes: readonly TransitNode[], balance: Balance): { direction: AnnualDirection; evidence: string[] } {
  let favorable = false, adverse = false;
  const evidence = nodes.map((node) => {
    const [stem, branch] = [...node.ganZhi];
    const elements = [strengthElementForStem(stem!), BRANCH_ELEMENTS[branch!]];
    if (elements.some((element) => !element)) throw new Error("运限节点五行不可识别。");
    const roles = elements.map((element, index) => {
      const good = balance.favorable.includes(element!), bad = balance.adverse.includes(element!);
      favorable ||= good; adverse ||= bad;
      return `${index === 0 ? stem : branch}${strengthElementLabel(element!)}${good ? "属原计权扶抑有利" : bad ? "属原计权扶抑承压" : "原计权不固定定喜忌"}`;
    });
    return `${node.nodeType === "dayun" ? "大运" : node.nodeType === "year" ? "流年" : "节令月"}${node.ganZhi}：${roles.join("；")}。`;
  });
  return { direction: favorable && adverse ? "利弊并见" : adverse ? "有压力" : favorable ? "较顺" : "主题解读", evidence };
}
function sensitivities(nodes: readonly TransitNode[], assessment: BaziPreliminaryAssessment): LocalDetailedSensitivity[] {
  if (assessment.balance.direction !== "conditional") return [];
  return assessment.balance.scenarioDirections.map((scenario) => ({ id: scenario.id, label: `原计权对照：${scenario.label}`,
    ...influence(nodes, { favorable: scenario.favorableElements, adverse: scenario.unfavorableElements }) }));
}
function pairFacts(left: string, right: string, leftLabel: string, rightLabel: string, natalPosition: string | null): PairFact[] {
  const facts = calculatePillarRelations({ year: left, month: right, day: left, hour: right }).facts;
  return facts.filter((fact) => PAIR_LABELS[fact.relationType] && fact.completeness === "binary" && fact.participants.length === 2
    && fact.participants.some((part) => part.position === "year") && fact.participants.some((part) => part.position === "month"))
    .map((fact) => ({ type: fact.relationType, natalPosition,
      text: `${leftLabel}${left}与${rightLabel}${right}见${PAIR_LABELS[fact.relationType]}（${fact.participants.map((part) => part.value).join("—")}）；规则 ${fact.ruleId}。` }));
}
function natalFacts(node: TransitNode, revision: RevisionRecord, assessment: BaziPreliminaryAssessment): PairFact[] {
  return POSITIONS.filter((position) => position !== "hour" || assessment.sourceBinding.includeHour)
    .flatMap((position) => pairFacts(node.ganZhi, revision.facts.pillars[position].ganZhi,
      node.nodeType === "dayun" ? "大运" : "节令月", POSITION_LABELS[position], position));
}
async function luckContexts(revision: RevisionRecord, base: TransitSnapshot): Promise<LuckContext[]> {
  const ids: BranchId[] = revision.input.sex === "unspecified" ? ["forward", "backward"] : ["locked"];
  return Promise.all(ids.map(async (id): Promise<LuckContext> => {
    const label = id === "locked" ? "按当前起运规则" : id === "forward" ? "若按顺行" : "若按逆行";
    const snapshot = id === "locked" ? base : await calculateTransitSnapshot({ revision, atInstant: base.target.instant, manualDirection: id });
    if (!snapshot.tracks.dayun.length) return { id, label, nodes: [], luck: null,
      issue: snapshot.slots.dayun.status === "resolved" ? "未取得大运轨道。" : snapshot.slots.dayun.message, source: snapshot.luckCycleRuleSource };
    const luck = calculateLuckCycle({ schemaVersion: "1.0.0", birthInstant: revision.timeCalibration.utcInstant ?? "",
      sex: revision.input.sex, ...(id === "locked" ? {} : { manualDirection: id }),
      expectedYearGanZhi: revision.facts.pillars.year.ganZhi, expectedMonthGanZhi: revision.facts.pillars.month.ganZhi
    }, snapshot.luckCycleRuleSnapshot);
    for (const node of snapshot.tracks.dayun) {
      const decade = luck.decades.find((item) => item.index === node.index);
      if (!decade || decade.ganZhi !== node.ganZhi || decade.startInstant !== node.startInstant || decade.endExclusiveInstant !== node.endExclusiveInstant) {
        throw new Error("大运轨道与起运年龄事实不一致，已停止岁运深读。");
      }
    }
    return { id, label, nodes: snapshot.tracks.dayun, luck, issue: "", source: snapshot.luckCycleRuleSource };
  }));
}
function ageText(age: ExactLuckAge): string {
  const c = age.components;
  return `${c.years}岁${c.months ? `${c.months}个月` : ""}${c.days ? `${c.days}天` : ""}`;
}
function commonConditions(assessment: BaziPreliminaryAssessment): string[] {
  return [...getWorkingBalance(assessment).conditions];
}

export async function buildLocalLifeOutlook(
  rawRevision: RevisionRecord, rawAssessment: BaziPreliminaryAssessment, currentYear: number,
  options: { atInstant?: string } = {}
): Promise<LocalLifeOutlook> {
  assertYear(currentYear);
  const { revision, assessment } = capture(rawRevision, rawAssessment);
  const atInstant = options.atInstant ?? `${currentYear}-07-01T04:00:00.000Z`;
  if (!Number.isFinite(Date.parse(atInstant)) || yearOf(atInstant) !== currentYear) throw new RangeError("定位瞬时点须属于所选固定 UTC+08 年度。");
  const snapshot = await calculateTransitSnapshot({ revision, atInstant });
  const contexts = await luckContexts(revision, snapshot);
  const decades: LocalLifeDecade[] = [];
  const referenceInstant = snapshot.target.instant;
  const branches = contexts.map((context): LocalLifeBranch => {
    for (const node of context.nodes) {
      const age = context.luck!.decades.find((item) => item.index === node.index)!;
      const judgment = buildLocalOutlookJudgment(revision, assessment, { target: node });
      const facts = natalFacts(node, revision, assessment);
      const content = buildDetailedPersonalizedContent({ node, revision, assessment, judgment, facts, horizon: "decade" });
      const themes = content.themes;
      const current = Date.parse(node.startInstant) <= Date.parse(referenceInstant) && Date.parse(referenceInstant) < Date.parse(node.endExclusiveInstant);
      const conditions = [...commonConditions(assessment), ...judgment.conditions, ...content.conditions, ...(context.id !== "locked" ? [`${context.label}是条件分支，不能当作已确定顺逆。`] : []),
        ...(context.source === "legacy_inferred" ? ["旧修订未保存完整起运快照，此处明确沿用引擎的旧规则推断。"] : []),
        ...(yearOf(node.endExclusiveInstant) > LOCAL_DETAILED_QUERY_RANGE.toYear ? ["本阶段包含引擎1900—2100声明范围外的规则顺延时段；不据此开放区间外流年/月度查询。"] : [])];
      decades.push({ id: `${context.id}:${node.ref.nodeId}`, index: node.index!, branchId: context.id, branchLabel: context.label,
        luckDirection: context.luck!.direction.value, ganZhi: node.ganZhi, stemTenGod: node.stemTenGod,
        startInstant: node.startInstant, endExclusiveInstant: node.endExclusiveInstant, startYear: yearOf(node.startInstant), endYear: yearOf(node.endExclusiveInstant),
        ageLabel: `${ageText(age.startAge)}至${ageText(age.endAgeExclusive)}前（起运折算实足年龄，非虚岁；不足一天部分见精确交运时刻）`,
        isCurrent: current, stagePosition: current ? "current" : Date.parse(node.endExclusiveInstant) <= Date.parse(referenceInstant) ? "past" : "future",
        direction: judgmentDirection(judgment), headline: judgment.headline, judgment,
        paragraphs: content.paragraphs, career: themes[0]!, wealth: themes[1]!, relationship: themes[2]!,
        evidence: [...content.evidence, ...judgment.axes.flatMap((axis) => axis.evidence), ...facts.map((fact) => fact.text), `顺逆：${context.luck!.direction.value}，依据${context.luck!.direction.basis}。`, `起运算法${context.luck!.manifest.algorithmId}；节点${node.ref.nodeId}。`],
        conditions, sensitivity: sensitivities([node], assessment), nodeRef: node.ref });
    }
    const current = decades.find((item) => item.branchId === context.id && item.isCurrent);
    const next = current ? decades.find((item) => item.branchId === context.id && item.index === current.index + 1) : undefined;
    return { id: context.id, label: context.label, direction: context.luck?.direction.value ?? null,
      status: context.nodes.length ? "available" : "unavailable", currentDecadeId: current?.id ?? null,
      handoverInstant: context.luck?.handover.instant ?? null,
      summary: current ? `${context.id === "locked" ? "" : `${context.label}，`}当前行${current.ganZhi}大运。${current.paragraphs[0]}${next ? `下一次交运在${fixedEight(next.startInstant).replace("T", " ")}（UTC+08），转入${next.ganZhi}大运。` : ""}`
        : context.nodes.length ? `${context.label}，定位时刻${Date.parse(referenceInstant) < Date.parse(context.nodes[0]!.startInstant) ? "尚未交入第一步大运" : "已在本次计算的大运序列之外"}，不另造当前阶段。`
          : `${context.label}：${context.issue}`,
      conditions: context.issue ? [context.issue] : [] };
  });
  return { version: LOCAL_DETAILED_OUTLOOK_VERSION, revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
    status: decades.length === 0 ? "unavailable" : branches.some((item) => item.status === "unavailable") ? "partial" : "available",
    referenceInstant, referenceLabel: options.atInstant ? `${fixedEight(referenceInstant).replace("T", " ")}（UTC+08）定位` : `${currentYear}年7月1日12:00（UTC+08）定位，并非整年唯一大运`,
    summary: branches.map((branch) => branch.summary).join(" "),
    branches, decades, limitations: [...BASE_LIMITATIONS, `已列出${revision.input.sex === "unspecified" ? "顺行、逆行各自" : "当前规则"}全部已计算大运；这是起运阶段序列，不是寿命判断。`, "列表不补造出生至首步交运前的小运，也不把起运年龄简单当作公历周岁生日；当前阶段按列明的定位瞬时点判断。"] };
}

function overlapSegments(node: TransitNode, context: LuckContext): LocalDetailedLuckSegment[] {
  const start = Date.parse(node.startInstant), end = Date.parse(node.endExclusiveInstant);
  return context.nodes.filter((luck) => Date.parse(luck.startInstant) < end && Date.parse(luck.endExclusiveInstant) > start).map((luck) => ({
    ganZhi: luck.ganZhi, stemTenGod: luck.stemTenGod,
    startInstant: new Date(Math.max(start, Date.parse(luck.startInstant))).toISOString(),
    endExclusiveInstant: new Date(Math.min(end, Date.parse(luck.endExclusiveInstant))).toISOString(),
    sourceStartInstant: luck.startInstant, sourceEndExclusiveInstant: luck.endExclusiveInstant, nodeRef: luck.ref
  }));
}
function monthReading(node: TransitNode, year: TransitNode, contexts: LuckContext[], revision: RevisionRecord, assessment: BaziPreliminaryAssessment): LocalMonthlyPeriod {
  const beforeBirth = revision.timeCalibration.utcInstant !== null && Date.parse(node.endExclusiveInstant) <= Date.parse(revision.timeCalibration.utcInstant);
  if (beforeBirth) {
    const notice = "此节令月早于出生，只显示历法区间，不作个人运势或事务判断。";
    const calendarEvidence = [`${node.ganZhi}节令月，${period(node)}。`, `所属${year.ganZhi}立春年，${period(year)}。`];
    return { id: node.ref.nodeId, label: `${node.boundaryLabel ?? node.label}月`, ganZhi: node.ganZhi, stemTenGod: node.stemTenGod,
      startInstant: node.startInstant, endExclusiveInstant: node.endExclusiveInstant, direction: null, ownDirection: null,
      headline: `${node.ganZhi}月：出生前历法区间`, paragraphs: [notice],
      themes: ([{ id: "career", title: "事业与职责" }, { id: "wealth", title: "财务与资源" }, { id: "relationship", title: "关系与协作" }] as const)
        .map((theme) => ({ ...theme, text: notice, evidence: [...calendarEvidence] })),
      evidence: calendarEvidence, conditions: [notice], sensitivity: [], nodeRef: node.ref,
      judgment: null, ownJudgment: null, judgmentSegments: [],
      branches: contexts.map((context) => ({ id: context.id, label: context.label, direction: null, summary: notice,
        segments: [], evidence: [...calendarEvidence], conditions: [notice], judgment: null, judgmentSegments: [] })) };
  }
  const natal = natalFacts(node, revision, assessment);
  const yearFacts = pairFacts(node.ganZhi, year.ganZhi, "节令月", "流年", null);
  const ownJudgment = buildLocalOutlookJudgment(revision, assessment, { target: node });
  const branches = contexts.map((context): LocalMonthlyBranch => {
    const segments = overlapSegments(node, context);
    const covered = segments.reduce((sum, segment) => sum + Date.parse(segment.endExclusiveInstant) - Date.parse(segment.startInstant), 0);
    const complete = covered === Date.parse(node.endExclusiveInstant) - Date.parse(node.startInstant);
    const luckNodes = context.nodes.filter((luck) => segments.some((segment) => segment.nodeRef.nodeId === luck.ref.nodeId));
    const judgmentSegments: LocalOutlookJudgmentSegment[] = [];
    const birth = revision.timeCalibration.utcInstant ? Date.parse(revision.timeCalibration.utcInstant) : null;
    const addJudgmentSegment = (start: string, end: string, luck?: TransitNode) => {
      const personalStart = new Date(Math.max(Date.parse(start), birth ?? Date.parse(start))).toISOString();
      if (Date.parse(personalStart) >= Date.parse(end)) return;
      judgmentSegments.push({ id: `${context.id}:${node.ref.nodeId}:${luck?.ref.nodeId ?? "year-only"}:${personalStart}`,
        branchId: context.id, branchLabel: `${context.label} · ${luck ? `${luck.ganZhi}大运` : `${year.ganZhi}流年背景，大运未覆盖`}`,
        startInstant: personalStart, endExclusiveInstant: end,
        judgment: buildLocalOutlookJudgment(revision, assessment, { target: node, background: { year, ...(luck ? { dayun: luck } : {}) },
          startInstant: personalStart, endExclusiveInstant: end }) });
    };
    let cursor = node.startInstant;
    for (const segment of segments) {
      if (Date.parse(cursor) < Date.parse(segment.startInstant)) addJudgmentSegment(cursor, segment.startInstant);
      addJudgmentSegment(segment.startInstant, segment.endExclusiveInstant, luckNodes.find((item) => item.ref.nodeId === segment.nodeRef.nodeId)!);
      cursor = segment.endExclusiveInstant;
    }
    if (Date.parse(cursor) < Date.parse(node.endExclusiveInstant)) addJudgmentSegment(cursor, node.endExclusiveInstant);
    const judgment = combineLocalOutlookJudgments(ownJudgment, judgmentSegments, { incomplete: !complete });
    const interactions = luckNodes.flatMap((luck) => pairFacts(node.ganZhi, luck.ganZhi, "节令月", "大运", null));
    const content = buildDetailedPersonalizedContent({ node, revision, assessment, judgment, judgmentSegments, facts: [...natal, ...yearFacts, ...interactions], horizon: "month" });
    return { id: context.id, label: context.label, direction: complete ? judgmentDirection(judgment) : null, segments,
      judgment, judgmentSegments,
      summary: `${context.label}：${content.paragraphs[0]}${content.themes[0]!.text} ${segments.length > 1 ? "本月交运，前后判断分别保留。" : ""}${complete ? "" : "缺少大运的部分不补造判断。"}`,
      evidence: [...content.evidence, ...judgment.axes.flatMap((axis) => axis.evidence), ...interactions.map((fact) => fact.text), ...segments.map((segment) => `${segment.ganZhi}大运覆盖${period(segment)}。`)],
      conditions: [...content.conditions, ...judgment.conditions, ...(!complete ? [context.issue || "本月处于交运前或已计算大运范围边缘，保留已知部分，不补造缺失大运。"] : []), ...(context.id !== "locked" ? [`${context.label}尚未成为确定顺逆。`] : [])] };
  });
  const judgmentSegments = branches.flatMap((branch) => branch.judgmentSegments);
  const incomplete = branches.some((branch) => branch.segments.reduce((total, segment) =>
    total + Date.parse(segment.endExclusiveInstant) - Date.parse(segment.startInstant), 0) !== Date.parse(node.endExclusiveInstant) - Date.parse(node.startInstant));
  const judgment = combineLocalOutlookJudgments(ownJudgment, judgmentSegments, {
    incomplete, uncertainDirection: revision.input.sex === "unspecified"
  });
  const direction = judgmentDirection(judgment);
  const content = buildDetailedPersonalizedContent({ node, revision, assessment, judgment, judgmentSegments, facts: [...natal, ...yearFacts], horizon: "month" });
  const themes = content.themes;
  const conditions = [...commonConditions(assessment), ...content.conditions, ...judgment.conditions, ...unique(branches.flatMap((branch) => branch.conditions)),
    ...(revision.input.sex === "unspecified" ? ["顺逆未确定，月运合看按下方两个分支分别阅读。"] : [])];
  return { id: node.ref.nodeId, label: `${node.boundaryLabel ?? node.label}月`, ganZhi: node.ganZhi, stemTenGod: node.stemTenGod,
    startInstant: node.startInstant, endExclusiveInstant: node.endExclusiveInstant,
    direction, ownDirection: judgmentDirection(ownJudgment), judgment, ownJudgment, judgmentSegments,
    headline: judgment.headline.startsWith(node.ganZhi) ? judgment.headline : `${node.ganZhi}月：${judgment.headline}`,
    paragraphs: content.paragraphs, themes, evidence: [...content.evidence, ...ownJudgment.axes.flatMap((axis) => axis.evidence), ...natal.map((fact) => fact.text), ...yearFacts.map((fact) => fact.text), `所属流年${year.ganZhi}，${period(year)}。`],
    conditions, branches, sensitivity: sensitivities([node, year], assessment), nodeRef: node.ref };
}

/** Complete twelve-Jie year; every interval comes from the real transit engine. */
export async function buildLocalMonthlyOutlook(
  rawRevision: RevisionRecord, rawAssessment: BaziPreliminaryAssessment, year: number
): Promise<LocalMonthlyOutlook> {
  assertYear(year, true);
  const { revision, assessment } = capture(rawRevision, rawAssessment);
  const first = await calculateTransitSnapshot({ revision, atInstant: `${year}-07-01T04:00:00.000Z` });
  const contexts = await luckContexts(revision, first);
  if (first.slots.year.status !== "resolved") throw new Error("所选年度的立春边界未能解析。");
  const annual = first.slots.year.node;
  const nodes = new Map<string, TransitNode>();
  const collect = (snapshot: TransitSnapshot) => {
    for (const node of snapshot.tracks.month) {
      if (Date.parse(node.startInstant) >= Date.parse(annual.startInstant) && Date.parse(node.endExclusiveInstant) <= Date.parse(annual.endExclusiveInstant)) nodes.set(node.startInstant, node);
    }
  };
  collect(first);
  let cursor = annual.startInstant;
  const ordered: TransitNode[] = [];
  for (let index = 0; index < 12 && Date.parse(cursor) < Date.parse(annual.endExclusiveInstant); index += 1) {
    if (!nodes.has(cursor)) collect(await calculateTransitSnapshot({ revision, atInstant: cursor }));
    const node = nodes.get(cursor);
    if (!node) throw new Error("节令月区间存在缺口，未生成不完整或猜测的十二月序列。");
    ordered.push(node); cursor = node.endExclusiveInstant;
  }
  if (ordered.length !== 12 || cursor !== annual.endExclusiveInstant) throw new Error("节令月未精确覆盖立春至下一立春，已停止生成。");
  const months = ordered.map((node) => monthReading(node, annual, contexts, revision, assessment));
  return { version: LOCAL_DETAILED_OUTLOOK_VERSION, revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
    status: contexts.every((context) => context.nodes.length > 0) ? "available" : "partial", year,
    yearGanZhi: annual.ganZhi, startInstant: annual.startInstant, endExclusiveInstant: annual.endExclusiveInstant, yearNodeRef: annual.ref,
    summary: `${year} ${annual.ganZhi}年按立春至下一立春列出12个节令月；月主题随天干十神、本命互动与大运覆盖变化，不套用公历一日至月底。${revision.input.sex === "unspecified" ? "大运顺逆保留两个条件分支。" : "交运月按实际时刻分段。"}`,
    months, limitations: [...BASE_LIMITATIONS, `完整节令年查询为${LOCAL_DETAILED_QUERY_RANGE.fromYear}—${LOCAL_DETAILED_QUERY_RANGE.monthlyToYear}；${LOCAL_DETAILED_QUERY_RANGE.toYear}年的末段将进入引擎声明范围外，不生成完整月度断语。`, "大运、流年、流月是并行区间；月内交运按半开区间裁剪，不把月中某一天的大运替代整月。"] };
}
