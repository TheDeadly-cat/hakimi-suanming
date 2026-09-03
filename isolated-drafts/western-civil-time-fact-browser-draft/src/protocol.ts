const objectGetOwnPropertyDescriptors = Object.getOwnPropertyDescriptors;
const objectGetOwnPropertySymbols = Object.getOwnPropertySymbols;
const objectGetPrototypeOf = Object.getPrototypeOf;
const objectKeys = Object.keys;
const arrayIsArray = Array.isArray;
const plainObjectPrototype = Object.prototype;
const plainArrayPrototype = Array.prototype;

const MAX_DEPTH = 18;
const MAX_NODES = 4_000;
const MAX_KEYS = 30_000;
const MAX_STRING_CODE_UNITS = 1_000_000;

export const WESTERN_CIVIL_WORKER_PROTOCOL_VERSION =
  "hakimi.western-civil-time-browser-worker/0.1-draft" as const;
export const WESTERN_FACT_CHAIN_VERSION =
  "hakimi.western-civil-time-to-fact-only-browser-chain/0.1-draft" as const;

export type StrictData = null | boolean | number | string | StrictData[] | { [key: string]: StrictData };

type CaptureState = {
  readonly seen: WeakSet<object>;
  nodes: number;
  keys: number;
  stringCodeUnits: number;
};

export class WesternFactChainBoundaryError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "WesternFactChainBoundaryError";
    this.code = code;
  }
}

export function captureStrictData(value: unknown): StrictData {
  return capture(value, { seen: new WeakSet<object>(), nodes: 0, keys: 0, stringCodeUnits: 0 }, 0);
}

function capture(value: unknown, state: CaptureState, depth: number): StrictData {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") {
    state.stringCodeUnits += value.length;
    if (state.stringCodeUnits > MAX_STRING_CODE_UNITS) throw new WesternFactChainBoundaryError("BOUNDARY_TEXT_LIMIT");
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) throw new WesternFactChainBoundaryError("BOUNDARY_NUMBER_INVALID");
    return value;
  }
  if (typeof value !== "object" || depth > MAX_DEPTH) throw new WesternFactChainBoundaryError("BOUNDARY_TYPE_INVALID");
  if (state.seen.has(value)) throw new WesternFactChainBoundaryError("BOUNDARY_ALIAS_OR_CYCLE");
  state.seen.add(value);
  state.nodes += 1;
  if (state.nodes > MAX_NODES) throw new WesternFactChainBoundaryError("BOUNDARY_NODE_LIMIT");
  if (objectGetOwnPropertySymbols(value).length !== 0) throw new WesternFactChainBoundaryError("BOUNDARY_SYMBOL_INVALID");

  if (arrayIsArray(value)) {
    if (objectGetPrototypeOf(value) !== plainArrayPrototype) throw new WesternFactChainBoundaryError("BOUNDARY_ARRAY_PROTOTYPE_INVALID");
    const descriptors = objectGetOwnPropertyDescriptors(value);
    const keys = objectKeys(descriptors);
    state.keys += keys.length;
    if (state.keys > MAX_KEYS) throw new WesternFactChainBoundaryError("BOUNDARY_KEY_LIMIT");
    if (keys.length !== value.length + 1 || !keys.includes("length")) {
      throw new WesternFactChainBoundaryError("BOUNDARY_ARRAY_SHAPE_INVALID");
    }
    const output: StrictData[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor || descriptor.enumerable !== true || !("value" in descriptor)) {
        throw new WesternFactChainBoundaryError("BOUNDARY_ARRAY_SHAPE_INVALID");
      }
      output.push(capture(descriptor.value, state, depth + 1));
    }
    return output;
  }

  if (objectGetPrototypeOf(value) !== plainObjectPrototype) {
    throw new WesternFactChainBoundaryError("BOUNDARY_OBJECT_PROTOTYPE_INVALID");
  }
  const descriptors = objectGetOwnPropertyDescriptors(value);
  const keys = objectKeys(descriptors);
  state.keys += keys.length;
  if (state.keys > MAX_KEYS) throw new WesternFactChainBoundaryError("BOUNDARY_KEY_LIMIT");
  const output: { [key: string]: StrictData } = {};
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (!descriptor || descriptor.enumerable !== true || !("value" in descriptor)
      || key === "__proto__" || key === "constructor" || key === "prototype") {
      throw new WesternFactChainBoundaryError("BOUNDARY_OBJECT_SHAPE_INVALID");
    }
    output[key] = capture(descriptor.value, state, depth + 1);
  }
  return output;
}

export function requireRecord(value: unknown, code: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || arrayIsArray(value)) {
    throw new WesternFactChainBoundaryError(code);
  }
  return value as Record<string, unknown>;
}

export function requireExactKeys(record: Record<string, unknown>, expected: readonly string[], code: string): void {
  const actual = objectKeys(record).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new WesternFactChainBoundaryError(code);
  }
}

export function requireFiniteNumber(value: unknown, code: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || Object.is(value, -0)) {
    throw new WesternFactChainBoundaryError(code);
  }
  return value;
}

export function requireString(value: unknown, code: string): string {
  if (typeof value !== "string" || value.length === 0) throw new WesternFactChainBoundaryError(code);
  return value;
}

export function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new WesternFactChainBoundaryError("CANONICAL_NUMBER_INVALID");
    return Object.is(value, -0) ? "0" : JSON.stringify(value);
  }
  if (arrayIsArray(value)) return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${objectKeys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  throw new WesternFactChainBoundaryError("CANONICAL_TYPE_INVALID");
}

export async function sha256Canonical(domain: string, value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(`${domain}\0${canonicalJson(value)}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const descriptor of Object.values(objectGetOwnPropertyDescriptors(value))) {
    if ("value" in descriptor) deepFreeze(descriptor.value, seen);
  }
  return Object.freeze(value);
}
