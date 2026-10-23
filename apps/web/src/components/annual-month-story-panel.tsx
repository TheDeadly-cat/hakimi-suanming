import type { LocalContextualReadingBundle } from "../lib/local-contextual-reading-record";
import type { RevisionRecord } from "@hakimi/contracts";
import type { NatalWealthResourceTask } from "../../../../packages/bazi-interpretation/src/natal-wealth-resource-task";
import type { LocalMonthlyOutlook } from "../lib/local-detailed-outlook";
import type { LocalMonthlyDomainReadings } from "../lib/local-monthly-domain-reading";
import { plainMonthlyPresentation } from "../lib/plain-monthly-presentation";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import type { LocalAnnualMonthStory } from "../lib/local-annual-month-story";
import type { LocalPersonalReading } from "../lib/local-personal-reading";
import type { LegacyAnnualReadingInput } from "../lib/legacy-annual-reading-profile";
import { annualMonthStoryPersonalSources, annualMonthStorySubjectId } from "../lib/local-annual-month-story-record";
import { PersonalReadingScope } from "./personal-reading-note";
import { hasLegacyPersonalAdoption, personalAdoptionLabel } from "../lib/local-personal-reading-legacy";
import "./annual-month-story-panel.css";

const TOPICS = [{ id: "career", label: "事业与任务" }, { id: "wealth", label: "资源与落实" }, { id: "relationship", label: "关系与相处" }] as const;
const date = (value: string) => new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "long", day: "numeric" }).format(new Date(value));
const instant = (value: string) => new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date(value));

export function AnnualMonthStoryPanel({ story, personal, personalLegacySource, onSelectMonth, onFeedback, monthly, monthlyDomains, task, revision, contextual }: {
  revision?: RevisionRecord | null; contextual?: LocalContextualReadingBundle | null;
  monthly?: LocalMonthlyOutlook | null; monthlyDomains?: LocalMonthlyDomainReadings | null; task?: NatalWealthResourceTask | null;
  story: LocalAnnualMonthStory; personal?: LocalPersonalReading | null;
  personalLegacySource?: LegacyAnnualReadingInput;
  onSelectMonth?: (monthId: string) => void; onFeedback?: (subjectId: string) => void;
}) {
  const id = useId(), buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const [topic, setTopic] = useState<(typeof TOPICS)[number]["id"]>("career");
  const branchIds = [...new Map(story.months.flatMap((month) => month.branches.map((branch) => [branch.id, branch.label] as const))).entries()];
  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "ArrowRight" ? (index + 1) % TOPICS.length : event.key === "ArrowLeft" ? (index + TOPICS.length - 1) % TOPICS.length : event.key === "Home" ? 0 : event.key === "End" ? TOPICS.length - 1 : null;
    if (next === null) return;
    event.preventDefault(); setTopic(TOPICS[next]!.id); buttons.current[next]?.focus();
  }
  return <section className="annual-month-story" aria-labelledby={`${id}-heading`}>
    <header><p className="annual-month-story-kicker">{story.year} · 从全年看到每月</p><h3 id={`${id}-heading`}>这一年的主题，怎样落到各个月份</h3><p>{story.summary}</p></header>
    {!story.months.length ? <p role="status">当前没有完整可连接的节令月份，保留原年度说明。</p> : <>
    <div className="annual-month-story-tabs" role="tablist" aria-label="年月衔接主题">{TOPICS.map((item, index) => <button key={item.id} type="button" role="tab" id={`${id}-tab-${item.id}`} ref={(element) => { buttons.current[index] = element; }}
      aria-selected={topic === item.id} tabIndex={topic === item.id ? 0 : -1} aria-controls={`${id}-content`} onClick={() => setTopic(item.id)} onKeyDown={(event) => move(event, index)}>{item.label}</button>)}</div>
    <div role="tabpanel" id={`${id}-content`} aria-labelledby={`${id}-tab-${topic}`} tabIndex={0}>
      {(branchIds.length ? branchIds : [["locked", "本年节令月份"]] as const).map(([branchId, label]) => <section key={branchId} aria-label={`${label}的年月衔接`}>
        <h4 className={branchIds.length > 1 ? undefined : "sr-only"}>{label}</h4>
        <ol className="annual-month-story-months">{story.months.map((month) => {
          const branch = month.branches.find((item) => item.id === branchId);
          return <li key={month.monthId} data-story-month={month.monthId}>
            <div className="annual-month-story-month-label"><strong>{month.label}</strong><span>{date(month.startInstant)}—{date(month.endExclusiveInstant)}</span>
              {onSelectMonth ? <a href="#reading-monthly-detail" onClick={() => onSelectMonth(month.monthId)}>读这月</a> : null}
            </div>
            <div className="annual-month-story-month-content">
              {month.status === "before_birth" ? <p>出生前仅保留历法范围。</p> : null}
              {branch?.periods.map((period, index) => {
                const domain = period.domains.find((item) => item.id === topic);
                if (!domain) return null;
                const subject = annualMonthStorySubjectId(story, month, period, domain);
                const sources = annualMonthStoryPersonalSources(story, domain, personal, personalLegacySource);
                const link = domain.links.monthlyDomain;
                const originalMonth = monthly?.months.find(item => item.id === month.monthId);
                const originalReading = monthlyDomains?.months.find(item => item.monthId === month.monthId);
                const originalSegment = originalReading?.branches.find(item => item.id === link.branchId)?.segments.find(item => item.id === link.segmentId);
                const originalDomain = originalSegment?.domains.find(item => item.id === link.domainId);
                let plain: ReturnType<typeof plainMonthlyPresentation> = null;
                if (originalReading && originalSegment && originalDomain && originalMonth
                  && monthlyDomains?.year === story.year && monthlyDomains.sourceBinding.revisionId === story.sourceBinding.revisionId && monthlyDomains.sourceBinding.chartResultHash === story.sourceBinding.chartResultHash && monthlyDomains.sourceBinding.includeHour === story.sourceBinding.includeHour && originalSegment.startInstant === period.startInstant && originalSegment.endExclusiveInstant === period.endExclusiveInstant) {
                  try { plain = plainMonthlyPresentation({ reading: originalReading, segment: originalSegment, domain: originalDomain, month: originalMonth, collection: monthlyDomains, task, revision, contextual }); }
                  catch { /* A stale display source cannot replace the bound original story. */ }
                }
                const automatic = <>
                  <h5>{plain?.headline ?? domain.title}</h5><p className="annual-month-story-answer">{plain?.summary ?? domain.summary}</p>
                  <ul>{(plain ? plain.displayExamples : domain.examples).map((example, ei) => <li key={ei}>{example}</li>)}</ul>
                  <details><summary>这一段的衔接依据与范围</summary>
                    {plain ? <><p>{domain.title}</p><p>{domain.summary}</p></> : null}
                    {plain ? <ul>{domain.examples.map((example, ei) => <li key={ei}>{example}</li>)}</ul> : null}
                    <p className="annual-month-story-caption">本段整体背景：{period.judgmentCaption}。各领域的具体侧重见上文。</p>
                    <p><time dateTime={period.personalStartInstant}>{instant(period.personalStartInstant)}</time> 起至 <time dateTime={period.endExclusiveInstant}>{instant(period.endExclusiveInstant)}</time>前 · 北京时间 · {period.ageLabel}</p>
                    {period.annualJudgmentCaption ? <p>年度原段判断：{period.annualJudgmentCaption}</p> : null}
                    <p>{period.backgroundLabels.join(" · ")}</p>
                    <ul>{[...domain.evidence, ...domain.conditions, ...period.conditions, ...(branch.conditions ?? [])].map((text, ti) => <li key={ti}>{text}</li>)}</ul>
                  </details>
                </>;
                return <article key={`${period.id}-${domain.id}`} data-story-period={period.id} aria-label={`${month.label} · ${domain.title}`}>
                  {branch.periods.length > 1 ? <p className="annual-month-story-part">第 {index + 1} 段 · {instant(period.startInstant)} 起至 {instant(period.endExclusiveInstant)}前</p> : null}
                  <PersonalReadingScope subjectId={subject} expectedSource={story.sourceBinding}>
                    {sources.length ? <><p className="annual-month-story-personal">这一段的年度或月度来源已有个人修订</p>
                      {sources.map((entry) => <div key={entry.subjectId}><p>{entry.subjectLabel}</p>{hasLegacyPersonalAdoption(entry) ? <small>{personalAdoptionLabel(entry)}</small> : null}<blockquote>{entry.personalText}</blockquote></div>)}
                      <details><summary>对照原自动衔接</summary>{automatic}</details>
                    </> : automatic}
                  </PersonalReadingScope>
                  {onFeedback ? <a className="annual-month-story-feedback" href="#reading-feedback" onClick={() => onFeedback(subject)}>反馈这段年月说明</a> : null}
                </article>;
              })}
              {branch?.gaps.map((gap, index) => <p key={index} className="annual-month-story-gap">{gap.message}</p>)}
              {month.status !== "before_birth" && !branch ? <p>本月这一分支尚无可连接的个人分段。</p> : null}
            </div>
          </li>;
        })}</ol>
      </section>)}
    </div></>}
    <details className="annual-month-story-scope"><summary>年月衔接的阅读范围</summary><ul>{story.limitations.map((text, index) => <li key={index}>{text}</li>)}</ul></details>
  </section>;
}
