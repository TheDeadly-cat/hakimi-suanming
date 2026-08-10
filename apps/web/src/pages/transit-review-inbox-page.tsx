import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileJson2,
  Inbox,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Upload
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { pickFile, saveBlobFile, saveTextFile } from "@hakimi/platform";
import {
  createTransitQueryReviewBundle,
  serializeTransitQueryReviewBundle
} from "@hakimi/research-query/transit-review";
import { PageHeading } from "../components/page-heading";
import { StatusPill } from "../components/status-pill";
import { resolveFileDelivery } from "../lib/file-transfer-feedback";
import { AppLink } from "../lib/router";
import {
  MAX_TRANSIT_REVIEW_INBOX_ARTIFACT_BYTES,
  deleteTransitReviewInboxArtifact,
  importTransitReviewInboxArtifact,
  readTransitReviewInboxArtifactBytes,
  readTransitReviewInboxProjection,
  type TransitReviewInboxArtifact,
  type TransitReviewInboxArtifactStatus,
  type TransitReviewInboxProjection
} from "../lib/transit-review-inbox";

type Operation = "loading" | "refresh" | "import" | "export_bundle" | "download" | "delete";

type Feedback = {
  tone: "success" | "info" | "error";
  title: string;
  message: string;
};

const KIND_LABELS: Record<TransitReviewInboxArtifact["kind"], string> = {
  review_bundle: "18 条候选审核包",
  independent_review: "独立审核",
  adjudication: "最终裁决",
  unknown: "当前版本无法识别"
};

const STATUS_LABELS: Record<TransitReviewInboxArtifactStatus, string> = {
  bundle_current: "当前候选包",
  waiting_for_review_bundle: "等待审核包",
  waiting_for_independent_reviews: "等待确切双审",
  review_structure_passed_unverified: "结构预检通过 · 身份未核验",
  adjudication_structure_passed_unverified: "裁决结构通过 · 金标 +0",
  preflight_failed: "当前协议预检失败",
  local_record_corrupt: "本地原件异常"
};

function statusTone(status: TransitReviewInboxArtifactStatus): "jade" | "warning" | "cinnabar" | "info" {
  if (status === "bundle_current" || status === "review_structure_passed_unverified" || status === "adjudication_structure_passed_unverified") {
    return "jade";
  }
  if (status === "waiting_for_review_bundle" || status === "waiting_for_independent_reviews") return "warning";
  if (status === "preflight_failed" || status === "local_record_corrupt") return "cinnabar";
  return "info";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}

function shortDigest(value: string | null): string {
  return value ? `${value.slice(0, 12)}…${value.slice(-8)}` : "—";
}

function displayTime(value: string): string {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }).format(timestamp)
    : value;
}

function errorMessage(reason: unknown, fallback: string): string {
  return reason instanceof Error && reason.message ? reason.message : fallback;
}

function FeedbackMessage({ feedback }: { feedback: Feedback | null }) {
  if (!feedback) return null;
  return (
    <div className={`review-inbox-feedback is-${feedback.tone}`} role={feedback.tone === "error" ? "alert" : "status"}>
      <strong>{feedback.title}</strong>
      <p>{feedback.message}</p>
    </div>
  );
}

export function TransitReviewInboxPage() {
  const [projection, setProjection] = useState<TransitReviewInboxProjection | null>(null);
  const [operation, setOperation] = useState<Operation | null>("loading");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async (mode: "initial" | "manual" | "mutation" = "manual") => {
    setOperation(mode === "initial" ? "loading" : "refresh");
    try {
      const next = await readTransitReviewInboxProjection();
      if (!mountedRef.current) return;
      setProjection(next);
      if (mode === "manual") {
        setFeedback({
          tone: "success",
          title: "已从原始字节重新预检",
          message: `重新读取 ${next.summary.storedArtifacts} 个本地工件；未使用上次页面留下的状态。`
        });
      }
    } catch (reason) {
      if (!mountedRef.current) return;
      setFeedback({
        tone: "error",
        title: "审核收件箱读取失败",
        message: errorMessage(reason, "无法读取并重新预检本地审核原件。")
      });
    } finally {
      if (mountedRef.current) setOperation(null);
    }
  }, []);

  useEffect(() => {
    void refresh("initial");
  }, [refresh]);

  const importArtifact = async () => {
    setFeedback(null);
    setOperation("import");
    try {
      const file = await pickFile({
        accept: ".json,application/json",
        maxBytes: MAX_TRANSIT_REVIEW_INBOX_ARTIFACT_BYTES
      });
      if (!file) return;
      const result = await importTransitReviewInboxArtifact({
        fileName: file.name,
        bytes: new Uint8Array(await file.blob.arrayBuffer())
      });
      await refresh("mutation");
      if (!mountedRef.current) return;
      setFeedback({
        tone: "success",
        title: result.created ? "审核原件已保存" : "相同原件已存在",
        message: result.created
          ? `${KIND_LABELS[result.artifact.kind]}已按原始字节 SHA-256 写入本机，并会进入完整备份；可信等级仍是“本地未核验”。`
          : `已复用内容完全相同的本地原件，没有新增副本；SHA-256 不证明专家身份。`
      });
    } catch (reason) {
      if (!mountedRef.current) return;
      setFeedback({
        tone: "error",
        title: "审核工件未保存",
        message: errorMessage(reason, "文件不是当前协议可识别且摘要完整的审核工件。")
      });
    } finally {
      if (mountedRef.current) setOperation(null);
    }
  };

  const exportCurrentBundle = async () => {
    setFeedback(null);
    setOperation("export_bundle");
    try {
      const bundle = await createTransitQueryReviewBundle();
      const result = await saveTextFile(
        `hakimi-transit-query-review-${new Date().toISOString().slice(0, 10)}.json`,
        serializeTransitQueryReviewBundle(bundle),
        "application/json;charset=utf-8"
      );
      const delivery = resolveFileDelivery(result, "运限查询审核包导出");
      if (delivery.kind === "error") throw new Error(delivery.message);
      setFeedback({
        tone: delivery.kind === "cancelled" ? "info" : "success",
        title: delivery.kind === "cancelled" ? "已取消审核包导出" : "当前 18 条候选审核包已交付",
        message: delivery.kind === "cancelled"
          ? delivery.message
          : `${delivery.message} 导出不会自动写入收件箱，也不会增加人工验证金标。`
      });
    } catch (reason) {
      setFeedback({
        tone: "error",
        title: "候选审核包导出失败",
        message: errorMessage(reason, "无法生成当前运限候选审核包。")
      });
    } finally {
      if (mountedRef.current) setOperation(null);
    }
  };

  const downloadArtifact = async (artifact: TransitReviewInboxArtifact) => {
    setFeedback(null);
    setOperation("download");
    try {
      const bytes = await readTransitReviewInboxArtifactBytes(artifact);
      const copy = Uint8Array.from(bytes);
      const result = await saveBlobFile(artifact.fileName, new Blob([copy], { type: "application/json" }));
      const delivery = resolveFileDelivery(result, "审核原件导出");
      if (delivery.kind === "error") throw new Error(delivery.message);
      setFeedback({
        tone: delivery.kind === "cancelled" ? "info" : "success",
        title: delivery.kind === "cancelled" ? "已取消原件导出" : "审核原件已交付",
        message: delivery.message
      });
    } catch (reason) {
      setFeedback({
        tone: "error",
        title: "审核原件导出失败",
        message: errorMessage(reason, "无法按列表中的原始摘要读取该文件。")
      });
    } finally {
      if (mountedRef.current) setOperation(null);
    }
  };

  const deleteArtifact = async (artifact: TransitReviewInboxArtifact) => {
    setFeedback(null);
    setOperation("delete");
    try {
      await deleteTransitReviewInboxArtifact(artifact);
      setDeleteId(null);
      await refresh("mutation");
      if (!mountedRef.current) return;
      setFeedback({
        tone: "success",
        title: "审核原件已永久删除",
        message: `${artifact.fileName} 的本地元数据与原始字节已删除；其他依赖工件会在本次刷新后回到等待状态。`
      });
    } catch (reason) {
      setFeedback({
        tone: "error",
        title: "审核原件未删除",
        message: errorMessage(reason, "文件可能已在其他标签页或恢复操作中变化，已保持不动。")
      });
    } finally {
      if (mountedRef.current) setOperation(null);
    }
  };

  const busy = operation !== null;
  const summary = projection?.summary;

  return (
    <div className="page page--transit-review-inbox">
      <PageHeading
        eyebrow="Local unverified review inbox"
        title="未核验审核收件箱"
        description="保存运限查询候选包、逐候选独立审核和最终裁决的原始 JSON；每次打开都从字节重新跑当前协议，不把缓存状态当证据。"
        actions={(
          <>
            <AppLink className="secondary-action" href="/settings"><ArrowLeft aria-hidden="true" />返回设置</AppLink>
            <button type="button" className="secondary-action" disabled={busy} onClick={() => void exportCurrentBundle()}><Download aria-hidden="true" />导出当前 18 条候选</button>
            <button type="button" className="primary-action" disabled={busy} onClick={() => void importArtifact()}><Upload aria-hidden="true" />导入审核工件</button>
          </>
        )}
      />

      <section className="review-inbox-boundary" aria-labelledby="review-inbox-boundary-title">
        <ShieldAlert aria-hidden="true" />
        <div>
          <p className="eyebrow">Evidence boundary</p>
          <h2 id="review-inbox-boundary-title">结构通过不等于专家身份已验证</h2>
          <p>本页只验证安全 JSON、内容摘要、当前候选绑定、依赖关系、来源谱系和时间顺序。现实身份与材料真伪仍需维护者在线下可信账本核验；不会自动写入 fixture，也不会打开发布门。</p>
        </div>
        <div className="review-inbox-zero">
          <strong>0</strong>
          <span>专家金标增量</span>
        </div>
      </section>

      <FeedbackMessage feedback={feedback} />

      <section className="review-inbox-metrics" aria-label="审核收件箱概览" aria-busy={operation === "loading" || operation === "refresh"}>
        <div><Inbox aria-hidden="true" /><strong>{summary?.storedArtifacts ?? "—"}</strong><span>本地原件</span></div>
        <div><FileJson2 aria-hidden="true" /><strong>{summary?.currentBundles ?? "—"}</strong><span>当前候选包</span></div>
        <div><CheckCircle2 aria-hidden="true" /><strong>{summary?.passedIndependentReviews ?? "—"}</strong><span>单件结构通过</span></div>
        <div><ShieldAlert aria-hidden="true" /><strong>{summary?.passedAdjudications ?? "—"}</strong><span>裁决结构通过</span></div>
        <div><RefreshCw aria-hidden="true" /><strong>{summary?.waitingDependencies ?? "—"}</strong><span>等待依赖</span></div>
        <div><ShieldAlert aria-hidden="true" /><strong>{summary?.failedOrCorrupt ?? "—"}</strong><span>需要处理</span></div>
      </section>

      <div className="review-inbox-toolbar">
        <div>
          <strong>审核批次与 18 候选进度</strong>
          <p>{projection ? `最后重读：${displayTime(projection.refreshedAt)}` : "正在读取本地原始字节…"}</p>
        </div>
        <button type="button" className="secondary-action" disabled={busy} onClick={() => void refresh("manual")}><RefreshCw aria-hidden="true" />重新读取并预检</button>
      </div>

      {projection?.batches.length ? (
        <div className="review-inbox-batches">
          {projection.batches.map((batch) => (
            <details key={batch.reviewBundleDigest} className="review-inbox-batch" open={projection.batches.length === 1}>
              <summary>
                <span>
                  <strong>审核批次 {shortDigest(batch.reviewBundleDigest)}</strong>
                  <small>{batch.candidates.length ? `${batch.candidates.length} 个候选` : "审核包尚未到达"} · {batch.orphanArtifactIds.length ? `${batch.orphanArtifactIds.length} 个待关联工件` : "依赖键已归组"}</small>
                </span>
                <StatusPill tone={batch.currentBundle ? "jade" : "warning"}>{batch.currentBundle ? "当前协议包" : "等待/失配"}</StatusPill>
              </summary>
              {batch.candidates.length ? (
                <ol className="review-inbox-candidate-list">
                  {batch.candidates.map((candidate) => (
                    <li key={candidate.candidateId}>
                      <span className="review-inbox-candidate-index" aria-hidden="true">{candidate.nodeType}</span>
                      <div>
                        <strong>{candidate.title}</strong>
                        <code title={candidate.candidateDigest}>{candidate.candidateId}</code>
                      </div>
                      <span>{candidate.passedReviewCount} 份双审单件通过</span>
                      <StatusPill tone={candidate.passedAdjudicationCount ? "jade" : candidate.passedReviewCount ? "warning" : "neutral"}>
                        {candidate.passedAdjudicationCount
                          ? `裁决结构通过 ${candidate.passedAdjudicationCount} · 金标 +0`
                          : candidate.passedReviewCount >= 2
                            ? "等待确切裁决文件"
                            : candidate.passedReviewCount === 1
                              ? "等待另一份独立审核"
                              : "尚无结构通过的审核"}
                      </StatusPill>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="review-inbox-empty">已收到引用这个批次的子工件，但确切审核包尚未到达；系统不会跨摘要自动拼接。</p>
              )}
            </details>
          ))}
        </div>
      ) : operation === "loading" ? (
        <div className="data-empty-state" role="status">正在从本地附件分区读取审核原件…</div>
      ) : (
        <div className="review-inbox-empty">
          <Inbox aria-hidden="true" />
          <h2>还没有审核工件</h2>
          <p>先导出当前 18 条候选审核包交给复核人；收到 JSON 后用统一入口导入。文件类型由内容识别，不依赖文件名或手动选择 A/B。</p>
        </div>
      )}

      <section className="data-card review-inbox-artifacts" aria-labelledby="review-inbox-artifacts-title">
        <header className="data-card-heading">
          <div className="data-card-icon"><FileJson2 aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">Raw artifacts</p>
            <h2 id="review-inbox-artifacts-title">本地审核原件</h2>
            <p>保存的是导入时的确切字节。原件进入完整备份；显示状态每次重新派生，不写回附件，也不会伪装成身份签名。</p>
          </div>
          <StatusPill tone="info">{projection?.artifacts.length ?? 0} 个</StatusPill>
        </header>
        {projection?.artifacts.length ? (
          <ul className="attachment-list review-inbox-artifact-list">
            {projection.artifacts.map((artifact) => (
              <li key={artifact.attachmentId}>
                <div className="attachment-main">
                  <FileJson2 aria-hidden="true" />
                  <div>
                    <strong>{artifact.fileName}</strong>
                    <small>{KIND_LABELS[artifact.kind]} · {formatBytes(artifact.byteLength)} · 收到于 {displayTime(artifact.importedAt)}</small>
                    <StatusPill tone={statusTone(artifact.status)}>{STATUS_LABELS[artifact.status]}</StatusPill>
                    <code title={artifact.rawContentHash}>原始字节 {shortDigest(artifact.rawContentHash)}</code>
                    {artifact.artifactDigest ? <code title={artifact.artifactDigest}>工件摘要 {shortDigest(artifact.artifactDigest)}</code> : null}
                    {artifact.candidateId ? <small>候选 {artifact.candidateId}</small> : null}
                    {artifact.errorMessage ? (
                      <details className="review-inbox-error-detail">
                        <summary>查看稳定错误{artifact.errorCode ? ` · ${artifact.errorCode}` : ""}</summary>
                        <p>{artifact.errorMessage}</p>
                      </details>
                    ) : null}
                  </div>
                </div>
                {deleteId === artifact.attachmentId ? (
                  <div className="attachment-delete-confirm" role="group" aria-label={`确认删除审核原件 ${artifact.fileName}`}>
                    <strong>永久删除原始字节？依赖工件不会级联删除。</strong>
                    <button type="button" className="danger-action" disabled={busy} onClick={() => void deleteArtifact(artifact)}>确认删除</button>
                    <button type="button" className="secondary-action" disabled={busy} onClick={() => setDeleteId(null)}>取消</button>
                  </div>
                ) : (
                  <div className="attachment-actions">
                    <button type="button" className="secondary-action" disabled={busy} onClick={() => void downloadArtifact(artifact)}><Download aria-hidden="true" />导出原件</button>
                    <button type="button" className="secondary-action" disabled={busy} onClick={() => setDeleteId(artifact.attachmentId)}><Trash2 aria-hidden="true" />删除</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : <p className="data-empty-state">没有本地审核原件。无效 JSON、未知格式或摘要不匹配的文件会在写入前被拒绝。</p>}
      </section>
    </div>
  );
}
