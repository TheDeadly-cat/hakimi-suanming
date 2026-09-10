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

const MAX_PROTOCOL_TOKEN_CHARACTERS = 128;
const MAX_CONTROLLED_CLIENT_COUNT = 1_024;
const MAX_DRAFT_COUNT = 1_000_000;
const DEFAULT_CLEANUP_TIMEOUT_MS = 8_000;
const MAX_CLEANUP_TIMEOUT_MS = 60_000;

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

function protocolToken(value: unknown): value is string {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_PROTOCOL_TOKEN_CHARACTERS &&
    /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/u.test(value);
}

function nonNegativeInteger(value: unknown, maximum = MAX_DRAFT_COUNT): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= maximum;
}

function cleanupTimeout(timeoutMs: unknown): number {
  return Number.isSafeInteger(timeoutMs) &&
    Number(timeoutMs) > 0 &&
    Number(timeoutMs) <= MAX_CLEANUP_TIMEOUT_MS
    ? Number(timeoutMs)
    : DEFAULT_CLEANUP_TIMEOUT_MS;
}

function freezeControlledWindowResult(
  result: ControlledWindowDraftCleanupResult,
): ControlledWindowDraftCleanupResult {
  const failedClients = Object.freeze(
    result.failedClients.map((failure) => Object.freeze({ ...failure })),
  ) as unknown as ControlledWindowDraftCleanupFailure[];
  return Object.freeze({
    ...result,
    failedClients,
    ...(result.currentWindowFallback
      ? { currentWindowFallback: Object.freeze({ ...result.currentWindowFallback }) }
      : {}),
  });
}

function failedCurrentWindowResult(reason: string): ControlledWindowDraftCleanupResult {
  return freezeControlledWindowResult({
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
  });
}

function currentWindowOnlyResult(
  reason: string,
  storage: SessionStorageCleanupTarget,
): ControlledWindowDraftCleanupResult {
  try {
    const cleanup = clearResearchQueryDrafts(storage);
    const localComplete = cleanup.failedDraftCount === 0;
    return freezeControlledWindowResult({
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
    });
  } catch {
    return failedCurrentWindowResult(reason);
  }
}

function parseControlledWindowCleanupResult(
  value: unknown,
  requestId: string,
): ControlledWindowDraftCleanupResult | null {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const acknowledgement = value as Record<string, unknown>;
    if (
      acknowledgement.type !== CONTROLLED_WINDOW_DRAFT_CLEANUP_RESULT ||
      acknowledgement.requestId !== requestId ||
      typeof acknowledgement.accepted !== "boolean" ||
      !protocolToken(acknowledgement.reason) ||
      !nonNegativeInteger(acknowledgement.requestedClientCount, MAX_CONTROLLED_CLIENT_COUNT) ||
      !nonNegativeInteger(acknowledgement.acknowledgedClientCount, MAX_CONTROLLED_CLIENT_COUNT) ||
      !nonNegativeInteger(acknowledgement.clearedClientCount, MAX_CONTROLLED_CLIENT_COUNT) ||
      !nonNegativeInteger(acknowledgement.matchedDraftCount) ||
      !nonNegativeInteger(acknowledgement.removedDraftCount) ||
      !nonNegativeInteger(acknowledgement.failedDraftCount) ||
      !Array.isArray(acknowledgement.failedClients) ||
      acknowledgement.failedClients.length > MAX_CONTROLLED_CLIENT_COUNT
    ) return null;

    const failedClients: ControlledWindowDraftCleanupFailure[] = [];
    const failedClientIds = new Set<string>();
    for (const candidate of acknowledgement.failedClients) {
      const failure = candidate as Record<string, unknown>;
      if (
        !candidate ||
        typeof candidate !== "object" ||
        Array.isArray(candidate) ||
        !protocolToken(failure.clientId) ||
        failedClientIds.has(failure.clientId) ||
        !protocolToken(failure.reason)
      ) return null;
      failedClientIds.add(failure.clientId);
      failedClients.push({
        clientId: failure.clientId,
        reason: failure.reason,
      });
    }

    const requestedClientCount = Number(acknowledgement.requestedClientCount);
    const acknowledgedClientCount = Number(acknowledgement.acknowledgedClientCount);
    const clearedClientCount = Number(acknowledgement.clearedClientCount);
    const matchedDraftCount = Number(acknowledgement.matchedDraftCount);
    const removedDraftCount = Number(acknowledgement.removedDraftCount);
    const failedDraftCount = Number(acknowledgement.failedDraftCount);
    if (
      requestedClientCount === 0 ||
      acknowledgedClientCount > requestedClientCount ||
      clearedClientCount > acknowledgedClientCount ||
      removedDraftCount + failedDraftCount !== matchedDraftCount ||
      failedClients.length !== requestedClientCount - clearedClientCount ||
      (acknowledgement.accepted === true && (
        acknowledgedClientCount !== requestedClientCount ||
        clearedClientCount !== requestedClientCount ||
        failedClients.length !== 0 ||
        failedDraftCount !== 0
      ))
    ) return null;

    return freezeControlledWindowResult({
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
    });
  } catch {
    return null;
  }
}

function postCleanupAcknowledgement(port: MessagePort, message: unknown): void {
  try {
    port.postMessage(message);
  } catch {
    // A response failure cannot be repaired locally and must not become a
    // window-level startup error.
  }
  try {
    port.close();
  } catch {
    // The service worker timeout remains the remote authoritative fallback.
  }
}

export function installControlledWindowDraftCleanupHandler(
  target: ServiceWorkerMessageTarget = navigator.serviceWorker,
  storage: SessionStorageCleanupTarget = window.sessionStorage,
): () => void {
  const listener: EventListener = (rawEvent) => {
    let responsePort: MessagePort | undefined;
    let requestId = "";
    try {
      const event = rawEvent as MessageEvent<Record<string, unknown>>;
      if (event.data?.type !== CONTROLLED_WINDOW_DRAFT_CLEANUP_REQUEST) return;
      responsePort = event.ports?.[0];
      if (!responsePort) return;
      requestId = protocolToken(event.data.requestId) ? event.data.requestId : "";
      if (!requestId) {
        postCleanupAcknowledgement(responsePort, {
          type: CONTROLLED_WINDOW_DRAFT_CLEANUP_ACK,
          requestId: "",
          accepted: false,
          reason: "PROTOCOL_MISMATCH",
          matchedDraftCount: 0,
          removedDraftCount: 0,
          failedDraftCount: 0,
        });
        return;
      }
      const cleanup: ResearchQueryDraftCleanupResult = clearResearchQueryDrafts(storage);
      postCleanupAcknowledgement(responsePort, {
        type: CONTROLLED_WINDOW_DRAFT_CLEANUP_ACK,
        requestId,
        accepted: cleanup.failedDraftCount === 0,
        reason: cleanup.failedDraftCount === 0 ? "DRAFTS_CLEARED" : "DRAFTS_PARTIALLY_CLEARED",
        ...cleanup,
      });
    } catch {
      if (!responsePort) return;
      postCleanupAcknowledgement(responsePort, {
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
  return () => {
    try {
      target.removeEventListener("message", listener);
    } catch {
      // Listener teardown is best effort during page disposal.
    }
  };
}

export async function clearControlledWindowResearchQueryDrafts(options: {
  serviceWorker?: ServiceWorkerControllerTarget | null;
  storage?: SessionStorageCleanupTarget;
  timeoutMs?: number;
  requestId?: string;
  createMessageChannel?: () => MessageChannel;
} = {}): Promise<ControlledWindowDraftCleanupResult> {
  let storage: SessionStorageCleanupTarget;
  try {
    storage = options?.storage ?? window.sessionStorage;
  } catch {
    return failedCurrentWindowResult("SESSION_STORAGE_UNAVAILABLE");
  }
  let serviceWorker: ServiceWorkerControllerTarget | null;
  try {
    serviceWorker = options?.serviceWorker ?? (
      typeof navigator !== "undefined" && "serviceWorker" in navigator
        ? navigator.serviceWorker
        : null
    );
  } catch {
    return currentWindowOnlyResult("SERVICE_WORKER_UNAVAILABLE", storage);
  }
  let controller: ServiceWorkerControllerTarget["controller"];
  try {
    controller = serviceWorker?.controller ?? null;
  } catch {
    return currentWindowOnlyResult("SERVICE_WORKER_CONTROLLER_UNREADABLE", storage);
  }
  if (!controller) return currentWindowOnlyResult("NO_SERVICE_WORKER_CONTROLLER", storage);

  let requestId: string | undefined;
  let createMessageChannel: (() => MessageChannel) | undefined;
  let timeoutMs: unknown;
  try {
    requestId = options?.requestId;
    createMessageChannel = options?.createMessageChannel;
    timeoutMs = options?.timeoutMs;
  } catch {
    return currentWindowOnlyResult("CLEANUP_OPTIONS_UNREADABLE", storage);
  }
  if (requestId === undefined) {
    try {
      requestId = globalThis.crypto?.randomUUID?.();
    } catch {
      return currentWindowOnlyResult("REQUEST_ID_UNAVAILABLE", storage);
    }
    if (requestId === undefined) {
      return currentWindowOnlyResult("REQUEST_ID_UNAVAILABLE", storage);
    }
  }
  if (!protocolToken(requestId)) {
    return currentWindowOnlyResult("INVALID_CLEANUP_REQUEST_ID", storage);
  }
  if (createMessageChannel !== undefined && typeof createMessageChannel !== "function") {
    return currentWindowOnlyResult("MESSAGE_CHANNEL_UNAVAILABLE", storage);
  }
  const createChannel = createMessageChannel ?? (() => new MessageChannel());
  let channel: MessageChannel;
  try {
    channel = createChannel();
    if (!channel?.port1 || !channel.port2) throw new TypeError("Invalid MessageChannel");
  } catch {
    return currentWindowOnlyResult("MESSAGE_CHANNEL_UNAVAILABLE", storage);
  }

  return new Promise((resolve) => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const finish = (result: ControlledWindowDraftCleanupResult) => {
      if (settled) return;
      settled = true;
      if (timeout !== null) globalThis.clearTimeout(timeout);
      for (const port of [channel.port1, channel.port2]) {
        try {
          port.onmessage = null;
          port.onmessageerror = null;
        } catch {
          // Continue closing both channel endpoints.
        }
        try {
          port.close();
        } catch {
          // A transferred or already-closed port must not prevent completion.
        }
      }
      resolve(freezeControlledWindowResult(result));
    };
    try {
      timeout = globalThis.setTimeout(() => {
        finish(currentWindowOnlyResult("SERVICE_WORKER_CLEANUP_TIMEOUT", storage));
      }, cleanupTimeout(timeoutMs));
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
        finish(freezeControlledWindowResult({
          ...parsed,
          currentWindowFallback: {
            matchedDraftCount: localFallback.matchedDraftCount,
            removedDraftCount: localFallback.removedDraftCount,
            failedDraftCount: localFallback.failedDraftCount,
          },
        }));
      };
      channel.port1.onmessageerror = () => {
        finish(currentWindowOnlyResult("SERVICE_WORKER_ACK_UNREADABLE", storage));
      };
      channel.port1.start();
      controller.postMessage({
        type: REQUEST_CONTROLLED_WINDOW_DRAFT_CLEANUP,
        requestId,
      }, [channel.port2]);
    } catch {
      finish(currentWindowOnlyResult("SERVICE_WORKER_POST_FAILED", storage));
    }
  });
}
