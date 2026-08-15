export type StrengthBand =
  | "very_weak"
  | "weak"
  | "balanced"
  | "strong"
  | "very_strong"
  | "undetermined";

export type StrengthPolicyFactorGroup = "month_command" | "visible_stem" | "hidden_stem";

export type StrengthFactorDirection = "support" | "demand";
export type TenGodGroup = "peer" | "resource" | "output" | "wealth" | "authority";

export type StrengthSensitivityScenarioOperation =
  | "baseline"
  | "deduplicate_month_main"
  | "equal_presence_deduplicated"
  | "exclude_month_command"
  | "exclude_visible_stems"
  | "exclude_hidden_stems";

export const BAZI_STRENGTH_FACTOR_WEIGHTS = Object.freeze({
  monthCommand: 4,
  visibleStem: 2,
  firstHiddenStem: 2,
  otherHiddenStem: 1
});

export const BAZI_STRENGTH_BAND_THRESHOLDS = Object.freeze({
  veryWeakUpperExclusive: 0.25,
  weakUpperExclusive: 0.43,
  balancedUpperInclusive: 0.57,
  strongUpperInclusive: 0.75
});

export const BAZI_STRENGTH_TEN_GOD_ALIASES = Object.freeze({
  偏官: "七杀",
  枭神: "偏印"
} as const);

export const BAZI_STRENGTH_TEN_GOD_GROUPS: Readonly<Record<string, TenGodGroup>> = Object.freeze({
  比肩: "peer",
  劫财: "peer",
  正印: "resource",
  偏印: "resource",
  食神: "output",
  伤官: "output",
  正财: "wealth",
  偏财: "wealth",
  正官: "authority",
  七杀: "authority"
});

export const BAZI_STRENGTH_WEIGHT_SUMMARY = Object.freeze({
  short: `月令 ${BAZI_STRENGTH_FACTOR_WEIGHTS.monthCommand}、透干 ${BAZI_STRENGTH_FACTOR_WEIGHTS.visibleStem}、首位藏干 ${BAZI_STRENGTH_FACTOR_WEIGHTS.firstHiddenStem}、其余藏干 ${BAZI_STRENGTH_FACTOR_WEIGHTS.otherHiddenStem}`,
  duplicateMonthMain: `当前工程候选将月令主气计 ${BAZI_STRENGTH_FACTOR_WEIGHTS.monthCommand} 权重，并将同一月支首位藏干另计 ${BAZI_STRENGTH_FACTOR_WEIGHTS.firstHiddenStem} 权重；二者在命中时合计 ${BAZI_STRENGTH_FACTOR_WEIGHTS.monthCommand + BAZI_STRENGTH_FACTOR_WEIGHTS.firstHiddenStem}。`
});

export const BAZI_STRENGTH_UNRESOLVED_STRUCTURES = Object.freeze([
  "从格",
  "专旺",
  "化气",
  "合化",
  "刑冲",
  "调候",
  "大运流年"
] as const);

export const BAZI_STRENGTH_METHOD_REVIEW_ITEMS = Object.freeze([
  Object.freeze({
    id: "month-command-hidden-stem-duplication",
    title: "月令主气与首位藏干重复计权",
    question: "月令主气与同一月支首位藏干是否应同时计权；若同时计权，边界依据是什么？",
    candidateSummary: BAZI_STRENGTH_WEIGHT_SUMMARY.duplicateMonthMain,
    candidateDetails: Object.freeze(["需要用成体系反例确认是否去重，以及去重适用到哪些月支结构。"]),
    sourceRefIds: Object.freeze(["dtt-strength", "smt-position", "yhzp-hidden-stems"])
  }),
  Object.freeze({
    id: "relative-factor-weighting",
    title: "月令、透干与藏干相对权重",
    question: `透干、首位藏干、其余藏干与月令之间应采用怎样的相对权重，哪些反例会推翻当前“${BAZI_STRENGTH_WEIGHT_SUMMARY.short}”候选？`,
    candidateSummary: `当前工程候选采用“${BAZI_STRENGTH_WEIGHT_SUMMARY.short}”的相对权重，仅供敏感性审计。`,
    candidateDetails: Object.freeze(["六个扰动场景可显示结论敏感程度，但不能认证其中任一权重为命理真值。"]),
    sourceRefIds: Object.freeze(["dtt-strength", "smt-position", "yhzp-hidden-stems"])
  }),
  Object.freeze({
    id: "strength-band-thresholds",
    title: "旺衰五档阈值",
    question: `${BAZI_STRENGTH_BAND_THRESHOLDS.veryWeakUpperExclusive}、${BAZI_STRENGTH_BAND_THRESHOLDS.weakUpperExclusive}、${BAZI_STRENGTH_BAND_THRESHOLDS.balancedUpperInclusive}、${BAZI_STRENGTH_BAND_THRESHOLDS.strongUpperInclusive} 分档阈值是否有可复核案例集支持？`,
    candidateSummary: `当前工程候选按支持占比 ${BAZI_STRENGTH_BAND_THRESHOLDS.veryWeakUpperExclusive}、${BAZI_STRENGTH_BAND_THRESHOLDS.weakUpperExclusive}、${BAZI_STRENGTH_BAND_THRESHOLDS.balancedUpperInclusive}、${BAZI_STRENGTH_BAND_THRESHOLDS.strongUpperInclusive} 划分五档。`,
    candidateDetails: Object.freeze(["阈值尚无获准案例集或专家裁决，只能显示为工程候选。"]),
    sourceRefIds: Object.freeze(["dtt-strength", "smt-position"])
  }),
  Object.freeze({
    id: "strength-invalidation-structures",
    title: "基础旺衰结论失效或改写条件",
    question: `${BAZI_STRENGTH_UNRESOLVED_STRUCTURES.slice(0, 6).join("、")}等结构应在何时使基础旺衰结论失效或改写？`,
    candidateSummary: `当前基础算法尚未裁决${BAZI_STRENGTH_UNRESOLVED_STRUCTURES.slice(0, 6).join("、")}等结构对旺衰结论的改写。`,
    candidateDetails: Object.freeze(["在这些复核门关闭前，基础分档不能升级为正式喜忌或个案结果。"]),
    sourceRefIds: Object.freeze(["dtt-strength", "zpzz-review-gates"])
  })
] as const);

export const BAZI_STRENGTH_EXPERT_REVIEW_QUESTIONS = Object.freeze(
  BAZI_STRENGTH_METHOD_REVIEW_ITEMS.map((item) => item.question)
);

export const BAZI_STRENGTH_METHOD_REVIEW_ITEM_IDS = Object.freeze(
  BAZI_STRENGTH_METHOD_REVIEW_ITEMS.map((item) => item.id)
);

export const BAZI_STRENGTH_SENSITIVITY_SCENARIOS = Object.freeze([
  Object.freeze({
    id: "baseline_current_candidate",
    label: "当前 0.1.0 候选",
    purpose: `原样复现当前“${BAZI_STRENGTH_WEIGHT_SUMMARY.short}”权重与阈值，作为比较基线；不因此升级为专家定论。`,
    role: "current_candidate_baseline" as const,
    operation: "baseline" as StrengthSensitivityScenarioOperation
  }),
  Object.freeze({
    id: "deduplicate_month_main",
    label: "月支主气去重",
    purpose: `保留月令主气 ${BAZI_STRENGTH_FACTOR_WEIGHTS.monthCommand} 权重，但移除同一月支首位藏干的再次计权，观察重复计权影响。`,
    role: "sensitivity_only" as const,
    operation: "deduplicate_month_main" as StrengthSensitivityScenarioOperation
  }),
  Object.freeze({
    id: "equal_presence_deduplicated",
    label: "去重后等权出现",
    purpose: "月支主气去重后，将每个剩余因素都按 1 计，仅观察因素数量方向。",
    role: "sensitivity_only" as const,
    operation: "equal_presence_deduplicated" as StrengthSensitivityScenarioOperation
  }),
  Object.freeze({
    id: "without_month_command_bonus",
    label: "不计月令加权项",
    purpose: `移除独立的月令 ${BAZI_STRENGTH_FACTOR_WEIGHTS.monthCommand} 权重项，但保留月支首位藏干的一般出现，观察月令加权影响。`,
    role: "sensitivity_only" as const,
    operation: "exclude_month_command" as StrengthSensitivityScenarioOperation
  }),
  Object.freeze({
    id: "without_visible_stems",
    label: "省略透干",
    purpose: "暂时省略所有透干因素，检验结论是否过度依赖天干显性出现。",
    role: "sensitivity_only" as const,
    operation: "exclude_visible_stems" as StrengthSensitivityScenarioOperation
  }),
  Object.freeze({
    id: "without_hidden_stems",
    label: "省略一般藏干",
    purpose: "暂时省略所有一般藏干因素，但保留独立月令项，检验结论是否过度依赖藏干累计。",
    role: "sensitivity_only" as const,
    operation: "exclude_hidden_stems" as StrengthSensitivityScenarioOperation
  })
] as const);

export type StrengthSensitivityScenarioId = (typeof BAZI_STRENGTH_SENSITIVITY_SCENARIOS)[number]["id"];

export const BAZI_STRENGTH_SENSITIVITY_SCENARIO_IDS = Object.freeze(
  BAZI_STRENGTH_SENSITIVITY_SCENARIOS.map((scenario) => scenario.id)
);

export const BAZI_STRENGTH_POLICY = Object.freeze({
  policyVersion: "hakimi.bazi.strength_policy/0.1.0",
  rulePackId: "hakimi-bazi-strength-ten-god-candidate",
  ruleVersion: "0.1.0",
  factorWeights: BAZI_STRENGTH_FACTOR_WEIGHTS,
  factorInclusion: Object.freeze({
    includeDayVisibleStem: false,
    retainMonthCommandAndFirstHiddenStem: true,
    excludeUnreliableHour: true
  }),
  monthMainDuplication: "counted_separately_candidate" as const,
  thresholds: BAZI_STRENGTH_BAND_THRESHOLDS,
  tenGodAliases: BAZI_STRENGTH_TEN_GOD_ALIASES,
  tenGodGroups: BAZI_STRENGTH_TEN_GOD_GROUPS,
  sensitivityScenarioIds: BAZI_STRENGTH_SENSITIVITY_SCENARIO_IDS,
  sensitivityScenarios: BAZI_STRENGTH_SENSITIVITY_SCENARIOS,
  methodReviewItemIds: BAZI_STRENGTH_METHOD_REVIEW_ITEM_IDS,
  methodReviewItems: BAZI_STRENGTH_METHOD_REVIEW_ITEMS,
  unresolvedStructures: BAZI_STRENGTH_UNRESOLVED_STRUCTURES,
  evidenceClass: "engineering_candidate_policy" as const,
  reviewStatus: "candidate_pending_expert_review" as const,
  expertTruthClaimed: false as const,
  formalActivationAllowed: false as const,
  expertReviewQuestions: BAZI_STRENGTH_EXPERT_REVIEW_QUESTIONS
});

export const BAZI_STRENGTH_BAND_LABELS: Readonly<Record<StrengthBand, string>> = Object.freeze({
  very_weak: "很弱",
  weak: "偏弱",
  balanced: "相对中和",
  strong: "偏强",
  very_strong: "很强",
  undetermined: "未定"
});

export function canonicalizeStrengthTenGod(value: string): string {
  return BAZI_STRENGTH_TEN_GOD_ALIASES[value as keyof typeof BAZI_STRENGTH_TEN_GOD_ALIASES] ?? value;
}

export function strengthTenGodGroup(value: string): TenGodGroup | null {
  return BAZI_STRENGTH_TEN_GOD_GROUPS[canonicalizeStrengthTenGod(value)] ?? null;
}

export function strengthFactorDirectionForTenGod(value: string): StrengthFactorDirection | null {
  const group = strengthTenGodGroup(value);
  if (!group) return null;
  return group === "peer" || group === "resource" ? "support" : "demand";
}

export function strengthFactorWeight(
  group: StrengthPolicyFactorGroup,
  hiddenStemIndex: number | null = null
): number {
  if (group === "month_command") return BAZI_STRENGTH_POLICY.factorWeights.monthCommand;
  if (group === "visible_stem") return BAZI_STRENGTH_POLICY.factorWeights.visibleStem;
  if (!Number.isInteger(hiddenStemIndex) || (hiddenStemIndex as number) < 0) {
    throw new Error("藏干因素必须提供非负整数索引");
  }
  return hiddenStemIndex === 0
    ? BAZI_STRENGTH_POLICY.factorWeights.firstHiddenStem
    : BAZI_STRENGTH_POLICY.factorWeights.otherHiddenStem;
}

export function classifyStrengthBand(supportWeight: number, demandWeight: number): StrengthBand {
  if (!Number.isFinite(supportWeight) || !Number.isFinite(demandWeight) || supportWeight < 0 || demandWeight < 0) {
    throw new Error("旺衰权重必须是非负有限数");
  }
  const total = supportWeight + demandWeight;
  if (total === 0) return "undetermined";
  const ratio = supportWeight / total;
  const thresholds = BAZI_STRENGTH_POLICY.thresholds;
  if (ratio < thresholds.veryWeakUpperExclusive) return "very_weak";
  if (ratio < thresholds.weakUpperExclusive) return "weak";
  if (ratio <= thresholds.balancedUpperInclusive) return "balanced";
  if (ratio <= thresholds.strongUpperInclusive) return "strong";
  return "very_strong";
}
