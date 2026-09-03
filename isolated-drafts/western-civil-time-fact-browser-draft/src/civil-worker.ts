/// <reference lib="webworker" />

import {
  isWesternCivilTimeFactReceipt,
  resolveWesternCivilTimeFact
} from "./civil-time.ts";
import { createWesternCivilBrowserFactProjection } from "./worker-fact-projection.ts";
import {
  WESTERN_CIVIL_WORKER_PROTOCOL_VERSION,
  captureStrictData,
  requireExactKeys,
  requireRecord,
  requireString
} from "./protocol.ts";

const workerScope = self as DedicatedWorkerGlobalScope;

const WORKER_AUDIT = Object.freeze({
  runtime: "dedicated_browser_worker" as const,
  isolation: "fresh_worker_per_request" as const,
  sourceReceiptBrandVerifiedBeforeProjection: true,
  structuredClonePreservesSourceBrand: false,
  persistence: "none" as const,
  externalNetworkAccess: "not_runtime_verified_by_worker" as const,
  productionEligible: false,
  expertTruthClaimed: false
});

let messageHandled = false;

workerScope.addEventListener("message", (event: MessageEvent<unknown>) => {
  if (messageHandled) return;
  messageHandled = true;
  void handleRequest(event.data);
});

async function handleRequest(candidate: unknown): Promise<void> {
  const workerInstanceId = crypto.randomUUID();
  let requestId: string | null = null;
  try {
    const captured = captureStrictData(candidate);
    const envelope = requireRecord(captured, "WORKER_REQUEST_NOT_RECORD");
    requireExactKeys(
      envelope,
      ["action", "protocolVersion", "request", "requestId"],
      "WORKER_REQUEST_SHAPE_INVALID"
    );
    if (envelope.protocolVersion !== WESTERN_CIVIL_WORKER_PROTOCOL_VERSION
      || envelope.action !== "resolve_civil_time") {
      throw new Error("WORKER_PROTOCOL_MISMATCH");
    }
    requestId = requireString(envelope.requestId, "WORKER_REQUEST_ID_INVALID");
    if (requestId.length > 120) throw new Error("WORKER_REQUEST_ID_INVALID");

    const result = await resolveWesternCivilTimeFact(envelope.request);
    if (result.outcome === "failed_closed") {
      postFailure(workerInstanceId, requestId, result.code, result.stage);
      return;
    }
    if (!isWesternCivilTimeFactReceipt(result)) {
      postFailure(workerInstanceId, requestId, "SOURCE_RECEIPT_BRAND_MISMATCH", "projection");
      return;
    }
    const projection = await createWesternCivilBrowserFactProjection(result);
    workerScope.postMessage({
      protocolVersion: WESTERN_CIVIL_WORKER_PROTOCOL_VERSION,
      requestId,
      workerInstanceId,
      ok: true,
      projection,
      workerAudit: WORKER_AUDIT
    });
  } catch {
    postFailure(workerInstanceId, requestId, "WORKER_REQUEST_OR_RUNTIME_INVALID", "worker_boundary");
    return;
  } finally {
    workerScope.close();
  }
}

function postFailure(
  workerInstanceId: string,
  requestId: string | null,
  code: string,
  stage: string
): void {
  workerScope.postMessage({
    protocolVersion: WESTERN_CIVIL_WORKER_PROTOCOL_VERSION,
    requestId,
    workerInstanceId,
    ok: false,
    error: {
      code,
      stage,
      partialFactsReturned: false
    }
  });
}
