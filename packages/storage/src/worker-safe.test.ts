import { describe, expect, it } from "vitest";
import { calculateUnknownHourCandidates } from "@hakimi/bazi-core";
import {
  SCHEMA_VERSION,
  type BirthInput,
  type UnknownHourCandidateResult
} from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import {
  buildCandidateSetTzdbComparison,
  buildLegacyCandidateSetTzdbComparison
} from "./worker-safe";

const input: BirthInput = {
  schemaVersion: SCHEMA_VERSION,
  calendarType: "gregorian",
  date: "2026-08-02",
  time: null,
  timePrecision: "unknown_hour",
  timeZone: "Asia/Shanghai",
  sex: "unspecified",
  lunarLeapMonth: false,
  location: { label: "", latitude: null, longitude: null, precision: "unknown" },
  sourceNote: ""
};

function withSyntheticGap(
  source: UnknownHourCandidateResult,
  earlierInstant: string
): UnknownHourCandidateResult {
  const result = structuredClone(source);
  const probe = result.candidates[0] as unknown as Record<string, any>;
  const calibration = probe.timeCalibration as Record<string, any>;
  const requestedWallTime = calibration.timeZoneResolution.requestedWallTime as string;
  const candidateBase = calibration.timeZoneResolution.candidates[0] as Record<string, any>;
  const earlier = {
    ...candidateBase,
    choice: "earlier",
    instant: earlierInstant,
    resolvedWallTime: requestedWallTime.replace("T00:30:00", "T00:00:00"),
    zonedDateTime: `${requestedWallTime.replace("T00:30:00", "T00:00:00")}+08:00[Asia/Shanghai]`,
    matchesInputWallTime: false
  };
  const later = {
    ...candidateBase,
    choice: "later",
    instant: "2026-08-01T17:00:00Z",
    resolvedWallTime: requestedWallTime.replace("T00:30:00", "T01:00:00"),
    zonedDateTime: `${requestedWallTime.replace("T00:30:00", "T01:00:00")}+08:00[Asia/Shanghai]`,
    matchesInputWallTime: false
  };
  calibration.activeWallTime = requestedWallTime;
  calibration.utcInstant = null;
  calibration.utcOffset = null;
  calibration.dstStatus = "unresolved";
  calibration.normalizationStatus = "wall_time_only";
  calibration.timeZoneResolution = {
    kind: "gap",
    policy: "reject",
    status: "rejected_gap",
    requestedWallTime,
    candidates: [earlier, later],
    selectedCandidate: null
  };
  probe.status = "requires_user_time_resolution";
  probe.chart = null;
  probe.variants = [];
  probe.unresolvedReason = {
    code: "DST_GAP_REQUIRES_USER_RESOLUTION",
    message: "synthetic gap fixture"
  };
  return result;
}

describe("CandidateSet tzdb worker-safe comparison", () => {
  it("v2 detects gap-to-gap candidate changes that the frozen v1 comparator omitted", async () => {
    const calculated = await calculateUnknownHourCandidates(input, WORKING_DEFAULT_RULE_PROFILE);
    const source = withSyntheticGap(calculated, "2026-08-01T16:00:00Z");
    const target = withSyntheticGap(calculated, "2026-08-01T15:00:00Z");

    const legacy = buildLegacyCandidateSetTzdbComparison(source, target);
    const current = buildCandidateSetTzdbComparison(source, target);

    expect(legacy.formatVersion).toBe("1.0.0");
    expect(legacy.probeDiffs[0]).toMatchObject({ behaviorChanged: false, hashChanged: false, changedFields: [] });
    expect(current.formatVersion).toBe("2.0.0");
    expect(current.probeDiffs[0]).toMatchObject({
      behaviorChanged: true,
      hashChanged: true,
      changedFields: ["time_resolution_candidates", "time_resolution_fingerprint"]
    });
    expect(current.probeDiffs[0]?.sourceResolutionFingerprint)
      .not.toEqual(current.probeDiffs[0]?.targetResolutionFingerprint);
  });
});
