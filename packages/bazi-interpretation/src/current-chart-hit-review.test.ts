import { describe, expect, it } from "vitest";
import type { ChartFacts, PillarFact } from "@hakimi/contracts";
import { sha256Hex } from "@hakimi/integrity";
import {
  BAZI_CURRENT_CHART_HIT_REVIEW_FILENAME,
  BAZI_CURRENT_CHART_HIT_REVIEW_PROFILE,
  BAZI_STRENGTH_POLICY,
  buildShenshaOccurrenceReview,
  buildStrengthSensitivityReview,
  buildTenGodOccurrenceReview,
  createBaziCurrentChartHitReviewTemplate,
  deriveShenshaResearchFacts,
  interpretBaziChart,
  preflightBaziCurrentChartHitReview,
  serializeBaziCurrentChartHitReview,
  type BuildBaziCurrentChartHitReviewInput
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

function chartFacts(pillars: ChartFacts["pillars"]): ChartFacts {
  return {
    schemaVersion: "1.0.0",
    calendar: {
      solarText: "禁止进入复核包的测试公历",
      lunarText: "禁止进入复核包的测试农历",
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

function buildInput(facts: ChartFacts = weakFacts, includeHour = true): BuildBaziCurrentChartHitReviewInput {
  const interpretation = interpretBaziChart(facts, { includeHour });
  const strengthSensitivity = buildStrengthSensitivityReview(interpretation);
  const tenGodOccurrences = buildTenGodOccurrenceReview(facts, interpretation);
  const shensha = deriveShenshaResearchFacts(facts, { includeHour });
  const shenshaOccurrences = buildShenshaOccurrenceReview(facts, shensha);
  return {
    facts,
    includeHour,
    interpretation,
    strengthSensitivity,
    tenGodOccurrences,
    shensha,
    shenshaOccurrences,
    shenshaGate: "explicit_research_preview_included"
  };
}

type EditableEnvelope = ReturnType<typeof JSON.parse>;

function attributeReviewer(envelope: EditableEnvelope): void {
  Object.assign(envelope.reviewer, {
    reviewerId: "reviewer-current-chart-001",
    displayName: "当前盘示例审稿人",
    affiliation: "独立研究",
    expertiseStatement: "说明所用传统与经验范围；现实身份和资质仍需线下核验。"
  });
  Object.assign(envelope.reviewSession, {
    reviewedAt: "2026-08-13T15:30:00+08:00",
    methodology: "逐项核对本盘命中、政策因素、成立条件与反例。"
  });
}

function resolveDecision(decision: EditableEnvelope, value: "approve" | "revise" | "reject" = "approve"): void {
  Object.assign(decision, {
    decision: value,
    orientationProposal: "mixed_conditional",
    selectedTradition: "子平旺衰研究候选",
    decisionReason: "该意见只适用于当前候选快照，不继承为全局规则。",
    applicabilityConditions: "须同时核对月令、透藏、全局组合与未知结构门。",
    counterexamples: "从格、专旺、化气或合化成立时需要重新评估。",
    revisionRequest: value === "revise" ? "请收紧适用条件并补充边界案例。" : ""
  });
}

describe("Bazi current-chart hit review v0.18", () => {
  it("builds a deterministic current-chart-only packet with 4 method, 12 Ten God and 2 Shensha occurrence items", async () => {
    const input = buildInput();
    const before = structuredClone(input);
    const first = await createBaziCurrentChartHitReviewTemplate(input);
    const second = await createBaziCurrentChartHitReviewTemplate(input);
    const serialized = serializeBaziCurrentChartHitReview(first);

    expect(first).toEqual(second);
    expect(first.profile).toBe(BAZI_CURRENT_CHART_HIT_REVIEW_PROFILE);
    expect(first.packet.counts).toEqual({
      strengthMethod: 4,
      tenGodOccurrences: 12,
      shenshaOccurrences: 2,
      total: 18
    });
    expect(first.packet.items.map((item) => item.order)).toEqual(Array.from({ length: 18 }, (_, index) => index + 1));
    expect(new Set(first.packet.items.map((item) => item.reviewItemId)).size).toBe(18);
    expect(first.packet.bindings).toMatchObject({
      digestAlgorithm: "sha256-canonical-json-v1",
      catalogVersion: "0.17.0",
      strengthPolicyVersion: "hakimi.bazi.strength_policy/0.1.0",
      strengthEvidenceNarrativeProjectionVersion: "hakimi.bazi.strength_evidence_narrative/0.1.0",
      strengthClaimRegistryVersion: "hakimi.bazi.strength_claim_registry/0.1.0"
    });
    expect(first.packet.strengthSnapshot.evidenceNarrative.bindings).toMatchObject({
      factsProjectionSha256: first.packet.bindings.factsProjectionSha256,
      strengthPolicySha256: first.packet.bindings.strengthPolicySha256,
      strengthAssessmentSha256: first.packet.bindings.strengthAssessmentSha256,
      strengthSensitivitySha256: first.packet.bindings.strengthSensitivitySha256,
      claimRegistrySha256: first.packet.bindings.strengthClaimRegistrySha256,
      orderedEvidenceItemIdsSha256: first.packet.bindings.orderedStrengthEvidenceItemIdsSha256,
      orderedNarrativeStatementIdsSha256: first.packet.bindings.orderedStrengthNarrativeStatementIdsSha256
    });
    const digests = Object.values(first.packet.bindings)
      .filter((value): value is string => typeof value === "string" && value.length === 64);
    expect(digests.every((digest) => /^[a-f0-9]{64}$/u.test(digest))).toBe(true);
    expect(first.packetSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(first.declaredCounts).toEqual({ total: 18, unresolved: 18, approve: 0, revise: 0, reject: 0 });
    expect(first.decisions.every((decision) => (
      decision.decision === "unresolved"
      && decision.orientationProposal === "unresolved"
      && decision.goodBadOrientation === null
      && decision.eventOutcome === null
      && decision.result === null
    ))).toBe(true);
    expect(serialized.endsWith("\n")).toBe(true);
    expect(new TextEncoder().encode(serialized).byteLength).toBeLessThan(2 * 1024 * 1024);
    expect(serialized).not.toContain("禁止进入复核包的测试公历");
    expect(serialized).not.toContain("禁止进入复核包的测试农历");
    expect(serialized).not.toMatch(/"(?:caseId|revisionId|input|manifest|location|latitude|longitude|calculatedAt)"/u);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.packet.items)).toBe(true);
    expect(input).toEqual(before);
    expect(BAZI_CURRENT_CHART_HIT_REVIEW_FILENAME).toBe("hakimi-bazi-current-chart-hit-review-v018.json");
  });

  it("binds the exact 4/2/2/1 policy and keeps the month first hidden stem plus month command at weight 6", async () => {
    const template = await createBaziCurrentChartHitReviewTemplate(buildInput());
    expect(template.packet.strengthPolicy).toEqual(BAZI_STRENGTH_POLICY);
    expect(template.packet.strengthPolicy.factorWeights).toEqual({
      monthCommand: 4,
      visibleStem: 2,
      firstHiddenStem: 2,
      otherHiddenStem: 1
    });
    const monthOccurrence = template.packet.items.find((item) => (
      item.category === "ten_god_occurrence"
      && item.candidateSnapshot.position === "month"
      && item.candidateSnapshot.source === "hidden_stem_main"
    ));
    expect(monthOccurrence?.candidateSnapshot).toMatchObject({
      strengthFactorIds: ["hidden:month:辛:0", "month-command:酉:辛"],
      strengthRuleWeight: 6
    });
  });

  it("accepts one attributed conditional decision while every activation and outcome boundary remains closed", async () => {
    const current = await createBaziCurrentChartHitReviewTemplate(buildInput());
    const editable = JSON.parse(serializeBaziCurrentChartHitReview(current)) as EditableEnvelope;
    attributeReviewer(editable);
    resolveDecision(editable.decisions[0]);
    Object.assign(editable.declaredCounts, { total: 18, unresolved: 17, approve: 1, revise: 0, reject: 0 });

    const result = await preflightBaziCurrentChartHitReview(
      `${JSON.stringify(editable, null, 2)}\n`,
      current
    );
    expect(result).toMatchObject({
      resolvedCount: 1,
      unresolvedCount: 17,
      reviewerAttributionComplete: true,
      currentChartBound: true,
      identityVerified: false,
      digitalSignatureVerified: false,
      expertTruthClaimed: false,
      scientificValidityClaimed: false,
      eligibleForFormalActivation: false,
      autoIntegrationAllowed: false,
      catalogDecisionInheritanceApplied: false,
      networkTransmissionPerformed: false,
      chartOrStorageMutationPerformed: false,
      goodBadOrientation: null,
      eventOutcome: null,
      result: null
    });
  });

  it("keeps all-approved feedback isolated from the global catalog and formal activation", async () => {
    const current = await createBaziCurrentChartHitReviewTemplate(buildInput());
    const editable = JSON.parse(serializeBaziCurrentChartHitReview(current)) as EditableEnvelope;
    attributeReviewer(editable);
    editable.decisions.forEach((decision: EditableEnvelope) => resolveDecision(decision));
    Object.assign(editable.declaredCounts, { total: 18, unresolved: 0, approve: 18, revise: 0, reject: 0 });

    const result = await preflightBaziCurrentChartHitReview(JSON.stringify(editable), current);
    expect(result.allItemsResolved).toBe(true);
    expect(result.catalogDecisionInheritanceApplied).toBe(false);
    expect(result.eligibleForFormalActivation).toBe(false);
    expect(result.result).toBeNull();
  });

  it("rejects packet tampering even if an attacker recomputes its packet hash", async () => {
    const current = await createBaziCurrentChartHitReviewTemplate(buildInput());
    const editable = JSON.parse(serializeBaziCurrentChartHitReview(current)) as EditableEnvelope;
    editable.packet.items[4].candidateSnapshot.directSummary = "伪造的当前盘结论";
    editable.packetSha256 = await sha256Hex({
      domain: "hakimi.bazi.current-chart-hit-packet.v2",
      value: editable.packet
    });
    await expect(preflightBaziCurrentChartHitReview(JSON.stringify(editable), current))
      .rejects.toThrow(/没有绑定当前内存命盘|候选快照已被改写/u);
  });

  it("rejects cross-chart, policy, ordering, count, unknown-key, unsafe URL and unattributed feedback changes", async () => {
    const current = await createBaziCurrentChartHitReviewTemplate(buildInput());
    const otherFacts = structuredClone(weakFacts);
    otherFacts.pillars.hour = pillar({ name: "hour", label: "时柱", ganZhi: "己巳", stem: "己", branch: "巳", hiddenStems: ["丙", "戊", "庚"], stemTenGod: "正财", branchTenGods: ["食神", "偏财", "七杀"], wuXing: "土火" });
    const other = await createBaziCurrentChartHitReviewTemplate(buildInput(otherFacts));
    await expect(preflightBaziCurrentChartHitReview(serializeBaziCurrentChartHitReview(current), other))
      .rejects.toThrow(/没有绑定当前内存命盘/u);

    const cases: Array<[string, (editable: EditableEnvelope) => void, RegExp]> = [
      ["policy", (editable) => { editable.packet.strengthPolicy.factorWeights.firstHiddenStem = 1; }, /没有绑定/u],
      ["order", (editable) => { editable.decisions.reverse(); }, /顺序或 ID/u],
      ["count", (editable) => { editable.declaredCounts.unresolved -= 1; }, /declaredCounts/u],
      ["extra key", (editable) => { editable.unexpected = true; }, /字段集合/u],
      ["unattributed", (editable) => { resolveDecision(editable.decisions[0]); }, /必须提供 reviewerId/u]
    ];
    for (const [, mutate, pattern] of cases) {
      const editable = JSON.parse(serializeBaziCurrentChartHitReview(current)) as EditableEnvelope;
      mutate(editable);
      await expect(preflightBaziCurrentChartHitReview(JSON.stringify(editable), current)).rejects.toThrow(pattern);
    }

    const unsafe = JSON.parse(serializeBaziCurrentChartHitReview(current)) as EditableEnvelope;
    attributeReviewer(unsafe);
    resolveDecision(unsafe.decisions[0]);
    unsafe.decisions[0].additionalSourceUrls = ["https://user:secret@example.com/source"];
    Object.assign(unsafe.declaredCounts, { total: 18, unresolved: 17, approve: 1, revise: 0, reject: 0 });
    await expect(preflightBaziCurrentChartHitReview(JSON.stringify(unsafe), current))
      .rejects.toThrow(/无凭据 HTTPS/u);
  });

  it("excludes every hour fact and occurrence when the hour is unreliable", async () => {
    const template = await createBaziCurrentChartHitReviewTemplate(buildInput(weakFacts, false));
    const serialized = serializeBaziCurrentChartHitReview(template);
    expect(template.packet.executionScope).toEqual({
      includeHour: false,
      activePositions: ["year", "month", "day"],
      withheldPositions: ["hour"],
      shenshaGate: "explicit_research_preview_included"
    });
    expect(template.packet.counts).toEqual({
      strengthMethod: 4,
      tenGodOccurrences: 8,
      shenshaOccurrences: 1,
      total: 13
    });
    expect(template.packet.items.every((item) => (
      item.category === "strength_method" || item.candidateSnapshot.position !== "hour"
    ))).toBe(true);
    expect(serialized).not.toContain("戊辰");
  });

  it("fails closed when derived projections or policy weights no longer match the supplied facts", async () => {
    const badWeight = buildInput();
    const changedInterpretation = structuredClone(badWeight.interpretation);
    changedInterpretation.strength.factors[0].weight = 9;
    badWeight.interpretation = changedInterpretation;
    await expect(createBaziCurrentChartHitReviewTemplate(badWeight)).rejects.toThrow(/权重偏离当前政策/u);

    const staleOccurrences = buildInput();
    const changedOccurrences = structuredClone(staleOccurrences.tenGodOccurrences);
    changedOccurrences.pillars[0].items[0].directSummary = "过期快照";
    staleOccurrences.tenGodOccurrences = changedOccurrences;
    await expect(createBaziCurrentChartHitReviewTemplate(staleOccurrences))
      .rejects.toThrow(/不是由当前事实与解释重新派生/u);
  });
});
