import type { RevisionRecord } from "@hakimi/contracts";
import { verifyRevisionSnapshotIntegrity } from "@hakimi/chart-integrity";
import {
  BAZI_INTERPRETATION_AI_ASSERTION_DRAFT_V2_VERSION,
  BAZI_INTERPRETATION_AI_ASSERTION_DRAFT_VERSION,
  buildBaziBirthTimePerturbationStabilityReport,
  buildBaziInterpretationEvidenceEnvelopeV2,
  buildStrengthSensitivityReview,
  evaluateBaziInterpretationAiFaithfulnessV2,
  interpretBaziChart,
  validateBaziInterpretationAiFaithfulnessV2Result,
  type BaziInterpretationAiAssertionDraftV2,
  type BaziInterpretationAiFaithfulnessV2Result,
  type BaziInterpretationEvidenceEnvelopeV2,
  type BuildBaziInterpretationEvidenceEnvelopeV2Input
} from "@hakimi/bazi-interpretation";

export const LOCAL_AI_VERIFICATION_CONTEXT_VERSION =
  "hakimi.bazi.local_ai_verification_context/0.1.0" as const;

export const LOCAL_AI_DRAFT_MAX_CHARACTERS = 64 * 1024;

const unsafeLocalDraftControlPattern =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;

export type LocalAiDraftValidationContext = Readonly<{
  bindingKey: string;
  revisionId: string;
  revisionNumber: number;
  revisionResultHash: string;
  envelope: BaziInterpretationEvidenceEnvelopeV2;
  envelopeInput: BuildBaziInterpretationEvidenceEnvelopeV2Input;
  contextPacketText: string;
  draftTemplateText: string;
}>;

function createDraftTemplate(
  envelope: BaziInterpretationEvidenceEnvelopeV2
): BaziInterpretationAiAssertionDraftV2 {
  return {
    profileVersion: BAZI_INTERPRETATION_AI_ASSERTION_DRAFT_V2_VERSION,
    envelopeV2PayloadSha256: envelope.integrity.payloadSha256,
    legacyDraft: {
      profileVersion: BAZI_INTERPRETATION_AI_ASSERTION_DRAFT_VERSION,
      envelopePayloadSha256: envelope.legacyEnvelope.integrity.payloadSha256,
      assertions: []
    },
    timeAssertions: []
  };
}

function createContextPacket(
  envelope: BaziInterpretationEvidenceEnvelopeV2,
  draftTemplate: BaziInterpretationAiAssertionDraftV2
) {
  return {
    contextVersion: LOCAL_AI_VERIFICATION_CONTEXT_VERSION,
    purpose: "local_structured_assertion_draft_only",
    binding: {
      system: "bazi",
      revisionId: envelope.binding.revisionId,
      revisionNumber: envelope.binding.revisionNumber,
      revisionResultHash: envelope.binding.revisionResultHash,
      envelopeV2PayloadSha256: envelope.integrity.payloadSha256
    },
    instructions: {
      calculateOrRewriteChartFacts: false,
      outputOnlyTheDraftObject: true,
      preserveProfileVersionsAndEnvelopeDigests: true,
      legacyFamilies: [
        "fact_quote",
        "canonical_claim_quote",
        "rule_quote",
        "freeform_interpretation",
        "overall_good_bad",
        "useful_god",
        "event_outcome",
        "expert_truth",
        "scientific_validity"
      ],
      timeFamilies: [
        "time_summary_quote",
        "combined_interpretation_status_quote"
      ],
      note: "只有逐字绑定当前 Envelope 的封闭断言可能显示；自由解释、结果性断言、未知引用和改写内容都会在本机被隐藏。"
    },
    privacy: {
      containsDerivedSensitiveChartData: true,
      rawBirthInputCopied: false,
      networkTransmissionPerformedByApplication: false,
      userControlledExternalTransferOutsideApplication: "not_assessed"
    },
    envelope,
    outputTemplate: draftTemplate
  } as const;
}

export async function prepareLocalAiDraftValidationContext(
  rawRevision: RevisionRecord
): Promise<LocalAiDraftValidationContext> {
  const { revision } = await verifyRevisionSnapshotIntegrity(rawRevision);
  const includeHour = revision.input.timePrecision === "exact_minute"
    || revision.input.timePrecision === "exact_second";
  const interpretation = interpretBaziChart(revision.facts, { includeHour });
  const strengthSensitivity = buildStrengthSensitivityReview(interpretation);
  const birthTimePerturbationReport =
    await buildBaziBirthTimePerturbationStabilityReport(revision);
  const envelopeInput: BuildBaziInterpretationEvidenceEnvelopeV2Input = {
    revision,
    legacyEnvelopeInput: {
      revision,
      includeHour,
      interpretation,
      strengthSensitivity
    },
    birthTimePerturbationReport
  };
  const envelope = await buildBaziInterpretationEvidenceEnvelopeV2(envelopeInput);
  const draftTemplate = createDraftTemplate(envelope);
  const contextPacket = createContextPacket(envelope, draftTemplate);
  const bindingKey = [
    revision.id,
    revision.revisionNumber,
    revision.manifest.resultHash,
    envelope.integrity.payloadSha256
  ].join(":");

  return Object.freeze({
    bindingKey,
    revisionId: revision.id,
    revisionNumber: revision.revisionNumber,
    revisionResultHash: revision.manifest.resultHash,
    envelope,
    envelopeInput,
    contextPacketText: JSON.stringify(contextPacket, null, 2),
    draftTemplateText: JSON.stringify(draftTemplate, null, 2)
  });
}

function parseDraftText(rawText: string): unknown {
  if (typeof rawText !== "string" || rawText.trim().length === 0) {
    throw new Error("请粘贴结构化 AI 断言草稿 JSON。");
  }
  if (rawText.length > LOCAL_AI_DRAFT_MAX_CHARACTERS) {
    throw new Error(`AI 断言草稿不能超过 ${LOCAL_AI_DRAFT_MAX_CHARACTERS} 个字符。`);
  }
  if (unsafeLocalDraftControlPattern.test(rawText)) {
    throw new Error("AI 断言草稿包含隐藏控制字符或双向文本控制符。");
  }
  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    throw new Error("AI 断言草稿不是合法 JSON。");
  }
}

export async function validateLocalAiDraftText(
  context: LocalAiDraftValidationContext,
  rawText: string
): Promise<BaziInterpretationAiFaithfulnessV2Result> {
  const draft = parseDraftText(rawText);
  const input = {
    envelope: context.envelope,
    envelopeInput: context.envelopeInput,
    draft
  };
  const result = await evaluateBaziInterpretationAiFaithfulnessV2(input);
  return validateBaziInterpretationAiFaithfulnessV2Result(result, input);
}
