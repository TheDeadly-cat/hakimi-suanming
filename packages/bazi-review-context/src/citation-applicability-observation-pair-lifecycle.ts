import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import {
  BAZI_CITATION_APPLICABILITY_OBSERVATION_COMPARISON_PROFILE,
  compareBaziCitationApplicabilityObservations
} from "./citation-applicability-observation-comparison";
import {
  captureBaziCitationApplicabilityObservationCurrentContext,
  inspectBaziCitationApplicabilityObservation,
  preflightBaziCitationApplicabilityObservation,
  type BaziCitationApplicabilityObservationEnvelope,
  type BaziCitationApplicabilityObservationFileInspection
} from "./citation-applicability-observation";

export const BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_PROFILE = Object.freeze({
  formatVersion: "hakimi.bazi.citation_applicability_observation_pair_lifecycle/0.1.0",
  contentVersion: "0.1.0",
  system: "bazi" as const,
  scope: "two_complete_distinct_context_bound_observation_records_with_independent_terminal_local_withholding_chains" as const,
  recordPolicy: "exactly_two_records_sorted_by_lowercase_record_sha256" as const,
  eventPolicy: "per_record_recorded_then_zero_or_one_terminal_local_user_withholding" as const,
  orderingPolicy: "digest_and_sequence_only_without_clock_random_latest_wins_vote_or_rank" as const,
  persistencePolicy: "explicit_sensitive_local_sidecar_without_formal_store_or_persistence_attestation" as const,
  identityPolicy: "self_declared_material_reference_without_identity_independence_or_withdrawal_authority_verification" as const,
  requiredSharePolicy: "blocked_sensitive" as const,
  allowedEventKinds: Object.freeze([
    "recorded",
    "withheld_by_local_user"
  ] as const),
  allowedWithholdingReasons: Object.freeze([
    "local_user_request",
    "suspected_record_error",
    "context_superseded",
    "privacy_request",
    "other_unspecified"
  ] as const),
  ledgerIdDigestDomain: "hakimi.bazi.citation_applicability_observation_pair_lifecycle.ledger_id/1" as const,
  eventIdDigestDomain: "hakimi.bazi.citation_applicability_observation_pair_lifecycle.event_id/1" as const,
  eventDigestDomain: "hakimi.bazi.citation_applicability_observation_pair_lifecycle.event/1" as const,
  sidecarDigestDomain: "hakimi.bazi.citation_applicability_observation_pair_lifecycle.sidecar/1" as const,
  expertTruthClaimed: false as const,
  scientificValidityClaimed: false as const,
  formalActivationAllowed: false as const,
  automaticPromotionAllowed: false as const
});

export const BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_FILENAME =
  "hakimi-bazi-citation-applicability-observation-pair-lifecycle-v01.json" as const;

export type BaziCitationApplicabilityObservationPairLifecycleWithholdingReason =
  (typeof BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_PROFILE.allowedWithholdingReasons)[number];

export interface BaziCitationApplicabilityObservationPairLifecycleRecordedEvent {
  eventId: string;
  eventSha256: string;
  ledgerId: string;
  targetRecordSha256: string;
  sequence: 0;
  kind: "recorded";
  previousEventSha256: null;
  reasonCode: null;
  actorBasis: "local_user_unverified";
}

export interface BaziCitationApplicabilityObservationPairLifecycleWithheldEvent {
  eventId: string;
  eventSha256: string;
  ledgerId: string;
  targetRecordSha256: string;
  sequence: 1;
  kind: "withheld_by_local_user";
  previousEventSha256: string;
  reasonCode: BaziCitationApplicabilityObservationPairLifecycleWithholdingReason;
  actorBasis: "local_user_unverified";
}

export type BaziCitationApplicabilityObservationPairLifecycleEvent =
  | BaziCitationApplicabilityObservationPairLifecycleRecordedEvent
  | BaziCitationApplicabilityObservationPairLifecycleWithheldEvent;

export type BaziCitationApplicabilityObservationPairLifecycleEvents =
  | readonly [BaziCitationApplicabilityObservationPairLifecycleRecordedEvent]
  | readonly [
    BaziCitationApplicabilityObservationPairLifecycleRecordedEvent,
    BaziCitationApplicabilityObservationPairLifecycleWithheldEvent
  ];

export interface BaziCitationApplicabilityObservationPairLifecycleRecord {
  recordSha256: string;
  envelope: BaziCitationApplicabilityObservationEnvelope;
  state: "recorded_current_context_unchecked" | "withheld_by_local_user";
  events: BaziCitationApplicabilityObservationPairLifecycleEvents;
  chainHeadSha256: string;
}

export interface BaziCitationApplicabilityObservationPairLifecycleBoundary {
  oneSuppliedCurrentContextSnapshotUsedForBoth: true;
  inputOrderAffectsSidecar: false;
  clockReadPerformed: false;
  randomnessUsed: false;
  timestampUsedForLifecycleOrdering: false;
  localUserWithholdingOnly: true;
  localUserWithholdingIsReviewerWithdrawal: false;
  localUserActionAttested: false;
  terminalWithinSuppliedChainOnly: true;
  globalWithholdingAttested: false;
  crossFileReconciliationRequiredForDominance: true;
  withheldRecordBytesRetainedInSuccessorSidecar: true;
  priorSidecarMutationPerformed: false;
  formalStoreUsed: false;
  localFilePersistencePerformed: false;
  preparedFileDeliveryPerformed: false;
  contentEncryptionProvided: false;
  containsDerivedSensitiveChartBinding: true;
  containsUntrustedReviewerFreeformText: true;
  sourceTextCopied: false;
  reviewerIdentityVerified: false;
  reviewerIndependenceVerified: false;
  humanReviewAuthenticityVerified: false;
  reviewerWithdrawalAuthorityVerified: false;
  digitalSignaturePresent: false;
  digitalSignatureVerified: false;
  digestIsDigitalSignature: false;
  authenticityClaimed: false;
  semanticConflictResolutionPerformed: false;
  majorityVotePerformed: false;
  rankingPerformed: false;
  winnerSelectionPerformed: false;
  consensusClaimed: false;
  chartApplicabilityAssessed: false;
  citationSemanticApplicabilityAssessed: false;
  storageMutationPerformed: false;
  chartMutationPerformed: false;
  caseOrRevisionMutationPerformed: false;
  rulePackMutationPerformed: false;
  mutationEpochRevalidationPerformed: false;
  mutationEpochBypassed: false;
  networkTransmissionPerformed: false;
  networkTransmissionAuthorized: false;
  priorExportsRecalled: false;
  physicalDeletionAttested: false;
  publicExportAuthorized: false;
  publicReleaseAuthorized: false;
  formalActivationAllowed: false;
  automaticPromotionAllowed: false;
  expertTruthClaimed: false;
  scientificValidityClaimed: false;
  result: null;
}

export interface BaziCitationApplicabilityObservationPairLifecycleSidecar {
  profile: typeof BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_PROFILE;
  ledgerId: string;
  contextBinding: Readonly<{
    releaseIdentity: Readonly<{
      dbGeneration: "legacy-v13";
      targetSchema: 13;
      migrationId: null;
    }>;
    contextPayloadSha256: string;
    displayContextBindingSha256: string;
    recordSetSha256: string;
  }>;
  records: readonly [
    BaziCitationApplicabilityObservationPairLifecycleRecord,
    BaziCitationApplicabilityObservationPairLifecycleRecord
  ];
  boundary: BaziCitationApplicabilityObservationPairLifecycleBoundary;
  integrity: Readonly<{
    hashAlgorithm: "SHA-256";
    sidecarSha256: string;
    digestIsDigitalSignature: false;
    authenticityClaimed: false;
  }>;
}

export interface BaziCitationApplicabilityObservationPairLifecycleInspection {
  sidecar: BaziCitationApplicabilityObservationPairLifecycleSidecar;
  recordedNotWithheldCount: 0 | 1 | 2;
  withheldRecordCount: 0 | 1 | 2;
  structurallyCompletePair: true;
  pairComparisonAllowed: false;
  currentContextChecked: false;
  reviewerIdentityVerified: false;
  reviewerIndependenceVerified: false;
  reviewerWithdrawalAuthorityVerified: false;
  formalActivationAllowed: false;
  automaticPromotionAllowed: false;
  storageMutationPerformed: false;
  mutationEpochBypassed: false;
  publicExportAuthorized: false;
  publicReleaseAuthorized: false;
  expertTruthClaimed: false;
  scientificValidityClaimed: false;
}

interface BaziCitationApplicabilityObservationPairLifecycleEvaluationBoundary {
  mechanicalComparisonOnly: true;
  suppliedContextRepositoryOriginAttested: false;
  suppliedContextStorageFreshnessAttested: false;
  currentAtReturnAttested: false;
  reviewerIdentityVerified: false;
  reviewerIndependenceVerified: false;
  reviewerWithdrawalAuthorityVerified: false;
  semanticConflictResolutionPerformed: false;
  winnerSelectionPerformed: false;
  consensusClaimed: false;
  formalActivationAllowed: false;
  automaticPromotionAllowed: false;
  storageMutationPerformed: false;
  mutationEpochRevalidationPerformed: false;
  mutationEpochBypassed: false;
  publicExportAuthorized: false;
  publicReleaseAuthorized: false;
  expertTruthClaimed: false;
  scientificValidityClaimed: false;
}

export type BaziCitationApplicabilityObservationPairLifecycleEvaluation =
  | Readonly<{
    status: "supplied_context_snapshot_matched_read_only";
    sidecar: BaziCitationApplicabilityObservationPairLifecycleSidecar;
    mechanicalComparisonEligibleUnderSuppliedContextSnapshot: true;
    currentContextCheckAttempted: true;
    currentContextCheckCompleted: true;
    currentContextDigestMatched: true;
    boundary: BaziCitationApplicabilityObservationPairLifecycleEvaluationBoundary;
  }>
  | Readonly<{
    status: "withheld_by_local_user";
    sidecar: BaziCitationApplicabilityObservationPairLifecycleSidecar;
    mechanicalComparisonEligibleUnderSuppliedContextSnapshot: false;
    currentContextCheckAttempted: false;
    currentContextCheckCompleted: false;
    currentContextDigestMatched: false;
    withheldRecordSha256s: readonly string[];
    boundary: BaziCitationApplicabilityObservationPairLifecycleEvaluationBoundary;
  }>
  | Readonly<{
    status: "supplied_context_mismatch_or_unverifiable";
    sidecar: BaziCitationApplicabilityObservationPairLifecycleSidecar;
    mechanicalComparisonEligibleUnderSuppliedContextSnapshot: false;
    currentContextCheckAttempted: true;
    currentContextCheckCompleted: boolean;
    currentContextDigestMatched: false;
    boundary: BaziCitationApplicabilityObservationPairLifecycleEvaluationBoundary;
  }>;

export type BaziCitationApplicabilityObservationPairLifecycleErrorCode =
  | "INVALID_CREATE_INPUT"
  | "OBSERVATION_PAIR_INVALID"
  | "INVALID_SIDECAR_TEXT"
  | "RESOURCE_LIMIT_EXCEEDED"
  | "UNSAFE_DECLARATIVE_SHAPE"
  | "PROFILE_MISMATCH"
  | "RELEASE_IDENTITY_MISMATCH"
  | "RECORD_INVALID"
  | "RECORD_INCOMPLETE"
  | "DUPLICATE_OBSERVATION_RECORD"
  | "SELF_DECLARED_REVIEWER_COLLISION"
  | "SELF_DECLARED_IDENTITY_REFERENCE_COLLISION"
  | "RECORD_ORDER_MISMATCH"
  | "CONTEXT_BINDING_MISMATCH"
  | "LEDGER_ID_MISMATCH"
  | "EVENT_INVALID"
  | "EVENT_CHAIN_MISMATCH"
  | "BOUNDARY_MISMATCH"
  | "INTEGRITY_MISMATCH"
  | "INVALID_RECONCILIATION_INPUT"
  | "LIFECYCLE_LEDGER_MISMATCH"
  | "EVENT_FORK_DETECTED"
  | "INVALID_WITHHOLDING_REQUEST"
  | "WITHHOLDING_TARGET_MISSING"
  | "RECORD_ALREADY_WITHHELD";

export class BaziCitationApplicabilityObservationPairLifecycleError extends Error {
  constructor(
    readonly code: BaziCitationApplicabilityObservationPairLifecycleErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "BaziCitationApplicabilityObservationPairLifecycleError";
  }
}

const MAX_SIDECAR_BYTES = 2 * 1024 * 1024;
const MAX_VALUE_NODES = 100_000;
const MAX_TEXT_CHARACTERS = 3_000_000;
const MAX_OBJECT_KEYS = 150_000;
const MAX_DEPTH = 48;
const MAX_RECONCILIATION_FILES = 16;
const MAX_RECONCILIATION_TEXT_CHARACTERS = 8 * 1024 * 1024;
const LOWERCASE_SHA256 = /^[a-f0-9]{64}$/u;
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const WITHHOLDING_REASON_SET = new Set<string>(
  BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_PROFILE.allowedWithholdingReasons
);
const trustedLifecycleSidecars = new WeakSet<object>();

type PlainRecord = Record<string, unknown>;

interface SnapshotBudget {
  valueNodes: number;
  textCharacters: number;
  objectKeys: number;
}

interface ParsedLifecycleRecord {
  record: BaziCitationApplicabilityObservationPairLifecycleRecord;
  inspection: BaziCitationApplicabilityObservationFileInspection;
}

function fail(
  code: BaziCitationApplicabilityObservationPairLifecycleErrorCode,
  message: string,
  options?: ErrorOptions
): never {
  throw new BaziCitationApplicabilityObservationPairLifecycleError(code, message, options);
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if ("value" in descriptor) deepFreeze(descriptor.value);
  }
  return value;
}

function trustSidecar(
  sidecar: BaziCitationApplicabilityObservationPairLifecycleSidecar
): BaziCitationApplicabilityObservationPairLifecycleSidecar {
  trustedLifecycleSidecars.add(sidecar);
  return sidecar;
}

function sameCanonical(left: unknown, right: unknown): boolean {
  return canonicalStringify(left) === canonicalStringify(right);
}

function compareDigest(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

function normalizedDeclaredIdentifier(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-US");
}

function snapshotDeclarative(
  value: unknown,
  subject: string,
  depth = 0,
  budget: SnapshotBudget = { valueNodes: 0, textCharacters: 0, objectKeys: 0 },
  ancestors = new WeakSet<object>()
): unknown {
  budget.valueNodes += 1;
  if (depth > MAX_DEPTH || budget.valueNodes > MAX_VALUE_NODES) {
    fail("RESOURCE_LIMIT_EXCEEDED", `${subject} 超出结构预算。`);
  }
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("UNSAFE_DECLARATIVE_SHAPE", `${subject} 包含非有限数值。`);
    return value;
  }
  if (typeof value === "string") {
    budget.textCharacters += value.length;
    if (budget.textCharacters > MAX_TEXT_CHARACTERS) {
      fail("RESOURCE_LIMIT_EXCEEDED", `${subject} 文本总量超限。`);
    }
    return value;
  }
  if (typeof value !== "object") {
    fail("UNSAFE_DECLARATIVE_SHAPE", `${subject} 只允许 JSON 数据值。`);
  }
  if (ancestors.has(value)) fail("UNSAFE_DECLARATIVE_SHAPE", `${subject} 包含循环引用。`);
  const array = Array.isArray(value);
  const prototype = Object.getPrototypeOf(value);
  if ((array && prototype !== Array.prototype) || (!array && prototype !== Object.prototype && prototype !== null)) {
    fail("UNSAFE_DECLARATIVE_SHAPE", `${subject} 必须是普通 JSON 对象或数组。`);
  }
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string")) {
    fail("UNSAFE_DECLARATIVE_SHAPE", `${subject} 不允许 Symbol 字段。`);
  }
  const stringKeys = ownKeys as string[];
  budget.objectKeys += stringKeys.length;
  if (budget.objectKeys > MAX_OBJECT_KEYS) {
    fail("RESOURCE_LIMIT_EXCEEDED", `${subject} 字段总量超限。`);
  }
  for (const key of stringKeys) {
    budget.textCharacters += key.length;
    if (FORBIDDEN_KEYS.has(key) || key.length > 256) {
      fail("UNSAFE_DECLARATIVE_SHAPE", `${subject} 包含危险或超限字段名。`);
    }
    if (budget.textCharacters > MAX_TEXT_CHARACTERS) {
      fail("RESOURCE_LIMIT_EXCEEDED", `${subject} 文本总量超限。`);
    }
  }
  ancestors.add(value);
  try {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (array) {
      if (value.length > 512 || stringKeys.length !== value.length + 1 || !stringKeys.includes("length")) {
        fail("UNSAFE_DECLARATIVE_SHAPE", `${subject} 数组超限、稀疏或包含附加字段。`);
      }
      const result: unknown[] = [];
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
          fail("UNSAFE_DECLARATIVE_SHAPE", `${subject}[${index}] 必须是自有可枚举数据项。`);
        }
        result.push(snapshotDeclarative(
          descriptor.value,
          `${subject}[${index}]`,
          depth + 1,
          budget,
          ancestors
        ));
      }
      return result;
    }
    if (stringKeys.length > 128) {
      fail("RESOURCE_LIMIT_EXCEEDED", `${subject} 单个对象字段过多。`);
    }
    const result = Object.create(null) as PlainRecord;
    for (const key of stringKeys) {
      const descriptor = descriptors[key];
      if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
        fail("UNSAFE_DECLARATIVE_SHAPE", `${subject}.${key} 必须是自有可枚举数据字段。`);
      }
      result[key] = snapshotDeclarative(
        descriptor.value,
        `${subject}.${key}`,
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

function record(value: unknown, subject: string): PlainRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("UNSAFE_DECLARATIVE_SHAPE", `${subject} 必须是对象。`);
  }
  return value as PlainRecord;
}

function exactKeys(
  value: PlainRecord,
  expected: readonly string[],
  subject: string,
  code: BaziCitationApplicabilityObservationPairLifecycleErrorCode = "UNSAFE_DECLARATIVE_SHAPE"
): void {
  const actual = Object.keys(value).sort();
  const normalizedExpected = [...expected].sort();
  if (
    actual.length !== normalizedExpected.length
    || actual.some((key, index) => key !== normalizedExpected[index])
  ) {
    fail(code, `${subject} 字段集合不匹配。`);
  }
}

function lowercaseSha256Value(
  value: unknown,
  subject: string,
  code: BaziCitationApplicabilityObservationPairLifecycleErrorCode
): string {
  if (typeof value !== "string" || !LOWERCASE_SHA256.test(value)) {
    fail(code, `${subject} 不是小写 SHA-256 摘要。`);
  }
  return value;
}

function fixedBoundary(): BaziCitationApplicabilityObservationPairLifecycleBoundary {
  return deepFreeze({
    oneSuppliedCurrentContextSnapshotUsedForBoth: true,
    inputOrderAffectsSidecar: false,
    clockReadPerformed: false,
    randomnessUsed: false,
    timestampUsedForLifecycleOrdering: false,
    localUserWithholdingOnly: true,
    localUserWithholdingIsReviewerWithdrawal: false,
    localUserActionAttested: false,
    terminalWithinSuppliedChainOnly: true,
    globalWithholdingAttested: false,
    crossFileReconciliationRequiredForDominance: true,
    withheldRecordBytesRetainedInSuccessorSidecar: true,
    priorSidecarMutationPerformed: false,
    formalStoreUsed: false,
    localFilePersistencePerformed: false,
    preparedFileDeliveryPerformed: false,
    contentEncryptionProvided: false,
    containsDerivedSensitiveChartBinding: true,
    containsUntrustedReviewerFreeformText: true,
    sourceTextCopied: false,
    reviewerIdentityVerified: false,
    reviewerIndependenceVerified: false,
    humanReviewAuthenticityVerified: false,
    reviewerWithdrawalAuthorityVerified: false,
    digitalSignaturePresent: false,
    digitalSignatureVerified: false,
    digestIsDigitalSignature: false,
    authenticityClaimed: false,
    semanticConflictResolutionPerformed: false,
    majorityVotePerformed: false,
    rankingPerformed: false,
    winnerSelectionPerformed: false,
    consensusClaimed: false,
    chartApplicabilityAssessed: false,
    citationSemanticApplicabilityAssessed: false,
    storageMutationPerformed: false,
    chartMutationPerformed: false,
    caseOrRevisionMutationPerformed: false,
    rulePackMutationPerformed: false,
    mutationEpochRevalidationPerformed: false,
    mutationEpochBypassed: false,
    networkTransmissionPerformed: false,
    networkTransmissionAuthorized: false,
    priorExportsRecalled: false,
    physicalDeletionAttested: false,
    publicExportAuthorized: false,
    publicReleaseAuthorized: false,
    formalActivationAllowed: false,
    automaticPromotionAllowed: false,
    expertTruthClaimed: false,
    scientificValidityClaimed: false,
    result: null
  });
}

function fixedEvaluationBoundary(): BaziCitationApplicabilityObservationPairLifecycleEvaluationBoundary {
  return deepFreeze({
    mechanicalComparisonOnly: true,
    suppliedContextRepositoryOriginAttested: false,
    suppliedContextStorageFreshnessAttested: false,
    currentAtReturnAttested: false,
    reviewerIdentityVerified: false,
    reviewerIndependenceVerified: false,
    reviewerWithdrawalAuthorityVerified: false,
    semanticConflictResolutionPerformed: false,
    winnerSelectionPerformed: false,
    consensusClaimed: false,
    formalActivationAllowed: false,
    automaticPromotionAllowed: false,
    storageMutationPerformed: false,
    mutationEpochRevalidationPerformed: false,
    mutationEpochBypassed: false,
    publicExportAuthorized: false,
    publicReleaseAuthorized: false,
    expertTruthClaimed: false,
    scientificValidityClaimed: false
  });
}

async function lifecycleLedgerId(
  contextPayloadSha256: string,
  displayContextBindingSha256: string,
  recordSetSha256: string
): Promise<string> {
  return sha256Hex({
    domain: BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_PROFILE.ledgerIdDigestDomain,
    releaseIdentity: {
      dbGeneration: "legacy-v13",
      targetSchema: 13,
      migrationId: null
    },
    contextPayloadSha256,
    displayContextBindingSha256,
    recordSetSha256
  });
}

async function lifecycleEventId(
  ledgerId: string,
  targetRecordSha256: string,
  sequence: 0 | 1,
  kind: "recorded" | "withheld_by_local_user"
): Promise<string> {
  return sha256Hex({
    domain: BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_PROFILE.eventIdDigestDomain,
    ledgerId,
    targetRecordSha256,
    sequence,
    kind
  });
}

async function recordedEvent(
  ledgerId: string,
  targetRecordSha256: string
): Promise<BaziCitationApplicabilityObservationPairLifecycleRecordedEvent> {
  const eventId = await lifecycleEventId(ledgerId, targetRecordSha256, 0, "recorded");
  const payload = deepFreeze({
    eventId,
    ledgerId,
    targetRecordSha256,
    sequence: 0 as const,
    kind: "recorded" as const,
    previousEventSha256: null,
    reasonCode: null,
    actorBasis: "local_user_unverified" as const
  });
  return deepFreeze({
    ...payload,
    eventSha256: await sha256Hex({
      domain: BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_PROFILE.eventDigestDomain,
      payload
    })
  });
}

async function withheldEvent(
  ledgerId: string,
  targetRecordSha256: string,
  previousEventSha256: string,
  reasonCode: BaziCitationApplicabilityObservationPairLifecycleWithholdingReason
): Promise<BaziCitationApplicabilityObservationPairLifecycleWithheldEvent> {
  const eventId = await lifecycleEventId(
    ledgerId,
    targetRecordSha256,
    1,
    "withheld_by_local_user"
  );
  const payload = deepFreeze({
    eventId,
    ledgerId,
    targetRecordSha256,
    sequence: 1 as const,
    kind: "withheld_by_local_user" as const,
    previousEventSha256,
    reasonCode,
    actorBasis: "local_user_unverified" as const
  });
  return deepFreeze({
    ...payload,
    eventSha256: await sha256Hex({
      domain: BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_PROFILE.eventDigestDomain,
      payload
    })
  });
}

async function finalizedSidecar(
  ledgerId: string,
  contextBinding: BaziCitationApplicabilityObservationPairLifecycleSidecar["contextBinding"],
  records: BaziCitationApplicabilityObservationPairLifecycleSidecar["records"]
): Promise<BaziCitationApplicabilityObservationPairLifecycleSidecar> {
  const payload = deepFreeze({
    profile: BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_PROFILE,
    ledgerId,
    contextBinding,
    records,
    boundary: fixedBoundary()
  });
  const sidecar: BaziCitationApplicabilityObservationPairLifecycleSidecar = deepFreeze({
    ...payload,
    integrity: {
      hashAlgorithm: "SHA-256" as const,
      sidecarSha256: await sha256Hex({
        domain: BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_PROFILE.sidecarDigestDomain,
        payload
      }),
      digestIsDigitalSignature: false as const,
      authenticityClaimed: false as const
    }
  });
  return trustSidecar(sidecar);
}

async function initialLifecycleRecord(
  ledgerId: string,
  inspection: BaziCitationApplicabilityObservationFileInspection
): Promise<BaziCitationApplicabilityObservationPairLifecycleRecord> {
  const event = await recordedEvent(ledgerId, inspection.integrity.recordSha256);
  return deepFreeze({
    recordSha256: inspection.integrity.recordSha256,
    envelope: inspection.envelope,
    state: "recorded_current_context_unchecked" as const,
    events: [event] as const,
    chainHeadSha256: event.eventSha256
  });
}

async function createSidecarInternal(
  rawRecordA: unknown,
  rawRecordB: unknown,
  rawCurrentContext: unknown
): Promise<BaziCitationApplicabilityObservationPairLifecycleSidecar> {
  if (typeof rawRecordA !== "string" || typeof rawRecordB !== "string") {
    fail("INVALID_CREATE_INPUT", "双观察生命周期 sidecar 只能从两份文本观察文件创建。");
  }
  const currentContext = await captureBaziCitationApplicabilityObservationCurrentContext(
    rawCurrentContext
  );
  let comparison;
  let inspectionA;
  let inspectionB;
  try {
    [comparison, inspectionA, inspectionB] = await Promise.all([
      compareBaziCitationApplicabilityObservations(rawRecordA, rawRecordB, currentContext),
      inspectBaziCitationApplicabilityObservation(rawRecordA),
      inspectBaziCitationApplicabilityObservation(rawRecordB)
    ]);
  } catch (cause) {
    fail(
      "OBSERVATION_PAIR_INVALID",
      "两份观察没有同时通过同一当前上下文、完整性与自述区分门。",
      { cause }
    );
  }
  const sortedInspections = [inspectionA, inspectionB].sort((left, right) => compareDigest(
    left.integrity.recordSha256,
    right.integrity.recordSha256
  ));
  const firstInspection = sortedInspections[0]!;
  const secondInspection = sortedInspections[1]!;
  if (
    firstInspection.integrity.recordSha256 !== comparison.records[0].recordSha256
    || secondInspection.integrity.recordSha256 !== comparison.records[1].recordSha256
    || !sameCanonical(
      firstInspection.envelope.contextBinding,
      secondInspection.envelope.contextBinding
    )
  ) {
    fail("OBSERVATION_PAIR_INVALID", "双观察比较投影与规范观察记录不一致。");
  }

  const contextBinding = deepFreeze({
    releaseIdentity: {
      dbGeneration: "legacy-v13" as const,
      targetSchema: 13 as const,
      migrationId: null
    },
    contextPayloadSha256: firstInspection.envelope.contextBinding.contextPayloadSha256,
    displayContextBindingSha256: firstInspection.envelope.contextBinding.displayContextBindingSha256,
    recordSetSha256: comparison.integrity.recordSetSha256
  });
  const ledgerId = await lifecycleLedgerId(
    contextBinding.contextPayloadSha256,
    contextBinding.displayContextBindingSha256,
    contextBinding.recordSetSha256
  );
  const [firstRecord, secondRecord] = await Promise.all([
    initialLifecycleRecord(ledgerId, firstInspection),
    initialLifecycleRecord(ledgerId, secondInspection)
  ]);
  const records = deepFreeze([firstRecord, secondRecord]) as readonly [
    BaziCitationApplicabilityObservationPairLifecycleRecord,
    BaziCitationApplicabilityObservationPairLifecycleRecord
  ];
  return finalizedSidecar(ledgerId, contextBinding, records);
}

export async function createBaziCitationApplicabilityObservationPairLifecycleSidecar(
  rawRecordA: unknown,
  rawRecordB: unknown,
  rawCurrentContext: unknown
): Promise<BaziCitationApplicabilityObservationPairLifecycleSidecar> {
  try {
    return await createSidecarInternal(rawRecordA, rawRecordB, rawCurrentContext);
  } catch (cause) {
    if (cause instanceof BaziCitationApplicabilityObservationPairLifecycleError) throw cause;
    throw new BaziCitationApplicabilityObservationPairLifecycleError(
      "OBSERVATION_PAIR_INVALID",
      "双观察生命周期 sidecar 创建失败关闭。",
      { cause }
    );
  }
}

async function parseLifecycleEvent(
  value: unknown,
  subject: string,
  expectedLedgerId: string,
  expectedRecordSha256: string,
  expectedSequence: 0 | 1,
  expectedPreviousEventSha256: string | null
): Promise<BaziCitationApplicabilityObservationPairLifecycleEvent> {
  const event = record(value, subject);
  exactKeys(event, [
    "eventId",
    "eventSha256",
    "ledgerId",
    "targetRecordSha256",
    "sequence",
    "kind",
    "previousEventSha256",
    "reasonCode",
    "actorBasis"
  ], subject, "EVENT_INVALID");
  const eventId = lowercaseSha256Value(event.eventId, `${subject}.eventId`, "EVENT_INVALID");
  const eventSha256 = lowercaseSha256Value(
    event.eventSha256,
    `${subject}.eventSha256`,
    "EVENT_INVALID"
  );
  if (
    event.ledgerId !== expectedLedgerId
    || event.targetRecordSha256 !== expectedRecordSha256
    || event.sequence !== expectedSequence
    || event.actorBasis !== "local_user_unverified"
  ) {
    fail("EVENT_CHAIN_MISMATCH", `${subject} 没有绑定预期 ledger、记录、序号或本机 actor basis。`);
  }

  if (expectedSequence === 0) {
    if (
      event.kind !== "recorded"
      || event.previousEventSha256 !== null
      || event.reasonCode !== null
      || expectedPreviousEventSha256 !== null
    ) {
      fail("EVENT_CHAIN_MISMATCH", `${subject} 不是合法的初始 recorded 事件。`);
    }
    const expectedEventId = await lifecycleEventId(
      expectedLedgerId,
      expectedRecordSha256,
      0,
      "recorded"
    );
    const payload = deepFreeze({
      eventId,
      ledgerId: expectedLedgerId,
      targetRecordSha256: expectedRecordSha256,
      sequence: 0 as const,
      kind: "recorded" as const,
      previousEventSha256: null,
      reasonCode: null,
      actorBasis: "local_user_unverified" as const
    });
    const expectedEventSha256 = await sha256Hex({
      domain: BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_PROFILE.eventDigestDomain,
      payload
    });
    if (eventId !== expectedEventId || eventSha256 !== expectedEventSha256) {
      fail("EVENT_CHAIN_MISMATCH", `${subject} 的确定性 ID 或事件摘要不匹配。`);
    }
    return deepFreeze({ ...payload, eventSha256 });
  }

  if (
    event.kind !== "withheld_by_local_user"
    || typeof event.reasonCode !== "string"
    || !WITHHOLDING_REASON_SET.has(event.reasonCode)
    || event.previousEventSha256 !== expectedPreviousEventSha256
  ) {
    fail("EVENT_CHAIN_MISMATCH", `${subject} 不是合法的终态本机撤下事件。`);
  }
  const previousEventSha256 = lowercaseSha256Value(
    event.previousEventSha256,
    `${subject}.previousEventSha256`,
    "EVENT_CHAIN_MISMATCH"
  );
  const reasonCode = event.reasonCode as BaziCitationApplicabilityObservationPairLifecycleWithholdingReason;
  const expectedEventId = await lifecycleEventId(
    expectedLedgerId,
    expectedRecordSha256,
    1,
    "withheld_by_local_user"
  );
  const payload = deepFreeze({
    eventId,
    ledgerId: expectedLedgerId,
    targetRecordSha256: expectedRecordSha256,
    sequence: 1 as const,
    kind: "withheld_by_local_user" as const,
    previousEventSha256,
    reasonCode,
    actorBasis: "local_user_unverified" as const
  });
  const expectedEventSha256 = await sha256Hex({
    domain: BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_PROFILE.eventDigestDomain,
    payload
  });
  if (eventId !== expectedEventId || eventSha256 !== expectedEventSha256) {
    fail("EVENT_CHAIN_MISMATCH", `${subject} 的确定性 ID 或事件摘要不匹配。`);
  }
  return deepFreeze({ ...payload, eventSha256 });
}

async function parseLifecycleRecord(
  value: unknown,
  index: number,
  expectedLedgerId: string
): Promise<ParsedLifecycleRecord> {
  const subject = `生命周期 sidecar records[${index}]`;
  const rawRecord = record(value, subject);
  exactKeys(rawRecord, [
    "recordSha256",
    "envelope",
    "state",
    "events",
    "chainHeadSha256"
  ], subject, "RECORD_INVALID");
  const recordSha256 = lowercaseSha256Value(
    rawRecord.recordSha256,
    `${subject}.recordSha256`,
    "RECORD_INVALID"
  );
  let inspection: BaziCitationApplicabilityObservationFileInspection;
  try {
    inspection = await inspectBaziCitationApplicabilityObservation(
      canonicalStringify(rawRecord.envelope)
    );
  } catch (cause) {
    fail("RECORD_INVALID", `${subject}.envelope 没有通过独立观察文件检查。`, { cause });
  }
  if (inspection.integrity.recordSha256 !== recordSha256) {
    fail("RECORD_INVALID", `${subject} 的 recordSha256 与规范 envelope 不一致。`);
  }
  if (!inspection.allCitationsObserved || !inspection.reviewerAttributionComplete) {
    fail("RECORD_INCOMPLETE", `${subject} 不是完整自述归属与逐 citation 观察记录。`);
  }
  if (!Array.isArray(rawRecord.events) || rawRecord.events.length < 1 || rawRecord.events.length > 2) {
    fail("EVENT_INVALID", `${subject}.events 必须包含 recorded 与至多一个终态本机撤下事件。`);
  }
  const firstEvent = await parseLifecycleEvent(
    rawRecord.events[0],
    `${subject}.events[0]`,
    expectedLedgerId,
    recordSha256,
    0,
    null
  );
  if (firstEvent.kind !== "recorded") {
    fail("EVENT_CHAIN_MISMATCH", `${subject}.events[0] 必须是 recorded。`);
  }
  let events: BaziCitationApplicabilityObservationPairLifecycleEvents;
  let state: BaziCitationApplicabilityObservationPairLifecycleRecord["state"];
  if (rawRecord.events.length === 1) {
    if (rawRecord.state !== "recorded_current_context_unchecked") {
      fail("EVENT_CHAIN_MISMATCH", `${subject}.state 与单一 recorded 链不一致。`);
    }
    events = deepFreeze([firstEvent]) as readonly [
      BaziCitationApplicabilityObservationPairLifecycleRecordedEvent
    ];
    state = "recorded_current_context_unchecked";
  } else {
    const secondEvent = await parseLifecycleEvent(
      rawRecord.events[1],
      `${subject}.events[1]`,
      expectedLedgerId,
      recordSha256,
      1,
      firstEvent.eventSha256
    );
    if (secondEvent.kind !== "withheld_by_local_user" || rawRecord.state !== "withheld_by_local_user") {
      fail("EVENT_CHAIN_MISMATCH", `${subject}.state 与终态本机撤下链不一致。`);
    }
    events = deepFreeze([firstEvent, secondEvent]) as readonly [
      BaziCitationApplicabilityObservationPairLifecycleRecordedEvent,
      BaziCitationApplicabilityObservationPairLifecycleWithheldEvent
    ];
    state = "withheld_by_local_user";
  }
  const chainHeadSha256 = lowercaseSha256Value(
    rawRecord.chainHeadSha256,
    `${subject}.chainHeadSha256`,
    "EVENT_CHAIN_MISMATCH"
  );
  if (chainHeadSha256 !== events[events.length - 1]!.eventSha256) {
    fail("EVENT_CHAIN_MISMATCH", `${subject}.chainHeadSha256 不是事件链末端摘要。`);
  }
  return deepFreeze({
    record: {
      recordSha256,
      envelope: inspection.envelope,
      state,
      events,
      chainHeadSha256
    },
    inspection
  });
}

async function parseSidecarInternal(
  rawText: unknown
): Promise<BaziCitationApplicabilityObservationPairLifecycleSidecar> {
  if (
    typeof rawText !== "string"
    || rawText.length > MAX_SIDECAR_BYTES
    || new TextEncoder().encode(rawText).byteLength > MAX_SIDECAR_BYTES
  ) {
    fail("INVALID_SIDECAR_TEXT", "双观察生命周期 sidecar 不是文本或超过 2 MiB 上限。");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText.replace(/^\uFEFF/u, "")) as unknown;
  } catch (cause) {
    fail("INVALID_SIDECAR_TEXT", "双观察生命周期 sidecar 不是有效 JSON。", { cause });
  }
  const root = record(
    snapshotDeclarative(parsed, "双观察生命周期 sidecar"),
    "双观察生命周期 sidecar"
  );
  exactKeys(root, [
    "profile",
    "ledgerId",
    "contextBinding",
    "records",
    "boundary",
    "integrity"
  ], "双观察生命周期 sidecar");
  if (!sameCanonical(
    root.profile,
    BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_PROFILE
  )) {
    fail("PROFILE_MISMATCH", "双观察生命周期 sidecar profile 不匹配。");
  }
  const ledgerId = lowercaseSha256Value(root.ledgerId, "sidecar.ledgerId", "LEDGER_ID_MISMATCH");

  const rawContextBinding = record(root.contextBinding, "sidecar.contextBinding");
  exactKeys(rawContextBinding, [
    "releaseIdentity",
    "contextPayloadSha256",
    "displayContextBindingSha256",
    "recordSetSha256"
  ], "sidecar.contextBinding", "CONTEXT_BINDING_MISMATCH");
  const rawReleaseIdentity = record(
    rawContextBinding.releaseIdentity,
    "sidecar.contextBinding.releaseIdentity"
  );
  exactKeys(
    rawReleaseIdentity,
    ["dbGeneration", "targetSchema", "migrationId"],
    "sidecar.contextBinding.releaseIdentity",
    "RELEASE_IDENTITY_MISMATCH"
  );
  if (
    rawReleaseIdentity.dbGeneration !== "legacy-v13"
    || rawReleaseIdentity.targetSchema !== 13
    || rawReleaseIdentity.migrationId !== null
  ) {
    fail(
      "RELEASE_IDENTITY_MISMATCH",
      "生命周期 sidecar 只能绑定 legacy-v13 / targetSchema 13 / migrationId null。"
    );
  }
  const contextPayloadSha256 = lowercaseSha256Value(
    rawContextBinding.contextPayloadSha256,
    "sidecar.contextBinding.contextPayloadSha256",
    "CONTEXT_BINDING_MISMATCH"
  );
  const displayContextBindingSha256 = lowercaseSha256Value(
    rawContextBinding.displayContextBindingSha256,
    "sidecar.contextBinding.displayContextBindingSha256",
    "CONTEXT_BINDING_MISMATCH"
  );
  const suppliedRecordSetSha256 = lowercaseSha256Value(
    rawContextBinding.recordSetSha256,
    "sidecar.contextBinding.recordSetSha256",
    "CONTEXT_BINDING_MISMATCH"
  );

  if (!Array.isArray(root.records) || root.records.length !== 2) {
    fail("RECORD_INVALID", "生命周期 sidecar 必须恰好包含两条观察记录。");
  }
  const parsedRecords = await Promise.all([
    parseLifecycleRecord(root.records[0], 0, ledgerId),
    parseLifecycleRecord(root.records[1], 1, ledgerId)
  ]);
  const first = parsedRecords[0]!;
  const second = parsedRecords[1]!;
  if (first.record.recordSha256 === second.record.recordSha256) {
    fail("DUPLICATE_OBSERVATION_RECORD", "生命周期 sidecar 不能重复同一观察记录。");
  }
  if (compareDigest(first.record.recordSha256, second.record.recordSha256) >= 0) {
    fail("RECORD_ORDER_MISMATCH", "生命周期 sidecar 记录没有按小写摘要码点升序排列。");
  }
  if (!sameCanonical(
    first.record.envelope.contextBinding,
    second.record.envelope.contextBinding
  )) {
    fail("CONTEXT_BINDING_MISMATCH", "生命周期 sidecar 的两条记录没有绑定同一上下文。");
  }
  const firstReviewerId = normalizedDeclaredIdentifier(
    first.record.envelope.reviewer.reviewerId
  );
  const secondReviewerId = normalizedDeclaredIdentifier(
    second.record.envelope.reviewer.reviewerId
  );
  if (firstReviewerId === secondReviewerId) {
    fail(
      "SELF_DECLARED_REVIEWER_COLLISION",
      "生命周期 sidecar 的两个自述 reviewerId 必须不同；这不构成身份或独立性核验。"
    );
  }
  const firstIdentityReference = normalizedDeclaredIdentifier(
    first.record.envelope.reviewer.identityEvidenceReference
  );
  const secondIdentityReference = normalizedDeclaredIdentifier(
    second.record.envelope.reviewer.identityEvidenceReference
  );
  if (
    !firstIdentityReference
    || !secondIdentityReference
    || firstIdentityReference === secondIdentityReference
  ) {
    fail(
      "SELF_DECLARED_IDENTITY_REFERENCE_COLLISION",
      "生命周期 sidecar 的两个自述身份材料引用必须非空且不同；这不构成身份核验。"
    );
  }

  const envelopeContextBinding = first.record.envelope.contextBinding;
  if (
    !sameCanonical(envelopeContextBinding.releaseIdentity, rawReleaseIdentity)
    || envelopeContextBinding.contextPayloadSha256 !== contextPayloadSha256
    || envelopeContextBinding.displayContextBindingSha256 !== displayContextBindingSha256
  ) {
    fail("CONTEXT_BINDING_MISMATCH", "生命周期 sidecar 摘要上下文与嵌入记录不一致。");
  }
  const recordSetSha256 = await sha256Hex({
    domain: BAZI_CITATION_APPLICABILITY_OBSERVATION_COMPARISON_PROFILE.recordSetDigestDomain,
    contextPayloadSha256,
    recordSha256Set: [first.record.recordSha256, second.record.recordSha256]
  });
  if (recordSetSha256 !== suppliedRecordSetSha256) {
    fail("CONTEXT_BINDING_MISMATCH", "生命周期 sidecar 的 record-set 摘要无法复现。");
  }
  const expectedLedgerId = await lifecycleLedgerId(
    contextPayloadSha256,
    displayContextBindingSha256,
    recordSetSha256
  );
  if (ledgerId !== expectedLedgerId) {
    fail("LEDGER_ID_MISMATCH", "生命周期 sidecar 的确定性 ledgerId 无法复现。");
  }

  const boundary = record(root.boundary, "sidecar.boundary");
  const expectedBoundary = fixedBoundary();
  exactKeys(boundary, Object.keys(expectedBoundary), "sidecar.boundary", "BOUNDARY_MISMATCH");
  if (!sameCanonical(boundary, expectedBoundary)) {
    fail("BOUNDARY_MISMATCH", "生命周期 sidecar 不得提升身份、撤回权、真值、写入或发布权限。");
  }

  const integrity = record(root.integrity, "sidecar.integrity");
  exactKeys(integrity, [
    "hashAlgorithm",
    "sidecarSha256",
    "digestIsDigitalSignature",
    "authenticityClaimed"
  ], "sidecar.integrity", "INTEGRITY_MISMATCH");
  const suppliedSidecarSha256 = lowercaseSha256Value(
    integrity.sidecarSha256,
    "sidecar.integrity.sidecarSha256",
    "INTEGRITY_MISMATCH"
  );
  if (
    integrity.hashAlgorithm !== "SHA-256"
    || integrity.digestIsDigitalSignature !== false
    || integrity.authenticityClaimed !== false
  ) {
    fail("INTEGRITY_MISMATCH", "生命周期 sidecar 完整性边界不匹配。");
  }
  const contextBinding = deepFreeze({
    releaseIdentity: {
      dbGeneration: "legacy-v13" as const,
      targetSchema: 13 as const,
      migrationId: null
    },
    contextPayloadSha256,
    displayContextBindingSha256,
    recordSetSha256
  });
  const records = deepFreeze([first.record, second.record]) as readonly [
    BaziCitationApplicabilityObservationPairLifecycleRecord,
    BaziCitationApplicabilityObservationPairLifecycleRecord
  ];
  const payload = deepFreeze({
    profile: BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_PROFILE,
    ledgerId,
    contextBinding,
    records,
    boundary: expectedBoundary
  });
  const expectedSidecarSha256 = await sha256Hex({
    domain: BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_PROFILE.sidecarDigestDomain,
    payload
  });
  if (suppliedSidecarSha256 !== expectedSidecarSha256) {
    fail("INTEGRITY_MISMATCH", "生命周期 sidecar 摘要无法从规范载荷复现。");
  }
  const sidecar: BaziCitationApplicabilityObservationPairLifecycleSidecar = deepFreeze({
    ...payload,
    integrity: {
      hashAlgorithm: "SHA-256" as const,
      sidecarSha256: expectedSidecarSha256,
      digestIsDigitalSignature: false as const,
      authenticityClaimed: false as const
    }
  });
  return trustSidecar(sidecar);
}

export async function inspectBaziCitationApplicabilityObservationPairLifecycleSidecar(
  rawText: unknown
): Promise<BaziCitationApplicabilityObservationPairLifecycleInspection> {
  try {
    const sidecar = await parseSidecarInternal(rawText);
    const withheldRecordCount = sidecar.records.filter(
      (recordItem) => recordItem.state === "withheld_by_local_user"
    ).length as 0 | 1 | 2;
    const recordedNotWithheldCount = (2 - withheldRecordCount) as 0 | 1 | 2;
    return deepFreeze({
      sidecar,
      recordedNotWithheldCount,
      withheldRecordCount,
      structurallyCompletePair: true as const,
      pairComparisonAllowed: false as const,
      currentContextChecked: false as const,
      reviewerIdentityVerified: false as const,
      reviewerIndependenceVerified: false as const,
      reviewerWithdrawalAuthorityVerified: false as const,
      formalActivationAllowed: false as const,
      automaticPromotionAllowed: false as const,
      storageMutationPerformed: false as const,
      mutationEpochBypassed: false as const,
      publicExportAuthorized: false as const,
      publicReleaseAuthorized: false as const,
      expertTruthClaimed: false as const,
      scientificValidityClaimed: false as const
    });
  } catch (cause) {
    if (cause instanceof BaziCitationApplicabilityObservationPairLifecycleError) throw cause;
    throw new BaziCitationApplicabilityObservationPairLifecycleError(
      "INVALID_SIDECAR_TEXT",
      "双观察生命周期 sidecar 独立检查失败关闭。",
      { cause }
    );
  }
}

export async function evaluateBaziCitationApplicabilityObservationPairLifecycleSidecar(
  rawSidecarText: unknown,
  rawCurrentContext: unknown
): Promise<BaziCitationApplicabilityObservationPairLifecycleEvaluation> {
  const inspection = await inspectBaziCitationApplicabilityObservationPairLifecycleSidecar(
    rawSidecarText
  );
  const withheldRecordSha256s = inspection.sidecar.records
    .filter((recordItem) => recordItem.state === "withheld_by_local_user")
    .map((recordItem) => recordItem.recordSha256);
  if (withheldRecordSha256s.length > 0) {
    return deepFreeze({
      status: "withheld_by_local_user" as const,
      sidecar: inspection.sidecar,
      mechanicalComparisonEligibleUnderSuppliedContextSnapshot: false as const,
      currentContextCheckAttempted: false as const,
      currentContextCheckCompleted: false as const,
      currentContextDigestMatched: false as const,
      withheldRecordSha256s: Object.freeze(withheldRecordSha256s),
      boundary: fixedEvaluationBoundary()
    });
  }

  let currentContext: Awaited<ReturnType<
    typeof captureBaziCitationApplicabilityObservationCurrentContext
  >>;
  try {
    currentContext = await captureBaziCitationApplicabilityObservationCurrentContext(
      rawCurrentContext
    );
  } catch {
    return deepFreeze({
      status: "supplied_context_mismatch_or_unverifiable" as const,
      sidecar: inspection.sidecar,
      mechanicalComparisonEligibleUnderSuppliedContextSnapshot: false as const,
      currentContextCheckAttempted: true as const,
      currentContextCheckCompleted: false,
      currentContextDigestMatched: false as const,
      boundary: fixedEvaluationBoundary()
    });
  }
  try {
    await Promise.all(inspection.sidecar.records.map((recordItem) => (
      preflightBaziCitationApplicabilityObservation(
        canonicalStringify(recordItem.envelope),
        currentContext
      )
    )));
  } catch {
    return deepFreeze({
      status: "supplied_context_mismatch_or_unverifiable" as const,
      sidecar: inspection.sidecar,
      mechanicalComparisonEligibleUnderSuppliedContextSnapshot: false as const,
      currentContextCheckAttempted: true as const,
      currentContextCheckCompleted: true,
      currentContextDigestMatched: false as const,
      boundary: fixedEvaluationBoundary()
    });
  }
  return deepFreeze({
    status: "supplied_context_snapshot_matched_read_only" as const,
    sidecar: inspection.sidecar,
    mechanicalComparisonEligibleUnderSuppliedContextSnapshot: true as const,
    currentContextCheckAttempted: true as const,
    currentContextCheckCompleted: true as const,
    currentContextDigestMatched: true as const,
    boundary: fixedEvaluationBoundary()
  });
}

export async function withholdBaziCitationApplicabilityObservationPairLifecycleRecord(
  rawSidecarText: unknown,
  targetRecordSha256: unknown,
  reasonCode: unknown
): Promise<BaziCitationApplicabilityObservationPairLifecycleSidecar> {
  try {
    if (
      typeof targetRecordSha256 !== "string"
      || !LOWERCASE_SHA256.test(targetRecordSha256)
      || typeof reasonCode !== "string"
      || !WITHHOLDING_REASON_SET.has(reasonCode)
    ) {
      fail("INVALID_WITHHOLDING_REQUEST", "本机撤下目标摘要或有限理由码无效。");
    }
    const inspection = await inspectBaziCitationApplicabilityObservationPairLifecycleSidecar(
      rawSidecarText
    );
    const targetIndex = inspection.sidecar.records.findIndex(
      (recordItem) => recordItem.recordSha256 === targetRecordSha256
    );
    if (targetIndex < 0) {
      fail("WITHHOLDING_TARGET_MISSING", "本机撤下目标不在该双观察 sidecar 中。");
    }
    const target = inspection.sidecar.records[targetIndex]!;
    if (target.state === "withheld_by_local_user") {
      fail("RECORD_ALREADY_WITHHELD", "该观察记录已经处于终态本机撤下状态，不得恢复或覆盖理由。");
    }
    const firstEvent = target.events[0];
    const secondEvent = await withheldEvent(
      inspection.sidecar.ledgerId,
      target.recordSha256,
      firstEvent.eventSha256,
      reasonCode as BaziCitationApplicabilityObservationPairLifecycleWithholdingReason
    );
    const successorRecords = inspection.sidecar.records.map((recordItem, index) => {
      if (index !== targetIndex) return recordItem;
      return deepFreeze({
        recordSha256: recordItem.recordSha256,
        envelope: recordItem.envelope,
        state: "withheld_by_local_user" as const,
        events: deepFreeze([firstEvent, secondEvent]) as readonly [
          BaziCitationApplicabilityObservationPairLifecycleRecordedEvent,
          BaziCitationApplicabilityObservationPairLifecycleWithheldEvent
        ],
        chainHeadSha256: secondEvent.eventSha256
      });
    }) as [
      BaziCitationApplicabilityObservationPairLifecycleRecord,
      BaziCitationApplicabilityObservationPairLifecycleRecord
    ];
    const records = deepFreeze(successorRecords) as readonly [
      BaziCitationApplicabilityObservationPairLifecycleRecord,
      BaziCitationApplicabilityObservationPairLifecycleRecord
    ];
    return finalizedSidecar(
      inspection.sidecar.ledgerId,
      inspection.sidecar.contextBinding,
      records
    );
  } catch (cause) {
    if (cause instanceof BaziCitationApplicabilityObservationPairLifecycleError) throw cause;
    throw new BaziCitationApplicabilityObservationPairLifecycleError(
      "INVALID_WITHHOLDING_REQUEST",
      "双观察生命周期本机撤下失败关闭。",
      { cause }
    );
  }
}

function captureReconciliationTexts(rawSidecarTexts: unknown): readonly string[] {
  if (
    !Array.isArray(rawSidecarTexts)
    || Object.getPrototypeOf(rawSidecarTexts) !== Array.prototype
    || rawSidecarTexts.length < 1
    || rawSidecarTexts.length > MAX_RECONCILIATION_FILES
  ) {
    fail(
      "INVALID_RECONCILIATION_INPUT",
      `生命周期 reconciliation 必须接收 1 至 ${MAX_RECONCILIATION_FILES} 份普通 sidecar 文本数组。`
    );
  }
  const ownKeys = Reflect.ownKeys(rawSidecarTexts);
  if (
    ownKeys.some((key) => typeof key !== "string")
    || ownKeys.length !== rawSidecarTexts.length + 1
    || !ownKeys.includes("length")
  ) {
    fail("INVALID_RECONCILIATION_INPUT", "生命周期 reconciliation 文本数组稀疏或含附加字段。");
  }
  const descriptors = Object.getOwnPropertyDescriptors(rawSidecarTexts);
  const result: string[] = [];
  let totalTextCharacters = 0;
  for (let index = 0; index < rawSidecarTexts.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (
      !descriptor
      || !("value" in descriptor)
      || descriptor.enumerable !== true
      || typeof descriptor.value !== "string"
    ) {
      fail("INVALID_RECONCILIATION_INPUT", `reconciliation[${index}] 必须是自有可枚举文本项。`);
    }
    totalTextCharacters += descriptor.value.length;
    if (totalTextCharacters > MAX_RECONCILIATION_TEXT_CHARACTERS) {
      fail("INVALID_RECONCILIATION_INPUT", "生命周期 reconciliation 文本总量超过 8 MiB code-unit 上限。");
    }
    result.push(descriptor.value);
  }
  return Object.freeze(result);
}

export async function reconcileBaziCitationApplicabilityObservationPairLifecycleSidecars(
  rawSidecarTexts: unknown
): Promise<BaziCitationApplicabilityObservationPairLifecycleSidecar> {
  try {
    const texts = captureReconciliationTexts(rawSidecarTexts);
    const inspections = await Promise.all(texts.map((text) => (
      inspectBaziCitationApplicabilityObservationPairLifecycleSidecar(text)
    )));
    const baseline = inspections[0]!.sidecar;
    const selectedRecords: [
      BaziCitationApplicabilityObservationPairLifecycleRecord,
      BaziCitationApplicabilityObservationPairLifecycleRecord
    ] = [baseline.records[0], baseline.records[1]];

    for (const inspection of inspections.slice(1)) {
      const candidateSidecar = inspection.sidecar;
      if (
        candidateSidecar.ledgerId !== baseline.ledgerId
        || !sameCanonical(candidateSidecar.contextBinding, baseline.contextBinding)
      ) {
        fail("LIFECYCLE_LEDGER_MISMATCH", "reconciliation 输入不属于同一确定性 lifecycle ledger。");
      }
      for (let recordIndex = 0; recordIndex < 2; recordIndex += 1) {
        const selected = selectedRecords[recordIndex]!;
        const candidate = candidateSidecar.records[recordIndex]!;
        if (
          candidate.recordSha256 !== selected.recordSha256
          || !sameCanonical(candidate.envelope, selected.envelope)
        ) {
          fail("LIFECYCLE_LEDGER_MISMATCH", "reconciliation 输入的规范记录集合不一致。");
        }
        const sharedLength = Math.min(selected.events.length, candidate.events.length);
        for (let eventIndex = 0; eventIndex < sharedLength; eventIndex += 1) {
          const selectedEvent = selected.events[eventIndex]!;
          const candidateEvent = candidate.events[eventIndex]!;
          if (
            selectedEvent.eventId !== candidateEvent.eventId
            || selectedEvent.eventSha256 !== candidateEvent.eventSha256
          ) {
            fail(
              "EVENT_FORK_DETECTED",
              "同一 ledger、记录与事件序号出现不同事件摘要；不得按时间、输入顺序或多数选择。"
            );
          }
        }
        if (candidate.events.length > selected.events.length) {
          selectedRecords[recordIndex] = candidate;
        }
      }
    }
    const records = deepFreeze(selectedRecords) as readonly [
      BaziCitationApplicabilityObservationPairLifecycleRecord,
      BaziCitationApplicabilityObservationPairLifecycleRecord
    ];
    return finalizedSidecar(baseline.ledgerId, baseline.contextBinding, records);
  } catch (cause) {
    if (cause instanceof BaziCitationApplicabilityObservationPairLifecycleError) throw cause;
    throw new BaziCitationApplicabilityObservationPairLifecycleError(
      "INVALID_RECONCILIATION_INPUT",
      "双观察生命周期 sidecar reconciliation 失败关闭。",
      { cause }
    );
  }
}

export function serializeBaziCitationApplicabilityObservationPairLifecycleSidecar(
  sidecar: unknown
): string {
  if (
    sidecar === null
    || typeof sidecar !== "object"
    || !trustedLifecycleSidecars.has(sidecar)
  ) {
    fail(
      "INVALID_SIDECAR_TEXT",
      "只允许序列化由本模块创建、检查、撤下或 reconciliation 返回的可信不可变 sidecar。"
    );
  }
  return `${canonicalStringify(sidecar)}\n`;
}
