import { Eye, FileDown, ImageDown, LoaderCircle, Printer, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type ReportExportPort, webReportExportPort } from "@hakimi/platform";
import {
  REIDENTIFICATION_WARNING,
  buildSingleChartResearchReport,
  exportResearchCsv,
  exportSingleChartResearchMarkdown,
  type SingleChartResearchReport as SingleChartResearchReportModel
} from "@hakimi/research-export";
import { caseRepository, researchRepository } from "@hakimi/storage";
import { resolveFileDelivery } from "../lib/file-transfer-feedback";
import {
  PreparedFileDeliveryDialog,
  type PreparedFileArtifact
} from "./prepared-file-delivery-dialog";
import { StatusPill } from "./status-pill";
import { SingleChartReport } from "./single-chart-report";

type ExportAction = "preview" | "markdown" | "csv" | "png" | "pdf";

type SingleChartReportExportProps = {
  caseId: string;
  revisionId: string;
  exportPort?: ReportExportPort;
};

async function waitForFonts(): Promise<void> {
  if (typeof document !== "undefined" && document.fonts) await document.fonts.ready;
}

export function SingleChartReportExport({
  caseId,
  revisionId,
  exportPort = webReportExportPort
}: SingleChartReportExportProps) {
  const [anonymized, setAnonymized] = useState(true);
  const [report, setReport] = useState<SingleChartResearchReportModel | null>(null);
  const [activeAction, setActiveAction] = useState<ExportAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [preparedArtifact, setPreparedArtifact] = useState<PreparedFileArtifact | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previewTriggerRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const previewGenerationRef = useRef(0);

  useEffect(() => {
    if (!report) return;
    const dialog = dialogRef.current;
    const previouslyFocused = returnFocusRef.current
      ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const previousBodyOverflow = document.body.style.overflow;
    const focusableSelector = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])"
    ].join(",");
    const getFocusableElements = () => dialog
      ? Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => (
        element.getAttribute("aria-hidden") !== "true" && !element.hasAttribute("hidden")
      ))
      : [];

    document.body.style.overflow = "hidden";
    dialog?.focus();

    const handleDialogKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setReport(null);
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const focusableElements = getFocusableElements();
      if (!focusableElements.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialog || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || active === dialog || !dialog.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleDialogKeydown);
    return () => {
      document.removeEventListener("keydown", handleDialogKeydown);
      document.body.style.overflow = previousBodyOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
      returnFocusRef.current = null;
    };
  }, [report]);

  const buildReport = async (mode: boolean) => buildSingleChartResearchReport(
    await caseRepository.readSingleChartExportSnapshot(caseId, revisionId),
    { anonymized: mode }
  );

  const run = async (action: ExportAction, operation: () => Promise<void>) => {
    setActiveAction(action);
    setError(null);
    setMessage(null);
    try {
      await operation();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "单盘报告导出失败。");
    } finally {
      setActiveAction(null);
    }
  };

  const openPreview = () => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : previewTriggerRef.current;
    const mode = anonymized;
    const generation = ++previewGenerationRef.current;
    return run("preview", async () => {
      const nextReport = await buildReport(mode);
      if (generation !== previewGenerationRef.current) return;
      setReport(nextReport);
      setMessage("已锁定当前路由指定的修订并生成报告预览。");
    });
  };

  const exportMarkdown = () => run("markdown", async () => {
    const mode = anonymized;
    const currentReport = await buildReport(mode);
    const output = exportSingleChartResearchMarkdown(currentReport);
    setPreparedArtifact({
      blob: new Blob([output.content], { type: output.mimeType }),
      filename: output.suggestedFileName,
      title: `${mode ? "匿名" : "完整"}单盘 Markdown`,
      sharePolicy: mode ? "allowed" : "blocked_sensitive",
      description: mode
        ? `这份文件已冻结在本机；下载、指定位置保存和分享都会使用同一份内容。${REIDENTIFICATION_WARNING}`
        : "这份完整单盘文件已冻结在本机，包含案例敏感资料；只能下载或保存到指定的可信位置，不能进入系统分享。"
    });
  });

  const exportCsv = () => run("csv", async () => {
    const [bundle, researchNotes, events] = await Promise.all([
      caseRepository.getCase(caseId),
      researchRepository.listResearchNotesByCase(caseId, { includeArchived: true }),
      researchRepository.listEventsByCase(caseId, { includeDeleted: true })
    ]);
    if (!bundle) throw new Error("案例不存在，无法导出研究 CSV。");
    const output = exportResearchCsv({
      caseRecord: bundle.caseRecord,
      revisions: bundle.revisions,
      researchNotes,
      events
    }, { anonymized });
    setPreparedArtifact({
      blob: new Blob([output.content], { type: output.mimeType }),
      filename: output.suggestedFileName,
      title: `${anonymized ? "匿名" : "完整"}案例研究 CSV`,
      sharePolicy: anonymized ? "allowed" : "blocked_sensitive",
      description: anonymized
        ? `这份文件已冻结在本机；下载、指定位置保存和分享都会使用同一份内容。${REIDENTIFICATION_WARNING}`
        : "这份完整案例研究 CSV 已冻结在本机，包含笔记、事件与案例敏感资料；只能下载或保存到指定的可信位置，不能进入系统分享。"
    });
  });

  const exportPng = () => run("png", async () => {
    const source = summaryRef.current;
    if (!source || !report) throw new Error("请先生成单盘报告预览。");
    await waitForFonts();
    const stage = document.createElement("div");
    stage.className = "single-chart-png-stage";
    stage.setAttribute("aria-hidden", "true");
    const clone = source.cloneNode(true) as HTMLDivElement;
    clone.style.width = "1080px";
    clone.style.maxWidth = "none";
    stage.append(clone);
    document.body.append(stage);
    try {
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(clone, {
        width: 1080,
        height: clone.scrollHeight,
        pixelRatio: 2,
        backgroundColor: "#f4efe5",
        cacheBust: false
      });
      if (!blob) throw new Error("浏览器未能生成 PNG 图像。");
      const delivery = resolveFileDelivery(
        await exportPort.saveFile(blob, `${report.suggestedFileBase}-summary.png`),
        "单盘摘要 PNG 导出"
      );
      if (delivery.kind === "error") throw new Error(delivery.message);
      setMessage(delivery.kind === "cancelled"
        ? delivery.message
        : `${delivery.message} 图像为 1080 宽版式的 2× 高清单盘摘要 PNG。`);
    } finally {
      stage.remove();
    }
  });

  const printPdf = () => run("pdf", async () => {
    if (!report) throw new Error("请先生成单盘报告预览。");
    await waitForFonts();
    await exportPort.printReport();
    setMessage("已打开系统打印窗口；请选择“另存为 PDF”。");
  });

  const busy = activeAction !== null;

  return (
    <>
      <section className="flat-section research-export-section" aria-labelledby="research-export-title">
        <div className="section-heading-row">
          <div><p className="eyebrow">Portable research</p><h2 id="research-export-title">导出确切单盘研究报告</h2></div>
          <StatusPill tone={anonymized ? "jade" : "warning"}>{anonymized ? "默认匿名" : "包含敏感资料"}</StatusPill>
        </div>
        <p className="export-scope-note">报告锁定当前网址中的修订版本；即使案例后来新增修订，也不会自动替换成最新版。</p>
        <label className="privacy-toggle">
          <input
            type="checkbox"
            checked={anonymized}
            disabled={busy}
            onChange={(event) => {
              previewGenerationRef.current += 1;
              setAnonymized(event.target.checked);
              setReport(null);
              setPreparedArtifact(null);
              setMessage(null);
            }}
          />
          <span><strong>匿名导出</strong><small>移除别名、地点、坐标、来源备注、标签、结构化引用、笔记与事件文本；出生日期、时间、时区以及非个人的规则包绑定标识和摘要仍保留。</small></span>
        </label>
        <p className="privacy-warning">{REIDENTIFICATION_WARNING}</p>
        {error ? <div className="inline-error" role="alert"><strong>报告未导出</strong><p>{error}</p></div> : null}
        {message ? <p className="success-message" role="status">{message}</p> : null}
        <div className="journal-actions single-chart-export-actions">
          <button ref={previewTriggerRef} type="button" className="primary-action" disabled={busy} onClick={() => void openPreview()}>
            {activeAction === "preview" ? <LoaderCircle className="is-spinning" aria-hidden="true" /> : <Eye aria-hidden="true" />}
            预览 PNG / PDF
          </button>
          <button type="button" className="secondary-action" disabled={busy} onClick={() => void exportMarkdown()}>
            <FileDown aria-hidden="true" />导出单盘 Markdown
          </button>
          <button type="button" className="secondary-action" disabled={busy} onClick={() => void exportCsv()}>
            <FileDown aria-hidden="true" />导出案例研究 CSV
          </button>
        </div>
      </section>

      {report ? (
        <div className="single-chart-report-modal" role="presentation">
          <section
            ref={dialogRef}
            className="single-chart-report-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="single-chart-report-dialog-title"
            aria-describedby="single-chart-print-help"
            tabIndex={-1}
          >
            <header className="single-chart-report-toolbar">
              <div>
                <p className="eyebrow">Exact revision preview</p>
                <h2 id="single-chart-report-dialog-title">单盘报告预览 · {report.revisionLabel}</h2>
              </div>
              <div className="journal-actions">
                <button type="button" className="secondary-action" disabled={busy} onClick={() => void exportPng()}>
                  {activeAction === "png" ? <LoaderCircle className="is-spinning" aria-hidden="true" /> : <ImageDown aria-hidden="true" />}
                  下载摘要 PNG
                </button>
                <button type="button" className="primary-action" disabled={busy} onClick={() => void printPdf()}>
                  <Printer aria-hidden="true" />打印 / 保存 PDF
                </button>
                <button type="button" className="icon-button" aria-label="关闭单盘报告预览" onClick={() => setReport(null)}>
                  <X aria-hidden="true" />
                </button>
              </div>
            </header>
            <p className="single-chart-print-help" id="single-chart-print-help">PDF 使用浏览器原生打印：选择 A4、默认缩放并关闭浏览器页眉页脚。正文仍可搜索和复制。</p>
            <div className="single-chart-report-scroll" role="region" tabIndex={0} aria-label="单盘报告正文，可滚动">
              <SingleChartReport ref={summaryRef} report={report} />
            </div>
          </section>
        </div>
      ) : null}

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
