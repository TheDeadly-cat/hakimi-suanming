import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { gzip as pakoGzip } from "pako";
import { researchNoteRecordSchema } from "@hakimi/contracts";
import { isPackedReadingSnapshot, packReadingSnapshot, READING_SNAPSHOT_ENVELOPE, READING_SNAPSHOT_DICTIONARY_ENVELOPE, READING_SNAPSHOT_CHUNK_ENVELOPE, READING_SNAPSHOT_BINARY_ENVELOPE, READING_SNAPSHOT_BASE85_ENVELOPE, READING_SNAPSHOT_BASE16384_ENVELOPE, unpackReadingSnapshot } from "./local-reading-snapshot-codec";

const dictionaryEnvelope = (payload: unknown, original: string, changes: Record<string, unknown> = {}) => {
  const bytes = Buffer.isBuffer(payload) ? payload : Buffer.from(JSON.stringify(payload));
  return `${READING_SNAPSHOT_DICTIONARY_ENVELOPE}\n${JSON.stringify({ encoding: "line-dictionary-gzip-base64",
    plainBytes: Buffer.byteLength(original), payloadBytes: bytes.length, sha256: createHash("sha256").update(original).digest("hex"),
    data: gzipSync(bytes).toString("base64"), ...changes })}`;
};
function binaryFrame(dictionary: unknown, indices: readonly number[], count = indices.length): Buffer {
  const dict = Buffer.isBuffer(dictionary) ? dictionary : Buffer.from(JSON.stringify(dictionary));
  const header = Buffer.alloc(12); header.write("HRS4"); header.writeUInt32LE(dict.length, 4); header.writeUInt32LE(count, 8);
  return Buffer.concat([header, dict, Buffer.from(indices)]);
}
function binaryEnvelope(frame: Buffer, original: string, changes: Record<string, unknown> = {}) {
  return `${READING_SNAPSHOT_BINARY_ENVELOPE}\n${JSON.stringify({ encoding: "text-chunk-dictionary-varint-gzip-base64",
    plainBytes: Buffer.byteLength(original), payloadBytes: frame.length, sha256: createHash("sha256").update(original).digest("hex"),
    data: gzipSync(frame).toString("base64"), ...changes })}`;
}
// Independent fixture encoder uses integer arithmetic, including full zero
// padding rather than the truncated-block variant of other Base85 formats.
function fixtureBase85(bytes: Buffer): string {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~";
  const padded = Buffer.alloc(Math.ceil(bytes.length / 4) * 4); bytes.copy(padded);
  const blocks: string[] = [];
  for (let offset = 0; offset < padded.length; offset += 4) {
    const value = BigInt(padded.readUInt32BE(offset));
    blocks.push([4n, 3n, 2n, 1n, 0n].map((power) => alphabet[Number(value / 85n ** power % 85n)]).join(""));
  }
  return blocks.join("");
}
function base85Envelope(frame: Buffer, original: string, changes: Record<string, unknown> = {}) {
  const compressed = gzipSync(frame);
  return `${READING_SNAPSHOT_BASE85_ENVELOPE}\n${JSON.stringify({ encoding: "text-chunk-dictionary-varint-gzip-base85",
    plainBytes: Buffer.byteLength(original), payloadBytes: frame.length, compressedBytes: compressed.length,
    sha256: createHash("sha256").update(original).digest("hex"), data: fixtureBase85(compressed), ...changes })}`;
}
// Independent fixture algorithm: 7 padded bytes form a 56-bit BigInt and
// produce up to four 14-bit symbols. Production uses a small bit accumulator.
function fixtureBase16384(bytes: Uint8Array): string {
  const symbols: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 7) {
    let value = 0n;
    for (let index = 0; index < 7; index += 1) value = value * 256n + BigInt(bytes[offset + index] ?? 0);
    const count = Math.ceil(Math.min(7, bytes.length - offset) * 8 / 14);
    for (let index = 0; index < count; index += 1) symbols.push(String.fromCharCode(0x4e00 + Number(value / 2n ** BigInt(42 - index * 14) % 16384n)));
  }
  return symbols.join("");
}
function base16384Envelope(frame: Buffer, original: string, changes: Record<string, unknown> = {}) {
  const compressed = gzipSync(frame);
  return `${READING_SNAPSHOT_BASE16384_ENVELOPE}\n${JSON.stringify({ encoding: "text-chunk-dictionary-varint-gzip-base16384",
    plainBytes: Buffer.byteLength(original), payloadBytes: frame.length, compressedBytes: compressed.length,
    sha256: createHash("sha256").update(original).digest("hex"), data: fixtureBase16384(compressed), ...changes })}`;
}
function quotedFrame(original: string): Buffer {
  const chunks = original.split(/(?<=[\n。；，：,{}\[\]: "“”])/u), frequency = new Map<string, number>();
  for (const chunk of chunks) frequency.set(chunk, (frequency.get(chunk) ?? 0) + 1);
  const ranked = [...frequency.keys()].sort((a, b) => frequency.get(b)! - frequency.get(a)!);
  const dictionary = [...ranked.slice(0, 128), ...ranked.slice(128).sort()], index = new Map(dictionary.map((chunk, i) => [chunk, i]));
  const indices = chunks.flatMap((chunk) => {
    const result: number[] = []; let value = index.get(chunk)!;
    do { const low = value % 128; value = Math.floor(value / 128); result.push(low | (value ? 128 : 0)); } while (value);
    return result;
  });
  return binaryFrame(dictionary, indices, chunks.length);
}
function binaryOrderFixture(count = 100_000): string {
  const tokens = Array.from({ length: 512 }, (_, index) => createHash("sha256").update(`fixture/${index}`).digest("hex").slice(0, 16) + "，");
  let state = 7831;
  return "\uFEFF合成完整报告🌿\r\n" + Array.from({ length: count }, () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return tokens[(state >>> 0) % tokens.length];
  }).join("") + "\r\n尾部e\u0301👨‍👩‍👧‍👦。";
}

describe("complete reading storage", () => {
  it("keeps ordinary historical text byte-for-byte", async () => {
    const original = "# 原解读\r\n旧规则判断。\n用户反馈保持原样。";
    expect(await packReadingSnapshot(original)).toBe(original);
    expect(await unpackReadingSnapshot(original)).toBe(original);
  });
  it("stores a long complete report within the note contract and restores every character", async () => {
    const original = "\uFEFF完整解读🌿\n" + Array.from({ length: 3000 }, (_, index) => `第${index}段 · 格局、调候与岁运\n完整条件、原始用字、分段时间和版本均须保留。${"甲乙丙丁壬癸：不同条件不相互替代。".repeat(8)}\n`).join("\n");
    expect(original.length).toBeGreaterThan(200_000);
    const stored = await packReadingSnapshot(original);
    expect(isPackedReadingSnapshot(stored)).toBe(true);
    expect(stored.length).toBeLessThanOrEqual(200_000);
    expect(await unpackReadingSnapshot(stored)).toBe(original);
    const envelope = JSON.parse(stored.slice(READING_SNAPSHOT_ENVELOPE.length));
    await expect(unpackReadingSnapshot(`${READING_SNAPSHOT_ENVELOPE}\n${JSON.stringify({ ...envelope, unexpected: true })}`)).rejects.toThrow(/未能完整打开/);
    await expect(packReadingSnapshot(`${original}\uD800`)).rejects.toThrow(/不完整字符/);
    envelope.sha256 = "0".repeat(64);
    await expect(unpackReadingSnapshot(`${READING_SNAPSHOT_ENVELOPE}\n${JSON.stringify(envelope)}`)).rejects.toThrow(/未能完整打开/);
    envelope.plainBytes = 8 * 1024 * 1024 + 1;
    await expect(unpackReadingSnapshot(`${READING_SNAPSHOT_ENVELOPE}\n${JSON.stringify(envelope)}`)).rejects.toThrow(/未能完整打开/);
    await expect(unpackReadingSnapshot(stored.slice(0, -12))).rejects.toThrow(/未能完整打开/);
  });
  it("uses a global dictionary when distant repeated passages exceed the old compressed capacity", async () => {
    let seed = 7831;
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const distinct = Array.from({ length: 1800 }, (_, index) => `${index} · 完整依据🌿 ` + Array.from({ length: 75 }, () => {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return alphabet[(seed >>> 0) % alphabet.length];
    }).join("")).join("\r\n\n");
    const original = "\uFEFF# 原始报告\r\n" + (distinct + "\r\n\n").repeat(4);
    expect(gzipSync(original).toString("base64").length).toBeGreaterThan(200_000);
    const packed = await packReadingSnapshot(original);
    expect(packed.startsWith(READING_SNAPSHOT_DICTIONARY_ENVELOPE)).toBe(true);
    expect(packed.length).toBeLessThanOrEqual(200_000);
    expect(await unpackReadingSnapshot(packed)).toBe(original);
    const lines = original.split("\n"), dictionary = [...new Set(lines)], index = new Map(dictionary.map((line, i) => [line, i]));
    expect(packed).toBe(dictionaryEnvelope({ dictionary, order: lines.map((line) => index.get(line)) }, original));
    await expect(packReadingSnapshot(packed)).rejects.toThrow("已经使用保存格式");
    const v1 = await packReadingSnapshot("原文".repeat(120_000));
    expect(v1.startsWith(READING_SNAPSHOT_ENVELOPE)).toBe(true);
    expect(JSON.parse(v1.slice(READING_SNAPSHOT_ENVELOPE.length)).data).toBe(gzipSync("原文".repeat(120_000)).toString("base64"));
    await expect(packReadingSnapshot(v1)).rejects.toThrow("已经使用保存格式");
  });
  it("rejects malformed dictionaries, unsafe expansion, invalid Unicode and changed final bytes", async () => {
    const original = "\uFEFF原文🌿\r\n\n";
    const valid = { dictionary: ["\uFEFF原文🌿\r", ""], order: [0, 1, 1] };
    expect(await unpackReadingSnapshot(dictionaryEnvelope(valid, original))).toBe(original);
    const bad = [
      { dictionary: ["甲"], order: [1] }, { dictionary: ["甲"], order: [-1] }, { dictionary: ["甲"], order: [0.5] },
      { dictionary: ["甲"], order: ["0"] }, { dictionary: ["\ud800"], order: [0] },
      { dictionary: ["甲\n乙"], order: [0] }, { dictionary: ["甲".repeat(1000)], order: Array(100).fill(0) },
      { ...valid, unexpected: true }
    ];
    for (const payload of bad) await expect(unpackReadingSnapshot(dictionaryEnvelope(payload, original))).rejects.toThrow("原记录仍保留");
    await expect(unpackReadingSnapshot(dictionaryEnvelope(Buffer.from([0xff]), original))).rejects.toThrow("原记录仍保留");
    for (const changes of [{ sha256: "0".repeat(64) }, { plainBytes: 8 * 1024 * 1024 + 1 },
      { payloadBytes: 16 * 1024 * 1024 + 1 }, { payloadBytes: 1 }, { encoding: "unknown" }, { unexpected: true }]) {
      await expect(unpackReadingSnapshot(dictionaryEnvelope(valid, original, changes))).rejects.toThrow("原记录仍保留");
    }
  });
  it("preserves differently wrapped repeated passages when line dictionaries exceed capacity", async () => {
    let seed = 7831;
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const passages = Array.from({ length: 1200 }, () => Array.from({ length: 75 }, () => {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return alphabet[(seed >>> 0) % alphabet.length];
    }).join(""));
    const original = "\uFEFF完整月度说明🌿\r\n" + Array.from({ length: 4 }, (_, part) => passages.map((passage, index) =>
      `领域${part}第${index}项：${passage}。保留不同的原始标签、换行与中文标点。\r\n`).join("\n")).join("\n");
    const oldLines = original.split("\n"), dictionary = [...new Set(oldLines)], indices = new Map(dictionary.map((line, index) => [line, index]));
    expect(gzipSync(JSON.stringify({ dictionary, order: oldLines.map((line) => indices.get(line)) })).toString("base64").length).toBeGreaterThan(200_000);
    const stored = await packReadingSnapshot(original);
    expect(stored.startsWith(READING_SNAPSHOT_CHUNK_ENVELOPE)).toBe(true);
    expect(stored.length).toBeLessThanOrEqual(200_000);
    expect(await unpackReadingSnapshot(stored)).toBe(original);
    const chunks = original.split(/(?<=[\n。；，：,{}\[\]:])/u), chunkDictionary = [...new Set(chunks)], chunkIndex = new Map(chunkDictionary.map((chunk, index) => [chunk, index]));
    const expectedV3 = dictionaryEnvelope({ dictionary: chunkDictionary, order: chunks.map((chunk) => chunkIndex.get(chunk)) }, original)
      .replace(READING_SNAPSHOT_DICTIONARY_ENVELOPE, READING_SNAPSHOT_CHUNK_ENVELOPE).replace('"line-dictionary-gzip-base64"', '"text-chunk-dictionary-gzip-base64"');
    expect(stored).toBe(expectedV3);
    await expect(packReadingSnapshot(stored)).rejects.toThrow("已经使用保存格式");
    const envelope = JSON.parse(stored.slice(READING_SNAPSHOT_CHUNK_ENVELOPE.length));
    for (const changes of [{ sha256: "0".repeat(64) }, { payloadBytes: 1 }, { plainBytes: 1 }, { encoding: "line-dictionary-gzip-base64" }]) {
      await expect(unpackReadingSnapshot(`${READING_SNAPSHOT_CHUNK_ENVELOPE}\n${JSON.stringify({ ...envelope, ...changes })}`)).rejects.toThrow("原记录仍保留");
    }
    const invalid = dictionaryEnvelope({ dictionary: ["正文\n", "尾"], order: [0, 9] }, "正文\n尾")
      .replace(READING_SNAPSHOT_DICTIONARY_ENVELOPE, READING_SNAPSHOT_CHUNK_ENVELOPE).replace('"line-dictionary-gzip-base64"', '"text-chunk-dictionary-gzip-base64"');
    await expect(unpackReadingSnapshot(invalid)).rejects.toThrow("原记录仍保留");
  });

  it("only falls back to binary references after v3 exceeds capacity and preserves all Unicode, punctuation and line endings", async () => {
    const original = binaryOrderFixture(), chunks = original.split(/(?<=[\n。；，：,{}\[\]:])/u), dictionary = [...new Set(chunks)], index = new Map(dictionary.map((chunk, i) => [chunk, i]));
    expect(gzipSync(original).toString("base64").length).toBeGreaterThan(200_000);
    expect(gzipSync(JSON.stringify({ dictionary, order: chunks.map((chunk) => index.get(chunk)) })).toString("base64").length).toBeGreaterThan(200_000);
    const packed = await packReadingSnapshot(original);
    expect(packed.startsWith(READING_SNAPSHOT_BINARY_ENVELOPE)).toBe(true); expect(isPackedReadingSnapshot(packed)).toBe(true);
    expect(packed.length).toBeLessThan(195_000); expect(await unpackReadingSnapshot(packed)).toBe(original);
    const indices = chunks.flatMap((chunk) => {
      const result: number[] = []; let value = index.get(chunk)!;
      do { const low = value % 128; value = Math.floor(value / 128); result.push(low | (value ? 128 : 0)); } while (value);
      return result;
    });
    expect(packed).toBe(binaryEnvelope(binaryFrame(dictionary, indices, chunks.length), original));
    await expect(packReadingSnapshot(packed)).rejects.toThrow("已经使用保存格式");
  });

  it("decodes canonical multi-byte indices while rejecting truncated, overflow, overlong, out-of-range or trailing references", async () => {
    const dictionary = [...Array(129).fill("x"), "字"], original = "字".repeat(140);
    const frame = binaryFrame(dictionary, Array.from({ length: 140 }, () => [0x81, 0x01]).flat(), 140);
    expect(await unpackReadingSnapshot(binaryEnvelope(frame, original))).toBe(original);
    const invalid = [
      binaryFrame(["甲"], [0x80], 1), binaryFrame(["甲"], [0x80, 0x00], 1), binaryFrame(["甲"], [0x81, 0x00], 1),
      binaryFrame(["甲"], [0xff, 0xff, 0xff, 0xff, 0x10], 1), binaryFrame(["甲"], [0xff, 0xff, 0xff, 0xff, 0x80], 1),
      binaryFrame(["甲"], [1], 1), binaryFrame(["甲"], [0, 0], 1), binaryFrame(["甲"], [0], 2)
    ];
    for (const payload of invalid) await expect(unpackReadingSnapshot(binaryEnvelope(payload, "甲"))).rejects.toThrow("原记录仍保留");
  });

  it("keeps v4 frame, payload, expansion, Unicode, checksum and envelope limits fail-closed", async () => {
    const original = "\uFEFF正文🌿\r\n尾", good = binaryFrame(["\uFEFF正文🌿\r\n", "尾"], [0, 1]);
    const altered = [good.subarray(0, 11), binaryFrame({}, [0]), binaryFrame([], [0]), binaryFrame([1], [0]),
      binaryFrame(["\ud800"], [0]), binaryFrame(Buffer.from([0xff]), [0]), binaryFrame(["甲".repeat(1000)], [0, 0])];
    const magic = Buffer.from(good); magic[0] = 0; altered.push(magic);
    const longDictionary = Buffer.from(good); longDictionary.writeUInt32LE(0xffff_ffff, 4); altered.push(longDictionary);
    const noDictionary = Buffer.from(good); noDictionary.writeUInt32LE(0, 4); altered.push(noDictionary);
    const noReferences = Buffer.from(good); noReferences.writeUInt32LE(0, 8); altered.push(noReferences);
    const hugeCount = Buffer.from(good); hugeCount.writeUInt32LE(0xffff_ffff, 8); altered.push(hugeCount);
    for (const frame of altered) await expect(unpackReadingSnapshot(binaryEnvelope(frame, original))).rejects.toThrow("原记录仍保留");
    for (const changes of [{ sha256: "0".repeat(64) }, { plainBytes: 1 }, { plainBytes: 8 * 1024 * 1024 + 1 },
      { payloadBytes: 1 }, { payloadBytes: good.length + 1 }, { payloadBytes: 16 * 1024 * 1024 + 1 }, { encoding: "text-chunk-dictionary-gzip-base64" },
      { unexpected: true }, { data: "not-base64" }]) await expect(unpackReadingSnapshot(binaryEnvelope(good, original, changes))).rejects.toThrow("原记录仍保留");
    const body = binaryEnvelope(good, original);
    await expect(unpackReadingSnapshot(body + " ".repeat(200_001 - body.length))).rejects.toThrow("原记录仍保留");
    await expect(unpackReadingSnapshot(body.slice(0, -12))).rejects.toThrow("原记录仍保留");
  });

  it("restores v5's exact gzip bytes for every final block length and keeps the saved format identifiable", async () => {
    const remainders = new Set<number>();
    for (let size = 1; size < 80 && remainders.size < 4; size += 1) {
      const original = "\uFEFF完整原文🌿\r\n" + createHash("sha256").update(String(size)).digest("hex").slice(0, size) + "e\u0301";
      const frame = binaryFrame([original], [0]), compressed = gzipSync(frame);
      if (remainders.has(compressed.length % 4)) continue;
      remainders.add(compressed.length % 4);
      const body = base85Envelope(frame, original), envelope = JSON.parse(body.slice(READING_SNAPSHOT_BASE85_ENVELOPE.length));
      expect(envelope.data.length).toBe(Math.ceil(compressed.length / 4) * 5);
      expect(envelope.data).not.toMatch(/["\\\s]/u);
      expect(isPackedReadingSnapshot(body)).toBe(true);
      expect(await unpackReadingSnapshot(body)).toBe(original);
      await expect(packReadingSnapshot(body)).rejects.toThrow("已经使用保存格式");
    }
    expect([...remainders].sort()).toEqual([0, 1, 2, 3]);
  });

  it("uses v5 only after the last v4 exceeds capacity, preserves that gzip payload and still rejects an oversized v5", async () => {
    // This fixture exceeded every old representation. Its newly successful
    // encoding is verified in full; an oversized v5 envelope stays rejected.
    const original = binaryOrderFixture(110_000), chunks = original.split(/(?<=[\n。；，：,{}\[\]: "“”])/u);
    const frequency = new Map<string, number>();
    for (const chunk of chunks) frequency.set(chunk, (frequency.get(chunk) ?? 0) + 1);
    const ranked = [...frequency.keys()].sort((a, b) => frequency.get(b)! - frequency.get(a)!);
    const dictionary = [...ranked.slice(0, 128), ...ranked.slice(128).sort()], index = new Map(dictionary.map((chunk, i) => [chunk, i]));
    const indices = chunks.flatMap((chunk) => {
      const result: number[] = []; let value = index.get(chunk)!;
      do { const low = value % 128; value = Math.floor(value / 128); result.push(low | (value ? 128 : 0)); } while (value);
      return result;
    });
    const frame = binaryFrame(dictionary, indices, chunks.length);
    expect(binaryEnvelope(frame, original).length).toBeGreaterThan(200_000);
    const packed = await packReadingSnapshot(original);
    expect(packed.startsWith(READING_SNAPSHOT_BASE85_ENVELOPE)).toBe(true);
    expect(packed.length).toBeLessThanOrEqual(200_000);
    expect(packed).toBe(base85Envelope(frame, original));
    expect(await unpackReadingSnapshot(packed)).toBe(original);
    const oversizedOriginal = binaryOrderFixture(125_000), oversizedV5 = base85Envelope(quotedFrame(oversizedOriginal), oversizedOriginal);
    expect(oversizedV5.length).toBeGreaterThan(200_000);
    await expect(unpackReadingSnapshot(oversizedV5)).rejects.toThrow("原记录仍保留");
  });

  it("rejects v5 alphabet, group, uint32, length and nonzero final padding errors before accepting any text", async () => {
    const original = "完整原文🌿\r\n", frame = binaryFrame([original], [0]), compressed = gzipSync(frame);
    const body = base85Envelope(frame, original), envelope = JSON.parse(body.slice(READING_SNAPSHOT_BASE85_ENVELOPE.length));
    for (const changes of [
      { data: envelope.data.slice(0, -1) }, { data: envelope.data + "00000" },
      { data: "~~~~~" + envelope.data.slice(5) }, { data: ":" + envelope.data.slice(1) },
      { data: "０" + envelope.data.slice(1) }, { data: " " + envelope.data.slice(1) },
      { compressedBytes: 0 }, { compressedBytes: -1 }, { compressedBytes: 1.5 }, { compressedBytes: "10" },
      { compressedBytes: 8 * 1024 * 1024 + 1 }, { compressedBytes: compressed.length + 4 },
      { compressedBytes: undefined }, { unexpected: true }, { encoding: "text-chunk-dictionary-varint-gzip-base64" }
    ]) await expect(unpackReadingSnapshot(base85Envelope(frame, original, changes))).rejects.toThrow("原记录仍保留");
    // The encoded padding itself must be canonical even though it is outside
    // the gzip byte length and would otherwise be silently discarded.
    let paddedOriginal = original, paddedFrame = frame, paddedGzip = compressed;
    for (let size = 1; paddedGzip.length % 4 === 0; size += 1) {
      paddedOriginal = original + "甲".repeat(size); paddedFrame = binaryFrame([paddedOriginal], [0]); paddedGzip = gzipSync(paddedFrame);
    }
    expect(await unpackReadingSnapshot(base85Envelope(paddedFrame, paddedOriginal))).toBe(paddedOriginal);
    const nonzeroPadding = Buffer.alloc(Math.ceil(paddedGzip.length / 4) * 4, 1); paddedGzip.copy(nonzeroPadding);
    await expect(unpackReadingSnapshot(base85Envelope(paddedFrame, paddedOriginal, { data: fixtureBase85(nonzeroPadding) }))).rejects.toThrow("原记录仍保留");
  });

  it("keeps v5 gzip, HRS4, Unicode, expansion, hash and stored-size checks identical to the bounded v4 reader", async () => {
    const original = "原文🌿", frame = binaryFrame([original], [0]);
    for (const payload of [binaryFrame(["\ud800"], [0]), binaryFrame(Buffer.from([0xff]), [0]),
      binaryFrame(["甲".repeat(1000)], [0, 0]), binaryFrame([original], [0x80, 0x00], 1), frame.subarray(0, 11)]) {
      await expect(unpackReadingSnapshot(base85Envelope(payload, original))).rejects.toThrow("原记录仍保留");
    }
    for (const changes of [{ sha256: "0".repeat(64) }, { plainBytes: 1 }, { plainBytes: 8 * 1024 * 1024 + 1 },
      { payloadBytes: 1 }, { payloadBytes: frame.length + 1 }, { payloadBytes: 16 * 1024 * 1024 + 1 },
      { data: fixtureBase85(Buffer.from([0, 0, 0, 0])), compressedBytes: 4 }]) {
      await expect(unpackReadingSnapshot(base85Envelope(frame, original, changes))).rejects.toThrow("原记录仍保留");
    }
    const body = base85Envelope(frame, original);
    await expect(unpackReadingSnapshot(body + " ".repeat(200_001 - body.length))).rejects.toThrow("原记录仍保留");
  });

  it("decodes independently generated v6 fixtures for all seven padding lengths and rejects nonzero unused bits", async () => {
    const padding = new Set<number>();
    for (let size = 1; size <= 128 && padding.size < 7; size += 1) {
      const original = "\uFEFF完整原文🌿\r\ne\u0301👨‍👩‍👧‍👦" + createHash("sha512").update(String(size)).digest("hex").slice(0, size);
      const frame = binaryFrame([original], [0]), compressed = gzipSync(frame);
      const unused = Math.ceil(compressed.length * 8 / 14) * 14 - compressed.length * 8;
      if (padding.has(unused)) continue;
      padding.add(unused);
      const body = base16384Envelope(frame, original), envelope = JSON.parse(body.slice(READING_SNAPSHOT_BASE16384_ENVELOPE.length));
      expect(envelope.data.length).toBe(Math.ceil(compressed.length * 8 / 14));
      expect(envelope.data).toMatch(/^[\u4e00-\u8dff]+$/u);
      expect(isPackedReadingSnapshot(body)).toBe(true); expect(await unpackReadingSnapshot(body)).toBe(original);
      await expect(packReadingSnapshot(body)).rejects.toThrow("已经使用保存格式");
      if (unused) {
        const data = envelope.data.slice(0, -1) + String.fromCharCode(envelope.data.charCodeAt(envelope.data.length - 1) + 1);
        await expect(unpackReadingSnapshot(base16384Envelope(frame, original, { data }))).rejects.toThrow("原记录仍保留");
      }
    }
    expect([...padding].sort((a, b) => a - b)).toEqual([0, 2, 4, 6, 8, 10, 12]);
  });

  it("uses v6 only after pako v5 also overflows, keeps identical gzip bytes, and obeys the actual character contract", async () => {
    const original = binaryOrderFixture(125_000), frame = quotedFrame(original), compressed = pakoGzip(frame, { level: 9, memLevel: 5 });
    const oldV5 = base85Envelope(frame, original, { compressedBytes: compressed.length, data: fixtureBase85(Buffer.from(compressed)) });
    expect(oldV5.length).toBeGreaterThan(200_000);
    await expect(unpackReadingSnapshot(oldV5)).rejects.toThrow("原记录仍保留");
    const packed = await packReadingSnapshot(original);
    expect(packed.startsWith(READING_SNAPSHOT_BASE16384_ENVELOPE)).toBe(true);
    expect(packed.length).toBeLessThanOrEqual(200_000);
    const envelope = JSON.parse(packed.slice(READING_SNAPSHOT_BASE16384_ENVELOPE.length));
    expect(envelope.compressedBytes).toBe(compressed.length);
    expect(envelope.data).toBe(fixtureBase16384(compressed));
    expect(envelope.payloadBytes).toBe(frame.length);
    expect(await unpackReadingSnapshot(packed)).toBe(original);
    expect(Buffer.byteLength(packed)).toBeGreaterThan(200_000);
    const record = { schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111", caseId: "22222222-2222-4222-8222-222222222222",
      anchor: { kind: "revision", revisionId: "33333333-3333-4333-8333-333333333333" }, bodyFormat: "markdown", body: packed,
      tags: [], sourceRefs: [], lifecycle: "active", editVersion: 1, createdAt: "2026-10-16T00:00:00Z", updatedAt: "2026-10-16T00:00:00Z" };
    expect(researchNoteRecordSchema.parse(record).body).toBe(packed);
    expect(researchNoteRecordSchema.safeParse({ ...record, body: "一".repeat(200_001) }).success).toBe(false);
    const incompressible = Array.from({ length: 14_000 }, (_, index) => createHash("sha256").update(`uncompressible-unique/${index}`).digest("hex")).join("\n");
    expect(Buffer.byteLength(incompressible)).toBeLessThan(8 * 1024 * 1024);
    await expect(packReadingSnapshot(incompressible)).rejects.toThrow("超过本地记录容量");
  });

  it("rejects v6 non-alphabet code units, noncanonical lengths and invalid byte metadata", async () => {
    const original = "正文🌿\r\n", frame = binaryFrame([original], [0]), compressed = gzipSync(frame);
    const body = base16384Envelope(frame, original), envelope = JSON.parse(body.slice(READING_SNAPSHOT_BASE16384_ENVELOPE.length));
    const replacements = ["\u4dff", "\u8e00", "\ud800", "\udc00", " ", "\n", "A", "😀"];
    for (const char of replacements) await expect(unpackReadingSnapshot(base16384Envelope(frame, original, { data: char + envelope.data.slice(1) }))).rejects.toThrow("原记录仍保留");
    for (const changes of [{ data: envelope.data.slice(0, -1) }, { data: envelope.data + "一" },
      { compressedBytes: 0 }, { compressedBytes: -1 }, { compressedBytes: 1.5 }, { compressedBytes: "10" }, { compressedBytes: undefined },
      { compressedBytes: 8 * 1024 * 1024 + 1 }, { compressedBytes: compressed.length - 1 }, { compressedBytes: compressed.length + 1 },
      { unexpected: true }, { encoding: "text-chunk-dictionary-varint-gzip-base85" }]) {
      await expect(unpackReadingSnapshot(base16384Envelope(frame, original, changes))).rejects.toThrow("原记录仍保留");
    }
  });

  it("keeps v6 gzip, HRS4, dictionary, expansion, Unicode, checksum and total stored-size limits fail-closed", async () => {
    const original = "原文🌿", frame = binaryFrame([original], [0]);
    const badMagic = Buffer.from(frame); badMagic[0] = 0;
    for (const payload of [badMagic, frame.subarray(0, 11), binaryFrame(["\ud800"], [0]), binaryFrame(Buffer.from([0xff]), [0]),
      binaryFrame(["甲".repeat(1000)], [0, 0]), binaryFrame([original], [0x80, 0], 1), binaryFrame([original], [1]), binaryFrame([original], [0, 0], 1)]) {
      await expect(unpackReadingSnapshot(base16384Envelope(payload, original))).rejects.toThrow("原记录仍保留");
    }
    for (const changes of [{ sha256: "0".repeat(64) }, { plainBytes: 1 }, { plainBytes: 8 * 1024 * 1024 + 1 },
      { payloadBytes: 1 }, { payloadBytes: frame.length + 1 }, { payloadBytes: 16 * 1024 * 1024 + 1 },
      { data: fixtureBase16384(Buffer.from([0, 0, 0, 0])), compressedBytes: 4 }]) {
      await expect(unpackReadingSnapshot(base16384Envelope(frame, original, changes))).rejects.toThrow("原记录仍保留");
    }
    const body = base16384Envelope(frame, original);
    await expect(unpackReadingSnapshot(body + " ".repeat(200_001 - body.length))).rejects.toThrow("原记录仍保留");
    await expect(unpackReadingSnapshot(body.slice(0, -12))).rejects.toThrow("原记录仍保留");
  });
});
