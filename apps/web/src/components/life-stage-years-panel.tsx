import type { ReactNode } from "react";
import type { LocalLifeStageYears, LifeStageYear } from "../lib/local-life-stage-years";
import type { LifeStageAnnualRange } from "../lib/local-annual-range";
import type { LocalPersonalReadingEntry } from "../lib/local-personal-reading";
import { lifeStageYearSubjectId } from "../lib/local-life-stage-years-record";
import { PersonalReadingScope } from "./personal-reading-note";
import { hasLegacyPersonalAdoption, personalAdoptionLabel } from "../lib/local-personal-reading-legacy";
import { safeVisibleText } from "../lib/visible-text";
import "./life-stage-years-panel.css";

const clean = (text: string) => safeVisibleText(text, "", 12_000);
const date = (value: string) => new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
const instant = (value: string) => new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date(value));

function PersonalSources({ entries, children }: { entries: LocalPersonalReadingEntry[]; children: ReactNode }) {
  if (!entries.length) return <>{children}</>;
  return <div className="life-stage-personal-sources">
    <p>这段年份说明的来源已有你采用的个人修订</p>
    {entries.map((entry) => <div key={entry.subjectId}><p>{clean(entry.subjectLabel)}</p>{hasLegacyPersonalAdoption(entry) ? <small>{personalAdoptionLabel(entry)}</small> : null}<blockquote>{clean(entry.personalText ?? "")}</blockquote></div>)}
    <details><summary>对照原自动年份说明</summary>{children}</details>
  </div>;
}

export function LifeStageYearsPanel({ bridge, range, loading, error, onLoadAll, onYearChange, onFeedback, personalSources = {} }: {
  bridge: LocalLifeStageYears | null;
  range?: LifeStageAnnualRange | null;
  loading?: boolean; error?: string | null;
  onLoadAll?: () => void; onYearChange: (year: number) => void;
  onFeedback?: (subjectId: string) => void;
  /** Already checked against exact original source text and adoption records. */
  personalSources?: Record<string, LocalPersonalReadingEntry[]>;
}) {
  const years = bridge?.years ?? [];
  const selected = new Set(bridge?.highlights.map((item) => item.yearId));
  const first = years.filter((year) => selected.has(year.id));
  const rest = years.filter((year) => !selected.has(year.id));
  const unavailable = range?.status === "unavailable";
  const needsRange = !range || (bridge?.coverage.gaps.some((gap) => gap.reason === "outside_annual_window") && range.status === "complete");
  function renderYear(year: LifeStageYear) {
    if (!bridge) return null;
    const subject = lifeStageYearSubjectId(bridge, year);
    return <article className="life-stage-year" data-stage-year={year.year} key={year.id}>
      <div className="life-stage-year-mark"><strong>{year.year}</strong><span>{year.yearGanZhi}</span></div>
      <div className="life-stage-year-body">
        <PersonalReadingScope subjectId={subject} expectedSource={bridge.sourceBinding}>
          <PersonalSources entries={(personalSources[year.id] ?? []).filter((entry) => entry.subjectId !== subject)}>
            <h4>{clean(year.headline)}</h4>
            <p className="life-stage-year-period">{date(year.startInstant)} 起至 {date(year.endExclusiveInstant)} 前 · 属于{bridge.stage.ganZhi}大运的时段</p>
            {year.paragraphs.map((text, index) => <p key={index}>{clean(text)}</p>)}
            {year.segments.map((segment) => <section className="life-stage-year-segment" key={segment.id}>
              {year.segments.length > 1 ? <h5>{date(segment.startInstant)} 起 · {clean(segment.headline)}</h5> : null}
              {segment.paragraphs.map((text, index) => <p key={index}>{clean(text)}</p>)}
              <details className="life-stage-year-basis"><summary>这一段的其他事项与判断依据</summary>
                <p>{clean(segment.caption)} · {clean(segment.ageLabel)}</p>
                <p><time dateTime={segment.startInstant}>{instant(segment.startInstant)}</time> 起至 <time dateTime={segment.endExclusiveInstant}>{instant(segment.endExclusiveInstant)}</time> 前</p>
                {segment.items.map((item) => <section key={item.id}><h5>{clean(item.title)}</h5><p>{clean(item.summary)}</p></section>)}
                {segment.advantages.length ? <><h5>可发挥之处</h5><ul>{segment.advantages.map((text, index) => <li key={index}>{clean(text)}</li>)}</ul></> : null}
                {segment.pressures.length ? <><h5>可能的牵制</h5><ul>{segment.pressures.map((text, index) => <li key={index}>{clean(text)}</li>)}</ul></> : null}
                <h5>适用条件</h5><ul>{segment.conditions.map((text, index) => <li key={index}>{clean(text)}</li>)}</ul>
              </details>
            </section>)}
          </PersonalSources>
        </PersonalReadingScope>
        <div className="life-stage-year-actions">
          <a href="#reading-yearly" onClick={() => onYearChange(year.year)}>读 {year.year} 年的完整解读与月份 →</a>
          {onFeedback ? <a href="#reading-feedback" onClick={() => onFeedback(subject)}>反馈这段年份说明</a> : null}
        </div>
      </div>
    </article>;
  }
  return <section className="life-stage-years" aria-label="这步大运里的具体年份" aria-busy={loading}>
    <header><p className="life-stage-kicker">把阶段主线落到年份</p><h3>{bridge ? clean(bridge.headline) : "这步大运里，每年怎样变化"}</h3></header>
    {loading ? <p role="status">正在整理这步大运覆盖的具体年份…</p> : error ? <p role="alert">{clean(error)}</p> : <>
      {bridge ? <p className="life-stage-years-intro">{clean(bridge.summary)}</p> : null}
      {unavailable ? <p>这步大运的年度超出当前支持范围，阶段说明仍可阅读。</p> : onLoadAll && needsRange ?
        <button type="button" className="reading-button reading-button--secondary" onClick={onLoadAll}>读取这步大运的全部年份</button> : null}
      {first.length ? <><p className="life-stage-years-order">先沿时间看 {first.length} 个不同侧面</p>{first.map(renderYear)}</> : null}
      {rest.length ? <details className="life-stage-years-rest"><summary>展开其余 {rest.length} 个年份</summary>{rest.map(renderYear)}</details> : null}
      {range?.gaps.length || bridge?.coverage.gaps.length ? <details className="life-stage-years-coverage"><summary>查看尚未覆盖的时段</summary>
        {(range?.gaps.length ? range.gaps : bridge?.coverage.gaps ?? []).map((gap, index) => <p key={index}>{instant(gap.startInstant)} 起至 {instant(gap.endExclusiveInstant)} 前：{clean(gap.message)}</p>)}
      </details> : null}
    </>}
  </section>;
}
