import { CalendarClock, CircleAlert, Link2, LocateFixed, NotebookPen } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import type {
  EventRecord,
  RevisionRecord,
  TransitNode,
  TransitNodeType,
  TransitSlot,
  TransitSnapshot
} from "@hakimi/contracts";
import { normalizeBirthTime } from "@hakimi/time-core";
import { AppLink } from "../lib/router";
import {
  buildChartSearch,
  canonicalInstant,
  transitScaleTracks,
  transitTrackOrder,
  type TransitRouteState,
  type TransitScale
} from "../lib/transit-route";
import { StatusPill } from "./status-pill";

const trackLabels: Record<TransitNodeType, { title: string; hint: string }> = {
  dayun: { title: "大运", hint: "十年半开区间" },
  xiaoyun: { title: "小运", hint: "时柱相邻 · 精确立春增龄（工作口径）" },
  year: { title: "流年", hint: "固定 UTC+08 · 立春界年" },
  month: { title: "流月", hint: "固定 UTC+08 · 十二节界月" },
  day: { title: "流日", hint: "修订 IANA 时区 · 锁版换日" },
  hour: { title: "流时", hint: "修订 IANA 时区 · 两小时区间" }
};

const scaleOptions: ReadonlyArray<{ value: TransitScale; label: string; description: string }> = [
  { value: "all", label: "全景", description: "六层并列" },
  { value: "year", label: "年尺度", description: "大运、小运、流年" },
  { value: "month", label: "月尺度", description: "流年、流月" },
  { value: "day", label: "日尺度", description: "流月、流日" },
  { value: "hour", label: "时尺度", description: "流日、流时" }
];

type Props = {
  revision: RevisionRecord;
  route: TransitRouteState;
  snapshot: TransitSnapshot | null;
  events: EventRecord[];
  loading: boolean;
  error: string | null;
  onRouteChange: (next: TransitRouteState, options?: { replace?: boolean }) => void;
  onOpenResearch: (node: TransitNode) => void;
};

function slotMessage(slot: TransitSlot): string | null {
  return slot.status === "resolved" ? null : slot.message;
}

function shortWall(value: string): string {
  return value.replace("T", " ").slice(0, 16);
}

function frameLabel(node: TransitNode): string {
  return node.frame === "fixed_plus08" ? "固定 +08" : "案例时区";
}

function nodeQueryMatches(node: TransitNode, route: TransitRouteState): boolean {
  return route.selection?.nodeType === node.nodeType && route.selection.nodeId === node.ref.nodeId;
}

function sameTracks(left: readonly TransitNodeType[], right: readonly TransitNodeType[]): boolean {
  return left.length === right.length && left.every((track, index) => track === right[index]);
}

function wallInputToInstant(value: string, revision: RevisionRecord): string {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2})?)$/.exec(value);
  if (!match) throw new Error("请输入完整的本地日期和时间。");
  const time = match[2].length === 5 ? `${match[2]}:00` : match[2];
  const calibration = normalizeBirthTime({
    ...revision.input,
    calendarType: "gregorian",
    date: match[1],
    time,
    timePrecision: "exact_second",
    lunarLeapMonth: false
  }, "reject");
  if (!calibration.utcInstant) {
    throw new Error(calibration.warnings[0] ?? "该本地时间处于 DST 重叠或空档，当前不会静默选择候选值。");
  }
  return canonicalInstant(calibration.utcInstant);
}

function TrackFallback({ slot }: { slot: TransitSlot }) {
  if (slot.status === "resolved") return null;
  const message = slotMessage(slot);
  return (
    <div className="transit-track-fallback" role="note">
      <CircleAlert aria-hidden="true" />
      <div><strong>{slot.status === "unsupported" ? "暂不支持" : "此刻不适用"}</strong><p>{message}</p><code>{slot.reasonCode}</code></div>
    </div>
  );
}

export function TransitWorkbench({
  revision,
  route,
  snapshot,
  events,
  loading,
  error,
  onRouteChange,
  onOpenResearch
}: Props) {
  const [wallInput, setWallInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [rovingNodeIds, setRovingNodeIds] = useState<Partial<Record<TransitNodeType, string>>>({});

  useEffect(() => {
    if (snapshot) setWallInput(snapshot.target.revisionWallDateTime.slice(0, 19));
  }, [snapshot?.target.instant]);

  const visibleTrackSet = useMemo(() => new Set(route.tracks), [route.tracks]);
  const visibleTracks = useMemo(
    () => transitTrackOrder.filter((track) => visibleTrackSet.has(track)),
    [visibleTrackSet]
  );
  const allNodes = useMemo(() => snapshot ? transitTrackOrder.flatMap((key) => snapshot.tracks[key]) : [], [snapshot]);
  const selectedNode = useMemo(
    () => allNodes.find((node) => nodeQueryMatches(node, route)) ?? null,
    [allNodes, route]
  );
  const activeNodes = snapshot
    ? transitTrackOrder.flatMap((key) => snapshot.slots[key].status === "resolved" ? [snapshot.slots[key].node] : [])
    : [];
  const visibleActiveNodes = activeNodes.filter((node) => visibleTrackSet.has(node.nodeType));
  const focusedNode = selectedNode ?? visibleActiveNodes.at(-1) ?? activeNodes.at(-1) ?? null;
  const selectedTrackHidden = Boolean(selectedNode && !visibleTrackSet.has(selectedNode.nodeType));
  const customizedTracks = !sameTracks(route.tracks, transitScaleTracks[route.scale]);
  const linkedEvents = focusedNode
    ? events.filter((record) =>
        record.caseId === revision.caseId &&
        record.revisionId === revision.id &&
        record.transitNodeRef?.namespace === "hakimi-transit-node" &&
        record.transitNodeRef.revisionId === revision.id &&
        record.transitNodeRef.nodeId === focusedNode.ref.nodeId &&
        record.deletedAt === null
      )
    : [];

  const selectNode = (node: TransitNode) => {
    onRouteChange({
      ...route,
      atInstant: canonicalInstant(node.startInstant),
      selection: { nodeType: node.nodeType, nodeId: node.ref.nodeId }
    });
  };

  const moveTrackFocus = (
    event: KeyboardEvent<HTMLButtonElement>,
    nodeIndex: number,
    nodes: TransitNode[],
    track: TransitNodeType
  ) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = Math.min(nodeIndex + 1, nodes.length - 1);
    if (event.key === "ArrowLeft") nextIndex = Math.max(nodeIndex - 1, 0);
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = nodes.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const nextNode = nodes[nextIndex];
    setRovingNodeIds((current) => ({ ...current, [track]: nextNode.ref.nodeId }));
    const buttons = event.currentTarget
      .closest(".transit-node-strip")
      ?.querySelectorAll<HTMLButtonElement>(".transit-node-item > button");
    buttons?.[nextIndex]?.focus();
  };

  const submitWallTime = (event: FormEvent) => {
    event.preventDefault();
    setInputError(null);
    try {
      onRouteChange({ ...route, atInstant: wallInputToInstant(wallInput, revision), selection: null });
    } catch (reason) {
      setInputError(reason instanceof Error ? reason.message : "无法解析目标时间。");
    }
  };

  const jumpToNow = () => {
    setInputError(null);
    onRouteChange({ ...route, atInstant: canonicalInstant(Date.now()), selection: null });
  };

  const selectScale = (scale: TransitScale) => {
    onRouteChange({
      ...route,
      scale,
      tracks: [...transitScaleTracks[scale]]
    });
  };

  const toggleTrack = (track: TransitNodeType) => {
    const next = new Set(route.tracks);
    if (next.has(track)) {
      if (next.size === 1) return;
      next.delete(track);
    } else {
      next.add(track);
    }
    onRouteChange({
      ...route,
      tracks: transitTrackOrder.filter((candidate) => next.has(candidate))
    }, { replace: true });
  };

  return (
    <div className="transit-workbench">
      <section className="transit-toolbar" aria-labelledby="transit-title">
        <div className="transit-intro">
          <div><p className="eyebrow">Vertical transit slice</p><h2 id="transit-title">同一瞬时点的六层运限切片</h2></div>
          <StatusPill tone="warning">0 金标 · 工程预览</StatusPill>
          <p>大运、小运、流年、流月、流日与流时是并行覆盖区间；这里只展示可复算事实，不输出吉凶断语。</p>
        </div>

        <form className="transit-time-form" onSubmit={submitWallTime}>
          <label htmlFor="transit-at"><span>目标时间 · {revision.input.timeZone}</span><input id="transit-at" type="datetime-local" step="1" value={wallInput} onChange={(event) => setWallInput(event.target.value)} required /></label>
          <button type="submit" className="primary-action"><LocateFixed aria-hidden="true" />定位切片</button>
          <button type="button" className="secondary-action" onClick={jumpToNow}><CalendarClock aria-hidden="true" />此刻</button>
        </form>
        {inputError ? <p className="transit-input-error" role="alert">{inputError}</p> : null}

        <section className="transit-view-controls" aria-labelledby="transit-view-controls-title" data-snapshot-hash={snapshot?.resultHash}>
          <header>
            <div><p className="eyebrow">View only</p><h3 id="transit-view-controls-title">观察粒度与轨道</h3></div>
            <p role="status" aria-live="polite">显示 {visibleTracks.length} / {transitTrackOrder.length} 条轨道{customizedTracks ? " · 自定义筛选" : " · 粒度预设"}；不会重新计算命盘或运限摘要。</p>
          </header>
          <div className="transit-scale-control">
            <span id="transit-scale-label">粒度聚焦</span>
            <div role="group" aria-labelledby="transit-scale-label">
              {scaleOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={route.scale === option.value ? "is-active" : ""}
                  aria-pressed={route.scale === option.value}
                  title={option.description}
                  onClick={() => selectScale(option.value)}
                >
                  <strong>{option.label}</strong><small>{option.description}</small>
                </button>
              ))}
            </div>
          </div>
          <fieldset className="transit-track-filter">
            <legend>轨道筛选</legend>
            <div>
              {transitTrackOrder.map((track) => {
                const checked = visibleTrackSet.has(track);
                return (
                  <label key={track}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={checked && visibleTracks.length === 1}
                      onChange={() => toggleTrack(track)}
                    />
                    <span><strong>{trackLabels[track].title}</strong><small>{trackLabels[track].hint}</small></span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          {selectedTrackHidden && selectedNode ? (
            <div className="transit-hidden-selection" role="status">
              <div><strong>所选{trackLabels[selectedNode.nodeType].title}节点仍保留</strong><p>轨道当前被筛选隐藏；URL 中的稳定节点 ID、目标时间和检查器内容都没有改写。</p></div>
              <button type="button" className="secondary-action" onClick={() => toggleTrack(selectedNode.nodeType)}>显示{trackLabels[selectedNode.nodeType].title}轨道</button>
            </div>
          ) : null}
        </section>

        {revision.input.sex === "unspecified" ? (
          <div className="transit-direction" role="group" aria-label="人工指定大运顺逆">
            <div><strong>性别未指定，顺逆必须由你明确选择</strong><small>选择会进入 URL 和所有节点引用，不改写出生资料。</small></div>
            <button type="button" className={route.manualDirection === "forward" ? "is-active" : ""} aria-pressed={route.manualDirection === "forward"} onClick={() => onRouteChange({ ...route, manualDirection: "forward", selection: null })}>顺行</button>
            <button type="button" className={route.manualDirection === "backward" ? "is-active" : ""} aria-pressed={route.manualDirection === "backward"} onClick={() => onRouteChange({ ...route, manualDirection: "backward", selection: null })}>逆行</button>
          </div>
        ) : null}
      </section>

      {error ? <div className="inline-error" role="alert"><strong>无法生成运限切片</strong><p>{error}</p></div> : null}
      {loading ? <div className="transit-loading" role="status"><span /><p>正在复算六层时间区间…</p></div> : null}

      {snapshot ? (
        <>
          <div className="transit-target-summary">
            <span>案例时区 <strong>{shortWall(snapshot.target.revisionWallDateTime)}</strong></span>
            <span>固定 +08 <strong>{shortWall(snapshot.target.fixedPlusEightWallDateTime)}</strong></span>
            <span className="mono">snapshot {snapshot.resultHash.slice(0, 12)}…</span>
          </div>

          {route.selection && !selectedNode ? (
            <div className="transit-stale-selection" role="status"><CircleAlert aria-hidden="true" /><p>URL 中的节点不在本次确定性窗口内，已保留目标时刻但不跳转到近似节点。</p></div>
          ) : null}

          <div className="transit-tracks" role="region" aria-label="六层运限时间线">
            <p id="transit-track-keyboard-help" className="sr-only">每条轨道只有一个 Tab 停靠点；使用左右方向键、Home 和 End 浏览节点，Enter 或空格选择。</p>
            {visibleTracks.map((key) => {
              const nodes = snapshot.tracks[key];
              const slot = snapshot.slots[key];
              const rovingNode = nodes.find((node) => node.ref.nodeId === rovingNodeIds[key])
                ?? nodes.find((node) => nodeQueryMatches(node, route))
                ?? nodes.find((node) => node.isActiveAtTarget)
                ?? nodes[0];
              return (
                <section className="transit-track" key={key} aria-labelledby={`transit-track-${key}`}>
                  <header><div><h3 id={`transit-track-${key}`}>{trackLabels[key].title}</h3><p>{trackLabels[key].hint}</p></div>{slot.status === "resolved" ? <StatusPill tone="info">当前 {slot.node.ganZhi}</StatusPill> : <StatusPill tone="warning">{slot.status === "unsupported" ? "未支持" : "不适用"}</StatusPill>}</header>
                  {nodes.length ? (
                    <div className="transit-node-strip" role="list" aria-label={`${trackLabels[key].title}节点`} aria-describedby="transit-track-keyboard-help">
                      {nodes.map((node, nodeIndex) => {
                        const selected = nodeQueryMatches(node, route);
                        return (
                          <div key={node.ref.nodeId} className="transit-node-item" role="listitem">
                            <button
                              type="button"
                              className={`${node.isActiveAtTarget ? "is-active" : ""} ${selected ? "is-selected" : ""}`}
                              aria-pressed={selected}
                              tabIndex={rovingNode?.ref.nodeId === node.ref.nodeId ? 0 : -1}
                              onFocus={() => setRovingNodeIds((current) => current[key] === node.ref.nodeId
                                ? current
                                : { ...current, [key]: node.ref.nodeId })}
                              onKeyDown={(event) => moveTrackFocus(event, nodeIndex, nodes, key)}
                              onClick={() => selectNode(node)}
                            >
                              <small>{node.label}</small><strong>{node.ganZhi}</strong><span>{node.stemTenGod}</span><time dateTime={node.startInstant}>{shortWall(node.startWallDateTime)}</time><em>{node.isActiveAtTarget ? "覆盖目标" : frameLabel(node)}</em>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : <TrackFallback slot={slot} />}
                </section>
              );
            })}
          </div>

          <section className="transit-inspector" aria-labelledby="transit-inspector-title">
            <div className="section-heading-row"><div><p className="eyebrow">Node inspector</p><h2 id="transit-inspector-title">{route.selection ? "所选节点" : "当前最细活动节点"}</h2></div>{focusedNode ? <StatusPill tone="cinnabar">{trackLabels[focusedNode.nodeType].title}</StatusPill> : null}</div>
            {focusedNode ? (
              <div className="transit-inspector-grid">
                <div className="transit-node-identity"><small>{focusedNode.label}</small><strong>{focusedNode.ganZhi}</strong><span>{focusedNode.stemTenGod}</span></div>
                <dl>
                  <div><dt>开始（含）</dt><dd>{focusedNode.startWallDateTime} · {frameLabel(focusedNode)}</dd></div>
                  <div><dt>结束（不含）</dt><dd>{focusedNode.endExclusiveWallDateTime} · {frameLabel(focusedNode)}</dd></div>
                  <div><dt>边界</dt><dd>{focusedNode.boundaryLabel ?? "按活动区间"}</dd></div>
                  <div><dt>稳定引用</dt><dd className="mono" title={focusedNode.ref.nodeId}>{focusedNode.ref.nodeId.slice(0, 30)}…</dd></div>
                </dl>
                <div className="transit-event-links">
                  <div><Link2 aria-hidden="true" /><strong>已绑定事件 {linkedEvents.length} 条</strong></div>
                  {linkedEvents.length ? (
                    <ul>{linkedEvents.map((record) => {
                      const ref = record.transitNodeRef;
                      if (!ref || !record.revisionId || ref.namespace !== "hakimi-transit-node") return null;
                      const href = `/cases/${record.caseId}/revisions/${record.revisionId}${buildChartSearch("research", {
                        atInstant: ref.startInstant,
                        selection: { nodeType: ref.nodeType, nodeId: ref.nodeId },
                        manualDirection: ref.manualDirection,
                        scale: route.scale,
                        tracks: route.tracks
                      }, { eventId: record.id })}`;
                      return <li key={record.id}><AppLink href={href} navigationOptions={{ scroll: false }} aria-label={`打开事件 ${record.title}`}>{record.title}</AppLink></li>;
                    })}</ul>
                  ) : <p>尚无真实事件绑定到这个节点。</p>}
                </div>
                <button type="button" className="primary-action" onClick={() => onOpenResearch(focusedNode)}><NotebookPen aria-hidden="true" />到研读页记录事件</button>
              </div>
            ) : <p className="journal-empty">当前没有可检查的活动节点。</p>}
          </section>

          <details className="known-gaps transit-known-gaps"><summary>查看算法边界与当前缺口</summary><ul>{[...snapshot.warnings, ...snapshot.knownGaps].map((item) => <li key={item}>{item}</li>)}</ul></details>
        </>
      ) : null}
    </div>
  );
}
