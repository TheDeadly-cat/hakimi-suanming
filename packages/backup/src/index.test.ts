import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  BirthInput,
  CoreBackupEnvelope,
  LegacyCoreBackupEnvelope,
  LegacyCoreBackupManifest,
  LegacyCoreBackupPayload,
  UnknownHourCandidateResult
} from "@hakimi/contracts";
import {
  LEGACY_HASH_SCHEMA_VERSION,
  LEGACY_UNIDENTIFIED_TZDB_VERSION,
  buildCalculatedChartHashPayload,
  buildUnknownHourCandidateHashPayload
} from "@hakimi/contracts";
import { calculateChart, calculateUnknownHourCandidates } from "@hakimi/bazi-core";
import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import { WORKING_DEFAULT_RULE_PROFILE, withDayBoundary } from "@hakimi/rule-profiles";
import { CaseRepository, ResearchDatabase, ResearchRepository } from "@hakimi/storage";
import {
  createCoreBackup,
  createFullBackup,
  applyPreparedFullBackup,
  importCoreBackup,
  prepareFullBackupImport,
  preflightCoreBackup,
  recomputeCoreBackupDigests,
  recomputeLegacyCoreBackupDigests,
  serializeCoreBackup
} from "./index";

const databases: ResearchDatabase[] = [];
const exportedAt = "2026-08-01T00:00:00.000Z";
const appVersion = "0.1.0-s0";

const input: BirthInput = {
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

function repository(): CaseRepository {
  const database = new ResearchDatabase(`hakimi-backup-test-${crypto.randomUUID()}`);
  databases.push(database);
  return new CaseRepository(database);
}

async function seedCase(target: CaseRepository, alias: string, revisionCount = 1) {
  const first = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
  let bundle = await target.createCase({ alias, tags: ["备份测试"], notes: "只验证核心 Case/Revision", calculated: first });
  if (revisionCount > 1) {
    const second = await calculateChart(input, withDayBoundary("midnight"));
    bundle = await target.addRevision(bundle.caseRecord.id, second);
  }
  return bundle;
}

async function asLegacyUnidentifiedCandidateSet(
  current: UnknownHourCandidateResult
): Promise<UnknownHourCandidateResult> {
  const legacy = structuredClone(current);
  legacy.hashSchemaVersion = LEGACY_HASH_SCHEMA_VERSION;
  legacy.tzdbVersion = LEGACY_UNIDENTIFIED_TZDB_VERSION;
  delete legacy.timeZoneDatabase;
  for (const candidate of legacy.candidates) {
    for (const variant of candidate.variants) {
      variant.chart.manifest.hashSchemaVersion = LEGACY_HASH_SCHEMA_VERSION;
      variant.chart.manifest.tzdbVersion = LEGACY_UNIDENTIFIED_TZDB_VERSION;
      delete variant.chart.manifest.timeZoneDatabase;
      variant.chart.manifest.resultHash = await sha256Hex(buildCalculatedChartHashPayload(variant.chart));
      variant.chartResultHash = variant.chart.manifest.resultHash;
    }
    if (candidate.chart) {
      candidate.chart.manifest.hashSchemaVersion = LEGACY_HASH_SCHEMA_VERSION;
      candidate.chart.manifest.tzdbVersion = LEGACY_UNIDENTIFIED_TZDB_VERSION;
      delete candidate.chart.manifest.timeZoneDatabase;
      candidate.chart.manifest.resultHash = await sha256Hex(buildCalculatedChartHashPayload(candidate.chart));
    }
  }
  legacy.resultHash = await sha256Hex(buildUnknownHourCandidateHashPayload(legacy));
  return legacy;
}

async function seedTzdbMigration(target: CaseRepository) {
  const current = await calculateUnknownHourCandidates({
    ...input,
    time: null,
    timePrecision: "unknown_hour"
  }, WORKING_DEFAULT_RULE_PROFILE);
  const source = await target.createCandidateSet({
    alias: "legacy-tzdb-source",
    candidateSet: await asLegacyUnidentifiedCandidateSet(current)
  });
  return target.deriveCandidateSetTzdbSnapshot({
    sourceCandidateSetId: source.id,
    expectedSourceSnapshotDigest: source.snapshotDigest,
    candidateSet: current
  });
}

async function backupOf(target: CaseRepository): Promise<CoreBackupEnvelope> {
  return createCoreBackup(target, { appVersion, exportedAt });
}

async function resign(envelope: CoreBackupEnvelope): Promise<void> {
  envelope.digests = await recomputeCoreBackupDigests({ manifest: envelope.manifest, payload: envelope.payload });
}

async function asSignedLegacyCoreEnvelope(current: CoreBackupEnvelope): Promise<LegacyCoreBackupEnvelope> {
  const payload: LegacyCoreBackupPayload = {
    cases: current.payload.cases.map((record) => {
      const {
        recordVersion: _recordVersion,
        favorite: _favorite,
        deletedAt: _deletedAt,
        ...legacy
      } = structuredClone(record);
      return legacy;
    }),
    revisions: structuredClone(current.payload.revisions)
  };
  const manifest: LegacyCoreBackupManifest = {
    ...current.manifest,
    formatVersion: "0.1.0"
  };
  return {
    manifest,
    payload,
    digests: await recomputeLegacyCoreBackupDigests({ manifest, payload })
  };
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(databases.splice(0).map(async (database) => {
    database.close();
    await database.delete();
  }));
});

describe("core cases/revisions backup", () => {
  it("往返导入后分区、payload 与 envelope 摘要一致", async () => {
    const source = repository();
    await seedCase(source, "来源案例", 2);
    const first = await backupOf(source);

    expect(first.manifest.scope).toBe("cases-revisions-only-not-v1-full-backup");
    expect(first.manifest.formatVersion).toBe("0.2.0");
    expect(first.manifest.counts).toEqual({ cases: 1, revisions: 2 });
    const verified = await preflightCoreBackup(serializeCoreBackup(first));
    expect(verified.digests).toEqual(first.digests);
    expect(verified.migratedFromFormatVersion).toBeNull();

    const destination = repository();
    await seedCase(destination, "导入时应被替换的旧案例");
    await importCoreBackup(destination, serializeCoreBackup(first));
    const second = await backupOf(destination);

    expect(second.payload).toEqual(first.payload);
    expect(second.digests).toEqual(first.digests);
    expect(canonicalStringify(second)).toBe(canonicalStringify(first));
    expect(await destination.database.birthFingerprints.count()).toBe(2);
  });

  it("strictly verifies core v0.1 before adding lifecycle defaults in v0.2", async () => {
    const source = repository();
    await seedCase(source, "legacy-core", 2);
    const legacy = await asSignedLegacyCoreEnvelope(await backupOf(source));
    legacy.payload.revisions.reverse();

    const retroactivelyExtended = structuredClone(legacy) as unknown as {
      payload: { cases: Array<Record<string, unknown>> };
    };
    retroactivelyExtended.payload.cases[0].recordVersion = 2;
    retroactivelyExtended.payload.cases[0].favorite = false;
    retroactivelyExtended.payload.cases[0].deletedAt = null;
    await expect(preflightCoreBackup(retroactivelyExtended)).rejects.toMatchObject({ code: "SCHEMA_INVALID" });

    const migrated = await preflightCoreBackup(legacy);
    expect(migrated.migratedFromFormatVersion).toBe("0.1.0");
    expect(migrated.manifest.formatVersion).toBe("0.2.0");
    expect(migrated.payload.cases[0]).toMatchObject({
      recordVersion: 2,
      favorite: false,
      deletedAt: null
    });

    legacy.payload.cases[0].alias = "unsigned mutation";
    await expect(preflightCoreBackup(legacy)).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });
  });

  it("摘要损坏时在写库前拒绝", async () => {
    const source = repository();
    await seedCase(source, "摘要来源");
    const damaged = await backupOf(source);
    damaged.payload.cases[0].alias = "被篡改但未重签";

    const destination = repository();
    const clearSpy = vi.spyOn(destination.database.cases, "clear");
    await expect(importCoreBackup(destination, damaged)).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });
    expect(clearSpy).not.toHaveBeenCalled();
  });

  it("即使重签外层摘要，也拒绝语义内容与 manifest.resultHash 不一致的 Revision", async () => {
    const source = repository();
    await seedCase(source, "命盘语义摘要来源");
    const envelope = await backupOf(source);
    envelope.payload.revisions[0].facts.pillars.day.nayin = "伪造纳音";
    await resign(envelope);

    await expect(preflightCoreBackup(envelope)).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });
  });

  it("拒绝 manifest 记录计数与 payload 不一致", async () => {
    const source = repository();
    await seedCase(source, "计数来源");
    const envelope = await backupOf(source);
    envelope.manifest.counts.revisions += 1;

    await expect(preflightCoreBackup(envelope)).rejects.toMatchObject({ code: "COUNT_MISMATCH" });
  });

  it("拒绝孤儿 Revision，即使攻击者重算了摘要", async () => {
    const source = repository();
    await seedCase(source, "孤儿来源");
    const envelope = await backupOf(source);
    envelope.payload.revisions[0].caseId = crypto.randomUUID();
    await resign(envelope);

    await expect(preflightCoreBackup(envelope)).rejects.toMatchObject({ code: "ORPHAN_REVISION" });
  });

  it("拒绝重复或跨分区冲突的 ID", async () => {
    const source = repository();
    await seedCase(source, "重复来源");
    const envelope = await backupOf(source);
    envelope.payload.revisions.push(structuredClone(envelope.payload.revisions[0]));
    envelope.manifest.counts.revisions += 1;
    await resign(envelope);

    await expect(preflightCoreBackup(envelope)).rejects.toMatchObject({ code: "DUPLICATE_ID" });
  });

  it.each([
    ["format", "hakimi-bazi-backup", "UNSUPPORTED_FORMAT"],
    ["formatVersion", "0.0.9", "UNSUPPORTED_FORMAT_VERSION"],
    ["formatVersion", "9.0.0", "UNSUPPORTED_FORMAT_VERSION"],
    ["schemaVersion", "0.9.0", "UNSUPPORTED_SCHEMA_VERSION"],
    ["schemaVersion", "9.0.0", "UNSUPPORTED_SCHEMA_VERSION"]
  ] as const)("拒绝旧或未知的 %s=%s", async (field, value, code) => {
    const source = repository();
    await seedCase(source, "版本来源");
    const envelope = await backupOf(source);
    (envelope.manifest as unknown as Record<string, unknown>)[field] = value;

    await expect(preflightCoreBackup(envelope)).rejects.toMatchObject({ code });
  });

  it("拒绝未知 envelope 字段和会被静默 trim 的记录", async () => {
    const source = repository();
    await seedCase(source, "严格来源");
    const unknownField = await backupOf(source) as CoreBackupEnvelope & { unexpected?: boolean };
    unknownField.unexpected = true;
    await expect(preflightCoreBackup(unknownField)).rejects.toMatchObject({ code: "SCHEMA_INVALID" });

    const trimmed = await backupOf(source);
    trimmed.payload.cases[0].alias = " 严格来源 ";
    await expect(preflightCoreBackup(trimmed)).rejects.toMatchObject({ code: "SCHEMA_INVALID" });

    const defaulted = await backupOf(source);
    delete (defaulted.payload.revisions[0].input as unknown as Record<string, unknown>).sourceNote;
    await expect(preflightCoreBackup(defaulted)).rejects.toMatchObject({ code: "SCHEMA_INVALID" });

    const nestedUnknown = await backupOf(source);
    (nestedUnknown.payload.revisions[0].input.location as unknown as Record<string, unknown>).unexpected = true;
    await expect(preflightCoreBackup(nestedUnknown)).rejects.toMatchObject({ code: "SCHEMA_INVALID" });
  });

  it("拒绝不连续 revisionNumber", async () => {
    const source = repository();
    await seedCase(source, "序号来源", 2);
    const envelope = await backupOf(source);
    envelope.payload.revisions[1].revisionNumber = 3;
    await resign(envelope);

    await expect(preflightCoreBackup(envelope)).rejects.toMatchObject({ code: "REVISION_SEQUENCE_INVALID" });
  });

  it.each(["count", "latest"] as const)("拒绝 Case 的 %s 摘要与 Revision 分区不一致", async (variant) => {
    const source = repository();
    await seedCase(source, "汇总来源", 2);
    const envelope = await backupOf(source);
    if (variant === "count") envelope.payload.cases[0].revisionCount = 1;
    else envelope.payload.cases[0].latestRevisionId = envelope.payload.revisions[0].id;
    await resign(envelope);

    await expect(preflightCoreBackup(envelope)).rejects.toMatchObject({ code: "CASE_REVISION_SUMMARY_MISMATCH" });
  });

  it("replace 写入失败时单事务完整恢复原 Case/Revision", async () => {
    const source = repository();
    await seedCase(source, "准备导入的新案例", 2);
    const envelope = await backupOf(source);

    const destination = repository();
    await seedCase(destination, "必须保留的旧案例");
    const before = await destination.readCoreDataSnapshot();
    vi.spyOn(destination.database.revisions, "bulkAdd").mockRejectedValueOnce(new Error("模拟 Revision 批量写入失败"));

    await expect(importCoreBackup(destination, envelope)).rejects.toThrow("模拟 Revision 批量写入失败");
    expect(await destination.readCoreDataSnapshot()).toEqual(before);
  });

  it("有依赖研究资料时返回稳定错误码，并完整保留原数据", async () => {
    const source = repository();
    await seedCase(source, "准备导入的新案例");
    const envelope = await backupOf(source);

    const destination = repository();
    const existing = await seedCase(destination, "必须保留的研究案例");
    const research = new ResearchRepository(destination.database);
    const note = await research.createResearchNote({
      caseId: existing.caseRecord.id,
      anchor: { kind: "case" },
      body: "这条研究笔记不在核心备份范围内。",
      tags: ["安全边界"],
      sourceRefs: [],
      lifecycle: "active"
    });
    const before = await destination.readCoreDataSnapshot();

    await expect(importCoreBackup(destination, envelope)).rejects.toMatchObject({
      code: "DEPENDENT_RESEARCH_DATA_EXISTS"
    });
    expect(await destination.readCoreDataSnapshot()).toEqual(before);
    expect(await research.getResearchNote(note.id)).toEqual(note);
  });

  it("拒绝用核心备份制造与本地候选组相同的跨分区 ID", async () => {
    const source = repository();
    await seedCase(source, "准备导入的新案例");
    const envelope = await backupOf(source);

    const destination = repository();
    const candidateSet = await calculateUnknownHourCandidates({
      ...input,
      time: null,
      timePrecision: "unknown_hour"
    }, WORKING_DEFAULT_RULE_PROFILE);
    const retained = await destination.createCandidateSet({ alias: "必须保留的候选组", candidateSet });
    envelope.payload.cases[0].id = retained.id;
    envelope.payload.revisions[0].caseId = retained.id;
    await resign(envelope);

    await expect(importCoreBackup(destination, envelope)).rejects.toMatchObject({
      code: "CROSS_PARTITION_ID_CONFLICT"
    });
    expect(await destination.getCandidateSet(retained.id)).toEqual(retained);
    expect(await destination.listCases()).toEqual([]);
  });

  it("treats receipt IDs as retained cross-partition identities and preserves the ledger on core-only restore", async () => {
    const source = repository();
    await seedCase(source, "incoming-core-with-receipt-boundary");
    const clean = await backupOf(source);

    const destination = repository();
    const derived = await seedTzdbMigration(destination);
    const beforeCandidateSets = await destination.listCandidateSets({ lifecycle: "all" });
    const conflicting = structuredClone(clean);
    conflicting.payload.cases[0].id = derived.receipt.id;
    conflicting.payload.revisions[0].caseId = derived.receipt.id;
    await resign(conflicting);

    await expect(importCoreBackup(destination, conflicting)).rejects.toMatchObject({
      code: "CROSS_PARTITION_ID_CONFLICT"
    });
    expect(await destination.database.tzdbMigrationReceipts.get(derived.receipt.id)).toEqual(derived.receipt);
    expect(await destination.listCandidateSets({ lifecycle: "all" })).toEqual(beforeCandidateSets);

    await importCoreBackup(destination, clean);
    expect(await destination.database.tzdbMigrationReceipts.get(derived.receipt.id)).toEqual(derived.receipt);
    expect(await destination.listCandidateSets({ lifecycle: "all" })).toEqual(beforeCandidateSets);
    await expect(destination.listTzdbMigrationReceiptsForCandidateSet(derived.target.id))
      .resolves.toEqual([derived.receipt]);
  });

  it("invalidates a prepared full restore when only the receipt ledger changes", async () => {
    const source = repository();
    await seedCase(source, "incoming-full-restore");
    const incoming = await createFullBackup(source, { appVersion, exportedAt });

    const destination = repository();
    const derived = await seedTzdbMigration(destination);
    const preparation = await prepareFullBackupImport(
      destination,
      incoming,
      { appVersion, exportedAt }
    );
    expect(preparation.currentSafetyBackup.payload.tzdbMigrationReceipts).toEqual([derived.receipt]);

    const changedReceipt = {
      ...derived.receipt,
      createdAt: new Date(Date.parse(derived.receipt.createdAt) + 1_000).toISOString()
    };
    await destination.database.tzdbMigrationReceipts.put(changedReceipt);

    await expect(applyPreparedFullBackup(destination, preparation)).rejects.toMatchObject({
      code: "CURRENT_DATA_CHANGED"
    });
    expect(await destination.database.tzdbMigrationReceipts.get(derived.receipt.id)).toEqual(changedReceipt);
    expect(await destination.database.candidateSets.count()).toBe(2);
  });
});
