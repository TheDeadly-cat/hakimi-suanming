import { describe, expect, it, vi } from "vitest";
import {
  calculateChart,
  calculateChartForBundledSnapshot,
  calculateUnknownHourCandidates
} from "@hakimi/bazi-core";
import {
  LEGACY_HASH_SCHEMA_VERSION,
  LEGACY_UNIDENTIFIED_TZDB_VERSION,
  RESEARCH_SUBJECT_RECORD_VERSION,
  buildCalculatedChartHashPayload,
  buildUnknownHourCandidateHashPayload,
  buildTimeZoneDatabaseSnapshotId,
  coreBackupRevisionRecordSchema,
  type BirthInput,
  type CalculatedChart,
  type CandidateSetRecord,
  type RevisionRecord,
  type UnknownHourCandidateResult
} from "@hakimi/contracts";
import { sha256Hex } from "@hakimi/integrity";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { RETAINED_TIME_ZONE_DATABASE_2025B } from "@hakimi/tzdb-core";
import {
  CalculatedChartIntegrityError,
  classifyRevisionNatalReplay,
  replayRevisionNatalChart,
  verifyCandidateSetRecordIntegrity,
  verifyCalculatedChartIntegrity,
  verifyRevisionRecordIntegrity,
  verifyUnknownHourCandidateResultIntegrity
} from "./index";

const birth: BirthInput = {
  schemaVersion: "1.0.0",
  calendarType: "gregorian",
  date: "1995-08-18",
  time: "08:26",
  timePrecision: "exact_minute",
  timeZone: "Asia/Shanghai",
  sex: "male",
  lunarLeapMonth: false,
  location: { label: "上海", latitude: 31.2304, longitude: 121.4737, precision: "coordinates" },
  sourceNote: ""
};

function revisionFromChart(chart: CalculatedChart): RevisionRecord {
  return {
    schemaVersion: "1.0.0",
    id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222",
    revisionNumber: 1,
    createdAt: "2026-08-03T00:00:00.000Z",
    input: chart.input,
    timeCalibration: chart.timeCalibration,
    ruleProfile: chart.ruleProfile,
    ...(chart.rulePackBinding ? { rulePackBinding: chart.rulePackBinding } : {}),
    luckCycleRuleSnapshot: chart.luckCycleRuleSnapshot,
    facts: chart.facts,
    manifest: chart.manifest
  };
}

async function resignChart(chart: CalculatedChart): Promise<CalculatedChart> {
  chart.manifest.ruleProfileDigest = await sha256Hex(chart.ruleProfile);
  if (chart.luckCycleRuleSnapshot) {
    chart.manifest.luckCycleRuleDigest = await sha256Hex(chart.luckCycleRuleSnapshot);
  }
  chart.manifest.resultHash = await sha256Hex(buildCalculatedChartHashPayload(chart));
  return chart;
}

async function currentCandidateSetRecord(): Promise<CandidateSetRecord> {
  const candidateSet = await calculateUnknownHourCandidates(
    { ...birth, time: null, timePrecision: "unknown_hour" },
    WORKING_DEFAULT_RULE_PROFILE
  );
  return {
    schemaVersion: "1.0.0",
    recordVersion: RESEARCH_SUBJECT_RECORD_VERSION,
    recordType: "unknown_hour_candidate_set",
    id: "33333333-3333-4333-8333-333333333333",
    alias: "candidate integrity",
    tags: [],
    notes: "",
    favorite: false,
    deletedAt: null,
    createdAt: "2026-08-24T00:00:00.000Z",
    updatedAt: "2026-08-24T00:00:00.000Z",
    candidateSet,
    snapshotDigest: await sha256Hex(candidateSet)
  };
}

async function legacyHistoricalCandidateSet(
  source: UnknownHourCandidateResult
): Promise<UnknownHourCandidateResult> {
  const candidateSet = structuredClone(source);
  candidateSet.hashSchemaVersion = LEGACY_HASH_SCHEMA_VERSION;
  candidateSet.tzdbVersion = LEGACY_UNIDENTIFIED_TZDB_VERSION;
  delete candidateSet.timeZoneDatabase;
  candidateSet.input.timeZone = "Historical/Only";

  const charts = new Set<CalculatedChart>();
  for (const candidate of candidateSet.candidates) {
    candidate.timeCalibration.timeZone = "Historical/Only";
    if (candidate.chart) charts.add(candidate.chart);
    for (const variant of candidate.variants) charts.add(variant.chart);
  }
  for (const chart of charts) {
    chart.input.timeZone = "Historical/Only";
    chart.timeCalibration.timeZone = "Historical/Only";
    chart.manifest.hashSchemaVersion = LEGACY_HASH_SCHEMA_VERSION;
    chart.manifest.tzdbVersion = LEGACY_UNIDENTIFIED_TZDB_VERSION;
    delete chart.manifest.timeZoneDatabase;
    chart.manifest.resultHash = await sha256Hex(buildCalculatedChartHashPayload(chart));
  }
  for (const candidate of candidateSet.candidates) {
    for (const variant of candidate.variants) {
      variant.chartResultHash = variant.chart.manifest.resultHash;
    }
  }
  candidateSet.resultHash = await sha256Hex(buildUnknownHourCandidateHashPayload(candidateSet));
  return candidateSet;
}

describe("versioned chart integrity", () => {
  it("binds the full tzdb snapshot into hash v2", async () => {
    const chart = await calculateChart(birth, WORKING_DEFAULT_RULE_PROFILE);
    const snapshot = structuredClone(chart.manifest.timeZoneDatabase!);
    const changedDigest = `0${snapshot.dataSha256.slice(1)}`;
    snapshot.dataSha256 = changedDigest;
    snapshot.snapshotId = buildTimeZoneDatabaseSnapshotId(snapshot);
    const tampered: CalculatedChart = {
      ...chart,
      manifest: {
        ...chart.manifest,
        tzdbVersion: snapshot.snapshotId,
        timeZoneDatabase: snapshot
      }
    };
    await expect(verifyCalculatedChartIntegrity(tampered)).rejects.toMatchObject({
      code: "CALCULATED_CHART_INTEGRITY_MISMATCH",
      mismatch: "result"
    } satisfies Partial<CalculatedChartIntegrityError>);
  });

  it("continues to verify frozen hash v1 charts with their historical payload", async () => {
    const current = await calculateChart(birth, WORKING_DEFAULT_RULE_PROFILE);
    const legacy: CalculatedChart = {
      ...current,
      manifest: {
        ...current.manifest,
        hashSchemaVersion: LEGACY_HASH_SCHEMA_VERSION,
        tzdbVersion: LEGACY_UNIDENTIFIED_TZDB_VERSION,
        timeZoneDatabase: undefined,
        resultHash: "0".repeat(64)
      }
    };
    legacy.manifest.resultHash = await sha256Hex(buildCalculatedChartHashPayload(legacy));
    await expect(verifyCalculatedChartIntegrity(legacy)).resolves.toEqual(legacy);
  });
});

describe("Revision natal read-only replay", () => {
  it("classifies and exactly replays the current 2026c executor and artifact", async () => {
    const revision = revisionFromChart(await calculateChart(birth, WORKING_DEFAULT_RULE_PROFILE));

    await expect(classifyRevisionNatalReplay(revision)).resolves.toMatchObject({
      status: "replayable_exact",
      artifactRole: "current",
      executorId: "hakimi-bazi-core:natal-chart-executor:0.4.0"
    });
    const projection = await replayRevisionNatalChart(revision);
    expect(projection.status).toBe("matched");
    expect(projection.changedFields).toEqual([]);
    expect(projection.storedResultHash).toBe(revision.manifest.resultHash);
    expect(projection.replayedResultHash).toBe(revision.manifest.resultHash);
  });

  it("exactly replays a retained 2025b Casablanca Revision without falling back to 2026c", async () => {
    const casablanca = {
      ...birth,
      date: "2026-10-01",
      time: "12:00",
      timeZone: "Africa/Casablanca"
    } satisfies BirthInput;
    const chart = await calculateChartForBundledSnapshot(
      casablanca,
      WORKING_DEFAULT_RULE_PROFILE,
      RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId,
      { expectedTimeZoneDatabase: RETAINED_TIME_ZONE_DATABASE_2025B }
    );
    const revision = revisionFromChart(chart);

    await expect(classifyRevisionNatalReplay(revision)).resolves.toMatchObject({
      status: "replayable_exact",
      artifactRole: "retained"
    });
    const projection = await replayRevisionNatalChart(revision);
    expect(projection.status).toBe("matched");
    expect(projection.changedFields).toEqual([]);
    expect(projection.storedResultHash).toBe(revision.manifest.resultHash);
    expect(projection.replayedResultHash).toBe(revision.manifest.resultHash);
    expect(projection.timeZoneDatabase).toEqual(RETAINED_TIME_ZONE_DATABASE_2025B);
    expect(projection.replayedChart.timeCalibration.utcOffset).toBe("+01:00");
    expect(projection.replayedChart.manifest.tzdbVersion).toBe(RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId);
  });

  it("keeps frozen hash-v1 records integrity-only instead of guessing a tzdb", async () => {
    const chart = structuredClone(await calculateChart(birth, WORKING_DEFAULT_RULE_PROFILE));
    chart.manifest.hashSchemaVersion = LEGACY_HASH_SCHEMA_VERSION;
    chart.manifest.tzdbVersion = LEGACY_UNIDENTIFIED_TZDB_VERSION;
    delete chart.manifest.timeZoneDatabase;
    await resignChart(chart);
    const revision = revisionFromChart(chart);

    await expect(classifyRevisionNatalReplay(revision)).resolves.toMatchObject({
      status: "legacy_tzdb_integrity_only"
    });
  });

  it("keeps a legacy syntactic zone readable without pretending the active resolver recognizes it", async () => {
    const chart = structuredClone(await calculateChart(birth, WORKING_DEFAULT_RULE_PROFILE));
    chart.input.timeZone = "Historical/Only";
    chart.timeCalibration.timeZone = "Historical/Only";
    chart.manifest.hashSchemaVersion = LEGACY_HASH_SCHEMA_VERSION;
    chart.manifest.tzdbVersion = LEGACY_UNIDENTIFIED_TZDB_VERSION;
    delete chart.manifest.timeZoneDatabase;
    await resignChart(chart);
    const revision = revisionFromChart(chart);

    expect(coreBackupRevisionRecordSchema.safeParse(revision).success).toBe(true);
    await expect(verifyRevisionRecordIntegrity(revision)).resolves.toEqual(revision);
    await expect(classifyRevisionNatalReplay(revision)).resolves.toMatchObject({
      status: "legacy_tzdb_integrity_only"
    });
    await expect(replayRevisionNatalChart(revision)).rejects.toMatchObject({
      code: "legacy_tzdb_integrity_only"
    });
  });

  it("rejects a syntactically valid zone that the exact declared resolver does not contain", async () => {
    const chart = structuredClone(await calculateChart(birth, WORKING_DEFAULT_RULE_PROFILE));
    chart.input.timeZone = "Historical/Only";
    chart.timeCalibration.timeZone = "Historical/Only";
    await resignChart(chart);

    await expect(verifyRevisionRecordIntegrity(revisionFromChart(chart))).rejects.toThrow(
      /所声明固定 IANA 数据工件/u
    );
  });

  it("takes one accessor-free snapshot before an asynchronous resolver load", async () => {
    const revision = revisionFromChart(await calculateChart(birth, WORKING_DEFAULT_RULE_PROFILE));
    const originalFacts = structuredClone(revision.facts);
    const pending = verifyRevisionRecordIntegrity(revision);
    revision.facts.calendar.solarText = "mutated after call";
    await expect(pending).resolves.toMatchObject({ facts: originalFacts });

    let getterCalls = 0;
    const accessorBacked = structuredClone(revision) as RevisionRecord;
    const manifest = accessorBacked.manifest;
    Object.defineProperty(accessorBacked, "manifest", {
      enumerable: true,
      configurable: true,
      get() {
        getterCalls += 1;
        return manifest;
      }
    });
    await expect(verifyRevisionRecordIntegrity(accessorBacked)).rejects.toThrow(/声明式数据字段/u);
    expect(getterCalls).toBe(0);
  });

  it("rejects non-declarative or amplification-prone Revision inputs before schema normalization", async () => {
    const withSymbol = revisionFromChart(await calculateChart(birth, WORKING_DEFAULT_RULE_PROFILE));
    Object.defineProperty(withSymbol, Symbol("hidden"), { value: true });
    await expect(verifyRevisionRecordIntegrity(withSymbol)).rejects.toThrow(/Symbol/u);

    const cyclic = revisionFromChart(await calculateChart(birth, WORKING_DEFAULT_RULE_PROFILE)) as RevisionRecord & {
      cycle?: unknown;
    };
    cyclic.cycle = cyclic;
    await expect(verifyRevisionRecordIntegrity(cyclic)).rejects.toThrow(/循环引用/u);

    const sparse = revisionFromChart(await calculateChart(birth, WORKING_DEFAULT_RULE_PROFILE));
    sparse.manifest.warnings = new Array<string>(2);
    await expect(verifyRevisionRecordIntegrity(sparse)).rejects.toThrow(/稠密/u);

    const tooDeep = revisionFromChart(await calculateChart(birth, WORKING_DEFAULT_RULE_PROFILE)) as RevisionRecord & {
      ignored?: unknown;
    };
    let cursor: Record<string, unknown> = {};
    tooDeep.ignored = cursor;
    for (let depth = 0; depth < 130; depth += 1) {
      const next: Record<string, unknown> = {};
      cursor.next = next;
      cursor = next;
    }
    await expect(verifyRevisionRecordIntegrity(tooDeep)).rejects.toThrow(/最大深度/u);

    const tooWide = revisionFromChart(await calculateChart(birth, WORKING_DEFAULT_RULE_PROFILE)) as RevisionRecord & {
      ignored?: unknown;
    };
    const oversizedObject: Record<string, null> = Object.create(null) as Record<string, null>;
    for (let index = 0; index <= 100_000; index += 1) {
      oversizedObject[`field${index}`] = null;
    }
    tooWide.ignored = oversizedObject;
    const originalGetOwnPropertyNames = Object.getOwnPropertyNames;
    const getOwnPropertyNames = vi.spyOn(Object, "getOwnPropertyNames").mockImplementation((value) => {
      if (value === oversizedObject) {
        throw new Error("oversized object reached allocating reflection");
      }
      return originalGetOwnPropertyNames(value);
    });
    try {
      await expect(verifyRevisionRecordIntegrity(tooWide)).rejects.toThrow(/对象字段超过安全上限/u);
    } finally {
      getOwnPropertyNames.mockRestore();
    }
  });

  it("fails closed for unsupported engine, artifact, descriptor, precision and DST boundaries", async () => {
    const unknownEngineChart = structuredClone(await calculateChart(birth, WORKING_DEFAULT_RULE_PROFILE));
    unknownEngineChart.manifest.engine.version = "9.9.9";
    await resignChart(unknownEngineChart);
    await expect(classifyRevisionNatalReplay(revisionFromChart(unknownEngineChart))).resolves.toMatchObject({
      status: "unsupported_engine"
    });

    const descriptorMismatchChart = structuredClone(await calculateChart(birth, WORKING_DEFAULT_RULE_PROFILE));
    descriptorMismatchChart.manifest.timeZoneDatabase!.artifactName = "tampered/packed.json";
    await resignChart(descriptorMismatchChart);
    await expect(classifyRevisionNatalReplay(revisionFromChart(descriptorMismatchChart))).resolves.toMatchObject({
      status: "descriptor_mismatch"
    });

    const unavailableArtifactChart = structuredClone(await calculateChart(birth, WORKING_DEFAULT_RULE_PROFILE));
    const unavailableDescriptor = unavailableArtifactChart.manifest.timeZoneDatabase!;
    unavailableDescriptor.ianaVersion = "2024a";
    unavailableDescriptor.dataSha256 = "0".repeat(64);
    unavailableDescriptor.snapshotId = buildTimeZoneDatabaseSnapshotId(unavailableDescriptor);
    unavailableArtifactChart.manifest.tzdbVersion = unavailableDescriptor.snapshotId;
    await resignChart(unavailableArtifactChart);
    await expect(classifyRevisionNatalReplay(revisionFromChart(unavailableArtifactChart))).resolves.toMatchObject({
      status: "artifact_unavailable"
    });

    const unsupportedPrecisionChart = structuredClone(await calculateChart(birth, WORKING_DEFAULT_RULE_PROFILE));
    unsupportedPrecisionChart.input.time = null;
    unsupportedPrecisionChart.input.timePrecision = "date_only";
    await resignChart(unsupportedPrecisionChart);
    await expect(classifyRevisionNatalReplay(revisionFromChart(unsupportedPrecisionChart))).resolves.toMatchObject({
      status: "unsupported_input_precision"
    });

    const overlapBirth = {
      ...birth,
      date: "2024-11-03",
      time: "01:30",
      timeZone: "America/New_York"
    } satisfies BirthInput;
    const unresolvedDstChart = structuredClone(await calculateChart(
      overlapBirth,
      WORKING_DEFAULT_RULE_PROFILE,
      { dstResolutionOverride: "earlier" }
    ));
    unresolvedDstChart.timeCalibration.utcInstant = null;
    unresolvedDstChart.timeCalibration.utcOffset = null;
    unresolvedDstChart.timeCalibration.dstStatus = "unresolved";
    unresolvedDstChart.timeCalibration.normalizationStatus = "wall_time_only";
    unresolvedDstChart.timeCalibration.timeZoneResolution!.selectedCandidate = null;
    unresolvedDstChart.timeCalibration.timeZoneResolution!.status = "rejected_overlap";
    await resignChart(unresolvedDstChart);
    await expect(classifyRevisionNatalReplay(revisionFromChart(unresolvedDstChart))).resolves.toMatchObject({
      status: "unresolved_dst_selection"
    });
  });

  it("classifies schema-valid but unsupported rule semantics before calculation", async () => {
    const chart = structuredClone(await calculateChart(birth, WORKING_DEFAULT_RULE_PROFILE));
    chart.ruleProfile.calendar.dayBoundary = "split_zi";
    chart.ruleProfile.calendar.ziHourDayStemBasis = "civil_day";
    await resignChart(chart);

    await expect(classifyRevisionNatalReplay(revisionFromChart(chart))).resolves.toMatchObject({
      status: "unsupported_rule_semantics"
    });
  });

  it("detects facts that were tampered and then internally re-signed", async () => {
    const chart = structuredClone(await calculateChart(birth, WORKING_DEFAULT_RULE_PROFILE));
    chart.facts.calendar.solarText = "1995-08-18 08:27:00";
    await resignChart(chart);
    const revision = revisionFromChart(chart);

    await expect(verifyRevisionRecordIntegrity(revision)).resolves.toEqual(revision);
    const projection = await replayRevisionNatalChart(revision);
    expect(projection.status).toBe("mismatch");
    expect(projection.changedFields).toEqual(["facts", "result_hash"]);
    expect(projection.storedResultHash).not.toBe(projection.replayedResultHash);
  });

  it("validates every CandidateSet chart with the exact selected resolver", async () => {
    const record = await currentCandidateSetRecord();
    await expect(verifyCandidateSetRecordIntegrity(record)).resolves.toEqual(record);
    await expect(verifyUnknownHourCandidateResultIntegrity(record.candidateSet, record.id))
      .resolves.toEqual(record.candidateSet);

    const detached = structuredClone(record);
    const firstChart = detached.candidateSet.candidates[0]?.variants[0]?.chart;
    if (!firstChart) throw new Error("candidate fixture should include one chart");
    firstChart.input.timeZone = "Historical/Only";
    await expect(verifyCandidateSetRecordIntegrity(detached)).rejects.toThrow();
  });

  it("keeps legacy unidentified CandidateSets at stored-content integrity only", async () => {
    const current = await currentCandidateSetRecord();
    const candidateSet = await legacyHistoricalCandidateSet(current.candidateSet);
    const historical: CandidateSetRecord = {
      ...current,
      candidateSet,
      snapshotDigest: await sha256Hex(candidateSet)
    };

    await expect(verifyUnknownHourCandidateResultIntegrity(candidateSet, historical.id))
      .resolves.toEqual(candidateSet);
    await expect(verifyCandidateSetRecordIntegrity(historical)).resolves.toEqual(historical);
  });

  it("takes one accessor-free CandidateSet snapshot before resolver loading", async () => {
    const record = await currentCandidateSetRecord();
    let getterCalls = 0;
    const accessorBacked = structuredClone(record) as CandidateSetRecord;
    const candidateSet = accessorBacked.candidateSet;
    Object.defineProperty(accessorBacked, "candidateSet", {
      enumerable: true,
      configurable: true,
      get() {
        getterCalls += 1;
        return candidateSet;
      }
    });

    await expect(verifyCandidateSetRecordIntegrity(accessorBacked)).rejects.toThrow(/声明式数据字段/u);
    expect(getterCalls).toBe(0);
  });

  it("isolates CandidateSet verification from mutation after the async call begins", async () => {
    const record = await currentCandidateSetRecord();
    const expected = structuredClone(record);
    const pending = verifyCandidateSetRecordIntegrity(record);
    record.alias = "mutated after call";
    record.candidateSet.input.timeZone = "Asia/Tokyo";

    await expect(pending).resolves.toEqual(expected);
  });
});
