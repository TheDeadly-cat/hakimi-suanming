import { ArrowRight, CheckCircle2, RefreshCw, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import type {
  DstDisambiguationPolicy,
  EventRecord,
  EventTimeMigrationEndpoint,
  EventTimeMigrationInterpretation,
  EventTimeMigrationReceipt
} from "@hakimi/contracts";
import {
  RUNTIME_TIME_ZONE_DATABASE,
  preflightCivilMinute,
  type CivilMinutePreflight
} from "@hakimi/time-core";
import { formatDateTime, shortHash } from "../lib/format";
import { AppLink } from "../lib/router";
import { StatusPill } from "./status-pill";

export type MinutePreviewState =
  | { status: "empty" }
  | { status: "ready"; value: CivilMinutePreflight }
  | { status: "error"; message: string };

export type EventTimeMigrationResult = {
  source: EventRecord;
  target: EventRecord;
  receipt: EventTimeMigrationReceipt;
};

type MigrationState =
  | { status: "idle"; message: null; result: null }
  | { status: "busy"; message: null; result: null }
  | { status: "error"; message: string; result: null }
  | { status: "success"; message: null; result: EventTimeMigrationResult };

const initialMigrationState: MigrationState = { status: "idle", message: null, result: null };

const precisionLabels: Record<EventRecord["datePrecision"], string> = {
  year: "年",
  month: "月",
  day: "日",
  minute: "分钟",
  unknown: "未知"
};

export function previewCivilMinute(localDateTime: string, timeZone: string): MinutePreviewState {
  if (!localDateTime || !timeZone.trim()) return { status: "empty" };
  try {
    return { status: "ready", value: preflightCivilMinute({ localDateTime, timeZone: timeZone.trim() }) };
  } catch (reason) {
    return { status: "error", message: reason instanceof Error ? reason.message : "无法解析事件时间。" };
  }
}

export function minuteBoundaryCanSave(
  preview: MinutePreviewState,
  policy: DstDisambiguationPolicy,
  required: boolean
): boolean {
  if (!required && preview.status === "empty") return true;
  if (preview.status !== "ready" || preview.value.kind === "gap") return false;
  return preview.value.kind === "unique" || policy === "earlier" || policy === "later";
}

function selectedMinuteCandidate(preview: MinutePreviewState, policy: DstDisambiguationPolicy) {
  if (preview.status !== "ready" || preview.value.kind === "gap") return null;
  if (preview.value.kind === "unique") return preview.value.candidates[0] ?? null;
  return preview.value.candidates.find((candidate) => candidate.choice === policy) ?? null;
}

export function MinuteBoundaryPreview({
  label,
  name,
  preview,
  disambiguation,
  disabled = false,
  onDisambiguationChange
}: {
  label: string;
  name: string;
  preview: MinutePreviewState;
  disambiguation: DstDisambiguationPolicy;
  disabled?: boolean;
  onDisambiguationChange: (policy: DstDisambiguationPolicy) => void;
}) {
  if (preview.status === "empty") return <p className="event-time-hint">填写{label}民用分钟后显示 UTC 预览。</p>;
  if (preview.status === "error") return <p className="event-time-error" role="alert">{preview.message}</p>;
  if (preview.value.kind === "gap") {
    return <div className="event-time-error" role="alert"><strong>{label}时间落在 DST 空档</strong><p>此民用分钟不存在，不能保存，也不会自动平移。</p></div>;
  }
  if (preview.value.kind === "unique") {
    const candidate = preview.value.candidates[0];
    return <div className="event-time-preview" role="status"><strong>{label}时间唯一</strong><span>UTC 偏移 {candidate.utcOffset}</span><span>标准 UTC {candidate.instant}</span></div>;
  }
  return (
    <fieldset className="event-time-overlap" disabled={disabled}>
      <legend>{label}时间出现 DST 重叠，请明确选择</legend>
      {preview.value.candidates.map((candidate) => (
        <label key={candidate.choice}>
          <input
            type="radio"
            name={name}
            value={candidate.choice}
            checked={disambiguation === candidate.choice}
            onChange={() => onDisambiguationChange(candidate.choice as DstDisambiguationPolicy)}
          />
          <span><strong>{candidate.choice === "earlier" ? "较早瞬时点" : "较晚瞬时点"}</strong><small>UTC 偏移 {candidate.utcOffset} · {candidate.instant}</small></span>
        </label>
      ))}
      {disambiguation === "reject" ? <p className="event-time-warning" role="alert">尚未选择 earlier / later，不能保存。</p> : null}
    </fieldset>
  );
}

function sameInterpretation(
  left: EventTimeMigrationInterpretation,
  right: EventTimeMigrationInterpretation
): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === "calendar_date" || right.kind === "calendar_date") return true;
  return left.timeZone === right.timeZone &&
    left.startDisambiguation === right.startDisambiguation &&
    left.endDisambiguation === right.endDisambiguation;
}

function timeContextLabel(snapshot: EventTimeMigrationEndpoint["snapshot"]): string {
  if (snapshot.timeContext.kind === "legacy_floating") return "旧版悬空时间";
  if (snapshot.timeContext.kind === "calendar_date") return "日历日期";
  return `${snapshot.timeContext.timeZone} · ${snapshot.timeContext.timeZoneDatabase
    ? `IANA ${snapshot.timeContext.timeZoneDatabase.ianaVersion}`
    : snapshot.timeContext.tzdbVersion}`;
}

function EventTimeMigrationEndpointDetails({
  endpoint,
  side,
  href
}: {
  endpoint: EventTimeMigrationEndpoint;
  side: "source" | "target";
  href: string;
}) {
  const { snapshot } = endpoint;
  const zoned = snapshot.timeContext.kind === "zoned_minute" ? snapshot.timeContext : null;
  return (
    <section aria-label={side === "source" ? "源事件时间快照" : "目标事件时间快照"}>
      <p className="eyebrow">{side === "source" ? "Source · 保留旧事件" : "Target · 并列新事件"}</p>
      <strong>{timeContextLabel(snapshot)}</strong>
      <dl>
        <div><dt>事件 ID</dt><dd><AppLink href={href} aria-label={`打开${side === "source" ? "源" : "派生"}事件 ${endpoint.recordId}`}><code>{endpoint.recordId}</code><ArrowRight aria-hidden="true" /></AppLink></dd></div>
        <div><dt>快照摘要</dt><dd><code title={endpoint.snapshotDigest}>{shortHash(endpoint.snapshotDigest)}</code></dd></div>
        <div><dt>冻结 caseId</dt><dd><code>{snapshot.caseId}</code></dd></div>
        <div><dt>冻结 revisionId</dt><dd><code>{snapshot.revisionId ?? "候选组级 · null"}</code></dd></div>
        <div className="event-time-migration-lineage">
          <dt>冻结运限引用</dt>
          <dd>
            {snapshot.transitNodeRef ? (
              <span>
                <code>namespace={snapshot.transitNodeRef.namespace}</code>
                <code>nodeType={snapshot.transitNodeRef.nodeType}</code>
                <code>nodeId={snapshot.transitNodeRef.nodeId}</code>
              </span>
            ) : "未绑定 · null"}
          </dd>
        </div>
        <div><dt>日期精度</dt><dd>{precisionLabels[snapshot.datePrecision]}</dd></div>
        <div><dt>起始墙钟</dt><dd><code>{snapshot.startDate ?? "不适用"}</code></dd></div>
        <div><dt>结束墙钟</dt><dd><code>{snapshot.endDate ?? "未记录"}</code></dd></div>
        {zoned ? <>
          <div><dt>tzdb</dt><dd><code>{zoned.tzdbVersion}</code></dd></div>
          <div><dt>起始解析</dt><dd><code>{zoned.start.resolution.selectedCandidate.utcOffset} · {zoned.start.canonicalUtc}{zoned.start.resolution.kind === "overlap" ? ` · ${zoned.start.resolution.selectedCandidate.choice}` : ""}</code></dd></div>
          {zoned.end ? <div><dt>结束解析</dt><dd><code>{zoned.end.resolution.selectedCandidate.utcOffset} · {zoned.end.canonicalUtc}{zoned.end.resolution.kind === "overlap" ? ` · ${zoned.end.resolution.selectedCandidate.choice}` : ""}</code></dd></div> : null}
        </> : null}
      </dl>
    </section>
  );
}

export function EventTimeMigrationReceiptDetails({
  receipt,
  currentEventId,
  buildEventHref
}: {
  receipt: EventTimeMigrationReceipt;
  currentEventId: string;
  buildEventHref: (endpoint: EventTimeMigrationEndpoint) => string;
}) {
  const titleId = `event-time-receipt-${currentEventId}-${receipt.id}`;
  return (
    <article className="event-time-migration-receipt" aria-labelledby={titleId}>
      <header>
        <div>
          <p className="eyebrow">Migration receipt · {formatDateTime(receipt.createdAt)}</p>
          <h4 id={titleId}>事件时间迁移凭证</h4>
        </div>
        <StatusPill tone="info">显式用户确认</StatusPill>
      </header>
      <div className="event-time-migration-endpoints">
        <EventTimeMigrationEndpointDetails endpoint={receipt.source} side="source" href={buildEventHref(receipt.source)} />
        <EventTimeMigrationEndpointDetails endpoint={receipt.target} side="target" href={buildEventHref(receipt.target)} />
      </div>
      <footer>
        <span>凭证 <code>{receipt.id}</code></span>
        <span>关系：{receipt.source.snapshot.timeContext.kind} → {receipt.target.snapshot.timeContext.kind}</span>
      </footer>
    </article>
  );
}

export function EventTimeMigrationRelations({
  receipts,
  currentEventId,
  buildEventHref
}: {
  receipts: EventTimeMigrationReceipt[];
  currentEventId: string;
  buildEventHref: (endpoint: EventTimeMigrationEndpoint) => string;
}) {
  if (receipts.length === 0) return null;
  return (
    <aside className="event-time-migration-relations" aria-label="事件时间迁移关系">
      <strong>时间迁移关系 · {receipts.length} 条凭证</strong>
      <ul>
        {receipts.map((receipt) => {
          const isSource = receipt.source.recordId === currentEventId;
          const counterpart = isSource ? receipt.target : receipt.source;
          return (
            <li key={receipt.id}>
              <span>{isSource ? "派生目标" : "派生自旧事件"}</span>
              <AppLink href={buildEventHref(counterpart)} aria-label={`打开${isSource ? "派生" : "源"}事件 ${counterpart.recordId}`}>
                <code>{counterpart.recordId}</code><ArrowRight aria-hidden="true" />
              </AppLink>
              <small>凭证 {receipt.id} · {timeContextLabel(counterpart.snapshot)}</small>
              <details className="event-time-migration-relation-receipt">
                <summary>展开完整迁移凭证</summary>
                <EventTimeMigrationReceiptDetails
                  receipt={receipt}
                  currentEventId={currentEventId}
                  buildEventHref={buildEventHref}
                />
              </details>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

export function EventTimeMigrationPanel({
  source,
  defaultTimeZone,
  existingReceipts,
  buildEventHref,
  derive,
  onDerived,
  onCancel
}: {
  source: EventRecord;
  defaultTimeZone: string;
  existingReceipts: EventTimeMigrationReceipt[];
  buildEventHref: (endpoint: EventTimeMigrationEndpoint) => string;
  derive: (interpretation: EventTimeMigrationInterpretation) => Promise<EventTimeMigrationResult>;
  onDerived: (result: EventTimeMigrationResult) => void;
  onCancel: () => void;
}) {
  const panelId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const [timeZone, setTimeZone] = useState(defaultTimeZone);
  const [startDisambiguation, setStartDisambiguation] = useState<DstDisambiguationPolicy>("reject");
  const [endDisambiguation, setEndDisambiguation] = useState<DstDisambiguationPolicy>("reject");
  const [confirmed, setConfirmed] = useState(false);
  const [state, setState] = useState<MigrationState>(initialMigrationState);
  const isMinute = source.datePrecision === "minute";
  const busy = state.status === "busy";

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      headingRef.current?.focus();
      headingRef.current?.scrollIntoView?.({ block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (state.status !== "success") return;
    successRef.current?.focus();
    successRef.current?.scrollIntoView?.({ block: "center" });
  }, [state.status]);

  const startPreview = useMemo(
    () => isMinute ? previewCivilMinute(source.startDate ?? "", timeZone) : { status: "empty" } as MinutePreviewState,
    [isMinute, source.startDate, timeZone]
  );
  const endPreview = useMemo(
    () => isMinute && source.endDate ? previewCivilMinute(source.endDate, timeZone) : { status: "empty" } as MinutePreviewState,
    [isMinute, source.endDate, timeZone]
  );
  const startCandidate = selectedMinuteCandidate(startPreview, startDisambiguation);
  const endCandidate = selectedMinuteCandidate(endPreview, endDisambiguation);
  const rangeInvalid = Boolean(startCandidate && endCandidate && endCandidate.instant < startCandidate.instant);
  const minuteReady = !isMinute || (
    timeZone.trim().length > 0 &&
    minuteBoundaryCanSave(startPreview, startDisambiguation, true) &&
    minuteBoundaryCanSave(endPreview, endDisambiguation, Boolean(source.endDate)) &&
    !rangeInvalid
  );

  const interpretation = useMemo<EventTimeMigrationInterpretation>(() => isMinute
    ? {
        kind: "zoned_minute",
        timeZone: timeZone.trim(),
        startDisambiguation,
        endDisambiguation: source.endDate ? endDisambiguation : null
      }
    : { kind: "calendar_date" }, [endDisambiguation, isMinute, source.endDate, startDisambiguation, timeZone]);
  const duplicateReceipt = existingReceipts.find((receipt) =>
    receipt.source.recordId === source.id && sameInterpretation(receipt.interpretation, interpretation)
  ) ?? null;

  const resetAuthorization = () => {
    setConfirmed(false);
    if (state.status === "error") setState(initialMigrationState);
  };
  const changeTimeZone = (value: string) => {
    setTimeZone(value);
    setStartDisambiguation("reject");
    setEndDisambiguation("reject");
    resetAuthorization();
  };
  const changeStartDisambiguation = (value: DstDisambiguationPolicy) => {
    setStartDisambiguation(value);
    resetAuthorization();
  };
  const changeEndDisambiguation = (value: DstDisambiguationPolicy) => {
    setEndDisambiguation(value);
    resetAuthorization();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!confirmed || !minuteReady || duplicateReceipt || busy || state.status === "success") return;
    setState({ status: "busy", message: null, result: null });
    try {
      const result = await derive(interpretation);
      setConfirmed(false);
      setState({ status: "success", message: null, result });
      onDerived(result);
    } catch (reason) {
      setState({
        status: "error",
        message: reason instanceof Error ? reason.message : "没有生成并列事件。",
        result: null
      });
    }
  };

  const beginAnotherInterpretation = () => {
    setConfirmed(false);
    setState(initialMigrationState);
    window.requestAnimationFrame(() => headingRef.current?.focus());
  };

  const confirmationDetail = isMinute
    ? [
        `我确认把旧墙钟时间按 ${timeZone.trim() || "尚未选择的 IANA 时区"} 解释。`,
        startCandidate ? `起始 ${source.startDate} → ${startCandidate.utcOffset} · ${startCandidate.instant}${startCandidate.choice === "unique" ? "" : ` · ${startCandidate.choice}`}。` : "起始时间尚未完成解析。",
        source.endDate
          ? endCandidate ? `结束 ${source.endDate} → ${endCandidate.utcOffset} · ${endCandidate.instant}${endCandidate.choice === "unique" ? "" : ` · ${endCandidate.choice}`}。` : "结束时间尚未完成解析。"
          : "没有结束时间。"
      ].join(" ")
    : `我确认保留原${precisionLabels[source.datePrecision]}精度与起止日期，派生为 calendar_date；不引入 IANA 时区、DST 或标准 UTC。`;

  return (
    <section
      className="event-time-migration-panel"
      aria-labelledby={`${panelId}-title`}
      aria-busy={busy}
    >
      <header>
        <div>
          <p className="eyebrow">Explicit time derivation</p>
          <h3 id={`${panelId}-title`} ref={headingRef} tabIndex={-1}>解释旧事件时间</h3>
          <p>只创建并列的新事件和可核验凭证；旧 ID、旧时间和原记录不会被覆盖。</p>
        </div>
        <StatusPill tone="warning">旧记录保持只读</StatusPill>
      </header>

      <dl className="event-time-migration-source" aria-label="旧事件只读时间摘要">
        <div><dt>源事件</dt><dd><code>{source.id}</code></dd></div>
        <div><dt>日期精度</dt><dd>{precisionLabels[source.datePrecision]}</dd></div>
        <div><dt>起始墙钟</dt><dd><code>{source.startDate ?? "不适用"}</code></dd></div>
        <div><dt>结束墙钟</dt><dd><code>{source.endDate ?? "未记录"}</code></dd></div>
      </dl>

      {state.status === "success" ? (
        <>
          <div ref={successRef} className="event-time-migration-success" role="status" tabIndex={-1}>
            <CheckCircle2 aria-hidden="true" />
            <div>
              <strong>新事件和时间迁移凭证已生成，旧事件未改写</strong>
              <p>新事件 ID：<code>{state.result.target.id}</code></p>
              <AppLink className="secondary-action" href={buildEventHref(state.result.receipt.target)}>
                打开派生事件 <ArrowRight aria-hidden="true" />
              </AppLink>
            </div>
          </div>
          <EventTimeMigrationReceiptDetails
            receipt={state.result.receipt}
            currentEventId={source.id}
            buildEventHref={buildEventHref}
          />
          <div className="event-time-migration-actions">
            {isMinute ? (
              <button
                type="button"
                className="secondary-action"
                onClick={beginAnotherInterpretation}
              >
                <RefreshCw aria-hidden="true" />创建另一种时间解释
              </button>
            ) : null}
            <button type="button" className="secondary-action" onClick={onCancel}><X aria-hidden="true" />完成</button>
          </div>
        </>
      ) : (
        <form onSubmit={submit}>
          {isMinute ? (
            <div className="event-time-migration-resolution">
              <label className="field">
                <span>事件发生地时区（IANA） <em>必填</em></span>
                <input
                  list={`${panelId}-time-zone-suggestions`}
                  value={timeZone}
                  disabled={busy}
                  aria-invalid={startPreview.status === "error" || endPreview.status === "error"}
                  aria-describedby={`${panelId}-time-zone-hint`}
                  onChange={(event) => changeTimeZone(event.currentTarget.value)}
                  autoComplete="off"
                />
              </label>
              <datalist id={`${panelId}-time-zone-suggestions`}><option value="Asia/Shanghai" /><option value="Asia/Hong_Kong" /><option value="Asia/Taipei" /><option value="America/New_York" /><option value="Europe/London" /></datalist>
              <p id={`${panelId}-time-zone-hint`} className="event-time-hint">
                默认带入研究对象时区，但必须按事件发生地复核。目标将绑定 IANA {RUNTIME_TIME_ZONE_DATABASE.ianaVersion} 固定快照。
              </p>
              <MinuteBoundaryPreview
                label="起始"
                name={`${panelId}-start-disambiguation-${source.id}`}
                preview={startPreview}
                disambiguation={startDisambiguation}
                disabled={busy}
                onDisambiguationChange={changeStartDisambiguation}
              />
              {source.endDate ? (
                <MinuteBoundaryPreview
                  label="结束"
                  name={`${panelId}-end-disambiguation-${source.id}`}
                  preview={endPreview}
                  disambiguation={endDisambiguation}
                  disabled={busy}
                  onDisambiguationChange={changeEndDisambiguation}
                />
              ) : null}
              {rangeInvalid ? <div className="event-time-error" role="alert"><strong>事件时间范围无效</strong><p>按当前 DST 选择解析后，结束 UTC 早于起始 UTC。</p></div> : null}
            </div>
          ) : (
            <div className="event-time-calendar-derivation" role="note">
              <StatusPill tone="info">派生为 calendar_date</StatusPill>
              <p>原日期精度与起止值保持不变；日历日期不适用 IANA 时区、DST、UTC 偏移或标准 UTC。</p>
            </div>
          )}

          {duplicateReceipt ? (
            <div className="event-time-migration-existing" role="status">
              <CheckCircle2 aria-hidden="true" />
              <div>
                <strong>这一时间解释已有并列事件</strong>
                <p>不会重复生成完全相同的解释；可打开现有目标，或修改分钟时区/DST 选择。</p>
                <AppLink className="secondary-action" href={buildEventHref(duplicateReceipt.target)}>
                  打开已有派生事件 <ArrowRight aria-hidden="true" />
                </AppLink>
              </div>
            </div>
          ) : null}

          <label className="event-time-migration-confirm">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={!minuteReady || busy || Boolean(duplicateReceipt)}
              onChange={(event) => setConfirmed(event.currentTarget.checked)}
            />
            <span>
              <strong>保留旧事件并生成新 ID</strong>
              <small>{confirmationDetail}</small>
            </span>
          </label>

          <div className="event-time-migration-actions">
            <button
              type="submit"
              className="primary-action"
              disabled={!confirmed || !minuteReady || busy || Boolean(duplicateReceipt)}
            >
              <RefreshCw className={busy ? "is-spinning" : undefined} aria-hidden="true" />
              {busy ? "正在生成并列事件…" : "生成并列事件"}
            </button>
            <button type="button" className="secondary-action" disabled={busy} onClick={onCancel}><X aria-hidden="true" />取消</button>
          </div>
          {busy ? <p className="event-time-migration-progress" role="status">正在核验源事件并生成新 ID 与时间迁移凭证。</p> : null}
          {state.status === "error" ? <div className="event-time-migration-failure" role="alert"><strong>没有生成并列事件</strong><p>{state.message}</p></div> : null}
        </form>
      )}
    </section>
  );
}
