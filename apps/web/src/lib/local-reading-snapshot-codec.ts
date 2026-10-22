/** Lossless storage for long reading reports. Ordinary notes stay plain text. */
export const READING_SNAPSHOT_ENVELOPE = "<!-- hakimi.reading-snapshot/gzip-v1 -->";
export const READING_SNAPSHOT_DICTIONARY_ENVELOPE = "<!-- hakimi.reading-snapshot/line-dictionary-gzip-v2 -->";
export const READING_SNAPSHOT_CHUNK_ENVELOPE = "<!-- hakimi.reading-snapshot/text-chunk-dictionary-gzip-v3 -->";
export const READING_SNAPSHOT_BINARY_ENVELOPE = "<!-- hakimi.reading-snapshot/text-chunk-dictionary-binary-gzip-v4 -->";
export const READING_SNAPSHOT_BASE85_ENVELOPE = "<!-- hakimi.reading-snapshot/text-chunk-dictionary-binary-gzip-base85-v5 -->";
export const READING_SNAPSHOT_BASE16384_ENVELOPE = "<!-- hakimi.reading-snapshot/text-chunk-dictionary-binary-gzip-base16384-v6 -->";
const MAX_STORED_CHARACTERS = 200_000;
const MAX_PLAIN_BYTES = 8 * 1024 * 1024;
const MAX_DICTIONARY_BYTES = 16 * 1024 * 1024;
const encoder = new TextEncoder();
const incompleteUnicode = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u;
const byteStream = (bytes: Uint8Array<ArrayBuffer>) => new ReadableStream<Uint8Array<ArrayBuffer>>({ start(controller) { controller.enqueue(bytes); controller.close(); } });
const digest = async (bytes: Uint8Array<ArrayBuffer>) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (value) => value.toString(16).padStart(2, "0")).join("");
function toBase64(bytes: Uint8Array) {
  let result = "";
  for (let offset = 0; offset < bytes.length; offset += 16_384) result += String.fromCharCode(...bytes.subarray(offset, offset + 16_384));
  return btoa(result);
}
// RFC 1924 alphabet. Each big-endian 32-bit block uses exactly five digits;
// compressedBytes records the final block's zero padding explicitly.
const BASE85_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~";
function toBase85(bytes: Uint8Array): string {
  const blocks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 4) {
    let value = 0;
    for (let part = 0; part < 4; part += 1) value = value * 256 + (bytes[offset + part] ?? 0);
    let block = "";
    for (let digit = 0; digit < 5; digit += 1) {
      block = BASE85_ALPHABET[value % 85]! + block;
      value = Math.floor(value / 85);
    }
    blocks.push(block);
  }
  return blocks.join("");
}
function fromBase85(data: string, compressedBytes: unknown): Uint8Array<ArrayBuffer> {
  if (typeof compressedBytes !== "number" || !Number.isInteger(compressedBytes)
    || compressedBytes <= 0 || compressedBytes > MAX_PLAIN_BYTES
    || data.length !== Math.ceil(compressedBytes / 4) * 5) throw new Error("base85-length");
  const bytes = new Uint8Array(compressedBytes);
  for (let offset = 0; offset < data.length; offset += 5) {
    let value = 0;
    for (let digit = 0; digit < 5; digit += 1) {
      const index = BASE85_ALPHABET.indexOf(data[offset + digit]!);
      if (index < 0) throw new Error("base85-character");
      value = value * 85 + index;
    }
    if (value > 0xffff_ffff) throw new Error("base85-overflow");
    const byteOffset = offset / 5 * 4;
    for (let part = 3; part >= 0; part -= 1) {
      const byte = value % 256;
      if (byteOffset + part < compressedBytes) bytes[byteOffset + part] = byte;
      else if (byte !== 0) throw new Error("base85-padding");
      value = Math.floor(value / 256);
    }
  }
  return bytes;
}
// One big-endian 14-bit symbol per BMP character, U+4E00..U+8DFF.
// The note contract counts UTF-16 characters, not UTF-8 transport bytes.
// Mask consumed bits on each step so the accumulator stays below 22 bits.
function toBase16384(bytes: Uint8Array): string {
  const symbols: string[] = [];
  let buffer = 0, bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte; bits += 8;
    if (bits >= 14) {
      bits -= 14;
      symbols.push(String.fromCharCode(0x4e00 + (buffer >>> bits)));
      buffer &= (1 << bits) - 1;
    }
  }
  if (bits) symbols.push(String.fromCharCode(0x4e00 + (buffer << (14 - bits))));
  return symbols.join("");
}
function fromBase16384(data: string, compressedBytes: unknown): Uint8Array<ArrayBuffer> {
  if (typeof compressedBytes !== "number" || !Number.isInteger(compressedBytes)
    || compressedBytes <= 0 || compressedBytes > MAX_PLAIN_BYTES
    || data.length !== Math.ceil(compressedBytes * 8 / 14)) throw new Error("base16384-length");
  const bytes = new Uint8Array(compressedBytes);
  let buffer = 0, bits = 0, offset = 0;
  for (let index = 0; index < data.length; index += 1) {
    const value = data.charCodeAt(index) - 0x4e00;
    if (value < 0 || value > 0x3fff) throw new Error("base16384-character");
    buffer = (buffer << 14) | value; bits += 14;
    while (bits >= 8 && offset < compressedBytes) {
      bits -= 8; bytes[offset++] = (buffer >>> bits) & 0xff;
      buffer &= (1 << bits) - 1;
    }
  }
  if (offset !== compressedBytes || bits !== data.length * 14 - compressedBytes * 8 || buffer !== 0) throw new Error("base16384-padding");
  return bytes;
}
/** HRS4, uint32-LE dictionary byte length, uint32-LE reference count, UTF-8
 * JSON string array, then canonical unsigned LEB128 dictionary indices. */
function binaryChunkPayload(dictionary: readonly string[], order: readonly number[]): Uint8Array<ArrayBuffer> {
  const dictionaryBytes = encoder.encode(JSON.stringify(dictionary));
  const indexBytes: number[] = [];
  for (let index of order) {
    do {
      const low = index % 128;
      index = Math.floor(index / 128);
      indexBytes.push(low | (index ? 128 : 0));
    } while (index);
  }
  const size = 12 + dictionaryBytes.byteLength + indexBytes.length;
  if (size > MAX_DICTIONARY_BYTES) throw new Error("完整解读超过本地记录容量，请先导出文件保存。");
  const bytes = new Uint8Array(size), header = new DataView(bytes.buffer);
  bytes.set([72, 82, 83, 52]);
  header.setUint32(4, dictionaryBytes.byteLength, true);
  header.setUint32(8, order.length, true);
  bytes.set(dictionaryBytes, 12); bytes.set(indexBytes, 12 + dictionaryBytes.byteLength);
  return bytes;
}
function readBinaryChunkPayload(payload: Uint8Array<ArrayBuffer>, plainBytes: number): { dictionary: unknown; order: number[] } {
  if (payload.byteLength < 12 || ![72, 82, 83, 52].every((byte, index) => payload[index] === byte)) throw new Error("binary-header");
  const header = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  const dictionaryBytes = header.getUint32(4, true), count = header.getUint32(8, true);
  const end = 12 + dictionaryBytes;
  if (!dictionaryBytes || end > payload.byteLength || !count || count > plainBytes + 1
    || payload.byteLength - end < count || payload.byteLength - end > count * 5) throw new Error("binary-length");
  const dictionary: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(payload.subarray(12, end)));
  const order: number[] = [];
  let offset = end;
  for (let item = 0; item < count; item += 1) {
    let value = 0, finished = false;
    for (let part = 0; part < 5; part += 1) {
      if (offset >= payload.byteLength) throw new Error("binary-truncated-index");
      const byte = payload[offset++]!;
      value += (byte & 127) * 2 ** (part * 7);
      if (!(byte & 128)) {
        if ((part > 0 && byte === 0) || value > 0xffff_ffff) throw new Error("binary-noncanonical-index");
        finished = true; break;
      }
    }
    if (!finished) throw new Error("binary-index-overflow");
    order.push(value);
  }
  if (offset !== payload.byteLength) throw new Error("binary-trailing-data");
  return { dictionary, order };
}
async function readBounded(stream: ReadableStream<Uint8Array>, maximum: number): Promise<Uint8Array<ArrayBuffer>> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximum) { await reader.cancel(); throw new Error("解读内容超出可安全打开的大小。"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}
export async function packReadingSnapshot(plainText: string): Promise<string> {
  if (isPackedReadingSnapshot(plainText)) throw new Error("这份解读已经使用保存格式，请先打开原文。");
  if (plainText.length <= MAX_STORED_CHARACTERS) return plainText;
  if (incompleteUnicode.test(plainText)) throw new Error("解读含有不完整字符，请重新生成后保存。");
  if (typeof CompressionStream === "undefined") throw new Error("当前环境暂不能保存这份较长的解读，请先导出完整文件。");
  const bytes = encoder.encode(plainText);
  if (bytes.byteLength > MAX_PLAIN_BYTES) throw new Error("完整解读过长，请先导出文件保存。");
  const compressed = await readBounded(byteStream(bytes).pipeThrough(new CompressionStream("gzip")), MAX_PLAIN_BYTES);
  const sha256 = await digest(bytes);
  const body = `${READING_SNAPSHOT_ENVELOPE}\n${JSON.stringify({ encoding: "gzip-base64", plainBytes: bytes.byteLength, sha256, data: toBase64(compressed) })}`;
  if (body.length <= MAX_STORED_CHARACTERS) return body;
  // Long reports repeat exact source passages beyond gzip's local window. A
  // global line dictionary keeps every character while storing each line once.
  const dictionary: string[] = [], indices = new Map<string, number>();
  const order = plainText.split("\n").map((line) => {
    if (!indices.has(line)) { indices.set(line, dictionary.length); dictionary.push(line); }
    return indices.get(line)!;
  });
  const payload = encoder.encode(JSON.stringify({ dictionary, order }));
  if (payload.byteLength > MAX_DICTIONARY_BYTES) throw new Error("完整解读超过本地记录容量，请先导出文件保存。");
  const packed = await readBounded(byteStream(payload).pipeThrough(new CompressionStream("gzip")), MAX_PLAIN_BYTES);
  const compact = `${READING_SNAPSHOT_DICTIONARY_ENVELOPE}\n${JSON.stringify({ encoding: "line-dictionary-gzip-base64", plainBytes: bytes.byteLength,
    payloadBytes: payload.byteLength, sha256, data: toBase64(packed) })}`;
  if (compact.length <= MAX_STORED_CHARACTERS) return compact;
  // Different labels and node references can wrap the same long passages.
  // Keep punctuation in each chunk, so joining references restores exact bytes.
  const chunks = plainText.split(/(?<=[\n。；，：,{}\[\]:])/u);
  const chunkDictionary = [...new Set(chunks)];
  const chunkIndices = new Map(chunkDictionary.map((chunk, index) => [chunk, index]));
  const chunkPayload = encoder.encode(JSON.stringify({ dictionary: chunkDictionary, order: chunks.map((chunk) => chunkIndices.get(chunk)!) }));
  if (chunkPayload.byteLength > MAX_DICTIONARY_BYTES) throw new Error("完整解读超过本地记录容量，请先导出文件保存。");
  const chunkPacked = await readBounded(byteStream(chunkPayload).pipeThrough(new CompressionStream("gzip")), MAX_PLAIN_BYTES);
  const chunkBody = `${READING_SNAPSHOT_CHUNK_ENVELOPE}\n${JSON.stringify({ encoding: "text-chunk-dictionary-gzip-base64", plainBytes: bytes.byteLength,
    payloadBytes: chunkPayload.byteLength, sha256, data: toBase64(chunkPacked) })}`;
  if (chunkBody.length <= MAX_STORED_CHARACTERS) return chunkBody;
  // Preserve every older successful representation. Only a v3 result that is
  // too large reaches v4; references become binary, not shortened prose.
  const binaryPayload = binaryChunkPayload(chunkDictionary, chunks.map((chunk) => chunkIndices.get(chunk)!));
  const binaryPacked = await readBounded(byteStream(binaryPayload).pipeThrough(new CompressionStream("gzip")), MAX_PLAIN_BYTES);
  const binaryBody = `${READING_SNAPSHOT_BINARY_ENVELOPE}\n${JSON.stringify({ encoding: "text-chunk-dictionary-varint-gzip-base64", plainBytes: bytes.byteLength,
    payloadBytes: binaryPayload.byteLength, sha256, data: toBase64(binaryPacked) })}`;
  if (binaryBody.length <= MAX_STORED_CHARACTERS) return binaryBody;
  // Keep every successful historical encoding unchanged. For an oversized v4
  // report only, reserve the one-byte indices for frequent chunks and sort the
  // remaining dictionary so similar text compresses together. This is the same
  // HRS4 format: only the dictionary order and its exact references change.
  const frequency = new Map<string, number>();
  for (const chunk of chunks) frequency.set(chunk, (frequency.get(chunk) ?? 0) + 1);
  const ranked = [...chunkDictionary].sort((a, b) => frequency.get(b)! - frequency.get(a)!);
  const reordered = [...ranked.slice(0, 128), ...ranked.slice(128).sort()];
  const reorderedIndices = new Map(reordered.map((chunk, index) => [chunk, index]));
  const reorderedPayload = binaryChunkPayload(reordered, chunks.map((chunk) => reorderedIndices.get(chunk)!));
  const reorderedPacked = await readBounded(byteStream(reorderedPayload).pipeThrough(new CompressionStream("gzip")), MAX_PLAIN_BYTES);
  const reorderedBody = `${READING_SNAPSHOT_BINARY_ENVELOPE}\n${JSON.stringify({ encoding: "text-chunk-dictionary-varint-gzip-base64", plainBytes: bytes.byteLength,
    payloadBytes: reorderedPayload.byteLength, sha256, data: toBase64(reorderedPacked) })}`;
  if (reorderedBody.length <= MAX_STORED_CHARACTERS) return reorderedBody;
  // Metadata and quoted prose can wrap the same text with different prefixes.
  // Only after every earlier representation exceeds capacity, retain spaces
  // and quotation marks as extra chunk boundaries. HRS4's decoder already
  // joins arbitrary chunks exactly; no text, checksums or limits change.
  const quotedChunks = plainText.split(/(?<=[\n。；，：,{}\[\]: "“”])/u);
  const quotedFrequency = new Map<string, number>();
  for (const chunk of quotedChunks) quotedFrequency.set(chunk, (quotedFrequency.get(chunk) ?? 0) + 1);
  const quotedRanked = [...quotedFrequency.keys()].sort((a, b) => quotedFrequency.get(b)! - quotedFrequency.get(a)!);
  const quotedDictionary = [...quotedRanked.slice(0, 128), ...quotedRanked.slice(128).sort()];
  const quotedIndices = new Map(quotedDictionary.map((chunk, index) => [chunk, index]));
  const quotedPayload = binaryChunkPayload(quotedDictionary, quotedChunks.map((chunk) => quotedIndices.get(chunk)!));
  const quotedPacked = await readBounded(byteStream(quotedPayload).pipeThrough(new CompressionStream("gzip")), MAX_PLAIN_BYTES);
  const quotedBody = `${READING_SNAPSHOT_BINARY_ENVELOPE}\n${JSON.stringify({ encoding: "text-chunk-dictionary-varint-gzip-base64", plainBytes: bytes.byteLength,
    payloadBytes: quotedPayload.byteLength, sha256, data: toBase64(quotedPacked) })}`;
  if (quotedBody.length <= MAX_STORED_CHARACTERS) return quotedBody;
  // Only the ASCII transport changes: preserve the exact last HRS4 payload and
  // gzip bytes. Earlier successful formats keep their original saved bytes.
  const base85Body = `${READING_SNAPSHOT_BASE85_ENVELOPE}\n${JSON.stringify({ encoding: "text-chunk-dictionary-varint-gzip-base85", plainBytes: bytes.byteLength,
    payloadBytes: quotedPayload.byteLength, compressedBytes: quotedPacked.byteLength, sha256, data: toBase85(quotedPacked) })}`;
  if (base85Body.length <= MAX_STORED_CHARACTERS) return base85Body;
  // Load the stronger gzip encoder only after all original encodings overflow.
  // The HRS4 payload, v5 envelope, checksum and decoder remain unchanged.
  const { gzip } = await import("pako");
  const compactPacked = gzip(quotedPayload, { level: 9, memLevel: 5 });
  const compactBody = `${READING_SNAPSHOT_BASE85_ENVELOPE}\n${JSON.stringify({ encoding: "text-chunk-dictionary-varint-gzip-base85", plainBytes: bytes.byteLength,
    payloadBytes: quotedPayload.byteLength, compressedBytes: compactPacked.byteLength, sha256, data: toBase85(compactPacked) })}`;
  if (compactBody.length <= MAX_STORED_CHARACTERS) return compactBody;
  // Change only the text transport after every original successful path.
  // Reuse the exact compact gzip bytes, HRS4 payload and integrity metadata.
  const denseBody = `${READING_SNAPSHOT_BASE16384_ENVELOPE}\n${JSON.stringify({ encoding: "text-chunk-dictionary-varint-gzip-base16384", plainBytes: bytes.byteLength,
    payloadBytes: quotedPayload.byteLength, compressedBytes: compactPacked.byteLength, sha256, data: toBase16384(compactPacked) })}`;
  if (denseBody.length > MAX_STORED_CHARACTERS) throw new Error("完整解读超过本地记录容量，请先导出文件保存。");
  return denseBody;
}
export function isPackedReadingSnapshot(body: string): boolean {
  return body.startsWith(READING_SNAPSHOT_ENVELOPE) || body.startsWith(READING_SNAPSHOT_DICTIONARY_ENVELOPE) || body.startsWith(READING_SNAPSHOT_CHUNK_ENVELOPE) || body.startsWith(READING_SNAPSHOT_BINARY_ENVELOPE) || body.startsWith(READING_SNAPSHOT_BASE85_ENVELOPE) || body.startsWith(READING_SNAPSHOT_BASE16384_ENVELOPE);
}

export async function unpackReadingSnapshot(body: string): Promise<string> {
  if (!isPackedReadingSnapshot(body)) return body;
  try {
    if (body.length > MAX_STORED_CHARACTERS || typeof DecompressionStream === "undefined") throw new Error("unsupported");
    const base16384Format = body.startsWith(READING_SNAPSHOT_BASE16384_ENVELOPE);
    const base85Format = body.startsWith(READING_SNAPSHOT_BASE85_ENVELOPE);
    const binaryTransport = base16384Format || base85Format;
    const binaryFormat = binaryTransport || body.startsWith(READING_SNAPSHOT_BINARY_ENVELOPE);
    const chunkFormat = binaryFormat || body.startsWith(READING_SNAPSHOT_CHUNK_ENVELOPE);
    const dictionaryFormat = chunkFormat || body.startsWith(READING_SNAPSHOT_DICTIONARY_ENVELOPE);
    const marker = base16384Format ? READING_SNAPSHOT_BASE16384_ENVELOPE : base85Format ? READING_SNAPSHOT_BASE85_ENVELOPE : binaryFormat ? READING_SNAPSHOT_BINARY_ENVELOPE : chunkFormat ? READING_SNAPSHOT_CHUNK_ENVELOPE : dictionaryFormat ? READING_SNAPSHOT_DICTIONARY_ENVELOPE : READING_SNAPSHOT_ENVELOPE;
    const value: unknown = JSON.parse(body.slice(marker.length).trimStart());
    if (!value || typeof value !== "object") throw new Error("format");
    const envelope = value as Record<string, unknown>;
    if (Object.keys(envelope).sort().join(",") !== (binaryTransport ? "compressedBytes,data,encoding,payloadBytes,plainBytes,sha256" : dictionaryFormat ? "data,encoding,payloadBytes,plainBytes,sha256" : "data,encoding,plainBytes,sha256")
      || envelope.encoding !== (base16384Format ? "text-chunk-dictionary-varint-gzip-base16384" : base85Format ? "text-chunk-dictionary-varint-gzip-base85" : binaryFormat ? "text-chunk-dictionary-varint-gzip-base64" : chunkFormat ? "text-chunk-dictionary-gzip-base64" : dictionaryFormat ? "line-dictionary-gzip-base64" : "gzip-base64") || typeof envelope.plainBytes !== "number" || !Number.isInteger(envelope.plainBytes)
      || envelope.plainBytes <= 0 || envelope.plainBytes > MAX_PLAIN_BYTES || typeof envelope.sha256 !== "string"
      || !/^[a-f0-9]{64}$/.test(envelope.sha256) || typeof envelope.data !== "string"
      || (!binaryTransport && !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(envelope.data))) throw new Error("format");
    const compressed = base16384Format ? fromBase16384(envelope.data, envelope.compressedBytes) : base85Format ? fromBase85(envelope.data, envelope.compressedBytes)
      : Uint8Array.from(atob(envelope.data), (value) => value.charCodeAt(0));
    if (dictionaryFormat) {
      if (typeof envelope.payloadBytes !== "number" || !Number.isInteger(envelope.payloadBytes)
        || envelope.payloadBytes <= 0 || envelope.payloadBytes > MAX_DICTIONARY_BYTES) throw new Error("payload-size");
      const payload = await readBounded(byteStream(compressed).pipeThrough(new DecompressionStream("gzip")), envelope.payloadBytes);
      if (payload.byteLength !== envelope.payloadBytes) throw new Error("payload-size");
      const decoded: unknown = binaryFormat ? readBinaryChunkPayload(payload, envelope.plainBytes)
        : JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(payload));
      if (!decoded || typeof decoded !== "object" || Object.keys(decoded).sort().join(",") !== "dictionary,order") throw new Error("dictionary");
      const { dictionary, order } = decoded as Record<string, unknown>;
      if (!Array.isArray(dictionary) || !Array.isArray(order) || !dictionary.length || !order.length
        || dictionary.length > envelope.plainBytes + 1 || order.length > envelope.plainBytes + 1
        || !dictionary.every((line): line is string => typeof line === "string" && (chunkFormat || !line.includes("\n")) && !incompleteUnicode.test(line))) throw new Error("dictionary");
      const sizes = dictionary.map((line) => encoder.encode(line).byteLength);
      let expandedBytes = chunkFormat ? 0 : order.length - 1;
      for (const index of order) {
        if (!Number.isInteger(index) || index < 0 || index >= dictionary.length) throw new Error("index");
        expandedBytes += sizes[index]!;
        if (expandedBytes > envelope.plainBytes || expandedBytes > MAX_PLAIN_BYTES) throw new Error("expanded-size");
      }
      if (expandedBytes !== envelope.plainBytes) throw new Error("expanded-size");
      const text = order.map((index) => dictionary[index]!).join(chunkFormat ? "" : "\n"), bytes = encoder.encode(text);
      if (bytes.byteLength !== envelope.plainBytes || await digest(bytes) !== envelope.sha256) throw new Error("integrity");
      return text;
    }
    const bytes = await readBounded(byteStream(compressed).pipeThrough(new DecompressionStream("gzip")), Math.min(envelope.plainBytes, MAX_PLAIN_BYTES));
    if (bytes.byteLength !== envelope.plainBytes || await digest(bytes) !== envelope.sha256) throw new Error("integrity");
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    throw new Error("这份解读记录未能完整打开。原记录仍保留，请尝试重新打开或从备份恢复。");
  }
}
