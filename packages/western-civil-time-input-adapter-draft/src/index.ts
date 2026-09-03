import { createHash } from "node:crypto";
import {
  TzdbArtifactError,
  getBundledTzdbArtifactSnapshot,
  loadBundledTzdbResolver,
  type BundledLocalResolution,
  type BundledTzdbResolver,
  type BundledZoneCandidate,
  type RegisteredTimeZoneDatabaseSnapshot
} from "@hakimi/tzdb-core";
import {
  WESTERN_ASTROLOGY_DRAFT_CONTRACT_VERSION,
  WESTERN_ASTROLOGY_SYSTEM_ID,
  westernBirthInputDraftSchema,
  type WesternBirthInputDraft
} from "../../western-astrology-contracts-draft/src/index.ts";

export const WESTERN_CIVIL_TIME_ADAPTER_VERSION = "0.1.0-draft.1" as const;
export const WESTERN_CIVIL_TIME_RECEIPT_SCHEMA_VERSION =
  "hakimi.western-civil-time-engineering-receipt/0.1-draft" as const;
export const WESTERN_CIVIL_TIME_CANONICALIZATION_PROFILE =
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
const objectFreeze = Object.freeze;
const objectGetOwnPropertyDescriptors = Object.getOwnPropertyDescriptors;
const objectGetOwnPropertySymbols = Object.getOwnPropertySymbols;
const objectGetPrototypeOf = Object.getPrototypeOf;
const objectKeys = Object.keys;
const arrayIsArray = Array.isArray;
const plainObjectPrototype = Object.prototype;

const MAX_CAPTURE_DEPTH = 4;
const MAX_CAPTURE_OBJECTS = 8;
const MAX_CAPTURE_KEYS = 64;
const MAX_CAPTURE_STRING_CODE_UNITS = 10_000;

type JsonScalar = null | boolean | number | string;
type CapturedJson = JsonScalar | { [key: string]: CapturedJson };

export type WesternCivilTimeFailureCode =
  | "INVALID_REQUEST_SHAPE"
  | "INVALID_INPUT_CONTRACT"
  | "INVALID_GREGORIAN_WALL_TIME"
  | "TZDB_ARTIFACT_UNAVAILABLE"
  | "TZDB_ARTIFACT_DRIFT"
  | "TZDB_UNKNOWN_ZONE"
  | "TZDB_RESOLUTION_INVARIANT_FAILED"
  | "DST_GAP_REJECTED"
  | "DST_OVERLAP_REJECTED"
  | "INTERNAL_FAILURE";

export type WesternCivilTimeFailureStage =
  | "boundary_snapshot"
  | "input_contract"
  | "gregorian_projection"
  | "tzdb_load"
  | "tzdb_resolution"
  | "dst_policy"
  | "receipt_construction";

export type WesternCivilTimeFailedClosed = Readonly<{
  schemaVersion: typeof WESTERN_CIVIL_TIME_RECEIPT_SCHEMA_VERSION;
  adapterVersion: typeof WESTERN_CIVIL_TIME_ADAPTER_VERSION;
  outcome: "failed_closed";
  classification: "civil_time_engineering_only";
  code: WesternCivilTimeFailureCode;
  stage: WesternCivilTimeFailureStage;
  partialResolutionReturned: false;
  audit: typeof OPERATION_ABSENCE;
  dataHandling: typeof DATA_HANDLING_BOUNDARY;
  authorityBoundary: typeof AUTHORITY_BOUNDARY;
}>;

type TzdbBinding = Readonly<{
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

export type WesternCivilTimeEngineeringReceipt = Readonly<{
  schemaVersion: typeof WESTERN_CIVIL_TIME_RECEIPT_SCHEMA_VERSION;
  adapterVersion: typeof WESTERN_CIVIL_TIME_ADAPTER_VERSION;
  outcome: "resolved";
  classification: "civil_time_engineering_only";
  formalAdmissionStatus: "not_admitted_draft_receipt";
  inputBinding: Readonly<{
    contractVersion: typeof WESTERN_ASTROLOGY_DRAFT_CONTRACT_VERSION;
    systemId: typeof WESTERN_ASTROLOGY_SYSTEM_ID;
    calendar: "proleptic_gregorian";
    birthSourceRef: string;
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
  location: Readonly<{
    latitudeDegrees: number;
    longitudeDegrees: number;
    elevationMeters: number | null;
    inputPrecision: "coordinates";
    coordinateModel: "declared_geodetic_coordinates_no_geocoding";
    latitudeSignConvention: "north_positive";
    longitudeSignConvention: "east_positive";
    elevationReference: "not_declared_by_input_contract";
    coordinatesUsedForTimeZoneInference: false;
  }>;
  tzdbBinding: TzdbBinding;
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
  excludedProducts: readonly [
    "UT1",
    "TT",
    "TDB",
    "EOP",
    "RAMC",
    "ephemeris",
    "chart",
    "astrological_content"
  ];
  audit: typeof OPERATION_ABSENCE;
  dataHandling: typeof DATA_HANDLING_BOUNDARY;
  authorityBoundary: typeof AUTHORITY_BOUNDARY;
  digests: Readonly<{
    algorithm: "SHA-256";
    canonicalizationProfile: typeof WESTERN_CIVIL_TIME_CANONICALIZATION_PROFILE;
    inputSha256: string;
    requestSha256: string;
    resolutionSha256: string;
    receiptSha256: string;
    digestIsDigitalSignature: false;
  }>;
}>;

export type WesternCivilTimeAdapterResult =
  | WesternCivilTimeEngineeringReceipt
  | WesternCivilTimeFailedClosed;

export type WesternCivilTimeReceiptSummary = Readonly<{
  schemaVersion: "hakimi.western-civil-time-engineering-summary/0.1-draft";
  receiptSha256: string;
  inputSha256: string;
  requestSha256: string;
  tzdbSnapshotId: string;
  utcInstant: string;
  utcOffsetSeconds: number;
  dstDecision: "unique" | "earlier" | "later";
  containsPersonalData: true;
  personDerivedDigest: true;
  safeToLog: false;
  safeToPersist: false;
  safeToPublish: false;
  formalInputContractAdmitted: false;
  releaseReady: false;
  publicDeploymentAuthorized: false;
}>;

const OPERATION_ABSENCE = objectFreeze({
  hostIntlUsed: false,
  hostTimeZoneDatabaseUsed: false,
  hostTimeZoneFallbackUsed: false,
  networkTransmissionPerformed: false,
  persistencePerformed: false,
  geocodingPerformed: false,
  mutationPerformed: false,
  mutationEpochAvailable: false,
  mutationEpoch: null,
  mutationEpochReceipt: null,
  mutationBoundary: "not_applicable_no_persistence" as const,
  crossFileAtomicSnapshot: false,
  intervalMutationExcluded: false,
  abaExcluded: false
});

const DATA_HANDLING_BOUNDARY = objectFreeze({
  containsPersonalData: true,
  containsPersonDerivedBirthData: true,
  personDerivedDigest: true,
  safeToLog: false,
  safeToPersist: false,
  safeToPublish: false,
  persistenceAuthorized: false,
  retentionAuthorized: false,
  networkTransmissionAuthorized: false
});

const AUTHORITY_BOUNDARY = objectFreeze({
  formalInputContractAdmitted: false,
  timeScaleProvenanceEstablished: false,
  astronomicalFactsEstablished: false,
  chartCalculated: false,
  contentTruthEstablished: false,
  expertTruthEstablished: false,
  rightsLegalConclusionEstablished: false,
  releaseEvidenceComplete: false,
  releaseReady: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  expertClaimsAuthorized: false,
  highRiskClaimsAuthorized: false,
  formalSystemAdmission: false,
  baziAuthorityInherited: false,
  releaseIdentity: null,
  targetSchema: null,
  migrationId: null
});

const EXCLUDED_PRODUCTS = objectFreeze([
  "UT1",
  "TT",
  "TDB",
  "EOP",
  "RAMC",
  "ephemeris",
  "chart",
  "astrological_content"
] as const);

const ENGINEERING_RECEIPTS = new WeakSet<object>();

class AdapterBoundaryError extends Error {
  readonly code: WesternCivilTimeFailureCode;
  readonly stage: WesternCivilTimeFailureStage;

  constructor(code: WesternCivilTimeFailureCode, stage: WesternCivilTimeFailureStage) {
    super(code);
    this.name = "AdapterBoundaryError";
    this.code = code;
    this.stage = stage;
  }
}

function failedClosed(
  code: WesternCivilTimeFailureCode,
  stage: WesternCivilTimeFailureStage
): WesternCivilTimeFailedClosed {
  return deepFreeze({
    schemaVersion: WESTERN_CIVIL_TIME_RECEIPT_SCHEMA_VERSION,
    adapterVersion: WESTERN_CIVIL_TIME_ADAPTER_VERSION,
    outcome: "failed_closed" as const,
    classification: "civil_time_engineering_only" as const,
    code,
    stage,
    partialResolutionReturned: false as const,
    audit: OPERATION_ABSENCE,
    dataHandling: DATA_HANDLING_BOUNDARY,
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
      throw new AdapterBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
    }
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      throw new AdapterBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
    }
    return value;
  }
  if (typeof value !== "object" || depth > MAX_CAPTURE_DEPTH || arrayIsArray(value)) {
    throw new AdapterBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
  }

  if (state.seen.has(value)) {
    throw new AdapterBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
  }
  state.seen.add(value);
  state.objectCount += 1;
  if (state.objectCount > MAX_CAPTURE_OBJECTS) {
    throw new AdapterBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
  }

  if (objectGetPrototypeOf(value) !== plainObjectPrototype || objectGetOwnPropertySymbols(value).length !== 0) {
    throw new AdapterBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
  }

  const descriptors = objectGetOwnPropertyDescriptors(value);
  const keys = objectKeys(descriptors);
  state.keyCount += keys.length;
  if (state.keyCount > MAX_CAPTURE_KEYS) {
    throw new AdapterBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
  }

  const snapshot: { [key: string]: CapturedJson } = Object.create(null) as { [key: string]: CapturedJson };
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
      throw new AdapterBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
    }
    snapshot[key] = captureStrictPlainData(descriptor.value, state, depth + 1);
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
    if (error instanceof AdapterBoundaryError) throw error;
    throw new AdapterBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
  }

  if (snapshot === null || typeof snapshot !== "object" || arrayIsArray(snapshot)) {
    throw new AdapterBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
  }
  const keys = objectKeys(snapshot).sort();
  if (keys.length !== 2 || keys[0] !== "input" || keys[1] !== "tzdbSnapshotId") {
    throw new AdapterBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
  }
  if (typeof snapshot.tzdbSnapshotId !== "string") {
    throw new AdapterBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
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
    throw new AdapterBoundaryError("INVALID_GREGORIAN_WALL_TIME", "gregorian_projection");
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = input.timePrecision === "exact_second" ? Number(timeMatch[3]) : 0;
  const localEpochMilliseconds = dateUtc(year, month - 1, day, hour, minute, second, 0);
  const projected = new NativeDate(localEpochMilliseconds);

  if (
    !Number.isSafeInteger(localEpochMilliseconds) ||
    getUtcFullYear.call(projected) !== year ||
    getUtcMonth.call(projected) !== month - 1 ||
    getUtcDate.call(projected) !== day ||
    getUtcHours.call(projected) !== hour ||
    getUtcMinutes.call(projected) !== minute ||
    getUtcSeconds.call(projected) !== second
  ) {
    throw new AdapterBoundaryError("INVALID_GREGORIAN_WALL_TIME", "gregorian_projection");
  }
  return { localEpochMilliseconds, normalizedSecond: second };
}

function snapshotBinding(snapshot: RegisteredTimeZoneDatabaseSnapshot): TzdbBinding {
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

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new AdapterBoundaryError("INTERNAL_FAILURE", "receipt_construction");
    return Object.is(value, -0) ? "0" : JSON.stringify(value);
  }
  if (arrayIsArray(value)) return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    return `{${objectKeys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  throw new AdapterBoundaryError("INTERNAL_FAILURE", "receipt_construction");
}

function sha256(domain: string, value: unknown): string {
  return createHash("sha256")
    .update(domain, "utf8")
    .update("\0", "utf8")
    .update(canonicalJson(value), "utf8")
    .digest("hex");
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (typeof value !== "object" || value === null || seen.has(value)) return value;
  seen.add(value);
  for (const descriptor of Object.values(objectGetOwnPropertyDescriptors(value))) {
    if ("value" in descriptor) deepFreeze(descriptor.value, seen);
  }
  return objectFreeze(value);
}

function isCandidateInvariantValid(candidate: BundledZoneCandidate): boolean {
  return Number.isSafeInteger(candidate.epochMilliseconds) &&
    Number.isSafeInteger(candidate.localEpochMilliseconds) &&
    Number.isSafeInteger(candidate.offsetSeconds) &&
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
  if (!arrayIsArray(candidates) || !candidates.every(isCandidateInvariantValid)) {
    throw new AdapterBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
  }
  const sorted = [...candidates].sort((left, right) => left.epochMilliseconds - right.epochMilliseconds);
  if (sorted.some((candidate, index) => candidate !== candidates[index])) {
    throw new AdapterBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
  }
  for (const candidate of candidates) {
    const projection = resolver.projectEpochMilliseconds(candidate.epochMilliseconds, timeZone);
    if (
      projection.epochMilliseconds !== candidate.epochMilliseconds ||
      projection.localEpochMilliseconds !== candidate.localEpochMilliseconds ||
      projection.offsetSeconds !== candidate.offsetSeconds
    ) {
      throw new AdapterBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
    }
  }

  if (resolution.kind === "unique") {
    if (candidates.length !== 1 || !candidates[0]?.matchesRequestedLocalTime || candidates[0].localEpochMilliseconds !== requestedLocal) {
      throw new AdapterBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
    }
    return;
  }
  if (resolution.kind === "overlap") {
    if (
      candidates.length !== 2 ||
      candidates[0]?.epochMilliseconds === candidates[1]?.epochMilliseconds ||
      candidates.some((candidate) => !candidate.matchesRequestedLocalTime || candidate.localEpochMilliseconds !== requestedLocal)
    ) {
      throw new AdapterBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
    }
    return;
  }
  if (resolution.kind === "gap") {
    if (candidates.length !== 2 || candidates.some((candidate) => candidate.matchesRequestedLocalTime)) {
      throw new AdapterBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
    }
    return;
  }
  throw new AdapterBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
}

function assertChosenRoundTrip(
  resolver: BundledTzdbResolver<RegisteredTimeZoneDatabaseSnapshot>,
  candidate: BundledZoneCandidate,
  timeZone: string,
  requestedLocal: number
): void {
  const projection = resolver.projectEpochMilliseconds(candidate.epochMilliseconds, timeZone);
  if (
    projection.epochMilliseconds !== candidate.epochMilliseconds ||
    projection.localEpochMilliseconds !== requestedLocal ||
    projection.localEpochMilliseconds !== candidate.localEpochMilliseconds ||
    projection.offsetSeconds !== candidate.offsetSeconds
  ) {
    throw new AdapterBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
  }
}

function chooseCandidate(
  resolution: BundledLocalResolution,
  policy: WesternBirthInputDraft["dstDisambiguation"]
): { candidate: BundledZoneCandidate; decision: "unique" | "earlier" | "later" } {
  if (resolution.kind === "gap") {
    throw new AdapterBoundaryError("DST_GAP_REJECTED", "dst_policy");
  }
  if (resolution.kind === "unique") {
    return { candidate: resolution.candidates[0]!, decision: "unique" };
  }
  if (policy === "reject") {
    throw new AdapterBoundaryError("DST_OVERLAP_REJECTED", "dst_policy");
  }
  const sorted = [...resolution.candidates].sort((left, right) => left.epochMilliseconds - right.epochMilliseconds);
  return policy === "earlier"
    ? { candidate: sorted[0]!, decision: "earlier" }
    : { candidate: sorted[sorted.length - 1]!, decision: "later" };
}

function mapTzdbError(error: unknown): WesternCivilTimeFailedClosed {
  if (error instanceof AdapterBoundaryError) return failedClosed(error.code, error.stage);
  if (error instanceof TzdbArtifactError) {
    if (error.code === "TZDB_ARTIFACT_UNAVAILABLE") {
      return failedClosed("TZDB_ARTIFACT_UNAVAILABLE", "tzdb_load");
    }
    if (error.code === "TZDB_UNKNOWN_ZONE") {
      return failedClosed("TZDB_UNKNOWN_ZONE", "tzdb_resolution");
    }
    if (error.code === "TZDB_ARTIFACT_MISMATCH") {
      return failedClosed("TZDB_ARTIFACT_DRIFT", "tzdb_load");
    }
    return failedClosed("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
  }
  return failedClosed("INTERNAL_FAILURE", "tzdb_resolution");
}

/**
 * Resolves a strict Western birth-input object against an explicitly selected,
 * content-addressed bundled tzdb snapshot. Raw input is never read after the
 * pre-await declarative snapshot has completed.
 */
export async function resolveWesternCivilTimeInputDraft(rawRequest: unknown): Promise<WesternCivilTimeAdapterResult> {
  let request: { input: unknown; tzdbSnapshotId: string };
  let input: WesternBirthInputDraft;
  let localEpochMilliseconds: number;
  let normalizedSecond: number;
  let registrySnapshot: RegisteredTimeZoneDatabaseSnapshot;

  try {
    request = captureRequest(rawRequest);
    const parsed = westernBirthInputDraftSchema.safeParse(request.input);
    if (!parsed.success) {
      return failedClosed("INVALID_INPUT_CONTRACT", "input_contract");
    }
    input = parsed.data;
    ({ localEpochMilliseconds, normalizedSecond } = parseLocalEpochMilliseconds(input));

    const snapshot = getBundledTzdbArtifactSnapshot(request.tzdbSnapshotId);
    if (snapshot === null) {
      return failedClosed("TZDB_ARTIFACT_UNAVAILABLE", "tzdb_load");
    }
    if (input.date < snapshot.supportedRange.from || input.date > snapshot.supportedRange.to) {
      return failedClosed("TZDB_ARTIFACT_DRIFT", "tzdb_load");
    }
    registrySnapshot = snapshot;
  } catch (error) {
    return mapTzdbError(error);
  }

  try {
    const resolver = await loadBundledTzdbResolver(request.tzdbSnapshotId);
    const postLoadRegistrySnapshot = getBundledTzdbArtifactSnapshot(request.tzdbSnapshotId);
    if (
      postLoadRegistrySnapshot === null ||
      canonicalJson(snapshotBinding(registrySnapshot)) !== canonicalJson(snapshotBinding(postLoadRegistrySnapshot)) ||
      canonicalJson(snapshotBinding(registrySnapshot)) !== canonicalJson(snapshotBinding(resolver.snapshot))
    ) {
      return failedClosed("TZDB_ARTIFACT_DRIFT", "tzdb_load");
    }
    if (!resolver.isTimeZoneName(input.timeZone)) {
      return failedClosed("TZDB_UNKNOWN_ZONE", "tzdb_resolution");
    }

    const resolution = resolver.resolveLocalEpochMilliseconds(localEpochMilliseconds, input.timeZone);
    assertResolutionShape(resolution, localEpochMilliseconds, resolver, input.timeZone);
    const chosen = chooseCandidate(resolution, input.dstDisambiguation);
    assertChosenRoundTrip(resolver, chosen.candidate, input.timeZone, localEpochMilliseconds);
    const normalizedOffsetSeconds = Object.is(chosen.candidate.offsetSeconds, -0)
      ? 0
      : chosen.candidate.offsetSeconds;

    const inputSha256 = sha256(
      "hakimi/western-civil-time-input-adapter-draft/input/v1",
      input
    );
    const requestSha256 = sha256(
      "hakimi/western-civil-time-input-adapter-draft/request/v1",
      { input, tzdbSnapshotId: request.tzdbSnapshotId }
    );
    const tzdbBinding = snapshotBinding(registrySnapshot);
    const resolutionProjection = {
      inputSha256,
      requestSha256,
      tzdbBinding,
      localEpochMilliseconds,
      epochMilliseconds: chosen.candidate.epochMilliseconds,
      utcOffsetSeconds: normalizedOffsetSeconds,
      kind: resolution.kind,
      decision: chosen.decision
    };
    const resolutionSha256 = sha256(
      "hakimi/western-civil-time-input-adapter-draft/resolution/v1",
      resolutionProjection
    );

    const receiptWithoutFinalDigest = {
      schemaVersion: WESTERN_CIVIL_TIME_RECEIPT_SCHEMA_VERSION,
      adapterVersion: WESTERN_CIVIL_TIME_ADAPTER_VERSION,
      outcome: "resolved" as const,
      classification: "civil_time_engineering_only" as const,
      formalAdmissionStatus: "not_admitted_draft_receipt" as const,
      inputBinding: {
        contractVersion: WESTERN_ASTROLOGY_DRAFT_CONTRACT_VERSION,
        systemId: WESTERN_ASTROLOGY_SYSTEM_ID,
        calendar: "proleptic_gregorian" as const,
        birthSourceRef: input.birthSourceRef,
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
      location: {
        latitudeDegrees: input.location.latitude,
        longitudeDegrees: input.location.longitude,
        elevationMeters: input.location.elevationMeters,
        inputPrecision: "coordinates" as const,
        coordinateModel: "declared_geodetic_coordinates_no_geocoding" as const,
        latitudeSignConvention: "north_positive" as const,
        longitudeSignConvention: "east_positive" as const,
        elevationReference: "not_declared_by_input_contract" as const,
        coordinatesUsedForTimeZoneInference: false as const
      },
      tzdbBinding,
      resolution: {
        kind: resolution.kind as "unique" | "overlap",
        decision: chosen.decision,
        localEpochMilliseconds,
        epochMilliseconds: chosen.candidate.epochMilliseconds,
        utcInstant: dateToISOString.call(new NativeDate(chosen.candidate.epochMilliseconds)),
        utcInstantPrecision: input.timePrecision,
        utcOffsetSeconds: normalizedOffsetSeconds,
        utcOffsetSignConvention: "east_positive" as const,
        requestedLocalTimeRoundTripVerified: true as const
      },
      excludedProducts: EXCLUDED_PRODUCTS,
      audit: OPERATION_ABSENCE,
      dataHandling: DATA_HANDLING_BOUNDARY,
      authorityBoundary: AUTHORITY_BOUNDARY,
      digests: {
        algorithm: "SHA-256" as const,
        canonicalizationProfile: WESTERN_CIVIL_TIME_CANONICALIZATION_PROFILE,
        inputSha256,
        requestSha256,
        resolutionSha256,
        digestIsDigitalSignature: false as const
      }
    };
    const receiptSha256 = sha256(
      "hakimi/western-civil-time-input-adapter-draft/receipt/v1",
      receiptWithoutFinalDigest
    );
    const receipt = deepFreeze({
      ...receiptWithoutFinalDigest,
      digests: { ...receiptWithoutFinalDigest.digests, receiptSha256 }
    }) as WesternCivilTimeEngineeringReceipt;
    ENGINEERING_RECEIPTS.add(receipt);
    return receipt;
  } catch (error) {
    return mapTzdbError(error);
  }
}

/** Process-local provenance check; hashes alone are not signatures and cannot create this brand. */
export function isWesternCivilTimeEngineeringReceipt(
  value: unknown
): value is WesternCivilTimeEngineeringReceipt {
  return typeof value === "object" && value !== null && ENGINEERING_RECEIPTS.has(value);
}

/** Returns a compact frozen view only for a genuine receipt created by this module instance. */
export function summarizeWesternCivilTimeEngineeringReceipt(
  value: unknown
): WesternCivilTimeReceiptSummary | null {
  if (!isWesternCivilTimeEngineeringReceipt(value)) return null;
  return deepFreeze({
    schemaVersion: "hakimi.western-civil-time-engineering-summary/0.1-draft" as const,
    receiptSha256: value.digests.receiptSha256,
    inputSha256: value.digests.inputSha256,
    requestSha256: value.digests.requestSha256,
    tzdbSnapshotId: value.tzdbBinding.snapshotId,
    utcInstant: value.resolution.utcInstant,
    utcOffsetSeconds: value.resolution.utcOffsetSeconds,
    dstDecision: value.resolution.decision,
    containsPersonalData: true as const,
    personDerivedDigest: true as const,
    safeToLog: false as const,
    safeToPersist: false as const,
    safeToPublish: false as const,
    formalInputContractAdmitted: false as const,
    releaseReady: false as const,
    publicDeploymentAuthorized: false as const
  });
}
