import {
  replayRevisionNatalChart,
  verifyRevisionSnapshotIntegrity
} from "@hakimi/chart-integrity";
import {
  caseRecordSchema,
  type CaseRecord,
  type RevisionRecord,
  type RulePackBinding
} from "@hakimi/contracts";
import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import {
  KNOWLEDGE_CITATION_SET_CONFLICT_INVENTORY_LIMITS,
  KNOWLEDGE_CITATION_SET_CONFLICT_INVENTORY_PROFILE,
  KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_LIMITS,
  KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_PROFILE,
  requireEvidenceSubject,
  type KnowledgeCitationSetConflictInventory,
  type KnowledgeSourceAwareRetrievalItem,
  type KnowledgeSourceAwareRetrievalPacket
} from "@hakimi/knowledge-core";
import {
  LOCAL_KNOWLEDGE_CITATION_REVIEW_WORKSET_SNAPSHOT_PROFILE,
  LOCAL_KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_SNAPSHOT_PROFILE,
  type LocalKnowledgeCitationReviewWorksetSnapshot,
  type LocalKnowledgeCitationReviewWorksetStorageSnapshot,
  type LocalKnowledgeSourceAwareRetrievalStorageSnapshot
} from "@hakimi/storage";

export const BAZI_CITATION_REVIEW_CONTEXT_SNAPSHOT_PROFILE = Object.freeze({
  snapshotVersion: "hakimi.bazi.citation_review_context_snapshot/0.1.0",
  contentVersion: "0.1.0",
  system: "bazi" as const,
  scope: "one_exact_replayable_revision_field_and_one_local_citation_record_verified_set" as const,
  contextPolicy: "revision_frozen_fact_and_rule_projection_before_human_observation" as const,
  mutationPolicy: "read_only_projection" as const,
  reviewStatus: "context_bound_to_supplied_workset_pending_freshness_revalidation" as const,
  factProjectionDigestDomain: "hakimi.bazi.citation_review_context_snapshot.fact_projection/1" as const,
  ruleProjectionDigestDomain: "hakimi.bazi.citation_review_context_snapshot.rule_projection/1" as const,
  displayContextBindingDigestDomain: "hakimi.bazi.citation_review_context_snapshot.display_context_binding/1" as const,
  digestDomain: "hakimi.bazi.citation_review_context_snapshot.payload/1" as const,
  expertTruthClaimed: false as const,
  scientificValidityClaimed: false as const,
  formalActivationAllowed: false as const
});

export interface BaziReviewReleaseIdentity {
  dbGeneration: "legacy-v13";
  targetSchema: 13;
  migrationId: null;
}

export interface BaziCitationReviewContextSelection {
  caseId: string;
  revisionId: string;
  evidenceSubjectId: string;
  fieldPath: string;
}

export interface BuildBaziCitationReviewContextSnapshotInput {
  releaseIdentity: BaziReviewReleaseIdentity;
  selection: BaziCitationReviewContextSelection;
  caseRecord: CaseRecord;
  revision: RevisionRecord;
  workset: LocalKnowledgeCitationReviewWorksetSnapshot;
}

export interface BaziCitationReviewContextFactProjectionItem {
  fieldPath: string;
  value: string | readonly string[];
  provenance: Readonly<{
    field: string;
    kind: "calendar_fact" | "rule_derived" | "interpretive_claim" | "ai_expression";
    algorithmId: string;
    verificationStatus: "gold_verified" | "adjudicated" | "disputed" | "experimental";
  }>;
}

export interface BaziCitationReviewContextRuleProjectionItem {
  ruleProfilePath: "calendar.dayBoundary";
  value: RevisionRecord["ruleProfile"]["calendar"]["dayBoundary"];
}

export interface BaziCitationReviewContextSnapshot {
  profile: typeof BAZI_CITATION_REVIEW_CONTEXT_SNAPSHOT_PROFILE;
  releaseBinding: Readonly<{
    dbGeneration: "legacy-v13";
    targetSchema: 13;
    migrationId: null;
    callerProvidedExpectedValuesMatched: true;
    runtimeReleaseIdentityAttested: false;
    storageAttestedDbGeneration: false;
    storageAttestedMigrationIdentity: false;
    engineeringEvidenceOnly: true;
  }>;
  caseBinding: Readonly<{
    caseId: string;
    deletedInSuppliedCaseSnapshot: false;
    selectedRevisionWasLatestInSuppliedCaseSnapshot: boolean;
    repositoryFreshnessAttested: false;
  }>;
  revisionBinding: Readonly<{
    revisionId: string;
    revisionNumber: number;
    revisionSnapshotDigest: string;
    storedResultHash: string;
    replayedResultHash: string;
    replayProjectionDigest: string;
    replayExecutorId: string;
    engine: RevisionRecord["manifest"]["engine"];
    tzdbVersion: string;
  }>;
  subjectBinding: Readonly<{
    evidenceSubjectId: string;
    registryVersion: string;
    category: "calendar_fact" | "rule_derived";
    label: string;
    fieldPath: string;
    algorithmIds: readonly string[];
    ruleProfilePaths: readonly string[];
  }>;
  factProjection: Readonly<{
    items: readonly BaziCitationReviewContextFactProjectionItem[];
    projectionSha256: string;
  }>;
  ruleProjection: Readonly<{
    profileId: string;
    profileVersion: string;
    profileStatus: RevisionRecord["ruleProfile"]["status"];
    ruleProfileDigest: string;
    revisionRulePackBinding: RulePackBinding | null;
    liveActiveRulePackReadPerformed: false;
    items: readonly BaziCitationReviewContextRuleProjectionItem[];
    projectionSha256: string;
  }>;
  worksetBinding: Readonly<{
    worksetSnapshotVersion: string;
    worksetSnapshotSha256: string;
    suppliedStorageSidecarSnapshotVersion: string;
    suppliedStorageSidecarSnapshotSha256: string;
    packetProjectionVersion: string;
    packetPayloadSha256: string;
    matchingSourceSetSha256: string;
    inventoryProjectionVersion: string;
    inventoryPayloadSha256: string;
    citationIdsWithStoredVerifiedStatus: readonly string[];
    pairCount: number;
    reviewGateStatus: "pending_human_review";
  }>;
  displayContextBinding: Readonly<{
    projectionVersion: "0.1.0";
    payloadSha256: string;
  }>;
  boundary: Readonly<{
    exactRevisionReplayMatched: true;
    registeredFieldProjectionBound: true;
    revisionFrozenRuleProjectionBound: true;
    worksetFourLayerDigestsRecomputed: true;
    rawBirthInputCopied: false;
    caseAliasTagsNotesCopied: false;
    sourceTextCopiedIntoContextSnapshot: false;
    containsDerivedSensitiveChartData: true;
    crossRepositoryAtomicSnapshotVerified: false;
    caseRevisionAndKnowledgeAtomicCaptureVerified: false;
    suppliedWorksetStorageOriginAttested: false;
    suppliedCaseSnapshotFreshnessAttested: false;
    runtimeReleaseIdentityAttested: false;
    worksetFreshnessRevalidatedByBuilder: false;
    reviewMayBeginWithoutFreshnessRevalidation: false;
    mutationEpochRevalidationPerformed: false;
    liveActiveRulePackReadPerformed: false;
    interpretationEnvelopeUsed: false;
    chartApplicabilityAssessed: false;
    citationSemanticApplicabilityAssessed: false;
    citationSetConflictReviewPerformed: false;
    semanticConflictResolutionPerformed: false;
    humanReviewPerformed: false;
    reviewerIdentityVerified: false;
    humanReviewAuthenticityVerified: false;
    sourceAuthenticityClaimed: false;
    sourceTextInstructionAuthority: false;
    storageReadPerformed: false;
    externalProviderUseAuthorized: false;
    networkTransmissionPerformed: false;
    networkTransmissionAuthorized: false;
    storageMutationPerformed: false;
    chartMutationPerformed: false;
    caseOrRevisionMutationPerformed: false;
    publicExportAuthorized: false;
    expertTruthClaimed: false;
    scientificValidityClaimed: false;
    formalActivationAllowed: false;
    authenticityClaimed: false;
    result: null;
  }>;
  integrity: Readonly<{
    hashAlgorithm: "SHA-256";
    payloadSha256: string;
    authenticityClaimed: false;
  }>;
}

type BaziCitationReviewContextSnapshotPayload = Omit<
  BaziCitationReviewContextSnapshot,
  "integrity"
>;

export type BaziCitationReviewContextSnapshotErrorCode =
  | "INVALID_INPUT"
  | "RELEASE_IDENTITY_MISMATCH"
  | "WORKSET_MISMATCH"
  | "REVIEW_GATE_BLOCKED"
  | "CASE_REVISION_MISMATCH"
  | "REVISION_REPLAY_BLOCKED"
  | "FIELD_CONTEXT_MISMATCH"
  | "RULE_CONTEXT_MISMATCH"
  | "CONTEXT_BUILD_FAILED"
  | "SNAPSHOT_MISMATCH";

export class BaziCitationReviewContextSnapshotError extends Error {
  constructor(readonly code: BaziCitationReviewContextSnapshotErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "BaziCitationReviewContextSnapshotError";
  }
}

const LOWERCASE_SHA256 = /^[a-f0-9]{64}$/u;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const INPUT_LIMITS = Object.freeze({
  maxDepth: 128,
  maxValueNodes: 100_000,
  maxTextCharacters: 8_000_000,
  maxArrayLength: 25_000,
  maxObjectKeys: 300_000
});

type DeclarativeSnapshotBudget = {
  valueNodes: number;
  textCharacters: number;
  objectKeys: number;
};

function invalidInput(message: string, options?: ErrorOptions): never {
  throw new BaziCitationReviewContextSnapshotError("INVALID_INPUT", message, options);
}

function snapshotDeclarativeValue(
  value: unknown,
  path: string,
  depth: number,
  budget: DeclarativeSnapshotBudget,
  ancestors: WeakSet<object>
): unknown {
  budget.valueNodes += 1;
  if (budget.valueNodes > INPUT_LIMITS.maxValueNodes) invalidInput("复核上下文输入超过有界节点预算。");
  if (depth > INPUT_LIMITS.maxDepth) invalidInput(`复核上下文输入 ${path} 超过最大深度。`);
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") {
    budget.textCharacters += value.length;
    if (budget.textCharacters > INPUT_LIMITS.maxTextCharacters) {
      invalidInput("复核上下文输入超过有界文本预算。");
    }
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) invalidInput(`复核上下文输入 ${path} 包含非有限数。`);
    return value;
  }
  if (typeof value !== "object") invalidInput(`复核上下文输入 ${path} 不是可声明式快照的 JSON 值。`);
  if (ancestors.has(value)) invalidInput(`复核上下文输入 ${path} 包含循环引用。`);
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) {
        invalidInput(`复核上下文输入 ${path} 使用了非标准数组原型。`);
      }
      if (value.length > INPUT_LIMITS.maxArrayLength) {
        invalidInput(`复核上下文输入 ${path} 的数组超过有界长度。`);
      }
      const ownKeys = Reflect.ownKeys(value);
      const expectedKeys = new Set(["length", ...Array.from({ length: value.length }, (_, index) => String(index))]);
      if (
        ownKeys.some((key) => typeof key !== "string" || !expectedKeys.has(key))
        || ownKeys.length !== expectedKeys.size
      ) {
        invalidInput(`复核上下文输入 ${path} 包含 Symbol、稀疏项或额外数组属性。`);
      }
      const clone: unknown[] = [];
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
          invalidInput(`复核上下文输入 ${path}[${index}] 必须是自有数据字段。`);
        }
        clone.push(snapshotDeclarativeValue(
          descriptor.value,
          `${path}[${index}]`,
          depth + 1,
          budget,
          ancestors
        ));
      }
      return clone;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      invalidInput(`复核上下文输入 ${path} 必须是普通对象。`);
    }
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key !== "string")) {
      invalidInput(`复核上下文输入 ${path} 不能包含 Symbol 字段。`);
    }
    budget.objectKeys += ownKeys.length;
    if (budget.objectKeys > INPUT_LIMITS.maxObjectKeys) {
      invalidInput("复核上下文输入超过有界属性键预算。");
    }
    const clone: Record<string, unknown> = {};
    for (const key of ownKeys as string[]) {
      if (FORBIDDEN_KEYS.has(key)) invalidInput(`复核上下文输入 ${path}.${key} 使用了危险字段名。`);
      budget.textCharacters += key.length;
      if (budget.textCharacters > INPUT_LIMITS.maxTextCharacters) {
        invalidInput("复核上下文输入超过有界文本预算。");
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
        invalidInput(`复核上下文输入 ${path}.${key} 必须是自有数据字段。`);
      }
      clone[key] = snapshotDeclarativeValue(
        descriptor.value,
        `${path}.${key}`,
        depth + 1,
        budget,
        ancestors
      );
    }
    return clone;
  } finally {
    ancestors.delete(value);
  }
}

function snapshotInput(rawInput: unknown): BuildBaziCitationReviewContextSnapshotInput {
  const snapshot = snapshotDeclarativeValue(
    rawInput,
    "input",
    0,
    { valueNodes: 0, textCharacters: 0, objectKeys: 0 },
    new WeakSet<object>()
  );
  assertExactRecord(snapshot, ["releaseIdentity", "selection", "caseRecord", "revision", "workset"], "输入");
  assertExactRecord(snapshot.releaseIdentity, ["dbGeneration", "targetSchema", "migrationId"], "发布身份");
  assertExactRecord(
    snapshot.selection,
    ["caseId", "revisionId", "evidenceSubjectId", "fieldPath"],
    "复核选择"
  );
  assertExactRecord(snapshot.caseRecord, [
    "schemaVersion",
    "id",
    "alias",
    "tags",
    "notes",
    "createdAt",
    "updatedAt",
    "latestRevisionId",
    "revisionCount",
    "recordVersion",
    "favorite",
    "deletedAt"
  ], "Case 记录");
  assertAllowedRecord(snapshot.revision, [
    "schemaVersion",
    "id",
    "caseId",
    "revisionNumber",
    "createdAt",
    "input",
    "timeCalibration",
    "ruleProfile",
    "luckCycleRuleSnapshot",
    "facts",
    "manifest",
    "rulePackBinding"
  ], [
    "schemaVersion",
    "id",
    "caseId",
    "revisionNumber",
    "createdAt",
    "input",
    "timeCalibration",
    "ruleProfile",
    "facts",
    "manifest"
  ], "Revision 记录");
  assertExactRecord(snapshot.workset, ["packet", "inventory", "storageSnapshot", "worksetSnapshot"], "来源复核工作集");
  return deepFreeze(snapshot) as unknown as BuildBaziCitationReviewContextSnapshotInput;
}

function assertPlainRecord(value: unknown, subject: string): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    invalidInput(`${subject} 必须是对象。`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) invalidInput(`${subject} 必须是普通对象。`);
}

function assertExactRecord(
  value: unknown,
  expectedKeys: readonly string[],
  subject: string
): asserts value is Record<string, unknown> {
  assertPlainRecord(value, subject);
  const actualKeys = Object.keys(value).sort();
  const sortedExpected = [...expectedKeys].sort();
  if (!sameCanonical(actualKeys, sortedExpected)) invalidInput(`${subject} 字段集合不匹配。`);
}

function assertAllowedRecord(
  value: unknown,
  allowedKeys: readonly string[],
  requiredKeys: readonly string[],
  subject: string
): asserts value is Record<string, unknown> {
  assertPlainRecord(value, subject);
  const keys = Object.keys(value);
  const allowed = new Set(allowedKeys);
  if (keys.some((key) => !allowed.has(key)) || requiredKeys.some((key) => !Object.hasOwn(value, key))) {
    invalidInput(`${subject} 缺少必需字段或包含未来字段。`);
  }
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if ("value" in descriptor) deepFreeze(descriptor.value);
  }
  return value;
}

function sameCanonical(left: unknown, right: unknown): boolean {
  return canonicalStringify(left) === canonicalStringify(right);
}

function sameOrderedStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function assertCanonicalDigest(value: unknown, subject: string): asserts value is string {
  if (typeof value !== "string" || !LOWERCASE_SHA256.test(value)) {
    throw new BaziCitationReviewContextSnapshotError("WORKSET_MISMATCH", `${subject} 不是规范小写 SHA-256。`);
  }
}

function assertSortedUniqueStrings(values: readonly string[], subject: string): void {
  const expected = [...new Set(values)].sort();
  if (!sameOrderedStrings(values, expected)) {
    throw new BaziCitationReviewContextSnapshotError("WORKSET_MISMATCH", `${subject} 必须规范排序且不能重复。`);
  }
}

function withoutKey<T extends object, K extends keyof T>(value: T, key: K): Omit<T, K> {
  const clone: Partial<T> = { ...value };
  delete clone[key];
  return clone as Omit<T, K>;
}

function worksetMismatch(message: string, cause?: unknown): never {
  throw new BaziCitationReviewContextSnapshotError(
    "WORKSET_MISMATCH",
    message,
    cause === undefined ? undefined : { cause }
  );
}

function assertWorksetExactRecord(
  value: unknown,
  expectedKeys: readonly string[],
  subject: string
): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    worksetMismatch(`${subject} 必须是对象。`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    worksetMismatch(`${subject} 必须是普通对象。`);
  }
  const actualKeys = Object.keys(value).sort();
  if (!sameCanonical(actualKeys, [...expectedKeys].sort())) {
    worksetMismatch(`${subject} 字段集合不匹配。`);
  }
}

function worksetArray(value: unknown, subject: string): readonly unknown[] {
  if (!Array.isArray(value)) worksetMismatch(`${subject} 必须是数组。`);
  return value;
}

function worksetString(value: unknown, subject: string): string {
  if (typeof value !== "string") worksetMismatch(`${subject} 必须是字符串。`);
  return value;
}

function worksetStringArray(value: unknown, subject: string): readonly string[] {
  const values = worksetArray(value, subject);
  for (let index = 0; index < values.length; index += 1) {
    worksetString(values[index], `${subject}[${index}]`);
  }
  return values as readonly string[];
}

function assertWorksetLiteral(value: unknown, expected: unknown, subject: string): void {
  if (!Object.is(value, expected)) worksetMismatch(`${subject} 固定值不匹配。`);
}

function assertWorksetOneOf(
  value: unknown,
  allowedValues: readonly unknown[],
  subject: string
): void {
  if (!allowedValues.some((candidate) => Object.is(candidate, value))) {
    worksetMismatch(`${subject} 枚举值无效。`);
  }
}

function worksetNonnegativeInteger(value: unknown, subject: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    worksetMismatch(`${subject} 必须是非负安全整数。`);
  }
  return value as number;
}

function worksetPositiveInteger(value: unknown, subject: string): number {
  const integer = worksetNonnegativeInteger(value, subject);
  if (integer < 1) worksetMismatch(`${subject} 必须是正整数。`);
  return integer;
}

function assertWorksetUuid(value: unknown, subject: string): asserts value is string {
  if (typeof value !== "string" || !UUID.test(value)) worksetMismatch(`${subject} 必须是 UUID。`);
}

function assertWorksetDigest(value: unknown, subject: string): asserts value is string {
  if (typeof value !== "string" || !LOWERCASE_SHA256.test(value)) {
    worksetMismatch(`${subject} 不是规范小写 SHA-256。`);
  }
}

const PACKET_BOUNDARY_KEYS = Object.freeze([
  "exactDocumentCitationAndRightsBindingsVerified",
  "allTargetBoundCitationIdsPreserved",
  "semanticRankingPerformed",
  "semanticConflictResolutionPerformed",
  "citationSetConflictReviewPerformed",
  "citationSetConflictStatus",
  "citationReviewEstablishesSemanticTruth",
  "rightsReviewEstablishesSemanticTruth",
  "redistributionRightsGate",
  "rawKnowledgeDocumentsCopied",
  "exactCitationQuotesCopied",
  "containsSourceText",
  "localPrivateSourceTextIncluded",
  "sourceTextInstructionAuthority",
  "promptInjectionScreeningPerformed",
  "privacyReviewPerformed",
  "externalPurposeRightsReviewed",
  "externalProviderUseAuthorized",
  "atomicStorageSnapshotVerified",
  "mutationEpochRevalidationPerformed",
  "downstreamExternalUseGate",
  "networkTransmissionPerformed",
  "networkTransmissionAuthorized",
  "publicExportAuthorized",
  "expertTruthClaimed",
  "scientificValidityClaimed",
  "formalActivationAllowed",
  "chartOrStorageMutationPerformed",
  "result"
] as const);

async function validatePacketNestedStructure(
  packet: KnowledgeSourceAwareRetrievalPacket
): Promise<void> {
  assertWorksetExactRecord(packet.request, ["useMode", "targetKey", "evidenceSubject"], "检索包 request");
  assertWorksetExactRecord(
    packet.request.evidenceSubject,
    ["subjectId", "registryVersion", "category", "label", "fieldPaths", "ruleProfilePaths"],
    "检索包 evidenceSubject"
  );
  assertWorksetExactRecord(
    packet.counts,
    ["matching", "candidate", "verified", "rejected", "emitted", "blockedVerified"],
    "检索包 counts"
  );
  assertWorksetExactRecord(
    packet.sourceSet,
    ["hashAlgorithm", "matchingSourceSetSha256", "allMatchingCitationStatusesBound", "rawSourceRecordsCopied"],
    "检索包 sourceSet"
  );
  assertWorksetExactRecord(
    packet.integrity,
    ["hashAlgorithm", "payloadSha256", "authenticityClaimed"],
    "检索包 integrity"
  );
  assertWorksetExactRecord(packet.boundary, PACKET_BOUNDARY_KEYS, "检索包 boundary");

  assertWorksetLiteral(packet.request.useMode, "local_review", "检索包 useMode");
  const subjectId = worksetString(packet.request.evidenceSubject.subjectId, "检索包主题 ID");
  const targetKey = worksetString(packet.request.targetKey, "检索包 targetKey");
  if (targetKey !== `evidence_subject:${subjectId}`) {
    worksetMismatch("检索包 targetKey 未由主题 ID 规范生成。");
  }
  worksetString(packet.request.evidenceSubject.registryVersion, "检索包注册表版本");
  worksetString(packet.request.evidenceSubject.label, "检索包主题标签");
  assertWorksetOneOf(packet.request.evidenceSubject.category, ["calendar_fact", "rule_derived"], "检索包主题类别");
  worksetStringArray(packet.request.evidenceSubject.fieldPaths, "检索包主题字段路径");
  worksetStringArray(packet.request.evidenceSubject.ruleProfilePaths, "检索包主题规则路径");

  const candidateIds = worksetStringArray(packet.candidateCitationIds, "candidate 引用账");
  const verifiedIds = worksetStringArray(packet.verifiedCitationIds, "verified 引用账");
  const rejectedIds = worksetStringArray(packet.rejectedCitationIds, "rejected 引用账");
  const items = worksetArray(packet.items, "检索包 items");
  const blocked = worksetArray(packet.blockedVerifiedCitations, "检索包 blockedVerifiedCitations");
  if (
    candidateIds.length + verifiedIds.length + rejectedIds.length
      > KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_LIMITS.maxMatchingCitations
    || verifiedIds.length > KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_LIMITS.maxVerifiedItems
    || items.length > KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_LIMITS.maxVerifiedItems
  ) {
    worksetMismatch("检索包超过来源感知检索合同的匹配引用或 verified item 上限。");
  }
  if (blocked.length !== 0) worksetMismatch("本机复核包不得包含 blocked verified 引用。");

  const expectedStatus = verifiedIds.length === 0
    ? "blocked_no_verified_citations"
    : candidateIds.length > 0
      ? "ready_for_local_review_with_unreviewed_sources"
      : "ready_for_local_review";
  assertWorksetLiteral(packet.status, expectedStatus, "检索包状态");
  assertWorksetLiteral(
    packet.sourceMultiplicity,
    verifiedIds.length === 0
      ? "none"
      : verifiedIds.length === 1
        ? "single"
        : "multiple_preserved_without_resolution",
    "检索包来源多重性"
  );
  if (items.length !== verifiedIds.length) worksetMismatch("检索包 items 与 verified 引用账数量不一致。");

  const itemDigestChecks: Promise<void>[] = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index] as KnowledgeSourceAwareRetrievalItem;
    assertWorksetExactRecord(item, [
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
    ], `检索包 item[${index}]`);
    assertWorksetExactRecord(item.document, [
      "documentId",
      "documentContentHash",
      "documentSnapshotDigest",
      "recordType",
      "title",
      "author",
      "edition"
    ], `检索包 item[${index}].document`);
    assertWorksetExactRecord(
      item.locator,
      ["sectionId", "startLine", "endLine"],
      `检索包 item[${index}].locator`
    );
    assertWorksetExactRecord(item.sourceRights, [
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
    ], `检索包 item[${index}].sourceRights`);
    assertWorksetExactRecord(
      item.citationReview,
      ["status", "reviewerCount", "decisionNoteDigest"],
      `检索包 item[${index}].citationReview`
    );

    assertWorksetLiteral(item.order, index + 1, `检索包 item[${index}].order`);
    assertWorksetUuid(item.citationId, `检索包 item[${index}].citationId`);
    if (item.citationId !== verifiedIds[index]) {
      worksetMismatch("检索包 items 必须与 verified 引用账保持同一规范顺序。");
    }
    assertWorksetDigest(item.citationSnapshotDigest, `检索包 item[${index}] citation 摘要`);
    assertWorksetUuid(item.document.documentId, `检索包 item[${index}] documentId`);
    assertWorksetDigest(item.document.documentContentHash, `检索包 item[${index}] document contentHash`);
    assertWorksetDigest(item.document.documentSnapshotDigest, `检索包 item[${index}] document 摘要`);
    assertWorksetOneOf(
      item.document.recordType,
      ["user_knowledge_document", "bundled_knowledge_document"],
      `检索包 item[${index}] document recordType`
    );
    worksetString(item.document.title, `检索包 item[${index}] document title`);
    worksetString(item.document.author, `检索包 item[${index}] document author`);
    worksetString(item.document.edition, `检索包 item[${index}] document edition`);

    const sectionId = worksetString(item.locator.sectionId, `检索包 item[${index}] sectionId`);
    if (!/^section-[1-9]\d*$/u.test(sectionId)) worksetMismatch("检索包 locator sectionId 无效。");
    const startLine = worksetPositiveInteger(item.locator.startLine, `检索包 item[${index}] startLine`);
    const endLine = worksetPositiveInteger(item.locator.endLine, `检索包 item[${index}] endLine`);
    if (endLine < startLine || endLine - startLine + 1 > 200) {
      worksetMismatch("检索包 locator 行范围无效。");
    }
    const quote = worksetString(item.quote, `检索包 item[${index}] quote`);
    if (quote.length === 0 || quote.length > 20_000 || quote.includes("\r") || quote.includes("\0") || !quote.trim()) {
      worksetMismatch("检索包 quote 不符合规范文本合同。");
    }
    assertWorksetLiteral(item.targetKey, targetKey, `检索包 item[${index}] targetKey`);

    assertWorksetDigest(item.sourceRights.snapshotDigest, `检索包 item[${index}] rights 摘要`);
    assertWorksetOneOf(item.sourceRights.origin, ["user_import", "bundled"], `检索包 item[${index}] rights origin`);
    assertWorksetOneOf(item.sourceRights.status, [
      "user_unverified",
      "public_domain_verified",
      "licensed_verified",
      "project_original_verified",
      "blocked"
    ], `检索包 item[${index}] rights status`);
    assertWorksetOneOf(item.sourceRights.workStatus, [
      "unknown",
      "public_domain_verified",
      "copyrighted",
      "project_original_verified"
    ], `检索包 item[${index}] workStatus`);
    assertWorksetOneOf(item.sourceRights.editionStatus, [
      "unknown",
      "public_domain_verified",
      "licensed_verified",
      "project_original_verified",
      "copyrighted"
    ], `检索包 item[${index}] editionStatus`);
    assertWorksetOneOf(item.sourceRights.basis, [
      "user_declaration",
      "public_domain",
      "spdx_license",
      "written_permission",
      "project_authored",
      "unknown"
    ], `检索包 item[${index}] rights basis`);
    if (item.sourceRights.licenseId !== null) {
      worksetString(item.sourceRights.licenseId, `检索包 item[${index}] licenseId`);
    }
    assertWorksetOneOf(
      item.sourceRights.distributionPolicy,
      ["local_private_only", "redistributable"],
      `检索包 item[${index}] distributionPolicy`
    );
    assertWorksetOneOf(
      item.sourceRights.reviewStatus,
      ["unreviewed", "single_reviewed", "double_reviewed"],
      `检索包 item[${index}] rights reviewStatus`
    );
    worksetNonnegativeInteger(item.sourceRights.rightsEvidenceCount, `检索包 item[${index}] rightsEvidenceCount`);

    assertWorksetLiteral(item.citationReview.status, "verified", `检索包 item[${index}] citation status`);
    const reviewerCount = worksetNonnegativeInteger(
      item.citationReview.reviewerCount,
      `检索包 item[${index}] reviewerCount`
    );
    if (reviewerCount < 2) worksetMismatch("已复核引用记录必须保留至少两个复核身份计数。");
    assertWorksetDigest(item.citationReview.decisionNoteDigest, `检索包 item[${index}] decisionNote 摘要`);
    assertWorksetLiteral(
      item.evidenceClassification,
      item.sourceRights.distributionPolicy === "redistributable"
        ? "verified_exact_quote_redistributable"
        : "verified_exact_quote_local_private",
      `检索包 item[${index}] evidenceClassification`
    );
    assertWorksetDigest(item.itemDigest, `检索包 item[${index}] item 摘要`);
    assertWorksetLiteral(item.semanticTruthClaimed, false, `检索包 item[${index}] semanticTruthClaimed`);
    assertWorksetLiteral(item.expertTruthClaimed, false, `检索包 item[${index}] expertTruthClaimed`);
    assertWorksetLiteral(item.scientificValidityClaimed, false, `检索包 item[${index}] scientificValidityClaimed`);
    assertWorksetLiteral(item.result, null, `检索包 item[${index}] result`);
    itemDigestChecks.push((async () => {
      if (await sha256Hex(withoutKey(item, "itemDigest")) !== item.itemDigest) {
        worksetMismatch(`检索包 item[${index}] 摘要无法规范复算。`);
      }
    })());
  }
  await Promise.all(itemDigestChecks);

  for (const [key, expected] of [
    ["matching", candidateIds.length + verifiedIds.length + rejectedIds.length],
    ["candidate", candidateIds.length],
    ["verified", verifiedIds.length],
    ["rejected", rejectedIds.length],
    ["emitted", items.length],
    ["blockedVerified", 0]
  ] as const) {
    assertWorksetLiteral(packet.counts[key], expected, `检索包 counts.${key}`);
  }
  assertWorksetLiteral(packet.sourceSet.hashAlgorithm, "SHA-256", "检索包 sourceSet hashAlgorithm");
  assertWorksetDigest(packet.sourceSet.matchingSourceSetSha256, "检索包 matching source-set 摘要");
  assertWorksetLiteral(packet.sourceSet.allMatchingCitationStatusesBound, true, "检索包 source-set 完整账标记");
  assertWorksetLiteral(packet.sourceSet.rawSourceRecordsCopied, false, "检索包 raw source record 标记");
  assertWorksetLiteral(packet.integrity.hashAlgorithm, "SHA-256", "检索包 integrity hashAlgorithm");
  assertWorksetDigest(packet.integrity.payloadSha256, "检索包 payload 摘要");
  assertWorksetLiteral(packet.integrity.authenticityClaimed, false, "检索包 authenticityClaimed");

  const anyLocalPrivate = items.some((value) => (
    (value as KnowledgeSourceAwareRetrievalItem).sourceRights.distributionPolicy === "local_private_only"
  ));
  for (const [key, expected] of [
    ["exactDocumentCitationAndRightsBindingsVerified", true],
    ["allTargetBoundCitationIdsPreserved", true],
    ["semanticRankingPerformed", false],
    ["semanticConflictResolutionPerformed", false],
    ["citationSetConflictReviewPerformed", false],
    ["citationSetConflictStatus", "unassessed"],
    ["citationReviewEstablishesSemanticTruth", false],
    ["rightsReviewEstablishesSemanticTruth", false],
    ["redistributionRightsGate", "local_only_not_applicable"],
    ["rawKnowledgeDocumentsCopied", false],
    ["exactCitationQuotesCopied", items.length > 0],
    ["containsSourceText", items.length > 0],
    ["localPrivateSourceTextIncluded", anyLocalPrivate],
    ["sourceTextInstructionAuthority", false],
    ["promptInjectionScreeningPerformed", false],
    ["privacyReviewPerformed", false],
    ["externalPurposeRightsReviewed", false],
    ["externalProviderUseAuthorized", false],
    ["atomicStorageSnapshotVerified", false],
    ["mutationEpochRevalidationPerformed", false],
    ["downstreamExternalUseGate", "blocked"],
    ["networkTransmissionPerformed", false],
    ["networkTransmissionAuthorized", false],
    ["publicExportAuthorized", false],
    ["expertTruthClaimed", false],
    ["scientificValidityClaimed", false],
    ["formalActivationAllowed", false],
    ["chartOrStorageMutationPerformed", false],
    ["result", null]
  ] as const) {
    assertWorksetLiteral(packet.boundary[key], expected, `检索包 boundary.${key}`);
  }
}

const INVENTORY_BOUNDARY_KEYS = Object.freeze([
  "rawSourceRecordsCopied",
  "containsSourceText",
  "sourceTextInstructionAuthority",
  "promptInjectionScreeningPerformed",
  "privacyReviewPerformed",
  "externalPurposeRightsReviewed",
  "atomicStorageSnapshotVerified",
  "mutationEpochRevalidationPerformed",
  "externalProviderUseAuthorized",
  "networkTransmissionPerformed",
  "networkTransmissionAuthorized",
  "publicExportAuthorized",
  "expertTruthClaimed",
  "scientificValidityClaimed",
  "formalActivationAllowed",
  "chartOrStorageMutationPerformed",
  "result"
] as const);

function expectedInventoryStatus(
  candidateCount: number,
  verifiedCount: number,
  rejectedCount: number
): KnowledgeCitationSetConflictInventory["reviewGate"]["status"] {
  if (verifiedCount === 0) return "blocked_no_verified_citations";
  if (candidateCount > 0) return "blocked_unreviewed_target_sources";
  if (verifiedCount === 1 && rejectedCount === 0) return "no_pairwise_review_required";
  return "pending_human_review";
}

function validateInventoryNestedStructure(
  inventory: KnowledgeCitationSetConflictInventory
): void {
  assertWorksetExactRecord(inventory.binding, [
    "evidenceSubjectId",
    "registryVersion",
    "retrievalUseMode",
    "targetKey",
    "retrievalProjectionVersion",
    "retrievalPayloadSha256",
    "matchingSourceSetSha256",
    "candidateCitationIds",
    "verifiedCitationIds",
    "rejectedCitationIds"
  ], "机械清单 binding");
  assertWorksetExactRecord(inventory.counts, [
    "candidateCitations",
    "verifiedCitations",
    "rejectedCitations",
    "distinctDocuments",
    "pairs"
  ], "机械清单 counts");
  assertWorksetExactRecord(inventory.reviewGate, [
    "status",
    "pairwiseComparisonRequired",
    "humanReviewRequired",
    "candidateResolutionRequired",
    "rejectedCitationAcknowledgementRequired",
    "automatedConflictDetectionPerformed",
    "citationSetConflictReviewPerformed",
    "citationSetConflictStatus",
    "semanticConflictResolutionPerformed",
    "reviewerIdentityVerified",
    "downstreamExternalUseGate"
  ], "机械清单 reviewGate");
  assertWorksetExactRecord(inventory.boundary, INVENTORY_BOUNDARY_KEYS, "机械清单 boundary");
  assertWorksetExactRecord(
    inventory.integrity,
    ["hashAlgorithm", "payloadSha256", "authenticityClaimed"],
    "机械清单 integrity"
  );

  worksetString(inventory.binding.evidenceSubjectId, "机械清单主题 ID");
  worksetString(inventory.binding.registryVersion, "机械清单注册表版本");
  assertWorksetLiteral(inventory.binding.retrievalUseMode, "local_review", "机械清单 useMode");
  worksetString(inventory.binding.targetKey, "机械清单 targetKey");
  worksetString(inventory.binding.retrievalProjectionVersion, "机械清单 packet 版本");
  assertWorksetDigest(inventory.binding.retrievalPayloadSha256, "机械清单 packet 摘要");
  assertWorksetDigest(inventory.binding.matchingSourceSetSha256, "机械清单 source-set 摘要");
  const candidateIds = worksetStringArray(inventory.binding.candidateCitationIds, "机械清单 candidate 引用账");
  const verifiedIds = worksetStringArray(inventory.binding.verifiedCitationIds, "机械清单 verified 引用账");
  const rejectedIds = worksetStringArray(inventory.binding.rejectedCitationIds, "机械清单 rejected 引用账");

  const verifiedItems = worksetArray(inventory.verifiedItems, "机械清单 verifiedItems");
  if (verifiedItems.length > KNOWLEDGE_CITATION_SET_CONFLICT_INVENTORY_LIMITS.maxVerifiedItems) {
    worksetMismatch("机械清单超过 verified item 上限。");
  }
  for (let index = 0; index < verifiedItems.length; index += 1) {
    const item = verifiedItems[index] as KnowledgeCitationSetConflictInventory["verifiedItems"][number];
    assertWorksetExactRecord(item, [
      "order",
      "citationId",
      "itemDigest",
      "citationSnapshotDigest",
      "documentId",
      "documentContentHash",
      "documentSnapshotDigest",
      "sourceRightsSnapshotDigest"
    ], `机械清单 verifiedItems[${index}]`);
    assertWorksetLiteral(item.order, index + 1, `机械清单 verifiedItems[${index}].order`);
    assertWorksetUuid(item.citationId, `机械清单 verifiedItems[${index}].citationId`);
    if (item.citationId !== verifiedIds[index]) {
      worksetMismatch("机械清单 verifiedItems 必须与 verified 引用账同序。");
    }
    assertWorksetDigest(item.itemDigest, `机械清单 verifiedItems[${index}] item 摘要`);
    assertWorksetDigest(item.citationSnapshotDigest, `机械清单 verifiedItems[${index}] citation 摘要`);
    assertWorksetUuid(item.documentId, `机械清单 verifiedItems[${index}] documentId`);
    assertWorksetDigest(item.documentContentHash, `机械清单 verifiedItems[${index}] contentHash`);
    assertWorksetDigest(item.documentSnapshotDigest, `机械清单 verifiedItems[${index}] document 摘要`);
    assertWorksetDigest(item.sourceRightsSnapshotDigest, `机械清单 verifiedItems[${index}] rights 摘要`);
  }

  const pairs = worksetArray(inventory.pairs, "机械清单 pairs");
  if (pairs.length > KNOWLEDGE_CITATION_SET_CONFLICT_INVENTORY_LIMITS.maxPairComparisons) {
    worksetMismatch("机械清单超过完整 pair 比较上限。");
  }
  for (let index = 0; index < pairs.length; index += 1) {
    const pair = pairs[index] as KnowledgeCitationSetConflictInventory["pairs"][number];
    assertWorksetExactRecord(pair, [
      "order",
      "citationIds",
      "itemDigests",
      "sameDocumentId",
      "sameDocumentContentHash",
      "sameSourceRightsSnapshot",
      "locatorRelation",
      "exactQuoteRelation",
      "semanticRelationshipAssessed"
    ], `机械清单 pairs[${index}]`);
    assertWorksetLiteral(pair.order, index + 1, `机械清单 pairs[${index}].order`);
    const citationIds = worksetStringArray(pair.citationIds, `机械清单 pairs[${index}].citationIds`);
    const itemDigests = worksetStringArray(pair.itemDigests, `机械清单 pairs[${index}].itemDigests`);
    if (citationIds.length !== 2 || itemDigests.length !== 2) {
      worksetMismatch("机械清单 pair 必须绑定两个引用与两个 item 摘要。");
    }
    citationIds.forEach((value, tupleIndex) => assertWorksetUuid(
      value,
      `机械清单 pairs[${index}].citationIds[${tupleIndex}]`
    ));
    itemDigests.forEach((value, tupleIndex) => assertWorksetDigest(
      value,
      `机械清单 pairs[${index}].itemDigests[${tupleIndex}]`
    ));
    assertWorksetOneOf(pair.sameDocumentId, [true, false], `机械清单 pairs[${index}].sameDocumentId`);
    assertWorksetOneOf(
      pair.sameDocumentContentHash,
      [true, false],
      `机械清单 pairs[${index}].sameDocumentContentHash`
    );
    assertWorksetOneOf(
      pair.sameSourceRightsSnapshot,
      [true, false],
      `机械清单 pairs[${index}].sameSourceRightsSnapshot`
    );
    assertWorksetOneOf(pair.locatorRelation, [
      "same_range",
      "overlapping_ranges",
      "disjoint_ranges",
      "different_sections",
      "different_documents"
    ], `机械清单 pairs[${index}].locatorRelation`);
    assertWorksetOneOf(
      pair.exactQuoteRelation,
      ["code_unit_exact_equal", "code_unit_different"],
      `机械清单 pairs[${index}].exactQuoteRelation`
    );
    assertWorksetLiteral(
      pair.semanticRelationshipAssessed,
      false,
      `机械清单 pairs[${index}].semanticRelationshipAssessed`
    );
  }

  for (const [key, expected] of [
    ["candidateCitations", candidateIds.length],
    ["verifiedCitations", verifiedIds.length],
    ["rejectedCitations", rejectedIds.length],
    ["pairs", pairs.length]
  ] as const) {
    assertWorksetLiteral(inventory.counts[key], expected, `机械清单 counts.${key}`);
  }
  worksetNonnegativeInteger(inventory.counts.distinctDocuments, "机械清单 distinctDocuments");
  const status = expectedInventoryStatus(candidateIds.length, verifiedIds.length, rejectedIds.length);
  for (const [key, expected] of [
    ["status", status],
    ["pairwiseComparisonRequired", verifiedIds.length > 1],
    ["humanReviewRequired", verifiedIds.length > 1 || candidateIds.length > 0 || rejectedIds.length > 0],
    ["candidateResolutionRequired", candidateIds.length > 0],
    ["rejectedCitationAcknowledgementRequired", rejectedIds.length > 0],
    ["automatedConflictDetectionPerformed", false],
    ["citationSetConflictReviewPerformed", false],
    ["citationSetConflictStatus", "unassessed"],
    ["semanticConflictResolutionPerformed", false],
    ["reviewerIdentityVerified", false],
    ["downstreamExternalUseGate", "blocked"]
  ] as const) {
    assertWorksetLiteral(inventory.reviewGate[key], expected, `机械清单 reviewGate.${key}`);
  }
  for (const key of INVENTORY_BOUNDARY_KEYS) {
    assertWorksetLiteral(
      inventory.boundary[key],
      key === "result" ? null : false,
      `机械清单 boundary.${key}`
    );
  }
  assertWorksetLiteral(inventory.integrity.hashAlgorithm, "SHA-256", "机械清单 integrity hashAlgorithm");
  assertWorksetDigest(inventory.integrity.payloadSha256, "机械清单 payload 摘要");
  assertWorksetLiteral(inventory.integrity.authenticityClaimed, false, "机械清单 authenticityClaimed");
}

const STORAGE_BOUNDARY_KEYS = Object.freeze([
  "atomicStorageSnapshotVerified",
  "nestedPacketAtomicStorageSnapshotVerified",
  "mutationEpochRevalidationPerformed",
  "nestedPacketMutationEpochRevalidationPerformed",
  "externalProviderUseAuthorized",
  "externalPurposeRightsReviewed",
  "privacyReviewPerformed",
  "sourceTextInstructionAuthority",
  "promptInjectionScreeningPerformed",
  "citationSetConflictReviewPerformed",
  "citationSetConflictStatus",
  "networkTransmissionPerformed",
  "networkTransmissionAuthorized",
  "publicExportAuthorized",
  "expertTruthClaimed",
  "scientificValidityClaimed",
  "formalActivationAllowed",
  "authenticityClaimed",
  "snapshotCallStorageMutationPerformed",
  "snapshotCallSchemaOrReleaseIdentityMutationPerformed"
] as const);

function validateStorageSnapshotNestedStructure(
  storageSnapshot: LocalKnowledgeSourceAwareRetrievalStorageSnapshot
): void {
  assertWorksetExactRecord(storageSnapshot.target, ["evidenceSubjectId", "targetKey", "registryVersion"], "来源存储 target");
  assertWorksetExactRecord(storageSnapshot.database, ["targetSchemaVersion"], "来源存储 database");
  assertWorksetExactRecord(storageSnapshot.bindings, [
    "matchingCitationIds",
    "candidateCitationIds",
    "verifiedCitationIds",
    "rejectedCitationIds",
    "documentIds",
    "sourceRightsDocumentIds",
    "packetProjectionVersion",
    "packetPayloadSha256",
    "matchingSourceSetSha256"
  ], "来源存储 bindings");
  assertWorksetExactRecord(storageSnapshot.boundary, STORAGE_BOUNDARY_KEYS, "来源存储 boundary");
  worksetString(storageSnapshot.target.evidenceSubjectId, "来源存储主题 ID");
  worksetString(storageSnapshot.target.targetKey, "来源存储 targetKey");
  worksetString(storageSnapshot.target.registryVersion, "来源存储注册表版本");
  worksetPositiveInteger(storageSnapshot.database.targetSchemaVersion, "来源存储 targetSchemaVersion");
  for (const [values, subject] of [
    [storageSnapshot.bindings.matchingCitationIds, "来源存储 matching 引用账"],
    [storageSnapshot.bindings.candidateCitationIds, "来源存储 candidate 引用账"],
    [storageSnapshot.bindings.verifiedCitationIds, "来源存储 verified 引用账"],
    [storageSnapshot.bindings.rejectedCitationIds, "来源存储 rejected 引用账"],
    [storageSnapshot.bindings.documentIds, "来源存储 documentIds"],
    [storageSnapshot.bindings.sourceRightsDocumentIds, "来源存储 rights documentIds"]
  ] as const) {
    worksetStringArray(values, subject);
  }
  worksetString(storageSnapshot.bindings.packetProjectionVersion, "来源存储 packet 版本");
  assertWorksetDigest(storageSnapshot.bindings.packetPayloadSha256, "来源存储 packet 摘要");
  assertWorksetDigest(storageSnapshot.bindings.matchingSourceSetSha256, "来源存储 source-set 摘要");
  for (const key of STORAGE_BOUNDARY_KEYS) {
    const expected = key === "atomicStorageSnapshotVerified"
      ? true
      : key === "citationSetConflictStatus"
        ? "unassessed"
        : false;
    assertWorksetLiteral(storageSnapshot.boundary[key], expected, `来源存储 boundary.${key}`);
  }
  assertWorksetDigest(storageSnapshot.snapshotSha256, "来源存储 snapshot 摘要");
}

const WORKSET_BOUNDARY_KEYS = Object.freeze([
  "sourceInputsCapturedInOneReadonlyTransaction",
  "packetDerivedOnlyFromCapturedSourceInputs",
  "inventoryDerivedOnlyFromCapturedSourceInputs",
  "nestedPacketAtomicStorageSnapshotVerified",
  "nestedInventoryAtomicStorageSnapshotVerified",
  "mutationEpochRevalidationPerformed",
  "nestedPacketMutationEpochRevalidationPerformed",
  "nestedInventoryMutationEpochRevalidationPerformed",
  "worksetSnapshotRawSourceRecordsCopied",
  "bindingSidecarContainsSourceText",
  "returnedPacketMayContainLocalSourceText",
  "sourceTextInstructionAuthority",
  "promptInjectionScreeningPerformed",
  "mechanicalPairInventoryBuilt",
  "citationSetConflictReviewPerformed",
  "citationSetConflictStatus",
  "chartApplicabilityAssessed",
  "externalProviderUseAuthorized",
  "externalPurposeRightsReviewed",
  "privacyReviewPerformed",
  "networkTransmissionPerformed",
  "networkTransmissionAuthorized",
  "publicExportAuthorized",
  "expertTruthClaimed",
  "scientificValidityClaimed",
  "formalActivationAllowed",
  "authenticityClaimed",
  "snapshotCallStorageMutationPerformed",
  "snapshotCallSchemaOrReleaseIdentityMutationPerformed"
] as const);

function validateWorksetSnapshotNestedStructure(
  worksetSnapshot: LocalKnowledgeCitationReviewWorksetStorageSnapshot
): void {
  assertWorksetExactRecord(worksetSnapshot.target, ["evidenceSubjectId", "targetKey", "registryVersion"], "工作集 target");
  assertWorksetExactRecord(worksetSnapshot.database, [
    "targetSchemaVersion",
    "matchesRequiredTargetSchema",
    "dbGenerationVerified",
    "migrationIdentityVerified"
  ], "工作集 database");
  assertWorksetExactRecord(worksetSnapshot.storageBinding, ["snapshotVersion", "snapshotSha256"], "工作集 storageBinding");
  assertWorksetExactRecord(
    worksetSnapshot.packetBinding,
    ["projectionVersion", "payloadSha256", "matchingSourceSetSha256"],
    "工作集 packetBinding"
  );
  assertWorksetExactRecord(
    worksetSnapshot.inventoryBinding,
    ["projectionVersion", "payloadSha256", "pairCount"],
    "工作集 inventoryBinding"
  );
  assertWorksetExactRecord(worksetSnapshot.citationLedger, [
    "matchingCitationIds",
    "candidateCitationIds",
    "verifiedCitationIds",
    "rejectedCitationIds"
  ], "工作集 citationLedger");
  assertWorksetExactRecord(worksetSnapshot.reviewGate, [
    "status",
    "pairwiseComparisonRequired",
    "humanReviewRequired",
    "candidateResolutionRequired",
    "rejectedCitationAcknowledgementRequired",
    "downstreamExternalUseGate"
  ], "工作集 reviewGate");
  assertWorksetExactRecord(worksetSnapshot.boundary, WORKSET_BOUNDARY_KEYS, "工作集 boundary");
  worksetString(worksetSnapshot.target.evidenceSubjectId, "工作集主题 ID");
  worksetString(worksetSnapshot.target.targetKey, "工作集 targetKey");
  worksetString(worksetSnapshot.target.registryVersion, "工作集注册表版本");
  assertWorksetLiteral(worksetSnapshot.database.targetSchemaVersion, 13, "工作集 targetSchemaVersion");
  assertWorksetLiteral(worksetSnapshot.database.matchesRequiredTargetSchema, true, "工作集 targetSchema 匹配标记");
  assertWorksetLiteral(worksetSnapshot.database.dbGenerationVerified, false, "工作集 dbGenerationVerified");
  assertWorksetLiteral(worksetSnapshot.database.migrationIdentityVerified, false, "工作集 migrationIdentityVerified");
  worksetString(worksetSnapshot.storageBinding.snapshotVersion, "工作集 storage snapshot 版本");
  assertWorksetDigest(worksetSnapshot.storageBinding.snapshotSha256, "工作集 storage snapshot 摘要");
  worksetString(worksetSnapshot.packetBinding.projectionVersion, "工作集 packet 版本");
  assertWorksetDigest(worksetSnapshot.packetBinding.payloadSha256, "工作集 packet 摘要");
  assertWorksetDigest(worksetSnapshot.packetBinding.matchingSourceSetSha256, "工作集 source-set 摘要");
  worksetString(worksetSnapshot.inventoryBinding.projectionVersion, "工作集 inventory 版本");
  assertWorksetDigest(worksetSnapshot.inventoryBinding.payloadSha256, "工作集 inventory 摘要");
  worksetNonnegativeInteger(worksetSnapshot.inventoryBinding.pairCount, "工作集 pairCount");
  for (const [values, subject] of [
    [worksetSnapshot.citationLedger.matchingCitationIds, "工作集 matching 引用账"],
    [worksetSnapshot.citationLedger.candidateCitationIds, "工作集 candidate 引用账"],
    [worksetSnapshot.citationLedger.verifiedCitationIds, "工作集 verified 引用账"],
    [worksetSnapshot.citationLedger.rejectedCitationIds, "工作集 rejected 引用账"]
  ] as const) {
    worksetStringArray(values, subject);
  }
  assertWorksetOneOf(worksetSnapshot.reviewGate.status, [
    "blocked_no_verified_citations",
    "blocked_unreviewed_target_sources",
    "no_pairwise_review_required",
    "pending_human_review"
  ], "工作集 reviewGate status");
  for (const key of [
    "pairwiseComparisonRequired",
    "humanReviewRequired",
    "candidateResolutionRequired",
    "rejectedCitationAcknowledgementRequired"
  ] as const) {
    assertWorksetOneOf(worksetSnapshot.reviewGate[key], [true, false], `工作集 reviewGate.${key}`);
  }
  assertWorksetLiteral(worksetSnapshot.reviewGate.downstreamExternalUseGate, "blocked", "工作集下游门禁");
  for (const key of WORKSET_BOUNDARY_KEYS) {
    const expected = key === "sourceInputsCapturedInOneReadonlyTransaction"
      || key === "packetDerivedOnlyFromCapturedSourceInputs"
      || key === "inventoryDerivedOnlyFromCapturedSourceInputs"
      || key === "returnedPacketMayContainLocalSourceText"
      || key === "mechanicalPairInventoryBuilt"
      ? true
      : key === "citationSetConflictStatus"
        ? "unassessed"
        : false;
    assertWorksetLiteral(worksetSnapshot.boundary[key], expected, `工作集 boundary.${key}`);
  }
  assertWorksetDigest(worksetSnapshot.snapshotSha256, "工作集 snapshot 摘要");
}

async function validateWorkset(
  workset: LocalKnowledgeCitationReviewWorksetSnapshot
): Promise<LocalKnowledgeCitationReviewWorksetSnapshot> {
  const { packet, inventory, storageSnapshot, worksetSnapshot } = workset;
  assertWorksetExactRecord(packet, [
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
  ], "来源检索包");
  assertWorksetExactRecord(inventory, [
    "profile",
    "binding",
    "counts",
    "verifiedItems",
    "pairs",
    "reviewGate",
    "boundary",
    "integrity"
  ], "机械引用对清单");
  assertWorksetExactRecord(storageSnapshot, [
    "profile",
    "target",
    "database",
    "bindings",
    "boundary",
    "snapshotSha256"
  ], "来源存储 sidecar");
  assertWorksetExactRecord(worksetSnapshot, [
    "profile",
    "target",
    "database",
    "storageBinding",
    "packetBinding",
    "inventoryBinding",
    "citationLedger",
    "reviewGate",
    "boundary",
    "snapshotSha256"
  ], "复核工作集 sidecar");
  await validatePacketNestedStructure(packet);
  validateInventoryNestedStructure(inventory);
  validateStorageSnapshotNestedStructure(storageSnapshot);
  validateWorksetSnapshotNestedStructure(worksetSnapshot);

  if (
    !sameCanonical(packet.profile, KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_PROFILE)
    || !sameCanonical(inventory.profile, KNOWLEDGE_CITATION_SET_CONFLICT_INVENTORY_PROFILE)
    || !sameCanonical(storageSnapshot.profile, LOCAL_KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_SNAPSHOT_PROFILE)
    || !sameCanonical(worksetSnapshot.profile, LOCAL_KNOWLEDGE_CITATION_REVIEW_WORKSET_SNAPSHOT_PROFILE)
  ) {
    throw new BaziCitationReviewContextSnapshotError(
      "WORKSET_MISMATCH",
      "来源复核工作集的四层 profile 不匹配当前合同。"
    );
  }

  assertCanonicalDigest(packet.integrity.payloadSha256, "检索包摘要");
  assertCanonicalDigest(inventory.integrity.payloadSha256, "机械清单摘要");
  assertCanonicalDigest(storageSnapshot.snapshotSha256, "来源存储摘要");
  assertCanonicalDigest(worksetSnapshot.snapshotSha256, "工作集摘要");
  const [packetDigest, inventoryDigest, storageDigest, worksetDigest] = await Promise.all([
    sha256Hex(withoutKey(packet, "integrity")),
    sha256Hex({
      domain: KNOWLEDGE_CITATION_SET_CONFLICT_INVENTORY_PROFILE.digestDomain,
      payload: withoutKey(inventory, "integrity")
    }),
    sha256Hex({
      domain: LOCAL_KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_SNAPSHOT_PROFILE.digestDomain,
      payload: withoutKey(storageSnapshot, "snapshotSha256")
    }),
    sha256Hex({
      domain: LOCAL_KNOWLEDGE_CITATION_REVIEW_WORKSET_SNAPSHOT_PROFILE.digestDomain,
      payload: withoutKey(worksetSnapshot, "snapshotSha256")
    })
  ]);
  if (
    packetDigest !== packet.integrity.payloadSha256
    || inventoryDigest !== inventory.integrity.payloadSha256
    || storageDigest !== storageSnapshot.snapshotSha256
    || worksetDigest !== worksetSnapshot.snapshotSha256
  ) {
    throw new BaziCitationReviewContextSnapshotError(
      "WORKSET_MISMATCH",
      "来源复核工作集至少一层摘要无法规范复算。"
    );
  }

  const subjectId = packet.request.evidenceSubject.subjectId;
  const registryVersion = packet.request.evidenceSubject.registryVersion;
  const targetKey = packet.request.targetKey;
  const candidateIds = [...packet.candidateCitationIds];
  const verifiedIds = [...packet.verifiedCitationIds];
  const rejectedIds = [...packet.rejectedCitationIds];
  for (const [values, label] of [
    [candidateIds, "candidate 引用账"],
    [verifiedIds, "verified 引用账"],
    [rejectedIds, "rejected 引用账"]
  ] as const) {
    assertSortedUniqueStrings(values, label);
  }
  const matchingIds = [...candidateIds, ...verifiedIds, ...rejectedIds].sort();
  if (new Set(matchingIds).size !== matchingIds.length) {
    throw new BaziCitationReviewContextSnapshotError(
      "WORKSET_MISMATCH",
      "来源复核工作集的三类引用账不能相互重叠。"
    );
  }

  if (
    packet.request.useMode !== "local_review"
    || packet.blockedVerifiedCitations.length !== 0
    || packet.integrity.authenticityClaimed !== false
    || packet.boundary.atomicStorageSnapshotVerified !== false
    || packet.boundary.mutationEpochRevalidationPerformed !== false
    || packet.boundary.semanticConflictResolutionPerformed !== false
    || packet.boundary.citationSetConflictReviewPerformed !== false
    || packet.boundary.citationSetConflictStatus !== "unassessed"
    || packet.boundary.citationReviewEstablishesSemanticTruth !== false
    || packet.boundary.rightsReviewEstablishesSemanticTruth !== false
    || packet.boundary.redistributionRightsGate !== "local_only_not_applicable"
    || packet.boundary.rawKnowledgeDocumentsCopied !== false
    || packet.boundary.sourceTextInstructionAuthority !== false
    || packet.boundary.promptInjectionScreeningPerformed !== false
    || packet.boundary.privacyReviewPerformed !== false
    || packet.boundary.externalPurposeRightsReviewed !== false
    || packet.boundary.externalProviderUseAuthorized !== false
    || packet.boundary.downstreamExternalUseGate !== "blocked"
    || packet.boundary.networkTransmissionPerformed !== false
    || packet.boundary.networkTransmissionAuthorized !== false
    || packet.boundary.publicExportAuthorized !== false
    || packet.boundary.expertTruthClaimed !== false
    || packet.boundary.scientificValidityClaimed !== false
    || packet.boundary.formalActivationAllowed !== false
    || packet.boundary.chartOrStorageMutationPerformed !== false
    || packet.boundary.result !== null
    || inventory.integrity.authenticityClaimed !== false
    || inventory.boundary.atomicStorageSnapshotVerified !== false
    || inventory.boundary.mutationEpochRevalidationPerformed !== false
    || inventory.boundary.rawSourceRecordsCopied !== false
    || inventory.boundary.containsSourceText !== false
    || inventory.boundary.sourceTextInstructionAuthority !== false
    || inventory.boundary.promptInjectionScreeningPerformed !== false
    || inventory.boundary.privacyReviewPerformed !== false
    || inventory.boundary.externalPurposeRightsReviewed !== false
    || inventory.boundary.externalProviderUseAuthorized !== false
    || inventory.boundary.networkTransmissionPerformed !== false
    || inventory.boundary.networkTransmissionAuthorized !== false
    || inventory.boundary.publicExportAuthorized !== false
    || inventory.boundary.expertTruthClaimed !== false
    || inventory.boundary.scientificValidityClaimed !== false
    || inventory.boundary.formalActivationAllowed !== false
    || inventory.boundary.chartOrStorageMutationPerformed !== false
    || inventory.boundary.result !== null
    || storageSnapshot.boundary.atomicStorageSnapshotVerified !== true
    || storageSnapshot.boundary.nestedPacketAtomicStorageSnapshotVerified !== false
    || storageSnapshot.boundary.mutationEpochRevalidationPerformed !== false
    || storageSnapshot.boundary.snapshotCallStorageMutationPerformed !== false
    || storageSnapshot.boundary.snapshotCallSchemaOrReleaseIdentityMutationPerformed !== false
    || worksetSnapshot.boundary.sourceInputsCapturedInOneReadonlyTransaction !== true
    || worksetSnapshot.boundary.packetDerivedOnlyFromCapturedSourceInputs !== true
    || worksetSnapshot.boundary.inventoryDerivedOnlyFromCapturedSourceInputs !== true
    || worksetSnapshot.boundary.nestedPacketAtomicStorageSnapshotVerified !== false
    || worksetSnapshot.boundary.nestedInventoryAtomicStorageSnapshotVerified !== false
    || worksetSnapshot.boundary.mutationEpochRevalidationPerformed !== false
    || worksetSnapshot.boundary.bindingSidecarContainsSourceText !== false
    || worksetSnapshot.boundary.returnedPacketMayContainLocalSourceText !== true
    || worksetSnapshot.boundary.sourceTextInstructionAuthority !== false
    || worksetSnapshot.boundary.promptInjectionScreeningPerformed !== false
    || worksetSnapshot.boundary.mechanicalPairInventoryBuilt !== true
    || worksetSnapshot.boundary.citationSetConflictReviewPerformed !== false
    || worksetSnapshot.boundary.citationSetConflictStatus !== "unassessed"
    || worksetSnapshot.boundary.chartApplicabilityAssessed !== false
    || worksetSnapshot.boundary.externalProviderUseAuthorized !== false
    || worksetSnapshot.boundary.networkTransmissionPerformed !== false
    || worksetSnapshot.boundary.networkTransmissionAuthorized !== false
    || worksetSnapshot.boundary.publicExportAuthorized !== false
    || worksetSnapshot.boundary.expertTruthClaimed !== false
    || worksetSnapshot.boundary.scientificValidityClaimed !== false
    || worksetSnapshot.boundary.formalActivationAllowed !== false
    || worksetSnapshot.boundary.snapshotCallStorageMutationPerformed !== false
    || worksetSnapshot.boundary.snapshotCallSchemaOrReleaseIdentityMutationPerformed !== false
  ) {
    throw new BaziCitationReviewContextSnapshotError(
      "WORKSET_MISMATCH",
      "来源复核工作集没有保持本机只读、未裁定和外部失败关闭边界。"
    );
  }

  if (
    subjectId !== inventory.binding.evidenceSubjectId
    || subjectId !== storageSnapshot.target.evidenceSubjectId
    || subjectId !== worksetSnapshot.target.evidenceSubjectId
    || registryVersion !== inventory.binding.registryVersion
    || registryVersion !== storageSnapshot.target.registryVersion
    || registryVersion !== worksetSnapshot.target.registryVersion
    || targetKey !== inventory.binding.targetKey
    || targetKey !== storageSnapshot.target.targetKey
    || targetKey !== worksetSnapshot.target.targetKey
    || storageSnapshot.database.targetSchemaVersion !== 13
    || worksetSnapshot.database.targetSchemaVersion !== 13
    || worksetSnapshot.database.matchesRequiredTargetSchema !== true
    || worksetSnapshot.database.dbGenerationVerified !== false
    || worksetSnapshot.database.migrationIdentityVerified !== false
  ) {
    throw new BaziCitationReviewContextSnapshotError(
      "WORKSET_MISMATCH",
      "来源复核工作集的主题、target 或 Schema 绑定不一致。"
    );
  }

  if (
    packet.integrity.payloadSha256 !== inventory.binding.retrievalPayloadSha256
    || packet.integrity.payloadSha256 !== storageSnapshot.bindings.packetPayloadSha256
    || packet.integrity.payloadSha256 !== worksetSnapshot.packetBinding.payloadSha256
    || packet.profile.projectionVersion !== inventory.binding.retrievalProjectionVersion
    || packet.profile.projectionVersion !== storageSnapshot.bindings.packetProjectionVersion
    || packet.profile.projectionVersion !== worksetSnapshot.packetBinding.projectionVersion
    || packet.sourceSet.matchingSourceSetSha256 !== inventory.binding.matchingSourceSetSha256
    || packet.sourceSet.matchingSourceSetSha256 !== storageSnapshot.bindings.matchingSourceSetSha256
    || packet.sourceSet.matchingSourceSetSha256 !== worksetSnapshot.packetBinding.matchingSourceSetSha256
    || inventory.integrity.payloadSha256 !== worksetSnapshot.inventoryBinding.payloadSha256
    || inventory.profile.projectionVersion !== worksetSnapshot.inventoryBinding.projectionVersion
    || inventory.counts.pairs !== worksetSnapshot.inventoryBinding.pairCount
    || storageSnapshot.snapshotSha256 !== worksetSnapshot.storageBinding.snapshotSha256
    || storageSnapshot.profile.snapshotVersion !== worksetSnapshot.storageBinding.snapshotVersion
    || !sameOrderedStrings(candidateIds, inventory.binding.candidateCitationIds)
    || !sameOrderedStrings(candidateIds, storageSnapshot.bindings.candidateCitationIds)
    || !sameOrderedStrings(candidateIds, worksetSnapshot.citationLedger.candidateCitationIds)
    || !sameOrderedStrings(verifiedIds, inventory.binding.verifiedCitationIds)
    || !sameOrderedStrings(verifiedIds, storageSnapshot.bindings.verifiedCitationIds)
    || !sameOrderedStrings(verifiedIds, worksetSnapshot.citationLedger.verifiedCitationIds)
    || !sameOrderedStrings(rejectedIds, inventory.binding.rejectedCitationIds)
    || !sameOrderedStrings(rejectedIds, storageSnapshot.bindings.rejectedCitationIds)
    || !sameOrderedStrings(rejectedIds, worksetSnapshot.citationLedger.rejectedCitationIds)
    || !sameOrderedStrings(matchingIds, storageSnapshot.bindings.matchingCitationIds)
    || !sameOrderedStrings(matchingIds, worksetSnapshot.citationLedger.matchingCitationIds)
    || inventory.reviewGate.status !== worksetSnapshot.reviewGate.status
    || inventory.reviewGate.pairwiseComparisonRequired !== worksetSnapshot.reviewGate.pairwiseComparisonRequired
    || inventory.reviewGate.humanReviewRequired !== worksetSnapshot.reviewGate.humanReviewRequired
    || inventory.reviewGate.candidateResolutionRequired !== worksetSnapshot.reviewGate.candidateResolutionRequired
    || inventory.reviewGate.rejectedCitationAcknowledgementRequired
      !== worksetSnapshot.reviewGate.rejectedCitationAcknowledgementRequired
  ) {
    throw new BaziCitationReviewContextSnapshotError(
      "WORKSET_MISMATCH",
      "来源复核工作集的摘要或引用账没有形成四层等式闭包。"
    );
  }

  const distinctVerifiedDocuments = new Set(packet.items.map((item) => item.document.documentId)).size;
  if (
    packet.counts.matching !== matchingIds.length
    || packet.counts.candidate !== candidateIds.length
    || packet.counts.verified !== verifiedIds.length
    || packet.counts.rejected !== rejectedIds.length
    || packet.counts.emitted !== packet.items.length
    || packet.counts.blockedVerified !== packet.blockedVerifiedCitations.length
    || packet.items.length !== verifiedIds.length
    || packet.sourceMultiplicity !== (verifiedIds.length === 0
      ? "none"
      : verifiedIds.length === 1
        ? "single"
        : "multiple_preserved_without_resolution")
    || packet.sourceSet.allMatchingCitationStatusesBound !== true
    || packet.sourceSet.rawSourceRecordsCopied !== false
    || inventory.counts.candidateCitations !== candidateIds.length
    || inventory.counts.verifiedCitations !== verifiedIds.length
    || inventory.counts.rejectedCitations !== rejectedIds.length
    || inventory.counts.distinctDocuments !== distinctVerifiedDocuments
    || inventory.counts.pairs !== inventory.pairs.length
  ) {
    throw new BaziCitationReviewContextSnapshotError(
      "WORKSET_MISMATCH",
      "来源复核工作集的计数、来源多重性或完整账标记不一致。"
    );
  }

  if (
    candidateIds.length !== 0
    || rejectedIds.length !== 0
    || verifiedIds.length < 2
    || inventory.reviewGate.status !== "pending_human_review"
    || worksetSnapshot.reviewGate.status !== "pending_human_review"
    || inventory.reviewGate.pairwiseComparisonRequired !== true
    || worksetSnapshot.reviewGate.pairwiseComparisonRequired !== true
    || inventory.reviewGate.humanReviewRequired !== true
    || worksetSnapshot.reviewGate.humanReviewRequired !== true
    || inventory.reviewGate.candidateResolutionRequired !== false
    || worksetSnapshot.reviewGate.candidateResolutionRequired !== false
    || inventory.reviewGate.rejectedCitationAcknowledgementRequired !== false
    || worksetSnapshot.reviewGate.rejectedCitationAcknowledgementRequired !== false
    || inventory.reviewGate.citationSetConflictReviewPerformed !== false
    || inventory.reviewGate.citationSetConflictStatus !== "unassessed"
    || inventory.reviewGate.downstreamExternalUseGate !== "blocked"
    || worksetSnapshot.reviewGate.downstreamExternalUseGate !== "blocked"
  ) {
    throw new BaziCitationReviewContextSnapshotError(
      "REVIEW_GATE_BLOCKED",
      "v0.1 命盘复核上下文只接受至少两条 verified、无 candidate/rejected 的待人工逐对观察工作集。"
    );
  }

  const expectedMatchingSourceSetSha256 = await sha256Hex(packet.items.map((item) => ({
    citationId: item.citationId,
    citationStatus: "verified" as const,
    citationSnapshotDigest: item.citationSnapshotDigest,
    documentId: item.document.documentId,
    documentContentHash: item.document.documentContentHash,
    documentSnapshotDigest: item.document.documentSnapshotDigest,
    sourceRightsSnapshotDigest: item.sourceRights.snapshotDigest
  })));
  const expectedDocumentIds = [...new Set(packet.items.map((item) => item.document.documentId))].sort();
  assertSortedUniqueStrings(storageSnapshot.bindings.documentIds, "来源存储 documentIds");
  assertSortedUniqueStrings(storageSnapshot.bindings.sourceRightsDocumentIds, "来源存储 rights documentIds");
  if (
    packet.sourceSet.matchingSourceSetSha256 !== expectedMatchingSourceSetSha256
    || !sameOrderedStrings(storageSnapshot.bindings.documentIds, expectedDocumentIds)
    || !sameOrderedStrings(storageSnapshot.bindings.sourceRightsDocumentIds, expectedDocumentIds)
  ) {
    throw new BaziCitationReviewContextSnapshotError(
      "WORKSET_MISMATCH",
      "verified-only 工作集的来源集合摘要或资料与权利一一对应账无法由 packet items 复算。"
    );
  }

  validateCompletePairInventory(packet, inventory);
  return workset;
}

function locatorRelation(
  left: KnowledgeSourceAwareRetrievalItem,
  right: KnowledgeSourceAwareRetrievalItem
): KnowledgeCitationSetConflictInventory["pairs"][number]["locatorRelation"] {
  if (left.document.documentId !== right.document.documentId) return "different_documents";
  if (left.locator.sectionId !== right.locator.sectionId) return "different_sections";
  if (left.locator.startLine === right.locator.startLine && left.locator.endLine === right.locator.endLine) {
    return "same_range";
  }
  return Math.max(left.locator.startLine, right.locator.startLine)
    <= Math.min(left.locator.endLine, right.locator.endLine)
    ? "overlapping_ranges"
    : "disjoint_ranges";
}

function validateCompletePairInventory(
  packet: KnowledgeSourceAwareRetrievalPacket,
  inventory: KnowledgeCitationSetConflictInventory
): void {
  const itemsByCitationId = new Map(packet.items.map((item) => [item.citationId, item]));
  const orderedItems = packet.verifiedCitationIds.map((citationId) => itemsByCitationId.get(citationId));
  if (
    itemsByCitationId.size !== packet.items.length
    || orderedItems.some((item) => !item)
    || inventory.verifiedItems.length !== orderedItems.length
  ) {
    throw new BaziCitationReviewContextSnapshotError(
      "WORKSET_MISMATCH",
      "检索包与机械清单的 verified item 集合不一致。"
    );
  }
  for (let index = 0; index < orderedItems.length; index += 1) {
    const item = orderedItems[index]!;
    const inventoryItem = inventory.verifiedItems[index]!;
    if (
      inventoryItem.order !== index + 1
      || inventoryItem.citationId !== item.citationId
      || inventoryItem.itemDigest !== item.itemDigest
      || inventoryItem.citationSnapshotDigest !== item.citationSnapshotDigest
      || inventoryItem.documentId !== item.document.documentId
      || inventoryItem.documentContentHash !== item.document.documentContentHash
      || inventoryItem.documentSnapshotDigest !== item.document.documentSnapshotDigest
      || inventoryItem.sourceRightsSnapshotDigest !== item.sourceRights.snapshotDigest
    ) {
      throw new BaziCitationReviewContextSnapshotError(
        "WORKSET_MISMATCH",
        "机械清单的 verified item 没有逐项绑定检索包。"
      );
    }
  }
  const expectedPairCount = orderedItems.length * (orderedItems.length - 1) / 2;
  if (inventory.pairs.length !== expectedPairCount || inventory.counts.pairs !== expectedPairCount) {
    throw new BaziCitationReviewContextSnapshotError(
      "WORKSET_MISMATCH",
      "机械清单没有完整覆盖所有 i<j 引用对。"
    );
  }
  let pairIndex = 0;
  for (let leftIndex = 0; leftIndex < orderedItems.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < orderedItems.length; rightIndex += 1) {
      const left = orderedItems[leftIndex]!;
      const right = orderedItems[rightIndex]!;
      const pair = inventory.pairs[pairIndex]!;
      if (
        pair.order !== pairIndex + 1
        || !sameOrderedStrings(pair.citationIds, [left.citationId, right.citationId])
        || !sameOrderedStrings(pair.itemDigests, [left.itemDigest, right.itemDigest])
        || pair.sameDocumentId !== (left.document.documentId === right.document.documentId)
        || pair.sameDocumentContentHash !== (left.document.documentContentHash === right.document.documentContentHash)
        || pair.sameSourceRightsSnapshot !== (left.sourceRights.snapshotDigest === right.sourceRights.snapshotDigest)
        || pair.locatorRelation !== locatorRelation(left, right)
        || pair.exactQuoteRelation !== (left.quote === right.quote ? "code_unit_exact_equal" : "code_unit_different")
        || pair.semanticRelationshipAssessed !== false
      ) {
        throw new BaziCitationReviewContextSnapshotError(
          "WORKSET_MISMATCH",
          "机械清单的引用对顺序、摘要或机械关系不一致。"
        );
      }
      pairIndex += 1;
    }
  }
}

type PillarName = "year" | "month" | "day" | "hour";
type RegisteredPillarField =
  | "ganZhi"
  | "hiddenStems"
  | "stemTenGod"
  | "branchTenGods"
  | "wuXing"
  | "nayin"
  | "twelveGrowth"
  | "xun"
  | "voidBranches";

const REGISTERED_FIELD_PATH = /^pillars\.(year|month|day|hour)\.(ganZhi|hiddenStems|stemTenGod|branchTenGods|wuXing|nayin|twelveGrowth|xun|voidBranches)$/u;

function registeredFactValue(
  revision: RevisionRecord,
  fieldPath: string
): string | readonly string[] {
  const match = REGISTERED_FIELD_PATH.exec(fieldPath);
  if (!match) {
    throw new BaziCitationReviewContextSnapshotError(
      "FIELD_CONTEXT_MISMATCH",
      "v0.1 只允许证据主题注册表中的单一四柱事实路径。"
    );
  }
  const pillar = revision.facts.pillars[match[1] as PillarName];
  const field = match[2] as RegisteredPillarField;
  switch (field) {
    case "ganZhi": return pillar.ganZhi;
    case "hiddenStems": return Object.freeze([...pillar.hiddenStems]);
    case "stemTenGod": return pillar.stemTenGod;
    case "branchTenGods": return Object.freeze([...pillar.branchTenGods]);
    case "wuXing": return pillar.wuXing;
    case "nayin": return pillar.nayin;
    case "twelveGrowth": return pillar.twelveGrowth;
    case "xun": return pillar.xun;
    case "voidBranches": return pillar.voidBranches;
  }
}

function registeredRuleProjection(
  revision: RevisionRecord,
  ruleProfilePaths: readonly string[]
): readonly BaziCitationReviewContextRuleProjectionItem[] {
  return Object.freeze(ruleProfilePaths.map((ruleProfilePath) => {
    if (ruleProfilePath !== "calendar.dayBoundary") {
      throw new BaziCitationReviewContextSnapshotError(
        "RULE_CONTEXT_MISMATCH",
        "v0.1 不支持证据主题注册表之外的规则路径。"
      );
    }
    return Object.freeze({
      ruleProfilePath,
      value: revision.ruleProfile.calendar.dayBoundary
    });
  }));
}

function sanitizeRulePackBinding(binding: RulePackBinding | undefined): RulePackBinding | null {
  return binding ? deepFreeze({ ...binding }) : null;
}

function requireReleaseIdentity(identity: BaziReviewReleaseIdentity): void {
  if (
    identity.dbGeneration !== "legacy-v13"
    || identity.targetSchema !== 13
    || identity.migrationId !== null
  ) {
    throw new BaziCitationReviewContextSnapshotError(
      "RELEASE_IDENTITY_MISMATCH",
      "八字引用复核上下文只允许 legacy-v13 / targetSchema 13 / migrationId null。"
    );
  }
}

/**
 * Builds a deterministic, read-only display context for one registered pillar
 * fact. It snapshots every caller-owned value before the first await, verifies
 * all four workset digests and requires an exact matching natal replay. The
 * output deliberately excludes Case prose, birth input, source text and the
 * replayed chart body.
 */
async function buildBaziCitationReviewContextSnapshotInternal(
  rawInput: unknown
): Promise<BaziCitationReviewContextSnapshot> {
  const input = snapshotInput(rawInput);
  requireReleaseIdentity(input.releaseIdentity);
  if (
    !UUID.test(input.selection.caseId)
    || !UUID.test(input.selection.revisionId)
    || input.selection.evidenceSubjectId.length > 200
    || input.selection.fieldPath.length > 200
  ) {
    throw new BaziCitationReviewContextSnapshotError(
      "INVALID_INPUT",
      "复核选择的 Case、Revision、主题或字段路径格式无效。"
    );
  }

  let caseRecord: CaseRecord;
  try {
    caseRecord = caseRecordSchema.parse(input.caseRecord);
  } catch (cause) {
    throw new BaziCitationReviewContextSnapshotError(
      "CASE_REVISION_MISMATCH",
      "Case 记录未通过当前严格合同。",
      { cause }
    );
  }
  let revision: RevisionRecord;
  let verifiedRevisionSnapshotDigest: string;
  try {
    const verified = await verifyRevisionSnapshotIntegrity(input.revision);
    if (!sameCanonical(input.revision, verified.revision)) {
      throw new Error("supplied_revision_contains_unbound_or_future_fields");
    }
    revision = verified.revision;
    verifiedRevisionSnapshotDigest = verified.revisionSnapshotDigest;
  } catch (cause) {
    throw new BaziCitationReviewContextSnapshotError(
      "REVISION_REPLAY_BLOCKED",
      "Revision 未通过精确快照合同，或包含会被解析器忽略的未绑定字段。",
      { cause }
    );
  }
  if (
    caseRecord.id !== input.selection.caseId
    || revision.caseId !== input.selection.caseId
    || revision.id !== input.selection.revisionId
    || caseRecord.deletedAt !== null
    || revision.revisionNumber > caseRecord.revisionCount
  ) {
    throw new BaziCitationReviewContextSnapshotError(
      "CASE_REVISION_MISMATCH",
      "Case、Revision 与显式选择不一致，或 Case 已删除。"
    );
  }
  if (
    revision.input.timePrecision !== "exact_minute"
    && revision.input.timePrecision !== "exact_second"
  ) {
    throw new BaziCitationReviewContextSnapshotError(
      "REVISION_REPLAY_BLOCKED",
      "v0.1 只允许精确分钟或精确秒 Revision；未知时辰 CandidateSet 不得暗选。"
    );
  }

  const workset = await validateWorkset(input.workset);
  let subject;
  try {
    subject = requireEvidenceSubject(input.selection.evidenceSubjectId);
  } catch (cause) {
    throw new BaziCitationReviewContextSnapshotError(
      "FIELD_CONTEXT_MISMATCH",
      "证据主题未在当前注册表中激活。",
      { cause }
    );
  }
  const packetSubject = workset.packet.request.evidenceSubject;
  if (
    subject.status !== "active"
    || (subject.category !== "calendar_fact" && subject.category !== "rule_derived")
    || subject.fieldPaths.length !== 1
    || subject.fieldPaths[0] !== input.selection.fieldPath
    || packetSubject.subjectId !== subject.subjectId
    || packetSubject.registryVersion !== subject.registryVersion
    || packetSubject.category !== subject.category
    || packetSubject.label !== subject.label
    || !sameOrderedStrings(packetSubject.fieldPaths, subject.fieldPaths)
    || !sameOrderedStrings(packetSubject.ruleProfilePaths, subject.ruleProfilePaths)
    || workset.worksetSnapshot.target.evidenceSubjectId !== subject.subjectId
    || workset.worksetSnapshot.target.targetKey !== `evidence_subject:${subject.subjectId}`
  ) {
    throw new BaziCitationReviewContextSnapshotError(
      "FIELD_CONTEXT_MISMATCH",
      "显式主题、字段路径、注册表与来源工作集不一致。"
    );
  }

  let replay;
  try {
    replay = await replayRevisionNatalChart(revision);
  } catch (cause) {
    throw new BaziCitationReviewContextSnapshotError(
      "REVISION_REPLAY_BLOCKED",
      "Revision 无法由精确注册执行器与固定 tzdb 完整复演。",
      { cause }
    );
  }
  if (
    replay.status !== "matched"
    || replay.changedFields.length !== 0
    || replay.sourceRevisionId !== revision.id
    || replay.sourceRevisionSnapshotDigest !== verifiedRevisionSnapshotDigest
    || replay.storedResultHash !== revision.manifest.resultHash
    || replay.replayedResultHash !== revision.manifest.resultHash
    || !sameCanonical(replay.engine, revision.manifest.engine)
    || replay.timeZoneDatabase.snapshotId !== revision.manifest.tzdbVersion
  ) {
    throw new BaziCitationReviewContextSnapshotError(
      "REVISION_REPLAY_BLOCKED",
      "Revision 的存储事实、结果摘要或精确复演结果不一致。"
    );
  }

  const matchingProvenance = revision.facts.fieldProvenance.filter(
    (item) => item.field === input.selection.fieldPath
  );
  if (
    matchingProvenance.length !== 1
    || matchingProvenance[0]!.kind !== subject.category
    || !subject.algorithmIds.includes(matchingProvenance[0]!.algorithmId)
  ) {
    throw new BaziCitationReviewContextSnapshotError(
      "FIELD_CONTEXT_MISMATCH",
      "Revision 对所选字段缺少唯一且注册算法一致的 provenance。"
    );
  }
  const provenance = matchingProvenance[0]!;
  const factProjectionItems = Object.freeze([
    Object.freeze({
      fieldPath: input.selection.fieldPath,
      value: registeredFactValue(revision, input.selection.fieldPath),
      provenance: Object.freeze({
        field: provenance.field,
        kind: provenance.kind,
        algorithmId: provenance.algorithmId,
        verificationStatus: provenance.verificationStatus
      })
    })
  ]);
  const ruleProjectionItems = registeredRuleProjection(revision, subject.ruleProfilePaths);
  const revisionRulePackBinding = sanitizeRulePackBinding(revision.rulePackBinding);
  const [factProjectionSha256, ruleProjectionSha256] = await Promise.all([
    sha256Hex({
      domain: BAZI_CITATION_REVIEW_CONTEXT_SNAPSHOT_PROFILE.factProjectionDigestDomain,
      payload: factProjectionItems
    }),
    sha256Hex({
      domain: BAZI_CITATION_REVIEW_CONTEXT_SNAPSHOT_PROFILE.ruleProjectionDigestDomain,
      payload: {
        profileId: revision.ruleProfile.profileId,
        profileVersion: revision.ruleProfile.profileVersion,
        profileStatus: revision.ruleProfile.status,
        ruleProfileDigest: revision.manifest.ruleProfileDigest,
        revisionRulePackBinding,
        liveActiveRulePackReadPerformed: false,
        items: ruleProjectionItems
      }
    })
  ]);

  const releaseBinding = Object.freeze({
    dbGeneration: "legacy-v13" as const,
    targetSchema: 13 as const,
    migrationId: null,
    callerProvidedExpectedValuesMatched: true as const,
    runtimeReleaseIdentityAttested: false as const,
    storageAttestedDbGeneration: false as const,
    storageAttestedMigrationIdentity: false as const,
    engineeringEvidenceOnly: true as const
  });
  const caseBinding = Object.freeze({
    caseId: caseRecord.id,
    deletedInSuppliedCaseSnapshot: false as const,
    selectedRevisionWasLatestInSuppliedCaseSnapshot: caseRecord.latestRevisionId === revision.id,
    repositoryFreshnessAttested: false as const
  });
  const revisionBinding = Object.freeze({
    revisionId: revision.id,
    revisionNumber: revision.revisionNumber,
    revisionSnapshotDigest: replay.sourceRevisionSnapshotDigest,
    storedResultHash: replay.storedResultHash,
    replayedResultHash: replay.replayedResultHash,
    replayProjectionDigest: replay.projectionDigest,
    replayExecutorId: replay.executorId,
    engine: deepFreeze({ ...replay.engine }),
    tzdbVersion: replay.timeZoneDatabase.snapshotId
  });
  const subjectBinding = Object.freeze({
    evidenceSubjectId: subject.subjectId,
    registryVersion: subject.registryVersion,
    category: subject.category,
    label: subject.label,
    fieldPath: input.selection.fieldPath,
    algorithmIds: Object.freeze([...subject.algorithmIds]),
    ruleProfilePaths: Object.freeze([...subject.ruleProfilePaths])
  });
  const factProjection = Object.freeze({
    items: factProjectionItems,
    projectionSha256: factProjectionSha256
  });
  const ruleProjection = Object.freeze({
    profileId: revision.ruleProfile.profileId,
    profileVersion: revision.ruleProfile.profileVersion,
    profileStatus: revision.ruleProfile.status,
    ruleProfileDigest: revision.manifest.ruleProfileDigest,
    revisionRulePackBinding,
    liveActiveRulePackReadPerformed: false as const,
    items: ruleProjectionItems,
    projectionSha256: ruleProjectionSha256
  });
  const worksetBinding = Object.freeze({
    worksetSnapshotVersion: workset.worksetSnapshot.profile.snapshotVersion,
    worksetSnapshotSha256: workset.worksetSnapshot.snapshotSha256,
    suppliedStorageSidecarSnapshotVersion: workset.storageSnapshot.profile.snapshotVersion,
    suppliedStorageSidecarSnapshotSha256: workset.storageSnapshot.snapshotSha256,
    packetProjectionVersion: workset.packet.profile.projectionVersion,
    packetPayloadSha256: workset.packet.integrity.payloadSha256,
    matchingSourceSetSha256: workset.packet.sourceSet.matchingSourceSetSha256,
    inventoryProjectionVersion: workset.inventory.profile.projectionVersion,
    inventoryPayloadSha256: workset.inventory.integrity.payloadSha256,
    citationIdsWithStoredVerifiedStatus: Object.freeze([...workset.inventory.binding.verifiedCitationIds]),
    pairCount: workset.inventory.counts.pairs,
    reviewGateStatus: "pending_human_review" as const
  });
  const displayContextBindingPayload = Object.freeze({
    releaseBinding,
    caseBinding,
    revisionBinding,
    subjectBinding,
    factProjection,
    ruleProjection,
    worksetBinding
  });
  const displayContextBinding = Object.freeze({
    projectionVersion: "0.1.0" as const,
    payloadSha256: await sha256Hex({
      domain: BAZI_CITATION_REVIEW_CONTEXT_SNAPSHOT_PROFILE.displayContextBindingDigestDomain,
      payload: displayContextBindingPayload
    })
  });
  const boundary = Object.freeze({
    exactRevisionReplayMatched: true as const,
    registeredFieldProjectionBound: true as const,
    revisionFrozenRuleProjectionBound: true as const,
    worksetFourLayerDigestsRecomputed: true as const,
    rawBirthInputCopied: false as const,
    caseAliasTagsNotesCopied: false as const,
    sourceTextCopiedIntoContextSnapshot: false as const,
    containsDerivedSensitiveChartData: true as const,
    crossRepositoryAtomicSnapshotVerified: false as const,
    caseRevisionAndKnowledgeAtomicCaptureVerified: false as const,
    suppliedWorksetStorageOriginAttested: false as const,
    suppliedCaseSnapshotFreshnessAttested: false as const,
    runtimeReleaseIdentityAttested: false as const,
    worksetFreshnessRevalidatedByBuilder: false as const,
    reviewMayBeginWithoutFreshnessRevalidation: false as const,
    mutationEpochRevalidationPerformed: false as const,
    liveActiveRulePackReadPerformed: false as const,
    interpretationEnvelopeUsed: false as const,
    chartApplicabilityAssessed: false as const,
    citationSemanticApplicabilityAssessed: false as const,
    citationSetConflictReviewPerformed: false as const,
    semanticConflictResolutionPerformed: false as const,
    humanReviewPerformed: false as const,
    reviewerIdentityVerified: false as const,
    humanReviewAuthenticityVerified: false as const,
    sourceAuthenticityClaimed: false as const,
    sourceTextInstructionAuthority: false as const,
    storageReadPerformed: false as const,
    externalProviderUseAuthorized: false as const,
    networkTransmissionPerformed: false as const,
    networkTransmissionAuthorized: false as const,
    storageMutationPerformed: false as const,
    chartMutationPerformed: false as const,
    caseOrRevisionMutationPerformed: false as const,
    publicExportAuthorized: false as const,
    expertTruthClaimed: false as const,
    scientificValidityClaimed: false as const,
    formalActivationAllowed: false as const,
    authenticityClaimed: false as const,
    result: null
  });
  const payload: BaziCitationReviewContextSnapshotPayload = Object.freeze({
    profile: BAZI_CITATION_REVIEW_CONTEXT_SNAPSHOT_PROFILE,
    releaseBinding,
    caseBinding,
    revisionBinding,
    subjectBinding,
    factProjection,
    ruleProjection,
    worksetBinding,
    displayContextBinding,
    boundary
  });
  const context: BaziCitationReviewContextSnapshot = Object.freeze({
    ...payload,
    integrity: Object.freeze({
      hashAlgorithm: "SHA-256" as const,
      payloadSha256: await sha256Hex({
        domain: BAZI_CITATION_REVIEW_CONTEXT_SNAPSHOT_PROFILE.digestDomain,
        payload
      }),
      authenticityClaimed: false as const
    })
  });
  return deepFreeze(context);
}

export async function buildBaziCitationReviewContextSnapshot(
  rawInput: unknown
): Promise<BaziCitationReviewContextSnapshot> {
  try {
    return await buildBaziCitationReviewContextSnapshotInternal(rawInput);
  } catch (cause) {
    if (cause instanceof BaziCitationReviewContextSnapshotError) throw cause;
    throw new BaziCitationReviewContextSnapshotError(
      "CONTEXT_BUILD_FAILED",
      "八字 Revision 字段来源复核上下文构建失败关闭。",
      { cause }
    );
  }
}

export async function validateBaziCitationReviewContextSnapshot(
  rawSnapshot: unknown,
  rawInput: unknown
): Promise<BaziCitationReviewContextSnapshot> {
  try {
    const snapshot = snapshotDeclarativeValue(
      rawSnapshot,
      "snapshot",
      0,
      { valueNodes: 0, textCharacters: 0, objectKeys: 0 },
      new WeakSet<object>()
    );
    const rebuilt = await buildBaziCitationReviewContextSnapshot(rawInput);
    if (!sameCanonical(snapshot, rebuilt)) {
      throw new BaziCitationReviewContextSnapshotError(
        "SNAPSHOT_MISMATCH",
        "八字引用复核上下文与当前 Release、Case、Revision 和来源工作集的规范重建不一致。"
      );
    }
    return rebuilt;
  } catch (cause) {
    if (cause instanceof BaziCitationReviewContextSnapshotError) throw cause;
    throw new BaziCitationReviewContextSnapshotError(
      "SNAPSHOT_MISMATCH",
      "八字引用复核上下文验证失败关闭。",
      { cause }
    );
  }
}

export * from "./citation-applicability-observation";
export * from "./citation-applicability-observation-comparison";
export * from "./citation-applicability-observation-pair-lifecycle";
