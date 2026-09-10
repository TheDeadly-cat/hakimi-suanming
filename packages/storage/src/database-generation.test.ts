import { afterEach, describe, expect, it, vi } from "vitest";
import Dexie from "dexie";
import { sha256Hex } from "@hakimi/integrity";
import {
  DatabaseGenerationController,
  DatabaseGenerationError,
  buildDatabaseGenerationReceiptPayload,
  buildShadowGenerationDatabaseName,
  databaseGenerationPhaseRank,
  type DatabaseGenerationIdentity,
  type DatabaseGenerationMigrationCallbacks,
  type DatabaseGenerationReleaseState,
  type DatabaseGenerationSnapshot
} from "./database-generation";

const SOURCE_DIGEST = "a".repeat(64);
const TARGET_DIGEST = "b".repeat(64);
const OTHER_DIGEST = "c".repeat(64);

const source: DatabaseGenerationSnapshot = {
  generation: "v13",
  databaseName: "hakimi-bazi-research",
  schemaVersion: 13,
  buildId: "bridge-a",
  digest: SOURCE_DIGEST
};

const target: DatabaseGenerationIdentity = {
  generation: "v14",
  databaseName: "hakimi-bazi-research.generation.v14",
  schemaVersion: 14,
  buildId: "candidate-b"
};

const controllers: DatabaseGenerationController[] = [];
const databaseNames = new Set<string>();

function openConnectionReadHarness(storedState: unknown) {
  // Pure native-handle contract: no IndexedDB factory, database creation, or
  // deletion is involved in these closed/aborted-connection scenarios.
  const request = {
    result: storedState,
    error: null as Error | null,
    onsuccess: null as (() => void) | null,
    onerror: null as (() => void) | null
  };
  const get = vi.fn(() => request);
  const transaction = {
    error: null as Error | null,
    oncomplete: null as (() => void) | null,
    onabort: null as (() => void) | null,
    onerror: null as (() => void) | null,
    objectStore: vi.fn(() => ({ get }))
  };
  const connection = { transaction: vi.fn(() => transaction) };
  const database = {
    backendDB: vi.fn((): unknown => connection),
    isOpen: vi.fn(() => true),
    open: vi.fn(),
    releaseState: { get: vi.fn() }
  };
  const controller = new DatabaseGenerationController({ databaseName: "open-connection-contract-fixture" });
  (controller as unknown as { database: unknown }).database = database;
  return { controller, database, connection, transaction, request, get };
}

async function committedReadFixture(): Promise<DatabaseGenerationReleaseState> {
  const unsigned: Omit<DatabaseGenerationReleaseState, "receiptDigest"> = {
    id: "current",
    protocolVersion: 1,
    committedGeneration: "legacy-v13",
    committedDatabaseName: "hakimi-bazi-research",
    committedSchema: 13,
    committedBuild: "bridge-read-fixture",
    migrationId: null,
    committedDigest: SOURCE_DIGEST,
    committedAt: "2026-09-05T00:00:00.000Z",
    updatedAt: "2026-09-05T00:00:00.000Z"
  };
  return { ...unsigned, receiptDigest: await sha256Hex(buildDatabaseGenerationReceiptPayload(unsigned)) };
}

describe("DatabaseGenerationController existing-connection read", () => {
  it("uses only a native readonly transaction and verifies the receipt after transaction completion", async () => {
    const state = await committedReadFixture();
    const fixture = openConnectionReadHarness(state);
    const read = fixture.controller.readCommittedGenerationFromOpenConnection();
    const settled = vi.fn();
    void read.then(settled);
    expect(fixture.connection.transaction).toHaveBeenCalledExactlyOnceWith("releaseState", "readonly");
    expect(fixture.get).toHaveBeenCalledExactlyOnceWith("current");
    fixture.request.onsuccess?.();
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();
    fixture.transaction.oncomplete?.();
    await expect(read).resolves.toEqual(state);
    expect(fixture.database.open).not.toHaveBeenCalled();
    expect(fixture.database.releaseState.get).not.toHaveBeenCalled();
  });

  it("returns an absent pointer without initializing a row", async () => {
    const fixture = openConnectionReadHarness(undefined);
    const read = fixture.controller.readCommittedGenerationFromOpenConnection();
    fixture.request.onsuccess?.();
    fixture.transaction.oncomplete?.();
    await expect(read).resolves.toBeNull();
    expect(fixture.database.open).not.toHaveBeenCalled();
    expect(fixture.database.releaseState.get).not.toHaveBeenCalled();
  });

  it("reuses the full receipt-integrity verification", async () => {
    const fixture = openConnectionReadHarness({ ...await committedReadFixture(), receiptDigest: OTHER_DIGEST });
    const read = fixture.controller.readCommittedGenerationFromOpenConnection();
    fixture.request.onsuccess?.();
    fixture.transaction.oncomplete?.();
    await expect(read).rejects.toMatchObject({ code: "CONTROL_STATE_CORRUPT" });
    expect(fixture.database.open).not.toHaveBeenCalled();
  });

  it.each(["missing_handle", "closed_connection"] as const)("rejects %s without calling a Dexie read or open", async (status) => {
    const fixture = openConnectionReadHarness(undefined);
    if (status === "missing_handle") fixture.database.backendDB.mockReturnValue(null);
    else fixture.database.isOpen.mockReturnValue(false);
    await expect(fixture.controller.readCommittedGenerationFromOpenConnection()).rejects.toThrow("not open");
    expect(fixture.connection.transaction).not.toHaveBeenCalled();
    expect(fixture.database.open).not.toHaveBeenCalled();
    expect(fixture.database.releaseState.get).not.toHaveBeenCalled();
  });

  it("rejects a closing handle's InvalidStateError without any retry or reopen", async () => {
    const fixture = openConnectionReadHarness(undefined);
    const failure = new DOMException("connection is closing", "InvalidStateError");
    fixture.connection.transaction.mockImplementation(() => { throw failure; });
    await expect(fixture.controller.readCommittedGenerationFromOpenConnection()).rejects.toBe(failure);
    expect(fixture.connection.transaction).toHaveBeenCalledTimes(1);
    expect(fixture.database.open).not.toHaveBeenCalled();
    expect(fixture.database.releaseState.get).not.toHaveBeenCalled();
  });

  it("rejects an abort after a successful get instead of returning an uncommitted read", async () => {
    const fixture = openConnectionReadHarness(await committedReadFixture());
    const read = fixture.controller.readCommittedGenerationFromOpenConnection();
    fixture.request.onsuccess?.();
    fixture.transaction.onabort?.();
    await expect(read).rejects.toThrow("aborted");
    expect(fixture.database.open).not.toHaveBeenCalled();
    expect(fixture.database.releaseState.get).not.toHaveBeenCalled();
  });

  it.each(["closed", "replaced"] as const)("rejects a handle that was %s during receipt verification", async (status) => {
    const fixture = openConnectionReadHarness(await committedReadFixture());
    const read = fixture.controller.readCommittedGenerationFromOpenConnection();
    fixture.request.onsuccess?.();
    fixture.transaction.oncomplete?.();
    if (status === "closed") fixture.database.isOpen.mockReturnValue(false);
    else fixture.database.backendDB.mockReturnValue({});
    await expect(read).rejects.toThrow("connection changed");
    expect(fixture.database.open).not.toHaveBeenCalled();
    expect(fixture.database.releaseState.get).not.toHaveBeenCalled();
  });

  it("propagates request errors without opening a new connection", async () => {
    const fixture = openConnectionReadHarness(undefined);
    const failure = new Error("readonly get failed");
    fixture.request.error = failure;
    const read = fixture.controller.readCommittedGenerationFromOpenConnection();
    fixture.request.onerror?.();
    await expect(read).rejects.toBe(failure);
    expect(fixture.database.open).not.toHaveBeenCalled();
    expect(fixture.database.releaseState.get).not.toHaveBeenCalled();
  });
});

function createClock() {
  let value = Date.parse("2026-08-03T00:00:00.000Z");
  return {
    now: () => value,
    advance: (milliseconds: number) => {
      value += milliseconds;
    }
  };
}

function createController(clock = createClock(), databaseName?: string) {
  const resolvedName = databaseName ?? `hakimi-generation-test-${crypto.randomUUID()}`;
  const controller = new DatabaseGenerationController({
    databaseName: resolvedName,
    now: clock.now
  });
  controllers.push(controller);
  databaseNames.add(resolvedName);
  return { controller, clock };
}

function leaseOptions(ownerId: string) {
  return { ownerId, leaseDurationMs: 1_000, heartbeatIntervalMs: 0 } as const;
}

async function prepare(
  controller: DatabaseGenerationController,
  migrationId = "migration-v13-v14"
) {
  await controller.initializeCommittedGeneration(source);
  return controller.prepareMigration(
    { migrationId, source, target },
    leaseOptions("prepare-owner")
  );
}

afterEach(async () => {
  for (const controller of controllers.splice(0)) controller.close();
  const names = [...databaseNames];
  databaseNames.clear();
  await Promise.all(names.map((name) => Dexie.delete(name)));
});

describe("DatabaseGenerationController", () => {
  it("uses a protocol-safe deterministic shadow database name", () => {
    expect(buildShadowGenerationDatabaseName("hakimi-bazi-research", "v14")).toBe(
      "hakimi-bazi-research.generation.v14"
    );
    expect(() => buildShadowGenerationDatabaseName("hakimi-bazi-research", "V14")).toThrowError(
      DatabaseGenerationError
    );
    expect(() => buildShadowGenerationDatabaseName("unsafe:name", "v14")).toThrowError(
      DatabaseGenerationError
    );
  });

  it("keeps source committed until verified target is atomically committed", async () => {
    const { controller } = createController();
    const sourceRows = [{ id: "case-1", alias: "source remains immutable" }];
    let targetRows: typeof sourceRows = [];

    const initial = await controller.initializeCommittedGeneration(source);
    expect(initial.migrationId).toBeNull();
    expect(initial.committedGeneration).toBe("v13");
    expect(initial.receiptDigest).toMatch(/^[a-f0-9]{64}$/);

    const prepared = await controller.prepareMigration(
      { migrationId: "migration-happy", source, target },
      leaseOptions("tab-a")
    );
    expect(prepared.phase).toBe("prepared");

    const callbacks: DatabaseGenerationMigrationCallbacks = {
      materializeTarget: async ({ migration }) => {
        expect(migration.source.databaseName).toBe("hakimi-bazi-research");
        expect(migration.target.databaseName).toBe(target.databaseName);
        targetRows = structuredClone(sourceRows);
        return { targetDigest: TARGET_DIGEST };
      },
      verifyTarget: async ({ targetDigest }) => {
        expect(targetRows).toEqual(sourceRows);
        expect(targetDigest).toBe(TARGET_DIGEST);
        return { verifiedDigest: TARGET_DIGEST };
      }
    };

    const ready = await controller.resumeMigrationToReady(
      prepared.id,
      callbacks,
      leaseOptions("tab-a")
    );
    expect(ready.phase).toBe("ready");
    expect(ready.targetDigest).toBe(TARGET_DIGEST);
    expect(ready.verifiedDigest).toBe(TARGET_DIGEST);
    expect((await controller.readCommittedGeneration())?.committedGeneration).toBe("v13");
    expect(sourceRows).toEqual([{ id: "case-1", alias: "source remains immutable" }]);

    const committed = await controller.commitMigration(prepared.id, leaseOptions("tab-b"));
    const current = await controller.readCommittedGeneration();
    expect(committed.phase).toBe("committed");
    expect(committed.receiptDigest).toBe(current?.receiptDigest);
    expect(current).toMatchObject({
      committedGeneration: "v14",
      committedDatabaseName: target.databaseName,
      committedSchema: 14,
      committedBuild: "candidate-b",
      migrationId: prepared.id,
      committedDigest: TARGET_DIGEST
    });
    expect(committed.history.map((entry) => entry.phase)).toEqual([
      "prepared",
      "materializing",
      "verifying",
      "ready",
      "committed"
    ]);
  });

  it("re-signs a compatible frozen snapshot but never changes its generation identity", async () => {
    const { controller } = createController();
    const initial = await controller.initializeCommittedGeneration(source);
    const refreshedSource: DatabaseGenerationSnapshot = {
      ...source,
      buildId: "bridge-a2",
      digest: OTHER_DIGEST
    };

    const refreshed = await controller.commitCompatibleGenerationSnapshot(
      refreshedSource,
      leaseOptions("bridge-tab")
    );
    expect(refreshed).toMatchObject({
      committedGeneration: source.generation,
      committedDatabaseName: source.databaseName,
      committedSchema: source.schemaVersion,
      committedBuild: "bridge-a2",
      committedDigest: OTHER_DIGEST
    });
    expect(refreshed.receiptDigest).not.toBe(initial.receiptDigest);
    expect(await controller.initializeCommittedGeneration(refreshedSource)).toEqual(refreshed);

    await expect(
      controller.commitCompatibleGenerationSnapshot(
        { ...refreshedSource, generation: "v14" },
        leaseOptions("bridge-tab")
      )
    ).rejects.toMatchObject({ code: "CONTROL_STATE_CONFLICT" });

    await controller.prepareMigration(
      { migrationId: "migration-after-refresh", source: refreshedSource, target },
      leaseOptions("bridge-tab")
    );
    await expect(
      controller.commitCompatibleGenerationSnapshot(
        { ...refreshedSource, buildId: "bridge-a3" },
        leaseOptions("bridge-tab")
      )
    ).rejects.toMatchObject({ code: "MIGRATION_CONFLICT" });
  });

  it("isolates a verification failure without moving the committed source", async () => {
    const { controller } = createController();
    const prepared = await prepare(controller, "migration-bad-digest");
    const sourceRows = [{ id: "source-row" }];
    const targetRows = [{ id: "partial-target" }];
    let discarded = 0;

    await expect(
      controller.resumeMigrationToReady(
        prepared.id,
        {
          materializeTarget: async () => ({ targetDigest: TARGET_DIGEST }),
          verifyTarget: async () => ({ verifiedDigest: OTHER_DIGEST }),
          discardTarget: async ({ failure }) => {
            expect(failure.code).toBe("DIGEST_MISMATCH");
            targetRows.splice(0);
            discarded += 1;
          }
        },
        leaseOptions("candidate-tab")
      )
    ).rejects.toMatchObject({ code: "MIGRATION_FAILED" });

    const journal = await controller.readMigration(prepared.id);
    expect(journal).toMatchObject({
      phase: "failed",
      failure: {
        code: "DIGEST_MISMATCH",
        targetIsolation: "complete",
        isolationError: null
      }
    });
    expect(discarded).toBe(1);
    expect(targetRows).toEqual([]);
    expect(sourceRows).toEqual([{ id: "source-row" }]);
    expect((await controller.readCommittedGeneration())?.committedGeneration).toBe("v13");
    await expect(
      controller.commitMigration(prepared.id, leaseOptions("commit-tab"))
    ).rejects.toMatchObject({ code: "MIGRATION_PHASE_CONFLICT" });
  });

  it("persists failed target cleanup and can retry isolation after another interruption", async () => {
    const { controller } = createController();
    const prepared = await prepare(controller, "migration-cleanup-retry");

    await expect(
      controller.resumeMigrationToReady(
        prepared.id,
        {
          materializeTarget: async () => {
            throw new Error("copy failed");
          },
          verifyTarget: async () => ({ verifiedDigest: TARGET_DIGEST }),
          discardTarget: async () => {
            throw new Error("target database is temporarily blocked");
          }
        },
        leaseOptions("tab-a")
      )
    ).rejects.toMatchObject({ code: "MIGRATION_FAILED" });

    expect(await controller.readMigration(prepared.id)).toMatchObject({
      phase: "failed",
      failure: {
        targetIsolation: "failed",
        isolationError: "target database is temporarily blocked"
      }
    });

    await expect(controller.prepareMigration(
      {
        migrationId: "migration-cleanup-republish-v2",
        source,
        target: { ...target, buildId: "candidate-c" }
      },
      leaseOptions("republish-before-cleanup")
    )).rejects.toMatchObject({ code: "TARGET_ISOLATION_INCOMPLETE" });

    let cleanupCount = 0;
    const isolated = await controller.retryFailedTargetIsolation(
      prepared.id,
      async () => {
        cleanupCount += 1;
      },
      leaseOptions("tab-b")
    );
    expect(cleanupCount).toBe(1);
    expect(isolated.failure).toMatchObject({
      targetIsolation: "complete",
      isolationError: null
    });
    expect((await controller.readCommittedGeneration())?.committedGeneration).toBe("v13");

    await expect(controller.prepareMigration(
      {
        migrationId: "migration-cleanup-republish-v2",
        source,
        target: { ...target, buildId: "candidate-c" }
      },
      leaseOptions("republish-after-cleanup")
    )).resolves.toMatchObject({
      id: "migration-cleanup-republish-v2",
      phase: "prepared"
    });
  });

  it("retries incomplete target isolation when failMigration observes an already-failed journal", async () => {
    const { controller } = createController();
    const prepared = await prepare(controller, "migration-fail-idempotent-cleanup");

    await expect(
      controller.resumeMigrationToReady(
        prepared.id,
        {
          materializeTarget: async () => {
            throw new Error("copy failed");
          },
          verifyTarget: async () => ({ verifiedDigest: TARGET_DIGEST }),
          discardTarget: async () => {
            throw new Error("target database is temporarily blocked");
          }
        },
        leaseOptions("tab-a")
      )
    ).rejects.toMatchObject({ code: "MIGRATION_FAILED" });

    let cleanupCount = 0;
    const isolated = await controller.failMigration(
      prepared.id,
      new Error("outer boot failure"),
      leaseOptions("tab-b"),
      async () => {
        cleanupCount += 1;
      }
    );

    expect(cleanupCount).toBe(1);
    expect(isolated.failure).toMatchObject({
      code: "Error",
      message: "copy failed",
      targetIsolation: "complete",
      isolationError: null
    });
    expect((await controller.readCommittedGeneration())?.committedGeneration).toBe("v13");
  });

  it("treats not_requested as unproven isolation before admitting a new migration id", async () => {
    const { controller } = createController();
    const prepared = await prepare(controller, "migration-no-discard-callback");

    const failed = await controller.failMigration(
      prepared.id,
      new Error("renderer stopped before it could provide cleanup"),
      leaseOptions("failed-renderer")
    );
    expect(failed).toMatchObject({
      phase: "failed",
      failure: { targetIsolation: "not_requested", isolationError: null }
    });

    await expect(controller.prepareMigration(
      {
        migrationId: "migration-after-unproven-isolation",
        source,
        target: { ...target, buildId: "candidate-after-restart" }
      },
      leaseOptions("republish-before-proof")
    )).rejects.toMatchObject({ code: "TARGET_ISOLATION_INCOMPLETE" });

    let cleanupCount = 0;
    const isolated = await controller.retryFailedTargetIsolation(
      prepared.id,
      async () => {
        cleanupCount += 1;
      },
      leaseOptions("cleanup-after-restart")
    );
    expect(cleanupCount).toBe(1);
    expect(isolated.failure).toMatchObject({
      targetIsolation: "complete",
      isolationError: null
    });

    await expect(controller.prepareMigration(
      {
        migrationId: "migration-after-unproven-isolation",
        source,
        target: { ...target, buildId: "candidate-after-restart" }
      },
      leaseOptions("republish-after-proof")
    )).resolves.toMatchObject({
      id: "migration-after-unproven-isolation",
      phase: "prepared"
    });
  });

  it("uses an exclusive lease with persistent fencing across expiry and release", async () => {
    const clock = createClock();
    const databaseName = `hakimi-generation-test-${crypto.randomUUID()}`;
    const first = createController(clock, databaseName).controller;
    const second = createController(clock, databaseName).controller;

    const leaseA = await first.acquireMigrationLease("owner-a", 1_000);
    expect(leaseA.fencingToken).toBe(1);
    await expect(second.acquireMigrationLease("owner-b", 1_000)).rejects.toMatchObject({
      code: "LEASE_HELD"
    });

    clock.advance(1_001);
    const leaseB = await second.acquireMigrationLease("owner-b", 1_000);
    expect(leaseB.fencingToken).toBe(2);
    await expect(first.renewMigrationLease(leaseA, 1_000)).rejects.toMatchObject({
      code: "LEASE_LOST"
    });
    await expect(first.releaseMigrationLease(leaseA)).resolves.toBe(false);
    await expect(second.releaseMigrationLease(leaseB)).resolves.toBe(true);

    const leaseC = await first.acquireMigrationLease("owner-c", 1_000);
    expect(leaseC.fencingToken).toBe(3);
  });

  it("recovers a materializing journal after renderer death and never rewinds phase", async () => {
    const { controller, clock } = createController();
    const prepared = await prepare(controller, "migration-crash-recovery");
    const targetRows: string[] = [];

    await expect(
      controller.resumeMigrationToReady(
        prepared.id,
        {
          materializeTarget: async () => {
            targetRows.push("partial-write");
            clock.advance(1_001);
            throw new Error("renderer terminated");
          },
          verifyTarget: async () => ({ verifiedDigest: TARGET_DIGEST })
        },
        leaseOptions("dead-tab")
      )
    ).rejects.toMatchObject({ code: "LEASE_LOST" });

    const interrupted = await controller.readMigration(prepared.id);
    expect(interrupted).toMatchObject({
      phase: "materializing",
      attemptCount: 1,
      failure: null
    });
    expect((await controller.readCommittedGeneration())?.committedGeneration).toBe("v13");

    let materializeCount = 0;
    const recovered = await controller.recoverLatestMigrationToReady(
      {
        materializeTarget: async () => {
          // A recovery callback replaces, rather than appends to, an incomplete target.
          targetRows.splice(0, targetRows.length, "complete-copy");
          materializeCount += 1;
          return { targetDigest: TARGET_DIGEST };
        },
        verifyTarget: async ({ targetDigest }) => {
          expect(targetRows).toEqual(["complete-copy"]);
          return { verifiedDigest: targetDigest };
        }
      },
      leaseOptions("recovery-tab")
    );

    expect(materializeCount).toBe(1);
    expect(recovered).toMatchObject({ phase: "ready", attemptCount: 2 });
    const ranks = recovered!.history.map((entry) => databaseGenerationPhaseRank(entry.phase));
    expect(ranks).toEqual([...ranks].sort((left, right) => left - right));
    expect(recovered!.history.map((entry) => entry.phase)).toEqual([
      "prepared",
      "materializing",
      "materializing",
      "verifying",
      "ready"
    ]);

    const committed = await controller.commitMigration(prepared.id, leaseOptions("recovery-tab"));
    expect(committed.phase).toBe("committed");
    expect((await controller.readCommittedGeneration())?.committedDatabaseName).toBe(
      target.databaseName
    );
  });

  it("rejects competing pending migrations and keeps prepare idempotent by migration id", async () => {
    const { controller } = createController();
    const first = await prepare(controller, "migration-one");
    const repeated = await controller.prepareMigration(
      { migrationId: first.id, source, target },
      leaseOptions("other-tab")
    );
    expect(repeated).toEqual(first);

    await expect(
      controller.prepareMigration(
        {
          migrationId: "migration-two",
          source,
          target: {
            generation: "v15",
            databaseName: "hakimi-bazi-research.generation.v15",
            schemaVersion: 15,
            buildId: "candidate-c"
          }
        },
        leaseOptions("other-tab")
      )
    ).rejects.toMatchObject({ code: "MIGRATION_CONFLICT" });
  });
});
