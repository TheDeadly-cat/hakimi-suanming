import { describe, expect, it } from "vitest";
import { Solar } from "lunar-typescript";
import {
  DEFAULT_LUCK_CYCLE_RULE,
  HISTORICAL_LUCK_CYCLE_EXECUTOR_REGISTRY,
  LUCK_CORE_ENGINE,
  LUCK_CYCLE_ALGORITHM_ID,
  LUCK_CYCLE_EXECUTOR_DESCRIPTOR,
  LuckCoreError,
  calculateLuckCycle,
  calculateXiaoyunGanZhi,
  lookupHistoricalLuckCycleExecutor,
  replayHistoricalLuckCycle,
  requireHistoricalLuckCycleExecutor,
  type LuckCycleInput,
  type LuckCycleRule,
  type LuckSex
} from "./index";

function input(birthInstant: string, sex: LuckSex, extra: Partial<LuckCycleInput> = {}): LuckCycleInput {
  return {
    schemaVersion: "1.0.0",
    birthInstant,
    sex,
    ...extra
  };
}

function mutableRule(): LuckCycleRule {
  return structuredClone(DEFAULT_LUCK_CYCLE_RULE);
}

function expectCode(action: () => unknown, code: LuckCoreError["code"]): void {
  try {
    action();
    throw new Error("expected calculation to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(LuckCoreError);
    expect((error as LuckCoreError).code).toBe(code);
  }
}

describe("calculateXiaoyunGanZhi", () => {
  it("steps to the adjacent pillar in the reused luck direction", () => {
    const rule = mutableRule().xiaoyun!;
    expect(calculateXiaoyunGanZhi("甲子", "forward", 1, rule)).toBe("乙丑");
    expect(calculateXiaoyunGanZhi("甲子", "backward", 1, rule)).toBe("癸亥");
  });

  it("wraps exactly across the locked sixty-step cycle", () => {
    const rule = mutableRule().xiaoyun!;
    expect(calculateXiaoyunGanZhi("癸亥", "forward", 1, rule)).toBe("甲子");
    expect(calculateXiaoyunGanZhi("甲子", "backward", 60, rule)).toBe("甲子");
    expect(calculateXiaoyunGanZhi("甲子", "forward", 61, rule)).toBe("乙丑");
  });

  it("keeps old dayun-only rules readable but rejects a mutated xiaoyun lock", () => {
    const legacyRule = mutableRule();
    delete legacyRule.xiaoyun;
    legacyRule.ruleId = "ziping-directional-jie-working-default";
    legacyRule.ruleVersion = "1.0.0";
    expect(calculateLuckCycle(input("2024-02-05T04:00:00Z", "male"), legacyRule).rule.xiaoyun)
      .toBeUndefined();

    const changedRule = mutableRule();
    changedRule.xiaoyun = { ...changedRule.xiaoyun!, firstStepOffset: 2 as 1 };
    expectCode(
      () => calculateLuckCycle(input("2024-02-05T04:00:00Z", "male"), changedRule),
      "UNSUPPORTED_RULE"
    );
  });
});

describe("calculateLuckCycle direction", () => {
  it.each([
    ["male", "forward"],
    ["female", "backward"]
  ] as const)("derives yang-year %s as %s", (sex, direction) => {
    const result = calculateLuckCycle(input("2024-02-05T04:00:00Z", sex));
    expect(result.birth.yearGanZhi).toBe("甲辰");
    expect(result.direction.yearStemPolarity).toBe("yang");
    expect(result.direction.value).toBe(direction);
  });

  it.each([
    ["male", "backward"],
    ["female", "forward"]
  ] as const)("derives yin-year %s as %s", (sex, direction) => {
    const result = calculateLuckCycle(input("2023-02-05T04:00:00Z", sex));
    expect(result.birth.yearGanZhi).toBe("癸卯");
    expect(result.direction.yearStemPolarity).toBe("yin");
    expect(result.direction.value).toBe(direction);
  });

  it("requires an explicit direction for unspecified sex", () => {
    expectCode(
      () => calculateLuckCycle(input("2024-02-05T04:00:00Z", "unspecified")),
      "MANUAL_DIRECTION_REQUIRED"
    );

    const result = calculateLuckCycle(
      input("2024-02-05T04:00:00Z", "unspecified", { manualDirection: "backward" })
    );
    expect(result.direction).toMatchObject({
      value: "backward",
      basis: "manual_for_unspecified_sex",
      sex: "unspecified"
    });
  });

  it("does not let a manual value override a known-sex derivation", () => {
    expectCode(
      () => calculateLuckCycle(input("2024-02-05T04:00:00Z", "male", { manualDirection: "backward" })),
      "MANUAL_DIRECTION_NOT_ALLOWED"
    );
  });
});

describe("calculateLuckCycle exact duration and handover", () => {
  it("retains the unrounded forward interval and produces ten real decade pillars", () => {
    const result = calculateLuckCycle(input("2024-02-03T04:00:00Z", "female"));

    expect(result.direction.value).toBe("forward");
    expect(result.birth).toMatchObject({
      fixedPlusEightWallDateTime: "2024-02-03T12:00:00.000",
      yearGanZhi: "癸卯",
      monthGanZhi: "乙丑"
    });
    expect(result.adjacentJie.previous).toMatchObject({
      name: "小寒",
      instant: "2024-01-05T20:49:22.000Z",
      relation: "strict_previous"
    });
    expect(result.adjacentJie.next).toMatchObject({
      name: "立春",
      instant: "2024-02-04T08:27:07.000Z",
      relation: "strict_next"
    });
    expect(result.adjacentJie.selectedAnchor.name).toBe("立春");
    expect(result.anchorInterval.durationMilliseconds).toBe(102_427_000);
    expect(result.anchorInterval.durationSeconds).toMatchObject({
      numerator: "102427000",
      denominator: "1000"
    });
    expect(result.startAge.components).toEqual({
      years: 0,
      months: 4,
      days: 22,
      hours: 6,
      minutes: 14,
      seconds: 0,
      milliseconds: 0
    });
    expect(result.startAge.sourceToTraditionalYearRatio).toMatchObject({
      numerator: "102427000",
      denominator: "259200000"
    });
    expect(result.handover).toMatchObject({
      instant: "2024-06-25T10:14:00.000Z",
      fixedPlusEightWallDateTime: "2024-06-25T18:14:00.000"
    });

    expect(result.decades).toHaveLength(10);
    expect(result.decades.map((item) => item.ganZhi)).toEqual([
      "丙寅", "丁卯", "戊辰", "己巳", "庚午", "辛未", "壬申", "癸酉", "甲戌", "乙亥"
    ]);
    expect(result.decades[0]).toMatchObject({
      index: 1,
      startInstant: "2024-06-25T10:14:00.000Z",
      endExclusiveInstant: "2034-06-25T10:14:00.000Z"
    });
    expect(result.decades[9].startAge.elapsedYears.numerator).toBe("23430427000");
  });

  it("handles a backward anchor across the previous civil day", () => {
    const result = calculateLuckCycle(input("2024-02-04T16:30:00Z", "female"));

    expect(result.birth.fixedPlusEightWallDateTime).toBe("2024-02-05T00:30:00.000");
    expect(result.direction.value).toBe("backward");
    expect(result.adjacentJie.selectedAnchor).toMatchObject({
      name: "立春",
      fixedPlusEightWallDateTime: "2024-02-04T16:27:07.000"
    });
    expect(result.anchorInterval.durationMilliseconds).toBe(28_973_000);
    expect(result.startAge.components).toEqual({
      years: 0,
      months: 1,
      days: 10,
      hours: 5,
      minutes: 46,
      seconds: 0,
      milliseconds: 0
    });
    expect(result.handover.fixedPlusEightWallDateTime).toBe("2024-03-15T06:16:00.000");
    expect(result.decades[0].ganZhi).toBe("乙丑");
  });

  it("constrains leap-day calendar addition instead of overflowing", () => {
    const result = calculateLuckCycle(input("2020-02-29T04:00:00Z", "male"));
    expect(result.startAge.components.years).toBeGreaterThanOrEqual(1);
    expect(result.handover.fixedPlusEightWallDateTime.startsWith("2021-")).toBe(true);
    expect(result.handover.fixedPlusEightWallDateTime).not.toContain("2021-03-01T12:00:00");
  });
});

describe("calculateLuckCycle solar-term boundary", () => {
  const exactXiaoHan = "1990-01-05T14:33:14Z";

  it("uses zero duration for an exact Jie second and still exposes strict neighbors", () => {
    const result = calculateLuckCycle(input(exactXiaoHan, "male"));
    expect(result.adjacentJie.previous.name).toBe("大雪");
    expect(result.adjacentJie.exactBoundary).toMatchObject({
      name: "小寒",
      relation: "exact_boundary",
      instant: "1990-01-05T14:33:14.000Z"
    });
    expect(result.adjacentJie.next.name).toBe("立春");
    expect(result.adjacentJie.selectedAnchor.name).toBe("小寒");
    expect(result.anchorInterval.durationMilliseconds).toBe(0);
    expect(result.startAge.components).toEqual({
      years: 0,
      months: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      milliseconds: 0
    });
    expect(result.handover.instant).toBe("1990-01-05T14:33:14.000Z");
  });

  it("keeps the one-second before/after boundary intervals instead of rounding them away", () => {
    const before = calculateLuckCycle(input("1990-01-05T14:33:13Z", "female"));
    expect(before.direction.value).toBe("forward");
    expect(before.adjacentJie.exactBoundary).toBeNull();
    expect(before.adjacentJie.selectedAnchor.name).toBe("小寒");
    expect(before.anchorInterval.durationMilliseconds).toBe(1_000);
    expect(before.startAge.components).toMatchObject({ minutes: 2, seconds: 0 });

    const after = calculateLuckCycle(input("1990-01-05T14:33:15Z", "male"));
    expect(after.direction.value).toBe("backward");
    expect(after.adjacentJie.exactBoundary).toBeNull();
    expect(after.adjacentJie.selectedAnchor.name).toBe("小寒");
    expect(after.anchorInterval.durationMilliseconds).toBe(1_000);
    expect(after.startAge.components).toMatchObject({ minutes: 2, seconds: 0 });
  });

  it("retains second-level evidence that upstream Yun sect=2 truncates", () => {
    const upstream = Solar.fromYmdHms(1990, 1, 5, 22, 33, 13)
      .getLunar()
      .getEightChar()
      .getYun(0, 2);
    expect([
      upstream.getStartYear(),
      upstream.getStartMonth(),
      upstream.getStartDay(),
      upstream.getStartHour()
    ]).toEqual([0, 0, 0, 0]);

    const exact = calculateLuckCycle(input("1990-01-05T14:33:13Z", "female"));
    expect(exact.anchorInterval.durationMilliseconds).toBe(1_000);
    expect(exact.startAge.components).toMatchObject({ minutes: 2 });
  });
});

describe("calculateLuckCycle provenance and rejection", () => {
  it("attaches versioned provenance to every factual layer and is deterministic", () => {
    const request = input("2024-02-03T04:00:00Z", "female", {
      expectedYearGanZhi: "癸卯",
      expectedMonthGanZhi: "乙丑"
    });
    const first = calculateLuckCycle(request);
    const second = calculateLuckCycle(request);

    expect(second).toEqual(first);
    expect(first.manifest).toMatchObject({
      algorithmId: LUCK_CYCLE_ALGORITHM_ID,
      engine: { name: "hakimi-luck-core", version: "0.1.0" },
      upstream: { name: "lunar-typescript", version: "1.8.6" },
      verificationStatus: "engineering_preview",
      goldCaseCount: 0,
      releaseGatePassed: false
    });
    expect(first.manifest.upstream.tagCommit).toBe(LUCK_CORE_ENGINE.upstreamTagCommit);

    const facts = [
      first.birth,
      first.direction,
      first.adjacentJie.previous,
      first.adjacentJie.next,
      first.adjacentJie.selectedAnchor,
      first.anchorInterval,
      first.startAge,
      first.handover,
      ...first.decades
    ];
    for (const fact of facts) {
      expect(fact.algorithmId).toBe(LUCK_CYCLE_ALGORITHM_ID);
      expect(fact.verificationStatus).toBe("engineering_preview");
    }
    expect(first.knownGaps.join(" ")).toContain("goldCaseCount=0");
  });

  it("rejects a chart pillar mismatch rather than mixing rule frames", () => {
    expectCode(
      () => calculateLuckCycle(input("2024-02-03T04:00:00Z", "female", { expectedYearGanZhi: "甲辰" })),
      "PILLAR_MISMATCH"
    );
  });

  it("rejects offset-free instants, out-of-range dates, and unsupported rules", () => {
    expectCode(
      () => calculateLuckCycle(input("2024-02-03T12:00:00", "female")),
      "INVALID_INSTANT"
    );
    expectCode(
      () => calculateLuckCycle(input("1899-12-31T12:00:00Z", "female")),
      "UNSUPPORTED_RANGE"
    );
    expectCode(
      () => calculateLuckCycle(input("2024-02-30T12:00:00+08:00", "female")),
      "INVALID_INSTANT"
    );
    expectCode(
      () => calculateLuckCycle(input("2024-02-03T12:00:00+15:00", "female")),
      "INVALID_INSTANT"
    );

    const rule = mutableRule();
    (rule as { anchor: string }).anchor = "directional_qi";
    expectCode(
      () => calculateLuckCycle(input("2024-02-03T04:00:00Z", "female"), rule),
      "UNSUPPORTED_RULE"
    );

    const malformedRule = { ...mutableRule(), componentRatios: undefined } as unknown as LuckCycleRule;
    expectCode(
      () => calculateLuckCycle(input("2024-02-03T04:00:00Z", "female"), malformedRule),
      "UNSUPPORTED_RULE"
    );
  });

  it("normalizes equivalent explicit offsets to the same reproducible instant", () => {
    const utc = calculateLuckCycle(input("2024-02-03T04:00:00Z", "female"));
    const offset = calculateLuckCycle(input("2024-02-03T12:00:00+08:00", "female"));
    expect(offset.input.birthInstant).toBe("2024-02-03T04:00:00.000Z");
    expect(offset.birth).toEqual(utc.birth);
    expect(offset.decades).toEqual(utc.decades);
  });

  it("can explicitly reject unspecified sex at the rule level", () => {
    const rule = mutableRule();
    delete rule.xiaoyun;
    rule.ruleId = "ziping-directional-jie-working-default";
    rule.ruleVersion = "1.0.0";
    rule.unknownSexPolicy = "reject";
    expectCode(
      () => calculateLuckCycle(
        input("2024-02-03T04:00:00Z", "unspecified", { manualDirection: "forward" }),
        rule
      ),
      "MANUAL_DIRECTION_REQUIRED"
    );
  });
});

describe("historical luck-cycle executor registry", () => {
  it("selects and executes the frozen 0.1.0 implementation by its complete descriptor", () => {
    const descriptor = structuredClone(LUCK_CYCLE_EXECUTOR_DESCRIPTOR);
    const executor = lookupHistoricalLuckCycleExecutor(descriptor);

    expect(executor?.executorId).toBe("hakimi-luck-core:luck-cycle-executor:0.1.0");
    const result = requireHistoricalLuckCycleExecutor(descriptor).replay(
      input("2024-02-03T04:00:00Z", "female"),
      mutableRule()
    );
    expect(result.manifest).toMatchObject({
      algorithmId: descriptor.algorithmId,
      engine: descriptor.engine,
      upstream: descriptor.upstream
    });
    expect(result.schemaVersion).toBe(descriptor.outputSchemaVersion);
    expect(result.rule.schemaVersion).toBe(descriptor.ruleSnapshotSchemaVersion);
  });

  it("rejects same-version descriptor mismatches and unknown or incomplete descriptors without fallback", () => {
    const mismatchedBuild = {
      ...structuredClone(LUCK_CYCLE_EXECUTOR_DESCRIPTOR),
      upstream: {
        ...structuredClone(LUCK_CYCLE_EXECUTOR_DESCRIPTOR.upstream),
        tagCommit: "different-build"
      }
    };
    const unknownVersion = {
      ...structuredClone(LUCK_CYCLE_EXECUTOR_DESCRIPTOR),
      engine: {
        ...structuredClone(LUCK_CYCLE_EXECUTOR_DESCRIPTOR.engine),
        version: "9.9.9"
      }
    };

    expect(lookupHistoricalLuckCycleExecutor(mismatchedBuild)).toBeNull();
    expect(lookupHistoricalLuckCycleExecutor(unknownVersion)).toBeNull();
    expect(lookupHistoricalLuckCycleExecutor({
      engine: structuredClone(LUCK_CYCLE_EXECUTOR_DESCRIPTOR.engine)
    })).toBeNull();
    expect(lookupHistoricalLuckCycleExecutor({
      ...structuredClone(LUCK_CYCLE_EXECUTOR_DESCRIPTOR),
      unexpected: true
    })).toBeNull();
    expectCode(
      () => requireHistoricalLuckCycleExecutor(mismatchedBuild),
      "HISTORICAL_EXECUTOR_UNAVAILABLE"
    );
  });

  it("freezes registry identity and executes from cloned frozen input and rule snapshots with zero writes", () => {
    expect(Object.isFrozen(LUCK_CORE_ENGINE)).toBe(true);
    expect(Object.isFrozen(HISTORICAL_LUCK_CYCLE_EXECUTOR_REGISTRY)).toBe(true);
    expect(Object.isFrozen(HISTORICAL_LUCK_CYCLE_EXECUTOR_REGISTRY[0])).toBe(true);
    expect(Object.isFrozen(LUCK_CYCLE_EXECUTOR_DESCRIPTOR)).toBe(true);
    expect(Object.isFrozen(LUCK_CYCLE_EXECUTOR_DESCRIPTOR.engine)).toBe(true);
    expect(Object.isFrozen(LUCK_CYCLE_EXECUTOR_DESCRIPTOR.upstream)).toBe(true);
    expect(() => {
      (LUCK_CORE_ENGINE as { version: string }).version = "tampered";
    }).toThrow(TypeError);
    expect(() => {
      (LUCK_CYCLE_EXECUTOR_DESCRIPTOR.engine as { version: string }).version = "tampered";
    }).toThrow(TypeError);

    const rawInput = input("2024-02-03T04:00:00Z", "female");
    const rawRule = mutableRule();
    const inputBefore = structuredClone(rawInput);
    const ruleBefore = structuredClone(rawRule);
    const result = replayHistoricalLuckCycle(
      LUCK_CYCLE_EXECUTOR_DESCRIPTOR,
      rawInput,
      rawRule
    );

    expect(rawInput).toEqual(inputBefore);
    expect(rawRule).toEqual(ruleBefore);
    expect(Object.isFrozen(rawInput)).toBe(false);
    expect(Object.isFrozen(rawRule)).toBe(false);
    expect(result.input).not.toBe(rawInput);
    expect(result.rule).not.toBe(rawRule);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.input)).toBe(true);
    expect(Object.isFrozen(result.rule)).toBe(true);
    expect(Object.isFrozen(result.rule.componentRatios)).toBe(true);
    expect(Object.isFrozen(result.decades)).toBe(true);
    expect(Object.isFrozen(result.decades[0])).toBe(true);
    expect(() => {
      result.rule.decadeCount = 1;
    }).toThrow(TypeError);
    expect(result.manifest).toMatchObject({
      algorithmId: LUCK_CYCLE_EXECUTOR_DESCRIPTOR.algorithmId,
      engine: LUCK_CYCLE_EXECUTOR_DESCRIPTOR.engine,
      upstream: LUCK_CYCLE_EXECUTOR_DESCRIPTOR.upstream
    });
  });

  it("rejects unknown or extra keys at every historical input and nested rule boundary", () => {
    const extraInput = {
      ...input("2024-02-03T04:00:00Z", "female"),
      unexpected: true
    } as unknown as LuckCycleInput;
    expectCode(
      () => replayHistoricalLuckCycle(LUCK_CYCLE_EXECUTOR_DESCRIPTOR, extraInput, mutableRule()),
      "INVALID_INPUT"
    );

    const extraRule = {
      ...mutableRule(),
      unexpected: true
    } as unknown as LuckCycleRule;
    expectCode(
      () => replayHistoricalLuckCycle(
        LUCK_CYCLE_EXECUTOR_DESCRIPTOR,
        input("2024-02-03T04:00:00Z", "female"),
        extraRule
      ),
      "UNSUPPORTED_RULE"
    );

    const extraRatios = mutableRule();
    (extraRatios.componentRatios as LuckCycleRule["componentRatios"] & { unexpected: boolean }).unexpected = true;
    expectCode(
      () => replayHistoricalLuckCycle(
        LUCK_CYCLE_EXECUTOR_DESCRIPTOR,
        input("2024-02-03T04:00:00Z", "female"),
        extraRatios
      ),
      "UNSUPPORTED_RULE"
    );

    const extraHandover = mutableRule();
    (extraHandover.handoverCalendar as LuckCycleRule["handoverCalendar"] & { unexpected: boolean }).unexpected = true;
    expectCode(
      () => replayHistoricalLuckCycle(
        LUCK_CYCLE_EXECUTOR_DESCRIPTOR,
        input("2024-02-03T04:00:00Z", "female"),
        extraHandover
      ),
      "UNSUPPORTED_RULE"
    );

    const extraXiaoyun = mutableRule();
    (extraXiaoyun.xiaoyun as NonNullable<LuckCycleRule["xiaoyun"]> & { unexpected: boolean }).unexpected = true;
    expectCode(
      () => replayHistoricalLuckCycle(
        LUCK_CYCLE_EXECUTOR_DESCRIPTOR,
        input("2024-02-03T04:00:00Z", "female"),
        extraXiaoyun
      ),
      "UNSUPPORTED_RULE"
    );
  });

  it("keeps A/B/A historical replays isolated across distinct frozen rule snapshots", () => {
    const request = input("2024-02-03T04:00:00Z", "female");
    const ruleA = mutableRule();
    ruleA.ruleId = "research-rule-a";
    const ruleB = mutableRule();
    ruleB.ruleId = "research-rule-b";
    ruleB.decadeCount = 2;

    const firstA = replayHistoricalLuckCycle(LUCK_CYCLE_EXECUTOR_DESCRIPTOR, request, ruleA);
    const middleB = replayHistoricalLuckCycle(LUCK_CYCLE_EXECUTOR_DESCRIPTOR, request, ruleB);
    const secondA = replayHistoricalLuckCycle(LUCK_CYCLE_EXECUTOR_DESCRIPTOR, request, ruleA);

    expect(secondA).toEqual(firstA);
    expect(firstA.rule.ruleId).toBe("research-rule-a");
    expect(firstA.decades).toHaveLength(10);
    expect(middleB.rule.ruleId).toBe("research-rule-b");
    expect(middleB.decades).toHaveLength(2);
    expect(ruleA.decadeCount).toBe(10);
    expect(ruleB.decadeCount).toBe(2);
  });
});
