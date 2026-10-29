import { describe, expect, it } from "vitest";
import { appFailurePhase, type AppFailurePhaseState } from "./app-failure-phase";

const local: AppFailurePhaseState = {
  appBootConfirmed: false,
  bootFailed: false,
  bootConfirmationSent: false,
  requiresReleaseInteractionConfirmation: false
};

describe("appFailurePhase", () => {
  it("开发或无 worker 文档只有本地启动完成后才区分后续运行错误", () => {
    expect(appFailurePhase(local)).toBe("boot");
    expect(appFailurePhase({ ...local, appBootConfirmed: true })).toBe("runtime");
    expect(local).toEqual({ appBootConfirmed: false, bootFailed: false,
      bootConfirmationSent: false, requiresReleaseInteractionConfirmation: false });
  });

  it("已锁定的本地启动失败不能被晚到的完成信号提升为运行态", () => {
    expect(appFailurePhase({ ...local, bootFailed: true })).toBe("boot");
    expect(appFailurePhase({ ...local, appBootConfirmed: true, bootFailed: true })).toBe("boot");
  });

  it("生产或候选代际仍须等待原发布确认，即使本地计算和存储已完成", () => {
    const release = { ...local, requiresReleaseInteractionConfirmation: true };
    expect(appFailurePhase(release)).toBe("boot");
    expect(appFailurePhase({ ...release, appBootConfirmed: true })).toBe("boot");
    expect(appFailurePhase({ ...release, appBootConfirmed: true, bootConfirmationSent: true })).toBe("runtime");
  });

  it("已有 BOOT_OK 后保留原运行错误分类，不重新解释其发布收据", () => {
    expect(appFailurePhase({ ...local, bootConfirmationSent: true,
      requiresReleaseInteractionConfirmation: true })).toBe("runtime");
  });
});
