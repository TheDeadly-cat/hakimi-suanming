import { beforeAll, describe, expect, it } from "vitest";
import {
  BUNDLED_TZDB_SNAPSHOT_ID,
  RETAINED_TZDB_2025B_SNAPSHOT_ID
} from "../../../packages/tzdb-core/src/index.ts";
import {
  isWesternCivilTimeFactReceipt,
  resolveWesternCivilTimeFact,
  type WesternCivilTimeFactReceipt
} from "./civil-time.ts";
import civilInputContractSource from "../../../packages/western-astrology-contracts-draft/src/civil-input.ts?raw";
import civilTimeSource from "./civil-time.ts?raw";

beforeAll(() => {
  if (typeof globalThis.crypto?.subtle?.digest !== "function") {
    const host = globalThis as typeof globalThis & {
      process?: { getBuiltinModule?: (specifier: string) => unknown };
    };
    const cryptoModule = host.process?.getBuiltinModule?.("node:crypto") as
      { webcrypto?: Crypto } | undefined;
    if (typeof cryptoModule?.webcrypto?.subtle?.digest !== "function") {
      throw new Error("test host does not expose Web Crypto");
    }
    Object.defineProperty(globalThis, "crypto", {
      value: cryptoModule.webcrypto,
      writable: true,
      configurable: true
    });
  }
});

function request(overrides: Record<string, unknown> = {}) {
  const { input: inputOverrides, ...requestOverrides } = overrides;
  return {
    input: {
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
      sourceNote: "user-declared isolated fixture",
      ...(inputOverrides as object | undefined)
    },
    tzdbSnapshotId: BUNDLED_TZDB_SNAPSHOT_ID,
    ...requestOverrides
  };
}

async function receipt(value: unknown): Promise<WesternCivilTimeFactReceipt> {
  const result = await resolveWesternCivilTimeFact(value);
  expect(result.outcome).toBe("resolved");
  if (result.outcome !== "resolved") throw new Error(`expected receipt, got ${result.code}`);
  return result;
}

function collectKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (value === null || typeof value !== "object") return keys;
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === "string") {
      keys.add(key);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && "value" in descriptor) collectKeys(descriptor.value, keys);
    }
  }
  return keys;
}

function expectAllFalse(value: Record<string, boolean>): void {
  expect(Object.values(value).every((entry) => entry === false)).toBe(true);
}

describe("western civil-time fact browser draft", () => {
  it("resolves a unique civil wall time into a frozen, branded engineering fact receipt", async () => {
    const result = await receipt(request());

    expect(result).toMatchObject({
      outcome: "resolved",
      classification: "civil_time_engineering_fact_only",
      formalAdmissionStatus: "not_admitted_isolated_draft",
      resolution: {
        kind: "unique",
        decision: "unique",
        utcInstant: "2025-03-20T09:01:00.000Z",
        utcOffsetSeconds: 28_800,
        requestedLocalTimeRoundTripVerified: true
      },
      tzdbBinding: {
        snapshotId: BUNDLED_TZDB_SNAPSHOT_ID,
        ianaVersion: "2026c",
        dataSha256: "43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81"
      }
    });
    expect(result.authorityBoundary.canonicalZoneIdentityEstablished).toBe(false);
    expectAllFalse(result.authorityBoundary);
    expect(result.dataHandling).toMatchObject({
      handlingProfile: "no_log_no_persist_no_publish",
      candidateDigestIsAnonymous: false,
      safeToLog: false,
      safeToPersist: false,
      safeToPublish: false,
      loggingAuthorized: false,
      persistenceAuthorized: false,
      networkTransmissionAuthorized: false
    });
    expect(result.operationBoundary).toEqual({
      hostIntlUsed: false,
      hostTimeZoneDatabaseUsed: false,
      hostTimeZoneFallbackUsed: false,
      networkTransmissionPerformed: false,
      persistencePerformed: false,
      loggingPerformed: false,
      geocodingPerformed: false,
      mutationPerformed: false
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.resolution)).toBe(true);
    expect(Object.isFrozen(result.tzdbBinding.supportedRange)).toBe(true);
    expect(isWesternCivilTimeFactReceipt(result)).toBe(true);
  });

  it("uses asynchronous Web Crypto SHA-256 and preserves exact-second input", async () => {
    expect(typeof globalThis.crypto.subtle.digest).toBe("function");
    const first = await receipt(request({
      input: { time: "17:01:23", timePrecision: "exact_second" }
    }));
    const second = await receipt(request({
      input: { time: "17:01:23", timePrecision: "exact_second" }
    }));

    expect(first.resolution.utcInstant).toBe("2025-03-20T09:01:23.000Z");
    expect(first.civilTime.normalizedSecond).toBe(23);
    expect(first.digests).toEqual(second.digests);
    expect(first.digests).toMatchObject({
      algorithm: "SHA-256",
      implementation: "Web Crypto SubtleCrypto.digest",
      digestIsDigitalSignature: false
    });
    for (const digest of [
      first.digests.inputSha256,
      first.digests.requestSha256,
      first.digests.resolutionSha256,
      first.digests.receiptSha256
    ]) expect(digest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("takes a declarative request snapshot before the first await", async () => {
    const raw = request();
    const pending = resolveWesternCivilTimeFact(raw);
    raw.input.time = "00:00";
    raw.input.timeZone = "America/New_York";
    raw.tzdbSnapshotId = RETAINED_TZDB_2025B_SNAPSHOT_ID;

    const result = await pending;
    expect(result.outcome).toBe("resolved");
    if (result.outcome !== "resolved") throw new Error(result.code);
    expect(result.civilTime.time).toBe("17:01");
    expect(result.civilTime.timeZone).toBe("Asia/Shanghai");
    expect(result.tzdbBinding.snapshotId).toBe(BUNDLED_TZDB_SNAPSHOT_ID);
  });

  it("rejects DST gaps for every disambiguation policy without shifting the local time", async () => {
    for (const dstDisambiguation of ["reject", "earlier", "later"] as const) {
      const result = await resolveWesternCivilTimeFact(request({
        input: {
          date: "2025-03-09",
          time: "02:30",
          timeZone: "America/New_York",
          dstDisambiguation
        }
      }));
      expect(result).toMatchObject({
        outcome: "failed_closed",
        code: "DST_GAP_REJECTED",
        stage: "dst_policy",
        partialFactsReturned: false
      });
      expect(collectKeys(result).has("resolution")).toBe(false);
      expect(Object.isFrozen(result)).toBe(true);
    }
  });

  it("resolves overlap earlier/later by instant and rejects the reject policy", async () => {
    const overlap = {
      date: "2025-11-02",
      time: "01:30",
      timeZone: "America/New_York"
    };
    const earlier = await receipt(request({ input: { ...overlap, dstDisambiguation: "earlier" } }));
    const later = await receipt(request({ input: { ...overlap, dstDisambiguation: "later" } }));
    const rejected = await resolveWesternCivilTimeFact(request({
      input: { ...overlap, dstDisambiguation: "reject" }
    }));

    expect(earlier.resolution).toMatchObject({
      kind: "overlap",
      decision: "earlier",
      utcInstant: "2025-11-02T05:30:00.000Z",
      utcOffsetSeconds: -14_400,
      requestedLocalTimeRoundTripVerified: true
    });
    expect(later.resolution).toMatchObject({
      kind: "overlap",
      decision: "later",
      utcInstant: "2025-11-02T06:30:00.000Z",
      utcOffsetSeconds: -18_000,
      requestedLocalTimeRoundTripVerified: true
    });
    expect(earlier.resolution.epochMilliseconds).toBeLessThan(later.resolution.epochMilliseconds);
    expect(rejected).toMatchObject({
      outcome: "failed_closed",
      code: "DST_OVERLAP_REJECTED",
      stage: "dst_policy",
      partialFactsReturned: false
    });
  });

  it("binds the selected snapshot and never substitutes another registered snapshot", async () => {
    const base = request({
      input: { date: "2026-10-01", time: "12:00", timeZone: "Africa/Casablanca" }
    });
    const current = await receipt(base);
    const retained = await receipt({ ...base, tzdbSnapshotId: RETAINED_TZDB_2025B_SNAPSHOT_ID });

    expect(current.tzdbBinding).toMatchObject({
      snapshotId: BUNDLED_TZDB_SNAPSHOT_ID,
      ianaVersion: "2026c",
      dataSha256: "43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81"
    });
    expect(retained.tzdbBinding).toMatchObject({
      snapshotId: RETAINED_TZDB_2025B_SNAPSHOT_ID,
      ianaVersion: "2025b",
      dataSha256: "b1ad1446fbc94459f86c8e3f4ffadfc4170ad2af9cbd2a9b85c75d5436ce6425"
    });
    expect(current.resolution).toMatchObject({ utcInstant: "2026-10-01T12:00:00.000Z", utcOffsetSeconds: 0 });
    expect(retained.resolution).toMatchObject({ utcInstant: "2026-10-01T11:00:00.000Z", utcOffsetSeconds: 3_600 });
    expect(current.digests.requestSha256).not.toBe(retained.digests.requestSha256);
  });

  it("fails closed for unknown snapshot and unknown zone without fallback", async () => {
    const unknownSnapshot = await resolveWesternCivilTimeFact(request({
      tzdbSnapshotId: BUNDLED_TZDB_SNAPSHOT_ID.replace(
        /sha256:[a-f0-9]{64}/,
        `sha256:${"0".repeat(64)}`
      )
    }));
    const unknownZone = await resolveWesternCivilTimeFact(request({
      input: { timeZone: "Not/A_Real_Zone" }
    }));

    expect(unknownSnapshot).toMatchObject({
      outcome: "failed_closed",
      code: "TZDB_ARTIFACT_UNAVAILABLE",
      stage: "tzdb_load",
      partialFactsReturned: false
    });
    expect(unknownZone).toMatchObject({
      outcome: "failed_closed",
      code: "TZDB_UNKNOWN_ZONE",
      stage: "tzdb_resolution",
      partialFactsReturned: false
    });
  });

  it.each([
    [{ input: { date: "2025-02-29" } }, "invalid Gregorian date"],
    [{ input: { time: "17:01:00", timePrecision: "exact_minute" } }, "precision mismatch"],
    [{ input: { unexpected: true } }, "unexpected input key"],
    [{ unexpected: true }, "unexpected request key"],
    [{ input: { location: { label: "x", latitude: 91, longitude: 0, elevationMeters: null, precision: "coordinates" } } }, "invalid latitude"]
  ])("returns no partial facts for invalid input: %s (%s)", async (override, _label) => {
    const result = await resolveWesternCivilTimeFact(request(override as Record<string, unknown>));
    expect(result.outcome).toBe("failed_closed");
    if (result.outcome !== "failed_closed") throw new Error("expected failure");
    expect(result.partialFactsReturned).toBe(false);
    expect(collectKeys(result).has("resolution")).toBe(false);
    expect(isWesternCivilTimeFactReceipt(result)).toBe(false);
  });

  it("rejects accessors, custom prototypes, aliases, and cycles at the raw boundary", async () => {
    let getterCalls = 0;
    const accessor = request();
    Object.defineProperty(accessor.input, "sourceNote", {
      enumerable: true,
      configurable: true,
      get() {
        getterCalls += 1;
        return "must not execute";
      }
    });
    const customPrototype = request();
    Object.setPrototypeOf(customPrototype.input, { inherited: true });
    const alias = request();
    (alias.input as Record<string, unknown>).sourceNote = alias.input.location;
    const cycle = request();
    (cycle.input.location as Record<string, unknown>).cycle = cycle.input;

    for (const value of [accessor, customPrototype, alias, cycle]) {
      const result = await resolveWesternCivilTimeFact(value);
      expect(result).toMatchObject({
        outcome: "failed_closed",
        code: "INVALID_REQUEST_SHAPE",
        stage: "boundary_snapshot",
        partialFactsReturned: false
      });
    }
    expect(getterCalls).toBe(0);
  });

  it("brands only module-created receipts and rejects clones, spreads, and Proxy wrappers", async () => {
    const genuine = await receipt(request());
    const jsonClone = JSON.parse(JSON.stringify(genuine)) as unknown;
    const structured = structuredClone(genuine);
    const spread = { ...genuine };
    const wrapper = new Proxy(genuine, {});

    expect(isWesternCivilTimeFactReceipt(genuine)).toBe(true);
    for (const value of [jsonClone, structured, spread, wrapper]) {
      expect(isWesternCivilTimeFactReceipt(value)).toBe(false);
    }

    const originalHas = WeakSet.prototype.has;
    try {
      WeakSet.prototype.has = () => true;
      expect(isWesternCivilTimeFactReceipt(jsonClone)).toBe(false);
      expect(isWesternCivilTimeFactReceipt(genuine)).toBe(true);
    } finally {
      WeakSet.prototype.has = originalHas;
    }
  });

  it("fails closed before returning derived facts when Web Crypto is unavailable", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
    try {
      Object.defineProperty(globalThis, "crypto", {
        value: undefined,
        writable: true,
        configurable: true
      });
      const result = await resolveWesternCivilTimeFact(request());
      expect(result).toMatchObject({
        outcome: "failed_closed",
        code: "WEB_CRYPTO_UNAVAILABLE",
        stage: "digest",
        partialFactsReturned: false,
        dataHandling: { personDerivedDigestProduced: false }
      });
      expect(collectKeys(result).has("resolution")).toBe(false);
      expect(isWesternCivilTimeFactReceipt(result)).toBe(false);
    } finally {
      if (descriptor) Object.defineProperty(globalThis, "crypto", descriptor);
      else Reflect.deleteProperty(globalThis, "crypto");
    }
  });

  it("keeps the isolated source browser-compatible and the receipt civil-time-only", async () => {
    const source = civilTimeSource;
    const importSpecifiers = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1]);
    expect(source).not.toMatch(/from\s+["']node:/);
    expect(importSpecifiers).toEqual([
      "../../../packages/tzdb-core/src/index.ts",
      "../../../packages/western-astrology-contracts-draft/src/civil-input.ts"
    ]);
    expect(civilInputContractSource).not.toMatch(/\bephemeris\b|\bhouses?\b|\baspects?\b|interpretation/i);
    expect(source).not.toMatch(/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bsendBeacon\b/);
    expect(source).not.toMatch(/\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|\bcaches\b/);
    expect(source).not.toMatch(/\bhouses?\b|\baspects?\b/i);

    const result = await receipt(request());
    const keys = collectKeys(result);
    for (const forbidden of [
      "UT1", "TT", "TDB", "EOP", "RAMC", "ephemeris", "chart", "interpretation",
      "houses", "aspects", "mutationEpoch", "mutationEpochReceipt", "mutationEpochAvailable"
    ]) expect(keys.has(forbidden)).toBe(false);
  });
});
