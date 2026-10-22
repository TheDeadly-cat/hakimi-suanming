import { useId, useMemo } from "react";
import type { LocalReadingPriorities } from "../lib/local-reading-priorities";
import { annualEventFeedbackSubjectId, type LocalReadingAnnualEvents } from "../lib/local-annual-event-record";
import { projectPriorityAnnualEvents, priorityEventKey } from "../lib/priority-annual-events";
import { ANNUAL_RELATIONSHIP_TIMING_VERSION } from "../lib/annual-relationship-timing";
import type { AnnualEventItem } from "../lib/local-annual-event-reading";
import type { AnnualEventCompositionSegment } from "../lib/local-annual-event-composition";
import { PersonalReadingScope, usePersonalReading } from "./personal-reading-note";
import "./relationship-windows-panel.css";

interface Props {
  reading: LocalReadingPriorities;
  annualEvents?: LocalReadingAnnualEvents | null;
  selectedYear?: number;
  onSelectYear?: (year: number) => void;
}
const formatInstant = (value: string) => new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date(value));
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const same = (a: unknown, b: unknown) => stable(a) === stable(b);
type WindowPeriod = { segment: AnnualEventCompositionSegment; item: AnnualEventItem };
type WindowYear = { year: number; startInstant: string | null; endExclusiveInstant: string | null; periods: WindowPeriod[]; mergeable: boolean };
const displayedReading = (item: AnnualEventItem) => stable([item.title, item.summary, item.examples, item.applicability, item.notApplicableWhen, item.priority]);
function continuousGroups(years: WindowYear[]): WindowYear[][] {
  const result: WindowYear[][] = [];
  for (const year of years) {
    const previous = result.at(-1)?.at(-1), left = previous?.periods[0], right = year.periods[0];
    if (previous?.mergeable && year.mergeable && left && right && year.year === previous.year + 1
      && left.segment.endExclusiveInstant === right.segment.personalStartInstant
      && left.segment.ageStage === right.segment.ageStage
      && same(left.segment.backgroundRefs, right.segment.backgroundRefs)
      && displayedReading(left.item) === displayedReading(right.item)) result.at(-1)!.push(year);
    else result.push([year]);
  }
  return result;
}
function WindowAnswer({ item }: { item: AnnualEventItem }) {
  return <><h4 className="relationship-window-title">{item.title}</h4><p className="relationship-window-answer">{item.summary}</p>
    <div className="relationship-window-scenes"><p>生活中可能表现为</p><ul>{item.examples.map((text, index) => <li key={index}>{text}</li>)}</ul></div></>;
}
function WindowTime({ segment }: { segment: AnnualEventCompositionSegment }) {
  return <p className="relationship-window-time"><time dateTime={segment.personalStartInstant}>{formatInstant(segment.personalStartInstant)}</time> 至 <time dateTime={segment.endExclusiveInstant}>{formatInstant(segment.endExclusiveInstant)}</time>前 · 北京时间 · {segment.ageLabel}</p>;
}
function WindowBasis({ item, segment, year, includeOriginal = false }: WindowPeriod & { year: number; includeOriginal?: boolean }) {
  return <details className="relationship-window-basis"><summary>{includeOriginal ? `${year} 年原文、依据与适用条件` : "判断依据与适用条件"}</summary>
    {includeOriginal ? <div className="relationship-window-original"><WindowAnswer item={item} /></div> : null}
    <ul>{item.why.map((text, index) => <li key={index}>{text}</li>)}</ul>
    <ul>{[...new Set([...item.applicability, ...item.notApplicableWhen, ...item.conditions, ...segment.conditions])].map((text, index) => <li key={index}>{text}</li>)}</ul>
    {item.evidence.length ? <details><summary>完整原始证据</summary><ul>{item.evidence.map((text, index) => <li key={index}>{text}</li>)}</ul></details> : null}
  </details>;
}

/** An index of the original relationship items, not a second forecast or
 * probability ranking. Every shown item retains its original feedback ID. */
export function RelationshipWindowsPanel({ reading, annualEvents, selectedYear, onSelectYear }: Props) {
  const headingId = useId();
  const personal = usePersonalReading();
  const branches = useMemo(() => {
    const projected = projectPriorityAnnualEvents(reading, annualEvents);
    const personalEntries = personal && annualEvents && same(personal.sourceBinding, annualEvents.sourceBinding) ? personal.entries : [];
    const hasPersonal = (year: number) => personalEntries.some((entry) => entry.subjectId === "annual-overview" || entry.subjectId === `annual-${year}`
      || [`annual-domain-${year}-`, `annual-event-${year}-`, `annual-event-composed-${year}-`, `contextual-annual-${year}-`, `event-${year}-`].some((prefix) => entry.subjectId.startsWith(prefix)));
    return reading.branches.map((branch) => ({ id: branch.id, label: branch.label,
      years: branch.years.map((year): WindowYear => ({ year: year.year, startInstant: year.startInstant, endExclusiveInstant: year.endExclusiveInstant,
        mergeable: year.segments.length === 1 && year.gaps.length === 0 && !hasPersonal(year.year)
          && year.segments[0]!.personalStartInstant === year.startInstant && year.segments[0]!.endExclusiveInstant === year.endExclusiveInstant
          && year.segments[0]!.ageStage !== "adult_transition",
        periods: year.segments.flatMap((segment) => {
          const original = projected.get(priorityEventKey(year.year, branch.id, segment.id));
          if (!original) return [];
          return original.items.flatMap((group) => group.members).flatMap((item) => {
            const timing = item.relationshipTiming;
            if (item.domain !== "relationship" || !timing || timing.version !== ANNUAL_RELATIONSHIP_TIMING_VERSION || !timing.triggered
              || timing.sourceBinding.revisionId !== reading.sourceBinding.revisionId || timing.sourceBinding.chartResultHash !== reading.sourceBinding.chartResultHash
              || timing.sourceBinding.includeHour !== reading.sourceBinding.includeHour || timing.scope.year !== year.year
              || timing.scope.branchId !== branch.id || timing.scope.segmentId !== segment.id
              || timing.scope.startInstant !== segment.startInstant || timing.scope.endExclusiveInstant !== segment.endExclusiveInstant
              || !same(timing.scope.targetRef, year.nodeRef) || !same(timing.scope.backgroundRefs, segment.judgment.backgroundRefs)
              || !timing.lenses.some((lens) => lens.focus === "annual_focus" && lens.triggerSignalIds.some((id) =>
                lens.annualSignalIds.includes(id) && lens.signals.some((signal) => signal.id === id && signal.source === "year")))) return [];
            return [{ segment: original, item }];
          });
        }) })).filter((year) => year.periods.length).map((year) => ({ ...year, mergeable: year.mergeable && year.periods.length === 1 }))
    })).filter((branch) => branch.years.length).map((branch) => ({ ...branch, groups: continuousGroups(branch.years) }));
  }, [reading, annualEvents, personal]);
  if (!branches.length) return null;
  const ages = branches.flatMap((branch) => branch.years.flatMap((year) => year.periods.map((period) => period.segment.ageStage)));
  const title = ages.every((age) => age === "adult") ? "感情与共同生活的年份重点"
    : ages.some((age) => age === "adult") ? "关系与共同生活的年份重点"
    : ages.some((age) => age === "unknown") ? "相处与共同安排的年份重点" : "家人、同伴与共同活动的年份重点";
  return <section className="relationship-windows-panel" aria-labelledby={headingId}>
    <p className="relationship-windows-kicker">{reading.startYear}—{reading.endYear} · 关系年份</p>
    <h2 id={headingId}>{title}</h2>
    <p className="relationship-windows-lead">按年份看主要变化与可能出现的生活情境，判断依据可展开查看。</p>
    {branches.map((branch) => <section key={branch.id} aria-label={`${branch.label}的关系年份`}>
      <h3 className={reading.branches.length > 1 ? undefined : "sr-only"}>{branch.label}</h3>
      <ol className="relationship-window-years">{branch.groups.map((years) => years.length > 1 ? <li key={years[0]!.year} className="relationship-window-group">
        <div className="relationship-window-year"><strong>{years[0]!.year}—{years.at(-1)!.year} 年</strong><span className="relationship-window-continuity">持续关注</span></div>
        <div className="relationship-window-period"><WindowAnswer item={years[0]!.periods[0]!.item} />
          <p className="relationship-window-continuity-note">这段时间的阅读主题相同，各年的时间与依据分别保留。</p>
          <ol className="relationship-window-members">{years.map((year) => {
            const { segment, item } = year.periods[0]!;
            return <li key={year.year}><div className="relationship-window-member-heading"><strong>{year.year} 年</strong>
              {onSelectYear ? <a href="#reading-yearly" aria-current={selectedYear === year.year ? "date" : undefined} onClick={() => onSelectYear(year.year)}>阅读 {year.year} 年</a> : null}</div>
              <PersonalReadingScope subjectId={annualEventFeedbackSubjectId(year.year, segment, item)} expectedSource={annualEvents?.sourceBinding}>
                <WindowTime segment={segment} /><WindowBasis segment={segment} item={item} year={year.year} includeOriginal />
              </PersonalReadingScope>
            </li>;
          })}</ol>
        </div>
      </li> : years.map((year) => <li key={year.year}>
        <div className="relationship-window-year"><strong>{year.year} 年</strong>
          {onSelectYear ? <a href="#reading-yearly" aria-current={selectedYear === year.year ? "date" : undefined} onClick={() => onSelectYear(year.year)}>阅读这一年</a> : null}
        </div>
        {year.periods.map(({ segment, item }, index) => <div key={`${segment.id}:${item.id}`} className="relationship-window-period">
          {year.periods.length > 1 ? <p className="relationship-window-part">第 {index + 1} 段</p> : null}
          <PersonalReadingScope subjectId={annualEventFeedbackSubjectId(year.year, segment, item)} expectedSource={annualEvents?.sourceBinding}>
            <WindowAnswer item={item} /><WindowTime segment={segment} /><WindowBasis segment={segment} item={item} year={year.year} />
          </PersonalReadingScope>
        </div>)}
      </li>))}</ol>
    </section>)}
    <p className="relationship-windows-note">这些年份对应命盘中的关系线索，具体发展仍取决于双方的现实处境与选择。</p>
  </section>;
}
