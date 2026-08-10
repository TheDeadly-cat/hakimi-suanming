import { afterEach, describe, expect, it } from "vitest";
import Dexie from "dexie";
import { calculateChart, calculateUnknownHourCandidates } from "@hakimi/bazi-core";
import type {
  BirthInput,
  CalculatedChart,
  CandidateSetRecord,
  ResearchSubjectRecord,
  UnknownHourCandidateResult
} from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import {
  CandidateSetIntegrityError,
  CaseRepository,
  ResearchDatabase,
  ResearchRepository,
  type ResearchSubjectPageCursor
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
  sourceNote: ""
};

let chartPromise: Promise<CalculatedChart> | undefined;
let candidateSetPromise: Promise<UnknownHourCandidateResult> | undefined;

function chart(): Promise<CalculatedChart> {
  chartPromise ??= calculateChart(exactInput, WORKING_DEFAULT_RULE_PROFILE);
  return chartPromise;
}

function candidateSet(): Promise<UnknownHourCandidateResult> {
  candidateSetPromise ??= calculateUnknownHourCandidates({
    ...exactInput,
    time: null,
    timePrecision: "unknown_hour"
  }, WORKING_DEFAULT_RULE_PROFILE);
  return candidateSetPromise;
}

function repositories() {
  const database = new ResearchDatabase(`hakimi-subject-page-${crypto.randomUUID()}`);
  databases.push(database);
  return {
    database,
    cases: new CaseRepository(database),
    research: new ResearchRepository(database)
  };
}

function subjectKind(subject: ResearchSubjectRecord): "cases" | "candidate_sets" {
  return "recordType" in subject ? "candidate_sets" : "cases";
}

function compareSubjects(left: ResearchSubjectRecord, right: ResearchSubjectRecord): number {
  return right.updatedAt.localeCompare(left.updatedAt) ||
    left.id.localeCompare(right.id) ||
    subjectKind(left).localeCompare(subjectKind(right));
}

async function setSubjectUpdatedAt(
  database: ResearchDatabase,
  subject: ResearchSubjectRecord,
  updatedAt: string
): Promise<void> {
  if (subjectKind(subject) === "candidate_sets") {
    await database.candidateSets.update(subject.id, { updatedAt });
  } else {
    await database.cases.update(subject.id, { updatedAt });
  }
}

afterEach(async () => {
  const current = databases.splice(0);
  const names = [...new Set(current.map((database) => database.name))];
  for (const database of current) database.close();
  await Promise.all(names.map((name) => Dexie.delete(name)));
});

describe("research-subject bounded pages", () => {
  it("traverses stable keyset pages without duplicates, including an id/time collision across stores", async () => {
    const { database, cases } = repositories();
    const firstCase = await cases.createCase({ alias: "正式案例甲", calculated: await chart() });
    const secondCase = await cases.createCase({ alias: "正式案例乙", calculated: await chart() });
    const originalCandidate = await cases.createCandidateSet({ alias: "待考候选组", candidateSet: await candidateSet() });
    const samePositionCandidate: CandidateSetRecord = {
      ...structuredClone(originalCandidate),
      id: firstCase.caseRecord.id
    };
    await database.candidateSets.delete(originalCandidate.id);
    await database.candidateSets.put(samePositionCandidate);

    const sameUpdatedAt = "2099-07-01T08:00:00.000Z";
    const records: ResearchSubjectRecord[] = [
      firstCase.caseRecord,
      secondCase.caseRecord,
      samePositionCandidate
    ];
    await Promise.all(records.map((record) => setSubjectUpdatedAt(database, record, sameUpdatedAt)));
    const expected = records
      .map((record) => ({ ...record, updatedAt: sameUpdatedAt }))
      .sort(compareSubjects)
      .map((record) => `${record.id}:${subjectKind(record)}`);

    const visited: string[] = [];
    let cursor: ResearchSubjectPageCursor | null = null;
    do {
      const page = await cases.listResearchSubjectsPage({ limit: 1, cursor });
      expect(page.total).toBe(3);
      expect(page.items).toHaveLength(1);
      visited.push(`${page.items[0].id}:${subjectKind(page.items[0])}`);
      cursor = page.nextCursor;
    } while (cursor !== null);

    expect(visited).toEqual(expected);
    expect(new Set(visited).size).toBe(3);
    expect(visited.filter((entry) => entry.startsWith(`${firstCase.caseRecord.id}:`))).toEqual([
      `${firstCase.caseRecord.id}:candidate_sets`,
      `${firstCase.caseRecord.id}:cases`
    ]);
  });

  it("applies kind, lifecycle, and favorite filters and validates limits and cursor scope", async () => {
    const { cases } = repositories();
    const favoriteCase = await cases.createCase({ alias: "收藏正式案例", calculated: await chart() });
    const trashedCase = await cases.createCase({ alias: "回收站正式案例", calculated: await chart() });
    const favoriteCandidate = await cases.createCandidateSet({ alias: "收藏候选组", candidateSet: await candidateSet() });
    const trashedCandidate = await cases.createCandidateSet({ alias: "回收站候选组", candidateSet: await candidateSet() });
    await cases.setCaseFavorite(favoriteCase.caseRecord.id, true);
    await cases.setCandidateSetFavorite(favoriteCandidate.id, true);
    await cases.trashCase(trashedCase.caseRecord.id);
    await cases.trashCandidateSet(trashedCandidate.id);

    await expect(cases.listResearchSubjectsPage({ limit: 0 })).rejects.toBeInstanceOf(RangeError);
    await expect(cases.listResearchSubjectsPage({ limit: 101 })).rejects.toBeInstanceOf(RangeError);
    await expect(cases.listResearchSubjectsPage({ limit: 1.5 })).rejects.toBeInstanceOf(RangeError);

    const activeFavorites = await cases.listResearchSubjectsPage({ favoritesOnly: true });
    expect(activeFavorites.total).toBe(2);
    expect(activeFavorites.items.every((record) => record.favorite && record.deletedAt === null)).toBe(true);

    const trashedCases = await cases.listResearchSubjectsPage({ kind: "cases", lifecycle: "trashed" });
    expect(trashedCases.total).toBe(1);
    expect(trashedCases.items[0].id).toBe(trashedCase.caseRecord.id);

    const candidatePage = await cases.listResearchSubjectsPage({ kind: "candidate_sets", limit: 1 });
    expect(candidatePage.total).toBe(1);
    expect(subjectKind(candidatePage.items[0])).toBe("candidate_sets");

    const first = await cases.listResearchSubjectsPage({ lifecycle: "all", limit: 1 });
    expect(first.nextCursor).not.toBeNull();
    await expect(cases.listResearchSubjectsPage({
      lifecycle: "active",
      limit: 1,
      cursor: first.nextCursor
    })).rejects.toBeInstanceOf(TypeError);
  });

  it("returns exact active, trash, favorite, and revision overview counts", async () => {
    const { cases } = repositories();
    const revised = await cases.createCase({ alias: "多修订案例", calculated: await chart() });
    const activeCase = await cases.createCase({ alias: "普通案例", calculated: await chart() });
    const trashedCase = await cases.createCase({ alias: "已删除案例", calculated: await chart() });
    const activeCandidate = await cases.createCandidateSet({ alias: "活跃候选组", candidateSet: await candidateSet() });
    const trashedCandidate = await cases.createCandidateSet({ alias: "已删除候选组", candidateSet: await candidateSet() });
    await cases.addRevision(revised.caseRecord.id, await chart());
    await cases.setCaseFavorite(activeCase.caseRecord.id, true);
    await cases.setCandidateSetFavorite(activeCandidate.id, true);
    await cases.trashCase(trashedCase.caseRecord.id);
    await cases.trashCandidateSet(trashedCandidate.id);

    await expect(cases.getResearchSubjectOverview()).resolves.toEqual({
      activeCaseCount: 2,
      activeCandidateSetCount: 1,
      activeSubjectCount: 3,
      trashedSubjectCount: 2,
      activeFavoriteSubjectCount: 2,
      activeRevisionCount: 3
    });
  });
});

describe("research text-search pages", () => {
  it("preserves keyword and note semantics while traversing stable filtered pages", async () => {
    const { database, cases, research } = repositories();
    const metadataCase = await cases.createCase({ alias: "星河正式案例", calculated: await chart() });
    const noteCase = await cases.createCase({ alias: "普通正式案例", calculated: await chart() });
    const archivedCase = await cases.createCase({ alias: "封存笔记案例", calculated: await chart() });
    const candidate = await cases.createCandidateSet({
      alias: "星河候选组",
      tags: ["待考"],
      candidateSet: await candidateSet()
    });
    const activeNote = await research.createResearchNote({
      caseId: noteCase.caseRecord.id,
      anchor: { kind: "case" },
      body: "星河观察笔记",
      tags: ["研究"],
      sourceRefs: [],
      lifecycle: "active"
    });
    await research.createResearchNote({
      caseId: archivedCase.caseRecord.id,
      anchor: { kind: "case" },
      body: "星河封存资料",
      tags: [],
      sourceRefs: [],
      lifecycle: "archived"
    });

    const sameUpdatedAt = "2099-07-02T08:00:00.000Z";
    const subjects: ResearchSubjectRecord[] = [
      metadataCase.caseRecord,
      noteCase.caseRecord,
      archivedCase.caseRecord,
      candidate
    ];
    await Promise.all(subjects.map((record) => setSubjectUpdatedAt(database, record, sameUpdatedAt)));
    const expectedDefault = subjects
      .filter((record) => record.id !== archivedCase.caseRecord.id)
      .map((record) => ({ ...record, updatedAt: sameUpdatedAt }))
      .sort(compareSubjects)
      .map((record) => record.id);

    const visited: string[] = [];
    let cursor: ResearchSubjectPageCursor | null = null;
    do {
      const page = await research.searchCasesAndNotesPage("  星河  ", { limit: 2, cursor });
      expect(page.total).toBe(3);
      visited.push(...page.items.map((hit) => hit.caseRecord.id));
      const noteHit = page.items.find((hit) => hit.caseRecord.id === noteCase.caseRecord.id);
      if (noteHit) {
        expect(noteHit.matchedCaseMetadata).toBe(false);
        expect(noteHit.matchingNoteIds).toEqual([activeNote.id]);
      }
      const metadataHit = page.items.find((hit) => hit.caseRecord.id === metadataCase.caseRecord.id);
      if (metadataHit) {
        expect(metadataHit.matchedCaseMetadata).toBe(true);
        expect(metadataHit.matchingNoteIds).toEqual([]);
      }
      cursor = page.nextCursor;
    } while (cursor !== null);
    expect(visited).toEqual(expectedDefault);
    expect(new Set(visited).size).toBe(3);

    const archived = await research.searchCasesAndNotesPage("星河", { includeArchivedNotes: true });
    expect(archived.total).toBe(4);
    expect(archived.items.some((hit) => hit.caseRecord.id === archivedCase.caseRecord.id)).toBe(true);

    const candidatesOnly = await research.searchCasesAndNotesPage("星河", { kind: "candidate_sets" });
    expect(candidatesOnly.total).toBe(1);
    expect(candidatesOnly.items[0].caseRecord.id).toBe(candidate.id);

    const first = await research.searchCasesAndNotesPage("星河", { limit: 1 });
    expect(first.nextCursor).not.toBeNull();
    await expect(research.searchCasesAndNotesPage("不同关键词", {
      limit: 1,
      cursor: first.nextCursor
    })).rejects.toBeInstanceOf(TypeError);
  });

  it("fully verifies only CandidateSets selected into the returned page", async () => {
    const { database, cases, research } = repositories();
    const formal = await cases.createCase({ alias: "分页完整性样本", calculated: await chart() });
    const candidate = await cases.createCandidateSet({ alias: "分页完整性候选", candidateSet: await candidateSet() });
    await setSubjectUpdatedAt(database, formal.caseRecord, "2099-07-03T08:00:00.000Z");
    const tampered = structuredClone(candidate);
    tampered.updatedAt = "2099-07-01T08:00:00.000Z";
    tampered.candidateSet.warnings.push("存储后篡改但保留结构合法性");
    await database.candidateSets.put(tampered);

    const first = await research.searchCasesAndNotesPage("分页完整性", { limit: 1 });
    expect(first.total).toBe(2);
    expect(first.items[0].caseRecord.id).toBe(formal.caseRecord.id);
    expect(first.nextCursor).not.toBeNull();

    await expect(research.searchCasesAndNotesPage("分页完整性", {
      limit: 1,
      cursor: first.nextCursor
    })).rejects.toBeInstanceOf(CandidateSetIntegrityError);
  });
});
