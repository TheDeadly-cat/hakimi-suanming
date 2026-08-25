import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import {
  KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_LIMITS,
  validateKnowledgeSourceAwareRetrievalPacket,
  type BuildKnowledgeSourceAwareRetrievalPacketInput,
  type KnowledgeSourceAwareRetrievalItem,
  type KnowledgeSourceAwareRetrievalPacket
} from "./source-aware-retrieval";

export const KNOWLEDGE_CITATION_SET_CONFLICT_INVENTORY_PROFILE = Object.freeze({
  projectionVersion: "hakimi.knowledge.citation_set_conflict_inventory/0.1.0",
  contentVersion: "0.1.0",
  digestDomain: "hakimi.knowledge.citation_set_conflict_inventory.payload/0.1.0",
  scope: "one_validated_local_review_verified_citation_set" as const,
  inventoryPolicy: "complete_mechanical_pair_inventory_without_semantic_judgment" as const,
  mutationPolicy: "read_only_projection" as const,
  reviewStatus: "inventory_only_pending_human_review" as const,
  expertTruthClaimed: false as const,
  scientificValidityClaimed: false as const,
  formalActivationAllowed: false as const
});

const MAX_VERIFIED_ITEMS = KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_LIMITS.maxVerifiedItems;
const MAX_PAIR_COMPARISONS = MAX_VERIFIED_ITEMS * (MAX_VERIFIED_ITEMS - 1) / 2;

export const KNOWLEDGE_CITATION_SET_CONFLICT_INVENTORY_LIMITS = Object.freeze({
  maxVerifiedItems: MAX_VERIFIED_ITEMS,
  maxPairComparisons: MAX_PAIR_COMPARISONS,
  maxInventoryTextCharacters: 2_000_000,
  maxInventoryValueNodes: 50_000,
  maxPrecloneDepth: KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_LIMITS.maxPrecloneDepth
});

export type KnowledgeCitationSetConflictInventoryStatus =
  | "blocked_no_verified_citations"
  | "blocked_unreviewed_target_sources"
  | "no_pairwise_review_required"
  | "pending_human_review";

export type KnowledgeCitationSetLocatorRelation =
  | "same_range"
  | "overlapping_ranges"
  | "disjoint_ranges"
  | "different_sections"
  | "different_documents";

export interface KnowledgeCitationSetConflictInventoryItem {
  order: number;
  citationId: string;
  itemDigest: string;
  citationSnapshotDigest: string;
  documentId: string;
  documentContentHash: string;
  documentSnapshotDigest: string;
  sourceRightsSnapshotDigest: string;
}

export interface KnowledgeCitationSetConflictInventoryPair {
  order: number;
  citationIds: readonly [string, string];
  itemDigests: readonly [string, string];
  sameDocumentId: boolean;
  sameDocumentContentHash: boolean;
  sameSourceRightsSnapshot: boolean;
  locatorRelation: KnowledgeCitationSetLocatorRelation;
  exactQuoteRelation: "code_unit_exact_equal" | "code_unit_different";
  semanticRelationshipAssessed: false;
}

export interface KnowledgeCitationSetConflictInventory {
  profile: typeof KNOWLEDGE_CITATION_SET_CONFLICT_INVENTORY_PROFILE;
  binding: Readonly<{
    evidenceSubjectId: string;
    registryVersion: string;
    retrievalUseMode: "local_review";
    targetKey: string;
    retrievalProjectionVersion: string;
    retrievalPayloadSha256: string;
    matchingSourceSetSha256: string;
    candidateCitationIds: readonly string[];
    verifiedCitationIds: readonly string[];
    rejectedCitationIds: readonly string[];
  }>;
  counts: Readonly<{
    candidateCitations: number;
    verifiedCitations: number;
    rejectedCitations: number;
    distinctDocuments: number;
    pairs: number;
  }>;
  verifiedItems: readonly KnowledgeCitationSetConflictInventoryItem[];
  pairs: readonly KnowledgeCitationSetConflictInventoryPair[];
  reviewGate: Readonly<{
    status: KnowledgeCitationSetConflictInventoryStatus;
    pairwiseComparisonRequired: boolean;
    humanReviewRequired: boolean;
    candidateResolutionRequired: boolean;
    rejectedCitationAcknowledgementRequired: boolean;
    automatedConflictDetectionPerformed: false;
    citationSetConflictReviewPerformed: false;
    citationSetConflictStatus: "unassessed";
    semanticConflictResolutionPerformed: false;
    reviewerIdentityVerified: false;
    downstreamExternalUseGate: "blocked";
  }>;
  boundary: Readonly<{
    rawSourceRecordsCopied: false;
    containsSourceText: false;
    sourceTextInstructionAuthority: false;
    promptInjectionScreeningPerformed: false;
    privacyReviewPerformed: false;
    externalPurposeRightsReviewed: false;
    atomicStorageSnapshotVerified: false;
    mutationEpochRevalidationPerformed: false;
    externalProviderUseAuthorized: false;
    networkTransmissionPerformed: false;
    networkTransmissionAuthorized: false;
    publicExportAuthorized: false;
    expertTruthClaimed: false;
    scientificValidityClaimed: false;
    formalActivationAllowed: false;
    chartOrStorageMutationPerformed: false;
    result: null;
  }>;
  integrity: Readonly<{
    hashAlgorithm: "SHA-256";
    payloadSha256: string;
    authenticityClaimed: false;
  }>;
}

type ConflictInventoryPayload = Omit<KnowledgeCitationSetConflictInventory, "integrity">;

export class KnowledgeCitationSetConflictInventoryError extends Error {
  constructor(
    readonly code:
      | "LOCAL_REVIEW_ONLY"
      | "INVENTORY_LIMIT_EXCEEDED"
      | "INVALID_VERIFIED_ITEM_SET",
    message: string
  ) {
    super(message);
    this.name = "KnowledgeCitationSetConflictInventoryError";
  }
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
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

function sameValue(left: unknown, right: unknown): boolean {
  return canonicalStringify(left) === canonicalStringify(right);
}

interface DeclarativeValueBudget {
  valueNodes: number;
  textCharacters: number;
}

function throwInventoryLimitExceeded(message: string): never {
  throw new KnowledgeCitationSetConflictInventoryError("INVENTORY_LIMIT_EXCEEDED", message);
}

function claimText(
  budget: DeclarativeValueBudget,
  length: number,
  limits: Readonly<{ textCharacters: number; valueNodes: number }>,
  subject: string
): void {
  budget.textCharacters += length;
  if (budget.textCharacters > limits.textCharacters) {
    throwInventoryLimitExceeded(`${subject}文本总量超过有界声明式预检上限。`);
  }
}

function ownDataProperty(objectValue: object, key: string, path: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(objectValue, key);
  if (!descriptor || !("value" in descriptor)) {
    throw new TypeError(`${path} 必须是自有声明式数据字段`);
  }
  return descriptor.value;
}

function inspectBoundedDeclarativeValue(
  value: unknown,
  limits: Readonly<{ textCharacters: number; valueNodes: number }>,
  subject: string,
  path = subject,
  depth = 0,
  ancestors = new WeakSet<object>(),
  budget: DeclarativeValueBudget = { valueNodes: 0, textCharacters: 0 }
): void {
  if (depth > KNOWLEDGE_CITATION_SET_CONFLICT_INVENTORY_LIMITS.maxPrecloneDepth) {
    throwInventoryLimitExceeded(`${subject}超过有界声明式预检最大深度。`);
  }
  budget.valueNodes += 1;
  if (budget.valueNodes > limits.valueNodes) {
    throwInventoryLimitExceeded(`${subject}结构节点总量超过有界声明式预检上限。`);
  }
  if (typeof value === "string") {
    claimText(budget, value.length, limits, subject);
    return;
  }
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`${path} 包含非有限数字`);
    return;
  }
  if (typeof value !== "object") {
    throw new TypeError(`${path} 包含非声明式 JSON 值：${typeof value}`);
  }

  const objectValue = value as object;
  if (ancestors.has(objectValue)) throw new TypeError(`${path} 包含循环引用`);
  if (Object.getOwnPropertySymbols(objectValue).length > 0) {
    throw new TypeError(`${path} 不能包含 Symbol 属性`);
  }
  ancestors.add(objectValue);
  try {
    if (Array.isArray(objectValue)) {
      const lengthValue = ownDataProperty(objectValue, "length", `${path}.length`);
      if (typeof lengthValue !== "number" || !Number.isSafeInteger(lengthValue) || lengthValue < 0) {
        throw new TypeError(`${path}.length 无效`);
      }
      const length = lengthValue;
      if (length > limits.valueNodes - budget.valueNodes) {
        throwInventoryLimitExceeded(`${subject}数组槽位超过有界声明式预检结构上限。`);
      }
      const propertyNames = Object.getOwnPropertyNames(objectValue);
      if (propertyNames.length !== length + 1) {
        throw new TypeError(`${path} 必须是稠密且没有自定义字段的数组`);
      }
      for (let index = 0; index < length; index += 1) {
        const key = String(index);
        const descriptor = Object.getOwnPropertyDescriptor(objectValue, key);
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
          throw new TypeError(`${path}[${key}] 必须是可枚举的声明式数组项`);
        }
        inspectBoundedDeclarativeValue(
          descriptor.value,
          limits,
          subject,
          `${path}[${key}]`,
          depth + 1,
          ancestors,
          budget
        );
      }
      return;
    }

    const prototype = Object.getPrototypeOf(objectValue);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${path} 必须是普通声明式对象`);
    }
    for (const key of Object.getOwnPropertyNames(objectValue)) {
      const descriptor = Object.getOwnPropertyDescriptor(objectValue, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        throw new TypeError(`${path}.${key} 必须是可枚举的声明式数据字段`);
      }
      claimText(budget, key.length, limits, subject);
      if (descriptor.value === undefined) continue;
      inspectBoundedDeclarativeValue(
        descriptor.value,
        limits,
        subject,
        `${path}.${key}`,
        depth + 1,
        ancestors,
        budget
      );
    }
  } finally {
    ancestors.delete(objectValue);
  }
}

function inventoryPreflight(value: unknown, subject: string): void {
  inspectBoundedDeclarativeValue(
    value,
    {
      textCharacters: KNOWLEDGE_CITATION_SET_CONFLICT_INVENTORY_LIMITS.maxInventoryTextCharacters,
      valueNodes: KNOWLEDGE_CITATION_SET_CONFLICT_INVENTORY_LIMITS.maxInventoryValueNodes
    },
    subject
  );
}

function locatorRelation(
  left: KnowledgeSourceAwareRetrievalItem,
  right: KnowledgeSourceAwareRetrievalItem
): KnowledgeCitationSetLocatorRelation {
  if (left.document.documentId !== right.document.documentId) return "different_documents";
  if (left.locator.sectionId !== right.locator.sectionId) return "different_sections";
  if (
    left.locator.startLine === right.locator.startLine
    && left.locator.endLine === right.locator.endLine
  ) {
    return "same_range";
  }
  if (
    Math.max(left.locator.startLine, right.locator.startLine)
    <= Math.min(left.locator.endLine, right.locator.endLine)
  ) {
    return "overlapping_ranges";
  }
  return "disjoint_ranges";
}

function inventoryStatus(packet: KnowledgeSourceAwareRetrievalPacket): KnowledgeCitationSetConflictInventoryStatus {
  if (packet.verifiedCitationIds.length === 0) return "blocked_no_verified_citations";
  if (packet.candidateCitationIds.length > 0) return "blocked_unreviewed_target_sources";
  if (packet.verifiedCitationIds.length === 1 && packet.rejectedCitationIds.length === 0) {
    return "no_pairwise_review_required";
  }
  return "pending_human_review";
}

function verifiedItemsInCodeUnitOrder(
  packet: KnowledgeSourceAwareRetrievalPacket
): KnowledgeSourceAwareRetrievalItem[] {
  if (packet.verifiedCitationIds.length > MAX_VERIFIED_ITEMS) {
    throwInventoryLimitExceeded("引用集清单中的已核验引用超过有界上限。不得截断潜在复核项。");
  }
  const itemsByCitationId = new Map<string, KnowledgeSourceAwareRetrievalItem>();
  for (const item of packet.items) {
    if (itemsByCitationId.has(item.citationId)) {
      throw new KnowledgeCitationSetConflictInventoryError(
        "INVALID_VERIFIED_ITEM_SET",
        "来源感知检索包包含重复的已核验引用项目。"
      );
    }
    itemsByCitationId.set(item.citationId, item);
  }
  const verifiedCitationIds = [...packet.verifiedCitationIds].sort(compareCodeUnits);
  if (itemsByCitationId.size !== verifiedCitationIds.length) {
    throw new KnowledgeCitationSetConflictInventoryError(
      "INVALID_VERIFIED_ITEM_SET",
      "来源感知检索包的已核验引用 ID 与输出项目数量不一致。"
    );
  }
  return verifiedCitationIds.map((citationId) => {
    const item = itemsByCitationId.get(citationId);
    if (!item) {
      throw new KnowledgeCitationSetConflictInventoryError(
        "INVALID_VERIFIED_ITEM_SET",
        "来源感知检索包缺少已核验引用项目。"
      );
    }
    return item;
  });
}

/**
 * Builds a local-only, exhaustive mechanical comparison inventory. The output
 * never labels textual difference or source multiplicity as semantic conflict
 * and never upgrades the reviewed packet's boundary flags.
 */
export async function buildKnowledgeCitationSetConflictInventory(
  rawPacket: unknown,
  rawInput: BuildKnowledgeSourceAwareRetrievalPacketInput
): Promise<KnowledgeCitationSetConflictInventory> {
  const packet = await validateKnowledgeSourceAwareRetrievalPacket(rawPacket, rawInput);
  if (packet.request.useMode !== "local_review") {
    throw new KnowledgeCitationSetConflictInventoryError(
      "LOCAL_REVIEW_ONLY",
      "引用集机械复核清单只允许从本机人工审阅包构建。"
    );
  }

  const items = verifiedItemsInCodeUnitOrder(packet);
  const candidateCitationIds = [...packet.candidateCitationIds].sort(compareCodeUnits);
  const verifiedCitationIds = items.map((item) => item.citationId);
  const rejectedCitationIds = [...packet.rejectedCitationIds].sort(compareCodeUnits);
  const pairs: KnowledgeCitationSetConflictInventoryPair[] = [];
  for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
    const left = items[leftIndex]!;
    for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
      if (pairs.length >= MAX_PAIR_COMPARISONS) {
        throwInventoryLimitExceeded("引用集机械比较对超过有界上限。不得截断或抽样。");
      }
      const right = items[rightIndex]!;
      pairs.push({
        order: pairs.length + 1,
        citationIds: [left.citationId, right.citationId],
        itemDigests: [left.itemDigest, right.itemDigest],
        sameDocumentId: left.document.documentId === right.document.documentId,
        sameDocumentContentHash: left.document.documentContentHash === right.document.documentContentHash,
        sameSourceRightsSnapshot: left.sourceRights.snapshotDigest === right.sourceRights.snapshotDigest,
        locatorRelation: locatorRelation(left, right),
        exactQuoteRelation: left.quote === right.quote ? "code_unit_exact_equal" : "code_unit_different",
        semanticRelationshipAssessed: false
      });
    }
  }
  const expectedPairCount = items.length * (items.length - 1) / 2;
  if (pairs.length !== expectedPairCount) {
    throw new KnowledgeCitationSetConflictInventoryError(
      "INVALID_VERIFIED_ITEM_SET",
      "引用集机械比较清单没有完整覆盖所有 i<j 引用对。"
    );
  }

  const status = inventoryStatus(packet);
  const payload: ConflictInventoryPayload = {
    profile: KNOWLEDGE_CITATION_SET_CONFLICT_INVENTORY_PROFILE,
    binding: {
      evidenceSubjectId: packet.request.evidenceSubject.subjectId,
      registryVersion: packet.request.evidenceSubject.registryVersion,
      retrievalUseMode: "local_review",
      targetKey: packet.request.targetKey,
      retrievalProjectionVersion: packet.profile.projectionVersion,
      retrievalPayloadSha256: packet.integrity.payloadSha256,
      matchingSourceSetSha256: packet.sourceSet.matchingSourceSetSha256,
      candidateCitationIds,
      verifiedCitationIds,
      rejectedCitationIds
    },
    counts: {
      candidateCitations: candidateCitationIds.length,
      verifiedCitations: verifiedCitationIds.length,
      rejectedCitations: rejectedCitationIds.length,
      distinctDocuments: new Set(items.map((item) => item.document.documentId)).size,
      pairs: pairs.length
    },
    verifiedItems: items.map((item, index) => ({
      order: index + 1,
      citationId: item.citationId,
      itemDigest: item.itemDigest,
      citationSnapshotDigest: item.citationSnapshotDigest,
      documentId: item.document.documentId,
      documentContentHash: item.document.documentContentHash,
      documentSnapshotDigest: item.document.documentSnapshotDigest,
      sourceRightsSnapshotDigest: item.sourceRights.snapshotDigest
    })),
    pairs,
    reviewGate: {
      status,
      pairwiseComparisonRequired: verifiedCitationIds.length > 1,
      humanReviewRequired: (
        verifiedCitationIds.length > 1
        || candidateCitationIds.length > 0
        || rejectedCitationIds.length > 0
      ),
      candidateResolutionRequired: candidateCitationIds.length > 0,
      rejectedCitationAcknowledgementRequired: rejectedCitationIds.length > 0,
      automatedConflictDetectionPerformed: false,
      citationSetConflictReviewPerformed: false,
      citationSetConflictStatus: "unassessed",
      semanticConflictResolutionPerformed: false,
      reviewerIdentityVerified: false,
      downstreamExternalUseGate: "blocked"
    },
    boundary: {
      rawSourceRecordsCopied: false,
      containsSourceText: false,
      sourceTextInstructionAuthority: false,
      promptInjectionScreeningPerformed: false,
      privacyReviewPerformed: false,
      externalPurposeRightsReviewed: false,
      atomicStorageSnapshotVerified: false,
      mutationEpochRevalidationPerformed: false,
      externalProviderUseAuthorized: false,
      networkTransmissionPerformed: false,
      networkTransmissionAuthorized: false,
      publicExportAuthorized: false,
      expertTruthClaimed: false,
      scientificValidityClaimed: false,
      formalActivationAllowed: false,
      chartOrStorageMutationPerformed: false,
      result: null
    }
  };
  inventoryPreflight(payload, "引用集机械复核清单输出");
  const inventory: KnowledgeCitationSetConflictInventory = {
    ...payload,
    integrity: {
      hashAlgorithm: "SHA-256",
      payloadSha256: await sha256Hex({
        domain: KNOWLEDGE_CITATION_SET_CONFLICT_INVENTORY_PROFILE.digestDomain,
        payload
      }),
      authenticityClaimed: false
    }
  };
  inventoryPreflight(inventory, "引用集机械复核清单输出");
  return deepFreeze(inventory);
}

export async function validateKnowledgeCitationSetConflictInventory(
  rawInventory: unknown,
  rawPacket: unknown,
  rawInput: BuildKnowledgeSourceAwareRetrievalPacketInput
): Promise<KnowledgeCitationSetConflictInventory> {
  inventoryPreflight(rawInventory, "引用集机械复核清单");
  const inventorySnapshot = canonicalClone(rawInventory);
  const rebuilt = await buildKnowledgeCitationSetConflictInventory(rawPacket, rawInput);
  if (!sameValue(inventorySnapshot, rebuilt)) {
    throw new Error("引用集机械复核清单与已验证来源感知检索包的规范重建不一致");
  }
  return rebuilt;
}
