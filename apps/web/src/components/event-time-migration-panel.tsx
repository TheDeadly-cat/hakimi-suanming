import { ArrowRight, CheckCircle2, Fingerprint, RefreshCw, X } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type {
  DstDisambiguationPolicy,
  EventRecord,
  EventTimeMigrationEndpoint,
  EventTimeMigrationInterpretation,
  EventTimeMigrationReceipt
} from "@hakimi/contracts";
import { eventRecordSchema, eventTimeMigrationReceiptSchema } from "@hakimi/contracts";
import {
  RUNTIME_TIME_ZONE_DATABASE,
  preflightCivilMinute,
  type CivilMinutePreflight
} from "@hakimi/time-core";
import { formatDateTime, shortHash } from "../lib/format";
import { AppLink } from "../lib/router";
import { StatusPill } from "./status-pill";
import "./event-time-migration.css";
import "./event-time-migration-panel-polish.css";

export type MinutePreviewState =
  | { status: "empty" }
  | { status: "ready"; value: CivilMinutePreflight }
  | { status: "error"; message: string };

export type EventTimeMigrationResult = {
  source: EventRecord;
  target: EventRecord;
  receipt: EventTimeMigrationReceipt;
};

export type EventTimeMigrationReconciledResult = Readonly<{
  result: EventTimeMigrationResult;
  submissionToken: object;
}>;

export type ReconcileEventTimeMigrationResult = (
  result: EventTimeMigrationResult
) => EventTimeMigrationReconciledResult;

export type EventTimeMigrationDeriveFailureCertainty = "not_started" | "call_unknown";

export class EventTimeMigrationDeriveError extends Error {
  constructor(
    public readonly certainty: EventTimeMigrationDeriveFailureCertainty,
    message: string
  ) {
    super(message);
    this.name = "EventTimeMigrationDeriveError";
  }
}

type MigrationState =
  | { status: "idle"; message: null; result: null }
  | { status: "busy"; message: null; result: null }
  | { status: "failed"; message: string; result: null }
  | {
      status: "commit_pending";
      certainty: "call_unknown" | "returned_unreconciled";
      message: string;
      result: null;
    }
  | { status: "success"; message: string | null; result: EventTimeMigrationResult };

const initialMigrationState: MigrationState = { status: "idle", message: null, result: null };

const precisionLabels: Record<EventRecord["datePrecision"], string> = {
  year: "年",
  month: "月",
  day: "日",
  minute: "分钟",
  unknown: "未知"
};
const unsafeVisibleTextPattern = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/gu;
const sensitiveCredentialPattern = /\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|bearer|secret)\b(?:\s*[:=]\s*|\s+)[^\s,;]+/giu;
const visibleUrlPattern = /\b(?:https?|file):\/\/[^\s"'<>]+/giu;
const localWindowsPathPattern = /(?:[a-z]:\\|\\\\)[^\s"'<>]+/giu;
const localUserPathPattern = /\/(?:users|home)\/[^\s"'<>]+/giu;
const stackTracePattern = /\bstack\s*trace\b.*$/iu;
export const EVENT_TIME_MIGRATION_RECEIPT_LIMIT = 512;
const MAX_MIGRATION_RECEIPTS = EVENT_TIME_MIGRATION_RECEIPT_LIMIT;
const MAX_VISIBLE_DIAGNOSTIC_IDS = 12;
const MAX_CIVIL_MINUTE_INPUT_LENGTH = 64;
const MAX_TIME_ZONE_INPUT_LENGTH = 128;
const INITIAL_VISIBLE_RELATION_COUNT = 12;
const VISIBLE_RELATION_STEP = 12;

function takeCodePoints(value: string, maxCodePoints: number): string {
  let result = "";
  let count = 0;
  for (const character of value) {
    if (count >= maxCodePoints) break;
    result += character;
    count += 1;
  }
  return result;
}

function safeVisibleText(value: unknown, fallback: string, maxCodePoints = 600): string {
  if (typeof value !== "string") return fallback;
  const safeMaxCodePoints = Math.max(1, Math.min(maxCodePoints, 2_000));
  const normalized = takeCodePoints(value, Math.max(safeMaxCodePoints * 8, 4_096))
    .replace(unsafeVisibleTextPattern, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return takeCodePoints(normalized, safeMaxCodePoints) || fallback;
}

function errorMessage(reason: unknown, fallback: string): string {
  try {
    const message = safeVisibleText(reason instanceof Error ? reason.message : "", fallback, 240);
    return message
      .replace(sensitiveCredentialPattern, "[凭据已隐藏]")
      .replace(visibleUrlPattern, "[链接已隐藏]")
      .replace(localWindowsPathPattern, "[本地路径已隐藏]")
      .replace(localUserPathPattern, "[本地路径已隐藏]")
      .replace(stackTracePattern, "[调用栈已隐藏]");
  } catch {
    return fallback;
  }
}

function displayIdentifier(value: unknown): string {
  const normalized = safeVisibleText(value, "不可显示", 512);
  const characters = Array.from(normalized);
  return characters.length <= 96
    ? characters.join("")
    : `${characters.slice(0, 48).join("")}…${characters.slice(-32).join("")}`;
}

function summarizeDiagnosticIds(values: readonly string[]): { visible: string; omitted: number } {
  const visibleValues = values.slice(0, MAX_VISIBLE_DIAGNOSTIC_IDS).map(displayIdentifier);
  return {
    visible: visibleValues.join(" · "),
    omitted: Math.max(0, values.length - visibleValues.length)
  };
}

function precisionLabel(value: unknown): string {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(precisionLabels, value)
    ? precisionLabels[value as keyof typeof precisionLabels]
    : "精度不可识别";
}

type ReceiptIndexValidation =
  | { ok: true; receipts: EventTimeMigrationReceipt[]; issue: null }
  | { ok: false; receipts: EventTimeMigrationReceipt[]; issue: string };

function validateMigrationReceiptIndex(value: unknown): ReceiptIndexValidation {
  if (!Array.isArray(value)) {
    return { ok: false, receipts: [], issue: "迁移凭证索引不是列表，已关闭关联与新迁移。" };
  }
  if (value.length > MAX_MIGRATION_RECEIPTS) {
    return {
      ok: false,
      receipts: [],
      issue: `迁移凭证索引包含 ${value.length} 条记录，超过当前 ${MAX_MIGRATION_RECEIPTS} 条的安全处理上限，已关闭关联与新迁移。`
    };
  }
  const receipts: EventTimeMigrationReceipt[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const parsed = eventTimeMigrationReceiptSchema.safeParse(value[index]);
    if (!parsed.success) {
      return { ok: false, receipts: [], issue: `迁移凭证索引第 ${index + 1} 条记录未通过当前严格契约，已关闭关联与新迁移。` };
    }
    receipts.push(parsed.data);
  }
  return { ok: true, receipts, issue: null };
}

export function previewCivilMinute(localDateTime: string, timeZone: string): MinutePreviewState {
  if (!localDateTime || !timeZone.trim()) return { status: "empty" };
  if (localDateTime.length > MAX_CIVIL_MINUTE_INPUT_LENGTH) {
    return { status: "error", message: "民用分钟输入超过安全解析长度，不能预检。" };
  }
  if (timeZone.length > MAX_TIME_ZONE_INPUT_LENGTH) {
    return { status: "error", message: "IANA 时区输入超过安全解析长度，不能预检。" };
  }
  try {
    return { status: "ready", value: preflightCivilMinute({ localDateTime, timeZone: timeZone.trim() }) };
  } catch (reason) {
    return { status: "error", message: errorMessage(reason, "无法解析事件时间。") };
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
    if (!candidate) return <p className="event-time-error" role="alert">时间预检没有返回唯一候选，不能保存。</p>;
    return <div className="event-time-preview" role="status"><strong>{label}时间唯一</strong><span>UTC 偏移 {candidate.utcOffset}</span><span>标准 UTC {candidate.instant}</span></div>;
  }
  return (
    <fieldset className="event-time-overlap" disabled={disabled} data-disabled={disabled}>
      <legend>{label}时间出现 DST 重叠，请明确选择</legend>
      {preview.value.candidates.map((candidate) => (
        <label key={candidate.choice} data-selected={disambiguation === candidate.choice}>
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

function migrationEndpointMatchesRecord(
  endpoint: EventTimeMigrationEndpoint,
  record: EventRecord
): boolean {
  return endpoint.recordId === record.id
    && endpoint.snapshot.caseId === record.caseId
    && endpoint.snapshot.revisionId === record.revisionId
    && JSON.stringify(endpoint.snapshot.transitNodeRef) === JSON.stringify(record.transitNodeRef)
    && endpoint.snapshot.datePrecision === record.datePrecision
    && endpoint.snapshot.startDate === record.startDate
    && endpoint.snapshot.endDate === record.endDate
    && JSON.stringify(endpoint.snapshot.timeContext) === JSON.stringify(record.timeContext);
}

function duplicateReceiptIds(receipts: readonly EventTimeMigrationReceipt[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const receipt of receipts) {
    if (seen.has(receipt.id)) duplicates.add(receipt.id);
    seen.add(receipt.id);
  }
  return [...duplicates].sort();
}

function reconcileMigrationReceipts(
  existingReceipts: readonly EventTimeMigrationReceipt[],
  sessionReceipts: readonly EventTimeMigrationReceipt[]
): { receipts: EventTimeMigrationReceipt[]; conflictingIds: string[] } {
  const receiptsById = new Map<string, EventTimeMigrationReceipt>();
  const fingerprintsById = new Map<string, string>();
  const conflictingIds = new Set<string>();
  for (const receipt of [...existingReceipts, ...sessionReceipts]) {
    const fingerprint = JSON.stringify(receipt);
    const existingFingerprint = fingerprintsById.get(receipt.id);
    if (existingFingerprint !== undefined && existingFingerprint !== fingerprint) {
      conflictingIds.add(receipt.id);
      continue;
    }
    fingerprintsById.set(receipt.id, fingerprint);
    receiptsById.set(receipt.id, receipt);
  }
  return { receipts: [...receiptsById.values()], conflictingIds: [...conflictingIds].sort() };
}

function migrationReceiptEvidenceKey(receipts: readonly EventTimeMigrationReceipt[]): string {
  return JSON.stringify([...receipts].sort((left, right) => left.id.localeCompare(right.id)));
}

function assertMigrationResult(
  result: EventTimeMigrationResult,
  expectedSource: EventRecord,
  expectedInterpretation: EventTimeMigrationInterpretation,
  knownReceiptIds: ReadonlySet<string>
): EventTimeMigrationResult {
  if (!result || typeof result !== "object") {
    throw new Error("迁移端口没有返回可核对的结果对象。");
  }
  const parsedSource = eventRecordSchema.safeParse(result.source);
  const parsedTarget = eventRecordSchema.safeParse(result.target);
  const parsedReceipt = eventTimeMigrationReceiptSchema.safeParse(result.receipt);
  const parsedExpectedSource = eventRecordSchema.safeParse(expectedSource);
  if (!parsedSource.success || !parsedTarget.success || !parsedReceipt.success || !parsedExpectedSource.success) {
    throw new Error("迁移结果或当前源事件未通过严格事件/凭证契约。");
  }
  const verified = { source: parsedSource.data, target: parsedTarget.data, receipt: parsedReceipt.data };
  if (JSON.stringify(verified.source) !== JSON.stringify(parsedExpectedSource.data)) {
    throw new Error("迁移端口返回的源事件内容与提交前冻结源记录不同，已拒绝合并。");
  }
  if (verified.source.id !== expectedSource.id || verified.receipt.source.recordId !== expectedSource.id) {
    throw new Error("迁移结果没有绑定当前源事件，已拒绝显示。");
  }
  if (verified.target.id === expectedSource.id || verified.receipt.target.recordId !== verified.target.id) {
    throw new Error("迁移结果没有返回独立且一致的目标事件 ID，已拒绝显示。");
  }
  if (
    !migrationEndpointMatchesRecord(verified.receipt.source, verified.source)
    || !migrationEndpointMatchesRecord(verified.receipt.target, verified.target)
  ) {
    throw new Error("迁移凭证端点快照与返回的源事件或目标事件不一致，已拒绝显示。");
  }
  if (
    verified.target.caseId !== verified.source.caseId
    || verified.target.revisionId !== verified.source.revisionId
    || JSON.stringify(verified.target.transitNodeRef) !== JSON.stringify(verified.source.transitNodeRef)
  ) {
    throw new Error("派生目标改变了冻结的 Case、Revision 或运限父级绑定，已拒绝合并。");
  }
  if (
    verified.source.timeContext.kind !== "legacy_floating"
    || verified.target.datePrecision !== verified.source.datePrecision
    || verified.target.startDate !== verified.source.startDate
    || verified.target.endDate !== verified.source.endDate
  ) {
    throw new Error("迁移结果没有保留旧事件的悬空时间来源、日期精度或墙钟起止值，已拒绝合并。");
  }
  if (!sameInterpretation(verified.receipt.interpretation, expectedInterpretation)) {
    throw new Error("迁移凭证中的时间解释与本次明确提交不一致，已拒绝显示。");
  }
  if (
    (expectedInterpretation.kind === "calendar_date" && verified.target.timeContext.kind !== "calendar_date")
    || (
      expectedInterpretation.kind === "zoned_minute"
      && (
        verified.target.timeContext.kind !== "zoned_minute"
        || verified.target.timeContext.timeZone !== expectedInterpretation.timeZone
      )
    )
  ) {
    throw new Error("派生目标的时间语义未精确实现本次确认的 calendar_date 或 IANA 时区解释，已拒绝合并。");
  }
  if (knownReceiptIds.has(verified.receipt.id)) {
    throw new Error("迁移返回的 receiptId 与提交前已知凭证冲突，不能用新结果覆盖既有稳定键。");
  }
  return verified;
}

function timeContextLabel(snapshot: EventTimeMigrationEndpoint["snapshot"]): string {
  if (snapshot.timeContext.kind === "legacy_floating") return "旧版悬空时间";
  if (snapshot.timeContext.kind === "calendar_date") return "日历日期";
  if (snapshot.timeContext.kind === "zoned_minute") {
    return `${safeVisibleText(snapshot.timeContext.timeZone, "时区不可显示", 128)} · ${snapshot.timeContext.timeZoneDatabase
      ? `IANA ${safeVisibleText(snapshot.timeContext.timeZoneDatabase.ianaVersion, "版本不可显示", 80)}`
      : safeVisibleText(snapshot.timeContext.tzdbVersion, "版本不可显示", 80)}`;
  }
  return "时间语义不可识别";
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
    <section
      className="event-time-migration-endpoint"
      data-side={side}
      data-time-context={snapshot.timeContext.kind}
      aria-label={side === "source" ? "源事件时间快照" : "目标事件时间快照"}
    >
      <p className="eyebrow">{side === "source" ? "Source · 保留旧事件" : "Target · 并列新事件"}</p>
      <strong>{timeContextLabel(snapshot)}</strong>
      <dl>
        <div><dt>事件 ID</dt><dd><AppLink href={href} aria-label={`打开${side === "source" ? "源" : "派生"}事件 ${displayIdentifier(endpoint.recordId)}`}><code title={safeVisibleText(endpoint.recordId, "")}>{displayIdentifier(endpoint.recordId)}</code><ArrowRight aria-hidden="true" /></AppLink></dd></div>
        <div><dt>快照摘要</dt><dd><code title={endpoint.snapshotDigest}>{shortHash(endpoint.snapshotDigest)}</code></dd></div>
        <div><dt>冻结 caseId</dt><dd><code title={safeVisibleText(snapshot.caseId, "")}>{displayIdentifier(snapshot.caseId)}</code></dd></div>
        <div><dt>冻结 revisionId</dt><dd><code title={snapshot.revisionId ? safeVisibleText(snapshot.revisionId, "") : undefined}>{snapshot.revisionId ? displayIdentifier(snapshot.revisionId) : "候选组级 · null"}</code></dd></div>
        <div className="event-time-migration-lineage">
          <dt>冻结运限引用</dt>
          <dd>
            {snapshot.transitNodeRef ? (
              <span>
                <code>namespace={safeVisibleText(snapshot.transitNodeRef.namespace, "不可显示", 80)}</code>
                <code>nodeType={safeVisibleText(snapshot.transitNodeRef.nodeType, "不可显示", 80)}</code>
                <code>nodeId={displayIdentifier(snapshot.transitNodeRef.nodeId)}</code>
              </span>
            ) : "未绑定 · null"}
          </dd>
        </div>
        <div><dt>日期精度</dt><dd>{precisionLabel(snapshot.datePrecision)}</dd></div>
        <div><dt>起始墙钟</dt><dd><code>{snapshot.startDate ? safeVisibleText(snapshot.startDate, "不可显示", 128) : "不适用"}</code></dd></div>
        <div><dt>结束墙钟</dt><dd><code>{snapshot.endDate ? safeVisibleText(snapshot.endDate, "不可显示", 128) : "未记录"}</code></dd></div>
        {zoned ? <>
          <div><dt>tzdb</dt><dd><code>{safeVisibleText(zoned.tzdbVersion, "版本不可显示", 80)}</code></dd></div>
          <div><dt>起始解析</dt><dd><code>{safeVisibleText(zoned.start.resolution.selectedCandidate.utcOffset, "偏移不可显示", 32)} · {safeVisibleText(zoned.start.canonicalUtc, "UTC 不可显示", 64)}{zoned.start.resolution.kind === "overlap" ? ` · ${zoned.start.resolution.selectedCandidate.choice}` : ""}</code></dd></div>
          {zoned.end ? <div><dt>结束解析</dt><dd><code>{safeVisibleText(zoned.end.resolution.selectedCandidate.utcOffset, "偏移不可显示", 32)} · {safeVisibleText(zoned.end.canonicalUtc, "UTC 不可显示", 64)}{zoned.end.resolution.kind === "overlap" ? ` · ${zoned.end.resolution.selectedCandidate.choice}` : ""}</code></dd></div> : null}
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
  const titleId = useId();
  const receiptValidation = eventTimeMigrationReceiptSchema.safeParse(receipt);
  const boundReceipt = receiptValidation.success ? receiptValidation.data : null;
  const currentSide = boundReceipt?.source.recordId === currentEventId
    ? "source"
    : boundReceipt?.target.recordId === currentEventId
      ? "target"
      : null;
  if (!boundReceipt || !currentSide) {
    return (
      <article
        className="event-time-migration-receipt"
        data-binding-state="invalid"
        data-contract-state={boundReceipt ? "valid" : "invalid"}
        data-schema-family="legacy-v13"
        data-release-identity="legacy-v13"
        data-db-generation="13"
        data-target-schema="13"
        data-migration-id="null"
        data-engineering-evidence-only="true"
        data-formal-activation-allowed="false"
        data-public-release-authorized="false"
        data-mutation-epoch-bypassed="false"
        data-mutation-mode="read-only-no-mutation"
        data-record-write-performed="false"
        role="alert"
        aria-labelledby={titleId}
      >
        <header>
          <div><p className="eyebrow">Migration receipt · binding rejected</p><h4 id={titleId}>{boundReceipt ? "迁移凭证未绑定当前事件" : "迁移凭证未通过严格契约"}</h4></div>
          <StatusPill tone="cinnabar">拒绝显示端点</StatusPill>
        </header>
        <p className="event-time-migration-receipt-binding-error">{boundReceipt
          ? "当前事件 ID 与凭证的源端点、目标端点均不一致；系统没有借用邻近事件关系展示这份凭证。"
          : "凭证结构未通过当前严格契约；系统没有读取部分字段、补造端点或继续展示迁移关系。"}</p>
      </article>
    );
  }
  return (
    <article
      className="event-time-migration-receipt"
      data-binding-state="bound"
      data-contract-state="valid"
      data-current-side={currentSide}
      data-source-context={boundReceipt.source.snapshot.timeContext.kind}
      data-target-context={boundReceipt.target.snapshot.timeContext.kind}
      data-schema-family="legacy-v13"
      data-release-identity="legacy-v13"
      data-db-generation="13"
      data-target-schema="13"
      data-migration-id="null"
      data-engineering-evidence-only="true"
      data-formal-activation-allowed="false"
      data-public-release-authorized="false"
      data-mutation-epoch-bypassed="false"
      data-mutation-mode="read-only-no-mutation"
      data-record-write-performed="false"
      aria-labelledby={titleId}
    >
      <header>
        <div>
          <p className="eyebrow">Migration receipt · {formatDateTime(boundReceipt.createdAt)}</p>
          <h4 id={titleId}>事件时间迁移凭证</h4>
        </div>
        <StatusPill tone="neutral">{currentSide === "source" ? "当前事件为源" : "当前事件为派生目标"}</StatusPill>
      </header>
      <div className="event-time-migration-endpoints">
        <EventTimeMigrationEndpointDetails endpoint={boundReceipt.source} side="source" href={buildEventHref(boundReceipt.source)} />
        <EventTimeMigrationEndpointDetails endpoint={boundReceipt.target} side="target" href={buildEventHref(boundReceipt.target)} />
      </div>
      <details className="event-time-migration-receipt-digests">
        <summary><span>完整端点摘要</span><small>3 项 · 可选择核对</small></summary>
        <dl aria-label="迁移凭证完整端点摘要">
          <div><dt>Receipt ID</dt><dd><code>{safeVisibleText(boundReceipt.id, "不可显示", 512)}</code></dd></div>
          <div><dt>Source snapshot</dt><dd><code>{safeVisibleText(boundReceipt.source.snapshotDigest, "不可显示", 128)}</code></dd></div>
          <div><dt>Target snapshot</dt><dd><code>{safeVisibleText(boundReceipt.target.snapshotDigest, "不可显示", 128)}</code></dd></div>
        </dl>
      </details>
      <footer>
        <span>凭证 <code title={safeVisibleText(boundReceipt.id, "")}>{displayIdentifier(boundReceipt.id)}</code></span>
        <span>操作依据：本次显式确认</span>
        <span>关系：{boundReceipt.source.snapshot.timeContext.kind} → {boundReceipt.target.snapshot.timeContext.kind}</span>
        <span>边界：结构与端点绑定，不代表内容真值或公开发布授权</span>
      </footer>
    </article>
  );
}

function EventTimeMigrationRelationReceipt({
  receipt,
  currentEventId,
  buildEventHref
}: {
  receipt: EventTimeMigrationReceipt;
  currentEventId: string;
  buildEventHref: (endpoint: EventTimeMigrationEndpoint) => string;
}) {
  const [hasOpened, setHasOpened] = useState(false);
  return (
    <details
      className="event-time-migration-relation-receipt"
      onToggle={(event) => {
        if (event.currentTarget.open) setHasOpened(true);
      }}
    >
      <summary>展开完整迁移凭证</summary>
      {hasOpened ? (
        <EventTimeMigrationReceiptDetails
          receipt={receipt}
          currentEventId={currentEventId}
          buildEventHref={buildEventHref}
        />
      ) : <p className="event-time-migration-relation-receipt__placeholder">展开时再载入完整端点与冻结快照。</p>}
    </details>
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
  const [visibleRelationCount, setVisibleRelationCount] = useState(INITIAL_VISIBLE_RELATION_COUNT);
  const validation = useMemo(() => validateMigrationReceiptIndex(receipts), [receipts]);
  const duplicateIds = useMemo(
    () => duplicateReceiptIds(validation.receipts),
    [validation.receipts]
  );
  const relatedReceipts = useMemo(
    () => validation.receipts.filter((receipt) => (
      receipt.source.recordId === currentEventId || receipt.target.recordId === currentEventId
    )),
    [currentEventId, validation.receipts]
  );
  const relationEvidenceKey = useMemo(
    () => migrationReceiptEvidenceKey(validation.receipts),
    [validation.receipts]
  );
  const visibleRelatedReceipts = relatedReceipts.slice(0, visibleRelationCount);

  useEffect(() => {
    setVisibleRelationCount(INITIAL_VISIBLE_RELATION_COUNT);
  }, [currentEventId, relationEvidenceKey]);

  if (!validation.ok) {
    return (
      <aside
        className="event-time-migration-relations"
        data-index-state="invalid"
        data-schema-family="legacy-v13"
        data-release-identity="legacy-v13"
        data-db-generation="13"
        data-target-schema="13"
        data-migration-id="null"
        data-engineering-evidence-only="true"
        data-formal-activation-allowed="false"
        data-public-release-authorized="false"
        data-mutation-epoch-bypassed="false"
        data-mutation-mode="read-only-no-mutation"
        data-record-write-performed="false"
        aria-label="事件时间迁移关系"
      >
        <strong>时间迁移关系已关闭</strong>
        <p className="event-time-migration-index-warning" role="alert">{validation.issue}</p>
      </aside>
    );
  }
  if (validation.receipts.length === 0) return null;
  if (duplicateIds.length) {
    const duplicateIdSummary = summarizeDiagnosticIds(duplicateIds);
    return (
      <aside
        className="event-time-migration-relations"
        data-index-state="invalid"
        data-schema-family="legacy-v13"
        data-release-identity="legacy-v13"
        data-db-generation="13"
        data-target-schema="13"
        data-migration-id="null"
        data-engineering-evidence-only="true"
        data-formal-activation-allowed="false"
        data-public-release-authorized="false"
        data-mutation-epoch-bypassed="false"
        data-mutation-mode="read-only-no-mutation"
        data-record-write-performed="false"
        aria-label="事件时间迁移关系"
      >
        <strong>时间迁移关系已关闭</strong>
        <p className="event-time-migration-index-warning" role="alert">
          凭证索引包含重复 receiptId，不能择一关联：<code>{duplicateIdSummary.visible}</code>{duplicateIdSummary.omitted ? `；另有 ${duplicateIdSummary.omitted} 个重复 ID 未展开` : ""}
        </p>
      </aside>
    );
  }
  const rejectedReceiptCount = validation.receipts.length - relatedReceipts.length;
  return (
    <aside
      className="event-time-migration-relations"
      data-index-state="valid"
      data-visible-count={visibleRelatedReceipts.length}
      data-total-related-count={relatedReceipts.length}
      data-schema-family="legacy-v13"
      data-release-identity="legacy-v13"
      data-db-generation="13"
      data-target-schema="13"
      data-migration-id="null"
      data-engineering-evidence-only="true"
      data-formal-activation-allowed="false"
      data-public-release-authorized="false"
      data-mutation-epoch-bypassed="false"
      data-mutation-mode="read-only-no-mutation"
      data-record-write-performed="false"
      aria-label="事件时间迁移关系"
    >
      <strong>时间迁移关系 · {relatedReceipts.length} 条凭证</strong>
      {rejectedReceiptCount ? (
        <p className="event-time-migration-index-warning" role="alert">
          凭证索引包含 {rejectedReceiptCount} 条与当前事件无关的记录，已拒绝关联和显示。
        </p>
      ) : null}
      {relatedReceipts.length ? <>
        <ul>
        {visibleRelatedReceipts.map((receipt) => {
          const isSource = receipt.source.recordId === currentEventId;
          const counterpart = isSource ? receipt.target : receipt.source;
          return (
            <li key={receipt.id} data-relation-direction={isSource ? "derived-target" : "derived-from-source"}>
              <span>{isSource ? "派生目标" : "派生自旧事件"}</span>
              <AppLink href={buildEventHref(counterpart)} aria-label={`打开${isSource ? "派生" : "源"}事件 ${displayIdentifier(counterpart.recordId)}`}>
                <code title={safeVisibleText(counterpart.recordId, "")}>{displayIdentifier(counterpart.recordId)}</code><ArrowRight aria-hidden="true" />
              </AppLink>
              <small>凭证 <code title={safeVisibleText(receipt.id, "")}>{displayIdentifier(receipt.id)}</code> · {timeContextLabel(counterpart.snapshot)}</small>
              <EventTimeMigrationRelationReceipt
                receipt={receipt}
                currentEventId={currentEventId}
                buildEventHref={buildEventHref}
              />
            </li>
          );
        })}
        </ul>
        {relatedReceipts.length > visibleRelatedReceipts.length ? (
          <div className="event-time-migration-relation-progress">
            <button
              type="button"
              className="secondary-action"
              onClick={() => setVisibleRelationCount((current) => Math.min(current + VISIBLE_RELATION_STEP, relatedReceipts.length))}
            >
              继续显示迁移关系
            </button>
            <small role="status" aria-live="polite">已显示 {visibleRelatedReceipts.length} / {relatedReceipts.length} 条；完整凭证仅在展开后挂载。</small>
          </div>
        ) : null}
      </> : null}
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
  derive: (
    interpretation: EventTimeMigrationInterpretation,
    reconcileReturnedResult: ReconcileEventTimeMigrationResult
  ) => Promise<EventTimeMigrationReconciledResult>;
  onDerived: (result: EventTimeMigrationResult) => void;
  onCancel: () => void;
}) {
  const panelId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const deriveGeneration = useRef(0);
  const activeDeriveGeneration = useRef<number | null>(null);
  const [timeZone, setTimeZone] = useState(defaultTimeZone);
  const [startDisambiguation, setStartDisambiguation] = useState<DstDisambiguationPolicy>("reject");
  const [endDisambiguation, setEndDisambiguation] = useState<DstDisambiguationPolicy>("reject");
  const [confirmedAuthorizationKey, setConfirmedAuthorizationKey] = useState<string | null>(null);
  const [state, setState] = useState<MigrationState>(initialMigrationState);
  const [sessionReceipts, setSessionReceipts] = useState<EventTimeMigrationReceipt[]>([]);
  const sourceValidation = useMemo(() => eventRecordSchema.safeParse(source), [source]);
  const sourceIssue = !sourceValidation.success
    ? "源事件未通过当前严格事件契约，已关闭时间派生。"
    : sourceValidation.data.timeContext.kind !== "legacy_floating"
      ? "当前事件已经具有明确时间语义，不应再次通过旧事件派生入口处理。"
      : null;
  const isMinute = sourceValidation.success && sourceValidation.data.datePrecision === "minute";
  const panelIdentity = useMemo(
    () => JSON.stringify([
      sourceValidation.success ? sourceValidation.data : { id: safeVisibleText(source.id, "invalid-source", 128) },
      safeVisibleText(defaultTimeZone, "", MAX_TIME_ZONE_INPUT_LENGTH)
    ]),
    [defaultTimeZone, source.id, sourceValidation]
  );
  const activePanelIdentity = useRef(panelIdentity);
  const [statePanelIdentity, setStatePanelIdentity] = useState(panelIdentity);
  const panelCurrent = statePanelIdentity === panelIdentity;
  const busy = panelCurrent && state.status === "busy";

  useLayoutEffect(() => {
    activePanelIdentity.current = panelIdentity;
    setStatePanelIdentity(panelIdentity);
    const generation = ++deriveGeneration.current;
    activeDeriveGeneration.current = null;
    setTimeZone(defaultTimeZone);
    setStartDisambiguation("reject");
    setEndDisambiguation("reject");
    setConfirmedAuthorizationKey(null);
    setState(initialMigrationState);
    setSessionReceipts([]);
    const frame = window.requestAnimationFrame(() => {
      headingRef.current?.focus();
      headingRef.current?.scrollIntoView?.({ block: "center" });
    });
    return () => {
      window.cancelAnimationFrame(frame);
      if (deriveGeneration.current === generation) deriveGeneration.current += 1;
    };
  }, [defaultTimeZone, panelIdentity]);

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
  const rangeInvalid = Boolean(startCandidate
    && endCandidate
    && Date.parse(endCandidate.instant) < Date.parse(startCandidate.instant));
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
  const existingReceiptValidation = useMemo(
    () => validateMigrationReceiptIndex(existingReceipts),
    [existingReceipts]
  );
  const duplicateExistingReceiptIds = useMemo(
    () => duplicateReceiptIds(existingReceiptValidation.receipts),
    [existingReceiptValidation.receipts]
  );
  const receiptReconciliation = useMemo(
    () => reconcileMigrationReceipts(existingReceiptValidation.receipts, sessionReceipts),
    [existingReceiptValidation.receipts, sessionReceipts]
  );
  const availableReceipts = receiptReconciliation.receipts;
  const receiptIndexIssueIds = useMemo(() => {
    return [...new Set([
      ...duplicateExistingReceiptIds,
      ...receiptReconciliation.conflictingIds
    ])].sort();
  }, [duplicateExistingReceiptIds, receiptReconciliation.conflictingIds]);
  const receiptCapacityReached = receiptReconciliation.receipts.length >= MAX_MIGRATION_RECEIPTS;
  const receiptIndexState = !existingReceiptValidation.ok || receiptIndexIssueIds.length > 0
    ? "invalid"
    : receiptCapacityReached
      ? "capacity_reached"
      : "valid";
  const receiptIndexBlocked = receiptIndexState !== "valid";
  const receiptIndexIssueSummary = useMemo(
    () => summarizeDiagnosticIds(receiptIndexIssueIds),
    [receiptIndexIssueIds]
  );
  const receiptEvidenceKey = useMemo(
    () => migrationReceiptEvidenceKey(availableReceipts),
    [availableReceipts]
  );
  const authorizationKey = useMemo(() => JSON.stringify([
    panelIdentity,
    interpretation,
    receiptEvidenceKey
  ]), [interpretation, panelIdentity, receiptEvidenceKey]);
  const confirmed = confirmedAuthorizationKey === authorizationKey;
  const activeReceiptEvidenceKey = useRef(receiptEvidenceKey);
  const activeAuthorizationKey = useRef(authorizationKey);

  useLayoutEffect(() => {
    activeReceiptEvidenceKey.current = receiptEvidenceKey;
    if (activeAuthorizationKey.current === authorizationKey) return;
    activeAuthorizationKey.current = authorizationKey;
    setConfirmedAuthorizationKey(null);
  }, [authorizationKey, receiptEvidenceKey]);

  if (!panelCurrent) {
    return (
      <section
        className="event-time-migration-panel event-time-migration-transition"
        data-migration-state="switching"
        data-date-precision={source.datePrecision}
        aria-labelledby={`${panelId}-title`}
        aria-describedby={`${panelId}-transition-copy`}
        aria-busy="true"
        role="status"
        aria-live="polite"
        data-schema-family="legacy-v13"
        data-release-identity="legacy-v13"
        data-db-generation="13"
        data-target-schema="13"
        data-migration-id="null"
        data-engineering-evidence-only="true"
        data-formal-activation-allowed="false"
        data-public-release-authorized="false"
        data-mutation-epoch-bypassed="false"
        data-mutation-mode="managed-derive-port"
        data-write-state="not-started"
      >
        <span className="event-time-migration-transition__mark" aria-hidden="true"><RefreshCw className="is-spinning" /></span>
        <div><p className="eyebrow">Source transition</p><h3 id={`${panelId}-title`}>正在切换源事件</h3><p id={`${panelId}-transition-copy`}>旧解释表单、授权、结果和本次会话凭证已撤下；正在绑定新的源事件身份。</p></div>
      </section>
    );
  }

  const duplicateReceipt = !receiptIndexBlocked
    ? availableReceipts.find((receipt) =>
        receipt.source.recordId === source.id && sameInterpretation(receipt.interpretation, interpretation)
      ) ?? null
    : null;

  const resetAuthorization = () => {
    setConfirmedAuthorizationKey(null);
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
    if (
      !confirmed
      || Boolean(sourceIssue)
      || !minuteReady
      || duplicateReceipt
      || receiptIndexBlocked
      || busy
      || state.status === "commit_pending"
      || state.status === "success"
      || activeDeriveGeneration.current !== null
    ) return;
    const knownReceiptIds = new Set(availableReceipts.map((receipt) => receipt.id));
    const submittedReceiptEvidenceKey = receiptEvidenceKey;
    const submittedResultToken = Object.freeze({});
    const reconcileReturnedResult: ReconcileEventTimeMigrationResult = (candidate) => {
      if (activeReceiptEvidenceKey.current !== submittedReceiptEvidenceKey) {
        throw new Error("提交期间迁移凭证证据发生变化，返回结果不能与原提交快照可靠合并。");
      }
      return Object.freeze({
        result: assertMigrationResult(candidate, source, interpretation, knownReceiptIds),
        submissionToken: submittedResultToken
      });
    };
    const generation = ++deriveGeneration.current;
    activeDeriveGeneration.current = generation;
    const submittedPanelIdentity = panelIdentity;
    setState({ status: "busy", message: null, result: null });
    let result: EventTimeMigrationResult;
    let deriveReturned = false;
    try {
      const reconciled = await derive(interpretation, reconcileReturnedResult);
      deriveReturned = true;
      if (
        !reconciled
        || typeof reconciled !== "object"
        || reconciled.submissionToken !== submittedResultToken
      ) {
        throw new Error("迁移端口返回值没有绑定本次提交后核对握手。");
      }
      result = reconciled.result;
    } catch (reason) {
      if (activeDeriveGeneration.current === generation) activeDeriveGeneration.current = null;
      if (generation !== deriveGeneration.current || activePanelIdentity.current !== submittedPanelIdentity) return;
      const message = errorMessage(reason, "没有生成并列事件。");
      setConfirmedAuthorizationKey(null);
      if (
        !deriveReturned
        && reason instanceof EventTimeMigrationDeriveError
        && reason.certainty === "not_started"
      ) {
        setState({
          status: "failed",
          message: `派生调用确定未开始：${message} 当前没有未知提交，可复核输入并重新确认后重试。`,
          result: null
        });
        return;
      }
      setState({
        status: "commit_pending",
        certainty: deriveReturned ? "returned_unreconciled" : "call_unknown",
        message: deriveReturned
          ? `派生端口已经返回，但结果绑定未能通过提交后核对：${message} 本次操作可能已经生成记录，请勿重复提交；关闭面板后重新打开事件列表，核对事件与迁移凭证。`
          : `派生调用没有返回可核对结果：${message} 无法证明本次写入未发生，请勿原地重试；关闭面板后重新打开事件列表，核对事件与迁移凭证。`,
        result: null
      });
      return;
    }
    if (activeDeriveGeneration.current === generation) activeDeriveGeneration.current = null;
    if (generation !== deriveGeneration.current || activePanelIdentity.current !== submittedPanelIdentity) return;
    setConfirmedAuthorizationKey(null);
    setSessionReceipts((current) => current.some((receipt) => receipt.id === result.receipt.id)
      ? current
      : [...current, result.receipt]);
    setState({ status: "success", message: null, result });
    try {
      onDerived(result);
    } catch (reason) {
      setState({
        status: "success",
        message: `并列事件与迁移凭证已通过核对，但父级事件列表没有完成刷新：${errorMessage(reason, "发生未知错误。")} 可直接打开派生事件，或重新载入当前案例。`,
        result
      });
    }
  };

  const beginAnotherInterpretation = () => {
    deriveGeneration.current += 1;
    activeDeriveGeneration.current = null;
    setConfirmedAuthorizationKey(null);
    setState(initialMigrationState);
    window.requestAnimationFrame(() => headingRef.current?.focus());
  };

  const confirmationDetail = isMinute
    ? [
        `我确认把旧墙钟时间按 ${safeVisibleText(timeZone.trim(), "尚未选择的 IANA 时区", 128)} 解释。`,
        startCandidate ? `起始 ${source.startDate} → ${startCandidate.utcOffset} · ${startCandidate.instant}${startCandidate.choice === "unique" ? "" : ` · ${startCandidate.choice}`}。` : "起始时间尚未完成解析。",
        source.endDate
          ? endCandidate ? `结束 ${source.endDate} → ${endCandidate.utcOffset} · ${endCandidate.instant}${endCandidate.choice === "unique" ? "" : ` · ${endCandidate.choice}`}。` : "结束时间尚未完成解析。"
          : "没有结束时间。"
      ].join(" ")
    : `我确认保留原${precisionLabel(source.datePrecision)}精度与起止日期，派生为 calendar_date；不引入 IANA 时区、DST 或标准 UTC。`;
  const confirmationDisabled = !minuteReady
    || Boolean(sourceIssue)
    || busy
    || state.status === "commit_pending"
    || Boolean(duplicateReceipt)
    || receiptIndexBlocked;
  const interpretationStage = state.status === "success"
    ? "complete"
    : state.status === "commit_pending"
      ? "blocked"
    : sourceIssue || receiptIndexBlocked
      ? "blocked"
      : duplicateReceipt
      ? "existing"
      : busy
        ? "busy"
        : confirmed
          ? "confirmed"
          : minuteReady
            ? "prepared"
            : "blocked";
  const derivationStage = state.status === "success"
    ? "complete"
    : state.status === "commit_pending"
      ? "uncertain"
    : state.status === "failed"
      ? "failed"
    : sourceIssue || receiptIndexBlocked
      ? "blocked"
      : busy
        ? "busy"
        : "pending";
  const migrationStatus = sourceIssue
    ? { label: "源事件不可派生", tone: "cinnabar" as const }
    : state.status === "commit_pending"
      ? { label: "提交结果待核对", tone: "cinnabar" as const }
      : busy
        ? { label: "正在生成并列事件", tone: "info" as const }
        : state.status === "success"
          ? { label: "新事件绑定已核对", tone: "info" as const }
          : receiptIndexState === "invalid"
            ? { label: "凭证证据异常", tone: "cinnabar" as const }
            : receiptIndexState === "capacity_reached"
              ? { label: "凭证容量已达上限", tone: "warning" as const }
              : state.status === "failed"
                ? { label: "调用确定未开始", tone: "warning" as const }
                : duplicateReceipt
                  ? { label: "当前解释已存在", tone: "neutral" as const }
                  : confirmed
                    ? { label: "确认已绑定", tone: "info" as const }
                    : minuteReady
                      ? { label: "等待显式确认", tone: "warning" as const }
                      : { label: "等待时间预检", tone: "warning" as const };

  return (
    <section
      className="event-time-migration-panel"
      data-migration-state={state.status}
      data-commit-certainty={state.status === "commit_pending" ? state.certainty : "not-applicable"}
      data-date-precision={source.datePrecision}
      data-receipt-index-state={receiptIndexState}
      data-authorization-state={sourceIssue || receiptIndexBlocked ? "blocked" : confirmed ? "bound" : "unbound"}
      data-schema-family="legacy-v13"
      data-release-identity="legacy-v13"
      data-db-generation="13"
      data-target-schema="13"
      data-migration-id="null"
      data-engineering-evidence-only="true"
      data-formal-activation-allowed="false"
      data-public-release-authorized="false"
      data-mutation-epoch-bypassed="false"
      data-mutation-mode="managed-derive-port"
      data-write-state={state.status === "success" ? "result-bound" : state.status === "commit_pending" ? "unknown-reconcile" : state.status === "busy" ? "in-flight" : "not-started"}
      data-derive-result-readback-verified="false"
      data-chart-or-storage-mutation-performed={state.status === "success" ? "confirmed-new-event" : state.status === "commit_pending" ? "unknown" : "false"}
      aria-labelledby={`${panelId}-title`}
      aria-describedby={`${panelId}-scope ${panelId}-governance-copy`}
      aria-busy={busy}
    >
      <header>
        <div>
          <p className="eyebrow">Explicit time derivation</p>
          <h3 id={`${panelId}-title`} ref={headingRef} tabIndex={-1}>解释旧事件时间</h3>
          <p id={`${panelId}-scope`}>只创建并列的新事件和可核验凭证；旧 ID、旧时间和原记录不会被覆盖。</p>
        </div>
        <StatusPill tone={migrationStatus.tone}>{migrationStatus.label}</StatusPill>
      </header>

      <div className="event-time-migration-governance" role="note" aria-label="事件时间派生治理边界">
        <span>legacy-v13 · Schema 13 · migrationId null</span>
        <span>显式确认</span>
        <span>旧记录不覆盖</span>
        <p id={`${panelId}-governance-copy`}>本组件只在源事件、时间解释和凭证证据完成绑定后调用受管派生端口，不提供绕过 mutation epoch 的替代写入路径；生成成功也不等于内容真值或公开发布授权。</p>
      </div>

      <ol className="event-time-migration-steps" aria-label="事件时间迁移阶段">
        <li data-stage-state={sourceIssue ? "blocked" : "complete"}>
          <span>01</span><div><strong>冻结源事件</strong><small>旧记录只读快照</small></div>
        </li>
        <li data-stage-state={interpretationStage} aria-current={state.status !== "success" && state.status !== "commit_pending" && !busy ? "step" : undefined}>
          <span>02</span><div><strong>确认时间解释</strong><small>{isMinute ? "IANA / DST 显式选择" : "保留原日期精度"}</small></div>
        </li>
        <li data-stage-state={derivationStage} aria-current={busy || state.status === "commit_pending" ? "step" : undefined}>
          <span>03</span><div><strong>生成并列事件</strong><small>新 ID 与迁移凭证</small></div>
        </li>
      </ol>

      <dl className="event-time-migration-source" aria-label="旧事件只读时间摘要">
        <div><dt>源事件</dt><dd><code title={safeVisibleText(source.id, "")}>{displayIdentifier(source.id)}</code></dd></div>
        <div><dt>日期精度</dt><dd>{precisionLabel(source.datePrecision)}</dd></div>
        <div><dt>起始墙钟</dt><dd><code>{source.startDate ? safeVisibleText(source.startDate, "不可显示", 128) : "不适用"}</code></dd></div>
        <div><dt>结束墙钟</dt><dd><code>{source.endDate ? safeVisibleText(source.endDate, "不可显示", 128) : "未记录"}</code></dd></div>
      </dl>

      {sourceIssue ? <div className="event-time-migration-structure" role="alert"><strong>源事件绑定未通过迁移预检</strong><p>{sourceIssue}</p></div> : null}

      <aside
        className="event-time-migration-authorization"
        data-authorization-state={sourceIssue || receiptIndexBlocked ? "blocked" : confirmed ? "bound" : "unbound"}
        aria-label="本次时间解释确认绑定"
      >
        <Fingerprint aria-hidden="true" />
        <div>
          <strong>确认只绑定当前证据快照</strong>
          <p>当前源事件、时间解释或 {availableReceipts.length} 条已知迁移凭证中的任一项发生变化，勾选确认都会自动失效；不会沿用到另一份来源或证据索引。</p>
        </div>
        <span>{sourceIssue || receiptIndexBlocked ? "证据异常" : confirmed ? "确认已绑定" : "等待确认"}</span>
      </aside>

      {state.status === "success" ? (
        <>
          <div
            ref={successRef}
            className="event-time-migration-success"
            role="region"
            aria-labelledby={`${panelId}-success-title`}
            tabIndex={-1}
          >
            <CheckCircle2 aria-hidden="true" />
            <div>
              <strong id={`${panelId}-success-title`}>新事件和时间迁移凭证已生成，旧事件未改写</strong>
              <p>新事件 ID：<code title={safeVisibleText(state.result.target.id, "")}>{displayIdentifier(state.result.target.id)}</code></p>
              <AppLink className="secondary-action" href={buildEventHref(state.result.receipt.target)}>
                打开派生事件 <ArrowRight aria-hidden="true" />
              </AppLink>
              <p className="event-time-migration-success-boundary">这里只确认新事件与迁移凭证通过本组件的源、目标和解释绑定核对；不证明时间解释正确、专家认可或公开发布获准。</p>
              {state.message ? <p className="event-time-migration-postcommit-warning" role="alert">{state.message}</p> : null}
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
      ) : state.status === "commit_pending" ? (
        <div className="event-time-migration-commit-pending" role="alert">
          <p className="eyebrow">{state.certainty === "call_unknown" ? "Call unknown · reconciliation required" : "Commit returned · verification pending"}</p>
          <strong>{state.certainty === "call_unknown" ? "派生调用结果未知，禁止原地重试" : "派生端口已返回，结果绑定尚未闭环"}</strong>
          <p>{state.message}</p>
          <dl>
            <div><dt>源事件</dt><dd><code title={safeVisibleText(source.id, "")}>{displayIdentifier(source.id)}</code></dd></div>
            <div><dt>提交解释</dt><dd>{interpretation.kind === "calendar_date" ? "calendar_date · 保留原日期精度" : `${safeVisibleText(interpretation.timeZone, "时区不可显示", 128)} · 起始 ${interpretation.startDisambiguation} · 结束 ${interpretation.endDisambiguation ?? "无"}`}</dd></div>
            <div><dt>允许动作</dt><dd>关闭面板 · 重新打开事件列表核对 · 禁止原地重试</dd></div>
          </dl>
          <div className="event-time-migration-actions">
            <button type="button" className="secondary-action" onClick={onCancel}><X aria-hidden="true" />关闭面板</button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit}>
          {state.status === "failed" ? (
            <div className="event-time-migration-retryable" role="alert">
              <strong>派生调用未开始，可以重新确认</strong>
              <p>{state.message}</p>
            </div>
          ) : null}
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
                  spellCheck={false}
                  maxLength={MAX_TIME_ZONE_INPUT_LENGTH}
                  required
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
              <StatusPill tone="neutral">派生为 calendar_date</StatusPill>
              <p>原日期精度与起止值保持不变；日历日期不适用 IANA 时区、DST、UTC 偏移或标准 UTC。</p>
            </div>
          )}

          {receiptIndexBlocked ? (
            <div className="event-time-migration-structure" role="alert">
              <strong>迁移凭证证据当前不可用于新迁移</strong>
              <p>{existingReceiptValidation.issue
                ?? (receiptCapacityReached && receiptIndexIssueIds.length === 0
                  ? `当前已知凭证达到 ${MAX_MIGRATION_RECEIPTS} 条安全容量上限；请先归档或缩减索引，再创建新的时间解释。`
                  : <>不能从异常 receiptId 中择一判断既有解释：<code>{receiptIndexIssueSummary.visible}</code>{receiptIndexIssueSummary.omitted ? `；另有 ${receiptIndexIssueSummary.omitted} 个异常 ID 未展开` : ""}</>)}</p>
            </div>
          ) : null}

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

          <label className="event-time-migration-confirm" data-selected={confirmed} data-disabled={confirmationDisabled}>
            <input
              type="checkbox"
              checked={confirmed}
              disabled={confirmationDisabled}
              onChange={(event) => setConfirmedAuthorizationKey(event.currentTarget.checked ? authorizationKey : null)}
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
              disabled={!confirmed || confirmationDisabled}
              aria-busy={busy}
            >
              <RefreshCw className={busy ? "is-spinning" : undefined} aria-hidden="true" />
              {busy ? "正在生成并列事件…" : "生成并列事件"}
            </button>
            <button type="button" className="secondary-action" disabled={busy} onClick={onCancel}><X aria-hidden="true" />取消</button>
          </div>
          {busy ? <p className="event-time-migration-progress" role="status">正在核验源事件并生成新 ID 与时间迁移凭证。</p> : null}
        </form>
      )}
    </section>
  );
}
