import moment from "moment-timezone";

export type PackedTzdbData = {
  version: string;
  zones: string[];
  links: string[];
  countries?: string[];
};

export type TimeZoneDatabaseSnapshotReference = {
  snapshotId: string;
  ianaVersion: string;
};

export type BundledZoneProjection = {
  epochMilliseconds: number;
  localEpochMilliseconds: number;
  offsetSeconds: number;
};

export type BundledZoneCandidate = BundledZoneProjection & {
  matchesRequestedLocalTime: boolean;
};

export type BundledLocalResolution = {
  kind: "unique" | "overlap" | "gap";
  candidates: BundledZoneCandidate[];
};

export type TzdbArtifactErrorCode =
  | "TZDB_ARTIFACT_MISMATCH"
  | "TZDB_ARTIFACT_UNAVAILABLE"
  | "TZDB_UNKNOWN_ZONE"
  | "TZDB_LOCAL_RESOLUTION_FAILED";

export class TzdbArtifactError extends Error {
  readonly code: TzdbArtifactErrorCode;

  constructor(code: TzdbArtifactErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "TzdbArtifactError";
    this.code = code;
  }
}

export type BundledTzdbResolver<TSnapshot extends TimeZoneDatabaseSnapshotReference = TimeZoneDatabaseSnapshotReference> = {
  readonly snapshot: TSnapshot;
  isTimeZoneName(timeZone: string): boolean;
  projectEpochMilliseconds(epochMilliseconds: number, timeZone: string): BundledZoneProjection;
  resolveLocalEpochMilliseconds(localEpochMilliseconds: number, timeZone: string): BundledLocalResolution;
};

type ZoneLookup = (timeZone: string) => moment.MomentZone | null;

function requireZone(
  lookup: ZoneLookup,
  snapshot: TimeZoneDatabaseSnapshotReference,
  timeZone: string
): moment.MomentZone {
  const zone = lookup(timeZone);
  if (!zone) {
    throw new TzdbArtifactError(
      "TZDB_UNKNOWN_ZONE",
      `固定 tzdb ${snapshot.ianaVersion} 不包含 IANA 时区 ${timeZone}。`
    );
  }
  return zone;
}

function offsetSecondsAt(zone: moment.MomentZone, epochMilliseconds: number): number {
  const value = -zone.utcOffset(epochMilliseconds) * 60;
  const rounded = Math.round(value);
  if (!Number.isFinite(value) || Math.abs(value - rounded) > 1e-7) {
    throw new TzdbArtifactError("TZDB_ARTIFACT_MISMATCH", "固定 tzdb 返回了无法表达为整秒的 UTC 偏移。");
  }
  return rounded === 0 ? 0 : rounded;
}

function projectWithLookup(
  lookup: ZoneLookup,
  snapshot: TimeZoneDatabaseSnapshotReference,
  epochMilliseconds: number,
  timeZone: string
): BundledZoneProjection {
  if (!Number.isSafeInteger(epochMilliseconds)) {
    throw new TzdbArtifactError("TZDB_LOCAL_RESOLUTION_FAILED", "瞬时点必须能精确表达为安全整数毫秒。");
  }
  const zone = requireZone(lookup, snapshot, timeZone);
  const offsetSeconds = offsetSecondsAt(zone, epochMilliseconds);
  return {
    epochMilliseconds,
    localEpochMilliseconds: epochMilliseconds + offsetSeconds * 1_000,
    offsetSeconds
  };
}

function nearbyOffsets(zone: moment.MomentZone, localEpochMilliseconds: number): number[] {
  const radius = 48 * 60 * 60 * 1_000;
  return [...new Set([
    zone.utcOffset(localEpochMilliseconds - radius),
    zone.utcOffset(localEpochMilliseconds),
    zone.utcOffset(localEpochMilliseconds + radius)
  ])];
}

function resolveWithLookup(
  lookup: ZoneLookup,
  snapshot: TimeZoneDatabaseSnapshotReference,
  localEpochMilliseconds: number,
  timeZone: string
): BundledLocalResolution {
  if (!Number.isSafeInteger(localEpochMilliseconds)) {
    throw new TzdbArtifactError("TZDB_LOCAL_RESOLUTION_FAILED", "民用墙时必须能精确表达为安全整数毫秒。");
  }
  const zone = requireZone(lookup, snapshot, timeZone);
  const candidatesByInstant = new Map<number, BundledZoneCandidate>();
  for (const westOfUtcMinutes of nearbyOffsets(zone, localEpochMilliseconds)) {
    const epochMilliseconds = localEpochMilliseconds + westOfUtcMinutes * 60_000;
    if (!Number.isSafeInteger(epochMilliseconds)) continue;
    const projection = projectWithLookup(lookup, snapshot, epochMilliseconds, timeZone);
    candidatesByInstant.set(epochMilliseconds, {
      ...projection,
      matchesRequestedLocalTime: projection.localEpochMilliseconds === localEpochMilliseconds
    });
  }
  const candidates = [...candidatesByInstant.values()].sort(
    (left, right) => left.epochMilliseconds - right.epochMilliseconds
  );
  const matching = candidates.filter((candidate) => candidate.matchesRequestedLocalTime);
  if (matching.length === 1) return { kind: "unique", candidates: matching };
  if (matching.length === 2) return { kind: "overlap", candidates: matching };
  if (matching.length === 0 && candidates.length === 2) return { kind: "gap", candidates };
  throw new TzdbArtifactError(
    "TZDB_LOCAL_RESOLUTION_FAILED",
    `固定 tzdb ${snapshot.ianaVersion} 无法把 ${timeZone} 的民用墙时归一为唯一、重叠或空档候选。`
  );
}

function createResolver<TSnapshot extends TimeZoneDatabaseSnapshotReference>(
  snapshot: TSnapshot,
  lookup: ZoneLookup
): BundledTzdbResolver<TSnapshot> {
  return Object.freeze({
    snapshot,
    isTimeZoneName: (timeZone: string) => lookup(timeZone) !== null,
    projectEpochMilliseconds: (epochMilliseconds: number, timeZone: string) => (
      projectWithLookup(lookup, snapshot, epochMilliseconds, timeZone)
    ),
    resolveLocalEpochMilliseconds: (localEpochMilliseconds: number, timeZone: string) => (
      resolveWithLookup(lookup, snapshot, localEpochMilliseconds, timeZone)
    )
  });
}

function normalizeName(name: string): string {
  return name.toLocaleLowerCase("en-US").replaceAll("/", "_");
}

function buildPackedLookup(data: PackedTzdbData): ZoneLookup {
  const packedZones = new Map<string, string>();
  const links = new Map<string, Set<string>>();
  for (const packedZone of data.zones) {
    const separator = packedZone.indexOf("|");
    if (separator <= 0) {
      throw new TzdbArtifactError("TZDB_ARTIFACT_MISMATCH", "固定 tzdb 含有非法 packed Zone 条目。");
    }
    packedZones.set(normalizeName(packedZone.slice(0, separator)), packedZone);
  }
  for (const packedLink of data.links) {
    const [left, right, ...extra] = packedLink.split("|");
    if (!left || !right || extra.length > 0) {
      throw new TzdbArtifactError("TZDB_ARTIFACT_MISMATCH", "固定 tzdb 含有非法 Zone Link 条目。");
    }
    const leftKey = normalizeName(left);
    const rightKey = normalizeName(right);
    const leftLinks = links.get(leftKey) ?? new Set<string>();
    const rightLinks = links.get(rightKey) ?? new Set<string>();
    leftLinks.add(rightKey);
    rightLinks.add(leftKey);
    links.set(leftKey, leftLinks);
    links.set(rightKey, rightLinks);
  }

  const zones = new Map<string, moment.MomentZone>();
  const ZoneConstructor = moment.tz.Zone as unknown as new (packedZone?: string) => moment.MomentZone;
  const findPackedZone = (name: string): string | null => {
    const queue = [name];
    const visited = new Set<string>();
    while (queue.length > 0) {
      const candidate = queue.shift()!;
      if (visited.has(candidate)) continue;
      visited.add(candidate);
      const packed = packedZones.get(candidate);
      if (packed) return packed;
      for (const linked of links.get(candidate) ?? []) queue.push(linked);
    }
    return null;
  };

  return (timeZone: string) => {
    const normalized = normalizeName(timeZone);
    const cached = zones.get(normalized);
    if (cached) return cached;
    const packed = findPackedZone(normalized);
    if (!packed) return null;
    const zone = new ZoneConstructor(packed);
    zones.set(normalized, zone);
    return zone;
  };
}

export function createCurrentTzdbResolver<TSnapshot extends TimeZoneDatabaseSnapshotReference>(
  snapshot: TSnapshot
): BundledTzdbResolver<TSnapshot> {
  return createResolver(snapshot, (timeZone) => moment.tz.zone(timeZone));
}

export function createPackedTzdbResolver<TSnapshot extends TimeZoneDatabaseSnapshotReference>(
  snapshot: TSnapshot,
  data: PackedTzdbData
): BundledTzdbResolver<TSnapshot> {
  if (data.version !== snapshot.ianaVersion) {
    throw new TzdbArtifactError(
      "TZDB_ARTIFACT_MISMATCH",
      `固定 tzdb 描述符声明 ${snapshot.ianaVersion}，packed 数据实际为 ${data.version}。`
    );
  }
  if (!Array.isArray(data.zones) || data.zones.length < 300 || !Array.isArray(data.links)) {
    throw new TzdbArtifactError("TZDB_ARTIFACT_MISMATCH", "固定 tzdb 缺少完整 Zone/Link 数据。");
  }
  return createResolver(snapshot, buildPackedLookup(data));
}
