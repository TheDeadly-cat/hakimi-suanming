import { describe, expect, it } from "vitest";
import type { ChartFacts, PillarFact } from "@hakimi/contracts";
import {
  BAZI_POSITION_SYNTHESIS_REVIEW_PROFILE,
  BAZI_FIRST_READ_REVIEW_PROFILE,
  BAZI_SHENSHA_OCCURRENCE_REVIEW_PROFILE,
  BAZI_TEN_GOD_OCCURRENCE_REVIEW_PROFILE,
  BAZI_TEN_GOD_ORIENTATION_REVIEW_PROFILE,
  BAZI_SHENSHA_RESEARCH_PROFILE,
  BAZI_SHENSHA_RULE_REGISTRY,
  BAZI_STRENGTH_SENSITIVITY_REVIEW_PROFILE,
  BAZI_TEN_GOD_STRENGTH_SENSITIVITY_REVIEW_PROFILE,
  BAZI_THEME_INDEX_REVIEW_PROFILE,
  BAZI_CONTENT_REVIEW_QUEUE,
  BAZI_CONTENT_REVIEW_QUEUE_PROFILE,
  BAZI_CONTENT_REVIEW_EXPORT_FILENAME,
  BAZI_INTERPRETATION_RULE_PROFILE,
  SHENSHA_POSITION_CONTENT_VERSION,
  SHENSHA_POSITION_EDITORIAL,
  TEN_GOD_POSITION_EDITORIAL,
  type ShenshaPositionEditorialEntry,
  buildBaziPositionSynthesisReview,
  buildBaziFirstReadReview,
  buildBaziThemeIndexReview,
  buildBaziContentReviewQueue,
  buildShenshaOccurrenceReview,
  buildStrengthSensitivityReview,
  buildTenGodStrengthSensitivityReview,
  buildTenGodOccurrenceReview,
  buildTenGodOrientationReview,
  classifyStrengthBand,
  deriveShenshaResearchFacts,
  interpretBaziChart,
  serializeBaziContentReviewQueue
} from "./index";

function pillar(input: Pick<PillarFact, "name" | "label" | "ganZhi" | "stem" | "branch" | "hiddenStems" | "stemTenGod" | "branchTenGods" | "wuXing">): PillarFact {
  return {
    ...input,
    nayin: "测试纳音",
    twelveGrowth: "测试长生",
    xun: "甲子",
    voidBranches: "戌亥"
  };
}

function chartFacts(pillars: ChartFacts["pillars"]): ChartFacts {
  return {
    schemaVersion: "1.0.0",
    calendar: {
      solarText: "测试公历",
      lunarText: "测试农历",
      lunarYear: 2000,
      lunarMonth: 1,
      lunarDay: 1,
      isLeapMonth: false,
      previousJie: null,
      nextJie: null
    },
    pillars,
    fieldProvenance: []
  };
}

const weakFacts = chartFacts({
  year: pillar({ name: "year", label: "年柱", ganZhi: "庚申", stem: "庚", branch: "申", hiddenStems: ["庚", "壬", "戊"], stemTenGod: "七杀", branchTenGods: ["七杀", "偏印", "偏财"], wuXing: "金金" }),
  month: pillar({ name: "month", label: "月柱", ganZhi: "辛酉", stem: "辛", branch: "酉", hiddenStems: ["辛"], stemTenGod: "正官", branchTenGods: ["正官"], wuXing: "金金" }),
  day: pillar({ name: "day", label: "日柱", ganZhi: "甲午", stem: "甲", branch: "午", hiddenStems: ["丁", "己"], stemTenGod: "日主", branchTenGods: ["伤官", "正财"], wuXing: "木火" }),
  hour: pillar({ name: "hour", label: "时柱", ganZhi: "戊辰", stem: "戊", branch: "辰", hiddenStems: ["戊", "乙", "癸"], stemTenGod: "偏财", branchTenGods: ["偏财", "劫财", "正印"], wuXing: "土土" })
});

const strongFacts = chartFacts({
  year: pillar({ name: "year", label: "年柱", ganZhi: "壬子", stem: "壬", branch: "子", hiddenStems: ["癸"], stemTenGod: "偏印", branchTenGods: ["正印"], wuXing: "水水" }),
  month: pillar({ name: "month", label: "月柱", ganZhi: "甲寅", stem: "甲", branch: "寅", hiddenStems: ["甲", "丙", "戊"], stemTenGod: "比肩", branchTenGods: ["比肩", "食神", "偏财"], wuXing: "木木" }),
  day: pillar({ name: "day", label: "日柱", ganZhi: "甲寅", stem: "甲", branch: "寅", hiddenStems: ["甲", "丙", "戊"], stemTenGod: "日主", branchTenGods: ["比肩", "食神", "偏财"], wuXing: "木木" }),
  hour: pillar({ name: "hour", label: "时柱", ganZhi: "乙亥", stem: "乙", branch: "亥", hiddenStems: ["壬", "甲"], stemTenGod: "劫财", branchTenGods: ["偏印", "比肩"], wuXing: "木水" })
});

describe("interpretBaziChart transparent strength candidate", () => {
  it("keeps the month command visible and returns a direct weak result without mutating facts", () => {
    const before = structuredClone(weakFacts);
    const result = interpretBaziChart(weakFacts);

    expect(result.profile).toEqual(BAZI_INTERPRETATION_RULE_PROFILE);
    expect(result.strength.band).toBe("very_weak");
    expect(result.strength.directSummary).toMatch(/日主甲木很弱（候选）/);
    expect(result.strength.demandWeight).toBeGreaterThan(result.strength.supportWeight);
    expect(result.strength.factors).toContainEqual(expect.objectContaining({
      id: "month-command:酉:辛",
      group: "month_command",
      tenGod: "正官",
      direction: "demand",
      weight: 4
    }));
    expect(weakFacts).toEqual(before);
  });

  it("can return a strong result from the opposite factor ledger", () => {
    const result = interpretBaziChart(strongFacts);

    expect(result.strength.band).toBe("very_strong");
    expect(result.strength.supportWeight).toBeGreaterThan(result.strength.demandWeight);
    expect(result.strength.factors.every((factor) => factor.weight > 0)).toBe(true);
  });

  it("links Ten Gods to pillar position and flips orientation with strength", () => {
    const weak = interpretBaziChart(weakFacts);
    const strong = interpretBaziChart(strongFacts);

    expect(weak.pillars).toHaveLength(4);
    expect(weak.pillars[0]).toMatchObject({
      position: "year",
      focusTenGod: "七杀",
      editorialId: "七杀:year",
      editorialReviewStatus: "candidate_pending_expert_review",
      orientation: "challenging",
      orientationLabel: "当前取向：需警惕"
    });
    expect(weak.pillars[0].directSummary).toMatch(/早年环境中的压力感、竞争信号与危机反应/);
    expect(strong.pillars[0]).toMatchObject({
      focusTenGod: "偏印",
      orientation: "challenging"
    });
    expect(strong.pillars[0].strengthLink).toMatch(/放大当前失衡/);
  });

  it("projects a direct balance direction while withholding overall good/bad behind four review gates", () => {
    const weak = buildTenGodOrientationReview(interpretBaziChart(weakFacts));
    const strong = buildTenGodOrientationReview(interpretBaziChart(strongFacts));

    expect(weak.profile).toEqual(BAZI_TEN_GOD_ORIENTATION_REVIEW_PROFILE);
    expect(weak.items).toHaveLength(4);
    expect(weak.items.every((item) => (
      item.reviewGates.length === 4
      && item.reviewGates.every((gate) => gate.status === "not_evaluated")
      && item.result === null
      && item.overallGoodBad === null
      && item.eventOutcome === null
      && !item.expertTruthClaimed
      && !item.scoringAllowed
    ))).toBe(true);
    expect(weak.items[0]).toMatchObject({
      position: "year",
      tenGod: "七杀",
      inheritedOrientation: "challenging",
      balanceDirection: "may_amplify_imbalance",
      balanceDirectionLabel: "平衡方向：可能增偏",
      overallGoodBad: null
    });
    expect(weak.items[0].directSummary).toMatch(/官杀压力侧.*更可能放大当前偏态/);
    expect(strong.items[0]).toMatchObject({
      tenGod: "偏印",
      inheritedOrientation: "challenging",
      balanceDirection: "may_amplify_imbalance"
    });
    expect(weak.items[0].reviewGates.map((gate) => gate.key)).toEqual([
      "structure_and_rescue",
      "climate_balance",
      "combination_transform",
      "luck_timing"
    ]);
    expect(weak.items[0].sourceRefIds).toContain("zpzz-review-gates");
  });

  it("projects every visible and hidden Ten God occurrence without turning counts into good/bad", () => {
    const before = structuredClone(weakFacts);
    const interpretation = interpretBaziChart(weakFacts);
    const review = buildTenGodOccurrenceReview(weakFacts, interpretation);

    expect(review.profile).toEqual(BAZI_TEN_GOD_OCCURRENCE_REVIEW_PROFILE);
    expect(review.occurrenceCount).toBe(12);
    expect(review.withheldPositions).toEqual([]);
    expect(review.pillars.map((pillar) => ({
      position: pillar.position,
      total: pillar.occurrenceCount,
      visible: pillar.visibleStemCount,
      hidden: pillar.hiddenStemCount,
      dayMasterExcluded: pillar.dayMasterStemExcluded
    }))).toEqual([
      { position: "year", total: 4, visible: 1, hidden: 3, dayMasterExcluded: false },
      { position: "month", total: 2, visible: 1, hidden: 1, dayMasterExcluded: false },
      { position: "day", total: 2, visible: 0, hidden: 2, dayMasterExcluded: true },
      { position: "hour", total: 4, visible: 1, hidden: 3, dayMasterExcluded: false }
    ]);
    const allItems = review.pillars.flatMap((pillar) => pillar.items);
    expect(new Set(allItems.map((item) => item.contentId)).size).toBe(allItems.length);
    expect(allItems.every((item) => (
      item.result === null
      && item.overallGoodBad === null
      && item.eventOutcome === null
      && item.reviewGates.length === 4
      && !item.expertTruthClaimed
      && !item.scoringAllowed
    ))).toBe(true);
    expect(allItems.every((item) => item.sourceRefIds.includes("yhzp-hidden-stems"))).toBe(true);
    expect(weakFacts).toEqual(before);
  });

  it("keeps duplicate Ten Gods as separate sourced occurrences and exposes month-command engineering weight", () => {
    const review = buildTenGodOccurrenceReview(weakFacts, interpretBaziChart(weakFacts));
    const year = review.pillars.find((pillar) => pillar.position === "year");
    const month = review.pillars.find((pillar) => pillar.position === "month");
    const day = review.pillars.find((pillar) => pillar.position === "day");

    expect(year?.items.filter((item) => item.tenGod === "七杀")).toHaveLength(2);
    expect(year?.items[0]).toMatchObject({
      source: "visible_stem",
      sourceLabel: "庚透干",
      tenGod: "七杀",
      isPrimaryDisplayFocus: true,
      strengthFactorIds: ["visible:year:庚"],
      strengthRuleWeight: 2,
      balanceDirection: "may_amplify_imbalance"
    });
    expect(year?.items[1]).toMatchObject({
      source: "hidden_stem_main",
      sourceLabel: "申藏庚（首位藏干）",
      tenGod: "七杀",
      isPrimaryDisplayFocus: false,
      strengthFactorIds: ["hidden:year:庚:0"]
    });
    expect(month?.items[1]).toMatchObject({
      source: "hidden_stem_main",
      sourceLabel: "酉藏辛（首位藏干）",
      strengthFactorIds: ["hidden:month:辛:0", "month-command:酉:辛"],
      strengthRuleWeight: 6
    });
    expect(day?.items[0]).toMatchObject({
      source: "hidden_stem_main",
      tenGod: "伤官",
      isPrimaryDisplayFocus: true
    });
    expect(day?.items.map((item) => item.tenGod)).not.toContain("日主");
    expect(day?.items[1].directSummary).toMatch(/日柱午藏己.*正财.*亲密关系中的现实投入/);
  });

  it("withholds every hour occurrence when the hour is unreliable and fails closed on mismatched hidden facts", () => {
    const withoutHour = interpretBaziChart(weakFacts, { includeHour: false });
    const review = buildTenGodOccurrenceReview(weakFacts, withoutHour);
    const hour = review.pillars.find((pillar) => pillar.position === "hour");

    expect(review.occurrenceCount).toBe(8);
    expect(review.withheldPositions).toEqual(["hour"]);
    expect(hour).toMatchObject({
      availability: "uncertain_hour",
      occurrenceCount: 0,
      items: [],
      result: null,
      overallGoodBad: null
    });

    const invalidFacts = structuredClone(weakFacts);
    invalidFacts.pillars.year.branchTenGods.pop();
    expect(() => buildTenGodOccurrenceReview(invalidFacts, interpretBaziChart(weakFacts)))
      .toThrow(/藏干与地支十神数量不一致/);
  });

  it("ships an explicit, auditable 10 × 4 Ten God editorial table", () => {
    const ids = TEN_GOD_POSITION_EDITORIAL.map((item) => `${item.tenGod}:${item.position}`);

    expect(TEN_GOD_POSITION_EDITORIAL).toHaveLength(40);
    expect(new Set(ids).size).toBe(40);
    expect(TEN_GOD_POSITION_EDITORIAL.every((item) => item.reviewStatus === "candidate_pending_expert_review")).toBe(true);
    expect(TEN_GOD_POSITION_EDITORIAL.every((item) => item.evidenceClass === "original_editorial")).toBe(true);
    expect(TEN_GOD_POSITION_EDITORIAL.every((item) => item.doesNotEstablish.includes("不能单独证明"))).toBe(true);
  });

  it("uses the day branch main Ten God instead of treating 日主 as an interpretation", () => {
    const day = interpretBaziChart(weakFacts).pillars.find((reading) => reading.position === "day");

    expect(day).toMatchObject({ focusSource: "branch_main", focusTenGod: "伤官" });
    expect(day?.directSummary).toMatch(/日柱午支主气见伤官/);
  });

  it("excludes an unreliable hour from both weights and direct interpretation", () => {
    const withHour = interpretBaziChart(weakFacts);
    const withoutHour = interpretBaziChart(weakFacts, { includeHour: false });
    const hour = withoutHour.pillars.find((reading) => reading.position === "hour");

    expect(withoutHour.strength.factors.some((factor) => factor.position === "hour")).toBe(false);
    expect(withoutHour.strength.demandWeight).toBeLessThan(withHour.strength.demandWeight);
    expect(hour).toMatchObject({ availability: "uncertain_hour", focusTenGod: null, orientation: "conditional" });
    expect(withoutHour.strength.knownGaps.join(" ")).toMatch(/时柱已从旺衰权重/);
  });

  it("keeps special-pattern and expert-review boundaries in the result", () => {
    const result = interpretBaziChart(weakFacts);

    expect(result.profile.reviewStatus).toBe("candidate_pending_expert_review");
    expect(result.strength.knownGaps.join(" ")).toMatch(/从格、专旺、化气/);
    expect(result.sourceRefs.map((source) => source.evidenceClass)).toContain("public_domain_classic");
  });
});

describe("buildStrengthSensitivityReview", () => {
  it("reproduces the current candidate and exposes month-main duplication through six non-authoritative scenarios", () => {
    const interpretation = interpretBaziChart(weakFacts);
    const before = structuredClone(interpretation);
    const review = buildStrengthSensitivityReview(interpretation);

    expect(review.profile).toEqual(BAZI_STRENGTH_SENSITIVITY_REVIEW_PROFILE);
    expect(review.scenarios).toHaveLength(6);
    expect(new Set(review.scenarios.map((scenario) => scenario.id)).size).toBe(6);
    expect(review.scenarios[0]).toMatchObject({
      id: "baseline_current_candidate",
      role: "current_candidate_baseline",
      supportWeight: interpretation.strength.supportWeight,
      demandWeight: interpretation.strength.demandWeight,
      band: interpretation.strength.band,
      agreesWithBaselineBand: true,
      agreesWithBaselineDirection: true,
      officialRuleCandidate: false
    });
    expect(review.duplicateMonthMain).toMatchObject({
      detected: true,
      monthCommandFactorId: "month-command:酉:辛",
      monthHiddenMainFactorId: "hidden:month:辛:0",
      combinedSourceWeight: 6
    });
    expect(review.scenarios.find((scenario) => scenario.id === "deduplicate_month_main")?.excludedFactorIds).toContain(
      "hidden:month:辛:0"
    );
    const equalWeight = review.scenarios.find((scenario) => scenario.id === "equal_presence_deduplicated");
    expect(equalWeight?.appliedFactors.every((factor) => factor.appliedWeight === 1)).toBe(true);
    expect(review.sourceRefIds).toEqual(["dtt-strength", "smt-position", "yhzp-hidden-stems"]);
    expect(review.knownBoundaries.join(" ")).toMatch(/工程扰动.*不对应也不冒充任何命理门派/);
    expect(review).toMatchObject({
      selectedOfficialScenarioId: null,
      expertStrengthVerdict: null,
      overallGoodBad: null,
      result: null
    });
    expect(interpretation).toEqual(before);
  });

  it("inherits the unreliable-hour boundary and fails closed on a tampered baseline or duplicate factor ID", () => {
    const interpretation = interpretBaziChart(weakFacts, { includeHour: false });
    const review = buildStrengthSensitivityReview(interpretation);

    expect(review.scenarios.every((scenario) => (
      scenario.appliedFactors.every((factor) => !factor.factorId.includes(":hour:"))
    ))).toBe(true);
    expect([
      "stable_across_engineering_scenarios",
      "band_sensitive",
      "direction_sensitive",
      "insufficient"
    ]).toContain(review.stability);

    const tamperedBaseline = structuredClone(interpretation);
    tamperedBaseline.strength.supportWeight += 1;
    expect(() => buildStrengthSensitivityReview(tamperedBaseline)).toThrow(/基线必须原样复现/);

    const duplicateFactor = structuredClone(interpretation);
    duplicateFactor.strength.factors.push(structuredClone(duplicateFactor.strength.factors[0]!));
    expect(() => buildStrengthSensitivityReview(duplicateFactor)).toThrow(/因素 ID 必须唯一/);
  });
});

describe("buildTenGodStrengthSensitivityReview", () => {
  it("propagates all six engineering scenarios to every present Ten God without selecting a winner", () => {
    const interpretation = interpretBaziChart(weakFacts);
    const strengthReview = buildStrengthSensitivityReview(interpretation);
    const interpretationBefore = structuredClone(interpretation);
    const strengthBefore = structuredClone(strengthReview);
    const review = buildTenGodStrengthSensitivityReview(interpretation, strengthReview);

    expect(review.profile).toEqual(BAZI_TEN_GOD_STRENGTH_SENSITIVITY_REVIEW_PROFILE);
    expect(review.scenarioCount).toBe(6);
    expect(review.items.length).toBe(new Set(interpretation.strength.factors.map((factor) => factor.tenGod)).size);
    expect(review.items.every((item) => (
      item.scenarios.length === 6
      && item.scenarios.every((scenario) => (
        scenario.officialRuleCandidate === false
        && scenario.overallGoodBad === null
        && scenario.factorDirection === item.factorDirection
      ))
      && item.sourceRefIds.includes("smt-ten-gods")
      && item.selectedOfficialScenarioId === null
      && item.expertOrientation === null
      && item.overallGoodBad === null
      && item.result === null
      && !item.expertTruthClaimed
      && !item.scoringAllowed
    ))).toBe(true);
    for (const item of review.items) {
      const baseline = item.scenarios.find((scenario) => scenario.scenarioId === "baseline_current_candidate");
      expect(baseline?.balanceDirection).toBe(item.baselineBalanceDirection);
      if (item.distinctBalanceDirections.length > 1) {
        expect(item).toMatchObject({
          stability: "direction_sensitive",
          effectiveBalanceDirection: "conditional"
        });
      } else if (item.distinctBalanceDirections[0] === "conditional") {
        expect(item).toMatchObject({
          stability: "insufficient",
          effectiveBalanceDirection: "conditional"
        });
      } else {
        expect(item.effectiveBalanceDirection).toBe(item.distinctBalanceDirections[0]);
      }
    }
    expect(review).toMatchObject({
      selectedOfficialScenarioId: null,
      expertOrientation: null,
      overallGoodBad: null,
      result: null
    });
    expect(interpretation).toEqual(interpretationBefore);
    expect(strengthReview).toEqual(strengthBefore);
  });

  it("downgrades a deliberately direction-sensitive engineering ledger and fails closed on a tampered scenario", () => {
    const interpretation = structuredClone(interpretBaziChart(weakFacts));
    for (const factor of interpretation.strength.factors) {
      factor.weight = factor.direction === "support" ? 10 : 1;
    }
    interpretation.strength.supportWeight = interpretation.strength.factors
      .filter((factor) => factor.direction === "support")
      .reduce((sum, factor) => sum + factor.weight, 0);
    interpretation.strength.demandWeight = interpretation.strength.factors
      .filter((factor) => factor.direction === "demand")
      .reduce((sum, factor) => sum + factor.weight, 0);
    interpretation.strength.band = classifyStrengthBand(
      interpretation.strength.supportWeight,
      interpretation.strength.demandWeight
    );
    const total = interpretation.strength.supportWeight + interpretation.strength.demandWeight;
    interpretation.strength.supportRatio = interpretation.strength.supportWeight / total;
    const strengthReview = buildStrengthSensitivityReview(interpretation);
    const review = buildTenGodStrengthSensitivityReview(interpretation, strengthReview);

    expect(strengthReview.stability).toBe("direction_sensitive");
    expect(review.sensitiveTenGodCount).toBe(review.items.length);
    expect(review.items.every((item) => (
      item.stability === "direction_sensitive"
      && item.effectiveBalanceDirection === "conditional"
      && item.baselineBalanceDirection !== "conditional"
    ))).toBe(true);

    const tampered = structuredClone(strengthReview);
    tampered.scenarios[0]!.band = "balanced";
    expect(() => buildTenGodStrengthSensitivityReview(interpretation, tampered))
      .toThrow(/场景汇总不一致/);
  });
});

describe("buildBaziFirstReadReview", () => {
  it("builds a fixed four-step first read without ranking or auto-running Shensha", () => {
    const factsBefore = structuredClone(weakFacts);
    const interpretation = interpretBaziChart(weakFacts);
    const interpretationBefore = structuredClone(interpretation);
    const review = buildBaziFirstReadReview(weakFacts, interpretation);

    expect(review.profile).toEqual(BAZI_FIRST_READ_REVIEW_PROFILE);
    expect(review.steps.map((step) => [step.order, step.id])).toEqual([
      [1, "strength_confidence"],
      [2, "pillar_ten_gods"],
      [3, "repeated_ten_gods"],
      [4, "shensha_gate"]
    ]);
    expect(new Set(review.steps.map((step) => step.contentId)).size).toBe(4);
    expect(review.steps.every((step) => (
      step.evidenceClass === "derived_read_only_navigation_projection"
      && step.reviewStatus === "candidate_pending_expert_review"
      && step.result === null
      && step.overallGoodBad === null
      && step.selectedPrimaryTheme === null
      && !step.expertTruthClaimed
      && !step.scoringAllowed
    ))).toBe(true);
    expect(review.steps[0]).toMatchObject({
      availability: "available",
      label: "甲木 · 很弱"
    });
    expect(review.steps[1]).toMatchObject({
      availability: "available",
      label: "4/4 柱可读"
    });
    expect(review.steps[1].items).toHaveLength(4);
    expect(review.steps[1].items.every((item) => /六场景|场景不足/.test(item))).toBe(true);
    expect(review.steps[2]).toMatchObject({
      availability: "available",
      label: "3 类重复 · 12 项事实"
    });
    expect(review.steps[2].items).toEqual([
      "七杀出现 2 项 · 年柱",
      "偏财出现 3 项 · 年柱、时柱",
      "正官出现 2 项 · 月柱"
    ]);
    expect(review.steps[3]).toMatchObject({
      availability: "not_requested",
      label: "默认关闭 · 待主动打开",
      result: null,
      overallGoodBad: null
    });
    expect(review).toMatchObject({
      availablePillarCount: 4,
      totalOccurrenceCount: 12,
      repeatedTenGodCount: 3,
      selectedPrimaryTheme: null,
      expertFirstReadVerdict: null,
      overallGoodBad: null,
      result: null
    });
    expect(review.directSummary).toMatch(/固定四步.*不选全盘第一主题/);
    expect(weakFacts).toEqual(factsBefore);
    expect(interpretation).toEqual(interpretationBefore);
  });

  it("keeps an unreliable hour partial and fails closed on mismatched chart facts", () => {
    const interpretation = interpretBaziChart(weakFacts, { includeHour: false });
    const review = buildBaziFirstReadReview(weakFacts, interpretation);

    expect(review).toMatchObject({
      availablePillarCount: 3,
      totalOccurrenceCount: 8
    });
    expect(review.steps[1]).toMatchObject({ availability: "partial", label: "3/4 柱可读" });
    expect(review.steps[1].items[3]).toMatch(/时辰不可靠，本柱关闭/);
    expect(review.steps[2].items.every((item) => !item.includes("时柱"))).toBe(true);
    expect(review.steps[3].availability).toBe("not_requested");

    const invalidFacts = structuredClone(weakFacts);
    invalidFacts.pillars.year.ganZhi = "甲子";
    expect(() => buildBaziFirstReadReview(invalidFacts, interpretation))
      .toThrow(/十神出现项与解释输入不一致/);
  });
});

describe("buildBaziThemeIndexReview", () => {
  it("indexes existing pillar content and the Shensha gate without ranking or outcomes", () => {
    const factsBefore = structuredClone(weakFacts);
    const interpretation = interpretBaziChart(weakFacts);
    const interpretationBefore = structuredClone(interpretation);
    const review = buildBaziThemeIndexReview(weakFacts, interpretation);

    expect(review.profile).toEqual(BAZI_THEME_INDEX_REVIEW_PROFILE);
    expect(review.profile.filterPolicy).toBe("temporary_client_side_visibility_only");
    expect(review.profile.orderingPolicy).toBe("fixed_pillar_order_not_ranked");
    expect(review.filters).toEqual(["all", "year", "month", "day", "hour", "shensha"]);
    expect(review.items.map((item) => [
      item.order,
      item.id,
      item.anchorId,
      item.availability
    ])).toEqual([
      [1, "year", "bazi-ten-god-year", "available"],
      [2, "month", "bazi-ten-god-month", "available"],
      [3, "day", "bazi-ten-god-day", "available"],
      [4, "hour", "bazi-ten-god-hour", "available"],
      [5, "shensha", "bazi-shensha-gate", "not_requested"]
    ]);
    expect(review.items.slice(0, 4).map((item) => item.occurrenceCount)).toEqual([4, 2, 2, 4]);
    expect(review.items[0].tenGods).toEqual(["七杀", "偏印", "偏财"]);
    expect(review.items[2].tenGods).toEqual(["伤官", "正财"]);
    expect(review.items[4]).toMatchObject({
      occurrenceCount: 0,
      tenGods: [],
      selectedPrimaryTheme: null,
      rank: null,
      score: null,
      overallGoodBad: null,
      result: null
    });
    expect(review.items.every((item) => (
      item.selectedPrimaryTheme === null
      && item.rank === null
      && item.score === null
      && item.overallGoodBad === null
      && item.result === null
      && !item.expertTruthClaimed
      && !item.scoringAllowed
    ))).toBe(true);
    expect(review).toMatchObject({
      availablePillarCount: 4,
      totalOccurrenceCount: 12,
      selectedPrimaryTheme: null,
      expertThemeVerdict: null,
      ranking: null,
      overallGoodBad: null,
      result: null
    });
    expect(review.directSummary).toMatch(/筛选只改变本页卡片可见性，不选全盘第一主题/);
    expect(weakFacts).toEqual(factsBefore);
    expect(interpretation).toEqual(interpretationBefore);
  });

  it("keeps an unreliable hour partial and fails closed on stale upstream projections", () => {
    const interpretation = interpretBaziChart(weakFacts, { includeHour: false });
    const review = buildBaziThemeIndexReview(weakFacts, interpretation);

    expect(review).toMatchObject({ availablePillarCount: 3, totalOccurrenceCount: 8 });
    expect(review.items[3]).toMatchObject({
      id: "hour",
      availability: "partial",
      occurrenceCount: 0,
      tenGods: []
    });
    expect(review.items[3].directSummary).toMatch(/不列出或补猜任何时柱十神出现项/);

    const staleFacts = structuredClone(weakFacts);
    staleFacts.pillars.year.ganZhi = "甲子";
    expect(() => buildBaziThemeIndexReview(staleFacts, interpretation))
      .toThrow(/十神出现项与解释输入不一致/);

    const staleOccurrence = structuredClone(buildTenGodOccurrenceReview(weakFacts, interpretation));
    staleOccurrence.pillars[0].ganZhi = "甲子";
    expect(() => buildBaziThemeIndexReview(
      weakFacts,
      interpretation,
      staleOccurrence
    )).toThrow(/主题索引与现有解释投影不一致/);

    const validInterpretation = interpretBaziChart(weakFacts);
    const validOccurrence = buildTenGodOccurrenceReview(weakFacts, validInterpretation);
    const validSensitivity = buildTenGodStrengthSensitivityReview(validInterpretation);
    const staleInterpretation = structuredClone(validInterpretation);
    staleInterpretation.pillars[0].focusTenGod = "未知十神";
    expect(() => buildBaziThemeIndexReview(
      weakFacts,
      staleInterpretation,
      validOccurrence,
      validSensitivity
    ))
      .toThrow(/无法映射到 10×4 十神位置审稿表/);
  });
});

describe("deriveShenshaResearchFacts", () => {
  it("keeps the five-rule registry disabled by default and withholds interpretation", () => {
    const result = deriveShenshaResearchFacts(weakFacts);

    expect(BAZI_SHENSHA_RULE_REGISTRY).toHaveLength(5);
    expect(BAZI_SHENSHA_RESEARCH_PROFILE.enabledByDefault).toBe(false);
    expect(BAZI_SHENSHA_RESEARCH_PROFILE.interpretationStatus).toBe("withheld_pending_expert_review");
    expect(BAZI_SHENSHA_RESEARCH_PROFILE.positionEditorialVersion).toBe(SHENSHA_POSITION_CONTENT_VERSION);
    expect(BAZI_SHENSHA_RESEARCH_PROFILE.positionEditorialCoverage).toBe("5x4_explicit_candidate");
    expect(result.hits.every((hit) => hit.interpretation === null)).toBe(true);
    expect(result.rules.every((rule) => rule.conflicts.every((variant) => variant.status === "disabled_missing_approved_source_and_expert_review"))).toBe(true);
  });

  it("ships an explicit 5 × 4 Shensha position editorial table without individual outcomes", () => {
    const keys = SHENSHA_POSITION_EDITORIAL.map((item) => `${item.ruleId}:${item.position}`);

    expect(SHENSHA_POSITION_EDITORIAL).toHaveLength(20);
    expect(new Set(keys).size).toBe(20);
    expect(new Set(SHENSHA_POSITION_EDITORIAL.map((item) => item.contentId)).size).toBe(20);
    expect(SHENSHA_POSITION_EDITORIAL.every(
      (item) => item.reviewStatus === "candidate_pending_expert_review"
    )).toBe(true);
    expect(SHENSHA_POSITION_EDITORIAL.every((item) => item.evidenceClass === "original_editorial")).toBe(true);
    expect(SHENSHA_POSITION_EDITORIAL.every((item) => item.sourceRefIds.length === 2)).toBe(true);
    expect(SHENSHA_POSITION_EDITORIAL.every((item) => (
      item.result === null && !item.expertTruthClaimed && !item.directOutcomeAllowed && !item.scoringAllowed
    ))).toBe(true);
    expect(SHENSHA_POSITION_EDITORIAL.every(
      (item) => item.doesNotEstablish.includes("不能单独证明")
    )).toBe(true);

    const xianchiDay = SHENSHA_POSITION_EDITORIAL.find(
      (item) => item.ruleId === "xianchi" && item.position === "day"
    );
    expect(xianchiDay?.directSummary).toMatch(/同意边界/);
    expect(xianchiDay?.reviewPrompt).toMatch(/不预测婚恋次数、忠诚度、怀孕或性行为/);
  });

  it("derives only source-transcribed year-basis hit facts without mutating chart facts", () => {
    const before = structuredClone(weakFacts);
    const result = deriveShenshaResearchFacts(weakFacts);

    expect(result.hits).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: "huagai",
        basis: "year_branch",
        basisValue: "申",
        targetBranches: ["辰"],
        positions: ["hour"],
        positionEditorialCandidates: [expect.objectContaining({
          contentId: "hakimi.shensha.position.huagai.hour.candidate.v0_1",
          result: null
        })]
      }),
      expect.objectContaining({
        ruleId: "xianchi",
        basis: "year_branch",
        basisValue: "申",
        targetBranches: ["酉"],
        positions: ["month"],
        positionEditorialCandidates: [expect.objectContaining({
          contentId: "hakimi.shensha.position.xianchi.month.candidate.v0_1",
          result: null
        })]
      })
    ]));
    expect(result.hits.some((hit) => hit.ruleId === "yima")).toBe(false);
    expect(weakFacts).toEqual(before);
  });

  it("separates the rule's candidate branches from the branches actually present in the chart", () => {
    const facts = structuredClone(weakFacts);
    facts.pillars.year.stem = "乙";
    facts.pillars.year.branch = "亥";
    facts.pillars.month.branch = "申";
    facts.pillars.day.branch = "巳";
    const tianyi = deriveShenshaResearchFacts(facts).hits.find((hit) => hit.ruleId === "tianyi-guiren");

    expect(tianyi).toMatchObject({
      targetBranches: ["子", "申"],
      matchedBranches: ["申"],
      positions: ["month"]
    });
    expect(tianyi?.factSummary).toBe("以年干乙取子、申；本盘在月柱见申。");
  });

  it("fails closed for an unreliable hour and removes hour-only hits", () => {
    const result = deriveShenshaResearchFacts(weakFacts, { includeHour: false });

    expect(result.excludedPositions).toEqual(["hour"]);
    expect(result.hits.some((hit) => hit.positions.includes("hour"))).toBe(false);
    expect(result.hits.some((hit) => hit.ruleId === "huagai")).toBe(false);
    expect(result.knownGaps.join(" ")).toMatch(/时柱已从神煞候选命中位置中排除/);
  });
});

describe("buildShenshaOccurrenceReview", () => {
  it("re-groups every registered hit occurrence by pillar without producing outcomes", () => {
    const beforeFacts = structuredClone(weakFacts);
    const shensha = deriveShenshaResearchFacts(weakFacts);
    const beforeShensha = structuredClone(shensha);
    const result = buildShenshaOccurrenceReview(weakFacts, shensha);

    expect(result.profile).toEqual(BAZI_SHENSHA_OCCURRENCE_REVIEW_PROFILE);
    expect(result.profile.formalLayerActivated).toBe(false);
    expect(result.occurrenceCount).toBe(2);
    expect(result.pillars.map((pillarReview) => ({
      position: pillarReview.position,
      count: pillarReview.occurrenceCount,
      availability: pillarReview.availability
    }))).toEqual([
      { position: "year", count: 0, availability: "available" },
      { position: "month", count: 1, availability: "available" },
      { position: "day", count: 0, availability: "available" },
      { position: "hour", count: 1, availability: "available" }
    ]);
    const items = result.pillars.flatMap((pillarReview) => pillarReview.items);
    expect(items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: "xianchi",
        position: "month",
        matchedBranch: "酉",
        editorialId: "hakimi.shensha.position.xianchi.month.candidate.v0_1"
      }),
      expect.objectContaining({
        ruleId: "huagai",
        position: "hour",
        matchedBranch: "辰",
        editorialId: "hakimi.shensha.position.huagai.hour.candidate.v0_1"
      })
    ]));
    expect(items.every((item) => (
      item.interpretation === null
      && item.shenshaOrientation === null
      && item.overallGoodBad === null
      && item.eventOutcome === null
      && item.result === null
      && !item.expertTruthClaimed
      && !item.scoringAllowed
    ))).toBe(true);
    expect(weakFacts).toEqual(beforeFacts);
    expect(shensha).toEqual(beforeShensha);
  });

  it("preserves the same Shensha as separate occurrences when it hits two pillars", () => {
    const facts = structuredClone(weakFacts);
    facts.pillars.month.branch = "酉";
    facts.pillars.month.ganZhi = `${facts.pillars.month.stem}酉`;
    facts.pillars.day.branch = "酉";
    facts.pillars.day.ganZhi = `${facts.pillars.day.stem}酉`;
    const result = buildShenshaOccurrenceReview(facts, deriveShenshaResearchFacts(facts));
    const xianchi = result.pillars
      .flatMap((pillarReview) => pillarReview.items)
      .filter((item) => item.ruleId === "xianchi");

    expect(xianchi).toHaveLength(2);
    expect(xianchi.map((item) => item.position)).toEqual(["month", "day"]);
    expect(new Set(xianchi.map((item) => item.contentId)).size).toBe(2);
    expect(xianchi.every((item) => item.matchedBranch === "酉")).toBe(true);
  });

  it("withholds the hour pillar when the source research result excluded it", () => {
    const shensha = deriveShenshaResearchFacts(weakFacts, { includeHour: false });
    const result = buildShenshaOccurrenceReview(weakFacts, shensha);
    const hour = result.pillars.find((pillarReview) => pillarReview.position === "hour");

    expect(result.withheldPositions).toEqual(["hour"]);
    expect(hour).toMatchObject({
      availability: "uncertain_hour",
      occurrenceCount: 0,
      items: [],
      result: null,
      overallGoodBad: null
    });
    expect(result.pillars.flatMap((pillarReview) => pillarReview.items)).toHaveLength(1);
  });

  it("fails closed when the chart branches no longer match the supplied hit facts", () => {
    const shensha = deriveShenshaResearchFacts(weakFacts);
    const changedFacts = structuredClone(weakFacts);
    changedFacts.pillars.month.branch = "子";
    changedFacts.pillars.month.ganZhi = `${changedFacts.pillars.month.stem}子`;

    expect(() => buildShenshaOccurrenceReview(changedFacts, shensha)).toThrow(
      /实际命中支与命中位置不一致/
    );
  });

  it("fails closed when a supplied hit tries to replace the registered source boundary", () => {
    const shensha = structuredClone(deriveShenshaResearchFacts(weakFacts));
    shensha.hits[0].sourceLocator = "被改写的来源定位";

    expect(() => buildShenshaOccurrenceReview(weakFacts, shensha)).toThrow(
      /命中事实与当前规则注册表不一致/
    );
  });
});

describe("buildBaziPositionSynthesisReview", () => {
  it("joins same-pillar candidates while keeping the Ten God direction separate from Shensha and overall results", () => {
    const before = structuredClone(weakFacts);
    const interpretation = interpretBaziChart(weakFacts);
    const shensha = deriveShenshaResearchFacts(weakFacts);
    const result = buildBaziPositionSynthesisReview(interpretation, shensha);

    expect(result.profile).toEqual(BAZI_POSITION_SYNTHESIS_REVIEW_PROFILE);
    expect(result.profile.enabledByDefault).toBe(false);
    expect(result.items).toHaveLength(2);
    expect(new Set(result.items.map((item) => item.contentId)).size).toBe(2);
    expect(result.items.every((item) => (
      item.result === null
      && item.overallOrientation === null
      && item.shenshaOrientation === null
      && !item.expertTruthClaimed
      && !item.directOutcomeAllowed
      && !item.scoringAllowed
    ))).toBe(true);

    const xianchiMonth = result.items.find(
      (item) => item.shenshaRuleId === "xianchi" && item.position === "month"
    );
    expect(xianchiMonth).toMatchObject({
      tenGod: "正官",
      tenGodEditorialId: "正官:month",
      tenGodOrientation: "challenging",
      tenGodOrientationLabel: "当前取向：需警惕",
      tenGodBalanceDirection: "may_amplify_imbalance",
      tenGodBalanceDirectionLabel: "平衡方向：可能增偏",
      tenGodOverallGoodBad: null,
      shenshaPositionEditorialId: "hakimi.shensha.position.xianchi.month.candidate.v0_1",
      evidenceClass: "derived_read_only_projection",
      reviewStatus: "candidate_pending_expert_review",
      result: null,
      shenshaOrientation: null,
      overallOrientation: null
    });
    expect(xianchiMonth?.directSummary).toMatch(/只来自十神.*咸池（桃花）不参与这个标签.*综合喜忌.*null/);
    expect(xianchiMonth?.reviewQuestions).toHaveLength(3);
    expect(xianchiMonth?.sourceRefIds).toEqual(expect.arrayContaining([
      "smt-ten-gods",
      "smt-shensha-volume-2",
      "hakimi-shensha-position-editorial-v0.5"
    ]));
    expect(result.knownGaps.join(" ")).toMatch(/不转移为十神综合喜忌、神煞或同柱综合吉凶/);
    expect(weakFacts).toEqual(before);
  });

  it("fails closed when interpretation and Shensha disagree about hour reliability", () => {
    const interpretationWithoutHour = interpretBaziChart(weakFacts, { includeHour: false });
    const shenshaWithHour = deriveShenshaResearchFacts(weakFacts);

    expect(() => buildBaziPositionSynthesisReview(
      interpretationWithoutHour,
      shenshaWithHour
    )).toThrow(/可靠性与神煞命中不一致/);

    const shenshaWithoutHour = deriveShenshaResearchFacts(weakFacts, { includeHour: false });
    const result = buildBaziPositionSynthesisReview(
      interpretationWithoutHour,
      shenshaWithoutHour
    );
    expect(result.items).toHaveLength(1);
    expect(result.items.every((item) => item.position !== "hour")).toBe(true);
  });
});

describe("buildBaziContentReviewQueue", () => {
  it("publishes a deterministic 69-item review catalog with every decision still unresolved", () => {
    const queue = buildBaziContentReviewQueue();

    expect(queue).toEqual(BAZI_CONTENT_REVIEW_QUEUE);
    expect(queue.profile).toEqual(BAZI_CONTENT_REVIEW_QUEUE_PROFILE);
    expect(queue.profile.allowedDecisions).toEqual(["unresolved", "approve", "revise", "reject"]);
    expect(queue.profile.formalActivationAllowed).toBe(false);
    expect(queue.profile.expertTruthClaimed).toBe(false);
    expect(queue.counts).toEqual({ total: 69, unresolved: 69, approve: 0, revise: 0, reject: 0 });
    expect(queue.groups.map((group) => [group.category, group.itemCount, group.unresolvedCount])).toEqual([
      ["strength_method", 4, 4],
      ["ten_god_position", 40, 40],
      ["shensha_rule", 5, 5],
      ["shensha_position", 20, 20]
    ]);
    expect(queue.items.map((item) => item.order)).toEqual(Array.from({ length: 69 }, (_, index) => index + 1));
    expect(new Set(queue.items.map((item) => item.reviewItemId)).size).toBe(69);
    expect(queue.items.every((item) => (
      item.decision === "unresolved"
      && item.decisionReason === null
      && item.revisionRequest === null
      && item.reviewer === null
      && item.reviewedAt === null
      && item.result === null
      && !item.expertTruthClaimed
      && !item.formalActivationAllowed
    ))).toBe(true);
    expect(queue.items[0]).toMatchObject({
      reviewItemId: "strength_method:month-command-hidden-stem-duplication",
      title: "月令主气与首位藏干重复计权"
    });
    expect(queue.items[4]).toMatchObject({
      reviewItemId: "ten_god_position:比肩:year",
      title: "比肩落年柱"
    });
    expect(queue.items[43]).toMatchObject({
      reviewItemId: "ten_god_position:偏印:hour",
      title: "偏印落时柱"
    });
    expect(queue.items[44]).toMatchObject({
      reviewItemId: "shensha_rule:jiangxing",
      title: "将星取法"
    });
    expect(queue.items.at(-1)).toMatchObject({
      reviewItemId: "shensha_position:hakimi.shensha.position.tianyi-guiren.hour.candidate.v0_1",
      title: "天乙贵人落时柱"
    });
    expect(queue.sources.find((source) => source.id === "dtt-strength")?.url).toContain("ctext.org");
    expect(queue.sources.find((source) => source.id === "smt-shensha-volume-3")?.url).toContain("wikisource.org");

    const serialized = serializeBaziContentReviewQueue(queue);
    expect(serialized.endsWith("\n")).toBe(true);
    expect(serialized).not.toContain("generatedAt");
    expect(JSON.parse(serialized)).toMatchObject({
      profile: { projectionVersion: "hakimi.bazi.content_review_queue/0.1.0" },
      counts: { total: 69, unresolved: 69 }
    });
    expect(BAZI_CONTENT_REVIEW_EXPORT_FILENAME).toBe("hakimi-bazi-content-review-queue-v017.json");
  });

  it("fails closed when coverage, sources, upstream boundaries, or decision nulls are tampered", () => {
    const missingTenGod = [...TEN_GOD_POSITION_EDITORIAL];
    missingTenGod.pop();
    expect(() => buildBaziContentReviewQueue({ tenGodPositionEditorial: missingTenGod })).toThrow(
      /必须恰有 40 项/
    );

    const tamperedShensha = structuredClone(SHENSHA_POSITION_EDITORIAL) as unknown as Array<
      Omit<ShenshaPositionEditorialEntry, "result"> & { result: string | null }
    >;
    tamperedShensha[0].result = "伪造结论";
    expect(() => buildBaziContentReviewQueue({
      shenshaPositionEditorial: tamperedShensha as unknown as typeof SHENSHA_POSITION_EDITORIAL
    })).toThrow(/越过候选边界/);

    const missingSourceQueue = buildBaziContentReviewQueue();
    expect(() => buildBaziContentReviewQueue({
      sources: missingSourceQueue.sources.filter((source) => source.id !== "hakimi-editorial")
    })).toThrow(/来源无法解析/);

    const decided = {
      ...BAZI_CONTENT_REVIEW_QUEUE,
      items: BAZI_CONTENT_REVIEW_QUEUE.items.map((item, index) => (
        index === 0 ? { ...item, decision: "approve" as const } : item
      ))
    };
    expect(() => serializeBaziContentReviewQueue(
      decided as unknown as typeof BAZI_CONTENT_REVIEW_QUEUE
    )).toThrow(/越过未裁决边界/);
  });
});
