export const STORAGE_ADMISSION_POLICY_VERSION = 1 as const;
export const STORAGE_ADMISSION_PERSISTED_MULTIPLIER = 1.25;
export const STORAGE_ADMISSION_MIN_HEADROOM_BYTES = 32 * 1024 * 1024;
export const STORAGE_ADMISSION_QUOTA_HEADROOM_RATIO = 0.05;

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
    super(plan.state === "insufficient"
      ? "浏览器报告的可用空间不足以安全完成事务写入；本次写入已停止。"
      : "浏览器未提供可靠的站点容量估算；为避免半途耗尽空间，本次写入已停止。");
    this.name = "StorageAdmissionError";
  }
}

function finiteNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function invalidPlan(
  request: StorageAdmissionRequest,
  checkedAt: string,
  reason: Extract<StorageAdmissionReason, "ESTIMATE_UNAVAILABLE" | "ESTIMATE_INVALID" | "REQUEST_INVALID">
): StorageAdmissionPlan {
  return {
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
  };
}

function safeCeil(value: number): number | null {
  if (!Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) return null;
  const rounded = Math.ceil(value);
  return Number.isSafeInteger(rounded) ? rounded : null;
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
  const checkedAt = runtime.now?.() ?? new Date().toISOString();
  if (
    !finiteNonNegativeInteger(request.logicalPayloadBytes) ||
    request.logicalPayloadBytes === 0 ||
    typeof request.payloadDigest !== "string" ||
    request.payloadDigest.length === 0
  ) {
    return invalidPlan(request, checkedAt, "REQUEST_INVALID");
  }

  const estimate = runtime.estimate ?? (() => {
    if (typeof navigator === "undefined" || typeof navigator.storage?.estimate !== "function") {
      return Promise.reject(new Error("Storage estimate unavailable"));
    }
    return navigator.storage.estimate();
  });

  let raw: Pick<StorageEstimate, "usage" | "quota">;
  try {
    raw = await estimate();
  } catch {
    return invalidPlan(request, checkedAt, "ESTIMATE_UNAVAILABLE");
  }
  if (
    !finiteNonNegativeInteger(raw.usage) ||
    !finiteNonNegativeInteger(raw.quota) ||
    raw.quota === 0
  ) {
    return invalidPlan(request, checkedAt, "ESTIMATE_INVALID");
  }

  const estimatedPersistedPayloadBytes = safeCeil(
    request.logicalPayloadBytes * STORAGE_ADMISSION_PERSISTED_MULTIPLIER
  );
  const fixedHeadroomBytes = safeCeil(Math.max(
    STORAGE_ADMISSION_MIN_HEADROOM_BYTES,
    raw.quota * STORAGE_ADMISSION_QUOTA_HEADROOM_RATIO
  ));
  if (estimatedPersistedPayloadBytes === null || fixedHeadroomBytes === null) {
    return invalidPlan(request, checkedAt, "REQUEST_INVALID");
  }
  const rollbackReserveBytes = estimatedPersistedPayloadBytes;
  const requiredAdditionalBytes = safeCeil(
    estimatedPersistedPayloadBytes + rollbackReserveBytes + fixedHeadroomBytes
  );
  if (requiredAdditionalBytes === null) {
    return invalidPlan(request, checkedAt, "REQUEST_INVALID");
  }

  const availableBytes = Math.max(0, raw.quota - raw.usage);
  const admitted = raw.usage <= raw.quota && availableBytes >= requiredAdditionalBytes;
  const reason: StorageAdmissionReason = raw.usage > raw.quota
    ? "USAGE_EXCEEDS_QUOTA"
    : admitted
      ? "CAPACITY_AVAILABLE"
      : "CAPACITY_INSUFFICIENT";
  const state: StorageAdmissionState = admitted ? "admitted" : "insufficient";
  return {
    policyVersion: STORAGE_ADMISSION_POLICY_VERSION,
    operation: request.operation,
    payloadDigest: request.payloadDigest,
    checkedAt,
    state,
    reason,
    logicalPayloadBytes: request.logicalPayloadBytes,
    estimatedPersistedPayloadBytes,
    rollbackReserveBytes,
    fixedHeadroomBytes,
    usageBytes: raw.usage,
    quotaBytes: raw.quota,
    availableBytes,
    requiredAdditionalBytes,
    admissionToken: admitted
      ? [
        STORAGE_ADMISSION_POLICY_VERSION,
        request.operation,
        request.payloadDigest,
        raw.usage,
        raw.quota,
        requiredAdditionalBytes,
        checkedAt
      ].join(":")
      : null
  };
}

export function requireStorageAdmission(plan: StorageAdmissionPlan): void {
  if (plan.state === "admitted" && plan.admissionToken) return;
  throw new StorageAdmissionError(
    plan.state === "insufficient"
      ? "STORAGE_CAPACITY_INSUFFICIENT"
      : "STORAGE_ESTIMATE_UNAVAILABLE",
    plan
  );
}

function nestedErrors(value: Record<PropertyKey, unknown>): unknown[] {
  const nested = [value.cause, value.inner];
  if (Array.isArray(value.failures)) nested.push(...value.failures);
  const failuresByPos = value.failuresByPos;
  if (failuresByPos && typeof failuresByPos === "object") {
    nested.push(...Object.values(failuresByPos as Record<string, unknown>));
  }
  return nested;
}

/** Classifies direct DOM errors and the wrappers used by Dexie/BulkError without matching localized messages. */
export function isStorageQuotaExceededError(reason: unknown): boolean {
  const pending: unknown[] = [reason];
  const seen = new Set<object>();
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || typeof current !== "object") continue;
    if (seen.has(current)) continue;
    seen.add(current);
    const value = current as Record<PropertyKey, unknown>;
    if (value.name === "QuotaExceededError") return true;
    pending.push(...nestedErrors(value));
  }
  return false;
}

