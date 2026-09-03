import {
  VEDIC_AUTHORITY_NONE,
  VEDIC_FROZEN_PACKET_CANDIDATE_SCHEMA_VERSION,
  VEDIC_PACKET_DIGEST_DOMAIN,
  VEDIC_PRE_SNAPSHOT_CANDIDATE_DIGEST_DOMAIN,
  VEDIC_PRE_SNAPSHOT_DECLARED_DIGEST_DOMAIN,
  VEDIC_PRE_SNAPSHOT_DEFINED_RECEIPT_CARDINALITIES,
  VEDIC_PRE_SNAPSHOT_EXCLUDED_OUTPUT_RECEIPT_KINDS,
  VEDIC_PRE_SNAPSHOT_INCLUDED_RECEIPT_KINDS,
  VEDIC_PRE_SNAPSHOT_MANIFEST_CANDIDATE_SCHEMA_VERSION,
  VEDIC_PRE_SNAPSHOT_MANIFEST_GUARD_IDS,
  VEDIC_PRE_SNAPSHOT_MANIFEST_ID,
  VEDIC_STATE_IDS,
  VEDIC_TRANSITION_IDS,
  VEDIC_TRANSITION_REJECTION_SCHEMA_VERSION,
  type Sha256Hex,
  type VedicFrozenPacketTransitionCandidate,
  type VedicGovernancePacket,
  type VedicKernelOperationContext,
  type VedicKernelStateSnapshot,
  type VedicKernelTransitionRequest,
  type VedicKernelTransitionResult,
  type VedicPreSnapshotEvidenceManifestCandidate,
  type VedicPreSnapshotIncludedReceiptKind,
  type VedicPreSnapshotManifestPreflightReport,
  type VedicPreSnapshotReceiptReferenceCandidate,
  type VedicPreSnapshotRevocationObservationCandidate,
  type VedicStateId,
  type VedicTransitionRejectionReceipt
} from "./protocol.ts";
import {
  VedicFrozenPacketError,
  captureKernelJson,
  domainSeparatedDigest,
  parseCanonicalVedicGovernancePacket,
  type KernelJsonObject,
  type KernelJsonValue
} from "./frozen-packet-schema.ts";

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const TRANSITION_ID_PATTERN = /^[a-z][a-z0-9_]{0,95}$/u;
const LEDGER_GENERATION_ID_PATTERN = /^vedic-ledger-generation\/[a-f0-9]{64}$/u;
const OPERATION_ID_PATTERN = /^vedic-operation\/[a-f0-9]{64}$/u;
const IDEMPOTENCY_KEY_PATTERN = /^vedic-idempotency\/[a-f0-9]{64}$/u;
const OPERATION_NONCE_PATTERN = /^vedic-operation-nonce\/[a-f0-9]{64}$/u;
const ADMISSION_CYCLE_ID_PATTERN = /^vedic-admission-cycle\/[a-f0-9]{64}$/u;
const PACKET_ID_PATTERN = /^vedic-governance-packet\/[a-f0-9]{64}$/u;
const RECEIPT_ID_PATTERN = /^vedic-receipt\/[a-f0-9]{32,128}$/u;
const RECEIPT_KIND_PATTERN = /^[a-z][a-z0-9_]{0,95}$/u;
const MAX_PRE_SNAPSHOT_RECEIPT_REFERENCES = 512;

const STATE_DIGEST_DOMAIN =
  "hakimi/vedic-input-admission-kernel-draft/state-candidate/v0.1";
const CONSUMED_NONCE_HEAD_DIGEST_DOMAIN =
  "hakimi/vedic-input-admission-kernel-draft/consumed-nonce-head-candidate/v0.1";
const FROZEN_PACKET_RECEIPT_ID_DOMAIN =
  "hakimi/vedic-input-admission-kernel-draft/frozen-packet-receipt-id-candidate/v0.1";
const FROZEN_PACKET_RECEIPT_DIGEST_DOMAIN =
  "hakimi/vedic-input-admission-kernel-draft/frozen-packet-receipt-candidate/v0.1";
const CHAIN_HEAD_DIGEST_DOMAIN =
  "hakimi/vedic-input-admission-kernel-draft/chain-head-candidate/v0.1";
const REJECTION_DIGEST_DOMAIN =
  "hakimi/vedic-input-admission-kernel-draft/transition-rejection/v0.1";

export class VedicAdmissionKernelError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "VedicAdmissionKernelError";
    this.code = code;
  }
}

function fail(code: string, message: string, cause?: unknown): never {
  throw new VedicAdmissionKernelError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function requireRecord(value: KernelJsonValue, label: string): KernelJsonObject {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("REQUEST_SCHEMA_INVALID", `${label} must be a JSON object.`);
  }
  return value;
}

function requireExactKeys(record: KernelJsonObject, expected: readonly string[], label: string): void {
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail("REQUEST_SCHEMA_INVALID", `${label} contains missing, unknown, or extra keys.`);
  }
}

function requireSha256(value: KernelJsonValue, label: string): Sha256Hex {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    fail("REQUEST_SCHEMA_INVALID", `${label} must be lowercase SHA-256.`);
  }
  return value;
}

function requireBoolean(value: KernelJsonValue, label: string): boolean {
  if (typeof value !== "boolean") fail("REQUEST_SCHEMA_INVALID", `${label} must be boolean.`);
  return value;
}

function requireArray(value: KernelJsonValue, label: string): KernelJsonValue[] {
  if (!Array.isArray(value)) fail("REQUEST_SCHEMA_INVALID", `${label} must be a JSON array.`);
  return value;
}

function requireLiteralString<const T extends string>(
  value: KernelJsonValue,
  expected: T,
  label: string
): T {
  if (value !== expected) fail("REQUEST_SCHEMA_INVALID", `${label} does not match the fixed contract.`);
  return expected;
}

function parseState(record: KernelJsonObject): VedicKernelStateSnapshot {
  requireExactKeys(record, [
    "chainHeadDigest",
    "consumedNonceSetHeadDigest",
    "mutationEpoch",
    "revocationLedgerHeadDigest",
    "stateDigest",
    "stateId"
  ], "currentState");
  if (typeof record.stateId !== "string"
    || !(VEDIC_STATE_IDS as readonly string[]).includes(record.stateId)) {
    fail("REQUEST_SCHEMA_INVALID", "currentState.stateId is unknown.");
  }
  if (typeof record.mutationEpoch !== "number" || !Number.isSafeInteger(record.mutationEpoch)
    || record.mutationEpoch < 0) {
    fail("REQUEST_SCHEMA_INVALID", "currentState.mutationEpoch must be a non-negative safe integer.");
  }
  return Object.freeze({
    chainHeadDigest: requireSha256(record.chainHeadDigest!, "currentState.chainHeadDigest"),
    consumedNonceSetHeadDigest: requireSha256(
      record.consumedNonceSetHeadDigest!,
      "currentState.consumedNonceSetHeadDigest"
    ),
    mutationEpoch: record.mutationEpoch,
    revocationLedgerHeadDigest: requireSha256(
      record.revocationLedgerHeadDigest!,
      "currentState.revocationLedgerHeadDigest"
    ),
    stateDigest: requireSha256(record.stateDigest!, "currentState.stateDigest"),
    stateId: record.stateId as VedicStateId
  });
}

function requirePattern(value: KernelJsonValue, pattern: RegExp, label: string): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    fail("REQUEST_SCHEMA_INVALID", `${label} has an invalid fixed Vedic identity.`);
  }
  return value;
}

function parseReceiptId(value: KernelJsonValue, label: string): string {
  return requirePattern(value, RECEIPT_ID_PATTERN, label);
}

function parseReceiptIdArray(value: KernelJsonValue, label: string): readonly string[] {
  const source = requireArray(value, label);
  if (source.length > MAX_PRE_SNAPSHOT_RECEIPT_REFERENCES) {
    fail("REQUEST_SCHEMA_INVALID", `${label} exceeds the fixed candidate limit.`);
  }
  const result = source.map((entry, index) =>
    parseReceiptId(entry, `${label}[${index}]`));
  if (new Set(result).size !== result.length) {
    fail("REQUEST_SCHEMA_INVALID", `${label} contains duplicate receipt IDs.`);
  }
  return Object.freeze(result);
}

function parseReceiptReference(
  value: KernelJsonValue,
  index: number
): VedicPreSnapshotReceiptReferenceCandidate {
  const label = `preSnapshotEvidenceManifest.receiptReferences[${index}]`;
  const record = requireRecord(value, label);
  requireExactKeys(record, [
    "admissionCycleId",
    "packetDigest",
    "packetDigestDomain",
    "packetId",
    "packetManifestDigest",
    "receiptDigest",
    "receiptId",
    "receiptKind"
  ], label);
  return Object.freeze({
    admissionCycleId: requirePattern(
      record.admissionCycleId!,
      ADMISSION_CYCLE_ID_PATTERN,
      `${label}.admissionCycleId`
    ),
    packetDigest: requireSha256(record.packetDigest!, `${label}.packetDigest`),
    packetDigestDomain: requireLiteralString(
      record.packetDigestDomain!,
      VEDIC_PACKET_DIGEST_DOMAIN,
      `${label}.packetDigestDomain`
    ),
    packetId: requirePattern(record.packetId!, PACKET_ID_PATTERN, `${label}.packetId`),
    packetManifestDigest: requireSha256(
      record.packetManifestDigest!,
      `${label}.packetManifestDigest`
    ),
    receiptDigest: requireSha256(record.receiptDigest!, `${label}.receiptDigest`),
    receiptId: parseReceiptId(record.receiptId!, `${label}.receiptId`),
    receiptKind: requirePattern(record.receiptKind!, RECEIPT_KIND_PATTERN, `${label}.receiptKind`)
  });
}

function parseRevocationObservation(
  value: KernelJsonValue
): VedicPreSnapshotRevocationObservationCandidate {
  const label = "preSnapshotEvidenceManifest.revocationObservation";
  const record = requireRecord(value, label);
  requireExactKeys(record, [
    "activeCorrectionReceiptIds",
    "activeRevocationReceiptIds",
    "activeWithdrawalReceiptIds",
    "revocationLedgerHeadDigest"
  ], label);
  return Object.freeze({
    activeCorrectionReceiptIds: parseReceiptIdArray(
      record.activeCorrectionReceiptIds!,
      `${label}.activeCorrectionReceiptIds`
    ),
    activeRevocationReceiptIds: parseReceiptIdArray(
      record.activeRevocationReceiptIds!,
      `${label}.activeRevocationReceiptIds`
    ),
    activeWithdrawalReceiptIds: parseReceiptIdArray(
      record.activeWithdrawalReceiptIds!,
      `${label}.activeWithdrawalReceiptIds`
    ),
    revocationLedgerHeadDigest: requireSha256(
      record.revocationLedgerHeadDigest!,
      `${label}.revocationLedgerHeadDigest`
    )
  });
}

function parsePreSnapshotEvidenceManifest(
  value: KernelJsonValue
): VedicPreSnapshotEvidenceManifestCandidate {
  const label = "preSnapshotEvidenceManifest";
  const record = requireRecord(value, label);
  requireExactKeys(record, [
    "admissionCycleId",
    "declaredManifestDigestDomain",
    "manifestId",
    "packetDigest",
    "packetDigestDomain",
    "packetId",
    "packetManifestDigest",
    "receiptReferences",
    "revocationObservation",
    "schemaVersion"
  ], label);
  const receiptReferences = requireArray(
    record.receiptReferences!,
    `${label}.receiptReferences`
  );
  if (receiptReferences.length > MAX_PRE_SNAPSHOT_RECEIPT_REFERENCES) {
    fail(
      "REQUEST_SCHEMA_INVALID",
      `${label}.receiptReferences exceeds the fixed candidate limit.`
    );
  }
  return freezeResult({
    admissionCycleId: requirePattern(
      record.admissionCycleId!,
      ADMISSION_CYCLE_ID_PATTERN,
      `${label}.admissionCycleId`
    ),
    declaredManifestDigestDomain: requireLiteralString(
      record.declaredManifestDigestDomain!,
      VEDIC_PRE_SNAPSHOT_DECLARED_DIGEST_DOMAIN,
      `${label}.declaredManifestDigestDomain`
    ),
    manifestId: requireLiteralString(
      record.manifestId!,
      VEDIC_PRE_SNAPSHOT_MANIFEST_ID,
      `${label}.manifestId`
    ),
    packetDigest: requireSha256(record.packetDigest!, `${label}.packetDigest`),
    packetDigestDomain: requireLiteralString(
      record.packetDigestDomain!,
      VEDIC_PACKET_DIGEST_DOMAIN,
      `${label}.packetDigestDomain`
    ),
    packetId: requirePattern(record.packetId!, PACKET_ID_PATTERN, `${label}.packetId`),
    packetManifestDigest: requireSha256(
      record.packetManifestDigest!,
      `${label}.packetManifestDigest`
    ),
    receiptReferences: receiptReferences.map(parseReceiptReference),
    revocationObservation: parseRevocationObservation(record.revocationObservation!),
    schemaVersion: requireLiteralString(
      record.schemaVersion!,
      VEDIC_PRE_SNAPSHOT_MANIFEST_CANDIDATE_SCHEMA_VERSION,
      `${label}.schemaVersion`
    )
  });
}

function parseOperation(record: KernelJsonObject): VedicKernelOperationContext {
  requireExactKeys(record, [
    "generationScopedOperationNonce",
    "idempotencyKey",
    "idempotencyKeyPreviouslyObserved",
    "ledgerGenerationId",
    "operationId",
    "operationIdPreviouslyObserved",
    "operationNoncePreviouslyConsumed"
  ], "operation");
  return Object.freeze({
    generationScopedOperationNonce: requirePattern(
      record.generationScopedOperationNonce!,
      OPERATION_NONCE_PATTERN,
      "operation.generationScopedOperationNonce"
    ),
    idempotencyKey: requirePattern(record.idempotencyKey!, IDEMPOTENCY_KEY_PATTERN, "operation.idempotencyKey"),
    idempotencyKeyPreviouslyObserved: requireBoolean(
      record.idempotencyKeyPreviouslyObserved!,
      "operation.idempotencyKeyPreviouslyObserved"
    ),
    ledgerGenerationId: requirePattern(
      record.ledgerGenerationId!,
      LEDGER_GENERATION_ID_PATTERN,
      "operation.ledgerGenerationId"
    ),
    operationId: requirePattern(record.operationId!, OPERATION_ID_PATTERN, "operation.operationId"),
    operationIdPreviouslyObserved: requireBoolean(
      record.operationIdPreviouslyObserved!,
      "operation.operationIdPreviouslyObserved"
    ),
    operationNoncePreviouslyConsumed: requireBoolean(
      record.operationNoncePreviouslyConsumed!,
      "operation.operationNoncePreviouslyConsumed"
    )
  });
}

function parseRequest(candidate: unknown): VedicKernelTransitionRequest {
  let snapshot: KernelJsonValue;
  try {
    snapshot = captureKernelJson(candidate);
  } catch (cause) {
    if (cause instanceof VedicFrozenPacketError) {
      fail("REQUEST_VALUE_INVALID", cause.message, cause);
    }
    throw cause;
  }
  const record = requireRecord(snapshot, "request");
  if (typeof record.transitionId !== "string" || !TRANSITION_ID_PATTERN.test(record.transitionId)) {
    fail("REQUEST_SCHEMA_INVALID", "request.transitionId is invalid.");
  }
  requireExactKeys(record, ["currentState", "operation", "transitionId"], "request");
  return Object.freeze({
    currentState: parseState(requireRecord(record.currentState!, "currentState")),
    operation: parseOperation(requireRecord(record.operation!, "operation")),
    transitionId: record.transitionId
  });
}

function freezeResult<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeResult(child);
  return Object.freeze(value);
}

async function createPreSnapshotManifestPreflightReport(
  packet: VedicGovernancePacket,
  currentState: VedicKernelStateSnapshot,
  manifest: VedicPreSnapshotEvidenceManifestCandidate
): Promise<VedicPreSnapshotManifestPreflightReport> {
  const counts = new Map<string, number>();
  for (const reference of manifest.receiptReferences) {
    counts.set(reference.receiptKind, (counts.get(reference.receiptKind) ?? 0) + 1);
  }
  const knownReceiptKindCounts = VEDIC_PRE_SNAPSHOT_INCLUDED_RECEIPT_KINDS.map(
    (receiptKind) => Object.freeze({
      count: counts.get(receiptKind) ?? 0,
      receiptKind
    })
  );
  const sameCycleAndPacketProjectionMatches = manifest.admissionCycleId === packet.admissionCycleId
    && manifest.packetDigest === packet.packetDigest
    && manifest.packetDigestDomain === packet.packetDigestDomain
    && manifest.packetId === packet.packetId
    && manifest.packetManifestDigest === packet.packetManifestDigest
    && manifest.receiptReferences.every((reference) =>
      reference.admissionCycleId === packet.admissionCycleId
      && reference.packetDigest === packet.packetDigest
      && reference.packetDigestDomain === packet.packetDigestDomain
      && reference.packetId === packet.packetId
      && reference.packetManifestDigest === packet.packetManifestDigest);
  const receiptReferenceIdsUnique = new Set(
    manifest.receiptReferences.map((reference) => reference.receiptId)
  ).size === manifest.receiptReferences.length;
  const includedReceiptKindProjectionOnly = manifest.receiptReferences.every((reference) =>
    (VEDIC_PRE_SNAPSHOT_INCLUDED_RECEIPT_KINDS as readonly string[])
      .includes(reference.receiptKind));
  const outputReceiptKindProjectionAbsent = manifest.receiptReferences.every((reference) =>
    !(VEDIC_PRE_SNAPSHOT_EXCLUDED_OUTPUT_RECEIPT_KINDS as readonly string[])
      .includes(reference.receiptKind));
  const exactKnownCardinalityProjectionMatches = Object.entries(
    VEDIC_PRE_SNAPSHOT_DEFINED_RECEIPT_CARDINALITIES
  ).every(([receiptKind, expectedCount]) => counts.get(receiptKind) === expectedCount);
  const activeLifecycleReferenceProjectionEmpty = [
    ...manifest.revocationObservation.activeCorrectionReceiptIds,
    ...manifest.revocationObservation.activeRevocationReceiptIds,
    ...manifest.revocationObservation.activeWithdrawalReceiptIds
  ].length === 0;
  const candidateManifestDigest = await domainSeparatedDigest(
    VEDIC_PRE_SNAPSHOT_CANDIDATE_DIGEST_DOMAIN,
    manifest
  );

  return freezeResult({
    acceptedReceipt: false,
    activeLifecycleReferenceProjectionEmpty,
    authorityBoundary: { ...VEDIC_AUTHORITY_NONE },
    authorityEffect: "none",
    candidateManifestClosed: false,
    candidateManifestDigest,
    candidateManifestDigestDomain: VEDIC_PRE_SNAPSHOT_CANDIDATE_DIGEST_DOMAIN,
    candidateOnly: true,
    canAdvanceState: false,
    declaredManifestDigestDomain: VEDIC_PRE_SNAPSHOT_DECLARED_DIGEST_DOMAIN,
    exactKnownCardinalityProjectionMatches,
    executableReceiptSchemasAvailable: false,
    failedGuardIds: [...VEDIC_PRE_SNAPSHOT_MANIFEST_GUARD_IDS],
    formalManifestInstanceCreated: false,
    includedReceiptKindProjectionOnly,
    knownReceiptKindCounts,
    legalAuthorityDispositionCardinalityDefined: false,
    legalAuthorityDispositionReferenceCount:
      counts.get("legal_authority_disposition_receipt") ?? 0,
    manifestId: VEDIC_PRE_SNAPSHOT_MANIFEST_ID,
    observationClass: "draft_candidate_projection_preflight",
    outputReceiptKindProjectionAbsent,
    receiptReferenceCount: manifest.receiptReferences.length,
    receiptReferenceIdsUnique,
    revocationHeadProjectionMatchesState:
      manifest.revocationObservation.revocationLedgerHeadDigest
        === currentState.revocationLedgerHeadDigest,
    runtimeRevocationRecheckEstablished: false,
    sameCycleAndPacketProjectionMatches,
    underlyingAcceptedReceiptInstancesVerified: false,
    underlyingReceiptPacketBindingsVerified: false
  } satisfies VedicPreSnapshotManifestPreflightReport);
}

export async function inspectVedicPreSnapshotEvidenceManifestCandidate(
  packetBytesCandidate: unknown,
  currentStateCandidate: unknown,
  manifestCandidate: unknown
): Promise<VedicPreSnapshotManifestPreflightReport> {
  let stateSnapshot: KernelJsonValue;
  let manifestSnapshot: KernelJsonValue;
  try {
    stateSnapshot = captureKernelJson(currentStateCandidate);
    manifestSnapshot = captureKernelJson(manifestCandidate);
  } catch (cause) {
    if (cause instanceof VedicFrozenPacketError) {
      fail("REQUEST_VALUE_INVALID", cause.message, cause);
    }
    throw cause;
  }
  const [packet, currentState] = await Promise.all([
    parseCanonicalVedicGovernancePacket(packetBytesCandidate),
    Promise.resolve(parseState(requireRecord(stateSnapshot, "currentState")))
  ]);
  return createPreSnapshotManifestPreflightReport(
    packet,
    currentState,
    parsePreSnapshotEvidenceManifest(manifestSnapshot)
  );
}

export async function evaluateVedicInputAdmissionTransition(
  packetBytesCandidate: unknown,
  requestCandidate: unknown
): Promise<VedicKernelTransitionResult> {
  const [packet, request] = await Promise.all([
    parseCanonicalVedicGovernancePacket(packetBytesCandidate),
    Promise.resolve(parseRequest(requestCandidate))
  ]);
  const { currentState, operation, transitionId } = request;

  if (!(VEDIC_TRANSITION_IDS as readonly string[]).includes(transitionId)) {
    return createRejection(packet, request, "UNKNOWN_TRANSITION", ["unknown_transition"]);
  }
  if (transitionId === "seal_pre_snapshot_evidence_manifest") {
    if (currentState.stateId !== "packet_frozen_receipts_incomplete") {
      return createRejection(
        packet,
        request,
        "FROM_STATE_MISMATCH",
        ["from_state_packet_frozen_receipts_incomplete"]
      );
    }
    const replayGuards = [
      operation.operationIdPreviouslyObserved ? "operation_id_not_previously_observed" : null,
      operation.idempotencyKeyPreviouslyObserved ? "idempotency_key_not_previously_observed" : null,
      operation.operationNoncePreviouslyConsumed ? "operation_nonce_not_previously_consumed" : null
    ].filter((value): value is string => value !== null);
    if (replayGuards.length > 0) {
      return createRejection(packet, request, "REPLAY_OR_IDEMPOTENCY_CONFLICT", replayGuards);
    }
    if (currentState.mutationEpoch === Number.MAX_SAFE_INTEGER) {
      return createRejection(packet, request, "EPOCH_OVERFLOW", ["after_epoch_must_equal_before_plus_one"]);
    }
    return createRejection(
      packet,
      request,
      "PRE_SNAPSHOT_MANIFEST_SEAL_BLOCKED",
      [...VEDIC_PRE_SNAPSHOT_MANIFEST_GUARD_IDS]
    );
  }
  if (transitionId !== "freeze_packet") {
    return createRejection(packet, request, "TRANSITION_NOT_IMPLEMENTED", ["transition_not_implemented"]);
  }
  if (currentState.stateId !== "uninstantiated") {
    return createRejection(packet, request, "FROM_STATE_MISMATCH", ["from_state_uninstantiated"]);
  }
  const replayGuards = [
    operation.operationIdPreviouslyObserved ? "operation_id_not_previously_observed" : null,
    operation.idempotencyKeyPreviouslyObserved ? "idempotency_key_not_previously_observed" : null,
    operation.operationNoncePreviouslyConsumed ? "operation_nonce_not_previously_consumed" : null
  ].filter((value): value is string => value !== null);
  if (replayGuards.length > 0) {
    return createRejection(packet, request, "REPLAY_OR_IDEMPOTENCY_CONFLICT", replayGuards);
  }
  if (currentState.mutationEpoch === Number.MAX_SAFE_INTEGER) {
    return createRejection(packet, request, "EPOCH_OVERFLOW", ["after_epoch_must_equal_before_plus_one"]);
  }

  const afterEpoch = currentState.mutationEpoch + 1;
  const nextStateDigest = await domainSeparatedDigest(STATE_DIGEST_DOMAIN, {
    afterEpoch,
    authorityEffect: "none",
    ledgerGenerationId: operation.ledgerGenerationId,
    packetDigest: packet.packetDigest,
    packetManifestDigest: packet.packetManifestDigest,
    stateId: "packet_frozen_receipts_incomplete"
  });
  const nextConsumedNonceSetHeadDigest = await domainSeparatedDigest(
    CONSUMED_NONCE_HEAD_DIGEST_DOMAIN,
    {
      generationScopedOperationNonce: operation.generationScopedOperationNonce,
      previousConsumedNonceSetHeadDigest: currentState.consumedNonceSetHeadDigest
    }
  );
  const receiptIdentityProjection = {
    afterEpoch,
    authorityEffect: "none",
    beforeEpoch: currentState.mutationEpoch,
    candidateOnly: true,
    commitObserved: false,
    generationScopedOperationNonce: operation.generationScopedOperationNonce,
    idempotencyKey: operation.idempotencyKey,
    ledgerGenerationId: operation.ledgerGenerationId,
    mutationEpochRuntimeEstablished: false,
    nextConsumedNonceSetHeadDigest,
    nextStateDigest,
    operationId: operation.operationId,
    packetDigest: packet.packetDigest,
    packetId: packet.packetId,
    packetManifestDigest: packet.packetManifestDigest,
    receiptKind: "frozen_packet_receipt",
    receiptSchemaVersion: VEDIC_FROZEN_PACKET_CANDIDATE_SCHEMA_VERSION,
    receiptStatus: "draft_candidate_not_issued_not_accepted",
    transitionId: "freeze_packet"
  } as const;
  const receiptIdentityDigest = await domainSeparatedDigest(
    FROZEN_PACKET_RECEIPT_ID_DOMAIN,
    receiptIdentityProjection
  );
  const receiptId = `vedic-frozen-packet-candidate/${receiptIdentityDigest}`;
  const receiptDigest = await domainSeparatedDigest(
    FROZEN_PACKET_RECEIPT_DIGEST_DOMAIN,
    { ...receiptIdentityProjection, receiptId }
  );
  const nextChainHeadDigest = await domainSeparatedDigest(CHAIN_HEAD_DIGEST_DOMAIN, {
    candidateReceiptDigest: receiptDigest,
    previousChainHeadDigest: currentState.chainHeadDigest
  });

  return freezeResult({
    acceptedReceipt: false,
    afterEpoch,
    authorityBoundary: { ...VEDIC_AUTHORITY_NONE },
    authorityEffect: "none",
    beforeEpoch: currentState.mutationEpoch,
    candidateReceipt: {
      acceptedReceipt: false,
      authorityEffect: "none",
      candidateOnly: true,
      commitObserved: false,
      mutationEpochRuntimeEstablished: false,
      packetDigest: packet.packetDigest,
      packetId: packet.packetId,
      packetManifestDigest: packet.packetManifestDigest,
      receiptDigest,
      receiptId,
      receiptKind: "frozen_packet_receipt",
      receiptSchemaVersion: VEDIC_FROZEN_PACKET_CANDIDATE_SCHEMA_VERSION,
      receiptStatus: "draft_candidate_not_issued_not_accepted"
    },
    commitObserved: false,
    fromState: "uninstantiated",
    generationScopedOperationNonce: operation.generationScopedOperationNonce,
    idempotencyKey: operation.idempotencyKey,
    ledgerGenerationId: operation.ledgerGenerationId,
    mutationEpochRuntimeEstablished: false,
    nextChainHeadDigest,
    nextConsumedNonceSetHeadDigest,
    nextRevocationLedgerHeadDigest: currentState.revocationLedgerHeadDigest,
    nextStateDigest,
    operationId: operation.operationId,
    outcome: "draft_transition_candidate",
    packet,
    previousChainHeadDigest: currentState.chainHeadDigest,
    previousConsumedNonceSetHeadDigest: currentState.consumedNonceSetHeadDigest,
    previousRevocationLedgerHeadDigest: currentState.revocationLedgerHeadDigest,
    previousStateDigest: currentState.stateDigest,
    toState: "packet_frozen_receipts_incomplete",
    transitionId: "freeze_packet"
  } satisfies VedicFrozenPacketTransitionCandidate);
}

async function createRejection(
  packet: VedicGovernancePacket,
  request: VedicKernelTransitionRequest,
  rejectionCode: VedicTransitionRejectionReceipt["rejectionCode"],
  failedGuardIds: readonly string[]
): Promise<VedicTransitionRejectionReceipt> {
  const { currentState, operation, transitionId } = request;
  const projection = {
    acceptedReceipt: false,
    admissionCycleId: packet.admissionCycleId,
    afterEpoch: currentState.mutationEpoch,
    attemptedTransitionId: transitionId,
    authorityEffect: "none",
    beforeEpoch: currentState.mutationEpoch,
    commitObserved: false,
    failedGuardIds: [...failedGuardIds],
    generationScopedOperationNonce: operation.generationScopedOperationNonce,
    idempotencyKey: operation.idempotencyKey,
    ledgerGenerationId: operation.ledgerGenerationId,
    mutationEpochRuntimeEstablished: false,
    nextChainHeadDigest: currentState.chainHeadDigest,
    nextConsumedNonceSetHeadDigest: currentState.consumedNonceSetHeadDigest,
    nextRevocationLedgerHeadDigest: currentState.revocationLedgerHeadDigest,
    nextStateDigest: currentState.stateDigest,
    nonceConsumed: false,
    operationId: operation.operationId,
    packetDigest: packet.packetDigest,
    packetDigestDomain: packet.packetDigestDomain,
    packetId: packet.packetId,
    packetManifestDigest: packet.packetManifestDigest,
    packetSchemaVersion: packet.packetSchemaVersion,
    previousChainHeadDigest: currentState.chainHeadDigest,
    previousConsumedNonceSetHeadDigest: currentState.consumedNonceSetHeadDigest,
    previousRevocationLedgerHeadDigest: currentState.revocationLedgerHeadDigest,
    previousStateDigest: currentState.stateDigest,
    receiptKind: "transition_rejection_receipt",
    receiptSchemaVersion: VEDIC_TRANSITION_REJECTION_SCHEMA_VERSION,
    receiptStatus: "deterministic_failure_response_not_accepted_receipt",
    rejectionCode,
    stateAfter: currentState.stateId,
    stateBefore: currentState.stateId
  } as const;
  const receiptDigest = await domainSeparatedDigest(REJECTION_DIGEST_DOMAIN, projection);
  return freezeResult({
    ...projection,
    authorityBoundary: { ...VEDIC_AUTHORITY_NONE },
    outcome: "transition_rejection_receipt",
    receiptDigest
  } satisfies VedicTransitionRejectionReceipt);
}
