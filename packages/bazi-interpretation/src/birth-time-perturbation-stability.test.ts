import { describe, expect, it } from "vitest";
import {
  calculateChart,
  calculateChartForBundledSnapshot,
  digestRuleProfile
} from "@hakimi/bazi-core";
import {
  buildCalculatedChartHashPayload,
  type BirthInput,
  type CalculatedChart,
  type RulePackBinding,
  type RevisionRecord,
  type RuleProfile
} from "@hakimi/contracts";
import { sha256Hex } from "@hakimi/integrity";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { RETAINED_TIME_ZONE_DATABASE_2025B } from "@hakimi/tzdb-core";
import {
  BAZI_BIRTH_TIME_PERTURBATION_OFFSETS,
  BAZI_BIRTH_TIME_PERTURBATION_STABILITY_PROFILE,
  buildBaziBirthTimePerturbationStabilityReport,
  validateBaziBirthTimePerturbationStabilityReport,
  type BaziBirthTimePerturbationStabilityReport
} from "./index";

const DEFAULT_INPUT: BirthInput = {
  schemaVersion: "1.0.0",
  calendarType: "gregorian",
  date: "1995-08-18",
  time: "08:26",
  timePrecision: "exact_minute",
  timeZone: "Asia/Shanghai",
  sex: "male",
  lunarLeapMonth: false,
  location: {
    label: "测试地点不得进入稳定性报告",
    latitude: null,
    longitude: null,
    precision: "unknown"
  },
  sourceNote: "测试备注不得进入稳定性报告"
};

async function fixtureRevision(
  inputPatch: Partial<BirthInput> = {},
  ruleProfile: RuleProfile = WORKING_DEFAULT_RULE_PROFILE,
  dstResolutionOverride?: "earlier" | "later",
  rulePackBinding?: RulePackBinding
): Promise<RevisionRecord> {
  const input: BirthInput = {
    ...DEFAULT_INPUT,
    ...inputPatch,
    location: inputPatch.location ?? DEFAULT_INPUT.location
  };
  const chart = await calculateChart(input, ruleProfile, {
    ...(dstResolutionOverride ? { dstResolutionOverride } : {}),
    ...(rulePackBinding ? { rulePackBinding } : {})
  });
  return revisionFromChart(chart);
}

function revisionFromChart(chart: CalculatedChart): RevisionRecord {
  return {
    schemaVersion: "1.0.0",
    id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222",
    revisionNumber: 3,
    createdAt: "2026-08-24T00:00:00.000Z",
    input: chart.input,
    timeCalibration: chart.timeCalibration,
    ruleProfile: chart.ruleProfile,
    ...(chart.rulePackBinding ? { rulePackBinding: chart.rulePackBinding } : {}),
    luckCycleRuleSnapshot: chart.luckCycleRuleSnapshot,
    facts: chart.facts,
    manifest: chart.manifest
  };
}

async function rulePackBindingFor(profile: RuleProfile): Promise<RulePackBinding> {
  return {
    kind: "installed_rule_pack",
    packDigest: "a".repeat(64),
    profileDigest: await digestRuleProfile(profile),
    packId: "time-perturbation-test-pack",
    profileId: profile.profileId,
    profileVersion: profile.profileVersion,
    useMode: "exact"
  };
}

describe("Bazi birth-time perturbation stability v0.22", () => {
  it("uses exact replay and reports a stable seven-offset projection without raw birth input", async () => {
    const revision = await fixtureRevision();
    const report = await buildBaziBirthTimePerturbationStabilityReport(revision);
    const serialized = JSON.stringify(report);

    expect(report.profile).toEqual(BAZI_BIRTH_TIME_PERTURBATION_STABILITY_PROFILE);
    expect(report.binding).toMatchObject({
      revisionId: revision.id,
      revisionNumber: revision.revisionNumber,
      sourceResultHash: revision.manifest.resultHash,
      rulePackBinding: null,
      artifactRole: "current",
      inputTimePrecision: "exact_minute"
    });
    expect(report.scenarios.map((scenario) => scenario.offsetMinutes))
      .toEqual(BAZI_BIRTH_TIME_PERTURBATION_OFFSETS);
    expect(report.counts).toEqual({ total: 7, calculated: 7, blocked: 0, changedFromBaseline: 0 });
    expect(report.stability.status).toBe("pillar_projection_unchanged_for_all_requested_offsets");
    expect(report.stability.requestedOffsetsMinutes).toEqual(BAZI_BIRTH_TIME_PERTURBATION_OFFSETS);
    expect(report.stability.calculatedOffsetsMinutes).toEqual(BAZI_BIRTH_TIME_PERTURBATION_OFFSETS);
    expect(report.stability.blockedOffsets).toEqual([]);
    expect(report.scenarios.every((scenario) => (
      scenario.status === "calculated"
      && scenario.sameProjectionAsBaseline
      && scenario.changedPillarIdentities.length === 0
      && scenario.solarTimeApplied === false
    ))).toBe(true);
    expect(report.boundary).toMatchObject({
      exactRegisteredReplayRequired: true,
      replayEvidenceScope: "registered_executor_recalculation_not_original_binary_attestation",
      historicalProgramBinaryAttestationClaimed: false,
      civilWallTimePerturbationOnly: true,
      rawBirthDateCopied: false,
      rawBirthTimeCopied: false,
      sourceLocationCopied: false,
      sourceTimeZoneCopied: false,
      solarTimeAppliedInAnyScenario: false,
      interpretationStabilityClaimed: false,
      expertTruthClaimed: false,
      publicReleaseAuthorized: false,
      networkTransmissionPerformed: false,
      chartOrStorageMutationPerformed: false
    });
    expect(serialized).not.toContain("1995-08-18");
    expect(serialized).not.toContain("08:26");
    expect(serialized).not.toContain("Asia/Shanghai");
    expect(serialized).not.toContain("测试地点不得进入稳定性报告");
    expect(serialized).not.toContain("测试备注不得进入稳定性报告");
    expect(Object.isFrozen(report)).toBe(true);
    await expect(validateBaziBirthTimePerturbationStabilityReport(report, revision)).resolves.toEqual(report);
  });

  it("detects an hour-pillar boundary instead of treating changed result hashes as instability", async () => {
    const revision = await fixtureRevision({ time: "08:59" });
    const report = await buildBaziBirthTimePerturbationStabilityReport(revision);
    const plusOne = report.scenarios.find((scenario) => scenario.offsetMinutes === 1);

    expect(report.stability.status).toBe("pillar_projection_changed_within_requested_offsets");
    expect(report.counts.blocked).toBe(0);
    expect(report.counts.changedFromBaseline).toBeGreaterThan(0);
    expect(plusOne).toMatchObject({
      status: "calculated",
      sameProjectionAsBaseline: false
    });
    expect(plusOne?.changedPillarIdentities).toContain("hour");
    expect(plusOne?.changedFactPaths).toContain("pillars.hour.ganZhi");
  });

  it("preserves exact seconds across an offset that lands exactly on a solar-term second boundary", async () => {
    const beforeRevision = await fixtureRevision({
      date: "2024-02-04",
      time: "16:26:06",
      timePrecision: "exact_second"
    });
    const atRevision = await fixtureRevision({
      date: "2024-02-04",
      time: "16:26:07",
      timePrecision: "exact_second"
    });
    const beforeReport = await buildBaziBirthTimePerturbationStabilityReport(beforeRevision);
    const atReport = await buildBaziBirthTimePerturbationStabilityReport(atRevision);
    const beforePlusOne = beforeReport.scenarios.find((scenario) => scenario.offsetMinutes === 1);
    const atPlusOne = atReport.scenarios.find((scenario) => scenario.offsetMinutes === 1);

    expect(beforeReport.binding.inputTimePrecision).toBe("exact_second");
    expect(atReport.binding.inputTimePrecision).toBe("exact_second");
    expect(beforePlusOne).toMatchObject({
      status: "calculated",
      sameProjectionAsBaseline: true,
      solarTimeApplied: false
    });
    expect(beforePlusOne?.changedPillarIdentities).not.toContain("year");
    expect(beforePlusOne?.changedPillarIdentities).not.toContain("month");
    expect(atPlusOne).toMatchObject({
      status: "calculated",
      sameProjectionAsBaseline: false,
      solarTimeApplied: false
    });
    expect(atPlusOne?.changedPillarIdentities).toEqual(expect.arrayContaining(["year", "month"]));
    expect(JSON.stringify(beforeReport)).not.toContain("16:26:06");
    expect(JSON.stringify(atReport)).not.toContain("16:26:07");
  });

  it("retains an installed rule-pack binding without consulting any active repository state", async () => {
    const binding = await rulePackBindingFor(WORKING_DEFAULT_RULE_PROFILE);
    const revision = await fixtureRevision({}, WORKING_DEFAULT_RULE_PROFILE, undefined, binding);
    const report = await buildBaziBirthTimePerturbationStabilityReport(revision);

    expect(report.binding.rulePackBinding).toEqual(binding);
    expect(report.scenarios.every((scenario) => scenario.status === "calculated")).toBe(true);
    await expect(validateBaziBirthTimePerturbationStabilityReport(report, revision)).resolves.toEqual(report);
  });

  it("uses a retained tzdb artifact without falling back to the current zero-offset rules", async () => {
    const input: BirthInput = {
      ...DEFAULT_INPUT,
      date: "2026-10-01",
      time: "12:00",
      timeZone: "Africa/Casablanca"
    };
    const chart = await calculateChartForBundledSnapshot(
      input,
      WORKING_DEFAULT_RULE_PROFILE,
      RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId,
      { expectedTimeZoneDatabase: RETAINED_TIME_ZONE_DATABASE_2025B }
    );
    expect(chart.timeCalibration.utcOffset).toBe("+01:00");
    const report = await buildBaziBirthTimePerturbationStabilityReport(revisionFromChart(chart));

    expect(report.binding.artifactRole).toBe("retained");
    expect(report.binding.timeZoneDatabase).toEqual(RETAINED_TIME_ZONE_DATABASE_2025B);
    expect(report.scenarios[0]).toMatchObject({ offsetMinutes: 0, status: "calculated" });
    expect(JSON.stringify(report)).not.toContain("Africa/Casablanca");
    await expect(validateBaziBirthTimePerturbationStabilityReport(report, revisionFromChart(chart)))
      .resolves.toEqual(report);
  });

  it("blocks a nonzero require-user sample that enters a DST overlap", async () => {
    const revision = await fixtureRevision({
      date: "2024-11-03",
      time: "00:50",
      timeZone: "America/New_York"
    });
    const report = await buildBaziBirthTimePerturbationStabilityReport(revision);
    const plusFifteen = report.scenarios.find((scenario) => scenario.offsetMinutes === 15);

    expect(report.stability.status).toBe("inconclusive_due_to_blocked_offsets");
    expect(plusFifteen).toMatchObject({
      status: "blocked",
      timeZoneResolutionKind: "overlap",
      timeZoneResolutionStatus: "rejected_overlap",
      selectedTimeZoneCandidateChoice: null,
      solarTimeApplied: false,
      blockCode: "dst_overlap_requires_scenario_choice",
      factsProjectionDigest: null
    });
    expect(report.stability.calculatedOffsetsMinutes).not.toContain(15);
    expect(report.stability.blockedOffsets).toContainEqual({
      offsetMinutes: 15,
      blockCode: "dst_overlap_requires_scenario_choice",
      timeZoneResolutionKind: "overlap",
      timeZoneResolutionStatus: "rejected_overlap"
    });
    await expect(validateBaziBirthTimePerturbationStabilityReport(report, revision)).resolves.toEqual(report);
  });

  it("blocks a DST gap without silently shifting the perturbed wall time", async () => {
    const revision = await fixtureRevision({
      date: "2024-03-10",
      time: "01:50",
      timeZone: "America/New_York"
    });
    const report = await buildBaziBirthTimePerturbationStabilityReport(revision);
    const plusFifteen = report.scenarios.find((scenario) => scenario.offsetMinutes === 15);

    expect(report.stability.status).toBe("inconclusive_due_to_blocked_offsets");
    expect(plusFifteen).toMatchObject({
      status: "blocked",
      timeZoneResolutionKind: "gap",
      timeZoneResolutionStatus: "rejected_gap",
      selectedTimeZoneCandidateChoice: null,
      solarTimeApplied: false,
      blockCode: "dst_gap_requires_scenario_resolution",
      factsProjectionDigest: null
    });
  });

  it("keeps every nonzero overlap sample blocked after either explicit zero-offset user choice", async () => {
    const revision = await fixtureRevision({
      date: "2024-11-03",
      time: "01:15",
      timeZone: "America/New_York"
    }, WORKING_DEFAULT_RULE_PROFILE, "earlier");
    const report = await buildBaziBirthTimePerturbationStabilityReport(revision);
    const zero = report.scenarios.find((scenario) => scenario.offsetMinutes === 0);
    const blockedOffsets = report.scenarios
      .filter((scenario) => scenario.status === "blocked")
      .map((scenario) => scenario.offsetMinutes);

    expect(zero).toMatchObject({
      status: "calculated",
      sameProjectionAsBaseline: true,
      timeZoneResolutionStatus: "resolved_overlap_earlier",
      selectedTimeZoneCandidateChoice: "earlier",
      solarTimeApplied: false
    });
    expect(blockedOffsets).toEqual([-1, 1, -5, 5, -15, 15]);
    expect(report.stability.calculatedOffsetsMinutes).toEqual([0]);
    expect(report.stability.blockedOffsets.map((scenario) => scenario.offsetMinutes))
      .toEqual([-1, 1, -5, 5, -15, 15]);
    expect(report.stability.blockedOffsets.every((scenario) => (
      scenario.blockCode === "dst_overlap_requires_scenario_choice"
      && scenario.timeZoneResolutionStatus === "rejected_overlap"
    ))).toBe(true);
    expect(report.stability.status).toBe("inconclusive_due_to_blocked_offsets");

    const laterRevision = await fixtureRevision({
      date: "2024-11-03",
      time: "01:15",
      timeZone: "America/New_York"
    }, WORKING_DEFAULT_RULE_PROFILE, "later");
    const laterReport = await buildBaziBirthTimePerturbationStabilityReport(laterRevision);
    expect(laterReport.scenarios[0]).toMatchObject({
      offsetMinutes: 0,
      status: "calculated",
      timeZoneResolutionStatus: "resolved_overlap_later",
      selectedTimeZoneCandidateChoice: "later"
    });
    expect(laterReport.stability.calculatedOffsetsMinutes).toEqual([0]);
    expect(laterReport.stability.blockedOffsets.map((scenario) => scenario.offsetMinutes))
      .toEqual([-1, 1, -5, 5, -15, 15]);
  });

  it("records frozen fixed earlier and later overlap choices but still blocks every DST gap", async () => {
    const fixedEarlier = structuredClone(WORKING_DEFAULT_RULE_PROFILE);
    fixedEarlier.calendar.dstAmbiguity = "earlier";
    const overlapRevision = await fixtureRevision({
      date: "2024-11-03",
      time: "01:15",
      timeZone: "America/New_York"
    }, fixedEarlier);
    const overlapReport = await buildBaziBirthTimePerturbationStabilityReport(overlapRevision);
    expect(overlapReport.counts.blocked).toBe(0);
    expect(overlapReport.scenarios).toHaveLength(7);
    expect(overlapReport.scenarios.every((scenario) => (
      scenario.status === "calculated"
      && scenario.timeZoneResolutionKind === "overlap"
      && scenario.timeZoneResolutionStatus === "resolved_overlap_earlier"
      && scenario.selectedTimeZoneCandidateChoice === "earlier"
    ))).toBe(true);

    const fixedLater = structuredClone(WORKING_DEFAULT_RULE_PROFILE);
    fixedLater.calendar.dstAmbiguity = "later";
    const laterRevision = await fixtureRevision({
      date: "2024-11-03",
      time: "01:15",
      timeZone: "America/New_York"
    }, fixedLater);
    const laterReport = await buildBaziBirthTimePerturbationStabilityReport(laterRevision);
    expect(laterReport.counts.blocked).toBe(0);
    expect(laterReport.scenarios).toHaveLength(7);
    expect(laterReport.scenarios.every((scenario) => (
      scenario.status === "calculated"
      && scenario.timeZoneResolutionKind === "overlap"
      && scenario.timeZoneResolutionStatus === "resolved_overlap_later"
      && scenario.selectedTimeZoneCandidateChoice === "later"
    ))).toBe(true);

    const beforeGapRevision = await fixtureRevision({
      date: "2024-03-10",
      time: "01:50",
      timeZone: "America/New_York"
    }, fixedEarlier);
    const beforeGapReport = await buildBaziBirthTimePerturbationStabilityReport(beforeGapRevision);
    expect(beforeGapReport.scenarios.find((scenario) => scenario.offsetMinutes === 15)).toMatchObject({
      status: "blocked",
      timeZoneResolutionKind: "gap",
      blockCode: "dst_gap_requires_scenario_resolution"
    });
  });

  it("rejects a source baseline whose civil wall time is itself in a DST gap", async () => {
    const fixedEarlier = structuredClone(WORKING_DEFAULT_RULE_PROFILE);
    fixedEarlier.calendar.dstAmbiguity = "earlier";
    const gapRevision = await fixtureRevision({
      date: "2024-03-10",
      time: "02:15",
      timeZone: "America/New_York"
    }, fixedEarlier);

    await expect(buildBaziBirthTimePerturbationStabilityReport(gapRevision))
      .rejects.toThrow(/民用墙上时刻位于 DST 空档/u);
  });

  it("records an unsupported civil-range offset as blocked without applying solar time", async () => {
    const revision = await fixtureRevision({ date: "1900-01-01", time: "00:00" });
    const report = await buildBaziBirthTimePerturbationStabilityReport(revision);
    const minusOne = report.scenarios.find((scenario) => scenario.offsetMinutes === -1);

    expect(minusOne).toMatchObject({
      status: "blocked",
      blockCode: "outside_supported_civil_input_range",
      timeZoneResolutionKind: null,
      timeZoneResolutionStatus: null,
      selectedTimeZoneCandidateChoice: null,
      solarTimeApplied: false
    });
    expect(report.stability.calculatedOffsetsMinutes).not.toContain(-1);
    expect(report.stability.blockedOffsets).toContainEqual({
      offsetMinutes: -1,
      blockCode: "outside_supported_civil_input_range",
      timeZoneResolutionKind: null,
      timeZoneResolutionStatus: null
    });
    expect(report.scenarios.every((scenario) => scenario.solarTimeApplied === false)).toBe(true);
    expect(report.boundary.solarTimeAppliedInAnyScenario).toBe(false);
  });

  it("rejects lunar inputs and any Revision whose frozen result was tampered", async () => {
    const lunarRevision = await fixtureRevision({
      calendarType: "lunar",
      date: "2023-02-01"
    });
    await expect(buildBaziBirthTimePerturbationStabilityReport(lunarRevision))
      .rejects.toThrow(/只接受冻结的公历/u);

    const tampered = structuredClone(await fixtureRevision());
    tampered.facts.pillars.hour.stem = tampered.facts.pillars.hour.stem === "甲" ? "乙" : "甲";
    tampered.facts.pillars.hour.ganZhi = `${tampered.facts.pillars.hour.stem}${tampered.facts.pillars.hour.branch}`;
    await expect(buildBaziBirthTimePerturbationStabilityReport(tampered))
      .rejects.toThrow(/摘要或结构与内容不一致/u);
  });

  it("rejects a hash-consistent Revision that does not contain exact minute or second input", async () => {
    const imprecise = structuredClone(await fixtureRevision());
    imprecise.input.time = null;
    imprecise.input.timePrecision = "date_only";
    const hashSource: CalculatedChart = {
      input: imprecise.input,
      timeCalibration: imprecise.timeCalibration,
      ruleProfile: imprecise.ruleProfile,
      luckCycleRuleSnapshot: imprecise.luckCycleRuleSnapshot,
      facts: imprecise.facts,
      manifest: imprecise.manifest
    };
    imprecise.manifest.resultHash = await sha256Hex(buildCalculatedChartHashPayload(hashSource));

    await expect(buildBaziBirthTimePerturbationStabilityReport(imprecise))
      .rejects.toThrow(/只接受精确到分钟或秒/u);
  });

  it("rejects altered or privacy-expanded reports by exact canonical rebuild", async () => {
    const revision = await fixtureRevision();
    const report = await buildBaziBirthTimePerturbationStabilityReport(revision);
    const rewritten = structuredClone(report) as BaziBirthTimePerturbationStabilityReport;
    Object.assign(rewritten.stability as object, {
      status: "pillar_projection_changed_within_requested_offsets"
    });
    await expect(validateBaziBirthTimePerturbationStabilityReport(rewritten, revision))
      .rejects.toThrow(/规范重建不一致/u);

    const privacyExpanded = structuredClone(report) as BaziBirthTimePerturbationStabilityReport & {
      rawBirthInput?: unknown;
    };
    privacyExpanded.rawBirthInput = { date: "1995-08-18", time: "08:26" };
    await expect(validateBaziBirthTimePerturbationStabilityReport(privacyExpanded, revision))
      .rejects.toThrow(/字段不符合严格白名单/u);
  });

  it("snapshots the mutable Revision before the first asynchronous integrity check", async () => {
    const revision = await fixtureRevision();
    const expected = await buildBaziBirthTimePerturbationStabilityReport(revision);
    const mutable = structuredClone(revision);
    const inFlight = buildBaziBirthTimePerturbationStabilityReport(mutable);
    mutable.input.date = "2000-01-01";
    mutable.input.time = "23:59";
    mutable.input.location.label = "异步篡改";

    await expect(inFlight).resolves.toEqual(expected);
  });

  it("routes public unknown Revision input through the bounded verifier without reading accessors", async () => {
    const revision = structuredClone(await fixtureRevision());
    const input = revision.input;
    let getterReads = 0;
    Object.defineProperty(revision, "input", {
      configurable: true,
      enumerable: true,
      get() {
        getterReads += 1;
        return input;
      }
    });

    await expect(buildBaziBirthTimePerturbationStabilityReport(revision))
      .rejects.toThrow(/Revision\.input 必须是可枚举的声明式数据字段/u);
    expect(getterReads).toBe(0);
  });

  it("preflights candidate reports before cloning and rejects accessors, extensions and excess budgets", async () => {
    const revision = await fixtureRevision();
    const report = await buildBaziBirthTimePerturbationStabilityReport(revision);

    const accessorBacked = structuredClone(report);
    const counts = accessorBacked.counts;
    let getterReads = 0;
    Object.defineProperty(accessorBacked, "counts", {
      configurable: true,
      enumerable: true,
      get() {
        getterReads += 1;
        return counts;
      }
    });
    await expect(validateBaziBirthTimePerturbationStabilityReport(accessorBacked, revision))
      .rejects.toThrow(/候选报告\.counts 必须是可枚举的自有声明式数据字段/u);
    expect(getterReads).toBe(0);

    const extended = structuredClone(report) as BaziBirthTimePerturbationStabilityReport & {
      boundary: BaziBirthTimePerturbationStabilityReport["boundary"] & { futureAuthority?: boolean };
    };
    extended.boundary.futureAuthority = true;
    await expect(validateBaziBirthTimePerturbationStabilityReport(extended, revision))
      .rejects.toThrow(/候选报告 boundary 字段不符合严格白名单/u);

    const futureStatus = structuredClone(report) as unknown as {
      scenarios: Array<{ status: string }>;
    };
    futureStatus.scenarios[0]!.status = "deferred_by_future_profile";
    await expect(validateBaziBirthTimePerturbationStabilityReport(futureStatus, revision))
      .rejects.toThrow(/scenario status 不受支持/u);

    const oversizedText = structuredClone(report) as unknown as {
      scenarios: Array<{ note: string }>;
    };
    oversizedText.scenarios[0]!.note = "x".repeat(300_000);
    await expect(validateBaziBirthTimePerturbationStabilityReport(oversizedText, revision))
      .rejects.toThrow(/文本字符总量超过规范克隆前上限/u);

    const oversizedArray = structuredClone(report) as unknown as {
      scenarios: Array<{ changedFactPaths: string[] }>;
    };
    oversizedArray.scenarios[0]!.changedFactPaths = Array.from(
      { length: 65 },
      () => "pillars.hour.ganZhi"
    );
    await expect(validateBaziBirthTimePerturbationStabilityReport(oversizedArray, revision))
      .rejects.toThrow(/单个数组长度超过规范克隆前上限/u);
  });
});
