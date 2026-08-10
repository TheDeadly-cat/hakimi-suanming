import { afterEach, describe, expect, it } from "vitest";
import type { BirthInput } from "@hakimi/contracts";
import { calculateChart, calculateUnknownHourCandidates } from "@hakimi/bazi-core";
import { sha256Hex } from "@hakimi/integrity";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import {
  CandidateSetIntegrityError,
  CaseRepository,
  CoreDataIdentityConflictError,
  ResearchDatabase,
  ResearchRepository
} from "./index";

const databases: ResearchDatabase[] = [];

const unknownHourInput: BirthInput = {
  schemaVersion: "1.0.0",
  calendarType: "gregorian",
  date: "1995-08-18",
  time: null,
  timePrecision: "unknown_hour",
  timeZone: "Asia/Shanghai",
  sex: "unspecified",
  lunarLeapMonth: false,
  location: { label: "", latitude: null, longitude: null, precision: "unknown" },
  sourceNote: "时辰待考"
};

function repositories() {
  const database = new ResearchDatabase(`hakimi-candidate-set-test-${crypto.randomUUID()}`);
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

describe("unknown-hour candidate-set persistence", () => {
  it("stores and reopens all 13 probes without inventing a primary chart", async () => {
    const { cases } = repositories();
    const candidateSet = await calculateUnknownHourCandidates(unknownHourInput, WORKING_DEFAULT_RULE_PROFILE);
    const created = await cases.createCandidateSet({
      alias: "时辰待考 A-001",
      tags: ["未知时辰"],
      notes: "不选主盘",
      candidateSet
    });

    const reopened = await cases.getCandidateSet(created.id);
    expect(reopened).toEqual(created);
    expect(reopened?.candidateSet.input).toMatchObject({ time: null, timePrecision: "unknown_hour" });
    expect(reopened?.candidateSet.candidates).toHaveLength(13);
    expect(reopened?.candidateSet.candidates.every((probe) => probe.verificationStatus === "experimental_probe")).toBe(true);
    expect(await cases.listResearchSubjects()).toEqual([created]);
    expect((await cases.readFullDataSnapshot()).candidateSets).toEqual([created]);
  });

  it("rejects a candidate payload changed behind its stored snapshot digest", async () => {
    const { database, cases } = repositories();
    const candidateSet = await calculateUnknownHourCandidates(unknownHourInput, WORKING_DEFAULT_RULE_PROFILE);
    const created = await cases.createCandidateSet({ alias: "完整性样本", candidateSet });
    const tampered = structuredClone(created);
    tampered.candidateSet.warnings.push("存储后篡改但仍满足结构契约");
    await database.candidateSets.put(tampered);

    await expect(cases.getCandidateSet(created.id)).rejects.toBeInstanceOf(CandidateSetIntegrityError);
  });

  it("rejects stale internal semantic hashes even when the outer snapshot is re-signed", async () => {
    const { database, cases } = repositories();
    const candidateSet = await calculateUnknownHourCandidates(unknownHourInput, WORKING_DEFAULT_RULE_PROFILE);
    const created = await cases.createCandidateSet({ alias: "语义摘要样本", candidateSet });
    const tampered = structuredClone(created);
    tampered.candidateSet.engine.version = "9.9.9";
    for (const candidate of tampered.candidateSet.candidates) {
      if (candidate.chart) candidate.chart.manifest.engine.version = "9.9.9";
      for (const variant of candidate.variants) variant.chart.manifest.engine.version = "9.9.9";
    }
    tampered.snapshotDigest = await sha256Hex(tampered.candidateSet);
    await database.candidateSets.put(tampered);

    await expect(cases.getCandidateSet(created.id)).rejects.toMatchObject({
      code: "CANDIDATE_SET_INTEGRITY_MISMATCH",
      mismatch: "result"
    });
  });

  it("recomputes each embedded chart hash instead of trusting its manifest", async () => {
    const { database, cases } = repositories();
    const candidateSet = await calculateUnknownHourCandidates(unknownHourInput, WORKING_DEFAULT_RULE_PROFILE);
    const created = await cases.createCandidateSet({ alias: "内嵌命盘摘要样本", candidateSet });
    const tampered = structuredClone(created);
    const probe = tampered.candidateSet.candidates[0];
    if (probe.status !== "calculated") throw new Error("fixture probe should calculate");
    probe.chart.facts.pillars.day.nayin = "伪造纳音";
    probe.variants[0].chart.facts.pillars.day.nayin = "伪造纳音";
    tampered.snapshotDigest = await sha256Hex(tampered.candidateSet);
    await database.candidateSets.put(tampered);

    await expect(cases.getCandidateSet(created.id)).rejects.toMatchObject({
      code: "CANDIDATE_SET_INTEGRITY_MISMATCH",
      mismatch: "result"
    });
  });

  it("does not let research writes or search bypass a tampered candidate snapshot", async () => {
    const { database, cases, research } = repositories();
    const candidateSet = await calculateUnknownHourCandidates(unknownHourInput, WORKING_DEFAULT_RULE_PROFILE);
    const created = await cases.createCandidateSet({ alias: "研究完整性样本", candidateSet });
    const tampered = structuredClone(created);
    tampered.candidateSet.warnings.push("篡改后仍满足结构契约");
    await database.candidateSets.put(tampered);

    await expect(research.createResearchNote({
      caseId: created.id,
      anchor: { kind: "case" },
      body: "不应写入",
      tags: [],
      sourceRefs: [],
      lifecycle: "active"
    })).rejects.toBeInstanceOf(CandidateSetIntegrityError);
    await expect(research.searchCasesAndNotes("研究完整性样本")).rejects.toBeInstanceOf(CandidateSetIntegrityError);
    expect(await database.researchNotes.count()).toBe(0);
  });

  it("does not let note updates or event soft-delete bypass a candidate snapshot tampered after creation", async () => {
    const { database, cases, research } = repositories();
    const candidateSet = await calculateUnknownHourCandidates(unknownHourInput, WORKING_DEFAULT_RULE_PROFILE);
    const created = await cases.createCandidateSet({ alias: "研究更新完整性样本", candidateSet });
    const note = await research.createResearchNote({
      caseId: created.id,
      anchor: { kind: "case" },
      body: "原笔记",
      tags: [],
      sourceRefs: [],
      lifecycle: "active"
    });
    const event = await research.createEvent({
      caseId: created.id,
      revisionId: null,
      transitNodeRef: null,
      datePrecision: "unknown",
      startDate: null,
      endDate: null,
      title: "原事件",
      tags: [],
      sourceRefs: [],
      feedback: "unreviewed",
      body: "原事件正文"
    });
    const tampered = structuredClone(created);
    tampered.candidateSet.warnings.push("篡改后仍满足结构契约");
    await database.candidateSets.put(tampered);

    await expect(research.updateResearchNote(note.id, {
      expectedEditVersion: note.editVersion,
      patch: { body: "不应写入" }
    })).rejects.toBeInstanceOf(CandidateSetIntegrityError);
    await expect(research.softDeleteEvent(event.id)).rejects.toBeInstanceOf(CandidateSetIntegrityError);
    expect((await database.researchNotes.get(note.id))?.body).toBe("原笔记");
    expect((await database.events.get(event.id))?.deletedAt).toBeNull();
  });

  it("supports case-level notes and events, then deletes them with the candidate set", async () => {
    const { database, cases, research } = repositories();
    const candidateSet = await calculateUnknownHourCandidates(unknownHourInput, WORKING_DEFAULT_RULE_PROFILE);
    const created = await cases.createCandidateSet({ alias: "待考研究样本", candidateSet });
    const note = await research.createResearchNote({
      caseId: created.id,
      anchor: { kind: "case" },
      body: "先对照不依赖时柱的共同结构。",
      tags: ["待考"],
      sourceRefs: [],
      lifecycle: "active"
    });
    const event = await research.createEvent({
      caseId: created.id,
      revisionId: null,
      transitNodeRef: null,
      datePrecision: "unknown",
      startDate: null,
      endDate: null,
      title: "用于排除候选的访谈线索",
      tags: ["访谈"],
      sourceRefs: [],
      feedback: "unreviewed",
      body: "尚未绑定精确盘或运限节点。"
    });

    expect((await research.searchCasesAndNotes("共同结构"))[0]?.caseRecord.id).toBe(created.id);
    await cases.trashCandidateSet(created.id);
    await cases.deleteCandidateSet(created.id);
    expect(await cases.getCandidateSet(created.id)).toBeNull();
    expect(await database.birthFingerprints.where("sourceId").equals(created.id).first()).toBeUndefined();
    expect(await database.researchNotes.get(note.id)).toBeUndefined();
    expect(await database.events.get(event.id)).toBeUndefined();
  });

  it("rejects core replacement when an incoming Case or Revision ID collides with a retained candidate set", async () => {
    const { database, cases } = repositories();
    const candidateSet = await calculateUnknownHourCandidates(unknownHourInput, WORKING_DEFAULT_RULE_PROFILE);
    const candidate = await cases.createCandidateSet({ alias: "保留候选组", candidateSet });
    const chart = await calculateChart({
      ...unknownHourInput,
      time: "08:26",
      timePrecision: "exact_minute"
    }, WORKING_DEFAULT_RULE_PROFILE);
    const formal = await cases.createCase({ alias: "原正式案例", calculated: chart });
    const snapshot = await cases.readCoreDataSnapshot();
    snapshot.cases[0].id = candidate.id;
    snapshot.revisions[0].caseId = candidate.id;

    await expect(cases.replaceCoreDataSnapshot(snapshot)).rejects.toBeInstanceOf(CoreDataIdentityConflictError);
    await expect(cases.replaceCoreDataSnapshot(snapshot)).rejects.toMatchObject({
      code: "CROSS_PARTITION_ID_CONFLICT",
      conflictingIds: [candidate.id]
    });
    expect(await cases.getCandidateSet(candidate.id)).toEqual(candidate);
    expect(await cases.getCase(formal.caseRecord.id)).toEqual(formal);
    expect(await database.cases.get(candidate.id)).toBeUndefined();
  });
});
