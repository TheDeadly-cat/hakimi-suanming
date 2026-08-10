// @vitest-environment node
import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import {
  FULL_BACKUP_ARCHIVE_ENTRY,
  FullBackupArchiveError,
  createFullBackupArchiveFromJson,
  looksLikeZip,
  readFullBackupArchiveJson
} from "./archive";

function errorCode(action: () => unknown): string | null {
  try {
    action();
    return null;
  } catch (cause) {
    return cause instanceof FullBackupArchiveError ? cause.code : null;
  }
}

function findSignature(bytes: Uint8Array, signature: number): number {
  for (let offset = 0; offset <= bytes.byteLength - 4; offset += 1) {
    const actual = (
      bytes[offset]! |
      (bytes[offset + 1]! << 8) |
      (bytes[offset + 2]! << 16) |
      (bytes[offset + 3]! << 24)
    ) >>> 0;
    if (actual === signature) return offset;
  }
  return -1;
}

describe("full backup ZIP container", () => {
  it("creates deterministic one-entry archives and round trips strict UTF-8 JSON", () => {
    const json = JSON.stringify({ title: "八字研究备份", sentinel: "𠀀", value: 8 });
    const first = createFullBackupArchiveFromJson(json);
    const second = createFullBackupArchiveFromJson(json);

    expect(looksLikeZip(first)).toBe(true);
    expect([...second]).toEqual([...first]);
    expect(readFullBackupArchiveJson(first)).toBe(json);
  });

  it("rejects unexpected or multiple paths before exposing any JSON", () => {
    const traversal = zipSync({
      "../hakimi-full-backup.json": strToU8("{}")
    });
    expect(errorCode(() => readFullBackupArchiveJson(traversal))).toBe("ARCHIVE_ENTRY_INVALID");

    const multiple = zipSync({
      [FULL_BACKUP_ARCHIVE_ENTRY]: strToU8("{}"),
      "extra.json": strToU8("{}")
    });
    expect(errorCode(() => readFullBackupArchiveJson(multiple))).toBe("ARCHIVE_UNSUPPORTED");
  });

  it("enforces compressed and declared uncompressed limits before inflation", () => {
    const archive = createFullBackupArchiveFromJson(JSON.stringify({ text: "命".repeat(2_000) }));
    expect(errorCode(() => createFullBackupArchiveFromJson("{}", { maxArchiveBytes: 8 })))
      .toBe("ARCHIVE_TOO_LARGE");
    expect(errorCode(() => createFullBackupArchiveFromJson("12345", { maxJsonBytes: 4 })))
      .toBe("ARCHIVE_CONTENT_TOO_LARGE");
    expect(errorCode(() => readFullBackupArchiveJson(archive, { maxArchiveBytes: 8 })))
      .toBe("ARCHIVE_TOO_LARGE");
    expect(errorCode(() => readFullBackupArchiveJson(archive, { maxJsonBytes: 16 })))
      .toBe("ARCHIVE_CONTENT_TOO_LARGE");
  });

  it("rejects corrupt central-directory metadata and symlink entries", () => {
    const archive = createFullBackupArchiveFromJson("{}");
    const corrupt = archive.slice();
    const centralOffset = findSignature(corrupt, 0x02014b50);
    expect(centralOffset).toBeGreaterThan(0);
    corrupt[centralOffset] = 0;
    expect(errorCode(() => readFullBackupArchiveJson(corrupt))).toBe("ARCHIVE_INVALID");

    const symlink = archive.slice();
    const symlinkCentralOffset = findSignature(symlink, 0x02014b50);
    // external attributes at +38; set Unix file type to 0120000 (symlink).
    symlink[symlinkCentralOffset + 40] = 0x00;
    symlink[symlinkCentralOffset + 41] = 0xa0;
    expect(errorCode(() => readFullBackupArchiveJson(symlink))).toBe("ARCHIVE_ENTRY_INVALID");
  });

  it("rejects archive comments and CRC values that do not match the JSON bytes", () => {
    const archive = createFullBackupArchiveFromJson("{\"integrity\":true}");
    const withComment = new Uint8Array(archive.byteLength + 1);
    withComment.set(archive);
    withComment[archive.byteLength] = 0x21;
    withComment[archive.byteLength - 2] = 1;
    withComment[archive.byteLength - 1] = 0;
    expect(errorCode(() => readFullBackupArchiveJson(withComment))).toBe("ARCHIVE_UNSUPPORTED");

    const badCrc = archive.slice();
    const centralOffset = findSignature(badCrc, 0x02014b50);
    badCrc[14] = badCrc[14]! ^ 0x01;
    badCrc[centralOffset + 16] = badCrc[centralOffset + 16]! ^ 0x01;
    expect(errorCode(() => readFullBackupArchiveJson(badCrc))).toBe("ARCHIVE_INVALID");
  });

  it("does not mistake arbitrary bytes for a ZIP archive", () => {
    expect(looksLikeZip(strToU8("{\"manifest\":{}}"))).toBe(false);
    expect(errorCode(() => readFullBackupArchiveJson(strToU8("not-a-zip"))))
      .toBe("ARCHIVE_INVALID");
  });

  it("rejects a correctly structured archive whose JSON entry is not UTF-8", () => {
    const invalidUtf8 = zipSync({
      [FULL_BACKUP_ARCHIVE_ENTRY]: new Uint8Array([0x7b, 0x22, 0x80, 0x22, 0x7d])
    });
    expect(errorCode(() => readFullBackupArchiveJson(invalidUtf8)))
      .toBe("ARCHIVE_CONTENT_INVALID");
  });
});
