import { deflateSync, unzipSync } from "fflate";

export const FULL_BACKUP_ARCHIVE_ENTRY = "hakimi-full-backup.json" as const;
export const FULL_BACKUP_ARCHIVE_MIME = "application/zip" as const;
export const DEFAULT_MAX_FULL_BACKUP_ARCHIVE_BYTES = 120 * 1024 * 1024;
export const DEFAULT_MAX_FULL_BACKUP_JSON_BYTES = 160 * 1024 * 1024;

const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const CENTRAL_DIRECTORY_FILE_HEADER_SIGNATURE = 0x02014b50;
const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const UTF8_FLAG = 0x0800;
const ENCRYPTED_FLAG = 0x0001;
const DATA_DESCRIPTOR_FLAG = 0x0008;
const ZIP_VERSION_2_0 = 20;
const FIXED_DOS_TIME = 0;
// 2020-01-01. DOS dates store years since 1980, months from 1, and days from 1.
const FIXED_DOS_DATE = ((2020 - 1980) << 9) | (1 << 5) | 1;
const FULL_BACKUP_ARCHIVE_ENTRY_BYTES = new TextEncoder().encode(FULL_BACKUP_ARCHIVE_ENTRY);
const CRC32_TABLE = new Uint32Array(256);

for (let index = 0; index < CRC32_TABLE.length; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) === 1 ? (value >>> 1) ^ 0xedb88320 : value >>> 1;
  }
  CRC32_TABLE[index] = value >>> 0;
}

export type FullBackupArchiveErrorCode =
  | "ARCHIVE_TOO_LARGE"
  | "ARCHIVE_INVALID"
  | "ARCHIVE_UNSUPPORTED"
  | "ARCHIVE_ENTRY_INVALID"
  | "ARCHIVE_CONTENT_TOO_LARGE"
  | "ARCHIVE_CONTENT_INVALID";

export class FullBackupArchiveError extends Error {
  constructor(readonly code: FullBackupArchiveErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "FullBackupArchiveError";
  }
}

function readUint16(bytes: Uint8Array, offset: number): number {
  return bytes[offset]! | (bytes[offset + 1]! << 8);
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset]! |
    (bytes[offset + 1]! << 8) |
    (bytes[offset + 2]! << 16) |
    (bytes[offset + 3]! << 24)
  ) >>> 0;
}

function writeUint16(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

function crc32(bytes: Uint8Array): number {
  let value = 0xffffffff;
  for (let index = 0; index < bytes.byteLength; index += 1) {
    value = CRC32_TABLE[(value ^ bytes[index]!) & 0xff]! ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function hasExactBytes(bytes: Uint8Array, offset: number, expected: Uint8Array): boolean {
  if (offset < 0 || offset + expected.byteLength > bytes.byteLength) return false;
  for (let index = 0; index < expected.byteLength; index += 1) {
    if (bytes[offset + index] !== expected[index]) return false;
  }
  return true;
}

function findEndOfCentralDirectory(bytes: Uint8Array): number {
  const minimumOffset = Math.max(0, bytes.byteLength - 65_557);
  for (let offset = bytes.byteLength - 22; offset >= minimumOffset; offset -= 1) {
    if (readUint32(bytes, offset) !== END_OF_CENTRAL_DIRECTORY_SIGNATURE) continue;
    const commentLength = readUint16(bytes, offset + 20);
    if (offset + 22 + commentLength === bytes.byteLength) return offset;
  }
  return -1;
}

/**
 * Rejects multi-entry, encrypted, ZIP64 and oversized archives from central-directory
 * metadata before any compressed bytes are inflated. The product archive intentionally
 * contains one UTF-8 JSON entry, so accepting a wider ZIP surface would add risk without
 * adding a user capability.
 */
function inspectSingleJsonEntry(
  bytes: Uint8Array,
  maxJsonBytes: number
): { crc: number; compressedBytes: number; uncompressedBytes: number } {
  const endOffset = findEndOfCentralDirectory(bytes);
  if (endOffset < 0) {
    throw new FullBackupArchiveError("ARCHIVE_INVALID", "备份 ZIP 缺少有效的中央目录结束记录。");
  }

  const diskNumber = readUint16(bytes, endOffset + 4);
  const centralDirectoryDisk = readUint16(bytes, endOffset + 6);
  const entriesOnDisk = readUint16(bytes, endOffset + 8);
  const totalEntries = readUint16(bytes, endOffset + 10);
  const centralDirectoryBytes = readUint32(bytes, endOffset + 12);
  const centralDirectoryOffset = readUint32(bytes, endOffset + 16);
  const archiveCommentLength = readUint16(bytes, endOffset + 20);
  if (
    diskNumber !== 0 ||
    centralDirectoryDisk !== 0 ||
    entriesOnDisk !== 1 ||
    totalEntries !== 1 ||
    centralDirectoryBytes === 0xffffffff ||
    centralDirectoryOffset === 0xffffffff ||
    archiveCommentLength !== 0
  ) {
    throw new FullBackupArchiveError(
      "ARCHIVE_UNSUPPORTED",
      `备份 ZIP 必须是单卷、单文件且不使用 ZIP64（end=${endOffset}/${bytes.byteLength}, disk=${diskNumber}, centralDisk=${centralDirectoryDisk}, entries=${entriesOnDisk}/${totalEntries}）。`
    );
  }
  if (
    centralDirectoryOffset + centralDirectoryBytes !== endOffset ||
    centralDirectoryOffset + 46 > endOffset ||
    readUint32(bytes, centralDirectoryOffset) !== CENTRAL_DIRECTORY_FILE_HEADER_SIGNATURE
  ) {
    throw new FullBackupArchiveError("ARCHIVE_INVALID", "备份 ZIP 的中央目录边界无效。");
  }

  const flags = readUint16(bytes, centralDirectoryOffset + 8);
  const requiredVersion = readUint16(bytes, centralDirectoryOffset + 6);
  const method = readUint16(bytes, centralDirectoryOffset + 10);
  const expectedCrc = readUint32(bytes, centralDirectoryOffset + 16);
  const compressedBytes = readUint32(bytes, centralDirectoryOffset + 20);
  const uncompressedBytes = readUint32(bytes, centralDirectoryOffset + 24);
  const fileNameLength = readUint16(bytes, centralDirectoryOffset + 28);
  const extraLength = readUint16(bytes, centralDirectoryOffset + 30);
  const commentLength = readUint16(bytes, centralDirectoryOffset + 32);
  const startDisk = readUint16(bytes, centralDirectoryOffset + 34);
  const externalAttributes = readUint32(bytes, centralDirectoryOffset + 38);
  const localHeaderOffset = readUint32(bytes, centralDirectoryOffset + 42);
  const entryEnd = centralDirectoryOffset + 46 + fileNameLength + extraLength + commentLength;

  if (
    (flags & (ENCRYPTED_FLAG | DATA_DESCRIPTOR_FLAG)) !== 0 ||
    (flags & ~(UTF8_FLAG | ENCRYPTED_FLAG | DATA_DESCRIPTOR_FLAG)) !== 0 ||
    requiredVersion > ZIP_VERSION_2_0 ||
    startDisk !== 0 ||
    (method !== 0 && method !== 8)
  ) {
    throw new FullBackupArchiveError(
      "ARCHIVE_UNSUPPORTED",
      "备份 ZIP 不接受加密条目或未知压缩算法。"
    );
  }
  if (
    compressedBytes === 0xffffffff ||
    uncompressedBytes === 0xffffffff ||
    extraLength !== 0 ||
    commentLength !== 0 ||
    entryEnd !== endOffset
  ) {
    throw new FullBackupArchiveError("ARCHIVE_UNSUPPORTED", "备份 ZIP 使用了不支持的扩展结构。");
  }
  if (uncompressedBytes > maxJsonBytes) {
    throw new FullBackupArchiveError(
      "ARCHIVE_CONTENT_TOO_LARGE",
      `备份 ZIP 解压后的 JSON 超过 ${Math.round(maxJsonBytes / 1024 / 1024)} MB 安全上限。`
    );
  }

  if (
    fileNameLength !== FULL_BACKUP_ARCHIVE_ENTRY_BYTES.byteLength ||
    !hasExactBytes(bytes, centralDirectoryOffset + 46, FULL_BACKUP_ARCHIVE_ENTRY_BYTES)
  ) {
    throw new FullBackupArchiveError(
      "ARCHIVE_ENTRY_INVALID",
      `备份 ZIP 只能包含 ${FULL_BACKUP_ARCHIVE_ENTRY}。`
    );
  }

  // Unix file-type bits must not mark the sole entry as a symlink. DOS archives
  // normally leave these bits at zero, which is accepted.
  const unixMode = externalAttributes >>> 16;
  if ((unixMode & 0xf000) === 0xa000) {
    throw new FullBackupArchiveError("ARCHIVE_ENTRY_INVALID", "备份 ZIP 不接受符号链接条目。");
  }

  if (
    localHeaderOffset !== 0 ||
    readUint32(bytes, localHeaderOffset) !== LOCAL_FILE_HEADER_SIGNATURE ||
    localHeaderOffset + 30 > centralDirectoryOffset
  ) {
    throw new FullBackupArchiveError("ARCHIVE_INVALID", "备份 ZIP 的本地文件头无效。");
  }
  const localFlags = readUint16(bytes, localHeaderOffset + 6);
  const localRequiredVersion = readUint16(bytes, localHeaderOffset + 4);
  const localMethod = readUint16(bytes, localHeaderOffset + 8);
  const localCrc = readUint32(bytes, localHeaderOffset + 14);
  const localCompressedBytes = readUint32(bytes, localHeaderOffset + 18);
  const localUncompressedBytes = readUint32(bytes, localHeaderOffset + 22);
  const localFileNameLength = readUint16(bytes, localHeaderOffset + 26);
  const localExtraLength = readUint16(bytes, localHeaderOffset + 28);
  const localNameStart = localHeaderOffset + 30;
  const localDataStart = localNameStart + localFileNameLength + localExtraLength;
  if (
    localRequiredVersion !== requiredVersion ||
    localFlags !== flags ||
    localMethod !== method ||
    localCrc !== expectedCrc ||
    localCompressedBytes !== compressedBytes ||
    localUncompressedBytes !== uncompressedBytes ||
    localExtraLength !== 0 ||
    localFileNameLength !== FULL_BACKUP_ARCHIVE_ENTRY_BYTES.byteLength ||
    !hasExactBytes(bytes, localNameStart, FULL_BACKUP_ARCHIVE_ENTRY_BYTES) ||
    localDataStart + compressedBytes !== centralDirectoryOffset
  ) {
    throw new FullBackupArchiveError("ARCHIVE_INVALID", "备份 ZIP 的本地文件头与中央目录不一致。");
  }
  return { crc: expectedCrc, compressedBytes, uncompressedBytes };
}

export function createFullBackupArchiveFromJson(
  json: string,
  options: { maxArchiveBytes?: number; maxJsonBytes?: number } = {}
): Uint8Array {
  const maxArchiveBytes = options.maxArchiveBytes ?? DEFAULT_MAX_FULL_BACKUP_ARCHIVE_BYTES;
  const maxJsonBytes = options.maxJsonBytes ?? DEFAULT_MAX_FULL_BACKUP_JSON_BYTES;
  const jsonBytes = new TextEncoder().encode(json);
  if (jsonBytes.byteLength > maxJsonBytes) {
    throw new FullBackupArchiveError(
      "ARCHIVE_CONTENT_TOO_LARGE",
      `备份 JSON 超过 ${Math.round(maxJsonBytes / 1024 / 1024)} MB 安全上限。`
    );
  }
  // Do not use fflate.zipSync here. Its directory flattener uses
  // `instanceof Uint8Array`; a genuine Uint8Array created in another Realm
  // (for example jsdom, an iframe, or a browser worker) is then mistaken for a
  // directory and each numeric byte becomes a separate ZIP entry. Building the
  // deliberately tiny one-entry container ourselves also freezes every header
  // field and makes the output byte-for-byte deterministic across Realms.
  const fileNameBytes = FULL_BACKUP_ARCHIVE_ENTRY_BYTES;
  const compressed = deflateSync(jsonBytes, { level: 6 });
  const checksum = crc32(jsonBytes);
  const localHeaderBytes = 30 + fileNameBytes.byteLength;
  const centralDirectoryOffset = localHeaderBytes + compressed.byteLength;
  const centralDirectoryBytes = 46 + fileNameBytes.byteLength;
  const endOffset = centralDirectoryOffset + centralDirectoryBytes;
  const archiveBytes = endOffset + 22;
  if (archiveBytes > maxArchiveBytes) {
    throw new FullBackupArchiveError(
      "ARCHIVE_TOO_LARGE",
      `备份 ZIP 超过 ${Math.round(maxArchiveBytes / 1024 / 1024)} MB 安全上限。`
    );
  }
  const output = new Uint8Array(archiveBytes);

  writeUint32(output, 0, LOCAL_FILE_HEADER_SIGNATURE);
  writeUint16(output, 4, ZIP_VERSION_2_0);
  writeUint16(output, 6, UTF8_FLAG);
  writeUint16(output, 8, 8);
  writeUint16(output, 10, FIXED_DOS_TIME);
  writeUint16(output, 12, FIXED_DOS_DATE);
  writeUint32(output, 14, checksum);
  writeUint32(output, 18, compressed.byteLength);
  writeUint32(output, 22, jsonBytes.byteLength);
  writeUint16(output, 26, fileNameBytes.byteLength);
  writeUint16(output, 28, 0);
  output.set(fileNameBytes, 30);
  output.set(compressed, localHeaderBytes);

  writeUint32(output, centralDirectoryOffset, CENTRAL_DIRECTORY_FILE_HEADER_SIGNATURE);
  writeUint16(output, centralDirectoryOffset + 4, ZIP_VERSION_2_0);
  writeUint16(output, centralDirectoryOffset + 6, ZIP_VERSION_2_0);
  writeUint16(output, centralDirectoryOffset + 8, UTF8_FLAG);
  writeUint16(output, centralDirectoryOffset + 10, 8);
  writeUint16(output, centralDirectoryOffset + 12, FIXED_DOS_TIME);
  writeUint16(output, centralDirectoryOffset + 14, FIXED_DOS_DATE);
  writeUint32(output, centralDirectoryOffset + 16, checksum);
  writeUint32(output, centralDirectoryOffset + 20, compressed.byteLength);
  writeUint32(output, centralDirectoryOffset + 24, jsonBytes.byteLength);
  writeUint16(output, centralDirectoryOffset + 28, fileNameBytes.byteLength);
  writeUint16(output, centralDirectoryOffset + 30, 0);
  writeUint16(output, centralDirectoryOffset + 32, 0);
  writeUint16(output, centralDirectoryOffset + 34, 0);
  writeUint16(output, centralDirectoryOffset + 36, 0);
  writeUint32(output, centralDirectoryOffset + 38, 0);
  writeUint32(output, centralDirectoryOffset + 42, 0);
  output.set(fileNameBytes, centralDirectoryOffset + 46);

  writeUint32(output, endOffset, END_OF_CENTRAL_DIRECTORY_SIGNATURE);
  writeUint16(output, endOffset + 4, 0);
  writeUint16(output, endOffset + 6, 0);
  writeUint16(output, endOffset + 8, 1);
  writeUint16(output, endOffset + 10, 1);
  writeUint32(output, endOffset + 12, centralDirectoryBytes);
  writeUint32(output, endOffset + 16, centralDirectoryOffset);
  writeUint16(output, endOffset + 20, 0);

  return output;
}

export function readFullBackupArchiveJson(
  input: Uint8Array,
  options: { maxArchiveBytes?: number; maxJsonBytes?: number } = {}
): string {
  const maxArchiveBytes = options.maxArchiveBytes ?? DEFAULT_MAX_FULL_BACKUP_ARCHIVE_BYTES;
  const maxJsonBytes = options.maxJsonBytes ?? DEFAULT_MAX_FULL_BACKUP_JSON_BYTES;
  if (input.byteLength > maxArchiveBytes) {
    throw new FullBackupArchiveError(
      "ARCHIVE_TOO_LARGE",
      `备份 ZIP 超过 ${Math.round(maxArchiveBytes / 1024 / 1024)} MB 安全上限。`
    );
  }
  const inspected = inspectSingleJsonEntry(input, maxJsonBytes);
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(input, {
      filter: (file) => file.name === FULL_BACKUP_ARCHIVE_ENTRY
    });
  } catch (cause) {
    throw new FullBackupArchiveError("ARCHIVE_INVALID", "备份 ZIP 无法安全解压。", { cause });
  }
  const jsonBytes = entries[FULL_BACKUP_ARCHIVE_ENTRY];
  if (!jsonBytes || jsonBytes.byteLength !== inspected.uncompressedBytes) {
    throw new FullBackupArchiveError("ARCHIVE_INVALID", "备份 ZIP 的 JSON 长度与中央目录不一致。");
  }
  if (crc32(jsonBytes) !== inspected.crc) {
    throw new FullBackupArchiveError("ARCHIVE_INVALID", "备份 ZIP 的 JSON 校验值无效。");
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(jsonBytes);
  } catch (cause) {
    throw new FullBackupArchiveError("ARCHIVE_CONTENT_INVALID", "备份 ZIP 中的 JSON 不是严格 UTF-8。", {
      cause
    });
  }
}

export function looksLikeZip(input: Uint8Array): boolean {
  return input.byteLength >= 4 && readUint32(input, 0) === 0x04034b50;
}
