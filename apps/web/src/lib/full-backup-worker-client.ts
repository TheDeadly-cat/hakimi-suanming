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
import { safeVisibleText } from "./visible-text";
import { disposeWorkerSafely } from "./worker-lifecycle";

type WorkerLike = Pick<Worker, "postMessage" | "terminate" | "onmessage" | "onerror" | "onmessageerror">;
const MAX_BACKUP_WORKER_ERROR_TEXT_CODE_POINTS = 512;
const MAX_BACKUP_WORKER_JOB_ID_CODE_POINTS = 128;
const CANONICAL_SHA256_DIGEST = /^[0-9a-f]{64}$/u;
const CANONICAL_WORKER_JOB_ID = /^[A-Za-z0-9._:-]+$/u;

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
  let jobId: unknown;
  try {
    jobId = runtime.createJobId?.() ?? globalThis.crypto?.randomUUID?.();
  } catch {
    throw new FullBackupWorkerProtocolError(
      "BACKUP_WORKER_JOB_ID_UNAVAILABLE",
      "无法生成备份 Worker 任务标识。"
    );
  }
  if (
    typeof jobId !== "string"
    || jobId.length === 0
    || jobId !== jobId.trim()
    || Array.from(jobId).length > MAX_BACKUP_WORKER_JOB_ID_CODE_POINTS
    || !CANONICAL_WORKER_JOB_ID.test(jobId)
  ) {
    throw new FullBackupWorkerProtocolError(
      "BACKUP_WORKER_JOB_ID_INVALID",
      "备份 Worker 任务标识不符合安全格式。"
    );
  }
  return jobId;
}

function restoreWorkerError(serialized: FullBackupWorkerSerializedError): Error {
  const message = safeVisibleText(
    serialized.message,
    "备份 Worker 返回了未说明的错误。",
    MAX_BACKUP_WORKER_ERROR_TEXT_CODE_POINTS
  );
  const code = safeVisibleText(serialized.code, "", 128);
  if (serialized.category === "cancelled" || code === "BACKUP_WORKER_CANCELLED") {
    return new FullBackupWorkerCancelledError();
  }
  if (serialized.category === "archive" && code) {
    return new FullBackupArchiveError(
      code as FullBackupArchiveErrorCode,
      message
    );
  }
  if (serialized.category === "backup" && code) {
    return new FullBackupError(code as FullBackupErrorCode, message);
  }
  if (serialized.category === "protocol") {
    return new FullBackupWorkerProtocolError(
      code || "BACKUP_WORKER_PROTOCOL_ERROR",
      message
    );
  }
  const error = new Error(message);
  error.name = safeVisibleText(serialized.name, "Error", 128) || "Error";
  if (code) (error as Error & { code?: string }).code = code;
  return error;
}

type SuccessfulWorkerResponse = Exclude<FullBackupWorkerResponse, { type: "error" }>;

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function hasCanonicalDigest(value: unknown): value is string {
  return typeof value === "string" && CANONICAL_SHA256_DIGEST.test(value);
}

function validateSuccessfulWorkerResponse(
  message: SuccessfulWorkerResponse,
  request: FullBackupWorkerRequest
): string | null {
  switch (message.type) {
    case "artifact_ready":
      if (
        (message.output !== "zip" && message.output !== "json")
        || typeof Blob === "undefined"
        || !(message.blob instanceof Blob)
        || !isPositiveSafeInteger(message.outputByteLength)
        || message.outputByteLength !== message.blob.size
        || !isPositiveSafeInteger(message.canonicalJsonByteLength)
        || !hasCanonicalDigest(message.payloadDigest)
      ) {
        return "备份 Worker 返回了不一致的成品文件元数据。";
      }
      if (request.type === "create_from_snapshot" && message.output !== request.output) {
        return "备份 Worker 返回的成品格式与请求不一致。";
      }
      return null;
    case "preparation_ready":
      if (
        !isRecord(message.preparation)
        || (message.sourceContainer !== "zip" && message.sourceContainer !== "json")
        || !isPositiveSafeInteger(message.sourceByteLength)
        || !isPositiveSafeInteger(message.decodedJsonByteLength)
        || !isPositiveSafeInteger(message.canonicalJsonByteLength)
        || !hasCanonicalDigest(message.payloadDigest)
      ) {
        return "备份 Worker 返回了无效的导入预检元数据。";
      }
      if (request.type !== "prepare_import" || message.sourceByteLength !== request.blob.size) {
        return "备份 Worker 返回的来源字节数与导入文件不一致。";
      }
      return null;
    case "verified_ready":
      return isRecord(message.verified)
        ? null
        : "备份 Worker 返回了无效的替换验证结果。";
    case "snapshot_verified":
      return hasCanonicalDigest(message.payloadDigest)
        && isPositiveSafeInteger(message.canonicalJsonByteLength)
        ? null
        : "备份 Worker 返回了无效的快照验证元数据。";
  }
}

function guardWorkerResponse(
  fail: (reason: unknown) => void,
  handle: (event: MessageEvent<FullBackupWorkerResponse>) => void
): (event: MessageEvent<FullBackupWorkerResponse>) => void {
  return (event) => {
    try {
      handle(event);
    } catch {
      fail(new FullBackupWorkerProtocolError(
        "BACKUP_WORKER_RESPONSE_INVALID",
        "备份 Worker 返回了结构无效的响应。"
      ));
    }
  };
}

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

    worker.onmessage = guardWorkerResponse(fail, (event: MessageEvent<FullBackupWorkerResponse>) => {
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
          `备份 Worker 返回了意外结果：${safeVisibleText(message.type, "未知", 64)}。`
        ));
        return;
      }
      const invalidResult = validateSuccessfulWorkerResponse(message, request);
      if (invalidResult) {
        fail(new FullBackupWorkerProtocolError(
          "BACKUP_WORKER_RESULT_INVALID",
          invalidResult
        ));
        return;
      }
      settled = true;
      cleanup();
      resolve(message as Extract<SuccessfulWorkerResponse, { type: T }>);
    });
    worker.onerror = (event: ErrorEvent) => {
      event.preventDefault?.();
      fail(new FullBackupWorkerProtocolError(
        "BACKUP_WORKER_CRASH",
        safeVisibleText(
          event.message,
          "备份 Worker 运行失败。",
          MAX_BACKUP_WORKER_ERROR_TEXT_CODE_POINTS
        )
      ));
    };
    worker.onmessageerror = () => fail(new FullBackupWorkerProtocolError(
      "BACKUP_WORKER_MESSAGE_INVALID",
      "备份 Worker 返回了无法解析的数据。"
    ));
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) {
      abort();
      return;
    }
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

export async function createFullBackupArtifactOffMainThread(
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

export async function archiveFullBackupEnvelopeOffMainThread(
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

export async function prepareFullBackupImportOffMainThread(
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

export async function inspectFullBackupSnapshotOffMainThread(
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

export async function verifyPreparedFullBackupOffMainThread(
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
