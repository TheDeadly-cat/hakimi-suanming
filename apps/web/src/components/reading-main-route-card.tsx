import { useId, useState } from "react";
import type { MainRouteReading, MainRouteRange, MainRouteStage } from "../lib/main-route-reading";
import { AppLink } from "../lib/router";
import "./reading-main-route-card.css";

interface Props {
  model: MainRouteReading; caseName: string; range: MainRouteRange; years: number[];
  editHref?: string;
  onRangeChange: (range: MainRouteRange) => void;
  onYearChange: (year: number) => void;
  onBranchChange: (branchId: string) => void;
  onOpenYear: (year: number, interval?: { startInstant: string; endExclusiveInstant: string }) => void;
  onOpenPeriods: (label: string, periods: { year: number; startInstant: string; endExclusiveInstant: string }[]) => void;
}
const date = (instant: string) => new Date(Date.parse(instant) + 8 * 3_600_000).toISOString().slice(0, 10);
const time = (instant: string) => new Date(Date.parse(instant) + 8 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");

export function ReadingMainRouteCard({ model, caseName, range, years, editHref, onRangeChange, onYearChange, onBranchChange, onOpenYear, onOpenPeriods }: Props) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const gaps = model.gaps.filter(gap => gap.kind !== "missing_background");
  const pieces = [
    ...model.stages.map(stage => ({ key: stage.id, year: stage.startYear, at: stage.startInstant, stage })),
    ...gaps.map((gap, n) => ({ key: `gap:${gap.year}:${n}`, year: gap.year, at: gap.startInstant ?? `${gap.year}-01-01`, gap }))
  ].sort((a, b) => a.year - b.year || a.at.localeCompare(b.at));
  const shown = expanded ? pieces : pieces.slice(0, 3);
  const showStage = (stage: MainRouteStage) => onOpenPeriods(`${date(stage.startInstant)}至${date(stage.endExclusiveInstant)}前 · ${stage.caption}`, stage.yearLinks);
  return <section className="reading-main-route" aria-labelledby={`${id}-heading`} data-main-route-version={model.version}>
    <p className="reading-main-route-identity"><strong>{caseName || "当前档案"}</strong><span>{model.range.label}</span></p>
    <p className="reading-main-route-kicker">本次主判断</p>
    <h2 id={`${id}-heading`}>{model.headline}</h2>
    <div className="reading-main-route-summary">{model.summary.map((line, n) => <p key={n}>{line}</p>)}</div>
    {model.assumption ? <p className="reading-main-route-assumption">{model.assumption}</p> : null}
    {model.status === "choose_branch" ? <fieldset className="reading-main-route-branches"><legend>先选一条假设路径来查看</legend>
      {model.branches.map(branch => <button key={branch.id} type="button" onClick={() => onBranchChange(branch.id)}>{branch.label}</button>)}
      <p>这些结果彼此平行，选择只用于阅读，不表示哪条更可能。</p>
      {editHref ? <AppLink href={editHref}>补充实际资料</AppLink> : null}
    </fieldset> : null}
    {pieces.length ? <>
      <ol className="reading-main-route-stages" aria-label="按实际时间排列的阶段与缺口">
        {shown.map(piece => <li key={piece.key} data-state={"stage" in piece ? piece.stage.state : "gap"}>
          {"stage" in piece ? <button type="button" onClick={() => showStage(piece.stage)}>
            <span>{date(piece.stage.startInstant)}—{date(piece.stage.endExclusiveInstant)}前</span>
            <strong>{piece.stage.caption}</strong><small>查看这一阶段</small>
          </button> : <div><span>{piece.gap.year}年</span><strong>结果缺口</strong><small>{piece.gap.message}</small></div>}
        </li>)}
      </ol>
      {pieces.length > 3 ? <button className="reading-main-route-expand" type="button" aria-expanded={expanded}
        onClick={() => setExpanded(value => !value)}>{expanded ? "收起其余阶段" : `展开其余 ${pieces.length - 3} 个阶段与缺口`}</button> : null}
    </> : null}
    {model.nextTurningPoint ? <p className="reading-main-route-turn"><strong>下一转折 · {time(model.nextTurningPoint.atInstant)}（北京时间）</strong>
      <button type="button" onClick={() => onOpenPeriods("转折前后", [model.nextTurningPoint!.before, model.nextTurningPoint!.after])}>查看转折前后</button></p>
      : model.status === "ready" ? <p className="reading-main-route-note">所选范围内未记录进一步的判断转折。</p> : null}
    {model.keyCondition ? <p className="reading-main-route-condition"><strong>关键条件：</strong>{model.keyConditionPlain ?? model.keyCondition}</p> : null}
    {model.primaryYear !== null ? <button className="reading-main-route-primary" type="button" onClick={() => onOpenYear(model.primaryYear!)}>
      看 {model.primaryYear} 年重点<span aria-hidden="true"> →</span></button> : null}
    {model.range.coverageNote ? <p className="reading-main-route-note">{model.range.coverageNote}</p> : null}
    <div className="reading-main-route-controls">
      <label>查看范围<select value={range} onChange={event => onRangeChange(event.target.value as MainRouteRange)}>
        <option value="three_years">近三年</option><option value="year">所选一年</option><option value="ten_years">十年范围</option>
      </select></label>
      <label>起始年份<select value={model.range.requestedStartYear ?? ""} onChange={event => onYearChange(Number(event.target.value))} disabled={!years.length}>
        {!years.length ? <option value="">暂无年度结果</option> : null}
        {years.map(year => <option value={year} key={year}>{year}年</option>)}
      </select></label>
      {model.branches.length > 1 && model.selectedBranchId ? <label>查看路径<select value={model.selectedBranchId} onChange={event => onBranchChange(event.target.value)}>
        {model.branches.map(branch => <option value={branch.id} key={branch.id}>{branch.label}</option>)}
      </select></label> : null}
    </div>
    <details className="reading-main-route-evidence"><summary>为什么这样判断 · 条件与依据</summary>
      {model.keyCondition ? <section><h4>关键条件原句</h4><p>{model.keyCondition}</p></section> : null}
      {model.domainNotes.length ? <details><summary>同一范围的事业、收入与感情</summary>{model.domainNotes.map(note => <section key={note.conclusionId}>
        <h4>{note.target.year}年 · {note.domainLabel} · {note.directionLabel}</h4><p>{time(note.target.startInstant)}起至{time(note.target.endExclusiveInstant)}前</p><p>{note.text}</p>
      </section>)}</details> : null}
      {model.stages.map(stage => <section key={stage.id}><h4>{time(stage.startInstant)}起至{time(stage.endExclusiveInstant)}前 · {stage.caption}</h4>
        <p>{stage.headline}</p><p>{stage.summary}</p><ul>{stage.conditions.map((line, n) => <li key={n}>{line}</li>)}</ul>
        <details><summary>原判断与来源</summary><ul>{stage.evidence.map((line, n) => <li key={n}>{line}</li>)}</ul>
          <p>来源编号：{stage.sourceIds.join("、")}</p><p>版本：{stage.sourceVersions.join("、")}</p></details>
      </section>)}
      <ul>{model.conditions.map((line, n) => <li key={n}>{line}</li>)}</ul>
      <ul>{model.limitations.map((line, n) => <li key={n}>{line}</li>)}</ul>
      <details><summary>展示版本</summary><p>{model.version}</p><p>{model.sourceVersions.join("、")}</p></details>
    </details>
  </section>;
}
