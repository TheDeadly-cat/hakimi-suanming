import { afterEach, describe, expect, it } from "vitest";
import Dexie from "dexie";
import { calculateChart } from "@hakimi/bazi-core";
import { SCHEMA_VERSION, type BirthInput } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import {
  CaseRepository,
  ResearchDatabase,
  ResearchRepository
} from "./index";

const V13_STORES = {
  cases: "id, updatedAt, deletedAt, *tags, latestRevisionId",
  revisions: "id, caseId, [caseId+revisionNumber], createdAt, manifest.resultHash",
  candidateSets: "id, updatedAt, deletedAt, *tags, candidateSet.resultHash",
  researchNotes: "id, caseId, [caseId+lifecycle], anchor.kind, anchor.revisionId, updatedAt, *tags",
  events: "id, caseId, revisionId, datePrecision, startDate, timeContext.kind, timeContext.start.canonicalUtc, deletedAt, updatedAt, *tags",
  savedViews: "id, state, recordVersion, name, updatedAt, createdAt",
  knowledgeDocuments: "id, contentHash, updatedAt, createdAt, format, fileName",
  citations: "id, documentId, documentContentHash, updatedAt, createdAt, status, *targetKeys",
  sourceRights: "documentId, documentContentHash, origin, rights.status, rights.distributionPolicy, review.status, updatedAt",
  attachments: "id, updatedAt, createdAt, mediaType, link.kind, link.subjectId, link.caseId, link.revisionId, link.noteId, link.eventId, link.documentId",
  researcherProfiles: "id, updatedAt",
  appSettings: "id, updatedAt",
  ruleRegistry: "id, recordType, packId, &[packId+profileVersion], profileDigest, importedAt",
  tzdbMigrationReceipts: "id, operation, source.recordId, target.recordId, createdAt",
  eventTimeMigrationReceipts: "id, operation, source.recordId, target.recordId, source.snapshotDigest, target.snapshotDigest, createdAt",
  birthFingerprints: "key, fingerprint, sourceId, subjectId, recordType"
} as const;

const V14_CASE_RECENCY_INDEX = "[caseId+updatedAt]";
const openDatabases: Dexie[] = [];

const input: BirthInput = {
  schemaVersion: SCHEMA_VERSION,
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

let chartPromise: ReturnType<typeof calculateChart> | undefined;

function calculatedChart() {
  chartPromise ??= calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
  return chartPromise;
}

function indexNames(database: Dexie, tableName: string): string[] {
  return database.table(tableName).schema.indexes.map((index) => index.name).sort();
}

function createV13Database(name: string): Dexie {
  const database = new Dexie(name);
  database.version(13).stores(V13_STORES);
  openDatabases.push(database);
  return database;
}

function rawV13Row(tableName: keyof typeof V13_STORES, ordinal: number): Record<string, unknown> {
  const primaryKey = tableName === "sourceRights"
    ? { documentId: `document-${ordinal}` }
    : tableName === "birthFingerprints"
      ? { key: `revision:source-${ordinal}` }
      : { id: `${tableName}-${ordinal}` };
  return {
    ...primaryKey,
    ...(tableName === "researchNotes" || tableName === "events"
      ? { caseId: "case-v13", updatedAt: "2026-08-03T01:02:03.004Z" }
      : {}),
    sentinel: `v13-${tableName}`,
    nested: { ordinal, values: [null, ordinal, tableName] }
  };
}

afterEach(async () => {
  const names = [...new Set(openDatabases.map((database) => database.name))];
  for (const database of openDatabases.splice(0)) database.close();
  await Promise.all(names.map((name) => Dexie.delete(name)));
});

describe("ResearchDatabase schema v14", () => {
  it("keeps a targetSchema 13 database physically at v13 without registering v14 indexes", async () => {
    const database = new ResearchDatabase(`hakimi-target-v13-${crypto.randomUUID()}`, {
      targetSchema: 13
    });
    openDatabases.push(database);
    await database.open();

    expect(database.targetSchemaVersion).toBe(13);
    expect(database.verno).toBe(13);
    expect(database.backendDB().version).toBe(130);
    expect(indexNames(database, "researchNotes")).not.toContain(V14_CASE_RECENCY_INDEX);
    expect(indexNames(database, "events")).not.toContain(V14_CASE_RECENCY_INDEX);
  });

  it("upgrades v13 to v14 by adding only the two indexes and preserves every row byte-for-byte", async () => {
    const name = `hakimi-v13-v14-index-migration-${crypto.randomUUID()}`;
    const legacy = createV13Database(name);
    const tableNames = Object.keys(V13_STORES) as Array<keyof typeof V13_STORES>;
    const rows = Object.fromEntries(tableNames.map((tableName, index) => [
      tableName,
      rawV13Row(tableName, index + 1)
    ])) as Record<keyof typeof V13_STORES, Record<string, unknown>>;

    await legacy.open();
    for (const tableName of tableNames) await legacy.table(tableName).add(rows[tableName]);
    const v13Indexes = Object.fromEntries(tableNames.map((tableName) => [
      tableName,
      indexNames(legacy, tableName)
    ])) as Record<keyof typeof V13_STORES, string[]>;
    const before = Object.fromEntries(await Promise.all(tableNames.map(async (tableName) => [
      tableName,
      await legacy.table(tableName).toArray()
    ]))) as Record<keyof typeof V13_STORES, unknown[]>;
    const beforeBytes = JSON.stringify(before);
    legacy.close();

    const upgraded = new ResearchDatabase(name);
    openDatabases.push(upgraded);
    await upgraded.open();

    expect(upgraded.verno).toBe(14);
    expect(upgraded.tables.map((table) => table.name).sort()).toEqual([...tableNames].sort());
    for (const tableName of tableNames) {
      const addedIndexes = tableName === "researchNotes" || tableName === "events"
        ? [V14_CASE_RECENCY_INDEX]
        : [];
      expect(indexNames(upgraded, tableName)).toEqual([...v13Indexes[tableName], ...addedIndexes].sort());
    }
    const after = Object.fromEntries(await Promise.all(tableNames.map(async (tableName) => [
      tableName,
      await upgraded.table(tableName).toArray()
    ]))) as Record<keyof typeof V13_STORES, unknown[]>;
    expect(JSON.stringify(after)).toBe(beforeBytes);
    expect(after).toEqual(before);
  });

  for (const targetSchema of [13, 14] as const) {
    it(`preserves note/Event recency ordering and lifecycle filters at targetSchema ${targetSchema}`, async () => {
      const database = new ResearchDatabase(
        `hakimi-v${targetSchema}-case-recency-${crypto.randomUUID()}`,
        { targetSchema }
      );
      openDatabases.push(database);
      let timestamp = "2026-08-03T00:00:00.000Z";
      const cases = new CaseRepository(database, () => timestamp);
      const research = new ResearchRepository(database, () => timestamp);
      const chart = await calculatedChart();
      const first = await cases.createCase({ alias: "case recency A", tags: [], calculated: chart });
      const second = await cases.createCase({ alias: "case recency B", tags: [], calculated: chart });
      const firstCaseId = first.caseRecord.id;
      const secondCaseId = second.caseRecord.id;

      const createNote = async (
        at: string,
        caseId: string,
        body: string,
        lifecycle: "active" | "archived" = "active"
      ) => {
        timestamp = at;
        return research.createResearchNote({
          caseId,
          anchor: { kind: "case" },
          body,
          tags: [],
          sourceRefs: [],
          lifecycle
        });
      };
      const oldNote = await createNote("2026-08-03T01:00:00.000Z", firstCaseId, "old active");
      const tieNoteA = await createNote("2026-08-03T03:00:00.000Z", firstCaseId, "tie A");
      const tieNoteB = await createNote("2026-08-03T03:00:00.000Z", firstCaseId, "tie B");
      const archivedNote = await createNote("2026-08-03T04:00:00.000Z", firstCaseId, "new archived", "archived");
      await createNote("2026-08-03T05:00:00.000Z", secondCaseId, "other case");
      const activeNotes = [oldNote, tieNoteA, tieNoteB]
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.id.localeCompare(left.id));
      const allNotes = [...activeNotes, archivedNote]
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.id.localeCompare(left.id));

      expect((await research.listResearchNotesByCase(firstCaseId)).map((record) => record.id))
        .toEqual(activeNotes.map((record) => record.id));
      expect((await research.listResearchNotesByCase(firstCaseId, { includeArchived: true })).map((record) => record.id))
        .toEqual(allNotes.map((record) => record.id));

      const createEvent = async (at: string, caseId: string, title: string) => {
        timestamp = at;
        return research.createEvent({
          caseId,
          revisionId: null,
          transitNodeRef: null,
          datePrecision: "day",
          startDate: "2026-08-03",
          endDate: null,
          title,
          tags: [],
          sourceRefs: [],
          feedback: "unreviewed",
          body: title
        });
      };
      const oldEvent = await createEvent("2026-08-03T01:00:00.000Z", firstCaseId, "old active");
      const deletedSource = await createEvent("2026-08-03T02:00:00.000Z", firstCaseId, "will delete");
      const tieEventA = await createEvent("2026-08-03T03:00:00.000Z", firstCaseId, "tie A");
      const tieEventB = await createEvent("2026-08-03T03:00:00.000Z", firstCaseId, "tie B");
      timestamp = "2026-08-03T04:00:00.000Z";
      const deletedEvent = await research.softDeleteEvent(deletedSource.id);
      await createEvent("2026-08-03T05:00:00.000Z", secondCaseId, "other case");
      const activeEvents = [oldEvent, tieEventA, tieEventB]
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.id.localeCompare(left.id));
      const allEvents = [...activeEvents, deletedEvent]
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.id.localeCompare(left.id));

      expect((await research.listEventsByCase(firstCaseId)).map((record) => record.id))
        .toEqual(activeEvents.map((record) => record.id));
      expect((await research.listEventsByCase(firstCaseId, { includeDeleted: true })).map((record) => record.id))
        .toEqual(allEvents.map((record) => record.id));
    });
  }
});
