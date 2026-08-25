import {
  BookCheck,
  Download,
  FileKey2,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
  Upload
} from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { requireEvidenceSubject } from "@hakimi/knowledge-core";
import { pickTextFile } from "@hakimi/platform";
import type { ReadLocalKnowledgeSourceAwareRetrievalSnapshotOptions } from "@hakimi/storage";
import type {
  LocalBaziCitationApplicabilityObservationPreflightProjection,
  LocalBaziCitationApplicabilityObservationTemplate,
  LocalBaziCitationReviewContextRead,
  ReadLocalBaziCitationReviewContextOptions
} from "../lib/bazi-citation-review-context";
import { CURRENT_RELEASE_ENGINEERING_IDENTITY } from "../lib/current-release";
import {
  buildKnowledgeSearch,
  type KnowledgeReviewContextLocator
} from "../lib/knowledge-route";
import { AppLink } from "../lib/router";
import {
  BaziCitationApplicabilityObservationEditor,
  type BaziCitationApplicabilityEditorSeed,
  type BaziCitationApplicabilityEditorSummary
} from "./bazi-citation-applicability-observation-editor";
import { StatusPill, type StatusPillTone } from "./status-pill";
import "./local-source-aware-review-panel.css";

const LazyBaziCitationApplicabilityObservationComparison = lazy(async () => {
  const module = await import("./bazi-citation-applicability-observation-comparison");
  return { default: module.BaziCitationApplicabilityObservationComparison };
});

type ReadLocalSourceAwareSnapshot = (
  subjectId: string,
  options?: ReadLocalKnowledgeSourceAwareRetrievalSnapshotOptions
) => Promise<unknown>;

type ReadLocalReviewContext = (
  locator: KnowledgeReviewContextLocator,
  options?: ReadLocalBaziCitationReviewContextOptions
) => Promise<LocalBaziCitationReviewContextRead>;

type PrepareLocalApplicabilityObservation = (
  locator: KnowledgeReviewContextLocator,
  expectedPriorContextPayloadSha256: string
) => Promise<unknown>;

type PreflightLocalApplicabilityObservation = (
  locator: KnowledgeReviewContextLocator,
  expectedPriorContextPayloadSha256: string,
  fileText: string
) => Promise<unknown>;

type PickLocalApplicabilityObservationFile = () => Promise<Readonly<{
  name: string;
  text: string;
}> | null>;

type LocalReviewStatus =
  | "ready_for_local_review"
  | "ready_for_local_review_with_unreviewed_sources"
  | "blocked_no_verified_citations";

type SourceMultiplicity = "none" | "single" | "multiple_preserved_without_resolution";

type DisplayItem = Readonly<{
  order: number;
  citationId: string;
  documentId: string;
  sectionId: string;
  startLine: number;
  endLine: number;
  title: string;
  author: string;
  edition: string;
  quotePreview: string;
  quoteTruncated: boolean;
  evidenceClassification:
    | "verified_exact_quote_local_private"
    | "verified_exact_quote_redistributable";
  rights: Readonly<{
    origin: "user_import" | "bundled";
    status:
      | "user_unverified"
      | "public_domain_verified"
      | "licensed_verified"
      | "project_original_verified"
      | "blocked";
    workStatus:
      | "unknown"
      | "public_domain_verified"
      | "copyrighted"
      | "project_original_verified";
    editionStatus:
      | "unknown"
      | "public_domain_verified"
      | "licensed_verified"
      | "project_original_verified"
      | "copyrighted";
    basis:
      | "user_declaration"
      | "public_domain"
      | "spdx_license"
      | "written_permission"
      | "project_authored"
      | "unknown";
    distributionPolicy: "local_private_only" | "redistributable";
    reviewStatus: "unreviewed" | "single_reviewed" | "double_reviewed";
    rightsEvidenceCount: number;
    redistributionEngineeringGatePassed: boolean;
  }>;
  citationReviewerCount: number;
  knowledgeRecordRouteSafe: boolean;
}>;

type LocalSourceAwareDisplay = Readonly<{
  subject: Readonly<{
    subjectId: string;
    registryVersion: string;
    category: "calendar_fact" | "rule_derived" | "interpretive_claim";
    label: string;
    fieldPaths: readonly string[];
    ruleProfilePaths: readonly string[];
  }>;
  status: LocalReviewStatus;
  sourceMultiplicity: SourceMultiplicity;
  counts: Readonly<{
    matching: number;
    candidate: number;
    verified: number;
    rejected: number;
    emitted: number;
  }>;
  items: readonly DisplayItem[];
  digests: Readonly<{
    storageSnapshotSha256: string;
    packetPayloadSha256: string;
    matchingSourceSetSha256: string;
  }>;
  targetSchemaVersion: 13;
  containsLocalPrivateSourceText: boolean;
}>;

type BoundReviewContextDisplay = Readonly<{
  caseId: string;
  revisionId: string;
  revisionNumber: number;
  selectedRevisionWasLatestInSuppliedCaseSnapshot: boolean;
  subjectLabel: string;
  fieldPath: string;
  fieldValue: string | readonly string[];
  provenance: Readonly<{
    kind: "calendar_fact" | "rule_derived" | "interpretive_claim" | "ai_expression";
    algorithmId: string;
    verificationStatus: "gold_verified" | "adjudicated" | "disputed" | "experimental";
    registeredAlgorithmIds: readonly string[];
  }>;
  frozenRuleProfile: Readonly<{
    profileId: string;
    profileVersion: string;
    profileStatus: "working_default" | "verified" | "experimental";
    dayBoundary: "zi_start_23" | "midnight" | "split_zi" | null;
    rulePackBinding: Readonly<{
      kind: "installed_rule_pack";
      packDigest: string;
      profileDigest: string;
      packId: string;
      profileId: string;
      profileVersion: string;
      useMode: "exact";
    }> | null;
  }>;
  digests: Readonly<{
    contextPayloadSha256: string;
    displayContextPayloadSha256: string;
    revisionSnapshotSha256: string;
    factProjectionSha256: string;
    ruleProjectionSha256: string;
    ruleProfileSha256: string;
    worksetSnapshotSha256: string;
  }>;
}>;

type ReviewContextOutcome =
  | Readonly<{ status: "not_requested" }>
  | Readonly<{ status: "bound"; display: BoundReviewContextDisplay }>
  | Readonly<{ status: "unavailable"; message: string }>;

type ReviewState =
  | Readonly<{ status: "idle" }>
  | Readonly<{ status: "reading" }>
  | Readonly<{
      status: "ready";
      display: LocalSourceAwareDisplay;
      reviewContext: ReviewContextOutcome;
    }>
  | Readonly<{ status: "invalidated"; message: string }>
  | Readonly<{ status: "failed"; message: string }>;

type ApplicabilityObservationTemplateReceipt = Readonly<{
  fileName: "hakimi-bazi-citation-applicability-observation-v01.json";
  citationCount: number;
  contextPayloadSha256: string;
  worksetSnapshotSha256: string;
}>;

type ApplicabilityObservationPreflightDisplay = Readonly<{
  reviewer: Readonly<{
    reviewerId: string;
    displayName: string;
    affiliation: string;
    identityVerified: false;
  }>;
  counts: Readonly<{
    total: number;
    unobserved: number;
    applicableInBoundContext: number;
    partiallyApplicableInBoundContext: number;
    notApplicableInBoundContext: number;
    insufficientBoundContext: number;
  }>;
  observedCount: number;
  allCitationsObserved: boolean;
  reviewerAttributionComplete: boolean;
  recordSha256: string;
  contextPayloadSha256: string;
}>;

type ApplicabilityObservationState =
  | Readonly<{ status: "idle" }>
  | Readonly<{ status: "preparing_template" }>
  | Readonly<{ status: "editor_ready"; receipt: ApplicabilityObservationTemplateReceipt }>
  | Readonly<{ status: "preflighting" }>
  | Readonly<{ status: "ready"; display: ApplicabilityObservationPreflightDisplay }>
  | Readonly<{ status: "failed"; message: string }>;

type ReadPhase =
  | "first_read"
  | "first_projection"
  | "second_revalidation"
  | "second_projection"
  | "digest_comparison";

type PlainRecord = Record<string, unknown>;

interface DeclarativeBudget {
  nodes: number;
  arrays: number;
  propertyKeys: number;
  textCharacters: number;
}

const INITIAL_VISIBLE_ITEMS = 8;
const VISIBLE_ITEM_STEP = 8;
const MAX_QUOTE_PREVIEW_CHARACTERS = 1_200;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const sha256Pattern = /^[a-f0-9]{64}$/u;
const sectionIdPattern = /^section-[1-9]\d{0,8}$/u;
const unsafeVisiblePattern = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const dangerousPropertyKeys = new Set(["__proto__", "constructor", "prototype"]);
const expectedReviewReadProfile = Object.freeze({
  snapshotVersion: "hakimi.web.local_bazi_citation_review_context_read/0.1.0",
  contentVersion: "0.1.0",
  scope: "one_locator_bound_revision_field_and_one_repository_read_citation_workset",
  readPolicy: "two_consecutive_case_and_workset_reads_with_second_workset_digest_cas",
  mutationPolicy: "read_only",
  digestDomain: "hakimi.web.local_bazi_citation_review_context_read.payload/1",
  reviewStatus: "local_read_only_observation_context_not_persisted",
  expertTruthClaimed: false,
  scientificValidityClaimed: false,
  formalActivationAllowed: false
});
const expectedReviewContextProfile = Object.freeze({
  snapshotVersion: "hakimi.bazi.citation_review_context_snapshot/0.1.0",
  contentVersion: "0.1.0",
  system: "bazi",
  scope: "one_exact_replayable_revision_field_and_one_local_citation_record_verified_set",
  contextPolicy: "revision_frozen_fact_and_rule_projection_before_human_observation",
  mutationPolicy: "read_only_projection",
  reviewStatus: "context_bound_to_supplied_workset_pending_freshness_revalidation",
  factProjectionDigestDomain: "hakimi.bazi.citation_review_context_snapshot.fact_projection/1",
  ruleProjectionDigestDomain: "hakimi.bazi.citation_review_context_snapshot.rule_projection/1",
  displayContextBindingDigestDomain: "hakimi.bazi.citation_review_context_snapshot.display_context_binding/1",
  digestDomain: "hakimi.bazi.citation_review_context_snapshot.payload/1",
  expertTruthClaimed: false,
  scientificValidityClaimed: false,
  formalActivationAllowed: false
});
const expectedReviewReadBoundary = Object.freeze({
  locatorOnlyCallerInput: true,
  fullCaseOrRevisionAcceptedFromCaller: false,
  fullWorksetAcceptedFromCaller: false,
  caseBundleRepositoryReadPerformed: true,
  knowledgeWorksetRepositoryReadPerformed: true,
  twoPassDigestRevalidationPerformed: true,
  sameConfiguredDatabaseInstanceVerified: true,
  repositoryConfigurationMatchedReleaseNameAndTargetSchema: true,
  storageReadPerformed: true,
  firstPassDiscardedBeforeReturn: true,
  returnedContextBuiltFromSecondPass: true,
  caseBundleFreshRereadPerformed: true,
  worksetFreshRereadWithExpectedDigestPerformed: true,
  worksetDigestFreshnessRevalidatedBetweenPasses: true,
  continuousFreshnessAttested: false,
  currentAtReturnAttested: false,
  caseBundleAtomicSnapshotVerified: false,
  crossRepositoryAtomicSnapshotVerified: false,
  caseRevisionAndKnowledgeAtomicCaptureVerified: false,
  mutationEpochRevalidationPerformed: false,
  mutationEpochBypassed: false,
  rawBirthInputCopied: false,
  caseAliasTagsNotesCopied: false,
  sourceTextReturned: false,
  localSourceTextProcessedTransiently: true,
  containsDerivedSensitiveChartData: true,
  sourceAuthenticityClaimed: false,
  humanReviewPerformed: false,
  reviewerIdentityVerified: false,
  externalProviderUseAuthorized: false,
  networkTransmissionPerformed: false,
  networkTransmissionAuthorized: false,
  storageMutationPerformed: false,
  schemaOrReleaseIdentityMutationPerformed: false,
  caseOrRevisionMutationPerformed: false,
  publicExportAuthorized: false,
  publicReleaseAuthorized: false,
  expertTruthClaimed: false,
  scientificValidityClaimed: false,
  formalActivationAllowed: false,
  authenticityClaimed: false,
  result: null
});
const expectedReviewContextBoundary = Object.freeze({
  exactRevisionReplayMatched: true,
  registeredFieldProjectionBound: true,
  revisionFrozenRuleProjectionBound: true,
  worksetFourLayerDigestsRecomputed: true,
  rawBirthInputCopied: false,
  caseAliasTagsNotesCopied: false,
  sourceTextCopiedIntoContextSnapshot: false,
  containsDerivedSensitiveChartData: true,
  crossRepositoryAtomicSnapshotVerified: false,
  caseRevisionAndKnowledgeAtomicCaptureVerified: false,
  suppliedWorksetStorageOriginAttested: false,
  suppliedCaseSnapshotFreshnessAttested: false,
  runtimeReleaseIdentityAttested: false,
  worksetFreshnessRevalidatedByBuilder: false,
  reviewMayBeginWithoutFreshnessRevalidation: false,
  mutationEpochRevalidationPerformed: false,
  liveActiveRulePackReadPerformed: false,
  interpretationEnvelopeUsed: false,
  chartApplicabilityAssessed: false,
  citationSemanticApplicabilityAssessed: false,
  citationSetConflictReviewPerformed: false,
  semanticConflictResolutionPerformed: false,
  humanReviewPerformed: false,
  reviewerIdentityVerified: false,
  humanReviewAuthenticityVerified: false,
  sourceAuthenticityClaimed: false,
  sourceTextInstructionAuthority: false,
  storageReadPerformed: false,
  externalProviderUseAuthorized: false,
  networkTransmissionPerformed: false,
  networkTransmissionAuthorized: false,
  storageMutationPerformed: false,
  chartMutationPerformed: false,
  caseOrRevisionMutationPerformed: false,
  publicExportAuthorized: false,
  expertTruthClaimed: false,
  scientificValidityClaimed: false,
  formalActivationAllowed: false,
  authenticityClaimed: false,
  result: null
});
const expectedApplicabilityObservationProfile = Object.freeze({
  projectionVersion: "hakimi.web.local_bazi_citation_applicability_observation/0.1.0",
  contentVersion: "0.1.0",
  scope: "context_reread_bound_local_template_and_read_only_preflight_projection",
  contextPolicy: "fresh_two_pass_read_must_match_previously_displayed_context_digest",
  mutationPolicy: "no_storage_or_chart_write",
  reviewerIdentityPolicy: "self_declared_not_verified",
  expertTruthClaimed: false,
  scientificValidityClaimed: false,
  formalActivationAllowed: false,
  automaticPromotionAllowed: false
});
const expectedApplicabilityTemplateBoundary = Object.freeze({
  contextFreshRereadPerformed: true,
  priorDisplayedContextDigestMatched: true,
  sourceTextIncluded: false,
  fieldValueIncluded: false,
  rawBirthInputIncluded: false,
  containsDerivedSensitiveChartBinding: true,
  storageMutationPerformed: false,
  mutationEpochBypassed: false,
  publicExportAuthorized: false,
  expertTruthClaimed: false,
  scientificValidityClaimed: false,
  formalActivationAllowed: false,
  automaticPromotionAllowed: false
});
const expectedApplicabilityPreflightBoundary = Object.freeze({
  contextFreshRereadPerformed: true,
  priorDisplayedContextDigestMatched: true,
  suppliedCurrentContextDigestMatched: true,
  freeformObservationTextReturnedToUi: false,
  identityVerified: false,
  humanReviewAuthenticityVerified: false,
  chartApplicabilityAssessed: false,
  citationSemanticApplicabilityAssessed: false,
  eligibleForFormalActivation: false,
  automaticPromotionAllowed: false,
  storageMutationPerformed: false,
  mutationEpochBypassed: false,
  publicExportAuthorized: false,
  expertTruthClaimed: false,
  scientificValidityClaimed: false
});
const expectedApplicabilityFileProfile = Object.freeze({
  formatVersion: "hakimi.bazi.citation_applicability_observation/0.1.0",
  contentVersion: "0.1.0",
  system: "bazi",
  scope: "one_context_bound_self_declared_citation_applicability_observation_set",
  contextBindingPolicy: "exact_current_context_and_display_binding_required",
  observationPolicy: "one_neutral_observation_per_verified_citation_without_winner_or_activation",
  reviewerIdentityPolicy: "self_declared_not_verified",
  mutationPolicy: "local_file_template_and_read_only_preflight_only",
  allowedObservations: Object.freeze([
    "unobserved",
    "applicable_in_bound_context",
    "partially_applicable_in_bound_context",
    "not_applicable_in_bound_context",
    "insufficient_bound_context"
  ]),
  recordDigestDomain: "hakimi.bazi.citation_applicability_observation.record/1",
  expertTruthClaimed: false,
  scientificValidityClaimed: false,
  formalActivationAllowed: false,
  automaticPromotionAllowed: false
});
const expectedBlankApplicabilityReviewer = Object.freeze({
  reviewerId: "",
  displayName: "",
  affiliation: "",
  expertiseStatement: "",
  identityEvidenceReference: "",
  identityVerified: false
});
const expectedBlankApplicabilitySession = Object.freeze({
  observedAt: "",
  methodology: "",
  traditionScope: "",
  generalNotes: ""
});
const expectedApplicabilityFileBoundary = Object.freeze({
  contextDigestBindingRequired: true,
  displayContextDigestBindingRequired: true,
  allVerifiedCitationIdsAddressed: true,
  reviewerIdentityBasis: "self_declared_not_verified",
  reviewerIdentityVerified: false,
  humanReviewAuthenticityVerified: false,
  digitalSignaturePresent: false,
  digitalSignatureVerified: false,
  digestIsDigitalSignature: false,
  sourceTextCopied: false,
  rawBirthInputCopied: false,
  caseAliasTagsNotesCopied: false,
  fieldValueCopied: false,
  containsDerivedSensitiveChartBinding: true,
  freeformReviewerTextAcceptedAsUntrustedPlainText: true,
  sourceTextInstructionAuthority: false,
  promptInjectionScreeningPerformed: false,
  chartApplicabilityAssessed: false,
  citationSemanticApplicabilityAssessed: false,
  semanticConflictResolutionPerformed: false,
  winnerSelectionPerformed: false,
  consensusClaimed: false,
  networkTransmissionPerformed: false,
  networkTransmissionAuthorized: false,
  storageMutationPerformed: false,
  chartMutationPerformed: false,
  caseOrRevisionMutationPerformed: false,
  mutationEpochRevalidationPerformed: false,
  mutationEpochBypassed: false,
  publicExportAuthorized: false,
  publicReleaseAuthorized: false,
  expertTruthClaimed: false,
  scientificValidityClaimed: false,
  formalActivationAllowed: false,
  automaticPromotionAllowed: false,
  authenticityClaimed: false,
  result: null
});
const releaseIdentityVerified = CURRENT_RELEASE_ENGINEERING_IDENTITY.dbGeneration === "legacy-v13"
  && CURRENT_RELEASE_ENGINEERING_IDENTITY.targetSchema === 13
  && CURRENT_RELEASE_ENGINEERING_IDENTITY.migrationId === null;

const localStatusLabels: Readonly<Record<
  LocalReviewStatus,
  Readonly<{ label: string; tone: StatusPillTone }>
>> = {
  ready_for_local_review: {
    label: "核验摘录可供本机查看",
    tone: "info"
  },
  ready_for_local_review_with_unreviewed_sources: {
    label: "仍有候选来源未复核",
    tone: "warning"
  },
  blocked_no_verified_citations: {
    label: "没有核验引用，保持关闭",
    tone: "cinnabar"
  }
};

const rightsStatusLabels: Readonly<Record<DisplayItem["rights"]["status"], string>> = {
  user_unverified: "用户声明 · 未核验",
  public_domain_verified: "公版工程门已核对",
  licensed_verified: "许可工程门已核对",
  project_original_verified: "项目原创工程门已核对",
  blocked: "权利状态受阻"
};

const workStatusLabels: Readonly<Record<DisplayItem["rights"]["workStatus"], string>> = {
  unknown: "作品状态未知",
  public_domain_verified: "作品公版门已核对",
  copyrighted: "作品受版权保护",
  project_original_verified: "项目原创作品"
};

const editionStatusLabels: Readonly<Record<DisplayItem["rights"]["editionStatus"], string>> = {
  unknown: "版本状态未知",
  public_domain_verified: "版本公版门已核对",
  licensed_verified: "版本许可门已核对",
  project_original_verified: "项目原创版本",
  copyrighted: "版本受版权保护"
};

const reviewStatusLabels: Readonly<Record<DisplayItem["rights"]["reviewStatus"], string>> = {
  unreviewed: "状态字段：未复核",
  single_reviewed: "状态字段：单记录复核",
  double_reviewed: "状态字段：双记录复核"
};

const provenanceStatusLabels: Readonly<Record<
  BoundReviewContextDisplay["provenance"]["verificationStatus"],
  string
>> = {
  gold_verified: "Revision 保存状态：gold_verified",
  adjudicated: "Revision 保存状态：adjudicated",
  disputed: "Revision 保存状态：disputed",
  experimental: "Revision 保存状态：experimental"
};

const ruleProfileStatusLabels: Readonly<Record<
  BoundReviewContextDisplay["frozenRuleProfile"]["profileStatus"],
  string
>> = {
  working_default: "冻结 profile 状态：working_default",
  verified: "冻结 profile 状态：verified",
  experimental: "冻结 profile 状态：experimental"
};

const dayBoundaryLabels: Readonly<Record<
  Exclude<BoundReviewContextDisplay["frozenRuleProfile"]["dayBoundary"], null>,
  string
>> = {
  zi_start_23: "23:00 子初换日",
  midnight: "00:00 午夜换日",
  split_zi: "早晚子时分流"
};

function rejectSnapshot(): never {
  throw new Error("local_source_aware_display_projection_rejected");
}

function declarativeSnapshot(
  value: unknown,
  pathDepth = 0,
  ancestors = new WeakSet<object>(),
  budget: DeclarativeBudget = {
    nodes: 0,
    arrays: 0,
    propertyKeys: 0,
    textCharacters: 0
  }
): unknown {
  budget.nodes += 1;
  if (pathDepth > 40 || budget.nodes > 20_000) rejectSnapshot();
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) rejectSnapshot();
    return value;
  }
  if (typeof value === "string") {
    budget.textCharacters += value.length;
    if (value.length > 20_000 || budget.textCharacters > 2_000_000) rejectSnapshot();
    return value;
  }
  if (typeof value !== "object") rejectSnapshot();
  if (ancestors.has(value)) rejectSnapshot();
  const isArray = Array.isArray(value);
  const prototype = Object.getPrototypeOf(value);
  if ((isArray && prototype !== Array.prototype) || (!isArray && prototype !== Object.prototype && prototype !== null)) {
    rejectSnapshot();
  }
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key === "symbol")) rejectSnapshot();
  const stringKeys = ownKeys as string[];
  budget.propertyKeys += stringKeys.length;
  if (budget.propertyKeys > 50_000) rejectSnapshot();
  for (const key of stringKeys) {
    if (dangerousPropertyKeys.has(key) || key.length > 256) rejectSnapshot();
    budget.textCharacters += key.length;
    if (budget.textCharacters > 2_000_000) rejectSnapshot();
  }
  ancestors.add(value);
  try {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (isArray) {
      budget.arrays += 1;
      if (budget.arrays > 512 || value.length > 256) rejectSnapshot();
      if (stringKeys.length !== value.length + 1 || !stringKeys.includes("length")) rejectSnapshot();
      const result: unknown[] = [];
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) rejectSnapshot();
        result.push(declarativeSnapshot(
          descriptor.value,
          pathDepth + 1,
          ancestors,
          budget
        ));
      }
      return result;
    }
    if (stringKeys.length > 128) rejectSnapshot();
    const result = Object.create(null) as PlainRecord;
    for (const key of stringKeys) {
      const descriptor = descriptors[key];
      if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) rejectSnapshot();
      result[key] = declarativeSnapshot(
        descriptor.value,
        pathDepth + 1,
        ancestors,
        budget
      );
    }
    return result;
  } finally {
    ancestors.delete(value);
  }
}

function asRecord(value: unknown): PlainRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) rejectSnapshot();
  return value as PlainRecord;
}

function exactKeys(record: PlainRecord, expectedKeys: readonly string[]): void {
  const actual = Object.keys(record).sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    rejectSnapshot();
  }
}

function textValue(
  value: unknown,
  maximumCharacters: number,
  allowEmpty = false
): string {
  if (typeof value !== "string" || value.length > maximumCharacters || unsafeVisiblePattern.test(value)) {
    rejectSnapshot();
  }
  if (!allowEmpty && !value.trim()) rejectSnapshot();
  return value;
}

function sha256(value: unknown): string {
  const digest = textValue(value, 64);
  if (!sha256Pattern.test(digest)) rejectSnapshot();
  return digest;
}

function uuid(value: unknown): string {
  const identifier = textValue(value, 36);
  if (!uuidPattern.test(identifier)) rejectSnapshot();
  return identifier;
}

function integer(value: unknown, minimum: number, maximum: number): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    rejectSnapshot();
  }
  return value as number;
}

function oneOf<const T extends readonly (string | number | boolean | null)[]>(
  value: unknown,
  allowed: T
): T[number] {
  if (!allowed.some((candidate) => Object.is(candidate, value))) rejectSnapshot();
  return value as T[number];
}

function sameDeclarativeValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => sameDeclarativeValue(value, right[index]));
  }
  if (
    left === null
    || right === null
    || typeof left !== "object"
    || typeof right !== "object"
  ) return false;
  const leftRecord = left as PlainRecord;
  const rightRecord = right as PlainRecord;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) => (
      key === rightKeys[index]
      && sameDeclarativeValue(leftRecord[key], rightRecord[key])
    ));
}

function freezeDisplay<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as PlainRecord)) freezeDisplay(child);
  return value;
}

function boundedVisibleStringList(
  value: unknown,
  maximumItems: number,
  maximumCharacters: number
): readonly string[] {
  if (!Array.isArray(value) || value.length > maximumItems) rejectSnapshot();
  const strings = value.map((item) => textValue(item, maximumCharacters));
  if (new Set(strings).size !== strings.length) rejectSnapshot();
  return Object.freeze(strings);
}

function projectBoundReviewContext(
  rawRead: LocalBaziCitationReviewContextRead,
  locator: KnowledgeReviewContextLocator,
  sourceDisplay: LocalSourceAwareDisplay
): BoundReviewContextDisplay {
  const read = asRecord(declarativeSnapshot(rawRead));
  exactKeys(read, [
    "profile",
    "context",
    "releaseModuleBinding",
    "repositoryReadBinding",
    "boundary",
    "integrity"
  ]);
  const readProfile = asRecord(read.profile);
  exactKeys(readProfile, Object.keys(expectedReviewReadProfile));
  if (!sameDeclarativeValue(readProfile, expectedReviewReadProfile)) rejectSnapshot();
  const release = asRecord(read.releaseModuleBinding);
  exactKeys(release, [
    "dbGeneration",
    "databaseName",
    "targetSchema",
    "migrationId",
    "buildVersion",
    "storageManifestDigest",
    "releaseEvidenceId",
    "releaseEvidenceBound",
    "expectedLegacyTupleMatched",
    "engineeringEvidenceOnly"
  ]);
  const databaseName = textValue(release.databaseName, 256);
  if (
    release.dbGeneration !== "legacy-v13"
    || release.targetSchema !== 13
    || release.migrationId !== null
    || release.expectedLegacyTupleMatched !== true
    || release.engineeringEvidenceOnly !== true
    || (
      release.buildVersion !== null
      && (typeof release.buildVersion !== "string" || !/^[a-f0-9]{12}$/u.test(release.buildVersion))
    )
    || (
      release.storageManifestDigest !== null
      && (typeof release.storageManifestDigest !== "string" || !sha256Pattern.test(release.storageManifestDigest))
    )
    || (
      release.releaseEvidenceId !== null
      && release.releaseEvidenceId !== "unbound-local-build"
      && (typeof release.releaseEvidenceId !== "string" || !/^hre1-[a-f0-9]{32}$/u.test(release.releaseEvidenceId))
    )
    || release.releaseEvidenceBound !== (
      typeof release.releaseEvidenceId === "string"
      && /^hre1-[a-f0-9]{32}$/u.test(release.releaseEvidenceId)
    )
  ) rejectSnapshot();
  const repositoryRead = asRecord(read.repositoryReadBinding);
  exactKeys(repositoryRead, [
    "databaseName",
    "targetSchemaVersion",
    "caseBundleReadPasses",
    "knowledgeWorksetReadPasses",
    "secondWorksetReadUsedExpectedDigest",
    "worksetSnapshotSha256",
    "firstContextPayloadSha256",
    "secondContextPayloadSha256",
    "expectedPriorContextPayloadSha256",
    "expectedPriorContextMatched"
  ]);
  const firstContextPayloadSha256 = sha256(repositoryRead.firstContextPayloadSha256);
  const secondContextPayloadSha256 = sha256(repositoryRead.secondContextPayloadSha256);
  if (
    repositoryRead.databaseName !== databaseName
    || repositoryRead.targetSchemaVersion !== 13
    || repositoryRead.caseBundleReadPasses !== 2
    || repositoryRead.knowledgeWorksetReadPasses !== 2
    || repositoryRead.secondWorksetReadUsedExpectedDigest !== true
    || firstContextPayloadSha256 !== secondContextPayloadSha256
    || (
      repositoryRead.expectedPriorContextPayloadSha256 === null
        ? repositoryRead.expectedPriorContextMatched !== null
        : sha256(repositoryRead.expectedPriorContextPayloadSha256) !== secondContextPayloadSha256
          || repositoryRead.expectedPriorContextMatched !== true
    )
  ) rejectSnapshot();
  const readBoundary = asRecord(read.boundary);
  exactKeys(readBoundary, Object.keys(expectedReviewReadBoundary));
  if (!sameDeclarativeValue(readBoundary, expectedReviewReadBoundary)) rejectSnapshot();

  const context = asRecord(read.context);
  exactKeys(context, [
    "profile",
    "releaseBinding",
    "caseBinding",
    "revisionBinding",
    "subjectBinding",
    "factProjection",
    "ruleProjection",
    "worksetBinding",
    "displayContextBinding",
    "boundary",
    "integrity"
  ]);
  const contextProfile = asRecord(context.profile);
  exactKeys(contextProfile, Object.keys(expectedReviewContextProfile));
  if (!sameDeclarativeValue(contextProfile, expectedReviewContextProfile)) rejectSnapshot();
  const contextRelease = asRecord(context.releaseBinding);
  const expectedContextRelease = {
    dbGeneration: "legacy-v13",
    targetSchema: 13,
    migrationId: null,
    callerProvidedExpectedValuesMatched: true,
    runtimeReleaseIdentityAttested: false,
    storageAttestedDbGeneration: false,
    storageAttestedMigrationIdentity: false,
    engineeringEvidenceOnly: true
  };
  exactKeys(contextRelease, Object.keys(expectedContextRelease));
  if (!sameDeclarativeValue(contextRelease, expectedContextRelease)) rejectSnapshot();
  const caseBinding = asRecord(context.caseBinding);
  exactKeys(caseBinding, [
    "caseId",
    "deletedInSuppliedCaseSnapshot",
    "selectedRevisionWasLatestInSuppliedCaseSnapshot",
    "repositoryFreshnessAttested"
  ]);
  const caseId = uuid(caseBinding.caseId);
  if (
    caseId.toLowerCase() !== locator.caseId.toLowerCase()
    || caseBinding.deletedInSuppliedCaseSnapshot !== false
    || typeof caseBinding.selectedRevisionWasLatestInSuppliedCaseSnapshot !== "boolean"
    || caseBinding.repositoryFreshnessAttested !== false
  ) rejectSnapshot();
  const revisionBinding = asRecord(context.revisionBinding);
  exactKeys(revisionBinding, [
    "revisionId",
    "revisionNumber",
    "revisionSnapshotDigest",
    "storedResultHash",
    "replayedResultHash",
    "replayProjectionDigest",
    "replayExecutorId",
    "engine",
    "tzdbVersion"
  ]);
  const revisionId = uuid(revisionBinding.revisionId);
  if (revisionId.toLowerCase() !== locator.revisionId.toLowerCase()) rejectSnapshot();
  const revisionNumber = integer(revisionBinding.revisionNumber, 1, Number.MAX_SAFE_INTEGER);
  const revisionSnapshotSha256 = sha256(revisionBinding.revisionSnapshotDigest);
  const storedResultHash = sha256(revisionBinding.storedResultHash);
  if (
    storedResultHash !== sha256(revisionBinding.replayedResultHash)
    || !textValue(revisionBinding.replayProjectionDigest, 160)
    || !textValue(revisionBinding.replayExecutorId, 160)
    || !textValue(revisionBinding.tzdbVersion, 160)
  ) rejectSnapshot();
  const engine = asRecord(revisionBinding.engine);
  exactKeys(engine, [
    "name",
    "version",
    "upstreamName",
    "upstreamVersion",
    "upstreamTagCommit",
    "upstreamIntegrity"
  ]);
  if (
    engine.name !== "hakimi-bazi-core"
    || engine.upstreamName !== "lunar-typescript"
    || engine.upstreamVersion !== "1.8.6"
  ) rejectSnapshot();
  textValue(engine.version, 160);
  textValue(engine.upstreamTagCommit, 200);
  textValue(engine.upstreamIntegrity, 300);

  const subjectBinding = asRecord(context.subjectBinding);
  exactKeys(subjectBinding, [
    "evidenceSubjectId",
    "registryVersion",
    "category",
    "label",
    "fieldPath",
    "algorithmIds",
    "ruleProfilePaths"
  ]);
  const evidenceSubjectId = textValue(subjectBinding.evidenceSubjectId, 160);
  const fieldPath = textValue(subjectBinding.fieldPath, 100);
  if (
    evidenceSubjectId !== locator.evidenceSubjectId
    || evidenceSubjectId !== sourceDisplay.subject.subjectId
    || fieldPath !== locator.fieldPath
  ) rejectSnapshot();
  const registeredAlgorithmIds = boundedVisibleStringList(subjectBinding.algorithmIds, 32, 160);
  const subjectLabel = textValue(subjectBinding.label, 160);
  textValue(subjectBinding.registryVersion, 160);
  oneOf(subjectBinding.category, ["calendar_fact", "rule_derived", "interpretive_claim"] as const);
  const ruleProfilePaths = boundedVisibleStringList(subjectBinding.ruleProfilePaths, 8, 100);
  if (ruleProfilePaths.some((path) => path !== "calendar.dayBoundary")) rejectSnapshot();

  const factProjection = asRecord(context.factProjection);
  exactKeys(factProjection, ["items", "projectionSha256"]);
  sha256(factProjection.projectionSha256);
  if (!Array.isArray(factProjection.items) || factProjection.items.length > 32) rejectSnapshot();
  const factFieldPaths = new Set<string>();
  let selectedFact: PlainRecord | null = null;
  for (const candidate of factProjection.items) {
    const item = asRecord(candidate);
    exactKeys(item, ["fieldPath", "value", "provenance"]);
    const candidateFieldPath = textValue(item.fieldPath, 100);
    if (factFieldPaths.has(candidateFieldPath)) rejectSnapshot();
    factFieldPaths.add(candidateFieldPath);
    const candidateValue = Array.isArray(item.value)
      ? boundedVisibleStringList(item.value, 32, 300)
      : textValue(item.value, 300);
    const candidateProvenance = asRecord(item.provenance);
    exactKeys(candidateProvenance, ["field", "kind", "algorithmId", "verificationStatus"]);
    const candidateAlgorithmId = textValue(candidateProvenance.algorithmId, 160);
    if (
      candidateProvenance.field !== candidateFieldPath
      || !registeredAlgorithmIds.includes(candidateAlgorithmId)
    ) rejectSnapshot();
    oneOf(candidateProvenance.kind, ["calendar_fact", "rule_derived", "interpretive_claim", "ai_expression"] as const);
    oneOf(candidateProvenance.verificationStatus, ["gold_verified", "adjudicated", "disputed", "experimental"] as const);
    if (candidateFieldPath === fieldPath) {
      selectedFact = freezeDisplay({
        fieldPath: candidateFieldPath,
        value: candidateValue,
        provenance: candidateProvenance
      });
    }
  }
  if (selectedFact === null) rejectSnapshot();
  const provenance = asRecord(selectedFact.provenance);
  const algorithmId = textValue(provenance.algorithmId, 160);
  if (provenance.field !== fieldPath || !registeredAlgorithmIds.includes(algorithmId)) rejectSnapshot();
  const fieldValue = selectedFact.value as string | readonly string[];

  const ruleProjection = asRecord(context.ruleProjection);
  exactKeys(ruleProjection, [
    "profileId",
    "profileVersion",
    "profileStatus",
    "ruleProfileDigest",
    "revisionRulePackBinding",
    "liveActiveRulePackReadPerformed",
    "items",
    "projectionSha256"
  ]);
  sha256(ruleProjection.ruleProfileDigest);
  sha256(ruleProjection.projectionSha256);
  if (ruleProjection.liveActiveRulePackReadPerformed !== false) rejectSnapshot();
  const ruleItems = ruleProjection.items;
  if (
    !Array.isArray(ruleItems)
    || ruleItems.length > 1
    || ruleItems.length !== ruleProfilePaths.length
  ) rejectSnapshot();
  let dayBoundary: BoundReviewContextDisplay["frozenRuleProfile"]["dayBoundary"] = null;
  if (ruleItems.length === 1) {
    const ruleItem = asRecord(ruleItems[0]);
    exactKeys(ruleItem, ["ruleProfilePath", "value"]);
    if (ruleItem.ruleProfilePath !== "calendar.dayBoundary") rejectSnapshot();
    dayBoundary = oneOf(ruleItem.value, ["zi_start_23", "midnight", "split_zi"] as const);
  }
  const rawRulePack = ruleProjection.revisionRulePackBinding;
  let rulePackBinding: BoundReviewContextDisplay["frozenRuleProfile"]["rulePackBinding"] = null;
  if (rawRulePack !== null) {
    const rulePack = asRecord(rawRulePack);
    exactKeys(rulePack, [
      "kind",
      "packDigest",
      "profileDigest",
      "packId",
      "profileId",
      "profileVersion",
      "useMode"
    ]);
    if (rulePack.kind !== "installed_rule_pack" || rulePack.useMode !== "exact") rejectSnapshot();
    sha256(rulePack.packDigest);
    if (
      sha256(rulePack.profileDigest) !== ruleProjection.ruleProfileDigest
      || rulePack.profileId !== ruleProjection.profileId
      || rulePack.profileVersion !== ruleProjection.profileVersion
    ) rejectSnapshot();
    rulePackBinding = freezeDisplay({
      kind: "installed_rule_pack" as const,
      packDigest: sha256(rulePack.packDigest),
      profileDigest: sha256(rulePack.profileDigest),
      packId: textValue(rulePack.packId, 160),
      profileId: textValue(rulePack.profileId, 160),
      profileVersion: textValue(rulePack.profileVersion, 40),
      useMode: "exact" as const
    });
  }

  const workset = asRecord(context.worksetBinding);
  exactKeys(workset, [
    "worksetSnapshotVersion",
    "worksetSnapshotSha256",
    "suppliedStorageSidecarSnapshotVersion",
    "suppliedStorageSidecarSnapshotSha256",
    "packetProjectionVersion",
    "packetPayloadSha256",
    "matchingSourceSetSha256",
    "inventoryProjectionVersion",
    "inventoryPayloadSha256",
    "citationIdsWithStoredVerifiedStatus",
    "pairCount",
    "reviewGateStatus"
  ]);
  textValue(workset.worksetSnapshotVersion, 200);
  textValue(workset.suppliedStorageSidecarSnapshotVersion, 200);
  textValue(workset.packetProjectionVersion, 80);
  textValue(workset.inventoryProjectionVersion, 80);
  const worksetSnapshotSha256 = sha256(workset.worksetSnapshotSha256);
  const storageSnapshotSha256 = sha256(workset.suppliedStorageSidecarSnapshotSha256);
  const packetPayloadSha256 = sha256(workset.packetPayloadSha256);
  const matchingSourceSetSha256 = sha256(workset.matchingSourceSetSha256);
  sha256(workset.inventoryPayloadSha256);
  const verifiedCitationIds = identifierList(workset.citationIdsWithStoredVerifiedStatus, 64);
  const pairCount = integer(workset.pairCount, 1, 2_016);
  const sourceCitationIds = sourceDisplay.items.map((item) => item.citationId);
  if (
    workset.reviewGateStatus !== "pending_human_review"
    || sourceDisplay.status !== "ready_for_local_review"
    || sourceDisplay.counts.candidate !== 0
    || sourceDisplay.counts.rejected !== 0
    || sourceDisplay.counts.verified < 2
    || sourceDisplay.counts.emitted !== sourceDisplay.counts.verified
    || sourceDisplay.items.length !== sourceDisplay.counts.verified
    || verifiedCitationIds.length !== sourceDisplay.counts.verified
    || pairCount !== verifiedCitationIds.length * (verifiedCitationIds.length - 1) / 2
    || !sameDeclarativeValue(verifiedCitationIds, sourceCitationIds)
    || storageSnapshotSha256 !== sourceDisplay.digests.storageSnapshotSha256
    || packetPayloadSha256 !== sourceDisplay.digests.packetPayloadSha256
    || matchingSourceSetSha256 !== sourceDisplay.digests.matchingSourceSetSha256
    || repositoryRead.worksetSnapshotSha256 !== worksetSnapshotSha256
  ) rejectSnapshot();
  const displayContextBinding = asRecord(context.displayContextBinding);
  exactKeys(displayContextBinding, ["projectionVersion", "payloadSha256"]);
  if (displayContextBinding.projectionVersion !== "0.1.0") rejectSnapshot();
  const contextBoundary = asRecord(context.boundary);
  exactKeys(contextBoundary, Object.keys(expectedReviewContextBoundary));
  if (!sameDeclarativeValue(contextBoundary, expectedReviewContextBoundary)) rejectSnapshot();
  const contextIntegrity = asRecord(context.integrity);
  const readIntegrity = asRecord(read.integrity);
  exactKeys(contextIntegrity, ["hashAlgorithm", "payloadSha256", "authenticityClaimed"]);
  exactKeys(readIntegrity, ["hashAlgorithm", "payloadSha256", "authenticityClaimed"]);
  const contextPayloadSha256 = sha256(contextIntegrity.payloadSha256);
  sha256(readIntegrity.payloadSha256);
  if (
    contextIntegrity.hashAlgorithm !== "SHA-256"
    || contextIntegrity.authenticityClaimed !== false
    || readIntegrity.hashAlgorithm !== "SHA-256"
    || readIntegrity.authenticityClaimed !== false
    || secondContextPayloadSha256 !== contextPayloadSha256
  ) rejectSnapshot();

  return freezeDisplay({
    caseId,
    revisionId,
    revisionNumber,
    selectedRevisionWasLatestInSuppliedCaseSnapshot: caseBinding.selectedRevisionWasLatestInSuppliedCaseSnapshot,
    subjectLabel,
    fieldPath,
    fieldValue,
    provenance: freezeDisplay({
      kind: oneOf(provenance.kind, ["calendar_fact", "rule_derived", "interpretive_claim", "ai_expression"] as const),
      algorithmId,
      verificationStatus: oneOf(provenance.verificationStatus, ["gold_verified", "adjudicated", "disputed", "experimental"] as const),
      registeredAlgorithmIds
    }),
    frozenRuleProfile: freezeDisplay({
      profileId: textValue(ruleProjection.profileId, 160),
      profileVersion: textValue(ruleProjection.profileVersion, 40),
      profileStatus: oneOf(ruleProjection.profileStatus, ["working_default", "verified", "experimental"] as const),
      dayBoundary,
      rulePackBinding
    }),
    digests: freezeDisplay({
      contextPayloadSha256,
      displayContextPayloadSha256: sha256(displayContextBinding.payloadSha256),
      revisionSnapshotSha256,
      factProjectionSha256: sha256(factProjection.projectionSha256),
      ruleProjectionSha256: sha256(ruleProjection.projectionSha256),
      ruleProfileSha256: sha256(ruleProjection.ruleProfileDigest),
      worksetSnapshotSha256
    })
  });
}

function identifierList(value: unknown, maximumItems: number): readonly string[] {
  if (!Array.isArray(value) || value.length > maximumItems) rejectSnapshot();
  const identifiers = value.map(uuid);
  if (new Set(identifiers).size !== identifiers.length) rejectSnapshot();
  return Object.freeze(identifiers);
}

function visibleStringList(value: unknown, expected: readonly string[]): readonly string[] {
  if (!Array.isArray(value) || value.length !== expected.length) rejectSnapshot();
  const strings = value.map((item) => textValue(item, 300));
  if (!sameDeclarativeValue(strings, expected)) rejectSnapshot();
  return Object.freeze(strings);
}

function quotePreview(quote: string): Readonly<{ text: string; truncated: boolean }> {
  const characters = Array.from(quote);
  if (characters.length <= MAX_QUOTE_PREVIEW_CHARACTERS) {
    return Object.freeze({ text: quote, truncated: false });
  }
  return Object.freeze({
    text: `${characters.slice(0, MAX_QUOTE_PREVIEW_CHARACTERS).join("")}…`,
    truncated: true
  });
}

function projectLocalSourceAwareSnapshot(
  rawSnapshot: unknown,
  expectedSubjectId: string
): LocalSourceAwareDisplay {
  const expectedSubject = requireEvidenceSubject(expectedSubjectId);
  const expectedTargetKey = `evidence_subject:${expectedSubject.subjectId}`;
  const root = asRecord(declarativeSnapshot(rawSnapshot));
  exactKeys(root, ["packet", "storageSnapshot"]);

  const packet = asRecord(root.packet);
  exactKeys(packet, [
    "profile",
    "request",
    "status",
    "sourceMultiplicity",
    "items",
    "candidateCitationIds",
    "rejectedCitationIds",
    "verifiedCitationIds",
    "blockedVerifiedCitations",
    "counts",
    "sourceSet",
    "integrity",
    "boundary"
  ]);
  const packetProfile = asRecord(packet.profile);
  const expectedPacketProfile = {
    projectionVersion: "hakimi.knowledge.source_aware_retrieval_packet/0.1.0",
    contentVersion: "0.1.0",
    scope: "one_registered_evidence_subject_with_exact_verified_citations",
    selectionPolicy: "all_target_bound_sources_preserved_without_semantic_ranking",
    mutationPolicy: "read_only_projection",
    reviewStatus: "candidate_pending_content_and_security_review",
    expertTruthClaimed: false,
    scientificValidityClaimed: false,
    formalActivationAllowed: false
  } as const;
  exactKeys(packetProfile, Object.keys(expectedPacketProfile));
  if (!sameDeclarativeValue(packetProfile, expectedPacketProfile)) rejectSnapshot();

  const request = asRecord(packet.request);
  exactKeys(request, ["useMode", "targetKey", "evidenceSubject"]);
  if (request.useMode !== "local_review" || request.targetKey !== expectedTargetKey) rejectSnapshot();
  const subject = asRecord(request.evidenceSubject);
  exactKeys(subject, [
    "subjectId",
    "registryVersion",
    "category",
    "label",
    "fieldPaths",
    "ruleProfilePaths"
  ]);
  if (
    subject.subjectId !== expectedSubject.subjectId
    || subject.registryVersion !== expectedSubject.registryVersion
    || subject.category !== expectedSubject.category
    || subject.label !== expectedSubject.label
  ) rejectSnapshot();
  const fieldPaths = visibleStringList(subject.fieldPaths, expectedSubject.fieldPaths);
  const ruleProfilePaths = visibleStringList(subject.ruleProfilePaths, expectedSubject.ruleProfilePaths);

  const candidateCitationIds = identifierList(packet.candidateCitationIds, 256);
  const verifiedCitationIds = identifierList(packet.verifiedCitationIds, 64);
  const rejectedCitationIds = identifierList(packet.rejectedCitationIds, 256);
  const allCitationIds = [
    ...candidateCitationIds,
    ...verifiedCitationIds,
    ...rejectedCitationIds
  ];
  if (new Set(allCitationIds).size !== allCitationIds.length) rejectSnapshot();
  if (!Array.isArray(packet.blockedVerifiedCitations) || packet.blockedVerifiedCitations.length !== 0) {
    rejectSnapshot();
  }

  const counts = asRecord(packet.counts);
  exactKeys(counts, ["matching", "candidate", "verified", "rejected", "emitted", "blockedVerified"]);
  const matchingCount = integer(counts.matching, 0, 256);
  const candidateCount = integer(counts.candidate, 0, 256);
  const verifiedCount = integer(counts.verified, 0, 64);
  const rejectedCount = integer(counts.rejected, 0, 256);
  const emittedCount = integer(counts.emitted, 0, 64);
  if (
    matchingCount !== candidateCount + verifiedCount + rejectedCount
    || candidateCount !== candidateCitationIds.length
    || verifiedCount !== verifiedCitationIds.length
    || rejectedCount !== rejectedCitationIds.length
    || emittedCount !== verifiedCount
    || counts.blockedVerified !== 0
  ) rejectSnapshot();

  const expectedStatus = verifiedCount === 0
    ? "blocked_no_verified_citations" as const
    : candidateCount > 0
      ? "ready_for_local_review_with_unreviewed_sources" as const
      : "ready_for_local_review" as const;
  const status = oneOf(packet.status, Object.keys(localStatusLabels) as LocalReviewStatus[]);
  if (status !== expectedStatus) rejectSnapshot();
  const expectedMultiplicity = verifiedCount === 0
    ? "none" as const
    : verifiedCount === 1
      ? "single" as const
      : "multiple_preserved_without_resolution" as const;
  const sourceMultiplicity = oneOf(packet.sourceMultiplicity, [
    "none",
    "single",
    "multiple_preserved_without_resolution"
  ] as const);
  if (sourceMultiplicity !== expectedMultiplicity) rejectSnapshot();

  if (!Array.isArray(packet.items) || packet.items.length !== emittedCount) rejectSnapshot();
  const items: DisplayItem[] = packet.items.map((itemValue, index) => {
    const item = asRecord(itemValue);
    exactKeys(item, [
      "order",
      "citationId",
      "citationSnapshotDigest",
      "document",
      "locator",
      "quote",
      "targetKey",
      "sourceRights",
      "citationReview",
      "evidenceClassification",
      "itemDigest",
      "semanticTruthClaimed",
      "expertTruthClaimed",
      "scientificValidityClaimed",
      "result"
    ]);
    const citationId = uuid(item.citationId);
    if (
      item.order !== index + 1
      || citationId !== verifiedCitationIds[index]
      || item.targetKey !== expectedTargetKey
      || item.semanticTruthClaimed !== false
      || item.expertTruthClaimed !== false
      || item.scientificValidityClaimed !== false
      || item.result !== null
    ) rejectSnapshot();
    sha256(item.citationSnapshotDigest);
    sha256(item.itemDigest);

    const document = asRecord(item.document);
    exactKeys(document, [
      "documentId",
      "documentContentHash",
      "documentSnapshotDigest",
      "recordType",
      "title",
      "author",
      "edition"
    ]);
    const documentId = uuid(document.documentId);
    sha256(document.documentContentHash);
    sha256(document.documentSnapshotDigest);
    oneOf(document.recordType, ["bundled_knowledge_document", "user_knowledge_document"] as const);
    const title = textValue(document.title, 300);
    const author = textValue(document.author, 200, true);
    const edition = textValue(document.edition, 200, true);

    const locator = asRecord(item.locator);
    exactKeys(locator, ["sectionId", "startLine", "endLine"]);
    const sectionId = textValue(locator.sectionId, 80);
    if (!sectionIdPattern.test(sectionId)) rejectSnapshot();
    const startLine = integer(locator.startLine, 1, 1_000_000_000);
    const endLine = integer(locator.endLine, startLine, startLine + 199);

    const quote = textValue(item.quote, 20_000);
    const preview = quotePreview(quote);
    const sourceRights = asRecord(item.sourceRights);
    exactKeys(sourceRights, [
      "snapshotDigest",
      "origin",
      "status",
      "workStatus",
      "editionStatus",
      "basis",
      "licenseId",
      "distributionPolicy",
      "reviewStatus",
      "rightsEvidenceCount"
    ]);
    sha256(sourceRights.snapshotDigest);
    const origin = oneOf(sourceRights.origin, ["user_import", "bundled"] as const);
    const rightsStatus = oneOf(
      sourceRights.status,
      Object.keys(rightsStatusLabels) as Array<DisplayItem["rights"]["status"]>
    );
    const workStatus = oneOf(
      sourceRights.workStatus,
      Object.keys(workStatusLabels) as Array<DisplayItem["rights"]["workStatus"]>
    );
    const editionStatus = oneOf(
      sourceRights.editionStatus,
      Object.keys(editionStatusLabels) as Array<DisplayItem["rights"]["editionStatus"]>
    );
    const basis = oneOf(sourceRights.basis, [
      "user_declaration",
      "public_domain",
      "spdx_license",
      "written_permission",
      "project_authored",
      "unknown"
    ] as const);
    if (sourceRights.licenseId !== null) textValue(sourceRights.licenseId, 200);
    const distributionPolicy = oneOf(
      sourceRights.distributionPolicy,
      ["local_private_only", "redistributable"] as const
    );
    const reviewStatus = oneOf(
      sourceRights.reviewStatus,
      Object.keys(reviewStatusLabels) as Array<DisplayItem["rights"]["reviewStatus"]>
    );
    const rightsEvidenceCount = integer(sourceRights.rightsEvidenceCount, 0, 100);

    const citationReview = asRecord(item.citationReview);
    exactKeys(citationReview, ["status", "reviewerCount", "decisionNoteDigest"]);
    if (citationReview.status !== "verified") rejectSnapshot();
    const citationReviewerCount = integer(citationReview.reviewerCount, 2, 20);
    sha256(citationReview.decisionNoteDigest);
    const evidenceClassification = oneOf(item.evidenceClassification, [
      "verified_exact_quote_local_private",
      "verified_exact_quote_redistributable"
    ] as const);
    const redistributionEngineeringGatePassed = origin === "bundled"
      && distributionPolicy === "redistributable"
      && reviewStatus === "double_reviewed"
      && (workStatus === "public_domain_verified" || workStatus === "project_original_verified")
      && (
        editionStatus === "public_domain_verified"
        || editionStatus === "licensed_verified"
        || editionStatus === "project_original_verified"
      )
      && rightsStatus !== "user_unverified"
      && rightsStatus !== "blocked";
    const expectedEvidenceClassification = redistributionEngineeringGatePassed
      ? "verified_exact_quote_redistributable"
      : "verified_exact_quote_local_private";
    if (evidenceClassification !== expectedEvidenceClassification) rejectSnapshot();

    return freezeDisplay({
      order: index + 1,
      citationId,
      documentId,
      sectionId,
      startLine,
      endLine,
      title,
      author,
      edition,
      quotePreview: preview.text,
      quoteTruncated: preview.truncated,
      evidenceClassification,
      rights: freezeDisplay({
        origin,
        status: rightsStatus,
        workStatus,
        editionStatus,
        basis,
        distributionPolicy,
        reviewStatus,
        rightsEvidenceCount,
        redistributionEngineeringGatePassed
      }),
      citationReviewerCount,
      knowledgeRecordRouteSafe: citationId === citationId.toLowerCase()
        && documentId === documentId.toLowerCase()
    });
  });

  const sourceSet = asRecord(packet.sourceSet);
  exactKeys(sourceSet, [
    "hashAlgorithm",
    "matchingSourceSetSha256",
    "allMatchingCitationStatusesBound",
    "rawSourceRecordsCopied"
  ]);
  if (
    sourceSet.hashAlgorithm !== "SHA-256"
    || sourceSet.allMatchingCitationStatusesBound !== true
    || sourceSet.rawSourceRecordsCopied !== false
  ) rejectSnapshot();
  const matchingSourceSetSha256 = sha256(sourceSet.matchingSourceSetSha256);
  const packetIntegrity = asRecord(packet.integrity);
  exactKeys(packetIntegrity, ["hashAlgorithm", "payloadSha256", "authenticityClaimed"]);
  if (packetIntegrity.hashAlgorithm !== "SHA-256" || packetIntegrity.authenticityClaimed !== false) {
    rejectSnapshot();
  }
  const packetPayloadSha256 = sha256(packetIntegrity.payloadSha256);

  const containsLocalPrivateSourceText = items.some((item) => (
    !item.rights.redistributionEngineeringGatePassed
  ));
  const expectedPacketBoundary = {
    exactDocumentCitationAndRightsBindingsVerified: true,
    allTargetBoundCitationIdsPreserved: true,
    semanticRankingPerformed: false,
    semanticConflictResolutionPerformed: false,
    citationSetConflictReviewPerformed: false,
    citationSetConflictStatus: "unassessed",
    citationReviewEstablishesSemanticTruth: false,
    rightsReviewEstablishesSemanticTruth: false,
    redistributionRightsGate: "local_only_not_applicable",
    rawKnowledgeDocumentsCopied: false,
    exactCitationQuotesCopied: items.length > 0,
    containsSourceText: items.length > 0,
    localPrivateSourceTextIncluded: containsLocalPrivateSourceText,
    sourceTextInstructionAuthority: false,
    promptInjectionScreeningPerformed: false,
    privacyReviewPerformed: false,
    externalPurposeRightsReviewed: false,
    externalProviderUseAuthorized: false,
    atomicStorageSnapshotVerified: false,
    mutationEpochRevalidationPerformed: false,
    downstreamExternalUseGate: "blocked",
    networkTransmissionPerformed: false,
    networkTransmissionAuthorized: false,
    publicExportAuthorized: false,
    expertTruthClaimed: false,
    scientificValidityClaimed: false,
    formalActivationAllowed: false,
    chartOrStorageMutationPerformed: false,
    result: null
  } as const;
  const packetBoundary = asRecord(packet.boundary);
  exactKeys(packetBoundary, Object.keys(expectedPacketBoundary));
  if (!sameDeclarativeValue(packetBoundary, expectedPacketBoundary)) rejectSnapshot();

  const storageSnapshot = asRecord(root.storageSnapshot);
  exactKeys(storageSnapshot, [
    "profile",
    "target",
    "database",
    "bindings",
    "boundary",
    "snapshotSha256"
  ]);
  const storageProfile = asRecord(storageSnapshot.profile);
  const expectedStorageProfile = {
    snapshotVersion: "hakimi.storage.local_knowledge_source_aware_retrieval_snapshot/0.1.0",
    useMode: "local_review",
    targetScope: "one_registered_evidence_subject",
    citationDiscovery: "bounded_full_table_schema_audit_then_canonical_target_filter",
    maxAuditedCitationRecords: 10_000,
    citationAuditBatchSize: 64,
    maxAuditedCitationJsonCharacters: 24_000_000,
    maxMatchingCitationRecords: 256,
    maxVerifiedCitationRecords: 64,
    maxCapturedPacketInputJsonCharacters: 24_000_000,
    maxCapturedPacketInputValueNodes: 100_000,
    digestDomain: "hakimi.storage.local_knowledge_source_aware_retrieval_snapshot.sha256/1",
    transactionMode: "readonly",
    storeNames: ["citations", "knowledgeDocuments", "sourceRights"]
  } as const;
  exactKeys(storageProfile, Object.keys(expectedStorageProfile));
  if (!sameDeclarativeValue(storageProfile, expectedStorageProfile)) rejectSnapshot();

  const storageTarget = asRecord(storageSnapshot.target);
  exactKeys(storageTarget, ["evidenceSubjectId", "targetKey", "registryVersion"]);
  if (
    storageTarget.evidenceSubjectId !== expectedSubject.subjectId
    || storageTarget.targetKey !== expectedTargetKey
    || storageTarget.registryVersion !== expectedSubject.registryVersion
  ) rejectSnapshot();
  const database = asRecord(storageSnapshot.database);
  exactKeys(database, ["targetSchemaVersion"]);
  if (database.targetSchemaVersion !== 13) rejectSnapshot();

  const bindings = asRecord(storageSnapshot.bindings);
  exactKeys(bindings, [
    "matchingCitationIds",
    "candidateCitationIds",
    "verifiedCitationIds",
    "rejectedCitationIds",
    "documentIds",
    "sourceRightsDocumentIds",
    "packetProjectionVersion",
    "packetPayloadSha256",
    "matchingSourceSetSha256"
  ]);
  const matchingCitationIds = identifierList(bindings.matchingCitationIds, 256);
  const boundCandidateIds = identifierList(bindings.candidateCitationIds, 256);
  const boundVerifiedIds = identifierList(bindings.verifiedCitationIds, 64);
  const boundRejectedIds = identifierList(bindings.rejectedCitationIds, 256);
  const documentIds = identifierList(bindings.documentIds, 256);
  const sourceRightsDocumentIds = identifierList(bindings.sourceRightsDocumentIds, 256);
  const expectedMatchingIds = [...allCitationIds].sort();
  if (
    !sameDeclarativeValue(matchingCitationIds, expectedMatchingIds)
    || !sameDeclarativeValue(boundCandidateIds, candidateCitationIds)
    || !sameDeclarativeValue(boundVerifiedIds, verifiedCitationIds)
    || !sameDeclarativeValue(boundRejectedIds, rejectedCitationIds)
    || !sameDeclarativeValue(documentIds, sourceRightsDocumentIds)
    || bindings.packetProjectionVersion !== expectedPacketProfile.projectionVersion
    || bindings.packetPayloadSha256 !== packetPayloadSha256
    || bindings.matchingSourceSetSha256 !== matchingSourceSetSha256
    || items.some((item) => !documentIds.includes(item.documentId))
  ) rejectSnapshot();

  const expectedStorageBoundary = {
    atomicStorageSnapshotVerified: true,
    nestedPacketAtomicStorageSnapshotVerified: false,
    mutationEpochRevalidationPerformed: false,
    nestedPacketMutationEpochRevalidationPerformed: false,
    externalProviderUseAuthorized: false,
    externalPurposeRightsReviewed: false,
    privacyReviewPerformed: false,
    sourceTextInstructionAuthority: false,
    promptInjectionScreeningPerformed: false,
    citationSetConflictReviewPerformed: false,
    citationSetConflictStatus: "unassessed",
    networkTransmissionPerformed: false,
    networkTransmissionAuthorized: false,
    publicExportAuthorized: false,
    expertTruthClaimed: false,
    scientificValidityClaimed: false,
    formalActivationAllowed: false,
    authenticityClaimed: false,
    snapshotCallStorageMutationPerformed: false,
    snapshotCallSchemaOrReleaseIdentityMutationPerformed: false
  } as const;
  const storageBoundary = asRecord(storageSnapshot.boundary);
  exactKeys(storageBoundary, Object.keys(expectedStorageBoundary));
  if (!sameDeclarativeValue(storageBoundary, expectedStorageBoundary)) rejectSnapshot();
  const storageSnapshotSha256 = sha256(storageSnapshot.snapshotSha256);

  return freezeDisplay({
    subject: freezeDisplay({
      subjectId: expectedSubject.subjectId,
      registryVersion: expectedSubject.registryVersion,
      category: expectedSubject.category,
      label: expectedSubject.label,
      fieldPaths,
      ruleProfilePaths
    }),
    status,
    sourceMultiplicity,
    counts: freezeDisplay({
      matching: matchingCount,
      candidate: candidateCount,
      verified: verifiedCount,
      rejected: rejectedCount,
      emitted: emittedCount
    }),
    items: Object.freeze(items),
    digests: freezeDisplay({
      storageSnapshotSha256,
      packetPayloadSha256,
      matchingSourceSetSha256
    }),
    targetSchemaVersion: 13 as const,
    containsLocalPrivateSourceText
  });
}

async function readCurrentLocalSourceAwareSnapshot(
  subjectId: string,
  options?: ReadLocalKnowledgeSourceAwareRetrievalSnapshotOptions
): Promise<unknown> {
  const { knowledgeRepository } = await import("@hakimi/storage");
  return knowledgeRepository.readLocalKnowledgeSourceAwareRetrievalSnapshot(subjectId, options);
}

async function readCurrentLocalReviewContext(
  locator: KnowledgeReviewContextLocator,
  options?: ReadLocalBaziCitationReviewContextOptions
): Promise<LocalBaziCitationReviewContextRead> {
  const { readCurrentLocalBaziCitationReviewContext } = await import("../lib/bazi-citation-review-context");
  return readCurrentLocalBaziCitationReviewContext(locator, options);
}

async function prepareCurrentLocalApplicabilityObservation(
  locator: KnowledgeReviewContextLocator,
  expectedPriorContextPayloadSha256: string
): Promise<LocalBaziCitationApplicabilityObservationTemplate> {
  const { prepareCurrentLocalBaziCitationApplicabilityObservationTemplate } = await import(
    "../lib/bazi-citation-review-context"
  );
  return prepareCurrentLocalBaziCitationApplicabilityObservationTemplate(
    locator,
    expectedPriorContextPayloadSha256
  );
}

async function preflightCurrentLocalApplicabilityObservation(
  locator: KnowledgeReviewContextLocator,
  expectedPriorContextPayloadSha256: string,
  fileText: string
): Promise<LocalBaziCitationApplicabilityObservationPreflightProjection> {
  const { preflightCurrentLocalBaziCitationApplicabilityObservation } = await import(
    "../lib/bazi-citation-review-context"
  );
  return preflightCurrentLocalBaziCitationApplicabilityObservation(
    locator,
    expectedPriorContextPayloadSha256,
    fileText
  );
}

async function pickCurrentLocalApplicabilityObservationFile(): Promise<Readonly<{
  name: string;
  text: string;
}> | null> {
  return pickTextFile({
    accept: ".json,application/json",
    maxBytes: 512 * 1024
  });
}

function shortDigest(value: string): string {
  return `${value.slice(0, 10)}…${value.slice(-6)}`;
}

function boundedReadFailureMessage(phase: ReadPhase): string {
  if (phase === "first_read") {
    return "首次本机只读捕获未完成；没有显示或保留来源摘录。";
  }
  if (phase === "first_projection") {
    return "首次捕获未通过当前注册表、Schema 13 与严格声明式投影检查；没有启动第二次读取。";
  }
  if (phase === "second_revalidation") {
    return "第二次只读复现未完成；首次捕获没有进入页面，也没有沿用旧结果。";
  }
  if (phase === "second_projection") {
    return "第二次捕获未通过当前注册表、Schema 13 与严格声明式投影检查；首次捕获没有进入页面。";
  }
  return "两个连续只读捕获时点的摘要不一致；两份结果都没有进入页面。";
}

function projectApplicabilityBinding(
  rawBinding: unknown,
  locator: KnowledgeReviewContextLocator,
  sourceDisplay: LocalSourceAwareDisplay,
  contextDisplay: BoundReviewContextDisplay
): Readonly<{
  caseId: string;
  revisionId: string;
  evidenceSubjectId: string;
  fieldPath: string;
  contextPayloadSha256: string;
  displayContextBindingSha256: string;
  worksetSnapshotSha256: string;
  matchingSourceSetSha256: string;
  citationCount: number;
}> {
  const binding = asRecord(rawBinding);
  exactKeys(binding, [
    "caseId",
    "revisionId",
    "evidenceSubjectId",
    "fieldPath",
    "contextPayloadSha256",
    "displayContextBindingSha256",
    "worksetSnapshotSha256",
    "matchingSourceSetSha256",
    "citationCount"
  ]);
  const projected = {
    caseId: uuid(binding.caseId),
    revisionId: uuid(binding.revisionId),
    evidenceSubjectId: textValue(binding.evidenceSubjectId, 160),
    fieldPath: textValue(binding.fieldPath, 160),
    contextPayloadSha256: sha256(binding.contextPayloadSha256),
    displayContextBindingSha256: sha256(binding.displayContextBindingSha256),
    worksetSnapshotSha256: sha256(binding.worksetSnapshotSha256),
    matchingSourceSetSha256: sha256(binding.matchingSourceSetSha256),
    citationCount: integer(binding.citationCount, 1, 64)
  };
  if (
    projected.caseId !== locator.caseId
    || projected.revisionId !== locator.revisionId
    || projected.evidenceSubjectId !== locator.evidenceSubjectId
    || projected.fieldPath !== locator.fieldPath
    || projected.contextPayloadSha256 !== contextDisplay.digests.contextPayloadSha256
    || projected.displayContextBindingSha256 !== contextDisplay.digests.displayContextPayloadSha256
    || projected.worksetSnapshotSha256 !== contextDisplay.digests.worksetSnapshotSha256
    || projected.matchingSourceSetSha256 !== sourceDisplay.digests.matchingSourceSetSha256
    || projected.citationCount !== sourceDisplay.items.length
    || projected.citationCount !== sourceDisplay.counts.verified
  ) rejectSnapshot();
  return freezeDisplay(projected);
}

function projectApplicabilityTemplate(
  rawTemplate: unknown,
  locator: KnowledgeReviewContextLocator,
  sourceDisplay: LocalSourceAwareDisplay,
  contextDisplay: BoundReviewContextDisplay
): Readonly<{
  receipt: ApplicabilityObservationTemplateReceipt;
  content: string;
  binding: LocalBaziCitationApplicabilityObservationTemplate["binding"];
}> {
  const template = asRecord(declarativeSnapshot(rawTemplate));
  exactKeys(template, ["profile", "fileName", "content", "binding", "boundary"]);
  const profile = asRecord(template.profile);
  exactKeys(profile, Object.keys(expectedApplicabilityObservationProfile));
  if (!sameDeclarativeValue(profile, expectedApplicabilityObservationProfile)) rejectSnapshot();
  const fileName = textValue(template.fileName, 80);
  if (fileName !== "hakimi-bazi-citation-applicability-observation-v01.json") rejectSnapshot();
  const content = textValue(template.content, 512 * 1024);
  if (new TextEncoder().encode(content).byteLength > 512 * 1024) rejectSnapshot();
  const binding = projectApplicabilityBinding(template.binding, locator, sourceDisplay, contextDisplay);
  const boundary = asRecord(template.boundary);
  exactKeys(boundary, Object.keys(expectedApplicabilityTemplateBoundary));
  if (!sameDeclarativeValue(boundary, expectedApplicabilityTemplateBoundary)) rejectSnapshot();
  let parsedContent: unknown;
  try {
    parsedContent = JSON.parse(content) as unknown;
  } catch {
    rejectSnapshot();
  }
  const fileRoot = asRecord(declarativeSnapshot(parsedContent));
  exactKeys(fileRoot, [
    "profile",
    "contextBinding",
    "reviewer",
    "session",
    "observations",
    "declaredCounts",
    "boundary"
  ]);
  const fileProfile = asRecord(fileRoot.profile);
  exactKeys(fileProfile, Object.keys(expectedApplicabilityFileProfile));
  if (!sameDeclarativeValue(fileProfile, expectedApplicabilityFileProfile)) rejectSnapshot();
  const fileContext = asRecord(fileRoot.contextBinding);
  const expectedFileContext = {
    releaseIdentity: {
      dbGeneration: "legacy-v13",
      targetSchema: 13,
      migrationId: null
    },
    caseId: binding.caseId,
    revisionId: binding.revisionId,
    evidenceSubjectId: binding.evidenceSubjectId,
    fieldPath: binding.fieldPath,
    contextPayloadSha256: binding.contextPayloadSha256,
    displayContextBindingSha256: binding.displayContextBindingSha256,
    revisionSnapshotSha256: contextDisplay.digests.revisionSnapshotSha256,
    factProjectionSha256: contextDisplay.digests.factProjectionSha256,
    ruleProjectionSha256: contextDisplay.digests.ruleProjectionSha256,
    worksetSnapshotSha256: binding.worksetSnapshotSha256,
    packetPayloadSha256: sourceDisplay.digests.packetPayloadSha256,
    matchingSourceSetSha256: binding.matchingSourceSetSha256,
    ruleProfile: {
      profileId: contextDisplay.frozenRuleProfile.profileId,
      profileVersion: contextDisplay.frozenRuleProfile.profileVersion,
      profileStatus: contextDisplay.frozenRuleProfile.profileStatus,
      ruleProfileDigest: contextDisplay.digests.ruleProfileSha256,
      revisionRulePackBinding: contextDisplay.frozenRuleProfile.rulePackBinding
    },
    citationIds: sourceDisplay.items.map((item) => item.citationId)
  };
  exactKeys(fileContext, Object.keys(expectedFileContext));
  if (!sameDeclarativeValue(fileContext, expectedFileContext)) rejectSnapshot();
  const fileReviewer = asRecord(fileRoot.reviewer);
  exactKeys(fileReviewer, Object.keys(expectedBlankApplicabilityReviewer));
  if (!sameDeclarativeValue(fileReviewer, expectedBlankApplicabilityReviewer)) rejectSnapshot();
  const fileSession = asRecord(fileRoot.session);
  exactKeys(fileSession, Object.keys(expectedBlankApplicabilitySession));
  if (!sameDeclarativeValue(fileSession, expectedBlankApplicabilitySession)) rejectSnapshot();
  const expectedCitationIds = expectedFileContext.citationIds;
  if (
    !Array.isArray(fileRoot.observations)
    || fileRoot.observations.length !== expectedCitationIds.length
  ) rejectSnapshot();
  fileRoot.observations.forEach((candidate, index) => {
    const item = asRecord(candidate);
    const expectedItem = {
      order: index + 1,
      citationId: expectedCitationIds[index],
      observation: "unobserved",
      reason: "",
      applicabilityConditions: "",
      counterexamples: "",
      relatedCitationIds: [],
      additionalSourceUrls: []
    };
    exactKeys(item, Object.keys(expectedItem));
    if (!sameDeclarativeValue(item, expectedItem)) rejectSnapshot();
  });
  const fileCounts = asRecord(fileRoot.declaredCounts);
  const expectedCounts = {
    total: expectedCitationIds.length,
    unobserved: expectedCitationIds.length,
    applicableInBoundContext: 0,
    partiallyApplicableInBoundContext: 0,
    notApplicableInBoundContext: 0,
    insufficientBoundContext: 0
  };
  exactKeys(fileCounts, Object.keys(expectedCounts));
  if (!sameDeclarativeValue(fileCounts, expectedCounts)) rejectSnapshot();
  const fileBoundary = asRecord(fileRoot.boundary);
  exactKeys(fileBoundary, Object.keys(expectedApplicabilityFileBoundary));
  if (!sameDeclarativeValue(fileBoundary, expectedApplicabilityFileBoundary)) rejectSnapshot();
  return freezeDisplay({
    receipt: {
      fileName,
      citationCount: binding.citationCount,
      contextPayloadSha256: binding.contextPayloadSha256,
      worksetSnapshotSha256: binding.worksetSnapshotSha256
    },
    content,
    binding
  });
}

function projectApplicabilityPreflight(
  rawPreflight: unknown,
  locator: KnowledgeReviewContextLocator,
  sourceDisplay: LocalSourceAwareDisplay,
  contextDisplay: BoundReviewContextDisplay
): ApplicabilityObservationPreflightDisplay {
  const preflight = asRecord(declarativeSnapshot(rawPreflight));
  exactKeys(preflight, [
    "profile",
    "binding",
    "reviewer",
    "counts",
    "observedCount",
    "allCitationsObserved",
    "reviewerAttributionComplete",
    "recordSha256",
    "boundary"
  ]);
  const profile = asRecord(preflight.profile);
  exactKeys(profile, Object.keys(expectedApplicabilityObservationProfile));
  if (!sameDeclarativeValue(profile, expectedApplicabilityObservationProfile)) rejectSnapshot();
  const binding = projectApplicabilityBinding(preflight.binding, locator, sourceDisplay, contextDisplay);
  const reviewer = asRecord(preflight.reviewer);
  exactKeys(reviewer, ["reviewerId", "displayName", "affiliation", "identityVerified"]);
  const projectedReviewer = {
    reviewerId: textValue(reviewer.reviewerId, 200, true),
    displayName: textValue(reviewer.displayName, 200, true),
    affiliation: textValue(reviewer.affiliation, 500, true),
    identityVerified: oneOf(reviewer.identityVerified, [false] as const)
  };
  const counts = asRecord(preflight.counts);
  exactKeys(counts, [
    "total",
    "unobserved",
    "applicableInBoundContext",
    "partiallyApplicableInBoundContext",
    "notApplicableInBoundContext",
    "insufficientBoundContext"
  ]);
  const projectedCounts = {
    total: integer(counts.total, 1, 64),
    unobserved: integer(counts.unobserved, 0, 64),
    applicableInBoundContext: integer(counts.applicableInBoundContext, 0, 64),
    partiallyApplicableInBoundContext: integer(counts.partiallyApplicableInBoundContext, 0, 64),
    notApplicableInBoundContext: integer(counts.notApplicableInBoundContext, 0, 64),
    insufficientBoundContext: integer(counts.insufficientBoundContext, 0, 64)
  };
  if (
    projectedCounts.total !== binding.citationCount
    || projectedCounts.unobserved
      + projectedCounts.applicableInBoundContext
      + projectedCounts.partiallyApplicableInBoundContext
      + projectedCounts.notApplicableInBoundContext
      + projectedCounts.insufficientBoundContext !== projectedCounts.total
  ) rejectSnapshot();
  const observedCount = integer(preflight.observedCount, 0, projectedCounts.total);
  const allCitationsObserved = oneOf(preflight.allCitationsObserved, [true, false] as const);
  const reviewerAttributionComplete = oneOf(
    preflight.reviewerAttributionComplete,
    [true, false] as const
  );
  if (
    observedCount !== projectedCounts.total - projectedCounts.unobserved
    || allCitationsObserved !== (observedCount === projectedCounts.total)
    || (observedCount > 0 && !reviewerAttributionComplete)
    || reviewerAttributionComplete !== Boolean(
      projectedReviewer.reviewerId.trim() && projectedReviewer.displayName.trim()
    )
  ) rejectSnapshot();
  const recordSha256 = sha256(preflight.recordSha256);
  const boundary = asRecord(preflight.boundary);
  exactKeys(boundary, Object.keys(expectedApplicabilityPreflightBoundary));
  if (!sameDeclarativeValue(boundary, expectedApplicabilityPreflightBoundary)) rejectSnapshot();
  return freezeDisplay({
    reviewer: freezeDisplay(projectedReviewer),
    counts: freezeDisplay(projectedCounts),
    observedCount,
    allCitationsObserved,
    reviewerAttributionComplete,
    recordSha256,
    contextPayloadSha256: binding.contextPayloadSha256
  });
}

function LocalSourceAwareReviewPanelInner({
  subjectId,
  readSnapshot,
  reviewContextLocator,
  readReviewContext,
  prepareApplicabilityObservation,
  preflightApplicabilityObservation,
  pickApplicabilityObservationFile,
  invalidationToken
}: {
  subjectId: string;
  readSnapshot: ReadLocalSourceAwareSnapshot;
  reviewContextLocator?: KnowledgeReviewContextLocator | null;
  readReviewContext: ReadLocalReviewContext;
  prepareApplicabilityObservation: PrepareLocalApplicabilityObservation;
  preflightApplicabilityObservation: PreflightLocalApplicabilityObservation;
  pickApplicabilityObservationFile: PickLocalApplicabilityObservationFile;
  invalidationToken?: string | number;
}) {
  const titleId = useId();
  const resultTitleId = useId();
  const [state, setState] = useState<ReviewState>({ status: "idle" });
  const [applicabilityObservationState, setApplicabilityObservationState] =
    useState<ApplicabilityObservationState>({ status: "idle" });
  const [applicabilityEditorSeed, setApplicabilityEditorSeed] =
    useState<BaziCitationApplicabilityEditorSeed | null>(null);
  const [applicabilityEditorSummary, setApplicabilityEditorSummary] =
    useState<BaziCitationApplicabilityEditorSummary | null>(null);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [visibleItemLimit, setVisibleItemLimit] = useState(INITIAL_VISIBLE_ITEMS);
  const mountedRef = useRef(true);
  const operationTokenRef = useRef(0);
  const runningRef = useRef(false);
  const applicabilityOperationTokenRef = useRef(0);
  const applicabilityRunningRef = useRef(false);
  const applicabilityEditorDirtyRef = useRef(false);
  const applicabilityEditorOpenButtonRef = useRef<HTMLButtonElement | null>(null);
  const restoreApplicabilityOpenFocusRef = useRef(false);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const previousInvalidationTokenRef = useRef(invalidationToken);
  const panelIdentity = `${subjectId}:${reviewContextLocator?.caseId ?? "none"}:${reviewContextLocator?.revisionId ?? "none"}:${reviewContextLocator?.evidenceSubjectId ?? "none"}:${reviewContextLocator?.fieldPath ?? "none"}`;
  const previousPanelIdentityRef = useRef(panelIdentity);
  let subjectUnavailable = false;
  let subjectLabel = "不可识别的证据主题";
  try {
    subjectLabel = requireEvidenceSubject(subjectId).label;
  } catch {
    subjectUnavailable = true;
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      operationTokenRef.current += 1;
      runningRef.current = false;
      applicabilityOperationTokenRef.current += 1;
      applicabilityRunningRef.current = false;
    };
  }, []);

  const invalidateVisibleResult = useCallback((message: string) => {
    operationTokenRef.current += 1;
    runningRef.current = false;
    applicabilityOperationTokenRef.current += 1;
    applicabilityRunningRef.current = false;
    if (!applicabilityEditorDirtyRef.current) {
      setApplicabilityEditorSeed(null);
      setApplicabilityEditorSummary(null);
    }
    setApplicabilityObservationState({ status: "idle" });
    setComparisonOpen(false);
    setVisibleItemLimit(INITIAL_VISIBLE_ITEMS);
    setState((current) => current.status === "idle"
      ? current
      : { status: "invalidated", message });
  }, []);

  useEffect(() => {
    if (previousPanelIdentityRef.current === panelIdentity) return;
    previousPanelIdentityRef.current = panelIdentity;
    invalidateVisibleResult("主题、Case、Revision 或字段 locator 已变化；旧结果已撤下，内存观察草稿若有修改则冻结等待显式处理。");
  }, [invalidateVisibleResult, panelIdentity]);

  useEffect(() => {
    if (Object.is(previousInvalidationTokenRef.current, invalidationToken)) return;
    previousInvalidationTokenRef.current = invalidationToken;
    invalidateVisibleResult("资料库写入或索引重读已经开始；此前两个读取时点一致的结果已撤下，必须重新主动读取。");
  }, [invalidationToken, invalidateVisibleResult]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return undefined;
    const invalidateAfterPageResume = () => {
      invalidateVisibleResult("页面已恢复或重新可见；此前两个读取时点一致的结果已撤下，必须重新主动读取。");
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") invalidateAfterPageResume();
    };
    window.addEventListener("pageshow", invalidateAfterPageResume);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("pageshow", invalidateAfterPageResume);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [invalidateVisibleResult]);

  const display = state.status === "ready" ? state.display : null;
  const reviewContext = state.status === "ready" ? state.reviewContext : null;
  const reading = state.status === "reading";
  const visibleItems = display?.items.slice(0, visibleItemLimit) ?? [];
  const comparisonInput = useMemo(() => {
    if (!display || reviewContext?.status !== "bound" || !reviewContextLocator) return null;
    return Object.freeze({
      binding: Object.freeze({
        locator: reviewContextLocator,
        contextPayloadSha256: reviewContext.display.digests.contextPayloadSha256,
        displayContextBindingSha256: reviewContext.display.digests.displayContextPayloadSha256,
        worksetSnapshotSha256: reviewContext.display.digests.worksetSnapshotSha256,
        matchingSourceSetSha256: display.digests.matchingSourceSetSha256
      }),
      citations: Object.freeze(display.items.map((item) => Object.freeze({
        citationId: item.citationId,
        title: item.title
      })))
    });
  }, [display, reviewContext, reviewContextLocator]);

  useEffect(() => {
    if (display) resultRef.current?.focus();
  }, [display]);

  useEffect(() => {
    if (applicabilityEditorSeed || !restoreApplicabilityOpenFocusRef.current) return;
    restoreApplicabilityOpenFocusRef.current = false;
    requestAnimationFrame(() => applicabilityEditorOpenButtonRef.current?.focus());
  }, [applicabilityEditorSeed]);

  const handleApplicabilityEditorSummary = useCallback((summary: BaziCitationApplicabilityEditorSummary) => {
    applicabilityEditorDirtyRef.current = summary.dirty;
    setApplicabilityEditorSummary((current) => (
      current
      && current.dirty === summary.dirty
      && current.stale === summary.stale
      && current.total === summary.total
      && current.observed === summary.observed
        ? current
        : summary
    ));
  }, []);

  const discardApplicabilityEditor = useCallback(() => {
    applicabilityOperationTokenRef.current += 1;
    applicabilityRunningRef.current = false;
    applicabilityEditorDirtyRef.current = false;
    restoreApplicabilityOpenFocusRef.current = true;
    setApplicabilityEditorSeed(null);
    setApplicabilityEditorSummary(null);
    setComparisonOpen(false);
    setApplicabilityObservationState({ status: "idle" });
  }, []);

  const run = async () => {
    if (
      subjectUnavailable
      || !releaseIdentityVerified
      || runningRef.current
      || applicabilityEditorDirtyRef.current
    ) return;
    const expectedPriorContextPayloadSha256 = state.status === "ready"
      && state.reviewContext.status === "bound"
      ? state.reviewContext.display.digests.contextPayloadSha256
      : undefined;
    const token = operationTokenRef.current + 1;
    operationTokenRef.current = token;
    runningRef.current = true;
    applicabilityOperationTokenRef.current += 1;
    applicabilityRunningRef.current = false;
    setApplicabilityEditorSeed(null);
    setApplicabilityEditorSummary(null);
    setComparisonOpen(false);
    setApplicabilityObservationState({ status: "idle" });
    setState({ status: "reading" });
    setVisibleItemLimit(INITIAL_VISIBLE_ITEMS);
    let phase: ReadPhase = "first_read";
    const contextRequest = reviewContextLocator
      ? readReviewContext(
          reviewContextLocator,
          expectedPriorContextPayloadSha256
            ? { expectedPriorContextPayloadSha256 }
            : undefined
        ).then(
          (value) => ({ status: "fulfilled" as const, value }),
          () => ({ status: "rejected" as const })
        )
      : Promise.resolve({ status: "not_requested" as const });
    try {
      const firstRawSnapshot = await readSnapshot(subjectId);
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      phase = "first_projection";
      const first = projectLocalSourceAwareSnapshot(firstRawSnapshot, subjectId);
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      phase = "second_revalidation";
      const secondRawSnapshot = await readSnapshot(subjectId, {
        expectedSnapshotSha256: first.digests.storageSnapshotSha256
      });
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      phase = "second_projection";
      const second = projectLocalSourceAwareSnapshot(secondRawSnapshot, subjectId);
      phase = "digest_comparison";
      if (
        second.digests.storageSnapshotSha256 !== first.digests.storageSnapshotSha256
        || second.digests.packetPayloadSha256 !== first.digests.packetPayloadSha256
        || second.digests.matchingSourceSetSha256 !== first.digests.matchingSourceSetSha256
      ) rejectSnapshot();
      const contextResult = await contextRequest;
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      let nextReviewContext: ReviewContextOutcome = { status: "not_requested" };
      if (contextResult.status === "rejected") {
        nextReviewContext = {
          status: "unavailable",
          message: "ReviewContext 未形成，未绑定该 Case/Revision；主题级来源仍按自身两遍只读摘要显示。"
        };
      } else if (contextResult.status === "fulfilled" && reviewContextLocator) {
        try {
          nextReviewContext = {
            status: "bound",
            display: projectBoundReviewContext(contextResult.value, reviewContextLocator, second)
          };
        } catch {
          nextReviewContext = {
            status: "unavailable",
            message: "ReviewContext 与主题来源的三组摘要或最小显示契约不一致；未将其绑定到该 Case/Revision。"
          };
        }
      }
      setState({ status: "ready", display: second, reviewContext: nextReviewContext });
    } catch {
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      setState({
        status: "failed",
        message: boundedReadFailureMessage(phase)
      });
    } finally {
      if (mountedRef.current && operationTokenRef.current === token) runningRef.current = false;
    }
  };

  const prepareApplicabilityTemplate = async () => {
    if (
      !reviewContextLocator
      || !display
      || reviewContext?.status !== "bound"
      || reading
      || applicabilityRunningRef.current
    ) return;
    const token = applicabilityOperationTokenRef.current + 1;
    applicabilityOperationTokenRef.current = token;
    applicabilityRunningRef.current = true;
    setComparisonOpen(false);
    setApplicabilityObservationState({ status: "preparing_template" });
    try {
      const rawTemplate = await prepareApplicabilityObservation(
        reviewContextLocator,
        reviewContext.display.digests.contextPayloadSha256
      );
      if (!mountedRef.current || applicabilityOperationTokenRef.current !== token) return;
      const projected = projectApplicabilityTemplate(
        rawTemplate,
        reviewContextLocator,
        display,
        reviewContext.display
      );
      setApplicabilityEditorSeed({
        fileName: projected.receipt.fileName,
        templateContent: projected.content,
        binding: projected.binding,
        locator: reviewContextLocator,
        citations: display.items.map((item) => ({
          citationId: item.citationId,
          title: item.title,
          author: item.author,
          edition: item.edition
        }))
      });
      applicabilityEditorDirtyRef.current = false;
      setApplicabilityEditorSummary({
        dirty: false,
        stale: false,
        total: projected.receipt.citationCount,
        observed: 0
      });
      setApplicabilityObservationState({
        status: "editor_ready",
        receipt: projected.receipt
      });
    } catch {
      if (!mountedRef.current || applicabilityOperationTokenRef.current !== token) return;
      setApplicabilityObservationState({
        status: "failed",
        message: "新的两遍上下文读取、模板契约或最小导出投影未闭合；没有准备文件。"
      });
    } finally {
      if (mountedRef.current && applicabilityOperationTokenRef.current === token) {
        applicabilityRunningRef.current = false;
      }
    }
  };

  const chooseApplicabilityObservationFile = async () => {
    if (
      !reviewContextLocator
      || !display
      || reviewContext?.status !== "bound"
      || reading
      || applicabilityRunningRef.current
    ) return;
    const previousState = applicabilityObservationState;
    const token = applicabilityOperationTokenRef.current + 1;
    applicabilityOperationTokenRef.current = token;
    applicabilityRunningRef.current = true;
    setApplicabilityObservationState({ status: "preflighting" });
    try {
      const file = await pickApplicabilityObservationFile();
      if (!mountedRef.current || applicabilityOperationTokenRef.current !== token) return;
      if (!file) {
        setApplicabilityObservationState(previousState);
        return;
      }
      const rawPreflight = await preflightApplicabilityObservation(
        reviewContextLocator,
        reviewContext.display.digests.contextPayloadSha256,
        file.text
      );
      if (!mountedRef.current || applicabilityOperationTokenRef.current !== token) return;
      const projected = projectApplicabilityPreflight(
        rawPreflight,
        reviewContextLocator,
        display,
        reviewContext.display
      );
      setApplicabilityObservationState({ status: "ready", display: projected });
    } catch {
      if (!mountedRef.current || applicabilityOperationTokenRef.current !== token) return;
      setApplicabilityObservationState({
        status: "failed",
        message: "观察文件未通过当前上下文、固定 citation 覆盖、归属或永久只读边界预检。"
      });
    } finally {
      if (mountedRef.current && applicabilityOperationTokenRef.current === token) {
        applicabilityRunningRef.current = false;
      }
    }
  };

  const status = !releaseIdentityVerified
    ? { label: "发布身份不匹配", tone: "cinnabar" as const }
      : subjectUnavailable
      ? { label: "主题不可识别", tone: "cinnabar" as const }
      : reading
        ? { label: "正在执行两次只读复核", tone: "info" as const }
        : display && reviewContextLocator
          ? reviewContext?.status === "bound"
            ? { label: "最小只读上下文已复现", tone: "info" as const }
            : { label: "主题来源已复现 · 上下文未形成", tone: "warning" as const }
        : display
          ? localStatusLabels[display.status]
          : state.status === "failed"
            ? { label: "来源快照失败关闭", tone: "cinnabar" as const }
            : state.status === "invalidated"
              ? { label: "旧结果已撤下", tone: "warning" as const }
              : { label: "待主动读取", tone: "neutral" as const };
  const applicabilityBusy = applicabilityObservationState.status === "preparing_template"
    || applicabilityObservationState.status === "preflighting";
  const applicabilityStatus = applicabilityObservationState.status === "ready"
    ? { label: "只读预检已闭合", tone: "info" as const }
    : applicabilityObservationState.status === "editor_ready"
      ? { label: "编辑器仅在内存", tone: "warning" as const }
      : applicabilityObservationState.status === "failed"
        ? { label: "观察合同失败关闭", tone: "cinnabar" as const }
        : applicabilityBusy
          ? { label: "正在重读并校验", tone: "info" as const }
          : { label: "尚无人工观察", tone: "neutral" as const };

  return (
    <section
      className="local-source-aware-review"
      aria-labelledby={titleId}
      aria-busy={reading}
      data-state={!releaseIdentityVerified ? "release-unavailable" : subjectUnavailable ? "unavailable" : state.status}
      data-source-status={display?.status ?? "not-read"}
      data-release-identity={releaseIdentityVerified ? CURRENT_RELEASE_ENGINEERING_IDENTITY.dbGeneration : "unverified"}
      data-db-generation={releaseIdentityVerified ? CURRENT_RELEASE_ENGINEERING_IDENTITY.dbGeneration : "unverified"}
      data-target-schema={releaseIdentityVerified ? String(CURRENT_RELEASE_ENGINEERING_IDENTITY.targetSchema) : "unverified"}
      data-migration-id={releaseIdentityVerified ? CURRENT_RELEASE_ENGINEERING_IDENTITY.migrationId ?? "null" : "unverified"}
      data-read-mode="two-read-digest-revalidation"
      data-storage-transaction-mode="readonly"
      data-storage-atomic-snapshot={display ? "verified-at-second-capture" : "not-verified"}
      data-nested-packet-atomic-snapshot="false"
      data-mutation-epoch-revalidated="false"
      data-mutation-epoch-bypassed="false"
      data-record-write-performed="false"
      data-provider-outbound="blocked"
      data-user-data-network-transmission-performed="false"
      data-public-export-authorized="false"
      data-expert-truth-claimed="false"
      data-scientific-validity-claimed="false"
      data-public-release-authorized="false"
      data-semantic-ranking-performed="false"
      data-conflict-resolution-performed="false"
      data-review-context-requested={reviewContextLocator ? "true" : "false"}
      data-review-context-bound={reviewContext?.status === "bound" ? "true" : "false"}
      data-applicability-observation-status={applicabilityObservationState.status}
      data-applicability-comparison-open={comparisonOpen ? "true" : "false"}
      data-applicability-observation-storage-mutation="false"
      data-applicability-observation-identity-verified="false"
      data-applicability-observation-auto-promotion="false"
      data-current-at-return-attested="false"
      data-cross-repository-atomic-snapshot-verified="false"
    >
      <header className="local-source-aware-review__header">
        <div>
          <p className="eyebrow">{reviewContextLocator ? "Locator-bound local review · explicit read" : "Local source packet · evidence subject only"}</p>
          <h2 id={titleId}>{reviewContextLocator ? "本机 Revision 字段来源复核" : "本机主题来源审阅"}</h2>
          <p>{subjectLabel}</p>
        </div>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </header>

      <div className="local-source-aware-review__boundary" role="note">
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong>{reviewContextLocator ? "只有字段上下文与主题来源的三组摘要一致时，才显示最小 Case/Revision 绑定。" : "只审阅这个注册主题的本机来源集合，不绑定当前 Case、Revision 或字段值。"}</strong>
          <p>{reviewContextLocator ? "字段上下文与主题来源分别执行两遍只读复现；React 只保留最小投影。两遍一致不证明返回时仍最新，也不形成 Case/Revision 与知识来源的跨仓原子快照。" : "首次三表只读捕获不会显示；只有新的只读事务以同一摘要完整复现后，第二份最小投影才进入页面。它不执行语义排名、冲突裁定、提示注入筛查、第三方处理或公开导出。"}</p>
        </div>
      </div>

      {!releaseIdentityVerified ? (
        <div className="local-source-aware-review__error" role="alert">
          <TriangleAlert aria-hidden="true" />
          <div><strong>发布身份未通过本组件固定门</strong><p>只有当前页面描述符精确保持 legacy-v13 / targetSchema 13 / migrationId null 时才允许启动本机来源读取。</p></div>
        </div>
      ) : subjectUnavailable ? (
        <div className="local-source-aware-review__error" role="alert">
          <TriangleAlert aria-hidden="true" />
          <div><strong>主题来源审阅保持关闭</strong><p>当前路由没有绑定注册表中的活动证据主题。</p></div>
        </div>
      ) : (
        <div className="local-source-aware-review__action">
          <button
            type="button"
            className="secondary-action"
            onClick={() => void run()}
            disabled={reading || Boolean(applicabilityEditorSummary?.dirty)}
            aria-busy={reading}
          >
            {reading
              ? <LoaderCircle className="spin" aria-hidden="true" />
              : display ? <RefreshCw aria-hidden="true" /> : <BookCheck aria-hidden="true" />}
            {reading ? "正在复核来源集合" : display ? "重新读取并复核" : reviewContextLocator ? "读取来源并复核 Revision 上下文" : "读取并复核本机来源"}
          </button>
          <p>{applicabilityEditorSummary?.dirty
            ? "内存观察草稿已有修改；请先在编辑器中准备恢复文件或确认丢弃，避免重新读取时静默丢稿。"
            : "按需模块可能请求同源静态代码；主题 ID、locator、摘录与结果不作为该请求载荷，也不会写入数据库或 Web Storage。"}</p>
        </div>
      )}

      {state.status === "failed" ? (
        <div className="local-source-aware-review__error" role="alert">
          <TriangleAlert aria-hidden="true" />
          <div><strong>没有保留首次捕获</strong><p>{state.message}</p></div>
        </div>
      ) : null}

      {state.status === "invalidated" ? (
        <div className="local-source-aware-review__candidate-warning" role="status" aria-live="polite" aria-atomic="true">
          <RefreshCw aria-hidden="true" />
          <p>{state.message}</p>
        </div>
      ) : null}

      {applicabilityEditorSeed ? (
        <BaziCitationApplicabilityObservationEditor
          seed={applicabilityEditorSeed}
          stale={
            !reviewContextLocator
            ||
            state.status !== "ready"
            || state.reviewContext.status !== "bound"
            || state.reviewContext.display.digests.contextPayloadSha256 !== applicabilityEditorSeed.binding.contextPayloadSha256
            || reviewContextLocator.caseId !== applicabilityEditorSeed.binding.caseId
            || reviewContextLocator.revisionId !== applicabilityEditorSeed.binding.revisionId
            || reviewContextLocator.evidenceSubjectId !== applicabilityEditorSeed.binding.evidenceSubjectId
            || reviewContextLocator.fieldPath !== applicabilityEditorSeed.binding.fieldPath
          }
          onSummaryChange={handleApplicabilityEditorSummary}
          onDiscard={discardApplicabilityEditor}
        />
      ) : null}

      {display ? (
        <div
          ref={resultRef}
          className="local-source-aware-review__result"
          role="region"
          aria-labelledby={resultTitleId}
          tabIndex={-1}
        >
          <header>
            <div>
              <p className="eyebrow">Digest-reproduced local-review projection</p>
              <h3 id={resultTitleId}>{display.subject.label}</h3>
              <code>{display.subject.subjectId}</code>
            </div>
            <StatusPill tone={localStatusLabels[display.status].tone}>
              {localStatusLabels[display.status].label}
            </StatusPill>
          </header>

          {reviewContext?.status === "unavailable" ? (
            <div className="local-source-aware-review__candidate-warning" role="note">
              <TriangleAlert aria-hidden="true" />
              <p>{reviewContext.message} 这可能来自候选/拒绝记录、核验条数门、两遍变化或严格显示契约未闭合；本页不把原因推断为内容错误。</p>
            </div>
          ) : null}

          {reviewContext?.status === "bound" ? (
            <section className="local-source-aware-review__context" aria-label="Revision 字段最小只读上下文">
              <header>
                <div>
                  <p className="eyebrow">Second-pass minimal projection</p>
                  <h4>Revision 字段最小上下文</h4>
                  <p>{reviewContext.display.subjectLabel}</p>
                </div>
                <StatusPill tone="info">两遍可复现 · 非当前性证明</StatusPill>
              </header>
              <dl className="local-source-aware-review__binding">
                <div><dt>Case / Revision</dt><dd><code>{reviewContext.display.caseId.slice(0, 8)}</code> / <code>{reviewContext.display.revisionId.slice(0, 8)}</code> · #{reviewContext.display.revisionNumber}</dd></div>
                <div><dt>Case 快照位置</dt><dd>{reviewContext.display.selectedRevisionWasLatestInSuppliedCaseSnapshot ? "第二遍所供 Case 快照把它记录为 latestRevisionId" : "第二遍所供 Case 快照未把它记录为 latestRevisionId"}；不证明返回时最新</dd></div>
                <div><dt>字段</dt><dd><code>{reviewContext.display.fieldPath}</code></dd></div>
                <div><dt>Revision 保存值</dt><dd>{typeof reviewContext.display.fieldValue === "string" ? reviewContext.display.fieldValue : reviewContext.display.fieldValue.join("、")}</dd></div>
                <div><dt>Provenance 类型</dt><dd><code>{reviewContext.display.provenance.kind}</code></dd></div>
                <div><dt>本次实际算法</dt><dd><code>{reviewContext.display.provenance.algorithmId}</code></dd></div>
                <div><dt>注册允许算法</dt><dd>{reviewContext.display.provenance.registeredAlgorithmIds.map((algorithmId) => <code key={algorithmId}>{algorithmId}</code>)}</dd></div>
                <div><dt>Provenance 状态字段</dt><dd>{provenanceStatusLabels[reviewContext.display.provenance.verificationStatus]}；不是本页人工核验或专家真值</dd></div>
                <div><dt>冻结规则 profile</dt><dd><code>{reviewContext.display.frozenRuleProfile.profileId}@{reviewContext.display.frozenRuleProfile.profileVersion}</code> · {ruleProfileStatusLabels[reviewContext.display.frozenRuleProfile.profileStatus]}</dd></div>
                <div><dt>冻结换日规则</dt><dd>{reviewContext.display.frozenRuleProfile.dayBoundary ? dayBoundaryLabels[reviewContext.display.frozenRuleProfile.dayBoundary] : "该证据主题未投影换日规则"}</dd></div>
                <div><dt>Revision 规则包</dt><dd>{reviewContext.display.frozenRuleProfile.rulePackBinding ? <><code>{reviewContext.display.frozenRuleProfile.rulePackBinding.packId}</code> · <code>{reviewContext.display.frozenRuleProfile.rulePackBinding.profileId}@{reviewContext.display.frozenRuleProfile.rulePackBinding.profileVersion}</code> · exact</> : "该 Revision 未绑定安装包"}</dd></div>
                <div><dt>Revision 快照摘要</dt><dd><code>{shortDigest(reviewContext.display.digests.revisionSnapshotSha256)}</code></dd></div>
                <div><dt>ReviewContext 摘要</dt><dd><code>{shortDigest(reviewContext.display.digests.contextPayloadSha256)}</code></dd></div>
                <div><dt>显示绑定摘要</dt><dd><code>{shortDigest(reviewContext.display.digests.displayContextPayloadSha256)}</code></dd></div>
                <div><dt>工作集摘要</dt><dd><code>{shortDigest(reviewContext.display.digests.worksetSnapshotSha256)}</code></dd></div>
              </dl>
              <div className="local-source-aware-review__final-boundary" role="note">
                <FileKey2 aria-hidden="true" />
                <p>首次 pass 已丢弃，只返回第二 pass 的最小投影；字段上下文与下方来源三摘要一致。它不是持续订阅，Case/Revision 与知识来源未形成跨仓原子快照；mutation epoch 未复核且未绕过。未完成人工观察、现实身份核验、语义适用性判断、冲突裁定、来源真实性、专家真值、科学有效性或公开发布授权。</p>
              </div>
            </section>
          ) : null}

          {reviewContext?.status === "bound" && reviewContextLocator && !applicabilityEditorSeed ? (
            <section
              className="local-source-aware-review__observation"
              aria-label="字段来源适用性人工观察"
              data-state={applicabilityObservationState.status}
              data-human-observation-authenticity-verified="false"
              data-citation-semantic-applicability-assessed="false"
              data-formal-activation-allowed="false"
              data-automatic-promotion-allowed="false"
              data-storage-mutation-performed="false"
              data-mutation-epoch-bypassed="false"
            >
              <header>
                <div>
                  <p className="eyebrow">Context-bound human observation · local sidecar</p>
                  <h4>记录来源对当前冻结字段是否适用</h4>
                  <p>每条核验 citation 单独记录适用、部分适用、不适用或上下文不足；不选“赢家”，不生成评分，也不写回 Case、Revision、规则包或来源台账。</p>
                </div>
                <StatusPill tone={applicabilityStatus.tone}>{applicabilityStatus.label}</StatusPill>
              </header>
              <div className="local-source-aware-review__observation-actions">
                <button
                  ref={applicabilityEditorOpenButtonRef}
                  type="button"
                  className="secondary-action"
                  disabled={reading || applicabilityBusy || comparisonOpen}
                  aria-busy={applicabilityObservationState.status === "preparing_template"}
                  onClick={() => void prepareApplicabilityTemplate()}
                >
                  {applicabilityObservationState.status === "preparing_template"
                    ? <LoaderCircle className="spin" aria-hidden="true" />
                    : <Download aria-hidden="true" />}
                  {applicabilityObservationState.status === "preparing_template"
                    ? "正在重读上下文"
                    : "打开本机观察编辑器"}
                </button>
                <button
                  type="button"
                  className="secondary-action"
                  disabled={reading || applicabilityBusy || comparisonOpen}
                  aria-busy={applicabilityObservationState.status === "preflighting"}
                  onClick={() => void chooseApplicabilityObservationFile()}
                >
                  {applicabilityObservationState.status === "preflighting"
                    ? <LoaderCircle className="spin" aria-hidden="true" />
                    : <Upload aria-hidden="true" />}
                  {applicabilityObservationState.status === "preflighting"
                    ? "正在只读预检"
                    : "选择观察文件预检"}
                </button>
                <button
                  type="button"
                  className="secondary-action"
                  disabled={reading || applicabilityBusy}
                  aria-expanded={comparisonOpen}
                  onClick={() => setComparisonOpen((current) => !current)}
                >
                  {comparisonOpen ? <RotateCcw aria-hidden="true" /> : <FileKey2 aria-hidden="true" />}
                  {comparisonOpen ? "关闭并清除双份选择" : "打开双份并列复核"}
                </button>
              </div>

              {applicabilityObservationState.status === "failed" ? (
                <div className="local-source-aware-review__error" role="alert">
                  <TriangleAlert aria-hidden="true" />
                  <div><strong>没有采用观察文件</strong><p>{applicabilityObservationState.message}</p></div>
                </div>
              ) : null}

              {applicabilityObservationState.status === "ready" ? (
                <div className="local-source-aware-review__observation-result" role="status">
                  <header>
                    <div>
                      <strong>{applicabilityObservationState.display.allCitationsObserved ? "全部 citation 已填写自述观察" : "观察文件仍有未填写项"}</strong>
                      <p>{applicabilityObservationState.display.reviewerAttributionComplete
                        ? `${applicabilityObservationState.display.reviewer.displayName || "未命名观察者"}（自述记录，现实身份未核验）`
                        : "空白模板或尚未填写观察归属"}</p>
                    </div>
                    <code>{shortDigest(applicabilityObservationState.display.recordSha256)}</code>
                  </header>
                  <dl>
                    <div><dt>全部 / 已填</dt><dd>{applicabilityObservationState.display.counts.total} / {applicabilityObservationState.display.observedCount}</dd></div>
                    <div><dt>适用 / 部分适用</dt><dd>{applicabilityObservationState.display.counts.applicableInBoundContext} / {applicabilityObservationState.display.counts.partiallyApplicableInBoundContext}</dd></div>
                    <div><dt>不适用 / 上下文不足</dt><dd>{applicabilityObservationState.display.counts.notApplicableInBoundContext} / {applicabilityObservationState.display.counts.insufficientBoundContext}</dd></div>
                    <div><dt>未观察</dt><dd>{applicabilityObservationState.display.counts.unobserved}</dd></div>
                  </dl>
                  <p>页面只返回计数、归属标签和记录摘要；理由、条件、反例与补充 URL 不进入 React 显示投影。通过只表示文件与当前上下文结构闭合，不证明人工行为、现实身份、术数真值或科学有效性。</p>
                </div>
              ) : null}

              {comparisonOpen && comparisonInput ? (
                <Suspense
                  fallback={(
                    <div className="local-source-aware-review__observation-note" role="status">
                      <LoaderCircle className="spin" aria-hidden="true" />
                      <p>正在加载本机双份并列复核器；尚未读取观察文件。</p>
                    </div>
                  )}
                >
                  <LazyBaziCitationApplicabilityObservationComparison
                    key={reviewContext.display.digests.contextPayloadSha256}
                    binding={comparisonInput.binding}
                    citations={comparisonInput.citations}
                  />
                </Suspense>
              ) : null}

              <div className="local-source-aware-review__final-boundary" role="note">
                <ShieldCheck aria-hidden="true" />
                <p>每次准备或预检都会重新执行两遍 Case/Revision/来源工作集读取，并要求此前显示的 ReviewContext 摘要精确复现。任何 Revision、规则、引用集合或摘要漂移都会失败关闭；mutation epoch 未复核且未绕过，storage write、自动晋级、正式激活和公开发布始终为 false。</p>
              </div>
            </section>
          ) : null}

          <div className="local-source-aware-review__counts" role="group" aria-label="主题来源状态计数">
            <div><span>全部绑定</span><strong>{display.counts.matching}</strong></div>
            <div><span>引用已复核</span><strong>{display.counts.verified}</strong></div>
            <div><span>用户候选</span><strong>{display.counts.candidate}</strong></div>
            <div><span>已拒绝</span><strong>{display.counts.rejected}</strong></div>
          </div>

          {display.status === "ready_for_local_review_with_unreviewed_sources" ? (
            <div className="local-source-aware-review__candidate-warning" role="note">
              <TriangleAlert aria-hidden="true" />
              <p>仍有 {display.counts.candidate} 条候选引用未复核。下列核验摘录不会掩盖、替代或自动拒绝这些候选来源。</p>
            </div>
          ) : null}

          {display.status === "blocked_no_verified_citations" ? (
            <div className="local-source-aware-review__empty">
              <FileKey2 aria-hidden="true" />
              <div><strong>当前没有可显示的核验摘录</strong><p>候选与拒绝记录只进入计数和摘要绑定；页面不会展示它们的正文，也不会把零条核验引用解释成“没有来源”或“内容错误”。</p></div>
            </div>
          ) : null}

          {display.items.length ? (
            <div className="local-source-aware-review__items" aria-label="本机核验来源摘录">
              {visibleItems.map((item) => (
                <article
                  key={item.citationId}
                  data-source-classification={item.evidenceClassification}
                  data-distribution-policy={item.rights.distributionPolicy}
                  data-redistribution-engineering-gate={item.rights.redistributionEngineeringGatePassed ? "closed" : "blocked"}
                >
                  <header>
                    <div>
                      <small>核验摘录 {item.order}/{display.items.length}</small>
                      <h4>{item.title}</h4>
                      <p>{[item.author, item.edition].filter(Boolean).join(" · ") || "作者与版本未登记"}</p>
                    </div>
                    <StatusPill tone={item.rights.redistributionEngineeringGatePassed ? "info" : "warning"}>
                      {item.rights.redistributionEngineeringGatePassed ? "工程再分发门闭合" : "仅本机审阅"}
                    </StatusPill>
                  </header>
                  <blockquote dir="auto">{item.quotePreview}</blockquote>
                  {item.quoteTruncated ? (
                    <p className="local-source-aware-review__truncation">这里只显示前 {MAX_QUOTE_PREVIEW_CHARACTERS} 个字符的纯文本预览；打开本机引用记录核对完整摘录。</p>
                  ) : null}
                  <dl>
                    <div><dt>引用定位</dt><dd>{item.sectionId} · 第 {item.startLine}{item.endLine === item.startLine ? "" : `–${item.endLine}`} 行</dd></div>
                    <div><dt>引用复核</dt><dd>{item.citationReviewerCount} 个不同记录身份 · 不证明现实身份</dd></div>
                    <div><dt>权利总状态</dt><dd>{rightsStatusLabels[item.rights.status]}</dd></div>
                    <div><dt>作品 / 版本</dt><dd>{workStatusLabels[item.rights.workStatus]} · {editionStatusLabels[item.rights.editionStatus]}</dd></div>
                    <div><dt>权利记录复核</dt><dd>{reviewStatusLabels[item.rights.reviewStatus]} · {item.rights.reviewStatus === "double_reviewed" ? "至少两个不同 reviewerId 记录" : "只表示当前存储状态"}；不核实现实身份 · {item.rights.rightsEvidenceCount} 条登记链接计数</dd></div>
                    <div><dt>用途边界</dt><dd>{item.rights.redistributionEngineeringGatePassed ? "当前工程再分发必要字段已闭合；仍不授权 Provider、网络、公开发布或内容真值" : item.rights.distributionPolicy === "redistributable" ? "记录虽声明 redistributable，但完整工程门未闭合；仍只限本机审阅" : "仅在本机查看；不得公开导出或外发"}</dd></div>
                  </dl>
                  {item.knowledgeRecordRouteSafe ? (
                    <AppLink className="text-link" href={`/knowledge${buildKnowledgeSearch({
                      documentId: item.documentId,
                      sectionId: item.sectionId,
                      lineNumber: item.startLine,
                      citationId: item.citationId,
                      target: { kind: "evidence_subject", subjectId: display.subject.subjectId },
                      ...(reviewContextLocator ? { reviewContextLocator } : {})
                    })}`}>打开本机引用记录</AppLink>
                  ) : (
                    <p className="local-source-aware-review__truncation" role="note">记录 ID 含大小写精确键；当前路由会正规化 UUID，因此本页不生成可能指向错误记录的深链。请从资料库列表按原键定位。</p>
                  )}
                </article>
              ))}
            </div>
          ) : null}

          {visibleItems.length < display.items.length ? (
            <div className="local-source-aware-review__more" role="status">
              <span>已显示 {visibleItems.length} / {display.items.length} 条；所有核验来源均保留，未按内容或权利状态排名。</span>
              <button
                type="button"
                className="text-button"
                onClick={() => setVisibleItemLimit((current) => current + VISIBLE_ITEM_STEP)}
              >再显示 {Math.min(VISIBLE_ITEM_STEP, display.items.length - visibleItems.length)} 条</button>
            </div>
          ) : null}

          <dl className="local-source-aware-review__binding" aria-label="主题来源快照绑定">
            <div><dt>主题注册表</dt><dd>{display.subject.registryVersion}</dd></div>
            <div><dt>字段范围</dt><dd>{display.subject.fieldPaths.join("、")}</dd></div>
            <div><dt>来源集合</dt><dd>{display.sourceMultiplicity === "multiple_preserved_without_resolution" ? "多来源全部保留 · 未裁定" : display.sourceMultiplicity === "single" ? "单一核验来源" : "无核验来源"}</dd></div>
            <div><dt>Storage 快照</dt><dd><code>{shortDigest(display.digests.storageSnapshotSha256)}</code></dd></div>
            <div><dt>Packet 摘要</dt><dd><code>{shortDigest(display.digests.packetPayloadSha256)}</code></dd></div>
            <div><dt>来源集合摘要</dt><dd><code>{shortDigest(display.digests.matchingSourceSetSha256)}</code></dd></div>
          </dl>

          <div className="local-source-aware-review__final-boundary" role="note">
            <FileKey2 aria-hidden="true" />
            <p>两个连续只读捕获时点摘要一致；第二份捕获的三表只读事务原子边界为 true。嵌套 packet 原子声明：false；mutation epoch 复核：false；mutation epoch 绕过：false。页面恢复可见或本页知识写入开始时会撤下结果，但这仍不是持续订阅。摘要不是签名、来源真实性、内容正确性、专家审定、科学有效性或公开发布授权。</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function LocalSourceAwareReviewPanel({
  subjectId,
  readSnapshot = readCurrentLocalSourceAwareSnapshot,
  reviewContextLocator = null,
  readReviewContext = readCurrentLocalReviewContext,
  prepareApplicabilityObservation = prepareCurrentLocalApplicabilityObservation,
  preflightApplicabilityObservation = preflightCurrentLocalApplicabilityObservation,
  pickApplicabilityObservationFile = pickCurrentLocalApplicabilityObservationFile,
  invalidationToken
}: {
  subjectId: string;
  readSnapshot?: ReadLocalSourceAwareSnapshot;
  reviewContextLocator?: KnowledgeReviewContextLocator | null;
  readReviewContext?: ReadLocalReviewContext;
  prepareApplicabilityObservation?: PrepareLocalApplicabilityObservation;
  preflightApplicabilityObservation?: PreflightLocalApplicabilityObservation;
  pickApplicabilityObservationFile?: PickLocalApplicabilityObservationFile;
  invalidationToken?: string | number;
}) {
  return (
    <LocalSourceAwareReviewPanelInner
      subjectId={subjectId}
      readSnapshot={readSnapshot}
      reviewContextLocator={reviewContextLocator}
      readReviewContext={readReviewContext}
      prepareApplicabilityObservation={prepareApplicabilityObservation}
      preflightApplicabilityObservation={preflightApplicabilityObservation}
      pickApplicabilityObservationFile={pickApplicabilityObservationFile}
      invalidationToken={invalidationToken}
    />
  );
}
