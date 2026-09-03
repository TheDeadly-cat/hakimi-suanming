import { webcrypto } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  isVedicCivilTimeResolutionCandidate,
  resolveVedicCivilTimeInputResolutionDraft,
  type VedicCivilTimeResolutionCandidate
} from "../../vedic-civil-time-input-resolution-draft/src/index.ts";
import {
  isVedicCivilBrowserReceipt,
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

type Overrides = Record<string, unknown>;

function request(overrides: Overrides = {}): Record<string, any> {
  const {
    civil_calendar_and_date: calendarOverrides,
    local_wall_time_and_precision: wallTimeOverrides,
    birth_time_uncertainty_interval_or_candidates: uncertaintyOverrides,
    iana_time_zone_and_tzdb_identity: zoneOverrides,
    dst_ambiguity_policy: policyOverrides,
    ...rootOverrides
  } = overrides;
  return {
    projectionVersion: VEDIC_BROWSER_INPUT_PROJECTION_VERSION,
    civil_calendar_and_date: {
      calendar_id: "proleptic_gregorian",
      calendar_version: VEDIC_BROWSER_PROLEPTIC_GREGORIAN_VERSION,
      year: 2025,
      month: 3,
      day: 20,
      ...(calendarOverrides as object | undefined)
    },
    local_wall_time_and_precision: {
      wall_time_text: "17:01",
      precision_id: "exact_minute",
      precision_version: VEDIC_BROWSER_EXACT_WALL_TIME_PRECISION_VERSION,
      ...(wallTimeOverrides as object | undefined)
    },
    birth_time_uncertainty_interval_or_candidates: {
      representation: "exact",
      model_id: VEDIC_BROWSER_EXACT_UNCERTAINTY_MODEL_ID,
      model_version: VEDIC_BROWSER_EXACT_UNCERTAINTY_MODEL_VERSION,
      ...(uncertaintyOverrides as object | undefined)
    },
    iana_time_zone_and_tzdb_identity: {
      iana_time_zone_id: "Asia/Shanghai",
      tzdb_version: "2026c",
      tzdb_snapshot_id: VEDIC_BROWSER_FIXED_TZDB_SNAPSHOT_ID,
      ...(zoneOverrides as object | undefined)
    },
    dst_ambiguity_policy: {
      policy_id: "vedic_adapter_draft_reject",
      policy_version: VEDIC_BROWSER_DST_POLICY_VERSION,
      ...(policyOverrides as object | undefined)
    },
    ...rootOverrides
  };
}

async function browserReceipt(value: unknown): Promise<VedicCivilBrowserReceipt> {
  const result = await resolveVedicCivilTimeBrowserFact(value);
  expect(result.outcome).toBe("resolved");
  if (result.outcome !== "resolved") throw new Error(`expected receipt, got ${result.code}`);
  return result;
}

async function nodeCandidate(value: unknown): Promise<VedicCivilTimeResolutionCandidate> {
  const result = await resolveVedicCivilTimeInputResolutionDraft(value);
  expect(result.outcome).toBe("resolved_candidate");
  if (result.outcome !== "resolved_candidate") throw new Error(`expected candidate, got ${result.code}`);
  return result;
}

function collectKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (value === null || typeof value !== "object") return keys;
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") continue;
    keys.add(key);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && "value" in descriptor) collectKeys(descriptor.value, keys);
  }
  return keys;
}

function commonResolution(value: {
  resolution: {
    kind: string;
    decision: string;
    localEpochMilliseconds: number;
    epochMilliseconds: number;
    utcInstant: string;
    utcOffsetSeconds: number;
    requestedLocalTimeRoundTripVerified: boolean;
    utcOffsetRoundTripVerified: boolean;
  };
}): unknown {
  return {
    kind: value.resolution.kind,
    decision: value.resolution.decision,
    localEpochMilliseconds: value.resolution.localEpochMilliseconds,
    epochMilliseconds: value.resolution.epochMilliseconds,
    utcInstant: value.resolution.utcInstant,
    utcOffsetSeconds: value.resolution.utcOffsetSeconds,
    requestedLocalTimeRoundTripVerified: value.resolution.requestedLocalTimeRoundTripVerified,
    utcOffsetRoundTripVerified: value.resolution.utcOffsetRoundTripVerified
  };
}

function commonTzdbBinding(value: {
  snapshotId: string;
  schemaVersion: string;
  kind: string;
  ianaVersion: string;
  artifactName: string;
  dataSha256: string;
  resolver: unknown;
  adapter: unknown;
  supportedRange: { from: string; to: string };
}): unknown {
  return {
    snapshotId: value.snapshotId,
    schemaVersion: value.schemaVersion,
    kind: value.kind,
    ianaVersion: value.ianaVersion,
    artifactName: value.artifactName,
    dataSha256: value.dataSha256,
    resolver: value.resolver,
    adapter: value.adapter,
    supportedRange: {
      from: value.supportedRange.from,
      to: value.supportedRange.to
    }
  };
}

describe("Vedic civil-time fact browser resolver", () => {
  it("resolves a unique minute input into a frozen branded fact-only receipt", async () => {
    const receipt = await browserReceipt(request());

    expect(receipt).toMatchObject({
      outcome: "resolved",
      classification: "vedic_civil_time_engineering_fact_only",
      formalAdmissionStatus: "not_admitted_isolated_draft",
      declaredCivilTime: {
        date: "2025-03-20",
        time: "17:01",
        timePrecision: "exact_minute",
        timeZoneToken: "Asia/Shanghai",
        normalizedSecond: 0
      },
      resolution: {
        kind: "unique",
        decision: "unique",
        utcInstant: "2025-03-20T09:01:00.000Z",
        utcOffsetSeconds: 28_800,
        requestedLocalTimeRoundTripVerified: true,
        utcOffsetRoundTripVerified: true
      },
      inputScope: { requirementsResolved: 0 },
      authorityBoundary: {
        formalInputContractAdmitted: false,
        factReceiptIssued: false,
        releaseReady: false,
        publicDeploymentAuthorized: false
      }
    });
    expect(receipt.digests.receiptSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(receipt.operationBoundary.externalNetworkAccess).toBe("not_runtime_verified_by_worker");
    expect(Object.isFrozen(receipt)).toBe(true);
    expect(Object.isFrozen(receipt.resolution)).toBe(true);
    expect(isVedicCivilBrowserReceipt(receipt)).toBe(true);
    expect(isVedicCivilBrowserReceipt(structuredClone(receipt))).toBe(false);
  });

  it("preserves exact seconds and the 1900 Shanghai second-level offset", async () => {
    const exactSecond = await browserReceipt(request({
      local_wall_time_and_precision: {
        wall_time_text: "17:01:23",
        precision_id: "exact_second"
      }
    }));
    const historical = await browserReceipt(request({
      civil_calendar_and_date: { year: 1900, month: 1, day: 1 },
      local_wall_time_and_precision: { wall_time_text: "20:00" }
    }));

    expect(exactSecond.declaredCivilTime.normalizedSecond).toBe(23);
    expect(exactSecond.resolution).toMatchObject({
      utcInstant: "2025-03-20T09:01:23.000Z",
      utcInstantPrecision: "exact_second"
    });
    expect(historical.resolution).toMatchObject({
      utcInstant: "1900-01-01T11:54:17.000Z",
      utcOffsetSeconds: 29_143
    });
  });

  it.each([
    "vedic_adapter_draft_reject",
    "vedic_adapter_draft_earlier",
    "vedic_adapter_draft_later"
  ] as const)("rejects a DST gap without shifting it under %s", async (policyId) => {
    const result = await resolveVedicCivilTimeBrowserFact(request({
      civil_calendar_and_date: { year: 2025, month: 3, day: 9 },
      local_wall_time_and_precision: { wall_time_text: "02:30" },
      iana_time_zone_and_tzdb_identity: { iana_time_zone_id: "America/New_York" },
      dst_ambiguity_policy: { policy_id: policyId }
    }));

    expect(result).toMatchObject({
      outcome: "failed_closed",
      code: "DST_GAP_REJECTED",
      stage: "dst_policy",
      partialFactsReturned: false,
      dataHandling: { personDerivedDigestProduced: false }
    });
    expect(collectKeys(result).has("resolution")).toBe(false);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("rejects an overlap by default and selects its earlier/later UTC instant explicitly", async () => {
    const overlap = {
      civil_calendar_and_date: { year: 2025, month: 11, day: 2 },
      local_wall_time_and_precision: { wall_time_text: "01:30" },
      iana_time_zone_and_tzdb_identity: { iana_time_zone_id: "America/New_York" }
    };
    const rejected = await resolveVedicCivilTimeBrowserFact(request(overlap));
    const earlier = await browserReceipt(request({
      ...overlap,
      dst_ambiguity_policy: { policy_id: "vedic_adapter_draft_earlier" }
    }));
    const later = await browserReceipt(request({
      ...overlap,
      dst_ambiguity_policy: { policy_id: "vedic_adapter_draft_later" }
    }));

    expect(rejected).toMatchObject({
      outcome: "failed_closed",
      code: "DST_OVERLAP_REJECTED",
      stage: "dst_policy",
      partialFactsReturned: false
    });
    expect(earlier.resolution).toMatchObject({
      kind: "overlap",
      decision: "vedic_adapter_draft_earlier",
      utcInstant: "2025-11-02T05:30:00.000Z",
      utcOffsetSeconds: -14_400
    });
    expect(later.resolution).toMatchObject({
      kind: "overlap",
      decision: "vedic_adapter_draft_later",
      utcInstant: "2025-11-02T06:30:00.000Z",
      utcOffsetSeconds: -18_000
    });
    expect(earlier.resolution.epochMilliseconds).toBeLessThan(later.resolution.epochMilliseconds);
  });

  it("fails closed for an unknown zone and any extra root or nested key", async () => {
    const unknownZone = await resolveVedicCivilTimeBrowserFact(request({
      iana_time_zone_and_tzdb_identity: { iana_time_zone_id: "Not/A_Real_Zone" }
    }));
    const extraRoot = await resolveVedicCivilTimeBrowserFact(request({ unexpected: true }));
    const extraNested = await resolveVedicCivilTimeBrowserFact(request({
      dst_ambiguity_policy: { selected_candidate_id: "earlier" }
    }));

    expect(unknownZone).toMatchObject({
      outcome: "failed_closed",
      code: "TZDB_UNKNOWN_ZONE",
      stage: "tzdb_resolution",
      partialFactsReturned: false
    });
    for (const result of [extraRoot, extraNested]) {
      expect(result).toMatchObject({
        outcome: "failed_closed",
        code: "INVALID_INPUT_PROJECTION",
        stage: "input_projection",
        partialFactsReturned: false
      });
      expect(collectKeys(result).has("resolution")).toBe(false);
    }
  });

  it("matches the existing Node Vedic adapter for unique and overlap engineering facts", async () => {
    const cases = [
      request(),
      request({
        civil_calendar_and_date: { year: 2025, month: 11, day: 2 },
        local_wall_time_and_precision: { wall_time_text: "01:30" },
        iana_time_zone_and_tzdb_identity: { iana_time_zone_id: "America/New_York" },
        dst_ambiguity_policy: { policy_id: "vedic_adapter_draft_earlier" }
      }),
      request({
        civil_calendar_and_date: { year: 2025, month: 11, day: 2 },
        local_wall_time_and_precision: { wall_time_text: "01:30" },
        iana_time_zone_and_tzdb_identity: { iana_time_zone_id: "America/New_York" },
        dst_ambiguity_policy: { policy_id: "vedic_adapter_draft_later" }
      })
    ];

    for (const value of cases) {
      const browser = await browserReceipt(value);
      const node = await nodeCandidate(value);
      expect(commonResolution(browser)).toEqual(commonResolution(node));
      expect(commonTzdbBinding(browser.tzdbBinding)).toEqual(commonTzdbBinding(node.tzdbBinding));
      expect(isVedicCivilTimeResolutionCandidate(node)).toBe(true);
    }
  });

  it.each([
    request({
      civil_calendar_and_date: { year: 1900, month: 1, day: 1 },
      local_wall_time_and_precision: { wall_time_text: "00:00" },
      iana_time_zone_and_tzdb_identity: { iana_time_zone_id: "Asia/Shanghai" }
    }),
    request({
      civil_calendar_and_date: { year: 2100, month: 12, day: 31 },
      local_wall_time_and_precision: { wall_time_text: "23:59" },
      iana_time_zone_and_tzdb_identity: { iana_time_zone_id: "America/New_York" }
    })
  ])("rejects a boundary local date whose resolved UTC instant escapes the conservative guard", async (value) => {
    await expect(resolveVedicCivilTimeBrowserFact(value)).resolves.toMatchObject({
      outcome: "failed_closed",
      code: "TZDB_SUPPORTED_RANGE_REJECTED",
      stage: "supported_range",
      partialFactsReturned: false
    });
  });

  it("matches the existing Node Vedic adapter's gap rejection without returning partial facts", async () => {
    const value = request({
      civil_calendar_and_date: { year: 2025, month: 3, day: 9 },
      local_wall_time_and_precision: { wall_time_text: "02:30" },
      iana_time_zone_and_tzdb_identity: { iana_time_zone_id: "America/New_York" }
    });
    const [browser, node] = await Promise.all([
      resolveVedicCivilTimeBrowserFact(value),
      resolveVedicCivilTimeInputResolutionDraft(value)
    ]);

    expect(browser).toMatchObject({
      outcome: "failed_closed",
      code: "DST_GAP_REJECTED",
      stage: "dst_policy",
      partialFactsReturned: false
    });
    expect(node).toMatchObject({
      outcome: "failed_closed",
      code: "DST_GAP_REJECTED",
      stage: "dst_policy",
      partialResolutionReturned: false
    });
    expect(collectKeys(browser).has("resolution")).toBe(false);
    expect(collectKeys(node).has("resolution")).toBe(false);
  });
});
