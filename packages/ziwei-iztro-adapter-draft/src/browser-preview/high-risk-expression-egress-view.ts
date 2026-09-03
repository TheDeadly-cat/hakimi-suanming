/*
 * Ephemeral, role-aware last-mile view over Ziwei browser display candidates.
 *
 * The projection view below does not mutate the raw projection, persist policy
 * receipts, or grant content, expert, rights, release, or production authority.
 * It only creates an in-memory decision map for explicitly enumerated candidate
 * text leaves. Review guardrails and feedback/file surfaces stay outside that
 * fourteen-surface map; a separate imported-feedback DOM map is defined later.
 */

import type { BrowserProbeDisplayProjection } from "./browser-protocol.ts";
import {
  preflightZiweiCoreMinorStarSanfangReviewFeedback,
  type ZiweiCoreMinorStarSanfangReviewFeedbackPreflight
} from "./core-minor-star-sanfang-review-feedback.ts";
import {
  createZiweiHighRiskEgressRequest,
  evaluateZiweiHighRiskEgressRequest,
  type ZiweiHighRiskEgressDecision
} from "./high-risk-expression-egress-policy.ts";
import {
  preflightZiweiNatalTransformationPalaceReviewFeedback,
  type ZiweiNatalTransformationPalaceReviewFeedbackPreflight
} from "./natal-transformation-palace-review-feedback.ts";

const NATIVE_OBJECT = Object;
const NATIVE_ARRAY = Array;
const NATIVE_ERROR = Error;
const NATIVE_JSON = JSON;
const NATIVE_REFLECT = Reflect;
const NATIVE_STRING = String;
const NATIVE_WEAK_MAP = WeakMap;
const NATIVE_WEAK_SET = WeakSet;

const OBJECT_CREATE = NATIVE_OBJECT.create;
const OBJECT_DEFINE_PROPERTY = NATIVE_OBJECT.defineProperty;
const OBJECT_FREEZE = NATIVE_OBJECT.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = NATIVE_OBJECT.getOwnPropertyDescriptor;
const OBJECT_IS_FROZEN = NATIVE_OBJECT.isFrozen;
const ARRAY_IS_ARRAY = NATIVE_ARRAY.isArray;
const JSON_STRINGIFY = NATIVE_JSON.stringify;
const REFLECT_APPLY = NATIVE_REFLECT.apply;
const REFLECT_OWN_KEYS = NATIVE_REFLECT.ownKeys;
const STRING_TRIM = NATIVE_STRING.prototype.trim;
const WEAK_MAP_GET = NATIVE_WEAK_MAP.prototype.get;
const WEAK_MAP_SET = NATIVE_WEAK_MAP.prototype.set;
const WEAK_SET_ADD = NATIVE_WEAK_SET.prototype.add;
const WEAK_SET_HAS = NATIVE_WEAK_SET.prototype.has;

type NullRecord = Record<string, unknown>;

function appendValue<T>(target: T[], value: T): void {
  OBJECT_DEFINE_PROPERTY(target, target.length, {
    value,
    enumerable: true,
    configurable: true,
    writable: true
  });
}

function defineData(target: NullRecord, key: string, value: unknown): void {
  if (OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(target, key)) {
    throw new NATIVE_ERROR("Duplicate Ziwei egress decision key rejected");
  }
  OBJECT_DEFINE_PROPERTY(target, key, {
    value,
    enumerable: true,
    configurable: false,
    writable: false
  });
}

function nullRecord(entries: readonly (readonly [string, unknown])[]): NullRecord {
  const result = OBJECT_CREATE(null) as NullRecord;
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (!entry) throw new NATIVE_ERROR("Internal Ziwei egress view entry is missing");
    defineData(result, entry[0], entry[1]);
  }
  return result;
}

function frozenArray<T>(values: readonly T[]): readonly T[] {
  const result: T[] = [];
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === undefined) throw new NATIVE_ERROR("Internal Ziwei egress view array is sparse");
    appendValue(result, value);
  }
  return OBJECT_FREEZE(result);
}

function deepFreezeInternal<T>(value: T): T {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) return value;
  const keys = REFLECT_OWN_KEYS(value);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (key === undefined) throw new NATIVE_ERROR("Internal Ziwei egress view key is missing");
    const descriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(value, key);
    if (!descriptor || !("value" in descriptor)) {
      throw new NATIVE_ERROR("Internal Ziwei egress view accessor rejected");
    }
    deepFreezeInternal(descriptor.value);
  }
  return OBJECT_FREEZE(value);
}

function primitiveNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || (REFLECT_APPLY(STRING_TRIM, value, []) as string).length === 0) {
    throw new NATIVE_ERROR(`Ziwei egress ${field} must be a non-empty primitive string`);
  }
  return value;
}

export const ZIWEI_HIGH_RISK_EGRESS_DECISION_MAP_VERSION =
  "hakimi.ziwei.high-risk-egress-decision-map/0.1.0" as const;

export const ZIWEI_HIGH_RISK_EGRESS_SOURCE_SURFACE_IDS = frozenArray([
  "ziwei.candidate.core-minor-star.base",
  "ziwei.candidate.core-minor-star.palace",
  "ziwei.candidate.core-minor-star.sanfang-review",
  "ziwei.candidate.major-star.base",
  "ziwei.candidate.major-star.combination-review",
  "ziwei.candidate.major-star.palace",
  "ziwei.candidate.palace-role.base",
  "ziwei.candidate.major-star.same-star-synthesis",
  "ziwei.candidate.natal-transformation.base",
  "ziwei.candidate.natal-transformation.palace",
  "ziwei.candidate.natal-transformation.review",
  "ziwei.candidate.palace.first-synthesis",
  "ziwei.candidate.palace.four-part-synthesis"
] as const);

export const ZIWEI_HIGH_RISK_EGRESS_BROWSER_DISPLAY_SURFACE_ID =
  "ziwei.projection.browser-display" as const;

export const ZIWEI_HIGH_RISK_EGRESS_INCLUDED_SURFACE_IDS = frozenArray([
  ...ZIWEI_HIGH_RISK_EGRESS_SOURCE_SURFACE_IDS,
  ZIWEI_HIGH_RISK_EGRESS_BROWSER_DISPLAY_SURFACE_ID
] as const);

export const ZIWEI_HIGH_RISK_EGRESS_EXCLUDED_FEEDBACK_SURFACE_IDS = frozenArray([
  "ziwei.candidate.core-minor-star.sanfang-feedback-preflight",
  "ziwei.candidate.natal-transformation.palace-feedback-preflight"
] as const);

export const ZIWEI_HIGH_RISK_EGRESS_INCLUDED_TEXT_ROLES = frozenArray([
  "forward_candidate",
  "derived_direct_statement"
] as const);

export const ZIWEI_HIGH_RISK_EGRESS_EXCLUDED_TEXT_ROLES = frozenArray([
  "review_guardrail"
] as const);

export const ZIWEI_HIGH_RISK_EGRESS_REVIEW_GUARDRAIL_SOURCE_FIELDS = frozenArray([
  "reviewPrompt",
  "reviewQuestions",
  "readingOrderStatement",
  "scopeNote",
  "absenceBoundary",
  "emptyMainStarBoundary",
  "counterweight",
  "balancePrompt"
] as const);

export type ZiweiHighRiskEgressSourceSurfaceId =
  typeof ZIWEI_HIGH_RISK_EGRESS_SOURCE_SURFACE_IDS[number];
export type ZiweiHighRiskEgressIncludedSurfaceId =
  typeof ZIWEI_HIGH_RISK_EGRESS_INCLUDED_SURFACE_IDS[number];
export type ZiweiHighRiskEgressIncludedTextRole =
  typeof ZIWEI_HIGH_RISK_EGRESS_INCLUDED_TEXT_ROLES[number];
export type ZiweiHighRiskEgressExcludedTextRole =
  typeof ZIWEI_HIGH_RISK_EGRESS_EXCLUDED_TEXT_ROLES[number];
export type ZiweiHighRiskEgressTextRole =
  | ZiweiHighRiskEgressIncludedTextRole
  | ZiweiHighRiskEgressExcludedTextRole;

export type ZiweiHighRiskEgressDecisionEntry = Readonly<{
  decisionKey: string;
  sourceSurfaceId: ZiweiHighRiskEgressSourceSurfaceId;
  browserDisplaySurfaceId: typeof ZIWEI_HIGH_RISK_EGRESS_BROWSER_DISPLAY_SURFACE_ID;
  textRole: ZiweiHighRiskEgressIncludedTextRole;
  sourceIdentity: string;
  sourceField: string;
  action: "pass_through" | "neutralized";
  displayText: string;
  sourceDecision: ZiweiHighRiskEgressDecision;
  browserDisplayDecision: ZiweiHighRiskEgressDecision;
}>;

export type ZiweiHighRiskEgressDecisionMap = Readonly<{
  decisionMapVersion: typeof ZIWEI_HIGH_RISK_EGRESS_DECISION_MAP_VERSION;
  lifecycle: "ephemeral_in_memory_only";
  entries: readonly ZiweiHighRiskEgressDecisionEntry[];
  decisionByKey: Readonly<Record<string, ZiweiHighRiskEgressDecisionEntry>>;
  coverage: Readonly<{
    includedSurfaceIds: readonly ZiweiHighRiskEgressIncludedSurfaceId[];
    excludedFeedbackSurfaceIds: readonly string[];
    includedTextRoles: readonly ZiweiHighRiskEgressIncludedTextRole[];
    excludedTextRoles: readonly ZiweiHighRiskEgressExcludedTextRole[];
    excludedReviewGuardrailSourceFields: readonly string[];
    sourceEntryCount: number;
    browserDisplayEvaluationCount: number;
    lookupRequiresExactSourceText: true;
  }>;
  boundary: Readonly<{
    feedbackSurfacesIncluded: false;
    reviewGuardrailIncluded: false;
    rawProjectionMutated: false;
    rawProjectionIncluded: false;
    crossProjectionReuseAllowed: false;
    birthDataIncluded: false;
    candidateTextDigestIncluded: false;
    personalDerivedDigestIncluded: false;
    sourceBodyIncluded: false;
    receiptPersistenceAllowed: false;
    storageMutationPerformed: false;
    networkTransmissionPerformed: false;
    semanticCoverageComplete: false;
    unstructuredFreeTextSafetyEstablished: false;
    surfaceCallerAuthenticityEstablished: false;
    registeredSurfaceCallGraphClosureEstablished: false;
    candidateCallSitesWiredToGate: false;
    preImportIntrinsicIntegrityEstablished: false;
    contentTruthEstablished: false;
    domainAuthorityAuthorized: false;
    expertTruthEstablished: false;
    expertIdentityVerified: false;
    independentExpertReviewsVerified: 0;
    expertClaimsAuthorized: false;
    workRightsEstablished: false;
    editionRightsEstablished: false;
    carrierRightsEstablished: false;
    rightsLegalConclusionEstablished: false;
    redistributionAuthorized: false;
    formalAdmissionAuthorized: false;
    releaseEvidenceComplete: false;
    releaseReady: false;
    publicBuildInclusionAuthorized: false;
    publicDeploymentAuthorized: false;
    publicReleaseAuthorized: false;
    mainAppReachable: false;
    productionEligible: false;
    mutationEpochAvailable: false;
    mutationEpochReceipt: null;
  }>;
}>;

const DECISION_MAP_BRAND = new NATIVE_WEAK_SET<object>();
const SOURCE_TEXT_BY_ENTRY = new NATIVE_WEAK_MAP<object, string>();
const SOURCE_PROJECTION_BY_DECISION_MAP = new NATIVE_WEAK_MAP<
  object,
  BrowserProbeDisplayProjection
>();

function addDecisionMapBrand(value: object): void {
  REFLECT_APPLY(WEAK_SET_ADD, DECISION_MAP_BRAND, [value]);
}

function hasDecisionMapBrand(value: unknown): value is object {
  return typeof value === "object" && value !== null
    ? REFLECT_APPLY(WEAK_SET_HAS, DECISION_MAP_BRAND, [value]) as boolean
    : false;
}

function bindSourceText(entry: ZiweiHighRiskEgressDecisionEntry, sourceText: string): void {
  REFLECT_APPLY(WEAK_MAP_SET, SOURCE_TEXT_BY_ENTRY, [entry, sourceText]);
}

function sourceTextForEntry(entry: ZiweiHighRiskEgressDecisionEntry): string | undefined {
  return REFLECT_APPLY(WEAK_MAP_GET, SOURCE_TEXT_BY_ENTRY, [entry]) as string | undefined;
}

function bindSourceProjection(
  decisionMap: ZiweiHighRiskEgressDecisionMap,
  projection: BrowserProbeDisplayProjection
): void {
  REFLECT_APPLY(WEAK_MAP_SET, SOURCE_PROJECTION_BY_DECISION_MAP, [decisionMap, projection]);
}

function sourceProjectionForDecisionMap(
  decisionMap: object
): BrowserProbeDisplayProjection | undefined {
  return REFLECT_APPLY(
    WEAK_MAP_GET,
    SOURCE_PROJECTION_BY_DECISION_MAP,
    [decisionMap]
  ) as BrowserProbeDisplayProjection | undefined;
}

function isSourceSurfaceId(value: string): value is ZiweiHighRiskEgressSourceSurfaceId {
  for (let index = 0; index < ZIWEI_HIGH_RISK_EGRESS_SOURCE_SURFACE_IDS.length; index += 1) {
    if (ZIWEI_HIGH_RISK_EGRESS_SOURCE_SURFACE_IDS[index] === value) return true;
  }
  return false;
}

function isIncludedTextRole(value: string): value is ZiweiHighRiskEgressIncludedTextRole {
  return value === "forward_candidate" || value === "derived_direct_statement";
}

export function createZiweiHighRiskEgressDecisionKey(
  sourceSurfaceIdValue: ZiweiHighRiskEgressSourceSurfaceId,
  textRoleValue: ZiweiHighRiskEgressIncludedTextRole,
  sourceIdentityValue: string,
  sourceFieldValue: string
): string {
  const sourceSurfaceId = primitiveNonEmptyString(sourceSurfaceIdValue, "sourceSurfaceId");
  const textRole = primitiveNonEmptyString(textRoleValue, "textRole");
  const sourceIdentity = primitiveNonEmptyString(sourceIdentityValue, "sourceIdentity");
  const sourceField = primitiveNonEmptyString(sourceFieldValue, "sourceField");
  if (!isSourceSurfaceId(sourceSurfaceId) || !isIncludedTextRole(textRole)) {
    throw new NATIVE_ERROR("Ziwei egress decision key boundary rejected");
  }
  const key = REFLECT_APPLY(JSON_STRINGIFY, NATIVE_JSON, [[
    sourceSurfaceId,
    textRole,
    sourceIdentity,
    sourceField
  ]]);
  if (typeof key !== "string") throw new NATIVE_ERROR("Ziwei egress decision key encoding failed");
  return key;
}

type PendingCandidate = Readonly<{
  sourceSurfaceId: ZiweiHighRiskEgressSourceSurfaceId;
  textRole: ZiweiHighRiskEgressIncludedTextRole;
  sourceIdentity: string;
  sourceField: string;
  text: string;
}>;

function candidate(
  sourceSurfaceId: ZiweiHighRiskEgressSourceSurfaceId,
  textRole: ZiweiHighRiskEgressIncludedTextRole,
  sourceIdentity: string,
  sourceField: string,
  text: string
): PendingCandidate {
  return {
    sourceSurfaceId,
    textRole,
    sourceIdentity: primitiveNonEmptyString(sourceIdentity, "sourceIdentity"),
    sourceField: primitiveNonEmptyString(sourceField, "sourceField"),
    text: primitiveNonEmptyString(text, "candidateText")
  };
}

function appendCandidate(target: PendingCandidate[], value: PendingCandidate): void {
  appendValue(target, value);
}

function collectPendingCandidates(projection: BrowserProbeDisplayProjection): readonly PendingCandidate[] {
  const pending: PendingCandidate[] = [];

  for (const content of projection.coreMinorStarCandidateContent) {
    for (let themeIndex = 0; themeIndex < content.coreThemes.length; themeIndex += 1) {
      const theme = content.coreThemes[themeIndex];
      if (theme === undefined) throw new NATIVE_ERROR("Core/minor-star theme is missing");
      appendCandidate(pending, candidate(
        "ziwei.candidate.core-minor-star.base",
        "forward_candidate",
        content.contentId,
        `coreThemes[${themeIndex}]`,
        theme
      ));
    }
    appendCandidate(pending, candidate(
      "ziwei.candidate.core-minor-star.base",
      "forward_candidate",
      content.contentId,
      "plainLanguage",
      content.plainLanguage
    ));
  }

  for (const content of projection.coreMinorStarPalaceCandidateContent) {
    appendCandidate(pending, candidate(
      "ziwei.candidate.core-minor-star.palace",
      "forward_candidate",
      content.contentId,
      "positionSummary",
      content.positionSummary
    ));
  }

  for (const review of projection.coreMinorStarSanfangReviews) {
    appendCandidate(pending, candidate(
      "ziwei.candidate.core-minor-star.sanfang-review",
      "derived_direct_statement",
      review.reviewId,
      "directStatement",
      review.directStatement
    ));
    for (const occurrence of review.occurrences) {
      appendCandidate(pending, candidate(
        "ziwei.candidate.core-minor-star.sanfang-review",
        "derived_direct_statement",
        `${review.reviewId}/${occurrence.occurrenceId}`,
        "directStatement",
        occurrence.directStatement
      ));
    }
  }

  const majorBaseSeen = new Set<string>();
  const majorPalaceSeen = new Set<string>();
  for (const palace of projection.displayPalaces) {
    for (const star of palace.stars) {
      const base = star.candidateContent;
      if (base && !majorBaseSeen.has(base.contentId)) {
        majorBaseSeen.add(base.contentId);
        for (let themeIndex = 0; themeIndex < base.coreThemes.length; themeIndex += 1) {
          const theme = base.coreThemes[themeIndex];
          if (theme === undefined) throw new NATIVE_ERROR("Major-star theme is missing");
          appendCandidate(pending, candidate(
            "ziwei.candidate.major-star.base",
            "forward_candidate",
            base.contentId,
            `coreThemes[${themeIndex}]`,
            theme
          ));
        }
        appendCandidate(pending, candidate(
          "ziwei.candidate.major-star.base",
          "forward_candidate",
          base.contentId,
          "plainLanguage",
          base.plainLanguage
        ));
      }
      const positioned = star.palaceCandidateContent;
      if (positioned && !majorPalaceSeen.has(positioned.contentId)) {
        majorPalaceSeen.add(positioned.contentId);
        appendCandidate(pending, candidate(
          "ziwei.candidate.major-star.palace",
          "forward_candidate",
          positioned.contentId,
          "positionSummary",
          positioned.positionSummary
        ));
      }
    }
  }

  for (const review of projection.majorStarPalaceCombinationReviews) {
    appendCandidate(pending, candidate(
      "ziwei.candidate.major-star.combination-review",
      "forward_candidate",
      review.reviewId,
      "factSummary",
      review.factSummary
    ));
  }

  const palaceRoleSeen = new Set<string>();
  for (const review of projection.palaceFirstSynthesisReviews) {
    const role = review.palaceRoleContent;
    if (!palaceRoleSeen.has(role.contentId)) {
      palaceRoleSeen.add(role.contentId);
      appendCandidate(pending, candidate(
        "ziwei.candidate.palace-role.base",
        "forward_candidate",
        role.contentId,
        "domainSummary",
        role.domainSummary
      ));
    }
  }

  for (const synthesis of projection.majorStarSameStarSynthesisReviews) {
    appendCandidate(pending, candidate(
      "ziwei.candidate.major-star.same-star-synthesis",
      "derived_direct_statement",
      synthesis.synthesisId,
      "directStatement",
      synthesis.directStatement
    ));
  }

  for (const content of projection.natalTransformationCandidateContent) {
    appendCandidate(pending, candidate(
      "ziwei.candidate.natal-transformation.base",
      "forward_candidate",
      content.contentId,
      "motionLabel",
      content.motionLabel
    ));
    appendCandidate(pending, candidate(
      "ziwei.candidate.natal-transformation.base",
      "forward_candidate",
      content.contentId,
      "plainLanguage",
      content.plainLanguage
    ));
  }

  for (const content of projection.natalTransformationPalaceCandidateContent) {
    appendCandidate(pending, candidate(
      "ziwei.candidate.natal-transformation.palace",
      "forward_candidate",
      content.contentId,
      "positionSummary",
      content.positionSummary
    ));
  }

  for (const review of projection.palaceNatalTransformationReviews) {
    appendCandidate(pending, candidate(
      "ziwei.candidate.natal-transformation.review",
      "derived_direct_statement",
      review.reviewId,
      "directStatement",
      review.directStatement
    ));
    for (const occurrence of review.occurrences) {
      appendCandidate(pending, candidate(
        "ziwei.candidate.natal-transformation.review",
        "derived_direct_statement",
        `${review.reviewId}/${occurrence.occurrenceId}`,
        "directStatement",
        occurrence.directStatement
      ));
    }
  }

  for (const review of projection.palaceFirstSynthesisReviews) {
    appendCandidate(pending, candidate(
      "ziwei.candidate.palace.first-synthesis",
      "derived_direct_statement",
      review.reviewId,
      "directStatement",
      review.directStatement
    ));
  }

  for (const content of projection.palaceFourPartSynthesisContents) {
    for (const part of content.parts) {
      appendCandidate(pending, candidate(
        "ziwei.candidate.palace.four-part-synthesis",
        "derived_direct_statement",
        content.contentId,
        `parts.${part.sectionId}.directStatement`,
        part.directStatement
      ));
    }
  }

  return pending;
}

async function evaluateCandidate(value: PendingCandidate): Promise<ZiweiHighRiskEgressDecisionEntry> {
  const decisionKey = createZiweiHighRiskEgressDecisionKey(
    value.sourceSurfaceId,
    value.textRole,
    value.sourceIdentity,
    value.sourceField
  );
  const sourceDecision = await evaluateZiweiHighRiskEgressRequest(
    createZiweiHighRiskEgressRequest(
      value.sourceSurfaceId,
      value.text,
      null,
      null,
      null,
      false,
      false,
      false,
      false,
      false,
      false
    )
  );
  const browserDisplayDecision = await evaluateZiweiHighRiskEgressRequest(
    createZiweiHighRiskEgressRequest(
      ZIWEI_HIGH_RISK_EGRESS_BROWSER_DISPLAY_SURFACE_ID,
      sourceDecision.displayText,
      null,
      null,
      null,
      false,
      false,
      false,
      false,
      false,
      false
    )
  );
  const action = sourceDecision.action === "neutralized"
    || browserDisplayDecision.action === "neutralized"
    ? "neutralized"
    : "pass_through";
  const entry = deepFreezeInternal(nullRecord([
    ["decisionKey", decisionKey],
    ["sourceSurfaceId", value.sourceSurfaceId],
    ["browserDisplaySurfaceId", ZIWEI_HIGH_RISK_EGRESS_BROWSER_DISPLAY_SURFACE_ID],
    ["textRole", value.textRole],
    ["sourceIdentity", value.sourceIdentity],
    ["sourceField", value.sourceField],
    ["action", action],
    ["displayText", browserDisplayDecision.displayText],
    ["sourceDecision", sourceDecision],
    ["browserDisplayDecision", browserDisplayDecision]
  ])) as ZiweiHighRiskEgressDecisionEntry;
  bindSourceText(entry, value.text);
  return entry;
}

const VIEW_BOUNDARY = deepFreezeInternal(nullRecord([
  ["feedbackSurfacesIncluded", false],
  ["reviewGuardrailIncluded", false],
  ["rawProjectionMutated", false],
  ["rawProjectionIncluded", false],
  ["crossProjectionReuseAllowed", false],
  ["birthDataIncluded", false],
  ["candidateTextDigestIncluded", false],
  ["personalDerivedDigestIncluded", false],
  ["sourceBodyIncluded", false],
  ["receiptPersistenceAllowed", false],
  ["storageMutationPerformed", false],
  ["networkTransmissionPerformed", false],
  ["semanticCoverageComplete", false],
  ["unstructuredFreeTextSafetyEstablished", false],
  ["surfaceCallerAuthenticityEstablished", false],
  ["registeredSurfaceCallGraphClosureEstablished", false],
  ["candidateCallSitesWiredToGate", false],
  ["preImportIntrinsicIntegrityEstablished", false],
  ["contentTruthEstablished", false],
  ["domainAuthorityAuthorized", false],
  ["expertTruthEstablished", false],
  ["expertIdentityVerified", false],
  ["independentExpertReviewsVerified", 0],
  ["expertClaimsAuthorized", false],
  ["workRightsEstablished", false],
  ["editionRightsEstablished", false],
  ["carrierRightsEstablished", false],
  ["rightsLegalConclusionEstablished", false],
  ["redistributionAuthorized", false],
  ["formalAdmissionAuthorized", false],
  ["releaseEvidenceComplete", false],
  ["releaseReady", false],
  ["publicBuildInclusionAuthorized", false],
  ["publicDeploymentAuthorized", false],
  ["publicReleaseAuthorized", false],
  ["mainAppReachable", false],
  ["productionEligible", false],
  ["mutationEpochAvailable", false],
  ["mutationEpochReceipt", null]
]));

/**
 * Evaluate only the enumerated forward-candidate and derived-statement leaves.
 * The returned branded map is process-local and must not be persisted.
 */
export async function createZiweiHighRiskEgressDecisionMap(
  projection: BrowserProbeDisplayProjection
): Promise<ZiweiHighRiskEgressDecisionMap> {
  if (typeof projection !== "object" || projection === null || ARRAY_IS_ARRAY(projection)) {
    throw new NATIVE_ERROR("Ziwei browser display projection object required");
  }
  const pending = collectPendingCandidates(projection);
  const entries: ZiweiHighRiskEgressDecisionEntry[] = [];
  const recordEntries: (readonly [string, unknown])[] = [];
  for (let index = 0; index < pending.length; index += 1) {
    const current = pending[index];
    if (!current) throw new NATIVE_ERROR("Ziwei egress pending candidate is missing");
    const entry = await evaluateCandidate(current);
    appendValue(entries, entry);
    appendValue(recordEntries, [entry.decisionKey, entry] as const);
  }
  const decisionByKey = deepFreezeInternal(nullRecord(recordEntries)) as
    Readonly<Record<string, ZiweiHighRiskEgressDecisionEntry>>;
  const frozenEntries = deepFreezeInternal(entries) as readonly ZiweiHighRiskEgressDecisionEntry[];
  const coverage = deepFreezeInternal(nullRecord([
    ["includedSurfaceIds", ZIWEI_HIGH_RISK_EGRESS_INCLUDED_SURFACE_IDS],
    ["excludedFeedbackSurfaceIds", ZIWEI_HIGH_RISK_EGRESS_EXCLUDED_FEEDBACK_SURFACE_IDS],
    ["includedTextRoles", ZIWEI_HIGH_RISK_EGRESS_INCLUDED_TEXT_ROLES],
    ["excludedTextRoles", ZIWEI_HIGH_RISK_EGRESS_EXCLUDED_TEXT_ROLES],
    ["excludedReviewGuardrailSourceFields", ZIWEI_HIGH_RISK_EGRESS_REVIEW_GUARDRAIL_SOURCE_FIELDS],
    ["sourceEntryCount", frozenEntries.length],
    ["browserDisplayEvaluationCount", frozenEntries.length],
    ["lookupRequiresExactSourceText", true]
  ]));
  const decisionMap = deepFreezeInternal(nullRecord([
    ["decisionMapVersion", ZIWEI_HIGH_RISK_EGRESS_DECISION_MAP_VERSION],
    ["lifecycle", "ephemeral_in_memory_only"],
    ["entries", frozenEntries],
    ["decisionByKey", decisionByKey],
    ["coverage", coverage],
    ["boundary", VIEW_BOUNDARY]
  ])) as ZiweiHighRiskEgressDecisionMap;
  bindSourceProjection(decisionMap, projection);
  addDecisionMapBrand(decisionMap);
  return decisionMap;
}

export function isZiweiHighRiskEgressDecisionMap(
  value: unknown
): value is ZiweiHighRiskEgressDecisionMap {
  return hasDecisionMapBrand(value)
    && OBJECT_IS_FROZEN(value)
    && sourceProjectionForDecisionMap(value) !== undefined;
}

export function getZiweiHighRiskEgressDecisionEntry(
  decisionMapValue: unknown,
  currentProjectionValue: unknown,
  decisionKeyValue: unknown,
  currentSourceTextValue: unknown
): ZiweiHighRiskEgressDecisionEntry | null {
  if (!isZiweiHighRiskEgressDecisionMap(decisionMapValue)) {
    throw new NATIVE_ERROR("Unbranded Ziwei high-risk egress decision map rejected");
  }
  if (sourceProjectionForDecisionMap(decisionMapValue) !== currentProjectionValue) {
    throw new NATIVE_ERROR("Ziwei egress projection object identity does not match this decision map");
  }
  const decisionKey = primitiveNonEmptyString(decisionKeyValue, "decisionKey");
  const descriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(decisionMapValue.decisionByKey, decisionKey);
  if (!descriptor || !("value" in descriptor)) return null;
  const entry = descriptor.value as ZiweiHighRiskEgressDecisionEntry;
  const currentSourceText = primitiveNonEmptyString(currentSourceTextValue, "currentSourceText");
  if (sourceTextForEntry(entry) !== currentSourceText) {
    throw new NATIVE_ERROR("Ziwei egress source text does not match this ephemeral decision map");
  }
  return entry;
}

/*
 * Imported review feedback has a different owner and lifecycle from the raw
 * chart projection above.  Keep its DOM decisions in separate private maps:
 * the input file must first pass its existing read-only preflight, and only
 * the explicitly enumerated human narrative leaves are evaluated.  Raw review
 * templates/downloads, reviewer attribution, filenames, URLs, and review
 * guardrails are intentionally outside this helper.
 */

export const ZIWEI_HIGH_RISK_FEEDBACK_DOM_DECISION_MAP_VERSION =
  "hakimi.ziwei.high-risk-feedback-dom-decision-map/0.1.0" as const;

export const ZIWEI_HIGH_RISK_FEEDBACK_DOM_SURFACE_IDS = frozenArray([
  "ziwei.candidate.core-minor-star.sanfang-feedback-preflight",
  "ziwei.candidate.natal-transformation.palace-feedback-preflight"
] as const);

export const ZIWEI_HIGH_RISK_FEEDBACK_DOM_TEXT_ROLE =
  "human_review_narrative" as const;

export const ZIWEI_HIGH_RISK_FEEDBACK_DOM_COMMON_SOURCE_FIELDS = frozenArray([
  "decisionReason",
  "applicabilityConditions",
  "counterexamples",
  "revisionRequest"
] as const);

export const ZIWEI_HIGH_RISK_FEEDBACK_DOM_EXCLUDED_CATEGORIES = frozenArray([
  "raw_template_or_download",
  "reviewer_attribution",
  "file_name",
  "additional_source_url",
  "review_guardrail"
] as const);

export type ZiweiHighRiskFeedbackDomSurfaceId =
  typeof ZIWEI_HIGH_RISK_FEEDBACK_DOM_SURFACE_IDS[number];
export type ZiweiHighRiskFeedbackDomSourceField =
  | "selectedTradition"
  | "selectedSchool"
  | typeof ZIWEI_HIGH_RISK_FEEDBACK_DOM_COMMON_SOURCE_FIELDS[number];
export type ZiweiHighRiskFeedbackDomOwnerKind =
  | "current_chart_core_minor_sanfang_preflight"
  | "static_natal_transformation_palace_preflight";

export type ZiweiHighRiskFeedbackDomDecisionEntry = Readonly<{
  decisionKey: string;
  feedbackSurfaceId: ZiweiHighRiskFeedbackDomSurfaceId;
  browserDisplaySurfaceId: typeof ZIWEI_HIGH_RISK_EGRESS_BROWSER_DISPLAY_SURFACE_ID;
  textRole: typeof ZIWEI_HIGH_RISK_FEEDBACK_DOM_TEXT_ROLE;
  sourceIdentity: string;
  sourceField: ZiweiHighRiskFeedbackDomSourceField;
  action: "pass_through" | "neutralized";
  displayText: string;
  feedbackDecision: ZiweiHighRiskEgressDecision;
  browserDisplayDecision: ZiweiHighRiskEgressDecision;
}>;

export type ZiweiHighRiskFeedbackDomDecisionMap = Readonly<{
  decisionMapVersion: typeof ZIWEI_HIGH_RISK_FEEDBACK_DOM_DECISION_MAP_VERSION;
  ownerKind: ZiweiHighRiskFeedbackDomOwnerKind;
  lifecycle: "ephemeral_in_memory_only";
  entries: readonly ZiweiHighRiskFeedbackDomDecisionEntry[];
  decisionByKey: Readonly<Record<string, ZiweiHighRiskFeedbackDomDecisionEntry>>;
  coverage: Readonly<{
    feedbackSurfaceId: ZiweiHighRiskFeedbackDomSurfaceId;
    browserDisplaySurfaceId: typeof ZIWEI_HIGH_RISK_EGRESS_BROWSER_DISPLAY_SURFACE_ID;
    textRole: typeof ZIWEI_HIGH_RISK_FEEDBACK_DOM_TEXT_ROLE;
    includedSourceFields: readonly ZiweiHighRiskFeedbackDomSourceField[];
    excludedCategories: readonly string[];
    sourceEntryCount: number;
    browserDisplayEvaluationCount: number;
    preflightObjectIdentityRequired: true;
    exactSourceTextRequired: true;
  }>;
  boundary: Readonly<{
    feedbackPreflightNarrativeIncluded: true;
    rawFeedbackEnvelopeIncluded: false;
    rawTemplateOrDownloadCovered: false;
    reviewerAttributionCovered: false;
    fileNameCovered: false;
    additionalSourceUrlsCovered: false;
    reviewGuardrailIncluded: false;
    receiptPersistenceAllowed: false;
    storageMutationPerformed: false;
    networkTransmissionPerformed: false;
    semanticCoverageComplete: false;
    unstructuredFreeTextSafetyEstablished: false;
    fullDomAriaDatasetDownloadSinkClosureEstablished: false;
    reviewerIdentityVerified: false;
    expertTruthEstablished: false;
    expertClaimsAuthorized: false;
    rightsLegalConclusionEstablished: false;
    redistributionAuthorized: false;
    releaseReady: false;
    publicReleaseAuthorized: false;
    mutationEpochAvailable: false;
    mutationEpochReceipt: null;
  }>;
}>;

export type ZiweiCoreMinorStarSanfangFeedbackDomDecisionView = Readonly<{
  preflight: ZiweiCoreMinorStarSanfangReviewFeedbackPreflight;
  decisionMap: ZiweiHighRiskFeedbackDomDecisionMap;
}>;

export type ZiweiNatalTransformationPalaceFeedbackDomDecisionView = Readonly<{
  preflight: ZiweiNatalTransformationPalaceReviewFeedbackPreflight;
  decisionMap: ZiweiHighRiskFeedbackDomDecisionMap;
}>;

type PendingFeedbackNarrative = Readonly<{
  feedbackSurfaceId: ZiweiHighRiskFeedbackDomSurfaceId;
  sourceIdentity: string;
  sourceField: ZiweiHighRiskFeedbackDomSourceField;
  text: string;
}>;

const CORE_FEEDBACK_DECISION_MAP_BRAND = new NATIVE_WEAK_SET<object>();
const NATAL_FEEDBACK_DECISION_MAP_BRAND = new NATIVE_WEAK_SET<object>();
const FEEDBACK_PREFLIGHT_BY_DECISION_MAP = new NATIVE_WEAK_MAP<object, object>();
const CORE_PROJECTION_BY_FEEDBACK_DECISION_MAP = new NATIVE_WEAK_MAP<
  object,
  BrowserProbeDisplayProjection
>();
const FEEDBACK_SOURCE_TEXT_BY_ENTRY = new NATIVE_WEAK_MAP<object, string>();

function addFeedbackDecisionMapBrand(brand: WeakSet<object>, value: object): void {
  REFLECT_APPLY(WEAK_SET_ADD, brand, [value]);
}

function hasFeedbackDecisionMapBrand(
  brand: WeakSet<object>,
  value: unknown
): value is object {
  return typeof value === "object" && value !== null
    ? REFLECT_APPLY(WEAK_SET_HAS, brand, [value]) as boolean
    : false;
}

function hasFeedbackSourceField(
  fields: readonly ZiweiHighRiskFeedbackDomSourceField[],
  candidate: ZiweiHighRiskFeedbackDomSourceField
): boolean {
  for (let index = 0; index < fields.length; index += 1) {
    if (fields[index] === candidate) return true;
  }
  return false;
}

const FEEDBACK_DOM_BOUNDARY = deepFreezeInternal(nullRecord([
  ["feedbackPreflightNarrativeIncluded", true],
  ["rawFeedbackEnvelopeIncluded", false],
  ["rawTemplateOrDownloadCovered", false],
  ["reviewerAttributionCovered", false],
  ["fileNameCovered", false],
  ["additionalSourceUrlsCovered", false],
  ["reviewGuardrailIncluded", false],
  ["receiptPersistenceAllowed", false],
  ["storageMutationPerformed", false],
  ["networkTransmissionPerformed", false],
  ["semanticCoverageComplete", false],
  ["unstructuredFreeTextSafetyEstablished", false],
  ["fullDomAriaDatasetDownloadSinkClosureEstablished", false],
  ["reviewerIdentityVerified", false],
  ["expertTruthEstablished", false],
  ["expertClaimsAuthorized", false],
  ["rightsLegalConclusionEstablished", false],
  ["redistributionAuthorized", false],
  ["releaseReady", false],
  ["publicReleaseAuthorized", false],
  ["mutationEpochAvailable", false],
  ["mutationEpochReceipt", null]
])) as ZiweiHighRiskFeedbackDomDecisionMap["boundary"];

function primitiveString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new NATIVE_ERROR(`Ziwei feedback egress ${field} must be a primitive string`);
  }
  return value;
}

function isFeedbackSurfaceId(value: string): value is ZiweiHighRiskFeedbackDomSurfaceId {
  return value === "ziwei.candidate.core-minor-star.sanfang-feedback-preflight"
    || value === "ziwei.candidate.natal-transformation.palace-feedback-preflight";
}

function isFeedbackSourceFieldForSurface(
  surfaceId: ZiweiHighRiskFeedbackDomSurfaceId,
  field: string
): field is ZiweiHighRiskFeedbackDomSourceField {
  if (surfaceId === "ziwei.candidate.core-minor-star.sanfang-feedback-preflight") {
    return field === "selectedTradition"
      || field === "decisionReason"
      || field === "applicabilityConditions"
      || field === "counterexamples"
      || field === "revisionRequest";
  }
  return field === "selectedSchool"
    || field === "decisionReason"
    || field === "applicabilityConditions"
    || field === "counterexamples"
    || field === "revisionRequest";
}

export function createZiweiHighRiskFeedbackDomDecisionKey(
  feedbackSurfaceIdValue: ZiweiHighRiskFeedbackDomSurfaceId,
  sourceIdentityValue: string,
  sourceFieldValue: ZiweiHighRiskFeedbackDomSourceField
): string {
  const feedbackSurfaceId = primitiveNonEmptyString(
    feedbackSurfaceIdValue,
    "feedbackSurfaceId"
  );
  const sourceIdentity = primitiveNonEmptyString(sourceIdentityValue, "sourceIdentity");
  const sourceField = primitiveNonEmptyString(sourceFieldValue, "sourceField");
  if (!isFeedbackSurfaceId(feedbackSurfaceId)
    || !isFeedbackSourceFieldForSurface(feedbackSurfaceId, sourceField)) {
    throw new NATIVE_ERROR("Ziwei feedback egress decision key boundary rejected");
  }
  const key = REFLECT_APPLY(JSON_STRINGIFY, NATIVE_JSON, [[
    feedbackSurfaceId,
    ZIWEI_HIGH_RISK_FEEDBACK_DOM_TEXT_ROLE,
    sourceIdentity,
    sourceField
  ]]);
  if (typeof key !== "string") {
    throw new NATIVE_ERROR("Ziwei feedback egress decision key encoding failed");
  }
  return key;
}

function pendingFeedbackNarrative(
  feedbackSurfaceId: ZiweiHighRiskFeedbackDomSurfaceId,
  sourceIdentity: string,
  sourceField: ZiweiHighRiskFeedbackDomSourceField,
  text: string
): PendingFeedbackNarrative {
  if (!isFeedbackSourceFieldForSurface(feedbackSurfaceId, sourceField)) {
    throw new NATIVE_ERROR("Ziwei feedback narrative field is outside its fixed surface");
  }
  return {
    feedbackSurfaceId,
    sourceIdentity: primitiveNonEmptyString(sourceIdentity, "feedbackSourceIdentity"),
    sourceField,
    text: primitiveNonEmptyString(text, "feedbackNarrativeText")
  };
}

function collectCoreFeedbackNarratives(
  preflight: ZiweiCoreMinorStarSanfangReviewFeedbackPreflight
): readonly PendingFeedbackNarrative[] {
  const pending: PendingFeedbackNarrative[] = [];
  const surfaceId = "ziwei.candidate.core-minor-star.sanfang-feedback-preflight" as const;
  for (const item of preflight.envelope.items) {
    if (item.decision === "unresolved") continue;
    appendValue(pending, pendingFeedbackNarrative(
      surfaceId, item.occurrenceId, "selectedTradition", item.selectedTradition
    ));
    appendValue(pending, pendingFeedbackNarrative(
      surfaceId, item.occurrenceId, "decisionReason", item.decisionReason
    ));
    appendValue(pending, pendingFeedbackNarrative(
      surfaceId, item.occurrenceId, "applicabilityConditions", item.applicabilityConditions
    ));
    appendValue(pending, pendingFeedbackNarrative(
      surfaceId, item.occurrenceId, "counterexamples", item.counterexamples
    ));
    if ((REFLECT_APPLY(STRING_TRIM, item.revisionRequest, []) as string).length > 0) {
      appendValue(pending, pendingFeedbackNarrative(
        surfaceId, item.occurrenceId, "revisionRequest", item.revisionRequest
      ));
    }
  }
  return pending;
}

function collectNatalFeedbackNarratives(
  preflight: ZiweiNatalTransformationPalaceReviewFeedbackPreflight
): readonly PendingFeedbackNarrative[] {
  const pending: PendingFeedbackNarrative[] = [];
  const surfaceId = "ziwei.candidate.natal-transformation.palace-feedback-preflight" as const;
  for (const item of preflight.envelope.items) {
    if (item.decision === "unresolved") continue;
    appendValue(pending, pendingFeedbackNarrative(
      surfaceId, item.contentId, "selectedSchool", item.selectedSchool
    ));
    appendValue(pending, pendingFeedbackNarrative(
      surfaceId, item.contentId, "decisionReason", item.decisionReason
    ));
    appendValue(pending, pendingFeedbackNarrative(
      surfaceId, item.contentId, "applicabilityConditions", item.applicabilityConditions
    ));
    appendValue(pending, pendingFeedbackNarrative(
      surfaceId, item.contentId, "counterexamples", item.counterexamples
    ));
    if ((REFLECT_APPLY(STRING_TRIM, item.revisionRequest, []) as string).length > 0) {
      appendValue(pending, pendingFeedbackNarrative(
        surfaceId, item.contentId, "revisionRequest", item.revisionRequest
      ));
    }
  }
  return pending;
}

async function evaluateFeedbackNarrative(
  value: PendingFeedbackNarrative
): Promise<ZiweiHighRiskFeedbackDomDecisionEntry> {
  const decisionKey = createZiweiHighRiskFeedbackDomDecisionKey(
    value.feedbackSurfaceId,
    value.sourceIdentity,
    value.sourceField
  );
  const feedbackDecision = await evaluateZiweiHighRiskEgressRequest(
    createZiweiHighRiskEgressRequest(
      value.feedbackSurfaceId,
      value.text,
      null,
      null,
      null,
      false,
      false,
      false,
      false,
      false,
      false
    )
  );
  const browserDisplayDecision = await evaluateZiweiHighRiskEgressRequest(
    createZiweiHighRiskEgressRequest(
      ZIWEI_HIGH_RISK_EGRESS_BROWSER_DISPLAY_SURFACE_ID,
      feedbackDecision.displayText,
      null,
      null,
      null,
      false,
      false,
      false,
      false,
      false,
      false
    )
  );
  const action = feedbackDecision.action === "neutralized"
    || browserDisplayDecision.action === "neutralized"
    ? "neutralized"
    : "pass_through";
  const entry = deepFreezeInternal(nullRecord([
    ["decisionKey", decisionKey],
    ["feedbackSurfaceId", value.feedbackSurfaceId],
    ["browserDisplaySurfaceId", ZIWEI_HIGH_RISK_EGRESS_BROWSER_DISPLAY_SURFACE_ID],
    ["textRole", ZIWEI_HIGH_RISK_FEEDBACK_DOM_TEXT_ROLE],
    ["sourceIdentity", value.sourceIdentity],
    ["sourceField", value.sourceField],
    ["action", action],
    ["displayText", browserDisplayDecision.displayText],
    ["feedbackDecision", feedbackDecision],
    ["browserDisplayDecision", browserDisplayDecision]
  ])) as ZiweiHighRiskFeedbackDomDecisionEntry;
  REFLECT_APPLY(WEAK_MAP_SET, FEEDBACK_SOURCE_TEXT_BY_ENTRY, [entry, value.text]);
  return entry;
}

async function createFeedbackDomDecisionMap(
  ownerKind: ZiweiHighRiskFeedbackDomOwnerKind,
  preflight: object,
  projection: BrowserProbeDisplayProjection | null,
  pending: readonly PendingFeedbackNarrative[]
): Promise<ZiweiHighRiskFeedbackDomDecisionMap> {
  const expectedSurfaceId = ownerKind === "current_chart_core_minor_sanfang_preflight"
    ? "ziwei.candidate.core-minor-star.sanfang-feedback-preflight"
    : "ziwei.candidate.natal-transformation.palace-feedback-preflight";
  const entries: ZiweiHighRiskFeedbackDomDecisionEntry[] = [];
  const recordEntries: (readonly [string, unknown])[] = [];
  const includedSourceFields: ZiweiHighRiskFeedbackDomSourceField[] = [];
  for (let index = 0; index < pending.length; index += 1) {
    const current = pending[index];
    if (!current || current.feedbackSurfaceId !== expectedSurfaceId) {
      throw new NATIVE_ERROR("Ziwei feedback egress pending narrative owner mismatch");
    }
    const entry = await evaluateFeedbackNarrative(current);
    appendValue(entries, entry);
    appendValue(recordEntries, [entry.decisionKey, entry] as const);
    if (!hasFeedbackSourceField(includedSourceFields, entry.sourceField)) {
      appendValue(includedSourceFields, entry.sourceField);
    }
  }
  const decisionByKey = deepFreezeInternal(nullRecord(recordEntries)) as
    Readonly<Record<string, ZiweiHighRiskFeedbackDomDecisionEntry>>;
  const frozenEntries = deepFreezeInternal(entries) as readonly ZiweiHighRiskFeedbackDomDecisionEntry[];
  const coverage = deepFreezeInternal(nullRecord([
    ["feedbackSurfaceId", expectedSurfaceId],
    ["browserDisplaySurfaceId", ZIWEI_HIGH_RISK_EGRESS_BROWSER_DISPLAY_SURFACE_ID],
    ["textRole", ZIWEI_HIGH_RISK_FEEDBACK_DOM_TEXT_ROLE],
    ["includedSourceFields", deepFreezeInternal(includedSourceFields)],
    ["excludedCategories", ZIWEI_HIGH_RISK_FEEDBACK_DOM_EXCLUDED_CATEGORIES],
    ["sourceEntryCount", frozenEntries.length],
    ["browserDisplayEvaluationCount", frozenEntries.length],
    ["preflightObjectIdentityRequired", true],
    ["exactSourceTextRequired", true]
  ]));
  const decisionMap = deepFreezeInternal(nullRecord([
    ["decisionMapVersion", ZIWEI_HIGH_RISK_FEEDBACK_DOM_DECISION_MAP_VERSION],
    ["ownerKind", ownerKind],
    ["lifecycle", "ephemeral_in_memory_only"],
    ["entries", frozenEntries],
    ["decisionByKey", decisionByKey],
    ["coverage", coverage],
    ["boundary", FEEDBACK_DOM_BOUNDARY]
  ])) as ZiweiHighRiskFeedbackDomDecisionMap;
  REFLECT_APPLY(WEAK_MAP_SET, FEEDBACK_PREFLIGHT_BY_DECISION_MAP, [decisionMap, preflight]);
  if (projection) {
    REFLECT_APPLY(WEAK_MAP_SET, CORE_PROJECTION_BY_FEEDBACK_DECISION_MAP, [
      decisionMap,
      projection
    ]);
    addFeedbackDecisionMapBrand(CORE_FEEDBACK_DECISION_MAP_BRAND, decisionMap);
  } else {
    addFeedbackDecisionMapBrand(NATAL_FEEDBACK_DECISION_MAP_BRAND, decisionMap);
  }
  return decisionMap;
}

export async function createZiweiCoreMinorStarSanfangFeedbackDomDecisionView(
  rawValue: unknown,
  currentProjection: BrowserProbeDisplayProjection
): Promise<ZiweiCoreMinorStarSanfangFeedbackDomDecisionView> {
  const raw = primitiveString(rawValue, "rawFeedbackJson");
  if (typeof currentProjection !== "object" || currentProjection === null
    || ARRAY_IS_ARRAY(currentProjection)) {
    throw new NATIVE_ERROR("Ziwei current projection object required for feedback egress");
  }
  const preflight = await preflightZiweiCoreMinorStarSanfangReviewFeedback(
    raw,
    currentProjection
  );
  const decisionMap = await createFeedbackDomDecisionMap(
    "current_chart_core_minor_sanfang_preflight",
    preflight,
    currentProjection,
    collectCoreFeedbackNarratives(preflight)
  );
  return deepFreezeInternal(nullRecord([
    ["preflight", preflight],
    ["decisionMap", decisionMap]
  ])) as ZiweiCoreMinorStarSanfangFeedbackDomDecisionView;
}

export async function createZiweiNatalTransformationPalaceFeedbackDomDecisionView(
  rawValue: unknown
): Promise<ZiweiNatalTransformationPalaceFeedbackDomDecisionView> {
  const raw = primitiveString(rawValue, "rawFeedbackJson");
  const preflight = await preflightZiweiNatalTransformationPalaceReviewFeedback(raw);
  const decisionMap = await createFeedbackDomDecisionMap(
    "static_natal_transformation_palace_preflight",
    preflight,
    null,
    collectNatalFeedbackNarratives(preflight)
  );
  return deepFreezeInternal(nullRecord([
    ["preflight", preflight],
    ["decisionMap", decisionMap]
  ])) as ZiweiNatalTransformationPalaceFeedbackDomDecisionView;
}

export function isZiweiCoreMinorStarSanfangFeedbackDomDecisionMap(
  value: unknown
): value is ZiweiHighRiskFeedbackDomDecisionMap {
  return hasFeedbackDecisionMapBrand(CORE_FEEDBACK_DECISION_MAP_BRAND, value)
    && OBJECT_IS_FROZEN(value)
    && REFLECT_APPLY(WEAK_MAP_GET, FEEDBACK_PREFLIGHT_BY_DECISION_MAP, [value]) !== undefined
    && REFLECT_APPLY(WEAK_MAP_GET, CORE_PROJECTION_BY_FEEDBACK_DECISION_MAP, [value]) !== undefined;
}

export function isZiweiNatalTransformationPalaceFeedbackDomDecisionMap(
  value: unknown
): value is ZiweiHighRiskFeedbackDomDecisionMap {
  return hasFeedbackDecisionMapBrand(NATAL_FEEDBACK_DECISION_MAP_BRAND, value)
    && OBJECT_IS_FROZEN(value)
    && REFLECT_APPLY(WEAK_MAP_GET, FEEDBACK_PREFLIGHT_BY_DECISION_MAP, [value]) !== undefined;
}

function requireFeedbackDecisionEntry(
  decisionMap: ZiweiHighRiskFeedbackDomDecisionMap,
  decisionKeyValue: unknown,
  currentSourceTextValue: unknown
): ZiweiHighRiskFeedbackDomDecisionEntry {
  const decisionKey = primitiveNonEmptyString(decisionKeyValue, "feedbackDecisionKey");
  const descriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(decisionMap.decisionByKey, decisionKey);
  if (!descriptor || !("value" in descriptor)) {
    throw new NATIVE_ERROR("Ziwei feedback egress decision key is absent");
  }
  const entry = descriptor.value as ZiweiHighRiskFeedbackDomDecisionEntry;
  const currentSourceText = primitiveNonEmptyString(
    currentSourceTextValue,
    "feedbackCurrentSourceText"
  );
  const expectedSourceText = REFLECT_APPLY(
    WEAK_MAP_GET,
    FEEDBACK_SOURCE_TEXT_BY_ENTRY,
    [entry]
  ) as string | undefined;
  if (expectedSourceText !== currentSourceText) {
    throw new NATIVE_ERROR("Ziwei feedback egress source text does not match this decision map");
  }
  return entry;
}

export function getZiweiCoreMinorStarSanfangFeedbackDomDecisionEntry(
  decisionMapValue: unknown,
  currentProjectionValue: unknown,
  currentPreflightValue: unknown,
  decisionKeyValue: unknown,
  currentSourceTextValue: unknown
): ZiweiHighRiskFeedbackDomDecisionEntry {
  if (!isZiweiCoreMinorStarSanfangFeedbackDomDecisionMap(decisionMapValue)) {
    throw new NATIVE_ERROR("Unbranded Ziwei core/minor feedback DOM decision map rejected");
  }
  if (REFLECT_APPLY(
    WEAK_MAP_GET,
    CORE_PROJECTION_BY_FEEDBACK_DECISION_MAP,
    [decisionMapValue]
  ) !== currentProjectionValue) {
    throw new NATIVE_ERROR("Ziwei core/minor feedback projection object identity mismatch");
  }
  if (REFLECT_APPLY(
    WEAK_MAP_GET,
    FEEDBACK_PREFLIGHT_BY_DECISION_MAP,
    [decisionMapValue]
  ) !== currentPreflightValue) {
    throw new NATIVE_ERROR("Ziwei core/minor feedback preflight object identity mismatch");
  }
  return requireFeedbackDecisionEntry(
    decisionMapValue,
    decisionKeyValue,
    currentSourceTextValue
  );
}

export function getZiweiNatalTransformationPalaceFeedbackDomDecisionEntry(
  decisionMapValue: unknown,
  currentPreflightValue: unknown,
  decisionKeyValue: unknown,
  currentSourceTextValue: unknown
): ZiweiHighRiskFeedbackDomDecisionEntry {
  if (!isZiweiNatalTransformationPalaceFeedbackDomDecisionMap(decisionMapValue)) {
    throw new NATIVE_ERROR("Unbranded Ziwei natal feedback DOM decision map rejected");
  }
  if (REFLECT_APPLY(
    WEAK_MAP_GET,
    FEEDBACK_PREFLIGHT_BY_DECISION_MAP,
    [decisionMapValue]
  ) !== currentPreflightValue) {
    throw new NATIVE_ERROR("Ziwei natal feedback preflight object identity mismatch");
  }
  return requireFeedbackDecisionEntry(
    decisionMapValue,
    decisionKeyValue,
    currentSourceTextValue
  );
}
