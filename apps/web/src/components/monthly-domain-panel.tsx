import type { LocalContextualReadingBundle } from "../lib/local-contextual-reading-record";
import type { RevisionRecord } from "@hakimi/contracts";
import type { NatalWealthResourceTask } from "../../../../packages/bazi-interpretation/src/natal-wealth-resource-task";
import type { LocalMonthlyPeriod } from "../lib/local-detailed-outlook";
import type { LocalAnnualYear } from "../lib/local-annual-outlook";
import { plainMonthlyPresentation } from "../lib/plain-monthly-presentation";
import type { AnnualDomainReading } from "../lib/local-annual-domain-reading";
import type { LocalMonthlyDomainReading, LocalMonthlyDomainReadings, MonthlyDomainSegment } from "../lib/local-monthly-domain-reading";
import { PersonalReadingScope } from "./personal-reading-note";
import type { LocalPersonalReading } from "../lib/local-personal-reading";
import "./monthly-domain-panel.css";

export interface MonthlyDomainPanelProps {
  reading: LocalMonthlyDomainReading | null; collection?: LocalMonthlyDomainReadings | null; contextual?: LocalContextualReadingBundle | null;
  revision?: RevisionRecord | null; month?: LocalMonthlyPeriod | null; task?: NatalWealthResourceTask | null;
  annualYear?: LocalAnnualYear | null; personal?: LocalPersonalReading | null;
  onFeedbackDomain?: (subjectId: string) => void;
}
const instantLabel = (instant: string) => new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date(instant));

function Period({ start, end }: { start: string; end: string }) {
  return <p className="monthly-domain-period"><time dateTime={start}>{instantLabel(start)}</time> 起至 <time dateTime={end}>{instantLabel(end)}</time>前 · 北京时间</p>;
}

function Evidence({ title, conditions, evidence = [] }: { title: string; conditions: string[]; evidence?: string[] }) {
  if (!conditions.length && !evidence.length) return null;
  return <details className="monthly-domain-evidence"><summary>{title}</summary><ul>{[...conditions, ...evidence].map((item, index) => <li key={index}>{item}</li>)}</ul></details>;
}

function Points({ title, items, examples = false }: { title: string; items: string[]; examples?: boolean }) {
  if (!items.length) return null;
  return <div className={`monthly-domain-points${examples ? " monthly-domain-examples" : ""}`}><h6>{title}</h6><ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul></div>;
}

function DomainReading({ domain, subjectId, onFeedbackDomain, plain, expectedSource }: { expectedSource?: LocalPersonalReading["sourceBinding"]; plain?: ReturnType<typeof plainMonthlyPresentation>; domain: AnnualDomainReading; subjectId: string; onFeedbackDomain?: (subjectId: string) => void }) {
  return <article className="monthly-domain" aria-label={domain.title}>
    <p className="monthly-domain-label">{domain.title}</p>
    <PersonalReadingScope subjectId={subjectId} expectedSource={expectedSource}>
      <h5>{plain?.headline ?? domain.headline}</h5><p className="monthly-domain-verdict">{plain?.summary ?? domain.summary}</p>
      <Points title={domain.id === "relationship" ? "放到生活里对照" : "本月可能出现的情境"} items={plain ? plain.displayExamples : domain.examples} examples />
      <details className="monthly-domain-evidence"><summary>完整原解释与判断依据</summary>
      {plain ? <><p>{domain.headline}</p><p>{domain.summary}</p></> : null}
      {plain ? <Points title="完整原例" items={domain.examples} examples /> : null}
      {domain.paragraphs.filter((paragraph) => !domain.summary.includes(paragraph)).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      <div className="monthly-domain-points-grid"><Points title="可以发挥的部分" items={domain.opportunities} /><Points title="需要留意的阻力" items={domain.obstacles} /></div>
      <Points title="后续观察什么" items={domain.watchPoints} />
      <Evidence title="这项月度解读的条件与依据" conditions={domain.conditions} evidence={domain.evidence} />
      </details>
    </PersonalReadingScope>
    {onFeedbackDomain ? <a className="monthly-domain-feedback-link" href="#reading-feedback" onClick={() => onFeedbackDomain(subjectId)}>反馈这项解读</a> : null}
  </article>;
}

function SegmentReading({ monthId, segment, onFeedbackDomain, reading, month, task, revision, collection, contextual, annualYear, personal }: { reading: LocalMonthlyDomainReading; collection?: LocalMonthlyDomainReadings | null; contextual?: LocalContextualReadingBundle | null; revision?: RevisionRecord | null; month?: LocalMonthlyPeriod | null; task?: NatalWealthResourceTask | null; annualYear?: LocalAnnualYear | null; personal?: LocalPersonalReading | null; monthId: string; segment: MonthlyDomainSegment; onFeedbackDomain?: (subjectId: string) => void }) {
  const projections = segment.domains.map(domain => {
    try { return plainMonthlyPresentation({ reading, segment, domain, month, task, revision, collection, contextual, annualYear, personal }); }
    catch { return null; }
  });
  const hasDayun = segment.backgroundRefs.some((ref) => ref.nodeType === "dayun");
  return <section className="monthly-domain-segment" data-segment-id={segment.id} aria-label={`${instantLabel(segment.startInstant)}起的月内分段`}>
    <div className="monthly-domain-segment-heading">
      <p className="monthly-domain-background">{segment.backgroundLabels.length ? segment.backgroundLabels.join(" · ") : "背景名称暂不可读"}{hasDayun ? "" : " · 尚无大运背景"}</p>
      <Period start={segment.startInstant} end={segment.endExclusiveInstant} />
      <p className="monthly-domain-caption">{projections.find(Boolean)?.caption ?? segment.judgmentCaption}</p>
      <p className="monthly-domain-period">{segment.ageLabel}{segment.personalStartInstant !== segment.startInstant ? ` · 个人主题从 ${instantLabel(segment.personalStartInstant)} 起阅读` : ""}</p>
    </div>
    {segment.domains.map((domain, index) => <DomainReading key={domain.id} domain={domain} plain={projections[index]}
      expectedSource={revision ? { caseId: revision.caseId, revisionId: reading.nodeRef.revisionId, chartResultHash: reading.nodeRef.chartResultHash, includeHour: revision.input.timePrecision !== "unknown_hour" && revision.input.timePrecision !== "date_only" } : undefined}
      subjectId={`monthly-domain-${monthId}-${segment.id}-${domain.id}`} onFeedbackDomain={onFeedbackDomain} />)}
    <Evidence title="这一时间段的适用条件" conditions={segment.conditions} />
  </section>;
}

export function MonthlyDomainPanel({ reading, onFeedbackDomain, month, task, revision, collection, contextual, annualYear, personal }: MonthlyDomainPanelProps) {
  if (!reading) return null;
  const hasSegments = reading.branches.some((branch) => branch.segments.length > 0);
  return <section className="monthly-domain-panel" aria-label={`${reading.label}月度分领域详读`}>
    <p className="monthly-domain-kicker">{reading.label}{reading.ganZhi ? ` · ${reading.ganZhi}` : ""}</p>
    <h3 className="monthly-domain-heading">{hasSegments ? "本月重点与具体情境" : reading.headline}</h3>
    {hasSegments ? <details><summary>本月原总述</summary><p>{reading.headline}</p><p className="monthly-domain-summary">{reading.summary}</p></details> : <p className="monthly-domain-summary">{reading.summary}</p>}
    {!hasSegments && reading.startInstant && reading.endExclusiveInstant ? <Period start={reading.startInstant} end={reading.endExclusiveInstant} /> : null}
    {reading.branches.map((branch) => <section className="monthly-domain-branch" key={branch.id} aria-label={branch.label}>
      {reading.branches.length > 1 ? <h4 className="monthly-domain-branch-heading">{branch.label}</h4> : null}
      {branch.segments.map((segment) => <SegmentReading key={segment.id} reading={reading} collection={collection} contextual={contextual} revision={revision} month={month} task={task} annualYear={annualYear} personal={personal} monthId={reading.monthId} segment={segment} onFeedbackDomain={onFeedbackDomain} />)}
      {branch.gaps.map((gap, index) => <div className="monthly-domain-gap" key={index}>
        {gap.startInstant && gap.endExclusiveInstant ? <Period start={gap.startInstant} end={gap.endExclusiveInstant} /> : null}<p>{gap.message}</p>
      </div>)}
      <Evidence title="这一分支的适用条件" conditions={branch.conditions} />
    </section>)}
  </section>;
}
