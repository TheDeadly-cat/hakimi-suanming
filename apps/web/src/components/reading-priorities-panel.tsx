import { useId, useMemo, useState } from "react";
import type { LocalReadingPriorities, ReadingPriorityBranch, ReadingPriorityDomainTheme, ReadingPrioritySegment, ReadingPriorityYear } from "../lib/local-reading-priorities";
import { splitAnnualDomainObstacles } from "../lib/annual-domain-presentation";
import { annualEventFeedbackSubjectId, type LocalReadingAnnualEvents } from "../lib/local-annual-event-record";
import { annualEventCompositionSubjectId, type AnnualEventCompositionItem, type AnnualEventCompositionSegment } from "../lib/local-annual-event-composition";
import { priorityEventKey, projectPriorityAnnualEvents } from "../lib/priority-annual-events";
import { PersonalReadingScope, usePersonalReading } from "./personal-reading-note";
import type { LocalReadingAnnualLifeStories } from "../lib/annual-life-story";
import { annualAnswerForPriority, annualAnswerSegmentTitle, type AnnualAnswerPersonalSources } from "../lib/annual-answer-navigation";
import "./reading-priorities-panel.css";

export interface ReadingPrioritiesPanelProps {
  reading: LocalReadingPriorities | null;
  annualEvents?: LocalReadingAnnualEvents | null;
  annualLifeStories?: LocalReadingAnnualLifeStories | null;
  annualLifeStoryPersonalSources?: AnnualAnswerPersonalSources;
  selectedYear?: number;
  onSelectYear?: (year: number) => void;
}
const instantLabel = (instant: string) => new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date(instant));
const unique = (items: readonly string[]) => [...new Set(items)];

function YearLink({ year, selectedYear, onSelectYear, detail = false }: { year: number; selectedYear?: number; onSelectYear?: (year: number) => void; detail?: boolean }) {
  const label = detail ? `阅读 ${year} 年完整解读 →` : `${year} 年`;
  return onSelectYear ? <a href="#reading-yearly" aria-current={year === selectedYear ? "date" : undefined} onClick={() => onSelectYear(year)}>{label}</a> : <span>{label}</span>;
}

function Period({ start, end }: { start: string; end: string }) {
  return <p className="reading-priority-period"><time dateTime={start}>{instantLabel(start)}</time> 起至 <time dateTime={end}>{instantLabel(end)}</time>前 · 北京时间</p>;
}

function DomainPoints({ title, items }: { title: string; items: readonly string[] }) {
  return items.length ? <div className="reading-priority-domain-points"><p className="reading-priority-domain-label">{title}</p><ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul></div> : null;
}

function DomainReading({ domain }: { domain: ReadingPriorityDomainTheme }) {
  // Old projections may carry only headline/summary. Missing examples are not
  // reconstructed from an overall caption or another segment.
  const examples = domain.examples ?? [];
  const { obstacles, readingScope } = splitAnnualDomainObstacles(domain.obstacles);
  return <section className="reading-priority-domain" aria-label={domain.title}>
    <h6>{domain.title}</h6><p className="reading-priority-domain-headline">{domain.headline}</p>
    <DomainPoints title="可对照的情境" items={examples.slice(0, 2)} />
    <DomainPoints title="主要阻力" items={obstacles.slice(0, 1)} />
    <details className="reading-priority-evidence reading-priority-domain-detail"><summary>完整领域说明与依据</summary>
      <p>{domain.summary}</p>
      {(domain.paragraphs ?? []).filter((paragraph) => paragraph !== domain.summary).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      <DomainPoints title="其他可对照情境" items={examples.slice(2)} />
      <DomainPoints title="可发挥的部分" items={domain.opportunities ?? []} />
      <DomainPoints title="其他阻力" items={obstacles.slice(1)} />
      <DomainPoints title="阅读范围" items={readingScope} />
      <DomainPoints title="值得观察" items={domain.watchPoints ?? []} />
      <DomainPoints title="适用条件" items={domain.conditions ?? []} />
      <DomainPoints title="原判断依据" items={domain.evidence ?? []} />
      {domain.sourceIds?.length ? <p>来源条目：{domain.sourceIds.join("、")}</p> : null}
      {domain.sourceVersions.length ? <p className="reading-priorities-version">来源版本：{domain.sourceVersions.join("、")}</p> : null}
    </details>
  </section>;
}

type EventSource = LocalReadingAnnualEvents["sourceBinding"];
type EventProjection = { segments: Map<string, AnnualEventCompositionSegment>; sourceBinding?: EventSource;
  priorityBinding?: LocalReadingPriorities["sourceBinding"]; stories?: LocalReadingAnnualLifeStories | null; personalSources?: AnnualAnswerPersonalSources };

function EventPreview({ year, segment, item, expectedSource }: { year: number; segment: AnnualEventCompositionSegment; item: AnnualEventCompositionItem; expectedSource?: EventSource }) {
  const primary = item.members.some((member) => member.priority === "primary");
  return <article className="reading-priority-event" data-event-id={item.id}>
    <p className="reading-priority-event-label">{primary ? "本段先看" : "同时留意"}{item.kind === "settlement" ? " · 同一事项的两面" : ""}</p>
    {item.kind === "settlement" ? <>
      <PersonalReadingScope subjectId={annualEventCompositionSubjectId(year, segment, item)} expectedSource={expectedSource}><h5>{item.title}</h5><p>{item.summary}</p></PersonalReadingScope>
      {item.members.map((member) => <section className="reading-priority-event-facet" key={member.id} aria-label={member.domain === "career" ? "事业侧解释" : "资源侧解释"}>
        <p className="reading-priority-event-label">{member.domain === "career" ? "完成与确认" : "约定与后续安排"}</p>
        <PersonalReadingScope subjectId={annualEventFeedbackSubjectId(year, segment, member)} expectedSource={expectedSource}><p>{member.summary}</p></PersonalReadingScope>
      </section>)}
    </> : <PersonalReadingScope subjectId={annualEventFeedbackSubjectId(year, segment, item.members[0])} expectedSource={expectedSource}>
      <h5>{item.members[0].title}</h5><p>{item.members[0].summary}</p>
    </PersonalReadingScope>}
    <details className="reading-priority-evidence"><summary>这项情境的依据与适用范围</summary>
      {item.members.map((member) => <section key={member.id}>
        <h6>{member.title}</h6>
        <DomainPoints title="可对照的情境" items={member.examples} />
        <DomainPoints title="列出理由" items={member.why} />
        <DomainPoints title="适用情境" items={member.applicability} />
        <DomainPoints title="不宜直接套用" items={member.notApplicableWhen} />
        <DomainPoints title="原条件" items={member.conditions} />
        <DomainPoints title="原依据" items={member.evidence} />
        {member.sourceIds.length ? <p>来源条目：{member.sourceIds.join("、")}</p> : null}
      </section>)}
      <DomainPoints title="分段条件" items={segment.conditions} />
    </details>
  </article>;
}

function SegmentReading({ segment, year, events, expectedSource, showCaption = true }: { segment: ReadingPrioritySegment; year: number; events?: AnnualEventCompositionSegment; expectedSource?: EventSource; showCaption?: boolean }) {
  const conditions = unique([...segment.conditions, ...segment.judgment.conditions, ...segment.judgment.conflicts, ...segment.judgment.coverageGaps,
    ...segment.judgment.axes.flatMap((axis) => [...axis.satisfiedConditions, ...axis.unresolvedConditions, ...axis.blockers, ...axis.rescues])]);
  return <section className="reading-priority-segment" aria-label={`${instantLabel(segment.startInstant)}起的年度分段`}>
    <Period start={segment.startInstant} end={segment.endExclusiveInstant} />
    {segment.ageLabel ? <p className="reading-priority-context">{segment.ageLabel}{segment.personalStartInstant && Date.parse(segment.personalStartInstant) > Date.parse(segment.startInstant) ? <> · 个人解读自 <time dateTime={segment.personalStartInstant}>{instantLabel(segment.personalStartInstant)}</time> 起</> : null}</p> : null}
    {showCaption ? <p className="reading-priority-caption">{segment.caption}</p> : null}
    {events ? <>
      <div className="reading-priority-main-events" aria-label="本段主要情境">{events.items.slice(0, 2).map((item) => <EventPreview key={item.id} year={year} segment={events} item={item} expectedSource={expectedSource} />)}</div>
      {events.items.length > 2 ? <details className="reading-priority-evidence"><summary>其余已生成情境</summary>{events.items.slice(2).map((item) => <EventPreview key={item.id} year={year} segment={events} item={item} expectedSource={expectedSource} />)}</details> : null}
      {segment.domains.length ? <details className="reading-priority-evidence reading-priority-full-domains"><summary>展开事业、财务与关系的完整解释</summary>{segment.domains.map((domain) => <DomainReading key={domain.id} domain={domain} />)}</details> : null}
    </> : segment.domains.map((domain) => <DomainReading key={domain.id} domain={domain} />)}
    {!segment.domains.length ? <p>{segment.judgment.summary}</p> : null}
    <details className="reading-priority-evidence"><summary>这一时间段的原判断与完整限定</summary>
      {segment.domains.length ? <p>{segment.judgment.summary}</p> : null}
      {conditions.length ? <ul>{conditions.map((item, index) => <li key={index}>{item}</li>)}</ul> : null}
    </details>
  </section>;
}

function YearDetail({ year, events }: { year: ReadingPriorityYear; events: EventProjection }) {
  return <div className="reading-priority-year-detail">
    {!year.segments.length ? <p>{year.summary}</p> : null}
    <div className={year.segments.length > 1 ? "reading-priority-split" : undefined} aria-label={year.segments.length > 1 ? "年内不同时间段" : undefined}>
      {year.segments.map((segment) => <SegmentReading key={segment.id} segment={segment} year={year.year} events={events.segments.get(priorityEventKey(year.year, segment.branchId, segment.id))} expectedSource={events.sourceBinding} showCaption={year.segments.length > 1} />)}
    </div>
    {year.turningPoints.length ? <details className="reading-priority-evidence"><summary>交运与判断变化的依据</summary>{year.turningPoints.map((point) => <section className="reading-priority-turning" key={point.id}>
      <h6>{point.headline}</h6><p className="reading-priority-period">{instantLabel(point.atInstant)} · 北京时间</p>
      <p>{point.summary}</p><p>此前：{point.before.caption}</p><p>此后：{point.after.caption}</p>
      {point.conditions.length ? <details className="reading-priority-evidence"><summary>这次变化的条件</summary><ul>{point.conditions.map((item, index) => <li key={index}>{item}</li>)}</ul></details> : null}
    </section>)}</details> : null}
    {year.gaps.map((gap, index) => <div className="reading-priority-gap" key={index}>
      {gap.startInstant && gap.endExclusiveInstant ? <Period start={gap.startInstant} end={gap.endExclusiveInstant} /> : null}
      <p>{gap.message}</p>{gap.conditions.length ? <ul>{gap.conditions.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul> : null}
    </div>)}
    {year.conditions.length ? <details className="reading-priority-evidence"><summary>本年的整体条件</summary><ul>{year.conditions.map((item, index) => <li key={index}>{item}</li>)}</ul></details> : null}
  </div>;
}

function EventNavigation({ year, segment, item, expectedSource }: { year: number; segment: AnnualEventCompositionSegment; item: AnnualEventCompositionItem; expectedSource?: EventSource }) {
  const personal = usePersonalReading();
  const source = personal?.sourceBinding;
  const personalMatches = expectedSource && source && source.caseId === expectedSource.caseId && source.revisionId === expectedSource.revisionId
    && source.chartResultHash === expectedSource.chartResultHash && source.includeHour === expectedSource.includeHour;
  const subjectId = item.kind === "settlement" ? annualEventCompositionSubjectId(year, segment, item)
    : annualEventFeedbackSubjectId(year, segment, item.members[0]);
  return <div className="reading-priority-event-navigation" data-event-id={item.id}>
    <PersonalReadingScope subjectId={subjectId} expectedSource={expectedSource}>
      <p className="reading-priority-navigation-title">{item.kind === "settlement" ? item.title : item.members[0].title}</p>
    </PersonalReadingScope>
    {item.kind === "settlement" ? item.members.map((member) => {
      const memberSubject = annualEventFeedbackSubjectId(year, segment, member);
      // The group and both original members are separate feedback subjects.
      // Keep every personal note in the navigation, even when the automatic
      // member explanation now lives in the full-year disclosure below.
      return personalMatches && personal?.entries.some((entry) => entry.subjectId === memberSubject)
        ? <div className="reading-priority-personal-member" key={member.id}>
          <p className="reading-priority-event-label">{member.domain === "career" ? "事业侧个人阅读" : "资源侧个人阅读"}</p>
          <PersonalReadingScope subjectId={memberSubject} expectedSource={expectedSource}><p>{member.summary}</p></PersonalReadingScope>
        </div> : null;
    }) : null}
  </div>;
}

function YearNavigation({ year, events }: { year: ReadingPriorityYear; events: EventProjection }) {
  return <div className="reading-priority-navigation" aria-label="年份导航摘要">
    {!year.segments.length ? <p>{year.summary}</p> : null}
    {year.segments.map((segment) => {
      const projected = events.segments.get(priorityEventKey(year.year, segment.branchId, segment.id));
      const answer = events.priorityBinding ? annualAnswerForPriority(year, segment, events.priorityBinding, events.stories) : null;
      return <section className="reading-priority-navigation-segment" data-navigation-segment={segment.id} key={segment.id}
        aria-label={`${instantLabel(segment.startInstant)}起的导航摘要`}>
        <Period start={segment.startInstant} end={segment.endExclusiveInstant} />
        {year.segments.length > 1 && segment.caption !== year.caption ? <p className="reading-priority-caption">{segment.caption}</p> : null}
        {segment.ageLabel ? <p className="reading-priority-context">{segment.ageLabel}</p> : null}
        {answer ? <p className="reading-priority-answer" aria-label="这段年份的主结论">{annualAnswerSegmentTitle(year.year, answer.segment, events.personalSources)}</p> : null}
        {projected ? projected.items.map((item) => <EventNavigation key={item.id} year={year.year} segment={projected} item={item} expectedSource={events.sourceBinding} />)
          : segment.domains.map((domain) => <p className="reading-priority-navigation-title" key={domain.id}>{domain.title}：{domain.headline}</p>)}
      </section>;
    })}
    {year.gaps.map((gap, index) => <div className="reading-priority-gap" key={index}>
      {gap.startInstant && gap.endExclusiveInstant ? <Period start={gap.startInstant} end={gap.endExclusiveInstant} /> : null}
      <p>{gap.message}</p>{gap.conditions.length ? <ul>{gap.conditions.map((condition, itemIndex) => <li key={itemIndex}>{condition}</li>)}</ul> : null}
    </div>)}
  </div>;
}

function YearCard({ year, events, selectedYear, onSelectYear }: { year: ReadingPriorityYear; events: EventProjection; selectedYear?: number; onSelectYear?: (year: number) => void }) {
  return <article className="reading-priority-year" aria-label={`${year.year}年先读`}>
    <div className="reading-priority-year-heading"><h4><YearLink year={year.year} selectedYear={selectedYear} onSelectYear={onSelectYear} /></h4>{year.yearGanZhi ? <span>{year.yearGanZhi}</span> : null}</div>
    <p className="reading-priority-caption">{year.caption}</p>
    <YearNavigation year={year} events={events} />
    <details className="reading-priority-details reading-priority-year-full"><summary>展开本年完整内容与依据</summary><YearDetail year={year} events={events} /></details>
    {year.selectionReasons.length ? <details className="reading-priority-evidence"><summary>为什么先读这一年</summary><ul className="reading-priority-reasons" aria-label="入选原因">{year.selectionReasons.map((reason, index) => <li key={index}>{reason.text}</li>)}</ul></details> : null}
    <p className="reading-priority-full-link"><YearLink year={year.year} selectedYear={selectedYear} onSelectYear={onSelectYear} detail /></p>
  </article>;
}

function CompareYears({ branch, events, selectedYear, onSelectYear }: { branch: ReadingPriorityBranch; events: EventProjection; selectedYear?: number; onSelectYear?: (year: number) => void }) {
  const id = useId();
  const [firstChoice, setFirstChoice] = useState<number | null>(null), [secondChoice, setSecondChoice] = useState<number | null>(null);
  const first = branch.years.find((item) => item.year === firstChoice)
    ?? branch.years.find((item) => item.year === selectedYear)
    ?? branch.years.find((item) => item.id === branch.priorityYearIds[0]) ?? branch.years[0];
  const second = branch.years.find((item) => item.year === secondChoice && item.year !== first?.year)
    ?? branch.years.find((item) => branch.priorityYearIds.includes(item.id) && item.year !== first?.year)
    ?? branch.years.find((item) => item.year !== first?.year);
  if (!first || !second) return null;
  return <details className="reading-priority-comparison"><summary>并列比较两年 · {branch.label}</summary>
    <p className="reading-priority-comparison-note">在同一分支内对照原判断、年内分段与生活主题。选择比较年份不会切换当前阅读年份。</p>
    <div className="reading-priority-compare-controls">
      <label htmlFor={`${id}-first`}>比较年份一<select id={`${id}-first`} value={first.year} onChange={(event) => setFirstChoice(Number(event.target.value))}>{branch.years.map((item) => <option key={item.id} value={item.year}>{item.year} 年{item.yearGanZhi ? ` · ${item.yearGanZhi}` : ""}</option>)}</select></label>
      <label htmlFor={`${id}-second`}>比较年份二<select id={`${id}-second`} value={second.year} onChange={(event) => setSecondChoice(Number(event.target.value))}>{branch.years.map((item) => <option key={item.id} value={item.year} disabled={item.year === first.year}>{item.year} 年{item.yearGanZhi ? ` · ${item.yearGanZhi}` : ""}</option>)}</select></label>
    </div>
    <div className="reading-priority-compare-columns">{[first, second].map((year) => <article key={year.id} className="reading-priority-compare-year" aria-label={`${branch.label} · ${year.year}年比较`}>
      <h4>{year.year} 年{year.yearGanZhi ? ` · ${year.yearGanZhi}` : ""}</h4><p className="reading-priority-caption">{year.caption}</p>
      <YearDetail year={year} events={events} /><p className="reading-priority-full-link"><YearLink year={year.year} selectedYear={selectedYear} onSelectYear={onSelectYear} detail /></p>
    </article>)}</div>
  </details>;
}

export function ReadingPrioritiesPanel({ reading, annualEvents, annualLifeStories, annualLifeStoryPersonalSources, selectedYear, onSelectYear }: ReadingPrioritiesPanelProps) {
  const events = useMemo<EventProjection>(() => ({ segments: reading ? projectPriorityAnnualEvents(reading, annualEvents) : new Map(), sourceBinding: annualEvents?.sourceBinding,
    priorityBinding: reading?.sourceBinding, stories: annualLifeStories, personalSources: annualLifeStoryPersonalSources }), [reading, annualEvents, annualLifeStories, annualLifeStoryPersonalSources]);
  if (!reading) return null;
  return <section className="reading-priorities-panel" aria-label="关键年份先读">
    <header><span className="reading-priorities-kicker">{reading.startYear}—{reading.endYear} · 年份先读</span><h2>{reading.headline}</h2></header>
    <p className="reading-priorities-lead">{reading.summary}</p>
    {reading.branches.map((branch) => {
      const priorities = branch.priorityYearIds.flatMap((id) => { const year = branch.years.find((item) => item.id === id); return year ? [year] : []; });
      const others = branch.years.filter((year) => !branch.priorityYearIds.includes(year.id));
      return <section className="reading-priority-branch" key={branch.id} aria-label={branch.label}>
        <h3>{branch.label}</h3>
        {priorities.length ? <div className="reading-priority-years">{priorities.map((year) => <YearCard key={year.id} year={year} events={events} selectedYear={selectedYear} onSelectYear={onSelectYear} />)}</div>
          : <p>当前范围内没有单独列为先读的年份，其余已计算内容仍可展开。</p>}
        {others.length ? <details className="reading-priority-others"><summary>查看其余 {others.length} 年</summary><div className="reading-priority-years">{others.map((year) => <YearCard key={year.id} year={year} events={events} selectedYear={selectedYear} onSelectYear={onSelectYear} />)}</div></details> : null}
        <CompareYears key={`${reading.sourceBinding.revisionId}:${reading.sourceBinding.chartResultHash}:${reading.startYear}:${reading.endYear}:${branch.id}`} branch={branch} events={events} selectedYear={selectedYear} onSelectYear={onSelectYear} />
        {branch.conditions.length || branch.gaps.length ? <details className="reading-priority-evidence"><summary>这一分支的适用条件与缺口</summary>
          <ul>{branch.conditions.map((item, index) => <li key={index}>{item}</li>)}</ul>
          {branch.gaps.map((gap, index) => <div key={index}><p>{gap.year} 年 · {gap.message}</p>{gap.startInstant && gap.endExclusiveInstant ? <Period start={gap.startInstant} end={gap.endExclusiveInstant} /> : null}
            {gap.conditions.length ? <ul>{gap.conditions.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul> : null}</div>)}
        </details> : null}
      </section>;
    })}
    {reading.limitations.length || reading.sourceVersions.length ? <details className="reading-priority-evidence reading-priorities-scope"><summary>年份先读的范围与来源</summary>
      <ul>{reading.limitations.map((item, index) => <li key={index}>{item}</li>)}</ul>
      {reading.sourceVersions.length ? <p className="reading-priorities-version">来源版本：{reading.sourceVersions.join("、")}</p> : null}
    </details> : null}
  </section>;
}
