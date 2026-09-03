import { forwardRef, useEffect, useId, useRef, useState } from "react";
import {
  SINGLE_CHART_REPORT_PRESENTATION_CONTRACT,
  hasSingleChartReportAggregateTextCapacity,
  singleChartResearchReportSchema,
  type SingleChartResearchReport as SingleChartResearchReportModel
} from "@hakimi/research-export";
import {
  evidenceSubjectIdForBaziStrengthBinding,
  isSingleChartReportEvidenceSubjectId
} from "@hakimi/knowledge-core";
import "./single-chart-report.css";

const REPORT_PILLAR_ORDER = ["year", "month", "day", "hour"] as const;
const REPORT_PILLAR_PROVENANCE_FIELDS = [
  "ganZhi",
  "hiddenStems",
  "stemTenGod",
  "branchTenGods",
  "wuXing",
  "nayin",
  "twelveGrowth",
  "xun",
  "voidBranches"
] as const;
const REQUIRED_REPORT_PROVENANCE_FIELDS = REPORT_PILLAR_ORDER.flatMap((pillar) =>
  REPORT_PILLAR_PROVENANCE_FIELDS.map((field) => `pillars.${pillar}.${field}`)
);
const REQUIRED_REPORT_PROVENANCE_FIELD_SET = new Set(REQUIRED_REPORT_PROVENANCE_FIELDS);
const REPORT_PROVENANCE_KINDS = new Set(["calendar_fact", "rule_derived", "interpretive_claim", "ai_expression"]);
const REPORT_PROVENANCE_VERIFICATION_STATUSES = new Set(["gold_verified", "adjudicated", "disputed", "experimental"]);
const REPORT_CITATION_STATUSES = new Set(["verified", "user_candidate", "rejected"]);
const REPORT_CITATION_ORIGINS = new Set(["user_import", "bundled"]);
const REPORT_LOCAL_CITATION_REFERENCE_PATTERN = /^C[1-9]\d*$/;
const REPORT_LOCAL_DOCUMENT_REFERENCE_PATTERN = /^D[1-9]\d*$/;
const REPORT_CITATION_RIGHTS_STATUSES = new Set([
  "user_unverified",
  "public_domain_verified",
  "licensed_verified",
  "project_original_verified",
  "blocked"
]);
const REPORT_CITATION_WORK_STATUSES = new Set([
  "unknown",
  "public_domain_verified",
  "copyrighted",
  "project_original_verified"
]);
const REPORT_CITATION_EDITION_STATUSES = new Set([
  "unknown",
  "public_domain_verified",
  "licensed_verified",
  "project_original_verified",
  "copyrighted"
]);
const REPORT_CITATION_DISTRIBUTION_POLICIES = new Set(["local_private_only", "redistributable"]);
const REPORT_CITATION_REVIEW_STATUSES = new Set(["unreviewed", "single_reviewed", "double_reviewed"]);
const REPORT_DOWNSTREAM_SOURCES = new Set(["stored_receipt", "explicit_projection", "not_evaluable"]);
const REPORT_COMPARISON_STATUSES = new Set(["matched", "mismatch", "exact_executor_unavailable", "not_applicable"]);
const REPORT_LEDGER_STATUSES = new Set(["available", "schema_unavailable"]);
const REPORT_COMPONENT_STATUSES = new Set(["projected", "unavailable", "not_requested", "not_evaluable"]);
const REPORT_INTERPRETATION_STATUSES = new Set(["available", "withheld"]);
const REPORT_INTERPRETATION_KINDS = [
  "scope",
  "factor_ledger",
  "month_main_duplication",
  "subtotal",
  "classification",
  "sensitivity",
  "boundary"
] as const;
const REPORT_INTERPRETATION_KIND_SET = new Set<string>(REPORT_INTERPRETATION_KINDS);
const REPORT_INTERPRETATION_CLASSIFICATIONS = new Set([
  "supported",
  "inferred",
  "unsupported",
  "contradicted",
  "advisory",
  "blocked"
]);
const REPORT_INTERPRETATION_DISPLAY_STATUSES = new Set([
  "visible_with_evidence",
  "visible_with_caveat",
  "withheld"
]);
const REPORT_INTERPRETATION_LOCATOR_COVERAGE = new Set(["verified", "incomplete", "not_applicable"]);
const REPORT_INTERPRETATION_EVIDENCE_ROLES = new Set([
  "defines_engineering_candidate",
  "traditional_context_only",
  "review_question_only"
]);
const REPORT_INTERPRETATION_LOCATOR_KINDS = new Set(["stable_symbol", "chapter_heading", "anchor_phrase"]);
const REPORT_INTERPRETATION_LOCATOR_STATUSES = new Set(["verified", "pending_manual_textual_verification"]);
const REPORT_INTERPRETATION_SOURCE_TYPES = new Set([
  "engineering_contract",
  "public_domain_classic_transcription",
  "review_gate_locator"
]);
const REPORT_INTERPRETATION_SOURCE_REGISTRY_STATUSES = new Set([
  "repository_policy_verified",
  "locator_verified_in_pinned_revision",
  "source_warning_unresolved",
  "locator_only_unfrozen"
]);
const REPORT_INTERPRETATION_LOCATOR_VERIFICATION_SCOPES = new Set([
  "repository_symbol_registration_only",
  "pinned_carrier_heading_only",
  "pending_manual_textual_verification"
]);
const REPORT_INTERPRETATION_WORK_RIGHTS_STATUSES = new Set([
  "internal_project_source",
  "historical_work_public_domain_candidate",
  "historical_and_commentary_layers_require_separate_audit"
]);
const REPORT_INTERPRETATION_CARRIER_RIGHTS_STATUSES = new Set([
  "local_repository_only",
  "community_transcription_reuse_requires_site_license_audit",
  "incomplete_transcription_source_warning",
  "link_and_locator_only_no_redistribution_clearance"
]);
const REPORT_INTERPRETATION_PARAMETER_SUPPORT = new Set([
  "exact_engineering_definition",
  "context_only",
  "boundary_only"
]);
const REPORT_INTERPRETATION_SCOPE = "strength_engineering_candidate_only";
const REPORT_INTERPRETATION_DST_REASON = "dst_unresolved";
const REPORT_INTERPRETATION_KEYS = [
  "status",
  "reason",
  "scope",
  "includeHour",
  "envelopeProfileVersion",
  "envelopeContentVersion",
  "sourceRegistry",
  "payloadSha256",
  "assertionFamilies",
  "sources",
  "sourceBindings",
  "statements",
  "coverage",
  "admissionSummary",
  "boundary"
] as const;
const REPORT_INTERPRETATION_STATEMENT_KEYS = [
  "statementId",
  "order",
  "kind",
  "text",
  "classification",
  "displayStatus",
  "factIds",
  "ruleIds",
  "sourceBindingIds",
  "registryLocatorVerifiedBindingIds",
  "stabilityAssessmentIds",
  "missingEvidence",
  "conflictIds",
  "rationale",
  "sourceLocatorCoverage",
  "exactCanonicalRendererMatch"
] as const;
const REPORT_INTERPRETATION_FAMILY_KEYS = ["kind", "total", "displayable", "withheld"] as const;
const REPORT_INTERPRETATION_COVERAGE_KEYS = [
  "statementsTotal",
  "displayable",
  "withheld",
  "assertionFamilies",
  "referencedSourceBindings",
  "registryLocatorVerifiedBindings",
  "referencedSources",
  "pinnedRevisionSources",
  "sourceTextsIncluded"
] as const;
const REPORT_INTERPRETATION_SOURCE_REGISTRY_KEYS = [
  "profileVersion",
  "contentVersion",
  "registrySha256"
] as const;
const REPORT_INTERPRETATION_SOURCE_KEYS = [
  "sourceId",
  "order",
  "sourceType",
  "title",
  "editionOrCarrier",
  "url",
  "stableRevision",
  "registryVerificationStatus",
  "workRightsStatus",
  "carrierRightsStatus",
  "usageBoundary",
  "sourceRightsRecordStatus",
  "expertTruthClaimed",
  "scientificValidityClaimed"
] as const;
const REPORT_INTERPRETATION_BINDING_KEYS = [
  "bindingId",
  "evidenceSubjectId",
  "order",
  "sourceId",
  "sourceType",
  "evidenceRole",
  "locator",
  "parameterSupport",
  "supports",
  "doesNotSupport",
  "mechanicalAdmission"
] as const;
const REPORT_INTERPRETATION_MECHANICAL_ADMISSION_KEYS = [
  "sourceIdentityStatus",
  "citationReviewState",
  "redistributionState",
  "candidateCitationReferences",
  "verifiedCitationReferences",
  "rejectedCitationReferences",
  "redistributableVerifiedCitationReferences"
] as const;
const REPORT_INTERPRETATION_CITATION_REVIEW_STATES = new Set([
  "no_citation",
  "rejected_only",
  "candidate_only",
  "verified_present"
]);
const REPORT_INTERPRETATION_REDISTRIBUTION_STATES = new Set([
  "not_applicable_no_verified",
  "no_verified_source_redistributable",
  "some_verified_sources_redistributable",
  "all_verified_sources_redistributable"
]);
const REPORT_INTERPRETATION_ADMISSION_REDACTED_KEYS = [
  "visibility",
  "sourceTextCopiedIntoAdmissionLedger"
] as const;
const REPORT_INTERPRETATION_ADMISSION_FULL_KEYS = [
  "visibility",
  "evaluationStatus",
  "bindingsTotal",
  "bindingsWithNonRejectedCitation",
  "bindingsWithVerifiedCitation",
  "bindingsWithRedistributableVerifiedCitation",
  "citationRecords",
  "knowledgeDocumentsBound",
  "sourceRightsRecordsBound",
  "sourceTextCopiedIntoAdmissionLedger",
  "structuredCitationCoverage",
  "distributionRightsState"
] as const;
const REPORT_INTERPRETATION_ADMISSION_CITATION_RECORD_KEYS = [
  "matching",
  "structured",
  "candidate",
  "verified",
  "rejected"
] as const;
const REPORT_INTERPRETATION_STRUCTURED_CITATION_COVERAGE = new Set(["none", "partial", "complete"]);
const REPORT_INTERPRETATION_DISTRIBUTION_RIGHTS_STATES = new Set([
  "no_matching_source_text",
  "contains_nonredistributable_source_text",
  "all_matching_source_text_redistributable"
]);
const REPORT_INTERPRETATION_ADMISSION_EVALUATION_STATUSES = new Set([
  "evaluated",
  "not_evaluated_interpretation_withheld"
]);
const REPORT_INTERPRETATION_LOCATOR_KEYS = [
  "kind",
  "value",
  "registryVerificationStatus",
  "verificationScope",
  "contentSha256"
] as const;
const REPORT_INTERPRETATION_BOUNDARY_KEYS = [
  "referenceResolutionEstablishesSemanticTruth",
  "expertTruthClaimed",
  "scientificValidityClaimed",
  "formalActivationAllowed",
  "publicReleaseAuthorized",
  "authenticityClaimed",
  "sourceTextIncluded",
  "locatorReviewEstablishesExactQuote",
  "locatorVerificationEstablishesContentIdentity",
  "sourceRegistrationEstablishesDistributionRights",
  "citationTargetEstablishesSourceIdentity",
  "admissionLedgerCopiesSourceText",
  "citationReviewEstablishesSemanticTruth",
  "rightsReviewEstablishesSemanticTruth",
  "reviewerIdentityVerified",
  "reviewerIndependenceVerified",
  "overallGoodBad",
  "result"
] as const;
const EVENT_DERIVATION_AUTHORIZATION = "explicit_local_user_confirmation";
const ANONYMIZED_PROVENANCE_NOTE = "（匿名模式已移除）";
const ANONYMIZED_PROVENANCE_PLACEHOLDER_PATTERN = /^字段 \d+（非标准路径已移除）$/u;
const UNSAFE_REPORT_TEXT_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/u;
const MAX_REPORT_IDENTIFIER_CHARACTERS = SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.limits.identifierCharacters;
const MAX_REPORT_LABEL_CHARACTERS = SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.limits.labelCharacters;
const MAX_REPORT_BODY_CHARACTERS = SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.limits.bodyCharacters;
const MAX_REPORT_ROWS_PER_GROUP = SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.limits.rowsPerGroup;
const MAX_REPORT_NESTED_ENTRIES = SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.limits.nestedEntries;
const MAX_REPORT_REVIEWER_COUNT = SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.limits.reviewerCount;
const REPORT_REQUIRED_CITATION_SOURCE_FIELDS = [
  "rightsStatus",
  "workStatus",
  "editionStatus",
  "distributionPolicy",
  "reviewStatus"
] as const;
const REPORT_OPTIONAL_CITATION_SOURCE_FIELDS = [
  "author",
  "edition",
  "publisher",
  "publicationYear",
  "sourceUrl"
] as const;
const REPORT_CITATION_KEYS = [
  "reference",
  "status",
  "statusLabel",
  "targets",
  "evidenceSubjectIds",
  "quote",
  "annotation",
  "decisionNote",
  "reviewerCount",
  "locator",
  "source"
] as const;
const REPORT_CITATION_SOURCE_KEYS = [
  "documentReference",
  "title",
  "author",
  "edition",
  "contentHash",
  "sourceUrl",
  "publisher",
  "publicationYear",
  "origin",
  "rightsStatus",
  "workStatus",
  "editionStatus",
  "distributionPolicy",
  "reviewStatus",
  "redistributableSourceRights"
] as const;
const REPORT_COLLECTION_LIMITS = SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.limits.collections;
const REPORT_BUILDER_INPUT_LIMITS = SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.limits.builderInputCollections;

function isReportRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const UNSAFE_REPORT_OBJECT_ISSUE = "报告包含不可安全读取的隐藏属性、访问器或非 JSON 对象";
const MAX_PASSIVE_REPORT_PROPERTIES_PER_OBJECT = 1_024;
const MAX_PASSIVE_REPORT_KEY_CODE_UNITS = 256;
const MAX_PASSIVE_REPORT_ARRAY_LENGTH = Math.max(
  MAX_REPORT_ROWS_PER_GROUP,
  MAX_REPORT_NESTED_ENTRIES,
  ...Object.values(REPORT_COLLECTION_LIMITS)
);
// This whole-report ceiling deliberately covers every public collection at its
// contract maximum, including nested research rows, event derivations, citation
// targets, and interpretation arrays. Keep it derived from the shared limits so
// the Web snapshot cannot reject an otherwise valid package report.
const MAX_PASSIVE_REPORT_OBJECTS = 2_048
  + REPORT_COLLECTION_LIMITS.provenance * 2
  + REPORT_COLLECTION_LIMITS.researchEntries * (3 + MAX_REPORT_NESTED_ENTRIES)
  + REPORT_COLLECTION_LIMITS.eventTimeDerivations * (3 + 2 * MAX_REPORT_NESTED_ENTRIES)
  + REPORT_COLLECTION_LIMITS.citations * 3
  + REPORT_COLLECTION_LIMITS.interpretationStatements * 8
  + REPORT_COLLECTION_LIMITS.interpretationSources
  + REPORT_COLLECTION_LIMITS.interpretationSourceBindings * 3;
const MAX_PASSIVE_REPORT_PROPERTIES = MAX_PASSIVE_REPORT_OBJECTS * 16;
const MAX_PASSIVE_REPORT_TOTAL_KEY_CODE_UNITS = MAX_PASSIVE_REPORT_PROPERTIES * 32;

type PassiveJsonSnapshotResult =
  | { success: true; value: unknown }
  | { success: false };

type PassiveJsonObjectInspection = {
  descriptors: Record<string, PropertyDescriptor>;
  target: Record<string, unknown> | unknown[];
};

function isOwnDataPropertyDescriptor(
  descriptor: PropertyDescriptor | undefined
): descriptor is PropertyDescriptor & { value: unknown } {
  return Boolean(descriptor)
    && Object.prototype.hasOwnProperty.call(descriptor, "value");
}

function createPassiveJsonDataSnapshot(value: unknown): PassiveJsonSnapshotResult {
  if (!value || typeof value !== "object") return { success: true, value };

  let inspectedObjects = 0;
  let inspectedProperties = 0;
  let inspectedKeyCodeUnits = 0;
  const seen = new WeakMap<object, Record<string, unknown> | unknown[]>();
  const pending: PassiveJsonObjectInspection[] = [];

  const inspectObject = (source: object): PassiveJsonObjectInspection | null => {
    inspectedObjects += 1;
    if (inspectedObjects > MAX_PASSIVE_REPORT_OBJECTS) return null;

    let isArray: boolean;
    let prototype: object | null;
    let ownKeys: Array<string | symbol>;
    let lengthDescriptor: PropertyDescriptor | undefined;
    try {
      isArray = Array.isArray(source);
      prototype = Object.getPrototypeOf(source) as object | null;
      lengthDescriptor = isArray
        ? Object.getOwnPropertyDescriptor(source, "length")
        : undefined;
    } catch {
      return null;
    }

    if ((isArray && prototype !== Array.prototype)
      || (!isArray && prototype !== Object.prototype && prototype !== null)) {
      return null;
    }
    if (isArray && (!isOwnDataPropertyDescriptor(lengthDescriptor)
      || lengthDescriptor.enumerable
      || !Number.isSafeInteger(lengthDescriptor.value)
      || lengthDescriptor.value < 0
      || lengthDescriptor.value > MAX_PASSIVE_REPORT_ARRAY_LENGTH)) {
      return null;
    }
    try {
      ownKeys = Reflect.ownKeys(source);
    } catch {
      return null;
    }
    if (ownKeys.length > MAX_PASSIVE_REPORT_PROPERTIES_PER_OBJECT
      || inspectedProperties + ownKeys.length > MAX_PASSIVE_REPORT_PROPERTIES) {
      return null;
    }
    inspectedProperties += ownKeys.length;
    for (const key of ownKeys) {
      if (typeof key !== "string"
        || key.length > MAX_PASSIVE_REPORT_KEY_CODE_UNITS
        || inspectedKeyCodeUnits + key.length > MAX_PASSIVE_REPORT_TOTAL_KEY_CODE_UNITS) {
        return null;
      }
      inspectedKeyCodeUnits += key.length;
    }

    const descriptors = Object.create(null) as Record<string, PropertyDescriptor>;
    try {
      for (const key of ownKeys as string[]) {
        const descriptor = isArray && key === "length"
          ? lengthDescriptor
          : Object.getOwnPropertyDescriptor(source, key);
        if (!descriptor) return null;
        Object.defineProperty(descriptors, key, {
          configurable: true,
          enumerable: true,
          value: descriptor,
          writable: true
        });
      }
    } catch {
      return null;
    }

    let target: Record<string, unknown> | unknown[];
    if (isArray) {
      target = new Array(lengthDescriptor!.value as number);
    } else {
      target = Object.create(null) as Record<string, unknown>;
    }

    let indexedProperties = 0;
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (isArray && key === "length") continue;
      if (!isOwnDataPropertyDescriptor(descriptor) || !descriptor.enumerable) return null;
      if (isArray) {
        const index = Number(key);
        if (!/^(0|[1-9]\d*)$/.test(key)
          || !Number.isSafeInteger(index)
          || index < 0
          || index >= (target as unknown[]).length) {
          return null;
        }
        indexedProperties += 1;
      }
    }
    if (isArray && indexedProperties !== (target as unknown[]).length) return null;

    return { descriptors, target };
  };

  const root = inspectObject(value);
  if (!root) return { success: false };
  seen.set(value, root.target);
  pending.push(root);

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) continue;
    const isArray = Array.isArray(current.target);
    for (const [key, descriptor] of Object.entries(current.descriptors)) {
      if (isArray && key === "length") continue;
      if (!isOwnDataPropertyDescriptor(descriptor)) return { success: false };
      let snapshotValue = descriptor.value;
      if (snapshotValue && typeof snapshotValue === "object") {
        const sourceObject = snapshotValue as object;
        const existing = seen.get(sourceObject);
        if (existing) {
          snapshotValue = existing;
        } else {
          const inspected = inspectObject(sourceObject);
          if (!inspected) return { success: false };
          seen.set(sourceObject, inspected.target);
          pending.push(inspected);
          snapshotValue = inspected.target;
        }
      }
      Object.defineProperty(current.target, key, {
        configurable: true,
        enumerable: true,
        value: snapshotValue,
        writable: true
      });
    }
  }

  return { success: true, value: root.target };
}

function readReportText(value: unknown, key: string): string {
  if (!isReportRecord(value)) return "";
  const field = value[key];
  return typeof field === "string" ? field.trim() : "";
}

function hasAtMostReportCodePoints(value: string, maximumCharacters: number): boolean {
  let characterCount = 0;

  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    const nextCodeUnit = value.charCodeAt(index + 1);
    if (
      codeUnit >= 0xd800
      && codeUnit <= 0xdbff
      && nextCodeUnit >= 0xdc00
      && nextCodeUnit <= 0xdfff
    ) {
      index += 1;
    }
    characterCount += 1;
    if (characterCount > maximumCharacters) return false;
  }

  return true;
}

function isSafeReportText(value: unknown, maximumCharacters: number, requireContent = true): value is string {
  if (typeof value !== "string"
    || value.length > maximumCharacters * 2
    || !hasAtMostReportCodePoints(value, maximumCharacters)
    || UNSAFE_REPORT_TEXT_PATTERN.test(value)) return false;
  return !requireContent || value.trim().length > 0;
}

function isSafeReportTextList(
  value: unknown,
  maximumEntries: number = MAX_REPORT_NESTED_ENTRIES,
  maximumCharacters: number = MAX_REPORT_BODY_CHARACTERS
): value is string[] {
  return Array.isArray(value)
    && value.length <= maximumEntries
    && value.every((item) => isSafeReportText(item, maximumCharacters));
}

function isSafeOptionalReportText(value: unknown, maximumCharacters: number): boolean {
  return value === null
    || value === undefined
    || isSafeReportText(value, maximumCharacters, false);
}

function isCanonicalReportDigest(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function isSafeReportSourceUrl(value: unknown): value is string {
  if (!isSafeReportText(value, MAX_REPORT_BODY_CHARACTERS)) return false;
  if (value.startsWith("/packages/")) {
    return !value.includes("\\")
      && !value.includes("//")
      && !value.includes("?")
      && !value.includes("#");
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:"
      && parsed.username.length === 0
      && parsed.password.length === 0;
  } catch {
    return false;
  }
}

function safeReportSourceHref(value: string): string | null {
  if (!isSafeReportSourceUrl(value) || value.startsWith("/packages/")) return null;
  try {
    return new URL(value).href;
  } catch {
    return null;
  }
}

function hasConsecutiveReportOrders(
  values: readonly unknown[],
  maximum: number
): boolean {
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!isReportRecord(value)
      || !isSafeReportCount(value.order, maximum)
      || value.order !== index + 1) {
      return false;
    }
  }
  return true;
}

function hasExactReportKeys(value: unknown, expectedKeys: readonly string[]): value is Record<string, unknown> {
  if (!isReportRecord(value)) return false;
  const keys = Object.keys(value);
  return keys.length === expectedKeys.length
    && expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function isDenseReportArray(value: unknown, maximumEntries: number): value is unknown[] {
  if (!Array.isArray(value) || value.length > maximumEntries) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index)) return false;
  }
  return true;
}

function isSafeReportCount(value: unknown, maximum: number): value is number {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && value >= 0
    && value <= maximum;
}

function isUniqueSafeReportIdentifierList(value: unknown): value is string[] {
  return isSafeReportTextList(value, MAX_REPORT_NESTED_ENTRIES, MAX_REPORT_IDENTIFIER_CHARACTERS)
    && new Set(value).size === value.length;
}

function isUniqueSafeReportBodyList(value: unknown): value is string[] {
  return isSafeReportTextList(value, MAX_REPORT_NESTED_ENTRIES, MAX_REPORT_BODY_CHARACTERS)
    && new Set(value).size === value.length;
}

function isUniqueLocalCitationReferenceList(value: unknown): value is string[] {
  return isDenseReportArray(value, REPORT_COLLECTION_LIMITS.citations)
    && value.every((reference) => (
      isSafeReportText(reference, MAX_REPORT_IDENTIFIER_CHARACTERS)
      && REPORT_LOCAL_CITATION_REFERENCE_PATTERN.test(reference)
    ))
    && new Set(value).size === value.length;
}

function hasExactStringSequence(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length
    && left.every((value, index) => value === right[index]);
}

function compareReportText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function citationSourceIsMechanicallyRedistributable(source: Record<string, unknown>): boolean {
  return source.origin === "bundled"
    && (source.rightsStatus === "public_domain_verified"
      || source.rightsStatus === "licensed_verified"
      || source.rightsStatus === "project_original_verified")
    && source.distributionPolicy === "redistributable"
    && source.reviewStatus === "double_reviewed"
    && (source.workStatus === "public_domain_verified"
      || source.workStatus === "project_original_verified")
    && (source.editionStatus === "public_domain_verified"
      || source.editionStatus === "licensed_verified"
      || source.editionStatus === "project_original_verified");
}

function hasReportValue(value: unknown, key: string): boolean {
  if (!isReportRecord(value)) return false;
  const field = value[key];
  if (typeof field === "string") return Boolean(field.trim());
  return field !== null && field !== undefined;
}

function hasExactReportEnum(value: unknown, key: string, allowedValues: ReadonlySet<string>): boolean {
  return isReportRecord(value)
    && typeof value[key] === "string"
    && allowedValues.has(value[key]);
}

function referenceBindingIssue(label: string, entries: unknown[]): string | null {
  if (entries.length > MAX_REPORT_ROWS_PER_GROUP) return `${label}超过 ${MAX_REPORT_ROWS_PER_GROUP} 条安全展示上限`;
  const references = entries.map((entry) => readReportText(entry, "reference"));
  if (references.some((reference) => !isSafeReportText(reference, MAX_REPORT_IDENTIFIER_CHARACTERS))) return `${label}存在空白、超长或不可安全显示的引用键`;
  if (new Set(references).size !== references.length) return `${label}存在重复引用键`;
  return null;
}

function calculationSourceBindingIssue(value: unknown, anonymized: boolean): string | null {
  if (!isReportRecord(value)) return "下游计算来源不是可核对的对象";

  for (const field of ["notice", "profileId", "downstreamSource", "receiptLedgerStatus", "comparisonStatus"] as const) {
    if (!isSafeReportText(readReportText(value, field), MAX_REPORT_LABEL_CHARACTERS)) return `下游计算来源缺少或无法安全显示字段：${field}`;
  }

  const downstreamSource = readReportText(value, "downstreamSource");
  const comparisonStatus = readReportText(value, "comparisonStatus");
  const receiptLedgerStatus = readReportText(value, "receiptLedgerStatus");
  if (!REPORT_DOWNSTREAM_SOURCES.has(downstreamSource)) return "下游计算来源包含未识别的来源类型";
  if (!REPORT_COMPARISON_STATUSES.has(comparisonStatus)) return "下游计算来源包含未识别的复演状态";
  if (!REPORT_LEDGER_STATUSES.has(receiptLedgerStatus)) return "下游计算来源包含未识别的收据账本状态";
  if (typeof value.storedHistoricalOutputCompared !== "boolean") return "下游计算来源缺少历史输出比对布尔值";

  const comparisonEstablishesHistoricalComparison = comparisonStatus === "matched" || comparisonStatus === "mismatch";
  const sourceClaimsStoredReceipt = downstreamSource === "stored_receipt";
  const ledgerCanSupplyReceipts = receiptLedgerStatus === "available";
  if (
    (receiptLedgerStatus === "schema_unavailable" && (
      sourceClaimsStoredReceipt
      || comparisonEstablishesHistoricalComparison
      || value.storedHistoricalOutputCompared
    ))
    || (sourceClaimsStoredReceipt && !ledgerCanSupplyReceipts)
    || (comparisonEstablishesHistoricalComparison && (
      !sourceClaimsStoredReceipt
      || !ledgerCanSupplyReceipts
      || !value.storedHistoricalOutputCompared
    ))
    || (comparisonStatus === "exact_executor_unavailable" && (
      !sourceClaimsStoredReceipt
      || !ledgerCanSupplyReceipts
      || value.storedHistoricalOutputCompared
    ))
    || (comparisonStatus === "not_applicable" && sourceClaimsStoredReceipt)
    || (!sourceClaimsStoredReceipt && comparisonStatus !== "not_applicable")
    || (value.storedHistoricalOutputCompared && !comparisonEstablishesHistoricalComparison)
  ) {
    return "下游计算来源的账本、来源、复演与历史比对状态组合不一致";
  }

  const components = value.components;
  if (!Array.isArray(components) || components.length === 0) return "下游计算来源未提供组件状态";
  if (components.length > REPORT_COLLECTION_LIMITS.components) return "下游计算组件超过当前安全展示上限";
  const componentKeys = components.map((component) => readReportText(component, "key"));
  if (componentKeys.some((key) => !isSafeReportText(key, MAX_REPORT_IDENTIFIER_CHARACTERS))) return "下游计算组件存在空白、超长或不可安全显示的键";
  if (new Set(componentKeys).size !== componentKeys.length) return "下游计算组件存在重复键";
  if (components.some((component) => !isSafeReportText(readReportText(component, "label"), MAX_REPORT_LABEL_CHARACTERS))) return "下游计算组件存在空白、超长或不可安全显示的标签";
  if (components.some((component) => !REPORT_COMPONENT_STATUSES.has(readReportText(component, "status")))) {
    return "下游计算组件包含未识别状态";
  }
  if (components.some((component) => {
    if (!isReportRecord(component)) return true;
    return (component.executorId !== null && component.executorId !== undefined
      && !isSafeReportText(component.executorId, MAX_REPORT_IDENTIFIER_CHARACTERS))
      || (component.resultDigest !== null && component.resultDigest !== undefined
        && !isSafeReportText(component.resultDigest, MAX_REPORT_IDENTIFIER_CHARACTERS));
  })) {
    return "下游计算组件包含不可安全显示的执行器或结果摘要";
  }

  if (anonymized) {
    const privateSummaryFields = ["receiptReference", "requestFingerprint", "receiptDigest", "projectionDigest", "capturedAt"] as const;
    if (privateSummaryFields.some((field) => hasReportValue(value, field))) {
      return "匿名报告仍携带下游收据、指纹、摘要或保存时间";
    }
    if (components.some((component) => hasReportValue(component, "resultDigest"))) {
      return "匿名报告仍携带下游组件结果摘要";
    }
  }

  return null;
}

function interpretationEvidenceBindingIssue(
  value: unknown,
  anonymized: boolean,
  citations: readonly Record<string, unknown>[]
): string | null {
  if (!hasExactReportKeys(value, REPORT_INTERPRETATION_KEYS)) {
    return "旺衰叙事证据不是当前可核对的严格对象";
  }

  if (!hasExactReportEnum(value, "status", REPORT_INTERPRETATION_STATUSES)) {
    return "旺衰叙事证据包含未识别状态";
  }
  const status = value.status;
  const reason = value.reason;
  if ((status === "available" && reason !== null)
    || (status === "withheld" && reason !== REPORT_INTERPRETATION_DST_REASON)) {
    return "旺衰叙事证据状态与阻断原因不一致";
  }
  if (value.scope !== REPORT_INTERPRETATION_SCOPE || typeof value.includeHour !== "boolean") {
    return "旺衰叙事证据缺少固定范围或时柱范围标记";
  }
  if (!isSafeReportText(value.envelopeProfileVersion, MAX_REPORT_IDENTIFIER_CHARACTERS)
    || !isSafeReportText(value.envelopeContentVersion, MAX_REPORT_IDENTIFIER_CHARACTERS)) {
    return "旺衰叙事证据缺少可安全显示的 Envelope 版本";
  }
  if (!hasExactReportKeys(value.sourceRegistry, REPORT_INTERPRETATION_SOURCE_REGISTRY_KEYS)
    || !isSafeReportText(value.sourceRegistry.profileVersion, MAX_REPORT_IDENTIFIER_CHARACTERS)
    || !isSafeReportText(value.sourceRegistry.contentVersion, MAX_REPORT_IDENTIFIER_CHARACTERS)
    || value.sourceRegistry.registrySha256 !== null) {
    return "旺衰叙事证据缺少严格的来源注册表版本或错误声明了注册表摘要";
  }
  if (value.payloadSha256 !== null && !isCanonicalReportDigest(value.payloadSha256)) {
    return "旺衰叙事证据包含无效 Envelope 摘要";
  }
  if ((status === "withheld" || anonymized) && value.payloadSha256 !== null) {
    return "匿名或阻断报告仍携带旺衰 Envelope 摘要";
  }
  if (status === "available" && !anonymized && !isCanonicalReportDigest(value.payloadSha256)) {
    return "完整报告缺少规范旺衰 Envelope 摘要";
  }

  const statementsLimit = REPORT_COLLECTION_LIMITS.interpretationStatements;
  const bindingsLimit = REPORT_COLLECTION_LIMITS.interpretationSourceBindings;
  const sourcesLimit = REPORT_COLLECTION_LIMITS.interpretationSources;
  const familiesLimit = REPORT_COLLECTION_LIMITS.interpretationAssertionFamilies;
  if (!isDenseReportArray(value.statements, statementsLimit)
    || !isDenseReportArray(value.sources, sourcesLimit)
    || !isDenseReportArray(value.sourceBindings, bindingsLimit)
    || !isDenseReportArray(value.assertionFamilies, familiesLimit)) {
    return "旺衰叙事证据列表缺失、稀疏或超过安全展示上限";
  }

  const statementIds = value.statements.map((statement) => readReportText(statement, "statementId"));
  if (statementIds.some((id) => !isSafeReportText(id, MAX_REPORT_IDENTIFIER_CHARACTERS))
    || new Set(statementIds).size !== statementIds.length) {
    return "旺衰叙事证据存在空白、超长或重复的 statementId";
  }
  for (let index = 0; index < value.statements.length; index += 1) {
    const statement = value.statements[index];
    if (!hasExactReportKeys(statement, REPORT_INTERPRETATION_STATEMENT_KEYS)) {
      return "旺衰叙事证据包含非当前严格结构的句子";
    }
    if (statement.order !== index + 1) return "旺衰叙事证据句子顺序必须从 1 连续递增";
    if (!hasExactReportEnum(statement, "kind", REPORT_INTERPRETATION_KIND_SET)) {
      return "旺衰叙事证据句子包含未识别家族";
    }
    if (!hasExactReportEnum(statement, "classification", REPORT_INTERPRETATION_CLASSIFICATIONS)
      || !hasExactReportEnum(statement, "displayStatus", REPORT_INTERPRETATION_DISPLAY_STATUSES)) {
      return "旺衰叙事证据句子包含未识别分类或展示状态";
    }
    if (!hasExactReportEnum(statement, "sourceLocatorCoverage", REPORT_INTERPRETATION_LOCATOR_COVERAGE)) {
      return "旺衰叙事证据句子包含未识别来源定位覆盖状态";
    }
    if (statement.exactCanonicalRendererMatch !== true) {
      return "旺衰叙事证据句子未通过规范渲染器精确匹配";
    }
    const displayStatus = statement.displayStatus;
    if (displayStatus === "withheld") {
      if (statement.text !== null) return "withheld 旺衰叙事句子仍携带正文";
    } else if (!isSafeReportText(statement.text, MAX_REPORT_BODY_CHARACTERS)) {
      return "可展示旺衰叙事句子缺少安全正文";
    }
    if (!isSafeReportText(statement.rationale, MAX_REPORT_BODY_CHARACTERS, false)
      || !isUniqueSafeReportIdentifierList(statement.factIds)
      || !isUniqueSafeReportIdentifierList(statement.ruleIds)
      || !isUniqueSafeReportIdentifierList(statement.sourceBindingIds)
      || !isUniqueSafeReportIdentifierList(statement.registryLocatorVerifiedBindingIds)
      || !isUniqueSafeReportIdentifierList(statement.stabilityAssessmentIds)
      || !isUniqueSafeReportBodyList(statement.missingEvidence)
      || !isUniqueSafeReportIdentifierList(statement.conflictIds)) {
      return "旺衰叙事证据句子包含超量、重复或不可安全显示的证据引用";
    }
    const sourceBindingIds = new Set(statement.sourceBindingIds);
    const registryLocatorVerifiedBindingIds = new Set(statement.registryLocatorVerifiedBindingIds);
    if ([...registryLocatorVerifiedBindingIds].some((id) => !sourceBindingIds.has(id))) {
      return "旺衰叙事证据句子的注册表 locator 已核引用不是来源绑定子集";
    }
    if ((statement.sourceBindingIds.length === 0 && (
      statement.registryLocatorVerifiedBindingIds.length !== 0
      || statement.sourceLocatorCoverage !== "not_applicable"
    )) || (statement.sourceBindingIds.length > 0 && (
      statement.sourceLocatorCoverage === "not_applicable"
      || (statement.sourceLocatorCoverage === "verified"
        && registryLocatorVerifiedBindingIds.size !== sourceBindingIds.size)
      || (statement.sourceLocatorCoverage === "incomplete"
        && registryLocatorVerifiedBindingIds.size >= sourceBindingIds.size)
    ))) {
      return "旺衰叙事证据句子的来源定位覆盖与注册表 locator 已核账不一致";
    }
  }

  const familyKinds = value.assertionFamilies.map((family) => (
    isReportRecord(family) && typeof family.kind === "string" ? family.kind : ""
  ));
  if (status === "available") {
    if (familyKinds.length !== REPORT_INTERPRETATION_KINDS.length
      || familyKinds.some((kind, index) => kind !== REPORT_INTERPRETATION_KINDS[index])) {
      return "旺衰叙事证据断言家族必须按固定七类顺序完整提供";
    }
  } else if (familyKinds.length !== 0) {
    return "DST 阻断的旺衰叙事证据仍携带断言家族统计";
  }
  for (const family of value.assertionFamilies) {
    if (!hasExactReportKeys(family, REPORT_INTERPRETATION_FAMILY_KEYS)) {
      return "旺衰叙事证据断言家族不是当前严格结构";
    }
    if (!isSafeReportCount(family.total, statementsLimit)
      || !isSafeReportCount(family.displayable, statementsLimit)
      || !isSafeReportCount(family.withheld, statementsLimit)
      || family.total !== family.displayable + family.withheld) {
      return "旺衰叙事证据断言家族统计不一致";
    }
    const matchingStatements = value.statements.filter((statement) => (
      isReportRecord(statement) && statement.kind === family.kind
    ));
    const matchingWithheld = matchingStatements.filter((statement) => (
      isReportRecord(statement) && statement.displayStatus === "withheld"
    )).length;
    if (family.total !== matchingStatements.length
      || family.withheld !== matchingWithheld
      || family.displayable !== matchingStatements.length - matchingWithheld) {
      return "旺衰叙事证据断言家族摘要与逐句账不一致";
    }
  }

  if (!hasExactReportKeys(value.coverage, REPORT_INTERPRETATION_COVERAGE_KEYS)) {
    return "旺衰叙事证据覆盖摘要不是当前严格结构";
  }
  const coverage = value.coverage;
  const coverageStatementsTotal = coverage.statementsTotal;
  const coverageDisplayable = coverage.displayable;
  const coverageWithheld = coverage.withheld;
  const coverageReferencedSourceBindings = coverage.referencedSourceBindings;
  const coverageRegistryLocatorVerifiedBindings = coverage.registryLocatorVerifiedBindings;
  const coverageReferencedSources = coverage.referencedSources;
  const coveragePinnedRevisionSources = coverage.pinnedRevisionSources;
  if (!isSafeReportCount(coverageStatementsTotal, statementsLimit)
    || !isSafeReportCount(coverageDisplayable, statementsLimit)
    || !isSafeReportCount(coverageWithheld, statementsLimit)
    || !isSafeReportCount(coverageReferencedSourceBindings, bindingsLimit)
    || !isSafeReportCount(coverageRegistryLocatorVerifiedBindings, bindingsLimit)
    || !isSafeReportCount(coverageReferencedSources, sourcesLimit)
    || !isSafeReportCount(coveragePinnedRevisionSources, sourcesLimit)) {
    return "旺衰叙事证据覆盖摘要包含无效计数";
  }
  if (!isSafeReportCount(coverage.assertionFamilies, familiesLimit)
    || coverage.sourceTextsIncluded !== 0) {
    return "旺衰叙事证据覆盖摘要错误复制了来源正文";
  }
  const displayable = value.statements.filter((statement) => (
    isReportRecord(statement) && statement.displayStatus !== "withheld"
  )).length;
  if (coverageStatementsTotal !== value.statements.length
    || coverageDisplayable !== displayable
    || coverageWithheld !== value.statements.length - displayable
    || coverage.assertionFamilies !== value.assertionFamilies.filter((family) => (
      isReportRecord(family) && typeof family.total === "number" && family.total > 0
    )).length
    || coverageStatementsTotal !== coverageDisplayable + coverageWithheld
    || coverageRegistryLocatorVerifiedBindings > coverageReferencedSourceBindings
    || coverageReferencedSources > coverageReferencedSourceBindings
    || coveragePinnedRevisionSources > coverageReferencedSources) {
    return "旺衰叙事证据覆盖摘要与逐句账不一致";
  }

  const admissionSummary = value.admissionSummary;
  if (anonymized) {
    if (!hasExactReportKeys(admissionSummary, REPORT_INTERPRETATION_ADMISSION_REDACTED_KEYS)
      || admissionSummary.visibility !== "redacted"
      || admissionSummary.sourceTextCopiedIntoAdmissionLedger !== false) {
      return "匿名报告的旺衰机械准入摘要必须保持固定脱敏边界";
    }
  } else {
    if (!hasExactReportKeys(admissionSummary, REPORT_INTERPRETATION_ADMISSION_FULL_KEYS)
      || admissionSummary.visibility !== "full"
      || !hasExactReportEnum(
        admissionSummary,
        "evaluationStatus",
        REPORT_INTERPRETATION_ADMISSION_EVALUATION_STATUSES
      )
      || !hasExactReportKeys(
        admissionSummary.citationRecords,
        REPORT_INTERPRETATION_ADMISSION_CITATION_RECORD_KEYS
      )
      || admissionSummary.sourceTextCopiedIntoAdmissionLedger !== false
      || !hasExactReportEnum(
        admissionSummary,
        "structuredCitationCoverage",
        REPORT_INTERPRETATION_STRUCTURED_CITATION_COVERAGE
      )
      || !hasExactReportEnum(
        admissionSummary,
        "distributionRightsState",
        REPORT_INTERPRETATION_DISTRIBUTION_RIGHTS_STATES
      )) {
      return "完整报告的旺衰机械准入摘要不是当前严格结构";
    }
    const admissionCitationRecords = admissionSummary.citationRecords;
    if (!isSafeReportCount(admissionSummary.bindingsTotal, bindingsLimit)
      || !isSafeReportCount(admissionSummary.bindingsWithNonRejectedCitation, bindingsLimit)
      || !isSafeReportCount(admissionSummary.bindingsWithVerifiedCitation, bindingsLimit)
      || !isSafeReportCount(admissionSummary.bindingsWithRedistributableVerifiedCitation, bindingsLimit)
      || !isSafeReportCount(admissionCitationRecords.matching, REPORT_BUILDER_INPUT_LIMITS.citations)
      || !isSafeReportCount(admissionCitationRecords.structured, REPORT_BUILDER_INPUT_LIMITS.citations)
      || !isSafeReportCount(admissionCitationRecords.candidate, REPORT_BUILDER_INPUT_LIMITS.citations)
      || !isSafeReportCount(admissionCitationRecords.verified, REPORT_BUILDER_INPUT_LIMITS.citations)
      || !isSafeReportCount(admissionCitationRecords.rejected, REPORT_BUILDER_INPUT_LIMITS.citations)
      || !isSafeReportCount(
        admissionSummary.knowledgeDocumentsBound,
        REPORT_BUILDER_INPUT_LIMITS.knowledgeDocuments
      )
      || !isSafeReportCount(
        admissionSummary.sourceRightsRecordsBound,
        REPORT_BUILDER_INPUT_LIMITS.sourceRights
      )) {
      return "完整报告的旺衰机械准入摘要包含无效计数";
    }
  }

  const sourceIds = value.sources.map((source) => readReportText(source, "sourceId"));
  if (sourceIds.some((id) => !isSafeReportText(id, MAX_REPORT_IDENTIFIER_CHARACTERS))
    || new Set(sourceIds).size !== sourceIds.length
    || !hasConsecutiveReportOrders(value.sources, sourcesLimit)) {
    return "旺衰叙事来源资格账存在空白、重复或非连续来源顺序";
  }
  for (const source of value.sources) {
    if (!hasExactReportKeys(source, REPORT_INTERPRETATION_SOURCE_KEYS)
      || !hasExactReportEnum(source, "sourceType", REPORT_INTERPRETATION_SOURCE_TYPES)
      || !isSafeReportText(source.title, MAX_REPORT_BODY_CHARACTERS)
      || !isSafeReportText(source.editionOrCarrier, MAX_REPORT_BODY_CHARACTERS)
      || !isSafeReportSourceUrl(source.url)
      || (source.stableRevision !== null
        && !isSafeReportText(source.stableRevision, MAX_REPORT_IDENTIFIER_CHARACTERS))
      || !hasExactReportEnum(
        source,
        "registryVerificationStatus",
        REPORT_INTERPRETATION_SOURCE_REGISTRY_STATUSES
      )
      || !hasExactReportEnum(source, "workRightsStatus", REPORT_INTERPRETATION_WORK_RIGHTS_STATUSES)
      || !hasExactReportEnum(source, "carrierRightsStatus", REPORT_INTERPRETATION_CARRIER_RIGHTS_STATUSES)
      || !isSafeReportText(source.usageBoundary, MAX_REPORT_BODY_CHARACTERS)
      || source.sourceRightsRecordStatus !== "binding_scoped"
      || source.expertTruthClaimed !== false
      || source.scientificValidityClaimed !== false) {
      return "旺衰叙事来源资格账包含不可核对的版本、注册状态、权利线索或真值声明";
    }
    if (source.sourceType === "engineering_contract") {
      if (!source.url.startsWith("/packages/")
        || source.stableRevision === null
        || source.registryVerificationStatus !== "repository_policy_verified"
        || source.workRightsStatus !== "internal_project_source"
        || source.carrierRightsStatus !== "local_repository_only") {
        return "旺衰叙事工程来源未保持仓内路径、固定版本或内部权利线索边界";
      }
    } else if (source.sourceType === "public_domain_classic_transcription") {
      let pinnedOldId: string | null = null;
      try {
        pinnedOldId = new URL(source.url).searchParams.get("oldid");
      } catch {
        return "旺衰叙事传统转录来源没有可核对的 HTTPS 固定载体";
      }
      const expectedCarrierStatus = source.registryVerificationStatus === "source_warning_unresolved"
        ? "incomplete_transcription_source_warning"
        : "community_transcription_reuse_requires_site_license_audit";
      if (source.stableRevision === null
        || pinnedOldId !== source.stableRevision
        || !["locator_verified_in_pinned_revision", "source_warning_unresolved"]
          .includes(readReportText(source, "registryVerificationStatus"))
        || source.workRightsStatus !== "historical_work_public_domain_candidate"
        || source.carrierRightsStatus !== expectedCarrierStatus) {
        return "旺衰叙事传统转录来源未保持固定 oldid、来源警告或分层权利线索边界";
      }
    } else if (source.stableRevision !== null
      || source.registryVerificationStatus !== "locator_only_unfrozen"
      || source.workRightsStatus !== "historical_and_commentary_layers_require_separate_audit"
      || source.carrierRightsStatus !== "link_and_locator_only_no_redistribution_clearance") {
      return "旺衰叙事复核来源错误冻结了载体或晋升了作品与分发权利线索";
    }
  }

  const bindingIds = value.sourceBindings.map((binding) => readReportText(binding, "bindingId"));
  const bindingEvidenceSubjectIds = value.sourceBindings.map((binding) => (
    readReportText(binding, "evidenceSubjectId")
  ));
  if (bindingIds.some((id) => !isSafeReportText(id, MAX_REPORT_IDENTIFIER_CHARACTERS))
    || new Set(bindingIds).size !== bindingIds.length
    || bindingEvidenceSubjectIds.some((subjectId) => (
      !isSafeReportText(subjectId, MAX_REPORT_IDENTIFIER_CHARACTERS)
      || !isSingleChartReportEvidenceSubjectId(subjectId)
    ))
    || new Set(bindingEvidenceSubjectIds).size !== bindingEvidenceSubjectIds.length
    || !hasConsecutiveReportOrders(value.sourceBindings, bindingsLimit)) {
    return "旺衰叙事来源绑定存在空白、重复、未知 evidence subject 或非连续 binding 顺序";
  }
  for (const binding of value.sourceBindings) {
    if (!hasExactReportKeys(binding, REPORT_INTERPRETATION_BINDING_KEYS)
      || evidenceSubjectIdForBaziStrengthBinding(readReportText(binding, "bindingId"))
        !== readReportText(binding, "evidenceSubjectId")
      || !isSafeReportText(binding.sourceId, MAX_REPORT_IDENTIFIER_CHARACTERS)
      || !hasExactReportEnum(binding, "sourceType", REPORT_INTERPRETATION_SOURCE_TYPES)
      || !hasExactReportEnum(binding, "evidenceRole", REPORT_INTERPRETATION_EVIDENCE_ROLES)
      || !hasExactReportEnum(binding, "parameterSupport", REPORT_INTERPRETATION_PARAMETER_SUPPORT)
      || !hasExactReportKeys(binding.locator, REPORT_INTERPRETATION_LOCATOR_KEYS)
      || !hasExactReportEnum(binding.locator, "kind", REPORT_INTERPRETATION_LOCATOR_KINDS)
      || !isSafeReportText(binding.locator.value, MAX_REPORT_BODY_CHARACTERS)
      || !hasExactReportEnum(
        binding.locator,
        "registryVerificationStatus",
        REPORT_INTERPRETATION_LOCATOR_STATUSES
      )
      || !hasExactReportEnum(
        binding.locator,
        "verificationScope",
        REPORT_INTERPRETATION_LOCATOR_VERIFICATION_SCOPES
      )
      || binding.locator.contentSha256 !== null
      || !isSafeReportText(binding.supports, MAX_REPORT_BODY_CHARACTERS)
      || !isUniqueSafeReportBodyList(binding.doesNotSupport)
      || binding.doesNotSupport.length === 0) {
      return "旺衰叙事来源绑定包含不可核对的来源、定位、正文身份或反向边界";
    }
    const mechanicalAdmission = binding.mechanicalAdmission;
    if (!hasExactReportKeys(
      mechanicalAdmission,
      REPORT_INTERPRETATION_MECHANICAL_ADMISSION_KEYS
    )
      || mechanicalAdmission.sourceIdentityStatus !== "not_assessed"
      || !hasExactReportEnum(
        mechanicalAdmission,
        "citationReviewState",
        REPORT_INTERPRETATION_CITATION_REVIEW_STATES
      )
      || !hasExactReportEnum(
        mechanicalAdmission,
        "redistributionState",
        REPORT_INTERPRETATION_REDISTRIBUTION_STATES
      )
      || !isUniqueLocalCitationReferenceList(mechanicalAdmission.candidateCitationReferences)
      || !isUniqueLocalCitationReferenceList(mechanicalAdmission.verifiedCitationReferences)
      || !isUniqueLocalCitationReferenceList(mechanicalAdmission.rejectedCitationReferences)
      || !isUniqueLocalCitationReferenceList(
        mechanicalAdmission.redistributableVerifiedCitationReferences
      )) {
      return "旺衰叙事 binding 的机械准入不是当前严格 C# 分区结构";
    }
    const partitionedReferences = [
      ...mechanicalAdmission.candidateCitationReferences,
      ...mechanicalAdmission.verifiedCitationReferences,
      ...mechanicalAdmission.rejectedCitationReferences
    ];
    const verifiedReferences = new Set(mechanicalAdmission.verifiedCitationReferences);
    const expectedCitationReviewState = mechanicalAdmission.verifiedCitationReferences.length > 0
      ? "verified_present"
      : mechanicalAdmission.candidateCitationReferences.length > 0
        ? "candidate_only"
        : mechanicalAdmission.rejectedCitationReferences.length > 0
          ? "rejected_only"
          : "no_citation";
    const expectedRedistributionState = mechanicalAdmission.verifiedCitationReferences.length === 0
      ? "not_applicable_no_verified"
      : mechanicalAdmission.redistributableVerifiedCitationReferences.length === 0
        ? "no_verified_source_redistributable"
        : mechanicalAdmission.redistributableVerifiedCitationReferences.length
            === mechanicalAdmission.verifiedCitationReferences.length
          ? "all_verified_sources_redistributable"
          : "some_verified_sources_redistributable";
    if (new Set(partitionedReferences).size !== partitionedReferences.length
      || mechanicalAdmission.redistributableVerifiedCitationReferences.some((reference) => (
        !verifiedReferences.has(reference)
      ))
      || mechanicalAdmission.citationReviewState !== expectedCitationReviewState
      || mechanicalAdmission.redistributionState !== expectedRedistributionState) {
      return "旺衰叙事 binding 的 Citation 分区、复核状态或再分发状态未机械闭合";
    }
    const locatorVerified = binding.locator.registryVerificationStatus === "verified";
    const expectedScope = !locatorVerified
      ? "pending_manual_textual_verification"
      : binding.sourceType === "engineering_contract"
        ? "repository_symbol_registration_only"
        : "pinned_carrier_heading_only";
    if (binding.locator.verificationScope !== expectedScope) {
      return "旺衰叙事来源绑定的注册表 locator 状态与核验范围不一致";
    }
  }
  const sourceById = new Map(value.sources.map((source) => [
    readReportText(source, "sourceId"),
    source
  ] as const));
  const sourceBindingById = new Map(value.sourceBindings.map((binding) => [
    readReportText(binding, "bindingId"),
    binding
  ] as const));
  if (anonymized && (value.sources.length !== 0 || value.sourceBindings.length !== 0)) {
    return "匿名报告仍携带旺衰来源资格或 binding 明细";
  }
  if (status === "available") {
    const bindingIdSet = new Set(bindingIds);
    const referencedIds = new Set<string>();
    const registryVerifiedReferencedIds = new Set<string>();
    for (const statement of value.statements) {
      if (!isReportRecord(statement) || !Array.isArray(statement.sourceBindingIds)) continue;
      for (const id of statement.sourceBindingIds) {
        referencedIds.add(id as string);
      }
      if (Array.isArray(statement.registryLocatorVerifiedBindingIds)) {
        for (const id of statement.registryLocatorVerifiedBindingIds) {
          registryVerifiedReferencedIds.add(id as string);
        }
      }
    }
    const fullRegistryVerifiedIds = value.sourceBindings.filter((binding) => (
        isReportRecord(binding)
        && isReportRecord(binding.locator)
        && binding.locator.registryVerificationStatus === "verified"
        && referencedIds.has(readReportText(binding, "bindingId"))
      )).map((binding) => readReportText(binding, "bindingId"));
    if (coverage.referencedSourceBindings !== referencedIds.size
      || coverage.registryLocatorVerifiedBindings !== (
        anonymized ? registryVerifiedReferencedIds.size : fullRegistryVerifiedIds.length
      )) {
      return "旺衰来源覆盖摘要未闭合到逐句注册表 locator 引用";
    }
    if (!anonymized && (
      [...referencedIds].some((id) => !bindingIdSet.has(id))
      || bindingIds.length !== referencedIds.size
      || bindingIds.some((id) => !referencedIds.has(id))
    )) {
      return "完整报告的旺衰来源绑定未闭合到逐句引用";
    }
    if (!anonymized && value.statements.some((statement) => {
      if (!isReportRecord(statement)
        || !Array.isArray(statement.sourceBindingIds)
        || !Array.isArray(statement.registryLocatorVerifiedBindingIds)) return true;
      const sourceBindingIds = statement.sourceBindingIds;
      const registryLocatorVerifiedBindingIds = statement.registryLocatorVerifiedBindingIds;
      const expectedRegistryVerifiedIds = sourceBindingIds.filter((id) => {
        const binding = sourceBindingById.get(id);
        return isReportRecord(binding)
          && isReportRecord(binding.locator)
          && binding.locator.registryVerificationStatus === "verified";
      });
      return expectedRegistryVerifiedIds.length !== registryLocatorVerifiedBindingIds.length
        || expectedRegistryVerifiedIds.some((id, index) => registryLocatorVerifiedBindingIds[index] !== id);
    })) {
      return "完整报告的逐句注册表 locator 已核账与来源绑定状态不一致";
    }
    if (!anonymized) {
      const referencedSourceIds = new Set<string>();
      for (const binding of value.sourceBindings) {
        if (!isReportRecord(binding)) return "完整报告包含不可联结的来源 binding";
        const source = sourceById.get(readReportText(binding, "sourceId"));
        if (!isReportRecord(source)
          || readReportText(source, "sourceType") !== readReportText(binding, "sourceType")) {
          return "完整报告的来源 binding 未闭合到唯一且同类型的来源资格记录";
        }
        if (isReportRecord(binding.locator)
          && binding.locator.registryVerificationStatus === "verified"
          && !["repository_policy_verified", "locator_verified_in_pinned_revision"]
            .includes(readReportText(source, "registryVerificationStatus"))) {
          return "完整报告把未冻结或有警告的来源提升成注册表 locator 已核";
        }
        referencedSourceIds.add(readReportText(binding, "sourceId"));
      }
      if (sourceIds.length !== referencedSourceIds.size
        || sourceIds.some((id) => !referencedSourceIds.has(id))
        || coverage.referencedSources !== referencedSourceIds.size
        || coverage.pinnedRevisionSources !== value.sources.filter((source) => (
          isReportRecord(source) && source.stableRevision !== null
        )).length) {
        return "完整报告的唯一来源资格账、版本计数与 binding 引用未闭合";
      }
    }
  }

  if (!anonymized && status === "available") {
    const fullAdmissionSummary = admissionSummary as Record<string, unknown>;
    if (fullAdmissionSummary.evaluationStatus !== "evaluated") {
      return "available 旺衰叙事的完整机械准入摘要必须标记为已评估";
    }
    for (const binding of value.sourceBindings) {
      if (!isReportRecord(binding) || !isReportRecord(binding.mechanicalAdmission)) {
        return "完整报告包含不可联结的机械准入 binding";
      }
      const bindingSubjectId = readReportText(binding, "evidenceSubjectId");
      const matchingCitations = citations.filter((citation) => (
        Array.isArray(citation.targets)
        && citation.targets.some((target) => (
          typeof target === "string" && target.startsWith("命盘字段 ")
        ))
        && Array.isArray(citation.evidenceSubjectIds)
        && citation.evidenceSubjectIds.includes(bindingSubjectId)
      ));
      const referencesForStatus = (citationStatus: string) => matchingCitations
        .filter((citation) => citation.status === citationStatus)
        .map((citation) => readReportText(citation, "reference"));
      const candidateCitationReferences = referencesForStatus("user_candidate");
      const verifiedCitationReferences = referencesForStatus("verified");
      const rejectedCitationReferences = referencesForStatus("rejected");
      const redistributableVerifiedCitationReferences = matchingCitations
        .filter((citation) => (
          citation.status === "verified"
          && isReportRecord(citation.source)
          && citation.source.redistributableSourceRights === true
        ))
        .map((citation) => readReportText(citation, "reference"));
      const admission = binding.mechanicalAdmission;
      const expectedCitationReviewState = verifiedCitationReferences.length > 0
        ? "verified_present"
        : candidateCitationReferences.length > 0
          ? "candidate_only"
          : rejectedCitationReferences.length > 0
            ? "rejected_only"
            : "no_citation";
      const expectedRedistributionState = verifiedCitationReferences.length === 0
        ? "not_applicable_no_verified"
        : redistributableVerifiedCitationReferences.length === 0
          ? "no_verified_source_redistributable"
          : redistributableVerifiedCitationReferences.length === verifiedCitationReferences.length
            ? "all_verified_sources_redistributable"
            : "some_verified_sources_redistributable";
      if (admission.sourceIdentityStatus !== "not_assessed"
        || admission.citationReviewState !== expectedCitationReviewState
        || admission.redistributionState !== expectedRedistributionState
        || !Array.isArray(admission.candidateCitationReferences)
        || !hasExactStringSequence(
          admission.candidateCitationReferences as string[],
          candidateCitationReferences
        )
        || !Array.isArray(admission.verifiedCitationReferences)
        || !hasExactStringSequence(
          admission.verifiedCitationReferences as string[],
          verifiedCitationReferences
        )
        || !Array.isArray(admission.rejectedCitationReferences)
        || !hasExactStringSequence(
          admission.rejectedCitationReferences as string[],
          rejectedCitationReferences
        )
        || !Array.isArray(admission.redistributableVerifiedCitationReferences)
        || !hasExactStringSequence(
          admission.redistributableVerifiedCitationReferences as string[],
          redistributableVerifiedCitationReferences
        )) {
        return "旺衰叙事 binding 未与完整报告内 C# Citation、evidence subject、复核及权利投影闭合";
      }
    }

    const bindingSubjects = new Set(bindingEvidenceSubjectIds);
    const matchingCitations = citations.filter((citation) => (
      Array.isArray(citation.targets)
      && citation.targets.some((target) => (
        typeof target === "string" && target.startsWith("命盘字段 ")
      ))
      && Array.isArray(citation.evidenceSubjectIds)
      && citation.evidenceSubjectIds.some((subjectId) => (
        typeof subjectId === "string" && bindingSubjects.has(subjectId)
      ))
    ));
    const bindingsWithNonRejectedCitation = value.sourceBindings.filter((binding) => (
      isReportRecord(binding)
      && isReportRecord(binding.mechanicalAdmission)
      && ((Array.isArray(binding.mechanicalAdmission.candidateCitationReferences)
        && binding.mechanicalAdmission.candidateCitationReferences.length > 0)
        || (Array.isArray(binding.mechanicalAdmission.verifiedCitationReferences)
          && binding.mechanicalAdmission.verifiedCitationReferences.length > 0))
    )).length;
    const bindingsWithVerifiedCitation = value.sourceBindings.filter((binding) => (
      isReportRecord(binding)
      && isReportRecord(binding.mechanicalAdmission)
      && Array.isArray(binding.mechanicalAdmission.verifiedCitationReferences)
      && binding.mechanicalAdmission.verifiedCitationReferences.length > 0
    )).length;
    const bindingsWithRedistributableVerifiedCitation = value.sourceBindings.filter((binding) => (
      isReportRecord(binding)
      && isReportRecord(binding.mechanicalAdmission)
      && Array.isArray(binding.mechanicalAdmission.redistributableVerifiedCitationReferences)
      && binding.mechanicalAdmission.redistributableVerifiedCitationReferences.length > 0
    )).length;
    const expectedStructuredCitationCoverage = bindingsWithNonRejectedCitation === 0
      ? "none"
      : bindingsWithNonRejectedCitation === value.sourceBindings.length
        ? "complete"
        : "partial";
    const expectedDistributionRightsState = matchingCitations.length === 0
      ? "no_matching_source_text"
      : matchingCitations.every((citation) => (
        isReportRecord(citation.source)
        && citation.source.redistributableSourceRights === true
      ))
        ? "all_matching_source_text_redistributable"
        : "contains_nonredistributable_source_text";
    const matchingDocumentReferences = new Set(matchingCitations.map((citation) => (
      isReportRecord(citation.source) ? readReportText(citation.source, "documentReference") : ""
    )));
    const admissionCitationRecords = fullAdmissionSummary.citationRecords;
    if (!isReportRecord(admissionCitationRecords)
      || fullAdmissionSummary.bindingsTotal !== value.sourceBindings.length
      || fullAdmissionSummary.bindingsWithNonRejectedCitation !== bindingsWithNonRejectedCitation
      || fullAdmissionSummary.bindingsWithVerifiedCitation !== bindingsWithVerifiedCitation
      || fullAdmissionSummary.bindingsWithRedistributableVerifiedCitation
        !== bindingsWithRedistributableVerifiedCitation
      || admissionCitationRecords.matching !== matchingCitations.length
      || admissionCitationRecords.structured !== matchingCitations.filter((citation) => (
        citation.status !== "rejected"
      )).length
      || admissionCitationRecords.candidate !== matchingCitations.filter((citation) => (
        citation.status === "user_candidate"
      )).length
      || admissionCitationRecords.verified !== matchingCitations.filter((citation) => (
        citation.status === "verified"
      )).length
      || admissionCitationRecords.rejected !== matchingCitations.filter((citation) => (
        citation.status === "rejected"
      )).length
      || fullAdmissionSummary.knowledgeDocumentsBound !== matchingDocumentReferences.size
      || fullAdmissionSummary.sourceRightsRecordsBound !== matchingDocumentReferences.size
      || fullAdmissionSummary.structuredCitationCoverage !== expectedStructuredCitationCoverage
      || fullAdmissionSummary.distributionRightsState !== expectedDistributionRightsState) {
      return "旺衰叙事机械准入摘要未与 binding ledger 及完整报告 Citation 投影闭合";
    }
  }

  if (!hasExactReportKeys(value.boundary, REPORT_INTERPRETATION_BOUNDARY_KEYS)
    || value.boundary.referenceResolutionEstablishesSemanticTruth !== false
    || value.boundary.expertTruthClaimed !== false
    || value.boundary.scientificValidityClaimed !== false
    || value.boundary.formalActivationAllowed !== false
    || value.boundary.publicReleaseAuthorized !== false
    || value.boundary.authenticityClaimed !== false
    || value.boundary.sourceTextIncluded !== false
    || value.boundary.locatorReviewEstablishesExactQuote !== false
    || value.boundary.locatorVerificationEstablishesContentIdentity !== false
    || value.boundary.sourceRegistrationEstablishesDistributionRights !== false
    || value.boundary.citationTargetEstablishesSourceIdentity !== false
    || value.boundary.admissionLedgerCopiesSourceText !== false
    || value.boundary.citationReviewEstablishesSemanticTruth !== false
    || value.boundary.rightsReviewEstablishesSemanticTruth !== false
    || value.boundary.reviewerIdentityVerified !== false
    || value.boundary.reviewerIndependenceVerified !== false
    || value.boundary.overallGoodBad !== null
    || value.boundary.result !== null) {
    return "旺衰叙事证据边界不得把 Citation target、正文身份、SourceRights 或机械准入升级为专家、科学或发布结论";
  }

  if (status === "withheld" && (
    value.statements.length !== 0
    || value.sources.length !== 0
    || value.sourceBindings.length !== 0
    || value.assertionFamilies.length !== 0
    || Object.values(coverage).some((entry) => typeof entry === "number" && entry !== 0)
  )) {
    return "DST 阻断的旺衰叙事证据仍携带句子、绑定或非零统计";
  }
  if (status === "withheld" && !anonymized) {
    const fullAdmissionSummary = admissionSummary as Record<string, unknown>;
    const admissionCitationRecords = fullAdmissionSummary.citationRecords;
    if (!isReportRecord(admissionCitationRecords)
      || fullAdmissionSummary.bindingsTotal !== 0
      || fullAdmissionSummary.evaluationStatus !== "not_evaluated_interpretation_withheld"
      || fullAdmissionSummary.bindingsWithNonRejectedCitation !== 0
      || fullAdmissionSummary.bindingsWithVerifiedCitation !== 0
      || fullAdmissionSummary.bindingsWithRedistributableVerifiedCitation !== 0
      || Object.values(admissionCitationRecords).some((entry) => entry !== 0)
      || fullAdmissionSummary.knowledgeDocumentsBound !== 0
      || fullAdmissionSummary.sourceRightsRecordsBound !== 0
      || fullAdmissionSummary.structuredCitationCoverage !== "none"
      || fullAdmissionSummary.distributionRightsState !== "no_matching_source_text") {
      return "DST 阻断的完整报告机械准入摘要必须保持未评估零值";
    }
  }

  return null;
}

function findSingleChartReportBindingIssueInSnapshot(report: SingleChartResearchReportModel): string | null {
  if (!hasSingleChartReportAggregateTextCapacity(report)) {
    return `单盘报告 aggregate 文本超过 ${SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.limits.aggregateCodePoints} Unicode code points 安全展示上限`;
  }
  const record = report as unknown as Record<string, unknown>;
  const requiredTextFields = ["formatVersion", "title", "caseReference", "revisionReference"] as const;

  for (const field of requiredTextFields) {
    if (!isSafeReportText(readReportText(record, field), MAX_REPORT_LABEL_CHARACTERS)) return `缺少或无法安全显示必要报告字段：${field}`;
  }
  if (record.formatVersion !== SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.identity.formatVersion) {
    return "报告格式版本不是当前 1.7 合同";
  }
  if (typeof record.anonymized !== "boolean") return "报告缺少明确的匿名模式标记";
  for (const field of ["subtitle", "caseLabel", "revisionLabel", "previewNotice", "privacyWarning"] as const) {
    if (!isSafeReportText(readReportText(record, field), MAX_REPORT_BODY_CHARACTERS)) return `报告缺少或无法安全显示正文：${field}`;
  }

  const rowGroups = [
    ["caseRows", "案例与修订"],
    ["birthRows", "出生输入"],
    ["calibrationRows", "时间校准"],
    ["ruleRows", "规则快照"],
    ["integrityRows", "计算完整性"],
  ] as const;

  for (const [field, label] of rowGroups) {
    const rows = record[field];
    if (!Array.isArray(rows)) return `${label}未提供可核对的行数据`;
    if (rows.length > MAX_REPORT_ROWS_PER_GROUP) return `${label}超过 ${MAX_REPORT_ROWS_PER_GROUP} 行安全展示上限`;
    if (rows.some((row) => !isSafeReportText(readReportText(row, "label"), MAX_REPORT_LABEL_CHARACTERS))) return `${label}存在无法安全显示的标签`;
    if (rows.some((row) => !isReportRecord(row) || !isSafeReportText(row.value, MAX_REPORT_BODY_CHARACTERS, false))) return `${label}存在超长或不可安全显示的值`;
    const labels = rows.map((row) => readReportText(row, "label"));
    if (new Set(labels).size !== labels.length) return `${label}存在重复标签`;
  }

  const pillars = record.pillars;
  if (!Array.isArray(pillars) || pillars.length !== REPORT_PILLAR_ORDER.length) {
    return "四柱数据必须完整包含年、月、日、时四列";
  }
  const pillarKeys = pillars.map((pillar) => readReportText(pillar, "key"));
  if (pillarKeys.some((key, index) => key !== REPORT_PILLAR_ORDER[index])) {
    return "四柱列顺序或键值与报告契约不一致";
  }
  const pillarDisplayFields = ["label", "ganZhi", "stemTenGod", "hiddenStems", "nayin", "xun", "voidBranches", "branchTenGods", "wuXing", "twelveGrowth"] as const;
  if (pillars.some((pillar) => pillarDisplayFields.some((field) => !isSafeReportText(readReportText(pillar, field), MAX_REPORT_LABEL_CHARACTERS)))) {
    return "四柱数据存在空标签或空干支";
  }

  const arrayFields = [
    "provenance",
    "researchNotes",
    "events",
    "eventTimeDerivations",
    "citations",
    "redactions",
  ] as const;
  for (const field of arrayFields) {
    if (!Array.isArray(record[field])) return `${field}不是可核对的列表`;
    if ((record[field] as unknown[]).length > REPORT_COLLECTION_LIMITS[field]) return `${field}超过当前安全展示上限`;
  }

  const provenance = record.provenance as unknown[];
  const provenanceFields = provenance.map((item) => readReportText(item, "field"));
  if (provenanceFields.some((field) => !isSafeReportText(field, MAX_REPORT_LABEL_CHARACTERS))) return "字段来源链存在空白、超长或不可安全显示的字段";
  if (new Set(provenanceFields).size !== provenanceFields.length) return "字段来源链存在重复字段";
  if (provenance.some((item) => !isReportRecord(item)
    || !isSafeReportText(item.kind, MAX_REPORT_LABEL_CHARACTERS)
    || !isSafeReportText(item.algorithmId, MAX_REPORT_IDENTIFIER_CHARACTERS)
    || !isSafeReportText(item.verificationStatus, MAX_REPORT_IDENTIFIER_CHARACTERS)
    || !isSafeReportTextList(item.sourceRefs, MAX_REPORT_NESTED_ENTRIES, MAX_REPORT_LABEL_CHARACTERS)
    || (item.note !== null && item.note !== undefined && !isSafeReportText(item.note, MAX_REPORT_BODY_CHARACTERS, false)))) {
    return "字段来源链存在不可核对的来源引用";
  }
  if (provenance.some((item) => !isReportRecord(item)
    || typeof item.kind !== "string"
    || !REPORT_PROVENANCE_KINDS.has(item.kind))) {
    return "字段来源链包含未识别的来源类型";
  }
  if (provenance.some((item) => !isReportRecord(item)
    || typeof item.verificationStatus !== "string"
    || !REPORT_PROVENANCE_VERIFICATION_STATUSES.has(item.verificationStatus))) {
    return "字段来源链包含未识别的核验状态";
  }
  if (record.anonymized && provenanceFields.some((field) => (
    !REQUIRED_REPORT_PROVENANCE_FIELD_SET.has(field)
    && !ANONYMIZED_PROVENANCE_PLACEHOLDER_PATTERN.test(field)
  ))) {
    return "匿名报告的非规范字段来源未使用固定移除占位";
  }
  const provenanceFieldSet = new Set(provenance.map((item) => (
    isReportRecord(item) && typeof item.field === "string" ? item.field : ""
  )));
  if (REQUIRED_REPORT_PROVENANCE_FIELDS.some((field) => !provenanceFieldSet.has(field))) {
    return "字段来源链未完整覆盖四柱报告字段";
  }
  if (record.anonymized && provenance.some((item) => {
    if (!isReportRecord(item) || !Array.isArray(item.sourceRefs)) return true;
    const note = item.note;
    const noteIsRedacted = note === null
      || note === undefined
      || (typeof note === "string" && (note.trim().length === 0 || note === ANONYMIZED_PROVENANCE_NOTE));
    return item.sourceRefs.length !== 0 || !noteIsRedacted;
  })) {
    return "匿名报告的字段来源链仍携带来源引用或备注";
  }

  const researchNotes = record.researchNotes as unknown[];
  const events = record.events as unknown[];
  const researchEntries = [...researchNotes, ...events];
  if (researchEntries.length > REPORT_COLLECTION_LIMITS.researchEntries) {
    return `研究笔记与真实事件合计超过 ${REPORT_COLLECTION_LIMITS.researchEntries} 条安全展示上限`;
  }
  const noteReferenceIssue = referenceBindingIssue("研究笔记", researchNotes);
  if (noteReferenceIssue) return noteReferenceIssue;
  const eventReferenceIssue = referenceBindingIssue("真实事件", events);
  if (eventReferenceIssue) return eventReferenceIssue;
  if (
    researchEntries.some(
      (entry) =>
        !isSafeReportText(readReportText(entry, "title"), MAX_REPORT_LABEL_CHARACTERS)
        || !isReportRecord(entry)
        || !Array.isArray(entry.meta)
        || !Array.isArray(entry.sourceRefs)
        || entry.meta.length > MAX_REPORT_NESTED_ENTRIES
        || entry.sourceRefs.length > MAX_REPORT_NESTED_ENTRIES
        || !isSafeReportText(entry.body, MAX_REPORT_BODY_CHARACTERS, false)
        || !isSafeReportTextList(entry.sourceRefs, MAX_REPORT_NESTED_ENTRIES, MAX_REPORT_LABEL_CHARACTERS)
        || entry.meta.some((item) => !isReportRecord(item)
          || !isSafeReportText(readReportText(item, "label"), MAX_REPORT_LABEL_CHARACTERS)
          || !isSafeReportText(item.value, MAX_REPORT_BODY_CHARACTERS, false)),
    )
  ) {
    return "研究笔记与真实事件存在不可核对的嵌套字段";
  }

  const derivations = record.eventTimeDerivations as unknown[];
  const derivationReferenceIssue = referenceBindingIssue("事件时间迁移", derivations);
  if (derivationReferenceIssue) return derivationReferenceIssue;
  if (
    derivations.some(
      (derivation) =>
        !isReportRecord(derivation)
        || !Array.isArray(derivation.lineage)
        || !Array.isArray(derivation.interpretation)
        || !readReportText(derivation, "sourceReference")
        || !readReportText(derivation, "targetReference")
        || !readReportText(derivation, "sourceSnapshotDigest")
        || !readReportText(derivation, "targetSnapshotDigest"),
    )
  ) {
    return "事件时间迁移存在不可核对的快照或谱系字段";
  }
  if (derivations.some((derivation) => {
    if (!isReportRecord(derivation)) return true;
    return !isCanonicalReportDigest(readReportText(derivation, "sourceSnapshotDigest"))
      || !isCanonicalReportDigest(readReportText(derivation, "targetSnapshotDigest"))
      || !isSafeReportText(readReportText(derivation, "createdAt"), MAX_REPORT_LABEL_CHARACTERS)
      || !Array.isArray(derivation.lineage)
      || !Array.isArray(derivation.interpretation)
      || derivation.lineage.length > MAX_REPORT_NESTED_ENTRIES
      || derivation.interpretation.length > MAX_REPORT_NESTED_ENTRIES
      || [...derivation.lineage, ...derivation.interpretation].some((row) => !isReportRecord(row)
        || !isSafeReportText(readReportText(row, "label"), MAX_REPORT_LABEL_CHARACTERS)
        || !isSafeReportText(row.value, MAX_REPORT_BODY_CHARACTERS, false));
  })) {
    return "事件时间迁移包含无效摘要、时间或超出边界的谱系正文";
  }
  if (
    derivations.some(
      (derivation) =>
        readReportText(derivation, "authorization") !== EVENT_DERIVATION_AUTHORIZATION,
    )
  ) {
    return "事件时间迁移缺少显式本地用户确认";
  }

  const citations = record.citations as unknown[];
  const citationReferenceIssue = referenceBindingIssue("结构化引用", citations);
  if (citationReferenceIssue) return citationReferenceIssue;
  if (citations.some((citation, index) => (
    readReportText(citation, "reference") !== `C${index + 1}`
  ))) {
    return "完整报告内 Citation 引用号必须按 C# 连续且与规范顺序一致";
  }
  if (
    citations.some(
      (citation) => !REPORT_CITATION_STATUSES.has(readReportText(citation, "status")),
    )
  ) {
    return "报告包含未识别的引文状态";
  }
  if (
    citations.some((citation) => {
      if (!hasExactReportKeys(citation, REPORT_CITATION_KEYS)
        || !isDenseReportArray(citation.targets, MAX_REPORT_NESTED_ENTRIES)
        || citation.targets.length === 0
        || !isDenseReportArray(citation.evidenceSubjectIds, MAX_REPORT_NESTED_ENTRIES)
        || !hasExactReportKeys(citation.source, REPORT_CITATION_SOURCE_KEYS)) return true;
      const source = citation.source;
      const reviewerCount = citation.reviewerCount;
      return !isSafeReportText(readReportText(citation, "statusLabel"), MAX_REPORT_LABEL_CHARACTERS)
        || !isSafeReportText(readReportText(citation, "locator"), MAX_REPORT_LABEL_CHARACTERS)
        || !isSafeReportText(source.documentReference, MAX_REPORT_IDENTIFIER_CHARACTERS)
        || !REPORT_LOCAL_DOCUMENT_REFERENCE_PATTERN.test(source.documentReference)
        || !isSafeReportText(readReportText(source, "title"), MAX_REPORT_LABEL_CHARACTERS)
        || !isCanonicalReportDigest(readReportText(source, "contentHash"))
        || !REPORT_CITATION_ORIGINS.has(readReportText(source, "origin"))
        || !REPORT_CITATION_RIGHTS_STATUSES.has(readReportText(source, "rightsStatus"))
        || !REPORT_CITATION_WORK_STATUSES.has(readReportText(source, "workStatus"))
        || !REPORT_CITATION_EDITION_STATUSES.has(readReportText(source, "editionStatus"))
        || !REPORT_CITATION_DISTRIBUTION_POLICIES.has(readReportText(source, "distributionPolicy"))
        || !REPORT_CITATION_REVIEW_STATUSES.has(readReportText(source, "reviewStatus"))
        || REPORT_REQUIRED_CITATION_SOURCE_FIELDS.some((field) => (
          !isSafeReportText(readReportText(source, field), MAX_REPORT_LABEL_CHARACTERS)
        ))
        || REPORT_OPTIONAL_CITATION_SOURCE_FIELDS.some((field) => (
          !isSafeReportText(source[field], MAX_REPORT_LABEL_CHARACTERS, false)
        ))
        || !isSafeReportTextList(citation.targets, MAX_REPORT_NESTED_ENTRIES, MAX_REPORT_LABEL_CHARACTERS)
        || new Set(citation.targets).size !== citation.targets.length
        || !isUniqueSafeReportIdentifierList(citation.evidenceSubjectIds)
        || citation.evidenceSubjectIds.some((subjectId) => !isSingleChartReportEvidenceSubjectId(subjectId))
        || !hasExactStringSequence(
          citation.evidenceSubjectIds,
          [...new Set(citation.targets.flatMap((target) => (
            target.startsWith("证据主题 ") ? [target.slice("证据主题 ".length)] : []
          )))].sort(compareReportText)
        )
        || !isSafeReportText(citation.quote, MAX_REPORT_BODY_CHARACTERS, false)
        || !isSafeReportText(citation.annotation, MAX_REPORT_BODY_CHARACTERS, false)
        || !isSafeReportText(citation.decisionNote, MAX_REPORT_BODY_CHARACTERS, false)
        || typeof source.redistributableSourceRights !== "boolean"
        || source.redistributableSourceRights !== citationSourceIsMechanicallyRedistributable(source)
        || typeof reviewerCount !== "number"
        || !Number.isSafeInteger(reviewerCount)
        || reviewerCount < 0
        || reviewerCount > MAX_REPORT_REVIEWER_COUNT;
    })
  ) {
    return "结构化引用存在不可核对的 C#、证据主题、来源、权利投影、定位或复核人数";
  }
  if (citations.some((citation) => {
    if (!isReportRecord(citation)) return true;
    const status = readReportText(citation, "status") as keyof typeof SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.citationStatusLabels;
    return citation.statusLabel !== SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.citationStatusLabels[status]
      || ((status === "verified" || status === "rejected")
        && readReportText(citation, "decisionNote").length === 0);
  })) {
    return "结构化引用的状态标签或裁定说明未与 candidate / verified / rejected 状态闭合";
  }
  const sourceByDocumentReference = new Map<string, Record<string, unknown>>();
  for (const citation of citations) {
    if (!isReportRecord(citation) || !isReportRecord(citation.source)) {
      return "结构化引用缺少可联结的本地 D# 资料引用";
    }
    const source = citation.source;
    const documentReference = readReportText(source, "documentReference");
    const existingSource = sourceByDocumentReference.get(documentReference);
    if (existingSource === undefined) {
      if (documentReference !== `D${sourceByDocumentReference.size + 1}`) {
        return "报告内 KnowledgeDocument 引用号必须按 Citation 首次出现顺序连续分配为 D#";
      }
      sourceByDocumentReference.set(documentReference, source);
    } else if (REPORT_CITATION_SOURCE_KEYS.some((field) => (
      !Object.is(existingSource[field], source[field])
    ))) {
      return "同一报告内 D# KnowledgeDocument 引用必须指向完全相同的资料与权利投影";
    }
  }
  if (
    citations.some(
      (citation) => readReportText(citation, "status") === "verified"
        && isReportRecord(citation)
        && (citation.reviewerCount as number) < 2,
    )
  ) {
    return "已核验引用缺少至少两名复核者";
  }
  const interpretationIssue = interpretationEvidenceBindingIssue(
    record.interpretationEvidence,
    record.anonymized,
    citations as Record<string, unknown>[]
  );
  if (interpretationIssue) return interpretationIssue;

  const sourceIssue = calculationSourceBindingIssue(record.calculationSource, record.anonymized);
  if (sourceIssue) return sourceIssue;

  if (report.anonymized) {
    const privateEvidenceFields = [
      "researchNotes",
      "events",
      "eventTimeDerivations",
      "citations",
    ] as const;
    if (privateEvidenceFields.some((field) => (record[field] as unknown[]).length > 0)) {
      return "匿名报告仍携带研究笔记、事件迁移或引文明细";
    }
  }
  if (!isSafeReportTextList(record.redactions, REPORT_COLLECTION_LIMITS.redactions, MAX_REPORT_BODY_CHARACTERS)) {
    return "匿名移除清单包含超长或不可安全显示的条目";
  }

  const schemaBinding = singleChartResearchReportSchema.safeParse(report);
  if (!schemaBinding.success) {
    return "报告未通过当前单盘报告结构与语义契约";
  }

  return null;
}

type PreparedSingleChartReport =
  | { issue: null; report: SingleChartResearchReportModel }
  | { issue: string; report: null };

function prepareSingleChartReportForDisplay(reportInput: unknown): PreparedSingleChartReport {
  const snapshot = createPassiveJsonDataSnapshot(reportInput);
  if (!snapshot.success) return { issue: UNSAFE_REPORT_OBJECT_ISSUE, report: null };
  const report = snapshot.value as SingleChartResearchReportModel;
  const issue = findSingleChartReportBindingIssueInSnapshot(report);
  return issue ? { issue, report: null } : { issue: null, report };
}

export function findSingleChartReportBindingIssue(report: SingleChartResearchReportModel): string | null {
  return prepareSingleChartReportForDisplay(report).issue;
}

type ReportRow = SingleChartResearchReportModel["caseRows"][number];
type EventTimeDerivation = SingleChartResearchReportModel["eventTimeDerivations"][number];
type CalculationSource = SingleChartResearchReportModel["calculationSource"];
type CalculationComponent = CalculationSource["components"][number];
type InterpretationEvidence = SingleChartResearchReportModel["interpretationEvidence"];
type InterpretationStatement = InterpretationEvidence["statements"][number];
type InterpretationSource = InterpretationEvidence["sources"][number];
type InterpretationSourceBinding = InterpretationEvidence["sourceBindings"][number];

function ReportRowList({ rows, keyPrefix }: { rows: ReportRow[]; keyPrefix: string }) {
  return (
    <dl className="single-chart-report-rows">
      {rows.map((item, index) => (
        <div key={`${keyPrefix}:${index}:${item.label}`}>
          <dt>{item.label}</dt>
          <dd>{item.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function ReportRows({ title, rows }: { title: string; rows: ReportRow[] }) {
  return (
    <section className="single-chart-report-section">
      <h2>{title}</h2>
      <ReportRowList rows={rows} keyPrefix={title} />
    </section>
  );
}

function EventTimeDerivationCard({ derivation }: { derivation: EventTimeDerivation }) {
  return (
    <article
      className="single-chart-event-time-derivation"
      data-authorization={derivation.authorization}
      aria-label={`事件时间迁移凭证 ${derivation.reference}`}
    >
      <header>
        <div>
          <small>Migration receipt · {derivation.createdAt}</small>
          <h3><code>{derivation.reference}</code></h3>
        </div>
        <span>
          {derivation.authorization === EVENT_DERIVATION_AUTHORIZATION
            ? "本次操作已显式确认"
            : "未识别操作确认"}
        </span>
      </header>
      <dl className="single-chart-event-time-meta">
        <div><dt>操作确认</dt><dd><code>{derivation.authorization}</code></dd></div>
        <div><dt>源 Event</dt><dd><code>{derivation.sourceReference}</code></dd></div>
        <div><dt>目标 Event</dt><dd><code>{derivation.targetReference}</code></dd></div>
        <div><dt>源快照摘要</dt><dd><code>{derivation.sourceSnapshotDigest}</code></dd></div>
        <div><dt>目标快照摘要</dt><dd><code>{derivation.targetSnapshotDigest}</code></dd></div>
      </dl>
      <div className="single-chart-event-time-details">
        <section>
          <h4>冻结研究谱系</h4>
          <ReportRowList rows={derivation.lineage} keyPrefix={`${derivation.reference}:lineage`} />
        </section>
        <section>
          <h4>时间解释</h4>
          <ReportRowList rows={derivation.interpretation} keyPrefix={`${derivation.reference}:interpretation`} />
        </section>
      </div>
    </article>
  );
}

function CitationStatus({ status, label }: { status: SingleChartResearchReportModel["citations"][number]["status"]; label: string }) {
  return <span className={`report-citation-status report-citation-status--${status}`}>{label}</span>;
}

function downstreamSourceLabel(source: CalculationSource["downstreamSource"]): string {
  if (source === "stored_receipt") return "已保存计算收据";
  if (source === "explicit_projection") return "当前版本即时投影";
  return "无可核验计算来源";
}

function comparisonStatusLabel(status: CalculationSource["comparisonStatus"]): string {
  if (status === "matched") return "工程精确复演一致";
  if (status === "mismatch") return "工程精确复演有差异";
  if (status === "exact_executor_unavailable") return "精确执行器未保留";
  return "不适用";
}

function receiptLedgerStatusLabel(status: CalculationSource["receiptLedgerStatus"]): string {
  return status === "available" ? "收据账本可用" : "当前发布代无收据账本";
}

function componentStatusLabel(status: CalculationComponent["status"]): string {
  if (status === "projected") return "已生成工程输出";
  if (status === "unavailable") return "精确执行器不可用";
  if (status === "not_requested") return "本次未请求";
  return "不可计算";
}

function componentSourceLabel(
  component: CalculationComponent,
  downstreamSource: CalculationSource["downstreamSource"]
): string {
  if (component.status === "not_requested") return "本次未请求";
  if (component.status === "unavailable") return "精确执行器不可用";
  if (component.status === "not_evaluable") return "无可核验计算来源";
  return downstreamSourceLabel(downstreamSource);
}

function CalculationSourceSection({
  id,
  source,
  anonymized
}: {
  id: string;
  source: CalculationSource;
  anonymized: boolean;
}) {
  const headingId = useId();
  const sourceLabel = downstreamSourceLabel(source.downstreamSource);
  const hasLocalSourceDetails = Boolean(
    source.receiptReference
    || source.requestFingerprint
    || source.receiptDigest
    || source.projectionDigest
    || source.capturedAt
  );
  return (
    <section
      id={id}
      className="single-chart-report-section single-chart-calculation-source"
      aria-labelledby={headingId}
      data-source={source.downstreamSource}
      data-ledger-status={source.receiptLedgerStatus}
      data-comparison-status={source.comparisonStatus}
    >
      <h2 id={headingId}>下游计算来源</h2>
      <p className="single-chart-calculation-source-notice">{source.notice}</p>
      <dl className="single-chart-report-rows">
        <div><dt>本命来源</dt><dd>冻结 Revision 结构绑定已核对</dd></div>
        <div><dt>下游来源</dt><dd>{sourceLabel}（<code>{source.downstreamSource}</code>）</dd></div>
        <div><dt>收据账本</dt><dd>{receiptLedgerStatusLabel(source.receiptLedgerStatus)}（<code>{source.receiptLedgerStatus}</code>）</dd></div>
        <div><dt>历史输出比对</dt><dd>{source.storedHistoricalOutputCompared ? "已比较" : "未比较"}</dd></div>
        <div><dt>精确复演</dt><dd>{comparisonStatusLabel(source.comparisonStatus)}（<code>{source.comparisonStatus}</code>）</dd></div>
        <div><dt>专家证据</dt><dd>未核验</dd></div>
        <div><dt>执行器 Profile</dt><dd><code>{source.profileId}</code></dd></div>
      </dl>
      <div className="single-chart-calculation-components" aria-label="下游组件来源状态">
        {source.components.map((component) => {
          const componentSource = componentSourceLabel(component, source.downstreamSource);
          const statusLabel = componentStatusLabel(component.status);
          return (
            <article
              key={component.key}
              data-component-status={component.status}
              data-component-source={source.downstreamSource}
              aria-label={`${component.label}：${statusLabel}；来源：${componentSource}`}
            >
              <header><strong>{component.label}</strong><span>{statusLabel}</span></header>
              <dl>
                <div><dt>计算来源</dt><dd>{componentSource}</dd></div>
                <div><dt>组件状态</dt><dd>{statusLabel}（<code>{component.status}</code>）</dd></div>
                <div><dt>执行器</dt><dd><code>{component.executorId ?? "—"}</code></dd></div>
                {!anonymized && component.resultDigest ? <div><dt>结果摘要</dt><dd><code>{component.resultDigest}</code></dd></div> : null}
              </dl>
            </article>
          );
        })}
      </div>
      {anonymized ? (
        <p className="single-chart-report-empty">
          匿名模式仅保留来源分类与核验状态；收据引用、请求指纹、收据 / 投影 / 组件摘要及保存时间均已移除。
        </p>
      ) : hasLocalSourceDetails ? (
        <details className="single-chart-calculation-source-details">
          <summary>查看完整本地摘要</summary>
          <dl>
            {source.receiptReference ? <div><dt>收据引用</dt><dd><code>{source.receiptReference}</code></dd></div> : null}
            {source.requestFingerprint ? <div><dt>请求指纹</dt><dd><code>{source.requestFingerprint}</code></dd></div> : null}
            {source.receiptDigest ? <div><dt>收据摘要</dt><dd><code>{source.receiptDigest}</code></dd></div> : null}
            {source.projectionDigest ? <div><dt>投影摘要</dt><dd><code>{source.projectionDigest}</code></dd></div> : null}
            {source.capturedAt ? <div><dt>保存时间</dt><dd>{source.capturedAt}</dd></div> : null}
          </dl>
        </details>
      ) : (
        <p className="single-chart-report-empty">当前来源没有可展示的本地摘要。</p>
      )}
    </section>
  );
}

function interpretationKindLabel(kind: InterpretationStatement["kind"]): string {
  if (kind === "scope") return "范围";
  if (kind === "factor_ledger") return "因素账";
  if (kind === "month_main_duplication") return "月令重复计入";
  if (kind === "subtotal") return "小计";
  if (kind === "classification") return "分类";
  if (kind === "sensitivity") return "敏感性";
  return "边界";
}

function interpretationClassificationLabel(classification: InterpretationStatement["classification"]): string {
  if (classification === "supported") return "工程引用已闭合";
  if (classification === "inferred") return "工程推导，带边界";
  if (classification === "unsupported") return "证据不足";
  if (classification === "contradicted") return "存在冲突";
  if (classification === "advisory") return "候选说明";
  return "阻断";
}

function interpretationDisplayStatusLabel(status: InterpretationStatement["displayStatus"]): string {
  if (status === "visible_with_evidence") return "可展示 · 带工程证据";
  if (status === "visible_with_caveat") return "可展示 · 带限制";
  return "withheld · 不展示正文";
}

function sourceBindingRoleLabel(role: InterpretationSourceBinding["evidenceRole"]): string {
  if (role === "defines_engineering_candidate") return "定义工程候选";
  if (role === "traditional_context_only") return "仅传统语境";
  return "仅复核问题";
}

function interpretationSourceTypeLabel(sourceType: InterpretationSource["sourceType"]): string {
  if (sourceType === "engineering_contract") return "仓内工程合同";
  if (sourceType === "public_domain_classic_transcription") return "历史作品社区转录";
  return "仅复核 locator";
}

function interpretationRegistryStatusLabel(
  status: InterpretationSource["registryVerificationStatus"]
): string {
  if (status === "repository_policy_verified") return "仓内工程登记可定位";
  if (status === "locator_verified_in_pinned_revision") return "固定载体版本中 locator 已登记";
  if (status === "source_warning_unresolved") return "来源警告未解决";
  return "仅有 locator，载体版本未冻结";
}

function interpretationWorkRightsLabel(status: InterpretationSource["workRightsStatus"]): string {
  if (status === "internal_project_source") return "项目内部工程源码";
  if (status === "historical_work_public_domain_candidate") return "历史作品公版候选，未作法律判断";
  return "原文与评注作品层仍须分别审计";
}

function interpretationCarrierRightsLabel(status: InterpretationSource["carrierRightsStatus"]): string {
  if (status === "local_repository_only") return "仅本仓载体，外部分发未评估";
  if (status === "community_transcription_reuse_requires_site_license_audit") {
    return "社区转录，复用仍须站点许可审计";
  }
  if (status === "incomplete_transcription_source_warning") return "不完整转录，来源警告未解决";
  return "仅链接与 locator，无再分发许可闭环";
}

function interpretationLocatorStatusLabel(
  status: InterpretationSourceBinding["locator"]["registryVerificationStatus"]
): string {
  return status === "verified"
    ? "注册表 locator 已核"
    : "注册表 locator 待人工文本核验";
}

function interpretationLocatorScopeLabel(
  scope: InterpretationSourceBinding["locator"]["verificationScope"]
): string {
  if (scope === "repository_symbol_registration_only") return "仅仓内 symbol 登记";
  if (scope === "pinned_carrier_heading_only") return "仅固定载体标题定位";
  return "待人工逐字核对";
}

function interpretationCitationReviewStateLabel(
  status: InterpretationSourceBinding["mechanicalAdmission"]["citationReviewState"]
): string {
  if (status === "verified_present") return "存在 verified Citation";
  if (status === "candidate_only") return "仅 candidate Citation";
  if (status === "rejected_only") return "仅 rejected Citation";
  return "无匹配 Citation";
}

function interpretationRedistributionStateLabel(
  status: InterpretationSourceBinding["mechanicalAdmission"]["redistributionState"]
): string {
  if (status === "all_verified_sources_redistributable") return "全部 verified 来源机械满足可再分发条件";
  if (status === "some_verified_sources_redistributable") return "部分 verified 来源机械满足可再分发条件";
  if (status === "no_verified_source_redistributable") return "verified 来源均未机械满足可再分发条件";
  return "无 verified Citation，不适用";
}

function interpretationDistributionRightsStateLabel(
  status: Extract<InterpretationEvidence["admissionSummary"], { visibility: "full" }>["distributionRightsState"]
): string {
  if (status === "all_matching_source_text_redistributable") return "全部匹配来源正文机械满足可再分发条件";
  if (status === "contains_nonredistributable_source_text") return "含未机械满足可再分发条件的来源正文";
  return "没有匹配来源正文";
}

function interpretationBindingGovernanceGaps(
  source: InterpretationSource,
  binding: InterpretationSourceBinding
): string[] {
  const gaps = [
    "Citation target 未评估其资料是否就是该 registry 来源",
    "准入账未复制来源正文",
    "机械状态不建立内容正确、专家审定或公开发布授权"
  ];
  if (binding.mechanicalAdmission.citationReviewState === "no_citation") {
    gaps.push("无匹配结构化 Citation");
  } else if (binding.mechanicalAdmission.citationReviewState === "rejected_only") {
    gaps.push("仅有 rejected Citation，不构成采纳");
  } else if (binding.mechanicalAdmission.citationReviewState === "candidate_only") {
    gaps.push("仅有 candidate Citation，尚无 verified Citation");
  }
  if (binding.mechanicalAdmission.citationReviewState === "verified_present"
    && binding.mechanicalAdmission.redistributableVerifiedCitationReferences.length === 0) {
    gaps.push("verified Citation 的来源未机械满足可再分发条件");
  }
  if (source.stableRevision === null) gaps.push("固定载体版本未冻结");
  if (binding.locator.registryVerificationStatus !== "verified") gaps.push("locator 待人工文本核验");
  if (binding.locator.contentSha256 === null) gaps.push("locator 未绑定正文 SHA-256");
  if (source.registryVerificationStatus === "source_warning_unresolved") gaps.push("来源警告未解决");
  if (source.registryVerificationStatus === "locator_only_unfrozen") gaps.push("来源仅登记 locator");
  return gaps;
}

function InterpretationEvidenceSection({
  id,
  evidence,
  anonymized
}: {
  id: string;
  evidence: InterpretationEvidence;
  anonymized: boolean;
}) {
  const headingId = useId();

  if (evidence.status === "withheld") {
    return (
      <section
        id={id}
        className="single-chart-report-section single-chart-interpretation-evidence single-chart-interpretation-evidence--blocked"
        aria-labelledby={headingId}
        data-interpretation-status="withheld"
        data-interpretation-reason={evidence.reason}
      >
        <h2 id={headingId} className="single-chart-section-heading">
          <span>旺衰叙事证据</span>
          <small>BLOCKED</small>
        </h2>
        <div className="single-chart-interpretation-blocked" role="status">
          <strong>DST 时间仍未解析，叙事证据已失败关闭</strong>
          <p>当前报告没有生成、展示或导出任何旺衰叙事句子、来源绑定或 Envelope 摘要。</p>
          <small>
            reason: dst_unresolved · admission: {evidence.admissionSummary.visibility === "full"
              ? evidence.admissionSummary.evaluationStatus
              : "redacted"} · 只读状态 · 不构成命理、专家、科学或发布判断
          </small>
        </div>
      </section>
    );
  }

  const sourceById = new Map(evidence.sources.map((source) => [source.sourceId, source] as const));
  const fullAdmissionSummary = evidence.admissionSummary.visibility === "full"
    ? evidence.admissionSummary
    : null;

  return (
    <section
      id={id}
      className="single-chart-report-section single-chart-report-flow-section single-chart-interpretation-evidence"
      aria-labelledby={headingId}
      data-interpretation-status="available"
      data-registry-locator-verified-bindings={evidence.coverage.registryLocatorVerifiedBindings}
      data-source-texts-included={evidence.coverage.sourceTextsIncluded}
      data-admission-visibility={evidence.admissionSummary.visibility}
      data-bindings-with-verified-citation={fullAdmissionSummary?.bindingsWithVerifiedCitation}
      data-bindings-with-redistributable-verified-citation={
        fullAdmissionSummary?.bindingsWithRedistributableVerifiedCitation
      }
    >
      <h2 id={headingId} className="single-chart-section-heading">
        <span>旺衰叙事证据</span>
        <small>{evidence.coverage.displayable} / {evidence.coverage.statementsTotal} 条可展示</small>
      </h2>

      <aside className="single-chart-interpretation-boundary" role="note">
        <strong>逐句规范重建与机械准入，不是内容、专家或发布真值</strong>
        <p>正文与冻结 Envelope 的规范渲染器逐字匹配，只证明当前工程投影未被自由改写。v1.7 独立文本只保留可见 target 与权利投影；精确 Case／Revision 合取和 SourceCarrier material gate 必须由本机构建器或带原输入 validator 重建。Citation 的 verified 与 redistributable 也不证明术数内容正确、专家已审定、科学有效、Citation 所指资料就是 registry 来源，或获准公开发布。</p>
      </aside>

      <dl className="single-chart-interpretation-meta">
        <div><dt>范围</dt><dd><code>{evidence.scope}</code></dd></div>
        <div><dt>时柱</dt><dd>{evidence.includeHour ? "纳入" : "不纳入"}</dd></div>
        <div><dt>Envelope Profile</dt><dd><code>{evidence.envelopeProfileVersion}</code></dd></div>
        <div><dt>内容版本</dt><dd><code>{evidence.envelopeContentVersion}</code></dd></div>
        <div><dt>来源注册表 Profile</dt><dd><code>{evidence.sourceRegistry.profileVersion}</code></dd></div>
        <div><dt>来源注册表内容版本</dt><dd><code>{evidence.sourceRegistry.contentVersion}</code></dd></div>
        <div><dt>来源注册表 SHA-256</dt><dd>{evidence.sourceRegistry.registrySha256 ?? "未登记（不构成内容身份）"}</dd></div>
        {!anonymized && evidence.payloadSha256 ? (
          <div><dt>Envelope SHA-256</dt><dd><code>{evidence.payloadSha256}</code></dd></div>
        ) : null}
      </dl>

      <div className="single-chart-interpretation-governance-axes" aria-label="旺衰叙事来源治理三轴状态">
        <article data-governance-axis="registry_locator">
          <span>注册表 locator 已核</span>
          <strong>{evidence.coverage.registryLocatorVerifiedBindings} / {evidence.coverage.referencedSourceBindings}</strong>
          <small>仅表示注册表登记 locator 的有限核对；不建立正文身份、精确引文或语义真值。</small>
        </article>
        {fullAdmissionSummary ? (
          <>
            <article data-governance-axis="structured_citation">
              <span>binding scoped Citation 机械准入 · {fullAdmissionSummary.evaluationStatus}</span>
              <strong>
                {fullAdmissionSummary.bindingsWithNonRejectedCitation} / {fullAdmissionSummary.bindingsTotal} 条 binding 有非 rejected Citation
              </strong>
              <small>
                verified {fullAdmissionSummary.citationRecords.verified} · candidate {fullAdmissionSummary.citationRecords.candidate} · rejected {fullAdmissionSummary.citationRecords.rejected}。Citation target 不认证来源身份，verified 不等于内容正确或专家审定。
              </small>
            </article>
            <article data-governance-axis="distribution_rights">
              <span>binding scoped SourceRights 机械状态</span>
              <strong>{interpretationDistributionRightsStateLabel(fullAdmissionSummary.distributionRightsState)}</strong>
              <small>
                匹配 D# 资料 {fullAdmissionSummary.knowledgeDocumentsBound} · binding-scoped SourceRights {fullAdmissionSummary.sourceRightsRecordsBound}；
                {fullAdmissionSummary.bindingsWithRedistributableVerifiedCitation} 条 binding 有机械可再分发的 verified Citation。redistributable 不等于内容正确、专家审定或公开发布授权。
              </small>
            </article>
          </>
        ) : (
          <article data-governance-axis="mechanical_admission" data-admission-visibility="redacted">
            <span>机械准入明细已脱敏</span>
            <strong>匿名模式不展示动态准入数量与状态</strong>
            <small>固定保留“准入账不复制来源正文”的边界；不据此推断 Citation、权利、内容正确性、专家审定或公开发布授权。</small>
          </article>
        )}
      </div>

      <div className="single-chart-interpretation-family-grid" aria-label="旺衰叙事断言家族统计">
        {evidence.assertionFamilies.map((family) => (
          <article key={family.kind} data-assertion-family={family.kind}>
            <strong>{interpretationKindLabel(family.kind)}</strong>
            <span>{family.displayable} 可展示</span>
            <small>{family.withheld} withheld · 共 {family.total}</small>
          </article>
        ))}
      </div>

      <div className="single-chart-interpretation-statements" aria-label="旺衰叙事逐句忠实度账">
        {evidence.statements.map((statement) => {
          const withheld = statement.displayStatus === "withheld";
          return (
            <article
              key={statement.statementId}
              data-statement-status={statement.displayStatus}
              data-statement-classification={statement.classification}
            >
              <header>
                <span>#{statement.order} · {interpretationKindLabel(statement.kind)}</span>
                <strong>{interpretationDisplayStatusLabel(statement.displayStatus)}</strong>
              </header>
              {withheld ? (
                <div className="single-chart-interpretation-withheld">
                  <strong>{interpretationClassificationLabel(statement.classification)}</strong>
                  <p>正文已 withheld；本报告不会渲染被阻断的规范句子。</p>
                  <dl>
                    <div>
                      <dt>缺失证据</dt>
                      <dd>{statement.missingEvidence.join("；") || "未列出；保持 withheld"}</dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <>
                  <p className="single-chart-interpretation-text">{statement.text}</p>
                  <dl className="single-chart-interpretation-statement-ledger">
                    <div><dt>分类</dt><dd>{interpretationClassificationLabel(statement.classification)}</dd></div>
                    <div><dt>来源定位</dt><dd>{statement.sourceLocatorCoverage}</dd></div>
                    <div><dt>事实</dt><dd>{statement.factIds.join("；") || "—"}</dd></div>
                    <div><dt>规则</dt><dd>{statement.ruleIds.join("；") || "—"}</dd></div>
                    <div><dt>来源绑定</dt><dd>{statement.sourceBindingIds.join("；") || "—"}</dd></div>
                    <div><dt>注册表 locator 已核</dt><dd>{statement.registryLocatorVerifiedBindingIds.join("；") || "—"}</dd></div>
                    <div><dt>稳定性</dt><dd>{statement.stabilityAssessmentIds.join("；") || "—"}</dd></div>
                    <div><dt>冲突</dt><dd>{statement.conflictIds.join("；") || "—"}</dd></div>
                    <div><dt>工程理由</dt><dd>{statement.rationale || "—"}</dd></div>
                  </dl>
                </>
              )}
            </article>
          );
        })}
      </div>

      {!anonymized ? (
        <>
          <section className="single-chart-interpretation-sources" aria-label="旺衰叙事唯一来源资格账">
            <header>
              <h3>唯一来源资格账（注册表快照）</h3>
              <p>
                共 {evidence.coverage.referencedSources} 个引用来源，固定版本 {evidence.coverage.pinnedRevisionSources} 个。
                这是静态注册表投影，不含来源正文；SourceRights 仅按 binding 范围联结。它不认证 Citation target 就是该 registry 来源，也不等于许可、内容正确、专家审定、语义真值或公开发布授权。
              </p>
            </header>
            <div>
              {evidence.sources.map((source) => {
                const sourceHref = safeReportSourceHref(source.url);
                return (
                  <article
                    key={source.sourceId}
                    data-source-type={source.sourceType}
                    data-source-registry-status={source.registryVerificationStatus}
                  >
                    <header>
                      <span>来源 #{source.order} · {interpretationSourceTypeLabel(source.sourceType)}</span>
                      <strong>{source.title}</strong>
                    </header>
                    <dl>
                      <div><dt>sourceId</dt><dd><code>{source.sourceId}</code></dd></div>
                      <div><dt>版本 / 载体</dt><dd>{source.editionOrCarrier}</dd></div>
                      <div><dt>固定版本</dt><dd><code>{source.stableRevision ?? "未冻结"}</code></dd></div>
                      <div><dt>注册表状态</dt><dd>{interpretationRegistryStatusLabel(source.registryVerificationStatus)}</dd></div>
                      <div><dt>作品层权利线索</dt><dd>{interpretationWorkRightsLabel(source.workRightsStatus)}</dd></div>
                      <div><dt>载体层权利线索</dt><dd>{interpretationCarrierRightsLabel(source.carrierRightsStatus)}</dd></div>
                      <div><dt>SourceRights record</dt><dd><code>{source.sourceRightsRecordStatus}</code>（仅 binding 范围）</dd></div>
                      <div className="single-chart-interpretation-wide-row"><dt>使用边界</dt><dd>{source.usageBoundary}</dd></div>
                      <div className="single-chart-interpretation-wide-row">
                        <dt>来源地址</dt>
                        <dd>
                          {sourceHref ? (
                            <a
                              href={sourceHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              referrerPolicy="no-referrer"
                            >
                              {source.url}
                            </a>
                          ) : (
                            <code>{source.url}</code>
                          )}
                        </dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="single-chart-interpretation-bindings" aria-label="旺衰叙事来源 binding 与反向边界">
            <header>
              <h3>来源 binding 与反向边界</h3>
              <p>每条 binding 严格回连唯一来源资格记录；“支持范围”之外的内容必须按反向边界处理，不能借 locator 状态晋升。</p>
            </header>
            <div>
              {evidence.sourceBindings.map((binding) => {
                const source = sourceById.get(binding.sourceId)!;
                const governanceGaps = interpretationBindingGovernanceGaps(source, binding);
                return (
                  <article
                    key={binding.bindingId}
                    data-source-type={binding.sourceType}
                    data-locator-registry-status={binding.locator.registryVerificationStatus}
                    data-locator-verification-scope={binding.locator.verificationScope}
                    data-source-identity-status={binding.mechanicalAdmission.sourceIdentityStatus}
                    data-citation-review-state={binding.mechanicalAdmission.citationReviewState}
                    data-redistribution-state={binding.mechanicalAdmission.redistributionState}
                  >
                    <header>
                      <strong>{binding.bindingId}</strong>
                      <span>#{binding.order} · {sourceBindingRoleLabel(binding.evidenceRole)}</span>
                    </header>
                    <dl>
                      <div><dt>唯一来源</dt><dd>{source.title}<small><code>{binding.sourceId}</code></small></dd></div>
                      <div><dt>evidence subject</dt><dd><code>{binding.evidenceSubjectId}</code></dd></div>
                      <div><dt>来源类型</dt><dd>{interpretationSourceTypeLabel(binding.sourceType)}</dd></div>
                      <div><dt>固定版本</dt><dd><code>{source.stableRevision ?? "未冻结"}</code></dd></div>
                      <div><dt>参数支持级</dt><dd><code>{binding.parameterSupport}</code></dd></div>
                      <div className="single-chart-interpretation-wide-row"><dt>定位</dt><dd>{binding.locator.kind} · {binding.locator.value}</dd></div>
                      <div><dt>locator 状态</dt><dd>{interpretationLocatorStatusLabel(binding.locator.registryVerificationStatus)}</dd></div>
                      <div><dt>核验范围</dt><dd>{interpretationLocatorScopeLabel(binding.locator.verificationScope)}</dd></div>
                      <div><dt>locator 正文 SHA-256</dt><dd>{binding.locator.contentSha256 ?? "未登记"}</dd></div>
                      <div><dt>作品层权利线索</dt><dd>{interpretationWorkRightsLabel(source.workRightsStatus)}</dd></div>
                      <div><dt>载体层权利线索</dt><dd>{interpretationCarrierRightsLabel(source.carrierRightsStatus)}</dd></div>
                      <div><dt>Citation 所指资料是否就是该来源</dt><dd><code>{binding.mechanicalAdmission.sourceIdentityStatus}</code>（未评估）</dd></div>
                      <div><dt>Citation 机械状态</dt><dd>{interpretationCitationReviewStateLabel(binding.mechanicalAdmission.citationReviewState)}</dd></div>
                      <div><dt>再分发机械状态</dt><dd>{interpretationRedistributionStateLabel(binding.mechanicalAdmission.redistributionState)}</dd></div>
                    </dl>
                    <div className="single-chart-interpretation-support-boundary" aria-label="binding 机械准入 C# 分区">
                      <section>
                        <strong>candidate / verified</strong>
                        <p>
                          candidate：{binding.mechanicalAdmission.candidateCitationReferences.join("；") || "—"}<br />
                          verified：{binding.mechanicalAdmission.verifiedCitationReferences.join("；") || "—"}
                        </p>
                      </section>
                      <section>
                        <strong>rejected / redistributable verified</strong>
                        <p>
                          rejected：{binding.mechanicalAdmission.rejectedCitationReferences.join("；") || "—"}<br />
                          redistributable verified：{binding.mechanicalAdmission.redistributableVerifiedCitationReferences.join("；") || "—"}
                        </p>
                      </section>
                    </div>
                    <div className="single-chart-interpretation-support-boundary">
                      <section>
                        <strong>该 binding 支持</strong>
                        <p>{binding.supports}</p>
                      </section>
                      <section>
                        <strong>该 binding 不支持</strong>
                        <ul>{binding.doesNotSupport.map((boundary) => <li key={boundary}>{boundary}</li>)}</ul>
                      </section>
                    </div>
                    <footer className="single-chart-interpretation-gaps" aria-label="机械准入边界与治理缺口">
                      <strong>机械边界与待闭环项</strong>
                      <ul>{governanceGaps.map((gap) => <li key={gap}>{gap}</li>)}</ul>
                    </footer>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      ) : (
        <p className="single-chart-report-empty">
          匿名模式保留逐句工程状态与逻辑计数（{evidence.coverage.referencedSources} 个来源、
          {evidence.coverage.referencedSourceBindings} 条 binding、
          {evidence.coverage.registryLocatorVerifiedBindings} 条注册表 locator 已核），
          但来源资格账、binding / locator / 版本 / 权利线索 / 反向边界明细与 Envelope 摘要均为空或已移除；机械准入动态数量与状态不展示。
        </p>
      )}
    </section>
  );
}

type ReportIndexItem = Readonly<{ id: string; label: string }>;

function SingleChartReportIndex({ items }: { items: readonly ReportIndexItem[] }) {
  const itemIdentity = items.map((item) => item.id).join("\u0000");
  const [activeSectionId, setActiveSectionId] = useState(items[0]?.id ?? "");
  const indexListRef = useRef<HTMLOListElement>(null);
  const activeSectionIndex = Math.max(0, items.findIndex((item) => item.id === activeSectionId));
  const activeSection = items[activeSectionIndex];

  useEffect(() => {
    setActiveSectionId(items[0]?.id ?? "");
  }, [itemIdentity]);

  useEffect(() => {
    const list = indexListRef.current;
    const activeLink = list?.querySelector<HTMLAnchorElement>('a[aria-current="location"]');
    if (!list || !activeLink) return;

    const listBounds = list.getBoundingClientRect();
    const linkBounds = activeLink.getBoundingClientRect();
    const edgeInset = 8;
    if (
      linkBounds.left >= listBounds.left + edgeInset
      && linkBounds.right <= listBounds.right - edgeInset
    ) return;

    const targetLeft = list.scrollLeft
      + linkBounds.left
      - listBounds.left
      - (listBounds.width - linkBounds.width) / 2;
    const reduceMotion = typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nextLeft = Math.max(0, targetLeft);
    if (typeof list.scrollTo === "function") {
      list.scrollTo({ left: nextLeft, behavior: reduceMotion ? "auto" : "smooth" });
    } else {
      list.scrollLeft = nextLeft;
    }
  }, [activeSectionId, itemIdentity]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => Boolean(section));
    if (sections.length === 0) return undefined;

    const scrollRoot = sections[0].closest(".single-chart-report-scroll");
    let frameId = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length === 0) return;
        const rootTop = scrollRoot?.getBoundingClientRect().top ?? 0;
        const nextSection = visibleEntries.sort(
          (left, right) =>
            Math.abs(left.boundingClientRect.top - rootTop - 72)
            - Math.abs(right.boundingClientRect.top - rootTop - 72),
        )[0];
        cancelAnimationFrame(frameId);
        frameId = requestAnimationFrame(() => setActiveSectionId(nextSection.target.id));
      },
      { root: scrollRoot, rootMargin: "-72px 0px -62% 0px", threshold: [0, 0.01] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [itemIdentity]);

  return (
    <nav className="single-chart-report-index" aria-label="单盘报告章节目录">
      <div className="single-chart-report-index-heading">
        <small>
          REPORT INDEX · {String(activeSectionIndex + 1).padStart(2, "0")}/{String(items.length).padStart(2, "0")}
        </small>
        <strong>{activeSection?.label ?? "报告目录"}</strong>
      </div>
      <ol ref={indexListRef}>
        {items.map((item, index) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-label={`${index + 1}/${items.length} ${item.label}`}
              aria-current={activeSectionId === item.id ? "location" : undefined}
              onClick={() => setActiveSectionId(item.id)}
            >
              <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export const SingleChartReport = forwardRef<HTMLElement, { report: SingleChartResearchReportModel }>(
  function SingleChartReport({ report: reportInput }, reportRef) {
    const reportTitleId = useId();
    const provenanceInstructionsId = useId();
    const prepared = prepareSingleChartReportForDisplay(reportInput);
    const reportSectionIds = {
      summary: `${reportTitleId}-summary`,
      body: `${reportTitleId}-body`,
      calculation: `${reportTitleId}-calculation`,
      pillars: `${reportTitleId}-pillars`,
      interpretation: `${reportTitleId}-interpretation`,
      provenance: `${reportTitleId}-provenance`,
      research: `${reportTitleId}-research`,
      migrations: `${reportTitleId}-migrations`,
      citations: `${reportTitleId}-citations`,
      redactions: `${reportTitleId}-redactions`,
    };
    if (prepared.report === null) {
      return (
        <article
          ref={reportRef}
          className="single-chart-report-print-root single-chart-report-binding-failure"
          data-binding-state="invalid"
          data-schema-family="legacy-v13"
          data-release-identity="legacy-v13"
          data-release-family="legacy-v13"
          data-db-generation="13"
          data-target-schema="13"
          data-migration-id="null"
          data-engineering-evidence-only="true"
          data-current-build-evidence-verified="false"
          data-expert-truth-established="false"
          data-formal-truth-established="false"
          data-scientific-validity-claimed="false"
          data-source-rights-established="false"
          data-good-bad-score="null"
          data-result="null"
          data-formal-activation-allowed="false"
          data-public-release-authorized="false"
          data-mutation-epoch-bypassed="false"
          data-mutation-mode="read-only-no-mutation"
          data-chart-or-storage-mutation-performed="false"
          data-record-write-performed="false"
          role="alert"
          aria-labelledby={reportTitleId}
        >
          <div className="single-chart-report-binding-failure-card">
            <small>REPORT BINDING · BLOCKED</small>
            <h1 id={reportTitleId}>单盘报告绑定失败</h1>
            <p>当前报告没有进入展示或导出路径，原始数据未被改写。</p>
            <code>{prepared.issue}</code>
          </div>
        </article>
      );
    }

    const report = prepared.report;
    const reportCaseBinding = readReportText(report, "caseReference");
    const reportRevisionBinding = readReportText(report, "revisionReference");

    const reportIndexItems = [
      { id: reportSectionIds.summary, label: "摘要与边界" },
      { id: reportSectionIds.body, label: "输入与规则" },
      { id: reportSectionIds.calculation, label: "计算来源" },
      { id: reportSectionIds.pillars, label: "四柱事实" },
      { id: reportSectionIds.interpretation, label: "旺衰叙事证据" },
      { id: reportSectionIds.provenance, label: "来源链" },
      { id: reportSectionIds.research, label: "研究事件" },
      { id: reportSectionIds.migrations, label: "迁移回执" },
      { id: reportSectionIds.citations, label: "结构化引用" },
      ...(report.redactions.length
        ? [{ id: reportSectionIds.redactions, label: "匿名清单" }]
        : []),
    ];
    const citationCounts = report.citations.reduce(
      (counts, citation) => {
        counts[citation.status] += 1;
        return counts;
      },
      { verified: 0, user_candidate: 0, rejected: 0 }
    );
    const summaryRows = [
      ...report.birthRows.filter((row) => ["输入历法", "原始日期", "出生时间", "时区"].includes(row.label)),
      ...report.calibrationRows.filter((row) => ["排盘墙上时间", "UTC 瞬时点"].includes(row.label)),
      ...report.ruleRows.filter((row) => ["规则方案", "界年 / 换月", "换日 / 子时日干", "时柱时间基准"].includes(row.label)),
      ...report.integrityRows.filter((row) => ["引擎", "规则摘要", "验证状态"].includes(row.label))
    ];

    return (
      <article
        ref={reportRef}
        className="single-chart-report-print-root"
        aria-labelledby={reportTitleId}
        data-anonymized={report.anonymized ? "true" : "false"}
        data-binding-state="bound"
        data-schema-family="legacy-v13"
        data-release-identity="legacy-v13"
        data-release-family="legacy-v13"
        data-db-generation="13"
        data-target-schema="13"
        data-migration-id="null"
        data-engineering-evidence-only="true"
        data-current-build-evidence-verified="false"
        data-expert-truth-established="false"
        data-formal-truth-established="false"
        data-source-rights-established="false"
        data-good-bad-score="null"
        data-expert-truth-claimed="false"
        data-scientific-validity-claimed="false"
        data-public-release-authorized="false"
        data-mutation-epoch-bypassed="false"
        data-mutation-mode="read-only-no-mutation"
        data-chart-or-storage-mutation-performed="false"
        data-record-write-performed="false"
        data-result="null"
        data-downstream-source={report.calculationSource.downstreamSource}
        data-comparison-status={report.calculationSource.comparisonStatus}
        data-interpretation-evidence-status={report.interpretationEvidence.status}
        data-interpretation-exact-renderer-match={report.interpretationEvidence.status === "available" ? "true" : "not-applicable"}
      >
        <section id={reportSectionIds.summary} className="single-chart-report-summary" aria-label="单盘报告摘要">
          <header className="single-chart-report-cover">
            <div>
              <p className="single-chart-report-kicker">HAKIMI · BAZI RESEARCH</p>
              <h1 id={reportTitleId}>{report.title}</h1>
              <p>{report.subtitle}</p>
            </div>
            <div className="single-chart-report-identity">
              <strong>{report.caseLabel}</strong>
              <span>{report.revisionLabel}</span>
              <small>{report.anonymized ? "匿名模式" : "完整资料模式"} · 格式 {report.formatVersion}</small>
            </div>
          </header>

          <p className="single-chart-report-notice">{report.previewNotice}</p>

          <aside className="single-chart-report-boundary" role="note" aria-label="报告证据边界" data-boundary="research-only">
            <strong>研究档案，不是专家结论</strong>
            <p>冻结 Revision、工程计算收据与结构化引用只说明本地证据链可核对，不构成专家真值、现实事件因果判断或公开发布授权。</p>
            <small>legacy-v13 · targetSchema 13 · migrationId null · 核对顺序：冻结修订 → 计算来源 → 字段来源 → 引文状态</small>
          </aside>

          <div
            className={`single-chart-calculation-source-marker single-chart-calculation-source-marker--${report.calculationSource.downstreamSource}`}
            role="group"
            data-source={report.calculationSource.downstreamSource}
            data-ledger-status={report.calculationSource.receiptLedgerStatus}
            data-comparison-status={report.calculationSource.comparisonStatus}
            aria-label={`下游计算来源：${downstreamSourceLabel(report.calculationSource.downstreamSource)}；精确复演：${comparisonStatusLabel(report.calculationSource.comparisonStatus)}；收据账本：${receiptLedgerStatusLabel(report.calculationSource.receiptLedgerStatus)}`}
          >
            <span>本命来源：冻结 Revision 结构绑定已核对</span>
            <strong>下游来源：{downstreamSourceLabel(report.calculationSource.downstreamSource)}</strong>
            <small>{comparisonStatusLabel(report.calculationSource.comparisonStatus)} · {receiptLedgerStatusLabel(report.calculationSource.receiptLedgerStatus)} · 专家证据未核验</small>
          </div>

          <div className="single-chart-pillar-grid">
            {report.pillars.map((pillar) => (
              <article key={pillar.key} data-pillar={pillar.key}>
                <span>{pillar.label}</span>
                <strong>{pillar.ganZhi}</strong>
                <dl>
                  <div><dt>十神</dt><dd>{pillar.stemTenGod}</dd></div>
                  <div><dt>藏干</dt><dd>{pillar.hiddenStems}</dd></div>
                  <div><dt>纳音</dt><dd>{pillar.nayin}</dd></div>
                  <div><dt>旬空</dt><dd>{pillar.xun} · {pillar.voidBranches}</dd></div>
                </dl>
              </article>
            ))}
          </div>

          <dl className="single-chart-summary-meta">
            {summaryRows.map((item) => (
              <div key={`summary:${item.label}`}><dt>{item.label}</dt><dd>{item.value || "—"}</dd></div>
            ))}
          </dl>

          <div className="single-chart-report-evidence-summary">
            <div data-evidence-metric="provenance"><span>字段来源</span><strong>{report.provenance.length}</strong><small>条可追溯字段</small></div>
            <div data-evidence-metric="verified"><span>结构化核验</span><strong>{citationCounts.verified}</strong><small>已核验引用，非专家结论</small></div>
            <div data-evidence-metric="candidate"><span>用户候选</span><strong>{citationCounts.user_candidate}</strong><small>不会升级为核验</small></div>
            <div data-evidence-metric="rejected"><span>反证 / 拒绝</span><strong>{citationCounts.rejected}</strong><small>原样保留</small></div>
            <div data-evidence-metric="interpretation-total"><span>叙事证据句</span><strong>{report.interpretationEvidence.coverage.statementsTotal}</strong><small>逐句工程忠实度账</small></div>
            <div data-evidence-metric="interpretation-displayable"><span>可展示句</span><strong>{report.interpretationEvidence.coverage.displayable}</strong><small>规范渲染器精确匹配</small></div>
            <div data-evidence-metric="interpretation-withheld"><span>withheld</span><strong>{report.interpretationEvidence.coverage.withheld}</strong><small>正文不会进入报告</small></div>
          </div>

          {!report.anonymized && report.citations.length > 0 ? (
            <div className="single-chart-summary-citations">
              <h2>必要引用摘要</h2>
              {report.citations.slice(0, 3).map((citation) => (
                <p key={`summary:${citation.reference}`}>
                  <strong>{citation.reference}</strong>
                  <CitationStatus status={citation.status} label={citation.statusLabel} />
                  <span>{citation.source.title} · {citation.locator}</span>
                </p>
              ))}
              {report.citations.length > 3 ? <small>另有 {report.citations.length - 3} 条，见报告正文。</small> : null}
            </div>
          ) : (
            <p className="single-chart-summary-redaction">
              {report.anonymized ? "结构化本地文献引用已按匿名策略移除。" : "当前单盘尚无结构化文献引用。"}
            </p>
          )}

          {!report.anonymized && report.eventTimeDerivations.length > 0 ? (
            <div className="single-chart-summary-derivations">
              <div><span>事件时间迁移血缘</span><strong>{report.eventTimeDerivations.length} 条显式派生凭证</strong></div>
              <small>源/目标快照摘要、研究谱系与 IANA/DST/UTC 解释见报告正文。</small>
            </div>
          ) : null}

          <footer>
            <span>{report.privacyWarning}</span>
            <span>{report.caseReference} · {report.revisionReference}</span>
          </footer>
        </section>

        <SingleChartReportIndex items={reportIndexItems} />

        <div className="single-chart-report-body">
          <div id={reportSectionIds.body} className="single-chart-report-two-column">
            <ReportRows title="案例与修订" rows={report.caseRows} />
            <ReportRows title="出生输入" rows={report.birthRows} />
          </div>
          <ReportRows title="时间校准" rows={report.calibrationRows} />
          <div className="single-chart-report-two-column">
            <ReportRows title="规则快照" rows={report.ruleRows} />
            <ReportRows title="计算完整性" rows={report.integrityRows} />
          </div>
          <CalculationSourceSection id={reportSectionIds.calculation} source={report.calculationSource} anonymized={report.anonymized} />

          <section id={reportSectionIds.pillars} className="single-chart-report-section" aria-label="完整四柱事实">
            <h2>完整四柱事实</h2>
            <div className="single-chart-pillar-facts-grid">
              {report.pillars.map((pillar) => (
                <article key={`facts:${pillar.key}`} data-pillar={pillar.key} aria-label={`${pillar.label}完整事实`}>
                  <header><span>{pillar.label}</span><strong>{pillar.ganZhi}</strong></header>
                  <dl>
                    <div><dt>干十神</dt><dd>{pillar.stemTenGod}</dd></div>
                    <div><dt>藏干</dt><dd>{pillar.hiddenStems}</dd></div>
                    <div><dt>支十神</dt><dd>{pillar.branchTenGods}</dd></div>
                    <div><dt>五行</dt><dd>{pillar.wuXing}</dd></div>
                    <div><dt>纳音</dt><dd>{pillar.nayin}</dd></div>
                    <div><dt>长生</dt><dd>{pillar.twelveGrowth}</dd></div>
                    <div><dt>旬</dt><dd>{pillar.xun}</dd></div>
                    <div><dt>空亡</dt><dd>{pillar.voidBranches}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          </section>

          <InterpretationEvidenceSection
            id={reportSectionIds.interpretation}
            evidence={report.interpretationEvidence}
            anonymized={report.anonymized}
          />

          <section id={reportSectionIds.provenance} className="single-chart-report-section single-chart-report-flow-section single-chart-provenance-section">
            <h2 className="single-chart-section-heading"><span>字段来源与核验状态</span><small>{report.provenance.length} 条</small></h2>
            <p className="sr-only" id={provenanceInstructionsId}>字段来源表可横向滚动；每行依次列出字段、来源类型、算法或规则、核验状态与来源备注。</p>
            <div className="single-chart-provenance-table" role="table" aria-label="字段来源与核验状态" aria-describedby={provenanceInstructionsId} tabIndex={0}>
              <div role="row">
                <strong role="columnheader">字段</strong>
                <span role="columnheader">来源类型</span>
                <span role="columnheader">算法 / 规则</span>
                <span role="columnheader">核验状态</span>
                <small role="columnheader">来源引用 / 备注</small>
              </div>
              {report.provenance.map((item) => (
                <div role="row" key={item.field} data-verification-status={item.verificationStatus}>
                  <strong role="cell">{item.field}</strong>
                  <span role="cell">{item.kind}</span>
                  <span role="cell">{item.algorithmId}</span>
                  <span role="cell">{item.verificationStatus}</span>
                  <small role="cell">{item.sourceRefs.join("；") || "—"}{item.note ? ` · ${item.note}` : ""}</small>
                </div>
              ))}
            </div>
          </section>

          <section id={reportSectionIds.research} className="single-chart-report-section single-chart-report-flow-section">
            <h2 className="single-chart-section-heading"><span>研究笔记与真实事件</span><small>{report.researchNotes.length + report.events.length} 条</small></h2>
            {report.anonymized ? (
              <p className="single-chart-report-empty">匿名模式已移除研究笔记、事件日期、正文与节点引用。</p>
            ) : (
              <div className="single-chart-research-grid">
                {[
                  ...report.researchNotes.map((entry) => ({ kind: "note" as const, entry })),
                  ...report.events.map((entry) => ({ kind: "event" as const, entry }))
                ].map(({ kind, entry }) => (
                  <article key={`${kind}:${entry.reference}`}>
                    <small>{entry.reference}</small>
                    <h3>{entry.title}</h3>
                    <p>{entry.body}</p>
                    <dl>{entry.meta.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
                    {entry.sourceRefs.length ? <footer>旧来源字符串：{entry.sourceRefs.join("；")}</footer> : null}
                  </article>
                ))}
                {!report.researchNotes.length && !report.events.length ? <p className="single-chart-report-empty">当前单盘没有研究笔记或真实事件。</p> : null}
              </div>
            )}
          </section>

          <section id={reportSectionIds.migrations} className="single-chart-report-section single-chart-report-flow-section">
            <h2 className="single-chart-section-heading"><span>事件时间迁移血缘</span><small>{report.eventTimeDerivations.length} 条</small></h2>
            {report.anonymized ? (
              <p className="single-chart-report-empty">匿名模式已移除事件时间上下文与迁移凭证。</p>
            ) : (
              <div className="single-chart-event-time-derivations">
                {report.eventTimeDerivations.map((derivation) => (
                  <EventTimeDerivationCard key={derivation.reference} derivation={derivation} />
                ))}
                {!report.eventTimeDerivations.length ? <p className="single-chart-report-empty">当前单盘没有事件时间迁移凭证。</p> : null}
              </div>
            )}
          </section>

          <section id={reportSectionIds.citations} className="single-chart-report-section single-chart-report-flow-section">
            <h2 className="single-chart-section-heading"><span>结构化引用与权利状态</span><small>{report.citations.length} 条</small></h2>
            {!report.anonymized ? (
              <aside className="single-chart-interpretation-boundary" role="note">
                <strong>状态是机械治理投影，不是内容或发布真值</strong>
                <p>verified 只表示当前 Citation 复核状态；redistributableSourceRights 是报告内机械投影。本机构建还要求 SourceCarrier material gate，但独立解析 v1.7 文本不能重演该门。redistributable 不等于内容正确、专家审定、科学有效或公开发布授权，也不认证 Citation 所指资料就是 registry 来源。</p>
              </aside>
            ) : null}
            {report.anonymized ? (
              <p className="single-chart-report-empty">匿名模式已移除本地文献身份、引文、定位和审查记录。</p>
            ) : (
              <div className="single-chart-citation-list">
                {report.citations.map((citation) => (
                  <article key={citation.reference} className={`single-chart-citation single-chart-citation--${citation.status}`}>
                    <header>
                      <strong>{citation.reference} · {citation.source.title}</strong>
                      <CitationStatus status={citation.status} label={citation.statusLabel} />
                    </header>
                    <blockquote>{citation.quote}</blockquote>
                    <p>{citation.annotation || "无批注"}</p>
                    <dl>
                      <div><dt>目标</dt><dd>{citation.targets.join("；") || "—"}</dd></div>
                      <div><dt>证据主题</dt><dd>{citation.evidenceSubjectIds.join("；") || "—"}</dd></div>
                      <div><dt>本报告资料引用</dt><dd><code>{citation.source.documentReference}</code></dd></div>
                      <div><dt>定位</dt><dd>{citation.locator}</dd></div>
                      <div><dt>作者 / 版本</dt><dd>{citation.source.author || "—"} / {citation.source.edition || "—"}</dd></div>
                      <div><dt>出版信息</dt><dd>{citation.source.publisher || "—"} / {citation.source.publicationYear || "—"}</dd></div>
                      <div><dt>来源网址</dt><dd>{citation.source.sourceUrl || "—"}</dd></div>
                      <div><dt>正文哈希</dt><dd>{citation.source.contentHash}</dd></div>
                      <div><dt>来源类型</dt><dd><code>{citation.source.origin}</code></dd></div>
                      <div><dt>权利</dt><dd>{citation.source.rightsStatus} · {citation.source.workStatus} · {citation.source.editionStatus}</dd></div>
                      <div><dt>分发 / 复核</dt><dd>{citation.source.distributionPolicy} · {citation.source.reviewStatus} · {citation.reviewerCount} 人</dd></div>
                      <div><dt>机械可再分发</dt><dd>{citation.source.redistributableSourceRights ? "是" : "否"}（不等于公开发布授权）</dd></div>
                      {citation.decisionNote ? <div><dt>决定说明</dt><dd>{citation.decisionNote}</dd></div> : null}
                    </dl>
                  </article>
                ))}
                {!report.citations.length ? <p className="single-chart-report-empty">当前单盘没有结构化引用。</p> : null}
              </div>
            )}
          </section>

          {report.redactions.length ? (
            <section id={reportSectionIds.redactions} className="single-chart-report-section single-chart-report-redactions">
              <h2 className="single-chart-section-heading"><span>匿名移除清单</span><small>{report.redactions.length} 条</small></h2>
              <ul>{report.redactions.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          ) : null}
        </div>
      </article>
    );
  }
);
