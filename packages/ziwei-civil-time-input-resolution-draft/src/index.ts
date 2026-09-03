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
  ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
  ZIWEI_DOUSHU_SYSTEM_ID,
  ZIWEI_SHICHEN_SLOTS,
  ziweiBirthInputDraftSchema
} from "./contract-bridge.ts";

export const ZIWEI_CIVIL_TIME_RESOLUTION_PROTOCOL_VERSION =
  "hakimi.ziwei-civil-time-resolution-request/0.1-draft" as const;
export const ZIWEI_CIVIL_TIME_RESOLUTION_SCHEMA_VERSION =
  "hakimi.ziwei-civil-time-resolution-candidate/0.1-draft" as const;
export const ZIWEI_CIVIL_TIME_RESOLUTION_ADAPTER_VERSION = "0.1.0-draft.0" as const;
export const ZIWEI_CIVIL_TIME_CANONICALIZATION_PROFILE =
  "hakimi.sorted-key-json.finite-number.v1" as const;
export const ZIWEI_CIVIL_TIME_EXPECTED_PARENT_CONTRACT_VERSION = "0.1.0-draft.3" as const;
export const ZIWEI_CIVIL_TIME_EXPECTED_PARENT_SYSTEM_ID = "ziwei-doushu" as const;

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
const objectValues = Object.values;
const arrayIsArray = Array.isArray;
const plainObjectPrototype = Object.prototype;
const reflectApply = Reflect.apply;
const stringTrim = String.prototype.trim;

const MAX_CAPTURE_DEPTH = 4;
const MAX_CAPTURE_OBJECTS = 8;
const MAX_CAPTURE_KEYS = 64;
const MAX_CAPTURE_STRING_CODE_UNITS = 8_000;

const EXPECTED_SLOT_TABLE = Object.freeze([
  Object.freeze({ index: 0, branchId: "zi", civilRange: "00:00-01:00", startMinute: 0, endMinute: 60 }),
  Object.freeze({ index: 1, branchId: "chou", civilRange: "01:00-03:00", startMinute: 60, endMinute: 180 }),
  Object.freeze({ index: 2, branchId: "yin", civilRange: "03:00-05:00", startMinute: 180, endMinute: 300 }),
  Object.freeze({ index: 3, branchId: "mao", civilRange: "05:00-07:00", startMinute: 300, endMinute: 420 }),
  Object.freeze({ index: 4, branchId: "chen", civilRange: "07:00-09:00", startMinute: 420, endMinute: 540 }),
  Object.freeze({ index: 5, branchId: "si", civilRange: "09:00-11:00", startMinute: 540, endMinute: 660 }),
  Object.freeze({ index: 6, branchId: "wu", civilRange: "11:00-13:00", startMinute: 660, endMinute: 780 }),
  Object.freeze({ index: 7, branchId: "wei", civilRange: "13:00-15:00", startMinute: 780, endMinute: 900 }),
  Object.freeze({ index: 8, branchId: "shen", civilRange: "15:00-17:00", startMinute: 900, endMinute: 1_020 }),
  Object.freeze({ index: 9, branchId: "you", civilRange: "17:00-19:00", startMinute: 1_020, endMinute: 1_140 }),
  Object.freeze({ index: 10, branchId: "xu", civilRange: "19:00-21:00", startMinute: 1_140, endMinute: 1_260 }),
  Object.freeze({ index: 11, branchId: "hai", civilRange: "21:00-23:00", startMinute: 1_260, endMinute: 1_380 }),
  Object.freeze({ index: 12, branchId: "zi", civilRange: "23:00-24:00", startMinute: 1_380, endMinute: 1_440 })
] as const);

type JsonScalar = null | boolean | number | string;
type CapturedJson = JsonScalar | { [key: string]: CapturedJson };
type DstDisambiguation = "reject" | "earlier" | "later";
type ResolutionDecision = "unique" | "earlier" | "later";

export type ZiweiCivilTimeResolutionRequest = Readonly<{
  protocolVersion: typeof ZIWEI_CIVIL_TIME_RESOLUTION_PROTOCOL_VERSION;
  systemId: typeof ZIWEI_CIVIL_TIME_EXPECTED_PARENT_SYSTEM_ID;
  calendarInput: Readonly<{ calendar: "gregorian"; date: string }>;
  localTime: string;
  timePrecision: "exact_minute";
  uncertainty: "exact";
  timeZone: string;
  dstDisambiguation: DstDisambiguation;
  location: Readonly<{
    precision: "coordinates";
    label: string;
    latitude: number;
    longitude: number;
  }>;
  solarTimeAdjustment: "none";
  tzdbSnapshotId: string;
}>;

export type ZiweiCivilTimeFailureCode =
  | "INVALID_REQUEST_SHAPE"
  | "INVALID_INPUT"
  | "INVALID_GREGORIAN_WALL_TIME"
  | "PARENT_CONTRACT_IDENTITY_DRIFT"
  | "PARENT_SLOT_TABLE_DRIFT"
  | "SHICHEN_PARTITION_FAILED"
  | "TZDB_ARTIFACT_UNAVAILABLE"
  | "TZDB_ARTIFACT_DRIFT"
  | "TZDB_UNKNOWN_ZONE"
  | "TZDB_RESOLUTION_INVARIANT_FAILED"
  | "DST_GAP_REJECTED"
  | "DST_OVERLAP_REJECTED"
  | "INTERNAL_FAILURE";

export type ZiweiCivilTimeFailureStage =
  | "boundary_snapshot"
  | "input_contract"
  | "parent_contract_binding"
  | "gregorian_projection"
  | "tzdb_load"
  | "tzdb_resolution"
  | "dst_policy"
  | "shichen_partition"
  | "candidate_construction";

export type ZiweiCivilTimeTzdbBinding = Readonly<{
  snapshotId: string;
  schemaVersion: string;
  kind: string;
  ianaVersion: string;
  artifactName: string;
  dataSha256: string;
  resolver: Readonly<{ name: string; version: string }>;
  adapter: Readonly<{ name: string; version: string }>;
  supportedRange: Readonly<{ from: string; to: string }>;
  descriptorSha256RecomputedFromAllLoadedZoneAndLinkBytes: false;
}>;

type TzdbBinding = ZiweiCivilTimeTzdbBinding;

type ParentSlot = Readonly<{
  index: number;
  branchId: string;
  civilRange: string;
  startMinute: number;
  endMinute: number;
}>;

const COMMON_OPERATION_BOUNDARY = {
  hostIntlUsed: false,
  hostTimeZoneDatabaseUsed: false,
  hostTimeZoneFallbackUsed: false,
  networkTransmissionPerformed: false,
  persistencePerformed: false,
  userOrBusinessStorageReadPerformed: false,
  userOrBusinessStorageWritePerformed: false,
  runtimeModuleOrBundledArtifactReadExcluded: false,
  geocodingPerformed: false,
  trueSolarTimeCalculationPerformed: false,
  ziweiEngineInvoked: false,
  currentZiweiBirthInputProduced: false,
  persistentOrUserStateMutationPerformed: false,
  schema13MutationPerformed: false,
  mutationEpochAvailable: false,
  mutationEpoch: null,
  mutationEpochReceipt: null,
  mutationBoundary: "process_local_weakset_brand_only_no_persistent_or_user_state_mutation" as const,
  crossFileAtomicSnapshot: false,
  intervalMutationExcludedAcrossFiles: false,
  abaExcluded: false
} as const;

const FAILED_OPERATION_OBSERVATION = objectFreeze({
  ...COMMON_OPERATION_BOUNDARY,
  processLocalCapabilityRegistryMutationPerformed: false as const
});

const SUCCESS_OPERATION_OBSERVATION = objectFreeze({
  ...COMMON_OPERATION_BOUNDARY,
  processLocalCapabilityRegistryMutationPerformed: true as const
});

const DATA_HANDLING_BOUNDARY = objectFreeze({
  containsPersonalData: true,
  containsPersonDerivedBirthData: true,
  exactCivilDateAndTimePresent: true,
  exactLocationPresent: true,
  utcInstantPresentOnSuccess: true,
  shichenIsPersonDerived: true,
  personDerivedDigest: true,
  safeToLog: false,
  safeToPersist: false,
  safeToPublish: false,
  persistenceAuthorized: false,
  retentionAuthorized: false,
  networkTransmissionAuthorized: false
});

const AUTHORITY_BOUNDARY = objectFreeze({
  inputAcceptanceReceiptIssued: false,
  normalizationReceiptIssued: false,
  formalTimeResolutionReceiptIssued: false,
  currentZiweiBirthInputIssued: false,
  factReceiptIssued: false,
  chartCalculated: false,
  contentTruthEstablished: false,
  domainAuthorityAuthorized: false,
  expertTruthEstablished: false,
  expertIdentityQualificationIndependenceEstablished: false,
  rightsLegalConclusionEstablished: false,
  redistributionAuthorized: false,
  formalAdmissionAuthorized: false,
  releaseEvidenceComplete: false,
  releaseReady: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  expertClaimsAuthorized: false,
  highRiskClaimsAuthorized: false,
  baziAuthorityInherited: false,
  productIdentity: null,
  releaseIdentity: null,
  targetSchema: null,
  migrationId: null
});

const ADMISSION_EFFECT = objectFreeze({
  activeAdmissionEffect: "none" as const,
  bindingFrozenVerifiedDelta: 0,
  independentExpertReviewsVerifiedDelta: 0,
  admissionGatesSatisfiedDelta: 0,
  sourceBundleCountDelta: 0,
  rightsBundleCountDelta: 0,
  releaseEvidenceCountDelta: 0
});

const PROJECT_RELEASE_GOVERNANCE_CONTEXT = objectFreeze({
  activeLine: "legacy-v13" as const,
  targetSchema: 13 as const,
  migrationId: null,
  projectContextOnly: true,
  inheritedByZiweiProductIdentity: false,
  mutationEpochBoundaryRequired: true,
  mutationEpochAvailableForSchema13: false,
  mutationEpochReceipt: null,
  expertClaimsAuthorized: false,
  publicDeploymentAuthorized: false
});

const REDACTED_FIELDS = objectFreeze([
  "inputBinding",
  "civilTime",
  "location",
  "tzdbBinding",
  "civilResolution",
  "shichenResolution",
  "lateZiBoundary",
  "digests"
] as const);

export type ZiweiCivilTimeFailedClosed = Readonly<{
  schemaVersion: typeof ZIWEI_CIVIL_TIME_RESOLUTION_SCHEMA_VERSION;
  adapterVersion: typeof ZIWEI_CIVIL_TIME_RESOLUTION_ADAPTER_VERSION;
  outcome: "failed_closed";
  classification: "ziwei_civil_time_to_shichen_engineering_only";
  code: ZiweiCivilTimeFailureCode;
  stage: ZiweiCivilTimeFailureStage;
  partialResolutionReturned: false;
  civilResolution: null;
  shichenResolution: null;
  lateZiBoundary: null;
  audit: typeof FAILED_OPERATION_OBSERVATION;
  dataHandling: typeof DATA_HANDLING_BOUNDARY;
  admissionEffect: typeof ADMISSION_EFFECT;
  authorityBoundary: typeof AUTHORITY_BOUNDARY;
  projectReleaseGovernanceContext: typeof PROJECT_RELEASE_GOVERNANCE_CONTEXT;
}>;

export type ZiweiCivilTimeResolutionCandidate = Readonly<{
  schemaVersion: typeof ZIWEI_CIVIL_TIME_RESOLUTION_SCHEMA_VERSION;
  adapterVersion: typeof ZIWEI_CIVIL_TIME_RESOLUTION_ADAPTER_VERSION;
  outcome: "resolved_candidate";
  classification: "ziwei_civil_time_to_shichen_engineering_only";
  formalAdmissionStatus: "not_admitted_draft_candidate";
  inputBinding: Readonly<{
    parentContractVersion: typeof ZIWEI_CIVIL_TIME_EXPECTED_PARENT_CONTRACT_VERSION;
    systemId: typeof ZIWEI_CIVIL_TIME_EXPECTED_PARENT_SYSTEM_ID;
    calendar: "gregorian";
    inputSha256: string;
    requestSha256: string;
  }>;
  civilTime: Readonly<{
    date: string;
    localTime: string;
    timePrecision: "exact_minute";
    uncertainty: "exact";
    timeZone: string;
    requestedDstDisambiguation: DstDisambiguation;
    solarTimeAdjustment: "none";
    coordinatesUsedForTimeZoneInference: false;
    coordinatesUsedForShichenPartition: false;
    canonicalZoneIdentityEstablished: false;
  }>;
  location: Readonly<{
    precision: "coordinates";
    label: string;
    latitudeDegrees: number;
    longitudeDegrees: number;
    coordinateModel: "declared_coordinates_no_geocoding";
    latitudeSignConvention: "north_positive";
    longitudeSignConvention: "east_positive";
  }>;
  tzdbBinding: TzdbBinding;
  civilResolution: Readonly<{
    kind: "unique" | "overlap";
    decision: ResolutionDecision;
    localEpochMilliseconds: number;
    epochMilliseconds: number;
    utcInstant: string;
    utcOffsetSeconds: number;
    utcOffsetSignConvention: "east_positive";
    requestedLocalTimeRoundTripVerified: true;
  }>;
  shichenResolution: Readonly<{
    index: number;
    branchId: string;
    civilRange: string;
    localMinuteOfDay: number;
    parentSlotCount: 13;
    parentSlotTableSha256: string;
    derivedOnlyFromFrozenWallClockPartition: true;
    timeZoneChangesSlotPartition: false;
    solarTimeApplied: false;
  }>;
  lateZiBoundary: Readonly<{
    isEarlyZiSlot: boolean;
    isLateZiSlot: boolean;
    observedCivilDate: string;
    lateZiDayPolicyApplied: false;
    effectiveCalculationDate: null;
    requiredDownstreamRuleField: "rules.lateZiDay" | null;
  }>;
  parentCompatibility: Readonly<{
    currentParentContractVersion: typeof ZIWEI_CIVIL_TIME_EXPECTED_PARENT_CONTRACT_VERSION;
    currentContractCivilContextUsedForCalculationLockedFalse: true;
    currentZiweiBirthInputIssued: false;
    currentAdapterInvocationAuthorized: false;
    parentContractSuccessorRequiredBeforeEngineConsumption: true;
  }>;
  observationBoundary: Readonly<{
    rawRequestReadAfterPreAwaitSnapshot: false;
    parentSlotTableReobservedAfterTzdbLoad: true;
    tzdbRegistryDescriptorReobservedAfterLoad: true;
    sameHeldBufferHashAndParse: false;
    rawByteIdentityEstablished: false;
    duplicateJsonKeyExclusionEstablished: false;
    transparentProxyExcluded: false;
    completeSameRealmPrimordialPoisoningExcluded: false;
    crossFileAtomicSnapshot: false;
    intervalMutationExcludedAcrossFiles: false;
    abaExcluded: false;
  }>;
  audit: typeof SUCCESS_OPERATION_OBSERVATION;
  dataHandling: typeof DATA_HANDLING_BOUNDARY;
  admissionEffect: typeof ADMISSION_EFFECT;
  authorityBoundary: typeof AUTHORITY_BOUNDARY;
  projectReleaseGovernanceContext: typeof PROJECT_RELEASE_GOVERNANCE_CONTEXT;
  digests: Readonly<{
    algorithm: "SHA-256";
    canonicalizationProfile: typeof ZIWEI_CIVIL_TIME_CANONICALIZATION_PROFILE;
    inputSha256: string;
    requestSha256: string;
    parentSlotTableSha256: string;
    resolutionSha256: string;
    candidateSha256: string;
    digestIsDigitalSignature: false;
  }>;
}>;

export type ZiweiCivilTimeResolutionResult =
  | ZiweiCivilTimeFailedClosed
  | ZiweiCivilTimeResolutionCandidate;

export type ZiweiCivilTimeRedactedSummary = Readonly<{
  schemaVersion: "hakimi.ziwei-civil-time-resolution-redacted-summary/0.1-draft";
  outcome: "resolved_candidate";
  classification: "ziwei_civil_time_to_shichen_engineering_only";
  genuineProcessLocalCandidate: true;
  redactedFields: typeof REDACTED_FIELDS;
  containsExactOrDerivedBirthValues: false;
  containsPersonDerivedDigest: false;
  safeToLog: false;
  safeToPersist: false;
  safeToPublish: false;
  activeAdmissionEffect: "none";
  inputAcceptanceReceiptIssued: false;
  factReceiptIssued: false;
  contentTruthEstablished: false;
  expertTruthEstablished: false;
  rightsLegalConclusionEstablished: false;
  releaseReady: false;
  publicDeploymentAuthorized: false;
}>;

const RESOLUTION_CANDIDATES = new WeakSet<object>();

class ResolutionBoundaryError extends Error {
  readonly code: ZiweiCivilTimeFailureCode;
  readonly stage: ZiweiCivilTimeFailureStage;

  constructor(code: ZiweiCivilTimeFailureCode, stage: ZiweiCivilTimeFailureStage) {
    super(code);
    this.name = "ResolutionBoundaryError";
    this.code = code;
    this.stage = stage;
  }
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (typeof value !== "object" || value === null || seen.has(value)) return value;
  seen.add(value);
  for (const descriptor of objectValues(objectGetOwnPropertyDescriptors(value))) {
    if ("value" in descriptor) deepFreeze(descriptor.value, seen);
  }
  return objectFreeze(value);
}

function failedClosed(
  code: ZiweiCivilTimeFailureCode,
  stage: ZiweiCivilTimeFailureStage
): ZiweiCivilTimeFailedClosed {
  return deepFreeze({
    schemaVersion: ZIWEI_CIVIL_TIME_RESOLUTION_SCHEMA_VERSION,
    adapterVersion: ZIWEI_CIVIL_TIME_RESOLUTION_ADAPTER_VERSION,
    outcome: "failed_closed" as const,
    classification: "ziwei_civil_time_to_shichen_engineering_only" as const,
    code,
    stage,
    partialResolutionReturned: false as const,
    civilResolution: null,
    shichenResolution: null,
    lateZiBoundary: null,
    audit: FAILED_OPERATION_OBSERVATION,
    dataHandling: DATA_HANDLING_BOUNDARY,
    admissionEffect: ADMISSION_EFFECT,
    authorityBoundary: AUTHORITY_BOUNDARY,
    projectReleaseGovernanceContext: PROJECT_RELEASE_GOVERNANCE_CONTEXT
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
      throw new ResolutionBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
    }
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      throw new ResolutionBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
    }
    return value;
  }
  if (typeof value !== "object" || depth > MAX_CAPTURE_DEPTH || arrayIsArray(value)) {
    throw new ResolutionBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
  }
  if (state.seen.has(value)) {
    throw new ResolutionBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
  }
  state.seen.add(value);
  state.objectCount += 1;
  if (state.objectCount > MAX_CAPTURE_OBJECTS) {
    throw new ResolutionBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
  }

  if (objectGetPrototypeOf(value) !== plainObjectPrototype || objectGetOwnPropertySymbols(value).length !== 0) {
    throw new ResolutionBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
  }
  const descriptors = objectGetOwnPropertyDescriptors(value);
  const keys = objectKeys(descriptors);
  state.keyCount += keys.length;
  if (state.keyCount > MAX_CAPTURE_KEYS) {
    throw new ResolutionBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
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
      throw new ResolutionBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
    }
    snapshot[key] = captureStrictPlainData(descriptor.value, state, depth + 1);
  }
  return snapshot;
}

function requireRecord(value: CapturedJson | undefined): { [key: string]: CapturedJson } {
  if (value === undefined || value === null || typeof value !== "object" || arrayIsArray(value)) {
    throw new ResolutionBoundaryError("INVALID_INPUT", "input_contract");
  }
  return value;
}

function hasExactKeys(value: { [key: string]: CapturedJson }, expected: readonly string[]): boolean {
  const actual = objectKeys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length && actual.every((key, index) => key === sortedExpected[index]);
}

function requireString(value: CapturedJson | undefined, maxLength: number): string {
  if (typeof value !== "string" || value.length > maxLength) {
    throw new ResolutionBoundaryError("INVALID_INPUT", "input_contract");
  }
  return value;
}

function requireFiniteNumber(value: CapturedJson | undefined, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new ResolutionBoundaryError("INVALID_INPUT", "input_contract");
  }
  return value;
}

function parseRequest(snapshot: CapturedJson): ZiweiCivilTimeResolutionRequest {
  const record = requireRecord(snapshot);
  if (!hasExactKeys(record, [
    "calendarInput",
    "dstDisambiguation",
    "localTime",
    "location",
    "protocolVersion",
    "solarTimeAdjustment",
    "systemId",
    "timePrecision",
    "timeZone",
    "tzdbSnapshotId",
    "uncertainty"
  ])) {
    throw new ResolutionBoundaryError("INVALID_INPUT", "input_contract");
  }

  const calendar = requireRecord(record.calendarInput);
  const location = requireRecord(record.location);
  if (!hasExactKeys(calendar, ["calendar", "date"]) ||
      !hasExactKeys(location, ["label", "latitude", "longitude", "precision"])) {
    throw new ResolutionBoundaryError("INVALID_INPUT", "input_contract");
  }

  const protocolVersion = requireString(record.protocolVersion, 120);
  const systemId = requireString(record.systemId, 80);
  const calendarKind = requireString(calendar.calendar, 40);
  const date = requireString(calendar.date, 10);
  const localTime = requireString(record.localTime, 5);
  const timePrecision = requireString(record.timePrecision, 40);
  const uncertainty = requireString(record.uncertainty, 40);
  const timeZone = requireString(record.timeZone, 120);
  const dstDisambiguation = requireString(record.dstDisambiguation, 20);
  const precision = requireString(location.precision, 40);
  const label = requireString(location.label, 120);
  const latitude = requireFiniteNumber(location.latitude, -90, 90);
  const longitude = requireFiniteNumber(location.longitude, -180, 180);
  const solarTimeAdjustment = requireString(record.solarTimeAdjustment, 40);
  const tzdbSnapshotId = requireString(record.tzdbSnapshotId, 500);

  if (
    protocolVersion !== ZIWEI_CIVIL_TIME_RESOLUTION_PROTOCOL_VERSION ||
    systemId !== ZIWEI_CIVIL_TIME_EXPECTED_PARENT_SYSTEM_ID ||
    calendarKind !== "gregorian" ||
    timePrecision !== "exact_minute" ||
    uncertainty !== "exact" ||
    !/^(?:UTC|[A-Za-z_+-]+(?:\/[A-Za-z0-9_+.-]+)+)$/u.test(timeZone) ||
    !(["reject", "earlier", "later"] as const).includes(dstDisambiguation as DstDisambiguation) ||
    precision !== "coordinates" ||
    reflectApply(stringTrim, label, []) !== label ||
    solarTimeAdjustment !== "none" ||
    tzdbSnapshotId.length === 0
  ) {
    throw new ResolutionBoundaryError("INVALID_INPUT", "input_contract");
  }

  return {
    protocolVersion: ZIWEI_CIVIL_TIME_RESOLUTION_PROTOCOL_VERSION,
    systemId: ZIWEI_CIVIL_TIME_EXPECTED_PARENT_SYSTEM_ID,
    calendarInput: { calendar: "gregorian", date },
    localTime,
    timePrecision: "exact_minute",
    uncertainty: "exact",
    timeZone,
    dstDisambiguation: dstDisambiguation as DstDisambiguation,
    location: { precision: "coordinates", label, latitude, longitude },
    solarTimeAdjustment: "none",
    tzdbSnapshotId
  };
}

function captureRequest(rawRequest: unknown): ZiweiCivilTimeResolutionRequest {
  try {
    const snapshot = captureStrictPlainData(rawRequest, {
      seen: new WeakSet<object>(),
      objectCount: 0,
      keyCount: 0,
      stringCodeUnits: 0
    }, 0);
    return parseRequest(snapshot);
  } catch (error) {
    if (error instanceof ResolutionBoundaryError) throw error;
    throw new ResolutionBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
  }
}

function parseGregorianWallTime(input: ZiweiCivilTimeResolutionRequest): {
  localEpochMilliseconds: number;
  hour: number;
  minute: number;
  localMinuteOfDay: number;
} {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(input.calendarInput.date);
  const timeMatch = /^(\d{2}):(\d{2})$/u.exec(input.localTime);
  if (!dateMatch || !timeMatch) {
    throw new ResolutionBoundaryError("INVALID_GREGORIAN_WALL_TIME", "gregorian_projection");
  }
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new ResolutionBoundaryError("INVALID_GREGORIAN_WALL_TIME", "gregorian_projection");
  }
  const localEpochMilliseconds = dateUtc(year, month - 1, day, hour, minute, 0, 0);
  const projected = new NativeDate(localEpochMilliseconds);
  if (
    !Number.isSafeInteger(localEpochMilliseconds) ||
    reflectApply(getUtcFullYear, projected, []) !== year ||
    reflectApply(getUtcMonth, projected, []) !== month - 1 ||
    reflectApply(getUtcDate, projected, []) !== day ||
    reflectApply(getUtcHours, projected, []) !== hour ||
    reflectApply(getUtcMinutes, projected, []) !== minute ||
    reflectApply(getUtcSeconds, projected, []) !== 0
  ) {
    throw new ResolutionBoundaryError("INVALID_GREGORIAN_WALL_TIME", "gregorian_projection");
  }
  return { localEpochMilliseconds, hour, minute, localMinuteOfDay: hour * 60 + minute };
}

function captureParentSlotTable(): readonly ParentSlot[] {
  try {
    requireCurrentParentContractIdentity();
    if (!arrayIsArray(ZIWEI_SHICHEN_SLOTS) || ZIWEI_SHICHEN_SLOTS.length !== EXPECTED_SLOT_TABLE.length) {
      throw new ResolutionBoundaryError("PARENT_SLOT_TABLE_DRIFT", "parent_contract_binding");
    }
    const captured = EXPECTED_SLOT_TABLE.map((expected, position) => {
      const candidate = ZIWEI_SHICHEN_SLOTS[position] as unknown;
      if (candidate === null || typeof candidate !== "object" || arrayIsArray(candidate) ||
          objectGetPrototypeOf(candidate) !== plainObjectPrototype || objectGetOwnPropertySymbols(candidate).length !== 0) {
        throw new ResolutionBoundaryError("PARENT_SLOT_TABLE_DRIFT", "parent_contract_binding");
      }
      const descriptors = objectGetOwnPropertyDescriptors(candidate);
      const keys = objectKeys(descriptors).sort();
      if (keys.length !== 3 || keys[0] !== "branchId" || keys[1] !== "civilRange" || keys[2] !== "index") {
        throw new ResolutionBoundaryError("PARENT_SLOT_TABLE_DRIFT", "parent_contract_binding");
      }
      const values = Object.fromEntries(keys.map((key) => {
        const descriptor = descriptors[key];
        if (descriptor === undefined || descriptor.enumerable !== true || !("value" in descriptor)) {
          throw new ResolutionBoundaryError("PARENT_SLOT_TABLE_DRIFT", "parent_contract_binding");
        }
        return [key, descriptor.value];
      })) as Record<string, unknown>;
      if (values.index !== expected.index || values.branchId !== expected.branchId || values.civilRange !== expected.civilRange) {
        throw new ResolutionBoundaryError("PARENT_SLOT_TABLE_DRIFT", "parent_contract_binding");
      }
      return {
        index: expected.index,
        branchId: expected.branchId,
        civilRange: expected.civilRange,
        startMinute: expected.startMinute,
        endMinute: expected.endMinute
      };
    });
    return deepFreeze(captured);
  } catch (error) {
    if (error instanceof ResolutionBoundaryError) throw error;
    throw new ResolutionBoundaryError("PARENT_SLOT_TABLE_DRIFT", "parent_contract_binding");
  }
}

export function isExpectedZiweiCivilTimeParentContractIdentity(
  contractVersion: unknown,
  systemId: unknown
): boolean {
  return contractVersion === ZIWEI_CIVIL_TIME_EXPECTED_PARENT_CONTRACT_VERSION &&
    systemId === ZIWEI_CIVIL_TIME_EXPECTED_PARENT_SYSTEM_ID;
}

function requireCurrentParentContractIdentity(): void {
  try {
    const identityMatches = isExpectedZiweiCivilTimeParentContractIdentity(
      ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
      ZIWEI_DOUSHU_SYSTEM_ID
    );
    const parentProbe = {
      contractVersion: ZIWEI_CIVIL_TIME_EXPECTED_PARENT_CONTRACT_VERSION,
      systemId: ZIWEI_CIVIL_TIME_EXPECTED_PARENT_SYSTEM_ID,
      calendarInput: { calendar: "gregorian", date: "2000-01-01" },
      shichenIndex: 0,
      sexForCalculation: "male",
      solarTimeAdjustment: "none",
      civilContext: {
        usedForCalculation: false,
        localTime: null,
        timeZone: null,
        location: { precision: "unknown", label: "", latitude: null, longitude: null }
      },
      birthSourceRef: "probe.parent.contract",
      sourceNote: ""
    };
    const currentShapeAccepted = ziweiBirthInputDraftSchema.safeParse(parentProbe).success;
    const usedForCalculationTrueRejected = !ziweiBirthInputDraftSchema.safeParse({
      ...parentProbe,
      civilContext: { ...parentProbe.civilContext, usedForCalculation: true }
    }).success;
    if (identityMatches && currentShapeAccepted && usedForCalculationTrueRejected) return;
  } catch {
    // Normalize parent schema/probe failures to one fail-closed identity boundary.
  }
  throw new ResolutionBoundaryError("PARENT_CONTRACT_IDENTITY_DRIFT", "parent_contract_binding");
}

function projectParentSlotTableIdentity(slotTable: readonly ParentSlot[]): readonly Readonly<{
  index: number;
  branchId: string;
  civilRange: string;
}>[] {
  return slotTable.map((slot) => ({
    index: slot.index,
    branchId: slot.branchId,
    civilRange: slot.civilRange
  }));
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new ResolutionBoundaryError("INTERNAL_FAILURE", "candidate_construction");
    return Object.is(value, -0) ? "0" : JSON.stringify(value);
  }
  if (arrayIsArray(value)) return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    return `{${objectKeys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  throw new ResolutionBoundaryError("INTERNAL_FAILURE", "candidate_construction");
}

function sha256(domain: string, value: unknown): string {
  return createHash("sha256")
    .update(domain, "utf8")
    .update("\0", "utf8")
    .update(canonicalJson(value), "utf8")
    .digest("hex");
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
    supportedRange: { from: snapshot.supportedRange.from, to: snapshot.supportedRange.to },
    descriptorSha256RecomputedFromAllLoadedZoneAndLinkBytes: false
  };
}

/** Captures a detached, deeply frozen descriptor for pre/post continuity checks. */
export function captureZiweiCivilTimeTzdbBinding(
  snapshot: RegisteredTimeZoneDatabaseSnapshot
): ZiweiCivilTimeTzdbBinding {
  return deepFreeze(snapshotBinding(snapshot));
}

/** Exact descriptor equality only; it is not interval or ABA proof. */
export function areZiweiCivilTimeTzdbBindingsEqual(
  left: ZiweiCivilTimeTzdbBinding,
  right: ZiweiCivilTimeTzdbBinding
): boolean {
  return canonicalJson(left) === canonicalJson(right);
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
    throw new ResolutionBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
  }
  const sorted = [...candidates].sort((left, right) => left.epochMilliseconds - right.epochMilliseconds);
  if (sorted.some((candidate, index) => candidate !== candidates[index])) {
    throw new ResolutionBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
  }
  for (const candidate of candidates) {
    const projection = resolver.projectEpochMilliseconds(candidate.epochMilliseconds, timeZone);
    if (
      projection.epochMilliseconds !== candidate.epochMilliseconds ||
      projection.localEpochMilliseconds !== candidate.localEpochMilliseconds ||
      projection.offsetSeconds !== candidate.offsetSeconds
    ) {
      throw new ResolutionBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
    }
  }
  if (resolution.kind === "unique") {
    if (candidates.length !== 1 || !candidates[0]?.matchesRequestedLocalTime || candidates[0].localEpochMilliseconds !== requestedLocal) {
      throw new ResolutionBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
    }
    return;
  }
  if (resolution.kind === "overlap") {
    if (candidates.length !== 2 || candidates[0]?.epochMilliseconds === candidates[1]?.epochMilliseconds ||
        candidates.some((candidate) => !candidate.matchesRequestedLocalTime || candidate.localEpochMilliseconds !== requestedLocal)) {
      throw new ResolutionBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
    }
    return;
  }
  if (resolution.kind === "gap") {
    if (candidates.length !== 2 || candidates.some((candidate) => candidate.matchesRequestedLocalTime)) {
      throw new ResolutionBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
    }
    return;
  }
  throw new ResolutionBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
}

function chooseCandidate(
  resolution: BundledLocalResolution,
  policy: DstDisambiguation
): { candidate: BundledZoneCandidate; decision: ResolutionDecision } {
  if (resolution.kind === "gap") {
    throw new ResolutionBoundaryError("DST_GAP_REJECTED", "dst_policy");
  }
  if (resolution.kind === "unique") {
    return { candidate: resolution.candidates[0]!, decision: "unique" };
  }
  if (policy === "reject") {
    throw new ResolutionBoundaryError("DST_OVERLAP_REJECTED", "dst_policy");
  }
  const sorted = [...resolution.candidates].sort((left, right) => left.epochMilliseconds - right.epochMilliseconds);
  return policy === "earlier"
    ? { candidate: sorted[0]!, decision: "earlier" }
    : { candidate: sorted[sorted.length - 1]!, decision: "later" };
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
    throw new ResolutionBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
  }
}

function deriveShichen(slotTable: readonly ParentSlot[], localMinuteOfDay: number): ParentSlot {
  const matches = slotTable.filter((slot) => localMinuteOfDay >= slot.startMinute && localMinuteOfDay < slot.endMinute);
  if (matches.length !== 1) {
    throw new ResolutionBoundaryError("SHICHEN_PARTITION_FAILED", "shichen_partition");
  }
  return matches[0]!;
}

function mapError(error: unknown): ZiweiCivilTimeFailedClosed {
  if (error instanceof ResolutionBoundaryError) return failedClosed(error.code, error.stage);
  if (error instanceof TzdbArtifactError) {
    if (error.code === "TZDB_ARTIFACT_UNAVAILABLE") return failedClosed("TZDB_ARTIFACT_UNAVAILABLE", "tzdb_load");
    if (error.code === "TZDB_UNKNOWN_ZONE") return failedClosed("TZDB_UNKNOWN_ZONE", "tzdb_resolution");
    if (error.code === "TZDB_ARTIFACT_MISMATCH") return failedClosed("TZDB_ARTIFACT_DRIFT", "tzdb_load");
    return failedClosed("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
  }
  return failedClosed("INTERNAL_FAILURE", "tzdb_resolution");
}

/**
 * Resolves an exact Gregorian civil minute against one explicitly selected tzdb
 * snapshot, then projects only the frozen parent-contract shichen partition.
 * It never creates the current ZiweiBirthInputDraft or invokes a chart engine.
 */
export async function resolveZiweiCivilTimeInputDraft(
  rawRequest: unknown
): Promise<ZiweiCivilTimeResolutionResult> {
  let request: ZiweiCivilTimeResolutionRequest;
  let wallTime: ReturnType<typeof parseGregorianWallTime>;
  let preLoadTzdbBinding: TzdbBinding;
  let parentSlotTable: readonly ParentSlot[];

  try {
    requireCurrentParentContractIdentity();
    request = captureRequest(rawRequest);
    wallTime = parseGregorianWallTime(request);
    parentSlotTable = captureParentSlotTable();
    const snapshot = getBundledTzdbArtifactSnapshot(request.tzdbSnapshotId);
    if (snapshot === null) return failedClosed("TZDB_ARTIFACT_UNAVAILABLE", "tzdb_load");
    if (request.calendarInput.date < snapshot.supportedRange.from || request.calendarInput.date > snapshot.supportedRange.to) {
      return failedClosed("INVALID_GREGORIAN_WALL_TIME", "gregorian_projection");
    }
    preLoadTzdbBinding = captureZiweiCivilTimeTzdbBinding(snapshot);
  } catch (error) {
    return mapError(error);
  }

  try {
    const resolver = await loadBundledTzdbResolver(request.tzdbSnapshotId);
    const postLoadRegistrySnapshot = getBundledTzdbArtifactSnapshot(request.tzdbSnapshotId);
    const postLoadParentSlotTable = captureParentSlotTable();
    if (
      postLoadRegistrySnapshot === null ||
      !areZiweiCivilTimeTzdbBindingsEqual(
        preLoadTzdbBinding,
        captureZiweiCivilTimeTzdbBinding(postLoadRegistrySnapshot)
      ) ||
      !areZiweiCivilTimeTzdbBindingsEqual(
        preLoadTzdbBinding,
        captureZiweiCivilTimeTzdbBinding(resolver.snapshot)
      )
    ) {
      return failedClosed("TZDB_ARTIFACT_DRIFT", "tzdb_load");
    }
    if (canonicalJson(parentSlotTable) !== canonicalJson(postLoadParentSlotTable)) {
      return failedClosed("PARENT_SLOT_TABLE_DRIFT", "parent_contract_binding");
    }
    parentSlotTable = postLoadParentSlotTable;
    if (!resolver.isTimeZoneName(request.timeZone)) {
      return failedClosed("TZDB_UNKNOWN_ZONE", "tzdb_resolution");
    }

    const resolution = resolver.resolveLocalEpochMilliseconds(wallTime.localEpochMilliseconds, request.timeZone);
    assertResolutionShape(resolution, wallTime.localEpochMilliseconds, resolver, request.timeZone);
    const chosen = chooseCandidate(resolution, request.dstDisambiguation);
    assertChosenRoundTrip(resolver, chosen.candidate, request.timeZone, wallTime.localEpochMilliseconds);
    const slot = deriveShichen(parentSlotTable, wallTime.localMinuteOfDay);
    const normalizedOffsetSeconds = Object.is(chosen.candidate.offsetSeconds, -0) ? 0 : chosen.candidate.offsetSeconds;

    const inputProjection = {
      protocolVersion: request.protocolVersion,
      systemId: request.systemId,
      calendarInput: request.calendarInput,
      localTime: request.localTime,
      timePrecision: request.timePrecision,
      uncertainty: request.uncertainty,
      timeZone: request.timeZone,
      dstDisambiguation: request.dstDisambiguation,
      location: request.location,
      solarTimeAdjustment: request.solarTimeAdjustment
    };
    const inputSha256 = sha256("hakimi/ziwei-civil-time-input-resolution-draft/input/v1", inputProjection);
    const requestSha256 = sha256("hakimi/ziwei-civil-time-input-resolution-draft/request/v1", request);
    const parentSlotTableSha256 = sha256(
      "hakimi/ziwei-civil-time-input-resolution-draft/parent-slot-table/v1",
      projectParentSlotTableIdentity(parentSlotTable)
    );
    const tzdbBinding = preLoadTzdbBinding;
    const resolutionProjection = {
      inputSha256,
      requestSha256,
      parentContractVersion: ZIWEI_CIVIL_TIME_EXPECTED_PARENT_CONTRACT_VERSION,
      parentSlotTableSha256,
      tzdbBinding,
      localEpochMilliseconds: wallTime.localEpochMilliseconds,
      epochMilliseconds: chosen.candidate.epochMilliseconds,
      utcOffsetSeconds: normalizedOffsetSeconds,
      kind: resolution.kind,
      decision: chosen.decision,
      shichen: {
        index: slot.index,
        branchId: slot.branchId,
        civilRange: slot.civilRange
      },
      lateZiDayPolicyApplied: false,
      effectiveCalculationDate: null
    };
    const resolutionSha256 = sha256(
      "hakimi/ziwei-civil-time-input-resolution-draft/resolution/v1",
      resolutionProjection
    );

    const candidateWithoutFinalDigest = {
      schemaVersion: ZIWEI_CIVIL_TIME_RESOLUTION_SCHEMA_VERSION,
      adapterVersion: ZIWEI_CIVIL_TIME_RESOLUTION_ADAPTER_VERSION,
      outcome: "resolved_candidate" as const,
      classification: "ziwei_civil_time_to_shichen_engineering_only" as const,
      formalAdmissionStatus: "not_admitted_draft_candidate" as const,
      inputBinding: {
        parentContractVersion: ZIWEI_CIVIL_TIME_EXPECTED_PARENT_CONTRACT_VERSION,
        systemId: ZIWEI_CIVIL_TIME_EXPECTED_PARENT_SYSTEM_ID,
        calendar: "gregorian" as const,
        inputSha256,
        requestSha256
      },
      civilTime: {
        date: request.calendarInput.date,
        localTime: request.localTime,
        timePrecision: "exact_minute" as const,
        uncertainty: "exact" as const,
        timeZone: request.timeZone,
        requestedDstDisambiguation: request.dstDisambiguation,
        solarTimeAdjustment: "none" as const,
        coordinatesUsedForTimeZoneInference: false as const,
        coordinatesUsedForShichenPartition: false as const,
        canonicalZoneIdentityEstablished: false as const
      },
      location: {
        precision: "coordinates" as const,
        label: request.location.label,
        latitudeDegrees: request.location.latitude,
        longitudeDegrees: request.location.longitude,
        coordinateModel: "declared_coordinates_no_geocoding" as const,
        latitudeSignConvention: "north_positive" as const,
        longitudeSignConvention: "east_positive" as const
      },
      tzdbBinding,
      civilResolution: {
        kind: resolution.kind as "unique" | "overlap",
        decision: chosen.decision,
        localEpochMilliseconds: wallTime.localEpochMilliseconds,
        epochMilliseconds: chosen.candidate.epochMilliseconds,
        utcInstant: reflectApply(dateToISOString, new NativeDate(chosen.candidate.epochMilliseconds), []),
        utcOffsetSeconds: normalizedOffsetSeconds,
        utcOffsetSignConvention: "east_positive" as const,
        requestedLocalTimeRoundTripVerified: true as const
      },
      shichenResolution: {
        index: slot.index,
        branchId: slot.branchId,
        civilRange: slot.civilRange,
        localMinuteOfDay: wallTime.localMinuteOfDay,
        parentSlotCount: 13 as const,
        parentSlotTableSha256,
        derivedOnlyFromFrozenWallClockPartition: true as const,
        timeZoneChangesSlotPartition: false as const,
        solarTimeApplied: false as const
      },
      lateZiBoundary: {
        isEarlyZiSlot: slot.index === 0,
        isLateZiSlot: slot.index === 12,
        observedCivilDate: request.calendarInput.date,
        lateZiDayPolicyApplied: false as const,
        effectiveCalculationDate: null,
        requiredDownstreamRuleField: slot.index === 12 ? "rules.lateZiDay" as const : null
      },
      parentCompatibility: {
        currentParentContractVersion: ZIWEI_CIVIL_TIME_EXPECTED_PARENT_CONTRACT_VERSION,
        currentContractCivilContextUsedForCalculationLockedFalse: true as const,
        currentZiweiBirthInputIssued: false as const,
        currentAdapterInvocationAuthorized: false as const,
        parentContractSuccessorRequiredBeforeEngineConsumption: true as const
      },
      observationBoundary: {
        rawRequestReadAfterPreAwaitSnapshot: false as const,
        parentSlotTableReobservedAfterTzdbLoad: true as const,
        tzdbRegistryDescriptorReobservedAfterLoad: true as const,
        sameHeldBufferHashAndParse: false as const,
        rawByteIdentityEstablished: false as const,
        duplicateJsonKeyExclusionEstablished: false as const,
        transparentProxyExcluded: false as const,
        completeSameRealmPrimordialPoisoningExcluded: false as const,
        crossFileAtomicSnapshot: false as const,
        intervalMutationExcludedAcrossFiles: false as const,
        abaExcluded: false as const
      },
      audit: SUCCESS_OPERATION_OBSERVATION,
      dataHandling: DATA_HANDLING_BOUNDARY,
      admissionEffect: ADMISSION_EFFECT,
      authorityBoundary: AUTHORITY_BOUNDARY,
      projectReleaseGovernanceContext: PROJECT_RELEASE_GOVERNANCE_CONTEXT,
      digests: {
        algorithm: "SHA-256" as const,
        canonicalizationProfile: ZIWEI_CIVIL_TIME_CANONICALIZATION_PROFILE,
        inputSha256,
        requestSha256,
        parentSlotTableSha256,
        resolutionSha256,
        digestIsDigitalSignature: false as const
      }
    };
    const candidateSha256 = sha256(
      "hakimi/ziwei-civil-time-input-resolution-draft/candidate/v1",
      candidateWithoutFinalDigest
    );
    const candidate = deepFreeze({
      ...candidateWithoutFinalDigest,
      digests: { ...candidateWithoutFinalDigest.digests, candidateSha256 }
    }) as ZiweiCivilTimeResolutionCandidate;
    RESOLUTION_CANDIDATES.add(candidate);
    return candidate;
  } catch (error) {
    return mapError(error);
  }
}

/** Process-local provenance check; a copied digest cannot create this brand. */
export function isZiweiCivilTimeResolutionCandidate(
  value: unknown
): value is ZiweiCivilTimeResolutionCandidate {
  return typeof value === "object" && value !== null && RESOLUTION_CANDIDATES.has(value);
}

/**
 * Returns only a generic, still non-authoritative status. Exact and derived birth
 * values, including all digests, are deliberately omitted.
 */
export function projectZiweiCivilTimeRedactedSummary(
  value: unknown
): ZiweiCivilTimeRedactedSummary | null {
  if (!isZiweiCivilTimeResolutionCandidate(value)) return null;
  return deepFreeze({
    schemaVersion: "hakimi.ziwei-civil-time-resolution-redacted-summary/0.1-draft" as const,
    outcome: "resolved_candidate" as const,
    classification: "ziwei_civil_time_to_shichen_engineering_only" as const,
    genuineProcessLocalCandidate: true as const,
    redactedFields: REDACTED_FIELDS,
    containsExactOrDerivedBirthValues: false as const,
    containsPersonDerivedDigest: false as const,
    safeToLog: false as const,
    safeToPersist: false as const,
    safeToPublish: false as const,
    activeAdmissionEffect: "none" as const,
    inputAcceptanceReceiptIssued: false as const,
    factReceiptIssued: false as const,
    contentTruthEstablished: false as const,
    expertTruthEstablished: false as const,
    rightsLegalConclusionEstablished: false as const,
    releaseReady: false as const,
    publicDeploymentAuthorized: false as const
  });
}
