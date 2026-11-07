import { useEffect, useRef, useState } from "react";
import type { CandidateSetRecord } from "@hakimi/contracts";
import { candidateRouteKey, prepareCandidateMainRoutes, type CandidateMainRoute, type CandidateMainRouteProgress } from "../lib/candidate-main-route";
import "./candidate-main-route-panel.css";

const time = (value: string) => new Date(Date.parse(value) + 8 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");
const branch = { locked: "按现有顺逆规则", forward: "顺行假设", backward: "逆行假设" };
const choice = { unique: "唯一时区瞬时点", earlier: "DST较早瞬时点", later: "DST较晚瞬时点" };
export function CandidateMainRoutePanel({ record }: { record: CandidateSetRecord }) {
  return <CandidateMainRouteContent key={`${record.id}:${record.snapshotDigest}:${record.candidateSet.resultHash}`} record={record} />;
}
function CandidateMainRouteContent({ record }: { record: CandidateSetRecord }) {
  const [startYear, setStartYear] = useState(() => Math.max(1900, Math.min(new Date().getFullYear(), 2098)));
  const [years, setYears] = useState(3);
  const [status, setStatus] = useState<"idle" | "working" | "done" | "failed">("idle");
  const [progress, setProgress] = useState<CandidateMainRouteProgress | null>(null);
  const [result, setResult] = useState<CandidateMainRoute | null>(null);
  const [message, setMessage] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("");
  const [showAll, setShowAll] = useState(false);
  const active = useRef(true), sequence = useRef(0), inFlight = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; sequence.current += 1; }; }, []);
  const invalidate = () => { sequence.current += 1; inFlight.current = false; setStatus("idle"); setProgress(null); setResult(null); setSelectedRoute(""); setShowAll(false); setMessage(""); };
  const run = async () => {
    if (inFlight.current) return;
    const request = ++sequence.current;
    const current = () => active.current && sequence.current === request;
    inFlight.current = true; setStatus("working"); setProgress(null); setResult(null); setMessage(""); setSelectedRoute(""); setShowAll(false);
    try {
      const value = await prepareCandidateMainRoutes(record, { startYear, endYear: Math.min(2100, startYear + years - 1),
        isCancelled: () => !current(), onProgress: next => { if (current()) setProgress(next); } });
      if (current()) {
        if (value.source.recordId !== record.id || value.source.snapshotDigest !== record.snapshotDigest
          || value.source.candidateSetResultHash !== record.candidateSet.resultHash || value.range.startYear !== startYear
          || value.range.endYear !== Math.min(2100, startYear + years - 1)) throw new Error("候选走势来源或范围已改变。");
        setResult(value); setStatus("done");
      }
    } catch {
      if (current()) { setStatus("failed"); setMessage("全部候选尚未核对完成。可以重试本地计算；原资料和出生时刻未改动。"); }
    } finally { if (current()) inFlight.current = false; }
  };
  const picked = result?.outcomes.find(outcome => candidateRouteKey(outcome.source) === selectedRoute && outcome.status === "ready");
  const intervals = result ? showAll ? result.intervals : result.intervals.slice(0, 3) : [];
  return <section className="candidate-main-route" aria-label="未知时刻的候选共同走势" data-candidate-record={record.id}>
    <p className="candidate-main-route-kicker">{record.alias} · 出生时刻仍未确定</p>
    <h2>{result?.headline ?? "先逐一核对，再看候选的共同判断"}</h2>
    {!result ? <p>尚未逐候选核对，不能先给共同主线。会检查全部13个代表性探针、每个时间变体和所有顺逆分支，不选一份代替其余结果。</p> : <>
      <p>{result.range.startYear}—{result.range.endYear}年 · 已核对 {result.checkedProbeCount}/{result.expectedProbeCount} 个探针、
        {result.checkedVariantCount}/{result.expectedVariantCount} 个时间变体、{result.checkedRouteCount}/{result.expectedRouteCount} 条路线</p>
      <p>{result.summary}</p>
      {result.firstDivergence ? <p><strong>首个分歧区间始于 {time(result.firstDivergence.atInstant)}（北京时间）。</strong>
        {result.firstDivergence.factors.length ? `需核实的资料：${result.firstDivergence.factors.map(factor => ({ birth_time: "出生时刻", dst_choice: "重复墙上时刻的先后选择", direction: "顺逆方向所依赖的资料" })[factor]).join("、")}。` : ""}</p> : null}
      {intervals.length ? <ol className="candidate-main-route-intervals" aria-label="全部候选逐区间核对结果">
        {intervals.map(interval => <li key={interval.id} data-status={interval.status}>
          <span>{time(interval.startInstant)}起至{time(interval.endExclusiveInstant)}前</span>
          <strong>{interval.label}</strong><small>{interval.members.length}/{result.expectedRouteCount} 条路线有对应判断
            {interval.missingProbeIds.length ? `；另有 ${interval.missingProbeIds.length} 个探针未解析` : ""}</small>
        </li>)}
      </ol> : null}
      {result.intervals.length > 3 ? <button type="button" onClick={() => setShowAll(value => !value)} aria-expanded={showAll}>
        {showAll ? "收起其余区间" : `展开其余 ${result.intervals.length - 3} 个实际区间`}</button> : null}
      {result.issues.length ? <details className="candidate-main-route-issues"><summary>查看尚未完成的核对</summary>
        <ul>{result.issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul></details> : null}
    </>}
    <div className="candidate-main-route-controls">
      <label>候选走势起始年<input type="number" min={1900} max={2100} value={startYear} disabled={status === "working"}
        onChange={event => { invalidate(); setStartYear(Number(event.target.value)); }} /></label>
      <label>候选走势范围<select value={years} disabled={status === "working"} onChange={event => { invalidate(); setYears(Number(event.target.value)); }}>
        <option value={1}>一年</option><option value={3}>近三年</option><option value={10}>十年</option>
      </select></label>
    </div>
    <button type="button" className="primary-action" disabled={status === "working" || startYear < 1900 || startYear > 2100 || !Number.isInteger(startYear)}
      onClick={() => { void run(); }}>{status === "working" ? "正在核对全部候选" : status === "idle" ? "核对全部候选的走势" : "重新核对全部候选"}</button>
    {status === "working" ? <><p role="status">{progress ? `已处理 ${progress.completedVariants}/${progress.totalVariants} 个时间变体；需逐一核对 ${progress.totalRoutes} 条路线。` : "正在核对整组资料的来源与计算摘要。"}尚未宣布共同结论。</p>
      <button type="button" onClick={() => { invalidate(); setMessage("已取消本轮核对，未用部分结果形成共同主线。"); }}>取消本轮核对</button></> : null}
    {message ? <p role={status === "failed" ? "alert" : "status"}>{message}</p> : null}
    {result ? <>
      <details className="candidate-main-route-assumptions"><summary>分别查看假设路线及各自条件</summary>
        <p>这里的具体时刻仅是计算探针；明确选择后只展示该假设，不会把它变成真实出生时间。</p>
        <label>选择一条候选假设<select value={selectedRoute} onChange={event => setSelectedRoute(event.target.value)}>
          <option value="">不选择任何候选作主盘</option>
          {result.outcomes.filter(outcome => outcome.status === "ready").map(outcome => <option key={candidateRouteKey(outcome.source)} value={candidateRouteKey(outcome.source)}>
            {outcome.source.representativeTime}探针 · {choice[outcome.source.choice]} · {branch[outcome.source.branchId]}
          </option>)}
        </select></label>
        {picked?.status === "ready" ? <div className="candidate-main-route-selected" data-candidate-route={selectedRoute}>
          <h3>仅按 {picked.source.representativeTime} 探针 · {choice[picked.source.choice]} · {branch[picked.source.branchId]}</h3>
          <p>{picked.route.headline}</p>
          {picked.route.stages.map(stage => <section key={stage.id}><h4>{time(stage.startInstant)}起至{time(stage.endExclusiveInstant)}前 · {stage.caption}</h4>
            <p>{stage.headline}</p><p>{stage.summary}</p><ul>{stage.conditions.map((condition, i) => <li key={i}>{condition}</li>)}</ul>
            <details><summary>本条假设的独立依据</summary><ul>{stage.evidence.map((line, i) => <li key={i}>{line}</li>)}</ul>
              <p>来源：{stage.sourceIds.join("、")}</p><p>版本：{stage.sourceVersions.join("、")}</p></details>
          </section>)}
          <details><summary>候选来源身份</summary><p>原记录：{picked.source.recordId}</p><p>整组结果：{picked.source.candidateSetResultHash}</p>
            <p>变体：{picked.source.variantId} · {picked.source.chartResultHash}</p><p>计算用临时身份：{picked.source.syntheticRevisionId}（未写入档案）</p></details>
        </div> : null}
      </details>
      <details><summary>范围与展示版本</summary><ul>{result.limitations.map(line => <li key={line}>{line}</li>)}</ul><p>{result.sourceVersions.join("、")}</p></details>
    </> : <p className="candidate-main-route-note">13个探针不是全天所有瞬时点。这里只计算年度；不会生成全部月份或改写原资料。</p>}
  </section>;
}
