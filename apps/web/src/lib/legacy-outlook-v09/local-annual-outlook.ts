/** Frozen compatibility-only source. Original SHA-256: 58aec5a416c138aa54a48c808700e567799956c3dff7335062df25f9ae3e8209.
 * Replays historical choices only; never a current automatic reading. */
import type { RevisionRecord, TransitNode, TransitNodeRef, TransitSnapshot } from "@hakimi/contracts";
import { calculateTransitSnapshot } from "@hakimi/transit-core";
import { calculatePillarRelations, type RelationType } from "@hakimi/relations-core";
import {
  strengthElementForStem, strengthElementLabel,
  type FiveElement
} from "@hakimi/bazi-interpretation";
import type { BaziPreliminaryAssessment, PreliminaryBalanceDirection } from "../../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalOutlookJudgment, combineLocalOutlookJudgments, type LocalOutlookJudgment, type LocalOutlookJudgmentSegment } from "./local-outlook-judgment";
import { buildLocalReadingAgeContext, type LocalReadingAgeContext } from "../local-reading-age-context";
import { annualAgeSetting, annualAgeTopic } from "../local-annual-age-themes";
import { getWorkingBalance } from "../../../../../packages/bazi-interpretation/src/structural-strength-assessment";

export const LOCAL_ANNUAL_OUTLOOK_VERSION = "hakimi.local-annual-outlook/0.8.0" as const;
export type AnnualDirection = "较顺" | "主题解读" | "有压力" | "利弊并见" | "条件性";
export type AnnualOutlookLabel = AnnualDirection | "条件性" | "暂不可判";
export interface LocalAnnualInfluence {
  direction: AnnualDirection | null;
  summary: string;
  evidence: string[];
}
export interface LocalAnnualTheme {
  id: "career" | "relationship" | "change";
  title: string;
  text: string;
  evidence: string[];
}
export interface LocalAnnualScenario {
  id: string;
  label: string;
  balanceDirection: PreliminaryBalanceDirection;
  direction: AnnualDirection;
  summary: string;
  evidence: string[];
}
export interface LocalAnnualDayunSegment {
  ganZhi: string;
  stemTenGod: string;
  startInstant: string;
  endExclusiveInstant: string;
  sourceStartInstant: string;
  sourceEndExclusiveInstant: string;
  direction: "locked" | "forward" | "backward";
  nodeRef: TransitNodeRef;
}
export interface LocalAnnualYear {
  year: number;
  label: AnnualOutlookLabel;
  summary: string;
  atInstant: string;
  startInstant: string | null;
  endExclusiveInstant: string | null;
  yearGanZhi: string | null;
  dayunGanZhi: string | null;
  dayunStatus: "resolved" | "partial" | "unavailable";
  dayunSegments: LocalAnnualDayunSegment[];
  yearInfluence: LocalAnnualInfluence;
  decadeInfluence: LocalAnnualInfluence;
  primaryTheme: LocalAnnualTheme;
  themes: LocalAnnualTheme[];
  evidence: string[];
  conditions: string[];
  scenarioBranches: LocalAnnualScenario[];
  transitNodeRef: TransitNodeRef | null;
  judgment: LocalOutlookJudgment | null;
  ownJudgment: LocalOutlookJudgment | null;
  judgmentSegments: LocalOutlookJudgmentSegment[];
}
export interface LocalAnnualOutlook {
  version: string;
  revisionId: string;
  chartResultHash: string;
  startYear: number;
  endYear: number;
  yearBoundary: string;
  summary: string;
  limitations: string[];
  years: LocalAnnualYear[];
}

type BalanceCase = {
  id: string; label: string; direction: PreliminaryBalanceDirection;
  favorableElements: readonly FiveElement[]; unfavorableElements: readonly FiveElement[];
};
type LuckContext = {
  id: "locked" | "forward" | "backward";
  label: string;
  nodes: TransitNode[];
  unavailable: string;
};
type PairFact = { type: RelationType; natalPosition: string | null; text: string };
const POSITIONS = ["year", "month", "day", "hour"] as const;
const POSITION_LABELS = { year: "年柱", month: "月柱", day: "日柱", hour: "时柱" };
const BRANCH_ELEMENT: Readonly<Record<string, FiveElement>> = {
  子: "water", 丑: "earth", 寅: "wood", 卯: "wood", 辰: "earth", 巳: "fire",
  午: "fire", 未: "earth", 申: "metal", 酉: "metal", 戌: "earth", 亥: "water"
};
const PAIR_LABELS: Partial<Record<RelationType, string>> = {
  stem_five_combination: "天干五合", stem_clash: "天干冲",
  branch_six_combination: "地支六合", branch_six_clash: "地支六冲"
};
const unique = <T>(items: readonly T[]): T[] => [...new Set(items)];
const fixedEightDate = (instant: string) => new Date(Date.parse(instant) + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
const directionLabel = (direction: BalanceCase["direction"]) =>
  direction === "support" ? "按需要生扶的判断" : direction === "drain" ? "按需要泄耗制的判断" : direction === "conditional" ? "按具体任务取舍" : "按中和判断";

function balanceCases(assessment: BaziPreliminaryAssessment): BalanceCase[] {
  const balance = assessment.balance;
  const working = getWorkingBalance(assessment);
  const baseline: BalanceCase = {
    id: "working", label: `当前工作判断（${working.label}，${directionLabel(working.direction)}）`, direction: working.direction,
    favorableElements: working.favorableElements, unfavorableElements: working.unfavorableElements
  };
  const cases = new Map<string, BalanceCase>();
  let sharedRawCase = false;
  for (const scenario of balance.scenarioDirections) {
    if (working.selection === "raw_fallback" && scenario.direction === working.direction
      && JSON.stringify([...scenario.favorableElements].sort()) === JSON.stringify([...working.favorableElements].sort())
      && JSON.stringify([...scenario.unfavorableElements].sort()) === JSON.stringify([...working.unfavorableElements].sort())) {
      sharedRawCase = true;
      continue;
    }
    const key = `${scenario.direction}:${[...scenario.favorableElements].sort()}:${[...scenario.unfavorableElements].sort()}`;
    const existing = cases.get(key);
    if (existing) existing.label += ` / ${scenario.label}`;
    else cases.set(key, { id: `raw-${scenario.id}`, label: `原计权对照：${directionLabel(scenario.direction)}（${scenario.label}）`,
      direction: scenario.direction, favorableElements: scenario.favorableElements, unfavorableElements: scenario.unfavorableElements });
  }
  if (sharedRawCase) baseline.label += " · 原计权同值场景共用（完整六场景见原计权对照）";
  return [baseline, ...cases.values()];
}

// No point score or probability: each stem/branch is explicitly favorable,
// unfavorable or unclassified on the balance axis. Seasonal advice is not read.
function nodeInfluence(node: TransitNode, balance: BalanceCase) {
  const [stem, branch] = Array.from(node.ganZhi);
  const elements = [strengthElementForStem(stem!), BRANCH_ELEMENT[branch!]];
  if (!elements[1]) throw new Error("无法识别运限节点地支五行。");
  const favorable = elements.some((element) => balance.favorableElements.includes(element!));
  const adverse = elements.some((element) => balance.unfavorableElements.includes(element!));
  const text = elements.map((element, index) => {
    const role = balance.favorableElements.includes(element!) ? "扶抑有利" : balance.unfavorableElements.includes(element!) ? "扶抑承压" : "不固定定喜忌";
    return `${index === 0 ? stem : branch}${strengthElementLabel(element!)}：${role}`;
  }).join("；");
  return { favorable, adverse, text: `${node.nodeType === "year" ? "流年" : "大运"}${node.ganZhi}，${text}。` };
}

function combineInfluences(nodes: TransitNode[], balance: BalanceCase): { direction: AnnualDirection; evidence: string[] } {
  const factors = nodes.map((node) => nodeInfluence(node, balance));
  const favorable = factors.some((factor) => factor.favorable);
  const adverse = factors.some((factor) => factor.adverse);
  return {
    direction: favorable && adverse ? "利弊并见" : adverse ? "有压力" : favorable ? "较顺" : "主题解读",
    evidence: factors.map((factor) => factor.text)
  };
}

function pairFacts(left: string, right: string, leftLabel: string, rightLabel: string, natalPosition: string | null): PairFact[] {
  // The public relations engine accepts four positions. Only its exact binary
  // year/month pair is retained; placeholder positions and triads are excluded.
  const facts = calculatePillarRelations({ year: left, month: right, day: left, hour: right }).facts;
  return facts.filter((fact) => PAIR_LABELS[fact.relationType]
    && fact.completeness === "binary" && fact.participants.length === 2
    && fact.participants.some((part) => part.position === "year")
    && fact.participants.some((part) => part.position === "month"))
    .map((fact) => ({ type: fact.relationType, natalPosition,
      text: `${leftLabel}${left}与${rightLabel}${right}见${PAIR_LABELS[fact.relationType]}（${fact.participants.map((part) => part.value).join("—")}）；依据 ${fact.ruleId}。` }));
}

function tenGodTheme(tenGod: string, age?: LocalReadingAgeContext): string {
  const canonical = tenGod.replaceAll("殺", "杀").replaceAll("傷", "伤").replaceAll("財", "财");
  // Modern topic wording, not an asserted event or a verbatim classical rule.
  const themes: Record<string, string> = {
    正官: "职责落实与规则考核", 七杀: "紧迫任务与压力应对", 偏官: "紧迫任务与压力应对",
    正印: "系统学习与资质准备", 偏印: "专项学习与支持渠道",
    食神: "稳定产出与技能应用", 伤官: "表达提案与方法调整",
    正财: "预算管理与稳定兑现", 偏财: "机会筛选与灵活资源安排",
    比肩: "自主推进与同辈协作", 劫财: "合作分工与资源边界"
  };
  const adult = themes[canonical] ?? "年度任务和协作安排";
  return age ? annualAgeTopic(canonical, age, adult) : adult;
}

function buildThemes(revision: RevisionRecord, assessment: BaziPreliminaryAssessment, annual: TransitNode,
  contexts: LuckContext[], segments: LocalAnnualDayunSegment[], age: LocalReadingAgeContext): LocalAnnualTheme[] {
  const facts: PairFact[] = [];
  for (const position of POSITIONS) {
    if (position === "hour" && !assessment.sourceBinding.includeHour) continue;
    facts.push(...pairFacts(annual.ganZhi, revision.facts.pillars[position].ganZhi, "流年", POSITION_LABELS[position], position));
  }
  const relevantLuck = contexts.flatMap((context) => context.nodes.filter((node) => segments.some((segment) => segment.nodeRef.nodeId === node.ref.nodeId)));
  for (const node of relevantLuck) {
    facts.push(...pairFacts(annual.ganZhi, node.ganZhi, "流年", "大运", null));
    for (const position of POSITIONS) {
      if (position === "hour" && !assessment.sourceBinding.includeHour) continue;
      facts.push(...pairFacts(node.ganZhi, revision.facts.pillars[position].ganZhi, "大运", POSITION_LABELS[position], position));
    }
  }
  const annualEvidence = `流年${annual.ganZhi}透干十神为${annual.stemTenGod}。`;
  const luckEvidence = unique(relevantLuck.map((node) => `大运${node.ganZhi}透干十神为${node.stemTenGod}。`));
  const relationshipFacts = unique(facts.filter((fact) => fact.natalPosition === "day" && fact.type.startsWith("branch_")).map((fact) => fact.text));
  const dayStemFacts = unique(facts.filter((fact) => fact.natalPosition === "day" && fact.type.startsWith("stem_")).map((fact) => fact.text));
  const clashFacts = unique(facts.filter((fact) => fact.type === "branch_six_clash" || fact.type === "stem_clash").map((fact) => fact.text));
  const annualClashes = clashFacts.filter((text) => text.startsWith("流年"));
  const combinationFacts = unique(facts.filter((fact) => fact.type === "branch_six_combination" || fact.type === "stem_five_combination").map((fact) => fact.text));
  const changesWithinContext = contexts.some((context) => segments.filter((segment) => segment.direction === context.id).length > 1);
  const setting = annualAgeSetting(age);
  const ageEvidence = `生活语境：${age.label}；${age.personalStartInstant} 至 ${annual.endExclusiveInstant}（不含终点）。`;
  return [{
    id: "career", title: setting.careerTitle, text: `本年可重点观察${tenGodTheme(annual.stemTenGod, age)}，对应${setting.arrangement}。${relevantLuck.length ? `大运背景涉及${unique(relevantLuck.map((node) => tenGodTheme(node.stemTenGod, age))).join("、")}；具体助力与牵制按上方分轴判断及条件阅读。` : "大运未完整覆盖，先作为流年主题参考。"}`,
    evidence: [annualEvidence, ...luckEvidence, ageEvidence]
  }, {
    id: "relationship", title: setting.relationshipTitle,
    text: relationshipFacts.length ? `流年或大运与本命日支有合冲联系，${setting.relationship}值得留意；合不等于必成，冲也不等于必散。`
      : dayStemFacts.length ? `与本命日干的互动使个人表达和外部要求之间的协调更突出，可从${setting.relationship}对照；日干互动本身不能推出亲密关系的变化。`
      : combinationFacts.length ? `其他位置有合的互动线索，可留意${setting.relationship}，结果仍取决于实际行动。`
        : `可从${tenGodTheme(annual.stemTenGod, age)}相关的沟通观察${setting.relationship}；本轮未检出所覆盖的日支合冲。`,
    evidence: [...(relationshipFacts.length || dayStemFacts.length ? [...relationshipFacts, ...dayStemFacts] : combinationFacts.length ? combinationFacts : [annualEvidence]), ageEvidence]
  }, {
    id: "change", title: "变动与节奏",
    text: changesWithinContext ? `本流年内有交运节点，前后背景不同，应分段看${setting.arrangement}的变化。`
      : annualClashes.length ? `本年有${annualClashes.length}条涉及流年的冲动线索，可关注任务重排、环境调整或计划变化；变动本身不预设好坏。`
        : clashFacts.length ? "大运背景已有冲的互动，本流年未在所覆盖的二元关系中新增冲；继续留意原有安排的调整。"
        : "本轮未出现所覆盖的冲或年内交运提示，可先按已有节奏推进；这不等于这一年不会变化。",
    evidence: [...clashFacts, ...segments.map((segment) => `${segment.direction === "locked" ? "锁定规则" : segment.direction === "forward" ? "顺行条件" : "逆行条件"}：${segment.ganZhi}覆盖 ${segment.startInstant} 至 ${segment.endExclusiveInstant}（不含终点）。`)]
  }];
}

function overlapSegments(annual: TransitNode, context: LuckContext) {
  const start = Date.parse(annual.startInstant), end = Date.parse(annual.endExclusiveInstant);
  return context.nodes.filter((node) => Date.parse(node.startInstant) < end && Date.parse(node.endExclusiveInstant) > start)
    .map((node) => ({ node, segment: {
      ganZhi: node.ganZhi, stemTenGod: node.stemTenGod,
      startInstant: new Date(Math.max(start, Date.parse(node.startInstant))).toISOString(),
      endExclusiveInstant: new Date(Math.min(end, Date.parse(node.endExclusiveInstant))).toISOString(),
      sourceStartInstant: node.startInstant, sourceEndExclusiveInstant: node.endExclusiveInstant,
      direction: context.id, nodeRef: node.ref
    } satisfies LocalAnnualDayunSegment }));
}

function buildDecadeInfluence(annual: TransitNode, contexts: LuckContext[], balance: BalanceCase, age: LocalReadingAgeContext): LocalAnnualInfluence {
  const branches = contexts.map((context) => {
    const overlaps = overlapSegments(annual, context);
    const coverage = overlaps.reduce((sum, { segment }) => sum + Date.parse(segment.endExclusiveInstant) - Date.parse(segment.startInstant), 0);
    const complete = coverage === Date.parse(annual.endExclusiveInstant) - Date.parse(annual.startInstant);
    const combined = combineInfluences(overlaps.map(({ node }) => node), balance);
    const periods = overlaps.map(({ node, segment }) => {
      const own = combineInfluences([node], balance);
      const timing = overlaps.length > 1 ? `${fixedEightDate(segment.startInstant)}（UTC+08）起，` : "";
      return `${timing}${node.ganZhi}大运${own.direction}，主题为${tenGodTheme(node.stemTenGod, age)}`;
    });
    return {
      direction: complete ? combined.direction : null,
      summary: `${context.id === "locked" ? "" : `${context.label}：`}${periods.join("；") || "未取得大运覆盖"}。${complete ? "" : "仅供已有时段参考，未覆盖部分不作判断。"}`,
      evidence: combined.evidence.map((text) => `${context.label}：${text}`)
    };
  });
  const directions = unique(branches.map((branch) => branch.direction));
  return {
    direction: directions.length === 1 ? directions[0]! : null,
    summary: branches.length ? branches.map((branch) => branch.summary).join(" ") : "大运未能解析，先读本年自身主题。",
    evidence: branches.flatMap((branch) => branch.evidence)
  };
}

function buildPrimaryTheme(annual: TransitNode, themes: LocalAnnualTheme[], contexts: LuckContext[], segments: LocalAnnualDayunSegment[], age: LocalReadingAgeContext): LocalAnnualTheme {
  const ownTheme = tenGodTheme(annual.stemTenGod, age);
  const setting = annualAgeSetting(age);
  const ownEvidence = `流年${annual.ganZhi}透干十神为${annual.stemTenGod}。`;
  const handovers = contexts.filter((context) => segments.filter((segment) => segment.direction === context.id).length > 1);
  if (handovers.length) {
    const changes = handovers.map((context) => {
      const parts = segments.filter((segment) => segment.direction === context.id);
      return `${context.id === "locked" ? "" : `${context.label}，`}${parts.map((segment, index) =>
        index === 0 ? `${segment.ganZhi}大运` : `${fixedEightDate(segment.startInstant)}（UTC+08）起转入${segment.ganZhi}大运`).join("，")}`;
    });
    return { id: "change", title: `交运前后的${ownTheme}`,
      text: `本年重点是${ownTheme}，并按交运前后分段安排：${changes.join("；")}。交运只提示背景切换，不单独定吉凶。`,
      evidence: [ownEvidence, ...segments.map((segment) => `${segment.ganZhi}大运：${segment.startInstant} 至 ${segment.endExclusiveInstant}（不含终点，${segment.direction}）。`)] };
  }
  const ownRelationship = themes.find((theme) => theme.id === "relationship")!.evidence
    .filter((text) => text.startsWith("流年") && text.includes("与日柱") && text.includes("地支"));
  if (ownRelationship.length) {
    return { id: "relationship", title: `${ownTheme}中的关系与协作`,
      text: `本年重点是${ownTheme}；流年与日支有合冲互动，${setting.relationship}宜一并安排。合冲本身不决定成败或聚散。`,
      evidence: [ownEvidence, ...ownRelationship] };
  }
  return { id: "career", title: ownTheme, text: `本年重点是${ownTheme}，可对应${setting.arrangement}。`, evidence: [ownEvidence] };
}

function unavailableYear(year: number, atInstant: string, message: string): LocalAnnualYear {
  return { year, atInstant, label: "暂不可判", summary: message, yearGanZhi: null, dayunGanZhi: null,
    startInstant: null, endExclusiveInstant: null, dayunStatus: "unavailable", dayunSegments: [],
    yearInfluence: { direction: null, summary: message, evidence: [message] },
    decadeInfluence: { direction: null, summary: "未取得本年区间，无法确定对应大运。", evidence: [message] },
    primaryTheme: { id: "career", title: "本年事实尚未解析", text: message, evidence: [message] },
    themes: [], evidence: [message], conditions: [], scenarioBranches: [], transitNodeRef: null,
    judgment: null, ownJudgment: null, judgmentSegments: [] };
}

function buildYear(year: number, snapshot: TransitSnapshot, assessment: BaziPreliminaryAssessment,
  revision: RevisionRecord, contexts: LuckContext[]): LocalAnnualYear {
  const slot = snapshot.slots.year;
  if (slot.status !== "resolved") return unavailableYear(year, snapshot.target.instant, slot.message);
  const annual = slot.node;
  if (revision.timeCalibration.utcInstant && Date.parse(annual.endExclusiveInstant) <= Date.parse(revision.timeCalibration.utcInstant)) {
    const message = `${year} ${annual.ganZhi}年在出生之前，仅供查看历法区间，不作个人运势或经历判断。`;
    return { ...unavailableYear(year, snapshot.target.instant, message),
      yearGanZhi: annual.ganZhi, startInstant: annual.startInstant, endExclusiveInstant: annual.endExclusiveInstant,
      transitNodeRef: annual.ref, primaryTheme: { id: "career", title: "出生前历法区间", text: message, evidence: [message] },
      decadeInfluence: { direction: null, summary: "出生前不匹配本人的大运背景。", evidence: [message] } };
  }
  const cases = balanceCases(assessment);
  const scenarioBranches: LocalAnnualScenario[] = [];
  const dayunSegments: LocalAnnualDayunSegment[] = [];
  const ownJudgment = buildLocalOutlookJudgment(revision, assessment, { target: annual });
  const judgmentSegments: LocalOutlookJudgmentSegment[] = [];
  let hasGap = false;
  for (const context of contexts) {
    const overlaps = overlapSegments(annual, context);
    dayunSegments.push(...overlaps.map((item) => item.segment));
    const coverage = overlaps.reduce((sum, { segment }) => sum + Date.parse(segment.endExclusiveInstant) - Date.parse(segment.startInstant), 0);
    const complete = coverage === Date.parse(annual.endExclusiveInstant) - Date.parse(annual.startInstant);
    if (!complete) hasGap = true;
    let cursor = annual.startInstant;
    const addJudgmentSegment = (startInstant: string, endExclusiveInstant: string, dayun?: TransitNode) => {
      if (Date.parse(startInstant) >= Date.parse(endExclusiveInstant)) return;
      judgmentSegments.push({ id: `${context.id}:${startInstant}`, branchId: context.id,
        branchLabel: `${context.label} · ${dayun ? `${dayun.ganZhi}大运` : "大运未覆盖"}`,
        startInstant, endExclusiveInstant,
        judgment: buildLocalOutlookJudgment(revision, assessment, { target: annual, background: dayun ? { dayun } : {}, startInstant, endExclusiveInstant }) });
    };
    for (const { node, segment } of overlaps) {
      addJudgmentSegment(cursor, segment.startInstant);
      addJudgmentSegment(segment.startInstant, segment.endExclusiveInstant, node);
      cursor = segment.endExclusiveInstant;
    }
    addJudgmentSegment(cursor, annual.endExclusiveInstant);
    for (const balance of cases) {
      const combined = combineInfluences([annual, ...overlaps.map((item) => item.node)], balance);
      const periods = overlaps.map(({ node, segment }) => `${fixedEightDate(segment.startInstant)}（UTC+08）起，${node.ganZhi}大运与本流年合看${combineInfluences([annual, node], balance).direction}`).join("；");
      scenarioBranches.push({ id: `${context.id}:${balance.id}`, label: `${context.label} · ${balance.label}`,
        balanceDirection: balance.direction, direction: combined.direction,
        summary: `${combined.direction}。${periods || "大运尚无可用覆盖，仅给出流年条件下的倾向"}。${complete ? "" : "未覆盖时段不能视作完整大运判断。"}`,
        evidence: [...combined.evidence, ...(!complete ? [context.nodes.length ? "本年有尚未交运或超出已锁定大运范围的时段。" : context.unavailable || "本年大运未能解析。"] : [])]
      });
    }
  }
  const conditional = revision.input.sex === "unspecified" || hasGap;
  const working = getWorkingBalance(assessment);
  const baseline = scenarioBranches.find((scenario) => scenario.id.endsWith(":working"));
  const direction = baseline?.direction;
  const judgment = combineLocalOutlookJudgments(ownJudgment, judgmentSegments, { incomplete: hasGap, uncertainDirection: revision.input.sex === "unspecified" });
  const label: AnnualOutlookLabel = judgment.label;
  const age = buildLocalReadingAgeContext(revision.timeCalibration.utcInstant, annual.startInstant, annual.endExclusiveInstant);
  const themes = buildThemes(revision, assessment, annual, contexts, dayunSegments, age);
  const annualClash = themes[2]!.evidence.find((text) => text.startsWith("流年") && text.includes("地支六冲"))
    ?? themes[2]!.evidence.find((text) => text.startsWith("流年"));
  const handover = contexts.some((context) => dayunSegments.filter((segment) => segment.direction === context.id).length > 1);
  const changeSummary = handover ? "年内交运，前后分段看。"
    : annualClash ? `本年有变化线索：${annualClash.split("；依据")[0]}。`
      : "本年未检出所覆盖的流年冲，先沿既有节奏观察。";
  const annualCase = cases[0]!;
  const annualOnly = combineInfluences([annual], annualCase);
  const yearInfluence: LocalAnnualInfluence = {
    direction: annualOnly.direction,
    summary: annualOnly.direction === "主题解读"
      ? `当前工作判断未定固定扶抑喜忌，本年按${tenGodTheme(annual.stemTenGod, age)}解读；不据此判断平稳或顺逆。`
      : `按当前${working.label}判断，单看${annual.ganZhi}流年${annualOnly.direction}；主题为${tenGodTheme(annual.stemTenGod, age)}。`,
    evidence: annualOnly.evidence
  };
  const decadeInfluence = buildDecadeInfluence(annual, contexts, annualCase, age);
  const primaryTheme = buildPrimaryTheme(annual, themes, contexts, dayunSegments, age);
  const baselineBranches = scenarioBranches.filter((scenario) => scenario.id.endsWith(":working"));
  const baselineSummary = working.direction === "conditional"
    ? `当前${working.label}，不把旧计权的五行喜忌当作本年结论；以下沿实际格局、调候与互动分别解释。`
    : working.direction === "balanced"
    ? "按当前工作判断，扶抑未定固定喜忌，以下直接给出主题和节奏初判。"
    : `按当前${working.label}判断，本年自身${annualOnly.direction}；${conditional
      ? baselineBranches.map((branch) => `${branch.label.split(" · ")[0]}，与大运合看${branch.direction}`).join("；")
      : `大运自身${decadeInfluence.direction ?? "未完整覆盖"}，本年与大运合看${direction}`}。`;
  const summary = `${judgment.headline}。${judgment.summary}${primaryTheme.text}${handover ? "" : changeSummary}`;
  return {
    year, atInstant: snapshot.target.instant, label, summary,
    startInstant: annual.startInstant, endExclusiveInstant: annual.endExclusiveInstant,
    yearGanZhi: annual.ganZhi, dayunGanZhi: dayunSegments.length ? unique(dayunSegments.map((segment) => segment.ganZhi)).join(" / ") : null,
    dayunStatus: !dayunSegments.length ? "unavailable" : hasGap || revision.input.sex === "unspecified" ? "partial" : "resolved",
    dayunSegments, yearInfluence, decadeInfluence, primaryTheme, themes, judgment, ownJudgment, judgmentSegments,
    evidence: [
      `${year} 流年为${annual.ganZhi}，按现有运限引擎的立春精确节点：${annual.startInstant} 至 ${annual.endExclusiveInstant}（不含终点，固定 UTC+08 基准）。`,
      `日主${revision.facts.pillars.day.stem}；主判断分别求值结构、扶抑与调候，背景及交运时段分开；不按票数合成。`,
      `当前扶抑说明：${baselineSummary}`,
      `旺衰工作判断：${working.version}；${working.selection}；${working.ruleId}。`,
      ...unique(scenarioBranches.flatMap((scenario) => scenario.evidence)),
      ...(revision.input.sex === "unspecified" ? ["性别未指定，顺行和逆行分别显式试算，不替用户选定大运方向。"] : []),
      ...(!assessment.sourceBinding.includeHour ? ["时柱未进入初判；合冲主题也不采用时柱。"] : []),
      ...(snapshot.luckCycleRuleSource === "legacy_inferred" ? ["该旧修订的大运规则来自现有引擎的显式兼容推定，未写回修订。"] : [])
    ], conditions: [
      ...judgment.conditions, ...age.conditions,
      ...working.conditions,
      ...(hasGap ? ["大运存在未覆盖时段，主结果需要按列出的时间条件阅读。"] : []),
      ...(revision.input.sex === "unspecified" ? ["顺逆未确定，分别给出顺行和逆行的条件性答案。"] : [])
    ], scenarioBranches, transitNodeRef: annual.ref
  };
}

/** Read-only local heuristic. currentYear names a Lichun year, not January 1. */
export async function buildLocalAnnualOutlook(
  revision: RevisionRecord, assessment: BaziPreliminaryAssessment, currentYear: number
): Promise<LocalAnnualOutlook> {
  if (!Number.isInteger(currentYear) || currentYear < 1900 || currentYear > 2100) throw new RangeError("年度须为 1900—2100 内的整数。");
  return buildAnnualRange(revision, assessment, currentYear, currentYear + 9, true);
}

/** Explicit bounded window; the original three-argument ten-year API is unchanged. */
export async function buildLocalAnnualOutlookRange(
  revision: RevisionRecord, assessment: BaziPreliminaryAssessment, startYear: number, endYear: number
): Promise<LocalAnnualOutlook> {
  if (!Number.isInteger(startYear) || !Number.isInteger(endYear) || startYear < 1900 || endYear > 2100
    || endYear < startYear || endYear - startYear + 1 > 12) {
    throw new RangeError("年度范围须在 1900—2100 内，且连续包含 1—12 个立春年度。");
  }
  return buildAnnualRange(revision, assessment, startYear, endYear, false);
}

async function buildAnnualRange(
  revision: RevisionRecord, assessment: BaziPreliminaryAssessment, currentYear: number, endYear: number, legacy: boolean
): Promise<LocalAnnualOutlook> {
  const capturedRevision = structuredClone(revision);
  const capturedAssessment = structuredClone(assessment);
  if (capturedAssessment.sourceBinding.revisionId !== capturedRevision.id
    || capturedAssessment.sourceBinding.chartResultHash !== capturedRevision.manifest.resultHash) {
    throw new Error("年度初判与当前修订不匹配，已拒绝混用。");
  }
  const snapshotResults = await Promise.all(Array.from({ length: endYear - currentYear + 1 }, async (_, index) => {
    const year = currentYear + index, atInstant = `${year}-07-01T04:00:00.000Z`;
    try { return { year, atInstant, snapshot: await calculateTransitSnapshot({ revision: capturedRevision, atInstant }) }; }
    catch { return { year, atInstant, snapshot: null }; }
  }));
  const first = snapshotResults.find((result) => result.snapshot)?.snapshot;
  const contexts: LuckContext[] = [];
  if (first && capturedRevision.input.sex === "unspecified") {
    for (const manualDirection of ["forward", "backward"] as const) {
      try {
        const snapshot = await calculateTransitSnapshot({ revision: capturedRevision, atInstant: first.target.instant, manualDirection });
        contexts.push({ id: manualDirection, label: manualDirection === "forward" ? "若按顺行" : "若按逆行",
          nodes: snapshot.tracks.dayun, unavailable: snapshot.slots.dayun.status === "resolved" ? "" : snapshot.slots.dayun.message });
      } catch { contexts.push({ id: manualDirection, label: manualDirection === "forward" ? "若按顺行" : "若按逆行", nodes: [], unavailable: "该顺逆条件的大运未能解析。" }); }
    }
  } else if (first) {
    contexts.push({ id: "locked", label: "按当前修订的起运规则", nodes: first.tracks.dayun,
      unavailable: first.slots.dayun.status === "resolved" ? "" : first.slots.dayun.message });
  }
  const years = snapshotResults.map(({ year, atInstant, snapshot }) => snapshot
    ? buildYear(year, snapshot, capturedAssessment, capturedRevision, contexts)
    : unavailableYear(year, atInstant, "现有运限引擎未能解析这一年（可能超出支持范围或时间规则未锁定），不生成运势标签。"));
  const easier = years.filter((year) => year.label === "较顺").map((year) => year.year);
  const pressure = years.filter((year) => year.label === "有压力").map((year) => year.year);
  const mixed = years.filter((year) => year.label === "利弊并见").map((year) => year.year);
  const conditionalYears = years.filter((year) => year.label === "条件性").map((year) => year.year);
  const handoverYears = years.filter((year) => contexts.some((context) => year.dayunSegments.filter((segment) => segment.direction === context.id).length > 1)).map((year) => year.year);
  const overview = `${easier.length ? `${easier.join("、")} 年综合较顺。` : ""}${pressure.length ? `${pressure.join("、")} 年综合有压力。` : ""}${mixed.length ? `${mixed.join("、")} 年助力与牵制并见。` : ""}${conditionalYears.length ? `${conditionalYears.join("、")} 年有明确的分支判断，须结合列出的承接、救应或交运条件。` : ""}${capturedRevision.input.sex === "unspecified" ? "大运顺逆未定，各分支分别保留。" : ""}`;
  return {
    version: LOCAL_ANNUAL_OUTLOOK_VERSION, revisionId: capturedRevision.id, chartResultHash: capturedRevision.manifest.resultHash,
    startYear: currentYear, endYear, yearBoundary: "立春起算至下一立春，固定 UTC+08 精确节令；不是公历元旦换年。",
    summary: years.every((year) => year.label === "暂不可判") ? (legacy ? "本轮未取得可用运限事实，不能据此判断十年顺逆。" : "本轮未取得可用运限事实，不能据此判断所选年度范围的顺逆。")
      : `${overview}${handoverYears.length ? `${handoverYears.join("、")} 年${capturedRevision.input.sex === "unspecified" ? "在列出的顺逆条件下" : ""}涉及交运，按具体日期分段。` : ""}各年的主轴与真实节点依据见下方。`,
    limitations: [
      "这是免费本地规则初判，不是统计概率；较顺或承压描述所覆盖的结构作用，不保证发财、升职、婚变、灾病或任何具体事件。",
      "综合判断分别求值格局路径、扶抑与调候；轻重、根气及轴优先级为版本化本地简化模型，不按票数或吉凶分数合成。",
      "十神事务主题属于现代简化规则解释，不是古籍逐句断事；合冲复用关系引擎的二元事实，不自动断合化，也未覆盖完整三合三会、藏干互动或所有应期方法。",
      "年内交运按真实大运区间分段；未知顺逆的方向分别保留。原计权对照只说明旧权重假设，不替代当前工作判断。"
    ], years
  };
}
