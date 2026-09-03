import { describe, expect, it } from "vitest";
import {
  WESTERN_CIVIL_BROWSER_FACT_DIGEST_DOMAIN,
  validateWesternCivilBrowserFactProjection
} from "./browser-fact-projection.ts";
import { createWesternCivilBrowserFactProjection } from "./worker-fact-projection.ts";
import {
  resolveWesternCivilTimeFact,
  type WesternCivilTimeFactReceipt
} from "./civil-time.ts";
import { sha256Canonical } from "./protocol.ts";

const SNAPSHOT_ID =
  "iana-tzdb@2026c/sha256:43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81" +
  "/hakimi-tzdb-core@1.0.0/moment-timezone@0.6.3";

const REQUEST = {
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
      label: "synthetic-browser-test",
      latitude: 31.2304,
      longitude: 121.4737,
      elevationMeters: null,
      precision: "coordinates"
    },
    birthSourceRef: "synthetic.browser-test",
    sourceNote: "Synthetic non-person browser-chain fixture."
  },
  tzdbSnapshotId: SNAPSHOT_ID
};

async function genuineReceipt(): Promise<WesternCivilTimeFactReceipt> {
  const result = await resolveWesternCivilTimeFact(REQUEST);
  expect(result.outcome).toBe("resolved");
  return result as WesternCivilTimeFactReceipt;
}

async function reseal(candidate: Record<string, any>): Promise<Record<string, any>> {
  const withoutFinalDigest = structuredClone(candidate);
  delete withoutFinalDigest.digests.browserProjectionSha256;
  candidate.digests.browserProjectionSha256 = await sha256Canonical(
    WESTERN_CIVIL_BROWSER_FACT_DIGEST_DOMAIN,
    withoutFinalDigest
  );
  return candidate;
}

describe("Western civil-time browser fact projection", () => {
  it("projects a genuine in-worker receipt and revalidates the transferred exact-shape facts", async () => {
    const projection = await createWesternCivilBrowserFactProjection(await genuineReceipt());
    const transferred = structuredClone(projection);
    const validated = await validateWesternCivilBrowserFactProjection(
      transferred,
      projection.sourceReceipt.requestSha256
    );
    expect(validated.resolution.utcInstant).toBe("2000-01-01T12:00:00.000Z");
    expect(validated.resolution.utcOffsetSeconds).toBe(28_800);
    expect(validated.declaredCivilTime.canonicalZoneIdentityEstablished).toBe(false);
    expect(validated.dataHandling.candidateDigestIsAnonymous).toBe(false);
    expect(validated.excludedProducts).toContain("houses");
    expect(validated.excludedProducts).toContain("astrological_content");
    expect(validated.authorityBoundary.baziAuthorityInherited).toBe(false);
    expect(validated.projectGovernanceContext).toEqual({
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    });
  });

  it("rejects a cloned or hash-bearing source receipt before projection", async () => {
    const receipt = await genuineReceipt();
    await expect(createWesternCivilBrowserFactProjection(structuredClone(receipt))).rejects
      .toThrow("SOURCE_RECEIPT_PRIVATE_BRAND_REQUIRED");
  });

  it("rejects authority flips, extra domain fields and projection digest tampering", async () => {
    const projection = structuredClone(await createWesternCivilBrowserFactProjection(await genuineReceipt()));
    const expectedRequestSha256 = projection.sourceReceipt.requestSha256;
    const authorityFlip = structuredClone(projection) as Record<string, any>;
    authorityFlip.authorityBoundary.releaseReady = true;
    await expect(validateWesternCivilBrowserFactProjection(authorityFlip, expectedRequestSha256)).rejects
      .toThrow("BROWSER_AUTHORITY_BOUNDARY_INVALID");

    const extraHouse = structuredClone(projection) as Record<string, any>;
    extraHouse.houses = [];
    await expect(validateWesternCivilBrowserFactProjection(extraHouse, expectedRequestSha256)).rejects
      .toThrow("BROWSER_PROJECTION_ROOT_SHAPE_INVALID");

    const digestTamper = structuredClone(projection) as Record<string, any>;
    digestTamper.resolution.utcOffsetSeconds = 0;
    await expect(validateWesternCivilBrowserFactProjection(digestTamper, expectedRequestSha256)).rejects
      .toThrow(/BROWSER_(RESOLUTION_ARITHMETIC_INVALID|PROJECTION_DIGEST_MISMATCH)/u);
  });

  it("rejects self-resealed redundant-fact contradictions and request replay", async () => {
    const projection = structuredClone(await createWesternCivilBrowserFactProjection(await genuineReceipt())) as Record<string, any>;
    const expectedRequestSha256 = projection.sourceReceipt.requestSha256 as string;

    const utcContradiction = await reseal(structuredClone(projection));
    utcContradiction.resolution.utcInstant = "1900-01-01T00:00:00.000Z";
    await reseal(utcContradiction);
    await expect(validateWesternCivilBrowserFactProjection(utcContradiction, expectedRequestSha256)).rejects
      .toThrow("BROWSER_RESOLUTION_UTC_INVALID");

    const decisionContradiction = structuredClone(projection) as Record<string, any>;
    decisionContradiction.resolution.decision = "earlier";
    await reseal(decisionContradiction);
    await expect(validateWesternCivilBrowserFactProjection(decisionContradiction, expectedRequestSha256)).rejects
      .toThrow("BROWSER_RESOLUTION_ARITHMETIC_INVALID");

    const unknownTzdb = structuredClone(projection) as Record<string, any>;
    unknownTzdb.tzdbBinding.snapshotId = `iana-tzdb@2099z/sha256:${"a".repeat(64)}/hakimi-tzdb-core@1.0.0/moment-timezone@0.6.3`;
    await reseal(unknownTzdb);
    await expect(validateWesternCivilBrowserFactProjection(unknownTzdb, expectedRequestSha256)).rejects
      .toThrow("BROWSER_TZDB_IDENTITY_INVALID");

    await expect(validateWesternCivilBrowserFactProjection(projection, "f".repeat(64))).rejects
      .toThrow("BROWSER_SOURCE_RECEIPT_INVALID");
  });

  it("rejects accessors without invoking them", async () => {
    let invoked = false;
    const malicious = Object.create(null);
    Object.defineProperty(malicious, "schemaVersion", {
      enumerable: true,
      get() {
        invoked = true;
        return "hakimi.western-civil-time-browser-facts/0.1-draft";
      }
    });
    await expect(validateWesternCivilBrowserFactProjection(malicious, "0".repeat(64))).rejects
      .toThrow(/BOUNDARY_/u);
    expect(invoked).toBe(false);
  });
});
