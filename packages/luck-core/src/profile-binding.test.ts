import { describe, expect, it } from "vitest";
import {
  DEFAULT_LUCK_CYCLE_RULE,
  LuckCoreError,
  bindLuckCycleRuleProfile,
  calculateLuckCycle,
  type LuckCycleProfileBinding
} from "./index";

function profile(overrides: Partial<LuckCycleProfileBinding> = {}): LuckCycleProfileBinding {
  return {
    profileId: "traditional-working-default",
    profileVersion: "1.2.3",
    luckCycle: {
      directionRule: "year_stem_yinyang_and_gender",
      unknownValuePolicy: "require_manual_direction",
      anchor: "directional_jie",
      startAgeMethod: "three_days_one_year_exact_duration",
      rounding: "retain_duration"
    },
    ...overrides
  };
}

function expectUnsupported(action: () => unknown): void {
  try {
    action();
    throw new Error("expected binding to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(LuckCoreError);
    expect((error as LuckCoreError).code).toBe("UNSUPPORTED_RULE");
  }
}

describe("bindLuckCycleRuleProfile", () => {
  it("expands the compact profile into the complete explicitly versioned rule", () => {
    const bound = bindLuckCycleRuleProfile(profile());
    expect(bound).toEqual({
      ...DEFAULT_LUCK_CYCLE_RULE,
      ruleId: "traditional-working-default:luck-cycle-xiaoyun",
      ruleVersion: "1.2.3"
    });

    const result = calculateLuckCycle({
      schemaVersion: "1.0.0",
      birthInstant: "2024-02-03T04:00:00Z",
      sex: "female"
    }, bound);
    expect(result.rule).toEqual(bound);
    expect(result.manifest).toMatchObject({
      ruleId: "traditional-working-default:luck-cycle-xiaoyun",
      ruleVersion: "1.2.3"
    });
  });

  it("returns detached nested values so callers cannot mutate the default or another binding", () => {
    const first = bindLuckCycleRuleProfile(profile());
    const second = bindLuckCycleRuleProfile(profile());
    first.componentRatios.traditionalMonthsPerYear = 12;
    first.decadeCount = 8;
    first.xiaoyun!.scope = "whole_life";

    expect(second.decadeCount).toBe(10);
    expect(DEFAULT_LUCK_CYCLE_RULE.decadeCount).toBe(10);
    expect(first.componentRatios).not.toBe(second.componentRatios);
    expect(first.handoverCalendar).not.toBe(second.handoverCalendar);
    expect(first.xiaoyun).not.toBe(second.xiaoyun);
    expect(second.xiaoyun).toEqual(DEFAULT_LUCK_CYCLE_RULE.xiaoyun);
  });

  it("rejects an unversioned identity and every unsupported compact-policy value", () => {
    expectUnsupported(() => bindLuckCycleRuleProfile(profile({ profileVersion: "v1" })));
    expectUnsupported(() => bindLuckCycleRuleProfile(profile({ profileId: "" })));
    expectUnsupported(() => bindLuckCycleRuleProfile(profile({
      luckCycle: { ...profile().luckCycle, anchor: "directional_qi" as "directional_jie" }
    })));
    expectUnsupported(() => bindLuckCycleRuleProfile(profile({
      luckCycle: { ...profile().luckCycle, rounding: "whole_year" as "retain_duration" }
    })));
  });
});
