import {
  decodeKnowledgeBlob,
  type KnowledgeImportWorkerRequest,
  type KnowledgeImportWorkerResponse
} from "../lib/knowledge-import-worker-protocol";
import { safeVisibleText } from "../lib/visible-text";

type WorkerScope = {
  onmessage: ((event: MessageEvent<KnowledgeImportWorkerRequest>) => void) | null;
  postMessage: (message: KnowledgeImportWorkerResponse) => void;
};

const workerScope = globalThis as unknown as WorkerScope;
let activeController: AbortController | null = null;
let activeProtocolError: Error | null = null;
const MAX_WORKER_ERROR_TEXT_CODE_POINTS = 512;

function serializeError(reason: unknown): Extract<KnowledgeImportWorkerResponse, { type: "error" }>["error"] {
  try {
    if (reason instanceof Error) {
      const code = "code" in reason && typeof reason.code === "string"
        ? safeVisibleText(reason.code, "", 128)
        : "";
      return {
        name: safeVisibleText(reason.name, "Error", 128) || "Error",
        message: safeVisibleText(
          reason.message,
          "资料解码失败。",
          MAX_WORKER_ERROR_TEXT_CODE_POINTS
        ),
        ...(code ? { code } : {})
      };
    }
  } catch {
    // Malformed error objects degrade to a stable runtime error.
  }
  return { name: "Error", message: "资料解码失败。" };
}

function protocolError(message: string, code: string): Error {
  const error = new Error(message);
  error.name = "KnowledgeImportWorkerProtocolError";
  (error as Error & { code: string }).code = code;
  return error;
}

function postError(reason: unknown): void {
  try {
    workerScope.postMessage({ type: "error", error: serializeError(reason) });
  } catch {
    // No secondary error can be reported when the worker channel is broken.
  }
}

function rejectProtocolViolation(error: Error): void {
  activeProtocolError = error;
  if (activeController) {
    activeController.abort();
    return;
  }
  postError(error);
}

async function runDecode(blob: Blob): Promise<void> {
  const controller = new AbortController();
  activeController = controller;
  activeProtocolError = null;
  try {
    const content = await decodeKnowledgeBlob(blob, controller.signal);
    workerScope.postMessage({ type: "decoded", content });
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
      rejectProtocolViolation(protocolError(
        "资料解码 Worker 收到了结构无效的消息。",
        "KNOWLEDGE_WORKER_MESSAGE_INVALID"
      ));
      return;
    }
    const type = (message as { type?: unknown }).type;
    if (type === "cancel") {
      activeController?.abort();
      return;
    }
    if (type !== "decode") {
      rejectProtocolViolation(protocolError(
        "资料解码 Worker 收到了未知任务类型。",
        "KNOWLEDGE_WORKER_OPERATION_INVALID"
      ));
      return;
    }
    if (activeController !== null) {
      rejectProtocolViolation(protocolError(
        "资料解码 Worker 一次只能处理一个任务。",
        "KNOWLEDGE_WORKER_JOB_ACTIVE"
      ));
      return;
    }
    const blob = (message as { blob?: unknown }).blob;
    if (typeof Blob === "undefined" || !(blob instanceof Blob)) {
      rejectProtocolViolation(protocolError(
        "资料解码 Worker 收到了无效的文件对象。",
        "KNOWLEDGE_WORKER_BLOB_INVALID"
      ));
      return;
    }
    void runDecode(blob);
  } catch (reason) {
    rejectProtocolViolation(reason instanceof Error
      ? reason
      : protocolError("资料解码 Worker 消息处理失败。", "KNOWLEDGE_WORKER_MESSAGE_INVALID"));
  }
};

export {};
