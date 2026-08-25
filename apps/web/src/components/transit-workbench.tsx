import { CalendarClock, CircleAlert, Link2, LocateFixed, NotebookPen } from "lucide-react";
import { useEffect, useId, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import type {
  EventRecord,
  RevisionRecord,
  TransitNode,
  TransitNodeType,
  TransitSlot,
  TransitSnapshot
} from "@hakimi/contracts";
import { transitSnapshotSchema } from "@hakimi/contracts";
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
import "./transit-workbench.css";

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
const transitTrackSet = new Set<TransitNodeType>(transitTrackOrder);
const transitScaleSet = new Set<TransitScale>(scaleOptions.map((option) => option.value));
const transitNodeIdPattern = /^\d{1,16}\.[a-f0-9]{64}$/;
const unsafeVisibleTextPattern = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/gu;
const sensitiveTransitErrorPattern = /(?:https?:\/\/|file:\/\/|[a-z]:\\|\/(?:users|home)\/|api[_-]?key|authorization|bearer\s|secret|token|password|stack\s*trace|(?:\r?\n)\s*at\s)/iu;

function truncateToCodePoints(value: string, maximumCharacters: number): string {
  let end = 0;
  let count = 0;

  while (end < value.length && count < maximumCharacters) {
    end += (value.codePointAt(end) ?? 0) > 0xffff ? 2 : 1;
    count += 1;
  }

  return value.slice(0, end);
}

function safeVisibleText(value: unknown, fallback: string, maxCodePoints = 500): string {
  if (typeof value !== "string") return fallback;
  const normalized = value
    .slice(0, Math.max(1_024, maxCodePoints * 4))
    .replace(unsafeVisibleTextPattern, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return truncateToCodePoints(normalized, maxCodePoints) || fallback;
}

function errorMessage(reason: unknown, fallback: string): string {
  try {
    const message = safeVisibleText(
      reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "",
      fallback,
    );
    return sensitiveTransitErrorPattern.test(message) ? fallback : message;
  } catch {
    return fallback;
  }
}

function routeStateIssue(route: TransitRouteState, revision: RevisionRecord): string | null {
  if (revision.input.sex !== "male" && revision.input.sex !== "female" && revision.input.sex !== "unspecified") {
    return "当前 Revision 的性别枚举不可识别，已关闭运限交互。";
  }
  if (route.manualDirection !== null && route.manualDirection !== "forward" && route.manualDirection !== "backward") {
    return "URL 中的人工顺逆参数不可识别。";
  }
  if (revision.input.sex !== "unspecified" && route.manualDirection !== null) {
    return "已知性别的 Revision 不允许携带人工顺逆参数。";
  }
  if (!transitScaleSet.has(route.scale)) return "URL 中的观察粒度不可识别。";
  if (
    !Array.isArray(route.tracks)
    || route.tracks.length === 0
    || new Set(route.tracks).size !== route.tracks.length
    || route.tracks.some((track) => !transitTrackSet.has(track))
  ) {
    return "URL 中的运限轨道筛选为空、重复或包含未知值。";
  }
  if (route.atInstant !== null) {
    try {
      if (canonicalInstant(route.atInstant) !== route.atInstant) return "URL 中的目标瞬时点不是规范 UTC。";
    } catch {
      return "URL 中的目标瞬时点无法解析。";
    }
  }
  if (route.selection && (!transitTrackSet.has(route.selection.nodeType) || !transitNodeIdPattern.test(route.selection.nodeId))) {
    return "URL 中的稳定节点选择格式无效。";
  }
  return null;
}

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
  return safeVisibleText(value, "时间不可显示", 64).replace("T", " ").slice(0, 16);
}

function shortBindingValue(value: string): string {
  const normalized = safeVisibleText(value, "绑定不可显示", 512);
  return normalized.length > 24 ? `${normalized.slice(0, 12)}…${normalized.slice(-8)}` : normalized;
}

function directionSourceLabel(
  revision: RevisionRecord,
  direction: TransitRouteState["manualDirection"]
): string {
  if (revision.input.sex !== "unspecified") return "冻结规则口径，无手动覆盖";
  if (direction === "forward") return "用户显式指定顺行";
  if (direction === "backward") return "用户显式指定逆行";
  return "尚未显式指定";
}

function sameCanonicalInstant(left: string, right: string): boolean {
  try {
    return canonicalInstant(left) === canonicalInstant(right);
  } catch {
    return false;
  }
}

function frameLabel(node: TransitNode): string {
  if (node.frame === "fixed_plus08") return "固定 +08";
  if (node.frame === "revision_iana_civil") return "案例时区";
  return "参考系不可识别";
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
      <div><strong>{slot.status === "unsupported" ? "暂不支持" : slot.status === "not_applicable" ? "此刻不适用" : "状态不可识别"}</strong><p>{safeVisibleText(message, "未提供原因")}</p><code>{safeVisibleText(slot.reasonCode, "原因码不可显示", 120)}</code></div>
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
  const scopeNoteId = useId();
  const timeInputId = useId();
  const timeHelpId = useId();
  const timeErrorId = useId();
  const bindingTitleId = useId();
  const transitTitleId = useId();
  const viewControlsTitleId = useId();
  const scaleLabelId = useId();
  const trackKeyboardHelpId = useId();
  const inspectorTitleId = useId();
  const routeIssue = useMemo(() => routeStateIssue(route, revision), [revision, route]);
  const safeScale = transitScaleSet.has(route.scale) ? route.scale : "all";
  const safeTracks = useMemo(() => Array.isArray(route.tracks)
    ? transitTrackOrder.filter((track) => route.tracks.includes(track))
    : [], [route.tracks]);
  const manualDirectionRequired = revision.input.sex === "unspecified" && route.manualDirection === null;
  const targetBindingKey = useMemo(() => JSON.stringify([
    revision.id,
    revision.manifest.resultHash,
    revision.manifest.luckCycleRuleDigest ?? "legacy-inferred",
    route.atInstant,
    route.manualDirection ?? "automatic"
  ]), [
    revision.id,
    revision.manifest.luckCycleRuleDigest,
    revision.manifest.resultHash,
    route.atInstant,
    route.manualDirection
  ]);
  const [wallDraft, setWallDraft] = useState({
    bindingKey: targetBindingKey,
    value: "",
    dirty: false
  });
  const wallInput = wallDraft.bindingKey === targetBindingKey ? wallDraft.value : "";
  const setWallInput = (value: string) => {
    setWallDraft({ bindingKey: targetBindingKey, value, dirty: true });
  };
  const [inputError, setInputError] = useState<string | null>(null);
  const wallDraftEdited = wallDraft.bindingKey === targetBindingKey && wallDraft.dirty;
  const [rovingNodeIds, setRovingNodeIds] = useState<Partial<Record<TransitNodeType, string>>>({});
  const snapshotValidation = useMemo(
    () => snapshot === null ? null : transitSnapshotSchema.safeParse(snapshot),
    [snapshot]
  );
  const validatedSnapshot = snapshotValidation?.success ? snapshotValidation.data : null;
  const snapshotBindingIssue = useMemo(() => {
    if (!snapshot) {
      return null;
    }
    if (!validatedSnapshot) {
      return "快照未通过当前严格 TransitSnapshot 契约。";
    }
    if (validatedSnapshot.caseId !== revision.caseId) {
      return "快照不属于当前 Case。";
    }
    if (validatedSnapshot.revisionId !== revision.id) {
      return "快照不属于当前 Revision。";
    }
    if (validatedSnapshot.revisionResultHash !== revision.manifest.resultHash) {
      return "快照引用的排盘结果摘要与当前 Revision 不一致。";
    }
    if (validatedSnapshot.ruleProfileDigest !== revision.manifest.ruleProfileDigest) {
      return "快照引用的规则档案摘要与当前 Revision 不一致。";
    }
    const expectedLuckCycleRuleDigest = revision.manifest.luckCycleRuleDigest ?? null;
    if (expectedLuckCycleRuleDigest !== null) {
      if (validatedSnapshot.luckCycleRuleDigest !== expectedLuckCycleRuleDigest) {
        return "快照引用的大运规则摘要与当前 Revision 不一致。";
      }
      if (validatedSnapshot.luckCycleRuleSource !== "revision_snapshot") {
        return "当前 Revision 已冻结大运规则，但快照没有声明 revision_snapshot 来源。";
      }
    } else if (validatedSnapshot.luckCycleRuleSource !== "legacy_inferred") {
      return "当前 Revision 没有冻结大运规则摘要，但快照错误声明了 revision_snapshot 来源。";
    }
    if (routeIssue || route.atInstant === null || !sameCanonicalInstant(validatedSnapshot.target.instant, route.atInstant)) {
      return "快照目标瞬时点与当前 URL 不一致。";
    }
    if (validatedSnapshot.target.displayTimeZone !== revision.input.timeZone) {
      return "快照展示时区与当前 Revision 不一致。";
    }
    if (revision.input.sex === "unspecified") {
      if (validatedSnapshot.manualDirection !== route.manualDirection) {
        return "快照采用的手动顺逆方向与当前 URL 不一致。";
      }
    } else if (validatedSnapshot.manualDirection !== null || route.manualDirection !== null) {
      return "已知性别的 Revision 不允许携带手动顺逆方向。";
    }
    return null;
  }, [
    revision.caseId,
    revision.id,
    revision.input.sex,
    revision.input.timeZone,
    revision.manifest.resultHash,
    revision.manifest.ruleProfileDigest,
    revision.manifest.luckCycleRuleDigest,
    route.atInstant,
    route.manualDirection,
    routeIssue,
    snapshot,
    validatedSnapshot
  ]);
  const snapshotMatchesRoute = Boolean(validatedSnapshot && snapshotBindingIssue === null && routeIssue === null);
  const settledSnapshot = !loading && !error && snapshotMatchesRoute ? validatedSnapshot : null;
  const settledWallInput = settledSnapshot?.target.revisionWallDateTime.slice(0, 19) ?? null;
  const snapshotState = error
    ? "error"
    : loading
      ? "loading"
      : snapshot && !snapshotMatchesRoute
        ? "stale"
        : settledSnapshot
          ? "bound"
          : "empty";
  const timeDraftState = inputError
    ? "invalid"
    : wallDraftEdited
      ? "edited"
      : settledSnapshot && wallInput === settledWallInput
        ? "synced"
        : "waiting";
  const timeDraftLabel = timeDraftState === "invalid"
    ? "输入需处理"
    : timeDraftState === "edited"
      ? "本地时间尚未应用"
      : timeDraftState === "synced"
        ? "与当前切片同步"
        : "等待定位有效切片";
  const limitationItems = useMemo(
    () => settledSnapshot
      ? Array.from(new Set([...settledSnapshot.warnings, ...settledSnapshot.knownGaps]
        .map((item) => safeVisibleText(item, "", 300))
        .filter(Boolean)))
      : [],
    [settledSnapshot]
  );

  useEffect(() => {
    setInputError(null);
  }, [targetBindingKey]);

  useEffect(() => {
    if (settledWallInput === null) {
      return;
    }
    setWallDraft((current) => {
      if (current.bindingKey === targetBindingKey && current.dirty) {
        return current;
      }
      if (
        current.bindingKey === targetBindingKey &&
        current.value === settledWallInput &&
        !current.dirty
      ) {
        return current;
      }
      return { bindingKey: targetBindingKey, value: settledWallInput, dirty: false };
    });
  }, [settledWallInput, targetBindingKey]);

  useEffect(() => {
    setRovingNodeIds({});
  }, [settledSnapshot?.resultHash, targetBindingKey]);

  const visibleTrackSet = useMemo(() => new Set(safeTracks), [safeTracks]);
  const visibleTracks = useMemo(
    () => transitTrackOrder.filter((track) => visibleTrackSet.has(track)),
    [visibleTrackSet]
  );
  const allNodes = useMemo(() => settledSnapshot ? transitTrackOrder.flatMap((key) => settledSnapshot.tracks[key]) : [], [settledSnapshot]);
  const nodePresentationByKey = useMemo(() => new Map(allNodes.map((node) => [
    `${node.nodeType}:${node.ref.nodeId}`,
    {
      label: safeVisibleText(node.label, "节点", 80),
      ganZhi: safeVisibleText(node.ganZhi, "--", 8),
      stemTenGod: safeVisibleText(node.stemTenGod, "十神未登记", 40),
      startWallDateTime: safeVisibleText(node.startWallDateTime, "开始时间不可显示", 96),
      endExclusiveWallDateTime: safeVisibleText(node.endExclusiveWallDateTime, "结束时间不可显示", 96),
      boundaryLabel: safeVisibleText(node.boundaryLabel, "按活动区间", 120)
    }
  ] as const)), [allNodes]);
  const selectedNode = useMemo(
    () => allNodes.find((node) => nodeQueryMatches(node, route)) ?? null,
    [allNodes, route]
  );
  const activeNodes = useMemo(
    () => settledSnapshot
      ? transitTrackOrder.flatMap((key) => settledSnapshot.slots[key].status === "resolved" ? [settledSnapshot.slots[key].node] : [])
      : [],
    [settledSnapshot]
  );
  const visibleActiveNodes = useMemo(
    () => activeNodes.filter((node) => visibleTrackSet.has(node.nodeType)),
    [activeNodes, visibleTrackSet]
  );
  const unresolvedSelection = Boolean(route.selection && !selectedNode);
  const focusedNode = selectedNode ?? (route.selection ? null : visibleActiveNodes.at(-1) ?? null);
  const focusedNodePresentation = focusedNode
    ? nodePresentationByKey.get(`${focusedNode.nodeType}:${focusedNode.ref.nodeId}`) ?? null
    : null;
  const inspectorMode = selectedNode
    ? "selected"
    : unresolvedSelection
      ? "selection_unresolved"
      : focusedNode
        ? "active"
        : "empty";
  const selectedTrackHidden = Boolean(selectedNode && !visibleTrackSet.has(selectedNode.nodeType));
  const customizedTracks = !sameTracks(safeTracks, transitScaleTracks[safeScale]);
  const linkedEvents = useMemo(
    () => focusedNode
      ? events.filter((record) =>
          record.caseId === revision.caseId &&
          record.revisionId === revision.id &&
          record.transitNodeRef?.namespace === "hakimi-transit-node" &&
          record.transitNodeRef.schemaVersion === focusedNode.ref.schemaVersion &&
          record.transitNodeRef.revisionId === focusedNode.ref.revisionId &&
          record.transitNodeRef.chartResultHash === focusedNode.ref.chartResultHash &&
          record.transitNodeRef.ruleProfileDigest === focusedNode.ref.ruleProfileDigest &&
          record.transitNodeRef.luckCycleRuleDigest === focusedNode.ref.luckCycleRuleDigest &&
          record.transitNodeRef.manualDirection === focusedNode.ref.manualDirection &&
          record.transitNodeRef.timelineVersion === focusedNode.ref.timelineVersion &&
          record.transitNodeRef.algorithmId === focusedNode.ref.algorithmId &&
          record.transitNodeRef.nodeType === focusedNode.ref.nodeType &&
          sameCanonicalInstant(record.transitNodeRef.startInstant, focusedNode.ref.startInstant) &&
          record.transitNodeRef.nodeId === focusedNode.ref.nodeId &&
          record.deletedAt === null
        )
      : [],
    [events, focusedNode, revision.caseId, revision.id]
  );

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
    if (routeIssue) {
      setInputError("请先恢复有效的运限 URL 状态，再定位新的时间切片。");
      return;
    }
    if (manualDirectionRequired) {
      setInputError("请先明确选择大运顺行或逆行，再定位时间切片。");
      return;
    }
    setInputError(null);
    try {
      onRouteChange({ ...route, scale: safeScale, tracks: safeTracks.length ? safeTracks : [...transitScaleTracks.all], atInstant: wallInputToInstant(wallInput, revision), selection: null });
    } catch (reason) {
      setInputError(errorMessage(reason, "无法解析目标时间。"));
    }
  };

  const jumpToNow = () => {
    if (routeIssue || manualDirectionRequired) return;
    setInputError(null);
    onRouteChange({ ...route, scale: safeScale, tracks: safeTracks.length ? safeTracks : [...transitScaleTracks.all], atInstant: canonicalInstant(Math.floor(Date.now() / 1000) * 1000), selection: null });
  };

  const selectScale = (scale: TransitScale) => {
    if (routeIssue) return;
    onRouteChange({
      ...route,
      scale,
      tracks: [...transitScaleTracks[scale]]
    });
  };

  const toggleTrack = (track: TransitNodeType) => {
    if (routeIssue) return;
    const next = new Set(safeTracks);
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

  const repairRoute = () => {
    let repairedInstant: string | null = null;
    if (route.atInstant !== null) {
      try {
        repairedInstant = canonicalInstant(route.atInstant);
      } catch {
        repairedInstant = null;
      }
    }
    onRouteChange({
      atInstant: repairedInstant,
      selection: null,
      manualDirection: revision.input.sex === "unspecified" && (route.manualDirection === "forward" || route.manualDirection === "backward")
        ? route.manualDirection
        : null,
      scale: "all",
      tracks: [...transitScaleTracks.all]
    }, { replace: true });
  };

  return (
    <div
      className="transit-workbench"
      data-snapshot-state={snapshotState}
      data-inspector-mode={inspectorMode}
      data-manual-direction-required={manualDirectionRequired}
      data-route-state={routeIssue ? "invalid" : "valid"}
      data-time-draft-state={timeDraftState}
      data-binding-state={error ? "unavailable" : loading ? "pending" : settledSnapshot ? "matched" : snapshot ? "mismatched" : "absent"}
      data-release-identity="legacy-v13"
      data-release-family="legacy-v13"
      data-target-schema="13"
      data-db-generation="13"
      data-migration-id="null"
      data-engineering-evidence-only="true"
      data-current-build-evidence-verified="false"
      data-public-release-authorized="false"
      data-formal-activation-allowed="false"
      data-expert-truth-established="false"
      data-formal-truth-established="false"
      data-expert-truth-claimed="false"
      data-scientific-validity-claimed="false"
      data-source-rights-established="false"
      data-good-bad-orientation="null"
      data-good-bad-score="null"
      data-result="null"
      data-chart-or-storage-mutation-performed="false"
      data-record-write-state="not_started"
      data-mutation-mode="route-view-only"
      data-mutation-epoch-bypassed="false"
      aria-busy={loading}
      aria-describedby={scopeNoteId}
    >
      <section className="transit-toolbar" aria-labelledby={transitTitleId}>
        <div className="transit-intro">
          <div><p className="eyebrow">Vertical transit slice</p><h2 id={transitTitleId}>同一瞬时点的六层运限切片</h2></div>
          <StatusPill tone="warning">未建立金标 · 工程预览</StatusPill>
          <p id={scopeNoteId}>大运、小运、流年、流月、流日与流时是并行覆盖区间；这里只展示可复算事实，不输出吉凶断语。</p>
        </div>

        <div className="transit-contract-strip" role="note" aria-label="运限工作台发布与权限基线">
          <div><span>Release</span><strong>legacy-v13</strong></div>
          <div><span>Target</span><strong>schema 13</strong></div>
          <div><span>Migration</span><strong>null</strong></div>
          <div><span>Authority</span><strong>工程切片 · 无吉凶</strong></div>
        </div>

        <form className="transit-time-form" aria-label="定位运限切片" onSubmit={submitWallTime}>
          <label htmlFor={timeInputId}><span>目标时间 · {revision.input.timeZone}</span><input id={timeInputId} type="datetime-local" step="1" value={wallInput} aria-describedby={`${timeHelpId}${inputError ? ` ${timeErrorId}` : ""}`} aria-invalid={Boolean(inputError)} onChange={(event) => { setWallInput(event.target.value); if (inputError) setInputError(null); }} required /></label>
          <button type="submit" className="primary-action" disabled={manualDirectionRequired || Boolean(routeIssue)} title={manualDirectionRequired ? "请先明确选择大运顺行或逆行" : routeIssue ?? undefined}><LocateFixed aria-hidden="true" />定位切片</button>
          <button type="button" className="secondary-action" disabled={manualDirectionRequired || Boolean(routeIssue)} title={manualDirectionRequired ? "请先明确选择大运顺行或逆行" : routeIssue ?? undefined} onClick={jumpToNow}><CalendarClock aria-hidden="true" />此刻</button>
          <output className="transit-time-draft-state" data-state={timeDraftState} htmlFor={timeInputId} aria-live="polite">{timeDraftLabel}</output>
          <p id={timeHelpId} className="transit-time-help">按当前 Revision 的 IANA 时区解释输入；DST 重叠或空档会直接阻断，不会静默选择候选瞬时点。{manualDirectionRequired ? " 当前还需先明确大运顺行或逆行。" : ""}</p>
        </form>
        {inputError ? <p id={timeErrorId} className="transit-input-error" role="alert">{inputError}</p> : null}

        {routeIssue ? <div className="transit-route-error" role="alert"><CircleAlert aria-hidden="true" /><div><strong>运限 URL 状态未通过预检</strong><p>{routeIssue} 现有快照、节点检查器和记录事件入口均保持关闭。</p></div><button type="button" className="secondary-action" onClick={repairRoute}>恢复全景默认视图</button></div> : null}

        <section className="transit-view-controls" aria-labelledby={viewControlsTitleId} data-snapshot-hash={settledSnapshot?.resultHash}>
          <header>
            <div><p className="eyebrow">View only</p><h3 id={viewControlsTitleId}>观察粒度与轨道</h3></div>
            <p role="status" aria-live="polite">显示 {visibleTracks.length} / {transitTrackOrder.length} 条轨道{customizedTracks ? " · 自定义筛选" : " · 粒度预设"}；不会重新计算命盘或运限摘要。</p>
          </header>
          <div className="transit-scale-control">
            <span id={scaleLabelId}>粒度聚焦</span>
            <div role="group" aria-labelledby={scaleLabelId}>
              {scaleOptions.map((option) => {
                const exactPreset = safeScale === option.value && !customizedTracks;
                const basePreset = safeScale === option.value && customizedTracks;
                return (
                  <button
                    key={option.value}
                    type="button"
                    data-scale={option.value}
                    data-preset-state={exactPreset ? "exact" : basePreset ? "base" : "inactive"}
                    className={exactPreset ? "is-active" : basePreset ? "is-base" : ""}
                    aria-pressed={exactPreset}
                    disabled={Boolean(routeIssue)}
                    title={basePreset ? `${option.description}；当前轨道已自定义` : option.description}
                    onClick={() => selectScale(option.value)}
                  >
                    <strong>{option.label}</strong><small>{basePreset ? "自定义轨道的基础预设" : option.description}</small>
                  </button>
                );
              })}
            </div>
          </div>
          <fieldset className="transit-track-filter" disabled={Boolean(routeIssue)}>
            <legend>轨道筛选</legend>
            <div>
            {transitTrackOrder.map((track) => {
              const checked = visibleTrackSet.has(track);
              const trackDisabled = checked && visibleTracks.length === 1;
              return (
                <label
                  key={track}
                  data-track={track}
                  data-selected={checked}
                  data-disabled={trackDisabled}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={trackDisabled}
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
            <button type="button" disabled={Boolean(routeIssue)} className={route.manualDirection === "forward" ? "is-active" : ""} aria-pressed={route.manualDirection === "forward"} onClick={() => onRouteChange({ ...route, scale: safeScale, tracks: safeTracks.length ? safeTracks : [...transitScaleTracks.all], manualDirection: "forward", selection: null })}>顺行</button>
            <button type="button" disabled={Boolean(routeIssue)} className={route.manualDirection === "backward" ? "is-active" : ""} aria-pressed={route.manualDirection === "backward"} onClick={() => onRouteChange({ ...route, scale: safeScale, tracks: safeTracks.length ? safeTracks : [...transitScaleTracks.all], manualDirection: "backward", selection: null })}>逆行</button>
          </div>
        ) : null}
      </section>

      {error ? <div className="inline-error transit-snapshot-state" role="alert"><strong>无法生成运限切片</strong><p>{errorMessage(error, "运限切片返回了不可显示的错误。")}</p></div> : null}
      {!error && loading ? <div className="transit-loading transit-snapshot-state" role="status"><span aria-hidden="true" /><p>正在复算六层时间区间；旧快照暂不参与选择。</p></div> : null}
      {!loading && !error && snapshot && !snapshotMatchesRoute ? <div className="transit-stale-snapshot transit-snapshot-state" role="alert"><CircleAlert aria-hidden="true" /><div><strong>快照绑定与当前 Revision 或 URL 不一致</strong><p>{snapshotBindingIssue} 已停止展示旧轨道；不会回退近似快照。</p></div></div> : null}
      {!loading && !error && !snapshot ? <div className="transit-empty-snapshot transit-snapshot-state" role="status"><CalendarClock aria-hidden="true" /><div><strong>当前没有可展示的运限快照</strong><p>选择目标时间后，只有与 URL 瞬时点一致的结果才会进入轨道。</p></div></div> : null}

      {settledSnapshot ? (
        <>
          <div className="transit-target-summary" role="status" aria-live="polite">
            <span>案例时区 <strong>{shortWall(settledSnapshot.target.revisionWallDateTime)}</strong></span>
            <span>固定 +08 <strong>{shortWall(settledSnapshot.target.fixedPlusEightWallDateTime)}</strong></span>
            <span className="mono" title={settledSnapshot.resultHash}>snapshot {settledSnapshot.resultHash.slice(0, 12)}…</span>
          </div>

          <section
            className="transit-binding-ledger"
            data-binding-status="matched"
            aria-labelledby={bindingTitleId}
          >
            <header>
              <div><p className="eyebrow">Binding ledger</p><h3 id={bindingTitleId}>当前切片绑定账本</h3></div>
              <StatusPill tone="info">输入绑定字段一致</StatusPill>
            </header>
            <dl>
              <div><dt>Case</dt><dd><code title={settledSnapshot.caseId}>{shortBindingValue(settledSnapshot.caseId)}</code></dd></div>
              <div><dt>Revision</dt><dd><code title={settledSnapshot.revisionId}>{shortBindingValue(settledSnapshot.revisionId)}</code></dd></div>
              <div><dt>URL 瞬时点</dt><dd><time dateTime={settledSnapshot.target.instant}>{settledSnapshot.target.instant}</time></dd></div>
              <div><dt>展示时区</dt><dd>{settledSnapshot.target.displayTimeZone}</dd></div>
              <div><dt>排盘结果摘要</dt><dd><code title={revision.manifest.resultHash}>{shortBindingValue(revision.manifest.resultHash)}</code></dd></div>
              <div><dt>规则档案摘要</dt><dd><code title={revision.manifest.ruleProfileDigest}>{shortBindingValue(revision.manifest.ruleProfileDigest)}</code></dd></div>
              <div><dt>大运规则摘要</dt><dd><code title={settledSnapshot.luckCycleRuleDigest}>{shortBindingValue(settledSnapshot.luckCycleRuleDigest)}</code></dd></div>
              <div><dt>大运规则来源</dt><dd>{settledSnapshot.luckCycleRuleSource === "revision_snapshot" ? "Revision 冻结快照" : "旧版确定性推断"}</dd></div>
              <div><dt>切片结果摘要</dt><dd><code title={settledSnapshot.resultHash}>{shortBindingValue(settledSnapshot.resultHash)}</code></dd></div>
              <div><dt>方向与视图</dt><dd>{directionSourceLabel(revision, route.manualDirection)} · {visibleTracks.map((track) => trackLabels[track].title).join("、")}</dd></div>
            </dl>
            <p className="transit-binding-note">绑定一致只表示页面快照与当前 Case、Revision、URL 瞬时点、排盘摘要、规则档案及大运规则来源相符；不代表算法已获专家金标，也不生成吉凶结论。</p>
          </section>

          {unresolvedSelection ? (
            <div className="transit-stale-selection" role="alert">
              <CircleAlert aria-hidden="true" />
              <div><strong>URL 节点选择无法解析</strong><p>该稳定节点 ID 不在本次确定性窗口内；检查器与事件记录入口已关闭，不会回退到当前活动节点。</p></div>
              <button type="button" className="secondary-action" onClick={() => onRouteChange({ ...route, selection: null }, { replace: true })}>清除失效选择</button>
            </div>
          ) : null}

          <div className="transit-tracks" role="region" aria-label="六层运限时间线">
            <p id={trackKeyboardHelpId} className="sr-only">每条轨道只有一个 Tab 停靠点；使用左右方向键、Home 和 End 浏览节点，Enter 或空格选择。</p>
            {visibleTracks.map((key) => {
              const nodes = settledSnapshot.tracks[key];
              const slot = settledSnapshot.slots[key];
              const rovingNode = nodes.find((node) => node.ref.nodeId === rovingNodeIds[key])
                ?? nodes.find((node) => nodeQueryMatches(node, route))
                ?? nodes.find((node) => node.isActiveAtTarget)
                ?? nodes[0];
              return (
                <section className="transit-track" key={key} data-track={key} data-slot-status={slot.status} aria-labelledby={`${trackKeyboardHelpId}-${key}`}>
                  <header><div><h3 id={`${trackKeyboardHelpId}-${key}`}>{trackLabels[key].title}</h3><p>{trackLabels[key].hint}</p></div>{slot.status === "resolved" ? <StatusPill tone="info">当前 {safeVisibleText(slot.node.ganZhi, "干支不可显示", 8)}</StatusPill> : <StatusPill tone="warning">{slot.status === "unsupported" ? "未支持" : slot.status === "not_applicable" ? "不适用" : "状态异常"}</StatusPill>}</header>
                  {nodes.length ? (
                    <div className="transit-node-strip" role="list" aria-label={`${trackLabels[key].title}节点`} aria-describedby={trackKeyboardHelpId}>
                      {nodes.map((node, nodeIndex) => {
                        const selected = nodeQueryMatches(node, route);
                        const presentation = nodePresentationByKey.get(`${node.nodeType}:${node.ref.nodeId}`);
                        return (
                          <div key={node.ref.nodeId} className="transit-node-item" role="listitem">
                            <button
                              type="button"
                              className={`${node.isActiveAtTarget ? "is-active" : ""} ${selected ? "is-selected" : ""}`}
                              data-node-state={selected ? "selected" : node.isActiveAtTarget ? "active" : "context"}
                              data-frame={node.frame}
                              aria-pressed={selected}
                              tabIndex={rovingNode?.ref.nodeId === node.ref.nodeId ? 0 : -1}
                              onFocus={() => setRovingNodeIds((current) => current[key] === node.ref.nodeId
                                ? current
                                : { ...current, [key]: node.ref.nodeId })}
                              onKeyDown={(event) => moveTrackFocus(event, nodeIndex, nodes, key)}
                              onClick={() => selectNode(node)}
                            >
                              <small>{presentation?.label ?? "节点"}</small><strong>{presentation?.ganZhi ?? "--"}</strong><span>{presentation?.stemTenGod ?? "十神未登记"}</span><time dateTime={node.startInstant}>{shortWall(presentation?.startWallDateTime ?? "")}</time><em>{node.isActiveAtTarget ? "覆盖目标" : frameLabel(node)}</em>
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

          <section className="transit-inspector" data-node-type={focusedNode?.nodeType ?? "none"} data-inspector-mode={inspectorMode} aria-labelledby={inspectorTitleId}>
            <div className="section-heading-row"><div><p className="eyebrow">Node inspector</p><h2 id={inspectorTitleId}>{selectedNode ? "所选节点" : unresolvedSelection ? "所选节点未解析" : "当前最细活动节点"}</h2></div>{unresolvedSelection ? <StatusPill tone="warning">入口关闭</StatusPill> : focusedNode ? <StatusPill tone="info">{trackLabels[focusedNode.nodeType].title}</StatusPill> : null}</div>
            {focusedNode ? (
              <div className="transit-inspector-grid">
                <div className="transit-node-identity"><small>{focusedNodePresentation?.label ?? "节点"}</small><strong>{focusedNodePresentation?.ganZhi ?? "--"}</strong><span>{focusedNodePresentation?.stemTenGod ?? "十神未登记"}</span></div>
                <dl>
                  <div><dt>开始（含）</dt><dd>{focusedNodePresentation?.startWallDateTime ?? "开始时间不可显示"} · {frameLabel(focusedNode)}</dd></div>
                  <div><dt>结束（不含）</dt><dd>{focusedNodePresentation?.endExclusiveWallDateTime ?? "结束时间不可显示"} · {frameLabel(focusedNode)}</dd></div>
                  <div><dt>边界</dt><dd>{focusedNodePresentation?.boundaryLabel ?? "按活动区间"}</dd></div>
                  <div><dt>稳定引用</dt><dd className="mono" title={safeVisibleText(focusedNode.ref.nodeId, "")}>{shortBindingValue(focusedNode.ref.nodeId)}</dd></div>
                </dl>
                <div className="transit-event-links">
                  <div><Link2 aria-hidden="true" /><strong>已绑定事件 {linkedEvents.length} 条</strong></div>
                  {linkedEvents.length ? (
                    <ul>{linkedEvents.map((record) => {
                      const ref = record.transitNodeRef;
                      if (!ref || !record.revisionId || ref.namespace !== "hakimi-transit-node") return null;
                      const href = `/cases/${record.caseId}/revisions/${record.revisionId}${buildChartSearch("research", {
                        atInstant: focusedNode.startInstant,
                        selection: { nodeType: focusedNode.nodeType, nodeId: focusedNode.ref.nodeId },
                        manualDirection: focusedNode.ref.manualDirection,
                        scale: route.scale,
                        tracks: route.tracks
                      }, { eventId: record.id })}`;
                      return <li key={record.id}><AppLink href={href} navigationOptions={{ scroll: false }} aria-label={`打开事件 ${safeVisibleText(record.title, "未命名事件", 120)}`}>{safeVisibleText(record.title, "未命名事件", 120)}</AppLink></li>;
                    })}</ul>
                  ) : <p>尚无真实事件绑定到这个节点。</p>}
                </div>
                <button type="button" className="primary-action" onClick={() => onOpenResearch(focusedNode)}><NotebookPen aria-hidden="true" />到研读页记录事件</button>
              </div>
            ) : <p className="journal-empty">{unresolvedSelection ? "请先清除 URL 中失效的节点选择，再查看当前活动节点或记录事件。" : "当前没有可检查的活动节点。"}</p>}
          </section>

          <details className="known-gaps transit-known-gaps">
            <summary><span className="transit-known-gaps-summary"><span>算法边界与当前缺口</span><strong>{limitationItems.length} 条</strong></span></summary>
            {limitationItems.length
              ? <ul>{limitationItems.map((item) => <li key={item}>{item}</li>)}</ul>
              : <p className="transit-no-extra-gaps">当前快照未附加额外条目；这不代表术数有效性或专家复核已经完成。</p>}
          </details>
        </>
      ) : null}
    </div>
  );
}
