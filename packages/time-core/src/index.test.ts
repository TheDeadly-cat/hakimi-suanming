import { describe, expect, it } from "vitest";
import {
  LEGACY_UNIDENTIFIED_TZDB_VERSION,
  buildTimeZoneDatabaseSnapshotId
} from "@hakimi/contracts";
import type { BirthInput, DstDisambiguationPolicy } from "@hakimi/contracts";
import { RETAINED_TIME_ZONE_DATABASE_2025B } from "@hakimi/tzdb-core";
import {
  LUNAR_TO_SOLAR_ALGORITHM_ID,
  MIN_REVERSIBLE_GREGORIAN_DATE,
  RUNTIME_TIME_ZONE_DATABASE,
  RUNTIME_TZDB_VERSION,
  SOLAR_TO_LUNAR_ALGORITHM_ID,
  SOLAR_TIME_MODEL_ID,
  TimeNormalizationError,
  classifyStoredTimeZoneDatabaseForReplay,
  loadBundledTimeZoneCalculationContext,
  normalizeBirthTime,
  normalizeBirthTimeForBundledSnapshot,
  preflightCivilMinute,
  resolveBirthCalendarInput,
  resolveEventTimeContext,
  resolveEventTimeContextForBundledSnapshot,
  resolveGregorianCalendarDate,
  verifyEventTimeContext,
  verifyEventTimeContextWithBundledArtifact
} from "./index";
import boundaryFixtures from "../fixtures/time-boundaries.v1.json";

function birthInput(overrides: Partial<BirthInput> = {}): BirthInput {
  return {
    schemaVersion: "1.0.0",
    calendarType: "gregorian",
    date: "2024-01-15",
    time: "12:00",
    timePrecision: "exact_minute",
    timeZone: "Asia/Shanghai",
    sex: "unspecified",
    lunarLeapMonth: false,
    location: { label: "", latitude: null, longitude: null, precision: "unknown" },
    sourceNote: "",
    ...overrides
  };
}

describe("normalizeBirthTime", () => {
  it("公历走恒等解析并显式保存历法解析快照", () => {
    const result = normalizeBirthTime(birthInput(), "reject");

    expect(result.calendarResolution).toEqual({
      inputCalendarType: "gregorian",
      inputDate: "2024-01-15",
      inputLunarLeapMonth: false,
      resolvedGregorianDate: "2024-01-15",
      algorithmId: "hakimi-time-core:gregorian-identity:v1",
      frame: "identity_gregorian",
      upstreamName: null,
      upstreamVersion: null,
      roundTripVerified: true,
      sourceRefs: [],
      warnings: []
    });
  });

  it("把农历日期转换为公历民用日期，同时保留原始输入", () => {
    const input = birthInput({ calendarType: "lunar", date: "1995-07-23" });
    const snapshot = structuredClone(input);
    const resolved = resolveBirthCalendarInput(input);
    const result = normalizeBirthTime(input, "reject");

    expect(input).toEqual(snapshot);
    expect(resolved.originalInput).toEqual(input);
    expect(resolved.effectiveGregorianInput).toMatchObject({
      calendarType: "gregorian",
      date: "1995-08-18",
      lunarLeapMonth: false
    });
    expect(result.calendarResolution).toMatchObject({
      inputCalendarType: "lunar",
      inputDate: "1995-07-23",
      inputLunarLeapMonth: false,
      resolvedGregorianDate: "1995-08-18",
      algorithmId: LUNAR_TO_SOLAR_ALGORITHM_ID,
      roundTripVerified: true
    });
    expect(result.originalCivilDateTime).toBe("1995-08-18T12:00:00");
    expect(result.utcInstant).toBe("1995-08-18T04:00:00Z");
    expect(result.warnings.join(" ")).toContain("原始农历输入 1995-07-23");
  });

  it("区分普通二月与闰二月，并拒绝不存在的闰月", () => {
    const regular = normalizeBirthTime(
      birthInput({ calendarType: "lunar", date: "2023-02-01", lunarLeapMonth: false }),
      "reject"
    );
    const leap = normalizeBirthTime(
      birthInput({ calendarType: "lunar", date: "2023-02-01", lunarLeapMonth: true }),
      "reject"
    );

    expect(regular.calendarResolution.resolvedGregorianDate).toBe("2023-02-20");
    expect(leap.calendarResolution.resolvedGregorianDate).toBe("2023-03-22");
    expect(leap.calendarResolution.inputLunarLeapMonth).toBe(true);
    expect(() => normalizeBirthTime(
      birthInput({ calendarType: "lunar", date: "2024-01-01", lunarLeapMonth: true }),
      "reject"
    )).toThrowError(TimeNormalizationError);
  });

  it("提供可独立验收的公历到农历日期级反向解析", () => {
    expect(resolveGregorianCalendarDate("2023-03-22")).toMatchObject({
      inputGregorianDate: "2023-03-22",
      resolvedLunarDate: "2023-02-01",
      resolvedLunarLeapMonth: true,
      algorithmId: SOLAR_TO_LUNAR_ALGORITHM_ID,
      roundTripVerified: true
    });
    expect(resolveGregorianCalendarDate("1901-02-18")).toMatchObject({
      resolvedLunarDate: "1900-12-30",
      resolvedLunarLeapMonth: false
    });
    expect(resolveGregorianCalendarDate(MIN_REVERSIBLE_GREGORIAN_DATE)).toMatchObject({
      resolvedLunarDate: "1900-01-01",
      resolvedLunarLeapMonth: false
    });
    expect(() => resolveGregorianCalendarDate("1900-01-01")).toThrowError(TimeNormalizationError);
    expect(() => resolveGregorianCalendarDate("1900-01-30")).toThrowError(TimeNormalizationError);
    expect(() => resolveGregorianCalendarDate("2023-02-29")).toThrowError(TimeNormalizationError);
    expect(() => resolveGregorianCalendarDate("2101-01-01")).toThrowError(TimeNormalizationError);
  });

  it.each([
    ["2024-01-01", true, "INVALID_LUNAR_DATE"],
    ["2023-02-30", true, "INVALID_LUNAR_DATE"],
    ["2024-12-30", false, "INVALID_LUNAR_DATE"],
    ["2023-03-01", true, "INVALID_LUNAR_DATE"],
    ["2100-12-02", false, "LUNAR_DATE_OUTSIDE_SUPPORTED_SOLAR_RANGE"]
  ] as const)("按错误码拒绝无效或越界农历 %s（闰月=%s）", (date, lunarLeapMonth, expectedCode) => {
    expect.assertions(2);

    try {
      resolveBirthCalendarInput(birthInput({ calendarType: "lunar", date, lunarLeapMonth }));
    } catch (error) {
      expect(error).toBeInstanceOf(TimeNormalizationError);
      expect((error as TimeNormalizationError).code).toBe(expectedCode);
    }
  });

  it.each(boundaryFixtures.cases)("通过版本化时间边界 fixture：$id", (fixture) => {
    const result = normalizeBirthTime(
      birthInput({ date: fixture.date, time: fixture.time, timeZone: fixture.timeZone }),
      fixture.policy as DstDisambiguationPolicy
    );

    expect(result.timeZoneResolution.kind).toBe(fixture.expected.kind);
    expect(result.timeZoneResolution.status).toBe(fixture.expected.status);
    expect(result.utcInstant).toBe(fixture.expected.utcInstant);
    expect(result.utcOffset).toBe(fixture.expected.utcOffset);
    expect(result.timeZoneResolution.candidates).toHaveLength(fixture.expected.candidateCount);
  });

  it("归一化 Asia/Shanghai 的唯一民用时间", () => {
    const result = normalizeBirthTime(birthInput({ date: "1995-08-18", time: "08:26" }), "reject");

    expect(result.timeZoneResolution).toMatchObject({
      kind: "unique",
      policy: "reject",
      status: "resolved_unique"
    });
    expect(result.utcInstant).toBe("1995-08-18T00:26:00Z");
    expect(result.utcOffset).toBe("+08:00");
    expect(result.timeZoneResolution.candidates).toHaveLength(1);
    expect(result.originalCivilDateTime).toBe("1995-08-18T08:26:00");
  });

  it("秒级输入不被截断或补写为整分钟", () => {
    const result = normalizeBirthTime(
      birthInput({ date: "2024-02-04", time: "16:27:07", timePrecision: "exact_second" }),
      "reject"
    );

    expect(result.originalCivilDateTime).toBe("2024-02-04T16:27:07");
    expect(result.utcInstant).toBe("2024-02-04T08:27:07Z");
    expect(result.timeZoneResolution.requestedWallTime).toBe("2024-02-04T16:27:07");
  });

  it("DST overlap 的 reject 策略保留两个候选但绝不静默选择", () => {
    const input = birthInput({ date: "2024-11-03", time: "01:30", timeZone: "America/New_York" });
    const result = normalizeBirthTime(input, "reject");

    expect(result.timeZoneResolution.kind).toBe("overlap");
    expect(result.timeZoneResolution.status).toBe("rejected_overlap");
    expect(result.timeZoneResolution.candidates.map((candidate) => candidate.instant)).toEqual([
      "2024-11-03T05:30:00Z",
      "2024-11-03T06:30:00Z"
    ]);
    expect(result.timeZoneResolution.candidates.map((candidate) => candidate.utcOffset)).toEqual(["-04:00", "-05:00"]);
    expect(result.timeZoneResolution.selectedCandidate).toBeNull();
    expect(result.utcInstant).toBeNull();
    expect(result.normalizationStatus).toBe("wall_time_only");
  });

  it.each([
    ["earlier", "resolved_overlap_earlier", "2024-11-03T05:30:00Z", "-04:00"],
    ["later", "resolved_overlap_later", "2024-11-03T06:30:00Z", "-05:00"]
  ] as const)("DST overlap 可显式选择 %s 候选", (policy, status, instant, offset) => {
    const input = birthInput({ date: "2024-11-03", time: "01:30", timeZone: "America/New_York" });
    const result = normalizeBirthTime(input, policy);

    expect(result.timeZoneResolution.status).toBe(status);
    expect(result.timeZoneResolution.selectedCandidate?.choice).toBe(policy);
    expect(result.utcInstant).toBe(instant);
    expect(result.utcOffset).toBe(offset);
  });

  it("DST gap 的 reject 策略不移动原输入并返回两个显式调整方案", () => {
    const input = birthInput({ date: "2024-03-10", time: "02:30", timeZone: "America/New_York" });
    const result = normalizeBirthTime(input, "reject");

    expect(result.timeZoneResolution.kind).toBe("gap");
    expect(result.timeZoneResolution.status).toBe("rejected_gap");
    expect(result.timeZoneResolution.candidates.map((candidate) => candidate.resolvedWallTime)).toEqual([
      "2024-03-10T01:30:00",
      "2024-03-10T03:30:00"
    ]);
    expect(result.timeZoneResolution.candidates.every((candidate) => !candidate.matchesInputWallTime)).toBe(true);
    expect(result.timeZoneResolution.selectedCandidate).toBeNull();
    expect(result.utcInstant).toBeNull();
    expect(result.activeWallTime).toBe("2024-03-10T02:30:00");
  });

  it.each([
    ["earlier", "shifted_gap_earlier", "2024-03-10T01:30:00"],
    ["later", "shifted_gap_later", "2024-03-10T03:30:00"]
  ] as const)("DST gap 的 %s 策略显式标记移动后的活动时间", (policy, status, activeWallTime) => {
    const input = birthInput({ date: "2024-03-10", time: "02:30", timeZone: "America/New_York" });
    const result = normalizeBirthTime(input, policy as DstDisambiguationPolicy);

    expect(result.timeZoneResolution.status).toBe(status);
    expect(result.activeWallTime).toBe(activeWallTime);
    expect(result.originalCivilDateTime).toBe("2024-03-10T02:30:00");
    expect(result.warnings.join(" ")).toContain("原输入仍单独保留");
  });

  it("保留 Asia/Kathmandu 的 +05:45 非整点偏移", () => {
    const result = normalizeBirthTime(birthInput({ timeZone: "Asia/Kathmandu" }), "reject");

    expect(result.utcOffset).toBe("+05:45");
    expect(result.utcInstant).toBe("2024-01-15T06:15:00Z");
    expect(result.timeZoneResolution.status).toBe("resolved_unique");
  });

  it("支持 Pacific/Kiritimati 的 UTC+14 与 UTC 日期回退", () => {
    const result = normalizeBirthTime(birthInput({ timeZone: "Pacific/Kiritimati" }), "reject");

    expect(result.utcOffset).toBe("+14:00");
    expect(result.utcInstant).toBe("2024-01-14T22:00:00Z");
  });

  it("坐标存在时生成地方平太阳时和 NOAA 视太阳时，并显式记录跨日", () => {
    const result = normalizeBirthTime(
      birthInput({
        date: "2024-06-21",
        time: "00:30",
        location: { label: "中国西部边界样例", latitude: 39.5, longitude: 73.5, precision: "coordinates" }
      }),
      "reject"
    );

    expect(result.solarTime).not.toBeNull();
    expect(result.solarTime?.modelId).toBe(SOLAR_TIME_MODEL_ID);
    expect(result.solarTime?.applied).toBe(false);
    expect(result.solarTime?.variants).toHaveLength(1);
    expect(result.solarTime?.variants[0].longitudeCorrectionMinutes).toBe(-186);
    expect(result.solarTime?.variants[0].meanSolarDateTime).toMatch(/^2024-06-20T/);
    expect(result.solarTime?.variants[0].apparentSolarDateTime).toMatch(/^2024-06-20T/);
    expect(result.solarTimePreview).toMatch(/^2024-06-20T/);
    expect(result.solarTimeApplied).toBe(false);
    expect(result.warnings.join(" ")).toContain("跨越了民用日期边界");
  });

  it("没有完整坐标时不伪造太阳时预览", () => {
    const result = normalizeBirthTime(
      birthInput({ location: { label: "只有经度", latitude: null, longitude: 116.4, precision: "city" } }),
      "reject"
    );

    expect(result.solarTime).toBeNull();
    expect(result.solarTimePreview).toBeNull();
    expect(result.warnings.join(" ")).toContain("经纬度不完整");
  });
});

describe("bundled snapshot birth-time parallel calculation", () => {
  it("keeps 2026c/2025b/2026c resolver use isolated across a real Casablanca change", async () => {
    const input = birthInput({
      date: "2026-10-01",
      time: "12:00",
      timeZone: "Africa/Casablanca"
    });
    const [currentA, retained, currentB] = await Promise.all([
      normalizeBirthTimeForBundledSnapshot(input, "reject", RUNTIME_TZDB_VERSION),
      normalizeBirthTimeForBundledSnapshot(
        input,
        "reject",
        RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId
      ),
      normalizeBirthTimeForBundledSnapshot(input, "reject", RUNTIME_TZDB_VERSION)
    ]);

    expect(currentA.timeZoneDatabase).toEqual(RUNTIME_TIME_ZONE_DATABASE);
    expect(currentB).toEqual(currentA);
    expect(currentA.timeCalibration).toMatchObject({
      utcInstant: "2026-10-01T12:00:00Z",
      utcOffset: "+00:00"
    });
    expect(retained.timeZoneDatabase).toEqual(RETAINED_TIME_ZONE_DATABASE_2025B);
    expect(retained.timeCalibration).toMatchObject({
      utcInstant: "2026-10-01T11:00:00Z",
      utcOffset: "+01:00"
    });
  });

  it("fails closed for an unavailable snapshot or a conflicting frozen descriptor", async () => {
    await expect(loadBundledTimeZoneCalculationContext(
      "iana-tzdb@2024a/sha256:" + "0".repeat(64) +
      "/hakimi-tzdb-core@1.0.0/moment-timezone@0.6.3"
    )).rejects.toMatchObject({ code: "TZDB_ARTIFACT_UNAVAILABLE" });

    const conflicting = {
      ...structuredClone(RETAINED_TIME_ZONE_DATABASE_2025B),
      artifactName: "tampered/packed.json"
    };
    await expect(loadBundledTimeZoneCalculationContext(
      RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId,
      conflicting
    )).rejects.toMatchObject({ code: "TZDB_SNAPSHOT_MISMATCH" });
  });
});

function expectTimeNormalizationCode(run: () => unknown, expectedCode: string): void {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(TimeNormalizationError);
    expect((error as TimeNormalizationError).code).toBe(expectedCode);
    return;
  }
  throw new Error(`Expected TimeNormalizationError(${expectedCode}).`);
}

describe("Event civil-minute time contexts", () => {
  it("resolves and verifies a unique Asia/Shanghai civil minute", () => {
    const preflight = preflightCivilMinute({
      localDateTime: "2024-01-15T12:00",
      timeZone: "Asia/Shanghai"
    });
    expect(preflight).toMatchObject({
      kind: "unique",
      requestedWallTime: "2024-01-15T12:00:00",
      timeZone: "Asia/Shanghai"
    });
    expect(preflight.candidates).toHaveLength(1);
    expect(preflight.candidates[0]).toMatchObject({
      choice: "unique",
      instant: "2024-01-15T04:00:00Z",
      utcOffset: "+08:00",
      matchesInputWallTime: true
    });

    const context = resolveEventTimeContext({
      datePrecision: "minute",
      startDate: "2024-01-15T12:00",
      endDate: null,
      timeZone: "Asia/Shanghai"
    });
    expect(context).toMatchObject({
      kind: "zoned_minute",
      timeZone: "Asia/Shanghai",
      tzdbVersion: RUNTIME_TZDB_VERSION,
      timeZoneDatabase: RUNTIME_TIME_ZONE_DATABASE,
      start: {
        localDateTime: "2024-01-15T12:00",
        canonicalUtc: "2024-01-15T04:00:00Z",
        resolution: { kind: "unique", policy: "reject", status: "resolved_unique" }
      },
      end: null
    });
    expect(verifyEventTimeContext({
      datePrecision: "minute",
      startDate: "2024-01-15T12:00",
      endDate: null,
      timeContext: context
    })).toEqual(context);
  });

  it("preflights a New York overlap and refuses an implicit choice", () => {
    const preflight = preflightCivilMinute({
      localDateTime: "2024-11-03T01:30",
      timeZone: "America/New_York"
    });
    expect(preflight.kind).toBe("overlap");
    expect(preflight.candidates.map((candidate) => candidate.instant)).toEqual([
      "2024-11-03T05:30:00Z",
      "2024-11-03T06:30:00Z"
    ]);
    expect(preflight.candidates.map((candidate) => candidate.utcOffset)).toEqual(["-04:00", "-05:00"]);

    expectTimeNormalizationCode(() => resolveEventTimeContext({
      datePrecision: "minute",
      startDate: "2024-11-03T01:30",
      endDate: null,
      timeZone: "America/New_York"
    }), "DST_OVERLAP_REQUIRES_CHOICE");
  });

  it.each([
    ["earlier", "resolved_overlap_earlier", "2024-11-03T05:30:00Z", "-04:00"],
    ["later", "resolved_overlap_later", "2024-11-03T06:30:00Z", "-05:00"]
  ] as const)("persists the explicit New York overlap choice %s", (choice, status, utc, offset) => {
    const context = resolveEventTimeContext({
      datePrecision: "minute",
      startDate: "2024-11-03T01:30",
      endDate: null,
      timeZone: "America/New_York",
      startDisambiguation: choice
    });
    if (context.kind !== "zoned_minute") throw new Error("Expected zoned_minute.");

    expect(context.start.canonicalUtc).toBe(utc);
    expect(context.start.resolution).toMatchObject({
      kind: "overlap",
      policy: choice,
      status,
      selectedCandidate: { choice, utcOffset: offset, instant: utc }
    });
    expect(verifyEventTimeContext({
      datePrecision: "minute",
      startDate: "2024-11-03T01:30",
      endDate: null,
      timeContext: context
    })).toEqual(context);
  });

  it("always rejects a New York DST gap without shifting the event", () => {
    const preflight = preflightCivilMinute({
      localDateTime: "2024-03-10T02:30",
      timeZone: "America/New_York"
    });
    expect(preflight.kind).toBe("gap");
    expect(preflight.candidates.every((candidate) => !candidate.matchesInputWallTime)).toBe(true);

    for (const policy of ["reject", "earlier", "later"] as const) {
      expectTimeNormalizationCode(() => resolveEventTimeContext({
        datePrecision: "minute",
        startDate: "2024-03-10T02:30",
        endDate: null,
        timeZone: "America/New_York",
        startDisambiguation: policy
      }), "DST_GAP_REJECTED");
    }
  });

  it("rejects invalid zones and malformed civil minutes with explicit codes", () => {
    expectTimeNormalizationCode(() => preflightCivilMinute({
      localDateTime: "2024-01-15T12:00",
      timeZone: "Mars/Olympus"
    }), "INVALID_TIME_ZONE");
    expectTimeNormalizationCode(() => preflightCivilMinute({
      localDateTime: "2024-01-15T12:00:30",
      timeZone: "Asia/Shanghai"
    }), "INVALID_CIVIL_MINUTE");
  });

  it("uses calendar_date for every non-minute precision", () => {
    for (const datePrecision of ["year", "month", "day", "unknown"] as const) {
      expect(resolveEventTimeContext({
        datePrecision,
        startDate: datePrecision === "unknown" ? null : "2024",
        endDate: null
      })).toEqual({ kind: "calendar_date" });
    }
  });

  it("orders a fall-back interval by canonical UTC rather than wall-clock text", () => {
    const context = resolveEventTimeContext({
      datePrecision: "minute",
      startDate: "2024-11-03T01:45",
      endDate: "2024-11-03T01:15",
      timeZone: "America/New_York",
      startDisambiguation: "earlier",
      endDisambiguation: "later"
    });
    if (context.kind !== "zoned_minute" || !context.end) throw new Error("Expected a zoned range.");
    expect(context.start.canonicalUtc).toBe("2024-11-03T05:45:00Z");
    expect(context.end.canonicalUtc).toBe("2024-11-03T06:15:00Z");

    expectTimeNormalizationCode(() => resolveEventTimeContext({
      datePrecision: "minute",
      startDate: "2024-11-03T01:45",
      endDate: "2024-11-03T01:15",
      timeZone: "America/New_York",
      startDisambiguation: "later",
      endDisambiguation: "earlier"
    }), "EVENT_TIME_RANGE_INVALID");
  });

  it("rejects a structurally valid but non-replayable UTC candidate mutation", () => {
    const context = resolveEventTimeContext({
      datePrecision: "minute",
      startDate: "2024-01-15T12:00",
      endDate: null,
      timeZone: "Asia/Shanghai"
    });
    if (context.kind !== "zoned_minute") throw new Error("Expected zoned_minute.");
    const forged = structuredClone(context);
    forged.start.canonicalUtc = "2024-01-15T04:01:00Z";
    forged.start.resolution.candidates[0].instant = "2024-01-15T04:01:00Z";
    forged.start.resolution.selectedCandidate.instant = "2024-01-15T04:01:00Z";

    expectTimeNormalizationCode(() => verifyEventTimeContext({
      datePrecision: "minute",
      startDate: "2024-01-15T12:00",
      endDate: null,
      timeContext: forged
    }), "EVENT_TIME_CONTEXT_MISMATCH");
  });

  it("keeps a legacy browser-Intl event readable without silently re-signing it", () => {
    const current = resolveEventTimeContext({
      datePrecision: "minute",
      startDate: "2024-01-15T12:00",
      endDate: null,
      timeZone: "Asia/Shanghai"
    });
    if (current.kind !== "zoned_minute") throw new Error("Expected zoned_minute.");
    const legacy = {
      ...current,
      tzdbVersion: LEGACY_UNIDENTIFIED_TZDB_VERSION,
      timeZoneDatabase: undefined
    };
    expect(verifyEventTimeContext({
      datePrecision: "minute",
      startDate: "2024-01-15T12:00",
      endDate: null,
      timeContext: legacy
    })).toEqual(legacy);
  });

  it("keeps a structurally bound historical tzdb snapshot readable without replaying it as current", () => {
    const current = resolveEventTimeContext({
      datePrecision: "minute",
      startDate: "2024-01-15T12:00",
      endDate: null,
      timeZone: "Asia/Shanghai"
    });
    if (current.kind !== "zoned_minute") {
      throw new Error("Expected an identified zoned_minute context.");
    }
    const historical = structuredClone(current);
    const historicalDatabase = historical.timeZoneDatabase;
    if (!historicalDatabase) throw new Error("Expected an identified tzdb snapshot.");
    historicalDatabase.dataSha256 = historicalDatabase.dataSha256.endsWith("0")
      ? `${historicalDatabase.dataSha256.slice(0, -1)}1`
      : `${historicalDatabase.dataSha256.slice(0, -1)}0`;
    historicalDatabase.snapshotId = buildTimeZoneDatabaseSnapshotId(historicalDatabase);
    historical.tzdbVersion = historicalDatabase.snapshotId;

    expect(verifyEventTimeContext({
      datePrecision: "minute",
      startDate: "2024-01-15T12:00",
      endDate: null,
      timeContext: historical
    })).toEqual(historical);
  });

  it("replays a retained 2025b Event and proves a real 2025b→2026c UTC change", async () => {
    const input = {
      datePrecision: "minute" as const,
      startDate: "2026-10-01T12:00",
      endDate: null,
      timeZone: "Africa/Casablanca"
    };
    const historical = await resolveEventTimeContextForBundledSnapshot(
      input,
      RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId
    );
    const current = resolveEventTimeContext(input);
    if (historical.kind !== "zoned_minute" || current.kind !== "zoned_minute") {
      throw new Error("Expected identified zoned_minute contexts.");
    }

    expect(historical.start.canonicalUtc).toBe("2026-10-01T11:00:00Z");
    expect(historical.start.resolution.selectedCandidate.utcOffset).toBe("+01:00");
    expect(current.start.canonicalUtc).toBe("2026-10-01T12:00:00Z");
    expect(current.start.resolution.selectedCandidate.utcOffset).toBe("+00:00");
    expect(classifyStoredTimeZoneDatabaseForReplay(historical)).toBe("retained_exact");
    await expect(verifyEventTimeContextWithBundledArtifact({
      datePrecision: input.datePrecision,
      startDate: input.startDate,
      endDate: input.endDate,
      timeContext: historical
    })).resolves.toEqual(historical);
  });

  it("fails historical replay for a descriptor conflict even when snapshotId still matches", async () => {
    const historical = await resolveEventTimeContextForBundledSnapshot({
      datePrecision: "minute",
      startDate: "2026-10-01T12:00",
      endDate: null,
      timeZone: "Africa/Casablanca"
    }, RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId);
    if (historical.kind !== "zoned_minute" || !historical.timeZoneDatabase) {
      throw new Error("Expected an identified zoned_minute context.");
    }
    const conflicting = structuredClone(historical);
    if (!conflicting.timeZoneDatabase) throw new Error("Expected retained tzdb metadata.");
    conflicting.timeZoneDatabase.artifactName = "tampered/packed.json";

    expect(classifyStoredTimeZoneDatabaseForReplay(conflicting)).toBe("descriptor_mismatch");
    await expect(verifyEventTimeContextWithBundledArtifact({
      datePrecision: "minute",
      startDate: "2026-10-01T12:00",
      endDate: null,
      timeContext: conflicting
    })).rejects.toMatchObject({ code: "TZDB_SNAPSHOT_MISMATCH" });
  });

  it("detects a structurally valid mutation by replaying against retained bytes", async () => {
    const historical = await resolveEventTimeContextForBundledSnapshot({
      datePrecision: "minute",
      startDate: "2026-10-01T12:00",
      endDate: null,
      timeZone: "Africa/Casablanca"
    }, RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId);
    if (historical.kind !== "zoned_minute") throw new Error("Expected zoned_minute.");
    const forged = structuredClone(historical);
    forged.start.canonicalUtc = "2026-10-01T11:01:00Z";
    forged.start.resolution.candidates[0]!.instant = "2026-10-01T11:01:00Z";
    forged.start.resolution.selectedCandidate.instant = "2026-10-01T11:01:00Z";

    await expect(verifyEventTimeContextWithBundledArtifact({
      datePrecision: "minute",
      startDate: "2026-10-01T12:00",
      endDate: null,
      timeContext: forged
    })).rejects.toMatchObject({ code: "EVENT_TIME_CONTEXT_MISMATCH" });
  });
});
