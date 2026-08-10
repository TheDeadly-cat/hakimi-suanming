export const FULL_BACKUP_EXPORT_MARKER_KEY = "hakimi:backup-health:v1:lastFullBackupExportedAt";

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem">;
type RemovableStorage = Pick<Storage, "removeItem">;

/**
 * Operational backup-health marker. It lives in localStorage, is not part of
 * any user backup payload, and is deliberately treated as "confirmed export
 * requested/saved" rather than proof that the file was opened later.
 */
export function readLastFullBackupExportedAt(storage: ReadableStorage): string | null {
  const raw = storage.getItem(FULL_BACKUP_EXPORT_MARKER_KEY);
  return raw && ISO_DATETIME.test(raw) ? raw : null;
}

export function markFullBackupExportedAt(
  storage: WritableStorage,
  at = new Date().toISOString()
): void {
  storage.setItem(FULL_BACKUP_EXPORT_MARKER_KEY, at);
}

export function clearFullBackupExportMarker(storage: RemovableStorage): void {
  storage.removeItem(FULL_BACKUP_EXPORT_MARKER_KEY);
}
