import {
  Database,
  Eye,
  FileDown,
  FileText,
  ImageDown,
  LoaderCircle,
  Printer,
  ShieldCheck,
  X
} from "lucide-react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { type ReportExportPort, webReportExportPort } from "@hakimi/platform";
import {
  REIDENTIFICATION_WARNING,
  buildSingleChartResearchReport,
  exportResearchCsv,
  exportSingleChartResearchMarkdown,
  type SingleChartResearchReport as SingleChartResearchReportModel
} from "@hakimi/research-export";
import { caseRepository, researchRepository } from "@hakimi/storage";
import { shortHash } from "../lib/format";
import { useExpertMode } from "../lib/expert-mode";
import {
  PreparedFileDeliveryDialog,
  type PreparedFileArtifact
} from "./prepared-file-delivery-dialog";
import { StatusPill } from "./status-pill";
import { findSingleChartReportBindingIssue, SingleChartReport } from "./single-chart-report";
import "./single-chart-report.css";
import "./single-chart-report-export.css";

type ExportAction = "preview" | "markdown" | "csv" | "png" | "pdf";

type ReportExportMessage = {
  action: ExportAction;
  tone: "success" | "info";
  text: string;
};

type SingleChartReportExportProps = {
  caseId: string;
  revisionId: string;
  exportPort?: ReportExportPort;
};

const MAX_EXPORT_IDENTIFIER_LENGTH = 512;
const MAX_CASE_EXPORT_RECORDS = 10_000;
const PNG_EXPORT_WIDTH = 1080;
const MAX_PNG_CSS_HEIGHT = 16_000;
const MAX_PNG_PIXEL_AREA = 32_000_000;
const MAX_PNG_CANVAS_DIMENSION = 16_384;
const MAX_TEXT_EXPORT_BYTES = 32 * 1024 * 1024;
const MAX_PNG_EXPORT_BYTES = 64 * 1024 * 1024;
const FONT_SETTLE_TIMEOUT_MS = 5_000;
const UNSAFE_EXPORT_IDENTIFIER_PATTERN = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const UNSAFE_TEXT_EXPORT_CONTENT_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const UNSAFE_LOCAL_EXPORT_FILENAME_PATTERN = /[<>:"/\\|?*]/u;
const WINDOWS_RESERVED_EXPORT_FILENAME_PATTERN = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu;
const FULL_SENSITIVE_EXPORT_WARNING = "完整模式保留案例别名、地点、坐标、来源信息、既有结构化引用、旺衰来源资格账（标题、URL、固定版本与权利线索）及完整 binding 反向边界。文件只能保存到可信位置，系统分享保持关闭；注册表 locator 状态不等于 citation 闭合或分发权利结论，生成或保存也不表示获得公开发布授权。";

const SINGLE_CHART_EXPORT_SAFETY_ATTRIBUTES = {
  "data-release-identity": "legacy-v13",
  "data-release-family": "legacy-v13",
  "data-schema-family": "legacy-v13",
  "data-db-generation": "13",
  "data-target-schema": "13",
  "data-migration-id": "null",
  "data-engineering-evidence-only": "true",
  "data-formal-truth-established": "false",
  "data-expert-conclusion-established": "false",
  "data-expert-truth-claimed": "false",
  "data-scientific-validity-claimed": "false",
  "data-public-release-authorized": "false",
  "data-system-share-allowed": "false",
  "data-record-write-performed": "false",
  "data-record-write-state": "not_started",
  "data-mutation-mode": "read-only-no-mutation",
  "data-mutation-epoch-bypassed": "false",
  "data-mutation-epoch-state": "not_bypassed",
  "data-chart-or-storage-mutation-performed": "false",
  "data-result": "null",
} as const;

type HtmlToImageModule = typeof import("html-to-image");
let htmlToImageModulePromise: Promise<HtmlToImageModule> | null = null;

function loadHtmlToImageModule(): Promise<HtmlToImageModule> {
  if (!htmlToImageModulePromise) {
    htmlToImageModulePromise = import("html-to-image").catch((reason: unknown) => {
      htmlToImageModulePromise = null;
      throw reason;
    });
  }
  return htmlToImageModulePromise;
}

function preloadHtmlToImageModule(): void {
  void loadHtmlToImageModule().catch(() => undefined);
}

const EXPORT_ACTION_LABELS: Record<ExportAction, string> = {
  preview: "生成当前修订工程预览",
  markdown: "准备当前修订 Markdown",
  csv: "准备整个案例研究 CSV",
  png: "生成当前报告长图 PNG",
  pdf: "调用系统打印窗口"
};

async function waitForFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      document.fonts.ready,
      new Promise<never>((_resolve, reject) => {
        timeoutId = setTimeout(() => reject(new Error("字体在本地导出等待上限内未就绪，请稍后重试。")), FONT_SETTLE_TIMEOUT_MS);
      })
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

function visibleReportExportError(reason: unknown): string {
  let rawMessage = "";
  try {
    rawMessage = reason instanceof Error ? reason.message : "";
  } catch {
    rawMessage = "";
  }
  const safeMessage = rawMessage
    .slice(0, 2048)
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/gu, " ")
    .replace(/(?:(?:[a-z]:\\|\\\\|\/(?:users|home)\/))[^\s"'<>]+/giu, "[本地路径]")
    .replace(/\b(?:https?|file):\/\/[^\s"'<>]+/giu, "[地址]")
    .replace(/\b(api[_-]?key|authorization|access[_-]?token|refresh[_-]?token|token|secret|password)\s*[:=]\s*[^\s,;]+/giu, "$1=[已隐藏]")
    .replace(/\bbearer\s+[a-z0-9._~+/=-]{8,}/giu, "Bearer [已隐藏]")
    .replace(/\s+/gu, " ")
    .trim();

  return safeMessage ? safeMessage.slice(0, 360) : "单盘报告导出失败。";
}

function findExportSourceBindingIssue(caseId: string, revisionId: string): string | null {
  for (const [label, value] of [["Case ID", caseId], ["Revision ID", revisionId]] as const) {
    if (!value || value !== value.trim()) return `${label} 为空或包含首尾空白。`;
    if (value.length > MAX_EXPORT_IDENTIFIER_LENGTH) return `${label} 超出本地导出长度上限。`;
    if (UNSAFE_EXPORT_IDENTIFIER_PATTERN.test(value)) return `${label} 包含不可显示控制字符。`;
  }
  return null;
}

function isSafeBoundIdentifier(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= MAX_EXPORT_IDENTIFIER_LENGTH
    && value === value.trim()
    && !UNSAFE_EXPORT_IDENTIFIER_PATTERN.test(value);
}

function validateLocalExportFilename(value: unknown, expectedExtension: string): string {
  if (
    typeof value !== "string"
    || value !== value.trim()
    || value.length === 0
    || Array.from(value).length > 180
    || UNSAFE_EXPORT_IDENTIFIER_PATTERN.test(value)
    || UNSAFE_LOCAL_EXPORT_FILENAME_PATTERN.test(value)
    || WINDOWS_RESERVED_EXPORT_FILENAME_PATTERN.test(value)
    || !value.toLowerCase().endsWith(expectedExtension)
  ) {
    throw new Error("导出器返回了不安全或扩展名不匹配的文件名。");
  }
  return value;
}

function validateTextExportArtifact(
  value: unknown,
  kind: "markdown" | "csv"
): { blob: Blob; filename: string } {
  const output = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
  const content = output?.content;
  const mimeType = output?.mimeType;
  const expectedMediaType = kind === "markdown" ? "text/markdown" : "text/csv";
  const expectedExtension = kind === "markdown" ? ".md" : ".csv";
  if (typeof content !== "string" || !/\S/u.test(content)) {
    throw new Error("导出器返回了空文本工件。");
  }
  if (content.length > MAX_TEXT_EXPORT_BYTES) {
    throw new Error(`导出文本超过 ${MAX_TEXT_EXPORT_BYTES} 个 UTF-16 代码单元，已在构造 Blob 前失败关闭。`);
  }
  const contentForControlScan = kind === "csv" && content.startsWith("\uFEFF")
    ? content.slice(1)
    : content;
  if (UNSAFE_TEXT_EXPORT_CONTENT_PATTERN.test(contentForControlScan)) {
    throw new Error("导出文本包含不允许进入本地工件的控制字符。");
  }
  if (
    typeof mimeType !== "string"
    || mimeType !== mimeType.trim()
    || Array.from(mimeType).length > 128
    || UNSAFE_EXPORT_IDENTIFIER_PATTERN.test(mimeType)
    || mimeType.split(";", 1)[0]?.trim().toLowerCase() !== expectedMediaType
  ) {
    throw new Error("导出器返回的媒体类型与所选格式不一致。");
  }
  const filename = validateLocalExportFilename(output?.suggestedFileName, expectedExtension);
  const blob = new Blob([content], { type: mimeType });
  if (blob.size > MAX_TEXT_EXPORT_BYTES) {
    throw new Error(`导出文本为 ${blob.size} 字节，超过 ${MAX_TEXT_EXPORT_BYTES} 字节的本地交付上限。`);
  }
  return { blob, filename };
}

function assertCaseBoundExportRecords(
  label: string,
  records: readonly unknown[],
  expectedCaseId: string,
): void {
  if (records.length > MAX_CASE_EXPORT_RECORDS) {
    throw new Error(`${label}超过单次本地导出的 ${MAX_CASE_EXPORT_RECORDS} 条上限，已停止生成 CSV。`);
  }

  const recordIds = new Set<string>();

  for (const value of records) {
    if (!value || typeof value !== "object") {
      throw new Error(`${label}存在格式异常记录，已停止生成 CSV。`);
    }

    const record = value as { id?: unknown; caseId?: unknown };
    const recordId = record.id;

    if (!isSafeBoundIdentifier(recordId) || record.caseId !== expectedCaseId) {
      throw new Error(`${label}未通过案例绑定校验，已停止生成 CSV。`);
    }
    if (recordIds.has(recordId)) {
      throw new Error(`${label}存在重复记录 ID，已停止生成 CSV。`);
    }

    recordIds.add(recordId);
  }
}

function sanitizePngCloneElement(element: HTMLElement): void {
  element.removeAttribute("id");
  element.removeAttribute("aria-labelledby");
  element.removeAttribute("aria-describedby");
  element.removeAttribute("aria-controls");
  // html-to-image snapshots an off-screen clone. Screen-only content-visibility
  // optimizations otherwise allow Chromium to omit long report sections from
  // the resulting bitmap even though their DOM nodes are present.
  element.style.setProperty("content-visibility", "visible", "important");
  element.style.setProperty("contain-intrinsic-size", "none", "important");
  // The interactive report intentionally keeps local receipt details collapsed.
  // A static bitmap has no disclosure interaction, so expand only the detached
  // PNG clone or the receipt/fingerprint/digest fields would not be painted.
  if (element.matches("details")) {
    element.setAttribute("open", "");
  }
  if (element.matches("a, button, input, select, textarea, [tabindex]")) {
    element.removeAttribute("href");
    element.setAttribute("tabindex", "-1");
  }
}

function sanitizePngClone(root: HTMLElement): void {
  sanitizePngCloneElement(root);
  for (const element of root.querySelectorAll<HTMLElement>("*")) {
    sanitizePngCloneElement(element);
  }
}

function buildPngRenderPlan(root: HTMLElement): { height: number; pixelRatio: number } {
  const height = Math.ceil(Math.max(
    root.scrollHeight,
    root.offsetHeight,
    root.getBoundingClientRect().height
  ));

  if (!Number.isFinite(height) || height <= 0) {
    throw new Error("浏览器未能测量报告长图尺寸，请改用 PDF。");
  }
  if (height > MAX_PNG_CSS_HEIGHT) {
    throw new Error(`报告长图高度超过 ${MAX_PNG_CSS_HEIGHT} 像素的本地安全上限，请改用 PDF。`);
  }

  const pixelRatio = Math.max(
    1,
    Math.min(
      2,
      Math.sqrt(MAX_PNG_PIXEL_AREA / (PNG_EXPORT_WIDTH * height)),
      MAX_PNG_CANVAS_DIMENSION / PNG_EXPORT_WIDTH,
      MAX_PNG_CANVAS_DIMENSION / height
    )
  );
  return { height, pixelRatio };
}

export function SingleChartReportExport({
  caseId,
  revisionId,
  exportPort = webReportExportPort
}: SingleChartReportExportProps) {
  const { expertMode } = useExpertMode();
  const sourceKey = JSON.stringify([caseId, revisionId]);
  const [stateSourceKey, setStateSourceKey] = useState(sourceKey);
  const [anonymized, setAnonymized] = useState(true);
  const [report, setReport] = useState<SingleChartResearchReportModel | null>(null);
  const [activeAction, setActiveAction] = useState<ExportAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<ReportExportMessage | null>(null);
  const [preparedArtifact, setPreparedArtifact] = useState<PreparedFileArtifact | null>(null);
  const exportTitleId = useId();
  const dialogTitleId = useId();
  const printHelpId = useId();
  const privacyHelpId = useId();
  const privacyWarningId = useId();
  const reportRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previewTriggerRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const previewGenerationRef = useRef(0);
  const actionGenerationRef = useRef(0);
  const actionInFlightRef = useRef(false);
  const mountedRef = useRef(false);
  const pngStageRef = useRef<HTMLDivElement | null>(null);
  const latestSourceKeyRef = useRef(sourceKey);
  const resetSourceKeyRef = useRef(sourceKey);
  const sourceBindingIssue = findExportSourceBindingIssue(caseId, revisionId);

  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      previewGenerationRef.current += 1;
      actionGenerationRef.current += 1;
      actionInFlightRef.current = false;
      pngStageRef.current?.remove();
      pngStageRef.current = null;
    };
  }, []);

  const closePreview = useCallback(() => {
    if (actionInFlightRef.current) return;
    previewGenerationRef.current += 1;
    actionGenerationRef.current += 1;
    actionInFlightRef.current = false;
    setActiveAction(null);
    setReport(null);
    setMessage((current) => current?.action === "preview" ? null : current);
  }, []);

  const sourceCurrent = stateSourceKey === sourceKey;
  const visibleReport = sourceCurrent ? report : null;
  const visiblePreparedArtifact = sourceCurrent ? preparedArtifact : null;
  const visibleError = sourceCurrent ? error : null;
  const visibleMessage = sourceCurrent ? message : null;

  useEffect(() => {
    latestSourceKeyRef.current = sourceKey;
    if (resetSourceKeyRef.current === sourceKey) return;
    resetSourceKeyRef.current = sourceKey;
    previewGenerationRef.current += 1;
    actionGenerationRef.current += 1;
    actionInFlightRef.current = false;
    pngStageRef.current?.remove();
    pngStageRef.current = null;
    setStateSourceKey(sourceKey);
    setReport(null);
    setActiveAction(null);
    setError(null);
    setMessage(null);
    setPreparedArtifact(null);
    returnFocusRef.current = null;
  }, [sourceKey]);

  useEffect(() => {
    if (!visibleReport) return;
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
      "summary",
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
        closePreview();
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
  }, [closePreview, visibleReport]);

  const buildReport = async (mode: boolean) => {
    if (sourceBindingIssue) throw new Error(`导出来源绑定无效：${sourceBindingIssue}`);
    const nextReport = await buildSingleChartResearchReport(
      await caseRepository.readSingleChartExportSnapshot(caseId, revisionId),
      { anonymized: mode }
    );
    const bindingIssue = findSingleChartReportBindingIssue(nextReport);
    if (bindingIssue) throw new Error(`报告绑定校验失败：${bindingIssue}`);
    return nextReport;
  };

  const run = async (
    action: ExportAction,
    operation: (isCurrent: () => boolean) => Promise<void>
  ) => {
    if (actionInFlightRef.current || sourceBindingIssue) return;
    const operationSourceKey = sourceKey;
    const generation = ++actionGenerationRef.current;
    const isCurrent = () => (
      mountedRef.current &&
      generation === actionGenerationRef.current &&
      operationSourceKey === latestSourceKeyRef.current
    );
    actionInFlightRef.current = true;
    setActiveAction(action);
    setError(null);
    setMessage(null);
    try {
      await operation(isCurrent);
    } catch (reason) {
      if (isCurrent()) setError(visibleReportExportError(reason));
    } finally {
      if (isCurrent()) {
        actionInFlightRef.current = false;
        setActiveAction(null);
      }
    }
  };

  const openPreview = () => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : previewTriggerRef.current;
    const mode = anonymized;
    const generation = ++previewGenerationRef.current;
    return run("preview", async (isCurrent) => {
      const nextReport = await buildReport(mode);
      if (generation !== previewGenerationRef.current || !isCurrent()) return;
      setReport(nextReport);
      setMessage({ action: "preview", tone: "info", text: "已按当前路由读取并生成工程预览；请在导出前核对案例与修订标识。" });
    });
  };

  const exportMarkdown = () => run("markdown", async (isCurrent) => {
    const mode = anonymized;
    const currentReport = await buildReport(mode);
    if (!isCurrent()) return;
    const output = exportSingleChartResearchMarkdown(currentReport);
    const artifact = validateTextExportArtifact(output, "markdown");
    setPreparedArtifact({
      blob: artifact.blob,
      filename: artifact.filename,
      title: `${mode ? "匿名" : "完整"}单盘 Markdown`,
      sharePolicy: "blocked_sensitive",
      description: mode
        ? `这份工件内容已在本机内存中冻结，尚不代表已经下载或保存；下载和指定位置保存会使用同一份内容。系统分享因重识别风险保持关闭。${REIDENTIFICATION_WARNING}`
        : "这份完整单盘工件已在本机内存中冻结，尚不代表已经下载或保存；内容包含案例敏感资料，只能下载或保存到指定的可信位置，不能进入系统分享。"
    });
  });

  const exportCsv = () => run("csv", async (isCurrent) => {
    if (sourceBindingIssue) throw new Error(`导出来源绑定无效：${sourceBindingIssue}`);
    const mode = anonymized;
    const [bundle, researchNotes, events] = await Promise.all([
      caseRepository.getCase(caseId),
      researchRepository.listResearchNotesByCase(caseId, { includeArchived: true }),
      researchRepository.listEventsByCase(caseId, { includeDeleted: true })
    ]);
    if (!isCurrent()) return;
    if (!bundle) throw new Error("案例不存在，无法导出研究 CSV。");
    if (bundle.caseRecord.id !== caseId) throw new Error("案例仓库返回了不匹配的来源，研究 CSV 已拒绝导出。");
    assertCaseBoundExportRecords("修订记录", bundle.revisions, caseId);
    assertCaseBoundExportRecords("研究笔记", researchNotes, caseId);
    assertCaseBoundExportRecords("研究事件", events, caseId);
    if (!bundle.revisions.some((revision) => revision.id === revisionId)) {
      throw new Error("当前 Revision 不在该 Case 的导出快照中，已停止生成 CSV。");
    }
    const output = exportResearchCsv({
      caseRecord: bundle.caseRecord,
      revisions: bundle.revisions,
      researchNotes,
      events
    }, { anonymized: mode });
    const artifact = validateTextExportArtifact(output, "csv");
    setPreparedArtifact({
      blob: artifact.blob,
      filename: artifact.filename,
      title: `${mode ? "匿名" : "完整"}案例研究 CSV`,
      sharePolicy: "blocked_sensitive",
      description: mode
        ? `这份工件内容已在本机内存中冻结，尚不代表已经下载或保存；下载和指定位置保存会使用同一份内容。系统分享因重识别风险保持关闭。${REIDENTIFICATION_WARNING}`
        : "这份完整案例研究 CSV 已在本机内存中冻结，尚不代表已经下载或保存；内容包含笔记、事件与案例敏感资料，只能下载或保存到指定的可信位置，不能进入系统分享。"
    });
  });

  const exportPng = () => {
    const preview = visibleReport;
    return run("png", async (isCurrent) => {
      const source = reportRef.current;
      if (!source || !preview) throw new Error("请先生成单盘报告预览。");
      await waitForFonts();
      if (!isCurrent()) return;
      const stage = document.createElement("div");
      stage.className = "single-chart-png-stage";
      stage.setAttribute("aria-hidden", "true");
      stage.setAttribute("inert", "");
      const clone = source.cloneNode(true) as HTMLElement;
      clone.classList.add("single-chart-report--png-export");
      sanitizePngClone(clone);
      clone.style.width = `${PNG_EXPORT_WIDTH}px`;
      clone.style.maxWidth = "none";
      stage.append(clone);
      document.body.append(stage);
      pngStageRef.current = stage;
      try {
        const renderPlan = buildPngRenderPlan(clone);
        const { toBlob } = await loadHtmlToImageModule();
        const blob = await toBlob(clone, {
          width: PNG_EXPORT_WIDTH,
          height: renderPlan.height,
          pixelRatio: renderPlan.pixelRatio,
          backgroundColor: "#f4efe5",
          cacheBust: false
        });
        if (!blob) throw new Error("浏览器未能生成 PNG 图像。");
        if (blob.size === 0) throw new Error("浏览器生成了空 PNG 工件，已停止交付。");
        if (blob.type.split(";", 1)[0]?.trim().toLowerCase() !== "image/png") {
          throw new Error("浏览器返回的图像媒体类型不是 PNG，已停止交付。");
        }
        if (blob.size > MAX_PNG_EXPORT_BYTES) {
          throw new Error(`报告长图为 ${blob.size} 字节，超过 ${MAX_PNG_EXPORT_BYTES} 字节的本地交付上限。`);
        }
        if (!isCurrent()) return;
        const filename = validateLocalExportFilename(`${preview.suggestedFileBase}-report.png`, ".png");
        setPreparedArtifact({
          blob,
          filename,
          title: `${preview.anonymized ? "匿名" : "完整"}单盘报告长图 PNG`,
          sharePolicy: "blocked_sensitive",
          description: preview.anonymized
            ? `这份长图按 1080 CSS px 布局宽度生成，并已在本机内存中冻结；采用 ${renderPlan.pixelRatio.toFixed(2)}× 自适应像素密度，实际位图尺寸会随密度变化。尚未下载或保存。系统分享因重识别风险保持关闭。${REIDENTIFICATION_WARNING}`
            : `这份长图按 1080 CSS px 布局宽度生成，并已在本机内存中冻结；采用 ${renderPlan.pixelRatio.toFixed(2)}× 自适应像素密度，实际位图尺寸会随密度变化。尚未下载或保存。内容包含案例敏感资料，只能下载或保存到指定的可信位置，不能进入系统分享。`
        });
        setMessage({
          action: "png",
          tone: "info",
          text: "长图 PNG 已在本机内存中生成；这不表示已经下载或保存，请在文件交付对话框中选择通道并核对回执。"
        });
      } finally {
        stage.remove();
        if (pngStageRef.current === stage) pngStageRef.current = null;
      }
    });
  };

  const printPdf = () => {
    const preview = visibleReport;
    return run("pdf", async (isCurrent) => {
      if (!preview) throw new Error("请先生成单盘报告预览。");
      await waitForFonts();
      if (!isCurrent()) return;
      await exportPort.printReport();
      if (isCurrent()) setMessage({ action: "pdf", tone: "info", text: "系统打印调用已完成；是否保存为 PDF 仍由系统窗口结果决定。" });
    });
  };

  const busy = !sourceCurrent || activeAction !== null;
  const controlsDisabled = busy
    || sourceBindingIssue !== null
    || visiblePreparedArtifact !== null
    || visibleReport !== null;
  const visibleBlockingError = sourceBindingIssue
    ? `导出来源绑定无效：${sourceBindingIssue}`
    : visibleError;
  const visibleCaseId = isSafeBoundIdentifier(caseId)
    ? caseId
    : "不可显示（未通过绑定校验）";
  const visibleRevisionId = isSafeBoundIdentifier(revisionId)
    ? revisionId
    : "不可显示（未通过绑定校验）";
  const displayedCaseId = isSafeBoundIdentifier(caseId) && !expertMode
    ? shortHash(caseId)
    : visibleCaseId;
  const displayedRevisionId = isSafeBoundIdentifier(revisionId) && !expertMode
    ? shortHash(revisionId)
    : visibleRevisionId;
  const exportState = !sourceCurrent
    ? "source-transition"
    : sourceBindingIssue
      ? "binding-invalid"
      : activeAction
        ? `running-${activeAction}`
        : visiblePreparedArtifact
          ? "prepared-not-necessarily-saved"
          : visibleBlockingError
            ? "failed"
            : visibleReport
              ? "preview-ready"
              : visibleMessage
                ? "feedback"
                : "idle";
  const feedbackContent = (
    <>
      {visibleBlockingError ? (
        <div className="inline-error single-chart-export-feedback" role="alert">
          <strong>{sourceBindingIssue ? "导出来源未绑定" : "本地交付未完成"}</strong>
          <p>{visibleBlockingError}{sourceBindingIssue ? "" : " 可再次选择同一格式重试。"}</p>
        </div>
      ) : null}
      {visibleMessage ? (
        <p
          className="success-message single-chart-export-feedback"
          data-action={visibleMessage.action}
          data-tone={visibleMessage.tone}
          role="status"
        >
          {visibleMessage.text}
        </p>
      ) : null}
    </>
  );
  const progressContent = activeAction ? (
    <div className="single-chart-export-progress" data-action={activeAction} role="status">
      <LoaderCircle className="is-spinning" aria-hidden="true" />
      <span><strong>正在准备本地导出</strong><small>{EXPORT_ACTION_LABELS[activeAction]}</small></span>
    </div>
  ) : null;

  return (
    <>
      <section
        className="flat-section research-export-section single-chart-export-surface"
        data-active-action={activeAction ?? "idle"}
        data-anonymized={anonymized}
        data-binding-status={sourceBindingIssue ? "invalid" : "bound"}
        data-delivery-open={visiblePreparedArtifact !== null}
        data-artifact-state={visiblePreparedArtifact ? "prepared-not-necessarily-saved" : "not-prepared"}
        data-export-state={exportState}
        data-feedback-action={visibleMessage?.action ?? "none"}
        {...SINGLE_CHART_EXPORT_SAFETY_ATTRIBUTES}
        aria-labelledby={exportTitleId}
        aria-busy={busy}
      >
        <div className="section-heading-row">
          <div className="single-chart-export-title-block">
            <p className="eyebrow">LOCAL ARTIFACT / 本地研究工件</p>
            <h2 id={exportTitleId}>按当前修订准备工程研究报告</h2>
            <p>先核对导出范围与匿名模式，再生成仅供本地研究使用的交付文件。</p>
          </div>
          <StatusPill tone="warning">{anonymized ? "匿名模式 · 仍可重识别" : "敏感字段已包含"}</StatusPill>
        </div>
        <div className="single-chart-export-overview">
          <div className="single-chart-export-scope-card">
            <p className="export-scope-note"><strong>范围分离：</strong>预览、长图 PNG、PDF 与单盘 Markdown 读取当前网址中的修订；案例研究 CSV 是独立的整案归档，包含该案例的全部修订、笔记与事件。</p>
            <div className="single-chart-export-binding-heading" data-status={sourceBindingIssue ? "invalid" : "bound"}>
              <span>EXACT ROUTE BINDING</span>
              <strong>{sourceBindingIssue ? "绑定校验拒绝" : "已绑定当前路由"}</strong>
            </div>
            <dl className="single-chart-export-binding-ledger" aria-label={expertMode ? "当前导出来源完整标识" : "当前导出来源短标识"}>
              <div><dt>{expertMode ? "Case ID" : "案例短标识"}</dt><dd><code>{displayedCaseId}</code></dd></div>
              <div><dt>{expertMode ? "Revision ID" : "修订短标识"}</dt><dd><code>{displayedRevisionId}</code></dd></div>
            </dl>
            <dl className="single-chart-export-scope-ledger" aria-label="导出范围摘要">
              <div><dt>单盘报告</dt><dd>当前 Revision</dd></div>
              <div><dt>研究 CSV</dt><dd>整个 Case</dd></div>
              <div><dt>当前模式</dt><dd>{anonymized ? "匿名，仍可重识别" : "完整敏感内容"}</dd></div>
              <div><dt>系统分享</dt><dd>{anonymized ? "重识别风险，入口关闭" : "敏感文件，入口关闭"}</dd></div>
            </dl>
          </div>
          <aside className="single-chart-export-readiness" aria-label="导出工程边界">
            <div><ShieldCheck aria-hidden="true" /><span><small>执行类型</small><strong>只读读取，无数据写入</strong></span></div>
            <div><FileText aria-hidden="true" /><span><small>默认身份</small><strong>legacy-v13 · Schema 13 · migration null</strong></span></div>
            <div><Database aria-hidden="true" /><span><small>证据等级</small><strong>工程导出，不是专家真值</strong></span></div>
          </aside>
        </div>
        <label className="privacy-toggle">
          <input
            type="checkbox"
            checked={anonymized}
            disabled={controlsDisabled}
            aria-describedby={`${privacyHelpId} ${privacyWarningId}`}
            onChange={(event) => {
              previewGenerationRef.current += 1;
              setAnonymized(event.target.checked);
              setReport(null);
              setPreparedArtifact(null);
              setError(null);
              setMessage(null);
            }}
          />
          <span><strong>{anonymized ? "匿名导出已开启" : "匿名导出已关闭"}</strong><small id={privacyHelpId}>{anonymized ? "移除别名、地点、坐标、来源备注、标签、结构化引用、笔记、事件文本，以及旺衰来源资格账和 binding / locator / 版本 / 权利线索 / 反向边界明细；出生日期、时间、时区、非个人规则包标识及旺衰逻辑计数仍保留。" : FULL_SENSITIVE_EXPORT_WARNING}</small></span>
        </label>
        <p className="privacy-warning" id={privacyWarningId}>{anonymized ? REIDENTIFICATION_WARNING : FULL_SENSITIVE_EXPORT_WARNING}</p>
        <aside className="single-chart-export-boundary" aria-label="报告交付授权边界">
          <div className="single-chart-export-boundary-copy">
            <strong>本地交付边界</strong>
            <span>下载、指定位置保存或打印只说明当前文件交付动作完成；不构成专家真值、术数有效性证明或公开发布授权。匿名处理降低直接识别，不消除重识别风险。</span>
          </div>
          <div className="single-chart-export-release-rail" role="group" aria-label="单盘工件发布与保存边界">
            <span>legacy-v13</span><span>Schema 13</span><span>migration null</span><span>prepared ≠ saved</span>
          </div>
        </aside>
        {!visibleReport ? feedbackContent : null}
        {!visibleReport ? progressContent : null}
        <div className="single-chart-export-action-groups">
          <div className="single-chart-export-action-group" role="group" aria-label="当前修订交付">
            <div className="single-chart-export-action-heading"><span aria-hidden="true">01</span><div><h3>当前 Revision 交付</h3><p>先预览校对，再选择可检索文本或图像、打印格式。</p></div></div>
            <div className="single-chart-export-format-grid">
              <button ref={previewTriggerRef} type="button" className="primary-action single-chart-export-action-card" data-format="preview" disabled={controlsDisabled} aria-busy={activeAction === "preview"} onClick={() => void openPreview()}>
                <span className="single-chart-export-action-icon">{activeAction === "preview" ? <LoaderCircle className="is-spinning" aria-hidden="true" /> : <Eye aria-hidden="true" />}</span>
                <span className="single-chart-export-action-copy"><strong>{activeAction === "preview" ? "正在生成报告预览" : "预览当前修订报告"}</strong><small>核对正文、证据边界与修订标识</small></span>
                <span className="single-chart-export-action-tag" aria-hidden="true">PREVIEW</span>
              </button>
              <button type="button" className="secondary-action single-chart-export-action-card" data-format="markdown" disabled={controlsDisabled} aria-busy={activeAction === "markdown"} onClick={() => void exportMarkdown()}>
                <span className="single-chart-export-action-icon">{activeAction === "markdown" ? <LoaderCircle className="is-spinning" aria-hidden="true" /> : <FileDown aria-hidden="true" />}</span>
                <span className="single-chart-export-action-copy"><strong>{activeAction === "markdown" ? "正在生成 Markdown" : "准备单盘 Markdown"}</strong><small>当前 Revision 的可检索研究文本</small></span>
                <span className="single-chart-export-action-tag" aria-hidden="true">MD</span>
              </button>
            </div>
          </div>
          <div className="single-chart-export-action-group" data-scope="whole-case" role="group" aria-label="整个案例归档">
            <div className="single-chart-export-action-heading"><span aria-hidden="true">02</span><div><h3>整个 Case 归档</h3><p>这是独立整案数据包，不等同于当前修订单盘报告。</p></div></div>
            <div className="single-chart-export-format-grid">
              <button type="button" className="secondary-action single-chart-export-action-card" data-format="csv" disabled={controlsDisabled} aria-busy={activeAction === "csv"} onClick={() => void exportCsv()}>
                <span className="single-chart-export-action-icon">{activeAction === "csv" ? <LoaderCircle className="is-spinning" aria-hidden="true" /> : <Database aria-hidden="true" />}</span>
                <span className="single-chart-export-action-copy"><strong>{activeAction === "csv" ? "正在生成研究 CSV" : "准备案例研究 CSV"}</strong><small>全部修订、研究笔记与事件记录</small></span>
                <span className="single-chart-export-action-tag" aria-hidden="true">CSV</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {visibleReport ? (
        <div className="single-chart-report-modal" data-active-action={activeAction ?? "idle"} role="presentation">
          <section
            ref={dialogRef}
            className="single-chart-report-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            aria-describedby={printHelpId}
            aria-busy={busy}
            data-export-state={exportState}
            data-feedback-action={visibleMessage?.action ?? "none"}
            {...SINGLE_CHART_EXPORT_SAFETY_ATTRIBUTES}
            tabIndex={-1}
          >
            <header className="single-chart-report-toolbar">
              <div>
                <p className="eyebrow">Exact revision preview</p>
                <h2 id={dialogTitleId}>单盘报告预览 · {visibleReport.revisionLabel}</h2>
                <p className="single-chart-report-toolbar-binding">{visibleReport.anonymized ? "匿名研究报告" : "完整敏感报告，仅限本地"} · {visibleReport.caseReference}</p>
              </div>
              <div className="journal-actions single-chart-report-toolbar-actions">
                <button type="button" className="secondary-action" data-format="png" disabled={busy} aria-busy={activeAction === "png"} onPointerEnter={preloadHtmlToImageModule} onFocus={preloadHtmlToImageModule} onClick={() => void exportPng()}>
                  {activeAction === "png" ? <LoaderCircle className="is-spinning" aria-hidden="true" /> : <ImageDown aria-hidden="true" />}
                  {activeAction === "png" ? "正在生成报告长图" : "准备长图 PNG"}
                </button>
                <button type="button" className="primary-action" data-format="pdf" disabled={busy} aria-busy={activeAction === "pdf"} onClick={() => void printPdf()}>
                  {activeAction === "pdf" ? <LoaderCircle className="is-spinning" aria-hidden="true" /> : <Printer aria-hidden="true" />}{activeAction === "pdf" ? "正在打开打印窗口" : "打印 / 保存 PDF"}
                </button>
                <button
                  type="button"
                  className="icon-button"
                  disabled={busy}
                  aria-label={busy ? "导出进行中，完成后可关闭单盘报告预览" : "关闭单盘报告预览"}
                  title={busy ? "导出进行中，完成后可关闭" : "关闭单盘报告预览"}
                  onClick={closePreview}
                >
                  <X aria-hidden="true" />
                </button>
              </div>
            </header>
            <p className="single-chart-print-help" id={printHelpId}>PDF 使用浏览器原生打印：选择 A4、默认缩放并关闭浏览器页眉页脚。打印样式保留工程证据边界，打印或保存结果不构成专家真值与公开发布授权。</p>
            {feedbackContent}
            {progressContent}
            <div className="single-chart-report-scroll" role="region" tabIndex={0} aria-label="单盘报告正文，可滚动">
              <SingleChartReport ref={reportRef} report={visibleReport} />
            </div>
          </section>
        </div>
      ) : null}

      {visiblePreparedArtifact ? (
        <PreparedFileDeliveryDialog
          artifact={visiblePreparedArtifact}
          exportPort={exportPort}
          onClose={() => setPreparedArtifact(null)}
        />
      ) : null}
    </>
  );
}
