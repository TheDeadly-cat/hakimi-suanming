import { describe, expect, it } from "vitest";
import type { ChartFacts, PillarFact } from "@hakimi/contracts";
import {
  BAZI_STRENGTH_CLAIM_REGISTRY,
  BAZI_STRENGTH_EVIDENCE_NARRATIVE_PROFILE,
  buildBaziStrengthEvidenceNarrative,
  buildBaziStrengthSharedSnapshot,
  buildStrengthSensitivityReview,
  interpretBaziChart,
  validateBaziStrengthClaimRegistry,
  validateBaziStrengthEvidenceNarrative,
  type BaziStrengthClaimRegistry
} from "./index";

function pillar(
  input: Pick<
    PillarFact,
    "name" | "label" | "ganZhi" | "stem" | "branch" | "hiddenStems" | "stemTenGod" | "branchTenGods" | "wuXing"
  >
): PillarFact {
  return {
    ...input,
    nayin: "测试纳音",
    twelveGrowth: "测试长生",
    xun: "甲子",
    voidBranches: "戌亥"
  };
}

const facts: ChartFacts = {
  schemaVersion: "1.0.0",
  calendar: {
    solarText: "禁止进入证据叙事的测试公历",
    lunarText: "禁止进入证据叙事的测试农历",
    lunarYear: 2000,
    lunarMonth: 1,
    lunarDay: 1,
    isLeapMonth: false,
    previousJie: null,
    nextJie: null
  },
  pillars: {
    year: pillar({ name: "year", label: "年柱", ganZhi: "庚申", stem: "庚", branch: "申", hiddenStems: ["庚", "壬", "戊"], stemTenGod: "七杀", branchTenGods: ["七杀", "偏印", "偏财"], wuXing: "金金" }),
    month: pillar({ name: "month", label: "月柱", ganZhi: "辛酉", stem: "辛", branch: "酉", hiddenStems: ["辛"], stemTenGod: "正官", branchTenGods: ["正官"], wuXing: "金金" }),
    day: pillar({ name: "day", label: "日柱", ganZhi: "甲午", stem: "甲", branch: "午", hiddenStems: ["丁", "己"], stemTenGod: "日主", branchTenGods: ["伤官", "正财"], wuXing: "木火" }),
    hour: pillar({ name: "hour", label: "时柱", ganZhi: "戊辰", stem: "戊", branch: "辰", hiddenStems: ["戊", "乙", "癸"], stemTenGod: "偏财", branchTenGods: ["偏财", "劫财", "正印"], wuXing: "土土" })
  },
  fieldProvenance: []
};

function input(includeHour = true) {
  const interpretation = interpretBaziChart(facts, { includeHour });
  return {
    facts,
    includeHour,
    interpretation,
    strengthSensitivity: buildStrengthSensitivityReview(interpretation)
  };
}

describe("Bazi strength evidence narrative v0.18", () => {
  it("builds a deterministic source-bound ledger in the frozen semantic order", async () => {
    const firstInput = input();
    const before = structuredClone(firstInput);
    const first = await buildBaziStrengthEvidenceNarrative(firstInput);
    const second = await buildBaziStrengthEvidenceNarrative(firstInput);

    expect(first).toEqual(second);
    expect(first.profile).toEqual(BAZI_STRENGTH_EVIDENCE_NARRATIVE_PROFILE);
    expect(first.evidenceItems.map((item) => `${item.category}:${item.position}:${item.hiddenStemIndex ?? "none"}`)).toEqual([
      "month_command:month:none",
      "visible_stem:year:none",
      "visible_stem:month:none",
      "visible_stem:day:none",
      "visible_stem:hour:none",
      "first_hidden_stem:year:0",
      "first_hidden_stem:month:0",
      "first_hidden_stem:day:0",
      "first_hidden_stem:hour:0",
      "other_hidden_stem:year:1",
      "other_hidden_stem:year:2",
      "other_hidden_stem:day:1",
      "other_hidden_stem:hour:1",
      "other_hidden_stem:hour:2"
    ]);
    expect(first.counts).toMatchObject({
      sources: 8,
      sourceBindings: 12,
      claims: 12,
      evidenceItems: 14,
      includedFactors: 13,
      excludedDayMaster: 1,
      withheldItems: 0,
      scenarioComparisons: 6
    });
    expect(first.evidenceItems.filter((item) => item.status === "included").map((item) => item.factorId).sort())
      .toEqual(firstInput.interpretation.strength.factors.map((factor) => factor.id).sort());
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.evidenceItems)).toBe(true);
    expect(firstInput).toEqual(before);
    validateBaziStrengthEvidenceNarrative(first);
  });

  it("cross-checks independent Five Element relations, Ten God groups and contribution totals", async () => {
    const result = await buildBaziStrengthEvidenceNarrative(input());
    const included = result.evidenceItems.filter((item) => item.status === "included");
    expect(included.every((item) => item.factorElement && item.elementRelation && item.tenGodGroup)).toBe(true);
    expect(included.find((item) => item.factorId === "hidden:hour:乙:1")).toMatchObject({
      tenGod: "劫财",
      tenGodGroup: "peer",
      elementRelation: "same_element",
      direction: "support",
      policyWeight: 1,
      supportContribution: 1,
      demandContribution: 0
    });
    expect(included.reduce((sum, item) => sum + (item.supportContribution ?? 0), 0))
      .toBe(result.classification.supportWeight);
    expect(included.reduce((sum, item) => sum + (item.demandContribution ?? 0), 0))
      .toBe(result.classification.demandWeight);
  });

  it("makes month command plus month first hidden a visible 4+2 pair without claiming a traditional number", async () => {
    const result = await buildBaziStrengthEvidenceNarrative(input());
    expect(result.duplicateMonthMain).toMatchObject({
      detected: true,
      combinedPolicyWeight: 6,
      expertVerdict: null,
      result: null
    });
    const pair = result.evidenceItems.filter((item) => item.duplicateMonthMainPairId !== null);
    expect(pair.map((item) => [item.duplicateRole, item.policyWeight])).toEqual([
      ["month_command", 4],
      ["first_hidden_stem", 2]
    ]);
    expect(result.duplicateMonthMain.directStatement).toMatch(/公开待审的工程选择/u);
  });

  it("explains exact threshold intervals and every engineering perturbation that crosses a band", async () => {
    const result = await buildBaziStrengthEvidenceNarrative(input());
    expect(result.classification).toMatchObject({
      band: "very_weak",
      intervalNotation: "[0, 0.25)",
      expertVerdict: null,
      overallGoodBad: null,
      result: null
    });
    expect(result.scenarioComparisons).toHaveLength(6);
    expect(result.counts.crossingScenarios)
      .toBe(result.scenarioComparisons.filter((scenario) => scenario.crossesBand).length);
    expect(result.scenarioComparisons.every((scenario) => (
      scenario.officialRuleCandidate === false
      && scenario.expertTruthClaimed === false
      && /工程假设扰动/u.test(scenario.directStatement)
    ))).toBe(true);
  });

  it("shares the exact four snapshot digests used by the current-chart review contract", async () => {
    const current = input();
    const [narrative, shared] = await Promise.all([
      buildBaziStrengthEvidenceNarrative(current),
      buildBaziStrengthSharedSnapshot(current)
    ]);
    expect(narrative.bindings).toMatchObject(shared.bindings);
    for (const digest of [
      narrative.bindings.factsProjectionSha256,
      narrative.bindings.strengthPolicySha256,
      narrative.bindings.strengthAssessmentSha256,
      narrative.bindings.strengthSensitivitySha256,
      narrative.bindings.claimRegistrySha256,
      narrative.bindings.orderedEvidenceItemIdsSha256,
      narrative.bindings.orderedNarrativeStatementIdsSha256
    ]) expect(digest).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("withholds all hour factor values and consumes only the three reliable pillars", async () => {
    const result = await buildBaziStrengthEvidenceNarrative(input(false));
    const withheld = result.evidenceItems.filter((item) => item.status === "withheld_unreliable_hour");
    expect(result.executionScope).toEqual({
      includeHour: false,
      activePositions: ["year", "month", "day"],
      withheldPositions: ["hour"]
    });
    expect(withheld.map((item) => item.category)).toEqual([
      "visible_stem",
      "first_hidden_stem",
      "other_hidden_stem"
    ]);
    expect(withheld.every((item) => (
      item.ganZhi === null
      && item.branch === null
      && item.stem === null
      && item.tenGod === null
      && item.factorId === null
      && item.policyWeight === null
    ))).toBe(true);
    expect(JSON.stringify(result)).not.toContain("戊辰");
    expect(result.evidenceItems.some((item) => item.factorId?.includes(":hour:"))).toBe(false);
  });

  it("fails closed for malformed facts, stale assessment and altered sensitivity fields", async () => {
    const mismatchedHidden = input();
    mismatchedHidden.facts = structuredClone(facts);
    mismatchedHidden.facts.pillars.year.branchTenGods.pop();
    await expect(buildBaziStrengthEvidenceNarrative(mismatchedHidden)).rejects.toThrow(/逐项对齐/u);

    const wrongName = input();
    wrongName.facts = structuredClone(facts);
    wrongName.facts.pillars.year.name = "month";
    await expect(buildBaziStrengthEvidenceNarrative(wrongName)).rejects.toThrow(/身份与位置不一致/u);

    const stale = input();
    stale.interpretation = structuredClone(stale.interpretation);
    stale.interpretation.strength.factors[0].weight = 9;
    await expect(buildBaziStrengthEvidenceNarrative(stale)).rejects.toThrow(/完整派生/u);

    const changedSensitivity = input();
    changedSensitivity.strengthSensitivity = structuredClone(changedSensitivity.strengthSensitivity);
    changedSensitivity.strengthSensitivity.scenarios[0].bandLabel = "篡改";
    await expect(buildBaziStrengthEvidenceNarrative(changedSensitivity)).rejects.toThrow(/敏感性不是由本盘/u);
  });

  it("rejects unknown, empty or improperly promoted source-claim bindings", () => {
    const unknown = structuredClone(BAZI_STRENGTH_CLAIM_REGISTRY) as BaziStrengthClaimRegistry;
    (unknown.claims[0].sourceBindingIds as string[])[0] = "binding:missing";
    expect(() => validateBaziStrengthClaimRegistry(unknown)).toThrow(/未知来源定位/u);

    const emptyLocator = structuredClone(BAZI_STRENGTH_CLAIM_REGISTRY) as BaziStrengthClaimRegistry;
    (emptyLocator.sourceBindings[0].exactLocator as { value: string }).value = "";
    expect(() => validateBaziStrengthClaimRegistry(emptyLocator)).toThrow(/精确 locator/u);

    const promotedPending = structuredClone(BAZI_STRENGTH_CLAIM_REGISTRY) as BaziStrengthClaimRegistry;
    (promotedPending.claims[10] as { displayStatus: string }).displayStatus = "enabled_traditional_context";
    expect(() => validateBaziStrengthClaimRegistry(promotedPending)).toThrow(/待核 locator/u);

    const classicNumeric = structuredClone(BAZI_STRENGTH_CLAIM_REGISTRY) as BaziStrengthClaimRegistry;
    (classicNumeric.claims[5].sourceBindingIds as string[]).splice(0, 1, "binding:dtt:month-command");
    expect(() => validateBaziStrengthClaimRegistry(classicNumeric)).toThrow(/内部工程定义/u);
  });

  it("rejects any altered source-claim snapshot in a built narrative", async () => {
    const alteredClaim = structuredClone(await buildBaziStrengthEvidenceNarrative(input()));
    (alteredClaim.claims[0] as { candidateStatement: string }).candidateStatement = "篡改后的主张";
    expect(() => validateBaziStrengthEvidenceNarrative(alteredClaim)).toThrow(/当前注册表不一致/u);

    const alteredBoundary = structuredClone(await buildBaziStrengthEvidenceNarrative(input()));
    (alteredBoundary.sourceBindings[0].doesNotSupport as string[])[0] = "篡改后的反向边界";
    expect(() => validateBaziStrengthEvidenceNarrative(alteredBoundary)).toThrow(/当前注册表不一致/u);
  });

  it("keeps privacy and every outcome boundary closed", async () => {
    const result = await buildBaziStrengthEvidenceNarrative(input());
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("禁止进入证据叙事的测试公历");
    expect(serialized).not.toContain("禁止进入证据叙事的测试农历");
    expect(serialized).not.toMatch(/"(?:caseId|revisionId|input|manifest|location|latitude|longitude|calculatedAt)"/u);
    expect(result.evidenceItems.every((item) => (
      item.expertTruthClaimed === false
      && item.scientificValidityClaimed === false
      && item.formalActivationAllowed === false
      && item.goodBadOrientation === null
      && item.eventOutcome === null
      && item.result === null
    ))).toBe(true);
    expect(result.boundary).toEqual({
      expertTruthClaimed: false,
      scientificValidityClaimed: false,
      formalActivationAllowed: false,
      reviewDecisionInheritanceApplied: false,
      chartOrStorageMutationPerformed: false,
      networkTransmissionPerformed: false,
      overallGoodBad: null,
      usefulGod: null,
      structureVerdict: null,
      eventOutcome: null,
      result: null
    });
  });
});
