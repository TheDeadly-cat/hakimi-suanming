import { createHash } from "node:crypto";
import {
  BUNDLED_TZDB_SNAPSHOT_ID,
  TzdbArtifactError,
  getBundledTzdbArtifactSnapshot,
  loadBundledTzdbResolver,
  type BundledLocalResolution,
  type BundledTzdbResolver,
  type BundledZoneCandidate,
  type RegisteredTimeZoneDatabaseSnapshot
} from "@hakimi/tzdb-core";

export const VEDIC_CIVIL_TIME_RESOLUTION_ADAPTER_VERSION = "0.1.0-draft.0" as const;
export const VEDIC_CIVIL_TIME_INPUT_PROJECTION_VERSION =
  "hakimi.vedic-civil-time-resolution-input-projection/0.1-draft" as const;
export const VEDIC_CIVIL_TIME_RESOLUTION_CANDIDATE_SCHEMA_VERSION =
  "hakimi.vedic-civil-time-resolution-candidate/0.1-draft" as const;
export const VEDIC_CIVIL_TIME_CANONICALIZATION_PROFILE =
  "hakimi.vedic.sorted-key-json.finite-number.v1" as const;
export const VEDIC_PROLEPTIC_GREGORIAN_VERSION =
  "hakimi.vedic.proleptic-gregorian/0.1-draft" as const;
export const VEDIC_EXACT_WALL_TIME_PRECISION_VERSION =
  "hakimi.vedic.exact-wall-time/0.1-draft" as const;
export const VEDIC_EXACT_UNCERTAINTY_MODEL_ID =
  "hakimi.vedic.birth-time-uncertainty.exact" as const;
export const VEDIC_EXACT_UNCERTAINTY_MODEL_VERSION = "0.1-draft" as const;
export const VEDIC_DST_OVERLAP_POLICY_VERSION =
  "hakimi.vedic.dst-overlap-policy/0.1-draft" as const;
export const VEDIC_CIVIL_TIME_FIXED_TZDB_SNAPSHOT_ID = BUNDLED_TZDB_SNAPSHOT_ID;

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
const objectFreeze = Object.freeze;
const objectGetOwnPropertyDescriptors = Object.getOwnPropertyDescriptors;
const objectGetOwnPropertySymbols = Object.getOwnPropertySymbols;
const objectGetPrototypeOf = Object.getPrototypeOf;
const objectIs = Object.is;
const objectKeys = Object.keys;
const arrayIsArray = Array.isArray;
const arrayPrototype = Array.prototype;
const plainObjectPrototype = Object.prototype;
const arraySort = Array.prototype.sort;
const arrayJoin = Array.prototype.join;
const jsonStringify = JSON.stringify;
const numberIsFinite = Number.isFinite;
const numberIsInteger = Number.isInteger;
const numberIsSafeInteger = Number.isSafeInteger;
const reflectApply = Reflect.apply;
const regexpExec = RegExp.prototype.exec;
const weakSetAdd = WeakSet.prototype.add;
const weakSetHas = WeakSet.prototype.has;

const MAX_CAPTURE_DEPTH = 8;
const MAX_CAPTURE_OBJECTS = 24;
const MAX_CAPTURE_KEYS = 128;
const MAX_CAPTURE_ARRAY_ITEMS = 8;
const MAX_CAPTURE_STRING_CODE_UNITS = 12_000;

type JsonScalar = null | boolean | number | string;
type CapturedJson = JsonScalar | CapturedJson[] | { [key: string]: CapturedJson };
type PlainRecord = { [key: string]: CapturedJson };

export type VedicDstAmbiguityPolicyId =
  | "vedic_adapter_draft_reject"
  | "vedic_adapter_draft_earlier"
  | "vedic_adapter_draft_later";

export type VedicCivilTimeResolutionFailureCode =
  | "INVALID_REQUEST_SHAPE"
  | "INVALID_INPUT_PROJECTION"
  | "INVALID_GREGORIAN_WALL_TIME"
  | "UNSUPPORTED_UNCERTAINTY_PROFILE"
  | "TZDB_SNAPSHOT_MISMATCH"
  | "TZDB_ARTIFACT_UNAVAILABLE"
  | "TZDB_ARTIFACT_DRIFT"
  | "TZDB_SUPPORTED_RANGE_REJECTED"
  | "TZDB_UNKNOWN_ZONE"
  | "TZDB_RESOLUTION_INVARIANT_FAILED"
  | "DECLARATION_MISMATCH"
  | "DST_GAP_REJECTED"
  | "DST_OVERLAP_REJECTED"
  | "INTERNAL_FAILURE";

export type VedicCivilTimeResolutionFailureStage =
  | "boundary_snapshot"
  | "input_projection"
  | "gregorian_projection"
  | "tzdb_load"
  | "supported_range"
  | "tzdb_resolution"
  | "declaration_check"
  | "dst_policy"
  | "candidate_construction";

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

type OperationAbsence = Readonly<{
  hostIntlUsed: false;
  hostTimeZoneDatabaseUsed: false;
  hostTimeZoneFallbackUsed: false;
  networkReadPerformed: false;
  networkTransmissionPerformed: false;
  userDataStorageReadPerformed: false;
  applicationDataStoreReadPerformed: false;
  persistencePerformed: false;
  geocodingPerformed: false;
  mutationPerformed: false;
  mutationEpochAvailable: false;
  mutationEpoch: null;
  mutationEpochReceipt: null;
  mutationBoundary: "not_applicable_no_persistence";
  crossFileAtomicSnapshot: false;
  intervalMutationExcluded: false;
  abaExcluded: false;
  rawJsonBytesParsed: false;
  duplicateKeyExclusionEstablished: false;
  rawByteIdentityEstablished: false;
  transparentProxyExclusionEstablished: false;
  completePrimordialPoisoningIsolationEstablished: false;
}>;

type DataHandlingBoundary = Readonly<{
  containsPersonalData: true;
  containsPersonDerivedBirthData: true;
  personDerivedDigest: true;
  safeToLog: false;
  safeToPersist: false;
  safeToPublish: false;
  persistenceAuthorized: false;
  retentionAuthorized: false;
  networkTransmissionAuthorized: false;
}>;

type AuthorityBoundary = Readonly<{
  formalInputContractAdmitted: false;
  inputContractGateSatisfied: false;
  inputAcceptanceReceiptIssued: false;
  normalizationReceiptIssued: false;
  formalTimeResolutionReceiptIssued: false;
  factReceiptIssued: false;
  ruleReceiptIssued: false;
  successReceiptIssued: false;
  utcConversionAndTimeScaleRequirementSatisfied: false;
  leapSecondProvenanceEstablished: false;
  ut1ProvenanceEstablished: false;
  ttProvenanceEstablished: false;
  tdbProvenanceEstablished: false;
  eopProvenanceEstablished: false;
  astronomicalFactsEstablished: false;
  chartCalculated: false;
  contentTruthEstablished: false;
  expertTruthEstablished: false;
  sourceRightsEstablished: false;
  rightsLegalConclusionEstablished: false;
  domainAuthorityAuthorized: false;
  formalSystemAdmission: false;
  releaseEvidenceComplete: false;
  releaseReady: false;
  publicDeploymentAuthorized: false;
  publicReleaseAuthorized: false;
  expertClaimsAuthorized: false;
  highRiskClaimsAuthorized: false;
  baziAuthorityInherited: false;
  westernAuthorityInherited: false;
  legacyV13IdentityInherited: false;
  releaseIdentity: null;
  targetSchema: null;
  migrationId: null;
}>;

export type VedicCivilTimeResolutionFailedClosed = Readonly<{
  schemaVersion: typeof VEDIC_CIVIL_TIME_RESOLUTION_CANDIDATE_SCHEMA_VERSION;
  adapterVersion: typeof VEDIC_CIVIL_TIME_RESOLUTION_ADAPTER_VERSION;
  outcome: "failed_closed";
  classification: "vedic_civil_time_engineering_candidate_only";
  code: VedicCivilTimeResolutionFailureCode;
  stage: VedicCivilTimeResolutionFailureStage;
  partialResolutionReturned: false;
  audit: OperationAbsence;
  dataHandling: DataHandlingBoundary;
  authorityBoundary: AuthorityBoundary;
}>;

export type VedicCivilTimeResolutionCandidate = Readonly<{
  schemaVersion: typeof VEDIC_CIVIL_TIME_RESOLUTION_CANDIDATE_SCHEMA_VERSION;
  adapterVersion: typeof VEDIC_CIVIL_TIME_RESOLUTION_ADAPTER_VERSION;
  outcome: "resolved_candidate";
  classification: "vedic_civil_time_engineering_candidate_only";
  formalAdmissionStatus: "not_admitted_draft_candidate";
  systemIdentity: Readonly<{
    contractSystemId: "vedic";
    productSystemId: "vedic-astrology";
    baziAuthorityInherited: false;
    westernAuthorityInherited: false;
    legacyV13IdentityInherited: false;
    releaseIdentity: null;
    targetSchema: null;
    migrationId: null;
  }>;
  inputProjection: Readonly<{
    projectionVersion: typeof VEDIC_CIVIL_TIME_INPUT_PROJECTION_VERSION;
    referencedRequirementIds: readonly [
      "civil_calendar_and_date",
      "local_wall_time_and_precision",
      "birth_time_uncertainty_interval_or_candidates",
      "iana_time_zone_and_tzdb_identity",
      "dst_gap_overlap_resolution"
    ];
    notEvaluatedRequirementIds: readonly [
      "place_coordinates_and_precision",
      "utc_conversion_and_time_scale",
      "ephemeris_identity_version_and_coverage",
      "sidereal_zodiac_declaration",
      "ayanamsa_identity_and_version",
      "rahu_ketu_mode",
      "bhava_house_definition",
      "birth_time_perturbation_candidates_and_transition_points"
    ];
    exactSingleValueProfileOnly: true;
    completeVedicInputContractPresent: false;
    projectionIsFullVedicSchemaInstance: false;
    declarationIsFormalVedicSchemaInstance: false;
    digestCoversCompleteVedicInput: false;
    formalRequirementSelectionsEstablished: false;
    requirementsResolved: 0;
    dstDeclarationPresent: boolean;
    inputProjectionSha256: string;
    requestProjectionSha256: string;
  }>;
  civilDate: Readonly<{
    calendarId: "proleptic_gregorian";
    calendarVersion: typeof VEDIC_PROLEPTIC_GREGORIAN_VERSION;
    year: number;
    month: number;
    day: number;
    isoDate: string;
  }>;
  wallTime: Readonly<{
    wallTimeText: string;
    precisionId: "exact_minute" | "exact_second";
    precisionVersion: typeof VEDIC_EXACT_WALL_TIME_PRECISION_VERSION;
    normalizedSecond: number;
    fractionalSeconds: 0;
  }>;
  uncertainty: Readonly<{
    representation: "exact";
    modelId: typeof VEDIC_EXACT_UNCERTAINTY_MODEL_ID;
    modelVersion: typeof VEDIC_EXACT_UNCERTAINTY_MODEL_VERSION;
    intervalResolved: false;
    candidateSetResolved: false;
    perturbationResolved: false;
  }>;
  timeZone: Readonly<{
    requestedIanaTimeZoneId: string;
    canonicalIanaCaseIdentityEstablished: false;
    timeZoneDerivedFromCoordinates: false;
  }>;
  tzdbBinding: TzdbBinding;
  resolverScope: Readonly<{
    supportedRangeFrom: string;
    supportedRangeTo: string;
    nearbyOffsetSamplingRadiusHours: 48;
    maximumModeledLocalCandidates: 2;
    runtimeLoadedArtifactFullByteHashVerified: false;
    completeRuntimeSnapshotClosureEstablished: false;
    universalCivilTimeTruthEstablished: false;
  }>;
  resolution: Readonly<{
    kind: "unique" | "overlap";
    decision: "unique" | "vedic_adapter_draft_earlier" | "vedic_adapter_draft_later";
    requestedPolicyId: VedicDstAmbiguityPolicyId;
    policyVersion: typeof VEDIC_DST_OVERLAP_POLICY_VERSION;
    candidateOrderingSemantics: "utc_epoch_milliseconds_ascending";
    localEpochMilliseconds: number;
    epochMilliseconds: number;
    utcInstant: string;
    utcOffsetSeconds: number;
    utcOffsetSignConvention: "east_positive";
    requestedLocalTimeRoundTripVerified: true;
    utcOffsetRoundTripVerified: true;
    daylightSavingClassificationEstablished: false;
    utcConversionAndTimeScaleRequirementSatisfied: false;
  }>;
  excludedProducts: readonly [
    "full_vedic_input_acceptance",
    "normalization_receipt",
    "formal_time_resolution_receipt",
    "utc_conversion_and_time_scale_contract",
    "leap_seconds",
    "UT1",
    "TT",
    "TDB",
    "EOP",
    "ephemeris",
    "chart",
    "astrological_content"
  ];
  audit: OperationAbsence;
  dataHandling: DataHandlingBoundary;
  authorityBoundary: AuthorityBoundary;
  digests: Readonly<{
    algorithm: "SHA-256";
    canonicalizationProfile: typeof VEDIC_CIVIL_TIME_CANONICALIZATION_PROFILE;
    inputProjectionSha256: string;
    requestProjectionSha256: string;
    resolutionSha256: string;
    candidateSha256: string;
    digestIsDigitalSignature: false;
  }>;
}>;

export type VedicCivilTimeResolutionResult =
  | VedicCivilTimeResolutionCandidate
  | VedicCivilTimeResolutionFailedClosed;

const OPERATION_ABSENCE: OperationAbsence = objectFreeze({
  hostIntlUsed: false,
  hostTimeZoneDatabaseUsed: false,
  hostTimeZoneFallbackUsed: false,
  networkReadPerformed: false,
  networkTransmissionPerformed: false,
  userDataStorageReadPerformed: false,
  applicationDataStoreReadPerformed: false,
  persistencePerformed: false,
  geocodingPerformed: false,
  mutationPerformed: false,
  mutationEpochAvailable: false,
  mutationEpoch: null,
  mutationEpochReceipt: null,
  mutationBoundary: "not_applicable_no_persistence",
  crossFileAtomicSnapshot: false,
  intervalMutationExcluded: false,
  abaExcluded: false,
  rawJsonBytesParsed: false,
  duplicateKeyExclusionEstablished: false,
  rawByteIdentityEstablished: false,
  transparentProxyExclusionEstablished: false,
  completePrimordialPoisoningIsolationEstablished: false
});

const DATA_HANDLING_BOUNDARY: DataHandlingBoundary = objectFreeze({
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

const AUTHORITY_BOUNDARY: AuthorityBoundary = objectFreeze({
  formalInputContractAdmitted: false,
  inputContractGateSatisfied: false,
  inputAcceptanceReceiptIssued: false,
  normalizationReceiptIssued: false,
  formalTimeResolutionReceiptIssued: false,
  factReceiptIssued: false,
  ruleReceiptIssued: false,
  successReceiptIssued: false,
  utcConversionAndTimeScaleRequirementSatisfied: false,
  leapSecondProvenanceEstablished: false,
  ut1ProvenanceEstablished: false,
  ttProvenanceEstablished: false,
  tdbProvenanceEstablished: false,
  eopProvenanceEstablished: false,
  astronomicalFactsEstablished: false,
  chartCalculated: false,
  contentTruthEstablished: false,
  expertTruthEstablished: false,
  sourceRightsEstablished: false,
  rightsLegalConclusionEstablished: false,
  domainAuthorityAuthorized: false,
  formalSystemAdmission: false,
  releaseEvidenceComplete: false,
  releaseReady: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  expertClaimsAuthorized: false,
  highRiskClaimsAuthorized: false,
  baziAuthorityInherited: false,
  westernAuthorityInherited: false,
  legacyV13IdentityInherited: false,
  releaseIdentity: null,
  targetSchema: null,
  migrationId: null
});

const EXCLUDED_PRODUCTS = objectFreeze([
  "full_vedic_input_acceptance",
  "normalization_receipt",
  "formal_time_resolution_receipt",
  "utc_conversion_and_time_scale_contract",
  "leap_seconds",
  "UT1",
  "TT",
  "TDB",
  "EOP",
  "ephemeris",
  "chart",
  "astrological_content"
] as const);

const REFERENCED_REQUIREMENT_IDS = objectFreeze([
  "civil_calendar_and_date",
  "local_wall_time_and_precision",
  "birth_time_uncertainty_interval_or_candidates",
  "iana_time_zone_and_tzdb_identity",
  "dst_gap_overlap_resolution"
] as const);

const NOT_EVALUATED_REQUIREMENT_IDS = objectFreeze([
  "place_coordinates_and_precision",
  "utc_conversion_and_time_scale",
  "ephemeris_identity_version_and_coverage",
  "sidereal_zodiac_declaration",
  "ayanamsa_identity_and_version",
  "rahu_ketu_mode",
  "bhava_house_definition",
  "birth_time_perturbation_candidates_and_transition_points"
] as const);

const RESOLUTION_CANDIDATES = new WeakSet<object>();

class AdapterBoundaryError extends Error {
  readonly code: VedicCivilTimeResolutionFailureCode;
  readonly stage: VedicCivilTimeResolutionFailureStage;

  constructor(code: VedicCivilTimeResolutionFailureCode, stage: VedicCivilTimeResolutionFailureStage) {
    super(code);
    this.name = "AdapterBoundaryError";
    this.code = code;
    this.stage = stage;
  }
}

function failedClosed(
  code: VedicCivilTimeResolutionFailureCode,
  stage: VedicCivilTimeResolutionFailureStage
): VedicCivilTimeResolutionFailedClosed {
  return deepFreeze({
    schemaVersion: VEDIC_CIVIL_TIME_RESOLUTION_CANDIDATE_SCHEMA_VERSION,
    adapterVersion: VEDIC_CIVIL_TIME_RESOLUTION_ADAPTER_VERSION,
    outcome: "failed_closed" as const,
    classification: "vedic_civil_time_engineering_candidate_only" as const,
    code,
    stage,
    partialResolutionReturned: false as const,
    audit: OPERATION_ABSENCE,
    dataHandling: DATA_HANDLING_BOUNDARY,
    authorityBoundary: AUTHORITY_BOUNDARY
  });
}

function weakHas(set: WeakSet<object>, value: object): boolean {
  return reflectApply(weakSetHas, set, [value]) as boolean;
}

function weakAdd(set: WeakSet<object>, value: object): void {
  reflectApply(weakSetAdd, set, [value]);
}

type CaptureState = {
  readonly seen: WeakSet<object>;
  objectCount: number;
  keyCount: number;
  stringCodeUnits: number;
};

function captureArray(value: object, state: CaptureState, depth: number): CapturedJson[] {
  if (objectGetPrototypeOf(value) !== arrayPrototype || objectGetOwnPropertySymbols(value).length !== 0) {
    throw new AdapterBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
  }
  const descriptors = objectGetOwnPropertyDescriptors(value);
  const lengthDescriptor = descriptors.length;
  if (
    lengthDescriptor === undefined ||
    !("value" in lengthDescriptor) ||
    lengthDescriptor.enumerable !== false ||
    !numberIsSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0 ||
    lengthDescriptor.value > MAX_CAPTURE_ARRAY_ITEMS
  ) {
    throw new AdapterBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
  }
  const length = lengthDescriptor.value as number;
  const keys = objectKeys(descriptors);
  if (keys.length !== length + 1) {
    throw new AdapterBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
  }
  const snapshot: CapturedJson[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (descriptor === undefined || descriptor.enumerable !== true || !("value" in descriptor)) {
      throw new AdapterBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
    }
    snapshot[index] = captureStrictPlainData(descriptor.value, state, depth + 1);
  }
  return snapshot;
}

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
    if (!numberIsFinite(value) || objectIs(value, -0)) {
      throw new AdapterBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
    }
    return value;
  }
  if (typeof value !== "object" || depth > MAX_CAPTURE_DEPTH) {
    throw new AdapterBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
  }
  if (weakHas(state.seen, value)) {
    throw new AdapterBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
  }
  weakAdd(state.seen, value);
  state.objectCount += 1;
  if (state.objectCount > MAX_CAPTURE_OBJECTS) {
    throw new AdapterBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
  }
  if (arrayIsArray(value)) return captureArray(value, state, depth);
  if (objectGetPrototypeOf(value) !== plainObjectPrototype || objectGetOwnPropertySymbols(value).length !== 0) {
    throw new AdapterBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
  }

  const descriptors = objectGetOwnPropertyDescriptors(value);
  const keys = objectKeys(descriptors);
  state.keyCount += keys.length;
  if (state.keyCount > MAX_CAPTURE_KEYS) {
    throw new AdapterBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
  }
  const snapshot = objectCreate(null) as PlainRecord;
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

function captureRequest(value: unknown): PlainRecord {
  try {
    const snapshot = captureStrictPlainData(value, {
      seen: new WeakSet<object>(),
      objectCount: 0,
      keyCount: 0,
      stringCodeUnits: 0
    }, 0);
    return requireRecord(snapshot);
  } catch (error) {
    if (error instanceof AdapterBoundaryError) throw error;
    throw new AdapterBoundaryError("INVALID_REQUEST_SHAPE", "boundary_snapshot");
  }
}

function sortStrings(values: string[]): string[] {
  return reflectApply(arraySort, values, [
    (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0
  ]) as string[];
}

function exactKeys(record: PlainRecord, expected: readonly string[]): void {
  const actual = sortStrings(objectKeys(record));
  const wanted = sortStrings([...expected]);
  if (actual.length !== wanted.length) {
    throw new AdapterBoundaryError("INVALID_INPUT_PROJECTION", "input_projection");
  }
  for (let index = 0; index < actual.length; index += 1) {
    if (actual[index] !== wanted[index]) {
      throw new AdapterBoundaryError("INVALID_INPUT_PROJECTION", "input_projection");
    }
  }
}

function requireRecord(value: CapturedJson | undefined): PlainRecord {
  if (value === undefined || value === null || typeof value !== "object" || arrayIsArray(value)) {
    throw new AdapterBoundaryError("INVALID_INPUT_PROJECTION", "input_projection");
  }
  return value;
}

function requireString(value: CapturedJson | undefined, maxLength = 200): string {
  if (typeof value !== "string" || value.length < 1 || value.length > maxLength) {
    throw new AdapterBoundaryError("INVALID_INPUT_PROJECTION", "input_projection");
  }
  return value;
}

function requireInteger(value: CapturedJson | undefined): number {
  if (typeof value !== "number" || !numberIsInteger(value) || !numberIsSafeInteger(value)) {
    throw new AdapterBoundaryError("INVALID_INPUT_PROJECTION", "input_projection");
  }
  return value;
}

type ParsedDeclaration =
  | Readonly<{ classification: "unambiguous"; utcOffsetSeconds: number }>
  | Readonly<{ classification: "gap" }>
  | Readonly<{
    classification: "overlap";
    earlierOffsetSeconds: number;
    laterOffsetSeconds: number;
    selectedCandidateId: "earlier" | "later" | null;
  }>;

type ParsedRequest = Readonly<{
  projectionVersion: typeof VEDIC_CIVIL_TIME_INPUT_PROJECTION_VERSION;
  calendar: Readonly<{
    calendarId: "proleptic_gregorian";
    calendarVersion: typeof VEDIC_PROLEPTIC_GREGORIAN_VERSION;
    year: number;
    month: number;
    day: number;
  }>;
  wallTime: Readonly<{
    text: string;
    precisionId: "exact_minute" | "exact_second";
    precisionVersion: typeof VEDIC_EXACT_WALL_TIME_PRECISION_VERSION;
  }>;
  uncertainty: Readonly<{
    representation: "exact";
    modelId: typeof VEDIC_EXACT_UNCERTAINTY_MODEL_ID;
    modelVersion: typeof VEDIC_EXACT_UNCERTAINTY_MODEL_VERSION;
  }>;
  zone: Readonly<{
    ianaTimeZoneId: string;
    tzdbVersion: string;
    tzdbSnapshotId: string;
  }>;
  policy: Readonly<{
    policyId: VedicDstAmbiguityPolicyId;
    policyVersion: typeof VEDIC_DST_OVERLAP_POLICY_VERSION;
  }>;
  declaration: ParsedDeclaration | null;
}>;

function parseDeclaration(value: CapturedJson | undefined): ParsedDeclaration | null {
  if (value === undefined) return null;
  const record = requireRecord(value);
  const classification = requireString(record.classification);
  if (classification === "unambiguous") {
    exactKeys(record, ["classification", "utc_offset_seconds"]);
    return { classification, utcOffsetSeconds: requireInteger(record.utc_offset_seconds) };
  }
  if (classification === "gap") {
    exactKeys(record, ["classification", "rejection_code"]);
    if (record.rejection_code !== "nonexistent_local_wall_time") {
      throw new AdapterBoundaryError("INVALID_INPUT_PROJECTION", "input_projection");
    }
    return { classification };
  }
  if (classification === "overlap") {
    exactKeys(record, ["candidate_offsets", "classification", "selected_candidate_id"]);
    const candidates = record.candidate_offsets;
    if (!arrayIsArray(candidates) || candidates.length !== 2) {
      throw new AdapterBoundaryError("INVALID_INPUT_PROJECTION", "input_projection");
    }
    let earlierOffsetSeconds: number | null = null;
    let laterOffsetSeconds: number | null = null;
    for (const entry of candidates) {
      const candidate = requireRecord(entry);
      exactKeys(candidate, ["candidate_id", "utc_offset_seconds"]);
      const candidateId = requireString(candidate.candidate_id);
      const offset = requireInteger(candidate.utc_offset_seconds);
      if (candidateId === "earlier" && earlierOffsetSeconds === null) earlierOffsetSeconds = offset;
      else if (candidateId === "later" && laterOffsetSeconds === null) laterOffsetSeconds = offset;
      else throw new AdapterBoundaryError("INVALID_INPUT_PROJECTION", "input_projection");
    }
    const selected = record.selected_candidate_id;
    if (selected !== null && selected !== "earlier" && selected !== "later") {
      throw new AdapterBoundaryError("INVALID_INPUT_PROJECTION", "input_projection");
    }
    if (earlierOffsetSeconds === null || laterOffsetSeconds === null) {
      throw new AdapterBoundaryError("INVALID_INPUT_PROJECTION", "input_projection");
    }
    return {
      classification,
      earlierOffsetSeconds,
      laterOffsetSeconds,
      selectedCandidateId: selected
    };
  }
  throw new AdapterBoundaryError("INVALID_INPUT_PROJECTION", "input_projection");
}

function parseRequest(record: PlainRecord): ParsedRequest {
  const hasDeclaration = record.dst_gap_overlap_resolution_declaration !== undefined;
  exactKeys(record, hasDeclaration
    ? [
      "birth_time_uncertainty_interval_or_candidates",
      "civil_calendar_and_date",
      "dst_ambiguity_policy",
      "dst_gap_overlap_resolution_declaration",
      "iana_time_zone_and_tzdb_identity",
      "local_wall_time_and_precision",
      "projectionVersion"
    ]
    : [
      "birth_time_uncertainty_interval_or_candidates",
      "civil_calendar_and_date",
      "dst_ambiguity_policy",
      "iana_time_zone_and_tzdb_identity",
      "local_wall_time_and_precision",
      "projectionVersion"
    ]);
  if (record.projectionVersion !== VEDIC_CIVIL_TIME_INPUT_PROJECTION_VERSION) {
    throw new AdapterBoundaryError("INVALID_INPUT_PROJECTION", "input_projection");
  }

  const calendar = requireRecord(record.civil_calendar_and_date);
  exactKeys(calendar, ["calendar_id", "calendar_version", "day", "month", "year"]);
  if (
    calendar.calendar_id !== "proleptic_gregorian" ||
    calendar.calendar_version !== VEDIC_PROLEPTIC_GREGORIAN_VERSION
  ) {
    throw new AdapterBoundaryError("INVALID_INPUT_PROJECTION", "input_projection");
  }

  const wallTime = requireRecord(record.local_wall_time_and_precision);
  exactKeys(wallTime, ["precision_id", "precision_version", "wall_time_text"]);
  if (
    (wallTime.precision_id !== "exact_minute" && wallTime.precision_id !== "exact_second") ||
    wallTime.precision_version !== VEDIC_EXACT_WALL_TIME_PRECISION_VERSION
  ) {
    throw new AdapterBoundaryError("INVALID_INPUT_PROJECTION", "input_projection");
  }

  const uncertainty = requireRecord(record.birth_time_uncertainty_interval_or_candidates);
  if (uncertainty.representation !== "exact") {
    throw new AdapterBoundaryError("UNSUPPORTED_UNCERTAINTY_PROFILE", "input_projection");
  }
  exactKeys(uncertainty, ["model_id", "model_version", "representation"]);
  if (
    uncertainty.model_id !== VEDIC_EXACT_UNCERTAINTY_MODEL_ID ||
    uncertainty.model_version !== VEDIC_EXACT_UNCERTAINTY_MODEL_VERSION
  ) {
    throw new AdapterBoundaryError("UNSUPPORTED_UNCERTAINTY_PROFILE", "input_projection");
  }

  const zone = requireRecord(record.iana_time_zone_and_tzdb_identity);
  exactKeys(zone, ["iana_time_zone_id", "tzdb_snapshot_id", "tzdb_version"]);

  const policy = requireRecord(record.dst_ambiguity_policy);
  exactKeys(policy, ["policy_id", "policy_version"]);
  if (
    (policy.policy_id !== "vedic_adapter_draft_reject" &&
      policy.policy_id !== "vedic_adapter_draft_earlier" &&
      policy.policy_id !== "vedic_adapter_draft_later") ||
    policy.policy_version !== VEDIC_DST_OVERLAP_POLICY_VERSION
  ) {
    throw new AdapterBoundaryError("INVALID_INPUT_PROJECTION", "input_projection");
  }

  return {
    projectionVersion: VEDIC_CIVIL_TIME_INPUT_PROJECTION_VERSION,
    calendar: {
      calendarId: "proleptic_gregorian",
      calendarVersion: VEDIC_PROLEPTIC_GREGORIAN_VERSION,
      year: requireInteger(calendar.year),
      month: requireInteger(calendar.month),
      day: requireInteger(calendar.day)
    },
    wallTime: {
      text: requireString(wallTime.wall_time_text),
      precisionId: wallTime.precision_id,
      precisionVersion: VEDIC_EXACT_WALL_TIME_PRECISION_VERSION
    },
    uncertainty: {
      representation: "exact",
      modelId: VEDIC_EXACT_UNCERTAINTY_MODEL_ID,
      modelVersion: VEDIC_EXACT_UNCERTAINTY_MODEL_VERSION
    },
    zone: {
      ianaTimeZoneId: requireString(zone.iana_time_zone_id),
      tzdbVersion: requireString(zone.tzdb_version),
      tzdbSnapshotId: requireString(zone.tzdb_snapshot_id, 1_000)
    },
    policy: {
      policyId: policy.policy_id,
      policyVersion: VEDIC_DST_OVERLAP_POLICY_VERSION
    },
    declaration: parseDeclaration(record.dst_gap_overlap_resolution_declaration)
  };
}

function twoDigits(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function fourDigits(value: number): string {
  if (value < 10) return `000${value}`;
  if (value < 100) return `00${value}`;
  if (value < 1_000) return `0${value}`;
  return String(value);
}

function parseLocalEpochMilliseconds(input: ParsedRequest): {
  isoDate: string;
  localEpochMilliseconds: number;
  normalizedSecond: number;
} {
  const { year, month, day } = input.calendar;
  const timePattern = input.wallTime.precisionId === "exact_minute"
    ? /^(\d{2}):(\d{2})$/
    : /^(\d{2}):(\d{2}):(\d{2})$/;
  const timeMatch = reflectApply(regexpExec, timePattern, [input.wallTime.text]) as RegExpExecArray | null;
  if (
    year < 0 || year > 9_999 || month < 1 || month > 12 || day < 1 || day > 31 ||
    timeMatch === null
  ) {
    throw new AdapterBoundaryError("INVALID_GREGORIAN_WALL_TIME", "gregorian_projection");
  }
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = input.wallTime.precisionId === "exact_second" ? Number(timeMatch[3]) : 0;
  const localEpochMilliseconds = dateUtc(year, month - 1, day, hour, minute, second, 0);
  const projected = new NativeDate(localEpochMilliseconds);
  if (
    !numberIsSafeInteger(localEpochMilliseconds) ||
    getUtcFullYear.call(projected) !== year ||
    getUtcMonth.call(projected) !== month - 1 ||
    getUtcDate.call(projected) !== day ||
    getUtcHours.call(projected) !== hour ||
    getUtcMinutes.call(projected) !== minute ||
    getUtcSeconds.call(projected) !== second
  ) {
    throw new AdapterBoundaryError("INVALID_GREGORIAN_WALL_TIME", "gregorian_projection");
  }
  return {
    isoDate: `${fourDigits(year)}-${twoDigits(month)}-${twoDigits(day)}`,
    localEpochMilliseconds,
    normalizedSecond: second
  };
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
  if (typeof value === "string" || typeof value === "boolean") {
    return jsonStringify(value);
  }
  if (typeof value === "number") {
    if (!numberIsFinite(value)) {
      throw new AdapterBoundaryError("INTERNAL_FAILURE", "candidate_construction");
    }
    return objectIs(value, -0) ? "0" : jsonStringify(value);
  }
  if (arrayIsArray(value)) {
    const entries: string[] = [];
    for (const entry of value) entries.push(canonicalJson(entry));
    return `[${reflectApply(arrayJoin, entries, [","]) as string}]`;
  }
  if (typeof value === "object" && value !== null) {
    const entries: string[] = [];
    for (const key of sortStrings(objectKeys(value))) {
      entries.push(`${jsonStringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`);
    }
    return `{${reflectApply(arrayJoin, entries, [","]) as string}}`;
  }
  throw new AdapterBoundaryError("INTERNAL_FAILURE", "candidate_construction");
}

function sha256(domain: string, value: unknown): string {
  return createHash("sha256")
    .update(domain, "utf8")
    .update("\0", "utf8")
    .update(canonicalJson(value), "utf8")
    .digest("hex");
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (typeof value !== "object" || value === null || weakHas(seen, value)) return value;
  weakAdd(seen, value);
  const descriptors = objectGetOwnPropertyDescriptors(value);
  for (const key of objectKeys(descriptors)) {
    const descriptor = descriptors[key];
    if (descriptor !== undefined && "value" in descriptor) deepFreeze(descriptor.value, seen);
  }
  return objectFreeze(value);
}

function isCandidateInvariantValid(candidate: BundledZoneCandidate): boolean {
  return numberIsSafeInteger(candidate.epochMilliseconds) &&
    numberIsSafeInteger(candidate.localEpochMilliseconds) &&
    numberIsSafeInteger(candidate.offsetSeconds) &&
    typeof candidate.matchesRequestedLocalTime === "boolean" &&
    candidate.epochMilliseconds + candidate.offsetSeconds * 1_000 === candidate.localEpochMilliseconds;
}

function sortedCandidates(candidates: readonly BundledZoneCandidate[]): BundledZoneCandidate[] {
  return reflectApply(arraySort, [...candidates], [
    (left: BundledZoneCandidate, right: BundledZoneCandidate) => left.epochMilliseconds - right.epochMilliseconds
  ]) as BundledZoneCandidate[];
}

function assertResolutionShape(
  resolution: BundledLocalResolution,
  requestedLocal: number,
  resolver: BundledTzdbResolver<RegisteredTimeZoneDatabaseSnapshot>,
  timeZone: string
): void {
  const candidates = resolution.candidates;
  if (!arrayIsArray(candidates) || candidates.length > 2) {
    throw new AdapterBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
  }
  for (const candidate of candidates) {
    if (!isCandidateInvariantValid(candidate)) {
      throw new AdapterBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
    }
    const projection = resolver.projectEpochMilliseconds(candidate.epochMilliseconds, timeZone);
    if (
      projection.epochMilliseconds !== candidate.epochMilliseconds ||
      projection.localEpochMilliseconds !== candidate.localEpochMilliseconds ||
      projection.offsetSeconds !== candidate.offsetSeconds
    ) {
      throw new AdapterBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
    }
  }
  const sorted = sortedCandidates(candidates);
  for (let index = 0; index < sorted.length; index += 1) {
    if (sorted[index] !== candidates[index]) {
      throw new AdapterBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
    }
  }
  if (resolution.kind === "unique") {
    if (candidates.length !== 1 || candidates[0]?.matchesRequestedLocalTime !== true ||
      candidates[0].localEpochMilliseconds !== requestedLocal) {
      throw new AdapterBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
    }
    return;
  }
  if (resolution.kind === "overlap") {
    if (
      candidates.length !== 2 ||
      candidates[0]?.epochMilliseconds === candidates[1]?.epochMilliseconds ||
      candidates[0]?.matchesRequestedLocalTime !== true ||
      candidates[1]?.matchesRequestedLocalTime !== true ||
      candidates[0]?.localEpochMilliseconds !== requestedLocal ||
      candidates[1]?.localEpochMilliseconds !== requestedLocal
    ) {
      throw new AdapterBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
    }
    return;
  }
  if (resolution.kind === "gap") {
    if (candidates.length !== 2 || candidates[0]?.matchesRequestedLocalTime !== false ||
      candidates[1]?.matchesRequestedLocalTime !== false) {
      throw new AdapterBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
    }
    return;
  }
  throw new AdapterBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
}

function expectedSelectedCandidateId(policy: VedicDstAmbiguityPolicyId): "earlier" | "later" | null {
  if (policy === "vedic_adapter_draft_earlier") return "earlier";
  if (policy === "vedic_adapter_draft_later") return "later";
  return null;
}

function assertDeclaration(
  resolution: BundledLocalResolution,
  declaration: ParsedDeclaration | null,
  policy: VedicDstAmbiguityPolicyId
): void {
  if (declaration === null) return;
  if (resolution.kind === "gap") {
    if (declaration.classification !== "gap") {
      throw new AdapterBoundaryError("DECLARATION_MISMATCH", "declaration_check");
    }
    return;
  }
  if (resolution.kind === "unique") {
    const candidate = resolution.candidates[0];
    if (
      declaration.classification !== "unambiguous" || candidate === undefined ||
      declaration.utcOffsetSeconds !== candidate.offsetSeconds
    ) {
      throw new AdapterBoundaryError("DECLARATION_MISMATCH", "declaration_check");
    }
    return;
  }
  const candidates = sortedCandidates(resolution.candidates);
  if (
    declaration.classification !== "overlap" ||
    declaration.earlierOffsetSeconds !== candidates[0]?.offsetSeconds ||
    declaration.laterOffsetSeconds !== candidates[1]?.offsetSeconds ||
    declaration.selectedCandidateId !== expectedSelectedCandidateId(policy)
  ) {
    throw new AdapterBoundaryError("DECLARATION_MISMATCH", "declaration_check");
  }
}

function chooseCandidate(
  resolution: BundledLocalResolution,
  policy: VedicDstAmbiguityPolicyId
): {
  candidate: BundledZoneCandidate;
  decision: "unique" | "vedic_adapter_draft_earlier" | "vedic_adapter_draft_later";
} {
  if (resolution.kind === "gap") {
    throw new AdapterBoundaryError("DST_GAP_REJECTED", "dst_policy");
  }
  if (resolution.kind === "unique") {
    return { candidate: resolution.candidates[0]!, decision: "unique" };
  }
  if (policy === "vedic_adapter_draft_reject") {
    throw new AdapterBoundaryError("DST_OVERLAP_REJECTED", "dst_policy");
  }
  const candidates = sortedCandidates(resolution.candidates);
  return policy === "vedic_adapter_draft_earlier"
    ? { candidate: candidates[0]!, decision: "vedic_adapter_draft_earlier" }
    : { candidate: candidates[candidates.length - 1]!, decision: "vedic_adapter_draft_later" };
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
    projection.offsetSeconds !== candidate.offsetSeconds ||
    candidate.epochMilliseconds + candidate.offsetSeconds * 1_000 !== requestedLocal
  ) {
    throw new AdapterBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
  }
}

function mapError(
  error: unknown,
  fallbackStage: VedicCivilTimeResolutionFailureStage
): VedicCivilTimeResolutionFailedClosed {
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
  return failedClosed("INTERNAL_FAILURE", fallbackStage);
}

/**
 * Creates an isolated Vedic civil-time resolution candidate. Raw caller data is
 * never read after the bounded declarative capture that completes before the
 * first await.
 */
export async function resolveVedicCivilTimeInputResolutionDraft(
  rawRequest: unknown
): Promise<VedicCivilTimeResolutionResult> {
  let request: ParsedRequest;
  let localEpochMilliseconds: number;
  let normalizedSecond: number;
  let isoDate: string;
  let registrySnapshot: RegisteredTimeZoneDatabaseSnapshot;

  try {
    request = parseRequest(captureRequest(rawRequest));
    ({ localEpochMilliseconds, normalizedSecond, isoDate } = parseLocalEpochMilliseconds(request));
    if (request.zone.tzdbSnapshotId !== VEDIC_CIVIL_TIME_FIXED_TZDB_SNAPSHOT_ID) {
      return failedClosed("TZDB_SNAPSHOT_MISMATCH", "tzdb_load");
    }
    const snapshot = getBundledTzdbArtifactSnapshot(request.zone.tzdbSnapshotId);
    if (snapshot === null) return failedClosed("TZDB_ARTIFACT_UNAVAILABLE", "tzdb_load");
    if (request.zone.tzdbVersion !== snapshot.ianaVersion) {
      return failedClosed("TZDB_SNAPSHOT_MISMATCH", "tzdb_load");
    }
    if (isoDate < snapshot.supportedRange.from || isoDate > snapshot.supportedRange.to) {
      return failedClosed("TZDB_SUPPORTED_RANGE_REJECTED", "supported_range");
    }
    registrySnapshot = snapshot;
  } catch (error) {
    return mapError(error, "input_projection");
  }

  let fallbackStage: VedicCivilTimeResolutionFailureStage = "tzdb_load";
  try {
    const resolver = await loadBundledTzdbResolver(request.zone.tzdbSnapshotId);
    const postLoadRegistrySnapshot = getBundledTzdbArtifactSnapshot(request.zone.tzdbSnapshotId);
    const preLoadBinding = snapshotBinding(registrySnapshot);
    if (
      postLoadRegistrySnapshot === null ||
      canonicalJson(preLoadBinding) !== canonicalJson(snapshotBinding(postLoadRegistrySnapshot)) ||
      canonicalJson(preLoadBinding) !== canonicalJson(snapshotBinding(resolver.snapshot)) ||
      resolver.snapshot.snapshotId !== request.zone.tzdbSnapshotId ||
      resolver.snapshot.ianaVersion !== request.zone.tzdbVersion
    ) {
      return failedClosed("TZDB_ARTIFACT_DRIFT", "tzdb_load");
    }
    fallbackStage = "tzdb_resolution";
    if (!resolver.isTimeZoneName(request.zone.ianaTimeZoneId)) {
      return failedClosed("TZDB_UNKNOWN_ZONE", "tzdb_resolution");
    }
    const resolution = resolver.resolveLocalEpochMilliseconds(
      localEpochMilliseconds,
      request.zone.ianaTimeZoneId
    );
    assertResolutionShape(
      resolution,
      localEpochMilliseconds,
      resolver,
      request.zone.ianaTimeZoneId
    );
    fallbackStage = "declaration_check";
    assertDeclaration(resolution, request.declaration, request.policy.policyId);
    fallbackStage = "dst_policy";
    const chosen = chooseCandidate(resolution, request.policy.policyId);
    fallbackStage = "tzdb_resolution";
    assertChosenRoundTrip(
      resolver,
      chosen.candidate,
      request.zone.ianaTimeZoneId,
      localEpochMilliseconds
    );
    const normalizedOffsetSeconds = objectIs(chosen.candidate.offsetSeconds, -0)
      ? 0
      : chosen.candidate.offsetSeconds;

    fallbackStage = "candidate_construction";
    const canonicalInputProjection = {
      projectionVersion: request.projectionVersion,
      civil_calendar_and_date: request.calendar,
      local_wall_time_and_precision: request.wallTime,
      birth_time_uncertainty_interval_or_candidates: request.uncertainty,
      iana_time_zone_and_tzdb_identity: request.zone,
      dst_ambiguity_policy: request.policy,
      dst_gap_overlap_resolution_declaration: request.declaration
    };
    const inputProjectionSha256 = sha256(
      "hakimi/vedic-civil-time-input-resolution-draft/input/v1",
      canonicalInputProjection
    );
    const requestProjectionSha256 = sha256(
      "hakimi/vedic-civil-time-input-resolution-draft/request/v1",
      { input: canonicalInputProjection, fixedSnapshotId: VEDIC_CIVIL_TIME_FIXED_TZDB_SNAPSHOT_ID }
    );
    const tzdbBinding = snapshotBinding(registrySnapshot);
    const resolutionProjection = {
      inputProjectionSha256,
      requestProjectionSha256,
      tzdbBinding,
      localEpochMilliseconds,
      epochMilliseconds: chosen.candidate.epochMilliseconds,
      utcOffsetSeconds: normalizedOffsetSeconds,
      kind: resolution.kind,
      decision: chosen.decision,
      policyVersion: request.policy.policyVersion
    };
    const resolutionSha256 = sha256(
      "hakimi/vedic-civil-time-input-resolution-draft/resolution/v1",
      resolutionProjection
    );

    const candidateWithoutFinalDigest = {
      schemaVersion: VEDIC_CIVIL_TIME_RESOLUTION_CANDIDATE_SCHEMA_VERSION,
      adapterVersion: VEDIC_CIVIL_TIME_RESOLUTION_ADAPTER_VERSION,
      outcome: "resolved_candidate" as const,
      classification: "vedic_civil_time_engineering_candidate_only" as const,
      formalAdmissionStatus: "not_admitted_draft_candidate" as const,
      systemIdentity: {
        contractSystemId: "vedic" as const,
        productSystemId: "vedic-astrology" as const,
        baziAuthorityInherited: false as const,
        westernAuthorityInherited: false as const,
        legacyV13IdentityInherited: false as const,
        releaseIdentity: null,
        targetSchema: null,
        migrationId: null
      },
      inputProjection: {
        projectionVersion: request.projectionVersion,
        referencedRequirementIds: REFERENCED_REQUIREMENT_IDS,
        notEvaluatedRequirementIds: NOT_EVALUATED_REQUIREMENT_IDS,
        exactSingleValueProfileOnly: true as const,
        completeVedicInputContractPresent: false as const,
        projectionIsFullVedicSchemaInstance: false as const,
        declarationIsFormalVedicSchemaInstance: false as const,
        digestCoversCompleteVedicInput: false as const,
        formalRequirementSelectionsEstablished: false as const,
        requirementsResolved: 0 as const,
        dstDeclarationPresent: request.declaration !== null,
        inputProjectionSha256,
        requestProjectionSha256
      },
      civilDate: {
        calendarId: request.calendar.calendarId,
        calendarVersion: request.calendar.calendarVersion,
        year: request.calendar.year,
        month: request.calendar.month,
        day: request.calendar.day,
        isoDate
      },
      wallTime: {
        wallTimeText: request.wallTime.text,
        precisionId: request.wallTime.precisionId,
        precisionVersion: request.wallTime.precisionVersion,
        normalizedSecond,
        fractionalSeconds: 0 as const
      },
      uncertainty: {
        representation: "exact" as const,
        modelId: request.uncertainty.modelId,
        modelVersion: request.uncertainty.modelVersion,
        intervalResolved: false as const,
        candidateSetResolved: false as const,
        perturbationResolved: false as const
      },
      timeZone: {
        requestedIanaTimeZoneId: request.zone.ianaTimeZoneId,
        canonicalIanaCaseIdentityEstablished: false as const,
        timeZoneDerivedFromCoordinates: false as const
      },
      tzdbBinding,
      resolverScope: {
        supportedRangeFrom: tzdbBinding.supportedRange.from,
        supportedRangeTo: tzdbBinding.supportedRange.to,
        nearbyOffsetSamplingRadiusHours: 48 as const,
        maximumModeledLocalCandidates: 2 as const,
        runtimeLoadedArtifactFullByteHashVerified: false as const,
        completeRuntimeSnapshotClosureEstablished: false as const,
        universalCivilTimeTruthEstablished: false as const
      },
      resolution: {
        kind: resolution.kind as "unique" | "overlap",
        decision: chosen.decision,
        requestedPolicyId: request.policy.policyId,
        policyVersion: request.policy.policyVersion,
        candidateOrderingSemantics: "utc_epoch_milliseconds_ascending" as const,
        localEpochMilliseconds,
        epochMilliseconds: chosen.candidate.epochMilliseconds,
        utcInstant: dateToISOString.call(new NativeDate(chosen.candidate.epochMilliseconds)),
        utcOffsetSeconds: normalizedOffsetSeconds,
        utcOffsetSignConvention: "east_positive" as const,
        requestedLocalTimeRoundTripVerified: true as const,
        utcOffsetRoundTripVerified: true as const,
        daylightSavingClassificationEstablished: false as const,
        utcConversionAndTimeScaleRequirementSatisfied: false as const
      },
      excludedProducts: EXCLUDED_PRODUCTS,
      audit: OPERATION_ABSENCE,
      dataHandling: DATA_HANDLING_BOUNDARY,
      authorityBoundary: AUTHORITY_BOUNDARY,
      digests: {
        algorithm: "SHA-256" as const,
        canonicalizationProfile: VEDIC_CIVIL_TIME_CANONICALIZATION_PROFILE,
        inputProjectionSha256,
        requestProjectionSha256,
        resolutionSha256,
        digestIsDigitalSignature: false as const
      }
    };
    const candidateSha256 = sha256(
      "hakimi/vedic-civil-time-input-resolution-draft/candidate/v1",
      candidateWithoutFinalDigest
    );
    const candidate = deepFreeze({
      ...candidateWithoutFinalDigest,
      digests: { ...candidateWithoutFinalDigest.digests, candidateSha256 }
    }) as VedicCivilTimeResolutionCandidate;
    weakAdd(RESOLUTION_CANDIDATES, candidate);
    return candidate;
  } catch (error) {
    return mapError(error, fallbackStage);
  }
}

/** Module-instance provenance check. Hashes and structural clones cannot mint this brand. */
export function isVedicCivilTimeResolutionCandidate(
  value: unknown
): value is VedicCivilTimeResolutionCandidate {
  return typeof value === "object" && value !== null && weakHas(RESOLUTION_CANDIDATES, value);
}
