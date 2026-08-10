import {
  decodeKnowledgeBlob,
  KnowledgeImportDecodeError,
  type KnowledgeImportWorkerRequest,
  type KnowledgeImportWorkerResponse
} from "./knowledge-import-worker-protocol";

type WorkerLike = Pick<Worker, "postMessage" | "terminate" | "onmessage" | "onerror" | "onmessageerror">;

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
  if (error.code === "FILE_TOO_LARGE" || error.code === "INVALID_UTF8" || error.code === "IMPORT_CANCELLED") {
    return new KnowledgeImportDecodeError(error.code, error.message);
  }
  const restored = new Error(error.message);
  restored.name = error.name;
  return restored;
}

export async function decodeKnowledgeFileOffMainThread(
  blob: Blob,
  signal?: AbortSignal,
  runtime: KnowledgeImportWorkerRuntime = {}
): Promise<string> {
  if (!canUseWorker(runtime)) return decodeKnowledgeBlob(blob, signal);
  if (signal?.aborted) throw new KnowledgeImportDecodeError("IMPORT_CANCELLED", "资料读取已取消。");
  const worker = runtime.createWorker?.() ?? createBrowserWorker();
  let settled = false;

  return new Promise<string>((resolve, reject) => {
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
        worker.postMessage({ type: "cancel" } satisfies KnowledgeImportWorkerRequest);
      } catch {
        // terminate() below remains the authoritative cancellation path.
      }
      fail(new KnowledgeImportDecodeError("IMPORT_CANCELLED", "资料读取已取消。"));
    };
    worker.onmessage = (event: MessageEvent<KnowledgeImportWorkerResponse>) => {
      if (event.data.type === "error") {
        fail(restoreError(event.data.error));
        return;
      }
      settled = true;
      cleanup();
      resolve(event.data.content);
    };
    worker.onerror = (event: ErrorEvent) => {
      event.preventDefault?.();
      fail(new Error(event.message || "资料解码 Worker 运行失败。"));
    };
    worker.onmessageerror = () => fail(new Error("资料解码 Worker 返回了无法解析的数据。"));
    signal?.addEventListener("abort", abort, { once: true });
    try {
      worker.postMessage({ type: "decode", blob } satisfies KnowledgeImportWorkerRequest);
    } catch (reason) {
      fail(reason);
    }
  });
}
