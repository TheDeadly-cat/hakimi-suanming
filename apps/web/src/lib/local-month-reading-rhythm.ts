import type { TransitNodeRef } from "@hakimi/contracts";
import type { AnnualDomainBranchId, AnnualReadingDomainId } from "./local-annual-domain-reading";
import type { LocalMonthlyOutlook } from "./local-detailed-outlook";
import type { LocalMonthlyDomainReadings } from "./local-monthly-domain-reading";
import type { LocalAnnualMonthStory } from "./local-annual-month-story";
import type { LocalContextualReadingBundle } from "./local-contextual-reading-record";
import type { ReadingContextReference } from "./local-reading-context";
import type { OutlookAxis, OutlookEffect, OutlookJudgmentLabel } from "./local-outlook-judgment";
import { outlookDirectionCaption } from "./outlook-judgment-presentation";

export const MONTH_READING_RHYTHM_VERSION = "hakimi.local-month-reading-rhythm/0.1.0" as const;
export interface BuildMonthReadingRhythmInput {
  monthly: LocalMonthlyOutlook;
  monthlyDomains: LocalMonthlyDomainReadings;
  annualMonthStory: LocalAnnualMonthStory;
  contextual?: LocalContextualReadingBundle | null;
}
export interface MonthReadingRhythmTopic {
  domainId: AnnualReadingDomainId; title: string; sourceSubjects: string[];
}
export interface MonthReadingRhythmPeriod {
  id: string; branchId: AnnualDomainBranchId; monthId: string; monthLabel: string; ganZhi: string;
  startInstant: string; endExclusiveInstant: string; personalStartInstant: string; ageLabel: string;
  label: OutlookJudgmentLabel; caption: string; primaryAxis: OutlookAxis | null; primaryEffect: OutlookEffect | null;
  headline: string; summary: string; topics: MonthReadingRhythmTopic[]; handoverBefore: boolean;
  nodeRef: TransitNodeRef; backgroundRefs: TransitNodeRef[]; sourceSubjects: string[];
  conditions: string[];
}
export interface MonthReadingDirectionRange {
  id: string; startInstant: string; endExclusiveInstant: string; label: OutlookJudgmentLabel; caption: string;
  periodIds: string[]; text: string; sourceSubjects: string[];
}
export interface MonthReadingRhythmGap {
  source: "monthly" | "annual" | "link" | "before_birth";
  startInstant: string | null; endExclusiveInstant: string | null; message: string;
}
export interface MonthReadingRhythmBranch {
  id: AnnualDomainBranchId; label: string; overview: string; overviewSourceSubjects: string[];
  directionRanges: MonthReadingDirectionRange[]; periods: MonthReadingRhythmPeriod[];
  gaps: MonthReadingRhythmGap[]; conditions: string[];
}
export interface LocalMonthReadingRhythm {
  version: typeof MONTH_READING_RHYTHM_VERSION;
  sourceBinding: LocalAnnualMonthStory["sourceBinding"]; contextRef: ReadingContextReference | null;
  sourceVersions: string[]; year: number; yearGanZhi: string | null; startInstant: string | null; endExclusiveInstant: string | null;
  status: LocalAnnualMonthStory["status"]; headline: string; branches: MonthReadingRhythmBranch[]; conditions: string[];
}

const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const same = (a: unknown, b: unknown) => stable(a) === stable(b);
const unique = <T>(items: readonly T[]): T[] => [...new Set(items)];
const fail = (message: string): never => { throw new Error(`月份节奏来源：${message}`); };
const refsEqual = (a: readonly TransitNodeRef[], b: readonly TransitNodeRef[]) => same(a.map(stable).sort(), b.map(stable).sort());
function uniqueIds(items: readonly { id: string }[], message: string): void {
  if (new Set(items.map(item => item.id)).size !== items.length) fail(message);
}
function date(value: string): string {
  const instant = Date.parse(value);
  if (!Number.isFinite(instant)) return fail("时间范围无效。");
  const fixed = new Date(instant + 8 * 3_600_000);
  return `${fixed.getUTCMonth() + 1}月${fixed.getUTCDate()}日`;
}
function dayun(refs: readonly TransitNodeRef[]) { return refs.filter(ref => ref.nodeType === "dayun"); }
function rangesFor(periods: MonthReadingRhythmPeriod[]): MonthReadingDirectionRange[] {
  const result: MonthReadingDirectionRange[] = [];
  for (const period of periods) {
    const previous = result.at(-1);
    // This joins direction ranges only, not judgments or causal mechanisms.
    // A handover remains a boundary even when both sides have the same caption.
    if (previous && previous.endExclusiveInstant === period.startInstant && previous.label === period.label
      && previous.caption === period.caption && !period.handoverBefore) {
      previous.endExclusiveInstant = period.endExclusiveInstant;
      previous.periodIds.push(period.id);
      previous.sourceSubjects = unique([...previous.sourceSubjects, ...period.sourceSubjects]);
    } else result.push({ id: `range:${period.id}`, startInstant: period.startInstant, endExclusiveInstant: period.endExclusiveInstant,
      label: period.label, caption: period.caption, periodIds: [period.id], text: "", sourceSubjects: [...period.sourceSubjects] });
  }
  for (const range of result) {
    const startYear = new Date(Date.parse(range.startInstant) + 8 * 3_600_000).getUTCFullYear();
    const endYear = new Date(Date.parse(range.endExclusiveInstant) + 8 * 3_600_000).getUTCFullYear();
    range.text = `${date(range.startInstant)}至${endYear > startYear ? "次年" : ""}${date(range.endExclusiveInstant)}前：${range.caption}。`;
  }
  return result;
}

/** Lightweight projection: validate the supplied nodes, periods and cross-view
 * references, but do not recalculate judgments, annual contexts or legacy text.
 * Direction ranges are a reading aid; every distinct monthly topic stays below. */
export function buildMonthReadingRhythm({ monthly, monthlyDomains, annualMonthStory: story, contextual }: BuildMonthReadingRhythmInput): LocalMonthReadingRhythm {
  const binding = story.sourceBinding, year = monthly.year;
  if (monthly.revisionId !== binding.revisionId || monthly.chartResultHash !== binding.chartResultHash
    || !(["revisionId", "chartResultHash", "includeHour"] as const).every(key => monthlyDomains.sourceBinding[key] === binding[key])
    || year !== monthlyDomains.year || year !== story.year || monthly.yearGanZhi !== monthlyDomains.yearGanZhi || monthly.yearGanZhi !== story.yearGanZhi
    || monthly.startInstant !== monthlyDomains.startInstant || monthly.endExclusiveInstant !== monthlyDomains.endExclusiveInstant
    || monthly.startInstant !== story.startInstant || monthly.endExclusiveInstant !== story.endExclusiveInstant
    || !same(monthly.yearNodeRef, monthlyDomains.yearNodeRef) || !same(monthlyDomains.contextRef, story.contextRef)) fail("命盘、年份、完整年界或阅读背景不一致。");
  if (story.contextRef) {
    if (!contextual || !same(contextual.sourceBinding, binding) || !same(contextual.contextSource.reference, story.contextRef)
      || !same(contextual.contextSource.document.sourceBinding, binding)) fail("缺少同源现实背景，未借用其他背景的月份正文。");
  } else if (contextual) fail("月份未使用背景，却另传了现实背景。");
  if (!story.sourceVersions.includes(monthly.version) || !story.sourceVersions.includes(monthlyDomains.version)
    || monthlyDomains.sourceVersions.some(version => !story.sourceVersions.includes(version))) fail("月份和衔接的来源版本不一致。");
  const sourceVersions = unique([MONTH_READING_RHYTHM_VERSION, story.version, ...story.sourceVersions,
    monthly.version, monthlyDomains.version, ...monthlyDomains.sourceVersions]);
  const base = { version: MONTH_READING_RHYTHM_VERSION, sourceBinding: structuredClone(binding), contextRef: structuredClone(story.contextRef),
    sourceVersions, year, yearGanZhi: monthly.yearGanZhi, startInstant: monthly.startInstant, endExclusiveInstant: monthly.endExclusiveInstant,
    status: story.status, headline: "这一年的月份节奏" };
  const conditions = unique(["概览只连接原方向相同且连续的时间范围，各月的作用对象与生活主题仍分别保留；不表示各月机制相同。",
    "月份方向不是事件发生概率或最佳时点；实际交运只表示背景切换，前后仍各按自己的判断阅读。",
    ...story.limitations, ...monthlyDomains.limitations]);
  if (monthlyDomains.status === "unavailable") {
    if (story.status !== "unavailable" || monthly.months.length || monthlyDomains.months.length || story.months.length) fail("不可用月份混入了部分正文。");
    return { ...base, branches: [], conditions };
  }
  if (monthly.months.length !== 12 || monthlyDomains.months.length !== 12 || story.months.length !== 12) fail("十二个节令月份缺失或重复。");
  const nodes = new Map(story.nodes.map(node => [node.key, node.ref]));
  if (nodes.size !== story.nodes.length || !monthly.yearNodeRef || !same(nodes.get(monthly.yearNodeRef.nodeId), monthly.yearNodeRef)) fail("原年度节点或共享节点身份不一致。");
  const resolve = (key: string) => nodes.get(key) ?? fail("衔接引用缺少完整节点。");
  const branches = new Map<AnnualDomainBranchId, MonthReadingRhythmBranch>();
  const monthIds = new Set<string>();
  let cursor = monthly.startInstant;
  for (let index = 0; index < monthly.months.length; index++) {
    const month = monthly.months[index]!, reading = monthlyDomains.months[index]!, linked = story.months[index]!;
    if (monthIds.has(month.id) || month.id !== reading.monthId || month.id !== linked.monthId
      || month.startInstant !== cursor || Date.parse(month.startInstant) >= Date.parse(month.endExclusiveInstant)
      || [reading, linked].some(item => item.startInstant !== month.startInstant || item.endExclusiveInstant !== month.endExclusiveInstant
        || item.ganZhi !== month.ganZhi || item.label !== month.label)
      || reading.status !== linked.status || !same(reading.nodeRef, month.nodeRef) || !same(resolve(month.id), month.nodeRef)
      || !same(month.judgmentSegments, month.branches.flatMap(branch => branch.judgmentSegments))) fail("月份次序、区间或完整节点不一致。");
    monthIds.add(month.id); cursor = month.endExclusiveInstant;
    for (const values of [month.branches, reading.branches, linked.branches]) uniqueIds(values, "月份分支重复。");
    const branchIds = month.branches.map(branch => branch.id).sort();
    if (!same(branchIds, reading.branches.map(branch => branch.id).sort()) || !same(branchIds, linked.branches.map(branch => branch.id).sort())) fail("月份顺逆分支缺失。");
    if (index && !same(branchIds, [...branches.keys()].sort())) fail("相邻月份的顺逆分支不一致。");
    for (const branch of linked.branches) {
      const originalBranch = month.branches.find(item => item.id === branch.id)!, domainBranch = reading.branches.find(item => item.id === branch.id)!;
      if (branch.label !== domainBranch.label || branch.label !== originalBranch.label) fail("分支名称与原来源不一致。");
      let target = branches.get(branch.id);
      if (!target) { target = { id: branch.id, label: branch.label, overview: "", overviewSourceSubjects: [], directionRanges: [], periods: [], gaps: [], conditions: [] }; branches.set(branch.id, target); }
      target.conditions = unique([...target.conditions, ...branch.conditions, ...domainBranch.conditions]);
      target.gaps.push(...structuredClone(branch.gaps));
      uniqueIds(branch.periods, "衔接分段重复。"); uniqueIds(domainBranch.segments, "原月领域分段重复。"); uniqueIds(originalBranch.judgmentSegments, "原月判断分段重复。");
      if (branch.periods.length !== domainBranch.segments.length || branch.periods.length !== originalBranch.judgmentSegments.length) fail("原分段有遗漏。");
      if (linked.status === "before_birth") {
        if (branch.periods.length) fail("出生前月份夹带个人判断。");
        target.gaps.push({ source: "before_birth", startInstant: month.startInstant, endExclusiveInstant: month.endExclusiveInstant, message: `${month.label}在出生前，只保留历法范围。` });
      }
      for (const period of branch.periods) {
        const domainSegment = domainBranch.segments.find(item => item.id === period.id), original = originalBranch.judgmentSegments.find(item => item.id === period.id);
        if (!domainSegment || !original) return fail("衔接分段缺少唯一原判断。");
        const judgment = original.judgment, caption = outlookDirectionCaption(judgment, null);
        if (period.branchId !== branch.id || original.branchId !== branch.id || domainSegment.branchId !== branch.id
          || [domainSegment, original, judgment.interval].some(item => item.startInstant !== period.startInstant || item.endExclusiveInstant !== period.endExclusiveInstant)
          || period.personalStartInstant !== domainSegment.personalStartInstant || period.ageLabel !== domainSegment.ageLabel
          || period.judgmentCaption !== caption || domainSegment.judgmentCaption !== caption
          || domainSegment.judgmentVersion !== judgment.version || domainSegment.policyVersion !== judgment.policyVersion
          || !same(judgment.sourceBinding, monthlyDomains.sourceBinding) || !same(judgment.targetRef, month.nodeRef)
          || !refsEqual(judgment.backgroundRefs, domainSegment.backgroundRefs)
          || !same(period.backgroundLabels, domainSegment.backgroundLabels)) fail("分段的原方向、年龄、区间或判断来源不一致。");
        const previous = target.periods.at(-1);
        if (previous && Date.parse(previous.endExclusiveInstant) > Date.parse(period.startInstant)) fail("同分支月份区间重叠。");
        if (Date.parse(period.startInstant) < Date.parse(month.startInstant) || Date.parse(period.endExclusiveInstant) > Date.parse(month.endExclusiveInstant)
          || Date.parse(period.startInstant) >= Date.parse(period.endExclusiveInstant)) fail("个人分段超出原月份。");
        uniqueIds(period.domains, "衔接领域重复。"); uniqueIds(domainSegment.domains, "月领域重复。");
        if (!same(period.domains.map(item => item.id).sort(), ["career", "relationship", "wealth"])
          || !same(domainSegment.domains.map(item => item.id).sort(), ["career", "relationship", "wealth"])) fail("月份缺少原三个领域。");
        const topics: MonthReadingRhythmTopic[] = [];
        for (const domain of period.domains) {
          const ref = domain.links.monthlyDomain, originalDomain = domainSegment.domains.find(item => item.id === domain.id)!;
          if (ref.monthId !== month.id || ref.branchId !== branch.id || ref.segmentId !== period.id || ref.domainId !== domain.id
            || ref.startInstant !== period.startInstant || ref.endExclusiveInstant !== period.endExclusiveInstant
            || !same(resolve(ref.targetNodeKey), month.nodeRef) || !refsEqual(ref.backgroundNodeKeys.map(resolve), judgment.backgroundRefs)) fail("月领域引用不是当前原分段。");
          const subjects = [`month-${month.id}`, `monthly-domain-${month.id}-${period.id}-${domain.id}`,
            `annual-month-story-${year}-${month.id}-${period.id}-${domain.id}`];
          for (const link of domain.links.annualEvents) {
            if (link.year !== year || link.branchId !== branch.id || link.domainId !== domain.id
              || Date.parse(link.startInstant) > Date.parse(period.startInstant) || Date.parse(link.endExclusiveInstant) < Date.parse(period.endExclusiveInstant)
              || !same(resolve(link.targetNodeKey), monthly.yearNodeRef)
              || !refsEqual(link.backgroundNodeKeys.map(resolve), dayun(judgment.backgroundRefs))) fail("年度衔接引用跨年、跨分支或跨交运段。");
            subjects.push(`annual-${year}`, `annual-event-${year}-${link.segmentId}-${link.itemId}`, `annual-domain-${year}-${link.segmentId}-${domain.id}`);
            for (const contextualReading of contextual?.readings ?? []) {
              const scope = contextualReading.scope;
              if (scope.kind === "annual" && scope.year === year && scope.branchId === branch.id && scope.segmentId === link.segmentId && scope.domainId === domain.id) {
                if (scope.startInstant !== link.startInstant || scope.endExclusiveInstant !== link.endExclusiveInstant) fail("背景主题区间与年度引用不一致。");
                subjects.push(contextualReading.subjectId);
              }
            }
          }
          // Career/resource titles are the verified original monthly titles.
          // Only an independent monthly palace interaction adds a relationship
          // topic; an annual background alone is not a fresh monthly event.
          if (domain.id !== "relationship") {
            const expectedTitle = originalDomain.headline.startsWith(`${month.ganZhi}月：`) ? originalDomain.headline.slice(`${month.ganZhi}月：`.length) : "";
            if (!expectedTitle || domain.title !== expectedTitle || !domain.summary.endsWith(originalDomain.summary)) fail("衔接正文与原月领域主结论不一致。");
            topics.push({ domainId: domain.id, title: domain.title, sourceSubjects: unique(subjects) });
          } else if (domain.connection !== "annual_background" && domain.phase === "relationship") topics.push({ domainId: domain.id, title: domain.title, sourceSubjects: unique(subjects) });
        }
        const primary = judgment.axes.find(axis => axis.axis === judgment.primaryAxis);
        if (judgment.primaryAxis && !primary) fail("原主轴缺失。");
        const handoverBefore = !!previous && previous.endExclusiveInstant === period.startInstant && !refsEqual(dayun(previous.backgroundRefs), dayun(judgment.backgroundRefs));
        const relation = topics.find(topic => topic.domainId === "relationship");
        const summary = `事情推进侧重${topics.find(topic => topic.domainId === "career")!.title}；投入与使用侧重${topics.find(topic => topic.domainId === "wealth")!.title}。`
          + (relation ? `相处方面另看${relation.title}。` : "");
        target.periods.push({ id: period.id, branchId: branch.id, monthId: month.id, monthLabel: month.label, ganZhi: month.ganZhi,
          startInstant: period.startInstant, endExclusiveInstant: period.endExclusiveInstant, personalStartInstant: period.personalStartInstant, ageLabel: period.ageLabel,
          label: judgment.label, caption, primaryAxis: judgment.primaryAxis, primaryEffect: primary?.effect ?? null,
          headline: `${month.label}${branch.periods.length > 1 ? ` · ${date(period.startInstant)}起` : ""} · ${caption}`,
          summary, topics, handoverBefore, nodeRef: structuredClone(month.nodeRef), backgroundRefs: structuredClone(judgment.backgroundRefs),
          sourceSubjects: unique(topics.flatMap(topic => topic.sourceSubjects)),
          conditions: unique([...period.conditions, ...judgment.conditions, ...judgment.coverageGaps, ...judgment.conflicts,
            ...judgment.axes.flatMap(axis => [...axis.unresolvedConditions, ...axis.blockers, ...axis.rescues]),
            ...period.domains.flatMap(domain => domain.conditions), ...domainSegment.conditions]) });
      }
    }
  }
  if (cursor !== monthly.endExclusiveInstant) fail("月份未完整覆盖原立春年。");
  for (const branch of branches.values()) {
    branch.directionRanges = rangesFor(branch.periods);
    branch.overviewSourceSubjects = unique(branch.periods.flatMap(period => period.sourceSubjects));
    branch.gaps = [...new Map(branch.gaps.map(gap => [stable(gap), gap])).values()];
    branch.overview = branch.periods.length ? branch.directionRanges.map(range => range.text).join("")
      + (branch.periods.some(period => period.handoverBefore) ? "交运所在月份已按实际时刻分别列出前后两段。" : "")
      : story.status === "before_birth" ? "本年月份在出生前，只保留历法范围。" : "本年尚无可连接的个人月份，现有缺口分别保留。";
  }
  return { ...base, branches: [...branches.values()], conditions };
}
