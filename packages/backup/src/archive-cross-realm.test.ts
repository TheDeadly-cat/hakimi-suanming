import { describe, expect, it } from "vitest";
import {
  createFullBackupArchiveFromJson,
  readFullBackupArchiveJson
} from "./archive";

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

describe("full backup ZIP across browser-like Realms", () => {
  it("always writes one entry when TextEncoder and the compressor use different Realms", () => {
    // This file intentionally uses the workspace's default jsdom environment.
    // The former fflate.zipSync path interpreted these encoded bytes as a
    // directory and wrote roughly one ZIP entry per JSON byte.
    const json = JSON.stringify({ title: "八字研究", data: "甲乙丙丁".repeat(6_400) });
    const archive = createFullBackupArchiveFromJson(json);
    const endOffset = archive.byteLength - 22;

    expect(readUint32(archive, endOffset)).toBe(0x06054b50);
    expect(readUint16(archive, endOffset + 8)).toBe(1);
    expect(readUint16(archive, endOffset + 10)).toBe(1);
    expect(readFullBackupArchiveJson(archive)).toBe(json);
  });
});
