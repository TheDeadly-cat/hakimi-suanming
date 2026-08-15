import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FullBackupPayload } from "@hakimi/contracts";
import { DatabaseGenerationError, type ResearchDatabaseMutationState } from "@hakimi/storage";
import {
  PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR
} from "../../release-protocol";
import {
  ReleaseIntegrityCacheError,
  createReleaseIntegrityContractVersion
} from "./release-integrity-cache";
import {
  ReleaseDatabaseCoordinator,
  isPeerMigrationContention
} from "./release-database-coordinator";

const workerMocks = vi.hoisted(() => ({
  inspectSnapshot: vi.fn()
}));

vi.mock("./full-backup-worker-client", () => ({
  inspectFullBackupSnapshotOffMainThread: workerMocks.inspectSnapshot
}));

type TestableCoordinator = {
  targetDatabase: unknown;
  targetRepository: unknown;
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

beforeEach(() => {
  workerMocks.inspectSnapshot.mockReset().mockResolvedValue({
    payloadDigest: digest,
    canonicalJsonByteLength: 2048
  });
  delete document.documentElement.dataset.dbIntegrityVerification;
});

afterEach(() => {
  delete document.documentElement.dataset.dbIntegrityVerification;
});

describe("ReleaseDatabaseCoordinator target integrity path", () => {
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
