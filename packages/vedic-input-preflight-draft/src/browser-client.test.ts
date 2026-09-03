import { describe, expect, it, vi } from "vitest";
import {
  runVedicInputPreflightInFreshWorker,
  type VedicInputPreflightClientOptions
} from "./browser-client.ts";
import {
  EXPECTED_VEDIC_INPUT_PREFLIGHT_RESULT,
  VEDIC_INPUT_PREFLIGHT_ACTION,
  VEDIC_INPUT_PREFLIGHT_PROTOCOL,
  type VedicInputPreflightWorkerRequest
} from "./protocol.ts";

type WorkerBehavior = (worker: FakeWorker, request: unknown) => void;

class FakeWorker {
  readonly posted: unknown[] = [];
  readonly terminate = vi.fn();
  private readonly listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

  constructor(private readonly behavior: WorkerBehavior) {}

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const listeners = this.listeners.get(type) ?? new Set<EventListenerOrEventListenerObject>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    this.listeners.get(type)?.delete(listener);
  }

  postMessage(request: unknown): void {
    this.posted.push(request);
    this.behavior(this, request);
  }

  emitMessage(data: unknown): void {
    this.emit("message", { data } as MessageEvent<unknown>);
  }

  emitCrash(): void {
    this.emit("error", {
      message: "sensitive worker detail must not be surfaced",
      preventDefault: vi.fn()
    } as unknown as ErrorEvent);
  }

  emitMessageError(): void {
    this.emit("messageerror", { data: null } as MessageEvent<unknown>);
  }

  private emit(type: string, event: Event): void {
    for (const listener of [...(this.listeners.get(type) ?? [])]) {
      if (typeof listener === "function") listener(event);
      else listener.handleEvent(event);
    }
  }
}

const REQUEST_ID = "0123456789abcdef0123456789abcdef";

function successResponse(requestId: string): Record<string, unknown> {
  return {
    action: VEDIC_INPUT_PREFLIGHT_ACTION,
    ok: true,
    protocolVersion: VEDIC_INPUT_PREFLIGHT_PROTOCOL,
    requestId,
    result: structuredClone(EXPECTED_VEDIC_INPUT_PREFLIGHT_RESULT)
  };
}

function optionsFor(
  behavior: WorkerBehavior,
  workers: FakeWorker[] = [],
  overrides: Partial<VedicInputPreflightClientOptions> = {}
): VedicInputPreflightClientOptions {
  return {
    requestIdFactory: () => REQUEST_ID,
    timeoutMs: 100,
    workerFactory: () => {
      const worker = new FakeWorker(behavior);
      workers.push(worker);
      return worker as unknown as Worker;
    },
    ...overrides
  };
}

describe("Vedic input preflight browser client", () => {
  it("creates a fresh Worker for every exact request and accepts one bound exact response", async () => {
    const workers: FakeWorker[] = [];
    const options = optionsFor((worker, request) => {
      const typed = request as VedicInputPreflightWorkerRequest;
      worker.emitMessage(successResponse(typed.requestId));
    }, workers);

    const first = await runVedicInputPreflightInFreshWorker(options);
    const second = await runVedicInputPreflightInFreshWorker(options);

    expect(first).toEqual(EXPECTED_VEDIC_INPUT_PREFLIGHT_RESULT);
    expect(second).toEqual(first);
    expect(workers).toHaveLength(2);
    for (const worker of workers) {
      expect(worker.posted).toEqual([{
        action: VEDIC_INPUT_PREFLIGHT_ACTION,
        protocolVersion: VEDIC_INPUT_PREFLIGHT_PROTOCOL,
        requestId: REQUEST_ID
      }]);
      expect(worker.terminate).toHaveBeenCalledTimes(1);
    }
  });

  it("rejects mismatched request identity, extra fields, and promoted authority", async () => {
    await expect(runVedicInputPreflightInFreshWorker(optionsFor((worker) => {
      worker.emitMessage(successResponse("f".repeat(32)));
    }))).rejects.toMatchObject({ code: "WORKER_RESPONSE_INVALID" });

    await expect(runVedicInputPreflightInFreshWorker(optionsFor((worker) => {
      worker.emitMessage({ ...successResponse(REQUEST_ID), unexpected: true });
    }))).rejects.toMatchObject({ code: "WORKER_RESPONSE_INVALID" });

    await expect(runVedicInputPreflightInFreshWorker(optionsFor((worker) => {
      const response = successResponse(REQUEST_ID);
      const result = response.result as typeof EXPECTED_VEDIC_INPUT_PREFLIGHT_RESULT;
      (result.authorityBoundary as { releaseReady: boolean }).releaseReady = true;
      worker.emitMessage(response);
    }))).rejects.toMatchObject({ code: "WORKER_RESPONSE_INVALID" });
  });

  it("rejects a malformed first response", async () => {
    await expect(runVedicInputPreflightInFreshWorker(optionsFor((worker) => {
      worker.emitMessage({ ok: true });
    }))).rejects.toMatchObject({ code: "WORKER_RESPONSE_INVALID" });
  });

  it("treats the first exact response as terminal and terminates before later responses", async () => {
    const workers: FakeWorker[] = [];
    const result = await runVedicInputPreflightInFreshWorker(optionsFor((worker, request) => {
      const requestId = (request as VedicInputPreflightWorkerRequest).requestId;
      worker.emitMessage(successResponse(requestId));
      worker.emitMessage({ ok: true });
    }, workers));

    expect(result).toEqual(EXPECTED_VEDIC_INPUT_PREFLIGHT_RESULT);
    expect(workers[0]!.terminate).toHaveBeenCalledTimes(1);
  });

  it("fails closed on Worker crash and message deserialization failure", async () => {
    await expect(runVedicInputPreflightInFreshWorker(optionsFor((worker) => {
      worker.emitCrash();
    }))).rejects.toMatchObject({
      code: "WORKER_CRASHED",
      message: "一次性 Worker 运行失败。"
    });

    await expect(runVedicInputPreflightInFreshWorker(optionsFor((worker) => {
      worker.emitMessageError();
    }))).rejects.toMatchObject({ code: "WORKER_MESSAGE_ERROR" });
  });

  it("fails closed when Worker creation, factory shape, or postMessage fails", async () => {
    await expect(runVedicInputPreflightInFreshWorker(optionsFor(
      () => undefined,
      [],
      { workerFactory: () => { throw new Error("sensitive startup detail"); } }
    ))).rejects.toMatchObject({ code: "WORKER_START_FAILED" });

    await expect(runVedicInputPreflightInFreshWorker(optionsFor(
      () => undefined,
      [],
      { workerFactory: () => ({}) as Worker }
    ))).rejects.toMatchObject({ code: "WORKER_FACTORY_INVALID" });

    const workers: FakeWorker[] = [];
    await expect(runVedicInputPreflightInFreshWorker(optionsFor(
      () => { throw new Error("sensitive post detail"); },
      workers
    ))).rejects.toMatchObject({ code: "WORKER_POST_FAILED" });
    expect(workers[0]!.terminate).toHaveBeenCalledTimes(1);
  });

  it("terminates and rejects when the one-shot Worker times out", async () => {
    const workers: FakeWorker[] = [];
    await expect(runVedicInputPreflightInFreshWorker(optionsFor(
      () => undefined,
      workers,
      { timeoutMs: 5 }
    ))).rejects.toMatchObject({ code: "WORKER_TIMEOUT" });
    expect(workers[0]!.terminate).toHaveBeenCalledTimes(1);
  });
});
