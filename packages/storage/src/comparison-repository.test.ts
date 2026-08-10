import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import type { BirthInput, FormalComparisonRequest, PairStructureResearchRequest } from "@hakimi/contracts";
import { sha256Hex } from "@hakimi/integrity";
import { WORKING_DEFAULT_RULE_PROFILE, withDayBoundary } from "@hakimi/rule-profiles";
import {
  CaseRepository,
  FormalComparisonSourceError,
  ResearchDatabase
} from "./index";

const BASE_INPUT: BirthInput = {
  schemaVersion: "1.0.0",
  calendarType: "gregorian",
  date: "1995-08-18",
  time: "08:26",
  timePrecision: "exact_minute",
  timeZone: "Asia/Shanghai",
  sex: "male",
  lunarLeapMonth: false,
  location: { label: "", latitude: null, longitude: null, precision: "unknown" },
  sourceNote: ""
};

let database: ResearchDatabase;
let repository: CaseRepository;

const PAIR_STRUCTURE_RESEARCH_POLICY = {
  mode: "parallel_facts_only" as const,
  interpretationIncluded: false as const,
  scoreIncluded: false as const,
  crossChartDerivationIncluded: false as const,
  relationshipConclusionIncluded: false as const
};

beforeEach(() => {
  database = new ResearchDatabase(`comparison-test-${crypto.randomUUID()}`);
  repository = new CaseRepository(database);
});

afterEach(async () => {
  database.close();
  await database.delete();
});

async function createCase(alias: string, time: string) {
  const chart = await calculateChart({ ...BASE_INPUT, time }, WORKING_DEFAULT_RULE_PROFILE);
  return repository.createCase({ alias, calculated: chart });
}

function request(items: Array<{ caseId: string; revisionId: string }>): FormalComparisonRequest {
  const slotIds = ["A", "B", "C", "D"] as const;
  return {
    schemaVersion: "1.0.0",
    baselineSlotId: "A",
    slots: items.map((item, index) => ({ ...item, slotId: slotIds[index], manualDirection: null })),
    transit: { mode: "none" }
  };
}

function pairRequest(
  left: { caseId: string; revisionId: string },
  right: { caseId: string; revisionId: string }
): PairStructureResearchRequest {
  return {
    schemaVersion: "1.0.0",
    kind: "pair_structure_research",
    policy: PAIR_STRUCTURE_RESEARCH_POLICY,
    subjects: [
      { ...left, slotId: "A", manualDirection: null },
      { ...right, slotId: "B", manualDirection: null }
    ],
    atInstant: "2026-08-02T09:15:00.000Z"
  };
}

describe("CaseRepository.readFormalComparisonSources", () => {
  it.each([2, 3, 4])("在一个只读事务中按请求顺序返回 %s 个验签源", async (count) => {
    const bundles = [];
    for (let index = 0; index < count; index += 1) {
      bundles.push(await createCase(`正式盘 ${index + 1}`, `${String(8 + index).padStart(2, "0")}:26`));
    }
    const sources = await repository.readFormalComparisonSources(request(bundles.map((bundle) => ({
      caseId: bundle.caseRecord.id,
      revisionId: bundle.revisions[0].id
    }))));

    expect(sources).toHaveLength(count);
    expect(sources.map((source) => source.slotId)).toEqual(["A", "B", "C", "D"].slice(0, count));
    await Promise.all(sources.map(async (source) => {
      expect(source.revisionSnapshotDigest).toBe(await sha256Hex(source.revision));
    }));
  });

  it("始终读取 URL 指定的历史修订，不静默追随 latestRevisionId", async () => {
    const first = await createCase("多修订案例", "23:30");
    const alternate = await calculateChart(BASE_INPUT, withDayBoundary("midnight"));
    const updated = await repository.addRevision(first.caseRecord.id, alternate);
    const other = await createCase("第二盘", "09:26");
    const sources = await repository.readFormalComparisonSources(request([
      { caseId: first.caseRecord.id, revisionId: first.revisions[0].id },
      { caseId: other.caseRecord.id, revisionId: other.revisions[0].id }
    ]));

    expect(updated.caseRecord.latestRevisionId).not.toBe(first.revisions[0].id);
    expect(sources[0].revision.id).toBe(first.revisions[0].id);
    expect(sources[0].revision.revisionNumber).toBe(1);
  });

  it("拒绝跨案例修订、篡改结果和失真的 CaseBundle 关系", async () => {
    const left = await createCase("左盘", "08:26");
    const right = await createCase("右盘", "09:26");
    const validRequest = request([
      { caseId: left.caseRecord.id, revisionId: left.revisions[0].id },
      { caseId: right.caseRecord.id, revisionId: right.revisions[0].id }
    ]);

    const crossed = structuredClone(validRequest);
    crossed.slots[0].revisionId = right.revisions[0].id;
    crossed.slots[1].revisionId = left.revisions[0].id;
    await expect(repository.readFormalComparisonSources(crossed)).rejects.toMatchObject({ code: "CROSS_CASE_REVISION" });

    const tampered = structuredClone(left.revisions[0]);
    tampered.facts.pillars.day.ganZhi = `甲${tampered.facts.pillars.day.branch}`;
    tampered.facts.pillars.day.stem = "甲";
    await database.revisions.put(tampered);
    await expect(repository.readFormalComparisonSources(validRequest)).rejects.toThrow(/摘要|结构/);

    await database.revisions.put(left.revisions[0]);
    await database.cases.update(left.caseRecord.id, { revisionCount: 2 });
    await expect(repository.readFormalComparisonSources(validRequest)).rejects.toBeInstanceOf(FormalComparisonSourceError);
    await expect(repository.readFormalComparisonSources(validRequest)).rejects.toMatchObject({ code: "CASE_BUNDLE_INTEGRITY_MISMATCH" });
  });
});

describe("CaseRepository.readPairStructureResearchSources", () => {
  it("只读取两个不同 Case 的确切历史 Revision，并保持 A/B 顺序", async () => {
    const first = await createCase("双案例甲", "23:30");
    const alternate = await calculateChart(BASE_INPUT, withDayBoundary("midnight"));
    const updated = await repository.addRevision(first.caseRecord.id, alternate);
    const second = await createCase("双案例乙", "09:26");

    const sources = await repository.readPairStructureResearchSources(pairRequest(
      { caseId: first.caseRecord.id, revisionId: first.revisions[0].id },
      { caseId: second.caseRecord.id, revisionId: second.revisions[0].id }
    ));

    expect(updated.caseRecord.latestRevisionId).not.toBe(first.revisions[0].id);
    expect(sources.map((source) => source.slotId)).toEqual(["A", "B"]);
    expect(sources[0].revision.id).toBe(first.revisions[0].id);
    expect(sources[1].revision.id).toBe(second.revisions[0].id);
  });

  it("在进入 IndexedDB 读取前拒绝同一 Case 的两个 Revision", async () => {
    const first = await createCase("同案不同修订", "23:30");
    const alternate = await calculateChart(BASE_INPUT, withDayBoundary("midnight"));
    const updated = await repository.addRevision(first.caseRecord.id, alternate);

    await expect(repository.readPairStructureResearchSources(pairRequest(
      { caseId: first.caseRecord.id, revisionId: first.revisions[0].id },
      { caseId: first.caseRecord.id, revisionId: updated.revisions[1].id }
    ))).rejects.toThrow(/两个不同 Case/);
  });
});
