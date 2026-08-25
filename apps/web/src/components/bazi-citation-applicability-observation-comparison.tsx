import { FilePlus2, FolderOpen, LoaderCircle, PackageCheck, RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { sha256Hex } from "@hakimi/integrity";
import { pickTextFile, webReportExportPort } from "@hakimi/platform";
import type {
  LocalBaziCitationApplicabilityObservationComparisonProjection,
  LocalBaziCitationApplicabilityObservationPairLifecyclePreparedFile
} from "../lib/bazi-citation-review-context";
import type { KnowledgeReviewContextLocator } from "../lib/knowledge-route";
import type { PreparedFileArtifact } from "./prepared-file-delivery-dialog";
import { PreparedFileDeliveryLoadBoundary } from "./prepared-file-delivery-load-boundary";
import {
  getBaziCitationObservationLifecycleStoreOperationSnapshot,
  subscribeBaziCitationObservationLifecycleStoreOperation
} from "./bazi-citation-observation-lifecycle-store-operation-coordinator";
import { StatusPill } from "./status-pill";
import "./bazi-citation-applicability-observation-comparison.css";

const PreparedFileDeliveryDialog = lazy(async () => {
  const module = await import("./prepared-file-delivery-dialog");
  return { default: module.PreparedFileDeliveryDialog };
});

const BaziCitationApplicabilityObservationLifecycleFileWorkbench = lazy(async () => {
  const module = await import("./bazi-citation-applicability-observation-lifecycle-file-workbench");
  return { default: module.BaziCitationApplicabilityObservationLifecycleFileWorkbench };
});

export interface BaziCitationApplicabilityObservationComparisonBinding {
  locator: KnowledgeReviewContextLocator;
  contextPayloadSha256: string;
  displayContextBindingSha256: string;
  worksetSnapshotSha256: string;
  matchingSourceSetSha256: string;
}

export interface BaziCitationApplicabilityObservationComparisonCitation {
  citationId: string;
  title: string;
}

type SelectedFile = Readonly<{ name: string; text: string }>;
type Slot = "slot_a" | "slot_b";
type ObservationStatus =
  | "unobserved"
  | "applicable_in_bound_context"
  | "partially_applicable_in_bound_context"
  | "not_applicable_in_bound_context"
  | "insufficient_bound_context";

type ComparisonDisplay = Readonly<{
  records: readonly [
    Readonly<{
      slot: "slot_a";
      selfDeclaredReviewerIdSha256: string;
      recordSha256: string;
    }>,
    Readonly<{
      slot: "slot_b";
      selfDeclaredReviewerIdSha256: string;
      recordSha256: string;
    }>
  ];
  items: readonly Readonly<{
    order: number;
    citationId: string;
    title: string;
    slotAObservation: ObservationStatus;
    slotBObservation: ObservationStatus;
    relation: "same_declared_status" | "different_declared_status";
  }>[];
  counts: Readonly<{
    total: number;
    sameDeclaredStatus: number;
    differentDeclaredStatus: number;
  }>;
  recordSetSha256: string;
}>;

const INITIAL_VISIBLE_ITEMS = 8;
const VISIBLE_ITEM_STEP = 8;
const RECORD_SET_DIGEST_DOMAIN = "hakimi.bazi.citation_applicability_observation_comparison.record_set/1";
const MAX_PROJECTION_DEPTH = 24;
const MAX_PROJECTION_NODES = 12_000;
const MAX_PROJECTION_KEYS = 20_000;
const MAX_PROJECTION_TEXT_CHARACTERS = 600_000;
const MAX_PREPARED_PROJECTION_TEXT_CHARACTERS = 3 * 1024 * 1024;
const MAX_OBSERVATION_FILE_BYTES = 512 * 1024;
const MAX_PREPARED_LIFECYCLE_FILE_BYTES = 2 * 1024 * 1024;
const PREPARED_LIFECYCLE_FILENAME = "hakimi-bazi-citation-applicability-observation-pair-lifecycle-v01.json";
const SHA256 = /^[a-f0-9]{64}$/u;
const UNSAFE_TEXT = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const OBSERVATION_STATUSES = new Set<ObservationStatus>([
  "unobserved",
  "applicable_in_bound_context",
  "partially_applicable_in_bound_context",
  "not_applicable_in_bound_context",
  "insufficient_bound_context"
]);
const expectedProfile = Object.freeze({
  projectionVersion: "hakimi.web.local_bazi_citation_applicability_observation_comparison/0.1.0",
  contentVersion: "0.1.0",
  scope: "one_fresh_context_reread_two_file_mechanical_side_by_side_projection",
  contextPolicy: "one_fresh_two_pass_read_must_bind_both_files_and_match_previously_displayed_context_digest",
  comparisonPolicy: "record_digest_sorted_declared_status_equality_only_without_winner_ranking_consensus_or_resolution",
  distinctnessPolicy: "different_record_reviewer_id_and_identity_reference_without_identity_or_independence_verification",
  mutationPolicy: "no_storage_chart_case_or_revision_write",
  reviewerIdentityVerified: false,
  reviewerIndependenceVerified: false,
  expertTruthClaimed: false,
  scientificValidityClaimed: false,
  formalActivationAllowed: false,
  automaticPromotionAllowed: false
});
const expectedBoundary = Object.freeze({
  contextFreshRereadPerformed: true,
  priorDisplayedContextDigestMatched: true,
  sameFreshContextSnapshotUsedForBoth: true,
  inputOrderAffectsProjection: false,
  suppliedCurrentContextDigestMatched: true,
  mechanicalStatusEqualityCompared: true,
  freeformObservationTextReturnedToUi: false,
  identityEvidenceReferenceReturnedToUi: false,
  identityVerified: false,
  reviewerIndependenceVerified: false,
  humanReviewAuthenticityVerified: false,
  citationSemanticApplicabilityAssessed: false,
  semanticConflictResolutionPerformed: false,
  winnerSelectionPerformed: false,
  rankingPerformed: false,
  consensusClaimed: false,
  currentAtReturnAttested: false,
  eligibleForFormalActivation: false,
  formalActivationAllowed: false,
  automaticPromotionAllowed: false,
  storageMutationPerformed: false,
  chartMutationPerformed: false,
  caseOrRevisionMutationPerformed: false,
  mutationEpochRevalidationPerformed: false,
  mutationEpochBypassed: false,
  networkTransmissionPerformed: false,
  publicExportAuthorized: false,
  publicReleaseAuthorized: false,
  expertTruthClaimed: false,
  scientificValidityClaimed: false
});
const expectedPreparedProfile = Object.freeze({
  projectionVersion: "hakimi.web.local_bazi_citation_applicability_observation_pair_lifecycle_preparation/0.1.0",
  contentVersion: "0.1.0",
  scope: "one_fresh_context_reread_two_complete_files_and_one_deterministic_sensitive_local_sidecar",
  contextPolicy: "one_fresh_two_pass_read_must_match_previously_displayed_context_digest",
  filePolicy: "explicit_leaf_owned_blocked_sensitive_preparation_without_persistence_or_delivery_attestation",
  mutationPolicy: "read_only_repository_reread_without_storage_chart_case_revision_or_rule_pack_write",
  requiredSharePolicy: "blocked_sensitive",
  reviewerIdentityVerified: false,
  reviewerIndependenceVerified: false,
  reviewerWithdrawalAuthorityVerified: false,
  expertTruthClaimed: false,
  scientificValidityClaimed: false,
  formalActivationAllowed: false,
  automaticPromotionAllowed: false
});
const expectedPreparedBoundary = Object.freeze({
  explicitUserPreparationActionRequired: true,
  contextFreshRereadPerformed: true,
  priorDisplayedContextDigestMatched: true,
  sameFreshContextSnapshotUsedForBoth: true,
  lifecycleSidecarCreatedAndReinspected: true,
  currentContextDigestMatchedDuringPreparation: true,
  currentAtReturnAttested: false,
  containsDerivedSensitiveChartBinding: true,
  containsUntrustedReviewerFreeformText: true,
  requiredSharePolicy: "blocked_sensitive",
  storageReadPerformed: true,
  formalStoreUsed: false,
  localFilePersistencePerformed: false,
  preparedFileDeliveryPerformed: false,
  networkTransmissionPerformed: false,
  storageMutationPerformed: false,
  chartMutationPerformed: false,
  caseOrRevisionMutationPerformed: false,
  rulePackMutationPerformed: false,
  mutationEpochRevalidationPerformed: false,
  mutationEpochBypassed: false,
  reviewerIdentityVerified: false,
  reviewerIndependenceVerified: false,
  reviewerWithdrawalAuthorityVerified: false,
  semanticConflictResolutionPerformed: false,
  winnerSelectionPerformed: false,
  consensusClaimed: false,
  publicExportAuthorized: false,
  publicReleaseAuthorized: false,
  expertTruthClaimed: false,
  scientificValidityClaimed: false,
  formalActivationAllowed: false,
  automaticPromotionAllowed: false
});

const statusLabels: Record<ObservationStatus, string> = {
  unobserved: "记录声明：未观察",
  applicable_in_bound_context: "记录声明：在该冻结绑定上下文内适用",
  partially_applicable_in_bound_context: "记录声明：在该冻结绑定上下文内部分适用",
  not_applicable_in_bound_context: "记录声明：在该冻结绑定上下文内不适用",
  insufficient_bound_context: "记录声明：该冻结绑定上下文不足"
};

function sameObject(left: object, right: object): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key) => Object.prototype.hasOwnProperty.call(right, key)
      && Object.is((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]));
}

function hasExactKeys(value: object, expectedKeys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

interface ProjectionCaptureBudget {
  nodes: number;
  keys: number;
  textCharacters: number;
  textCharacterLimit: number;
}

function captureDeclarativeProjection(
  value: unknown,
  depth = 0,
  budget: ProjectionCaptureBudget = {
    nodes: 0,
    keys: 0,
    textCharacters: 0,
    textCharacterLimit: MAX_PROJECTION_TEXT_CHARACTERS
  },
  ancestors = new WeakSet<object>()
): unknown {
  budget.nodes += 1;
  if (depth > MAX_PROJECTION_DEPTH || budget.nodes > MAX_PROJECTION_NODES) throw new Error("budget");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("number");
    return value;
  }
  if (typeof value === "string") {
    budget.textCharacters += value.length;
    if (budget.textCharacters > budget.textCharacterLimit || UNSAFE_TEXT.test(value)) {
      throw new Error("text");
    }
    return value;
  }
  if (typeof value !== "object" || ancestors.has(value)) throw new Error("shape");
  const array = Array.isArray(value);
  const prototype = Object.getPrototypeOf(value);
  if ((array && prototype !== Array.prototype)
    || (!array && prototype !== Object.prototype && prototype !== null)) throw new Error("prototype");
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string")) throw new Error("symbol");
  const stringKeys = ownKeys as string[];
  budget.keys += stringKeys.length;
  if (budget.keys > MAX_PROJECTION_KEYS) throw new Error("keys");
  for (const key of stringKeys) {
    budget.textCharacters += key.length;
    if (FORBIDDEN_KEYS.has(key) || key.length > 256 || budget.textCharacters > budget.textCharacterLimit) {
      throw new Error("key");
    }
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  ancestors.add(value);
  try {
    if (array) {
      if (value.length > 128 || stringKeys.length !== value.length + 1 || !stringKeys.includes("length")) {
        throw new Error("array");
      }
      const result: unknown[] = [];
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
          throw new Error("array descriptor");
        }
        result.push(captureDeclarativeProjection(
          descriptor.value,
          depth + 1,
          budget,
          ancestors
        ));
      }
      return result;
    }
    if (stringKeys.length > 128) throw new Error("object");
    const result = Object.create(null) as Record<string, unknown>;
    for (const key of stringKeys) {
      const descriptor = descriptors[key];
      if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
        throw new Error("object descriptor");
      }
      result[key] = captureDeclarativeProjection(
        descriptor.value,
        depth + 1,
        budget,
        ancestors
      );
    }
    return result;
  } finally {
    ancestors.delete(value);
  }
}

function boundedFileName(value: string): string {
  const normalized = value.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/gu, "").trim();
  return normalized.slice(0, 160) || "未命名 JSON 文件";
}

function shortDigest(value: string): string {
  return `${value.slice(0, 10)}…${value.slice(-6)}`;
}

async function projectComparison(
  rawProjection: unknown,
  binding: BaziCitationApplicabilityObservationComparisonBinding,
  citations: readonly BaziCitationApplicabilityObservationComparisonCitation[]
): Promise<ComparisonDisplay> {
  const raw = captureDeclarativeProjection(
    rawProjection
  ) as LocalBaziCitationApplicabilityObservationComparisonProjection;
  if (
    !raw
    || typeof raw !== "object"
    || !hasExactKeys(raw, [
      "profile",
      "binding",
      "records",
      "items",
      "counts",
      "distinctness",
      "recordSetSha256",
      "boundary"
    ])
    || !sameObject(raw.profile, expectedProfile)
  ) throw new Error("profile");
  const expectedBinding = {
    caseId: binding.locator.caseId,
    revisionId: binding.locator.revisionId,
    evidenceSubjectId: binding.locator.evidenceSubjectId,
    fieldPath: binding.locator.fieldPath,
    contextPayloadSha256: binding.contextPayloadSha256,
    displayContextBindingSha256: binding.displayContextBindingSha256,
    worksetSnapshotSha256: binding.worksetSnapshotSha256,
    matchingSourceSetSha256: binding.matchingSourceSetSha256,
    citationCount: citations.length
  };
  if (!sameObject(raw.binding, expectedBinding) || !sameObject(raw.boundary, expectedBoundary)) {
    throw new Error("binding");
  }
  if (
    !Array.isArray(raw.records)
    || raw.records.length !== 2
    || raw.records[0].slot !== "slot_a"
    || raw.records[1].slot !== "slot_b"
    || !raw.records.every((record) => (
      hasExactKeys(record, [
        "slot",
        "selfDeclaredReviewerIdSha256",
        "counts",
        "observedCount",
        "allCitationsObserved",
        "reviewerAttributionComplete",
        "identityEvidenceReferencePresent",
        "recordSha256"
      ])
      && hasExactKeys(record.counts, [
        "total",
        "unobserved",
        "applicableInBoundContext",
        "partiallyApplicableInBoundContext",
        "notApplicableInBoundContext",
        "insufficientBoundContext"
      ])
      && record.reviewerAttributionComplete === true
      && record.identityEvidenceReferencePresent === true
      && record.allCitationsObserved === true
      && record.observedCount === citations.length
      && record.counts.total === citations.length
      && record.counts.unobserved === 0
      && Number.isInteger(record.counts.applicableInBoundContext)
      && Number.isInteger(record.counts.partiallyApplicableInBoundContext)
      && Number.isInteger(record.counts.notApplicableInBoundContext)
      && Number.isInteger(record.counts.insufficientBoundContext)
      && record.counts.applicableInBoundContext >= 0
      && record.counts.partiallyApplicableInBoundContext >= 0
      && record.counts.notApplicableInBoundContext >= 0
      && record.counts.insufficientBoundContext >= 0
      && record.counts.applicableInBoundContext
        + record.counts.partiallyApplicableInBoundContext
        + record.counts.notApplicableInBoundContext
        + record.counts.insufficientBoundContext === citations.length
      && SHA256.test(record.recordSha256)
      && SHA256.test(record.selfDeclaredReviewerIdSha256)
    ))
    || raw.records[0].recordSha256 === raw.records[1].recordSha256
    || raw.records[0].selfDeclaredReviewerIdSha256 === raw.records[1].selfDeclaredReviewerIdSha256
    || raw.records[0].recordSha256 >= raw.records[1].recordSha256
  ) throw new Error("records");
  if (
    !hasExactKeys(raw.distinctness, [
      "recordDigestsDistinct",
      "selfDeclaredReviewerIdsDistinct",
      "selfDeclaredIdentityEvidenceReferencesDistinct",
      "reviewerIdentityVerified",
      "reviewerIndependenceVerified"
    ])
    || raw.distinctness.recordDigestsDistinct !== true
    || raw.distinctness.selfDeclaredReviewerIdsDistinct !== true
    || raw.distinctness.selfDeclaredIdentityEvidenceReferencesDistinct !== true
    || raw.distinctness.reviewerIdentityVerified !== false
    || raw.distinctness.reviewerIndependenceVerified !== false
    || !SHA256.test(raw.recordSetSha256)
  ) throw new Error("distinctness");
  const expectedRecordSetSha256 = await sha256Hex({
    domain: RECORD_SET_DIGEST_DOMAIN,
    contextPayloadSha256: binding.contextPayloadSha256,
    recordSha256Set: [raw.records[0].recordSha256, raw.records[1].recordSha256]
  });
  if (raw.recordSetSha256 !== expectedRecordSetSha256) throw new Error("record set digest");
  if (
    !hasExactKeys(raw.counts, ["total", "sameDeclaredStatus", "differentDeclaredStatus"])
    || !Array.isArray(raw.items)
    || raw.items.length !== citations.length
  ) throw new Error("items");
  const items = raw.items.map((item, index) => {
    const citation = citations[index];
    if (
      !citation
      || !hasExactKeys(item, [
        "order",
        "citationId",
        "slotAObservation",
        "slotBObservation",
        "relation"
      ])
      || item.order !== index + 1
      || item.citationId !== citation.citationId
      || !OBSERVATION_STATUSES.has(item.slotAObservation)
      || !OBSERVATION_STATUSES.has(item.slotBObservation)
      || item.slotAObservation === "unobserved"
      || item.slotBObservation === "unobserved"
    ) throw new Error("item");
    const expectedRelation = item.slotAObservation === item.slotBObservation
      ? "same_declared_status"
      : "different_declared_status";
    if (item.relation !== expectedRelation) throw new Error("relation");
    return Object.freeze({
      order: item.order,
      citationId: item.citationId,
      title: citation.title,
      slotAObservation: item.slotAObservation,
      slotBObservation: item.slotBObservation,
      relation: item.relation
    });
  });
  const sameDeclaredStatus = items.filter((item) => item.relation === "same_declared_status").length;
  const differentDeclaredStatus = items.length - sameDeclaredStatus;
  if (
    raw.counts.total !== items.length
    || raw.counts.sameDeclaredStatus !== sameDeclaredStatus
    || raw.counts.differentDeclaredStatus !== differentDeclaredStatus
  ) throw new Error("counts");
  const records: ComparisonDisplay["records"] = Object.freeze([
    Object.freeze({
      slot: "slot_a" as const,
      selfDeclaredReviewerIdSha256: raw.records[0].selfDeclaredReviewerIdSha256,
      recordSha256: raw.records[0].recordSha256
    }),
    Object.freeze({
      slot: "slot_b" as const,
      selfDeclaredReviewerIdSha256: raw.records[1].selfDeclaredReviewerIdSha256,
      recordSha256: raw.records[1].recordSha256
    })
  ] as const);
  return Object.freeze({
    records,
    items: Object.freeze(items),
    counts: Object.freeze({ total: items.length, sameDeclaredStatus, differentDeclaredStatus }),
    recordSetSha256: raw.recordSetSha256
  });
}

async function projectPreparedLifecycle(
  rawPreparedFile: unknown,
  binding: BaziCitationApplicabilityObservationComparisonBinding,
  citations: readonly BaziCitationApplicabilityObservationComparisonCitation[]
): Promise<Readonly<{
  display: ComparisonDisplay;
  artifact: PreparedFileArtifact;
}>> {
  const raw = captureDeclarativeProjection(
    rawPreparedFile,
    0,
    {
      nodes: 0,
      keys: 0,
      textCharacters: 0,
      textCharacterLimit: MAX_PREPARED_PROJECTION_TEXT_CHARACTERS
    }
  ) as LocalBaziCitationApplicabilityObservationPairLifecyclePreparedFile;
  if (
    !raw
    || typeof raw !== "object"
    || !hasExactKeys(raw, [
      "profile",
      "fileName",
      "content",
      "contentBytes",
      "ledgerId",
      "recordSetSha256",
      "sidecarSha256",
      "comparison",
      "boundary"
    ])
    || !sameObject(raw.profile, expectedPreparedProfile)
    || !sameObject(raw.boundary, expectedPreparedBoundary)
    || raw.fileName !== PREPARED_LIFECYCLE_FILENAME
    || typeof raw.content !== "string"
    || raw.content.length > MAX_PREPARED_LIFECYCLE_FILE_BYTES
    || !Number.isInteger(raw.contentBytes)
    || raw.contentBytes < 1
    || raw.contentBytes > MAX_PREPARED_LIFECYCLE_FILE_BYTES
    || !SHA256.test(raw.ledgerId)
    || !SHA256.test(raw.recordSetSha256)
    || !SHA256.test(raw.sidecarSha256)
  ) throw new Error("prepared lifecycle wrapper");
  const contentBytes = new TextEncoder().encode(raw.content).byteLength;
  if (contentBytes !== raw.contentBytes) throw new Error("prepared lifecycle bytes");
  const display = await projectComparison(raw.comparison, binding, citations);
  if (display.recordSetSha256 !== raw.recordSetSha256) {
    throw new Error("prepared lifecycle comparison digest");
  }
  const { inspectBaziCitationApplicabilityObservationPairLifecycleSidecar } = await import(
    "@hakimi/bazi-review-context"
  );
  const inspection = await inspectBaziCitationApplicabilityObservationPairLifecycleSidecar(
    raw.content
  );
  const [firstRecord, secondRecord] = inspection.sidecar.records;
  if (
    inspection.structurallyCompletePair !== true
    || inspection.pairComparisonAllowed !== false
    || inspection.recordedNotWithheldCount !== 2
    || inspection.withheldRecordCount !== 0
    || inspection.sidecar.ledgerId !== raw.ledgerId
    || inspection.sidecar.integrity.sidecarSha256 !== raw.sidecarSha256
    || inspection.sidecar.contextBinding.releaseIdentity.dbGeneration !== "legacy-v13"
    || inspection.sidecar.contextBinding.releaseIdentity.targetSchema !== 13
    || inspection.sidecar.contextBinding.releaseIdentity.migrationId !== null
    || inspection.sidecar.contextBinding.contextPayloadSha256 !== binding.contextPayloadSha256
    || inspection.sidecar.contextBinding.displayContextBindingSha256 !== binding.displayContextBindingSha256
    || inspection.sidecar.contextBinding.recordSetSha256 !== raw.recordSetSha256
    || firstRecord.recordSha256 !== display.records[0].recordSha256
    || secondRecord.recordSha256 !== display.records[1].recordSha256
  ) throw new Error("prepared lifecycle sidecar");
  const blob = new Blob([raw.content], { type: "application/json;charset=utf-8" });
  if (blob.size !== raw.contentBytes) throw new Error("prepared lifecycle blob");
  return Object.freeze({
    display,
    artifact: Object.freeze({
      blob,
      filename: PREPARED_LIFECYCLE_FILENAME,
      title: "双观察生命周期敏感本机文件",
      description: "包含两份完整观察自由文本与冻结上下文派生绑定，文件未加密。生命周期状态只是本机 sidecar 链内标记，不证明已保存、物理删除、旧副本召回、观察者身份或撤下权威，也不构成术数内容结论、正式激活或公开发布授权。",
      sharePolicy: "blocked_sensitive" as const
    })
  });
}

async function pickCurrentObservationFile(): Promise<Readonly<{ name: string; text: string }> | null> {
  return pickTextFile({ accept: ".json,application/json", maxBytes: 512 * 1024 });
}

async function preflightCurrentComparison(
  locator: KnowledgeReviewContextLocator,
  expectedPriorContextPayloadSha256: string,
  slotAFileText: string,
  slotBFileText: string
): Promise<LocalBaziCitationApplicabilityObservationComparisonProjection> {
  const { preflightCurrentLocalBaziCitationApplicabilityObservationComparison } = await import(
    "../lib/bazi-citation-review-context"
  );
  return preflightCurrentLocalBaziCitationApplicabilityObservationComparison(
    locator,
    expectedPriorContextPayloadSha256,
    slotAFileText,
    slotBFileText
  );
}

async function prepareCurrentPairLifecycle(
  locator: KnowledgeReviewContextLocator,
  expectedPriorContextPayloadSha256: string,
  slotAFileText: string,
  slotBFileText: string
): Promise<unknown> {
  const { prepareCurrentLocalBaziCitationApplicabilityObservationPairLifecycle } = await import(
    "../lib/bazi-citation-review-context"
  );
  return prepareCurrentLocalBaziCitationApplicabilityObservationPairLifecycle(
    locator,
    expectedPriorContextPayloadSha256,
    slotAFileText,
    slotBFileText
  );
}

export function BaziCitationApplicabilityObservationComparison({
  binding,
  citations
}: {
  binding: BaziCitationApplicabilityObservationComparisonBinding;
  citations: readonly BaziCitationApplicabilityObservationComparisonCitation[];
}) {
  const leafIdentity = JSON.stringify([
    binding.locator.caseId,
    binding.locator.revisionId,
    binding.locator.evidenceSubjectId,
    binding.locator.fieldPath,
    binding.contextPayloadSha256,
    binding.displayContextBindingSha256,
    binding.worksetSnapshotSha256,
    binding.matchingSourceSetSha256,
    citations.map((citation) => [citation.citationId, citation.title])
  ]);
  return (
    <BaziCitationApplicabilityObservationComparisonLeaf
      key={leafIdentity}
      binding={binding}
      citations={citations}
    />
  );
}

function BaziCitationApplicabilityObservationComparisonLeaf({
  binding,
  citations
}: {
  binding: BaziCitationApplicabilityObservationComparisonBinding;
  citations: readonly BaziCitationApplicabilityObservationComparisonCitation[];
}) {
  const [slotAFile, setSlotAFile] = useState<SelectedFile | null>(null);
  const [slotBFile, setSlotBFile] = useState<SelectedFile | null>(null);
  const [busySlot, setBusySlot] = useState<Slot | null>(null);
  const [running, setRunning] = useState(false);
  const [runningAction, setRunningAction] = useState<"compare" | "prepare" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [display, setDisplay] = useState<ComparisonDisplay | null>(null);
  const [preparedArtifact, setPreparedArtifact] = useState<PreparedFileArtifact | null>(null);
  const [lifecycleWorkbenchOpen, setLifecycleWorkbenchOpen] = useState(false);
  const [visibleItemLimit, setVisibleItemLimit] = useState(INITIAL_VISIBLE_ITEMS);
  const lifecycleStoreOperationSnapshot = useSyncExternalStore(
    subscribeBaziCitationObservationLifecycleStoreOperation,
    getBaziCitationObservationLifecycleStoreOperationSnapshot,
    getBaziCitationObservationLifecycleStoreOperationSnapshot
  );
  const lifecycleStoreCloseBlocked = lifecycleStoreOperationSnapshot.status === "writing"
    || lifecycleStoreOperationSnapshot.status === "reconciliation_required";
  const mountedRef = useRef(true);
  const operationTokenRef = useRef(0);
  const slotAButtonRef = useRef<HTMLButtonElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      operationTokenRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (display && !preparedArtifact) resultRef.current?.focus();
  }, [display, preparedArtifact]);

  const chooseFile = async (slot: Slot) => {
    if (busySlot || running || display) return;
    const token = operationTokenRef.current + 1;
    operationTokenRef.current = token;
    setBusySlot(slot);
    setError(null);
    try {
      const file = await pickCurrentObservationFile();
      if (!mountedRef.current || operationTokenRef.current !== token || !file) return;
      if (
        typeof file.name !== "string"
        || typeof file.text !== "string"
        || file.text.length > MAX_OBSERVATION_FILE_BYTES
        || new TextEncoder().encode(file.text).byteLength > MAX_OBSERVATION_FILE_BYTES
      ) throw new Error("invalid local file projection");
      const selected = Object.freeze({ name: boundedFileName(file.name), text: file.text });
      if (slot === "slot_a") setSlotAFile(selected);
      else setSlotBFile(selected);
    } catch {
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      setError(`观察 ${slot === "slot_a" ? "A" : "B"} 文件没有进入页面会话选择。`);
    } finally {
      if (mountedRef.current && operationTokenRef.current === token) setBusySlot(null);
    }
  };

  const compare = async () => {
    if (!slotAFile || !slotBFile || busySlot || running || display) return;
    const token = operationTokenRef.current + 1;
    operationTokenRef.current = token;
    setRunning(true);
    setRunningAction("compare");
    setError(null);
    try {
      const raw = await preflightCurrentComparison(
        binding.locator,
        binding.contextPayloadSha256,
        slotAFile.text,
        slotBFile.text
      );
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      const projected = await projectComparison(raw, binding, citations);
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      setSlotAFile(null);
      setSlotBFile(null);
      setVisibleItemLimit(INITIAL_VISIBLE_ITEMS);
      setDisplay(projected);
    } catch {
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      setError("双份观察未通过同一冻结上下文、完整 citation、结构去重或永久只读边界预检；没有形成并列结果。");
    } finally {
      if (mountedRef.current && operationTokenRef.current === token) {
        setRunning(false);
        setRunningAction(null);
      }
    }
  };

  const prepareLifecycle = async () => {
    if (!slotAFile || !slotBFile || busySlot || running || display) return;
    const token = operationTokenRef.current + 1;
    operationTokenRef.current = token;
    setRunning(true);
    setRunningAction("prepare");
    setError(null);
    try {
      const raw = await prepareCurrentPairLifecycle(
        binding.locator,
        binding.contextPayloadSha256,
        slotAFile.text,
        slotBFile.text
      );
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      const prepared = await projectPreparedLifecycle(raw, binding, citations);
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      setSlotAFile(null);
      setSlotBFile(null);
      setVisibleItemLimit(INITIAL_VISIBLE_ITEMS);
      setDisplay(prepared.display);
      setPreparedArtifact(prepared.artifact);
    } catch {
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      setError("敏感生命周期文件未通过同一冻结上下文、完整双份记录、确定性摘要或永久只读边界预检；没有形成文件或并列结果。");
    } finally {
      if (mountedRef.current && operationTokenRef.current === token) {
        setRunning(false);
        setRunningAction(null);
      }
    }
  };

  const clear = () => {
    operationTokenRef.current += 1;
    setBusySlot(null);
    setRunning(false);
    setRunningAction(null);
    setSlotAFile(null);
    setSlotBFile(null);
    setDisplay(null);
    setPreparedArtifact(null);
    setError(null);
    setVisibleItemLimit(INITIAL_VISIBLE_ITEMS);
    requestAnimationFrame(() => slotAButtonRef.current?.focus());
  };

  const visibleItems = display?.items.slice(0, visibleItemLimit) ?? [];

  return (
    <section
      className="bazi-applicability-comparison"
      aria-label="双份引用适用性观察机械并列"
      data-comparison-ready={display ? "true" : "false"}
      data-reviewer-identity-verified="false"
      data-reviewer-independence-verified="false"
      data-winner-selection-performed="false"
      data-ranking-performed="false"
      data-consensus-claimed="false"
      data-storage-mutation-performed="false"
      data-network-transmission-performed="false"
      data-mutation-epoch-revalidation-performed="false"
      data-mutation-epoch-bypassed="false"
      data-public-release-authorized="false"
      data-sensitive-lifecycle-prepared-in-page-session={preparedArtifact ? "true" : "false"}
    >
      {preparedArtifact ? (
        <PreparedFileDeliveryLoadBoundary onClose={() => setPreparedArtifact(null)}>
          <Suspense fallback={<div role="status">正在载入本机交付确认…</div>}>
            <PreparedFileDeliveryDialog
              artifact={preparedArtifact}
              exportPort={webReportExportPort}
              onClose={() => setPreparedArtifact(null)}
            />
          </Suspense>
        </PreparedFileDeliveryLoadBoundary>
      ) : null}

      <header className="bazi-applicability-comparison__header">
        <div>
          <p className="eyebrow">Two local files · one fresh context reread</p>
          <h5>双份观察并列复核</h5>
          <p>要求两份文件完整覆盖 citation，并具有不同的记录摘要、自述 reviewerId 与自述身份材料引用。结果按记录摘要排序为规范记录 1/2；它只排除明显重复输入，不证明现实身份或彼此独立。</p>
        </div>
        <StatusPill tone={display ? "info" : error ? "cinnabar" : "neutral"}>
          {preparedArtifact
            ? "敏感文件会话内待确认"
            : display
              ? "本次机械并列已生成"
              : error
                ? "并列预检失败关闭"
                : "等待两份完整文件"}
        </StatusPill>
      </header>

      <div className="bazi-applicability-comparison__lifecycle-workbench-toggle">
        <button
          type="button"
          className="secondary-action"
          aria-expanded={lifecycleWorkbenchOpen}
          disabled={lifecycleStoreCloseBlocked && lifecycleWorkbenchOpen}
          onClick={() => {
            if (lifecycleStoreCloseBlocked) {
              if (!lifecycleWorkbenchOpen) setLifecycleWorkbenchOpen(true);
              return;
            }
            setLifecycleWorkbenchOpen((current) => !current);
          }}
        >
          <FolderOpen aria-hidden="true" />
          {lifecycleStoreCloseBlocked
            ? lifecycleWorkbenchOpen
              ? "本机审阅库写入/核对未完成，暂不能关闭"
              : "打开本机审阅库查看或完成核对"
            : lifecycleWorkbenchOpen
              ? "关闭并清除 lifecycle 重开会话"
              : "重开、合并或本机撤下 lifecycle 文件"}
        </button>
        <p>重开流程仍只处理用户显式选择的本机敏感文件；锁存在且工具关闭时仍可只向“打开”方向进入以查看进度或完成目录核对，不会自动扫描、保存、联网或恢复被撤下记录。</p>
      </div>

      {lifecycleWorkbenchOpen ? (
        <Suspense fallback={<div role="status">正在载入 lifecycle 本机重开工具…</div>}>
          <BaziCitationApplicabilityObservationLifecycleFileWorkbench
            binding={binding}
            citations={citations}
          />
        </Suspense>
      ) : null}

      {!display ? (
        <>
          <div className="bazi-applicability-comparison__slots">
            {(["slot_a", "slot_b"] as const).map((slot) => {
              const file = slot === "slot_a" ? slotAFile : slotBFile;
              const label = slot === "slot_a" ? "A" : "B";
              return (
                <div className="bazi-applicability-comparison__slot" key={slot}>
                  <div><span>观察 {label}</span><strong>{file ? file.name : "尚未选择"}</strong></div>
                  <button
                    ref={slot === "slot_a" ? slotAButtonRef : undefined}
                    type="button"
                    className="secondary-action"
                    disabled={Boolean(busySlot) || running}
                    aria-busy={busySlot === slot}
                    onClick={() => void chooseFile(slot)}
                  >
                    {busySlot === slot ? <LoaderCircle className="spin" aria-hidden="true" /> : <FilePlus2 aria-hidden="true" />}
                    {busySlot === slot ? `正在选择观察 ${label}` : file ? `替换观察 ${label}` : `选择观察 ${label}`}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="bazi-applicability-comparison__actions">
            <button
              type="button"
              className="primary-action"
              disabled={!slotAFile || !slotBFile || Boolean(busySlot) || running}
              aria-busy={runningAction === "compare"}
              onClick={() => void compare()}
            >
              {runningAction === "compare" ? <LoaderCircle className="spin" aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
              {runningAction === "compare" ? "正在同一上下文中预检" : "并列预检两份观察"}
            </button>
            <button
              type="button"
              className="secondary-action"
              disabled={!slotAFile || !slotBFile || Boolean(busySlot) || running}
              aria-busy={runningAction === "prepare"}
              onClick={() => void prepareLifecycle()}
            >
              {runningAction === "prepare" ? <LoaderCircle className="spin" aria-hidden="true" /> : <PackageCheck aria-hidden="true" />}
              {runningAction === "prepare" ? "正在准备敏感本机文件" : "并列并准备敏感生命周期文件"}
            </button>
            {(slotAFile || slotBFile) ? (
              <button type="button" className="secondary-action" disabled={running} onClick={clear}>
                <RotateCcw aria-hidden="true" />清除本机选择
              </button>
            ) : null}
          </div>
        </>
      ) : null}

      {error ? (
        <div className="bazi-applicability-comparison__error" role="alert">
          <TriangleAlert aria-hidden="true" /><p>{error} 可重试或重新选择；若页面仍显示已选文件，可用“清除本机选择”移除其页面可达引用。</p>
        </div>
      ) : null}

      {preparedArtifact ? (
        <div className="bazi-applicability-comparison__prepared" role="status">
          <PackageCheck aria-hidden="true" />
          <p><strong>页面会话内已准备；准备步骤本身未调用应用持久化或交付接口，仅后续显式确认才可能调用本机交付端口。</strong> 文件含完整自由文本且未加密；系统分享固定关闭。浏览器可在应用控制之外管理页面内存与临时数据；下载或保存是后续本机动作，不是 formal store、删除/召回、身份/撤下权威、内容真值或发布授权证明。</p>
        </div>
      ) : null}

      {display ? (
        <div ref={resultRef} className="bazi-applicability-comparison__result" role="region" aria-label="双份观察机械比较结果" tabIndex={-1}>
          <header>
            <div>
              <strong>状态精确相同 {display.counts.sameDeclaredStatus} · 不同 {display.counts.differentDeclaredStatus}</strong>
              <p>仅比较文件声明的枚举值；没有阅读理由、判断语义等价、裁定分歧或选择赢家。</p>
            </div>
            <code>{shortDigest(display.recordSetSha256)}</code>
          </header>
          <div className="bazi-applicability-comparison__reviewers" aria-label="两份自述记录摘要">
            {display.records.map((record, index) => (
              <div key={record.slot}>
                <span>规范记录 {index + 1}（按摘要排序）</span>
                <strong>自述 reviewerId 摘要</strong>
                <code>{shortDigest(record.selfDeclaredReviewerIdSha256)}</code>
                <small>记录 {shortDigest(record.recordSha256)} · 身份与独立性未核验</small>
              </div>
            ))}
          </div>
          <ol className="bazi-applicability-comparison__items">
            {visibleItems.map((item) => (
              <li key={item.citationId}>
                <header><span>#{item.order}</span><strong>{item.title}</strong><code>{item.citationId}</code></header>
                <div className="bazi-applicability-comparison__status-grid">
                  <div><span>规范记录 1</span><strong>{statusLabels[item.slotAObservation]}</strong></div>
                  <div><span>规范记录 2</span><strong>{statusLabels[item.slotBObservation]}</strong></div>
                </div>
                <p className={item.relation === "same_declared_status" ? "is-same" : "is-different"}>
                  {item.relation === "same_declared_status" ? "声明状态精确相同" : "声明状态不同，保持并列且不自动裁定"}
                </p>
              </li>
            ))}
          </ol>
          {visibleItemLimit < display.items.length ? (
            <button
              type="button"
              className="secondary-action bazi-applicability-comparison__more"
              onClick={() => setVisibleItemLimit((current) => Math.min(current + VISIBLE_ITEM_STEP, display.items.length))}
            >
              再显示 {Math.min(VISIBLE_ITEM_STEP, display.items.length - visibleItemLimit)} 条
            </button>
          ) : null}
          <button type="button" className="secondary-action" onClick={clear}>
            <RotateCcw aria-hidden="true" />清除此页面结果并重新选择
          </button>
        </div>
      ) : null}

      <div className="bazi-applicability-comparison__boundary" role="note">
        <ShieldCheck aria-hidden="true" />
        <p>原始文件文本只在该叶级组件的页面会话状态中短暂可达，成功后从 React state 移除；这不证明物理内存擦除、文件删除或旧副本召回。显式准备时，完整 canonical text 只转成该叶持有的敏感 Blob，绝不回调给父组件。fresh reread 只证明准备时匹配该冻结摘要，不证明 return 时仍为当前。门面安全投影只含状态、计数、自述标签与摘要。没有 Storage、网络、Case/Revision/规则包写入；mutation epoch 未复核且未绕过，也没有正式激活、术数内容真值或公开发布授权。</p>
      </div>
    </section>
  );
}
