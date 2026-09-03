const DATABASE_VERSION = 1;
const STORE_NAME = "ephemeral-engineering-ledger";
const HEAD_KEY = "head";
const MAX_MUTATIONS_PER_GENERATION = 128;
const DATABASE_NAME_PATTERN = /^hakimi-vedic-ephemeral-mutation-experiment-[a-f0-9-]{36}$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u;
const REFLECT_APPLY = Reflect.apply;
const WEAK_MAP_GET = WeakMap.prototype.get;
const WEAK_MAP_SET = WeakMap.prototype.set;

export const VEDIC_EPHEMERAL_RUNTIME_EXPERIMENT_ID =
  "hakimi.vedic.ephemeral-mutation-epoch-runtime-experiment/0.1.0" as const;

export const VEDIC_EPHEMERAL_DATABASE_PREFIX =
  "hakimi-vedic-ephemeral-mutation-experiment-" as const;

export type VedicSyntheticStateId =
  | "synthetic_governance_state_alpha"
  | "synthetic_governance_state_beta";

export type VedicSyntheticRevocationEvent =
  | "no_revocation_event"
  | "synthetic_prior_state_revoked";

export type VedicEphemeralRuntimeErrorCode =
  | "DATABASE_NAME_NOT_EPHEMERAL"
  | "DATABASE_OPEN_FAILED"
  | "DATABASE_DELETE_BLOCKED"
  | "DATABASE_SHAPE_MISMATCH"
  | "STORED_STATE_INVALID"
  | "MALFORMED_OPERATION"
  | "GENERATION_MISMATCH"
  | "STALE_MUTATION_EPOCH"
  | "BASE_SNAPSHOT_MISMATCH"
  | "OPERATION_ID_REPLAY"
  | "OPERATION_NONCE_REPLAY"
  | "IDEMPOTENCY_KEY_REPLAY"
  | "RESTORE_SNAPSHOT_INVALID"
  | "RESTORE_SNAPSHOT_GENERATION_MISMATCH"
  | "RESTORE_SNAPSHOT_REPLAY"
  | "MUTATION_LIMIT_REACHED"
  | "ATOMIC_COMMIT_ABORTED"
  | "QUOTA_EXCEEDED"
  | "SYNTHETIC_ABORT_PROBE"
  | "SYNTHETIC_QUOTA_LIKE_ABORT_PROBE";

export class VedicEphemeralRuntimeError extends Error {
  readonly code: VedicEphemeralRuntimeErrorCode;

  constructor(code: VedicEphemeralRuntimeErrorCode) {
    super(code);
    this.name = "VedicEphemeralRuntimeError";
    this.code = code;
  }
}

export interface VedicAuthorityBoundary {
  readonly contentTruthEstablished: false;
  readonly expertClaimsAuthorized: false;
  readonly expertTruthEstablished: false;
  readonly formalSystemAdmissionAuthorized: false;
  readonly productMutationReceiptIssued: false;
  readonly publicDeploymentAuthorized: false;
  readonly publicReleaseAuthorized: false;
  readonly releaseReady: false;
  readonly rightsLegalConclusionEstablished: false;
}

export interface VedicMutationEngineeringObservation {
  readonly recordType: "vedic_ephemeral_mutation_engineering_observation";
  readonly schemaVersion: "0.1.0";
  readonly experimentId: typeof VEDIC_EPHEMERAL_RUNTIME_EXPERIMENT_ID;
  readonly observationId: string;
  readonly evidenceClass: "browser_or_test_runtime_mechanical_observation_only";
  readonly databaseNameSha256: string;
  readonly generationId: string;
  readonly operationKind: "synthetic_state_transition" | "synthetic_forward_restore";
  readonly operationIdSha256: string;
  readonly previousMutationEpoch: number;
  readonly currentMutationEpoch: number;
  readonly previousStateDigest: string;
  readonly currentStateDigest: string;
  readonly chainHeadDigest: string;
  readonly revocationLedgerHeadDigest: string;
  readonly consumedNonceSetHeadDigest: string;
  readonly atomicStateEpochHeadsAndObservationCommit: true;
  readonly commitObserved: true;
  readonly zeroPersonData: true;
  readonly ephemeralExperimentOnly: true;
  readonly selectedProductBackend: false;
  readonly selectedProductNamespace: false;
  readonly externalMonotonicAnchorAvailable: false;
  readonly offlineDatabaseCloneRollbackExcluded: false;
  readonly authorityBoundary: VedicAuthorityBoundary;
}

export interface VedicEphemeralRuntimeSnapshot {
  readonly recordType: "vedic_ephemeral_runtime_snapshot";
  readonly schemaVersion: "0.1.0";
  readonly experimentId: typeof VEDIC_EPHEMERAL_RUNTIME_EXPERIMENT_ID;
  readonly databaseNameSha256: string;
  readonly generationId: string;
  readonly mutationEpoch: number;
  readonly stateId: VedicSyntheticStateId;
  readonly stateDigest: string;
  readonly chainHeadDigest: string;
  readonly revocationLedgerHeadDigest: string;
  readonly consumedNonceSetHeadDigest: string;
  readonly envelopeDigest: string;
  readonly lastEngineeringObservation: VedicMutationEngineeringObservation | null;
  readonly zeroPersonData: true;
  readonly externalMonotonicAnchorAvailable: false;
  readonly offlineDatabaseCloneRollbackExcluded: false;
  readonly authorityBoundary: VedicAuthorityBoundary;
}

export interface VedicMutationCandidate {
  readonly recordType: "vedic_ephemeral_branded_mutation_candidate";
  readonly operationKind: "synthetic_state_transition";
  readonly expectedGenerationId: string;
  readonly expectedMutationEpoch: number;
  readonly expectedBaseEnvelopeDigest: string;
  readonly nextStateId: VedicSyntheticStateId;
  readonly revocationEvent: VedicSyntheticRevocationEvent;
  readonly zeroPersonData: true;
}

export interface VedicForwardRestoreCandidate {
  readonly recordType: "vedic_ephemeral_branded_forward_restore_candidate";
  readonly operationKind: "synthetic_forward_restore";
  readonly expectedGenerationId: string;
  readonly expectedMutationEpoch: number;
  readonly expectedBaseEnvelopeDigest: string;
  readonly revocationEvent: VedicSyntheticRevocationEvent;
  readonly zeroPersonData: true;
}

export interface VedicEphemeralRestoreProbeSnapshot {
  readonly recordType: "vedic_ephemeral_restore_probe_snapshot";
  readonly schemaVersion: "0.1.0";
  readonly experimentId: typeof VEDIC_EPHEMERAL_RUNTIME_EXPERIMENT_ID;
  readonly sourceGenerationId: string;
  readonly sourceMutationEpoch: number;
  readonly sourceEnvelopeDigest: string;
  readonly stateId: VedicSyntheticStateId;
  readonly stateDigest: string;
  readonly snapshotDigest: string;
  readonly zeroPersonData: true;
  readonly notAProductBackupArtifact: true;
  readonly productRecoveryCapabilityEstablished: false;
  readonly privateSameRealmIssuanceRequired: true;
  readonly externalMonotonicAnchorAvailable: false;
  readonly offlineDatabaseCloneRollbackExcluded: false;
}

interface InternalMutationCandidate {
  readonly operationKind: "synthetic_state_transition" | "synthetic_forward_restore";
  readonly expectedGenerationId: string;
  readonly expectedMutationEpoch: number;
  readonly expectedBaseEnvelopeDigest: string;
  readonly operationId: string;
  readonly operationNonce: string;
  readonly idempotencyKey: string;
  readonly nextStateId: VedicSyntheticStateId;
  readonly revocationEvent: VedicSyntheticRevocationEvent;
}

interface RuntimeSnapshotBrand {
  readonly databaseNameSha256: string;
  readonly generationId: string;
  readonly mutationEpoch: number;
  readonly envelopeDigest: string;
}

interface RestoreSnapshotBrand {
  readonly databaseNameSha256: string;
  readonly snapshot: VedicEphemeralRestoreProbeSnapshot;
}

interface StoredEnvelope {
  readonly recordKey: typeof HEAD_KEY;
  readonly recordType: "vedic_ephemeral_mutation_ledger_head";
  readonly schemaVersion: "0.1.0";
  readonly experimentId: typeof VEDIC_EPHEMERAL_RUNTIME_EXPERIMENT_ID;
  readonly databaseNameSha256: string;
  readonly generationId: string;
  readonly mutationEpoch: number;
  readonly stateId: VedicSyntheticStateId;
  readonly stateDigest: string;
  readonly chainHeadDigest: string;
  readonly revocationLedgerHeadDigest: string;
  readonly consumedNonceSetHeadDigest: string;
  readonly consumedOperationIdDigests: readonly string[];
  readonly consumedOperationNonceDigests: readonly string[];
  readonly consumedIdempotencyKeyDigests: readonly string[];
  readonly consumedRestoreSnapshotDigests: readonly string[];
  readonly lastEngineeringObservation: VedicMutationEngineeringObservation | null;
  readonly authorityBoundary: VedicAuthorityBoundary;
  readonly envelopeDigest: string;
}

type SyntheticFault = "abort_after_put" | "quota_like_abort_after_put" | null;

const RUNTIME_SNAPSHOT_BRANDS = new WeakMap<object, RuntimeSnapshotBrand>();
const MUTATION_CANDIDATE_BRANDS = new WeakMap<object, InternalMutationCandidate>();
const FORWARD_RESTORE_CANDIDATE_BRANDS = new WeakMap<object, Omit<InternalMutationCandidate, "nextStateId">>();
const RESTORE_SNAPSHOT_BRANDS = new WeakMap<object, RestoreSnapshotBrand>();

function hardenedWeakMapGet<T>(map: WeakMap<object, T>, key: object): T | undefined {
  return REFLECT_APPLY(WEAK_MAP_GET, map, [key]) as T | undefined;
}

function hardenedWeakMapSet<T>(map: WeakMap<object, T>, key: object, value: T): void {
  REFLECT_APPLY(WEAK_MAP_SET, map, [key, value]);
}

const AUTHORITY_BOUNDARY: VedicAuthorityBoundary = deepFreeze({
  contentTruthEstablished: false,
  expertClaimsAuthorized: false,
  expertTruthEstablished: false,
  formalSystemAdmissionAuthorized: false,
  productMutationReceiptIssued: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  releaseReady: false,
  rightsLegalConclusionEstablished: false
});

const ENVELOPE_KEYS = Object.freeze([
  "authorityBoundary",
  "chainHeadDigest",
  "consumedIdempotencyKeyDigests",
  "consumedNonceSetHeadDigest",
  "consumedOperationIdDigests",
  "consumedOperationNonceDigests",
  "consumedRestoreSnapshotDigests",
  "databaseNameSha256",
  "envelopeDigest",
  "experimentId",
  "generationId",
  "lastEngineeringObservation",
  "mutationEpoch",
  "recordKey",
  "recordType",
  "revocationLedgerHeadDigest",
  "schemaVersion",
  "stateDigest",
  "stateId"
]);

const AUTHORITY_KEYS = Object.freeze([
  "contentTruthEstablished",
  "expertClaimsAuthorized",
  "expertTruthEstablished",
  "formalSystemAdmissionAuthorized",
  "productMutationReceiptIssued",
  "publicDeploymentAuthorized",
  "publicReleaseAuthorized",
  "releaseReady",
  "rightsLegalConclusionEstablished"
]);

const OBSERVATION_KEYS = Object.freeze([
  "atomicStateEpochHeadsAndObservationCommit",
  "authorityBoundary",
  "chainHeadDigest",
  "commitObserved",
  "consumedNonceSetHeadDigest",
  "currentMutationEpoch",
  "currentStateDigest",
  "databaseNameSha256",
  "ephemeralExperimentOnly",
  "evidenceClass",
  "experimentId",
  "externalMonotonicAnchorAvailable",
  "generationId",
  "observationId",
  "offlineDatabaseCloneRollbackExcluded",
  "operationIdSha256",
  "operationKind",
  "previousMutationEpoch",
  "previousStateDigest",
  "recordType",
  "revocationLedgerHeadDigest",
  "schemaVersion",
  "selectedProductBackend",
  "selectedProductNamespace",
  "zeroPersonData"
]);

const RESTORE_SNAPSHOT_KEYS = Object.freeze([
  "experimentId",
  "externalMonotonicAnchorAvailable",
  "notAProductBackupArtifact",
  "offlineDatabaseCloneRollbackExcluded",
  "privateSameRealmIssuanceRequired",
  "productRecoveryCapabilityEstablished",
  "recordType",
  "schemaVersion",
  "snapshotDigest",
  "sourceEnvelopeDigest",
  "sourceGenerationId",
  "sourceMutationEpoch",
  "stateDigest",
  "stateId",
  "zeroPersonData"
]);

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function fail(code: VedicEphemeralRuntimeErrorCode): never {
  throw new VedicEphemeralRuntimeError(code);
}

function isSyntheticStateId(value: unknown): value is VedicSyntheticStateId {
  return value === "synthetic_governance_state_alpha"
    || value === "synthetic_governance_state_beta";
}

function isRevocationEvent(value: unknown): value is VedicSyntheticRevocationEvent {
  return value === "no_revocation_event" || value === "synthetic_prior_state_revoked";
}

function captureExactPlainRecord(
  raw: unknown,
  expectedKeys: readonly string[],
  failureCode: VedicEphemeralRuntimeErrorCode
): Record<string, unknown> {
  try {
    if (raw === null || typeof raw !== "object" || Object.getPrototypeOf(raw) !== Object.prototype) {
      return fail(failureCode);
    }
    const ownKeys = Reflect.ownKeys(raw);
    if (ownKeys.some((key) => typeof key !== "string")) return fail(failureCode);
    const actualKeys = (ownKeys as string[]).sort();
    if (actualKeys.length !== expectedKeys.length
      || actualKeys.some((key, index) => key !== expectedKeys[index])) {
      return fail(failureCode);
    }
    const descriptors = Object.getOwnPropertyDescriptors(raw);
    const captured = Object.create(null) as Record<string, unknown>;
    for (const key of actualKeys) {
      const descriptor = descriptors[key];
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) return fail(failureCode);
      Object.defineProperty(captured, key, {
        value: descriptor.value,
        enumerable: true,
        configurable: false,
        writable: false
      });
    }
    return captured;
  } catch (cause) {
    if (cause instanceof VedicEphemeralRuntimeError) throw cause;
    return fail(failureCode);
  }
}

function assertAuthorityBoundary(raw: unknown, failureCode: VedicEphemeralRuntimeErrorCode): void {
  const record = captureExactPlainRecord(raw, AUTHORITY_KEYS, failureCode);
  if (AUTHORITY_KEYS.some((key) => record[key] !== false)) fail(failureCode);
}

function assertDigest(value: unknown, failureCode: VedicEphemeralRuntimeErrorCode): asserts value is string {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) fail(failureCode);
}

function assertGenerationId(value: unknown, failureCode: VedicEphemeralRuntimeErrorCode): asserts value is string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) fail(failureCode);
}

function assertSafeEpoch(value: unknown, failureCode: VedicEphemeralRuntimeErrorCode): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) fail(failureCode);
}

function captureDigestArray(raw: unknown): readonly string[] {
  try {
    if (!Array.isArray(raw) || Object.getPrototypeOf(raw) !== Array.prototype) {
      return fail("STORED_STATE_INVALID");
    }
    const descriptors = Object.getOwnPropertyDescriptors(raw);
    const lengthDescriptor = Object.getOwnPropertyDescriptor(raw, "length");
    if (!lengthDescriptor
      || !("value" in lengthDescriptor)
      || !Number.isSafeInteger(lengthDescriptor.value)
      || (lengthDescriptor.value as number) < 0
      || (lengthDescriptor.value as number) > MAX_MUTATIONS_PER_GENERATION) {
      return fail("STORED_STATE_INVALID");
    }
    const length = lengthDescriptor.value as number;
    const ownKeys = Reflect.ownKeys(raw);
    if (ownKeys.length !== length + 1 || ownKeys.some((key) => typeof key === "symbol")) {
      return fail("STORED_STATE_INVALID");
    }
    const captured: string[] = [];
    for (let index = 0; index < length; index += 1) {
      const key = String(index);
      if (!ownKeys.includes(key)) return fail("STORED_STATE_INVALID");
      const descriptor = descriptors[key];
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        return fail("STORED_STATE_INVALID");
      }
      assertDigest(descriptor.value, "STORED_STATE_INVALID");
      captured[index] = descriptor.value;
    }
    if (!ownKeys.includes("length")) return fail("STORED_STATE_INVALID");
    if (new Set(captured).size !== captured.length) fail("STORED_STATE_INVALID");
    return Object.freeze(captured);
  } catch (cause) {
    if (cause instanceof VedicEphemeralRuntimeError) throw cause;
    return fail("STORED_STATE_INVALID");
  }
}

function assertObservation(raw: unknown): asserts raw is VedicMutationEngineeringObservation {
  const record = captureExactPlainRecord(raw, OBSERVATION_KEYS, "STORED_STATE_INVALID");
  if (record.recordType !== "vedic_ephemeral_mutation_engineering_observation"
    || record.schemaVersion !== "0.1.0"
    || record.experimentId !== VEDIC_EPHEMERAL_RUNTIME_EXPERIMENT_ID
    || record.evidenceClass !== "browser_or_test_runtime_mechanical_observation_only"
    || record.atomicStateEpochHeadsAndObservationCommit !== true
    || record.commitObserved !== true
    || record.zeroPersonData !== true
    || record.ephemeralExperimentOnly !== true
    || record.selectedProductBackend !== false
    || record.selectedProductNamespace !== false
    || record.externalMonotonicAnchorAvailable !== false
    || record.offlineDatabaseCloneRollbackExcluded !== false
    || (record.operationKind !== "synthetic_state_transition"
      && record.operationKind !== "synthetic_forward_restore")) {
    fail("STORED_STATE_INVALID");
  }
  assertDigest(record.observationId, "STORED_STATE_INVALID");
  assertDigest(record.operationIdSha256, "STORED_STATE_INVALID");
  assertDigest(record.databaseNameSha256, "STORED_STATE_INVALID");
  assertGenerationId(record.generationId, "STORED_STATE_INVALID");
  assertSafeEpoch(record.previousMutationEpoch, "STORED_STATE_INVALID");
  assertSafeEpoch(record.currentMutationEpoch, "STORED_STATE_INVALID");
  if (record.currentMutationEpoch !== (record.previousMutationEpoch as number) + 1) {
    fail("STORED_STATE_INVALID");
  }
  assertDigest(record.previousStateDigest, "STORED_STATE_INVALID");
  assertDigest(record.currentStateDigest, "STORED_STATE_INVALID");
  assertDigest(record.chainHeadDigest, "STORED_STATE_INVALID");
  assertDigest(record.revocationLedgerHeadDigest, "STORED_STATE_INVALID");
  assertDigest(record.consumedNonceSetHeadDigest, "STORED_STATE_INVALID");
  assertAuthorityBoundary(record.authorityBoundary, "STORED_STATE_INVALID");
}

function captureStoredEnvelopeShape(raw: unknown): StoredEnvelope {
  const record = captureExactPlainRecord(raw, ENVELOPE_KEYS, "STORED_STATE_INVALID");
  if (record.recordKey !== HEAD_KEY
    || record.recordType !== "vedic_ephemeral_mutation_ledger_head"
    || record.schemaVersion !== "0.1.0"
    || record.experimentId !== VEDIC_EPHEMERAL_RUNTIME_EXPERIMENT_ID
    || !isSyntheticStateId(record.stateId)) {
    fail("STORED_STATE_INVALID");
  }
  assertDigest(record.databaseNameSha256, "STORED_STATE_INVALID");
  assertGenerationId(record.generationId, "STORED_STATE_INVALID");
  assertSafeEpoch(record.mutationEpoch, "STORED_STATE_INVALID");
  assertDigest(record.stateDigest, "STORED_STATE_INVALID");
  assertDigest(record.chainHeadDigest, "STORED_STATE_INVALID");
  assertDigest(record.revocationLedgerHeadDigest, "STORED_STATE_INVALID");
  assertDigest(record.consumedNonceSetHeadDigest, "STORED_STATE_INVALID");
  assertDigest(record.envelopeDigest, "STORED_STATE_INVALID");
  const consumedOperationIdDigests = captureDigestArray(record.consumedOperationIdDigests);
  const consumedOperationNonceDigests = captureDigestArray(record.consumedOperationNonceDigests);
  const consumedIdempotencyKeyDigests = captureDigestArray(record.consumedIdempotencyKeyDigests);
  const consumedRestoreSnapshotDigests = captureDigestArray(record.consumedRestoreSnapshotDigests);
  if (record.lastEngineeringObservation !== null) assertObservation(record.lastEngineeringObservation);
  assertAuthorityBoundary(record.authorityBoundary, "STORED_STATE_INVALID");
  const listLengths = [
    consumedOperationIdDigests.length,
    consumedOperationNonceDigests.length,
    consumedIdempotencyKeyDigests.length
  ];
  if (listLengths.some((length) => length !== record.mutationEpoch)) fail("STORED_STATE_INVALID");
  if (record.mutationEpoch === 0 && record.lastEngineeringObservation !== null) fail("STORED_STATE_INVALID");
  if (record.mutationEpoch > 0
    && record.lastEngineeringObservation?.currentMutationEpoch !== record.mutationEpoch) {
    fail("STORED_STATE_INVALID");
  }
  return {
    ...record,
    consumedOperationIdDigests,
    consumedOperationNonceDigests,
    consumedIdempotencyKeyDigests,
    consumedRestoreSnapshotDigests
  } as unknown as StoredEnvelope;
}

function canonicalize(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (typeof value === "object"
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)) {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => (
      `${JSON.stringify(key)}:${canonicalize(record[key])}`
    )).join(",")}}`;
  }
  throw new VedicEphemeralRuntimeError("STORED_STATE_INVALID");
}

async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalize(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function envelopeMaterial(envelope: Omit<StoredEnvelope, "envelopeDigest">): unknown {
  return envelope;
}

function observationMaterial(
  observation: Omit<VedicMutationEngineeringObservation, "observationId">
): unknown {
  return observation;
}

function restoreSnapshotMaterial(
  snapshot: Omit<VedicEphemeralRestoreProbeSnapshot, "snapshotDigest">
): unknown {
  return snapshot;
}

function cloneAuthorityBoundary(): VedicAuthorityBoundary {
  return { ...AUTHORITY_BOUNDARY };
}

async function createGenesisEnvelope(
  databaseNameSha256: string,
  generationId: string
): Promise<StoredEnvelope> {
  const stateId = "synthetic_governance_state_alpha" as const;
  const stateDigest = await sha256({ stateId, zeroPersonData: true });
  const chainHeadDigest = await sha256({
    domain: "vedic-ephemeral-genesis-chain",
    databaseNameSha256,
    generationId,
    stateDigest
  });
  const revocationLedgerHeadDigest = await sha256({
    domain: "vedic-ephemeral-genesis-revocation-ledger",
    databaseNameSha256,
    generationId
  });
  const consumedNonceSetHeadDigest = await sha256({
    domain: "vedic-ephemeral-genesis-consumed-nonce-set",
    databaseNameSha256,
    generationId
  });
  const withoutDigest: Omit<StoredEnvelope, "envelopeDigest"> = {
    recordKey: HEAD_KEY,
    recordType: "vedic_ephemeral_mutation_ledger_head",
    schemaVersion: "0.1.0",
    experimentId: VEDIC_EPHEMERAL_RUNTIME_EXPERIMENT_ID,
    databaseNameSha256,
    generationId,
    mutationEpoch: 0,
    stateId,
    stateDigest,
    chainHeadDigest,
    revocationLedgerHeadDigest,
    consumedNonceSetHeadDigest,
    consumedOperationIdDigests: [],
    consumedOperationNonceDigests: [],
    consumedIdempotencyKeyDigests: [],
    consumedRestoreSnapshotDigests: [],
    lastEngineeringObservation: null,
    authorityBoundary: cloneAuthorityBoundary()
  };
  return {
    ...withoutDigest,
    envelopeDigest: await sha256(envelopeMaterial(withoutDigest))
  };
}

async function validateStoredEnvelope(raw: unknown, expectedDatabaseNameSha256: string): Promise<StoredEnvelope> {
  const captured = captureStoredEnvelopeShape(raw);
  if (captured.databaseNameSha256 !== expectedDatabaseNameSha256) fail("STORED_STATE_INVALID");
  const { envelopeDigest, ...withoutDigest } = captured;
  if (await sha256(envelopeMaterial(withoutDigest)) !== envelopeDigest) fail("STORED_STATE_INVALID");
  if (await sha256({ stateId: captured.stateId, zeroPersonData: true }) !== captured.stateDigest) {
    fail("STORED_STATE_INVALID");
  }
  return captured;
}

function captureMutationCandidate(raw: unknown): InternalMutationCandidate {
  if (raw === null || (typeof raw !== "object" && typeof raw !== "function")) {
    return fail("MALFORMED_OPERATION");
  }
  return hardenedWeakMapGet(MUTATION_CANDIDATE_BRANDS, raw as object)
    ?? fail("MALFORMED_OPERATION");
}

function captureRestoreCandidate(raw: unknown): Omit<InternalMutationCandidate, "nextStateId"> {
  if (raw === null || (typeof raw !== "object" && typeof raw !== "function")) {
    return fail("MALFORMED_OPERATION");
  }
  return hardenedWeakMapGet(FORWARD_RESTORE_CANDIDATE_BRANDS, raw as object)
    ?? fail("MALFORMED_OPERATION");
}

function captureRestoreSnapshot(raw: unknown): RestoreSnapshotBrand {
  if (raw === null || (typeof raw !== "object" && typeof raw !== "function")) {
    return fail("RESTORE_SNAPSHOT_INVALID");
  }
  return hardenedWeakMapGet(RESTORE_SNAPSHOT_BRANDS, raw as object)
    ?? fail("RESTORE_SNAPSHOT_INVALID");
}

function transactionFailure(error: DOMException | null): VedicEphemeralRuntimeError {
  if (error?.name === "QuotaExceededError") return new VedicEphemeralRuntimeError("QUOTA_EXCEEDED");
  return new VedicEphemeralRuntimeError("ATOMIC_COMMIT_ABORTED");
}

function openDatabase(indexedDb: IDBFactory, databaseName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDb.open(databaseName, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (database.objectStoreNames.length !== 0) {
        request.transaction?.abort();
        return;
      }
      database.createObjectStore(STORE_NAME);
    };
    request.onerror = () => reject(new VedicEphemeralRuntimeError("DATABASE_OPEN_FAILED"));
    request.onblocked = () => reject(new VedicEphemeralRuntimeError("DATABASE_OPEN_FAILED"));
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      if (database.objectStoreNames.length !== 1 || !database.objectStoreNames.contains(STORE_NAME)) {
        database.close();
        reject(new VedicEphemeralRuntimeError("DATABASE_SHAPE_MISMATCH"));
        return;
      }
      resolve(database);
    };
  });
}

function readRawEnvelope(database: IDBDatabase): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(HEAD_KEY);
    let result: unknown;
    request.onsuccess = () => { result = request.result; };
    request.onerror = () => reject(transactionFailure(request.error));
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = () => reject(transactionFailure(transaction.error));
    transaction.onerror = () => undefined;
  });
}

function initializeEnvelope(database: IDBDatabase, genesis: StoredEnvelope): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(HEAD_KEY);
    let result: unknown;
    request.onsuccess = () => {
      result = request.result;
      if (typeof result === "undefined") {
        result = genesis;
        store.add(genesis, HEAD_KEY);
      }
    };
    request.onerror = () => {
      transaction.abort();
    };
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = () => reject(transactionFailure(transaction.error));
    transaction.onerror = () => undefined;
  });
}

async function buildNextEnvelope(
  base: StoredEnvelope,
  candidate: InternalMutationCandidate,
  restoreSnapshotDigest: string | null
): Promise<StoredEnvelope> {
  if (base.mutationEpoch >= MAX_MUTATIONS_PER_GENERATION) fail("MUTATION_LIMIT_REACHED");
  const operationIdDigest = await sha256({ domain: "operation-id", value: candidate.operationId });
  const operationNonceDigest = await sha256({ domain: "operation-nonce", value: candidate.operationNonce });
  const idempotencyKeyDigest = await sha256({ domain: "idempotency-key", value: candidate.idempotencyKey });
  if (base.consumedOperationIdDigests.includes(operationIdDigest)) fail("OPERATION_ID_REPLAY");
  if (base.consumedOperationNonceDigests.includes(operationNonceDigest)) fail("OPERATION_NONCE_REPLAY");
  if (base.consumedIdempotencyKeyDigests.includes(idempotencyKeyDigest)) fail("IDEMPOTENCY_KEY_REPLAY");
  if (restoreSnapshotDigest !== null
    && base.consumedRestoreSnapshotDigests.includes(restoreSnapshotDigest)) {
    fail("RESTORE_SNAPSHOT_REPLAY");
  }
  const currentMutationEpoch = base.mutationEpoch + 1;
  const currentStateDigest = await sha256({ stateId: candidate.nextStateId, zeroPersonData: true });
  const operationDigest = await sha256({
    domain: "vedic-ephemeral-mutation-operation",
    generationId: base.generationId,
    previousMutationEpoch: base.mutationEpoch,
    currentMutationEpoch,
    expectedBaseEnvelopeDigest: candidate.expectedBaseEnvelopeDigest,
    operationKind: candidate.operationKind,
    operationIdDigest,
    operationNonceDigest,
    idempotencyKeyDigest,
    previousStateDigest: base.stateDigest,
    currentStateDigest,
    restoreSnapshotDigest,
    revocationEvent: candidate.revocationEvent
  });
  const chainHeadDigest = await sha256({
    domain: "vedic-ephemeral-chain-head",
    previousChainHeadDigest: base.chainHeadDigest,
    operationDigest,
    currentMutationEpoch
  });
  const revocationLedgerHeadDigest = await sha256({
    domain: "vedic-ephemeral-revocation-ledger-head",
    previousRevocationLedgerHeadDigest: base.revocationLedgerHeadDigest,
    operationDigest,
    revocationEvent: candidate.revocationEvent,
    currentMutationEpoch
  });
  const consumedNonceSetHeadDigest = await sha256({
    domain: "vedic-ephemeral-consumed-nonce-set-head",
    previousConsumedNonceSetHeadDigest: base.consumedNonceSetHeadDigest,
    operationIdDigest,
    operationNonceDigest,
    idempotencyKeyDigest,
    restoreSnapshotDigest,
    currentMutationEpoch
  });
  const observationWithoutId: Omit<VedicMutationEngineeringObservation, "observationId"> = {
    recordType: "vedic_ephemeral_mutation_engineering_observation",
    schemaVersion: "0.1.0",
    experimentId: VEDIC_EPHEMERAL_RUNTIME_EXPERIMENT_ID,
    evidenceClass: "browser_or_test_runtime_mechanical_observation_only",
    databaseNameSha256: base.databaseNameSha256,
    generationId: base.generationId,
    operationKind: candidate.operationKind,
    operationIdSha256: operationIdDigest,
    previousMutationEpoch: base.mutationEpoch,
    currentMutationEpoch,
    previousStateDigest: base.stateDigest,
    currentStateDigest,
    chainHeadDigest,
    revocationLedgerHeadDigest,
    consumedNonceSetHeadDigest,
    atomicStateEpochHeadsAndObservationCommit: true,
    commitObserved: true,
    zeroPersonData: true,
    ephemeralExperimentOnly: true,
    selectedProductBackend: false,
    selectedProductNamespace: false,
    externalMonotonicAnchorAvailable: false,
    offlineDatabaseCloneRollbackExcluded: false,
    authorityBoundary: cloneAuthorityBoundary()
  };
  const lastEngineeringObservation: VedicMutationEngineeringObservation = {
    ...observationWithoutId,
    observationId: await sha256(observationMaterial(observationWithoutId))
  };
  const withoutDigest: Omit<StoredEnvelope, "envelopeDigest"> = {
    recordKey: HEAD_KEY,
    recordType: "vedic_ephemeral_mutation_ledger_head",
    schemaVersion: "0.1.0",
    experimentId: VEDIC_EPHEMERAL_RUNTIME_EXPERIMENT_ID,
    databaseNameSha256: base.databaseNameSha256,
    generationId: base.generationId,
    mutationEpoch: currentMutationEpoch,
    stateId: candidate.nextStateId,
    stateDigest: currentStateDigest,
    chainHeadDigest,
    revocationLedgerHeadDigest,
    consumedNonceSetHeadDigest,
    consumedOperationIdDigests: [...base.consumedOperationIdDigests, operationIdDigest],
    consumedOperationNonceDigests: [...base.consumedOperationNonceDigests, operationNonceDigest],
    consumedIdempotencyKeyDigests: [...base.consumedIdempotencyKeyDigests, idempotencyKeyDigest],
    consumedRestoreSnapshotDigests: restoreSnapshotDigest === null
      ? [...base.consumedRestoreSnapshotDigests]
      : [...base.consumedRestoreSnapshotDigests, restoreSnapshotDigest],
    lastEngineeringObservation,
    authorityBoundary: cloneAuthorityBoundary()
  };
  return {
    ...withoutDigest,
    envelopeDigest: await sha256(envelopeMaterial(withoutDigest))
  };
}

function commitEnvelopeAtomically(
  database: IDBDatabase,
  expectedBaseCanonical: string,
  next: StoredEnvelope,
  syntheticFault: SyntheticFault
): Promise<VedicMutationEngineeringObservation> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(HEAD_KEY);
    let explicitFailure: VedicEphemeralRuntimeError | null = null;
    request.onsuccess = () => {
      try {
        const current = captureStoredEnvelopeShape(request.result);
        if (canonicalize(current) !== expectedBaseCanonical) {
          explicitFailure = new VedicEphemeralRuntimeError("BASE_SNAPSHOT_MISMATCH");
          transaction.abort();
          return;
        }
        const putRequest = store.put(next, HEAD_KEY);
        putRequest.onsuccess = () => {
          if (syntheticFault === "abort_after_put") {
            explicitFailure = new VedicEphemeralRuntimeError("SYNTHETIC_ABORT_PROBE");
            transaction.abort();
          } else if (syntheticFault === "quota_like_abort_after_put") {
            explicitFailure = new VedicEphemeralRuntimeError("SYNTHETIC_QUOTA_LIKE_ABORT_PROBE");
            transaction.abort();
          }
        };
        putRequest.onerror = () => {
          explicitFailure = transactionFailure(putRequest.error);
        };
      } catch (cause) {
        explicitFailure = cause instanceof VedicEphemeralRuntimeError
          ? cause
          : new VedicEphemeralRuntimeError("ATOMIC_COMMIT_ABORTED");
        transaction.abort();
      }
    };
    request.onerror = () => {
      explicitFailure = transactionFailure(request.error);
    };
    transaction.oncomplete = () => {
      if (next.lastEngineeringObservation === null) {
        reject(new VedicEphemeralRuntimeError("ATOMIC_COMMIT_ABORTED"));
        return;
      }
      resolve(deepFreeze(structuredClone(next.lastEngineeringObservation)));
    };
    transaction.onabort = () => reject(explicitFailure ?? transactionFailure(transaction.error));
    transaction.onerror = () => undefined;
  });
}

function toSnapshot(envelope: StoredEnvelope): VedicEphemeralRuntimeSnapshot {
  const snapshot: VedicEphemeralRuntimeSnapshot = deepFreeze({
    recordType: "vedic_ephemeral_runtime_snapshot",
    schemaVersion: "0.1.0",
    experimentId: VEDIC_EPHEMERAL_RUNTIME_EXPERIMENT_ID,
    databaseNameSha256: envelope.databaseNameSha256,
    generationId: envelope.generationId,
    mutationEpoch: envelope.mutationEpoch,
    stateId: envelope.stateId,
    stateDigest: envelope.stateDigest,
    chainHeadDigest: envelope.chainHeadDigest,
    revocationLedgerHeadDigest: envelope.revocationLedgerHeadDigest,
    consumedNonceSetHeadDigest: envelope.consumedNonceSetHeadDigest,
    envelopeDigest: envelope.envelopeDigest,
    lastEngineeringObservation: envelope.lastEngineeringObservation === null
      ? null
      : structuredClone(envelope.lastEngineeringObservation),
    zeroPersonData: true,
    externalMonotonicAnchorAvailable: false,
    offlineDatabaseCloneRollbackExcluded: false,
    authorityBoundary: cloneAuthorityBoundary()
  });
  hardenedWeakMapSet(RUNTIME_SNAPSHOT_BRANDS, snapshot, Object.freeze({
    databaseNameSha256: envelope.databaseNameSha256,
    generationId: envelope.generationId,
    mutationEpoch: envelope.mutationEpoch,
    envelopeDigest: envelope.envelopeDigest
  }));
  return snapshot;
}

function captureRuntimeSnapshotBrand(raw: unknown): RuntimeSnapshotBrand {
  if (raw === null || (typeof raw !== "object" && typeof raw !== "function")) {
    return fail("MALFORMED_OPERATION");
  }
  return hardenedWeakMapGet(RUNTIME_SNAPSHOT_BRANDS, raw as object)
    ?? fail("MALFORMED_OPERATION");
}

export function createVedicMutationCandidate(
  rawBaseSnapshot: unknown,
  nextStateId: VedicSyntheticStateId,
  revocationEvent: VedicSyntheticRevocationEvent
): VedicMutationCandidate {
  const base = captureRuntimeSnapshotBrand(rawBaseSnapshot);
  if (!isSyntheticStateId(nextStateId) || !isRevocationEvent(revocationEvent)) {
    return fail("MALFORMED_OPERATION");
  }
  const internal: InternalMutationCandidate = Object.freeze({
    operationKind: "synthetic_state_transition",
    expectedGenerationId: base.generationId,
    expectedMutationEpoch: base.mutationEpoch,
    expectedBaseEnvelopeDigest: base.envelopeDigest,
    operationId: crypto.randomUUID(),
    operationNonce: crypto.randomUUID(),
    idempotencyKey: crypto.randomUUID(),
    nextStateId,
    revocationEvent
  });
  const candidate: VedicMutationCandidate = deepFreeze({
    recordType: "vedic_ephemeral_branded_mutation_candidate",
    operationKind: "synthetic_state_transition",
    expectedGenerationId: base.generationId,
    expectedMutationEpoch: base.mutationEpoch,
    expectedBaseEnvelopeDigest: base.envelopeDigest,
    nextStateId,
    revocationEvent,
    zeroPersonData: true
  });
  hardenedWeakMapSet(MUTATION_CANDIDATE_BRANDS, candidate, internal);
  return candidate;
}

export function createVedicForwardRestoreCandidate(
  rawBaseSnapshot: unknown,
  revocationEvent: VedicSyntheticRevocationEvent
): VedicForwardRestoreCandidate {
  const base = captureRuntimeSnapshotBrand(rawBaseSnapshot);
  if (!isRevocationEvent(revocationEvent)) return fail("MALFORMED_OPERATION");
  const internal: Omit<InternalMutationCandidate, "nextStateId"> = Object.freeze({
    operationKind: "synthetic_forward_restore",
    expectedGenerationId: base.generationId,
    expectedMutationEpoch: base.mutationEpoch,
    expectedBaseEnvelopeDigest: base.envelopeDigest,
    operationId: crypto.randomUUID(),
    operationNonce: crypto.randomUUID(),
    idempotencyKey: crypto.randomUUID(),
    revocationEvent
  });
  const candidate: VedicForwardRestoreCandidate = deepFreeze({
    recordType: "vedic_ephemeral_branded_forward_restore_candidate",
    operationKind: "synthetic_forward_restore",
    expectedGenerationId: base.generationId,
    expectedMutationEpoch: base.mutationEpoch,
    expectedBaseEnvelopeDigest: base.envelopeDigest,
    revocationEvent,
    zeroPersonData: true
  });
  hardenedWeakMapSet(FORWARD_RESTORE_CANDIDATE_BRANDS, candidate, internal);
  return candidate;
}

class VedicEphemeralMutationEpochRuntimeExperiment {
  readonly #database: IDBDatabase;
  readonly #databaseNameSha256: string;
  #closed = false;

  constructor(database: IDBDatabase, databaseNameSha256: string) {
    this.#database = database;
    this.#databaseNameSha256 = databaseNameSha256;
  }

  async readSnapshot(): Promise<VedicEphemeralRuntimeSnapshot> {
    this.#assertOpen();
    const envelope = await validateStoredEnvelope(
      await readRawEnvelope(this.#database),
      this.#databaseNameSha256
    );
    return toSnapshot(envelope);
  }

  async commitCandidate(rawCandidate: unknown): Promise<VedicMutationEngineeringObservation> {
    return this.#commit(captureMutationCandidate(rawCandidate), null, null);
  }

  async runSyntheticAbortAfterPutProbe(rawCandidate: unknown): Promise<never> {
    await this.#commit(captureMutationCandidate(rawCandidate), null, "abort_after_put");
    return fail("ATOMIC_COMMIT_ABORTED");
  }

  async runSyntheticQuotaLikeAbortAfterPutProbe(rawCandidate: unknown): Promise<never> {
    await this.#commit(captureMutationCandidate(rawCandidate), null, "quota_like_abort_after_put");
    return fail("ATOMIC_COMMIT_ABORTED");
  }

  async captureEphemeralRestoreProbeSnapshot(): Promise<VedicEphemeralRestoreProbeSnapshot> {
    const snapshot = await this.readSnapshot();
    const withoutDigest: Omit<VedicEphemeralRestoreProbeSnapshot, "snapshotDigest"> = {
      recordType: "vedic_ephemeral_restore_probe_snapshot",
      schemaVersion: "0.1.0",
      experimentId: VEDIC_EPHEMERAL_RUNTIME_EXPERIMENT_ID,
      sourceGenerationId: snapshot.generationId,
      sourceMutationEpoch: snapshot.mutationEpoch,
      sourceEnvelopeDigest: snapshot.envelopeDigest,
      stateId: snapshot.stateId,
      stateDigest: snapshot.stateDigest,
      zeroPersonData: true,
      notAProductBackupArtifact: true,
      productRecoveryCapabilityEstablished: false,
      privateSameRealmIssuanceRequired: true,
      externalMonotonicAnchorAvailable: false,
      offlineDatabaseCloneRollbackExcluded: false
    };
    const restoreSnapshot: VedicEphemeralRestoreProbeSnapshot = deepFreeze({
      ...withoutDigest,
      snapshotDigest: await sha256(restoreSnapshotMaterial(withoutDigest))
    });
    hardenedWeakMapSet(RESTORE_SNAPSHOT_BRANDS, restoreSnapshot, Object.freeze({
      databaseNameSha256: this.#databaseNameSha256,
      snapshot: restoreSnapshot
    }));
    return restoreSnapshot;
  }

  async restoreSnapshotAsForwardMutation(
    rawSnapshot: unknown,
    rawCandidate: unknown
  ): Promise<VedicMutationEngineeringObservation> {
    this.#assertOpen();
    const restoreBrand = captureRestoreSnapshot(rawSnapshot);
    const restoreSnapshot = restoreBrand.snapshot;
    const candidate = captureRestoreCandidate(rawCandidate);
    const current = await this.readSnapshot();
    if (restoreBrand.databaseNameSha256 !== this.#databaseNameSha256) {
      fail("RESTORE_SNAPSHOT_INVALID");
    }
    if (restoreSnapshot.sourceGenerationId !== current.generationId) {
      fail("RESTORE_SNAPSHOT_GENERATION_MISMATCH");
    }
    if (restoreSnapshot.sourceMutationEpoch > current.mutationEpoch) {
      fail("RESTORE_SNAPSHOT_INVALID");
    }
    return this.#commit(
      Object.freeze({ ...candidate, nextStateId: restoreSnapshot.stateId }),
      restoreSnapshot.snapshotDigest,
      null
    );
  }

  close(): void {
    if (!this.#closed) {
      this.#database.close();
      this.#closed = true;
    }
  }

  async #commit(
    candidate: InternalMutationCandidate,
    restoreSnapshotDigest: string | null,
    syntheticFault: SyntheticFault
  ): Promise<VedicMutationEngineeringObservation> {
    this.#assertOpen();
    const base = await validateStoredEnvelope(
      await readRawEnvelope(this.#database),
      this.#databaseNameSha256
    );
    if (candidate.expectedGenerationId !== base.generationId) fail("GENERATION_MISMATCH");
    if (candidate.expectedMutationEpoch !== base.mutationEpoch) fail("STALE_MUTATION_EPOCH");
    if (candidate.expectedBaseEnvelopeDigest !== base.envelopeDigest) fail("BASE_SNAPSHOT_MISMATCH");
    const next = await validateStoredEnvelope(
      structuredClone(await buildNextEnvelope(base, candidate, restoreSnapshotDigest)),
      this.#databaseNameSha256
    );
    return commitEnvelopeAtomically(this.#database, canonicalize(base), next, syntheticFault);
  }

  #assertOpen(): void {
    if (this.#closed) fail("DATABASE_OPEN_FAILED");
  }
}

export async function openVedicEphemeralMutationEpochRuntimeExperiment(
  indexedDb: IDBFactory,
  databaseName: string
): Promise<VedicEphemeralMutationEpochRuntimeExperiment> {
  if (typeof databaseName !== "string" || !DATABASE_NAME_PATTERN.test(databaseName)) {
    fail("DATABASE_NAME_NOT_EPHEMERAL");
  }
  const databaseNameSha256 = await sha256({ domain: "ephemeral-database-name", databaseName });
  const database = await openDatabase(indexedDb, databaseName);
  try {
    const genesis = await createGenesisEnvelope(databaseNameSha256, crypto.randomUUID());
    const raw = await initializeEnvelope(database, genesis);
    await validateStoredEnvelope(raw, databaseNameSha256);
    return new VedicEphemeralMutationEpochRuntimeExperiment(database, databaseNameSha256);
  } catch (cause) {
    database.close();
    throw cause;
  }
}

export function deleteVedicEphemeralMutationEpochRuntimeExperiment(
  indexedDb: IDBFactory,
  databaseName: string
): Promise<void> {
  if (typeof databaseName !== "string" || !DATABASE_NAME_PATTERN.test(databaseName)) {
    return Promise.reject(new VedicEphemeralRuntimeError("DATABASE_NAME_NOT_EPHEMERAL"));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDb.deleteDatabase(databaseName);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(new VedicEphemeralRuntimeError("DATABASE_OPEN_FAILED"));
    request.onblocked = () => reject(new VedicEphemeralRuntimeError("DATABASE_DELETE_BLOCKED"));
  });
}

export function createVedicEphemeralExperimentDatabaseName(): string {
  return `${VEDIC_EPHEMERAL_DATABASE_PREFIX}${crypto.randomUUID()}`;
}
