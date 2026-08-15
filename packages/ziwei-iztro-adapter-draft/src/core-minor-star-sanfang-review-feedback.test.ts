// @vitest-environment node

import { beforeAll, describe, expect, it } from "vitest";
import {
  calculateIztro258EngineeringFixture,
  createIztro258RuleSnapshotDraft
} from "./index.ts";
import {
  ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
  ZIWEI_DOUSHU_SYSTEM_ID,
  type ZiweiBirthInputDraft,
  type ZiweiNatalFixtureDraft
} from "./contract-bridge.ts";
import {
  ZIWEI_BROWSER_SOURCE_DIGEST_ALGORITHM,
  ZIWEI_BROWSER_SOURCE_IDENTITY_VERSION,
  ZIWEI_BROWSER_SOURCE_PATHS,
  calculateZiweiBrowserSourceGraphSha256,
  createZiweiBrowserEngineeringArtifactDraft,
  type ZiweiBrowserSourceIdentityDraft
} from "./browser-preview/browser-artifact.ts";
import { createZiweiBrowserDisplayProjection }
  from "./browser-preview/display-projection.ts";
import {
  ZIWEI_CORE_MINOR_STAR_SANFANG_PROJECTION_RULE,
  ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_VERSION
} from "./browser-preview/core-minor-star-sanfang-review.ts";
import {
  ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_FEEDBACK_MAX_BYTES,
  ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_FEEDBACK_PROFILE,
  createZiweiCoreMinorStarSanfangReviewFeedbackTemplate,
  preflightZiweiCoreMinorStarSanfangReviewFeedback,
  serializeZiweiCoreMinorStarSanfangReviewFeedbackTemplate,
  ziweiCoreMinorStarSanfangReviewFeedbackFilename
} from "./browser-preview/core-minor-star-sanfang-review-feedback.ts";
import type { BrowserProbeDisplayProjection }
  from "./browser-preview/browser-protocol.ts";

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
      label: "v013-contract-test",
      latitude: null,
      longitude: null
    }
  },
  birthSourceRef: "local.v013.contract.test",
  sourceNote: "v0.13 current-chart occurrence review contract fixture"
};

let fixture: ZiweiNatalFixtureDraft;
let sourceIdentity: ZiweiBrowserSourceIdentityDraft;
let projection: BrowserProbeDisplayProjection;

async function projectionFor(
  input: ZiweiBirthInputDraft,
  requestId: string,
  workerInstanceId: string
): Promise<BrowserProbeDisplayProjection> {
  const currentFixture = input === INPUT
    ? fixture
    : await calculateIztro258EngineeringFixture(input, {
      ruleSnapshot: fixture.ruleSnapshot
    });
  const artifact = await createZiweiBrowserEngineeringArtifactDraft({
    input: currentFixture.input,
    ruleSnapshot: currentFixture.ruleSnapshot,
    facts: currentFixture.facts,
    requestId,
    workerInstanceId,
    startedAt: "2026-08-14T00:00:00.000Z",
    completedAt: "2026-08-14T00:00:00.010Z",
    browserSourceIdentity: sourceIdentity
  });
  return createZiweiBrowserDisplayProjection(artifact);
}

async function sha256Json(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(`${JSON.stringify(value)}\n`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function mutablePacket(raw: string): Record<string, any> {
  return JSON.parse(raw) as Record<string, any>;
}

function jsonKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const entry of value) jsonKeys(entry, keys);
  } else if (typeof value === "object" && value !== null) {
    for (const [key, entry] of Object.entries(value)) {
      keys.add(key);
      jsonKeys(entry, keys);
    }
  }
  return keys;
}

beforeAll(async () => {
  fixture = await calculateIztro258EngineeringFixture(INPUT, {
    ruleSnapshot: await createIztro258RuleSnapshotDraft()
  });
  const files = ZIWEI_BROWSER_SOURCE_PATHS.map((path, index) => ({
    path,
    sha256: (index + 1).toString(16).padStart(64, "0")
  }));
  const sourceProjection = {
    identityVersion: ZIWEI_BROWSER_SOURCE_IDENTITY_VERSION,
    digestAlgorithm: ZIWEI_BROWSER_SOURCE_DIGEST_ALGORITHM,
    files
  } as const;
  sourceIdentity = {
    ...sourceProjection,
    browserSourceGraphSha256: await calculateZiweiBrowserSourceGraphSha256(sourceProjection),
    browserWorkerSourceSha256:
      files.find((entry) => entry.path.endsWith("browser-worker.ts"))!.sha256
  };
  projection = await projectionFor(
    INPUT,
    "13131313-1313-4313-8313-131313131313",
    "23232323-2323-4232-8232-232323232323"
  );
}, 30_000);

describe("Ziwei v0.13 core-minor current-chart sanfang occurrence review", () => {
  it("freezes twelve reviews and forty-eight ordered occurrences without count scoring", () => {
    expect(ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_VERSION)
      .toBe("ziwei.core_minor_star.sanfang_occurrence_review/0.1");
    expect(projection.sanfangProjectionRule)
      .toEqual(ZIWEI_CORE_MINOR_STAR_SANFANG_PROJECTION_RULE);
    expect(projection.coreMinorStarSanfangReviews).toHaveLength(12);
    expect(projection.coreMinorStarSanfangReviews.map((review) => review.order))
      .toEqual(Array.from({ length: 12 }, (_, index) => index + 1));

    const occurrences = projection.coreMinorStarSanfangReviews.flatMap(
      (review) => review.occurrences
    );
    expect(occurrences).toHaveLength(48);
    expect(new Set(occurrences.map((occurrence) => occurrence.occurrenceId)).size).toBe(48);
    const countsByStarId = new Map<string, typeof occurrences>();
    for (const occurrence of occurrences) {
      countsByStarId.set(
        occurrence.starId,
        [...(countsByStarId.get(occurrence.starId) ?? []), occurrence]
      );
    }
    expect(countsByStarId.size).toBe(12);
    expect([...countsByStarId.values()].every((entries) => entries.length === 4)).toBe(true);

    for (const review of projection.coreMinorStarSanfangReviews) {
      expect(review.sanfangProjectionRule).toEqual(ZIWEI_CORE_MINOR_STAR_SANFANG_PROJECTION_RULE);
      expect(review.goodBadOrientation).toBeNull();
      expect(review.eventOutcome).toBeNull();
      expect(review.result).toBeNull();
      expect(review.scoringAllowed).toBe(false);
      expect(review.expertTruthClaimed).toBe(false);
      for (const occurrence of review.occurrences) {
        expect(occurrence.ruleSnapshotSha256).toMatch(/^[a-f0-9]{64}$/u);
        expect(occurrence.artifactFactsSha256).toMatch(/^[a-f0-9]{64}$/u);
        expect(occurrence.baseCandidateContent.contentId)
          .toBe(occurrence.baseCandidateContentId);
        expect(occurrence.palaceCandidateContent.contentId)
          .toBe(occurrence.palaceCandidateContentId);
        expect(occurrence.sourceRefs).toEqual(
          occurrence.palaceCandidateContent.sourceRefs
        );
        expect(occurrence.sourceRefs.every((ref) => (
          Boolean(ref.bindingTarget) && typeof ref.semanticCandidateSupport === "boolean"
        ))).toBe(true);
        expect(occurrence.goodBadOrientation).toBeNull();
        expect(occurrence.eventOutcome).toBeNull();
        expect(occurrence.result).toBeNull();
        expect(occurrence.scoringAllowed).toBe(false);
      }
    }
  });

  it("creates a deterministic, privacy-reduced packet with complete candidate snapshots", async () => {
    const first = await createZiweiCoreMinorStarSanfangReviewFeedbackTemplate(projection);
    const second = await createZiweiCoreMinorStarSanfangReviewFeedbackTemplate(projection);
    expect(first).toEqual(second);
    expect(first.profile).toEqual(ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_FEEDBACK_PROFILE);
    expect(first.items).toHaveLength(48);
    expect(first.sourceRegistry).toHaveLength(5);
    expect(first.sourceRegistry.every((source) => (
      typeof source.semanticCandidateSupport === "boolean"
      && !("semanticInterpretationSupported" in source)
    ))).toBe(true);

    const firstOccurrence = projection.coreMinorStarSanfangReviews
      .flatMap((review) => review.occurrences)[0]!;
    expect(first.items[0]!.occurrenceSnapshot).toEqual(firstOccurrence);
    expect(first.items[0]!.occurrenceSnapshot.baseCandidateContent)
      .toEqual(firstOccurrence.baseCandidateContent);
    expect(first.items[0]!.occurrenceSnapshot.palaceCandidateContent)
      .toEqual(firstOccurrence.palaceCandidateContent);
    expect(first.items[0]!.occurrenceSnapshotSha256)
      .toBe(await sha256Json(firstOccurrence));

    const raw = serializeZiweiCoreMinorStarSanfangReviewFeedbackTemplate(first);
    expect(new TextEncoder().encode(raw).byteLength)
      .toBeLessThan(ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_FEEDBACK_MAX_BYTES);
    expect(ziweiCoreMinorStarSanfangReviewFeedbackFilename())
      .toBe("hakimi-ziwei-current-chart-core-minor-sanfang-review-v013.json");
    const keys = jsonKeys(JSON.parse(raw) as unknown);
    for (const forbidden of [
      "calendarInput", "birthSourceRef", "sourceNote", "gregorianDate", "lunarDate",
      "sex", "sexForCalculation", "displaySummary", "requestId", "workerInstanceId",
      "revision"
    ]) expect(keys.has(forbidden)).toBe(false);
    expect(raw).not.toContain(INPUT.calendarInput.date);
    expect(raw).not.toContain(INPUT.birthSourceRef);
    expect(raw).not.toContain(INPUT.sourceNote);
  });

  it("strictly rebuilds current projection and rejects deep, geometry and cross-chart tampering", async () => {
    const template = await createZiweiCoreMinorStarSanfangReviewFeedbackTemplate(projection);
    const raw = serializeZiweiCoreMinorStarSanfangReviewFeedbackTemplate(template);

    const deepTamper = mutablePacket(raw);
    deepTamper.items[0].occurrenceSnapshot.baseCandidateContent.plainLanguage += "篡改";
    deepTamper.items[0].occurrenceSnapshotSha256 = await sha256Json(
      deepTamper.items[0].occurrenceSnapshot
    );
    await expect(preflightZiweiCoreMinorStarSanfangReviewFeedback(
      `${JSON.stringify(deepTamper)}\n`,
      projection
    )).rejects.toThrow(/当前 occurrence 快照不一致/u);

    const refTamper = mutablePacket(raw);
    delete refTamper.items[0].sourceRefs[0].bindingTarget;
    await expect(preflightZiweiCoreMinorStarSanfangReviewFeedback(
      `${JSON.stringify(refTamper)}\n`,
      projection
    )).rejects.toThrow(/字段集合/u);

    const geometryTamper = structuredClone(projection) as BrowserProbeDisplayProjection;
    (geometryTamper.sanfangProjectionRule as any).sourceTitle = "被替换的几何规则";
    await expect(createZiweiCoreMinorStarSanfangReviewFeedbackTemplate(geometryTamper))
      .rejects.toThrow(/失败关闭|纯几何|当前契约/u);

    const candidateTamper = structuredClone(projection) as BrowserProbeDisplayProjection;
    (candidateTamper.coreMinorStarSanfangReviews[0]!.occurrences[0]!
      .baseCandidateContent as any).plainLanguage += "篡改";
    await expect(createZiweiCoreMinorStarSanfangReviewFeedbackTemplate(candidateTamper))
      .rejects.toThrow(/失败关闭|严格重建/u);

    const otherInput: ZiweiBirthInputDraft = {
      ...INPUT,
      calendarInput: { calendar: "gregorian", date: "1996-08-18" }
    };
    const otherProjection = await projectionFor(
      otherInput,
      "14141414-1414-4414-8414-141414141414",
      "24242424-2424-4242-8242-242424242424"
    );
    await expect(preflightZiweiCoreMinorStarSanfangReviewFeedback(raw, otherProjection))
      .rejects.toThrow(/当前命盘|摘要已失配/u);
  }, 30_000);

  it("keeps every activation, inheritance and scoring boundary false after all items resolve", async () => {
    const template = await createZiweiCoreMinorStarSanfangReviewFeedbackTemplate(projection);
    const packet = mutablePacket(
      serializeZiweiCoreMinorStarSanfangReviewFeedbackTemplate(template)
    );
    for (const item of packet.items) {
      item.decision = "approve";
      item.orientationProposal = "not_assessable";
      item.selectedTradition = "审稿测试流派";
      item.decisionReason = "仅确认候选可继续人工讨论，不确认吉凶或结果。";
      item.applicabilityConditions = "只在当前已验真盘面和所声明流派范围内讨论。";
      item.counterexamples = "其他流派、不同排盘规则与现实资料均可能构成反例。";
    }
    packet.declaredCounts = {
      total: 48, unresolved: 0, approve: 48, revise: 0, reject: 0
    };
    packet.declaredOrientationProposalCounts = {
      total: 48,
      unresolved: 0,
      potentiallySupportive: 0,
      potentiallyChallenging: 0,
      mixedConditional: 0,
      notAssessable: 48
    };
    packet.reviewer = {
      reviewerId: "reviewer-v013",
      displayName: "测试审稿人",
      affiliation: "独立审稿",
      expertiseStatement: "自述熟悉紫微斗数文本比较；身份未验证。",
      identityEvidenceReference: "manual-reference-only",
      identityVerified: false
    };
    packet.reviewSession = {
      reviewedAt: "2026-08-14T08:00:00+08:00",
      methodology: "逐项核对事实位置、候选文本、限制与反例。",
      traditionScope: "仅测试声明范围",
      generalNotes: "不形成正式规则或个人结论。"
    };

    const result = await preflightZiweiCoreMinorStarSanfangReviewFeedback(
      `${JSON.stringify(packet)}\n`,
      projection
    );
    expect(result.allItemsResolved).toBe(true);
    expect(result.resolvedCount).toBe(48);
    expect(result.reviewerAttributionComplete).toBe(true);
    expect(result.currentProjectionBound).toBe(true);
    expect(result.identityVerified).toBe(false);
    expect(result.eligibleForFormalActivation).toBe(false);
    expect(result.autoIntegrationAllowed).toBe(false);
    expect(result.ruleArtifactOrStorageMutationPerformed).toBe(false);
    expect(result.scoringAllowed).toBe(false);
    expect(result.deterministicOutcomeEstablished).toBe(false);
    expect(result.staticCatalogDecisionInheritanceApplied).toBe(false);
    expect(result.goodBadOrientation).toBeNull();
    expect(result.eventOutcome).toBeNull();
    expect(result.result).toBeNull();
    expect(result.envelope.profile.staticCatalogDecisionInheritanceApplied).toBe(false);
    expect(result.envelope.boundary.staticCatalogDecisionInheritanceApplied).toBe(false);
  });

  it("fails closed above the two-MiB UTF-8 limit", async () => {
    await expect(preflightZiweiCoreMinorStarSanfangReviewFeedback(
      "x".repeat(ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_FEEDBACK_MAX_BYTES + 1),
      projection
    )).rejects.toThrow(/2 MiB/u);
  });
});
