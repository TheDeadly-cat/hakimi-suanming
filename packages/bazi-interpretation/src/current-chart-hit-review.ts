import type { ChartFacts } from "@hakimi/contracts";
import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import {
  BAZI_CONTENT_REVIEW_QUEUE,
  type BaziContentReviewItem,
  type BaziContentReviewSourceRef
} from "./content-review-queue";
import type {
  BaziContentReviewFeedbackDecision,
  BaziContentReviewFeedbackReviewer,
  BaziContentReviewFeedbackSession
} from "./content-review-feedback";
import type { BaziInterpretationResult, PillarPosition, StrengthAssessment } from "./index";
import {
  BAZI_CURRENT_CHART_FACTS_PROJECTION_VERSION,
  activeBaziStrengthPositions,
  assertBaziStrengthDerivedSnapshot,
  buildBaziStrengthSharedSnapshot,
  type BaziCurrentChartReviewFactsProjection
} from "./current-chart-review-snapshot";
import {
  buildShenshaOccurrenceReview,
  type ShenshaOccurrenceReviewItem,
  type ShenshaOccurrenceReviewResult
} from "./shensha-occurrence-review";
import {
  deriveShenshaResearchFacts,
  type ShenshaResearchResult
} from "./shensha-research";
import { BAZI_STRENGTH_POLICY } from "./strength-policy";
import {
  buildBaziStrengthEvidenceNarrative,
  type BaziStrengthEvidenceNarrativeResult
} from "./strength-evidence-narrative";
import type { StrengthSensitivityReview } from "./strength-sensitivity-review";
import {
  buildTenGodOccurrenceReview,
  type TenGodOccurrenceReviewItem,
  type TenGodOccurrenceReviewResult
} from "./ten-god-occurrence-review";

export const BAZI_CURRENT_CHART_HIT_REVIEW_PROFILE = Object.freeze({
  formatVersion: "hakimi.bazi.current_chart_hit_review/0.2.0",
  contentVersion: "0.18.0",
  scope: "current_chart_semantic_instances_only" as const,
  workflowMode: "human_attributed_read_only_preflight" as const,
  identityPolicy: "self_declared_not_verified" as const,
  signaturePolicy: "none" as const,
  integrationPolicy: "manual_code_review_only" as const,
  mutationPolicy: "no_chart_or_storage_write" as const,
  allowedDecisions: Object.freeze(["unresolved", "approve", "revise", "reject"] as const),
  allowedOrientationProposals: Object.freeze([
    "unresolved",
    "potentially_supportive",
    "potentially_challenging",
    "mixed_conditional",
    "not_assessable"
  ] as const),
  expertTruthClaimed: false as const,
  scientificValidityClaimed: false as const,
  formalActivationAllowed: false as const,
  autoIntegrationAllowed: false as const
});

export const BAZI_CURRENT_CHART_HIT_REVIEW_FILENAME =
  "hakimi-bazi-current-chart-hit-review-v018.json" as const;

export const BAZI_CURRENT_CHART_PACKET_PROJECTION_VERSION =
  "hakimi.bazi.current_chart_hit_packet/0.2.0" as const;

export {
  BAZI_CURRENT_CHART_FACTS_PROJECTION_VERSION,
  activeBaziStrengthPositions,
  assertBaziStrengthDerivedSnapshot,
  buildBaziCurrentChartReviewFactsProjection,
  buildBaziStrengthSharedSnapshot,
  type BaziCurrentChartReviewFactsPillar,
  type BaziCurrentChartReviewFactsProjection,
  type BaziStrengthSharedSnapshot,
  type BaziStrengthSharedSnapshotBindings,
  type BaziStrengthSharedSnapshotInput
} from "./current-chart-review-snapshot";

export type BaziCurrentChartOrientationProposal =
  (typeof BAZI_CURRENT_CHART_HIT_REVIEW_PROFILE.allowedOrientationProposals)[number];

export interface BuildBaziCurrentChartHitReviewInput {
  facts: ChartFacts;
  includeHour: boolean;
  interpretation: BaziInterpretationResult;
  strengthSensitivity: StrengthSensitivityReview;
  tenGodOccurrences: TenGodOccurrenceReviewResult;
  shensha: ShenshaResearchResult;
  shenshaOccurrences: ShenshaOccurrenceReviewResult;
  shenshaGate: "explicit_research_preview_included";
}

export interface BaziCurrentChartPacketExecutionScope {
  includeHour: boolean;
  activePositions: readonly PillarPosition[];
  withheldPositions: readonly PillarPosition[];
  shenshaGate: "explicit_research_preview_included";
}

export interface BaziCurrentChartPacketBindings {
  digestAlgorithm: "sha256-canonical-json-v1";
  packetProjectionVersion: typeof BAZI_CURRENT_CHART_PACKET_PROJECTION_VERSION;
  catalogProjectionVersion: string;
  catalogVersion: string;
  catalogSha256: string;
  strengthPolicyVersion: string;
  strengthPolicySha256: string;
  factsProjectionVersion: typeof BAZI_CURRENT_CHART_FACTS_PROJECTION_VERSION;
  factsProjectionSha256: string;
  interpretationRulePackId: string;
  interpretationRuleVersion: string;
  strengthAssessmentSha256: string;
  strengthSensitivityProjectionVersion: string;
  strengthSensitivitySha256: string;
  strengthEvidenceNarrativeProjectionVersion: string;
  strengthEvidenceNarrativeSha256: string;
  strengthClaimRegistryVersion: string;
  strengthClaimRegistrySha256: string;
  orderedStrengthEvidenceItemIdsSha256: string;
  orderedStrengthNarrativeStatementIdsSha256: string;
  tenGodOccurrenceProjectionVersion: string;
  tenGodOccurrencesSha256: string;
  shenshaOccurrenceProjectionVersion: string;
  shenshaOccurrencesSha256: string;
  sourceRegistrySha256: string;
  orderedReviewItemIdsSha256: string;
}

interface BaziCurrentChartHitReviewItemBase {
  reviewItemId: string;
  order: number;
  category: "strength_method" | "ten_god_occurrence" | "shensha_occurrence";
  title: string;
  catalogReviewItemIds: readonly string[];
  sourceRefIds: readonly string[];
  candidateSnapshot: BaziContentReviewItem | TenGodOccurrenceReviewItem | ShenshaOccurrenceReviewItem;
  expertTruthClaimed: false;
  scientificValidityClaimed: false;
  formalActivationAllowed: false;
  goodBadOrientation: null;
  eventOutcome: null;
  result: null;
}

export interface BaziCurrentChartStrengthMethodReviewItem extends BaziCurrentChartHitReviewItemBase {
  category: "strength_method";
  candidateSnapshot: BaziContentReviewItem;
}

export interface BaziCurrentChartTenGodOccurrenceReviewItem extends BaziCurrentChartHitReviewItemBase {
  category: "ten_god_occurrence";
  candidateSnapshot: TenGodOccurrenceReviewItem;
}

export interface BaziCurrentChartShenshaOccurrenceReviewItem extends BaziCurrentChartHitReviewItemBase {
  category: "shensha_occurrence";
  candidateSnapshot: ShenshaOccurrenceReviewItem;
}

export type BaziCurrentChartHitReviewItem =
  | BaziCurrentChartStrengthMethodReviewItem
  | BaziCurrentChartTenGodOccurrenceReviewItem
  | BaziCurrentChartShenshaOccurrenceReviewItem;

export interface BaziCurrentChartHitReviewPacket {
  executionScope: BaziCurrentChartPacketExecutionScope;
  bindings: BaziCurrentChartPacketBindings;
  factsProjection: BaziCurrentChartReviewFactsProjection;
  strengthPolicy: typeof BAZI_STRENGTH_POLICY;
  strengthSnapshot: Readonly<{
    assessment: StrengthAssessment;
    sensitivity: StrengthSensitivityReview;
    evidenceNarrative: BaziStrengthEvidenceNarrativeResult;
    expertStrengthVerdict: null;
    overallGoodBad: null;
    result: null;
  }>;
  sources: readonly BaziContentReviewSourceRef[];
  items: readonly BaziCurrentChartHitReviewItem[];
  counts: Readonly<{
    strengthMethod: 4;
    tenGodOccurrences: number;
    shenshaOccurrences: number;
    total: number;
  }>;
  boundary: Readonly<{
    expertTruthClaimed: false;
    scientificValidityClaimed: false;
    formalActivationAllowed: false;
    catalogDecisionInheritanceApplied: false;
    goodBadOrientation: null;
    eventOutcome: null;
    result: null;
  }>;
}

export interface BaziCurrentChartHitReviewDecision {
  reviewItemId: string;
  decision: BaziContentReviewFeedbackDecision;
  orientationProposal: BaziCurrentChartOrientationProposal;
  selectedTradition: string;
  decisionReason: string;
  applicabilityConditions: string;
  counterexamples: string;
  revisionRequest: string;
  additionalSourceUrls: readonly string[];
  expertTruthClaimed: false;
  scientificValidityClaimed: false;
  formalActivationAllowed: false;
  goodBadOrientation: null;
  eventOutcome: null;
  result: null;
}

export interface BaziCurrentChartHitReviewCounts {
  total: number;
  unresolved: number;
  approve: number;
  revise: number;
  reject: number;
}

export interface BaziCurrentChartHitReviewBoundary {
  identityVerified: false;
  digitalSignatureVerified: false;
  expertTruthClaimed: false;
  scientificValidityClaimed: false;
  eligibleForFormalActivation: false;
  autoIntegrationAllowed: false;
  catalogDecisionInheritanceApplied: false;
  networkTransmissionPerformed: false;
  chartOrStorageMutationPerformed: false;
  goodBadOrientation: null;
  eventOutcome: null;
  result: null;
}

export interface BaziCurrentChartHitReviewEnvelope {
  profile: typeof BAZI_CURRENT_CHART_HIT_REVIEW_PROFILE;
  packet: BaziCurrentChartHitReviewPacket;
  packetSha256: string;
  reviewer: BaziContentReviewFeedbackReviewer;
  reviewSession: BaziContentReviewFeedbackSession;
  decisions: readonly BaziCurrentChartHitReviewDecision[];
  declaredCounts: BaziCurrentChartHitReviewCounts;
  boundary: BaziCurrentChartHitReviewBoundary;
}

export interface BaziCurrentChartHitReviewPreflight {
  envelope: BaziCurrentChartHitReviewEnvelope;
  counts: BaziCurrentChartHitReviewCounts;
  resolvedCount: number;
  unresolvedCount: number;
  allItemsResolved: boolean;
  reviewerAttributionComplete: boolean;
  currentChartBound: true;
  identityVerified: false;
  digitalSignatureVerified: false;
  expertTruthClaimed: false;
  scientificValidityClaimed: false;
  eligibleForFormalActivation: false;
  autoIntegrationAllowed: false;
  catalogDecisionInheritanceApplied: false;
  networkTransmissionPerformed: false;
  chartOrStorageMutationPerformed: false;
  goodBadOrientation: null;
  eventOutcome: null;
  result: null;
}

const MAX_REVIEW_FILE_BYTES = 2 * 1024 * 1024;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const DECISION_SET = new Set<string>(BAZI_CURRENT_CHART_HIT_REVIEW_PROFILE.allowedDecisions);
const ORIENTATION_SET = new Set<string>(BAZI_CURRENT_CHART_HIT_REVIEW_PROFILE.allowedOrientationProposals);

const ROOT_KEYS = Object.freeze([
  "profile",
  "packet",
  "packetSha256",
  "reviewer",
  "reviewSession",
  "decisions",
  "declaredCounts",
  "boundary"
]);
const REVIEWER_KEYS = Object.freeze([
  "reviewerId",
  "displayName",
  "affiliation",
  "expertiseStatement",
  "identityEvidenceReference",
  "identityVerified"
]);
const SESSION_KEYS = Object.freeze(["reviewedAt", "methodology", "generalNotes"]);
const DECISION_KEYS = Object.freeze([
  "reviewItemId",
  "decision",
  "orientationProposal",
  "selectedTradition",
  "decisionReason",
  "applicabilityConditions",
  "counterexamples",
  "revisionRequest",
  "additionalSourceUrls",
  "expertTruthClaimed",
  "scientificValidityClaimed",
  "formalActivationAllowed",
  "goodBadOrientation",
  "eventOutcome",
  "result"
]);
const COUNT_KEYS = Object.freeze(["total", "unresolved", "approve", "revise", "reject"]);
const BOUNDARY_KEYS = Object.freeze([
  "identityVerified",
  "digitalSignatureVerified",
  "expertTruthClaimed",
  "scientificValidityClaimed",
  "eligibleForFormalActivation",
  "autoIntegrationAllowed",
  "catalogDecisionInheritanceApplied",
  "networkTransmissionPerformed",
  "chartOrStorageMutationPerformed",
  "goodBadOrientation",
  "eventOutcome",
  "result"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertRecord(value: unknown, subject: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${subject} 必须是 JSON 对象`);
}

function assertExactKeys(value: Record<string, unknown>, keys: readonly string[], subject: string): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${subject} 字段集合不匹配`);
  }
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
}

function canonicalClone<T>(value: T): T {
  return JSON.parse(canonicalStringify(value)) as T;
}

async function domainDigest(domain: string, value: unknown): Promise<string> {
  return sha256Hex({ domain, value });
}

function sameCanonical(left: unknown, right: unknown): boolean {
  return canonicalStringify(left) === canonicalStringify(right);
}

function stringValue(value: unknown, subject: string, maximum = 4_000): string {
  if (typeof value !== "string") throw new Error(`${subject} 必须是字符串`);
  if (value.length > maximum) throw new Error(`${subject} 超过 ${maximum} 字符上限`);
  return value;
}

function integerValue(value: unknown, subject: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error(`${subject} 必须是非负安全整数`);
  return value as number;
}

function falseValue(value: unknown, subject: string): false {
  if (value !== false) throw new Error(`${subject} 必须保持 false`);
  return false;
}

function nullValue(value: unknown, subject: string): null {
  if (value !== null) throw new Error(`${subject} 必须保持 null`);
  return null;
}

function validateJsonTree(value: unknown, depth = 0, state = { nodes: 0 }): void {
  state.nodes += 1;
  if (state.nodes > 200_000) throw new Error("本盘复核文件 JSON 节点过多");
  if (depth > 64) throw new Error("本盘复核文件 JSON 嵌套过深");
  if (Array.isArray(value)) {
    for (const child of value) validateJsonTree(child, depth + 1, state);
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (key === "__proto__" || key === "prototype" || key === "constructor") {
      throw new Error(`本盘复核文件包含禁止字段：${key}`);
    }
    validateJsonTree(child, depth + 1, state);
  }
}

function assertInterpretationPolicy(
  facts: ChartFacts,
  includeHour: boolean,
  interpretation: BaziInterpretationResult,
  strengthSensitivity: StrengthSensitivityReview
): void {
  assertBaziStrengthDerivedSnapshot({ facts, includeHour, interpretation, strengthSensitivity });
  const expectedPositions = ["year", "month", "day", "hour"] as const;
  if (interpretation.pillars.length !== expectedPositions.length) throw new Error("当前解释必须覆盖固定四柱外壳");
  for (const position of expectedPositions) {
    const reading = interpretation.pillars.find((item) => item.position === position);
    if (!reading || reading.ganZhi !== facts.pillars[position].ganZhi) {
      throw new Error(`${facts.pillars[position].label}解释与当前事实不一致`);
    }
    const expectedAvailability = position === "hour" && !includeHour ? "uncertain_hour" : "available";
    if (reading.availability !== expectedAvailability) throw new Error(`${reading.positionLabel}可靠性与当前范围不一致`);
  }
}

function assertDerivedInputs(input: BuildBaziCurrentChartHitReviewInput): void {
  assertInterpretationPolicy(
    input.facts,
    input.includeHour,
    input.interpretation,
    input.strengthSensitivity
  );

  const expectedTenGod = buildTenGodOccurrenceReview(input.facts, input.interpretation);
  if (!sameCanonical(input.tenGodOccurrences, expectedTenGod)) {
    throw new Error("十神出现项不是由当前事实与解释重新派生的结果");
  }
  const expectedShensha = deriveShenshaResearchFacts(input.facts, { includeHour: input.includeHour });
  if (!sameCanonical(input.shensha, expectedShensha)) {
    throw new Error("神煞研究结果不是由当前事实与显式时柱范围重新派生的结果");
  }
  const expectedShenshaOccurrences = buildShenshaOccurrenceReview(input.facts, expectedShensha);
  if (!sameCanonical(input.shenshaOccurrences, expectedShenshaOccurrences)) {
    throw new Error("神煞出现项不是由当前事实与显式研究结果重新派生的结果");
  }

  const expectedWithheld = input.includeHour ? [] : ["hour"];
  if (!sameCanonical(input.tenGodOccurrences.withheldPositions, expectedWithheld)
    || !sameCanonical(input.shenshaOccurrences.withheldPositions, expectedWithheld)) {
    throw new Error("出现项关闭位置与时辰可靠性不一致");
  }
}

function queueItem(id: string): BaziContentReviewItem {
  const item = BAZI_CONTENT_REVIEW_QUEUE.items.find((candidate) => candidate.reviewItemId === id);
  if (!item) throw new Error(`当前 69 项目录缺少映射：${id}`);
  return item;
}

function makeBaseItem(
  reviewItemId: string,
  order: number,
  category: BaziCurrentChartHitReviewItem["category"],
  title: string,
  catalogReviewItemIds: readonly string[],
  candidateSnapshot: BaziCurrentChartHitReviewItem["candidateSnapshot"],
  sourceRefIds: readonly string[]
): BaziCurrentChartHitReviewItemBase {
  return deepFreeze({
    reviewItemId,
    order,
    category,
    title,
    catalogReviewItemIds: [...catalogReviewItemIds],
    sourceRefIds: [...new Set(sourceRefIds)],
    candidateSnapshot: canonicalClone(candidateSnapshot),
    expertTruthClaimed: false,
    scientificValidityClaimed: false,
    formalActivationAllowed: false,
    goodBadOrientation: null,
    eventOutcome: null,
    result: null
  });
}

function buildReviewItems(input: BuildBaziCurrentChartHitReviewInput): readonly BaziCurrentChartHitReviewItem[] {
  const items: BaziCurrentChartHitReviewItem[] = [];
  const strengthItems = BAZI_CONTENT_REVIEW_QUEUE.items.filter((item) => item.category === "strength_method");
  if (strengthItems.length !== 4) throw new Error("当前目录必须恰有 4 项旺衰方法问题");
  for (const candidate of strengthItems) {
    items.push(makeBaseItem(
      candidate.reviewItemId,
      items.length + 1,
      "strength_method",
      candidate.title,
      [candidate.reviewItemId],
      candidate,
      candidate.sourceRefIds
    ) as BaziCurrentChartStrengthMethodReviewItem);
  }

  for (const occurrence of input.tenGodOccurrences.pillars.flatMap((pillar) => pillar.items)) {
    const catalogId = `ten_god_position:${occurrence.tenGod}:${occurrence.position}`;
    const catalog = queueItem(catalogId);
    items.push(makeBaseItem(
      `ten_god_occurrence:${occurrence.contentId}`,
      items.length + 1,
      "ten_god_occurrence",
      `${occurrence.positionLabel}${occurrence.sourceLabel} · ${occurrence.tenGod}`,
      [catalogId],
      occurrence,
      [...catalog.sourceRefIds, ...occurrence.sourceRefIds]
    ) as BaziCurrentChartTenGodOccurrenceReviewItem);
  }

  for (const occurrence of input.shenshaOccurrences.pillars.flatMap((pillar) => pillar.items)) {
    const ruleCatalogId = `shensha_rule:${occurrence.ruleId}`;
    const positionCatalogId = `shensha_position:${occurrence.editorialId}`;
    const ruleCatalog = queueItem(ruleCatalogId);
    const positionCatalog = queueItem(positionCatalogId);
    items.push(makeBaseItem(
      `shensha_occurrence:${occurrence.contentId}`,
      items.length + 1,
      "shensha_occurrence",
      `${occurrence.name}落${occurrence.positionLabel}`,
      [ruleCatalogId, positionCatalogId],
      occurrence,
      [...ruleCatalog.sourceRefIds, ...positionCatalog.sourceRefIds, ...occurrence.sourceRefIds]
    ) as BaziCurrentChartShenshaOccurrenceReviewItem);
  }

  if (new Set(items.map((item) => item.reviewItemId)).size !== items.length) {
    throw new Error("当前盘复核项 ID 必须唯一");
  }
  return deepFreeze(items);
}

function usedSources(items: readonly BaziCurrentChartHitReviewItem[]): readonly BaziContentReviewSourceRef[] {
  const used = new Set(items.flatMap((item) => item.sourceRefIds));
  const sources = BAZI_CONTENT_REVIEW_QUEUE.sources.filter((source) => used.has(source.id));
  const resolved = new Set(sources.map((source) => source.id));
  const missing = [...used].filter((sourceId) => !resolved.has(sourceId));
  if (missing.length) throw new Error(`当前盘复核项存在无法解析的来源：${missing.join("、")}`);
  return deepFreeze(canonicalClone(sources));
}

async function buildPacket(input: BuildBaziCurrentChartHitReviewInput): Promise<BaziCurrentChartHitReviewPacket> {
  if (input.shenshaGate !== "explicit_research_preview_included") {
    throw new Error("当前盘命中包必须由用户显式请求神煞研究后生成");
  }
  assertDerivedInputs(input);
  const sharedSnapshot = await buildBaziStrengthSharedSnapshot(input);
  const positions = activeBaziStrengthPositions(input.includeHour);
  const withheldPositions = input.includeHour ? [] : ["hour"] as const;
  const factsProjection = sharedSnapshot.factsProjection;
  const items = buildReviewItems(input);
  const sources = usedSources(items);
  const strengthAssessment = deepFreeze(canonicalClone(input.interpretation.strength));
  const strengthSensitivity = deepFreeze(canonicalClone(input.strengthSensitivity));
  const strengthEvidenceNarrative = await buildBaziStrengthEvidenceNarrative({
    facts: input.facts,
    includeHour: input.includeHour,
    interpretation: input.interpretation,
    strengthSensitivity: input.strengthSensitivity
  });
  const tenGodOccurrences = deepFreeze(canonicalClone(input.tenGodOccurrences));
  const shenshaOccurrences = deepFreeze(canonicalClone(input.shenshaOccurrences));
  const orderedReviewItemIds = items.map((item) => item.reviewItemId);

  const [
    catalogSha256,
    strengthEvidenceNarrativeSha256,
    tenGodOccurrencesSha256,
    shenshaOccurrencesSha256,
    sourceRegistrySha256,
    orderedReviewItemIdsSha256
  ] = await Promise.all([
    domainDigest("hakimi.bazi.content-review-catalog.v1", BAZI_CONTENT_REVIEW_QUEUE),
    domainDigest("hakimi.bazi.strength-evidence-narrative.v1", strengthEvidenceNarrative),
    domainDigest("hakimi.bazi.ten-god-occurrences.v1", tenGodOccurrences),
    domainDigest("hakimi.bazi.shensha-occurrences.v1", shenshaOccurrences),
    domainDigest("hakimi.bazi.current-chart-review-sources.v1", sources),
    domainDigest("hakimi.bazi.current-chart-review-item-ids.v1", orderedReviewItemIds)
  ]);

  const packet: BaziCurrentChartHitReviewPacket = {
    executionScope: {
      includeHour: input.includeHour,
      activePositions: positions,
      withheldPositions,
      shenshaGate: input.shenshaGate
    },
    bindings: {
      digestAlgorithm: "sha256-canonical-json-v1",
      packetProjectionVersion: BAZI_CURRENT_CHART_PACKET_PROJECTION_VERSION,
      catalogProjectionVersion: BAZI_CONTENT_REVIEW_QUEUE.profile.projectionVersion,
      catalogVersion: BAZI_CONTENT_REVIEW_QUEUE.profile.catalogVersion,
      catalogSha256,
      strengthPolicyVersion: sharedSnapshot.bindings.strengthPolicyVersion,
      strengthPolicySha256: sharedSnapshot.bindings.strengthPolicySha256,
      factsProjectionVersion: sharedSnapshot.bindings.factsProjectionVersion,
      factsProjectionSha256: sharedSnapshot.bindings.factsProjectionSha256,
      interpretationRulePackId: sharedSnapshot.bindings.interpretationRulePackId,
      interpretationRuleVersion: sharedSnapshot.bindings.interpretationRuleVersion,
      strengthAssessmentSha256: sharedSnapshot.bindings.strengthAssessmentSha256,
      strengthSensitivityProjectionVersion: sharedSnapshot.bindings.strengthSensitivityProjectionVersion,
      strengthSensitivitySha256: sharedSnapshot.bindings.strengthSensitivitySha256,
      strengthEvidenceNarrativeProjectionVersion: strengthEvidenceNarrative.profile.projectionVersion,
      strengthEvidenceNarrativeSha256,
      strengthClaimRegistryVersion: strengthEvidenceNarrative.bindings.claimRegistryVersion,
      strengthClaimRegistrySha256: strengthEvidenceNarrative.bindings.claimRegistrySha256,
      orderedStrengthEvidenceItemIdsSha256: strengthEvidenceNarrative.bindings.orderedEvidenceItemIdsSha256,
      orderedStrengthNarrativeStatementIdsSha256: strengthEvidenceNarrative.bindings.orderedNarrativeStatementIdsSha256,
      tenGodOccurrenceProjectionVersion: input.tenGodOccurrences.profile.projectionVersion,
      tenGodOccurrencesSha256,
      shenshaOccurrenceProjectionVersion: input.shenshaOccurrences.profile.projectionVersion,
      shenshaOccurrencesSha256,
      sourceRegistrySha256,
      orderedReviewItemIdsSha256
    },
    factsProjection,
    strengthPolicy: BAZI_STRENGTH_POLICY,
    strengthSnapshot: {
      assessment: strengthAssessment,
      sensitivity: strengthSensitivity,
      evidenceNarrative: strengthEvidenceNarrative,
      expertStrengthVerdict: null,
      overallGoodBad: null,
      result: null
    },
    sources,
    items,
    counts: {
      strengthMethod: 4,
      tenGodOccurrences: input.tenGodOccurrences.occurrenceCount,
      shenshaOccurrences: input.shenshaOccurrences.occurrenceCount,
      total: items.length
    },
    boundary: {
      expertTruthClaimed: false,
      scientificValidityClaimed: false,
      formalActivationAllowed: false,
      catalogDecisionInheritanceApplied: false,
      goodBadOrientation: null,
      eventOutcome: null,
      result: null
    }
  };
  return deepFreeze(canonicalClone(packet));
}

function makeCounts(decisions: readonly BaziCurrentChartHitReviewDecision[]): BaziCurrentChartHitReviewCounts {
  const counts: BaziCurrentChartHitReviewCounts = {
    total: decisions.length,
    unresolved: 0,
    approve: 0,
    revise: 0,
    reject: 0
  };
  for (const decision of decisions) counts[decision.decision] += 1;
  return deepFreeze(counts);
}

function emptyReviewer(): BaziContentReviewFeedbackReviewer {
  return deepFreeze({
    reviewerId: "",
    displayName: "",
    affiliation: "",
    expertiseStatement: "",
    identityEvidenceReference: "",
    identityVerified: false
  });
}

function emptyDecision(reviewItemId: string): BaziCurrentChartHitReviewDecision {
  return deepFreeze({
    reviewItemId,
    decision: "unresolved",
    orientationProposal: "unresolved",
    selectedTradition: "",
    decisionReason: "",
    applicabilityConditions: "",
    counterexamples: "",
    revisionRequest: "",
    additionalSourceUrls: [],
    expertTruthClaimed: false,
    scientificValidityClaimed: false,
    formalActivationAllowed: false,
    goodBadOrientation: null,
    eventOutcome: null,
    result: null
  });
}

function fixedBoundary(): BaziCurrentChartHitReviewBoundary {
  return deepFreeze({
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
}

export async function createBaziCurrentChartHitReviewTemplate(
  input: BuildBaziCurrentChartHitReviewInput
): Promise<BaziCurrentChartHitReviewEnvelope> {
  const packet = await buildPacket(input);
  const packetSha256 = await domainDigest("hakimi.bazi.current-chart-hit-packet.v2", packet);
  const decisions = deepFreeze(packet.items.map((item) => emptyDecision(item.reviewItemId)));
  return deepFreeze({
    profile: BAZI_CURRENT_CHART_HIT_REVIEW_PROFILE,
    packet,
    packetSha256,
    reviewer: emptyReviewer(),
    reviewSession: deepFreeze({ reviewedAt: "", methodology: "", generalNotes: "" }),
    decisions,
    declaredCounts: makeCounts(decisions),
    boundary: fixedBoundary()
  });
}

export function serializeBaziCurrentChartHitReview(
  envelope: BaziCurrentChartHitReviewEnvelope
): string {
  return `${JSON.stringify(envelope, null, 2)}\n`;
}

function parseReviewer(value: unknown): BaziContentReviewFeedbackReviewer {
  assertRecord(value, "本盘复核 reviewer");
  assertExactKeys(value, REVIEWER_KEYS, "本盘复核 reviewer");
  return deepFreeze({
    reviewerId: stringValue(value.reviewerId, "reviewerId", 200),
    displayName: stringValue(value.displayName, "displayName", 200),
    affiliation: stringValue(value.affiliation, "affiliation", 500),
    expertiseStatement: stringValue(value.expertiseStatement, "expertiseStatement", 1_000),
    identityEvidenceReference: stringValue(value.identityEvidenceReference, "identityEvidenceReference", 1_000),
    identityVerified: falseValue(value.identityVerified, "reviewer.identityVerified")
  });
}

function parseSession(value: unknown): BaziContentReviewFeedbackSession {
  assertRecord(value, "本盘复核 reviewSession");
  assertExactKeys(value, SESSION_KEYS, "本盘复核 reviewSession");
  return deepFreeze({
    reviewedAt: stringValue(value.reviewedAt, "reviewedAt", 100),
    methodology: stringValue(value.methodology, "methodology", 2_000),
    generalNotes: stringValue(value.generalNotes, "generalNotes", 4_000)
  });
}

function parseAdditionalSources(value: unknown, subject: string): readonly string[] {
  if (!Array.isArray(value) || value.length > 8) throw new Error(`${subject} 必须是至多 8 项的数组`);
  const urls = value.map((candidate, index) => stringValue(candidate, `${subject}[${index}]`, 2_000));
  if (new Set(urls).size !== urls.length) throw new Error(`${subject} 不得重复`);
  for (const candidate of urls) {
    let url: URL;
    try {
      url = new URL(candidate);
    } catch (reason) {
      throw new Error(`${subject} 包含无效 URL`, { cause: reason });
    }
    if (url.protocol !== "https:" || url.username || url.password) {
      throw new Error(`${subject} 只允许无凭据 HTTPS URL`);
    }
  }
  return deepFreeze(urls);
}

function parseDecision(value: unknown, index: number): BaziCurrentChartHitReviewDecision {
  const subject = `本盘复核 decisions[${index}]`;
  assertRecord(value, subject);
  assertExactKeys(value, DECISION_KEYS, subject);
  const decision = stringValue(value.decision, `${subject}.decision`, 30);
  const orientationProposal = stringValue(value.orientationProposal, `${subject}.orientationProposal`, 50);
  if (!DECISION_SET.has(decision)) throw new Error(`${subject}.decision 无效`);
  if (!ORIENTATION_SET.has(orientationProposal)) throw new Error(`${subject}.orientationProposal 无效`);
  return deepFreeze({
    reviewItemId: stringValue(value.reviewItemId, `${subject}.reviewItemId`, 1_000),
    decision: decision as BaziContentReviewFeedbackDecision,
    orientationProposal: orientationProposal as BaziCurrentChartOrientationProposal,
    selectedTradition: stringValue(value.selectedTradition, `${subject}.selectedTradition`, 500),
    decisionReason: stringValue(value.decisionReason, `${subject}.decisionReason`, 4_000),
    applicabilityConditions: stringValue(value.applicabilityConditions, `${subject}.applicabilityConditions`, 4_000),
    counterexamples: stringValue(value.counterexamples, `${subject}.counterexamples`, 4_000),
    revisionRequest: stringValue(value.revisionRequest, `${subject}.revisionRequest`, 4_000),
    additionalSourceUrls: parseAdditionalSources(value.additionalSourceUrls, `${subject}.additionalSourceUrls`),
    expertTruthClaimed: falseValue(value.expertTruthClaimed, `${subject}.expertTruthClaimed`),
    scientificValidityClaimed: falseValue(value.scientificValidityClaimed, `${subject}.scientificValidityClaimed`),
    formalActivationAllowed: falseValue(value.formalActivationAllowed, `${subject}.formalActivationAllowed`),
    goodBadOrientation: nullValue(value.goodBadOrientation, `${subject}.goodBadOrientation`),
    eventOutcome: nullValue(value.eventOutcome, `${subject}.eventOutcome`),
    result: nullValue(value.result, `${subject}.result`)
  });
}

function parseCounts(value: unknown): BaziCurrentChartHitReviewCounts {
  assertRecord(value, "本盘复核 declaredCounts");
  assertExactKeys(value, COUNT_KEYS, "本盘复核 declaredCounts");
  return deepFreeze({
    total: integerValue(value.total, "declaredCounts.total"),
    unresolved: integerValue(value.unresolved, "declaredCounts.unresolved"),
    approve: integerValue(value.approve, "declaredCounts.approve"),
    revise: integerValue(value.revise, "declaredCounts.revise"),
    reject: integerValue(value.reject, "declaredCounts.reject")
  });
}

function parseBoundary(value: unknown): BaziCurrentChartHitReviewBoundary {
  assertRecord(value, "本盘复核 boundary");
  assertExactKeys(value, BOUNDARY_KEYS, "本盘复核 boundary");
  return deepFreeze({
    identityVerified: falseValue(value.identityVerified, "boundary.identityVerified"),
    digitalSignatureVerified: falseValue(value.digitalSignatureVerified, "boundary.digitalSignatureVerified"),
    expertTruthClaimed: falseValue(value.expertTruthClaimed, "boundary.expertTruthClaimed"),
    scientificValidityClaimed: falseValue(value.scientificValidityClaimed, "boundary.scientificValidityClaimed"),
    eligibleForFormalActivation: falseValue(value.eligibleForFormalActivation, "boundary.eligibleForFormalActivation"),
    autoIntegrationAllowed: falseValue(value.autoIntegrationAllowed, "boundary.autoIntegrationAllowed"),
    catalogDecisionInheritanceApplied: falseValue(
      value.catalogDecisionInheritanceApplied,
      "boundary.catalogDecisionInheritanceApplied"
    ),
    networkTransmissionPerformed: falseValue(value.networkTransmissionPerformed, "boundary.networkTransmissionPerformed"),
    chartOrStorageMutationPerformed: falseValue(
      value.chartOrStorageMutationPerformed,
      "boundary.chartOrStorageMutationPerformed"
    ),
    goodBadOrientation: nullValue(value.goodBadOrientation, "boundary.goodBadOrientation"),
    eventOutcome: nullValue(value.eventOutcome, "boundary.eventOutcome"),
    result: nullValue(value.result, "boundary.result")
  });
}

function validReviewedAt(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/u.test(value)) return false;
  return Number.isFinite(Date.parse(value));
}

function profileMatches(value: unknown): boolean {
  return sameCanonical(value, BAZI_CURRENT_CHART_HIT_REVIEW_PROFILE);
}

export async function preflightBaziCurrentChartHitReview(
  raw: string,
  currentTemplate: BaziCurrentChartHitReviewEnvelope
): Promise<BaziCurrentChartHitReviewPreflight> {
  if (new TextEncoder().encode(raw).byteLength > MAX_REVIEW_FILE_BYTES) {
    throw new Error("本盘复核文件超过 2 MiB 上限");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.replace(/^\uFEFF/u, "")) as unknown;
  } catch (reason) {
    throw new Error("本盘复核文件不是有效 JSON", { cause: reason });
  }
  validateJsonTree(parsed);
  assertRecord(parsed, "本盘复核文件");
  assertExactKeys(parsed, ROOT_KEYS, "本盘复核文件");
  if (!profileMatches(parsed.profile)) throw new Error("本盘复核 profile 与当前 v0.18 协议不匹配");

  const packetSha256 = stringValue(parsed.packetSha256, "packetSha256", 64);
  if (!SHA256_PATTERN.test(packetSha256)) throw new Error("packetSha256 必须是 64 位小写 SHA-256");
  const expectedPacketSha256 = await domainDigest("hakimi.bazi.current-chart-hit-packet.v2", currentTemplate.packet);
  if (currentTemplate.packetSha256 !== expectedPacketSha256) throw new Error("当前内存模板的本盘摘要无效");
  if (packetSha256 !== expectedPacketSha256 || !sameCanonical(parsed.packet, currentTemplate.packet)) {
    throw new Error("复核文件没有绑定当前内存命盘，或本盘候选快照已被改写");
  }

  const reviewer = parseReviewer(parsed.reviewer);
  const reviewSession = parseSession(parsed.reviewSession);
  if (!Array.isArray(parsed.decisions)) throw new Error("本盘复核 decisions 必须是数组");
  const decisions = deepFreeze(parsed.decisions.map(parseDecision));
  if (decisions.length !== currentTemplate.packet.items.length) {
    throw new Error(`本盘复核必须恰好覆盖 ${currentTemplate.packet.items.length} 项`);
  }

  let hasHumanInput = false;
  for (const [index, decision] of decisions.entries()) {
    const expectedId = currentTemplate.packet.items[index]?.reviewItemId;
    if (decision.reviewItemId !== expectedId) throw new Error(`本盘复核第 ${index + 1} 项顺序或 ID 不匹配`);
    const textFields = [
      decision.selectedTradition,
      decision.decisionReason,
      decision.applicabilityConditions,
      decision.counterexamples,
      decision.revisionRequest
    ];
    if (decision.decision === "unresolved") {
      if (decision.orientationProposal !== "unresolved"
        || textFields.some((value) => value.trim())
        || decision.additionalSourceUrls.length) {
        throw new Error(`未裁决项的人工字段必须为空：${decision.reviewItemId}`);
      }
      continue;
    }
    hasHumanInput = true;
    if (decision.orientationProposal === "unresolved"
      || !decision.selectedTradition.trim()
      || !decision.decisionReason.trim()
      || !decision.applicabilityConditions.trim()
      || !decision.counterexamples.trim()) {
      throw new Error(`已裁决项必须填写条件化方向、传统范围、理由、成立条件与反例：${decision.reviewItemId}`);
    }
    if (decision.decision === "revise" && !decision.revisionRequest.trim()) {
      throw new Error(`退修项必须填写修改要求：${decision.reviewItemId}`);
    }
    if (decision.decision !== "revise" && decision.revisionRequest.trim()) {
      throw new Error(`只有退修项可以填写修改要求：${decision.reviewItemId}`);
    }
  }

  const reviewerValues = [
    reviewer.reviewerId,
    reviewer.displayName,
    reviewer.affiliation,
    reviewer.expertiseStatement,
    reviewer.identityEvidenceReference,
    reviewSession.reviewedAt,
    reviewSession.methodology,
    reviewSession.generalNotes
  ];
  if (reviewerValues.some((value) => value.trim())) hasHumanInput = true;
  const reviewerAttributionComplete = Boolean(
    reviewer.reviewerId.trim()
    && reviewer.displayName.trim()
    && reviewer.expertiseStatement.trim()
    && reviewSession.methodology.trim()
    && validReviewedAt(reviewSession.reviewedAt)
  );
  if (hasHumanInput && !reviewerAttributionComplete) {
    throw new Error("填写任何本盘意见后，必须提供 reviewerId、显示名、专业说明、ISO 审稿时间与方法说明");
  }

  const counts = makeCounts(decisions);
  const declaredCounts = parseCounts(parsed.declaredCounts);
  if (!sameCanonical(counts, declaredCounts)) throw new Error("本盘复核 declaredCounts 与逐项决定不一致");
  const boundary = parseBoundary(parsed.boundary);
  if (!sameCanonical(boundary, fixedBoundary())) throw new Error("本盘复核边界字段不匹配");

  const envelope = deepFreeze({
    profile: BAZI_CURRENT_CHART_HIT_REVIEW_PROFILE,
    packet: currentTemplate.packet,
    packetSha256,
    reviewer,
    reviewSession,
    decisions,
    declaredCounts,
    boundary
  });
  const resolvedCount = counts.approve + counts.revise + counts.reject;
  return deepFreeze({
    envelope,
    counts,
    resolvedCount,
    unresolvedCount: counts.unresolved,
    allItemsResolved: counts.unresolved === 0,
    reviewerAttributionComplete,
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
}
