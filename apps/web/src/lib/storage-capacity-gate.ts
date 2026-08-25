export const STORAGE_ADMISSION_POLICY_VERSION = 1 as const;
export const STORAGE_ADMISSION_PERSISTED_MULTIPLIER = 1.25;
export const STORAGE_ADMISSION_MIN_HEADROOM_BYTES = 32 * 1024 * 1024;
export const STORAGE_ADMISSION_QUOTA_HEADROOM_RATIO = 0.05;
const MAX_NESTED_STORAGE_ERROR_NODES = 256;
const CANONICAL_PAYLOAD_DIGEST = /^[0-9a-f]{64}$/u;

export type StorageAdmissionOperation = "full_restore" | "shadow_materialization";
export type StorageAdmissionState = "admitted" | "insufficient" | "unavailable";
export type StorageAdmissionReason =
  | "CAPACITY_AVAILABLE"
  | "CAPACITY_INSUFFICIENT"
  | "USAGE_EXCEEDS_QUOTA"
  | "ESTIMATE_UNAVAILABLE"
  | "ESTIMATE_INVALID"
  | "REQUEST_INVALID";

export type StorageAdmissionRequest = {
  operation: StorageAdmissionOperation;
  /** Canonical, uncompressed full-backup JSON bytes; compressed ZIP bytes are intentionally excluded. */
  logicalPayloadBytes: number;
  payloadDigest: string;
};

export type StorageAdmissionPlan = {
  policyVersion: typeof STORAGE_ADMISSION_POLICY_VERSION;
  operation: StorageAdmissionOperation;
  payloadDigest: string;
  checkedAt: string;
  state: StorageAdmissionState;
  reason: StorageAdmissionReason;
  logicalPayloadBytes: number;
  estimatedPersistedPayloadBytes: number | null;
  rollbackReserveBytes: number | null;
  fixedHeadroomBytes: number | null;
  usageBytes: number | null;
  quotaBytes: number | null;
  availableBytes: number | null;
  requiredAdditionalBytes: number | null;
  admissionToken: string | null;
};

export type StorageCapacityRuntime = {
  estimate?: () => Promise<Pick<StorageEstimate, "usage" | "quota">>;
  now?: () => string;
};

export type StorageAdmissionErrorCode =
  | "STORAGE_ESTIMATE_UNAVAILABLE"
  | "STORAGE_CAPACITY_INSUFFICIENT";

export class StorageAdmissionError extends Error {
  constructor(
    readonly code: StorageAdmissionErrorCode,
    readonly plan: StorageAdmissionPlan
  ) {
    super(code === "STORAGE_CAPACITY_INSUFFICIENT"
      ? "浏览器报告的可用空间不足以安全完成事务写入；本次写入已停止。"
      : "浏览器未提供可靠的站点容量估算；为避免半途耗尽空间，本次写入已停止。");
    this.name = "StorageAdmissionError";
  }
}

function finiteNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isStorageAdmissionOperation(value: unknown): value is StorageAdmissionOperation {
  return value === "full_restore" || value === "shadow_materialization";
}

function snapshotStorageAdmissionRequest(value: unknown): {
  request: StorageAdmissionRequest;
  valid: boolean;
} {
  const fallback: StorageAdmissionRequest = {
    operation: "full_restore",
    logicalPayloadBytes: 0,
    payloadDigest: ""
  };
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { request: fallback, valid: false };
  }
  try {
    const record = value as Record<string, unknown>;
    const operation = record.operation;
    const logicalPayloadBytes = record.logicalPayloadBytes;
    const payloadDigest = record.payloadDigest;
    const valid = isStorageAdmissionOperation(operation)
      && finiteNonNegativeInteger(logicalPayloadBytes)
      && logicalPayloadBytes > 0
      && typeof payloadDigest === "string"
      && CANONICAL_PAYLOAD_DIGEST.test(payloadDigest);
    return {
      request: {
        operation: isStorageAdmissionOperation(operation) ? operation : fallback.operation,
        logicalPayloadBytes: finiteNonNegativeInteger(logicalPayloadBytes) ? logicalPayloadBytes : 0,
        payloadDigest: typeof payloadDigest === "string" && payloadDigest.length <= 64
          ? payloadDigest
          : ""
      },
      valid
    };
  } catch {
    return { request: fallback, valid: false };
  }
}

function resolveCheckedAt(now?: () => string): string {
  try {
    const candidate = now?.() ?? new Date().toISOString();
    if (typeof candidate === "string" && candidate.length <= 64) {
      const timestamp = Date.parse(candidate);
      if (Number.isFinite(timestamp)) return new Date(timestamp).toISOString();
    }
  } catch {
    // Fall back to the current clock when an injected diagnostics clock fails.
  }
  return new Date().toISOString();
}

function invalidPlan(
  request: StorageAdmissionRequest,
  checkedAt: string,
  reason: Extract<StorageAdmissionReason, "ESTIMATE_UNAVAILABLE" | "ESTIMATE_INVALID" | "REQUEST_INVALID">
): StorageAdmissionPlan {
  return Object.freeze({
    policyVersion: STORAGE_ADMISSION_POLICY_VERSION,
    operation: request.operation,
    payloadDigest: request.payloadDigest,
    checkedAt,
    state: "unavailable",
    reason,
    logicalPayloadBytes: request.logicalPayloadBytes,
    estimatedPersistedPayloadBytes: null,
    rollbackReserveBytes: null,
    fixedHeadroomBytes: null,
    usageBytes: null,
    quotaBytes: null,
    availableBytes: null,
    requiredAdditionalBytes: null,
    admissionToken: null
  });
}

function safeCeil(value: number): number | null {
  if (!Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) return null;
  const rounded = Math.ceil(value);
  return Number.isSafeInteger(rounded) ? rounded : null;
}

function buildAdmissionToken(
  operation: StorageAdmissionOperation,
  payloadDigest: string,
  usageBytes: number,
  quotaBytes: number,
  requiredAdditionalBytes: number,
  checkedAt: string
): string {
  return [
    STORAGE_ADMISSION_POLICY_VERSION,
    operation,
    payloadDigest,
    usageBytes,
    quotaBytes,
    requiredAdditionalBytes,
    checkedAt
  ].join(":");
}

function isCanonicalCheckedAt(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 64) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function isValidAdmittedPlan(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  try {
    const plan = value as StorageAdmissionPlan;
    if (
      plan.policyVersion !== STORAGE_ADMISSION_POLICY_VERSION
      || plan.state !== "admitted"
      || plan.reason !== "CAPACITY_AVAILABLE"
      || !isStorageAdmissionOperation(plan.operation)
      || !CANONICAL_PAYLOAD_DIGEST.test(plan.payloadDigest)
      || !isCanonicalCheckedAt(plan.checkedAt)
      || !finiteNonNegativeInteger(plan.logicalPayloadBytes)
      || plan.logicalPayloadBytes === 0
      || !finiteNonNegativeInteger(plan.estimatedPersistedPayloadBytes)
      || !finiteNonNegativeInteger(plan.rollbackReserveBytes)
      || !finiteNonNegativeInteger(plan.fixedHeadroomBytes)
      || !finiteNonNegativeInteger(plan.usageBytes)
      || !finiteNonNegativeInteger(plan.quotaBytes)
      || plan.quotaBytes === 0
      || !finiteNonNegativeInteger(plan.availableBytes)
      || !finiteNonNegativeInteger(plan.requiredAdditionalBytes)
      || typeof plan.admissionToken !== "string"
      || plan.admissionToken.length === 0
    ) return false;

    const estimatedPersistedPayloadBytes = safeCeil(
      plan.logicalPayloadBytes * STORAGE_ADMISSION_PERSISTED_MULTIPLIER
    );
    const fixedHeadroomBytes = safeCeil(Math.max(
      STORAGE_ADMISSION_MIN_HEADROOM_BYTES,
      plan.quotaBytes * STORAGE_ADMISSION_QUOTA_HEADROOM_RATIO
    ));
    if (estimatedPersistedPayloadBytes === null || fixedHeadroomBytes === null) return false;
    const requiredAdditionalBytes = safeCeil(
      estimatedPersistedPayloadBytes + estimatedPersistedPayloadBytes + fixedHeadroomBytes
    );
    if (requiredAdditionalBytes === null) return false;
    const availableBytes = Math.max(0, plan.quotaBytes - plan.usageBytes);
    return plan.estimatedPersistedPayloadBytes === estimatedPersistedPayloadBytes
      && plan.rollbackReserveBytes === estimatedPersistedPayloadBytes
      && plan.fixedHeadroomBytes === fixedHeadroomBytes
      && plan.requiredAdditionalBytes === requiredAdditionalBytes
      && plan.availableBytes === availableBytes
      && plan.usageBytes <= plan.quotaBytes
      && availableBytes >= requiredAdditionalBytes
      && plan.admissionToken === buildAdmissionToken(
        plan.operation,
        plan.payloadDigest,
        plan.usageBytes,
        plan.quotaBytes,
        requiredAdditionalBytes,
        plan.checkedAt
      );
  } catch {
    return false;
  }
}

/**
 * A conservative negative gate, never a reservation guarantee. The old origin
 * usage is not subtracted because an IndexedDB transaction may retain old pages
 * while writing the new payload and its indexes/rollback state.
 */
export async function assessStorageCapacity(
  request: StorageAdmissionRequest,
  runtime: StorageCapacityRuntime = {}
): Promise<StorageAdmissionPlan> {
  const requestSnapshot = snapshotStorageAdmissionRequest(request);
  const normalizedRequest = requestSnapshot.request;
  let now: (() => string) | undefined;
  try {
    now = typeof runtime?.now === "function" ? runtime.now : undefined;
  } catch {
    now = undefined;
  }
  const checkedAt = resolveCheckedAt(now);
  if (!requestSnapshot.valid) {
    return invalidPlan(normalizedRequest, checkedAt, "REQUEST_INVALID");
  }

  let injectedEstimate: StorageCapacityRuntime["estimate"];
  try {
    injectedEstimate = runtime?.estimate;
  } catch {
    return invalidPlan(normalizedRequest, checkedAt, "ESTIMATE_UNAVAILABLE");
  }
  if (injectedEstimate !== undefined && typeof injectedEstimate !== "function") {
    return invalidPlan(normalizedRequest, checkedAt, "ESTIMATE_UNAVAILABLE");
  }
  const estimate = injectedEstimate ?? (() => {
    if (typeof navigator === "undefined" || typeof navigator.storage?.estimate !== "function") {
      return Promise.reject(new Error("Storage estimate unavailable"));
    }
    return navigator.storage.estimate();
  });

  let raw: unknown;
  try {
    raw = await Promise.resolve().then(estimate);
  } catch {
    return invalidPlan(normalizedRequest, checkedAt, "ESTIMATE_UNAVAILABLE");
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return invalidPlan(normalizedRequest, checkedAt, "ESTIMATE_INVALID");
  }
  let usageBytes: unknown;
  let quotaBytes: unknown;
  try {
    const estimateRecord = raw as Record<string, unknown>;
    if (
      !Object.prototype.hasOwnProperty.call(estimateRecord, "usage")
      || !Object.prototype.hasOwnProperty.call(estimateRecord, "quota")
    ) {
      return invalidPlan(normalizedRequest, checkedAt, "ESTIMATE_INVALID");
    }
    usageBytes = estimateRecord.usage;
    quotaBytes = estimateRecord.quota;
  } catch {
    return invalidPlan(normalizedRequest, checkedAt, "ESTIMATE_INVALID");
  }
  if (
    !finiteNonNegativeInteger(usageBytes) ||
    !finiteNonNegativeInteger(quotaBytes) ||
    quotaBytes === 0
  ) {
    return invalidPlan(normalizedRequest, checkedAt, "ESTIMATE_INVALID");
  }

  const estimatedPersistedPayloadBytes = safeCeil(
    normalizedRequest.logicalPayloadBytes * STORAGE_ADMISSION_PERSISTED_MULTIPLIER
  );
  const fixedHeadroomBytes = safeCeil(Math.max(
    STORAGE_ADMISSION_MIN_HEADROOM_BYTES,
    quotaBytes * STORAGE_ADMISSION_QUOTA_HEADROOM_RATIO
  ));
  if (estimatedPersistedPayloadBytes === null || fixedHeadroomBytes === null) {
    return invalidPlan(normalizedRequest, checkedAt, "REQUEST_INVALID");
  }
  const rollbackReserveBytes = estimatedPersistedPayloadBytes;
  const requiredAdditionalBytes = safeCeil(
    estimatedPersistedPayloadBytes + rollbackReserveBytes + fixedHeadroomBytes
  );
  if (requiredAdditionalBytes === null) {
    return invalidPlan(normalizedRequest, checkedAt, "REQUEST_INVALID");
  }

  const availableBytes = Math.max(0, quotaBytes - usageBytes);
  const admitted = usageBytes <= quotaBytes && availableBytes >= requiredAdditionalBytes;
  const reason: StorageAdmissionReason = usageBytes > quotaBytes
    ? "USAGE_EXCEEDS_QUOTA"
    : admitted
      ? "CAPACITY_AVAILABLE"
      : "CAPACITY_INSUFFICIENT";
  const state: StorageAdmissionState = admitted ? "admitted" : "insufficient";
  return Object.freeze({
    policyVersion: STORAGE_ADMISSION_POLICY_VERSION,
    operation: normalizedRequest.operation,
    payloadDigest: normalizedRequest.payloadDigest,
    checkedAt,
    state,
    reason,
    logicalPayloadBytes: normalizedRequest.logicalPayloadBytes,
    estimatedPersistedPayloadBytes,
    rollbackReserveBytes,
    fixedHeadroomBytes,
    usageBytes,
    quotaBytes,
    availableBytes,
    requiredAdditionalBytes,
    admissionToken: admitted
      ? buildAdmissionToken(
        normalizedRequest.operation,
        normalizedRequest.payloadDigest,
        usageBytes,
        quotaBytes,
        requiredAdditionalBytes,
        checkedAt
      )
      : null
  });
}

export function requireStorageAdmission(plan: StorageAdmissionPlan): void {
  if (isValidAdmittedPlan(plan)) return;
  let insufficient = false;
  try {
    insufficient = plan.state === "insufficient";
  } catch {
    insufficient = false;
  }
  throw new StorageAdmissionError(
    insufficient
      ? "STORAGE_CAPACITY_INSUFFICIENT"
      : "STORAGE_ESTIMATE_UNAVAILABLE",
    plan
  );
}

function nestedErrors(value: Record<PropertyKey, unknown>): unknown[] {
  const nested: unknown[] = [];
  const append = (candidate: unknown) => {
    if (nested.length < MAX_NESTED_STORAGE_ERROR_NODES) nested.push(candidate);
  };

  for (const key of ["cause", "inner"] as const) {
    try {
      append(value[key]);
    } catch {
      // Ignore hostile getters on third-party error wrappers.
    }
  }

  let failures: unknown;
  try {
    failures = value.failures;
  } catch {
    failures = null;
  }
  if (Array.isArray(failures)) {
    try {
      for (let index = 0; index < failures.length && nested.length < MAX_NESTED_STORAGE_ERROR_NODES; index += 1) {
        append(failures[index]);
      }
    } catch {
      // Ignore malformed array-like wrappers after retaining safe entries.
    }
  }

  let failuresByPos: unknown;
  try {
    failuresByPos = value.failuresByPos;
  } catch {
    failuresByPos = null;
  }
  if (failuresByPos && typeof failuresByPos === "object") {
    let keys: PropertyKey[] = [];
    try {
      keys = Reflect.ownKeys(failuresByPos);
    } catch {
      keys = [];
    }
    for (const key of keys) {
      if (nested.length >= MAX_NESTED_STORAGE_ERROR_NODES) break;
      try {
        append((failuresByPos as Record<PropertyKey, unknown>)[key]);
      } catch {
        // Ignore hostile getters while preserving other nested failures.
      }
    }
  }
  return nested;
}

/** Classifies direct DOM errors and the wrappers used by Dexie/BulkError without matching localized messages. */
export function isStorageQuotaExceededError(reason: unknown): boolean {
  const pending: unknown[] = [reason];
  const seen = new Set<object>();
  while (pending.length > 0 && seen.size < MAX_NESTED_STORAGE_ERROR_NODES) {
    const current = pending.pop();
    if (!current || typeof current !== "object") continue;
    if (seen.has(current)) continue;
    seen.add(current);
    const value = current as Record<PropertyKey, unknown>;
    try {
      if (value.name === "QuotaExceededError") return true;
    } catch {
      // Continue through nested failures when the wrapper name is unreadable.
    }
    for (const nested of nestedErrors(value)) {
      if (pending.length >= MAX_NESTED_STORAGE_ERROR_NODES) break;
      pending.push(nested);
    }
  }
  return false;
}
