import type { FullBackupPayload } from "@hakimi/contracts";
import { describe, expect, it, vi } from "vitest";
import {
  BRIDGE_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR,
  type ReleaseDatabaseDescriptor
} from "../../release-protocol";
import {
  captureOrphanedV13Backup,
  orphanedV13ReadOnlyBackupFilename,
  type OrphanedV13Disposition,
  type OrphanedV13RescueRuntime
} from "./orphaned-v13-rescue";

const disposition: OrphanedV13Disposition = {
  kind: "orphaned_v13",
  reasonCode: "ORPHANED_V13_VERIFIED",
  inventory: [{ name: "hakimi-bazi-research", version: 130 }],
  sourceDatabaseName: "hakimi-bazi-research",
  sourceNativeVersion: 130
};

const snapshot = {
  cases: [], revisions: [], candidateSets: [], researchNotes: [], events: [], savedViews: [],
  knowledgeDocuments: [], citations: [], sourceRights: [], attachments: [], researcherProfiles: [],
  appSettings: [], ruleRegistry: [], tzdbMigrationReceipts: [], eventTimeMigrationReceipts: [],
  revisionCalculationReceipts: []
} as unknown as FullBackupPayload;

function descriptorCopy(
  descriptor: ReleaseDatabaseDescriptor,
  overrides: Partial<ReleaseDatabaseDescriptor> = {}
): ReleaseDatabaseDescriptor {
  return {
    ...descriptor,
    acceptedCommittedMigrationIds: [...descriptor.acceptedCommittedMigrationIds],
    ...overrides
  };
}

function descriptorWithOverriddenEvery(): ReleaseDatabaseDescriptor {
  const migrationIds: Array<string | null> = ["unexpected-migration"];
  Object.defineProperty(migrationIds, "every", {
    value: () => true,
    enumerable: false
  });
  return descriptorCopy(PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR, {
    acceptedCommittedMigrationIds: migrationIds
  });
}

class MigrationIdArray extends Array<string | null> {}

function descriptorWithArraySubclass(): ReleaseDatabaseDescriptor {
  return descriptorCopy(PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR, {
    acceptedCommittedMigrationIds: new MigrationIdArray(
      ...PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR.acceptedCommittedMigrationIds
    )
  });
}

function successfulRuntime(): {
  runtime: OrphanedV13RescueRuntime;
  events: string[];
  createArtifact: ReturnType<typeof vi.fn>;
} {
  const events: string[] = [];
  const nativeClose = vi.fn(() => events.push("native-close"));
  const database = {
    name: disposition.sourceDatabaseName,
    verno: 13,
    open: vi.fn(async () => { events.push("dexie-open"); }),
    close: vi.fn(() => events.push("dexie-close")),
    areReleaseWritesLocked: vi.fn(() => true)
  };
  const createArtifact = vi.fn(async (received: FullBackupPayload) => {
    events.push("worker");
    expect(received).toBe(snapshot);
    const blob = new Blob(["zip"]);
    return {
      output: "zip" as const,
      blob,
      outputByteLength: blob.size,
      canonicalJsonByteLength: 321,
      payloadDigest: "a".repeat(64)
    };
  });
  return {
    events,
    createArtifact,
    runtime: {
      inspect: vi.fn(async () => disposition),
      openVerifiedSource: vi.fn(async () => ({
        database: { close: nativeClose } as unknown as IDBDatabase,
        sourceDatabaseName: disposition.sourceDatabaseName,
        sourceNativeVersion: 130 as const
      })),
      loadStorageRuntime: vi.fn(async () => ({
        createDatabase: (
          _name: string,
          options: { targetSchema: number; releaseWritesLocked: boolean }
        ) => {
          expect(options).toEqual({ targetSchema: 13, releaseWritesLocked: true });
          return database;
        },
        createRepository: () => ({
          readFullDataSnapshot: async () => {
            events.push("snapshot");
            return snapshot;
          }
        })
      })),
      createArtifact,
      now: () => new Date("2026-08-03T12:00:00.000Z")
    }
  };
}

describe("orphaned v13 rescue", () => {
  it("shares one canonical filename contract with the recovery page", () => {
    expect(orphanedV13ReadOnlyBackupFilename("2026-08-03T00:00:00.000Z"))
      .toBe("hakimi-v13-read-only-full-backup-2026-08-03.zip");
    expect(() => orphanedV13ReadOnlyBackupFilename("2026-08-03"))
      .toThrow("规范 UTC 捕获时间");
  });

  it.each([
    ["v13 -> v15", PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR],
    ["v13 -> v16", PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR]
  ])("opens only a locked v13 source for the exact %s shell, snapshots once, closes it, then packages that snapshot", async (_label, descriptor) => {
    const { runtime, events, createArtifact } = successfulRuntime();
    await expect(captureOrphanedV13Backup(
      disposition,
      descriptorCopy(descriptor),
      runtime
    )).resolves.toMatchObject({
      payloadDigest: "a".repeat(64),
      filename: "hakimi-v13-read-only-full-backup-2026-08-03.zip",
      capturedAt: "2026-08-03T12:00:00.000Z"
    });
    expect(events).toEqual(["dexie-open", "native-close", "snapshot", "dexie-close", "worker"]);
    expect(createArtifact).toHaveBeenCalledTimes(1);
    expect(runtime.inspect).toHaveBeenCalledTimes(2);
    expect(globalThis.__HAKIMI_RESEARCH_DATABASE_RUNTIME__).toEqual({
      databaseName: disposition.sourceDatabaseName,
      targetSchema: 13,
      releaseWritesLocked: true
    });
  });

  it.each([
    ["bridge/null", BRIDGE_RELEASE_DATABASE_DESCRIPTOR],
    ["wrong source", descriptorCopy(
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
      { sourceDatabaseName: "hakimi-bazi-research.rebound" }
    )],
    ["v14 -> v15 rebound", PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR],
    ["candidate-controlled every", descriptorWithOverriddenEvery()],
    ["accepted migration array subclass", descriptorWithArraySubclass()],
    ["mixed target rebound", descriptorCopy(
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
      {
        dbGeneration: PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR.dbGeneration,
        databaseName: PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR.databaseName
      }
    )]
  ])("rejects the %s descriptor before inventory or source access", async (_label, descriptor) => {
    const { runtime, createArtifact } = successfulRuntime();
    await expect(captureOrphanedV13Backup(
      disposition,
      descriptor,
      runtime
    )).rejects.toThrow(/只读救援壳描述符/);
    expect(runtime.inspect).not.toHaveBeenCalled();
    expect(runtime.openVerifiedSource).not.toHaveBeenCalled();
    expect(runtime.loadStorageRuntime).not.toHaveBeenCalled();
    expect(createArtifact).not.toHaveBeenCalled();
  });

  it.each([
    ["reason code", { ...disposition, reasonCode: "FORGED_ORPHANED_STATE" }],
    ["source name", { ...disposition, sourceDatabaseName: "hakimi-bazi-research.rebound" }],
    ["native version", { ...disposition, sourceNativeVersion: 131 }],
    ["inventory binding", { ...disposition, inventory: [{ name: disposition.sourceDatabaseName, version: 131 }] }],
    ["extra inventory entry", {
      ...disposition,
      inventory: [
        ...disposition.inventory,
        { name: "hakimi-bazi-research.generation.unexpected", version: 150 }
      ]
    }]
  ])("rejects an orphaned disposition with a mismatched %s before inventory access", async (_label, invalidDisposition) => {
    const { runtime, createArtifact } = successfulRuntime();
    await expect(captureOrphanedV13Backup(
      invalidDisposition as unknown as OrphanedV13Disposition,
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
      runtime
    )).rejects.toThrow(/唯一绑定/);
    expect(runtime.inspect).not.toHaveBeenCalled();
    expect(runtime.openVerifiedSource).not.toHaveBeenCalled();
    expect(createArtifact).not.toHaveBeenCalled();
  });

  it("stops before opening the source when inventory changed", async () => {
    const { runtime } = successfulRuntime();
    runtime.inspect = vi.fn(async () => ({
      kind: "ambiguous" as const,
      reasonCode: "CONTROL_PRESENT_DURING_RESCUE",
      inventory: []
    }));
    await expect(captureOrphanedV13Backup(
      disposition,
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
      runtime
    )).rejects.toThrow("状态发生变化");
    expect(runtime.openVerifiedSource).not.toHaveBeenCalled();
  });

  it("rejects a pre-capture inspect result that self-labels extra inventory as orphaned", async () => {
    const { runtime } = successfulRuntime();
    runtime.inspect = vi.fn(async () => ({
      ...disposition,
      inventory: [
        ...disposition.inventory,
        { name: "hakimi-bazi-research.generation.unexpected", version: 150 }
      ]
    }));
    await expect(captureOrphanedV13Backup(
      disposition,
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
      runtime
    )).rejects.toThrow(/唯一绑定/);
    expect(runtime.openVerifiedSource).not.toHaveBeenCalled();
  });

  it("closes the native guard and locked database when snapshot validation fails", async () => {
    const { runtime, events, createArtifact } = successfulRuntime();
    runtime.loadStorageRuntime = vi.fn(async () => ({
      createDatabase: () => ({
        name: disposition.sourceDatabaseName,
        verno: 13,
        open: async () => { events.push("dexie-open"); },
        close: () => { events.push("dexie-close"); },
        areReleaseWritesLocked: () => true
      }),
      createRepository: () => ({
        readFullDataSnapshot: async () => { throw new Error("invalid relation"); }
      })
    }));
    await expect(captureOrphanedV13Backup(
      disposition,
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
      runtime
    )).rejects.toThrow("invalid relation");
    expect(events).toEqual(["dexie-open", "native-close", "dexie-close"]);
    expect(createArtifact).not.toHaveBeenCalled();
  });

  it("rejects a post-capture control/target change instead of handing out the artifact", async () => {
    const { runtime } = successfulRuntime();
    runtime.inspect = vi.fn()
      .mockResolvedValueOnce(disposition)
      .mockResolvedValueOnce({ kind: "ambiguous", reasonCode: "TARGET_APPEARED", inventory: [] });
    await expect(captureOrphanedV13Backup(
      disposition,
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
      runtime
    )).rejects.toThrow("状态发生变化");
  });

  it("rejects a post-capture inspect result that self-labels extra inventory as orphaned", async () => {
    const { runtime, createArtifact } = successfulRuntime();
    runtime.inspect = vi.fn()
      .mockResolvedValueOnce(disposition)
      .mockResolvedValueOnce({
        ...disposition,
        inventory: [
          ...disposition.inventory,
          { name: "hakimi-bazi-research.generation.unexpected", version: 150 }
        ]
      });
    await expect(captureOrphanedV13Backup(
      disposition,
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
      runtime
    )).rejects.toThrow(/唯一绑定/);
    expect(createArtifact).toHaveBeenCalledTimes(1);
  });
});
