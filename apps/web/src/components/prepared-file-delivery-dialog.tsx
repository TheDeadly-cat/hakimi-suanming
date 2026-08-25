import { Download, Fingerprint, LoaderCircle, Save, Share2, Shield, X } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { FileDeliveryResult, FileTransferCapabilities, ReportExportPort } from "@hakimi/platform";
import {
  resolveFileDelivery,
  safeFileTransferText,
  type FileDeliveryResolution
} from "../lib/file-transfer-feedback";
import { safeVisibleText as safeArtifactText } from "../lib/visible-text";
import {
  acknowledgePreparedFileDeliveryIssue,
  acquirePreparedFileDelivery,
  getPreparedFileDeliverySnapshot,
  isCurrentPreparedFileDelivery,
  releasePreparedFileDelivery,
  requirePreparedFileDeliveryManualCheck,
  subscribePreparedFileDelivery,
  type PreparedFileDeliveryIntent
} from "./prepared-file-delivery-coordinator";
import "./system-surfaces.css";
import "./prepared-file-delivery-dialog.css";

export type PreparedFileArtifact = Readonly<{
  blob: Blob;
  filename: string;
  title: string;
  description: string;
  sharePolicy: "allowed" | "blocked_sensitive";
}>;

type DeliveryIntent = PreparedFileDeliveryIntent;
type DeliveryMessageKind = "completed" | "requested" | "cancelled";
type LocalDeliveryMessageKind = Exclude<DeliveryMessageKind, "requested">;
type ConfirmedFileDeliveryResolution = Exclude<FileDeliveryResolution, { kind: "error" }>;
type ArtifactDigestState = {
  status: "calculating" | "calculated" | "skipped" | "unavailable" | "failed";
  value: string | null;
};

export type PreparedFileDeliveryDialogProps = Readonly<{
  artifact: PreparedFileArtifact;
  exportPort: ReportExportPort;
  onClose(): void;
  onDeliveryResolution?(event: PreparedFileDeliveryResolution): void;
}>;

export type PreparedFileDeliveryResolution = Readonly<{
  artifact: PreparedFileArtifact;
  intent: PreparedFileDeliveryIntent;
  result: FileDeliveryResult;
  resolution: ConfirmedFileDeliveryResolution;
}>;

const unsafeVisibleTextPattern = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const MAX_ARTIFACT_DIGEST_BYTES = 64 * 1024 * 1024;
const ARTIFACT_DIGEST_STAGE_LABEL: Record<ArtifactDigestState["status"], string> = {
  calculating: "本机摘要计算中",
  calculated: "本机摘要已计算",
  skipped: "摘要超过前台上限",
  unavailable: "摘要能力不可用",
  failed: "摘要计算未完成"
};
const saveFailureStages = new Set(["download", "pick", "create_writable", "write", "close"]);
const saveDeliveryStatuses = new Set(["saved", "download_requested", "cancelled", "unsupported", "failed"]);
const shareDeliveryStatuses = new Set(["shared", "cancelled", "unsupported", "failed"]);
const artifactRuntimeIdentities = new WeakMap<Blob, number>();
let nextArtifactRuntimeIdentity = 0;

function artifactRuntimeIdentity(blob: Blob): number {
  const existing = artifactRuntimeIdentities.get(blob);
  if (existing !== undefined) return existing;
  const identity = ++nextArtifactRuntimeIdentity;
  artifactRuntimeIdentities.set(blob, identity);
  return identity;
}

function deliveryIntentLabel(intent: DeliveryIntent): string {
  if (intent === "chosen_location") return "保存到指定位置";
  if (intent === "download") return "浏览器下载";
  return "系统分享";
}

function normalizedArtifactText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .slice(0, 4_096)
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function boundedArtifactDescriptorText(value: unknown, limit: number): string {
  return typeof value === "string" ? value.slice(0, limit + 1) : `[${typeof value}]`;
}

async function calculateArtifactSha256(blob: Blob): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("Web Crypto unavailable");
  const digest = await subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function formatBytes(bytes: number): string {
  if (!Number.isSafeInteger(bytes) || bytes < 0) return "不可用";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GiB`;
}

function preparedArtifactIssue(artifact: PreparedFileArtifact): string | null {
  if (typeof artifact.title !== "string" || artifact.title.length > 480) {
    return "工件标题为空或超过 240 个字符。";
  }
  const normalizedTitle = normalizedArtifactText(artifact.title);
  if (!normalizedTitle) {
    return "工件标题为空。";
  }
  if (Array.from(normalizedTitle).length > 240) {
    return "工件标题超过 240 个字符。";
  }
  if (typeof artifact.description !== "string" || artifact.description.length > 4_000) {
    return "工件交付说明为空或超过 2000 个字符。";
  }
  const normalizedDescription = normalizedArtifactText(artifact.description);
  if (!normalizedDescription) {
    return "工件交付说明为空。";
  }
  if (Array.from(normalizedDescription).length > 2_000) {
    return "工件交付说明超过 2000 个字符。";
  }
  if (artifact.sharePolicy !== "allowed" && artifact.sharePolicy !== "blocked_sensitive") {
    return "工件分享策略不可识别。";
  }
  if (typeof Blob === "undefined" || !(artifact.blob instanceof Blob)) {
    return "工件没有有效的 Blob 文件载荷。";
  }
  if (!Number.isSafeInteger(artifact.blob.size) || artifact.blob.size <= 0) {
    return "工件没有可交付的文件字节。";
  }
  if (artifact.blob.type.length > 200 || unsafeVisibleTextPattern.test(artifact.blob.type)) {
    return "工件 MIME 类型不可安全显示。";
  }
  const filename = artifact.filename;
  if (typeof filename !== "string" || !filename || filename.trim() !== filename) {
    return "文件名为空或包含首尾空白。";
  }
  if (filename.length > 240) {
    return "文件名超过 240 个字符。";
  }
  if (filename === "." || filename === ".." || /[<>:"/\\|?*\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u.test(filename)) {
    return "文件名包含跨平台文件系统不允许的字符。";
  }
  if (/[. ]$/.test(filename)) {
    return "文件名不能以句点或空格结尾。";
  }
  const basename = filename.split(".", 1)[0]!.replace(/[. ]+$/u, "").toUpperCase();
  if (/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/.test(basename)) {
    return "文件名使用了 Windows 保留设备名称。";
  }
  return null;
}

function readDeliveryCapabilities(exportPort: ReportExportPort): {
  capabilities: FileTransferCapabilities | null;
  error: string | null;
} {
  try {
    const value: unknown = exportPort.getCapabilities();
    if (!value || typeof value !== "object") {
      return { capabilities: null, error: "文件交付适配器没有返回结构化能力声明。" };
    }
    const record = value as Record<string, unknown>;
    const keys = ["canDownloadFiles", "canChooseSaveLocation", "canShareFiles"] as const;
    if (keys.some((key) => typeof record[key] !== "boolean")) {
      return { capabilities: null, error: "文件交付适配器返回了不可识别的能力标志。" };
    }
    if (
      (record.canDownloadFiles && typeof exportPort.saveFile !== "function")
      || (record.canChooseSaveLocation && typeof exportPort.saveFileToChosenLocation !== "function")
      || (record.canShareFiles && typeof exportPort.shareFile !== "function")
    ) {
      return { capabilities: null, error: "文件交付适配器声明了当前没有实现的交付通道。" };
    }
    return {
      capabilities: {
        canDownloadFiles: record.canDownloadFiles as boolean,
        canChooseSaveLocation: record.canChooseSaveLocation as boolean,
        canShareFiles: record.canShareFiles as boolean
      },
      error: null
    };
  } catch (reason) {
    return {
      capabilities: null,
      error: safeFileTransferText(reason, "无法读取当前环境的文件交付能力。")
    };
  }
}

function deliveryReceiptIssue(
  result: FileDeliveryResult,
  intent: DeliveryIntent,
  expectedFilename: string,
  expectedBytes: number
): string | null {
  if (!result || typeof result !== "object") {
    return "文件交付适配器没有返回结构化回执。";
  }
  const record = result as unknown as Record<string, unknown>;
  const status = record.status;
  const resultFilename = normalizedArtifactText(record.filename);
  if (!resultFilename || resultFilename.length > 240) {
    return "文件交付回执缺少可识别的文件名。";
  }
  if (record.filename !== expectedFilename) {
    return "文件交付回执的文件名与当前冻结工件不一致。";
  }

  const saveIntent = intent !== "share";
  if (typeof status !== "string" || !(saveIntent ? saveDeliveryStatuses : shareDeliveryStatuses).has(status)) {
    return saveIntent
      ? "保存通道返回了与本次保存意图不一致的回执。"
      : "分享通道返回了与本次分享意图不一致的回执。";
  }

  if (status === "saved") {
    if (record.method !== "native" && record.method !== "file_system_access") {
      return "保存回执包含不可识别的写入方法。";
    }
    if (record.method === "file_system_access") {
      if (!Number.isSafeInteger(record.bytesWritten) || record.bytesWritten !== expectedBytes) {
        return "指定位置保存回执的写入字节数与冻结工件不一致。";
      }
    } else if (
      record.bytesWritten !== undefined
      && (!Number.isSafeInteger(record.bytesWritten) || record.bytesWritten !== expectedBytes)
    ) {
      return "原生保存回执的写入字节数与冻结工件不一致。";
    }
    return null;
  }

  if (status === "download_requested") {
    if (intent === "chosen_location" || record.method !== "browser_download") {
      return "指定位置保存返回了不可接受的浏览器下载回执。";
    }
    return null;
  }

  if (status === "shared") {
    return record.method === "native" || record.method === "web_share"
      ? null
      : "分享回执包含不可识别的系统分享方法。";
  }

  const expectedOperation = saveIntent ? "save" : "share";
  if (record.operation !== expectedOperation) {
    return "文件交付回执的操作类型与本次用户意图不一致。";
  }
  if ((status === "unsupported" || status === "failed") && !normalizedArtifactText(record.reason)) {
    return "文件交付失败回执缺少可识别的失败原因。";
  }
  if (status === "failed") {
    if (saveIntent && (typeof record.stage !== "string" || !saveFailureStages.has(record.stage))) {
      return "保存失败回执包含不可识别的失败阶段。";
    }
    if (!saveIntent && record.stage !== "share") {
      return "分享失败回执包含不可识别的失败阶段。";
    }
  }
  return null;
}

export function PreparedFileDeliveryDialog({
  artifact,
  exportPort,
  onClose,
  onDeliveryResolution
}: PreparedFileDeliveryDialogProps) {
  const dialogId = useId();
  const titleId = `${dialogId}-title`;
  const descriptionId = `${dialogId}-description`;
  const boundaryId = `${dialogId}-boundary`;
  const routesId = `${dialogId}-routes`;
  const uncertaintyTitleId = `${dialogId}-uncertainty-title`;
  const [message, setMessage] = useState<string | null>(null);
  const [localMessageKind, setLocalMessageKind] = useState<LocalDeliveryMessageKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [artifactDigest, setArtifactDigest] = useState<ArtifactDigestState>({
    status: "calculating",
    value: null
  });
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const deliveryResolutionRef = useRef(onDeliveryResolution);
  const deliveryGenerationRef = useRef(0);
  const artifactDescriptor = useMemo(() => JSON.stringify([
      artifactRuntimeIdentity(artifact.blob),
      boundedArtifactDescriptorText(artifact.filename, 240),
      boundedArtifactDescriptorText(artifact.title, 240),
      boundedArtifactDescriptorText(artifact.description, 2_000),
      artifact.sharePolicy,
      boundedArtifactDescriptorText(artifact.blob.type, 200),
      artifact.blob.size
    ]), [
      artifact.blob,
      artifact.blob.size,
      artifact.blob.type,
      artifact.description,
      artifact.filename,
      artifact.sharePolicy,
      artifact.title
    ]);
  const deliverySnapshot = useSyncExternalStore(
    subscribePreparedFileDelivery,
    getPreparedFileDeliverySnapshot,
    getPreparedFileDeliverySnapshot
  );
  const artifactError = useMemo(
    () => preparedArtifactIssue(artifact),
    [artifact.blob, artifact.description, artifact.filename, artifact.sharePolicy, artifact.title]
  );
  const capabilityState = useMemo(() => readDeliveryCapabilities(exportPort), [exportPort]);
  const activeArtifactRef = useRef<{
    blob: Blob;
    descriptor: string;
    exportPort: ReportExportPort;
  } | null>({ blob: artifact.blob, descriptor: artifactDescriptor, exportPort });
  const capabilities = capabilityState.capabilities;
  const preparationError = artifactError ?? capabilityState.error;
  const allowShare = artifact.sharePolicy === "allowed";
  const supportsChooseSaveLocation = capabilities?.canChooseSaveLocation === true;
  const supportsFileDownload = capabilities?.canDownloadFiles === true;
  const supportsFileShare = capabilities?.canShareFiles === true;
  const canChooseSaveLocation = !preparationError && supportsChooseSaveLocation;
  const canDownloadFiles = !preparationError && supportsFileDownload;
  const canShareFiles = !preparationError && allowShare && supportsFileShare;
  const hasSaveRoute = canChooseSaveLocation || canDownloadFiles;
  const hasDeliveryRoute = hasSaveRoute || canShareFiles;
  const sharedOperation = deliverySnapshot.status === "in_flight" ? deliverySnapshot.operation : null;
  const sharedIssue = deliverySnapshot.status === "manual_check_required" ? deliverySnapshot.issue : null;
  const activeIntent = sharedOperation?.intent ?? null;
  const deliveryUncertainty = sharedIssue?.kind === "uncertain"
    ? { ...sharedIssue.operation, detail: sharedIssue.detail }
    : null;
  const requestedIntent = sharedIssue?.kind === "requested" ? sharedIssue.operation.intent : null;
  const messageKind: DeliveryMessageKind | null = sharedIssue?.kind === "requested"
    ? "requested"
    : localMessageKind;
  const coordinatorArtifactDescriptor = sharedOperation?.artifactDescriptor
    ?? sharedIssue?.operation.artifactDescriptor
    ?? null;
  const coordinatorTargetsCurrentArtifact = coordinatorArtifactDescriptor === null
    || coordinatorArtifactDescriptor === artifactDescriptor;
  const coordinatorFilename = sharedOperation?.filename ?? sharedIssue?.operation.filename ?? null;
  const visibleCoordinatorFilename = coordinatorFilename
    ? safeArtifactText(coordinatorFilename, "上一份文件名不可显示", 240)
    : null;
  const busy = deliverySnapshot.status === "in_flight";
  const manualCheckRequired = deliverySnapshot.status === "manual_check_required";
  const closeBlocked = busy || manualCheckRequired;
  const artifactPresentation = useMemo(() => ({
    title: safeArtifactText(artifact.title, "未命名本机工件", 240),
    description: safeArtifactText(artifact.description, "没有可显示的交付说明。", 2_000),
    filename: safeArtifactText(artifact.filename, "文件名不可显示", 240),
    mimeType: safeArtifactText(artifact.blob.type, "application/octet-stream", 200)
  }), [artifact.blob.type, artifact.description, artifact.filename, artifact.title]);
  const visibleTitle = artifactPresentation.title;
  const visibleDescription = artifactPresentation.description;
  const visibleFilename = artifactPresentation.filename;
  const visibleMimeType = artifactPresentation.mimeType;
  const visibleError = !busy && !manualCheckRequired && error
    ? safeArtifactText(error, "文件交付未完成。", 800)
    : null;
  const visibleMessage = sharedIssue?.kind === "requested"
    ? safeArtifactText(sharedIssue.detail, "文件交付状态不可用。", 800)
    : !busy && !manualCheckRequired && message
      ? safeArtifactText(message, "文件交付状态不可用。", 800)
      : null;
  const visibleDigest = artifactDigest.status === "calculated" && artifactDigest.value
    ? `sha256:${artifactDigest.value}`
    : artifactDigest.status === "calculating"
      ? "正在计算本机 SHA-256…"
      : artifactDigest.status === "skipped"
        ? `文件超过 ${formatBytes(MAX_ARTIFACT_DIGEST_BYTES)}，未在前台计算摘要`
        : artifactDigest.status === "unavailable"
          ? "当前环境不支持 Web Crypto 摘要"
          : "摘要计算失败，未用于交付判定";
  const digestAnnouncement = artifactDigest.status === "calculating"
    ? "正在计算本机 SHA-256 摘要。"
    : artifactDigest.status === "calculated"
      ? "本机 SHA-256 摘要计算完成。"
      : artifactDigest.status === "skipped"
        ? "文件超过前台摘要计算上限，本次未计算摘要。"
        : artifactDigest.status === "unavailable"
          ? "当前环境无法计算本机 SHA-256 摘要。"
          : "本机 SHA-256 摘要计算失败。";

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useLayoutEffect(() => {
    deliveryResolutionRef.current = onDeliveryResolution;
  }, [onDeliveryResolution]);

  useEffect(() => {
    let cancelled = false;
    if (artifactError) {
      setArtifactDigest({ status: "unavailable", value: null });
      return () => {
        cancelled = true;
      };
    }
    if (artifact.blob.size > MAX_ARTIFACT_DIGEST_BYTES) {
      setArtifactDigest({ status: "skipped", value: null });
      return () => {
        cancelled = true;
      };
    }
    if (!globalThis.crypto?.subtle) {
      setArtifactDigest({ status: "unavailable", value: null });
      return () => {
        cancelled = true;
      };
    }

    setArtifactDigest({ status: "calculating", value: null });
    void calculateArtifactSha256(artifact.blob)
      .then((value) => {
        if (!cancelled) setArtifactDigest({ status: "calculated", value });
      })
      .catch(() => {
        if (!cancelled) setArtifactDigest({ status: "failed", value: null });
      });
    return () => {
      cancelled = true;
    };
  }, [artifact.blob, artifactError]);

  useLayoutEffect(() => {
    deliveryGenerationRef.current += 1;
    activeArtifactRef.current = { blob: artifact.blob, descriptor: artifactDescriptor, exportPort };
    setMessage(null);
    setLocalMessageKind(null);
    setError(null);
  }, [artifact.blob, artifactDescriptor, exportPort]);

  useLayoutEffect(() => () => {
    deliveryGenerationRef.current += 1;
    activeArtifactRef.current = null;
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousBodyOverflow = document.body.style.overflow;
    const focusableSelector = [
      "button:not([disabled])",
      "[href]",
      "input:not([disabled])",
      "[tabindex]:not([tabindex='-1'])"
    ].join(",");
    const focusableElements = () => dialog
      ? Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => (
        element.getAttribute("aria-hidden") !== "true" && !element.hasAttribute("hidden")
      ))
      : [];

    document.body.style.overflow = "hidden";
    dialog?.focus({ preventScroll: true });
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (getPreparedFileDeliverySnapshot().status === "idle") closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const elements = focusableElements();
      if (!elements.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialog || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || active === dialog || !dialog.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
      document.body.style.overflow = previousBodyOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, []);

  const notifyDeliveryResolution = (
    operationArtifact: PreparedFileArtifact,
    intent: DeliveryIntent,
    result: FileDeliveryResult,
    resolution: ConfirmedFileDeliveryResolution
  ) => {
    try {
      deliveryResolutionRef.current?.(Object.freeze({
        artifact: operationArtifact,
        intent,
        result,
        resolution
      }));
    } catch {
      // A consumer callback cannot downgrade an already validated platform receipt.
    }
  };

  const deliver = async (intent: DeliveryIntent) => {
    if (preparationError || getPreparedFileDeliverySnapshot().status !== "idle") return;
    const intentAvailable = intent === "chosen_location"
      ? canChooseSaveLocation
      : intent === "download"
        ? canDownloadFiles
        : canShareFiles;
    if (!intentAvailable) {
      setError(intent === "share" && !allowShare
        ? "这份敏感工件的系统分享策略已关闭。"
        : "所选文件交付通道在当前环境中不可用。");
      return;
    }
    const generation = ++deliveryGenerationRef.current;
    const operationArtifact = artifact;
    const operationDescriptor = artifactDescriptor;
    const operationExportPort = exportPort;
    const deliveryOperation = acquirePreparedFileDelivery({
      intent,
      filename: operationArtifact.filename,
      bytes: operationArtifact.blob.size,
      sha256: artifactDigest.status === "calculated" ? artifactDigest.value : null,
      startedAt: new Date().toISOString(),
      artifactDescriptor: operationDescriptor
    });
    if (!deliveryOperation) return;
    const isCurrentLocalView = () => {
      const activeArtifact = activeArtifactRef.current;
      return generation === deliveryGenerationRef.current
        && activeArtifact?.blob === operationArtifact.blob
        && activeArtifact.descriptor === operationDescriptor
        && activeArtifact.exportPort === operationExportPort;
    };
    setMessage(null);
    setLocalMessageKind(null);
    setError(null);
    try {
      const result = intent === "chosen_location"
        ? await operationExportPort.saveFileToChosenLocation(operationArtifact.blob, operationArtifact.filename)
        : intent === "share"
          ? await operationExportPort.shareFile(
              operationArtifact.blob,
              operationArtifact.filename,
              safeArtifactText(operationArtifact.title, "本机文件", 240)
            )
          : await operationExportPort.saveFile(operationArtifact.blob, operationArtifact.filename);
      if (!isCurrentPreparedFileDelivery(deliveryOperation)) return;
      const receiptIssue = deliveryReceiptIssue(
        result,
        intent,
        operationArtifact.filename,
        operationArtifact.blob.size
      );
      if (receiptIssue) {
        requirePreparedFileDeliveryManualCheck(deliveryOperation, "uncertain", receiptIssue);
        return;
      }
      const resolution = resolveFileDelivery(
        result,
        safeArtifactText(operationArtifact.title, "文件", 240)
      );
      if (resolution.kind === "error") {
        if (result.status === "failed") {
          requirePreparedFileDeliveryManualCheck(
            deliveryOperation,
            "uncertain",
            `${resolution.message} 适配器返回失败，但无法证明外部文件副作用完全没有发生。`
          );
        } else if (releasePreparedFileDelivery(deliveryOperation) && isCurrentLocalView()) {
          setError(resolution.message);
        }
        return;
      }
      const nextMessageKind = resolution.kind === "completed"
        ? "completed"
        : resolution.kind === "cancelled"
          ? "cancelled"
          : "requested";
      if (nextMessageKind === "requested") {
        const requestedIssue = requirePreparedFileDeliveryManualCheck(
          deliveryOperation,
          "requested",
          resolution.message
        );
        if (requestedIssue && isCurrentLocalView()) {
          notifyDeliveryResolution(operationArtifact, intent, result, resolution);
        }
      } else if (releasePreparedFileDelivery(deliveryOperation) && isCurrentLocalView()) {
        setLocalMessageKind(nextMessageKind);
        setMessage(resolution.message);
        notifyDeliveryResolution(operationArtifact, intent, result, resolution);
      }
    } catch (reason) {
      requirePreparedFileDeliveryManualCheck(
        deliveryOperation,
        "uncertain",
        `${safeFileTransferText(reason, "文件交付调用异常中断。")} 无法确认外部文件副作用是否已经发生。`
      );
    }
  };

  const requestClose = () => {
    if (getPreparedFileDeliverySnapshot().status === "idle") closeRef.current();
  };

  const acknowledgeDeliveryUncertainty = () => {
    if (sharedIssue?.kind !== "uncertain" || !acknowledgePreparedFileDeliveryIssue(sharedIssue)) return;
    setError(null);
    setMessage(null);
    setLocalMessageKind(null);
  };

  const acknowledgeRequestedDelivery = () => {
    if (sharedIssue?.kind !== "requested" || !acknowledgePreparedFileDeliveryIssue(sharedIssue)) return;
    setMessage(null);
    setLocalMessageKind(null);
  };

  const retryGate = deliveryUncertainty
    ? "uncertain_delivery_acknowledgement_required"
    : messageKind === "requested"
      ? "manual_file_check_required"
      : "open";

  const deliveryStage = busy
      ? "busy"
      : deliveryUncertainty
        ? "unknown"
        : messageKind === "requested"
          ? "requested"
          : preparationError
            ? "blocked"
            : error
              ? "failed"
              : messageKind ?? (hasDeliveryRoute ? "prepared" : "unavailable");
  const deliveryStageLabel = deliveryStage === "blocked"
    ? "交付已阻断"
    : deliveryStage === "busy"
      ? "交付进行中"
      : deliveryStage === "unknown"
        ? "外部交付状态未知"
      : deliveryStage === "failed"
        ? "交付失败"
        : deliveryStage === "completed"
          ? "适配器返回完成回执"
          : deliveryStage === "requested"
            ? "已请求 · 待核对"
            : deliveryStage === "cancelled"
              ? "本次已取消"
              : deliveryStage === "unavailable"
                ? "无可用通道"
                : "本机工件待交付";
  const dialogTitle = busy
      ? coordinatorTargetsCurrentArtifact
        ? "正在交付本机文件"
        : "上一份本机文件仍在交付中"
      : deliveryUncertainty
        ? "先前文件交付结果需要人工核对"
        : messageKind === "requested"
          ? "文件已请求交付，等待人工核对"
          : preparationError
            ? "文件已生成，但交付检查未通过"
            : error
              ? "文件仍在本机，交付未完成"
              : messageKind === "completed"
                ? "收到文件交付完成回执"
                : messageKind === "cancelled"
                  ? "文件仍在本机，本次交付已取消"
                  : hasDeliveryRoute
                    ? "待交付文件已在本机生成"
                    : "文件已生成，但当前环境无法交付";
  const liveAnnouncement = busy
    ? !coordinatorTargetsCurrentArtifact
      ? "上一份本机文件仍在交付；当前文件暂不可交付。"
      : activeIntent === "chosen_location"
        ? "正在保存到指定位置。"
        : activeIntent === "download"
          ? "正在请求浏览器下载。"
          : "正在打开系统分享面板。"
    : deliveryUncertainty
      ? "先前文件交付状态未知；核对系统文件位置、下载列表或分享目标后才能再次交付。"
      : visibleMessage ?? "";

  return (
    <div className="prepared-delivery-modal" role="presentation">
      <div
        ref={dialogRef}
        className="prepared-delivery-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={`${descriptionId} ${boundaryId} ${routesId}`}
        aria-busy={busy}
        data-share-policy={artifact.sharePolicy}
        data-active-intent={activeIntent ?? "idle"}
        data-delivery-state={deliveryStage}
        data-delivery-outcome={messageKind ?? "none"}
        data-delivery-stage={deliveryStage}
        data-artifact-digest-state={artifactDigest.status}
        data-delivery-call-state={busy ? "in_flight" : deliveryUncertainty ? "unknown" : "settled"}
        data-retry-gate={retryGate}
        data-close-gate={busy ? "delivery_in_flight" : manualCheckRequired ? "manual_check_required" : "open"}
        data-delivery-coordinator="page-runtime-shared"
        data-delivery-scope={coordinatorArtifactDescriptor === null
          ? "idle"
          : coordinatorTargetsCurrentArtifact
            ? "current_artifact"
            : "previous_artifact"}
        data-release-family="legacy-v13"
        data-release-identity="legacy-v13"
        data-db-generation="13"
        data-target-schema="13"
        data-migration-id="null"
        data-engineering-evidence-only="true"
        data-public-release-authorized="false"
        data-expert-truth-established="false"
        data-formal-truth-established="false"
        data-expert-truth-claimed="false"
        data-mutation-mode="external-artifact-delivery-only"
        data-domain-record-mutation-performed="false"
        data-chart-or-storage-mutation-performed="false"
        data-record-write-state="not_started"
        data-external-file-side-effect-scope="user-initiated-only"
        data-mutation-epoch-bypassed="false"
        tabIndex={-1}
      >
        <span className="prepared-delivery-announcer" role="status" aria-live="polite" aria-atomic="true">
          {liveAnnouncement}
        </span>
        <header className="prepared-delivery-header">
          <div>
            <p className="eyebrow">Local file delivery</p>
            <h2 id={titleId}>{dialogTitle}</h2>
            <span className="prepared-delivery-stage">{deliveryStageLabel}</span>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label={busy
              ? "文件交付进行中，完成后可关闭"
              : manualCheckRequired
                ? "请先完成人工核对，再关闭文件交付"
                : "关闭文件交付"}
            title={busy
              ? "交付进行中，完成后可关闭"
              : manualCheckRequired
                ? "请先完成人工核对，再关闭"
                : "关闭文件交付"}
            disabled={closeBlocked}
            onClick={requestClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <ol className="prepared-delivery-lifecycle" aria-label="文件交付证据阶段">
          <li data-state={artifactError ? "blocked" : "observed"}>
            <span aria-hidden="true">01</span>
            <div><small>页面会话工件</small><strong>{artifactError ? "工件检查未通过" : "Blob 已准备"}</strong></div>
          </li>
          <li data-state={artifactDigest.status}>
            <span aria-hidden="true">02</span>
            <div><small>内容指纹</small><strong>{ARTIFACT_DIGEST_STAGE_LABEL[artifactDigest.status]}</strong></div>
          </li>
          <li data-state={deliveryStage}>
            <span aria-hidden="true">03</span>
            <div><small>外部交付</small><strong>{deliveryStageLabel}</strong></div>
          </li>
        </ol>

        <div className="prepared-delivery-artifact">
          <div className="prepared-delivery-seal" aria-hidden="true">
            <Save />
            <span>LOCAL</span>
          </div>
          <div className="prepared-delivery-artifact-copy">
            <p className="prepared-delivery-label">Frozen local artifact</p>
            <strong>{visibleTitle}</strong>
            <p id={descriptionId}>{visibleDescription}</p>
            <p id={boundaryId} className="prepared-delivery-boundary">
              “已生成”只表示不可变 Blob 已在页面会话中准备完成，且不证明物理 RAM 驻留或应用持久化；是否保存、下载或分享成功，以下方交付反馈和文件系统人工核对为准。
            </p>
            <dl className="prepared-delivery-ledger">
              <div>
                <dt>文件名</dt>
                <dd><code>{visibleFilename}</code></dd>
              </div>
              <div>
                <dt>文件体积</dt>
                <dd>{formatBytes(artifact.blob.size)}</dd>
              </div>
              <div>
                <dt>文件格式</dt>
                <dd><code>{visibleMimeType}</code></dd>
              </div>
              <div>
                <dt>分享策略</dt>
                <dd>{allowShare ? "允许系统分享" : "敏感资料 · 分享关闭"}</dd>
              </div>
              <div className="prepared-delivery-digest-row">
                <dt>本机内容摘要</dt>
                <dd data-digest-state={artifactDigest.status}>
                  <Fingerprint aria-hidden="true" />
                  <code>{visibleDigest}</code>
                  <span className="prepared-delivery-digest-announcer" role="status" aria-live="polite" aria-atomic="true">{digestAnnouncement}</span>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <aside className="prepared-delivery-policy" data-policy={artifact.sharePolicy} aria-label="文件交付授权边界">
          <Shield aria-hidden="true" />
          <div>
            <strong>{allowShare ? "设备分享面板可用，但不授予公开发布权" : "敏感工件只允许保存或下载到可信位置"}</strong>
            <p>{allowShare
              ? "系统分享只把同一冻结文件交给你选择的目标；它不证明接收者身份、专家真值、内容权利或公开发布授权。"
              : "系统分享已在策略层关闭；文件交付也不证明专家真值、来源权利或公开发布授权。"}</p>
          </div>
          <span className="prepared-delivery-policy-baseline"><b>公开授权 · 否</b><small>legacy-v13 · schema 13 · migration null</small></span>
        </aside>

        <section className="prepared-delivery-routes" aria-labelledby={routesId}>
          <div className="prepared-delivery-routes-heading">
            <strong id={routesId}>当前环境交付通道</strong>
            <span>能力声明只表示入口可调用，不表示文件已经交付。</span>
          </div>
          <div className="prepared-delivery-route-grid">
            <div className="prepared-delivery-route" data-capable={canChooseSaveLocation} data-environment-capable={supportsChooseSaveLocation}>
              <Save aria-hidden="true" />
              <span><strong>指定位置</strong><small>系统文件面板</small></span>
              <b>{preparationError && supportsChooseSaveLocation ? "工件检查阻断" : supportsChooseSaveLocation ? "当前可调用" : "环境不可用"}</b>
            </div>
            <div className="prepared-delivery-route" data-capable={canDownloadFiles} data-environment-capable={supportsFileDownload}>
              <Download aria-hidden="true" />
              <span><strong>浏览器下载</strong><small>需人工核对列表</small></span>
              <b>{preparationError && supportsFileDownload ? "工件检查阻断" : supportsFileDownload ? "当前可调用" : "环境不可用"}</b>
            </div>
            <div className="prepared-delivery-route" data-capable={canShareFiles} data-environment-capable={supportsFileShare} data-policy-blocked={!allowShare}>
              <Share2 aria-hidden="true" />
              <span><strong>系统分享</strong><small>{allowShare ? "需目标端确认" : "敏感策略关闭"}</small></span>
              <b>{!allowShare ? "策略关闭" : preparationError && supportsFileShare ? "工件检查阻断" : supportsFileShare ? "当前可调用" : "环境不可用"}</b>
            </div>
          </div>
        </section>

        {canChooseSaveLocation ? (
          <p className="prepared-delivery-warning">“保存到指定位置”会覆盖你在系统面板中选中的同名已有文件。</p>
        ) : null}
        {!allowShare ? (
          <p className="prepared-delivery-warning">这份工件包含敏感资料，系统分享已关闭；请只保存到可信位置。</p>
        ) : null}
        {!capabilities?.canShareFiles && allowShare && hasSaveRoute ? (
          <p className="muted-copy">
            {canDownloadFiles
              ? "当前浏览器不支持文件系统分享；仍可下载这份已生成文件。"
              : "当前浏览器不支持文件系统分享；仍可保存到指定位置。"}
          </p>
        ) : null}
        {preparationError ? (
          <div className="inline-error" role="alert">
            <strong>准备文件无法交付</strong>
            <p>{preparationError} 当前没有调用任何文件系统或分享接口。</p>
          </div>
        ) : null}
        {!preparationError && !hasDeliveryRoute ? (
          <p className="prepared-delivery-warning" role="status">
            当前环境没有可用的保存或分享通道，暂时无法把这份已生成工件交付到文件系统。
          </p>
        ) : null}
        {!coordinatorTargetsCurrentArtifact && visibleCoordinatorFilename ? (
          <p className="prepared-delivery-warning" role="status">
            当前门禁来自上一份本机工件 <code>{visibleCoordinatorFilename}</code>；在旧交付结算并完成必要核对前，当前工件不可再次交付。
          </p>
        ) : null}
        {deliveryUncertainty ? (
          <section className="prepared-delivery-uncertainty" aria-labelledby={uncertaintyTitleId}>
            <header>
              <div><p className="eyebrow">Call-unknown receipt</p><h3 id={uncertaintyTitleId}>不要直接重复交付</h3></div>
              <strong>需人工核对</strong>
            </header>
            <p role="alert">{safeArtifactText(deliveryUncertainty.detail, "文件交付状态未知。", 800)}</p>
            <dl>
              <div><dt>旧操作</dt><dd>{deliveryIntentLabel(deliveryUncertainty.intent)}</dd></div>
              <div><dt>文件名</dt><dd><code>{safeArtifactText(deliveryUncertainty.filename, "文件名不可显示", 240)}</code></dd></div>
              <div><dt>文件体积</dt><dd>{formatBytes(deliveryUncertainty.bytes)}</dd></div>
              <div><dt>开始时间</dt><dd><time dateTime={deliveryUncertainty.startedAt}>{deliveryUncertainty.startedAt}</time></dd></div>
              <div className="prepared-delivery-uncertainty__digest"><dt>请求时摘要</dt><dd><code>{deliveryUncertainty.sha256 ? `sha256:${deliveryUncertainty.sha256}` : "请求开始时未取得摘要"}</code></dd></div>
            </dl>
            <div><span>请先检查目标目录、浏览器下载列表或系统分享结果；确认不会造成重复文件后再解锁。</span><button type="button" className="secondary-action" onClick={acknowledgeDeliveryUncertainty}>我已核对，允许再次交付</button></div>
          </section>
        ) : null}
        {visibleError ? <div className="inline-error" role="alert"><strong>文件未交付</strong><p>{visibleError}</p></div> : null}
        {visibleMessage ? (
          <p
            className={messageKind === "completed" ? "success-message" : "prepared-delivery-feedback"}
            data-kind={messageKind ?? "requested"}
          >{visibleMessage}</p>
        ) : null}
        {messageKind === "requested" ? (
          <div className="prepared-delivery-retry-gate" role="note">
            <span>
              {requestedIntent === "share"
                ? "系统只确认已打开分享面板；请先在目标应用核对文件已接收并可以打开，再决定是否重新分享。"
                : "浏览器只确认已发起下载请求；请先核对下载列表和本机文件，再决定是否重新下载。"}
            </span>
            <button type="button" className="secondary-action" onClick={acknowledgeRequestedDelivery}>
              {requestedIntent === "share" ? "已核对，允许再次分享" : "已核对，允许再次下载"}
            </button>
          </div>
        ) : null}

        <div className="prepared-delivery-actions" role="group" aria-label="文件交付方式">
          {canChooseSaveLocation ? (
            <button type="button" className="primary-action prepared-delivery-action" data-delivery-intent="chosen_location" disabled={busy || retryGate !== "open"} aria-busy={activeIntent === "chosen_location"} onClick={() => void deliver("chosen_location")}>
              {activeIntent === "chosen_location" ? <LoaderCircle className="is-spinning" aria-hidden="true" /> : <Save aria-hidden="true" />}
              <span><strong>{activeIntent === "chosen_location" ? "正在保存到指定位置" : "保存到指定位置"}</strong><small>明确选择可信目录</small></span>
            </button>
          ) : null}
          {canDownloadFiles ? (
            <button type="button" className={`${canChooseSaveLocation ? "secondary-action" : "primary-action"} prepared-delivery-action`} data-delivery-intent="download" disabled={busy || retryGate !== "open"} aria-busy={activeIntent === "download"} onClick={() => void deliver("download")}>
              {activeIntent === "download" ? <LoaderCircle className="is-spinning" aria-hidden="true" /> : <Download aria-hidden="true" />}
              <span><strong>{activeIntent === "download" ? "正在请求下载" : "下载文件"}</strong><small>随后核对浏览器下载列表</small></span>
            </button>
          ) : null}
          {canShareFiles ? (
            <button type="button" className="secondary-action prepared-delivery-action" data-delivery-intent="share" disabled={busy || retryGate !== "open"} aria-busy={activeIntent === "share"} onClick={() => void deliver("share")}>
              {activeIntent === "share" ? <LoaderCircle className="is-spinning" aria-hidden="true" /> : <Share2 aria-hidden="true" />}
              <span><strong>{activeIntent === "share" ? "正在打开系统分享" : "系统分享"}</strong><small>人工确认接收目标</small></span>
            </button>
          ) : null}
          <button type="button" className="text-action prepared-delivery-close-action" disabled={closeBlocked} onClick={requestClose}>{manualCheckRequired ? "核对后关闭" : "关闭"}</button>
        </div>
      </div>
    </div>
  );
}
