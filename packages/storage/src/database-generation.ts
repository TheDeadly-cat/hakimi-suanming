import Dexie, { type EntityTable } from "dexie";
import { sha256Hex } from "@hakimi/integrity";

export const DATABASE_GENERATION_CONTROL_PROTOCOL_VERSION = 1 as const;
export const DATABASE_GENERATION_CONTROL_DB_NAME = "hakimi-bazi-release-control";
export const DATABASE_GENERATION_JOURNAL_STORE = "migrationJournals";
export const DATABASE_GENERATION_RELEASE_STATE_STORE = "releaseState";
export const DATABASE_GENERATION_LEASE_STORE = "migrationLeases";
export const CURRENT_RELEASE_STATE_ID = "current";
export const DATABASE_GENERATION_MIGRATION_LEASE_NAME = "database-generation-migration";
export const DEFAULT_DATABASE_GENERATION_LEASE_DURATION_MS = 30_000;

const SAFE_DATABASE_COMPONENT = /^[a-z0-9._-]+$/;
const SHA256_DIGEST = /^[a-f0-9]{64}$/;

export const DATABASE_GENERATION_MIGRATION_PHASES = [
  "prepared",
  "materializing",
  "verifying",
  "ready",
  "committed",
  "failed"
] as const;

export type DatabaseGenerationMigrationPhase =
  (typeof DATABASE_GENERATION_MIGRATION_PHASES)[number];

const PHASE_RANK: Record<DatabaseGenerationMigrationPhase, number> = {
  prepared: 0,
  materializing: 1,
  verifying: 2,
  ready: 3,
  committed: 4,
  failed: 5
};

export type DatabaseGenerationIdentity = {
  generation: string;
  databaseName: string;
  schemaVersion: number;
  buildId: string;
};

export type DatabaseGenerationSnapshot = DatabaseGenerationIdentity & {
  digest: string;
};

export type DatabaseGenerationPhaseHistoryEntry = {
  phase: DatabaseGenerationMigrationPhase;
  at: string;
  ownerId: string;
  fencingToken: number;
};

export type DatabaseGenerationMigrationFailure = {
  code: string;
  message: string;
  failedAt: string;
  targetIsolation: "pending" | "complete" | "failed" | "not_requested";
  isolationError: string | null;
};

export type DatabaseGenerationMigrationJournal = {
  id: string;
  protocolVersion: typeof DATABASE_GENERATION_CONTROL_PROTOCOL_VERSION;
  source: DatabaseGenerationSnapshot;
  target: DatabaseGenerationIdentity;
  phase: DatabaseGenerationMigrationPhase;
  targetDigest: string | null;
  verifiedDigest: string | null;
  receiptDigest: string | null;
  attemptCount: number;
  lastOwnerId: string;
  lastFencingToken: number;
  failure: DatabaseGenerationMigrationFailure | null;
  history: DatabaseGenerationPhaseHistoryEntry[];
  createdAt: string;
  updatedAt: string;
};

/**
 * This record is intentionally flat and stable because the Service Worker reads
 * it directly through IndexedDB without importing the application bundle.
 */
export type DatabaseGenerationReleaseState = {
  id: typeof CURRENT_RELEASE_STATE_ID;
  protocolVersion: typeof DATABASE_GENERATION_CONTROL_PROTOCOL_VERSION;
  committedGeneration: string;
  committedDatabaseName: string;
  committedSchema: number;
  committedBuild: string;
  migrationId: string | null;
  committedDigest: string;
  receiptDigest: string;
  committedAt: string;
  updatedAt: string;
};

export type DatabaseGenerationMigrationLease = {
  name: typeof DATABASE_GENERATION_MIGRATION_LEASE_NAME;
  ownerId: string;
  fencingToken: number;
  acquiredAt: string;
  renewedAt: string;
  expiresAt: number;
};

export type DatabaseGenerationLeaseHandle = Readonly<DatabaseGenerationMigrationLease>;

export type PrepareDatabaseGenerationMigrationInput = {
  migrationId?: string;
  source: DatabaseGenerationSnapshot;
  target: DatabaseGenerationIdentity;
};

export type DatabaseGenerationMigrationCallbackContext = {
  migration: Readonly<DatabaseGenerationMigrationJournal>;
  ownerId: string;
  fencingToken: number;
  /**
   * Long-running callbacks may call this at safe checkpoints. An automatic
   * heartbeat also runs unless heartbeatIntervalMs is explicitly set to zero.
   */
  checkpoint: () => Promise<void>;
};

export type MaterializeDatabaseGenerationResult = {
  targetDigest: string;
};

export type VerifyDatabaseGenerationResult = {
  verifiedDigest: string;
};

export type DatabaseGenerationMigrationCallbacks = {
  /** Must be idempotent and must never mutate or delete the source database. */
  materializeTarget: (
    context: DatabaseGenerationMigrationCallbackContext
  ) => Promise<MaterializeDatabaseGenerationResult>;
  verifyTarget: (
    context: DatabaseGenerationMigrationCallbackContext & { targetDigest: string }
  ) => Promise<VerifyDatabaseGenerationResult>;
  /** Deletes or quarantines only the target database; it must not touch source. */
  discardTarget?: (
    context: DatabaseGenerationMigrationCallbackContext & { failure: DatabaseGenerationMigrationFailure }
  ) => Promise<void>;
};

export type DatabaseGenerationLeaseOptions = {
  ownerId: string;
  leaseDurationMs?: number;
  heartbeatIntervalMs?: number;
};

export type DatabaseGenerationControllerOptions = {
  /** Override only for isolated tests. Production callers should use the fixed default. */
  databaseName?: string;
  now?: () => number;
  createId?: () => string;
};

export type DatabaseGenerationErrorCode =
  | "INVALID_ARGUMENT"
  | "CONTROL_STATE_CONFLICT"
  | "CONTROL_STATE_CORRUPT"
  | "MIGRATION_NOT_FOUND"
  | "MIGRATION_CONFLICT"
  | "TARGET_ISOLATION_INCOMPLETE"
  | "MIGRATION_PHASE_CONFLICT"
  | "MIGRATION_FAILED"
  | "DIGEST_MISMATCH"
  | "LEASE_HELD"
  | "LEASE_LOST";

export class DatabaseGenerationError extends Error {
  constructor(
    readonly code: DatabaseGenerationErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "DatabaseGenerationError";
  }
}

class DatabaseGenerationControlDatabase extends Dexie {
  migrationJournals!: EntityTable<DatabaseGenerationMigrationJournal, "id">;
  releaseState!: EntityTable<DatabaseGenerationReleaseState, "id">;
  migrationLeases!: EntityTable<DatabaseGenerationMigrationLease, "name">;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      migrationJournals: "&id, phase, createdAt, updatedAt",
      releaseState: "&id",
      migrationLeases: "&name, expiresAt"
    });
  }
}

function requireNonEmpty(value: string, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new DatabaseGenerationError("INVALID_ARGUMENT", `${field} must be a non-empty string`);
  }
  return value;
}

function requireSafeComponent(value: string, field: string): string {
  requireNonEmpty(value, field);
  if (!SAFE_DATABASE_COMPONENT.test(value)) {
    throw new DatabaseGenerationError(
      "INVALID_ARGUMENT",
      `${field} must match ${SAFE_DATABASE_COMPONENT.source}`
    );
  }
  return value;
}

function requireSchemaVersion(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new DatabaseGenerationError(
      "INVALID_ARGUMENT",
      `${field} must be a positive safe integer`
    );
  }
  return value;
}

function requireDigest(value: string, field: string): string {
  if (!SHA256_DIGEST.test(value)) {
    throw new DatabaseGenerationError(
      "INVALID_ARGUMENT",
      `${field} must be a lowercase SHA-256 digest`
    );
  }
  return value;
}

function validateIdentity<T extends DatabaseGenerationIdentity>(identity: T, field: string): T {
  requireSafeComponent(identity.generation, `${field}.generation`);
  requireSafeComponent(identity.databaseName, `${field}.databaseName`);
  requireSchemaVersion(identity.schemaVersion, `${field}.schemaVersion`);
  requireNonEmpty(identity.buildId, `${field}.buildId`);
  return identity;
}

function validateSnapshot(snapshot: DatabaseGenerationSnapshot, field: string) {
  validateIdentity(snapshot, field);
  requireDigest(snapshot.digest, `${field}.digest`);
}

function assertDifferentGenerations(
  source: DatabaseGenerationSnapshot,
  target: DatabaseGenerationIdentity
) {
  if (source.generation === target.generation) {
    throw new DatabaseGenerationError(
      "INVALID_ARGUMENT",
      "source and target generation must be different"
    );
  }
  if (source.databaseName === target.databaseName) {
    throw new DatabaseGenerationError(
      "INVALID_ARGUMENT",
      "target must use a shadow database name distinct from source"
    );
  }
}

function cloneJournal(
  journal: DatabaseGenerationMigrationJournal
): DatabaseGenerationMigrationJournal {
  return structuredClone(journal);
}

function sameSnapshot(
  left: DatabaseGenerationSnapshot,
  right: DatabaseGenerationSnapshot
): boolean {
  return (
    left.generation === right.generation &&
    left.databaseName === right.databaseName &&
    left.schemaVersion === right.schemaVersion &&
    left.buildId === right.buildId &&
    left.digest === right.digest
  );
}

function sameIdentity(
  left: DatabaseGenerationIdentity,
  right: DatabaseGenerationIdentity
): boolean {
  return (
    left.generation === right.generation &&
    left.databaseName === right.databaseName &&
    left.schemaVersion === right.schemaVersion &&
    left.buildId === right.buildId
  );
}

function stateMatchesSnapshot(
  state: DatabaseGenerationReleaseState,
  snapshot: DatabaseGenerationSnapshot
): boolean {
  return (
    state.committedGeneration === snapshot.generation &&
    state.committedDatabaseName === snapshot.databaseName &&
    state.committedSchema === snapshot.schemaVersion &&
    state.committedBuild === snapshot.buildId &&
    state.committedDigest === snapshot.digest
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown migration failure";
}

function errorCode(error: unknown): string {
  if (error instanceof DatabaseGenerationError) return error.code;
  if (error instanceof Error && error.name) return error.name;
  return "MIGRATION_CALLBACK_FAILED";
}

function isLeaseError(error: unknown): boolean {
  return (
    error instanceof DatabaseGenerationError &&
    (error.code === "LEASE_HELD" || error.code === "LEASE_LOST")
  );
}

function requireLeaseDuration(value: number): number {
  if (!Number.isSafeInteger(value) || value < 100) {
    throw new DatabaseGenerationError(
      "INVALID_ARGUMENT",
      "leaseDurationMs must be a safe integer of at least 100 milliseconds"
    );
  }
  return value;
}

function requireHeartbeatInterval(value: number, leaseDurationMs: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value >= leaseDurationMs) {
    throw new DatabaseGenerationError(
      "INVALID_ARGUMENT",
      "heartbeatIntervalMs must be zero or a safe integer shorter than the lease"
    );
  }
  return value;
}

export function buildShadowGenerationDatabaseName(
  baseDatabaseName: string,
  generation: string
): string {
  requireSafeComponent(baseDatabaseName, "baseDatabaseName");
  requireSafeComponent(generation, "generation");
  return `${baseDatabaseName}.generation.${generation}`;
}

export function databaseGenerationPhaseRank(phase: DatabaseGenerationMigrationPhase): number {
  return PHASE_RANK[phase];
}

export function buildDatabaseGenerationReceiptPayload(
  state: Omit<DatabaseGenerationReleaseState, "receiptDigest">
) {
  return {
    kind: "hakimi-database-generation-commit-receipt@1",
    id: state.id,
    protocolVersion: state.protocolVersion,
    committedGeneration: state.committedGeneration,
    committedDatabaseName: state.committedDatabaseName,
    committedSchema: state.committedSchema,
    committedBuild: state.committedBuild,
    migrationId: state.migrationId,
    committedDigest: state.committedDigest,
    committedAt: state.committedAt,
    updatedAt: state.updatedAt
  };
}

async function createReleaseState(
  snapshot: DatabaseGenerationSnapshot,
  migrationId: string | null,
  timestamp: string
): Promise<DatabaseGenerationReleaseState> {
  const unsigned: Omit<DatabaseGenerationReleaseState, "receiptDigest"> = {
    id: CURRENT_RELEASE_STATE_ID,
    protocolVersion: DATABASE_GENERATION_CONTROL_PROTOCOL_VERSION,
    committedGeneration: snapshot.generation,
    committedDatabaseName: snapshot.databaseName,
    committedSchema: snapshot.schemaVersion,
    committedBuild: snapshot.buildId,
    migrationId,
    committedDigest: snapshot.digest,
    committedAt: timestamp,
    updatedAt: timestamp
  };
  return {
    ...unsigned,
    receiptDigest: await sha256Hex(buildDatabaseGenerationReceiptPayload(unsigned))
  };
}

function assertMonotonicHistory(journal: DatabaseGenerationMigrationJournal) {
  let previous = -1;
  for (const entry of journal.history) {
    const rank = PHASE_RANK[entry.phase];
    if (rank === undefined || rank < previous) {
      throw new DatabaseGenerationError(
        "CONTROL_STATE_CORRUPT",
        `migration ${journal.id} contains a non-monotonic phase history`
      );
    }
    previous = rank;
  }
  if (journal.history.length === 0 || journal.history.at(-1)?.phase !== journal.phase) {
    throw new DatabaseGenerationError(
      "CONTROL_STATE_CORRUPT",
      `migration ${journal.id} phase does not match its history`
    );
  }
}

function assertJournalShape(journal: DatabaseGenerationMigrationJournal) {
  if (journal.protocolVersion !== DATABASE_GENERATION_CONTROL_PROTOCOL_VERSION) {
    throw new DatabaseGenerationError(
      "CONTROL_STATE_CORRUPT",
      `migration ${journal.id} uses an unsupported protocol version`
    );
  }
  validateSnapshot(journal.source, "journal.source");
  validateIdentity(journal.target, "journal.target");
  if (journal.targetDigest !== null) requireDigest(journal.targetDigest, "journal.targetDigest");
  if (journal.verifiedDigest !== null) {
    requireDigest(journal.verifiedDigest, "journal.verifiedDigest");
  }
  if (journal.receiptDigest !== null) {
    requireDigest(journal.receiptDigest, "journal.receiptDigest");
  }
  if ((journal.phase === "failed") !== (journal.failure !== null)) {
    throw new DatabaseGenerationError(
      "CONTROL_STATE_CORRUPT",
      `migration ${journal.id} failure payload does not match its phase`
    );
  }
  if (journal.failure) {
    if (
      typeof journal.failure.code !== "string" || journal.failure.code.length === 0 ||
      typeof journal.failure.message !== "string" || journal.failure.message.length === 0 ||
      !Number.isFinite(Date.parse(journal.failure.failedAt)) ||
      !["pending", "complete", "failed", "not_requested"].includes(
        journal.failure.targetIsolation
      ) ||
      (journal.failure.targetIsolation === "failed" && !journal.failure.isolationError) ||
      (journal.failure.targetIsolation !== "failed" && journal.failure.isolationError !== null)
    ) {
      throw new DatabaseGenerationError(
        "CONTROL_STATE_CORRUPT",
        `migration ${journal.id} contains an invalid failure payload`
      );
    }
  }
  assertMonotonicHistory(journal);
}

export class DatabaseGenerationController {
  readonly databaseName: string;
  private readonly database: DatabaseGenerationControlDatabase;
  private readonly now: () => number;
  private readonly createId: () => string;

  constructor(options: DatabaseGenerationControllerOptions = {}) {
    this.databaseName = options.databaseName ?? DATABASE_GENERATION_CONTROL_DB_NAME;
    requireSafeComponent(this.databaseName, "databaseName");
    this.database = new DatabaseGenerationControlDatabase(this.databaseName);
    this.now = options.now ?? Date.now;
    this.createId =
      options.createId ??
      (() => {
        if (typeof globalThis.crypto?.randomUUID !== "function") {
          throw new DatabaseGenerationError(
            "INVALID_ARGUMENT",
            "crypto.randomUUID is required to create a migration id"
          );
        }
        return globalThis.crypto.randomUUID();
      });
  }

  close() {
    this.database.close();
  }

  private timestamp(now = this.now()): string {
    if (!Number.isFinite(now)) {
      throw new DatabaseGenerationError("INVALID_ARGUMENT", "clock returned a non-finite value");
    }
    return new Date(now).toISOString();
  }

  async initializeCommittedGeneration(
    snapshot: DatabaseGenerationSnapshot
  ): Promise<DatabaseGenerationReleaseState> {
    validateSnapshot(snapshot, "snapshot");
    const timestamp = this.timestamp();
    const candidate = await createReleaseState(snapshot, null, timestamp);

    const state = await this.database.transaction("rw", this.database.releaseState, async () => {
      const existing = await this.database.releaseState.get(CURRENT_RELEASE_STATE_ID);
      if (existing) {
        if (!stateMatchesSnapshot(existing, snapshot)) {
          throw new DatabaseGenerationError(
            "CONTROL_STATE_CONFLICT",
            "release state is already initialized to a different committed generation"
          );
        }
        return existing;
      }
      await this.database.releaseState.add(candidate);
      return candidate;
    });
    // Receipt hashing intentionally stays outside the IndexedDB transaction so
    // a slow WebCrypto promise cannot let the transaction auto-commit early.
    await this.assertReleaseStateIntegrity(state);
    return state;
  }

  async readCommittedGeneration(): Promise<DatabaseGenerationReleaseState | null> {
    const state = (await this.database.releaseState.get(CURRENT_RELEASE_STATE_ID)) ?? null;
    if (state) await this.assertReleaseStateIntegrity(state);
    return state;
  }

  /**
   * Commits a fresh digest/build receipt without changing the physical database
   * generation or schema. Callers use this after freezing writes in a compatible
   * bridge build, immediately before preparing a shadow migration.
   */
  async commitCompatibleGenerationSnapshot(
    snapshot: DatabaseGenerationSnapshot,
    options: DatabaseGenerationLeaseOptions
  ): Promise<DatabaseGenerationReleaseState> {
    validateSnapshot(snapshot, "snapshot");
    const { leaseDurationMs } = this.leaseSettings(options);
    const lease = await this.acquireMigrationLease(options.ownerId, leaseDurationMs);
    try {
      const current = await this.readCommittedGeneration();
      if (!current) {
        throw new DatabaseGenerationError(
          "CONTROL_STATE_CONFLICT",
          "release state must be initialized before committing a compatible snapshot"
        );
      }
      if (
        current.committedGeneration !== snapshot.generation ||
        current.committedDatabaseName !== snapshot.databaseName ||
        current.committedSchema !== snapshot.schemaVersion
      ) {
        throw new DatabaseGenerationError(
          "CONTROL_STATE_CONFLICT",
          "compatible snapshot cannot change generation, database name, or schema"
        );
      }
      const timestamp = this.timestamp();
      const candidate = await createReleaseState(snapshot, current.migrationId, timestamp);

      return this.database.transaction(
        "rw",
        this.database.releaseState,
        this.database.migrationJournals,
        this.database.migrationLeases,
        async () => {
          await this.requireLease(lease);
          const latest = await this.database.releaseState.get(CURRENT_RELEASE_STATE_ID);
          if (!latest || latest.receiptDigest !== current.receiptDigest) {
            throw new DatabaseGenerationError(
              "CONTROL_STATE_CONFLICT",
              "committed generation changed while refreshing its compatible snapshot"
            );
          }
          const active = (await this.database.migrationJournals.toArray()).find(
            (journal) => journal.phase !== "committed" && journal.phase !== "failed"
          );
          if (active) {
            throw new DatabaseGenerationError(
              "MIGRATION_CONFLICT",
              `migration ${active.id} is pending; its source snapshot is frozen`
            );
          }
          await this.database.releaseState.put(candidate);
          return candidate;
        }
      );
    } finally {
      await this.releaseMigrationLease(lease);
    }
  }

  private async assertReleaseStateIntegrity(state: DatabaseGenerationReleaseState) {
    if (
      state.id !== CURRENT_RELEASE_STATE_ID ||
      state.protocolVersion !== DATABASE_GENERATION_CONTROL_PROTOCOL_VERSION
    ) {
      throw new DatabaseGenerationError(
        "CONTROL_STATE_CORRUPT",
        "committed generation state has an unsupported identity or protocol version"
      );
    }
    validateIdentity(
      {
        generation: state.committedGeneration,
        databaseName: state.committedDatabaseName,
        schemaVersion: state.committedSchema,
        buildId: state.committedBuild
      },
      "releaseState"
    );
    requireDigest(state.committedDigest, "releaseState.committedDigest");
    requireDigest(state.receiptDigest, "releaseState.receiptDigest");
    const { receiptDigest, ...unsigned } = state;
    const actual = await sha256Hex(buildDatabaseGenerationReceiptPayload(unsigned));
    if (actual !== receiptDigest) {
      throw new DatabaseGenerationError(
        "CONTROL_STATE_CORRUPT",
        "committed generation receipt digest does not match its state"
      );
    }
  }

  async acquireMigrationLease(
    ownerId: string,
    leaseDurationMs = DEFAULT_DATABASE_GENERATION_LEASE_DURATION_MS
  ): Promise<DatabaseGenerationLeaseHandle> {
    requireNonEmpty(ownerId, "ownerId");
    requireLeaseDuration(leaseDurationMs);
    const now = this.now();
    const timestamp = this.timestamp(now);

    return this.database.transaction("rw", this.database.migrationLeases, async () => {
      const existing = await this.database.migrationLeases.get(
        DATABASE_GENERATION_MIGRATION_LEASE_NAME
      );
      if (existing && existing.expiresAt > now && existing.ownerId !== ownerId) {
        throw new DatabaseGenerationError(
          "LEASE_HELD",
          `migration lease is held by ${existing.ownerId} until ${new Date(existing.expiresAt).toISOString()}`
        );
      }

      const sameLiveOwner =
        existing !== undefined && existing.expiresAt > now && existing.ownerId === ownerId;
      const lease: DatabaseGenerationMigrationLease = {
        name: DATABASE_GENERATION_MIGRATION_LEASE_NAME,
        ownerId,
        fencingToken: sameLiveOwner ? existing.fencingToken : (existing?.fencingToken ?? 0) + 1,
        acquiredAt: sameLiveOwner ? existing.acquiredAt : timestamp,
        renewedAt: timestamp,
        expiresAt: now + leaseDurationMs
      };
      await this.database.migrationLeases.put(lease);
      return lease;
    });
  }

  async renewMigrationLease(
    handle: DatabaseGenerationLeaseHandle,
    leaseDurationMs = DEFAULT_DATABASE_GENERATION_LEASE_DURATION_MS
  ): Promise<DatabaseGenerationLeaseHandle> {
    requireLeaseDuration(leaseDurationMs);
    const now = this.now();
    const timestamp = this.timestamp(now);

    return this.database.transaction("rw", this.database.migrationLeases, async () => {
      const current = await this.database.migrationLeases.get(handle.name);
      if (
        !current ||
        current.ownerId !== handle.ownerId ||
        current.fencingToken !== handle.fencingToken ||
        current.expiresAt <= now
      ) {
        throw new DatabaseGenerationError(
          "LEASE_LOST",
          `migration lease for ${handle.ownerId} is expired or fenced by another owner`
        );
      }
      const renewed: DatabaseGenerationMigrationLease = {
        ...current,
        renewedAt: timestamp,
        expiresAt: now + leaseDurationMs
      };
      await this.database.migrationLeases.put(renewed);
      return renewed;
    });
  }

  async releaseMigrationLease(handle: DatabaseGenerationLeaseHandle): Promise<boolean> {
    return this.database.transaction("rw", this.database.migrationLeases, async () => {
      const current = await this.database.migrationLeases.get(handle.name);
      if (
        !current ||
        current.ownerId !== handle.ownerId ||
        current.fencingToken !== handle.fencingToken
      ) {
        return false;
      }
      // Keep the row so the fencing token can never reset after a clean release.
      const now = this.now();
      await this.database.migrationLeases.put({
        ...current,
        renewedAt: this.timestamp(now),
        expiresAt: now
      });
      return true;
    });
  }

  private async requireLease(handle: DatabaseGenerationLeaseHandle) {
    const current = await this.database.migrationLeases.get(handle.name);
    const now = this.now();
    if (
      !current ||
      current.ownerId !== handle.ownerId ||
      current.fencingToken !== handle.fencingToken ||
      current.expiresAt <= now
    ) {
      throw new DatabaseGenerationError(
        "LEASE_LOST",
        `migration lease for ${handle.ownerId} is expired or fenced by another owner`
      );
    }
    return current;
  }

  private leaseSettings(options: DatabaseGenerationLeaseOptions) {
    requireNonEmpty(options.ownerId, "ownerId");
    const leaseDurationMs = requireLeaseDuration(
      options.leaseDurationMs ?? DEFAULT_DATABASE_GENERATION_LEASE_DURATION_MS
    );
    const heartbeatIntervalMs = requireHeartbeatInterval(
      options.heartbeatIntervalMs ?? Math.max(25, Math.floor(leaseDurationMs / 3)),
      leaseDurationMs
    );
    return { leaseDurationMs, heartbeatIntervalMs };
  }

  private async withLeaseHeartbeat<T>(
    initialLease: DatabaseGenerationLeaseHandle,
    leaseDurationMs: number,
    heartbeatIntervalMs: number,
    onRenewed: (lease: DatabaseGenerationLeaseHandle) => void,
    operation: (checkpoint: () => Promise<void>) => Promise<T>
  ): Promise<T> {
    let currentLease = initialLease;
    let renewalFailure: unknown = null;
    let renewalChain: Promise<void> = Promise.resolve();

    const checkpoint = async () => {
      const renewal = renewalChain.then(async () => {
        if (renewalFailure) throw renewalFailure;
        currentLease = await this.renewMigrationLease(currentLease, leaseDurationMs);
        onRenewed(currentLease);
      });
      renewalChain = renewal.catch((error: unknown) => {
        renewalFailure ??= error;
      });
      await renewal;
    };

    const timer =
      heartbeatIntervalMs === 0
        ? null
        : globalThis.setInterval(() => {
            void checkpoint().catch(() => undefined);
          }, heartbeatIntervalMs);

    let result: T | undefined;
    let operationFailure: unknown = null;
    try {
      result = await operation(checkpoint);
    } catch (error) {
      operationFailure = error;
    } finally {
      if (timer !== null) globalThis.clearInterval(timer);
    }

    await renewalChain;
    if (renewalFailure) throw renewalFailure;
    await checkpoint();
    if (operationFailure) throw operationFailure;
    return result as T;
  }

  async prepareMigration(
    input: PrepareDatabaseGenerationMigrationInput,
    options: DatabaseGenerationLeaseOptions
  ): Promise<DatabaseGenerationMigrationJournal> {
    validateSnapshot(input.source, "source");
    validateIdentity(input.target, "target");
    assertDifferentGenerations(input.source, input.target);
    const migrationId = input.migrationId ?? this.createId();
    requireSafeComponent(migrationId, "migrationId");
    const { leaseDurationMs } = this.leaseSettings(options);
    const lease = await this.acquireMigrationLease(options.ownerId, leaseDurationMs);

    try {
      const timestamp = this.timestamp();
      return await this.database.transaction(
        "rw",
        this.database.migrationJournals,
        this.database.releaseState,
        this.database.migrationLeases,
        async () => {
          await this.requireLease(lease);
          const existing = await this.database.migrationJournals.get(migrationId);
          if (existing) {
            assertJournalShape(existing);
            if (
              !sameSnapshot(existing.source, input.source) ||
              !sameIdentity(existing.target, input.target)
            ) {
              throw new DatabaseGenerationError(
                "MIGRATION_CONFLICT",
                `migration id ${migrationId} is already bound to different generations`
              );
            }
            return cloneJournal(existing);
          }

          const state = await this.database.releaseState.get(CURRENT_RELEASE_STATE_ID);
          if (!state || !stateMatchesSnapshot(state, input.source)) {
            throw new DatabaseGenerationError(
              "CONTROL_STATE_CONFLICT",
              "prepared migration source does not match the committed generation"
            );
          }

          const journals = await this.database.migrationJournals.toArray();
          journals.forEach(assertJournalShape);
          const conflictingTargetLineage = journals.find((journal) => (
            journal.target.databaseName === input.target.databaseName &&
            (
              journal.target.generation !== input.target.generation ||
              journal.target.schemaVersion !== input.target.schemaVersion ||
              journal.source.generation !== input.source.generation ||
              journal.source.databaseName !== input.source.databaseName ||
              journal.source.schemaVersion !== input.source.schemaVersion
            )
          ));
          if (conflictingTargetLineage) {
            throw new DatabaseGenerationError(
              "MIGRATION_CONFLICT",
              `target database ${input.target.databaseName} is already bound to incompatible migration lineage ${conflictingTargetLineage.id}`
            );
          }
          const unisolatedFailedTarget = journals.find((journal) => (
            journal.phase === "failed" &&
            journal.target.databaseName === input.target.databaseName &&
            journal.failure?.targetIsolation !== "complete"
          ));
          if (unisolatedFailedTarget) {
            throw new DatabaseGenerationError(
              "TARGET_ISOLATION_INCOMPLETE",
              `failed migration ${unisolatedFailedTarget.id} has not isolated target database ${input.target.databaseName}`
            );
          }
          const active = journals.find(
            (journal) => journal.phase !== "committed" && journal.phase !== "failed"
          );
          if (active) {
            throw new DatabaseGenerationError(
              "MIGRATION_CONFLICT",
              `migration ${active.id} is already pending`
            );
          }

          const journal: DatabaseGenerationMigrationJournal = {
            id: migrationId,
            protocolVersion: DATABASE_GENERATION_CONTROL_PROTOCOL_VERSION,
            source: structuredClone(input.source),
            target: structuredClone(input.target),
            phase: "prepared",
            targetDigest: null,
            verifiedDigest: null,
            receiptDigest: null,
            attemptCount: 0,
            lastOwnerId: lease.ownerId,
            lastFencingToken: lease.fencingToken,
            failure: null,
            history: [
              {
                phase: "prepared",
                at: timestamp,
                ownerId: lease.ownerId,
                fencingToken: lease.fencingToken
              }
            ],
            createdAt: timestamp,
            updatedAt: timestamp
          };
          await this.database.migrationJournals.add(journal);
          return cloneJournal(journal);
        }
      );
    } finally {
      await this.releaseMigrationLease(lease);
    }
  }

  async readMigration(
    migrationId: string
  ): Promise<DatabaseGenerationMigrationJournal | null> {
    const journal = (await this.database.migrationJournals.get(migrationId)) ?? null;
    if (journal) assertJournalShape(journal);
    return journal ? cloneJournal(journal) : null;
  }

  async listMigrations(): Promise<DatabaseGenerationMigrationJournal[]> {
    const journals = await this.database.migrationJournals.orderBy("createdAt").toArray();
    journals.forEach(assertJournalShape);
    return journals.map(cloneJournal);
  }

  private async transitionJournal(
    migrationId: string,
    lease: DatabaseGenerationLeaseHandle,
    nextPhase: DatabaseGenerationMigrationPhase,
    mutate?: (journal: DatabaseGenerationMigrationJournal) => void
  ): Promise<DatabaseGenerationMigrationJournal> {
    return this.database.transaction(
      "rw",
      this.database.migrationJournals,
      this.database.migrationLeases,
      async () => {
        await this.requireLease(lease);
        const journal = await this.database.migrationJournals.get(migrationId);
        if (!journal) {
          throw new DatabaseGenerationError(
            "MIGRATION_NOT_FOUND",
            `migration ${migrationId} does not exist`
          );
        }
        assertJournalShape(journal);
        if (PHASE_RANK[nextPhase] < PHASE_RANK[journal.phase]) {
          throw new DatabaseGenerationError(
            "MIGRATION_PHASE_CONFLICT",
            `migration ${migrationId} cannot move from ${journal.phase} back to ${nextPhase}`
          );
        }
        if (
          (journal.phase === "committed" || journal.phase === "failed") &&
          nextPhase !== journal.phase
        ) {
          throw new DatabaseGenerationError(
            "MIGRATION_PHASE_CONFLICT",
            `migration ${migrationId} is terminal in phase ${journal.phase}`
          );
        }
        const timestamp = this.timestamp();
        journal.phase = nextPhase;
        journal.lastOwnerId = lease.ownerId;
        journal.lastFencingToken = lease.fencingToken;
        journal.updatedAt = timestamp;
        mutate?.(journal);
        journal.history.push({
          phase: nextPhase,
          at: timestamp,
          ownerId: lease.ownerId,
          fencingToken: lease.fencingToken
        });
        assertJournalShape(journal);
        await this.database.migrationJournals.put(journal);
        return cloneJournal(journal);
      }
    );
  }

  private callbackContext(
    journal: DatabaseGenerationMigrationJournal,
    lease: DatabaseGenerationLeaseHandle,
    checkpoint: () => Promise<void>
  ): DatabaseGenerationMigrationCallbackContext {
    return {
      migration: cloneJournal(journal),
      ownerId: lease.ownerId,
      fencingToken: lease.fencingToken,
      checkpoint
    };
  }

  private async ensureSourceIsStillCommitted(journal: DatabaseGenerationMigrationJournal) {
    const state = await this.readCommittedGeneration();
    if (!state || !stateMatchesSnapshot(state, journal.source)) {
      throw new DatabaseGenerationError(
        "CONTROL_STATE_CONFLICT",
        `migration ${journal.id} source is no longer the committed generation`
      );
    }
  }

  async resumeMigrationToReady(
    migrationId: string,
    callbacks: DatabaseGenerationMigrationCallbacks,
    options: DatabaseGenerationLeaseOptions
  ): Promise<DatabaseGenerationMigrationJournal> {
    const { leaseDurationMs, heartbeatIntervalMs } = this.leaseSettings(options);
    let lease = await this.acquireMigrationLease(options.ownerId, leaseDurationMs);
    const updateLease = (renewed: DatabaseGenerationLeaseHandle) => {
      lease = renewed;
    };

    try {
      let journal = await this.readMigration(migrationId);
      if (!journal) {
        throw new DatabaseGenerationError(
          "MIGRATION_NOT_FOUND",
          `migration ${migrationId} does not exist`
        );
      }
      if (journal.phase === "failed") {
        throw new DatabaseGenerationError(
          "MIGRATION_FAILED",
          `migration ${migrationId} is failed and cannot be resumed`
        );
      }
      if (journal.phase === "ready" || journal.phase === "committed") return journal;
      await this.ensureSourceIsStillCommitted(journal);

      try {
        if (journal.phase === "prepared" || journal.phase === "materializing") {
          journal = await this.transitionJournal(
            migrationId,
            lease,
            "materializing",
            (next) => {
              next.attemptCount += 1;
            }
          );
          const materialized = await this.withLeaseHeartbeat(
            lease,
            leaseDurationMs,
            heartbeatIntervalMs,
            updateLease,
            (checkpoint) =>
              callbacks.materializeTarget(this.callbackContext(journal!, lease, checkpoint))
          );
          requireDigest(materialized.targetDigest, "materializeTarget.targetDigest");
          journal = await this.transitionJournal(migrationId, lease, "verifying", (next) => {
            next.targetDigest = materialized.targetDigest;
          });
        }

        if (journal.phase === "verifying") {
          if (!journal.targetDigest) {
            throw new DatabaseGenerationError(
              "CONTROL_STATE_CORRUPT",
              `migration ${migrationId} reached verifying without a target digest`
            );
          }
          const targetDigest = journal.targetDigest;
          const verified = await this.withLeaseHeartbeat(
            lease,
            leaseDurationMs,
            heartbeatIntervalMs,
            updateLease,
            (checkpoint) =>
              callbacks.verifyTarget({
                ...this.callbackContext(journal!, lease, checkpoint),
                targetDigest
              })
          );
          requireDigest(verified.verifiedDigest, "verifyTarget.verifiedDigest");
          if (verified.verifiedDigest !== targetDigest) {
            throw new DatabaseGenerationError(
              "DIGEST_MISMATCH",
              `verified target digest does not match materialized target for migration ${migrationId}`
            );
          }
          journal = await this.transitionJournal(migrationId, lease, "ready", (next) => {
            next.verifiedDigest = verified.verifiedDigest;
          });
        }
        return journal;
      } catch (error) {
        if (isLeaseError(error)) throw error;
        try {
          await this.isolateFailureWithLease(migrationId, error, callbacks.discardTarget, lease, {
            leaseDurationMs,
            heartbeatIntervalMs,
            updateLease
          });
        } catch (isolationError) {
          if (isLeaseError(isolationError)) throw isolationError;
        }
        throw new DatabaseGenerationError(
          "MIGRATION_FAILED",
          `migration ${migrationId} failed before commit: ${errorMessage(error)}`,
          { cause: error }
        );
      }
    } finally {
      await this.releaseMigrationLease(lease);
    }
  }

  private async isolateFailureWithLease(
    migrationId: string,
    cause: unknown,
    discardTarget: DatabaseGenerationMigrationCallbacks["discardTarget"],
    lease: DatabaseGenerationLeaseHandle,
    settings: {
      leaseDurationMs: number;
      heartbeatIntervalMs: number;
      updateLease: (lease: DatabaseGenerationLeaseHandle) => void;
    }
  ): Promise<DatabaseGenerationMigrationJournal> {
    const failedAt = this.timestamp();
    let journal = await this.transitionJournal(migrationId, lease, "failed", (next) => {
      next.failure = {
        code: errorCode(cause),
        message: errorMessage(cause),
        failedAt,
        targetIsolation: discardTarget ? "pending" : "not_requested",
        isolationError: null
      };
    });

    if (!discardTarget || !journal.failure) return journal;
    const failure = structuredClone(journal.failure);
    try {
      await this.withLeaseHeartbeat(
        lease,
        settings.leaseDurationMs,
        settings.heartbeatIntervalMs,
        settings.updateLease,
        (checkpoint) =>
          discardTarget({ ...this.callbackContext(journal, lease, checkpoint), failure })
      );
      journal = await this.transitionJournal(migrationId, lease, "failed", (next) => {
        if (!next.failure) return;
        next.failure.targetIsolation = "complete";
        next.failure.isolationError = null;
      });
    } catch (error) {
      if (isLeaseError(error)) throw error;
      journal = await this.transitionJournal(migrationId, lease, "failed", (next) => {
        if (!next.failure) return;
        next.failure.targetIsolation = "failed";
        next.failure.isolationError = errorMessage(error);
      });
    }
    return journal;
  }

  async failMigration(
    migrationId: string,
    cause: unknown,
    options: DatabaseGenerationLeaseOptions,
    discardTarget?: DatabaseGenerationMigrationCallbacks["discardTarget"]
  ): Promise<DatabaseGenerationMigrationJournal> {
    const { leaseDurationMs, heartbeatIntervalMs } = this.leaseSettings(options);
    let lease = await this.acquireMigrationLease(options.ownerId, leaseDurationMs);
    const updateLease = (renewed: DatabaseGenerationLeaseHandle) => {
      lease = renewed;
    };
    try {
      const journal = await this.readMigration(migrationId);
      if (!journal) {
        throw new DatabaseGenerationError(
          "MIGRATION_NOT_FOUND",
          `migration ${migrationId} does not exist`
        );
      }
      if (journal.phase === "committed") {
        throw new DatabaseGenerationError(
          "MIGRATION_PHASE_CONFLICT",
          `committed migration ${migrationId} cannot be failed`
        );
      }
      if (journal.phase === "failed") {
        if (
          !discardTarget ||
          !journal.failure ||
          journal.failure.targetIsolation === "complete"
        ) {
          return journal;
        }
        return await this.retryTargetIsolationWithLease(
          journal,
          discardTarget,
          lease,
          { leaseDurationMs, heartbeatIntervalMs, updateLease }
        );
      }
      return await this.isolateFailureWithLease(migrationId, cause, discardTarget, lease, {
        leaseDurationMs,
        heartbeatIntervalMs,
        updateLease
      });
    } finally {
      await this.releaseMigrationLease(lease);
    }
  }

  private async retryTargetIsolationWithLease(
    journal: DatabaseGenerationMigrationJournal,
    discardTarget: NonNullable<DatabaseGenerationMigrationCallbacks["discardTarget"]>,
    lease: DatabaseGenerationLeaseHandle,
    settings: {
      leaseDurationMs: number;
      heartbeatIntervalMs: number;
      updateLease: (lease: DatabaseGenerationLeaseHandle) => void;
    }
  ): Promise<DatabaseGenerationMigrationJournal> {
    if (!journal.failure) {
      throw new DatabaseGenerationError(
        "MIGRATION_PHASE_CONFLICT",
        `migration ${journal.id} has no failed target to isolate`
      );
    }
    const failure = structuredClone(journal.failure);
    try {
      await this.withLeaseHeartbeat(
        lease,
        settings.leaseDurationMs,
        settings.heartbeatIntervalMs,
        settings.updateLease,
        (checkpoint) =>
          discardTarget({ ...this.callbackContext(journal, lease, checkpoint), failure })
      );
      return this.transitionJournal(journal.id, lease, "failed", (next) => {
        if (!next.failure) return;
        next.failure.targetIsolation = "complete";
        next.failure.isolationError = null;
      });
    } catch (error) {
      if (isLeaseError(error)) throw error;
      return this.transitionJournal(journal.id, lease, "failed", (next) => {
        if (!next.failure) return;
        next.failure.targetIsolation = "failed";
        next.failure.isolationError = errorMessage(error);
      });
    }
  }

  async retryFailedTargetIsolation(
    migrationId: string,
    discardTarget: NonNullable<DatabaseGenerationMigrationCallbacks["discardTarget"]>,
    options: DatabaseGenerationLeaseOptions
  ): Promise<DatabaseGenerationMigrationJournal> {
    const { leaseDurationMs, heartbeatIntervalMs } = this.leaseSettings(options);
    let lease = await this.acquireMigrationLease(options.ownerId, leaseDurationMs);
    const updateLease = (renewed: DatabaseGenerationLeaseHandle) => {
      lease = renewed;
    };
    try {
      let journal = await this.readMigration(migrationId);
      if (!journal) {
        throw new DatabaseGenerationError(
          "MIGRATION_NOT_FOUND",
          `migration ${migrationId} does not exist`
        );
      }
      if (journal.phase !== "failed" || !journal.failure) {
        throw new DatabaseGenerationError(
          "MIGRATION_PHASE_CONFLICT",
          `migration ${migrationId} is not a failed target awaiting isolation`
        );
      }
      if (journal.failure.targetIsolation === "complete") return journal;
      return await this.retryTargetIsolationWithLease(journal, discardTarget, lease, {
        leaseDurationMs,
        heartbeatIntervalMs,
        updateLease
      });
    } finally {
      await this.releaseMigrationLease(lease);
    }
  }

  async recoverLatestMigrationToReady(
    callbacks: DatabaseGenerationMigrationCallbacks,
    options: DatabaseGenerationLeaseOptions
  ): Promise<DatabaseGenerationMigrationJournal | null> {
    const journals = await this.listMigrations();
    const pending = journals
      .filter((journal) => journal.phase !== "committed" && journal.phase !== "failed")
      .at(-1);
    if (!pending) return null;
    return this.resumeMigrationToReady(pending.id, callbacks, options);
  }

  async commitMigration(
    migrationId: string,
    options: DatabaseGenerationLeaseOptions
  ): Promise<DatabaseGenerationMigrationJournal> {
    const { leaseDurationMs } = this.leaseSettings(options);
    const lease = await this.acquireMigrationLease(options.ownerId, leaseDurationMs);
    try {
      const journal = await this.readMigration(migrationId);
      if (!journal) {
        throw new DatabaseGenerationError(
          "MIGRATION_NOT_FOUND",
          `migration ${migrationId} does not exist`
        );
      }
      if (journal.phase === "committed") {
        const state = await this.readCommittedGeneration();
        if (!state || state.migrationId !== migrationId) {
          throw new DatabaseGenerationError(
            "CONTROL_STATE_CORRUPT",
            `migration ${migrationId} is committed but is not the current release state`
          );
        }
        return journal;
      }
      if (journal.phase !== "ready" || !journal.verifiedDigest) {
        throw new DatabaseGenerationError(
          "MIGRATION_PHASE_CONFLICT",
          `migration ${migrationId} must be verified and ready before commit`
        );
      }
      await this.ensureSourceIsStillCommitted(journal);

      const timestamp = this.timestamp();
      const targetSnapshot: DatabaseGenerationSnapshot = {
        ...journal.target,
        digest: journal.verifiedDigest
      };
      const nextState = await createReleaseState(targetSnapshot, migrationId, timestamp);

      return this.database.transaction(
        "rw",
        this.database.migrationJournals,
        this.database.releaseState,
        this.database.migrationLeases,
        async () => {
          await this.requireLease(lease);
          const currentJournal = await this.database.migrationJournals.get(migrationId);
          const currentState = await this.database.releaseState.get(CURRENT_RELEASE_STATE_ID);
          if (!currentJournal || currentJournal.phase !== "ready") {
            throw new DatabaseGenerationError(
              "MIGRATION_PHASE_CONFLICT",
              `migration ${migrationId} changed before commit`
            );
          }
          if (!currentState || !stateMatchesSnapshot(currentState, currentJournal.source)) {
            throw new DatabaseGenerationError(
              "CONTROL_STATE_CONFLICT",
              `migration ${migrationId} source changed before commit`
            );
          }
          const updated = cloneJournal(currentJournal);
          updated.phase = "committed";
          updated.receiptDigest = nextState.receiptDigest;
          updated.lastOwnerId = lease.ownerId;
          updated.lastFencingToken = lease.fencingToken;
          updated.updatedAt = timestamp;
          updated.history.push({
            phase: "committed",
            at: timestamp,
            ownerId: lease.ownerId,
            fencingToken: lease.fencingToken
          });
          assertJournalShape(updated);
          await this.database.releaseState.put(nextState);
          await this.database.migrationJournals.put(updated);
          return updated;
        }
      );
    } finally {
      await this.releaseMigrationLease(lease);
    }
  }
}
