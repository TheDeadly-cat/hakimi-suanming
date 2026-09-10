// @vitest-environment node

import { readFile } from "node:fs/promises";
import { beforeAll, describe, expect, it } from "vitest";
import {
  calculateIztro258EngineeringFixture,
  createIztro258RuleSnapshotDraft
} from "./index.ts";
import {
  ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
  ZIWEI_DOUSHU_SYSTEM_ID,
  type ZiweiBirthInputDraft
} from "./contract-bridge.ts";
import {
  ZIWEI_BROWSER_SOURCE_DIGEST_ALGORITHM,
  ZIWEI_BROWSER_SOURCE_IDENTITY_VERSION,
  ZIWEI_BROWSER_SOURCE_PATHS,
  calculateZiweiBrowserSourceGraphSha256,
  createZiweiBrowserEngineeringArtifactDraft
} from "./browser-preview/browser-artifact.ts";
import { createZiweiBrowserDisplayProjection } from "./browser-preview/display-projection.ts";
import {
  createZiweiCoreMinorStarSanfangReviewFeedbackTemplate,
  serializeZiweiCoreMinorStarSanfangReviewFeedbackTemplate
} from "./browser-preview/core-minor-star-sanfang-review-feedback.ts";
import {
  ZIWEI_HIGH_RISK_EGRESS_NEUTRAL_FALLBACK,
  isZiweiHighRiskEgressDecision
} from "./browser-preview/high-risk-expression-egress-policy.ts";
import {
  ZIWEI_HIGH_RISK_EGRESS_BROWSER_DISPLAY_SURFACE_ID,
  ZIWEI_HIGH_RISK_EGRESS_EXCLUDED_FEEDBACK_SURFACE_IDS,
  ZIWEI_HIGH_RISK_EGRESS_EXCLUDED_TEXT_ROLES,
  ZIWEI_HIGH_RISK_FEEDBACK_DOM_EXCLUDED_CATEGORIES,
  ZIWEI_HIGH_RISK_FEEDBACK_DOM_SURFACE_IDS,
  ZIWEI_HIGH_RISK_FEEDBACK_DOM_TEXT_ROLE,
  ZIWEI_HIGH_RISK_EGRESS_INCLUDED_SURFACE_IDS,
  ZIWEI_HIGH_RISK_EGRESS_INCLUDED_TEXT_ROLES,
  ZIWEI_HIGH_RISK_EGRESS_REVIEW_GUARDRAIL_SOURCE_FIELDS,
  ZIWEI_HIGH_RISK_EGRESS_SOURCE_SURFACE_IDS,
  createZiweiCoreMinorStarSanfangFeedbackDomDecisionView,
  createZiweiHighRiskFeedbackDomDecisionKey,
  createZiweiHighRiskEgressDecisionKey,
  createZiweiHighRiskEgressDecisionMap,
  createZiweiNatalTransformationPalaceFeedbackDomDecisionView,
  getZiweiCoreMinorStarSanfangFeedbackDomDecisionEntry,
  getZiweiHighRiskEgressDecisionEntry,
  getZiweiNatalTransformationPalaceFeedbackDomDecisionEntry,
  isZiweiCoreMinorStarSanfangFeedbackDomDecisionMap,
  isZiweiHighRiskEgressDecisionMap,
  isZiweiNatalTransformationPalaceFeedbackDomDecisionMap,
  type ZiweiCoreMinorStarSanfangFeedbackDomDecisionView,
  type ZiweiHighRiskEgressDecisionMap,
  type ZiweiNatalTransformationPalaceFeedbackDomDecisionView
} from "./browser-preview/high-risk-expression-egress-view.ts";
import {
  createZiweiNatalTransformationPalaceReviewFeedbackTemplate,
  serializeZiweiNatalTransformationPalaceReviewFeedbackTemplate
} from "./browser-preview/natal-transformation-palace-review-feedback.ts";
import type { BrowserProbeDisplayProjection } from "./browser-preview/browser-protocol.ts";

const INPUT: ZiweiBirthInputDraft = {
  contractVersion: ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
  systemId: ZIWEI_DOUSHU_SYSTEM_ID,
  calendarInput: { calendar: "gregorian", date: "1995-08-18" },
  shichenIndex: 6,
  sexForCalculation: "male",
  solarTimeAdjustment: "none",
  civilContext: {
    usedForCalculation: false,
    localTime: null,
    timeZone: null,
    location: {
      precision: "unknown",
      label: "high-risk-egress-view-test",
      latitude: null,
      longitude: null
    }
  },
  birthSourceRef: "local.high-risk-egress-view.test",
  sourceNote: "Ephemeral high-risk egress decision-map test input."
};

let projection: BrowserProbeDisplayProjection;
let decisionMap: ZiweiHighRiskEgressDecisionMap;
let serializedProjectionBefore: string;
let displayPalacesReference: BrowserProbeDisplayProjection["displayPalaces"];
let coreFeedbackView: ZiweiCoreMinorStarSanfangFeedbackDomDecisionView;
let natalFeedbackView: ZiweiNatalTransformationPalaceFeedbackDomDecisionView;

type MutableFeedbackItem = {
  occurrenceId?: string;
  contentId?: string;
  decision: "unresolved" | "approve" | "revise" | "reject";
  orientationProposal:
    | "unresolved"
    | "potentially_supportive"
    | "potentially_challenging"
    | "mixed_conditional"
    | "not_assessable";
  selectedTradition?: string;
  selectedSchool?: string;
  decisionReason: string;
  applicabilityConditions: string;
  counterexamples: string;
  revisionRequest: string;
  additionalSourceUrls: string[];
};

type MutableFeedbackDraft = {
  reviewer: {
    reviewerId: string;
    displayName: string;
    affiliation: string;
    expertiseStatement: string;
    identityEvidenceReference: string;
    identityVerified: false;
  };
  reviewSession: {
    reviewedAt: string;
    methodology: string;
    traditionScope?: string;
    schoolScope?: string;
    generalNotes: string;
  };
  items: MutableFeedbackItem[];
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
};

function populateAttribution(
  draft: MutableFeedbackDraft,
  scopeField: "traditionScope" | "schoolScope",
  displayName = "边界测试审稿人"
): void {
  draft.reviewer.reviewerId = "reviewer-boundary-test";
  draft.reviewer.displayName = displayName;
  draft.reviewer.expertiseStatement = "仅用于机械边界测试的自述资历";
  draft.reviewSession.reviewedAt = "2026-08-31T00:00:00.000Z";
  draft.reviewSession.methodology = "逐项只读核对";
  draft.reviewSession[scopeField] = "仅限本测试候选范围";
}

function populateResolvedItem(
  draft: MutableFeedbackDraft,
  selectedField: "selectedTradition" | "selectedSchool",
  options: Readonly<{
    decision?: "approve" | "revise";
    decisionReason?: string;
    metadataRiskText?: string;
  }> = {}
): void {
  const item = draft.items[0]!;
  const decision = options.decision ?? "approve";
  item.decision = decision;
  item.orientationProposal = "mixed_conditional";
  item[selectedField] = selectedField === "selectedTradition" ? "测试传统" : "测试学派";
  item.decisionReason = options.decisionReason ?? "逐项核对后保留条件性描述";
  item.applicabilityConditions = "仅在相同结构与前提下讨论";
  item.counterexamples = "不同结构样本可能呈现不同观察";
  item.revisionRequest = decision === "revise" ? "改写为结构事实与条件说明" : "";
  item.additionalSourceUrls = options.metadataRiskText
    ? [`https://example.test/${encodeURIComponent(options.metadataRiskText)}`]
    : [];

  draft.declaredCounts = {
    total: draft.items.length,
    unresolved: draft.items.length - 1,
    approve: decision === "approve" ? 1 : 0,
    revise: decision === "revise" ? 1 : 0,
    reject: 0
  };
  draft.declaredOrientationProposalCounts = {
    total: draft.items.length,
    unresolved: draft.items.length - 1,
    potentiallySupportive: 0,
    potentiallyChallenging: 0,
    mixedConditional: 1,
    notAssessable: 0
  };
}

async function createCoreFeedbackRaw(options: Readonly<{
  decision?: "approve" | "revise";
  decisionReason?: string;
  reviewerDisplayName?: string;
  metadataRiskText?: string;
}> = {}): Promise<string> {
  const template = await createZiweiCoreMinorStarSanfangReviewFeedbackTemplate(projection);
  const draft = JSON.parse(
    serializeZiweiCoreMinorStarSanfangReviewFeedbackTemplate(template)
  ) as unknown as MutableFeedbackDraft;
  populateAttribution(draft, "traditionScope", options.reviewerDisplayName);
  populateResolvedItem(draft, "selectedTradition", options);
  return JSON.stringify(draft);
}

async function createNatalFeedbackRaw(options: Readonly<{
  decision?: "approve" | "revise";
  decisionReason?: string;
  reviewerDisplayName?: string;
  metadataRiskText?: string;
}> = {}): Promise<string> {
  const template = await createZiweiNatalTransformationPalaceReviewFeedbackTemplate();
  const draft = JSON.parse(
    serializeZiweiNatalTransformationPalaceReviewFeedbackTemplate(template)
  ) as unknown as MutableFeedbackDraft;
  populateAttribution(draft, "schoolScope", options.reviewerDisplayName);
  populateResolvedItem(draft, "selectedSchool", options);
  return JSON.stringify(draft);
}

beforeAll(async () => {
  const ruleSnapshot = await createIztro258RuleSnapshotDraft();
  const nodeFixture = await calculateIztro258EngineeringFixture(INPUT, { ruleSnapshot });
  const files = ZIWEI_BROWSER_SOURCE_PATHS.map((path, index) => ({
    path,
    sha256: (index + 1).toString(16).padStart(64, "0")
  }));
  const sourceProjection = {
    identityVersion: ZIWEI_BROWSER_SOURCE_IDENTITY_VERSION,
    digestAlgorithm: ZIWEI_BROWSER_SOURCE_DIGEST_ALGORITHM,
    files
  } as const;
  const browserSourceIdentity = {
    ...sourceProjection,
    browserSourceGraphSha256: await calculateZiweiBrowserSourceGraphSha256(sourceProjection),
    browserWorkerSourceSha256:
      files.find((entry) => entry.path.endsWith("browser-worker.ts"))!.sha256
  };
  const artifact = await createZiweiBrowserEngineeringArtifactDraft({
    input: nodeFixture.input,
    ruleSnapshot: nodeFixture.ruleSnapshot,
    facts: nodeFixture.facts,
    requestId: "41111111-1111-4111-8111-111111111111",
    workerInstanceId: "42222222-2222-4222-8222-222222222222",
    startedAt: "2026-08-31T00:00:00.000Z",
    completedAt: "2026-08-31T00:00:00.010Z",
    browserSourceIdentity
  });
  projection = createZiweiBrowserDisplayProjection(artifact);
  serializedProjectionBefore = JSON.stringify(projection);
  displayPalacesReference = projection.displayPalaces;
  decisionMap = await createZiweiHighRiskEgressDecisionMap(projection);
  coreFeedbackView = await createZiweiCoreMinorStarSanfangFeedbackDomDecisionView(
    await createCoreFeedbackRaw({ decision: "revise" }),
    projection
  );
  natalFeedbackView = await createZiweiNatalTransformationPalaceFeedbackDomDecisionView(
    await createNatalFeedbackRaw()
  );
}, 30_000);

function expectedSourceEntryCount(value: BrowserProbeDisplayProjection): number {
  const majorBase = new Map<string, NonNullable<
    BrowserProbeDisplayProjection["displayPalaces"][number]["stars"][number]["candidateContent"]
  >>();
  const majorPalace = new Map<string, NonNullable<
    BrowserProbeDisplayProjection["displayPalaces"][number]["stars"][number]["palaceCandidateContent"]
  >>();
  for (const palace of value.displayPalaces) {
    for (const star of palace.stars) {
      if (star.candidateContent) majorBase.set(star.candidateContent.contentId, star.candidateContent);
      if (star.palaceCandidateContent) {
        majorPalace.set(star.palaceCandidateContent.contentId, star.palaceCandidateContent);
      }
    }
  }
  const palaceRoles = new Set(
    value.palaceFirstSynthesisReviews.map((review) => review.palaceRoleContent.contentId)
  );
  return value.coreMinorStarCandidateContent.reduce(
    (sum, content) => sum + content.coreThemes.length + 1,
    0
  )
    + value.coreMinorStarPalaceCandidateContent.length
    + value.coreMinorStarSanfangReviews.reduce(
      (sum, review) => sum + 1 + review.occurrences.length,
      0
    )
    + [...majorBase.values()].reduce((sum, content) => sum + content.coreThemes.length + 1, 0)
    + value.majorStarPalaceCombinationReviews.length
    + majorPalace.size
    + palaceRoles.size
    + value.majorStarSameStarSynthesisReviews.length
    + value.natalTransformationCandidateContent.length * 2
    + value.natalTransformationPalaceCandidateContent.length
    + value.palaceNatalTransformationReviews.reduce(
      (sum, review) => sum + 1 + review.occurrences.length,
      0
    )
    + value.palaceFirstSynthesisReviews.length
    + value.palaceFourPartSynthesisContents.reduce(
      (sum, content) => sum + content.parts.length,
      0
    );
}

function expectDeepFrozen(value: unknown, visited = new WeakSet<object>()): void {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) return;
  if (visited.has(value)) return;
  visited.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    expect(descriptor && "value" in descriptor).toBe(true);
    if (descriptor && "value" in descriptor) expectDeepFrozen(descriptor.value, visited);
  }
}

describe("Ziwei role-aware high-risk expression egress decision map", () => {
  it("registers exactly fourteen non-feedback surfaces and excludes review guardrails", () => {
    expect(ZIWEI_HIGH_RISK_EGRESS_SOURCE_SURFACE_IDS).toHaveLength(13);
    expect(ZIWEI_HIGH_RISK_EGRESS_INCLUDED_SURFACE_IDS).toHaveLength(14);
    expect(ZIWEI_HIGH_RISK_EGRESS_INCLUDED_SURFACE_IDS.at(-1))
      .toBe(ZIWEI_HIGH_RISK_EGRESS_BROWSER_DISPLAY_SURFACE_ID);
    expect(ZIWEI_HIGH_RISK_EGRESS_EXCLUDED_FEEDBACK_SURFACE_IDS).toEqual([
      "ziwei.candidate.core-minor-star.sanfang-feedback-preflight",
      "ziwei.candidate.natal-transformation.palace-feedback-preflight"
    ]);
    expect(ZIWEI_HIGH_RISK_EGRESS_INCLUDED_TEXT_ROLES).toEqual([
      "forward_candidate",
      "derived_direct_statement"
    ]);
    expect(ZIWEI_HIGH_RISK_EGRESS_EXCLUDED_TEXT_ROLES).toEqual(["review_guardrail"]);
    expect(ZIWEI_HIGH_RISK_EGRESS_REVIEW_GUARDRAIL_SOURCE_FIELDS).toEqual([
      "reviewPrompt",
      "reviewQuestions",
      "readingOrderStatement",
      "scopeNote",
      "absenceBoundary",
      "emptyMainStarBoundary",
      "counterweight",
      "balancePrompt"
    ]);
    for (const value of [
      ZIWEI_HIGH_RISK_EGRESS_SOURCE_SURFACE_IDS,
      ZIWEI_HIGH_RISK_EGRESS_INCLUDED_SURFACE_IDS,
      ZIWEI_HIGH_RISK_EGRESS_EXCLUDED_FEEDBACK_SURFACE_IDS,
      ZIWEI_HIGH_RISK_EGRESS_INCLUDED_TEXT_ROLES,
      ZIWEI_HIGH_RISK_EGRESS_EXCLUDED_TEXT_ROLES,
      ZIWEI_HIGH_RISK_EGRESS_REVIEW_GUARDRAIL_SOURCE_FIELDS
    ]) expect(Object.isFrozen(value)).toBe(true);
  });

  it("evaluates every enumerated current-projection leaf at source and browser-display stages", () => {
    const expectedCount = expectedSourceEntryCount(projection);
    expect(decisionMap.entries).toHaveLength(expectedCount);
    expect(decisionMap.coverage.sourceEntryCount).toBe(expectedCount);
    expect(decisionMap.coverage.browserDisplayEvaluationCount).toBe(expectedCount);
    expect(Object.keys(decisionMap.decisionByKey)).toHaveLength(expectedCount);
    expect(new Set(decisionMap.entries.map((entry) => entry.decisionKey)).size).toBe(expectedCount);

    const sourceSurfaceIds = new Set(decisionMap.entries.map((entry) => entry.sourceSurfaceId));
    expect(sourceSurfaceIds).toEqual(new Set(ZIWEI_HIGH_RISK_EGRESS_SOURCE_SURFACE_IDS));
    for (const entry of decisionMap.entries) {
      expect(isZiweiHighRiskEgressDecision(entry.sourceDecision)).toBe(true);
      expect(isZiweiHighRiskEgressDecision(entry.browserDisplayDecision)).toBe(true);
      expect(entry.sourceDecision.surfaceId).toBe(entry.sourceSurfaceId);
      expect(entry.browserDisplayDecision.surfaceId)
        .toBe(ZIWEI_HIGH_RISK_EGRESS_BROWSER_DISPLAY_SURFACE_ID);
      expect(entry.browserDisplaySurfaceId)
        .toBe(ZIWEI_HIGH_RISK_EGRESS_BROWSER_DISPLAY_SURFACE_ID);
      expect(entry.sourceField).not.toMatch(
        /reviewPrompt|reviewQuestions|readingOrderStatement|scopeNote|absenceBoundary|emptyMainStarBoundary|counterweight|balancePrompt/u
      );
      expect(["forward_candidate", "derived_direct_statement"]).toContain(entry.textRole);
    }
  });

  it("returns a deeply frozen, privately branded null-prototype map", () => {
    expect(isZiweiHighRiskEgressDecisionMap(decisionMap)).toBe(true);
    expect(Object.getPrototypeOf(decisionMap)).toBeNull();
    expect(Object.getPrototypeOf(decisionMap.decisionByKey)).toBeNull();
    expectDeepFrozen(decisionMap);

    const clone = { ...decisionMap };
    const proxy = new Proxy(decisionMap, {});
    expect(isZiweiHighRiskEgressDecisionMap(clone)).toBe(false);
    expect(isZiweiHighRiskEgressDecisionMap(proxy)).toBe(false);
    expect(() => getZiweiHighRiskEgressDecisionEntry(
      clone,
      projection,
      decisionMap.entries[0]!.decisionKey,
      "untrusted-clone"
    ))
      .toThrow(/Unbranded/u);
    expect(() => getZiweiHighRiskEgressDecisionEntry(
      proxy,
      projection,
      decisionMap.entries[0]!.decisionKey,
      "untrusted-proxy"
    ))
      .toThrow(/Unbranded/u);
  });

  it("provides collision-safe deterministic keys and branded lookup only", () => {
    const safe = projection.natalTransformationCandidateContent[0]!;
    const safeKey = createZiweiHighRiskEgressDecisionKey(
      "ziwei.candidate.natal-transformation.base",
      "forward_candidate",
      safe.contentId,
      "motionLabel"
    );
    const safeEntry = decisionMap.decisionByKey[safeKey]!;
    expect(safeEntry.decisionKey).toBe(createZiweiHighRiskEgressDecisionKey(
      safeEntry.sourceSurfaceId,
      safeEntry.textRole,
      safeEntry.sourceIdentity,
      safeEntry.sourceField
    ));
    expect(getZiweiHighRiskEgressDecisionEntry(
      decisionMap,
      projection,
      safeKey,
      safe.motionLabel
    )).toBe(safeEntry);
    expect(() => getZiweiHighRiskEgressDecisionEntry(
      decisionMap,
      projection,
      safeKey,
      "wrong chart text"
    ))
      .toThrow(/does not match/u);
    expect(getZiweiHighRiskEgressDecisionEntry(
      decisionMap,
      projection,
      "missing-key",
      "unused"
    )).toBeNull();
    const distinctProjectionWithSameLeaf = { ...projection } as BrowserProbeDisplayProjection;
    expect(distinctProjectionWithSameLeaf).not.toBe(projection);
    expect(() => getZiweiHighRiskEgressDecisionEntry(
      decisionMap,
      distinctProjectionWithSameLeaf,
      safeKey,
      safe.motionLabel
    )).toThrow(/projection object identity/u);
    expect(() => createZiweiHighRiskEgressDecisionKey(
      "ziwei.candidate.core-minor-star.base",
      "forward_candidate",
      "",
      "plainLanguage"
    )).toThrow(/non-empty primitive string/u);
  });

  it("does not mutate or freeze the raw projection", () => {
    expect(JSON.stringify(projection)).toBe(serializedProjectionBefore);
    expect(projection.displayPalaces).toBe(displayPalacesReference);
    expect(Object.isFrozen(projection)).toBe(false);
    expect(decisionMap.boundary.rawProjectionMutated).toBe(false);
    expect(decisionMap.boundary.rawProjectionIncluded).toBe(false);
    const serializedMap = JSON.stringify(decisionMap);
    expect(serializedMap).not.toContain(INPUT.calendarInput.date);
    expect(serializedMap).not.toContain(
      projection.palaceFirstSynthesisReviews[0]!.artifactFactsSha256
    );
  });

  it("neutralizes risky derived text while preserving exact safe pass-through text", () => {
    const riskyOccurrence = projection.palaceNatalTransformationReviews
      .flatMap((review) => review.occurrences.map((occurrence) => ({ review, occurrence })))
      .find(({ occurrence }) => /疾病|寿命|投资建议|财富多寡|婚姻结果|心理诊断/u
        .test(occurrence.directStatement));
    expect(riskyOccurrence).toBeDefined();
    const riskyKey = createZiweiHighRiskEgressDecisionKey(
      "ziwei.candidate.natal-transformation.review",
      "derived_direct_statement",
      `${riskyOccurrence!.review.reviewId}/${riskyOccurrence!.occurrence.occurrenceId}`,
      "directStatement"
    );
    const neutralized = getZiweiHighRiskEgressDecisionEntry(
      decisionMap,
      projection,
      riskyKey,
      riskyOccurrence!.occurrence.directStatement
    );
    expect(neutralized?.action).toBe("neutralized");
    expect(neutralized?.displayText).toBe(ZIWEI_HIGH_RISK_EGRESS_NEUTRAL_FALLBACK);
    expect(neutralized?.sourceDecision.receipt.candidateTextIncluded).toBe(false);
    expect(JSON.stringify(neutralized)).not.toContain(riskyOccurrence!.occurrence.directStatement);

    const safe = projection.natalTransformationCandidateContent[0]!;
    const safeKey = createZiweiHighRiskEgressDecisionKey(
      "ziwei.candidate.natal-transformation.base",
      "forward_candidate",
      safe.contentId,
      "motionLabel"
    );
    const passed = getZiweiHighRiskEgressDecisionEntry(
      decisionMap,
      projection,
      safeKey,
      safe.motionLabel
    );
    expect(passed?.action).toBe("pass_through");
    expect(passed?.displayText).toBe(safe.motionLabel);
  });

  it("keeps integration, mutation-epoch, authority, rights, and release gates false", () => {
    expect(decisionMap.lifecycle).toBe("ephemeral_in_memory_only");
    expect(decisionMap.boundary.mutationEpochReceipt).toBeNull();
    expect(decisionMap.boundary.independentExpertReviewsVerified).toBe(0);
    for (const [key, value] of Object.entries(decisionMap.boundary)) {
      if (typeof value === "boolean") expect(value, key).toBe(false);
    }
  });

  it("keeps feedback DOM maps separate from the existing fourteen-surface projection map", () => {
    expect(ZIWEI_HIGH_RISK_EGRESS_INCLUDED_SURFACE_IDS).toHaveLength(14);
    expect(decisionMap.boundary.feedbackSurfacesIncluded).toBe(false);
    expect(ZIWEI_HIGH_RISK_FEEDBACK_DOM_SURFACE_IDS).toEqual([
      "ziwei.candidate.core-minor-star.sanfang-feedback-preflight",
      "ziwei.candidate.natal-transformation.palace-feedback-preflight"
    ]);
    expect(ZIWEI_HIGH_RISK_FEEDBACK_DOM_TEXT_ROLE).toBe("human_review_narrative");

    const coreMap = coreFeedbackView.decisionMap;
    const natalMap = natalFeedbackView.decisionMap;
    expect(isZiweiCoreMinorStarSanfangFeedbackDomDecisionMap(coreMap)).toBe(true);
    expect(isZiweiNatalTransformationPalaceFeedbackDomDecisionMap(coreMap)).toBe(false);
    expect(isZiweiNatalTransformationPalaceFeedbackDomDecisionMap(natalMap)).toBe(true);
    expect(isZiweiCoreMinorStarSanfangFeedbackDomDecisionMap(natalMap)).toBe(false);
    expect(isZiweiHighRiskEgressDecisionMap(coreMap)).toBe(false);
    expect(isZiweiHighRiskEgressDecisionMap(natalMap)).toBe(false);
    expect(Object.getPrototypeOf(coreMap)).toBeNull();
    expect(Object.getPrototypeOf(natalMap)).toBeNull();
    expect(Object.getPrototypeOf(coreMap.decisionByKey)).toBeNull();
    expect(Object.getPrototypeOf(natalMap.decisionByKey)).toBeNull();
    expectDeepFrozen(coreMap);
    expectDeepFrozen(natalMap);

    expect(coreMap.ownerKind).toBe("current_chart_core_minor_sanfang_preflight");
    expect(coreMap.entries).toHaveLength(5);
    expect(coreMap.coverage.includedSourceFields).toEqual([
      "selectedTradition",
      "decisionReason",
      "applicabilityConditions",
      "counterexamples",
      "revisionRequest"
    ]);
    expect(natalMap.ownerKind).toBe("static_natal_transformation_palace_preflight");
    expect(natalMap.entries).toHaveLength(4);
    expect(natalMap.coverage.includedSourceFields).toEqual([
      "selectedSchool",
      "decisionReason",
      "applicabilityConditions",
      "counterexamples"
    ]);
    expect(coreMap.coverage.sourceEntryCount).toBe(coreMap.entries.length);
    expect(coreMap.coverage.browserDisplayEvaluationCount).toBe(coreMap.entries.length);
    expect(natalMap.coverage.sourceEntryCount).toBe(natalMap.entries.length);
    expect(natalMap.coverage.browserDisplayEvaluationCount).toBe(natalMap.entries.length);
  });

  it("evaluates each resolved feedback leaf at its fixed preflight surface and browser display", () => {
    for (const entry of coreFeedbackView.decisionMap.entries) {
      expect(entry.feedbackSurfaceId)
        .toBe("ziwei.candidate.core-minor-star.sanfang-feedback-preflight");
      expect(entry.feedbackDecision.surfaceId).toBe(entry.feedbackSurfaceId);
      expect(entry.browserDisplaySurfaceId)
        .toBe(ZIWEI_HIGH_RISK_EGRESS_BROWSER_DISPLAY_SURFACE_ID);
      expect(entry.browserDisplayDecision.surfaceId)
        .toBe(ZIWEI_HIGH_RISK_EGRESS_BROWSER_DISPLAY_SURFACE_ID);
      expect(entry.textRole).toBe("human_review_narrative");
      expect(isZiweiHighRiskEgressDecision(entry.feedbackDecision)).toBe(true);
      expect(isZiweiHighRiskEgressDecision(entry.browserDisplayDecision)).toBe(true);
    }
    for (const entry of natalFeedbackView.decisionMap.entries) {
      expect(entry.feedbackSurfaceId)
        .toBe("ziwei.candidate.natal-transformation.palace-feedback-preflight");
      expect(entry.feedbackDecision.surfaceId).toBe(entry.feedbackSurfaceId);
      expect(entry.browserDisplayDecision.surfaceId)
        .toBe(ZIWEI_HIGH_RISK_EGRESS_BROWSER_DISPLAY_SURFACE_ID);
      expect(entry.action).toBe("pass_through");
      const item = natalFeedbackView.preflight.envelope.items[0]!;
      const rawByField = {
        selectedSchool: item.selectedSchool,
        decisionReason: item.decisionReason,
        applicabilityConditions: item.applicabilityConditions,
        counterexamples: item.counterexamples,
        revisionRequest: item.revisionRequest
      } as const;
      if (entry.sourceField === "selectedTradition") {
        throw new Error("Natal transformation feedback must not expose selectedTradition");
      }
      expect(entry.displayText).toBe(rawByField[entry.sourceField]);
    }
  });

  it("neutralizes risky imported narrative without changing the validated preflight envelope", async () => {
    const raw = await createCoreFeedbackRaw({
      decision: "approve",
      decisionReason: "一定发财"
    });
    const view = await createZiweiCoreMinorStarSanfangFeedbackDomDecisionView(raw, projection);
    const reason = view.decisionMap.entries.find(
      (entry) => entry.sourceField === "decisionReason"
    )!;
    expect(view.preflight.envelope.items[0]!.decisionReason).toBe("一定发财");
    expect(reason.feedbackDecision.action).toBe("neutralized");
    expect(reason.action).toBe("neutralized");
    expect(reason.displayText).toBe(ZIWEI_HIGH_RISK_EGRESS_NEUTRAL_FALLBACK);
    expect(reason.feedbackDecision.receipt.candidateTextIncluded).toBe(false);
    expect(JSON.stringify(reason)).not.toContain("一定发财");

    const selected = view.decisionMap.entries.find(
      (entry) => entry.sourceField === "selectedTradition"
    )!;
    expect(selected.action).toBe("pass_through");
    expect(selected.displayText).toBe("测试传统");
  });

  it("requires exact private owner, key, projection, preflight, and source-text identities", () => {
    const coreMap = coreFeedbackView.decisionMap;
    const corePreflight = coreFeedbackView.preflight;
    const coreItem = corePreflight.envelope.items[0]!;
    const coreEntry = coreMap.entries[0]!;
    const coreKey = createZiweiHighRiskFeedbackDomDecisionKey(
      coreEntry.feedbackSurfaceId,
      coreEntry.sourceIdentity,
      coreEntry.sourceField
    );
    const rawByField = {
      selectedTradition: coreItem.selectedTradition,
      selectedSchool: "",
      decisionReason: coreItem.decisionReason,
      applicabilityConditions: coreItem.applicabilityConditions,
      counterexamples: coreItem.counterexamples,
      revisionRequest: coreItem.revisionRequest
    } as const;
    const raw = rawByField[coreEntry.sourceField];
    expect(getZiweiCoreMinorStarSanfangFeedbackDomDecisionEntry(
      coreMap,
      projection,
      corePreflight,
      coreKey,
      raw
    )).toBe(coreEntry);

    const clonedMap = { ...coreMap };
    const clonedPreflight = { ...corePreflight };
    const distinctProjection = { ...projection } as BrowserProbeDisplayProjection;
    expect(() => getZiweiCoreMinorStarSanfangFeedbackDomDecisionEntry(
      clonedMap, projection, corePreflight, coreKey, raw
    )).toThrow(/Unbranded/u);
    expect(() => getZiweiCoreMinorStarSanfangFeedbackDomDecisionEntry(
      coreMap, distinctProjection, corePreflight, coreKey, raw
    )).toThrow(/projection object identity/u);
    expect(() => getZiweiCoreMinorStarSanfangFeedbackDomDecisionEntry(
      coreMap, projection, clonedPreflight, coreKey, raw
    )).toThrow(/preflight object identity/u);
    expect(() => getZiweiCoreMinorStarSanfangFeedbackDomDecisionEntry(
      coreMap, projection, corePreflight, coreKey, `${raw} changed`
    )).toThrow(/source text does not match/u);
    expect(() => getZiweiCoreMinorStarSanfangFeedbackDomDecisionEntry(
      coreMap, projection, corePreflight, "missing-key", raw
    )).toThrow(/key is absent/u);
    expect(() => getZiweiNatalTransformationPalaceFeedbackDomDecisionEntry(
      coreMap, corePreflight, coreKey, raw
    )).toThrow(/Unbranded/u);
    expect(() => createZiweiHighRiskFeedbackDomDecisionKey(
      "ziwei.candidate.core-minor-star.sanfang-feedback-preflight",
      coreEntry.sourceIdentity,
      "selectedSchool"
    )).toThrow(/boundary rejected/u);

    const natalMap = natalFeedbackView.decisionMap;
    const natalPreflight = natalFeedbackView.preflight;
    const natalEntry = natalMap.entries[0]!;
    const natalItem = natalPreflight.envelope.items[0]!;
    expect(getZiweiNatalTransformationPalaceFeedbackDomDecisionEntry(
      natalMap,
      natalPreflight,
      natalEntry.decisionKey,
      natalItem.selectedSchool
    )).toBe(natalEntry);
    expect(() => getZiweiNatalTransformationPalaceFeedbackDomDecisionEntry(
      natalMap,
      { ...natalPreflight },
      natalEntry.decisionKey,
      natalItem.selectedSchool
    )).toThrow(/preflight object identity/u);
    expect(() => getZiweiCoreMinorStarSanfangFeedbackDomDecisionEntry(
      natalMap,
      projection,
      natalPreflight,
      natalEntry.decisionKey,
      natalItem.selectedSchool
    )).toThrow(/Unbranded/u);
  });

  it("explicitly excludes templates, downloads, reviewer and file metadata, URLs, and guardrails", async () => {
    const metadataRiskText = "一定发财";
    const reviewerDisplayName = "一定发财审稿人";
    const view = await createZiweiCoreMinorStarSanfangFeedbackDomDecisionView(
      await createCoreFeedbackRaw({ reviewerDisplayName, metadataRiskText }),
      projection
    );
    const map = view.decisionMap;
    expect(map.coverage.excludedCategories)
      .toEqual(ZIWEI_HIGH_RISK_FEEDBACK_DOM_EXCLUDED_CATEGORIES);
    expect(map.coverage.excludedCategories).toEqual([
      "raw_template_or_download",
      "reviewer_attribution",
      "file_name",
      "additional_source_url",
      "review_guardrail"
    ]);
    expect(new Set(map.entries.map((entry) => entry.sourceField))).toEqual(new Set([
      "selectedTradition",
      "decisionReason",
      "applicabilityConditions",
      "counterexamples"
    ]));
    expect(map.entries.every((entry) => entry.action === "pass_through")).toBe(true);
    const serializedMap = JSON.stringify(map);
    expect(serializedMap).not.toContain(reviewerDisplayName);
    expect(serializedMap).not.toContain(encodeURIComponent(metadataRiskText));
    expect(map.boundary.feedbackPreflightNarrativeIncluded).toBe(true);
    expect(map.boundary.rawFeedbackEnvelopeIncluded).toBe(false);
    expect(map.boundary.rawTemplateOrDownloadCovered).toBe(false);
    expect(map.boundary.reviewerAttributionCovered).toBe(false);
    expect(map.boundary.fileNameCovered).toBe(false);
    expect(map.boundary.additionalSourceUrlsCovered).toBe(false);
    expect(map.boundary.reviewGuardrailIncluded).toBe(false);
    expect(map.boundary.semanticCoverageComplete).toBe(false);
    expect(map.boundary.fullDomAriaDatasetDownloadSinkClosureEstablished).toBe(false);
    expect(map.boundary.mutationEpochAvailable).toBe(false);
    expect(map.boundary.mutationEpochReceipt).toBeNull();
    for (const [key, value] of Object.entries(map.boundary)) {
      if (key !== "feedbackPreflightNarrativeIncluded" && typeof value === "boolean") {
        expect(value, key).toBe(false);
      }
    }
  });

  it("contains no storage, file-write, or network egress implementation", async () => {
    const source = await readFile(
      new URL("./browser-preview/high-risk-expression-egress-view.ts", import.meta.url),
      "utf8"
    );
    expect(source).not.toMatch(
      /\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|\bfetch\s*\(|\bXMLHttpRequest\b|\bsendBeacon\b|\bwriteFile\b|\bappendFile\b/u
    );
  });
});
