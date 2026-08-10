import type { FullBackupPayload } from "@hakimi/contracts";
import { describe, expect, it, vi } from "vitest";
import { PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR } from "../../release-protocol";
import {
  captureOrphanedV13Backup,
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
  it("opens only a locked v13 source, snapshots once, closes it, then packages that snapshot", async () => {
    const { runtime, events, createArtifact } = successfulRuntime();
    await expect(captureOrphanedV13Backup(
      disposition,
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
      runtime
    )).resolves.toMatchObject({
      payloadDigest: "a".repeat(64),
      filename: "hakimi-v13-read-only-rescue-2026-08-03.zip",
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
});
