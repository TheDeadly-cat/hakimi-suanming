import {
  TzdbArtifactError,
  getBundledTzdbArtifactSnapshot,
  loadBundledTzdbResolver,
  type BundledLocalResolution,
  type BundledTzdbResolver,
  type BundledZoneCandidate,
  type RegisteredTimeZoneDatabaseSnapshot
} from "../../../packages/tzdb-core/src/index.ts";
import {
  WESTERN_ASTROLOGY_DRAFT_CONTRACT_VERSION,
  WESTERN_ASTROLOGY_SYSTEM_ID,
  westernBirthInputDraftSchema,
  type WesternBirthInputDraft
} from "../../../packages/western-astrology-contracts-draft/src/civil-input.ts";

export const WESTERN_CIVIL_TIME_FACT_RESOLVER_VERSION = "0.1.0-draft.1" as const;
export const WESTERN_CIVIL_TIME_FACT_RECEIPT_SCHEMA_VERSION =
  "hakimi.western-civil-time-fact-receipt/0.1-draft" as const;
export const WESTERN_CIVIL_TIME_FACT_CANONICALIZATION_PROFILE =
  "hakimi.sorted-key-json.finite-number.v1" as const;

const NativeDate = Date;
const dateUtc = Date.UTC;
const dateToISOString = Date.prototype.toISOString;
const getUtcFullYear = Date.prototype.getUTCFullYear;
const getUtcMonth = Date.prototype.getUTCMonth;
const getUtcDate = Date.prototype.getUTCDate;
const getUtcHours = Date.prototype.getUTCHours;
const getUtcMinutes = Date.prototype.getUTCMinutes;
const getUtcSeconds = Date.prototype.getUTCSeconds;
const objectCreate = Object.create;
const objectDefineProperty = Object.defineProperty;
const objectFreeze = Object.freeze;
const objectGetOwnPropertyDescriptors = Object.getOwnPropertyDescriptors;
const objectGetPrototypeOf = Object.getPrototypeOf;
const objectHasOwn = Object.hasOwn;
const objectIs = Object.is;
const objectPrototype = Object.prototype;
const reflectApply = Reflect.apply;
const reflectGet = Reflect.get;
const reflectOwnKeys = Reflect.ownKeys;
const arrayIsArray = Array.isArray;
const arrayPrototype = Array.prototype;
const arrayJoin = Array.prototype.join;
const arraySort = Array.prototype.sort;
const jsonStringify = JSON.stringify;
const numberIsFinite = Number.isFinite;
const numberIsSafeInteger = Number.isSafeInteger;
const nativeString = String;
const weakSetAdd = WeakSet.prototype.add;
const weakSetHas = WeakSet.prototype.has;
const stringPadStart = String.prototype.padStart;
const numberToString = Number.prototype.toString;

const MAX_CAPTURE_DEPTH = 4;
const MAX_CAPTURE_OBJECTS = 8;
const MAX_CAPTURE_KEYS = 64;
const MAX_CAPTURE_STRING_CODE_UNITS = 10_000;
const MAX_CANONICAL_DEPTH = 32;
const MAX_CANONICAL_NODES = 1_000;
const MAX_CANONICAL_TEXT_CODE_UNITS = 100_000;

const AUTHORITY_BOUNDARY = objectFreeze({
  formalInputContractAdmitted: false,
  canonicalZoneIdentityEstablished: false,
  civilTimeDomainTruthCertified: false,
  astronomicalFactsEstablished: false,
  contentTruthEstablished: false,
  expertTruthEstablished: false,
  rightsLegalConclusionEstablished: false,
  releaseEvidenceComplete: false,
  releaseReady: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  expertClaimsAuthorized: false,
  highRiskClaimsAuthorized: false,
  crossSystemAuthorityInherited: false
} as const);

const OPERATION_BOUNDARY = objectFreeze({
  hostIntlUsed: false,
  hostTimeZoneDatabaseUsed: false,
  hostTimeZoneFallbackUsed: false,
  networkTransmissionPerformed: false,
  persistencePerformed: false,
  loggingPerformed: false,
  geocodingPerformed: false,
  mutationPerformed: false
} as const);

const BASE_DATA_HANDLING = objectFreeze({
  handlingProfile: "no_log_no_persist_no_publish" as const,
  inputMayContainPersonalData: true,
  candidateDigestIsAnonymous: false,
  safeToLog: false,
  safeToPersist: false,
  safeToPublish: false,
  loggingAuthorized: false,
  persistenceAuthorized: false,
  retentionAuthorized: false,
  networkTransmissionAuthorized: false
});

type JsonScalar = null | boolean | number | string;
type CapturedJson = JsonScalar | { [key: string]: CapturedJson };

export type WesternCivilTimeFactFailureCode =
  | "INVALID_REQUEST_SHAPE"
  | "INVALID_INPUT_CONTRACT"
  | "INVALID_GREGORIAN_WALL_TIME"
  | "TZDB_ARTIFACT_UNAVAILABLE"
  | "TZDB_ARTIFACT_DRIFT"
  | "TZDB_UNKNOWN_ZONE"
  | "TZDB_RESOLUTION_INVARIANT_FAILED"
  | "DST_GAP_REJECTED"
  | "DST_OVERLAP_REJECTED"
  | "WEB_CRYPTO_UNAVAILABLE"
  | "WEB_CRYPTO_FAILED"
  | "INTERNAL_FAILURE";

export type WesternCivilTimeFactFailureStage =
  | "boundary_snapshot"
  | "input_contract"
  | "gregorian_projection"
  | "tzdb_load"
  | "tzdb_resolution"
  | "dst_policy"
  | "digest"
  | "receipt_construction";

export type WesternCivilTimeFactFailure = Readonly<{
  schemaVersion: typeof WESTERN_CIVIL_TIME_FACT_RECEIPT_SCHEMA_VERSION;
  resolverVersion: typeof WESTERN_CIVIL_TIME_FACT_RESOLVER_VERSION;
  outcome: "failed_closed";
  classification: "civil_time_engineering_fact_only";
  code: WesternCivilTimeFactFailureCode;
  stage: WesternCivilTimeFactFailureStage;
  partialFactsReturned: false;
  operationBoundary: typeof OPERATION_BOUNDARY;
  dataHandling: Readonly<typeof BASE_DATA_HANDLING & { personDerivedDigestProduced: false }>;
  authorityBoundary: typeof AUTHORITY_BOUNDARY;
}>;

export type WesternCivilTimeTzdbBinding = Readonly<{
  snapshotId: string;
  schemaVersion: string;
  kind: string;
  ianaVersion: string;
  artifactName: string;
  dataSha256: string;
  resolver: Readonly<{ name: string; version: string }>;
  adapter: Readonly<{ name: string; version: string }>;
  supportedRange: Readonly<{ from: string; to: string }>;
}>;

export type WesternCivilTimeFactReceipt = Readonly<{
  schemaVersion: typeof WESTERN_CIVIL_TIME_FACT_RECEIPT_SCHEMA_VERSION;
  resolverVersion: typeof WESTERN_CIVIL_TIME_FACT_RESOLVER_VERSION;
  outcome: "resolved";
  classification: "civil_time_engineering_fact_only";
  formalAdmissionStatus: "not_admitted_isolated_draft";
  inputBinding: Readonly<{
    contractVersion: typeof WESTERN_ASTROLOGY_DRAFT_CONTRACT_VERSION;
    systemId: typeof WESTERN_ASTROLOGY_SYSTEM_ID;
    calendar: "proleptic_gregorian";
    inputSha256: string;
    requestSha256: string;
  }>;
  civilTime: Readonly<{
    date: string;
    time: string;
    timePrecision: "exact_minute" | "exact_second";
    timeZone: string;
    requestedDstDisambiguation: "reject" | "earlier" | "later";
    normalizedSecond: number;
    fractionalSeconds: 0;
  }>;
  tzdbBinding: WesternCivilTimeTzdbBinding;
  resolution: Readonly<{
    kind: "unique" | "overlap";
    decision: "unique" | "earlier" | "later";
    localEpochMilliseconds: number;
    epochMilliseconds: number;
    utcInstant: string;
    utcInstantPrecision: "exact_minute" | "exact_second";
    utcOffsetSeconds: number;
    utcOffsetSignConvention: "east_positive";
    requestedLocalTimeRoundTripVerified: true;
  }>;
  operationBoundary: typeof OPERATION_BOUNDARY;
  dataHandling: Readonly<typeof BASE_DATA_HANDLING & { personDerivedDigestProduced: true }>;
  authorityBoundary: typeof AUTHORITY_BOUNDARY;
  digests: Readonly<{
    algorithm: "SHA-256";
    implementation: "Web Crypto SubtleCrypto.digest";
    canonicalizationProfile: typeof WESTERN_CIVIL_TIME_FACT_CANONICALIZATION_PROFILE;
    inputSha256: string;
    requestSha256: string;
    resolutionSha256: string;
    receiptSha256: string;
    digestIsDigitalSignature: false;
  }>;
}>;

export type WesternCivilTimeFactResult =
  | WesternCivilTimeFactReceipt
  | WesternCivilTimeFactFailure;

class CivilTimeBoundaryError extends Error {
  readonly code: WesternCivilTimeFactFailureCode;
  readonly stage: WesternCivilTimeFactFailureStage;

  constructor(code: WesternCivilTimeFactFailureCode, stage: WesternCivilTimeFactFailureStage) {
    super(code);
    this.name = "CivilTimeBoundaryError";
    this.code = code;
    this.stage = stage;
  }
}

const FACT_RECEIPTS = new WeakSet<object>();

function weakHas(set: WeakSet<object>, value: object): boolean {
  return reflectApply(weakSetHas, set, [value]);
}

function weakAdd(set: WeakSet<object>, value: object): void {
  reflectApply(weakSetAdd, set, [value]);
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== "object" || weakHas(seen, value)) return value;
  weakAdd(seen, value);
  const keys = reflectApply(reflectOwnKeys, Reflect, [value]);
  const descriptors = reflectApply(objectGetOwnPropertyDescriptors, Object, [value]);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = reflectApply(reflectGet, Reflect, [descriptors, keys[index]!]) as
      PropertyDescriptor | undefined;
    if (descriptor && reflectApply(objectHasOwn, Object, [descriptor, "value"])) {
      deepFreeze(descriptor.value, seen);
    }
  }
  return reflectApply(objectFreeze, Object, [value]) as T;
}

function failureDataHandling(): WesternCivilTimeFactFailure["dataHandling"] {
  return objectFreeze({ ...BASE_DATA_HANDLING, personDerivedDigestProduced: false as const });
}

function receiptDataHandling(): WesternCivilTimeFactReceipt["dataHandling"] {
  return objectFreeze({ ...BASE_DATA_HANDLING, personDerivedDigestProduced: true as const });
}

function failedClosed(
  code: WesternCivilTimeFactFailureCode,
  stage: WesternCivilTimeFactFailureStage
): WesternCivilTimeFactFailure {
  return deepFreeze({
    schemaVersion: WESTERN_CIVIL_TIME_FACT_RECEIPT_SCHEMA_VERSION,
    resolverVersion: WESTERN_CIVIL_TIME_FACT_RESOLVER_VERSION,
    outcome: "failed_closed" as const,
    classification: "civil_time_engineering_fact_only" as const,
    code,
    stage,
    partialFactsReturned: false as const,
    operationBoundary: OPERATION_BOUNDARY,
    dataHandling: failureDataHandling(),
    authorityBoundary: AUTHORITY_BOUNDARY
  });
}

type CaptureState = {
  readonly seen: WeakSet<object>;
  objectCount: number;
  keyCount: number;
  stringCodeUnits: number;
};

function captureStrictPlainData(value: unknown, state: CaptureState, depth: number): CapturedJson {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") {
    state.stringCodeUnits += value.length;
    if (state.stringCodeUnits > MAX_CAPTURE_STRING_CODE_UNITS) {
      throw new CivilTimeBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
    }
    return value;
  }
  if (typeof value === "number") {
    if (!reflectApply(numberIsFinite, Number, [value]) || reflectApply(objectIs, Object, [value, -0])) {
      throw new CivilTimeBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
    }
    return value;
  }
  if (typeof value !== "object" || reflectApply(arrayIsArray, Array, [value]) || depth > MAX_CAPTURE_DEPTH) {
    throw new CivilTimeBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
  }
  if (weakHas(state.seen, value)) {
    throw new CivilTimeBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
  }
  weakAdd(state.seen, value);
  state.objectCount += 1;
  if (state.objectCount > MAX_CAPTURE_OBJECTS) {
    throw new CivilTimeBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
  }

  if (reflectApply(objectGetPrototypeOf, Object, [value]) !== objectPrototype) {
    throw new CivilTimeBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
  }
  const keys = reflectApply(reflectOwnKeys, Reflect, [value]);
  state.keyCount += keys.length;
  if (state.keyCount > MAX_CAPTURE_KEYS) {
    throw new CivilTimeBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
  }
  const descriptors = reflectApply(objectGetOwnPropertyDescriptors, Object, [value]);
  const snapshot = reflectApply(objectCreate, Object, [null]) as { [key: string]: CapturedJson };
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index]!;
    if (typeof key !== "string" || key === "__proto__" || key === "prototype" || key === "constructor") {
      throw new CivilTimeBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
    }
    const descriptor = descriptors[key];
    if (!descriptor || descriptor.enumerable !== true || !reflectApply(objectHasOwn, Object, [descriptor, "value"])) {
      throw new CivilTimeBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
    }
    reflectApply(objectDefineProperty, Object, [snapshot, key, {
      value: captureStrictPlainData(descriptor.value, state, depth + 1),
      writable: true,
      enumerable: true,
      configurable: true
    }]);
  }
  return snapshot;
}

function captureRequest(value: unknown): { input: unknown; tzdbSnapshotId: string } {
  let snapshot: CapturedJson;
  try {
    snapshot = captureStrictPlainData(value, {
      seen: new WeakSet<object>(),
      objectCount: 0,
      keyCount: 0,
      stringCodeUnits: 0
    }, 0);
  } catch (error) {
    if (error instanceof CivilTimeBoundaryError) throw error;
    throw new CivilTimeBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
  }
  if (snapshot === null || typeof snapshot !== "object" || reflectApply(arrayIsArray, Array, [snapshot])) {
    throw new CivilTimeBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
  }
  const keys = reflectApply(reflectOwnKeys, Reflect, [snapshot]);
  reflectApply(arraySort, keys, []);
  if (keys.length !== 2 || keys[0] !== "input" || keys[1] !== "tzdbSnapshotId") {
    throw new CivilTimeBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
  }
  if (typeof snapshot.tzdbSnapshotId !== "string" || snapshot.tzdbSnapshotId.length > 300) {
    throw new CivilTimeBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
  }
  return { input: snapshot.input, tzdbSnapshotId: snapshot.tzdbSnapshotId };
}

function parseLocalEpochMilliseconds(input: WesternBirthInputDraft): {
  localEpochMilliseconds: number;
  normalizedSecond: number;
} {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.date);
  const timeMatch = input.timePrecision === "exact_minute"
    ? /^(\d{2}):(\d{2})$/.exec(input.time)
    : /^(\d{2}):(\d{2}):(\d{2})$/.exec(input.time);
  if (!dateMatch || !timeMatch) {
    throw new CivilTimeBoundaryError("INVALID_GREGORIAN_WALL_TIME", "gregorian_projection");
  }
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = input.timePrecision === "exact_second" ? Number(timeMatch[3]) : 0;
  const localEpochMilliseconds = reflectApply(dateUtc, NativeDate, [year, month - 1, day, hour, minute, second, 0]);
  const projected = new NativeDate(localEpochMilliseconds);
  if (
    !reflectApply(numberIsSafeInteger, Number, [localEpochMilliseconds]) ||
    reflectApply(getUtcFullYear, projected, []) !== year ||
    reflectApply(getUtcMonth, projected, []) !== month - 1 ||
    reflectApply(getUtcDate, projected, []) !== day ||
    reflectApply(getUtcHours, projected, []) !== hour ||
    reflectApply(getUtcMinutes, projected, []) !== minute ||
    reflectApply(getUtcSeconds, projected, []) !== second
  ) {
    throw new CivilTimeBoundaryError("INVALID_GREGORIAN_WALL_TIME", "gregorian_projection");
  }
  return { localEpochMilliseconds, normalizedSecond: second };
}

function snapshotBinding(snapshot: RegisteredTimeZoneDatabaseSnapshot): WesternCivilTimeTzdbBinding {
  return {
    snapshotId: snapshot.snapshotId,
    schemaVersion: snapshot.schemaVersion,
    kind: snapshot.kind,
    ianaVersion: snapshot.ianaVersion,
    artifactName: snapshot.artifactName,
    dataSha256: snapshot.dataSha256,
    resolver: { name: snapshot.resolver.name, version: snapshot.resolver.version },
    adapter: { name: snapshot.adapter.name, version: snapshot.adapter.version },
    supportedRange: { from: snapshot.supportedRange.from, to: snapshot.supportedRange.to }
  };
}

function sameSnapshotBinding(
  left: RegisteredTimeZoneDatabaseSnapshot,
  right: RegisteredTimeZoneDatabaseSnapshot
): boolean {
  return left.snapshotId === right.snapshotId &&
    left.schemaVersion === right.schemaVersion &&
    left.kind === right.kind &&
    left.ianaVersion === right.ianaVersion &&
    left.artifactName === right.artifactName &&
    left.dataSha256 === right.dataSha256 &&
    left.resolver.name === right.resolver.name &&
    left.resolver.version === right.resolver.version &&
    left.adapter.name === right.adapter.name &&
    left.adapter.version === right.adapter.version &&
    left.supportedRange.from === right.supportedRange.from &&
    left.supportedRange.to === right.supportedRange.to;
}

function canonicalJson(value: unknown): string {
  const seen = new WeakSet<object>();
  const budget = { nodes: 0, text: 0 };
  function visit(current: unknown, depth: number): string {
    if (depth > MAX_CANONICAL_DEPTH) {
      throw new CivilTimeBoundaryError("INTERNAL_FAILURE", "digest");
    }
    budget.nodes += 1;
    if (budget.nodes > MAX_CANONICAL_NODES) {
      throw new CivilTimeBoundaryError("INTERNAL_FAILURE", "digest");
    }
    if (current === null || typeof current === "boolean") {
      return reflectApply(jsonStringify, JSON, [current]);
    }
    if (typeof current === "string") {
      budget.text += current.length;
      if (budget.text > MAX_CANONICAL_TEXT_CODE_UNITS) {
        throw new CivilTimeBoundaryError("INTERNAL_FAILURE", "digest");
      }
      return reflectApply(jsonStringify, JSON, [current]);
    }
    if (typeof current === "number") {
      if (!reflectApply(numberIsFinite, Number, [current]) || reflectApply(objectIs, Object, [current, -0])) {
        throw new CivilTimeBoundaryError("INTERNAL_FAILURE", "digest");
      }
      return reflectApply(jsonStringify, JSON, [current]);
    }
    if (typeof current !== "object") {
      throw new CivilTimeBoundaryError("INTERNAL_FAILURE", "digest");
    }
    if (weakHas(seen, current)) {
      throw new CivilTimeBoundaryError("INTERNAL_FAILURE", "digest");
    }
    weakAdd(seen, current);
    const keys = reflectApply(reflectOwnKeys, Reflect, [current]);
    const descriptors = reflectApply(objectGetOwnPropertyDescriptors, Object, [current]);
    if (reflectApply(arrayIsArray, Array, [current])) {
      const currentArray = current as unknown[];
      if (reflectApply(objectGetPrototypeOf, Object, [current]) !== arrayPrototype ||
        keys.length !== currentArray.length + 1 || keys[keys.length - 1] !== "length") {
        throw new CivilTimeBoundaryError("INTERNAL_FAILURE", "digest");
      }
      const values: string[] = [];
      for (let index = 0; index < currentArray.length; index += 1) {
        const key = reflectApply(nativeString, undefined, [index]);
        const descriptor = descriptors[key];
        if (!descriptor || descriptor.enumerable !== true ||
          !reflectApply(objectHasOwn, Object, [descriptor, "value"])) {
          throw new CivilTimeBoundaryError("INTERNAL_FAILURE", "digest");
        }
        reflectApply(objectDefineProperty, Object, [values, key, {
          value: visit(descriptor.value, depth + 1),
          writable: true,
          enumerable: true,
          configurable: true
        }]);
      }
      return `[${reflectApply(arrayJoin, values, [","])}]`;
    }
    const prototype = reflectApply(objectGetPrototypeOf, Object, [current]);
    if (prototype !== objectPrototype && prototype !== null) {
      throw new CivilTimeBoundaryError("INTERNAL_FAILURE", "digest");
    }
    for (let index = 0; index < keys.length; index += 1) {
      if (typeof keys[index] !== "string") {
        throw new CivilTimeBoundaryError("INTERNAL_FAILURE", "digest");
      }
    }
    reflectApply(arraySort, keys, []);
    const fields: string[] = [];
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index] as string;
      budget.text += key.length;
      if (budget.text > MAX_CANONICAL_TEXT_CODE_UNITS) {
        throw new CivilTimeBoundaryError("INTERNAL_FAILURE", "digest");
      }
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.enumerable !== true ||
        !reflectApply(objectHasOwn, Object, [descriptor, "value"])) {
        throw new CivilTimeBoundaryError("INTERNAL_FAILURE", "digest");
      }
      reflectApply(objectDefineProperty, Object, [fields, reflectApply(nativeString, undefined, [index]), {
        value: `${reflectApply(jsonStringify, JSON, [key])}:${visit(descriptor.value, depth + 1)}`,
        writable: true,
        enumerable: true,
        configurable: true
      }]);
    }
    return `{${reflectApply(arrayJoin, fields, [","])}}`;
  }
  return visit(value, 0);
}

async function sha256(domain: string, value: unknown): Promise<string> {
  const cryptoValue = globalThis.crypto;
  const subtle = cryptoValue?.subtle;
  const digest = subtle?.digest;
  const TextEncoderConstructor = globalThis.TextEncoder;
  if (typeof digest !== "function" || typeof TextEncoderConstructor !== "function") {
    throw new CivilTimeBoundaryError("WEB_CRYPTO_UNAVAILABLE", "digest");
  }
  try {
    const encoder = new TextEncoderConstructor();
    const bytes = encoder.encode(`${domain}\0${canonicalJson(value)}`);
    const digestBuffer = await reflectApply(digest, subtle, ["SHA-256", bytes]) as ArrayBuffer;
    const view = new Uint8Array(digestBuffer);
    if (view.byteLength !== 32) throw new Error("unexpected SHA-256 length");
    let hex = "";
    for (let index = 0; index < view.byteLength; index += 1) {
      const part = reflectApply(numberToString, view[index]!, [16]);
      hex += reflectApply(stringPadStart, part, [2, "0"]);
    }
    return hex;
  } catch (error) {
    if (error instanceof CivilTimeBoundaryError) throw error;
    throw new CivilTimeBoundaryError("WEB_CRYPTO_FAILED", "digest");
  }
}

function isCandidateInvariantValid(candidate: BundledZoneCandidate): boolean {
  return reflectApply(numberIsSafeInteger, Number, [candidate.epochMilliseconds]) &&
    reflectApply(numberIsSafeInteger, Number, [candidate.localEpochMilliseconds]) &&
    reflectApply(numberIsSafeInteger, Number, [candidate.offsetSeconds]) &&
    typeof candidate.matchesRequestedLocalTime === "boolean" &&
    candidate.epochMilliseconds + candidate.offsetSeconds * 1_000 === candidate.localEpochMilliseconds;
}

function assertResolutionShape(
  resolution: BundledLocalResolution,
  requestedLocal: number,
  resolver: BundledTzdbResolver<RegisteredTimeZoneDatabaseSnapshot>,
  timeZone: string
): void {
  const candidates = resolution.candidates;
  if (!reflectApply(arrayIsArray, Array, [candidates]) ||
    reflectApply(objectGetPrototypeOf, Object, [candidates]) !== arrayPrototype) {
    throw new CivilTimeBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
  }
  for (let index = 0; index < candidates.length; index += 1) {
    if (!isCandidateInvariantValid(candidates[index]!)) {
      throw new CivilTimeBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
    }
    if (index > 0 && candidates[index - 1]!.epochMilliseconds >= candidates[index]!.epochMilliseconds) {
      throw new CivilTimeBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
    }
    const candidate = candidates[index]!;
    const projection = resolver.projectEpochMilliseconds(candidate.epochMilliseconds, timeZone);
    if (projection.epochMilliseconds !== candidate.epochMilliseconds ||
      projection.localEpochMilliseconds !== candidate.localEpochMilliseconds ||
      projection.offsetSeconds !== candidate.offsetSeconds) {
      throw new CivilTimeBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
    }
  }
  if (resolution.kind === "unique") {
    if (candidates.length !== 1 || candidates[0]!.matchesRequestedLocalTime !== true ||
      candidates[0]!.localEpochMilliseconds !== requestedLocal) {
      throw new CivilTimeBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
    }
    return;
  }
  if (resolution.kind === "overlap") {
    if (candidates.length !== 2) {
      throw new CivilTimeBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
    }
    for (let index = 0; index < candidates.length; index += 1) {
      if (candidates[index]!.matchesRequestedLocalTime !== true ||
        candidates[index]!.localEpochMilliseconds !== requestedLocal) {
        throw new CivilTimeBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
      }
    }
    return;
  }
  if (resolution.kind === "gap") {
    if (candidates.length !== 2) {
      throw new CivilTimeBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
    }
    for (let index = 0; index < candidates.length; index += 1) {
      if (candidates[index]!.matchesRequestedLocalTime !== false) {
        throw new CivilTimeBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
      }
    }
    return;
  }
  throw new CivilTimeBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
}

function chooseCandidate(
  resolution: BundledLocalResolution,
  policy: WesternBirthInputDraft["dstDisambiguation"]
): { candidate: BundledZoneCandidate; decision: "unique" | "earlier" | "later" } {
  if (resolution.kind === "gap") {
    throw new CivilTimeBoundaryError("DST_GAP_REJECTED", "dst_policy");
  }
  if (resolution.kind === "unique") {
    return { candidate: resolution.candidates[0]!, decision: "unique" };
  }
  if (policy === "reject") {
    throw new CivilTimeBoundaryError("DST_OVERLAP_REJECTED", "dst_policy");
  }
  return policy === "earlier"
    ? { candidate: resolution.candidates[0]!, decision: "earlier" }
    : { candidate: resolution.candidates[resolution.candidates.length - 1]!, decision: "later" };
}

function assertChosenRoundTrip(
  resolver: BundledTzdbResolver<RegisteredTimeZoneDatabaseSnapshot>,
  candidate: BundledZoneCandidate,
  timeZone: string,
  requestedLocal: number
): void {
  const projection = resolver.projectEpochMilliseconds(candidate.epochMilliseconds, timeZone);
  if (projection.epochMilliseconds !== candidate.epochMilliseconds ||
    projection.localEpochMilliseconds !== requestedLocal ||
    projection.localEpochMilliseconds !== candidate.localEpochMilliseconds ||
    projection.offsetSeconds !== candidate.offsetSeconds) {
    throw new CivilTimeBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
  }
}

function mapFailure(
  error: unknown,
  fallbackStage: WesternCivilTimeFactFailureStage
): WesternCivilTimeFactFailure {
  if (error instanceof CivilTimeBoundaryError) return failedClosed(error.code, error.stage);
  if (error instanceof TzdbArtifactError) {
    if (error.code === "TZDB_ARTIFACT_UNAVAILABLE") {
      return failedClosed("TZDB_ARTIFACT_UNAVAILABLE", "tzdb_load");
    }
    if (error.code === "TZDB_ARTIFACT_MISMATCH") {
      return failedClosed("TZDB_ARTIFACT_DRIFT", "tzdb_load");
    }
    if (error.code === "TZDB_UNKNOWN_ZONE") {
      return failedClosed("TZDB_UNKNOWN_ZONE", "tzdb_resolution");
    }
    return failedClosed("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
  }
  return failedClosed("INTERNAL_FAILURE", fallbackStage);
}

/**
 * Resolves only the declared civil wall time. It performs no geocoding,
 * persistence, network request, host-Intl fallback, or cross-system admission.
 */
export async function resolveWesternCivilTimeFact(rawRequest: unknown): Promise<WesternCivilTimeFactResult> {
  let request: { input: unknown; tzdbSnapshotId: string };
  let input: WesternBirthInputDraft;
  let localEpochMilliseconds: number;
  let normalizedSecond: number;
  let registrySnapshot: RegisteredTimeZoneDatabaseSnapshot;

  try {
    request = captureRequest(rawRequest);
    const parsed = westernBirthInputDraftSchema.safeParse(request.input);
    if (!parsed.success) return failedClosed("INVALID_INPUT_CONTRACT", "input_contract");
    input = parsed.data;
    ({ localEpochMilliseconds, normalizedSecond } = parseLocalEpochMilliseconds(input));
    const snapshot = getBundledTzdbArtifactSnapshot(request.tzdbSnapshotId);
    if (snapshot === null) return failedClosed("TZDB_ARTIFACT_UNAVAILABLE", "tzdb_load");
    if (input.date < snapshot.supportedRange.from || input.date > snapshot.supportedRange.to) {
      return failedClosed("TZDB_ARTIFACT_DRIFT", "tzdb_load");
    }
    registrySnapshot = snapshot;
  } catch (error) {
    return mapFailure(error, "boundary_snapshot");
  }

  let fallbackStage: WesternCivilTimeFactFailureStage = "tzdb_load";
  try {
    const resolver = await loadBundledTzdbResolver(request.tzdbSnapshotId);
    const postLoadSnapshot = getBundledTzdbArtifactSnapshot(request.tzdbSnapshotId);
    if (postLoadSnapshot === null ||
      !sameSnapshotBinding(registrySnapshot, postLoadSnapshot) ||
      !sameSnapshotBinding(registrySnapshot, resolver.snapshot)) {
      return failedClosed("TZDB_ARTIFACT_DRIFT", "tzdb_load");
    }

    fallbackStage = "tzdb_resolution";
    if (!resolver.isTimeZoneName(input.timeZone)) {
      return failedClosed("TZDB_UNKNOWN_ZONE", "tzdb_resolution");
    }
    const resolution = resolver.resolveLocalEpochMilliseconds(localEpochMilliseconds, input.timeZone);
    assertResolutionShape(resolution, localEpochMilliseconds, resolver, input.timeZone);
    const chosen = chooseCandidate(resolution, input.dstDisambiguation);
    assertChosenRoundTrip(resolver, chosen.candidate, input.timeZone, localEpochMilliseconds);
    const utcOffsetSeconds = reflectApply(objectIs, Object, [chosen.candidate.offsetSeconds, -0])
      ? 0
      : chosen.candidate.offsetSeconds;
    const utcInstant = reflectApply(
      dateToISOString,
      new NativeDate(chosen.candidate.epochMilliseconds),
      []
    );

    fallbackStage = "digest";
    const [inputSha256, requestSha256] = await Promise.all([
      sha256("hakimi/western-civil-time-fact-browser-draft/input/v1", input),
      sha256("hakimi/western-civil-time-fact-browser-draft/request/v1", {
        input,
        tzdbSnapshotId: request.tzdbSnapshotId
      })
    ]);
    const tzdbBinding = snapshotBinding(registrySnapshot);
    const resolutionProjection = {
      inputSha256,
      requestSha256,
      tzdbBinding,
      localEpochMilliseconds,
      epochMilliseconds: chosen.candidate.epochMilliseconds,
      utcInstant,
      utcOffsetSeconds,
      kind: resolution.kind,
      decision: chosen.decision
    };
    const resolutionSha256 = await sha256(
      "hakimi/western-civil-time-fact-browser-draft/resolution/v1",
      resolutionProjection
    );

    fallbackStage = "receipt_construction";
    const receiptWithoutFinalDigest = {
      schemaVersion: WESTERN_CIVIL_TIME_FACT_RECEIPT_SCHEMA_VERSION,
      resolverVersion: WESTERN_CIVIL_TIME_FACT_RESOLVER_VERSION,
      outcome: "resolved" as const,
      classification: "civil_time_engineering_fact_only" as const,
      formalAdmissionStatus: "not_admitted_isolated_draft" as const,
      inputBinding: {
        contractVersion: WESTERN_ASTROLOGY_DRAFT_CONTRACT_VERSION,
        systemId: WESTERN_ASTROLOGY_SYSTEM_ID,
        calendar: "proleptic_gregorian" as const,
        inputSha256,
        requestSha256
      },
      civilTime: {
        date: input.date,
        time: input.time,
        timePrecision: input.timePrecision,
        timeZone: input.timeZone,
        requestedDstDisambiguation: input.dstDisambiguation,
        normalizedSecond,
        fractionalSeconds: 0 as const
      },
      tzdbBinding,
      resolution: {
        kind: resolution.kind as "unique" | "overlap",
        decision: chosen.decision,
        localEpochMilliseconds,
        epochMilliseconds: chosen.candidate.epochMilliseconds,
        utcInstant,
        utcInstantPrecision: input.timePrecision,
        utcOffsetSeconds,
        utcOffsetSignConvention: "east_positive" as const,
        requestedLocalTimeRoundTripVerified: true as const
      },
      operationBoundary: OPERATION_BOUNDARY,
      dataHandling: receiptDataHandling(),
      authorityBoundary: AUTHORITY_BOUNDARY,
      digests: {
        algorithm: "SHA-256" as const,
        implementation: "Web Crypto SubtleCrypto.digest" as const,
        canonicalizationProfile: WESTERN_CIVIL_TIME_FACT_CANONICALIZATION_PROFILE,
        inputSha256,
        requestSha256,
        resolutionSha256,
        digestIsDigitalSignature: false as const
      }
    };
    fallbackStage = "digest";
    const receiptSha256 = await sha256(
      "hakimi/western-civil-time-fact-browser-draft/receipt/v1",
      receiptWithoutFinalDigest
    );
    const receipt = deepFreeze({
      ...receiptWithoutFinalDigest,
      digests: { ...receiptWithoutFinalDigest.digests, receiptSha256 }
    }) as WesternCivilTimeFactReceipt;
    weakAdd(FACT_RECEIPTS, receipt);
    return receipt;
  } catch (error) {
    return mapFailure(error, fallbackStage);
  }
}

/** Process-local provenance only; clones and hash-bearing forgeries are rejected. */
export function isWesternCivilTimeFactReceipt(value: unknown): value is WesternCivilTimeFactReceipt {
  return value !== null && typeof value === "object" && weakHas(FACT_RECEIPTS, value);
}
