import { afterEach, describe, expect, it, vi } from "vitest";
import Dexie, { type Transaction } from "dexie";
import { calculateChart } from "@hakimi/bazi-core";
import { SCHEMA_VERSION, type CalculatedChart, type FullBackupPayload } from "@hakimi/contracts";
import * as chartIntegrity from "@hakimi/chart-integrity";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { sha256Hex } from "@hakimi/integrity";
import { CaseRepository, ReleaseDatabaseWriteLockedError, ResearchDatabase } from "./index";

const databases: ResearchDatabase[] = [];
let chart: Promise<CalculatedChart> | undefined;
function repository() {
  const database = new ResearchDatabase(`full-snapshot-scheduling-${crypto.randomUUID()}`);
  databases.push(database);
  return new CaseRepository(database);
}

async function capacitySnapshot(): Promise<FullBackupPayload> {
  chart ??= calculateChart({
    schemaVersion: SCHEMA_VERSION, calendarType: "gregorian", date: "1995-08-18", time: "08:26",
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
    location: { label: "", latitude: null, longitude: null, precision: "unknown" }, sourceNote: ""
  }, WORKING_DEFAULT_RULE_PROFILE);
  const source = repository();
  const seed = await source.createCase({ alias: "captured before yielding", calculated: await chart });
  const snapshot = await source.readFullDataSnapshot();
  snapshot.cases = [];
  snapshot.revisions = [];
  for (let index = 0; index < 512; index++) {
    const caseId = `20000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
    const revisionId = `30000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
    snapshot.cases.push({ ...structuredClone(seed.caseRecord), id: caseId, latestRevisionId: revisionId });
    snapshot.revisions.push({ ...structuredClone(seed.revisions[0]!), id: revisionId, caseId });
  }
  return snapshot;
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(databases.splice(0).map(database => database.delete()));
});

describe("full snapshot replacement scheduling", () => {
  it("checks the destination CAS when the prepared replacement is invoked", async () => {
    const snapshot = await capacitySnapshot();
    const target = repository();
    await target.createCase({ alias: "keep concurrent destination", calculated: await chart! });
    const expectedCurrentPayloadDigest = await sha256Hex(await target.readFullDataSnapshot());
    const materialize = await target.prepareFullDataSnapshotReplacement(snapshot, { expectedCurrentPayloadDigest });
    await target.saveAppSettings({
      defaultTimeZone: "Asia/Shanghai", defaultCalendarType: "gregorian", preferredDensity: "compact"
    });
    const changedDestination = await target.readFullDataSnapshot();

    await expect(materialize()).rejects.toMatchObject({ code: "CURRENT_DATA_CHANGED" });
    expect(await target.readFullDataSnapshot()).toEqual(changedDestination);
  });

  it("prepares a shadow replacement without granting writes and preserves the original migration permission", async () => {
    const snapshot = await capacitySnapshot();
    const database = new ResearchDatabase(`full-snapshot-privileged-${crypto.randomUUID()}`, {
      targetSchema: 16, releaseWritesLocked: true
    });
    databases.push(database);
    await database.open();
    const target = new CaseRepository(database);
    const materialize = await target.prepareFullDataSnapshotReplacement(snapshot);
    snapshot.cases[0]!.alias = "changed after preparation";
    expect(await database.cases.count()).toBe(0);
    await expect(materialize()).rejects.toBeInstanceOf(ReleaseDatabaseWriteLockedError);
    expect(await database.cases.count()).toBe(0);
    let privilegedTransaction: Transaction | null = null;
    const abortStalledTest = setTimeout(() => privilegedTransaction?.abort(), 10_000);
    try {
      const unrelated = new Promise<unknown>(resolve => {
        setTimeout(() => {
          void Dexie.ignoreTransaction(() => database.appSettings.put({ id: "unrelated" } as never))
            .then(() => resolve(null), resolve);
        }, 0);
      });
      const replacement = database.withReleaseMigrationWriteAccess(() => {
        privilegedTransaction = Dexie.currentTransaction;
        return materialize();
      });
      await expect(replacement).resolves.toBeUndefined();
      expect(await unrelated).toBeInstanceOf(ReleaseDatabaseWriteLockedError);
      expect(await database.revisions.count()).toBe(512);
      expect(await database.cases.get(snapshot.cases[0]!.id))
        .toMatchObject({ alias: "captured before yielding" });
      expect(await database.appSettings.count()).toBe(0);
      await expect(database.appSettings.put({ id: "still-locked" } as never))
        .rejects.toBeInstanceOf(ReleaseDatabaseWriteLockedError);
    } finally {
      clearTimeout(abortStalledTest);
    }
  }, 15_000);

  it.each([false, true])("services pending page tasks before finishing revision validation; late corruption=%s", async lateCorruption => {
    const snapshot = await capacitySnapshot();
    const target = repository();
    await target.createCase({ alias: "previous destination", calculated: await chart! });
    const previous = await target.readFullDataSnapshot();
    const lastRevision = snapshot.revisions.at(-1)!;
    const originalHash = lastRevision.manifest.resultHash;
    if (lateCorruption) lastRevision.manifest.resultHash = "0".repeat(64);

    const validation = vi.spyOn(chartIntegrity, "verifyRevisionRecordIntegrity");
    const transactions = vi.spyOn(target.database, "transaction");
    const nextPageTask = new Promise<{ started: number; transactions: number }>(resolve => {
      setTimeout(() => resolve({ started: validation.mock.calls.length, transactions: transactions.mock.calls.length }), 0);
    });
    const replacement = target.replaceFullDataSnapshot(snapshot).then(() => null, (error: unknown) => error);
    // The source must be captured before any yield. Neither a late edit nor a
    // late repair may change which values the destination validates and writes.
    snapshot.cases[0]!.alias = "changed by caller after invocation";
    lastRevision.manifest.resultHash = originalHash;
    const observed = await nextPageTask;
    const failure = await replacement;

    expect(observed.started).toBeGreaterThan(0);
    expect(observed.started).toBeLessThan(snapshot.revisions.length);
    expect(observed.transactions).toBe(0);
    if (lateCorruption) {
      expect(failure).toBeInstanceOf(chartIntegrity.CalculatedChartIntegrityError);
      expect(await target.readFullDataSnapshot()).toEqual(previous);
    } else {
      expect(failure).toBeNull();
      expect(await target.database.revisions.count()).toBe(512);
      expect(await target.database.cases.get(snapshot.cases[0]!.id))
        .toMatchObject({ alias: "captured before yielding" });
    }
  }, 30_000);
});
