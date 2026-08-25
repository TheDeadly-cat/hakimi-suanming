export type BaziCitationObservationLifecycleStoreOperationKind = "save" | "delete";

export type BaziCitationObservationLifecycleStoreOperationInput = Readonly<{
  kind: BaziCitationObservationLifecycleStoreOperationKind;
  scopeIdentitySha256: string;
  expectedContentHash: string;
  expectedSidecarSha256: string;
  attachmentId: string | null;
  startedAt: string;
}>;

export type BaziCitationObservationLifecycleStoreOperation = Readonly<
  BaziCitationObservationLifecycleStoreOperationInput & { token: number }
>;

export type BaziCitationObservationLifecycleStoreCompletionCode =
  | "saved_created"
  | "saved_existing"
  | "deleted"
  | "saved_present_after_reconciliation"
  | "deleted_absent_after_reconciliation";

export type BaziCitationObservationLifecycleStoreCompletionInput = Readonly<{
  code: "saved_created" | "saved_existing" | "deleted";
  attachmentId: string;
}>;

export type BaziCitationObservationLifecycleStoreCompletionReceipt = Readonly<{
  operationToken: number;
  kind: BaziCitationObservationLifecycleStoreOperationKind;
  code: BaziCitationObservationLifecycleStoreCompletionCode;
  scopeIdentitySha256: string;
  expectedContentHash: string;
  expectedSidecarSha256: string;
  attachmentId: string;
  startedAt: string;
}>;

export type BaziCitationObservationLifecycleStoreReconciliationErrorCode =
  | "call_outcome_unknown"
  | "returned_receipt_invalid"
  | "catalog_refresh_failed_after_return"
  | "operation_interrupted";

export type BaziCitationObservationLifecycleStorePreMutationFailurePhase =
  | "input"
  | "release_gate"
  | "catalog_read"
  | "content_read"
  | "prewrite";

export type BaziCitationObservationLifecycleStoreReconciliationIssue = Readonly<{
  operation: BaziCitationObservationLifecycleStoreOperation;
  errorCode: BaziCitationObservationLifecycleStoreReconciliationErrorCode;
}>;

export type BaziCitationObservationLifecycleStoreCatalogEntry = Readonly<{
  attachmentId: string;
  contentHash: string;
}>;

export type BaziCitationObservationLifecycleStoreCatalogReconciliationOutcome = Readonly<{
  scopeIdentitySha256: string;
  coverage: "complete" | "incomplete";
  atomicStorageSnapshotVerified: boolean;
  entries: readonly BaziCitationObservationLifecycleStoreCatalogEntry[];
}>;

export type BaziCitationObservationLifecycleStoreCatalogReconciliationResolution =
  | "completed"
  | "idle"
  | "locked"
  | "rejected";

export type BaziCitationObservationLifecycleStoreOperationSnapshot =
  | Readonly<{
    status: "idle";
    operation: null;
    receipt: null;
    issue: null;
  }>
  | Readonly<{
    status: "writing";
    operation: BaziCitationObservationLifecycleStoreOperation;
    receipt: null;
    issue: null;
  }>
  | Readonly<{
    status: "completed_unacknowledged";
    operation: null;
    receipt: BaziCitationObservationLifecycleStoreCompletionReceipt;
    issue: null;
  }>
  | Readonly<{
    status: "reconciliation_required";
    operation: null;
    receipt: null;
    issue: BaziCitationObservationLifecycleStoreReconciliationIssue;
  }>;

const SHA256 = /^[a-f0-9]{64}$/u;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const MAX_CATALOG_ENTRIES = 64;
const OPERATION_INPUT_KEYS = Object.freeze([
  "kind",
  "scopeIdentitySha256",
  "expectedContentHash",
  "expectedSidecarSha256",
  "attachmentId",
  "startedAt"
] as const);
const COMPLETION_INPUT_KEYS = Object.freeze(["code", "attachmentId"] as const);
const CATALOG_OUTCOME_KEYS = Object.freeze([
  "scopeIdentitySha256",
  "coverage",
  "atomicStorageSnapshotVerified",
  "entries"
] as const);
const CATALOG_ENTRY_KEYS = Object.freeze(["attachmentId", "contentHash"] as const);
const RECONCILIATION_ERROR_CODES = new Set<BaziCitationObservationLifecycleStoreReconciliationErrorCode>([
  "call_outcome_unknown",
  "returned_receipt_invalid",
  "catalog_refresh_failed_after_return",
  "operation_interrupted"
]);
const PRE_MUTATION_FAILURE_PHASES = new Set<BaziCitationObservationLifecycleStorePreMutationFailurePhase>([
  "input",
  "release_gate",
  "catalog_read",
  "content_read",
  "prewrite"
]);

const idleSnapshot: BaziCitationObservationLifecycleStoreOperationSnapshot = Object.freeze({
  status: "idle",
  operation: null,
  receipt: null,
  issue: null
});

let nextOperationToken = 0;
let currentSnapshot: BaziCitationObservationLifecycleStoreOperationSnapshot = idleSnapshot;
const listeners = new Set<() => void>();
let beforeUnloadGuardAttached = false;

function strictOwnDataRecord(
  value: unknown,
  expectedKeys: readonly string[]
): Readonly<Record<string, unknown>> | null {
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) return null;
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string")) return null;
  const actualKeys = (ownKeys as string[]).sort();
  const requiredKeys = [...expectedKeys].sort();
  if (
    actualKeys.length !== requiredKeys.length
    || actualKeys.some((key, index) => key !== requiredKeys[index])
  ) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const result = Object.create(null) as Record<string, unknown>;
  for (const key of requiredKeys) {
    const descriptor = descriptors[key];
    if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) return null;
    result[key] = descriptor.value;
  }
  return result;
}

function canonicalStartedAt(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 64) return false;
  try {
    return new Date(value).toISOString() === value;
  } catch {
    return false;
  }
}

function captureOperationInput(
  input: unknown
): BaziCitationObservationLifecycleStoreOperationInput | null {
  const value = strictOwnDataRecord(input, OPERATION_INPUT_KEYS);
  if (!value) return null;
  const kind = value.kind;
  const attachmentId = value.attachmentId;
  if (
    (kind !== "save" && kind !== "delete")
    || typeof value.scopeIdentitySha256 !== "string"
    || !SHA256.test(value.scopeIdentitySha256)
    || typeof value.expectedContentHash !== "string"
    || !SHA256.test(value.expectedContentHash)
    || typeof value.expectedSidecarSha256 !== "string"
    || !SHA256.test(value.expectedSidecarSha256)
    || !canonicalStartedAt(value.startedAt)
    || (kind === "save" ? attachmentId !== null : typeof attachmentId !== "string" || !UUID.test(attachmentId))
  ) return null;
  return Object.freeze({
    kind,
    scopeIdentitySha256: value.scopeIdentitySha256,
    expectedContentHash: value.expectedContentHash,
    expectedSidecarSha256: value.expectedSidecarSha256,
    attachmentId: attachmentId as string | null,
    startedAt: value.startedAt
  });
}

function captureCompletionInput(
  input: unknown,
  operation: BaziCitationObservationLifecycleStoreOperation
): BaziCitationObservationLifecycleStoreCompletionInput | null {
  const value = strictOwnDataRecord(input, COMPLETION_INPUT_KEYS);
  if (
    !value
    || typeof value.attachmentId !== "string"
    || !UUID.test(value.attachmentId)
    || (operation.kind === "save"
      ? value.code !== "saved_created" && value.code !== "saved_existing"
      : value.code !== "deleted" || value.attachmentId !== operation.attachmentId)
  ) return null;
  return Object.freeze({
    code: value.code as BaziCitationObservationLifecycleStoreCompletionInput["code"],
    attachmentId: value.attachmentId
  });
}

function captureDenseCatalogEntries(
  input: unknown
): readonly BaziCitationObservationLifecycleStoreCatalogEntry[] | null {
  if (
    !Array.isArray(input)
    || Object.getPrototypeOf(input) !== Array.prototype
    || input.length > MAX_CATALOG_ENTRIES
  ) return null;
  const ownKeys = Reflect.ownKeys(input);
  if (
    ownKeys.some((key) => typeof key !== "string")
    || ownKeys.length !== input.length + 1
    || !ownKeys.includes("length")
  ) return null;
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const entries: BaziCitationObservationLifecycleStoreCatalogEntry[] = [];
  const seenAttachmentIds = new Set<string>();
  for (let index = 0; index < input.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) return null;
    const value = strictOwnDataRecord(descriptor.value, CATALOG_ENTRY_KEYS);
    if (
      !value
      || typeof value.attachmentId !== "string"
      || !UUID.test(value.attachmentId)
      || typeof value.contentHash !== "string"
      || !SHA256.test(value.contentHash)
      || seenAttachmentIds.has(value.attachmentId)
    ) return null;
    seenAttachmentIds.add(value.attachmentId);
    entries.push(Object.freeze({
      attachmentId: value.attachmentId,
      contentHash: value.contentHash
    }));
  }
  entries.sort((left, right) => left.attachmentId.localeCompare(right.attachmentId));
  return Object.freeze(entries);
}

function captureCatalogOutcome(
  input: unknown
): BaziCitationObservationLifecycleStoreCatalogReconciliationOutcome | null {
  const value = strictOwnDataRecord(input, CATALOG_OUTCOME_KEYS);
  if (
    !value
    || typeof value.scopeIdentitySha256 !== "string"
    || !SHA256.test(value.scopeIdentitySha256)
    || (value.coverage !== "complete" && value.coverage !== "incomplete")
    || typeof value.atomicStorageSnapshotVerified !== "boolean"
  ) return null;
  const entries = captureDenseCatalogEntries(value.entries);
  if (!entries) return null;
  return Object.freeze({
    scopeIdentitySha256: value.scopeIdentitySha256,
    coverage: value.coverage,
    atomicStorageSnapshotVerified: value.atomicStorageSnapshotVerified,
    entries
  });
}

function guardUnreconciledLifecycleStoreExit(event: BeforeUnloadEvent): void {
  event.preventDefault();
  event.returnValue = "";
}

function synchronizeBeforeUnloadGuard(
  snapshot: BaziCitationObservationLifecycleStoreOperationSnapshot
): void {
  if (typeof window === "undefined") return;
  const shouldGuard = snapshot.status === "writing" || snapshot.status === "reconciliation_required";
  if (shouldGuard === beforeUnloadGuardAttached) return;
  if (shouldGuard) {
    window.addEventListener("beforeunload", guardUnreconciledLifecycleStoreExit);
  } else {
    window.removeEventListener("beforeunload", guardUnreconciledLifecycleStoreExit);
  }
  beforeUnloadGuardAttached = shouldGuard;
}

function publish(snapshot: BaziCitationObservationLifecycleStoreOperationSnapshot): void {
  currentSnapshot = snapshot;
  synchronizeBeforeUnloadGuard(snapshot);
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch {
      // One mounted view cannot prevent the global coordinator from publishing.
    }
  }
}

function completionReceipt(
  operation: BaziCitationObservationLifecycleStoreOperation,
  code: BaziCitationObservationLifecycleStoreCompletionCode,
  attachmentId: string
): BaziCitationObservationLifecycleStoreCompletionReceipt {
  return Object.freeze({
    operationToken: operation.token,
    kind: operation.kind,
    code,
    scopeIdentitySha256: operation.scopeIdentitySha256,
    expectedContentHash: operation.expectedContentHash,
    expectedSidecarSha256: operation.expectedSidecarSha256,
    attachmentId,
    startedAt: operation.startedAt
  });
}

function publishCompletion(receipt: BaziCitationObservationLifecycleStoreCompletionReceipt): void {
  publish(Object.freeze({
    status: "completed_unacknowledged",
    operation: null,
    receipt,
    issue: null
  }));
}

export function getBaziCitationObservationLifecycleStoreOperationSnapshot():
BaziCitationObservationLifecycleStoreOperationSnapshot {
  return currentSnapshot;
}

export function subscribeBaziCitationObservationLifecycleStoreOperation(
  listener: () => void
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function acquireBaziCitationObservationLifecycleStoreOperation(
  rawInput: unknown
): BaziCitationObservationLifecycleStoreOperation | null {
  if (currentSnapshot.status !== "idle") return null;
  const input = captureOperationInput(rawInput);
  if (!input) throw new TypeError("Lifecycle store operation input is invalid or unsafe.");
  const operation = Object.freeze({ ...input, token: ++nextOperationToken });
  publish(Object.freeze({
    status: "writing",
    operation,
    receipt: null,
    issue: null
  }));
  return operation;
}

export function isCurrentBaziCitationObservationLifecycleStoreOperation(
  operation: BaziCitationObservationLifecycleStoreOperation
): boolean {
  return currentSnapshot.status === "writing" && currentSnapshot.operation === operation;
}

export function completeBaziCitationObservationLifecycleStoreOperation(
  operation: BaziCitationObservationLifecycleStoreOperation,
  rawCompletion: unknown
): BaziCitationObservationLifecycleStoreCompletionReceipt | null {
  if (!isCurrentBaziCitationObservationLifecycleStoreOperation(operation)) return null;
  const completion = captureCompletionInput(rawCompletion, operation);
  if (!completion) return null;
  const receipt = completionReceipt(operation, completion.code, completion.attachmentId);
  publishCompletion(receipt);
  return receipt;
}

/**
 * Releases the singleton only when the caller received a typed adapter failure
 * whose phase proves that no storage mutation was committed. This also covers
 * a trusted exact-purpose admission rejection raised before its transaction's
 * add step. Unknown failures must use the reconciliation-required path instead.
 */
export function cancelBaziCitationObservationLifecycleStoreOperationBeforeMutation(
  operation: BaziCitationObservationLifecycleStoreOperation,
  phase: BaziCitationObservationLifecycleStorePreMutationFailurePhase
): boolean {
  if (
    !isCurrentBaziCitationObservationLifecycleStoreOperation(operation)
    || !PRE_MUTATION_FAILURE_PHASES.has(phase)
  ) return false;
  publish(idleSnapshot);
  return true;
}

export function requireBaziCitationObservationLifecycleStoreOperationReconciliation(
  operation: BaziCitationObservationLifecycleStoreOperation,
  errorCode: BaziCitationObservationLifecycleStoreReconciliationErrorCode
): BaziCitationObservationLifecycleStoreReconciliationIssue | null {
  if (
    !isCurrentBaziCitationObservationLifecycleStoreOperation(operation)
    || !RECONCILIATION_ERROR_CODES.has(errorCode)
  ) return null;
  const issue = Object.freeze({ operation, errorCode });
  publish(Object.freeze({
    status: "reconciliation_required",
    operation: null,
    receipt: null,
    issue
  }));
  return issue;
}

export function acknowledgeBaziCitationObservationLifecycleStoreOperationCompletion(
  receipt: BaziCitationObservationLifecycleStoreCompletionReceipt
): boolean {
  if (
    currentSnapshot.status !== "completed_unacknowledged"
    || currentSnapshot.receipt !== receipt
  ) return false;
  publish(idleSnapshot);
  return true;
}

export function reconcileBaziCitationObservationLifecycleStoreOperationCatalog(
  issue: BaziCitationObservationLifecycleStoreReconciliationIssue,
  rawOutcome: unknown
): BaziCitationObservationLifecycleStoreCatalogReconciliationResolution {
  if (
    currentSnapshot.status !== "reconciliation_required"
    || currentSnapshot.issue !== issue
  ) return "rejected";
  const outcome = captureCatalogOutcome(rawOutcome);
  if (!outcome || outcome.scopeIdentitySha256 !== issue.operation.scopeIdentitySha256) {
    return "rejected";
  }
  if (outcome.coverage !== "complete" || outcome.atomicStorageSnapshotVerified !== true) {
    return "locked";
  }

  const operation = issue.operation;
  if (operation.kind === "save") {
    const matchingEntries = outcome.entries.filter(
      (entry) => entry.contentHash === operation.expectedContentHash
    );
    if (matchingEntries.length > 1) return "locked";
    const present = matchingEntries[0];
    if (!present) {
      publish(idleSnapshot);
      return "idle";
    }
    publishCompletion(completionReceipt(
      operation,
      "saved_present_after_reconciliation",
      present.attachmentId
    ));
    return "completed";
  }

  const target = outcome.entries.find((entry) => entry.attachmentId === operation.attachmentId);
  if (!target) {
    publishCompletion(completionReceipt(
      operation,
      "deleted_absent_after_reconciliation",
      operation.attachmentId!
    ));
    return "completed";
  }
  if (target.contentHash === operation.expectedContentHash) {
    publish(idleSnapshot);
    return "idle";
  }
  return "locked";
}

/** Test isolation only. Production reconciliation must use a complete atomic catalog. */
export function resetBaziCitationObservationLifecycleStoreOperationCoordinatorForTests(): void {
  if (import.meta.env.MODE !== "test") {
    throw new Error("Lifecycle store operation coordinator reset is test-only.");
  }
  nextOperationToken = 0;
  publish(idleSnapshot);
}
