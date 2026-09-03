import { createHash } from "node:crypto";
import { types as utilTypes } from "node:util";

const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PROTOTYPE = Array.prototype;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const NUMBER_IS_FINITE = Number.isFinite;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_IS = Object.is;
const OBJECT_KEYS = Object.keys;
const OBJECT_PROTOTYPE = Object.prototype;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const REGEXP_TEST = Function.call.bind(RegExp.prototype.test) as (pattern: RegExp, value: string) => boolean;
const IS_PROXY = utilTypes.isProxy;
const MAX_ARRAY_LENGTH = 4_096;
const MAX_DEPTH = 64;
const MAX_NODES = 200_000;
const MAX_TEXT = 2_000_000;

export type JsonPrimitive = boolean | null | number | string;
export interface JsonObject { readonly [key: string]: JsonValue; }
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];

export class FormalIntakeSuccessorError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "FormalIntakeSuccessorError";
    this.code = code;
  }
}

export function fail(code: string, message: string): never {
  throw new FormalIntakeSuccessorError(code, message);
}

type CaptureState = { active: WeakSet<object>; nodes: number; text: number };

function capture(value: unknown, path: string, depth: number, state: CaptureState): JsonValue {
  if (depth > MAX_DEPTH) fail("INPUT_DEPTH_EXCEEDED", `${path} 超过最大深度。`);
  state.nodes += 1;
  if (state.nodes > MAX_NODES) fail("INPUT_NODE_LIMIT_EXCEEDED", `${path} 超过节点上限。`);
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") {
    state.text += value.length;
    if (state.text > MAX_TEXT) fail("INPUT_TEXT_LIMIT_EXCEEDED", `${path} 超过文本上限。`);
    return value;
  }
  if (typeof value === "number") {
    if (!NUMBER_IS_FINITE(value) || OBJECT_IS(value, -0)) fail("INPUT_INVALID", `${path} 数字无效。`);
    return value;
  }
  if (typeof value !== "object" || IS_PROXY(value)) fail("INPUT_UNSAFE", `${path} 不是安全 JSON 值。`);
  if (state.active.has(value)) fail("INPUT_CYCLE_FORBIDDEN", `${path} 不得循环引用。`);
  state.active.add(value);
  try {
    if (ARRAY_IS_ARRAY(value)) {
      if (OBJECT_GET_PROTOTYPE_OF(value) !== ARRAY_PROTOTYPE || value.length > MAX_ARRAY_LENGTH) {
        fail("INPUT_UNSAFE", `${path} 不是受限普通数组。`);
      }
      const keys = REFLECT_OWN_KEYS(value);
      if (keys.length !== value.length + 1) fail("INPUT_UNSAFE", `${path} 数组键集合无效。`);
      const descriptors = OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(value);
      const output: JsonValue[] = [];
      for (let index = 0; index < value.length; index += 1) {
        const key = `${index}`;
        const descriptor = OBJECT_HAS_OWN(descriptors, key) ? descriptors[key] : undefined;
        if (!descriptor || !OBJECT_HAS_OWN(descriptor, "value") || !descriptor.enumerable
          || OBJECT_HAS_OWN(descriptor, "get") || OBJECT_HAS_OWN(descriptor, "set")) {
          fail("INPUT_UNSAFE", `${path}[${index}] 不是普通数据属性。`);
        }
        OBJECT_DEFINE_PROPERTY(output, key, {
          configurable: true,
          enumerable: true,
          value: capture(descriptor.value, `${path}[${index}]`, depth + 1, state),
          writable: true
        });
      }
      return OBJECT_FREEZE(output);
    }
    const prototype = OBJECT_GET_PROTOTYPE_OF(value);
    if (prototype !== OBJECT_PROTOTYPE && prototype !== null) fail("INPUT_UNSAFE", `${path} 必须是普通对象。`);
    const keys = REFLECT_OWN_KEYS(value);
    const descriptors = OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(value);
    const output: Record<string, JsonValue> = OBJECT_CREATE(null) as Record<string, JsonValue>;
    for (const key of keys) {
      if (typeof key !== "string") fail("INPUT_UNSAFE", `${path} 不得有 symbol 键。`);
      const descriptor = OBJECT_HAS_OWN(descriptors, key) ? descriptors[key] : undefined;
      if (!descriptor || !OBJECT_HAS_OWN(descriptor, "value") || !descriptor.enumerable
        || OBJECT_HAS_OWN(descriptor, "get") || OBJECT_HAS_OWN(descriptor, "set")) {
        fail("INPUT_UNSAFE", `${path}.${key} 不是普通数据属性。`);
      }
      output[key] = capture(descriptor.value, `${path}.${key}`, depth + 1, state);
    }
    return OBJECT_FREEZE(output);
  } finally {
    state.active.delete(value);
  }
}

export function captureJson(value: unknown, path = "input"): JsonValue {
  return capture(value, path, 0, { active: new WeakSet<object>(), nodes: 0, text: 0 });
}

export function assertObject(value: JsonValue, path: string): asserts value is JsonObject {
  if (value === null || ARRAY_IS_ARRAY(value) || typeof value !== "object") {
    fail("INPUT_INVALID", `${path} 必须是对象。`);
  }
}

export function assertExactKeys(value: JsonValue, expected: readonly string[], path: string): asserts value is JsonObject {
  assertObject(value, path);
  const actual = OBJECT_KEYS(value);
  if (actual.length !== expected.length || expected.some((key) => !OBJECT_HAS_OWN(value, key))) {
    fail("INPUT_KEYS_INVALID", `${path} 键集合不匹配。`);
  }
}

export function assertArray(value: JsonValue, path: string): asserts value is readonly JsonValue[] {
  if (!ARRAY_IS_ARRAY(value)) fail("INPUT_INVALID", `${path} 必须是数组。`);
}

export function assertString(value: JsonValue, path: string, max = 20_000): asserts value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > max) {
    fail("INPUT_INVALID", `${path} 必须是非空受限字符串。`);
  }
}

export function assertBoolean(value: JsonValue, path: string): asserts value is boolean {
  if (typeof value !== "boolean") fail("INPUT_INVALID", `${path} 必须是布尔值。`);
}

function sortStrings(values: string[]): string[] {
  for (let index = 1; index < values.length; index += 1) {
    const current = values[index]!;
    let cursor = index - 1;
    while (cursor >= 0 && values[cursor]! > current) {
      values[cursor + 1] = values[cursor]!;
      cursor -= 1;
    }
    values[cursor + 1] = current;
  }
  return values;
}

function canonical(value: JsonValue): string {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON_STRINGIFY(value);
  }
  if (ARRAY_IS_ARRAY(value)) {
    let output = "[";
    for (let index = 0; index < value.length; index += 1) {
      if (index > 0) output += ",";
      output += canonical(value[index]!);
    }
    return `${output}]`;
  }
  const objectValue = value as JsonObject;
  const keys = sortStrings(OBJECT_KEYS(objectValue));
  let output = "{";
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index]!;
    if (index > 0) output += ",";
    output += `${JSON_STRINGIFY(key)}:${canonical(objectValue[key]!)}`;
  }
  return `${output}}`;
}

export function canonicalStringify(value: unknown): string {
  return canonical(captureJson(value));
}

export function domainDigest(domain: string, value: unknown): string {
  return createHash("sha256").update(`${domain}\u0000${canonicalStringify(value)}`, "utf8").digest("hex");
}

export function rawSha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function rejectDuplicateObjectKeys(raw: string, label: string): void {
  let index = 0;
  const whitespace = /[\u0009\u000a\u000d\u0020]/u;
  const skip = () => { while (index < raw.length && REGEXP_TEST(whitespace, raw[index]!)) index += 1; };
  const parseString = (): string => {
    const start = index;
    if (raw[index] !== '"') fail("JSON_INVALID", `${label} 字符串无效。`);
    index += 1;
    while (index < raw.length) {
      const code = raw.charCodeAt(index);
      if (raw[index] === '"') {
        index += 1;
        try { return JSON_PARSE(raw.slice(start, index)) as string; }
        catch { fail("JSON_INVALID", `${label} 字符串转义无效。`); }
      }
      if (raw[index] === "\\") {
        index += 1;
        if (index >= raw.length) fail("JSON_INVALID", `${label} 字符串转义截断。`);
        if (raw[index] === "u") {
          if (!/^[0-9a-fA-F]{4}$/u.test(raw.slice(index + 1, index + 5))) {
            fail("JSON_INVALID", `${label} Unicode 转义无效。`);
          }
          index += 5;
          continue;
        }
        if (!'"\\/bfnrt'.includes(raw[index]!)) fail("JSON_INVALID", `${label} 字符串转义无效。`);
        index += 1;
        continue;
      }
      if (code <= 0x1f) fail("JSON_INVALID", `${label} 字符串含控制字符。`);
      index += 1;
    }
    return fail("JSON_INVALID", `${label} 字符串未闭合。`);
  };
  const parseValue = (depth: number): void => {
    if (depth > MAX_DEPTH) fail("JSON_INVALID", `${label} 超过最大深度。`);
    skip();
    if (raw[index] === "{") {
      index += 1; skip();
      const keys = new Set<string>();
      if (raw[index] === "}") { index += 1; return; }
      while (index < raw.length) {
        const key = parseString();
        if (keys.has(key)) fail("DUPLICATE_JSON_KEY", `${label} 含重复键。`);
        keys.add(key); skip();
        if (raw[index] !== ":") fail("JSON_INVALID", `${label} 对象缺少冒号。`);
        index += 1; parseValue(depth + 1); skip();
        if (raw[index] === "}") { index += 1; return; }
        if (raw[index] !== ",") fail("JSON_INVALID", `${label} 对象分隔符无效。`);
        index += 1; skip();
      }
      fail("JSON_INVALID", `${label} 对象未闭合。`);
    }
    if (raw[index] === "[") {
      index += 1; skip();
      if (raw[index] === "]") { index += 1; return; }
      while (index < raw.length) {
        parseValue(depth + 1); skip();
        if (raw[index] === "]") { index += 1; return; }
        if (raw[index] !== ",") fail("JSON_INVALID", `${label} 数组分隔符无效。`);
        index += 1;
      }
      fail("JSON_INVALID", `${label} 数组未闭合。`);
    }
    if (raw[index] === '"') { parseString(); return; }
    const tail = raw.slice(index);
    const token = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/u.exec(tail)?.[0];
    if (!token) fail("JSON_INVALID", `${label} 值无效。`);
    index += token.length;
  };
  parseValue(0); skip();
  if (index !== raw.length) fail("JSON_INVALID", `${label} 含尾随内容。`);
}

export function parseStrictJsonBytes(bytes: Uint8Array, label: string, maxBytes: number): JsonValue {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0 || bytes.byteLength > maxBytes) {
    fail("JSON_BYTES_INVALID", `${label} 字节长度无效。`);
  }
  if (bytes.byteLength >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail("JSON_BOM_FORBIDDEN", `${label} 不得包含 BOM。`);
  }
  let raw: string;
  try { raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { return fail("JSON_UTF8_INVALID", `${label} 不是严格 UTF-8。`); }
  rejectDuplicateObjectKeys(raw, label);
  let parsed: unknown;
  try { parsed = JSON_PARSE(raw); }
  catch { return fail("JSON_INVALID", `${label} 不是有效 JSON。`); }
  return captureJson(parsed, label);
}
