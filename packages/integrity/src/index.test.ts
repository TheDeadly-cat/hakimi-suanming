import { Buffer } from "node:buffer";
import { describe, expect, it, vi } from "vitest";
import {
  canonicalStringify,
  decodeCanonicalBase64,
  encodeCanonicalBase64,
  sha256Bytes,
  sha256BytesHex,
  sha256Hex,
  verifySha256
} from "./index";

describe("canonicalStringify", () => {
  it("对象键顺序不影响输出", () => {
    expect(canonicalStringify({ b: 2, a: { d: 4, c: 3 } })).toBe(
      canonicalStringify({ a: { c: 3, d: 4 }, b: 2 })
    );
  });

  it("拒绝不能稳定表示的值", () => {
    expect(() => canonicalStringify({ value: Number.NaN })).toThrow("非有限数字");
    expect(() => canonicalStringify({ value: 1n })).toThrow("bigint");
  });
});

describe("sha256Hex", () => {
  it("生成可重算的 64 位小写摘要", async () => {
    const digest = await sha256Hex({ b: 2, a: 1 });
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    await expect(verifySha256({ a: 1, b: 2 }, digest)).resolves.toBe(true);
    await expect(verifySha256({ a: 1, b: 3 }, digest)).resolves.toBe(false);
  });

  it("拒绝格式不正确的期望摘要", async () => {
    await expect(verifySha256({}, "not-a-digest")).resolves.toBe(false);
  });
});

describe("原始字节 SHA-256", () => {
  it("按 Uint8Array 的精确视图计算标准向量", async () => {
    const backing = new Uint8Array([0xff, 0x61, 0x62, 0x63, 0xff]);
    const bytes = backing.subarray(1, 4);

    await expect(sha256BytesHex(bytes)).resolves.toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
    await expect(sha256Bytes(bytes)).resolves.toEqual(
      new Uint8Array([
        0xba, 0x78, 0x16, 0xbf, 0x8f, 0x01, 0xcf, 0xea, 0x41, 0x41, 0x40, 0xde, 0x5d, 0xae, 0x22, 0x23,
        0xb0, 0x03, 0x61, 0xa3, 0x96, 0x17, 0x7a, 0x9c, 0xb4, 0x10, 0xff, 0x61, 0xf2, 0x00, 0x15, 0xad
      ])
    );
  });

  it("不会把字节数组规范化为 JSON 后再摘要", async () => {
    const bytes = new Uint8Array([0x61, 0x62, 0x63]);
    await expect(sha256BytesHex(bytes)).resolves.not.toBe(await sha256Hex(bytes));
  });

  it("在运行时拒绝非 Uint8Array 输入", async () => {
    await expect(sha256BytesHex([0x61, 0x62, 0x63] as unknown as Uint8Array)).rejects.toThrow("Uint8Array");
  });
});

describe("规范 Base64", () => {
  it.each([
    ["", ""],
    ["f", "Zg=="],
    ["fo", "Zm8="],
    ["foo", "Zm9v"],
    ["foob", "Zm9vYg=="],
    ["fooba", "Zm9vYmE="],
    ["foobar", "Zm9vYmFy"]
  ])("编码并解码 RFC 4648 向量 %j", (plainText, encoded) => {
    const bytes = new TextEncoder().encode(plainText);
    expect(encodeCanonicalBase64(bytes)).toBe(encoded);
    expect(new TextDecoder().decode(decodeCanonicalBase64(encoded))).toBe(plainText);
  });

  it.each([
    ["Zg", "缺失填充"],
    ["Zg=", "长度错误"],
    ["Zg===", "填充过多"],
    ["Z=g=", "中间填充"],
    ["Zg==\n", "空白"],
    ["Zm-8", "URL-safe 字母"],
    ["Zm$8", "非法字符"],
    ["Zh==", "双等号前的非零填充位"],
    ["Zm9=", "单等号前的非零填充位"]
  ])("拒绝非规范输入：%s（%s）", (encoded) => {
    expect(() => decodeCanonicalBase64(encoded)).toThrow("规范 Base64");
  });

  it("大数组可安全往返且不会把完整数组展开为函数参数", () => {
    const bytes = new Uint8Array(2_000_003);
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = (index * 31 + 17) & 0xff;

    const encoded = encodeCanonicalBase64(bytes);
    const decoded = decodeCanonicalBase64(encoded);
    expect(encoded.length).toBe(Math.ceil(bytes.length / 3) * 4);
    expect(decoded.byteLength).toBe(bytes.byteLength);
    // Vitest's structural matcher enumerates two million array properties and
    // can exceed the suite timeout under parallel load. Buffer.compare still
    // checks every byte, but performs the comparison in the native fast path.
    expect(
      Buffer.compare(
        Buffer.from(decoded.buffer, decoded.byteOffset, decoded.byteLength),
        Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      )
    ).toBe(0);
  });

  it("在没有平台 Base64 API 时仍使用严格的可移植后备路径", () => {
    vi.stubGlobal("btoa", undefined);
    vi.stubGlobal("atob", undefined);
    try {
      const bytes = new Uint8Array([0, 1, 2, 127, 128, 253, 254, 255]);
      const encoded = encodeCanonicalBase64(bytes);
      expect(encoded).toBe("AAECf4D9/v8=");
      expect(decodeCanonicalBase64(encoded)).toEqual(bytes);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("在运行时拒绝错误的输入类型", () => {
    expect(() => encodeCanonicalBase64([1, 2, 3] as unknown as Uint8Array)).toThrow("Uint8Array");
    expect(() => decodeCanonicalBase64(123 as unknown as string)).toThrow("字符串");
  });
});
