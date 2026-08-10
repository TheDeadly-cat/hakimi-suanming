import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { RevisionRecord } from "@hakimi/contracts";
import type { LuckDirection } from "@hakimi/luck-core";
import type {
  RevisionDerivedReplayRequest,
  RevisionDerivedReplayComponent,
  RevisionDerivedReplayProjection,
  RevisionTransitReplayComponent
} from "@hakimi/revision-replay";
import { StatusPill } from "./status-pill";

type Props = {
  revision: RevisionRecord;
  atInstant: string | null;
  routeManualDirection: LuckDirection | null;
  onSaveSnapshot?: (request: RevisionDerivedReplayRequest) => Promise<"saved" | "already_saved">;
};

const unavailableCodeLabels = {
  executor_unavailable: "执行器不可用",
  frozen_rule_snapshot_missing: "规则快照缺失",
  unique_birth_instant_missing: "出生瞬时点未锁定",
  manual_direction_required: "需要显式顺逆",
  manual_direction_not_allowed: "不允许覆盖顺逆",
  calculation_failed: "计算失败"
} as const;

function ComponentUnavailable({ component }: {
  component: Extract<RevisionDerivedReplayComponent<unknown>, { status: "unavailable" }>;
}) {
  return (
    <div className="derived-replay-component derived-replay-component--unavailable">
      <StatusPill tone="warning">{unavailableCodeLabels[component.code]}</StatusPill>
      <p>{component.reason}</p>
    </div>
  );
}

function RelationsProjection({ projection }: { projection: RevisionDerivedReplayProjection }) {
  const component = projection.relations;
  return (
    <article className="derived-replay-module">
      <header><h3>干支关系</h3><small>显式关系执行器</small></header>
      {component.status === "projected" ? <>
        <strong>{component.result.facts.length} 条关系事实</strong>
        <p className="mono" title={component.resultDigest}>摘要 {component.resultDigest}</p>
        <small>{component.executorId}</small>
      </> : <ComponentUnavailable component={component} />}
    </article>
  );
}

function LuckProjection({ projection }: { projection: RevisionDerivedReplayProjection }) {
  const component = projection.luckCycle;
  return (
    <article className="derived-replay-module">
      <header><h3>起运与大运</h3><small>冻结规则快照</small></header>
      {component.status === "projected" ? <>
        <strong>{component.result.direction.value === "forward" ? "顺行" : "逆行"} · {component.result.decades.length} 柱</strong>
        <p className="mono" title={component.resultDigest}>摘要 {component.resultDigest}</p>
        <small>{component.executorId}</small>
      </> : <ComponentUnavailable component={component} />}
    </article>
  );
}

function TransitProjection({ component }: { component: RevisionTransitReplayComponent }) {
  const resolvedCount = component.status === "projected"
    ? Object.values(component.result.slots).filter((slot) => slot.status === "resolved").length
    : 0;
  return (
    <article className="derived-replay-module">
      <header><h3>运限切片</h3><small>指定瞬时点</small></header>
      {component.status === "projected" ? <>
        <strong>{resolvedCount}/6 层已解析</strong>
        <p className="mono" title={component.resultDigest}>摘要 {component.resultDigest}</p>
        <small>{component.executorId}</small>
      </> : component.status === "not_requested" ? (
        <div className="derived-replay-component"><StatusPill tone="neutral">未请求</StatusPill><p>{component.reason}</p></div>
      ) : <ComponentUnavailable component={component} />}
    </article>
  );
}

export function RevisionDerivedReplayPanel({ revision, atInstant, routeManualDirection, onSaveSnapshot }: Props) {
  const [manualDirection, setManualDirection] = useState<LuckDirection | "">(
    revision.input.sex === "unspecified" ? routeManualDirection ?? "" : ""
  );
  const [projection, setProjection] = useState<RevisionDerivedReplayProjection | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const runGeneration = useRef(0);

  useEffect(() => {
    const generation = ++runGeneration.current;
    setProjection(null);
    setError(null);
    setSaving(false);
    setSaveMessage(null);
    setSaveError(null);
    setRunning(false);
    setManualDirection(revision.input.sex === "unspecified" ? routeManualDirection ?? "" : "");
    return () => {
      if (runGeneration.current === generation) runGeneration.current += 1;
    };
  }, [atInstant, revision, routeManualDirection]);

  const runProjection = async () => {
    const generation = ++runGeneration.current;
    setRunning(true);
    setProjection(null);
    setError(null);
    try {
      const {
        CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE,
        replayRevisionDerivedProjection
      } = await import("@hakimi/revision-replay");
      const replayAtInstant = atInstant ? new Date(atInstant).toISOString() : null;
      const nextProjection = await replayRevisionDerivedProjection(revision, {
        profile: CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE,
        ...(replayAtInstant ? { atInstant: replayAtInstant } : {}),
        ...(manualDirection ? { manualDirection } : {})
      });
      if (generation === runGeneration.current) setProjection(nextProjection);
    } catch (reason) {
      if (generation === runGeneration.current) {
        setError(reason instanceof Error ? reason.message : "显式版本派生失败。");
      }
    } finally {
      if (generation === runGeneration.current) setRunning(false);
    }
  };

  const changeManualDirection = (next: LuckDirection | "") => {
    runGeneration.current += 1;
    setRunning(false);
    setProjection(null);
    setError(null);
    setSaveMessage(null);
    setSaveError(null);
    setManualDirection(next);
  };

  const saveProjection = async () => {
    if (!projection || !onSaveSnapshot) return;
    const generation = runGeneration.current;
    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);
    try {
      const status = await onSaveSnapshot({
        profile: projection.profile,
        ...(projection.request.atInstant ? { atInstant: projection.request.atInstant } : {}),
        ...(projection.request.manualDirection ? { manualDirection: projection.request.manualDirection } : {})
      });
      if (generation === runGeneration.current) {
        setSaveMessage(status === "saved" ? "计算快照已追加到历史收据。" : "相同计算请求已保存，未创建重复收据。");
      }
    } catch (reason) {
      if (generation === runGeneration.current) {
        setSaveError(reason instanceof Error ? reason.message : "计算快照未能保存。");
      }
    } finally {
      if (generation === runGeneration.current) setSaving(false);
    }
  };

  return (
    <section className="flat-section revision-replay-panel derived-replay-panel" aria-labelledby="derived-replay-title">
      <div className="section-heading-row">
        <div><p className="eyebrow">Explicit executor derivation</p><h2 id="derived-replay-title">显式版本派生投影</h2></div>
        <StatusPill tone={projection?.status === "complete" ? "jade" : "warning"}>{projection ? projection.status === "complete" ? "投影完整" : "部分投影" : "不冒充旧输出"}</StatusPill>
      </div>
      <p className="revision-replay-copy">旧 Revision 没有保存当时的关系、起运和 Transit 输出及执行器绑定，因此这里不会声称“与旧输出一致”。系统会先证明本命盘精确复演一致，再使用页面明确列出的保留执行器生成零写入投影。</p>
      <dl className="metadata-list derived-replay-request">
        <div><dt>源 Revision</dt><dd>R{revision.revisionNumber} · 只读</dd></div>
        <div><dt>Transit 目标</dt><dd>{atInstant ?? "未请求；可从运限页带入目标时刻"}</dd></div>
        <div><dt>历史输出比对</dt><dd>{onSaveSnapshot ? "本次投影尚未保存；历史收据见上方" : "否 · 仅显式版本派生"}</dd></div>
      </dl>
      {revision.input.sex === "unspecified" ? (
        <label className="field derived-replay-direction">
          <span>起运顺逆</span>
          <select aria-label="起运顺逆" value={manualDirection} onChange={(event) => changeManualDirection(event.target.value as LuckDirection | "")}>
            <option value="">不猜测</option>
            <option value="forward">顺行</option>
            <option value="backward">逆行</option>
          </select>
          <small>性别未指定时必须人工选择；留空会失败关闭。</small>
        </label>
      ) : null}
      <button type="button" className="secondary-action" disabled={running} onClick={runProjection}>
        <RotateCcw aria-hidden="true" />{running ? "正在生成只读投影…" : "生成显式版本派生投影"}
      </button>
      {error ? <div className="inline-error" role="alert"><strong>派生未完成</strong><p>{error}</p></div> : null}
      {projection ? <>
        <div className="derived-replay-grid">
          <RelationsProjection projection={projection} />
          <LuckProjection projection={projection} />
          <TransitProjection component={projection.transit} />
        </div>
        <div className={`revision-replay-result ${projection.status === "complete" ? "revision-replay-result--matched" : ""}`} role="status">
          <strong>{projection.status === "complete" ? "投影完成，源 Revision 未改写" : "部分模块未能派生，源 Revision 未改写"}</strong>
          <p>Profile {projection.profile.profileId}；投影摘要 <span className="mono">{projection.projectionDigest}</span>。</p>
        </div>
        {onSaveSnapshot && (projection.request.atInstant || projection.request.manualDirection) ? (
          <div className="derived-replay-save">
            <button type="button" className="primary-action" disabled={saving} onClick={saveProjection}>
              {saving ? "正在重新计算并保存…" : "保存此计算快照"}
            </button>
            <small>保存时由仓储重新计算并生成只追加收据，不直接写入页面内存中的投影。</small>
          </div>
        ) : null}
        {saveMessage ? <p className="derived-replay-save-message" role="status">{saveMessage}</p> : null}
        {saveError ? <div className="inline-error" role="alert"><strong>计算快照未保存</strong><p>{saveError}</p></div> : null}
      </> : null}
    </section>
  );
}
