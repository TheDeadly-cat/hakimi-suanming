import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BUNDLED_TZDB_SNAPSHOT_ID,
  RETAINED_TZDB_2025B_SNAPSHOT_ID
} from "@hakimi/tzdb-core";
import {
  VEDIC_CIVIL_TIME_FIXED_TZDB_SNAPSHOT_ID,
  VEDIC_CIVIL_TIME_INPUT_PROJECTION_VERSION,
  VEDIC_DST_OVERLAP_POLICY_VERSION,
  VEDIC_EXACT_UNCERTAINTY_MODEL_ID,
  VEDIC_EXACT_UNCERTAINTY_MODEL_VERSION,
  VEDIC_EXACT_WALL_TIME_PRECISION_VERSION,
  VEDIC_PROLEPTIC_GREGORIAN_VERSION,
  isVedicCivilTimeResolutionCandidate,
  resolveVedicCivilTimeInputResolutionDraft,
  type VedicCivilTimeResolutionCandidate
} from "./index.ts";

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
    projectionVersion: VEDIC_CIVIL_TIME_INPUT_PROJECTION_VERSION,
    civil_calendar_and_date: {
      calendar_id: "proleptic_gregorian",
      calendar_version: VEDIC_PROLEPTIC_GREGORIAN_VERSION,
      year: 2025,
      month: 3,
      day: 20,
      ...(calendarOverrides as object | undefined)
    },
    local_wall_time_and_precision: {
      wall_time_text: "17:01",
      precision_id: "exact_minute",
      precision_version: VEDIC_EXACT_WALL_TIME_PRECISION_VERSION,
      ...(wallTimeOverrides as object | undefined)
    },
    birth_time_uncertainty_interval_or_candidates: {
      representation: "exact",
      model_id: VEDIC_EXACT_UNCERTAINTY_MODEL_ID,
      model_version: VEDIC_EXACT_UNCERTAINTY_MODEL_VERSION,
      ...(uncertaintyOverrides as object | undefined)
    },
    iana_time_zone_and_tzdb_identity: {
      iana_time_zone_id: "Asia/Shanghai",
      tzdb_version: "2026c",
      tzdb_snapshot_id: BUNDLED_TZDB_SNAPSHOT_ID,
      ...(zoneOverrides as object | undefined)
    },
    dst_ambiguity_policy: {
      policy_id: "vedic_adapter_draft_reject",
      policy_version: VEDIC_DST_OVERLAP_POLICY_VERSION,
      ...(policyOverrides as object | undefined)
    },
    ...rootOverrides
  };
}

async function expectCandidate(value: unknown): Promise<VedicCivilTimeResolutionCandidate> {
  const result = await resolveVedicCivilTimeInputResolutionDraft(value);
  expect(result.outcome).toBe("resolved_candidate");
  if (result.outcome !== "resolved_candidate") throw new Error(`expected candidate, got ${result.code}`);
  return result;
}

function overlapRequest(
  policyId: "vedic_adapter_draft_reject" | "vedic_adapter_draft_earlier" | "vedic_adapter_draft_later",
  withDeclaration = false
): Record<string, any> {
  const selectedCandidateId = policyId === "vedic_adapter_draft_earlier"
    ? "earlier"
    : policyId === "vedic_adapter_draft_later"
      ? "later"
      : null;
  return request({
    civil_calendar_and_date: { year: 2025, month: 11, day: 2 },
    local_wall_time_and_precision: { wall_time_text: "01:30" },
    iana_time_zone_and_tzdb_identity: { iana_time_zone_id: "America/New_York" },
    dst_ambiguity_policy: { policy_id: policyId },
    ...(withDeclaration ? {
      dst_gap_overlap_resolution_declaration: {
        classification: "overlap",
        candidate_offsets: [
          { candidate_id: "earlier", utc_offset_seconds: -14_400 },
          { candidate_id: "later", utc_offset_seconds: -18_000 }
        ],
        selected_candidate_id: selectedCandidateId
      }
    } : {})
  });
}

describe("vedic civil-time input resolution draft", () => {
  it("resolves a unique exact-minute wall time into an independently branded frozen candidate", async () => {
    const candidate = await expectCandidate(request());

    expect(candidate.resolution).toMatchObject({
      kind: "unique",
      decision: "unique",
      utcInstant: "2025-03-20T09:01:00.000Z",
      utcOffsetSeconds: 28_800,
      candidateOrderingSemantics: "utc_epoch_milliseconds_ascending",
      requestedLocalTimeRoundTripVerified: true,
      utcOffsetRoundTripVerified: true,
      daylightSavingClassificationEstablished: false,
      utcConversionAndTimeScaleRequirementSatisfied: false
    });
    expect(candidate.tzdbBinding).toMatchObject({
      snapshotId: VEDIC_CIVIL_TIME_FIXED_TZDB_SNAPSHOT_ID,
      schemaVersion: "1.0.0",
      kind: "bundled_iana_tzdb",
      ianaVersion: "2026c",
      artifactName: "moment-timezone/data/packed/latest.json",
      dataSha256: "43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81",
      resolver: { name: "hakimi-tzdb-core", version: "1.0.0" },
      adapter: { name: "moment-timezone", version: "0.6.3" },
      supportedRange: { from: "1900-01-01", to: "2100-12-31" }
    });
    expect(candidate.inputProjection).toMatchObject({
      referencedRequirementIds: [
        "civil_calendar_and_date",
        "local_wall_time_and_precision",
        "birth_time_uncertainty_interval_or_candidates",
        "iana_time_zone_and_tzdb_identity",
        "dst_gap_overlap_resolution"
      ],
      notEvaluatedRequirementIds: [
        "place_coordinates_and_precision",
        "utc_conversion_and_time_scale",
        "ephemeris_identity_version_and_coverage",
        "sidereal_zodiac_declaration",
        "ayanamsa_identity_and_version",
        "rahu_ketu_mode",
        "bhava_house_definition",
        "birth_time_perturbation_candidates_and_transition_points"
      ],
      exactSingleValueProfileOnly: true,
      completeVedicInputContractPresent: false,
      projectionIsFullVedicSchemaInstance: false,
      declarationIsFormalVedicSchemaInstance: false,
      digestCoversCompleteVedicInput: false,
      formalRequirementSelectionsEstablished: false,
      requirementsResolved: 0,
      dstDeclarationPresent: false
    });
    expect(candidate.resolverScope).toEqual({
      supportedRangeFrom: "1900-01-01",
      supportedRangeTo: "2100-12-31",
      nearbyOffsetSamplingRadiusHours: 48,
      maximumModeledLocalCandidates: 2,
      runtimeLoadedArtifactFullByteHashVerified: false,
      completeRuntimeSnapshotClosureEstablished: false,
      universalCivilTimeTruthEstablished: false
    });
    expect(Object.isFrozen(candidate)).toBe(true);
    expect(Object.isFrozen(candidate.resolution)).toBe(true);
    expect(Object.isFrozen(candidate.tzdbBinding.supportedRange)).toBe(true);
    expect(isVedicCivilTimeResolutionCandidate(candidate)).toBe(true);
    expect(candidate.systemIdentity).toEqual({
      contractSystemId: "vedic",
      productSystemId: "vedic-astrology",
      baziAuthorityInherited: false,
      westernAuthorityInherited: false,
      legacyV13IdentityInherited: false,
      releaseIdentity: null,
      targetSchema: null,
      migrationId: null
    });
  });

  it("preserves exact seconds and a historical second-level offset", async () => {
    const exactSecond = await expectCandidate(request({
      local_wall_time_and_precision: {
        wall_time_text: "17:01:23",
        precision_id: "exact_second"
      }
    }));
    const historical = await expectCandidate(request({
      civil_calendar_and_date: { year: 1900, month: 1, day: 1 },
      local_wall_time_and_precision: { wall_time_text: "00:00" }
    }));

    expect(exactSecond.wallTime.normalizedSecond).toBe(23);
    expect(exactSecond.resolution.utcInstant).toBe("2025-03-20T09:01:23.000Z");
    expect(historical.resolution).toMatchObject({
      utcInstant: "1899-12-31T15:54:17.000Z",
      utcOffsetSeconds: 29_143
    });
  });

  it.each([
    "vedic_adapter_draft_reject",
    "vedic_adapter_draft_earlier",
    "vedic_adapter_draft_later"
  ] as const)("rejects a gap without shifting under %s", async (policyId) => {
    const result = await resolveVedicCivilTimeInputResolutionDraft(request({
      civil_calendar_and_date: { year: 2025, month: 3, day: 9 },
      local_wall_time_and_precision: { wall_time_text: "02:30" },
      iana_time_zone_and_tzdb_identity: { iana_time_zone_id: "America/New_York" },
      dst_ambiguity_policy: { policy_id: policyId },
      dst_gap_overlap_resolution_declaration: {
        classification: "gap",
        rejection_code: "nonexistent_local_wall_time"
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

  it("applies only the explicit Vedic adapter-draft earlier/later policy and rejects overlap by default", async () => {
    const earlier = await expectCandidate(overlapRequest("vedic_adapter_draft_earlier", true));
    const later = await expectCandidate(overlapRequest("vedic_adapter_draft_later", true));
    const rejected = await resolveVedicCivilTimeInputResolutionDraft(
      overlapRequest("vedic_adapter_draft_reject", true)
    );

    expect(earlier.resolution).toMatchObject({
      kind: "overlap",
      decision: "vedic_adapter_draft_earlier",
      requestedPolicyId: "vedic_adapter_draft_earlier",
      policyVersion: VEDIC_DST_OVERLAP_POLICY_VERSION,
      utcInstant: "2025-11-02T05:30:00.000Z",
      utcOffsetSeconds: -14_400
    });
    expect(later.resolution).toMatchObject({
      kind: "overlap",
      decision: "vedic_adapter_draft_later",
      requestedPolicyId: "vedic_adapter_draft_later",
      policyVersion: VEDIC_DST_OVERLAP_POLICY_VERSION,
      utcInstant: "2025-11-02T06:30:00.000Z",
      utcOffsetSeconds: -18_000
    });
    expect(earlier.resolution.epochMilliseconds).toBeLessThan(later.resolution.epochMilliseconds);
    expect(rejected).toMatchObject({
      outcome: "failed_closed",
      code: "DST_OVERLAP_REJECTED",
      partialResolutionReturned: false
    });
  });

  it("covers a non-hour overlap and rejects non-hour and whole-day gaps", async () => {
    const lordHoweEarlier = await expectCandidate(request({
      civil_calendar_and_date: { year: 2024, month: 4, day: 7 },
      local_wall_time_and_precision: { wall_time_text: "01:45" },
      iana_time_zone_and_tzdb_identity: { iana_time_zone_id: "Australia/Lord_Howe" },
      dst_ambiguity_policy: { policy_id: "vedic_adapter_draft_earlier" }
    }));
    const lordHoweLater = await expectCandidate(request({
      civil_calendar_and_date: { year: 2024, month: 4, day: 7 },
      local_wall_time_and_precision: { wall_time_text: "01:45" },
      iana_time_zone_and_tzdb_identity: { iana_time_zone_id: "Australia/Lord_Howe" },
      dst_ambiguity_policy: { policy_id: "vedic_adapter_draft_later" }
    }));
    const lordHoweGap = await resolveVedicCivilTimeInputResolutionDraft(request({
      civil_calendar_and_date: { year: 2024, month: 10, day: 6 },
      local_wall_time_and_precision: { wall_time_text: "02:15" },
      iana_time_zone_and_tzdb_identity: { iana_time_zone_id: "Australia/Lord_Howe" }
    }));
    const apiaGap = await resolveVedicCivilTimeInputResolutionDraft(request({
      civil_calendar_and_date: { year: 2011, month: 12, day: 30 },
      local_wall_time_and_precision: { wall_time_text: "12:00" },
      iana_time_zone_and_tzdb_identity: { iana_time_zone_id: "Pacific/Apia" }
    }));

    expect(lordHoweLater.resolution.epochMilliseconds - lordHoweEarlier.resolution.epochMilliseconds)
      .toBe(1_800_000);
    expect(lordHoweGap).toMatchObject({ outcome: "failed_closed", code: "DST_GAP_REJECTED" });
    expect(apiaGap).toMatchObject({ outcome: "failed_closed", code: "DST_GAP_REJECTED" });
  });

  it("checks declarations against recomputation instead of trusting classification, offsets, or selection", async () => {
    const uniqueMatch = await expectCandidate(request({
      dst_gap_overlap_resolution_declaration: {
        classification: "unambiguous",
        utc_offset_seconds: 28_800
      }
    }));
    const uniqueOffsetMismatch = await resolveVedicCivilTimeInputResolutionDraft(request({
      dst_gap_overlap_resolution_declaration: {
        classification: "unambiguous",
        utc_offset_seconds: 0
      }
    }));
    const gapClassificationMismatch = await resolveVedicCivilTimeInputResolutionDraft(request({
      civil_calendar_and_date: { year: 2025, month: 3, day: 9 },
      local_wall_time_and_precision: { wall_time_text: "02:30" },
      iana_time_zone_and_tzdb_identity: { iana_time_zone_id: "America/New_York" },
      dst_gap_overlap_resolution_declaration: {
        classification: "unambiguous",
        utc_offset_seconds: -18_000
      }
    }));
    const overlapSelectionMismatch = await resolveVedicCivilTimeInputResolutionDraft(request({
      civil_calendar_and_date: { year: 2025, month: 11, day: 2 },
      local_wall_time_and_precision: { wall_time_text: "01:30" },
      iana_time_zone_and_tzdb_identity: { iana_time_zone_id: "America/New_York" },
      dst_ambiguity_policy: { policy_id: "vedic_adapter_draft_earlier" },
      dst_gap_overlap_resolution_declaration: {
        classification: "overlap",
        candidate_offsets: [
          { candidate_id: "earlier", utc_offset_seconds: -14_400 },
          { candidate_id: "later", utc_offset_seconds: -18_000 }
        ],
        selected_candidate_id: "later"
      }
    }));

    expect(uniqueMatch.resolution.kind).toBe("unique");
    expect(uniqueMatch.inputProjection.dstDeclarationPresent).toBe(true);
    for (const value of [uniqueOffsetMismatch, gapClassificationMismatch, overlapSelectionMismatch]) {
      expect(value).toMatchObject({
        outcome: "failed_closed",
        code: "DECLARATION_MISMATCH",
        stage: "declaration_check",
        partialResolutionReturned: false
      });
    }
  });

  it("fails closed for snapshot id/version mismatch, unknown zone, and out-of-range dates without fallback", async () => {
    const retained = await resolveVedicCivilTimeInputResolutionDraft(request({
      iana_time_zone_and_tzdb_identity: {
        tzdb_version: "2025b",
        tzdb_snapshot_id: RETAINED_TZDB_2025B_SNAPSHOT_ID
      }
    }));
    const versionMismatch = await resolveVedicCivilTimeInputResolutionDraft(request({
      iana_time_zone_and_tzdb_identity: { tzdb_version: "2025b" }
    }));
    const hashDrift = await resolveVedicCivilTimeInputResolutionDraft(request({
      iana_time_zone_and_tzdb_identity: {
        tzdb_snapshot_id: BUNDLED_TZDB_SNAPSHOT_ID.replace(
          /sha256:[a-f0-9]{64}/,
          `sha256:${"0".repeat(64)}`
        )
      }
    }));
    const unknownZone = await resolveVedicCivilTimeInputResolutionDraft(request({
      iana_time_zone_and_tzdb_identity: { iana_time_zone_id: "Not/A_Real_Zone" }
    }));
    const outOfRange = await resolveVedicCivilTimeInputResolutionDraft(request({
      civil_calendar_and_date: { year: 1899, month: 12, day: 31 }
    }));
    const upperEndpoint = await expectCandidate(request({
      civil_calendar_and_date: { year: 2100, month: 12, day: 31 }
    }));

    for (const value of [retained, versionMismatch, hashDrift]) {
      expect(value).toMatchObject({ outcome: "failed_closed", code: "TZDB_SNAPSHOT_MISMATCH" });
    }
    expect(unknownZone).toMatchObject({ outcome: "failed_closed", code: "TZDB_UNKNOWN_ZONE" });
    expect(outOfRange).toMatchObject({
      outcome: "failed_closed",
      code: "TZDB_SUPPORTED_RANGE_REJECTED",
      stage: "supported_range"
    });
    expect(upperEndpoint.civilDate.isoDate).toBe("2100-12-31");
  });

  it("applies Gregorian leap rules and rejects leap-second text and unsafe components", async () => {
    const invalid1900 = await resolveVedicCivilTimeInputResolutionDraft(request({
      civil_calendar_and_date: { year: 1900, month: 2, day: 29 }
    }));
    const valid2000 = await expectCandidate(request({
      civil_calendar_and_date: { year: 2000, month: 2, day: 29 }
    }));
    const invalid2100 = await resolveVedicCivilTimeInputResolutionDraft(request({
      civil_calendar_and_date: { year: 2100, month: 2, day: 29 }
    }));
    const leapSecond = await resolveVedicCivilTimeInputResolutionDraft(request({
      local_wall_time_and_precision: {
        wall_time_text: "23:59:60",
        precision_id: "exact_second"
      }
    }));
    const unsafeYear = await resolveVedicCivilTimeInputResolutionDraft(request({
      civil_calendar_and_date: { year: Number.MAX_SAFE_INTEGER + 1 }
    }));

    expect(invalid1900).toMatchObject({ outcome: "failed_closed", code: "INVALID_GREGORIAN_WALL_TIME" });
    expect(valid2000.civilDate.isoDate).toBe("2000-02-29");
    expect(invalid2100).toMatchObject({ outcome: "failed_closed", code: "INVALID_GREGORIAN_WALL_TIME" });
    expect(leapSecond).toMatchObject({ outcome: "failed_closed", code: "INVALID_GREGORIAN_WALL_TIME" });
    expect(unsafeYear.outcome).toBe("failed_closed");
  });

  it.each([
    {
      representation: "closed_interval",
      model_id: "interval",
      model_version: "1",
      interval_start_local: "12:00",
      interval_end_local: "13:00"
    },
    {
      representation: "candidate_set",
      model_id: "candidates",
      model_version: "1",
      candidate_local_wall_times: ["12:00", "12:01"]
    },
    {
      representation: "perturbation",
      model_id: "perturbation",
      model_version: "1"
    }
  ])("explicitly rejects non-exact uncertainty profile %#", async (uncertainty) => {
    const result = await resolveVedicCivilTimeInputResolutionDraft(request({
      birth_time_uncertainty_interval_or_candidates: uncertainty
    }));
    expect(result).toMatchObject({
      outcome: "failed_closed",
      code: "UNSUPPORTED_UNCERTAINTY_PROFILE",
      partialResolutionReturned: false
    });
  });

  it("uses the full pre-await passive snapshot even if nested inputs and declaration arrays mutate immediately", async () => {
    const raw = overlapRequest("vedic_adapter_draft_earlier", true);
    const pending = resolveVedicCivilTimeInputResolutionDraft(raw);
    raw.civil_calendar_and_date.day = 3;
    raw.local_wall_time_and_precision.wall_time_text = "23:59";
    raw.iana_time_zone_and_tzdb_identity.iana_time_zone_id = "Asia/Shanghai";
    raw.dst_ambiguity_policy.policy_id = "vedic_adapter_draft_later";
    raw.dst_gap_overlap_resolution_declaration.candidate_offsets[0].utc_offset_seconds = 0;
    raw.dst_gap_overlap_resolution_declaration.selected_candidate_id = "later";
    const result = await pending;

    expect(result.outcome).toBe("resolved_candidate");
    if (result.outcome !== "resolved_candidate") throw new Error(result.code);
    expect(result.civilDate.isoDate).toBe("2025-11-02");
    expect(result.timeZone.requestedIanaTimeZoneId).toBe("America/New_York");
    expect(result.resolution.decision).toBe("vedic_adapter_draft_earlier");
  });

  it("rejects accessors and toJSON hooks without invoking them", async () => {
    let getterCalls = 0;
    let toJsonCalls = 0;
    const accessor = request();
    Object.defineProperty(accessor.local_wall_time_and_precision, "wall_time_text", {
      enumerable: true,
      configurable: true,
      get() {
        getterCalls += 1;
        throw new Error("must not execute");
      }
    });
    const withToJson = request();
    Object.defineProperty(withToJson.iana_time_zone_and_tzdb_identity, "toJSON", {
      enumerable: true,
      configurable: true,
      value() {
        toJsonCalls += 1;
        throw new Error("must not execute");
      }
    });

    const [accessorResult, toJsonResult] = await Promise.all([
      resolveVedicCivilTimeInputResolutionDraft(accessor),
      resolveVedicCivilTimeInputResolutionDraft(withToJson)
    ]);
    expect(accessorResult).toMatchObject({ outcome: "failed_closed", code: "INVALID_REQUEST_SHAPE" });
    expect(toJsonResult).toMatchObject({ outcome: "failed_closed", code: "INVALID_REQUEST_SHAPE" });
    expect(getterCalls).toBe(0);
    expect(toJsonCalls).toBe(0);
  });

  it("rejects missing/extra keys, precision-format mismatch, duplicate candidate ids, and invalid selection", async () => {
    const missing = request();
    delete missing.dst_ambiguity_policy;
    const extra = request({ unexpected: true });
    const precisionMismatch = request({
      local_wall_time_and_precision: {
        wall_time_text: "17:01:00",
        precision_id: "exact_minute"
      }
    });
    const duplicateCandidate = overlapRequest("vedic_adapter_draft_earlier", true);
    duplicateCandidate.dst_gap_overlap_resolution_declaration.candidate_offsets[1].candidate_id = "earlier";
    const invalidSelection = overlapRequest("vedic_adapter_draft_earlier", true);
    invalidSelection.dst_gap_overlap_resolution_declaration.selected_candidate_id = "middle";

    for (const value of [missing, extra, precisionMismatch, duplicateCandidate, invalidSelection]) {
      const result = await resolveVedicCivilTimeInputResolutionDraft(value);
      expect(result.outcome).toBe("failed_closed");
    }
  });

  it("contains throwing Proxy traps and does not leak exceptions", async () => {
    let trapCalls = 0;
    const value = new Proxy(request(), {
      getPrototypeOf() {
        trapCalls += 1;
        throw new Error("hostile reflection trap");
      }
    });
    const result = await resolveVedicCivilTimeInputResolutionDraft(value);
    expect(result).toMatchObject({ outcome: "failed_closed", code: "INVALID_REQUEST_SHAPE" });
    expect(trapCalls).toBe(1);
  });

  it("rejects custom prototypes, symbols, aliases, cycles, sparse arrays, negative zero, and non-finite values", async () => {
    const customPrototype = request();
    Object.setPrototypeOf(customPrototype.civil_calendar_and_date, { inherited: true });
    const withSymbol = request();
    Object.defineProperty(withSymbol.local_wall_time_and_precision, Symbol("hidden"), {
      enumerable: true,
      value: true
    });
    const aliased = request();
    aliased.dst_ambiguity_policy = aliased.iana_time_zone_and_tzdb_identity;
    const cyclic = request();
    cyclic.iana_time_zone_and_tzdb_identity.cycle = cyclic;
    const sparse = overlapRequest("vedic_adapter_draft_earlier", true);
    delete sparse.dst_gap_overlap_resolution_declaration.candidate_offsets[0];
    const negativeZero = request({ civil_calendar_and_date: { day: -0 } });
    const nonFinite = request({ civil_calendar_and_date: { year: Number.POSITIVE_INFINITY } });

    for (const value of [customPrototype, withSymbol, aliased, cyclic, sparse, negativeZero, nonFinite]) {
      const result = await resolveVedicCivilTimeInputResolutionDraft(value);
      expect(result).toMatchObject({ outcome: "failed_closed", code: "INVALID_REQUEST_SHAPE" });
    }
  });

  it("rejects oversized declaration arrays at the passive capture boundary", async () => {
    const value = overlapRequest("vedic_adapter_draft_earlier", true);
    value.dst_gap_overlap_resolution_declaration.candidate_offsets = Array.from(
      { length: 9 },
      (_entry, index) => ({ candidate_id: String(index), utc_offset_seconds: index })
    );
    const result = await resolveVedicCivilTimeInputResolutionDraft(value);
    expect(result).toMatchObject({ outcome: "failed_closed", code: "INVALID_REQUEST_SHAPE" });
  });

  it("uses captured primordials and never invokes an inherited Object.prototype.toJSON", async () => {
    const originalDate = globalThis.Date;
    const originalFreeze = Object.freeze;
    const originalKeys = Object.keys;
    const originalGetOwnPropertyDescriptors = Object.getOwnPropertyDescriptors;
    const originalGetOwnPropertySymbols = Object.getOwnPropertySymbols;
    const originalGetPrototypeOf = Object.getPrototypeOf;
    const originalObjectIs = Object.is;
    const originalArrayIsArray = Array.isArray;
    const originalStringify = JSON.stringify;
    const originalToJson = Object.getOwnPropertyDescriptor(Object.prototype, "toJSON");
    let toJsonCalls = 0;
    let result: Awaited<ReturnType<typeof resolveVedicCivilTimeInputResolutionDraft>>;
    try {
      Object.defineProperty(globalThis, "Date", { configurable: true, writable: true, value: class PoisonedDate {} });
      Object.defineProperty(Object, "freeze", { configurable: true, writable: true, value: () => { throw new Error("poison"); } });
      Object.defineProperty(Object, "keys", { configurable: true, writable: true, value: () => { throw new Error("poison"); } });
      Object.defineProperty(Object, "getOwnPropertyDescriptors", { configurable: true, writable: true, value: () => { throw new Error("poison"); } });
      Object.defineProperty(Object, "getOwnPropertySymbols", { configurable: true, writable: true, value: () => { throw new Error("poison"); } });
      Object.defineProperty(Object, "getPrototypeOf", { configurable: true, writable: true, value: () => { throw new Error("poison"); } });
      Object.defineProperty(Object, "is", { configurable: true, writable: true, value: () => { throw new Error("poison"); } });
      Object.defineProperty(Array, "isArray", { configurable: true, writable: true, value: () => { throw new Error("poison"); } });
      Object.defineProperty(JSON, "stringify", { configurable: true, writable: true, value: () => { throw new Error("poison"); } });
      Object.defineProperty(Object.prototype, "toJSON", {
        configurable: true,
        value() {
          toJsonCalls += 1;
          throw new Error("must not execute");
        }
      });
      result = await resolveVedicCivilTimeInputResolutionDraft(request());
    } finally {
      Object.defineProperty(globalThis, "Date", { configurable: true, writable: true, value: originalDate });
      Object.defineProperty(Object, "freeze", { configurable: true, writable: true, value: originalFreeze });
      Object.defineProperty(Object, "keys", { configurable: true, writable: true, value: originalKeys });
      Object.defineProperty(Object, "getOwnPropertyDescriptors", { configurable: true, writable: true, value: originalGetOwnPropertyDescriptors });
      Object.defineProperty(Object, "getOwnPropertySymbols", { configurable: true, writable: true, value: originalGetOwnPropertySymbols });
      Object.defineProperty(Object, "getPrototypeOf", { configurable: true, writable: true, value: originalGetPrototypeOf });
      Object.defineProperty(Object, "is", { configurable: true, writable: true, value: originalObjectIs });
      Object.defineProperty(Array, "isArray", { configurable: true, writable: true, value: originalArrayIsArray });
      Object.defineProperty(JSON, "stringify", { configurable: true, writable: true, value: originalStringify });
      if (originalToJson === undefined) delete (Object.prototype as { toJSON?: unknown }).toJSON;
      else Object.defineProperty(Object.prototype, "toJSON", originalToJson);
    }
    expect(result!.outcome).toBe("resolved_candidate");
    expect(toJsonCalls).toBe(0);
  });

  it("brands only module-created candidates; clones, spreads, wrappers, and digest forgeries fail", async () => {
    const candidate = await expectCandidate(request());
    const jsonClone = JSON.parse(JSON.stringify(candidate)) as unknown;
    const structuredCloneValue = structuredClone(candidate);
    const spread = { ...candidate };
    const wrapper = new Proxy(candidate, {});
    const forged = {
      ...(jsonClone as object),
      digests: { ...(jsonClone as VedicCivilTimeResolutionCandidate).digests }
    };

    expect(isVedicCivilTimeResolutionCandidate(candidate)).toBe(true);
    for (const value of [jsonClone, structuredCloneValue, spread, wrapper, forged]) {
      expect(isVedicCivilTimeResolutionCandidate(value)).toBe(false);
    }
  });

  it("emits deterministic Vedic-domain digests without treating hashes as signatures", async () => {
    const first = await expectCandidate(request());
    const second = await expectCandidate(request());
    const sameUniqueDifferentRequestedPolicy = await expectCandidate(request({
      dst_ambiguity_policy: { policy_id: "vedic_adapter_draft_later" }
    }));
    expect(first.digests).toEqual(second.digests);
    expect(first.resolution.utcInstant).toBe(sameUniqueDifferentRequestedPolicy.resolution.utcInstant);
    expect(first.digests.inputProjectionSha256)
      .not.toBe(sameUniqueDifferentRequestedPolicy.digests.inputProjectionSha256);
    expect(first.digests.candidateSha256)
      .not.toBe(sameUniqueDifferentRequestedPolicy.digests.candidateSha256);
    expect(first.digests.candidateSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(new Set([
      first.digests.inputProjectionSha256,
      first.digests.requestProjectionSha256,
      first.digests.resolutionSha256,
      first.digests.candidateSha256
    ]).size).toBe(4);
    expect(first.digests.digestIsDigitalSignature).toBe(false);
    expect(first.schemaVersion).toContain("vedic-civil-time");
    expect(first.schemaVersion).not.toContain("western");
  });

  it("keeps personal-data, authority, identity, mutation, and raw-object boundaries fully red", async () => {
    const candidate = await expectCandidate(request({
      iana_time_zone_and_tzdb_identity: { iana_time_zone_id: "asia/shanghai" }
    }));
    expect(candidate.timeZone).toEqual({
      requestedIanaTimeZoneId: "asia/shanghai",
      canonicalIanaCaseIdentityEstablished: false,
      timeZoneDerivedFromCoordinates: false
    });
    expect(candidate.dataHandling).toEqual({
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
    expect((Object.values(candidate.authorityBoundary) as unknown[]).filter((value) => value === true)).toEqual([]);
    expect(candidate.authorityBoundary).toMatchObject({
      formalInputContractAdmitted: false,
      inputContractGateSatisfied: false,
      inputAcceptanceReceiptIssued: false,
      normalizationReceiptIssued: false,
      formalTimeResolutionReceiptIssued: false,
      factReceiptIssued: false,
      ruleReceiptIssued: false,
      successReceiptIssued: false,
      baziAuthorityInherited: false,
      westernAuthorityInherited: false,
      legacyV13IdentityInherited: false,
      releaseIdentity: null,
      targetSchema: null,
      migrationId: null
    });
    expect(candidate.audit).toMatchObject({
      mutationPerformed: false,
      userDataStorageReadPerformed: false,
      applicationDataStoreReadPerformed: false,
      mutationEpochAvailable: false,
      mutationEpoch: null,
      crossFileAtomicSnapshot: false,
      intervalMutationExcluded: false,
      abaExcluded: false,
      rawJsonBytesParsed: false,
      duplicateKeyExclusionEstablished: false,
      rawByteIdentityEstablished: false,
      transparentProxyExclusionEstablished: false,
      completePrimordialPoisoningIsolationEstablished: false
    });
  });

  it("is private, export-closed, production-forbidden, and statically free of network/storage/Web/Western adapter wiring", () => {
    const packageRoot = resolve(
      process.cwd(),
      "isolated-drafts/vedic-civil-time-input-resolution-draft"
    );
    const packageJson = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8")) as {
      private?: boolean;
      exports?: unknown;
      dependencies?: Record<string, string>;
      [key: string]: unknown;
    };
    const source = readFileSync(resolve(packageRoot, "src/index.ts"), "utf8");
    const rootPackage = readFileSync(resolve(process.cwd(), "package.json"), "utf8");

    expect(packageJson.private).toBe(true);
    expect(packageJson.exports).toEqual({});
    expect(packageJson["x-hakimi-isolated-draft"]).toMatchObject({
      systemId: "vedic-astrology",
      runtime: "node-test-only",
      productionImport: "forbidden",
      baziAuthorityInherited: false,
      westernAuthorityInherited: false,
      legacyV13IdentityInherited: false
    });
    expect(packageJson.dependencies).toEqual({ "@hakimi/tzdb-core": "0.1.0" });
    expect(rootPackage).not.toContain("vedic-civil-time-input-resolution-draft");
    expect(source).not.toMatch(/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bsendBeacon\b/);
    expect(source).not.toMatch(/\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|\bcaches\b/);
    expect(source).not.toMatch(/from\s+["']node:(?:fs|net|http|https)["']/);
    expect(source).not.toMatch(/from\s+["'][^"']*apps\/web/);
    expect(source).not.toMatch(/from\s+["'][^"']*western-civil-time-input-adapter-draft/);
  });
});
