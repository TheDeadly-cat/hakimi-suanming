import { describe, expect, it } from "vitest";
import type { RevisionRecord } from "@hakimi/contracts";
import { calculateChart } from "@hakimi/bazi-core";
import { sha256Hex } from "@hakimi/integrity";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import {
  BAZI_INTERPRETATION_EVIDENCE_ENVELOPE_PROFILE,
  buildBaziInterpretationEvidenceEnvelope,
  buildStrengthSensitivityReview,
  interpretBaziChart,
  validateBaziInterpretationEvidenceEnvelope,
  type BuildBaziInterpretationEvidenceEnvelopeInput,
  type BaziInterpretationEvidenceEnvelope
} from "./index";

async function fixtureRevision(): Promise<RevisionRecord> {
  const chart = await calculateChart({
    schemaVersion: "1.0.0",
    calendarType: "gregorian",
    date: "1995-08-18",
    time: "08:26",
    timePrecision: "exact_minute",
    timeZone: "Asia/Shanghai",
    sex: "male",
    lunarLeapMonth: false,
    location: { label: "测试地点不得进入 Envelope", latitude: null, longitude: null, precision: "unknown" },
    sourceNote: "测试备注不得进入 Envelope"
  }, WORKING_DEFAULT_RULE_PROFILE);
  return {
    schemaVersion: "1.0.0",
    id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222",
    revisionNumber: 2,
    createdAt: "2026-08-24T00:00:00.000Z",
    input: chart.input,
    timeCalibration: chart.timeCalibration,
    ruleProfile: chart.ruleProfile,
    luckCycleRuleSnapshot: chart.luckCycleRuleSnapshot,
    facts: chart.facts,
    manifest: chart.manifest
  };
}

async function buildFixture(includeHour = true): Promise<{
  revision: RevisionRecord;
  envelope: BaziInterpretationEvidenceEnvelope;
  input: BuildBaziInterpretationEvidenceEnvelopeInput;
}> {
  const revision = await fixtureRevision();
  const interpretation = interpretBaziChart(revision.facts, { includeHour });
  const input: BuildBaziInterpretationEvidenceEnvelopeInput = {
    revision,
    includeHour,
    interpretation,
    strengthSensitivity: buildStrengthSensitivityReview(interpretation)
  };
  const envelope = await buildBaziInterpretationEvidenceEnvelope(input);
  return { revision, envelope, input };
}

async function resignEnvelopePayload(envelope: BaziInterpretationEvidenceEnvelope): Promise<void> {
  const { integrity: _integrity, ...payload } = envelope;
  (envelope.integrity as { payloadSha256: string }).payloadSha256 = await sha256Hex(payload);
}

describe("Bazi interpretation evidence Envelope v0.19", () => {
  it("binds every usable narrative claim to the current Revision, facts, rules and exact source locators", async () => {
    const { revision, envelope, input } = await buildFixture();

    expect(envelope.profile).toEqual(BAZI_INTERPRETATION_EVIDENCE_ENVELOPE_PROFILE);
    expect(envelope.artifact).toMatchObject({
      system: "bazi",
      revisionId: revision.id,
      revisionNumber: revision.revisionNumber,
      artifactDigest: revision.manifest.resultHash,
      ruleProfileDigest: revision.manifest.ruleProfileDigest,
      tzdbVersion: revision.manifest.tzdbVersion
    });
    expect(envelope.counts.supported).toBeGreaterThan(0);
    expect(envelope.counts.blocked).toBeGreaterThan(0);
    expect(envelope.counts.advisory).toBe(1);
    expect(envelope.claims.filter((claim) => claim.classification === "supported").every((claim) => (
      claim.factIds.length > 0
      && claim.ruleIds.length > 0
      && claim.sourceBindingIds.length > 0
      && claim.displayStatus === "visible_with_evidence"
      && claim.rationale.includes("不证明术数或科学真值")
    ))).toBe(true);
    expect(envelope.claims.filter((claim) => claim.classification === "blocked").every((claim) => (
      claim.missingEvidence.length > 0 && claim.displayStatus === "withheld"
    ))).toBe(true);
    expect(envelope.stability).toMatchObject({
      coverage: "declared_strength_rule_scenarios_only",
      timePerturbationStatus: "not_assessed"
    });
    expect(envelope.boundary).toMatchObject({
      referenceResolutionEstablishesSemanticTruth: false,
      modelMayRecalculateFacts: false,
      expertTruthClaimed: false,
      formalActivationAllowed: false,
      publicReleaseAuthorized: false,
      rawBirthInputCopied: false,
      containsDerivedSensitiveChartData: true,
      networkTransmissionPerformed: false,
      networkTransmissionAuthorized: false,
      chartOrStorageMutationPerformed: false
    });
    expect(Object.isFrozen(envelope)).toBe(true);
    expect(Object.isFrozen(envelope.claims)).toBe(true);
    await expect(validateBaziInterpretationEvidenceEnvelope(envelope, input)).resolves.toEqual(envelope);
  });

  it("records input sufficiency without copying raw birth time, coordinates, place label or notes", async () => {
    const { envelope, input } = await buildFixture();
    const serialized = JSON.stringify(envelope);

    expect(envelope.inputAssumptions.find((item) => item.assumptionId === "input:birth-time-precision"))
      .toMatchObject({ status: "confirmed", value: "exact_minute" });
    expect(envelope.inputAssumptions.find((item) => item.assumptionId === "input:location-precision"))
      .toMatchObject({ status: "missing", value: "unknown" });
    expect(envelope.inputAssumptions.find((item) => item.assumptionId === "input:rule-profile-review"))
      .toMatchObject({ status: "candidate", value: "working_default" });
    expect(serialized).not.toContain("1995-08-18");
    expect(serialized).not.toContain("08:26");
    expect(serialized).not.toContain("测试地点不得进入 Envelope");
    expect(serialized).not.toContain("测试备注不得进入 Envelope");
    expect(envelope.integrity).toMatchObject({ hashAlgorithm: "SHA-256", authenticityClaimed: false });
    await expect(validateBaziInterpretationEvidenceEnvelope(envelope, input)).resolves.toEqual(envelope);
  });

  it("withholds every hour value when the caller excludes an unreliable hour", async () => {
    const { revision, envelope } = await buildFixture(false);
    const hourFactIdPrefix = "strength-evidence:";
    const hourFacts = envelope.facts.filter((fact) => (
      fact.fieldPath === "revision.facts.pillars.hour.withheld"
      && fact.factId.startsWith(hourFactIdPrefix)
    ));

    expect(hourFacts.length).toBeGreaterThan(0);
    expect(hourFacts.every((fact) => fact.status === "withheld" && fact.value === null)).toBe(true);
    expect(envelope.inputAssumptions.find((item) => item.assumptionId === "input:hour-inclusion"))
      .toMatchObject({ status: "missing", value: "false" });
    expect(JSON.stringify(envelope)).not.toContain(revision.facts.pillars.hour.ganZhi);
  });

  it("fails closed when references, classifications or declared counts are altered", async () => {
    const { envelope, input } = await buildFixture();
    const missingBinding = structuredClone(envelope) as BaziInterpretationEvidenceEnvelope;
    const firstSupported = missingBinding.claims.find((claim) => claim.classification === "supported");
    expect(firstSupported).toBeTruthy();
    (firstSupported as unknown as { sourceBindingIds: string[] }).sourceBindingIds = ["binding:missing"];
    await expect(validateBaziInterpretationEvidenceEnvelope(missingBinding, input)).rejects.toThrow(/引用无法解析|payload 摘要/u);

    const promotedBlocked = structuredClone(envelope) as BaziInterpretationEvidenceEnvelope;
    const firstBlocked = promotedBlocked.claims.find((claim) => claim.classification === "blocked");
    expect(firstBlocked).toBeTruthy();
    Object.assign(firstBlocked as object, {
      classification: "supported",
      displayStatus: "visible_with_evidence",
      missingEvidence: []
    });
    await expect(validateBaziInterpretationEvidenceEnvelope(promotedBlocked, input)).rejects.toThrow(/supported 主张|payload 摘要/u);

    const wrongCounts = structuredClone(envelope) as BaziInterpretationEvidenceEnvelope;
    (wrongCounts.counts as { supported: number }).supported += 1;
    await expect(validateBaziInterpretationEvidenceEnvelope(wrongCounts, input)).rejects.toThrow(/计数/u);

    const validIdSwap = structuredClone(envelope) as BaziInterpretationEvidenceEnvelope;
    const swappable = validIdSwap.claims.find((claim) => (
      claim.classification === "supported" && claim.sourceBindingIds.length > 0
    ));
    const replacement = validIdSwap.sourceBindings.find((binding) => (
      !swappable?.sourceBindingIds.includes(binding.bindingId)
      && binding.exactLocator.verificationStatus === "verified"
    ));
    expect(swappable).toBeTruthy();
    expect(replacement).toBeTruthy();
    (swappable as unknown as { sourceBindingIds: string[] }).sourceBindingIds = [replacement!.bindingId];
    await resignEnvelopePayload(validIdSwap);
    await expect(validateBaziInterpretationEvidenceEnvelope(validIdSwap, input)).rejects.toThrow(/规范重建/u);

    const rewrittenText = structuredClone(envelope) as BaziInterpretationEvidenceEnvelope;
    (rewrittenText.claims[0] as unknown as { text: string }).text = "伪造的个人吉凶或专家结论";
    await resignEnvelopePayload(rewrittenText);
    await expect(validateBaziInterpretationEvidenceEnvelope(rewrittenText, input)).rejects.toThrow(/规范重建/u);

    const rewrittenStability = structuredClone(envelope) as BaziInterpretationEvidenceEnvelope;
    Object.assign(rewrittenStability.stability as object, { overallStatus: "stable" });
    await resignEnvelopePayload(rewrittenStability);
    await expect(validateBaziInterpretationEvidenceEnvelope(rewrittenStability, input)).rejects.toThrow(/规范重建/u);

    const extraPrivateField = structuredClone(envelope) as BaziInterpretationEvidenceEnvelope & { rawBirthInput?: unknown };
    extraPrivateField.rawBirthInput = { date: "1995-08-18", time: "08:26" };
    await expect(validateBaziInterpretationEvidenceEnvelope(extraPrivateField, input)).rejects.toThrow(/严格白名单/u);
  });

  it("rejects hour inclusion for an unknown-hour Revision and rejects stale derived input", async () => {
    const revision = await fixtureRevision();
    const unknownHourRevision = structuredClone(revision);
    unknownHourRevision.input.time = null;
    unknownHourRevision.input.timePrecision = "unknown_hour";
    const interpretation = interpretBaziChart(unknownHourRevision.facts, { includeHour: true });
    await expect(buildBaziInterpretationEvidenceEnvelope({
      revision: unknownHourRevision,
      includeHour: true,
      interpretation,
      strengthSensitivity: buildStrengthSensitivityReview(interpretation)
    })).rejects.toThrow(/只有精确到分或秒/u);

    const staleInterpretation = interpretBaziChart(revision.facts, { includeHour: true });
    staleInterpretation.strength.factors[0]!.weight += 1;
    await expect(buildBaziInterpretationEvidenceEnvelope({
      revision,
      includeHour: true,
      interpretation: staleInterpretation,
      strengthSensitivity: buildStrengthSensitivityReview(interpretBaziChart(revision.facts, { includeHour: true }))
    })).rejects.toThrow(/完整派生/u);
  });

  it("rejects a shape-valid Revision whose facts no longer match its stored result hash", async () => {
    const revision = structuredClone(await fixtureRevision());
    revision.facts.pillars.year.stem = revision.facts.pillars.year.stem === "甲" ? "乙" : "甲";
    revision.facts.pillars.year.ganZhi = `${revision.facts.pillars.year.stem}${revision.facts.pillars.year.branch}`;
    const interpretation = interpretBaziChart(revision.facts, { includeHour: true });

    await expect(buildBaziInterpretationEvidenceEnvelope({
      revision,
      includeHour: true,
      interpretation,
      strengthSensitivity: buildStrengthSensitivityReview(interpretation)
    })).rejects.toThrow(/完整运行时契约/u);
  });

  it("rejects an hour-range request before any hour facts can be promoted", async () => {
    const revision = structuredClone(await fixtureRevision());
    revision.input.timePrecision = "hour_range";
    const interpretation = interpretBaziChart(revision.facts, { includeHour: true });
    await expect(buildBaziInterpretationEvidenceEnvelope({
      revision,
      includeHour: true,
      interpretation,
      strengthSensitivity: buildStrengthSensitivityReview(interpretation)
    })).rejects.toThrow(/只有精确到分或秒/u);
  });

  it("snapshots mutable derived inputs before the first async integrity check", async () => {
    const revision = await fixtureRevision();
    const baselineInterpretation = interpretBaziChart(revision.facts, { includeHour: true });
    const baselineSensitivity = buildStrengthSensitivityReview(baselineInterpretation);
    const baseline = await buildBaziInterpretationEvidenceEnvelope({
      revision,
      includeHour: true,
      interpretation: baselineInterpretation,
      strengthSensitivity: baselineSensitivity
    });

    const mutableInterpretation = interpretBaziChart(revision.facts, { includeHour: true });
    const mutableSensitivity = buildStrengthSensitivityReview(mutableInterpretation);
    const inFlight = buildBaziInterpretationEvidenceEnvelope({
      revision,
      includeHour: true,
      interpretation: mutableInterpretation,
      strengthSensitivity: mutableSensitivity
    });
    (mutableInterpretation.strength as { label: string }).label = "并发篡改的伪造结论";

    await expect(inFlight).resolves.toEqual(baseline);
    expect(JSON.stringify(await inFlight)).not.toContain("并发篡改的伪造结论");

    const noHourInterpretation = interpretBaziChart(revision.facts, { includeHour: false });
    const noHourSensitivity = buildStrengthSensitivityReview(noHourInterpretation);
    const noHourBaseline = await buildBaziInterpretationEvidenceEnvelope({
      revision,
      includeHour: false,
      interpretation: noHourInterpretation,
      strengthSensitivity: noHourSensitivity
    });
    const mutableInput: BuildBaziInterpretationEvidenceEnvelopeInput = {
      revision,
      includeHour: false,
      interpretation: interpretBaziChart(revision.facts, { includeHour: false }),
      strengthSensitivity: noHourSensitivity
    };
    const includeHourInFlight = buildBaziInterpretationEvidenceEnvelope(mutableInput);
    (mutableInput as { includeHour: boolean }).includeHour = true;

    await expect(includeHourInFlight).resolves.toEqual(noHourBaseline);
    expect((await includeHourInFlight).inputAssumptions.find((item) => item.assumptionId === "input:hour-inclusion"))
      .toMatchObject({ value: "false" });
  });
});
