import { afterEach, describe, expect, it } from "vitest";
import {
  createDefaultResearchQuery,
  executeResearchQuery,
  ResearchQueryExecutionError,
  type ResearchQuerySnapshot
} from "@hakimi/research-query";
import { ADVANCED_CASE_QUERY } from "../../research-query/test-fixtures/advanced-case-query";
import {
  P2_05_CANDIDATE_COUNT,
  P2_05_LONG_NOTE_COUNT,
  seedP205HeavyDataset
} from "./heavy-dataset-evidence.fixture";
import {
  CaseRepository,
  ResearchDatabase,
  ResearchRepository
} from "./index";

const databases: ResearchDatabase[] = [];

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

describe("P2-05 heavy dataset evidence", () => {
  it("CandidateSet-heavy 与长备注数据集保持精确计数、分页与完整快照", async () => {
    const { cases, research } = repositories();
    const seeded = await seedP205HeavyDataset(cases, research);

    const overview = await cases.getResearchSubjectOverview();
    expect(overview.activeCandidateSetCount).toBe(P2_05_CANDIDATE_COUNT);

    const firstPage = await cases.listResearchSubjectsPage({
      limit: 50,
      kind: "candidate_sets",
      lifecycle: "active"
    });
    expect(firstPage.total).toBe(P2_05_CANDIDATE_COUNT);
    expect(firstPage.items).toHaveLength(50);
    expect(new Set(firstPage.items.map((item) => item.id)).size).toBe(50);

    const notes = await research.listResearchNotesByCase(seeded.caseId);
    expect(notes).toHaveLength(P2_05_LONG_NOTE_COUNT);
    expect(notes.every((note) => note.body.length > 6_000)).toBe(true);

    const snapshot = await cases.readFullDataSnapshot();
    expect(snapshot.candidateSets).toHaveLength(P2_05_CANDIDATE_COUNT);
    expect(snapshot.researchNotes).toHaveLength(P2_05_LONG_NOTE_COUNT);
    expect(snapshot.candidateSets.every((record) => record.notes.length > 2_000)).toBe(true);
  }, 120_000);

  it("复杂 ResearchQuery 在重数据集上结果稳定，取消后不写入任何半成品", async () => {
    const { database, cases, research } = repositories();
    await seedP205HeavyDataset(cases, research);
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
    expect(first.total).toBe(P2_05_CANDIDATE_COUNT);
    expect(second.total).toBe(P2_05_CANDIDATE_COUNT);
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
    expect(await database.researchNotes.count()).toBe(P2_05_LONG_NOTE_COUNT);
    expect(await research.listSavedViews()).toEqual([]);
  }, 120_000);
});
