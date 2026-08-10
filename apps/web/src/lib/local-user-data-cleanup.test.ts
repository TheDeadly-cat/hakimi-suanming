import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CONTROLLED_WINDOW_DRAFT_CLEANUP_ACK,
  CONTROLLED_WINDOW_DRAFT_CLEANUP_REQUEST,
  CONTROLLED_WINDOW_DRAFT_CLEANUP_RESULT,
  REQUEST_CONTROLLED_WINDOW_DRAFT_CLEANUP,
  clearControlledWindowResearchQueryDrafts,
  installControlledWindowDraftCleanupHandler,
} from "./local-user-data-cleanup";

class FakeMessagePort {
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  peer: FakeMessagePort | null = null;
  closed = false;

  postMessage(message: unknown) {
    const target = this.peer;
    if (!target || this.closed || target.closed) return;
    queueMicrotask(() => target.onmessage?.({ data: message } as MessageEvent<unknown>));
  }

  start() {}

  close() {
    this.closed = true;
  }
}

class FakeMessageChannel {
  readonly port1 = new FakeMessagePort();
  readonly port2 = new FakeMessagePort();

  constructor() {
    this.port1.peer = this.port2;
    this.port2.peer = this.port1;
  }
}

class FakeServiceWorkerMessageTarget {
  private listener: EventListener | null = null;

  addEventListener(_type: "message", listener: EventListener) {
    this.listener = listener;
  }

  removeEventListener(_type: "message", listener: EventListener) {
    if (this.listener === listener) this.listener = null;
  }

  dispatch(data: Record<string, unknown>, port?: FakeMessagePort) {
    this.listener?.({ data, ports: port ? [port] : [] } as unknown as Event);
  }
}

afterEach(() => {
  vi.useRealTimers();
  window.sessionStorage.clear();
});

describe("controlled-window local user-data cleanup", () => {
  it("窗口处理器只清本应用检索草稿并返回精确计数", async () => {
    const target = new FakeServiceWorkerMessageTarget();
    window.sessionStorage.setItem("hakimi:research-query-draft:v1:first", "one");
    window.sessionStorage.setItem("hakimi:research-query-draft:v1:second", "two");
    window.sessionStorage.setItem("host-unrelated", "keep");
    const remove = installControlledWindowDraftCleanupHandler(target, window.sessionStorage);
    const channel = new FakeMessageChannel();
    const acknowledgements: unknown[] = [];
    channel.port1.onmessage = (event) => acknowledgements.push(event.data);

    target.dispatch({
      type: CONTROLLED_WINDOW_DRAFT_CLEANUP_REQUEST,
      requestId: "cleanup-1",
    }, channel.port2);
    await Promise.resolve();

    expect(acknowledgements).toEqual([{
      type: CONTROLLED_WINDOW_DRAFT_CLEANUP_ACK,
      requestId: "cleanup-1",
      accepted: true,
      reason: "DRAFTS_CLEARED",
      matchedDraftCount: 2,
      removedDraftCount: 2,
      failedDraftCount: 0,
    }]);
    expect(window.sessionStorage.getItem("host-unrelated")).toBe("keep");
    expect(window.sessionStorage.length).toBe(1);

    remove();
    target.dispatch({
      type: CONTROLLED_WINDOW_DRAFT_CLEANUP_REQUEST,
      requestId: "cleanup-after-remove",
    }, channel.port2);
    await Promise.resolve();
    expect(acknowledgements).toHaveLength(1);
  });

  it("页面严格验收 Service Worker 的多窗口汇总 ACK", async () => {
    window.sessionStorage.setItem("hakimi:research-query-draft:v1:current", "local draft");
    window.sessionStorage.setItem("unrelated", "keep");
    const controller = {
      postMessage: vi.fn((message: unknown, ports?: Transferable[]) => {
        expect(message).toEqual({
          type: REQUEST_CONTROLLED_WINDOW_DRAFT_CLEANUP,
          requestId: "aggregate-1",
        });
        (ports?.[0] as unknown as FakeMessagePort).postMessage({
          type: CONTROLLED_WINDOW_DRAFT_CLEANUP_RESULT,
          requestId: "aggregate-1",
          accepted: false,
          reason: "CLIENTS_NOT_CONFIRMED",
          requestedClientCount: 3,
          acknowledgedClientCount: 2,
          clearedClientCount: 2,
          matchedDraftCount: 4,
          removedDraftCount: 4,
          failedDraftCount: 0,
          failedClients: [{ clientId: "client-c", reason: "CLIENT_TIMEOUT" }],
        });
      }),
    };

    const result = await clearControlledWindowResearchQueryDrafts({
      serviceWorker: { controller },
      requestId: "aggregate-1",
      createMessageChannel: () => new FakeMessageChannel() as unknown as MessageChannel,
    });

    expect(result).toEqual({
      mode: "controlled_windows",
      complete: false,
      reason: "CLIENTS_NOT_CONFIRMED",
      requestedClientCount: 3,
      acknowledgedClientCount: 2,
      clearedClientCount: 2,
      matchedDraftCount: 4,
      removedDraftCount: 4,
      failedDraftCount: 0,
      failedClients: [{ clientId: "client-c", reason: "CLIENT_TIMEOUT" }],
      currentWindowFallback: {
        matchedDraftCount: 1,
        removedDraftCount: 1,
        failedDraftCount: 0,
      },
    });
    expect(window.sessionStorage.getItem("hakimi:research-query-draft:v1:current")).toBeNull();
    expect(window.sessionStorage.getItem("unrelated")).toBe("keep");
  });

  it("无 controller 时仅清当前窗口并明确返回未完成跨窗口核对", async () => {
    window.sessionStorage.setItem("hakimi:research-query-draft:v1:local", "draft");
    window.sessionStorage.setItem("unrelated", "keep");

    const result = await clearControlledWindowResearchQueryDrafts({
      serviceWorker: { controller: null },
    });

    expect(result).toMatchObject({
      mode: "current_window_only",
      complete: false,
      reason: "NO_SERVICE_WORKER_CONTROLLER",
      requestedClientCount: 1,
      acknowledgedClientCount: 1,
      clearedClientCount: 1,
      matchedDraftCount: 1,
      removedDraftCount: 1,
      failedClients: [],
    });
    expect(window.sessionStorage.getItem("unrelated")).toBe("keep");
  });
});
