import { webcrypto } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createVedicCivilBrowserFactProjection } from "./worker-fact-projection.ts";
import {
  validateVedicCivilWorkerResponse
} from "./civil-client.ts";
import {
  resolveVedicCivilTimeBrowserFact,
  type VedicCivilBrowserReceipt
} from "./civil-time.ts";
import {
  VEDIC_CIVIL_BROWSER_WORKER_PROTOCOL_VERSION
} from "./constants.ts";
import {
  VEDIC_BROWSER_DST_POLICY_VERSION,
  VEDIC_BROWSER_EXACT_UNCERTAINTY_MODEL_ID,
  VEDIC_BROWSER_EXACT_UNCERTAINTY_MODEL_VERSION,
  VEDIC_BROWSER_EXACT_WALL_TIME_PRECISION_VERSION,
  VEDIC_BROWSER_FIXED_TZDB_SNAPSHOT_ID,
  VEDIC_BROWSER_INPUT_PROJECTION_VERSION,
  VEDIC_BROWSER_PROLEPTIC_GREGORIAN_VERSION
} from "./input-contract.ts";

beforeAll(() => {
  if (typeof globalThis.crypto?.subtle?.digest !== "function") {
    Object.defineProperty(globalThis, "crypto", {
      value: webcrypto,
      writable: true,
      configurable: true
    });
  }
});

const REQUEST = {
  projectionVersion: VEDIC_BROWSER_INPUT_PROJECTION_VERSION,
  civil_calendar_and_date: {
    calendar_id: "proleptic_gregorian",
    calendar_version: VEDIC_BROWSER_PROLEPTIC_GREGORIAN_VERSION,
    year: 2025,
    month: 3,
    day: 20
  },
  local_wall_time_and_precision: {
    wall_time_text: "17:01",
    precision_id: "exact_minute",
    precision_version: VEDIC_BROWSER_EXACT_WALL_TIME_PRECISION_VERSION
  },
  birth_time_uncertainty_interval_or_candidates: {
    representation: "exact",
    model_id: VEDIC_BROWSER_EXACT_UNCERTAINTY_MODEL_ID,
    model_version: VEDIC_BROWSER_EXACT_UNCERTAINTY_MODEL_VERSION
  },
  iana_time_zone_and_tzdb_identity: {
    iana_time_zone_id: "Asia/Shanghai",
    tzdb_version: "2026c",
    tzdb_snapshot_id: VEDIC_BROWSER_FIXED_TZDB_SNAPSHOT_ID
  },
  dst_ambiguity_policy: {
    policy_id: "vedic_adapter_draft_reject",
    policy_version: VEDIC_BROWSER_DST_POLICY_VERSION
  }
} as const;

async function projection() {
  const result = await resolveVedicCivilTimeBrowserFact(REQUEST);
  expect(result.outcome).toBe("resolved");
  if (result.outcome !== "resolved") throw new Error(result.code);
  return await createVedicCivilBrowserFactProjection(result as VedicCivilBrowserReceipt);
}

function workerAudit(): Record<string, unknown> {
  return {
    runtime: "dedicated_browser_worker",
    isolation: "fresh_worker_per_request",
    sourceReceiptBrandVerifiedBeforeProjection: true,
    structuredClonePreservesSourceBrand: false,
    persistence: "none",
    externalNetworkAccess: "not_runtime_verified_by_worker",
    productionEligible: false,
    expertTruthClaimed: false
  };
}

function successEnvelope(requestId: string, factProjection: unknown): Record<string, unknown> {
  return {
    protocolVersion: VEDIC_CIVIL_BROWSER_WORKER_PROTOCOL_VERSION,
    requestId,
    workerInstanceId: "worker-vedic-0001",
    ok: true,
    projection: factProjection,
    workerAudit: workerAudit()
  };
}

function failureEnvelope(requestId: string): Record<string, any> {
  return {
    protocolVersion: VEDIC_CIVIL_BROWSER_WORKER_PROTOCOL_VERSION,
    requestId,
    workerInstanceId: "worker-vedic-0002",
    ok: false,
    error: {
      code: "DST_GAP_REJECTED",
      stage: "dst_policy",
      partialFactsReturned: false
    }
  };
}

describe("Vedic civil-time Worker response boundary", () => {
  it("accepts one exact success response and preserves the fixed worker audit", async () => {
    const requestId = "request-vedic-0001";
    const factProjection = await projection();
    const outcome = await validateVedicCivilWorkerResponse(
      structuredClone(successEnvelope(requestId, factProjection)),
      requestId,
      factProjection.sourceReceipt.requestSha256
    );

    expect(outcome.projection.resolution).toMatchObject({
      utcInstant: "2025-03-20T09:01:00.000Z",
      utcOffsetSeconds: 28_800
    });
    expect(outcome.workerInstanceId).toBe("worker-vedic-0001");
    expect(outcome.audit).toEqual(workerAudit());
    expect(Object.isFrozen(outcome)).toBe(true);
    expect(Object.isFrozen(outcome.audit)).toBe(true);
  });

  it("preserves an allowlisted failure only when it returns no partial facts", async () => {
    const requestId = "request-vedic-0002";
    await expect(validateVedicCivilWorkerResponse(
      failureEnvelope(requestId),
      requestId,
      "0".repeat(64)
    )).rejects.toMatchObject({
      code: "DST_GAP_REJECTED",
      stage: "dst_policy"
    });
  });

  it("rejects audit drift before accepting a success projection", async () => {
    const requestId = "request-vedic-0003";
    const factProjection = await projection();
    const changed = successEnvelope(requestId, factProjection) as Record<string, any>;
    changed.workerAudit.externalNetworkAccess = "forbidden_by_worker";

    await expect(validateVedicCivilWorkerResponse(
      changed,
      requestId,
      factProjection.sourceReceipt.requestSha256
    )).rejects.toMatchObject({
      code: "WORKER_AUDIT_INVALID",
      stage: "worker_boundary"
    });
  });

  it("rejects partial facts and a code/stage pair outside the allowlist", async () => {
    const requestId = "request-vedic-0004";
    const partial = failureEnvelope(requestId);
    partial.error.partialFactsReturned = true;
    await expect(validateVedicCivilWorkerResponse(
      partial,
      requestId,
      "0".repeat(64)
    )).rejects.toMatchObject({
      code: "WORKER_PARTIAL_FACTS_FORBIDDEN",
      stage: "worker_boundary"
    });

    const mismatched = failureEnvelope(requestId);
    mismatched.error.stage = "tzdb_load";
    await expect(validateVedicCivilWorkerResponse(
      mismatched,
      requestId,
      "0".repeat(64)
    )).rejects.toMatchObject({
      code: "WORKER_PARTIAL_FACTS_FORBIDDEN",
      stage: "worker_boundary"
    });
  });

  it("rejects extra keys in success and failure responses", async () => {
    const requestId = "request-vedic-0005";
    const factProjection = await projection();
    const success = successEnvelope(requestId, factProjection) as Record<string, any>;
    success.extra = true;
    await expect(validateVedicCivilWorkerResponse(
      success,
      requestId,
      factProjection.sourceReceipt.requestSha256
    )).rejects.toMatchObject({
      code: "WORKER_SUCCESS_SHAPE_INVALID",
      stage: "worker_boundary"
    });

    const failure = failureEnvelope(requestId);
    failure.error.utcInstant = "2025-03-09T07:30:00.000Z";
    await expect(validateVedicCivilWorkerResponse(
      failure,
      requestId,
      "0".repeat(64)
    )).rejects.toMatchObject({
      code: "WORKER_FAILURE_DETAIL_SHAPE_INVALID",
      stage: "worker_boundary"
    });
  });

  it("rejects stale request identity before inspecting a success body", async () => {
    const factProjection = await projection();
    await expect(validateVedicCivilWorkerResponse(
      successEnvelope("request-stale", factProjection),
      "request-current",
      factProjection.sourceReceipt.requestSha256
    )).rejects.toMatchObject({
      code: "WORKER_RESPONSE_IDENTITY_INVALID",
      stage: "worker_boundary"
    });
  });
});
