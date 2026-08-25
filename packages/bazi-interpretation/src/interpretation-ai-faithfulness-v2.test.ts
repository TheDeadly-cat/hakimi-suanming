import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import type { BirthInput, RevisionRecord, RuleProfile } from "@hakimi/contracts";
import { sha256Hex } from "@hakimi/integrity";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import {
  buildBaziBirthTimePerturbationStabilityReport,
  type BaziBirthTimePerturbationStabilityReport
} from "./birth-time-perturbation-stability";
import {
  buildStrengthSensitivityReview,
  interpretBaziChart
} from "./index";
import {
  buildBaziInterpretationEvidenceEnvelopeV2,
  type BaziInterpretationEvidenceEnvelopeV2,
  type BuildBaziInterpretationEvidenceEnvelopeV2Input
} from "./interpretation-evidence-envelope-v2";
import {
  BAZI_INTERPRETATION_AI_ASSERTION_DRAFT_VERSION,
  evaluateBaziInterpretationAiFaithfulness,
  type BaziInterpretationAiAssertionDraftItem
} from "./interpretation-ai-faithfulness";
import {
  BAZI_INTERPRETATION_AI_ASSERTION_DRAFT_V2_VERSION,
  BAZI_INTERPRETATION_AI_V2_COMBINED_STATUS_SUBJECT_ID,
  BAZI_INTERPRETATION_AI_V2_TIME_SUMMARY_SUBJECT_ID,
  evaluateBaziInterpretationAiFaithfulnessV2,
  validateBaziInterpretationAiFaithfulnessV2Result,
  type BaziInterpretationAiAssertionDraftV2,
  type BaziInterpretationAiFaithfulnessV2Result,
  type BaziInterpretationAiV2TimeAssertionDraftItem,
  type EvaluateBaziInterpretationAiFaithfulnessV2Input
} from "./interpretation-ai-faithfulness-v2";

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
    label: "AI v2 私密地点不得进入结果",
    latitude: null,
    longitude: null,
    precision: "unknown"
  },
  sourceNote: "AI v2 私密来源备注不得进入结果"
};

interface Fixture {
  revision: RevisionRecord;
  input: BuildBaziInterpretationEvidenceEnvelopeV2Input;
  envelope: BaziInterpretationEvidenceEnvelopeV2;
}

type TypedEvaluationInput = EvaluateBaziInterpretationAiFaithfulnessV2Input & {
  envelope: BaziInterpretationEvidenceEnvelopeV2;
  draft: BaziInterpretationAiAssertionDraftV2;
};

async function fixture(
  inputPatch: Partial<BirthInput> = {},
  ruleProfile: RuleProfile = WORKING_DEFAULT_RULE_PROFILE
): Promise<Fixture> {
  const chart = await calculateChart({
    ...DEFAULT_INPUT,
    ...inputPatch,
    location: inputPatch.location ?? DEFAULT_INPUT.location
  }, ruleProfile);
  const revision: RevisionRecord = {
    schemaVersion: "1.0.0",
    id: "77777777-7777-4777-8777-777777777777",
    caseId: "88888888-8888-4888-8888-888888888888",
    revisionNumber: 5,
    createdAt: "2026-08-24T00:00:00.000Z",
    input: chart.input,
    timeCalibration: chart.timeCalibration,
    ruleProfile: chart.ruleProfile,
    luckCycleRuleSnapshot: chart.luckCycleRuleSnapshot,
    facts: chart.facts,
    manifest: chart.manifest
  };
  const interpretation = interpretBaziChart(revision.facts, { includeHour: true });
  const input: BuildBaziInterpretationEvidenceEnvelopeV2Input = {
    revision,
    legacyEnvelopeInput: {
      revision,
      includeHour: true,
      interpretation,
      strengthSensitivity: buildStrengthSensitivityReview(interpretation)
    },
    birthTimePerturbationReport: await buildBaziBirthTimePerturbationStabilityReport(revision)
  };
  return {
    revision,
    input,
    envelope: await buildBaziInterpretationEvidenceEnvelopeV2(input)
  };
}

function formatOffset(offset: number): string {
  return offset > 0 ? `+${offset}` : String(offset);
}

function formatList(values: readonly string[]): string {
  return values.length === 0 ? "none" : values.join(",");
}

function canonicalTimeSummary(envelope: BaziInterpretationEvidenceEnvelopeV2): string {
  const summary = envelope.timePerturbation;
  const blocked = summary.blockedOffsets.map((item) => (
    `${formatOffset(item.offsetMinutes)}:${item.blockCode}:${item.timeZoneResolutionKind ?? "null"}:${item.timeZoneResolutionStatus ?? "null"}`
  ));
  const resolved = summary.resolvedOverlapOffsets.map((item) => (
    `${formatOffset(item.offsetMinutes)}:${item.timeZoneResolutionStatus}:${item.selectedTimeZoneCandidateChoice}`
  ));
  const scope = summary.status === "inconclusive_due_to_blocked_offsets"
    ? "calculated_subset_only"
    : "all_requested_offsets";
  return [
    `timePillarProjectionStatus=${summary.status}`,
    `projectionScope=${scope}`,
    `requestedOffsetsMinutes=[${summary.requestedOffsetsMinutes.map(formatOffset).join(",")}]`,
    `calculatedOffsetsMinutes=[${summary.calculatedOffsetsMinutes.map(formatOffset).join(",")}]`,
    `blockedOffsets=[${formatList(blocked)}]`,
    `resolvedOverlapOffsets=[${formatList(resolved)}]`,
    `changedFromBaselineOffsetsMinutes=[${formatList(summary.changedFromBaselineOffsetsMinutes.map(formatOffset))}]`,
    `changedPillarIdentities=[${formatList([...summary.changedPillarIdentities])}]`,
    `changedFactPaths=[${formatList([...summary.changedFactPaths])}]`,
    "interpretationStabilityClaimed=false"
  ].join("; ");
}

const CANONICAL_COMBINED_STATUS =
  "combinedInterpretationStatus=not_assessed; interpretationStabilityClaimed=false";

function timeAssertion(
  assertionId: string,
  order: number,
  family: BaziInterpretationAiV2TimeAssertionDraftItem["family"],
  subjectId: string,
  content: string
): BaziInterpretationAiV2TimeAssertionDraftItem {
  return { assertionId, order, family, subjectId, content };
}

function draft(
  envelope: BaziInterpretationEvidenceEnvelopeV2,
  legacyAssertions: readonly BaziInterpretationAiAssertionDraftItem[] = [],
  timeAssertions: readonly BaziInterpretationAiV2TimeAssertionDraftItem[] = []
): BaziInterpretationAiAssertionDraftV2 {
  return {
    profileVersion: BAZI_INTERPRETATION_AI_ASSERTION_DRAFT_V2_VERSION,
    envelopeV2PayloadSha256: envelope.integrity.payloadSha256,
    legacyDraft: {
      profileVersion: BAZI_INTERPRETATION_AI_ASSERTION_DRAFT_VERSION,
      envelopePayloadSha256: envelope.legacyEnvelope.integrity.payloadSha256,
      assertions: legacyAssertions
    },
    timeAssertions
  };
}

function evaluationInput(
  data: Fixture,
  candidateDraft: BaziInterpretationAiAssertionDraftV2
): TypedEvaluationInput {
  return { envelope: data.envelope, envelopeInput: data.input, draft: candidateDraft };
}

async function resignEnvelope(envelope: BaziInterpretationEvidenceEnvelopeV2): Promise<void> {
  const { integrity: _integrity, ...payload } = envelope;
  (envelope.integrity as { payloadSha256: string }).payloadSha256 = await sha256Hex(payload);
}

async function resignReport(report: BaziBirthTimePerturbationStabilityReport): Promise<void> {
  const { integrity: _integrity, ...payload } = report;
  (report.integrity as { payloadSha256: string }).payloadSha256 = await sha256Hex(payload);
}

async function resignResult(result: BaziInterpretationAiFaithfulnessV2Result): Promise<void> {
  const { integrity: _integrity, ...payload } = result;
  (result.integrity as { payloadSha256: string }).payloadSha256 = await sha256Hex(payload);
}

let unchanged: Fixture;
let changed: Fixture;
let blocked: Fixture;
let earlier: Fixture;
let later: Fixture;

beforeAll(async () => {
  const fixedEarlier = structuredClone(WORKING_DEFAULT_RULE_PROFILE);
  fixedEarlier.calendar.dstAmbiguity = "earlier";
  const fixedLater = structuredClone(WORKING_DEFAULT_RULE_PROFILE);
  fixedLater.calendar.dstAmbiguity = "later";
  [unchanged, changed, blocked, earlier, later] = await Promise.all([
    fixture(),
    fixture({ time: "08:59" }),
    fixture({ date: "2024-11-03", time: "00:50", timeZone: "America/New_York" }),
    fixture({ date: "2024-11-03", time: "01:15", timeZone: "America/New_York" }, fixedEarlier),
    fixture({ date: "2024-11-03", time: "01:15", timeZone: "America/New_York" }, fixedLater)
  ]);
}, 60_000);

describe("Bazi interpretation AI faithfulness v2", () => {
  it("nests the complete legacy result and accepts only caveated exact local time renderings", async () => {
    const candidateDraft = draft(unchanged.envelope, [], [
      timeAssertion(
        "time1",
        1,
        "time_summary_quote",
        BAZI_INTERPRETATION_AI_V2_TIME_SUMMARY_SUBJECT_ID,
        canonicalTimeSummary(unchanged.envelope)
      ),
      timeAssertion(
        "time2",
        2,
        "combined_interpretation_status_quote",
        BAZI_INTERPRETATION_AI_V2_COMBINED_STATUS_SUBJECT_ID,
        CANONICAL_COMBINED_STATUS
      )
    ]);
    const input = evaluationInput(unchanged, candidateDraft);
    const result = await evaluateBaziInterpretationAiFaithfulnessV2(input);
    const expectedLegacyResult = await evaluateBaziInterpretationAiFaithfulness({
      envelope: unchanged.envelope.legacyEnvelope,
      envelopeInput: unchanged.input.legacyEnvelopeInput,
      draft: candidateDraft.legacyDraft
    });

    expect(result.legacyResult).toEqual(expectedLegacyResult);
    expect(result.timeAssertions.map((item) => item.verdict)).toEqual(["advisory", "advisory"]);
    expect(result.timeAssertions.every((item) => item.displayStatus === "visible_with_caveat"))
      .toBe(true);
    expect(result.timeAssessment).toEqual({
      counts: {
        assertionsTotal: 2,
        displayable: 2,
        advisory: 2,
        invented: 0,
        unsupported: 0,
        blocked: 0
      },
      projectionScope: "all_requested_offsets",
      combinedInterpretationStatus: "not_assessed",
      interpretationStabilityClaimed: false,
      overallStatus: "caveated_exact_quotes_only"
    });
    expect(result.binding).toMatchObject({
      revisionId: unchanged.revision.id,
      revisionResultHash: unchanged.revision.manifest.resultHash,
      envelopeV2PayloadSha256: unchanged.envelope.integrity.payloadSha256,
      legacyEnvelopePayloadSha256: unchanged.envelope.legacyEnvelope.integrity.payloadSha256,
      birthTimePerturbationReportPayloadSha256:
        unchanged.input.birthTimePerturbationReport.integrity.payloadSha256,
      outerDraftSha256: await sha256Hex(candidateDraft),
      legacyDraftSha256: await sha256Hex(candidateDraft.legacyDraft),
      legacyResultPayloadSha256: result.legacyResult.integrity.payloadSha256
    });
    expect(result.boundary).toMatchObject({
      crossPartitionRatioProduced: false,
      rawBirthInputCopied: false,
      containsDerivedSensitiveChartData: true,
      fullTimePerturbationScenariosCopied: false,
      combinedInterpretationStatus: "not_assessed",
      interpretationStabilityClaimed: false,
      publicReleaseAuthorized: false
    });
    expect("coverageRatio" in result.timeAssessment).toBe(false);
    expect("faithfulnessRatio" in result.timeAssessment).toBe(false);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.legacyResult)).toBe(true);
    await expect(validateBaziInterpretationAiFaithfulnessV2Result(result, input)).resolves.toEqual(result);
  }, 30_000);

  it("keeps changed and blocked time summaries advisory while limiting blocked output to calculated scenarios", async () => {
    const changedResult = await evaluateBaziInterpretationAiFaithfulnessV2(evaluationInput(
      changed,
      draft(changed.envelope, [], [timeAssertion(
        "changed1",
        1,
        "time_summary_quote",
        BAZI_INTERPRETATION_AI_V2_TIME_SUMMARY_SUBJECT_ID,
        canonicalTimeSummary(changed.envelope)
      )])
    ));
    expect(changedResult.timeAssertions[0]).toMatchObject({
      verdict: "advisory",
      displayStatus: "visible_with_caveat",
      projectionScope: "all_requested_offsets"
    });
    expect(changedResult.timeAssertions[0]!.canonicalContent)
      .toContain("pillar_projection_changed_within_requested_offsets");
    expect(changedResult.timeAssertions[0]!.canonicalContent)
      .toContain("changedPillarIdentities=[hour]");

    const blockedResult = await evaluateBaziInterpretationAiFaithfulnessV2(evaluationInput(
      blocked,
      draft(blocked.envelope, [], [timeAssertion(
        "blocked1",
        1,
        "time_summary_quote",
        BAZI_INTERPRETATION_AI_V2_TIME_SUMMARY_SUBJECT_ID,
        canonicalTimeSummary(blocked.envelope)
      )])
    ));
    expect(blockedResult.timeAssertions[0]).toMatchObject({
      verdict: "advisory",
      displayStatus: "visible_with_caveat",
      projectionScope: "calculated_subset_only",
      missingEvidence: ["complete_offset_window_not_available"]
    });
    expect(blockedResult.timeAssessment.projectionScope).toBe("calculated_subset_only");
    expect(blockedResult.timeAssertions[0]!.canonicalContent).toContain("projectionScope=calculated_subset_only");
    expect(blockedResult.timeAssertions[0]!.canonicalContent).toContain("dst_overlap_requires_scenario_choice");
  }, 30_000);

  it("preserves the paired earlier and later DST choices in the fixed renderer", async () => {
    for (const [data, choice] of [[earlier, "earlier"], [later, "later"]] as const) {
      const result = await evaluateBaziInterpretationAiFaithfulnessV2(evaluationInput(
        data,
        draft(data.envelope, [], [timeAssertion(
          `dst_${choice}`,
          1,
          "time_summary_quote",
          BAZI_INTERPRETATION_AI_V2_TIME_SUMMARY_SUBJECT_ID,
          canonicalTimeSummary(data.envelope)
        )])
      ));
      expect(result.timeAssertions[0]).toMatchObject({
        verdict: "advisory",
        displayStatus: "visible_with_caveat"
      });
      expect(result.timeAssertions[0]!.canonicalContent)
        .toContain(`resolved_overlap_${choice}:${choice}`);
    }
  }, 30_000);

  it("blocks stable and unstable replacements for the fixed not_assessed combined status", async () => {
    const stableClaim = "combinedInterpretationStatus=stable; interpretationStabilityClaimed=true";
    const unstableClaim = "combinedInterpretationStatus=unstable; interpretationStabilityClaimed=true";
    const result = await evaluateBaziInterpretationAiFaithfulnessV2(evaluationInput(
      unchanged,
      draft(unchanged.envelope, [], [
        timeAssertion(
          "stable1",
          1,
          "combined_interpretation_status_quote",
          BAZI_INTERPRETATION_AI_V2_COMBINED_STATUS_SUBJECT_ID,
          stableClaim
        ),
        timeAssertion(
          "unstable1",
          2,
          "combined_interpretation_status_quote",
          BAZI_INTERPRETATION_AI_V2_COMBINED_STATUS_SUBJECT_ID,
          unstableClaim
        )
      ])
    ));

    expect(result.timeAssertions.map((item) => item.verdict)).toEqual(["blocked", "blocked"]);
    expect(result.timeAssertions.every((item) => item.displayStatus === "withheld")).toBe(true);
    expect(result.timeAssertions.every((item) => item.canonicalContent === null)).toBe(true);
    expect(JSON.stringify(result)).not.toContain(stableClaim);
    expect(JSON.stringify(result)).not.toContain(unstableClaim);
  }, 30_000);

  it("rejects outer, nested legacy, Envelope and report binding substitutions even after re-signing", async () => {
    const outerStale = draft(unchanged.envelope);
    outerStale.envelopeV2PayloadSha256 = "0".repeat(64);
    await expect(evaluateBaziInterpretationAiFaithfulnessV2(evaluationInput(unchanged, outerStale)))
      .rejects.toThrow(/等式闭包/u);

    const legacyStale = draft(unchanged.envelope);
    legacyStale.legacyDraft.envelopePayloadSha256 = "1".repeat(64);
    await expect(evaluateBaziInterpretationAiFaithfulnessV2(evaluationInput(unchanged, legacyStale)))
      .rejects.toThrow(/等式闭包/u);

    const rewrittenEnvelope = structuredClone(unchanged.envelope);
    (rewrittenEnvelope.binding as { revisionResultHash: string }).revisionResultHash = "2".repeat(64);
    await resignEnvelope(rewrittenEnvelope);
    await expect(evaluateBaziInterpretationAiFaithfulnessV2({
      envelope: rewrittenEnvelope,
      envelopeInput: unchanged.input,
      draft: draft(rewrittenEnvelope)
    })).rejects.toThrow(/规范重建不一致/u);

    const alteredInput = structuredClone(unchanged.input);
    Object.assign(alteredInput.birthTimePerturbationReport.counts as object, {
      calculated: 0,
      blocked: 7
    });
    await resignReport(alteredInput.birthTimePerturbationReport);
    await expect(evaluateBaziInterpretationAiFaithfulnessV2({
      envelope: unchanged.envelope,
      envelopeInput: alteredInput,
      draft: draft(unchanged.envelope)
    })).rejects.toThrow(/规范重建不一致/u);
  }, 30_000);

  it("does not echo raw birth data, scenarios, freeform content, attacker IDs, notes, digests or executor IDs as AI content", async () => {
    const freeform = "绝不能回显的自由解释正文";
    const unknownId = "private.subject.1995-08-18.08:26";
    const candidateDraft = draft(unchanged.envelope, [{
      assertionId: "private_assertion_0826",
      order: 1,
      family: "freeform_interpretation",
      subjectId: null,
      content: freeform
    }], [timeAssertion(
      "unknown_time_0826",
      1,
      "time_summary_quote",
      unknownId,
      "未知引用正文不得回显"
    )]);
    const result = await evaluateBaziInterpretationAiFaithfulnessV2(
      evaluationInput(unchanged, candidateDraft)
    );
    const serialized = JSON.stringify(result);
    const timeContent = result.timeAssertions.map((item) => item.canonicalContent ?? "").join("\n");

    expect(result.timeAssertions[0]).toMatchObject({
      assertionRef: "time_assertion:1",
      subjectId: null,
      verdict: "invented",
      displayStatus: "withheld",
      canonicalContent: null
    });
    expect(serialized).not.toContain(freeform);
    expect(serialized).not.toContain(unknownId);
    expect(serialized).not.toContain("private_assertion_0826");
    expect(serialized).not.toContain(DEFAULT_INPUT.date);
    expect(serialized).not.toContain(DEFAULT_INPUT.time!);
    expect(serialized).not.toContain(DEFAULT_INPUT.location!.label);
    expect(serialized).not.toContain(DEFAULT_INPUT.sourceNote!);
    expect(serialized).not.toContain(unchanged.input.birthTimePerturbationReport.scenarios[0]!.scenarioId);
    expect(timeContent).not.toContain(unchanged.envelope.timePerturbation.note);
    expect(timeContent).not.toContain(unchanged.envelope.timePerturbation.reportPayloadSha256);
    expect(timeContent).not.toContain(unchanged.envelope.timePerturbation.executorId);

    const attackerFamily = "private_family_1995_08_18";
    const attackerAssertionId = "private_error_0826";
    const attackerContent = "错误信息不得回显的正文";
    const malformedDraft: unknown = {
      ...structuredClone(draft(unchanged.envelope)),
      timeAssertions: [{
        assertionId: attackerAssertionId,
        order: 1,
        family: attackerFamily,
        subjectId: BAZI_INTERPRETATION_AI_V2_TIME_SUMMARY_SUBJECT_ID,
        content: attackerContent
      }]
    };
    const failure = await evaluateBaziInterpretationAiFaithfulnessV2({
      envelope: unchanged.envelope,
      envelopeInput: unchanged.input,
      draft: malformedDraft
    }).catch((cause: unknown) => cause);
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toMatch(/第 1 条/u);
    expect((failure as Error).message).not.toContain(attackerFamily);
    expect((failure as Error).message).not.toContain(attackerAssertionId);
    expect((failure as Error).message).not.toContain(attackerContent);
  }, 30_000);

  it("reports empty partitions without manufacturing a cross-partition ratio", async () => {
    const result = await evaluateBaziInterpretationAiFaithfulnessV2(
      evaluationInput(unchanged, draft(unchanged.envelope))
    );
    expect(result.legacyResult.counts.assertionsTotal).toBe(0);
    expect(result.timeAssessment).toMatchObject({
      counts: { assertionsTotal: 0, displayable: 0, advisory: 0, invented: 0, unsupported: 0, blocked: 0 },
      overallStatus: "no_time_assertions",
      combinedInterpretationStatus: "not_assessed",
      interpretationStabilityClaimed: false
    });
    expect(Object.keys(result.timeAssessment).some((key) => /ratio/iu.test(key))).toBe(false);
    expect(result.boundary.crossPartitionRatioProduced).toBe(false);
  }, 30_000);

  it("rejects duplicates and enforces the combined assertion and content budgets", async () => {
    const exact = timeAssertion(
      "duplicate1",
      1,
      "time_summary_quote",
      BAZI_INTERPRETATION_AI_V2_TIME_SUMMARY_SUBJECT_ID,
      canonicalTimeSummary(unchanged.envelope)
    );
    await expect(evaluateBaziInterpretationAiFaithfulnessV2(evaluationInput(
      unchanged,
      draft(unchanged.envelope, [], [exact, { ...exact, assertionId: "duplicate2", order: 2 }])
    ))).rejects.toThrow(/第 2 条.*语义键/u);

    const sixtyFourLegacy = Array.from({ length: 64 }, (_, index) => ({
      assertionId: `legacy_${index + 1}`,
      order: index + 1,
      family: "freeform_interpretation" as const,
      subjectId: null,
      content: `legacy content ${index + 1}`
    }));
    await expect(evaluateBaziInterpretationAiFaithfulnessV2(evaluationInput(
      unchanged,
      draft(unchanged.envelope, sixtyFourLegacy, [timeAssertion(
        "time_over_total",
        1,
        "combined_interpretation_status_quote",
        BAZI_INTERPRETATION_AI_V2_COMBINED_STATUS_SUBJECT_ID,
        CANONICAL_COMBINED_STATUS
      )])
    ))).rejects.toThrow(/合计最多允许 64/u);

    const oversizedTotal = Array.from({ length: 17 }, (_, index) => ({
      assertionId: `long_${index + 1}`,
      order: index + 1,
      family: "freeform_interpretation" as const,
      subjectId: null,
      content: `${String(index).padStart(2, "0")}${"x".repeat(1_998)}`
    }));
    await expect(evaluateBaziInterpretationAiFaithfulnessV2(evaluationInput(
      unchanged,
      draft(unchanged.envelope, oversizedTotal)
    ))).rejects.toThrow(/正文合计/u);

    await expect(evaluateBaziInterpretationAiFaithfulnessV2(evaluationInput(
      unchanged,
      draft(unchanged.envelope, [], [timeAssertion(
        "too_long",
        1,
        "time_summary_quote",
        BAZI_INTERPRETATION_AI_V2_TIME_SUMMARY_SUBJECT_ID,
        "x".repeat(2_001)
      )])
    ))).rejects.toThrow(/第 1 条.*content/u);
  }, 30_000);

  it("rejects accessors and Symbol keys without invoking attacker code", async () => {
    const accessorInput = structuredClone(evaluationInput(
      unchanged,
      draft(unchanged.envelope, [], [timeAssertion(
        "accessor1",
        1,
        "time_summary_quote",
        BAZI_INTERPRETATION_AI_V2_TIME_SUMMARY_SUBJECT_ID,
        canonicalTimeSummary(unchanged.envelope)
      )])
    ));
    let contentReads = 0;
    const originalContent = accessorInput.draft.timeAssertions[0]!.content;
    Object.defineProperty(accessorInput.draft.timeAssertions[0], "content", {
      configurable: true,
      enumerable: true,
      get() {
        contentReads += 1;
        return originalContent;
      }
    });
    await expect(evaluateBaziInterpretationAiFaithfulnessV2(accessorInput))
      .rejects.toThrow(/无法形成规范快照/u);
    expect(contentReads).toBe(0);

    const taggedInput = structuredClone(evaluationInput(unchanged, draft(unchanged.envelope)));
    let tagReads = 0;
    Object.defineProperty(taggedInput.draft.legacyDraft, Symbol.toStringTag, {
      configurable: true,
      enumerable: true,
      get() {
        tagReads += 1;
        return "InjectedDraft";
      }
    });
    await expect(evaluateBaziInterpretationAiFaithfulnessV2(taggedInput))
      .rejects.toThrow(/无法形成规范快照/u);
    expect(tagReads).toBe(0);

    const baseInput = evaluationInput(unchanged, draft(unchanged.envelope));
    const result = await evaluateBaziInterpretationAiFaithfulnessV2(baseInput);
    const accessorResult = structuredClone(result);
    let integrityReads = 0;
    const originalIntegrity = accessorResult.integrity;
    Object.defineProperty(accessorResult, "integrity", {
      configurable: true,
      enumerable: true,
      get() {
        integrityReads += 1;
        return originalIntegrity;
      }
    });
    await expect(validateBaziInterpretationAiFaithfulnessV2Result(accessorResult, baseInput))
      .rejects.toThrow(/无法形成规范快照/u);
    expect(integrityReads).toBe(0);
  }, 30_000);

  it("rejects cycles, sparse arrays and repeated shared DAG expansion before canonical cloning", async () => {
    const cyclic = structuredClone(evaluationInput(unchanged, draft(unchanged.envelope)));
    Object.defineProperty(cyclic.envelopeInput.revision, "preflightCycleProbe", {
      configurable: true,
      enumerable: true,
      writable: true,
      value: cyclic.envelopeInput.revision
    });
    await expect(evaluateBaziInterpretationAiFaithfulnessV2(cyclic)).rejects.toMatchObject({
      message: expect.stringMatching(/无法形成规范快照/u),
      cause: expect.objectContaining({ message: expect.stringMatching(/循环引用/u) })
    });

    const sparse = structuredClone(evaluationInput(unchanged, draft(unchanged.envelope)));
    (sparse.draft as unknown as { timeAssertions: unknown[] }).timeAssertions = new Array<unknown>(2);
    await expect(evaluateBaziInterpretationAiFaithfulnessV2(sparse)).rejects.toMatchObject({
      cause: expect.objectContaining({ message: expect.stringMatching(/稠密且没有扩展字段/u) })
    });

    const repeated = structuredClone(evaluationInput(unchanged, draft(unchanged.envelope)));
    const sharedLeaf = new Array<null>(2_000).fill(null);
    const references = new Array<readonly null[]>(50).fill(sharedLeaf);
    Object.defineProperty(repeated.envelopeInput.revision, "preflightSharedDagProbe", {
      configurable: true,
      enumerable: true,
      writable: true,
      value: references
    });
    await expect(evaluateBaziInterpretationAiFaithfulnessV2(repeated)).rejects.toMatchObject({
      message: expect.stringMatching(/无法形成规范快照/u),
      cause: expect.objectContaining({ message: expect.stringMatching(/结构节点总量|属性键总量/u) })
    });
  }, 30_000);

  it("snapshots Envelope, rebuild input and both draft partitions before the first await", async () => {
    const candidateDraft = draft(unchanged.envelope, [], [timeAssertion(
      "toctou1",
      1,
      "time_summary_quote",
      BAZI_INTERPRETATION_AI_V2_TIME_SUMMARY_SUBJECT_ID,
      canonicalTimeSummary(unchanged.envelope)
    )]);
    const baselineInput = evaluationInput(unchanged, candidateDraft);
    const baseline = await evaluateBaziInterpretationAiFaithfulnessV2(baselineInput);
    const mutable = structuredClone(baselineInput);
    const inFlight = evaluateBaziInterpretationAiFaithfulnessV2(mutable);

    mutable.draft.timeAssertions[0]!.content = "await 窗口内的伪造稳定结论";
    (mutable.envelope.binding as { revisionResultHash: string }).revisionResultHash = "3".repeat(64);
    mutable.envelopeInput.revision.input.date = "2000-01-01";
    mutable.envelopeInput.legacyEnvelopeInput.revision.input.date = "2000-01-01";
    Object.assign(mutable.envelopeInput.birthTimePerturbationReport.counts as object, {
      calculated: 0,
      blocked: 7
    });

    await expect(inFlight).resolves.toEqual(baseline);
    expect(JSON.stringify(await inFlight)).not.toContain("伪造稳定结论");

    const mutableCandidate = structuredClone(baseline);
    const mutableExpectedInput = structuredClone(baselineInput);
    const validationInFlight = validateBaziInterpretationAiFaithfulnessV2Result(
      mutableCandidate,
      mutableExpectedInput
    );
    (mutableCandidate.timeAssertions[0] as { rationale: string }).rationale = "validator await 篡改";
    mutableExpectedInput.draft.timeAssertions[0]!.content = "validator await 草稿篡改";
    (mutableExpectedInput.envelope.binding as { revisionResultHash: string }).revisionResultHash =
      "4".repeat(64);
    await expect(validationInFlight).resolves.toEqual(baseline);
  }, 30_000);

  it("rejects a fully re-signed candidate result that diverges from deterministic rebuild", async () => {
    const candidateDraft = draft(unchanged.envelope, [], [timeAssertion(
      "resign1",
      1,
      "time_summary_quote",
      BAZI_INTERPRETATION_AI_V2_TIME_SUMMARY_SUBJECT_ID,
      canonicalTimeSummary(unchanged.envelope)
    )]);
    const input = evaluationInput(unchanged, candidateDraft);
    const result = await evaluateBaziInterpretationAiFaithfulnessV2(input);
    const rewritten = structuredClone(result);
    (rewritten.timeAssertions[0] as { rationale: string }).rationale = "伪造的重签解释";
    await resignResult(rewritten);

    await expect(validateBaziInterpretationAiFaithfulnessV2Result(rewritten, input))
      .rejects.toThrow(/完整重建不一致/u);
  }, 30_000);
});
