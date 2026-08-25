import {
  decodeKnowledgeBlob,
  KnowledgeImportDecodeError,
  MAX_KNOWLEDGE_IMPORT_BYTES,
  type KnowledgeImportWorkerRequest,
  type KnowledgeImportWorkerResponse
} from "./knowledge-import-worker-protocol";
import { safeVisibleText } from "./visible-text";
import { disposeWorkerSafely } from "./worker-lifecycle";

type WorkerLike = Pick<Worker, "postMessage" | "terminate" | "onmessage" | "onerror" | "onmessageerror">;
const MAX_KNOWLEDGE_WORKER_ERROR_CODE_POINTS = 512;

export type KnowledgeImportWorkerRuntime = {
  createWorker?: () => WorkerLike;
  forceWorker?: boolean;
};

function createBrowserWorker(): Worker {
  return new Worker(new URL("../workers/knowledge-import.worker.ts", import.meta.url), {
    type: "module",
    name: "hakimi-knowledge-import"
  });
}

function canUseWorker(runtime: KnowledgeImportWorkerRuntime): boolean {
  return runtime.forceWorker === true || typeof globalThis.Worker === "function";
}

function restoreError(error: Extract<KnowledgeImportWorkerResponse, { type: "error" }>["error"]): Error {
  const code = safeVisibleText(error.code, "", 128);
  const message = safeVisibleText(
    error.message,
    "资料解码 Worker 返回了未说明的错误。",
    MAX_KNOWLEDGE_WORKER_ERROR_CODE_POINTS
  );
  if (code === "FILE_TOO_LARGE" || code === "INVALID_UTF8" || code === "IMPORT_CANCELLED") {
    return new KnowledgeImportDecodeError(code, message);
  }
  const restored = new Error(message);
  restored.name = safeVisibleText(error.name, "Error", 128) || "Error";
  return restored;
}

export async function decodeKnowledgeFileOffMainThread(
  blob: Blob,
  signal?: AbortSignal,
  runtime: KnowledgeImportWorkerRuntime = {}
): Promise<string> {
  if (
    typeof Blob === "undefined"
    || !(blob instanceof Blob)
    || !Number.isSafeInteger(blob.size)
    || blob.size < 0
  ) {
    throw new TypeError("资料来源不是可读取的 Blob 文件。");
  }
  if (signal?.aborted) throw new KnowledgeImportDecodeError("IMPORT_CANCELLED", "资料读取已取消。");
  if (blob.size > MAX_KNOWLEDGE_IMPORT_BYTES) {
    throw new KnowledgeImportDecodeError("FILE_TOO_LARGE", "单份资料不能超过 2 MiB。");
  }
  if (!canUseWorker(runtime)) return decodeKnowledgeBlob(blob, signal);
  const worker = runtime.createWorker?.() ?? createBrowserWorker();
  let settled = false;

  return new Promise<string>((resolve, reject) => {
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
        worker.postMessage({ type: "cancel" } satisfies KnowledgeImportWorkerRequest);
      } catch {
        // terminate() below remains the authoritative cancellation path.
      }
      fail(new KnowledgeImportDecodeError("IMPORT_CANCELLED", "资料读取已取消。"));
    };
    worker.onmessage = (event: MessageEvent<KnowledgeImportWorkerResponse>) => {
      if (settled) return;
      try {
        if (event.data.type === "error") {
          fail(restoreError(event.data.error));
          return;
        }
        if (event.data.type !== "decoded" || typeof event.data.content !== "string") {
          fail(new Error("资料解码 Worker 返回了结构无效的数据。"));
          return;
        }
        const contentByteLength = new TextEncoder().encode(event.data.content).byteLength;
        if (
          event.data.content.length > MAX_KNOWLEDGE_IMPORT_BYTES
          || contentByteLength > MAX_KNOWLEDGE_IMPORT_BYTES
          || contentByteLength > blob.size
        ) {
          fail(new Error("资料解码 Worker 返回了超过来源字节边界的数据。"));
          return;
        }
        settled = true;
        cleanup();
        resolve(event.data.content);
      } catch {
        fail(new Error("资料解码 Worker 返回了结构无效的数据。"));
      }
    };
    worker.onerror = (event: ErrorEvent) => {
      event.preventDefault?.();
      fail(new Error(safeVisibleText(
        event.message,
        "资料解码 Worker 运行失败。",
        MAX_KNOWLEDGE_WORKER_ERROR_CODE_POINTS
      )));
    };
    worker.onmessageerror = () => fail(new Error("资料解码 Worker 返回了无法解析的数据。"));
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) {
      abort();
      return;
    }
    try {
      worker.postMessage({ type: "decode", blob } satisfies KnowledgeImportWorkerRequest);
    } catch (reason) {
      fail(reason);
    }
  });
}
