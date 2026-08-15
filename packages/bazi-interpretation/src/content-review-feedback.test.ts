import { describe, expect, it } from "vitest";
import { BAZI_CONTENT_REVIEW_QUEUE } from "./content-review-queue";
import {
  BAZI_CONTENT_REVIEW_FEEDBACK_FILENAME,
  BAZI_CONTENT_REVIEW_FEEDBACK_PROFILE,
  createBaziContentReviewFeedbackTemplate,
  preflightBaziContentReviewFeedback,
  serializeBaziContentReviewFeedbackTemplate
} from "./content-review-feedback";

type EditableFeedback = {
  profile: Record<string, unknown>;
  queueBinding: Record<string, unknown>;
  reviewer: {
    reviewerId: string;
    displayName: string;
    affiliation: string;
    expertiseStatement: string;
    identityEvidenceReference: string;
    identityVerified: boolean;
  };
  reviewSession: { reviewedAt: string; methodology: string; generalNotes: string };
  items: Array<{
    reviewItemId: string;
    order: number;
    category: string;
    title: string;
    question: string;
    candidateSummary: string;
    sourceRefIds: string[];
    decision: "unresolved" | "approve" | "revise" | "reject";
    decisionReason: string;
    revisionRequest: string;
    additionalSourceUrls: string[];
    expertTruthClaimed: boolean;
    formalActivationAllowed: boolean;
    result: unknown;
  }>;
  declaredCounts: { total: number; unresolved: number; approve: number; revise: number; reject: number };
  boundary: {
    identityVerified: boolean;
    digitalSignatureVerified: boolean;
    eligibleForFormalActivation: boolean;
    autoIntegrationAllowed: boolean;
    chartOrStorageMutationPerformed: boolean;
    result: unknown;
  };
};

async function editableTemplate(): Promise<EditableFeedback> {
  return JSON.parse(serializeBaziContentReviewFeedbackTemplate(
    await createBaziContentReviewFeedbackTemplate()
  )) as EditableFeedback;
}

function attributeReviewer(feedback: EditableFeedback): void {
  feedback.reviewer.reviewerId = "reviewer-demo-001";
  feedback.reviewer.displayName = "示例审稿人";
  feedback.reviewer.affiliation = "独立研究者";
  feedback.reviewer.expertiseStatement = "已说明采用的子平法学习背景，仅代表本次具名意见。";
  feedback.reviewSession.reviewedAt = "2026-08-12T12:34:56+08:00";
  feedback.reviewSession.methodology = "逐条核对候选、问题、已登记来源与反例。";
}

describe("Bazi content review feedback", () => {
  it("creates a deterministic self-contained template bound to the exact 69-item queue", async () => {
    const first = await createBaziContentReviewFeedbackTemplate();
    const second = await createBaziContentReviewFeedbackTemplate();
    const serialized = serializeBaziContentReviewFeedbackTemplate(first);

    expect(first).toEqual(second);
    expect(first.profile).toBe(BAZI_CONTENT_REVIEW_FEEDBACK_PROFILE);
    expect(first.queueBinding).toMatchObject({
      queueProjectionVersion: "hakimi.bazi.content_review_queue/0.1.0",
      queueCatalogVersion: "0.17.0",
      itemCount: 69
    });
    expect(first.queueBinding.queueSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(first.queueBinding.orderedItemIdsSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(first.items).toHaveLength(69);
    expect(first.items.map((item) => item.reviewItemId))
      .toEqual(BAZI_CONTENT_REVIEW_QUEUE.items.map((item) => item.reviewItemId));
    expect(first.items.every((item) => (
      item.decision === "unresolved"
      && item.decisionReason === ""
      && item.revisionRequest === ""
      && item.additionalSourceUrls.length === 0
      && !item.expertTruthClaimed
      && !item.formalActivationAllowed
      && item.result === null
    ))).toBe(true);
    expect(first.declaredCounts).toEqual({ total: 69, unresolved: 69, approve: 0, revise: 0, reject: 0 });
    expect(serialized.endsWith("\n")).toBe(true);
    expect(serialized).not.toContain("generatedAt");
    expect(BAZI_CONTENT_REVIEW_FEEDBACK_FILENAME).toBe("hakimi-bazi-content-review-feedback-v017.json");

    const untouched = await preflightBaziContentReviewFeedback(serialized);
    expect(untouched).toMatchObject({
      resolvedCount: 0,
      unresolvedCount: 69,
      allItemsResolved: false,
      reviewerAttributionComplete: false,
      identityVerified: false,
      digitalSignatureVerified: false,
      eligibleForFormalActivation: false,
      autoIntegrationAllowed: false,
      chartOrStorageMutationPerformed: false,
      result: null
    });
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.items)).toBe(true);
  });

  it("accepts attributed partial feedback but never treats it as verified or activatable", async () => {
    const feedback = await editableTemplate();
    attributeReviewer(feedback);
    feedback.items[0]!.decision = "approve";
    feedback.items[0]!.decisionReason = "候选清楚地区分了工程权重与命理真值，建议保留为待进一步反例核对的表述。";
    feedback.items[0]!.additionalSourceUrls = ["https://example.org/review-note"];
    feedback.items[1]!.decision = "revise";
    feedback.items[1]!.decisionReason = "相对权重仍缺少适用范围说明。";
    feedback.items[1]!.revisionRequest = "补充得令、得地、得势分别成立时的反例与流派口径。";
    feedback.declaredCounts = { total: 69, unresolved: 67, approve: 1, revise: 1, reject: 0 };

    const result = await preflightBaziContentReviewFeedback(JSON.stringify(feedback));

    expect(result.counts).toEqual(feedback.declaredCounts);
    expect(result).toMatchObject({
      resolvedCount: 2,
      unresolvedCount: 67,
      allItemsResolved: false,
      reviewerAttributionComplete: true,
      identityVerified: false,
      eligibleForFormalActivation: false,
      autoIntegrationAllowed: false,
      chartOrStorageMutationPerformed: false,
      result: null
    });
    expect(result.envelope.reviewer.identityVerified).toBe(false);
  });

  it("keeps integration closed even when all 69 self-declared decisions are present", async () => {
    const feedback = await editableTemplate();
    attributeReviewer(feedback);
    for (const item of feedback.items) {
      item.decision = "approve";
      item.decisionReason = `具名审稿意见：保留 ${item.reviewItemId} 候选，仍待现实身份与正式来源核验。`;
    }
    feedback.declaredCounts = { total: 69, unresolved: 0, approve: 69, revise: 0, reject: 0 };

    const result = await preflightBaziContentReviewFeedback(JSON.stringify(feedback));

    expect(result.allItemsResolved).toBe(true);
    expect(result.resolvedCount).toBe(69);
    expect(result.identityVerified).toBe(false);
    expect(result.digitalSignatureVerified).toBe(false);
    expect(result.eligibleForFormalActivation).toBe(false);
    expect(result.autoIntegrationAllowed).toBe(false);
    expect(result.result).toBeNull();
  });

  it("fails closed for queue, coverage, snapshot, counts, attribution, decision, source, or boundary tampering", async () => {
    const digestTamper = await editableTemplate();
    digestTamper.queueBinding.queueSha256 = "0".repeat(64);
    await expect(preflightBaziContentReviewFeedback(JSON.stringify(digestTamper)))
      .rejects.toThrow(/没有绑定当前 69 项/);

    const coverageTamper = await editableTemplate();
    coverageTamper.items.pop();
    coverageTamper.declaredCounts = { total: 69, unresolved: 68, approve: 0, revise: 0, reject: 0 };
    await expect(preflightBaziContentReviewFeedback(JSON.stringify(coverageTamper)))
      .rejects.toThrow(/必须恰好覆盖 69 项/);

    const snapshotTamper = await editableTemplate();
    snapshotTamper.items[0]!.candidateSummary = "被改写的候选";
    await expect(preflightBaziContentReviewFeedback(JSON.stringify(snapshotTamper)))
      .rejects.toThrow(/候选快照不一致/);

    const countTamper = await editableTemplate();
    countTamper.declaredCounts.approve = 1;
    countTamper.declaredCounts.unresolved = 68;
    await expect(preflightBaziContentReviewFeedback(JSON.stringify(countTamper)))
      .rejects.toThrow(/declaredCounts/);

    const unattributed = await editableTemplate();
    unattributed.items[0]!.decision = "approve";
    unattributed.items[0]!.decisionReason = "同意";
    unattributed.declaredCounts = { total: 69, unresolved: 68, approve: 1, revise: 0, reject: 0 };
    await expect(preflightBaziContentReviewFeedback(JSON.stringify(unattributed)))
      .rejects.toThrow(/必须提供 reviewerId/);

    const reviseWithoutRequest = await editableTemplate();
    attributeReviewer(reviseWithoutRequest);
    reviseWithoutRequest.items[0]!.decision = "revise";
    reviseWithoutRequest.items[0]!.decisionReason = "需要调整";
    reviseWithoutRequest.declaredCounts = { total: 69, unresolved: 68, approve: 0, revise: 1, reject: 0 };
    await expect(preflightBaziContentReviewFeedback(JSON.stringify(reviseWithoutRequest)))
      .rejects.toThrow(/退修项必须填写修改要求/);

    const insecureSource = await editableTemplate();
    insecureSource.items[0]!.additionalSourceUrls = ["http://example.org/insecure"];
    await expect(preflightBaziContentReviewFeedback(JSON.stringify(insecureSource)))
      .rejects.toThrow(/必须使用 HTTPS/);

    const identityTamper = await editableTemplate();
    identityTamper.reviewer.identityVerified = true;
    await expect(preflightBaziContentReviewFeedback(JSON.stringify(identityTamper)))
      .rejects.toThrow(/identityVerified 必须保持 false/);

    const resultTamper = await editableTemplate();
    resultTamper.boundary.result = "formal";
    await expect(preflightBaziContentReviewFeedback(JSON.stringify(resultTamper)))
      .rejects.toThrow(/result 必须保持 null/);

    await expect(preflightBaziContentReviewFeedback("{not-json"))
      .rejects.toThrow(/不是有效 JSON/);
  });
});
