import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import {
  KNOWLEDGE_CITATION_SET_CONFLICT_INVENTORY_LIMITS,
  validateKnowledgeCitationSetConflictInventory,
  type KnowledgeCitationSetConflictInventory,
  type KnowledgeCitationSetConflictInventoryPair
} from "./citation-set-conflict-inventory";
import type { BuildKnowledgeSourceAwareRetrievalPacketInput } from "./source-aware-retrieval";

export const KNOWLEDGE_CITATION_SET_PAIR_REVIEW_ASSERTION_STATEMENT =
  "我声明已逐对查看所绑定机械清单中的全部引用对，并仅记录绑定引文范围内的观察；本记录不建立语义真值、专家真值或真实性。" as const;

export const KNOWLEDGE_CITATION_SET_PAIR_REVIEW_ASSERTION_PROFILE = Object.freeze({
  projectionVersion: "hakimi.knowledge.citation_set_pair_review_assertion/0.1.0",
  contentVersion: "0.1.0",
  pairAssertionDigestDomain:
    "hakimi.knowledge.citation_set_pair_review_assertion.pair_assertion/0.1.0",
  reviewerAssertionDigestDomain:
    "hakimi.knowledge.citation_set_pair_review_assertion.reviewer_assertion/0.1.0",
  recordDigestDomain: "hakimi.knowledge.citation_set_pair_review_assertion.record/0.1.0",
  scope: "one_self_declared_reviewer_complete_inventory_pair_observation_ledger" as const,
  assertionPolicy: "neutral_bound_quote_observations_without_winner_selection" as const,
  reviewerIdentityPolicy: "self_declared_not_verified" as const,
  digestPolicy: "domain_framed_sha256_not_signature_or_authenticity" as const,
  mutationPolicy: "read_only_assertion_record" as const,
  expertTruthClaimed: false as const,
  scientificValidityClaimed: false as const,
  formalActivationAllowed: false as const
});

export const KNOWLEDGE_CITATION_SET_PAIR_OBSERVATIONS = Object.freeze([
  "no_direct_tension_observed_in_bound_quotes",
  "potential_tension_observed_in_bound_quotes",
  "not_directly_comparable_in_bound_scope",
  "insufficient_bound_context"
] as const);

export type KnowledgeCitationSetPairObservation =
  (typeof KNOWLEDGE_CITATION_SET_PAIR_OBSERVATIONS)[number];

const MAX_PAIR_ASSERTIONS = KNOWLEDGE_CITATION_SET_CONFLICT_INVENTORY_LIMITS.maxPairComparisons;

export const KNOWLEDGE_CITATION_SET_PAIR_REVIEW_ASSERTION_LIMITS = Object.freeze({
  maxPairAssertions: MAX_PAIR_ASSERTIONS,
  maxAssertionInputTextCharacters: 1_500_000,
  maxAssertionInputValueNodes: 30_000,
  maxAssertionRecordTextCharacters: 2_500_000,
  maxAssertionRecordValueNodes: 50_000,
  maxPrecloneDepth: KNOWLEDGE_CITATION_SET_CONFLICT_INVENTORY_LIMITS.maxPrecloneDepth
});

export interface BuildKnowledgeCitationSetPairReviewAssertionInput {
  reviewer: Readonly<{
    identityRecordRef: string;
    statement: typeof KNOWLEDGE_CITATION_SET_PAIR_REVIEW_ASSERTION_STATEMENT;
    assertedReviewedAt: string;
  }>;
  pairAssertions: readonly Readonly<{
    order: number;
    citationIds: readonly [string, string];
    itemDigests: readonly [string, string];
    observation: KnowledgeCitationSetPairObservation;
  }>[];
}

export interface KnowledgeCitationSetPairReviewAssertion {
  profile: typeof KNOWLEDGE_CITATION_SET_PAIR_REVIEW_ASSERTION_PROFILE;
  binding: Readonly<{
    evidenceSubjectId: string;
    registryVersion: string;
    targetKey: string;
    retrievalUseMode: "local_review";
    packetProjectionVersion: string;
    packetPayloadSha256: string;
    matchingSourceSetSha256: string;
    inventoryProjectionVersion: string;
    inventoryPayloadSha256: string;
    inventoryPairCount: number;
  }>;
  reviewer: BuildKnowledgeCitationSetPairReviewAssertionInput["reviewer"];
  pairAssertions: readonly Readonly<{
    order: number;
    citationIds: readonly [string, string];
    itemDigests: readonly [string, string];
    observation: KnowledgeCitationSetPairObservation;
    pairAssertionSha256: string;
  }>[];
  observationCounts: Readonly<{
    totalPairAssertions: number;
    noDirectTensionObservedInBoundQuotes: number;
    potentialTensionObservedInBoundQuotes: number;
    notDirectlyComparableInBoundScope: number;
    insufficientBoundContext: number;
  }>;
  reviewerAssertionSha256: string;
  boundary: Readonly<{
    allInventoryPairsAddressedByAssertions: true;
    reviewerIdentityBasis: "self_declared_not_verified";
    reviewerIdentityVerified: false;
    assertedReviewedAtVerified: false;
    digitalSignaturePresent: false;
    digitalSignatureVerified: false;
    digestIsDigitalSignature: false;
    authenticityClaimed: false;
    humanReviewAuthenticityVerified: false;
    automatedConflictDetectionPerformed: false;
    citationSetConflictReviewPerformed: false;
    citationSetConflictStatus: "unassessed";
    semanticConflictResolutionPerformed: false;
    winnerSelectionPerformed: false;
    consensusClaimed: false;
    sourceTextFieldsCopied: false;
    freeformReviewerTextAccepted: false;
    sourceTextInstructionAuthority: false;
    promptInjectionScreeningPerformed: false;
    privacyReviewPerformed: false;
    externalPurposeRightsReviewed: false;
    externalProviderUseAuthorized: false;
    downstreamExternalUseGate: "blocked";
    networkTransmissionPerformed: false;
    networkTransmissionAuthorized: false;
    publicExportAuthorized: false;
    expertTruthClaimed: false;
    scientificValidityClaimed: false;
    formalActivationAllowed: false;
    chartApplicabilityAssessed: false;
    mutationEpochRevalidationPerformed: false;
    packetMutationPerformed: false;
    storageMutationPerformed: false;
    chartMutationPerformed: false;
    result: null;
  }>;
  integrity: Readonly<{
    hashAlgorithm: "SHA-256";
    recordSha256: string;
    digestIsDigitalSignature: false;
    authenticityClaimed: false;
  }>;
}

type PairReviewAssertionPayload = Omit<KnowledgeCitationSetPairReviewAssertion, "integrity">;

export class KnowledgeCitationSetPairReviewAssertionError extends Error {
  constructor(
    readonly code:
      | "ASSERTION_INPUT_LIMIT_EXCEEDED"
      | "INVALID_ASSERTION_INPUT"
      | "LOCAL_REVIEW_ONLY"
      | "CANDIDATE_CITATIONS_PRESENT"
      | "REJECTED_CITATIONS_PRESENT"
      | "PAIR_ASSERTIONS_REQUIRED"
      | "PAIR_COVERAGE_MISMATCH",
    message: string
  ) {
    super(message);
    this.name = "KnowledgeCitationSetPairReviewAssertionError";
  }
}

interface DeclarativeValueBudget {
  valueNodes: number;
  textCharacters: number;
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

function throwInputLimitExceeded(message: string): never {
  throw new KnowledgeCitationSetPairReviewAssertionError(
    "ASSERTION_INPUT_LIMIT_EXCEEDED",
    message
  );
}

function throwInvalidInput(message: string): never {
  throw new KnowledgeCitationSetPairReviewAssertionError("INVALID_ASSERTION_INPUT", message);
}

function claimText(
  budget: DeclarativeValueBudget,
  length: number,
  limits: Readonly<{ textCharacters: number; valueNodes: number }>,
  subject: string
): void {
  budget.textCharacters += length;
  if (budget.textCharacters > limits.textCharacters) {
    throwInputLimitExceeded(`${subject}文本总量超过有界声明式预检上限。`);
  }
}

function ownDataProperty(objectValue: object, key: string, path: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(objectValue, key);
  if (!descriptor || !("value" in descriptor)) {
    throwInvalidInput(`${path} 必须是自有声明式数据字段`);
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
  if (depth > KNOWLEDGE_CITATION_SET_PAIR_REVIEW_ASSERTION_LIMITS.maxPrecloneDepth) {
    throwInputLimitExceeded(`${subject}超过有界声明式预检最大深度。`);
  }
  budget.valueNodes += 1;
  if (budget.valueNodes > limits.valueNodes) {
    throwInputLimitExceeded(`${subject}结构节点总量超过有界声明式预检上限。`);
  }
  if (typeof value === "string") {
    claimText(budget, value.length, limits, subject);
    return;
  }
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throwInvalidInput(`${path} 包含非有限数字`);
    return;
  }
  if (typeof value !== "object") {
    throwInvalidInput(`${path} 包含非声明式 JSON 值：${typeof value}`);
  }

  const objectValue = value as object;
  if (ancestors.has(objectValue)) throwInvalidInput(`${path} 包含循环引用`);
  if (Object.getOwnPropertySymbols(objectValue).length > 0) {
    throwInvalidInput(`${path} 不能包含 Symbol 属性`);
  }
  ancestors.add(objectValue);
  try {
    if (Array.isArray(objectValue)) {
      const lengthValue = ownDataProperty(objectValue, "length", `${path}.length`);
      if (typeof lengthValue !== "number" || !Number.isSafeInteger(lengthValue) || lengthValue < 0) {
        throwInvalidInput(`${path}.length 无效`);
      }
      const length = lengthValue;
      if (length > limits.valueNodes - budget.valueNodes) {
        throwInputLimitExceeded(`${subject}数组槽位超过有界声明式预检结构上限。`);
      }
      const propertyNames = Object.getOwnPropertyNames(objectValue);
      if (propertyNames.length !== length + 1) {
        throwInvalidInput(`${path} 必须是稠密且没有自定义字段的数组`);
      }
      for (let index = 0; index < length; index += 1) {
        const key = String(index);
        const descriptor = Object.getOwnPropertyDescriptor(objectValue, key);
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
          throwInvalidInput(`${path}[${key}] 必须是可枚举的声明式数组项`);
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
      throwInvalidInput(`${path} 必须是普通声明式对象`);
    }
    for (const key of Object.getOwnPropertyNames(objectValue)) {
      const descriptor = Object.getOwnPropertyDescriptor(objectValue, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        throwInvalidInput(`${path}.${key} 必须是可枚举的声明式数据字段`);
      }
      claimText(budget, key.length, limits, subject);
      if (descriptor.value === undefined) {
        throwInvalidInput(`${path}.${key} 不能是 undefined`);
      }
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

function assertionInputPreflight(value: unknown): void {
  inspectBoundedDeclarativeValue(
    value,
    {
      textCharacters:
        KNOWLEDGE_CITATION_SET_PAIR_REVIEW_ASSERTION_LIMITS.maxAssertionInputTextCharacters,
      valueNodes: KNOWLEDGE_CITATION_SET_PAIR_REVIEW_ASSERTION_LIMITS.maxAssertionInputValueNodes
    },
    "引用集逐对复核断言输入"
  );
}

function assertionRecordPreflight(value: unknown): void {
  inspectBoundedDeclarativeValue(
    value,
    {
      textCharacters:
        KNOWLEDGE_CITATION_SET_PAIR_REVIEW_ASSERTION_LIMITS.maxAssertionRecordTextCharacters,
      valueNodes: KNOWLEDGE_CITATION_SET_PAIR_REVIEW_ASSERTION_LIMITS.maxAssertionRecordValueNodes
    },
    "引用集逐对复核断言记录"
  );
}

function ordinaryObject(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throwInvalidInput(`${path} 必须是普通声明式对象`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
  path: string
): void {
  const actual = Object.keys(value).sort(compareCodeUnits);
  const expected = [...expectedKeys].sort(compareCodeUnits);
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throwInvalidInput(`${path} 只能包含固定字段：${expected.join(", ")}`);
  }
}

function requiredArray(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) throwInvalidInput(`${path} 必须是数组`);
  return value;
}

function requiredString(value: unknown, path: string): string {
  if (typeof value !== "string") throwInvalidInput(`${path} 必须是字符串`);
  return value;
}

function requiredPositiveSafeInteger(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throwInvalidInput(`${path} 必须是正安全整数`);
  }
  return value as number;
}

function assertSha256Hex(value: string, path: string): void {
  if (!/^[a-f0-9]{64}$/u.test(value)) throwInvalidInput(`${path} 必须是小写 SHA-256 十六进制摘要`);
}

function parseTuple(
  value: unknown,
  path: string,
  itemValidator?: (item: string, itemPath: string) => void
): readonly [string, string] {
  const array = requiredArray(value, path);
  if (array.length !== 2) throwInvalidInput(`${path} 必须恰含两个项目`);
  const left = requiredString(array[0], `${path}[0]`);
  const right = requiredString(array[1], `${path}[1]`);
  itemValidator?.(left, `${path}[0]`);
  itemValidator?.(right, `${path}[1]`);
  return [left, right];
}

function parseAssertionInputSnapshot(
  value: unknown
): BuildKnowledgeCitationSetPairReviewAssertionInput {
  const input = ordinaryObject(value, "引用集逐对复核断言输入");
  exactKeys(input, ["reviewer", "pairAssertions"], "引用集逐对复核断言输入");

  const reviewerValue = ordinaryObject(
    ownDataProperty(input, "reviewer", "引用集逐对复核断言输入.reviewer"),
    "引用集逐对复核断言输入.reviewer"
  );
  exactKeys(
    reviewerValue,
    ["identityRecordRef", "statement", "assertedReviewedAt"],
    "引用集逐对复核断言输入.reviewer"
  );
  const identityRecordRef = requiredString(
    reviewerValue.identityRecordRef,
    "reviewer.identityRecordRef"
  );
  if (!/^sha256:[a-f0-9]{64}$/u.test(identityRecordRef)) {
    throwInvalidInput("reviewer.identityRecordRef 必须是 sha256: 加 64 位小写十六进制摘要");
  }
  const statement = requiredString(reviewerValue.statement, "reviewer.statement");
  if (statement !== KNOWLEDGE_CITATION_SET_PAIR_REVIEW_ASSERTION_STATEMENT) {
    throwInvalidInput("reviewer.statement 必须等于固定断言文本");
  }
  const assertedReviewedAt = requiredString(
    reviewerValue.assertedReviewedAt,
    "reviewer.assertedReviewedAt"
  );
  const assertedDate = new Date(assertedReviewedAt);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(assertedReviewedAt)
    || Number.isNaN(assertedDate.valueOf())
    || assertedDate.toISOString() !== assertedReviewedAt
  ) {
    throwInvalidInput("reviewer.assertedReviewedAt 必须是规范 UTC ISO 时间");
  }

  const pairValues = requiredArray(
    ownDataProperty(input, "pairAssertions", "引用集逐对复核断言输入.pairAssertions"),
    "引用集逐对复核断言输入.pairAssertions"
  );
  if (pairValues.length > MAX_PAIR_ASSERTIONS) {
    throwInputLimitExceeded("引用集逐对复核断言输入超过逐对断言数量上限。不得截断。")
  }
  const pairAssertions = pairValues.map((pairValue, index) => {
    const path = `pairAssertions[${index}]`;
    const pair = ordinaryObject(pairValue, path);
    exactKeys(pair, ["order", "citationIds", "itemDigests", "observation"], path);
    const observation = requiredString(pair.observation, `${path}.observation`);
    if (!(KNOWLEDGE_CITATION_SET_PAIR_OBSERVATIONS as readonly string[]).includes(observation)) {
      throwInvalidInput(`${path}.observation 不是允许的中立观察枚举`);
    }
    return {
      order: requiredPositiveSafeInteger(pair.order, `${path}.order`),
      citationIds: parseTuple(pair.citationIds, `${path}.citationIds`),
      itemDigests: parseTuple(pair.itemDigests, `${path}.itemDigests`, assertSha256Hex),
      observation: observation as KnowledgeCitationSetPairObservation
    };
  });

  return {
    reviewer: { identityRecordRef, statement, assertedReviewedAt },
    pairAssertions
  };
}

function snapshotAssertionInput(
  rawInput: unknown
): BuildKnowledgeCitationSetPairReviewAssertionInput {
  assertionInputPreflight(rawInput);
  parseAssertionInputSnapshot(rawInput);
  return parseAssertionInputSnapshot(canonicalClone(rawInput));
}

function assertPairCoverage(
  inventory: KnowledgeCitationSetConflictInventory,
  pairAssertions: BuildKnowledgeCitationSetPairReviewAssertionInput["pairAssertions"]
): void {
  if (pairAssertions.length !== inventory.pairs.length) {
    throw new KnowledgeCitationSetPairReviewAssertionError(
      "PAIR_COVERAGE_MISMATCH",
      "逐对复核断言必须与机械清单同序、等长且完整覆盖。不得遗漏、重复或增加。"
    );
  }
  for (let index = 0; index < inventory.pairs.length; index += 1) {
    const inventoryPair = inventory.pairs[index]!;
    const assertion = pairAssertions[index]!;
    if (
      assertion.order !== inventoryPair.order
      || assertion.citationIds[0] !== inventoryPair.citationIds[0]
      || assertion.citationIds[1] !== inventoryPair.citationIds[1]
      || assertion.itemDigests[0] !== inventoryPair.itemDigests[0]
      || assertion.itemDigests[1] !== inventoryPair.itemDigests[1]
    ) {
      throw new KnowledgeCitationSetPairReviewAssertionError(
        "PAIR_COVERAGE_MISMATCH",
        `逐对复核断言第 ${index + 1} 项与机械清单的顺序或绑定不一致。`
      );
    }
  }
}

function assertionBinding(inventory: KnowledgeCitationSetConflictInventory) {
  return {
    evidenceSubjectId: inventory.binding.evidenceSubjectId,
    registryVersion: inventory.binding.registryVersion,
    targetKey: inventory.binding.targetKey,
    retrievalUseMode: "local_review" as const,
    packetProjectionVersion: inventory.binding.retrievalProjectionVersion,
    packetPayloadSha256: inventory.binding.retrievalPayloadSha256,
    matchingSourceSetSha256: inventory.binding.matchingSourceSetSha256,
    inventoryProjectionVersion: inventory.profile.projectionVersion,
    inventoryPayloadSha256: inventory.integrity.payloadSha256,
    inventoryPairCount: inventory.pairs.length
  };
}

function countObservations(
  pairAssertions: readonly Readonly<{ observation: KnowledgeCitationSetPairObservation }>[]
) {
  let noDirectTensionObservedInBoundQuotes = 0;
  let potentialTensionObservedInBoundQuotes = 0;
  let notDirectlyComparableInBoundScope = 0;
  let insufficientBoundContext = 0;
  for (const assertion of pairAssertions) {
    switch (assertion.observation) {
      case "no_direct_tension_observed_in_bound_quotes":
        noDirectTensionObservedInBoundQuotes += 1;
        break;
      case "potential_tension_observed_in_bound_quotes":
        potentialTensionObservedInBoundQuotes += 1;
        break;
      case "not_directly_comparable_in_bound_scope":
        notDirectlyComparableInBoundScope += 1;
        break;
      case "insufficient_bound_context":
        insufficientBoundContext += 1;
        break;
    }
  }
  return {
    totalPairAssertions: pairAssertions.length,
    noDirectTensionObservedInBoundQuotes,
    potentialTensionObservedInBoundQuotes,
    notDirectlyComparableInBoundScope,
    insufficientBoundContext
  };
}

function exactRecordShape(value: unknown): void {
  const record = ordinaryObject(value, "引用集逐对复核断言记录");
  exactKeys(
    record,
    [
      "profile",
      "binding",
      "reviewer",
      "pairAssertions",
      "observationCounts",
      "reviewerAssertionSha256",
      "boundary",
      "integrity"
    ],
    "引用集逐对复核断言记录"
  );
  exactKeys(
    ordinaryObject(record.profile, "记录.profile"),
    Object.keys(KNOWLEDGE_CITATION_SET_PAIR_REVIEW_ASSERTION_PROFILE),
    "记录.profile"
  );
  exactKeys(
    ordinaryObject(record.binding, "记录.binding"),
    [
      "evidenceSubjectId",
      "registryVersion",
      "targetKey",
      "retrievalUseMode",
      "packetProjectionVersion",
      "packetPayloadSha256",
      "matchingSourceSetSha256",
      "inventoryProjectionVersion",
      "inventoryPayloadSha256",
      "inventoryPairCount"
    ],
    "记录.binding"
  );
  exactKeys(
    ordinaryObject(record.reviewer, "记录.reviewer"),
    ["identityRecordRef", "statement", "assertedReviewedAt"],
    "记录.reviewer"
  );
  const pairAssertions = requiredArray(record.pairAssertions, "记录.pairAssertions");
  if (pairAssertions.length > MAX_PAIR_ASSERTIONS) {
    throwInputLimitExceeded("引用集逐对复核断言记录超过逐对断言数量上限。不得截断。")
  }
  for (let index = 0; index < pairAssertions.length; index += 1) {
    exactKeys(
      ordinaryObject(pairAssertions[index], `记录.pairAssertions[${index}]`),
      ["order", "citationIds", "itemDigests", "observation", "pairAssertionSha256"],
      `记录.pairAssertions[${index}]`
    );
  }
  exactKeys(
    ordinaryObject(record.observationCounts, "记录.observationCounts"),
    [
      "totalPairAssertions",
      "noDirectTensionObservedInBoundQuotes",
      "potentialTensionObservedInBoundQuotes",
      "notDirectlyComparableInBoundScope",
      "insufficientBoundContext"
    ],
    "记录.observationCounts"
  );
  exactKeys(
    ordinaryObject(record.boundary, "记录.boundary"),
    [
      "allInventoryPairsAddressedByAssertions",
      "reviewerIdentityBasis",
      "reviewerIdentityVerified",
      "assertedReviewedAtVerified",
      "digitalSignaturePresent",
      "digitalSignatureVerified",
      "digestIsDigitalSignature",
      "authenticityClaimed",
      "humanReviewAuthenticityVerified",
      "automatedConflictDetectionPerformed",
      "citationSetConflictReviewPerformed",
      "citationSetConflictStatus",
      "semanticConflictResolutionPerformed",
      "winnerSelectionPerformed",
      "consensusClaimed",
      "sourceTextFieldsCopied",
      "freeformReviewerTextAccepted",
      "sourceTextInstructionAuthority",
      "promptInjectionScreeningPerformed",
      "privacyReviewPerformed",
      "externalPurposeRightsReviewed",
      "externalProviderUseAuthorized",
      "downstreamExternalUseGate",
      "networkTransmissionPerformed",
      "networkTransmissionAuthorized",
      "publicExportAuthorized",
      "expertTruthClaimed",
      "scientificValidityClaimed",
      "formalActivationAllowed",
      "chartApplicabilityAssessed",
      "mutationEpochRevalidationPerformed",
      "packetMutationPerformed",
      "storageMutationPerformed",
      "chartMutationPerformed",
      "result"
    ],
    "记录.boundary"
  );
  exactKeys(
    ordinaryObject(record.integrity, "记录.integrity"),
    ["hashAlgorithm", "recordSha256", "digestIsDigitalSignature", "authenticityClaimed"],
    "记录.integrity"
  );
}

function humanInputFromRecordSnapshot(
  snapshot: unknown
): BuildKnowledgeCitationSetPairReviewAssertionInput {
  const record = snapshot as Record<string, unknown>;
  const reviewer = record.reviewer as Record<string, unknown>;
  const pairAssertions = record.pairAssertions as readonly Record<string, unknown>[];
  return {
    reviewer: {
      identityRecordRef: reviewer.identityRecordRef as string,
      statement: reviewer.statement as typeof KNOWLEDGE_CITATION_SET_PAIR_REVIEW_ASSERTION_STATEMENT,
      assertedReviewedAt: reviewer.assertedReviewedAt as string
    },
    pairAssertions: pairAssertions.map((pair) => ({
      order: pair.order as number,
      citationIds: pair.citationIds as readonly [string, string],
      itemDigests: pair.itemDigests as readonly [string, string],
      observation: pair.observation as KnowledgeCitationSetPairObservation
    }))
  };
}

/**
 * Builds one deterministic, single-reviewer observation ledger for every pair
 * in a validated local-review inventory. Hashes provide change detection and
 * binding only; they are not signatures, identity proof, or authenticity proof.
 */
export async function buildKnowledgeCitationSetPairReviewAssertion(
  rawAssertionInput: unknown,
  rawInventory: unknown,
  rawPacket: unknown,
  rawPacketInput: BuildKnowledgeSourceAwareRetrievalPacketInput
): Promise<KnowledgeCitationSetPairReviewAssertion> {
  const assertionInput = snapshotAssertionInput(rawAssertionInput);
  const inventory = await validateKnowledgeCitationSetConflictInventory(
    rawInventory,
    rawPacket,
    rawPacketInput
  );

  if (inventory.binding.retrievalUseMode !== "local_review") {
    throw new KnowledgeCitationSetPairReviewAssertionError(
      "LOCAL_REVIEW_ONLY",
      "引用集逐对复核断言只允许绑定本机人工审阅清单。"
    );
  }
  if (inventory.binding.candidateCitationIds.length > 0) {
    throw new KnowledgeCitationSetPairReviewAssertionError(
      "CANDIDATE_CITATIONS_PRESENT",
      "仍有候选引用时不得形成完整逐对复核断言。"
    );
  }
  if (inventory.binding.rejectedCitationIds.length > 0) {
    throw new KnowledgeCitationSetPairReviewAssertionError(
      "REJECTED_CITATIONS_PRESENT",
      "仍有拒绝引用台账时不得形成完整逐对复核断言。"
    );
  }
  if (inventory.pairs.length === 0) {
    throw new KnowledgeCitationSetPairReviewAssertionError(
      "PAIR_ASSERTIONS_REQUIRED",
      "机械清单没有引用对时不得形成逐对复核断言。"
    );
  }
  if (inventory.reviewGate.status !== "pending_human_review") {
    throw new KnowledgeCitationSetPairReviewAssertionError(
      "PAIR_ASSERTIONS_REQUIRED",
      "只有待人工逐对复核的机械清单可以形成此断言。"
    );
  }
  assertPairCoverage(inventory, assertionInput.pairAssertions);

  const binding = assertionBinding(inventory);
  const pairAssertions: Array<{
    order: number;
    citationIds: readonly [string, string];
    itemDigests: readonly [string, string];
    observation: KnowledgeCitationSetPairObservation;
    pairAssertionSha256: string;
  }> = [];
  for (let index = 0; index < assertionInput.pairAssertions.length; index += 1) {
    const assertion = assertionInput.pairAssertions[index]!;
    const inventoryPair: KnowledgeCitationSetConflictInventoryPair = inventory.pairs[index]!;
    pairAssertions.push({
      order: assertion.order,
      citationIds: [assertion.citationIds[0], assertion.citationIds[1]] as const,
      itemDigests: [assertion.itemDigests[0], assertion.itemDigests[1]] as const,
      observation: assertion.observation,
      pairAssertionSha256: await sha256Hex({
        domain: KNOWLEDGE_CITATION_SET_PAIR_REVIEW_ASSERTION_PROFILE.pairAssertionDigestDomain,
        payload: {
          inventoryPayloadSha256: inventory.integrity.payloadSha256,
          inventoryPair,
          observation: assertion.observation
        }
      })
    });
  }
  const observationCounts = countObservations(pairAssertions);
  const reviewer = {
    identityRecordRef: assertionInput.reviewer.identityRecordRef,
    statement: assertionInput.reviewer.statement,
    assertedReviewedAt: assertionInput.reviewer.assertedReviewedAt
  };
  const reviewerAssertionSha256 = await sha256Hex({
    domain: KNOWLEDGE_CITATION_SET_PAIR_REVIEW_ASSERTION_PROFILE.reviewerAssertionDigestDomain,
    payload: {
      binding,
      reviewer,
      pairAssertionSha256s: pairAssertions.map((assertion) => assertion.pairAssertionSha256)
    }
  });
  const payload: PairReviewAssertionPayload = {
    profile: KNOWLEDGE_CITATION_SET_PAIR_REVIEW_ASSERTION_PROFILE,
    binding,
    reviewer,
    pairAssertions,
    observationCounts,
    reviewerAssertionSha256,
    boundary: {
      allInventoryPairsAddressedByAssertions: true,
      reviewerIdentityBasis: "self_declared_not_verified",
      reviewerIdentityVerified: false,
      assertedReviewedAtVerified: false,
      digitalSignaturePresent: false,
      digitalSignatureVerified: false,
      digestIsDigitalSignature: false,
      authenticityClaimed: false,
      humanReviewAuthenticityVerified: false,
      automatedConflictDetectionPerformed: false,
      citationSetConflictReviewPerformed: false,
      citationSetConflictStatus: "unassessed",
      semanticConflictResolutionPerformed: false,
      winnerSelectionPerformed: false,
      consensusClaimed: false,
      sourceTextFieldsCopied: false,
      freeformReviewerTextAccepted: false,
      sourceTextInstructionAuthority: false,
      promptInjectionScreeningPerformed: false,
      privacyReviewPerformed: false,
      externalPurposeRightsReviewed: false,
      externalProviderUseAuthorized: false,
      downstreamExternalUseGate: "blocked",
      networkTransmissionPerformed: false,
      networkTransmissionAuthorized: false,
      publicExportAuthorized: false,
      expertTruthClaimed: false,
      scientificValidityClaimed: false,
      formalActivationAllowed: false,
      chartApplicabilityAssessed: false,
      mutationEpochRevalidationPerformed: false,
      packetMutationPerformed: false,
      storageMutationPerformed: false,
      chartMutationPerformed: false,
      result: null
    }
  };
  assertionRecordPreflight(payload);
  const record: KnowledgeCitationSetPairReviewAssertion = {
    ...payload,
    integrity: {
      hashAlgorithm: "SHA-256",
      recordSha256: await sha256Hex({
        domain: KNOWLEDGE_CITATION_SET_PAIR_REVIEW_ASSERTION_PROFILE.recordDigestDomain,
        payload
      }),
      digestIsDigitalSignature: false,
      authenticityClaimed: false
    }
  };
  assertionRecordPreflight(record);
  return deepFreeze(record);
}

export async function validateKnowledgeCitationSetPairReviewAssertion(
  rawRecord: unknown,
  rawInventory: unknown,
  rawPacket: unknown,
  rawPacketInput: BuildKnowledgeSourceAwareRetrievalPacketInput
): Promise<KnowledgeCitationSetPairReviewAssertion> {
  assertionRecordPreflight(rawRecord);
  exactRecordShape(rawRecord);
  const recordSnapshot = canonicalClone(rawRecord);
  const humanInput = humanInputFromRecordSnapshot(recordSnapshot);
  const rebuilt = await buildKnowledgeCitationSetPairReviewAssertion(
    humanInput,
    rawInventory,
    rawPacket,
    rawPacketInput
  );
  if (!sameValue(recordSnapshot, rebuilt)) {
    throw new Error("引用集逐对复核断言记录与当前机械清单及人类输入的规范重建不一致");
  }
  return rebuilt;
}
