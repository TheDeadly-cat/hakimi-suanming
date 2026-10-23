import { useId } from "react";
import type { LocalMonthReadingRhythm } from "../lib/local-month-reading-rhythm";
import type { LocalPersonalReading } from "../lib/local-personal-reading";
import { personalAdoptionLabel } from "../lib/local-personal-reading-legacy";
import { plainMonthlyRangeCaption, plainMonthlyPeriodHeadline } from "../lib/plain-monthly-presentation";
import "./month-reading-rhythm-panel.css";

const formatter = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
const instant = (value: string) => formatter.format(new Date(value));
const shortFormatter = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" });
const shortDate = (value: string) => shortFormatter.format(new Date(value));

export function MonthReadingRhythmPanel({ reading, personal, onSelectMonth }: {
  reading: LocalMonthReadingRhythm; personal?: LocalPersonalReading | null; onSelectMonth?: (monthId: string) => void;
}) {
  const id = useId();
  const bound = personal && (["caseId", "revisionId", "chartResultHash", "includeHour"] as const)
    .every(key => personal.sourceBinding[key] === reading.sourceBinding[key]);
  // These entries have already passed the current personal-reading builder.
  // An adoption of any contributing source takes precedence over this digest.
  const adopted = bound ? personal.entries.filter(entry => entry.state === "adopted" && entry.personalText && !entry.issues.length) : [];
  const entriesFor = (subjects: readonly string[]) => adopted.filter(entry => subjects.includes(entry.subjectId));
  return <section className="month-reading-rhythm" aria-labelledby={`${id}-title`}>
    <header><p className="month-reading-rhythm-kicker">{reading.year} · 先看时间与重点</p><h3 id={`${id}-title`}>{reading.headline}</h3></header>
    {reading.branches.map(branch => <section key={branch.id} aria-label={`${branch.label}的月份节奏`}>
      {reading.branches.length > 1 ? <h4>{branch.label}</h4> : null}
      {entriesFor(branch.overviewSourceSubjects).length ? <p className="month-reading-rhythm-overview">本年部分内容已有你采用的个人修订，下方按对应月份保留。</p> : !branch.periods.length ? <p>{branch.overview}</p> : null}
      <ol className="month-reading-rhythm-ranges" aria-label="按时间排列的方向变化">{branch.directionRanges.map(range => {
        const revised = entriesFor(range.sourceSubjects).length > 0;
        return <li key={range.id} data-direction={revised ? "personal" : range.label}>
          <p className="month-reading-rhythm-time"><time dateTime={range.startInstant}>{shortDate(range.startInstant)}</time> 起至 <time dateTime={range.endExclusiveInstant}>{shortDate(range.endExclusiveInstant)}</time>前 · 节令范围</p>
          <p><strong>{revised ? "此时段已有个人修订" : plainMonthlyRangeCaption(branch, range)}</strong></p>
          <details><summary>原方向说明</summary><p>{range.caption}</p></details>
          {revised ? <p>请按下方对应月份的个人文字阅读；原自动判断保留在完整解释中。</p> : null}
        </li>;
      })}</ol>
      <ol className="month-reading-rhythm-months" aria-label="逐月重点与跳转">{branch.periods.map(period => {
        const revisions = entriesFor(period.sourceSubjects);
        const automatic = <><p className="month-reading-rhythm-headline">{plainMonthlyPeriodHeadline(period)}</p><details><summary>这一月的完整主题与说明</summary><p>{period.headline}</p><p>{period.summary}</p></details></>;
        return <li key={period.id} data-rhythm-period={period.id}>
          <div className="month-reading-rhythm-month"><strong>{period.monthLabel}</strong><span>{period.ganZhi}</span>
            {onSelectMonth ? <a href="#reading-monthly-detail" onClick={() => onSelectMonth(period.monthId)}>查看{period.monthLabel}</a> : null}
          </div>
          <div className="month-reading-rhythm-content">
            {period.handoverBefore ? <p className="month-reading-rhythm-handover">此处进入另一段大运背景，前后分别阅读。</p> : null}
            {revisions.length ? <>{revisions.map(entry => <div key={entry.subjectId} className="month-reading-rhythm-personal"><p>{personalAdoptionLabel(entry)} · {entry.subjectLabel}</p><blockquote>{entry.personalText}</blockquote></div>)}<details><summary>对照原自动月份重点</summary>{automatic}</details></> : automatic}
            <details><summary>本段时间与判断范围</summary><p><time dateTime={period.personalStartInstant}>{instant(period.personalStartInstant)}</time> 起至 <time dateTime={period.endExclusiveInstant}>{instant(period.endExclusiveInstant)}</time>前 · 北京时间 · {period.ageLabel}</p><ul>{period.conditions.map((condition, index) => <li key={index}>{condition}</li>)}</ul></details>
          </div>
        </li>;
      })}</ol>
      {branch.gaps.map((gap, index) => <p className="month-reading-rhythm-gap" key={index}>{gap.startInstant && gap.endExclusiveInstant ? `${instant(gap.startInstant)} 起至 ${instant(gap.endExclusiveInstant)}前：` : ""}{gap.message}</p>)}
    </section>)}
    {!reading.branches.length ? <p>当前没有可用于个人解读的月份时段。</p> : null}
    <details className="month-reading-rhythm-scope"><summary>月份节奏的阅读范围</summary><ul>{reading.conditions.map((condition, index) => <li key={index}>{condition}</li>)}</ul><p>阅读版本：{reading.version}</p></details>
  </section>;
}
