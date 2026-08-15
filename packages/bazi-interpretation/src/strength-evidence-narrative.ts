import type { ChartFacts } from "@hakimi/contracts";
import { canonicalStringify } from "@hakimi/integrity";
import type { BaziInterpretationResult } from "./index";
import {
  activeBaziStrengthPositions,
  baziSnapshotDomainDigest,
  buildBaziStrengthSharedSnapshot,
  type BaziCurrentChartReviewFactsProjection,
  type BaziStrengthSharedSnapshotBindings
} from "./current-chart-review-snapshot";
import {
  BAZI_STRENGTH_PILLAR_ORDER,
  BAZI_STRENGTH_POSITION_LABELS,
  expectedElementRelationForTenGodGroup,
  strengthElementForStem,
  strengthElementLabel,
  strengthElementRelation,
  type FiveElement,
  type PillarPosition,
  type StrengthElementRelation,
  type StrengthFactor
} from "./strength-assessment-core";
import {
  BAZI_STRENGTH_CLAIM_REGISTRY,
  validateBaziStrengthClaimRegistry,
  type BaziStrengthClaim,
  type BaziStrengthClaimSource,
  type BaziStrengthClaimSourceBinding
} from "./strength-claim-registry";
import {
  BAZI_STRENGTH_POLICY,
  strengthTenGodGroup,
  type StrengthBand,
  type StrengthFactorDirection,
  type StrengthPolicyFactorGroup,
  type TenGodGroup
} from "./strength-policy";
import type {
  StrengthSensitivityDirection,
  StrengthSensitivityReview,
  StrengthSensitivityScenarioId
} from "./strength-sensitivity-review";

export const BAZI_STRENGTH_EVIDENCE_NARRATIVE_PROFILE = Object.freeze({
  projectionVersion: "hakimi.bazi.strength_evidence_narrative/0.1.0",
  contentVersion: "0.18.0",
  calculationScope: "current_chart_strength_evidence_and_engineering_sensitivity" as const,
  orderPolicy: "month_command_then_visible_then_first_hidden_then_other_hidden" as const,
  mutationPolicy: "read_only_projection" as const,
  reviewStatus: "candidate_pending_expert_review" as const,
  expertTruthClaimed: false as const,
  scientificValidityClaimed: false as const,
  formalActivationAllowed: false as const
});

export type BaziStrengthEvidenceCategory =
  | "month_command"
  | "visible_stem"
  | "first_hidden_stem"
  | "other_hidden_stem";

export type BaziStrengthEvidenceStatus =
  | "included"
  | "excluded_day_master"
  | "withheld_unreliable_hour";

export interface BaziStrengthEvidenceItem {
  evidenceItemId: string;
  order: number;
  category: BaziStrengthEvidenceCategory;
  status: BaziStrengthEvidenceStatus;
  position: PillarPosition;
  positionLabel: string;
  ganZhi: string | null;
  branch: string | null;
  stem: string | null;
  hiddenStemIndex: number | null;
  tenGod: string | null;
  tenGodGroup: TenGodGroup | null;
  dayMasterElement: FiveElement;
  factorElement: FiveElement | null;
  elementRelation: StrengthElementRelation | null;
  factorId: string | null;
  policyFactorGroup: StrengthPolicyFactorGroup | null;
  direction: StrengthFactorDirection | null;
  policyWeight: number | null;
  supportContribution: number | null;
  demandContribution: number | null;
  duplicateMonthMainPairId: string | null;
  duplicateRole: "month_command" | "first_hidden_stem" | null;
  claimIds: readonly string[];
  directStatement: string;
  doesNotEstablish: string;
  expertTruthClaimed: false;
  scientificValidityClaimed: false;
  formalActivationAllowed: false;
  goodBadOrientation: null;
  eventOutcome: null;
  result: null;
}

export interface BaziStrengthDuplicateMonthMainProjection {
  pairId: "month-main:command-and-first-hidden";
  detected: true;
  monthCommandEvidenceItemId: string;
  firstHiddenEvidenceItemId: string;
  combinedPolicyWeight: number;
  claimIds: readonly string[];
  directStatement: string;
  expertVerdict: null;
  result: null;
}

export interface BaziStrengthClassificationProjection {
  band: StrengthBand;
  bandLabel: string;
  intervalNotation: string;
  supportWeight: number;
  demandWeight: number;
  totalWeight: number;
  supportRatio: number | null;
  claimIds: readonly string[];
  directStatement: string;
  expertVerdict: null;
  overallGoodBad: null;
  result: null;
}

export interface BaziStrengthScenarioComparison {
  scenarioId: StrengthSensitivityScenarioId;
  order: number;
  label: string;
  role: "current_candidate_baseline" | "sensitivity_only";
  baselineBand: StrengthBand;
  scenarioBand: StrengthBand;
  crossesBand: boolean;
  baselineDirection: StrengthSensitivityDirection;
  scenarioDirection: StrengthSensitivityDirection;
  crossesDirection: boolean;
  excludedFactorIds: readonly string[];
  reweightedFactorIds: readonly string[];
  evidenceItemIds: readonly string[];
  supportWeight: number;
  demandWeight: number;
  supportRatio: number | null;
  supportWeightDelta: number;
  demandWeightDelta: number;
  supportRatioDelta: number | null;
  claimIds: readonly string[];
  directStatement: string;
  officialRuleCandidate: false;
  expertTruthClaimed: false;
  result: null;
}

export interface BaziStrengthNarrativeStatement {
  statementId: string;
  order: number;
  kind: "scope" | "factor_ledger" | "month_main_duplication" | "subtotal" | "classification" | "sensitivity" | "boundary";
  text: string;
  claimIds: readonly string[];
  sourceBindingIds: readonly string[];
  evidenceItemIds: readonly string[];
  sensitivityScenarioIds: readonly StrengthSensitivityScenarioId[];
  reviewStatus: "candidate_pending_expert_review";
  expertTruthClaimed: false;
  scientificValidityClaimed: false;
  result: null;
}

export interface BaziStrengthEvidenceBindings extends BaziStrengthSharedSnapshotBindings {
  claimRegistryVersion: string;
  claimRegistrySha256: string;
  orderedEvidenceItemIdsSha256: string;
  orderedNarrativeStatementIdsSha256: string;
}

export interface BaziStrengthEvidenceNarrativeResult {
  profile: typeof BAZI_STRENGTH_EVIDENCE_NARRATIVE_PROFILE;
  executionScope: Readonly<{
    includeHour: boolean;
    activePositions: readonly PillarPosition[];
    withheldPositions: readonly PillarPosition[];
  }>;
  bindings: BaziStrengthEvidenceBindings;
  factsProjection: BaziCurrentChartReviewFactsProjection;
  dayMaster: Readonly<{ stem: string; element: FiveElement; elementLabel: string }>;
  sources: readonly BaziStrengthClaimSource[];
  sourceBindings: readonly BaziStrengthClaimSourceBinding[];
  claims: readonly BaziStrengthClaim[];
  evidenceItems: readonly BaziStrengthEvidenceItem[];
  duplicateMonthMain: BaziStrengthDuplicateMonthMainProjection;
  classification: BaziStrengthClassificationProjection;
  scenarioComparisons: readonly BaziStrengthScenarioComparison[];
  narrativeStatements: readonly BaziStrengthNarrativeStatement[];
  counts: Readonly<{
    sources: number;
    sourceBindings: number;
    claims: number;
    evidenceItems: number;
    includedFactors: number;
    excludedDayMaster: number;
    withheldItems: number;
    scenarioComparisons: number;
    crossingScenarios: number;
    narrativeStatements: number;
  }>;
  boundary: Readonly<{
    expertTruthClaimed: false;
    scientificValidityClaimed: false;
    formalActivationAllowed: false;
    reviewDecisionInheritanceApplied: false;
    chartOrStorageMutationPerformed: false;
    networkTransmissionPerformed: false;
    overallGoodBad: null;
    usefulGod: null;
    structureVerdict: null;
    eventOutcome: null;
    result: null;
  }>;
}

export interface BuildBaziStrengthEvidenceNarrativeInput {
  facts: ChartFacts;
  includeHour: boolean;
  interpretation: BaziInterpretationResult;
  strengthSensitivity: StrengthSensitivityReview;
}

const CLAIM = Object.freeze({
  dayMaster: "bazi.engineering.strength.day_master_fact_anchor.v1",
  traditionalWhole: "bazi.tradition.strength.month_command_whole_chart.v1",
  traditionalTenGod: "bazi.tradition.ten_god.relative_relations.v1",
  inclusion: "bazi.engineering.strength.factor_inclusion.v1",
  direction: "bazi.engineering.ten_god.support_demand_grouping.v1",
  weights: "bazi.engineering.strength.factor_weights_4_2_2_1.v1",
  duplication: "bazi.engineering.strength.month_main_counted_separately.v1",
  thresholds: "bazi.engineering.strength.threshold_bands.v1",
  withheldHour: "bazi.engineering.strength.unreliable_hour_withheld.v1",
  sensitivity: "bazi.engineering.strength.scenario_sensitivity.v1",
  hiddenListing: "bazi.tradition.hidden_stem.listing_candidate.v1",
  invalidation: "bazi.review_gate.structure_rescue_climate.v1"
} as const);

const RELATION_LABELS: Readonly<Record<StrengthElementRelation, string>> = Object.freeze({
  day_master_self: "日主自身",
  same_element: "与日主同类",
  generates_day_master: "生助日主",
  generated_by_day_master: "由日主所生",
  controlled_by_day_master: "受日主所克",
  controls_day_master: "克制日主"
});

const BAND_INTERVALS: Readonly<Record<StrengthBand, string>> = Object.freeze({
  very_weak: "[0, 0.25)",
  weak: "[0.25, 0.43)",
  balanced: "[0.43, 0.57]",
  strong: "(0.57, 0.75]",
  very_strong: "(0.75, 1]",
  undetermined: "总权重为 0，无比例区间"
});

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
}

function canonicalClone<T>(value: T): T {
  return JSON.parse(canonicalStringify(value)) as T;
}

function sameCanonical(left: unknown, right: unknown): boolean {
  return canonicalStringify(left) === canonicalStringify(right);
}

function baseEvidenceBoundary() {
  return {
    expertTruthClaimed: false as const,
    scientificValidityClaimed: false as const,
    formalActivationAllowed: false as const,
    goodBadOrientation: null,
    eventOutcome: null,
    result: null
  };
}

function evidenceId(category: BaziStrengthEvidenceCategory, position: PillarPosition, index: number | null = null): string {
  return index === null
    ? `strength-evidence:${category}:${position}`
    : `strength-evidence:${category}:${position}:${index}`;
}

function includedEvidenceItem(
  input: BuildBaziStrengthEvidenceNarrativeInput,
  factors: Map<string, StrengthFactor>,
  consumedFactorIds: Set<string>,
  order: number,
  category: BaziStrengthEvidenceCategory,
  position: PillarPosition,
  factorId: string,
  stem: string,
  hiddenStemIndex: number | null,
  claimIds: readonly string[],
  duplicateRole: "month_command" | "first_hidden_stem" | null
): BaziStrengthEvidenceItem {
  const factor = factors.get(factorId);
  if (!factor) throw new Error(`旺衰证据账缺少当前事实因素：${factorId}`);
  if (consumedFactorIds.has(factorId)) throw new Error(`旺衰证据账重复消费因素：${factorId}`);
  consumedFactorIds.add(factorId);
  const expectedGroup: StrengthPolicyFactorGroup = category === "month_command"
    ? "month_command"
    : category === "visible_stem"
      ? "visible_stem"
      : "hidden_stem";
  if (factor.group !== expectedGroup || factor.position !== position) {
    throw new Error(`旺衰证据因素类别或柱位错配：${factorId}`);
  }
  const tenGodGroup = strengthTenGodGroup(factor.tenGod);
  if (!tenGodGroup) throw new Error(`旺衰证据无法识别十神组：${factorId}`);
  const dayMasterElement = input.interpretation.strength.dayMaster.element;
  const factorElement = strengthElementForStem(stem);
  const relation = strengthElementRelation(dayMasterElement, factorElement);
  if (relation !== expectedElementRelationForTenGodGroup(tenGodGroup)) {
    throw new Error(`旺衰证据五行关系与十神组不一致：${factorId}`);
  }
  const pillar = input.facts.pillars[position];
  const sideLabel = factor.direction === "support" ? "支持侧" : "需求侧";
  const categoryLabel = category === "month_command"
    ? `月令 ${pillar.branch} 主气 ${stem}`
    : category === "visible_stem"
      ? `${pillar.label}${pillar.ganZhi}透干 ${stem}`
      : `${pillar.label}${pillar.branch}第 ${Number(hiddenStemIndex) + 1} 位藏干 ${stem}`;
  return deepFreeze({
    evidenceItemId: evidenceId(category, position, hiddenStemIndex),
    order,
    category,
    status: "included",
    position,
    positionLabel: pillar.label,
    ganZhi: pillar.ganZhi,
    branch: pillar.branch,
    stem,
    hiddenStemIndex,
    tenGod: factor.tenGod,
    tenGodGroup,
    dayMasterElement,
    factorElement,
    elementRelation: relation,
    factorId,
    policyFactorGroup: factor.group,
    direction: factor.direction,
    policyWeight: factor.weight,
    supportContribution: factor.direction === "support" ? factor.weight : 0,
    demandContribution: factor.direction === "demand" ? factor.weight : 0,
    duplicateMonthMainPairId: duplicateRole ? "month-main:command-and-first-hidden" : null,
    duplicateRole,
    claimIds: [...claimIds],
    directStatement: `${categoryLabel}，十神为${factor.tenGod}；五行关系为“${RELATION_LABELS[relation]}”，当前工程候选归入${sideLabel}并计权 ${factor.weight}。`,
    doesNotEstablish: "该项只复述当前盘事实与工程政策，不单独建立身强身弱真值、喜忌、吉凶或事件结果。",
    ...baseEvidenceBoundary()
  });
}

function excludedDayMasterItem(
  input: BuildBaziStrengthEvidenceNarrativeInput,
  order: number
): BaziStrengthEvidenceItem {
  const pillar = input.facts.pillars.day;
  const element = input.interpretation.strength.dayMaster.element;
  return deepFreeze({
    evidenceItemId: evidenceId("visible_stem", "day"),
    order,
    category: "visible_stem",
    status: "excluded_day_master",
    position: "day",
    positionLabel: pillar.label,
    ganZhi: pillar.ganZhi,
    branch: pillar.branch,
    stem: pillar.stem,
    hiddenStemIndex: null,
    tenGod: null,
    tenGodGroup: null,
    dayMasterElement: element,
    factorElement: element,
    elementRelation: "day_master_self",
    factorId: null,
    policyFactorGroup: null,
    direction: null,
    policyWeight: null,
    supportContribution: null,
    demandContribution: null,
    duplicateMonthMainPairId: null,
    duplicateRole: null,
    claimIds: [CLAIM.dayMaster, CLAIM.inclusion],
    directStatement: `日柱透干 ${pillar.stem} 是日主事实锚点；当前政策不把日主自身再次作为透干因素计权。`,
    doesNotEstablish: "排除重复计权不证明该纳入策略是传统标准或专家结论。",
    ...baseEvidenceBoundary()
  });
}

function withheldHourItem(
  dayMasterElement: FiveElement,
  order: number,
  category: "visible_stem" | "first_hidden_stem" | "other_hidden_stem"
): BaziStrengthEvidenceItem {
  return deepFreeze({
    evidenceItemId: evidenceId(category, "hour"),
    order,
    category,
    status: "withheld_unreliable_hour",
    position: "hour",
    positionLabel: "时柱",
    ganZhi: null,
    branch: null,
    stem: null,
    hiddenStemIndex: null,
    tenGod: null,
    tenGodGroup: null,
    dayMasterElement,
    factorElement: null,
    elementRelation: null,
    factorId: null,
    policyFactorGroup: null,
    direction: null,
    policyWeight: null,
    supportContribution: null,
    demandContribution: null,
    duplicateMonthMainPairId: null,
    duplicateRole: null,
    claimIds: [CLAIM.withheldHour],
    directStatement: `时辰不可靠：${category === "visible_stem" ? "透干" : category === "first_hidden_stem" ? "首位藏干" : "其余藏干"}因素已关闭，且本投影不序列化任何被关闭的时柱值。`,
    doesNotEstablish: "没有可靠时辰时，不补猜时柱数量、天干、地支、十神或权重。",
    ...baseEvidenceBoundary()
  });
}

function buildEvidenceItems(input: BuildBaziStrengthEvidenceNarrativeInput): readonly BaziStrengthEvidenceItem[] {
  const items: BaziStrengthEvidenceItem[] = [];
  const factors = new Map(input.interpretation.strength.factors.map((factor) => [factor.id, factor] as const));
  const consumedFactorIds = new Set<string>();
  const month = input.facts.pillars.month;
  const monthMainStem = month.hiddenStems[0];
  if (!monthMainStem) throw new Error("旺衰证据账缺少月支首位藏干");

  items.push(includedEvidenceItem(
    input,
    factors,
    consumedFactorIds,
    items.length + 1,
    "month_command",
    "month",
    `month-command:${month.branch}:${monthMainStem}`,
    monthMainStem,
    null,
    [CLAIM.dayMaster, CLAIM.traditionalWhole, CLAIM.inclusion, CLAIM.direction, CLAIM.weights, CLAIM.duplication],
    "month_command"
  ));

  for (const position of BAZI_STRENGTH_PILLAR_ORDER) {
    if (position === "day") {
      items.push(excludedDayMasterItem(input, items.length + 1));
      continue;
    }
    if (position === "hour" && !input.includeHour) {
      items.push(withheldHourItem(input.interpretation.strength.dayMaster.element, items.length + 1, "visible_stem"));
      continue;
    }
    const pillar = input.facts.pillars[position];
    items.push(includedEvidenceItem(
      input,
      factors,
      consumedFactorIds,
      items.length + 1,
      "visible_stem",
      position,
      `visible:${position}:${pillar.stem}`,
      pillar.stem,
      null,
      [CLAIM.dayMaster, CLAIM.traditionalTenGod, CLAIM.inclusion, CLAIM.direction, CLAIM.weights],
      null
    ));
  }

  for (const position of BAZI_STRENGTH_PILLAR_ORDER) {
    if (position === "hour" && !input.includeHour) {
      items.push(withheldHourItem(input.interpretation.strength.dayMaster.element, items.length + 1, "first_hidden_stem"));
      continue;
    }
    const pillar = input.facts.pillars[position];
    const stem = pillar.hiddenStems[0];
    if (!stem) throw new Error(`${pillar.label}缺少首位藏干`);
    items.push(includedEvidenceItem(
      input,
      factors,
      consumedFactorIds,
      items.length + 1,
      "first_hidden_stem",
      position,
      `hidden:${position}:${stem}:0`,
      stem,
      0,
      [CLAIM.dayMaster, CLAIM.traditionalTenGod, CLAIM.inclusion, CLAIM.direction, CLAIM.weights, CLAIM.hiddenListing, ...(position === "month" ? [CLAIM.duplication] : [])],
      position === "month" ? "first_hidden_stem" : null
    ));
  }

  for (const position of BAZI_STRENGTH_PILLAR_ORDER) {
    if (position === "hour" && !input.includeHour) {
      items.push(withheldHourItem(input.interpretation.strength.dayMaster.element, items.length + 1, "other_hidden_stem"));
      continue;
    }
    const pillar = input.facts.pillars[position];
    for (let index = 1; index < pillar.hiddenStems.length; index += 1) {
      const stem = pillar.hiddenStems[index];
      if (!stem) throw new Error(`${pillar.label}第 ${index + 1} 位藏干为空`);
      items.push(includedEvidenceItem(
        input,
        factors,
        consumedFactorIds,
        items.length + 1,
        "other_hidden_stem",
        position,
        `hidden:${position}:${stem}:${index}`,
        stem,
        index,
        [CLAIM.dayMaster, CLAIM.traditionalTenGod, CLAIM.inclusion, CLAIM.direction, CLAIM.weights, CLAIM.hiddenListing],
        null
      ));
    }
  }

  const expectedFactorIds = input.interpretation.strength.factors.map((factor) => factor.id);
  if (consumedFactorIds.size !== expectedFactorIds.length
    || expectedFactorIds.some((factorId) => !consumedFactorIds.has(factorId))) {
    throw new Error("旺衰证据账没有恰好消费当前盘全部因素");
  }
  return deepFreeze(items);
}

function buildDuplicateProjection(items: readonly BaziStrengthEvidenceItem[]): BaziStrengthDuplicateMonthMainProjection {
  const monthCommand = items.find((item) => item.duplicateRole === "month_command");
  const firstHidden = items.find((item) => item.duplicateRole === "first_hidden_stem");
  if (!monthCommand || !firstHidden || !monthCommand.stem || monthCommand.stem !== firstHidden.stem
    || monthCommand.branch !== firstHidden.branch || monthCommand.position !== "month" || firstHidden.position !== "month"
    || monthCommand.policyWeight === null || firstHidden.policyWeight === null) {
    throw new Error("旺衰证据账无法建立唯一月主气重复配对");
  }
  const combinedPolicyWeight = monthCommand.policyWeight + firstHidden.policyWeight;
  if (combinedPolicyWeight !== BAZI_STRENGTH_POLICY.factorWeights.monthCommand
    + BAZI_STRENGTH_POLICY.factorWeights.firstHiddenStem) {
    throw new Error("月主气重复配对权重与政策不一致");
  }
  return deepFreeze({
    pairId: "month-main:command-and-first-hidden",
    detected: true,
    monthCommandEvidenceItemId: monthCommand.evidenceItemId,
    firstHiddenEvidenceItemId: firstHidden.evidenceItemId,
    combinedPolicyWeight,
    claimIds: [CLAIM.duplication, CLAIM.weights],
    directStatement: `同一月支主气 ${monthCommand.stem} 在当前基线以“月令 ${monthCommand.policyWeight} + 首位藏干 ${firstHidden.policyWeight}”分别计入，合计 ${combinedPolicyWeight}；这是公开待审的工程选择。`,
    expertVerdict: null,
    result: null
  });
}

function buildClassification(input: BuildBaziStrengthEvidenceNarrativeInput): BaziStrengthClassificationProjection {
  const strength = input.interpretation.strength;
  const totalWeight = strength.supportWeight + strength.demandWeight;
  const ratioText = strength.supportRatio === null ? "无法计算" : `${(strength.supportRatio * 100).toFixed(1)}%`;
  return deepFreeze({
    band: strength.band,
    bandLabel: strength.label,
    intervalNotation: BAND_INTERVALS[strength.band],
    supportWeight: strength.supportWeight,
    demandWeight: strength.demandWeight,
    totalWeight,
    supportRatio: strength.supportRatio,
    claimIds: [CLAIM.weights, CLAIM.direction, CLAIM.thresholds],
    directStatement: `逐项汇总得到支持侧 ${strength.supportWeight}、需求侧 ${strength.demandWeight}，支持比例 ${ratioText}；当前工程阈值把它映射为“${strength.label}”候选，区间 ${BAND_INTERVALS[strength.band]}。`,
    expertVerdict: null,
    overallGoodBad: null,
    result: null
  });
}

function buildScenarioComparisons(
  input: BuildBaziStrengthEvidenceNarrativeInput,
  evidenceItems: readonly BaziStrengthEvidenceItem[]
): readonly BaziStrengthScenarioComparison[] {
  const baseline = input.strengthSensitivity.scenarios.find((scenario) => scenario.id === "baseline_current_candidate");
  if (!baseline) throw new Error("旺衰证据叙事缺少敏感性基线");
  const evidenceByFactorId = new Map(
    evidenceItems.filter((item) => item.factorId !== null).map((item) => [item.factorId as string, item.evidenceItemId] as const)
  );
  return deepFreeze(input.strengthSensitivity.scenarios.map((scenario, index) => {
    const reweightedFactorIds = scenario.appliedFactors
      .filter((factor) => factor.appliedWeight !== factor.sourceWeight)
      .map((factor) => factor.factorId);
    const affectedFactorIds = [...new Set([...scenario.excludedFactorIds, ...reweightedFactorIds])];
    const affectedEvidenceIds = affectedFactorIds.map((factorId) => {
      const id = evidenceByFactorId.get(factorId);
      if (!id) throw new Error(`敏感性场景引用未进入证据账的因素：${scenario.id}/${factorId}`);
      return id;
    });
    const ratioDelta = baseline.supportRatio === null || scenario.supportRatio === null
      ? null
      : scenario.supportRatio - baseline.supportRatio;
    const crossesBand = scenario.band !== baseline.band;
    const crossesDirection = scenario.broadDirection !== baseline.broadDirection;
    return {
      scenarioId: scenario.id,
      order: index + 1,
      label: scenario.label,
      role: scenario.role,
      baselineBand: baseline.band,
      scenarioBand: scenario.band,
      crossesBand,
      baselineDirection: baseline.broadDirection,
      scenarioDirection: scenario.broadDirection,
      crossesDirection,
      excludedFactorIds: [...scenario.excludedFactorIds],
      reweightedFactorIds,
      evidenceItemIds: affectedEvidenceIds,
      supportWeight: scenario.supportWeight,
      demandWeight: scenario.demandWeight,
      supportRatio: scenario.supportRatio,
      supportWeightDelta: scenario.supportWeight - baseline.supportWeight,
      demandWeightDelta: scenario.demandWeight - baseline.demandWeight,
      supportRatioDelta: ratioDelta,
      claimIds: [CLAIM.sensitivity],
      directStatement: `${scenario.label}得到“${scenario.bandLabel}”与 ${scenario.broadDirection}；相对当前基线${crossesBand ? "跨越分档" : "未跨越分档"}，${crossesDirection ? "支持／需求方向发生变化" : "支持／需求方向未变"}。这是工程假设扰动，不是出生输入变化或正式流派裁决。`,
      officialRuleCandidate: false,
      expertTruthClaimed: false,
      result: null
    };
  }));
}

function sourceBindingIdsForClaims(claimIds: readonly string[]): readonly string[] {
  const claimById = new Map(BAZI_STRENGTH_CLAIM_REGISTRY.claims.map((entry) => [entry.claimId, entry] as const));
  const bindingOrder = new Map(BAZI_STRENGTH_CLAIM_REGISTRY.sourceBindings.map((binding) => [binding.bindingId, binding.order] as const));
  const ids = new Set<string>();
  for (const claimId of claimIds) {
    const entry = claimById.get(claimId);
    if (!entry) throw new Error(`旺衰叙事引用未知主张：${claimId}`);
    entry.sourceBindingIds.forEach((bindingId) => ids.add(bindingId));
  }
  return [...ids].sort((left, right) => (bindingOrder.get(left) ?? 0) - (bindingOrder.get(right) ?? 0));
}

function statement(
  statements: BaziStrengthNarrativeStatement[],
  input: Omit<BaziStrengthNarrativeStatement, "order" | "sourceBindingIds" | "reviewStatus" | "expertTruthClaimed" | "scientificValidityClaimed" | "result">
): void {
  statements.push(deepFreeze({
    ...input,
    order: statements.length + 1,
    sourceBindingIds: sourceBindingIdsForClaims(input.claimIds),
    reviewStatus: "candidate_pending_expert_review",
    expertTruthClaimed: false,
    scientificValidityClaimed: false,
    result: null
  }));
}

function buildNarrativeStatements(
  input: BuildBaziStrengthEvidenceNarrativeInput,
  items: readonly BaziStrengthEvidenceItem[],
  duplicate: BaziStrengthDuplicateMonthMainProjection,
  classification: BaziStrengthClassificationProjection,
  scenarios: readonly BaziStrengthScenarioComparison[]
): readonly BaziStrengthNarrativeStatement[] {
  const statements: BaziStrengthNarrativeStatement[] = [];
  statement(statements, {
    statementId: "strength-statement:scope",
    kind: "scope",
    text: input.includeHour
      ? "本证据账使用当前四柱事实；所有因素与当前政策逐项重算。"
      : "本证据账只使用年、月、日三柱；时柱透干、首藏和余藏均以不含事实值的 withheld 状态显示。",
    claimIds: input.includeHour ? [CLAIM.dayMaster, CLAIM.inclusion] : [CLAIM.dayMaster, CLAIM.inclusion, CLAIM.withheldHour],
    evidenceItemIds: items.filter((item) => item.status === "withheld_unreliable_hour").map((item) => item.evidenceItemId),
    sensitivityScenarioIds: []
  });
  for (const item of items) {
    statement(statements, {
      statementId: `strength-statement:factor:${item.evidenceItemId}`,
      kind: "factor_ledger",
      text: item.directStatement,
      claimIds: item.claimIds,
      evidenceItemIds: [item.evidenceItemId],
      sensitivityScenarioIds: []
    });
  }
  statement(statements, {
    statementId: "strength-statement:month-main-duplication",
    kind: "month_main_duplication",
    text: duplicate.directStatement,
    claimIds: duplicate.claimIds,
    evidenceItemIds: [duplicate.monthCommandEvidenceItemId, duplicate.firstHiddenEvidenceItemId],
    sensitivityScenarioIds: ["deduplicate_month_main"]
  });
  statement(statements, {
    statementId: "strength-statement:subtotal",
    kind: "subtotal",
    text: `纳入因素逐项相加为支持侧 ${classification.supportWeight}、需求侧 ${classification.demandWeight}；排除项和 withheld 项不计权。`,
    claimIds: [CLAIM.inclusion, CLAIM.direction, CLAIM.weights],
    evidenceItemIds: items.filter((item) => item.status === "included").map((item) => item.evidenceItemId),
    sensitivityScenarioIds: []
  });
  statement(statements, {
    statementId: "strength-statement:classification",
    kind: "classification",
    text: classification.directStatement,
    claimIds: classification.claimIds,
    evidenceItemIds: items.filter((item) => item.status === "included").map((item) => item.evidenceItemId),
    sensitivityScenarioIds: []
  });
  for (const scenario of scenarios) {
    statement(statements, {
      statementId: `strength-statement:sensitivity:${scenario.scenarioId}`,
      kind: "sensitivity",
      text: scenario.directStatement,
      claimIds: scenario.claimIds,
      evidenceItemIds: scenario.evidenceItemIds,
      sensitivityScenarioIds: [scenario.scenarioId]
    });
  }
  statement(statements, {
    statementId: "strength-statement:boundary",
    kind: "boundary",
    text: "从格、专旺、化气、合化、刑冲、调候与运限仍未裁决；本层不输出用神、喜忌、个人吉凶或事件结果。",
    claimIds: [CLAIM.traditionalWhole, CLAIM.invalidation],
    evidenceItemIds: [],
    sensitivityScenarioIds: []
  });
  return deepFreeze(statements);
}

function assertUniqueOrdered(values: readonly { order: number }[], ids: readonly string[], subject: string): void {
  if (values.length !== ids.length || new Set(ids).size !== ids.length) throw new Error(`${subject} ID 必须唯一`);
  if (values.some((value, index) => value.order !== index + 1)) throw new Error(`${subject} 顺序必须连续`);
}

export function validateBaziStrengthEvidenceNarrative(result: BaziStrengthEvidenceNarrativeResult): void {
  if (!sameCanonical(result.profile, BAZI_STRENGTH_EVIDENCE_NARRATIVE_PROFILE)) {
    throw new Error("旺衰证据叙事 profile 不匹配");
  }
  if (!sameCanonical(result.sources, BAZI_STRENGTH_CLAIM_REGISTRY.sources)
    || !sameCanonical(result.sourceBindings, BAZI_STRENGTH_CLAIM_REGISTRY.sourceBindings)
    || !sameCanonical(result.claims, BAZI_STRENGTH_CLAIM_REGISTRY.claims)) {
    throw new Error("旺衰证据叙事的来源—主张快照与当前注册表不一致");
  }
  validateBaziStrengthClaimRegistry({
    profile: BAZI_STRENGTH_CLAIM_REGISTRY.profile,
    sources: result.sources,
    sourceBindings: result.sourceBindings,
    claims: result.claims,
    boundary: BAZI_STRENGTH_CLAIM_REGISTRY.boundary
  });
  assertUniqueOrdered(result.evidenceItems, result.evidenceItems.map((item) => item.evidenceItemId), "旺衰证据项");
  assertUniqueOrdered(result.scenarioComparisons, result.scenarioComparisons.map((scenario) => scenario.scenarioId), "旺衰敏感性比较");
  assertUniqueOrdered(result.narrativeStatements, result.narrativeStatements.map((item) => item.statementId), "旺衰叙事句");

  const claimById = new Map(result.claims.map((entry) => [entry.claimId, entry] as const));
  const bindingIds = new Set(result.sourceBindings.map((binding) => binding.bindingId));
  const evidenceIds = new Set(result.evidenceItems.map((item) => item.evidenceItemId));
  const scenarioIds = new Set(result.scenarioComparisons.map((scenario) => scenario.scenarioId));
  const included = result.evidenceItems.filter((item) => item.status === "included");
  const factorIds = included.map((item) => item.factorId);
  if (factorIds.some((id) => id === null) || new Set(factorIds).size !== factorIds.length) {
    throw new Error("旺衰证据项必须唯一绑定因素");
  }
  const support = included.reduce((sum, item) => sum + (item.supportContribution ?? 0), 0);
  const demand = included.reduce((sum, item) => sum + (item.demandContribution ?? 0), 0);
  if (support !== result.classification.supportWeight || demand !== result.classification.demandWeight
    || support + demand !== result.classification.totalWeight) {
    throw new Error("旺衰证据逐项贡献与分类汇总不一致");
  }
  for (const item of result.evidenceItems) {
    if (item.claimIds.length === 0 || item.claimIds.some((claimId) => !claimById.has(claimId))) {
      throw new Error(`旺衰证据项主张引用无法解析：${item.evidenceItemId}`);
    }
    if (item.status === "withheld_unreliable_hour" && [
      item.ganZhi,
      item.branch,
      item.stem,
      item.hiddenStemIndex,
      item.tenGod,
      item.tenGodGroup,
      item.factorElement,
      item.elementRelation,
      item.factorId,
      item.policyFactorGroup,
      item.direction,
      item.policyWeight,
      item.supportContribution,
      item.demandContribution
    ].some((value) => value !== null)) {
      throw new Error("未知时辰证据项不得泄露或补猜时柱事实");
    }
    if (item.expertTruthClaimed !== false || item.scientificValidityClaimed !== false
      || item.formalActivationAllowed !== false || item.goodBadOrientation !== null
      || item.eventOutcome !== null || item.result !== null) {
      throw new Error(`旺衰证据项结论边界未关闭：${item.evidenceItemId}`);
    }
  }

  const monthCommand = result.evidenceItems.find((item) => item.evidenceItemId === result.duplicateMonthMain.monthCommandEvidenceItemId);
  const firstHidden = result.evidenceItems.find((item) => item.evidenceItemId === result.duplicateMonthMain.firstHiddenEvidenceItemId);
  if (!monthCommand || !firstHidden || monthCommand.duplicateRole !== "month_command"
    || firstHidden.duplicateRole !== "first_hidden_stem"
    || result.duplicateMonthMain.combinedPolicyWeight !== 6) {
    throw new Error("月主气重复诊断与证据项不一致");
  }

  for (const scenario of result.scenarioComparisons) {
    if (scenario.evidenceItemIds.some((id) => !evidenceIds.has(id))
      || scenario.officialRuleCandidate !== false || scenario.expertTruthClaimed !== false || scenario.result !== null) {
      throw new Error(`旺衰敏感性比较边界或引用无效：${scenario.scenarioId}`);
    }
  }
  for (const narrative of result.narrativeStatements) {
    if (narrative.claimIds.length === 0 || narrative.claimIds.some((id) => !claimById.has(id))
      || narrative.sourceBindingIds.some((id) => !bindingIds.has(id))
      || narrative.evidenceItemIds.some((id) => !evidenceIds.has(id))
      || narrative.sensitivityScenarioIds.some((id) => !scenarioIds.has(id))) {
      throw new Error(`旺衰叙事句引用无法解析：${narrative.statementId}`);
    }
    const expectedBindingIds = sourceBindingIdsForClaims(narrative.claimIds);
    if (!sameCanonical(narrative.sourceBindingIds, expectedBindingIds)) {
      throw new Error(`旺衰叙事句来源定位并集不一致：${narrative.statementId}`);
    }
    if (narrative.expertTruthClaimed !== false || narrative.scientificValidityClaimed !== false || narrative.result !== null) {
      throw new Error(`旺衰叙事句结论边界未关闭：${narrative.statementId}`);
    }
  }
  const counts = result.counts;
  if (counts.sources !== result.sources.length
    || counts.sourceBindings !== result.sourceBindings.length
    || counts.claims !== result.claims.length
    || counts.evidenceItems !== result.evidenceItems.length
    || counts.includedFactors !== included.length
    || counts.excludedDayMaster !== result.evidenceItems.filter((item) => item.status === "excluded_day_master").length
    || counts.withheldItems !== result.evidenceItems.filter((item) => item.status === "withheld_unreliable_hour").length
    || counts.scenarioComparisons !== result.scenarioComparisons.length
    || counts.crossingScenarios !== result.scenarioComparisons.filter((scenario) => scenario.crossesBand).length
    || counts.narrativeStatements !== result.narrativeStatements.length) {
    throw new Error("旺衰证据叙事声明计数不一致");
  }
  if (result.boundary.expertTruthClaimed !== false
    || result.boundary.scientificValidityClaimed !== false
    || result.boundary.formalActivationAllowed !== false
    || result.boundary.reviewDecisionInheritanceApplied !== false
    || result.boundary.chartOrStorageMutationPerformed !== false
    || result.boundary.networkTransmissionPerformed !== false
    || result.boundary.overallGoodBad !== null
    || result.boundary.usefulGod !== null
    || result.boundary.structureVerdict !== null
    || result.boundary.eventOutcome !== null
    || result.boundary.result !== null) {
    throw new Error("旺衰证据叙事正式结论边界未关闭");
  }
}

export async function buildBaziStrengthEvidenceNarrative(
  input: BuildBaziStrengthEvidenceNarrativeInput
): Promise<BaziStrengthEvidenceNarrativeResult> {
  const shared = await buildBaziStrengthSharedSnapshot(input);
  validateBaziStrengthClaimRegistry(BAZI_STRENGTH_CLAIM_REGISTRY);
  const evidenceItems = buildEvidenceItems(input);
  const duplicateMonthMain = buildDuplicateProjection(evidenceItems);
  const classification = buildClassification(input);
  const scenarioComparisons = buildScenarioComparisons(input, evidenceItems);
  const narrativeStatements = buildNarrativeStatements(
    input,
    evidenceItems,
    duplicateMonthMain,
    classification,
    scenarioComparisons
  );
  const registrySnapshot = canonicalClone(BAZI_STRENGTH_CLAIM_REGISTRY);
  const [claimRegistrySha256, orderedEvidenceItemIdsSha256, orderedNarrativeStatementIdsSha256] = await Promise.all([
    baziSnapshotDomainDigest("hakimi.bazi.strength-claim-registry.v1", registrySnapshot),
    baziSnapshotDomainDigest("hakimi.bazi.strength-evidence-item-ids.v1", evidenceItems.map((item) => item.evidenceItemId)),
    baziSnapshotDomainDigest("hakimi.bazi.strength-narrative-statement-ids.v1", narrativeStatements.map((item) => item.statementId))
  ]);
  const result: BaziStrengthEvidenceNarrativeResult = {
    profile: BAZI_STRENGTH_EVIDENCE_NARRATIVE_PROFILE,
    executionScope: {
      includeHour: input.includeHour,
      activePositions: activeBaziStrengthPositions(input.includeHour),
      withheldPositions: input.includeHour ? [] : ["hour"]
    },
    bindings: {
      ...shared.bindings,
      claimRegistryVersion: registrySnapshot.profile.projectionVersion,
      claimRegistrySha256,
      orderedEvidenceItemIdsSha256,
      orderedNarrativeStatementIdsSha256
    },
    factsProjection: shared.factsProjection,
    dayMaster: canonicalClone(input.interpretation.strength.dayMaster),
    sources: registrySnapshot.sources,
    sourceBindings: registrySnapshot.sourceBindings,
    claims: registrySnapshot.claims,
    evidenceItems,
    duplicateMonthMain,
    classification,
    scenarioComparisons,
    narrativeStatements,
    counts: {
      sources: registrySnapshot.sources.length,
      sourceBindings: registrySnapshot.sourceBindings.length,
      claims: registrySnapshot.claims.length,
      evidenceItems: evidenceItems.length,
      includedFactors: evidenceItems.filter((item) => item.status === "included").length,
      excludedDayMaster: evidenceItems.filter((item) => item.status === "excluded_day_master").length,
      withheldItems: evidenceItems.filter((item) => item.status === "withheld_unreliable_hour").length,
      scenarioComparisons: scenarioComparisons.length,
      crossingScenarios: scenarioComparisons.filter((scenario) => scenario.crossesBand).length,
      narrativeStatements: narrativeStatements.length
    },
    boundary: {
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
    }
  };
  const frozen = deepFreeze(canonicalClone(result));
  validateBaziStrengthEvidenceNarrative(frozen);
  return frozen;
}
