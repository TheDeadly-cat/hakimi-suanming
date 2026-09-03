import {
  WESTERN_CIVIL_BROWSER_TZDB_BINDINGS,
  validateWesternCivilBrowserFactProjection,
  type WesternCivilBrowserFactProjection
} from "./browser-fact-projection.ts";
import { westernBirthInputDraftSchema } from "../../../packages/western-astrology-contracts-draft/src/civil-input.ts";
import {
  WESTERN_CIVIL_WORKER_PROTOCOL_VERSION,
  captureStrictData,
  deepFreeze,
  requireExactKeys,
  requireRecord,
  requireString,
  sha256Canonical
} from "./protocol.ts";

const WORKER_TIMEOUT_MS = 15_000;
const SHA_OR_UUID_PATTERN = /^[a-zA-Z0-9-]{8,120}$/u;
const REQUEST_DIGEST_DOMAIN = "hakimi/western-civil-time-fact-browser-draft/request/v1";
const WORKER_FAILURE_STAGES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  INVALID_REQUEST_SHAPE: Object.freeze(["boundary_snapshot"]),
  INVALID_INPUT_CONTRACT: Object.freeze(["input_contract"]),
  INVALID_GREGORIAN_WALL_TIME: Object.freeze(["gregorian_projection"]),
  TZDB_ARTIFACT_UNAVAILABLE: Object.freeze(["tzdb_load"]),
  TZDB_ARTIFACT_DRIFT: Object.freeze(["tzdb_load"]),
  TZDB_UNKNOWN_ZONE: Object.freeze(["tzdb_resolution"]),
  TZDB_RESOLUTION_INVARIANT_FAILED: Object.freeze(["tzdb_resolution"]),
  DST_GAP_REJECTED: Object.freeze(["dst_policy"]),
  DST_OVERLAP_REJECTED: Object.freeze(["dst_policy"]),
  WEB_CRYPTO_UNAVAILABLE: Object.freeze(["digest"]),
  WEB_CRYPTO_FAILED: Object.freeze(["digest"]),
  INTERNAL_FAILURE: Object.freeze([
    "boundary_snapshot", "tzdb_load", "tzdb_resolution", "dst_policy", "digest", "receipt_construction"
  ]),
  SOURCE_RECEIPT_BRAND_MISMATCH: Object.freeze(["projection"]),
  WORKER_REQUEST_OR_RUNTIME_INVALID: Object.freeze(["worker_boundary"])
});

export class WesternCivilFactWorkerError extends Error {
  readonly code: string;
  readonly stage: string;

  constructor(code: string, stage: string) {
    super(code);
    this.name = "WesternCivilFactWorkerError";
    this.code = code;
    this.stage = stage;
  }
}

export type WesternCivilBrowserWorkerOutcome = Readonly<{
  projection: WesternCivilBrowserFactProjection;
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

export async function runWesternCivilFactWorker(
  rawRequest: unknown
): Promise<WesternCivilBrowserWorkerOutcome> {
  let preparedRequest: Readonly<{ input: unknown; tzdbSnapshotId: string }>;
  let expectedRequestSha256: string;
  try {
    preparedRequest = prepareWorkerRequest(rawRequest);
    expectedRequestSha256 = await sha256Canonical(REQUEST_DIGEST_DOMAIN, preparedRequest);
  } catch {
    throw new WesternCivilFactWorkerError("WORKER_REQUEST_BOUNDARY_INVALID", "worker_boundary");
  }
  const requestId = crypto.randomUUID();
  const worker = new Worker(new URL("./civil-worker.ts", import.meta.url), {
    type: "module",
    name: `hakimi-western-civil-facts-${requestId}`
  });
  return await new Promise((resolve, reject) => {
    let settled = false;
    let messageCount = 0;
    const timer = setTimeout(() => finish(new WesternCivilFactWorkerError("WORKER_TIMEOUT", "worker_runtime")), WORKER_TIMEOUT_MS);

    const finish = (failure: Error | null, value?: WesternCivilBrowserWorkerOutcome): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      if (failure) reject(failure);
      else if (value) resolve(value);
      else reject(new WesternCivilFactWorkerError("WORKER_EMPTY_RESPONSE", "worker_runtime"));
    };

    worker.addEventListener("message", (event: MessageEvent<unknown>) => {
      messageCount += 1;
      if (messageCount !== 1) {
        finish(new WesternCivilFactWorkerError("WORKER_MULTIPLE_RESPONSES", "worker_runtime"));
        return;
      }
      void validateWorkerResponse(event.data, requestId, expectedRequestSha256).then(
        (value) => finish(null, value),
        (cause) => finish(cause instanceof Error ? cause : new Error(String(cause)))
      );
    });
    worker.addEventListener("messageerror", () => {
      finish(new WesternCivilFactWorkerError("WORKER_UNREADABLE_RESPONSE", "worker_runtime"));
    }, { once: true });
    worker.addEventListener("error", () => {
      finish(new WesternCivilFactWorkerError("WORKER_RUNTIME_FAILURE", "worker_runtime"));
    }, { once: true });

    try {
      worker.postMessage({
        protocolVersion: WESTERN_CIVIL_WORKER_PROTOCOL_VERSION,
        action: "resolve_civil_time",
        requestId,
        request: preparedRequest
      });
    } catch {
      finish(new WesternCivilFactWorkerError("WORKER_POST_MESSAGE_FAILED", "worker_boundary"));
    }
  });
}

export async function validateWorkerResponse(
  candidate: unknown,
  requestId: string,
  expectedRequestSha256: string
): Promise<WesternCivilBrowserWorkerOutcome> {
  const captured = captureStrictData(candidate);
  const response = requireRecord(captured, "WORKER_RESPONSE_NOT_RECORD");
  if (response.protocolVersion !== WESTERN_CIVIL_WORKER_PROTOCOL_VERSION
    || response.requestId !== requestId
    || typeof response.workerInstanceId !== "string"
    || !SHA_OR_UUID_PATTERN.test(response.workerInstanceId)
    || typeof response.ok !== "boolean") {
    throw new WesternCivilFactWorkerError("WORKER_RESPONSE_IDENTITY_INVALID", "worker_boundary");
  }
  if (response.ok === false) {
    requireExactKeys(
      response,
      ["error", "ok", "protocolVersion", "requestId", "workerInstanceId"],
      "WORKER_FAILURE_SHAPE_INVALID"
    );
    const error = requireRecord(response.error, "WORKER_FAILURE_DETAIL_INVALID");
    requireExactKeys(error, ["code", "partialFactsReturned", "stage"], "WORKER_FAILURE_DETAIL_SHAPE_INVALID");
    const code = requireString(error.code, "WORKER_FAILURE_CODE_INVALID");
    const stage = requireString(error.stage, "WORKER_FAILURE_STAGE_INVALID");
    if (error.partialFactsReturned !== false || !isAllowedWorkerFailure(code, stage)) {
      throw new WesternCivilFactWorkerError("WORKER_PARTIAL_FACTS_FORBIDDEN", "worker_boundary");
    }
    throw new WesternCivilFactWorkerError(code, stage);
  }

  requireExactKeys(
    response,
    ["ok", "projection", "protocolVersion", "requestId", "workerAudit", "workerInstanceId"],
    "WORKER_SUCCESS_SHAPE_INVALID"
  );
  const audit = requireRecord(response.workerAudit, "WORKER_AUDIT_NOT_RECORD");
  requireExactKeys(audit, [
    "expertTruthClaimed",
    "externalNetworkAccess",
    "isolation",
    "persistence",
    "productionEligible",
    "runtime",
    "sourceReceiptBrandVerifiedBeforeProjection",
    "structuredClonePreservesSourceBrand"
  ], "WORKER_AUDIT_SHAPE_INVALID");
  if (audit.runtime !== "dedicated_browser_worker"
    || audit.isolation !== "fresh_worker_per_request"
    || audit.sourceReceiptBrandVerifiedBeforeProjection !== true
    || audit.structuredClonePreservesSourceBrand !== false
    || audit.persistence !== "none"
    || audit.externalNetworkAccess !== "not_runtime_verified_by_worker"
    || audit.productionEligible !== false
    || audit.expertTruthClaimed !== false) {
    throw new WesternCivilFactWorkerError("WORKER_AUDIT_INVALID", "worker_boundary");
  }
  const projection = await validateWesternCivilBrowserFactProjection(response.projection, expectedRequestSha256);
  return Object.freeze({
    projection,
    workerInstanceId: response.workerInstanceId,
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

function prepareWorkerRequest(rawRequest: unknown): Readonly<{ input: unknown; tzdbSnapshotId: string }> {
  const captured = captureStrictData(rawRequest);
  const request = requireRecord(captured, "WORKER_REQUEST_NOT_RECORD");
  requireExactKeys(request, ["input", "tzdbSnapshotId"], "WORKER_REQUEST_SHAPE_INVALID");
  const parsedInput = westernBirthInputDraftSchema.safeParse(request.input);
  const tzdbSnapshotId = requireString(request.tzdbSnapshotId, "WORKER_TZDB_SNAPSHOT_INVALID");
  if (!parsedInput.success
    || !WESTERN_CIVIL_BROWSER_TZDB_BINDINGS.some((entry) => entry.snapshotId === tzdbSnapshotId)) {
    throw new WesternCivilFactWorkerError("WORKER_REQUEST_CONTRACT_INVALID", "worker_boundary");
  }
  return deepFreeze({ input: parsedInput.data, tzdbSnapshotId });
}

function isAllowedWorkerFailure(code: string, stage: string): boolean {
  const stages = WORKER_FAILURE_STAGES[code];
  return stages !== undefined && stages.includes(stage);
}
