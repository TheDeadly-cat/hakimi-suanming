import { History, RotateCcw } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type {
  RevisionCalculationReceipt,
  RevisionCalculationReceiptChangedComponent,
  RevisionCalculationReceiptComparison
} from "@hakimi/revision-replay";
import { caseRepository } from "@hakimi/storage";
import { formatDateTime, shortHash } from "../lib/format";
import { StatusPill } from "./status-pill";
import "./revision-integrity-console.css";
import "./revision-calculation-receipts-panel.css";

type Props = {
  revisionId: string;
  refreshToken: number;
};

const changedComponentLabels: Record<RevisionCalculationReceiptChangedComponent, string> = {
  relations: "干支关系",
  luckCycle: "起运与大运",
  transit: "运限切片"
};
const comparisonComponentNames = ["relations", "luckCycle", "transit"] as const;
const EMPTY_RECEIPTS: readonly RevisionCalculationReceipt[] = [];
const MAX_REVISION_RECEIPTS = 10_000;
const RECEIPT_VERIFICATION_CONCURRENCY = 8;
const INITIAL_VISIBLE_RECEIPTS = 48;
const VISIBLE_RECEIPT_STEP = 48;
const componentProjectionStatuses = ["projected", "unavailable", "not_requested"] as const;
const comparisonStatuses = ["matched", "mismatch", "exact_executor_unavailable"] as const;
const unsafeVisibleTextPattern = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/gu;
const sensitiveCredentialPattern = /\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|bearer|secret)\b(?:\s*[:=]\s*|\s+)[^\s,;]+/giu;
const visibleUrlPattern = /\b(?:https?|file):\/\/[^\s"'<>]+/giu;
const localPathPattern = /(?:[a-z]:\\|\\\\)[^\s"'<>]+/giu;

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
  const normalized = value
    .replace(unsafeVisibleTextPattern, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return takeCodePoints(normalized, maxCodePoints) || fallback;
}

function isNonEmptyString(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && safeVisibleText(trimmed, "", 512) === trimmed;
}

function isAllowedValue(value: unknown, allowed: readonly string[]): boolean {
  return typeof value === "string" && allowed.includes(value);
}

function errorMessage(reason: unknown, fallback: string): string {
  try {
    const visible = safeVisibleText(reason instanceof Error ? reason.message : "", fallback, 360);
    return visible
      .replace(sensitiveCredentialPattern, "[凭据已隐藏]")
      .replace(visibleUrlPattern, "[链接已隐藏]")
      .replace(localPathPattern, "[本地路径已隐藏]");
  } catch {
    return fallback;
  }
}

function displayIdentifier(value: unknown): string {
  if (!isNonEmptyString(value)) return "不可显示";
  const characters = Array.from(value);
  if (characters.length <= 96) return value;
  return `${characters.slice(0, 48).join("")}…${characters.slice(-32).join("")}`;
}

function captureKindLabel(receipt: RevisionCalculationReceipt): string {
  if (receipt.captureKind === "revision_creation_baseline") return "创建基线";
  if (receipt.captureKind === "explicit_calculation_snapshot") return "显式计算快照";
  return "类型不可识别";
}

function manualDirectionLabel(receipt: RevisionCalculationReceipt): string {
  const direction = receipt.projection.request.manualDirection;
  if (direction === "forward") return "人工顺行";
  if (direction === "backward") return "人工逆行";
  if (direction === null) return "未人工覆盖";
  return "顺逆状态不可识别";
}

function projectionComponentStatusLabel(status: string | null): string {
  if (status === "projected") return "已投影";
  if (status === "unavailable") return "不可用";
  if (status === "not_requested") return "未请求";
  return "无可核对结果";
}

function comparisonStatusLabel(status: string): string {
  if (status === "matched") return "一致";
  if (status === "exact_executor_unavailable") return "精确执行器缺失";
  if (status === "mismatch") return "存在差异";
  return "状态不可识别";
}

function exactReplayStatusLabel(status: string): string {
  if (status === "running") return "执行中";
  if (status === "matched") return "保存输出一致";
  if (status === "mismatch") return "发现差异";
  if (status === "exact_executor_unavailable") return "执行器未保留";
  if (status === "error") return "失败关闭";
  return "尚未执行";
}

function ComparisonComponentLedger({ comparison }: { comparison: RevisionCalculationReceiptComparison }) {
  return (
    <ul className="revision-receipt-comparison-ledger" aria-label="精确复演组件比较">
      {comparisonComponentNames.map((name) => {
        const component = comparison.componentStatuses[name];
        return (
          <li key={name} data-comparison-state={component.comparisonStatus}>
            <span>{changedComponentLabels[name]}</span>
            <strong>{comparisonStatusLabel(component.comparisonStatus)}</strong>
            <small>
              保存 {projectionComponentStatusLabel(component.storedStatus)} · 复演 {projectionComponentStatusLabel(component.replayedStatus)}
            </small>
          </li>
        );
      })}
    </ul>
  );
}

function assertReceiptIndexBinding(
  receipts: readonly RevisionCalculationReceipt[],
  revisionId: string
): void {
  const ids = new Set<string>();
  let sourceBinding: string | null = null;
  for (const receipt of receipts) {
    if (receipt.sourceRevision.revisionId !== revisionId) {
      throw new Error("计算收据索引返回了不属于当前 Revision 的记录，整段历史已拒绝显示。");
    }
    if (ids.has(receipt.id)) {
      throw new Error("计算收据索引返回了重复 ID，整段历史已拒绝显示。");
    }
    ids.add(receipt.id);
    const nextSourceBinding = JSON.stringify({
      caseId: receipt.sourceRevision.caseId,
      revisionNumber: receipt.sourceRevision.revisionNumber,
      snapshotDigest: receipt.sourceRevision.snapshotDigest,
      natalResultHash: receipt.sourceRevision.natalResultHash
    });
    if (sourceBinding !== null && sourceBinding !== nextSourceBinding) {
      throw new Error("同一 Revision 的计算收据引用了不一致的源编号或快照摘要，整段历史已拒绝显示。");
    }
    sourceBinding = nextSourceBinding;
  }
}

async function mapWithConcurrency<T, Result>(
  values: readonly T[],
  concurrency: number,
  operation: (value: T, index: number) => Promise<Result>
): Promise<Result[]> {
  const results = new Array<Result>(values.length);
  let nextIndex = 0;
  let stopped = false;
  const workerCount = Math.min(Math.max(1, concurrency), values.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (!stopped && nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        results[index] = await operation(values[index]!, index);
      } catch (reason) {
        stopped = true;
        throw reason;
      }
    }
  });
  await Promise.all(workers);
  return results;
}

async function verifyReceiptIndex(
  rawReceipts: unknown,
  revisionId: string
): Promise<readonly RevisionCalculationReceipt[]> {
  if (!Array.isArray(rawReceipts)) {
    throw new Error("计算收据索引返回了非列表数据，整段历史已拒绝显示。");
  }
  if (rawReceipts.length > MAX_REVISION_RECEIPTS) {
    throw new Error("计算收据索引超过 " + MAX_REVISION_RECEIPTS + " 条本地核对上限，整段历史已拒绝显示。");
  }
  const { verifyRevisionCalculationReceiptIntegrity } = await import("@hakimi/revision-replay");
  const verifiedReceipts = await mapWithConcurrency(
    rawReceipts,
    RECEIPT_VERIFICATION_CONCURRENCY,
    (receipt) => verifyRevisionCalculationReceiptIntegrity(receipt)
  );
  assertReceiptIndexBinding(verifiedReceipts, revisionId);
  return verifiedReceipts;
}

function assertComparisonShape(comparison: RevisionCalculationReceiptComparison): void {
  if (
    !comparison
    || typeof comparison !== "object"
    || comparison.storedHistoricalOutputCompared !== true
    || !comparison.replayedProjection
    || typeof comparison.replayedProjection !== "object"
    || !isAllowedValue(comparison.status, comparisonStatuses)
  ) {
    throw new Error("精确复演返回了未知的总比较状态。");
  }
  if (!Array.isArray(comparison.changedComponents)) {
    throw new Error("精确复演返回了无效的变化组件列表。");
  }
  const changed = new Set<string>();
  for (const component of comparison.changedComponents) {
    if (!isAllowedValue(component, comparisonComponentNames) || changed.has(component)) {
      throw new Error("精确复演返回了未知或重复的变化组件。");
    }
    changed.add(component);
  }
  for (const name of comparisonComponentNames) {
    const component = comparison.componentStatuses?.[name];
    if (
      !component
      || !isAllowedValue(component.comparisonStatus, comparisonStatuses)
      || !isAllowedValue(component.storedStatus, componentProjectionStatuses)
      || (component.replayedStatus !== null && !isAllowedValue(component.replayedStatus, componentProjectionStatuses))
    ) {
      throw new Error("精确复演返回了未知或不完整的组件比较状态。");
    }
  }
  const expectedChangedComponents = comparisonComponentNames.filter(
    (name) => comparison.componentStatuses[name].comparisonStatus !== "matched"
  );
  if (
    expectedChangedComponents.length !== comparison.changedComponents.length
    || expectedChangedComponents.some((name, index) => comparison.changedComponents[index] !== name)
  ) {
    throw new Error("精确复演的变化组件列表与逐组件比较状态不一致。");
  }
  const hasComponentMismatch = comparisonComponentNames.some(
    (name) => comparison.componentStatuses[name].comparisonStatus === "mismatch"
  );
  const hasUnavailableExecutor = comparisonComponentNames.some(
    (name) => comparison.componentStatuses[name].comparisonStatus === "exact_executor_unavailable"
  );
  if (
    (comparison.status === "matched" && expectedChangedComponents.length !== 0)
    || (comparison.status === "exact_executor_unavailable" && (hasComponentMismatch || !hasUnavailableExecutor))
    || (hasComponentMismatch && comparison.status !== "mismatch")
  ) {
    throw new Error("精确复演的总状态与逐组件比较状态不一致。");
  }
}

function assertReplayReceiptBinding(
  indexedReceipt: RevisionCalculationReceipt,
  candidateReceipt: RevisionCalculationReceipt,
  revisionId: string,
  stageLabel: string
): void {
  const bindingChanged = candidateReceipt.id !== indexedReceipt.id
    || candidateReceipt.sourceRevision.revisionId !== revisionId
    || candidateReceipt.sourceRevision.revisionId !== indexedReceipt.sourceRevision.revisionId
    || candidateReceipt.sourceRevision.caseId !== indexedReceipt.sourceRevision.caseId
    || candidateReceipt.sourceRevision.revisionNumber !== indexedReceipt.sourceRevision.revisionNumber
    || candidateReceipt.sourceRevision.snapshotDigest !== indexedReceipt.sourceRevision.snapshotDigest
    || candidateReceipt.sourceRevision.natalResultHash !== indexedReceipt.sourceRevision.natalResultHash
    || candidateReceipt.createdAt !== indexedReceipt.createdAt
    || candidateReceipt.captureKind !== indexedReceipt.captureKind
    || candidateReceipt.requestFingerprint !== indexedReceipt.requestFingerprint
    || candidateReceipt.receiptDigest !== indexedReceipt.receiptDigest
    || candidateReceipt.projection.sourceRevisionId !== indexedReceipt.projection.sourceRevisionId
    || candidateReceipt.projection.sourceRevisionSnapshotDigest !== indexedReceipt.projection.sourceRevisionSnapshotDigest
    || candidateReceipt.projection.sourceNatalResultHash !== indexedReceipt.projection.sourceNatalResultHash
    || candidateReceipt.projection.profile.profileId !== indexedReceipt.projection.profile.profileId
    || candidateReceipt.projection.profile.schemaVersion !== indexedReceipt.projection.profile.schemaVersion
    || candidateReceipt.projection.projectionDigest !== indexedReceipt.projection.projectionDigest
    || candidateReceipt.projection.status !== indexedReceipt.projection.status
    || candidateReceipt.projection.request.atInstant !== indexedReceipt.projection.request.atInstant
    || candidateReceipt.projection.request.manualDirection !== indexedReceipt.projection.request.manualDirection
    || candidateReceipt.projection.relations.status !== indexedReceipt.projection.relations.status
    || candidateReceipt.projection.luckCycle.status !== indexedReceipt.projection.luckCycle.status
    || candidateReceipt.projection.transit.status !== indexedReceipt.projection.transit.status;
  if (bindingChanged) {
    throw new Error(`${stageLabel}返回了同 ID 但绑定内容不同的收据；append-only 历史已失败关闭。`);
  }
}

function summarizeReceipts(receipts: readonly RevisionCalculationReceipt[]) {
  let baseline = 0;
  let explicit = 0;
  let complete = 0;
  let partial = 0;
  for (const receipt of receipts) {
    if (receipt.captureKind === "revision_creation_baseline") baseline += 1;
    else if (receipt.captureKind === "explicit_calculation_snapshot") explicit += 1;
    if (receipt.projection.status === "complete") complete += 1;
    else partial += 1;
  }
  return { baseline, explicit, complete, partial };
}

function comparisonMessage(comparison: RevisionCalculationReceiptComparison) {
  if (comparison.status === "matched") {
    return (
      <div className="revision-replay-result revision-replay-result--matched" role="status">
        <strong>历史保存输出与保存版本精确复演逐组件一致</strong>
        <p>这是当前数据库中源 Revision、收据和保存 Profile 的工程一致性结果；全程零写入，不是命理正确性结论。</p>
        <ComparisonComponentLedger comparison={comparison} />
      </div>
    );
  }
  if (comparison.status === "exact_executor_unavailable") {
    return (
      <div className="revision-receipt-replay-unavailable" role="status">
        <strong>收据完整性核对完成，但精确执行器未保留</strong>
        <p>收据及源 Revision 的工程绑定已通过当前检查；系统不会改用当前算法猜测历史结果，也不据此判断领域内容正确。</p>
        <ComparisonComponentLedger comparison={comparison} />
      </div>
    );
  }
  return (
    <div className="inline-error" role="alert">
      <strong>历史输出与精确复演出现差异</strong>
      <p>
        变化组件：{comparison.changedComponents.length
          ? comparison.changedComponents.map((item) => changedComponentLabels[item] ?? "未知组件").join("、")
          : "投影摘要变化，未定位到单一组件"}。源数据保持只读。
      </p>
      <ComparisonComponentLedger comparison={comparison} />
    </div>
  );
}

export function RevisionCalculationReceiptsPanel({ revisionId, refreshToken }: Props) {
  const titleId = useId();
  const boundaryId = useId();
  const [loadRetryVersion, setLoadRetryVersion] = useState(0);
  const revisionBindingIssue = !isNonEmptyString(revisionId)
    ? "当前 Revision ID 为空或包含不可安全显示的字符，无法读取其计算收据。"
    : null;
  const bindingKey = JSON.stringify([revisionId, refreshToken, loadRetryVersion]);
  const [activeBindingKey, setActiveBindingKey] = useState(bindingKey);
  const [receipts, setReceipts] = useState<readonly RevisionCalculationReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [replayingReceiptId, setReplayingReceiptId] = useState<string | null>(null);
  const [replayTargetReceiptId, setReplayTargetReceiptId] = useState<string | null>(null);
  const [comparison, setComparison] = useState<RevisionCalculationReceiptComparison | null>(null);
  const [replayError, setReplayError] = useState<string | null>(null);
  const [visibleReceiptLimit, setVisibleReceiptLimit] = useState(INITIAL_VISIBLE_RECEIPTS);
  const loadGeneration = useRef(0);
  const replayGeneration = useRef(0);
  const loadBusyRef = useRef(true);
  const replayBusyRef = useRef(false);

  useEffect(() => {
    const generation = ++loadGeneration.current;
    replayGeneration.current += 1;
    loadBusyRef.current = true;
    replayBusyRef.current = false;
    setActiveBindingKey(bindingKey);
    setLoading(true);
    setLoadError(null);
    setReceipts([]);
    setReplayingReceiptId(null);
    setReplayTargetReceiptId(null);
    setComparison(null);
    setReplayError(null);
    setVisibleReceiptLimit(INITIAL_VISIBLE_RECEIPTS);
    if (revisionBindingIssue) {
      loadBusyRef.current = false;
      setLoadError(revisionBindingIssue);
      setLoading(false);
      return () => {
        if (loadGeneration.current === generation) loadGeneration.current += 1;
      };
    }
    caseRepository.listRevisionCalculationReceipts(revisionId)
      .then((nextReceipts) => verifyReceiptIndex(nextReceipts, revisionId))
      .then((verifiedReceipts) => {
        if (generation === loadGeneration.current) setReceipts(verifiedReceipts);
      })
      .catch((reason: unknown) => {
        if (generation === loadGeneration.current) {
          setLoadError(errorMessage(reason, "计算收据无法完成内容完整性核对。"));
        }
      })
      .finally(() => {
        if (generation === loadGeneration.current) {
          loadBusyRef.current = false;
          setLoading(false);
        }
      });
    return () => {
      if (loadGeneration.current === generation) loadGeneration.current += 1;
    };
  }, [bindingKey, revisionId, revisionBindingIssue]);

  const runExactReplay = async (indexedReceipt: RevisionCalculationReceipt) => {
    if (loadBusyRef.current || replayBusyRef.current) return;
    const receiptId = indexedReceipt.id;
    const generation = ++replayGeneration.current;
    replayBusyRef.current = true;
    setReplayingReceiptId(receiptId);
    setReplayTargetReceiptId(receiptId);
    setComparison(null);
    setReplayError(null);
    try {
      const [freshReceipt, freshRevision, replayModule] = await Promise.all([
        caseRepository.getRevisionCalculationReceipt(receiptId),
        caseRepository.getRevision(revisionId),
        import("@hakimi/revision-replay")
      ]);
      if (generation !== replayGeneration.current) return;
      if (!freshReceipt) throw new Error("所选计算收据已不存在；不会使用页面缓存继续比较。");
      if (!freshRevision) throw new Error("源 Revision 已不存在；无法进行精确复演。");
      assertReplayReceiptBinding(indexedReceipt, freshReceipt, revisionId, "重新读取");
      if (freshRevision.id !== revisionId) {
        throw new Error("Revision 仓库返回了不匹配的来源，已拒绝复演。");
      }
      const result = await replayModule.compareRevisionCalculationReceiptAgainstRevision(
        freshReceipt,
        freshRevision
      );
      assertComparisonShape(result);
      assertReplayReceiptBinding(freshReceipt, result.receipt, revisionId, "精确复演结果");
      if (generation === replayGeneration.current) setComparison(result);
    } catch (reason) {
      if (generation === replayGeneration.current) {
        setReplayError(errorMessage(reason, "保存版本精确复演未完成。"));
      }
    } finally {
      if (generation === replayGeneration.current) {
        replayBusyRef.current = false;
        setReplayingReceiptId(null);
      }
    }
  };

  const retryLoad = () => {
    if (loadBusyRef.current || replayBusyRef.current) return;
    loadBusyRef.current = true;
    setLoading(true);
    setLoadError(null);
    setLoadRetryVersion((current) => current + 1);
  };

  const bindingCurrent = activeBindingKey === bindingKey;
  const panelLoading = !bindingCurrent || loading;
  const panelLoadError = bindingCurrent ? loadError : null;
  const panelReceipts = bindingCurrent ? receipts : EMPTY_RECEIPTS;
  const panelReplayingReceiptId = bindingCurrent ? replayingReceiptId : null;
  const panelReplayTargetReceiptId = bindingCurrent ? replayTargetReceiptId : null;
  const panelComparison = bindingCurrent ? comparison : null;
  const panelReplayError = bindingCurrent ? replayError : null;
  const receiptSummary = useMemo(() => summarizeReceipts(panelReceipts), [panelReceipts]);
  const renderedReceipts = useMemo(
    () => panelReceipts.slice(0, visibleReceiptLimit),
    [panelReceipts, visibleReceiptLimit]
  );
  const exactReplayState = panelReplayingReceiptId !== null
    ? "running"
    : panelReplayError
      ? "error"
      : panelComparison?.status ?? "idle";
  const panelIntegrityState = panelLoading
    ? "loading"
    : panelLoadError
      ? "load_error"
      : exactReplayState === "running"
        ? "replaying"
        : exactReplayState === "error"
          ? "replay_error"
          : exactReplayState === "mismatch"
            ? "replay_mismatch"
            : exactReplayState === "exact_executor_unavailable"
              ? "executor_unavailable"
              : exactReplayState === "matched"
                ? "replay_matched"
                : panelReceipts.length ? "bound" : "empty";
  const panelStatus = panelLoading
    ? { label: "正在核对收据完整性", tone: "info" as const }
    : panelLoadError
      ? { label: "索引加载失败关闭", tone: "cinnabar" as const }
      : exactReplayState === "running"
        ? { label: "正在精确复演", tone: "info" as const }
        : exactReplayState === "error"
          ? { label: "精确复演失败关闭", tone: "cinnabar" as const }
          : exactReplayState === "mismatch"
            ? { label: "精确复演出现差异", tone: "cinnabar" as const }
            : exactReplayState === "exact_executor_unavailable"
              ? { label: "精确执行器未保留", tone: "warning" as const }
              : exactReplayState === "matched"
                ? { label: "本次精确复演一致", tone: "info" as const }
                : panelReceipts.length
                  ? { label: `${panelReceipts.length} 条收据完整性已核对`, tone: "info" as const }
                  : { label: "暂无计算收据", tone: "neutral" as const };
  const receiptSource = panelReceipts[0]?.sourceRevision ?? null;
  const sourceIdentitySummary = receiptSource
    ? `R${receiptSource.revisionNumber} · Case ${shortHash(receiptSource.caseId)}`
    : panelLoading
      ? "等待索引提供源编号"
      : panelLoadError
        ? "索引失败关闭，未绑定源编号"
        : "当前索引为空，无源编号";
  const sourceSnapshotSummary = receiptSource
    ? shortHash(receiptSource.snapshotDigest)
    : panelLoading
      ? "等待索引"
      : panelLoadError
        ? "未展示"
        : "无收据";
  const receiptIndexSummary = panelLoading
    ? "正在逐条核对内容完整性"
    : panelLoadError
      ? "完整性核对失败关闭 · 未展示"
      : panelReceipts.length
        ? "内容摘要已重算 · 未查源 Revision"
        : "当前索引为空 · 未自动回填";
  const firstPartialReceipt = panelReceipts.find((receipt) => receipt.projection.status !== "complete") ?? null;
  const firstPartialComponents = firstPartialReceipt
    ? comparisonComponentNames.filter((name) => firstPartialReceipt.projection[name].status !== "projected")
    : [];

  return (
    <section
      className="flat-section revision-receipts-panel"
      aria-labelledby={titleId}
      aria-describedby={boundaryId}
      aria-busy={panelLoading || panelReplayingReceiptId !== null}
      data-integrity-state={panelIntegrityState}
      data-exact-replay-state={exactReplayState}
      data-revision-binding-state={revisionBindingIssue ? "invalid" : "bound"}
      data-receipt-count={panelReceipts.length}
      data-rendered-receipt-count={renderedReceipts.length}
      data-release-family="legacy-v13"
      data-release-identity="legacy-v13"
      data-db-generation="13"
      data-target-schema="13"
      data-migration-id="null"
      data-evidence-authority="engineering-integrity-only"
      data-engineering-integrity-only="true"
      data-current-index-completeness-proven="false"
      data-digital-signature-verified="false"
      data-record-write-performed="false"
      data-mutation-epoch-bypassed="false"
      data-expert-truth-claimed="false"
      data-public-release-authorized="false"
      data-mutation-mode="read-only-no-mutation"
    >
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Indexed calculation receipts</p>
          <h2 id={titleId}><History aria-hidden="true" />历史计算收据</h2>
        </div>
        <StatusPill tone={panelStatus.tone}>{panelStatus.label}</StatusPill>
      </div>
      <p id={boundaryId} className="revision-replay-copy">
        <strong>工程证据分层：</strong>列表加载会逐条核对收据结构、请求指纹、嵌套投影与摘要，再检查当前索引内的源 Revision 身份一致性；它不会读取源 Revision 或执行历史算法，也不能证明索引历史从未缺项或删除。精确复演才会重新读取同一收据与源 Revision，并按保存 Profile 重放；两者都不是数字签名，也不代表命理结论通过专家金标。
        <small className="revision-receipt-release-baseline">legacy-v13 · Schema 13 · migration null · current index completeness false · public release false</small>
      </p>

      <dl className="revision-receipt-verification-scope" aria-label="历史计算收据核对范围">
        <div>
          <dt>收据内容完整性</dt>
          <dd>逐条重算请求指纹、嵌套投影与收据摘要，再核对 Revision 归属、唯一 ID 和同源快照。</dd>
        </div>
        <div>
          <dt>按需复演</dt>
          <dd>重新读取同 ID 收据，重算结构、源快照、请求指纹、嵌套投影和收据摘要；执行器可用时再比较保存输出。</dd>
        </div>
        <div data-scope="excluded">
          <dt>明确不证明</dt>
          <dd>不是数字签名、索引从未缺项的证明、专家金标、命理正确性结论或公开发布授权。</dd>
        </div>
      </dl>

      <dl className="revision-receipt-binding-rail" aria-label="当前 Revision 计算收据链身份">
        <div data-binding="revision">
          <dt>Current Revision</dt>
          <dd><code title={revisionBindingIssue ? undefined : safeVisibleText(revisionId, "")}>{revisionBindingIssue ? "无有效 ID" : shortHash(revisionId)}</code><span>{sourceIdentitySummary}</span></dd>
        </div>
        <div data-binding="snapshot">
          <dt>Source snapshot</dt>
          <dd><code title={receiptSource ? safeVisibleText(receiptSource.snapshotDigest, "") : undefined}>{sourceSnapshotSummary}</code><span>{receiptSource ? "当前索引内必须保持一致" : "没有可展示的快照绑定"}</span></dd>
        </div>
        <div data-binding="history">
          <dt>Indexed receipts</dt>
          <dd><strong>{panelLoading ? "核对中" : panelLoadError ? "未展示" : `${panelReceipts.length} 条`}</strong><span>{receiptIndexSummary}</span></dd>
        </div>
        <div data-binding="replay">
          <dt>Exact replay</dt>
          <dd><strong>{panelStatus.label}</strong><span>按需执行 · 零写入</span></dd>
        </div>
      </dl>

      {panelLoading ? <div className="revision-integrity-loading" role="status"><span aria-hidden="true" /><p>正在读取并逐条核对当前 Revision 的收据内容完整性与索引绑定…</p></div> : null}
      {panelLoadError ? (
        <div className="inline-error revision-receipt-load-error" role="alert">
          <div><strong>历史收据未展示</strong><p>{panelLoadError} 任一记录无法完成内部完整性核对时，当前索引都会失败关闭。</p></div>
          {revisionBindingIssue ? null : <button type="button" className="secondary-action" disabled={panelLoading} aria-busy={panelLoading} onClick={retryLoad}><RotateCcw aria-hidden="true" />重新读取并核对</button>}
        </div>
      ) : null}
      {!panelLoading && !panelLoadError && panelReceipts.length === 0 ? (
        <div className="revision-receipt-empty" role="status">
          <History aria-hidden="true" />
          <div><strong>此 Revision 没有历史计算收据</strong><p>它可能创建于收据启用之前；系统不会用今天的算法回填旧输出。</p></div>
        </div>
      ) : null}
      {!panelLoading && !panelLoadError && panelReceipts.length ? (
        <dl className="revision-receipt-summary" aria-label="历史计算收据摘要">
          <div><dt>创建基线</dt><dd>{receiptSummary.baseline}</dd></div>
          <div><dt>显式快照</dt><dd>{receiptSummary.explicit}</dd></div>
          <div data-summary-state="complete"><dt>组件投影完整</dt><dd>{receiptSummary.complete}</dd></div>
          <div data-summary-state="partial"><dt>组件投影部分</dt><dd>{receiptSummary.partial}</dd></div>
        </dl>
      ) : null}
      {!panelLoading && !panelLoadError && firstPartialReceipt ? (
        <div className="revision-receipt-attention" role="note" data-attention-state="partial">
          <span aria-hidden="true">ATTN</span>
          <div>
            <strong>列表中的首个组件投影不完整项 · {captureKindLabel(firstPartialReceipt)}</strong>
            <p>{formatDateTime(firstPartialReceipt.createdAt)} · 未完整组件：{firstPartialComponents.length ? firstPartialComponents.map((name) => changedComponentLabels[name]).join("、") : "投影状态未完整，未定位到单一组件"}</p>
          </div>
          <small>部分投影不是索引完整性失败；展开对应收据后可按需进行零写入精确复演。</small>
        </div>
      ) : null}
      {!panelLoadError && panelReceipts.length ? (
        <ol className="revision-receipt-list" aria-label={"历史计算收据列表，已渲染 " + renderedReceipts.length + " 条，共 " + panelReceipts.length + " 条"}>
          {renderedReceipts.map((receipt, receiptIndex) => {
            const isCurrentComparison = panelComparison?.receipt.id === receipt.id;
            const isReplaying = panelReplayingReceiptId === receipt.id;
            const hasReplayError = !isReplaying && panelReplayError !== null && panelReplayTargetReceiptId === receipt.id && !panelComparison;
            const replayState = isReplaying
              ? "running"
              : isCurrentComparison && panelComparison
                ? panelComparison.status
                : hasReplayError ? "error" : "idle";
            const replayStateLabel = exactReplayStatusLabel(replayState);
            const componentStates = [
              {
                label: "关系",
                state: receipt.projection.relations.status === "projected" ? "available" : "unavailable",
                value: receipt.projection.relations.status === "projected" ? "已保存" : "不可用"
              },
              {
                label: "起运",
                state: receipt.projection.luckCycle.status === "projected" ? "available" : "unavailable",
                value: receipt.projection.luckCycle.status === "projected" ? "已保存" : "不可用"
              },
              {
                label: "运限",
                state: receipt.projection.transit.status === "projected" ? "available" : receipt.projection.transit.status === "not_requested" ? "not-requested" : "unavailable",
                value: receipt.projection.transit.status === "projected" ? "已保存" : receipt.projection.transit.status === "not_requested" ? "未请求" : "不可用"
              }
            ] as const;
            return (
              <li
                key={receipt.id}
                className="revision-receipt-card"
                data-capture-kind={receipt.captureKind}
                data-projection-status={receipt.projection.status}
                data-replay-state={replayState}
              >
                <header>
                  <div>
                    <span className="revision-receipt-sequence" aria-hidden="true">REC / {String(receiptIndex + 1).padStart(2, "0")}</span>
                    <small>{captureKindLabel(receipt)}</small>
                    <h3>{formatDateTime(receipt.createdAt)}</h3>
                    <p>{safeVisibleText(receipt.projection.request.atInstant, "Transit 未请求", 96)} · {manualDirectionLabel(receipt)}</p>
                  </div>
                  <StatusPill tone={receipt.projection.status === "complete" ? "info" : "warning"}>
                    {receipt.projection.status === "complete" ? "组件投影完整" : "组件投影部分"}
                  </StatusPill>
                </header>
                <ul className="revision-receipt-components" aria-label={`${captureKindLabel(receipt)}组件状态`}>
                  {componentStates.map((component) => (
                    <li key={component.label} data-component-state={component.state}>
                      <span>{component.label}</span>
                      <strong>{component.value}</strong>
                    </li>
                  ))}
                </ul>
                <div className="revision-receipt-evidence-state" aria-label={`${captureKindLabel(receipt)}证据状态`}>
                  <div data-state="verified">
                    <span>INDEX INTEGRITY</span>
                    <strong>内容验真通过</strong>
                    <small>仅证明当前索引记录的结构与摘要绑定</small>
                  </div>
                  <div data-state={replayState}>
                    <span>EXACT REPLAY</span>
                    <strong>{replayStateLabel}</strong>
                    <small>{replayState === "idle" ? "尚未重新读取源 Revision" : "本次按需操作 · 零写入"}</small>
                  </div>
                </div>
                <details className="revision-receipt-details">
                  <summary>
                    <span>查看绑定与精确复演</span>
                    <small>{replayStateLabel} · 零写入</small>
                  </summary>
                  <dl className="metadata-list revision-receipt-metadata">
                    <div><dt>收据 ID</dt><dd><code title={safeVisibleText(receipt.id, "")}>{displayIdentifier(receipt.id)}</code></dd></div>
                    <div><dt>源 Revision ID</dt><dd><code title={safeVisibleText(receipt.sourceRevision.revisionId, "")}>{displayIdentifier(receipt.sourceRevision.revisionId)}</code></dd></div>
                    <div><dt>源 Revision</dt><dd>R{receipt.sourceRevision.revisionNumber} · {shortHash(receipt.sourceRevision.snapshotDigest)}</dd></div>
                    <div><dt>保存 Profile</dt><dd><code title={safeVisibleText(receipt.projection.profile.profileId, "")}>{displayIdentifier(receipt.projection.profile.profileId)}</code> · 契约 v{safeVisibleText(receipt.projection.profile.schemaVersion, "不可显示", 96)}</dd></div>
                    <div><dt>投影摘要</dt><dd title={safeVisibleText(receipt.projection.projectionDigest, "")}>{shortHash(receipt.projection.projectionDigest)}</dd></div>
                    <div><dt>请求指纹</dt><dd title={safeVisibleText(receipt.requestFingerprint, "")}>{shortHash(receipt.requestFingerprint)}</dd></div>
                    <div><dt>收据摘要</dt><dd title={safeVisibleText(receipt.receiptDigest, "")}>{shortHash(receipt.receiptDigest)}</dd></div>
                  </dl>
                  <details className="revision-receipt-digest-disclosure">
                    <summary><span>完整摘要核对值</span><small>5 项 · 可选择</small></summary>
                    <dl aria-label={`${captureKindLabel(receipt)}完整摘要核对值`}>
                      <div><dt>Source snapshot</dt><dd><code>{safeVisibleText(receipt.sourceRevision.snapshotDigest, "不可显示", 2_048)}</code></dd></div>
                      <div><dt>Natal result</dt><dd><code>{safeVisibleText(receipt.sourceRevision.natalResultHash, "不可显示", 2_048)}</code></dd></div>
                      <div><dt>Projection</dt><dd><code>{safeVisibleText(receipt.projection.projectionDigest, "不可显示", 2_048)}</code></dd></div>
                      <div><dt>Request fingerprint</dt><dd><code>{safeVisibleText(receipt.requestFingerprint, "不可显示", 2_048)}</code></dd></div>
                      <div><dt>Receipt</dt><dd><code>{safeVisibleText(receipt.receiptDigest, "不可显示", 2_048)}</code></dd></div>
                    </dl>
                  </details>
                  <button
                    type="button"
                    className="secondary-action"
                    disabled={panelReplayingReceiptId !== null}
                    aria-busy={isReplaying}
                    onClick={() => runExactReplay(receipt)}
                  >
                    <RotateCcw aria-hidden="true" />{isReplaying ? "正在精确复演…" : hasReplayError ? "重新读取并精确复演" : "按收据保存 Profile 精确复演"}
                  </button>
                  {isCurrentComparison && panelComparison ? comparisonMessage(panelComparison) : null}
                  {hasReplayError ? (
                    <div className="inline-error revision-receipt-replay-error" role="alert">
                      <strong>精确复演未完成</strong>
                      <p>{panelReplayError}</p>
                      <small>当前结果保持未确认；再次操作会重新读取收据和源 Revision，不使用本次失败结果。</small>
                    </div>
                  ) : null}
                </details>
              </li>
            );
          })}
        </ol>
      ) : null}
      {!panelLoadError && renderedReceipts.length < panelReceipts.length ? (
        <div className="revision-receipt-load-more" role="status">
          <span>已渲染 {renderedReceipts.length} / {panelReceipts.length} 条完整性已核对收据</span>
          <button type="button" onClick={() => setVisibleReceiptLimit((current) => current + VISIBLE_RECEIPT_STEP)}>再显示 {Math.min(VISIBLE_RECEIPT_STEP, panelReceipts.length - renderedReceipts.length)} 条</button>
        </div>
      ) : null}
    </section>
  );
}
