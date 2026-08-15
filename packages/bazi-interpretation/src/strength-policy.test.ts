import { describe, expect, it } from "vitest";
import { BAZI_CONTENT_REVIEW_QUEUE } from "./content-review-queue";
import {
  BAZI_STRENGTH_BAND_THRESHOLDS,
  BAZI_STRENGTH_EXPERT_REVIEW_QUESTIONS,
  BAZI_STRENGTH_FACTOR_WEIGHTS,
  BAZI_STRENGTH_METHOD_REVIEW_ITEMS,
  BAZI_STRENGTH_POLICY,
  BAZI_STRENGTH_SENSITIVITY_SCENARIOS,
  canonicalizeStrengthTenGod,
  classifyStrengthBand,
  strengthFactorDirectionForTenGod,
  strengthFactorWeight,
  strengthTenGodGroup
} from "./strength-policy";

describe("Bazi strength policy v0.17 single source", () => {
  it("freezes the exact 4/2/2/1 weights and five-band boundary matrix", () => {
    expect(BAZI_STRENGTH_FACTOR_WEIGHTS).toEqual({
      monthCommand: 4,
      visibleStem: 2,
      firstHiddenStem: 2,
      otherHiddenStem: 1
    });
    expect(BAZI_STRENGTH_BAND_THRESHOLDS).toEqual({
      veryWeakUpperExclusive: 0.25,
      weakUpperExclusive: 0.43,
      balancedUpperInclusive: 0.57,
      strongUpperInclusive: 0.75
    });
    expect(strengthFactorWeight("month_command")).toBe(4);
    expect(strengthFactorWeight("visible_stem")).toBe(2);
    expect(strengthFactorWeight("hidden_stem", 0)).toBe(2);
    expect(strengthFactorWeight("hidden_stem", 1)).toBe(1);
    expect(() => strengthFactorWeight("hidden_stem")).toThrow(/非负整数索引/u);

    expect([
      classifyStrengthBand(24, 76),
      classifyStrengthBand(25, 75),
      classifyStrengthBand(42, 58),
      classifyStrengthBand(43, 57),
      classifyStrengthBand(57, 43),
      classifyStrengthBand(58, 42),
      classifyStrengthBand(75, 25),
      classifyStrengthBand(76, 24),
      classifyStrengthBand(0, 0)
    ]).toEqual([
      "very_weak",
      "weak",
      "weak",
      "balanced",
      "balanced",
      "strong",
      "strong",
      "very_strong",
      "undetermined"
    ]);
  });

  it("owns the ten-god aliases, groups and support/demand direction", () => {
    expect(canonicalizeStrengthTenGod("偏官")).toBe("七杀");
    expect(canonicalizeStrengthTenGod("枭神")).toBe("偏印");
    expect(strengthTenGodGroup("比肩")).toBe("peer");
    expect(strengthTenGodGroup("偏印")).toBe("resource");
    expect(strengthTenGodGroup("伤官")).toBe("output");
    expect(strengthTenGodGroup("正财")).toBe("wealth");
    expect(strengthTenGodGroup("偏官")).toBe("authority");
    expect(strengthFactorDirectionForTenGod("比肩")).toBe("support");
    expect(strengthFactorDirectionForTenGod("枭神")).toBe("support");
    expect(strengthFactorDirectionForTenGod("食神")).toBe("demand");
    expect(strengthFactorDirectionForTenGod("偏官")).toBe("demand");
    expect(strengthFactorDirectionForTenGod("未知十神")).toBeNull();
  });

  it("is a deterministic serializable leaf policy for scenarios and four method items", () => {
    expect(BAZI_STRENGTH_SENSITIVITY_SCENARIOS.map((scenario) => scenario.id)).toEqual([
      "baseline_current_candidate",
      "deduplicate_month_main",
      "equal_presence_deduplicated",
      "without_month_command_bonus",
      "without_visible_stems",
      "without_hidden_stems"
    ]);
    expect(BAZI_STRENGTH_METHOD_REVIEW_ITEMS.map((item) => item.id)).toEqual([
      "month-command-hidden-stem-duplication",
      "relative-factor-weighting",
      "strength-band-thresholds",
      "strength-invalidation-structures"
    ]);
    expect(BAZI_STRENGTH_EXPERT_REVIEW_QUESTIONS).toEqual(
      BAZI_STRENGTH_METHOD_REVIEW_ITEMS.map((item) => item.question)
    );
    expect(JSON.parse(JSON.stringify(BAZI_STRENGTH_POLICY))).toEqual(BAZI_STRENGTH_POLICY);
    expect(JSON.stringify(BAZI_STRENGTH_POLICY)).not.toMatch(/function|4\/2\/1/u);
  });

  it("drives the four queue items without the stale main-hidden-stem wording", () => {
    const methodItems = BAZI_CONTENT_REVIEW_QUEUE.items.filter((item) => item.category === "strength_method");
    expect(methodItems).toHaveLength(4);
    expect(methodItems.map((item) => item.subjectId)).toEqual(
      BAZI_STRENGTH_METHOD_REVIEW_ITEMS.map((item) => item.id)
    );
    expect(methodItems.map((item) => item.question)).toEqual(BAZI_STRENGTH_EXPERT_REVIEW_QUESTIONS);
    const serialized = JSON.stringify(methodItems);
    expect(serialized).toContain("月令 4、透干 2、首位藏干 2、其余藏干 1");
    expect(serialized).toContain("合计 6");
    expect(serialized).not.toContain("主藏干项");
    expect(serialized).not.toMatch(/4\/2\/1/u);
  });
});
