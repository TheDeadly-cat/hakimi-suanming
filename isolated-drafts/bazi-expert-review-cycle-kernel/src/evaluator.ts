import {
  BAZI_COLLECTION_START_BLOCKER_IDS,
  BAZI_EXPERT_REVIEW_BUNDLE_MANIFEST_CANDIDATE_VERSION,
  BAZI_EXPERT_REVIEW_CYCLE_FAILURE_RESPONSE_SCHEMA_VERSION,
  BAZI_REVIEW_AUTHORITY_NONE,
  BAZI_REVIEW_BUNDLE_MANIFEST_CANDIDATE_DIGEST_DOMAIN,
  BAZI_REVIEW_BUNDLE_MANIFEST_COMPONENT_IDS,
  BAZI_REVIEW_BUNDLE_MANIFEST_REQUIRED_CARDINALITIES,
  BAZI_REVIEW_CYCLE_FAILURE_RESPONSE_DIGEST_DOMAIN,
  BAZI_REVIEW_CYCLE_STATE_IDS,
  BAZI_REVIEW_CYCLE_TRANSITION_IDS,
  type BaziReviewBundleManifestCandidate,
  type BaziReviewBundleManifestComponentId,
  type BaziReviewBundleManifestPreflightReport,
  type BaziReviewCycleOperationContext,
  type BaziReviewCycleStateId,
  type BaziReviewCycleStateSnapshot,
  type BaziReviewCycleTransitionRejection,
  type BaziReviewCycleTransitionRequest
} from "./protocol.ts";
import {
  assertArray,
  assertBoolean,
  assertExactObjectKeys,
  assertNonNegativeSafeInteger,
  assertString,
  captureKernelJson,
  deepFreeze,
  domainSeparatedDigest,
  type KernelJsonObject,
  type KernelJsonValue
} from "./canonical.ts";

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const REVIEW_CYCLE_ID_PATTERN = /^bazi-review-cycle\/[a-f0-9]{64}$/u;
const MANIFEST_ID_PATTERN = /^bazi-review-bundle-manifest\/[a-f0-9]{64}$/u;
const LEDGER_GENERATION_ID_PATTERN = /^bazi-review-ledger-generation\/[a-f0-9]{64}$/u;
const OPERATION_ID_PATTERN = /^bazi-review-operation\/[a-f0-9]{64}$/u;
const IDEMPOTENCY_KEY_PATTERN = /^bazi-review-idempotency\/[a-f0-9]{64}$/u;
const OPERATION_NONCE_PATTERN = /^bazi-review-operation-nonce\/[a-f0-9]{64}$/u;
const TRANSITION_ID_PATTERN = /^[a-z][a-z0-9_]{0,95}$/u;
const SAFE_EPOCH_CEILING = Number.MAX_SAFE_INTEGER - 1;
const ARRAY_INCLUDES = Function.call.bind(Array.prototype.includes) as (
  values: readonly unknown[],
  candidate: unknown
) => boolean;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_KEYS = Object.keys;
const REGEXP_TEST = Function.call.bind(RegExp.prototype.test) as (
  pattern: RegExp,
  value: string
) => boolean;
const CROSS_PHASE_LIFECYCLE_EVENT_IDS = OBJECT_FREEZE([
  "record_correction",
  "record_withdrawal",
  "record_credential_revocation",
  "invalidate_for_artifact_drift"
] as const);

const EXPECTED_FROM_STATE = OBJECT_FREEZE({
  request_collection_start: "prerequisites_blocked",
  record_owner_intake_authorization: "owner_intake_authorization_pending",
  record_authority_verification: "authority_verification_pending",
  record_pairwise_independence: "independence_pending",
  record_blind_opinion_a: "blind_opinions_pending",
  record_blind_opinion_b: "blind_opinions_pending",
  seal_original_opinions: "blind_opinions_pending",
  record_disagreement_inventory: "disagreement_inventory_pending",
  record_reconciliation: "reconciliation_pending",
  seal_expert_review_bundle: "reconciliation_pending",
} as const satisfies Readonly<Record<string, BaziReviewCycleStateId>>);

function appendOwnArrayValue<T>(target: T[], value: T): void {
  OBJECT_DEFINE_PROPERTY(target, target.length, {
    configurable: true,
    enumerable: true,
    value,
    writable: true
  });
}

function requirePattern(value: string, pattern: RegExp, path: string): string {
  if (!REGEXP_TEST(pattern, value)) throw new Error(`${path} 格式无效。`);
  return value;
}

function parseSha(value: KernelJsonValue, path: string): string {
  assertString(value, path);
  return requirePattern(value, SHA256_PATTERN, path);
}

function parseState(value: KernelJsonValue): BaziReviewCycleStateSnapshot {
  assertExactObjectKeys(value, [
    "chainHeadDigest",
    "consumedNonceSetHeadDigest",
    "credentialRevocationHeadDigest",
    "reviewCycleEpoch",
    "stateDigest",
    "stateId"
  ], "request.currentState");
  assertString(value.stateId!, "request.currentState.stateId");
  if (!ARRAY_INCLUDES(BAZI_REVIEW_CYCLE_STATE_IDS, value.stateId)) {
    throw new Error("request.currentState.stateId 未知。");
  }
  assertNonNegativeSafeInteger(value.reviewCycleEpoch!, "request.currentState.reviewCycleEpoch");
  return OBJECT_FREEZE({
    chainHeadDigest: parseSha(value.chainHeadDigest!, "request.currentState.chainHeadDigest"),
    consumedNonceSetHeadDigest: parseSha(
      value.consumedNonceSetHeadDigest!,
      "request.currentState.consumedNonceSetHeadDigest"
    ),
    credentialRevocationHeadDigest: parseSha(
      value.credentialRevocationHeadDigest!,
      "request.currentState.credentialRevocationHeadDigest"
    ),
    reviewCycleEpoch: value.reviewCycleEpoch,
    stateDigest: parseSha(value.stateDigest!, "request.currentState.stateDigest"),
    stateId: value.stateId as BaziReviewCycleStateId
  });
}

function parseOperation(value: KernelJsonValue): BaziReviewCycleOperationContext {
  assertExactObjectKeys(value, [
    "generationScopedOperationNonce",
    "idempotencyKey",
    "idempotencyKeyPreviouslyObserved",
    "ledgerGenerationId",
    "operationId",
    "operationIdPreviouslyObserved",
    "operationNoncePreviouslyConsumed"
  ], "request.operation");
  const stringKeys = [
    "generationScopedOperationNonce",
    "idempotencyKey",
    "ledgerGenerationId",
    "operationId"
  ] as const;
  for (let index = 0; index < stringKeys.length; index += 1) {
    const key = stringKeys[index]!;
    assertString(value[key]!, `request.operation.${key}`);
  }
  const booleanKeys = [
    "idempotencyKeyPreviouslyObserved",
    "operationIdPreviouslyObserved",
    "operationNoncePreviouslyConsumed"
  ] as const;
  for (let index = 0; index < booleanKeys.length; index += 1) {
    const key = booleanKeys[index]!;
    assertBoolean(value[key]!, `request.operation.${key}`);
  }
  return OBJECT_FREEZE({
    generationScopedOperationNonce: requirePattern(
      value.generationScopedOperationNonce as string,
      OPERATION_NONCE_PATTERN,
      "request.operation.generationScopedOperationNonce"
    ),
    idempotencyKey: requirePattern(
      value.idempotencyKey as string,
      IDEMPOTENCY_KEY_PATTERN,
      "request.operation.idempotencyKey"
    ),
    idempotencyKeyPreviouslyObserved: value.idempotencyKeyPreviouslyObserved as boolean,
    ledgerGenerationId: requirePattern(
      value.ledgerGenerationId as string,
      LEDGER_GENERATION_ID_PATTERN,
      "request.operation.ledgerGenerationId"
    ),
    operationId: requirePattern(
      value.operationId as string,
      OPERATION_ID_PATTERN,
      "request.operation.operationId"
    ),
    operationIdPreviouslyObserved: value.operationIdPreviouslyObserved as boolean,
    operationNoncePreviouslyConsumed: value.operationNoncePreviouslyConsumed as boolean
  });
}

function parseRequest(input: unknown): BaziReviewCycleTransitionRequest {
  const captured = captureKernelJson(input, "request");
  assertExactObjectKeys(captured, ["currentState", "operation", "transitionId"], "request");
  assertString(captured.transitionId!, "request.transitionId");
  requirePattern(captured.transitionId, TRANSITION_ID_PATTERN, "request.transitionId");
  return OBJECT_FREEZE({
    currentState: parseState(captured.currentState!),
    operation: parseOperation(captured.operation!),
    transitionId: captured.transitionId
  });
}

type RejectionFields = Readonly<{
  code: BaziReviewCycleTransitionRejection["rejectionCode"];
  failedGuardIds: readonly string[];
}>;

function classifyRejection(request: BaziReviewCycleTransitionRequest): RejectionFields {
  const { currentState, operation, transitionId } = request;
  if (currentState.reviewCycleEpoch > SAFE_EPOCH_CEILING) {
    return OBJECT_FREEZE({
      code: "EPOCH_INVALID",
      failedGuardIds: OBJECT_FREEZE(["review_cycle_epoch_safe_increment_unavailable"])
    });
  }
  const replayGuards: string[] = [];
  if (operation.operationIdPreviouslyObserved) {
    appendOwnArrayValue(replayGuards, "operation_id_not_previously_observed");
  }
  if (operation.idempotencyKeyPreviouslyObserved) {
    appendOwnArrayValue(replayGuards, "idempotency_key_not_previously_observed");
  }
  if (operation.operationNoncePreviouslyConsumed) {
    appendOwnArrayValue(replayGuards, "generation_scoped_nonce_not_previously_consumed");
  }
  if (replayGuards.length > 0) {
    return OBJECT_FREEZE({
      code: "REPLAY_OR_IDEMPOTENCY_CONFLICT",
      failedGuardIds: OBJECT_FREEZE(replayGuards)
    });
  }
  if (!ARRAY_INCLUDES(BAZI_REVIEW_CYCLE_TRANSITION_IDS, transitionId)) {
    return OBJECT_FREEZE({
      code: "UNKNOWN_TRANSITION",
      failedGuardIds: OBJECT_FREEZE(["recognized_transition_id"])
    });
  }
  if (ARRAY_INCLUDES(CROSS_PHASE_LIFECYCLE_EVENT_IDS, transitionId)) {
    return OBJECT_FREEZE({
      code: "TRANSITION_NOT_IMPLEMENTED",
      failedGuardIds: OBJECT_FREEZE([
        "cross_phase_lifecycle_event_scope_not_owner_accepted_or_implemented"
      ])
    });
  }
  const expected = EXPECTED_FROM_STATE[transitionId as keyof typeof EXPECTED_FROM_STATE];
  if (currentState.stateId !== expected) {
    return OBJECT_FREEZE({
      code: "FROM_STATE_MISMATCH",
      failedGuardIds: OBJECT_FREEZE([`from_state_${expected}`])
    });
  }
  if (transitionId === "request_collection_start") {
    return OBJECT_FREEZE({
      code: "COLLECTION_START_BLOCKED",
      failedGuardIds: BAZI_COLLECTION_START_BLOCKER_IDS
    });
  }
  return OBJECT_FREEZE({
    code: "TRANSITION_NOT_IMPLEMENTED",
    failedGuardIds: OBJECT_FREEZE([
      "positive_transition_not_implemented_in_zero_instance_authority_none_draft"
    ])
  });
}

export function evaluateBaziExpertReviewCycleTransition(
  input: unknown
): BaziReviewCycleTransitionRejection {
  const request = parseRequest(input);
  const rejection = classifyRejection(request);
  const responseWithoutDigest = {
    acceptedReceipt: false,
    afterReviewCycleEpoch: request.currentState.reviewCycleEpoch,
    attemptedTransitionId:
      rejection.code === "UNKNOWN_TRANSITION" ? "unrecognized_transition" : request.transitionId,
    authorityBoundary: BAZI_REVIEW_AUTHORITY_NONE,
    authorityEffect: "none",
    beforeReviewCycleEpoch: request.currentState.reviewCycleEpoch,
    commitObserved: false,
    failedGuardIds: rejection.failedGuardIds,
    generationScopedOperationNonce: request.operation.generationScopedOperationNonce,
    idempotencyKey: request.operation.idempotencyKey,
    ledgerGenerationId: request.operation.ledgerGenerationId,
    nextChainHeadDigest: request.currentState.chainHeadDigest,
    nextConsumedNonceSetHeadDigest: request.currentState.consumedNonceSetHeadDigest,
    nextCredentialRevocationHeadDigest: request.currentState.credentialRevocationHeadDigest,
    nextStateDigest: request.currentState.stateDigest,
    nonceConsumed: false,
    operationId: request.operation.operationId,
    outcome: "transition_failure_response",
    previousChainHeadDigest: request.currentState.chainHeadDigest,
    previousConsumedNonceSetHeadDigest: request.currentState.consumedNonceSetHeadDigest,
    previousCredentialRevocationHeadDigest: request.currentState.credentialRevocationHeadDigest,
    previousStateDigest: request.currentState.stateDigest,
    failureResponseDigestDomain: BAZI_REVIEW_CYCLE_FAILURE_RESPONSE_DIGEST_DOMAIN,
    failureResponseSchemaVersion: BAZI_EXPERT_REVIEW_CYCLE_FAILURE_RESPONSE_SCHEMA_VERSION,
    personDataPresenceAssessed: false,
    personDerivedDigestExcluded: false,
    rejectionCode: rejection.code,
    reviewCycleEpochIsSchema13MutationEpoch: false,
    safeToPublish: false,
    schema13MutationEpochAvailable: false,
    stateAfter: request.currentState.stateId,
    stateBefore: request.currentState.stateId
  } as const;
  return deepFreeze({
    ...responseWithoutDigest,
    failureResponseDigest: domainSeparatedDigest(
      BAZI_REVIEW_CYCLE_FAILURE_RESPONSE_DIGEST_DOMAIN,
      responseWithoutDigest
    )
  });
}

function parseManifestCandidate(input: unknown): BaziReviewBundleManifestCandidate {
  const captured = captureKernelJson(input, "manifestCandidate");
  assertExactObjectKeys(captured, [
    "componentReceiptRefs",
    "credentialRevocationHeadDigest",
    "historicalPacketId",
    "manifestId",
    "reviewCycleId",
    "schemaVersion"
  ], "manifestCandidate");
  const stringKeys = ["historicalPacketId", "manifestId", "reviewCycleId", "schemaVersion"] as const;
  for (let index = 0; index < stringKeys.length; index += 1) {
    const key = stringKeys[index]!;
    assertString(captured[key]!, `manifestCandidate.${key}`);
  }
  if (captured.schemaVersion !== BAZI_EXPERT_REVIEW_BUNDLE_MANIFEST_CANDIDATE_VERSION) {
    throw new Error("manifestCandidate.schemaVersion 不匹配。");
  }
  if (captured.historicalPacketId !== "hakimi.bazi.strength.expert-review-packet/1.5.0") {
    throw new Error("manifestCandidate.historicalPacketId 不匹配。");
  }
  requirePattern(captured.manifestId as string, MANIFEST_ID_PATTERN, "manifestCandidate.manifestId");
  requirePattern(captured.reviewCycleId as string, REVIEW_CYCLE_ID_PATTERN, "manifestCandidate.reviewCycleId");
  const credentialRevocationHeadDigest = parseSha(
    captured.credentialRevocationHeadDigest!,
    "manifestCandidate.credentialRevocationHeadDigest"
  );
  const refsValue = captured.componentReceiptRefs!;
  assertExactObjectKeys(
    refsValue,
    BAZI_REVIEW_BUNDLE_MANIFEST_COMPONENT_IDS,
    "manifestCandidate.componentReceiptRefs"
  );
  const refs = OBJECT_CREATE(null) as Record<BaziReviewBundleManifestComponentId, readonly never[]>;
  for (let index = 0; index < BAZI_REVIEW_BUNDLE_MANIFEST_COMPONENT_IDS.length; index += 1) {
    const componentId = BAZI_REVIEW_BUNDLE_MANIFEST_COMPONENT_IDS[index]!;
    const value = refsValue[componentId]!;
    assertArray(value, `manifestCandidate.componentReceiptRefs.${componentId}`);
    if (value.length !== 0) {
      throw new Error(`manifestCandidate.componentReceiptRefs.${componentId} 仅接受零实例空数组。`);
    }
    refs[componentId] = OBJECT_FREEZE([]) as readonly never[];
  }
  return deepFreeze({
    componentReceiptRefs: refs,
    credentialRevocationHeadDigest,
    historicalPacketId: "hakimi.bazi.strength.expert-review-packet/1.5.0",
    manifestId: captured.manifestId as string,
    reviewCycleId: captured.reviewCycleId as string,
    schemaVersion: BAZI_EXPERT_REVIEW_BUNDLE_MANIFEST_CANDIDATE_VERSION
  });
}

export function inspectBaziExpertReviewBundleManifestCandidate(
  input: unknown
): BaziReviewBundleManifestPreflightReport {
  const candidate = parseManifestCandidate(input);
  const componentCounts = OBJECT_CREATE(null) as Record<BaziReviewBundleManifestComponentId, 0>;
  for (let index = 0; index < BAZI_REVIEW_BUNDLE_MANIFEST_COMPONENT_IDS.length; index += 1) {
    const componentId = BAZI_REVIEW_BUNDLE_MANIFEST_COMPONENT_IDS[index]!;
    componentCounts[componentId] = 0;
  }
  const missingRequiredComponentIds = OBJECT_KEYS(
    BAZI_REVIEW_BUNDLE_MANIFEST_REQUIRED_CARDINALITIES
  ) as (keyof typeof BAZI_REVIEW_BUNDLE_MANIFEST_REQUIRED_CARDINALITIES)[];
  return deepFreeze({
    acceptedReceipt: false,
    authorityBoundary: BAZI_REVIEW_AUTHORITY_NONE,
    authorityEffect: "none",
    canAdvanceState: false,
    candidateDigest: domainSeparatedDigest(
      BAZI_REVIEW_BUNDLE_MANIFEST_CANDIDATE_DIGEST_DOMAIN,
      candidate
    ),
    candidateDigestDomain: BAZI_REVIEW_BUNDLE_MANIFEST_CANDIDATE_DIGEST_DOMAIN,
    candidateOnly: true,
    componentCounts,
    exactZeroInstanceShapeVerified: true,
    firstSeenAndCustodyVerified: false,
    formalManifestInstanceCreated: false,
    manifestComplete: false,
    missingRequiredComponentIds,
    originalOpinionBytesVerified: false,
    personDataPresenceAssessed: false,
    personDerivedDigestExcluded: false,
    positiveManifestInputsAccepted: false,
    reviewCycleEpochIsSchema13MutationEpoch: false,
    schema13MutationEpochAvailable: false,
    safeToPublish: false,
    signaturesVerified: false
  });
}
