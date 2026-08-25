import { ArrowLeft, ArrowRight, CheckCircle2, Download, Info, Microscope, RefreshCw, TriangleAlert } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  isCandidateSetRecord,
  type CandidateSetRecord,
  type CandidateSetTzdbProbeDiffChangedField,
  type TzdbMigrationReceipt
} from "@hakimi/contracts";
import { calculateUnknownHourCandidatesForBundledSnapshot } from "@hakimi/bazi-core";
import { webReportExportPort } from "@hakimi/platform";
import { caseRepository } from "@hakimi/storage";
import { classifyStoredTimeZoneDatabaseForReplay, RUNTIME_TZDB_VERSION } from "@hakimi/time-core";
import { BUNDLED_TZDB_ARTIFACT_REGISTRY } from "@hakimi/tzdb-core";
import { PageHeading } from "../components/page-heading";
import {
  PreparedFileDeliveryDialog,
  type PreparedFileArtifact
} from "../components/prepared-file-delivery-dialog";
import { ResearchJournal } from "../components/research-journal";
import { StatusPill } from "../components/status-pill";
import { getCandidateSetResolverPresentation } from "../lib/candidate-set-resolver-presentation";
import { formatDateTime, shortHash } from "../lib/format";
import { AppLink, navigate, useAppLocation } from "../lib/router";
import { safeVisibleErrorMessage, safeVisibleText } from "../lib/visible-text";
import "./candidate-set-page.css";

type CandidateSetPageProps = {
  candidateSetId: string;
};

const EVENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CANDIDATE_PILLAR_POSITIONS = ["year", "month", "day", "hour"] as const;
const CANDIDATE_SET_INTERNAL_ID_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9._:-]{0,191}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const CANDIDATE_SET_UNSAFE_TEXT_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const MAX_CANDIDATE_SET_WARNINGS = 128;
const MAX_TZDB_MIGRATION_RECEIPTS = 256;

const CANDIDATE_SET_SAFETY_ATTRIBUTES = {
  "data-release-identity": "legacy-v13",
  "data-release-family": "legacy",
  "data-target-schema": "13",
  "data-schema-version": "13",
  "data-db-schema-version": "13",
  "data-migration-id": "null",
  "data-engineering-evidence-only": "true",
  "data-evidence-authority": "engineering-only",
  "data-formal-validation-complete": "false",
  "data-scientific-validation-complete": "false",
  "data-mutation-mode": "epoch-governed-user-initiated-writes",
  "data-mutation-epoch-bypassed": "false",
  "data-mutation-epoch-state": "not_bypassed",
  "data-public-release-authorized": "false",
  "data-expert-truth-claimed": "false"
} as const;

function candidateSetIdentifierIssue(value: unknown, label: string): string | null {
  if (typeof value !== "string" || !CANDIDATE_SET_INTERNAL_ID_PATTERN.test(value)) {
    return `${label} 不是可接受的内部标识符，已拒绝读取、展示或建立深链。`;
  }
  return null;
}

function assertBoundedCandidateSetPayload(value: unknown, label: string): void {
  const activeObjects = new Set<object>();
  let visitedNodes = 0;

  const visit = (entry: unknown, depth: number): void => {
    visitedNodes += 1;
    if (visitedNodes > 100_000) throw new Error(`${label} 的运行时节点数量超出页面安全上限。`);
    if (depth > 20) throw new Error(`${label} 的运行时结构深度超出页面安全上限。`);
    if (typeof entry === "string") {
      if (entry.length > 16_384 || CANDIDATE_SET_UNSAFE_TEXT_PATTERN.test(entry)) {
        throw new Error(`${label} 包含过长文本或不安全控制字符。`);
      }
      return;
    }
    if (typeof entry === "number") {
      if (!Number.isFinite(entry)) throw new Error(`${label} 包含非有限数值。`);
      return;
    }
    if (entry === null || entry === undefined || typeof entry === "boolean") return;
    if (typeof entry !== "object") throw new Error(`${label} 包含无法展示的运行时值。`);
    if (activeObjects.has(entry)) throw new Error(`${label} 包含循环引用，已拒绝展示。`);

    activeObjects.add(entry);
    if (Array.isArray(entry)) {
      if (entry.length > 512) throw new Error(`${label} 的列表项目数量超出页面安全上限。`);
      entry.forEach((item) => visit(item, depth + 1));
      activeObjects.delete(entry);
      return;
    }

    const keys = Object.keys(entry);
    if (keys.length > 256) throw new Error(`${label} 的字段数量超出页面安全上限。`);
    keys.forEach((key) => {
      if (key.length > 16_384 || CANDIDATE_SET_UNSAFE_TEXT_PATTERN.test(key)) {
        throw new Error(`${label} 包含过长字段名或不安全控制字符。`);
      }
      visit((entry as Record<string, unknown>)[key], depth + 1);
    });
    activeObjects.delete(entry);
  };

  visit(value, 0);
}

function parseCandidateSetEventSelection(search: string): { eventId: string | null; error: string | null } {
  const values = new URLSearchParams(search).getAll("event");
  if (values.length === 0) return { eventId: null, error: null };
  if (values.length !== 1 || !EVENT_ID_PATTERN.test(values[0])) {
    return { eventId: null, error: "event 参数必须是唯一、完整的事件 UUID；没有改用近似事件。" };
  }
  return { eventId: values[0].toLowerCase(), error: null };
}

type CandidateSetPageState =
  | { requestId: string; status: "loading"; record: null; message: null }
  | { requestId: string; status: "ready"; record: CandidateSetRecord; message: null }
  | { requestId: string; status: "missing"; record: null; message: null }
  | { requestId: string; status: "error"; record: null; message: string };

function loadingCandidateSetState(requestId: string): CandidateSetPageState {
  return { requestId, status: "loading", record: null, message: null };
}

type ReceiptIndexState =
  | { requestId: string; status: "loading"; records: readonly []; message: null }
  | { requestId: string; status: "ready"; records: TzdbMigrationReceipt[]; message: null }
  | { requestId: string; status: "error"; records: readonly []; message: string };

function loadingReceiptIndexState(requestId: string): ReceiptIndexState {
  return { requestId, status: "loading", records: [], message: null };
}

type MigrationState =
  | { sourceId: null; status: "idle"; message: null; targetId: null }
  | { sourceId: string; status: "busy"; message: null; targetId: null }
  | { sourceId: string; status: "error"; message: string; targetId: null }
  | { sourceId: string; status: "commit_unknown"; message: string; targetId: null }
  | { sourceId: string; status: "committed_unverified"; message: string; targetId: string; receiptId: string }
  | { sourceId: string; status: "success"; message: null; targetId: string };

const initialMigrationState: MigrationState = {
  sourceId: null,
  status: "idle",
  message: null,
  targetId: null
};

type CandidateSetExportState =
  | { recordId: null; status: "idle"; message: null }
  | { recordId: string; status: "busy"; message: null }
  | { recordId: string; status: "success" | "info" | "error"; message: string };

const initialExportState: CandidateSetExportState = {
  recordId: null,
  status: "idle",
  message: null
};

const candidateStatusLabels = {
  calculated: "候选已算",
  requires_user_time_resolution: "保留时间歧义",
  unresolved: "未解析"
} as const;

const variantChoiceLabels = {
  unique: "唯一瞬时点",
  earlier: "DST earlier",
  later: "DST later"
} as const;

type CandidateProbeFilter = "all" | "single" | "ambiguous" | "unresolved";

type ReceiptTopologyRecord = {
  id: string;
  source: { recordId: string; tzdbVersion: string };
  target: { recordId: string; tzdbVersion: string };
};

function receiptTopologyIntegrityIssue(
  recordId: string,
  receipts: readonly ReceiptTopologyRecord[]
): string | null {
  const inboundReceipts = receipts.filter((receipt) => receipt.target.recordId === recordId);
  if (inboundReceipts.length > 1) {
    return "同一候选组存在多条入站迁移凭证，迁移谱系不唯一。";
  }

  const outboundTargetSnapshots = new Set<string>();
  for (const receipt of receipts) {
    if (!receipt.id.trim()) {
      return "迁移凭证包含空 ID。";
    }
    if (
      !receipt.source.recordId.trim()
      || !receipt.target.recordId.trim()
      || !receipt.source.tzdbVersion.trim()
      || !receipt.target.tzdbVersion.trim()
    ) {
      return `迁移凭证 ${receipt.id} 的端点身份不完整。`;
    }
    if (receipt.source.tzdbVersion === receipt.target.tzdbVersion) {
      return `迁移凭证 ${receipt.id} 未切换 tzdb 快照。`;
    }
    if (receipt.source.recordId !== recordId) continue;
    if (outboundTargetSnapshots.has(receipt.target.tzdbVersion)) {
      return `同一目标 tzdb ${receipt.target.tzdbVersion} 存在重复出站迁移凭证。`;
    }
    outboundTargetSnapshots.add(receipt.target.tzdbVersion);
  }

  return null;
}

function candidateMatchesProbeFilter(
  candidate: CandidateSetRecord["candidateSet"]["candidates"][number],
  filter: CandidateProbeFilter
): boolean {
  if (filter === "single") return candidate.variants.length === 1;
  if (filter === "ambiguous") return candidate.variants.length > 1;
  if (filter === "unresolved") return candidate.variants.length === 0;
  return true;
}

const changedFieldLabels: Record<CandidateSetTzdbProbeDiffChangedField, string> = {
  status: "计算状态",
  time_resolution_kind: "时间解析类型",
  time_resolution_candidates: "时间解析候选",
  time_resolution_fingerprint: "完整解析指纹",
  unresolved_reason: "未解析原因",
  variant_choices: "DST 选择",
  variant_instants: "瞬时点",
  variant_offsets: "UTC 偏移",
  four_pillars: "四柱"
};

function candidateSetIntegrityIssue(
  record: CandidateSetRecord,
  expectedRecordId?: string
): string | null {
  const recordIdentifierIssue = candidateSetIdentifierIssue(record.id, "候选组记录 ID");
  if (recordIdentifierIssue) return recordIdentifierIssue;
  if (expectedRecordId !== undefined && record.id !== expectedRecordId) {
    return "候选组仓库返回了不匹配的记录来源。";
  }
  if (!SHA256_PATTERN.test(record.snapshotDigest)) {
    return "候选组记录缺少有效的 SHA-256 存储快照摘要。";
  }
  if (
    !Number.isFinite(Date.parse(record.createdAt))
    || !Number.isFinite(Date.parse(record.updatedAt))
    || (record.deletedAt !== null && !Number.isFinite(Date.parse(record.deletedAt)))
  ) {
    return "候选组记录包含无法解析的生命周期时间。";
  }
  return candidateSetPayloadIntegrityIssue(record.candidateSet);
}

function candidateSetPayloadIntegrityIssue(
  candidateSet: CandidateSetRecord["candidateSet"]
): string | null {
  const candidates = candidateSet.candidates;
  if (!SHA256_PATTERN.test(candidateSet.resultHash) || !SHA256_PATTERN.test(candidateSet.ruleProfileDigest)) {
    return "候选组缺少有效的 SHA-256 结果摘要或规则摘要。";
  }
  if (
    candidateSet.timeZoneDatabase
    && !SHA256_PATTERN.test(candidateSet.timeZoneDatabase.dataSha256)
  ) {
    return "候选组绑定的时区数据摘要不是有效 SHA-256。";
  }
  if (
    candidateSet.rulePackBinding
    && (
      !SHA256_PATTERN.test(candidateSet.rulePackBinding.packDigest)
      || !SHA256_PATTERN.test(candidateSet.rulePackBinding.profileDigest)
    )
  ) {
    return "候选组绑定的规则包摘要不是有效 SHA-256。";
  }
  if (candidateSet.warnings.length > MAX_CANDIDATE_SET_WARNINGS) {
    return `候选组生成警告超过 ${MAX_CANDIDATE_SET_WARNINGS} 条，已拒绝在单页展示。`;
  }
  if (candidateSet.input.time !== null || candidateSet.input.timePrecision !== "unknown_hour") {
    return "候选组原始输入不再保持 time=null 与 unknown_hour，已拒绝展示为未知时辰记录。";
  }
  if (candidateSet.probeCount !== 13 || candidates.length !== 13) {
    return `候选组必须同时声明并包含 13 个并列探针；当前声明 ${candidateSet.probeCount} 个、实际 ${candidates.length} 个。`;
  }

  const candidateIds = new Set<string>();
  for (const [index, candidate] of candidates.entries()) {
    if (candidateSetIdentifierIssue(candidate.candidateId, `第 ${index + 1} 个 candidateId`)) {
      return `第 ${index + 1} 个探针包含无效 candidateId。`;
    }
    if (candidateIds.has(candidate.candidateId)) {
      return `探针 candidateId 重复：${candidate.candidateId}。`;
    }
    candidateIds.add(candidate.candidateId);
    if (candidate.probeIndex !== index) {
      return `探针索引不连续：预期 ${index}，实际 ${candidate.probeIndex}。`;
    }

    const variantsMatchStatus =
      (candidate.status === "calculated" && candidate.variants.length === 1)
      || (candidate.status === "requires_user_time_resolution" && candidate.variants.length === 2)
      || (candidate.status === "unresolved" && candidate.variants.length === 0);
    if (!variantsMatchStatus) {
      return `第 ${index + 1} 个探针的解析状态与变体数量不一致。`;
    }

    const variantIds = new Set<string>();
    const variantChoices = new Set<string>();
    for (const variant of candidate.variants) {
      if (variant.variantId !== `${candidate.candidateId}@${variant.choice}`) {
        return `第 ${index + 1} 个探针的 variantId 没有精确绑定 candidateId 与时间选择。`;
      }
      if (!SHA256_PATTERN.test(variant.chartResultHash)) {
        return `第 ${index + 1} 个探针包含无效的变体结果摘要。`;
      }
      if (variantIds.has(variant.variantId)) {
        return `第 ${index + 1} 个探针包含重复 variantId：${variant.variantId}。`;
      }
      if (variantChoices.has(variant.choice)) {
        return `第 ${index + 1} 个探针包含重复时间变体：${variant.choice}。`;
      }
      variantIds.add(variant.variantId);
      variantChoices.add(variant.choice);
    }
    if (candidate.status === "calculated" && !variantChoices.has("unique")) {
      return `第 ${index + 1} 个唯一探针没有使用 unique 时间变体。`;
    }
    if (
      candidate.status === "requires_user_time_resolution"
      && (!variantChoices.has("earlier") || !variantChoices.has("later"))
    ) {
      return `第 ${index + 1} 个歧义探针没有同时保留 earlier 与 later 变体。`;
    }
  }
  return null;
}

function tzdbReceiptIntegrityIssue(receipt: TzdbMigrationReceipt): string | null {
  const probes = receipt.comparison.probeDiffs;
  const receiptIdentifierIssue = candidateSetIdentifierIssue(receipt.id, "迁移凭证 ID");
  if (receiptIdentifierIssue) return receiptIdentifierIssue;
  if (!SHA256_PATTERN.test(receipt.comparisonDigest)) {
    return "凭证缺少有效的 SHA-256 对照摘要。";
  }
  for (const [label, endpoint] of [["基准", receipt.source], ["目标", receipt.target]] as const) {
    const endpointIdentifierIssue = candidateSetIdentifierIssue(endpoint.recordId, `${label}记录 ID`);
    if (endpointIdentifierIssue) return endpointIdentifierIssue;
    if (!SHA256_PATTERN.test(endpoint.resultHash) || !SHA256_PATTERN.test(endpoint.snapshotDigest)) {
      return `${label}端点缺少有效的结果摘要或快照摘要。`;
    }
  }
  if (!Number.isFinite(Date.parse(receipt.createdAt))) {
    return "凭证创建时间无法解析。";
  }
  if (receipt.source.recordId === receipt.target.recordId) {
    return "凭证的基准记录与并列结果使用了同一记录 ID。";
  }
  if (receipt.source.tzdbVersion === receipt.target.tzdbVersion) {
    return "凭证的基准与目标没有切换 tzdb 快照。";
  }
  if (probes.length !== 13) {
    return `凭证应包含 13 个探针对照，实际为 ${probes.length} 个。`;
  }
  if (new Set(probes.map((probe) => probe.candidateId)).size !== probes.length) {
    return "凭证包含重复候选 ID，无法建立唯一探针对照。";
  }
  if (probes.some((probe) => candidateSetIdentifierIssue(probe.candidateId, "凭证 candidateId"))) {
    return "凭证包含无效候选 ID，无法建立唯一探针对照。";
  }
  if (probes.some((probe) => new Set(probe.changedFields).size !== probe.changedFields.length)) {
    return "凭证包含重复变化字段，无法建立唯一差异说明。";
  }
  const behaviorChangedCount = probes.filter((probe) => probe.behaviorChanged).length;
  const hashOnlyChangedCount = probes.filter((probe) => !probe.behaviorChanged && probe.hashChanged).length;
  const unchangedCount = probes.filter((probe) => !probe.behaviorChanged && !probe.hashChanged).length;
  if (
    behaviorChangedCount !== receipt.comparison.behaviorChangedCount ||
    hashOnlyChangedCount !== receipt.comparison.hashOnlyChangedCount ||
    unchangedCount !== receipt.comparison.unchangedCount
  ) {
    return "凭证分类计数无法从逐探针结果复算，已拒绝展示汇总结论。";
  }
  return null;
}

function receiptEndpointMatchesRecord(
  endpoint: TzdbMigrationReceipt["source"],
  record: CandidateSetRecord
): boolean {
  return endpoint.recordId === record.id &&
    endpoint.tzdbVersion === record.candidateSet.tzdbVersion &&
    endpoint.resultHash === record.candidateSet.resultHash &&
    endpoint.snapshotDigest === record.snapshotDigest;
}

function receiptIndexIntegrityIssue(
  records: readonly TzdbMigrationReceipt[],
  candidateSetId: string
): string | null {
  if (records.length > MAX_TZDB_MIGRATION_RECEIPTS) {
    return `时区并列复算凭证超过 ${MAX_TZDB_MIGRATION_RECEIPTS} 条，已拒绝在单页展示。`;
  }
  if (new Set(records.map((receipt) => receipt.id)).size !== records.length) {
    return "时区并列复算凭证索引包含重复 ID。";
  }
  for (const receipt of records) {
    if (receipt.source.recordId !== candidateSetId && receipt.target.recordId !== candidateSetId) {
      return `凭证 ${receipt.id} 没有关联当前候选组。`;
    }
    const issue = tzdbReceiptIntegrityIssue(receipt);
    if (issue) return `凭证 ${receipt.id} 完整性未通过：${issue}`;
  }
  return null;
}

function receiptRecordBindingIssue(
  records: readonly TzdbMigrationReceipt[],
  record: CandidateSetRecord
): string | null {
  const expectedCandidateIds = record.candidateSet.candidates.map((candidate) => candidate.candidateId);
  for (const receipt of records) {
    const endpoint = receipt.source.recordId === record.id ? receipt.source : receipt.target;
    if (!receiptEndpointMatchesRecord(endpoint, record)) {
      return `凭证 ${receipt.id} 的当前记录端点与候选组结果、存储快照或 tzdb 绑定不一致。`;
    }
    const receiptCandidateIds = receipt.comparison.probeDiffs.map((probe) => probe.candidateId);
    if (
      receiptCandidateIds.length !== expectedCandidateIds.length ||
      receiptCandidateIds.some((candidateId, index) => candidateId !== expectedCandidateIds[index])
    ) {
      return `凭证 ${receipt.id} 的探针 ID 或顺序与当前冻结候选组不一致。`;
    }
  }
  return null;
}

function compareReceiptsNewestFirst(left: TzdbMigrationReceipt, right: TzdbMigrationReceipt): number {
  return Date.parse(right.createdAt) - Date.parse(left.createdAt) || left.id.localeCompare(right.id);
}

function tzdbLabel(version: string): string {
  const ianaVersion = version.match(/(?:iana-tzdb|tzdb)[@/:_-]([0-9]{4}[a-z])/i)?.[1];
  if (ianaVersion) return `IANA ${ianaVersion}`;
  if (version === "browser-intl-unreported") return "旧版浏览器 Intl · 具体版本未识别";
  return safeVisibleText(version, "未识别 tzdb", 120);
}

function candidateSetPath(recordId: string): string {
  return `/candidate-sets/${encodeURIComponent(recordId)}`;
}

const TzdbMigrationReceiptPanel = memo(function TzdbMigrationReceiptPanel({
  receipt,
  currentRecordId
}: {
  receipt: TzdbMigrationReceipt;
  currentRecordId: string;
}) {
  const isSourceRecord = receipt.source.recordId === currentRecordId;
  const counterpart = isSourceRecord ? receipt.target : receipt.source;
  const relationLabel = isSourceRecord ? "并列复算目标" : "并列复算基准";
  const integrityIssue = tzdbReceiptIntegrityIssue(receipt);
  const receiptHeadingId = `tzdb-receipt-${encodeURIComponent(receipt.id)}`;
  const receiptLabel = safeVisibleText(receipt.id, "未知凭证", 160);
  const receiptDigestLabel = safeVisibleText(receipt.comparisonDigest, "摘要不可用", 180);

  if (integrityIssue) {
    return (
      <article className="candidate-set-receipt is-invalid" aria-labelledby={receiptHeadingId}>
        <header className="candidate-set-receipt__heading">
          <div><p className="eyebrow">Receipt integrity blocked</p><h3 id={receiptHeadingId}>凭证完整性未通过</h3></div>
          <StatusPill tone="cinnabar">拒绝展示</StatusPill>
        </header>
        <div className="candidate-set-receipt-integrity-error" role="alert">
          <Info aria-hidden="true" />
          <div><strong>未将该记录呈现为迁移证据</strong><p>{safeVisibleText(integrityIssue, "凭证完整性无法核对。")}</p><small>当前候选组冻结事实不因此改变；请重新读取凭证索引。</small></div>
        </div>
        <footer><span>凭证 {receiptLabel}</span><code title={receiptDigestLabel}>声明摘要 {shortHash(receiptDigestLabel)}</code></footer>
      </article>
    );
  }

  const probeCount = receipt.comparison.probeDiffs.length;

  return (
    <article className="candidate-set-receipt" aria-labelledby={receiptHeadingId}>
      <header className="candidate-set-receipt__heading">
        <div>
          <p className="eyebrow">Parallel replay receipt · {formatDateTime(receipt.createdAt)}</p>
          <h3 id={receiptHeadingId}>{relationLabel}</h3>
          <p>
            {relationLabel}{" "}
            <AppLink href={candidateSetPath(counterpart.recordId)} className="candidate-set-relation-link">
              <code>{safeVisibleText(counterpart.recordId, "未知记录", 160)}</code><ArrowRight aria-hidden="true" />
            </AppLink>
          </p>
        </div>
        <StatusPill tone={receipt.comparison.formatVersion === "1.0.0" ? "warning" : "info"}>
          {probeCount} 探针 · comparison {safeVisibleText(receipt.comparison.formatVersion, "未知格式", 80)}
        </StatusPill>
      </header>

      <div className="candidate-set-receipt-endpoints" aria-label="基准与并列复算快照">
        {(["source", "target"] as const).map((side) => {
          const endpoint = receipt[side];
          const endpointRecordLabel = safeVisibleText(endpoint.recordId, "未知记录", 160);
          const endpointTzdbLabel = safeVisibleText(endpoint.tzdbVersion, "未识别 tzdb", 120);
          const endpointResultHash = safeVisibleText(endpoint.resultHash, "摘要不可用", 180);
          const endpointSnapshotDigest = safeVisibleText(endpoint.snapshotDigest, "摘要不可用", 180);
          return (
            <section key={side} aria-label={side === "source" ? "基准快照" : "并列复算快照"}>
              <p className="eyebrow">{side === "source" ? "Source · 基准记录" : "Target · 并列结果"}</p>
              <strong>{tzdbLabel(endpoint.tzdbVersion)}</strong>
              <dl>
                <div><dt>记录 ID</dt><dd><code>{endpointRecordLabel}</code></dd></div>
                <div><dt>tzdb</dt><dd><code title={endpointTzdbLabel}>{endpointTzdbLabel}</code></dd></div>
                <div><dt>结果摘要</dt><dd><code title={endpointResultHash}>{shortHash(endpointResultHash)}</code></dd></div>
                <div><dt>快照摘要</dt><dd><code title={endpointSnapshotDigest}>{shortHash(endpointSnapshotDigest)}</code></dd></div>
              </dl>
            </section>
          );
        })}
      </div>

      {receipt.comparison.formatVersion === "1.0.0" ? (
        <p className="candidate-set-receipt-legacy-note" role="note">
          这是冻结的旧比较格式：能复核当时记录的状态、变体、偏移、瞬时点与四柱，
          但不宣称覆盖完整时间解析候选指纹。源记录、并列结果和旧凭证均保持原文，不会被静默升级。
        </p>
      ) : null}

      <div className="candidate-set-receipt-counts" aria-label={`${probeCount} 探针并列复算分类摘要`}>
        <StatusPill tone={receipt.comparison.behaviorChangedCount ? "warning" : "neutral"}>
          行为改变 {receipt.comparison.behaviorChangedCount}
        </StatusPill>
        <StatusPill tone={receipt.comparison.hashOnlyChangedCount ? "info" : "neutral"}>
          仅摘要改变 {receipt.comparison.hashOnlyChangedCount}
        </StatusPill>
        <StatusPill tone="neutral">完全一致 {receipt.comparison.unchangedCount}</StatusPill>
      </div>

      <div
        className="candidate-set-receipt-table-wrap"
        role="region"
        aria-label={`候选组时区并列复算 ${probeCount} 个探针对照表；可横向滚动`}
        tabIndex={0}
      >
        <table className="candidate-set-receipt-table" aria-label={`候选组 tzdb 并列复算 ${probeCount} 探针行为与摘要分类`}>
          <thead>
            <tr>
              <th scope="col">探针</th>
              <th scope="col">源状态</th>
              <th scope="col">目标状态</th>
              <th scope="col">行为分类</th>
              <th scope="col">摘要分类</th>
              <th scope="col">变化字段</th>
            </tr>
          </thead>
          <tbody>
            {receipt.comparison.probeDiffs.map((probe) => (
              <tr key={probe.candidateId}>
                <th scope="row" data-label="探针"><code>{safeVisibleText(probe.candidateId, "未知探针", 160)}</code></th>
                <td data-label="源状态">{candidateStatusLabels[probe.sourceStatus]}</td>
                <td data-label="目标状态">{candidateStatusLabels[probe.targetStatus]}</td>
                <td data-label="行为分类">
                  <StatusPill tone={probe.behaviorChanged ? "warning" : "neutral"}>
                    {probe.behaviorChanged ? "行为改变" : "行为未变"}
                  </StatusPill>
                </td>
                <td data-label="摘要分类">
                  <StatusPill tone={probe.hashChanged ? "info" : "neutral"}>
                    {probe.hashChanged ? "摘要改变" : "摘要未变"}
                  </StatusPill>
                </td>
                <td data-label="变化字段">
                  {probe.changedFields.length
                    ? probe.changedFields.map((field) => changedFieldLabels[field]).join("、")
                    : "无"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer>
        <span>凭证 {receiptLabel}</span>
        <code title={receiptDigestLabel}>对照摘要 {shortHash(receiptDigestLabel)}</code>
      </footer>
    </article>
  );
});

function CandidatePillars({ chart }: { chart: CandidateSetRecord["candidateSet"]["candidates"][number]["variants"][number]["chart"] }) {
  return (
    <div className="candidate-set-pillars" role="group" aria-label="该变体四柱">
      {CANDIDATE_PILLAR_POSITIONS.map((position) => {
        const pillar = chart.facts.pillars[position];
        return (
          <span key={position}>
            <small>{safeVisibleText(pillar.label, "未标注", 40)}</small>
            <strong>{safeVisibleText(pillar.ganZhi, "未生成", 40)}</strong>
          </span>
        );
      })}
    </div>
  );
}

const CandidateProbe = memo(function CandidateProbe({ candidate }: { candidate: CandidateSetRecord["candidateSet"]["candidates"][number] }) {
  const variantMode = candidate.variants.length > 1 ? "ambiguous" : candidate.variants.length === 1 ? "single" : "none";
  const statusTone = variantMode === "none" ? "cinnabar" : variantMode === "ambiguous" ? "warning" : "neutral";
  const branchLabel = safeVisibleText(candidate.branch, "未识别", 20);
  const probeHeadingId = `candidate-probe-${candidate.probeIndex}`;

  return (
    <li className="candidate-set-probe" data-status={candidate.status} data-variant-mode={variantMode}>
      <article aria-labelledby={probeHeadingId}>
        <header className="candidate-set-probe__heading">
          <div>
            <p className="eyebrow">并列候选 #{candidate.probeIndex + 1}</p>
            <h3 id={probeHeadingId}>{branchLabel}时</h3>
            <p>
              民用范围 {safeVisibleText(candidate.civilTimeRange.startInclusive, "未识别", 40)}—{safeVisibleText(candidate.civilTimeRange.endExclusive, "未识别", 40)}
              {" · "}代表探针 {safeVisibleText(candidate.representativeTime, "未识别", 40)}
            </p>
          </div>
          <StatusPill tone={statusTone}>
            {candidate.variants.length > 1
              ? `${candidate.variants.length} 个 DST 变体`
              : candidateStatusLabels[candidate.status]}
          </StatusPill>
        </header>

        <dl className="candidate-set-probe__facts">
          <div><dt>候选 ID</dt><dd className="mono">{safeVisibleText(candidate.candidateId, "未知探针", 160)}</dd></div>
          <div><dt>探针性质</dt><dd>{safeVisibleText(candidate.sourceKind, "未识别", 80)} · {safeVisibleText(candidate.verificationStatus, "未识别", 80)}</dd></div>
          <div><dt>时间归一化</dt><dd>{safeVisibleText(candidate.timeCalibration.normalizationStatus, "未识别", 80)}</dd></div>
          <div><dt>DST 解析</dt><dd>{safeVisibleText(candidate.timeCalibration.timeZoneResolution.kind, "未识别", 80)}</dd></div>
        </dl>

        {candidate.variants.length ? (
          <ol className="candidate-set-variant-list" aria-label={`${branchLabel}时的全部时间变体`}>
            {candidate.variants.map((variant, variantIndex) => {
              const variantHash = safeVisibleText(variant.chartResultHash, "摘要不可用", 180);
              return (
              <li key={variant.variantId} className="candidate-set-variant">
                <div className="candidate-set-variant__heading">
                  <div>
                    <strong>{variantChoiceLabels[variant.choice]}</strong>
                    <p>{safeVisibleText(variant.instant, "瞬时点未识别", 100)} · UTC {safeVisibleText(variant.utcOffset, "未识别", 40)}</p>
                  </div>
                  <StatusPill tone={variantMode === "ambiguous" ? "warning" : "info"}>变体 {variantIndex + 1}/{candidate.variants.length}</StatusPill>
                </div>
                <CandidatePillars chart={variant.chart} />
                <p className="candidate-set-hash mono" title={variantHash}>
                  变体摘要 {shortHash(variantHash)}
                </p>
              </li>
              );
            })}
          </ol>
        ) : (
          <div className="candidate-set-unresolved" role="note">
            <strong>没有可用瞬时点</strong>
            <p>{safeVisibleText(candidate.unresolvedReason?.message, "该代表探针未能完成时间解析。")}</p>
          </div>
        )}
      </article>
    </li>
  );
});

export function CandidateSetPage({ candidateSetId }: CandidateSetPageProps) {
  const location = useAppLocation();
  const selectedEvent = parseCandidateSetEventSelection(location.search);
  const routeIdentifierIssue = candidateSetIdentifierIssue(candidateSetId, "地址中的候选组 ID");
  const [state, setState] = useState<CandidateSetPageState>(() => loadingCandidateSetState(candidateSetId));
  const [receiptIndex, setReceiptIndex] = useState<ReceiptIndexState>(() => loadingReceiptIndexState(candidateSetId));
  const [recordRetryVersion, setRecordRetryVersion] = useState(0);
  const [receiptRetryVersion, setReceiptRetryVersion] = useState(0);
  const [migrationConfirmed, setMigrationConfirmed] = useState(false);
  const [migrationState, setMigrationState] = useState<MigrationState>(initialMigrationState);
  const [selectedTargetSnapshotId, setSelectedTargetSnapshotId] = useState<string | null>(null);
  const [probeFilter, setProbeFilter] = useState<CandidateProbeFilter>("all");
  const [exportState, setExportState] = useState<CandidateSetExportState>(initialExportState);
  const [preparedExport, setPreparedExport] = useState<{
    recordId: string;
    artifact: PreparedFileArtifact;
  } | null>(null);
  const exportInFlightRef = useRef(false);
  const migrationInFlightRef = useRef(false);
  const probeOverview = useMemo(() => {
    const candidates = state.record?.candidateSet.candidates;
    if (!candidates) return null;

    let availableCount = 0;
    let ambiguousCount = 0;
    let unresolvedCount = 0;
    let singleVariantCount = 0;
    let variantCount = 0;
    for (const candidate of candidates) {
      variantCount += candidate.variants.length;
      if (candidate.variants.length) availableCount += 1;
      else unresolvedCount += 1;
      if (candidate.variants.length === 1) singleVariantCount += 1;
      if (candidate.variants.length > 1) ambiguousCount += 1;
    }

    return {
      probeCount: candidates.length,
      availableCount,
      ambiguousCount,
      unresolvedCount,
      singleVariantCount,
      variantCount
    };
  }, [state.record]);
  const visibleCandidates = useMemo(() => (
    state.record?.candidateSet.candidates.filter((candidate) => candidateMatchesProbeFilter(candidate, probeFilter)) ?? []
  ), [probeFilter, state.record]);

  useEffect(() => {
    let active = true;
    setState(loadingCandidateSetState(candidateSetId));
    setMigrationConfirmed(false);
    setMigrationState(initialMigrationState);
    setSelectedTargetSnapshotId(null);
    setProbeFilter("all");
    setExportState(initialExportState);
    setPreparedExport(null);
    if (routeIdentifierIssue) {
      setState({
        requestId: candidateSetId,
        status: "error",
        record: null,
        message: routeIdentifierIssue
      });
      return;
    }

    void (async () => {
      try {
        const loaded = await caseRepository.getCandidateSet(candidateSetId);
        if (!active) return;
        if (!loaded) {
          setState({ requestId: candidateSetId, status: "missing", record: null, message: null });
          return;
        }
        assertBoundedCandidateSetPayload(loaded, "候选组记录");
        if (!isCandidateSetRecord(loaded)) {
          setState({ requestId: candidateSetId, status: "error", record: null, message: "读取到的记录不是未知时辰候选组。" });
          return;
        }
        const integrityIssue = candidateSetIntegrityIssue(loaded, candidateSetId);
        if (integrityIssue) {
          setState({ requestId: candidateSetId, status: "error", record: null, message: integrityIssue });
          return;
        }
        setState({ requestId: candidateSetId, status: "ready", record: loaded, message: null });
      } catch (reason: unknown) {
        if (!active) return;
        setState({
          requestId: candidateSetId,
          status: "error",
          record: null,
          message: safeVisibleErrorMessage(reason, "无法读取未知时辰候选组。")
        });
      }
    })();

    return () => {
      active = false;
    };
  }, [candidateSetId, recordRetryVersion, routeIdentifierIssue]);

  useEffect(() => {
    let active = true;
    setReceiptIndex(loadingReceiptIndexState(candidateSetId));
    if (routeIdentifierIssue) {
      setReceiptIndex({
        requestId: candidateSetId,
        status: "error",
        records: [],
        message: routeIdentifierIssue
      });
      return;
    }
    void caseRepository.listTzdbMigrationReceiptsForCandidateSet(candidateSetId)
      .then((records) => {
        if (!active) return;
        assertBoundedCandidateSetPayload(records, "时区并列复算凭证索引");
        const integrityIssue = receiptIndexIntegrityIssue(records, candidateSetId);
        if (integrityIssue) {
          setReceiptIndex({ requestId: candidateSetId, status: "error", records: [], message: integrityIssue });
          return;
        }
        setReceiptIndex({
          requestId: candidateSetId,
          status: "ready",
          records: [...records].sort(compareReceiptsNewestFirst),
          message: null
        });
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setReceiptIndex({
          requestId: candidateSetId,
          status: "error",
          records: [],
          message: safeVisibleErrorMessage(reason, "无法读取时区并列复算凭证。")
        });
      });
    return () => {
      active = false;
    };
  }, [candidateSetId, receiptRetryVersion, routeIdentifierIssue]);

  const retryCandidateSet = () => {
    setState(loadingCandidateSetState(candidateSetId));
    setRecordRetryVersion((current) => current + 1);
  };

  const retryReceiptIndex = () => {
    setReceiptIndex(loadingReceiptIndexState(candidateSetId));
    setReceiptRetryVersion((current) => current + 1);
  };

  if (state.requestId !== candidateSetId || state.status === "loading") {
    return (
      <div
        className="page candidate-set-page"
        data-page-state="loading"
        {...CANDIDATE_SET_SAFETY_ATTRIBUTES}
      >
        <PageHeading eyebrow="Unknown hour candidate set" title="正在读取候选组" />
        <div className="table-skeleton" role="status" aria-label="正在读取未知时辰候选组" />
      </div>
    );
  }

  if (state.status === "missing") {
    return (
      <div
        className="page candidate-set-page"
        data-page-state="missing"
        {...CANDIDATE_SET_SAFETY_ATTRIBUTES}
      >
        <div className="error-panel" role="alert">
          <strong>找不到未知时辰候选组</strong>
          <p>它可能已被删除，或当前链接中的候选组编号不正确。</p>
          <div className="button-row">
            <button type="button" className="primary-action" onClick={retryCandidateSet}><RefreshCw aria-hidden="true" />重新读取</button>
            <AppLink href="/cases" className="secondary-action"><ArrowLeft aria-hidden="true" />返回案例库</AppLink>
          </div>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div
        className="page candidate-set-page"
        data-page-state="error"
        {...CANDIDATE_SET_SAFETY_ATTRIBUTES}
      >
        <div className="error-panel" role="alert">
          <strong>候选组暂不可用</strong>
          <p>{safeVisibleText(state.message, "候选组返回了不可显示的错误。", 900)}</p>
          <div className="button-row">
            <button type="button" className="primary-action" onClick={retryCandidateSet}><RefreshCw aria-hidden="true" />重新读取</button>
            <AppLink href="/cases" className="secondary-action"><ArrowLeft aria-hidden="true" />返回案例库</AppLink>
          </div>
        </div>
      </div>
    );
  }

  const { record } = state;
  const { candidateSet } = record;
  const isTrashed = record.deletedAt !== null;
  const receiptIndexMatchesRecord = receiptIndex.requestId === record.id;
  const receiptsLoading = !receiptIndexMatchesRecord || receiptIndex.status === "loading";
  const receiptBindingIssue = receiptIndexMatchesRecord && receiptIndex.status === "ready"
    ? receiptRecordBindingIssue(receiptIndex.records, record)
      ?? receiptTopologyIntegrityIssue(record.id, receiptIndex.records)
    : null;
  const receiptsError = receiptIndexMatchesRecord && receiptIndex.status === "error"
    ? receiptIndex.message
    : receiptBindingIssue;
  const receipts = receiptIndexMatchesRecord && receiptIndex.status === "ready" && !receiptBindingIssue
    ? receiptIndex.records
    : [];
  const migrationStateForRecord = migrationState.sourceId === record.id ? migrationState : initialMigrationState;
  const migrationBusy = migrationStateForRecord.status === "busy" || migrationInFlightRef.current;
  const exportBusy = exportState.status === "busy" || exportInFlightRef.current;
  const visiblePreparedExport = preparedExport?.recordId === record.id ? preparedExport.artifact : null;
  const resolverStatus = classifyStoredTimeZoneDatabaseForReplay(candidateSet);
  const resolverPresentation = getCandidateSetResolverPresentation(resolverStatus);
  const sourceUsesBundledSnapshot = resolverPresentation.exactResolverAvailable;
  const targetSnapshots = BUNDLED_TZDB_ARTIFACT_REGISTRY.filter((snapshot) => (
    sourceUsesBundledSnapshot
      ? snapshot.snapshotId !== candidateSet.tzdbVersion
      : snapshot.snapshotId === RUNTIME_TZDB_VERSION
  ));
  const effectiveTargetSnapshotId = selectedTargetSnapshotId ?? targetSnapshots[0]?.snapshotId ?? null;
  const targetSnapshot = targetSnapshots.find((snapshot) => snapshot.snapshotId === effectiveTargetSnapshotId) ?? null;
  const inboundReceipt = receipts.find((receipt) => receipt.target.recordId === record.id) ?? null;
  const existingTargetReceipt = targetSnapshot
    ? receipts.find((receipt) => (
        receipt.source.recordId === record.id && receipt.target.tzdbVersion === targetSnapshot.snapshotId
      )) ?? null
    : null;

  async function exportCandidateSet(): Promise<void> {
    if (exportInFlightRef.current) return;
    exportInFlightRef.current = true;
    setExportState({ recordId: record.id, status: "busy", message: null });
    const filename = `hakimi-unknown-hour-candidate-set-${record.id}.json`;
    try {
      const content = `${JSON.stringify(record, null, 2)}\n`;
      setPreparedExport({
        recordId: record.id,
        artifact: {
          blob: new Blob([content], { type: "application/json;charset=utf-8" }),
          filename,
          title: "完整未知时辰候选组 JSON",
          sharePolicy: "blocked_sensitive",
          description: "这份文件已冻结在本机内存，包含完整出生输入、13 个候选探针、规则和时区摘要；只能下载或保存到指定的可信位置，不能进入系统分享。"
        }
      });
      setExportState({
        recordId: record.id,
        status: "info",
        message: "候选组 JSON 已按当前记录冻结；请选择下载或可信位置保存。尚未发生文件交付。"
      });
    } catch (reason: unknown) {
      setExportState({
        recordId: record.id,
        status: "error",
        message: safeVisibleErrorMessage(reason, "候选组 JSON 导出失败。")
      });
    } finally {
      exportInFlightRef.current = false;
    }
  }

  async function deriveBundledTzdbSnapshot(): Promise<void> {
    if (
      isTrashed ||
      !targetSnapshot ||
      !migrationConfirmed ||
      receiptsLoading ||
      receiptsError ||
      migrationBusy ||
      migrationStateForRecord.status === "success" ||
      migrationStateForRecord.status === "commit_unknown" ||
      migrationStateForRecord.status === "committed_unverified" ||
      existingTargetReceipt ||
      inboundReceipt
    ) {
      return;
    }

    if (migrationInFlightRef.current) return;
    migrationInFlightRef.current = true;
    setMigrationState({ sourceId: record.id, status: "busy", message: null, targetId: null });
    let committedDerivation: { targetId: string; receiptId: string } | null = null;
    let commitAttempted = false;
    try {
      const calculated = await calculateUnknownHourCandidatesForBundledSnapshot(
        record.candidateSet.input,
        record.candidateSet.ruleProfile,
        targetSnapshot.snapshotId,
        {
          rulePackBinding: record.candidateSet.rulePackBinding,
          expectedTimeZoneDatabase: targetSnapshot
        }
      );
      assertBoundedCandidateSetPayload(calculated, "并列复算候选 payload");
      const calculatedIntegrityIssue = candidateSetPayloadIntegrityIssue(calculated);
      if (calculatedIntegrityIssue) {
        throw new Error(`并列复算候选 payload 完整性未通过：${calculatedIntegrityIssue}`);
      }
      commitAttempted = true;
      const derived = await caseRepository.deriveCandidateSetTzdbSnapshot({
        sourceCandidateSetId: record.id,
        expectedSourceSnapshotDigest: record.snapshotDigest,
        expectedTargetSnapshotId: targetSnapshot.snapshotId,
        candidateSet: calculated
      });
      const returnedTargetIdIssue = candidateSetIdentifierIssue(derived.target.id, "返回目标 ID");
      const returnedReceiptIdIssue = candidateSetIdentifierIssue(derived.receipt.id, "返回凭证 ID");
      if (returnedTargetIdIssue || returnedReceiptIdIssue) {
        throw new Error(returnedTargetIdIssue ?? returnedReceiptIdIssue ?? "返回标识符不可核对。");
      }
      committedDerivation = { targetId: derived.target.id, receiptId: derived.receipt.id };
      assertBoundedCandidateSetPayload(derived, "并列复算仓库返回结果");
      const targetIntegrityIssue = candidateSetIntegrityIssue(derived.target);
      const receiptIntegrityIssue = tzdbReceiptIntegrityIssue(derived.receipt);
      if (
        targetIntegrityIssue ||
        receiptIntegrityIssue ||
        derived.target.candidateSet.tzdbVersion !== targetSnapshot.snapshotId ||
        !receiptEndpointMatchesRecord(derived.receipt.source, record) ||
        !receiptEndpointMatchesRecord(derived.receipt.target, derived.target)
      ) {
        throw new Error(
          `并列候选组写入调用已经返回，但返回结果无法证明本次源、目标与凭证精确对应。${targetIntegrityIssue ? ` 目标记录：${targetIntegrityIssue}` : ""}${receiptIntegrityIssue ? ` 凭证：${receiptIntegrityIssue}` : ""}`
        );
      }
      setReceiptIndex((current) => current.requestId !== record.id
        ? current
        : {
            requestId: record.id,
            status: "ready",
            message: null,
            records: [
              ...(current.status === "ready" ? current.records : []).filter((receipt) => receipt.id !== derived.receipt.id),
              derived.receipt
            ].sort(compareReceiptsNewestFirst)
          });
      setMigrationConfirmed(false);
      setMigrationState({ sourceId: record.id, status: "success", message: null, targetId: derived.target.id });
    } catch (reason: unknown) {
      const message = safeVisibleErrorMessage(reason, "无法生成并列复算候选组。");
      if (committedDerivation) {
        setMigrationConfirmed(false);
        setMigrationState({
          sourceId: record.id,
          status: "committed_unverified",
          message: `${message} 本页已关闭再次派生，避免生成重复目标或凭证。`,
          targetId: committedDerivation.targetId,
          receiptId: committedDerivation.receiptId
        });
      } else if (commitAttempted) {
        setMigrationConfirmed(false);
        setMigrationState({
          sourceId: record.id,
          status: "commit_unknown",
          message: `${message} 仓库派生调用已经发出，但没有返回可确认的目标与凭证；本页已关闭再次派生，避免重复提交。`,
          targetId: null
        });
      } else {
        setMigrationState({
          sourceId: record.id,
          status: "error",
          message,
          targetId: null
        });
      }
    } finally {
      migrationInFlightRef.current = false;
    }
  }

  return (
    <div
      className="page candidate-set-page"
      data-page-state="ready"
      {...CANDIDATE_SET_SAFETY_ATTRIBUTES}
      data-write-reconciliation-required={migrationStateForRecord.status === "commit_unknown" || migrationStateForRecord.status === "committed_unverified" ? "true" : "false"}
      data-readonly={isTrashed ? "true" : "false"}
      data-result="null"
    >
      <PageHeading
        eyebrow="Unknown hour candidate set"
        title={safeVisibleText(record.alias, "未命名候选组", 160)}
        description="同一出生日期的 13 个代表性时间探针。它们彼此并列，只供校时与结构研究，不推断真实出生时刻。"
        actions={(
          <>
            <AppLink href="/cases" className="secondary-action"><ArrowLeft aria-hidden="true" />返回案例库</AppLink>
            <button type="button" className="secondary-action candidate-set-sensitive-export-action" disabled={exportBusy} aria-busy={exportBusy} onClick={() => void exportCandidateSet()}>
              <Download aria-hidden="true" />{exportBusy ? "正在准备敏感 JSON" : "准备完整候选组 JSON"}
            </button>
          </>
        )}
      />

      <aside className="candidate-set-export-boundary" aria-label="候选组敏感文件交付边界">
        <Info aria-hidden="true" />
        <div><strong>完整候选组 JSON 是敏感本地文件</strong><p>其中保留出生输入、时区、规则绑定和全部候选探针。准备文件不等于已经下载、分享或获得公开发布授权；系统分享入口保持关闭。</p></div>
      </aside>

      {visiblePreparedExport ? (
        <PreparedFileDeliveryDialog
          artifact={visiblePreparedExport}
          exportPort={webReportExportPort}
          onClose={() => setPreparedExport(null)}
        />
      ) : null}

      {isTrashed ? (
        <section className="candidate-set-readonly" role="status" aria-label="回收站只读状态">
          <Info aria-hidden="true" />
          <div><strong>当前候选组已在回收站</strong><p>冻结探针、规则快照、凭证与 JSON 导出仍可读取；恢复前不开放新的时区并列复算。</p></div>
          <AppLink href="/cases" className="secondary-action">返回案例库恢复</AppLink>
        </section>
      ) : null}

      {exportState.recordId === record.id ? (
        <p
          className="candidate-set-export-feedback"
          data-state={exportState.status}
          role={exportState.status === "error" ? "alert" : "status"}
        >{exportState.status === "busy" ? "正在准备候选组 JSON；尚未请求保存或下载。" : safeVisibleText(exportState.message, "候选组文件状态不可用。")}</p>
      ) : null}

      <section className="candidate-set-overview" aria-labelledby="candidate-set-overview-title">
        <header className="candidate-set-overview__heading">
          <div>
            <p className="eyebrow">Parallel probe register</p>
            <h2 id="candidate-set-overview-title">13 个时辰探针，一张都不是主盘</h2>
          </div>
          <p>先看整组分布，再按索引定位单个探针、规则快照或迁移凭证。索引只负责定位，不提供概率、排名或推荐。</p>
        </header>

        {probeOverview ? (
          <dl
            className="candidate-set-overview__metrics"
            aria-label="候选组统计；可横向滚动查看全部五项"
            tabIndex={0}
          >
            <div><dt>并列探针</dt><dd>{probeOverview.probeCount}</dd></div>
            <div><dt>含时间变体</dt><dd>{probeOverview.availableCount}</dd></div>
            <div><dt>DST 双解</dt><dd>{probeOverview.ambiguousCount}</dd></div>
            <div><dt>未解析</dt><dd>{probeOverview.unresolvedCount}</dd></div>
            <div><dt>变体总数</dt><dd>{probeOverview.variantCount}</dd></div>
          </dl>
        ) : null}

        <div className="candidate-set-integrity-note" role="note">
          <Info aria-hidden="true" />
          <div><strong>冻结身份与结构约束已核对</strong><small>13 个非空唯一探针、连续索引、变体身份与解析状态均保持一致；这只是工程完整性，不证明任何探针对应真实出生时刻。</small></div>
          <code title={safeVisibleText(record.snapshotDigest, "摘要不可用", 180)}>快照 {shortHash(safeVisibleText(record.snapshotDigest, "摘要不可用", 180))}</code>
        </div>

        <aside
          className="candidate-set-resolver-capability"
          data-replay-status={resolverStatus}
          aria-label="候选组 resolver 复核能力"
        >
          <StatusPill tone={resolverPresentation.tone}>{resolverPresentation.label}</StatusPill>
          <p>{resolverPresentation.explanation} 这不是原历史程序二进制证明、术数内容真值或公开发布授权。</p>
        </aside>

        {probeOverview ? (
          <div className="candidate-set-probe-filter" role="group" aria-label="按时间解析状态筛选可见探针">
            <div className="candidate-set-probe-filter__summary">
              <small>Probe focus</small>
              <strong>聚焦浏览</strong>
              <span>{visibleCandidates.length} / {probeOverview.probeCount} 可见</span>
            </div>
            <div className="candidate-set-probe-filter__options">
              <button type="button" className={probeFilter === "all" ? "is-active" : ""} aria-pressed={probeFilter === "all"} onClick={() => setProbeFilter("all")}>全部 <b>{probeOverview.probeCount}</b></button>
              <button type="button" className={probeFilter === "single" ? "is-active" : ""} aria-pressed={probeFilter === "single"} disabled={probeOverview.singleVariantCount === 0} onClick={() => setProbeFilter("single")}>单一变体 <b>{probeOverview.singleVariantCount}</b></button>
              <button type="button" className={probeFilter === "ambiguous" ? "is-active" : ""} aria-pressed={probeFilter === "ambiguous"} disabled={probeOverview.ambiguousCount === 0} onClick={() => setProbeFilter("ambiguous")}>DST 多变体 <b>{probeOverview.ambiguousCount}</b></button>
              <button type="button" className={probeFilter === "unresolved" ? "is-active" : ""} aria-pressed={probeFilter === "unresolved"} disabled={probeOverview.unresolvedCount === 0} onClick={() => setProbeFilter("unresolved")}>无可用变体 <b>{probeOverview.unresolvedCount}</b></button>
            </div>
            <p>筛选只改变当前页面的可见性，保持原索引顺序；不赋予概率、排名、推荐或主盘身份。</p>
          </div>
        ) : null}

        <ol className="candidate-set-probe-index" aria-label={`当前显示 ${visibleCandidates.length} 个未知时辰探针概览`}>
          {visibleCandidates.map((candidate) => (
            <li key={candidate.candidateId} data-status={candidate.status} data-variant-mode={candidate.variants.length > 1 ? "ambiguous" : candidate.variants.length ? "single" : "none"}>
              <a
                href={`#candidate-probe-${candidate.probeIndex}`}
                aria-label={`跳到第 ${candidate.probeIndex + 1} 个${safeVisibleText(candidate.branch, "未识别", 20)}时探针`}
              >
                <span>{String(candidate.probeIndex + 1).padStart(2, "0")}</span>
                <strong>{safeVisibleText(candidate.branch, "未识别", 20)}时</strong>
                <small>{safeVisibleText(candidate.representativeTime, "未识别", 40)}</small>
                <em>{candidate.variants.length > 1 ? "DST 多解" : candidate.variants.length ? "单一变体" : "未解析"}</em>
              </a>
            </li>
          ))}
        </ol>

        <nav className="candidate-set-jump-nav" aria-label="候选组页面目录">
          <a href="#candidate-set-probes">查看完整探针</a>
          <a href="#candidate-set-snapshot">规则与摘要</a>
          {targetSnapshots.length || receipts.length || receiptsLoading || receiptsError ? <a href="#candidate-set-tzdb-migration">时区并列复算</a> : null}
          <a href="#candidate-set-research">研究记录</a>
        </nav>
      </section>

      <section className="candidate-set-boundary info-panel" aria-labelledby="candidate-set-boundary-title">
        <Info aria-hidden="true" />
        <div>
          <div className="section-heading-row">
            <div><p className="eyebrow">Research boundary</p><h2 id="candidate-set-boundary-title">未知时辰事实没有被改写</h2></div>
            <StatusPill tone="warning">experimental_probe</StatusPill>
          </div>
          <p>
            原始输入严格保留为 <code>time = null</code> 与 <code>timePrecision = unknown_hour</code>。
            下面的代表时刻只是合成探针，不是真实出生时间；本页不选择、不推荐，也不允许设置任何主盘。
          </p>
        </div>
      </section>

      <section className="flat-section candidate-set-summary" id="candidate-set-input" aria-labelledby="candidate-set-input-title">
        <div className="section-heading-row">
          <div><p className="eyebrow">Original input</p><h2 id="candidate-set-input-title">原始输入与候选范围</h2></div>
          <StatusPill>{candidateSet.probeCount} 个并列探针</StatusPill>
        </div>
        <dl className="overview-facts candidate-set-facts">
          <div><dt>日期</dt><dd>{safeVisibleText(candidateSet.input.date, "未识别日期", 40)} · {candidateSet.input.calendarType === "lunar" ? "农历" : "公历"}{candidateSet.input.lunarLeapMonth ? " · 闰月" : ""}</dd></div>
          <div><dt>原始时间</dt><dd><code>null</code> · 时辰未知</dd></div>
          <div><dt>时间精度</dt><dd><code>{candidateSet.input.timePrecision}</code></dd></div>
          <div><dt>IANA 时区</dt><dd>{safeVisibleText(candidateSet.input.timeZone, "未识别时区", 100)}</dd></div>
          <div><dt>性别字段</dt><dd>{safeVisibleText(candidateSet.input.sex, "未识别", 40)}</dd></div>
          <div><dt>标签</dt><dd>{record.tags.length ? record.tags.map((tag) => safeVisibleText(tag, "未命名标签", 80)).join("、") : "未设置"}</dd></div>
          <div><dt>记录说明</dt><dd>{safeVisibleText(record.notes, "未填写", 600)}</dd></div>
          <div><dt>创建 / 更新</dt><dd>{formatDateTime(record.createdAt)} / {formatDateTime(record.updatedAt)}</dd></div>
        </dl>
      </section>

      <section className="flat-section candidate-set-snapshot" id="candidate-set-snapshot" aria-labelledby="candidate-set-snapshot-title">
        <div className="section-heading-row">
          <div><p className="eyebrow">Frozen snapshot</p><h2 id="candidate-set-snapshot-title">规则、算法与摘要</h2></div>
          <StatusPill tone="warning">只读快照</StatusPill>
        </div>
        <dl className="overview-facts candidate-set-facts">
          <div><dt>规则配置</dt><dd>{safeVisibleText(candidateSet.ruleProfile.label, "未命名规则", 120)} {safeVisibleText(candidateSet.ruleProfile.profileVersion, "版本未识别", 60)} · {safeVisibleText(candidateSet.ruleProfile.status, "状态未识别", 60)}</dd></div>
          <div><dt>换日 / 时基</dt><dd>{safeVisibleText(candidateSet.ruleProfile.calendar.dayBoundary, "未识别", 80)} · {safeVisibleText(candidateSet.ruleProfile.calendar.hourBasis, "未识别", 80)}</dd></div>
          <div><dt>候选算法</dt><dd className="mono">{safeVisibleText(candidateSet.algorithmId, "未识别算法", 140)}</dd></div>
          <div><dt>探针定义</dt><dd className="mono">{safeVisibleText(candidateSet.probeDefinitionVersion, "未识别版本", 100)}</dd></div>
          <div><dt>时区数据库</dt><dd>{candidateSet.timeZoneDatabase ? `IANA ${safeVisibleText(candidateSet.timeZoneDatabase.ianaVersion, "未识别", 40)} · 固定工件` : "旧版浏览器 Intl · 具体版本未识别"}</dd></div>
          {candidateSet.timeZoneDatabase ? <div><dt>tzdb 数据摘要</dt><dd className="mono candidate-set-digest">{safeVisibleText(candidateSet.timeZoneDatabase.dataSha256, "摘要不可用", 180)}</dd></div> : null}
          <div><dt>规则摘要</dt><dd className="mono candidate-set-digest">{safeVisibleText(candidateSet.ruleProfileDigest, "摘要不可用", 180)}</dd></div>
          {candidateSet.rulePackBinding ? <>
            <div><dt>规则包来源</dt><dd>{safeVisibleText(candidateSet.rulePackBinding.packId, "未识别规则包", 140)}</dd></div>
            <div><dt>规则包摘要</dt><dd className="mono candidate-set-digest">{safeVisibleText(candidateSet.rulePackBinding.packDigest, "摘要不可用", 180)}</dd></div>
            <div><dt>绑定 Profile</dt><dd>{safeVisibleText(candidateSet.rulePackBinding.profileId, "未识别 Profile", 120)}@{safeVisibleText(candidateSet.rulePackBinding.profileVersion, "版本未识别", 60)} · 精确使用</dd></div>
            <div><dt>Profile 摘要</dt><dd className="mono candidate-set-digest">{safeVisibleText(candidateSet.rulePackBinding.profileDigest, "摘要不可用", 180)}</dd></div>
          </> : <div><dt>规则包来源</dt><dd>未绑定安装包 · 内置或派生规则快照</dd></div>}
          <div><dt>结果摘要</dt><dd className="mono candidate-set-digest">{safeVisibleText(candidateSet.resultHash, "摘要不可用", 180)}</dd></div>
          <div><dt>存储快照摘要</dt><dd className="mono candidate-set-digest">{safeVisibleText(record.snapshotDigest, "摘要不可用", 180)}</dd></div>
        </dl>
      </section>

      {targetSnapshots.length || receipts.length || receiptsLoading || receiptsError ? (
        <section className="flat-section candidate-set-tzdb-migration" id="candidate-set-tzdb-migration" aria-labelledby="candidate-set-tzdb-migration-title">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Explicit tzdb derivation</p>
              <h2 id="candidate-set-tzdb-migration-title">时区快照并列复算</h2>
            </div>
            <StatusPill tone="warning">基准记录保持只读</StatusPill>
          </div>

          <p className="candidate-set-tzdb-migration__intro">
            当前记录绑定 <code>{safeVisibleText(candidateSet.tzdbVersion, "未识别 tzdb", 120)}</code>。这里使用相同输入、当前命盘引擎、同一规则和探针算法，
            只替换为另一个随包固定 IANA 数据工件并列复算；它不是原历史 App 的运行结果，也不会改写、覆盖或选定任何主盘。
          </p>

          {receiptsLoading ? (
            <div className="candidate-set-receipt-gate" data-state="loading" role="status">
              <RefreshCw className="is-spinning" aria-hidden="true" />
              <div><strong>正在核对关联凭证</strong><p>凭证索引未完成前，不判断已有并列结果，也不开放新的并列复算。</p></div>
            </div>
          ) : receiptsError ? (
            <div className="candidate-set-receipt-gate" data-state="error" role="alert">
              <Info aria-hidden="true" />
              <div>
                <strong>关联凭证暂不可用</strong>
                <p>{safeVisibleText(receiptsError, "关联凭证状态无法核对。") } 候选组冻结事实仍可阅读，但并列复算保持关闭，且不会把未知凭证解释为零条。</p>
                <button type="button" className="secondary-action" onClick={retryReceiptIndex}><RefreshCw aria-hidden="true" />重新读取凭证</button>
              </div>
            </div>
          ) : <>
          {isTrashed ? (
            <div className="candidate-set-migration-result" role="status">
              <Info aria-hidden="true" />
              <div>
                <strong>回收站记录不生成新的并列结果</strong>
                <p>已有凭证继续只读展示；请先回到案例库恢复该候选组，再明确发起新的固定 tzdb 对照。</p>
              </div>
            </div>
          ) : inboundReceipt ? (
            <div className="candidate-set-migration-result" role="status">
              <CheckCircle2 aria-hidden="true" />
              <div>
                <strong>当前记录已经是并列复算结果</strong>
                <p>为避免形成 2026c→2025b→2026c 的派生环，请回到下方凭证中的基准记录继续查看或发起其他直接对照。</p>
                <AppLink href={candidateSetPath(inboundReceipt.source.recordId)} className="secondary-action">
                  打开并列复算基准 <ArrowRight aria-hidden="true" />
                </AppLink>
              </div>
            </div>
          ) : migrationStateForRecord.status === "success" || migrationStateForRecord.status === "commit_unknown" || migrationStateForRecord.status === "committed_unverified" ? null : existingTargetReceipt ? (
            <div className="candidate-set-migration-result" role="status">
              <CheckCircle2 aria-hidden="true" />
              <div>
                <strong>该基准记录已有这一快照的并列结果</strong>
                <p>继续通过下方可核验凭证查看逐探针对照。</p>
                <AppLink href={candidateSetPath(existingTargetReceipt.target.recordId)} className="secondary-action">
                  打开并列候选组 <ArrowRight aria-hidden="true" />
                </AppLink>
              </div>
            </div>
          ) : targetSnapshot ? (
            <div className="candidate-set-migration-controls">
              {targetSnapshots.length > 1 ? (
                <label className="field candidate-set-parallel-selector">
                  <span>并列复算目标快照</span>
                  <select
                    value={targetSnapshot.snapshotId}
                    disabled={migrationBusy}
                    onChange={(event) => {
                      setSelectedTargetSnapshotId(event.currentTarget.value);
                      setMigrationConfirmed(false);
                      setMigrationState(initialMigrationState);
                    }}
                  >
                    {targetSnapshots.map((snapshot) => (
                      <option key={snapshot.snapshotId} value={snapshot.snapshotId}>IANA {safeVisibleText(snapshot.ianaVersion, "未识别", 40)}</option>
                    ))}
                  </select>
                </label>
              ) : null}
              <dl className="overview-facts candidate-set-facts candidate-set-parallel-target" aria-label="并列复算目标工件">
                <div><dt>目标 IANA</dt><dd>{safeVisibleText(targetSnapshot.ianaVersion, "未识别", 40)}</dd></div>
                <div><dt>目标快照</dt><dd className="mono candidate-set-digest">{safeVisibleText(targetSnapshot.snapshotId, "未识别快照", 140)}</dd></div>
                <div><dt>目标数据摘要</dt><dd className="mono candidate-set-digest">{safeVisibleText(targetSnapshot.dataSha256, "摘要不可用", 180)}</dd></div>
              </dl>
              <label className="candidate-set-migration-confirm">
                <input
                  type="checkbox"
                  checked={migrationConfirmed}
                  disabled={migrationBusy}
                  onChange={(event) => setMigrationConfirmed(event.currentTarget.checked)}
                />
                <span>
                  <strong>按目标快照生成并列候选组</strong>
                  <small>我理解这是当前引擎针对另一份固定 tzdb 的反事实并列复算，不是历史原盘或原地升级。</small>
                </span>
              </label>
              <button
                type="button"
                className="primary-action"
                disabled={!migrationConfirmed || migrationBusy}
                aria-busy={migrationBusy}
                onClick={() => void deriveBundledTzdbSnapshot()}
              >
                <RefreshCw className={migrationBusy ? "is-spinning" : undefined} aria-hidden="true" />
                {migrationBusy ? "正在并列复算…" : `按 IANA ${safeVisibleText(targetSnapshot.ianaVersion, "未识别", 40)} 并列复算`}
              </button>
            </div>
          ) : null}

          {migrationStateForRecord.status === "busy" ? (
            <p
              className="candidate-set-migration-progress"
              role="status"
              aria-label={`正在按目标固定 tzdb 并列复算全部 ${candidateSet.probeCount} 个探针`}
            >
              正在按目标固定 tzdb 并列复算全部 {candidateSet.probeCount} 个探针并生成可核验凭证。
            </p>
          ) : null}
          {migrationStateForRecord.status === "error" ? (
            <div className="candidate-set-migration-error" role="alert">
              <strong>没有生成并列候选组</strong>
              <p>{safeVisibleText(migrationStateForRecord.message, "并列复算失败。")}</p>
            </div>
          ) : null}
          {migrationStateForRecord.status === "commit_unknown" ? existingTargetReceipt ? (
            <div className="candidate-set-migration-result" data-resolution-state="reconciled" role="status">
              <Info aria-hidden="true" />
              <div>
                <strong>重新读取凭证后已定位并列结果</strong>
                <p>此前未返回确认的仓库调用现已由源、目标和固定快照绑定一致的凭证协调；不会再次提交派生。</p>
                <AppLink href={candidateSetPath(existingTargetReceipt.target.recordId)} className="secondary-action">
                  打开凭证目标 <ArrowRight aria-hidden="true" />
                </AppLink>
              </div>
            </div>
          ) : (
            <div className="candidate-set-migration-receipt-issue" data-resolution-state="commit_unknown" role="alert" aria-labelledby="candidate-set-migration-commit-unknown-title">
              <TriangleAlert aria-hidden="true" />
              <div>
                <p className="eyebrow">Derivation commit unknown</p>
                <h3 id="candidate-set-migration-commit-unknown-title">提交结果未知，停止重复派生</h3>
                <p>{safeVisibleText(migrationStateForRecord.message, "提交结果无法核对。")}</p>
                <dl>
                  <div><dt>派生源</dt><dd><code>{safeVisibleText(record.id, "未知记录", 160)}</code></dd></div>
                  <div><dt>请求目标</dt><dd><code>{safeVisibleText(targetSnapshot?.snapshotId, "未保留", 140)}</code></dd></div>
                </dl>
                <div className="button-row">
                  <button type="button" className="secondary-action" disabled={receiptsLoading} onClick={retryReceiptIndex}><RefreshCw aria-hidden="true" />{receiptsLoading ? "正在读取凭证" : "重新读取凭证协调"}</button>
                  <AppLink href="/settings/data" className="text-link">先导出完整备份</AppLink>
                </div>
                <small>仓库异常不证明事务未发生。只有新的凭证索引能够把未知结果协调为可核验目标；本页不会把“暂未找到”解释为可以重试。</small>
              </div>
            </div>
          ) : null}
          {migrationStateForRecord.status === "committed_unverified" ? (
            <div className="candidate-set-migration-receipt-issue" role="alert" aria-labelledby="candidate-set-migration-receipt-issue-title">
              <TriangleAlert aria-hidden="true" />
              <div>
                <p className="eyebrow">Derivation receipt unresolved</p>
                <h3 id="candidate-set-migration-receipt-issue-title">不要在本页再次并列复算</h3>
                <p>{safeVisibleText(migrationStateForRecord.message, "返回结果无法核对。")}</p>
                <dl>
                  <div><dt>返回目标</dt><dd><code>{safeVisibleText(migrationStateForRecord.targetId, "未知目标", 160)}</code></dd></div>
                  <div><dt>返回凭证</dt><dd><code>{safeVisibleText(migrationStateForRecord.receiptId, "未知凭证", 160)}</code></dd></div>
                </dl>
                <div className="button-row">
                  <AppLink href={candidateSetPath(migrationStateForRecord.targetId ?? "")} className="secondary-action">打开返回目标<ArrowRight aria-hidden="true" /></AppLink>
                  <button type="button" className="secondary-action" disabled={receiptsLoading} onClick={retryReceiptIndex}><RefreshCw aria-hidden="true" />{receiptsLoading ? "正在读取凭证" : "只重新读取凭证"}</button>
                  <AppLink href="/settings/data" className="text-link">先导出完整备份</AppLink>
                </div>
                <small>页面错误不等于事务未发生。这里只允许读取与核对，不会重新提交派生请求，也不会把返回目标宣称为已验证结果。</small>
              </div>
            </div>
          ) : null}
          {migrationStateForRecord.status === "success" ? (
            <div className="candidate-set-migration-result" role="status">
              <CheckCircle2 aria-hidden="true" />
              <div>
                <strong>并列候选组和可核验凭证已生成，基准记录未改写</strong>
                <p>这只确认本次工程派生与凭证写入状态，不构成真实时辰判断或公开发布授权。</p>
                <AppLink href={candidateSetPath(migrationStateForRecord.targetId ?? "")} className="secondary-action">
                  打开并列候选组 <ArrowRight aria-hidden="true" />
                </AppLink>
              </div>
            </div>
          ) : null}
          </>}
        </section>
      ) : null}

      {receipts.length ? (
        <section className="candidate-set-receipts" id="candidate-set-receipts" aria-labelledby="candidate-set-receipts-title">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Migration evidence</p>
              <h2 id="candidate-set-receipts-title">时区并列复算凭证</h2>
              <p>源快照与目标快照并列展示；{candidateSet.probeCount} 个探针只做行为与摘要分类，不选择主盘。</p>
            </div>
            <StatusPill tone="info">{receipts.length} 条凭证</StatusPill>
          </div>
          <div className="candidate-set-receipt-list">
            {receipts.map((receipt) => (
              <TzdbMigrationReceiptPanel key={receipt.id} receipt={receipt} currentRecordId={record.id} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="candidate-set-probes" id="candidate-set-probes" aria-labelledby="candidate-set-probes-title">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">All probes · no primary chart</p>
            <h2 id="candidate-set-probes-title">{probeFilter === "all" ? `全部 ${candidateSet.probeCount} 个代表性探针` : `聚焦显示 ${visibleCandidates.length} / ${candidateSet.probeCount} 个代表性探针`}</h2>
          </div>
          <StatusPill tone="warning">筛选不选主盘</StatusPill>
        </div>
        <div className="candidate-set-probe-reading-rail" role="note" aria-label="候选探针阅读边界">
          <span className="candidate-set-probe-reading-rail__status">
            <small>Active probe view</small>
            <strong aria-live="polite" aria-atomic="true">
              {probeFilter === "all" ? "全部探针" : probeFilter === "single" ? "单一变体" : probeFilter === "ambiguous" ? "DST 多变体" : "无可用变体"} · {visibleCandidates.length} / {candidateSet.probeCount}
            </strong>
          </span>
          <p id="candidate-set-probe-reading-context">当前可见项仍是并列探针；筛选只改变显示范围，不排序、不推荐、不选主盘。</p>
        </div>
        <ol
          id="candidate-set-probe-list"
          className="candidate-set-probe-list"
          aria-label={`当前显示 ${visibleCandidates.length} / ${candidateSet.probeCount} 个未知时辰代表性探针`}
          aria-describedby="candidate-set-probe-reading-context"
        >
          {visibleCandidates.map((candidate) => (
            <CandidateProbe key={candidate.candidateId} candidate={candidate} />
          ))}
        </ol>
      </section>

      <section className="flat-section candidate-set-limitations" id="candidate-set-limitations" aria-labelledby="candidate-set-limitations-title">
        <div className="section-heading-row">
          <div><p className="eyebrow">Limitations</p><h2 id="candidate-set-limitations-title">实验边界与生成警告</h2></div>
          <StatusPill tone="warning">非金标准</StatusPill>
        </div>
        <ul
          className="warning-list"
          aria-label={`生成警告，共 ${candidateSet.warnings.length || 1} 条${candidateSet.warnings.length > 8 ? "；长列表可滚动" : ""}`}
          tabIndex={candidateSet.warnings.length > 8 ? 0 : undefined}
        >
          {candidateSet.warnings.length
            ? candidateSet.warnings.map((warning, index) => <li key={index}>{safeVisibleText(warning, "未说明的生成警告。")}</li>)
            : <li>当前快照未记录额外生成警告；这只表示生成器没有附加警告，不代表候选已被证实或可选为主盘。</li>}
        </ul>
      </section>

      <section
        className="candidate-set-research-slot"
        id="candidate-set-research"
        aria-labelledby="candidate-set-research-title"
        data-research-slot="candidate-set"
        data-research-subject-id={record.id}
      >
        <div className="candidate-set-research-heading">
          <Microscope aria-hidden="true" />
          <div>
            <p className="eyebrow">Research notes</p>
            <h2 id="candidate-set-research-title">候选组研究记录</h2>
            <p>笔记与事件只绑定整个候选组；不会关联代表探针、DST 变体或虚构修订。</p>
          </div>
        </div>
        <ResearchJournal
          caseId={record.id}
          revision={null}
          defaultTimeZone={record.candidateSet.input.timeZone}
          selectedEventId={selectedEvent.eventId}
          selectedEventError={selectedEvent.error}
          onSelectEvent={(eventId, options) => {
            const search = new URLSearchParams();
            search.set("event", eventId);
            navigate(`${location.pathname}?${search.toString()}`, {
              replace: options?.replace,
              scroll: false
            });
          }}
        />
      </section>
    </div>
  );
}
