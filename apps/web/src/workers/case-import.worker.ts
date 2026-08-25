import {
  CaseImportCancelledError,
  CaseImportConfigurationError,
  iterateCaseImportFromSource,
  readCaseImportHeadersFromSource,
  type CaseImportConfigurationIssue
} from "@hakimi/case-import";
import { createBlobCsvSource } from "../lib/case-import-blob-source";
import { safeVisibleText } from "../lib/visible-text";
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
const MAX_WORKER_ERROR_TEXT_CODE_POINTS = 512;
const MAX_WORKER_CONFIGURATION_ISSUES = 100;

function serializeConfigurationIssues(value: unknown): CaseImportConfigurationIssue[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const issues: CaseImportConfigurationIssue[] = [];
  for (const candidate of value.slice(0, MAX_WORKER_CONFIGURATION_ISSUES)) {
    if (!candidate || typeof candidate !== "object") continue;
    const record = candidate as Record<string, unknown>;
    const code = safeVisibleText(record.code, "", 128);
    const message = safeVisibleText(
      record.message,
      "CSV 配置问题未提供说明。",
      MAX_WORKER_ERROR_TEXT_CODE_POINTS
    );
    if (!code || !message) continue;
    issues.push({ ...record, code, message } as CaseImportConfigurationIssue);
  }
  return issues.length > 0 ? issues : undefined;
}

function serializeError(reason: unknown): CaseImportWorkerSerializedError {
  try {
    if (reason instanceof CaseImportConfigurationError) {
      const issues = serializeConfigurationIssues(reason.issues);
      return {
        name: "CaseImportConfigurationError",
        message: safeVisibleText(
          reason.message,
          "CSV 导入配置无效。",
          MAX_WORKER_ERROR_TEXT_CODE_POINTS
        ),
        code: safeVisibleText(reason.code, "CASE_IMPORT_CONFIGURATION_INVALID", 128),
        ...(issues ? { issues } : {})
      };
    }
    if (reason instanceof CaseImportCancelledError) {
      return { name: reason.name, message: reason.message, code: reason.code };
    }
    if (reason instanceof Error) {
      const code = "code" in reason && typeof reason.code === "string"
        ? safeVisibleText(reason.code, "", 128)
        : "";
      return {
        name: safeVisibleText(reason.name, "Error", 128) || "Error",
        message: safeVisibleText(
          reason.message,
          "CSV Worker 预检失败。",
          MAX_WORKER_ERROR_TEXT_CODE_POINTS
        ),
        ...(code ? { code } : {})
      };
    }
  } catch {
    // Malformed error objects degrade to a stable runtime error.
  }
  return { name: "Error", message: "CSV Worker 预检失败。" };
}

function postError(reason: unknown): void {
  try {
    workerScope.postMessage({ type: "error", error: serializeError(reason) });
  } catch {
    // The worker cannot report a secondary failure when its channel is broken.
  }
}

function workerProtocolError(message: string, code: string): Error {
  const error = new Error(message);
  error.name = "CaseImportWorkerProtocolError";
  (error as Error & { code: string }).code = code;
  return error;
}

function rejectProtocolViolation(error: Error): void {
  activeProtocolError = error;
  if (activeController) {
    activeController.abort();
    return;
  }
  postError(error);
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
      postError(error);
    }
    return;
  }
  pending.resolve();
}

async function runStart(message: Extract<CaseImportWorkerRequest, { type: "start" }>): Promise<void> {
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
    postError(activeProtocolError ?? reason);
  } finally {
    if (activeController === controller) {
      activeController = null;
      activeProtocolError = null;
    }
  }
}

async function runReadHeaders(message: Extract<CaseImportWorkerRequest, { type: "read_headers" }>): Promise<void> {
  const controller = new AbortController();
  activeController = controller;
  activeProtocolError = null;
  try {
    const source = createBlobCsvSource(message.blob);
    const headers = await readCaseImportHeadersFromSource(source, { signal: controller.signal });
    workerScope.postMessage({ type: "headers", headers });
  } catch (reason) {
    postError(activeProtocolError ?? reason);
  } finally {
    if (activeController === controller) {
      activeController = null;
      activeProtocolError = null;
    }
  }
}

workerScope.onmessage = (event) => {
  try {
    const message = event.data as unknown;
    if (!message || typeof message !== "object") {
      rejectProtocolViolation(workerProtocolError(
        "CSV Worker 收到了结构无效的消息。",
        "WORKER_MESSAGE_INVALID"
      ));
      return;
    }
    const type = (message as { type?: unknown }).type;
    if (type === "cancel") {
      activeController?.abort();
      return;
    }
    if (type === "batch_ack") {
      const batchNumber = (message as { batchNumber?: unknown }).batchNumber;
      if (!Number.isInteger(batchNumber) || (batchNumber as number) < 1) {
        rejectProtocolViolation(workerProtocolError(
          "CSV Worker 收到了无效的批次确认编号。",
          "WORKER_BATCH_ACK_INVALID"
        ));
        return;
      }
      acknowledgeBatch(batchNumber as number);
      return;
    }
    if (type !== "read_headers" && type !== "start") {
      rejectProtocolViolation(workerProtocolError(
        "CSV Worker 收到了未知任务类型。",
        "WORKER_OPERATION_INVALID"
      ));
      return;
    }
    if (activeController !== null) {
      rejectProtocolViolation(workerProtocolError(
        "CSV Worker 一次只能处理一个任务。",
        "WORKER_JOB_ACTIVE"
      ));
      return;
    }
    if (type === "read_headers") {
      void runReadHeaders(message as Extract<CaseImportWorkerRequest, { type: "read_headers" }>);
      return;
    }
    void runStart(message as Extract<CaseImportWorkerRequest, { type: "start" }>);
  } catch (reason) {
    rejectProtocolViolation(reason instanceof Error
      ? reason
      : workerProtocolError("CSV Worker 消息处理失败。", "WORKER_MESSAGE_INVALID"));
  }
};

export {};
