import { describe, expect, it } from "vitest";
import { requireCompletedFileDelivery, resolveFileDelivery } from "./file-transfer-feedback";

describe("file transfer feedback", () => {
  it("never upgrades a browser download request into a durable save claim", () => {
    expect(resolveFileDelivery({
      status: "download_requested",
      filename: "backup.zip",
      method: "browser_download"
    })).toEqual({
      kind: "completed",
      message: "backup.zip 已请求浏览器下载；请在下载列表确认文件已保存并可以打开。"
    });
  });

  it("keeps native save, share, cancellation and unsupported results distinct", () => {
    expect(resolveFileDelivery({ status: "saved", filename: "a.zip", method: "native" }).kind).toBe("completed");
    expect(resolveFileDelivery({ status: "shared", filename: "a.md", method: "native" }).message).toContain("系统分享面板");
    expect(resolveFileDelivery({ status: "cancelled", filename: "a.zip", operation: "save" }, "安全备份导出")).toEqual({
      kind: "cancelled",
      message: "已取消安全备份导出操作；系统没有报告保存或分享成功。"
    });
    expect(resolveFileDelivery({
      status: "unsupported",
      filename: "a.zip",
      operation: "save",
      reason: "没有文件桥"
    })).toEqual({ kind: "error", message: "没有文件桥" });
    expect(resolveFileDelivery({
      status: "failed",
      filename: "a.zip",
      operation: "save",
      stage: "close",
      reason: "磁盘提交失败"
    })).toEqual({ kind: "error", message: "磁盘提交失败" });
    expect(resolveFileDelivery({
      status: "cancelled",
      filename: "a.zip",
      operation: "save",
      reason: "未选择保存位置，或浏览器阻止了该目标。"
    }, "安全备份导出").message).toContain("浏览器阻止了该目标");
  });

  it("returns null for cancellation and throws only for an unsupported operation", () => {
    expect(requireCompletedFileDelivery({
      status: "cancelled",
      filename: "a.zip",
      operation: "save"
    })).toBeNull();
    expect(() => requireCompletedFileDelivery({
      status: "unsupported",
      filename: "a.zip",
      operation: "save",
      reason: "不可用"
    })).toThrow("不可用");
  });
});
