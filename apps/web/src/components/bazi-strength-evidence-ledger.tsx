import { CircleAlert, ExternalLink, RefreshCw } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import type { ChartFacts } from "@hakimi/contracts";
import {
  BAZI_STRENGTH_EVIDENCE_NARRATIVE_PROFILE,
  buildBaziStrengthEvidenceNarrative,
  type BaziInterpretationResult,
  type BaziStrengthClaim,
  type BaziStrengthClaimSource,
  type BaziStrengthClaimSourceBinding,
  type BaziStrengthEvidenceItem,
  type BaziStrengthEvidenceNarrativeResult,
  type StrengthSensitivityReview
} from "@hakimi/bazi-interpretation";
import { StatusPill } from "./status-pill";
import "./bazi-strength-evidence-ledger.css";

type EvidenceRequestToken = Readonly<{
  bindingKey: string;
  retryVersion: number;
  facts: ChartFacts;
  includeHour: boolean;
  interpretation: BaziInterpretationResult;
  strengthSensitivity: StrengthSensitivityReview;
}>;

type EvidenceState =
  | { requestToken: EvidenceRequestToken; status: "loading" }
  | { requestToken: EvidenceRequestToken; status: "resolved"; result: BaziStrengthEvidenceNarrativeResult }
  | { requestToken: EvidenceRequestToken; status: "error"; message: string };

function categoryLabel(item: BaziStrengthEvidenceItem): string {
  if (item.category === "month_command") return "月令主气";
  if (item.category === "visible_stem") return item.status === "excluded_day_master" ? "日主透干（不重复计权）" : "透干";
  if (item.category === "first_hidden_stem") return "首位藏干";
  return "其余藏干";
}

function statusLabel(item: BaziStrengthEvidenceItem): string {
  if (item.status === "included") return item.direction === "support" ? "计入支持侧" : "计入需求侧";
  if (item.status === "excluded_day_master") return "日主锚点 · 不计权";
  return "时辰不可靠 · withheld";
}

function isNonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

const STRENGTH_WEIGHT_TOLERANCE = 1e-9;

function strengthNumbersMatch(left: number, right: number): boolean {
  return Number.isFinite(left)
    && Number.isFinite(right)
    && Math.abs(left - right) <= STRENGTH_WEIGHT_TOLERANCE;
}

function nullableStrengthNumbersMatch(left: number | null, right: number | null): boolean {
  return left === null || right === null
    ? left === right
    : strengthNumbersMatch(left, right);
}

const CANONICAL_SHA256_PATTERN = /^[a-f0-9]{64}$/;
const UNSAFE_RENDER_TEXT_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/u;
const SENSITIVE_CREDENTIAL_PATTERN = /\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|bearer|secret|password)\b(?:\s*[:=]\s*|\s+)[^\s,;]+/giu;
const VISIBLE_URL_PATTERN = /\b(?:https?|file):\/\/[^\s"'<>]+/giu;
const LOCAL_WINDOWS_PATH_PATTERN = /(?:[a-z]:\\|\\\\)[^\s"'<>]+/giu;
const LOCAL_USER_PATH_PATTERN = /\/(?:users|home)\/[^\s"'<>]+/giu;
const STACK_TRACE_PATTERN = /\bstack\s*trace\b.*$/iu;
const MAX_LEDGER_IDENTIFIER_CHARACTERS = 256;
const MAX_LEDGER_RENDER_TEXT_CHARACTERS = 6_000;
const MAX_LEDGER_LIST_ENTRIES = 64;
const MAX_CROSSING_LABELS_IN_SUMMARY = 4;
const MAX_CROSSING_SUMMARY_LABEL_CHARACTERS = 56;
const INITIAL_EVIDENCE_ITEM_RENDER_COUNT = 48;
const EVIDENCE_ITEM_RENDER_STEP = 48;
const INITIAL_SCENARIO_RENDER_COUNT = 24;
const SCENARIO_RENDER_STEP = 24;
const INITIAL_CLAIM_RENDER_COUNT = 12;
const CLAIM_RENDER_STEP = 12;
const LEDGER_COLLECTION_LIMITS = {
  claims: 256,
  evidenceItems: 256,
  scenarioComparisons: 128,
  sources: 256,
  sourceBindings: 512
} as const;

function codePointLengthExceeds(value: string, maximumCharacters: number): boolean {
  let count = 0;
  for (const _character of value) {
    count += 1;
    if (count > maximumCharacters) return true;
  }
  return false;
}

function takeCodePoints(value: string, maximumCharacters: number): string {
  let result = "";
  let count = 0;
  for (const character of value) {
    if (count >= maximumCharacters) break;
    result += character;
    count += 1;
  }
  return result;
}

function isCanonicalSha256(value: unknown): value is string {
  return typeof value === "string" && CANONICAL_SHA256_PATTERN.test(value);
}

function isSafeRequiredLedgerText(value: unknown, maximumCharacters: number): value is string {
  return typeof value === "string"
    && value.trim().length > 0
    && !codePointLengthExceeds(value, maximumCharacters)
    && !UNSAFE_RENDER_TEXT_PATTERN.test(value);
}

function isSafeLedgerIdentifier(value: unknown): value is string {
  return isSafeRequiredLedgerText(value, MAX_LEDGER_IDENTIFIER_CHARACTERS)
    && value === value.trim()
    && !/\s/u.test(value);
}

function isSafeLedgerTextList(values: readonly unknown[], maximumEntries = MAX_LEDGER_LIST_ENTRIES): boolean {
  return values.length <= maximumEntries
    && values.every((value) => isSafeRequiredLedgerText(value, MAX_LEDGER_RENDER_TEXT_CHARACTERS));
}

function safeLedgerErrorMessage(reason: unknown): string {
  const fallback = "旺衰证据账本生成失败，请重试。";
  try {
    if (!(reason instanceof Error) || typeof reason.message !== "string") return fallback;
    const message = reason.message.replace(/\s+/gu, " ").trim();
    if (!message
      || codePointLengthExceeds(message, 240)
      || UNSAFE_RENDER_TEXT_PATTERN.test(message)) return fallback;
    return message
      .replace(SENSITIVE_CREDENTIAL_PATTERN, "[凭据已隐藏]")
      .replace(VISIBLE_URL_PATTERN, "[链接已隐藏]")
      .replace(LOCAL_WINDOWS_PATH_PATTERN, "[本地路径已隐藏]")
      .replace(LOCAL_USER_PATH_PATTERN, "[本地路径已隐藏]")
      .replace(STACK_TRACE_PATTERN, "[调用栈已隐藏]");
  } catch {
    return fallback;
  }
}

function shortBindingFingerprint(value: string): string {
  const normalized = value.trim();
  return normalized.length > 24
    ? `${normalized.slice(0, 12)}…${normalized.slice(-8)}`
    : normalized;
}

function compactLedgerSummaryLabel(value: string): string {
  const normalized = value.replace(/\s+/gu, " ").trim();
  return codePointLengthExceeds(normalized, MAX_CROSSING_SUMMARY_LABEL_CHARACTERS)
    ? `${takeCodePoints(normalized, MAX_CROSSING_SUMMARY_LABEL_CHARACTERS)}…`
    : normalized;
}

function hasExactEvidenceNarrativeProfile(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const expected = BAZI_STRENGTH_EVIDENCE_NARRATIVE_PROFILE as Readonly<Record<string, unknown>>;
  const expectedKeys = Object.keys(expected);
  let actualKeys: readonly PropertyKey[];
  try {
    actualKeys = Reflect.ownKeys(value);
  } catch {
    return false;
  }
  if (
    actualKeys.length !== expectedKeys.length
    || actualKeys.some((key) => typeof key !== "string" || !expectedKeys.includes(key))
  ) {
    return false;
  }
  return expectedKeys.every((key) => {
    try {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return Boolean(descriptor && "value" in descriptor && descriptor.value === expected[key]);
    } catch {
      return false;
    }
  });
}

function evidenceIntegrityIssue(result: BaziStrengthEvidenceNarrativeResult): string | null {
  if (!result || !hasExactEvidenceNarrativeProfile(result.profile)) {
    return "旺衰证据叙事 profile 不匹配";
  }
  const bindingDigests = [
    ["factsProjection", result.bindings?.factsProjectionSha256],
    ["strengthPolicy", result.bindings?.strengthPolicySha256],
    ["strengthAssessment", result.bindings?.strengthAssessmentSha256],
    ["strengthSensitivity", result.bindings?.strengthSensitivitySha256],
    ["claimRegistry", result.bindings?.claimRegistrySha256],
    ["orderedEvidenceItemIds", result.bindings?.orderedEvidenceItemIdsSha256],
    ["orderedNarrativeStatementIds", result.bindings?.orderedNarrativeStatementIdsSha256]
  ] as const;
  const invalidBindingDigest = bindingDigests.find(([, value]) => !isCanonicalSha256(value));
  if (invalidBindingDigest) {
    return `旺衰证据叙事包含非规范 SHA-256 绑定：${invalidBindingDigest[0]}`;
  }
  const bindingFingerprints = [
    result.bindings.factsProjectionSha256,
    result.bindings.strengthPolicySha256,
    result.bindings.strengthAssessmentSha256,
    result.bindings.strengthSensitivitySha256,
    result.bindings.claimRegistrySha256
  ];
  if (bindingFingerprints.some((fingerprint) => !fingerprint.trim())) {
    return "事实、政策、分档、敏感性或来源注册包含空输入指纹。";
  }
  if (
    !result.profile.projectionVersion.trim()
    || !result.bindings.strengthPolicyVersion.trim()
    || !result.bindings.claimRegistryVersion.trim()
  ) {
    return "证据账输入绑定包含空版本身份。";
  }

  const collectionSizes = [
    [result.claims.length, LEDGER_COLLECTION_LIMITS.claims],
    [result.evidenceItems.length, LEDGER_COLLECTION_LIMITS.evidenceItems],
    [result.scenarioComparisons.length, LEDGER_COLLECTION_LIMITS.scenarioComparisons],
    [result.sources.length, LEDGER_COLLECTION_LIMITS.sources],
    [result.sourceBindings.length, LEDGER_COLLECTION_LIMITS.sourceBindings]
  ] as const;
  if (collectionSizes.some(([size, maximum]) => size > maximum)) {
    return "旺衰证据账超过当前安全展示规模，已停止渲染。";
  }

  const identifierValues: readonly unknown[] = [
    result.profile.projectionVersion,
    result.profile.contentVersion,
    result.bindings.strengthPolicyVersion,
    result.bindings.claimRegistryVersion,
    result.classification.band,
    result.duplicateMonthMain.pairId,
    result.duplicateMonthMain.monthCommandEvidenceItemId,
    result.duplicateMonthMain.firstHiddenEvidenceItemId,
    ...result.claims.flatMap((claim) => [
      claim.claimId,
      claim.claimType,
      claim.traditionScope.tradition,
      claim.reviewStatus,
      claim.displayStatus,
      ...claim.sourceBindingIds
    ]),
    ...result.evidenceItems.flatMap((item) => [
      item.evidenceItemId,
      item.category,
      item.status,
      item.position,
      ...(item.factorId === null ? [] : [item.factorId]),
      ...(item.policyFactorGroup === null ? [] : [item.policyFactorGroup]),
      ...(item.direction === null ? [] : [item.direction]),
      ...item.claimIds
    ]),
    ...result.scenarioComparisons.flatMap((scenario) => [
      scenario.scenarioId,
      scenario.role,
      scenario.baselineBand,
      scenario.baselineDirection,
      scenario.scenarioBand,
      scenario.scenarioDirection,
      ...scenario.excludedFactorIds,
      ...scenario.reweightedFactorIds
    ]),
    ...result.sourceBindings.flatMap((binding) => [
      binding.bindingId,
      binding.sourceId,
      binding.exactLocator.verificationStatus,
      binding.parameterSupport
    ]),
    ...result.sources.flatMap((source) => [
      source.sourceId,
      source.verificationStatus,
      ...(source.stableRevision === null ? [] : [source.stableRevision])
    ])
  ];
  if (identifierValues.some((value) => !isSafeLedgerIdentifier(value))) {
    return "旺衰证据账包含空白、超长或不可安全显示的标识符。";
  }

  const renderedTextValues: readonly unknown[] = [
    result.classification.bandLabel,
    result.classification.intervalNotation,
    result.classification.directStatement,
    result.duplicateMonthMain.directStatement,
    ...result.claims.flatMap((claim) => [claim.candidateStatement]),
    ...result.evidenceItems.flatMap((item) => [
      item.positionLabel,
      item.directStatement,
      item.doesNotEstablish,
      ...(item.tenGod === null ? [] : [item.tenGod])
    ]),
    ...result.scenarioComparisons.flatMap((scenario) => [scenario.label, scenario.directStatement]),
    ...result.sourceBindings.flatMap((binding) => [
      binding.evidenceRole,
      binding.exactLocator.value,
      binding.supports
    ]),
    ...result.sources.flatMap((source) => [
      source.title,
      ...(typeof source.url === "string" && source.url.trim() ? [source.url] : []),
    ])
  ];
  if (renderedTextValues.some((value) => !isSafeRequiredLedgerText(value, MAX_LEDGER_RENDER_TEXT_CHARACTERS))) {
    return "旺衰证据账包含空白、超长或不可安全显示的正文。";
  }

  const renderedTextLists: readonly (readonly unknown[])[] = [
    ...result.claims.flatMap((claim) => [claim.applicabilityConditions, claim.counterexamples]),
    ...result.sourceBindings.map((binding) => binding.doesNotSupport)
  ];
  const referenceLists: readonly (readonly unknown[])[] = [
    ...result.claims.map((claim) => claim.sourceBindingIds),
    ...result.evidenceItems.map((item) => item.claimIds),
    ...result.scenarioComparisons.flatMap((scenario) => [scenario.excludedFactorIds, scenario.reweightedFactorIds])
  ];
  if (renderedTextLists.some((values) => !isSafeLedgerTextList(values))
    || referenceLists.some((values) => values.length > MAX_LEDGER_LIST_ENTRIES)) {
    return "旺衰证据账的单项正文或引用列表超过安全展示边界。";
  }

  const recomputedIncludedEvidenceItems = result.evidenceItems.filter((item) => item.status === "included");
  if (recomputedIncludedEvidenceItems.some((item) => {
    if (item.policyWeight === null || item.supportContribution === null || item.demandContribution === null) return true;
    return item.direction === "support"
      ? !strengthNumbersMatch(item.supportContribution, item.policyWeight) || !strengthNumbersMatch(item.demandContribution, 0)
      : item.direction === "demand"
        ? !strengthNumbersMatch(item.demandContribution, item.policyWeight) || !strengthNumbersMatch(item.supportContribution, 0)
        : true;
  })) {
    return "纳入因素的方向、政策权重与逐项贡献无法互相复算。";
  }
  if (result.evidenceItems.some((item) => item.status !== "included"
    && (item.policyWeight !== null || item.supportContribution !== null || item.demandContribution !== null))) {
    return "排除或 withheld 因素仍携带了可计入权重。";
  }

  const recomputedSupportWeight = recomputedIncludedEvidenceItems.reduce(
    (total, item) => total + (item.supportContribution ?? Number.NaN),
    0
  );
  const recomputedDemandWeight = recomputedIncludedEvidenceItems.reduce(
    (total, item) => total + (item.demandContribution ?? Number.NaN),
    0
  );
  const recomputedTotalWeight = recomputedSupportWeight + recomputedDemandWeight;
  const recomputedSupportRatio = recomputedTotalWeight > 0
    ? recomputedSupportWeight / recomputedTotalWeight
    : null;
  if (!strengthNumbersMatch(result.classification.supportWeight, recomputedSupportWeight)
    || !strengthNumbersMatch(result.classification.demandWeight, recomputedDemandWeight)
    || !strengthNumbersMatch(result.classification.totalWeight, recomputedTotalWeight)
    || !nullableStrengthNumbersMatch(result.classification.supportRatio, recomputedSupportRatio)) {
    return "分类小计无法由逐项证据贡献独立复算。";
  }
  if (result.classification.supportRatio !== null
    && (!Number.isFinite(result.classification.supportRatio)
      || result.classification.supportRatio < 0
      || result.classification.supportRatio > 1)) {
    return "分类支持侧比例不在 0 到 1 的闭区间内。";
  }

  const duplicateProjection = result.duplicateMonthMain;
  const duplicateMonthCommand = result.evidenceItems.find(
    (item) => item.evidenceItemId === duplicateProjection.monthCommandEvidenceItemId
  );
  const duplicateFirstHidden = result.evidenceItems.find(
    (item) => item.evidenceItemId === duplicateProjection.firstHiddenEvidenceItemId
  );
  if (!duplicateMonthCommand
    || !duplicateFirstHidden
    || duplicateMonthCommand.status !== "included"
    || duplicateFirstHidden.status !== "included"
    || duplicateMonthCommand.duplicateMonthMainPairId !== duplicateProjection.pairId
    || duplicateFirstHidden.duplicateMonthMainPairId !== duplicateProjection.pairId
    || duplicateMonthCommand.duplicateRole !== "month_command"
    || duplicateFirstHidden.duplicateRole !== "first_hidden_stem"
    || duplicateMonthCommand.policyWeight === null
    || duplicateFirstHidden.policyWeight === null
    || !strengthNumbersMatch(
      duplicateProjection.combinedPolicyWeight,
      duplicateMonthCommand.policyWeight + duplicateFirstHidden.policyWeight
    )) {
    return "月令与首位藏干的重复计权 pair 无法由对应证据项复算。";
  }

  const recomputedBaselineScenarios = result.scenarioComparisons.filter(
    (scenario) => scenario.role === "current_candidate_baseline"
  );
  const recomputedBaselineScenario = recomputedBaselineScenarios[0];
  if (recomputedBaselineScenarios.length !== 1
    || !recomputedBaselineScenario
    || recomputedBaselineScenario.scenarioBand !== result.classification.band
    || !strengthNumbersMatch(recomputedBaselineScenario.supportWeight, result.classification.supportWeight)
    || !strengthNumbersMatch(recomputedBaselineScenario.demandWeight, result.classification.demandWeight)
    || !nullableStrengthNumbersMatch(recomputedBaselineScenario.supportRatio, result.classification.supportRatio)) {
    return "敏感性账本没有唯一且与当前分类一致的工程基线。";
  }
  for (const scenario of result.scenarioComparisons) {
    const scenarioTotalWeight = scenario.supportWeight + scenario.demandWeight;
    const scenarioRatio = scenarioTotalWeight > 0 ? scenario.supportWeight / scenarioTotalWeight : null;
    const expectedRatioDelta = scenario.supportRatio === null || recomputedBaselineScenario.supportRatio === null
      ? null
      : scenario.supportRatio - recomputedBaselineScenario.supportRatio;
    if (!isNonNegativeFinite(scenario.supportWeight)
      || !isNonNegativeFinite(scenario.demandWeight)
      || (scenario.supportRatio !== null
        && (!Number.isFinite(scenario.supportRatio) || scenario.supportRatio < 0 || scenario.supportRatio > 1))
      || scenario.baselineBand !== recomputedBaselineScenario.scenarioBand
      || scenario.baselineDirection !== recomputedBaselineScenario.scenarioDirection
      || scenario.crossesBand !== (scenario.scenarioBand !== recomputedBaselineScenario.scenarioBand)
      || scenario.crossesDirection !== (scenario.scenarioDirection !== recomputedBaselineScenario.scenarioDirection)
      || !nullableStrengthNumbersMatch(scenario.supportRatio, scenarioRatio)
      || !strengthNumbersMatch(
        scenario.supportWeightDelta,
        scenario.supportWeight - recomputedBaselineScenario.supportWeight
      )
      || !strengthNumbersMatch(
        scenario.demandWeightDelta,
        scenario.demandWeight - recomputedBaselineScenario.demandWeight
      )
      || !nullableStrengthNumbersMatch(scenario.supportRatioDelta, expectedRatioDelta)) {
      return `敏感性情景 ${scenario.scenarioId} 无法由冻结基线复算。`;
    }
  }

  if (result.counts.claims !== result.claims.length) {
    return `主张计数声明为 ${result.counts.claims}，实际收到 ${result.claims.length}。`;
  }
  if (result.counts.evidenceItems !== result.evidenceItems.length) {
    return `证据项计数声明为 ${result.counts.evidenceItems}，实际收到 ${result.evidenceItems.length}。`;
  }
  if (result.counts.scenarioComparisons !== result.scenarioComparisons.length) {
    return `扰动场景计数声明为 ${result.counts.scenarioComparisons}，实际收到 ${result.scenarioComparisons.length}。`;
  }
  const crossingCount = result.scenarioComparisons.filter((scenario) => scenario.crossesBand).length;
  if (result.counts.crossingScenarios !== crossingCount) {
    return `跨档场景计数声明为 ${result.counts.crossingScenarios}，实际收到 ${crossingCount}。`;
  }
  const declaredCounts = [
    result.counts.claims,
    result.counts.evidenceItems,
    result.counts.scenarioComparisons,
    result.counts.crossingScenarios,
    result.counts.includedFactors
  ];
  if (declaredCounts.some((count) => !Number.isSafeInteger(count) || count < 0)) {
    return "证据账包含无效的负数、非整数或越界计数。";
  }
  const includedFactorCount = result.evidenceItems.filter((item) => item.status === "included").length;
  if (result.counts.includedFactors !== includedFactorCount) {
    return `计入因素声明为 ${result.counts.includedFactors}，实际收到 ${includedFactorCount}。`;
  }
  if (
    !isNonNegativeFinite(result.classification.supportWeight)
    || !isNonNegativeFinite(result.classification.demandWeight)
    || !isNonNegativeFinite(result.duplicateMonthMain.combinedPolicyWeight)
  ) {
    return "分档或月主气重复计权包含负数或非有限权重。";
  }

  const claimIds = new Set(result.claims.map((claim) => claim.claimId));
  if (result.claims.some((claim) => !claim.claimId.trim())) {
    return "主张账包含空 claimId。";
  }
  if (claimIds.size !== result.claims.length) {
    return "主张账包含重复 claimId。";
  }
  if (result.claims.some((claim, index) => !Number.isSafeInteger(claim.order) || claim.order !== index + 1)) {
    return "主张账展示序号必须从 1 开始并与列表顺序连续一致。";
  }
  const claimOrders = new Set(result.claims.map((claim) => claim.order));
  if (claimOrders.size !== result.claims.length) {
    return "主张账包含重复展示序号。";
  }
  const evidenceItemIds = new Set(result.evidenceItems.map((item) => item.evidenceItemId));
  if (result.evidenceItems.some((item) => !item.evidenceItemId.trim())) {
    return "证据项账包含空 evidenceItemId。";
  }
  if (evidenceItemIds.size !== result.evidenceItems.length) {
    return "证据项账包含重复 evidenceItemId。";
  }
  if (result.evidenceItems.some((item, index) => !Number.isSafeInteger(item.order) || item.order !== index + 1)) {
    return "证据项展示序号必须从 1 开始并与列表顺序连续一致。";
  }
  const scenarioIds = new Set(result.scenarioComparisons.map((scenario) => scenario.scenarioId));
  if (result.scenarioComparisons.some((scenario) => !scenario.scenarioId.trim())) {
    return "扰动场景账包含空 scenarioId。";
  }
  if (scenarioIds.size !== result.scenarioComparisons.length) {
    return "扰动场景账包含重复 scenarioId。";
  }
  const bindingIds = new Set(result.sourceBindings.map((binding) => binding.bindingId));
  if (result.sourceBindings.some((binding) => !binding.bindingId.trim() || !binding.sourceId.trim() || !binding.exactLocator.value.trim())) {
    return "来源定位账包含空绑定、空来源或空定位。";
  }
  if (bindingIds.size !== result.sourceBindings.length) {
    return "来源定位账包含重复 bindingId。";
  }
  const sourceIds = new Set(result.sources.map((source) => source.sourceId));
  if (result.sources.some((source) => !source.sourceId.trim() || !source.title.trim())) {
    return "来源账包含空 sourceId 或空标题。";
  }
  if (sourceIds.size !== result.sources.length) {
    return "来源账包含重复 sourceId。";
  }
  if (result.sources.some((source) => (
    source.sourceType === "engineering_contract"
      ? !safeRepositorySourcePath(source.url)
      : !safeExternalSourceUrl(source.url)
  ))) {
    return "来源账包含与来源类型不一致或无法安全解析的地址。";
  }

  for (const item of result.evidenceItems) {
    if (new Set(item.claimIds).size !== item.claimIds.length) {
      return `证据项 ${item.evidenceItemId} 重复引用了同一主张。`;
    }
    if (item.policyWeight !== null && !isNonNegativeFinite(item.policyWeight)) {
      return `证据项 ${item.evidenceItemId} 包含负数或非有限政策权重。`;
    }
    if (item.status === "included" && (item.policyWeight === null || (item.direction !== "support" && item.direction !== "demand"))) {
      return `计入证据项 ${item.evidenceItemId} 缺少权重或支持侧／需求侧权重（非吉凶）方向。`;
    }
    const missingClaimId = item.claimIds.find((claimId) => !claimIds.has(claimId));
    if (missingClaimId) {
      return `证据项 ${item.evidenceItemId} 引用了不存在的主张 ${missingClaimId}。`;
    }
  }
  for (const claim of result.claims) {
    if (new Set(claim.sourceBindingIds).size !== claim.sourceBindingIds.length) {
      return `主张 ${claim.claimId} 重复引用了同一来源定位。`;
    }
    const missingBindingId = claim.sourceBindingIds.find((bindingId) => !bindingIds.has(bindingId));
    if (missingBindingId) {
      return `主张 ${claim.claimId} 引用了不存在的来源定位 ${missingBindingId}。`;
    }
  }
  for (const binding of result.sourceBindings) {
    if (!sourceIds.has(binding.sourceId)) {
      return `来源定位 ${binding.bindingId} 引用了不存在的来源 ${binding.sourceId}。`;
    }
  }
  if (
    result.scenarioComparisons.some(
      (scenario) => !Number.isFinite(scenario.supportWeightDelta) || !Number.isFinite(scenario.demandWeightDelta)
    )
  ) {
    return "扰动场景账包含非有限权重变化。";
  }
  return null;
}

function safeExternalSourceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

function safeRepositorySourcePath(value: string): string | null {
  if (
    typeof value !== "string"
    || value.length > 512
    || !value.startsWith("/packages/")
    || value.includes("\\")
    || UNSAFE_RENDER_TEXT_PATTERN.test(value)
  ) {
    return null;
  }
  const segments = value.split("/").slice(1);
  return segments.length >= 3 && segments.every((segment) => segment && segment !== "." && segment !== "..")
    ? value
    : null;
}

function sourceLink(source: BaziStrengthClaimSource) {
  const externalUrl = safeExternalSourceUrl(source.url);
  const externalHost = externalUrl ? new URL(externalUrl).hostname : null;
  return externalUrl ? (
    <a className="bazi-strength-external-source" href={externalUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" title="在新窗口打开外部 HTTPS 来源">{source.title}<span className="bazi-strength-external-source__host">{externalHost}</span><span className="sr-only">（新窗口）</span><ExternalLink aria-hidden="true" /></a>
  ) : (
    <strong>{source.title}</strong>
  );
}

function ClaimCard({
  claim,
  claimIdPrefix,
  bindingById,
  sourceById
}: {
  claim: BaziStrengthClaim;
  claimIdPrefix: string;
  bindingById: ReadonlyMap<string, BaziStrengthClaimSourceBinding>;
  sourceById: ReadonlyMap<string, BaziStrengthClaimSource>;
}) {
  const cardId = `${claimIdPrefix}-claim-${claim.order}`;
  const titleId = `${claimIdPrefix}-claim-title-${claim.order}`;
  const bindings = claim.sourceBindingIds.map((bindingId) => {
    const binding = bindingById.get(bindingId);
    if (!binding) throw new Error(`旺衰主张 ${claim.claimId} 的来源定位无法解析`);
    return binding;
  });
  return (
    <article
      id={cardId}
      className="bazi-strength-claim-card"
      tabIndex={-1}
      aria-labelledby={titleId}
      data-claim-id={claim.claimId}
      data-claim-type={claim.claimType}
      data-tradition={claim.traditionScope.tradition}
      data-source-count={bindings.length}
      data-review-status={claim.reviewStatus}
      data-display-status={claim.displayStatus}
      data-expert-truth-claimed="false"
      data-scientific-validity-claimed="false"
      data-formal-activation-allowed="false"
      data-result="null"
    >
      <header>
        <div><small>Claim {String(claim.order).padStart(2, "0")} · {claim.claimType}</small><h4 id={titleId}>{claim.candidateStatement}</h4></div>
        <StatusPill tone={claim.displayStatus.startsWith("withheld") ? "warning" : "info"}>
          {claim.displayStatus.startsWith("withheld") ? "来源待核 · 不启用" : "来源已绑定 · 非采信"}
        </StatusPill>
      </header>
      <code>{claim.claimId}</code>
      <div className="bazi-strength-claim-context">
        <section data-context="applicability"><strong>成立条件</strong><ul>{claim.applicabilityConditions.map((condition) => <li key={condition}>{condition}</li>)}</ul></section>
        <section data-context="counterexamples"><strong>反例／改写门</strong><ul>{claim.counterexamples.map((counterexample) => <li key={counterexample}>{counterexample}</li>)}</ul></section>
      </div>
      <ul className="bazi-strength-source-bindings" aria-label={`${claim.claimId} 来源定位`}>
        {bindings.map((binding) => {
          const source = sourceById.get(binding.sourceId);
          if (!source) throw new Error(`旺衰来源定位 ${binding.bindingId} 的来源无法解析`);
          return (
            <li
              key={binding.bindingId}
              data-binding-id={binding.bindingId}
              data-locator-verification={binding.exactLocator.verificationStatus}
              data-parameter-support={binding.parameterSupport}
              data-source-verification={source.verificationStatus}
            >
              <div>{sourceLink(source)}<span>{binding.evidenceRole}</span></div>
              <p><strong>定位：</strong>{binding.exactLocator.value}</p>
              <p><strong>可支持：</strong>{binding.supports}</p>
              <p><strong>不可支持：</strong>{binding.doesNotSupport.join("；")}</p>
              <small>工程来源状态 {source.verificationStatus} · revision {source.stableRevision ?? "unfrozen"} · content hash:null</small>
            </li>
          );
        })}
      </ul>
      <small className="bazi-strength-claim-boundary">
        tradition:{claim.traditionScope.tradition} · expert truth:false · scientific validity:false · formal activation:false · result:null
      </small>
    </article>
  );
}

function EvidenceReady({ result, claimIdPrefix }: { result: BaziStrengthEvidenceNarrativeResult; claimIdPrefix: string }) {
  const bindingTitleId = useId();
  const evidenceListId = useId();
  const scenarioListId = useId();
  const claimListId = useId();
  const [scenarioLedgerOpen, setScenarioLedgerOpen] = useState(false);
  const [claimLedgerOpen, setClaimLedgerOpen] = useState(false);
  const [visibleEvidenceItemCount, setVisibleEvidenceItemCount] = useState(INITIAL_EVIDENCE_ITEM_RENDER_COUNT);
  const [visibleScenarioCount, setVisibleScenarioCount] = useState(INITIAL_SCENARIO_RENDER_COUNT);
  const [visibleClaimCount, setVisibleClaimCount] = useState(INITIAL_CLAIM_RENDER_COUNT);
  const claimById = useMemo(
    () => new Map(result.claims.map((claim) => [claim.claimId, claim] as const)),
    [result.claims]
  );
  const bindingById = useMemo(
    () => new Map(result.sourceBindings.map((binding) => [binding.bindingId, binding] as const)),
    [result.sourceBindings]
  );
  const sourceById = useMemo(
    () => new Map(result.sources.map((source) => [source.sourceId, source] as const)),
    [result.sources]
  );
  const crossing = result.scenarioComparisons.filter((scenario) => scenario.crossesBand);
  const visibleEvidenceItems = result.evidenceItems.slice(0, visibleEvidenceItemCount);
  const hiddenEvidenceItemCount = result.evidenceItems.length - visibleEvidenceItems.length;
  const visibleScenarios = result.scenarioComparisons.slice(0, visibleScenarioCount);
  const hiddenScenarioCount = result.scenarioComparisons.length - visibleScenarios.length;
  const visibleClaims = result.claims.slice(0, visibleClaimCount);
  const hiddenClaimCount = result.claims.length - visibleClaims.length;
  const crossingSummaryLabels = crossing
    .slice(0, MAX_CROSSING_LABELS_IN_SUMMARY)
    .map((scenario) => compactLedgerSummaryLabel(scenario.label));
  const omittedCrossingSummaryLabelCount = crossing.length - crossingSummaryLabels.length;
  const crossingSummary = crossing.length
    ? `跨档：${crossingSummaryLabels.join("、")}${omittedCrossingSummaryLabelCount > 0 ? `；另 ${omittedCrossingSummaryLabelCount} 个场景` : ""}`
    : `${result.counts.scenarioComparisons} 个场景均未跨档；这仍不证明规则正确`;
  const withheldClaimCount = result.claims.filter((claim) => claim.displayStatus.startsWith("withheld")).length;
  const supportWeight = Math.max(0, result.classification.supportWeight);
  const demandWeight = Math.max(0, result.classification.demandWeight);
  const totalWeight = supportWeight + demandWeight;
  const hasWeightedEvidence = totalWeight > 0;
  const supportWeightPercent = hasWeightedEvidence ? Math.min(100, (supportWeight / totalWeight) * 100) : 0;
  const bindingFingerprints = [
    {
      kind: "facts",
      label: "事实投影",
      detail: result.profile.projectionVersion,
      fingerprint: result.bindings.factsProjectionSha256
    },
    {
      kind: "strength-policy",
      label: "旺衰政策",
      detail: `${result.bindings.strengthPolicyVersion} · ${result.bindings.interpretationRulePackId}@${result.bindings.interpretationRuleVersion}`,
      fingerprint: result.bindings.strengthPolicySha256
    },
    {
      kind: "assessment",
      label: "当前分档",
      detail: result.classification.bandLabel,
      fingerprint: result.bindings.strengthAssessmentSha256
    },
    {
      kind: "sensitivity",
      label: "敏感性账",
      detail: `${result.counts.scenarioComparisons} 个工程场景`,
      fingerprint: result.bindings.strengthSensitivitySha256
    },
    {
      kind: "claims",
      label: "来源—主张注册",
      detail: result.bindings.claimRegistryVersion,
      fingerprint: result.bindings.claimRegistrySha256
    },
    {
      kind: "evidence-order",
      label: "证据项顺序",
      detail: `${result.counts.evidenceItems} 个稳定 ID`,
      fingerprint: result.bindings.orderedEvidenceItemIdsSha256
    },
    {
      kind: "narrative-order",
      label: "叙事语句顺序",
      detail: "稳定语句 ID 序列",
      fingerprint: result.bindings.orderedNarrativeStatementIdsSha256
    }
  ] as const;

  return (
    <>
      <dl className="bazi-strength-evidence-summary">
        <div data-metric="band"><dt>冻结政策区间标签</dt><dd>{result.classification.bandLabel}</dd><small>工程区间 {result.classification.intervalNotation}</small></div>
        <div data-metric="weights">
          <dt>支持侧／需求侧权重（非吉凶）</dt>
          <dd>{result.classification.supportWeight} / {result.classification.demandWeight}</dd>
          <span
            className="bazi-strength-weight-balance"
            role="img"
            aria-label={hasWeightedEvidence ? `支持侧权重 ${supportWeight}，需求侧权重 ${demandWeight}` : "当前没有可绘制的支持或需求权重"}
            data-empty={!hasWeightedEvidence}
          >
            <span style={{ inlineSize: `${supportWeightPercent}%` }} />
          </span>
          <small>逐项贡献复演</small>
        </div>
        <div data-metric="evidence"><dt>因素／证据项</dt><dd>{result.counts.includedFactors} / {result.counts.evidenceItems}</dd><small>排除与 withheld 单列</small></div>
        <div data-metric="scenarios"><dt>跨档场景</dt><dd>{result.counts.crossingScenarios} / {result.counts.scenarioComparisons}</dd><small>仅工程扰动</small></div>
      </dl>

      <div className="bazi-strength-direction-key" role="note" aria-label="支持侧与需求侧方向说明">
        <span data-direction="support"><i aria-hidden="true" />支持侧</span>
        <span data-direction="demand"><i aria-hidden="true" />需求侧</span>
        <small>两侧只表示冻结政策中的权重归组，不映射吉凶、喜忌或事件结果。</small>
      </div>

      <section
        className="bazi-strength-input-binding"
        aria-labelledby={bindingTitleId}
        data-fingerprint-count={bindingFingerprints.length}
        data-expert-truth-claimed="false"
      >
        <header>
          <div>
            <small>Derivation identity rail</small>
            <h4 id={bindingTitleId}>本次工程分档绑定到哪组输入</h4>
          </div>
          <StatusPill tone="neutral">{bindingFingerprints.length} 个只读指纹</StatusPill>
        </header>
        <ol aria-label="当前旺衰派生输入指纹">
          {bindingFingerprints.map((binding, index) => (
            <li key={binding.kind} data-binding-kind={binding.kind}>
              <span>{String(index + 1).padStart(2, "0")} · {binding.label}</span>
              <strong>{binding.detail}</strong>
              <code title={binding.fingerprint}>{shortBindingFingerprint(binding.fingerprint)}</code>
            </li>
          ))}
        </ol>
        <details className="bazi-strength-binding-digests">
          <summary><span>完整输入指纹</span><small>{bindingFingerprints.length} 项 SHA-256 · 可选择核对</small></summary>
          <dl aria-label="当前旺衰派生完整输入指纹">
            {bindingFingerprints.map((binding) => (
              <div key={binding.kind}>
                <dt>{binding.label}</dt>
                <dd><span>{binding.detail}</span><code>{binding.fingerprint}</code></dd>
              </div>
            ))}
          </dl>
        </details>
        <p>指纹只确认本次派生针对哪组事实与工程资产；可追溯不等于规则正确、专家认可或结果准确。</p>
      </section>

      <div className="bazi-strength-classification-direct" data-output="engineering-candidate">
        <small>当前冻结政策输出 · 非专家裁定</small>
        <p>{result.classification.directStatement}</p>
      </div>
      <div className="bazi-strength-month-duplicate" data-duplicate-detected={result.duplicateMonthMain.detected}>
        <strong>月主气重复计权：{result.duplicateMonthMain.combinedPolicyWeight}</strong>
        <span>{result.duplicateMonthMain.directStatement}</span>
      </div>

      <ol id={evidenceListId} className="bazi-strength-evidence-items" aria-label="当前盘旺衰逐项证据账">
        {visibleEvidenceItems.map((item) => (
          <li
            key={item.evidenceItemId}
            data-evidence-item-id={item.evidenceItemId}
            data-order={item.order}
            data-category={item.category}
            data-status={item.status}
            data-factor-id={item.factorId ?? "null"}
            data-group={item.policyFactorGroup ?? "null"}
            data-position={item.position}
            data-strength-direction={item.direction ?? "null"}
            data-weight={item.policyWeight ?? "null"}
            data-claim-count={item.claimIds.length}
            data-month-main-duplicate-role={item.duplicateRole ?? "none"}
            data-expert-truth-claimed="false"
            data-good-bad-orientation="null"
            data-result="null"
          >
            <article>
              <header>
                <div><small>{String(item.order).padStart(2, "0")} · {item.positionLabel}</small><h4>{categoryLabel(item)}</h4></div>
                <StatusPill tone={item.status === "included" ? "info" : item.status === "excluded_day_master" ? "neutral" : "warning"}>{statusLabel(item)}</StatusPill>
              </header>
              <p>{item.directStatement}</p>
              <div className="bazi-strength-evidence-meta">
                <span>factor {item.factorId ?? "null"}</span>
                <span>{item.tenGod ?? "无十神"} · {item.policyWeight === null ? "不计权" : `权重 ${item.policyWeight}`}</span>
              </div>
              <nav aria-label={`${item.evidenceItemId} 主张绑定`}>
                {item.claimIds.map((claimId) => {
                  const claim = claimById.get(claimId);
                  if (!claim) throw new Error(`旺衰证据项引用未知主张：${claimId}`);
                  const targetId = `${claimIdPrefix}-claim-${claim.order}`;
                  return (
                    <a
                      key={claimId}
                      href={`#${targetId}`}
                      title={`展开来源账并定位到主张 ${String(claim.order).padStart(2, "0")}`}
                      onClick={(event) => {
                        const ownerDocument = event.currentTarget.ownerDocument;
                        setVisibleClaimCount((current) => Math.max(current, claim.order));
                        setClaimLedgerOpen(true);
                        ownerDocument.defaultView?.requestAnimationFrame(() => {
                          const target = ownerDocument.getElementById(targetId);
                          target?.scrollIntoView({ block: "nearest" });
                          target?.focus({ preventScroll: true });
                        });
                      }}
                    >
                      {`主张 ${String(claim.order).padStart(2, "0")}`}
                    </a>
                  );
                })}
              </nav>
              <small>{item.doesNotEstablish}</small>
            </article>
          </li>
        ))}
      </ol>
      {hiddenEvidenceItemCount > 0 ? (
        <div className="bazi-strength-progress" data-progress-kind="evidence" role="status">
          <span>已显示 {visibleEvidenceItems.length} / {result.evidenceItems.length} 条证据项；剩余内容尚未挂载。</span>
          <button type="button" className="secondary-action" aria-controls={evidenceListId} onClick={() => setVisibleEvidenceItemCount((current) => Math.min(result.evidenceItems.length, current + EVIDENCE_ITEM_RENDER_STEP))}>继续显示 {Math.min(EVIDENCE_ITEM_RENDER_STEP, hiddenEvidenceItemCount)} 条</button>
        </div>
      ) : null}

      <details
        className="bazi-strength-scenario-comparisons"
        open={scenarioLedgerOpen}
        onToggle={(event) => setScenarioLedgerOpen(event.currentTarget.open)}
        data-crossing-count={crossing.length}
        data-summary-label-count={crossingSummaryLabels.length}
      >
        <summary>
          <span><strong>哪些工程假设会令当前候选跨档</strong><small>{crossingSummary}</small></span>
          <StatusPill tone={crossing.length ? "warning" : "neutral"}>{result.counts.crossingScenarios}/{result.counts.scenarioComparisons} 跨档</StatusPill>
        </summary>
        {scenarioLedgerOpen ? <div className="bazi-strength-scenario-body">
        <div id={scenarioListId} className="bazi-strength-scenario-list" role="list" aria-label="旺衰跨档工程场景">
          {visibleScenarios.map((scenario) => (
            <article
              key={scenario.scenarioId}
              role="listitem"
              data-scenario-id={scenario.scenarioId}
              data-crosses-band={scenario.crossesBand}
              data-crosses-direction={scenario.crossesDirection}
              data-official-rule-candidate="false"
              data-result="null"
            >
              <header><strong>{scenario.label}</strong><span>{scenario.baselineBand} → {scenario.scenarioBand}</span></header>
              <p>{scenario.directStatement}</p>
              <small>排除 {scenario.excludedFactorIds.length} · 重计权 {scenario.reweightedFactorIds.length} · 支持侧 Δ {scenario.supportWeightDelta} · 需求侧 Δ {scenario.demandWeightDelta}</small>
            </article>
          ))}
        </div>
        {hiddenScenarioCount > 0 ? <div className="bazi-strength-progress" data-progress-kind="scenarios" role="status"><span>已显示 {visibleScenarios.length} / {result.scenarioComparisons.length} 个工程场景。</span><button type="button" className="secondary-action" aria-controls={scenarioListId} onClick={() => setVisibleScenarioCount((current) => Math.min(result.scenarioComparisons.length, current + SCENARIO_RENDER_STEP))}>继续显示 {Math.min(SCENARIO_RENDER_STEP, hiddenScenarioCount)} 个</button></div> : null}
        </div> : null}
      </details>

      <details className="bazi-strength-claim-ledger" open={claimLedgerOpen} onToggle={(event) => setClaimLedgerOpen(event.currentTarget.open)}>
        <summary>
          <span><strong>查看 {result.counts.claims} 条来源—主张账</strong><small>每条都有 locator、条件、反例与不可支持范围</small></span>
          <StatusPill tone={withheldClaimCount ? "warning" : "neutral"}>待核 {withheldClaimCount} / {result.counts.claims}</StatusPill>
        </summary>
        {claimLedgerOpen ? <>
        <div id={claimListId} className="bazi-strength-claim-list">
          {visibleClaims.map((claim) => (
            <ClaimCard key={claim.claimId} claim={claim} claimIdPrefix={claimIdPrefix} bindingById={bindingById} sourceById={sourceById} />
          ))}
        </div>
        {hiddenClaimCount > 0 ? <div className="bazi-strength-progress" data-progress-kind="claims" role="status"><span>已显示 {visibleClaims.length} / {result.claims.length} 条来源—主张账。</span><button type="button" className="secondary-action" aria-controls={claimListId} onClick={() => setVisibleClaimCount((current) => Math.min(result.claims.length, current + CLAIM_RENDER_STEP))}>继续显示 {Math.min(CLAIM_RENDER_STEP, hiddenClaimCount)} 条</button></div> : null}
        </> : null}
      </details>

      <small className="bazi-strength-evidence-boundary">
        projection {result.profile.projectionVersion} · policy {result.bindings.strengthPolicyVersion} · claim registry {result.bindings.claimRegistryVersion} · review inheritance:false · network:false · mutation:false · expert truth:false · scientific validity:false · formal activation:false · good/bad:null · useful god:null · structure:null · event:null · result:null
      </small>
    </>
  );
}

function safeEvidenceIntegrityIssue(result: BaziStrengthEvidenceNarrativeResult): string | null {
  try {
    return evidenceIntegrityIssue(result);
  } catch {
    return "旺衰证据叙事结构无法安全解析";
  }
}
export function BaziStrengthEvidenceLedgerPanel({
  facts,
  includeHour,
  interpretation,
  strengthSensitivity,
  bindingKey
}: {
  facts: ChartFacts;
  includeHour: boolean;
  interpretation: BaziInterpretationResult;
  strengthSensitivity: StrengthSensitivityReview;
  bindingKey: string;
}) {
  const titleId = useId();
  const scopeId = useId();
  const claimIdPrefix = useId();
  const [retryVersion, setRetryVersion] = useState(0);
  const requestToken = useMemo<EvidenceRequestToken>(() => ({
    bindingKey,
    retryVersion,
    facts,
    includeHour,
    interpretation,
    strengthSensitivity
  }), [bindingKey, facts, includeHour, interpretation, retryVersion, strengthSensitivity]);
  const [state, setState] = useState<EvidenceState>({ requestToken, status: "loading" });

  useEffect(() => {
    let current = true;
    setState({ requestToken, status: "loading" });
    void Promise.resolve()
      .then(() => buildBaziStrengthEvidenceNarrative({
        facts: requestToken.facts,
        includeHour: requestToken.includeHour,
        interpretation: requestToken.interpretation,
        strengthSensitivity: requestToken.strengthSensitivity
      }))
      .then((result) => {
        if (current) setState({ requestToken, status: "resolved", result });
      })
      .catch((reason: unknown) => {
        if (!current) return;
        setState({
          requestToken,
          status: "error",
          message: safeLedgerErrorMessage(reason)
        });
      });
    return () => {
      current = false;
    };
  }, [requestToken]);

  const currentState = state.requestToken === requestToken ? state : { requestToken, status: "loading" as const };
  const result = currentState.status === "resolved" ? currentState.result : null;
  const integrityIssue = useMemo(
    () => result ? safeEvidenceIntegrityIssue(result) : null,
    [result]
  );
  const displayedResult = integrityIssue ? null : result;
  const displayState = integrityIssue ? "error" : displayedResult ? "bound" : currentState.status;
  return (
    <section
      className="bazi-strength-evidence-ledger"
      aria-labelledby={titleId}
      aria-describedby={scopeId}
      aria-busy={currentState.status === "loading"}
      data-projection-version={BAZI_STRENGTH_EVIDENCE_NARRATIVE_PROFILE.projectionVersion}
      data-content-version={BAZI_STRENGTH_EVIDENCE_NARRATIVE_PROFILE.contentVersion}
      data-binding-state={displayState}
      data-include-hour={includeHour}
      data-factor-count={displayedResult ? displayedResult.counts.includedFactors : "null"}
      data-evidence-item-count={displayedResult ? displayedResult.counts.evidenceItems : "null"}
      data-claim-count={displayedResult ? displayedResult.counts.claims : "null"}
      data-withheld-position-count={displayedResult ? displayedResult.executionScope.withheldPositions.length : "null"}
      data-strength-band={displayedResult?.classification.band ?? "null"}
      data-facts-sha256={displayedResult?.bindings.factsProjectionSha256 ?? "null"}
      data-interpretation-rule-pack-id={displayedResult?.bindings.interpretationRulePackId ?? "null"}
      data-interpretation-rule-version={displayedResult?.bindings.interpretationRuleVersion ?? "null"}
      data-strength-policy-sha256={displayedResult?.bindings.strengthPolicySha256 ?? "null"}
      data-strength-assessment-sha256={displayedResult?.bindings.strengthAssessmentSha256 ?? "null"}
      data-strength-sensitivity-sha256={displayedResult?.bindings.strengthSensitivitySha256 ?? "null"}
      data-claim-registry-sha256={displayedResult?.bindings.claimRegistrySha256 ?? "null"}
      data-ordered-evidence-item-ids-sha256={displayedResult?.bindings.orderedEvidenceItemIdsSha256 ?? "null"}
      data-ordered-narrative-statement-ids-sha256={displayedResult?.bindings.orderedNarrativeStatementIdsSha256 ?? "null"}
      data-schema-family="legacy-v13"
      data-release-identity="legacy-v13"
      data-release-family="legacy-v13"
      data-db-generation="13"
      data-target-schema="13"
      data-migration-id="null"
      data-integrity-check={integrityIssue ? "failed" : displayedResult ? "locally-recomputed" : "not-run"}
      data-engineering-evidence-only="true"
      data-derivation-state={displayState}
      data-expert-truth-established="false"
      data-formal-truth-established="false"
      data-expert-truth-claimed="false"
      data-scientific-validity-claimed="false"
      data-formal-activation-allowed="false"
      data-public-release-authorized="false"
      data-mutation-epoch-bypassed="false"
      data-chart-or-storage-mutation-performed="false"
      data-record-write-state="not_started"
      data-good-bad-orientation="null"
      data-event-outcome="null"
      data-result="null"
    >
      <header>
        <div>
          <small>Source-bound strength evidence · {BAZI_STRENGTH_EVIDENCE_NARRATIVE_PROFILE.contentVersion}</small>
          <h3 id={titleId}>旺衰工程分档如何形成</h3>
          <p>按“月令 → 全部透干 → 首位藏干 → 其余藏干”逐项展开；每句话可追到当前事实、工程政策、传统语境或待核复核门。</p>
        </div>
        <StatusPill tone={displayState === "error" ? "cinnabar" : "neutral"}>
          {displayedResult ? `${displayedResult.counts.includedFactors} 因素 · ${displayedResult.counts.claims} 候选主张` : displayState === "error" ? "完整性失败" : "正在建立绑定"}
        </StatusPill>
      </header>
      <div id={scopeId} className="bazi-strength-evidence-scope" role="note">
        <strong>工程候选边界</strong>
        <p>分档只复演当前冻结政策与当前事实；数量、权重和跨档场景不构成准确度、专家裁定或吉凶评分。</p>
        <span>LEGACY-V13 · SCHEMA 13 · MIGRATION NULL · READ ONLY · NO FORMAL ACTIVATION</span>
      </div>
      {currentState.status === "loading" ? <div className="bazi-strength-evidence-loading" role="status" aria-live="polite"><span aria-hidden="true" /><p>正在从当前命盘与单一政策重新派生证据账…</p></div> : null}
      {currentState.status === "error" ? <div className="bazi-strength-evidence-error" role="alert"><div><strong>证据账未展示</strong><p>{currentState.message} 当前没有保留旧结果或回退为零值。</p></div><button type="button" className="secondary-action" onClick={() => setRetryVersion((current) => current + 1)}><RefreshCw aria-hidden="true" />重新进行只读派生</button></div> : null}
      {integrityIssue ? (
        <div className="bazi-strength-evidence-integrity" role="alert">
          <CircleAlert aria-hidden="true" />
          <div><strong>证据图完整性失败</strong><p>{integrityIssue} 已停止呈现不完整账目；不会保留旧结果或补成近似值。</p></div>
          <button type="button" className="secondary-action" onClick={() => setRetryVersion((current) => current + 1)}>
            <RefreshCw aria-hidden="true" />重新进行只读派生
          </button>
        </div>
      ) : null}
      {displayedResult ? <EvidenceReady result={displayedResult} claimIdPrefix={claimIdPrefix} /> : null}
    </section>
  );
}
