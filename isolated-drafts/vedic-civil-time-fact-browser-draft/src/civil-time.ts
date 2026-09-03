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
  VEDIC_CIVIL_BROWSER_AUTHORITY_BOUNDARY,
  VEDIC_CIVIL_BROWSER_CANONICALIZATION_PROFILE,
  VEDIC_CIVIL_BROWSER_DATA_HANDLING,
  VEDIC_CIVIL_BROWSER_EXCLUDED_PRODUCTS,
  VEDIC_CIVIL_BROWSER_OPERATION_BOUNDARY,
  VEDIC_CIVIL_BROWSER_RECEIPT_SCHEMA_VERSION,
  VEDIC_CIVIL_BROWSER_RESOLVED_UTC_INSTANT_GUARD,
  VEDIC_CIVIL_BROWSER_RESOLVER_VERSION,
  VEDIC_SYSTEM_IDENTITY
} from "./constants.ts";
import {
  prepareVedicCivilTimeBrowserRequest,
  type PreparedVedicCivilTimeBrowserRequest,
  type VedicBrowserDstPolicyId
} from "./input-contract.ts";
import {
  deepFreezeVedicBrowserData,
  sha256VedicBrowserCanonical
} from "./protocol.ts";
import { isValidUtcOffsetSeconds } from "./ui-format.ts";

const NativeDate = Date;
const dateUtc = Date.UTC;
const dateToISOString = Date.prototype.toISOString;
const getUtcFullYear = Date.prototype.getUTCFullYear;
const getUtcMonth = Date.prototype.getUTCMonth;
const getUtcDate = Date.prototype.getUTCDate;
const getUtcHours = Date.prototype.getUTCHours;
const getUtcMinutes = Date.prototype.getUTCMinutes;
const getUtcSeconds = Date.prototype.getUTCSeconds;

export type VedicCivilBrowserFailureCode =
  | "INVALID_INPUT_PROJECTION"
  | "INVALID_GREGORIAN_WALL_TIME"
  | "TZDB_SNAPSHOT_MISMATCH"
  | "TZDB_ARTIFACT_UNAVAILABLE"
  | "TZDB_ARTIFACT_DRIFT"
  | "TZDB_SUPPORTED_RANGE_REJECTED"
  | "TZDB_UNKNOWN_ZONE"
  | "TZDB_RESOLUTION_INVARIANT_FAILED"
  | "DST_GAP_REJECTED"
  | "DST_OVERLAP_REJECTED"
  | "DIGEST_FAILED"
  | "INTERNAL_FAILURE";

export type VedicCivilBrowserFailureStage =
  | "input_projection"
  | "gregorian_projection"
  | "tzdb_load"
  | "supported_range"
  | "tzdb_resolution"
  | "dst_policy"
  | "digest"
  | "receipt_construction";

export type VedicCivilBrowserTzdbBinding = Readonly<{
  snapshotId: string;
  schemaVersion: string;
  kind: string;
  ianaVersion: string;
  artifactName: string;
  dataSha256: string;
  resolver: Readonly<{ name: string; version: string }>;
  adapter: Readonly<{ name: string; version: string }>;
  supportedRange: Readonly<{
    from: string;
    to: string;
    semantics: "requested_local_civil_date";
    resolvedUtcInstantGuard: typeof VEDIC_CIVIL_BROWSER_RESOLVED_UTC_INSTANT_GUARD;
    resolvedUtcInstantCoverageIndependentlyEstablished: false;
  }>;
}>;

export type VedicCivilBrowserFailure = Readonly<{
  schemaVersion: typeof VEDIC_CIVIL_BROWSER_RECEIPT_SCHEMA_VERSION;
  resolverVersion: typeof VEDIC_CIVIL_BROWSER_RESOLVER_VERSION;
  outcome: "failed_closed";
  classification: "vedic_civil_time_engineering_fact_only";
  code: VedicCivilBrowserFailureCode;
  stage: VedicCivilBrowserFailureStage;
  partialFactsReturned: false;
  operationBoundary: typeof VEDIC_CIVIL_BROWSER_OPERATION_BOUNDARY;
  dataHandling: Readonly<typeof VEDIC_CIVIL_BROWSER_DATA_HANDLING & { personDerivedDigestProduced: false }>;
  authorityBoundary: typeof VEDIC_CIVIL_BROWSER_AUTHORITY_BOUNDARY;
}>;

export type VedicCivilBrowserReceipt = Readonly<{
  schemaVersion: typeof VEDIC_CIVIL_BROWSER_RECEIPT_SCHEMA_VERSION;
  resolverVersion: typeof VEDIC_CIVIL_BROWSER_RESOLVER_VERSION;
  outcome: "resolved";
  classification: "vedic_civil_time_engineering_fact_only";
  formalAdmissionStatus: "not_admitted_isolated_draft";
  systemIdentity: typeof VEDIC_SYSTEM_IDENTITY;
  inputScope: Readonly<{
    exactSingleValueProfileOnly: true;
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
    completeVedicInputContractPresent: false;
    projectionIsFullVedicSchemaInstance: false;
    requirementsResolved: 0;
  }>;
  declaredCivilTime: Readonly<{
    date: string;
    time: string;
    timePrecision: "exact_minute" | "exact_second";
    timeZoneToken: string;
    requestedDstPolicy: VedicBrowserDstPolicyId;
    normalizedSecond: number;
    fractionalSeconds: 0;
  }>;
  tzdbBinding: VedicCivilBrowserTzdbBinding;
  resolution: Readonly<{
    kind: "unique" | "overlap";
    decision: "unique" | "vedic_adapter_draft_earlier" | "vedic_adapter_draft_later";
    localEpochMilliseconds: number;
    epochMilliseconds: number;
    utcInstant: string;
    utcInstantPrecision: "exact_minute" | "exact_second";
    utcOffsetSeconds: number;
    utcOffsetSignConvention: "east_positive";
    requestedLocalTimeRoundTripVerified: true;
    utcOffsetRoundTripVerified: true;
    daylightSavingClassificationEstablished: false;
    utcConversionAndTimeScaleRequirementSatisfied: false;
  }>;
  excludedProducts: typeof VEDIC_CIVIL_BROWSER_EXCLUDED_PRODUCTS;
  operationBoundary: typeof VEDIC_CIVIL_BROWSER_OPERATION_BOUNDARY;
  dataHandling: Readonly<typeof VEDIC_CIVIL_BROWSER_DATA_HANDLING & { personDerivedDigestProduced: true }>;
  authorityBoundary: typeof VEDIC_CIVIL_BROWSER_AUTHORITY_BOUNDARY;
  digests: Readonly<{
    algorithm: "SHA-256";
    implementation: "Web Crypto SubtleCrypto.digest";
    canonicalizationProfile: typeof VEDIC_CIVIL_BROWSER_CANONICALIZATION_PROFILE;
    inputSha256: string;
    requestSha256: string;
    resolutionSha256: string;
    receiptSha256: string;
    digestIsDigitalSignature: false;
  }>;
}>;

export type VedicCivilBrowserResult = VedicCivilBrowserReceipt | VedicCivilBrowserFailure;

const REFERENCED_REQUIREMENT_IDS = Object.freeze([
  "civil_calendar_and_date",
  "local_wall_time_and_precision",
  "birth_time_uncertainty_interval_or_candidates",
  "iana_time_zone_and_tzdb_identity",
  "dst_gap_overlap_resolution"
] as const);

const NOT_EVALUATED_REQUIREMENT_IDS = Object.freeze([
  "place_coordinates_and_precision",
  "utc_conversion_and_time_scale",
  "ephemeris_identity_version_and_coverage",
  "sidereal_zodiac_declaration",
  "ayanamsa_identity_and_version",
  "rahu_ketu_mode",
  "bhava_house_definition",
  "birth_time_perturbation_candidates_and_transition_points"
] as const);

const RECEIPTS = new WeakSet<object>();

class ResolutionBoundaryError extends Error {
  readonly code: VedicCivilBrowserFailureCode;
  readonly stage: VedicCivilBrowserFailureStage;

  constructor(code: VedicCivilBrowserFailureCode, stage: VedicCivilBrowserFailureStage) {
    super(code);
    this.name = "ResolutionBoundaryError";
    this.code = code;
    this.stage = stage;
  }
}

function failedClosed(
  code: VedicCivilBrowserFailureCode,
  stage: VedicCivilBrowserFailureStage
): VedicCivilBrowserFailure {
  return deepFreezeVedicBrowserData({
    schemaVersion: VEDIC_CIVIL_BROWSER_RECEIPT_SCHEMA_VERSION,
    resolverVersion: VEDIC_CIVIL_BROWSER_RESOLVER_VERSION,
    outcome: "failed_closed" as const,
    classification: "vedic_civil_time_engineering_fact_only" as const,
    code,
    stage,
    partialFactsReturned: false as const,
    operationBoundary: VEDIC_CIVIL_BROWSER_OPERATION_BOUNDARY,
    dataHandling: {
      ...VEDIC_CIVIL_BROWSER_DATA_HANDLING,
      personDerivedDigestProduced: false as const
    },
    authorityBoundary: VEDIC_CIVIL_BROWSER_AUTHORITY_BOUNDARY
  });
}

function parseLocalEpochMilliseconds(request: PreparedVedicCivilTimeBrowserRequest): {
  isoDate: string;
  localEpochMilliseconds: number;
  normalizedSecond: number;
} {
  const calendar = request.civil_calendar_and_date;
  const wallTime = request.local_wall_time_and_precision;
  const match = wallTime.precision_id === "exact_minute"
    ? /^(\d{2}):(\d{2})$/u.exec(wallTime.wall_time_text)
    : /^(\d{2}):(\d{2}):(\d{2})$/u.exec(wallTime.wall_time_text);
  if (!match) throw new ResolutionBoundaryError("INVALID_GREGORIAN_WALL_TIME", "gregorian_projection");
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = wallTime.precision_id === "exact_second" ? Number(match[3]) : 0;
  const localEpochMilliseconds = dateUtc(
    calendar.year,
    calendar.month - 1,
    calendar.day,
    hour,
    minute,
    second,
    0
  );
  const projected = new NativeDate(localEpochMilliseconds);
  if (!Number.isSafeInteger(localEpochMilliseconds)
    || getUtcFullYear.call(projected) !== calendar.year
    || getUtcMonth.call(projected) !== calendar.month - 1
    || getUtcDate.call(projected) !== calendar.day
    || getUtcHours.call(projected) !== hour
    || getUtcMinutes.call(projected) !== minute
    || getUtcSeconds.call(projected) !== second) {
    throw new ResolutionBoundaryError("INVALID_GREGORIAN_WALL_TIME", "gregorian_projection");
  }
  const isoDate = `${String(calendar.year).padStart(4, "0")}-${String(calendar.month).padStart(2, "0")}-${String(calendar.day).padStart(2, "0")}`;
  return { isoDate, localEpochMilliseconds, normalizedSecond: second };
}

function snapshotBinding(snapshot: RegisteredTimeZoneDatabaseSnapshot): VedicCivilBrowserTzdbBinding {
  return {
    snapshotId: snapshot.snapshotId,
    schemaVersion: snapshot.schemaVersion,
    kind: snapshot.kind,
    ianaVersion: snapshot.ianaVersion,
    artifactName: snapshot.artifactName,
    dataSha256: snapshot.dataSha256,
    resolver: { name: snapshot.resolver.name, version: snapshot.resolver.version },
    adapter: { name: snapshot.adapter.name, version: snapshot.adapter.version },
    supportedRange: {
      from: snapshot.supportedRange.from,
      to: snapshot.supportedRange.to,
      semantics: "requested_local_civil_date",
      resolvedUtcInstantGuard: VEDIC_CIVIL_BROWSER_RESOLVED_UTC_INSTANT_GUARD,
      resolvedUtcInstantCoverageIndependentlyEstablished: false
    }
  };
}

function sameSnapshotBinding(
  left: RegisteredTimeZoneDatabaseSnapshot,
  right: RegisteredTimeZoneDatabaseSnapshot
): boolean {
  return JSON.stringify(snapshotBinding(left)) === JSON.stringify(snapshotBinding(right));
}

function assertCandidateInvariant(
  candidate: BundledZoneCandidate,
  resolver: BundledTzdbResolver<RegisteredTimeZoneDatabaseSnapshot>,
  timeZone: string
): void {
  if (!Number.isSafeInteger(candidate.epochMilliseconds)
    || !Number.isSafeInteger(candidate.localEpochMilliseconds)
    || !isValidUtcOffsetSeconds(candidate.offsetSeconds)
    || typeof candidate.matchesRequestedLocalTime !== "boolean"
    || candidate.epochMilliseconds + candidate.offsetSeconds * 1_000 !== candidate.localEpochMilliseconds) {
    throw new ResolutionBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
  }
  const projected = resolver.projectEpochMilliseconds(candidate.epochMilliseconds, timeZone);
  if (projected.epochMilliseconds !== candidate.epochMilliseconds
    || projected.localEpochMilliseconds !== candidate.localEpochMilliseconds
    || projected.offsetSeconds !== candidate.offsetSeconds) {
    throw new ResolutionBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
  }
}

function assertResolutionShape(
  resolution: BundledLocalResolution,
  requestedLocal: number,
  resolver: BundledTzdbResolver<RegisteredTimeZoneDatabaseSnapshot>,
  timeZone: string
): void {
  if (!Array.isArray(resolution.candidates) || resolution.candidates.length > 2) {
    throw new ResolutionBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
  }
  for (const candidate of resolution.candidates) assertCandidateInvariant(candidate, resolver, timeZone);
  for (let index = 1; index < resolution.candidates.length; index += 1) {
    if (resolution.candidates[index - 1]!.epochMilliseconds >= resolution.candidates[index]!.epochMilliseconds) {
      throw new ResolutionBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
    }
  }
  if (resolution.kind === "unique") {
    const candidate = resolution.candidates[0];
    if (resolution.candidates.length !== 1
      || candidate?.matchesRequestedLocalTime !== true
      || candidate.localEpochMilliseconds !== requestedLocal) {
      throw new ResolutionBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
    }
    return;
  }
  if (resolution.kind === "overlap") {
    if (resolution.candidates.length !== 2
      || resolution.candidates.some((candidate) => (
        candidate.matchesRequestedLocalTime !== true || candidate.localEpochMilliseconds !== requestedLocal
      ))) {
      throw new ResolutionBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
    }
    return;
  }
  if (resolution.kind === "gap"
    && resolution.candidates.length === 2
    && resolution.candidates.every((candidate) => candidate.matchesRequestedLocalTime === false)) return;
  throw new ResolutionBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
}

function chooseCandidate(
  resolution: BundledLocalResolution,
  policy: VedicBrowserDstPolicyId
): {
  candidate: BundledZoneCandidate;
  decision: "unique" | "vedic_adapter_draft_earlier" | "vedic_adapter_draft_later";
} {
  if (resolution.kind === "gap") {
    throw new ResolutionBoundaryError("DST_GAP_REJECTED", "dst_policy");
  }
  if (resolution.kind === "unique") return { candidate: resolution.candidates[0]!, decision: "unique" };
  if (policy === "vedic_adapter_draft_reject") {
    throw new ResolutionBoundaryError("DST_OVERLAP_REJECTED", "dst_policy");
  }
  return policy === "vedic_adapter_draft_earlier"
    ? { candidate: resolution.candidates[0]!, decision: policy }
    : { candidate: resolution.candidates[resolution.candidates.length - 1]!, decision: policy };
}

function assertChosenRoundTrip(
  resolver: BundledTzdbResolver<RegisteredTimeZoneDatabaseSnapshot>,
  candidate: BundledZoneCandidate,
  timeZone: string,
  requestedLocal: number
): void {
  const projection = resolver.projectEpochMilliseconds(candidate.epochMilliseconds, timeZone);
  if (projection.epochMilliseconds !== candidate.epochMilliseconds
    || projection.localEpochMilliseconds !== requestedLocal
    || projection.localEpochMilliseconds !== candidate.localEpochMilliseconds
    || projection.offsetSeconds !== candidate.offsetSeconds
    || candidate.epochMilliseconds + candidate.offsetSeconds * 1_000 !== requestedLocal) {
    throw new ResolutionBoundaryError("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
  }
}

function mapError(error: unknown, fallbackStage: VedicCivilBrowserFailureStage): VedicCivilBrowserFailure {
  if (error instanceof ResolutionBoundaryError) return failedClosed(error.code, error.stage);
  if (error instanceof TzdbArtifactError) {
    if (error.code === "TZDB_ARTIFACT_UNAVAILABLE") return failedClosed("TZDB_ARTIFACT_UNAVAILABLE", "tzdb_load");
    if (error.code === "TZDB_UNKNOWN_ZONE") return failedClosed("TZDB_UNKNOWN_ZONE", "tzdb_resolution");
    if (error.code === "TZDB_ARTIFACT_MISMATCH") return failedClosed("TZDB_ARTIFACT_DRIFT", "tzdb_load");
    return failedClosed("TZDB_RESOLUTION_INVARIANT_FAILED", "tzdb_resolution");
  }
  return failedClosed(fallbackStage === "digest" ? "DIGEST_FAILED" : "INVALID_INPUT_PROJECTION", fallbackStage);
}

export async function resolveVedicCivilTimeBrowserFact(
  rawRequest: unknown
): Promise<VedicCivilBrowserResult> {
  let fallbackStage: VedicCivilBrowserFailureStage = "input_projection";
  try {
    const prepared = await prepareVedicCivilTimeBrowserRequest(rawRequest);
    const request = prepared.request;
    fallbackStage = "gregorian_projection";
    const { isoDate, localEpochMilliseconds, normalizedSecond } = parseLocalEpochMilliseconds(request);

    fallbackStage = "tzdb_load";
    const requestedSnapshot = request.iana_time_zone_and_tzdb_identity.tzdb_snapshot_id;
    const registrySnapshot = getBundledTzdbArtifactSnapshot(requestedSnapshot);
    if (registrySnapshot === null
      || registrySnapshot.ianaVersion !== request.iana_time_zone_and_tzdb_identity.tzdb_version) {
      throw new ResolutionBoundaryError("TZDB_SNAPSHOT_MISMATCH", "tzdb_load");
    }
    if (isoDate < registrySnapshot.supportedRange.from || isoDate > registrySnapshot.supportedRange.to) {
      throw new ResolutionBoundaryError("TZDB_SUPPORTED_RANGE_REJECTED", "supported_range");
    }
    const resolver = await loadBundledTzdbResolver(requestedSnapshot);
    const postLoadSnapshot = getBundledTzdbArtifactSnapshot(requestedSnapshot);
    if (postLoadSnapshot === null
      || !sameSnapshotBinding(registrySnapshot, postLoadSnapshot)
      || !sameSnapshotBinding(registrySnapshot, resolver.snapshot)) {
      throw new ResolutionBoundaryError("TZDB_ARTIFACT_DRIFT", "tzdb_load");
    }

    fallbackStage = "tzdb_resolution";
    const timeZone = request.iana_time_zone_and_tzdb_identity.iana_time_zone_id;
    if (!resolver.isTimeZoneName(timeZone)) {
      throw new ResolutionBoundaryError("TZDB_UNKNOWN_ZONE", "tzdb_resolution");
    }
    const resolution = resolver.resolveLocalEpochMilliseconds(localEpochMilliseconds, timeZone);
    assertResolutionShape(resolution, localEpochMilliseconds, resolver, timeZone);
    fallbackStage = "dst_policy";
    const selected = chooseCandidate(resolution, request.dst_ambiguity_policy.policy_id);
    fallbackStage = "supported_range";
    if (selected.candidate.epochMilliseconds
        < VEDIC_CIVIL_BROWSER_RESOLVED_UTC_INSTANT_GUARD.fromEpochMillisecondsInclusive
      || selected.candidate.epochMilliseconds
        > VEDIC_CIVIL_BROWSER_RESOLVED_UTC_INSTANT_GUARD.toEpochMillisecondsInclusive) {
      throw new ResolutionBoundaryError("TZDB_SUPPORTED_RANGE_REJECTED", "supported_range");
    }
    fallbackStage = "tzdb_resolution";
    assertChosenRoundTrip(resolver, selected.candidate, timeZone, localEpochMilliseconds);
    const utcOffsetSeconds = Object.is(selected.candidate.offsetSeconds, -0)
      ? 0
      : selected.candidate.offsetSeconds;

    fallbackStage = "digest";
    const inputSha256 = await sha256VedicBrowserCanonical(
      "hakimi.vedic-civil-time-fact-browser/input/1",
      request
    );
    const tzdbBinding = snapshotBinding(registrySnapshot);
    const resolutionProjection = {
      requestSha256: prepared.requestSha256,
      tzdbBinding,
      localEpochMilliseconds,
      epochMilliseconds: selected.candidate.epochMilliseconds,
      utcOffsetSeconds,
      kind: resolution.kind,
      decision: selected.decision
    };
    const resolutionSha256 = await sha256VedicBrowserCanonical(
      "hakimi.vedic-civil-time-fact-browser/resolution/1",
      resolutionProjection
    );

    fallbackStage = "receipt_construction";
    const receiptWithoutFinalDigest = {
      schemaVersion: VEDIC_CIVIL_BROWSER_RECEIPT_SCHEMA_VERSION,
      resolverVersion: VEDIC_CIVIL_BROWSER_RESOLVER_VERSION,
      outcome: "resolved" as const,
      classification: "vedic_civil_time_engineering_fact_only" as const,
      formalAdmissionStatus: "not_admitted_isolated_draft" as const,
      systemIdentity: VEDIC_SYSTEM_IDENTITY,
      inputScope: {
        exactSingleValueProfileOnly: true as const,
        referencedRequirementIds: REFERENCED_REQUIREMENT_IDS,
        notEvaluatedRequirementIds: NOT_EVALUATED_REQUIREMENT_IDS,
        completeVedicInputContractPresent: false as const,
        projectionIsFullVedicSchemaInstance: false as const,
        requirementsResolved: 0 as const
      },
      declaredCivilTime: {
        date: isoDate,
        time: request.local_wall_time_and_precision.wall_time_text,
        timePrecision: request.local_wall_time_and_precision.precision_id,
        timeZoneToken: timeZone,
        requestedDstPolicy: request.dst_ambiguity_policy.policy_id,
        normalizedSecond,
        fractionalSeconds: 0 as const
      },
      tzdbBinding,
      resolution: {
        kind: resolution.kind as "unique" | "overlap",
        decision: selected.decision,
        localEpochMilliseconds,
        epochMilliseconds: selected.candidate.epochMilliseconds,
        utcInstant: dateToISOString.call(new NativeDate(selected.candidate.epochMilliseconds)),
        utcInstantPrecision: request.local_wall_time_and_precision.precision_id,
        utcOffsetSeconds,
        utcOffsetSignConvention: "east_positive" as const,
        requestedLocalTimeRoundTripVerified: true as const,
        utcOffsetRoundTripVerified: true as const,
        daylightSavingClassificationEstablished: false as const,
        utcConversionAndTimeScaleRequirementSatisfied: false as const
      },
      excludedProducts: VEDIC_CIVIL_BROWSER_EXCLUDED_PRODUCTS,
      operationBoundary: VEDIC_CIVIL_BROWSER_OPERATION_BOUNDARY,
      dataHandling: {
        ...VEDIC_CIVIL_BROWSER_DATA_HANDLING,
        personDerivedDigestProduced: true as const
      },
      authorityBoundary: VEDIC_CIVIL_BROWSER_AUTHORITY_BOUNDARY,
      digests: {
        algorithm: "SHA-256" as const,
        implementation: "Web Crypto SubtleCrypto.digest" as const,
        canonicalizationProfile: VEDIC_CIVIL_BROWSER_CANONICALIZATION_PROFILE,
        inputSha256,
        requestSha256: prepared.requestSha256,
        resolutionSha256,
        digestIsDigitalSignature: false as const
      }
    };
    fallbackStage = "digest";
    const receiptSha256 = await sha256VedicBrowserCanonical(
      "hakimi.vedic-civil-time-fact-browser/receipt/1",
      receiptWithoutFinalDigest
    );
    const receipt = deepFreezeVedicBrowserData({
      ...receiptWithoutFinalDigest,
      digests: { ...receiptWithoutFinalDigest.digests, receiptSha256 }
    }) as VedicCivilBrowserReceipt;
    RECEIPTS.add(receipt);
    return receipt;
  } catch (error) {
    return mapError(error, fallbackStage);
  }
}

export function isVedicCivilBrowserReceipt(value: unknown): value is VedicCivilBrowserReceipt {
  return typeof value === "object" && value !== null && RECEIPTS.has(value);
}
