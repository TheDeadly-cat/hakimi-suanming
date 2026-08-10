import {
  buildCaseImportPlan,
  buildCaseImportPlanFromSource,
  CaseImportCancelledError,
  CaseImportConfigurationError,
  readCaseImportHeaders,
  readCaseImportHeadersFromSource,
  type CaseImportOptions,
  type CaseImportPlan,
  type CaseImportRow,
  type CaseImportCandidate
} from "@hakimi/case-import";
import { createBlobCsvSource } from "./case-import-blob-source";
import type {
  CaseImportWorkerRequest,
  CaseImportWorkerResponse,
  CaseImportWorkerSerializedError
} from "./case-import-worker-protocol";

type WorkerLike = Pick<Worker, "postMessage" | "terminate" | "onmessage" | "onerror" | "onmessageerror">;

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

function restoreWorkerError(serialized: CaseImportWorkerSerializedError): Error {
  if (serialized.code === "IMPORT_CANCELLED") return new CaseImportCancelledError();
  if (serialized.name === "CaseImportConfigurationError" && serialized.issues) {
    return new CaseImportConfigurationError(serialized.issues);
  }
  const error = new Error(serialized.message);
  error.name = serialized.name;
  if (serialized.code) (error as Error & { code?: string }).code = serialized.code;
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
      worker.terminate();
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
    worker.onmessage = (event: MessageEvent<CaseImportWorkerResponse>) => {
      if (settled) return;
      if (event.data.type === "error") {
        fail(restoreWorkerError(event.data.error));
        return;
      }
      if (event.data.type !== "headers") return;
      settled = true;
      cleanup();
      resolve(event.data.headers);
    };
    worker.onerror = (event: ErrorEvent) => {
      event.preventDefault?.();
      fail(new Error(event.message || "CSV Worker 读取表头失败。"));
    };
    worker.onmessageerror = () => fail(new Error("CSV Worker 返回了无法解析的表头。"));
    signal?.addEventListener("abort", abort, { once: true });
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
      worker.terminate();
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

    worker.onmessage = (event: MessageEvent<CaseImportWorkerResponse>) => {
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
        const batchNumber = message.batch.batchNumber;
        if (
          !Number.isInteger(batchNumber)
          || batchNumber !== message.batch.progress.batchNumber
          || batchNumber !== nextBatchNumber
          || pendingBatchNumber !== null
        ) {
          fail(new Error(
            `CSV Worker 返回了无效批次：期望 ${nextBatchNumber}，收到 ${batchNumber}。`
          ));
          return;
        }
        pendingBatchNumber = batchNumber;
        rows.push(...message.batch.rows);
        imports.push(...message.batch.imports);
        progressQueue = progressQueue.then(async () => {
          if (settled) return;
          await options.onProgress?.(message.batch.progress);
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
      if (message.type !== "complete") return;
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
      }, fail);
    };
    worker.onerror = (event: ErrorEvent) => {
      event.preventDefault?.();
      fail(new Error(event.message || "CSV Worker 运行失败。"));
    };
    worker.onmessageerror = () => fail(new Error("CSV Worker 返回了无法解析的数据。"));
    options.signal?.addEventListener("abort", abort, { once: true });

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
