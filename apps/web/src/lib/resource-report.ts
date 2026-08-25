import { useEffect, useState } from "react";
import { safeVisibleErrorMessage, safeVisibleText } from "./visible-text";

export type LongTaskSample = {
  startedAt: string;
  durationMs: number;
  attribution: string | null;
};

export type ResourceReportSnapshot = {
  checkedAt: string;
  storage: {
    supported: boolean;
    usageBytes: number | null;
    quotaBytes: number | null;
    error: string | null;
  };
  memory: {
    supported: boolean;
    usedJSHeapSizeBytes: number | null;
    totalJSHeapSizeBytes: number | null;
  };
  longTasks: {
    supported: boolean;
    count: number;
    maxDurationMs: number | null;
    totalDurationMs: number;
    samples: LongTaskSample[];
  };
};

type ResourceReportRuntime = {
  storageEstimate?: () => Promise<Pick<StorageEstimate, "usage" | "quota">>;
  memory?: () => { usedJSHeapSize: number; totalJSHeapSize: number } | null;
  now?: () => string;
  longTasks?: LongTaskSample[];
};

const MAX_RETAINED_LONG_TASKS = 50;
const MAX_LONG_TASK_TEXT_CODE_POINTS = 160;
const MAX_LONG_TASK_DURATION_MS = Number.MAX_SAFE_INTEGER / MAX_RETAINED_LONG_TASKS;
const MAX_FUTURE_DIAGNOSTIC_SKEW_MS = 5 * 60 * 1000;

function finiteNonNegativeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function finiteNonNegativeByteCount(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function normalizeMemory(
  value: { usedJSHeapSize?: unknown; totalJSHeapSize?: unknown } | null | undefined
): { usedJSHeapSize: number; totalJSHeapSize: number } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const usedJSHeapSize = finiteNonNegativeByteCount(value.usedJSHeapSize);
    const totalJSHeapSize = finiteNonNegativeByteCount(value.totalJSHeapSize);
    if (
      usedJSHeapSize === null
      || totalJSHeapSize === null
      || usedJSHeapSize > totalJSHeapSize
    ) return null;
    return { usedJSHeapSize, totalJSHeapSize };
  } catch {
    return null;
  }
}

function normalizeStorageEstimate(value: unknown): {
  usageBytes: number;
  quotaBytes: number;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const candidate = value as Record<string, unknown>;
    if (
      !Object.prototype.hasOwnProperty.call(candidate, "usage")
      || !Object.prototype.hasOwnProperty.call(candidate, "quota")
    ) return null;
    const usageBytes = finiteNonNegativeByteCount(candidate.usage);
    const quotaBytes = finiteNonNegativeByteCount(candidate.quota);
    if (usageBytes === null || quotaBytes === null || quotaBytes === 0 || usageBytes > quotaBytes) return null;
    return { usageBytes, quotaBytes };
  } catch {
    return null;
  }
}

function normalizeLongTaskSample(value: unknown): LongTaskSample | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const candidate = value as Partial<LongTaskSample>;
    const durationMs = finiteNonNegativeNumber(candidate.durationMs);
    const startedAtText = safeVisibleText(candidate.startedAt, "", 64);
    const startedAtMs = Date.parse(startedAtText);
    if (
      durationMs === null
      || durationMs > MAX_LONG_TASK_DURATION_MS
      || !Number.isFinite(startedAtMs)
    ) return null;
    const attribution = safeVisibleText(candidate.attribution, "", MAX_LONG_TASK_TEXT_CODE_POINTS);
    return Object.freeze({
      startedAt: new Date(startedAtMs).toISOString(),
      durationMs,
      attribution: attribution || null
    });
  } catch {
    return null;
  }
}

function supportsLongTaskEntryType(
  observerType: typeof PerformanceObserver | undefined
): boolean {
  if (typeof observerType !== "function") return false;
  try {
    const entryTypes = (observerType as typeof PerformanceObserver & {
      supportedEntryTypes?: readonly string[];
    }).supportedEntryTypes;
    return entryTypes === undefined || entryTypes.includes("longtask");
  } catch {
    return false;
  }
}

function browserMemory(): { usedJSHeapSize: number; totalJSHeapSize: number } | null {
  try {
    if (typeof performance === "undefined" || !("memory" in performance)) return null;
    const memory = (performance as unknown as { memory?: { usedJSHeapSize?: number; totalJSHeapSize?: number } }).memory;
    return normalizeMemory(memory);
  } catch {
    return null;
  }
}

function resolveReportCheckedAt(now: unknown): string {
  try {
    const candidate = typeof now === "function"
      ? (now as () => unknown)()
      : new Date().toISOString();
    if (typeof candidate === "string" && candidate.length <= 64) {
      const timestamp = Date.parse(candidate);
      if (Number.isFinite(timestamp)) return new Date(timestamp).toISOString();
    }
  } catch {
    // Fall through to the current local clock.
  }
  return new Date().toISOString();
}

export function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "不可用";
  if (value < 1024) return `${value} B`;
  const units = ["KiB", "MiB", "GiB", "TiB"] as const;
  let scaled = value / 1024;
  let unitIndex = 0;
  while (scaled >= 1024 && unitIndex < units.length - 1) {
    scaled /= 1024;
    unitIndex += 1;
  }
  return `${scaled.toFixed(scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

/**
 * Local-only resource report: browser storage estimate, JS heap memory when
 * exposed, and recent main-thread long tasks. It never enters backup payloads.
 */
export async function collectResourceReport(
  runtime: ResourceReportRuntime = {}
): Promise<ResourceReportSnapshot> {
  let now: unknown;
  let injectedEstimate: unknown;
  let estimateProbeUnreadable = false;
  try {
    now = runtime?.now;
  } catch {
    now = undefined;
  }
  try {
    injectedEstimate = runtime?.storageEstimate;
  } catch {
    estimateProbeUnreadable = true;
  }
  const checkedAt = resolveReportCheckedAt(now);
  const estimate = typeof injectedEstimate === "function"
    ? injectedEstimate as () => Promise<Pick<StorageEstimate, "usage" | "quota">>
    :
    (() => {
      if (typeof navigator === "undefined" || typeof navigator.storage?.estimate !== "function") {
        return Promise.reject(new Error("浏览器未提供站点存储估算。"));
      }
      return navigator.storage.estimate();
    });

  let storage: ResourceReportSnapshot["storage"] = {
    supported: false,
    usageBytes: null,
    quotaBytes: null,
    error: null
  };
  try {
    if (estimateProbeUnreadable || (injectedEstimate !== undefined && typeof injectedEstimate !== "function")) {
      throw new TypeError("站点存储估算探针不可读取。");
    }
    const result = normalizeStorageEstimate(await Promise.resolve().then(estimate));
    if (!result) throw new TypeError("浏览器返回了无效的站点存储估算。");
    storage = {
      supported: true,
      usageBytes: result.usageBytes,
      quotaBytes: result.quotaBytes,
      error: null
    };
  } catch (reason) {
    storage.error = safeVisibleErrorMessage(reason, "存储估算读取失败");
  }

  let memory: ReturnType<typeof normalizeMemory> = null;
  try {
    const memoryProbe = runtime?.memory;
    if (memoryProbe !== undefined && typeof memoryProbe !== "function") {
      throw new TypeError("内存探针不是函数。");
    }
    memory = normalizeMemory(memoryProbe?.() ?? browserMemory());
  } catch {
    // A non-standard memory probe must not prevent the remaining diagnostics.
  }
  const samples: LongTaskSample[] = [];
  const checkedAtMs = Date.parse(checkedAt);
  try {
    const longTasks = runtime?.longTasks;
    if (Array.isArray(longTasks)) {
      const startIndex = Math.max(0, longTasks.length - MAX_RETAINED_LONG_TASKS);
      for (let index = startIndex; index < longTasks.length; index += 1) {
        const sample = normalizeLongTaskSample(longTasks[index]);
        if (
          sample
          && Date.parse(sample.startedAt) - checkedAtMs <= MAX_FUTURE_DIAGNOSTIC_SKEW_MS
        ) samples.push(sample);
      }
    }
  } catch {
    // A malformed injected sample collection degrades to the safe prefix.
  }
  const durations = samples.map((sample) => sample.durationMs);
  const observerType = typeof PerformanceObserver === "undefined" ? undefined : PerformanceObserver;

  return Object.freeze({
    checkedAt,
    storage: Object.freeze(storage),
    memory: Object.freeze({
      supported: memory !== null,
      usedJSHeapSizeBytes: memory?.usedJSHeapSize ?? null,
      totalJSHeapSizeBytes: memory?.totalJSHeapSize ?? null
    }),
    longTasks: Object.freeze({
      supported: samples.length > 0 || supportsLongTaskEntryType(observerType),
      count: samples.length,
      maxDurationMs: durations.length ? Math.max(...durations) : null,
      totalDurationMs: durations.reduce((sum, value) => sum + value, 0),
      samples: Object.freeze([...samples]) as unknown as LongTaskSample[]
    })
  });
}

/**
 * Observes main-thread long tasks while the page is open and keeps a bounded,
 * local sample list. Unsupported browsers degrade to an empty list.
 */
export function useLongTaskMonitor(): {
  supported: boolean;
  samples: LongTaskSample[];
} {
  const [samples, setSamples] = useState<LongTaskSample[]>([]);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !supportsLongTaskEntryType(window.PerformanceObserver)
    ) {
      return;
    }
    let active = true;
    let observer: PerformanceObserver | null = null;
    try {
      observer = new window.PerformanceObserver((list) => {
        if (!active) return;
        const next: LongTaskSample[] = [];
        try {
          const entries = list.getEntries().slice(-MAX_RETAINED_LONG_TASKS);
          for (const entry of entries) {
            const raw = entry as unknown as {
              duration: number;
              attribution?: Array<{ name?: string }>;
            };
            const sample = normalizeLongTaskSample({
              startedAt: new Date(window.performance.timeOrigin + entry.startTime).toISOString(),
              durationMs: raw.duration,
              attribution: raw.attribution?.[0]?.name ?? null
            });
            if (sample) next.push(sample);
          }
        } catch {
          return;
        }
        if (!active || next.length === 0) return;
        setSamples((current) => [...current, ...next].slice(-MAX_RETAINED_LONG_TASKS));
      });
      observer.observe({ entryTypes: ["longtask"] });
      if (active) setSupported(true);
    } catch {
      // PerformanceObserver or longtask entry type is unavailable; degrade.
    }
    return () => {
      active = false;
      observer?.disconnect();
    };
  }, []);

  return { supported, samples };
}
