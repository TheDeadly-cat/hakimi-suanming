import {
  validateTransferFilename,
  type FileDeliveryResult,
  type FileSaveFailureStage
} from "@hakimi/platform";
import { safeVisibleText } from "./visible-text";

export type FileDeliveryResolution =
  | { kind: "completed"; message: string }
  | { kind: "requested"; message: string }
  | { kind: "cancelled"; message: string }
  | { kind: "error"; message: string };

const MAX_FILE_TRANSFER_TEXT_LENGTH = 512;
const SAVE_FAILURE_STAGES = new Set<FileSaveFailureStage>([
  "download",
  "pick",
  "create_writable",
  "write",
  "close"
]);

function isFileSaveFailureStage(value: unknown): value is FileSaveFailureStage {
  return typeof value === "string" && SAVE_FAILURE_STAGES.has(value as FileSaveFailureStage);
}
const FILE_DELIVERY_RECEIPT_FIELDS = [
  "status",
  "filename",
  "method",
  "bytesWritten",
  "operation",
  "reason",
  "stage"
] as const;
type FileDeliveryReceiptSnapshot = Record<(typeof FILE_DELIVERY_RECEIPT_FIELDS)[number], unknown>;

function normalizedVisibleText(value: unknown): string {
  return safeVisibleText(value, "", MAX_FILE_TRANSFER_TEXT_LENGTH);
}

function snapshotDeliveryReceipt(value: unknown): FileDeliveryReceiptSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const snapshot: FileDeliveryReceiptSnapshot = {
    status: undefined,
    filename: undefined,
    method: undefined,
    bytesWritten: undefined,
    operation: undefined,
    reason: undefined,
    stage: undefined
  };
  try {
    for (const field of FILE_DELIVERY_RECEIPT_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(value, field)) {
        snapshot[field] = Reflect.get(value, field);
      }
    }
  } catch {
    return null;
  }
  return snapshot;
}

function normalizedReceiptFilename(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    return normalizedVisibleText(validateTransferFilename(value));
  } catch {
    return "";
  }
}

function deliveryOperationLabel(operation: unknown): string {
  return operation === "save" ? "保存" : "分享";
}

export function safeFileTransferText(value: unknown, fallback: string): string {
  let candidate = value;
  try {
    if (value instanceof Error) candidate = value.message;
  } catch {
    candidate = undefined;
  }
  return normalizedVisibleText(candidate) || normalizedVisibleText(fallback) || "文件交付未完成。";
}

function invalidDeliveryReceipt(subject: string, detail: string): FileDeliveryResolution {
  return {
    kind: "error",
    message: `${subject}交付回执${detail}，未据此声明保存或分享成功。`
  };
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

/**
 * Keeps user-facing claims aligned with what a platform adapter can prove.
 * Browser downloads are hand-offs; only a committed File System Access write
 * or a native adapter may report `saved`.
 */
export function resolveFileDelivery(
  result: FileDeliveryResult,
  subject = "文件"
): FileDeliveryResolution {
  const visibleSubject = safeFileTransferText(subject, "文件");
  const record = snapshotDeliveryReceipt(result);
  if (!record || typeof record.status !== "string") {
    return invalidDeliveryReceipt(visibleSubject, "不是可安全读取的结构化对象");
  }
  const visibleFilename = normalizedReceiptFilename(record.filename);
  if (!visibleFilename) {
    return invalidDeliveryReceipt(visibleSubject, "缺少符合平台约束的普通文件名");
  }
  switch (record.status) {
    case "saved": {
      if (record.method !== "native" && record.method !== "file_system_access") {
        return invalidDeliveryReceipt(visibleSubject, "包含不可识别的写入方法");
      }
      if (record.method === "file_system_access" && !isNonNegativeSafeInteger(record.bytesWritten)) {
        return invalidDeliveryReceipt(visibleSubject, "缺少可信的文件系统写入字节数");
      }
      if (
        record.method === "native"
        && record.bytesWritten !== undefined
        && !isNonNegativeSafeInteger(record.bytesWritten)
      ) {
        return invalidDeliveryReceipt(visibleSubject, "包含不可识别的原生写入字节数");
      }
      return { kind: "completed", message: `${visibleFilename} 已由当前平台确认写入。` };
    }
    case "shared":
      if (record.method !== "native" && record.method !== "web_share") {
        return invalidDeliveryReceipt(visibleSubject, "包含不可识别的系统分享方法");
      }
      return {
        kind: "requested",
        message: `${visibleFilename} 已交给系统分享面板；请在目标应用确认文件已接收并可以打开。`
      };
    case "download_requested":
      if (record.method !== "browser_download") {
        return invalidDeliveryReceipt(visibleSubject, "包含不可识别的浏览器下载方法");
      }
      return {
        kind: "requested",
        message: `${visibleFilename} 已请求浏览器下载；请在下载列表确认文件已保存并可以打开。`
      };
    case "cancelled": {
      if (record.operation !== "save" && record.operation !== "share") {
        return invalidDeliveryReceipt(visibleSubject, "的取消操作类型不可识别");
      }
      const visibleReason = normalizedVisibleText(record.reason);
      const operationLabel = deliveryOperationLabel(record.operation);
      return {
        kind: "cancelled",
        message: visibleReason
          ? `已取消${visibleSubject}${operationLabel}；${visibleReason}`
          : `已取消${visibleSubject}${operationLabel}；系统没有报告该操作成功。`
      };
    }
    case "unsupported": {
      if (record.operation !== "save" && record.operation !== "share") {
        return invalidDeliveryReceipt(visibleSubject, "的不支持操作类型不可识别");
      }
      const visibleReason = normalizedVisibleText(record.reason);
      if (!visibleReason) {
        return invalidDeliveryReceipt(visibleSubject, "缺少通道不可用原因");
      }
      return {
        kind: "error",
        message: `${visibleSubject}${deliveryOperationLabel(record.operation)}不可用：${visibleReason}`
      };
    }
    case "failed": {
      if (record.operation !== "save" && record.operation !== "share") {
        return invalidDeliveryReceipt(visibleSubject, "的失败操作类型不可识别");
      }
      if (
        (record.operation === "save" && !isFileSaveFailureStage(record.stage))
        || (record.operation === "share" && record.stage !== "share")
      ) {
        return invalidDeliveryReceipt(visibleSubject, "包含不可识别的失败阶段");
      }
      const visibleReason = normalizedVisibleText(record.reason);
      if (!visibleReason) {
        return invalidDeliveryReceipt(visibleSubject, "缺少失败原因");
      }
      return {
        kind: "error",
        message: `${visibleSubject}${deliveryOperationLabel(record.operation)}失败：${visibleReason}`
      };
    }
    default:
      return invalidDeliveryReceipt(visibleSubject, "返回未知状态");
  }
}

export function requireCompletedFileDelivery(
  result: FileDeliveryResult,
  subject = "文件"
): string | null {
  const resolution = resolveFileDelivery(result, subject);
  if (resolution.kind === "error") throw new Error(resolution.message);
  return resolution.kind === "completed" ? resolution.message : null;
}
