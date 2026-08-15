import Dexie from "dexie";
import type { FullBackupPayload } from "@hakimi/contracts";
import type {
  CaseRepository,
  DatabaseGenerationController,
  DatabaseGenerationMigrationJournal,
  DatabaseGenerationReleaseState,
  ResearchDatabase
} from "@hakimi/storage";
import type { ReleaseDatabaseDescriptor } from "../../release-protocol";
import { APP_VERSION } from "./app-version";
import {
  createReleaseIntegrityContractVersion,
  verifyReleaseIntegrity,
  type ReleaseIntegrityVerificationMode
} from "./release-integrity-cache";
import {
  assessStorageCapacity,
  isStorageQuotaExceededError,
  requireStorageAdmission,
  StorageAdmissionError
} from "./storage-capacity-gate";

type StorageModule = typeof import("@hakimi/storage");

type VerifiedSnapshot = {
  payload: FullBackupPayload;
  digest: string;
  logicalPayloadBytes: number;
};

export type ReleaseBootConfirmation = {
  state: DatabaseGenerationReleaseState;
  migrationReceiptDigest: string;
};

const DATABASE_OPEN_TIMEOUT_MS = 8_000;
const BRIDGE_DATABASE_OPEN_TIMEOUT_MS = 20_000;
const DATABASE_DELETE_TIMEOUT_MS = 5_000;
const SOURCE_FREEZE_RENEW_INTERVAL_MS = 8_000;
const SOURCE_FREEZE_MESSAGE_TIMEOUT_MS = 7_000;
const SOURCE_FREEZE_RETRY_BACKOFF_MS = 2_000;
const SOURCE_FREEZE_MAX_ATTEMPTS = 5;
const PEER_MIGRATION_POLL_INTERVAL_MS = 1_000;
const PEER_MIGRATION_WAIT_LIMIT_MS = 240_000;

/**
 * True when this page lost a startup race to another page that is already
 * preparing or committing the exact same shadow migration. The peer owns the
 * migration journal, so this page must wait instead of marking it failed.
 */
export function isPeerMigrationContention(cause: unknown): boolean {
  if (cause instanceof Error && "code" in cause) {
    const code = (cause as { code?: unknown }).code;
    if (code === "LEASE_HELD") return true;
    if (code === "MIGRATION_CONFLICT" && /already pending/iu.test(cause.message)) return true;
  }
  return cause instanceof Error && /MIGRATION_SESSION_ACTIVE/iu.test(cause.message);
}

function timeoutError(action: string, timeoutMs: number): Error {
  return new Error(`${action}在 ${timeoutMs} 毫秒内未完成；可能仍有旧标签页占用数据库。`);
}

async function withTimeout<T>(operation: PromiseLike<T>, timeoutMs: number, action: string): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(operation),
      new Promise<never>((_resolve, reject) => {
        timeoutHandle = setTimeout(() => reject(timeoutError(action, timeoutMs)), timeoutMs);
      })
    ]);
  } finally {
    if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
  }
}

async function openExpectedDatabase(
  database: ResearchDatabase,
  expectedName: string,
  expectedSchema: number,
  timeoutMs = DATABASE_OPEN_TIMEOUT_MS
): Promise<void> {
  const opening = database.open();
  // Promise.race may reject first. Always observe the underlying Dexie promise.
  void opening.catch(() => undefined);
  try {
    await withTimeout(opening, timeoutMs, `打开数据库 ${expectedName}@${expectedSchema}`);
  } catch (cause) {
    database.close({ disableAutoOpen: true });
    throw cause;
  }
  if (database.name !== expectedName || database.verno !== expectedSchema) {
    database.close({ disableAutoOpen: true });
    throw new Error(`数据库代际不匹配：期望 ${expectedName}@${expectedSchema}。`);
  }
}

async function deleteTargetDatabase(database: ResearchDatabase, databaseName: string): Promise<void> {
  database.close({ disableAutoOpen: true });
  const deletion = Dexie.delete(databaseName);
  void deletion.catch(() => undefined);
  await withTimeout(deletion, DATABASE_DELETE_TIMEOUT_MS, `隔离影子数据库 ${databaseName}`);
}

function samePhysicalGeneration(
  state: DatabaseGenerationReleaseState,
  descriptor: Pick<ReleaseDatabaseDescriptor, "dbGeneration" | "databaseName" | "targetSchema">
): boolean {
  return (
    state.committedGeneration === descriptor.dbGeneration &&
    state.committedDatabaseName === descriptor.databaseName &&
    state.committedSchema === descriptor.targetSchema
  );
}

function acceptsCommittedMigration(
  descriptor: ReleaseDatabaseDescriptor,
  migrationId: string | null
): boolean {
  return descriptor.acceptedCommittedMigrationIds.includes(migrationId);
}

function sameSourceGeneration(
  state: DatabaseGenerationReleaseState,
  descriptor: ReleaseDatabaseDescriptor
): boolean {
  return (
    descriptor.sourceGeneration !== null &&
    descriptor.sourceDatabaseName !== null &&
    descriptor.sourceSchema !== null &&
    state.committedGeneration === descriptor.sourceGeneration &&
    state.committedDatabaseName === descriptor.sourceDatabaseName &&
    state.committedSchema === descriptor.sourceSchema
  );
}

function targetsSamePhysicalDatabase(
  journal: DatabaseGenerationMigrationJournal,
  descriptor: Pick<ReleaseDatabaseDescriptor, "databaseName">
): boolean {
  return journal.target.databaseName === descriptor.databaseName;
}

function hasSameMigrationLineage(
  journal: DatabaseGenerationMigrationJournal,
  descriptor: ReleaseDatabaseDescriptor
): boolean {
  return (
    descriptor.sourceGeneration !== null &&
    descriptor.sourceDatabaseName !== null &&
    descriptor.sourceSchema !== null &&
    journal.source.generation === descriptor.sourceGeneration &&
    journal.source.databaseName === descriptor.sourceDatabaseName &&
    journal.source.schemaVersion === descriptor.sourceSchema &&
    journal.target.generation === descriptor.dbGeneration &&
    journal.target.databaseName === descriptor.databaseName &&
    journal.target.schemaVersion === descriptor.targetSchema
  );
}

export class ReleaseDatabaseCoordinator {
  private readonly ownerId: string;
  private readonly controllerPromise: Promise<DatabaseGenerationController>;
  private preparePromise: Promise<void> | null = null;
  private storageModule: StorageModule | null = null;
  private targetDatabase: ResearchDatabase | null = null;
  private targetRepository: CaseRepository | null = null;
  private sourceDatabase: ResearchDatabase | null = null;
  private sourceSnapshot: VerifiedSnapshot | null = null;
  private migrationJournal: DatabaseGenerationMigrationJournal | null = null;
  private committedState: DatabaseGenerationReleaseState | null = null;
  private sourceClientsFrozen = false;
  private sourceFreezeRequestId: string | null = null;
  private sourceFreezeHeartbeatTimer: number | null = null;
  private sourceFreezeHeartbeatPromise: Promise<void> | null = null;
  private sourceFreezeFailure: Error | null = null;
  private preparationCancelled: Error | null = null;
  private targetMaterializationStarted = false;
  private integrityContractPromise: Promise<string> | null = null;

  constructor(
    readonly descriptor: ReleaseDatabaseDescriptor,
    readonly buildId: string
  ) {
    if (!buildId) throw new Error("数据库代际协调器缺少构建号。");
    this.ownerId = `${descriptor.dbGeneration}:${buildId}:${crypto.randomUUID()}`;
    this.controllerPromise = import("@hakimi/storage").then(
      ({ DatabaseGenerationController }) => new DatabaseGenerationController()
    );
  }

  private async modules(): Promise<{ storage: StorageModule }> {
    const storage = await (
      this.storageModule ? Promise.resolve(this.storageModule) : import("@hakimi/storage")
    );
    this.storageModule = storage;
    return { storage };
  }

  private async verifiedSnapshot(repository: CaseRepository): Promise<VerifiedSnapshot> {
    const payload = await repository.readFullDataSnapshot();
    const { inspectFullBackupSnapshotOffMainThread } = await import("./full-backup-worker-client");
    const verified = await inspectFullBackupSnapshotOffMainThread(payload, {
      // The cache fingerprint is a release build identity, not SemVer. Backup
      // manifests deliberately require the user-visible application version.
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString()
    });
    return {
      payload,
      digest: verified.payloadDigest,
      logicalPayloadBytes: verified.canonicalJsonByteLength
    };
  }

  private integrityContractVersion(): Promise<string> {
    this.integrityContractPromise ??= createReleaseIntegrityContractVersion(
      this.descriptor,
      this.buildId
    );
    return this.integrityContractPromise;
  }

  private recordIntegrityVerificationMode(mode: ReleaseIntegrityVerificationMode): void {
    // Preserve whether this boot performed any full audit; later same-epoch
    // cache hits must not make the diagnostic look like a cache-only boot.
    if (document.documentElement.dataset.dbIntegrityVerification === "full_audit") return;
    document.documentElement.dataset.dbIntegrityVerification = mode;
  }

  private async verifiedTargetSnapshot(): Promise<Pick<VerifiedSnapshot, "digest">> {
    if (!this.targetRepository || !this.targetDatabase) {
      throw new Error("目标数据库完整性校验上下文不完整。");
    }
    // Schema 13-15 retain the original full-snapshot behavior byte for byte.
    if (this.descriptor.targetSchema < 16) {
      return this.verifiedSnapshot(this.targetRepository);
    }

    const contractVersion = await this.integrityContractVersion();
    const { inspectFullBackupSnapshotOffMainThread } = await import("./full-backup-worker-client");
    const evidence = await verifyReleaseIntegrity({
      repository: this.targetRepository,
      database: this.targetDatabase,
      contractVersion,
      inspectSnapshot: (payload) => inspectFullBackupSnapshotOffMainThread(payload, {
        appVersion: APP_VERSION,
        exportedAt: new Date().toISOString()
      })
    });
    this.recordIntegrityVerificationMode(evidence.mode);
    return { digest: evidence.digest };
  }

  private async requireShadowStorageAdmission(): Promise<void> {
    if (!this.sourceSnapshot) throw new Error("影子数据库容量准入缺少源快照。");
    const plan = await assessStorageCapacity({
      operation: "shadow_materialization",
      logicalPayloadBytes: this.sourceSnapshot.logicalPayloadBytes,
      payloadDigest: this.sourceSnapshot.digest
    });
    document.documentElement.dataset.dbStorageAdmission = plan.state;
    try {
      requireStorageAdmission(plan);
    } catch (cause) {
      if (!(cause instanceof StorageAdmissionError)) throw cause;
      const error = new Error(cause.message, { cause });
      error.name = cause.code;
      throw error;
    }
  }

  private async freezeSourceClients(): Promise<void> {
    if (this.descriptor.migrationId === null) return;
    const controller = navigator.serviceWorker?.controller;
    if (!controller) {
      const sourceDatabaseName = this.descriptor.sourceDatabaseName;
      const databases = typeof indexedDB.databases === "function"
        ? await indexedDB.databases()
        : null;
      if (
        sourceDatabaseName !== null &&
        databases !== null &&
        !databases.some((database) => database.name === sourceDatabaseName)
      ) {
        // A first-time install has no legacy data and no peer client to freeze.
        return;
      }
      throw new Error("跨 Schema 迁移必须由受控页面协调旧标签页写锁。");
    }
    const requestId = crypto.randomUUID();
    const response = await new Promise<{
      type?: unknown;
      accepted?: unknown;
      reason?: unknown;
      requestId?: unknown;
      migrationId?: unknown;
      targetGeneration?: unknown;
      targetDatabaseName?: unknown;
      targetSchema?: unknown;
      clientCount?: unknown;
      frozenClientCount?: unknown;
    }>((resolve, reject) => {
      const channel = new MessageChannel();
      const timeout = window.setTimeout(() => {
        channel.port1.close();
        reject(new Error("等待旧标签页冻结数据库写入超时。"));
      }, SOURCE_FREEZE_MESSAGE_TIMEOUT_MS);
      channel.port1.onmessage = (event) => {
        window.clearTimeout(timeout);
        channel.port1.close();
        resolve(event.data ?? {});
      };
      controller.postMessage({
        type: "PREPARE_DATABASE_MIGRATION",
        requestId,
        migrationId: this.descriptor.migrationId,
        sourceGeneration: this.descriptor.sourceGeneration,
        sourceDatabaseName: this.descriptor.sourceDatabaseName,
        sourceSchema: this.descriptor.sourceSchema
      }, [channel.port2]);
    });
    if (
      response.type !== "PREPARE_DATABASE_MIGRATION_ACK" ||
      response.accepted !== true ||
      response.requestId !== requestId ||
      response.migrationId !== this.descriptor.migrationId ||
      response.targetGeneration !== this.descriptor.dbGeneration ||
      response.targetDatabaseName !== this.descriptor.databaseName ||
      response.targetSchema !== this.descriptor.targetSchema
    ) {
      throw new Error(`旧标签页没有全部冻结：${String(response.reason ?? "INVALID_ACK")}`);
    }
    this.sourceFreezeRequestId = requestId;
    this.sourceClientsFrozen = true;
    this.sourceFreezeFailure = null;
    this.startSourceFreezeHeartbeat();
    document.documentElement.dataset.dbSourceClientsFrozen = "true";
  }

  private startSourceFreezeHeartbeat(): void {
    if (!this.sourceClientsFrozen || this.sourceFreezeHeartbeatTimer !== null) return;
    this.sourceFreezeHeartbeatTimer = window.setInterval(() => {
      void this.renewSourceClientFreeze().catch((cause: unknown) => {
        this.sourceFreezeFailure ??= cause instanceof Error
          ? cause
          : new Error("旧标签页写锁续租失败。");
        this.stopSourceFreezeHeartbeat();
      });
    }, SOURCE_FREEZE_RENEW_INTERVAL_MS);
  }

  private stopSourceFreezeHeartbeat(): void {
    if (this.sourceFreezeHeartbeatTimer !== null) {
      window.clearInterval(this.sourceFreezeHeartbeatTimer);
      this.sourceFreezeHeartbeatTimer = null;
    }
  }

  private renewSourceClientFreeze(): Promise<void> {
    if (!this.sourceClientsFrozen) return Promise.resolve();
    if (this.sourceFreezeFailure) return Promise.reject(this.sourceFreezeFailure);
    if (this.sourceFreezeHeartbeatPromise) return this.sourceFreezeHeartbeatPromise;
    const controller = navigator.serviceWorker?.controller;
    const requestId = this.sourceFreezeRequestId;
    const migrationId = this.descriptor.migrationId;
    if (!controller || !requestId || migrationId === null) {
      return Promise.reject(new Error("旧标签页写锁续租缺少受控 Service Worker 会话。"));
    }

    const renewal = new Promise<void>((resolve, reject) => {
      const channel = new MessageChannel();
      const timeout = window.setTimeout(() => {
        channel.port1.close();
        reject(new Error("旧标签页写锁续租超时。"));
      }, SOURCE_FREEZE_MESSAGE_TIMEOUT_MS);
      channel.port1.onmessage = (event: MessageEvent<{
        type?: unknown;
        accepted?: unknown;
        reason?: unknown;
        requestId?: unknown;
        migrationId?: unknown;
        targetGeneration?: unknown;
        targetDatabaseName?: unknown;
        targetSchema?: unknown;
      }>) => {
        window.clearTimeout(timeout);
        channel.port1.close();
        const response = event.data;
        if (
          response?.type !== "RENEW_DATABASE_MIGRATION_ACK" ||
          response.accepted !== true ||
          response.requestId !== requestId ||
          response.migrationId !== migrationId ||
          response.targetGeneration !== this.descriptor.dbGeneration ||
          response.targetDatabaseName !== this.descriptor.databaseName ||
          response.targetSchema !== this.descriptor.targetSchema
        ) {
          reject(new Error(`旧标签页写锁续租被拒绝：${String(response?.reason ?? "INVALID_ACK")}`));
          return;
        }
        resolve();
      };
      controller.postMessage({
        type: "RENEW_DATABASE_MIGRATION",
        requestId,
        migrationId
      }, [channel.port2]);
    });
    const trackedRenewal = renewal.finally(() => {
      if (this.sourceFreezeHeartbeatPromise === trackedRenewal) {
        this.sourceFreezeHeartbeatPromise = null;
      }
    });
    this.sourceFreezeHeartbeatPromise = trackedRenewal;
    return this.sourceFreezeHeartbeatPromise;
  }

  private assertSourceFreezeHealthy(): void {
    if (this.preparationCancelled) throw this.preparationCancelled;
    if (this.sourceFreezeFailure) throw this.sourceFreezeFailure;
  }

  cancelPreparation(cause: unknown): void {
    if (this.descriptor.migrationId === null || this.committedState) return;
    const cancellation = cause instanceof Error
      ? cause
      : new Error("跨 Schema 数据库准备已取消。");
    this.preparationCancelled ??= cancellation;
    this.stopSourceFreezeHeartbeat();
    // Source writes may resume because this page is now forbidden from
    // committing the target. Target cleanup waits for the in-flight Dexie
    // transaction to settle so it cannot race a delete against materialization.
    void this.notifySourceClients("ABORT_DATABASE_MIGRATION").catch(() => undefined);
    if (this.preparePromise) {
      void this.preparePromise
        .catch(() => undefined)
        .finally(() => this.failPreparedMigration(cancellation).catch(() => undefined));
    }
  }

  private async notifySourceClients(
    type: "ABORT_DATABASE_MIGRATION" | "FINISH_DATABASE_MIGRATION"
  ): Promise<void> {
    if (!this.sourceClientsFrozen || this.descriptor.migrationId === null) return;
    this.stopSourceFreezeHeartbeat();
    await this.sourceFreezeHeartbeatPromise?.catch(() => undefined);
    navigator.serviceWorker?.controller?.postMessage({
      type,
      requestId: this.sourceFreezeRequestId,
      migrationId: this.descriptor.migrationId
    });
    this.sourceClientsFrozen = false;
    this.sourceFreezeRequestId = null;
    this.sourceFreezeHeartbeatPromise = null;
    this.sourceFreezeFailure = null;
    document.documentElement.dataset.dbSourceClientsFrozen = "false";
  }

  prepareStorage(): Promise<void> {
    this.preparePromise ??= this.prepareStorageOnce();
    return this.preparePromise;
  }

  private async prepareStorageOnce(): Promise<void> {
    const { storage } = await this.modules();
    this.assertSourceFreezeHealthy();
    this.targetRepository = storage.caseRepository;
    this.targetDatabase = storage.caseRepository.database;

    if (this.descriptor.migrationId === null) {
      await openExpectedDatabase(
        this.targetDatabase,
        this.descriptor.databaseName,
        this.descriptor.targetSchema,
        BRIDGE_DATABASE_OPEN_TIMEOUT_MS
      );
      return;
    }

    const {
      migrationId,
      sourceGeneration,
      sourceDatabaseName,
      sourceSchema
    } = this.descriptor;
    if (sourceGeneration === null || sourceDatabaseName === null || sourceSchema === null) {
      throw new Error("影子数据库发布缺少完整源代际。");
    }

    const controller = await this.controllerPromise;
    // Two old v13 pages can converge to v16 at almost the same time. Only one
    // page may run the shadow migration; the other must wait for the peer to
    // commit or fail instead of dying on a page that can never bind. When the
    // peer commits, the next loop iteration takes the committed path below.
    while (true) {
      const existingState = await controller.readCommittedGeneration();
      if (existingState && samePhysicalGeneration(existingState, this.descriptor)) {
        await this.bindCommittedTarget(existingState, controller);
        return;
      }
      if (existingState && !sameSourceGeneration(existingState, this.descriptor)) {
        throw new Error("已提交数据库代际既不是当前影子目标，也不是其声明的源代际。");
      }
      try {
        await this.prepareSourceFreezeAndMigration(controller, existingState, {
          migrationId,
          sourceGeneration,
          sourceDatabaseName,
          sourceSchema
        });
        return;
      } catch (cause) {
        if (!isPeerMigrationContention(cause)) throw cause;
        await this.waitForPeerMigrationToSettle(controller, cause);
      }
    }
  }

  private async bindCommittedTarget(
    existingState: DatabaseGenerationReleaseState,
    controller: DatabaseGenerationController
  ): Promise<void> {
    if (!acceptsCommittedMigration(this.descriptor, existingState.migrationId)) {
      throw new Error("当前页面不接受已提交数据库的迁移谱系。请勿在同一 origin 混用发布候选。");
    }
    if (!this.targetDatabase) throw new Error("目标数据库上下文不完整。");
    await openExpectedDatabase(
      this.targetDatabase,
      this.descriptor.databaseName,
      this.descriptor.targetSchema
    );
    // A committed generation becomes writable after BOOT_OK_ACK, so its live
    // payload may diverge from the immutable release-time digest. Schema
    // 13-15 still perform the original full probe; Schema 16 accepts only an
    // exact clean epoch/contract marker or performs and CAS-commits a new one.
    await this.verifiedTargetSnapshot();
    this.committedState = existingState;
    this.migrationJournal = existingState.migrationId === null
      ? null
      : await controller.readMigration(existingState.migrationId);
    document.documentElement.dataset.dbMigrationPhase = "committed";
  }

  private async prepareSourceFreezeAndMigration(
    controller: DatabaseGenerationController,
    existingState: DatabaseGenerationReleaseState | null,
    descriptor: {
      migrationId: string;
      sourceGeneration: string;
      sourceDatabaseName: string;
      sourceSchema: number;
    }
  ): Promise<void> {
    const { storage } = await this.modules();
    const { migrationId, sourceGeneration, sourceDatabaseName, sourceSchema } = descriptor;
    // A previous attempt may have frozen the source before losing a lease race
    // to a peer. Keep that freeze alive and reuse it instead of issuing a
    // second PREPARE_DATABASE_MIGRATION that the Service Worker would reject.
    if (!this.sourceClientsFrozen) {
      await this.freezeSourceClientsWithRetry();
    }

    // A failed migration is terminal for its immutable migrationId, but a
    // blocked IndexedDB delete may have left its physical shadow database in
    // place. Clean every failed journal that targets this same database before
    // either rejecting the same release or admitting a newly identified
    // republish. This keeps a new migrationId from inheriting unverified rows.
    const priorMigrations = await controller.listMigrations();
    const conflictingTargetLineage = priorMigrations.find((journal) => (
      targetsSamePhysicalDatabase(journal, this.descriptor) &&
      !hasSameMigrationLineage(journal, this.descriptor)
    ));
    if (conflictingTargetLineage) {
      throw new Error(
        `目标数据库已绑定到不兼容的迁移谱系 ${conflictingTargetLineage.id}；同一 origin 不能混用发布路径。`
      );
    }
    const failedTargetMigrations = priorMigrations.filter((journal) => (
      journal.phase === "failed" &&
      targetsSamePhysicalDatabase(journal, this.descriptor) &&
      journal.failure !== null &&
      journal.failure.targetIsolation !== "complete"
    ));
    for (const failedMigration of failedTargetMigrations) {
      this.migrationJournal = await controller.retryFailedTargetIsolation(
        failedMigration.id,
        async () => {
          if (!this.targetDatabase) throw new Error("失败迁移清理缺少目标数据库上下文。");
          await deleteTargetDatabase(this.targetDatabase, failedMigration.target.databaseName);
        },
        { ownerId: this.ownerId }
      );
      if (this.migrationJournal.failure?.targetIsolation !== "complete") {
        document.documentElement.dataset.dbMigrationPhase = "failed";
        throw new Error("失败迁移的影子数据库仍被占用；释放旧页面后才能重试清理。");
      }
    }

    const existingMigration = await controller.readMigration(migrationId);
    if (existingMigration?.phase === "failed") {
      this.migrationJournal = existingMigration;
      document.documentElement.dataset.dbMigrationPhase = "failed";
      throw new Error(
        "当前 migrationId 已记录为失败终态；请发布内容不变但 migrationId 唯一的新候选，不能覆盖或续跑旧失败回执。"
      );
    }

    this.sourceDatabase = new storage.ResearchDatabase(sourceDatabaseName, {
      targetSchema: sourceSchema,
      releaseWritesLocked: false
    });
    const sourceRepository = new storage.CaseRepository(this.sourceDatabase);
    await openExpectedDatabase(this.sourceDatabase, sourceDatabaseName, sourceSchema);
    this.sourceSnapshot = await this.verifiedSnapshot(sourceRepository);
    this.assertSourceFreezeHealthy();

    const sourceBuildId = existingState?.committedBuild ?? `bootstrap-${sourceGeneration}`;
    let sourceState = existingState;
    if (!sourceState) {
      sourceState = await controller.initializeCommittedGeneration({
        generation: sourceGeneration,
        databaseName: sourceDatabaseName,
        schemaVersion: sourceSchema,
        buildId: sourceBuildId,
        digest: this.sourceSnapshot.digest
      });
    } else if (sourceState.committedDigest !== this.sourceSnapshot.digest) {
      sourceState = await controller.commitCompatibleGenerationSnapshot({
        generation: sourceGeneration,
        databaseName: sourceDatabaseName,
        schemaVersion: sourceSchema,
        buildId: sourceState.committedBuild,
        digest: this.sourceSnapshot.digest
      }, { ownerId: this.ownerId });
    }
    this.assertSourceFreezeHealthy();

    this.migrationJournal = await controller.prepareMigration({
      migrationId,
      source: {
        generation: sourceGeneration,
        databaseName: sourceDatabaseName,
        schemaVersion: sourceSchema,
        buildId: sourceState.committedBuild,
        digest: this.sourceSnapshot.digest
      },
      target: {
        generation: this.descriptor.dbGeneration,
        databaseName: this.descriptor.databaseName,
        schemaVersion: this.descriptor.targetSchema,
        buildId: this.buildId
      }
    }, { ownerId: this.ownerId });
    await this.requireShadowStorageAdmission();

    const callbacks = {
      materializeTarget: async () => {
        this.assertSourceFreezeHealthy();
        if (!this.targetDatabase || !this.targetRepository || !this.sourceSnapshot) {
          throw new Error("影子数据库物化上下文不完整。");
        }
        // The preflight estimate is only a negative gate, not a reservation.
        // Recheck immediately before opening the destructive target transaction.
        await this.requireShadowStorageAdmission();
        this.targetMaterializationStarted = true;
        await openExpectedDatabase(
          this.targetDatabase,
          this.descriptor.databaseName,
          this.descriptor.targetSchema
        );
        try {
          await this.targetDatabase.withReleaseMigrationWriteAccess(() =>
            this.targetRepository!.replaceFullDataSnapshot(this.sourceSnapshot!.payload)
          );
        } catch (cause) {
          if (!isStorageQuotaExceededError(cause)) throw cause;
          const error = new Error(
            "影子数据库写入时浏览器配额耗尽；目标事务已中止，源代际不会提交。",
            { cause }
          );
          error.name = "STORAGE_QUOTA_EXCEEDED";
          throw error;
        }
        this.assertSourceFreezeHealthy();
        const target = await this.verifiedTargetSnapshot();
        return { targetDigest: target.digest };
      },
      verifyTarget: async ({ targetDigest }: { targetDigest: string }) => {
        this.assertSourceFreezeHealthy();
        if (!this.targetRepository || !this.targetDatabase) {
          throw new Error("影子数据库校验上下文不完整。");
        }
        if (
          this.targetDatabase.name !== this.descriptor.databaseName ||
          this.targetDatabase.verno !== this.descriptor.targetSchema
        ) {
          throw new Error("影子数据库物理 Schema 与发布描述符不一致。");
        }
        const verified = await this.verifiedTargetSnapshot();
        this.assertSourceFreezeHealthy();
        if (verified.digest !== targetDigest) {
          throw new Error("影子数据库物化后摘要发生变化。");
        }
        return { verifiedDigest: verified.digest };
      },
      discardTarget: async () => {
        if (!this.targetDatabase) return;
        await deleteTargetDatabase(this.targetDatabase, this.descriptor.databaseName);
      }
    };

    this.migrationJournal = await controller.resumeMigrationToReady(
      migrationId,
      callbacks,
      { ownerId: this.ownerId }
    );
    const verifiedTarget = await this.verifiedTargetSnapshot();
    this.assertSourceFreezeHealthy();
    if (
      this.migrationJournal.phase !== "ready" &&
      this.migrationJournal.phase !== "committed"
    ) {
      throw new Error(`影子数据库没有到达 ready：${this.migrationJournal.phase}`);
    }
    if (this.migrationJournal.verifiedDigest !== verifiedTarget.digest) {
      throw new Error("影子数据库 ready 回执与当前数据摘要不一致。");
    }
    this.assertSourceFreezeHealthy();
    document.documentElement.dataset.dbMigrationPhase = this.migrationJournal.phase;
  }

  /**
   * A slow peer tab on a loaded machine can exceed the Service Worker's
   * per-client freeze timeout (5 s). The freeze has no durable side effect
   * until every peer ACKs, so a bounded retry is safe and prevents a legal
   * old page from dying on a transient source-freeze timeout.
   */
  private async freezeSourceClientsWithRetry(): Promise<void> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        await this.freezeSourceClients();
        return;
      } catch (cause) {
        if (isPeerMigrationContention(cause)) throw cause;
        this.assertSourceFreezeHealthy();
        if (attempt >= SOURCE_FREEZE_MAX_ATTEMPTS) throw cause;
        document.documentElement.dataset.dbSourceFreezeRetry = String(attempt);
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, SOURCE_FREEZE_RETRY_BACKOFF_MS * attempt);
        });
      }
    }
  }

  private async waitForPeerMigrationToSettle(
    controller: DatabaseGenerationController,
    cause: unknown
  ): Promise<void> {
    const migrationId = this.descriptor.migrationId;
    if (migrationId === null) throw cause;
    document.documentElement.dataset.dbPeerMigrationWaiting = "true";
    const deadline = Date.now() + PEER_MIGRATION_WAIT_LIMIT_MS;
    try {
      while (true) {
        this.assertSourceFreezeHealthy();
        const [state, journal] = await Promise.all([
          controller.readCommittedGeneration(),
          controller.readMigration(migrationId)
        ]);
        if (state && samePhysicalGeneration(state, this.descriptor)) {
          if (!acceptsCommittedMigration(this.descriptor, state.migrationId)) {
            throw new Error("另一页面已把数据库代际提交到当前页面不接受的迁移谱系。");
          }
          return;
        }
        if (journal?.phase === "failed") {
          const failure = journal.failure
            ? `${journal.failure.message}（目标隔离：${journal.failure.targetIsolation}）`
            : "未知原因";
          throw new Error(`同一迁移 ${migrationId} 已由另一页面失败：${failure}`, { cause });
        }
        if (
          journal?.phase === "committed" &&
          (!state || !samePhysicalGeneration(state, this.descriptor))
        ) {
          throw new Error(
            `迁移 ${migrationId} 回执已提交但控制指针不一致；失败关闭，请重新载入当前页面。`,
            { cause }
          );
        }
        if (Date.now() >= deadline) {
          throw new Error(
            `等待另一页面完成迁移 ${migrationId} 超过 ${Math.floor(PEER_MIGRATION_WAIT_LIMIT_MS / 1000)} 秒；请重新载入当前页面后重试。`,
            { cause }
          );
        }
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, PEER_MIGRATION_POLL_INTERVAL_MS);
        });
      }
    } finally {
      delete document.documentElement.dataset.dbPeerMigrationWaiting;
    }
  }

  async failPreparedMigration(cause: unknown): Promise<void> {
    let resolution: "ABORT_DATABASE_MIGRATION" | "FINISH_DATABASE_MIGRATION" =
      "ABORT_DATABASE_MIGRATION";
    try {
      if (isPeerMigrationContention(cause)) return;
      if (this.descriptor.migrationId === null || !this.migrationJournal) {
        // This page never owned a migration journal (for example its freeze
        // was rejected or it lost the boot race). Mark the failure explicitly
        // so diagnostics never linger in the misleading "pending" state.
        document.documentElement.dataset.dbMigrationPhase = "failed";
        return;
      }
      if (this.migrationJournal.phase === "committed") {
        // The control pointer already moved atomically. Reopening the source here
        // would create a split-brain writer, so old tabs must converge to target.
        resolution = "FINISH_DATABASE_MIGRATION";
        return;
      }
      if (this.migrationJournal.phase === "failed") return;
      const controller = await this.controllerPromise;
      this.migrationJournal = await controller.failMigration(
        this.descriptor.migrationId,
        cause,
        { ownerId: this.ownerId },
        this.targetMaterializationStarted ? async () => {
          if (this.targetDatabase) {
            await deleteTargetDatabase(this.targetDatabase, this.descriptor.databaseName);
          }
        } : undefined
      );
      document.documentElement.dataset.dbMigrationPhase = "failed";
    } catch (failure) {
      document.documentElement.dataset.dbMigrationPhase = "failed";
      throw failure;
    } finally {
      await this.notifySourceClients(resolution);
    }
  }

  async commitForBoot(): Promise<ReleaseBootConfirmation> {
    await this.prepareStorage();
    const controller = await this.controllerPromise;
    // A peer page may commit the same migration while this page is sending its
    // own BOOT_OK. Wait for the peer to settle and then take the committed
    // path instead of failing the boot on a lease race.
    while (true) {
      try {
        return await this.commitForBootAttempt(controller);
      } catch (cause) {
        if (!isPeerMigrationContention(cause)) throw cause;
        await this.waitForPeerMigrationToSettle(controller, cause);
      }
    }
  }

  private async commitForBootAttempt(
    controller: DatabaseGenerationController
  ): Promise<ReleaseBootConfirmation> {
    if (!this.targetRepository) throw new Error("目标数据库尚未准备。");
    const target = await this.verifiedTargetSnapshot();
    let state = await controller.readCommittedGeneration();
    if (
      state &&
      samePhysicalGeneration(state, this.descriptor) &&
      !acceptsCommittedMigration(this.descriptor, state.migrationId)
    ) {
      throw new Error("数据库代际已提交到当前页面不接受的迁移谱系。");
    }

    if (this.descriptor.migrationId !== null && state && sameSourceGeneration(state, this.descriptor)) {
      await this.renewSourceClientFreeze();
      this.assertSourceFreezeHealthy();
      const journal = await controller.commitMigration(this.descriptor.migrationId, {
        ownerId: this.ownerId
      });
      this.migrationJournal = journal;
      state = await controller.readCommittedGeneration();
    } else if (!state) {
      state = await controller.initializeCommittedGeneration({
        generation: this.descriptor.dbGeneration,
        databaseName: this.descriptor.databaseName,
        schemaVersion: this.descriptor.targetSchema,
        buildId: this.buildId,
        digest: target.digest
      });
    } else if (samePhysicalGeneration(state, this.descriptor)) {
      if (state.committedBuild !== this.buildId) {
        state = await controller.commitCompatibleGenerationSnapshot({
          generation: this.descriptor.dbGeneration,
          databaseName: this.descriptor.databaseName,
          schemaVersion: this.descriptor.targetSchema,
          buildId: this.buildId,
          digest: target.digest
        }, { ownerId: this.ownerId });
      }
    } else {
      throw new Error("不能把当前页面提交到不匹配的数据库代际。");
    }

    if (!state || !samePhysicalGeneration(state, this.descriptor) || state.committedBuild !== this.buildId) {
      throw new Error("数据库代际提交回执与当前页面不一致。");
    }
    if (!acceptsCommittedMigration(this.descriptor, state.migrationId)) {
      throw new Error("数据库代际提交 migrationId 与发布描述符不一致。");
    }
    this.committedState = state;
    document.documentElement.dataset.dbMigrationPhase = "committed";
    return { state, migrationReceiptDigest: state.receiptDigest };
  }

  async acknowledgeServiceWorkerCommit(): Promise<void> {
    await this.notifySourceClients("FINISH_DATABASE_MIGRATION");
    this.targetDatabase?.unlockReleaseWrites();
    document.documentElement.dataset.dbMigrationPhase = "committed";
    document.documentElement.dataset.swBootAck = "true";
  }
}
