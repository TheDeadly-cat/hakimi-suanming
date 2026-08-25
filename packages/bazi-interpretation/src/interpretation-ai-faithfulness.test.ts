import { describe, expect, it } from "vitest";
import type { RevisionRecord } from "@hakimi/contracts";
import { calculateChart } from "@hakimi/bazi-core";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import {
  BAZI_INTERPRETATION_AI_ASSERTION_DRAFT_VERSION,
  buildBaziInterpretationEvidenceEnvelope,
  buildStrengthSensitivityReview,
  evaluateBaziInterpretationAiFaithfulness,
  interpretBaziChart,
  type BaziInterpretationAiAssertionDraft,
  type BuildBaziInterpretationEvidenceEnvelopeInput
} from "./index";

async function fixture(): Promise<{
  envelopeInput: BuildBaziInterpretationEvidenceEnvelopeInput;
  envelope: Awaited<ReturnType<typeof buildBaziInterpretationEvidenceEnvelope>>;
}> {
  const chart = await calculateChart({
    schemaVersion: "1.0.0",
    calendarType: "gregorian",
    date: "1995-08-18",
    time: "08:26",
    timePrecision: "exact_minute",
    timeZone: "Asia/Shanghai",
    sex: "male",
    lunarLeapMonth: false,
    location: { label: "不得进入 AI 校验结果", latitude: null, longitude: null, precision: "unknown" },
    sourceNote: "不得进入 AI 校验结果"
  }, WORKING_DEFAULT_RULE_PROFILE);
  const revision: RevisionRecord = {
    schemaVersion: "1.0.0",
    id: "55555555-5555-4555-8555-555555555555",
    caseId: "66666666-6666-4666-8666-666666666666",
    revisionNumber: 3,
    createdAt: "2026-08-24T00:00:00.000Z",
    input: chart.input,
    timeCalibration: chart.timeCalibration,
    ruleProfile: chart.ruleProfile,
    luckCycleRuleSnapshot: chart.luckCycleRuleSnapshot,
    facts: chart.facts,
    manifest: chart.manifest
  };
  const interpretation = interpretBaziChart(revision.facts, { includeHour: true });
  const envelopeInput: BuildBaziInterpretationEvidenceEnvelopeInput = {
    revision,
    includeHour: true,
    interpretation,
    strengthSensitivity: buildStrengthSensitivityReview(interpretation)
  };
  return {
    envelopeInput,
    envelope: await buildBaziInterpretationEvidenceEnvelope(envelopeInput)
  };
}

function draft(
  envelopePayloadSha256: string,
  assertions: BaziInterpretationAiAssertionDraft["assertions"]
): BaziInterpretationAiAssertionDraft {
  return {
    profileVersion: BAZI_INTERPRETATION_AI_ASSERTION_DRAFT_VERSION,
    envelopePayloadSha256,
    assertions
  };
}

function firstVisibleFact(envelope: Awaited<ReturnType<typeof buildBaziInterpretationEvidenceEnvelope>>) {
  const ruleById = new Map(envelope.rules.map((rule) => [rule.ruleId, rule] as const));
  return envelope.facts.find((fact) => (
    fact.status === "confirmed"
    && fact.ruleIds.every((ruleId) => ruleById.get(ruleId)?.status !== "blocked")
  ))!;
}

describe("Bazi interpretation AI faithfulness v0.20", () => {
  it("allows only exact visible facts and canonical claims while keeping rule text advisory", async () => {
    const { envelope, envelopeInput } = await fixture();
    const fact = firstVisibleFact(envelope);
    const claim = envelope.claims.find((item) => item.classification === "advisory")!;
    const rule = envelope.rules.find((item) => item.status !== "blocked")!;
    const result = await evaluateBaziInterpretationAiFaithfulness({
      envelope,
      envelopeInput,
      draft: draft(envelope.integrity.payloadSha256, [
        { assertionId: "a1", order: 1, family: "fact_quote", subjectId: fact.factId, content: fact.value! },
        { assertionId: "a2", order: 2, family: "canonical_claim_quote", subjectId: claim.claimId, content: claim.text },
        { assertionId: "a3", order: 3, family: "rule_quote", subjectId: rule.ruleId, content: rule.statement }
      ])
    });

    expect(result.assertions.map((item) => item.verdict)).toEqual(["supported", "advisory", "advisory"]);
    expect(result.assertions.map((item) => item.displayStatus)).toEqual([
      "visible_with_evidence",
      "visible_with_caveat",
      "visible_with_caveat"
    ]);
    expect(result.counts).toMatchObject({
      assertionsTotal: 3,
      machineCheckable: 3,
      displayable: 3,
      supported: 1,
      advisory: 2,
      invented: 0,
      contradicted: 0,
      unsupported: 0,
      blocked: 0
    });
    expect(result.coverage).toMatchObject({
      coverageRatio: 1,
      faithfulnessRatio: 1,
      overallStatus: "reference_faithful_within_covered_families"
    });
    expect(result.boundary).toMatchObject({
      exactQuoteMatchEstablishesSemanticTruth: false,
      paraphraseSemanticsAssessed: false,
      freeformContentDisplayAuthorized: false,
      expertTruthClaimed: false,
      publicReleaseAuthorized: false
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.assertions)).toBe(true);
  });

  it("withholds invented, contradicted, freeform, prohibited and upstream-blocked assertions", async () => {
    const { envelope, envelopeInput } = await fixture();
    const fact = firstVisibleFact(envelope);
    const blockedClaim = envelope.claims.find((item) => item.classification === "blocked")!;
    const freeform = "这是无法由封闭 grammar 证明的自由改写";
    const result = await evaluateBaziInterpretationAiFaithfulness({
      envelope,
      envelopeInput,
      draft: draft(envelope.integrity.payloadSha256, [
        { assertionId: "b1", order: 1, family: "fact_quote", subjectId: "fact:not-present", content: "虚构事实" },
        { assertionId: "b2", order: 2, family: "fact_quote", subjectId: fact.factId, content: "与规范事实不一致" },
        { assertionId: "b3", order: 3, family: "freeform_interpretation", subjectId: null, content: freeform },
        { assertionId: "b4", order: 4, family: "useful_god", subjectId: null, content: "尝试输出用神" },
        { assertionId: "b5", order: 5, family: "canonical_claim_quote", subjectId: blockedClaim.claimId, content: blockedClaim.text }
      ])
    });

    expect(result.assertions.map((item) => item.verdict)).toEqual([
      "invented",
      "contradicted",
      "unknown",
      "blocked",
      "blocked"
    ]);
    expect(result.assertions.every((item) => item.displayStatus === "withheld")).toBe(true);
    expect(result.assertions.every((item) => item.canonicalContent === null)).toBe(true);
    expect(result.counts).toMatchObject({
      assertionsTotal: 5,
      machineCheckable: 4,
      displayable: 0,
      invented: 1,
      contradicted: 1,
      unsupported: 0,
      unknown: 1,
      blocked: 2
    });
    expect(result.coverage).toMatchObject({ coverageRatio: 0.8, faithfulnessRatio: 0, overallStatus: "withheld" });
    expect(JSON.stringify(result)).not.toContain(freeform);
  });

  it("reports null ratios instead of a fake perfect score when no assertions are present", async () => {
    const { envelope, envelopeInput } = await fixture();
    const result = await evaluateBaziInterpretationAiFaithfulness({
      envelope,
      envelopeInput,
      draft: draft(envelope.integrity.payloadSha256, [])
    });

    expect(result.counts.assertionsTotal).toBe(0);
    expect(result.coverage).toMatchObject({
      coverageRatio: null,
      faithfulnessRatio: null,
      overallStatus: "no_verifiable_claims"
    });

    const unknownOnly = await evaluateBaziInterpretationAiFaithfulness({
      envelope,
      envelopeInput,
      draft: draft(envelope.integrity.payloadSha256, [
        { assertionId: "unknown1", order: 1, family: "freeform_interpretation", subjectId: null, content: "未经注册的自然语言同义改写" }
      ])
    });
    expect(unknownOnly.counts).toMatchObject({ machineCheckable: 0, unknown: 1, displayable: 0 });
    expect(unknownOnly.coverage).toMatchObject({
      coverageRatio: 0,
      faithfulnessRatio: null,
      overallStatus: "manual_review_required"
    });
  });

  it("rejects stale Envelope bindings, duplicate semantic claims and extra fields", async () => {
    const { envelope, envelopeInput } = await fixture();
    const fact = firstVisibleFact(envelope);
    await expect(evaluateBaziInterpretationAiFaithfulness({
      envelope,
      envelopeInput,
      draft: draft("0".repeat(64), [])
    })).rejects.toThrow(/没有绑定当前/u);

    await expect(evaluateBaziInterpretationAiFaithfulness({
      envelope,
      envelopeInput,
      draft: draft(envelope.integrity.payloadSha256, [
        { assertionId: "c1", order: 1, family: "fact_quote", subjectId: fact.factId, content: fact.value! },
        { assertionId: "c2", order: 2, family: "fact_quote", subjectId: fact.factId, content: fact.value! }
      ])
    })).rejects.toThrow(/语义键/u);

    const withExtra = {
      ...draft(envelope.integrity.payloadSha256, []),
      rawBirthInput: { date: "1995-08-18", time: "08:26" }
    };
    await expect(evaluateBaziInterpretationAiFaithfulness({
      envelope,
      envelopeInput,
      draft: withExtra
    })).rejects.toThrow(/严格白名单/u);
  });

  it("snapshots the draft before awaiting Envelope verification", async () => {
    const { envelope, envelopeInput } = await fixture();
    const fact = firstVisibleFact(envelope);
    const mutableDraft = draft(envelope.integrity.payloadSha256, [
      { assertionId: "d1", order: 1, family: "fact_quote", subjectId: fact.factId, content: fact.value! }
    ]) as { assertions: Array<{ assertionId: string; order: number; family: "fact_quote"; subjectId: string; content: string }> } & BaziInterpretationAiAssertionDraft;
    const inFlight = evaluateBaziInterpretationAiFaithfulness({ envelope, envelopeInput, draft: mutableDraft });
    mutableDraft.assertions[0]!.content = "await 窗口里的并发篡改";

    const result = await inFlight;
    expect(result.assertions[0]).toMatchObject({ verdict: "supported", canonicalContent: fact.value });
    expect(JSON.stringify(result)).not.toContain("await 窗口里的并发篡改");
  });

  it("does not echo unknown subject or assertion identifiers into the result", async () => {
    const { envelope, envelopeInput } = await fixture();
    const result = await evaluateBaziInterpretationAiFaithfulness({
      envelope,
      envelopeInput,
      draft: draft(envelope.integrity.payloadSha256, [
        { assertionId: "08:26", order: 1, family: "canonical_claim_quote", subjectId: "1995-08-18", content: "普通的未知引用" }
      ])
    });

    expect(result.assertions[0]).toMatchObject({
      assertionRef: "assertion:1",
      subjectId: null,
      verdict: "invented",
      displayStatus: "withheld"
    });
    expect(JSON.stringify(result)).not.toContain("1995-08-18");
    expect(JSON.stringify(result)).not.toContain("08:26");
    expect(result.coverage.overallStatus).toBe("withheld");
  });

  it("does not let a confirmed fact quote bypass a blocked upstream rule", async () => {
    const { envelope, envelopeInput } = await fixture();
    const ruleById = new Map(envelope.rules.map((rule) => [rule.ruleId, rule] as const));
    const blockedFact = envelope.facts.find((fact) => (
      fact.status === "confirmed" && fact.ruleIds.some((ruleId) => ruleById.get(ruleId)?.status === "blocked")
    ));
    expect(blockedFact).toBeTruthy();
    const result = await evaluateBaziInterpretationAiFaithfulness({
      envelope,
      envelopeInput,
      draft: draft(envelope.integrity.payloadSha256, [
        { assertionId: "f1", order: 1, family: "fact_quote", subjectId: blockedFact!.factId, content: blockedFact!.value! }
      ])
    });

    expect(result.assertions[0]).toMatchObject({
      subjectId: blockedFact!.factId,
      verdict: "blocked",
      displayStatus: "withheld",
      canonicalContent: null
    });
    expect(result.assertions[0]!.missingEvidence.some((item) => item.startsWith("blocked_rule:"))).toBe(true);
    expect(result.coverage.overallStatus).toBe("withheld");
  });
});
