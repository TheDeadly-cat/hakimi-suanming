import type { LocalAnnualOutlook } from "../lib/local-annual-outlook";
import type { LocalLifeOutlook } from "../lib/local-detailed-outlook";
import type { LocalReadingTimeline } from "../lib/local-reading-timeline";
import { safeVisibleText } from "../lib/visible-text";
import { annualHandoverPresentation, outlookDirectionCaption, summarizeAnnualJudgmentCaptions } from "../lib/outlook-judgment-presentation";
import { PersonalReadingScope } from "./personal-reading-note";
import "./reading-period-summary.css";

const text = (value: string) => safeVisibleText(value, "", 12_000);
const date = (instant: string) => new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "long", day: "numeric" }).format(new Date(instant));
const instantLabel = (instant: string) => new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date(instant));
type TimelineStage = LocalReadingTimeline["stages"][number];
type TimelineChange = LocalReadingTimeline["turningPoints"][number];

function YearLink({ year, onSelectYear, children }: { year: number; onSelectYear?: (year: number) => void; children?: string }) {
  return onSelectYear ? <a href="#reading-yearly" onClick={() => onSelectYear(year)}>{children ?? `阅读 ${year} 年详解 →`}</a> : <span>{children ?? `${year} 年`}</span>;
}

function ChangeReading({ change, onSelectYear }: { change: TimelineChange; onSelectYear?: (year: number) => void }) {
  return <aside className="reading-timeline-change" aria-label={`${change.year}年${change.kind === "handover" ? "交运变化" : "判断变化"}`}>
    <p className="reading-timeline-date"><time dateTime={change.atInstant}>{instantLabel(change.atInstant)}</time>（北京时间）</p>
    <h5>{text(change.headline)}</h5><p>{text(change.summary)}</p>
    {change.kind === "handover" ? <div className="reading-timeline-handover">
      <p><span>此前</span>{text(change.before.caption)}</p><p><span>此后</span>{text(change.after.caption)}</p>
    </div> : null}
    <details className="reading-timeline-evidence"><summary>变化的依据与条件</summary>
      <p>{text(change.before.reason)}</p><p>{text(change.after.reason)}</p>
      <ul>{[...change.conditions, ...change.evidence].map((item, index) => <li key={index}>{text(item)}</li>)}</ul>
    </details>
    <YearLink year={change.year} onSelectYear={onSelectYear} />
  </aside>;
}

function StageReading({ stage, changes, isCurrent, isNext, onSelectYear }: {
  stage: TimelineStage; changes: TimelineChange[]; isCurrent: boolean; isNext: boolean; onSelectYear?: (year: number) => void;
}) {
  const years = [...new Set(stage.yearLinks.map((link) => link.year))];
  return <article className="reading-timeline-stage" data-stage-id={stage.id} data-current={isCurrent || undefined} aria-label={`${stage.startYear}至${stage.endYear}年阶段`}>
    <div className="reading-timeline-stage-heading"><p className="reading-timeline-date">
      <time dateTime={stage.startInstant}>{date(stage.startInstant)}</time> 至 <time dateTime={stage.endExclusiveInstant}>{date(stage.endExclusiveInstant)}</time>前
    </p>{isCurrent || isNext ? <span className="reading-timeline-position">{isCurrent ? "当前所在阶段" : "接下来一段"}</span> : null}</div>
    <PersonalReadingScope subjectId={`timeline-stage-${stage.id}`}><h4>{text(stage.headline)}</h4>
    <p>{text(stage.summary)}</p>
    {stage.yearLinks.length > 1 ? <details className="reading-timeline-year-reasons"><summary>这段每年有何不同</summary>
      {stage.yearLinks.map((link) => <div key={`${link.year}:${link.startInstant}`}><h5>{link.year} 年</h5><p>{text(link.reason)}</p><p className="reading-timeline-life">{text(link.lifeTheme)}</p>
        <YearLink year={link.year} onSelectYear={onSelectYear} /></div>)}
    </details> : null}
    {changes.map((change) => <ChangeReading key={change.id} change={change} onSelectYear={onSelectYear} />)}
    <details className="reading-timeline-evidence"><summary>这一段的条件与依据</summary>
      <ul>{[...stage.conditions, ...stage.evidence].map((item, index) => <li key={index}>{text(item)}</li>)}</ul>
    </details>
    </PersonalReadingScope>
    <div className="reading-timeline-year-links" aria-label="本阶段逐年入口">{years.map((year) => <YearLink key={year} year={year} onSelectYear={onSelectYear} />)}</div>
  </article>;
}

function TimelineReading({ timeline, onSelectYear }: { timeline: LocalReadingTimeline; onSelectYear?: (year: number) => void }) {
  const stagesById = new Map(timeline.stages.map((stage) => [stage.id, stage]));
  const changesById = new Map(timeline.turningPoints.map((change) => [change.id, change]));
  return <div className="reading-period-timeline">
    <h3>{timeline.startYear}—{timeline.endYear}，把变化连起来看</h3>
    <p className="reading-timeline-lead">{text(timeline.summary)}</p>
    {timeline.branches.map((branch) => {
      const stages = branch.stageIds.flatMap((id) => { const item = stagesById.get(id); return item ? [item] : []; });
      const changes = branch.turningPointIds.flatMap((id) => { const item = changesById.get(id); return item ? [item] : []; });
      const currentIndex = stages.findIndex((stage) => stage.id === branch.currentStageId);
      const first = stages.length <= 4 ? 0 : Math.max(0, currentIndex - 1);
      const last = stages.length <= 4 ? stages.length : Math.min(stages.length, first + 3);
      const changeInStage = (change: TimelineChange, stage: TimelineStage) => Date.parse(change.atInstant) >= Date.parse(stage.startInstant) && Date.parse(change.atInstant) < Date.parse(stage.endExclusiveInstant);
      const renderStage = (stage: TimelineStage) => <StageReading key={stage.id} stage={stage} changes={changes.filter((change) => changeInStage(change, stage))}
        isCurrent={stage.id === branch.currentStageId} isNext={stage.id === branch.nextStageId} onSelectYear={onSelectYear} />;
      const unplacedChanges = changes.filter((change) => !stages.some((stage) => changeInStage(change, stage)));
      return <section className="reading-timeline-branch" key={branch.id} aria-label={text(branch.label)}>
        {timeline.branches.length > 1 ? <h4 className="reading-timeline-branch-label">{text(branch.label)}</h4> : null}
        {first > 0 ? <details className="reading-timeline-more"><summary>查看此前 {first} 个阶段</summary>{stages.slice(0, first).map(renderStage)}</details> : null}
        {stages.slice(first, last).map(renderStage)}
        {last < stages.length ? <details className="reading-timeline-more"><summary>继续阅读后面 {stages.length - last} 个阶段</summary>{stages.slice(last).map(renderStage)}</details> : null}
        {unplacedChanges.map((change) => <ChangeReading key={change.id} change={change} onSelectYear={onSelectYear} />)}
        {!stages.length ? <p>这一分支在当前查询范围内尚无可连接的阶段，具体缺口保留在下方。</p> : null}
        {branch.conditions.length ? <details className="reading-timeline-evidence"><summary>这一分支的适用条件</summary><ul>{branch.conditions.map((item, index) => <li key={index}>{text(item)}</li>)}</ul></details> : null}
      </section>;
    })}
    {timeline.gaps.length ? <details className="reading-timeline-gaps"><summary>有 {timeline.gaps.length} 处区间信息尚不完整</summary><ul>{timeline.gaps.map((gap, index) => <li key={`${gap.year}:${gap.branchId}:${index}`}>
      <strong>{gap.year} 年 · {text(timeline.branches.find((branch) => branch.id === gap.branchId)?.label ?? gap.branchId)}</strong><p>{text(gap.message)}</p>
      {gap.conditions.map((condition, i) => <p key={i}>{text(condition)}</p>)}</li>)}</ul></details> : null}
    <details className="reading-timeline-evidence"><summary>这份阶段说明的范围</summary><ul>{timeline.limitations.map((item, index) => <li key={index}>{text(item)}</li>)}</ul></details>
    <a className="reading-timeline-detail-link" href="#reading-yearly">阅读完整逐年与流月详解 →</a>
  </div>;
}

/** An answer-first view of existing judgments. It does not rank or rescore years. */
export function ReadingPeriodSummary({ life, annual, timeline, onSelectYear }: {
  life: LocalLifeOutlook | null; annual: LocalAnnualOutlook | null; timeline?: LocalReadingTimeline | null; onSelectYear?: (year: number) => void;
}) {
  if (!life && !annual && !timeline) return null;
  return <section className="reading-period-summary" aria-label="阶段与年份先读">
    <h2>{timeline ? "关键阶段与变化年份" : "先看阶段与年份"}</h2>
    {life ? <div className="reading-period-current">
      <h3>现在处在哪一步</h3>
      <PersonalReadingScope subjectId="life-overview">
      {life.branches.map((branch) => {
        const current = life.decades.find((item) => item.id === branch.currentDecadeId);
        const next = current ? life.decades.find((item) => item.branchId === branch.id && item.index === current.index + 1) : undefined;
        return <article key={branch.id}>
          {life.branches.length > 1 ? <p className="reading-period-branch">{text(branch.label)}</p> : null}
          {current ? <>
            <PersonalReadingScope subjectId={`decade-${current.id}`}>
            <strong>{text(current.headline)}</strong>
            {next ? <p className="reading-period-next">{date(next.startInstant)}转入{next.ganZhi}大运。</p> : null}
            <details><summary>这一阶段为何这样判断</summary><p>{text(branch.summary)}</p></details>
            </PersonalReadingScope>
          </> : <p>{text(branch.summary)}</p>}
        </article>;
      })}
      </PersonalReadingScope>
      <a href="#reading-life">阅读人生大运详解 →</a>
    </div> : null}
    {timeline ? <TimelineReading timeline={timeline} onSelectYear={onSelectYear} /> : annual ? <div className="reading-period-years">
      <h3>{annual.startYear}—{annual.endYear}，哪些年份值得留意</h3>
      <PersonalReadingScope subjectId="annual-overview"><p className="reading-year-summary">{text(annual.years.some(year => annualHandoverPresentation(year))
        ? annual.years.map(year => `${year.year}年：${annualHandoverPresentation(year)?.caption ?? outlookDirectionCaption(year.judgment, year.label)}。`).join("\n")
        : summarizeAnnualJudgmentCaptions(annual))}</p></PersonalReadingScope>
      <details><summary>展开这十年的具体结论</summary><ol>{annual.years.map((year) => <li key={year.year}>
        <a href="#reading-yearly" aria-label={`${year.year}年 · ${text(annualHandoverPresentation(year)?.caption ?? outlookDirectionCaption(year.judgment, year.label))}`} onClick={() => onSelectYear?.(year.year)}><strong>{year.year}</strong><span>{text(annualHandoverPresentation(year)?.caption ?? outlookDirectionCaption(year.judgment, year.label))}</span></a>
      </li>)}</ol><p>{text(annual.summary)}</p></details>
      <a href="#reading-yearly">阅读逐年与流月详解 →</a>
    </div> : null}
  </section>;
}
