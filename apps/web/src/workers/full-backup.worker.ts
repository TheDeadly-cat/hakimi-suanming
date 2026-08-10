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
  if (reason instanceof FullBackupArchiveError) {
    return {
      name: reason.name,
      message: reason.message,
      code: reason.code,
      category: "archive"
    };
  }
  if (reason instanceof FullBackupError) {
    return {
      name: reason.name,
      message: reason.message,
      code: reason.code,
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
    const code = "code" in reason && typeof reason.code === "string" ? reason.code : undefined;
    return {
      name: reason.name,
      message: reason.message,
      ...(code ? { code } : {}),
      category: reason.name === "FullBackupWorkerProtocolError" ? "protocol" : "runtime"
    };
  }
  return {
    name: "Error",
    message: "备份 Worker 处理失败。",
    category: "runtime"
  };
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
    throw protocolError("备份 Worker 一次只能处理一个任务。", "BACKUP_WORKER_JOB_ACTIVE");
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
    workerScope.postMessage({
      ...responseBase(jobId),
      type: "error",
      operation: operationOf(request),
      error: serializeError(reason)
    });
  } finally {
    if (activeJobId === jobId) activeJobId = null;
    if (cancelledJobId === jobId) cancelledJobId = null;
  }
}

workerScope.onmessage = (event) => {
  const request = event.data;
  const jobId = typeof request?.jobId === "string" ? request.jobId : "invalid-job";
  if (
    request?.protocol !== FULL_BACKUP_WORKER_PROTOCOL ||
    request?.version !== FULL_BACKUP_WORKER_PROTOCOL_VERSION ||
    typeof request?.jobId !== "string" ||
    request.jobId.length === 0
  ) {
    workerScope.postMessage({
      ...responseBase(jobId),
      type: "error",
      operation: "protocol",
      error: serializeError(protocolError(
        "备份 Worker 协议或版本不匹配。",
        "BACKUP_WORKER_PROTOCOL_VERSION_INVALID"
      ))
    });
    return;
  }
  if (request.type === "cancel") {
    if (activeJobId === request.jobId) cancelledJobId = request.jobId;
    return;
  }
  void runJob(request);
};

export {};
