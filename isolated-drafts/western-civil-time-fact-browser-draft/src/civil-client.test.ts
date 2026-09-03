import { describe, expect, it } from "vitest";
import { createWesternCivilBrowserFactProjection } from "./worker-fact-projection.ts";
import {
  runWesternCivilFactWorker,
  validateWorkerResponse,
  WesternCivilFactWorkerError
} from "./civil-client.ts";
import {
  resolveWesternCivilTimeFact,
  type WesternCivilTimeFactReceipt
} from "./civil-time.ts";
import { WESTERN_CIVIL_WORKER_PROTOCOL_VERSION } from "./protocol.ts";

const SNAPSHOT_ID =
  "iana-tzdb@2026c/sha256:43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81" +
  "/hakimi-tzdb-core@1.0.0/moment-timezone@0.6.3";

async function projection() {
  const result = await resolveWesternCivilTimeFact({
    input: {
      contractVersion: "0.1.0-draft.1",
      systemId: "western-astrology",
      calendar: "proleptic_gregorian",
      date: "2000-01-01",
      time: "20:00",
      timePrecision: "exact_minute",
      timeZone: "Asia/Shanghai",
      dstDisambiguation: "reject",
      location: {
        label: "synthetic-client-test",
        latitude: 0,
        longitude: 0,
        elevationMeters: null,
        precision: "coordinates"
      },
      birthSourceRef: "synthetic.client-test",
      sourceNote: "Synthetic non-person fixture."
    },
    tzdbSnapshotId: SNAPSHOT_ID
  });
  expect(result.outcome).toBe("resolved");
  return createWesternCivilBrowserFactProjection(result as WesternCivilTimeFactReceipt);
}

function successEnvelope(requestId: string, factProjection: unknown) {
  return {
    protocolVersion: WESTERN_CIVIL_WORKER_PROTOCOL_VERSION,
    requestId,
    workerInstanceId: "worker-00000001",
    ok: true,
    projection: factProjection,
    workerAudit: {
      runtime: "dedicated_browser_worker",
      isolation: "fresh_worker_per_request",
      sourceReceiptBrandVerifiedBeforeProjection: true,
      structuredClonePreservesSourceBrand: false,
      persistence: "none",
      externalNetworkAccess: "not_runtime_verified_by_worker",
      productionEligible: false,
      expertTruthClaimed: false
    }
  };
}

describe("Western civil-time Worker response boundary", () => {
  it("rejects request accessors before structured clone can invoke them", async () => {
    let invoked = false;
    const request = {
      get input() {
        invoked = true;
        return {};
      },
      tzdbSnapshotId: SNAPSHOT_ID
    };
    await expect(runWesternCivilFactWorker(request)).rejects.toMatchObject({
      code: "WORKER_REQUEST_BOUNDARY_INVALID",
      stage: "worker_boundary"
    });
    expect(invoked).toBe(false);
  });

  it("accepts a transferred fact projection with exact request and audit identity", async () => {
    const requestId = "request-00000001";
    const factProjection = await projection();
    const outcome = await validateWorkerResponse(
      structuredClone(successEnvelope(requestId, factProjection)),
      requestId,
      factProjection.sourceReceipt.requestSha256
    );
    expect(outcome.projection.resolution.utcInstant).toBe("2000-01-01T12:00:00.000Z");
    expect(outcome.audit.persistence).toBe("none");
  });

  it("rejects stale request identity and any authority-changing response", async () => {
    const requestId = "request-00000002";
    const factProjection = await projection();
    await expect(validateWorkerResponse(
      successEnvelope("request-stale", factProjection),
      requestId,
      factProjection.sourceReceipt.requestSha256
    )).rejects.toThrow("WORKER_RESPONSE_IDENTITY_INVALID");

    const changed = structuredClone(factProjection) as Record<string, any>;
    changed.authorityBoundary.publicDeploymentAuthorized = true;
    await expect(validateWorkerResponse(
      successEnvelope(requestId, changed),
      requestId,
      factProjection.sourceReceipt.requestSha256
    )).rejects
      .toThrow("BROWSER_AUTHORITY_BOUNDARY_INVALID");
  });

  it("preserves failure codes only when partial facts are explicitly absent", async () => {
    const requestId = "request-00000003";
    const failure = {
      protocolVersion: WESTERN_CIVIL_WORKER_PROTOCOL_VERSION,
      requestId,
      workerInstanceId: "worker-00000003",
      ok: false,
      error: { code: "DST_GAP_REJECTED", stage: "dst_policy", partialFactsReturned: false }
    };
    await expect(validateWorkerResponse(failure, requestId, "0".repeat(64))).rejects.toMatchObject({
      code: "DST_GAP_REJECTED",
      stage: "dst_policy"
    });
    const leaking = structuredClone(failure);
    leaking.error.partialFactsReturned = true;
    await expect(validateWorkerResponse(leaking, requestId, "0".repeat(64))).rejects
      .toThrow("WORKER_PARTIAL_FACTS_FORBIDDEN");

    const smuggled = structuredClone(failure);
    smuggled.error.code = "DST_GAP_REJECTED|utc=2000-01-01T00:00:00.000Z";
    await expect(validateWorkerResponse(smuggled, requestId, "0".repeat(64))).rejects
      .toThrow("WORKER_PARTIAL_FACTS_FORBIDDEN");
  });
});
