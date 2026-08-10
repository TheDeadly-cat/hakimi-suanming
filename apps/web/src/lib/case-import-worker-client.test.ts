import { describe, expect, it, vi } from "vitest";
import {
  BIRTH_FINGERPRINT_VERSION,
  CASE_IMPORT_FORMAT_VERSION,
  CaseImportCancelledError,
  CaseImportConfigurationError,
  type CaseImportBatch,
  type CaseImportIterationSummary
} from "@hakimi/case-import";
import {
  buildCaseImportPlanOffMainThread,
  readCaseImportHeadersOffMainThread,
  type CaseImportWorkerRuntime
} from "./case-import-worker-client";
import type {
  CaseImportWorkerRequest,
  CaseImportWorkerResponse
} from "./case-import-worker-protocol";

const mapping = {
  alias: 0,
  date: 1,
  timePrecision: 2,
  timeZone: 3,
  sex: 4
} as const;

function progress(batchNumber: number, processedRows: number) {
  return {
    totalRows: 2,
    processedRows,
    importableRows: 0,
    invalidRows: processedRows,
    duplicateRows: 0,
    skippedRows: 0,
    ignoredBlankRows: 0,
    batchNumber,
    percent: processedRows * 50
  };
}

function batch(batchNumber: number, rowNumber: number): CaseImportBatch {
  return {
    formatVersion: CASE_IMPORT_FORMAT_VERSION,
    batchNumber,
    headers: ["案例名"],
    rows: [{
      status: "invalid",
      rowNumber,
      recordNumber: rowNumber,
      errors: [{ code: "ALIAS_REQUIRED", message: "测试坏行" }]
    }],
    imports: [],
    progress: progress(batchNumber, batchNumber)
  };
}

const summary: CaseImportIterationSummary = {
  formatVersion: CASE_IMPORT_FORMAT_VERSION,
  fingerprintVersion: BIRTH_FINGERPRINT_VERSION,
  headers: ["案例名"],
  stats: {
    totalRows: 2,
    processedRows: 2,
    importableRows: 0,
    invalidRows: 2,
    duplicateRows: 0,
    skippedRows: 0,
    ignoredBlankRows: 0
  }
};

class FakeWorker {
  onmessage: Worker["onmessage"] = null;
  onerror: Worker["onerror"] = null;
  onmessageerror: Worker["onmessageerror"] = null;
  readonly requests: CaseImportWorkerRequest[] = [];
  terminated = false;

  constructor(readonly handleRequest: (message: CaseImportWorkerRequest, worker: FakeWorker) => void) {}

  postMessage(message: unknown): void {
    const request = message as CaseImportWorkerRequest;
    this.requests.push(request);
    this.handleRequest(request, this);
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(message: CaseImportWorkerResponse): void {
    this.onmessage?.call(
      this as unknown as Worker,
      new MessageEvent("message", { data: message })
    );
  }
}

function runtimeFor(worker: FakeWorker): CaseImportWorkerRuntime {
  return { forceWorker: true, createWorker: () => worker };
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((next) => { resolve = next; });
  return { promise, resolve };
}

describe("case import worker client", () => {
  it("把可能很长的首条记录放到 Worker 读取并立即回收", async () => {
    const worker = new FakeWorker((message, current) => {
      if (message.type !== "read_headers") return;
      expect(message.blob).toBeInstanceOf(Blob);
      queueMicrotask(() => current.emit({ type: "headers", headers: ["案例名", "出生日期"] }));
    });

    await expect(readCaseImportHeadersOffMainThread(
      '"案例名","出生日期"\r\n',
      undefined,
      runtimeFor(worker)
    )).resolves.toEqual(["案例名", "出生日期"]);
    expect(worker.requests.map((request) => request.type)).toEqual(["read_headers"]);
    expect(worker.terminated).toBe(true);
  });

  it("把 Blob 原样交给 Worker，不在主线程提前解码", async () => {
    const blob = new Blob(["案例名,出生日期\r\n"], { type: "text/csv" });
    const text = vi.spyOn(blob, "text");
    const worker = new FakeWorker((message, current) => {
      if (message.type !== "read_headers") return;
      expect(message.blob).toBe(blob);
      queueMicrotask(() => current.emit({ type: "headers", headers: ["案例名", "出生日期"] }));
    });

    await expect(readCaseImportHeadersOffMainThread(
      blob,
      undefined,
      runtimeFor(worker)
    )).resolves.toEqual(["案例名", "出生日期"]);
    expect(text).not.toHaveBeenCalled();
    expect(worker.terminated).toBe(true);
  });

  it("无 Worker 的异步回退也会分块读取 Blob 并报告字节进度", async () => {
    const csv = "案例名,出生日期,时间精度,IANA时区,性别\r\n回退样本,1995-08-18,未知时辰,Asia/Shanghai,未指定";
    const blob = new Blob([csv], { type: "text/csv" });
    const text = vi.spyOn(blob, "text");
    const sourceProgress: number[] = [];

    const plan = await buildCaseImportPlanOffMainThread(blob, {
      mapping,
      yieldControl: async () => {},
      onSourceProgress: (event) => {
        expect(event.unit).toBe("utf8_bytes");
        expect(event.totalUnits).toBe(blob.size);
        sourceProgress.push(event.processedUnits);
      }
    });

    expect(text).not.toHaveBeenCalled();
    expect(sourceProgress.length).toBeGreaterThan(0);
    expect(sourceProgress).toEqual([...sourceProgress].sort((left, right) => left - right));
    expect(sourceProgress.at(-1)).toBe(blob.size);
    expect(plan.stats).toMatchObject({ totalRows: 1, importableRows: 1, invalidRows: 0 });
  });

  it("无 Worker 的 Blob 表头读取不调用 Blob.text", async () => {
    const blob = new Blob(["案例名,出生日期\r\n甲,1995-08-18\r\n"], { type: "text/csv" });
    const text = vi.spyOn(blob, "text");

    await expect(readCaseImportHeadersOffMainThread(blob)).resolves.toEqual(["案例名", "出生日期"]);
    expect(text).not.toHaveBeenCalled();
  });

  it("无 Worker 的 Blob 回退以稳定错误拒绝非法 UTF-8", async () => {
    const blob = new Blob([
      "alias,date,timePrecision,timeZone,sex\r\n",
      new Uint8Array([0xe4, 0xb8])
    ]);

    await expect(buildCaseImportPlanOffMainThread(blob, {
      mapping,
      yieldControl: async () => {}
    })).rejects.toMatchObject({
      code: "CASE_IMPORT_CONFIGURATION_INVALID",
      issues: [expect.objectContaining({ code: "CSV_INVALID_UTF8" })]
    });
  });

  it("分批接收结果、顺序通知进度并在完成后终止 Worker", async () => {
    const worker = new FakeWorker((message, current) => {
      if (message.type === "start") {
        queueMicrotask(() => {
          current.emit({
            type: "source_progress",
            progress: {
              unit: "utf8_bytes",
              processedUnits: 64,
              totalUnits: 128,
              parsedRecords: 1,
              percent: 50
            }
          });
          current.emit({ type: "batch", batch: batch(1, 2) });
        });
        return;
      }
      if (message.type === "batch_ack" && message.batchNumber === 1) {
        current.emit({ type: "batch", batch: batch(2, 3) });
        return;
      }
      if (message.type === "batch_ack" && message.batchNumber === 2) {
        current.emit({ type: "complete", summary });
      }
    });
    const progressEvents: number[] = [];
    const sourceProgressEvents: number[] = [];
    const firstProgress = deferred();
    const secondProgress = deferred();
    let progressIndex = 0;
    const planPromise = buildCaseImportPlanOffMainThread("ignored-in-protocol-test", {
      mapping,
      duplicatePolicy: "skip",
      existingFingerprints: new Set(["a".repeat(64)]),
      chunkSize: 1,
      onSourceProgress: async (event) => { sourceProgressEvents.push(event.processedUnits); },
      onProgress: async (event) => {
        progressEvents.push(event.processedRows);
        await [firstProgress.promise, secondProgress.promise][progressIndex++];
      }
    }, runtimeFor(worker));

    await vi.waitFor(() => expect(progressEvents).toEqual([1]));
    expect(worker.requests.map((request) => request.type)).toEqual(["start"]);
    firstProgress.resolve();
    await vi.waitFor(() => expect(progressEvents).toEqual([1, 2]));
    expect(worker.requests.map((request) => request.type)).toEqual(["start", "batch_ack"]);
    secondProgress.resolve();
    const plan = await planPromise;

    expect(plan.rows.map((row) => row.rowNumber)).toEqual([2, 3]);
    expect(plan.stats).toEqual(summary.stats);
    expect(plan.hasRowErrors).toBe(true);
    expect(plan.allowsPartialImport).toBe(true);
    expect(progressEvents).toEqual([1, 2]);
    expect(sourceProgressEvents).toEqual([64]);
    expect(worker.terminated).toBe(true);
    expect(worker.requests[0]).toMatchObject({
      type: "start",
      options: { chunkSize: 1, existingFingerprints: ["a".repeat(64)] }
    });
    expect(worker.requests.slice(1)).toEqual([
      { type: "batch_ack", batchNumber: 1 },
      { type: "batch_ack", batchNumber: 2 }
    ]);
  });

  it("AbortSignal 会发送取消并立即终止一次性 Worker", async () => {
    const worker = new FakeWorker(() => {});
    const controller = new AbortController();
    const promise = buildCaseImportPlanOffMainThread("very-long-csv", {
      mapping,
      signal: controller.signal
    }, runtimeFor(worker));

    controller.abort();
    await expect(promise).rejects.toBeInstanceOf(CaseImportCancelledError);
    expect(worker.requests.map((request) => request.type)).toEqual(["start", "cancel"]);
    expect(worker.terminated).toBe(true);
  });

  it("进度回调失败时拒绝计划且不确认当前批次", async () => {
    const worker = new FakeWorker((message, current) => {
      if (message.type !== "start") return;
      queueMicrotask(() => current.emit({ type: "batch", batch: batch(1, 2) }));
    });

    await expect(buildCaseImportPlanOffMainThread("callback-error", {
      mapping,
      onProgress: async () => { throw new Error("progress callback failed"); }
    }, runtimeFor(worker))).rejects.toThrow("progress callback failed");

    expect(worker.requests.map((request) => request.type)).toEqual(["start"]);
    expect(worker.terminated).toBe(true);
  });

  it("取消等待确认的批次时只发送 cancel，迟到的进度完成不会再确认", async () => {
    const worker = new FakeWorker((message, current) => {
      if (message.type !== "start") return;
      queueMicrotask(() => current.emit({ type: "batch", batch: batch(1, 2) }));
    });
    const controller = new AbortController();
    const progressGate = deferred();
    let progressStarted = false;
    const promise = buildCaseImportPlanOffMainThread("cancel-pending-ack", {
      mapping,
      signal: controller.signal,
      onProgress: async () => {
        progressStarted = true;
        await progressGate.promise;
      }
    }, runtimeFor(worker));

    await vi.waitFor(() => expect(progressStarted).toBe(true));
    controller.abort();
    await expect(promise).rejects.toBeInstanceOf(CaseImportCancelledError);
    progressGate.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(worker.requests.map((request) => request.type)).toEqual(["start", "cancel"]);
    expect(worker.terminated).toBe(true);
  });

  it("拒绝错误的批次编号且不发送错误编号的确认", async () => {
    const worker = new FakeWorker((message, current) => {
      if (message.type !== "start") return;
      queueMicrotask(() => current.emit({ type: "batch", batch: batch(2, 2) }));
    });

    await expect(buildCaseImportPlanOffMainThread(
      "wrong-batch-number",
      { mapping },
      runtimeFor(worker)
    )).rejects.toThrow("期望 1，收到 2");

    expect(worker.requests.map((request) => request.type)).toEqual(["start"]);
    expect(worker.terminated).toBe(true);
  });

  it("恢复 Worker 中的结构化配置错误，不丢失逐项问题", async () => {
    const worker = new FakeWorker((message, current) => {
      if (message.type !== "start") return;
      queueMicrotask(() => current.emit({
        type: "error",
        error: {
          name: "CaseImportConfigurationError",
          message: "CSV 必须包含表头",
          code: "CASE_IMPORT_CONFIGURATION_INVALID",
          issues: [{ code: "CSV_HEADER_REQUIRED", message: "CSV 必须包含表头" }]
        }
      }));
    });

    const promise = buildCaseImportPlanOffMainThread("", { mapping }, runtimeFor(worker));
    await expect(promise).rejects.toMatchObject({
      name: "CaseImportConfigurationError",
      code: "CASE_IMPORT_CONFIGURATION_INVALID",
      issues: [{ code: "CSV_HEADER_REQUIRED", message: "CSV 必须包含表头" }]
    } satisfies Partial<CaseImportConfigurationError>);
    expect(worker.terminated).toBe(true);
  });

  it("初始 postMessage 同步失败时也会回收 Worker", async () => {
    const worker = new FakeWorker(() => {
      throw new DOMException("structured clone failed", "DataCloneError");
    });

    await expect(buildCaseImportPlanOffMainThread(
      "uncloneable-simulation",
      { mapping },
      runtimeFor(worker)
    )).rejects.toMatchObject({ name: "DataCloneError" });
    expect(worker.terminated).toBe(true);
  });

  it("Worker 拒绝错误的 batch_ack 编号且不会越过确认发送 complete", async () => {
    const responses: CaseImportWorkerResponse[] = [];
    const blob = new Blob(["alias,date,timePrecision,timeZone,sex\r\n,not-a-date,bad,bad,bad"]);
    const textSpy = vi.spyOn(blob, "text");
    const previousOnMessage = globalThis.onmessage;
    const postMessageSpy = vi.spyOn(globalThis, "postMessage").mockImplementation((message: unknown) => {
      responses.push(message as CaseImportWorkerResponse);
    });

    try {
      vi.resetModules();
      await import("../workers/case-import.worker");
      const workerOnMessage = globalThis.onmessage as ((event: MessageEvent<CaseImportWorkerRequest>) => void) | null;
      if (!workerOnMessage) throw new Error("CSV Worker 测试入口未注册");

      workerOnMessage(new MessageEvent("message", {
        data: {
          type: "start",
          blob,
          options: {
            mapping,
            duplicatePolicy: "skip",
            existingFingerprints: [],
            chunkSize: 1
          }
        } satisfies CaseImportWorkerRequest
      }));

      await vi.waitFor(() => expect(responses.some((message) => message.type === "batch")).toBe(true));
      expect(responses).toContainEqual(expect.objectContaining({
        type: "source_progress",
        progress: expect.objectContaining({ unit: "utf8_bytes", processedUnits: blob.size })
      }));
      expect(textSpy).not.toHaveBeenCalled();
      const emittedBatch = responses.find((message) => message.type === "batch");
      if (!emittedBatch || emittedBatch.type !== "batch") throw new Error("CSV Worker 未返回测试批次");
      expect(responses.some((message) => message.type === "complete")).toBe(false);

      workerOnMessage(new MessageEvent("message", {
        data: {
          type: "batch_ack",
          batchNumber: emittedBatch.batch.batchNumber + 1
        } satisfies CaseImportWorkerRequest
      }));

      await vi.waitFor(() => expect(responses).toContainEqual(expect.objectContaining({
        type: "error",
        error: expect.objectContaining({
          name: "CaseImportWorkerProtocolError",
          code: "WORKER_BATCH_ACK_INVALID"
        })
      })));
      expect(responses.some((message) => message.type === "complete")).toBe(false);
    } finally {
      postMessageSpy.mockRestore();
      globalThis.onmessage = previousOnMessage;
    }
  });
});
