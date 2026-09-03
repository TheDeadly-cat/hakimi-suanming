import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BUNDLED_TZDB_SNAPSHOT_ID,
  RETAINED_TZDB_2025B_SNAPSHOT_ID
} from "@hakimi/tzdb-core";
import {
  isWesternCivilTimeEngineeringReceipt,
  resolveWesternCivilTimeInputDraft,
  summarizeWesternCivilTimeEngineeringReceipt,
  type WesternCivilTimeEngineeringReceipt
} from "./index.ts";

function request(overrides: Record<string, unknown> = {}) {
  const { input: inputOverrides, ...requestOverrides } = overrides;
  const input = {
    contractVersion: "0.1.0-draft.1",
    systemId: "western-astrology",
    calendar: "proleptic_gregorian",
    date: "2025-03-20",
    time: "17:01",
    timePrecision: "exact_minute",
    timeZone: "Asia/Shanghai",
    dstDisambiguation: "reject",
    location: {
      label: "declared location",
      latitude: 31.2304,
      longitude: 121.4737,
      elevationMeters: 4,
      precision: "coordinates"
    },
    birthSourceRef: "birth.record.alpha",
    sourceNote: "user-declared draft fixture",
    ...(inputOverrides as object | undefined)
  };
  return {
    input,
    tzdbSnapshotId: BUNDLED_TZDB_SNAPSHOT_ID,
    ...requestOverrides
  };
}

async function expectReceipt(value: unknown): Promise<WesternCivilTimeEngineeringReceipt> {
  const result = await resolveWesternCivilTimeInputDraft(value);
  expect(result.outcome).toBe("resolved");
  if (result.outcome !== "resolved") throw new Error(`expected receipt, got ${result.code}`);
  return result;
}

describe("western civil-time input adapter draft", () => {
  it("resolves a unique exact-minute wall time and freezes a fully identified engineering receipt", async () => {
    const receipt = await expectReceipt(request());

    expect(receipt.resolution).toMatchObject({
      kind: "unique",
      decision: "unique",
      utcInstant: "2025-03-20T09:01:00.000Z",
      utcOffsetSeconds: 28_800,
      utcInstantPrecision: "exact_minute",
      requestedLocalTimeRoundTripVerified: true
    });
    expect(receipt.tzdbBinding).toMatchObject({
      snapshotId: BUNDLED_TZDB_SNAPSHOT_ID,
      ianaVersion: "2026c",
      dataSha256: "43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81"
    });
    expect(receipt.location).toMatchObject({
      latitudeDegrees: 31.2304,
      longitudeDegrees: 121.4737,
      elevationMeters: 4,
      latitudeSignConvention: "north_positive",
      longitudeSignConvention: "east_positive",
      elevationReference: "not_declared_by_input_contract"
    });
    expect(Object.isFrozen(receipt)).toBe(true);
    expect(Object.isFrozen(receipt.resolution)).toBe(true);
    expect(Object.isFrozen(receipt.tzdbBinding.supportedRange)).toBe(true);
    expect(receipt.audit).toMatchObject({
      hostIntlUsed: false,
      hostTimeZoneDatabaseUsed: false,
      hostTimeZoneFallbackUsed: false,
      networkTransmissionPerformed: false,
      persistencePerformed: false,
      mutationPerformed: false,
      mutationEpoch: null
    });
    expect(receipt.dataHandling).toEqual({
      containsPersonalData: true,
      containsPersonDerivedBirthData: true,
      personDerivedDigest: true,
      safeToLog: false,
      safeToPersist: false,
      safeToPublish: false,
      persistenceAuthorized: false,
      retentionAuthorized: false,
      networkTransmissionAuthorized: false
    });
    expect((Object.values(receipt.authorityBoundary) as unknown[]).filter((value) => value === true)).toEqual([]);
  });

  it("preserves exact-second precision", async () => {
    const receipt = await expectReceipt(request({
      input: { time: "17:01:23", timePrecision: "exact_second" }
    }));
    expect(receipt.civilTime.normalizedSecond).toBe(23);
    expect(receipt.resolution.utcInstant).toBe("2025-03-20T09:01:23.000Z");
    expect(receipt.resolution.utcInstantPrecision).toBe("exact_second");
  });

  it("preserves a historical second-level offset without rounding to minutes", async () => {
    const receipt = await expectReceipt(request({
      input: { date: "1900-01-01", time: "00:00" }
    }));
    expect(receipt.resolution).toMatchObject({
      utcInstant: "1899-12-31T15:54:17.000Z",
      utcOffsetSeconds: 29_143,
      utcInstantPrecision: "exact_minute"
    });
  });

  it("uses the pre-await declarative snapshot even if the caller mutates the raw object immediately", async () => {
    const raw = request();
    const pending = resolveWesternCivilTimeInputDraft(raw);
    raw.input.time = "00:00";
    raw.input.location.latitude = -45;
    raw.tzdbSnapshotId = RETAINED_TZDB_2025B_SNAPSHOT_ID;
    const result = await pending;
    expect(result.outcome).toBe("resolved");
    if (result.outcome !== "resolved") throw new Error(result.code);
    expect(result.civilTime.time).toBe("17:01");
    expect(result.location.latitudeDegrees).toBe(31.2304);
    expect(result.tzdbBinding.snapshotId).toBe(BUNDLED_TZDB_SNAPSHOT_ID);
  });

  it("rejects a DST gap without shifting either candidate", async () => {
    const result = await resolveWesternCivilTimeInputDraft(request({
      input: {
        date: "2025-03-09",
        time: "02:30",
        timeZone: "America/New_York",
        dstDisambiguation: "later"
      }
    }));
    expect(result).toMatchObject({
      outcome: "failed_closed",
      code: "DST_GAP_REJECTED",
      stage: "dst_policy",
      partialResolutionReturned: false
    });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("selects overlap earlier/later by UTC instant and rejects reject-policy", async () => {
    const overlapInput = {
      date: "2025-11-02",
      time: "01:30",
      timeZone: "America/New_York"
    };
    const earlier = await expectReceipt(request({
      input: { ...overlapInput, dstDisambiguation: "earlier" }
    }));
    const later = await expectReceipt(request({
      input: { ...overlapInput, dstDisambiguation: "later" }
    }));
    const rejected = await resolveWesternCivilTimeInputDraft(request({
      input: { ...overlapInput, dstDisambiguation: "reject" }
    }));

    expect(earlier.resolution).toMatchObject({
      kind: "overlap",
      decision: "earlier",
      utcInstant: "2025-11-02T05:30:00.000Z",
      utcOffsetSeconds: -14_400
    });
    expect(later.resolution).toMatchObject({
      kind: "overlap",
      decision: "later",
      utcInstant: "2025-11-02T06:30:00.000Z",
      utcOffsetSeconds: -18_000
    });
    expect(earlier.resolution.epochMilliseconds).toBeLessThan(later.resolution.epochMilliseconds);
    expect(rejected).toMatchObject({ outcome: "failed_closed", code: "DST_OVERLAP_REJECTED" });
  });

  it("binds the exact retained/current snapshots and exposes their known Casablanca divergence", async () => {
    const base = request({
      input: {
        date: "2026-10-01",
        time: "12:00",
        timeZone: "Africa/Casablanca"
      }
    });
    const [current, retained, concurrentCurrent] = await Promise.all([
      expectReceipt(base),
      expectReceipt({ ...base, tzdbSnapshotId: RETAINED_TZDB_2025B_SNAPSHOT_ID }),
      expectReceipt(base)
    ]);
    const currentAfterRetained = await expectReceipt(base);

    expect(current.resolution).toMatchObject({ utcInstant: "2026-10-01T12:00:00.000Z", utcOffsetSeconds: 0 });
    expect(retained.resolution).toMatchObject({ utcInstant: "2026-10-01T11:00:00.000Z", utcOffsetSeconds: 3_600 });
    expect(current.tzdbBinding.ianaVersion).toBe("2026c");
    expect(retained.tzdbBinding.ianaVersion).toBe("2025b");
    expect(current.digests.requestSha256).not.toBe(retained.digests.requestSha256);
    expect(concurrentCurrent.digests).toEqual(current.digests);
    expect(currentAfterRetained.digests).toEqual(current.digests);
  });

  it("handles non-hour overlaps and rejects non-hour or whole-day gaps", async () => {
    const lordHoweEarlier = await expectReceipt(request({
      input: {
        date: "2024-04-07",
        time: "01:45",
        timeZone: "Australia/Lord_Howe",
        dstDisambiguation: "earlier"
      }
    }));
    const lordHoweLater = await expectReceipt(request({
      input: {
        date: "2024-04-07",
        time: "01:45",
        timeZone: "Australia/Lord_Howe",
        dstDisambiguation: "later"
      }
    }));
    const lordHoweGap = await resolveWesternCivilTimeInputDraft(request({
      input: {
        date: "2024-10-06",
        time: "02:15",
        timeZone: "Australia/Lord_Howe",
        dstDisambiguation: "earlier"
      }
    }));
    const apiaGap = await resolveWesternCivilTimeInputDraft(request({
      input: {
        date: "2011-12-30",
        time: "12:00",
        timeZone: "Pacific/Apia",
        dstDisambiguation: "later"
      }
    }));

    expect(lordHoweEarlier.resolution.epochMilliseconds).toBeLessThan(lordHoweLater.resolution.epochMilliseconds);
    expect(lordHoweLater.resolution.epochMilliseconds - lordHoweEarlier.resolution.epochMilliseconds).toBe(1_800_000);
    expect(lordHoweGap).toMatchObject({ outcome: "failed_closed", code: "DST_GAP_REJECTED" });
    expect(apiaGap).toMatchObject({ outcome: "failed_closed", code: "DST_GAP_REJECTED" });
  });

  it("applies proleptic Gregorian century leap rules and accepts the upper range endpoint", async () => {
    const invalid1900 = await resolveWesternCivilTimeInputDraft(request({ input: { date: "1900-02-29" } }));
    const valid2000 = await expectReceipt(request({ input: { date: "2000-02-29" } }));
    const invalid2100 = await resolveWesternCivilTimeInputDraft(request({ input: { date: "2100-02-29" } }));
    const upperEndpoint = await expectReceipt(request({ input: { date: "2100-12-31" } }));
    expect(invalid1900.outcome).toBe("failed_closed");
    expect(valid2000.civilTime.date).toBe("2000-02-29");
    expect(invalid2100.outcome).toBe("failed_closed");
    expect(upperEndpoint.civilTime.date).toBe("2100-12-31");
  });

  it("fails closed for an unknown or hash-drifted snapshot id without fallback", async () => {
    const result = await resolveWesternCivilTimeInputDraft(request({
      tzdbSnapshotId: BUNDLED_TZDB_SNAPSHOT_ID.replace(/sha256:[a-f0-9]{64}/, `sha256:${"0".repeat(64)}`)
    }));
    expect(result).toMatchObject({
      outcome: "failed_closed",
      code: "TZDB_ARTIFACT_UNAVAILABLE",
      stage: "tzdb_load"
    });
  });

  it.each([
    [{ input: { date: "2025-02-29" } }, "invalid Gregorian day"],
    [{ input: { time: "17:01:00", timePrecision: "exact_minute" } }, "precision mismatch"],
    [{ input: { timeZone: "Not/A_Real_Zone" } }, "unknown IANA zone"],
    [{ input: { location: { label: "x", latitude: 91, longitude: 0, elevationMeters: null, precision: "coordinates" } } }, "latitude range"],
    [{ input: { location: { label: "x", latitude: 0, longitude: 181, elevationMeters: null, precision: "coordinates" } } }, "longitude range"],
    [{ input: { location: { label: "x", latitude: 0, longitude: 0, elevationMeters: 10_001, precision: "coordinates" } } }, "elevation range"],
    [{ input: { location: { label: "x", latitude: -0, longitude: 0, elevationMeters: null, precision: "coordinates" } } }, "negative zero"],
    [{ input: { unexpected: true } }, "unexpected input key"],
    [{ unexpected: true }, "unexpected request key"]
  ])("fails closed for %s (%s)", async (override, _label) => {
    const result = await resolveWesternCivilTimeInputDraft(request(override as Record<string, unknown>));
    expect(result.outcome).toBe("failed_closed");
  });

  it("rejects an accessor without invoking its getter", async () => {
    let getterCalls = 0;
    const value = request();
    Object.defineProperty(value.input, "sourceNote", {
      enumerable: true,
      configurable: true,
      get() {
        getterCalls += 1;
        throw new Error("must not execute");
      }
    });

    const result = await resolveWesternCivilTimeInputDraft(value);
    expect(result).toMatchObject({ outcome: "failed_closed", code: "INVALID_REQUEST_SHAPE" });
    expect(getterCalls).toBe(0);
  });

  it("contains a throwing Proxy trap and does not leak an exception", async () => {
    let trapCalls = 0;
    const value = new Proxy(request(), {
      getPrototypeOf() {
        trapCalls += 1;
        throw new Error("hostile reflection trap");
      }
    });
    const result = await resolveWesternCivilTimeInputDraft(value);
    expect(result).toMatchObject({ outcome: "failed_closed", code: "INVALID_REQUEST_SHAPE" });
    expect(trapCalls).toBe(1);
  });

  it("rejects custom prototypes, symbols, aliases, and cycles", async () => {
    const customPrototype = request();
    Object.setPrototypeOf(customPrototype.input, { inherited: true });
    const withSymbol = request();
    Object.defineProperty(withSymbol.input, Symbol("hidden"), { enumerable: true, value: true });
    const aliased = request();
    (aliased.input as Record<string, unknown>).sourceNote = (aliased.input as Record<string, unknown>).location;
    const cyclic = request();
    (cyclic.input.location as Record<string, unknown>).cycle = cyclic.input;

    for (const value of [customPrototype, withSymbol, aliased, cyclic]) {
      const result = await resolveWesternCivilTimeInputDraft(value);
      expect(result).toMatchObject({ outcome: "failed_closed", code: "INVALID_REQUEST_SHAPE" });
    }
  });

  it("brands only module-created receipts; clones, wrappers, spreads, and forged digests fail", async () => {
    const receipt = await expectReceipt(request());
    const jsonClone = JSON.parse(JSON.stringify(receipt)) as unknown;
    const structuredCloneValue = structuredClone(receipt);
    const spread = { ...receipt };
    const wrapper = new Proxy(receipt, {});
    const forged = {
      ...jsonClone as object,
      digests: { ...(jsonClone as WesternCivilTimeEngineeringReceipt).digests }
    };

    expect(isWesternCivilTimeEngineeringReceipt(receipt)).toBe(true);
    for (const value of [jsonClone, structuredCloneValue, spread, wrapper, forged]) {
      expect(isWesternCivilTimeEngineeringReceipt(value)).toBe(false);
      expect(summarizeWesternCivilTimeEngineeringReceipt(value)).toBeNull();
    }

    const summary = summarizeWesternCivilTimeEngineeringReceipt(receipt);
    expect(summary).toMatchObject({
      receiptSha256: receipt.digests.receiptSha256,
      tzdbSnapshotId: BUNDLED_TZDB_SNAPSHOT_ID,
      utcInstant: "2025-03-20T09:01:00.000Z",
      containsPersonalData: true,
      personDerivedDigest: true,
      safeToLog: false,
      safeToPersist: false,
      safeToPublish: false,
      formalInputContractAdmitted: false,
      releaseReady: false,
      publicDeploymentAuthorized: false
    });
    expect(Object.isFrozen(summary)).toBe(true);
  });

  it("emits deterministic, domain-separated lowercase SHA-256 summaries", async () => {
    const first = await expectReceipt(request());
    const second = await expectReceipt(request());
    expect(first.digests).toEqual(second.digests);
    expect(first.digests.receiptSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(new Set([
      first.digests.inputSha256,
      first.digests.requestSha256,
      first.digests.resolutionSha256,
      first.digests.receiptSha256
    ]).size).toBe(4);
    expect(first.digests.digestIsDigitalSignature).toBe(false);
  });

  it("is private, export-closed, production-forbidden, network-free, and storage-free", () => {
    const packageRoot = resolve(process.cwd(), "packages/western-civil-time-input-adapter-draft");
    const packageJson = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8")) as {
      private?: boolean;
      exports?: unknown;
      dependencies?: Record<string, string>;
      [key: string]: unknown;
    };
    const source = readFileSync(resolve(packageRoot, "src/index.ts"), "utf8");
    const rootPackage = readFileSync(resolve(process.cwd(), "package.json"), "utf8");

    expect(packageRoot.replaceAll("\\", "/")).toMatch(/packages\/western-civil-time-input-adapter-draft\/?$/);
    expect(packageJson.private).toBe(true);
    expect(packageJson.exports).toEqual({});
    expect(packageJson["x-hakimi-isolated-draft"]).toMatchObject({
      productionImport: "forbidden",
      runtime: "node-test-only"
    });
    expect(packageJson.dependencies).toEqual({
      "@hakimi/tzdb-core": "0.1.0",
      "@hakimi/western-astrology-contracts-draft": "0.0.0-draft.0"
    });
    expect(rootPackage).not.toContain("western-civil-time-input-adapter-draft");
    expect(source).not.toMatch(/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bsendBeacon\b/);
    expect(source).not.toMatch(/\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|\bcaches\b/);
    expect(source).not.toMatch(/from\s+["']node:(?:fs|net|http|https)["']/);
    expect(source).not.toMatch(/from\s+["'][^"']*apps\/web/);
  });
});
