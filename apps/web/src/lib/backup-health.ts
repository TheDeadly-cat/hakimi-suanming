export const FULL_BACKUP_EXPORT_MARKER_KEY = "hakimi:backup-health:v1:lastFullBackupExportedAt";

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem">;
type RemovableStorage = Pick<Storage, "removeItem">;

export type FullBackupExportMarkerInspection =
  | { status: "recorded"; exportedAt: string; exportedAtMs: number }
  | {
      status: "missing" | "storage_unavailable" | "invalid" | "future" | "clock_unavailable";
      exportedAt: null;
      exportedAtMs: null;
    };

function emptyInspection(
  status: Exclude<FullBackupExportMarkerInspection["status"], "recorded">
): FullBackupExportMarkerInspection {
  return Object.freeze({ status, exportedAt: null, exportedAtMs: null });
}

function parseCanonicalIsoDateTime(value: string): number | null {
  if (!ISO_DATETIME.test(value)) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;

  const normalizedValue = value.includes(".")
    ? value.replace(/\.(\d{1,3})Z$/, (_, fraction: string) => `.${fraction.padEnd(3, "0")}Z`)
    : value.replace(/Z$/, ".000Z");

  return new Date(timestamp).toISOString() === normalizedValue ? timestamp : null;
}

export function inspectFullBackupExportMarker(
  storage: ReadableStorage,
  now = Date.now()
): FullBackupExportMarkerInspection {
  let raw: string | null;
  try {
    raw = storage.getItem(FULL_BACKUP_EXPORT_MARKER_KEY);
  } catch {
    return emptyInspection("storage_unavailable");
  }

  if (raw === null) return emptyInspection("missing");
  const timestamp = parseCanonicalIsoDateTime(raw);
  if (timestamp === null) return emptyInspection("invalid");
  if (!Number.isSafeInteger(now) || now < 0) return emptyInspection("clock_unavailable");
  if (timestamp - now > MAX_FUTURE_CLOCK_SKEW_MS) {
    return emptyInspection("future");
  }
  return Object.freeze({
    status: "recorded",
    exportedAt: new Date(timestamp).toISOString(),
    exportedAtMs: timestamp
  });
}

/**
 * Operational backup-health marker. It lives in localStorage, is not part of
 * any user backup payload, and is deliberately treated as "confirmed export
 * requested/saved" rather than proof that the file was opened later.
 */
export function readLastFullBackupExportedAt(
  storage: ReadableStorage,
  now = Date.now()
): string | null {
  const inspection = inspectFullBackupExportMarker(storage, now);
  return inspection.status === "recorded" ? inspection.exportedAt : null;
}

export function markFullBackupExportedAt(
  storage: WritableStorage,
  at = new Date().toISOString()
): void {
  const timestamp = parseCanonicalIsoDateTime(at);
  if (timestamp === null) {
    throw new TypeError("备份导出时间必须是有效的 UTC ISO 日期时间。");
  }
  storage.setItem(FULL_BACKUP_EXPORT_MARKER_KEY, new Date(timestamp).toISOString());
}

export function clearFullBackupExportMarker(storage: RemovableStorage): void {
  storage.removeItem(FULL_BACKUP_EXPORT_MARKER_KEY);
}
