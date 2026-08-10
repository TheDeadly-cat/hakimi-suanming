import { describe, expect, it } from "vitest";
import {
  clearFullBackupExportMarker,
  FULL_BACKUP_EXPORT_MARKER_KEY,
  markFullBackupExportedAt,
  readLastFullBackupExportedAt
} from "./backup-health";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    },
    values
  };
}

describe("backup health marker", () => {
  it("写入、读取并清除合法 ISO 时间标记", () => {
    const storage = memoryStorage();
    expect(readLastFullBackupExportedAt(storage)).toBeNull();

    markFullBackupExportedAt(storage, "2026-08-10T00:00:00.000Z");
    expect(storage.values.get(FULL_BACKUP_EXPORT_MARKER_KEY)).toBe("2026-08-10T00:00:00.000Z");
    expect(readLastFullBackupExportedAt(storage)).toBe("2026-08-10T00:00:00.000Z");

    clearFullBackupExportMarker(storage);
    expect(storage.values.has(FULL_BACKUP_EXPORT_MARKER_KEY)).toBe(false);
    expect(readLastFullBackupExportedAt(storage)).toBeNull();
  });

  it("拒绝损坏或非 ISO 标记，不把坏值展示为备份时间", () => {
    const storage = memoryStorage();
    storage.setItem(FULL_BACKUP_EXPORT_MARKER_KEY, "not-a-time");
    expect(readLastFullBackupExportedAt(storage)).toBeNull();

    storage.setItem(FULL_BACKUP_EXPORT_MARKER_KEY, "2026-08-10");
    expect(readLastFullBackupExportedAt(storage)).toBeNull();
  });
});
