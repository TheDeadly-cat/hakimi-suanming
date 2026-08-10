import { describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import {
  pairStructureResearchProjectionSchema,
  pairStructureResearchRequestSchema,
  formalComparisonSourceSchema,
  revisionRecordSchema,
  type BirthInput,
  type FormalComparisonSource,
  type PairStructureResearchRequest
} from "@hakimi/contracts";
import { sha256Hex } from "@hakimi/integrity";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import {
  buildPairStructureResearchHashPayload,
  PairStructureResearchIntegrityError,
  PAIR_STRUCTURE_RESEARCH_POLICY,
  projectPairStructureResearch,
  verifyPairStructureResearchProjectionIntegrity
} from "./index";

const BASE_INPUT: BirthInput = {
  schemaVersion: "1.0.0",
  calendarType: "gregorian",
  date: "1995-08-18",
  time: "23:30",
  timePrecision: "exact_minute",
  timeZone: "Asia/Shanghai",
  sex: "male",
  lunarLeapMonth: false,
  location: { label: "", latitude: null, longitude: null, precision: "unknown" },
  sourceNote: "双案例结构研究合成测试；不是现实人物。"
};

async function source(
  slotId: "A" | "B",
  alias: string,
  input: BirthInput
): Promise<FormalComparisonSource> {
  const chart = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
  const caseId = crypto.randomUUID();
  const revision = revisionRecordSchema.parse({
    schemaVersion: "1.0.0",
    id: crypto.randomUUID(),
    caseId,
    revisionNumber: 1,
    createdAt: chart.manifest.calculatedAt,
    input: chart.input,
    timeCalibration: chart.timeCalibration,
    ruleProfile: chart.ruleProfile,
    luckCycleRuleSnapshot: chart.luckCycleRuleSnapshot,
    facts: chart.facts,
    manifest: chart.manifest
  });
  return formalComparisonSourceSchema.parse({
    schemaVersion: "1.0.0",
    slotId,
    caseRecord: { id: caseId, alias },
    revision,
    revisionSnapshotDigest: await sha256Hex(revision)
  });
}

function request(sources: readonly FormalComparisonSource[]): PairStructureResearchRequest {
  return {
    schemaVersion: "1.0.0",
    kind: "pair_structure_research",
    policy: PAIR_STRUCTURE_RESEARCH_POLICY,
    subjects: [
      {
        slotId: "A",
        caseId: sources[0].caseRecord.id,
        revisionId: sources[0].revision.id,
        manualDirection: null
      },
      {
        slotId: "B",
        caseId: sources[1].caseRecord.id,
        revisionId: sources[1].revision.id,
        manualDirection: null
      }
    ],
    atInstant: "2024-02-04T08:27:07.000Z"
  };
}

function forbiddenSemanticKeys(value: unknown, path = "$", found: string[] = []): string[] {
  if (Array.isArray(value)) {
    value.forEach((item, index) => forbiddenSemanticKeys(item, `${path}[${index}]`, found));
    return found;
  }
  if (value === null || typeof value !== "object") return found;
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const nestedPath = `${path}.${key}`;
    if (!new Set(["scoreIncluded", "compatibilityIncluded"]).has(key) && /(?:score|rating|compatib|matchmaking|relationship(?:Outcome|Verdict))/i.test(key)) {
      found.push(nestedPath);
    }
    forbiddenSemanticKeys(nested, nestedPath, found);
  }
  return found;
}

describe("pair structure research projection", () => {
  it("强制恰好两个不同 Case 的 A/B 确切 Revision，并锁死无解释策略", () => {
    const sameCaseId = crypto.randomUUID();
    const raw = {
      schemaVersion: "1.0.0",
      kind: "pair_structure_research",
      policy: PAIR_STRUCTURE_RESEARCH_POLICY,
      subjects: [
        { slotId: "A", caseId: sameCaseId, revisionId: crypto.randomUUID(), manualDirection: null },
        { slotId: "B", caseId: sameCaseId, revisionId: crypto.randomUUID(), manualDirection: null }
      ],
      atInstant: "2024-02-04T08:27:07.000Z"
    };

    expect(() => pairStructureResearchRequestSchema.parse(raw)).toThrow(/两个不同 Case/);
    expect(() => pairStructureResearchRequestSchema.parse({
      ...raw,
      subjects: [raw.subjects[0]],
      policy: { ...PAIR_STRUCTURE_RESEARCH_POLICY, scoreIncluded: true }
    })).toThrow();
    expect(() => pairStructureResearchRequestSchema.parse({ ...raw, relationshipScore: 88 })).toThrow();
    expect(() => pairStructureResearchRequestSchema.parse({
      ...raw,
      subjects: [
        raw.subjects[0],
        { ...raw.subjects[1], caseId: crypto.randomUUID() }
      ],
      atInstant: "2024-02-04T16:27:07.000+08:00"
    })).toThrow(/规范 UTC/);
  });

  it("只并列两个案例各自的 96 项事实和同一 UTC 瞬时点六层运限", async () => {
    const sources = await Promise.all([
      source("A", "结构研究甲", BASE_INPUT),
      source("B", "结构研究乙", {
        ...BASE_INPUT,
        date: "1996-09-19",
        time: "08:15",
        timeZone: "Asia/Tokyo",
        sex: "female"
      })
    ]);
    const pairRequest = request(sources);
    const first = await projectPairStructureResearch(pairRequest, sources);
    const second = await projectPairStructureResearch(pairRequest, sources);

    expect(second).toEqual(first);
    expect(first.policy).toEqual(PAIR_STRUCTURE_RESEARCH_POLICY);
    expect(first.participants).toHaveLength(2);
    expect(new Set(first.participants.map((participant) => participant.item.caseId)).size).toBe(2);
    expect(first.participants.map((participant) => participant.observations.length)).toEqual([96, 96]);
    expect(first.targetInstant).toBe("2024-02-04T08:27:07.000Z");
    expect(first.participants.every((participant) => participant.transit.itemKey === participant.item.key)).toBe(true);
    expect(first.manifest.interpretationIncluded).toBe(false);
    expect(first.manifest.scoreIncluded).toBe(false);
    expect(first.manifest.compatibilityIncluded).toBe(false);
    expect(first.manifest.crossChartDerivationIncluded).toBe(false);
    expect(forbiddenSemanticKeys(first)).toEqual([]);
    await expect(verifyPairStructureResearchProjectionIntegrity(first)).resolves.toEqual(first);
  });

  it("严格输出拒绝评分/缘分字段，即使攻击者同时重算内外摘要", async () => {
    const sources = await Promise.all([
      source("A", "策略甲", BASE_INPUT),
      source("B", "策略乙", { ...BASE_INPUT, date: "1996-09-19" })
    ]);
    const projection = await projectPairStructureResearch(request(sources), sources);
    const tampered = structuredClone(projection);
    const observation = tampered.participants[0].observations[0];
    observation.id = "relationship.compatibility_score";
    observation.label = "缘分评分";
    tampered.manifest.resultHash = await sha256Hex(buildPairStructureResearchHashPayload(tampered));

    expect(() => pairStructureResearchProjectionSchema.parse(tampered)).toThrow(/禁止评分|缘分/);
  });

  it("更换另一方或交换 A/B 不会改写任一方自己的事实与运限", async () => {
    const [sourceA, sourceB1, sourceB2] = await Promise.all([
      source("A", "非干扰甲", BASE_INPUT),
      source("B", "非干扰乙一", { ...BASE_INPUT, date: "1996-09-19" }),
      source("B", "非干扰乙二", { ...BASE_INPUT, date: "1997-10-20" })
    ]);
    const withB1 = await projectPairStructureResearch(request([sourceA, sourceB1]), [sourceA, sourceB1]);
    const withB2 = await projectPairStructureResearch(request([sourceA, sourceB2]), [sourceA, sourceB2]);

    expect(withB2.participants[0]).toEqual(withB1.participants[0]);

    const sourceB1AsA = formalComparisonSourceSchema.parse({ ...structuredClone(sourceB1), slotId: "A" });
    const sourceAAsB = formalComparisonSourceSchema.parse({ ...structuredClone(sourceA), slotId: "B" });
    const swapped = await projectPairStructureResearch(
      request([sourceB1AsA, sourceAAsB]),
      [sourceB1AsA, sourceAAsB]
    );
    expect(swapped.participants[1].item.revision.id).toBe(sourceA.revision.id);
    expect(swapped.participants[1].observations).toEqual(withB1.participants[0].observations);
    expect(swapped.participants[1].transit).toEqual(withB1.participants[0].transit);
  });

  it("完整重签外层也不能掩盖内层 Revision 事实篡改", async () => {
    const sources = await Promise.all([
      source("A", "验真甲", BASE_INPUT),
      source("B", "验真乙", { ...BASE_INPUT, date: "1996-09-19" })
    ]);
    const projection = await projectPairStructureResearch(request(sources), sources);
    const tampered = structuredClone(projection);
    const item = tampered.participants[1].item;
    item.revision.facts.pillars.day.stem = "甲";
    item.revision.facts.pillars.day.ganZhi = `甲${item.revision.facts.pillars.day.branch}`;
    item.revisionSnapshotDigest = await sha256Hex(item.revision);
    tampered.manifest.resultHash = await sha256Hex(buildPairStructureResearchHashPayload(tampered));

    await expect(verifyPairStructureResearchProjectionIntegrity(tampered))
      .rejects.toBeInstanceOf(PairStructureResearchIntegrityError);
  });
});
