/// <reference lib="webworker" />

import {
  VEDIC_CIVIL_BROWSER_WORKER_PROTOCOL_VERSION
} from "./constants.ts";
import { createVedicCivilBrowserFactProjection } from "./worker-fact-projection.ts";
import {
  isVedicCivilBrowserReceipt,
  resolveVedicCivilTimeBrowserFact
} from "./civil-time.ts";
import {
  captureVedicBrowserCloneData,
  type VedicBrowserCloneData
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

let handled = false;

workerScope.addEventListener("message", (event: MessageEvent<unknown>) => {
  if (handled) return;
  handled = true;
  void handleRequest(event.data);
});

function requireRecord(value: VedicBrowserCloneData | undefined): Record<string, VedicBrowserCloneData> {
  if (value === undefined || value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("WORKER_REQUEST_NOT_RECORD");
  }
  return value;
}

function exactKeys(record: Record<string, VedicBrowserCloneData>, expected: readonly string[]): void {
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error("WORKER_REQUEST_SHAPE_INVALID");
  }
}

async function handleRequest(value: unknown): Promise<void> {
  const workerInstanceId = crypto.randomUUID();
  let requestId: string | null = null;
  try {
    const envelope = requireRecord(captureVedicBrowserCloneData(value));
    exactKeys(envelope, ["action", "protocolVersion", "request", "requestId"]);
    if (envelope.action !== "resolve_vedic_civil_time"
      || envelope.protocolVersion !== VEDIC_CIVIL_BROWSER_WORKER_PROTOCOL_VERSION
      || typeof envelope.requestId !== "string"
      || envelope.requestId.length === 0
      || envelope.requestId.length > 120) {
      throw new Error("WORKER_PROTOCOL_MISMATCH");
    }
    requestId = envelope.requestId;
    const result = await resolveVedicCivilTimeBrowserFact(envelope.request);
    if (result.outcome === "failed_closed") {
      postFailure(workerInstanceId, requestId, result.code, result.stage);
      return;
    }
    if (!isVedicCivilBrowserReceipt(result)) {
      postFailure(workerInstanceId, requestId, "SOURCE_RECEIPT_BRAND_MISMATCH", "projection");
      return;
    }
    const projection = await createVedicCivilBrowserFactProjection(result);
    workerScope.postMessage({
      protocolVersion: VEDIC_CIVIL_BROWSER_WORKER_PROTOCOL_VERSION,
      requestId,
      workerInstanceId,
      ok: true,
      projection,
      workerAudit: WORKER_AUDIT
    });
  } catch {
    postFailure(workerInstanceId, requestId, "WORKER_REQUEST_OR_RUNTIME_INVALID", "worker_boundary");
  } finally {
    workerScope.close();
  }
}

function postFailure(workerInstanceId: string, requestId: string | null, code: string, stage: string): void {
  workerScope.postMessage({
    protocolVersion: VEDIC_CIVIL_BROWSER_WORKER_PROTOCOL_VERSION,
    requestId,
    workerInstanceId,
    ok: false,
    error: { code, stage, partialFactsReturned: false }
  });
}
