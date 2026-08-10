import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { calculateChart } from "@hakimi/bazi-core";
import {
  buildCalculatedChartHashPayload,
  formalComparisonSourceSchema,
  revisionRecordSchema,
  type BirthInput,
  type FormalComparisonRequest,
  type FormalComparisonSlotId,
  type FormalComparisonSource,
  type PairStructureResearchRequest
} from "@hakimi/contracts";
import { sha256Hex } from "@hakimi/integrity";
import { withDayBoundary } from "@hakimi/rule-profiles";
import {
  COMPARISON_CATEGORY_ORDER,
  COMPARISON_FIELD_DEFINITIONS,
  PAIR_STRUCTURE_RESEARCH_POLICY,
  projectPairStructureResearch,
  projectFormalComparison
} from "./index";
import {
  FORMAL_COMPARISON_GOLDEN_EVIDENCE_STATUS,
  FORMAL_COMPARISON_GOLDEN_FIXTURE_ID,
  FORMAL_COMPARISON_GOLDEN_FIXTURE_VERSION,
  PAIR_STRUCTURE_RESEARCH_GOLDEN_EVIDENCE_STATUS,
  PAIR_STRUCTURE_RESEARCH_GOLDEN_FIXTURE_ID,
  PAIR_STRUCTURE_RESEARCH_GOLDEN_FIXTURE_VERSION,
  summarizePairStructureResearchProjection,
  summarizeFormalComparisonProjection
} from "./golden-fixture";

export const FORMAL_COMPARISON_GOLDEN_TARGET_INSTANT = "2024-02-04T08:27:07.000Z" as const;
const packageRoot = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
export const FORMAL_COMPARISON_GOLDEN_SOURCES_PATH = path.join(
  packageRoot,
  "fixtures/formal-comparison-sources.v1.json"
);
export const FORMAL_COMPARISON_GOLDEN_PROJECTIONS_PATH = path.join(
  packageRoot,
  "fixtures/formal-comparison-projections.v1.json"
);
export const PAIR_STRUCTURE_RESEARCH_GOLDEN_PROJECTION_PATH = path.join(
  packageRoot,
  "fixtures/pair-structure-research-projection.v1.json"
);

type SourceDefinition = {
  slotId: FormalComparisonSlotId;
  caseId: string;
  revisionId: string;
  revisionNumber: number;
  alias: string;
  createdAt: string;
  boundary: "zi_start_23" | "midnight";
  legacyLuckRule: boolean;
  manualDirection: "forward" | "backward" | null;
  rulePack?: {
    packId: string;
    packDigest: string;
  };
  input: BirthInput;
};

const SOURCE_DEFINITIONS: readonly SourceDefinition[] = [
  {
    slotId: "A",
    caseId: "11111111-1111-4111-8111-111111111111",
    revisionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    revisionNumber: 1,
    alias: "同盘换日研究",
    createdAt: "2024-01-01T00:00:00.000Z",
    boundary: "zi_start_23",
    legacyLuckRule: false,
    manualDirection: null,
    rulePack: {
      packId: "golden-zi-start-pack",
      packDigest: "1".repeat(64)
    },
    input: {
      schemaVersion: "1.0.0",
      calendarType: "gregorian",
      date: "1995-08-18",
      time: "23:30",
      timePrecision: "exact_minute",
      timeZone: "Asia/Shanghai",
      sex: "male",
      lunarLeapMonth: false,
      location: {
        label: "上海固定样本",
        latitude: 31.2304,
        longitude: 121.4737,
        precision: "coordinates"
      },
      sourceNote: "正式对照工程黄金样本；不是现实人物。"
    }
  },
  {
    slotId: "B",
    caseId: "11111111-1111-4111-8111-111111111111",
    revisionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
    revisionNumber: 2,
    alias: "同盘换日研究",
    createdAt: "2024-01-01T00:01:00.000Z",
    boundary: "midnight",
    legacyLuckRule: false,
    manualDirection: null,
    input: {
      schemaVersion: "1.0.0",
      calendarType: "gregorian",
      date: "1995-08-18",
      time: "23:30",
      timePrecision: "exact_minute",
      timeZone: "Asia/Shanghai",
      sex: "male",
      lunarLeapMonth: false,
      location: {
        label: "上海固定样本",
        latitude: 31.2304,
        longitude: 121.4737,
        precision: "coordinates"
      },
      sourceNote: "正式对照工程黄金样本；不是现实人物。"
    }
  },
  {
    slotId: "C",
    caseId: "33333333-3333-4333-8333-333333333333",
    revisionId: "cccccccc-cccc-4ccc-8ccc-ccccccccccc3",
    revisionNumber: 1,
    alias: "东京同步时点样本",
    createdAt: "2024-01-01T00:02:00.000Z",
    boundary: "zi_start_23",
    legacyLuckRule: false,
    manualDirection: null,
    input: {
      schemaVersion: "1.0.0",
      calendarType: "gregorian",
      date: "1995-08-18",
      time: "23:30",
      timePrecision: "exact_minute",
      timeZone: "Asia/Tokyo",
      sex: "female",
      lunarLeapMonth: false,
      location: {
        label: "东京固定样本",
        latitude: 35.6762,
        longitude: 139.6503,
        precision: "coordinates"
      },
      sourceNote: "跨时区同步工程样本；不是现实人物。"
    }
  },
  {
    slotId: "D",
    caseId: "44444444-4444-4444-8444-444444444444",
    revisionId: "dddddddd-dddd-4ddd-8ddd-ddddddddddd4",
    revisionNumber: 1,
    alias: "旧修订人工顺逆样本",
    createdAt: "2024-01-01T00:03:00.000Z",
    boundary: "zi_start_23",
    legacyLuckRule: true,
    manualDirection: "forward",
    input: {
      schemaVersion: "1.0.0",
      calendarType: "lunar",
      date: "1995-07-23",
      time: "21:15",
      timePrecision: "exact_minute",
      timeZone: "Asia/Shanghai",
      sex: "unspecified",
      lunarLeapMonth: false,
      location: {
        label: "旧记录固定样本",
        latitude: null,
        longitude: null,
        precision: "unknown"
      },
      sourceNote: "旧修订降级与人工顺逆工程样本；不是现实人物。"
    }
  }
];

async function buildSource(definition: SourceDefinition): Promise<FormalComparisonSource> {
  const profile = withDayBoundary(definition.boundary);
  const rulePackBinding = definition.rulePack ? {
    kind: "installed_rule_pack" as const,
    packDigest: definition.rulePack.packDigest,
    profileDigest: await sha256Hex(profile),
    packId: definition.rulePack.packId,
    profileId: profile.profileId,
    profileVersion: profile.profileVersion,
    useMode: "exact" as const
  } : undefined;
  const chart = structuredClone(await calculateChart(
    definition.input,
    profile,
    rulePackBinding ? { rulePackBinding } : undefined
  ));
  chart.manifest.calculatedAt = definition.createdAt;
  if (definition.legacyLuckRule) {
    delete chart.luckCycleRuleSnapshot;
    delete chart.manifest.luckCycleRuleDigest;
    chart.manifest.resultHash = await sha256Hex(buildCalculatedChartHashPayload(chart));
  }
  const revision = revisionRecordSchema.parse({
    schemaVersion: "1.0.0",
    id: definition.revisionId,
    caseId: definition.caseId,
    revisionNumber: definition.revisionNumber,
    createdAt: definition.createdAt,
    input: chart.input,
    timeCalibration: chart.timeCalibration,
    ruleProfile: chart.ruleProfile,
    ...(chart.rulePackBinding ? { rulePackBinding: chart.rulePackBinding } : {}),
    ...(chart.luckCycleRuleSnapshot ? { luckCycleRuleSnapshot: chart.luckCycleRuleSnapshot } : {}),
    facts: chart.facts,
    manifest: chart.manifest
  });
  return formalComparisonSourceSchema.parse({
    schemaVersion: "1.0.0",
    slotId: definition.slotId,
    caseRecord: { id: definition.caseId, alias: definition.alias },
    revision,
    revisionSnapshotDigest: await sha256Hex(revision)
  });
}

function requestFor(
  definitions: readonly SourceDefinition[],
  transitMode: "none" | "same_instant"
): FormalComparisonRequest {
  return {
    schemaVersion: "1.0.0",
    baselineSlotId: "A",
    slots: definitions.map((definition) => ({
      slotId: definition.slotId,
      caseId: definition.caseId,
      revisionId: definition.revisionId,
      manualDirection: definition.manualDirection
    })),
    transit: transitMode === "same_instant"
      ? { mode: "same_instant", atInstant: FORMAL_COMPARISON_GOLDEN_TARGET_INSTANT }
      : { mode: "none" }
  };
}

export async function buildFormalComparisonGoldenFixtures() {
  const sources = await Promise.all(SOURCE_DEFINITIONS.map(buildSource));
  const scenarios = [
    { scenarioId: "same-case-day-boundary-2", itemCount: 2, transitMode: "none" },
    { scenarioId: "same-instant-timezone-3", itemCount: 3, transitMode: "same_instant" },
    { scenarioId: "full-status-4", itemCount: 4, transitMode: "same_instant" }
  ] as const;
  const projections = [];
  for (const scenario of scenarios) {
    const definitions = SOURCE_DEFINITIONS.slice(0, scenario.itemCount);
    const scenarioSources = sources.slice(0, scenario.itemCount);
    const request = requestFor(definitions, scenario.transitMode);
    const projection = await projectFormalComparison(request, scenarioSources);
    projections.push({
      scenarioId: scenario.scenarioId,
      request,
      expected: await summarizeFormalComparisonProjection(projection)
    });
  }
  const metadata = {
    fixtureId: FORMAL_COMPARISON_GOLDEN_FIXTURE_ID,
    fixtureVersion: FORMAL_COMPARISON_GOLDEN_FIXTURE_VERSION,
    evidenceStatus: FORMAL_COMPARISON_GOLDEN_EVIDENCE_STATUS,
    warning: "仅用于工程确定性回归；不是命理金标、专家裁决或吉凶结论。",
    generator: "packages/comparison-core/scripts/update-formal-comparison-golden.mjs"
  } as const;
  const sourceA = sources.find((source) => source.slotId === "A");
  const sourceC = sources.find((source) => source.slotId === "C");
  if (!sourceA || !sourceC) throw new Error("双案例黄金样例需要正式 source A 与不同 Case 的 source C。");
  const pairSourceB = formalComparisonSourceSchema.parse({
    ...structuredClone(sourceC),
    slotId: "B"
  });
  const pairRequest: PairStructureResearchRequest = {
    schemaVersion: "1.0.0",
    kind: "pair_structure_research",
    policy: PAIR_STRUCTURE_RESEARCH_POLICY,
    subjects: [
      {
        slotId: "A",
        caseId: sourceA.caseRecord.id,
        revisionId: sourceA.revision.id,
        manualDirection: null
      },
      {
        slotId: "B",
        caseId: pairSourceB.caseRecord.id,
        revisionId: pairSourceB.revision.id,
        manualDirection: null
      }
    ],
    atInstant: FORMAL_COMPARISON_GOLDEN_TARGET_INSTANT
  };
  const pairProjection = await projectPairStructureResearch(pairRequest, [sourceA, pairSourceB]);
  return {
    sources: {
      ...metadata,
      sourceCount: sources.length,
      sources
    },
    projections: {
      ...metadata,
      targetInstant: FORMAL_COMPARISON_GOLDEN_TARGET_INSTANT,
      categoryOrder: [...COMPARISON_CATEGORY_ORDER],
      fieldIds: COMPARISON_FIELD_DEFINITIONS.map((definition) => definition.id),
      scenarios: projections
    },
    pairResearch: {
      fixtureId: PAIR_STRUCTURE_RESEARCH_GOLDEN_FIXTURE_ID,
      fixtureVersion: PAIR_STRUCTURE_RESEARCH_GOLDEN_FIXTURE_VERSION,
      evidenceStatus: PAIR_STRUCTURE_RESEARCH_GOLDEN_EVIDENCE_STATUS,
      warning: "仅用于两个不同合成 Case 的工程确定性回归；只含双方各自事实，不是缘分、合婚吉凶、关系结论、命理金标或专家裁决。",
      generator: "packages/comparison-core/scripts/update-formal-comparison-golden.mjs",
      scenarioId: "different-cases-participant-facts-only-2",
      sourceDefinitionSlots: ["A", "C"] as const,
      request: pairRequest,
      expected: await summarizePairStructureResearchProjection(pairProjection)
    }
  };
}

export function serializeFormalComparisonGoldenFixture(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function formalComparisonGoldenFiles(
  fixtures: Awaited<ReturnType<typeof buildFormalComparisonGoldenFixtures>>
) {
  return [
    {
      path: FORMAL_COMPARISON_GOLDEN_SOURCES_PATH,
      content: serializeFormalComparisonGoldenFixture(fixtures.sources)
    },
    {
      path: FORMAL_COMPARISON_GOLDEN_PROJECTIONS_PATH,
      content: serializeFormalComparisonGoldenFixture(fixtures.projections)
    },
    {
      path: PAIR_STRUCTURE_RESEARCH_GOLDEN_PROJECTION_PATH,
      content: serializeFormalComparisonGoldenFixture(fixtures.pairResearch)
    }
  ] as const;
}

export async function writeFormalComparisonGoldenFixtures(
  fixtures: Awaited<ReturnType<typeof buildFormalComparisonGoldenFixtures>>
): Promise<void> {
  await mkdir(path.dirname(FORMAL_COMPARISON_GOLDEN_SOURCES_PATH), { recursive: true });
  await Promise.all(formalComparisonGoldenFiles(fixtures).map((file) =>
    writeFile(file.path, file.content, "utf8")
  ));
}
