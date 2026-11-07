import { canonicalStringify } from "@hakimi/integrity";
import type { RevisionRecord, TransitNodeRef } from "@hakimi/contracts";
import { LOCAL_ANNUAL_OUTLOOK_VERSION, type LocalAnnualOutlook } from "./local-annual-outlook";
import { LOCAL_OUTLOOK_JUDGMENT_VERSION, LOCAL_OUTLOOK_POLICY_VERSION, type LocalOutlookJudgment } from "./local-outlook-judgment";
import { buildReadingTimeline, type LocalReadingTimeline, type ReadingTimelineBranchId, type ReadingTimelineGap, type ReadingTimelineTurningPoint } from "./local-reading-timeline";
import { plainYearPeriods, plainYearTopic } from "./plain-year-overview";
import { readingDirectionLabel, validateReadingExplanationIndex, type ReadingExplanationIndex } from "./reading-explanation-index";

export const MAIN_ROUTE_READING_VERSION = "hakimi.main-route-reading/0.1.0" as const;
export type MainRouteRange = "year" | "three_years" | "ten_years";
export type MainRouteState = "favorable" | "opportunity" | "caution" | "mixed" | "theme" | "unclear";
export interface MainRouteTarget { year: number; branchId: ReadingTimelineBranchId; startInstant: string; endExclusiveInstant: string }
export interface MainRouteStage {
  id: string; sourceStageId: string; branchId: ReadingTimelineBranchId;
  startYear: number; endYear: number; startInstant: string; endExclusiveInstant: string;
  sourceStartInstant: string; sourceEndExclusiveInstant: string;
  state: MainRouteState; caption: string; headline: string; summary: string; topic: string;
  primaryAxis: LocalOutlookJudgment["primaryAxis"]; target: MainRouteTarget;
  yearLinks: { year: number; nodeRef: TransitNodeRef; startInstant: string; endExclusiveInstant: string }[];
  conditions: string[]; evidence: string[]; sourceIds: string[]; sourceVersions: string[];
}
export interface MainRouteDomainNote {
  conclusionId: string; conclusionIds: string[]; domain: "career" | "wealth" | "relationship"; domainLabel: string;
  direction: string | null; directionLabel: string; text: string; target: MainRouteTarget;
  sourceSubjects: string[]; sourceVersions: string[]; conditions: string[];
}
export interface MainRouteReading {
  version: typeof MAIN_ROUTE_READING_VERSION;
  sourceBinding: { caseId: string; revisionId: string; chartResultHash: string; includeHour: boolean; ruleProfileDigest: string };
  sourceVersions: string[];
  status: "ready" | "choose_branch" | "unavailable";
  range: { mode: MainRouteRange; startYear: number | null; endYear: number | null; requestedStartYear: number | null; requestedEndYear: number | null; label: string; coverageNote: string | null };
  headline: string; summary: string[]; keyCondition: string | null; keyConditionPlain: string | null; conditions: string[];
  branches: { id: ReadingTimelineBranchId; label: string }[];
  selectedBranchId: ReadingTimelineBranchId | null; assumption: string | null;
  stages: MainRouteStage[]; gaps: ReadingTimelineGap[]; nextTurningPoint: ReadingTimelineTurningPoint | null;
  turningPoints: ReadingTimelineTurningPoint[]; primaryYear: number | null;
  domainNotes: MainRouteDomainNote[];
  limitations: string[];
}
export interface MainRouteReadingInput {
  revision: RevisionRecord; annual: LocalAnnualOutlook | null; timeline?: LocalReadingTimeline | null;
  includeHour?: boolean; selectedYear?: number; range?: MainRouteRange;
  branchId?: "locked" | "forward" | "backward";
  explanationIndex?: ReadingExplanationIndex | null;
}

const unique = (values: readonly string[]) => [...new Set(values.filter(Boolean))];
const same = (left: unknown, right: unknown) => canonicalStringify(left) === canonicalStringify(right);
const labels: Record<MainRouteState, string> = {
  favorable: "较顺", opportunity: "有机会但有条件", caution: "较费力", mixed: "利弊交织", theme: "主题明确，顺逆未定", unclear: "暂未确定"
};
const steady: Record<MainRouteState, string> = {
  favorable: "整体较易推进。", opportunity: "有可推进的机会，能否落实仍取决于条件。", caution: "整体推进较费力。",
  mixed: "有推进窗口，同时仍受阻力牵制。", theme: "这一阶段主题明确，顺逆暂未确定。", unclear: "关键条件尚未明确，当前不能定下顺逆。"
};
const yearLabel = (start: number, end: number) => start === end ? `${start}年` : `${start}—${end}年`;
const isOpportunity = (state: MainRouteState) => state === "favorable" || state === "opportunity";
// Exclude explicit method/format declarations, not words such as “threshold”:
// an actual sensitivity condition comparing thresholds must remain intact.
const substantiveCondition = (condition: string) => !!condition.trim()
  && !/^(?:模型边界：|判断区间\s|个人解释仅从出生瞬时\s|日期按|本分支与|当前按|顺逆(?:未|尚未|方向)|按当前修订|若按(?:顺|逆)行)/u.test(condition)
  && !/^(?:结构规则为本地联合谓词|日主自身同类根与印星的根分别保留|原局合冲与三合、三会线索单列|未覆盖或条件不足不等于相反方向成立|负荷分界、根气代理、作用先后与轴优先级是版本化本地模型|合冲不自动合化或删除作用；未覆盖|出生月调候移用于岁运属于新增应用模型)/u.test(condition);
const judgmentSignature = (judgment: LocalOutlookJudgment) => ({ label: judgment.label, primaryAxis: judgment.primaryAxis,
  axes: judgment.axes.map(axis => ({ axis: axis.axis, pathId: axis.pathId, effect: axis.effect })).sort((a, b) => a.axis.localeCompare(b.axis)) });

function orderedAnnual(source: LocalAnnualOutlook): LocalAnnualOutlook {
  const result = structuredClone(source);
  result.years.sort((a, b) => a.year - b.year);
  for (const year of result.years) {
    year.judgmentSegments.sort((a, b) => a.branchId.localeCompare(b.branchId)
      || Date.parse(a.startInstant) - Date.parse(b.startInstant) || a.id.localeCompare(b.id));
    // A year's aggregate may deliberately contain axes from several segments.
    // Only a single segment selects one primary axis and must be unambiguous.
    for (const judgment of year.judgmentSegments.map(segment => segment.judgment)) {
      if (new Set(judgment.axes.map(axis => axis.axis)).size !== judgment.axes.length || new Set(judgment.axes.map(axis => axis.id)).size !== judgment.axes.length) {
        throw new Error("主走势原判断的作用轴重复，不能按数组顺序选择其中一项。");
      }
      judgment.axes.sort((a, b) => a.axis.localeCompare(b.axis));
    }
  }
  return result;
}

function unresolvedDirectionReason(revision: RevisionRecord): string {
  const rule = revision.ruleProfile.luckCycle;
  return revision.input.sex === "unspecified" && rule.directionRule === "year_stem_yinyang_and_gender" && rule.unknownValuePolicy === "require_manual_direction"
    ? "出生性别未填写；当前规则需要结合出生年的天干阴阳与性别确定大运顺序。"
    : "现有资料和规则不足以确认哪套路径适用。";
}

/** Versioned by MAIN_ROUTE_READING_VERSION. Only the exact background-control
 * blocker template emitted by the supported judgment producer is translated.
 * No substring replacement, generic sentiment matching, or reality claim is
 * allowed; a negation, extra qualifier, or unfamiliar template stays original. */
function plainKeyCondition(judgment: LocalOutlookJudgment | undefined, condition: string | null): string | null {
  if (!judgment || !condition || judgment.version !== LOCAL_OUTLOOK_JUDGMENT_VERSION || judgment.policyVersion !== LOCAL_OUTLOOK_POLICY_VERSION) return null;
  const primary = judgment.axes.find(axis => axis.axis === judgment.primaryAxis);
  if (!primary?.blockers.includes(condition)) return null;
  const backgroundControl = /^(?:大运|流年|节令月)([甲乙丙丁戊己庚辛壬癸])[子丑寅卯辰巳午未申酉戌亥]透\1可克(?:年|月|时)柱透[甲乙丙丁戊己庚辛壬癸]；原已保护的(?:正印|偏印|食神|伤官|正财|偏财|正官|七杀|比肩|劫财)支点受到牵连，进入本段持续条件。$/u;
  return backgroundControl.test(condition) ? "当前规则提示，原本支持推进的条件可能受牵制，仍需留意这部分阻力。" : null;
}

function stateFor(judgment: LocalOutlookJudgment, periodGroup: ReturnType<typeof plainYearPeriods>[number]["group"]): MainRouteState {
  if (periodGroup !== "unclear") return periodGroup;
  const primary = judgment.axes.find(axis => axis.axis === judgment.primaryAxis);
  return judgment.label === "主题解读" || primary?.effect === "neutral" ? "theme" : "unclear";
}

/** This is a qualitative projection of the producer's categories, not a new
 * ranking. A change is described only between adjacent, computed intervals. */
function mainSentence(stages: MainRouteStage[], gaps: ReadingTimelineGap[]): string {
  const first = stages[0];
  if (!first) return "这段时间还没有可用判断。";
  const coverageGaps = gaps.filter(gap => gap.kind !== "missing_background");
  if (coverageGaps.length) return `已算出的首段${labels[first.state]}；所选范围有结果缺口，暂不连成完整走势。`;
  const changed = stages.find(stage => stage.state !== first.state);
  if (!changed) return first.state === "theme"
    ? `${new Set(stages.map(stage => stage.topic)).size > 1 ? "首段" : "这一阶段"}以${first.topic}为主，${new Set(stages.map(stage => stage.topic)).size > 1 ? "后续主题有变化；各段" : ""}顺逆暂未确定。`
    : steady[first.state];
  const changedIndex = stages.indexOf(changed);
  if (stages[changedIndex - 1]!.endExclusiveInstant !== changed.startInstant) return `前段${labels[first.state]}；后段${labels[changed.state]}，两段之间未形成连续覆盖。`;
  const last = stages.at(-1)!;
  let text: string;
  if (first.state === "caution" && isOpportunity(changed.state)) text = "先费力，随后出现改善窗口";
  else if (isOpportunity(first.state) && changed.state === "caution") text = "前段有推进机会，随后阻力增加";
  else text = `前段${labels[first.state]}，随后${labels[changed.state]}`;
  // A middle improvement must not hide a later reversal. This does not smooth
  // or discard any stage: the complete, original interval list remains below.
  if (last !== changed && last.state !== changed.state) text += `，后段${labels[last.state]}`;
  return `${text}。`;
}

function domainNotes(index: ReadingExplanationIndex | null | undefined, input: MainRouteReadingInput,
  stages: MainRouteStage[], branchId: ReadingTimelineBranchId | null): MainRouteDomainNote[] {
  if (!index) return [];
  const checked = validateReadingExplanationIndex(index), source = checked.sourceSnapshot, revision = input.revision;
  const includeHour = revision.input.timePrecision !== "unknown_hour" && revision.input.timePrecision !== "date_only";
  if (source.caseId !== revision.caseId || source.revisionId !== revision.id || source.chartResultHash !== revision.manifest.resultHash
    || source.includeHour !== includeHour || source.ruleProfileDigest !== revision.manifest.ruleProfileDigest
    || !same(source.ruleProfile, revision.ruleProfile) || !same(source.input, revision.input)
    || !same(source.engineVersions, { engine: revision.manifest.engine, timeZoneDatabase: revision.manifest.timeZoneDatabase ?? null })) {
    throw new Error("主走势的领域依据不属于当前人物、修订或规则版本。");
  }
  const currentVersions = [LOCAL_ANNUAL_OUTLOOK_VERSION, LOCAL_OUTLOOK_JUDGMENT_VERSION, LOCAL_OUTLOOK_POLICY_VERSION];
  const assertVersions = (versions: string[]) => {
    for (const current of currentVersions) if (versions.some(version => version.startsWith(`${current.slice(0, current.lastIndexOf("/"))}/`) && version !== current)) {
      throw new Error("主走势的领域依据混用了旧判断版本。");
    }
  };
  assertVersions(source.sourceVersions);
  const domainNames = { career: "事业", wealth: "收入", relationship: "感情" };
  const notes: MainRouteDomainNote[] = checked.conclusions.flatMap(conclusion => {
    const scope = conclusion.scope;
    if (conclusion.origin !== "calculated" || scope.level !== "year" || scope.branchId !== branchId
      || !(conclusion.domain in domainNames)) return [];
    const link = stages.flatMap(stage => stage.yearLinks).find(item => item.year === scope.year
      && item.startInstant === scope.startInstant && item.endExclusiveInstant === scope.endExclusiveInstant);
    if (!link) return []; // Never borrow a neighboring interval, natal text, or another branch.
    assertVersions(conclusion.sourceVersions);
    const domain = conclusion.domain as keyof typeof domainNames;
    return [{ conclusionId: conclusion.stableId, conclusionIds: [conclusion.stableId], domain, domainLabel: domainNames[domain], direction: conclusion.direction,
      directionLabel: readingDirectionLabel(conclusion.direction), text: conclusion.text,
      target: { year: link.year, branchId: branchId!, startInstant: link.startInstant, endExclusiveInstant: link.endExclusiveInstant },
      sourceSubjects: [...conclusion.sourceSubjects], sourceVersions: [...conclusion.sourceVersions],
      conditions: unique([...conclusion.evidence.limits, ...conclusion.evidence.unknowns]) }];
  });
  const grouped = new Map<string, MainRouteDomainNote>();
  const meaning = (note: MainRouteDomainNote) => ({ direction: note.direction, text: note.text,
    sourceSubjects: unique(note.sourceSubjects).sort(), sourceVersions: unique(note.sourceVersions).sort(), conditions: unique(note.conditions).sort() });
  for (const note of notes.sort((a, b) => a.conclusionId.localeCompare(b.conclusionId))) {
    const key = canonicalStringify({ domain: note.domain, target: note.target }), previous = grouped.get(key);
    if (previous) {
      if (!same(meaning(previous), meaning(note))) throw new Error("主走势同一领域和时段存在不同原结论，不能按数组顺序或重复数量选择。");
      previous.conclusionIds.push(note.conclusionId);
    } else grouped.set(key, note);
  }
  return [...grouped.values()].sort((a, b) => a.target.year - b.target.year || Date.parse(a.target.startInstant) - Date.parse(b.target.startInstant)
    || a.domain.localeCompare(b.domain));
}

function domainDifference(notes: MainRouteDomainNote[], first: MainRouteStage | undefined): string | null {
  if (!first) return null;
  const scoped = notes.filter(note => same(note.target, first.target));
  const career = scoped.find(note => note.domain === "career"), wealth = scoped.find(note => note.domain === "wealth");
  const pair = career && wealth ? [career, wealth] : scoped.slice(0, 2);
  if (pair.length < 2 || pair[0]!.direction === pair[1]!.direction || !pair[0]!.direction || !pair[1]!.direction) return null;
  return `${first.target.year}年首段，${pair.map(note => `${note.domainLabel}${note.directionLabel}`).join("，")}。`;
}

export function buildMainRouteReading(input: MainRouteReadingInput): MainRouteReading {
  const { revision, timeline: supplied } = input;
  const annual = input.annual ? orderedAnnual(input.annual) : null;
  if (!annual) {
    const includeHour = revision.input.timePrecision !== "unknown_hour" && revision.input.timePrecision !== "date_only";
    const mode = input.range ?? "three_years", year = input.selectedYear ?? null;
    if ((year !== null && (!Number.isSafeInteger(year) || year < 1 || year > 9999))
      || !["year", "three_years", "ten_years"].includes(mode)
      || (input.includeHour !== undefined && input.includeHour !== includeHour)) throw new Error("主走势查看范围或时柱范围无效。");
    return { version: MAIN_ROUTE_READING_VERSION,
      sourceBinding: { caseId: revision.caseId, revisionId: revision.id, chartResultHash: revision.manifest.resultHash, includeHour, ruleProfileDigest: revision.manifest.ruleProfileDigest },
      sourceVersions: [MAIN_ROUTE_READING_VERSION], status: "unavailable",
      range: { mode, startYear: null, endYear: null, requestedStartYear: year, requestedEndYear: year === null ? null : year + ({ year: 1, three_years: 3, ten_years: 10 }[mode]) - 1,
        label: year === null ? "等待年度结果" : `${year}年起 · 年度结果未载入`, coverageNote: "年度结果尚未载入，不用本命解释替代。" },
      headline: "这段时间还没有可用判断。", summary: ["年度结果载入后，再显示同一人物和范围的主判断。"], keyCondition: null, keyConditionPlain: null, conditions: [], branches: [],
      selectedBranchId: null, assumption: null, stages: [], gaps: [], nextTurningPoint: null, turningPoints: [], primaryYear: null, domainNotes: [], limitations: [] };
  }
  if (annual.version !== LOCAL_ANNUAL_OUTLOOK_VERSION) throw new Error("主走势不接受未支持的年度展示来源版本。");
  // Reuse the production validator/grouping, which checks every judgment's
  // revision, policy, target, interval, branch and background. No new horoscope
  // calculation or month preparation happens in this display layer.
  const timeline = buildReadingTimeline({ revision, annual });
  if (input.includeHour !== undefined && input.includeHour !== timeline.sourceBinding.includeHour) throw new Error("主走势时柱范围与当前资料不一致。");
  if (supplied && (supplied.version !== timeline.version || !same(supplied.sourceBinding, timeline.sourceBinding)
    || supplied.startYear !== timeline.startYear || supplied.endYear !== timeline.endYear
    || !same(supplied.stages, timeline.stages) || !same(supplied.turningPoints, timeline.turningPoints) || !same(supplied.gaps, timeline.gaps))) {
    throw new Error("主走势时间线与当前年度原结论不一致。");
  }
  const mode = input.range ?? "three_years", start = input.selectedYear ?? annual.startYear;
  if (!Number.isSafeInteger(start) || start < 1 || start > 9999 || !["year", "three_years", "ten_years"].includes(mode)) throw new Error("主走势查看范围无效。");
  const requestedEnd = start + ({ year: 1, three_years: 3, ten_years: 10 }[mode]) - 1;
  const intersects = start <= annual.endYear && requestedEnd >= annual.startYear;
  const startYear = intersects ? Math.max(start, annual.startYear) : start;
  const endYear = intersects ? Math.min(requestedEnd, annual.endYear) : requestedEnd;
  const range = { mode, startYear, endYear, requestedStartYear: start, requestedEndYear: requestedEnd, label: yearLabel(startYear, endYear),
    coverageNote: !intersects ? `${yearLabel(start, requestedEnd)}没有已计算的年度结果。`
      : startYear !== start || endYear !== requestedEnd ? `当前报告在所选范围只覆盖${yearLabel(startYear, endYear)}，其余年份未补算。` : null };
  const branches = timeline.branches.map(branch => ({ id: branch.id, label: branch.label }));
  const chosen = input.branchId ?? (branches.length === 1 ? branches[0]!.id : null);
  if (chosen !== null && !branches.some(branch => branch.id === chosen)) throw new Error("主走势所选分支不属于当前资料。");
  const stages: MainRouteStage[] = chosen === null ? [] : timeline.stages.filter(stage => stage.branchId === chosen).flatMap(stage => {
    const links = stage.yearLinks.filter(link => link.year >= startYear && link.year <= endYear);
    if (!links.length) return [];
    const first = links[0]!, last = links.at(-1)!, year = annual.years.find(item => item.year === first.year)!;
    const segment = year.judgmentSegments.find(item => item.branchId === chosen && item.startInstant === first.startInstant && item.endExclusiveInstant === first.endExclusiveInstant)!;
    const period = plainYearPeriods(year).find(item => item.segmentId === segment.id && item.branchId === chosen)!;
    const judgment = segment.judgment, state = stateFor(judgment, period.group);
    const judgments = links.map(link => annual.years.find(item => item.year === link.year)!.judgmentSegments.find(item =>
      item.branchId === chosen && item.startInstant === link.startInstant && item.endExclusiveInstant === link.endExclusiveInstant)!.judgment);
    return [{ id: `${stage.id}:${first.year}-${last.year}`, sourceStageId: stage.id, branchId: chosen,
      startYear: first.year, endYear: last.year, startInstant: first.startInstant, endExclusiveInstant: last.endExclusiveInstant,
      sourceStartInstant: stage.startInstant, sourceEndExclusiveInstant: stage.endExclusiveInstant,
      state, caption: labels[state], headline: judgment.headline, summary: judgment.summary,
      topic: plainYearTopic({ ...year, ownJudgment: judgment, judgmentSegments: [segment] }), primaryAxis: judgment.primaryAxis,
      target: { year: first.year, branchId: chosen, startInstant: first.startInstant, endExclusiveInstant: first.endExclusiveInstant },
      yearLinks: links.map(link => ({ year: link.year, nodeRef: structuredClone(link.nodeRef), startInstant: link.startInstant, endExclusiveInstant: link.endExclusiveInstant })),
      conditions: unique(judgments.flatMap(item => [...item.conditions, ...item.conflicts])), evidence: unique(links.flatMap(link => link.evidence)),
      sourceIds: unique(judgments.flatMap(item => item.sourceIds)), sourceVersions: unique(judgments.flatMap(item => [item.version, item.policyVersion])) }];
  });
  const gaps = intersects ? timeline.gaps.filter(gap => (chosen === null || gap.branchId === chosen) && gap.year >= startYear && gap.year <= endYear).map(gap => structuredClone(gap))
    : Array.from({ length: endYear - startYear + 1 }, (_, index): ReadingTimelineGap => ({ year: startYear + index, branchId: chosen ?? "unresolved", kind: "unavailable_year",
      startInstant: null, endExclusiveInstant: null, message: `${startYear + index}年不在当前已计算范围内。`, conditions: ["未使用本命或相邻年份替代。"] }));
  const turningPoints = chosen === null ? [] : timeline.turningPoints.filter(point => point.branchId === chosen && point.year >= startYear && point.year <= endYear
    && stages.some(stage => stage.yearLinks.some(link => link.startInstant === point.before.startInstant && link.endExclusiveInstant === point.before.endExclusiveInstant))
    && stages.some(stage => stage.yearLinks.some(link => link.startInstant === point.after.startInstant && link.endExclusiveInstant === point.after.endExclusiveInstant))).map(point => structuredClone(point));
  // Keep an unchanged handover as a real source boundary, but do not present it
  // as the next change in judgment. This compares the producer's own decisions,
  // not their wording, counts of findings, or an invented numeric trend score.
  const nextTurningPoint = turningPoints.find(point => {
    const sourceFor = (link: ReadingTimelineTurningPoint["before"]) => annual.years.find(year => year.year === link.year)!.judgmentSegments.find(segment =>
      segment.branchId === point.branchId && segment.startInstant === link.startInstant && segment.endExclusiveInstant === link.endExclusiveInstant)!.judgment;
    return !same(judgmentSignature(sourceFor(point.before)), judgmentSignature(sourceFor(point.after)));
  }) ?? null;
  const notes = domainNotes(input.explanationIndex, input, stages, chosen), first = stages[0];
  const firstSource = first && annual.years.find(year => year.year === first.target.year)!.judgmentSegments.find(segment => segment.branchId === chosen && segment.startInstant === first.startInstant)!.judgment;
  const primary = firstSource?.axes.find(axis => axis.axis === firstSource.primaryAxis);
  const substantive = primary?.unresolvedConditions.filter(substantiveCondition) ?? [];
  const conditions = unique([...(chosen && chosen !== "locked" ? [`当前按${chosen === "forward" ? "顺行" : "逆行"}假设阅读，另一分支仍然保留，未认定本分支更可能。`] : []),
    ...gaps.map(gap => `${gap.year}年：${gap.message}`), ...substantive, ...(firstSource?.conflicts ?? []), ...stages.flatMap(stage => stage.conditions)]);
  // The producer already chose its primary axis and ordered its conditions.
  // Keep that order and whole sentences; branch/range metadata is displayed in
  // its own fields and must not hide a negation or substantive limitation here.
  const keyCondition = substantive[0] ?? primary?.blockers.find(substantiveCondition)
    ?? firstSource?.conflicts.find(substantiveCondition) ?? firstSource?.conditions.find(substantiveCondition)
    ?? firstSource?.coverageGaps.find(substantiveCondition)
    ?? (firstSource ? "这段原判断未单列可用于核实的条件；暂不能说明哪些资料会改变这条路线。"
      : chosen === null ? unresolvedDirectionReason(revision) : gaps[0]?.message ?? null);
  let headline = mainSentence(stages, gaps);
  if (chosen === null) {
    let differenceYear: number | null = null;
    for (const year of annual.years.filter(item => item.year >= startYear && item.year <= endYear)) {
      const periods = plainYearPeriods(year);
      if (periods.some(a => periods.some(b => a.branchId !== b.branchId && Date.parse(a.startInstant) < Date.parse(b.endExclusiveInstant)
        && Date.parse(b.startInstant) < Date.parse(a.endExclusiveInstant) && a.group !== b.group))) { differenceYear = year.year; break; }
    }
    headline = differenceYear === null ? "资料方向尚未确定，请先选择要查看的假设。" : `从${differenceYear}年起，不同资料假设的主判断出现分歧。`;
  }
  const summary = unique([domainDifference(notes, first) ?? "",
    chosen === null ? `${unresolvedDirectionReason(revision)}顺行和逆行是两种平行假设，不能拼成先后走势。`
      : gaps.some(gap => gap.kind !== "missing_background") ? "缺失的年份或时段已留空，不用前后结论补齐。"
        : nextTurningPoint ? `下一处变化在${nextTurningPoint.year}年；${nextTurningPoint.kind === "handover" ? "换运不等于自动转好，请按转折前后原判断阅读。" : "可进入对应年份查看变化前后的依据。"}`
          : first ? "所示阶段只整理已计算的原判断；当前范围没有另外确认的转折。" : "先查看报告实际覆盖的年份，或补齐所选年份的计算结果。"]);
  return { version: MAIN_ROUTE_READING_VERSION, sourceBinding: { caseId: revision.caseId, ...timeline.sourceBinding, ruleProfileDigest: revision.manifest.ruleProfileDigest },
    sourceVersions: unique([MAIN_ROUTE_READING_VERSION, timeline.version, ...timeline.sourceVersions, ...(input.explanationIndex?.sourceSnapshot.sourceVersions ?? [])]),
    status: chosen === null ? "choose_branch" : first ? "ready" : "unavailable", range, headline, summary: summary.slice(0, 2), keyCondition,
    keyConditionPlain: plainKeyCondition(firstSource, keyCondition), conditions,
    branches, selectedBranchId: chosen, assumption: chosen && chosen !== "locked" ? `按${chosen === "forward" ? "顺行" : "逆行"}假设` : null,
    stages, gaps, turningPoints, nextTurningPoint, primaryYear: first?.target.year ?? null, domainNotes: notes,
    limitations: unique([...timeline.limitations, ...annual.limitations, "本次主判断是当前规则支持的定性路线，不是现实事件概率。", "这里没有保存整条主线；年份与领域详情仍按明确范围保存。"])
  };
}
