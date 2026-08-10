import { afterEach, describe, expect, it, vi } from "vitest";
import Dexie from "dexie";
import { sha256Hex } from "@hakimi/integrity";
import {
  LOCAL_RULE_REGISTRY_RECORD_VERSION,
  SCHEMA_VERSION,
  type ActiveRulePackRecord,
  type InstalledRulePackRecord
} from "@hakimi/contracts";
import {
  CaseRepository,
  FullDataReplaceConflictError,
  LocalAttachmentIntegrityError,
  ResearchDatabase,
  RuleRegistryRepository
} from "./index";

const databases: Dexie[] = [];

const PACK_DIGEST_A = "a".repeat(64);
const PACK_DIGEST_B = "b".repeat(64);
const PROFILE_DIGEST_A = "c".repeat(64);
const PROFILE_DIGEST_B = "d".repeat(64);

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

describe("thirteen-partition full data operations", () => {
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
