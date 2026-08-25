import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  type BirthInput,
  type CalculatedChart,
  type RulePackBinding,
  type RuleProfile,
  type TimeZoneDatabaseSnapshot
} from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE, withDayBoundary, withTimeRules } from "@hakimi/rule-profiles";
import { RETAINED_TIME_ZONE_DATABASE_2025B } from "@hakimi/tzdb-core";
import { RUNTIME_TIME_ZONE_DATABASE, RUNTIME_TZDB_VERSION } from "@hakimi/time-core";
import {
  ENGINE,
  HISTORICAL_NATAL_EXECUTOR_REGISTRY,
  canonicalStringify,
  calculateChartForBundledSnapshot,
  digestRuleProfile,
  lookupHistoricalNatalChartExecutor,
  requireHistoricalNatalChartExecutor,
  sha256Hex
} from "./index";

const FIXED_CALCULATION_CLOCK = "2026-08-24T08:00:00.000Z";
const FULL_CHART_SHA256_GOLDENS = Object.freeze({
  shanghaiExactSecond: "968fe20e420ec2e4b69b772984ce7b0d21fd869971ef74f88c1558da2808061a",
  casablancaRetained2025b: "21342e8678407bc6d924207894586bfe294dfdb9a91f7ea545707e8983109af0",
  casablancaActive2026c: "d40742f32f319c12c6a8eb9b2b24aedcdc559973d262b11c76dae6cec8ac16c2",
  newYorkOverlapEarlier: "09c000ff2bf2f23395ea3ffc16163526dadca5b640814572d4dc6fbe8fe87fa9",
  newYorkOverlapLater: "90d8ab302099ec212e385a9448f9d3e468d19fe415496183e9d6eecc932ee46c",
  ziStart23: "233a73680ec1480cca7c38bfc22d74caf04dfaf5974b68b5932ba62ad4226f3f",
  midnight: "92d01564a529cc3156d622fe2edbe5589bcd95c46deb71ab1aa27420819a1ee5",
  rulePackWarning: "968f03d7981ceead7396be89b48ff61add2af99692f1d3511928a8bb850f2489"
});

const BASE_INPUT: BirthInput = {
  schemaVersion: "1.0.0",
  calendarType: "gregorian",
  date: "1995-08-18",
  time: "08:26",
  timePrecision: "exact_minute",
  timeZone: "Asia/Shanghai",
  sex: "male",
  lunarLeapMonth: false,
  location: { label: "历史执行器矩阵", latitude: null, longitude: null, precision: "city" },
  sourceNote: "仅用于工程回归。"
};

function withoutCalculatedAt(chart: CalculatedChart): unknown {
  const clone = structuredClone(chart);
  delete (clone.manifest as Partial<CalculatedChart["manifest"]>).calculatedAt;
  return clone;
}

async function fullChartSha256ExcludingCalculatedAt(chart: CalculatedChart): Promise<string> {
  return sha256Hex(canonicalStringify(withoutCalculatedAt(chart)));
}

async function expectHistoricalMatchesCurrent(
  input: BirthInput,
  profile: RuleProfile,
  snapshotId = RUNTIME_TZDB_VERSION,
  options: Parameters<typeof calculateChartForBundledSnapshot>[3] = {},
  expectedFullChartSha256?: string
): Promise<CalculatedChart> {
  const historical = requireHistoricalNatalChartExecutor(ENGINE);
  const [currentResult, historicalResult] = await Promise.all([
    calculateChartForBundledSnapshot(input, profile, snapshotId, options),
    historical.calculateChart(input, profile, snapshotId, options)
  ]);
  expect(withoutCalculatedAt(historicalResult)).toEqual(withoutCalculatedAt(currentResult));
  expect(historicalResult.manifest.resultHash).toBe(currentResult.manifest.resultHash);
  if (expectedFullChartSha256 !== undefined) {
    expect.soft(await fullChartSha256ExcludingCalculatedAt(currentResult)).toBe(expectedFullChartSha256);
    expect.soft(await fullChartSha256ExcludingCalculatedAt(historicalResult)).toBe(expectedFullChartSha256);
  }
  return historicalResult;
}

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(FIXED_CALCULATION_CLOCK));
});

afterAll(() => {
  vi.useRealTimers();
});

describe("source-locked historical natal executor 0.4.0", () => {
  it("keeps the exact descriptor, ID, lookup and fail-closed behavior while using a distinct function", () => {
    expect(HISTORICAL_NATAL_EXECUTOR_REGISTRY).toHaveLength(1);
    const executor = HISTORICAL_NATAL_EXECUTOR_REGISTRY[0]!;
    expect(executor.executorId).toBe("hakimi-bazi-core:natal-chart-executor:0.4.0");
    expect(Object.keys(executor.engine)).toEqual([
      "name",
      "version",
      "upstreamName",
      "upstreamVersion",
      "upstreamTagCommit",
      "upstreamIntegrity"
    ]);
    expect(executor.engine).toEqual(ENGINE);
    expect(executor.engine).not.toBe(ENGINE);
    expect(Object.isFrozen(executor.engine)).toBe(true);
    expect(executor.calculateChart).not.toBe(calculateChartForBundledSnapshot);
    expect(lookupHistoricalNatalChartExecutor(ENGINE)).toBe(executor);
    expect(lookupHistoricalNatalChartExecutor({ ...ENGINE, upstreamTagCommit: "different-build" })).toBeNull();
    expect(() => requireHistoricalNatalChartExecutor({ ...ENGINE, version: "9.9.9" }))
      .toThrow(/不会回退到当前版本/u);
  });

  it("snapshots direct historical-executor arguments before loading the bundled resolver", async () => {
    const executor = requireHistoricalNatalChartExecutor(ENGINE);
    const mutableInput: BirthInput = {
      ...BASE_INPUT,
      date: "2024-11-03",
      time: "01:30",
      timeZone: "America/New_York"
    };
    const mutableProfile: RuleProfile = structuredClone(withTimeRules({
      dayBoundary: "zi_start_23",
      dstAmbiguity: "require_user"
    }));
    const expectedDescriptor: TimeZoneDatabaseSnapshot = structuredClone(RUNTIME_TIME_ZONE_DATABASE);
    const mutableOptions: Parameters<typeof executor.calculateChart>[3] = {
      expectedTimeZoneDatabase: expectedDescriptor,
      dstResolutionOverride: "earlier"
    };
    const pending = executor.calculateChart(
      mutableInput,
      mutableProfile,
      RUNTIME_TZDB_VERSION,
      mutableOptions
    );

    mutableInput.time = "02:30";
    mutableProfile.calendar.dayBoundary = "midnight";
    mutableOptions.dstResolutionOverride = "later";
    expectedDescriptor.artifactName = "tampered/packed.json";

    const result = await pending;
    expect(result.input.time).toBe("01:30");
    expect(result.ruleProfile.calendar.dayBoundary).toBe("zi_start_23");
    expect(result.timeCalibration.utcInstant).toBe("2024-11-03T05:30:00Z");
    expect(result.timeCalibration.timeZoneResolution?.status).toBe("resolved_overlap_earlier");
    expect(result.manifest.timeZoneDatabase).toEqual(RUNTIME_TIME_ZONE_DATABASE);
  });

  it("matches Shanghai minute and exact-second semantics and retains the existing resultHash golden", async () => {
    const selfCheck: BirthInput = {
      schemaVersion: "1.0.0",
      calendarType: "gregorian",
      date: "2000-01-01",
      time: "12:00",
      timePrecision: "exact_minute",
      timeZone: "Asia/Shanghai",
      sex: "unspecified",
      lunarLeapMonth: false,
      location: { label: "启动自检", latitude: null, longitude: null, precision: "unknown" },
      sourceNote: "仅验证本地计算模块可执行，不保存为案例。"
    };
    const minute = await expectHistoricalMatchesCurrent(selfCheck, WORKING_DEFAULT_RULE_PROFILE);
    expect(minute.manifest.calculatedAt).toBe(FIXED_CALCULATION_CLOCK);
    expect(minute.manifest.resultHash).toBe("fc1f9b02322e72cbae2b6bab21d295aadff45ae820ac49575c0e323016f2c6b1");

    const exactSecond: BirthInput = {
      ...BASE_INPUT,
      date: "2024-02-04",
      time: "16:27:07",
      timePrecision: "exact_second"
    };
    const second = await expectHistoricalMatchesCurrent(
      exactSecond,
      WORKING_DEFAULT_RULE_PROFILE,
      RUNTIME_TZDB_VERSION,
      {},
      FULL_CHART_SHA256_GOLDENS.shanghaiExactSecond
    );
    expect(second.timeCalibration.activeWallTime).toContain("16:27:07");
  });

  it("matches the retained Casablanca calculation and preserves the real 2025b to 2026c difference", async () => {
    const casablanca: BirthInput = {
      ...BASE_INPUT,
      date: "2026-10-01",
      time: "12:00",
      timeZone: "Africa/Casablanca"
    };
    const retained = await expectHistoricalMatchesCurrent(
      casablanca,
      WORKING_DEFAULT_RULE_PROFILE,
      RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId,
      { expectedTimeZoneDatabase: RETAINED_TIME_ZONE_DATABASE_2025B },
      FULL_CHART_SHA256_GOLDENS.casablancaRetained2025b
    );
    const active = await expectHistoricalMatchesCurrent(
      casablanca,
      WORKING_DEFAULT_RULE_PROFILE,
      RUNTIME_TZDB_VERSION,
      { expectedTimeZoneDatabase: RUNTIME_TIME_ZONE_DATABASE },
      FULL_CHART_SHA256_GOLDENS.casablancaActive2026c
    );
    expect(retained.timeCalibration.utcOffset).toBe("+01:00");
    expect(retained.timeCalibration.utcInstant).toBe("2026-10-01T11:00:00Z");
    expect(active.timeCalibration.utcOffset).toBe("+00:00");
    expect(active.timeCalibration.utcInstant).toBe("2026-10-01T12:00:00Z");
    expect(retained.manifest.resultHash).not.toBe(active.manifest.resultHash);
    const retainedWarning = "这是 hakimi-bazi-core@0.4.0 执行器按随包 IANA 2025b 完成的只读复算，不表示该命盘曾由历史应用生成。";
    expect(retained.manifest.warnings).toContain(retainedWarning);
    expect(active.manifest.warnings).not.toContain(retainedWarning);
    expect(active.manifest.warnings.some((warning) => warning.includes("不表示该命盘曾由历史应用生成"))).toBe(false);
  });

  it("matches both explicit New York overlap choices", async () => {
    const overlap: BirthInput = {
      ...BASE_INPUT,
      date: "2024-11-03",
      time: "01:30",
      timeZone: "America/New_York"
    };
    const profile = withTimeRules({ dayBoundary: "zi_start_23", dstAmbiguity: "require_user" });
    const earlier = await expectHistoricalMatchesCurrent(overlap, profile, RUNTIME_TZDB_VERSION, {
      expectedTimeZoneDatabase: RUNTIME_TIME_ZONE_DATABASE,
      dstResolutionOverride: "earlier"
    }, FULL_CHART_SHA256_GOLDENS.newYorkOverlapEarlier);
    const later = await expectHistoricalMatchesCurrent(overlap, profile, RUNTIME_TZDB_VERSION, {
      expectedTimeZoneDatabase: RUNTIME_TIME_ZONE_DATABASE,
      dstResolutionOverride: "later"
    }, FULL_CHART_SHA256_GOLDENS.newYorkOverlapLater);
    expect(earlier.timeCalibration.utcInstant).toBe("2024-11-03T05:30:00Z");
    expect(later.timeCalibration.utcInstant).toBe("2024-11-03T06:30:00Z");
    expect(earlier.timeCalibration.timeZoneResolution?.status).toBe("resolved_overlap_earlier");
    expect(later.timeCalibration.timeZoneResolution?.status).toBe("resolved_overlap_later");
  });

  it("matches both zi_start_23 and midnight day-boundary rules", async () => {
    const boundaryInput: BirthInput = {
      ...BASE_INPUT,
      date: "2024-02-04",
      time: "23:30"
    };
    const ziStart = await expectHistoricalMatchesCurrent(
      boundaryInput,
      withDayBoundary("zi_start_23"),
      RUNTIME_TZDB_VERSION,
      {},
      FULL_CHART_SHA256_GOLDENS.ziStart23
    );
    const midnight = await expectHistoricalMatchesCurrent(
      boundaryInput,
      withDayBoundary("midnight"),
      RUNTIME_TZDB_VERSION,
      {},
      FULL_CHART_SHA256_GOLDENS.midnight
    );
    expect(ziStart.facts.pillars.day.ganZhi).not.toBe(midnight.facts.pillars.day.ganZhi);
  });

  it("matches rule-pack binding and supported-range warning semantics", async () => {
    const profile: RuleProfile = {
      ...WORKING_DEFAULT_RULE_PROFILE,
      profileId: "historical-040-rule-pack-warning",
      supportedRange: {
        stronglyVerifiedFrom: "2000-01-01",
        stronglyVerifiedTo: "2100-12-31",
        outsideRangePolicy: "experimental_with_warning"
      }
    };
    const binding: RulePackBinding = {
      kind: "installed_rule_pack",
      packDigest: "a".repeat(64),
      profileDigest: await digestRuleProfile(profile),
      packId: "historical-040-test-pack",
      profileId: profile.profileId,
      profileVersion: profile.profileVersion,
      useMode: "exact"
    };
    const result = await expectHistoricalMatchesCurrent(BASE_INPUT, profile, RUNTIME_TZDB_VERSION, {
      expectedTimeZoneDatabase: RUNTIME_TIME_ZONE_DATABASE,
      rulePackBinding: binding
    }, FULL_CHART_SHA256_GOLDENS.rulePackWarning);
    expect(result.rulePackBinding).toEqual(binding);
    expect(result.manifest.supportedRangeStatus).toBe("experimental");
    expect(result.manifest.warnings.join(" ")).toContain("experimental_with_warning");
  });
});
