import { describe, expect, it, vi } from "vitest";
import { AppBootFailureLatch } from "./app-boot-failure-latch";

describe("AppBootFailureLatch", () => {
  it("永久保留首次失败的阶段与错误", () => {
    const latch = new AppBootFailureLatch();
    const firstError = new Error("storage failed");

    const first = latch.report("storage", firstError);
    const second = latch.report("route", new Error("route failed"));

    expect(first.source).toBe("storage");
    expect(first.error).not.toBe(firstError);
    expect(first.error).toMatchObject({ name: "Error", message: "storage failed" });
    expect(Object.isFrozen(first.error)).toBe(true);
    expect(Object.isFrozen(first)).toBe(true);
    expect(second).toBe(first);
    expect(latch.current).toBe(first);
  });

  it("晚订阅者会立即收到已锁定的失败，取消订阅后不再通知", () => {
    const latch = new AppBootFailureLatch();
    const failure = latch.report("calculation", "calculation failed");
    const listener = vi.fn();

    const unsubscribe = latch.subscribe(listener);
    expect(listener).toHaveBeenCalledWith(failure);

    unsubscribe();
    latch.report("paint", new Error("paint failed"));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
