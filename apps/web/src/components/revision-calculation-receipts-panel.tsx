import { History, RotateCcw, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type {
  RevisionCalculationReceipt,
  RevisionCalculationReceiptChangedComponent,
  RevisionCalculationReceiptComparison
} from "@hakimi/revision-replay";
import { caseRepository } from "@hakimi/storage";
import { formatDateTime, shortHash } from "../lib/format";
import { StatusPill } from "./status-pill";

type Props = {
  revisionId: string;
  refreshToken: number;
};

const changedComponentLabels: Record<RevisionCalculationReceiptChangedComponent, string> = {
  relations: "干支关系",
  luckCycle: "起运与大运",
  transit: "运限切片"
};

function captureKindLabel(receipt: RevisionCalculationReceipt): string {
  return receipt.captureKind === "revision_creation_baseline" ? "创建基线" : "显式计算快照";
}

function manualDirectionLabel(receipt: RevisionCalculationReceipt): string {
  const direction = receipt.projection.request.manualDirection;
  if (direction === "forward") return "人工顺行";
  if (direction === "backward") return "人工逆行";
  return "未人工覆盖";
}

function comparisonMessage(comparison: RevisionCalculationReceiptComparison) {
  if (comparison.status === "matched") {
    return (
      <div className="revision-replay-result revision-replay-result--matched" role="status">
        <strong>历史输出与保存版本精确复演一致</strong>
        <p>此次比较读取了当前数据库中的源 Revision 与收据；全程零写入。</p>
      </div>
    );
  }
  if (comparison.status === "exact_executor_unavailable") {
    return (
      <div className="revision-receipt-replay-unavailable" role="status">
        <strong>内容完整，但精确执行器未保留</strong>
        <p>收据自身及其源 Revision 绑定已通过验真；系统不会改用当前算法猜测历史结果。</p>
      </div>
    );
  }
  return (
    <div className="inline-error" role="alert">
      <strong>历史输出与精确复演出现差异</strong>
      <p>
        变化组件：{comparison.changedComponents.length
          ? comparison.changedComponents.map((item) => changedComponentLabels[item]).join("、")
          : "投影摘要变化，未定位到单一组件"}。源数据保持只读。
      </p>
    </div>
  );
}

export function RevisionCalculationReceiptsPanel({ revisionId, refreshToken }: Props) {
  const [receipts, setReceipts] = useState<readonly RevisionCalculationReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [replayingReceiptId, setReplayingReceiptId] = useState<string | null>(null);
  const [replayTargetReceiptId, setReplayTargetReceiptId] = useState<string | null>(null);
  const [comparison, setComparison] = useState<RevisionCalculationReceiptComparison | null>(null);
  const [replayError, setReplayError] = useState<string | null>(null);
  const loadGeneration = useRef(0);
  const replayGeneration = useRef(0);

  useEffect(() => {
    const generation = ++loadGeneration.current;
    replayGeneration.current += 1;
    setLoading(true);
    setLoadError(null);
    setReceipts([]);
    setReplayingReceiptId(null);
    setReplayTargetReceiptId(null);
    setComparison(null);
    setReplayError(null);
    caseRepository.listRevisionCalculationReceipts(revisionId)
      .then((nextReceipts) => {
        if (generation === loadGeneration.current) setReceipts(nextReceipts);
      })
      .catch((reason: unknown) => {
        if (generation === loadGeneration.current) {
          setLoadError(reason instanceof Error ? reason.message : "计算收据无法完成内容验真。");
        }
      })
      .finally(() => {
        if (generation === loadGeneration.current) setLoading(false);
      });
    return () => {
      if (loadGeneration.current === generation) loadGeneration.current += 1;
    };
  }, [refreshToken, revisionId]);

  const runExactReplay = async (receiptId: string) => {
    const generation = ++replayGeneration.current;
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
      if (!freshReceipt) throw new Error("所选计算收据已不存在；不会使用页面缓存继续比较。");
      if (!freshRevision) throw new Error("源 Revision 已不存在；无法进行精确复演。");
      const result = await replayModule.compareRevisionCalculationReceiptAgainstRevision(
        freshReceipt,
        freshRevision
      );
      if (generation === replayGeneration.current) setComparison(result);
    } catch (reason) {
      if (generation === replayGeneration.current) {
        setReplayError(reason instanceof Error ? reason.message : "保存版本精确复演未完成。");
      }
    } finally {
      if (generation === replayGeneration.current) setReplayingReceiptId(null);
    }
  };

  return (
    <section className="flat-section revision-receipts-panel" aria-labelledby="revision-receipts-title">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Append-only calculation history</p>
          <h2 id="revision-receipts-title"><History aria-hidden="true" />历史计算收据</h2>
        </div>
        <StatusPill tone={loadError ? "cinnabar" : receipts.length ? "jade" : "neutral"}>
          {loadError ? "失败关闭" : loading ? "正在验真" : `${receipts.length} 条内容验真通过`}
        </StatusPill>
      </div>
      <p className="revision-replay-copy">
        收据保存当时的关系、起运与运限投影及执行器绑定。摘要只能证明内容完整性，不是数字签名，也不代表命理结论已经通过专家金标。
      </p>

      {loading ? <p role="status">正在读取并逐条验证计算收据…</p> : null}
      {loadError ? (
        <div className="inline-error" role="alert">
          <strong>历史收据未展示</strong>
          <p>{loadError} 任一记录无法验真时，整段历史都会失败关闭。</p>
        </div>
      ) : null}
      {!loading && !loadError && receipts.length === 0 ? (
        <div className="revision-receipt-empty" role="status">
          <ShieldCheck aria-hidden="true" />
          <div><strong>此 Revision 没有历史计算收据</strong><p>它可能创建于收据启用之前；系统不会用今天的算法回填旧输出。</p></div>
        </div>
      ) : null}
      {!loadError && receipts.length ? (
        <ol className="revision-receipt-list" aria-label="历史计算收据列表">
          {receipts.map((receipt) => {
            const isCurrentComparison = comparison?.receipt.id === receipt.id;
            const isReplaying = replayingReceiptId === receipt.id;
            return (
              <li key={receipt.id} className="revision-receipt-card">
                <header>
                  <div>
                    <small>{captureKindLabel(receipt)}</small>
                    <h3>{formatDateTime(receipt.createdAt)}</h3>
                    <p>{receipt.projection.request.atInstant ?? "Transit 未请求"} · {manualDirectionLabel(receipt)}</p>
                  </div>
                  <StatusPill tone={receipt.projection.status === "complete" ? "jade" : "warning"}>
                    {receipt.projection.status === "complete" ? "完整投影" : "部分投影"}
                  </StatusPill>
                </header>
                <div className="revision-receipt-components" aria-label={`${captureKindLabel(receipt)}组件状态`}>
                  <span>关系：{receipt.projection.relations.status === "projected" ? "已保存" : "不可用"}</span>
                  <span>起运：{receipt.projection.luckCycle.status === "projected" ? "已保存" : "不可用"}</span>
                  <span>Transit：{receipt.projection.transit.status === "projected" ? "已保存" : receipt.projection.transit.status === "not_requested" ? "未请求" : "不可用"}</span>
                </div>
                <details>
                  <summary>查看绑定与复演</summary>
                  <dl className="metadata-list revision-receipt-metadata">
                    <div><dt>源 Revision</dt><dd>R{receipt.sourceRevision.revisionNumber} · {shortHash(receipt.sourceRevision.snapshotDigest)}</dd></div>
                    <div><dt>投影摘要</dt><dd title={receipt.projection.projectionDigest}>{shortHash(receipt.projection.projectionDigest)}</dd></div>
                    <div><dt>请求指纹</dt><dd title={receipt.requestFingerprint}>{shortHash(receipt.requestFingerprint)}</dd></div>
                    <div><dt>收据摘要</dt><dd title={receipt.receiptDigest}>{shortHash(receipt.receiptDigest)}</dd></div>
                  </dl>
                  <button
                    type="button"
                    className="secondary-action"
                    disabled={replayingReceiptId !== null}
                    onClick={() => runExactReplay(receipt.id)}
                  >
                    <RotateCcw aria-hidden="true" />{isReplaying ? "正在精确复演…" : "按保存版本精确复演"}
                  </button>
                  {isCurrentComparison && comparison ? comparisonMessage(comparison) : null}
                  {!isReplaying && replayError && replayTargetReceiptId === receipt.id && !comparison ? (
                    <div className="inline-error" role="alert"><strong>精确复演未完成</strong><p>{replayError}</p></div>
                  ) : null}
                </details>
              </li>
            );
          })}
        </ol>
      ) : null}
    </section>
  );
}
