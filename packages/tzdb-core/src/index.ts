import moment from "moment-timezone";
import {
  TzdbArtifactError,
  createCurrentTzdbResolver,
  createPackedTzdbResolver,
  type BundledLocalResolution,
  type BundledTzdbResolver,
  type BundledZoneCandidate,
  type BundledZoneProjection,
  type TzdbArtifactErrorCode
} from "./packed-resolver.ts";

export {
  TzdbArtifactError,
  type BundledLocalResolution,
  type BundledTzdbResolver,
  type BundledZoneCandidate,
  type BundledZoneProjection,
  type TzdbArtifactErrorCode
} from "./packed-resolver.ts";

const RESOLVER = Object.freeze({ name: "hakimi-tzdb-core" as const, version: "1.0.0" as const });
const ADAPTER = Object.freeze({ name: "moment-timezone" as const, version: "0.6.3" as const });
const SUPPORTED_RANGE = Object.freeze({ from: "1900-01-01" as const, to: "2100-12-31" as const });

export const BUNDLED_TZDB_ARTIFACT = Object.freeze({
  schemaVersion: "1.0.0" as const,
  kind: "bundled_iana_tzdb" as const,
  ianaVersion: "2026c" as const,
  artifactName: "moment-timezone/data/packed/latest.json" as const,
  dataSha256: "43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81" as const,
  resolver: RESOLVER,
  adapter: ADAPTER,
  supportedRange: SUPPORTED_RANGE
});

export const BUNDLED_TZDB_SNAPSHOT_ID =
  "iana-tzdb@2026c/sha256:43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81" +
  "/hakimi-tzdb-core@1.0.0/moment-timezone@0.6.3";

export type BundledTimeZoneDatabaseSnapshot = typeof BUNDLED_TZDB_ARTIFACT & {
  snapshotId: typeof BUNDLED_TZDB_SNAPSHOT_ID;
};

export const BUNDLED_TIME_ZONE_DATABASE: BundledTimeZoneDatabaseSnapshot = Object.freeze({
  ...BUNDLED_TZDB_ARTIFACT,
  snapshotId: BUNDLED_TZDB_SNAPSHOT_ID
});

export const RETAINED_TZDB_2025B_ARTIFACT = Object.freeze({
  schemaVersion: "1.0.0" as const,
  kind: "bundled_iana_tzdb" as const,
  ianaVersion: "2025b" as const,
  artifactName: "moment-timezone-2025b/data/packed/latest.json" as const,
  dataSha256: "b1ad1446fbc94459f86c8e3f4ffadfc4170ad2af9cbd2a9b85c75d5436ce6425" as const,
  resolver: RESOLVER,
  adapter: ADAPTER,
  supportedRange: SUPPORTED_RANGE
});

export const RETAINED_TZDB_2025B_SNAPSHOT_ID =
  "iana-tzdb@2025b/sha256:b1ad1446fbc94459f86c8e3f4ffadfc4170ad2af9cbd2a9b85c75d5436ce6425" +
  "/hakimi-tzdb-core@1.0.0/moment-timezone@0.6.3";

export type RetainedTimeZoneDatabase2025bSnapshot = typeof RETAINED_TZDB_2025B_ARTIFACT & {
  snapshotId: typeof RETAINED_TZDB_2025B_SNAPSHOT_ID;
};

export const RETAINED_TIME_ZONE_DATABASE_2025B: RetainedTimeZoneDatabase2025bSnapshot = Object.freeze({
  ...RETAINED_TZDB_2025B_ARTIFACT,
  snapshotId: RETAINED_TZDB_2025B_SNAPSHOT_ID
});

export type RegisteredTimeZoneDatabaseSnapshot =
  | BundledTimeZoneDatabaseSnapshot
  | RetainedTimeZoneDatabase2025bSnapshot;

/**
 * Append-only official artifact registry. Every future web/APK build must keep
 * emitting every entry so old identified records remain replayable offline.
 */
export const BUNDLED_TZDB_ARTIFACT_REGISTRY = Object.freeze([
  BUNDLED_TIME_ZONE_DATABASE,
  RETAINED_TIME_ZONE_DATABASE_2025B
] as const);

export function getBundledTzdbArtifactSnapshot(snapshotId: string): RegisteredTimeZoneDatabaseSnapshot | null {
  return BUNDLED_TZDB_ARTIFACT_REGISTRY.find((snapshot) => snapshot.snapshotId === snapshotId) ?? null;
}

export function hasBundledTzdbArtifact(snapshotId: string): boolean {
  return getBundledTzdbArtifactSnapshot(snapshotId) !== null;
}

const CURRENT_RESOLVER = createCurrentTzdbResolver(BUNDLED_TIME_ZONE_DATABASE);

/** Validates against the current bundled Zone/Link table, never against host Intl. */
export function isBundledTimeZoneName(timeZone: string): boolean {
  return CURRENT_RESOLVER.isTimeZoneName(timeZone);
}

/** Projects an absolute millisecond into the current bundled IANA release. */
export function projectEpochMilliseconds(
  epochMilliseconds: number,
  timeZone: string
): BundledZoneProjection {
  return CURRENT_RESOLVER.projectEpochMilliseconds(epochMilliseconds, timeZone);
}

/**
 * Resolves a Gregorian wall-clock value represented as if it were UTC using
 * the current bundled IANA release.
 */
export function resolveLocalEpochMilliseconds(
  localEpochMilliseconds: number,
  timeZone: string
): BundledLocalResolution {
  return CURRENT_RESOLVER.resolveLocalEpochMilliseconds(localEpochMilliseconds, timeZone);
}

type ArtifactSentinel = readonly [timeZone: string, epochMilliseconds: number, expectedOffsetSeconds: number];

const CURRENT_ARTIFACT_SENTINELS: readonly ArtifactSentinel[] = [
  ["Asia/Shanghai", Date.parse("1900-01-01T00:00:00Z"), 29_143],
  ["America/Vancouver", Date.parse("2027-01-15T00:00:00Z"), -25_200],
  ["America/Edmonton", Date.parse("2027-01-15T00:00:00Z"), -21_600],
  ["Africa/Casablanca", Date.parse("2026-10-01T00:00:00Z"), 0]
];

const RETAINED_2025B_SENTINELS: readonly ArtifactSentinel[] = [
  ["Asia/Shanghai", Date.parse("1900-01-01T00:00:00Z"), 29_143],
  ["America/Vancouver", Date.parse("2027-01-15T00:00:00Z"), -28_800],
  ["America/Edmonton", Date.parse("2027-01-15T00:00:00Z"), -25_200],
  ["Africa/Casablanca", Date.parse("2026-10-01T00:00:00Z"), 3_600]
];

function assertResolverSentinels(
  resolver: BundledTzdbResolver,
  sentinels: readonly ArtifactSentinel[]
): void {
  for (const [timeZone, epochMilliseconds, expectedOffsetSeconds] of sentinels) {
    const actual = resolver.projectEpochMilliseconds(epochMilliseconds, timeZone).offsetSeconds;
    if (actual !== expectedOffsetSeconds) {
      throw new TzdbArtifactError(
        "TZDB_ARTIFACT_MISMATCH",
        `时区工件 ${resolver.snapshot.ianaVersion} 哨兵 ${timeZone} 漂移：期望 ${expectedOffsetSeconds}，得到 ${actual}。`
      );
    }
  }
}

/** Fail-closed startup check for duplicate, stale, or truncated current data. */
export function assertBundledTzdbArtifact(): BundledTimeZoneDatabaseSnapshot {
  if (
    moment.tz.version !== BUNDLED_TZDB_ARTIFACT.adapter.version ||
    moment.tz.dataVersion !== BUNDLED_TZDB_ARTIFACT.ianaVersion
  ) {
    throw new TzdbArtifactError(
      "TZDB_ARTIFACT_MISMATCH",
      `时区依赖身份不符：resolver=${moment.tz.version} data=${moment.tz.dataVersion}。`
    );
  }
  assertResolverSentinels(CURRENT_RESOLVER, CURRENT_ARTIFACT_SENTINELS);
  return BUNDLED_TIME_ZONE_DATABASE;
}

let retained2025bResolverPromise: Promise<
  BundledTzdbResolver<RetainedTimeZoneDatabase2025bSnapshot>
> | null = null;

async function loadRetained2025bResolver(): Promise<
  BundledTzdbResolver<RetainedTimeZoneDatabase2025bSnapshot>
> {
  retained2025bResolverPromise ??= import("./artifacts/iana-2025b.ts").then(({ default: data }) => {
    const resolver = createPackedTzdbResolver(RETAINED_TIME_ZONE_DATABASE_2025B, data);
    assertResolverSentinels(resolver, RETAINED_2025B_SENTINELS);
    return resolver;
  });
  return retained2025bResolverPromise;
}

/**
 * Loads an isolated resolver by content-addressed snapshot. Loading 2025b does
 * not call moment.tz.load(), mutate the current 2026c singleton, or use host Intl.
 */
export async function loadBundledTzdbResolver(
  snapshotId: string
): Promise<BundledTzdbResolver<RegisteredTimeZoneDatabaseSnapshot>> {
  if (snapshotId === BUNDLED_TZDB_SNAPSHOT_ID) {
    assertBundledTzdbArtifact();
    return CURRENT_RESOLVER;
  }
  if (snapshotId === RETAINED_TZDB_2025B_SNAPSHOT_ID) return loadRetained2025bResolver();
  throw new TzdbArtifactError(
    "TZDB_ARTIFACT_UNAVAILABLE",
    `应用未保留内容寻址时区工件 ${snapshotId}，不能用其他版本替代复算。`
  );
}

export async function verifyBundledTzdbArtifactRegistry(): Promise<readonly RegisteredTimeZoneDatabaseSnapshot[]> {
  await Promise.all(BUNDLED_TZDB_ARTIFACT_REGISTRY.map((snapshot) => (
    loadBundledTzdbResolver(snapshot.snapshotId)
  )));
  return BUNDLED_TZDB_ARTIFACT_REGISTRY;
}
