import {
  buildCaseImportPlan,
  buildCaseImportPlanFromSource,
  CaseImportCancelledError,
  CaseImportConfigurationError,
  readCaseImportHeaders,
  readCaseImportHeadersFromSource,
  type CaseImportConfigurationIssue,
  type CaseImportOptions,
  type CaseImportPlan,
  type CaseImportRow,
  type CaseImportCandidate
} from "@hakimi/case-import";
import { createBlobCsvSource } from "./case-import-blob-source";
import { safeVisibleText } from "./visible-text";
import { disposeWorkerSafely } from "./worker-lifecycle";
import type {
  CaseImportWorkerRequest,
  CaseImportWorkerResponse,
  CaseImportWorkerSerializedError
} from "./case-import-worker-protocol";

type WorkerLike = Pick<Worker, "postMessage" | "terminate" | "onmessage" | "onerror" | "onmessageerror">;
const MAX_WORKER_ERROR_TEXT_CODE_POINTS = 512;
const MAX_WORKER_CONFIGURATION_ISSUES = 100;

export type CaseImportWorkerRuntime = {
  createWorker?: () => WorkerLike;
  /** Tests may force the Worker branch without installing a browser global. */
  forceWorker?: boolean;
};

function createBrowserWorker(): Worker {
  return new Worker(new URL("../workers/case-import.worker.ts", import.meta.url), {
    type: "module",
    name: "hakimi-case-import-preflight"
  });
}

function restoreConfigurationIssues(value: unknown, fallback: string): CaseImportConfigurationIssue[] | null {
  if (!Array.isArray(value)) return null;
  const issues: CaseImportConfigurationIssue[] = [];
  for (const candidate of value.slice(0, MAX_WORKER_CONFIGURATION_ISSUES)) {
    if (!candidate || typeof candidate !== "object") continue;
    const record = candidate as Record<string, unknown>;
    const code = safeVisibleText(record.code, "", 128);
    const message = safeVisibleText(record.message, fallback, MAX_WORKER_ERROR_TEXT_CODE_POINTS);
    if (!code || !message) continue;
    issues.push({ ...record, code, message } as CaseImportConfigurationIssue);
  }
  return issues.length > 0 ? issues : null;
}

function restoreWorkerError(serialized: CaseImportWorkerSerializedError): Error {
  const name = safeVisibleText(serialized.name, "Error", 128) || "Error";
  const message = safeVisibleText(
    serialized.message,
    "CSV Worker 返回了未说明的错误。",
    MAX_WORKER_ERROR_TEXT_CODE_POINTS
  );
  const code = safeVisibleText(serialized.code, "", 128);
  if (code === "IMPORT_CANCELLED") return new CaseImportCancelledError();
  const issues = restoreConfigurationIssues(serialized.issues, message);
  if (name === "CaseImportConfigurationError" && issues) {
    return new CaseImportConfigurationError(issues);
  }
  const error = new Error(message);
  error.name = name;
  if (code) (error as Error & { code?: string }).code = code;
  return error;
}

function canUseBrowserWorker(runtime: CaseImportWorkerRuntime): boolean {
  return runtime.forceWorker === true || typeof globalThis.Worker === "function";
}

function toWorkerBlob(source: string | Blob): Blob {
  return typeof source === "string"
    ? new Blob([source], { type: "text/csv;charset=utf-8" })
    : source;
}

function guardWorkerMessage<T>(
  fail: (reason: unknown) => void,
  handle: (event: MessageEvent<T>) => void
): (event: MessageEvent<T>) => void {
  return (event) => {
    try {
      handle(event);
    } catch (reason) {
      fail(reason);
    }
  };
}

/** Keeps even an abnormally large or quoted first record away from the browser main thread. */
export async function readCaseImportHeadersOffMainThread(
  csv: string | Blob,
  signal?: AbortSignal,
  runtime: CaseImportWorkerRuntime = {}
): Promise<string[]> {
  if (!canUseBrowserWorker(runtime)) {
    if (signal?.aborted) throw new CaseImportCancelledError();
    return typeof csv === "string"
      ? readCaseImportHeaders(csv)
      : readCaseImportHeadersFromSource(createBlobCsvSource(csv), { signal });
  }
  if (signal?.aborted) throw new CaseImportCancelledError();
  const worker = runtime.createWorker?.() ?? createBrowserWorker();
  let settled = false;

  return new Promise<string[]>((resolve, reject) => {
    const cleanup = () => {
      signal?.removeEventListener("abort", abort);
      disposeWorkerSafely(worker);
    };
    const fail = (reason: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(reason);
    };
    const abort = () => {
      if (settled) return;
      try {
        worker.postMessage({ type: "cancel" } satisfies CaseImportWorkerRequest);
      } catch {
        // Termination below is the authoritative cancellation path.
      }
      fail(new CaseImportCancelledError());
    };
    worker.onmessage = guardWorkerMessage(fail, (event: MessageEvent<CaseImportWorkerResponse>) => {
      if (settled) return;
      if (event.data.type === "error") {
        fail(restoreWorkerError(event.data.error));
        return;
      }
      if (event.data.type !== "headers") {
        fail(new Error("CSV Worker 在表头读取阶段返回了不受支持的响应。"));
        return;
      }
      if (!Array.isArray(event.data.headers) || event.data.headers.some((header) => typeof header !== "string")) {
        fail(new Error("CSV Worker 返回了无效的表头列表。"));
        return;
      }
      settled = true;
      cleanup();
      resolve(event.data.headers);
    });
    worker.onerror = (event: ErrorEvent) => {
      event.preventDefault?.();
      fail(new Error(safeVisibleText(
        event.message,
        "CSV Worker 读取表头失败。",
        MAX_WORKER_ERROR_TEXT_CODE_POINTS
      )));
    };
    worker.onmessageerror = () => fail(new Error("CSV Worker 返回了无法解析的表头。"));
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) {
      abort();
      return;
    }
    try {
      worker.postMessage({
        type: "read_headers",
        blob: toWorkerBlob(csv)
      } satisfies CaseImportWorkerRequest);
    } catch (reason) {
      fail(reason);
    }
  });
}

/**
 * Runs the expensive preflight in a disposable module Worker. Batches are streamed back so the
 * main thread never receives one monolithic structured clone. Non-browser/test runtimes retain a
 * deterministic async fallback, which shares the same incremental parser and AbortSignal.
 */
export async function buildCaseImportPlanOffMainThread(
  csv: string | Blob,
  options: CaseImportOptions,
  runtime: CaseImportWorkerRuntime = {}
): Promise<CaseImportPlan> {
  const canUseWorker = canUseBrowserWorker(runtime) && options.yieldControl === undefined;
  if (!canUseWorker) {
    if (options.signal?.aborted) throw new CaseImportCancelledError();
    return typeof csv === "string"
      ? buildCaseImportPlan(csv, options)
      : buildCaseImportPlanFromSource(createBlobCsvSource(csv), options);
  }
  if (options.signal?.aborted) throw new CaseImportCancelledError();

  const worker = runtime.createWorker?.() ?? createBrowserWorker();
  const rows: CaseImportRow[] = [];
  const imports: CaseImportCandidate[] = [];
  let settled = false;
  let progressQueue = Promise.resolve();
  let nextBatchNumber = 1;
  let pendingBatchNumber: number | null = null;

  return new Promise<CaseImportPlan>((resolve, reject) => {
    const cleanup = () => {
      options.signal?.removeEventListener("abort", abort);
      disposeWorkerSafely(worker);
    };
    const fail = (reason: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(reason);
    };
    const abort = () => {
      if (settled) return;
      try {
        worker.postMessage({ type: "cancel" } satisfies CaseImportWorkerRequest);
      } catch {
        // Termination below is the authoritative cancellation path.
      }
      fail(new CaseImportCancelledError());
    };

    worker.onmessage = guardWorkerMessage(fail, (event: MessageEvent<CaseImportWorkerResponse>) => {
      if (settled) return;
      const message = event.data;
      if (message.type === "error") {
        fail(restoreWorkerError(message.error));
        return;
      }
      if (message.type === "source_progress") {
        progressQueue = progressQueue.then(async () => {
          if (settled) return;
          await options.onSourceProgress?.(message.progress);
        });
        progressQueue.catch(fail);
        return;
      }
      if (message.type === "batch") {
        const batch = message.batch;
        if (
          !batch
          || typeof batch !== "object"
          || Array.isArray(batch)
          || !Array.isArray(batch.rows)
          || !Array.isArray(batch.imports)
          || !batch.progress
          || typeof batch.progress !== "object"
          || Array.isArray(batch.progress)
        ) {
          fail(new Error("CSV Worker 返回了结构无效的导入批次。"));
          return;
        }
        const batchNumber = batch.batchNumber;
        if (
          !Number.isSafeInteger(batchNumber)
          || batchNumber < 1
          || batchNumber !== batch.progress.batchNumber
          || batchNumber !== nextBatchNumber
          || pendingBatchNumber !== null
        ) {
          fail(new Error(
            `CSV Worker 返回了无效批次：期望 ${nextBatchNumber}，收到 ${batchNumber}。`
          ));
          return;
        }
        pendingBatchNumber = batchNumber;
        rows.push(...batch.rows);
        imports.push(...batch.imports);
        progressQueue = progressQueue.then(async () => {
          if (settled) return;
          await options.onProgress?.(batch.progress);
          if (settled) return;
          if (pendingBatchNumber !== batchNumber) {
            throw new Error(`CSV Worker 批次确认状态异常：${batchNumber}。`);
          }
          // Clear the local gate before postMessage so synchronous Worker test doubles cannot
          // re-enter with the next batch while the preceding batch still appears pending.
          pendingBatchNumber = null;
          nextBatchNumber += 1;
          worker.postMessage({ type: "batch_ack", batchNumber } satisfies CaseImportWorkerRequest);
        });
        progressQueue.catch(fail);
        return;
      }
      if (message.type !== "complete") {
        fail(new Error("CSV Worker 在导入预检阶段返回了不受支持的响应。"));
        return;
      }
      if (pendingBatchNumber !== null) {
        fail(new Error(`CSV Worker 在批次 ${pendingBatchNumber} 确认前提前结束。`));
        return;
      }
      void progressQueue.then(() => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve({
          ...message.summary,
          rows,
          imports,
          hasRowErrors: message.summary.stats.invalidRows > 0,
          allowsPartialImport: true
        });
      }).catch(fail);
    });
    worker.onerror = (event: ErrorEvent) => {
      event.preventDefault?.();
      fail(new Error(safeVisibleText(
        event.message,
        "CSV Worker 运行失败。",
        MAX_WORKER_ERROR_TEXT_CODE_POINTS
      )));
    };
    worker.onmessageerror = () => fail(new Error("CSV Worker 返回了无法解析的数据。"));
    options.signal?.addEventListener("abort", abort, { once: true });
    if (options.signal?.aborted) {
      abort();
      return;
    }

    try {
      worker.postMessage({
        type: "start",
        blob: toWorkerBlob(csv),
        options: {
          mapping: options.mapping,
          duplicatePolicy: options.duplicatePolicy ?? "skip",
          existingFingerprints: [...(options.existingFingerprints ?? [])],
          ...(options.tagSeparator === undefined ? {} : { tagSeparator: options.tagSeparator }),
          chunkSize: options.chunkSize ?? 100,
          ...(options.parseCharacterBudget === undefined
            ? {}
            : { parseCharacterBudget: options.parseCharacterBudget })
        }
      } satisfies CaseImportWorkerRequest);
    } catch (reason) {
      fail(reason);
    }
  });
}
