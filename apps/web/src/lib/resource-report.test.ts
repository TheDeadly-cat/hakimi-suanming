import { describe, expect, it } from "vitest";
import {
  collectResourceReport,
  formatBytes,
  type LongTaskSample
} from "./resource-report";

const longTasks: LongTaskSample[] = [
  { startedAt: "2026-08-10T00:00:00.000Z", durationMs: 120.5, attribution: "case-query" },
  { startedAt: "2026-08-10T00:00:01.000Z", durationMs: 80, attribution: null }
];

describe("resource report", () => {
  it("收集存储、内存与 long task 统计，并保持不可用字段为空而非猜测", async () => {
    const report = await collectResourceReport({
      now: () => "2026-08-10T00:00:02.000Z",
      storageEstimate: async () => ({ usage: 1024 * 1024, quota: 1024 * 1024 * 1024 }),
      memory: () => ({ usedJSHeapSize: 42 * 1024 * 1024, totalJSHeapSize: 512 * 1024 * 1024 }),
      longTasks
    });

    expect(report.checkedAt).toBe("2026-08-10T00:00:02.000Z");
    expect(report.storage).toEqual({
      supported: true,
      usageBytes: 1024 * 1024,
      quotaBytes: 1024 * 1024 * 1024,
      error: null
    });
    expect(report.memory.usedJSHeapSizeBytes).toBe(42 * 1024 * 1024);
    expect(report.longTasks).toMatchObject({
      count: 2,
      maxDurationMs: 120.5,
      totalDurationMs: 200.5
    });
  });

  it("存储估算失败时如实报告不支持原因，不伪造数值", async () => {
    const report = await collectResourceReport({
      storageEstimate: () => Promise.reject(new Error("estimate unavailable")),
      memory: () => null,
      longTasks: []
    });

    expect(report.storage.supported).toBe(false);
    expect(report.storage.error).toBe("estimate unavailable");
    expect(report.storage.usageBytes).toBeNull();
    expect(report.memory.supported).toBe(false);
  });

  it("格式化字节使用 KiB/MiB 单位", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(2048)).toBe("2.00 KiB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.00 MiB");
  });
});
