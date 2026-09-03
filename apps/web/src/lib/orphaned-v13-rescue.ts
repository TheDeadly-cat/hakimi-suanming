import type { FullBackupPayload } from "@hakimi/contracts";
import {
  BRIDGE_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR,
  type ReleaseDatabaseDescriptor
} from "../../release-protocol";
import { APP_VERSION } from "./app-version";
import {
  inspectPrebootRecoveryState,
  LEGACY_V13_NATIVE_VERSION,
  openVerifiedExistingV13Database,
  type PrebootRecoveryState,
  type VerifiedV13NativeDatabase
} from "./preboot-database-inventory";

export type OrphanedV13Disposition = Extract<PrebootRecoveryState, { kind: "orphaned_v13" }>;

export type SupportedOrphanedV13RecoveryShellDescriptor = ReleaseDatabaseDescriptor & Readonly<{
  migrationId: string;
  sourceGeneration: string;
  sourceDatabaseName: string;
  sourceSchema: 13;
}>;

export type PreparedOrphanedV13Artifact = {
  blob: Blob;
  payloadDigest: string;
  outputByteLength: number;
  canonicalJsonByteLength: number;
  capturedAt: string;
  filename: string;
  sourceDatabaseName: string;
  sourceNativeVersion: number;
};

type LockedResearchDatabase = {
  name: string;
  verno: number;
  open: () => Promise<unknown>;
  close: (options?: { disableAutoOpen: boolean }) => void;
  areReleaseWritesLocked: () => boolean;
};

type RescueStorageRuntime = {
  createDatabase: (
    name: string,
    options: { targetSchema: number; releaseWritesLocked: boolean }
  ) => LockedResearchDatabase;
  createRepository: (database: LockedResearchDatabase) => {
    readFullDataSnapshot: () => Promise<FullBackupPayload>;
  };
};

type ArtifactResult = {
  output: "zip" | "json";
  blob: Blob;
  outputByteLength: number;
  canonicalJsonByteLength: number;
  payloadDigest: string;
};

const LOWERCASE_SHA256 = /^[a-f0-9]{64}$/u;
const CANONICAL_UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const SUPPORTED_ORPHANED_V13_RECOVERY_SHELLS = Object.freeze([
  PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR
] as const);

export type OrphanedV13RescueRuntime = {
  inspect?: typeof inspectPrebootRecoveryState;
  openVerifiedSource?: (
    sourceDatabaseName: string
  ) => Promise<VerifiedV13NativeDatabase>;
  loadStorageRuntime?: () => Promise<RescueStorageRuntime>;
  createArtifact?: (
    snapshot: FullBackupPayload,
    options: { appVersion: string; exportedAt: string },
    output: "zip"
  ) => Promise<ArtifactResult>;
  now?: () => Date;
};

export function orphanedV13ReadOnlyBackupFilename(capturedAt: string): string {
  const parsed = Date.parse(capturedAt);
  if (
    !CANONICAL_UTC_TIMESTAMP.test(capturedAt) ||
    !Number.isFinite(parsed) ||
    new Date(parsed).toISOString() !== capturedAt
  ) {
    throw new Error("只读救援文件名只能由规范 UTC 捕获时间生成。");
  }
  return `hakimi-v13-read-only-full-backup-${capturedAt.slice(0, 10)}.zip`;
}

function sameReleaseDatabaseDescriptor(
  value: ReleaseDatabaseDescriptor,
  expected: ReleaseDatabaseDescriptor
): boolean {
  const migrationIds: unknown = value.acceptedCommittedMigrationIds;
  if (
    !Array.isArray(migrationIds) ||
    Object.getPrototypeOf(migrationIds) !== Array.prototype ||
    migrationIds.length !== expected.acceptedCommittedMigrationIds.length
  ) {
    return false;
  }
  for (let index = 0; index < migrationIds.length; index += 1) {
    if (migrationIds[index] !== expected.acceptedCommittedMigrationIds[index]) return false;
  }
  return value.protocolVersion === expected.protocolVersion &&
    value.dbGeneration === expected.dbGeneration &&
    value.databaseName === expected.databaseName &&
    value.targetSchema === expected.targetSchema &&
    value.minReadableSchema === expected.minReadableSchema &&
    value.maxReadableSchema === expected.maxReadableSchema &&
    value.migrationId === expected.migrationId &&
    value.sourceGeneration === expected.sourceGeneration &&
    value.sourceDatabaseName === expected.sourceDatabaseName &&
    value.sourceSchema === expected.sourceSchema;
}

/**
 * The orphaned-v13 shell is an emergency read-only view of the frozen bridge
 * source. It is not a generic entry point for arbitrary release descriptors.
 */
export function assertSupportedOrphanedV13RecoveryShellDescriptor(
  descriptor: ReleaseDatabaseDescriptor
): asserts descriptor is SupportedOrphanedV13RecoveryShellDescriptor {
  if (
    descriptor.migrationId === null ||
    descriptor.sourceGeneration !== BRIDGE_RELEASE_DATABASE_DESCRIPTOR.dbGeneration ||
    descriptor.sourceDatabaseName !== BRIDGE_RELEASE_DATABASE_DESCRIPTOR.databaseName ||
    descriptor.sourceSchema !== BRIDGE_RELEASE_DATABASE_DESCRIPTOR.targetSchema ||
    !SUPPORTED_ORPHANED_V13_RECOVERY_SHELLS.some((supported) =>
      sameReleaseDatabaseDescriptor(descriptor, supported)
    )
  ) {
    throw new Error("只读救援壳描述符不是受支持且精确绑定 legacy-v13 源的影子发布。");
  }
}

export function assertOrphanedV13DispositionBinding(
  disposition: OrphanedV13Disposition,
  descriptor: SupportedOrphanedV13RecoveryShellDescriptor
): void {
  const onlyInventoryEntry = Array.isArray(disposition.inventory) && disposition.inventory.length === 1
    ? disposition.inventory[0]
    : undefined;
  if (
    disposition.kind !== "orphaned_v13" ||
    disposition.reasonCode !== "ORPHANED_V13_VERIFIED" ||
    disposition.sourceDatabaseName !== descriptor.sourceDatabaseName ||
    disposition.sourceNativeVersion !== LEGACY_V13_NATIVE_VERSION ||
    onlyInventoryEntry?.name !== descriptor.sourceDatabaseName ||
    onlyInventoryEntry.version !== LEGACY_V13_NATIVE_VERSION
  ) {
    throw new Error("孤立 v13 状态没有与发布描述符的源数据库和原生版本唯一绑定。");
  }
}

function assertSameOrphanedSource(
  state: PrebootRecoveryState,
  expected: OrphanedV13Disposition,
  descriptor: SupportedOrphanedV13RecoveryShellDescriptor
): asserts state is OrphanedV13Disposition {
  if (
    state.kind !== "orphaned_v13" ||
    state.sourceDatabaseName !== expected.sourceDatabaseName ||
    state.sourceNativeVersion !== expected.sourceNativeVersion
  ) {
    throw new Error("只读救援开始后本地数据库状态发生变化；本次没有生成或下载备份。");
  }
  assertOrphanedV13DispositionBinding(state, descriptor);
}

function assertRescueDescriptor(
  disposition: OrphanedV13Disposition,
  descriptor: ReleaseDatabaseDescriptor
): asserts descriptor is SupportedOrphanedV13RecoveryShellDescriptor {
  assertSupportedOrphanedV13RecoveryShellDescriptor(descriptor);
  assertOrphanedV13DispositionBinding(disposition, descriptor);
}

function assertVerifiedSourceHandle(
  value: unknown,
  disposition: OrphanedV13Disposition
): asserts value is VerifiedV13NativeDatabase {
  if (
    !value ||
    typeof value !== "object" ||
    (value as VerifiedV13NativeDatabase).sourceDatabaseName !== disposition.sourceDatabaseName ||
    (value as VerifiedV13NativeDatabase).sourceNativeVersion !== disposition.sourceNativeVersion ||
    !(value as VerifiedV13NativeDatabase).database ||
    typeof (value as VerifiedV13NativeDatabase).database.close !== "function"
  ) {
    throw new Error("只读救援打开的源句柄与已核验 v13 源不一致。");
  }
}

function assertPreparedArtifact(value: unknown): asserts value is ArtifactResult {
  if (
    !value ||
    typeof value !== "object" ||
    (value as ArtifactResult).output !== "zip" ||
    !((value as ArtifactResult).blob instanceof Blob) ||
    !Number.isSafeInteger((value as ArtifactResult).outputByteLength) ||
    (value as ArtifactResult).outputByteLength <= 0 ||
    (value as ArtifactResult).blob.size !== (value as ArtifactResult).outputByteLength ||
    !Number.isSafeInteger((value as ArtifactResult).canonicalJsonByteLength) ||
    (value as ArtifactResult).canonicalJsonByteLength < 0 ||
    typeof (value as ArtifactResult).payloadDigest !== "string" ||
    !LOWERCASE_SHA256.test((value as ArtifactResult).payloadDigest)
  ) {
    throw new Error("只读救援 Worker 没有返回完整且可核验的 ZIP 工件。");
  }
}

async function defaultStorageRuntime(): Promise<RescueStorageRuntime> {
  const storage = await import("@hakimi/storage");
  return {
    createDatabase: (name, options) => new storage.ResearchDatabase(name, options),
    createRepository: (database) => new storage.CaseRepository(
      database as InstanceType<typeof storage.ResearchDatabase>
    )
  };
}

async function defaultCreateArtifact(
  snapshot: FullBackupPayload,
  options: { appVersion: string; exportedAt: string },
  output: "zip"
): Promise<ArtifactResult> {
  const { createFullBackupArtifactOffMainThread } = await import("./full-backup-worker-client");
  return createFullBackupArtifactOffMainThread(snapshot, options, output);
}

/**
 * Captures one atomic, read-only v13 snapshot and asks the existing backup
 * Worker to validate and package that exact value. This function never imports
 * the generation controller and never grants migration write access.
 */
export async function captureOrphanedV13Backup(
  disposition: OrphanedV13Disposition,
  descriptor: ReleaseDatabaseDescriptor,
  runtime: OrphanedV13RescueRuntime = {}
): Promise<PreparedOrphanedV13Artifact> {
  assertRescueDescriptor(disposition, descriptor);
  const inspect = runtime.inspect ?? inspectPrebootRecoveryState;
  const before = await inspect(descriptor);
  assertSameOrphanedSource(before, disposition, descriptor);

  const sourceHandle: unknown = await (
    runtime.openVerifiedSource?.(disposition.sourceDatabaseName) ??
    openVerifiedExistingV13Database(disposition.sourceDatabaseName)
  );
  try {
    assertVerifiedSourceHandle(sourceHandle, disposition);
  } catch (reason) {
    try {
      (sourceHandle as VerifiedV13NativeDatabase | null)?.database?.close?.();
    } catch {
      // A malformed injected handle must not mask the identity failure.
    }
    throw reason;
  }
  let nativeGuardOpen = true;
  let database: LockedResearchDatabase | null = null;
  let snapshot: FullBackupPayload;
  try {
    globalThis.__HAKIMI_RESEARCH_DATABASE_RUNTIME__ = {
      databaseName: disposition.sourceDatabaseName,
      targetSchema: 13,
      releaseWritesLocked: true
    };
    const storage = await (runtime.loadStorageRuntime?.() ?? defaultStorageRuntime());
    database = storage.createDatabase(disposition.sourceDatabaseName, {
      targetSchema: 13,
      releaseWritesLocked: true
    });
    await database.open();
    if (
      database.name !== disposition.sourceDatabaseName ||
      database.verno !== 13 ||
      !database.areReleaseWritesLocked()
    ) {
      throw new Error("只读救援仓库没有保持在写锁定的 v13 源代。");
    }
    sourceHandle.database.close();
    nativeGuardOpen = false;
    snapshot = await storage.createRepository(database).readFullDataSnapshot();
  } finally {
    try {
      database?.close({ disableAutoOpen: true });
    } finally {
      if (nativeGuardOpen) sourceHandle.database.close();
    }
  }

  const capturedDate = runtime.now?.() ?? new Date();
  if (!(capturedDate instanceof Date) || !Number.isFinite(capturedDate.getTime())) {
    throw new Error("只读救援捕获时间无效；本次没有生成可交付备份。");
  }
  const capturedAt = capturedDate.toISOString();
  const createArtifact = runtime.createArtifact ?? defaultCreateArtifact;
  const artifact: unknown = await createArtifact(snapshot, {
    appVersion: APP_VERSION,
    exportedAt: capturedAt
  }, "zip");
  assertPreparedArtifact(artifact);

  const after = await inspect(descriptor);
  assertSameOrphanedSource(after, disposition, descriptor);
  return {
    blob: artifact.blob,
    payloadDigest: artifact.payloadDigest,
    outputByteLength: artifact.outputByteLength,
    canonicalJsonByteLength: artifact.canonicalJsonByteLength,
    capturedAt,
    filename: orphanedV13ReadOnlyBackupFilename(capturedAt),
    sourceDatabaseName: disposition.sourceDatabaseName,
    sourceNativeVersion: disposition.sourceNativeVersion
  };
}
