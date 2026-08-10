import { ArrowLeft, ArrowRight, CheckCircle2, Download, Info, Microscope, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import {
  isCandidateSetRecord,
  type CandidateSetRecord,
  type CandidateSetTzdbProbeDiffChangedField,
  type TzdbMigrationReceipt
} from "@hakimi/contracts";
import { calculateUnknownHourCandidatesForBundledSnapshot } from "@hakimi/bazi-core";
import { saveTextFile } from "@hakimi/platform";
import { caseRepository } from "@hakimi/storage";
import { RUNTIME_TZDB_VERSION } from "@hakimi/time-core";
import { BUNDLED_TZDB_ARTIFACT_REGISTRY } from "@hakimi/tzdb-core";
import { PageHeading } from "../components/page-heading";
import { ResearchJournal } from "../components/research-journal";
import { StatusPill } from "../components/status-pill";
import { resolveFileDelivery, type FileDeliveryResolution } from "../lib/file-transfer-feedback";
import { formatDateTime, shortHash } from "../lib/format";
import { AppLink, navigate, useAppLocation } from "../lib/router";

type CandidateSetPageProps = {
  candidateSetId: string;
};

const EVENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseCandidateSetEventSelection(search: string): { eventId: string | null; error: string | null } {
  const values = new URLSearchParams(search).getAll("event");
  if (values.length === 0) return { eventId: null, error: null };
  if (values.length !== 1 || !EVENT_ID_PATTERN.test(values[0])) {
    return { eventId: null, error: "event 参数必须是唯一、完整的事件 UUID；没有改用近似事件。" };
  }
  return { eventId: values[0].toLowerCase(), error: null };
}

type CandidateSetPageState =
  | { status: "loading"; record: null; message: null }
  | { status: "ready"; record: CandidateSetRecord; message: null }
  | { status: "missing"; record: null; message: null }
  | { status: "error"; record: null; message: string };

const initialState: CandidateSetPageState = {
  status: "loading",
  record: null,
  message: null
};

type MigrationState =
  | { status: "idle"; message: null; targetId: null }
  | { status: "busy"; message: null; targetId: null }
  | { status: "error"; message: string; targetId: null }
  | { status: "success"; message: null; targetId: string };

const initialMigrationState: MigrationState = {
  status: "idle",
  message: null,
  targetId: null
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

function tzdbLabel(version: string): string {
  const ianaVersion = version.match(/(?:iana-tzdb|tzdb)[@/:_-]([0-9]{4}[a-z])/i)?.[1];
  if (ianaVersion) return `IANA ${ianaVersion}`;
  if (version === "browser-intl-unreported") return "旧版浏览器 Intl · 具体版本未识别";
  return version;
}

function TzdbMigrationReceiptPanel({
  receipt,
  currentRecordId
}: {
  receipt: TzdbMigrationReceipt;
  currentRecordId: string;
}) {
  const isSourceRecord = receipt.source.recordId === currentRecordId;
  const counterpart = isSourceRecord ? receipt.target : receipt.source;
  const relationLabel = isSourceRecord ? "并列复算目标" : "并列复算基准";

  return (
    <article className="candidate-set-receipt" aria-labelledby={`tzdb-receipt-${receipt.id}`}>
      <header className="candidate-set-receipt__heading">
        <div>
          <p className="eyebrow">Parallel replay receipt · {formatDateTime(receipt.createdAt)}</p>
          <h3 id={`tzdb-receipt-${receipt.id}`}>{relationLabel}</h3>
          <p>
            {relationLabel}{" "}
            <AppLink href={`/candidate-sets/${counterpart.recordId}`} className="candidate-set-relation-link">
              <code>{counterpart.recordId}</code><ArrowRight aria-hidden="true" />
            </AppLink>
          </p>
        </div>
        <StatusPill tone={receipt.comparison.formatVersion === "1.0.0" ? "warning" : "info"}>
          13 探针 · comparison {receipt.comparison.formatVersion}
        </StatusPill>
      </header>

      <div className="candidate-set-receipt-endpoints" aria-label="基准与并列复算快照">
        {(["source", "target"] as const).map((side) => {
          const endpoint = receipt[side];
          return (
            <section key={side} aria-label={side === "source" ? "基准快照" : "并列复算快照"}>
              <p className="eyebrow">{side === "source" ? "Source · 基准记录" : "Target · 并列结果"}</p>
              <strong>{tzdbLabel(endpoint.tzdbVersion)}</strong>
              <dl>
                <div><dt>记录 ID</dt><dd><code>{endpoint.recordId}</code></dd></div>
                <div><dt>tzdb</dt><dd><code title={endpoint.tzdbVersion}>{endpoint.tzdbVersion}</code></dd></div>
                <div><dt>结果摘要</dt><dd><code title={endpoint.resultHash}>{shortHash(endpoint.resultHash)}</code></dd></div>
                <div><dt>快照摘要</dt><dd><code title={endpoint.snapshotDigest}>{shortHash(endpoint.snapshotDigest)}</code></dd></div>
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

      <div className="candidate-set-receipt-counts" aria-label="13 探针并列复算分类摘要">
        <StatusPill tone={receipt.comparison.behaviorChangedCount ? "warning" : "neutral"}>
          行为改变 {receipt.comparison.behaviorChangedCount}
        </StatusPill>
        <StatusPill tone={receipt.comparison.hashOnlyChangedCount ? "info" : "neutral"}>
          仅摘要改变 {receipt.comparison.hashOnlyChangedCount}
        </StatusPill>
        <StatusPill tone="jade">完全一致 {receipt.comparison.unchangedCount}</StatusPill>
      </div>

      <div className="candidate-set-receipt-table-wrap">
        <table className="candidate-set-receipt-table" aria-label="候选组 tzdb 并列复算 13 探针行为与摘要分类">
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
                <th scope="row" data-label="探针"><code>{probe.candidateId}</code></th>
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
        <span>凭证 {receipt.id}</span>
        <code title={receipt.comparisonDigest}>对照摘要 {shortHash(receipt.comparisonDigest)}</code>
      </footer>
    </article>
  );
}

function CandidatePillars({ chart }: { chart: CandidateSetRecord["candidateSet"]["candidates"][number]["variants"][number]["chart"] }) {
  return (
    <div className="candidate-set-pillars" role="group" aria-label="该变体四柱">
      {Object.values(chart.facts.pillars).map((pillar) => (
        <span key={pillar.name}>
          <small>{pillar.label}</small>
          <strong>{pillar.ganZhi}</strong>
        </span>
      ))}
    </div>
  );
}

function CandidateProbe({ candidate }: { candidate: CandidateSetRecord["candidateSet"]["candidates"][number] }) {
  const statusTone = candidate.status === "calculated" ? "neutral" : "warning";

  return (
    <li className="candidate-set-probe">
      <article aria-labelledby={`candidate-probe-${candidate.candidateId}`}>
        <header className="candidate-set-probe__heading">
          <div>
            <p className="eyebrow">并列候选 #{candidate.probeIndex + 1}</p>
            <h3 id={`candidate-probe-${candidate.candidateId}`}>{candidate.branch}时</h3>
            <p>
              民用范围 {candidate.civilTimeRange.startInclusive}—{candidate.civilTimeRange.endExclusive}
              {" · "}代表探针 {candidate.representativeTime}
            </p>
          </div>
          <StatusPill tone={statusTone}>
            {candidate.variants.length > 1
              ? `${candidate.variants.length} 个 DST 变体`
              : candidateStatusLabels[candidate.status]}
          </StatusPill>
        </header>

        <dl className="candidate-set-probe__facts">
          <div><dt>候选 ID</dt><dd className="mono">{candidate.candidateId}</dd></div>
          <div><dt>探针性质</dt><dd>{candidate.sourceKind} · {candidate.verificationStatus}</dd></div>
          <div><dt>时间归一化</dt><dd>{candidate.timeCalibration.normalizationStatus}</dd></div>
          <div><dt>DST 解析</dt><dd>{candidate.timeCalibration.timeZoneResolution.kind}</dd></div>
        </dl>

        {candidate.variants.length ? (
          <ol className="candidate-set-variant-list" aria-label={`${candidate.branch}时的全部时间变体`}>
            {candidate.variants.map((variant) => (
              <li key={variant.variantId} className="candidate-set-variant">
                <div className="candidate-set-variant__heading">
                  <div>
                    <strong>{variantChoiceLabels[variant.choice]}</strong>
                    <p>{variant.instant} · UTC {variant.utcOffset}</p>
                  </div>
                  <StatusPill>{variant.choice}</StatusPill>
                </div>
                <CandidatePillars chart={variant.chart} />
                <p className="candidate-set-hash mono" title={variant.chartResultHash}>
                  变体摘要 {shortHash(variant.chartResultHash)}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <div className="candidate-set-unresolved" role="note">
            <strong>没有可用瞬时点</strong>
            <p>{candidate.unresolvedReason?.message ?? "该代表探针未能完成时间解析。"}</p>
          </div>
        )}
      </article>
    </li>
  );
}

export function CandidateSetPage({ candidateSetId }: CandidateSetPageProps) {
  const location = useAppLocation();
  const selectedEvent = parseCandidateSetEventSelection(location.search);
  const [state, setState] = useState<CandidateSetPageState>(initialState);
  const [receipts, setReceipts] = useState<TzdbMigrationReceipt[]>([]);
  const [migrationConfirmed, setMigrationConfirmed] = useState(false);
  const [migrationState, setMigrationState] = useState<MigrationState>(initialMigrationState);
  const [selectedTargetSnapshotId, setSelectedTargetSnapshotId] = useState<string | null>(null);
  const [exportFeedback, setExportFeedback] = useState<FileDeliveryResolution | null>(null);

  useEffect(() => {
    let active = true;
    setState(initialState);
    setReceipts([]);
    setMigrationConfirmed(false);
    setMigrationState(initialMigrationState);
    setSelectedTargetSnapshotId(null);

    void (async () => {
      try {
        const loaded = await caseRepository.getCandidateSet(candidateSetId);
        if (!active) return;
        if (!loaded) {
          setState({ status: "missing", record: null, message: null });
          return;
        }
        if (!isCandidateSetRecord(loaded)) {
          setState({ status: "error", record: null, message: "读取到的记录不是未知时辰候选组。" });
          return;
        }

        const linkedReceipts = await caseRepository.listTzdbMigrationReceiptsForCandidateSet(candidateSetId);
        if (!active) return;
        setReceipts(linkedReceipts);
        setState({ status: "ready", record: loaded, message: null });
      } catch (reason: unknown) {
        if (!active) return;
        setState({
          status: "error",
          record: null,
          message: reason instanceof Error ? reason.message : "无法读取未知时辰候选组。"
        });
      }
    })();

    return () => {
      active = false;
    };
  }, [candidateSetId]);

  if (state.status === "loading") {
    return (
      <div className="page candidate-set-page">
        <PageHeading eyebrow="Unknown hour candidate set" title="正在读取候选组" />
        <div className="table-skeleton" role="status" aria-label="正在读取未知时辰候选组" />
      </div>
    );
  }

  if (state.status === "missing") {
    return (
      <div className="page candidate-set-page">
        <div className="error-panel" role="alert">
          <strong>找不到未知时辰候选组</strong>
          <p>它可能已被删除，或当前链接中的候选组编号不正确。</p>
          <AppLink href="/cases" className="secondary-action"><ArrowLeft aria-hidden="true" />返回案例库</AppLink>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="page candidate-set-page">
        <div className="error-panel" role="alert">
          <strong>候选组暂不可用</strong>
          <p>{state.message}</p>
          <AppLink href="/cases" className="secondary-action"><ArrowLeft aria-hidden="true" />返回案例库</AppLink>
        </div>
      </div>
    );
  }

  const { record } = state;
  const { candidateSet } = record;
  const sourceUsesBundledSnapshot = BUNDLED_TZDB_ARTIFACT_REGISTRY.some(
    (snapshot) => snapshot.snapshotId === candidateSet.tzdbVersion
  );
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
    const filename = `hakimi-unknown-hour-candidate-set-${record.id}.json`;
    const result = await saveTextFile(
      filename,
      `${JSON.stringify(record, null, 2)}\n`,
      "application/json;charset=utf-8"
    );
    setExportFeedback(resolveFileDelivery(result, "候选组 JSON 导出"));
  }

  async function deriveBundledTzdbSnapshot(): Promise<void> {
    if (
      !targetSnapshot ||
      !migrationConfirmed ||
      migrationState.status === "busy" ||
      migrationState.status === "success" ||
      existingTargetReceipt ||
      inboundReceipt
    ) {
      return;
    }

    setMigrationState({ status: "busy", message: null, targetId: null });
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
      const derived = await caseRepository.deriveCandidateSetTzdbSnapshot({
        sourceCandidateSetId: record.id,
        expectedSourceSnapshotDigest: record.snapshotDigest,
        expectedTargetSnapshotId: targetSnapshot.snapshotId,
        candidateSet: calculated
      });
      setReceipts((current) => [
        ...current.filter((receipt) => receipt.id !== derived.receipt.id),
        derived.receipt
      ].sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
      setMigrationConfirmed(false);
      setMigrationState({ status: "success", message: null, targetId: derived.target.id });
    } catch (reason: unknown) {
      setMigrationState({
        status: "error",
        message: reason instanceof Error ? reason.message : "无法生成并列复算候选组。",
        targetId: null
      });
    }
  }

  return (
    <div className="page candidate-set-page">
      <PageHeading
        eyebrow="Unknown hour candidate set"
        title={record.alias}
        description="同一出生日期的 13 个代表性时间探针。它们彼此并列，只供校时与结构研究，不推断真实出生时刻。"
        actions={(
          <>
            <AppLink href="/cases" className="secondary-action"><ArrowLeft aria-hidden="true" />返回案例库</AppLink>
            <button type="button" className="primary-action" onClick={() => void exportCandidateSet()}>
              <Download aria-hidden="true" />导出候选组 JSON
            </button>
          </>
        )}
      />

      {exportFeedback ? (
        <p
          className={exportFeedback.kind === "error" ? "inline-error" : "success-message"}
          role={exportFeedback.kind === "error" ? "alert" : "status"}
        >{exportFeedback.message}</p>
      ) : null}

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

      <section className="flat-section candidate-set-summary" aria-labelledby="candidate-set-input-title">
        <div className="section-heading-row">
          <div><p className="eyebrow">Original input</p><h2 id="candidate-set-input-title">原始输入与候选范围</h2></div>
          <StatusPill>{candidateSet.probeCount} 个并列探针</StatusPill>
        </div>
        <dl className="overview-facts candidate-set-facts">
          <div><dt>日期</dt><dd>{candidateSet.input.date} · {candidateSet.input.calendarType === "lunar" ? "农历" : "公历"}{candidateSet.input.lunarLeapMonth ? " · 闰月" : ""}</dd></div>
          <div><dt>原始时间</dt><dd><code>null</code> · 时辰未知</dd></div>
          <div><dt>时间精度</dt><dd><code>{candidateSet.input.timePrecision}</code></dd></div>
          <div><dt>IANA 时区</dt><dd>{candidateSet.input.timeZone}</dd></div>
          <div><dt>性别字段</dt><dd>{candidateSet.input.sex}</dd></div>
          <div><dt>标签</dt><dd>{record.tags.length ? record.tags.join("、") : "未设置"}</dd></div>
          <div><dt>记录说明</dt><dd>{record.notes || "未填写"}</dd></div>
          <div><dt>创建 / 更新</dt><dd>{formatDateTime(record.createdAt)} / {formatDateTime(record.updatedAt)}</dd></div>
        </dl>
      </section>

      <section className="flat-section candidate-set-snapshot" aria-labelledby="candidate-set-snapshot-title">
        <div className="section-heading-row">
          <div><p className="eyebrow">Frozen snapshot</p><h2 id="candidate-set-snapshot-title">规则、算法与摘要</h2></div>
          <StatusPill tone="warning">只读快照</StatusPill>
        </div>
        <dl className="overview-facts candidate-set-facts">
          <div><dt>规则配置</dt><dd>{candidateSet.ruleProfile.label} {candidateSet.ruleProfile.profileVersion} · {candidateSet.ruleProfile.status}</dd></div>
          <div><dt>换日 / 时基</dt><dd>{candidateSet.ruleProfile.calendar.dayBoundary} · {candidateSet.ruleProfile.calendar.hourBasis}</dd></div>
          <div><dt>候选算法</dt><dd className="mono">{candidateSet.algorithmId}</dd></div>
          <div><dt>探针定义</dt><dd className="mono">{candidateSet.probeDefinitionVersion}</dd></div>
          <div><dt>时区数据库</dt><dd>{candidateSet.timeZoneDatabase ? `IANA ${candidateSet.timeZoneDatabase.ianaVersion} · 固定工件` : "旧版浏览器 Intl · 具体版本未识别"}</dd></div>
          {candidateSet.timeZoneDatabase ? <div><dt>tzdb 数据摘要</dt><dd className="mono candidate-set-digest">{candidateSet.timeZoneDatabase.dataSha256}</dd></div> : null}
          <div><dt>规则摘要</dt><dd className="mono candidate-set-digest">{candidateSet.ruleProfileDigest}</dd></div>
          {candidateSet.rulePackBinding ? <>
            <div><dt>规则包来源</dt><dd>{candidateSet.rulePackBinding.packId}</dd></div>
            <div><dt>规则包摘要</dt><dd className="mono candidate-set-digest">{candidateSet.rulePackBinding.packDigest}</dd></div>
            <div><dt>绑定 Profile</dt><dd>{candidateSet.rulePackBinding.profileId}@{candidateSet.rulePackBinding.profileVersion} · 精确使用</dd></div>
            <div><dt>Profile 摘要</dt><dd className="mono candidate-set-digest">{candidateSet.rulePackBinding.profileDigest}</dd></div>
          </> : <div><dt>规则包来源</dt><dd>未绑定安装包 · 内置或派生规则快照</dd></div>}
          <div><dt>结果摘要</dt><dd className="mono candidate-set-digest">{candidateSet.resultHash}</dd></div>
          <div><dt>存储快照摘要</dt><dd className="mono candidate-set-digest">{record.snapshotDigest}</dd></div>
        </dl>
      </section>

      {targetSnapshots.length || inboundReceipt ? (
        <section className="flat-section candidate-set-tzdb-migration" aria-labelledby="candidate-set-tzdb-migration-title">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Explicit tzdb derivation</p>
              <h2 id="candidate-set-tzdb-migration-title">时区快照并列复算</h2>
            </div>
            <StatusPill tone="warning">基准记录保持只读</StatusPill>
          </div>

          <p className="candidate-set-tzdb-migration__intro">
            当前记录绑定 <code>{candidateSet.tzdbVersion}</code>。这里使用相同输入、当前命盘引擎、同一规则和探针算法，
            只替换为另一个随包固定 IANA 数据工件并列复算；它不是原历史 App 的运行结果，也不会改写、覆盖或选定任何主盘。
          </p>

          {inboundReceipt ? (
            <div className="candidate-set-migration-result" role="status">
              <CheckCircle2 aria-hidden="true" />
              <div>
                <strong>当前记录已经是并列复算结果</strong>
                <p>为避免形成 2026c→2025b→2026c 的派生环，请回到下方凭证中的基准记录继续查看或发起其他直接对照。</p>
                <AppLink href={`/candidate-sets/${inboundReceipt.source.recordId}`} className="secondary-action">
                  打开并列复算基准 <ArrowRight aria-hidden="true" />
                </AppLink>
              </div>
            </div>
          ) : migrationState.status === "success" ? null : existingTargetReceipt ? (
            <div className="candidate-set-migration-result" role="status">
              <CheckCircle2 aria-hidden="true" />
              <div>
                <strong>该基准记录已有这一快照的并列结果</strong>
                <p>继续通过下方可核验凭证查看逐探针对照。</p>
                <AppLink href={`/candidate-sets/${existingTargetReceipt.target.recordId}`} className="secondary-action">
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
                    disabled={migrationState.status === "busy"}
                    onChange={(event) => {
                      setSelectedTargetSnapshotId(event.currentTarget.value);
                      setMigrationConfirmed(false);
                      setMigrationState(initialMigrationState);
                    }}
                  >
                    {targetSnapshots.map((snapshot) => (
                      <option key={snapshot.snapshotId} value={snapshot.snapshotId}>IANA {snapshot.ianaVersion}</option>
                    ))}
                  </select>
                </label>
              ) : null}
              <dl className="overview-facts candidate-set-facts candidate-set-parallel-target" aria-label="并列复算目标工件">
                <div><dt>目标 IANA</dt><dd>{targetSnapshot.ianaVersion}</dd></div>
                <div><dt>目标快照</dt><dd className="mono candidate-set-digest">{targetSnapshot.snapshotId}</dd></div>
                <div><dt>目标数据摘要</dt><dd className="mono candidate-set-digest">{targetSnapshot.dataSha256}</dd></div>
              </dl>
              <label className="candidate-set-migration-confirm">
                <input
                  type="checkbox"
                  checked={migrationConfirmed}
                  disabled={migrationState.status === "busy"}
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
                disabled={!migrationConfirmed || migrationState.status === "busy"}
                onClick={() => void deriveBundledTzdbSnapshot()}
              >
                <RefreshCw className={migrationState.status === "busy" ? "is-spinning" : undefined} aria-hidden="true" />
                {migrationState.status === "busy" ? "正在并列复算…" : `按 IANA ${targetSnapshot.ianaVersion} 并列复算`}
              </button>
            </div>
          ) : null}

          {migrationState.status === "busy" ? (
            <p
              className="candidate-set-migration-progress"
              role="status"
              aria-label="正在按目标固定 tzdb 并列复算全部 13 个探针"
            >
              正在按目标固定 tzdb 并列复算全部 13 个探针并生成可核验凭证。
            </p>
          ) : null}
          {migrationState.status === "error" ? (
            <div className="candidate-set-migration-error" role="alert">
              <strong>没有生成并列候选组</strong>
              <p>{migrationState.message}</p>
            </div>
          ) : null}
          {migrationState.status === "success" ? (
            <div className="candidate-set-migration-result" role="status">
              <CheckCircle2 aria-hidden="true" />
              <div>
                <strong>并列候选组和可核验凭证已生成，基准记录未改写</strong>
                <AppLink href={`/candidate-sets/${migrationState.targetId}`} className="secondary-action">
                  打开并列候选组 <ArrowRight aria-hidden="true" />
                </AppLink>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {receipts.length ? (
        <section className="candidate-set-receipts" aria-labelledby="candidate-set-receipts-title">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Migration evidence</p>
              <h2 id="candidate-set-receipts-title">时区并列复算凭证</h2>
              <p>源快照与目标快照并列展示；13 个探针只做行为与摘要分类，不选择主盘。</p>
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

      <section className="candidate-set-probes" aria-labelledby="candidate-set-probes-title">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">All probes · no primary chart</p>
            <h2 id="candidate-set-probes-title">全部 13 个代表性探针</h2>
          </div>
          <StatusPill tone="warning">不选主盘</StatusPill>
        </div>
        <ol className="candidate-set-probe-list" aria-label="13 个未知时辰代表性探针">
          {candidateSet.candidates.map((candidate) => (
            <CandidateProbe key={candidate.candidateId} candidate={candidate} />
          ))}
        </ol>
      </section>

      <section className="flat-section candidate-set-limitations" aria-labelledby="candidate-set-limitations-title">
        <div className="section-heading-row">
          <div><p className="eyebrow">Limitations</p><h2 id="candidate-set-limitations-title">实验边界与生成警告</h2></div>
          <StatusPill tone="warning">非金标准</StatusPill>
        </div>
        <ul className="warning-list">
          {candidateSet.warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      </section>

      <section
        className="candidate-set-research-slot"
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
