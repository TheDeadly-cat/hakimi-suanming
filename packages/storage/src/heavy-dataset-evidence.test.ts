import { afterEach, describe, expect, it } from "vitest";
import type { BirthInput } from "@hakimi/contracts";
import { calculateChart, calculateUnknownHourCandidates } from "@hakimi/bazi-core";
import {
  createDefaultResearchQuery,
  executeResearchQuery,
  ResearchQueryExecutionError,
  type ResearchQuerySnapshot
} from "@hakimi/research-query";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { ADVANCED_CASE_QUERY } from "../../research-query/test-fixtures/advanced-case-query";
import {
  CaseRepository,
  ResearchDatabase,
  ResearchRepository
} from "./index";

const databases: ResearchDatabase[] = [];

const exactInput: BirthInput = {
  schemaVersion: "1.0.0",
  calendarType: "gregorian",
  date: "1995-08-18",
  time: "08:26",
  timePrecision: "exact_minute",
  timeZone: "Asia/Shanghai",
  sex: "male",
  lunarLeapMonth: false,
  location: { label: "", latitude: null, longitude: null, precision: "unknown" },
  sourceNote: "P2-05 长备注数据集"
};

const unknownHourInput: BirthInput = {
  ...exactInput,
  time: null,
  timePrecision: "unknown_hour",
  sourceNote: "P2-05 候选组重载数据集"
};

function repositories() {
  const database = new ResearchDatabase(`hakimi-heavy-dataset-${crypto.randomUUID()}`);
  databases.push(database);
  return {
    database,
    cases: new CaseRepository(database),
    research: new ResearchRepository(database)
  };
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map(async (database) => {
    database.close();
    await database.delete();
  }));
});

const CANDIDATE_COUNT = 60;
const LONG_NOTE_COUNT = 40;

async function seedHeavyDataset(
  cases: CaseRepository,
  research: ResearchRepository
): Promise<{ caseId: string; revisionId: string }> {
  const candidateSet = await calculateUnknownHourCandidates(
    unknownHourInput,
    WORKING_DEFAULT_RULE_PROFILE
  );
  await Promise.all(Array.from({ length: CANDIDATE_COUNT }, (_, index) =>
    cases.createCandidateSet({
      alias: `候选组 ${String(index + 1).padStart(3, "0")}`,
      tags: ["P2-05", "候选组重载"],
      notes: `候选组 ${index + 1} 的长备注：${"x".repeat(2_000)}`,
      candidateSet
    })
  ));

  const chart = await calculateChart(exactInput, WORKING_DEFAULT_RULE_PROFILE);
  const bundle = await cases.createCase({ alias: "长备注案例", calculated: chart });
  const revisionId = bundle.revisions[0].id;
  const longBody = "研究备注正文。".repeat(1_000);
  await Promise.all(Array.from({ length: LONG_NOTE_COUNT }, (_, index) =>
    research.createResearchNote({
      caseId: bundle.caseRecord.id,
      anchor: { kind: "chart_field", revisionId, pillar: "day", field: "stem" },
      body: `${longBody} 备注 ${index + 1}`,
      tags: ["P2-05", "长备注"],
      sourceRefs: [],
      lifecycle: "active"
    })
  ));
  return { caseId: bundle.caseRecord.id, revisionId };
}

describe("P2-05 heavy dataset evidence", () => {
  it("CandidateSet-heavy 与长备注数据集保持精确计数、分页与完整快照", async () => {
    const { cases, research } = repositories();
    const seeded = await seedHeavyDataset(cases, research);

    const overview = await cases.getResearchSubjectOverview();
    expect(overview.activeCandidateSetCount).toBe(CANDIDATE_COUNT);

    const firstPage = await cases.listResearchSubjectsPage({
      limit: 50,
      kind: "candidate_sets",
      lifecycle: "active"
    });
    expect(firstPage.total).toBe(CANDIDATE_COUNT);
    expect(firstPage.items).toHaveLength(50);
    expect(new Set(firstPage.items.map((item) => item.id)).size).toBe(50);

    const notes = await research.listResearchNotesByCase(seeded.caseId);
    expect(notes).toHaveLength(LONG_NOTE_COUNT);
    expect(notes.every((note) => note.body.length > 6_000)).toBe(true);

    const snapshot = await cases.readFullDataSnapshot();
    expect(snapshot.candidateSets).toHaveLength(CANDIDATE_COUNT);
    expect(snapshot.researchNotes).toHaveLength(LONG_NOTE_COUNT);
    expect(snapshot.candidateSets.every((record) => record.notes.length > 2_000)).toBe(true);
  }, 120_000);

  it("复杂 ResearchQuery 在重数据集上结果稳定，取消后不写入任何半成品", async () => {
    const { database, cases, research } = repositories();
    await seedHeavyDataset(cases, research);
    const full = await cases.readFullDataSnapshot();
    const snapshot: ResearchQuerySnapshot = {
      cases: full.cases,
      revisions: full.revisions,
      candidateSets: full.candidateSets,
      researchNotes: full.researchNotes,
      events: full.events,
      knowledgeDocuments: full.knowledgeDocuments,
      revisionCalculationReceiptLedgerStatus: "schema_unavailable",
      revisionCalculationReceipts: full.revisionCalculationReceipts
    };
    const fixedNow = () => "2026-08-10T00:00:00.000Z";

    const candidateQuery = {
      ...createDefaultResearchQuery("candidate_sets"),
      text: "候选组"
    };
    const first = await executeResearchQuery(candidateQuery, snapshot, {
      now: fixedNow
    });
    const second = await executeResearchQuery(candidateQuery, snapshot, {
      now: fixedNow
    });
    expect(first.total).toBe(CANDIDATE_COUNT);
    expect(second.total).toBe(CANDIDATE_COUNT);
    expect(second.resultDigest).toBe(first.resultDigest);

    const advanced = await executeResearchQuery(ADVANCED_CASE_QUERY, snapshot, {
      now: fixedNow
    });
    const advancedAgain = await executeResearchQuery(ADVANCED_CASE_QUERY, snapshot, {
      now: fixedNow
    });
    expect(advancedAgain.resultDigest).toBe(advanced.resultDigest);

    const preAborted = new AbortController();
    preAborted.abort();
    await expect(executeResearchQuery(candidateQuery, snapshot, {
      signal: preAborted.signal
    })).rejects.toBeInstanceOf(ResearchQueryExecutionError);
    await expect(executeResearchQuery(candidateQuery, snapshot, {
      signal: preAborted.signal
    })).rejects.toMatchObject({ code: "ABORTED" });

    const midRun = new AbortController();
    await expect(executeResearchQuery(candidateQuery, snapshot, {
      signal: midRun.signal,
      onProgress: (progress) => {
        if (progress.phase === "finalize") midRun.abort();
      }
    })).rejects.toMatchObject({ code: "ABORTED" });

    expect(await database.savedViews.count()).toBe(0);
    expect(await database.researchNotes.count()).toBe(LONG_NOTE_COUNT);
    expect(await research.listSavedViews()).toEqual([]);
  }, 120_000);
});
