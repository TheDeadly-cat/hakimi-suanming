import { describe, expect, it } from "vitest";
import {
  BUNDLED_TZDB_ARTIFACT_REGISTRY,
  BUNDLED_TIME_ZONE_DATABASE,
  RETAINED_TIME_ZONE_DATABASE_2025B,
  TzdbArtifactError,
  assertBundledTzdbArtifact,
  getBundledTzdbArtifactSnapshot,
  isBundledTimeZoneName,
  loadBundledTzdbResolver,
  projectEpochMilliseconds,
  resolveLocalEpochMilliseconds
} from "./index";

describe("bundled tzdb artifact", () => {
  it("locks the IANA release, resolver, and content digest", () => {
    expect(assertBundledTzdbArtifact()).toEqual(BUNDLED_TIME_ZONE_DATABASE);
    expect(BUNDLED_TIME_ZONE_DATABASE).toMatchObject({
      ianaVersion: "2026c",
      dataSha256: "43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81",
      adapter: { name: "moment-timezone", version: "0.6.3" }
    });
  });

  it("validates names from the bundled Zone/Link table", () => {
    expect(isBundledTimeZoneName("Asia/Shanghai")).toBe(true);
    expect(isBundledTimeZoneName("US/Eastern")).toBe(true);
    expect(isBundledTimeZoneName("Mars/Olympus_Mons")).toBe(false);
  });

  it("preserves Shanghai's historical second offset", () => {
    expect(projectEpochMilliseconds(Date.parse("1900-01-01T00:00:00Z"), "Asia/Shanghai"))
      .toMatchObject({ offsetSeconds: 29_143 });
  });

  it("resolves a unique wall time", () => {
    const local = Date.UTC(2024, 0, 15, 12, 0, 0);
    const result = resolveLocalEpochMilliseconds(local, "America/New_York");
    expect(result.kind).toBe("unique");
    expect(result.candidates).toHaveLength(1);
    expect(new Date(result.candidates[0]!.epochMilliseconds).toISOString()).toBe("2024-01-15T17:00:00.000Z");
  });

  it("returns both overlap folds in instant order", () => {
    const local = Date.UTC(2024, 10, 3, 1, 30, 0);
    const result = resolveLocalEpochMilliseconds(local, "America/New_York");
    expect(result.kind).toBe("overlap");
    expect(result.candidates.map((candidate) => [
      new Date(candidate.epochMilliseconds).toISOString(),
      candidate.offsetSeconds,
      candidate.matchesRequestedLocalTime
    ])).toEqual([
      ["2024-11-03T05:30:00.000Z", -14_400, true],
      ["2024-11-03T06:30:00.000Z", -18_000, true]
    ]);
  });

  it("keeps both non-matching sides of a gap without shifting the request", () => {
    const local = Date.UTC(2024, 2, 10, 2, 30, 0);
    const result = resolveLocalEpochMilliseconds(local, "America/New_York");
    expect(result.kind).toBe("gap");
    expect(result.candidates.map((candidate) => [
      new Date(candidate.epochMilliseconds).toISOString(),
      new Date(candidate.localEpochMilliseconds).toISOString(),
      candidate.offsetSeconds,
      candidate.matchesRequestedLocalTime
    ])).toEqual([
      ["2024-03-10T06:30:00.000Z", "2024-03-10T01:30:00.000Z", -18_000, false],
      ["2024-03-10T07:30:00.000Z", "2024-03-10T03:30:00.000Z", -14_400, false]
    ]);
  });

  it("preserves Lord Howe's 30-minute folds and gaps", () => {
    const overlap = resolveLocalEpochMilliseconds(Date.UTC(2024, 3, 7, 1, 45), "Australia/Lord_Howe");
    expect(overlap.kind).toBe("overlap");
    expect(overlap.candidates.map((candidate) => candidate.offsetSeconds)).toEqual([39_600, 37_800]);

    const gap = resolveLocalEpochMilliseconds(Date.UTC(2024, 9, 6, 2, 15), "Australia/Lord_Howe");
    expect(gap.kind).toBe("gap");
    expect(gap.candidates.map((candidate) => candidate.offsetSeconds)).toEqual([37_800, 39_600]);
  });

  it("preserves Apia's 2011 date-line gap", () => {
    const gap = resolveLocalEpochMilliseconds(Date.UTC(2011, 11, 30, 12, 0), "Pacific/Apia");
    expect(gap.kind).toBe("gap");
    expect(gap.candidates.map((candidate) => [
      new Date(candidate.epochMilliseconds).toISOString(),
      new Date(candidate.localEpochMilliseconds).toISOString(),
      candidate.offsetSeconds
    ])).toEqual([
      ["2011-12-29T22:00:00.000Z", "2011-12-29T12:00:00.000Z", -36_000],
      ["2011-12-30T22:00:00.000Z", "2011-12-31T12:00:00.000Z", 50_400]
    ]);
  });

  it("captures 2026c policy changes independently of host Intl", () => {
    expect(projectEpochMilliseconds(Date.parse("2027-01-15T00:00:00Z"), "America/Vancouver").offsetSeconds)
      .toBe(-25_200);
    expect(projectEpochMilliseconds(Date.parse("2027-01-15T00:00:00Z"), "America/Edmonton").offsetSeconds)
      .toBe(-21_600);
    expect(projectEpochMilliseconds(Date.parse("2026-10-01T00:00:00Z"), "Africa/Casablanca").offsetSeconds)
      .toBe(0);
  });

  it("does not consult host Intl for named-zone calculations", () => {
    const original = Intl.DateTimeFormat;
    Object.defineProperty(Intl, "DateTimeFormat", {
      configurable: true,
      value: function ForbiddenHostIntl() {
        throw new Error("host Intl must not be used by tzdb-core");
      }
    });
    try {
      expect(projectEpochMilliseconds(Date.parse("2024-01-01T00:00:00Z"), "Asia/Shanghai").offsetSeconds)
        .toBe(28_800);
      expect(resolveLocalEpochMilliseconds(Date.UTC(2024, 10, 3, 1, 30), "America/New_York").kind)
        .toBe("overlap");
    } finally {
      Object.defineProperty(Intl, "DateTimeFormat", { configurable: true, value: original });
    }
  });

  it("keeps an append-only registry with two real identified artifacts", () => {
    expect(BUNDLED_TZDB_ARTIFACT_REGISTRY.map((snapshot) => snapshot.ianaVersion)).toEqual([
      "2026c",
      "2025b"
    ]);
    expect(getBundledTzdbArtifactSnapshot(RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId)).toEqual(
      RETAINED_TIME_ZONE_DATABASE_2025B
    );
    expect(new Set(BUNDLED_TZDB_ARTIFACT_REGISTRY.map((snapshot) => snapshot.snapshotId)).size).toBe(2);
  });

  it("replays a real 2025b→2026c behavior change without mutating the current resolver", async () => {
    const current = await loadBundledTzdbResolver(BUNDLED_TIME_ZONE_DATABASE.snapshotId);
    const retained = await loadBundledTzdbResolver(RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId);
    const instant = Date.parse("2026-10-01T00:00:00Z");

    expect(retained.projectEpochMilliseconds(instant, "Africa/Casablanca").offsetSeconds).toBe(3_600);
    expect(current.projectEpochMilliseconds(instant, "Africa/Casablanca").offsetSeconds).toBe(0);
    expect(projectEpochMilliseconds(instant, "Africa/Casablanca").offsetSeconds).toBe(0);
  });

  it("keeps concurrent A/B/A replay deterministic and isolated", async () => {
    const [current, retained] = await Promise.all([
      loadBundledTzdbResolver(BUNDLED_TIME_ZONE_DATABASE.snapshotId),
      loadBundledTzdbResolver(RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId)
    ]);
    const instant = Date.parse("2027-01-15T00:00:00Z");
    const results = await Promise.all(Array.from({ length: 100 }, async (_, index) => {
      const resolver = index % 2 === 0 ? current : retained;
      return resolver.projectEpochMilliseconds(instant, "America/Vancouver").offsetSeconds;
    }));

    expect(results.filter((_, index) => index % 2 === 0)).toEqual(Array(50).fill(-25_200));
    expect(results.filter((_, index) => index % 2 === 1)).toEqual(Array(50).fill(-28_800));
    expect(current.projectEpochMilliseconds(instant, "America/Vancouver").offsetSeconds).toBe(-25_200);
  });

  it("fails closed when an identified artifact is not retained", async () => {
    await expect(loadBundledTzdbResolver(
      "iana-tzdb@2024b/sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
      "/hakimi-tzdb-core@1.0.0/moment-timezone@0.6.3"
    )).rejects.toMatchObject({ code: "TZDB_ARTIFACT_UNAVAILABLE" } satisfies Partial<TzdbArtifactError>);
  });
});
