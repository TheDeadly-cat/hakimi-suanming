import { beforeAll, describe, expect, it } from "vitest";
import { sha256Hex } from "@hakimi/integrity";
import {
  CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR,
  TRANSIT_CORE_ENGINE,
} from "@hakimi/transit-core";
import {
  TRANSIT_QUERY_ADJUDICATION_FORMAT,
  TRANSIT_QUERY_ADJUDICATION_ATTESTATION_STATEMENT,
  TRANSIT_QUERY_AUDIT_RECORD_VERSION,
  TRANSIT_QUERY_REVIEW_ATTESTATION_STATEMENT,
  TRANSIT_QUERY_REVIEW_BUNDLE_FORMAT,
  TRANSIT_QUERY_REVIEW_CANDIDATE_COUNT,
  TransitQueryReviewAuditError,
  createTransitQueryReviewPreflightContext,
  createTransitQueryAdjudicationEnvelope,
  createTransitQueryIndependentReviewEnvelope,
  createTransitQueryReviewBundle,
  digestTransitQueryReviewSourceEvidence,
  digestTransitQueryReviewSourceLineage,
  inspectTransitQueryAuditArtifact,
  preflightTransitQueryAdjudication,
  preflightTransitQueryAdjudicationInContext,
  preflightTransitQueryIndependentReview,
  preflightTransitQueryIndependentReviewInContext,
  preflightTransitQueryReviewBundle,
  serializeTransitQueryAdjudicationEnvelope,
  serializeTransitQueryIndependentReviewEnvelope,
  serializeTransitQueryReviewBundle,
  summarizeTransitQueryReviewEvidence,
  verifyTransitQueryReviewCandidates,
  type TransitQueryAdjudicationEnvelope,
  type TransitQueryIndependentReviewEnvelope,
  type TransitQueryReviewBundleEnvelope,
  type TransitQueryReviewExpected,
  type TransitQueryReviewSourceEvidence,
} from "./transit-review";

const GENERATED_AT = "2026-08-02T00:01:00.000Z";

function cloneBundle(bundle: TransitQueryReviewBundleEnvelope): TransitQueryReviewBundleEnvelope {
  return structuredClone(bundle);
}

async function createSourceEvidence(
  prefix: string,
  sourceKind: "almanac" | "method",
  expected: TransitQueryReviewExpected,
): Promise<TransitQueryReviewSourceEvidence> {
  const sourceId = `${prefix}-${sourceKind}`;
  const withoutLineage = {
    sourceId,
    lineageId: sourceId,
    role: "authority" as const,
    sourceType: sourceKind === "almanac" ? "published_almanac" as const : "classical_text" as const,
    title: `${prefix} ${sourceKind} 冻结材料`,
    publisherOrCustodian: `${prefix} evidence custodian`,
    editionOrVersion: "test-fixture-v1",
    locator: `section:${sourceKind}`,
    sourceRef: `https://evidence.example/${prefix}/${sourceKind}`,
    accessedAt: "2026-08-02T00:02:00.000Z",
    artifactSha256: await sha256Hex(`artifact:${prefix}:${sourceKind}`),
    observedExpected: expected,
    note: "测试专用的声明式来源快照，不代表真实命理证据。",
  };
  return {
    ...withoutLineage,
    lineageDigest: await digestTransitQueryReviewSourceLineage(withoutLineage),
  };
}

async function createIndependentReview(
  bundle: TransitQueryReviewBundleEnvelope,
  reviewerId: string,
  reviewedAt: string,
  createdAt: string,
  verdict: "accept" | "replace" | "reject" = "accept",
  proposedExpected: TransitQueryReviewExpected | null = bundle.payload.candidates[0]!.proposedExpected,
): Promise<TransitQueryIndependentReviewEnvelope> {
  const candidate = bundle.payload.candidates[0]!;
  const expectedForSources = proposedExpected ?? candidate.proposedExpected;
  const sourceEvidence = await Promise.all([
    createSourceEvidence(reviewerId, "almanac", expectedForSources),
    createSourceEvidence(reviewerId, "method", expectedForSources),
  ]);
  return createTransitQueryIndependentReviewEnvelope({
    recordVersion: TRANSIT_QUERY_AUDIT_RECORD_VERSION,
    datasetId: bundle.payload.dataset.datasetId,
    datasetFixtureVersion: bundle.payload.dataset.fixtureVersion,
    fixtureDigest: bundle.payload.dataset.fixtureDigest,
    datasetDigest: bundle.payload.dataset.datasetDigest,
    reviewBundleDigest: bundle.digest,
    candidateId: candidate.id,
    candidateDigest: candidate.candidateDigest,
    revisionId: candidate.revisionId,
    revisionResultHash: candidate.chartContext.revisionResultHash,
    snapshotDigest: candidate.snapshotDigest,
    queryDigest: candidate.queryDigest,
    dataEpoch: candidate.dataEpoch,
    resultDigest: candidate.executionEvidence.resultDigest,
    ruleProfileDigest: candidate.chartContext.ruleProfileDigest,
    luckCycleRuleDigest: candidate.chartContext.luckCycleRuleDigest,
    transitTimelineVersion: bundle.payload.bindings.transitTimelineVersion,
    transitAlgorithmId: bundle.payload.bindings.transitAlgorithmId,
    reviewer: {
      reviewerId,
      displayName: reviewerId,
      specialty: "测试用八字运限审核身份",
      identityRecordRef: `sha256:${await sha256Hex(`identity:${reviewerId}`)}`,
      identityVerificationMode: "offline_maintainer_required",
      statement: TRANSIT_QUERY_REVIEW_ATTESTATION_STATEMENT,
    },
    verdict,
    proposedExpected,
    sourceEvidence,
    reviewedAt,
    createdAt,
    rationale: "测试结构绑定、独立性与失败关闭；该理由不构成命理判断。",
  });
}

async function createAdjudication(
  bundle: TransitQueryReviewBundleEnvelope,
  reviews: readonly [TransitQueryIndependentReviewEnvelope, TransitQueryIndependentReviewEnvelope],
): Promise<TransitQueryAdjudicationEnvelope> {
  const candidate = bundle.payload.candidates[0]!;
  const authoritySourceRefs = (await Promise.all(reviews.flatMap((review) => review.payload.sourceEvidence.map(async (source) => ({
    reviewDigest: review.digest,
    sourceId: source.sourceId,
    lineageId: source.lineageId,
    lineageDigest: source.lineageDigest,
    sourceEvidenceDigest: await digestTransitQueryReviewSourceEvidence(source),
  })))));
  return createTransitQueryAdjudicationEnvelope({
    recordVersion: TRANSIT_QUERY_AUDIT_RECORD_VERSION,
    datasetId: bundle.payload.dataset.datasetId,
    datasetFixtureVersion: bundle.payload.dataset.fixtureVersion,
    fixtureDigest: bundle.payload.dataset.fixtureDigest,
    datasetDigest: bundle.payload.dataset.datasetDigest,
    reviewBundleDigest: bundle.digest,
    candidateId: candidate.id,
    candidateDigest: candidate.candidateDigest,
    revisionId: candidate.revisionId,
    revisionResultHash: candidate.chartContext.revisionResultHash,
    snapshotDigest: candidate.snapshotDigest,
    queryDigest: candidate.queryDigest,
    dataEpoch: candidate.dataEpoch,
    resultDigest: candidate.executionEvidence.resultDigest,
    ruleProfileDigest: candidate.chartContext.ruleProfileDigest,
    luckCycleRuleDigest: candidate.chartContext.luckCycleRuleDigest,
    transitTimelineVersion: bundle.payload.bindings.transitTimelineVersion,
    transitAlgorithmId: bundle.payload.bindings.transitAlgorithmId,
    independentReviewDigests: [reviews[0].digest, reviews[1].digest],
    decision: "accept_expected",
    effectiveExpected: candidate.proposedExpected,
    authoritySourceRefs,
    adjudicator: {
      adjudicatorId: "maintainer-adjudicator",
      displayName: "测试裁决维护者",
      role: "测试用维护者",
      identityRecordRef: `sha256:${await sha256Hex("identity:maintainer-adjudicator")}`,
      identityVerificationMode: "offline_maintainer_required",
      statement: TRANSIT_QUERY_ADJUDICATION_ATTESTATION_STATEMENT,
    },
    decidedAt: "2026-08-02T00:07:00.000Z",
    createdAt: "2026-08-02T00:08:00.000Z",
    rationale: "两份结构化测试审核均支持原候选，但仍须线下核验身份与来源。",
    supersedesDecisionDigest: null,
  });
}

async function expectAuditCode(promise: Promise<unknown>, code: TransitQueryReviewAuditError["code"]): Promise<void> {
  await expect(promise).rejects.toMatchObject({ name: "TransitQueryReviewAuditError", code });
}

describe("P1-04 运限查询专家审核包", () => {
  let bundle: TransitQueryReviewBundleEnvelope;
  let reviewA: TransitQueryIndependentReviewEnvelope;
  let reviewB: TransitQueryIndependentReviewEnvelope;
  let adjudication: TransitQueryAdjudicationEnvelope;

  beforeAll(async () => {
    bundle = await createTransitQueryReviewBundle({ generatedAt: GENERATED_AT });
    reviewA = await createIndependentReview(
      bundle,
      "transit-reviewer-a",
      "2026-08-02T00:03:00.000Z",
      "2026-08-02T00:04:00.000Z",
    );
    reviewB = await createIndependentReview(
      bundle,
      "transit-reviewer-b",
      "2026-08-02T00:05:00.000Z",
      "2026-08-02T00:06:00.000Z",
    );
    adjudication = await createAdjudication(bundle, [reviewA, reviewB]);
  }, 30_000);

  it("固定时间生成确定性的 18 条六轨 candidate-only 审核包", async () => {
    const repeated = await createTransitQueryReviewBundle({ generatedAt: GENERATED_AT });
    expect(repeated).toEqual(bundle);
    expect(bundle.format).toBe(TRANSIT_QUERY_REVIEW_BUNDLE_FORMAT);
    expect(bundle.payload.candidates).toHaveLength(TRANSIT_QUERY_REVIEW_CANDIDATE_COUNT);
    expect(new Set(bundle.payload.candidates.map((candidate) => candidate.id)).size).toBe(18);
    expect(new Set(bundle.payload.candidates.map((candidate) => candidate.nodeType))).toEqual(
      new Set(["dayun", "xiaoyun", "year", "month", "day", "hour"]),
    );
    expect(new Set(bundle.payload.candidates.map((candidate) => candidate.proposedExpected.status))).toEqual(
      new Set(["resolved", "not_applicable", "unsupported"]),
    );
    expect(bundle.payload.dataset).toMatchObject({
      lifecycleVersion: "candidate-only-v1",
      verifiedCandidateCount: 0,
      requiredVerifiedCandidateCount: 18,
    });
    expect(bundle.payload.reviewPolicy).toMatchObject({
      requiredIndependentReviewCount: 2,
      requiredIndependentSourceLineageCount: 2,
      verifiedCountingEnabled: false,
    });
    expect(bundle.payload.bindings.transitEngine.upstreamIntegrity).toBe(TRANSIT_CORE_ENGINE.upstreamIntegrity);
    expect(bundle.payload.bindings.transitSnapshotExecutor).toEqual(
      CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR,
    );
    expect(bundle.payload.candidates.every((candidate) => candidate.input.sourceNote === "")).toBe(true);
    expect(new TextEncoder().encode(serializeTransitQueryReviewBundle(bundle)).byteLength).toBeLessThan(2 * 1024 * 1024);
    for (const candidate of bundle.payload.candidates) {
      expect(candidate.snapshotDigest).toBe(await sha256Hex({
        cases: [candidate.subjectSnapshot.caseRecord],
        revisions: [candidate.subjectSnapshot.revision],
        candidateSets: [],
        researchNotes: [],
        events: [],
        knowledgeDocuments: [],
      }));
    }
  }, 30_000);

  it("序列化后可严格预检并重新绑定当前 fixture、数据集和每条候选", async () => {
    const verified = await preflightTransitQueryReviewBundle(serializeTransitQueryReviewBundle(bundle), {
      now: "2026-08-02T00:02:00.000Z",
    });
    expect(verified).toEqual(bundle);
  }, 30_000);

  it("完整、精确绑定 TransitSnapshot 执行器并拒绝重签后的上游或嵌套来源漂移", async () => {
    const forgedIntegrity = cloneBundle(bundle) as unknown as {
      payload: {
        bindings: {
          transitEngine: { upstreamIntegrity: string };
          transitSnapshotExecutor: { engine: { upstreamIntegrity: string } };
        };
      };
      digest: string;
    };
    forgedIntegrity.payload.bindings.transitEngine.upstreamIntegrity = "sha512-forged";
    forgedIntegrity.payload.bindings.transitSnapshotExecutor.engine.upstreamIntegrity = "sha512-forged";
    forgedIntegrity.digest = await sha256Hex(forgedIntegrity.payload);
    await expectAuditCode(preflightTransitQueryReviewBundle(forgedIntegrity), "INVALID_FORMAT");

    const injectedSourceRef = cloneBundle(bundle) as unknown as {
      payload: {
        bindings: {
          transitSnapshotExecutor: { engine: Record<string, unknown> };
        };
      };
      digest: string;
    };
    injectedSourceRef.payload.bindings.transitSnapshotExecutor.engine.sourceRef = "unmodeled-source";
    injectedSourceRef.digest = await sha256Hex(injectedSourceRef.payload);
    await expectAuditCode(preflightTransitQueryReviewBundle(injectedSourceRef), "INVALID_FORMAT");

    const forgedResolver = cloneBundle(bundle) as unknown as {
      payload: {
        bindings: {
          transitSnapshotExecutor: { timeZoneDatabase: { resolver: { name: string } } };
        };
      };
      digest: string;
    };
    forgedResolver.payload.bindings.transitSnapshotExecutor.timeZoneDatabase.resolver.name = "host-tzdb";
    forgedResolver.digest = await sha256Hex(forgedResolver.payload);
    await expectAuditCode(preflightTransitQueryReviewBundle(forgedResolver), "INVALID_FORMAT");
  });

  it("拒绝未重签篡改和完整重签后的自洽候选替换", async () => {
    const unsignedTamper = cloneBundle(bundle);
    unsignedTamper.payload.candidates[0]!.title = "被篡改但未重签";
    await expectAuditCode(
      preflightTransitQueryReviewBundle(unsignedTamper, { now: "2026-08-02T00:02:00.000Z" }),
      "DIGEST_MISMATCH",
    );

    const resignedTamper = cloneBundle(bundle);
    const candidate = resignedTamper.payload.candidates[0]!;
    candidate.title = "攻击者完整重签的错误候选";
    const { candidateDigest: _oldCandidateDigest, ...candidateWithoutDigest } = candidate;
    candidate.candidateDigest = await sha256Hex(candidateWithoutDigest);
    resignedTamper.payload.dataset.datasetDigest = await sha256Hex({
      fixtureDigest: resignedTamper.payload.dataset.fixtureDigest,
      candidates: resignedTamper.payload.candidates,
    });
    resignedTamper.digest = await sha256Hex(resignedTamper.payload);
    await expectAuditCode(
      preflightTransitQueryReviewBundle(resignedTamper, { now: "2026-08-02T00:02:00.000Z" }),
      "DATASET_MISMATCH",
    );
  }, 30_000);

  it("在 Zod 和摘要前拒绝 URL、getter、自定义原型、循环及稀疏数组", async () => {
    await expectAuditCode(preflightTransitQueryReviewBundle("https://example.com/review.json"), "INVALID_JSON");

    const getterInput = cloneBundle(bundle) as unknown as Record<string, unknown>;
    let invoked = false;
    Object.defineProperty(getterInput, "trap", {
      enumerable: true,
      get() {
        invoked = true;
        return "never";
      },
    });
    await expectAuditCode(preflightTransitQueryReviewBundle(getterInput), "NON_JSON_VALUE");
    expect(invoked).toBe(false);

    const customPrototype = Object.create({ inherited: true }) as Record<string, unknown>;
    customPrototype.format = TRANSIT_QUERY_REVIEW_BUNDLE_FORMAT;
    await expectAuditCode(preflightTransitQueryReviewBundle(customPrototype), "PROTOTYPE_POLLUTION_KEY");

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    await expectAuditCode(preflightTransitQueryReviewBundle(circular), "NON_JSON_VALUE");

    const sparse = cloneBundle(bundle) as unknown as { payload: { candidates: unknown[] } };
    sparse.payload.candidates = new Array(18);
    await expectAuditCode(preflightTransitQueryReviewBundle(sparse), "NON_JSON_VALUE");
  });

  it("拒绝未来审核包和任何伪造 verified 计数", async () => {
    await expectAuditCode(
      preflightTransitQueryReviewBundle(bundle, { now: "2026-08-01T00:00:00.000Z", allowedClockSkewMs: 0 }),
      "TIME_INVALID",
    );

    const fakeVerified = cloneBundle(bundle) as unknown as {
      payload: { dataset: { verifiedCandidateCount: number }; reviewPolicy: { verifiedCountingEnabled: boolean } };
      digest: string;
    };
    fakeVerified.payload.dataset.verifiedCandidateCount = 18;
    fakeVerified.payload.reviewPolicy.verifiedCountingEnabled = true;
    fakeVerified.digest = await sha256Hex(fakeVerified.payload);
    await expectAuditCode(preflightTransitQueryReviewBundle(fakeVerified), "INVALID_FORMAT");
  });

  it("只按真实 format 内容识别三类工件并返回精确依赖摘要", async () => {
    const [bundleInspection, reviewInspection, adjudicationInspection] = await Promise.all([
      inspectTransitQueryAuditArtifact(serializeTransitQueryReviewBundle(bundle)),
      inspectTransitQueryAuditArtifact(serializeTransitQueryIndependentReviewEnvelope(reviewA)),
      inspectTransitQueryAuditArtifact(serializeTransitQueryAdjudicationEnvelope(adjudication)),
    ]);

    expect(bundleInspection).toEqual({
      kind: "review_bundle",
      artifactDigest: bundle.digest,
      reviewBundleDigest: bundle.digest,
      candidateId: null,
      candidateDigest: null,
      requiredArtifactDigests: [],
      envelope: bundle,
    });
    expect(reviewInspection).toEqual({
      kind: "independent_review",
      artifactDigest: reviewA.digest,
      reviewBundleDigest: bundle.digest,
      candidateId: reviewA.payload.candidateId,
      candidateDigest: reviewA.payload.candidateDigest,
      requiredArtifactDigests: [bundle.digest],
      envelope: reviewA,
    });
    expect(adjudicationInspection).toEqual({
      kind: "adjudication",
      artifactDigest: adjudication.digest,
      reviewBundleDigest: bundle.digest,
      candidateId: adjudication.payload.candidateId,
      candidateDigest: adjudication.payload.candidateDigest,
      requiredArtifactDigests: [bundle.digest, ...adjudication.payload.independentReviewDigests],
      envelope: adjudication,
    });
  });

  it("内容识别拒绝未知 format 与已篡改的 envelope payload 摘要", async () => {
    await expectAuditCode(
      inspectTransitQueryAuditArtifact(JSON.stringify({
        format: "hakimi-unrelated-review-artifact",
        formatVersion: "1.0.0",
        payload: {},
        digest: "0".repeat(64),
      })),
      "ARTIFACT_FORMAT_UNSUPPORTED",
    );

    const tamperedReview = structuredClone(reviewA);
    tamperedReview.payload.rationale = "摘要未随正文更新的篡改审核。";
    await expectAuditCode(inspectTransitQueryAuditArtifact(tamperedReview), "DIGEST_MISMATCH");
  });

  it("旧预检 API 与同一临时 context 的 InContext 结果保持等价", async () => {
    const now = "2026-08-02T00:10:00.000Z";
    const context = await createTransitQueryReviewPreflightContext(bundle, { now });
    const [legacyReview, contextualReview] = await Promise.all([
      preflightTransitQueryIndependentReview(reviewA, { reviewBundle: bundle, now }),
      preflightTransitQueryIndependentReviewInContext(reviewA, context),
    ]);
    expect(context).toMatchObject({ reviewBundleDigest: bundle.digest, candidateCount: 18 });
    expect(contextualReview).toEqual(legacyReview);

    const [legacyAdjudication, contextualAdjudication] = await Promise.all([
      preflightTransitQueryAdjudication(adjudication, {
        reviewBundle: bundle,
        independentReviews: [reviewA, reviewB],
        now,
      }),
      preflightTransitQueryAdjudicationInContext(adjudication, context, [reviewA, reviewB]),
    ]);
    expect(contextualAdjudication).toEqual(legacyAdjudication);
  }, 30_000);

  it("同一临时 context 可批量预检审核与裁决，但序列化副本不能冒充上下文", async () => {
    const context = await createTransitQueryReviewPreflightContext(bundle, {
      now: "2026-08-02T00:10:00.000Z",
    });
    const [resultA, resultB] = await Promise.all([
      preflightTransitQueryIndependentReviewInContext(reviewA, context),
      preflightTransitQueryIndependentReviewInContext(reviewB, context),
    ]);
    const decision = await preflightTransitQueryAdjudicationInContext(
      adjudication,
      context,
      [reviewA, reviewB],
    );
    expect([resultA, resultB]).toEqual(expect.arrayContaining([
      expect.objectContaining({
        integrityAndBindingPassed: true,
        identityVerified: false,
        sourceAuthenticityVerified: false,
        eligibleForAdjudication: false,
        countsAsVerifiedGold: false,
      }),
    ]));
    expect(decision).toMatchObject({
      integrityAndBindingPassed: true,
      identityVerified: false,
      sourceAuthenticityVerified: false,
      structurallyReadyForMaintainerAudit: true,
      eligibleForFixtureIntegration: false,
      countsAsVerifiedGold: false,
    });

    const persistedLookalike = JSON.parse(JSON.stringify(context)) as Parameters<
      typeof preflightTransitQueryIndependentReviewInContext
    >[1];
    await expectAuditCode(
      preflightTransitQueryIndependentReviewInContext(reviewA, persistedLookalike),
      "PREFLIGHT_CONTEXT_INVALID",
    );
  }, 30_000);

  it("分别预检独立审核与最终裁决，但固定不验证现实身份、不写 fixture、不增加金标", async () => {
    const reviewResult = await preflightTransitQueryIndependentReview(
      serializeTransitQueryIndependentReviewEnvelope(reviewA),
      { reviewBundle: serializeTransitQueryReviewBundle(bundle), now: "2026-08-02T00:10:00.000Z" },
    );
    expect(reviewResult).toMatchObject({
      integrityAndBindingPassed: true,
      identityVerified: false,
      sourceAuthenticityVerified: false,
      eligibleForAdjudication: false,
      countsAsVerifiedGold: false,
    });

    const decisionResult = await preflightTransitQueryAdjudication(
      serializeTransitQueryAdjudicationEnvelope(adjudication),
      {
        reviewBundle: bundle,
        independentReviews: [reviewA, reviewB],
        now: "2026-08-02T00:10:00.000Z",
      },
    );
    expect(decisionResult.envelope.format).toBe(TRANSIT_QUERY_ADJUDICATION_FORMAT);
    expect(decisionResult).toMatchObject({
      integrityAndBindingPassed: true,
      identityVerified: false,
      sourceAuthenticityVerified: false,
      structurallyReadyForMaintainerAudit: true,
      eligibleForFixtureIntegration: false,
      countsAsVerifiedGold: false,
    });
    expect(decisionResult.notice).toContain("专家金标准仍为 0");
  }, 30_000);

  it("拒绝跨审核包、跨候选重放以及两份审核共用同一离线身份", async () => {
    const anotherBundle = await createTransitQueryReviewBundle({ generatedAt: "2026-08-02T00:01:30.000Z" });
    await expectAuditCode(
      preflightTransitQueryIndependentReview(reviewA, {
        reviewBundle: anotherBundle,
        now: "2026-08-02T00:10:00.000Z",
      }),
      "REVIEW_BUNDLE_MISMATCH",
    );

    const otherCandidate = bundle.payload.candidates[1]!;
    const candidateReplay = await createTransitQueryIndependentReviewEnvelope({
      ...reviewA.payload,
      candidateId: otherCandidate.id,
      candidateDigest: otherCandidate.candidateDigest,
    });
    await expectAuditCode(
      preflightTransitQueryIndependentReview(candidateReplay, {
        reviewBundle: bundle,
        now: "2026-08-02T00:10:00.000Z",
      }),
      "CANDIDATE_MISMATCH",
    );

    const sameIdentityReview = await createTransitQueryIndependentReviewEnvelope({
      ...reviewB.payload,
      reviewer: {
        ...reviewB.payload.reviewer,
        identityRecordRef: reviewA.payload.reviewer.identityRecordRef,
      },
    });
    const sameIdentityDecision = await createAdjudication(bundle, [reviewA, sameIdentityReview]);
    await expectAuditCode(
      preflightTransitQueryAdjudication(sameIdentityDecision, {
        reviewBundle: bundle,
        independentReviews: [reviewA, sameIdentityReview],
        now: "2026-08-02T00:10:00.000Z",
      }),
      "REVIEWER_NOT_INDEPENDENT",
    );
  }, 30_000);

  it("从冻结材料重算谱系，并拒绝同一材料摘要换名伪装成独立来源", async () => {
    const spoofedSources = structuredClone(reviewB.payload.sourceEvidence);
    spoofedSources[0]!.artifactSha256 = reviewA.payload.sourceEvidence[0]!.artifactSha256;
    spoofedSources[0]!.lineageDigest = await digestTransitQueryReviewSourceLineage(spoofedSources[0]!);
    const spoofedReview = await createTransitQueryIndependentReviewEnvelope({
      ...reviewB.payload,
      sourceEvidence: spoofedSources,
    });
    const spoofedDecision = await createAdjudication(bundle, [reviewA, spoofedReview]);
    await expectAuditCode(
      preflightTransitQueryAdjudication(spoofedDecision, {
        reviewBundle: bundle,
        independentReviews: [reviewA, spoofedReview],
        now: "2026-08-02T00:10:00.000Z",
      }),
      "SOURCE_INDEPENDENCE_INVALID",
    );
  }, 30_000);

  it("拒绝审核早于候选包、裁决第三种未审核结果与未经账本验证的替代链", async () => {
    const earlySources = structuredClone(reviewA.payload.sourceEvidence).map((source) => ({
      ...source,
      accessedAt: "2026-08-01T23:58:00.000Z",
    }));
    const earlyReview = await createTransitQueryIndependentReviewEnvelope({
      ...reviewA.payload,
      sourceEvidence: earlySources,
      reviewedAt: "2026-08-01T23:59:00.000Z",
      createdAt: "2026-08-01T23:59:30.000Z",
    });
    await expectAuditCode(
      preflightTransitQueryIndependentReview(earlyReview, {
        reviewBundle: bundle,
        now: "2026-08-02T00:10:00.000Z",
      }),
      "TIME_INVALID",
    );

    const candidateExpected = bundle.payload.candidates[0]!.proposedExpected;
    if (candidateExpected.status !== "resolved") throw new Error("first review candidate must be resolved");
    const unreviewedReplacement: TransitQueryReviewExpected = {
      ...candidateExpected,
      ganZhi: candidateExpected.ganZhi === "甲子" ? "乙丑" : "甲子",
    };
    const thirdResultDecision = await createTransitQueryAdjudicationEnvelope({
      ...adjudication.payload,
      decision: "replace_expected",
      effectiveExpected: unreviewedReplacement,
    });
    await expectAuditCode(
      preflightTransitQueryAdjudication(thirdResultDecision, {
        reviewBundle: bundle,
        independentReviews: [reviewA, reviewB],
        now: "2026-08-02T00:10:00.000Z",
      }),
      "DECISION_CONFLICT",
    );

    const unverifiedSupersession = await createTransitQueryAdjudicationEnvelope({
      ...adjudication.payload,
      supersedesDecisionDigest: "0".repeat(64),
    });
    await expectAuditCode(
      preflightTransitQueryAdjudication(unverifiedSupersession, {
        reviewBundle: bundle,
        independentReviews: [reviewA, reviewB],
        now: "2026-08-02T00:10:00.000Z",
      }),
      "SUPERSESSION_UNVERIFIED",
    );
  }, 30_000);

  it("拒绝 null 原型、共享引用与嵌套未知字段，完整重摘要也不能升级身份可信度", async () => {
    const nullPrototype = Object.create(null) as Record<string, unknown>;
    nullPrototype.format = TRANSIT_QUERY_REVIEW_BUNDLE_FORMAT;
    await expectAuditCode(preflightTransitQueryReviewBundle(nullPrototype), "PROTOTYPE_POLLUTION_KEY");

    const shared: Record<string, unknown> = { marker: "shared" };
    await expectAuditCode(preflightTransitQueryReviewBundle({ left: shared, right: shared }), "NON_JSON_VALUE");

    const unknownNested = cloneBundle(bundle) as unknown as {
      payload: { candidates: Array<{ input: Record<string, unknown> }> };
    };
    unknownNested.payload.candidates[0]!.input.unexpected = "must-not-be-stripped";
    await expectAuditCode(preflightTransitQueryReviewBundle(unknownNested), "INVALID_FORMAT");

    const resignedOpinion = await createTransitQueryIndependentReviewEnvelope({
      ...reviewA.payload,
      rationale: "内容已经重新摘要，但没有可信公钥签名或现实身份核验。",
    });
    const result = await preflightTransitQueryIndependentReview(resignedOpinion, {
      reviewBundle: bundle,
      now: "2026-08-02T00:10:00.000Z",
    });
    expect(result).toMatchObject({
      identityVerified: false,
      sourceAuthenticityVerified: false,
      eligibleForAdjudication: false,
      countsAsVerifiedGold: false,
    });
  }, 30_000);

  it("工程自检全部通过但仍分别报告运限事实与查询裁决金标为 0", async () => {
    const report = await verifyTransitQueryReviewCandidates();
    expect(report).toMatchObject({
      total: 18,
      passed: 18,
      mismatches: [],
      verifiedTransitFacts: 0,
      verifiedQueryAdjudications: 0,
      releaseGatePassed: false,
      verifiedCountingEnabled: false,
    });
    expect(summarizeTransitQueryReviewEvidence()).toMatchObject({
      engineeringCandidates: 18,
      verifiedTransitFacts: 0,
      verifiedQueryAdjudications: 0,
    });
  }, 30_000);
});
