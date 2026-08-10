import { afterEach, describe, expect, it } from "vitest";
import Dexie from "dexie";
import type { BirthInput } from "@hakimi/contracts";
import { calculateChart, calculateUnknownHourCandidates } from "@hakimi/bazi-core";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import {
  CaseRepository,
  DuplicateBirthFingerprintError,
  ResearchDatabase,
  ResearchRepository,
  ResearchSubjectLifecycleError
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

function repositories() {
  const database = new ResearchDatabase(`hakimi-lifecycle-${crypto.randomUUID()}`);
  databases.push(database);
  return {
    database,
    cases: new CaseRepository(database),
    research: new ResearchRepository(database)
  };
}

afterEach(async () => {
  const current = databases.splice(0);
  const names = [...new Set(current.map((database) => database.name))];
  for (const database of current) database.close();
  await Promise.all(names.map((name) => Dexie.delete(name)));
});

describe("research-subject lifecycle", () => {
  it("edits, favorites, trashes, restores, and permanently deletes a formal case without losing dependencies", async () => {
    const { database, cases, research } = repositories();
    const created = await cases.createCase({
      alias: "原案例",
      calculated: await calculateChart(exactInput, WORKING_DEFAULT_RULE_PROFILE)
    });
    const caseId = created.caseRecord.id;
    const revisionId = created.revisions[0].id;
    const note = await research.createResearchNote({
      caseId,
      anchor: { kind: "revision", revisionId },
      body: "保留的研究笔记",
      tags: ["核验"],
      sourceRefs: [],
      lifecycle: "active"
    });

    const edited = await cases.updateCaseMetadata(caseId, {
      alias: "修订后的别名",
      tags: ["事业", "核验"],
      notes: "仅修改案例外壳"
    });
    expect(edited).toMatchObject({ alias: "修订后的别名", tags: ["事业", "核验"], notes: "仅修改案例外壳" });
    expect((await cases.setCaseFavorite(caseId, true)).favorite).toBe(true);
    expect((await cases.listCases({ favoritesOnly: true })).map((record) => record.id)).toEqual([caseId]);
    await expect(cases.deleteCase(caseId)).rejects.toBeInstanceOf(ResearchSubjectLifecycleError);
    await expect(cases.deleteCase(caseId)).rejects.toMatchObject({ code: "SUBJECT_NOT_TRASHED" });

    const trashed = await cases.trashCase(caseId);
    expect(trashed.deletedAt).not.toBeNull();
    expect(await cases.listCases()).toEqual([]);
    expect((await cases.listCases({ lifecycle: "trashed" })).map((record) => record.id)).toEqual([caseId]);
    expect(await database.revisions.get(revisionId)).toBeDefined();
    expect(await database.researchNotes.get(note.id)).toBeDefined();
    expect((await research.listResearchNotesByCase(caseId))[0]?.id).toBe(note.id);
    await expect(research.updateResearchNote(note.id, {
      expectedEditVersion: note.editVersion,
      patch: { body: "回收站内不应改写" }
    })).rejects.toMatchObject({ code: "SUBJECT_IN_TRASH" });
    expect(await database.birthFingerprints.where("sourceId").equals(revisionId).first()).toBeDefined();
    expect(await research.searchCasesAndNotes("修订后的别名")).toEqual([]);
    expect((await research.searchCasesAndNotes("修订后的别名", { lifecycle: "trashed" }))[0]?.caseRecord.id).toBe(caseId);
    await expect(cases.addRevision(caseId, await calculateChart(exactInput, WORKING_DEFAULT_RULE_PROFILE)))
      .rejects.toMatchObject({ code: "SUBJECT_IN_TRASH" });

    const restored = await cases.restoreCase(caseId);
    expect(restored).toMatchObject({ deletedAt: null, favorite: true, alias: "修订后的别名" });
    expect(await database.researchNotes.get(note.id)).toBeDefined();
    expect((await cases.listCases())[0]?.id).toBe(caseId);

    await cases.trashCase(caseId);
    await cases.deleteCase(caseId);
    expect(await cases.getCase(caseId)).toBeNull();
    expect(await database.revisions.get(revisionId)).toBeUndefined();
    expect(await database.researchNotes.get(note.id)).toBeUndefined();
    expect(await database.birthFingerprints.where("sourceId").equals(revisionId).first()).toBeUndefined();
  });

  it("keeps duplicate-birth protection active while a case is in the trash", async () => {
    const { cases } = repositories();
    const calculated = await calculateChart(exactInput, WORKING_DEFAULT_RULE_PROFILE);
    const created = await cases.createCase({ alias: "唯一出生输入", calculated, duplicateGuard: "reject" });
    await cases.trashCase(created.caseRecord.id);

    await expect(cases.createCase({ alias: "重复出生输入", calculated, duplicateGuard: "reject" }))
      .rejects.toBeInstanceOf(DuplicateBirthFingerprintError);

    await cases.restoreCase(created.caseRecord.id);
    expect(await cases.listBirthFingerprints()).toHaveLength(1);

    await cases.trashCase(created.caseRecord.id);
    await cases.deleteCase(created.caseRecord.id);
    const replacement = await cases.createCase({ alias: "永久删除后重建", calculated, duplicateGuard: "reject" });
    expect(replacement.caseRecord.alias).toBe("永久删除后重建");
    expect(await cases.listBirthFingerprints()).toHaveLength(1);
  });

  it("applies the same lifecycle to unknown-hour candidate sets", async () => {
    const { database, cases } = repositories();
    const candidateSet = await calculateUnknownHourCandidates(
      { ...exactInput, time: null, timePrecision: "unknown_hour" },
      WORKING_DEFAULT_RULE_PROFILE
    );
    const created = await cases.createCandidateSet({ alias: "未知时辰", candidateSet });
    const edited = await cases.updateCandidateSetMetadata(created.id, {
      alias: "未知时辰候选组",
      tags: ["待核验"],
      notes: "保留全部候选"
    });
    expect(edited.alias).toBe("未知时辰候选组");
    expect((await cases.setCandidateSetFavorite(created.id, true)).favorite).toBe(true);
    await expect(cases.deleteCandidateSet(created.id)).rejects.toMatchObject({ code: "SUBJECT_NOT_TRASHED" });

    await cases.trashCandidateSet(created.id);
    expect(await cases.listCandidateSets()).toEqual([]);
    expect((await cases.listResearchSubjects({ lifecycle: "trashed" }))[0]?.id).toBe(created.id);
    expect(await database.birthFingerprints.where("sourceId").equals(created.id).first()).toBeDefined();
    const restored = await cases.restoreCandidateSet(created.id);
    expect(restored).toMatchObject({ deletedAt: null, favorite: true });

    await cases.trashCandidateSet(created.id);
    await cases.deleteCandidateSet(created.id);
    expect(await cases.getCandidateSet(created.id)).toBeNull();
    expect(await database.birthFingerprints.where("sourceId").equals(created.id).first()).toBeUndefined();
  });
});
