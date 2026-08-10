import { describe, expect, it } from "vitest";
import {
  unknownHourCandidateResultSchema,
  type BirthInput,
  type PillarFact,
  type RulePackBinding,
  type RuleProfile
} from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE, withDayBoundary, withTimeRules } from "@hakimi/rule-profiles";
import { RETAINED_TIME_ZONE_DATABASE_2025B } from "@hakimi/tzdb-core";
import { RUNTIME_TIME_ZONE_DATABASE, RUNTIME_TZDB_VERSION } from "@hakimi/time-core";
import { LunarUtil } from "lunar-typescript";
import {
  ENGINE,
  HISTORICAL_NATAL_EXECUTOR_REGISTRY,
  UNKNOWN_HOUR_PROBE_ALGORITHM_ID,
  UNKNOWN_HOUR_PROBE_DEFINITION_VERSION,
  UnsupportedCalculationError,
  calculateChart,
  calculateChartForBundledSnapshot,
  calculateUnknownHourCandidates,
  calculateUnknownHourCandidatesForBundledSnapshot,
  canonicalStringify,
  digestRuleProfile,
  inspectRuleProfileCompatibility,
  lookupHistoricalNatalChartExecutor,
  requireHistoricalNatalChartExecutor
} from "./index";

const input: BirthInput = {
  schemaVersion: "1.0.0",
  calendarType: "gregorian",
  date: "1995-08-18",
  time: "08:26",
  timePrecision: "exact_minute",
  timeZone: "Asia/Shanghai",
  sex: "male",
  lunarLeapMonth: false,
  location: { label: "演示地点", latitude: null, longitude: null, precision: "city" },
  sourceNote: "来源 A"
};

function birthAt(date: string, time: string, timeZone: string): BirthInput {
  return { ...input, date, time, timeZone };
}

function birthAtSecond(date: string, time: string, timeZone = "Asia/Shanghai"): BirthInput {
  return { ...input, date, time, timePrecision: "exact_second", timeZone };
}

function unknownHourAt(date: string, timeZone: string): BirthInput {
  return { ...input, date, time: null, timePrecision: "unknown_hour", timeZone };
}

async function rulePackBindingFor(
  profile: RuleProfile,
  overrides: Partial<RulePackBinding> = {}
): Promise<RulePackBinding> {
  return {
    kind: "installed_rule_pack",
    packDigest: "a".repeat(64),
    profileDigest: await digestRuleProfile(profile),
    packId: "test-installed-pack",
    profileId: profile.profileId,
    profileVersion: profile.profileVersion,
    useMode: "exact",
    ...overrides
  };
}

function expectedTwelveGrowth(dayStem: string, branch: string): string {
  const dayStemIndex = LunarUtil.GAN.indexOf(dayStem) - 1;
  const branchIndex = LunarUtil.ZHI.indexOf(branch) - 1;
  const offset = LunarUtil.CHANG_SHENG_OFFSET[dayStem];
  const direction = dayStemIndex % 2 === 0 ? branchIndex : -branchIndex;
  return LunarUtil.CHANG_SHENG[((offset + direction) % 12 + 12) % 12];
}

function expectPillarDerivedFromFinalValues(pillar: PillarFact, dayStem: string): void {
  expect(pillar.ganZhi).toBe(`${pillar.stem}${pillar.branch}`);
  expect(pillar.hiddenStems).toEqual(LunarUtil.ZHI_HIDE_GAN[pillar.branch]);
  expect(pillar.stemTenGod).toBe(
    pillar.name === "day" ? "日主" : LunarUtil.SHI_SHEN[`${dayStem}${pillar.stem}`]
  );
  expect(pillar.branchTenGods).toEqual(
    pillar.hiddenStems.map((hiddenStem) => LunarUtil.SHI_SHEN[`${dayStem}${hiddenStem}`])
  );
  expect(pillar.wuXing).toBe(`${LunarUtil.WU_XING_GAN[pillar.stem]}${LunarUtil.WU_XING_ZHI[pillar.branch]}`);
  expect(pillar.nayin).toBe(LunarUtil.NAYIN[pillar.ganZhi]);
  expect(pillar.twelveGrowth).toBe(expectedTwelveGrowth(dayStem, pillar.branch));
  expect(pillar.xun).toBe(LunarUtil.getXun(pillar.ganZhi));
  expect(pillar.voidBranches).toBe(LunarUtil.getXunKong(pillar.ganZhi));
}

describe("canonicalStringify", () => {
  it("不受对象键顺序影响", () => {
    expect(canonicalStringify({ b: 2, a: { d: 4, c: 3 } })).toBe(canonicalStringify({ a: { c: 3, d: 4 }, b: 2 }));
  });
});

describe("inspectRuleProfileCompatibility", () => {
  it("accepts only implemented day-boundary/zi-basis and DST semantic variations", () => {
    const allowed = {
      ...withTimeRules({ dayBoundary: "midnight", dstAmbiguity: "later" }),
      status: "experimental" as const,
      sourceRefs: ["local-review:example"],
      supportedRange: {
        stronglyVerifiedFrom: "1990-01-01",
        stronglyVerifiedTo: "2000-12-31",
        outsideRangePolicy: "reject" as const
      }
    };
    expect(inspectRuleProfileCompatibility(allowed)).toEqual({
      supported: true,
      compatible: true,
      reasons: []
    });
  });

  it("reports every currently unimplemented semantic field instead of stopping at the first", () => {
    const unsupported: RuleProfile = {
      ...WORKING_DEFAULT_RULE_PROFILE,
      profileId: "multi-unsupported-semantics",
      calendar: {
        ...WORKING_DEFAULT_RULE_PROFILE.calendar,
        yearBoundary: "lunar_new_year",
        monthBoundary: "civil_day",
        dayBoundary: "split_zi",
        ziHourDayStemBasis: "civil_day",
        hourBasis: "apparent_solar",
        locationPrecision: "coordinates"
      },
      solarTime: {
        ...WORKING_DEFAULT_RULE_PROFILE.solarTime,
        enabled: true,
        showComparison: false,
        equationOfTimeModel: "noaa-gml-fractional-year-eot-approx-v1"
      },
      layers: {
        ...WORKING_DEFAULT_RULE_PROFILE.layers,
        hiddenStems: false,
        shensha: true
      },
      interpretation: {
        ...WORKING_DEFAULT_RULE_PROFILE.interpretation,
        strengthRulePack: "strength-test",
        usefulGodRulePack: "useful-god-test"
      }
    };

    const inspection = inspectRuleProfileCompatibility(unsupported);
    expect(inspection.supported).toBe(false);
    expect(inspection.reasons.map((reason) => reason.path)).toEqual(expect.arrayContaining([
      "calendar.yearBoundary",
      "calendar.monthBoundary",
      "calendar.dayBoundary",
      "calendar.hourBasis",
      "calendar.locationPrecision",
      "solarTime.enabled",
      "solarTime.showComparison",
      "solarTime.equationOfTimeModel",
      "layers.hiddenStems",
      "layers.shensha",
      "interpretation.strengthRulePack",
      "interpretation.usefulGodRulePack"
    ]));
    expect(inspection.reasons).toHaveLength(12);
  });

  it("returns contract reasons for an invalid rule snapshot", () => {
    const invalid = {
      ...withDayBoundary("midnight"),
      calendar: {
        ...withDayBoundary("midnight").calendar,
        ziHourDayStemBasis: "after_day_change"
      }
    };
    const inspection = inspectRuleProfileCompatibility(invalid);
    expect(inspection.compatible).toBe(false);
    expect(inspection.reasons).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "INVALID_RULE_PROFILE", path: "calendar.ziHourDayStemBasis" })
    ]));
  });
});

describe("calculateChart", () => {
  it("锁定启动自检盘的 tzdb 身份与结果摘要", async () => {
    const chart = await calculateChart({
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
    }, WORKING_DEFAULT_RULE_PROFILE);
    expect(chart.manifest.timeZoneDatabase).toMatchObject({ ianaVersion: "2026c" });
    expect(chart.manifest.resultHash).toBe("fc1f9b02322e72cbae2b6bab21d295aadff45ae820ac49575c0e323016f2c6b1");
  });

  it("同一输入、引擎与规则产生相同结果哈希", async () => {
    const first = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
    const second = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
    expect(first.manifest.resultHash).toBe(second.manifest.resultHash);
    expect(first.manifest.ruleProfileDigest).toBe(second.manifest.ruleProfileDigest);
  });

  it("资料说明与地点别名不影响当前计算哈希", async () => {
    const first = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
    const second = await calculateChart({
      ...input,
      sourceNote: "完全不同的研究笔记",
      location: { ...input.location, label: "另一个展示名称" }
    }, WORKING_DEFAULT_RULE_PROFILE);
    expect(first.manifest.resultHash).toBe(second.manifest.resultHash);
  });

  it("农历输入显式转换后与对应公历盘一致，但原输入和结果哈希保持可区分", async () => {
    const lunarInput: BirthInput = {
      ...input,
      calendarType: "lunar",
      date: "1995-07-23"
    };
    const lunarChart = await calculateChart(lunarInput, WORKING_DEFAULT_RULE_PROFILE);
    const solarChart = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);

    expect(lunarChart.input).toEqual(lunarInput);
    expect(lunarChart.timeCalibration.calendarResolution).toMatchObject({
      inputCalendarType: "lunar",
      inputDate: "1995-07-23",
      resolvedGregorianDate: "1995-08-18",
      roundTripVerified: true
    });
    expect(lunarChart.timeCalibration.utcInstant).toBe(solarChart.timeCalibration.utcInstant);
    expect(lunarChart.facts).toEqual(solarChart.facts);
    expect(lunarChart.manifest.resultHash).not.toBe(solarChart.manifest.resultHash);
  });

  it("闰月输入使用独立月份并与转换后的公历盘一致", async () => {
    const lunarLeapInput: BirthInput = {
      ...input,
      calendarType: "lunar",
      date: "2023-02-01",
      lunarLeapMonth: true
    };
    const solarInput: BirthInput = {
      ...input,
      date: "2023-03-22"
    };
    const lunarChart = await calculateChart(lunarLeapInput, WORKING_DEFAULT_RULE_PROFILE);
    const solarChart = await calculateChart(solarInput, WORKING_DEFAULT_RULE_PROFILE);

    expect(lunarChart.timeCalibration.calendarResolution?.resolvedGregorianDate).toBe("2023-03-22");
    expect(lunarChart.facts).toEqual(solarChart.facts);
  });

  it("规则参数变化会改变规则和结果哈希", async () => {
    const ziStart = withDayBoundary("zi_start_23");
    const midnight = withDayBoundary("midnight");
    expect(await digestRuleProfile(ziStart)).not.toBe(await digestRuleProfile(midnight));
    const first = await calculateChart(input, ziStart);
    const second = await calculateChart(input, midnight);
    expect(first.manifest.resultHash).not.toBe(second.manifest.resultHash);
  });

  it("binds an installed rule-pack to the exact final profile and result hash", async () => {
    const profile = withDayBoundary("midnight");
    const binding = await rulePackBindingFor(profile);
    const unbound = await calculateChart(input, profile);
    const bound = await calculateChart(input, profile, { rulePackBinding: binding });
    const otherPack = await calculateChart(input, profile, {
      rulePackBinding: { ...binding, packDigest: "b".repeat(64), packId: "other-installed-pack" }
    });

    expect(bound.rulePackBinding).toEqual(binding);
    expect(bound.manifest.ruleProfileDigest).toBe(binding.profileDigest);
    expect(bound.manifest.resultHash).not.toBe(unbound.manifest.resultHash);
    expect(otherPack.manifest.resultHash).not.toBe(bound.manifest.resultHash);
  });

  it.each([
    ["profileDigest", { profileDigest: "0".repeat(64) }],
    ["profileId", { profileId: "different-profile" }],
    ["profileVersion", { profileVersion: "9.9.9" }]
  ] as const)("rejects a rule-pack binding with mismatched %s", async (_field, overrides) => {
    const binding = await rulePackBindingFor(WORKING_DEFAULT_RULE_PROFILE, overrides);
    await expect(calculateChart(input, WORKING_DEFAULT_RULE_PROFILE, { rulePackBinding: binding }))
      .rejects.toBeInstanceOf(UnsupportedCalculationError);
  });

  it("rejects a malformed rule-pack binding at the engine boundary", async () => {
    const binding = await rulePackBindingFor(WORKING_DEFAULT_RULE_PROFILE);
    await expect(calculateChart(input, WORKING_DEFAULT_RULE_PROFILE, {
      rulePackBinding: { ...binding, packDigest: "not-a-digest" } as RulePackBinding
    })).rejects.toBeInstanceOf(UnsupportedCalculationError);
  });

  it("同一瞬时点的纽约和固定 +08 输入得到相同的立春后年柱月柱", async () => {
    const newYork = await calculateChart(
      birthAt("2024-02-04", "04:00", "America/New_York"),
      WORKING_DEFAULT_RULE_PROFILE
    );
    const fixedEight = await calculateChart(
      birthAt("2024-02-04", "17:00", "Etc/GMT-8"),
      WORKING_DEFAULT_RULE_PROFILE
    );

    expect(newYork.timeCalibration.utcInstant).toBe("2024-02-04T09:00:00Z");
    expect(fixedEight.timeCalibration.utcInstant).toBe(newYork.timeCalibration.utcInstant);
    expect(newYork.facts.pillars.year.ganZhi).toBe("甲辰");
    expect(newYork.facts.pillars.month.ganZhi).toBe("丙寅");
    expect(fixedEight.facts.pillars.year.ganZhi).toBe(newYork.facts.pillars.year.ganZhi);
    expect(fixedEight.facts.pillars.month.ganZhi).toBe(newYork.facts.pillars.month.ganZhi);
  });

  it("保留立春前一秒、当刻与后一秒的精确归属语义", async () => {
    const before = await calculateChart(
      birthAtSecond("2024-02-04", "16:27:06"),
      WORKING_DEFAULT_RULE_PROFILE
    );
    const at = await calculateChart(
      birthAtSecond("2024-02-04", "16:27:07"),
      WORKING_DEFAULT_RULE_PROFILE
    );
    const after = await calculateChart(
      birthAtSecond("2024-02-04", "16:27:08"),
      WORKING_DEFAULT_RULE_PROFILE
    );

    expect(before.timeCalibration.utcInstant).toBe("2024-02-04T08:27:06Z");
    expect(before.facts.pillars.year.ganZhi).toBe("癸卯");
    expect(before.facts.pillars.month.ganZhi).toBe("乙丑");
    expect(at.facts.pillars.year.ganZhi).toBe("甲辰");
    expect(at.facts.pillars.month.ganZhi).toBe("丙寅");
    expect(after.facts.pillars.year.ganZhi).toBe(at.facts.pillars.year.ganZhi);
    expect(after.facts.pillars.month.ganZhi).toBe(at.facts.pillars.month.ganZhi);
  });

  it("东京墙时不会把同一瞬时点提前跨过固定 +08 的立春边界", async () => {
    const tokyo = await calculateChart(
      birthAt("2024-02-04", "17:00", "Asia/Tokyo"),
      WORKING_DEFAULT_RULE_PROFILE
    );
    const fixedEight = await calculateChart(
      birthAt("2024-02-04", "16:00", "Etc/GMT-8"),
      WORKING_DEFAULT_RULE_PROFILE
    );

    expect(tokyo.timeCalibration.utcInstant).toBe("2024-02-04T08:00:00Z");
    expect(fixedEight.timeCalibration.utcInstant).toBe(tokyo.timeCalibration.utcInstant);
    expect(tokyo.facts.pillars.year.ganZhi).toBe("癸卯");
    expect(tokyo.facts.pillars.month.ganZhi).toBe("乙丑");
    expect(fixedEight.facts.pillars.year.ganZhi).toBe(tokyo.facts.pillars.year.ganZhi);
    expect(fixedEight.facts.pillars.month.ganZhi).toBe(tokyo.facts.pillars.month.ganZhi);
  });

  it("1988 上海夏令时瞬时点按固定 +08 节气候选界月", async () => {
    const shanghaiDst = await calculateChart(
      birthAt("1988-05-05", "15:30", "Asia/Shanghai"),
      WORKING_DEFAULT_RULE_PROFILE
    );
    const fixedEight = await calculateChart(
      birthAt("1988-05-05", "14:30", "Etc/GMT-8"),
      WORKING_DEFAULT_RULE_PROFILE
    );

    expect(shanghaiDst.timeCalibration.utcOffset).toBe("+09:00");
    expect(shanghaiDst.timeCalibration.utcInstant).toBe("1988-05-05T06:30:00Z");
    expect(fixedEight.timeCalibration.utcInstant).toBe(shanghaiDst.timeCalibration.utcInstant);
    expect(shanghaiDst.facts.pillars.month.ganZhi).toBe("丙辰");
    expect(fixedEight.facts.pillars.month.ganZhi).toBe(shanghaiDst.facts.pillars.month.ganZhi);
  });

  it("23:30 的时干始终由最终显示日干和子时支重算", async () => {
    const boundaryInput = birthAt("2024-02-04", "23:30", "Asia/Shanghai");
    const ziStart = await calculateChart(boundaryInput, withDayBoundary("zi_start_23"));
    const midnight = await calculateChart(boundaryInput, withDayBoundary("midnight"));

    expect(ziStart.facts.pillars.day.ganZhi).toBe("己亥");
    expect(ziStart.facts.pillars.hour.ganZhi).toBe("甲子");
    expect(midnight.facts.pillars.day.ganZhi).toBe("戊戌");
    expect(midnight.facts.pillars.hour.ganZhi).toBe("壬子");
    expect(ziStart.ruleProfile.calendar.dayBoundary).toBe("zi_start_23");
    expect(midnight.ruleProfile.calendar.dayBoundary).toBe("midnight");
  });

  it("拒绝 23:30 排盘使用与午夜换日矛盾的子时日干基准", async () => {
    const midnight = withDayBoundary("midnight");
    const inconsistentRule: RuleProfile = {
      ...midnight,
      profileId: "midnight-inconsistent-zi-basis",
      calendar: {
        ...midnight.calendar,
        ziHourDayStemBasis: "after_day_change"
      }
    };

    await expect(
      calculateChart(birthAt("2024-02-04", "23:30", "Asia/Shanghai"), inconsistentRule)
    ).rejects.toThrow(/civil_day/);
  });

  it("所有派生字段都从最终混合四柱和最终日干计算", async () => {
    const chart = await calculateChart(
      birthAt("2024-02-04", "23:30", "Asia/Shanghai"),
      withDayBoundary("midnight")
    );
    const dayStem = chart.facts.pillars.day.stem;
    for (const pillar of Object.values(chart.facts.pillars)) {
      expectPillarDerivedFromFinalValues(pillar, dayStem);
    }
    const hourPillarAlgorithm = chart.facts.fieldProvenance.find(
      (item) => item.field === "pillars.hour.ganZhi"
    )?.algorithmId;
    expect(hourPillarAlgorithm).toContain("fixed-plus08-year-month-local-civil-day-hour");
    expect(hourPillarAlgorithm).toContain("time-gan-from-final-day");
    expect(chart.facts.fieldProvenance.find((item) => item.field === "pillars.hour.stemTenGod")?.algorithmId)
      .toContain("final-day-stem");
  });

  it("标记为工程预览而非已验证真值", async () => {
    const chart = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
    expect(chart.manifest.verificationStatus).toBe("engineering_preview");
    expect(chart.manifest.supportedRangeStatus).toBe("experimental");
    expect(chart.manifest.warnings.join(" ")).toContain("360");
  });

  it("marks only verified profiles inside inclusive supported-range boundaries as verified", async () => {
    const verifiedProfile: RuleProfile = {
      ...WORKING_DEFAULT_RULE_PROFILE,
      profileId: "verified-inclusive-range",
      status: "verified",
      supportedRange: {
        stronglyVerifiedFrom: "1995-08-18",
        stronglyVerifiedTo: "1995-08-19",
        outsideRangePolicy: "reject"
      }
    };
    const [atStart, atEnd] = await Promise.all([
      calculateChart(input, verifiedProfile),
      calculateChart({ ...input, date: "1995-08-19" }, verifiedProfile)
    ]);
    expect(atStart.manifest.supportedRangeStatus).toBe("verified");
    expect(atEnd.manifest.supportedRangeStatus).toBe("verified");

    const working = await calculateChart(input, {
      ...verifiedProfile,
      profileId: "working-inclusive-range",
      status: "working_default"
    });
    expect(working.manifest.supportedRangeStatus).toBe("experimental");
  });

  it("uses the resolved Gregorian date for lunar inputs when enforcing supportedRange", async () => {
    const profile: RuleProfile = {
      ...WORKING_DEFAULT_RULE_PROFILE,
      profileId: "verified-resolved-lunar-date",
      status: "verified",
      supportedRange: {
        stronglyVerifiedFrom: "1995-08-18",
        stronglyVerifiedTo: "1995-08-18",
        outsideRangePolicy: "reject"
      }
    };
    const chart = await calculateChart({
      ...input,
      calendarType: "lunar",
      date: "1995-07-23"
    }, profile);
    expect(chart.timeCalibration.calendarResolution?.resolvedGregorianDate).toBe("1995-08-18");
    expect(chart.manifest.supportedRangeStatus).toBe("verified");
  });

  it("rejects or explicitly warns outside supportedRange according to policy", async () => {
    const baseRange = {
      stronglyVerifiedFrom: "2000-01-01",
      stronglyVerifiedTo: "2000-12-31"
    };
    const rejectProfile: RuleProfile = {
      ...WORKING_DEFAULT_RULE_PROFILE,
      profileId: "range-reject",
      supportedRange: { ...baseRange, outsideRangePolicy: "reject" }
    };
    await expect(calculateChart(input, rejectProfile)).rejects.toThrow(/outsideRangePolicy=reject/);

    const warningProfile: RuleProfile = {
      ...rejectProfile,
      profileId: "range-warning",
      status: "verified",
      supportedRange: { ...baseRange, outsideRangePolicy: "experimental_with_warning" }
    };
    const chart = await calculateChart(input, warningProfile);
    expect(chart.manifest.supportedRangeStatus).toBe("experimental");
    expect(chart.manifest.warnings.join(" ")).toContain("超出规则配置支持范围");

    const inverted: RuleProfile = {
      ...rejectProfile,
      profileId: "range-inverted",
      supportedRange: {
        stronglyVerifiedFrom: "2000-12-31",
        stronglyVerifiedTo: "2000-01-01",
        outsideRangePolicy: "reject"
      }
    };
    await expect(calculateChart(input, inverted)).rejects.toThrow(/不能早于|起点.*晚于终点/);
  });

  it("保存可复算的 IANA 时区归一化快照", async () => {
    const chart = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
    expect(chart.timeCalibration.utcInstant).toBe("1995-08-18T00:26:00Z");
    expect(chart.timeCalibration.utcOffset).toBe("+08:00");
    expect(chart.timeCalibration.timeZoneResolution).toMatchObject({
      kind: "unique",
      status: "resolved_unique",
      policy: "reject"
    });
    expect(chart.timeCalibration.solarTimeApplied).toBe(false);
  });

  it("uses an explicit DST override for require_user without mutating the profile", async () => {
    const overlapInput = birthAt("2024-11-03", "01:30", "America/New_York");
    await expect(calculateChart(overlapInput, WORKING_DEFAULT_RULE_PROFILE))
      .rejects.toThrow(/必须先明确选择/);

    const earlier = await calculateChart(overlapInput, WORKING_DEFAULT_RULE_PROFILE, {
      dstResolutionOverride: "earlier"
    });
    const later = await calculateChart(overlapInput, WORKING_DEFAULT_RULE_PROFILE, {
      dstResolutionOverride: "later"
    });
    expect(earlier.ruleProfile.calendar.dstAmbiguity).toBe("require_user");
    expect(later.ruleProfile.calendar.dstAmbiguity).toBe("require_user");
    expect(earlier.timeCalibration.timeZoneResolution?.policy).toBe("earlier");
    expect(later.timeCalibration.timeZoneResolution?.policy).toBe("later");
    expect(earlier.timeCalibration.utcInstant).toBe("2024-11-03T05:30:00Z");
    expect(later.timeCalibration.utcInstant).toBe("2024-11-03T06:30:00Z");
    expect(earlier.manifest.resultHash).not.toBe(later.manifest.resultHash);
    expect(earlier.manifest.warnings.join(" ")).toContain("RuleProfile 仍保留 require_user");
  });

  it("allows an identical override for a fixed DST policy and rejects a conflicting one", async () => {
    const overlapInput = birthAt("2024-11-03", "01:30", "America/New_York");
    const fixedEarlier = withTimeRules({ dayBoundary: "zi_start_23", dstAmbiguity: "earlier" });
    const implicit = await calculateChart(overlapInput, fixedEarlier);
    const identical = await calculateChart(overlapInput, fixedEarlier, { dstResolutionOverride: "earlier" });
    expect(identical.timeCalibration.utcInstant).toBe(implicit.timeCalibration.utcInstant);
    expect(identical.manifest.resultHash).toBe(implicit.manifest.resultHash);
    await expect(calculateChart(overlapInput, fixedEarlier, { dstResolutionOverride: "later" }))
      .rejects.toThrow(/冲突/);
  });

  it("rejects an invalid runtime DST override instead of falling back", async () => {
    await expect(calculateChart(input, WORKING_DEFAULT_RULE_PROFILE, {
      dstResolutionOverride: "compatible" as "earlier"
    })).rejects.toThrow(/override 无效/);
  });

  it("拒绝把未支持的太阳时规则静默应用到活动命盘", async () => {
    const solarRule: RuleProfile = {
      ...WORKING_DEFAULT_RULE_PROFILE,
      profileId: "solar-time-rejected-preview",
      calendar: {
        ...WORKING_DEFAULT_RULE_PROFILE.calendar,
        hourBasis: "apparent_solar"
      },
      solarTime: {
        ...WORKING_DEFAULT_RULE_PROFILE.solarTime,
        enabled: true,
        equationOfTimeModel: "noaa-gml-fractional-year-eot-approx-v1"
      }
    };
    await expect(calculateChart(input, solarRule)).rejects.toBeInstanceOf(UnsupportedCalculationError);
  });

  it("rejects ignored layer and interpretation switches through the same compatibility gate", async () => {
    const ignoredSemantics: RuleProfile = {
      ...WORKING_DEFAULT_RULE_PROFILE,
      profileId: "ignored-semantics-rejected",
      layers: { ...WORKING_DEFAULT_RULE_PROFILE.layers, hiddenStems: false, shensha: true },
      interpretation: { ...WORKING_DEFAULT_RULE_PROFILE.interpretation, strengthRulePack: "strength-test" }
    };
    await expect(calculateChart(input, ignoredSemantics)).rejects.toThrow(/layers.hiddenStems/);
    await expect(calculateChart(input, ignoredSemantics)).rejects.toThrow(/layers.shensha/);
    await expect(calculateChart(input, ignoredSemantics)).rejects.toThrow(/interpretation.strengthRulePack/);
  });
});

describe("bundled-snapshot natal chart replay", () => {
  const casablancaInput = birthAt("2026-10-01", "12:00", "Africa/Casablanca");

  it("replays the current 2026c snapshot through the exact bundled descriptor", async () => {
    const [currentOnly, bundledCurrent] = await Promise.all([
      calculateChart(casablancaInput, WORKING_DEFAULT_RULE_PROFILE),
      calculateChartForBundledSnapshot(
        casablancaInput,
        WORKING_DEFAULT_RULE_PROFILE,
        RUNTIME_TZDB_VERSION,
        { expectedTimeZoneDatabase: RUNTIME_TIME_ZONE_DATABASE }
      )
    ]);

    expect(bundledCurrent.manifest.timeZoneDatabase).toEqual(RUNTIME_TIME_ZONE_DATABASE);
    expect(bundledCurrent.manifest.engine).toEqual(ENGINE);
    expect(bundledCurrent.timeCalibration.utcOffset).toBe("+00:00");
    expect(bundledCurrent.timeCalibration.utcInstant).toBe("2026-10-01T12:00:00Z");
    expect(bundledCurrent.manifest.resultHash).toBe(currentOnly.manifest.resultHash);
  });

  it("keeps retained/current/retained calculations isolated across the Casablanca change", async () => {
    const retainedA = await calculateChartForBundledSnapshot(
      casablancaInput,
      WORKING_DEFAULT_RULE_PROFILE,
      RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId,
      { expectedTimeZoneDatabase: RETAINED_TIME_ZONE_DATABASE_2025B }
    );
    const current = await calculateChartForBundledSnapshot(
      casablancaInput,
      WORKING_DEFAULT_RULE_PROFILE,
      RUNTIME_TZDB_VERSION,
      { expectedTimeZoneDatabase: RUNTIME_TIME_ZONE_DATABASE }
    );
    const retainedB = await calculateChartForBundledSnapshot(
      casablancaInput,
      WORKING_DEFAULT_RULE_PROFILE,
      RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId,
      { expectedTimeZoneDatabase: RETAINED_TIME_ZONE_DATABASE_2025B }
    );

    expect(retainedA.manifest.resultHash).toBe(retainedB.manifest.resultHash);
    expect(retainedA.timeCalibration).toEqual(retainedB.timeCalibration);
    expect(retainedA.manifest.timeZoneDatabase).toEqual(RETAINED_TIME_ZONE_DATABASE_2025B);
    expect(retainedA.timeCalibration.utcOffset).toBe("+01:00");
    expect(retainedA.timeCalibration.utcInstant).toBe("2026-10-01T11:00:00Z");
    expect(retainedA.manifest.warnings.join(" ")).toContain("不表示该命盘曾由历史应用生成");
    expect(current.manifest.timeZoneDatabase).toEqual(RUNTIME_TIME_ZONE_DATABASE);
    expect(current.timeCalibration.utcOffset).toBe("+00:00");
    expect(current.timeCalibration.utcInstant).toBe("2026-10-01T12:00:00Z");
    expect(current.manifest.resultHash).not.toBe(retainedA.manifest.resultHash);
  });

  it("fails closed for an unavailable snapshot or a conflicting complete descriptor", async () => {
    const unavailableSnapshot = "iana-tzdb@2024a/sha256:" + "0".repeat(64) +
      "/hakimi-tzdb-core@1.0.0/moment-timezone@0.6.3";
    await expect(calculateChartForBundledSnapshot(
      casablancaInput,
      WORKING_DEFAULT_RULE_PROFILE,
      unavailableSnapshot
    )).rejects.toMatchObject({ code: "TZDB_ARTIFACT_UNAVAILABLE" });

    const conflicting = {
      ...structuredClone(RETAINED_TIME_ZONE_DATABASE_2025B),
      artifactName: "tampered/packed.json"
    };
    await expect(calculateChartForBundledSnapshot(
      casablancaInput,
      WORKING_DEFAULT_RULE_PROFILE,
      RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId,
      { expectedTimeZoneDatabase: conflicting }
    )).rejects.toMatchObject({ code: "TZDB_SNAPSHOT_MISMATCH" });
  });

  it("selects historical natal executors only by the complete engine descriptor", async () => {
    expect(Object.isFrozen(ENGINE)).toBe(true);
    expect(HISTORICAL_NATAL_EXECUTOR_REGISTRY).toHaveLength(1);
    const executor = lookupHistoricalNatalChartExecutor(ENGINE);
    expect(executor?.executorId).toBe("hakimi-bazi-core:natal-chart-executor:0.4.0");
    expect(executor?.engine).toEqual(ENGINE);

    const replay = await requireHistoricalNatalChartExecutor(ENGINE).calculateChart(
      casablancaInput,
      WORKING_DEFAULT_RULE_PROFILE,
      RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId,
      { expectedTimeZoneDatabase: RETAINED_TIME_ZONE_DATABASE_2025B }
    );
    expect(replay.manifest.engine).toEqual(ENGINE);
    expect(replay.manifest.timeZoneDatabase).toEqual(RETAINED_TIME_ZONE_DATABASE_2025B);

    const sameVersionButDifferentBuild = { ...ENGINE, upstreamTagCommit: "different-build" };
    const unknownVersion = { ...ENGINE, version: "9.9.9" };
    expect(lookupHistoricalNatalChartExecutor(sameVersionButDifferentBuild)).toBeNull();
    expect(lookupHistoricalNatalChartExecutor(unknownVersion)).toBeNull();
    expect(lookupHistoricalNatalChartExecutor({ version: ENGINE.version })).toBeNull();
    expect(() => requireHistoricalNatalChartExecutor(sameVersionButDifferentBuild)).toThrow(/不会回退到当前版本/);
  });
});

describe("calculateUnknownHourCandidates", () => {
  it("round-trips through the strict versioned candidate-set contract", async () => {
    const result = await calculateUnknownHourCandidates(
      unknownHourAt("2024-02-04", "Asia/Shanghai"),
      WORKING_DEFAULT_RULE_PROFILE
    );

    expect(unknownHourCandidateResultSchema.parse(result)).toEqual(result);
    expect(unknownHourCandidateResultSchema.safeParse({ ...result, unexpected: true }).success).toBe(false);
    expect(unknownHourCandidateResultSchema.safeParse({
      ...result,
      input: { ...result.input, unexpected: true }
    }).success).toBe(false);
  });

  it("calculates isolated 2026c/2025b/2026c CandidateSets across the real Casablanca change", async () => {
    const unknownInput = unknownHourAt("2026-10-01", "Africa/Casablanca");
    const [currentA, retained, currentB, currentOnly] = await Promise.all([
      calculateUnknownHourCandidatesForBundledSnapshot(
        unknownInput,
        WORKING_DEFAULT_RULE_PROFILE,
        RUNTIME_TZDB_VERSION
      ),
      calculateUnknownHourCandidatesForBundledSnapshot(
        unknownInput,
        WORKING_DEFAULT_RULE_PROFILE,
        RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId
      ),
      calculateUnknownHourCandidatesForBundledSnapshot(
        unknownInput,
        WORKING_DEFAULT_RULE_PROFILE,
        RUNTIME_TZDB_VERSION
      ),
      calculateUnknownHourCandidates(unknownInput, WORKING_DEFAULT_RULE_PROFILE)
    ]);

    expect(currentA.resultHash).toBe(currentB.resultHash);
    expect(currentA.resultHash).toBe(currentOnly.resultHash);
    expect(retained.resultHash).not.toBe(currentA.resultHash);
    expect(currentA.timeZoneDatabase?.ianaVersion).toBe("2026c");
    expect(retained.timeZoneDatabase).toEqual(RETAINED_TIME_ZONE_DATABASE_2025B);
    expect(retained.warnings.join(" ")).toContain("不表示该候选组曾由历史应用生成");
    expect(currentA.candidates).toHaveLength(13);
    expect(retained.candidates).toHaveLength(13);
    expect(currentA.candidates.every((candidate) =>
      candidate.status === "calculated" && candidate.timeCalibration.utcOffset === "+00:00"
    )).toBe(true);
    expect(retained.candidates.every((candidate) =>
      candidate.status === "calculated" && candidate.timeCalibration.utcOffset === "+01:00"
    )).toBe(true);
    expect(currentA.candidates.map((candidate) => candidate.variants[0]?.instant)).not.toEqual(
      retained.candidates.map((candidate) => candidate.variants[0]?.instant)
    );

    for (const result of [currentA, retained, currentB]) {
      const nestedCharts = result.candidates.flatMap((candidate) => candidate.variants.map((variant) => variant.chart));
      expect(nestedCharts).toHaveLength(13);
      expect(nestedCharts.every((chart) =>
        chart.manifest.tzdbVersion === result.tzdbVersion &&
        JSON.stringify(chart.manifest.timeZoneDatabase) === JSON.stringify(result.timeZoneDatabase)
      )).toBe(true);
      if (result.tzdbVersion === RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId) {
        expect(nestedCharts.every((chart) =>
          chart.manifest.warnings.join(" ").includes("不表示该候选组曾由历史应用生成")
        )).toBe(true);
      }
    }
  });

  it("fails bundled-snapshot CandidateSet calculation for unknown or conflicting artifact identity", async () => {
    const unknownInput = unknownHourAt("2026-10-01", "Africa/Casablanca");
    const unavailableSnapshot = "iana-tzdb@2024a/sha256:" + "0".repeat(64) +
      "/hakimi-tzdb-core@1.0.0/moment-timezone@0.6.3";
    await expect(calculateUnknownHourCandidatesForBundledSnapshot(
      unknownInput,
      WORKING_DEFAULT_RULE_PROFILE,
      unavailableSnapshot
    )).rejects.toMatchObject({ code: "TZDB_ARTIFACT_UNAVAILABLE" });

    const conflicting = {
      ...structuredClone(RETAINED_TIME_ZONE_DATABASE_2025B),
      artifactName: "tampered/packed.json"
    };
    await expect(calculateUnknownHourCandidatesForBundledSnapshot(
      unknownInput,
      WORKING_DEFAULT_RULE_PROFILE,
      RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId,
      { expectedTimeZoneDatabase: conflicting }
    )).rejects.toMatchObject({ code: "TZDB_SNAPSHOT_MISMATCH" });
  });

  it("keeps one installed rule-pack binding identical across the parent and every child chart", async () => {
    const binding = await rulePackBindingFor(WORKING_DEFAULT_RULE_PROFILE);
    const unknownInput = unknownHourAt("2024-04-07", "Australia/Lord_Howe");
    const [unbound, bound] = await Promise.all([
      calculateUnknownHourCandidates(unknownInput, WORKING_DEFAULT_RULE_PROFILE),
      calculateUnknownHourCandidates(unknownInput, WORKING_DEFAULT_RULE_PROFILE, { rulePackBinding: binding })
    ]);

    expect(bound.rulePackBinding).toEqual(binding);
    expect(bound.ruleProfileDigest).toBe(binding.profileDigest);
    expect(bound.resultHash).not.toBe(unbound.resultHash);
    const childCharts = bound.candidates.flatMap((candidate) => [
      ...(candidate.chart ? [candidate.chart] : []),
      ...candidate.variants.map((variant) => variant.chart)
    ]);
    expect(childCharts.length).toBeGreaterThan(13);
    expect(childCharts.every((chart) => JSON.stringify(chart.rulePackBinding) === JSON.stringify(binding))).toBe(true);
  });

  it("rejects a mismatched installed rule-pack binding before generating unknown-hour children", async () => {
    const binding = await rulePackBindingFor(WORKING_DEFAULT_RULE_PROFILE, {
      profileDigest: "0".repeat(64)
    });
    await expect(calculateUnknownHourCandidates(
      unknownHourAt("2024-02-04", "Asia/Shanghai"),
      WORKING_DEFAULT_RULE_PROFILE,
      { rulePackBinding: binding }
    )).rejects.toBeInstanceOf(UnsupportedCalculationError);
  });

  it("enforces supportedRange once for the parent and propagates warning/status to children", async () => {
    const range = {
      stronglyVerifiedFrom: "2000-01-01",
      stronglyVerifiedTo: "2000-12-31"
    };
    const rejectProfile: RuleProfile = {
      ...WORKING_DEFAULT_RULE_PROFILE,
      profileId: "unknown-range-reject",
      supportedRange: { ...range, outsideRangePolicy: "reject" }
    };
    await expect(calculateUnknownHourCandidates(
      unknownHourAt("1995-08-18", "Asia/Shanghai"),
      rejectProfile
    )).rejects.toThrow(/outsideRangePolicy=reject/);

    const warningProfile: RuleProfile = {
      ...rejectProfile,
      profileId: "unknown-range-warning",
      status: "verified",
      supportedRange: { ...range, outsideRangePolicy: "experimental_with_warning" }
    };
    const result = await calculateUnknownHourCandidates(
      unknownHourAt("1995-08-18", "Asia/Shanghai"),
      warningProfile
    );
    expect(result.warnings.join(" ")).toContain("超出规则配置支持范围");
    expect(result.candidates.every((candidate) => candidate.chart?.manifest.supportedRangeStatus === "experimental"))
      .toBe(true);
  });

  it("rejects incomplete, reordered, duplicated, verified, or hash-detached probes", async () => {
    const result = await calculateUnknownHourCandidates(
      unknownHourAt("2024-02-04", "Asia/Shanghai"),
      WORKING_DEFAULT_RULE_PROFILE
    );
    const first = result.candidates[0];
    const second = result.candidates[1];
    if (!first || !second || first.status !== "calculated") throw new Error("expected calculated probe fixtures");

    expect(unknownHourCandidateResultSchema.safeParse({
      ...result,
      candidates: result.candidates.slice(0, 12),
      probeCount: 12
    }).success).toBe(false);
    expect(unknownHourCandidateResultSchema.safeParse({
      ...result,
      candidates: [
        first,
        { ...second, probeIndex: 0 },
        ...result.candidates.slice(2)
      ]
    }).success).toBe(false);
    expect(unknownHourCandidateResultSchema.safeParse({
      ...result,
      candidates: [
        { ...first, candidateId: second.candidateId },
        { ...second, candidateId: first.candidateId },
        ...result.candidates.slice(2)
      ]
    }).success).toBe(false);
    expect(unknownHourCandidateResultSchema.safeParse({
      ...result,
      candidates: [
        { ...first, verificationStatus: "verified" },
        ...result.candidates.slice(1)
      ]
    }).success).toBe(false);
    expect(unknownHourCandidateResultSchema.safeParse({
      ...result,
      verificationStatus: "verified"
    }).success).toBe(false);
    expect(unknownHourCandidateResultSchema.safeParse({
      ...result,
      candidates: [{ ...first, unexpected: true }, ...result.candidates.slice(1)]
    }).success).toBe(false);
    expect(unknownHourCandidateResultSchema.safeParse({
      ...result,
      candidates: [{
        ...first,
        variants: [{ ...first.variants[0], unexpected: true }]
      }, ...result.candidates.slice(1)]
    }).success).toBe(false);
    expect(unknownHourCandidateResultSchema.safeParse({
      ...result,
      resultHash: "A".repeat(64)
    }).success).toBe(false);
    expect(unknownHourCandidateResultSchema.safeParse({
      ...result,
      ruleProfileDigest: "0".repeat(63)
    }).success).toBe(false);
    expect(unknownHourCandidateResultSchema.safeParse({
      ...result,
      candidates: [{
        ...first,
        variants: [{ ...first.variants[0], chartResultHash: "0".repeat(64) }]
      }, ...result.candidates.slice(1)]
    }).success).toBe(false);
  });

  it("rejects candidate sets whose original input is not explicitly unknown-hour", async () => {
    const result = await calculateUnknownHourCandidates(
      unknownHourAt("2024-02-04", "Asia/Shanghai"),
      WORKING_DEFAULT_RULE_PROFILE
    );

    expect(unknownHourCandidateResultSchema.safeParse({
      ...result,
      input: { ...result.input, time: "12:30", timePrecision: "exact_minute" }
    }).success).toBe(false);
    expect(unknownHourCandidateResultSchema.safeParse({
      ...result,
      input: { ...result.input, time: null, timePrecision: "date_only" }
    }).success).toBe(false);
  });

  it("农历未知时辰先转换日期，再生成 13 个候选且保留农历原始输入", async () => {
    const lunarUnknown: BirthInput = {
      ...unknownHourAt("1995-07-23", "Asia/Shanghai"),
      calendarType: "lunar"
    };
    const result = await calculateUnknownHourCandidates(lunarUnknown, WORKING_DEFAULT_RULE_PROFILE);

    expect(result.input).toEqual(lunarUnknown);
    expect(result.candidates).toHaveLength(13);
    expect(result.candidates.every((candidate) =>
      candidate.timeCalibration.calendarResolution.inputCalendarType === "lunar" &&
      candidate.timeCalibration.calendarResolution.resolvedGregorianDate === "1995-08-18"
    )).toBe(true);
    expect(result.candidates.every((candidate) => candidate.chart?.input.calendarType === "lunar")).toBe(true);
  });

  it("按固定顺序生成 13 个不跨时支边界的代表探针，且不修改输入", async () => {
    const unknownInput = unknownHourAt("2024-02-04", "Asia/Shanghai");
    const snapshot = structuredClone(unknownInput);
    const result = await calculateUnknownHourCandidates(unknownInput, WORKING_DEFAULT_RULE_PROFILE);

    expect(unknownInput).toEqual(snapshot);
    expect(result.kind).toBe("unknown_hour_candidate_probes");
    expect(result.verificationStatus).toBe("experimental_probe");
    expect(result.algorithmId).toBe(UNKNOWN_HOUR_PROBE_ALGORITHM_ID);
    expect(result.probeDefinitionVersion).toBe(UNKNOWN_HOUR_PROBE_DEFINITION_VERSION);
    expect(result.hashSchemaVersion).toBe("2.0.0");
    expect(result.tzdbVersion).toBe(result.timeZoneDatabase?.snapshotId);
    expect(result.timeZoneDatabase).toMatchObject({ ianaVersion: "2026c", kind: "bundled_iana_tzdb" });
    expect(result.probeCount).toBe(13);
    expect(result.candidates).toHaveLength(13);
    expect(result.candidates.map((candidate) => candidate.candidateId)).toEqual([
      "zi-00", "chou-01", "yin-03", "mao-05", "chen-07", "si-09", "wu-11",
      "wei-13", "shen-15", "you-17", "xu-19", "hai-21", "zi-23"
    ]);
    expect(result.candidates.map((candidate) => candidate.representativeTime)).toEqual([
      "00:30", "01:30", "03:30", "05:30", "07:30", "09:30", "11:30",
      "13:30", "15:30", "17:30", "19:30", "21:30", "23:30"
    ]);
    expect(result.candidates.every((candidate) => candidate.verificationStatus === "experimental_probe")).toBe(true);
    expect(result.candidates.map((candidate) => candidate.probeIndex)).toEqual([...Array(13).keys()]);
    expect(result.candidates.every((candidate) => candidate.sourceKind === "synthetic_representative_probe")).toBe(true);
    expect(result.candidates.every((candidate) => candidate.status === "calculated")).toBe(true);
    expect(result.candidates.every((candidate) => candidate.variants.length === 1)).toBe(true);
    expect(result.candidates.every((candidate) => candidate.variants[0].sourceKind === "synthetic_unknown_hour_probe")).toBe(true);
    expect(result.candidates.every((candidate) => candidate.chart?.input.time === candidate.representativeTime)).toBe(true);
    expect(result.candidates.every((candidate) => candidate.chart?.facts.pillars.hour.branch === candidate.branch)).toBe(true);
    expect(result.warnings.join(" ")).toContain("不是出生时刻推断");
    expect(result.warnings.join(" ")).toContain("不是用户原始出生时刻");
    expect(result.warnings.join(" ")).toContain("未覆盖节气在两探针之间");
  });

  it("分别保留午夜后的子段与 23 点子初边界变体", async () => {
    const result = await calculateUnknownHourCandidates(
      unknownHourAt("2024-02-04", "Asia/Shanghai"),
      WORKING_DEFAULT_RULE_PROFILE
    );
    const ziCandidates = result.candidates.filter((candidate) => candidate.branch === "子");

    expect(ziCandidates).toHaveLength(2);
    expect(ziCandidates.map((candidate) => ({
      id: candidate.candidateId,
      range: candidate.civilTimeRange,
      segment: candidate.ziSegment,
      variant: candidate.isZiBoundaryVariant
    }))).toEqual([
      { id: "zi-00", range: { start: "00:00", end: "01:00", startInclusive: "00:00", endExclusive: "01:00" }, segment: "after_midnight", variant: true },
      { id: "zi-23", range: { start: "23:00", end: "24:00", startInclusive: "23:00", endExclusive: "24:00" }, segment: "before_midnight", variant: true }
    ]);
  });

  it("23:30 子初候选按 zi_start 与 midnight 规则显示不同日柱及时干", async () => {
    const unknownInput = unknownHourAt("2024-02-04", "Asia/Shanghai");
    const ziStart = await calculateUnknownHourCandidates(unknownInput, withDayBoundary("zi_start_23"));
    const midnight = await calculateUnknownHourCandidates(unknownInput, withDayBoundary("midnight"));
    const ziStartProbe = ziStart.candidates.find((candidate) => candidate.candidateId === "zi-23");
    const midnightProbe = midnight.candidates.find((candidate) => candidate.candidateId === "zi-23");

    expect(ziStartProbe?.status).toBe("calculated");
    expect(midnightProbe?.status).toBe("calculated");
    expect(ziStartProbe?.chart?.facts.pillars.day.ganZhi).toBe("己亥");
    expect(ziStartProbe?.chart?.facts.pillars.hour.ganZhi).toBe("甲子");
    expect(midnightProbe?.chart?.facts.pillars.day.ganZhi).toBe("戊戌");
    expect(midnightProbe?.chart?.facts.pillars.hour.ganZhi).toBe("壬子");
  });

  it("DST overlap 探针返回两个 time-core 候选并保持整批其他探针可用", async () => {
    const result = await calculateUnknownHourCandidates(
      unknownHourAt("2024-04-07", "Australia/Lord_Howe"),
      withTimeRules({ dayBoundary: "zi_start_23", dstAmbiguity: "earlier" })
    );
    const overlap = result.candidates.find((candidate) => candidate.candidateId === "chou-01");

    expect(overlap?.status).toBe("requires_user_time_resolution");
    expect(overlap?.chart).toBeNull();
    expect(overlap?.unresolvedReason?.code).toBe("DST_OVERLAP_REQUIRES_USER_CHOICE");
    expect(overlap?.timeCalibration.timeZoneResolution).toMatchObject({
      kind: "overlap",
      policy: "reject",
      status: "rejected_overlap",
      selectedCandidate: null
    });
    expect(overlap?.timeCalibration.timeZoneResolution.candidates).toHaveLength(2);
    expect(overlap?.timeCalibration.timeZoneResolution.candidates.map((candidate) => ({
      choice: candidate.choice,
      instant: candidate.instant,
      utcOffset: candidate.utcOffset
    }))).toEqual([
      { choice: "earlier", instant: "2024-04-06T14:30:00Z", utcOffset: "+11:00" },
      { choice: "later", instant: "2024-04-06T15:00:00Z", utcOffset: "+10:30" }
    ]);
    expect(overlap?.timeCalibration.timeZoneResolution.candidates.every((candidate) => candidate.matchesInputWallTime)).toBe(true);
    expect(overlap?.variants.map((variant) => ({
      choice: variant.choice,
      instant: variant.instant,
      utcOffset: variant.utcOffset,
      sourceKind: variant.sourceKind
    }))).toEqual([
      { choice: "earlier", instant: "2024-04-06T14:30:00Z", utcOffset: "+11:00", sourceKind: "synthetic_unknown_hour_probe" },
      { choice: "later", instant: "2024-04-06T15:00:00Z", utcOffset: "+10:30", sourceKind: "synthetic_unknown_hour_probe" }
    ]);
    expect(overlap?.variants.every((variant) => variant.chartResultHash === variant.chart.manifest.resultHash)).toBe(true);
    expect(result.candidates.filter((candidate) => candidate.status === "calculated")).toHaveLength(12);
  });

  it("DST gap 探针不静默平移墙上时间", async () => {
    const result = await calculateUnknownHourCandidates(
      unknownHourAt("2018-11-04", "America/Sao_Paulo"),
      WORKING_DEFAULT_RULE_PROFILE
    );
    const gap = result.candidates.find((candidate) => candidate.candidateId === "zi-00");

    expect(gap?.status).toBe("requires_user_time_resolution");
    expect(gap?.chart).toBeNull();
    expect(gap?.unresolvedReason?.code).toBe("DST_GAP_REQUIRES_USER_RESOLUTION");
    expect(gap?.timeCalibration.timeZoneResolution).toMatchObject({
      kind: "gap",
      policy: "reject",
      status: "rejected_gap",
      selectedCandidate: null
    });
    expect(gap?.timeCalibration.timeZoneResolution.candidates).toHaveLength(2);
    expect(gap?.timeCalibration.timeZoneResolution.candidates.every((candidate) => !candidate.matchesInputWallTime)).toBe(true);
    expect(gap?.variants).toHaveLength(0);
    expect(result.candidates.filter((candidate) => candidate.status === "calculated")).toHaveLength(12);
  });

  it("整日时区跳跃会返回 13 个显式 unresolved 探针而不是整批抛错", async () => {
    const result = await calculateUnknownHourCandidates(
      unknownHourAt("2011-12-30", "Pacific/Apia"),
      WORKING_DEFAULT_RULE_PROFILE
    );

    expect(result.candidates).toHaveLength(13);
    expect(result.candidates.every((candidate) => candidate.status === "requires_user_time_resolution")).toBe(true);
    expect(result.candidates.every((candidate) => candidate.chart === null)).toBe(true);
    expect(result.candidates.every((candidate) => candidate.variants.length === 0)).toBe(true);
    expect(result.candidates.every((candidate) => candidate.timeCalibration.timeZoneResolution.kind === "gap")).toBe(true);
    expect(result.candidates.every((candidate) => candidate.unresolvedReason?.code === "DST_GAP_REQUIRES_USER_RESOLUTION")).toBe(true);
  });

  it("候选集合哈希不受各命盘 calculatedAt 影响并可稳定复算", async () => {
    const unknownInput = unknownHourAt("1995-08-18", "Asia/Shanghai");
    const first = await calculateUnknownHourCandidates(unknownInput, WORKING_DEFAULT_RULE_PROFILE);
    const second = await calculateUnknownHourCandidates(unknownInput, WORKING_DEFAULT_RULE_PROFILE);
    const presentationOnlyChange = await calculateUnknownHourCandidates({
      ...unknownInput,
      sourceNote: "不同的研究说明",
      location: { ...unknownInput.location, label: "不同的展示地点名" }
    }, WORKING_DEFAULT_RULE_PROFILE);

    expect(first.resultHash).toBe(second.resultHash);
    expect(first.resultHash).toBe(presentationOnlyChange.resultHash);
    expect(first.ruleProfileDigest).toBe(second.ruleProfileDigest);
    expect(first.candidates.map((candidate) => candidate.chart?.manifest.resultHash ?? null)).toEqual(
      second.candidates.map((candidate) => candidate.chart?.manifest.resultHash ?? null)
    );
    expect(first.candidates.map((candidate) => candidate.variants.map((variant) => variant.chartResultHash))).toEqual(
      second.candidates.map((candidate) => candidate.variants.map((variant) => variant.chartResultHash))
    );
  });

  it("拒绝把确定时刻误送入未知时辰候选入口", async () => {
    await expect(calculateUnknownHourCandidates(input, WORKING_DEFAULT_RULE_PROFILE))
      .rejects.toBeInstanceOf(UnsupportedCalculationError);
  });
});
