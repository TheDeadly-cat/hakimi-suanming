import { describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import type { BirthInput, RevisionRecord, RuleProfile } from "@hakimi/contracts";
import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import {
  buildBaziBirthTimePerturbationStabilityReport,
  type BaziBirthTimePerturbationStabilityReport
} from "./birth-time-perturbation-stability";
import {
  buildBaziInterpretationEvidenceEnvelope,
  validateBaziInterpretationEvidenceEnvelope,
  type BaziInterpretationEvidenceEnvelope,
  type BuildBaziInterpretationEvidenceEnvelopeInput
} from "./interpretation-evidence-envelope";
import {
  buildStrengthSensitivityReview,
  interpretBaziChart
} from "./index";
import {
  BAZI_INTERPRETATION_EVIDENCE_ENVELOPE_V2_PROFILE,
  buildBaziInterpretationEvidenceEnvelopeV2,
  validateBaziInterpretationEvidenceEnvelopeV2,
  type BaziInterpretationEvidenceEnvelopeV2,
  type BuildBaziInterpretationEvidenceEnvelopeV2Input
} from "./interpretation-evidence-envelope-v2";

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
    label: "v2 测试地点不得进入新增摘要",
    latitude: null,
    longitude: null,
    precision: "unknown"
  },
  sourceNote: "v2 测试备注不得进入新增摘要"
};

async function fixtureRevision(
  inputPatch: Partial<BirthInput> = {},
  ruleProfile: RuleProfile = WORKING_DEFAULT_RULE_PROFILE
): Promise<RevisionRecord> {
  const chart = await calculateChart({
    ...DEFAULT_INPUT,
    ...inputPatch,
    location: inputPatch.location ?? DEFAULT_INPUT.location
  }, ruleProfile);
  return {
    schemaVersion: "1.0.0",
    id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222",
    revisionNumber: 4,
    createdAt: "2026-08-24T00:00:00.000Z",
    input: chart.input,
    timeCalibration: chart.timeCalibration,
    ruleProfile: chart.ruleProfile,
    luckCycleRuleSnapshot: chart.luckCycleRuleSnapshot,
    facts: chart.facts,
    manifest: chart.manifest
  };
}

function legacyInput(
  revision: RevisionRecord,
  includeHour = true
): BuildBaziInterpretationEvidenceEnvelopeInput {
  const interpretation = interpretBaziChart(revision.facts, { includeHour });
  return {
    revision,
    includeHour,
    interpretation,
    strengthSensitivity: buildStrengthSensitivityReview(interpretation)
  };
}

async function v2Input(
  revision: RevisionRecord,
  includeHour = true
): Promise<BuildBaziInterpretationEvidenceEnvelopeV2Input> {
  return {
    revision,
    legacyEnvelopeInput: legacyInput(revision, includeHour),
    birthTimePerturbationReport: await buildBaziBirthTimePerturbationStabilityReport(revision)
  };
}

async function resignWrapper(envelope: BaziInterpretationEvidenceEnvelopeV2): Promise<void> {
  const { integrity: _integrity, ...payload } = envelope;
  (envelope.integrity as { payloadSha256: string }).payloadSha256 = await sha256Hex(payload);
}

async function resignLegacyEnvelope(envelope: BaziInterpretationEvidenceEnvelope): Promise<void> {
  const { integrity: _integrity, ...payload } = envelope;
  (envelope.integrity as { payloadSha256: string }).payloadSha256 = await sha256Hex(payload);
}

async function resignPerturbationReport(report: BaziBirthTimePerturbationStabilityReport): Promise<void> {
  const { integrity: _integrity, ...payload } = report;
  (report.integrity as { payloadSha256: string }).payloadSha256 = await sha256Hex(payload);
}

describe("Bazi interpretation evidence Envelope v2", () => {
  it("nests the complete v0.19 Envelope unchanged and adds only a scenario-derived v0.22 summary", async () => {
    const revision = await fixtureRevision();
    const input = await v2Input(revision);
    const legacy = await buildBaziInterpretationEvidenceEnvelope(input.legacyEnvelopeInput);
    const envelope = await buildBaziInterpretationEvidenceEnvelopeV2(input);
    const summaryText = JSON.stringify(envelope.timePerturbation);
    const serialized = JSON.stringify(envelope);

    expect(envelope.profile).toEqual(BAZI_INTERPRETATION_EVIDENCE_ENVELOPE_V2_PROFILE);
    expect(envelope.profile.projectionVersion).toBe("hakimi.bazi.interpretation_evidence_envelope/0.2.0");
    expect(envelope.legacyEnvelope).toEqual(legacy);
    expect(canonicalStringify(envelope.legacyEnvelope)).toBe(canonicalStringify(legacy));
    expect(envelope.legacyEnvelope.integrity.payloadSha256).toBe(legacy.integrity.payloadSha256);
    expect(envelope.legacyEnvelope.stability.timePerturbationStatus).toBe("not_assessed");
    expect(envelope.binding).toMatchObject({
      revisionId: revision.id,
      revisionNumber: revision.revisionNumber,
      revisionResultHash: revision.manifest.resultHash,
      ruleProfileDigest: revision.manifest.ruleProfileDigest,
      tzdbVersion: revision.manifest.tzdbVersion,
      engine: revision.manifest.engine,
      timeZoneDatabase: revision.manifest.timeZoneDatabase,
      rulePackBinding: null,
      legacyEnvelopePayloadSha256: legacy.integrity.payloadSha256,
      birthTimePerturbationReportPayloadSha256: input.birthTimePerturbationReport.integrity.payloadSha256
    });
    expect(envelope.timePerturbation).toMatchObject({
      status: "pillar_projection_unchanged_for_all_requested_offsets",
      requestedOffsetsMinutes: [0, -1, 1, -5, 5, -15, 15],
      calculatedOffsetsMinutes: [0, -1, 1, -5, 5, -15, 15],
      blockedOffsets: [],
      resolvedOverlapOffsets: [],
      changedFromBaselineOffsetsMinutes: [],
      changedPillarIdentities: [],
      changedFactPaths: [],
      counts: { total: 7, calculated: 7, blocked: 0, changedFromBaseline: 0 },
      exactRegisteredReplayRequired: true,
      replayEvidenceScope: "registered_executor_recalculation_not_original_binary_attestation",
      historicalProgramBinaryAttestationClaimed: false,
      solarTimePerturbationStatus: "not_applied_to_any_calculated_or_time_zone_probed_scenario",
      solarTimeAppliedInAnyScenario: false,
      interpretationStabilityClaimed: false
    });
    expect(envelope.effectiveStability).toEqual({
      legacyRuleScenarioStatus: legacy.stability.ruleScenarioStatus,
      timePillarProjectionStatus: envelope.timePerturbation.status,
      combinedInterpretationStatus: "not_assessed",
      interpretationStabilityClaimed: false,
      note: expect.stringContaining("不得合成为解读稳定性结论")
    });
    expect(summaryText).not.toContain("scenarios");
    expect(summaryText).not.toContain("scenarioId");
    expect(summaryText).not.toContain("sameProjectionAsBaseline");
    expect(summaryText).not.toContain("timeZoneDatabase");
    expect(serialized).not.toContain("1995-08-18");
    expect(serialized).not.toContain("08:26");
    expect(serialized).not.toContain("v2 测试地点不得进入新增摘要");
    expect(serialized).not.toContain("v2 测试备注不得进入新增摘要");
    expect(envelope.boundary).toMatchObject({
      legacyEnvelopePreservedUnmodified: true,
      timePerturbationSummaryDerivedFromScenarios: true,
      fullTimePerturbationReportCopied: false,
      rawBirthInputCopied: false,
      interpretationStabilityClaimed: false,
      aiFaithfulnessValidationPerformed: false,
      aiNarrativeUseAuthorized: false,
      expertTruthClaimed: false,
      publicReleaseAuthorized: false,
      networkTransmissionPerformed: false,
      chartOrStorageMutationPerformed: false
    });
    expect(Object.isFrozen(envelope)).toBe(true);
    expect(Object.isFrozen(envelope.legacyEnvelope)).toBe(true);
    expect(Object.isFrozen(envelope.timePerturbation.blockedOffsets)).toBe(true);
    await expect(validateBaziInterpretationEvidenceEnvelopeV2(envelope, input)).resolves.toEqual(envelope);
  });

  it("derives changed offsets from calculated scenarios instead of result hashes or report aggregates", async () => {
    const revision = await fixtureRevision({ time: "08:59" });
    const input = await v2Input(revision);
    const envelope = await buildBaziInterpretationEvidenceEnvelopeV2(input);

    expect(envelope.timePerturbation.status).toBe("pillar_projection_changed_within_requested_offsets");
    expect(envelope.timePerturbation.changedFromBaselineOffsetsMinutes).toContain(1);
    expect(envelope.timePerturbation.changedPillarIdentities).toContain("hour");
    expect(envelope.timePerturbation.changedFactPaths).toContain("pillars.hour.ganZhi");
    expect(envelope.timePerturbation.counts.changedFromBaseline)
      .toBe(envelope.timePerturbation.changedFromBaselineOffsetsMinutes.length);
  });

  it("gives blocked scenarios precedence and keeps the combined stability conclusion inconclusive", async () => {
    const revision = await fixtureRevision({
      date: "2024-11-03",
      time: "00:50",
      timeZone: "America/New_York"
    });
    const input = await v2Input(revision);
    const envelope = await buildBaziInterpretationEvidenceEnvelopeV2(input);

    expect(envelope.timePerturbation.status).toBe("inconclusive_due_to_blocked_offsets");
    expect(envelope.timePerturbation.blockedOffsets).toContainEqual({
      offsetMinutes: 15,
      blockCode: "dst_overlap_requires_scenario_choice",
      timeZoneResolutionKind: "overlap",
      timeZoneResolutionStatus: "rejected_overlap"
    });
    expect(envelope.timePerturbation.counts.blocked).toBeGreaterThan(0);
    expect(envelope.timePerturbation.note).toContain("不把已计算子集外推");
  });

  it("retains the explicit earlier/later choice for calculated DST overlap scenarios", async () => {
    const fixedLater = structuredClone(WORKING_DEFAULT_RULE_PROFILE);
    fixedLater.calendar.dstAmbiguity = "later";
    const revision = await fixtureRevision({
      date: "2024-11-03",
      time: "01:15",
      timeZone: "America/New_York"
    }, fixedLater);
    const input = await v2Input(revision);
    const envelope = await buildBaziInterpretationEvidenceEnvelopeV2(input);

    expect(envelope.timePerturbation.status).not.toBe("inconclusive_due_to_blocked_offsets");
    expect(envelope.timePerturbation.resolvedOverlapOffsets.length).toBeGreaterThan(0);
    expect(envelope.timePerturbation.resolvedOverlapOffsets.every((offset) => (
      offset.timeZoneResolutionStatus === "resolved_overlap_later"
      && offset.selectedTimeZoneCandidateChoice === "later"
    ))).toBe(true);
  });

  it("requires includeHour=true and exact canonical identity between both Revision inputs", async () => {
    const revision = await fixtureRevision();
    const noHourInput = await v2Input(revision, false);
    await expect(buildBaziInterpretationEvidenceEnvelopeV2(noHourInput))
      .rejects.toThrow(/includeHour 为 true/u);

    const otherRevision = await fixtureRevision({ time: "08:27" });
    const mismatchedInput = await v2Input(revision);
    mismatchedInput.legacyEnvelopeInput = legacyInput(otherRevision);
    await expect(buildBaziInterpretationEvidenceEnvelopeV2(mismatchedInput))
      .rejects.toThrow(/不是同一快照/u);
  });

  it("rejects a re-signed report whose counts or declared status diverge from its scenarios", async () => {
    const revision = await fixtureRevision();
    const input = await v2Input(revision);
    const alteredReport = structuredClone(input.birthTimePerturbationReport);
    Object.assign(alteredReport.counts as object, { calculated: 0, blocked: 7 });
    Object.assign(alteredReport.stability as object, { status: "inconclusive_due_to_blocked_offsets" });
    await resignPerturbationReport(alteredReport);

    await expect(buildBaziInterpretationEvidenceEnvelopeV2({
      ...input,
      birthTimePerturbationReport: alteredReport
    })).rejects.toThrow(/规范重建不一致/u);
  });

  it("rejects re-signed nested legacy rewrites, summary rewrites and privacy expansion", async () => {
    const revision = await fixtureRevision();
    const input = await v2Input(revision);
    const envelope = await buildBaziInterpretationEvidenceEnvelopeV2(input);

    const rewrittenLegacy = structuredClone(envelope);
    (rewrittenLegacy.legacyEnvelope.claims[0] as unknown as { text: string }).text = "伪造的专家真值";
    await resignLegacyEnvelope(rewrittenLegacy.legacyEnvelope);
    await resignWrapper(rewrittenLegacy);
    await expect(validateBaziInterpretationEvidenceEnvelopeV2(rewrittenLegacy, input))
      .rejects.toThrow(/规范重建不一致/u);

    const rewrittenSummary = structuredClone(envelope);
    Object.assign(rewrittenSummary.timePerturbation as object, {
      status: "pillar_projection_changed_within_requested_offsets"
    });
    await resignWrapper(rewrittenSummary);
    await expect(validateBaziInterpretationEvidenceEnvelopeV2(rewrittenSummary, input))
      .rejects.toThrow(/规范重建不一致/u);

    const privacyExpanded = structuredClone(envelope) as BaziInterpretationEvidenceEnvelopeV2 & {
      rawBirthInput?: unknown;
    };
    privacyExpanded.rawBirthInput = { date: "1995-08-18", time: "08:26" };
    await expect(validateBaziInterpretationEvidenceEnvelopeV2(privacyExpanded, input))
      .rejects.toThrow(/候选无法形成规范快照/u);
  });

  it("cannot be accepted by the legacy v0.19 validator through duck typing or silent downgrade", async () => {
    const revision = await fixtureRevision();
    const input = await v2Input(revision);
    const envelope = await buildBaziInterpretationEvidenceEnvelopeV2(input);

    await expect(validateBaziInterpretationEvidenceEnvelope(envelope, input.legacyEnvelopeInput)).rejects.toThrow();
  });

  it("rejects accessor-backed build input before reading the accessor", async () => {
    const revision = await fixtureRevision();
    const input = await v2Input(revision);
    const accessorBacked = structuredClone(input);
    let includeHourReads = 0;
    Object.defineProperty(accessorBacked.legacyEnvelopeInput, "includeHour", {
      configurable: true,
      enumerable: true,
      get() {
        includeHourReads += 1;
        return true;
      }
    });

    await expect(buildBaziInterpretationEvidenceEnvelopeV2(accessorBacked))
      .rejects.toThrow(/无法形成规范快照/u);
    expect(includeHourReads).toBe(0);

    const envelope = await buildBaziInterpretationEvidenceEnvelopeV2(input);
    const accessorCandidate = structuredClone(envelope);
    const profile = accessorCandidate.profile;
    let profileReads = 0;
    Object.defineProperty(accessorCandidate, "profile", {
      configurable: true,
      enumerable: true,
      get() {
        profileReads += 1;
        return profile;
      }
    });
    await expect(validateBaziInterpretationEvidenceEnvelopeV2(accessorCandidate, input))
      .rejects.toThrow(/候选无法形成规范快照/u);
    expect(profileReads).toBe(0);
  });

  it("rejects Symbol.toStringTag accessors in build and validation inputs without invoking them", async () => {
    const revision = await fixtureRevision();
    const input = await v2Input(revision);
    const taggedInput = structuredClone(input);
    let buildTagReads = 0;
    Object.defineProperty(taggedInput.birthTimePerturbationReport.binding, Symbol.toStringTag, {
      configurable: true,
      enumerable: true,
      get() {
        buildTagReads += 1;
        return "InjectedBuildInput";
      }
    });

    await expect(buildBaziInterpretationEvidenceEnvelopeV2(taggedInput))
      .rejects.toThrow(/无法形成规范快照/u);
    expect(buildTagReads).toBe(0);

    const envelope = await buildBaziInterpretationEvidenceEnvelopeV2(input);
    const taggedCandidate = structuredClone(envelope);
    let candidateTagReads = 0;
    Object.defineProperty(taggedCandidate.legacyEnvelope, Symbol.toStringTag, {
      configurable: true,
      enumerable: true,
      get() {
        candidateTagReads += 1;
        return "InjectedEnvelope";
      }
    });

    await expect(validateBaziInterpretationEvidenceEnvelopeV2(taggedCandidate, input))
      .rejects.toThrow(/候选无法形成规范快照/u);
    expect(candidateTagReads).toBe(0);
  });

  it("rejects oversized unknown top-level fields before traversing their values", async () => {
    const revision = await fixtureRevision();
    const input = await v2Input(revision);
    const oversizedUnknown = new Array<unknown>(200_001).fill(null);
    const extendedInput = structuredClone(input) as BuildBaziInterpretationEvidenceEnvelopeV2Input & {
      oversizedUnknown?: unknown;
    };
    extendedInput.oversizedUnknown = oversizedUnknown;

    await expect(buildBaziInterpretationEvidenceEnvelopeV2(extendedInput))
      .rejects.toThrow(/无法形成规范快照/u);

    const envelope = await buildBaziInterpretationEvidenceEnvelopeV2(input);
    const extendedCandidate = structuredClone(envelope) as BaziInterpretationEvidenceEnvelopeV2 & {
      oversizedUnknown?: unknown;
    };
    extendedCandidate.oversizedUnknown = oversizedUnknown;
    await expect(validateBaziInterpretationEvidenceEnvelopeV2(extendedCandidate, input))
      .rejects.toThrow(/候选无法形成规范快照/u);
  });

  it("allows the required shared Revision DAG but charges every repeated serialization expansion", async () => {
    const revision = await fixtureRevision();
    const input = await v2Input(revision);
    expect(input.revision).toBe(input.legacyEnvelopeInput.revision);
    await expect(buildBaziInterpretationEvidenceEnvelopeV2(input)).resolves.toBeDefined();

    const repeatedDag = structuredClone(input);
    expect(repeatedDag.revision).toBe(repeatedDag.legacyEnvelopeInput.revision);
    const sharedLeaf = new Array<null>(2_000).fill(null);
    const repeatedReferences = new Array<readonly null[]>(40).fill(sharedLeaf);
    Object.defineProperty(repeatedDag.revision, "preflightSharedDagProbe", {
      configurable: true,
      enumerable: true,
      writable: true,
      value: repeatedReferences
    });

    await expect(buildBaziInterpretationEvidenceEnvelopeV2(repeatedDag)).rejects.toMatchObject({
      message: expect.stringMatching(/无法形成规范快照/u),
      cause: expect.objectContaining({
        message: expect.stringMatching(/结构节点总量|属性键总量/u)
      })
    });
  });

  it("rejects cycles plus sparse or extended arrays during descriptor preflight", async () => {
    const revision = await fixtureRevision();
    const input = await v2Input(revision);

    const cyclic = structuredClone(input);
    Object.defineProperty(cyclic.revision, "preflightCycleProbe", {
      configurable: true,
      enumerable: true,
      writable: true,
      value: cyclic.revision
    });
    await expect(buildBaziInterpretationEvidenceEnvelopeV2(cyclic)).rejects.toMatchObject({
      cause: expect.objectContaining({ message: expect.stringMatching(/循环引用/u) })
    });

    const sparse = structuredClone(input);
    Object.defineProperty(sparse.revision, "preflightArrayProbe", {
      configurable: true,
      enumerable: true,
      writable: true,
      value: new Array<unknown>(2)
    });
    await expect(buildBaziInterpretationEvidenceEnvelopeV2(sparse)).rejects.toMatchObject({
      cause: expect.objectContaining({ message: expect.stringMatching(/稠密且没有扩展字段/u) })
    });

    const extended = structuredClone(input);
    const extendedArray = [null] as unknown[] & { extra?: string };
    extendedArray.extra = "not JSON array data";
    Object.defineProperty(extended.revision, "preflightArrayProbe", {
      configurable: true,
      enumerable: true,
      writable: true,
      value: extendedArray
    });
    await expect(buildBaziInterpretationEvidenceEnvelopeV2(extended)).rejects.toMatchObject({
      cause: expect.objectContaining({ message: expect.stringMatching(/稠密且没有扩展字段/u) })
    });
  });

  it("snapshots the Revision, legacy inputs and report before the first asynchronous validation", async () => {
    const revision = await fixtureRevision();
    const input = await v2Input(revision);
    const baseline = await buildBaziInterpretationEvidenceEnvelopeV2(input);
    const mutable = structuredClone(input);
    const inFlight = buildBaziInterpretationEvidenceEnvelopeV2(mutable);

    mutable.revision.input.date = "2000-01-01";
    mutable.legacyEnvelopeInput.revision.input.date = "2000-01-01";
    (mutable.legacyEnvelopeInput.interpretation.strength as { label: string }).label = "并发篡改的结论";
    Object.assign(mutable.birthTimePerturbationReport.counts as object, { calculated: 0, blocked: 7 });

    await expect(inFlight).resolves.toEqual(baseline);
    expect(JSON.stringify(await inFlight)).not.toContain("并发篡改的结论");
  });
});
