import { webcrypto } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  validateVedicCivilBrowserFactProjection
} from "./browser-fact-projection.ts";
import { createVedicCivilBrowserFactProjection } from "./worker-fact-projection.ts";
import {
  resolveVedicCivilTimeBrowserFact,
  type VedicCivilBrowserReceipt
} from "./civil-time.ts";
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

async function genuineReceipt(): Promise<VedicCivilBrowserReceipt> {
  const result = await resolveVedicCivilTimeBrowserFact(REQUEST);
  expect(result.outcome).toBe("resolved");
  if (result.outcome !== "resolved") throw new Error(result.code);
  return result;
}

describe("Vedic civil-time browser fact projection", () => {
  it("accepts a structured-cloned projection and returns a new frozen exact-shape value", async () => {
    const projection = await createVedicCivilBrowserFactProjection(await genuineReceipt());
    const transferred = structuredClone(projection);
    const validated = await validateVedicCivilBrowserFactProjection(
      transferred,
      projection.sourceReceipt.requestSha256
    );

    expect(validated).toEqual(projection);
    expect(validated).not.toBe(transferred);
    expect(validated.resolution).toMatchObject({
      utcInstant: "2025-03-20T09:01:00.000Z",
      utcOffsetSeconds: 28_800
    });
    expect(validated.sourceReceipt).toMatchObject({
      sourceReceiptBrandVerifiedInWorker: true,
      structuredClonePreservesSourceBrand: false
    });
    expect(validated.projectGovernanceContext).toMatchObject({
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      publicDeploymentAuthorized: false
    });
    expect(validated.systemIdentity).toMatchObject({
      releaseIdentity: null,
      targetSchema: null,
      migrationId: null,
      legacyV13IdentityInherited: false
    });
    expect(Object.isFrozen(validated)).toBe(true);
    expect(Object.isFrozen(validated.resolution)).toBe(true);
  });

  it("rejects a cloned source receipt before it can create a worker projection", async () => {
    const receipt = await genuineReceipt();
    await expect(createVedicCivilBrowserFactProjection(structuredClone(receipt))).rejects.toMatchObject({
      code: "VEDIC_BROWSER_SOURCE_RECEIPT_BRAND_INVALID"
    });
  });

  it("rejects resolution tampering and final projection digest tampering", async () => {
    const projection = await createVedicCivilBrowserFactProjection(await genuineReceipt());
    const expectedRequestSha256 = projection.sourceReceipt.requestSha256;

    const resolutionTamper = structuredClone(projection) as Record<string, any>;
    resolutionTamper.resolution.utcOffsetSeconds = 0;
    await expect(validateVedicCivilBrowserFactProjection(
      resolutionTamper,
      expectedRequestSha256
    )).rejects.toMatchObject({ code: "VEDIC_BROWSER_RESOLUTION_INVALID" });

    const digestTamper = structuredClone(projection) as Record<string, any>;
    digestTamper.digests.browserProjectionSha256 = "0".repeat(64);
    await expect(validateVedicCivilBrowserFactProjection(
      digestTamper,
      expectedRequestSha256
    )).rejects.toMatchObject({ code: "VEDIC_BROWSER_PROJECTION_DIGEST_MISMATCH" });
  });

  it("rejects an internally consistent but non-renderable UTC offset before UI rendering", async () => {
    const projection = await createVedicCivilBrowserFactProjection(await genuineReceipt());
    const invalidOffset = structuredClone(projection) as Record<string, any>;
    invalidOffset.resolution.utcOffsetSeconds = 86_400;
    invalidOffset.resolution.epochMilliseconds =
      invalidOffset.resolution.localEpochMilliseconds - 86_400_000;
    invalidOffset.resolution.utcInstant =
      new Date(invalidOffset.resolution.epochMilliseconds).toISOString();

    await expect(validateVedicCivilBrowserFactProjection(
      invalidOffset,
      projection.sourceReceipt.requestSha256
    )).rejects.toMatchObject({ code: "VEDIC_BROWSER_RESOLUTION_INVALID" });
  });

  it("rejects an extra projection field and any authority promotion", async () => {
    const projection = await createVedicCivilBrowserFactProjection(await genuineReceipt());
    const expectedRequestSha256 = projection.sourceReceipt.requestSha256;

    const extra = structuredClone(projection) as Record<string, any>;
    extra.chart = {};
    await expect(validateVedicCivilBrowserFactProjection(extra, expectedRequestSha256)).rejects
      .toMatchObject({ code: "VEDIC_BROWSER_PROJECTION_SHAPE_INVALID" });

    const authorityFlip = structuredClone(projection) as Record<string, any>;
    authorityFlip.authorityBoundary.publicDeploymentAuthorized = true;
    await expect(validateVedicCivilBrowserFactProjection(
      authorityFlip,
      expectedRequestSha256
    )).rejects.toMatchObject({ code: "VEDIC_BROWSER_AUTHORITY_BOUNDARY_INVALID" });
  });

  it("rejects request digest replay even when the transferred projection is otherwise genuine", async () => {
    const projection = await createVedicCivilBrowserFactProjection(await genuineReceipt());
    await expect(validateVedicCivilBrowserFactProjection(
      structuredClone(projection),
      "f".repeat(64)
    )).rejects.toMatchObject({ code: "VEDIC_BROWSER_DECLARED_REQUEST_BINDING_MISMATCH" });
  });
});
