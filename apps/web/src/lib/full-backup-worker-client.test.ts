import { describe, expect, it, vi } from "vitest";
import { FullBackupArchiveError } from "@hakimi/backup";
import type { FullBackupEnvelope, FullBackupPayload } from "@hakimi/contracts";
import {
  FullBackupWorkerCancelledError,
  FullBackupWorkerProtocolError,
  FullBackupWorkerUnavailableError,
  createFullBackupArtifactOffMainThread,
  prepareFullBackupImportOffMainThread,
  type FullBackupWorkerRuntime
} from "./full-backup-worker-client";
import {
  FULL_BACKUP_WORKER_PROTOCOL,
  FULL_BACKUP_WORKER_PROTOCOL_VERSION,
  type FullBackupWorkerRequest,
  type FullBackupWorkerResponse
} from "./full-backup-worker-protocol";

const snapshot = {} as FullBackupPayload;
const envelope = {} as FullBackupEnvelope;
const preparation = {
  incoming: { manifest: {}, payload: {}, digests: {} },
  currentSafetyBackup: envelope
} as never;

class FakeWorker {
  onmessage: Worker["onmessage"] = null;
  onerror: Worker["onerror"] = null;
  onmessageerror: Worker["onmessageerror"] = null;
  readonly requests: FullBackupWorkerRequest[] = [];
  terminateCount = 0;

  constructor(readonly handleRequest: (message: FullBackupWorkerRequest, worker: FakeWorker) => void) {}

  postMessage(message: unknown): void {
    const request = message as FullBackupWorkerRequest;
    this.requests.push(request);
    this.handleRequest(request, this);
  }

  terminate(): void {
    this.terminateCount += 1;
  }

  emit(message: FullBackupWorkerResponse): void {
    this.onmessage?.call(this as unknown as Worker, new MessageEvent("message", { data: message }));
  }
}

function responseBase(jobId = "job-1") {
  return {
    protocol: FULL_BACKUP_WORKER_PROTOCOL,
    version: FULL_BACKUP_WORKER_PROTOCOL_VERSION,
    jobId
  } as const;
}

function runtimeFor(worker: FakeWorker): FullBackupWorkerRuntime {
  return {
    forceWorker: true,
    createWorker: () => worker,
    createJobId: () => "job-1"
  };
}

describe("full backup worker client", () => {
  it("以版本化一次性任务生成 Blob，并在完成后只终止一次", async () => {
    const output = new Blob([new Uint8Array([1, 2, 3])], { type: "application/zip" });
    const worker = new FakeWorker((request, current) => {
      if (request.type !== "create_from_snapshot") return;
      queueMicrotask(() => current.emit({
        ...responseBase(request.jobId),
        type: "artifact_ready",
        output: "zip",
        blob: output,
        outputByteLength: output.size,
        canonicalJsonByteLength: 100,
        payloadDigest: "a".repeat(64)
      }));
    });

    await expect(createFullBackupArtifactOffMainThread(
      snapshot,
      { appVersion: "0.2.0-p0" },
      "zip",
      undefined,
      runtimeFor(worker)
    )).resolves.toMatchObject({ blob: output, output: "zip", canonicalJsonByteLength: 100 });
    expect(worker.requests[0]).toMatchObject({
      protocol: FULL_BACKUP_WORKER_PROTOCOL,
      version: 1,
      jobId: "job-1",
      type: "create_from_snapshot",
      output: "zip",
      snapshot
    });
    expect(worker.terminateCount).toBe(1);
  });

  it("把原始 Blob 直接交给 Worker，主线程不调用 arrayBuffer 或 text", async () => {
    const blob = new Blob(["{}"], { type: "application/json" });
    const arrayBuffer = vi.spyOn(blob, "arrayBuffer");
    const text = vi.spyOn(blob, "text");
    const worker = new FakeWorker((request, current) => {
      if (request.type !== "prepare_import") return;
      expect(request.blob).toBe(blob);
      queueMicrotask(() => current.emit({
        ...responseBase(request.jobId),
        type: "preparation_ready",
        preparation,
        sourceContainer: "json",
        sourceByteLength: blob.size,
        decodedJsonByteLength: blob.size,
        canonicalJsonByteLength: 256,
        payloadDigest: "b".repeat(64)
      }));
    });

    await expect(prepareFullBackupImportOffMainThread(
      blob,
      snapshot,
      { appVersion: "0.2.0-p0" },
      undefined,
      runtimeFor(worker)
    )).resolves.toMatchObject({ preparation, sourceContainer: "json" });
    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(text).not.toHaveBeenCalled();
    expect(worker.terminateCount).toBe(1);
  });

  it("错版本、错 job 与错响应类型都失败关闭", async () => {
    for (const response of [
      { ...responseBase(), version: 2, type: "artifact_ready" },
      { ...responseBase("other-job"), type: "artifact_ready" },
      { ...responseBase(), type: "snapshot_verified", payloadDigest: "a", canonicalJsonByteLength: 1 }
    ]) {
      const worker = new FakeWorker((request, current) => {
        if (request.type === "create_from_snapshot") {
          queueMicrotask(() => current.emit(response as FullBackupWorkerResponse));
        }
      });
      await expect(createFullBackupArtifactOffMainThread(
        snapshot,
        { appVersion: "0.2.0-p0" },
        "zip",
        undefined,
        runtimeFor(worker)
      )).rejects.toBeInstanceOf(FullBackupWorkerProtocolError);
      expect(worker.terminateCount).toBe(1);
    }
  });

  it("恢复归档领域错误的稳定 code", async () => {
    const worker = new FakeWorker((request, current) => {
      if (request.type !== "create_from_snapshot") return;
      queueMicrotask(() => current.emit({
        ...responseBase(request.jobId),
        type: "error",
        operation: "create_from_snapshot",
        error: {
          name: "FullBackupArchiveError",
          message: "archive too large",
          code: "ARCHIVE_TOO_LARGE",
          category: "archive"
        }
      }));
    });

    await expect(createFullBackupArtifactOffMainThread(
      snapshot,
      { appVersion: "0.2.0-p0" },
      "zip",
      undefined,
      runtimeFor(worker)
    )).rejects.toMatchObject({
      name: "FullBackupArchiveError",
      code: "ARCHIVE_TOO_LARGE"
    } satisfies Partial<FullBackupArchiveError>);
  });

  it("AbortSignal 会发送 cancel、立即终止，并忽略迟到结果", async () => {
    const worker = new FakeWorker(() => {});
    const controller = new AbortController();
    const promise = createFullBackupArtifactOffMainThread(
      snapshot,
      { appVersion: "0.2.0-p0" },
      "zip",
      controller.signal,
      runtimeFor(worker)
    );

    controller.abort();
    await expect(promise).rejects.toBeInstanceOf(FullBackupWorkerCancelledError);
    expect(worker.requests.map((request) => request.type)).toEqual(["create_from_snapshot", "cancel"]);
    expect(worker.terminateCount).toBe(1);
    expect(() => worker.emit({
      ...responseBase(),
      type: "artifact_ready",
      output: "zip",
      blob: new Blob(),
      outputByteLength: 0,
      canonicalJsonByteLength: 1,
      payloadDigest: "a".repeat(64)
    })).not.toThrow();
    expect(worker.terminateCount).toBe(1);
  });

  it("无 Worker 时不在主线程回退，初始 postMessage 失败也回收实例", async () => {
    await expect(createFullBackupArtifactOffMainThread(
      snapshot,
      { appVersion: "0.2.0-p0" },
      "zip",
      undefined,
      { createJobId: () => "job-1" }
    )).rejects.toBeInstanceOf(FullBackupWorkerUnavailableError);

    const worker = new FakeWorker(() => {
      throw new DOMException("clone failed", "DataCloneError");
    });
    await expect(createFullBackupArtifactOffMainThread(
      snapshot,
      { appVersion: "0.2.0-p0" },
      "zip",
      undefined,
      runtimeFor(worker)
    )).rejects.toMatchObject({ name: "DataCloneError" });
    expect(worker.terminateCount).toBe(1);
  });
});

