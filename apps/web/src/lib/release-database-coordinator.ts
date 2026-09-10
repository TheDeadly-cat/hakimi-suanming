import Dexie from "dexie";
import type { FullBackupPayload } from "@hakimi/contracts";
import type {
  CaseRepository,
  DatabaseGenerationController,
  DatabaseGenerationMigrationJournal,
  DatabaseGenerationReleaseState,
  ResearchDatabase
} from "@hakimi/storage";
import {
  isShadowDatabaseRelease,
  parseReleaseDatabaseDescriptor,
  type ReleaseDatabaseDescriptor
} from "../../release-protocol";
import { APP_VERSION } from "./app-version";
import { ReleaseControllerTakeoverFrozenError } from "./release-controller-takeover-write-fence";
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

export class ReleaseForwardMigrationActivationFrozenError extends Error {
  constructor() {
    super("跨 Schema 向前迁移已冻结旧页面的发布控制写入；必须重新导航后启动。");
    this.name = "ReleaseForwardMigrationActivationFrozenError";
  }
}

type MigrationResolutionCommand =
  | "ABORT_DATABASE_MIGRATION"
  | "FINISH_DATABASE_MIGRATION";

type MigrationResolutionEvidence = Readonly<{
  requestedCommand: MigrationResolutionCommand;
  effectiveResolution: "DATABASE_MIGRATION_ABORTED" | "DATABASE_MIGRATION_COMMITTED";
  committedGeneration: string;
  committedDatabaseName: string;
  committedSchema: number;
  committedMigrationId: string | null;
  committedReceiptDigest: string;
}>;

const DATABASE_OPEN_TIMEOUT_MS = 8_000;
const BRIDGE_DATABASE_OPEN_TIMEOUT_MS = 20_000;
const DATABASE_DELETE_TIMEOUT_MS = 5_000;
const SOURCE_FREEZE_RENEW_INTERVAL_MS = 8_000;
const SOURCE_FREEZE_MESSAGE_TIMEOUT_MS = 7_000;
const SOURCE_RESOLUTION_MESSAGE_TIMEOUT_MS = 3_000;
const SOURCE_FREEZE_RETRY_BACKOFF_MS = 2_000;
const SOURCE_FREEZE_MAX_ATTEMPTS = 5;
const PEER_MIGRATION_POLL_INTERVAL_MS = 1_000;
const PEER_MIGRATION_WAIT_LIMIT_MS = 240_000;
const MAX_BUILD_ID_CHARACTERS = 512;

function requireCanonicalBuildId(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.trim() !== value ||
    Array.from(value).length > MAX_BUILD_ID_CHARACTERS ||
    /[\p{Cc}\p{Cf}]/u.test(value)
  ) {
    throw new Error("数据库代际协调器需要有界且不含控制字符的规范构建号。");
  }
  return value;
}

function migrationProtocolReason(value: unknown): string {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= 128 &&
    /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/u.test(value)
    ? value
    : "INVALID_ACK";
}

function isSha256Digest(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

function isNullableProtocolString(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && value.length > 0 && value.length <= 512);
}

function requestMigrationControlAck<Response>(
  controller: Pick<ServiceWorker, "postMessage">,
  message: unknown,
  timeoutMessage: string,
  timeoutMs = SOURCE_FREEZE_MESSAGE_TIMEOUT_MS
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    let settled = false;
    let timeout: number | null = null;
    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      if (timeout !== null) window.clearTimeout(timeout);
      channel.port1.onmessage = null;
      channel.port1.onmessageerror = null;
      try {
        channel.port1.close();
      } catch {
        // Port cleanup must not replace the migration protocol result.
      }
      action();
    };
    timeout = window.setTimeout(() => {
      finish(() => reject(new Error(timeoutMessage)));
    }, timeoutMs);
    channel.port1.onmessage = (event: MessageEvent<unknown>) => {
      finish(() => resolve((event.data ?? {}) as Response));
    };
    channel.port1.onmessageerror = () => {
      finish(() => reject(new Error("旧标签页迁移控制回执无法解码。")));
    };
    try {
      channel.port1.start();
      controller.postMessage(message, [channel.port2]);
    } catch (cause) {
      try {
        channel.port2.close();
      } catch {
        // A failed transfer may already have detached the second port.
      }
      finish(() => reject(cause));
    }
  });
}

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

function sameReleaseDescriptor(
  left: ReleaseDatabaseDescriptor,
  right: ReleaseDatabaseDescriptor
): boolean {
  return left.protocolVersion === right.protocolVersion
    && left.dbGeneration === right.dbGeneration
    && left.databaseName === right.databaseName
    && left.targetSchema === right.targetSchema
    && left.minReadableSchema === right.minReadableSchema
    && left.maxReadableSchema === right.maxReadableSchema
    && left.migrationId === right.migrationId
    && left.sourceGeneration === right.sourceGeneration
    && left.sourceDatabaseName === right.sourceDatabaseName
    && left.sourceSchema === right.sourceSchema
    && left.acceptedCommittedMigrationIds.length === right.acceptedCommittedMigrationIds.length
    && left.acceptedCommittedMigrationIds.every(
      (migrationId, index) => migrationId === right.acceptedCommittedMigrationIds[index]
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
  private bootCommitCompleted = false;
  private sourceClientsFrozen = false;
  private sourceFreezeRequestId: string | null = null;
  private sourceFreezeHeartbeatTimer: number | null = null;
  private sourceFreezeHeartbeatPromise: Promise<void> | null = null;
  private sourceFreezeFailure: Error | null = null;
  private preparationCancelled: Error | null = null;
  private targetMaterializationStarted = false;
  private integrityContractPromise: Promise<string> | null = null;
  private controllerTakeoverFrozen = false;
  private readonly activeControllerMutationPromises = new Set<Promise<unknown>>();
  private controllerTakeoverDrainPromise: Promise<void> | null = null;
  private readonly activeLegacyControlOperations = new Set<Promise<unknown>>();
  private forwardActivationTarget: ReleaseDatabaseDescriptor | null = null;
  private forwardActivationDrainPromise: Promise<void> | null = null;
  private forwardActivationFreezeCompleted = false;
  private cancellationFinalizationPromise: Promise<void> | null = null;
  private failureJournalTransitionPromise: Promise<MigrationResolutionCommand> | null = null;
  private failureFinalizationPromise: Promise<void> | null = null;
  private sourceResolutionPromise: Promise<MigrationResolutionEvidence> | null = null;
  private activeBootCommitPromise: Promise<ReleaseBootConfirmation> | null = null;

  constructor(
    readonly descriptor: ReleaseDatabaseDescriptor,
    readonly buildId: string
  ) {
    const canonicalBuildId = requireCanonicalBuildId(buildId);
    this.ownerId = `${descriptor.dbGeneration}:${canonicalBuildId}:${crypto.randomUUID()}`;
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
        ? await withTimeout(
          indexedDB.databases(),
          DATABASE_OPEN_TIMEOUT_MS,
          "枚举已有数据库"
        )
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
    const response = await requestMigrationControlAck<{
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
    }>(controller, {
        type: "PREPARE_DATABASE_MIGRATION",
        requestId,
        migrationId: this.descriptor.migrationId,
        sourceGeneration: this.descriptor.sourceGeneration,
        sourceDatabaseName: this.descriptor.sourceDatabaseName,
        sourceSchema: this.descriptor.sourceSchema
      }, "等待旧标签页冻结数据库写入超时。");
    if (
      response.type !== "PREPARE_DATABASE_MIGRATION_ACK" ||
      response.accepted !== true ||
      response.requestId !== requestId ||
      response.migrationId !== this.descriptor.migrationId ||
      response.targetGeneration !== this.descriptor.dbGeneration ||
      response.targetDatabaseName !== this.descriptor.databaseName ||
      response.targetSchema !== this.descriptor.targetSchema
    ) {
      throw new Error(`旧标签页没有全部冻结：${migrationProtocolReason(response.reason)}`);
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

    const renewal = requestMigrationControlAck<{
        type?: unknown;
        accepted?: unknown;
        reason?: unknown;
        requestId?: unknown;
        migrationId?: unknown;
        targetGeneration?: unknown;
        targetDatabaseName?: unknown;
        targetSchema?: unknown;
      }>(controller, {
        type: "RENEW_DATABASE_MIGRATION",
        requestId,
        migrationId
      }, "旧标签页写锁续租超时。").then((response) => {
        if (
          response?.type !== "RENEW_DATABASE_MIGRATION_ACK" ||
          response.accepted !== true ||
          response.requestId !== requestId ||
          response.migrationId !== migrationId ||
          response.targetGeneration !== this.descriptor.dbGeneration ||
          response.targetDatabaseName !== this.descriptor.databaseName ||
          response.targetSchema !== this.descriptor.targetSchema
        ) {
          throw new Error(`旧标签页写锁续租被拒绝：${migrationProtocolReason(response?.reason)}`);
        }
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
    this.assertControllerTakeoverMutationOpen();
    const cancellation = cause instanceof Error
      ? cause
      : new Error("跨 Schema 数据库准备已取消。");
    this.preparationCancelled ??= cancellation;
    // Keep renewing an already-established source freeze until the in-flight
    // preparation reaches a terminal point and its shared failure finalizer can
    // resolve the journal and release peers with one exact receipt.
    if (!this.cancellationFinalizationPromise) {
      const finalization = this.trackControllerTakeoverMutation(
        () => this.finalizeCancelledPreparation(cancellation)
      );
      this.cancellationFinalizationPromise = finalization;
      void finalization.catch(() => undefined);
    }
  }

  private async finalizeCancelledPreparation(cancellation: Error): Promise<void> {
    const preparation = this.preparePromise;
    if (preparation) await Promise.allSettled([preparation]);
    await this.ensureFailureFinalized(cancellation);
  }

  private async notifySourceClients(
    type: MigrationResolutionCommand
  ): Promise<MigrationResolutionEvidence | null> {
    if (this.descriptor.migrationId === null) return null;
    if (!this.sourceClientsFrozen) {
      if (!this.sourceResolutionPromise) return null;
      const evidence = await this.sourceResolutionPromise;
      this.assertResolutionSupportsCommand(type, evidence);
      return evidence;
    }
    if (!this.sourceResolutionPromise) {
      const resolution = this.requestSourceClientResolution(type);
      this.sourceResolutionPromise = resolution;
      void resolution.catch(() => {
        if (this.sourceResolutionPromise === resolution) {
          // Preserve the exact freeze requestId so an ACK-loss retry can ask the
          // worker to replay its bounded terminal receipt.
          this.sourceResolutionPromise = null;
        }
      });
    }
    const evidence = await this.sourceResolutionPromise;
    this.assertResolutionSupportsCommand(type, evidence);
    return evidence;
  }

  private assertResolutionSupportsCommand(
    type: MigrationResolutionCommand,
    evidence: MigrationResolutionEvidence
  ): void {
    if (type !== "FINISH_DATABASE_MIGRATION") return;
    if (
      evidence.effectiveResolution !== "DATABASE_MIGRATION_COMMITTED" ||
      !this.committedState ||
      evidence.committedReceiptDigest !== this.committedState.receiptDigest
    ) {
      throw new Error("数据库提交确认没有取得与本地 commit receipt 一致的 committed resolution。");
    }
  }

  private async requestSourceClientResolution(
    type: MigrationResolutionCommand
  ): Promise<MigrationResolutionEvidence> {
    this.stopSourceFreezeHeartbeat();
    await this.sourceFreezeHeartbeatPromise?.catch(() => undefined);
    const serviceWorkerController = navigator.serviceWorker?.controller;
    const requestId = this.sourceFreezeRequestId;
    if (!serviceWorkerController) {
      throw new Error("数据库迁移写锁通知缺少受控 Service Worker 会话；保持当前写锁状态并失败关闭。");
    }
    if (!requestId) {
      throw new Error("数据库迁移写锁通知缺少精确冻结请求标识；保持当前写锁状态并失败关闭。");
    }
    const response = await requestMigrationControlAck<{
      type?: unknown;
      resolutionProtocolVersion?: unknown;
      accepted?: unknown;
      reason?: unknown;
      requestId?: unknown;
      migrationId?: unknown;
      requestedCommand?: unknown;
      sourceGeneration?: unknown;
      sourceDatabaseName?: unknown;
      sourceSchema?: unknown;
      targetGeneration?: unknown;
      targetDatabaseName?: unknown;
      targetSchema?: unknown;
      effectiveResolution?: unknown;
      committedGeneration?: unknown;
      committedDatabaseName?: unknown;
      committedSchema?: unknown;
      committedMigrationId?: unknown;
      committedReceiptDigest?: unknown;
      peerClientCount?: unknown;
      matchedClientCount?: unknown;
      dispatchedClientCount?: unknown;
      failedClientIds?: unknown;
    }>(serviceWorkerController, {
      type,
      resolutionProtocolVersion: 1,
      requestId,
      migrationId: this.descriptor.migrationId,
      sourceGeneration: this.descriptor.sourceGeneration,
      sourceDatabaseName: this.descriptor.sourceDatabaseName,
      sourceSchema: this.descriptor.sourceSchema,
      targetGeneration: this.descriptor.dbGeneration,
      targetDatabaseName: this.descriptor.databaseName,
      targetSchema: this.descriptor.targetSchema
    }, "等待旧标签页迁移写锁释放回执超时。", SOURCE_RESOLUTION_MESSAGE_TIMEOUT_MS);
    const effectiveResolutionIsSafe =
      response.effectiveResolution === "DATABASE_MIGRATION_COMMITTED" ||
      (type === "ABORT_DATABASE_MIGRATION" &&
        response.effectiveResolution === "DATABASE_MIGRATION_ABORTED");
    const committedIdentityMatches = response.effectiveResolution === "DATABASE_MIGRATION_COMMITTED"
      ? response.committedGeneration === this.descriptor.dbGeneration &&
        response.committedDatabaseName === this.descriptor.databaseName &&
        response.committedSchema === this.descriptor.targetSchema &&
        response.committedMigrationId === this.descriptor.migrationId
      : response.committedGeneration === this.descriptor.sourceGeneration &&
        response.committedDatabaseName === this.descriptor.sourceDatabaseName &&
        response.committedSchema === this.descriptor.sourceSchema &&
        isNullableProtocolString(response.committedMigrationId);
    if (
      navigator.serviceWorker?.controller !== serviceWorkerController ||
      response.type !== "DATABASE_MIGRATION_RESOLUTION_ACK_V1" ||
      response.resolutionProtocolVersion !== 1 ||
      response.accepted !== true ||
      response.reason !== "RESOLUTION_DISPATCHED" ||
      response.requestId !== requestId ||
      response.migrationId !== this.descriptor.migrationId ||
      response.requestedCommand !== type ||
      response.sourceGeneration !== this.descriptor.sourceGeneration ||
      response.sourceDatabaseName !== this.descriptor.sourceDatabaseName ||
      response.sourceSchema !== this.descriptor.sourceSchema ||
      response.targetGeneration !== this.descriptor.dbGeneration ||
      response.targetDatabaseName !== this.descriptor.databaseName ||
      response.targetSchema !== this.descriptor.targetSchema ||
      !effectiveResolutionIsSafe ||
      !committedIdentityMatches ||
      !isSha256Digest(response.committedReceiptDigest) ||
      !Number.isSafeInteger(response.peerClientCount) ||
      Number(response.peerClientCount) < 0 ||
      !Number.isSafeInteger(response.matchedClientCount) ||
      Number(response.matchedClientCount) < 0 ||
      Number(response.matchedClientCount) > Number(response.peerClientCount) ||
      response.dispatchedClientCount !== response.matchedClientCount ||
      !Array.isArray(response.failedClientIds) ||
      response.failedClientIds.length !== 0
    ) {
      throw new Error(`旧标签页迁移写锁释放未获精确回执：${migrationProtocolReason(response.reason)}`);
    }
    const evidence = Object.freeze({
      requestedCommand: type,
      effectiveResolution: response.effectiveResolution,
      committedGeneration: response.committedGeneration,
      committedDatabaseName: response.committedDatabaseName,
      committedSchema: response.committedSchema,
      committedMigrationId: response.committedMigrationId,
      committedReceiptDigest: response.committedReceiptDigest
    }) as MigrationResolutionEvidence;
    this.assertResolutionSupportsCommand(type, evidence);
    this.sourceClientsFrozen = false;
    this.sourceFreezeRequestId = null;
    this.sourceFreezeHeartbeatPromise = null;
    this.sourceFreezeFailure = null;
    document.documentElement.dataset.dbSourceClientsFrozen = "false";
    return evidence;
  }

  prepareStorage(): Promise<void> {
    try {
      this.assertControllerTakeoverMutationOpen();
    } catch (cause) {
      return Promise.reject(cause);
    }
    this.preparePromise ??= this.trackControllerTakeoverMutation(
      () => this.runWithFailureFinalization(
        () => this.trackLegacyControlOperation(() => this.prepareStorageOnce()),
        "数据库准备失败且失败收尾未能完整结束。"
      )
    );
    return this.preparePromise;
  }

  private async prepareStorageOnce(): Promise<void> {
    const { storage } = await this.modules();
    this.assertSourceFreezeHealthy();
    this.targetRepository = storage.caseRepository;
    this.targetDatabase = storage.caseRepository.database;

    if (this.descriptor.migrationId === null) {
      this.assertForwardMigrationActivationOpen();
      await openExpectedDatabase(
        this.targetDatabase,
        this.descriptor.databaseName,
        this.descriptor.targetSchema,
        BRIDGE_DATABASE_OPEN_TIMEOUT_MS
      );
      this.assertForwardMigrationActivationOpen();
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
      releaseWritesLocked: true
    });
    const sourceRepository = new storage.CaseRepository(this.sourceDatabase);
    try {
      await openExpectedDatabase(this.sourceDatabase, sourceDatabaseName, sourceSchema);
      if (!this.sourceDatabase.areReleaseWritesLocked()) {
        throw new Error("迁移源数据库没有保持发布写锁。\n");
      }
      this.sourceSnapshot = await this.verifiedSnapshot(sourceRepository);
    } finally {
      this.sourceDatabase.close({ disableAutoOpen: true });
    }
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

  failPreparedMigration(cause: unknown): Promise<void> {
    try {
      return this.trackControllerTakeoverMutation(
        () => this.ensureFailureFinalized(cause)
      );
    } catch (failure) {
      return Promise.reject(failure);
    }
  }

  private ensureFailureFinalized(cause: unknown): Promise<void> {
    if (this.failureFinalizationPromise) return this.failureFinalizationPromise;
    const finalization = Promise.resolve().then(
      () => this.failPreparedMigrationOnce(cause)
    );
    this.failureFinalizationPromise = finalization;
    void finalization.catch(() => {
      if (this.failureFinalizationPromise === finalization) {
        // A failed full finalizer keeps the freeze identity intact. The journal
        // transition promise remains sticky; a later entry can only retry the
        // exact Service Worker resolution request, never failMigration itself.
        this.failureFinalizationPromise = null;
      }
    });
    return finalization;
  }

  private ensureFailureJournalTransition(
    cause: unknown
  ): Promise<MigrationResolutionCommand> {
    if (this.failureJournalTransitionPromise) {
      return this.failureJournalTransitionPromise;
    }
    const transition = Promise.resolve().then(
      () => this.failPreparedMigrationJournalOnce(cause)
    );
    // The journal transition is an immutable, single-attempt control write.
    // Keep both success and rejection sticky. A later finalizer may replay only
    // the exact Service Worker resolution request; it must never infer that a
    // rejected controller promise authorizes a second failMigration call.
    this.failureJournalTransitionPromise = transition;
    void transition.catch(() => undefined);
    return transition;
  }

  private async failPreparedMigrationOnce(cause: unknown): Promise<void> {
    const transition = await this.ensureFailureJournalTransition(cause).then(
      (resolution) => ({ accepted: true as const, resolution }),
      (failure: unknown) => ({
        accepted: false as const,
        // The worker independently verifies the committed pointer, so ABORT is
        // only a conservative request label when the journal outcome is unknown.
        resolution: "ABORT_DATABASE_MIGRATION" as const,
        failure
      })
    );
    const resolution = await this.notifySourceClients(transition.resolution).then(
      () => ({ accepted: true as const }),
      (failure: unknown) => ({ accepted: false as const, failure })
    );
    if (!transition.accepted && !resolution.accepted) {
      throw new AggregateError(
        [transition.failure, resolution.failure],
        "数据库迁移失败回执写入及来源写锁释放均未成功完成。"
      );
    }
    if (!transition.accepted) throw transition.failure;
    if (!resolution.accepted) throw resolution.failure;
  }

  private async failPreparedMigrationJournalOnce(
    cause: unknown
  ): Promise<MigrationResolutionCommand> {
    let resolution: MigrationResolutionCommand = "ABORT_DATABASE_MIGRATION";
    try {
      if (isPeerMigrationContention(cause)) return resolution;
      if (this.descriptor.migrationId === null || !this.migrationJournal) {
        // This page never owned a migration journal (for example its freeze
        // was rejected or it lost the boot race). Mark the failure explicitly
        // so diagnostics never linger in the misleading "pending" state.
        document.documentElement.dataset.dbMigrationPhase = "failed";
        return resolution;
      }
      if (this.migrationJournal.phase === "committed") {
        // The control pointer already moved atomically. Reopening the source here
        // would create a split-brain writer, so old tabs must converge to target.
        resolution = "FINISH_DATABASE_MIGRATION";
        return resolution;
      }
      if (this.migrationJournal.phase === "failed") return resolution;
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
      return resolution;
    } catch (failure) {
      document.documentElement.dataset.dbMigrationPhase = "failed";
      throw failure;
    }
  }

  private async runWithFailureFinalization<T>(
    operation: () => Promise<T>,
    finalizationMessage: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (cause) {
      try {
        await this.ensureFailureFinalized(cause);
      } catch (finalizationFailure) {
        throw new AggregateError([cause, finalizationFailure], finalizationMessage);
      }
      throw cause;
    }
  }

  private controllerTakeoverFrozenError(): Error {
    return new ReleaseControllerTakeoverFrozenError();
  }

  private assertForwardMigrationActivationOpen(): void {
    if (this.forwardActivationTarget) throw new ReleaseForwardMigrationActivationFrozenError();
  }

  private assertControllerTakeoverMutationOpen(): void {
    this.assertForwardMigrationActivationOpen();
    if (this.controllerTakeoverFrozen) throw this.controllerTakeoverFrozenError();
  }

  private assertControllerTakeoverCommitOpen(): void {
    this.assertControllerTakeoverMutationOpen();
  }

  private trackControllerTakeoverMutation<T>(operation: () => Promise<T>): Promise<T> {
    this.assertControllerTakeoverMutationOpen();
    let resolveMutation!: (value: T | PromiseLike<T>) => void;
    let rejectMutation!: (reason?: unknown) => void;
    const mutation = new Promise<T>((resolve, reject) => {
      resolveMutation = resolve;
      rejectMutation = reject;
    });
    // Register the admission placeholder before invoking user-controlled or
    // mocked async code. A synchronous re-entry into freeze must observe this
    // operation even though its concrete promise has not been returned yet.
    // Admitted operations must never await freezeForControllerTakeover(): the
    // drain deliberately waits for them, so such a dependency would deadlock.
    this.activeControllerMutationPromises.add(mutation);
    const remove = () => {
      this.activeControllerMutationPromises.delete(mutation);
    };
    void mutation.then(remove, remove);
    try {
      void Promise.resolve(operation()).then(resolveMutation, rejectMutation);
    } catch (cause) {
      rejectMutation(cause);
    }
    return mutation;
  }

  private trackLegacyControlOperation<T>(operation: () => Promise<T>): Promise<T> {
    // Shadow preparations retain the existing whole-operation drain. Only the
    // legacy source has a read-only audit that may await worker activation.
    if (this.descriptor.migrationId !== null) return operation();
    this.assertForwardMigrationActivationOpen();
    let resolveOperation!: (value: T | PromiseLike<T>) => void;
    let rejectOperation!: (reason?: unknown) => void;
    const admitted = new Promise<T>((resolve, reject) => {
      resolveOperation = resolve;
      rejectOperation = reject;
    });
    // Admission must precede the actual open/read/write call, including a
    // synchronous freeze requested from inside a storage implementation.
    this.activeLegacyControlOperations.add(admitted);
    const remove = () => { this.activeLegacyControlOperations.delete(admitted); };
    void admitted.then(remove, remove);
    try {
      void Promise.resolve(operation()).then(resolveOperation, rejectOperation);
    } catch (cause) {
      rejectOperation(cause);
    }
    return admitted;
  }

  private requireForwardActivationTarget(target: ReleaseDatabaseDescriptor): ReleaseDatabaseDescriptor {
    const source = parseReleaseDatabaseDescriptor(this.descriptor);
    const parsed = parseReleaseDatabaseDescriptor(target);
    if (
      source.dbGeneration !== "legacy-v13" || source.targetSchema !== 13
      || source.minReadableSchema !== 13 || source.maxReadableSchema !== 13
      || source.migrationId !== null || !Array.isArray(target.acceptedCommittedMigrationIds)
      || !isShadowDatabaseRelease(parsed) || parsed.targetSchema !== 16
      || parsed.minReadableSchema !== 16 || parsed.maxReadableSchema !== 16
      || parsed.protocolVersion !== source.protocolVersion
      || parsed.sourceGeneration !== source.dbGeneration
      || parsed.sourceDatabaseName !== source.databaseName
      || parsed.sourceSchema !== source.targetSchema
      || parsed.dbGeneration === source.dbGeneration || parsed.databaseName === source.databaseName
      || !acceptsCommittedMigration(parsed, parsed.migrationId)
    ) {
      throw new Error("向前激活只接受完整匹配 legacy-v13 来源的独立 Schema 16 迁移。");
    }
    return Object.freeze(parsed);
  }

  /**
   * Close source writes and drain admitted legacy opens/control operations.
   * The read-only backup audit remains in the original full takeover drain;
   * it must settle normally, then fail its late commit on this frozen page.
   */
  freezeForForwardMigrationActivation(target: ReleaseDatabaseDescriptor): Promise<void> {
    let parsed: ReleaseDatabaseDescriptor;
    try {
      parsed = this.requireForwardActivationTarget(target);
      if (this.forwardActivationTarget) {
        if (!sameReleaseDescriptor(this.forwardActivationTarget, parsed)) {
          throw new Error("向前激活目标与本页已冻结的迁移描述符不一致。");
        }
        return this.forwardActivationDrainPromise!;
      }
      this.assertControllerTakeoverMutationOpen();
    } catch (cause) {
      return Promise.reject(cause);
    }
    this.forwardActivationTarget = parsed;
    this.controllerTakeoverFrozen = true;
    let resolveDrain!: () => void;
    let rejectDrain!: (cause: unknown) => void;
    const drain = new Promise<void>((resolve, reject) => {
      resolveDrain = resolve;
      rejectDrain = reject;
    });
    this.forwardActivationDrainPromise = drain;
    void (async () => {
      this.targetDatabase?.lockReleaseWrites();
      while (this.activeLegacyControlOperations.size > 0) {
        await Promise.allSettled(Array.from(this.activeLegacyControlOperations));
      }
      // This is an ordering barrier, not a claim that an admitted write passed.
      // Its original caller retains failures; navigation reads the real receipt.
      this.forwardActivationFreezeCompleted = true;
    })().then(resolveDrain, rejectDrain);
    return drain;
  }

  async verifyForwardMigrationActivationNavigationState(
    target: ReleaseDatabaseDescriptor,
    targetBuildVersion: string
  ): Promise<void> {
    const parsed = this.requireForwardActivationTarget(target);
    const targetBuild = requireCanonicalBuildId(targetBuildVersion);
    if (
      !this.forwardActivationFreezeCompleted || !this.forwardActivationTarget
      || !sameReleaseDescriptor(this.forwardActivationTarget, parsed)
    ) {
      throw new Error("向前激活导航要求同一目标的源写入冻结已经完成。");
    }
    const controller = await this.controllerPromise;
    // A slow old page may never have opened its control connection before the
    // audit. Use the formal receipt reader, without opening a business database
    // or writing a pointer; do not authorize navigation from cached boot state.
    const state = await controller.readCommittedGeneration();
    const sourceStillCommitted = state
      && samePhysicalGeneration(state, this.descriptor)
      && state.committedBuild === this.buildId
      && state.migrationId === this.descriptor.migrationId
      && acceptsCommittedMigration(this.descriptor, state.migrationId);
    const targetAlreadyCommitted = state
      && samePhysicalGeneration(state, parsed)
      && state.committedBuild === targetBuild
      && state.migrationId === parsed.migrationId
      && acceptsCommittedMigration(parsed, state.migrationId);
    if (
      !state || state.protocolVersion !== parsed.protocolVersion
      || !isSha256Digest(state.receiptDigest)
      || (!sourceStillCommitted && !targetAlreadyCommitted)
    ) {
      throw new Error("向前激活导航的当前控制回执既不是原来源，也不是精确目标提交。");
    }
  }

  private async drainControllerTakeoverMutations(): Promise<void> {
    while (this.activeControllerMutationPromises.size > 0) {
      const admitted = Array.from(this.activeControllerMutationPromises);
      await Promise.allSettled(admitted);
    }
  }

  /**
   * Monotonically closes this page's independent release-control writer and
   * all-settles every preparation, commit, or failure finalizer admitted before
   * the close. The page never reopens this coordinator instance.
   */
  freezeForControllerTakeover(): Promise<void> {
    if (this.controllerTakeoverDrainPromise) return this.controllerTakeoverDrainPromise;
    this.controllerTakeoverFrozen = true;
    const drain = this.drainControllerTakeoverMutations();
    this.controllerTakeoverDrainPromise = drain;
    return drain;
  }

  /**
   * Only a page with its own completed boot commit may navigate after first claim.
   * An early peer claim without this page's completed commit fails before
   * touching the control database. The subsequent read cannot reopen Dexie.
   */
  async verifyFirstControllerClaimNavigationState(): Promise<void> {
    const legacyBridge = this.descriptor.dbGeneration === "legacy-v13"
      && this.descriptor.targetSchema === 13
      && this.descriptor.migrationId === null;
    if (
      !this.controllerTakeoverFrozen ||
      (!legacyBridge && !isShadowDatabaseRelease(this.descriptor)) ||
      !this.bootCommitCompleted ||
      !this.committedState
    ) {
      throw new Error("首次 Service Worker 接管前本页尚未完成数据库正常提交；旧页保持写入锁定，请重新打开并核对。");
    }
    const controller = await this.controllerPromise;
    // This formal read verifies the persisted receipt; the cached commit alone
    // cannot authorize a navigation after a peer has changed the pointer.
    const state = await controller.readCommittedGenerationFromOpenConnection();
    if (
      !state ||
      state.protocolVersion !== this.descriptor.protocolVersion ||
      !samePhysicalGeneration(state, this.descriptor) ||
      state.committedBuild !== this.buildId ||
      state.migrationId !== this.committedState.migrationId ||
      !acceptsCommittedMigration(this.descriptor, state.migrationId) ||
      state.receiptDigest !== this.committedState.receiptDigest
    ) {
      throw new Error("首次 Service Worker 接管的已提交数据库回执与本页不一致；旧页保持写入锁定，请重新打开并核对。");
    }
  }

  async commitForBoot(): Promise<ReleaseBootConfirmation> {
    this.assertControllerTakeoverCommitOpen();
    if (this.activeBootCommitPromise) return this.activeBootCommitPromise;
    const commit = this.trackControllerTakeoverMutation(
      () => this.runWithFailureFinalization(
        () => this.commitForBootUntilSettled(),
        "数据库提交失败且失败收尾未能完整结束。"
      )
    );
    this.activeBootCommitPromise = commit;
    void commit.then(
      () => {
        if (this.activeBootCommitPromise === commit) this.activeBootCommitPromise = null;
      },
      () => {
        if (this.activeBootCommitPromise === commit) this.activeBootCommitPromise = null;
      }
    );
    return commit;
  }

  private async commitForBootUntilSettled(): Promise<ReleaseBootConfirmation> {
    await this.prepareStorage();
    const controller = await this.controllerPromise;
    // A peer page may commit the same migration while this page is sending its
    // own BOOT_OK. Wait for the peer to settle and then take the committed
    // path instead of failing the boot on a lease race.
    while (true) {
      try {
        this.assertControllerTakeoverCommitOpen();
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
    this.assertControllerTakeoverCommitOpen();
    const target = await this.verifiedTargetSnapshot();
    this.assertForwardMigrationActivationOpen();
    let state = await this.trackLegacyControlOperation(() => controller.readCommittedGeneration());
    this.assertForwardMigrationActivationOpen();
    if (
      state &&
      samePhysicalGeneration(state, this.descriptor) &&
      !acceptsCommittedMigration(this.descriptor, state.migrationId)
    ) {
      throw new Error("数据库代际已提交到当前页面不接受的迁移谱系。");
    }

    if (this.descriptor.migrationId !== null && state && sameSourceGeneration(state, this.descriptor)) {
      this.assertControllerTakeoverCommitOpen();
      await this.renewSourceClientFreeze();
      this.assertSourceFreezeHealthy();
      const journal = await controller.commitMigration(this.descriptor.migrationId, {
        ownerId: this.ownerId
      });
      this.migrationJournal = journal;
      state = await controller.readCommittedGeneration();
    } else if (!state) {
      this.assertControllerTakeoverCommitOpen();
      state = await this.trackLegacyControlOperation(() => controller.initializeCommittedGeneration({
        generation: this.descriptor.dbGeneration,
        databaseName: this.descriptor.databaseName,
        schemaVersion: this.descriptor.targetSchema,
        buildId: this.buildId,
        digest: target.digest
      }));
    } else if (samePhysicalGeneration(state, this.descriptor)) {
      if (state.committedBuild !== this.buildId) {
        this.assertControllerTakeoverCommitOpen();
        state = await this.trackLegacyControlOperation(() => controller.commitCompatibleGenerationSnapshot({
          generation: this.descriptor.dbGeneration,
          databaseName: this.descriptor.databaseName,
          schemaVersion: this.descriptor.targetSchema,
          buildId: this.buildId,
          digest: target.digest
        }, { ownerId: this.ownerId }));
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
    this.assertForwardMigrationActivationOpen();
    this.committedState = state;
    this.bootCommitCompleted = true;
    document.documentElement.dataset.dbMigrationPhase = "committed";
    return { state, migrationReceiptDigest: state.receiptDigest };
  }

  acknowledgeServiceWorkerCommit(): Promise<void> {
    try {
      return this.trackControllerTakeoverMutation(
        () => this.acknowledgeServiceWorkerCommitOnce()
      );
    } catch (failure) {
      return Promise.reject(failure);
    }
  }

  private async acknowledgeServiceWorkerCommitOnce(): Promise<void> {
    await this.notifySourceClients("FINISH_DATABASE_MIGRATION");
    this.assertForwardMigrationActivationOpen();
    this.targetDatabase?.unlockReleaseWrites();
    document.documentElement.dataset.dbMigrationPhase = "committed";
    document.documentElement.dataset.swBootAck = "true";
  }
}
