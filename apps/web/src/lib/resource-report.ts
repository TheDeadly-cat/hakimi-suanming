import { useEffect, useState } from "react";

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

function browserMemory(): { usedJSHeapSize: number; totalJSHeapSize: number } | null {
  if (typeof performance === "undefined" || !("memory" in performance)) return null;
  const memory = (performance as unknown as { memory?: { usedJSHeapSize?: number; totalJSHeapSize?: number } }).memory;
  if (!memory || typeof memory.usedJSHeapSize !== "number" || typeof memory.totalJSHeapSize !== "number") return null;
  return { usedJSHeapSize: memory.usedJSHeapSize, totalJSHeapSize: memory.totalJSHeapSize };
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
  const checkedAt = runtime.now?.() ?? new Date().toISOString();
  const estimate =
    runtime.storageEstimate ??
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
    const result = await estimate();
    storage = {
      supported: true,
      usageBytes: typeof result.usage === "number" ? result.usage : null,
      quotaBytes: typeof result.quota === "number" ? result.quota : null,
      error: null
    };
  } catch (reason) {
    storage.error = reason instanceof Error ? reason.message : "存储估算读取失败";
  }

  const memory = runtime.memory?.() ?? browserMemory();
  const samples = runtime.longTasks ?? [];
  const durations = samples.map((sample) => sample.durationMs).filter(Number.isFinite);

  return {
    checkedAt,
    storage,
    memory: {
      supported: memory !== null,
      usedJSHeapSizeBytes: memory?.usedJSHeapSize ?? null,
      totalJSHeapSizeBytes: memory?.totalJSHeapSize ?? null
    },
    longTasks: {
      supported: samples.length > 0 || (typeof PerformanceObserver !== "undefined"),
      count: samples.length,
      maxDurationMs: durations.length ? Math.max(...durations) : null,
      totalDurationMs: durations.reduce((sum, value) => sum + value, 0),
      samples: samples.slice(-MAX_RETAINED_LONG_TASKS)
    }
  };
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
    if (typeof window === "undefined" || typeof window.PerformanceObserver !== "function") {
      return;
    }
    let active = true;
    let observer: PerformanceObserver | null = null;
    try {
      observer = new window.PerformanceObserver((list) => {
        const next = list.getEntries().map((entry) => {
          const raw = entry as unknown as {
            duration: number;
            attribution?: Array<{ name?: string }>;
          };
          return {
            startedAt: new Date().toISOString(),
            durationMs: raw.duration,
            attribution: raw.attribution?.[0]?.name ?? null
          };
        });
        if (!active) return;
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
