import { afterEach, describe, expect, it } from "vitest";
import type { BirthInput } from "@hakimi/contracts";
import { calculateChart, calculateUnknownHourCandidates } from "@hakimi/bazi-core";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
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

describe("P2-05 heavy dataset evidence", () => {
  it("CandidateSet-heavy 与长备注数据集保持精确计数、分页与完整快照", async () => {
    const { cases, research } = repositories();
    const candidateCount = 60;
    const longNoteCount = 40;
    const candidateSet = await calculateUnknownHourCandidates(
      unknownHourInput,
      WORKING_DEFAULT_RULE_PROFILE
    );

    await Promise.all(Array.from({ length: candidateCount }, (_, index) =>
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
    await Promise.all(Array.from({ length: longNoteCount }, (_, index) =>
      research.createResearchNote({
        caseId: bundle.caseRecord.id,
        anchor: { kind: "chart_field", revisionId, pillar: "day", field: "stem" },
        body: `${longBody} 备注 ${index + 1}`,
        tags: ["P2-05", "长备注"],
        sourceRefs: [],
        lifecycle: "active"
      })
    ));

    const overview = await cases.getResearchSubjectOverview();
    expect(overview.activeCandidateSetCount).toBe(candidateCount);

    const firstPage = await cases.listResearchSubjectsPage({
      limit: 50,
      kind: "candidate_sets",
      lifecycle: "active"
    });
    expect(firstPage.total).toBe(candidateCount);
    expect(firstPage.items).toHaveLength(50);
    expect(new Set(firstPage.items.map((item) => item.id)).size).toBe(50);

    const notes = await research.listResearchNotesByCase(bundle.caseRecord.id);
    expect(notes).toHaveLength(longNoteCount);
    expect(notes.every((note) => note.body.length > 6_000)).toBe(true);

    const snapshot = await cases.readFullDataSnapshot();
    expect(snapshot.candidateSets).toHaveLength(candidateCount);
    expect(snapshot.researchNotes).toHaveLength(longNoteCount);
    expect(snapshot.candidateSets.every((record) => record.notes.length > 2_000)).toBe(true);
  }, 120_000);
});
