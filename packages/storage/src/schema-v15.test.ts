import { afterEach, describe, expect, it } from "vitest";
import Dexie from "dexie";
import {
  RESEARCH_DATABASE_MAX_SCHEMA_VERSION,
  RESEARCH_DATABASE_SCHEMA_VERSION,
  ResearchDatabase
} from "./index";

const V14_STORES = {
  cases: "id, updatedAt, deletedAt, *tags, latestRevisionId",
  revisions: "id, caseId, [caseId+revisionNumber], createdAt, manifest.resultHash",
  candidateSets: "id, updatedAt, deletedAt, *tags, candidateSet.resultHash",
  researchNotes: "id, caseId, [caseId+lifecycle], [caseId+updatedAt], anchor.kind, anchor.revisionId, updatedAt, *tags",
  events: "id, caseId, [caseId+updatedAt], revisionId, datePrecision, startDate, timeContext.kind, timeContext.start.canonicalUtc, deletedAt, updatedAt, *tags",
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

const RECEIPT_INDEXES = [
  "captureKind",
  "createdAt",
  "projection.projectionDigest",
  "requestFingerprint",
  "sourceRevision.caseId",
  "sourceRevision.revisionId"
];

const openDatabases: Dexie[] = [];

function indexNames(database: Dexie, tableName: string): string[] {
  return database.table(tableName).schema.indexes.map((index) => index.name).sort();
}

function createV14Database(name: string): Dexie {
  const database = new Dexie(name);
  database.version(14).stores(V14_STORES);
  openDatabases.push(database);
  return database;
}

function rawV14Row(tableName: keyof typeof V14_STORES, ordinal: number): Record<string, unknown> {
  const primaryKey = tableName === "sourceRights"
    ? { documentId: `document-${ordinal}` }
    : tableName === "birthFingerprints"
      ? { key: `revision:source-${ordinal}` }
      : { id: `${tableName}-${ordinal}` };
  return {
    ...primaryKey,
    ...(tableName === "researchNotes" || tableName === "events"
      ? { caseId: "case-v14", updatedAt: "2026-08-03T01:02:03.004Z" }
      : {}),
    sentinel: `v14-${tableName}`,
    nested: { ordinal, values: [null, ordinal, tableName] }
  };
}

afterEach(async () => {
  const names = [...new Set(openDatabases.map((database) => database.name))];
  for (const database of openDatabases.splice(0)) database.close();
  await Promise.all(names.map((name) => Dexie.delete(name)));
});

describe("ResearchDatabase schema v15", () => {
  it("keeps the unconfigured runtime on schema 14 and registers v15 only by explicit opt-in", async () => {
    expect(RESEARCH_DATABASE_SCHEMA_VERSION).toBe(14);
    expect(RESEARCH_DATABASE_MAX_SCHEMA_VERSION).toBe(16);

    const previous = globalThis.__HAKIMI_RESEARCH_DATABASE_RUNTIME__;
    globalThis.__HAKIMI_RESEARCH_DATABASE_RUNTIME__ = undefined;
    try {
      const database = new ResearchDatabase(`hakimi-default-v14-${crypto.randomUUID()}`);
      openDatabases.push(database);
      await database.open();

      expect(database.targetSchemaVersion).toBe(14);
      expect(database.verno).toBe(14);
      expect(database.tables.map((table) => table.name)).not.toContain("revisionCalculationReceipts");
    } finally {
      globalThis.__HAKIMI_RESEARCH_DATABASE_RUNTIME__ = previous;
    }
  });

  it("upgrades v14 to v15 by creating only an empty receipt store", async () => {
    const name = `hakimi-v14-v15-receipts-${crypto.randomUUID()}`;
    const legacy = createV14Database(name);
    const tableNames = Object.keys(V14_STORES) as Array<keyof typeof V14_STORES>;
    const rows = Object.fromEntries(tableNames.map((tableName, index) => [
      tableName,
      rawV14Row(tableName, index + 1)
    ])) as Record<keyof typeof V14_STORES, Record<string, unknown>>;

    await legacy.open();
    for (const tableName of tableNames) await legacy.table(tableName).add(rows[tableName]);
    const v14Indexes = Object.fromEntries(tableNames.map((tableName) => [
      tableName,
      indexNames(legacy, tableName)
    ])) as Record<keyof typeof V14_STORES, string[]>;
    const before = Object.fromEntries(await Promise.all(tableNames.map(async (tableName) => [
      tableName,
      await legacy.table(tableName).toArray()
    ]))) as Record<keyof typeof V14_STORES, unknown[]>;
    const beforeBytes = JSON.stringify(before);
    legacy.close();

    const upgraded = new ResearchDatabase(name, { targetSchema: 15 });
    openDatabases.push(upgraded);
    await upgraded.open();

    expect(upgraded.targetSchemaVersion).toBe(15);
    expect(upgraded.verno).toBe(15);
    expect(upgraded.backendDB().version).toBe(150);
    expect(upgraded.tables.map((table) => table.name).sort()).toEqual([
      ...tableNames,
      "revisionCalculationReceipts"
    ].sort());
    for (const tableName of tableNames) {
      expect(indexNames(upgraded, tableName)).toEqual(v14Indexes[tableName]);
    }
    expect(indexNames(upgraded, "revisionCalculationReceipts")).toEqual(RECEIPT_INDEXES);
    expect(upgraded.revisionCalculationReceipts.schema.primKey.name).toBe("id");
    expect(upgraded.revisionCalculationReceipts.schema.idxByName.requestFingerprint?.unique).toBe(true);
    expect(await upgraded.revisionCalculationReceipts.count()).toBe(0);

    const after = Object.fromEntries(await Promise.all(tableNames.map(async (tableName) => [
      tableName,
      await upgraded.table(tableName).toArray()
    ]))) as Record<keyof typeof V14_STORES, unknown[]>;
    expect(JSON.stringify(after)).toBe(beforeBytes);
    expect(after).toEqual(before);
  });
});
