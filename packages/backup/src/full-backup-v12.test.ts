import { afterEach, describe, expect, it } from "vitest";
import Dexie from "dexie";
import { calculateChart } from "@hakimi/bazi-core";
import {
  EVENT_TIME_MIGRATION_FULL_BACKUP_FORMAT_VERSION,
  FULL_BACKUP_FORMAT_VERSION,
  SCHEMA_VERSION,
  eventTimeMigrationFullBackupEnvelopeSchema,
  eventTimeMigrationFullBackupManifestSchema,
  eventTimeMigrationFullBackupPayloadSchema,
  type BirthInput,
  type FullBackupEnvelope
} from "@hakimi/contracts";
import { sha256Hex } from "@hakimi/integrity";
import {
  CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE,
  createRevisionCalculationReceipt
} from "@hakimi/revision-replay";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { CaseRepository, ResearchDatabase } from "@hakimi/storage";
import {
  applyPreparedFullBackup,
  createFullBackup,
  preflightFullBackup,
  prepareFullBackupImport,
  recomputeEventTimeMigrationFullBackupDigests,
  recomputeFullBackupDigests,
  serializeFullBackup
} from "./index";

const databases: ResearchDatabase[] = [];
const exportedAt = "2026-08-03T08:00:00.000Z";
const options = { appVersion: "0.2.0-p0", exportedAt } as const;
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

let chartPromise: ReturnType<typeof calculateChart> | undefined;

function chart() {
  chartPromise ??= calculateChart(exactInput, WORKING_DEFAULT_RULE_PROFILE);
  return chartPromise;
}

function repository(targetSchema: 14 | 15, now = "2026-08-03T07:00:00.000Z") {
  const database = new ResearchDatabase(
    `hakimi-full-v12-${targetSchema}-${crypto.randomUUID()}`,
    { targetSchema }
  );
  databases.push(database);
  return new CaseRepository(database, () => now);
}

async function resign(envelope: FullBackupEnvelope): Promise<void> {
  envelope.digests = await recomputeFullBackupDigests({
    manifest: envelope.manifest,
    payload: envelope.payload
  });
}

afterEach(async () => {
  const current = databases.splice(0);
  const names = [...new Set(current.map((database) => database.name))];
  current.forEach((database) => database.close());
  await Promise.all(names.map((name) => Dexie.delete(name)));
});

describe("full backup v1.2 Revision calculation receipts", () => {
  it("round-trips baseline and explicit receipts through serialize, preflight and Schema 15 restore", async () => {
    const source = repository(15);
    const created = await source.createCase({ alias: "v1.2 receipts", calculated: await chart() });
    await source.appendRevisionCalculationReceipt({
      revisionId: created.revisions[0].id,
      request: {
        profile: CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE,
        atInstant: "2026-03-01T00:00:00.000Z"
      }
    });

    const first = await createFullBackup(source, options);
    expect(first.manifest).toMatchObject({
      formatVersion: FULL_BACKUP_FORMAT_VERSION,
      counts: { revisionCalculationReceipts: 2 }
    });
    expect(first.digests.revisionCalculationReceipts).toBe(
      await sha256Hex(first.payload.revisionCalculationReceipts)
    );

    const verified = await preflightFullBackup(serializeFullBackup(first));
    const destination = repository(15);
    await destination.replaceFullDataSnapshot(verified.payload);
    const second = await createFullBackup(destination, options);

    expect(second.payload).toEqual(first.payload);
    expect(second.digests).toEqual(first.digests);
    expect(await destination.database.revisionCalculationReceipts.count()).toBe(2);
  });

  it("verifies frozen v1.1 before adding one empty partition and never backfills old Revisions", async () => {
    const source = repository(14);
    await source.createCase({ alias: "frozen v1.1", calculated: await chart() });
    const current = await createFullBackup(source, options);
    const { revisionCalculationReceipts: _currentReceipts, ...legacyPayloadRaw } = current.payload;
    const { revisionCalculationReceipts: _currentCount, ...legacyCounts } = current.manifest.counts;
    const legacyPayload = eventTimeMigrationFullBackupPayloadSchema.parse(legacyPayloadRaw);
    const legacyManifest = eventTimeMigrationFullBackupManifestSchema.parse({
      ...current.manifest,
      formatVersion: EVENT_TIME_MIGRATION_FULL_BACKUP_FORMAT_VERSION,
      counts: legacyCounts
    });
    const legacyDigests = await recomputeEventTimeMigrationFullBackupDigests({
      manifest: legacyManifest,
      payload: legacyPayload
    });
    const frozen = eventTimeMigrationFullBackupEnvelopeSchema.parse({
      manifest: legacyManifest,
      digests: legacyDigests,
      payload: legacyPayload
    });

    const migrated = await preflightFullBackup(frozen);
    expect(migrated.migratedFromFormatVersion).toBe(
      EVENT_TIME_MIGRATION_FULL_BACKUP_FORMAT_VERSION
    );
    expect(migrated.manifest.formatVersion).toBe(FULL_BACKUP_FORMAT_VERSION);
    expect(migrated.payload.revisionCalculationReceipts).toEqual([]);

    const destination = repository(15);
    await destination.replaceFullDataSnapshot(migrated.payload);
    expect(await destination.database.revisions.count()).toBe(1);
    expect(await destination.database.revisionCalculationReceipts.count()).toBe(0);

    await expect(preflightFullBackup({
      ...frozen,
      payload: { ...frozen.payload, revisionCalculationReceipts: [] }
    })).rejects.toMatchObject({ code: "SCHEMA_INVALID" });
  });

  it("rejects a re-signed outer backup when a receipt's inner digest is stale", async () => {
    const source = repository(15);
    await source.createCase({ alias: "inner integrity", calculated: await chart() });
    const envelope = structuredClone(await createFullBackup(source, options));
    envelope.payload.revisionCalculationReceipts[0]!.receiptDigest = "0".repeat(64);
    await resign(envelope);

    await expect(preflightFullBackup(envelope)).rejects.toMatchObject({
      code: "REVISION_CALCULATION_RECEIPT_INTEGRITY_MISMATCH"
    });
  });

  it("rejects orphan, source-mismatched and duplicate-request receipts before restore", async () => {
    const source = repository(15);
    const created = await source.createCase({ alias: "relationship gates", calculated: await chart() });

    const orphan = structuredClone(await createFullBackup(source, options));
    orphan.payload.cases = [];
    orphan.payload.revisions = [];
    orphan.manifest.counts.cases = 0;
    orphan.manifest.counts.revisions = 0;
    await resign(orphan);
    await expect(preflightFullBackup(orphan)).rejects.toMatchObject({
      code: "ORPHAN_REVISION_CALCULATION_RECEIPT"
    });

    const sourceMismatch = structuredClone(await createFullBackup(source, options));
    sourceMismatch.payload.revisions[0]!.createdAt = "2026-08-03T07:00:01.000Z";
    await resign(sourceMismatch);
    await expect(preflightFullBackup(sourceMismatch)).rejects.toMatchObject({
      code: "REVISION_CALCULATION_RECEIPT_CONTEXT_MISMATCH"
    });

    const duplicate = structuredClone(await createFullBackup(source, options));
    const secondBaseline = await createRevisionCalculationReceipt(
      created.revisions[0],
      { profile: CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE },
      {
        id: crypto.randomUUID(),
        createdAt: created.revisions[0].createdAt,
        captureKind: "revision_creation_baseline"
      }
    );
    duplicate.payload.revisionCalculationReceipts.push(secondBaseline);
    duplicate.manifest.counts.revisionCalculationReceipts = 2;
    await resign(duplicate);
    await expect(preflightFullBackup(duplicate)).rejects.toMatchObject({
      code: "DUPLICATE_REVISION_CALCULATION_REQUEST"
    });
  });

  it("detects a receipt appended after restore preparation and leaves all current data untouched", async () => {
    const destination = repository(15);
    const created = await destination.createCase({
      alias: "CAS destination",
      calculated: await chart()
    });
    const incoming = await createFullBackup(repository(15), options);
    const preparation = await prepareFullBackupImport(destination, incoming, options);

    await destination.appendRevisionCalculationReceipt({
      revisionId: created.revisions[0].id,
      request: {
        profile: CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE,
        atInstant: "2027-01-01T00:00:00.000Z"
      }
    });

    await expect(applyPreparedFullBackup(destination, preparation)).rejects.toMatchObject({
      code: "CURRENT_DATA_CHANGED"
    });
    expect(await destination.database.cases.count()).toBe(1);
    expect(await destination.database.revisions.count()).toBe(1);
    expect(await destination.database.revisionCalculationReceipts.count()).toBe(2);
  });
});
