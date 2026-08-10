import { describe, expect, it } from "vitest";
import {
  STORAGE_ADMISSION_MIN_HEADROOM_BYTES,
  StorageAdmissionError,
  assessStorageCapacity,
  isStorageQuotaExceededError,
  requireStorageAdmission
} from "./storage-capacity-gate";

const MiB = 1024 * 1024;
const request = {
  operation: "full_restore" as const,
  logicalPayloadBytes: 8 * MiB,
  payloadDigest: "a".repeat(64)
};

describe("storage capacity gate", () => {
  it("按 payload、同尺寸回滚余量与固定余量生成可审计的准入计划", async () => {
    const plan = await assessStorageCapacity(request, {
      estimate: async () => ({ usage: 100 * MiB, quota: 640 * MiB }),
      now: () => "2026-08-03T00:00:00.000Z"
    });

    expect(plan).toMatchObject({
      policyVersion: 1,
      state: "admitted",
      reason: "CAPACITY_AVAILABLE",
      logicalPayloadBytes: 8 * MiB,
      estimatedPersistedPayloadBytes: 10 * MiB,
      rollbackReserveBytes: 10 * MiB,
      fixedHeadroomBytes: STORAGE_ADMISSION_MIN_HEADROOM_BYTES,
      availableBytes: 540 * MiB,
      requiredAdditionalBytes: 52 * MiB,
      checkedAt: "2026-08-03T00:00:00.000Z"
    });
    expect(plan.admissionToken).toContain(request.payloadDigest);
    expect(() => requireStorageAdmission(plan)).not.toThrow();
  });

  it("精确边界准入，少一字节即失败且不生成 token", async () => {
    const exact = await assessStorageCapacity(request, {
      estimate: async () => ({ usage: 588 * MiB, quota: 640 * MiB })
    });
    const short = await assessStorageCapacity(request, {
      estimate: async () => ({ usage: 588 * MiB + 1, quota: 640 * MiB })
    });

    expect(exact.state).toBe("admitted");
    expect(short).toMatchObject({
      state: "insufficient",
      reason: "CAPACITY_INSUFFICIENT",
      availableBytes: 52 * MiB - 1,
      admissionToken: null
    });
    expect(() => requireStorageAdmission(short)).toThrowError(StorageAdmissionError);
  });

  it("对缺失、异常、非法和 usage 大于 quota 的估值失败关闭", async () => {
    await expect(assessStorageCapacity(request, {
      estimate: async () => { throw new Error("not supported"); }
    })).resolves.toMatchObject({ state: "unavailable", reason: "ESTIMATE_UNAVAILABLE" });

    await expect(assessStorageCapacity(request, {
      estimate: async () => ({ usage: Number.NaN, quota: 640 * MiB })
    })).resolves.toMatchObject({ state: "unavailable", reason: "ESTIMATE_INVALID" });

    await expect(assessStorageCapacity({ ...request, logicalPayloadBytes: 0 }, {
      estimate: async () => ({ usage: 0, quota: 640 * MiB })
    })).resolves.toMatchObject({ state: "unavailable", reason: "REQUEST_INVALID" });

    await expect(assessStorageCapacity(request, {
      estimate: async () => ({ usage: 641 * MiB, quota: 640 * MiB })
    })).resolves.toMatchObject({
      state: "insufficient",
      reason: "USAGE_EXCEEDS_QUOTA",
      availableBytes: 0
    });
  });

  it("拒绝会导致安全整数溢出的输入", async () => {
    await expect(assessStorageCapacity({
      ...request,
      logicalPayloadBytes: Number.MAX_SAFE_INTEGER
    }, {
      estimate: async () => ({ usage: 0, quota: 640 * MiB })
    })).resolves.toMatchObject({ state: "unavailable", reason: "REQUEST_INVALID" });
  });

  it("递归识别 DOM、Dexie inner、cause 与 BulkError failures 中的配额错误", () => {
    const quota = new DOMException("quota", "QuotaExceededError");
    expect(isStorageQuotaExceededError(quota)).toBe(true);
    expect(isStorageQuotaExceededError({ cause: quota })).toBe(true);
    expect(isStorageQuotaExceededError({ inner: quota })).toBe(true);
    expect(isStorageQuotaExceededError({ failures: [new Error("other"), quota] })).toBe(true);
    expect(isStorageQuotaExceededError({ failuresByPos: { 7: quota } })).toBe(true);
    expect(isStorageQuotaExceededError(new Error("QuotaExceededError in localized message"))).toBe(false);
    const cyclic: { cause?: unknown } = {};
    cyclic.cause = cyclic;
    expect(isStorageQuotaExceededError(cyclic)).toBe(false);
  });
});

