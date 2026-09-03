const objectCreate = Object.create;
const objectFreeze = Object.freeze;
const objectGetOwnPropertyDescriptors = Object.getOwnPropertyDescriptors;
const objectGetOwnPropertySymbols = Object.getOwnPropertySymbols;
const objectGetPrototypeOf = Object.getPrototypeOf;
const objectIs = Object.is;
const objectKeys = Object.keys;
const objectValues = Object.values;
const arrayIsArray = Array.isArray;
const numberIsFinite = Number.isFinite;
const reflectApply = Reflect.apply;
const stringPadStart = String.prototype.padStart;
const numberToString = Number.prototype.toString;
const jsonStringify = JSON.stringify;
const plainObjectPrototype = Object.prototype;
const plainArrayPrototype = Array.prototype;
const weakSetAdd = WeakSet.prototype.add;
const weakSetHas = WeakSet.prototype.has;

const MAX_CAPTURE_DEPTH = 8;
const MAX_CAPTURE_OBJECTS = 24;
const MAX_CAPTURE_KEYS = 128;
const MAX_CAPTURE_STRING_CODE_UNITS = 12_000;

export type VedicBrowserStrictData =
  | null
  | boolean
  | number
  | string
  | { [key: string]: VedicBrowserStrictData };

export type VedicBrowserCloneData =
  | null
  | boolean
  | number
  | string
  | VedicBrowserCloneData[]
  | { [key: string]: VedicBrowserCloneData };

type CaptureState = {
  readonly seen: WeakSet<object>;
  objectCount: number;
  keyCount: number;
  stringCodeUnits: number;
};

export class VedicBrowserInputBoundaryError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "VedicBrowserInputBoundaryError";
    this.code = code;
  }
}

function weakHas(set: WeakSet<object>, value: object): boolean {
  return reflectApply(weakSetHas, set, [value]) as boolean;
}

function weakAdd(set: WeakSet<object>, value: object): void {
  reflectApply(weakSetAdd, set, [value]);
}

function capture(
  value: unknown,
  state: CaptureState,
  depth: number
): VedicBrowserStrictData {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") {
    state.stringCodeUnits += value.length;
    if (state.stringCodeUnits > MAX_CAPTURE_STRING_CODE_UNITS) {
      throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_INPUT_TEXT_LIMIT");
    }
    return value;
  }
  if (typeof value === "number") {
    if (!reflectApply(numberIsFinite, Number, [value]) || reflectApply(objectIs, Object, [value, -0])) {
      throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_INPUT_NUMBER_INVALID");
    }
    return value;
  }
  if (typeof value !== "object" || depth > MAX_CAPTURE_DEPTH) {
    throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_INPUT_TYPE_INVALID");
  }
  if (reflectApply(arrayIsArray, Array, [value])) {
    throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_INPUT_ARRAY_FORBIDDEN");
  }
  if (weakHas(state.seen, value)) {
    throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_INPUT_ALIAS_OR_CYCLE");
  }
  weakAdd(state.seen, value);
  state.objectCount += 1;
  if (state.objectCount > MAX_CAPTURE_OBJECTS) {
    throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_INPUT_OBJECT_LIMIT");
  }
  if (reflectApply(objectGetPrototypeOf, Object, [value]) !== plainObjectPrototype) {
    throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_INPUT_PROTOTYPE_INVALID");
  }
  if ((reflectApply(objectGetOwnPropertySymbols, Object, [value]) as symbol[]).length !== 0) {
    throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_INPUT_SYMBOL_FORBIDDEN");
  }

  const descriptors = reflectApply(objectGetOwnPropertyDescriptors, Object, [value]) as Record<
    string,
    PropertyDescriptor
  >;
  const keys = reflectApply(objectKeys, Object, [descriptors]) as string[];
  state.keyCount += keys.length;
  if (state.keyCount > MAX_CAPTURE_KEYS) {
    throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_INPUT_KEY_LIMIT");
  }

  const output = reflectApply(objectCreate, Object, [null]) as {
    [key: string]: VedicBrowserStrictData;
  };
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !("value" in descriptor) ||
      key === "__proto__" ||
      key === "prototype" ||
      key === "constructor"
    ) {
      throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_INPUT_DESCRIPTOR_INVALID");
    }
    output[key] = capture(descriptor.value, state, depth + 1);
  }
  return output;
}

export function captureVedicBrowserStrictData(value: unknown): VedicBrowserStrictData {
  try {
    return capture(value, {
      seen: new WeakSet<object>(),
      objectCount: 0,
      keyCount: 0,
      stringCodeUnits: 0
    }, 0);
  } catch (error) {
    if (error instanceof VedicBrowserInputBoundaryError) throw error;
    throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_INPUT_CAPTURE_FAILED");
  }
}

function captureCloneData(
  value: unknown,
  state: CaptureState,
  depth: number
): VedicBrowserCloneData {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") {
    state.stringCodeUnits += value.length;
    if (state.stringCodeUnits > 1_000_000) {
      throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_CLONE_TEXT_LIMIT");
    }
    return value;
  }
  if (typeof value === "number") {
    if (!reflectApply(numberIsFinite, Number, [value]) || reflectApply(objectIs, Object, [value, -0])) {
      throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_CLONE_NUMBER_INVALID");
    }
    return value;
  }
  if (typeof value !== "object" || depth > 18) {
    throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_CLONE_TYPE_INVALID");
  }
  if (weakHas(state.seen, value)) {
    throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_CLONE_ALIAS_OR_CYCLE");
  }
  weakAdd(state.seen, value);
  state.objectCount += 1;
  if (state.objectCount > 4_000) {
    throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_CLONE_OBJECT_LIMIT");
  }
  if ((reflectApply(objectGetOwnPropertySymbols, Object, [value]) as symbol[]).length !== 0) {
    throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_CLONE_SYMBOL_FORBIDDEN");
  }

  const descriptors = reflectApply(objectGetOwnPropertyDescriptors, Object, [value]) as Record<
    string,
    PropertyDescriptor
  >;
  const keys = reflectApply(objectKeys, Object, [descriptors]) as string[];
  state.keyCount += keys.length;
  if (state.keyCount > 30_000) {
    throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_CLONE_KEY_LIMIT");
  }
  if (reflectApply(arrayIsArray, Array, [value])) {
    if (reflectApply(objectGetPrototypeOf, Object, [value]) !== plainArrayPrototype) {
      throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_CLONE_ARRAY_PROTOTYPE_INVALID");
    }
    const lengthDescriptor = descriptors.length;
    const length = lengthDescriptor && "value" in lengthDescriptor ? lengthDescriptor.value : -1;
    if (!Number.isSafeInteger(length) || length < 0 || keys.length !== length + 1) {
      throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_CLONE_ARRAY_SHAPE_INVALID");
    }
    const output: VedicBrowserCloneData[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (descriptor === undefined || descriptor.enumerable !== true || !("value" in descriptor)) {
        throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_CLONE_ARRAY_SHAPE_INVALID");
      }
      output.push(captureCloneData(descriptor.value, state, depth + 1));
    }
    return output;
  }
  if (reflectApply(objectGetPrototypeOf, Object, [value]) !== plainObjectPrototype) {
    throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_CLONE_OBJECT_PROTOTYPE_INVALID");
  }
  const output: { [key: string]: VedicBrowserCloneData } = {};
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (descriptor === undefined || descriptor.enumerable !== true || !("value" in descriptor)
      || key === "__proto__" || key === "prototype" || key === "constructor") {
      throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_CLONE_DESCRIPTOR_INVALID");
    }
    output[key] = captureCloneData(descriptor.value, state, depth + 1);
  }
  return output;
}

export function captureVedicBrowserCloneData(value: unknown): VedicBrowserCloneData {
  try {
    return captureCloneData(value, {
      seen: new WeakSet<object>(),
      objectCount: 0,
      keyCount: 0,
      stringCodeUnits: 0
    }, 0);
  } catch (error) {
    if (error instanceof VedicBrowserInputBoundaryError) throw error;
    throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_CLONE_CAPTURE_FAILED");
  }
}

export function requireVedicBrowserRecord(
  value: VedicBrowserStrictData | undefined,
  code: string
): { [key: string]: VedicBrowserStrictData } {
  if (value === undefined || value === null || typeof value !== "object") {
    throw new VedicBrowserInputBoundaryError(code);
  }
  return value;
}

export function requireVedicBrowserExactKeys(
  record: { [key: string]: VedicBrowserStrictData },
  expected: readonly string[],
  code: string
): void {
  const actual = (reflectApply(objectKeys, Object, [record]) as string[]).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new VedicBrowserInputBoundaryError(code);
  }
}

export function canonicalVedicBrowserJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return reflectApply(jsonStringify, JSON, [value]) as string;
  }
  if (typeof value === "number") {
    if (!reflectApply(numberIsFinite, Number, [value]) || reflectApply(objectIs, Object, [value, -0])) {
      throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_CANONICAL_NUMBER_INVALID");
    }
    return reflectApply(jsonStringify, JSON, [value]) as string;
  }
  if (reflectApply(arrayIsArray, Array, [value])) {
    return `[${(value as unknown[]).map((entry) => canonicalVedicBrowserJson(entry)).join(",")}]`;
  }
  if (typeof value !== "object" || value === null) {
    throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_CANONICAL_TYPE_INVALID");
  }
  const record = value as Record<string, unknown>;
  const entries = (reflectApply(objectKeys, Object, [record]) as string[])
    .sort()
    .map((key) => `${reflectApply(jsonStringify, JSON, [key]) as string}:${canonicalVedicBrowserJson(record[key])}`);
  return `{${entries.join(",")}}`;
}

export async function sha256VedicBrowserCanonical(
  domain: string,
  value: unknown
): Promise<string> {
  const cryptoValue = globalThis.crypto;
  const subtle = cryptoValue?.subtle;
  const digest = subtle?.digest;
  const TextEncoderConstructor = globalThis.TextEncoder;
  if (typeof digest !== "function" || typeof TextEncoderConstructor !== "function") {
    throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_WEB_CRYPTO_UNAVAILABLE");
  }
  try {
    const bytes = new TextEncoderConstructor().encode(
      `${domain}\0${canonicalVedicBrowserJson(value)}`
    );
    const digestBuffer = await reflectApply(digest, subtle, ["SHA-256", bytes]) as ArrayBuffer;
    const view = new Uint8Array(digestBuffer);
    if (view.byteLength !== 32) {
      throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_WEB_CRYPTO_INVALID_DIGEST");
    }
    let hex = "";
    for (let index = 0; index < view.byteLength; index += 1) {
      const part = reflectApply(numberToString, view[index]!, [16]) as string;
      hex += reflectApply(stringPadStart, part, [2, "0"]) as string;
    }
    return hex;
  } catch (error) {
    if (error instanceof VedicBrowserInputBoundaryError) throw error;
    throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_WEB_CRYPTO_FAILED");
  }
}

export function deepFreezeVedicBrowserData<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== "object" || weakHas(seen, value)) return value;
  weakAdd(seen, value);
  const descriptors = reflectApply(objectGetOwnPropertyDescriptors, Object, [value]) as Record<
    string,
    PropertyDescriptor
  >;
  for (const descriptor of reflectApply(objectValues, Object, [descriptors]) as PropertyDescriptor[]) {
    if ("value" in descriptor) deepFreezeVedicBrowserData(descriptor.value, seen);
  }
  return reflectApply(objectFreeze, Object, [value]) as T;
}
