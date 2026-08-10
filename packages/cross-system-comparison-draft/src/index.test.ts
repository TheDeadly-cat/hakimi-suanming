import { describe, expect, it } from "vitest";
import {
  calculateCrossSystemComparisonSha256Draft,
  CROSS_SYSTEM_COMPARISON_DRAFT_VERSION,
  verifyCrossSystemReadonlyComparisonDraft,
  type CrossSystemComparisonPayload,
  type CrossSystemReadonlyComparisonDraft
} from "./index.ts";

async function validPayload(overrides: Partial<CrossSystemComparisonPayload> = {}): Promise<CrossSystemReadonlyComparisonDraft> {
  const payload: CrossSystemComparisonPayload = {
    schemaVersion: CROSS_SYSTEM_COMPARISON_DRAFT_VERSION,
    envelopeVersion: 1,
    createdAt: "2026-08-10T00:00:00.000Z",
    systems: [
      {
        systemId: "bazi",
        artifactKind: "bazi_revision_summary",
        label: "八字 R2 摘要",
        frozenFacts: [
          { field: "四柱", value: "乙亥 甲申 辛巳 壬辰", sourceRef: "bazi-revision:r2" }
        ],
        ruleIdentity: {
          profileId: "working-default",
          profileVersion: "0.1.0",
          profileDigest: "a".repeat(64)
        },
        sourceRefs: ["bazi:case:1"],
        boundary: {
          productionEligible: false,
          expertTruthClaimed: false,
          successReceiptIssued: false
        }
      },
      {
        systemId: "ziwei-doushu",
        artifactKind: "ziwei_revision_summary",
        label: "紫微 R1 摘要",
        frozenFacts: [
          { field: "命宫", value: "丑宫 天梁", sourceRef: "ziwei-revision:r1" }
        ],
        ruleIdentity: {
          profileId: "ziwei-draft-profile",
          profileVersion: "0.1.0"
        },
        sourceRefs: ["ziwei:study:1"],
        boundary: {
          productionEligible: false,
          expertTruthClaimed: false,
          successReceiptIssued: false
        }
      }
    ],
    factsFrozen: true,
    noScoring: true,
    noAutoPersonMerge: true,
    explicitSubjectLink: {
      label: "同一研究对象的显式人物关联",
      confirmedByUser: true,
      removable: true
    },
    ...overrides
  };
  return {
    ...payload,
    contentSha256: await calculateCrossSystemComparisonSha256Draft(payload)
  };
}

describe("cross-system readonly comparison draft", () => {
  it("接受八字与紫微两条冻结事实摘要的只读并列", async () => {
    const result = await verifyCrossSystemReadonlyComparisonDraft(await validPayload());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.systems.map((item) => item.systemId)).toEqual(["bazi", "ziwei-doushu"]);
      expect(result.value.noScoring).toBe(true);
      expect(result.value.noAutoPersonMerge).toBe(true);
    }
  });

  it("拒绝重复体系与未知体系", async () => {
    const duplicated = await validPayload({
      systems: [
        { ...(await validPayload()).systems[0]! },
        { ...(await validPayload()).systems[0]! }
      ]
    });
    const duplicateResult = await verifyCrossSystemReadonlyComparisonDraft(duplicated);
    expect(duplicateResult.ok).toBe(false);
    if (!duplicateResult.ok) expect(duplicateResult.reasons.join(" ")).toContain("duplicate systemId");

    const unknown = await validPayload({
      systems: [{
        systemId: "tarot" as never,
        artifactKind: "bazi_revision_summary" as never,
        label: "未知体系",
        frozenFacts: [{ field: "x", value: "y" }],
        ruleIdentity: { profileId: "p", profileVersion: "1" },
        sourceRefs: [],
        boundary: {
          productionEligible: false,
          expertTruthClaimed: false,
          successReceiptIssued: false
        }
      }]
    });
    const unknownResult = await verifyCrossSystemReadonlyComparisonDraft(unknown);
    expect(unknownResult.ok).toBe(false);
  });

  it("拒绝伪造评分、未确认人物关联与边界提权", async () => {
    const scored = await validPayload({ noScoring: false as true });
    expect((await verifyCrossSystemReadonlyComparisonDraft(scored)).ok).toBe(false);

    const unconfirmedLink = await validPayload({
      explicitSubjectLink: {
        label: "自动合并",
        confirmedByUser: false as true,
        removable: true
      }
    });
    expect((await verifyCrossSystemReadonlyComparisonDraft(unconfirmedLink)).ok).toBe(false);

    const elevated = await validPayload({
      systems: [
        {
          ...(await validPayload()).systems[0]!,
          boundary: {
            productionEligible: true as false,
            expertTruthClaimed: false,
            successReceiptIssued: false
          }
        }
      ]
    });
    expect((await verifyCrossSystemReadonlyComparisonDraft(elevated)).ok).toBe(false);
  });

  it("拒绝空事实、摘要失配与坏时间戳", async () => {
    const emptyFacts = await validPayload({
      systems: [
        {
          ...(await validPayload()).systems[0]!,
          frozenFacts: []
        }
      ]
    });
    expect((await verifyCrossSystemReadonlyComparisonDraft(emptyFacts)).ok).toBe(false);

    const badDigest = await validPayload({ createdAt: "2026-08-10T00:00:01.000Z" });
    expect((await verifyCrossSystemReadonlyComparisonDraft({
      ...badDigest,
      contentSha256: "f".repeat(64)
    })).ok).toBe(false);

    const badTime = await validPayload({ createdAt: "2026-08-10" });
    expect((await verifyCrossSystemReadonlyComparisonDraft(badTime)).ok).toBe(false);
  });
});
