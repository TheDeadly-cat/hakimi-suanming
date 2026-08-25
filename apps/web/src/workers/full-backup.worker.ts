import {
  FullBackupArchiveError,
  FullBackupError,
  createFullBackupArchiveFromJson,
  createFullBackupFromSnapshot,
  decodeFullBackupFile,
  preflightFullBackup,
  serializeFullBackup,
  verifyPreparedFullBackup
} from "@hakimi/backup";
import {
  FULL_BACKUP_WORKER_PROTOCOL,
  FULL_BACKUP_WORKER_PROTOCOL_VERSION,
  type FullBackupWorkerOperation,
  type FullBackupWorkerRequest,
  type FullBackupWorkerResponse,
  type FullBackupWorkerSerializedError
} from "../lib/full-backup-worker-protocol";
import { safeVisibleText } from "../lib/visible-text";

type WorkerScope = {
  onmessage: ((event: MessageEvent<FullBackupWorkerRequest>) => void) | null;
  postMessage: (message: FullBackupWorkerResponse) => void;
};

class FullBackupWorkerCancelledError extends Error {
  readonly code = "BACKUP_WORKER_CANCELLED" as const;

  constructor() {
    super("备份处理已取消。");
    this.name = "FullBackupWorkerCancelledError";
  }
}

const workerScope = globalThis as unknown as WorkerScope;
let activeJobId: string | null = null;
let cancelledJobId: string | null = null;
const MAX_WORKER_DIAGNOSTIC_CODE_POINTS = 512;
const WORKER_OPERATION_TYPES = new Set<string>([
  "create_from_snapshot",
  "archive_envelope",
  "inspect_snapshot",
  "prepare_import",
  "verify_prepared"
]);

function responseBase(jobId: string) {
  return {
    protocol: FULL_BACKUP_WORKER_PROTOCOL,
    version: FULL_BACKUP_WORKER_PROTOCOL_VERSION,
    jobId
  } as const;
}

function operationOf(request: FullBackupWorkerRequest): FullBackupWorkerOperation | "protocol" {
  return request.type === "cancel" ? "protocol" : request.type;
}

function serializeError(reason: unknown): FullBackupWorkerSerializedError {
  try {
    if (reason instanceof FullBackupArchiveError) {
      return {
        name: safeVisibleText(reason.name, "FullBackupArchiveError", 128),
        message: safeVisibleText(reason.message, "备份归档失败。", MAX_WORKER_DIAGNOSTIC_CODE_POINTS),
        code: safeVisibleText(reason.code, "ARCHIVE_ERROR", 128),
        category: "archive"
      };
    }
    if (reason instanceof FullBackupError) {
      return {
        name: safeVisibleText(reason.name, "FullBackupError", 128),
        message: safeVisibleText(reason.message, "备份处理失败。", MAX_WORKER_DIAGNOSTIC_CODE_POINTS),
        code: safeVisibleText(reason.code, "BACKUP_ERROR", 128),
        category: "backup"
      };
    }
    if (reason instanceof FullBackupWorkerCancelledError) {
      return {
        name: reason.name,
        message: reason.message,
        code: reason.code,
        category: "cancelled"
      };
    }
    if (reason instanceof Error) {
      const code = "code" in reason && typeof reason.code === "string"
        ? safeVisibleText(reason.code, "", 128)
        : "";
      const name = safeVisibleText(reason.name, "Error", 128) || "Error";
      return {
        name,
        message: safeVisibleText(
          reason.message,
          "备份 Worker 处理失败。",
          MAX_WORKER_DIAGNOSTIC_CODE_POINTS
        ),
        ...(code ? { code } : {}),
        category: name === "FullBackupWorkerProtocolError" ? "protocol" : "runtime"
      };
    }
  } catch {
    // Hostile or malformed error objects degrade to a stable runtime error.
  }
  return {
    name: "Error",
    message: "备份 Worker 处理失败。",
    category: "runtime"
  };
}

function postErrorResponse(
  jobId: string,
  operation: FullBackupWorkerOperation | "protocol",
  reason: unknown
): void {
  try {
    workerScope.postMessage({
      ...responseBase(jobId),
      type: "error",
      operation,
      error: serializeError(reason)
    });
  } catch {
    // No secondary error can be reported if the worker channel itself is broken.
  }
}

function isValidJobId(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= 128
    && value === safeVisibleText(value, "", 128);
}

function isOperationRequest(
  value: unknown
): value is Exclude<FullBackupWorkerRequest, { type: "cancel" }> {
  return value !== null
    && typeof value === "object"
    && WORKER_OPERATION_TYPES.has((value as { type?: unknown }).type as string);
}

function protocolError(message: string, code: string): Error {
  const error = new Error(message);
  error.name = "FullBackupWorkerProtocolError";
  (error as Error & { code: string }).code = code;
  return error;
}

function assertNotCancelled(jobId: string): void {
  if (cancelledJobId === jobId) throw new FullBackupWorkerCancelledError();
}

async function runJob(request: Exclude<FullBackupWorkerRequest, { type: "cancel" }>): Promise<void> {
  const { jobId } = request;
  if (activeJobId !== null) {
    postErrorResponse(
      jobId,
      operationOf(request),
      protocolError("备份 Worker 一次只能处理一个任务。", "BACKUP_WORKER_JOB_ACTIVE")
    );
    return;
  }
  activeJobId = jobId;
  cancelledJobId = null;
  try {
    if (request.type === "create_from_snapshot") {
      const envelope = await createFullBackupFromSnapshot(request.snapshot, request.options);
      assertNotCancelled(jobId);
      const json = serializeFullBackup(envelope);
      const canonicalJsonByteLength = new TextEncoder().encode(json).byteLength;
      if (request.output === "json") {
        const blob = new Blob([json], { type: "application/json;charset=utf-8" });
        workerScope.postMessage({
          ...responseBase(jobId),
          type: "artifact_ready",
          output: "json",
          blob,
          outputByteLength: blob.size,
          canonicalJsonByteLength,
          payloadDigest: envelope.digests.payload
        });
        return;
      }
      const archive = createFullBackupArchiveFromJson(json);
      const blob = new Blob([Uint8Array.from(archive).buffer], { type: "application/zip" });
      workerScope.postMessage({
        ...responseBase(jobId),
        type: "artifact_ready",
        output: "zip",
        blob,
        outputByteLength: blob.size,
        canonicalJsonByteLength,
        payloadDigest: envelope.digests.payload
      });
      return;
    }

    if (request.type === "archive_envelope") {
      const json = serializeFullBackup(request.envelope);
      const canonicalJsonByteLength = new TextEncoder().encode(json).byteLength;
      const archive = createFullBackupArchiveFromJson(json);
      const blob = new Blob([Uint8Array.from(archive).buffer], { type: "application/zip" });
      workerScope.postMessage({
        ...responseBase(jobId),
        type: "artifact_ready",
        output: "zip",
        blob,
        outputByteLength: blob.size,
        canonicalJsonByteLength,
        payloadDigest: request.envelope.digests.payload
      });
      return;
    }

    if (request.type === "inspect_snapshot") {
      const envelope = await createFullBackupFromSnapshot(request.snapshot, request.options);
      assertNotCancelled(jobId);
      workerScope.postMessage({
        ...responseBase(jobId),
        type: "snapshot_verified",
        payloadDigest: envelope.digests.payload,
        canonicalJsonByteLength: new TextEncoder().encode(serializeFullBackup(envelope)).byteLength
      });
      return;
    }

    if (request.type === "prepare_import") {
      const bytes = new Uint8Array(await request.blob.arrayBuffer());
      assertNotCancelled(jobId);
      const decoded = decodeFullBackupFile(bytes);
      const incoming = await preflightFullBackup(decoded.json);
      assertNotCancelled(jobId);
      const currentSafetyBackup = await createFullBackupFromSnapshot(
        request.currentSnapshot,
        request.options
      );
      assertNotCancelled(jobId);
      const canonicalJsonByteLength = new TextEncoder().encode(serializeFullBackup({
        manifest: incoming.manifest,
        digests: incoming.digests,
        payload: incoming.payload
      })).byteLength;
      workerScope.postMessage({
        ...responseBase(jobId),
        type: "preparation_ready",
        preparation: { incoming, currentSafetyBackup },
        sourceContainer: decoded.container,
        sourceByteLength: request.blob.size,
        decodedJsonByteLength: decoded.jsonByteLength,
        canonicalJsonByteLength,
        payloadDigest: incoming.digests.payload
      });
      return;
    }

    const verified = await verifyPreparedFullBackup(request.preparation);
    assertNotCancelled(jobId);
    workerScope.postMessage({
      ...responseBase(jobId),
      type: "verified_ready",
      verified
    });
  } catch (reason) {
    postErrorResponse(jobId, operationOf(request), reason);
  } finally {
    if (activeJobId === jobId) activeJobId = null;
    if (cancelledJobId === jobId) cancelledJobId = null;
  }
}

workerScope.onmessage = (event) => {
  try {
    const request = event.data;
    const jobId = safeVisibleText(request?.jobId, "invalid-job", 128) || "invalid-job";
    if (
      request?.protocol !== FULL_BACKUP_WORKER_PROTOCOL ||
      request?.version !== FULL_BACKUP_WORKER_PROTOCOL_VERSION ||
      !isValidJobId(request?.jobId)
    ) {
      postErrorResponse(jobId, "protocol", protocolError(
        "备份 Worker 协议或版本不匹配。",
        "BACKUP_WORKER_PROTOCOL_VERSION_INVALID"
      ));
      return;
    }
    if (request.type === "cancel") {
      if (activeJobId === request.jobId) cancelledJobId = request.jobId;
      return;
    }
    if (!isOperationRequest(request)) {
      postErrorResponse(jobId, "protocol", protocolError(
        "备份 Worker 收到了未知任务类型。",
        "BACKUP_WORKER_OPERATION_INVALID"
      ));
      return;
    }
    void runJob(request).catch((reason: unknown) => {
      postErrorResponse(jobId, operationOf(request), reason);
    });
  } catch (reason) {
    postErrorResponse("invalid-job", "protocol", reason);
  }
};

export {};
