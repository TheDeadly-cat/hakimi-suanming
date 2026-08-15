import { describe, expect, it } from "vitest";
import { ZIWEI_NATAL_TRANSFORMATION_PALACE_CANDIDATE_CONTENT } from "./browser-preview/natal-transformation-palace-content.ts";
import {
  ZIWEI_NATAL_TRANSFORMATION_PALACE_REVIEW_FEEDBACK_FILENAME,
  ZIWEI_NATAL_TRANSFORMATION_PALACE_REVIEW_FEEDBACK_MAX_BYTES,
  ZIWEI_NATAL_TRANSFORMATION_PALACE_REVIEW_FEEDBACK_PROFILE,
  createZiweiNatalTransformationPalaceReviewFeedbackTemplate,
  preflightZiweiNatalTransformationPalaceReviewFeedback,
  serializeZiweiNatalTransformationPalaceReviewFeedbackTemplate
} from "./browser-preview/natal-transformation-palace-review-feedback.ts";

type EditableFeedbackItem = {
  contentId: string;
  order: number;
  transformationLabel: string;
  palaceRoleId: string;
  palaceRoleLabel: string;
  genericCandidateContentId: string;
  palaceRoleContentId: string;
  positionSummary: string;
  counterweight: string;
  reviewPrompt: string;
  sourceRefs: Array<{ sourceId: string; locator: string }>;
  decision: "unresolved" | "approve" | "revise" | "reject";
  orientationProposal:
    | "unresolved"
    | "potentially_supportive"
    | "potentially_challenging"
    | "mixed_conditional"
    | "not_assessable";
  selectedSchool: string;
  decisionReason: string;
  applicabilityConditions: string;
  counterexamples: string;
  revisionRequest: string;
  additionalSourceUrls: string[];
  expertTruthClaimed: boolean;
  formalActivationAllowed: boolean;
  goodBadOrientation: unknown;
  eventOutcome: unknown;
  result: unknown;
};

type EditableFeedback = {
  profile: Record<string, unknown>;
  matrixBinding: {
    contentVersion: string;
    matrixSha256: string;
    orderedContentIdsSha256: string;
    sourceRegistrySha256: string;
    itemCount: number;
    sourceCount: number;
  };
  sourceRegistry: Array<Record<string, unknown>>;
  reviewer: {
    reviewerId: string;
    displayName: string;
    affiliation: string;
    expertiseStatement: string;
    identityEvidenceReference: string;
    identityVerified: boolean;
  };
  reviewSession: {
    reviewedAt: string;
    methodology: string;
    schoolScope: string;
    generalNotes: string;
  };
  items: EditableFeedbackItem[];
  declaredCounts: {
    total: number;
    unresolved: number;
    approve: number;
    revise: number;
    reject: number;
  };
  declaredOrientationProposalCounts: {
    total: number;
    unresolved: number;
    potentiallySupportive: number;
    potentiallyChallenging: number;
    mixedConditional: number;
    notAssessable: number;
  };
  boundary: {
    identityVerified: boolean;
    digitalSignatureVerified: boolean;
    eligibleForFormalActivation: boolean;
    autoIntegrationAllowed: boolean;
    artifactRevisionOrStorageMutationPerformed: boolean;
    goodBadOrientation: unknown;
    eventOutcome: unknown;
    result: unknown;
  };
};

async function editableTemplate(): Promise<EditableFeedback> {
  return JSON.parse(serializeZiweiNatalTransformationPalaceReviewFeedbackTemplate(
    await createZiweiNatalTransformationPalaceReviewFeedbackTemplate()
  )) as EditableFeedback;
}

function attributeReviewer(feedback: EditableFeedback): void {
  feedback.reviewer.reviewerId = "reviewer-demo-ziwei-001";
  feedback.reviewer.displayName = "示例紫微审稿人";
  feedback.reviewer.affiliation = "独立研究者";
  feedback.reviewer.expertiseStatement = "已自述紫微斗数研习背景；该说明不构成身份核验。";
  feedback.reviewSession.reviewedAt = "2026-08-12T14:30:00+08:00";
  feedback.reviewSession.methodology = "逐条核对候选文本、适用条件、反例与既有来源定位。";
  feedback.reviewSession.schoolScope = "示例流派口径，仅供审稿预检，不代表项目正式采用。";
}

function fillResolvedItem(
  item: EditableFeedbackItem,
  decision: "approve" | "revise" | "reject",
  orientationProposal: Exclude<EditableFeedbackItem["orientationProposal"], "unresolved">
): void {
  item.decision = decision;
  item.orientationProposal = orientationProposal;
  item.selectedSchool = "示例流派";
  item.decisionReason = `具名审稿意见：${item.contentId} 可进入后续人工复核。`;
  item.applicabilityConditions = "仅在核对星曜本体、庙旺落陷、同宫会照和运限层级后讨论。";
  item.counterexamples = "若煞曜、吉曜、空劫或宫位主轴形成相反结构，方向可能改变。";
  item.revisionRequest = decision === "revise" ? "补充不同流派的分歧口径和反例。" : "";
}

describe("Ziwei four-transformations x twelve-palaces review feedback", () => {
  it("creates a deterministic 48-item, five-source template bound to the current matrix", async () => {
    const first = await createZiweiNatalTransformationPalaceReviewFeedbackTemplate();
    const second = await createZiweiNatalTransformationPalaceReviewFeedbackTemplate();
    const serialized = serializeZiweiNatalTransformationPalaceReviewFeedbackTemplate(first);

    expect(first).toEqual(second);
    expect(first.profile).toBe(ZIWEI_NATAL_TRANSFORMATION_PALACE_REVIEW_FEEDBACK_PROFILE);
    expect(first.matrixBinding).toMatchObject({
      contentVersion: "ziwei.natal_transformation_all_palaces.neutral_candidate/0.1",
      itemCount: 48,
      sourceCount: 5
    });
    expect(first.matrixBinding.matrixSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(first.matrixBinding.orderedContentIdsSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(first.matrixBinding.sourceRegistrySha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(first.sourceRegistry).toHaveLength(5);
    expect(first.items).toHaveLength(48);
    expect(first.items.map((item) => item.contentId)).toEqual(
      ZIWEI_NATAL_TRANSFORMATION_PALACE_CANDIDATE_CONTENT.map((item) => item.contentId)
    );
    expect(first.items.every((item) => (
      item.decision === "unresolved"
      && item.orientationProposal === "unresolved"
      && item.selectedSchool === ""
      && item.applicabilityConditions === ""
      && item.counterexamples === ""
      && !item.expertTruthClaimed
      && !item.formalActivationAllowed
      && item.goodBadOrientation === null
      && item.eventOutcome === null
      && item.result === null
    ))).toBe(true);
    expect(first.declaredCounts).toEqual({
      total: 48,
      unresolved: 48,
      approve: 0,
      revise: 0,
      reject: 0
    });
    expect(first.declaredOrientationProposalCounts).toEqual({
      total: 48,
      unresolved: 48,
      potentiallySupportive: 0,
      potentiallyChallenging: 0,
      mixedConditional: 0,
      notAssessable: 0
    });
    expect(serialized.endsWith("\n")).toBe(true);
    expect(serialized).not.toContain("generatedAt");
    expect(ZIWEI_NATAL_TRANSFORMATION_PALACE_REVIEW_FEEDBACK_FILENAME)
      .toBe("hakimi-ziwei-four-transformations-twelve-palaces-review-v010.json");

    const untouched = await preflightZiweiNatalTransformationPalaceReviewFeedback(serialized);
    expect(untouched).toMatchObject({
      resolvedCount: 0,
      unresolvedCount: 48,
      allItemsResolved: false,
      reviewerAttributionComplete: false,
      identityVerified: false,
      digitalSignatureVerified: false,
      eligibleForFormalActivation: false,
      autoIntegrationAllowed: false,
      artifactRevisionOrStorageMutationPerformed: false,
      goodBadOrientation: null,
      eventOutcome: null,
      result: null
    });
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.items)).toBe(true);
  });

  it("accepts attributed partial feedback while keeping orientation proposals non-formal", async () => {
    const feedback = await editableTemplate();
    attributeReviewer(feedback);
    fillResolvedItem(feedback.items[0]!, "approve", "potentially_supportive");
    feedback.items[0]!.additionalSourceUrls = ["https://example.org/ziwei-review-note"];
    fillResolvedItem(feedback.items[1]!, "revise", "mixed_conditional");
    feedback.declaredCounts = { total: 48, unresolved: 46, approve: 1, revise: 1, reject: 0 };
    feedback.declaredOrientationProposalCounts = {
      total: 48,
      unresolved: 46,
      potentiallySupportive: 1,
      potentiallyChallenging: 0,
      mixedConditional: 1,
      notAssessable: 0
    };

    const result = await preflightZiweiNatalTransformationPalaceReviewFeedback(
      JSON.stringify(feedback)
    );

    expect(result.counts).toEqual(feedback.declaredCounts);
    expect(result.orientationProposalCounts).toEqual(feedback.declaredOrientationProposalCounts);
    expect(result).toMatchObject({
      resolvedCount: 2,
      unresolvedCount: 46,
      allItemsResolved: false,
      reviewerAttributionComplete: true,
      identityVerified: false,
      eligibleForFormalActivation: false,
      autoIntegrationAllowed: false,
      artifactRevisionOrStorageMutationPerformed: false,
      goodBadOrientation: null,
      eventOutcome: null,
      result: null
    });
    expect(result.envelope.items[0]?.orientationProposal).toBe("potentially_supportive");
    expect(result.envelope.items[0]?.goodBadOrientation).toBeNull();
  });

  it("keeps activation closed even when all 48 self-declared reviews are resolved", async () => {
    const feedback = await editableTemplate();
    attributeReviewer(feedback);
    for (const item of feedback.items) {
      fillResolvedItem(item, "approve", "mixed_conditional");
    }
    feedback.declaredCounts = { total: 48, unresolved: 0, approve: 48, revise: 0, reject: 0 };
    feedback.declaredOrientationProposalCounts = {
      total: 48,
      unresolved: 0,
      potentiallySupportive: 0,
      potentiallyChallenging: 0,
      mixedConditional: 48,
      notAssessable: 0
    };

    const result = await preflightZiweiNatalTransformationPalaceReviewFeedback(
      JSON.stringify(feedback)
    );

    expect(result.allItemsResolved).toBe(true);
    expect(result.resolvedCount).toBe(48);
    expect(result.identityVerified).toBe(false);
    expect(result.digitalSignatureVerified).toBe(false);
    expect(result.eligibleForFormalActivation).toBe(false);
    expect(result.autoIntegrationAllowed).toBe(false);
    expect(result.artifactRevisionOrStorageMutationPerformed).toBe(false);
    expect(result.goodBadOrientation).toBeNull();
    expect(result.result).toBeNull();
  });

  it("fails closed for binding, source, coverage, snapshot, counts, attribution, review, or boundary tampering", async () => {
    const digestTamper = await editableTemplate();
    digestTamper.matrixBinding.matrixSha256 = "0".repeat(64);
    await expect(preflightZiweiNatalTransformationPalaceReviewFeedback(JSON.stringify(digestTamper)))
      .rejects.toThrow(/没有绑定当前 48 条/iu);

    const sourceTamper = await editableTemplate();
    sourceTamper.sourceRegistry[0]!.title = "被改写的来源";
    await expect(preflightZiweiNatalTransformationPalaceReviewFeedback(JSON.stringify(sourceTamper)))
      .rejects.toThrow(/五来源登记/iu);

    const coverageTamper = await editableTemplate();
    coverageTamper.items.pop();
    coverageTamper.declaredCounts = { total: 48, unresolved: 47, approve: 0, revise: 0, reject: 0 };
    coverageTamper.declaredOrientationProposalCounts.unresolved = 47;
    await expect(preflightZiweiNatalTransformationPalaceReviewFeedback(JSON.stringify(coverageTamper)))
      .rejects.toThrow(/必须恰好覆盖 48 条/iu);

    const snapshotTamper = await editableTemplate();
    snapshotTamper.items[0]!.positionSummary = "被改写的候选";
    await expect(preflightZiweiNatalTransformationPalaceReviewFeedback(JSON.stringify(snapshotTamper)))
      .rejects.toThrow(/候选快照不一致/iu);

    const countTamper = await editableTemplate();
    countTamper.declaredCounts.approve = 1;
    countTamper.declaredCounts.unresolved = 47;
    await expect(preflightZiweiNatalTransformationPalaceReviewFeedback(JSON.stringify(countTamper)))
      .rejects.toThrow(/declaredCounts/iu);

    const orientationCountTamper = await editableTemplate();
    orientationCountTamper.declaredOrientationProposalCounts.mixedConditional = 1;
    orientationCountTamper.declaredOrientationProposalCounts.unresolved = 47;
    await expect(preflightZiweiNatalTransformationPalaceReviewFeedback(
      JSON.stringify(orientationCountTamper)
    )).rejects.toThrow(/declaredOrientationProposalCounts/iu);

    const unattributed = await editableTemplate();
    fillResolvedItem(unattributed.items[0]!, "approve", "potentially_supportive");
    unattributed.declaredCounts = { total: 48, unresolved: 47, approve: 1, revise: 0, reject: 0 };
    unattributed.declaredOrientationProposalCounts = {
      total: 48,
      unresolved: 47,
      potentiallySupportive: 1,
      potentiallyChallenging: 0,
      mixedConditional: 0,
      notAssessable: 0
    };
    await expect(preflightZiweiNatalTransformationPalaceReviewFeedback(JSON.stringify(unattributed)))
      .rejects.toThrow(/必须提供 reviewerId/iu);

    const unresolvedWithProposal = await editableTemplate();
    unresolvedWithProposal.items[0]!.orientationProposal = "potentially_supportive";
    await expect(preflightZiweiNatalTransformationPalaceReviewFeedback(
      JSON.stringify(unresolvedWithProposal)
    )).rejects.toThrow(/未裁决项不得填写/iu);

    const resolvedWithoutConditions = await editableTemplate();
    attributeReviewer(resolvedWithoutConditions);
    fillResolvedItem(
      resolvedWithoutConditions.items[0]!,
      "approve",
      "potentially_supportive"
    );
    resolvedWithoutConditions.items[0]!.applicabilityConditions = "";
    resolvedWithoutConditions.declaredCounts = {
      total: 48,
      unresolved: 47,
      approve: 1,
      revise: 0,
      reject: 0
    };
    resolvedWithoutConditions.declaredOrientationProposalCounts = {
      total: 48,
      unresolved: 47,
      potentiallySupportive: 1,
      potentiallyChallenging: 0,
      mixedConditional: 0,
      notAssessable: 0
    };
    await expect(preflightZiweiNatalTransformationPalaceReviewFeedback(
      JSON.stringify(resolvedWithoutConditions)
    )).rejects.toThrow(/成立条件与反例/iu);

    const reviseWithoutRequest = await editableTemplate();
    attributeReviewer(reviseWithoutRequest);
    fillResolvedItem(reviseWithoutRequest.items[0]!, "revise", "mixed_conditional");
    reviseWithoutRequest.items[0]!.revisionRequest = "";
    reviseWithoutRequest.declaredCounts = {
      total: 48,
      unresolved: 47,
      approve: 0,
      revise: 1,
      reject: 0
    };
    reviseWithoutRequest.declaredOrientationProposalCounts = {
      total: 48,
      unresolved: 47,
      potentiallySupportive: 0,
      potentiallyChallenging: 0,
      mixedConditional: 1,
      notAssessable: 0
    };
    await expect(preflightZiweiNatalTransformationPalaceReviewFeedback(
      JSON.stringify(reviseWithoutRequest)
    )).rejects.toThrow(/退修项必须填写修改要求/iu);

    const insecureSource = await editableTemplate();
    insecureSource.items[0]!.additionalSourceUrls = ["http://example.org/insecure"];
    await expect(preflightZiweiNatalTransformationPalaceReviewFeedback(JSON.stringify(insecureSource)))
      .rejects.toThrow(/必须使用 HTTPS/iu);

    const identityTamper = await editableTemplate();
    identityTamper.reviewer.identityVerified = true;
    await expect(preflightZiweiNatalTransformationPalaceReviewFeedback(JSON.stringify(identityTamper)))
      .rejects.toThrow(/identityVerified 必须保持 false/iu);

    const orientationBoundaryTamper = await editableTemplate();
    orientationBoundaryTamper.boundary.goodBadOrientation = "吉";
    await expect(preflightZiweiNatalTransformationPalaceReviewFeedback(
      JSON.stringify(orientationBoundaryTamper)
    )).rejects.toThrow(/goodBadOrientation 必须保持 null/iu);

    await expect(preflightZiweiNatalTransformationPalaceReviewFeedback("{not-json"))
      .rejects.toThrow(/不是有效 JSON/iu);
    await expect(preflightZiweiNatalTransformationPalaceReviewFeedback(
      "x".repeat(ZIWEI_NATAL_TRANSFORMATION_PALACE_REVIEW_FEEDBACK_MAX_BYTES + 1)
    )).rejects.toThrow(/1 字节至 2 MiB/iu);
  });
});
