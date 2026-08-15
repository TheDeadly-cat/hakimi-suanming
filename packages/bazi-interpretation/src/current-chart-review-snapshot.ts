import { chartFactsSchema, type ChartFacts } from "@hakimi/contracts";
import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import type { BaziInterpretationResult } from "./index";
import {
  BAZI_STRENGTH_PILLAR_ORDER,
  BAZI_STRENGTH_POSITION_LABELS,
  deriveBaziStrengthAssessment,
  type PillarPosition
} from "./strength-assessment-core";
import { BAZI_STRENGTH_POLICY } from "./strength-policy";
import {
  buildStrengthSensitivityReview,
  type StrengthSensitivityReview
} from "./strength-sensitivity-review";

export const BAZI_CURRENT_CHART_FACTS_PROJECTION_VERSION =
  "hakimi.bazi.current_chart_review_facts/0.1.0" as const;

export interface BaziCurrentChartReviewFactsPillar {
  position: PillarPosition;
  ganZhi: string;
  stem: string;
  branch: string;
  hiddenStems: readonly string[];
  stemTenGod: string;
  branchTenGods: readonly string[];
}

export interface BaziCurrentChartReviewFactsProjection {
  version: typeof BAZI_CURRENT_CHART_FACTS_PROJECTION_VERSION;
  schemaVersion: string;
  pillars: readonly BaziCurrentChartReviewFactsPillar[];
}

export interface BaziStrengthSharedSnapshotInput {
  facts: ChartFacts;
  includeHour: boolean;
  interpretation: BaziInterpretationResult;
  strengthSensitivity: StrengthSensitivityReview;
}

export interface BaziStrengthSharedSnapshotBindings {
  digestAlgorithm: "sha256-canonical-json-v1";
  factsProjectionVersion: typeof BAZI_CURRENT_CHART_FACTS_PROJECTION_VERSION;
  factsProjectionSha256: string;
  strengthPolicyVersion: string;
  strengthPolicySha256: string;
  interpretationRulePackId: string;
  interpretationRuleVersion: string;
  strengthAssessmentSha256: string;
  strengthSensitivityProjectionVersion: string;
  strengthSensitivitySha256: string;
}

export interface BaziStrengthSharedSnapshot {
  factsProjection: BaziCurrentChartReviewFactsProjection;
  bindings: BaziStrengthSharedSnapshotBindings;
}

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

export async function baziSnapshotDomainDigest(domain: string, value: unknown): Promise<string> {
  return sha256Hex({ domain, value });
}

export function activeBaziStrengthPositions(includeHour: boolean): readonly PillarPosition[] {
  if (typeof includeHour !== "boolean") throw new Error("includeHour 必须是显式布尔值");
  return Object.freeze(BAZI_STRENGTH_PILLAR_ORDER.filter((position) => includeHour || position !== "hour"));
}

export function assertBaziStrengthFactsShape(facts: ChartFacts): void {
  const result = chartFactsSchema.safeParse(facts);
  if (!result.success) throw new Error("当前命盘事实不符合 ChartFacts 合约", { cause: result.error });
  const actualPositions = Object.keys(facts.pillars).sort();
  const expectedPositions = [...BAZI_STRENGTH_PILLAR_ORDER].sort();
  if (!sameCanonical(actualPositions, expectedPositions)) throw new Error("当前命盘必须恰好包含四柱事实");

  for (const position of BAZI_STRENGTH_PILLAR_ORDER) {
    const pillar = facts.pillars[position];
    if (pillar.name !== position || pillar.label !== BAZI_STRENGTH_POSITION_LABELS[position]) {
      throw new Error(`${BAZI_STRENGTH_POSITION_LABELS[position]}事实身份与位置不一致`);
    }
    if (pillar.ganZhi !== `${pillar.stem}${pillar.branch}`) {
      throw new Error(`${pillar.label}干支与天干地支字段不一致`);
    }
    if (pillar.hiddenStems.length === 0 || pillar.hiddenStems.length !== pillar.branchTenGods.length) {
      throw new Error(`${pillar.label}藏干与支十神必须非空且逐项对齐`);
    }
    if (pillar.hiddenStems.some((stem) => !stem) || pillar.branchTenGods.some((tenGod) => !tenGod)) {
      throw new Error(`${pillar.label}藏干与支十神不得包含空值`);
    }
  }
}

export function assertBaziStrengthDerivedSnapshot(input: BaziStrengthSharedSnapshotInput): void {
  if (typeof input.includeHour !== "boolean") throw new Error("includeHour 必须是显式布尔值");
  assertBaziStrengthFactsShape(input.facts);
  if (input.interpretation.profile.rulePackId !== BAZI_STRENGTH_POLICY.rulePackId
    || input.interpretation.profile.ruleVersion !== BAZI_STRENGTH_POLICY.ruleVersion) {
    throw new Error("当前解释没有绑定旺衰政策对应的规则包");
  }

  const expectedAssessment = deriveBaziStrengthAssessment(input.facts, input.includeHour);
  if (!sameCanonical(input.interpretation.strength, expectedAssessment)) {
    throw new Error("当前旺衰因素账不是由命盘事实与单一政策完整派生：可能存在权重偏离当前政策、缺失、额外、错序或其他篡改");
  }
  const expectedSensitivity = buildStrengthSensitivityReview(input.interpretation);
  if (!sameCanonical(input.strengthSensitivity, expectedSensitivity)) {
    throw new Error("当前旺衰敏感性不是由本盘完整因素账重新派生");
  }
}

export function buildBaziCurrentChartReviewFactsProjection(
  facts: ChartFacts,
  includeHour: boolean
): BaziCurrentChartReviewFactsProjection {
  assertBaziStrengthFactsShape(facts);
  const positions = activeBaziStrengthPositions(includeHour);
  return deepFreeze({
    version: BAZI_CURRENT_CHART_FACTS_PROJECTION_VERSION,
    schemaVersion: facts.schemaVersion,
    pillars: positions.map((position) => {
      const pillar = facts.pillars[position];
      return {
        position,
        ganZhi: pillar.ganZhi,
        stem: pillar.stem,
        branch: pillar.branch,
        hiddenStems: [...pillar.hiddenStems],
        stemTenGod: pillar.stemTenGod,
        branchTenGods: [...pillar.branchTenGods]
      };
    })
  });
}

export async function buildBaziStrengthSharedSnapshot(
  input: BaziStrengthSharedSnapshotInput
): Promise<BaziStrengthSharedSnapshot> {
  assertBaziStrengthDerivedSnapshot(input);
  const factsProjection = buildBaziCurrentChartReviewFactsProjection(input.facts, input.includeHour);
  const [
    strengthPolicySha256,
    factsProjectionSha256,
    strengthAssessmentSha256,
    strengthSensitivitySha256
  ] = await Promise.all([
    baziSnapshotDomainDigest("hakimi.bazi.strength-policy.v1", BAZI_STRENGTH_POLICY),
    baziSnapshotDomainDigest("hakimi.bazi.current-chart-review-facts.v1", factsProjection),
    baziSnapshotDomainDigest("hakimi.bazi.strength-assessment.v1", input.interpretation.strength),
    baziSnapshotDomainDigest("hakimi.bazi.strength-sensitivity.v1", input.strengthSensitivity)
  ]);
  return deepFreeze(canonicalClone({
    factsProjection,
    bindings: {
      digestAlgorithm: "sha256-canonical-json-v1",
      factsProjectionVersion: BAZI_CURRENT_CHART_FACTS_PROJECTION_VERSION,
      factsProjectionSha256,
      strengthPolicyVersion: BAZI_STRENGTH_POLICY.policyVersion,
      strengthPolicySha256,
      interpretationRulePackId: input.interpretation.profile.rulePackId,
      interpretationRuleVersion: input.interpretation.profile.ruleVersion,
      strengthAssessmentSha256,
      strengthSensitivityProjectionVersion: input.strengthSensitivity.profile.projectionVersion,
      strengthSensitivitySha256
    }
  }));
}
