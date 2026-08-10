import {
  CaseImportCancelledError,
  CaseImportConfigurationError,
  iterateCaseImportFromSource,
  readCaseImportHeadersFromSource
} from "@hakimi/case-import";
import { createBlobCsvSource } from "../lib/case-import-blob-source";
import type {
  CaseImportWorkerRequest,
  CaseImportWorkerResponse,
  CaseImportWorkerSerializedError
} from "../lib/case-import-worker-protocol";

type WorkerScope = {
  onmessage: ((event: MessageEvent<CaseImportWorkerRequest>) => void) | null;
  postMessage: (message: CaseImportWorkerResponse) => void;
};

const workerScope = globalThis as unknown as WorkerScope;
let activeController: AbortController | null = null;

type PendingBatchAck = {
  batchNumber: number;
  resolve: () => void;
  reject: (reason: unknown) => void;
};

let pendingBatchAck: PendingBatchAck | null = null;
let activeProtocolError: Error | null = null;

function serializeError(reason: unknown): CaseImportWorkerSerializedError {
  if (reason instanceof CaseImportConfigurationError) {
    return {
      name: reason.name,
      message: reason.message,
      code: reason.code,
      issues: reason.issues
    };
  }
  if (reason instanceof CaseImportCancelledError) {
    return { name: reason.name, message: reason.message, code: reason.code };
  }
  if (reason instanceof Error) {
    const code = "code" in reason && typeof reason.code === "string" ? reason.code : undefined;
    return { name: reason.name, message: reason.message, ...(code ? { code } : {}) };
  }
  return { name: "Error", message: "CSV Worker 预检失败。" };
}

function batchAckProtocolError(expected: number | null, received: number): Error {
  const error = new Error(
    expected === null
      ? `CSV Worker 收到没有对应批次的确认：${received}。`
      : `CSV Worker 批次确认编号不匹配：期望 ${expected}，收到 ${received}。`
  );
  error.name = "CaseImportWorkerProtocolError";
  (error as Error & { code: string }).code = "WORKER_BATCH_ACK_INVALID";
  return error;
}

function waitForBatchAck(batchNumber: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(new CaseImportCancelledError());
  if (pendingBatchAck !== null) {
    return Promise.reject(batchAckProtocolError(pendingBatchAck.batchNumber, batchNumber));
  }

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    let entry: PendingBatchAck;
    const cleanup = () => {
      signal.removeEventListener("abort", abort);
      if (pendingBatchAck === entry) pendingBatchAck = null;
    };
    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      action();
    };
    const abort = () => finish(() => reject(new CaseImportCancelledError()));
    entry = {
      batchNumber,
      resolve: () => finish(resolve),
      reject: (reason) => finish(() => reject(reason))
    };
    pendingBatchAck = entry;
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
}

function acknowledgeBatch(batchNumber: number): void {
  const pending = pendingBatchAck;
  if (pending === null || pending.batchNumber !== batchNumber) {
    const error = batchAckProtocolError(pending?.batchNumber ?? null, batchNumber);
    activeProtocolError = error;
    if (pending) pending.reject(error);
    activeController?.abort();
    if (pending === null && activeController === null) {
      workerScope.postMessage({ type: "error", error: serializeError(error) });
    }
    return;
  }
  pending.resolve();
}

async function runStart(message: Extract<CaseImportWorkerRequest, { type: "start" }>): Promise<void> {
  activeController?.abort();
  const controller = new AbortController();
  activeController = controller;
  activeProtocolError = null;
  try {
    const source = createBlobCsvSource(message.blob);
    const iterator = iterateCaseImportFromSource(source, {
      ...message.options,
      signal: controller.signal,
      onSourceProgress: (progress) => {
        workerScope.postMessage({ type: "source_progress", progress });
      }
    });
    while (true) {
      const result = await iterator.next();
      if (result.done) {
        workerScope.postMessage({ type: "complete", summary: result.value });
        return;
      }
      workerScope.postMessage({ type: "batch", batch: result.value });
      await waitForBatchAck(result.value.batchNumber, controller.signal);
    }
  } catch (reason) {
    controller.abort();
    workerScope.postMessage({
      type: "error",
      error: serializeError(activeProtocolError ?? reason)
    });
  } finally {
    if (activeController === controller) {
      activeController = null;
      activeProtocolError = null;
    }
  }
}

async function runReadHeaders(message: Extract<CaseImportWorkerRequest, { type: "read_headers" }>): Promise<void> {
  activeController?.abort();
  const controller = new AbortController();
  activeController = controller;
  activeProtocolError = null;
  try {
    const source = createBlobCsvSource(message.blob);
    const headers = await readCaseImportHeadersFromSource(source, { signal: controller.signal });
    workerScope.postMessage({ type: "headers", headers });
  } catch (reason) {
    workerScope.postMessage({ type: "error", error: serializeError(reason) });
  } finally {
    if (activeController === controller) {
      activeController = null;
      activeProtocolError = null;
    }
  }
}

workerScope.onmessage = (event) => {
  if (event.data.type === "cancel") {
    activeController?.abort();
    return;
  }
  if (event.data.type === "batch_ack") {
    acknowledgeBatch(event.data.batchNumber);
    return;
  }
  if (event.data.type === "read_headers") {
    void runReadHeaders(event.data);
    return;
  }
  void runStart(event.data);
};

export {};
