import {
  FullBackupArchiveError,
  FullBackupError,
  type CreateFullBackupOptions,
  type FullBackupArchiveErrorCode,
  type FullBackupErrorCode,
  type FullBackupImportPreparation
} from "@hakimi/backup";
import type { FullBackupEnvelope, FullBackupPayload } from "@hakimi/contracts";
import {
  FULL_BACKUP_WORKER_PROTOCOL,
  FULL_BACKUP_WORKER_PROTOCOL_VERSION,
  type FullBackupArtifactWorkerResult,
  type FullBackupPreparedWorkerResult,
  type FullBackupSnapshotWorkerResult,
  type FullBackupVerifiedWorkerResult,
  type FullBackupWorkerRequest,
  type FullBackupWorkerResponse,
  type FullBackupWorkerSerializedError
} from "./full-backup-worker-protocol";

type WorkerLike = Pick<Worker, "postMessage" | "terminate" | "onmessage" | "onerror" | "onmessageerror">;

export type FullBackupWorkerRuntime = {
  createWorker?: () => WorkerLike;
  /** Tests may force the Worker branch without installing a browser global. */
  forceWorker?: boolean;
  createJobId?: () => string;
};

export class FullBackupWorkerUnavailableError extends Error {
  readonly code = "BACKUP_WORKER_UNAVAILABLE" as const;

  constructor() {
    super("当前浏览器无法启动安全的备份 Worker；为避免在主线程处理大文件，本次操作已停止。");
    this.name = "FullBackupWorkerUnavailableError";
  }
}

export class FullBackupWorkerCancelledError extends Error {
  readonly code = "BACKUP_WORKER_CANCELLED" as const;

  constructor() {
    super("备份处理已取消。");
    this.name = "FullBackupWorkerCancelledError";
  }
}

export class FullBackupWorkerProtocolError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "FullBackupWorkerProtocolError";
  }
}

function createBrowserWorker(): Worker {
  return new Worker(new URL("../workers/full-backup.worker.ts", import.meta.url), {
    type: "module",
    name: "hakimi-full-backup-v1"
  });
}

function canUseBrowserWorker(runtime: FullBackupWorkerRuntime): boolean {
  return runtime.forceWorker === true || typeof globalThis.Worker === "function";
}

function nextJobId(runtime: FullBackupWorkerRuntime): string {
  return runtime.createJobId?.() ?? crypto.randomUUID();
}

function restoreWorkerError(serialized: FullBackupWorkerSerializedError): Error {
  if (serialized.category === "cancelled" || serialized.code === "BACKUP_WORKER_CANCELLED") {
    return new FullBackupWorkerCancelledError();
  }
  if (serialized.category === "archive" && serialized.code) {
    return new FullBackupArchiveError(
      serialized.code as FullBackupArchiveErrorCode,
      serialized.message
    );
  }
  if (serialized.category === "backup" && serialized.code) {
    return new FullBackupError(serialized.code as FullBackupErrorCode, serialized.message);
  }
  if (serialized.category === "protocol") {
    return new FullBackupWorkerProtocolError(
      serialized.code ?? "BACKUP_WORKER_PROTOCOL_ERROR",
      serialized.message
    );
  }
  const error = new Error(serialized.message);
  error.name = serialized.name;
  if (serialized.code) (error as Error & { code?: string }).code = serialized.code;
  return error;
}

type SuccessfulWorkerResponse = Exclude<FullBackupWorkerResponse, { type: "error" }>;

async function runWorkerJob<T extends SuccessfulWorkerResponse["type"]>(
  request: FullBackupWorkerRequest,
  expectedType: T,
  signal: AbortSignal | undefined,
  runtime: FullBackupWorkerRuntime
): Promise<Extract<SuccessfulWorkerResponse, { type: T }>> {
  if (!canUseBrowserWorker(runtime)) throw new FullBackupWorkerUnavailableError();
  if (signal?.aborted) throw new FullBackupWorkerCancelledError();
  const worker = runtime.createWorker?.() ?? createBrowserWorker();
  let settled = false;

  return new Promise((resolve, reject) => {
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
        worker.postMessage({
          protocol: FULL_BACKUP_WORKER_PROTOCOL,
          version: FULL_BACKUP_WORKER_PROTOCOL_VERSION,
          jobId: request.jobId,
          type: "cancel"
        } satisfies FullBackupWorkerRequest);
      } catch {
        // terminate() below is the authoritative cancellation path for sync deflate/inflate.
      }
      fail(new FullBackupWorkerCancelledError());
    };

    worker.onmessage = (event: MessageEvent<FullBackupWorkerResponse>) => {
      if (settled) return;
      const message = event.data;
      if (
        message?.protocol !== FULL_BACKUP_WORKER_PROTOCOL ||
        message?.version !== FULL_BACKUP_WORKER_PROTOCOL_VERSION
      ) {
        fail(new FullBackupWorkerProtocolError(
          "BACKUP_WORKER_RESPONSE_VERSION_INVALID",
          "备份 Worker 返回了不兼容的协议版本。"
        ));
        return;
      }
      if (message.jobId !== request.jobId) {
        fail(new FullBackupWorkerProtocolError(
          "BACKUP_WORKER_RESPONSE_JOB_INVALID",
          "备份 Worker 返回了不属于当前任务的结果。"
        ));
        return;
      }
      if (message.type === "error") {
        fail(restoreWorkerError(message.error));
        return;
      }
      if (message.type !== expectedType) {
        fail(new FullBackupWorkerProtocolError(
          "BACKUP_WORKER_RESPONSE_TYPE_INVALID",
          `备份 Worker 返回了意外结果：${message.type}。`
        ));
        return;
      }
      settled = true;
      cleanup();
      resolve(message as Extract<SuccessfulWorkerResponse, { type: T }>);
    };
    worker.onerror = (event: ErrorEvent) => {
      event.preventDefault?.();
      fail(new FullBackupWorkerProtocolError(
        "BACKUP_WORKER_CRASH",
        event.message || "备份 Worker 运行失败。"
      ));
    };
    worker.onmessageerror = () => fail(new FullBackupWorkerProtocolError(
      "BACKUP_WORKER_MESSAGE_INVALID",
      "备份 Worker 返回了无法解析的数据。"
    ));
    signal?.addEventListener("abort", abort, { once: true });
    try {
      worker.postMessage(request);
    } catch (reason) {
      fail(reason);
    }
  });
}

function requestBase(runtime: FullBackupWorkerRuntime) {
  return {
    protocol: FULL_BACKUP_WORKER_PROTOCOL,
    version: FULL_BACKUP_WORKER_PROTOCOL_VERSION,
    jobId: nextJobId(runtime)
  } as const;
}

export function createFullBackupArtifactOffMainThread(
  snapshot: FullBackupPayload,
  options: CreateFullBackupOptions,
  output: "zip" | "json",
  signal?: AbortSignal,
  runtime: FullBackupWorkerRuntime = {}
): Promise<FullBackupArtifactWorkerResult> {
  return runWorkerJob({
    ...requestBase(runtime),
    type: "create_from_snapshot",
    output,
    snapshot,
    options
  }, "artifact_ready", signal, runtime);
}

export function archiveFullBackupEnvelopeOffMainThread(
  envelope: FullBackupEnvelope,
  signal?: AbortSignal,
  runtime: FullBackupWorkerRuntime = {}
): Promise<FullBackupArtifactWorkerResult> {
  return runWorkerJob({
    ...requestBase(runtime),
    type: "archive_envelope",
    envelope
  }, "artifact_ready", signal, runtime);
}

export function prepareFullBackupImportOffMainThread(
  blob: Blob,
  currentSnapshot: FullBackupPayload,
  options: CreateFullBackupOptions,
  signal?: AbortSignal,
  runtime: FullBackupWorkerRuntime = {}
): Promise<FullBackupPreparedWorkerResult> {
  return runWorkerJob({
    ...requestBase(runtime),
    type: "prepare_import",
    blob,
    currentSnapshot,
    options
  }, "preparation_ready", signal, runtime);
}

export function inspectFullBackupSnapshotOffMainThread(
  snapshot: FullBackupPayload,
  options: CreateFullBackupOptions,
  signal?: AbortSignal,
  runtime: FullBackupWorkerRuntime = {}
): Promise<FullBackupSnapshotWorkerResult> {
  return runWorkerJob({
    ...requestBase(runtime),
    type: "inspect_snapshot",
    snapshot,
    options
  }, "snapshot_verified", signal, runtime);
}

export function verifyPreparedFullBackupOffMainThread(
  preparation: FullBackupImportPreparation,
  signal?: AbortSignal,
  runtime: FullBackupWorkerRuntime = {}
): Promise<FullBackupVerifiedWorkerResult> {
  return runWorkerJob({
    ...requestBase(runtime),
    type: "verify_prepared",
    preparation
  }, "verified_ready", signal, runtime);
}
