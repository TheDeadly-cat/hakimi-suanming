import { describe, expect, it } from "vitest";
import mutableBundledEngineeringFactRegistry from "./generated-engineering-fact-receipts.v1.json" with { type: "json" };
import {
  calculateCrossSystemComparisonSha256Draft,
  CROSS_SYSTEM_COMPARISON_DRAFT_VERSION,
  createCrossSystemFactReceiptRegistryReferenceDraft,
  createRegisteredCrossSystemSummaryDraft,
  verifyCrossSystemReadonlyComparisonDraft,
  type CrossSystemComparisonPayload,
  type CrossSystemReadonlyComparisonDraft
} from "./index.ts";

async function validPayload(overrides: Partial<CrossSystemComparisonPayload> = {}): Promise<CrossSystemReadonlyComparisonDraft> {
  const payload: CrossSystemComparisonPayload = {
    schemaVersion: CROSS_SYSTEM_COMPARISON_DRAFT_VERSION,
    envelopeVersion: 3,
    createdAt: "2026-08-10T00:00:00.000Z",
    systems: [
      createRegisteredCrossSystemSummaryDraft("ziwei-doushu", "紫微工程重放摘要"),
      createRegisteredCrossSystemSummaryDraft("western-astrology", "西洋工程重放摘要")
    ],
    factsFrozen: true,
    factEvidenceState: "registry_bound_offline_engineering_replay_not_domain_truth",
    factReceiptRegistry: createCrossSystemFactReceiptRegistryReferenceDraft(),
    noScoring: true,
    noWeighting: true,
    noMajorityVote: true,
    noModelArbitration: true,
    noAutoPersonMerge: true,
    noConceptEquivalenceInference: true,
    explicitSubjectLink: {
      label: "同一研究对象的显式人物关联",
      confirmedByUser: true,
      removable: true
    },
    observations: {
      convergences: [],
      divergences: [],
      inputSemanticConflicts: [],
      schoolConflicts: [],
      evidenceQualityDifferences: [],
      nonComparableConcepts: [
        {
          observationId: "noncomparable.wealth-concepts",
          title: "财帛宫与第二宫不得自动等价",
          systemIds: ["ziwei-doushu", "western-astrology"],
          basisRefs: [
            { systemId: "ziwei-doushu", basisType: "declared_concept", reference: "ziwei.wealth_palace" },
            { systemId: "western-astrology", basisType: "declared_concept", reference: "western.house_2" }
          ],
          note: "只登记不可自动比较边界，不建立两个概念的同义关系。",
          entryMode: "manual_explicit_entry_unverified",
          assessmentState: "unreviewed_observation",
          conceptEquivalenceClaimed: false,
          expertTruthClaimed: false,
          modelArbitrationUsed: false
        }
      ],
      unresolvedQuestions: [
        {
          observationId: "unresolved.input-boundary-alignment",
          title: "输入时间边界是否可比较仍未解决",
          systemIds: ["ziwei-doushu", "western-astrology"],
          basisRefs: [
            {
              systemId: "ziwei-doushu",
              basisType: "engineering_receipt",
              reference: "cross-system.engineering-replay/ziwei.synthetic-e1"
            },
            {
              systemId: "western-astrology",
              basisType: "engineering_receipt",
              reference: "cross-system.engineering-replay/western.synthetic-e1"
            }
          ],
          note: "需分别取得输入语义、来源和专家审定后再决定是否存在可比口径。",
          entryMode: "manual_explicit_entry_unverified",
          assessmentState: "unreviewed_observation",
          conceptEquivalenceClaimed: false,
          expertTruthClaimed: false,
          modelArbitrationUsed: false
        }
      ]
    },
    ...overrides
  };
  return {
    ...payload,
    contentSha256: await calculateCrossSystemComparisonSha256Draft(payload)
  };
}

async function resign(candidate: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { contentSha256: _oldDigest, ...payload } = candidate;
  return {
    ...payload,
    contentSha256: await calculateCrossSystemComparisonSha256Draft(
      payload as unknown as CrossSystemComparisonPayload
    )
  };
}

describe("cross-system readonly comparison draft", () => {
  it("只接受紫微与西洋注册表绑定的离线工程重放事实", async () => {
    const result = await verifyCrossSystemReadonlyComparisonDraft(await validPayload());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.systems.map((item) => item.systemId)).toEqual(["ziwei-doushu", "western-astrology"]);
      expect(result.value.noScoring).toBe(true);
      expect(result.value.noWeighting).toBe(true);
      expect(result.value.noMajorityVote).toBe(true);
      expect(result.value.noModelArbitration).toBe(true);
      expect(result.value.noAutoPersonMerge).toBe(true);
      expect(result.value.noConceptEquivalenceInference).toBe(true);
      expect(result.value.observations.nonComparableConcepts).toHaveLength(1);
      expect(result.value.observations.unresolvedQuestions).toHaveLength(1);
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

    const unknown = structuredClone(await validPayload()) as unknown as Record<string, unknown>;
    (unknown.systems as Array<Record<string, unknown>>)[0]!.systemId = "tarot";
    const unknownResult = await verifyCrossSystemReadonlyComparisonDraft(await resign(unknown));
    expect(unknownResult.ok).toBe(false);
  });

  it("拒绝评分、加权、投票、模型仲裁、概念等价推断、未确认人物关联与边界提权", async () => {
    const scored = await validPayload({ noScoring: false as true });
    expect((await verifyCrossSystemReadonlyComparisonDraft(scored)).ok).toBe(false);
    expect((await verifyCrossSystemReadonlyComparisonDraft(
      await validPayload({ noWeighting: false as true })
    )).ok).toBe(false);
    expect((await verifyCrossSystemReadonlyComparisonDraft(
      await validPayload({ noMajorityVote: false as true })
    )).ok).toBe(false);
    expect((await verifyCrossSystemReadonlyComparisonDraft(
      await validPayload({ noModelArbitration: false as true })
    )).ok).toBe(false);
    expect((await verifyCrossSystemReadonlyComparisonDraft(
      await validPayload({ noConceptEquivalenceInference: false as true })
    )).ok).toBe(false);

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
        },
        (await validPayload()).systems[1]!
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
        },
        (await validPayload()).systems[1]!
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

  it("即使重算摘要也拒绝顶层、体系、事实和观察中的评分或赢家字段", async () => {
    const topLevel = structuredClone(await validPayload()) as unknown as Record<string, unknown>;
    topLevel.weightedScore = 83;
    expect((await verifyCrossSystemReadonlyComparisonDraft(await resign(topLevel))).ok).toBe(false);

    const systemLevel = structuredClone(await validPayload()) as unknown as Record<string, unknown>;
    (systemLevel.systems as Array<Record<string, unknown>>)[0]!.score = 40;
    expect((await verifyCrossSystemReadonlyComparisonDraft(await resign(systemLevel))).ok).toBe(false);

    const factLevel = structuredClone(await validPayload()) as unknown as Record<string, unknown>;
    const firstSystem = (factLevel.systems as Array<Record<string, unknown>>)[0]!;
    (firstSystem.frozenFacts as Array<Record<string, unknown>>)[0]!.weight = 0.4;
    expect((await verifyCrossSystemReadonlyComparisonDraft(await resign(factLevel))).ok).toBe(false);

    const observationLevel = structuredClone(await validPayload()) as unknown as Record<string, unknown>;
    const observations = observationLevel.observations as Record<string, Array<Record<string, unknown>>>;
    observations.nonComparableConcepts![0]!.winnerSystemId = "bazi";
    expect((await verifyCrossSystemReadonlyComparisonDraft(await resign(observationLevel))).ok).toBe(false);
  });

  it("拒绝观察提权、坏 basis、重复 observationId 与自动概念等价", async () => {
    const elevated = structuredClone(await validPayload()) as unknown as Record<string, unknown>;
    const elevatedInventory = elevated.observations as Record<string, Array<Record<string, unknown>>>;
    elevatedInventory.nonComparableConcepts![0]!.conceptEquivalenceClaimed = true;
    expect((await verifyCrossSystemReadonlyComparisonDraft(await resign(elevated))).ok).toBe(false);

    const badBasis = structuredClone(await validPayload()) as unknown as Record<string, unknown>;
    const badBasisInventory = badBasis.observations as Record<string, Array<Record<string, unknown>>>;
    const unresolved = badBasisInventory.unresolvedQuestions![0]!;
    (unresolved.basisRefs as Array<Record<string, unknown>>)[0]!.reference = "invented@9.9.9";
    expect((await verifyCrossSystemReadonlyComparisonDraft(await resign(badBasis))).ok).toBe(false);

    const duplicated = structuredClone(await validPayload()) as unknown as Record<string, unknown>;
    const duplicatedInventory = duplicated.observations as Record<string, Array<Record<string, unknown>>>;
    duplicatedInventory.unresolvedQuestions![0]!.observationId =
      duplicatedInventory.nonComparableConcepts![0]!.observationId;
    expect((await verifyCrossSystemReadonlyComparisonDraft(await resign(duplicated))).ok).toBe(false);

    const conceptOutsidePartition = structuredClone(await validPayload()) as unknown as Record<string, unknown>;
    const conceptInventory = conceptOutsidePartition.observations as Record<string, Array<Record<string, unknown>>>;
    conceptInventory.divergences = [structuredClone(conceptInventory.nonComparableConcepts![0]!)];
    conceptInventory.divergences[0]!.observationId = "divergence.illegal-concept-anchor";
    expect((await verifyCrossSystemReadonlyComparisonDraft(
      await resign(conceptOutsidePartition)
    )).ok).toBe(false);
  });

  it("即使重算内容摘要也拒绝虚构事实、复制回执与注册表摘要", async () => {
    const fabricated = structuredClone(await validPayload()) as unknown as Record<string, unknown>;
    const first = (fabricated.systems as Array<Record<string, unknown>>)[0]!;
    (first.frozenFacts as Array<Record<string, unknown>>)[0]!.value = "fabricated-but-resigned";
    expect((await verifyCrossSystemReadonlyComparisonDraft(await resign(fabricated))).ok).toBe(false);

    const copiedReceipt = structuredClone(await validPayload()) as unknown as Record<string, unknown>;
    const summaries = copiedReceipt.systems as Array<Record<string, unknown>>;
    summaries[0]!.engineeringFactReceipt = structuredClone(summaries[1]!.engineeringFactReceipt);
    expect((await verifyCrossSystemReadonlyComparisonDraft(await resign(copiedReceipt))).ok).toBe(false);

    const registryDrift = structuredClone(await validPayload()) as unknown as Record<string, unknown>;
    (registryDrift.factReceiptRegistry as Record<string, unknown>).registryDigest = "f".repeat(64);
    expect((await verifyCrossSystemReadonlyComparisonDraft(await resign(registryDrift))).ok).toBe(false);
  });

  it("八字 manifest 红门与吠陀无 producer 时不能创建注册摘要", () => {
    expect(() => createRegisteredCrossSystemSummaryDraft("bazi", "不得创建"))
      .toThrow(/no current engineering replay receipt/u);
  });

  it("对象入口零调用拒绝时变 getter", async () => {
    const candidate = structuredClone(await validPayload()) as unknown as Record<string, unknown>;
    let reads = 0;
    Object.defineProperty(candidate, "factsFrozen", {
      enumerable: true,
      configurable: true,
      get() {
        reads += 1;
        return reads === 1;
      }
    });
    const result = await verifyCrossSystemReadonlyComparisonDraft(candidate);
    expect(result.ok).toBe(false);
    expect(reads).toBe(0);
  });

  it("成功值脱离输入并递归冻结", async () => {
    const candidate = structuredClone(await validPayload());
    const result = await verifyCrossSystemReadonlyComparisonDraft(candidate);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).not.toBe(candidate);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.systems)).toBe(true);
    expect(Object.isFrozen(result.value.systems[0]!.frozenFacts[0]!)).toBe(true);
    const original = result.value.systems[0]!.frozenFacts[0]!.value;
    ((candidate.systems[0]!.frozenFacts as unknown) as Array<{ value: string }>)[0]!.value =
      "after-verification";
    expect(result.value.systems[0]!.frozenFacts[0]!.value).toBe(original);
  });

  it("模块初始化时脱离可变 JSON import 别名", () => {
    const mutableRegistry = mutableBundledEngineeringFactRegistry as unknown as {
      registryDigest: string;
      systems: Array<{ systemId: string }>;
    };
    const originalDigest = mutableRegistry.registryDigest;
    const originalSystemId = mutableRegistry.systems[0]!.systemId;
    const expectedReference = createCrossSystemFactReceiptRegistryReferenceDraft();

    try {
      mutableRegistry.registryDigest = "f".repeat(64);
      mutableRegistry.systems[0]!.systemId = "bazi";
      expect(createCrossSystemFactReceiptRegistryReferenceDraft()).toEqual(expectedReference);
      expect(createRegisteredCrossSystemSummaryDraft("ziwei-doushu", "紫微工程重放摘要").systemId)
        .toBe("ziwei-doushu");
    } finally {
      mutableRegistry.registryDigest = originalDigest;
      mutableRegistry.systems[0]!.systemId = originalSystemId;
    }
  });
});
