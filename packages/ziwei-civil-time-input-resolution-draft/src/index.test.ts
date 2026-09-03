import { describe, expect, it } from "vitest";
import {
  BUNDLED_TIME_ZONE_DATABASE,
  BUNDLED_TZDB_SNAPSHOT_ID,
  RETAINED_TZDB_2025B_SNAPSHOT_ID
} from "@hakimi/tzdb-core";
import {
  ZIWEI_CIVIL_TIME_RESOLUTION_PROTOCOL_VERSION,
  areZiweiCivilTimeTzdbBindingsEqual,
  captureZiweiCivilTimeTzdbBinding,
  isExpectedZiweiCivilTimeParentContractIdentity,
  isZiweiCivilTimeResolutionCandidate,
  projectZiweiCivilTimeRedactedSummary,
  resolveZiweiCivilTimeInputDraft,
  type ZiweiCivilTimeResolutionCandidate
} from "./index.ts";
import { ZIWEI_SHICHEN_SLOTS } from "./contract-bridge.ts";

function request(overrides: Record<string, unknown> = {}) {
  return {
    protocolVersion: ZIWEI_CIVIL_TIME_RESOLUTION_PROTOCOL_VERSION,
    systemId: "ziwei-doushu",
    calendarInput: { calendar: "gregorian", date: "2025-03-20" },
    localTime: "12:00",
    timePrecision: "exact_minute",
    uncertainty: "exact",
    timeZone: "Asia/Shanghai",
    dstDisambiguation: "reject",
    location: {
      precision: "coordinates",
      label: "declared location",
      latitude: 31.2304,
      longitude: 121.4737
    },
    solarTimeAdjustment: "none",
    tzdbSnapshotId: BUNDLED_TZDB_SNAPSHOT_ID,
    ...overrides
  };
}

async function expectCandidate(value: unknown): Promise<ZiweiCivilTimeResolutionCandidate> {
  const result = await resolveZiweiCivilTimeInputDraft(value);
  expect(result.outcome).toBe("resolved_candidate");
  if (result.outcome !== "resolved_candidate") throw new Error(`expected candidate, got ${result.code}`);
  return result;
}

describe("Ziwei civil-time input resolution draft", () => {
  it("resolves one exact civil minute without producing a parent input or invoking an engine", async () => {
    const candidate = await expectCandidate(request());

    expect(candidate.civilResolution).toMatchObject({
      kind: "unique",
      decision: "unique",
      utcInstant: "2025-03-20T04:00:00.000Z",
      utcOffsetSeconds: 28_800,
      requestedLocalTimeRoundTripVerified: true
    });
    expect(candidate.shichenResolution).toMatchObject({
      index: 6,
      branchId: "wu",
      civilRange: "11:00-13:00",
      localMinuteOfDay: 720,
      parentSlotCount: 13,
      derivedOnlyFromFrozenWallClockPartition: true,
      timeZoneChangesSlotPartition: false,
      solarTimeApplied: false
    });
    expect(candidate.parentCompatibility).toEqual({
      currentParentContractVersion: "0.1.0-draft.3",
      currentContractCivilContextUsedForCalculationLockedFalse: true,
      currentZiweiBirthInputIssued: false,
      currentAdapterInvocationAuthorized: false,
      parentContractSuccessorRequiredBeforeEngineConsumption: true
    });
    expect(candidate.audit).toMatchObject({
      hostIntlUsed: false,
      hostTimeZoneDatabaseUsed: false,
      hostTimeZoneFallbackUsed: false,
      networkTransmissionPerformed: false,
      persistencePerformed: false,
      ziweiEngineInvoked: false,
      currentZiweiBirthInputProduced: false,
      processLocalCapabilityRegistryMutationPerformed: true,
      persistentOrUserStateMutationPerformed: false,
      schema13MutationPerformed: false,
      mutationEpoch: null
    });
    expect(Object.isFrozen(candidate)).toBe(true);
    expect(Object.isFrozen(candidate.shichenResolution)).toBe(true);
    expect(Object.isFrozen(candidate.tzdbBinding.supportedRange)).toBe(true);
  });

  it("hard-locks the current parent identity instead of silently following an upgrade", () => {
    expect(isExpectedZiweiCivilTimeParentContractIdentity("0.1.0-draft.3", "ziwei-doushu")).toBe(true);
    expect(isExpectedZiweiCivilTimeParentContractIdentity("0.1.0-draft.4", "ziwei-doushu")).toBe(false);
    expect(isExpectedZiweiCivilTimeParentContractIdentity("0.1.0-draft.3", "ziwei-doushu-v2")).toBe(false);
  });

  it("fails closed when a shallow-frozen parent slot entry drifts and restores the shared fixture", async () => {
    const mutableSlot = ZIWEI_SHICHEN_SLOTS[0] as { civilRange: string };
    const originalCivilRange = mutableSlot.civilRange;
    try {
      mutableSlot.civilRange = "00:00-00:59";
      const result = await resolveZiweiCivilTimeInputDraft(request({ localTime: "00:30" }));
      expect(result).toMatchObject({
        outcome: "failed_closed",
        code: "PARENT_SLOT_TABLE_DRIFT",
        stage: "parent_contract_binding",
        shichenResolution: null
      });
    } finally {
      mutableSlot.civilRange = originalCivilRange;
    }
    expect(ZIWEI_SHICHEN_SLOTS[0].civilRange).toBe("00:00-01:00");
  });

  it("detects post-capture tzdb descriptor drift with a detached frozen pre-load binding", () => {
    const controlledRegistryFixture = structuredClone(BUNDLED_TIME_ZONE_DATABASE) as unknown as {
      dataSha256: string;
      resolver: { name: string; version: string };
    };
    const preLoad = captureZiweiCivilTimeTzdbBinding(
      controlledRegistryFixture as unknown as typeof BUNDLED_TIME_ZONE_DATABASE
    );
    controlledRegistryFixture.dataSha256 = "0".repeat(64);
    controlledRegistryFixture.resolver.version = "1.0.1";
    const postLoad = captureZiweiCivilTimeTzdbBinding(
      controlledRegistryFixture as unknown as typeof BUNDLED_TIME_ZONE_DATABASE
    );

    expect(preLoad.dataSha256).toBe(BUNDLED_TIME_ZONE_DATABASE.dataSha256);
    expect(preLoad.resolver.version).toBe("1.0.0");
    expect(Object.isFrozen(preLoad)).toBe(true);
    expect(Object.isFrozen(preLoad.resolver)).toBe(true);
    expect(areZiweiCivilTimeTzdbBindingsEqual(preLoad, postLoad)).toBe(false);
  });

  it.each([
    ["00:00", 0, "zi", "00:00-01:00"],
    ["00:59", 0, "zi", "00:00-01:00"],
    ["01:00", 1, "chou", "01:00-03:00"],
    ["02:59", 1, "chou", "01:00-03:00"],
    ["03:00", 2, "yin", "03:00-05:00"],
    ["04:59", 2, "yin", "03:00-05:00"],
    ["05:00", 3, "mao", "05:00-07:00"],
    ["06:59", 3, "mao", "05:00-07:00"],
    ["07:00", 4, "chen", "07:00-09:00"],
    ["08:59", 4, "chen", "07:00-09:00"],
    ["09:00", 5, "si", "09:00-11:00"],
    ["10:59", 5, "si", "09:00-11:00"],
    ["11:00", 6, "wu", "11:00-13:00"],
    ["12:59", 6, "wu", "11:00-13:00"],
    ["13:00", 7, "wei", "13:00-15:00"],
    ["14:59", 7, "wei", "13:00-15:00"],
    ["15:00", 8, "shen", "15:00-17:00"],
    ["16:59", 8, "shen", "15:00-17:00"],
    ["17:00", 9, "you", "17:00-19:00"],
    ["18:59", 9, "you", "17:00-19:00"],
    ["19:00", 10, "xu", "19:00-21:00"],
    ["20:59", 10, "xu", "19:00-21:00"],
    ["21:00", 11, "hai", "21:00-23:00"],
    ["22:59", 11, "hai", "21:00-23:00"],
    ["23:00", 12, "zi", "23:00-24:00"],
    ["23:59", 12, "zi", "23:00-24:00"]
  ])("maps %s to parent slot %i", async (localTime, index, branchId, civilRange) => {
    const candidate = await expectCandidate(request({ localTime }));
    expect(candidate.shichenResolution).toMatchObject({ index, branchId, civilRange });
  });

  it("keeps early-Zi and late-Zi distinct and never chooses an effective calculation date", async () => {
    const early = await expectCandidate(request({ localTime: "00:00" }));
    const late = await expectCandidate(request({ localTime: "23:00" }));

    expect(early.lateZiBoundary).toEqual({
      isEarlyZiSlot: true,
      isLateZiSlot: false,
      observedCivilDate: "2025-03-20",
      lateZiDayPolicyApplied: false,
      effectiveCalculationDate: null,
      requiredDownstreamRuleField: null
    });
    expect(late.lateZiBoundary).toEqual({
      isEarlyZiSlot: false,
      isLateZiSlot: true,
      observedCivilDate: "2025-03-20",
      lateZiDayPolicyApplied: false,
      effectiveCalculationDate: null,
      requiredDownstreamRuleField: "rules.lateZiDay"
    });
  });

  it("rejects 24:00, seconds, uncertainty, and non-Gregorian input", async () => {
    const values = [
      request({ localTime: "24:00" }),
      request({ localTime: "12:00:00" }),
      request({ timePrecision: "exact_second" }),
      request({ uncertainty: "unknown" }),
      request({ calendarInput: { calendar: "chinese_lunisolar", date: "2025-03-20" } })
    ];
    for (const value of values) {
      const result = await resolveZiweiCivilTimeInputDraft(value);
      expect(result.outcome).toBe("failed_closed");
      expect(result).toMatchObject({
        partialResolutionReturned: false,
        civilResolution: null,
        shichenResolution: null,
        lateZiBoundary: null
      });
    }
  });

  it("rejects a DST gap without shifting to a neighboring wall time", async () => {
    const result = await resolveZiweiCivilTimeInputDraft(request({
      calendarInput: { calendar: "gregorian", date: "2025-03-09" },
      localTime: "02:30",
      timeZone: "America/New_York",
      dstDisambiguation: "later"
    }));
    expect(result).toMatchObject({
      outcome: "failed_closed",
      code: "DST_GAP_REJECTED",
      stage: "dst_policy",
      partialResolutionReturned: false,
      shichenResolution: null
    });
    expect(result.audit.processLocalCapabilityRegistryMutationPerformed).toBe(false);
  });

  it("selects overlap earlier/later by UTC instant while retaining the same shichen and rejects reject-policy", async () => {
    const base = {
      calendarInput: { calendar: "gregorian", date: "2025-11-02" },
      localTime: "01:30",
      timeZone: "America/New_York"
    };
    const earlier = await expectCandidate(request({ ...base, dstDisambiguation: "earlier" }));
    const later = await expectCandidate(request({ ...base, dstDisambiguation: "later" }));
    const rejected = await resolveZiweiCivilTimeInputDraft(request({ ...base, dstDisambiguation: "reject" }));

    expect(earlier.civilResolution).toMatchObject({
      kind: "overlap",
      decision: "earlier",
      utcInstant: "2025-11-02T05:30:00.000Z",
      utcOffsetSeconds: -14_400
    });
    expect(later.civilResolution).toMatchObject({
      kind: "overlap",
      decision: "later",
      utcInstant: "2025-11-02T06:30:00.000Z",
      utcOffsetSeconds: -18_000
    });
    expect(earlier.shichenResolution).toMatchObject({ index: 1, branchId: "chou" });
    expect(later.shichenResolution).toMatchObject({ index: 1, branchId: "chou" });
    expect(earlier.digests.resolutionSha256).not.toBe(later.digests.resolutionSha256);
    expect(rejected).toMatchObject({ outcome: "failed_closed", code: "DST_OVERLAP_REJECTED" });
  });

  it("binds the selected retained/current snapshot instead of silently replacing it", async () => {
    const base = {
      calendarInput: { calendar: "gregorian", date: "2026-10-01" },
      localTime: "12:00",
      timeZone: "Africa/Casablanca"
    };
    const current = await expectCandidate(request(base));
    const retained = await expectCandidate(request({ ...base, tzdbSnapshotId: RETAINED_TZDB_2025B_SNAPSHOT_ID }));

    expect(current.tzdbBinding).toMatchObject({ snapshotId: BUNDLED_TZDB_SNAPSHOT_ID, ianaVersion: "2026c" });
    expect(retained.tzdbBinding).toMatchObject({ snapshotId: RETAINED_TZDB_2025B_SNAPSHOT_ID, ianaVersion: "2025b" });
    expect(current.civilResolution.utcInstant).toBe("2026-10-01T12:00:00.000Z");
    expect(retained.civilResolution.utcInstant).toBe("2026-10-01T11:00:00.000Z");
    expect(current.shichenResolution).toMatchObject({ index: 6, branchId: "wu" });
    expect(retained.shichenResolution).toMatchObject({ index: 6, branchId: "wu" });
    expect(current.digests.requestSha256).not.toBe(retained.digests.requestSha256);
  });

  it("uses the complete pre-await data snapshot even when the caller mutates the original object", async () => {
    const raw = request();
    const pending = resolveZiweiCivilTimeInputDraft(raw);
    raw.localTime = "23:00";
    raw.location.latitude = -45;
    raw.tzdbSnapshotId = RETAINED_TZDB_2025B_SNAPSHOT_ID;
    const result = await pending;
    expect(result.outcome).toBe("resolved_candidate");
    if (result.outcome !== "resolved_candidate") throw new Error(result.code);
    expect(result.civilTime.localTime).toBe("12:00");
    expect(result.location.latitudeDegrees).toBe(31.2304);
    expect(result.tzdbBinding.snapshotId).toBe(BUNDLED_TZDB_SNAPSHOT_ID);
    expect(result.shichenResolution.index).toBe(6);
  });

  it("applies Gregorian leap rules and the exact tzdb supported date range", async () => {
    const invalid1900 = await resolveZiweiCivilTimeInputDraft(request({
      calendarInput: { calendar: "gregorian", date: "1900-02-29" }
    }));
    const valid2000 = await expectCandidate(request({
      calendarInput: { calendar: "gregorian", date: "2000-02-29" }
    }));
    const invalid2100 = await resolveZiweiCivilTimeInputDraft(request({
      calendarInput: { calendar: "gregorian", date: "2100-02-29" }
    }));
    const lower = await expectCandidate(request({
      calendarInput: { calendar: "gregorian", date: "1900-01-01" },
      localTime: "00:00"
    }));
    const upper = await expectCandidate(request({
      calendarInput: { calendar: "gregorian", date: "2100-12-31" },
      localTime: "23:59"
    }));
    const outOfRange = await resolveZiweiCivilTimeInputDraft(request({
      calendarInput: { calendar: "gregorian", date: "1899-12-31" }
    }));

    expect(invalid1900.outcome).toBe("failed_closed");
    expect(valid2000.civilTime.date).toBe("2000-02-29");
    expect(invalid2100.outcome).toBe("failed_closed");
    expect(lower.civilTime.date).toBe("1900-01-01");
    expect(upper.civilTime.date).toBe("2100-12-31");
    expect(outOfRange).toMatchObject({ outcome: "failed_closed", code: "INVALID_GREGORIAN_WALL_TIME" });
  });

  it("fails closed for unavailable snapshots and unknown zones without a host fallback", async () => {
    const drifted = await resolveZiweiCivilTimeInputDraft(request({
      tzdbSnapshotId: BUNDLED_TZDB_SNAPSHOT_ID.replace(/sha256:[a-f0-9]{64}/u, `sha256:${"0".repeat(64)}`)
    }));
    const unknownZone = await resolveZiweiCivilTimeInputDraft(request({ timeZone: "Not/A_Real_Zone" }));
    expect(drifted).toMatchObject({ outcome: "failed_closed", code: "TZDB_ARTIFACT_UNAVAILABLE", stage: "tzdb_load" });
    expect(unknownZone).toMatchObject({ outcome: "failed_closed", code: "TZDB_UNKNOWN_ZONE", stage: "tzdb_resolution" });
    expect(drifted.audit.hostIntlUsed).toBe(false);
    expect(unknownZone.audit.hostTimeZoneFallbackUsed).toBe(false);
  });

  it.each([
    [{ protocolVersion: "wrong" }, "protocol"],
    [{ systemId: "bazi" }, "system"],
    [{ dstDisambiguation: "default" }, "DST default"],
    [{ solarTimeAdjustment: "true_solar" }, "solar adjustment"],
    [{ location: { precision: "coordinates", label: " x ", latitude: 0, longitude: 0 } }, "normalizing label"],
    [{ location: { precision: "coordinates", label: "x", latitude: 91, longitude: 0 } }, "latitude"],
    [{ location: { precision: "coordinates", label: "x", latitude: 0, longitude: 181 } }, "longitude"],
    [{ location: { precision: "coordinates", label: "x", latitude: -0, longitude: 0 } }, "negative zero"],
    [{ unexpected: true }, "unknown key"]
  ])("rejects invalid or widened input: %s (%s)", async (override, _label) => {
    const result = await resolveZiweiCivilTimeInputDraft(request(override as Record<string, unknown>));
    expect(result.outcome).toBe("failed_closed");
  });

  it("rejects an accessor without invoking its getter", async () => {
    let getterCalls = 0;
    const value = request();
    Object.defineProperty(value.location, "label", {
      enumerable: true,
      configurable: true,
      get() {
        getterCalls += 1;
        throw new Error("must not execute");
      }
    });
    const result = await resolveZiweiCivilTimeInputDraft(value);
    expect(result).toMatchObject({ outcome: "failed_closed", code: "INVALID_REQUEST_SHAPE" });
    expect(getterCalls).toBe(0);
  });

  it("contains a throwing Proxy trap without leaking the exception", async () => {
    let trapCalls = 0;
    const value = new Proxy(request(), {
      getPrototypeOf() {
        trapCalls += 1;
        throw new Error("hostile reflection trap");
      }
    });
    const result = await resolveZiweiCivilTimeInputDraft(value);
    expect(result).toMatchObject({ outcome: "failed_closed", code: "INVALID_REQUEST_SHAPE" });
    expect(trapCalls).toBe(1);
  });

  it("rejects custom prototypes, symbols, aliases, and cycles", async () => {
    const customPrototype = request();
    Object.setPrototypeOf(customPrototype.location, { inherited: true });
    const withSymbol = request();
    Object.defineProperty(withSymbol, Symbol("hidden"), { enumerable: true, value: true });
    const aliased = request();
    aliased.calendarInput = aliased.location as unknown as { calendar: string; date: string };
    const cyclic = request();
    (cyclic.location as Record<string, unknown>).cycle = cyclic;

    for (const value of [customPrototype, withSymbol, aliased, cyclic]) {
      const result = await resolveZiweiCivilTimeInputDraft(value);
      expect(result).toMatchObject({ outcome: "failed_closed", code: "INVALID_REQUEST_SHAPE" });
    }
  });

  it("brands only live module-created candidates and returns a value-free redacted summary", async () => {
    const candidate = await expectCandidate(request());
    const clone = structuredClone(candidate);
    const jsonClone = JSON.parse(JSON.stringify(candidate)) as unknown;
    const spread = { ...candidate };
    const wrapper = new Proxy(candidate, {});

    expect(isZiweiCivilTimeResolutionCandidate(candidate)).toBe(true);
    for (const value of [clone, jsonClone, spread, wrapper]) {
      expect(isZiweiCivilTimeResolutionCandidate(value)).toBe(false);
      expect(projectZiweiCivilTimeRedactedSummary(value)).toBeNull();
    }

    const summary = projectZiweiCivilTimeRedactedSummary(candidate);
    expect(summary).toMatchObject({
      genuineProcessLocalCandidate: true,
      containsExactOrDerivedBirthValues: false,
      containsPersonDerivedDigest: false,
      safeToLog: false,
      safeToPersist: false,
      safeToPublish: false,
      activeAdmissionEffect: "none",
      inputAcceptanceReceiptIssued: false,
      factReceiptIssued: false,
      releaseReady: false,
      publicDeploymentAuthorized: false
    });
    expect(summary).not.toHaveProperty("candidateSha256");
    expect(JSON.stringify(summary)).not.toContain("2025-03-20");
    expect(JSON.stringify(summary)).not.toContain("Asia/Shanghai");
    expect(Object.isFrozen(summary)).toBe(true);
  });

  it("emits deterministic domain-separated digests while keeping every gate effect zero", async () => {
    const first = await expectCandidate(request());
    const second = await expectCandidate(request());
    expect(first.digests).toEqual(second.digests);
    expect(first.digests.candidateSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(new Set([
      first.digests.inputSha256,
      first.digests.requestSha256,
      first.digests.parentSlotTableSha256,
      first.digests.resolutionSha256,
      first.digests.candidateSha256
    ]).size).toBe(5);
    expect(first.digests.digestIsDigitalSignature).toBe(false);
    expect(first.admissionEffect).toEqual({
      activeAdmissionEffect: "none",
      bindingFrozenVerifiedDelta: 0,
      independentExpertReviewsVerifiedDelta: 0,
      admissionGatesSatisfiedDelta: 0,
      sourceBundleCountDelta: 0,
      rightsBundleCountDelta: 0,
      releaseEvidenceCountDelta: 0
    });
    expect((Object.values(first.authorityBoundary) as unknown[]).filter((value) => value === true)).toEqual([]);
    expect(first.projectReleaseGovernanceContext).toEqual({
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      projectContextOnly: true,
      inheritedByZiweiProductIdentity: false,
      mutationEpochBoundaryRequired: true,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      expertClaimsAuthorized: false,
      publicDeploymentAuthorized: false
    });
  });
});
