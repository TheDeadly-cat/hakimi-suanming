import { digestRuleProfile } from "@hakimi/bazi-core";
import { sha256Hex } from "@hakimi/integrity";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { describe, expect, it } from "vitest";
import {
  GOLD_REVIEW_ATTESTATION_STATEMENT,
  createGoldDecisionEnvelope,
  createJieBoundaryReviewBundle,
  digestJieBoundaryCandidate,
  expandJieBoundaryCandidates,
  goldDecisionPayloadSchema,
  preflightGoldReviewBundle,
  preflightJieBoundaryDecision,
  serializeGoldDecisionEnvelope,
  serializeGoldReviewBundle,
  type GoldDecisionPayload
} from "./index";

async function validDecisionPayload(
  overrides: Partial<GoldDecisionPayload> = {}
): Promise<GoldDecisionPayload> {
  const candidate = expandJieBoundaryCandidates()[0];
  if (!candidate) throw new Error("测试候选缺失");
  return {
    recordVersion: "1.0.0",
    datasetId: "jie-boundary-2024-candidates",
    datasetFixtureVersion: "1.0.0",
    caseId: candidate.id,
    candidateDigest: await digestJieBoundaryCandidate(candidate),
    ruleProfileId: "ziping-working-default",
    ruleProfileDigest: await digestRuleProfile(WORKING_DEFAULT_RULE_PROFILE),
    decision: "accept_expected",
    expected: candidate.expected,
    authoritySources: [{
      sourceRef: "book://authority/2024/page-18",
      sourceType: "published_almanac",
      title: "权威历书测试版",
      edition: "2024",
      locator: "第 18 页，小寒",
      timeScale: "fixed_plus08",
      accessedAt: "2026-08-01T00:00:00.000Z",
      note: "测试来源，不代表真实签字。"
    }],
    attestations: [
      {
        role: "primary",
        reviewerId: "reviewer-a",
        displayName: "复核人 A",
        reviewedAt: "2026-08-01T01:00:00.000Z",
        statement: GOLD_REVIEW_ATTESTATION_STATEMENT
      },
      {
        role: "second",
        reviewerId: "reviewer-b",
        displayName: "复核人 B",
        reviewedAt: "2026-08-01T02:00:00.000Z",
        statement: GOLD_REVIEW_ATTESTATION_STATEMENT
      }
    ],
    decidedAt: "2026-08-01T03:00:00.000Z",
    rationale: "两人分别核对输入、时标和四柱。",
    supersedesDecisionDigest: null,
    ...overrides
  };
}

describe("金标准审核包", () => {
  it("为 36 个候选生成内容寻址且可重复预检的审核包", async () => {
    const generatedAt = "2026-08-01T00:00:00.000Z";
    const first = await createJieBoundaryReviewBundle({ generatedAt });
    const second = await createJieBoundaryReviewBundle({ generatedAt });

    expect(first).toEqual(second);
    expect(first.payload.candidates).toHaveLength(36);
    expect(new Set(first.payload.candidates.map((candidate) => candidate.candidateDigest)).size).toBe(36);
    expect(first.payload.dataset.requiredReleaseGoldCaseCount).toBe(360);
    expect((await preflightGoldReviewBundle(serializeGoldReviewBundle(first))).digest).toBe(first.digest);
  });

  it("拒绝任何摘要未同步更新的审核包篡改", async () => {
    const bundle = await createJieBoundaryReviewBundle({ generatedAt: "2026-08-01T00:00:00.000Z" });
    const tampered = structuredClone(bundle);
    tampered.payload.candidates[0]!.expected.year = "甲辰";

    await expect(preflightGoldReviewBundle(tampered)).rejects.toMatchObject({
      code: "DIGEST_MISMATCH"
    });
  });

  it("候选被修改并重签外层摘要时仍重算包内候选自身摘要", async () => {
    const bundle = await createJieBoundaryReviewBundle({ generatedAt: "2026-08-01T00:00:00.000Z" });
    const tampered = structuredClone(bundle);
    tampered.payload.candidates[0]!.expected.year = "甲辰";
    tampered.digest = await sha256Hex(tampered.payload);

    await expect(preflightGoldReviewBundle(tampered)).rejects.toMatchObject({
      code: "CANDIDATE_MISMATCH"
    });
  });
});

describe("双人金标准裁决", () => {
  it("接受绑定候选、规则摘要、权威来源和两个不同复核人的记录", async () => {
    const envelope = await createGoldDecisionEnvelope(await validDecisionPayload());
    const preflight = await preflightJieBoundaryDecision(serializeGoldDecisionEnvelope(envelope));

    expect(preflight.candidate.id).toBe(envelope.payload.caseId);
    expect(preflight.effectiveExpected).toEqual(envelope.payload.expected);
    expect(preflight.countsAsVerifiedGold).toBe(false);
    expect(preflight.notice).toMatch(/才可计入发布金标/);
  });

  it("拒绝同一人兼任双重复核、重复来源和早于复核的裁决时间", async () => {
    const duplicateReviewer = await validDecisionPayload();
    duplicateReviewer.attestations[1]!.reviewerId = duplicateReviewer.attestations[0]!.reviewerId;
    expect(goldDecisionPayloadSchema.safeParse(duplicateReviewer).success).toBe(false);

    const duplicateSource = await validDecisionPayload();
    duplicateSource.authoritySources.push({ ...duplicateSource.authoritySources[0]! });
    expect(goldDecisionPayloadSchema.safeParse(duplicateSource).success).toBe(false);

    const memoOnly = await validDecisionPayload();
    memoOnly.authoritySources[0]!.sourceType = "consultant_memo";
    expect(goldDecisionPayloadSchema.safeParse(memoOnly).success).toBe(false);

    expect(goldDecisionPayloadSchema.safeParse(await validDecisionPayload({
      decidedAt: "2026-08-01T01:30:00.000Z"
    })).success).toBe(false);
  });

  it("接受原值时不能偷改四柱，替换时也不能伪装成未修改", async () => {
    const acceptedButChanged = await validDecisionPayload({
      expected: { year: "甲辰", month: "丙寅", day: "戊戌", hour: "庚申" }
    });
    const acceptedEnvelope = await createGoldDecisionEnvelope(acceptedButChanged);
    await expect(preflightJieBoundaryDecision(acceptedEnvelope)).rejects.toMatchObject({
      code: "DECISION_CONFLICT"
    });

    const candidate = expandJieBoundaryCandidates()[0]!;
    const replaceEnvelope = await createGoldDecisionEnvelope(await validDecisionPayload({
      decision: "replace_expected",
      expected: candidate.expected
    }));
    await expect(preflightJieBoundaryDecision(replaceEnvelope)).rejects.toMatchObject({
      code: "DECISION_CONFLICT"
    });
  });

  it("拒绝候选的记录保留审计证据但不计入 verified", async () => {
    const envelope = await createGoldDecisionEnvelope(await validDecisionPayload({
      decision: "reject_candidate",
      expected: null,
      rationale: "权威时标与候选边界不一致，退回重建候选。"
    }));
    const preflight = await preflightJieBoundaryDecision(envelope);
    expect(preflight.countsAsVerifiedGold).toBe(false);
    expect(preflight.effectiveExpected).toBeNull();
  });

  it("绑定当前候选摘要，不能把旧裁决套到另一行", async () => {
    const payload = await validDecisionPayload();
    payload.candidateDigest = "0".repeat(64);
    const envelope = await createGoldDecisionEnvelope(payload);
    await expect(preflightJieBoundaryDecision(envelope)).rejects.toMatchObject({
      code: "CANDIDATE_MISMATCH"
    });
  });
});
