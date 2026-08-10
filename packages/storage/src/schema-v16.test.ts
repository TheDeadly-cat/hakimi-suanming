import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { SCHEMA_VERSION, type BirthInput } from "@hakimi/contracts";
import { sha256Hex } from "@hakimi/integrity";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import {
  BirthFingerprintIndexIntegrityError,
  CaseRepository,
  RESEARCH_DATABASE_MAX_SCHEMA_VERSION,
  RESEARCH_DATABASE_MUTATION_STATE_ID,
  RESEARCH_DATABASE_MUTATION_STATE_PROTOCOL_VERSION,
  RESEARCH_DATABASE_SCHEMA_VERSION,
  ReleaseDatabaseWriteLockedError,
  ResearchDatabase,
  ResearchDatabaseMutationStateError
} from "./index";

const openDatabases: Dexie[] = [];

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

function rawV13Row(tableName: keyof typeof V13_STORES, ordinal: number): Record<string, unknown> {
  const primaryKey = tableName === "sourceRights"
    ? { documentId: `document-${ordinal}` }
    : tableName === "birthFingerprints"
      ? { key: `revision:source-${ordinal}` }
      : { id: `${tableName}-${ordinal}` };
  return {
    ...primaryKey,
    ...(tableName === "researchNotes" || tableName === "events"
      ? { caseId: "case-v13", updatedAt: "2026-08-04T00:00:00.000Z" }
      : {}),
    sentinel: `v13-${tableName}`,
    nested: { ordinal, values: [null, ordinal, tableName] }
  };
}

const birthInput: BirthInput = {
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

let calculatedChartPromise: ReturnType<typeof calculateChart> | undefined;

function calculatedChart() {
  calculatedChartPromise ??= calculateChart(birthInput, WORKING_DEFAULT_RULE_PROFILE);
  return calculatedChartPromise;
}

function createDatabase(
  name = `hakimi-schema-v16-${crypto.randomUUID()}`,
  options: { releaseWritesLocked?: boolean } = {}
): ResearchDatabase {
  const database = new ResearchDatabase(name, { targetSchema: 16, ...options });
  openDatabases.push(database);
  return database;
}

afterEach(async () => {
  const names = [...new Set(openDatabases.map((database) => database.name))];
  for (const database of openDatabases.splice(0)) database.close();
  await Promise.all(names.map((name) => Dexie.delete(name)));
});

describe("ResearchDatabase schema v16 mutation epoch", () => {
  it("keeps schema 14 as the default and exposes v16 only by explicit opt-in", async () => {
    expect(RESEARCH_DATABASE_SCHEMA_VERSION).toBe(14);
    expect(RESEARCH_DATABASE_MAX_SCHEMA_VERSION).toBe(16);

    const database = createDatabase();
    await database.open();

    expect(database.verno).toBe(16);
    expect(database.backendDB().version).toBe(160);
    expect(database.tables.map((table) => table.name)).toContain("mutationState");
    expect(await database.mutationState.count()).toBe(0);
    await expect(database.readMutationState()).resolves.toBeNull();
  });

  it("bumps once for each implicit business write", async () => {
    const database = createDatabase();
    await database.table("appSettings").put({ id: "one", marker: 1 });
    expect((await database.readMutationState())?.epoch).toBe(1);

    await database.table("appSettings").put({ id: "two", marker: 2 });
    expect((await database.readMutationState())?.epoch).toBe(2);
  });

  it("bumps only once for a multi-table readwrite transaction", async () => {
    const database = createDatabase();
    const appSettings = database.table("appSettings");
    const savedViews = database.table("savedViews");

    await database.transaction("rw", [appSettings, savedViews], async () => {
      await appSettings.put({ id: "settings", marker: true });
      await savedViews.put({ id: "view", marker: true });
      await appSettings.put({ id: "settings-2", marker: true });
    });

    expect((await database.readMutationState())?.epoch).toBe(1);
  });

  it("bumps only once for bulkDelete and clear in the same transaction", async () => {
    const database = createDatabase();
    const appSettings = database.table("appSettings");
    const savedViews = database.table("savedViews");
    await database.transaction("rw", [appSettings, savedViews], async () => {
      await appSettings.bulkPut([{ id: "one" }, { id: "two" }]);
      await savedViews.bulkPut([{ id: "one" }, { id: "two" }]);
    });
    expect((await database.readMutationState())?.epoch).toBe(1);

    await database.transaction("rw", [appSettings, savedViews], async () => {
      await appSettings.bulkDelete(["one", "two"]);
      await savedViews.clear();
    });
    expect((await database.readMutationState())?.epoch).toBe(2);
  });

  it("bumps exactly once for one delete", async () => {
    const database = createDatabase();
    const appSettings = database.table("appSettings");
    await appSettings.put({ id: "delete-once" });
    expect((await database.readMutationState())?.epoch).toBe(1);

    await appSettings.delete("delete-once");

    expect(await appSettings.get("delete-once")).toBeUndefined();
    expect((await database.readMutationState())?.epoch).toBe(2);
  });

  it.each(["throw", "abort"] as const)(
    "rolls back the business row and epoch together after an explicit %s",
    async (failureMode) => {
      const database = createDatabase();
      const appSettings = database.table("appSettings");

      await expect(database.transaction("rw", appSettings, async (transaction) => {
        await appSettings.put({ id: `rolled-back-${failureMode}` });
        if (failureMode === "abort") {
          transaction.abort();
          return;
        }
        throw new Error("explicit transaction failure");
      })).rejects.toBeTruthy();

      expect(await appSettings.get(`rolled-back-${failureMode}`)).toBeUndefined();
      await expect(database.readMutationState()).resolves.toBeNull();
    }
  );

  it("rolls the bump back with an uncaught failed write and is conservative when failure is caught", async () => {
    const database = createDatabase();
    const appSettings = database.table("appSettings");
    await appSettings.add({ id: "duplicate", marker: "original" });
    expect((await database.readMutationState())?.epoch).toBe(1);

    await expect(appSettings.add({ id: "duplicate", marker: "rejected" })).rejects.toBeTruthy();
    const afterUncaughtFailure = (await database.readMutationState())?.epoch;
    // Dexie may abort the whole implicit transaction or preventDefault on the
    // request error and commit only our preceding bump. Both are safe.
    expect([1, 2]).toContain(afterUncaughtFailure);

    const outcome = await database.transaction("rw", appSettings, async () => {
      try {
        await appSettings.add({ id: "duplicate", marker: "caught" });
      } catch {
        // A caller can deliberately catch an IndexedDB constraint failure. In
        // that case committing a dirty epoch is conservative and permitted.
      }
    }).then(() => "committed" as const, () => "rolled-back" as const);
    const epoch = (await database.readMutationState())?.epoch;
    expect(epoch).toBe(outcome === "committed"
      ? (afterUncaughtFailure ?? 0) + 1
      : afterUncaughtFailure);
    expect(await appSettings.toArray()).toEqual([{ id: "duplicate", marker: "original" }]);
  });

  it("checks the release write lock before creating an epoch bump", async () => {
    const database = createDatabase(undefined, { releaseWritesLocked: true });
    await database.open();

    await expect(database.table("appSettings").put({ id: "blocked" }))
      .rejects.toBeInstanceOf(ReleaseDatabaseWriteLockedError);
    await expect(database.readMutationState()).resolves.toBeNull();

    await database.withReleaseMigrationWriteAccess(() =>
      database.table("appSettings").put({ id: "privileged" })
    );
    expect((await database.readMutationState())?.epoch).toBe(1);
  });

  it("serializes epoch increments across two connections without losing writes", async () => {
    const name = `hakimi-schema-v16-concurrent-${crypto.randomUUID()}`;
    const first = createDatabase(name);
    const second = createDatabase(name);
    await Promise.all([first.open(), second.open()]);

    const writes = Array.from({ length: 24 }, (_, index) => {
      const database = index % 2 === 0 ? first : second;
      return database.table("appSettings").put({ id: `row-${index}`, index });
    });
    await Promise.all(writes);

    expect((await first.readMutationState())?.epoch).toBe(writes.length);
    expect((await second.readMutationState())?.epoch).toBe(writes.length);
    expect(await first.table("appSettings").count()).toBe(writes.length);
  });

  it("upgrades v15 to an empty v16 mutation-state store without changing business rows", async () => {
    const name = `hakimi-schema-v15-v16-${crypto.randomUUID()}`;
    const legacy = new ResearchDatabase(name, { targetSchema: 15 });
    openDatabases.push(legacy);
    await legacy.table("appSettings").put({ id: "sentinel", nested: { value: 15 } });
    const before = await legacy.table("appSettings").toArray();
    legacy.close();

    const upgraded = createDatabase(name);
    await upgraded.open();

    expect(upgraded.verno).toBe(16);
    expect(await upgraded.table("appSettings").toArray()).toEqual(before);
    expect(await upgraded.mutationState.count()).toBe(0);
    await expect(upgraded.readMutationState()).resolves.toBeNull();
  });

  it("directly upgrades a physical v13 database through v14, v15, and v16 without rewriting old rows", async () => {
    const name = `hakimi-schema-v13-v16-${crypto.randomUUID()}`;
    const legacy = new Dexie(name);
    legacy.version(13).stores(V13_STORES);
    openDatabases.push(legacy);
    const tableNames = Object.keys(V13_STORES) as Array<keyof typeof V13_STORES>;
    const rows = Object.fromEntries(tableNames.map((tableName, index) => [
      tableName,
      rawV13Row(tableName, index + 1)
    ])) as Record<keyof typeof V13_STORES, Record<string, unknown>>;
    await legacy.open();
    for (const tableName of tableNames) await legacy.table(tableName).add(rows[tableName]);
    const before = Object.fromEntries(await Promise.all(tableNames.map(async (tableName) => [
      tableName,
      await legacy.table(tableName).toArray()
    ]))) as Record<keyof typeof V13_STORES, unknown[]>;
    const beforeBytes = JSON.stringify(before);
    legacy.close();

    const upgraded = createDatabase(name);
    await upgraded.open();

    expect(upgraded.verno).toBe(16);
    expect(upgraded.backendDB().version).toBe(160);
    expect(upgraded.table("researchNotes").schema.indexes.map((index) => index.name))
      .toContain("[caseId+updatedAt]");
    expect(upgraded.table("events").schema.indexes.map((index) => index.name))
      .toContain("[caseId+updatedAt]");
    expect(upgraded.tables.map((table) => table.name)).toEqual(expect.arrayContaining([
      "revisionCalculationReceipts",
      "mutationState"
    ]));
    expect(await upgraded.revisionCalculationReceipts.count()).toBe(0);
    expect(await upgraded.mutationState.count()).toBe(0);
    await expect(upgraded.readMutationState()).resolves.toBeNull();

    const after = Object.fromEntries(await Promise.all(tableNames.map(async (tableName) => [
      tableName,
      await upgraded.table(tableName).toArray()
    ]))) as Record<keyof typeof V13_STORES, unknown[]>;
    expect(JSON.stringify(after)).toBe(beforeBytes);
    expect(after).toEqual(before);
  });

  it("strictly reads state and performs metadata-only compare-and-set verification", async () => {
    const database = createDatabase();
    const repository = new CaseRepository(database);
    const initialSnapshot = await repository.readFullDataSnapshotWithMutationState();
    expect(initialSnapshot).toMatchObject({ epoch: 0, mutationState: null });
    expect(initialSnapshot.payload).not.toHaveProperty("mutationState");
    expect(initialSnapshot.payload).not.toHaveProperty("birthFingerprints");

    const firstMarker = await repository.markMutationStateVerified({
      expectedEpoch: 0,
      payloadDigest: "a".repeat(64),
      contractVersion: "generation=g16;schema=16;build=test;verifier=full-v1",
      verifiedAt: "2026-08-04T00:00:00.000Z"
    });
    expect(firstMarker).toEqual({
      id: RESEARCH_DATABASE_MUTATION_STATE_ID,
      protocolVersion: RESEARCH_DATABASE_MUTATION_STATE_PROTOCOL_VERSION,
      epoch: 0,
      verifiedEpoch: 0,
      verifiedPayloadDigest: "a".repeat(64),
      verifiedContractVersion: "generation=g16;schema=16;build=test;verifier=full-v1",
      verifiedAt: "2026-08-04T00:00:00.000Z"
    });
    expect((await database.readMutationState())?.epoch).toBe(0);
    await expect(repository.readFullDataSnapshotWithMutationState()).resolves.toMatchObject({
      epoch: 0,
      mutationState: firstMarker
    });

    await database.table("appSettings").put({ id: "business-write" });
    expect(await repository.markMutationStateVerified({
      expectedEpoch: 0,
      payloadDigest: "b".repeat(64),
      contractVersion: "generation=g16;schema=16;build=test;verifier=full-v1",
      verifiedAt: "2026-08-04T00:01:00.000Z"
    })).toBeNull();
    const secondMarker = await repository.markMutationStateVerified({
      expectedEpoch: 1,
      payloadDigest: "b".repeat(64),
      contractVersion: "generation=g16;schema=16;build=test;verifier=full-v1",
      verifiedAt: "2026-08-04T00:01:00.000Z"
    });
    expect(secondMarker?.epoch).toBe(1);
    expect(secondMarker?.verifiedEpoch).toBe(1);
    expect((await database.readMutationState())?.epoch).toBe(1);
  });

  it("keeps mutation marker changes out of the full-backup payload and its digest", async () => {
    const database = createDatabase();
    const repository = new CaseRepository(database);

    const before = await repository.readFullDataSnapshotWithMutationState();
    const beforeDigest = await sha256Hex(before.payload);
    expect(before).toMatchObject({ epoch: 0, mutationState: null });

    await repository.markMutationStateVerified({
      expectedEpoch: 0,
      payloadDigest: beforeDigest,
      contractVersion: "generation=g16;schema=16;build=test;verifier=full-v1",
      verifiedAt: "2026-08-04T00:03:00.000Z"
    });
    const after = await repository.readFullDataSnapshotWithMutationState();

    expect(after.mutationState).not.toEqual(before.mutationState);
    expect(after.payload).toEqual(before.payload);
    expect(after.payload).not.toHaveProperty("mutationState");
    await expect(sha256Hex(after.payload)).resolves.toBe(beforeDigest);
  });

  it("fails strict reads for non-canonical internal metadata", async () => {
    const database = createDatabase();
    await database.mutationState.put({
      id: RESEARCH_DATABASE_MUTATION_STATE_ID,
      protocolVersion: RESEARCH_DATABASE_MUTATION_STATE_PROTOCOL_VERSION,
      epoch: 0,
      verifiedEpoch: null,
      verifiedPayloadDigest: null,
      verifiedContractVersion: null,
      verifiedAt: null,
      unexpected: true
    } as never);

    await expect(database.readMutationState()).rejects.toMatchObject({
      code: "STATE_CORRUPT"
    } satisfies Partial<ResearchDatabaseMutationStateError>);
  });

  it("clearAll clears mutationState last and leaves every physical v16 store empty", async () => {
    const database = createDatabase();
    const repository = new CaseRepository(database);
    await database.table("appSettings").put({ id: "settings" });
    await repository.markMutationStateVerified({
      expectedEpoch: 1,
      payloadDigest: "c".repeat(64),
      contractVersion: "generation=g16;schema=16;build=test;verifier=full-v1",
      verifiedAt: "2026-08-04T00:02:00.000Z"
    });

    await repository.clearAll();

    for (const table of database.tables) expect(await table.count()).toBe(0);
    await expect(database.readMutationState()).resolves.toBeNull();
    expect((await repository.readFullDataSnapshotWithMutationState()).epoch).toBe(0);
  });
});

describe("Schema v16 atomic full snapshot fingerprint admission", () => {
  async function createCaseFixture() {
    const database = createDatabase();
    const repository = new CaseRepository(database);
    const bundle = await repository.createCase({
      alias: "v16 fingerprint fixture",
      calculated: await calculatedChart()
    });
    return { database, repository, revisionId: bundle.revisions[0].id };
  }

  it("accepts an exact derived fingerprint index in the same readonly snapshot transaction", async () => {
    const { repository } = await createCaseFixture();
    const snapshot = await repository.readFullDataSnapshotWithMutationState();
    expect(snapshot.payload.cases).toHaveLength(1);
    expect(snapshot.payload.revisions).toHaveLength(1);
    expect(snapshot.epoch).toBe(1);
  });

  it("rejects a tampered derived fingerprint", async () => {
    const { database, repository, revisionId } = await createCaseFixture();
    const key = `revision:${revisionId}`;
    const fingerprint = await database.birthFingerprints.get(key);
    if (!fingerprint) throw new Error("fixture fingerprint missing");
    await database.birthFingerprints.put({ ...fingerprint, fingerprint: "1:tampered" });

    await expect(repository.readFullDataSnapshotWithMutationState())
      .rejects.toBeInstanceOf(BirthFingerprintIndexIntegrityError);
  });

  it("rejects a missing derived fingerprint", async () => {
    const { database, repository, revisionId } = await createCaseFixture();
    await database.birthFingerprints.delete(`revision:${revisionId}`);

    await expect(repository.readFullDataSnapshotWithMutationState())
      .rejects.toBeInstanceOf(BirthFingerprintIndexIntegrityError);
  });

  it("rejects an extra derived fingerprint", async () => {
    const { database, repository } = await createCaseFixture();
    await database.birthFingerprints.add({
      key: "revision:extra",
      sourceId: "extra",
      subjectId: "extra-case",
      recordType: "revision",
      fingerprint: "1:extra"
    });

    await expect(repository.readFullDataSnapshotWithMutationState())
      .rejects.toBeInstanceOf(BirthFingerprintIndexIntegrityError);
  });
});
