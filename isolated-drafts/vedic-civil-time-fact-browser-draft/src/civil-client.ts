import {
  VEDIC_CIVIL_BROWSER_WORKER_PROTOCOL_VERSION
} from "./constants.ts";
import {
  validateVedicCivilBrowserFactProjection,
  type VedicCivilBrowserFactProjection
} from "./browser-fact-projection.ts";
import { prepareVedicCivilTimeBrowserRequest } from "./input-contract.ts";
import {
  VedicBrowserInputBoundaryError,
  captureVedicBrowserCloneData,
  type VedicBrowserCloneData
} from "./protocol.ts";

const WORKER_FAILURES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  INVALID_INPUT_PROJECTION: ["input_projection"],
  INVALID_GREGORIAN_WALL_TIME: ["gregorian_projection"],
  TZDB_SNAPSHOT_MISMATCH: ["tzdb_load"],
  TZDB_ARTIFACT_UNAVAILABLE: ["tzdb_load"],
  TZDB_ARTIFACT_DRIFT: ["tzdb_load"],
  TZDB_SUPPORTED_RANGE_REJECTED: ["supported_range"],
  TZDB_UNKNOWN_ZONE: ["tzdb_resolution"],
  TZDB_RESOLUTION_INVARIANT_FAILED: ["tzdb_resolution"],
  DST_GAP_REJECTED: ["dst_policy"],
  DST_OVERLAP_REJECTED: ["dst_policy"],
  DIGEST_FAILED: ["digest"],
  INTERNAL_FAILURE: ["input_projection", "gregorian_projection", "tzdb_load", "supported_range", "tzdb_resolution", "dst_policy", "digest", "receipt_construction"],
  SOURCE_RECEIPT_BRAND_MISMATCH: ["projection"],
  WORKER_REQUEST_OR_RUNTIME_INVALID: ["worker_boundary"]
});

const WORKER_TIMEOUT_MILLISECONDS = 15_000;

export class VedicCivilFactWorkerError extends Error {
  readonly code: string;
  readonly stage: string;

  constructor(code: string, stage: string) {
    super(code);
    this.name = "VedicCivilFactWorkerError";
    this.code = code;
    this.stage = stage;
  }
}

export type VedicCivilBrowserWorkerOutcome = Readonly<{
  projection: VedicCivilBrowserFactProjection;
  workerInstanceId: string;
  audit: Readonly<{
    runtime: "dedicated_browser_worker";
    isolation: "fresh_worker_per_request";
    sourceReceiptBrandVerifiedBeforeProjection: true;
    structuredClonePreservesSourceBrand: false;
    persistence: "none";
    externalNetworkAccess: "not_runtime_verified_by_worker";
    productionEligible: false;
    expertTruthClaimed: false;
  }>;
}>;

function requireRecord(value: VedicBrowserCloneData | undefined, code: string): Record<string, VedicBrowserCloneData> {
  if (value === undefined || value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new VedicCivilFactWorkerError(code, "worker_boundary");
  }
  return value;
}

function exactKeys(record: Record<string, VedicBrowserCloneData>, expected: readonly string[], code: string): void {
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new VedicCivilFactWorkerError(code, "worker_boundary");
  }
}

function requireString(value: VedicBrowserCloneData | undefined, code: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 240) {
    throw new VedicCivilFactWorkerError(code, "worker_boundary");
  }
  return value;
}

function isAllowedFailure(code: string, stage: string): boolean {
  return WORKER_FAILURES[code]?.includes(stage) === true;
}

export async function validateVedicCivilWorkerResponse(
  value: unknown,
  expectedRequestId: string,
  expectedRequestSha256: string
): Promise<VedicCivilBrowserWorkerOutcome> {
  let captured: VedicBrowserCloneData;
  try {
    captured = captureVedicBrowserCloneData(value);
  } catch (error) {
    const code = error instanceof VedicBrowserInputBoundaryError ? error.code : "WORKER_RESPONSE_CAPTURE_FAILED";
    throw new VedicCivilFactWorkerError(code, "worker_boundary");
  }
  const response = requireRecord(captured, "WORKER_RESPONSE_NOT_RECORD");
  const ok = response.ok;
  if (response.protocolVersion !== VEDIC_CIVIL_BROWSER_WORKER_PROTOCOL_VERSION
    || response.requestId !== expectedRequestId
    || typeof ok !== "boolean") {
    throw new VedicCivilFactWorkerError("WORKER_RESPONSE_IDENTITY_INVALID", "worker_boundary");
  }
  const workerInstanceId = requireString(response.workerInstanceId, "WORKER_INSTANCE_ID_INVALID");
  if (ok === false) {
    exactKeys(
      response,
      ["error", "ok", "protocolVersion", "requestId", "workerInstanceId"],
      "WORKER_FAILURE_SHAPE_INVALID"
    );
    const detail = requireRecord(response.error, "WORKER_FAILURE_DETAIL_NOT_RECORD");
    exactKeys(detail, ["code", "partialFactsReturned", "stage"], "WORKER_FAILURE_DETAIL_SHAPE_INVALID");
    const code = requireString(detail.code, "WORKER_FAILURE_CODE_INVALID");
    const stage = requireString(detail.stage, "WORKER_FAILURE_STAGE_INVALID");
    if (detail.partialFactsReturned !== false || !isAllowedFailure(code, stage)) {
      throw new VedicCivilFactWorkerError("WORKER_PARTIAL_FACTS_FORBIDDEN", "worker_boundary");
    }
    throw new VedicCivilFactWorkerError(code, stage);
  }
  exactKeys(
    response,
    ["ok", "projection", "protocolVersion", "requestId", "workerAudit", "workerInstanceId"],
    "WORKER_SUCCESS_SHAPE_INVALID"
  );
  const audit = requireRecord(response.workerAudit, "WORKER_AUDIT_NOT_RECORD");
  exactKeys(audit, [
    "expertTruthClaimed", "externalNetworkAccess", "isolation", "persistence", "productionEligible", "runtime",
    "sourceReceiptBrandVerifiedBeforeProjection", "structuredClonePreservesSourceBrand"
  ], "WORKER_AUDIT_SHAPE_INVALID");
  if (audit.runtime !== "dedicated_browser_worker"
    || audit.isolation !== "fresh_worker_per_request"
    || audit.sourceReceiptBrandVerifiedBeforeProjection !== true
    || audit.structuredClonePreservesSourceBrand !== false
    || audit.persistence !== "none"
    || audit.externalNetworkAccess !== "not_runtime_verified_by_worker"
    || audit.productionEligible !== false
    || audit.expertTruthClaimed !== false) {
    throw new VedicCivilFactWorkerError("WORKER_AUDIT_INVALID", "worker_boundary");
  }
  let projection: VedicCivilBrowserFactProjection;
  try {
    projection = await validateVedicCivilBrowserFactProjection(
      response.projection,
      expectedRequestSha256
    );
  } catch (error) {
    const code = error instanceof VedicBrowserInputBoundaryError
      ? error.code
      : "WORKER_PROJECTION_VALIDATION_FAILED";
    throw new VedicCivilFactWorkerError(code, "worker_boundary");
  }
  return Object.freeze({
    projection,
    workerInstanceId,
    audit: Object.freeze({
      runtime: "dedicated_browser_worker" as const,
      isolation: "fresh_worker_per_request" as const,
      sourceReceiptBrandVerifiedBeforeProjection: true as const,
      structuredClonePreservesSourceBrand: false as const,
      persistence: "none" as const,
      externalNetworkAccess: "not_runtime_verified_by_worker" as const,
      productionEligible: false as const,
      expertTruthClaimed: false as const
    })
  });
}

export async function runVedicCivilFactWorker(rawRequest: unknown): Promise<VedicCivilBrowserWorkerOutcome> {
  let prepared: Awaited<ReturnType<typeof prepareVedicCivilTimeBrowserRequest>>;
  try {
    prepared = await prepareVedicCivilTimeBrowserRequest(rawRequest);
  } catch (error) {
    const code = error instanceof VedicBrowserInputBoundaryError ? error.code : "WORKER_INPUT_PREPARATION_FAILED";
    throw new VedicCivilFactWorkerError(code, "input_boundary");
  }
  const requestId = crypto.randomUUID();
  const worker = new Worker(new URL("./civil-worker.ts", import.meta.url), {
    type: "module",
    name: `hakimi-vedic-civil-fact-${requestId}`
  });
  return await new Promise<VedicCivilBrowserWorkerOutcome>((resolve, reject) => {
    let settled = false;
    const settle = (callback: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      worker.terminate();
      callback();
    };
    const timeoutId = setTimeout(() => {
      settle(() => reject(new VedicCivilFactWorkerError("WORKER_TIMEOUT", "worker_boundary")));
    }, WORKER_TIMEOUT_MILLISECONDS);
    worker.addEventListener("message", (event: MessageEvent<unknown>) => {
      void validateVedicCivilWorkerResponse(event.data, requestId, prepared.requestSha256).then(
        (outcome) => settle(() => resolve(outcome)),
        (error) => settle(() => reject(error))
      );
    }, { once: true });
    worker.addEventListener("error", () => {
      settle(() => reject(new VedicCivilFactWorkerError("WORKER_RUNTIME_ERROR", "worker_boundary")));
    }, { once: true });
    worker.addEventListener("messageerror", () => {
      settle(() => reject(new VedicCivilFactWorkerError("WORKER_MESSAGE_ERROR", "worker_boundary")));
    }, { once: true });
    worker.postMessage({
      action: "resolve_vedic_civil_time",
      protocolVersion: VEDIC_CIVIL_BROWSER_WORKER_PROTOCOL_VERSION,
      requestId,
      request: prepared.request
    });
  });
}
