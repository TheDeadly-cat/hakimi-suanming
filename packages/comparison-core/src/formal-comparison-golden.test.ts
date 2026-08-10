// @vitest-environment node

import { readFile } from "node:fs/promises";
import { beforeAll, describe, expect, it } from "vitest";
import { verifyRevisionSnapshotIntegrity } from "@hakimi/chart-integrity";
import {
  FORMAL_COMPARISON_CATEGORY_ORDER,
  formalComparisonRequestSchema,
  formalComparisonSourceSchema
} from "@hakimi/contracts";
import {
  COMPARISON_FIELD_DEFINITIONS,
  projectFormalComparison,
  verifyFormalComparisonProjectionIntegrity
} from "./index";
import {
  FORMAL_COMPARISON_GOLDEN_EVIDENCE_STATUS,
  FORMAL_COMPARISON_GOLDEN_FIXTURE_ID,
  FORMAL_COMPARISON_GOLDEN_FIXTURE_VERSION,
  PAIR_STRUCTURE_RESEARCH_GOLDEN_EVIDENCE_STATUS,
  PAIR_STRUCTURE_RESEARCH_GOLDEN_FIXTURE_ID,
  PAIR_STRUCTURE_RESEARCH_GOLDEN_FIXTURE_VERSION,
  summarizeFormalComparisonProjection
} from "./golden-fixture";
import {
  buildFormalComparisonGoldenFixtures,
  formalComparisonGoldenFiles,
  writeFormalComparisonGoldenFixtures
} from "./formal-comparison-golden-fixtures";

const mode = process.env.HAKIMI_FORMAL_COMPARISON_GOLDEN_MODE ?? "check";
if (mode !== "check" && mode !== "write") {
  throw new Error("HAKIMI_FORMAL_COMPARISON_GOLDEN_MODE 只允许 check 或 write。");
}

let fixtures: Awaited<ReturnType<typeof buildFormalComparisonGoldenFixtures>>;

beforeAll(async () => {
  fixtures = await buildFormalComparisonGoldenFixtures();
  if (mode === "write") await writeFormalComparisonGoldenFixtures(fixtures);
});

function findForbiddenKeys(value: unknown, path = "$", found: string[] = []): string[] {
  if (Array.isArray(value)) {
    value.forEach((item, index) => findForbiddenKeys(item, `${path}[${index}]`, found));
    return found;
  }
  if (value === null || typeof value !== "object") return found;
  const forbidden = new Set(["score", "rating", "compatibility", "luckScore"]);
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const nestedPath = `${path}.${key}`;
    if (forbidden.has(key)) found.push(nestedPath);
    findForbiddenKeys(nested, nestedPath, found);
  }
  return found;
}

describe("FormalComparison versioned engineering golden fixtures", () => {
  it("只有显式 write 才改写，check 模式要求逐字节一致", async () => {
    for (const file of formalComparisonGoldenFiles(fixtures)) {
      await expect(readFile(file.path, "utf8")).resolves.toBe(file.content);
    }
  });

  it("冻结工程证据身份、完整字段清单和 2/3/4 场景", () => {
    expect(Object.keys(fixtures.sources).sort()).toEqual([
      "evidenceStatus",
      "fixtureId",
      "fixtureVersion",
      "generator",
      "sourceCount",
      "sources",
      "warning"
    ]);
    expect(Object.keys(fixtures.projections).sort()).toEqual([
      "categoryOrder",
      "evidenceStatus",
      "fieldIds",
      "fixtureId",
      "fixtureVersion",
      "generator",
      "scenarios",
      "targetInstant",
      "warning"
    ]);
    expect(Object.keys(fixtures.pairResearch).sort()).toEqual([
      "evidenceStatus",
      "expected",
      "fixtureId",
      "fixtureVersion",
      "generator",
      "request",
      "scenarioId",
      "sourceDefinitionSlots",
      "warning"
    ]);
    for (const document of [fixtures.sources, fixtures.projections]) {
      expect(document).toMatchObject({
        fixtureId: FORMAL_COMPARISON_GOLDEN_FIXTURE_ID,
        fixtureVersion: FORMAL_COMPARISON_GOLDEN_FIXTURE_VERSION,
        evidenceStatus: FORMAL_COMPARISON_GOLDEN_EVIDENCE_STATUS
      });
      expect(document.warning).toContain("不是命理金标");
    }
    expect(fixtures.sources.sourceCount).toBe(4);
    expect(fixtures.projections.categoryOrder).toEqual([...FORMAL_COMPARISON_CATEGORY_ORDER]);
    expect(fixtures.projections.fieldIds).toEqual(COMPARISON_FIELD_DEFINITIONS.map((field) => field.id));
    expect(fixtures.projections.fieldIds).toHaveLength(96);
    expect(fixtures.projections.scenarios.map((scenario) => scenario.request.slots.length)).toEqual([2, 3, 4]);
    expect(findForbiddenKeys(fixtures)).toEqual([]);
  });

  it("冻结 source A + 不同 Case source C 的双案例 facts-only 工程投影", () => {
    const pair = fixtures.pairResearch;
    expect(pair).toMatchObject({
      fixtureId: PAIR_STRUCTURE_RESEARCH_GOLDEN_FIXTURE_ID,
      fixtureVersion: PAIR_STRUCTURE_RESEARCH_GOLDEN_FIXTURE_VERSION,
      evidenceStatus: PAIR_STRUCTURE_RESEARCH_GOLDEN_EVIDENCE_STATUS,
      scenarioId: "different-cases-participant-facts-only-2",
      sourceDefinitionSlots: ["A", "C"]
    });
    expect(pair.warning).toContain("双方各自事实");
    expect(pair.warning).toContain("不是缘分");
    expect(pair.request.subjects.map((subject) => subject.slotId)).toEqual(["A", "B"]);
    expect(new Set(pair.request.subjects.map((subject) => subject.caseId)).size).toBe(2);

    const expected = pair.expected;
    expect(expected).toMatchObject({
      kind: "pair_structure_research_projection",
      participantCount: 2,
      distinctCaseCount: 2,
      manifest: {
        semanticBoundary: "participant_facts_only",
        evidenceStatus: "engineering_projection"
      }
    });
    expect(expected.participants.map((participant) => participant.role)).toEqual(["A", "B"]);
    expect(expected.participants.map((participant) => participant.item.slotId)).toEqual(["A", "B"]);
    expect(new Set(expected.participants.map((participant) => participant.item.caseId)).size).toBe(2);
    expect(expected.participants.map((participant) => participant.observationCount)).toEqual([96, 96]);
    expect(expected.participants.map((participant) => participant.observations.map((observation) => observation.id)))
      .toEqual([
        COMPARISON_FIELD_DEFINITIONS.map((field) => field.id),
        COMPARISON_FIELD_DEFINITIONS.map((field) => field.id)
      ]);

    const boundaryFlags = [
      expected.policy.interpretationIncluded,
      expected.policy.scoreIncluded,
      expected.policy.crossChartDerivationIncluded,
      expected.policy.relationshipConclusionIncluded,
      expected.manifest.interpretationIncluded,
      expected.manifest.scoreIncluded,
      expected.manifest.compatibilityIncluded,
      expected.manifest.crossChartDerivationIncluded
    ];
    expect(boundaryFlags).toEqual(Array.from({ length: boundaryFlags.length }, () => false));
    expect(expected).not.toHaveProperty("sections");
    expect(expected).not.toHaveProperty("differenceCount");
    expect(expected).not.toHaveProperty("changedCategories");
    expect(expected).not.toHaveProperty("sameBirthInput");

    const forbiddenSystemField = /(?:score|rating|compatib|matchmaking|relationship(?:Outcome|Verdict)|缘分|合婚|婚配|吉凶|相合结论|相克结论)/i;
    for (const participant of expected.participants) {
      for (const observation of participant.observations) {
        expect(`${observation.id}\n${observation.label}`).not.toMatch(forbiddenSystemField);
      }
    }
  });

  it("每个正式源都 exact round-trip，并复算 Revision 与完整快照摘要", async () => {
    for (const source of fixtures.sources.sources) {
      expect(formalComparisonSourceSchema.parse(structuredClone(source))).toEqual(source);
      const verified = await verifyRevisionSnapshotIntegrity(source.revision);
      expect(verified.revision).toEqual(source.revision);
      expect(verified.revisionSnapshotDigest).toBe(source.revisionSnapshotDigest);
    }
  });

  it("每个场景都能重投影、完整回放且重复两次完全确定", async () => {
    for (const scenario of fixtures.projections.scenarios) {
      const request = formalComparisonRequestSchema.parse(structuredClone(scenario.request));
      const sources = request.slots.map((slot) => {
        const source = fixtures.sources.sources.find((candidate) =>
          candidate.slotId === slot.slotId &&
          candidate.caseRecord.id === slot.caseId &&
          candidate.revision.id === slot.revisionId
        );
        if (!source) throw new Error(`黄金场景 ${scenario.scenarioId} 缺少 ${slot.slotId} 正式源。`);
        return source;
      });
      const first = await projectFormalComparison(request, sources);
      const second = await projectFormalComparison(request, sources);

      await expect(verifyFormalComparisonProjectionIntegrity(first)).resolves.toEqual(first);
      expect(second).toEqual(first);
      expect(await summarizeFormalComparisonProjection(first)).toEqual(scenario.expected);
      expect(first.matrix.items).toHaveLength(request.slots.length);
      expect(first.matrix.rowCount).toBe(96);
      for (const row of first.matrix.sections.flatMap((section) => section.rows)) {
        expect(row.values).toHaveLength(request.slots.length);
        expect(row.cells).toHaveLength(request.slots.length);
      }

      if (scenario.scenarioId === "full-status-4") {
        const legacyItem = first.matrix.items[3];
        const legacyTransit = first.transits[3];
        expect(legacyItem.slotId).toBe("D");
        expect(legacyItem.manualDirection).toBe("forward");
        expect(legacyItem.revision.luckCycleRuleSnapshot).toBeUndefined();
        expect(legacyItem.revision.manifest.luckCycleRuleDigest).toBeUndefined();
        expect(legacyTransit.status).toBe("resolved");
        if (legacyTransit.status === "resolved") {
          expect(legacyTransit.snapshot.luckCycleRuleSource).toBe("legacy_inferred");
          expect(legacyTransit.snapshot.manualDirection).toBe("forward");
        }
      }
    }
  });
});
