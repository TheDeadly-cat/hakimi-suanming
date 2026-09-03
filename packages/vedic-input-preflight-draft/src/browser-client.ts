/// <reference lib="webworker" />

import {
  createVedicInputPreflightRequest,
  requireVedicInputPreflightResponse,
  type VedicInputPreflightResult
} from "./protocol.ts";

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_TIMEOUT_MS = 60_000;

export type VedicInputPreflightClientOptions = Readonly<{
  requestIdFactory?: () => string;
  timeoutMs?: number;
  workerFactory?: (requestId: string) => Worker;
}>;

export class VedicInputPreflightClientError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "VedicInputPreflightClientError";
    this.code = code;
  }
}

function fail(code: string, message: string, cause?: unknown): VedicInputPreflightClientError {
  return new VedicInputPreflightClientError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function randomRequestId(): string {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi || typeof cryptoApi.getRandomValues !== "function") {
    throw fail("REQUEST_ID_UNAVAILABLE", "当前浏览器无法生成 Worker requestId。");
  }
  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function defaultWorkerFactory(requestId: string): Worker {
  return new Worker(new URL("./browser-worker.ts", import.meta.url), {
    name: `hakimi-vedic-input-preflight-${requestId}`,
    type: "module"
  });
}

/** Run one fixed four-probe request in one newly-created module Worker. */
export function runVedicInputPreflightInFreshWorker(
  options: VedicInputPreflightClientOptions = {}
): Promise<VedicInputPreflightResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > MAX_TIMEOUT_MS) {
    return Promise.reject(fail("TIMEOUT_INVALID", "Worker timeout 必须是 1 至 60000 毫秒整数。"));
  }

  let requestId: string;
  let worker: Worker;
  try {
    requestId = (options.requestIdFactory ?? randomRequestId)();
    const request = createVedicInputPreflightRequest(requestId);
    worker = (options.workerFactory ?? defaultWorkerFactory)(requestId);
    if (!worker || typeof worker.postMessage !== "function" || typeof worker.terminate !== "function"
      || typeof worker.addEventListener !== "function" || typeof worker.removeEventListener !== "function") {
      return Promise.reject(fail("WORKER_FACTORY_INVALID", "Worker factory 没有返回可用的一次性 Worker。"));
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      let timer: ReturnType<typeof globalThis.setTimeout> | undefined;

      const cleanup = (): void => {
        if (timer !== undefined) globalThis.clearTimeout(timer);
        worker.removeEventListener("message", onMessage);
        worker.removeEventListener("messageerror", onMessageError);
        worker.removeEventListener("error", onError);
        worker.terminate();
      };

      const finish = (error: Error | null, result?: VedicInputPreflightResult): void => {
        if (settled) return;
        settled = true;
        cleanup();
        if (error) reject(error);
        else if (result) resolve(result);
        else reject(fail("WORKER_RESULT_MISSING", "一次性 Worker 没有返回固定预检结果。"));
      };

      const onMessage = (event: MessageEvent<unknown>): void => {
        if (settled) return;
        try {
          const result = requireVedicInputPreflightResponse(event.data, requestId);
          finish(null, result);
        } catch (cause) {
          finish(fail(
            "WORKER_RESPONSE_INVALID",
            "一次性 Worker 响应未通过精确协议、请求绑定或全红边界核验。",
            cause
          ));
        }
      };

      const onMessageError = (): void => {
        finish(fail("WORKER_MESSAGE_ERROR", "一次性 Worker 返回了无法反序列化的消息。"));
      };

      const onError = (event: ErrorEvent): void => {
        event.preventDefault();
        finish(fail("WORKER_CRASHED", "一次性 Worker 运行失败。"));
      };

      worker.addEventListener("message", onMessage);
      worker.addEventListener("messageerror", onMessageError, { once: true });
      worker.addEventListener("error", onError, { once: true });
      timer = globalThis.setTimeout(
        () => finish(fail("WORKER_TIMEOUT", `一次性 Worker 超过 ${timeoutMs} 毫秒。`)),
        timeoutMs
      );

      try {
        worker.postMessage(request);
      } catch (cause) {
        finish(fail("WORKER_POST_FAILED", "一次性 Worker 请求发送失败。", cause));
      }
    });
  } catch (cause) {
    return Promise.reject(
      cause instanceof VedicInputPreflightClientError
        ? cause
        : fail("WORKER_START_FAILED", "一次性 Worker 启动失败。", cause)
    );
  }
}
