import { hash } from "node:crypto";
import { types as utilTypes } from "node:util";

const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PROTOTYPE = Array.prototype;
const JSON_STRINGIFY = JSON.stringify;
const MAX_CAPTURE_ARRAY_LENGTH = 4_096;
const NUMBER_IS_FINITE = Number.isFinite;
const NUMBER_IS_SAFE_INTEGER = Number.isSafeInteger;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_IS = Object.is;
const OBJECT_IS_FROZEN = Object.isFrozen;
const OBJECT_KEYS = Object.keys;
const OBJECT_PROTOTYPE = Object.prototype;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const IS_PROXY = utilTypes.isProxy;
const WEAK_SET_CONSTRUCTOR = WeakSet;
const WEAK_SET_ADD = Function.call.bind(WeakSet.prototype.add) as (
  set: WeakSet<object>,
  value: object
) => WeakSet<object>;
const WEAK_SET_DELETE = Function.call.bind(WeakSet.prototype.delete) as (
  set: WeakSet<object>,
  value: object
) => boolean;
const WEAK_SET_HAS = Function.call.bind(WeakSet.prototype.has) as (
  set: WeakSet<object>,
  value: object
) => boolean;
const REGEXP_TEST = Function.call.bind(RegExp.prototype.test) as (
  pattern: RegExp,
  value: string
) => boolean;

export type KernelJsonPrimitive = boolean | null | number | string;
export interface KernelJsonObject {
  readonly [key: string]: KernelJsonValue;
}
export type KernelJsonValue = KernelJsonPrimitive | KernelJsonObject | readonly KernelJsonValue[];

export class BaziReviewCycleKernelError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "BaziReviewCycleKernelError";
    this.code = code;
  }
}

function fail(code: string, message: string): never {
  throw new BaziReviewCycleKernelError(code, message);
}

function ownDescriptors(value: object): PropertyDescriptorMap {
  try {
    return OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(value);
  } catch {
    return fail("INPUT_UNSAFE", "无法安全读取输入属性描述符。");
  }
}

function ownKeys(value: object): (string | symbol)[] {
  try {
    return REFLECT_OWN_KEYS(value);
  } catch {
    return fail("INPUT_UNSAFE", "无法安全读取输入键。");
  }
}

function prototypeOf(value: object): object | null {
  try {
    return OBJECT_GET_PROTOTYPE_OF(value);
  } catch {
    return fail("INPUT_UNSAFE", "无法安全读取输入原型。");
  }
}

function captureObject(
  value: object,
  path: string,
  seen: WeakSet<object>
): KernelJsonObject {
  if (IS_PROXY(value)) {
    fail("INPUT_UNSAFE", `${path} 不得是 Proxy。`);
  }
  const prototype = prototypeOf(value);
  if (prototype !== OBJECT_PROTOTYPE && prototype !== null) {
    fail("INPUT_UNSAFE", `${path} 必须是普通 JSON 对象。`);
  }
  const keys = ownKeys(value);
  for (let index = 0; index < keys.length; index += 1) {
    if (typeof keys[index] === "symbol") {
      fail("INPUT_UNSAFE", `${path} 不得包含 symbol 键。`);
    }
  }
  const descriptors = ownDescriptors(value);
  const output: Record<string, KernelJsonValue> = OBJECT_CREATE(null) as Record<string, KernelJsonValue>;
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index] as string;
    const descriptor = OBJECT_HAS_OWN(descriptors, key) ? descriptors[key] : undefined;
    if (!descriptor || !OBJECT_HAS_OWN(descriptor, "value")
      || OBJECT_HAS_OWN(descriptor, "get") || OBJECT_HAS_OWN(descriptor, "set")) {
      fail("INPUT_UNSAFE", `${path}.${key} 不得是 accessor。`);
    }
    if (!descriptor.enumerable) {
      fail("INPUT_UNSAFE", `${path}.${key} 必须可枚举。`);
    }
    output[key] = captureKernelJson(descriptor.value, `${path}.${key}`, seen);
  }
  return OBJECT_FREEZE(output);
}

function captureArray(
  value: readonly unknown[],
  path: string,
  seen: WeakSet<object>
): readonly KernelJsonValue[] {
  if (IS_PROXY(value)) {
    fail("INPUT_UNSAFE", `${path} 不得是 Proxy。`);
  }
  if (prototypeOf(value) !== ARRAY_PROTOTYPE) {
    fail("INPUT_UNSAFE", `${path} 必须是原生普通数组。`);
  }
  const length = value.length;
  if (length > MAX_CAPTURE_ARRAY_LENGTH) {
    fail("INPUT_UNSAFE", `${path} 数组长度超过封闭输入上限。`);
  }
  const keys = ownKeys(value);
  if (keys.length !== length + 1) {
    fail("INPUT_UNSAFE", `${path} 数组不得包含附加键。`);
  }
  for (let index = 0; index < keys.length; index += 1) {
    if (typeof keys[index] !== "string") {
      fail("INPUT_UNSAFE", `${path} 数组不得包含附加键。`);
    }
  }
  const descriptors = ownDescriptors(value);
  const output: KernelJsonValue[] = [];
  for (let index = 0; index < length; index += 1) {
    const key = `${index}`;
    const descriptor = OBJECT_HAS_OWN(descriptors, key) ? descriptors[key] : undefined;
    if (!descriptor || !OBJECT_HAS_OWN(descriptor, "value")
      || OBJECT_HAS_OWN(descriptor, "get") || OBJECT_HAS_OWN(descriptor, "set")
      || !descriptor.enumerable) {
      fail("INPUT_UNSAFE", `${path}[${key}] 必须是普通数据属性。`);
    }
    OBJECT_DEFINE_PROPERTY(output, key, {
      configurable: true,
      enumerable: true,
      value: captureKernelJson(descriptor.value, `${path}[${key}]`, seen),
      writable: true
    });
  }
  return OBJECT_FREEZE(output);
}

export function captureKernelJson(
  value: unknown,
  path = "input",
  seen?: WeakSet<object>
): KernelJsonValue {
  const activeSeen = seen ?? new WEAK_SET_CONSTRUCTOR<object>();
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    if (!NUMBER_IS_FINITE(value) || OBJECT_IS(value, -0)) {
      fail("INPUT_UNSAFE", `${path} 必须是有限且非负零的 JSON 数字。`);
    }
    return value;
  }
  if (typeof value !== "object") {
    fail("INPUT_UNSAFE", `${path} 不是 JSON 值。`);
  }
  if (WEAK_SET_HAS(activeSeen, value)) {
    fail("INPUT_UNSAFE", `${path} 不得包含循环引用。`);
  }
  WEAK_SET_ADD(activeSeen, value);
  try {
    return ARRAY_IS_ARRAY(value)
      ? captureArray(value as readonly unknown[], path, activeSeen)
      : captureObject(value, path, activeSeen);
  } finally {
    WEAK_SET_DELETE(activeSeen, value);
  }
}

export function assertExactObjectKeys(
  value: KernelJsonValue,
  expectedKeys: readonly string[],
  path: string
): asserts value is KernelJsonObject {
  if (value === null || ARRAY_IS_ARRAY(value) || typeof value !== "object") {
    fail("INPUT_INVALID", `${path} 必须是对象。`);
  }
  const actualKeys = OBJECT_KEYS(value);
  if (actualKeys.length !== expectedKeys.length) {
    fail("INPUT_INVALID", `${path} 键集合不匹配。`);
  }
  for (let expectedIndex = 0; expectedIndex < expectedKeys.length; expectedIndex += 1) {
    const expectedKey = expectedKeys[expectedIndex];
    let found = false;
    for (let actualIndex = 0; actualIndex < actualKeys.length; actualIndex += 1) {
      if (actualKeys[actualIndex] === expectedKey) {
        found = true;
        break;
      }
    }
    if (!found) fail("INPUT_INVALID", `${path} 键集合不匹配。`);
  }
}

export function assertString(value: KernelJsonValue, path: string): asserts value is string {
  if (typeof value !== "string") fail("INPUT_INVALID", `${path} 必须是字符串。`);
}

export function assertBoolean(value: KernelJsonValue, path: string): asserts value is boolean {
  if (typeof value !== "boolean") fail("INPUT_INVALID", `${path} 必须是布尔值。`);
}

export function assertNonNegativeSafeInteger(
  value: KernelJsonValue,
  path: string
): asserts value is number {
  if (typeof value !== "number" || !NUMBER_IS_SAFE_INTEGER(value) || value < 0) {
    fail("INPUT_INVALID", `${path} 必须是非负安全整数。`);
  }
}

export function assertArray(value: KernelJsonValue, path: string): asserts value is readonly KernelJsonValue[] {
  if (!ARRAY_IS_ARRAY(value)) fail("INPUT_INVALID", `${path} 必须是数组。`);
}

function sortStringsInPlace(values: string[]): string[] {
  for (let index = 1; index < values.length; index += 1) {
    const candidate = values[index]!;
    let insertionIndex = index - 1;
    while (insertionIndex >= 0 && values[insertionIndex]! > candidate) {
      values[insertionIndex + 1] = values[insertionIndex]!;
      insertionIndex -= 1;
    }
    values[insertionIndex + 1] = candidate;
  }
  return values;
}

function canonicalize(value: KernelJsonValue): string {
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return JSON_STRINGIFY(value);
  }
  if (typeof value === "string") return JSON_STRINGIFY(value);
  if (ARRAY_IS_ARRAY(value)) {
    const arrayValue = value as readonly KernelJsonValue[];
    let output = "[";
    for (let index = 0; index < arrayValue.length; index += 1) {
      if (index > 0) output += ",";
      output += canonicalize(arrayValue[index]!);
    }
    return `${output}]`;
  }
  const objectValue = value as KernelJsonObject;
  const keys = sortStringsInPlace(OBJECT_KEYS(objectValue));
  let output = "{";
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index]!;
    if (index > 0) output += ",";
    output += `${JSON_STRINGIFY(key)}:${canonicalize(objectValue[key]!)}`;
  }
  return `${output}}`;
}

export function canonicalStringify(value: unknown): string {
  return canonicalize(captureKernelJson(value));
}

export function domainSeparatedDigest(domain: string, value: unknown): string {
  return hash("sha256", `${domain}\u0000${canonicalStringify(value)}`, "hex");
}

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !OBJECT_IS_FROZEN(value)) {
    const keys = REFLECT_OWN_KEYS(value);
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index]!;
      const descriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(value, key);
      if (descriptor && OBJECT_HAS_OWN(descriptor, "value")) deepFreeze(descriptor.value);
    }
    OBJECT_FREEZE(value);
  }
  return value;
}
