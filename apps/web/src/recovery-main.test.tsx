import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BRIDGE_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR,
  type ReleaseDatabaseDescriptor
} from "../release-protocol";
import type { PrebootRecoveryState } from "./lib/preboot-database-inventory";
import {
  assertRecoveryInputs,
  mountPrebootRecovery,
  type RecoveryDisposition
} from "./recovery-main";

const { createRootMock, renderMock } = vi.hoisted(() => {
  const render = vi.fn();
  return {
    renderMock: render,
    createRootMock: vi.fn(() => ({ render }))
  };
});

vi.mock("react-dom/client", () => ({
  createRoot: createRootMock
}));

type OrphanedDisposition = Extract<PrebootRecoveryState, { kind: "orphaned_v13" }>;

const SOURCE_DATABASE_NAME = BRIDGE_RELEASE_DATABASE_DESCRIPTOR.databaseName;
const SOURCE_NATIVE_VERSION = 130 as const;

const ambiguousDisposition: RecoveryDisposition = {
  kind: "ambiguous",
  reasonCode: "SERVICE_WORKER_PRESENT",
  inventory: [{ name: SOURCE_DATABASE_NAME, version: SOURCE_NATIVE_VERSION }]
};

const orphanedDisposition: OrphanedDisposition = {
  kind: "orphaned_v13",
  reasonCode: "ORPHANED_V13_VERIFIED",
  inventory: [{ name: SOURCE_DATABASE_NAME, version: SOURCE_NATIVE_VERSION }],
  sourceDatabaseName: SOURCE_DATABASE_NAME,
  sourceNativeVersion: SOURCE_NATIVE_VERSION
};

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

function clearDocument(): void {
  document.head.replaceChildren();
  document.body.replaceChildren();
  for (const key of Object.keys(document.documentElement.dataset)) {
    delete document.documentElement.dataset[key];
  }
}

beforeEach(() => {
  clearDocument();
  createRootMock.mockClear();
  renderMock.mockClear();
});

describe("preboot orphaned-v13 recovery input contract", () => {
  it.each([
    ["v13 -> v15", PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR],
    ["v13 -> v16", PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR]
  ])("accepts the exact supported %s shadow shell", (_label, descriptor) => {
    const parsedEquivalentDescriptor = descriptorCopy(descriptor);

    expect(() => assertRecoveryInputs(orphanedDisposition, parsedEquivalentDescriptor)).not.toThrow();
    expect(() => mountPrebootRecovery(orphanedDisposition, parsedEquivalentDescriptor)).not.toThrow();

    expect(createRootMock).toHaveBeenCalledTimes(1);
    expect(renderMock).toHaveBeenCalledTimes(1);
    expect(document.getElementById("root")?.dataset.recoveryKind).toBe("orphaned_v13");

    const dataset = document.documentElement.dataset;
    expect({
      releaseContract: dataset.releaseContract,
      targetSchema: dataset.targetSchema,
      migrationId: dataset.migrationId,
      sourceReleaseContract: dataset.recoverySourceReleaseContract,
      sourceDatabaseName: dataset.recoverySourceDatabaseName,
      sourceTargetSchema: dataset.recoverySourceTargetSchema,
      sourceMigrationId: dataset.recoverySourceMigrationId,
      dispositionSourceDatabaseName: dataset.recoveryDispositionSourceDatabaseName,
      dispositionSourceNativeVersion: dataset.recoveryDispositionSourceNativeVersion
    }).toEqual({
      releaseContract: "legacy-v13",
      targetSchema: "13",
      migrationId: "null",
      sourceReleaseContract: "legacy-v13",
      sourceDatabaseName: SOURCE_DATABASE_NAME,
      sourceTargetSchema: "13",
      sourceMigrationId: "null",
      dispositionSourceDatabaseName: SOURCE_DATABASE_NAME,
      dispositionSourceNativeVersion: "130"
    });
    expect({
      releaseContract: dataset.recoveryShellReleaseContract,
      databaseName: dataset.recoveryShellDatabaseName,
      targetSchema: dataset.recoveryShellTargetSchema,
      migrationId: dataset.recoveryShellMigrationId,
      sourceGeneration: dataset.recoveryShellSourceGeneration,
      sourceDatabaseName: dataset.recoveryShellSourceDatabaseName,
      sourceSchema: dataset.recoveryShellSourceSchema
    }).toEqual({
      releaseContract: descriptor.dbGeneration,
      databaseName: descriptor.databaseName,
      targetSchema: String(descriptor.targetSchema),
      migrationId: descriptor.migrationId,
      sourceGeneration: descriptor.sourceGeneration,
      sourceDatabaseName: descriptor.sourceDatabaseName,
      sourceSchema: String(descriptor.sourceSchema)
    });
    expect(dataset.mutationEpochBypassed).toBe("false");
    expect(dataset.publicReleaseAuthorized).toBe("false");
    expect(dataset.expertTruthClaimed).toBe("false");
  });

  it.each([
    ["bridge descriptor", BRIDGE_RELEASE_DATABASE_DESCRIPTOR],
    ["shadow descriptor rebound to null migration", descriptorCopy(
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
      { migrationId: null, acceptedCommittedMigrationIds: [null] }
    )]
  ])("rejects the %s before creating or mutating a recovery root", (_label, descriptor) => {
    expect(() => mountPrebootRecovery(orphanedDisposition, descriptor)).toThrow(/只读救援壳描述符/);
    expect(document.getElementById("root")).toBeNull();
    expect(createRootMock).not.toHaveBeenCalled();
    expect(document.documentElement.dataset.releaseContract).toBeUndefined();
  });

  it.each([
    ["wrong source database", descriptorCopy(
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
      { sourceDatabaseName: "hakimi-bazi-research.rebound" }
    )],
    ["adjacent v14 -> v15 descriptor", PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR],
    ["mixed v15/v16 target rebound", descriptorCopy(
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
      {
        dbGeneration: PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR.dbGeneration,
        databaseName: PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR.databaseName
      }
    )]
  ])("rejects a %s descriptor", (_label, descriptor) => {
    expect(() => assertRecoveryInputs(orphanedDisposition, descriptor)).toThrow(/只读救援壳描述符/);
  });

  it("keeps ambiguous and orphaned dispositions structurally distinct", () => {
    expect(() => assertRecoveryInputs(
      ambiguousDisposition,
      descriptorCopy(PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR)
    )).not.toThrow();
    expect(() => assertRecoveryInputs(
      orphanedDisposition,
      descriptorCopy(PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR)
    )).not.toThrow();

    const ambiguousWithBoundSource = {
      ...ambiguousDisposition,
      sourceDatabaseName: SOURCE_DATABASE_NAME,
      sourceNativeVersion: SOURCE_NATIVE_VERSION
    } as unknown as RecoveryDisposition;
    expect(() => assertRecoveryInputs(
      ambiguousWithBoundSource,
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR
    )).toThrow(/不得伪装/);

    for (const invalidDisposition of [
      { ...orphanedDisposition, sourceDatabaseName: "hakimi-bazi-research.rebound" },
      { ...orphanedDisposition, sourceNativeVersion: 131 },
      { ...orphanedDisposition, inventory: [{ name: SOURCE_DATABASE_NAME, version: 131 }] },
      {
        ...orphanedDisposition,
        inventory: [
          ...orphanedDisposition.inventory,
          { name: "hakimi-bazi-research.generation.unexpected", version: 150 }
        ]
      }
    ]) {
      expect(() => assertRecoveryInputs(
        invalidDisposition as unknown as RecoveryDisposition,
        PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR
      )).toThrow(/唯一绑定/);
    }
  });

  it("does not publish an observed source binding for an ambiguous disposition", () => {
    mountPrebootRecovery(
      ambiguousDisposition,
      descriptorCopy(PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR)
    );
    const dataset = document.documentElement.dataset;
    expect(dataset.releaseContract).toBe("legacy-v13");
    expect(dataset.recoveryShellReleaseContract).toBe(
      PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR.dbGeneration
    );
    expect(dataset.recoveryDispositionSourceDatabaseName).toBeUndefined();
    expect(dataset.recoveryDispositionSourceNativeVersion).toBeUndefined();
    expect(document.getElementById("root")?.dataset.recoveryKind).toBe("ambiguous");
  });
});
