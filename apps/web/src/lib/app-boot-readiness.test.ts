import { describe, expect, it, vi } from "vitest";
import { AppBootReadinessTimeoutError, runAppBootReadiness } from "./app-boot-readiness";

describe("application boot readiness", () => {
  it("真实路由、数据库和计算核心都成功后，再等待一帧确认", async () => {
    const events: string[] = [];
    const result = await runAppBootReadiness({
      preloadResolvedRoute: async () => { events.push("preload"); },
      waitForResolvedRoute: async () => { events.push("route"); },
      verifyStorage: async () => { events.push("storage"); },
      verifyCalculationCore: async () => { events.push("calculation"); },
      notifyPreflightReady: () => { events.push("preflight"); },
      waitForPaint: async () => { events.push("paint"); },
      verifyResolvedRoute: async () => { events.push("verify-route"); }
    });

    expect(result).toEqual({ ready: true, error: null, storageReady: true });
    expect(new Set(events.slice(0, 3))).toEqual(new Set(["storage", "calculation", "preload"]));
    expect(events.slice(3)).toEqual(["preflight", "route", "paint", "verify-route"]);
  });

  it.each(["route", "storage", "calculation"] as const)("%s 失败时不确认启动", async (failedProbe) => {
    const paint = vi.fn(async () => undefined);
    const notifyPreflightReady = vi.fn();
    const probe = (name: typeof failedProbe) => async () => {
      if (name === failedProbe) throw new Error(`${name} failed`);
    };
    const result = await runAppBootReadiness({
      preloadResolvedRoute: async () => undefined,
      waitForResolvedRoute: probe("route"),
      verifyStorage: probe("storage"),
      verifyCalculationCore: probe("calculation"),
      notifyPreflightReady,
      waitForPaint: paint,
      verifyResolvedRoute: async () => undefined
    });

    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.source).toBe(failedProbe);
      expect(result.error.message).toBe(`${failedProbe} failed`);
    }
    expect(result.storageReady).toBe(failedProbe !== "storage");
    expect(notifyPreflightReady).toHaveBeenCalledTimes(failedProbe === "route" ? 1 : 0);
    expect(paint).not.toHaveBeenCalled();
  });

  it("路由模块预加载失败时绝不开放普通路由挂载", async () => {
    const waitForResolvedRoute = vi.fn(async () => undefined);
    const notifyPreflightReady = vi.fn();
    const result = await runAppBootReadiness({
      preloadResolvedRoute: async () => { throw new Error("route preload failed"); },
      waitForResolvedRoute,
      verifyStorage: async () => undefined,
      verifyCalculationCore: async () => undefined,
      notifyPreflightReady,
      waitForPaint: async () => undefined,
      verifyResolvedRoute: async () => undefined
    });

    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.source).toBe("route");
      expect(result.error.message).toBe("route preload failed");
      expect(result.storageReady).toBe(true);
    }
    expect(notifyPreflightReady).not.toHaveBeenCalled();
    expect(waitForResolvedRoute).not.toHaveBeenCalled();
  });

  it("首帧确认失败时保留已通过的数据库只读备份资格", async () => {
    const result = await runAppBootReadiness({
      preloadResolvedRoute: async () => undefined,
      waitForResolvedRoute: async () => undefined,
      verifyStorage: async () => undefined,
      verifyCalculationCore: async () => undefined,
      waitForPaint: async () => { throw new Error("paint failed"); },
      verifyResolvedRoute: async () => undefined
    });

    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.source).toBe("paint");
      expect(result.error.message).toBe("paint failed");
      expect(result.storageReady).toBe(true);
    }
  });

  it("旧标签页等外部占用让启动探针悬挂时，按固定超时失败关闭", async () => {
    vi.useFakeTimers();
    try {
      const resultPromise = runAppBootReadiness({
        preloadResolvedRoute: async () => undefined,
        waitForResolvedRoute: async () => undefined,
        verifyStorage: () => new Promise<void>(() => undefined),
        verifyCalculationCore: async () => undefined,
        waitForPaint: async () => undefined,
        verifyResolvedRoute: async () => undefined,
        timeoutMs: 25
      });
      await vi.advanceTimersByTimeAsync(25);
      const result = await resultPromise;

      expect(result.ready).toBe(false);
      if (!result.ready) {
        expect(result.error).toBeInstanceOf(AppBootReadinessTimeoutError);
        expect(result.source).toBe("timeout");
        expect(result.error.message).toContain("旧标签页占用本地数据库");
        expect(result.storageReady).toBe(false);
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it("路由先失败而存储仍悬挂时，超时结果保留时序上的首个 route 错误", async () => {
    vi.useFakeTimers();
    try {
      const notifyFailure = vi.fn();
      const resultPromise = runAppBootReadiness({
        preloadResolvedRoute: async () => { throw new Error("route failed first"); },
        waitForResolvedRoute: async () => undefined,
        verifyStorage: () => new Promise<void>(() => undefined),
        verifyCalculationCore: async () => undefined,
        notifyFailure,
        waitForPaint: async () => undefined,
        verifyResolvedRoute: async () => undefined,
        timeoutMs: 25
      });
      await vi.advanceTimersByTimeAsync(25);
      const result = await resultPromise;

      expect(result.ready).toBe(false);
      if (!result.ready) {
        expect(result.source).toBe("route");
        expect(result.error.message).toBe("route failed first");
        expect(result.storageReady).toBe(false);
      }
      expect(notifyFailure).toHaveBeenCalledTimes(1);
      expect(notifyFailure.mock.calls[0]?.[0]).toMatchObject({
        source: "route",
        storageReady: false
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("路由悬挂但数据库已确认时保留只读安全备份资格", async () => {
    vi.useFakeTimers();
    try {
      const resultPromise = runAppBootReadiness({
        preloadResolvedRoute: async () => undefined,
        waitForResolvedRoute: () => new Promise<void>(() => undefined),
        verifyStorage: async () => undefined,
        verifyCalculationCore: async () => undefined,
        waitForPaint: async () => undefined,
        verifyResolvedRoute: async () => undefined,
        timeoutMs: 25
      });
      await vi.advanceTimersByTimeAsync(25);
      const result = await resultPromise;

      expect(result.ready).toBe(false);
      if (!result.ready) {
        expect(result.source).toBe("timeout");
        expect(result.storageReady).toBe(true);
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it("首帧后发现路由身份变化时按 route 失败关闭", async () => {
    const result = await runAppBootReadiness({
      preloadResolvedRoute: async () => undefined,
      waitForResolvedRoute: async () => undefined,
      verifyStorage: async () => undefined,
      verifyCalculationCore: async () => undefined,
      waitForPaint: async () => undefined,
      verifyResolvedRoute: async () => { throw new Error("route changed"); }
    });

    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.source).toBe("route");
      expect(result.error.message).toBe("route changed");
      expect(result.storageReady).toBe(true);
    }
  });
});
