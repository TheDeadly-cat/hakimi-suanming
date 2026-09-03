import type { WesternCivilTimeFactReceipt } from "./civil-time.ts";
import {
  WESTERN_FACT_CHAIN_VERSION,
  captureStrictData,
  deepFreeze,
  requireExactKeys,
  requireFiniteNumber,
  requireRecord,
  requireString,
  sha256Canonical,
  type StrictData
} from "./protocol.ts";

export const WESTERN_CIVIL_BROWSER_FACT_SCHEMA_VERSION =
  "hakimi.western-civil-time-browser-facts/0.1-draft" as const;
export const WESTERN_CIVIL_BROWSER_FACT_DIGEST_DOMAIN =
  "hakimi/western-civil-time-fact-browser-draft/browser-projection/v1" as const;

export const WESTERN_CIVIL_BROWSER_EXCLUDED_PRODUCTS = Object.freeze([
  "UT1",
  "TT",
  "TDB",
  "EOP",
  "RAMC",
  "ephemeris",
  "chart",
  "houses",
  "aspects",
  "zodiac_rules",
  "astrological_content",
  "cross_system_comparison"
] as const);

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const IANA_TIME_ZONE_PATTERN = /^(?:UTC|[A-Za-z_+-]+(?:\/[A-Za-z0-9_+.-]+)+)$/u;

export const WESTERN_CIVIL_BROWSER_TZDB_BINDINGS = deepFreeze([
  {
    snapshotId: "iana-tzdb@2026c/sha256:43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81/hakimi-tzdb-core@1.0.0/moment-timezone@0.6.3",
    schemaVersion: "1.0.0",
    kind: "bundled_iana_tzdb",
    ianaVersion: "2026c",
    artifactName: "moment-timezone/data/packed/latest.json",
    dataSha256: "43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81",
    resolver: { name: "hakimi-tzdb-core", version: "1.0.0" },
    adapter: { name: "moment-timezone", version: "0.6.3" },
    supportedRange: { from: "1900-01-01", to: "2100-12-31" }
  },
  {
    snapshotId: "iana-tzdb@2025b/sha256:b1ad1446fbc94459f86c8e3f4ffadfc4170ad2af9cbd2a9b85c75d5436ce6425/hakimi-tzdb-core@1.0.0/moment-timezone@0.6.3",
    schemaVersion: "1.0.0",
    kind: "bundled_iana_tzdb",
    ianaVersion: "2025b",
    artifactName: "moment-timezone-2025b/data/packed/latest.json",
    dataSha256: "b1ad1446fbc94459f86c8e3f4ffadfc4170ad2af9cbd2a9b85c75d5436ce6425",
    resolver: { name: "hakimi-tzdb-core", version: "1.0.0" },
    adapter: { name: "moment-timezone", version: "0.6.3" },
    supportedRange: { from: "1900-01-01", to: "2100-12-31" }
  }
] as const);

export const PROJECT_GOVERNANCE_CONTEXT = deepFreeze({
  activeLine: "legacy-v13" as const,
  targetSchema: 13 as const,
  migrationId: null,
  publicDeploymentAuthorized: false,
  expertClaimsAuthorized: false
});

export const WESTERN_AUTHORITY_BOUNDARY = deepFreeze({
  releaseIdentity: null,
  targetSchema: null,
  migrationId: null,
  formalInputContractAdmitted: false,
  civilTimeDomainTruthCertified: false,
  astronomicalFactsEstablished: false,
  chartCalculated: false,
  contentTruthEstablished: false,
  expertTruthEstablished: false,
  rightsLegalConclusionEstablished: false,
  highRiskPolicyBound: false,
  releaseEvidenceComplete: false,
  releaseReady: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  expertClaimsAuthorized: false,
  highRiskClaimsAuthorized: false,
  formalSystemAdmission: false,
  baziAuthorityInherited: false,
  canonicalZoneIdentityEstablished: false
});

export const DATA_HANDLING_BOUNDARY = deepFreeze({
  containsPersonalData: true,
  containsPersonDerivedBirthData: true,
  personDerivedDigest: true,
  candidateDigestIsAnonymous: false,
  coordinatesReturnedByProjection: false,
  safeToLog: false,
  safeToPersist: false,
  safeToPublish: false,
  loggingAuthorized: false,
  persistenceAuthorized: false,
  retentionAuthorized: false,
  networkTransmissionAuthorized: false
});

export const OPERATION_BOUNDARY = deepFreeze({
  runtime: "fresh_dedicated_worker_per_request" as const,
  hostIntlUsed: false,
  hostTimeZoneDatabaseUsed: false,
  hostTimeZoneFallbackUsed: false,
  networkTransmissionPerformed: false,
  persistencePerformed: false,
  loggingPerformed: false,
  geocodingPerformed: false,
  mutationPerformed: false,
  uiGenerationCounterIsMutationEpoch: false,
  mutationEpochAvailable: false,
  mutationEpoch: null,
  crossFileAtomicSnapshot: false,
  intervalMutationExcluded: false,
  abaExcluded: false
});

export type WesternCivilBrowserFactProjection = Readonly<{
  schemaVersion: typeof WESTERN_CIVIL_BROWSER_FACT_SCHEMA_VERSION;
  chainVersion: typeof WESTERN_FACT_CHAIN_VERSION;
  classification: "civil_time_engineering_fact_only";
  formalAdmissionStatus: "not_admitted_isolated_browser_draft";
  sourceReceipt: Readonly<{
    schemaVersion: string;
    resolverVersion: string;
    receiptSha256: string;
    requestSha256: string;
    processLocalBrandVerifiedBeforeProjection: true;
    structuredClonePreservesSourceBrand: false;
  }>;
  declaredCivilTime: Readonly<{
    date: string;
    time: string;
    timePrecision: "exact_minute" | "exact_second";
    timeZoneToken: string;
    requestedDstDisambiguation: "reject" | "earlier" | "later";
    canonicalZoneIdentityEstablished: false;
  }>;
  tzdbBinding: WesternCivilTimeFactReceipt["tzdbBinding"];
  resolution: WesternCivilTimeFactReceipt["resolution"];
  excludedProducts: typeof WESTERN_CIVIL_BROWSER_EXCLUDED_PRODUCTS;
  operationBoundary: typeof OPERATION_BOUNDARY;
  dataHandling: typeof DATA_HANDLING_BOUNDARY;
  authorityBoundary: typeof WESTERN_AUTHORITY_BOUNDARY;
  projectGovernanceContext: typeof PROJECT_GOVERNANCE_CONTEXT;
  digests: Readonly<{
    algorithm: "SHA-256";
    canonicalizationProfile: "hakimi.sorted-key-json.finite-number.v1";
    sourceReceiptSha256: string;
    browserProjectionSha256: string;
    digestIsDigitalSignature: false;
  }>;
}>;

export async function validateWesternCivilBrowserFactProjection(
  candidate: unknown,
  expectedRequestSha256: string
): Promise<WesternCivilBrowserFactProjection> {
  if (!SHA256_PATTERN.test(expectedRequestSha256)) throw new Error("BROWSER_EXPECTED_REQUEST_DIGEST_INVALID");
  const captured = captureStrictData(candidate);
  const root = requireRecord(captured, "BROWSER_PROJECTION_NOT_RECORD");
  requireExactKeys(root, [
    "authorityBoundary",
    "chainVersion",
    "classification",
    "dataHandling",
    "declaredCivilTime",
    "digests",
    "excludedProducts",
    "formalAdmissionStatus",
    "operationBoundary",
    "projectGovernanceContext",
    "resolution",
    "schemaVersion",
    "sourceReceipt",
    "tzdbBinding"
  ], "BROWSER_PROJECTION_ROOT_SHAPE_INVALID");
  if (root.schemaVersion !== WESTERN_CIVIL_BROWSER_FACT_SCHEMA_VERSION
    || root.chainVersion !== WESTERN_FACT_CHAIN_VERSION
    || root.classification !== "civil_time_engineering_fact_only"
    || root.formalAdmissionStatus !== "not_admitted_isolated_browser_draft") {
    throw new Error("BROWSER_PROJECTION_IDENTITY_INVALID");
  }

  validateSourceReceipt(root.sourceReceipt, expectedRequestSha256);
  const declaredCivilTime = validateDeclaredCivilTime(root.declaredCivilTime);
  const tzdbBinding = validateTzdbBinding(root.tzdbBinding);
  validateResolution(root.resolution, declaredCivilTime, tzdbBinding);
  validateExcludedProducts(root.excludedProducts);
  validateExactConstantObject(root.operationBoundary, OPERATION_BOUNDARY, "BROWSER_OPERATION_BOUNDARY_INVALID");
  validateExactConstantObject(root.dataHandling, DATA_HANDLING_BOUNDARY, "BROWSER_DATA_HANDLING_INVALID");
  validateExactConstantObject(root.authorityBoundary, WESTERN_AUTHORITY_BOUNDARY, "BROWSER_AUTHORITY_BOUNDARY_INVALID");
  validateExactConstantObject(root.projectGovernanceContext, PROJECT_GOVERNANCE_CONTEXT, "BROWSER_PROJECT_GOVERNANCE_INVALID");

  const digests = requireRecord(root.digests, "BROWSER_DIGESTS_NOT_RECORD");
  requireExactKeys(digests, [
    "algorithm",
    "browserProjectionSha256",
    "canonicalizationProfile",
    "digestIsDigitalSignature",
    "sourceReceiptSha256"
  ], "BROWSER_DIGESTS_SHAPE_INVALID");
  const sourceReceipt = requireRecord(root.sourceReceipt, "BROWSER_SOURCE_RECEIPT_NOT_RECORD");
  if (digests.algorithm !== "SHA-256"
    || digests.canonicalizationProfile !== "hakimi.sorted-key-json.finite-number.v1"
    || digests.digestIsDigitalSignature !== false
    || digests.sourceReceiptSha256 !== sourceReceipt.receiptSha256
    || typeof digests.browserProjectionSha256 !== "string"
    || !SHA256_PATTERN.test(digests.browserProjectionSha256)) {
    throw new Error("BROWSER_DIGESTS_INVALID");
  }

  const { browserProjectionSha256: _omittedDigest, ...digestsWithoutFinal } = digests;
  const withoutFinalDigest = {
    ...root,
    digests: digestsWithoutFinal
  };
  const recomputed = await sha256Canonical(WESTERN_CIVIL_BROWSER_FACT_DIGEST_DOMAIN, withoutFinalDigest);
  if (recomputed !== digests.browserProjectionSha256) throw new Error("BROWSER_PROJECTION_DIGEST_MISMATCH");
  return deepFreeze(captured as unknown as WesternCivilBrowserFactProjection);
}

function validateSourceReceipt(value: unknown, expectedRequestSha256: string): void {
  const record = requireRecord(value, "BROWSER_SOURCE_RECEIPT_NOT_RECORD");
  requireExactKeys(record, [
    "processLocalBrandVerifiedBeforeProjection",
    "receiptSha256",
    "requestSha256",
    "resolverVersion",
    "schemaVersion",
    "structuredClonePreservesSourceBrand"
  ], "BROWSER_SOURCE_RECEIPT_SHAPE_INVALID");
  if (record.schemaVersion !== "hakimi.western-civil-time-fact-receipt/0.1-draft"
    || record.resolverVersion !== "0.1.0-draft.1"
    || typeof record.receiptSha256 !== "string" || !SHA256_PATTERN.test(record.receiptSha256)
    || record.requestSha256 !== expectedRequestSha256
    || record.processLocalBrandVerifiedBeforeProjection !== true
    || record.structuredClonePreservesSourceBrand !== false) {
    throw new Error("BROWSER_SOURCE_RECEIPT_INVALID");
  }
}

type ValidatedDeclaredCivilTime = Readonly<{
  date: string;
  time: string;
  timePrecision: "exact_minute" | "exact_second";
  timeZoneToken: string;
  requestedDstDisambiguation: "reject" | "earlier" | "later";
  localEpochMilliseconds: number;
}>;

function validateDeclaredCivilTime(value: unknown): ValidatedDeclaredCivilTime {
  const record = requireRecord(value, "BROWSER_CIVIL_TIME_NOT_RECORD");
  requireExactKeys(record, [
    "canonicalZoneIdentityEstablished",
    "date",
    "requestedDstDisambiguation",
    "time",
    "timePrecision",
    "timeZoneToken"
  ], "BROWSER_CIVIL_TIME_SHAPE_INVALID");
  const date = requireString(record.date, "BROWSER_CIVIL_DATE_INVALID");
  const time = requireString(record.time, "BROWSER_CIVIL_TIME_INVALID");
  const timeZoneToken = requireString(record.timeZoneToken, "BROWSER_CIVIL_ZONE_INVALID");
  if ((record.timePrecision !== "exact_minute" && record.timePrecision !== "exact_second")
    || (record.requestedDstDisambiguation !== "reject"
      && record.requestedDstDisambiguation !== "earlier"
      && record.requestedDstDisambiguation !== "later")
    || record.canonicalZoneIdentityEstablished !== false) {
    throw new Error("BROWSER_CIVIL_TIME_INVALID");
  }
  if (timeZoneToken.length > 120 || !IANA_TIME_ZONE_PATTERN.test(timeZoneToken)) {
    throw new Error("BROWSER_CIVIL_ZONE_INVALID");
  }
  const timePrecision = record.timePrecision;
  const requestedDstDisambiguation = record.requestedDstDisambiguation;
  const localEpochMilliseconds = projectDeclaredLocalEpoch(date, time, timePrecision);
  return { date, time, timePrecision, timeZoneToken, requestedDstDisambiguation, localEpochMilliseconds };
}

type KnownTzdbBinding = typeof WESTERN_CIVIL_BROWSER_TZDB_BINDINGS[number];

function validateTzdbBinding(value: unknown): KnownTzdbBinding {
  const record = requireRecord(value, "BROWSER_TZDB_NOT_RECORD");
  requireExactKeys(record, [
    "adapter", "artifactName", "dataSha256", "ianaVersion", "kind",
    "resolver", "schemaVersion", "snapshotId", "supportedRange"
  ], "BROWSER_TZDB_SHAPE_INVALID");
  const snapshotId = requireString(record.snapshotId, "BROWSER_TZDB_IDENTITY_INVALID");
  if (typeof record.dataSha256 !== "string" || !SHA256_PATTERN.test(record.dataSha256)) {
    throw new Error("BROWSER_TZDB_DIGEST_INVALID");
  }
  const adapter = requireRecord(record.adapter, "BROWSER_TZDB_TOOL_NOT_RECORD");
  const resolver = requireRecord(record.resolver, "BROWSER_TZDB_TOOL_NOT_RECORD");
  requireExactKeys(adapter, ["name", "version"], "BROWSER_TZDB_TOOL_SHAPE_INVALID");
  requireExactKeys(resolver, ["name", "version"], "BROWSER_TZDB_TOOL_SHAPE_INVALID");
  const range = requireRecord(record.supportedRange, "BROWSER_TZDB_RANGE_NOT_RECORD");
  requireExactKeys(range, ["from", "to"], "BROWSER_TZDB_RANGE_SHAPE_INVALID");
  const expected = WESTERN_CIVIL_BROWSER_TZDB_BINDINGS.find((entry) => entry.snapshotId === snapshotId);
  if (!expected
    || record.schemaVersion !== expected.schemaVersion
    || record.kind !== expected.kind
    || record.ianaVersion !== expected.ianaVersion
    || record.artifactName !== expected.artifactName
    || record.dataSha256 !== expected.dataSha256
    || resolver.name !== expected.resolver.name
    || resolver.version !== expected.resolver.version
    || adapter.name !== expected.adapter.name
    || adapter.version !== expected.adapter.version
    || range.from !== expected.supportedRange.from
    || range.to !== expected.supportedRange.to) {
    throw new Error("BROWSER_TZDB_IDENTITY_INVALID");
  }
  return expected;
}

function validateResolution(
  value: unknown,
  declared: ValidatedDeclaredCivilTime,
  tzdbBinding: KnownTzdbBinding
): void {
  const record = requireRecord(value, "BROWSER_RESOLUTION_NOT_RECORD");
  requireExactKeys(record, [
    "decision",
    "epochMilliseconds",
    "kind",
    "localEpochMilliseconds",
    "requestedLocalTimeRoundTripVerified",
    "utcInstant",
    "utcInstantPrecision",
    "utcOffsetSeconds",
    "utcOffsetSignConvention"
  ], "BROWSER_RESOLUTION_SHAPE_INVALID");
  if ((record.kind !== "unique" && record.kind !== "overlap")
    || (record.decision !== "unique" && record.decision !== "earlier" && record.decision !== "later")
    || (record.utcInstantPrecision !== "exact_minute" && record.utcInstantPrecision !== "exact_second")
    || record.utcOffsetSignConvention !== "east_positive"
    || record.requestedLocalTimeRoundTripVerified !== true) {
    throw new Error("BROWSER_RESOLUTION_INVALID");
  }
  requireString(record.utcInstant, "BROWSER_RESOLUTION_UTC_INVALID");
  const localEpochMilliseconds = requireFiniteNumber(
    record.localEpochMilliseconds,
    "BROWSER_RESOLUTION_LOCAL_EPOCH_INVALID"
  );
  const epochMilliseconds = requireFiniteNumber(
    record.epochMilliseconds,
    "BROWSER_RESOLUTION_EPOCH_INVALID"
  );
  const utcOffsetSeconds = requireFiniteNumber(
    record.utcOffsetSeconds,
    "BROWSER_RESOLUTION_OFFSET_INVALID"
  );
  if (!Number.isSafeInteger(localEpochMilliseconds)
    || !Number.isSafeInteger(epochMilliseconds)
    || !Number.isSafeInteger(utcOffsetSeconds)
    || Math.abs(utcOffsetSeconds) >= 86_400
    || localEpochMilliseconds !== declared.localEpochMilliseconds
    || record.utcInstantPrecision !== declared.timePrecision
    || declared.date < tzdbBinding.supportedRange.from
    || declared.date > tzdbBinding.supportedRange.to
    || (record.kind === "unique" && record.decision !== "unique")
    || (record.kind === "overlap" && record.decision !== "earlier" && record.decision !== "later")
    || (record.kind === "overlap" && record.decision !== declared.requestedDstDisambiguation)
    || epochMilliseconds + utcOffsetSeconds * 1_000 !== localEpochMilliseconds) {
    throw new Error("BROWSER_RESOLUTION_ARITHMETIC_INVALID");
  }
  let expectedUtcInstant: string;
  try {
    expectedUtcInstant = new Date(epochMilliseconds).toISOString();
  } catch {
    throw new Error("BROWSER_RESOLUTION_UTC_INVALID");
  }
  if (record.utcInstant !== expectedUtcInstant) throw new Error("BROWSER_RESOLUTION_UTC_INVALID");
}

function projectDeclaredLocalEpoch(
  date: string,
  time: string,
  precision: "exact_minute" | "exact_second"
): number {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(date);
  const timeMatch = precision === "exact_minute"
    ? /^(\d{2}):(\d{2})$/u.exec(time)
    : /^(\d{2}):(\d{2}):(\d{2})$/u.exec(time);
  if (!dateMatch || !timeMatch) throw new Error("BROWSER_CIVIL_TIME_INVALID");
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = precision === "exact_second" ? Number(timeMatch[3]) : 0;
  const localEpochMilliseconds = Date.UTC(year, month - 1, day, hour, minute, second, 0);
  const projected = new Date(localEpochMilliseconds);
  if (!Number.isSafeInteger(localEpochMilliseconds)
    || projected.getUTCFullYear() !== year
    || projected.getUTCMonth() !== month - 1
    || projected.getUTCDate() !== day
    || projected.getUTCHours() !== hour
    || projected.getUTCMinutes() !== minute
    || projected.getUTCSeconds() !== second) {
    throw new Error("BROWSER_CIVIL_TIME_INVALID");
  }
  return localEpochMilliseconds;
}

function validateExcludedProducts(value: unknown): void {
  if (!Array.isArray(value) || value.length !== WESTERN_CIVIL_BROWSER_EXCLUDED_PRODUCTS.length
    || value.some((entry, index) => entry !== WESTERN_CIVIL_BROWSER_EXCLUDED_PRODUCTS[index])) {
    throw new Error("BROWSER_EXCLUDED_PRODUCTS_INVALID");
  }
}

function validateExactConstantObject(value: unknown, expected: object, code: string): void {
  const record = requireRecord(value, code);
  const expectedRecord = expected as Record<string, unknown>;
  requireExactKeys(record, Object.keys(expectedRecord), code);
  for (const key of Object.keys(expectedRecord)) {
    if (record[key] !== expectedRecord[key]) throw new Error(code);
  }
}

export const testOnly = Object.freeze({
  PROJECT_GOVERNANCE_CONTEXT,
  WESTERN_AUTHORITY_BOUNDARY,
  DATA_HANDLING_BOUNDARY,
  OPERATION_BOUNDARY,
  WESTERN_CIVIL_BROWSER_TZDB_BINDINGS
});
