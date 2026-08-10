import {
  decodeKnowledgeBlob,
  type KnowledgeImportWorkerRequest,
  type KnowledgeImportWorkerResponse
} from "../lib/knowledge-import-worker-protocol";

type WorkerScope = {
  onmessage: ((event: MessageEvent<KnowledgeImportWorkerRequest>) => void) | null;
  postMessage: (message: KnowledgeImportWorkerResponse) => void;
};

const workerScope = globalThis as unknown as WorkerScope;
let activeController: AbortController | null = null;

function serializeError(reason: unknown): Extract<KnowledgeImportWorkerResponse, { type: "error" }>["error"] {
  if (reason instanceof Error) {
    const code = "code" in reason && typeof reason.code === "string" ? reason.code : undefined;
    return { name: reason.name, message: reason.message, ...(code ? { code } : {}) };
  }
  return { name: "Error", message: "资料解码失败。" };
}

async function runDecode(blob: Blob): Promise<void> {
  activeController?.abort();
  const controller = new AbortController();
  activeController = controller;
  try {
    const content = await decodeKnowledgeBlob(blob, controller.signal);
    workerScope.postMessage({ type: "decoded", content });
  } catch (reason) {
    workerScope.postMessage({ type: "error", error: serializeError(reason) });
  } finally {
    if (activeController === controller) activeController = null;
  }
}

workerScope.onmessage = (event) => {
  if (event.data.type === "cancel") {
    activeController?.abort();
    return;
  }
  void runDecode(event.data.blob);
};

export {};
