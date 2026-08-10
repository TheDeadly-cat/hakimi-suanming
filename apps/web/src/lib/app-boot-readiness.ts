import { normalizeBootError, type AppBootFailureSource } from "./app-boot-failure";

export type AppBootReadinessDependencies = {
  preloadResolvedRoute: () => Promise<void>;
  waitForResolvedRoute: () => Promise<void>;
  verifyStorage: () => Promise<void>;
  verifyCalculationCore: () => Promise<void>;
  notifyPreflightReady?: () => void;
  notifyFailure?: (failure: {
    error: Error;
    source: AppBootFailureSource;
    storageReady: boolean;
  }) => void;
  waitForPaint: () => Promise<void>;
  verifyResolvedRoute: () => Promise<void>;
  timeoutMs?: number;
};

export const APP_BOOT_READINESS_TIMEOUT_MS = 15_000;

export class AppBootReadinessTimeoutError extends Error {
  constructor(readonly timeoutMs: number) {
    super(`应用启动完整性检查在 ${timeoutMs} 毫秒内未完成；可能仍有旧标签页占用本地数据库。`);
    this.name = "AppBootReadinessTimeoutError";
  }
}

class AppBootProbeError extends Error {
  constructor(readonly source: AppBootFailureSource, readonly original: Error) {
    super(original.message);
    this.name = "AppBootProbeError";
  }
}

async function runProbe(source: AppBootFailureSource, probe: () => Promise<void>): Promise<void> {
  try {
    await probe();
  } catch (reason) {
    throw new AppBootProbeError(source, normalizeBootError(reason, `${source} boot probe failed`));
  }
}

export type AppBootReadinessResult =
  | { ready: true; error: null; storageReady: true }
  | { ready: false; error: Error; source: AppBootFailureSource; storageReady: boolean };

/**
 * A service-worker generation is stable only after the real lazy route,
 * IndexedDB schema and deterministic calculation core have all executed.
 */
export async function runAppBootReadiness(
  dependencies: AppBootReadinessDependencies
): Promise<AppBootReadinessResult> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  let storageReady = false;
  let firstProbeFailure: AppBootProbeError | null = null;
  let failureNotified = false;
  let gateClosed = false;
  const rememberProbeFailure = (failure: AppBootProbeError) => {
    if (gateClosed || firstProbeFailure) return;
    firstProbeFailure = failure;
    failureNotified = true;
    dependencies.notifyFailure?.({
      error: failure.original,
      source: failure.source,
      storageReady
    });
  };
  const captureProbe = async (source: AppBootFailureSource, probe: () => Promise<void>) => {
    try {
      await runProbe(source, probe);
    } catch (reason) {
      const failure = reason instanceof AppBootProbeError
        ? reason
        : new AppBootProbeError(source, normalizeBootError(reason, `${source} boot probe failed`));
      rememberProbeFailure(failure);
      throw failure;
    }
  };
  try {
    const timeoutMs = dependencies.timeoutMs ?? APP_BOOT_READINESS_TIMEOUT_MS;
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new AppBootProbeError("timeout", new Error("应用启动完整性检查超时必须是正数毫秒"));
    }
    const readiness = (async () => {
      const preflightResults = await Promise.allSettled([
        captureProbe("storage", async () => {
          await dependencies.verifyStorage();
          storageReady = true;
        }),
        captureProbe("calculation", dependencies.verifyCalculationCore),
        captureProbe("route", dependencies.preloadResolvedRoute)
      ]);
      if (gateClosed) return;
      if (firstProbeFailure) throw firstProbeFailure;
      if (preflightResults.some((result) => result.status === "rejected")) {
        throw new AppBootProbeError("timeout", new Error("启动预检失败但没有保留失败原因。"));
      }
      await captureProbe("route", async () => dependencies.notifyPreflightReady?.());
      await captureProbe("route", dependencies.waitForResolvedRoute);
      await captureProbe("paint", dependencies.waitForPaint);
      await captureProbe("route", dependencies.verifyResolvedRoute);
    })();
    await Promise.race([
      readiness,
      new Promise<never>((_resolve, reject) => {
        timeoutHandle = setTimeout(() => reject(new AppBootReadinessTimeoutError(timeoutMs)), timeoutMs);
      })
    ]);
    return { ready: true, error: null, storageReady: true };
  } catch (reason) {
    const effectiveReason = reason instanceof AppBootReadinessTimeoutError && firstProbeFailure
      ? firstProbeFailure
      : reason;
    const failure = effectiveReason instanceof AppBootProbeError
      ? { source: effectiveReason.source, error: effectiveReason.original }
      : effectiveReason instanceof AppBootReadinessTimeoutError
        ? { source: "timeout" as const, error: effectiveReason }
        : { source: "timeout" as const, error: normalizeBootError(effectiveReason, "application boot readiness failed") };
    const result = {
      ready: false,
      error: failure.error,
      source: failure.source,
      storageReady
    } as const;
    if (!failureNotified) {
      failureNotified = true;
      dependencies.notifyFailure?.(result);
    }
    return result;
  } finally {
    gateClosed = true;
    if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
  }
}
