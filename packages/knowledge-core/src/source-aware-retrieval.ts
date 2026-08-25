import {
  citationRecordSchema,
  citationTargetKey,
  knowledgeDocumentRecordSchema,
  sourceRightsRecordSchema,
  type CitationRecord,
  type KnowledgeDocumentRecord,
  type SourceRightsRecord
} from "@hakimi/contracts";
import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import {
  isRedistributableSourceRights,
  KnowledgeIntegrityError,
  requireEvidenceSubject,
  verifyKnowledgeDocumentIntegrity
} from "./index";

export const KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_PROFILE = Object.freeze({
  projectionVersion: "hakimi.knowledge.source_aware_retrieval_packet/0.1.0",
  contentVersion: "0.1.0",
  scope: "one_registered_evidence_subject_with_exact_verified_citations" as const,
  selectionPolicy: "all_target_bound_sources_preserved_without_semantic_ranking" as const,
  mutationPolicy: "read_only_projection" as const,
  reviewStatus: "candidate_pending_content_and_security_review" as const,
  expertTruthClaimed: false as const,
  scientificValidityClaimed: false as const,
  formalActivationAllowed: false as const
});

export const KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_LIMITS = Object.freeze({
  maxInputDocuments: 2_000,
  maxInputCitations: 10_000,
  maxInputRights: 2_000,
  maxMatchingCitations: 256,
  maxVerifiedItems: 64,
  maxInputTextCharacters: 24_000_000,
  maxInputValueNodes: 100_000,
  maxPacketTextCharacters: 4_000_000,
  maxPacketValueNodes: 25_000,
  maxPrecloneDepth: 128
});

export type KnowledgeSourceAwareRetrievalUseMode =
  | "local_review"
  | "external_context_candidate";

export type KnowledgeSourceAwareRetrievalStatus =
  | "ready_for_local_review"
  | "ready_for_local_review_with_unreviewed_sources"
  | "blocked_no_verified_citations"
  | "blocked_unreviewed_target_sources"
  | "blocked_external_rights_incomplete"
  | "blocked_external_authorization_unavailable";

export type KnowledgeSourceAwareRetrievalBlockedReason =
  | "source_not_redistributable"
  | "external_authorization_unavailable";

export interface BuildKnowledgeSourceAwareRetrievalPacketInput {
  evidenceSubjectId: string;
  useMode: KnowledgeSourceAwareRetrievalUseMode;
  documents: readonly KnowledgeDocumentRecord[];
  citations: readonly CitationRecord[];
  sourceRights: readonly SourceRightsRecord[];
}

export interface KnowledgeSourceAwareRetrievalItem {
  order: number;
  citationId: string;
  citationSnapshotDigest: string;
  document: Readonly<{
    documentId: string;
    documentContentHash: string;
    documentSnapshotDigest: string;
    recordType: KnowledgeDocumentRecord["recordType"];
    title: string;
    author: string;
    edition: string;
  }>;
  locator: CitationRecord["locator"];
  quote: string;
  targetKey: string;
  sourceRights: Readonly<{
    snapshotDigest: string;
    origin: SourceRightsRecord["origin"];
    status: SourceRightsRecord["rights"]["status"];
    workStatus: SourceRightsRecord["rights"]["workStatus"];
    editionStatus: SourceRightsRecord["rights"]["editionStatus"];
    basis: SourceRightsRecord["rights"]["basis"];
    licenseId: string | null;
    distributionPolicy: SourceRightsRecord["rights"]["distributionPolicy"];
    reviewStatus: SourceRightsRecord["review"]["status"];
    rightsEvidenceCount: number;
  }>;
  citationReview: Readonly<{
    status: "verified";
    reviewerCount: number;
    decisionNoteDigest: string;
  }>;
  evidenceClassification:
    | "verified_exact_quote_local_private"
    | "verified_exact_quote_redistributable";
  itemDigest: string;
  semanticTruthClaimed: false;
  expertTruthClaimed: false;
  scientificValidityClaimed: false;
  result: null;
}

export interface KnowledgeSourceAwareRetrievalPacket {
  profile: typeof KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_PROFILE;
  request: Readonly<{
    useMode: KnowledgeSourceAwareRetrievalUseMode;
    targetKey: string;
    evidenceSubject: Readonly<{
      subjectId: string;
      registryVersion: string;
      category: "calendar_fact" | "rule_derived" | "interpretive_claim";
      label: string;
      fieldPaths: readonly string[];
      ruleProfilePaths: readonly string[];
    }>;
  }>;
  status: KnowledgeSourceAwareRetrievalStatus;
  sourceMultiplicity: "none" | "single" | "multiple_preserved_without_resolution";
  items: readonly KnowledgeSourceAwareRetrievalItem[];
  candidateCitationIds: readonly string[];
  rejectedCitationIds: readonly string[];
  verifiedCitationIds: readonly string[];
  blockedVerifiedCitations: readonly Readonly<{
    citationId: string;
    reason: KnowledgeSourceAwareRetrievalBlockedReason;
  }>[];
  counts: Readonly<{
    matching: number;
    candidate: number;
    verified: number;
    rejected: number;
    emitted: number;
    blockedVerified: number;
  }>;
  sourceSet: Readonly<{
    hashAlgorithm: "SHA-256";
    matchingSourceSetSha256: string;
    allMatchingCitationStatusesBound: true;
    rawSourceRecordsCopied: false;
  }>;
  integrity: Readonly<{
    hashAlgorithm: "SHA-256";
    payloadSha256: string;
    authenticityClaimed: false;
  }>;
  boundary: Readonly<{
    exactDocumentCitationAndRightsBindingsVerified: true;
    allTargetBoundCitationIdsPreserved: true;
    semanticRankingPerformed: false;
    semanticConflictResolutionPerformed: false;
    citationSetConflictReviewPerformed: false;
    citationSetConflictStatus: "unassessed";
    citationReviewEstablishesSemanticTruth: false;
    rightsReviewEstablishesSemanticTruth: false;
    redistributionRightsGate:
      | "local_only_not_applicable"
      | "passed_for_redistributable_content_only"
      | "failed";
    rawKnowledgeDocumentsCopied: false;
    exactCitationQuotesCopied: boolean;
    containsSourceText: boolean;
    localPrivateSourceTextIncluded: boolean;
    sourceTextInstructionAuthority: false;
    promptInjectionScreeningPerformed: false;
    privacyReviewPerformed: false;
    externalPurposeRightsReviewed: false;
    externalProviderUseAuthorized: false;
    atomicStorageSnapshotVerified: false;
    mutationEpochRevalidationPerformed: false;
    downstreamExternalUseGate: "blocked";
    networkTransmissionPerformed: false;
    networkTransmissionAuthorized: false;
    publicExportAuthorized: false;
    expertTruthClaimed: false;
    scientificValidityClaimed: false;
    formalActivationAllowed: false;
    chartOrStorageMutationPerformed: false;
    result: null;
  }>;
}

type RetrievalPayload = Omit<KnowledgeSourceAwareRetrievalPacket, "integrity">;

type ResolvedCitation = Readonly<{
  citation: CitationRecord;
  document: KnowledgeDocumentRecord;
  rights: SourceRightsRecord;
  redistributable: boolean;
  citationSnapshotDigest: string;
  documentSnapshotDigest: string;
  sourceRightsSnapshotDigest: string;
}>;

const MAX_INPUT_DOCUMENTS = KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_LIMITS.maxInputDocuments;
const MAX_INPUT_CITATIONS = KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_LIMITS.maxInputCitations;
const MAX_INPUT_RIGHTS = KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_LIMITS.maxInputRights;
const MAX_MATCHING_CITATIONS = KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_LIMITS.maxMatchingCitations;
const MAX_VERIFIED_ITEMS = KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_LIMITS.maxVerifiedItems;
const MAX_INPUT_TEXT_CHARACTERS = KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_LIMITS.maxInputTextCharacters;
const MAX_INPUT_VALUE_NODES = KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_LIMITS.maxInputValueNodes;
const MAX_PACKET_TEXT_CHARACTERS = KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_LIMITS.maxPacketTextCharacters;
const MAX_PACKET_VALUE_NODES = KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_LIMITS.maxPacketValueNodes;
const MAX_PRECLONE_DEPTH = KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_LIMITS.maxPrecloneDepth;

function compareCanonicalCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export class KnowledgeSourceAwareRetrievalError extends Error {
  constructor(
    readonly code:
      | "INPUT_LIMIT_EXCEEDED"
      | "DUPLICATE_DOCUMENT"
      | "DUPLICATE_CITATION"
      | "DUPLICATE_SOURCE_RIGHTS"
      | "MISSING_DOCUMENT"
      | "MISSING_SOURCE_RIGHTS"
      | "SOURCE_RIGHTS_BINDING_MISMATCH"
      | "DOCUMENT_ORIGIN_MISMATCH"
      | "TOO_MANY_MATCHING_CITATIONS"
      | "TOO_MANY_VERIFIED_CITATIONS",
    message: string
  ) {
    super(message);
    this.name = "KnowledgeSourceAwareRetrievalError";
  }
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

function throwInputLimitExceeded(message: string): never {
  throw new KnowledgeSourceAwareRetrievalError("INPUT_LIMIT_EXCEEDED", message);
}

interface PrecloneBudget {
  valueNodes: number;
  textCharacters: number;
}

function claimPrecloneText(
  budget: PrecloneBudget,
  length: number,
  limit: number,
  subject: string
): void {
  budget.textCharacters += length;
  if (budget.textCharacters > limit) {
    throwInputLimitExceeded(`${subject}文本总量超过规范克隆前上限。`);
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
  budget: PrecloneBudget = { valueNodes: 0, textCharacters: 0 }
): void {
  if (depth > MAX_PRECLONE_DEPTH) {
    throwInputLimitExceeded(`${subject}超过规范克隆前最大深度。`);
  }
  budget.valueNodes += 1;
  if (budget.valueNodes > limits.valueNodes) {
    throwInputLimitExceeded(`${subject}结构节点总量超过规范克隆前上限。`);
  }
  if (typeof value === "string") {
    claimPrecloneText(budget, value.length, limits.textCharacters, subject);
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
        throwInputLimitExceeded(`${subject}数组槽位超过规范克隆前结构上限。`);
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
      claimPrecloneText(budget, key.length, limits.textCharacters, subject);
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

function assertRawInputPreflight(rawInput: BuildKnowledgeSourceAwareRetrievalPacketInput): void {
  if (
    rawInput === null
    || typeof rawInput !== "object"
    || Array.isArray(rawInput)
  ) {
    throw new TypeError("来源感知检索输入必须是声明式对象");
  }
  const documents = ownDataProperty(rawInput, "documents", "来源感知检索输入.documents");
  const citations = ownDataProperty(rawInput, "citations", "来源感知检索输入.citations");
  const sourceRights = ownDataProperty(rawInput, "sourceRights", "来源感知检索输入.sourceRights");
  if (!Array.isArray(documents) || !Array.isArray(citations) || !Array.isArray(sourceRights)) {
    throw new TypeError("来源感知检索输入必须包含 documents、citations 与 sourceRights 数组");
  }
  if (
    documents.length > MAX_INPUT_DOCUMENTS
    || citations.length > MAX_INPUT_CITATIONS
    || sourceRights.length > MAX_INPUT_RIGHTS
  ) {
    throwInputLimitExceeded("来源感知检索输入超过规范克隆前集合上限。");
  }
  inspectBoundedDeclarativeValue(
    rawInput,
    { textCharacters: MAX_INPUT_TEXT_CHARACTERS, valueNodes: MAX_INPUT_VALUE_NODES },
    "来源感知检索输入"
  );
}

function uniqueMap<T>(
  values: readonly T[],
  keyOf: (value: T) => string,
  duplicateCode: "DUPLICATE_DOCUMENT" | "DUPLICATE_CITATION" | "DUPLICATE_SOURCE_RIGHTS",
  subject: string
): Map<string, T> {
  const result = new Map<string, T>();
  for (const value of values) {
    const key = keyOf(value);
    if (result.has(key)) {
      throw new KnowledgeSourceAwareRetrievalError(
        duplicateCode,
        `${subject}包含重复身份；检索已失败关闭。`
      );
    }
    result.set(key, value);
  }
  return result;
}

function assertDocumentRightsIdentity(
  document: KnowledgeDocumentRecord,
  rights: SourceRightsRecord
): void {
  if (rights.documentId !== document.id || rights.documentContentHash !== document.contentHash) {
    throw new KnowledgeSourceAwareRetrievalError(
      "SOURCE_RIGHTS_BINDING_MISMATCH",
      "来源权利记录没有绑定同一资料身份与正文摘要。"
    );
  }
  const expectedOrigin = document.recordType === "bundled_knowledge_document" ? "bundled" : "user_import";
  if (rights.origin !== expectedOrigin) {
    throw new KnowledgeSourceAwareRetrievalError(
      "DOCUMENT_ORIGIN_MISMATCH",
      "资料记录类型与来源权利记录 origin 不一致。"
    );
  }
}

function verifyCitationAgainstVerifiedDocument(
  citation: CitationRecord,
  knowledgeDocument: KnowledgeDocumentRecord,
  documentLines: readonly string[]
): CitationRecord {
  if (citation.documentId !== knowledgeDocument.id) {
    throw new KnowledgeIntegrityError("documentId", `引用 ${citation.id} 绑定了错误的资料。`);
  }
  if (citation.documentContentHash !== knowledgeDocument.contentHash) {
    throw new KnowledgeIntegrityError("documentContentHash", `引用 ${citation.id} 的资料摘要已失配。`);
  }
  const section = knowledgeDocument.sections.find((candidate) => candidate.id === citation.locator.sectionId);
  if (
    !section
    || citation.locator.startLine < section.startLine
    || citation.locator.endLine > section.endLine
  ) {
    throw new KnowledgeIntegrityError("section", `引用 ${citation.id} 的章节或行号无效。`);
  }
  const quote = documentLines
    .slice(citation.locator.startLine - 1, citation.locator.endLine)
    .join("\n");
  if (quote !== citation.quote) {
    throw new KnowledgeIntegrityError("quote", `引用 ${citation.id} 的原文摘录不匹配。`);
  }
  return citation;
}

async function buildItem(
  resolved: ResolvedCitation,
  order: number,
  targetKey: string
): Promise<KnowledgeSourceAwareRetrievalItem> {
  const {
    citation,
    document,
    rights,
    redistributable,
    citationSnapshotDigest,
    documentSnapshotDigest,
    sourceRightsSnapshotDigest
  } = resolved;
  const decisionNoteDigest = await sha256Hex(citation.decisionNote);
  const itemWithoutDigest = {
    order,
    citationId: citation.id,
    citationSnapshotDigest,
    document: {
      documentId: document.id,
      documentContentHash: document.contentHash,
      documentSnapshotDigest,
      recordType: document.recordType,
      title: document.title,
      author: document.author,
      edition: document.edition
    },
    locator: citation.locator,
    quote: citation.quote,
    targetKey,
    sourceRights: {
      snapshotDigest: sourceRightsSnapshotDigest,
      origin: rights.origin,
      status: rights.rights.status,
      workStatus: rights.rights.workStatus,
      editionStatus: rights.rights.editionStatus,
      basis: rights.rights.basis,
      licenseId: rights.rights.licenseId,
      distributionPolicy: rights.rights.distributionPolicy,
      reviewStatus: rights.review.status,
      rightsEvidenceCount: rights.rights.evidenceRefs.length
    },
    citationReview: {
      status: "verified" as const,
      reviewerCount: citation.reviewAttestations.length,
      decisionNoteDigest
    },
    evidenceClassification: redistributable
      ? "verified_exact_quote_redistributable" as const
      : "verified_exact_quote_local_private" as const,
    semanticTruthClaimed: false as const,
    expertTruthClaimed: false as const,
    scientificValidityClaimed: false as const,
    result: null
  };
  return {
    ...itemWithoutDigest,
    itemDigest: await sha256Hex(itemWithoutDigest)
  };
}

/**
 * Builds one deterministic target-bound packet from exact citations. It never
 * searches or copies whole documents, never ranks sources semantically and
 * never authorizes model/network use.
 */
export async function buildKnowledgeSourceAwareRetrievalPacket(
  rawInput: BuildKnowledgeSourceAwareRetrievalPacketInput
): Promise<KnowledgeSourceAwareRetrievalPacket> {
  assertRawInputPreflight(rawInput);
  const input = canonicalClone(rawInput);
  if (input.useMode !== "local_review" && input.useMode !== "external_context_candidate") {
    throw new TypeError("来源感知检索 useMode 无效");
  }
  const subject = requireEvidenceSubject(input.evidenceSubjectId);
  const targetKey = citationTargetKey({ kind: "evidence_subject", subjectId: subject.subjectId });
  const documents = input.documents.map((value) => knowledgeDocumentRecordSchema.parse(value));
  const citations = input.citations.map((value) => citationRecordSchema.parse(value));
  const rightsRecords = input.sourceRights.map((value) => sourceRightsRecordSchema.parse(value));
  const documentsById = uniqueMap(documents, (value) => value.id, "DUPLICATE_DOCUMENT", "资料集合");
  uniqueMap(citations, (value) => value.id, "DUPLICATE_CITATION", "引用集合");
  const rightsByDocument = uniqueMap(
    rightsRecords,
    (value) => value.documentId,
    "DUPLICATE_SOURCE_RIGHTS",
    "来源权利集合"
  );
  const matching = citations
    .filter((citation) => citation.targetKeys.includes(targetKey))
    .sort((left, right) => compareCanonicalCodeUnits(left.id, right.id));
  if (matching.length > MAX_MATCHING_CITATIONS) {
    throw new KnowledgeSourceAwareRetrievalError(
      "TOO_MANY_MATCHING_CITATIONS",
      "单一证据主题绑定的引用超过有界上限；请先完成人工整理。"
    );
  }
  const preliminaryVerifiedCount = matching.filter((citation) => citation.status === "verified").length;
  if (preliminaryVerifiedCount > MAX_VERIFIED_ITEMS) {
    throw new KnowledgeSourceAwareRetrievalError(
      "TOO_MANY_VERIFIED_CITATIONS",
      "单一证据主题的已核验引用超过检索包上限；不得静默截断潜在冲突来源。"
    );
  }

  const matchingDocumentIds = [...new Set(matching.map((citation) => citation.documentId))]
    .sort(compareCanonicalCodeUnits);
  const verifiedDocumentsById = new Map<string, KnowledgeDocumentRecord>();
  const matchingRightsByDocument = new Map<string, SourceRightsRecord>();
  const documentLinesById = new Map<string, readonly string[]>();
  const documentSnapshotDigests = new Map<string, string>();
  const sourceRightsSnapshotDigests = new Map<string, string>();
  for (const documentId of matchingDocumentIds) {
    const document = documentsById.get(documentId);
    if (!document) {
      throw new KnowledgeSourceAwareRetrievalError(
        "MISSING_DOCUMENT",
        "目标引用缺少绑定资料；检索已失败关闭。"
      );
    }
    const rights = rightsByDocument.get(documentId);
    if (!rights) {
      throw new KnowledgeSourceAwareRetrievalError(
        "MISSING_SOURCE_RIGHTS",
        "目标引用缺少来源权利记录；检索已失败关闭。"
      );
    }
    assertDocumentRightsIdentity(document, rights);
    const verifiedDocument = await verifyKnowledgeDocumentIntegrity(document);
    verifiedDocumentsById.set(documentId, verifiedDocument);
    matchingRightsByDocument.set(documentId, rights);
    documentLinesById.set(documentId, verifiedDocument.content.split("\n"));
    documentSnapshotDigests.set(documentId, await sha256Hex(verifiedDocument));
    sourceRightsSnapshotDigests.set(documentId, await sha256Hex(rights));
  }

  const resolved: ResolvedCitation[] = [];
  for (const citation of matching) {
    const document = verifiedDocumentsById.get(citation.documentId)!;
    const rights = matchingRightsByDocument.get(citation.documentId)!;
    resolved.push({
      citation: verifyCitationAgainstVerifiedDocument(
        citation,
        document,
        documentLinesById.get(citation.documentId)!
      ),
      document,
      rights,
      redistributable: isRedistributableSourceRights(rights),
      citationSnapshotDigest: await sha256Hex(citation),
      documentSnapshotDigest: documentSnapshotDigests.get(citation.documentId)!,
      sourceRightsSnapshotDigest: sourceRightsSnapshotDigests.get(citation.documentId)!
    });
  }
  const matchingSourceSetSha256 = await sha256Hex(resolved.map((value) => ({
    citationId: value.citation.id,
    citationStatus: value.citation.status,
    citationSnapshotDigest: value.citationSnapshotDigest,
    documentId: value.document.id,
    documentContentHash: value.document.contentHash,
    documentSnapshotDigest: value.documentSnapshotDigest,
    sourceRightsSnapshotDigest: value.sourceRightsSnapshotDigest
  })));

  const candidates = resolved.filter((value) => value.citation.status === "user_candidate");
  const verified = resolved.filter((value) => value.citation.status === "verified");
  const rejected = resolved.filter((value) => value.citation.status === "rejected");
  const rightsBlocked = verified
    .filter((value) => !value.redistributable)
    .map((value) => ({ citationId: value.citation.id, reason: "source_not_redistributable" as const }));
  const externalBlocked = verified.map((value) => ({
    citationId: value.citation.id,
    reason: value.redistributable
      ? "external_authorization_unavailable" as const
      : "source_not_redistributable" as const
  }));

  let status: KnowledgeSourceAwareRetrievalStatus;
  if (verified.length === 0) {
    status = "blocked_no_verified_citations";
  } else if (input.useMode === "local_review") {
    status = candidates.length > 0
      ? "ready_for_local_review_with_unreviewed_sources"
      : "ready_for_local_review";
  } else if (candidates.length > 0) {
    status = "blocked_unreviewed_target_sources";
  } else if (rightsBlocked.length > 0) {
    status = "blocked_external_rights_incomplete";
  } else {
    status = "blocked_external_authorization_unavailable";
  }

  const mayEmit = input.useMode === "local_review";
  const items = mayEmit
    ? await Promise.all(verified.map((value, index) => buildItem(value, index + 1, targetKey)))
    : [];
  const localPrivateSourceTextIncluded = items.some((item) => (
    item.sourceRights.distributionPolicy === "local_private_only"
  ));
  const redistributionRightsGate = input.useMode === "local_review"
    ? "local_only_not_applicable" as const
    : verified.length > 0 && rightsBlocked.length === 0
      ? "passed_for_redistributable_content_only" as const
      : "failed" as const;
  const payload: RetrievalPayload = {
    profile: KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_PROFILE,
    request: {
      useMode: input.useMode,
      targetKey,
      evidenceSubject: {
        subjectId: subject.subjectId,
        registryVersion: subject.registryVersion,
        category: subject.category,
        label: subject.label,
        fieldPaths: [...subject.fieldPaths],
        ruleProfilePaths: [...subject.ruleProfilePaths]
      }
    },
    status,
    sourceMultiplicity: verified.length === 0
      ? "none"
      : verified.length === 1
        ? "single"
        : "multiple_preserved_without_resolution",
    items,
    candidateCitationIds: candidates.map((value) => value.citation.id),
    rejectedCitationIds: rejected.map((value) => value.citation.id),
    verifiedCitationIds: verified.map((value) => value.citation.id),
    blockedVerifiedCitations: input.useMode === "external_context_candidate" ? externalBlocked : [],
    counts: {
      matching: matching.length,
      candidate: candidates.length,
      verified: verified.length,
      rejected: rejected.length,
      emitted: items.length,
      blockedVerified: input.useMode === "external_context_candidate" ? externalBlocked.length : 0
    },
    sourceSet: {
      hashAlgorithm: "SHA-256",
      matchingSourceSetSha256,
      allMatchingCitationStatusesBound: true,
      rawSourceRecordsCopied: false
    },
    boundary: {
      exactDocumentCitationAndRightsBindingsVerified: true,
      allTargetBoundCitationIdsPreserved: true,
      semanticRankingPerformed: false,
      semanticConflictResolutionPerformed: false,
      citationSetConflictReviewPerformed: false,
      citationSetConflictStatus: "unassessed",
      citationReviewEstablishesSemanticTruth: false,
      rightsReviewEstablishesSemanticTruth: false,
      redistributionRightsGate,
      rawKnowledgeDocumentsCopied: false,
      exactCitationQuotesCopied: items.length > 0,
      containsSourceText: items.length > 0,
      localPrivateSourceTextIncluded,
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
    }
  };
  return deepFreeze({
    ...payload,
    integrity: {
      hashAlgorithm: "SHA-256",
      payloadSha256: await sha256Hex(payload),
      authenticityClaimed: false
    }
  });
}

export async function validateKnowledgeSourceAwareRetrievalPacket(
  rawPacket: unknown,
  rawInput: BuildKnowledgeSourceAwareRetrievalPacketInput
): Promise<KnowledgeSourceAwareRetrievalPacket> {
  inspectBoundedDeclarativeValue(
    rawPacket,
    { textCharacters: MAX_PACKET_TEXT_CHARACTERS, valueNodes: MAX_PACKET_VALUE_NODES },
    "来源感知检索包"
  );
  assertRawInputPreflight(rawInput);
  const packetSnapshot = canonicalClone(rawPacket);
  const inputSnapshot = canonicalClone(rawInput);
  const rebuilt = await buildKnowledgeSourceAwareRetrievalPacket(inputSnapshot);
  if (!sameValue(packetSnapshot, rebuilt)) {
    throw new Error("来源感知检索包与原始资料、引用及权利记录的规范重建不一致");
  }
  return rebuilt;
}
