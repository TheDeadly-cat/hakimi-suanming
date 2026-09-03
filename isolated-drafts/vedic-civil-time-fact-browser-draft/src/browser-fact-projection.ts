import {
  PROJECT_GOVERNANCE_CONTEXT,
  VEDIC_CIVIL_BROWSER_AUTHORITY_BOUNDARY,
  VEDIC_CIVIL_BROWSER_CANONICALIZATION_PROFILE,
  VEDIC_CIVIL_BROWSER_CHAIN_VERSION,
  VEDIC_CIVIL_BROWSER_DATA_HANDLING,
  VEDIC_CIVIL_BROWSER_EXCLUDED_PRODUCTS,
  VEDIC_CIVIL_BROWSER_FACT_SCHEMA_VERSION,
  VEDIC_CIVIL_BROWSER_OPERATION_BOUNDARY,
  VEDIC_CIVIL_BROWSER_PROJECTION_DIGEST_DOMAIN,
  VEDIC_CIVIL_BROWSER_RECEIPT_SCHEMA_VERSION,
  VEDIC_CIVIL_BROWSER_RESOLVED_UTC_INSTANT_GUARD,
  VEDIC_CIVIL_BROWSER_RESOLVER_VERSION,
  VEDIC_SYSTEM_IDENTITY
} from "./constants.ts";
import type {
  VedicCivilBrowserReceipt,
  VedicCivilBrowserTzdbBinding
} from "./civil-time.ts";
import {
  VEDIC_BROWSER_DST_POLICY_VERSION,
  VEDIC_BROWSER_EXACT_UNCERTAINTY_MODEL_ID,
  VEDIC_BROWSER_EXACT_UNCERTAINTY_MODEL_VERSION,
  VEDIC_BROWSER_EXACT_WALL_TIME_PRECISION_VERSION,
  VEDIC_BROWSER_FIXED_TZDB_SNAPSHOT_ID,
  VEDIC_BROWSER_INPUT_PROJECTION_VERSION,
  VEDIC_BROWSER_PROLEPTIC_GREGORIAN_VERSION,
  prepareVedicCivilTimeBrowserRequest,
  type VedicBrowserDstPolicyId
} from "./input-contract.ts";
import {
  VedicBrowserInputBoundaryError,
  canonicalVedicBrowserJson,
  captureVedicBrowserCloneData,
  deepFreezeVedicBrowserData,
  sha256VedicBrowserCanonical,
  type VedicBrowserCloneData
} from "./protocol.ts";
import { isValidUtcOffsetSeconds } from "./ui-format.ts";

export const VEDIC_CIVIL_BROWSER_TZDB_BINDING = deepFreezeVedicBrowserData({
  snapshotId: VEDIC_BROWSER_FIXED_TZDB_SNAPSHOT_ID,
  schemaVersion: "1.0.0" as const,
  kind: "bundled_iana_tzdb" as const,
  ianaVersion: "2026c" as const,
  artifactName: "moment-timezone/data/packed/latest.json" as const,
  dataSha256: "43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81" as const,
  resolver: { name: "hakimi-tzdb-core" as const, version: "1.0.0" as const },
  adapter: { name: "moment-timezone" as const, version: "0.6.3" as const },
  supportedRange: {
    from: "1900-01-01" as const,
    to: "2100-12-31" as const,
    semantics: "requested_local_civil_date" as const,
    resolvedUtcInstantGuard: VEDIC_CIVIL_BROWSER_RESOLVED_UTC_INSTANT_GUARD,
    resolvedUtcInstantCoverageIndependentlyEstablished: false as const
  }
});

export const VEDIC_CIVIL_BROWSER_INPUT_SCOPE = deepFreezeVedicBrowserData({
  exactSingleValueProfileOnly: true as const,
  referencedRequirementIds: [
    "civil_calendar_and_date",
    "local_wall_time_and_precision",
    "birth_time_uncertainty_interval_or_candidates",
    "iana_time_zone_and_tzdb_identity",
    "dst_gap_overlap_resolution"
  ] as const,
  notEvaluatedRequirementIds: [
    "place_coordinates_and_precision",
    "utc_conversion_and_time_scale",
    "ephemeris_identity_version_and_coverage",
    "sidereal_zodiac_declaration",
    "ayanamsa_identity_and_version",
    "rahu_ketu_mode",
    "bhava_house_definition",
    "birth_time_perturbation_candidates_and_transition_points"
  ] as const,
  completeVedicInputContractPresent: false as const,
  projectionIsFullVedicSchemaInstance: false as const,
  requirementsResolved: 0 as const
});

export type VedicCivilBrowserFactProjection = Readonly<{
  schemaVersion: typeof VEDIC_CIVIL_BROWSER_FACT_SCHEMA_VERSION;
  chainVersion: typeof VEDIC_CIVIL_BROWSER_CHAIN_VERSION;
  outcome: "resolved";
  classification: "vedic_civil_time_engineering_fact_only";
  formalAdmissionStatus: "not_admitted_isolated_draft";
  projectGovernanceContext: typeof PROJECT_GOVERNANCE_CONTEXT;
  systemIdentity: typeof VEDIC_SYSTEM_IDENTITY;
  inputScope: typeof VEDIC_CIVIL_BROWSER_INPUT_SCOPE;
  inputContractIdentity: Readonly<{
    projectionVersion: typeof VEDIC_BROWSER_INPUT_PROJECTION_VERSION;
    calendarVersion: typeof VEDIC_BROWSER_PROLEPTIC_GREGORIAN_VERSION;
    wallTimePrecisionVersion: typeof VEDIC_BROWSER_EXACT_WALL_TIME_PRECISION_VERSION;
    uncertaintyModelId: typeof VEDIC_BROWSER_EXACT_UNCERTAINTY_MODEL_ID;
    uncertaintyModelVersion: typeof VEDIC_BROWSER_EXACT_UNCERTAINTY_MODEL_VERSION;
    dstPolicyVersion: typeof VEDIC_BROWSER_DST_POLICY_VERSION;
  }>;
  declaredCivilTime: VedicCivilBrowserReceipt["declaredCivilTime"];
  tzdbBinding: VedicCivilBrowserTzdbBinding;
  resolution: VedicCivilBrowserReceipt["resolution"];
  excludedProducts: typeof VEDIC_CIVIL_BROWSER_EXCLUDED_PRODUCTS;
  operationBoundary: typeof VEDIC_CIVIL_BROWSER_OPERATION_BOUNDARY;
  dataHandling: VedicCivilBrowserReceipt["dataHandling"];
  authorityBoundary: typeof VEDIC_CIVIL_BROWSER_AUTHORITY_BOUNDARY;
  sourceReceipt: Readonly<{
    schemaVersion: typeof VEDIC_CIVIL_BROWSER_RECEIPT_SCHEMA_VERSION;
    resolverVersion: typeof VEDIC_CIVIL_BROWSER_RESOLVER_VERSION;
    requestSha256: string;
    receiptSha256: string;
    sourceReceiptBrandVerifiedInWorker: true;
    structuredClonePreservesSourceBrand: false;
  }>;
  digests: Readonly<{
    algorithm: "SHA-256";
    implementation: "Web Crypto SubtleCrypto.digest";
    canonicalizationProfile: typeof VEDIC_CIVIL_BROWSER_CANONICALIZATION_PROFILE;
    requestSha256: string;
    sourceReceiptSha256: string;
    browserProjectionSha256: string;
    digestIsDigitalSignature: false;
  }>;
}>;

export const VEDIC_CIVIL_BROWSER_INPUT_CONTRACT_IDENTITY = deepFreezeVedicBrowserData({
  projectionVersion: VEDIC_BROWSER_INPUT_PROJECTION_VERSION,
  calendarVersion: VEDIC_BROWSER_PROLEPTIC_GREGORIAN_VERSION,
  wallTimePrecisionVersion: VEDIC_BROWSER_EXACT_WALL_TIME_PRECISION_VERSION,
  uncertaintyModelId: VEDIC_BROWSER_EXACT_UNCERTAINTY_MODEL_ID,
  uncertaintyModelVersion: VEDIC_BROWSER_EXACT_UNCERTAINTY_MODEL_VERSION,
  dstPolicyVersion: VEDIC_BROWSER_DST_POLICY_VERSION
});

function sameCanonical(left: unknown, right: unknown): boolean {
  return canonicalVedicBrowserJson(left) === canonicalVedicBrowserJson(right);
}

function requireRecord(value: VedicBrowserCloneData | undefined, code: string): Record<string, VedicBrowserCloneData> {
  if (value === undefined || value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new VedicBrowserInputBoundaryError(code);
  }
  return value;
}

function exactKeys(record: Record<string, VedicBrowserCloneData>, expected: readonly string[], code: string): void {
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new VedicBrowserInputBoundaryError(code);
  }
}

function requireString(value: VedicBrowserCloneData | undefined, code: string): string {
  if (typeof value !== "string" || value.length === 0) throw new VedicBrowserInputBoundaryError(code);
  return value;
}

function requireSafeInteger(value: VedicBrowserCloneData | undefined, code: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || Object.is(value, -0)) {
    throw new VedicBrowserInputBoundaryError(code);
  }
  return value;
}

function requireSha256(value: VedicBrowserCloneData | undefined, code: string): string {
  const text = requireString(value, code);
  if (!/^[a-f0-9]{64}$/u.test(text)) throw new VedicBrowserInputBoundaryError(code);
  return text;
}

function requireCanonicalConstant(
  value: VedicBrowserCloneData | undefined,
  expected: unknown,
  code: string
): typeof expected {
  if (!sameCanonical(value, expected)) throw new VedicBrowserInputBoundaryError(code);
  return expected;
}

function validateDeclaredCivilTime(value: VedicBrowserCloneData | undefined): VedicCivilBrowserReceipt["declaredCivilTime"] {
  const record = requireRecord(value, "VEDIC_BROWSER_DECLARED_CIVIL_NOT_RECORD");
  exactKeys(record, [
    "date", "fractionalSeconds", "normalizedSecond", "requestedDstPolicy", "time", "timePrecision", "timeZoneToken"
  ], "VEDIC_BROWSER_DECLARED_CIVIL_SHAPE_INVALID");
  const date = requireString(record.date, "VEDIC_BROWSER_DECLARED_DATE_INVALID");
  const time = requireString(record.time, "VEDIC_BROWSER_DECLARED_TIME_INVALID");
  const timePrecision = record.timePrecision;
  const timeZoneToken = requireString(record.timeZoneToken, "VEDIC_BROWSER_DECLARED_ZONE_INVALID");
  const requestedDstPolicy = record.requestedDstPolicy;
  const normalizedSecond = requireSafeInteger(record.normalizedSecond, "VEDIC_BROWSER_DECLARED_SECOND_INVALID");
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)
    || (timePrecision !== "exact_minute" && timePrecision !== "exact_second")
    || (timePrecision === "exact_minute" ? !/^\d{2}:\d{2}$/u.test(time) : !/^\d{2}:\d{2}:\d{2}$/u.test(time))
    || (requestedDstPolicy !== "vedic_adapter_draft_reject"
      && requestedDstPolicy !== "vedic_adapter_draft_earlier"
      && requestedDstPolicy !== "vedic_adapter_draft_later")
    || record.fractionalSeconds !== 0
    || normalizedSecond !== (timePrecision === "exact_second" ? Number(time.slice(-2)) : 0)
    || timeZoneToken.length > 200) {
    throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_DECLARED_CIVIL_INVALID");
  }
  return deepFreezeVedicBrowserData({
    date,
    time,
    timePrecision,
    timeZoneToken,
    requestedDstPolicy: requestedDstPolicy as VedicBrowserDstPolicyId,
    normalizedSecond,
    fractionalSeconds: 0 as const
  });
}

function localEpochFromDeclared(value: VedicCivilBrowserReceipt["declaredCivilTime"]): number {
  const [year, month, day] = value.date.split("-").map(Number);
  const [hour, minute, second = 0] = value.time.split(":").map(Number);
  const epoch = Date.UTC(year!, month! - 1, day!, hour!, minute!, second, 0);
  const projected = new Date(epoch);
  if (!Number.isSafeInteger(epoch)
    || projected.getUTCFullYear() !== year
    || projected.getUTCMonth() !== month! - 1
    || projected.getUTCDate() !== day
    || projected.getUTCHours() !== hour
    || projected.getUTCMinutes() !== minute
    || projected.getUTCSeconds() !== second) {
    throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_DECLARED_GREGORIAN_INVALID");
  }
  return epoch;
}

function validateResolution(
  value: VedicBrowserCloneData | undefined,
  declared: VedicCivilBrowserReceipt["declaredCivilTime"]
): VedicCivilBrowserReceipt["resolution"] {
  const record = requireRecord(value, "VEDIC_BROWSER_RESOLUTION_NOT_RECORD");
  exactKeys(record, [
    "daylightSavingClassificationEstablished", "decision", "epochMilliseconds", "kind", "localEpochMilliseconds",
    "requestedLocalTimeRoundTripVerified", "utcConversionAndTimeScaleRequirementSatisfied", "utcInstant",
    "utcInstantPrecision", "utcOffsetRoundTripVerified", "utcOffsetSeconds", "utcOffsetSignConvention"
  ], "VEDIC_BROWSER_RESOLUTION_SHAPE_INVALID");
  const localEpochMilliseconds = requireSafeInteger(record.localEpochMilliseconds, "VEDIC_BROWSER_LOCAL_EPOCH_INVALID");
  const epochMilliseconds = requireSafeInteger(record.epochMilliseconds, "VEDIC_BROWSER_EPOCH_INVALID");
  const utcOffsetSeconds = requireSafeInteger(record.utcOffsetSeconds, "VEDIC_BROWSER_OFFSET_INVALID");
  const utcInstant = requireString(record.utcInstant, "VEDIC_BROWSER_UTC_INVALID");
  const kind = record.kind;
  const decision = record.decision;
  if ((kind !== "unique" && kind !== "overlap")
    || (decision !== "unique" && decision !== "vedic_adapter_draft_earlier" && decision !== "vedic_adapter_draft_later")
    || (kind === "unique" && decision !== "unique")
    || (kind === "overlap" && decision === "unique")
    || (kind === "overlap" && decision !== declared.requestedDstPolicy)
    || record.utcInstantPrecision !== declared.timePrecision
    || record.utcOffsetSignConvention !== "east_positive"
    || record.requestedLocalTimeRoundTripVerified !== true
    || record.utcOffsetRoundTripVerified !== true
    || record.daylightSavingClassificationEstablished !== false
    || record.utcConversionAndTimeScaleRequirementSatisfied !== false
    || !isValidUtcOffsetSeconds(utcOffsetSeconds)
    || epochMilliseconds < VEDIC_CIVIL_BROWSER_RESOLVED_UTC_INSTANT_GUARD.fromEpochMillisecondsInclusive
    || epochMilliseconds > VEDIC_CIVIL_BROWSER_RESOLVED_UTC_INSTANT_GUARD.toEpochMillisecondsInclusive
    || localEpochMilliseconds !== localEpochFromDeclared(declared)
    || epochMilliseconds + utcOffsetSeconds * 1_000 !== localEpochMilliseconds
    || new Date(epochMilliseconds).toISOString() !== utcInstant) {
    throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_RESOLUTION_INVALID");
  }
  return deepFreezeVedicBrowserData({
    kind,
    decision,
    localEpochMilliseconds,
    epochMilliseconds,
    utcInstant,
    utcInstantPrecision: declared.timePrecision,
    utcOffsetSeconds,
    utcOffsetSignConvention: "east_positive" as const,
    requestedLocalTimeRoundTripVerified: true as const,
    utcOffsetRoundTripVerified: true as const,
    daylightSavingClassificationEstablished: false as const,
    utcConversionAndTimeScaleRequirementSatisfied: false as const
  });
}

export async function validateVedicCivilBrowserFactProjection(
  value: unknown,
  expectedRequestSha256: string
): Promise<VedicCivilBrowserFactProjection> {
  if (!/^[a-f0-9]{64}$/u.test(expectedRequestSha256)) {
    throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_EXPECTED_REQUEST_DIGEST_INVALID");
  }
  const captured = captureVedicBrowserCloneData(value);
  const root = requireRecord(captured, "VEDIC_BROWSER_PROJECTION_NOT_RECORD");
  exactKeys(root, [
    "authorityBoundary", "chainVersion", "classification", "dataHandling", "declaredCivilTime", "digests",
    "excludedProducts", "formalAdmissionStatus", "inputContractIdentity", "inputScope", "operationBoundary", "outcome",
    "projectGovernanceContext", "resolution", "schemaVersion", "sourceReceipt", "systemIdentity", "tzdbBinding"
  ], "VEDIC_BROWSER_PROJECTION_SHAPE_INVALID");
  if (root.schemaVersion !== VEDIC_CIVIL_BROWSER_FACT_SCHEMA_VERSION
    || root.chainVersion !== VEDIC_CIVIL_BROWSER_CHAIN_VERSION
    || root.outcome !== "resolved"
    || root.classification !== "vedic_civil_time_engineering_fact_only"
    || root.formalAdmissionStatus !== "not_admitted_isolated_draft") {
    throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_PROJECTION_IDENTITY_INVALID");
  }
  const declaredCivilTime = validateDeclaredCivilTime(root.declaredCivilTime);
  const [declaredYear, declaredMonth, declaredDay] = declaredCivilTime.date.split("-").map(Number);
  const reconstructedRequest = await prepareVedicCivilTimeBrowserRequest({
    projectionVersion: VEDIC_BROWSER_INPUT_PROJECTION_VERSION,
    civil_calendar_and_date: {
      calendar_id: "proleptic_gregorian",
      calendar_version: VEDIC_BROWSER_PROLEPTIC_GREGORIAN_VERSION,
      year: declaredYear,
      month: declaredMonth,
      day: declaredDay
    },
    local_wall_time_and_precision: {
      wall_time_text: declaredCivilTime.time,
      precision_id: declaredCivilTime.timePrecision,
      precision_version: VEDIC_BROWSER_EXACT_WALL_TIME_PRECISION_VERSION
    },
    birth_time_uncertainty_interval_or_candidates: {
      representation: "exact",
      model_id: VEDIC_BROWSER_EXACT_UNCERTAINTY_MODEL_ID,
      model_version: VEDIC_BROWSER_EXACT_UNCERTAINTY_MODEL_VERSION
    },
    iana_time_zone_and_tzdb_identity: {
      iana_time_zone_id: declaredCivilTime.timeZoneToken,
      tzdb_version: "2026c",
      tzdb_snapshot_id: VEDIC_BROWSER_FIXED_TZDB_SNAPSHOT_ID
    },
    dst_ambiguity_policy: {
      policy_id: declaredCivilTime.requestedDstPolicy,
      policy_version: VEDIC_BROWSER_DST_POLICY_VERSION
    }
  });
  if (reconstructedRequest.requestSha256 !== expectedRequestSha256) {
    throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_DECLARED_REQUEST_BINDING_MISMATCH");
  }
  const resolution = validateResolution(root.resolution, declaredCivilTime);
  const sourceReceiptRecord = requireRecord(root.sourceReceipt, "VEDIC_BROWSER_SOURCE_RECEIPT_NOT_RECORD");
  exactKeys(sourceReceiptRecord, [
    "receiptSha256", "requestSha256", "resolverVersion", "schemaVersion",
    "sourceReceiptBrandVerifiedInWorker", "structuredClonePreservesSourceBrand"
  ], "VEDIC_BROWSER_SOURCE_RECEIPT_SHAPE_INVALID");
  const sourceRequestSha256 = requireSha256(sourceReceiptRecord.requestSha256, "VEDIC_BROWSER_SOURCE_REQUEST_DIGEST_INVALID");
  const receiptSha256 = requireSha256(sourceReceiptRecord.receiptSha256, "VEDIC_BROWSER_SOURCE_RECEIPT_DIGEST_INVALID");
  if (sourceReceiptRecord.schemaVersion !== VEDIC_CIVIL_BROWSER_RECEIPT_SCHEMA_VERSION
    || sourceReceiptRecord.resolverVersion !== VEDIC_CIVIL_BROWSER_RESOLVER_VERSION
    || sourceRequestSha256 !== expectedRequestSha256
    || sourceReceiptRecord.sourceReceiptBrandVerifiedInWorker !== true
    || sourceReceiptRecord.structuredClonePreservesSourceBrand !== false) {
    throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_SOURCE_RECEIPT_INVALID");
  }
  const digestsRecord = requireRecord(root.digests, "VEDIC_BROWSER_DIGESTS_NOT_RECORD");
  exactKeys(digestsRecord, [
    "algorithm", "browserProjectionSha256", "canonicalizationProfile", "digestIsDigitalSignature",
    "implementation", "requestSha256", "sourceReceiptSha256"
  ], "VEDIC_BROWSER_DIGESTS_SHAPE_INVALID");
  const digestRequestSha256 = requireSha256(digestsRecord.requestSha256, "VEDIC_BROWSER_REQUEST_DIGEST_INVALID");
  const digestSourceReceiptSha256 = requireSha256(digestsRecord.sourceReceiptSha256, "VEDIC_BROWSER_RECEIPT_DIGEST_INVALID");
  const browserProjectionSha256 = requireSha256(digestsRecord.browserProjectionSha256, "VEDIC_BROWSER_PROJECTION_DIGEST_INVALID");
  if (digestsRecord.algorithm !== "SHA-256"
    || digestsRecord.implementation !== "Web Crypto SubtleCrypto.digest"
    || digestsRecord.canonicalizationProfile !== VEDIC_CIVIL_BROWSER_CANONICALIZATION_PROFILE
    || digestsRecord.digestIsDigitalSignature !== false
    || digestRequestSha256 !== expectedRequestSha256
    || digestSourceReceiptSha256 !== receiptSha256) {
    throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_DIGESTS_INVALID");
  }

  requireCanonicalConstant(root.projectGovernanceContext, PROJECT_GOVERNANCE_CONTEXT, "VEDIC_BROWSER_GOVERNANCE_INVALID");
  requireCanonicalConstant(root.systemIdentity, VEDIC_SYSTEM_IDENTITY, "VEDIC_BROWSER_SYSTEM_IDENTITY_INVALID");
  requireCanonicalConstant(root.inputScope, VEDIC_CIVIL_BROWSER_INPUT_SCOPE, "VEDIC_BROWSER_INPUT_SCOPE_INVALID");
  requireCanonicalConstant(root.inputContractIdentity, VEDIC_CIVIL_BROWSER_INPUT_CONTRACT_IDENTITY, "VEDIC_BROWSER_INPUT_CONTRACT_IDENTITY_INVALID");
  requireCanonicalConstant(root.tzdbBinding, VEDIC_CIVIL_BROWSER_TZDB_BINDING, "VEDIC_BROWSER_TZDB_BINDING_INVALID");
  requireCanonicalConstant(root.excludedProducts, VEDIC_CIVIL_BROWSER_EXCLUDED_PRODUCTS, "VEDIC_BROWSER_EXCLUDED_PRODUCTS_INVALID");
  requireCanonicalConstant(root.operationBoundary, VEDIC_CIVIL_BROWSER_OPERATION_BOUNDARY, "VEDIC_BROWSER_OPERATION_BOUNDARY_INVALID");
  requireCanonicalConstant(root.dataHandling, { ...VEDIC_CIVIL_BROWSER_DATA_HANDLING, personDerivedDigestProduced: true }, "VEDIC_BROWSER_DATA_HANDLING_INVALID");
  requireCanonicalConstant(root.authorityBoundary, VEDIC_CIVIL_BROWSER_AUTHORITY_BOUNDARY, "VEDIC_BROWSER_AUTHORITY_BOUNDARY_INVALID");

  const normalizedWithoutFinalDigest = {
    schemaVersion: VEDIC_CIVIL_BROWSER_FACT_SCHEMA_VERSION,
    chainVersion: VEDIC_CIVIL_BROWSER_CHAIN_VERSION,
    outcome: "resolved" as const,
    classification: "vedic_civil_time_engineering_fact_only" as const,
    formalAdmissionStatus: "not_admitted_isolated_draft" as const,
    projectGovernanceContext: PROJECT_GOVERNANCE_CONTEXT,
    systemIdentity: VEDIC_SYSTEM_IDENTITY,
    inputScope: VEDIC_CIVIL_BROWSER_INPUT_SCOPE,
    inputContractIdentity: VEDIC_CIVIL_BROWSER_INPUT_CONTRACT_IDENTITY,
    declaredCivilTime,
    tzdbBinding: VEDIC_CIVIL_BROWSER_TZDB_BINDING,
    resolution,
    excludedProducts: VEDIC_CIVIL_BROWSER_EXCLUDED_PRODUCTS,
    operationBoundary: VEDIC_CIVIL_BROWSER_OPERATION_BOUNDARY,
    dataHandling: { ...VEDIC_CIVIL_BROWSER_DATA_HANDLING, personDerivedDigestProduced: true as const },
    authorityBoundary: VEDIC_CIVIL_BROWSER_AUTHORITY_BOUNDARY,
    sourceReceipt: {
      schemaVersion: VEDIC_CIVIL_BROWSER_RECEIPT_SCHEMA_VERSION,
      resolverVersion: VEDIC_CIVIL_BROWSER_RESOLVER_VERSION,
      requestSha256: sourceRequestSha256,
      receiptSha256,
      sourceReceiptBrandVerifiedInWorker: true as const,
      structuredClonePreservesSourceBrand: false as const
    },
    digests: {
      algorithm: "SHA-256" as const,
      implementation: "Web Crypto SubtleCrypto.digest" as const,
      canonicalizationProfile: VEDIC_CIVIL_BROWSER_CANONICALIZATION_PROFILE,
      requestSha256: digestRequestSha256,
      sourceReceiptSha256: digestSourceReceiptSha256,
      digestIsDigitalSignature: false as const
    }
  };
  const recomputed = await sha256VedicBrowserCanonical(
    VEDIC_CIVIL_BROWSER_PROJECTION_DIGEST_DOMAIN,
    normalizedWithoutFinalDigest
  );
  if (recomputed !== browserProjectionSha256) {
    throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_PROJECTION_DIGEST_MISMATCH");
  }
  return deepFreezeVedicBrowserData({
    ...normalizedWithoutFinalDigest,
    digests: { ...normalizedWithoutFinalDigest.digests, browserProjectionSha256 }
  });
}
