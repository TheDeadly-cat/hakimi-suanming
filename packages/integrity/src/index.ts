type CanonicalValue = null | boolean | number | string | CanonicalValue[] | { [key: string]: CanonicalValue };

const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const BASE64_DECODE_TABLE = new Int16Array(128).fill(-1);
const BASE64_ENCODE_CHUNK_LENGTH = 16_384;
const BINARY_STRING_CHUNK_LENGTH = 32_768;
const MAX_CANONICAL_JSON_DEPTH = 256;
const CANONICAL_BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;

for (let index = 0; index < BASE64_ALPHABET.length; index += 1) {
  BASE64_DECODE_TABLE[BASE64_ALPHABET.charCodeAt(index)] = index;
}

function assertUint8Array(value: unknown): asserts value is Uint8Array {
  // `instanceof` 会误拒绝 iframe、jsdom 等其他 Realm 创建的真实 Uint8Array。
  if (!ArrayBuffer.isView(value) || Object.prototype.toString.call(value) !== "[object Uint8Array]") {
    throw new TypeError("字节输入必须是 Uint8Array");
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function invalidCanonicalBase64(): never {
  throw new TypeError("输入不是规范 Base64：必须使用标准字母表、完整填充，并将填充位设为零");
}

function decodeBase64Character(charCode: number): number {
  if (charCode >= BASE64_DECODE_TABLE.length) return -1;
  return BASE64_DECODE_TABLE[charCode];
}

function encodeBase64WithPlatform(bytes: Uint8Array): string | null {
  const platformBtoa = globalThis.btoa;
  if (typeof platformBtoa !== "function") return null;

  // Converting the complete array with one spread can exceed the engine's
  // argument limit. Fixed-size chunks retain the native Base64 fast path while
  // keeping the maximum call arity independent of the attachment size.
  const chunks = new Array<string>(Math.ceil(bytes.byteLength / BINARY_STRING_CHUNK_LENGTH));
  for (let offset = 0, chunkIndex = 0; offset < bytes.byteLength; offset += BINARY_STRING_CHUNK_LENGTH) {
    chunks[chunkIndex] = String.fromCharCode(
      ...bytes.subarray(offset, Math.min(offset + BINARY_STRING_CHUNK_LENGTH, bytes.byteLength))
    );
    chunkIndex += 1;
  }
  try {
    const encoded = platformBtoa.call(globalThis, chunks.join(""));
    return encoded.length === Math.ceil(bytes.byteLength / 3) * 4 &&
      CANONICAL_BASE64_PATTERN.test(encoded)
      ? encoded
      : null;
  } catch {
    return null;
  }
}

function decodeBase64WithPlatform(value: string): Uint8Array | null {
  const platformAtob = globalThis.atob;
  if (typeof platformAtob !== "function") return null;

  let binary: string;
  try {
    binary = platformAtob.call(globalThis, value);
  } catch {
    return null;
  }
  const output = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    output[index] = binary.charCodeAt(index);
  }
  return output;
}

function normalizeCanonicalValue(
  input: unknown,
  ancestors: WeakSet<object> = new WeakSet<object>(),
  depth = 0
): CanonicalValue {
  if (depth > MAX_CANONICAL_JSON_DEPTH) {
    throw new TypeError(`规范化 JSON 嵌套不能超过 ${MAX_CANONICAL_JSON_DEPTH} 层`);
  }
  if (input === null || typeof input === "boolean" || typeof input === "string") return input;
  if (typeof input === "number") {
    if (!Number.isFinite(input)) throw new TypeError("规范化 JSON 不接受非有限数字");
    return input;
  }
  if (Array.isArray(input)) {
    if (ancestors.has(input)) throw new TypeError("规范化 JSON 不接受循环数组");
    if (Object.getOwnPropertySymbols(input).length > 0) {
      throw new TypeError("规范化 JSON 数组不接受 Symbol 属性");
    }
    ancestors.add(input);
    try {
      const output = new Array<CanonicalValue>(input.length);
      for (let index = 0; index < input.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
        if (!descriptor) throw new TypeError("规范化 JSON 不接受稀疏数组");
        if (!("value" in descriptor)) throw new TypeError("规范化 JSON 不接受数组访问器");
        output[index] = normalizeCanonicalValue(descriptor.value, ancestors, depth + 1);
      }
      if (Object.keys(input).length !== input.length) {
        throw new TypeError("规范化 JSON 数组不接受额外命名属性");
      }
      return output;
    } finally {
      ancestors.delete(input);
    }
  }
  if (typeof input === "object") {
    const prototype = Object.getPrototypeOf(input);
    const constructorDescriptor = prototype === null
      ? null
      : Object.getOwnPropertyDescriptor(prototype, "constructor");
    if (
      Object.prototype.toString.call(input) !== "[object Object]" ||
      (prototype !== null && (
        !constructorDescriptor ||
        !("value" in constructorDescriptor) ||
        typeof constructorDescriptor.value !== "function" ||
        constructorDescriptor.value.name !== "Object"
      ))
    ) {
      throw new TypeError("规范化 JSON 只接受普通对象");
    }
    if (Object.getOwnPropertySymbols(input).length > 0) {
      throw new TypeError("规范化 JSON 对象不接受 Symbol 属性");
    }
    if (ancestors.has(input)) throw new TypeError("规范化 JSON 不接受循环对象");
    ancestors.add(input);
    try {
      const record = input as Record<string, unknown>;
      const output = Object.create(null) as Record<string, CanonicalValue>;
      for (const key of Object.keys(record).sort()) {
        const descriptor = Object.getOwnPropertyDescriptor(record, key);
        if (!descriptor || !("value" in descriptor)) {
          throw new TypeError("规范化 JSON 不接受对象访问器");
        }
        if (descriptor.value === undefined) continue;
        Object.defineProperty(output, key, {
          value: normalizeCanonicalValue(descriptor.value, ancestors, depth + 1),
          enumerable: true,
          configurable: true,
          writable: true
        });
      }
      return output;
    } finally {
      ancestors.delete(input);
    }
  }
  throw new TypeError(`规范化 JSON 不接受 ${typeof input}`);
}

export function canonicalStringify(value: unknown): string {
  return JSON.stringify(normalizeCanonicalValue(value));
}

/** 计算原始字节的 SHA-256，返回 32 字节摘要。 */
export async function sha256Bytes(bytes: Uint8Array): Promise<Uint8Array> {
  assertUint8Array(bytes);

  // 固化当前视图的精确字节范围，也避免调用方在异步摘要期间修改输入。
  const snapshot = Uint8Array.from(bytes);
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || typeof subtle.digest !== "function") {
    throw new Error("当前运行环境不支持 Web Crypto SHA-256。");
  }
  let digest: ArrayBuffer;
  try {
    digest = await subtle.digest("SHA-256", snapshot);
  } catch (cause) {
    throw new Error("Web Crypto SHA-256 计算失败。", { cause });
  }
  const output = new Uint8Array(digest);
  if (output.byteLength !== 32) throw new Error("Web Crypto 返回了无效的 SHA-256 长度。");
  return output;
}

/** 计算原始字节的 SHA-256，返回 64 位小写十六进制摘要。 */
export async function sha256BytesHex(bytes: Uint8Array): Promise<string> {
  return bytesToHex(await sha256Bytes(bytes));
}

export async function sha256Hex(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(typeof value === "string" ? value : canonicalStringify(value));
  return sha256BytesHex(bytes);
}

export async function verifySha256(value: unknown, expectedDigest: string): Promise<boolean> {
  if (typeof expectedDigest !== "string" || !/^[a-f0-9]{64}$/u.test(expectedDigest)) return false;
  return (await sha256Hex(value)) === expectedDigest;
}

/**
 * 将字节编码为规范 Base64：标准字母表、无空白，并按 RFC 4648 补齐 `=`。
 * 分块构建字符串，不会把大数组展开为函数参数。
 */
export function encodeCanonicalBase64(bytes: Uint8Array): string {
  assertUint8Array(bytes);
  if (bytes.length === 0) return "";

  const platformEncoded = encodeBase64WithPlatform(bytes);
  if (platformEncoded !== null) return platformEncoded;

  const chunks: string[] = [];
  let chunk = "";
  let index = 0;

  for (; index + 2 < bytes.length; index += 3) {
    const value = (bytes[index] << 16) | (bytes[index + 1] << 8) | bytes[index + 2];
    chunk +=
      BASE64_ALPHABET[(value >>> 18) & 0x3f] +
      BASE64_ALPHABET[(value >>> 12) & 0x3f] +
      BASE64_ALPHABET[(value >>> 6) & 0x3f] +
      BASE64_ALPHABET[value & 0x3f];

    if (chunk.length >= BASE64_ENCODE_CHUNK_LENGTH) {
      chunks.push(chunk);
      chunk = "";
    }
  }

  const remaining = bytes.length - index;
  if (remaining === 1) {
    const value = bytes[index];
    chunk += BASE64_ALPHABET[value >>> 2] + BASE64_ALPHABET[(value & 0x03) << 4] + "==";
  } else if (remaining === 2) {
    const value = (bytes[index] << 8) | bytes[index + 1];
    chunk +=
      BASE64_ALPHABET[(value >>> 10) & 0x3f] +
      BASE64_ALPHABET[(value >>> 4) & 0x3f] +
      BASE64_ALPHABET[(value & 0x0f) << 2] +
      "=";
  }

  chunks.push(chunk);
  return chunks.join("");
}

/**
 * 解码规范 Base64。拒绝宽松解码器常接受的空白、URL-safe 字母、缺失/错误填充和非零填充位。
 */
export function decodeCanonicalBase64(value: string): Uint8Array {
  if (typeof value !== "string") throw new TypeError("Base64 输入必须是字符串");
  if (value.length === 0) return new Uint8Array();
  if (value.length % 4 !== 0) invalidCanonicalBase64();
  if (!CANONICAL_BASE64_PATTERN.test(value)) invalidCanonicalBase64();

  let paddingLength = 0;
  if (value.endsWith("=")) {
    paddingLength = value.endsWith("==") ? 2 : 1;
  }

  const dataLength = value.length - paddingLength;
  if (
    (paddingLength === 0 && dataLength % 4 !== 0) ||
    (paddingLength === 1 && dataLength % 4 !== 3) ||
    (paddingLength === 2 && dataLength % 4 !== 2)
  ) {
    invalidCanonicalBase64();
  }

  const finalSextet = decodeBase64Character(value.charCodeAt(dataLength - 1));
  if ((paddingLength === 2 && (finalSextet & 0x0f) !== 0) || (paddingLength === 1 && (finalSextet & 0x03) !== 0)) {
    invalidCanonicalBase64();
  }

  const platformDecoded = decodeBase64WithPlatform(value);
  if (platformDecoded !== null) return platformDecoded;

  const output = new Uint8Array((value.length / 4) * 3 - paddingLength);
  let outputIndex = 0;

  for (let index = 0; index < value.length; index += 4) {
    const first = decodeBase64Character(value.charCodeAt(index));
    const second = decodeBase64Character(value.charCodeAt(index + 1));
    const third = index + 2 < dataLength ? decodeBase64Character(value.charCodeAt(index + 2)) : 0;
    const fourth = index + 3 < dataLength ? decodeBase64Character(value.charCodeAt(index + 3)) : 0;
    const decoded = (first << 18) | (second << 12) | (third << 6) | fourth;

    if (outputIndex < output.length) output[outputIndex++] = (decoded >>> 16) & 0xff;
    if (outputIndex < output.length) output[outputIndex++] = (decoded >>> 8) & 0xff;
    if (outputIndex < output.length) output[outputIndex++] = decoded & 0xff;
  }

  return output;
}
