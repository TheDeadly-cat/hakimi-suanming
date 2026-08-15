import type {
  BaziInterpretationResult,
  PillarPosition,
  RelativeOrientation,
  StrengthBand
} from "./index";

export const BAZI_TEN_GOD_ORIENTATION_REVIEW_VERSION =
  "hakimi.bazi.ten_god_balance_orientation_review/0.1.0" as const;

export const BAZI_TEN_GOD_ORIENTATION_REVIEW_PROFILE = Object.freeze({
  projectionVersion: BAZI_TEN_GOD_ORIENTATION_REVIEW_VERSION,
  calculationScope: "strength_balance_only_read_only_projection" as const,
  displayedByDefault: true,
  evidenceClass: "derived_read_only_projection" as const,
  reviewStatus: "candidate_pending_expert_review" as const,
  overallGoodBadStatus: "withheld" as const
});

export type TenGodBalanceDirection =
  | "may_restore_balance"
  | "may_amplify_imbalance"
  | "conditional";

export type TenGodOrientationReviewGateKey =
  | "structure_and_rescue"
  | "climate_balance"
  | "combination_transform"
  | "luck_timing";

export interface TenGodOrientationReviewGate {
  key: TenGodOrientationReviewGateKey;
  label: string;
  status: "not_evaluated";
  question: string;
  whyRequired: string;
  sourceRefIds: readonly string[];
}

export interface TenGodOrientationReviewItem {
  contentId: string;
  version: typeof BAZI_TEN_GOD_ORIENTATION_REVIEW_VERSION;
  position: PillarPosition;
  positionLabel: string;
  availability: "available" | "uncertain_hour";
  tenGod: string | null;
  strengthBand: StrengthBand;
  strengthLabel: string;
  inheritedOrientation: RelativeOrientation;
  balanceDirection: TenGodBalanceDirection;
  balanceDirectionLabel: string;
  directSummary: string;
  reviewGates: readonly [
    TenGodOrientationReviewGate,
    TenGodOrientationReviewGate,
    TenGodOrientationReviewGate,
    TenGodOrientationReviewGate
  ];
  sourceRefIds: readonly string[];
  evidenceClass: "derived_read_only_projection";
  reviewStatus: "candidate_pending_expert_review";
  result: null;
  overallGoodBad: null;
  eventOutcome: null;
  expertTruthClaimed: false;
  scoringAllowed: false;
  doesNotEstablish: string;
}

export interface TenGodOrientationReviewResult {
  profile: typeof BAZI_TEN_GOD_ORIENTATION_REVIEW_PROFILE;
  items: readonly TenGodOrientationReviewItem[];
  knownGaps: readonly string[];
}

const tenGodSideLabels: Readonly<Record<string, string>> = Object.freeze({
  比肩: "比劫支持侧",
  劫财: "比劫支持侧",
  正印: "印星支持侧",
  偏印: "印星支持侧",
  食神: "食伤泄身侧",
  伤官: "食伤泄身侧",
  正财: "财星耗身侧",
  偏财: "财星耗身侧",
  正官: "官杀压力侧",
  七杀: "官杀压力侧"
});

export function tenGodBalanceDirectionFor(
  orientation: RelativeOrientation,
  availability: TenGodOrientationReviewItem["availability"]
): TenGodBalanceDirection {
  if (availability !== "available" || orientation === "conditional") return "conditional";
  return orientation === "favorable" ? "may_restore_balance" : "may_amplify_imbalance";
}

export function tenGodBalanceDirectionLabel(
  direction: TenGodBalanceDirection,
  availability: TenGodOrientationReviewItem["availability"]
): string {
  if (availability !== "available") return "时辰未定";
  if (direction === "may_restore_balance") return "平衡方向：可能补偏";
  if (direction === "may_amplify_imbalance") return "平衡方向：可能增偏";
  return "平衡方向：条件性";
}

export function buildTenGodOrientationReviewGates(
  tenGod: string,
  positionLabel: string
): TenGodOrientationReviewItem["reviewGates"] {
  return Object.freeze([
    Object.freeze({
      key: "structure_and_rescue",
      label: "格局与救应",
      status: "not_evaluated",
      question: `${tenGod}在月令取用、从格、专旺、化气或格局成败救应中，是否会改写当前扶抑方向？`,
      whyRequired: "同一十神可能成格、破格或成为救应，不能仅凭神名和身强弱固定判喜忌。",
      sourceRefIds: Object.freeze(["zpzz-review-gates", "smt-ten-gods"])
    }),
    Object.freeze({
      key: "climate_balance",
      label: "寒暖燥湿",
      status: "not_evaluated",
      question: `${positionLabel}${tenGod}是否符合月令寒暖燥湿的调候需要，还是与扶抑方向发生冲突？`,
      whyRequired: "扶抑平衡与调候是不同审查轴；气候需要尚未进入当前权重。",
      sourceRefIds: Object.freeze(["zpzz-review-gates"])
    }),
    Object.freeze({
      key: "combination_transform",
      label: "合化与生克链",
      status: "not_evaluated",
      question: `${tenGod}是否因透藏、合化、刑冲会合或生克先后而改变实际作用方向？`,
      whyRequired: "当前只按可见十神归入支持或泄耗克侧，尚未计算组合后的转化与救应。",
      sourceRefIds: Object.freeze(["zpzz-review-gates", "smt-ten-gods"])
    }),
    Object.freeze({
      key: "luck_timing",
      label: "运限引动",
      status: "not_evaluated",
      question: `${tenGod}何时被大运流年引动、是否有现实记录可核对？`,
      whyRequired: "本命中的平衡方向不等于某个时间点必然发生的事件或吉凶结果。",
      sourceRefIds: Object.freeze(["zpzz-review-gates"])
    })
  ]);
}

export function buildTenGodOrientationReview(
  interpretation: BaziInterpretationResult
): TenGodOrientationReviewResult {
  const items = interpretation.pillars.map((reading): TenGodOrientationReviewItem => {
    const direction = tenGodBalanceDirectionFor(reading.orientation, reading.availability);
    const tenGod = reading.focusTenGod;
    const sideLabel = tenGod ? tenGodSideLabels[tenGod] ?? "未映射作用侧" : "未映射作用侧";
    const directSummary = reading.availability !== "available" || !tenGod
      ? "当前没有可靠时辰或可识别十神，本柱不生成平衡方向。"
      : direction === "may_restore_balance"
        ? `${tenGod}属于${sideLabel}；按日主“${interpretation.strength.label}”扶抑候选，它更可能帮助收窄当前偏态。`
        : direction === "may_amplify_imbalance"
          ? `${tenGod}属于${sideLabel}；按日主“${interpretation.strength.label}”扶抑候选，它更可能放大当前偏态。`
          : `${tenGod}属于${sideLabel}；日主处于“${interpretation.strength.label}”候选区间，单凭扶抑不能给出稳定方向。`;
    const reviewTenGod = tenGod ?? "未映射十神";

    return Object.freeze({
      contentId: `hakimi.bazi.ten_god_balance.${reading.position}.${tenGod ?? "unmapped"}.candidate.v0_1`,
      version: BAZI_TEN_GOD_ORIENTATION_REVIEW_VERSION,
      position: reading.position,
      positionLabel: reading.positionLabel,
      availability: reading.availability,
      tenGod,
      strengthBand: interpretation.strength.band,
      strengthLabel: interpretation.strength.label,
      inheritedOrientation: reading.orientation,
      balanceDirection: direction,
      balanceDirectionLabel: tenGodBalanceDirectionLabel(direction, reading.availability),
      directSummary,
      reviewGates: buildTenGodOrientationReviewGates(reviewTenGod, reading.positionLabel),
      sourceRefIds: Object.freeze([
        ...new Set([...reading.sourceRefIds, "dtt-strength", "zpzz-review-gates"])
      ]),
      evidenceClass: "derived_read_only_projection",
      reviewStatus: "candidate_pending_expert_review",
      result: null,
      overallGoodBad: null,
      eventOutcome: null,
      expertTruthClaimed: false,
      scoringAllowed: false,
      doesNotEstablish:
        "本条只给出当前旺衰扶抑候选下的平衡方向；不等于用神定论、十神永久吉凶、格局成败、调候结论、运限事件或现实身份判断。"
    });
  });

  return Object.freeze({
    profile: BAZI_TEN_GOD_ORIENTATION_REVIEW_PROFILE,
    items: Object.freeze(items),
    knownGaps: Object.freeze([
      "平衡方向只继承 0.1.0 旺衰权重候选；权重、阈值和边界案例仍待命理专家裁决。",
      "格局与救应、寒暖燥湿、合化与生克链、运限引动四道复核门当前均为 not_evaluated。",
      "overallGoodBad 与 eventOutcome 固定为 null；不会把可能补偏或可能增偏写成最终吉凶。"
    ])
  });
}
