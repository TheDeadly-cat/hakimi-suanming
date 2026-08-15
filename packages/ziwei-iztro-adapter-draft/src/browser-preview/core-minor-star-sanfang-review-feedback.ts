import type {
  BrowserProbeCoreMinorStarSourceRef,
  BrowserProbeCoreMinorStarSanfangOccurrenceReview,
  BrowserProbeDisplayProjection,
} from "./browser-protocol.ts";
import {
  ZIWEI_CORE_MINOR_STAR_CANDIDATE_CONTENT,
  ZIWEI_CORE_MINOR_STAR_CONTENT_SOURCES,
  ZIWEI_CORE_MINOR_STAR_PALACE_CANDIDATE_CONTENT
}
  from "./core-minor-star-content.ts";
import {
  createCoreMinorStarSanfangReviews,
  ZIWEI_CORE_MINOR_STAR_SANFANG_PROJECTION_RULE,
  ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_VERSION
}
  from "./core-minor-star-sanfang-review.ts";
import { ZIWEI_MAJOR_STAR_PALACE_CONTENT_SOURCES }
  from "./major-star-palace-content.ts";

export const ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_FEEDBACK_PROFILE = Object.freeze({
  formatVersion: "hakimi.ziwei.core_minor_star_sanfang_review_feedback/0.1.0",
  templateVersion: "0.13.0",
  reviewScope: "current_chart_all_twelve_sanfang_groups" as const,
  privacyScope: "direct_identifiers_removed_derived_four_palace_chart_facts" as const,
  directIdentifiersIncluded: false as const,
  inputFieldsIncluded: false as const,
  derivedChartFactsIncluded: true as const,
  externalSharingRequiresUserDecision: true as const,
  workflowMode: "human_attributed_read_only_preflight" as const,
  identityPolicy: "self_declared_not_verified" as const,
  signaturePolicy: "none" as const,
  integrationPolicy: "manual_code_review_only" as const,
  mutationPolicy: "no_rule_artifact_or_storage_write" as const,
  allowedDecisions: Object.freeze(["unresolved", "approve", "revise", "reject"] as const),
  allowedOrientationProposals: Object.freeze([
    "unresolved",
    "potentially_supportive",
    "potentially_challenging",
    "mixed_conditional",
    "not_assessable"
  ] as const),
  expertTruthClaimed: false as const,
  formalActivationAllowed: false as const,
  autoIntegrationAllowed: false as const,
  scoringAllowed: false as const,
  staticCatalogDecisionInheritanceApplied: false as const
});

export const ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_FEEDBACK_MAX_BYTES = 2 * 1024 * 1024;

export type ZiweiCoreMinorStarSanfangReviewDecision =
  (typeof ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_FEEDBACK_PROFILE.allowedDecisions)[number];
export type ZiweiCoreMinorStarSanfangReviewOrientationProposal =
  (typeof ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_FEEDBACK_PROFILE.allowedOrientationProposals)[number];

export interface ZiweiCoreMinorStarSanfangReviewSource {
  sourceId: string;
  sourceKind: string;
  title: string;
  sourceUrl: string;
  accessedAt: string;
  usageBoundary: string;
  semanticCandidateSupport: boolean;
  expertTruthClaimed: false;
}

export interface ZiweiCoreMinorStarSanfangReviewProjectionBinding {
  reviewVersion: typeof ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_VERSION;
  sanfangRuleId: string;
  sanfangRuleMethod: "target_index_self_plus_minus_4_and_plus_6";
  sanfangRuleSourceUrl: string;
  ruleSnapshotSha256: string;
  artifactFactsSha256: string;
  occurrenceProjectionSha256: string;
  orderedReviewIdsSha256: string;
  orderedOccurrenceIdsSha256: string;
  orderedSourceIdsSha256: string;
  sourceRegistrySha256: string;
  reviewCount: 12;
  itemCount: number;
  sourceCount: 5;
}

export interface ZiweiCoreMinorStarSanfangReviewReviewer {
  reviewerId: string;
  displayName: string;
  affiliation: string;
  expertiseStatement: string;
  identityEvidenceReference: string;
  identityVerified: false;
}

export interface ZiweiCoreMinorStarSanfangReviewSession {
  reviewedAt: string;
  methodology: string;
  traditionScope: string;
  generalNotes: string;
}

export interface ZiweiCoreMinorStarSanfangReviewFeedbackItem {
  occurrenceId: string;
  order: number;
  reviewId: string;
  reviewOrder: number;
  occurrenceOrder: number;
  targetPalaceRoleId: string;
  targetPalaceRoleLabel: string;
  targetEarthlyBranchId: string;
  relation: string;
  relationLabel: string;
  palaceRoleId: string;
  palaceRoleLabel: string;
  palaceEarthlyBranchId: string;
  starId: string;
  starLabel: string;
  brightnessLabel: string | null;
  transformations: readonly string[];
  nomenclatureConflictState: "none" | "classical_tiankong_not_dikong";
  ruleSnapshotSha256: string;
  artifactFactsSha256: string;
  baseCandidateContentId: string;
  palaceCandidateContentId: string;
  factSummary: string;
  directStatement: string;
  counterweight: string;
  reviewQuestions: readonly string[];
  sourceRefs: readonly BrowserProbeCoreMinorStarSourceRef[];
  occurrenceSnapshot: BrowserProbeCoreMinorStarSanfangOccurrenceReview;
  occurrenceSnapshotSha256: string;
  decision: ZiweiCoreMinorStarSanfangReviewDecision;
  orientationProposal: ZiweiCoreMinorStarSanfangReviewOrientationProposal;
  selectedTradition: string;
  decisionReason: string;
  applicabilityConditions: string;
  counterexamples: string;
  revisionRequest: string;
  additionalSourceUrls: readonly string[];
  expertTruthClaimed: false;
  formalActivationAllowed: false;
  scoringAllowed: false;
  goodBadOrientation: null;
  eventOutcome: null;
  result: null;
}

export interface ZiweiCoreMinorStarSanfangReviewCounts {
  total: number;
  unresolved: number;
  approve: number;
  revise: number;
  reject: number;
}

export interface ZiweiCoreMinorStarSanfangReviewOrientationCounts {
  total: number;
  unresolved: number;
  potentiallySupportive: number;
  potentiallyChallenging: number;
  mixedConditional: number;
  notAssessable: number;
}

export interface ZiweiCoreMinorStarSanfangReviewBoundary {
  directIdentifiersIncluded: false;
  inputFieldsIncluded: false;
  derivedChartFactsIncluded: true;
  externalSharingRequiresUserDecision: true;
  derivedChartFactsRemainSensitive: true;
  sha256IsNotEncryption: true;
  identityVerified: false;
  digitalSignatureVerified: false;
  eligibleForFormalActivation: false;
  autoIntegrationAllowed: false;
  networkTransmissionPerformed: false;
  ruleArtifactOrStorageMutationPerformed: false;
  scoringAllowed: false;
  deterministicOutcomeEstablished: false;
  staticCatalogDecisionInheritanceApplied: false;
  goodBadOrientation: null;
  eventOutcome: null;
  result: null;
}

export interface ZiweiCoreMinorStarSanfangReviewFeedbackEnvelope {
  profile: typeof ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_FEEDBACK_PROFILE;
  projectionBinding: ZiweiCoreMinorStarSanfangReviewProjectionBinding;
  sourceRegistry: readonly ZiweiCoreMinorStarSanfangReviewSource[];
  reviewer: ZiweiCoreMinorStarSanfangReviewReviewer;
  reviewSession: ZiweiCoreMinorStarSanfangReviewSession;
  items: readonly ZiweiCoreMinorStarSanfangReviewFeedbackItem[];
  declaredCounts: ZiweiCoreMinorStarSanfangReviewCounts;
  declaredOrientationProposalCounts: ZiweiCoreMinorStarSanfangReviewOrientationCounts;
  boundary: ZiweiCoreMinorStarSanfangReviewBoundary;
}

export interface ZiweiCoreMinorStarSanfangReviewFeedbackPreflight {
  envelope: ZiweiCoreMinorStarSanfangReviewFeedbackEnvelope;
  counts: ZiweiCoreMinorStarSanfangReviewCounts;
  orientationProposalCounts: ZiweiCoreMinorStarSanfangReviewOrientationCounts;
  resolvedCount: number;
  unresolvedCount: number;
  allItemsResolved: boolean;
  reviewerAttributionComplete: boolean;
  currentProjectionBound: true;
  identityVerified: false;
  digitalSignatureVerified: false;
  eligibleForFormalActivation: false;
  autoIntegrationAllowed: false;
  networkTransmissionPerformed: false;
  ruleArtifactOrStorageMutationPerformed: false;
  scoringAllowed: false;
  deterministicOutcomeEstablished: false;
  staticCatalogDecisionInheritanceApplied: false;
  goodBadOrientation: null;
  eventOutcome: null;
  result: null;
}

const ROOT_KEYS = Object.freeze([
  "profile", "projectionBinding", "sourceRegistry", "reviewer", "reviewSession", "items",
  "declaredCounts", "declaredOrientationProposalCounts", "boundary"
] as const);
const PROFILE_KEYS = Object.freeze(Object.keys(
  ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_FEEDBACK_PROFILE
));
const BINDING_KEYS = Object.freeze([
  "reviewVersion", "sanfangRuleId", "sanfangRuleMethod", "sanfangRuleSourceUrl",
  "ruleSnapshotSha256", "artifactFactsSha256", "occurrenceProjectionSha256",
  "orderedReviewIdsSha256", "orderedOccurrenceIdsSha256", "orderedSourceIdsSha256",
  "sourceRegistrySha256", "reviewCount", "itemCount", "sourceCount"
] as const);
const SOURCE_KEYS = Object.freeze([
  "sourceId", "sourceKind", "title", "sourceUrl", "accessedAt", "usageBoundary",
  "semanticCandidateSupport", "expertTruthClaimed"
] as const);
const REVIEWER_KEYS = Object.freeze([
  "reviewerId", "displayName", "affiliation", "expertiseStatement",
  "identityEvidenceReference", "identityVerified"
] as const);
const SESSION_KEYS = Object.freeze([
  "reviewedAt", "methodology", "traditionScope", "generalNotes"
] as const);
const ITEM_KEYS = Object.freeze([
  "occurrenceId", "order", "reviewId", "reviewOrder", "occurrenceOrder",
  "targetPalaceRoleId", "targetPalaceRoleLabel", "targetEarthlyBranchId", "relation",
  "relationLabel", "palaceRoleId", "palaceRoleLabel", "palaceEarthlyBranchId", "starId",
  "starLabel", "brightnessLabel", "transformations", "nomenclatureConflictState",
  "ruleSnapshotSha256", "artifactFactsSha256",
  "baseCandidateContentId", "palaceCandidateContentId", "factSummary", "directStatement",
  "counterweight", "reviewQuestions", "sourceRefs", "occurrenceSnapshot",
  "occurrenceSnapshotSha256", "decision",
  "orientationProposal", "selectedTradition", "decisionReason", "applicabilityConditions",
  "counterexamples", "revisionRequest", "additionalSourceUrls", "expertTruthClaimed",
  "formalActivationAllowed", "scoringAllowed", "goodBadOrientation", "eventOutcome", "result"
] as const);
const SOURCE_REF_KEYS = Object.freeze([
  "sourceId", "locator", "bindingTarget", "semanticCandidateSupport"
] as const);
const COUNT_KEYS = Object.freeze(["total", "unresolved", "approve", "revise", "reject"] as const);
const ORIENTATION_COUNT_KEYS = Object.freeze([
  "total", "unresolved", "potentiallySupportive", "potentiallyChallenging",
  "mixedConditional", "notAssessable"
] as const);
const BOUNDARY_KEYS = Object.freeze([
  "directIdentifiersIncluded", "inputFieldsIncluded", "derivedChartFactsIncluded",
  "externalSharingRequiresUserDecision", "derivedChartFactsRemainSensitive", "sha256IsNotEncryption",
  "identityVerified", "digitalSignatureVerified", "eligibleForFormalActivation",
  "autoIntegrationAllowed", "networkTransmissionPerformed", "ruleArtifactOrStorageMutationPerformed",
  "scoringAllowed", "deterministicOutcomeEstablished",
  "staticCatalogDecisionInheritanceApplied", "goodBadOrientation", "eventOutcome", "result"
] as const);

const DECISIONS = new Set<string>(
  ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_FEEDBACK_PROFILE.allowedDecisions
);
const ORIENTATIONS = new Set<string>(
  ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_FEEDBACK_PROFILE.allowedOrientationProposals
);
const NOMENCLATURE_STATES = new Set<string>(["none", "classical_tiankong_not_dikong"]);

function assertRecord(value: unknown, subject: string): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${subject} 必须是对象`);
  }
}

function assertExactKeys(
  value: Record<string, unknown>, expected: readonly string[], subject: string
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(`${subject} 字段集合不符合当前契约`);
  }
}

function stringValue(value: unknown, subject: string, maxLength = 20_000): string {
  if (typeof value !== "string" || value.length > maxLength) {
    throw new Error(`${subject} 必须是长度不超过 ${maxLength} 的字符串`);
  }
  return value;
}

function nullableString(value: unknown, subject: string, maxLength = 500): string | null {
  if (value === null) return null;
  return stringValue(value, subject, maxLength);
}

function integerValue(value: unknown, subject: string, minimum = 0): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new Error(`${subject} 必须是大于等于 ${minimum} 的安全整数`);
  }
  return value as number;
}

function falseValue(value: unknown, subject: string): false {
  if (value !== false) throw new Error(`${subject} 必须保持 false`);
  return false;
}

function trueValue(value: unknown, subject: string): true {
  if (value !== true) throw new Error(`${subject} 必须保持 true`);
  return true;
}

function nullValue(value: unknown, subject: string): null {
  if (value !== null) throw new Error(`${subject} 必须保持 null`);
  return null;
}

function digestValue(value: unknown, subject: string): string {
  const digest = stringValue(value, subject, 64);
  if (!/^[a-f0-9]{64}$/u.test(digest)) throw new Error(`${subject} 必须是小写 SHA-256`);
  return digest;
}

function stringArray(
  value: unknown,
  subject: string,
  options: Readonly<{ maxItems?: number; httpsOnly?: boolean }> = {}
): readonly string[] {
  if (!Array.isArray(value) || value.length > (options.maxItems ?? 200)) {
    throw new Error(`${subject} 必须是受限字符串数组`);
  }
  const result = value.map((entry, index) => stringValue(entry, `${subject}[${index}]`, 4_000));
  if (options.httpsOnly && result.some((entry) => {
    try { return new URL(entry).protocol !== "https:"; } catch { return true; }
  })) {
    throw new Error(`${subject} 只接受有效 HTTPS URL`);
  }
  if (new Set(result).size !== result.length) throw new Error(`${subject} 不得包含重复项`);
  return Object.freeze(result);
}

function freezeJsonSnapshot(value: unknown, subject: string, depth = 0): unknown {
  if (depth > 20) throw new Error(`${subject} 嵌套层级超过当前契约限制`);
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) {
    if (value.length > 2_000) throw new Error(`${subject} 数组过长`);
    return Object.freeze(value.map((entry, index) => (
      freezeJsonSnapshot(entry, `${subject}[${index}]`, depth + 1)
    )));
  }
  assertRecord(value, subject);
  const entries = Object.entries(value);
  if (entries.length > 200) throw new Error(`${subject} 字段过多`);
  return Object.freeze(Object.fromEntries(entries.map(([key, entry]) => [
    key,
    freezeJsonSnapshot(entry, `${subject}.${key}`, depth + 1)
  ])));
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function validReviewedAt(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/u.test(value)) {
    return false;
  }
  return Number.isFinite(Date.parse(value));
}

async function sha256Text(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error("当前运行环境不支持 SHA-256 内容绑定");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function createSourceRegistry(
  projection: BrowserProbeDisplayProjection
): readonly ZiweiCoreMinorStarSanfangReviewSource[] {
  const geometry = projection.sanfangProjectionRule;
  const sources: readonly ZiweiCoreMinorStarSanfangReviewSource[] = Object.freeze([
    ...projection.coreMinorStarContentSources.map((source) => Object.freeze({
      sourceId: source.sourceId,
      sourceKind: source.sourceKind,
      title: source.title,
      sourceUrl: source.sourceUrl,
      accessedAt: source.accessedAt,
      usageBoundary: source.usageBoundary,
      semanticCandidateSupport:
        source.sourceKind === "modern_original_minor_star_learning_material",
      expertTruthClaimed: false as const
    })),
    ...projection.majorStarPalaceContentSources.map((source) => Object.freeze({
      sourceId: source.sourceId,
      sourceKind: source.sourceKind,
      title: source.title,
      sourceUrl: source.sourceUrl,
      accessedAt: source.accessedAt,
      usageBoundary: source.usageBoundary,
      semanticCandidateSupport: true,
      expertTruthClaimed: false as const
    })),
    Object.freeze({
      sourceId: geometry.ruleId,
      sourceKind: geometry.sourceKind,
      title: geometry.sourceTitle,
      sourceUrl: geometry.sourceUrl,
      accessedAt: geometry.accessedAt,
      usageBoundary: "只支持本宫、对宫与两组三合位的关系位置；不支持星义、吉凶、事件或结果断语。",
      semanticCandidateSupport: false,
      expertTruthClaimed: false as const
    })
  ]);
  if (sources.length !== 5 || new Set(sources.map((source) => source.sourceId)).size !== 5) {
    throw new Error("当前盘核心十二辅煞动态审稿必须绑定核心星曜 2、宫位 2、几何 1 共五条来源");
  }
  return sources;
}

function occurrenceSnapshot(
  occurrence: BrowserProbeCoreMinorStarSanfangOccurrenceReview
): BrowserProbeCoreMinorStarSanfangOccurrenceReview {
  return occurrence;
}

function occurrenceProjectionSnapshot(projection: BrowserProbeDisplayProjection): object {
  return {
    reviewVersion: ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_VERSION,
    sanfangProjectionRule: projection.sanfangProjectionRule,
    reviews: projection.coreMinorStarSanfangReviews
  };
}

async function createItems(
  projection: BrowserProbeDisplayProjection
): Promise<readonly ZiweiCoreMinorStarSanfangReviewFeedbackItem[]> {
  let itemOrder = 0;
  const pending = projection.coreMinorStarSanfangReviews.flatMap((review) => (
    review.occurrences.map((occurrence) => {
      itemOrder += 1;
      return Object.freeze({ review, occurrence, itemOrder });
    })
  ));
  return Object.freeze(await Promise.all(pending.map(async ({ review, occurrence, itemOrder }) => (
    Object.freeze<ZiweiCoreMinorStarSanfangReviewFeedbackItem>({
      occurrenceId: occurrence.occurrenceId,
      order: itemOrder,
      reviewId: review.reviewId,
      reviewOrder: review.order,
      occurrenceOrder: occurrence.order,
      targetPalaceRoleId: review.targetPalaceRoleId,
      targetPalaceRoleLabel: review.targetPalaceRoleLabel,
      targetEarthlyBranchId: review.targetEarthlyBranchId,
      relation: occurrence.relation,
      relationLabel: occurrence.relationLabel,
      palaceRoleId: occurrence.palaceRoleId,
      palaceRoleLabel: occurrence.palaceRoleLabel,
      palaceEarthlyBranchId: occurrence.palaceEarthlyBranchId,
      starId: occurrence.starId,
      starLabel: occurrence.starLabel,
      brightnessLabel: occurrence.brightnessLabel,
      transformations: Object.freeze([...occurrence.transformations]),
      nomenclatureConflictState: occurrence.nomenclatureConflictState,
      ruleSnapshotSha256: occurrence.ruleSnapshotSha256,
      artifactFactsSha256: occurrence.artifactFactsSha256,
      baseCandidateContentId: occurrence.baseCandidateContentId,
      palaceCandidateContentId: occurrence.palaceCandidateContentId,
      factSummary:
        `${review.targetPalaceRoleLabel}三方四正／${occurrence.relationLabel}`
        + `${occurrence.palaceRoleLabel}／${occurrence.starLabel}`
        + `${occurrence.brightnessLabel ? `／亮度${occurrence.brightnessLabel}` : ""}`
        + `${occurrence.transformations.length ? `／四化${occurrence.transformations.join("、")}` : ""}`,
      directStatement: occurrence.directStatement,
      counterweight: occurrence.palaceCandidateContent.counterweight,
      reviewQuestions: Object.freeze([
        occurrence.baseCandidateContent.reviewPrompt,
        occurrence.palaceCandidateContent.reviewPrompt,
        ...review.reviewQuestions
      ]),
      sourceRefs: Object.freeze(occurrence.sourceRefs.map((ref) => Object.freeze({ ...ref }))),
      occurrenceSnapshot: occurrenceSnapshot(occurrence),
      occurrenceSnapshotSha256: await sha256Text(`${JSON.stringify(occurrenceSnapshot(occurrence))}\n`),
      decision: "unresolved",
      orientationProposal: "unresolved",
      selectedTradition: "",
      decisionReason: "",
      applicabilityConditions: "",
      counterexamples: "",
      revisionRequest: "",
      additionalSourceUrls: Object.freeze([]),
      expertTruthClaimed: false,
      formalActivationAllowed: false,
      scoringAllowed: false,
      goodBadOrientation: null,
      eventOutcome: null,
      result: null
    })
  ))));
}

async function createProjectionBinding(
  projection: BrowserProbeDisplayProjection,
  items: readonly ZiweiCoreMinorStarSanfangReviewFeedbackItem[],
  sources: readonly ZiweiCoreMinorStarSanfangReviewSource[]
): Promise<ZiweiCoreMinorStarSanfangReviewProjectionBinding> {
  const reviews = projection.coreMinorStarSanfangReviews;
  const first = reviews[0] ?? fail("当前盘核心十二辅煞动态审稿缺少十二宫 review");
  return Object.freeze({
    reviewVersion: ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_VERSION,
    sanfangRuleId: projection.sanfangProjectionRule.ruleId,
    sanfangRuleMethod: projection.sanfangProjectionRule.method,
    sanfangRuleSourceUrl: projection.sanfangProjectionRule.sourceUrl,
    ruleSnapshotSha256: first.ruleSnapshotSha256,
    artifactFactsSha256: first.artifactFactsSha256,
    occurrenceProjectionSha256:
      await sha256Text(`${JSON.stringify(occurrenceProjectionSnapshot(projection))}\n`),
    orderedReviewIdsSha256:
      await sha256Text(`${reviews.map((review) => review.reviewId).join("\n")}\n`),
    orderedOccurrenceIdsSha256:
      await sha256Text(`${items.map((item) => item.occurrenceId).join("\n")}\n`),
    orderedSourceIdsSha256:
      await sha256Text(`${sources.map((source) => source.sourceId).join("\n")}\n`),
    sourceRegistrySha256: await sha256Text(`${JSON.stringify(sources)}\n`),
    reviewCount: 12,
    itemCount: items.length,
    sourceCount: 5
  });
}

function makeCounts(
  items: readonly ZiweiCoreMinorStarSanfangReviewFeedbackItem[]
): ZiweiCoreMinorStarSanfangReviewCounts {
  const counts = { total: items.length, unresolved: 0, approve: 0, revise: 0, reject: 0 };
  for (const item of items) counts[item.decision] += 1;
  return Object.freeze(counts);
}

function makeOrientationCounts(
  items: readonly ZiweiCoreMinorStarSanfangReviewFeedbackItem[]
): ZiweiCoreMinorStarSanfangReviewOrientationCounts {
  const counts = {
    total: items.length,
    unresolved: 0,
    potentiallySupportive: 0,
    potentiallyChallenging: 0,
    mixedConditional: 0,
    notAssessable: 0
  };
  for (const item of items) {
    switch (item.orientationProposal) {
      case "unresolved": counts.unresolved += 1; break;
      case "potentially_supportive": counts.potentiallySupportive += 1; break;
      case "potentially_challenging": counts.potentiallyChallenging += 1; break;
      case "mixed_conditional": counts.mixedConditional += 1; break;
      case "not_assessable": counts.notAssessable += 1; break;
    }
  }
  return Object.freeze(counts);
}

function boundary(): ZiweiCoreMinorStarSanfangReviewBoundary {
  return Object.freeze({
    directIdentifiersIncluded: false,
    inputFieldsIncluded: false,
    derivedChartFactsIncluded: true,
    externalSharingRequiresUserDecision: true,
    derivedChartFactsRemainSensitive: true,
    sha256IsNotEncryption: true,
    identityVerified: false,
    digitalSignatureVerified: false,
    eligibleForFormalActivation: false,
    autoIntegrationAllowed: false,
    networkTransmissionPerformed: false,
    ruleArtifactOrStorageMutationPerformed: false,
    scoringAllowed: false,
    deterministicOutcomeEstablished: false,
    staticCatalogDecisionInheritanceApplied: false,
    goodBadOrientation: null,
    eventOutcome: null,
    result: null
  });
}

function freezeEnvelope(
  envelope: ZiweiCoreMinorStarSanfangReviewFeedbackEnvelope
): ZiweiCoreMinorStarSanfangReviewFeedbackEnvelope {
  return Object.freeze({
    profile: ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_FEEDBACK_PROFILE,
    projectionBinding: Object.freeze({ ...envelope.projectionBinding }),
    sourceRegistry: Object.freeze(envelope.sourceRegistry.map((source) => Object.freeze({ ...source }))),
    reviewer: Object.freeze({ ...envelope.reviewer }),
    reviewSession: Object.freeze({ ...envelope.reviewSession }),
    items: Object.freeze(envelope.items.map((item) => Object.freeze({
      ...item,
      transformations: Object.freeze([...item.transformations]),
      reviewQuestions: Object.freeze([...item.reviewQuestions]),
      sourceRefs: Object.freeze(item.sourceRefs.map((ref) => Object.freeze({ ...ref }))),
      occurrenceSnapshot: freezeJsonSnapshot(
        item.occurrenceSnapshot,
        `items[${item.order - 1}].occurrenceSnapshot`
      ) as BrowserProbeCoreMinorStarSanfangOccurrenceReview,
      additionalSourceUrls: Object.freeze([...item.additionalSourceUrls])
    }))),
    declaredCounts: Object.freeze({ ...envelope.declaredCounts }),
    declaredOrientationProposalCounts:
      Object.freeze({ ...envelope.declaredOrientationProposalCounts }),
    boundary: Object.freeze({ ...envelope.boundary })
  });
}

function assertProjectionEligible(projection: BrowserProbeDisplayProjection): void {
  const reviews = projection.coreMinorStarSanfangReviews;
  if (JSON.stringify(projection.sanfangProjectionRule)
      !== JSON.stringify(ZIWEI_CORE_MINOR_STAR_SANFANG_PROJECTION_RULE)
    || JSON.stringify(projection.coreMinorStarContentSources)
      !== JSON.stringify(ZIWEI_CORE_MINOR_STAR_CONTENT_SOURCES)
    || JSON.stringify(projection.majorStarPalaceContentSources)
      !== JSON.stringify(ZIWEI_MAJOR_STAR_PALACE_CONTENT_SOURCES)
    || JSON.stringify(projection.coreMinorStarCandidateContent)
      !== JSON.stringify(ZIWEI_CORE_MINOR_STAR_CANDIDATE_CONTENT)
    || JSON.stringify(projection.coreMinorStarPalaceCandidateContent)
      !== JSON.stringify(ZIWEI_CORE_MINOR_STAR_PALACE_CANDIDATE_CONTENT)
    || reviews.length !== 12
    || reviews.some((review, index) => review.order !== index + 1
      || review.reviewVersion !== ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_VERSION
      || review.sanfangProjectionRule.ruleId !== projection.sanfangProjectionRule.ruleId
      || review.goodBadOrientation !== null
      || review.eventOutcome !== null
      || review.result !== null
      || review.expertTruthClaimed
      || review.directOutcomeAllowed
      || review.scoringAllowed)
    || new Set(reviews.map((review) => review.ruleSnapshotSha256)).size !== 1
    || new Set(reviews.map((review) => review.artifactFactsSha256)).size !== 1) {
    throw new Error("动态审稿模板只接受当前失败关闭且哈希一致的十二宫核心辅煞 occurrence 投影");
  }
  const occurrences = reviews.flatMap((review) => review.occurrences);
  if (occurrences.length !== 48
    || new Set(occurrences.map((occurrence) => occurrence.occurrenceId)).size !== 48
    || new Set(occurrences.map((occurrence) => occurrence.starId)).size !== 12) {
    throw new Error("当前盘核心十二辅煞 occurrence 必须是十二事实各进入四组的 48 项结构覆盖");
  }
  const expected = createCoreMinorStarSanfangReviews({
    palaces: projection.displayPalaces,
    sanfangGroups: projection.displaySanfangGroups,
    sanfangProjectionRule: projection.sanfangProjectionRule,
    ruleSnapshotSha256: reviews[0]!.ruleSnapshotSha256,
    artifactFactsSha256: reviews[0]!.artifactFactsSha256
  });
  if (JSON.stringify(reviews) !== JSON.stringify(expected)) {
    throw new Error("当前盘核心十二辅煞动态 review 不是从当前最小事实投影严格重建的结果");
  }
}

export async function createZiweiCoreMinorStarSanfangReviewFeedbackTemplate(
  projection: BrowserProbeDisplayProjection
): Promise<ZiweiCoreMinorStarSanfangReviewFeedbackEnvelope> {
  assertProjectionEligible(projection);
  const items = await createItems(projection);
  const sources = createSourceRegistry(projection);
  return freezeEnvelope({
    profile: ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_FEEDBACK_PROFILE,
    projectionBinding: await createProjectionBinding(projection, items, sources),
    sourceRegistry: sources,
    reviewer: Object.freeze({
      reviewerId: "", displayName: "", affiliation: "", expertiseStatement: "",
      identityEvidenceReference: "", identityVerified: false
    }),
    reviewSession: Object.freeze({
      reviewedAt: "", methodology: "", traditionScope: "", generalNotes: ""
    }),
    items,
    declaredCounts: makeCounts(items),
    declaredOrientationProposalCounts: makeOrientationCounts(items),
    boundary: boundary()
  });
}

export function serializeZiweiCoreMinorStarSanfangReviewFeedbackTemplate(
  template: ZiweiCoreMinorStarSanfangReviewFeedbackEnvelope
): string {
  return `${JSON.stringify(template, null, 2)}\n`;
}

export function ziweiCoreMinorStarSanfangReviewFeedbackFilename(): string {
  return "hakimi-ziwei-current-chart-core-minor-sanfang-review-v013.json";
}

function parseProfile(
  value: unknown
): typeof ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_FEEDBACK_PROFILE {
  assertRecord(value, "profile");
  assertExactKeys(value, PROFILE_KEYS, "profile");
  for (const key of PROFILE_KEYS) {
    if (JSON.stringify(value[key]) !== JSON.stringify(
      ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_FEEDBACK_PROFILE[
        key as keyof typeof ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_FEEDBACK_PROFILE
      ]
    )) throw new Error(`动态审稿 profile.${key} 与当前 v0.13 契约不一致`);
  }
  return ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_FEEDBACK_PROFILE;
}

function parseBinding(value: unknown): ZiweiCoreMinorStarSanfangReviewProjectionBinding {
  assertRecord(value, "projectionBinding");
  assertExactKeys(value, BINDING_KEYS, "projectionBinding");
  const reviewVersion = stringValue(value.reviewVersion, "projectionBinding.reviewVersion", 200);
  const method = stringValue(value.sanfangRuleMethod, "projectionBinding.sanfangRuleMethod", 200);
  if (reviewVersion !== ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_VERSION
    || method !== "target_index_self_plus_minus_4_and_plus_6") {
    throw new Error("projectionBinding 的 reviewVersion 或三方四正规则不受支持");
  }
  const reviewCount = integerValue(value.reviewCount, "projectionBinding.reviewCount", 1);
  const sourceCount = integerValue(value.sourceCount, "projectionBinding.sourceCount", 1);
  if (reviewCount !== 12 || sourceCount !== 5) throw new Error("projectionBinding 固定计数失配");
  return Object.freeze({
    reviewVersion: ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_VERSION,
    sanfangRuleId: stringValue(value.sanfangRuleId, "projectionBinding.sanfangRuleId", 500),
    sanfangRuleMethod: "target_index_self_plus_minus_4_and_plus_6",
    sanfangRuleSourceUrl: stringValue(value.sanfangRuleSourceUrl, "projectionBinding.sanfangRuleSourceUrl", 4_000),
    ruleSnapshotSha256: digestValue(value.ruleSnapshotSha256, "projectionBinding.ruleSnapshotSha256"),
    artifactFactsSha256: digestValue(value.artifactFactsSha256, "projectionBinding.artifactFactsSha256"),
    occurrenceProjectionSha256: digestValue(value.occurrenceProjectionSha256, "projectionBinding.occurrenceProjectionSha256"),
    orderedReviewIdsSha256: digestValue(value.orderedReviewIdsSha256, "projectionBinding.orderedReviewIdsSha256"),
    orderedOccurrenceIdsSha256: digestValue(value.orderedOccurrenceIdsSha256, "projectionBinding.orderedOccurrenceIdsSha256"),
    orderedSourceIdsSha256: digestValue(value.orderedSourceIdsSha256, "projectionBinding.orderedSourceIdsSha256"),
    sourceRegistrySha256: digestValue(value.sourceRegistrySha256, "projectionBinding.sourceRegistrySha256"),
    reviewCount: 12,
    itemCount: integerValue(value.itemCount, "projectionBinding.itemCount", 1),
    sourceCount: 5
  });
}

function parseSource(value: unknown, index: number): ZiweiCoreMinorStarSanfangReviewSource {
  const subject = `sourceRegistry[${index}]`;
  assertRecord(value, subject);
  assertExactKeys(value, SOURCE_KEYS, subject);
  if (typeof value.semanticCandidateSupport !== "boolean") {
    throw new Error(`${subject}.semanticCandidateSupport 必须是布尔值`);
  }
  return Object.freeze({
    sourceId: stringValue(value.sourceId, `${subject}.sourceId`, 500),
    sourceKind: stringValue(value.sourceKind, `${subject}.sourceKind`, 500),
    title: stringValue(value.title, `${subject}.title`, 2_000),
    sourceUrl: stringValue(value.sourceUrl, `${subject}.sourceUrl`, 4_000),
    accessedAt: stringValue(value.accessedAt, `${subject}.accessedAt`, 100),
    usageBoundary: stringValue(value.usageBoundary, `${subject}.usageBoundary`, 8_000),
    semanticCandidateSupport: value.semanticCandidateSupport,
    expertTruthClaimed: falseValue(value.expertTruthClaimed, `${subject}.expertTruthClaimed`)
  });
}

function parseReviewer(value: unknown): ZiweiCoreMinorStarSanfangReviewReviewer {
  assertRecord(value, "reviewer");
  assertExactKeys(value, REVIEWER_KEYS, "reviewer");
  return Object.freeze({
    reviewerId: stringValue(value.reviewerId, "reviewer.reviewerId", 300),
    displayName: stringValue(value.displayName, "reviewer.displayName", 500),
    affiliation: stringValue(value.affiliation, "reviewer.affiliation", 1_000),
    expertiseStatement: stringValue(value.expertiseStatement, "reviewer.expertiseStatement", 4_000),
    identityEvidenceReference: stringValue(value.identityEvidenceReference, "reviewer.identityEvidenceReference", 4_000),
    identityVerified: falseValue(value.identityVerified, "reviewer.identityVerified")
  });
}

function parseSession(value: unknown): ZiweiCoreMinorStarSanfangReviewSession {
  assertRecord(value, "reviewSession");
  assertExactKeys(value, SESSION_KEYS, "reviewSession");
  return Object.freeze({
    reviewedAt: stringValue(value.reviewedAt, "reviewSession.reviewedAt", 100),
    methodology: stringValue(value.methodology, "reviewSession.methodology", 8_000),
    traditionScope: stringValue(value.traditionScope, "reviewSession.traditionScope", 4_000),
    generalNotes: stringValue(value.generalNotes, "reviewSession.generalNotes", 12_000)
  });
}

function parseSourceRef(value: unknown, subject: string): BrowserProbeCoreMinorStarSourceRef {
  assertRecord(value, subject);
  assertExactKeys(value, SOURCE_REF_KEYS, subject);
  const bindingTarget = stringValue(value.bindingTarget, `${subject}.bindingTarget`, 100);
  if (!["exact_star", "exact_palace_role", "nomenclature_conflict"].includes(bindingTarget)) {
    throw new Error(`${subject}.bindingTarget 不受支持`);
  }
  if (typeof value.semanticCandidateSupport !== "boolean") {
    throw new Error(`${subject}.semanticCandidateSupport 必须是布尔值`);
  }
  return Object.freeze({
    sourceId: stringValue(value.sourceId, `${subject}.sourceId`, 500),
    locator: stringValue(value.locator, `${subject}.locator`, 4_000),
    bindingTarget: bindingTarget as BrowserProbeCoreMinorStarSourceRef["bindingTarget"],
    semanticCandidateSupport: value.semanticCandidateSupport
  });
}

function parseItem(value: unknown, index: number): ZiweiCoreMinorStarSanfangReviewFeedbackItem {
  const subject = `items[${index}]`;
  assertRecord(value, subject);
  assertExactKeys(value, ITEM_KEYS, subject);
  const decision = stringValue(value.decision, `${subject}.decision`, 100);
  const orientation = stringValue(value.orientationProposal, `${subject}.orientationProposal`, 100);
  const nomenclature = stringValue(value.nomenclatureConflictState, `${subject}.nomenclatureConflictState`, 100);
  if (!DECISIONS.has(decision)) throw new Error(`${subject}.decision 不受支持`);
  if (!ORIENTATIONS.has(orientation)) throw new Error(`${subject}.orientationProposal 不受支持`);
  if (!NOMENCLATURE_STATES.has(nomenclature)) throw new Error(`${subject}.nomenclatureConflictState 不受支持`);
  if (!Array.isArray(value.sourceRefs)) throw new Error(`${subject}.sourceRefs 必须是数组`);
  return Object.freeze({
    occurrenceId: stringValue(value.occurrenceId, `${subject}.occurrenceId`, 600),
    order: integerValue(value.order, `${subject}.order`, 1),
    reviewId: stringValue(value.reviewId, `${subject}.reviewId`, 600),
    reviewOrder: integerValue(value.reviewOrder, `${subject}.reviewOrder`, 1),
    occurrenceOrder: integerValue(value.occurrenceOrder, `${subject}.occurrenceOrder`, 1),
    targetPalaceRoleId: stringValue(value.targetPalaceRoleId, `${subject}.targetPalaceRoleId`, 100),
    targetPalaceRoleLabel: stringValue(value.targetPalaceRoleLabel, `${subject}.targetPalaceRoleLabel`, 100),
    targetEarthlyBranchId: stringValue(value.targetEarthlyBranchId, `${subject}.targetEarthlyBranchId`, 100),
    relation: stringValue(value.relation, `${subject}.relation`, 100),
    relationLabel: stringValue(value.relationLabel, `${subject}.relationLabel`, 100),
    palaceRoleId: stringValue(value.palaceRoleId, `${subject}.palaceRoleId`, 100),
    palaceRoleLabel: stringValue(value.palaceRoleLabel, `${subject}.palaceRoleLabel`, 100),
    palaceEarthlyBranchId: stringValue(value.palaceEarthlyBranchId, `${subject}.palaceEarthlyBranchId`, 100),
    starId: stringValue(value.starId, `${subject}.starId`, 500),
    starLabel: stringValue(value.starLabel, `${subject}.starLabel`, 100),
    brightnessLabel: nullableString(value.brightnessLabel, `${subject}.brightnessLabel`, 100),
    transformations: stringArray(value.transformations, `${subject}.transformations`, { maxItems: 4 }),
    nomenclatureConflictState: nomenclature as ZiweiCoreMinorStarSanfangReviewFeedbackItem["nomenclatureConflictState"],
    ruleSnapshotSha256: digestValue(value.ruleSnapshotSha256, `${subject}.ruleSnapshotSha256`),
    artifactFactsSha256: digestValue(value.artifactFactsSha256, `${subject}.artifactFactsSha256`),
    baseCandidateContentId: stringValue(value.baseCandidateContentId, `${subject}.baseCandidateContentId`, 600),
    palaceCandidateContentId: stringValue(value.palaceCandidateContentId, `${subject}.palaceCandidateContentId`, 600),
    factSummary: stringValue(value.factSummary, `${subject}.factSummary`, 8_000),
    directStatement: stringValue(value.directStatement, `${subject}.directStatement`, 20_000),
    counterweight: stringValue(value.counterweight, `${subject}.counterweight`, 12_000),
    reviewQuestions: stringArray(value.reviewQuestions, `${subject}.reviewQuestions`, { maxItems: 20 }),
    sourceRefs: Object.freeze(value.sourceRefs.map((ref, refIndex) => (
      parseSourceRef(ref, `${subject}.sourceRefs[${refIndex}]`)
    ))),
    occurrenceSnapshot: freezeJsonSnapshot(
      value.occurrenceSnapshot,
      `${subject}.occurrenceSnapshot`
    ) as BrowserProbeCoreMinorStarSanfangOccurrenceReview,
    occurrenceSnapshotSha256: digestValue(value.occurrenceSnapshotSha256, `${subject}.occurrenceSnapshotSha256`),
    decision: decision as ZiweiCoreMinorStarSanfangReviewDecision,
    orientationProposal: orientation as ZiweiCoreMinorStarSanfangReviewOrientationProposal,
    selectedTradition: stringValue(value.selectedTradition, `${subject}.selectedTradition`, 4_000),
    decisionReason: stringValue(value.decisionReason, `${subject}.decisionReason`, 12_000),
    applicabilityConditions: stringValue(value.applicabilityConditions, `${subject}.applicabilityConditions`, 12_000),
    counterexamples: stringValue(value.counterexamples, `${subject}.counterexamples`, 12_000),
    revisionRequest: stringValue(value.revisionRequest, `${subject}.revisionRequest`, 12_000),
    additionalSourceUrls: stringArray(value.additionalSourceUrls, `${subject}.additionalSourceUrls`, { maxItems: 50, httpsOnly: true }),
    expertTruthClaimed: falseValue(value.expertTruthClaimed, `${subject}.expertTruthClaimed`),
    formalActivationAllowed: falseValue(value.formalActivationAllowed, `${subject}.formalActivationAllowed`),
    scoringAllowed: falseValue(value.scoringAllowed, `${subject}.scoringAllowed`),
    goodBadOrientation: nullValue(value.goodBadOrientation, `${subject}.goodBadOrientation`),
    eventOutcome: nullValue(value.eventOutcome, `${subject}.eventOutcome`),
    result: nullValue(value.result, `${subject}.result`)
  });
}

function parseCounts(value: unknown): ZiweiCoreMinorStarSanfangReviewCounts {
  assertRecord(value, "declaredCounts");
  assertExactKeys(value, COUNT_KEYS, "declaredCounts");
  return Object.freeze(Object.fromEntries(COUNT_KEYS.map((key) => [
    key, integerValue(value[key], `declaredCounts.${key}`)
  ]))) as unknown as ZiweiCoreMinorStarSanfangReviewCounts;
}

function parseOrientationCounts(value: unknown): ZiweiCoreMinorStarSanfangReviewOrientationCounts {
  assertRecord(value, "declaredOrientationProposalCounts");
  assertExactKeys(value, ORIENTATION_COUNT_KEYS, "declaredOrientationProposalCounts");
  return Object.freeze(Object.fromEntries(ORIENTATION_COUNT_KEYS.map((key) => [
    key, integerValue(value[key], `declaredOrientationProposalCounts.${key}`)
  ]))) as unknown as ZiweiCoreMinorStarSanfangReviewOrientationCounts;
}

function parseBoundary(value: unknown): ZiweiCoreMinorStarSanfangReviewBoundary {
  assertRecord(value, "boundary");
  assertExactKeys(value, BOUNDARY_KEYS, "boundary");
  return Object.freeze({
    directIdentifiersIncluded: falseValue(value.directIdentifiersIncluded, "boundary.directIdentifiersIncluded"),
    inputFieldsIncluded: falseValue(value.inputFieldsIncluded, "boundary.inputFieldsIncluded"),
    derivedChartFactsIncluded: trueValue(value.derivedChartFactsIncluded, "boundary.derivedChartFactsIncluded"),
    externalSharingRequiresUserDecision: trueValue(value.externalSharingRequiresUserDecision, "boundary.externalSharingRequiresUserDecision"),
    derivedChartFactsRemainSensitive: trueValue(value.derivedChartFactsRemainSensitive, "boundary.derivedChartFactsRemainSensitive"),
    sha256IsNotEncryption: trueValue(value.sha256IsNotEncryption, "boundary.sha256IsNotEncryption"),
    identityVerified: falseValue(value.identityVerified, "boundary.identityVerified"),
    digitalSignatureVerified: falseValue(value.digitalSignatureVerified, "boundary.digitalSignatureVerified"),
    eligibleForFormalActivation: falseValue(value.eligibleForFormalActivation, "boundary.eligibleForFormalActivation"),
    autoIntegrationAllowed: falseValue(value.autoIntegrationAllowed, "boundary.autoIntegrationAllowed"),
    networkTransmissionPerformed: falseValue(value.networkTransmissionPerformed, "boundary.networkTransmissionPerformed"),
    ruleArtifactOrStorageMutationPerformed: falseValue(value.ruleArtifactOrStorageMutationPerformed, "boundary.ruleArtifactOrStorageMutationPerformed"),
    scoringAllowed: falseValue(value.scoringAllowed, "boundary.scoringAllowed"),
    deterministicOutcomeEstablished: falseValue(value.deterministicOutcomeEstablished, "boundary.deterministicOutcomeEstablished"),
    staticCatalogDecisionInheritanceApplied: falseValue(
      value.staticCatalogDecisionInheritanceApplied,
      "boundary.staticCatalogDecisionInheritanceApplied"
    ),
    goodBadOrientation: nullValue(value.goodBadOrientation, "boundary.goodBadOrientation"),
    eventOutcome: nullValue(value.eventOutcome, "boundary.eventOutcome"),
    result: nullValue(value.result, "boundary.result")
  });
}

function parseEnvelope(raw: string): ZiweiCoreMinorStarSanfangReviewFeedbackEnvelope {
  let input: unknown;
  try { input = JSON.parse(raw.replace(/^\uFEFF/u, "")) as unknown; }
  catch (reason) { throw new Error("紫微当前盘核心辅煞动态审稿反馈不是有效 JSON", { cause: reason }); }
  assertRecord(input, "紫微当前盘核心辅煞动态审稿反馈");
  assertExactKeys(input, ROOT_KEYS, "紫微当前盘核心辅煞动态审稿反馈");
  if (!Array.isArray(input.sourceRegistry)) throw new Error("sourceRegistry 必须是数组");
  if (!Array.isArray(input.items)) throw new Error("items 必须是数组");
  return freezeEnvelope({
    profile: parseProfile(input.profile),
    projectionBinding: parseBinding(input.projectionBinding),
    sourceRegistry: Object.freeze(input.sourceRegistry.map(parseSource)),
    reviewer: parseReviewer(input.reviewer),
    reviewSession: parseSession(input.reviewSession),
    items: Object.freeze(input.items.map(parseItem)),
    declaredCounts: parseCounts(input.declaredCounts),
    declaredOrientationProposalCounts: parseOrientationCounts(input.declaredOrientationProposalCounts),
    boundary: parseBoundary(input.boundary)
  });
}

function immutableItemSnapshot(item: ZiweiCoreMinorStarSanfangReviewFeedbackItem): object {
  return Object.fromEntries(Object.entries(item).filter(([key]) => ![
    "decision", "orientationProposal", "selectedTradition", "decisionReason",
    "applicabilityConditions", "counterexamples", "revisionRequest", "additionalSourceUrls"
  ].includes(key)));
}

async function validateAgainstCurrentProjection(
  envelope: ZiweiCoreMinorStarSanfangReviewFeedbackEnvelope,
  projection: BrowserProbeDisplayProjection
): Promise<{
  counts: ZiweiCoreMinorStarSanfangReviewCounts;
  orientationProposalCounts: ZiweiCoreMinorStarSanfangReviewOrientationCounts;
  reviewerAttributionComplete: boolean;
}> {
  assertProjectionEligible(projection);
  const expectedItems = await createItems(projection);
  const expectedSources = createSourceRegistry(projection);
  const expectedBinding = await createProjectionBinding(projection, expectedItems, expectedSources);
  if (JSON.stringify(envelope.projectionBinding) !== JSON.stringify(expectedBinding)) {
    throw new Error("动态审稿反馈没有绑定当前命盘的十二组 occurrence，或摘要已失配");
  }
  if (JSON.stringify(envelope.sourceRegistry) !== JSON.stringify(expectedSources)) {
    throw new Error("动态审稿反馈的五来源账与当前投影不一致");
  }
  if (envelope.items.length !== expectedItems.length) {
    throw new Error(`动态审稿反馈必须恰好覆盖当前 ${expectedItems.length} 项 occurrence`);
  }
  let hasHumanInput = false;
  for (const [index, feedback] of envelope.items.entries()) {
    const expected = expectedItems[index]!;
    if (JSON.stringify(immutableItemSnapshot(feedback))
      !== JSON.stringify(immutableItemSnapshot(expected))) {
      throw new Error(`动态审稿反馈第 ${index + 1} 项与当前 occurrence 快照不一致`);
    }
    if (feedback.decision === "unresolved") {
      if (feedback.orientationProposal !== "unresolved"
        || feedback.selectedTradition.trim()
        || feedback.decisionReason.trim()
        || feedback.applicabilityConditions.trim()
        || feedback.counterexamples.trim()
        || feedback.revisionRequest.trim()
        || feedback.additionalSourceUrls.length > 0) {
        throw new Error(`未裁决项不得填写方向提案或裁决字段：${feedback.occurrenceId}`);
      }
    } else {
      hasHumanInput = true;
      if (feedback.orientationProposal === "unresolved") {
        throw new Error(`已裁决项必须填写条件化方向提案：${feedback.occurrenceId}`);
      }
      if (!feedback.selectedTradition.trim()
        || !feedback.decisionReason.trim()
        || !feedback.applicabilityConditions.trim()
        || !feedback.counterexamples.trim()) {
        throw new Error(`已裁决项必须填写传统、决定理由、成立条件与反例：${feedback.occurrenceId}`);
      }
      if (feedback.decision === "revise" && !feedback.revisionRequest.trim()) {
        throw new Error(`退修项必须填写修改要求：${feedback.occurrenceId}`);
      }
      if (feedback.decision !== "revise" && feedback.revisionRequest.trim()) {
        throw new Error(`只有退修项可以填写修改要求：${feedback.occurrenceId}`);
      }
    }
  }
  const attributionValues = [
    envelope.reviewer.reviewerId,
    envelope.reviewer.displayName,
    envelope.reviewer.affiliation,
    envelope.reviewer.expertiseStatement,
    envelope.reviewer.identityEvidenceReference,
    envelope.reviewSession.reviewedAt,
    envelope.reviewSession.methodology,
    envelope.reviewSession.traditionScope,
    envelope.reviewSession.generalNotes
  ];
  if (attributionValues.some((value) => value.trim())) hasHumanInput = true;
  const reviewerAttributionComplete = Boolean(
    envelope.reviewer.reviewerId.trim()
    && envelope.reviewer.displayName.trim()
    && envelope.reviewer.expertiseStatement.trim()
    && envelope.reviewSession.methodology.trim()
    && envelope.reviewSession.traditionScope.trim()
    && validReviewedAt(envelope.reviewSession.reviewedAt)
  );
  if (hasHumanInput && !reviewerAttributionComplete) {
    throw new Error("填写任何动态审稿内容后，必须提供 reviewerId、显示名、专业说明、ISO 审稿时间、方法与流派范围");
  }
  const counts = makeCounts(envelope.items);
  if (COUNT_KEYS.some((key) => envelope.declaredCounts[key] !== counts[key])) {
    throw new Error("declaredCounts 与逐项决定不一致");
  }
  const orientationProposalCounts = makeOrientationCounts(envelope.items);
  if (ORIENTATION_COUNT_KEYS.some((key) => (
    envelope.declaredOrientationProposalCounts[key] !== orientationProposalCounts[key]
  ))) throw new Error("declaredOrientationProposalCounts 与逐项方向提案不一致");
  return { counts, orientationProposalCounts, reviewerAttributionComplete };
}

export async function preflightZiweiCoreMinorStarSanfangReviewFeedback(
  raw: string,
  currentProjection: BrowserProbeDisplayProjection
): Promise<ZiweiCoreMinorStarSanfangReviewFeedbackPreflight> {
  const bytes = new TextEncoder().encode(raw).byteLength;
  if (bytes === 0 || bytes > ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_FEEDBACK_MAX_BYTES) {
    throw new Error("紫微当前盘核心辅煞动态审稿反馈必须是 1 字节至 2 MiB 的 UTF-8 JSON");
  }
  const envelope = parseEnvelope(raw);
  const { counts, orientationProposalCounts, reviewerAttributionComplete } =
    await validateAgainstCurrentProjection(envelope, currentProjection);
  const resolvedCount = counts.approve + counts.revise + counts.reject;
  return Object.freeze({
    envelope,
    counts,
    orientationProposalCounts,
    resolvedCount,
    unresolvedCount: counts.unresolved,
    allItemsResolved: counts.unresolved === 0,
    reviewerAttributionComplete,
    currentProjectionBound: true,
    identityVerified: false,
    digitalSignatureVerified: false,
    eligibleForFormalActivation: false,
    autoIntegrationAllowed: false,
    networkTransmissionPerformed: false,
    ruleArtifactOrStorageMutationPerformed: false,
    scoringAllowed: false,
    deterministicOutcomeEstablished: false,
    staticCatalogDecisionInheritanceApplied: false,
    goodBadOrientation: null,
    eventOutcome: null,
    result: null
  });
}

function fail(message: string): never {
  throw new Error(message);
}
