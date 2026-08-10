import { describe, expect, it, vi } from "vitest";
import type {
  FullBackupPayload
} from "@hakimi/contracts";
import type { ResearchDatabaseMutationState } from "@hakimi/storage";
import {
  PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR,
  type ReleaseDatabaseDescriptor
} from "../../release-protocol";
import {
  CURRENT_RELEASE_INTEGRITY_CONTRACT_IDENTITY,
  ReleaseIntegrityCacheError,
  createReleaseIntegrityContractVersion,
  hasCleanReleaseIntegrityEvidence,
  verifyReleaseIntegrity
} from "./release-integrity-cache";

const descriptor: ReleaseDatabaseDescriptor = {
  ...PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR,
  acceptedCommittedMigrationIds: [
    ...PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR.acceptedCommittedMigrationIds
  ]
};
const contractVersion = "hakimi.release-integrity-cache.v1.sha256." + "a".repeat(64);
const payload = {} as FullBackupPayload;

function mutationState(
  patch: Partial<ResearchDatabaseMutationState> = {}
): ResearchDatabaseMutationState {
  return {
    id: "current",
    protocolVersion: 1,
    epoch: 7,
    verifiedEpoch: 7,
    verifiedPayloadDigest: "b".repeat(64),
    verifiedContractVersion: contractVersion,
    verifiedAt: "2026-08-04T00:00:00.000Z",
    ...patch
  };
}

function fullAuditRuntime(options: {
  state?: ResearchDatabaseMutationState | null;
  snapshotState?: ResearchDatabaseMutationState | null;
  snapshotEpoch?: number;
  markedState?: ResearchDatabaseMutationState | null;
} = {}) {
  const snapshotEpoch = options.snapshotEpoch ?? 7;
  const snapshotState = options.snapshotState === undefined
    ? mutationState({
      epoch: snapshotEpoch,
      verifiedEpoch: null,
      verifiedPayloadDigest: null,
      verifiedContractVersion: null,
      verifiedAt: null
    })
    : options.snapshotState;
  const markedState = options.markedState === undefined
    ? mutationState({ epoch: snapshotEpoch, verifiedEpoch: snapshotEpoch })
    : options.markedState;
  const repository = {
    readMutationState: vi.fn().mockResolvedValue(options.state ?? null),
    readFullDataSnapshotWithMutationState: vi.fn().mockResolvedValue({
      payload,
      epoch: snapshotEpoch,
      mutationState: snapshotState
    }),
    markMutationStateVerified: vi.fn().mockResolvedValue(markedState)
  };
  const database = {
    withReleaseMigrationWriteAccess: vi.fn(async (operation: () => Promise<unknown>) => operation())
  };
  const inspectSnapshot = vi.fn().mockResolvedValue({
    payloadDigest: "b".repeat(64),
    canonicalJsonByteLength: 4096
  });
  return { repository, database, inspectSnapshot };
}

describe("release integrity contract", () => {
  it("is canonical across descriptor property order", async () => {
    const reordered = {
      sourceSchema: descriptor.sourceSchema,
      sourceDatabaseName: descriptor.sourceDatabaseName,
      sourceGeneration: descriptor.sourceGeneration,
      acceptedCommittedMigrationIds: descriptor.acceptedCommittedMigrationIds,
      migrationId: descriptor.migrationId,
      maxReadableSchema: descriptor.maxReadableSchema,
      minReadableSchema: descriptor.minReadableSchema,
      targetSchema: descriptor.targetSchema,
      databaseName: descriptor.databaseName,
      dbGeneration: descriptor.dbGeneration,
      protocolVersion: descriptor.protocolVersion
    } satisfies ReleaseDatabaseDescriptor;

    await expect(createReleaseIntegrityContractVersion(reordered, "build-1"))
      .resolves.toBe(await createReleaseIntegrityContractVersion(descriptor, "build-1"));
  });

  it("changes when any release descriptor field changes", async () => {
    const baseline = await createReleaseIntegrityContractVersion(descriptor, "build-1");
    const variants = [
      { ...descriptor, protocolVersion: 2 },
      { ...descriptor, dbGeneration: `${descriptor.dbGeneration}-other` },
      { ...descriptor, databaseName: `${descriptor.databaseName}-other` },
      { ...descriptor, targetSchema: descriptor.targetSchema + 1 },
      { ...descriptor, minReadableSchema: descriptor.minReadableSchema - 1 },
      { ...descriptor, maxReadableSchema: descriptor.maxReadableSchema + 1 },
      { ...descriptor, migrationId: `${descriptor.migrationId}-other` },
      { ...descriptor, acceptedCommittedMigrationIds: [...descriptor.acceptedCommittedMigrationIds, null] },
      { ...descriptor, sourceGeneration: `${descriptor.sourceGeneration}-other` },
      { ...descriptor, sourceDatabaseName: `${descriptor.sourceDatabaseName}-other` },
      { ...descriptor, sourceSchema: Number(descriptor.sourceSchema) + 1 }
    ] as unknown as ReleaseDatabaseDescriptor[];

    for (const variant of variants) {
      await expect(createReleaseIntegrityContractVersion(variant, "build-1"))
        .resolves.not.toBe(baseline);
    }
  });

  it("binds build, app, backup format, and validator identity", async () => {
    const baseline = await createReleaseIntegrityContractVersion(descriptor, "build-1");
    await expect(createReleaseIntegrityContractVersion(descriptor, "build-2"))
      .resolves.not.toBe(baseline);

    const identityVariants = [
      { ...CURRENT_RELEASE_INTEGRITY_CONTRACT_IDENTITY, appVersion: "other-app" },
      { ...CURRENT_RELEASE_INTEGRITY_CONTRACT_IDENTITY, fullBackupFormatVersion: "other-format" },
      { ...CURRENT_RELEASE_INTEGRITY_CONTRACT_IDENTITY, validatorIdentity: "other-validator" },
      { ...CURRENT_RELEASE_INTEGRITY_CONTRACT_IDENTITY, workerProtocol: "other-worker" },
      {
        ...CURRENT_RELEASE_INTEGRITY_CONTRACT_IDENTITY,
        workerProtocolVersion: CURRENT_RELEASE_INTEGRITY_CONTRACT_IDENTITY.workerProtocolVersion + 1
      }
    ];
    for (const identity of identityVariants) {
      await expect(createReleaseIntegrityContractVersion(descriptor, "build-1", identity))
        .resolves.not.toBe(baseline);
    }
  });
});

describe("release integrity evidence", () => {
  it("requires a complete clean marker for the exact contract", () => {
    expect(hasCleanReleaseIntegrityEvidence(null, contractVersion)).toBe(false);
    expect(hasCleanReleaseIntegrityEvidence(mutationState({ verifiedEpoch: 6 }), contractVersion))
      .toBe(false);
    expect(hasCleanReleaseIntegrityEvidence(
      mutationState({ verifiedPayloadDigest: null }),
      contractVersion
    )).toBe(false);
    expect(hasCleanReleaseIntegrityEvidence(
      mutationState({ verifiedPayloadDigest: "B".repeat(64) }),
      contractVersion
    )).toBe(false);
    expect(hasCleanReleaseIntegrityEvidence(mutationState(), `${contractVersion}-other`))
      .toBe(false);
    expect(hasCleanReleaseIntegrityEvidence(mutationState(), contractVersion)).toBe(true);
  });

  it("uses clean evidence without reading or validating the full payload", async () => {
    const runtime = fullAuditRuntime({ state: mutationState() });

    await expect(verifyReleaseIntegrity({
      ...runtime,
      contractVersion
    } as never)).resolves.toEqual({
      mode: "cache_hit",
      epoch: 7,
      digest: "b".repeat(64),
      logicalPayloadBytes: null
    });
    expect(runtime.repository.readFullDataSnapshotWithMutationState).not.toHaveBeenCalled();
    expect(runtime.inspectSnapshot).not.toHaveBeenCalled();
    expect(runtime.database.withReleaseMigrationWriteAccess).not.toHaveBeenCalled();
  });

  it("audits one atomic payload and persists its exact epoch with CAS", async () => {
    const runtime = fullAuditRuntime();

    await expect(verifyReleaseIntegrity({
      ...runtime,
      contractVersion,
      now: () => "2026-08-04T00:00:00.000Z"
    } as never)).resolves.toEqual({
      mode: "full_audit",
      epoch: 7,
      digest: "b".repeat(64),
      logicalPayloadBytes: 4096
    });
    expect(runtime.inspectSnapshot).toHaveBeenCalledWith(payload);
    expect(runtime.database.withReleaseMigrationWriteAccess).toHaveBeenCalledTimes(1);
    expect(runtime.repository.markMutationStateVerified).toHaveBeenCalledWith({
      expectedEpoch: 7,
      payloadDigest: "b".repeat(64),
      contractVersion,
      verifiedAt: "2026-08-04T00:00:00.000Z"
    });
  });

  it("fails closed when the epoch CAS loses a concurrent-write race", async () => {
    const runtime = fullAuditRuntime({ markedState: null });

    await expect(verifyReleaseIntegrity({
      ...runtime,
      contractVersion
    } as never)).rejects.toMatchObject({
      name: ReleaseIntegrityCacheError.name,
      code: "CAS_CONFLICT"
    });
  });

  it("propagates strict storage-state corruption before any snapshot audit", async () => {
    const runtime = fullAuditRuntime();
    const corruption = new Error("STATE_CORRUPT");
    runtime.repository.readMutationState.mockRejectedValue(corruption);

    await expect(verifyReleaseIntegrity({
      ...runtime,
      contractVersion
    } as never)).rejects.toBe(corruption);
    expect(runtime.repository.readFullDataSnapshotWithMutationState).not.toHaveBeenCalled();
    expect(runtime.inspectSnapshot).not.toHaveBeenCalled();
  });

  it("rejects an inconsistent atomic snapshot epoch before validation", async () => {
    const runtime = fullAuditRuntime({
      snapshotEpoch: 8,
      snapshotState: mutationState({ epoch: 7, verifiedEpoch: 6 })
    });

    await expect(verifyReleaseIntegrity({
      ...runtime,
      contractVersion
    } as never)).rejects.toMatchObject({ code: "INVALID_SNAPSHOT_EPOCH" });
    expect(runtime.inspectSnapshot).not.toHaveBeenCalled();
  });
});
