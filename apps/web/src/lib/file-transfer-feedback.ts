import type { FileDeliveryResult } from "@hakimi/platform";

export type FileDeliveryResolution =
  | { kind: "completed"; message: string }
  | { kind: "cancelled"; message: string }
  | { kind: "error"; message: string };

/**
 * Keeps user-facing claims aligned with what a platform adapter can prove.
 * Browser downloads are hand-offs; only a committed File System Access write
 * or a native adapter may report `saved`.
 */
export function resolveFileDelivery(
  result: FileDeliveryResult,
  subject = "文件"
): FileDeliveryResolution {
  switch (result.status) {
    case "saved":
      return { kind: "completed", message: `${result.filename} 已由当前平台确认写入。` };
    case "shared":
      return { kind: "completed", message: `${result.filename} 已交给系统分享面板。` };
    case "download_requested":
      return {
        kind: "completed",
        message: `${result.filename} 已请求浏览器下载；请在下载列表确认文件已保存并可以打开。`
      };
    case "cancelled": {
      const reason = "reason" in result ? result.reason : undefined;
      return {
        kind: "cancelled",
        message: reason
          ? `已取消${subject}操作；${reason}`
          : `已取消${subject}操作；系统没有报告保存或分享成功。`
      };
    }
    case "unsupported":
    case "failed":
      return { kind: "error", message: result.reason };
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
