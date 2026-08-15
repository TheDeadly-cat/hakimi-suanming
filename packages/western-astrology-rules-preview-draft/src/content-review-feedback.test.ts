import { describe, expect, it } from "vitest";
import {
  WESTERN_CONTENT_REVIEW_FEEDBACK_MAX_BYTES,
  WESTERN_CONTENT_REVIEW_FEEDBACK_PROFILE,
  createWesternContentReviewFeedbackTemplate,
  preflightWesternContentReviewFeedback,
  serializeWesternContentReviewFeedbackTemplate
} from "./browser-app/content-review-feedback.ts";

type EditableFeedback = Record<string, any>;

async function editableTemplate(): Promise<EditableFeedback> {
  return JSON.parse(serializeWesternContentReviewFeedbackTemplate(
    await createWesternContentReviewFeedbackTemplate()
  )) as EditableFeedback;
}

function attributeReviewer(feedback: EditableFeedback): void {
  feedback.reviewer.reviewerId = "reviewer-western-001";
  feedback.reviewer.displayName = "示例审稿人";
  feedback.reviewer.affiliation = "独立研究者";
  feedback.reviewer.expertiseStatement = "持续研究传统与现代西洋占星解释方法";
  feedback.reviewer.identityEvidenceReference = "self-declared://reviewer-western-001";
  feedback.reviewSession.reviewedAt = "2026-08-12T18:30:00+08:00";
  feedback.reviewSession.methodology = "逐项核对语义、适用条件、反例与来源边界";
  feedback.reviewSession.traditionScope = "传统占星与现代心理占星并列比较";
  feedback.reviewSession.generalNotes = "此反馈不代表身份验证、科学验证或正式启用。";
}

function resolveItem(
  feedback: EditableFeedback,
  index: number,
  decision: "approve" | "revise" | "reject" = "approve"
): void {
  const item = feedback.items[index];
  item.decision = decision;
  item.orientationProposal = "mixed_conditional";
  item.selectedTradition = "传统占星与现代心理占星并列";
  item.decisionReason = "基础表达可作为待组合候选，但不能脱离落位与全盘条件。";
  item.applicabilityConditions = "出生资料可靠，且结合天体、宫位、相位、尊贵与现实语境。";
  item.counterexamples = "当守护链、近轴关系或紧密相位明显改写主题时，不应机械套用。";
  item.revisionRequest = decision === "revise" ? "补充传统与现代分歧，并缩窄用语。" : "";
}

function setDeclaredCounts(feedback: EditableFeedback): void {
  const decisions = { unresolved: 0, approve: 0, revise: 0, reject: 0 };
  const orientations = {
    unresolved: 0,
    potentiallySupportive: 0,
    potentiallyChallenging: 0,
    mixedConditional: 0,
    notAssessable: 0
  };
  for (const item of feedback.items) {
    decisions[item.decision as keyof typeof decisions] += 1;
    switch (item.orientationProposal) {
      case "unresolved": orientations.unresolved += 1; break;
      case "potentially_supportive": orientations.potentiallySupportive += 1; break;
      case "potentially_challenging": orientations.potentiallyChallenging += 1; break;
      case "mixed_conditional": orientations.mixedConditional += 1; break;
      case "not_assessable": orientations.notAssessable += 1; break;
    }
  }
  feedback.declaredCounts = { total: 43, ...decisions };
  feedback.declaredOrientationProposalCounts = { total: 43, ...orientations };
}

async function expectRejected(feedback: EditableFeedback): Promise<void> {
  await expect(preflightWesternContentReviewFeedback(
    `${JSON.stringify(feedback)}\n`
  )).rejects.toThrow();
}

describe("western 43-item primitive content review feedback", () => {
  it("builds a deterministic 43-item, 31-source, triple-hash fail-closed template", async () => {
    const first = await createWesternContentReviewFeedbackTemplate();
    const second = await createWesternContentReviewFeedbackTemplate();
    expect(first).toEqual(second);
    expect(first.profile).toBe(WESTERN_CONTENT_REVIEW_FEEDBACK_PROFILE);
    expect(first.profile.catalogScope).toBe("fixed_43_primitive_content_only");
    expect(first.profile.dynamicCompositionCoverage)
      .toBe("not_included_requires_separate_review");
    expect(first.items).toHaveLength(43);
    expect(first.sourceRegistry).toHaveLength(31);
    expect(first.sourceRegistry.filter((source) => source.role === "scientific_boundary"))
      .toHaveLength(1);
    expect(first.sourceRegistry.find((source) => source.role === "scientific_boundary")?.usageBoundary)
      .toContain("不支持任何占星解释候选");
    expect(first.catalogBinding).toMatchObject({ itemCount: 43, sourceCount: 31 });
    expect(first.catalogBinding.catalogSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(first.catalogBinding.orderedContentIdsSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(first.catalogBinding.sourceRegistrySha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(new Set([
      first.catalogBinding.catalogSha256,
      first.catalogBinding.orderedContentIdsSha256,
      first.catalogBinding.sourceRegistrySha256
    ])).toHaveLength(3);
    expect(first.items.map((item) => item.order)).toEqual(
      Array.from({ length: 43 }, (_, index) => index + 1)
    );
    expect(Object.fromEntries(["planet", "sign", "house", "aspect", "angle"].map((category) => [
      category,
      first.items.filter((item) => item.category === category).length
    ]))).toEqual({ planet: 10, sign: 12, house: 12, aspect: 5, angle: 4 });
    expect(new Set(first.items.map((item) => item.contentId))).toHaveLength(43);
    expect(first.items.every((item) => (
      item.decision === "unresolved"
      && item.orientationProposal === "unresolved"
      && item.expertTruthClaimed === false
      && item.scientificValidityClaimed === false
      && item.formalActivationAllowed === false
      && item.goodBadOrientation === null
      && item.eventOutcome === null
      && item.result === null
    ))).toBe(true);
    expect(first.declaredCounts).toEqual({
      total: 43, unresolved: 43, approve: 0, revise: 0, reject: 0
    });
    expect(first.declaredOrientationProposalCounts).toEqual({
      total: 43,
      unresolved: 43,
      potentiallySupportive: 0,
      potentiallyChallenging: 0,
      mixedConditional: 0,
      notAssessable: 0
    });
    expect(first.boundary).toEqual({
      identityVerified: false,
      digitalSignatureVerified: false,
      scientificValidityEstablished: false,
      eligibleForFormalActivation: false,
      autoIntegrationAllowed: false,
      ruleArtifactOrStorageMutationPerformed: false,
      dynamicCompositionReviewed: false,
      goodBadOrientation: null,
      eventOutcome: null,
      result: null
    });
    expect(serializeWesternContentReviewFeedbackTemplate(first).endsWith("\n")).toBe(true);
  });

  it("accepts attributed conditional feedback while preserving every formal boundary", async () => {
    const feedback = await editableTemplate();
    attributeReviewer(feedback);
    resolveItem(feedback, 0, "approve");
    feedback.items[0].additionalSourceUrls = ["https://example.org/review-note"];
    setDeclaredCounts(feedback);

    const result = await preflightWesternContentReviewFeedback(`${JSON.stringify(feedback)}\n`);
    expect(result.counts).toEqual({
      total: 43, unresolved: 42, approve: 1, revise: 0, reject: 0
    });
    expect(result.orientationProposalCounts).toEqual({
      total: 43,
      unresolved: 42,
      potentiallySupportive: 0,
      potentiallyChallenging: 0,
      mixedConditional: 1,
      notAssessable: 0
    });
    expect(result.resolvedCount).toBe(1);
    expect(result.unresolvedCount).toBe(42);
    expect(result.allItemsResolved).toBe(false);
    expect(result.reviewerAttributionComplete).toBe(true);
    expect(result.identityVerified).toBe(false);
    expect(result.digitalSignatureVerified).toBe(false);
    expect(result.scientificValidityEstablished).toBe(false);
    expect(result.eligibleForFormalActivation).toBe(false);
    expect(result.autoIntegrationAllowed).toBe(false);
    expect(result.ruleArtifactOrStorageMutationPerformed).toBe(false);
    expect(result.dynamicCompositionReviewed).toBe(false);
    expect(result.goodBadOrientation).toBeNull();
    expect(result.eventOutcome).toBeNull();
    expect(result.result).toBeNull();
  });

  it("keeps all-approved primitive feedback outside dynamic composition and formal activation", async () => {
    const feedback = await editableTemplate();
    attributeReviewer(feedback);
    for (let index = 0; index < feedback.items.length; index += 1) {
      resolveItem(feedback, index, "approve");
    }
    setDeclaredCounts(feedback);

    const result = await preflightWesternContentReviewFeedback(`${JSON.stringify(feedback)}\n`);
    expect(result.allItemsResolved).toBe(true);
    expect(result.counts.approve).toBe(43);
    expect(result.dynamicCompositionReviewed).toBe(false);
    expect(result.eligibleForFormalActivation).toBe(false);
    expect(result.goodBadOrientation).toBeNull();
    expect(result.result).toBeNull();
  });

  it("fails closed for binding, source, coverage, snapshot, attribution, review, counts, or boundary tampering", async () => {
    const profileTamper = await editableTemplate();
    profileTamper.profile.catalogScope = "dynamic_chart_content";
    await expectRejected(profileTamper);

    const bindingTamper = await editableTemplate();
    bindingTamper.catalogBinding.catalogSha256 = "0".repeat(64);
    await expectRejected(bindingTamper);

    const sourceTamper = await editableTemplate();
    sourceTamper.sourceRegistry[0].title += " changed";
    await expectRejected(sourceTamper);

    const coverageTamper = await editableTemplate();
    coverageTamper.items.pop();
    coverageTamper.declaredCounts.unresolved = 42;
    coverageTamper.declaredCounts.total = 42;
    await expectRejected(coverageTamper);

    const snapshotTamper = await editableTemplate();
    snapshotTamper.items[0].candidateSummary += " changed";
    await expectRejected(snapshotTamper);

    const orderTamper = await editableTemplate();
    [orderTamper.items[0], orderTamper.items[1]] = [orderTamper.items[1], orderTamper.items[0]];
    await expectRejected(orderTamper);

    const unresolvedTamper = await editableTemplate();
    unresolvedTamper.items[0].orientationProposal = "mixed_conditional";
    unresolvedTamper.declaredOrientationProposalCounts.unresolved = 42;
    unresolvedTamper.declaredOrientationProposalCounts.mixedConditional = 1;
    await expectRejected(unresolvedTamper);

    const attributionTamper = await editableTemplate();
    resolveItem(attributionTamper, 0);
    setDeclaredCounts(attributionTamper);
    await expectRejected(attributionTamper);

    const conditionTamper = await editableTemplate();
    attributeReviewer(conditionTamper);
    resolveItem(conditionTamper, 0);
    conditionTamper.items[0].counterexamples = "";
    setDeclaredCounts(conditionTamper);
    await expectRejected(conditionTamper);

    const reviseTamper = await editableTemplate();
    attributeReviewer(reviseTamper);
    resolveItem(reviseTamper, 0, "revise");
    reviseTamper.items[0].revisionRequest = "";
    setDeclaredCounts(reviseTamper);
    await expectRejected(reviseTamper);

    const urlTamper = await editableTemplate();
    attributeReviewer(urlTamper);
    resolveItem(urlTamper, 0);
    urlTamper.items[0].additionalSourceUrls = ["http://example.org/not-https"];
    setDeclaredCounts(urlTamper);
    await expectRejected(urlTamper);

    const countsTamper = await editableTemplate();
    countsTamper.declaredCounts.unresolved = 42;
    countsTamper.declaredCounts.approve = 1;
    await expectRejected(countsTamper);

    const orientationCountsTamper = await editableTemplate();
    orientationCountsTamper.declaredOrientationProposalCounts.unresolved = 42;
    orientationCountsTamper.declaredOrientationProposalCounts.notAssessable = 1;
    await expectRejected(orientationCountsTamper);

    const scientificBoundaryTamper = await editableTemplate();
    scientificBoundaryTamper.boundary.scientificValidityEstablished = true;
    await expectRejected(scientificBoundaryTamper);

    const dynamicBoundaryTamper = await editableTemplate();
    dynamicBoundaryTamper.boundary.dynamicCompositionReviewed = true;
    await expectRejected(dynamicBoundaryTamper);

    const resultTamper = await editableTemplate();
    resultTamper.items[0].goodBadOrientation = "吉";
    await expectRejected(resultTamper);

    const extraKeyTamper = await editableTemplate();
    extraKeyTamper.unexpected = true;
    await expectRejected(extraKeyTamper);
  });

  it("rejects empty and oversized payloads before JSON preflight", async () => {
    await expect(preflightWesternContentReviewFeedback("")).rejects.toThrow(/1 字节至 2 MiB/u);
    await expect(preflightWesternContentReviewFeedback(
      "x".repeat(WESTERN_CONTENT_REVIEW_FEEDBACK_MAX_BYTES + 1)
    )).rejects.toThrow(/1 字节至 2 MiB/u);
  });
});
