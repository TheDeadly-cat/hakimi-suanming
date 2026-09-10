import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FullBackupPayload } from "@hakimi/contracts";
import {
  DatabaseGenerationError,
  type DatabaseGenerationController,
  type DatabaseGenerationMigrationJournal,
  type DatabaseGenerationReleaseState,
  type ResearchDatabaseMutationState
} from "@hakimi/storage";
import {
  BRIDGE_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR,
  type ReleaseDatabaseDescriptor
} from "../../release-protocol";
import {
  ReleaseIntegrityCacheError,
  createReleaseIntegrityContractVersion
} from "./release-integrity-cache";
import {
  ReleaseDatabaseCoordinator,
  ReleaseForwardMigrationActivationFrozenError,
  isPeerMigrationContention
} from "./release-database-coordinator";

const workerMocks = vi.hoisted(() => ({
  inspectSnapshot: vi.fn()
}));

vi.mock("./full-backup-worker-client", () => ({
  inspectFullBackupSnapshotOffMainThread: workerMocks.inspectSnapshot
}));

type TestableCoordinator = {
  ownerId: string;
  controllerPromise: Promise<DatabaseGenerationController>;
  preparePromise: Promise<void> | null;
  storageModule: unknown;
  targetDatabase: unknown;
  targetRepository: unknown;
  sourceClientsFrozen: boolean;
  sourceFreezeRequestId: string | null;
  migrationJournal: DatabaseGenerationMigrationJournal | null;
  committedState: DatabaseGenerationReleaseState | null;
  targetMaterializationStarted: boolean;
  controllerTakeoverFrozen: boolean;
  verifiedTargetSnapshot(): Promise<{ digest: string }>;
};

const payload = {} as FullBackupPayload;
const digest = "c".repeat(64);

function dirtyMutationState(epoch: number): ResearchDatabaseMutationState {
  return {
    id: "current",
    protocolVersion: 1,
    epoch,
    verifiedEpoch: null,
    verifiedPayloadDigest: null,
    verifiedContractVersion: null,
    verifiedAt: null
  };
}

function testableCoordinator(
  coordinator: ReleaseDatabaseCoordinator,
  targetRepository: unknown,
  targetDatabase: unknown
): TestableCoordinator {
  const testable = coordinator as unknown as TestableCoordinator;
  testable.targetRepository = targetRepository;
  testable.targetDatabase = targetDatabase;
  return testable;
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function releaseState(
  descriptor: ReleaseDatabaseDescriptor,
  buildId: string
): DatabaseGenerationReleaseState {
  return {
    id: "current",
    protocolVersion: 1,
    committedGeneration: descriptor.dbGeneration,
    committedDatabaseName: descriptor.databaseName,
    committedSchema: descriptor.targetSchema,
    committedBuild: buildId,
    migrationId: descriptor.migrationId,
    committedDigest: digest,
    receiptDigest: "d".repeat(64),
    committedAt: "2026-08-27T00:00:00.000Z",
    updatedAt: "2026-08-27T00:00:00.000Z"
  };
}

function sourceReleaseState(
  descriptor: ReleaseDatabaseDescriptor,
  buildId = `bootstrap-${descriptor.sourceGeneration}`
): DatabaseGenerationReleaseState {
  if (
    descriptor.sourceGeneration === null ||
    descriptor.sourceDatabaseName === null ||
    descriptor.sourceSchema === null
  ) {
    throw new Error("test descriptor requires a source generation");
  }
  return {
    id: "current",
    protocolVersion: 1,
    committedGeneration: descriptor.sourceGeneration,
    committedDatabaseName: descriptor.sourceDatabaseName,
    committedSchema: descriptor.sourceSchema,
    committedBuild: buildId,
    migrationId: null,
    committedDigest: digest,
    receiptDigest: "e".repeat(64),
    committedAt: "2026-08-27T00:00:00.000Z",
    updatedAt: "2026-08-27T00:00:00.000Z"
  };
}

function migrationJournal(
  descriptor: ReleaseDatabaseDescriptor,
  phase: DatabaseGenerationMigrationJournal["phase"],
  ownerId: string,
  failure: DatabaseGenerationMigrationJournal["failure"] = null
): DatabaseGenerationMigrationJournal {
  if (
    descriptor.migrationId === null ||
    descriptor.sourceGeneration === null ||
    descriptor.sourceDatabaseName === null ||
    descriptor.sourceSchema === null
  ) {
    throw new Error("test descriptor requires a migration lineage");
  }
  return {
    id: descriptor.migrationId,
    protocolVersion: 1,
    source: {
      generation: descriptor.sourceGeneration,
      databaseName: descriptor.sourceDatabaseName,
      schemaVersion: descriptor.sourceSchema,
      buildId: `bootstrap-${descriptor.sourceGeneration}`,
      digest
    },
    target: {
      generation: descriptor.dbGeneration,
      databaseName: descriptor.databaseName,
      schemaVersion: descriptor.targetSchema,
      buildId: "build-v15-prepare"
    },
    phase,
    targetDigest: phase === "prepared" ? null : digest,
    verifiedDigest: phase === "ready" || phase === "committed" ? digest : null,
    receiptDigest: phase === "committed" ? "f".repeat(64) : null,
    attemptCount: 1,
    lastOwnerId: ownerId,
    lastFencingToken: 1,
    failure,
    history: [],
    createdAt: "2026-08-27T00:00:00.000Z",
    updatedAt: "2026-08-27T00:00:00.000Z"
  };
}

function bootCommitHarness(
  descriptor: ReleaseDatabaseDescriptor,
  buildId: string,
  controller: unknown
) {
  const repository = {
    readFullDataSnapshot: vi.fn().mockResolvedValue(payload)
  };
  const coordinator = new ReleaseDatabaseCoordinator(descriptor, buildId);
  const testable = testableCoordinator(coordinator, repository, {});
  testable.preparePromise = Promise.resolve();
  testable.controllerPromise = Promise.resolve(controller as DatabaseGenerationController);
  return { coordinator, repository, testable };
}

function prepareStorageHarness(controller: unknown) {
  const descriptor = PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR;
  const targetDatabase = {
    name: descriptor.databaseName,
    verno: descriptor.targetSchema,
    open: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
    withReleaseMigrationWriteAccess: vi.fn(async (operation: () => Promise<unknown>) => operation())
  };
  const sourceDatabase = {
    name: descriptor.sourceDatabaseName,
    verno: descriptor.sourceSchema,
    open: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
    areReleaseWritesLocked: vi.fn().mockReturnValue(true)
  };
  const targetRepository = {
    database: targetDatabase,
    readFullDataSnapshot: vi.fn().mockResolvedValue(payload),
    replaceFullDataSnapshot: vi.fn().mockResolvedValue(undefined)
  };
  const sourceRepository = {
    database: sourceDatabase,
    readFullDataSnapshot: vi.fn().mockResolvedValue(payload)
  };
  const ResearchDatabase = vi.fn(function () {
    return sourceDatabase;
  });
  const CaseRepository = vi.fn(function () {
    return sourceRepository;
  });
  const coordinator = new ReleaseDatabaseCoordinator(descriptor, "build-v15-prepare");
  const testable = coordinator as unknown as TestableCoordinator;
  testable.storageModule = {
    caseRepository: targetRepository,
    ResearchDatabase,
    CaseRepository
  };
  testable.controllerPromise = Promise.resolve(controller as DatabaseGenerationController);
  // These tests isolate controller mutation draining. The Service Worker freeze
  // protocol has its own VM suite; start from its already-admitted state here.
  testable.sourceClientsFrozen = true;
  testable.sourceFreezeRequestId = "prepare-request";
  Object.defineProperty(navigator, "storage", {
    configurable: true,
    value: {
      estimate: vi.fn().mockResolvedValue({ usage: 0, quota: 1024 ** 3 })
    }
  });
  return {
    coordinator,
    descriptor,
    testable,
    targetDatabase,
    targetRepository,
    sourceDatabase,
    sourceRepository
  };
}

function waitForMacrotask(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

async function waitForCall(callCount: () => number, expected: number): Promise<void> {
  for (let turn = 0; turn < 100 && callCount() < expected; turn += 1) {
    await Promise.resolve();
  }
  expect(callCount()).toBe(expected);
}

function migrationResolutionAcknowledgement(
  descriptor: ReleaseDatabaseDescriptor,
  message: Record<string, unknown>,
  overrides: Record<string, unknown> = {}
) {
  const committed = message.type === "FINISH_DATABASE_MIGRATION";
  return {
    type: "DATABASE_MIGRATION_RESOLUTION_ACK_V1",
    resolutionProtocolVersion: 1,
    accepted: true,
    reason: "RESOLUTION_DISPATCHED",
    requestId: message.requestId,
    migrationId: descriptor.migrationId,
    requestedCommand: message.type,
    sourceGeneration: descriptor.sourceGeneration,
    sourceDatabaseName: descriptor.sourceDatabaseName,
    sourceSchema: descriptor.sourceSchema,
    targetGeneration: descriptor.dbGeneration,
    targetDatabaseName: descriptor.databaseName,
    targetSchema: descriptor.targetSchema,
    effectiveResolution: committed
      ? "DATABASE_MIGRATION_COMMITTED"
      : "DATABASE_MIGRATION_ABORTED",
    committedGeneration: committed ? descriptor.dbGeneration : descriptor.sourceGeneration,
    committedDatabaseName: committed ? descriptor.databaseName : descriptor.sourceDatabaseName,
    committedSchema: committed ? descriptor.targetSchema : descriptor.sourceSchema,
    committedMigrationId: committed ? descriptor.migrationId : null,
    committedReceiptDigest: committed ? "f".repeat(64) : "e".repeat(64),
    peerClientCount: 1,
    matchedClientCount: 1,
    dispatchedClientCount: 1,
    failedClientIds: [],
    ...overrides
  };
}

function migrationServiceWorkerPostMessage(descriptor: ReleaseDatabaseDescriptor) {
  return vi.fn((message: Record<string, unknown>, transfer?: Transferable[]) => {
    const responsePort = transfer?.[0] as MessagePort | undefined;
    if (!responsePort) return;
    if (message.type === "RENEW_DATABASE_MIGRATION") {
      responsePort.postMessage({
        type: "RENEW_DATABASE_MIGRATION_ACK",
        accepted: true,
        reason: "LEASE_RENEWED",
        requestId: message.requestId,
        migrationId: descriptor.migrationId,
        targetGeneration: descriptor.dbGeneration,
        targetDatabaseName: descriptor.databaseName,
        targetSchema: descriptor.targetSchema
      });
      return;
    }
    if (
      message.type === "ABORT_DATABASE_MIGRATION" ||
      message.type === "FINISH_DATABASE_MIGRATION"
    ) {
      responsePort.postMessage(migrationResolutionAcknowledgement(descriptor, message));
    }
  });
}

beforeEach(() => {
  vi.useRealTimers();
  workerMocks.inspectSnapshot.mockReset().mockResolvedValue({
    payloadDigest: digest,
    canonicalJsonByteLength: 2048
  });
  delete document.documentElement.dataset.dbIntegrityVerification;
  delete document.documentElement.dataset.dbPeerMigrationWaiting;
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, "storage");
  Reflect.deleteProperty(navigator, "serviceWorker");
  delete document.documentElement.dataset.dbIntegrityVerification;
  delete document.documentElement.dataset.dbPeerMigrationWaiting;
});

describe("ReleaseDatabaseCoordinator target integrity path", () => {
  it("keeps the exact legacy-v13 bridge identity on the original full-snapshot path", async () => {
    const repository = {
      readFullDataSnapshot: vi.fn().mockResolvedValue(payload),
      readMutationState: vi.fn()
    };
    const coordinator = testableCoordinator(
      new ReleaseDatabaseCoordinator(BRIDGE_RELEASE_DATABASE_DESCRIPTOR, "build-v13"),
      repository,
      {}
    );

    await expect(coordinator.verifiedTargetSnapshot()).resolves.toMatchObject({ digest });
    expect(repository.readFullDataSnapshot).toHaveBeenCalledTimes(1);
    expect(repository.readMutationState).not.toHaveBeenCalled();
    expect(workerMocks.inspectSnapshot).toHaveBeenCalledTimes(1);
    expect(workerMocks.inspectSnapshot).toHaveBeenCalledWith(payload, expect.objectContaining({
      appVersion: expect.any(String),
      exportedAt: expect.any(String)
    }));
    expect(document.documentElement.dataset.dbIntegrityVerification).toBeUndefined();
  });

  it("keeps Schema 15 on the original full-snapshot path", async () => {
    const repository = {
      readFullDataSnapshot: vi.fn().mockResolvedValue(payload),
      readMutationState: vi.fn()
    };
    const coordinator = testableCoordinator(
      new ReleaseDatabaseCoordinator(PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR, "build-v15"),
      repository,
      {}
    );

    await expect(coordinator.verifiedTargetSnapshot()).resolves.toMatchObject({ digest });
    await expect(coordinator.verifiedTargetSnapshot()).resolves.toMatchObject({ digest });
    expect(repository.readFullDataSnapshot).toHaveBeenCalledTimes(2);
    expect(repository.readMutationState).not.toHaveBeenCalled();
    expect(workerMocks.inspectSnapshot).toHaveBeenCalledTimes(2);
    expect(document.documentElement.dataset.dbIntegrityVerification).toBeUndefined();
  });

  it("uses one Schema 16 full audit and then reuses its same-build clean epoch", async () => {
    let state: ResearchDatabaseMutationState | null = dirtyMutationState(3);
    const repository = {
      readMutationState: vi.fn(async () => state),
      readFullDataSnapshotWithMutationState: vi.fn(async () => ({
        payload,
        epoch: 3,
        mutationState: state
      })),
      markMutationStateVerified: vi.fn(async (input: {
        expectedEpoch: number;
        payloadDigest: string;
        contractVersion: string;
        verifiedAt: string;
      }) => {
        state = {
          ...dirtyMutationState(input.expectedEpoch),
          verifiedEpoch: input.expectedEpoch,
          verifiedPayloadDigest: input.payloadDigest,
          verifiedContractVersion: input.contractVersion,
          verifiedAt: input.verifiedAt
        };
        return state;
      })
    };
    const database = {
      withReleaseMigrationWriteAccess: vi.fn(async (operation: () => Promise<unknown>) => operation())
    };
    const coordinator = testableCoordinator(
      new ReleaseDatabaseCoordinator(
        PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR,
        "build-v16"
      ),
      repository,
      database
    );

    await expect(coordinator.verifiedTargetSnapshot()).resolves.toEqual({ digest });
    await expect(coordinator.verifiedTargetSnapshot()).resolves.toEqual({ digest });
    expect(repository.readFullDataSnapshotWithMutationState).toHaveBeenCalledTimes(1);
    expect(workerMocks.inspectSnapshot).toHaveBeenCalledTimes(1);
    expect(database.withReleaseMigrationWriteAccess).toHaveBeenCalledTimes(1);
    expect(repository.markMutationStateVerified).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.dbIntegrityVerification).toBe("full_audit");
  });

  it("marks a Schema 16 clean-only boot as a privacy-free cache hit", async () => {
    const buildId = "build-v16";
    const verifiedContractVersion = await createReleaseIntegrityContractVersion(
      PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR,
      buildId
    );
    const state: ResearchDatabaseMutationState = {
      ...dirtyMutationState(4),
      verifiedEpoch: 4,
      verifiedPayloadDigest: digest,
      verifiedContractVersion,
      verifiedAt: "2026-08-04T00:00:00.000Z"
    };
    const repository = {
      readMutationState: vi.fn().mockResolvedValue(state),
      readFullDataSnapshotWithMutationState: vi.fn(),
      markMutationStateVerified: vi.fn()
    };
    const database = {
      withReleaseMigrationWriteAccess: vi.fn()
    };
    const coordinator = testableCoordinator(
      new ReleaseDatabaseCoordinator(
        PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR,
        buildId
      ),
      repository,
      database
    );

    await expect(coordinator.verifiedTargetSnapshot()).resolves.toEqual({ digest });
    expect(repository.readFullDataSnapshotWithMutationState).not.toHaveBeenCalled();
    expect(workerMocks.inspectSnapshot).not.toHaveBeenCalled();
    expect(database.withReleaseMigrationWriteAccess).not.toHaveBeenCalled();
    expect(document.documentElement.dataset.dbIntegrityVerification).toBe("cache_hit");
  });

  it("fails closed before recording boot evidence when the Schema 16 CAS returns null", async () => {
    const state = dirtyMutationState(5);
    const repository = {
      readMutationState: vi.fn().mockResolvedValue(state),
      readFullDataSnapshotWithMutationState: vi.fn().mockResolvedValue({
        payload,
        epoch: 5,
        mutationState: state
      }),
      markMutationStateVerified: vi.fn().mockResolvedValue(null)
    };
    const database = {
      withReleaseMigrationWriteAccess: vi.fn(async (operation: () => Promise<unknown>) => operation())
    };
    const coordinator = testableCoordinator(
      new ReleaseDatabaseCoordinator(
        PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR,
        "build-v16"
      ),
      repository,
      database
    );

    await expect(coordinator.verifiedTargetSnapshot()).rejects.toMatchObject({
      name: ReleaseIntegrityCacheError.name,
      code: "CAS_CONFLICT"
    });
    expect(database.withReleaseMigrationWriteAccess).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.dbIntegrityVerification).toBeUndefined();
  });
});

describe("ReleaseDatabaseCoordinator controller takeover freeze", () => {
  it("registers an admission placeholder before a synchronous re-entrant freeze", async () => {
    const coordinator = new ReleaseDatabaseCoordinator(
      BRIDGE_RELEASE_DATABASE_DESCRIPTOR,
      "build-v13-reentrant-admission"
    );
    const operation = deferred<void>();
    let freeze: Promise<void> | null = null;
    let freezeSettled = false;
    const testable = coordinator as unknown as {
      trackControllerTakeoverMutation<T>(candidate: () => Promise<T>): Promise<T>;
    };

    const mutation = testable.trackControllerTakeoverMutation(() => {
      freeze = coordinator.freezeForControllerTakeover();
      void freeze.then(() => {
        freezeSettled = true;
      });
      return operation.promise;
    });

    expect(freeze).not.toBeNull();
    await waitForMacrotask();
    expect(freezeSettled).toBe(false);

    operation.resolve();
    await mutation;
    await freeze;
    expect(freezeSettled).toBe(true);
  });

  it("drains a prep-only deferred controller writer and monotonically rejects every later mutation API", async () => {
    const initialized = deferred<DatabaseGenerationReleaseState>();
    const controller = {
      readCommittedGeneration: vi.fn().mockResolvedValue(null),
      listMigrations: vi.fn().mockResolvedValue([]),
      retryFailedTargetIsolation: vi.fn(),
      readMigration: vi.fn().mockResolvedValue(null),
      initializeCommittedGeneration: vi.fn(() => initialized.promise),
      commitCompatibleGenerationSnapshot: vi.fn(),
      prepareMigration: vi.fn(),
      resumeMigrationToReady: vi.fn(),
      failMigration: vi.fn(),
      commitMigration: vi.fn()
    };
    const { coordinator, descriptor, testable } = prepareStorageHarness(controller);
    const source = sourceReleaseState(descriptor);
    const prepared = migrationJournal(descriptor, "prepared", testable.ownerId);
    const ready = migrationJournal(descriptor, "ready", testable.ownerId);
    controller.prepareMigration.mockResolvedValue(prepared);
    controller.resumeMigrationToReady.mockResolvedValue(ready);

    const preparation = coordinator.prepareStorage();
    await waitForCall(() => controller.initializeCommittedGeneration.mock.calls.length, 1);

    let freezeSettled = false;
    const firstFreeze = coordinator.freezeForControllerTakeover();
    const secondFreeze = coordinator.freezeForControllerTakeover();
    expect(secondFreeze).toBe(firstFreeze);
    void firstFreeze.then(() => {
      freezeSettled = true;
    });
    expect(testable.controllerTakeoverFrozen).toBe(true);

    await expect(coordinator.prepareStorage()).rejects.toMatchObject({
      name: "ReleaseControllerTakeoverFrozenError"
    });
    await expect(coordinator.commitForBoot()).rejects.toMatchObject({
      name: "ReleaseControllerTakeoverFrozenError"
    });
    await expect(coordinator.failPreparedMigration(new Error("late failure"))).rejects.toMatchObject({
      name: "ReleaseControllerTakeoverFrozenError"
    });
    expect(() => coordinator.cancelPreparation(new Error("late cancellation"))).toThrowError(
      expect.objectContaining({ name: "ReleaseControllerTakeoverFrozenError" })
    );
    await waitForMacrotask();
    expect(freezeSettled).toBe(false);

    expect(controller.initializeCommittedGeneration).toHaveBeenCalledWith({
      generation: descriptor.sourceGeneration,
      databaseName: descriptor.sourceDatabaseName,
      schemaVersion: descriptor.sourceSchema,
      buildId: `bootstrap-${descriptor.sourceGeneration}`,
      digest
    });
    initialized.resolve(source);
    await expect(preparation).resolves.toBeUndefined();
    await firstFreeze;
    await secondFreeze;
    expect(freezeSettled).toBe(true);
    expect(controller.prepareMigration).toHaveBeenCalledWith({
      migrationId: descriptor.migrationId,
      source: {
        generation: descriptor.sourceGeneration,
        databaseName: descriptor.sourceDatabaseName,
        schemaVersion: descriptor.sourceSchema,
        buildId: source.committedBuild,
        digest
      },
      target: {
        generation: descriptor.dbGeneration,
        databaseName: descriptor.databaseName,
        schemaVersion: descriptor.targetSchema,
        buildId: "build-v15-prepare"
      }
    }, { ownerId: testable.ownerId });
    expect(controller.resumeMigrationToReady).toHaveBeenCalledWith(
      descriptor.migrationId,
      expect.objectContaining({
        materializeTarget: expect.any(Function),
        verifyTarget: expect.any(Function),
        discardTarget: expect.any(Function)
      }),
      { ownerId: testable.ownerId }
    );
  });

  it("drains a prep-only controller writer through its rejected final outcome", async () => {
    const initialized = deferred<DatabaseGenerationReleaseState>();
    const failure = new Error("synthetic prepare writer rejection");
    const controller = {
      readCommittedGeneration: vi.fn().mockResolvedValue(null),
      listMigrations: vi.fn().mockResolvedValue([]),
      retryFailedTargetIsolation: vi.fn(),
      readMigration: vi.fn().mockResolvedValue(null),
      initializeCommittedGeneration: vi.fn(() => initialized.promise),
      commitCompatibleGenerationSnapshot: vi.fn(),
      prepareMigration: vi.fn(),
      resumeMigrationToReady: vi.fn(),
      failMigration: vi.fn(),
      commitMigration: vi.fn()
    };
    const { coordinator, testable } = prepareStorageHarness(controller);
    // This case isolates a pre-freeze controller rejection. No Service Worker
    // freeze session was actually established, so do not inject the harness's
    // later-stage synthetic source-freeze state.
    testable.sourceClientsFrozen = false;
    testable.sourceFreezeRequestId = null;
    const preparation = coordinator.prepareStorage();
    const rejectedPreparation = expect(preparation).rejects.toBe(failure);
    await waitForCall(() => controller.initializeCommittedGeneration.mock.calls.length, 1);

    let freezeSettled = false;
    const freeze = coordinator.freezeForControllerTakeover().then(() => {
      freezeSettled = true;
    });
    await waitForMacrotask();
    expect(freezeSettled).toBe(false);

    initialized.reject(failure);
    await rejectedPreparation;
    await freeze;
    expect(freezeSettled).toBe(true);
    expect(controller.prepareMigration).not.toHaveBeenCalled();
  });

  it("keeps a natural prepare failure and failMigration finalizer in one tracked lifetime", async () => {
    const resume = deferred<DatabaseGenerationMigrationJournal>();
    const failed = deferred<DatabaseGenerationMigrationJournal>();
    const failure = new Error("synthetic resumeMigrationToReady rejection");
    const controller = {
      readCommittedGeneration: vi.fn().mockResolvedValue(null),
      listMigrations: vi.fn().mockResolvedValue([]),
      retryFailedTargetIsolation: vi.fn(),
      readMigration: vi.fn().mockResolvedValue(null),
      initializeCommittedGeneration: vi.fn(),
      commitCompatibleGenerationSnapshot: vi.fn(),
      prepareMigration: vi.fn(),
      resumeMigrationToReady: vi.fn(() => resume.promise),
      failMigration: vi.fn(() => failed.promise),
      commitMigration: vi.fn()
    };
    const { coordinator, descriptor, testable } = prepareStorageHarness(controller);
    const source = sourceReleaseState(descriptor);
    const prepared = migrationJournal(descriptor, "prepared", testable.ownerId);
    const failedJournal = migrationJournal(descriptor, "failed", testable.ownerId, {
      code: "MIGRATION_FAILED",
      message: failure.message,
      failedAt: "2026-08-27T00:00:02.000Z",
      targetIsolation: "not_requested",
      isolationError: null
    });
    controller.initializeCommittedGeneration.mockResolvedValue(source);
    controller.prepareMigration.mockResolvedValue(prepared);
    const postMessage = migrationServiceWorkerPostMessage(descriptor);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { controller: { postMessage } }
    });

    const preparation = coordinator.prepareStorage();
    const rejectedPreparation = expect(preparation).rejects.toBe(failure);
    await waitForCall(() => controller.resumeMigrationToReady.mock.calls.length, 1);
    let freezeSettled = false;
    const freeze = coordinator.freezeForControllerTakeover().then(() => {
      freezeSettled = true;
    });

    resume.reject(failure);
    await waitForCall(() => controller.failMigration.mock.calls.length, 1);
    await waitForMacrotask();
    expect(freezeSettled).toBe(false);
    expect(controller.failMigration).toHaveBeenCalledWith(
      descriptor.migrationId,
      failure,
      { ownerId: testable.ownerId },
      undefined
    );

    failed.resolve(failedJournal);
    await rejectedPreparation;
    await freeze;
    expect(freezeSettled).toBe(true);
    expect(postMessage.mock.calls.map(([message]) => message)).toContainEqual(expect.objectContaining({
      type: "ABORT_DATABASE_MIGRATION",
      requestId: "prepare-request",
      migrationId: descriptor.migrationId
    }));
  });

  it("keeps cancellation failMigration cleanup inside the shared all-settled drain across a macrotask", async () => {
    const resume = deferred<DatabaseGenerationMigrationJournal>();
    const failed = deferred<DatabaseGenerationMigrationJournal>();
    const cancellation = new Error("synthetic readiness cancellation");
    const controller = {
      readCommittedGeneration: vi.fn().mockResolvedValue(null),
      listMigrations: vi.fn().mockResolvedValue([]),
      retryFailedTargetIsolation: vi.fn(),
      readMigration: vi.fn().mockResolvedValue(null),
      initializeCommittedGeneration: vi.fn(),
      commitCompatibleGenerationSnapshot: vi.fn(),
      prepareMigration: vi.fn(),
      resumeMigrationToReady: vi.fn(() => resume.promise),
      failMigration: vi.fn(() => failed.promise),
      commitMigration: vi.fn()
    };
    const { coordinator, descriptor, testable } = prepareStorageHarness(controller);
    const source = sourceReleaseState(descriptor);
    const prepared = migrationJournal(descriptor, "prepared", testable.ownerId);
    const ready = migrationJournal(descriptor, "ready", testable.ownerId);
    const failedJournal = migrationJournal(descriptor, "failed", testable.ownerId, {
      code: "MIGRATION_FAILED",
      message: cancellation.message,
      failedAt: "2026-08-27T00:00:01.000Z",
      targetIsolation: "not_requested",
      isolationError: null
    });
    controller.initializeCommittedGeneration.mockResolvedValue(source);
    controller.prepareMigration.mockResolvedValue(prepared);
    const postMessage = migrationServiceWorkerPostMessage(descriptor);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { controller: { postMessage } }
    });

    const preparation = coordinator.prepareStorage();
    const rejectedPreparation = expect(preparation).rejects.toBe(cancellation);
    await waitForCall(() => controller.resumeMigrationToReady.mock.calls.length, 1);
    coordinator.cancelPreparation(cancellation);

    let freezeSettled = false;
    const firstFreeze = coordinator.freezeForControllerTakeover();
    const secondFreeze = coordinator.freezeForControllerTakeover();
    expect(secondFreeze).toBe(firstFreeze);
    void firstFreeze.then(() => {
      freezeSettled = true;
    });
    await waitForMacrotask();
    expect(freezeSettled).toBe(false);

    resume.resolve(ready);
    await waitForCall(() => controller.failMigration.mock.calls.length, 1);
    expect(controller.failMigration).toHaveBeenCalledWith(
      descriptor.migrationId,
      cancellation,
      { ownerId: testable.ownerId },
      undefined
    );
    // This real timer turn is stronger than a microtask-only pending check: the
    // underlying preparation has failed, but its admitted failMigration and
    // resolution receipt still own the original takeover drain.
    await waitForMacrotask();
    expect(freezeSettled).toBe(false);

    failed.resolve(failedJournal);
    await rejectedPreparation;
    expect(postMessage.mock.calls.map(([message]) => message)).toContainEqual(expect.objectContaining({
      type: "ABORT_DATABASE_MIGRATION",
      requestId: "prepare-request",
      migrationId: descriptor.migrationId
    }));
    await firstFreeze;
    await secondFreeze;
    expect(freezeSettled).toBe(true);
    expect(controller.failMigration).toHaveBeenCalledTimes(1);
    expect(postMessage.mock.calls.filter(
      ([message]) => message.type === "ABORT_DATABASE_MIGRATION"
    )).toHaveLength(1);
    await expect(coordinator.failPreparedMigration(cancellation)).rejects.toMatchObject({
      name: "ReleaseControllerTakeoverFrozenError"
    });
  });

  it("keeps a rejected failMigration transition sticky across prepare, commit, cancel, and explicit fail entry points", async () => {
    const resume = deferred<DatabaseGenerationMigrationJournal>();
    const cancellation = new Error("synthetic multi-entry cancellation");
    const explicitFailure = new Error("synthetic explicit failure owner");
    const journalFailure = new Error("synthetic failMigration rejection");
    const controller = {
      readCommittedGeneration: vi.fn().mockResolvedValue(null),
      listMigrations: vi.fn().mockResolvedValue([]),
      retryFailedTargetIsolation: vi.fn(),
      readMigration: vi.fn().mockResolvedValue(null),
      initializeCommittedGeneration: vi.fn(),
      commitCompatibleGenerationSnapshot: vi.fn(),
      prepareMigration: vi.fn(),
      resumeMigrationToReady: vi.fn(() => resume.promise),
      failMigration: vi.fn().mockRejectedValue(journalFailure),
      commitMigration: vi.fn()
    };
    const { coordinator, descriptor, testable } = prepareStorageHarness(controller);
    const source = sourceReleaseState(descriptor);
    const prepared = migrationJournal(descriptor, "prepared", testable.ownerId);
    const ready = migrationJournal(descriptor, "ready", testable.ownerId);
    controller.initializeCommittedGeneration.mockResolvedValue(source);
    controller.prepareMigration.mockResolvedValue(prepared);
    const postMessage = migrationServiceWorkerPostMessage(descriptor);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { controller: { postMessage } }
    });

    const commit = coordinator.commitForBoot();
    const rejectedCommit = expect(commit).rejects.toBeInstanceOf(AggregateError);
    const preparation = coordinator.prepareStorage();
    const rejectedPreparation = expect(preparation).rejects.toBeInstanceOf(AggregateError);
    await waitForCall(() => controller.resumeMigrationToReady.mock.calls.length, 1);

    coordinator.cancelPreparation(cancellation);
    const explicitFinalization = coordinator.failPreparedMigration(explicitFailure);
    const rejectedExplicitFinalization = expect(explicitFinalization).rejects.toBe(journalFailure);
    await waitForCall(() => controller.failMigration.mock.calls.length, 1);
    const freeze = coordinator.freezeForControllerTakeover();

    await rejectedExplicitFinalization;
    resume.resolve(ready);
    await rejectedPreparation;
    await rejectedCommit;
    await freeze;

    expect(controller.failMigration).toHaveBeenCalledTimes(1);
    expect(controller.failMigration).toHaveBeenCalledWith(
      descriptor.migrationId,
      explicitFailure,
      { ownerId: testable.ownerId },
      undefined
    );
    expect(postMessage.mock.calls.filter(
      ([message]) => message.type === "ABORT_DATABASE_MIGRATION"
    )).toHaveLength(1);
  });

  it("keeps an explicitly admitted failPreparedMigration writer inside the takeover drain", async () => {
    const failed = deferred<DatabaseGenerationMigrationJournal>();
    const failure = new Error("synthetic explicit in-flight failure");
    const controller = {
      readCommittedGeneration: vi.fn(),
      listMigrations: vi.fn(),
      retryFailedTargetIsolation: vi.fn(),
      readMigration: vi.fn(),
      initializeCommittedGeneration: vi.fn(),
      commitCompatibleGenerationSnapshot: vi.fn(),
      prepareMigration: vi.fn(),
      resumeMigrationToReady: vi.fn(),
      failMigration: vi.fn(() => failed.promise),
      commitMigration: vi.fn()
    };
    const { coordinator, descriptor, testable } = prepareStorageHarness(controller);
    const ready = migrationJournal(descriptor, "ready", testable.ownerId);
    const failedJournal = migrationJournal(descriptor, "failed", testable.ownerId, {
      code: "MIGRATION_FAILED",
      message: failure.message,
      failedAt: "2026-08-27T00:00:04.000Z",
      targetIsolation: "not_requested",
      isolationError: null
    });
    testable.migrationJournal = ready;
    const postMessage = migrationServiceWorkerPostMessage(descriptor);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { controller: { postMessage } }
    });

    const finalization = coordinator.failPreparedMigration(failure);
    await waitForCall(() => controller.failMigration.mock.calls.length, 1);
    let freezeSettled = false;
    const freeze = coordinator.freezeForControllerTakeover().then(() => {
      freezeSettled = true;
    });
    await waitForMacrotask();
    expect(freezeSettled).toBe(false);

    failed.resolve(failedJournal);
    await finalization;
    await freeze;
    expect(freezeSettled).toBe(true);
    expect(controller.failMigration).toHaveBeenCalledTimes(1);
    expect(postMessage.mock.calls.filter(
      ([message]) => message.type === "ABORT_DATABASE_MIGRATION"
    )).toHaveLength(1);
  });

  it("keeps Service Worker commit acknowledgement and exact receipt inside the takeover drain", async () => {
    const descriptor = PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR;
    const committed = releaseState(descriptor, "build-v15-ack");
    const unlockReleaseWrites = vi.fn();
    const coordinator = new ReleaseDatabaseCoordinator(descriptor, "build-v15-ack");
    const testable = testableCoordinator(
      coordinator,
      { readFullDataSnapshot: vi.fn() },
      { unlockReleaseWrites }
    );
    testable.committedState = committed;
    testable.sourceClientsFrozen = true;
    testable.sourceFreezeRequestId = "finish-request";
    let resolutionPort: MessagePort | undefined;
    const serviceWorkerController = {
      postMessage: vi.fn((message: Record<string, unknown>, transfer?: Transferable[]) => {
        expect(message).toMatchObject({
          type: "FINISH_DATABASE_MIGRATION",
          resolutionProtocolVersion: 1,
          requestId: "finish-request",
          migrationId: descriptor.migrationId,
          sourceGeneration: descriptor.sourceGeneration,
          sourceDatabaseName: descriptor.sourceDatabaseName,
          sourceSchema: descriptor.sourceSchema,
          targetGeneration: descriptor.dbGeneration,
          targetDatabaseName: descriptor.databaseName,
          targetSchema: descriptor.targetSchema
        });
        resolutionPort = transfer?.[0] as MessagePort | undefined;
      })
    };
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { controller: serviceWorkerController }
    });

    const acknowledgement = coordinator.acknowledgeServiceWorkerCommit();
    await waitForMacrotask();
    expect(resolutionPort).toBeDefined();
    let freezeSettled = false;
    const freeze = coordinator.freezeForControllerTakeover().then(() => {
      freezeSettled = true;
    });
    await waitForMacrotask();
    expect(freezeSettled).toBe(false);
    expect(unlockReleaseWrites).not.toHaveBeenCalled();

    resolutionPort?.postMessage({
      type: "DATABASE_MIGRATION_RESOLUTION_ACK_V1",
      resolutionProtocolVersion: 1,
      accepted: true,
      reason: "RESOLUTION_DISPATCHED",
      requestId: "finish-request",
      migrationId: descriptor.migrationId,
      requestedCommand: "FINISH_DATABASE_MIGRATION",
      sourceGeneration: descriptor.sourceGeneration,
      sourceDatabaseName: descriptor.sourceDatabaseName,
      sourceSchema: descriptor.sourceSchema,
      targetGeneration: descriptor.dbGeneration,
      targetDatabaseName: descriptor.databaseName,
      targetSchema: descriptor.targetSchema,
      effectiveResolution: "DATABASE_MIGRATION_COMMITTED",
      committedGeneration: descriptor.dbGeneration,
      committedDatabaseName: descriptor.databaseName,
      committedSchema: descriptor.targetSchema,
      committedMigrationId: descriptor.migrationId,
      committedReceiptDigest: committed.receiptDigest,
      peerClientCount: 2,
      matchedClientCount: 1,
      dispatchedClientCount: 1,
      failedClientIds: []
    });

    await acknowledgement;
    await freeze;
    expect(freezeSettled).toBe(true);
    expect(unlockReleaseWrites).toHaveBeenCalledTimes(1);
    expect(testable.sourceClientsFrozen).toBe(false);
    expect(testable.sourceFreezeRequestId).toBeNull();
    await expect(coordinator.acknowledgeServiceWorkerCommit()).rejects.toMatchObject({
      name: "ReleaseControllerTakeoverFrozenError"
    });
  });

  it("does not unlock on an aborted FINISH receipt and preserves the exact session for retry", async () => {
    const descriptor = PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR;
    const committed = releaseState(descriptor, "build-v15-resolution-retry");
    const unlockReleaseWrites = vi.fn();
    const coordinator = new ReleaseDatabaseCoordinator(
      descriptor,
      "build-v15-resolution-retry"
    );
    const testable = testableCoordinator(
      coordinator,
      { readFullDataSnapshot: vi.fn() },
      { unlockReleaseWrites }
    );
    testable.committedState = committed;
    testable.sourceClientsFrozen = true;
    testable.sourceFreezeRequestId = "finish-retry-request";
    let attempt = 0;
    const postMessage = vi.fn((message: Record<string, unknown>, transfer?: Transferable[]) => {
      attempt += 1;
      const effectiveCommitted = attempt > 1;
      (transfer?.[0] as MessagePort | undefined)?.postMessage({
        type: "DATABASE_MIGRATION_RESOLUTION_ACK_V1",
        resolutionProtocolVersion: 1,
        accepted: true,
        reason: "RESOLUTION_DISPATCHED",
        requestId: message.requestId,
        migrationId: descriptor.migrationId,
        requestedCommand: "FINISH_DATABASE_MIGRATION",
        sourceGeneration: descriptor.sourceGeneration,
        sourceDatabaseName: descriptor.sourceDatabaseName,
        sourceSchema: descriptor.sourceSchema,
        targetGeneration: descriptor.dbGeneration,
        targetDatabaseName: descriptor.databaseName,
        targetSchema: descriptor.targetSchema,
        effectiveResolution: effectiveCommitted
          ? "DATABASE_MIGRATION_COMMITTED"
          : "DATABASE_MIGRATION_ABORTED",
        committedGeneration: effectiveCommitted
          ? descriptor.dbGeneration
          : descriptor.sourceGeneration,
        committedDatabaseName: effectiveCommitted
          ? descriptor.databaseName
          : descriptor.sourceDatabaseName,
        committedSchema: effectiveCommitted
          ? descriptor.targetSchema
          : descriptor.sourceSchema,
        committedMigrationId: effectiveCommitted ? descriptor.migrationId : null,
        committedReceiptDigest: effectiveCommitted
          ? committed.receiptDigest
          : "e".repeat(64),
        peerClientCount: 1,
        matchedClientCount: 1,
        dispatchedClientCount: 1,
        failedClientIds: []
      });
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { controller: { postMessage } }
    });

    await expect(coordinator.acknowledgeServiceWorkerCommit()).rejects.toThrow(
      "旧标签页迁移写锁释放未获精确回执"
    );
    expect(unlockReleaseWrites).not.toHaveBeenCalled();
    expect(testable.sourceClientsFrozen).toBe(true);
    expect(testable.sourceFreezeRequestId).toBe("finish-retry-request");

    await expect(coordinator.acknowledgeServiceWorkerCommit()).resolves.toBeUndefined();
    expect(postMessage).toHaveBeenCalledTimes(2);
    expect(unlockReleaseWrites).toHaveBeenCalledTimes(1);
    expect(testable.sourceClientsFrozen).toBe(false);
    expect(testable.sourceFreezeRequestId).toBeNull();
  });

  it.each([
    ["a Service Worker NACK", {
      accepted: false,
      reason: "CONTROL_STATE_UNVERIFIED"
    }],
    ["a malformed committed receipt", {
      committedReceiptDigest: "not-a-sha256-digest"
    }]
  ])("preserves the frozen source identity after %s", async (_label, overrides) => {
    const descriptor = PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR;
    const committed = releaseState(descriptor, "build-v15-invalid-resolution");
    const unlockReleaseWrites = vi.fn();
    const coordinator = new ReleaseDatabaseCoordinator(
      descriptor,
      "build-v15-invalid-resolution"
    );
    const testable = testableCoordinator(
      coordinator,
      { readFullDataSnapshot: vi.fn() },
      { unlockReleaseWrites }
    );
    testable.committedState = committed;
    testable.sourceClientsFrozen = true;
    testable.sourceFreezeRequestId = "invalid-resolution-request";
    const postMessage = vi.fn((message: Record<string, unknown>, transfer?: Transferable[]) => {
      (transfer?.[0] as MessagePort | undefined)?.postMessage(
        migrationResolutionAcknowledgement(descriptor, message, {
          committedReceiptDigest: committed.receiptDigest,
          ...overrides
        })
      );
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { controller: { postMessage } }
    });

    await expect(coordinator.acknowledgeServiceWorkerCommit()).rejects.toThrow(
      "旧标签页迁移写锁释放未获精确回执"
    );
    expect(unlockReleaseWrites).not.toHaveBeenCalled();
    expect(testable.sourceClientsFrozen).toBe(true);
    expect(testable.sourceFreezeRequestId).toBe("invalid-resolution-request");
  });

  it("keeps the exact source freeze through the three-second resolution timeout and drains it as a rejected final outcome", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    try {
      const descriptor = PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR;
      const committed = releaseState(descriptor, "build-v15-resolution-timeout");
      const unlockReleaseWrites = vi.fn();
      const coordinator = new ReleaseDatabaseCoordinator(
        descriptor,
        "build-v15-resolution-timeout"
      );
      const testable = testableCoordinator(
        coordinator,
        { readFullDataSnapshot: vi.fn() },
        { unlockReleaseWrites }
      );
      testable.committedState = committed;
      testable.sourceClientsFrozen = true;
      testable.sourceFreezeRequestId = "resolution-timeout-request";
      const postMessage = vi.fn();
      Object.defineProperty(navigator, "serviceWorker", {
        configurable: true,
        value: { controller: { postMessage } }
      });

      const acknowledgement = coordinator.acknowledgeServiceWorkerCommit();
      const rejectedAcknowledgement = expect(acknowledgement).rejects.toThrow(
        "等待旧标签页迁移写锁释放回执超时"
      );
      await waitForCall(() => postMessage.mock.calls.length, 1);
      let freezeSettled = false;
      const freeze = coordinator.freezeForControllerTakeover().then(() => {
        freezeSettled = true;
      });

      await vi.advanceTimersByTimeAsync(2_999);
      expect(freezeSettled).toBe(false);
      expect(testable.sourceClientsFrozen).toBe(true);
      expect(testable.sourceFreezeRequestId).toBe("resolution-timeout-request");
      expect(unlockReleaseWrites).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      await rejectedAcknowledgement;
      await freeze;
      expect(freezeSettled).toBe(true);
      expect(testable.sourceClientsFrozen).toBe(true);
      expect(testable.sourceFreezeRequestId).toBe("resolution-timeout-request");
      expect(unlockReleaseWrites).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("waits for a real initializeCommittedGeneration commit to succeed after closing synchronously", async () => {
    const initialized = deferred<DatabaseGenerationReleaseState>();
    const committed = releaseState(BRIDGE_RELEASE_DATABASE_DESCRIPTOR, "build-v13");
    const controller = {
      readCommittedGeneration: vi.fn().mockResolvedValue(null),
      initializeCommittedGeneration: vi.fn(() => initialized.promise),
      commitCompatibleGenerationSnapshot: vi.fn(),
      commitMigration: vi.fn(),
      readMigration: vi.fn()
    };
    const { coordinator, repository, testable } = bootCommitHarness(
      BRIDGE_RELEASE_DATABASE_DESCRIPTOR,
      "build-v13",
      controller
    );
    const commit = coordinator.commitForBoot();
    await waitForCall(() => controller.initializeCommittedGeneration.mock.calls.length, 1);
    expect(controller.initializeCommittedGeneration).toHaveBeenCalledWith({
      generation: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.dbGeneration,
      databaseName: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.databaseName,
      schemaVersion: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.targetSchema,
      buildId: "build-v13",
      digest
    });

    let freezeSettled = false;
    const freeze = coordinator.freezeForControllerTakeover().then(() => {
      freezeSettled = true;
    });
    expect(testable.controllerTakeoverFrozen).toBe(true);
    const lateCommit = expect(coordinator.commitForBoot()).rejects.toMatchObject({
      name: "ReleaseControllerTakeoverFrozenError"
    });
    await waitForMacrotask();
    expect(freezeSettled).toBe(false);

    initialized.resolve(committed);
    await expect(commit).resolves.toEqual({
      state: committed,
      migrationReceiptDigest: committed.receiptDigest
    });
    await freeze;
    await lateCommit;
    expect(freezeSettled).toBe(true);
    expect(repository.readFullDataSnapshot).toHaveBeenCalledTimes(1);
    expect(controller.commitCompatibleGenerationSnapshot).not.toHaveBeenCalled();
    await expect(coordinator.commitForBoot()).rejects.toMatchObject({
      name: "ReleaseControllerTakeoverFrozenError"
    });
  });

  it("waits for a real commitCompatibleGenerationSnapshot rejection before completing the freeze", async () => {
    const compatibleCommit = deferred<DatabaseGenerationReleaseState>();
    const existing = releaseState(BRIDGE_RELEASE_DATABASE_DESCRIPTOR, "build-v12");
    const failure = new Error("synthetic compatible snapshot rejection");
    const controller = {
      readCommittedGeneration: vi.fn().mockResolvedValue(existing),
      initializeCommittedGeneration: vi.fn(),
      commitCompatibleGenerationSnapshot: vi.fn(() => compatibleCommit.promise),
      commitMigration: vi.fn(),
      readMigration: vi.fn()
    };
    const { coordinator, testable } = bootCommitHarness(
      BRIDGE_RELEASE_DATABASE_DESCRIPTOR,
      "build-v13",
      controller
    );
    const commit = coordinator.commitForBoot();
    const rejectedCommit = expect(commit).rejects.toBe(failure);
    await waitForCall(() => controller.commitCompatibleGenerationSnapshot.mock.calls.length, 1);
    expect(controller.commitCompatibleGenerationSnapshot).toHaveBeenCalledWith({
      generation: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.dbGeneration,
      databaseName: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.databaseName,
      schemaVersion: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.targetSchema,
      buildId: "build-v13",
      digest
    }, { ownerId: testable.ownerId });

    let freezeSettled = false;
    const freeze = coordinator.freezeForControllerTakeover().then(() => {
      freezeSettled = true;
    });
    expect(testable.controllerTakeoverFrozen).toBe(true);
    await waitForMacrotask();
    expect(freezeSettled).toBe(false);
    await expect(coordinator.commitForBoot()).rejects.toMatchObject({
      name: "ReleaseControllerTakeoverFrozenError"
    });

    compatibleCommit.reject(failure);
    await rejectedCommit;
    await freeze;
    expect(freezeSettled).toBe(true);
    expect(controller.initializeCommittedGeneration).not.toHaveBeenCalled();
    await expect(coordinator.commitForBoot()).rejects.toMatchObject({
      name: "ReleaseControllerTakeoverFrozenError"
    });
  });

  it("keeps commitMigration rejection cleanup in the original commit drain lifetime", async () => {
    const descriptor = PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR;
    const buildId = "build-v15-commit-failure";
    const commitAttempt = deferred<DatabaseGenerationMigrationJournal>();
    const failed = deferred<DatabaseGenerationMigrationJournal>();
    const failure = new Error("synthetic commitMigration rejection");
    const source = sourceReleaseState(descriptor);
    const controller = {
      readCommittedGeneration: vi.fn().mockResolvedValue(source),
      initializeCommittedGeneration: vi.fn(),
      commitCompatibleGenerationSnapshot: vi.fn(),
      commitMigration: vi.fn(() => commitAttempt.promise),
      failMigration: vi.fn(() => failed.promise),
      readMigration: vi.fn()
    };
    const { coordinator, testable } = bootCommitHarness(descriptor, buildId, controller);
    const ready = migrationJournal(descriptor, "ready", testable.ownerId);
    const failedJournal = migrationJournal(descriptor, "failed", testable.ownerId, {
      code: "MIGRATION_FAILED",
      message: failure.message,
      failedAt: "2026-08-27T00:00:03.000Z",
      targetIsolation: "not_requested",
      isolationError: null
    });
    testable.migrationJournal = ready;
    testable.sourceClientsFrozen = true;
    testable.sourceFreezeRequestId = "commit-request";
    const postMessage = migrationServiceWorkerPostMessage(descriptor);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { controller: { postMessage } }
    });

    const commit = coordinator.commitForBoot();
    const rejectedCommit = expect(commit).rejects.toBe(failure);
    await waitForMacrotask();
    await waitForCall(() => controller.commitMigration.mock.calls.length, 1);
    let freezeSettled = false;
    const freeze = coordinator.freezeForControllerTakeover().then(() => {
      freezeSettled = true;
    });

    commitAttempt.reject(failure);
    await waitForCall(() => controller.failMigration.mock.calls.length, 1);
    await waitForMacrotask();
    expect(freezeSettled).toBe(false);
    expect(controller.commitMigration).toHaveBeenCalledWith(
      descriptor.migrationId,
      { ownerId: testable.ownerId }
    );
    expect(controller.failMigration).toHaveBeenCalledWith(
      descriptor.migrationId,
      failure,
      { ownerId: testable.ownerId },
      undefined
    );

    failed.resolve(failedJournal);
    await rejectedCommit;
    await freeze;
    expect(freezeSettled).toBe(true);
    expect(postMessage.mock.calls.map(([message]) => message)).toContainEqual(expect.objectContaining({
      type: "ABORT_DATABASE_MIGRATION",
      requestId: "commit-request",
      migrationId: descriptor.migrationId
    }));
  });

  it("waits through peer migration wakeup and lets the loop-top freeze guard prevent a second write", async () => {
    vi.useFakeTimers();
    const descriptor = PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR;
    const buildId = "build-v15-peer";
    const peerCommitted = releaseState(descriptor, "peer-build-v15");
    const controller = {
      readCommittedGeneration: vi.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValue(peerCommitted),
      readMigration: vi.fn().mockResolvedValue({ phase: "prepared" }),
      initializeCommittedGeneration: vi.fn().mockRejectedValue(new DatabaseGenerationError(
        "LEASE_HELD",
        "migration lease is held by another owner"
      )),
      commitCompatibleGenerationSnapshot: vi.fn(),
      commitMigration: vi.fn()
    };
    const { coordinator, repository, testable } = bootCommitHarness(
      descriptor,
      buildId,
      controller
    );
    const commit = coordinator.commitForBoot();
    const rejectedCommit = expect(commit).rejects.toMatchObject({
      name: "ReleaseControllerTakeoverFrozenError"
    });
    await waitForCall(() => controller.readMigration.mock.calls.length, 1);
    expect(document.documentElement.dataset.dbPeerMigrationWaiting).toBe("true");
    expect(controller.initializeCommittedGeneration).toHaveBeenCalledWith({
      generation: descriptor.dbGeneration,
      databaseName: descriptor.databaseName,
      schemaVersion: descriptor.targetSchema,
      buildId,
      digest
    });

    let freezeSettled = false;
    const freeze = coordinator.freezeForControllerTakeover().then(() => {
      freezeSettled = true;
    });
    expect(testable.controllerTakeoverFrozen).toBe(true);
    const freezeBarrier = waitForMacrotask();
    await vi.advanceTimersByTimeAsync(0);
    await freezeBarrier;
    expect(freezeSettled).toBe(false);
    await expect(coordinator.commitForBoot()).rejects.toMatchObject({
      name: "ReleaseControllerTakeoverFrozenError"
    });

    await vi.advanceTimersByTimeAsync(1_000);
    await rejectedCommit;
    await freeze;
    expect(freezeSettled).toBe(true);
    expect(document.documentElement.dataset.dbPeerMigrationWaiting).toBeUndefined();
    expect(repository.readFullDataSnapshot).toHaveBeenCalledTimes(1);
    expect(controller.readCommittedGeneration).toHaveBeenCalledTimes(3);
    expect(controller.readMigration).toHaveBeenCalledTimes(2);
    expect(controller.initializeCommittedGeneration).toHaveBeenCalledTimes(1);
    expect(controller.commitCompatibleGenerationSnapshot).not.toHaveBeenCalled();
    expect(controller.commitMigration).not.toHaveBeenCalled();
    await expect(coordinator.commitForBoot()).rejects.toMatchObject({
      name: "ReleaseControllerTakeoverFrozenError"
    });
  });
});

describe("first controller claim navigation state", () => {
  function navigationHarness() {
    const state = releaseState(BRIDGE_RELEASE_DATABASE_DESCRIPTOR, "build-v13-first-claim");
    const controller = {
      readCommittedGeneration: vi.fn().mockResolvedValue(state),
      readCommittedGenerationFromOpenConnection: vi.fn().mockResolvedValue(state),
      initializeCommittedGeneration: vi.fn(),
      commitCompatibleGenerationSnapshot: vi.fn(),
      commitMigration: vi.fn()
    };
    const { coordinator, testable } = bootCommitHarness(
      BRIDGE_RELEASE_DATABASE_DESCRIPTOR, state.committedBuild, controller
    );
    return { coordinator, controller, testable, state };
  }

  it("fails an early peer claim before any control read, initialization, or mutation", async () => {
    const { coordinator, controller, testable } = navigationHarness();
    await coordinator.freezeForControllerTakeover();
    await expect(coordinator.verifyFirstControllerClaimNavigationState()).rejects.toThrow("尚未完成");
    expect(testable.controllerTakeoverFrozen).toBe(true);
    expect(controller.readCommittedGeneration).not.toHaveBeenCalled();
    expect(controller.readCommittedGenerationFromOpenConnection).not.toHaveBeenCalled();
    expect(controller.initializeCommittedGeneration).not.toHaveBeenCalled();
    expect(controller.commitCompatibleGenerationSnapshot).not.toHaveBeenCalled();
    expect(controller.commitMigration).not.toHaveBeenCalled();
  });

  it("re-reads the formal persisted receipt after a normal commit while keeping all mutations frozen", async () => {
    const { coordinator, controller, testable, state } = navigationHarness();
    await coordinator.commitForBoot();
    await coordinator.freezeForControllerTakeover();
    await expect(coordinator.verifyFirstControllerClaimNavigationState()).resolves.toBeUndefined();
    expect(controller.readCommittedGeneration).toHaveBeenCalledTimes(1);
    expect(controller.readCommittedGenerationFromOpenConnection).toHaveBeenCalledTimes(1);
    expect(testable.committedState).toBe(state);
    expect(testable.controllerTakeoverFrozen).toBe(true);
    expect(controller.initializeCommittedGeneration).not.toHaveBeenCalled();
    expect(controller.commitCompatibleGenerationSnapshot).not.toHaveBeenCalled();
    expect(controller.commitMigration).not.toHaveBeenCalled();
    await expect(coordinator.commitForBoot()).rejects.toMatchObject({ name: "ReleaseControllerTakeoverFrozenError" });
  });

  it.each(["absent", "build", "generation", "database", "schema", "migration", "receipt"] as const)(
    "rejects a changed persisted pointer after a normal commit: %s", async (change) => {
      const { coordinator, controller, testable, state } = navigationHarness();
      await coordinator.commitForBoot();
      await coordinator.freezeForControllerTakeover();
      const next = change === "absent" ? null : {
        ...state,
        ...(change === "build" ? { committedBuild: "peer-build" } : {}),
        ...(change === "generation" ? { committedGeneration: "v16" } : {}),
        ...(change === "database" ? { committedDatabaseName: "other-database" } : {}),
        ...(change === "schema" ? { committedSchema: 16 } : {}),
        ...(change === "migration" ? { migrationId: "peer-migration" } : {}),
        ...(change === "receipt" ? { receiptDigest: "a".repeat(64) } : {})
      };
      controller.readCommittedGenerationFromOpenConnection.mockResolvedValue(next);
      await expect(coordinator.verifyFirstControllerClaimNavigationState()).rejects.toThrow("回执与本页不一致");
      expect(controller.readCommittedGeneration).toHaveBeenCalledTimes(1);
      expect(controller.readCommittedGenerationFromOpenConnection).toHaveBeenCalledTimes(1);
      expect(testable.committedState).toBe(state);
      expect(testable.controllerTakeoverFrozen).toBe(true);
      expect(controller.initializeCommittedGeneration).not.toHaveBeenCalled();
      expect(controller.commitCompatibleGenerationSnapshot).not.toHaveBeenCalled();
      expect(controller.commitMigration).not.toHaveBeenCalled();
    }
  );

  it("propagates formal receipt-integrity rejection instead of trusting the cached commit", async () => {
    const { coordinator, controller, testable } = navigationHarness();
    await coordinator.commitForBoot();
    await coordinator.freezeForControllerTakeover();
    const failure = new DatabaseGenerationError("CONTROL_STATE_CORRUPT", "receipt verification failed");
    controller.readCommittedGenerationFromOpenConnection.mockRejectedValue(failure);
    await expect(coordinator.verifyFirstControllerClaimNavigationState()).rejects.toBe(failure);
    expect(controller.readCommittedGeneration).toHaveBeenCalledTimes(1);
    expect(controller.readCommittedGenerationFromOpenConnection).toHaveBeenCalledTimes(1);
    expect(testable.controllerTakeoverFrozen).toBe(true);
    expect(controller.initializeCommittedGeneration).not.toHaveBeenCalled();
    expect(controller.commitCompatibleGenerationSnapshot).not.toHaveBeenCalled();
    expect(controller.commitMigration).not.toHaveBeenCalled();
  });

  it("requires the page writer to be frozen before re-reading a committed pointer", async () => {
    const { coordinator, controller } = navigationHarness();
    await coordinator.commitForBoot();
    await expect(coordinator.verifyFirstControllerClaimNavigationState()).rejects.toThrow("尚未完成");
    expect(controller.readCommittedGeneration).toHaveBeenCalledTimes(1);
    expect(controller.readCommittedGenerationFromOpenConnection).not.toHaveBeenCalled();
  });
});

describe("committed shadow first controller claim navigation state", () => {
  async function shadowNavigationHarness(
    descriptor: ReleaseDatabaseDescriptor = PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR
  ) {
    const state = releaseState(descriptor, "build-v16-first-claim");
    const verifiedContractVersion = await createReleaseIntegrityContractVersion(descriptor, state.committedBuild);
    const repository = {
      readMutationState: vi.fn().mockResolvedValue({
        ...dirtyMutationState(0),
        verifiedEpoch: 0,
        verifiedPayloadDigest: digest,
        verifiedContractVersion,
        verifiedAt: "2026-08-27T00:00:00.000Z"
      }),
      readFullDataSnapshotWithMutationState: vi.fn(),
      markMutationStateVerified: vi.fn()
    };
    const database = {
      open: vi.fn(),
      unlockReleaseWrites: vi.fn(),
      withReleaseMigrationWriteAccess: vi.fn()
    };
    const controller = {
      readCommittedGeneration: vi.fn().mockResolvedValue(state),
      readCommittedGenerationFromOpenConnection: vi.fn().mockResolvedValue(state),
      initializeCommittedGeneration: vi.fn(),
      commitCompatibleGenerationSnapshot: vi.fn(),
      commitMigration: vi.fn()
    };
    const coordinator = new ReleaseDatabaseCoordinator(descriptor, state.committedBuild);
    const testable = testableCoordinator(coordinator, repository, database);
    testable.preparePromise = Promise.resolve();
    testable.controllerPromise = Promise.resolve(controller as unknown as DatabaseGenerationController);
    return { coordinator, testable, controller, repository, database, state };
  }

  function expectNoNavigationWrites(harness: Awaited<ReturnType<typeof shadowNavigationHarness>>) {
    expect(harness.testable.controllerTakeoverFrozen).toBe(true);
    expect(harness.controller.initializeCommittedGeneration).not.toHaveBeenCalled();
    expect(harness.controller.commitCompatibleGenerationSnapshot).not.toHaveBeenCalled();
    expect(harness.controller.commitMigration).not.toHaveBeenCalled();
    expect(harness.database.open).not.toHaveBeenCalled();
    expect(harness.database.unlockReleaseWrites).not.toHaveBeenCalled();
    expect(harness.database.withReleaseMigrationWriteAccess).not.toHaveBeenCalled();
    expect(harness.repository.markMutationStateVerified).not.toHaveBeenCalled();
    expect(harness.repository.readFullDataSnapshotWithMutationState).not.toHaveBeenCalled();
  }

  it("re-reads a normally committed shadow receipt while keeping the old page frozen", async () => {
    const harness = await shadowNavigationHarness();
    const { coordinator, controller, testable, state } = harness;
    // This calls the real coordinator commit path against a clean Schema 16
    // target fixture; it does not claim to materialize a real shadow database.
    await expect(coordinator.commitForBoot()).resolves.toEqual({
      state,
      migrationReceiptDigest: state.receiptDigest
    });
    await coordinator.freezeForControllerTakeover();
    await expect(coordinator.verifyFirstControllerClaimNavigationState()).resolves.toBeUndefined();
    expect(controller.readCommittedGeneration).toHaveBeenCalledTimes(1);
    expect(controller.readCommittedGenerationFromOpenConnection).toHaveBeenCalledTimes(1);
    expect(testable.committedState).toBe(state);
    expectNoNavigationWrites(harness);
    await expect(coordinator.commitForBoot()).rejects.toMatchObject({ name: "ReleaseControllerTakeoverFrozenError" });
  });

  it.each(["uncommitted", "cached pointer only"] as const)(
    "rejects a shadow page without its own completed boot commit: %s", async (preparation) => {
      const harness = await shadowNavigationHarness();
      const { coordinator, controller, testable, state } = harness;
      if (preparation === "cached pointer only") testable.committedState = state;
      await coordinator.freezeForControllerTakeover();
      await expect(coordinator.verifyFirstControllerClaimNavigationState()).rejects.toThrow("尚未完成");
      expect(controller.readCommittedGeneration).not.toHaveBeenCalled();
      expect(controller.readCommittedGenerationFromOpenConnection).not.toHaveBeenCalled();
      expectNoNavigationWrites(harness);
    }
  );

  it.each(["protocolVersion", "receiptDigest"] as const)(
    "rejects shadow persisted receipt drift after the page completed its normal commit: %s", async (change) => {
      const harness = await shadowNavigationHarness();
      const { coordinator, controller, testable, state } = harness;
      await coordinator.commitForBoot();
      await coordinator.freezeForControllerTakeover();
      controller.readCommittedGenerationFromOpenConnection.mockResolvedValue({
        ...state,
        ...(change === "protocolVersion" ? { protocolVersion: 2 } : { receiptDigest: "a".repeat(64) })
      });
      await expect(coordinator.verifyFirstControllerClaimNavigationState()).rejects.toThrow("回执与本页不一致");
      expect(controller.readCommittedGeneration).toHaveBeenCalledTimes(1);
      expect(controller.readCommittedGenerationFromOpenConnection).toHaveBeenCalledTimes(1);
      expect(testable.committedState).toBe(state);
      expectNoNavigationWrites(harness);
    }
  );

  it("rejects another accepted shadow migration when it differs from this page's completed commit", async () => {
    const otherMigrationId = "other-accepted-shadow-migration";
    const descriptor: ReleaseDatabaseDescriptor = {
      ...PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR,
      acceptedCommittedMigrationIds: [PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR.migrationId, otherMigrationId]
    };
    const harness = await shadowNavigationHarness(descriptor);
    const { coordinator, controller, state } = harness;
    await coordinator.commitForBoot();
    await coordinator.freezeForControllerTakeover();
    controller.readCommittedGenerationFromOpenConnection.mockResolvedValue({ ...state, migrationId: otherMigrationId });
    await expect(coordinator.verifyFirstControllerClaimNavigationState()).rejects.toThrow("回执与本页不一致");
    expect(controller.readCommittedGeneration).toHaveBeenCalledTimes(1);
    expect(controller.readCommittedGenerationFromOpenConnection).toHaveBeenCalledTimes(1);
    expectNoNavigationWrites(harness);
  });

  it("rejects unaccepted shadow lineage even when cached and persisted pointers agree", async () => {
    const harness = await shadowNavigationHarness();
    const { coordinator, controller, state } = harness;
    await coordinator.commitForBoot();
    await coordinator.freezeForControllerTakeover();
    // A negative data-corruption fixture distinguishes accepted lineage from
    // mere equality with the cached object. No completion flag is fabricated.
    state.migrationId = "unaccepted-shadow-migration";
    await expect(coordinator.verifyFirstControllerClaimNavigationState()).rejects.toThrow("回执与本页不一致");
    expect(controller.readCommittedGeneration).toHaveBeenCalledTimes(1);
    expect(controller.readCommittedGenerationFromOpenConnection).toHaveBeenCalledTimes(1);
    expectNoNavigationWrites(harness);
  });

  it("requires a normally committed shadow page to freeze before its navigation read", async () => {
    const harness = await shadowNavigationHarness();
    const { coordinator, controller } = harness;
    await coordinator.commitForBoot();
    await expect(coordinator.verifyFirstControllerClaimNavigationState()).rejects.toThrow("尚未完成");
    expect(controller.readCommittedGeneration).toHaveBeenCalledTimes(1);
    expect(controller.readCommittedGenerationFromOpenConnection).not.toHaveBeenCalled();
    await coordinator.freezeForControllerTakeover();
    expectNoNavigationWrites(harness);
  });
});

describe("isPeerMigrationContention", () => {
  it("accepts a live lease held by the peer migration owner", () => {
    expect(isPeerMigrationContention(new DatabaseGenerationError(
      "LEASE_HELD",
      "migration lease is held by another owner"
    ))).toBe(true);
  });

  it("accepts a Service Worker freeze rejection for an active peer session", () => {
    expect(isPeerMigrationContention(new Error(
      "旧标签页没有全部冻结：MIGRATION_SESSION_ACTIVE"
    ))).toBe(true);
  });

  it("accepts a migration conflict that reports the peer migration as already pending", () => {
    expect(isPeerMigrationContention(new DatabaseGenerationError(
      "MIGRATION_CONFLICT",
      "migration v13-to-v16-mutation-state is already pending"
    ))).toBe(true);
  });

  it("rejects migration conflicts that are not peer-pending races", () => {
    expect(isPeerMigrationContention(new DatabaseGenerationError(
      "MIGRATION_CONFLICT",
      "target database is already bound to incompatible migration lineage"
    ))).toBe(false);
  });

  it("rejects unrelated failures", () => {
    expect(isPeerMigrationContention(new Error("影子数据库物化后摘要发生变化。"))).toBe(false);
    expect(isPeerMigrationContention(null)).toBe(false);
    expect(isPeerMigrationContention(undefined)).toBe(false);
  });
});

describe("ReleaseDatabaseCoordinator forward migration activation", () => {
  const source = BRIDGE_RELEASE_DATABASE_DESCRIPTOR;
  const target = PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR;
  const sourceBuild = "build-forward-source-v13";
  const targetBuild = "build-forward-target-v16";

  function forwardHarness(controller: unknown) {
    const harness = bootCommitHarness(source, sourceBuild, controller);
    const database = { lockReleaseWrites: vi.fn(), unlockReleaseWrites: vi.fn() };
    harness.testable.targetDatabase = database;
    return { ...harness, database };
  }

  it("freezes before a slow read-only audit settles while the original full drain still waits", async () => {
    const audit = deferred<{ payloadDigest: string; canonicalJsonByteLength: number }>();
    workerMocks.inspectSnapshot.mockReturnValueOnce(audit.promise);
    const controller = {
      readCommittedGeneration: vi.fn(),
      initializeCommittedGeneration: vi.fn(),
      commitCompatibleGenerationSnapshot: vi.fn()
    };
    const { coordinator, testable, database } = forwardHarness(controller);
    const commit = coordinator.commitForBoot();
    const rejectedCommit = expect(commit).rejects.toBeInstanceOf(ReleaseForwardMigrationActivationFrozenError);
    await waitForCall(() => workerMocks.inspectSnapshot.mock.calls.length, 1);

    const forwardFreeze = coordinator.freezeForForwardMigrationActivation(target);
    expect(coordinator.freezeForForwardMigrationActivation({ ...target })).toBe(forwardFreeze);
    await forwardFreeze;
    expect(database.lockReleaseWrites).toHaveBeenCalledTimes(1);
    expect(testable.controllerTakeoverFrozen).toBe(true);
    let fullDrainSettled = false;
    const fullDrain = coordinator.freezeForControllerTakeover().then(() => { fullDrainSettled = true; });
    await waitForMacrotask();
    expect(fullDrainSettled).toBe(false);
    await expect(coordinator.commitForBoot()).rejects.toBeInstanceOf(ReleaseForwardMigrationActivationFrozenError);

    audit.resolve({ payloadDigest: digest, canonicalJsonByteLength: 2048 });
    await rejectedCommit;
    await fullDrain;
    expect(controller.readCommittedGeneration).not.toHaveBeenCalled();
    expect(controller.initializeCommittedGeneration).not.toHaveBeenCalled();
    expect(controller.commitCompatibleGenerationSnapshot).not.toHaveBeenCalled();
    expect(testable.committedState).toBeNull();
    expect(database.unlockReleaseWrites).not.toHaveBeenCalled();
  });

  it.each(["initializeCommittedGeneration", "commitCompatibleGenerationSnapshot"] as const)(
    "drains the admitted %s write but rejects the late old-page boot completion",
    async (method) => {
      const write = deferred<DatabaseGenerationReleaseState>();
      const state = releaseState(source, sourceBuild);
      const controller = {
        readCommittedGeneration: vi.fn().mockResolvedValue(
          method === "initializeCommittedGeneration" ? null : releaseState(source, "previous-source-build")
        ),
        initializeCommittedGeneration: vi.fn(() => write.promise),
        commitCompatibleGenerationSnapshot: vi.fn(() => write.promise)
      };
      const { coordinator, testable, database } = forwardHarness(controller);
      const commit = coordinator.commitForBoot();
      const rejectedCommit = expect(commit).rejects.toBeInstanceOf(ReleaseForwardMigrationActivationFrozenError);
      await waitForCall(() => controller[method].mock.calls.length, 1);
      let settled = false;
      const freeze = coordinator.freezeForForwardMigrationActivation(target).then(() => { settled = true; });
      await waitForMacrotask();
      expect(settled).toBe(false);
      write.resolve(state);
      await rejectedCommit;
      await freeze;
      expect(settled).toBe(true);
      expect(controller[method]).toHaveBeenCalledTimes(1);
      expect(testable.committedState).toBeNull();
      expect(database.unlockReleaseWrites).not.toHaveBeenCalled();
    }
  );

  it("registers an actual control write before a synchronous forward-freeze re-entry", async () => {
    const write = deferred<DatabaseGenerationReleaseState>();
    let freeze: Promise<void> | null = null;
    let settled = false;
    let coordinator!: ReleaseDatabaseCoordinator;
    const controller = {
      readCommittedGeneration: vi.fn().mockResolvedValue(null),
      initializeCommittedGeneration: vi.fn(() => {
        freeze = coordinator.freezeForForwardMigrationActivation(target).then(() => { settled = true; });
        return write.promise;
      })
    };
    ({ coordinator } = forwardHarness(controller));
    const commit = coordinator.commitForBoot();
    const rejectedCommit = expect(commit).rejects.toBeInstanceOf(ReleaseForwardMigrationActivationFrozenError);
    await waitForCall(() => controller.initializeCommittedGeneration.mock.calls.length, 1);
    await waitForMacrotask();
    expect(settled).toBe(false);
    expect(freeze).not.toBeNull();
    write.resolve(releaseState(source, sourceBuild));
    await rejectedCommit;
    await freeze;
    expect(settled).toBe(true);
  });

  it("drains an admitted control read and prevents the following initialization", async () => {
    const read = deferred<DatabaseGenerationReleaseState | null>();
    const controller = {
      readCommittedGeneration: vi.fn(() => read.promise),
      initializeCommittedGeneration: vi.fn()
    };
    const { coordinator } = forwardHarness(controller);
    const commit = coordinator.commitForBoot();
    const rejectedCommit = expect(commit).rejects.toBeInstanceOf(ReleaseForwardMigrationActivationFrozenError);
    await waitForCall(() => controller.readCommittedGeneration.mock.calls.length, 1);
    let settled = false;
    const freeze = coordinator.freezeForForwardMigrationActivation(target).then(() => { settled = true; });
    await waitForMacrotask();
    expect(settled).toBe(false);
    await expect(coordinator.verifyForwardMigrationActivationNavigationState(target, targetBuild)).rejects.toThrow(
      "源写入冻结已经完成"
    );
    expect(controller.readCommittedGeneration).toHaveBeenCalledTimes(1);
    read.resolve(null);
    await rejectedCommit;
    await freeze;
    expect(controller.initializeCommittedGeneration).not.toHaveBeenCalled();
  });

  it("waits for admitted legacy opening and its failure cleanup before finishing the forward drain", async () => {
    const opening = deferred<void>();
    const failure = new Error("ordinary source open failure");
    const coordinator = new ReleaseDatabaseCoordinator(source, sourceBuild);
    const database = {
      name: source.databaseName,
      verno: source.targetSchema,
      open: vi.fn(() => opening.promise),
      close: vi.fn(),
      lockReleaseWrites: vi.fn(),
      unlockReleaseWrites: vi.fn()
    };
    const testable = testableCoordinator(coordinator, null, null);
    testable.storageModule = { caseRepository: { database } };
    const prepare = coordinator.prepareStorage();
    const rejectedPrepare = expect(prepare).rejects.toBe(failure);
    await waitForCall(() => database.open.mock.calls.length, 1);
    let settled = false;
    const freeze = coordinator.freezeForForwardMigrationActivation(target).then(() => { settled = true; });
    await waitForMacrotask();
    expect(settled).toBe(false);
    opening.reject(failure);
    await rejectedPrepare;
    await freeze;
    expect(database.close).toHaveBeenCalledWith({ disableAutoOpen: true });
    expect(database.lockReleaseWrites).toHaveBeenCalledTimes(1);
    expect(database.unlockReleaseWrites).not.toHaveBeenCalled();
  });

  it("rejects other source lineages and target ranges without closing an eligible source", async () => {
    const { coordinator, testable, database } = forwardHarness({});
    await expect(coordinator.freezeForForwardMigrationActivation({ ...target, sourceSchema: 14 })).rejects.toThrow();
    await expect(coordinator.freezeForForwardMigrationActivation({ ...target, minReadableSchema: 13 })).rejects.toThrow();
    await expect(coordinator.freezeForForwardMigrationActivation({ ...target, databaseName: source.databaseName })).rejects.toThrow();
    await expect(coordinator.freezeForForwardMigrationActivation({ ...target, acceptedCommittedMigrationIds: [] })).rejects.toThrow();
    expect(testable.controllerTakeoverFrozen).toBe(false);
    expect(database.lockReleaseWrites).not.toHaveBeenCalled();
    const shadow = new ReleaseDatabaseCoordinator(target, targetBuild);
    await expect(shadow.freezeForForwardMigrationActivation(target)).rejects.toThrow();
    await coordinator.freezeForForwardMigrationActivation(target);
    await expect(coordinator.freezeForForwardMigrationActivation({ ...target, migrationId: "another-migration", acceptedCommittedMigrationIds: ["another-migration"] })).rejects.toThrow(
      "已冻结的迁移描述符不一致"
    );
  });

  it.each(["source", "target"] as const)(
    "verifies the persisted %s receipt for navigation without requiring a cached boot commit",
    async (generation) => {
      const state = generation === "source" ? releaseState(source, sourceBuild) : releaseState(target, targetBuild);
      const controller = {
        readCommittedGeneration: vi.fn().mockResolvedValue(state),
        initializeCommittedGeneration: vi.fn(),
        commitCompatibleGenerationSnapshot: vi.fn(),
        commitMigration: vi.fn()
      };
      const { coordinator, testable, repository, database } = forwardHarness(controller);
      await expect(coordinator.verifyForwardMigrationActivationNavigationState(target, targetBuild)).rejects.toThrow();
      expect(controller.readCommittedGeneration).not.toHaveBeenCalled();
      await coordinator.freezeForForwardMigrationActivation(target);
      await expect(coordinator.verifyForwardMigrationActivationNavigationState(target, targetBuild)).resolves.toBeUndefined();
      expect(testable.committedState).toBeNull();
      expect(controller.readCommittedGeneration).toHaveBeenCalledTimes(1);
      expect(controller.initializeCommittedGeneration).not.toHaveBeenCalled();
      expect(controller.commitCompatibleGenerationSnapshot).not.toHaveBeenCalled();
      expect(controller.commitMigration).not.toHaveBeenCalled();
      expect(repository.readFullDataSnapshot).not.toHaveBeenCalled();
      expect(database.unlockReleaseWrites).not.toHaveBeenCalled();
    }
  );

  it.each(["missing", "source-build", "target-build", "target-migration", "protocol"] as const)(
    "rejects a %s persisted receipt mismatch during forward navigation",
    async (mismatch) => {
      const state = mismatch === "missing" ? null
        : mismatch === "source-build" ? releaseState(source, "another-source-build")
        : { ...releaseState(target, targetBuild),
            ...(mismatch === "target-build" ? { committedBuild: "another-target-build" } : {}),
            ...(mismatch === "target-migration" ? { migrationId: "another-migration" } : {}),
            ...(mismatch === "protocol" ? { protocolVersion: 2 } : {}) };
      const controller = { readCommittedGeneration: vi.fn().mockResolvedValue(state) };
      const { coordinator, database } = forwardHarness(controller);
      await coordinator.freezeForForwardMigrationActivation(target);
      await expect(coordinator.verifyForwardMigrationActivationNavigationState(target, targetBuild)).rejects.toThrow(
        "既不是原来源，也不是精确目标提交"
      );
      expect(database.unlockReleaseWrites).not.toHaveBeenCalled();
    }
  );

  it("retains formal receipt-integrity rejection and blocks a late old-page acknowledgement", async () => {
    const failure = new Error("ordinary persisted receipt digest mismatch");
    const controller = { readCommittedGeneration: vi.fn().mockRejectedValue(failure) };
    const { coordinator, database } = forwardHarness(controller);
    const acknowledgement = coordinator.acknowledgeServiceWorkerCommit();
    const rejectedAcknowledgement = expect(acknowledgement).rejects.toBeInstanceOf(ReleaseForwardMigrationActivationFrozenError);
    await coordinator.freezeForForwardMigrationActivation(target);
    await rejectedAcknowledgement;
    await expect(coordinator.verifyForwardMigrationActivationNavigationState(target, targetBuild)).rejects.toBe(failure);
    expect(database.unlockReleaseWrites).not.toHaveBeenCalled();
  });
});
