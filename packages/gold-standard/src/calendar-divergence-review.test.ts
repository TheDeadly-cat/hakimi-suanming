import { sha256Hex } from "@hakimi/integrity";
import { describe, expect, it } from "vitest";

import {
  CALENDAR_DIVERGENCE_ADJUDICATION_STATEMENT,
  CALENDAR_DIVERGENCE_REVIEW_RECORD_VERSION,
  CALENDAR_DIVERGENCE_REVIEW_STATEMENT,
  CalendarDivergenceReviewError,
  calendarDivergenceAdjudicationPayloadSchema,
  calendarDivergenceIndependentReviewPayloadSchema,
  createCalendarDivergenceAdjudicationEnvelope,
  createCalendarDivergenceIndependentReviewEnvelope,
  createCalendarDivergenceReviewBundle,
  preflightCalendarDivergenceAdjudication,
  preflightCalendarDivergenceIndependentReview,
  preflightCalendarDivergenceReviewBundle,
  serializeCalendarDivergenceReviewBundle,
  type CalendarDivergenceAdjudicationEnvelope,
  type CalendarDivergenceIndependentReviewEnvelope,
  type CalendarDivergenceReviewBundleEnvelope,
  type CalendarDivergenceReviewErrorCode
} from "./calendar-divergence-review";

const BUNDLE_AT = "2026-08-02T01:00:00.000Z";
const NOW = "2026-08-02T08:00:00.000Z";
const PREFLIGHT_CLOCK = { now: NOW, allowedClockSkewMs: 0 } as const;

function identityRef(character: string): `sha256:${string}` {
  return `sha256:${character.repeat(64)}`;
}

function caseContext(bundle: CalendarDivergenceReviewBundleEnvelope, caseId: string) {
  for (const window of bundle.payload.fixture.windows) {
    const candidate = window.cases.find((item) => item.caseId === caseId);
    if (candidate) return { window, candidate };
  }
  throw new Error(`测试案例不存在：${caseId}`);
}

function independentReviewPayload(options: {
  bundle: CalendarDivergenceReviewBundleEnvelope;
  reviewerId: string;
  identityCharacter: string;
  divergenceVerdict?: "unresolved" | "support_hko_current_icu";
}) {
  const divergenceVerdict = options.divergenceVerdict ?? "unresolved";
  const caseReviews = options.bundle.payload.cases.map((binding) => {
    const { window, candidate } = caseContext(options.bundle, binding.caseId);
    const control = candidate.role === "control";
    return {
      ...binding,
      verdict: control ? "confirm_control" : divergenceVerdict,
      effectiveObservation: control || divergenceVerdict === "support_hko_current_icu"
        ? candidate.observations.hko
        : null,
      authoritySourceIds: [window.hkoSourceId],
      supportingCrosscheckSourceIds: control
        ? ["dotnet-framework-4-8-chinese-lunisolar", "icu-chinese-calendar-78-3"].sort()
        : ["icu-chinese-calendar-78-3"],
      contradictorySourceIds: control ? [] : ["dotnet-framework-4-8-chinese-lunisolar"],
      astronomyReferenceSourceIds: control ? [] : [window.rootCauseAssessment.usnoSourceId],
      rationale: control ? "四路观测一致，确认边界外控制日。" : "逐日保留权威历表、ICU 与 .NET 分歧证据。"
    };
  });
  const unresolved = caseReviews.filter((item) => item.verdict === "unresolved").length;
  return calendarDivergenceIndependentReviewPayloadSchema.parse({
    recordVersion: CALENDAR_DIVERGENCE_REVIEW_RECORD_VERSION,
    datasetId: options.bundle.payload.datasetId,
    datasetFixtureVersion: options.bundle.payload.datasetFixtureVersion,
    fixtureDigest: options.bundle.payload.fixtureDigest,
    reviewBundleDigest: options.bundle.digest,
    reviewer: {
      reviewerId: options.reviewerId,
      displayName: options.reviewerId,
      specialty: "中国历法与天文边界复核",
      identityRecordRef: identityRef(options.identityCharacter),
      identityVerificationMode: "offline_maintainer_required",
      statement: CALENDAR_DIVERGENCE_REVIEW_STATEMENT
    },
    caseReviews,
    declaredCounts: {
      total: 64,
      controls: 4,
      divergences: 60,
      resolved: 64 - unresolved,
      unresolved
    },
    reviewedAt: options.reviewerId.endsWith("a")
      ? "2026-08-02T02:00:00.000Z"
      : "2026-08-02T03:00:00.000Z",
    createdAt: options.reviewerId.endsWith("a")
      ? "2026-08-02T02:10:00.000Z"
      : "2026-08-02T03:10:00.000Z",
    rationale: "已逐日完成 64 日审核，不使用窗口级 accept-all 快捷结论。",
    releaseBoundary: { countsAsVerifiedGold: false, verifiedGoldDelta: 0 }
  });
}

async function independentReview(options: {
  bundle: CalendarDivergenceReviewBundleEnvelope;
  reviewerId: string;
  identityCharacter: string;
  divergenceVerdict?: "unresolved" | "support_hko_current_icu";
}) {
  return createCalendarDivergenceIndependentReviewEnvelope(independentReviewPayload(options));
}

function adjudicationPayload(options: {
  bundle: CalendarDivergenceReviewBundleEnvelope;
  reviews: readonly [CalendarDivergenceIndependentReviewEnvelope, CalendarDivergenceIndependentReviewEnvelope];
  unresolvedCaseId?: string;
  adjudicatorId?: string;
  adjudicatorIdentityCharacter?: string;
}) {
  const caseDecisions = options.bundle.payload.cases.map((binding) => {
    const { candidate } = caseContext(options.bundle, binding.caseId);
    const unresolved = candidate.role === "divergence" && binding.caseId === options.unresolvedCaseId;
    return {
      ...binding,
      decision: candidate.role === "control"
        ? "confirm_control"
        : unresolved ? "unresolved" : "support_hko_current_icu",
      effectiveObservation: unresolved ? null : candidate.observations.hko,
      rationale: unresolved ? "两份资料仍不足以消除该日分歧。" : "两份独立审核对该日结论一致。"
    };
  });
  const unresolved = caseDecisions.filter((item) => item.decision === "unresolved").length;
  return calendarDivergenceAdjudicationPayloadSchema.parse({
    recordVersion: CALENDAR_DIVERGENCE_REVIEW_RECORD_VERSION,
    datasetId: options.bundle.payload.datasetId,
    datasetFixtureVersion: options.bundle.payload.datasetFixtureVersion,
    fixtureDigest: options.bundle.payload.fixtureDigest,
    reviewBundleDigest: options.bundle.digest,
    independentReviewDigests: options.reviews.map((review) => review.digest).sort(),
    adjudicator: {
      adjudicatorId: options.adjudicatorId ?? "calendar-adjudicator-c",
      displayName: "历法裁决人 C",
      role: "第三方维护者裁决",
      identityRecordRef: identityRef(options.adjudicatorIdentityCharacter ?? "c"),
      identityVerificationMode: "offline_maintainer_required",
      statement: CALENDAR_DIVERGENCE_ADJUDICATION_STATEMENT
    },
    caseDecisions,
    declaredCounts: {
      total: 64,
      controls: 4,
      divergences: 60,
      resolved: 64 - unresolved,
      unresolved
    },
    decidedAt: "2026-08-02T04:00:00.000Z",
    createdAt: "2026-08-02T04:10:00.000Z",
    rationale: "逐日核对两份独立审核后形成第三方裁决。",
    releaseBoundary: { countsAsVerifiedGold: false, verifiedGoldDelta: 0 }
  });
}

async function adjudication(options: {
  bundle: CalendarDivergenceReviewBundleEnvelope;
  reviews: readonly [CalendarDivergenceIndependentReviewEnvelope, CalendarDivergenceIndependentReviewEnvelope];
  unresolvedCaseId?: string;
  adjudicatorId?: string;
  adjudicatorIdentityCharacter?: string;
}): Promise<CalendarDivergenceAdjudicationEnvelope> {
  return createCalendarDivergenceAdjudicationEnvelope(adjudicationPayload(options));
}

async function expectAuditError(promise: Promise<unknown>, code: CalendarDivergenceReviewErrorCode) {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(CalendarDivergenceReviewError);
    expect((error as CalendarDivergenceReviewError).code).toBe(code);
    return;
  }
  throw new Error(`expected ${code}`);
}

describe("2089/2097 连续历法差异双审与裁决", () => {
  it("生成内容寻址且严格绑定当前 64 日 fixture 的审核包", async () => {
    const first = await createCalendarDivergenceReviewBundle({ generatedAt: BUNDLE_AT });
    const second = await createCalendarDivergenceReviewBundle({ generatedAt: BUNDLE_AT });
    expect(first).toEqual(second);
    expect(first.payload.cases).toHaveLength(64);
    expect(new Set(first.payload.cases.map((item) => item.caseId))).toHaveProperty("size", 64);
    expect(first.payload.reviewPolicy).toMatchObject({
      requiredControlCount: 4,
      requiredDivergenceCount: 60,
      requiredIndependentReviewCount: 2,
      requiredAdjudicatorCount: 1,
      acceptAllShortcutAllowed: false
    });
    expect(await preflightCalendarDivergenceReviewBundle(
      serializeCalendarDivergenceReviewBundle(first),
      PREFLIGHT_CLOCK
    )).toEqual(first);
  });

  it("两份独立逐日审核和第三身份裁决均可预检，但 unresolved 永不进入 curated integration 或金标", async () => {
    const bundle = await createCalendarDivergenceReviewBundle({ generatedAt: BUNDLE_AT });
    const reviewA = await independentReview({
      bundle,
      reviewerId: "calendar-reviewer-a",
      identityCharacter: "a",
      divergenceVerdict: "support_hko_current_icu"
    });
    const reviewB = await independentReview({
      bundle,
      reviewerId: "calendar-reviewer-b",
      identityCharacter: "b",
      divergenceVerdict: "support_hko_current_icu"
    });
    expect((await preflightCalendarDivergenceIndependentReview(reviewA, {
      reviewBundle: bundle,
      ...PREFLIGHT_CLOCK
    })).unresolvedCaseCount).toBe(0);

    const envelope = await adjudication({
      bundle,
      reviews: [reviewA, reviewB],
      unresolvedCaseId: bundle.payload.cases.find((item) => item.role === "divergence")!.caseId
    });
    const result = await preflightCalendarDivergenceAdjudication(envelope, {
      reviewBundle: bundle,
      independentReviews: [reviewA, reviewB],
      ...PREFLIGHT_CLOCK
    });
    expect(result.unresolvedCaseCount).toBe(1);
    expect(result.allCaseDecisionsResolved).toBe(false);
    expect(result.eligibleForCuratedIntegration).toBe(false);
    expect(result.countsAsVerifiedGold).toBe(false);
    expect(result.verifiedGoldDelta).toBe(0);
  });

  it("零 unresolved 只表示逐日结构已解决，离线身份与维护者门仍阻止 curated integration 和金标", async () => {
    const bundle = await createCalendarDivergenceReviewBundle({ generatedAt: BUNDLE_AT });
    const reviewA = await independentReview({
      bundle,
      reviewerId: "calendar-reviewer-a",
      identityCharacter: "a",
      divergenceVerdict: "support_hko_current_icu"
    });
    const reviewB = await independentReview({
      bundle,
      reviewerId: "calendar-reviewer-b",
      identityCharacter: "b",
      divergenceVerdict: "support_hko_current_icu"
    });
    const result = await preflightCalendarDivergenceAdjudication(
      await adjudication({ bundle, reviews: [reviewA, reviewB] }),
      { reviewBundle: bundle, independentReviews: [reviewA, reviewB], ...PREFLIGHT_CLOCK }
    );
    expect(result.unresolvedCaseCount).toBe(0);
    expect(result.allCaseDecisionsResolved).toBe(true);
    expect(result.eligibleForCuratedIntegration).toBe(false);
    expect(result.identityVerified).toBe(false);
    expect(result.countsAsVerifiedGold).toBe(false);
    expect(result.verifiedGoldDelta).toBe(0);
  });

  it("第三方可在 A/B 的不同有效意见中逐日裁决，但不能凭空生成两份审核都未支持的结论", async () => {
    const bundle = await createCalendarDivergenceReviewBundle({ generatedAt: BUNDLE_AT });
    const reviewA = await independentReview({
      bundle,
      reviewerId: "calendar-reviewer-a",
      identityCharacter: "a",
      divergenceVerdict: "support_hko_current_icu"
    });
    const reviewB = await independentReview({
      bundle,
      reviewerId: "calendar-reviewer-b",
      identityCharacter: "b",
      divergenceVerdict: "unresolved"
    });
    const resolvedByThirdParty = await preflightCalendarDivergenceAdjudication(
      await adjudication({ bundle, reviews: [reviewA, reviewB] }),
      { reviewBundle: bundle, independentReviews: [reviewA, reviewB], ...PREFLIGHT_CLOCK }
    );
    expect(resolvedByThirdParty.allCaseDecisionsResolved).toBe(true);
    expect(resolvedByThirdParty.eligibleForCuratedIntegration).toBe(false);
    expect(resolvedByThirdParty.verifiedGoldDelta).toBe(0);

    const bothUnresolvedA = await independentReview({
      bundle,
      reviewerId: "calendar-reviewer-a",
      identityCharacter: "a",
      divergenceVerdict: "unresolved"
    });
    const bothUnresolvedB = await independentReview({
      bundle,
      reviewerId: "calendar-reviewer-b",
      identityCharacter: "b",
      divergenceVerdict: "unresolved"
    });
    await expectAuditError(preflightCalendarDivergenceAdjudication(
      await adjudication({ bundle, reviews: [bothUnresolvedA, bothUnresolvedB] }),
      { reviewBundle: bundle, independentReviews: [bothUnresolvedA, bothUnresolvedB], ...PREFLIGHT_CLOCK }
    ), "DECISION_CONFLICT");
  });

  it("拒绝摘要篡改和把旧审核包的审核重放到新审核包", async () => {
    const oldBundle = await createCalendarDivergenceReviewBundle({ generatedAt: BUNDLE_AT });
    const newBundle = await createCalendarDivergenceReviewBundle({ generatedAt: "2026-08-02T01:30:00.000Z" });
    const review = await independentReview({ bundle: oldBundle, reviewerId: "calendar-reviewer-a", identityCharacter: "a" });
    const tampered = structuredClone(review);
    tampered.payload.rationale += "被修改";
    await expectAuditError(preflightCalendarDivergenceIndependentReview(tampered, {
      reviewBundle: oldBundle,
      ...PREFLIGHT_CLOCK
    }), "DIGEST_MISMATCH");
    await expectAuditError(preflightCalendarDivergenceIndependentReview(review, {
      reviewBundle: newBundle,
      ...PREFLIGHT_CLOCK
    }), "REVIEW_BUNDLE_MISMATCH");
  });

  it("拒绝重复 reviewerId、重复 identityRecordRef 以及与审核人相同的裁决身份", async () => {
    const bundle = await createCalendarDivergenceReviewBundle({ generatedAt: BUNDLE_AT });
    const reviewA = await independentReview({ bundle, reviewerId: "calendar-reviewer-a", identityCharacter: "a", divergenceVerdict: "support_hko_current_icu" });
    const sameIdentity = await independentReview({ bundle, reviewerId: "calendar-reviewer-b", identityCharacter: "a", divergenceVerdict: "support_hko_current_icu" });
    const duplicateIdentityAdjudication = await adjudication({ bundle, reviews: [reviewA, sameIdentity] });
    await expectAuditError(preflightCalendarDivergenceAdjudication(duplicateIdentityAdjudication, {
      reviewBundle: bundle,
      independentReviews: [reviewA, sameIdentity],
      ...PREFLIGHT_CLOCK
    }), "REVIEWER_NOT_INDEPENDENT");

    const reviewB = await independentReview({ bundle, reviewerId: "calendar-reviewer-b", identityCharacter: "b", divergenceVerdict: "support_hko_current_icu" });
    const sameAdjudicator = await adjudication({
      bundle,
      reviews: [reviewA, reviewB],
      adjudicatorId: "calendar-reviewer-a",
      adjudicatorIdentityCharacter: "c"
    });
    await expectAuditError(preflightCalendarDivergenceAdjudication(sameAdjudicator, {
      reviewBundle: bundle,
      independentReviews: [reviewA, reviewB],
      ...PREFLIGHT_CLOCK
    }), "REVIEWER_NOT_INDEPENDENT");
  });

  it("拒绝缺日和把 60 个分歧日批量伪装成控制日的 accept-all shortcut", async () => {
    const bundle = await createCalendarDivergenceReviewBundle({ generatedAt: BUNDLE_AT });
    const review = await independentReview({ bundle, reviewerId: "calendar-reviewer-a", identityCharacter: "a" });
    const missing = structuredClone(review) as unknown as { payload: { caseReviews: unknown[] }; digest: string };
    missing.payload.caseReviews.pop();
    missing.digest = await sha256Hex(missing.payload);
    await expectAuditError(preflightCalendarDivergenceIndependentReview(missing, {
      reviewBundle: bundle,
      ...PREFLIGHT_CLOCK
    }), "INVALID_FORMAT");

    const shortcut = structuredClone(review);
    for (const row of shortcut.payload.caseReviews) {
      if (row.role !== "divergence") continue;
      row.verdict = "confirm_control";
      row.effectiveObservation = caseContext(bundle, row.caseId).candidate.observations.hko;
    }
    shortcut.payload.declaredCounts = { total: 64, controls: 4, divergences: 60, resolved: 64, unresolved: 0 };
    shortcut.digest = await sha256Hex(shortcut.payload);
    await expectAuditError(preflightCalendarDivergenceIndependentReview(shortcut, {
      reviewBundle: bundle,
      ...PREFLIGHT_CLOCK
    }), "CONTROL_DIVERGENCE_CONFUSION");
  });

  it("拒绝把 .NET 分歧输出冒充正向权威来源", async () => {
    const bundle = await createCalendarDivergenceReviewBundle({ generatedAt: BUNDLE_AT });
    const review = await independentReview({ bundle, reviewerId: "calendar-reviewer-a", identityCharacter: "a" });
    const forged = structuredClone(review);
    const row = forged.payload.caseReviews.find((item) => item.role === "divergence")!;
    const { window } = caseContext(bundle, row.caseId);
    row.authoritySourceIds = ["dotnet-framework-4-8-chinese-lunisolar"];
    row.contradictorySourceIds = [window.hkoSourceId];
    forged.digest = await sha256Hex(forged.payload);
    await expectAuditError(preflightCalendarDivergenceIndependentReview(forged, {
      reviewBundle: bundle,
      ...PREFLIGHT_CLOCK
    }), "SOURCE_ROLE_INVALID");
  });

  it("拒绝超限、URL、访问器、循环引用和原型污染对象，不执行访问器", async () => {
    await expectAuditError(
      preflightCalendarDivergenceReviewBundle(" ".repeat(4 * 1024 * 1024 + 1)),
      "INPUT_TOO_LARGE"
    );
    await expectAuditError(
      preflightCalendarDivergenceReviewBundle("https://example.com/review.json"),
      "INVALID_JSON"
    );

    let getterCalls = 0;
    const getterInput = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(getterInput, "format", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "should-not-run";
      }
    });
    await expectAuditError(preflightCalendarDivergenceReviewBundle(getterInput), "NON_JSON_VALUE");
    expect(getterCalls).toBe(0);

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    await expectAuditError(preflightCalendarDivergenceReviewBundle(circular), "NON_JSON_VALUE");

    const polluted = JSON.parse('{"__proto__":{"polluted":true}}') as unknown;
    await expectAuditError(
      preflightCalendarDivergenceReviewBundle(polluted),
      "PROTOTYPE_POLLUTION_KEY"
    );
  });
});
