import { describe, expect, it } from "vitest";
import {
  WESTERN_DYNAMIC_CONTENT_REVIEW_FEEDBACK_MAX_BYTES,
  WESTERN_DYNAMIC_CONTENT_REVIEW_FEEDBACK_PROFILE,
  createWesternDynamicContentReviewFeedbackTemplate,
  preflightWesternDynamicContentReviewFeedback,
  serializeWesternDynamicContentReviewFeedbackTemplate,
  westernDynamicContentReviewFeedbackFilename
} from "./browser-app/dynamic-content-review-feedback.ts";
import { buildWesternContentProjection } from "./browser-app/content-layer.ts";
import { runWesternRuleLayer } from "./rule-layer-bridge.ts";

type EditableFeedback = Record<string, any>;

const aspectDefinitions = [
  { aspectId: "conjunction", exactAngleDeg: 0, maxOrbDeg: 8 },
  { aspectId: "sextile", exactAngleDeg: 60, maxOrbDeg: 8 },
  { aspectId: "square", exactAngleDeg: 90, maxOrbDeg: 8 },
  { aspectId: "trine", exactAngleDeg: 120, maxOrbDeg: 8 },
  { aspectId: "opposition", exactAngleDeg: 180, maxOrbDeg: 8 }
] as const;

const bodies = [
  { bodyId: "sun", eclipticLongitudeDeg: 0.5, longitudeSpeedDegPerDay: 0.99 },
  { bodyId: "moon", eclipticLongitudeDeg: 30.5, longitudeSpeedDegPerDay: 12.5 },
  { bodyId: "mercury", eclipticLongitudeDeg: 60.5, longitudeSpeedDegPerDay: -0.5 },
  { bodyId: "venus", eclipticLongitudeDeg: 90.5, longitudeSpeedDegPerDay: 1.2 },
  { bodyId: "mars", eclipticLongitudeDeg: 120.5, longitudeSpeedDegPerDay: 0.7 },
  { bodyId: "jupiter", eclipticLongitudeDeg: 150.5, longitudeSpeedDegPerDay: 0.2 },
  { bodyId: "saturn", eclipticLongitudeDeg: 180.5, longitudeSpeedDegPerDay: 0.1 },
  { bodyId: "uranus", eclipticLongitudeDeg: 210.5, longitudeSpeedDegPerDay: 0.05 },
  { bodyId: "neptune", eclipticLongitudeDeg: 240.5, longitudeSpeedDegPerDay: 0.03 },
  { bodyId: "pluto", eclipticLongitudeDeg: 270.5, longitudeSpeedDegPerDay: 0.02 }
] as const;

function projection(offset = 0) {
  const artifact = runWesternRuleLayer({
    protocolVersion: "western-astrology-rules-request/0.1-draft",
    inputLabel: `dynamic content review test ${offset}`,
    bodies: bodies.map((body) => ({ ...body, eclipticLongitudeDeg: body.eclipticLongitudeDeg + offset })),
    zodiac: { kind: "tropical", ayanamshaDeg: null },
    houses: {
      systemId: "whole_sign_v1",
      ramcDeg: offset,
      geographicLatitudeDeg: 0,
      obliquityTrueOfDateDeg: 23.436
    },
    aspects: { definitions: aspectDefinitions }
  });
  if (artifact.outcome !== "computed") throw new Error("dynamic review fixture did not compute");
  return buildWesternContentProjection(artifact);
}

async function editableTemplate(currentProjection = projection()): Promise<EditableFeedback> {
  return JSON.parse(serializeWesternDynamicContentReviewFeedbackTemplate(
    await createWesternDynamicContentReviewFeedbackTemplate(currentProjection)
  )) as EditableFeedback;
}

function attributeReviewer(feedback: EditableFeedback): void {
  feedback.reviewer.reviewerId = "reviewer-western-dynamic-001";
  feedback.reviewer.displayName = "示例动态审稿人";
  feedback.reviewer.affiliation = "独立研究者";
  feedback.reviewer.expertiseStatement = "持续研究传统与现代西洋占星整盘解释方法";
  feedback.reviewer.identityEvidenceReference = "self-declared://reviewer-western-dynamic-001";
  feedback.reviewSession.reviewedAt = "2026-08-12T20:30:00+08:00";
  feedback.reviewSession.methodology = "逐卡核对结构事实、解释条件、反例与来源边界";
  feedback.reviewSession.traditionScope = "传统占星与现代心理占星并列比较";
  feedback.reviewSession.generalNotes = "反馈不代表身份验证、科学验证或正式启用。";
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
  item.decisionReason = "可以作为当前盘的条件化候选，但不能脱离其他结构与现实语境。";
  item.applicabilityConditions = "盘面派生事实可靠，并结合落位、相位、守护链及现实经历。";
  item.counterexamples = "其他紧密结构、资料误差或现实经历冲突时，需要保留矛盾或改写。";
  item.revisionRequest = decision === "revise" ? "缩窄表述，并补充传统分歧。" : "";
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
  feedback.declaredCounts = { total: feedback.items.length, ...decisions };
  feedback.declaredOrientationProposalCounts = { total: feedback.items.length, ...orientations };
}

async function expectRejected(feedback: EditableFeedback, currentProjection = projection()): Promise<void> {
  await expect(preflightWesternDynamicContentReviewFeedback(
    `${JSON.stringify(feedback)}\n`, currentProjection
  )).rejects.toThrow();
}

describe("western current-chart dynamic content review feedback", () => {
  it("builds a deterministic projection-bound template with dynamic counts and de-identified scope", async () => {
    const currentProjection = projection();
    const first = await createWesternDynamicContentReviewFeedbackTemplate(currentProjection);
    const second = await createWesternDynamicContentReviewFeedbackTemplate(currentProjection);
    expect(first).toEqual(second);
    expect(first.profile).toBe(WESTERN_DYNAMIC_CONTENT_REVIEW_FEEDBACK_PROFILE);
    expect(first.profile.reviewScope).toBe("current_projection_dynamic_candidates_only");
    expect(first.profile.privacyScope).toBe("direct_identifiers_removed_derived_chart_facts");
    expect(first.profile.primitiveCatalogReviewApplied).toBe(false);
    const expectedCount = 50 + currentProjection.aspects.length;
    expect(first.items).toHaveLength(expectedCount);
    expect(first.sourceRegistry).toHaveLength(31);
    expect(first.projectionBinding).toMatchObject({ itemCount: expectedCount, sourceCount: 31 });
    expect(first.projectionBinding.factsSha256).toBe(currentProjection.factsSha256);
    expect(first.projectionBinding.projectionSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(first.projectionBinding.orderedCandidateIdsSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(first.projectionBinding.sourceRegistrySha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(new Set(first.items.map((item) => item.candidateId))).toHaveLength(first.items.length);
    expect(first.items.map((item) => item.order)).toEqual(
      Array.from({ length: first.items.length }, (_, index) => index + 1)
    );
    expect(Object.fromEntries([
      "first_read", "body_synthesis", "chart_ruler", "dispositor_chain",
      "angle_proximity", "angle", "distribution", "house_ruler", "placement", "aspect"
    ].map((category) => [
      category, first.items.filter((item) => item.category === category).length
    ]))).toEqual({
      first_read: 1,
      body_synthesis: 10,
      chart_ruler: 1,
      dispositor_chain: 10,
      angle_proximity: 1,
      angle: 4,
      distribution: 1,
      house_ruler: 12,
      placement: 10,
      aspect: currentProjection.aspects.length
    });
    expect(first.items.every((item) => (
      item.decision === "unresolved"
      && item.orientationProposal === "unresolved"
      && item.candidateSnapshotSha256.match(/^[a-f0-9]{64}$/u)
      && item.expertTruthClaimed === false
      && item.scientificValidityClaimed === false
      && item.formalActivationAllowed === false
      && item.goodBadOrientation === null
      && item.eventOutcome === null
      && item.result === null
    ))).toBe(true);
    expect(first.boundary).toMatchObject({
      directIdentifiersIncluded: false,
      inputFieldsIncluded: false,
      derivedChartFactsIncluded: true,
      externalSharingRequiresUserDecision: true,
      identityVerified: false,
      digitalSignatureVerified: false,
      scientificValidityEstablished: false,
      eligibleForFormalActivation: false,
      autoIntegrationAllowed: false,
      networkTransmissionPerformed: false,
      ruleArtifactOrStorageMutationPerformed: false,
      primitiveCatalogReviewApplied: false,
      deterministicOutcomeEstablished: false,
      goodBadOrientation: null,
      eventOutcome: null,
      result: null
    });
    const serialized = serializeWesternDynamicContentReviewFeedbackTemplate(first);
    expect(serialized.endsWith("\n")).toBe(true);
    expect(serialized).not.toContain("dynamic content review test");
    expect(serialized).not.toContain("utcInstant");
    expect(serialized).not.toContain("geographicLatitudeDeg");
    expect(serialized).not.toContain("ramcDeg");
    expect(serialized).not.toContain("obliquityTrueOfDateDeg");
    expect(serialized).not.toContain("ayanamshaDeg");
    expect(westernDynamicContentReviewFeedbackFilename()).toBe(
      "hakimi-western-current-chart-review-v007.json"
    );
  });

  it("supports non-default dynamic candidate counts without a hard-coded 73-item contract", async () => {
    const smallerArtifact = runWesternRuleLayer({
      protocolVersion: "western-astrology-rules-request/0.1-draft",
      inputLabel: "smaller dynamic review test",
      bodies: bodies.slice(0, 2),
      zodiac: { kind: "tropical", ayanamshaDeg: null },
      houses: {
        systemId: "whole_sign_v1", ramcDeg: 0, geographicLatitudeDeg: 0,
        obliquityTrueOfDateDeg: 23.436
      },
      aspects: { definitions: aspectDefinitions }
    });
    if (smallerArtifact.outcome !== "computed") throw new Error("small fixture did not compute");
    const smallerProjection = buildWesternContentProjection(smallerArtifact);
    const template = await createWesternDynamicContentReviewFeedbackTemplate(smallerProjection);
    const expectedCount = 2
      + smallerProjection.bodySyntheses.length
      + (smallerProjection.chartRuler === null ? 0 : 1)
      + smallerProjection.dispositorChains.length
      + (smallerProjection.angleProximity === null ? 0 : 1)
      + smallerProjection.angles.length
      + smallerProjection.houseRulers.length
      + smallerProjection.placements.length
      + smallerProjection.aspects.length;
    expect(template.items.length).toBe(expectedCount);
    expect(template.projectionBinding.itemCount).toBe(expectedCount);
    expect(template.declaredCounts.total).toBe(expectedCount);
  });

  it("accepts attributed conditional feedback while preserving every formal boundary", async () => {
    const currentProjection = projection();
    const feedback = await editableTemplate(currentProjection);
    attributeReviewer(feedback);
    resolveItem(feedback, 0);
    feedback.items[0].additionalSourceUrls = ["https://example.org/current-chart-review-note"];
    setDeclaredCounts(feedback);

    const result = await preflightWesternDynamicContentReviewFeedback(
      `${JSON.stringify(feedback)}\n`, currentProjection
    );
    expect(result.resolvedCount).toBe(1);
    expect(result.unresolvedCount).toBe(feedback.items.length - 1);
    expect(result.reviewerAttributionComplete).toBe(true);
    expect(result.currentProjectionBound).toBe(true);
    expect(result.identityVerified).toBe(false);
    expect(result.digitalSignatureVerified).toBe(false);
    expect(result.scientificValidityEstablished).toBe(false);
    expect(result.eligibleForFormalActivation).toBe(false);
    expect(result.autoIntegrationAllowed).toBe(false);
    expect(result.networkTransmissionPerformed).toBe(false);
    expect(result.ruleArtifactOrStorageMutationPerformed).toBe(false);
    expect(result.primitiveCatalogReviewApplied).toBe(false);
    expect(result.deterministicOutcomeEstablished).toBe(false);
    expect(result.goodBadOrientation).toBeNull();
    expect(result.eventOutcome).toBeNull();
    expect(result.result).toBeNull();
  });

  it("accepts harmless JSON key reordering while keeping exact profile fields", async () => {
    const currentProjection = projection();
    const feedback = await editableTemplate(currentProjection);
    feedback.profile = Object.fromEntries(Object.entries(feedback.profile).reverse());
    const result = await preflightWesternDynamicContentReviewFeedback(
      `${JSON.stringify(feedback)}\n`, currentProjection
    );
    expect(result.counts.unresolved).toBe(feedback.items.length);
    expect(result.currentProjectionBound).toBe(true);
  });

  it("keeps all-approved feedback outside scientific truth, primitive inheritance and activation", async () => {
    const currentProjection = projection();
    const feedback = await editableTemplate(currentProjection);
    attributeReviewer(feedback);
    for (let index = 0; index < feedback.items.length; index += 1) resolveItem(feedback, index);
    setDeclaredCounts(feedback);
    const result = await preflightWesternDynamicContentReviewFeedback(
      `${JSON.stringify(feedback)}\n`, currentProjection
    );
    expect(result.allItemsResolved).toBe(true);
    expect(result.eligibleForFormalActivation).toBe(false);
    expect(result.primitiveCatalogReviewApplied).toBe(false);
    expect(result.scientificValidityEstablished).toBe(false);
    expect(result.goodBadOrientation).toBeNull();
    expect(result.result).toBeNull();
  });

  it("fails closed for wrong projection, hashes, immutable snapshot, sources, review or boundary tampering", async () => {
    const currentProjection = projection();

    const wrongProjection = await editableTemplate(currentProjection);
    await expectRejected(wrongProjection, projection(1));

    const bindingTamper = await editableTemplate(currentProjection);
    bindingTamper.projectionBinding.projectionSha256 = "0".repeat(64);
    await expectRejected(bindingTamper, currentProjection);

    const snapshotTamper = await editableTemplate(currentProjection);
    snapshotTamper.items[0].contextLines[0] += " changed";
    await expectRejected(snapshotTamper, currentProjection);

    const itemHashTamper = await editableTemplate(currentProjection);
    itemHashTamper.items[0].candidateSnapshotSha256 = "0".repeat(64);
    await expectRejected(itemHashTamper, currentProjection);

    const orderTamper = await editableTemplate(currentProjection);
    [orderTamper.items[0], orderTamper.items[1]] = [orderTamper.items[1], orderTamper.items[0]];
    await expectRejected(orderTamper, currentProjection);

    const sourceTamper = await editableTemplate(currentProjection);
    sourceTamper.sourceRegistry[0].title += " changed";
    await expectRejected(sourceTamper, currentProjection);

    const unresolvedTamper = await editableTemplate(currentProjection);
    unresolvedTamper.items[0].orientationProposal = "mixed_conditional";
    unresolvedTamper.declaredOrientationProposalCounts.unresolved -= 1;
    unresolvedTamper.declaredOrientationProposalCounts.mixedConditional += 1;
    await expectRejected(unresolvedTamper, currentProjection);

    const attributionTamper = await editableTemplate(currentProjection);
    resolveItem(attributionTamper, 0);
    setDeclaredCounts(attributionTamper);
    await expectRejected(attributionTamper, currentProjection);

    const reviseTamper = await editableTemplate(currentProjection);
    attributeReviewer(reviseTamper);
    resolveItem(reviseTamper, 0, "revise");
    reviseTamper.items[0].revisionRequest = "";
    setDeclaredCounts(reviseTamper);
    await expectRejected(reviseTamper, currentProjection);

    const urlTamper = await editableTemplate(currentProjection);
    attributeReviewer(urlTamper);
    resolveItem(urlTamper, 0);
    urlTamper.items[0].additionalSourceUrls = ["http://example.org/not-https"];
    setDeclaredCounts(urlTamper);
    await expectRejected(urlTamper, currentProjection);

    const countsTamper = await editableTemplate(currentProjection);
    countsTamper.declaredCounts.unresolved -= 1;
    countsTamper.declaredCounts.approve += 1;
    await expectRejected(countsTamper, currentProjection);

    const boundaryTamper = await editableTemplate(currentProjection);
    boundaryTamper.boundary.eligibleForFormalActivation = true;
    await expectRejected(boundaryTamper, currentProjection);

    const extraKeyTamper = await editableTemplate(currentProjection);
    extraKeyTamper.utcInstant = "2026-08-12T00:00:00.000Z";
    await expectRejected(extraKeyTamper, currentProjection);
  });

  it("rejects empty and oversized payloads before JSON preflight", async () => {
    const currentProjection = projection();
    await expect(preflightWesternDynamicContentReviewFeedback("", currentProjection))
      .rejects.toThrow(/1 字节至 2 MiB/u);
    await expect(preflightWesternDynamicContentReviewFeedback(
      "x".repeat(WESTERN_DYNAMIC_CONTENT_REVIEW_FEEDBACK_MAX_BYTES + 1),
      currentProjection
    )).rejects.toThrow(/1 字节至 2 MiB/u);
  });
});
