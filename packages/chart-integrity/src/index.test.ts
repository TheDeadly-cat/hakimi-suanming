import { describe, expect, it } from "vitest";
import { calculateChart, calculateChartForBundledSnapshot } from "@hakimi/bazi-core";
import {
  LEGACY_HASH_SCHEMA_VERSION,
  LEGACY_UNIDENTIFIED_TZDB_VERSION,
  buildCalculatedChartHashPayload,
  buildTimeZoneDatabaseSnapshotId,
  type BirthInput,
  type CalculatedChart,
  type RevisionRecord
} from "@hakimi/contracts";
import { sha256Hex } from "@hakimi/integrity";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { RETAINED_TIME_ZONE_DATABASE_2025B } from "@hakimi/tzdb-core";
import {
  CalculatedChartIntegrityError,
  classifyRevisionNatalReplay,
  replayRevisionNatalChart,
  verifyCalculatedChartIntegrity,
  verifyRevisionRecordIntegrity
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
});
