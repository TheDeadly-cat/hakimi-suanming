import { afterEach, describe, expect, it, vi } from "vitest";
import Dexie from "dexie";
import { calculateChart } from "@hakimi/bazi-core";
import { SCHEMA_VERSION, type BirthInput } from "@hakimi/contracts";
import { CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE } from "@hakimi/revision-replay";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import {
  CaseRepository,
  ResearchDatabase
} from "./index";

const databases: ResearchDatabase[] = [];

const exactInput: BirthInput = {
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

const unspecifiedInput: BirthInput = { ...exactInput, sex: "unspecified" };
let exactChartPromise: ReturnType<typeof calculateChart> | undefined;
let unspecifiedChartPromise: ReturnType<typeof calculateChart> | undefined;

function exactChart() {
  exactChartPromise ??= calculateChart(exactInput, WORKING_DEFAULT_RULE_PROFILE);
  return exactChartPromise;
}

function unspecifiedChart() {
  unspecifiedChartPromise ??= calculateChart(unspecifiedInput, WORKING_DEFAULT_RULE_PROFILE);
  return unspecifiedChartPromise;
}

function createRepository(targetSchema: 14 | 15 = 15) {
  const database = new ResearchDatabase(
    `hakimi-revision-calculation-v${targetSchema}-${crypto.randomUUID()}`,
    { targetSchema }
  );
  databases.push(database);
  return new CaseRepository(database, () => "2026-08-03T12:00:00.000Z");
}

afterEach(async () => {
  vi.restoreAllMocks();
  const current = databases.splice(0);
  const names = [...new Set(current.map((database) => database.name))];
  for (const database of current) database.close();
  await Promise.all(names.map((name) => Dexie.delete(name)));
});

describe("Schema 15 Revision calculation receipt storage", () => {
  it("writes a baseline receipt atomically with createCase and addRevision", async () => {
    const repository = createRepository();
    const first = await repository.createCase({
      alias: "baseline receipts",
      calculated: await exactChart()
    });
    const firstRevision = first.revisions[0];
    const firstReceipts = await repository.listRevisionCalculationReceipts(firstRevision.id);

    expect(firstReceipts).toHaveLength(1);
    expect(firstReceipts[0]).toMatchObject({
      captureKind: "revision_creation_baseline",
      sourceRevision: {
        caseId: first.caseRecord.id,
        revisionId: firstRevision.id,
        revisionNumber: 1,
        natalResultHash: firstRevision.manifest.resultHash
      },
      projection: {
        request: { atInstant: null, manualDirection: null },
        transit: { status: "not_requested" }
      }
    });
    await expect(repository.readSingleChartExportSnapshot(
      first.caseRecord.id,
      firstRevision.id
    )).resolves.toMatchObject({
      revisionCalculationReceiptLedgerStatus: "available",
      revisionCalculationReceipts: [{ id: firstReceipts[0].id }]
    });
    await expect(repository.getRevisionCalculationReceipt(firstReceipts[0].id))
      .resolves.toEqual(firstReceipts[0]);

    const updated = await repository.addRevision(
      first.caseRecord.id,
      await calculateChart({ ...exactInput, time: "09:26" }, WORKING_DEFAULT_RULE_PROFILE)
    );
    const secondRevision = updated.revisions[1];
    const secondReceipts = await repository.listRevisionCalculationReceipts(secondRevision.id);
    expect(secondReceipts).toHaveLength(1);
    expect(secondReceipts[0].sourceRevision.revisionNumber).toBe(2);
    expect(await repository.database.revisionCalculationReceipts.count()).toBe(2);
  });

  it("rolls back every createCase and addRevision write if the baseline receipt add fails", async () => {
    const createRepositoryUnderTest = createRepository();
    await createRepositoryUnderTest.database.open();
    vi.spyOn(createRepositoryUnderTest.database.revisionCalculationReceipts, "add")
      .mockRejectedValueOnce(new Error("receipt write failed"));

    await expect(createRepositoryUnderTest.createCase({
      alias: "must roll back",
      calculated: await exactChart()
    })).rejects.toThrow("receipt write failed");
    await expect(Promise.all([
      createRepositoryUnderTest.database.cases.count(),
      createRepositoryUnderTest.database.revisions.count(),
      createRepositoryUnderTest.database.birthFingerprints.count(),
      createRepositoryUnderTest.database.revisionCalculationReceipts.count()
    ])).resolves.toEqual([0, 0, 0, 0]);

    vi.restoreAllMocks();
    const existing = await createRepositoryUnderTest.createCase({
      alias: "existing",
      calculated: await exactChart()
    });
    vi.spyOn(createRepositoryUnderTest.database.revisionCalculationReceipts, "add")
      .mockRejectedValueOnce(new Error("second receipt write failed"));

    await expect(createRepositoryUnderTest.addRevision(
      existing.caseRecord.id,
      await calculateChart({ ...exactInput, time: "10:26" }, WORKING_DEFAULT_RULE_PROFILE)
    )).rejects.toThrow("second receipt write failed");
    const reopened = await createRepositoryUnderTest.getCase(existing.caseRecord.id);
    expect(reopened?.caseRecord.revisionCount).toBe(1);
    await expect(Promise.all([
      createRepositoryUnderTest.database.revisions.count(),
      createRepositoryUnderTest.database.birthFingerprints.count(),
      createRepositoryUnderTest.database.revisionCalculationReceipts.count()
    ])).resolves.toEqual([1, 1, 1]);
  });

  it("keeps an unspecified-sex baseline partial instead of inventing a luck direction", async () => {
    const repository = createRepository();
    const created = await repository.createCase({
      alias: "unspecified sex",
      calculated: await unspecifiedChart()
    });
    const [receipt] = await repository.listRevisionCalculationReceipts(created.revisions[0].id);

    expect(receipt.projection.status).toBe("partial");
    expect(receipt.projection.luckCycle).toMatchObject({
      status: "unavailable",
      code: "manual_direction_required"
    });
    expect(receipt.projection.request.manualDirection).toBeNull();
    expect(receipt.projection.transit.status).toBe("not_requested");
  });

  it("appends distinct explicit Transit requests and rejects an exact duplicate fingerprint", async () => {
    const repository = createRepository();
    const created = await repository.createCase({
      alias: "explicit transit",
      calculated: await exactChart()
    });
    const revisionId = created.revisions[0].id;
    const firstRequest = {
      profile: CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE,
      atInstant: "2026-01-01T00:00:00.000Z"
    } as const;
    const secondRequest = {
      profile: CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE,
      atInstant: "2026-02-01T00:00:00.000Z"
    } as const;

    const first = await repository.appendRevisionCalculationReceipt({ revisionId, request: firstRequest });
    const second = await repository.appendRevisionCalculationReceipt({ revisionId, request: secondRequest });

    expect(first.captureKind).toBe("explicit_calculation_snapshot");
    expect(first.projection.transit.status).toBe("projected");
    expect(second.projection.transit.status).toBe("projected");
    expect(first.requestFingerprint).not.toBe(second.requestFingerprint);
    expect(first.projection.projectionDigest).not.toBe(second.projection.projectionDigest);
    expect(await repository.listRevisionCalculationReceipts(revisionId)).toHaveLength(3);

    await expect(repository.appendRevisionCalculationReceipt({ revisionId, request: firstRequest }))
      .rejects.toMatchObject({
        code: "DUPLICATE_REQUEST_FINGERPRINT"
      });
    expect(await repository.listRevisionCalculationReceipts(revisionId)).toHaveLength(3);
  });

  it("verifies the live Revision relationship when reading a receipt", async () => {
    const repository = createRepository();
    const created = await repository.createCase({
      alias: "source binding",
      calculated: await exactChart()
    });
    const revision = created.revisions[0];
    const [receipt] = await repository.listRevisionCalculationReceipts(revision.id);
    await repository.database.revisions.put({
      ...structuredClone(revision),
      caseId: crypto.randomUUID()
    });

    await expect(repository.getRevisionCalculationReceipt(receipt.id))
      .rejects.toMatchObject({
        code: "RECEIPT_SOURCE_MISMATCH"
      });
  });

  it("keeps trashed cases read-only until they are explicitly restored", async () => {
    const repository = createRepository();
    const created = await repository.createCase({ alias: "trash guard", calculated: await exactChart() });
    const revisionId = created.revisions[0].id;
    const request = {
      profile: CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE,
      atInstant: "2026-04-01T00:00:00.000Z"
    } as const;
    await repository.trashCase(created.caseRecord.id);

    await expect(repository.appendRevisionCalculationReceipt({ revisionId, request }))
      .rejects.toMatchObject({ code: "CASE_TRASHED" });
    expect(await repository.database.revisionCalculationReceipts.count()).toBe(1);

    await repository.restoreCase(created.caseRecord.id);
    await expect(repository.appendRevisionCalculationReceipt({ revisionId, request }))
      .resolves.toMatchObject({ captureKind: "explicit_calculation_snapshot" });
  });

  it("cascades receipts through permanent Case deletion and clearAll", async () => {
    const repository = createRepository();
    const deleted = await repository.createCase({ alias: "delete me", calculated: await exactChart() });
    await repository.appendRevisionCalculationReceipt({
      revisionId: deleted.revisions[0].id,
      request: {
        profile: CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE,
        atInstant: "2026-03-01T00:00:00.000Z"
      }
    });
    await repository.trashCase(deleted.caseRecord.id);
    await repository.deleteCase(deleted.caseRecord.id);
    expect(await repository.database.revisionCalculationReceipts.count()).toBe(0);

    await repository.createCase({ alias: "clear me", calculated: await exactChart() });
    expect(await repository.database.revisionCalculationReceipts.count()).toBe(1);
    await repository.clearAll();
    expect(await repository.database.revisionCalculationReceipts.count()).toBe(0);
  });

  it("keeps core backup fail-closed while full v1.2 snapshots round-trip receipts", async () => {
    const repository = createRepository();
    const emptyCore = await repository.readCoreDataSnapshot();
    const emptyFull = await repository.readFullDataSnapshot();
    const created = await repository.createCase({
      alias: "must not be omitted by legacy backup",
      calculated: await exactChart()
    });

    for (const operation of [
      () => repository.readCoreDataSnapshot(),
      () => repository.replaceCoreDataSnapshot(emptyCore)
    ]) {
      await expect(operation()).rejects.toMatchObject({
        code: "CALCULATION_RECEIPTS_OMITTED_BY_BACKUP_FORMAT",
        receiptCount: 1
      });
    }

    const full = await repository.readFullDataSnapshot();
    expect(full.revisionCalculationReceipts).toHaveLength(1);
    await repository.replaceFullDataSnapshot(full);
    expect(await repository.database.cases.get(created.caseRecord.id)).toBeTruthy();
    expect(await repository.database.revisions.get(created.revisions[0].id)).toBeTruthy();
    expect(await repository.database.revisionCalculationReceipts.count()).toBe(1);

    await repository.replaceFullDataSnapshot(emptyFull);
    expect(await repository.database.cases.count()).toBe(0);
    expect(await repository.database.revisionCalculationReceipts.count()).toBe(0);
  });

  it("leaves schema 14 create/add behavior unchanged and fails receipt APIs closed", async () => {
    const repository = createRepository(14);
    const created = await repository.createCase({ alias: "v14", calculated: await exactChart() });
    const updated = await repository.addRevision(
      created.caseRecord.id,
      await calculateChart({ ...exactInput, time: "11:26" }, WORKING_DEFAULT_RULE_PROFILE)
    );

    expect(updated.revisions).toHaveLength(2);
    expect(repository.database.tables.map((table) => table.name)).not.toContain("revisionCalculationReceipts");
    await expect(repository.readSingleChartExportSnapshot(
      created.caseRecord.id,
      updated.revisions[0].id
    )).resolves.toMatchObject({
      revisionCalculationReceiptLedgerStatus: "schema_unavailable",
      revisionCalculationReceipts: []
    });
    await expect(repository.listRevisionCalculationReceipts(updated.revisions[0].id))
      .rejects.toMatchObject({ code: "SCHEMA_UNSUPPORTED" });
  });

  it("allows empty full v1.2 payloads on Schema 14 but rejects non-empty receipts without writing", async () => {
    const source = createRepository(15);
    await source.createCase({ alias: "v15 source", calculated: await exactChart() });
    const nonEmpty = await source.readFullDataSnapshot();
    const destination = createRepository(14);

    await expect(destination.replaceFullDataSnapshot(nonEmpty)).rejects.toMatchObject({
      code: "SCHEMA_UNSUPPORTED"
    });
    expect(await destination.database.cases.count()).toBe(0);
    expect(await destination.database.revisions.count()).toBe(0);

    await destination.replaceFullDataSnapshot({
      ...nonEmpty,
      cases: [],
      revisions: [],
      revisionCalculationReceipts: []
    });
    expect(await destination.readFullDataSnapshot()).toMatchObject({
      cases: [],
      revisions: [],
      revisionCalculationReceipts: []
    });
  });

  it("rolls back all sixteen partitions when receipt restoration fails", async () => {
    const destination = createRepository(15);
    const retained = await destination.createCase({
      alias: "retained after rollback",
      calculated: await exactChart()
    });
    const source = createRepository(15);
    const incomingCase = await source.createCase({
      alias: "incoming must roll back",
      calculated: await calculateChart(
        { ...exactInput, time: "10:26" },
        WORKING_DEFAULT_RULE_PROFILE
      )
    });
    const incoming = await source.readFullDataSnapshot();
    await destination.database.open();
    vi.spyOn(destination.database.revisionCalculationReceipts, "bulkAdd")
      .mockRejectedValueOnce(new DOMException("quota", "QuotaExceededError"));

    await expect(destination.replaceFullDataSnapshot(incoming)).rejects.toBeTruthy();
    expect(await destination.database.cases.get(retained.caseRecord.id)).toBeTruthy();
    expect(await destination.database.revisions.get(retained.revisions[0].id)).toBeTruthy();
    expect(await destination.database.revisionCalculationReceipts.count()).toBe(1);
    expect(await destination.database.cases.get(incomingCase.caseRecord.id)).toBeUndefined();
  });
});
