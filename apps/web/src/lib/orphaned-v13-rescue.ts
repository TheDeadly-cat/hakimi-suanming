import type { FullBackupPayload } from "@hakimi/contracts";
import type { ReleaseDatabaseDescriptor } from "../../release-protocol";
import { APP_VERSION } from "./app-version";
import {
  inspectPrebootRecoveryState,
  openVerifiedExistingV13Database,
  type PrebootRecoveryState,
  type VerifiedV13NativeDatabase
} from "./preboot-database-inventory";

export type OrphanedV13Disposition = Extract<PrebootRecoveryState, { kind: "orphaned_v13" }>;

export type PreparedOrphanedV13Artifact = {
  blob: Blob;
  payloadDigest: string;
  outputByteLength: number;
  canonicalJsonByteLength: number;
  capturedAt: string;
  filename: string;
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

function assertSameOrphanedSource(
  state: PrebootRecoveryState,
  expected: OrphanedV13Disposition
): asserts state is OrphanedV13Disposition {
  if (
    state.kind !== "orphaned_v13" ||
    state.sourceDatabaseName !== expected.sourceDatabaseName ||
    state.sourceNativeVersion !== expected.sourceNativeVersion
  ) {
    throw new Error("只读救援开始后本地数据库状态发生变化；本次没有生成或下载备份。");
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
  const inspect = runtime.inspect ?? inspectPrebootRecoveryState;
  const before = await inspect(descriptor);
  assertSameOrphanedSource(before, disposition);

  const sourceHandle = await (
    runtime.openVerifiedSource?.(disposition.sourceDatabaseName) ??
    openVerifiedExistingV13Database(disposition.sourceDatabaseName)
  );
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
    database?.close({ disableAutoOpen: true });
    if (nativeGuardOpen) sourceHandle.database.close();
  }

  const capturedAt = (runtime.now?.() ?? new Date()).toISOString();
  const createArtifact = runtime.createArtifact ?? defaultCreateArtifact;
  const artifact = await createArtifact(snapshot, {
    appVersion: APP_VERSION,
    exportedAt: capturedAt
  }, "zip");
  if (artifact.output !== "zip" || artifact.blob.size !== artifact.outputByteLength) {
    throw new Error("只读救援 Worker 没有返回完整的 ZIP 工件。");
  }

  const after = await inspect(descriptor);
  assertSameOrphanedSource(after, disposition);
  return {
    blob: artifact.blob,
    payloadDigest: artifact.payloadDigest,
    outputByteLength: artifact.outputByteLength,
    canonicalJsonByteLength: artifact.canonicalJsonByteLength,
    capturedAt,
    filename: `hakimi-v13-read-only-rescue-${capturedAt.slice(0, 10)}.zip`
  };
}
