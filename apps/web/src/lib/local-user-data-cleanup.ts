import {
  clearResearchQueryDrafts,
  type ResearchQueryDraftCleanupResult,
} from "./research-query-session";

export const REQUEST_CONTROLLED_WINDOW_DRAFT_CLEANUP =
  "CLEAR_RESEARCH_QUERY_SESSION_DRAFTS_ACROSS_CLIENTS" as const;
export const CONTROLLED_WINDOW_DRAFT_CLEANUP_REQUEST =
  "CLEAR_RESEARCH_QUERY_SESSION_DRAFTS" as const;
export const CONTROLLED_WINDOW_DRAFT_CLEANUP_ACK =
  "RESEARCH_QUERY_SESSION_DRAFTS_CLEARED" as const;
export const CONTROLLED_WINDOW_DRAFT_CLEANUP_RESULT =
  "CLEAR_RESEARCH_QUERY_SESSION_DRAFTS_ACROSS_CLIENTS_ACK" as const;

type SessionStorageCleanupTarget = Pick<Storage, "length" | "key" | "removeItem">;

type ServiceWorkerMessageTarget = {
  addEventListener(type: "message", listener: EventListener): void;
  removeEventListener(type: "message", listener: EventListener): void;
};

type ServiceWorkerControllerTarget = {
  controller: null | {
    postMessage(message: unknown, transfer?: Transferable[]): void;
  };
};

export type ControlledWindowDraftCleanupFailure = {
  clientId: string;
  reason: string;
};

export type ControlledWindowDraftCleanupResult = {
  mode: "controlled_windows" | "current_window_only";
  complete: boolean;
  reason: string;
  requestedClientCount: number;
  acknowledgedClientCount: number;
  clearedClientCount: number;
  matchedDraftCount: number;
  removedDraftCount: number;
  failedDraftCount: number;
  failedClients: ControlledWindowDraftCleanupFailure[];
  currentWindowFallback?: ResearchQueryDraftCleanupResult;
};

function nonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function currentWindowOnlyResult(
  reason: string,
  storage: SessionStorageCleanupTarget,
): ControlledWindowDraftCleanupResult {
  try {
    const cleanup = clearResearchQueryDrafts(storage);
    const localComplete = cleanup.failedDraftCount === 0;
    return {
      mode: "current_window_only",
      complete: false,
      reason,
      requestedClientCount: 1,
      acknowledgedClientCount: 1,
      clearedClientCount: localComplete ? 1 : 0,
      ...cleanup,
      failedClients: localComplete
        ? []
        : [{ clientId: "current-window", reason: "SESSION_STORAGE_CLEANUP_PARTIAL" }],
    };
  } catch {
    return {
      mode: "current_window_only",
      complete: false,
      reason,
      requestedClientCount: 1,
      acknowledgedClientCount: 0,
      clearedClientCount: 0,
      matchedDraftCount: 0,
      removedDraftCount: 0,
      failedDraftCount: 0,
      failedClients: [{ clientId: "current-window", reason: "SESSION_STORAGE_CLEANUP_FAILED" }],
    };
  }
}

function parseControlledWindowCleanupResult(
  value: unknown,
  requestId: string,
): ControlledWindowDraftCleanupResult | null {
  if (!value || typeof value !== "object") return null;
  const acknowledgement = value as Record<string, unknown>;
  if (
    acknowledgement.type !== CONTROLLED_WINDOW_DRAFT_CLEANUP_RESULT ||
    acknowledgement.requestId !== requestId ||
    typeof acknowledgement.accepted !== "boolean" ||
    typeof acknowledgement.reason !== "string" ||
    !nonNegativeInteger(acknowledgement.requestedClientCount) ||
    !nonNegativeInteger(acknowledgement.acknowledgedClientCount) ||
    !nonNegativeInteger(acknowledgement.clearedClientCount) ||
    !nonNegativeInteger(acknowledgement.matchedDraftCount) ||
    !nonNegativeInteger(acknowledgement.removedDraftCount) ||
    !nonNegativeInteger(acknowledgement.failedDraftCount) ||
    !Array.isArray(acknowledgement.failedClients)
  ) return null;

  const failedClients: ControlledWindowDraftCleanupFailure[] = [];
  for (const candidate of acknowledgement.failedClients) {
    if (
      !candidate ||
      typeof candidate !== "object" ||
      typeof (candidate as Record<string, unknown>).clientId !== "string" ||
      typeof (candidate as Record<string, unknown>).reason !== "string"
    ) return null;
    failedClients.push({
      clientId: (candidate as Record<string, string>).clientId,
      reason: (candidate as Record<string, string>).reason,
    });
  }

  const requestedClientCount = Number(acknowledgement.requestedClientCount);
  const acknowledgedClientCount = Number(acknowledgement.acknowledgedClientCount);
  const clearedClientCount = Number(acknowledgement.clearedClientCount);
  const matchedDraftCount = Number(acknowledgement.matchedDraftCount);
  const removedDraftCount = Number(acknowledgement.removedDraftCount);
  const failedDraftCount = Number(acknowledgement.failedDraftCount);
  if (
    acknowledgedClientCount > requestedClientCount ||
    clearedClientCount > acknowledgedClientCount ||
    removedDraftCount + failedDraftCount !== matchedDraftCount ||
    failedClients.length !== requestedClientCount - clearedClientCount ||
    (acknowledgement.accepted === true && (
      clearedClientCount !== requestedClientCount ||
      failedClients.length !== 0 ||
      failedDraftCount !== 0
    ))
  ) return null;

  return {
    mode: "controlled_windows",
    complete: acknowledgement.accepted === true,
    reason: acknowledgement.reason,
    requestedClientCount,
    acknowledgedClientCount,
    clearedClientCount,
    matchedDraftCount,
    removedDraftCount,
    failedDraftCount,
    failedClients,
  };
}

export function installControlledWindowDraftCleanupHandler(
  target: ServiceWorkerMessageTarget = navigator.serviceWorker,
  storage: SessionStorageCleanupTarget = window.sessionStorage,
): () => void {
  const listener: EventListener = (rawEvent) => {
    const event = rawEvent as MessageEvent<Record<string, unknown>>;
    if (event.data?.type !== CONTROLLED_WINDOW_DRAFT_CLEANUP_REQUEST) return;
    const responsePort = event.ports?.[0];
    if (!responsePort) return;
    const requestId = event.data.requestId;
    if (typeof requestId !== "string" || requestId.length === 0) {
      responsePort.postMessage({
        type: CONTROLLED_WINDOW_DRAFT_CLEANUP_ACK,
        requestId: typeof requestId === "string" ? requestId : "",
        accepted: false,
        reason: "PROTOCOL_MISMATCH",
        matchedDraftCount: 0,
        removedDraftCount: 0,
        failedDraftCount: 0,
      });
      return;
    }

    try {
      const cleanup: ResearchQueryDraftCleanupResult = clearResearchQueryDrafts(storage);
      responsePort.postMessage({
        type: CONTROLLED_WINDOW_DRAFT_CLEANUP_ACK,
        requestId,
        accepted: cleanup.failedDraftCount === 0,
        reason: cleanup.failedDraftCount === 0 ? "DRAFTS_CLEARED" : "DRAFTS_PARTIALLY_CLEARED",
        ...cleanup,
      });
    } catch {
      responsePort.postMessage({
        type: CONTROLLED_WINDOW_DRAFT_CLEANUP_ACK,
        requestId,
        accepted: false,
        reason: "SESSION_STORAGE_CLEANUP_FAILED",
        matchedDraftCount: 0,
        removedDraftCount: 0,
        failedDraftCount: 0,
      });
    }
  };
  target.addEventListener("message", listener);
  return () => target.removeEventListener("message", listener);
}

export async function clearControlledWindowResearchQueryDrafts(options: {
  serviceWorker?: ServiceWorkerControllerTarget | null;
  storage?: SessionStorageCleanupTarget;
  timeoutMs?: number;
  requestId?: string;
  createMessageChannel?: () => MessageChannel;
} = {}): Promise<ControlledWindowDraftCleanupResult> {
  const storage = options.storage ?? window.sessionStorage;
  const serviceWorker = options.serviceWorker ?? (
    typeof navigator !== "undefined" && "serviceWorker" in navigator
      ? navigator.serviceWorker
      : null
  );
  const controller = serviceWorker?.controller;
  if (!controller) return currentWindowOnlyResult("NO_SERVICE_WORKER_CONTROLLER", storage);

  const requestId = options.requestId ?? crypto.randomUUID();
  const createMessageChannel = options.createMessageChannel ?? (() => new MessageChannel());
  let channel: MessageChannel;
  try {
    channel = createMessageChannel();
  } catch {
    return currentWindowOnlyResult("MESSAGE_CHANNEL_UNAVAILABLE", storage);
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: ControlledWindowDraftCleanupResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      channel.port1.close();
      resolve(result);
    };
    const timeout = window.setTimeout(() => {
      finish(currentWindowOnlyResult("SERVICE_WORKER_CLEANUP_TIMEOUT", storage));
    }, options.timeoutMs ?? 8_000);
    channel.port1.onmessage = (event: MessageEvent<unknown>) => {
      const parsed = parseControlledWindowCleanupResult(event.data, requestId);
      if (!parsed) {
        finish(currentWindowOnlyResult("INVALID_SERVICE_WORKER_ACK", storage));
        return;
      }
      if (parsed.complete) {
        finish(parsed);
        return;
      }
      const localFallback = currentWindowOnlyResult("INCOMPLETE_SERVICE_WORKER_ACK", storage);
      finish({
        ...parsed,
        currentWindowFallback: {
          matchedDraftCount: localFallback.matchedDraftCount,
          removedDraftCount: localFallback.removedDraftCount,
          failedDraftCount: localFallback.failedDraftCount,
        },
      });
    };
    channel.port1.start?.();
    try {
      controller.postMessage({
        type: REQUEST_CONTROLLED_WINDOW_DRAFT_CLEANUP,
        requestId,
      }, [channel.port2]);
    } catch {
      finish(currentWindowOnlyResult("SERVICE_WORKER_POST_FAILED", storage));
    }
  });
}
