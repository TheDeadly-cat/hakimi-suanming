import { afterEach, describe, expect, it, vi } from "vitest";
import Dexie from "dexie";
import { calculateChart, calculateUnknownHourCandidates } from "@hakimi/bazi-core";
import { sha256Hex } from "@hakimi/integrity";
import {
  LOCAL_ATTACHMENT_RECORD_VERSION,
  LOCAL_RULE_REGISTRY_RECORD_VERSION,
  SCHEMA_VERSION,
  citationTargetKeys,
  type ActiveRulePackRecord,
  type BirthInput,
  type FullBackupPayload,
  type InstalledRulePackRecord,
  type LocalAttachmentRecord
} from "@hakimi/contracts";
import {
  CaseRepository,
  FullDataReplaceConflictError,
  KnowledgeRepository,
  LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_ENCODED_CHARACTERS,
  LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHED_BYTES,
  LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHES,
  LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_SCAN_ROWS,
  LocalAttachmentIntegrityError,
  ResearchDatabase,
  RuleRegistryRepository
} from "./index";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";

const databases: Dexie[] = [];

const PACK_DIGEST_A = "a".repeat(64);
const PACK_DIGEST_B = "b".repeat(64);
const PROFILE_DIGEST_A = "c".repeat(64);
const PROFILE_DIGEST_B = "d".repeat(64);

function storedAttachment(
  overrides: Partial<LocalAttachmentRecord> = {}
): LocalAttachmentRecord {
  return {
    schemaVersion: SCHEMA_VERSION,
    recordVersion: LOCAL_ATTACHMENT_RECORD_VERSION,
    recordType: "local_attachment",
    id: crypto.randomUUID(),
    fileName: "metadata.bin",
    mediaType: "application/octet-stream",
    byteLength: 1,
    contentBase64: "AA==",
    contentHash: "0".repeat(64),
    description: "",
    link: null,
    createdAt: "2026-08-02T00:00:00.000Z",
    updatedAt: "2026-08-02T00:00:00.000Z",
    ...overrides
  };
}

function indexedAttachmentId(index: number): string {
  return `00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
}

function canonicalZeroBase64(byteLength: number): string {
  const completeTriples = Math.floor(byteLength / 3);
  const remainder = byteLength % 3;
  return "AAAA".repeat(completeTriples) + (remainder === 1 ? "AA==" : remainder === 2 ? "AAA=" : "");
}

function installedRulePack(
  overrides: Partial<InstalledRulePackRecord> = {}
): InstalledRulePackRecord {
  const packDigest = overrides.packDigest ?? overrides.id ?? PACK_DIGEST_A;
  return {
    schemaVersion: SCHEMA_VERSION,
    recordVersion: LOCAL_RULE_REGISTRY_RECORD_VERSION,
    recordType: "installed_rule_pack",
    id: packDigest,
    packDigest,
    profileDigest: PROFILE_DIGEST_A,
    packId: "hakimi-test-pack",
    profileId: "hakimi-test-profile",
    profileVersion: "1.0.0",
    canonicalJson: '{"kind":"rule-pack-test"}',
    localTrust: "unverified_local_import",
    importedAt: "2026-08-02T00:00:00.000Z",
    ...overrides
  };
}

function activeRulePack(
  installed: InstalledRulePackRecord,
  overrides: Partial<ActiveRulePackRecord> = {}
): ActiveRulePackRecord {
  const activatedAt = overrides.activatedAt ?? "2026-08-02T00:01:00.000Z";
  return {
    schemaVersion: SCHEMA_VERSION,
    recordVersion: LOCAL_RULE_REGISTRY_RECORD_VERSION,
    recordType: "active_rule_pack",
    id: "active-rule-pack",
    activeDigest: installed.packDigest,
    activeProfileDigest: installed.profileDigest,
    activatedAt,
    approval: {
      status: "locally_approved_for_activation",
      acknowledgedAt: activatedAt,
      acknowledgementVersion: "rule-pack-local-approval@1",
      appVersion: "0.2.0-p0",
      engineName: "hakimi-bazi-core",
      engineVersion: "0.2.0"
    },
    ...overrides
  };
}

function createRepository(now = "2026-08-02T00:00:00.000Z") {
  const database = new ResearchDatabase(`hakimi-local-user-data-${crypto.randomUUID()}`);
  databases.push(database);
  return new CaseRepository(database, () => now);
}

afterEach(async () => {
  vi.restoreAllMocks();
  const current = databases.splice(0);
  const names = [...new Set(current.map((database) => database.name))];
  for (const database of current) database.close();
  await Promise.all(names.map((name) => Dexie.delete(name)));
});

describe("local researcher profile and application settings", () => {
  it("uses fixed singleton IDs, preserves createdAt, and validates canonical settings", async () => {
    const repository = createRepository();

    expect(await repository.readResearcherProfile()).toBeNull();
    expect(await repository.readAppSettings()).toBeNull();

    const profile = await repository.saveResearcherProfile({
      displayName: "哈基米研究者",
      organization: "本地研究室",
      researchFocus: "八字案例校验"
    });
    const settings = await repository.saveAppSettings({
      defaultTimeZone: "Asia/Shanghai",
      defaultCalendarType: "gregorian",
      preferredDensity: "compact"
    });

    expect(profile.id).toBe("local-researcher-profile");
    expect(settings).toMatchObject({
      id: "local-app-settings",
      locale: "zh-CN",
      defaultTimeZone: "Asia/Shanghai",
      preferredDensity: "compact"
    });
    expect(await repository.readResearcherProfile()).toEqual(profile);
    expect(await repository.readAppSettings()).toEqual(settings);
    expect(await repository.database.researcherProfiles.count()).toBe(1);
    expect(await repository.database.appSettings.count()).toBe(1);

    await expect(repository.saveAppSettings({
      defaultTimeZone: "Not/AZone",
      defaultCalendarType: "lunar",
      preferredDensity: "comfortable"
    })).rejects.toThrow();
    expect(await repository.readAppSettings()).toEqual(settings);
  });
});

describe("rule registry database migration", () => {
  it("upgrades v10 to the current v14 without rewriting existing rows", async () => {
    const name = `hakimi-rule-registry-upgrade-${crypto.randomUUID()}`;
    const legacy = new Dexie(name);
    databases.push(legacy);
    legacy.version(10).stores({
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
      birthFingerprints: "key, fingerprint, sourceId, subjectId, recordType"
    });
    const sentinel = {
      id: "local-app-settings",
      marker: "preserve-v10-byte-for-byte",
      nested: { value: 7 }
    };
    await legacy.open();
    await legacy.table("appSettings").add(sentinel);
    expect(legacy.verno).toBe(10);
    legacy.close();

    const upgraded = new ResearchDatabase(name);
    databases.push(upgraded);
    await upgraded.open();

    expect(upgraded.verno).toBe(14);
    expect(await upgraded.table("appSettings").get(sentinel.id)).toEqual(sentinel);
    expect(await upgraded.ruleRegistry.count()).toBe(0);
    expect(await upgraded.tzdbMigrationReceipts.count()).toBe(0);
  });
});

describe("local rule registry", () => {
  it("installs immutable packs, rejects version conflicts, and protects activation", async () => {
    const caseRepository = createRepository();
    const registry = new RuleRegistryRepository(caseRepository.database);
    const installed = installedRulePack();

    expect(await registry.listInstalledRulePacks()).toEqual([]);
    expect(await registry.getInstalledRulePack(installed.packDigest)).toBeNull();
    expect(await registry.getActiveRulePack()).toBeNull();

    expect(await registry.installRulePack(installed)).toEqual(installed);
    expect(await registry.getInstalledRulePack(installed.packDigest)).toEqual(installed);
    expect(await registry.listInstalledRulePacks()).toEqual([installed]);

    const reimported = { ...installed, importedAt: "2026-08-03T00:00:00.000Z" };
    expect(await registry.installRulePack(reimported)).toEqual(installed);
    expect(await caseRepository.database.ruleRegistry.count()).toBe(1);

    await expect(registry.installRulePack({
      ...installed,
      canonicalJson: '{"kind":"different-content"}'
    })).rejects.toMatchObject({ code: "RULE_PACK_DIGEST_COLLISION" });

    const conflictingVersion = installedRulePack({
      id: PACK_DIGEST_B,
      packDigest: PACK_DIGEST_B,
      profileDigest: PROFILE_DIGEST_B,
      canonicalJson: '{"kind":"conflicting-version"}'
    });
    await expect(registry.installRulePack(conflictingVersion)).rejects.toMatchObject({
      code: "RULE_PACK_VERSION_CONFLICT"
    });
    expect(await registry.listInstalledRulePacks()).toEqual([installed]);

    await expect(registry.activateRulePack(activeRulePack(conflictingVersion))).rejects.toMatchObject({
      code: "RULE_PACK_NOT_FOUND"
    });
    await expect(registry.activateRulePack({
      ...activeRulePack(installed),
      activeProfileDigest: PROFILE_DIGEST_B
    })).rejects.toMatchObject({ code: "ACTIVE_RULE_PACK_PROFILE_DIGEST_MISMATCH" });

    const active = activeRulePack(installed);
    expect(await registry.activateRulePack(active)).toEqual(active);
    expect(await registry.getActiveRulePack()).toEqual(active);
    await expect(registry.deleteInstalledRulePack(installed.packDigest)).rejects.toMatchObject({
      code: "ACTIVE_RULE_PACK_DELETE_FORBIDDEN"
    });

    await registry.deactivateRulePack();
    expect(await registry.getActiveRulePack()).toBeNull();
    await registry.deleteInstalledRulePack(installed.packDigest);
    expect(await registry.getInstalledRulePack(installed.packDigest)).toBeNull();
    await expect(registry.deleteInstalledRulePack(installed.packDigest)).rejects.toMatchObject({
      code: "RULE_PACK_NOT_FOUND"
    });
  });

  it("reports a dangling active selector instead of silently falling back", async () => {
    const caseRepository = createRepository();
    const registry = new RuleRegistryRepository(caseRepository.database);
    const missing = installedRulePack();
    await caseRepository.database.ruleRegistry.add(activeRulePack(missing));

    await expect(registry.getActiveRulePack()).rejects.toMatchObject({
      code: "ACTIVE_RULE_PACK_DANGLING_REFERENCE"
    });
    await expect(caseRepository.readFullDataSnapshot()).rejects.toMatchObject({
      code: "ACTIVE_RULE_PACK_DANGLING_REFERENCE"
    });
  });
});

describe("local attachments", () => {
  it("round-trips exact bytes and rejects missing link targets", async () => {
    const repository = createRepository();
    const bytes = Uint8Array.from([0, 1, 2, 127, 128, 253, 254, 255]);
    const attachment = await repository.createAttachment({
      fileName: "校验样本.bin",
      mediaType: "application/octet-stream",
      bytes,
      description: "本地二进制样本"
    });

    expect(attachment.byteLength).toBe(bytes.byteLength);
    expect(attachment.contentBase64).toBe("AAECf4D9/v8=");
    expect(await repository.readAttachmentBytes(attachment.id)).toEqual(bytes);
    expect(await repository.listAttachments()).toEqual([attachment]);

    await expect(repository.createAttachment({
      fileName: "orphan.txt",
      mediaType: "text/plain",
      bytes: new TextEncoder().encode("orphan"),
      link: { kind: "research_subject", subjectId: crypto.randomUUID() }
    })).rejects.toMatchObject({ code: "LINK_TARGET_NOT_FOUND" });
    expect(await repository.database.attachments.count()).toBe(1);

    await repository.deleteAttachment(attachment.id);
    expect(await repository.readAttachmentBytes(attachment.id)).toBeNull();
    await expect(repository.deleteAttachment(attachment.id)).rejects.toMatchObject({
      code: "ATTACHMENT_NOT_FOUND"
    });
  });

  it("atomically deduplicates concurrent content-addressed creates while ignoring file names", async () => {
    const repository = createRepository();
    const bytes = new TextEncoder().encode('{"format":"hakimi-review"}\r\n');
    const shared = {
      mediaType: "application/json",
      bytes,
      description: "hakimi-review-inbox:v1",
      link: null
    } as const;
    const toArray = vi.spyOn(repository.database.attachments, "toArray");
    const bulkGet = vi.spyOn(repository.database.attachments, "bulkGet");

    const results = await Promise.all([
      repository.createAttachmentOnce({ ...shared, fileName: "review-a.json" }),
      repository.createAttachmentOnce({ ...shared, fileName: "renamed-review.json" })
    ]);

    expect(results.filter((result) => result.created)).toHaveLength(1);
    expect(results.filter((result) => !result.created)).toHaveLength(1);
    expect(new Set(results.map((result) => result.record.id)).size).toBe(1);
    expect(new Set(results.map((result) => result.record.contentHash)).size).toBe(1);
    expect(await repository.database.attachments.count()).toBe(1);
    expect([...(await repository.readAttachmentBytes(results[0]!.record.id))!]).toEqual([...bytes]);
    expect(toArray).not.toHaveBeenCalled();
    expect(bulkGet).not.toHaveBeenCalled();
  });

  it("rejects an over-limit same-media idempotency lookup before reading attachment values", async () => {
    const repository = createRepository();
    const records = Array.from(
      { length: LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_SCAN_ROWS + 1 },
      (_, index) => storedAttachment({
        id: indexedAttachmentId(index + 1),
        mediaType: "application/json",
        description: "ordinary-json"
      })
    );
    await repository.database.attachments.bulkAdd(records);
    const toArray = vi.spyOn(repository.database.attachments, "toArray");
    const bulkGet = vi.spyOn(repository.database.attachments, "bulkGet");
    const get = vi.spyOn(repository.database.attachments, "get");

    await expect(repository.createAttachmentOnce({
      fileName: "review.json",
      mediaType: "application/json",
      bytes: new TextEncoder().encode('{"format":"hakimi-review"}'),
      description: "hakimi-review-inbox:v1",
      link: null
    })).rejects.toMatchObject({ code: "SCAN_ROW_LIMIT_EXCEEDED" });

    expect(get).not.toHaveBeenCalled();
    expect(toArray).not.toHaveBeenCalled();
    expect(bulkGet).not.toHaveBeenCalled();
    expect(await repository.database.attachments.count()).toBe(records.length);
  });

  it("keeps identical bytes when their exact purpose metadata differs", async () => {
    const repository = createRepository();
    const bytes = new TextEncoder().encode('{"format":"hakimi-review"}');

    const inbox = await repository.createAttachmentOnce({
      fileName: "review.json",
      mediaType: "application/json",
      bytes,
      description: "hakimi-review-inbox:v1",
      link: null
    });
    const otherMediaType = await repository.createAttachmentOnce({
      fileName: "review.txt",
      mediaType: "text/plain",
      bytes,
      description: "hakimi-review-inbox:v1",
      link: null
    });
    const otherDescription = await repository.createAttachmentOnce({
      fileName: "ordinary-review.json",
      mediaType: "application/json",
      bytes,
      description: "ordinary-research-attachment",
      link: null
    });

    expect(inbox.created).toBe(true);
    expect(otherMediaType.created).toBe(true);
    expect(otherDescription.created).toBe(true);
    expect(new Set([
      inbox.record.id,
      otherMediaType.record.id,
      otherDescription.record.id
    ]).size).toBe(3);
    expect(new Set([
      inbox.record.contentHash,
      otherMediaType.record.contentHash,
      otherDescription.record.contentHash
    ]).size).toBe(1);
    expect(await repository.database.attachments.count()).toBe(3);
  });

  it("CAS-protects attachment reads and deletes without breaking legacy calls", async () => {
    const repository = createRepository();
    const bytes = new TextEncoder().encode("review inbox CAS sentinel");
    const attachment = await repository.createAttachment({
      fileName: "review.json",
      mediaType: "application/json",
      bytes,
      description: "hakimi-review-inbox:v1"
    });
    const staleHash = attachment.contentHash === "0".repeat(64) ? "1".repeat(64) : "0".repeat(64);

    await expect(repository.readAttachmentBytes(attachment.id, {
      expectedContentHash: staleHash
    })).rejects.toMatchObject({ code: "ATTACHMENT_CHANGED" });
    expect([...(await repository.readAttachmentBytes(attachment.id, {
      expectedContentHash: attachment.contentHash
    }))!]).toEqual([...bytes]);

    await expect(repository.deleteAttachment(attachment.id, {
      expectedContentHash: staleHash
    })).rejects.toMatchObject({ code: "ATTACHMENT_CHANGED" });
    expect(await repository.database.attachments.count()).toBe(1);
    expect([...(await repository.readAttachmentBytes(attachment.id))!]).toEqual([...bytes]);

    await repository.deleteAttachment(attachment.id, {
      expectedContentHash: attachment.contentHash
    });
    await expect(repository.readAttachmentBytes(attachment.id)).resolves.toBeNull();
  });

  it("detects stored byte/hash corruption before returning data", async () => {
    const repository = createRepository();
    const attachment = await repository.createAttachment({
      fileName: "evidence.txt",
      mediaType: "text/plain",
      bytes: new TextEncoder().encode("evidence")
    });
    await repository.database.attachments.put({ ...attachment, contentHash: "0".repeat(64) });

    await expect(repository.listAttachments()).rejects.toBeInstanceOf(LocalAttachmentIntegrityError);
    await expect(repository.readAttachmentBytes(attachment.id)).rejects.toMatchObject({
      code: "CONTENT_HASH_MISMATCH"
    });
  });
});

describe("bounded local data overview and attachment metadata", () => {
  it("counts all sixteen user partitions in one targetSchema 13 snapshot without opening the receipt store", async () => {
    const database = new ResearchDatabase(
      `hakimi-local-overview-v13-${crypto.randomUUID()}`,
      { targetSchema: 13 }
    );
    databases.push(database);
    const repository = new CaseRepository(database);
    const id = crypto.randomUUID();
    const seeds: ReadonlyArray<readonly [string, Record<string, unknown>]> = [
      ["cases", { id: crypto.randomUUID() }],
      ["revisions", { id: crypto.randomUUID() }],
      ["candidateSets", { id: crypto.randomUUID() }],
      ["researchNotes", { id: crypto.randomUUID() }],
      ["events", { id: crypto.randomUUID() }],
      ["savedViews", { id: crypto.randomUUID() }],
      ["knowledgeDocuments", { id: crypto.randomUUID() }],
      ["citations", { id: crypto.randomUUID() }],
      ["sourceRights", { documentId: id }],
      ["researcherProfiles", { id: crypto.randomUUID() }],
      ["appSettings", { id: crypto.randomUUID() }],
      ["attachments", { id: crypto.randomUUID() }],
      ["ruleRegistry", { id: crypto.randomUUID() }],
      ["tzdbMigrationReceipts", { id: crypto.randomUUID() }],
      ["eventTimeMigrationReceipts", { id: crypto.randomUUID() }]
    ];
    for (const [tableName, record] of seeds) await database.table(tableName).add(record);

    expect(database.tables.map((table) => table.name)).not.toContain("revisionCalculationReceipts");
    await expect(repository.readLocalDataOverview()).resolves.toEqual({
      counts: {
        cases: 1,
        revisions: 1,
        candidateSets: 1,
        researchNotes: 1,
        events: 1,
        savedViews: 1,
        knowledgeDocuments: 1,
        citations: 1,
        sourceRights: 1,
        researcherProfiles: 1,
        appSettings: 1,
        attachments: 1,
        ruleRegistry: 1,
        tzdbMigrationReceipts: 1,
        eventTimeMigrationReceipts: 1,
        revisionCalculationReceipts: 0
      }
    });
  });

  it("returns one atomic complete purpose snapshot from 256 sequential value reads without retaining or hashing bodies", async () => {
    const repository = createRepository();
    const purpose = "哈基米运限审核收件箱 · 本地未核验 · v1";
    const records = Array.from(
      { length: LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_SCAN_ROWS },
      (_, index) => storedAttachment({
        id: indexedAttachmentId(index + 1),
        fileName: `purpose-${index}.json`,
        mediaType: "application/json",
        description: index < 2 || index === 3 ? purpose : "ordinary-json",
        contentHash: index === 2 || index === 3 ? "not-a-sha256" : "0".repeat(64),
        link: index === 3 ? {
          kind: "research_subject",
          subjectId: indexedAttachmentId(900)
        } : null
      }) as LocalAttachmentRecord
    );
    await repository.database.attachments.bulkAdd(records);
    const toArray = vi.spyOn(repository.database.attachments, "toArray");
    const bulkGet = vi.spyOn(repository.database.attachments, "bulkGet");
    const get = vi.spyOn(repository.database.attachments, "get");
    const digest = vi.spyOn(globalThis.crypto.subtle, "digest");

    const snapshot = await repository.readAttachmentPurposeMetadataSnapshot({
      mediaType: "application/json",
      description: purpose,
      unlinkedOnly: true
    });

    expect(snapshot).toMatchObject({
      filter: { mediaType: "application/json", description: purpose, unlinkedOnly: true },
      scannedCount: LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_SCAN_ROWS,
      scannedEncodedCharacters: LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_SCAN_ROWS * 4,
      matchedDeclaredBytes: 2,
      contentIntegrityVerified: false,
      coverage: "complete",
      atomicStorageSnapshotVerified: true
    });
    expect(snapshot.items.map((item) => item.id)).toEqual([
      indexedAttachmentId(1),
      indexedAttachmentId(2)
    ]);
    expect(snapshot.items.every((item) =>
      item.contentIntegrity === "unchecked" && !("contentBase64" in item)
    )).toBe(true);
    expect(get.mock.calls.map(([id]) => id)).toEqual(
      records.map((record) => record.id).sort()
    );
    expect(toArray).not.toHaveBeenCalled();
    expect(bulkGet).not.toHaveBeenCalled();
    expect(digest).not.toHaveBeenCalled();
  });

  it("rejects a 257th purpose-scan key before reading any attachment value", async () => {
    const repository = createRepository();
    const records = Array.from(
      { length: LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_SCAN_ROWS + 1 },
      (_, index) => storedAttachment({
        id: indexedAttachmentId(index + 1),
        mediaType: "application/json",
        description: "ordinary-json"
      })
    );
    await repository.database.attachments.bulkAdd(records);
    const toArray = vi.spyOn(repository.database.attachments, "toArray");
    const bulkGet = vi.spyOn(repository.database.attachments, "bulkGet");
    const get = vi.spyOn(repository.database.attachments, "get");

    await expect(repository.readAttachmentPurposeMetadataSnapshot({
      mediaType: "application/json",
      description: "review-inbox",
      unlinkedOnly: true
    })).rejects.toMatchObject({ code: "SCAN_ROW_LIMIT_EXCEEDED" });
    expect(get).not.toHaveBeenCalled();
    expect(toArray).not.toHaveBeenCalled();
    expect(bulkGet).not.toHaveBeenCalled();
  });

  it("fails closed on a matching corrupt purpose record after skipping unrelated corruption", async () => {
    const repository = createRepository();
    const purpose = "review-inbox";
    await repository.database.attachments.bulkAdd([
      {
        ...storedAttachment({
          id: indexedAttachmentId(1),
          mediaType: "application/json",
          description: "ordinary-json"
        }),
        contentHash: "not-a-sha256"
      } as unknown as LocalAttachmentRecord,
      {
        ...storedAttachment({
          id: indexedAttachmentId(2),
          mediaType: "application/json",
          description: purpose
        }),
        contentHash: "not-a-sha256"
      } as unknown as LocalAttachmentRecord
    ]);

    await expect(repository.readAttachmentPurposeMetadataSnapshot({
      mediaType: "application/json",
      description: purpose,
      unlinkedOnly: true
    })).rejects.toMatchObject({ name: "ZodError" });
  });

  it("fails closed when a 65th exact purpose match would be retained", async () => {
    const repository = createRepository();
    const purpose = "review-inbox";
    await repository.database.attachments.bulkAdd(Array.from(
      { length: LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHES + 1 },
      (_, index) => storedAttachment({
        id: indexedAttachmentId(index + 1),
        mediaType: "application/json",
        description: purpose
      })
    ));

    await expect(repository.readAttachmentPurposeMetadataSnapshot({
      mediaType: "application/json",
      description: purpose,
      unlinkedOnly: true
    })).rejects.toMatchObject({ code: "MATCH_LIMIT_EXCEEDED" });
  });

  it("enforces the aggregate encoded-character scan budget before purpose parsing", async () => {
    const repository = createRepository();
    const perRecordByteLength = 16 * 1024 * 1024 + 2;
    const contentBase64 = canonicalZeroBase64(perRecordByteLength);
    expect(contentBase64.length * 3).toBeGreaterThan(
      LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_ENCODED_CHARACTERS
    );
    await repository.database.attachments.bulkAdd(Array.from({ length: 3 }, (_, index) =>
      storedAttachment({
        id: indexedAttachmentId(index + 1),
        mediaType: "application/json",
        byteLength: perRecordByteLength,
        contentBase64,
        description: "ordinary-json"
      })
    ));

    await expect(repository.readAttachmentPurposeMetadataSnapshot({
      mediaType: "application/json",
      description: "review-inbox",
      unlinkedOnly: true
    })).rejects.toMatchObject({ code: "SCAN_ENCODED_CHARACTER_LIMIT_EXCEEDED" });
  });

  it("enforces the matched declared-byte budget without decoding or hashing content", async () => {
    const repository = createRepository();
    const purpose = "review-inbox";
    const perRecordByteLength = 1024 * 1024;
    const recordCount = LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHED_BYTES / perRecordByteLength + 1;
    const contentBase64 = canonicalZeroBase64(perRecordByteLength);
    expect(perRecordByteLength * (recordCount - 1)).toBeLessThanOrEqual(
      LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHED_BYTES
    );
    expect(perRecordByteLength * recordCount).toBeGreaterThan(
      LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHED_BYTES
    );
    expect(contentBase64.length * recordCount).toBeLessThan(
      LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_ENCODED_CHARACTERS
    );
    await repository.database.attachments.bulkAdd(Array.from({ length: recordCount }, (_, index) =>
      storedAttachment({
        id: indexedAttachmentId(index + 1),
        mediaType: "application/json",
        byteLength: perRecordByteLength,
        contentBase64,
        description: purpose
      })
    ));
    const digest = vi.spyOn(globalThis.crypto.subtle, "digest");

    await expect(repository.readAttachmentPurposeMetadataSnapshot({
      mediaType: "application/json",
      description: purpose,
      unlinkedOnly: true
    })).rejects.toMatchObject({ code: "MATCHED_BYTE_LIMIT_EXCEEDED" });
    expect(digest).not.toHaveBeenCalled();
  });

  it("holds a same-count replacement behind the purpose snapshot transaction", async () => {
    const repository = createRepository();
    const purpose = "review-inbox";
    const original = storedAttachment({
      id: indexedAttachmentId(1),
      mediaType: "application/json",
      description: purpose
    });
    const replacement = { ...original, description: "ordinary-json" };
    await repository.database.attachments.add(original);
    const readStored = repository.database.attachments.get.bind(repository.database.attachments);
    let concurrentWrite: Promise<unknown> | null = null;
    vi.spyOn(repository.database.attachments, "get").mockImplementation((async (id: string) => {
      const raw = await readStored(id);
      if (concurrentWrite === null) {
        concurrentWrite = Dexie.ignoreTransaction(() =>
          repository.database.attachments.put(replacement)
        );
      }
      return raw;
    }) as never);

    const snapshot = await repository.readAttachmentPurposeMetadataSnapshot({
      mediaType: "application/json",
      description: purpose,
      unlinkedOnly: true
    });
    expect(snapshot.items.map((item) => item.id)).toEqual([original.id]);
    expect(snapshot.coverage).toBe("complete");
    expect(snapshot.atomicStorageSnapshotVerified).toBe(true);

    expect(concurrentWrite).not.toBeNull();
    await concurrentWrite!;
    await expect(repository.readAttachmentPurposeMetadataSnapshot({
      mediaType: "application/json",
      description: purpose,
      unlinkedOnly: true
    })).resolves.toMatchObject({ items: [], coverage: "complete" });
  });

  it("pages sixteen plus one attachments by key before strictly sequential metadata reads", async () => {
    const repository = createRepository();
    const records = Array.from({ length: 17 }, (_, index) => {
      const timestamp = new Date(Date.UTC(2026, 7, 2, 0, 0, index)).toISOString();
      return storedAttachment({
        fileName: `metadata-${index}.bin`,
        createdAt: timestamp,
        updatedAt: timestamp
      });
    });
    await repository.database.attachments.bulkAdd(records);
    const toArray = vi.spyOn(repository.database.attachments, "toArray");
    const bulkGet = vi.spyOn(repository.database.attachments, "bulkGet");
    const get = vi.spyOn(repository.database.attachments, "get");

    const first = await repository.readAttachmentMetadataPage();
    expect(first).toMatchObject({
      totalCount: 17,
      offset: 0,
      nextOffset: 16,
      scannedCount: 16,
      scannedEncodedCharacters: 64,
      contentIntegrityVerified: false
    });
    expect(first.items.map((item) => item.id)).toEqual(
      [...records]
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .slice(0, 16)
        .map((record) => record.id)
    );
    expect(first.items.every((item) =>
      item.contentIntegrity === "unchecked" && !("contentBase64" in item)
    )).toBe(true);
    expect(toArray).not.toHaveBeenCalled();
    expect(bulkGet).not.toHaveBeenCalled();
    expect(get).toHaveBeenCalledTimes(16);

    const second = await repository.readAttachmentMetadataPage({ offset: first.nextOffset! });
    expect(second).toMatchObject({
      totalCount: 17,
      offset: 16,
      nextOffset: null,
      scannedCount: 1,
      scannedEncodedCharacters: 4,
      contentIntegrityVerified: false
    });
    expect(second.items).toHaveLength(1);
    expect(toArray).not.toHaveBeenCalled();
    expect(bulkGet).not.toHaveBeenCalled();
    expect(get).toHaveBeenCalledTimes(17);
  });

  it("advances a bounded mediaType purpose scan across unrelated corrupt rows without skipping a budget-blocked row", async () => {
    const repository = createRepository();
    const purpose = "哈基米运限审核收件箱 · 本地未核验 · v1";
    const ordinaryCorrupt = {
      ...storedAttachment({
        id: "00000000-0000-4000-8000-000000000001",
        mediaType: "application/json",
        description: "ordinary-json"
      }),
      contentHash: "not-a-sha256"
    } as unknown as LocalAttachmentRecord;
    const linkedPurpose = storedAttachment({
      id: "00000000-0000-4000-8000-000000000002",
      mediaType: "application/json",
      description: purpose,
      link: {
        kind: "research_subject",
        subjectId: "00000000-0000-4000-8000-000000000099"
      }
    });
    const matching = storedAttachment({
      id: "00000000-0000-4000-8000-000000000003",
      fileName: "review.json",
      mediaType: "application/json",
      description: purpose
    });
    const otherMediaType = storedAttachment({
      id: "00000000-0000-4000-8000-000000000004",
      mediaType: "text/plain",
      description: purpose
    });
    await repository.database.attachments.bulkAdd([
      ordinaryCorrupt,
      linkedPurpose,
      matching,
      otherMediaType
    ]);

    const first = await repository.readAttachmentMetadataPage({
      mediaType: "application/json",
      description: purpose,
      unlinkedOnly: true,
      limit: 3,
      maxEncodedCharacters: 8
    });
    expect(first).toMatchObject({
      totalCount: 3,
      offset: 0,
      items: [],
      nextOffset: 2,
      scannedCount: 2,
      scannedEncodedCharacters: 8,
      contentIntegrityVerified: false
    });

    const blocked = await repository.readAttachmentMetadataPage({
      offset: 2,
      mediaType: "application/json",
      description: purpose,
      unlinkedOnly: true,
      limit: 1,
      maxEncodedCharacters: 3
    });
    expect(blocked).toMatchObject({
      totalCount: 3,
      offset: 2,
      items: [],
      nextOffset: 2,
      scannedCount: 0,
      scannedEncodedCharacters: 0
    });

    const final = await repository.readAttachmentMetadataPage({
      offset: blocked.nextOffset!,
      mediaType: "application/json",
      description: purpose,
      unlinkedOnly: true,
      limit: 1,
      maxEncodedCharacters: 4
    });
    expect(final).toMatchObject({
      totalCount: 3,
      offset: 2,
      nextOffset: null,
      scannedCount: 1,
      scannedEncodedCharacters: 4,
      contentIntegrityVerified: false,
      items: [{
        id: matching.id,
        fileName: "review.json",
        contentHash: matching.contentHash,
        contentIntegrity: "unchecked"
      }]
    });
    expect("contentBase64" in final.items[0]!).toBe(false);
  });

  it("revalidates every returned non-null attachment link without hashing its content", async () => {
    const repository = createRepository();
    const caseId = crypto.randomUUID();
    await repository.database.cases.add({ id: caseId } as never);
    const attachment = storedAttachment({
      link: { kind: "research_subject", subjectId: caseId }
    });
    await repository.database.attachments.add(attachment);

    await expect(repository.readAttachmentMetadataPage()).resolves.toMatchObject({
      items: [{
        id: attachment.id,
        contentHash: "0".repeat(64),
        contentIntegrity: "unchecked"
      }]
    });
    await repository.database.cases.delete(caseId);
    await expect(repository.readAttachmentMetadataPage()).rejects.toMatchObject({
      code: "LINK_TARGET_NOT_FOUND"
    });
  });
});

describe("sixteen-partition full data operations", () => {
  it("rejects a chart-field Citation whose CandidateSet id impersonates a Case id", async () => {
    const repository = createRepository();
    const knowledge = new KnowledgeRepository(repository.database, () => "2026-08-02T00:00:00.000Z");
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
    const [calculated, candidateResult] = await Promise.all([
      calculateChart(birthInput, WORKING_DEFAULT_RULE_PROFILE),
      calculateUnknownHourCandidates(
        { ...birthInput, time: null, timePrecision: "unknown_hour" },
        WORKING_DEFAULT_RULE_PROFILE
      )
    ]);
    const caseBundle = await repository.createCase({ alias: "真实案例", calculated });
    const candidateSet = await repository.createCandidateSet({
      alias: "不能冒充案例的候选集",
      candidateSet: candidateResult
    });
    const content = "# Source\nverified chart field";
    const document = await knowledge.createDocument({
      title: "Chart target source",
      author: "User",
      edition: "Local",
      sourceNote: "",
      fileName: "chart-target.md",
      format: "markdown",
      content,
      byteSize: new TextEncoder().encode(content).byteLength
    });
    await knowledge.createCitation({
      documentId: document.id,
      locator: { sectionId: "section-1", startLine: 2, endLine: 2 },
      annotation: "valid before snapshot corruption",
      targets: [{
        kind: "chart_field",
        caseId: caseBundle.caseRecord.id,
        revisionId: caseBundle.revisions[0]!.id,
        field: "pillars.day.ganZhi"
      }]
    });
    const current = await repository.readFullDataSnapshot();
    const corrupted = structuredClone(current);
    const revision = corrupted.revisions[0]!;
    revision.caseId = candidateSet.id;
    const citation = corrupted.citations[0]!;
    const target = citation.targets[0]!;
    if (target.kind !== "chart_field") throw new Error("expected chart-field Citation fixture");
    target.caseId = candidateSet.id;
    citation.targetKeys = citationTargetKeys(citation.targets);

    await expect(repository.replaceFullDataSnapshot(corrupted)).rejects.toMatchObject({
      code: "TARGET_CONTEXT_MISMATCH"
    });
    await expect(repository.readFullDataSnapshot()).resolves.toEqual(current);
  });

  it("rejects accessor-backed snapshot partitions and CAS options without invoking their getters", async () => {
    const repository = createRepository();
    const snapshot = await repository.readFullDataSnapshot();
    const partitionGetter = vi.fn(() => []);
    Object.defineProperty(snapshot, "savedViews", {
      configurable: true,
      enumerable: true,
      get: partitionGetter
    });

    await expect(repository.replaceFullDataSnapshot(snapshot)).rejects.toThrow(
      "Full data snapshot must contain only own enumerable data properties."
    );
    expect(partitionGetter).not.toHaveBeenCalled();

    const safeSnapshot = await repository.readFullDataSnapshot();
    const optionGetter = vi.fn(() => "0".repeat(64));
    const options = Object.defineProperty({}, "expectedCurrentPayloadDigest", {
      configurable: true,
      enumerable: true,
      get: optionGetter
    }) as { expectedCurrentPayloadDigest: string };

    await expect(repository.replaceFullDataSnapshot(safeSnapshot, options)).rejects.toThrow(
      "Full data replacement options cannot contain accessors."
    );
    expect(optionGetter).not.toHaveBeenCalled();

    await expect(repository.replaceFullDataSnapshot(safeSnapshot, {
      expectedCurrentPayloadDigest: undefined
    } as never)).rejects.toThrow(
      "Expected current full-data payload digest must be a lowercase SHA-256 digest."
    );
    await expect(repository.replaceFullDataSnapshot(safeSnapshot, {
      expectedCurrentPayloadDigest: "0".repeat(64),
      unexpected: true
    } as never)).rejects.toThrow("Full data replacement options must be a plain exact object.");
    await expect(repository.replaceFullDataSnapshot(safeSnapshot, {
      expectedCurrentPayloadDigest: "A".repeat(64)
    })).rejects.toThrow("Expected current full-data payload digest must be a lowercase SHA-256 digest.");
    const nonEnumerableOptions = Object.defineProperty({}, "expectedCurrentPayloadDigest", {
      configurable: true,
      enumerable: false,
      value: "0".repeat(64),
      writable: true
    }) as { expectedCurrentPayloadDigest: string };
    await expect(repository.replaceFullDataSnapshot(safeSnapshot, nonEnumerableOptions)).rejects.toThrow(
      "Full data replacement options must use an own enumerable data property."
    );
    await expect(repository.replaceFullDataSnapshot(safeSnapshot, {})).resolves.toBeUndefined();
    await expect(repository.replaceFullDataSnapshot(safeSnapshot)).resolves.toBeUndefined();
  });

  it.each([
    ["an extra root partition", (snapshot: FullBackupPayload) => {
      (snapshot as FullBackupPayload & { unexpectedPartition: unknown }).unexpectedPartition = [];
    }],
    ["undefined", (snapshot: FullBackupPayload) => {
      snapshot.cases.push(undefined as never);
    }],
    ["NaN", (snapshot: FullBackupPayload) => {
      snapshot.cases.push(Number.NaN as never);
    }],
    ["Date", (snapshot: FullBackupPayload) => {
      snapshot.cases.push(new Date() as never);
    }],
    ["a custom prototype", (snapshot: FullBackupPayload) => {
      Object.setPrototypeOf(snapshot, { custom: true });
    }],
    ["a custom array prototype", (snapshot: FullBackupPayload) => {
      const cases: unknown[] = [];
      Object.setPrototypeOf(cases, Object.create(Array.prototype));
      snapshot.cases = cases as never;
    }],
    ["a sparse array", (snapshot: FullBackupPayload) => {
      snapshot.cases = new Array(1) as never;
    }],
    ["a cycle", (snapshot: FullBackupPayload) => {
      snapshot.cases.push(snapshot as never);
    }]
  ])("fails closed before replacement for declarative snapshot boundary: %s", async (_name, tamper) => {
    const repository = createRepository();
    const snapshot = await repository.readFullDataSnapshot();
    tamper(snapshot);

    await expect(repository.replaceFullDataSnapshot(snapshot)).rejects.toThrow();
    await expect(repository.readFullDataSnapshot()).resolves.toMatchObject({ cases: [] });
  });

  it("accepts a shared acyclic declarative value and lets Schema parsing remove aliases", async () => {
    const repository = createRepository();
    const snapshot = await repository.readFullDataSnapshot();
    const sharedEmptyPartition: unknown[] = [];
    const sharedSnapshot = snapshot as unknown as Record<string, unknown>;
    for (const partition of Object.keys(snapshot)) sharedSnapshot[partition] = sharedEmptyPartition;

    await expect(repository.replaceFullDataSnapshot(snapshot)).resolves.toBeUndefined();
    const restored = await repository.readFullDataSnapshot();
    expect(Object.values(restored).every((partition) => partition.length === 0)).toBe(true);
    expect(restored.cases).not.toBe(restored.revisions);
  });

  it("isolates every replacement partition from caller mutation after invocation", async () => {
    const repository = createRepository();
    await repository.saveResearcherProfile({ displayName: "Captured researcher" });
    const snapshot = await repository.readFullDataSnapshot();
    const captured = structuredClone(snapshot);
    const options = { expectedCurrentPayloadDigest: await sha256Hex(snapshot) };

    const replacement = repository.replaceFullDataSnapshot(snapshot, options);
    snapshot.researcherProfiles[0]!.displayName = "Mutated after invocation";
    options.expectedCurrentPayloadDigest = "0".repeat(64);

    await replacement;
    await expect(repository.readFullDataSnapshot()).resolves.toEqual(captured);
  });

  it("accepts the legal singleton boundary and rejects a snapshot above it", async () => {
    const repository = createRepository();
    await repository.saveResearcherProfile({ displayName: "Singleton boundary" });
    const legalSnapshot = await repository.readFullDataSnapshot();

    await expect(repository.replaceFullDataSnapshot(legalSnapshot)).resolves.toBeUndefined();

    const overLimitSnapshot = structuredClone(legalSnapshot);
    overLimitSnapshot.researcherProfiles.push(structuredClone(overLimitSnapshot.researcherProfiles[0]!));
    await expect(repository.replaceFullDataSnapshot(overLimitSnapshot)).rejects.toThrow();
    await expect(repository.readFullDataSnapshot()).resolves.toEqual(legalSnapshot);
  });

  it("aborts an in-flight full snapshot transaction when its signal is cancelled", async () => {
    const repository = createRepository();
    const controller = new AbortController();
    const readCases = repository.database.cases.toArray.bind(repository.database.cases);
    const casesRead = vi.spyOn(repository.database.cases, "toArray").mockImplementation((() => {
      controller.abort();
      return readCases();
    }) as never);

    await expect(repository.readFullDataSnapshot({ signal: controller.signal }))
      .rejects.toMatchObject({ name: "AbortError" });
    expect(controller.signal.aborted).toBe(true);

    casesRead.mockRestore();
    await expect(repository.readFullDataSnapshot()).resolves.toMatchObject({ cases: [] });
  });

  it("verifies full-snapshot attachment digests with a hard concurrency of one", async () => {
    const repository = createRepository();
    const zeroByteHash = "6e340b9cffb37a989ca544e6bb780a2c78901d3fb33738768511a30617afa01d";
    await repository.database.attachments.bulkAdd(Array.from({ length: 3 }, (_, index) =>
      storedAttachment({
        id: indexedAttachmentId(index + 1),
        fileName: `snapshot-${index}.bin`,
        contentHash: zeroByteHash
      })
    ));
    const originalDigest = globalThis.crypto.subtle.digest.bind(globalThis.crypto.subtle);
    let inFlight = 0;
    let maxInFlight = 0;
    const digest = vi.spyOn(globalThis.crypto.subtle, "digest").mockImplementation(async (algorithm, data) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      try {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        return await originalDigest(algorithm, data);
      } finally {
        inFlight -= 1;
      }
    });

    const snapshot = await repository.readFullDataSnapshot();

    expect(snapshot.attachments).toHaveLength(3);
    expect(digest).toHaveBeenCalledTimes(3);
    expect(maxInFlight).toBe(1);
  });

  it("verifies replacement-snapshot attachment digests with a hard concurrency of one", async () => {
    const repository = createRepository();
    const zeroByteHash = "6e340b9cffb37a989ca544e6bb780a2c78901d3fb33738768511a30617afa01d";
    await repository.database.attachments.bulkAdd(Array.from({ length: 3 }, (_, index) =>
      storedAttachment({
        id: indexedAttachmentId(index + 1),
        fileName: `restore-${index}.bin`,
        contentHash: zeroByteHash
      })
    ));
    const snapshot = await repository.readFullDataSnapshot();
    const originalDigest = globalThis.crypto.subtle.digest.bind(globalThis.crypto.subtle);
    let attachmentDigestCalls = 0;
    let attachmentDigestsInFlight = 0;
    let maxAttachmentDigestsInFlight = 0;
    vi.spyOn(globalThis.crypto.subtle, "digest").mockImplementation(async (algorithm, data) => {
      if (data.byteLength !== 1) return originalDigest(algorithm, data);
      attachmentDigestCalls += 1;
      attachmentDigestsInFlight += 1;
      maxAttachmentDigestsInFlight = Math.max(
        maxAttachmentDigestsInFlight,
        attachmentDigestsInFlight
      );
      try {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        return await originalDigest(algorithm, data);
      } finally {
        attachmentDigestsInFlight -= 1;
      }
    });

    await repository.replaceFullDataSnapshot(snapshot);

    expect(attachmentDigestCalls).toBe(3);
    expect(maxAttachmentDigestsInFlight).toBe(1);
    expect(await repository.database.attachments.count()).toBe(3);
  });

  it("snapshots, atomically replaces, CAS-checks, and clears all new partitions", async () => {
    const repository = createRepository();
    const registry = new RuleRegistryRepository(repository.database);
    await repository.saveResearcherProfile({ displayName: "研究者" });
    await repository.saveAppSettings({
      defaultTimeZone: "Asia/Shanghai",
      defaultCalendarType: "lunar",
      preferredDensity: "comfortable"
    });
    await repository.createAttachment({
      fileName: "note.txt",
      mediaType: "text/plain",
      bytes: new TextEncoder().encode("attachment payload")
    });
    const installed = installedRulePack();
    await registry.installRulePack(installed);
    await registry.activateRulePack(activeRulePack(installed));

    const snapshot = await repository.readFullDataSnapshot();
    expect(snapshot.attachments).toHaveLength(1);
    expect(snapshot.researcherProfiles).toHaveLength(1);
    expect(snapshot.appSettings).toHaveLength(1);
    expect(snapshot.ruleRegistry).toHaveLength(2);

    const orphaned = structuredClone(snapshot);
    orphaned.attachments[0]!.link = {
      kind: "research_subject",
      subjectId: crypto.randomUUID()
    };
    await expect(repository.replaceFullDataSnapshot(orphaned)).rejects.toMatchObject({
      code: "LINK_TARGET_NOT_FOUND"
    });
    expect(await repository.readFullDataSnapshot()).toEqual(snapshot);

    const corrupted = structuredClone(snapshot);
    corrupted.attachments[0]!.contentHash = "0".repeat(64);
    await expect(repository.replaceFullDataSnapshot(corrupted)).rejects.toMatchObject({
      code: "CONTENT_HASH_MISMATCH"
    });
    expect(await repository.readFullDataSnapshot()).toEqual(snapshot);

    const danglingRegistry = structuredClone(snapshot);
    danglingRegistry.ruleRegistry = danglingRegistry.ruleRegistry.filter(
      (record) => record.recordType === "active_rule_pack"
    );
    await expect(repository.replaceFullDataSnapshot(danglingRegistry)).rejects.toMatchObject({
      code: "ACTIVE_RULE_PACK_DANGLING_REFERENCE"
    });
    expect(await repository.readFullDataSnapshot()).toEqual(snapshot);

    const expectedCurrentPayloadDigest = await sha256Hex(snapshot);
    await registry.installRulePack(installedRulePack({
      id: PACK_DIGEST_B,
      packDigest: PACK_DIGEST_B,
      profileDigest: PROFILE_DIGEST_B,
      packId: "hakimi-second-pack",
      profileId: "hakimi-second-profile",
      canonicalJson: '{"kind":"concurrent-rule-pack"}'
    }));
    await expect(repository.replaceFullDataSnapshot(snapshot, { expectedCurrentPayloadDigest }))
      .rejects.toBeInstanceOf(FullDataReplaceConflictError);
    expect(await repository.database.ruleRegistry.count()).toBe(3);

    await repository.replaceFullDataSnapshot(snapshot);
    expect(await repository.readFullDataSnapshot()).toEqual(snapshot);

    await repository.clearAll();
    const cleared = await repository.readFullDataSnapshot();
    expect(Object.values(cleared).every((partition) => partition.length === 0)).toBe(true);
  });
});
