import { FileDown, LoaderCircle, ShieldCheck, TriangleAlert } from "lucide-react";
import { useState } from "react";
import type { PairStructureResearchProjection } from "@hakimi/contracts";
import { type ReportExportPort, webReportExportPort } from "@hakimi/platform";
import { resolveFileDelivery } from "../lib/file-transfer-feedback";
import {
  PreparedFileDeliveryDialog,
  type PreparedFileArtifact
} from "./prepared-file-delivery-dialog";
import { StatusPill } from "./status-pill";

type PairExportAction = "anonymous" | "full";

type PairStructureReportExportProps = {
  projection: PairStructureResearchProjection;
  exportPort?: ReportExportPort;
};

const REIDENTIFICATION_COPY =
  "即使已移除案例别名、地点与研究文本，出生日期、出生时间和时区仍可能用于重新识别个人。双案例匿名报告还会保留性别、四柱与同步运限事实。";

export function PairStructureReportExport({
  projection,
  exportPort = webReportExportPort
}: PairStructureReportExportProps) {
  const [activeAction, setActiveAction] = useState<PairExportAction | null>(null);
  const [fullAuditConfirmed, setFullAuditConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [preparedArtifact, setPreparedArtifact] = useState<PreparedFileArtifact | null>(null);

  const run = async (action: PairExportAction, operation: () => Promise<void>) => {
    setActiveAction(action);
    setError(null);
    setMessage(null);
    try {
      await operation();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "双案例研究工件导出失败。");
    } finally {
      setActiveAction(null);
    }
  };

  const exportAnonymous = () => run("anonymous", async () => {
    const { exportPairStructureAnonymousMarkdown } = await import("@hakimi/research-export");
    const output = await exportPairStructureAnonymousMarkdown(projection);
    setPreparedArtifact({
      blob: new Blob([output.content], { type: output.mimeType }),
      filename: output.suggestedFileName,
      title: "匿名双案例 Markdown",
      sharePolicy: "allowed",
      description: `这份匿名阅读副本已冻结在本机；下载、指定位置保存和分享都会使用同一份内容。该文件不能替代完整审计 JSON。${REIDENTIFICATION_COPY}`
    });
  });

  const exportFullAudit = () => {
    if (!fullAuditConfirmed) {
      setError("请先确认完整审计 JSON 的敏感资料范围。");
      return Promise.resolve();
    }
    return run("full", async () => {
      const { exportPairStructureFullAuditJson } = await import("@hakimi/research-export");
      const output = await exportPairStructureFullAuditJson(
        projection,
        { acknowledgedSensitiveData: true }
      );
      const delivery = resolveFileDelivery(await exportPort.saveFile(
        new Blob([output.content], { type: output.mimeType }),
        output.suggestedFileName
      ), "完整审计文件导出");
      if (delivery.kind === "error") throw new Error(delivery.message);
      if (delivery.kind === "cancelled") {
        setMessage(delivery.message);
        return;
      }
      setFullAuditConfirmed(false);
      setMessage(`${delivery.message} 再次导出前需要重新确认完整审计 JSON 的敏感资料范围。`);
    });
  };

  const busy = activeAction !== null;

  return (
    <>
      <section
        className="pair-research-export"
        aria-labelledby="pair-research-export-title"
        aria-busy={busy}
      >
      <header className="section-heading-row">
        <div>
          <p className="eyebrow">Portable pair research</p>
          <h2 id="pair-research-export-title">导出确切双案例研究工件</h2>
        </div>
        <StatusPill tone="jade">默认匿名</StatusPill>
      </header>
      <p className="export-scope-note">
        两种文件都会在本机重新验签当前 A/B 确切 Revision 与同一 UTC 瞬时点；只含两方各自事实，不含跨盘推导、关系结论、婚配判断、建议或评分。
      </p>

      {error ? <div className="inline-error" role="alert"><strong>双案例工件未导出</strong><p>{error}</p></div> : null}
      {message ? <p className="success-message" role="status" aria-live="polite" aria-atomic="true">{message}</p> : null}

      <article className="pair-export-anonymous" aria-labelledby="pair-anonymous-export-title">
        <div className="pair-export-card-heading">
          <ShieldCheck aria-hidden="true" />
          <div>
            <h3 id="pair-anonymous-export-title">匿名双案例结构报告</h3>
            <p>仅用对象甲 / 乙与 R 号标识双方，分别保留通过白名单审查的 76 项系统事实和各自六层活动节点。</p>
          </div>
        </div>
        <p className="privacy-warning" id="pair-anonymous-export-warning">{REIDENTIFICATION_COPY}</p>
        <ul className="pair-export-scope-list">
          <li>移除别名、UUID、地点、坐标、来源备注、规则说明、用户文本、哈希和完整运限轨道。</li>
          <li>保留出生日期、时间、时区、性别、四柱与同一 UTC 下每一方自己的运限事实。</li>
        </ul>
        <div className="pair-export-actions">
          <button
            type="button"
            className="primary-action"
            aria-describedby="pair-anonymous-export-warning"
            disabled={busy}
            onClick={() => void exportAnonymous()}
          >
            {activeAction === "anonymous" ? <LoaderCircle className="is-spinning" aria-hidden="true" /> : <FileDown aria-hidden="true" />}
            {activeAction === "anonymous" ? "正在校验匿名报告" : "导出匿名双案例 Markdown"}
          </button>
        </div>
      </article>

      <details className="pair-export-sensitive">
        <summary>
          <span><TriangleAlert aria-hidden="true" />完整审计 JSON（敏感）</span>
          <StatusPill tone="warning">显式确认</StatusPill>
        </summary>
        <div className="pair-export-sensitive-body">
          <p id="pair-full-audit-warning">
            完整文件会原样保存两位对象的别名、出生输入、地点、坐标、来源说明、确切 ID、规则快照、摘要、证据字段与完整运限轨道，用于复算和审计。
          </p>
          <label className="pair-export-confirmation">
            <input
              type="checkbox"
              checked={fullAuditConfirmed}
              disabled={busy}
              onChange={(event) => {
                setFullAuditConfirmed(event.target.checked);
                setError(null);
                setMessage(null);
              }}
            />
            <span>
              <strong>我确认这是包含两位对象可识别资料的完整审计文件</strong>
              <small id="pair-full-audit-confirmation-copy">只会保存到可信位置，或交给已获明确授权的研究者。</small>
            </span>
          </label>
          <div className="pair-export-actions">
            <button
              type="button"
              className="secondary-action"
              aria-describedby="pair-full-audit-warning pair-full-audit-confirmation-copy"
              disabled={busy || !fullAuditConfirmed}
              onClick={() => void exportFullAudit()}
            >
              {activeAction === "full" ? <LoaderCircle className="is-spinning" aria-hidden="true" /> : <FileDown aria-hidden="true" />}
              {activeAction === "full" ? "正在校验完整审计" : "导出完整审计 JSON"}
            </button>
          </div>
        </div>
        </details>
      </section>

      {preparedArtifact ? (
        <PreparedFileDeliveryDialog
          artifact={preparedArtifact}
          exportPort={exportPort}
          onClose={() => setPreparedArtifact(null)}
        />
      ) : null}
    </>
  );
}
