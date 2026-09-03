import {
  ACTIVE_RULE_PACK_RECORD_ID,
  BIRTH_FINGERPRINT_VERSION,
  EVENT_RECORD_VERSION,
  EVENT_TIME_MIGRATION_RECEIPT_RECORD_VERSION,
  EVENT_TIME_MIGRATION_SNAPSHOT_FORMAT_VERSION,
  LOCAL_APP_SETTINGS_ID,
  LOCAL_APP_SETTINGS_RECORD_VERSION,
  LOCAL_ATTACHMENT_RECORD_VERSION,
  LOCAL_RESEARCHER_PROFILE_ID,
  LOCAL_RESEARCHER_PROFILE_RECORD_VERSION,
  MAX_LOCAL_ATTACHMENT_BYTES,
  RESEARCH_SUBJECT_RECORD_VERSION,
  SAVED_VIEW_RECORD_VERSION,
  SCHEMA_VERSION,
  TZDB_MIGRATION_RECEIPT_RECORD_VERSION,
  birthInputSchema,
  buildBirthFingerprintPayload,
  candidateSetRecordSchema,
  caseRecordSchema,
  citationRecordSchema,
  eventRecordSchema,
  eventTimeMigrationReceiptSchema,
  storedEventRecordSchema,
  storedEventTimeMigrationReceiptSchema,
  storedEventTimeMigrationSnapshotSchema,
  formalComparisonRequestSchema,
  formalComparisonSourceSchema,
  fullBackupPayloadSchema,
  knowledgeDocumentRecordSchema,
  localAppSettingsRecordSchema,
  localAttachmentRecordSchema,
  localRuleRegistryRecordSchema,
  localResearcherProfileRecordSchema,
  pairStructureResearchRequestSchema,
  migrateLegacyEventRecordV1,
  migrateLegacySavedViewRecordV1,
  researchQuerySchema,
  researchNoteRecordSchema,
  revisionRecordSchema,
  savedViewRecordSchema,
  sourceRightsRecordSchema,
  storedBirthInputSchema,
  storedUnknownHourCandidateResultSchema,
  tzdbMigrationReceiptSchema,
  unknownHourCandidateResultSchema,
  type CalculatedChart,
  type CandidateSetRecord,
  type CaseBundle,
  type CaseRecord,
  type CitationLocator,
  type CitationRecord,
  type CitationTarget,
  type CoreBackupPayload,
  type DstDisambiguationPolicy,
  type EventRecord,
  type EventTimeMigrationInterpretation,
  type EventTimeMigrationReceipt,
  type EventTimeMigrationSnapshot,
  type FullBackupPayload,
  type FormalComparisonRequest,
  type FormalComparisonSource,
  type KnowledgeDocumentRecord,
  type ActiveRulePackRecord,
  type InstalledRulePackRecord,
  type LocalAppSettingsRecord,
  type LocalAttachmentLink,
  type LocalAttachmentRecord,
  type LocalRuleRegistryRecord,
  type LocalResearcherProfileRecord,
  type PairStructureResearchRequest,
  type LegacyEventRecordV1,
  type LegacySavedViewRecordV1,
  transitNodeRefSchema,
  type AnyTransitNodeRef,
  type BirthInput,
  type ResearchNoteAnchor,
  type ResearchNoteRecord,
  type ResearchQuery,
  type ResearchSubjectRecord,
  type ReadySavedViewRecord,
  type SavedViewRecord,
  type SourceRightsRecord,
  type TransitNodeRef,
  type TzdbMigrationReceipt,
  type UnknownHourCandidateResult,
  type RevisionRecord
} from "@hakimi/contracts";
import {
  verifyCalculatedChartIntegrity,
  verifyCandidateSetRecordIntegrity,
  verifyUnknownHourCandidateResultIntegrity,
  verifyRevisionRecordIntegrity,
  verifyRevisionSnapshotIntegrity
} from "@hakimi/chart-integrity";
export {
  CalculatedChartIntegrityError,
  CandidateSetIntegrityError,
  verifyCalculatedChartIntegrity,
  verifyCandidateSetRecordIntegrity,
  verifyUnknownHourCandidateResultIntegrity,
  verifyRevisionRecordIntegrity,
  verifyRevisionSnapshotIntegrity
} from "@hakimi/chart-integrity";
import {
  decodeCanonicalBase64,
  encodeCanonicalBase64,
  sha256BytesHex,
  sha256Hex
} from "@hakimi/integrity";
import {
  KnowledgeIntegrityError,
  MAX_KNOWLEDGE_DOCUMENT_BYTES,
  KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_LIMITS,
  buildKnowledgeCitationSetConflictInventory,
  buildKnowledgeSourceAwareRetrievalPacket,
  buildKnowledgeContentSnapshot,
  createKnowledgeDocumentCitationIntegrityVerifier,
  extractKnowledgeQuote,
  isReservedSingleChartReportEvidenceSubjectId,
  isSingleChartReportEvidenceSubjectId,
  requireEvidenceSubject,
  searchKnowledgeDocuments,
  verifyCitationIntegrity,
  verifyKnowledgeDocumentIntegrity,
  type BuildKnowledgeSourceAwareRetrievalPacketInput,
  type KnowledgeCitationSetConflictInventory,
  type KnowledgeSearchHit,
  type KnowledgeSourceAwareRetrievalPacket
} from "@hakimi/knowledge-core";
import { resolveTransitNodeRef } from "@hakimi/transit-core";
import {
  classifyStoredTimeZoneDatabase,
  classifyStoredTimeZoneDatabaseForReplay,
  RUNTIME_TZDB_VERSION,
  resolveEventTimeContext,
  verifyEventTimeContext,
  verifyStoredEventTimeContextWithBundledArtifact,
  type EventTimeContextVerificationStatus
} from "@hakimi/time-core";
import type {
  RevisionCalculationReceipt,
  RevisionDerivedReplayRequest
} from "@hakimi/revision-replay";
import Dexie, {
  type DBCore,
  type DBCoreTransaction,
  type EntityTable,
  type Transaction
} from "dexie";
import {
  CoreDataIdentityConflictError,
  CoreDataReplaceBlockedError,
  FullDataIdentityConflictError,
  FullDataReplaceConflictError,
  buildCandidateSetTzdbComparison,
  buildLegacyCandidateSetTzdbComparison,
  type DependentDataCounts
} from "./worker-safe";
import {
  LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_ENCODED_CHARACTERS,
  LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHED_BYTES,
  LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHES,
  LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_SCAN_ROWS,
  LocalAttachmentPurposeMetadataSnapshotLimitError,
  assertExactUnlinkedAttachmentCreateCapacity,
  assertLocalAttachmentPurposeCapacityTotals,
  type LocalAttachmentPurposeMetadataSnapshotLimitCode
} from "./local-attachment-purpose-capacity";

export {
  LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_ENCODED_CHARACTERS,
  LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHED_BYTES,
  LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHES,
  LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_SCAN_ROWS,
  LocalAttachmentPurposeMetadataSnapshotLimitError,
  type LocalAttachmentPurposeMetadataSnapshotLimitCode
} from "./local-attachment-purpose-capacity";

export * from "./database-generation";
export {
  CoreDataIdentityConflictError,
  CoreDataReplaceBlockedError,
  FullDataIdentityConflictError,
  FullDataReplaceConflictError,
  buildCandidateSetTzdbComparison,
  buildLegacyCandidateSetTzdbComparison,
  type DependentDataCounts
} from "./worker-safe";

/** Production callers must supply a runtime release manifest; storage has no implicit default Schema. */
export const RESEARCH_DATABASE_MAX_SCHEMA_VERSION = 16 as const;
export const RESEARCH_DATABASE_LEGACY_NAME = "hakimi-bazi-research" as const;
export const RESEARCH_DATABASE_MUTATION_STATE_STORE = "mutationState" as const;
export const RESEARCH_DATABASE_MUTATION_STATE_ID = "current" as const;
export const RESEARCH_DATABASE_MUTATION_STATE_PROTOCOL_VERSION = 1 as const;

export type ResearchDatabaseMutationState = Readonly<{
  id: typeof RESEARCH_DATABASE_MUTATION_STATE_ID;
  protocolVersion: typeof RESEARCH_DATABASE_MUTATION_STATE_PROTOCOL_VERSION;
  /** Monotonic per committed readwrite transaction, not per row mutation. */
  epoch: number;
  /** A prior verified marker remains as evidence but is clean only while it equals epoch. */
  verifiedEpoch: number | null;
  verifiedPayloadDigest: string | null;
  /**
   * Opaque verifier identity persisted for the Web coordinator. The Web value
   * must bind database generation, schema version, application build, and
   * verifier implementation/version; storage validates only canonical shape.
   */
  verifiedContractVersion: string | null;
  verifiedAt: string | null;
}>;

export type MarkResearchDatabaseMutationStateVerifiedInput = Readonly<{
  expectedEpoch: number;
  payloadDigest: string;
  /**
   * Web-owned identity binding generation/schema/build/verifier. Changing any
   * one of those inputs must produce a different contractVersion.
   */
  contractVersion: string;
  verifiedAt: string;
}>;

export type FullDataSnapshotWithMutationState = Readonly<{
  payload: FullBackupPayload;
  /** An empty v16 store is the canonical pre-mutation epoch zero. */
  epoch: number;
  mutationState: ResearchDatabaseMutationState | null;
}>;

export type LocalDataPartitionCounts = Readonly<{
  cases: number;
  revisions: number;
  candidateSets: number;
  researchNotes: number;
  events: number;
  savedViews: number;
  knowledgeDocuments: number;
  citations: number;
  sourceRights: number;
  researcherProfiles: number;
  appSettings: number;
  attachments: number;
  ruleRegistry: number;
  tzdbMigrationReceipts: number;
  eventTimeMigrationReceipts: number;
  revisionCalculationReceipts: number;
}>;

export type LocalDataOverview = Readonly<{
  counts: LocalDataPartitionCounts;
}>;

/**
 * Storage-owned projection consumed by the research-query adapter. It omits
 * every local partition that cannot affect research-query execution.
 */
export type ResearchQueryStorageSnapshot = Readonly<{
  cases: readonly CaseRecord[];
  revisions: readonly RevisionRecord[];
  candidateSets: readonly CandidateSetRecord[];
  researchNotes: readonly ResearchNoteRecord[];
  events: readonly EventRecord[];
  knowledgeDocuments: readonly KnowledgeDocumentRecord[];
  revisionCalculationReceiptLedgerStatus: "available" | "schema_unavailable";
  revisionCalculationReceipts: readonly RevisionCalculationReceipt[];
}>;

export type ReadResearchQuerySnapshotOptions = Readonly<{
  signal?: AbortSignal;
}>;

type RevisionReplayModule = typeof import("@hakimi/revision-replay");
let revisionReplayModulePromise: Promise<RevisionReplayModule> | null = null;

/** Receipt engines stay outside the default v13/v14 startup graph. */
function loadRevisionReplayModule(): Promise<RevisionReplayModule> {
  revisionReplayModulePromise ??= import("@hakimi/revision-replay");
  return revisionReplayModulePromise;
}

export type ReleaseControllerTakeoverWriteFence = {
  readonly kind: "release_controller_takeover_write_fence_v1";
  readonly locked: boolean;
};

export type ResearchDatabaseRuntimeConfiguration = {
  databaseName: string;
  targetSchema: number;
  releaseWritesLocked: boolean;
  controllerTakeoverWriteFence?: ReleaseControllerTakeoverWriteFence;
};

declare global {
  // Installed synchronously by the Web entry before any lazy route imports this package.
  // Other platforms may instead construct ResearchDatabase with explicit options.
  var __HAKIMI_RESEARCH_DATABASE_RUNTIME__: ResearchDatabaseRuntimeConfiguration | undefined;
}

export class ResearchDatabaseRuntimeConfigurationError extends Error {
  readonly code = "RUNTIME_CONFIGURATION_REQUIRED" as const;

  constructor(message = "ResearchDatabase 需要显式 targetSchema 或已安装的运行时代际配置。") {
    super(message);
    this.name = "ResearchDatabaseRuntimeConfigurationError";
  }
}

function isReleaseControllerTakeoverWriteFence(
  value: unknown
): value is ReleaseControllerTakeoverWriteFence {
  try {
    if (value === undefined) return true;
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    const record = value as Record<string, unknown>;
    return (
      Object.getPrototypeOf(value) === Object.prototype &&
      Object.keys(record).sort().join(",") === "kind,locked" &&
      record.kind === "release_controller_takeover_write_fence_v1" &&
      typeof record.locked === "boolean"
    );
  } catch {
    return false;
  }
}

function releaseControllerTakeoverWriteFenceIsLocked(
  fence: ReleaseControllerTakeoverWriteFence
): boolean {
  try {
    // Corruption is fail-closed after construction: only the exact branded
    // facade reporting literal false is an open fence.
    return (
      fence.kind !== "release_controller_takeover_write_fence_v1" ||
      fence.locked !== false
    );
  } catch {
    return true;
  }
}

function configuredResearchDatabaseRuntime(): ResearchDatabaseRuntimeConfiguration | undefined {
  const configured = globalThis.__HAKIMI_RESEARCH_DATABASE_RUNTIME__;
  if (!configured) return undefined;
  if (
    typeof configured.databaseName !== "string" ||
    !/^[a-z0-9][a-z0-9._-]{0,127}$/iu.test(configured.databaseName) ||
    !Number.isSafeInteger(configured.targetSchema) ||
    configured.targetSchema < 1 ||
    configured.targetSchema > RESEARCH_DATABASE_MAX_SCHEMA_VERSION ||
    typeof configured.releaseWritesLocked !== "boolean" ||
    !isReleaseControllerTakeoverWriteFence(configured.controllerTakeoverWriteFence)
  ) {
    throw new Error("ResearchDatabase 运行时代际配置无效。");
  }
  return configured;
}

export class ReleaseDatabaseWriteLockedError extends Error {
  constructor() {
    super("当前数据库代际尚未完成发布确认，写入已锁定。");
    this.name = "ReleaseDatabaseWriteLockedError";
  }
}

export type ResearchDatabaseMutationStateErrorCode =
  | "SCHEMA_UNSUPPORTED"
  | "STATE_CORRUPT"
  | "EPOCH_EXHAUSTED"
  | "INVALID_VERIFICATION";

export class ResearchDatabaseMutationStateError extends Error {
  constructor(
    readonly code: ResearchDatabaseMutationStateErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "ResearchDatabaseMutationStateError";
  }
}

const MUTATION_STATE_KEYS = [
  "epoch",
  "id",
  "protocolVersion",
  "verifiedAt",
  "verifiedContractVersion",
  "verifiedEpoch",
  "verifiedPayloadDigest"
] as const;
const LOWERCASE_SHA256 = /^[a-f0-9]{64}$/u;

function hasExactMutationStateKeys(input: Record<string, unknown>): boolean {
  const keys = Object.keys(input).sort();
  return keys.length === MUTATION_STATE_KEYS.length &&
    keys.every((key, index) => key === MUTATION_STATE_KEYS[index]);
}

function isCanonicalIsoInstant(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const epoch = Date.parse(value);
  return Number.isFinite(epoch) && new Date(epoch).toISOString() === value;
}

function parseResearchDatabaseMutationState(input: unknown): ResearchDatabaseMutationState {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    !hasExactMutationStateKeys(input as Record<string, unknown>)
  ) {
    throw new ResearchDatabaseMutationStateError(
      "STATE_CORRUPT",
      "Research database mutation state has an invalid record shape."
    );
  }
  const record = input as Record<string, unknown>;
  if (
    record.id !== RESEARCH_DATABASE_MUTATION_STATE_ID ||
    record.protocolVersion !== RESEARCH_DATABASE_MUTATION_STATE_PROTOCOL_VERSION ||
    !Number.isSafeInteger(record.epoch) ||
    Number(record.epoch) < 0
  ) {
    throw new ResearchDatabaseMutationStateError(
      "STATE_CORRUPT",
      "Research database mutation state has an invalid identity or epoch."
    );
  }

  const markerValues = [
    record.verifiedEpoch,
    record.verifiedPayloadDigest,
    record.verifiedContractVersion,
    record.verifiedAt
  ];
  const markerIsEmpty = markerValues.every((value) => value === null);
  const markerIsComplete =
    Number.isSafeInteger(record.verifiedEpoch) &&
    Number(record.verifiedEpoch) >= 0 &&
    Number(record.verifiedEpoch) <= Number(record.epoch) &&
    typeof record.verifiedPayloadDigest === "string" &&
    LOWERCASE_SHA256.test(record.verifiedPayloadDigest) &&
    typeof record.verifiedContractVersion === "string" &&
    record.verifiedContractVersion.length > 0 &&
    record.verifiedContractVersion.length <= 256 &&
    record.verifiedContractVersion.trim() === record.verifiedContractVersion &&
    isCanonicalIsoInstant(record.verifiedAt);
  if (!markerIsEmpty && !markerIsComplete) {
    throw new ResearchDatabaseMutationStateError(
      "STATE_CORRUPT",
      "Research database mutation state has a partial or invalid verification marker."
    );
  }
  return structuredClone(record) as ResearchDatabaseMutationState;
}

function emptyResearchDatabaseMutationState(epoch: number): ResearchDatabaseMutationState {
  return {
    id: RESEARCH_DATABASE_MUTATION_STATE_ID,
    protocolVersion: RESEARCH_DATABASE_MUTATION_STATE_PROTOCOL_VERSION,
    epoch,
    verifiedEpoch: null,
    verifiedPayloadDigest: null,
    verifiedContractVersion: null,
    verifiedAt: null
  };
}

function nextResearchDatabaseMutationState(input: unknown): ResearchDatabaseMutationState {
  const current = input === undefined
    ? emptyResearchDatabaseMutationState(0)
    : parseResearchDatabaseMutationState(input);
  if (current.epoch >= Number.MAX_SAFE_INTEGER) {
    throw new ResearchDatabaseMutationStateError(
      "EPOCH_EXHAUSTED",
      "Research database mutation epoch cannot be incremented safely."
    );
  }
  return { ...current, epoch: current.epoch + 1 };
}

async function readStrictResearchDatabaseMutationState(
  table: EntityTable<ResearchDatabaseMutationState, "id">
): Promise<ResearchDatabaseMutationState | null> {
  const [count, raw] = await Promise.all([
    table.count(),
    table.get(RESEARCH_DATABASE_MUTATION_STATE_ID)
  ]);
  if (count === 0) return null;
  if (count !== 1 || raw === undefined) {
    throw new ResearchDatabaseMutationStateError(
      "STATE_CORRUPT",
      "Research database mutation state must contain exactly one canonical record."
    );
  }
  return parseResearchDatabaseMutationState(raw);
}

function validateMutationVerificationInput(
  input: MarkResearchDatabaseMutationStateVerifiedInput
): MarkResearchDatabaseMutationStateVerifiedInput {
  if (!Number.isSafeInteger(input.expectedEpoch) || input.expectedEpoch < 0) {
    throw new ResearchDatabaseMutationStateError(
      "INVALID_VERIFICATION",
      "Expected mutation epoch must be a non-negative safe integer."
    );
  }
  if (!LOWERCASE_SHA256.test(input.payloadDigest)) {
    throw new ResearchDatabaseMutationStateError(
      "INVALID_VERIFICATION",
      "Verified payload digest must be a lowercase SHA-256 digest."
    );
  }
  if (
    typeof input.contractVersion !== "string" ||
    input.contractVersion.length === 0 ||
    input.contractVersion.length > 256 ||
    input.contractVersion.trim() !== input.contractVersion
  ) {
    throw new ResearchDatabaseMutationStateError(
      "INVALID_VERIFICATION",
      "Verification contract version must be a canonical non-empty string."
    );
  }
  if (!isCanonicalIsoInstant(input.verifiedAt)) {
    throw new ResearchDatabaseMutationStateError(
      "INVALID_VERIFICATION",
      "Verification timestamp must be a canonical ISO instant."
    );
  }
  return input;
}

export type ResearchDatabaseOptions = {
  targetSchema?: number;
  releaseWritesLocked?: boolean;
  controllerTakeoverWriteFence?: ReleaseControllerTakeoverWriteFence;
};

function parseStoredEventRecord(input: unknown): EventRecord {
  const record = storedEventRecordSchema.parse(input);
  // This synchronous boundary provides current exact replay and rejects any
  // registered-descriptor conflict. Retained or unavailable artifacts remain
  // structural until an async relationship/backup boundary reports its status.
  verifyEventTimeContext({
    datePrecision: record.datePrecision,
    startDate: record.startDate,
    endDate: record.endDate,
    timeContext: record.timeContext
  });
  return record;
}

function parseCurrentEventRecord(input: unknown): EventRecord {
  const record = eventRecordSchema.parse(input);
  return parseStoredEventRecord(record);
}

/** Canonical full-record CAS digest used by the explicit legacy-time review flow. */
export async function computeEventRecordDigest(input: unknown): Promise<string> {
  return sha256Hex(parseStoredEventRecord(input));
}

/** Immutable time-and-lineage projection bound into every Event migration receipt endpoint. */
export function buildEventTimeMigrationSnapshot(input: unknown): EventTimeMigrationSnapshot {
  const record = parseStoredEventRecord(input);
  return storedEventTimeMigrationSnapshotSchema.parse({
    formatVersion: EVENT_TIME_MIGRATION_SNAPSHOT_FORMAT_VERSION,
    eventRecordVersion: record.recordVersion,
    caseId: record.caseId,
    revisionId: record.revisionId,
    transitNodeRef: record.transitNodeRef,
    datePrecision: record.datePrecision,
    startDate: record.startDate,
    endDate: record.endDate,
    timeContext: record.timeContext
  });
}

async function parseVerifiedSavedViewRecord(input: unknown): Promise<SavedViewRecord> {
  const record = savedViewRecordSchema.parse(input);
  if (record.state === "ready") {
    const queryDigest = await sha256Hex(record.query);
    if (queryDigest !== record.queryDigest) {
      throw new ResearchRepositoryError(
        "SAVED_VIEW_QUERY_DIGEST_MISMATCH",
        `保存视图查询摘要不匹配：${record.id}`
      );
    }
  }
  return record;
}

function requireReadySavedView(record: SavedViewRecord): ReadySavedViewRecord {
  if (record.state === "migration_required") {
    throw new ResearchRepositoryError(
      "SAVED_VIEW_MIGRATION_REQUIRED",
      `保存视图必须先完成人工迁移审核：${record.id}`
    );
  }
  return record;
}

export type BirthFingerprintRecord = {
  /** Type-prefixing also preserves both owners when a legacy v3 database contains a cross-table ID collision. */
  key: string;
  sourceId: string;
  fingerprint: string;
  subjectId: string;
  recordType: "revision" | "candidate_set";
};

export type DuplicateBirthGuard = "allow" | "reject";

export type ResearchSubjectLifecycle = "active" | "trashed" | "all";

export type ListResearchSubjectsOptions = {
  lifecycle?: ResearchSubjectLifecycle;
  favoritesOnly?: boolean;
};

export type ResearchSubjectKind = "all" | "cases" | "candidate_sets";

export type ResearchSubjectPageCursor = {
  updatedAt: string;
  id: string;
  kind: Exclude<ResearchSubjectKind, "all">;
  /** Binds an opaque keyset position to the filters that produced it. */
  queryKey: string;
};

export type ListResearchSubjectPageOptions = ListResearchSubjectsOptions & {
  kind?: ResearchSubjectKind;
  limit?: number;
  cursor?: ResearchSubjectPageCursor | null;
};

export type ResearchSubjectPage = {
  items: ResearchSubjectRecord[];
  total: number;
  nextCursor: ResearchSubjectPageCursor | null;
};

export type ResearchSubjectOverview = {
  activeCaseCount: number;
  activeCandidateSetCount: number;
  activeSubjectCount: number;
  trashedSubjectCount: number;
  activeFavoriteSubjectCount: number;
  activeRevisionCount: number;
};

export type UpdateResearchSubjectMetadataInput = {
  alias: string;
  tags: string[];
  notes: string;
};

export type ResearchSubjectLifecycleErrorCode =
  | "SUBJECT_NOT_FOUND"
  | "SUBJECT_IN_TRASH"
  | "SUBJECT_NOT_TRASHED";

export class ResearchSubjectLifecycleError extends Error {
  constructor(readonly code: ResearchSubjectLifecycleErrorCode, message: string) {
    super(message);
    this.name = "ResearchSubjectLifecycleError";
  }
}

function matchesResearchSubjectOptions(
  subject: ResearchSubjectRecord,
  options: ListResearchSubjectsOptions
): boolean {
  const lifecycle = options.lifecycle ?? "active";
  if (lifecycle === "active" && subject.deletedAt !== null) return false;
  if (lifecycle === "trashed" && subject.deletedAt === null) return false;
  return !options.favoritesOnly || subject.favorite;
}

const DEFAULT_RESEARCH_SUBJECT_PAGE_LIMIT = 50;
const MAX_RESEARCH_SUBJECT_PAGE_LIMIT = 100;
type StoredResearchSubjectKind = Exclude<ResearchSubjectKind, "all">;
type PageableResearchSubject = {
  record: ResearchSubjectRecord;
  kind: StoredResearchSubjectKind;
};

type NormalizedResearchSubjectPageOptions = {
  kind: ResearchSubjectKind;
  lifecycle: ResearchSubjectLifecycle;
  favoritesOnly: boolean;
  limit: number;
  cursor: ResearchSubjectPageCursor | null;
  queryKey: string;
};

function compareCanonicalString(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Stable order shared by list and text-search pages: recency desc, id asc, kind asc. */
function compareResearchSubjectPosition(
  left: Pick<PageableResearchSubject["record"], "updatedAt" | "id"> & { kind: StoredResearchSubjectKind },
  right: Pick<PageableResearchSubject["record"], "updatedAt" | "id"> & { kind: StoredResearchSubjectKind }
): number {
  return compareCanonicalString(right.updatedAt, left.updatedAt) ||
    compareCanonicalString(left.id, right.id) ||
    compareCanonicalString(left.kind, right.kind);
}

function validateResearchSubjectPageLimit(rawLimit: number | undefined): number {
  const limit = rawLimit ?? DEFAULT_RESEARCH_SUBJECT_PAGE_LIMIT;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_RESEARCH_SUBJECT_PAGE_LIMIT) {
    throw new RangeError(`Research subject page limit must be an integer between 1 and ${MAX_RESEARCH_SUBJECT_PAGE_LIMIT}.`);
  }
  return limit;
}

function validateResearchSubjectKind(kind: ResearchSubjectKind | undefined): ResearchSubjectKind {
  const normalized = kind ?? "all";
  if (normalized !== "all" && normalized !== "cases" && normalized !== "candidate_sets") {
    throw new TypeError("Research subject kind must be all, cases, or candidate_sets.");
  }
  return normalized;
}

function validateResearchSubjectLifecycle(
  lifecycle: ResearchSubjectLifecycle | undefined
): ResearchSubjectLifecycle {
  const normalized = lifecycle ?? "active";
  if (normalized !== "active" && normalized !== "trashed" && normalized !== "all") {
    throw new TypeError("Research subject lifecycle must be active, trashed, or all.");
  }
  return normalized;
}

function createResearchSubjectPageQueryKey(input: {
  mode: "list" | "search";
  kind: ResearchSubjectKind;
  lifecycle: ResearchSubjectLifecycle;
  favoritesOnly: boolean;
  terms?: readonly string[];
  includeArchivedNotes?: boolean;
}): string {
  return JSON.stringify([
    1,
    input.mode,
    input.kind,
    input.lifecycle,
    input.favoritesOnly,
    input.terms ?? [],
    input.includeArchivedNotes ?? false
  ]);
}

function validateResearchSubjectPageCursor(
  cursor: ResearchSubjectPageCursor | null | undefined,
  queryKey: string
): ResearchSubjectPageCursor | null {
  if (cursor === undefined || cursor === null) return null;
  if (
    typeof cursor !== "object" ||
    typeof cursor.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(cursor.updatedAt)) ||
    typeof cursor.id !== "string" ||
    cursor.id.length === 0 ||
    (cursor.kind !== "cases" && cursor.kind !== "candidate_sets") ||
    cursor.queryKey !== queryKey
  ) {
    throw new TypeError("Research subject page cursor is invalid or belongs to different filters.");
  }
  return cursor;
}

function normalizeResearchSubjectPageOptions(
  options: ListResearchSubjectPageOptions,
  query?: { terms: readonly string[]; includeArchivedNotes: boolean }
): NormalizedResearchSubjectPageOptions {
  const kind = validateResearchSubjectKind(options.kind);
  const lifecycle = validateResearchSubjectLifecycle(options.lifecycle);
  const favoritesOnly = options.favoritesOnly ?? false;
  if (typeof favoritesOnly !== "boolean") {
    throw new TypeError("favoritesOnly must be a boolean.");
  }
  const queryKey = createResearchSubjectPageQueryKey({
    mode: query ? "search" : "list",
    kind,
    lifecycle,
    favoritesOnly,
    ...(query ? { terms: query.terms, includeArchivedNotes: query.includeArchivedNotes } : {})
  });
  return {
    kind,
    lifecycle,
    favoritesOnly,
    limit: validateResearchSubjectPageLimit(options.limit),
    cursor: validateResearchSubjectPageCursor(options.cursor, queryKey),
    queryKey
  };
}

function assertPageableResearchSubject(
  record: ResearchSubjectRecord,
  kind: StoredResearchSubjectKind
): PageableResearchSubject {
  if (
    typeof record.id !== "string" ||
    record.id.length === 0 ||
    typeof record.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(record.updatedAt)) ||
    typeof record.favorite !== "boolean" ||
    (record.deletedAt !== null && typeof record.deletedAt !== "string")
  ) {
    throw new TypeError(`Stored ${kind} record lacks valid pagination metadata.`);
  }
  return { record, kind };
}

function isResearchSubjectAfterCursor(
  candidate: PageableResearchSubject,
  cursor: ResearchSubjectPageCursor | null
): boolean {
  return cursor === null || compareResearchSubjectPosition(
    { updatedAt: candidate.record.updatedAt, id: candidate.record.id, kind: candidate.kind },
    cursor
  ) > 0;
}

function insertBoundedResearchSubject<T extends PageableResearchSubject>(
  items: T[],
  candidate: T,
  capacity: number
): void {
  let low = 0;
  let high = items.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (compareResearchSubjectPosition(
      { updatedAt: candidate.record.updatedAt, id: candidate.record.id, kind: candidate.kind },
      { updatedAt: items[middle].record.updatedAt, id: items[middle].record.id, kind: items[middle].kind }
    ) < 0) high = middle;
    else low = middle + 1;
  }
  items.splice(low, 0, candidate);
  if (items.length > capacity) items.pop();
}

function researchSubjectPageCursor(
  candidate: PageableResearchSubject,
  queryKey: string
): ResearchSubjectPageCursor {
  return {
    updatedAt: candidate.record.updatedAt,
    id: candidate.record.id,
    kind: candidate.kind,
    queryKey
  };
}

async function createStoredBirthFingerprint(input: BirthInput): Promise<string> {
  const parsed = storedBirthInputSchema.parse(input);
  return `${BIRTH_FINGERPRINT_VERSION}:${await sha256Hex(buildBirthFingerprintPayload(parsed))}`;
}

async function revisionFingerprintRecord(revision: RevisionRecord): Promise<BirthFingerprintRecord> {
  return {
    key: `revision:${revision.id}`,
    sourceId: revision.id,
    fingerprint: await createStoredBirthFingerprint(revision.input),
    subjectId: revision.caseId,
    recordType: "revision"
  };
}

async function candidateFingerprintRecord(candidateSet: CandidateSetRecord): Promise<BirthFingerprintRecord> {
  return {
    key: `candidate_set:${candidateSet.id}`,
    sourceId: candidateSet.id,
    fingerprint: await createStoredBirthFingerprint(candidateSet.candidateSet.input),
    subjectId: candidateSet.id,
    recordType: "candidate_set"
  };
}

export class BirthFingerprintIndexIntegrityError extends Error {
  readonly code = "BIRTH_FINGERPRINT_INDEX_MISMATCH" as const;

  constructor(message: string) {
    super(message);
    this.name = "BirthFingerprintIndexIntegrityError";
  }
}

const BIRTH_FINGERPRINT_RECORD_KEYS = [
  "fingerprint",
  "key",
  "recordType",
  "sourceId",
  "subjectId"
] as const;

function isExactBirthFingerprintRecord(
  input: unknown
): input is BirthFingerprintRecord {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  const record = input as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return keys.length === BIRTH_FINGERPRINT_RECORD_KEYS.length &&
    keys.every((key, index) => key === BIRTH_FINGERPRINT_RECORD_KEYS[index]) &&
    typeof record.key === "string" &&
    typeof record.sourceId === "string" &&
    typeof record.fingerprint === "string" &&
    typeof record.subjectId === "string" &&
    (record.recordType === "revision" || record.recordType === "candidate_set");
}

/**
 * Fail-closed check for the derived duplicate-birth index. It deliberately
 * runs inside the caller's readonly transaction: the index is not exported in
 * backups, but it is part of deciding whether that exact database epoch is
 * eligible for a clean verification marker.
 */
async function assertExactBirthFingerprintIndex(
  cases: readonly CaseRecord[],
  revisions: readonly RevisionRecord[],
  candidateSets: readonly CandidateSetRecord[],
  storedRecords: readonly unknown[]
): Promise<void> {
  const caseIds = new Set(cases.map((record) => record.id));
  for (const revision of revisions) {
    if (!caseIds.has(revision.caseId)) {
      throw new BirthFingerprintIndexIntegrityError(
        `Revision ${revision.id} cannot derive a birth fingerprint for missing Case ${revision.caseId}.`
      );
    }
  }

  const expectedRecords = await Promise.all([
    ...revisions.map((revision) => revisionFingerprintRecord(revision)),
    ...candidateSets.map((candidateSet) => candidateFingerprintRecord(candidateSet))
  ]);
  const expectedByKey = new Map(expectedRecords.map((record) => [record.key, record]));
  if (expectedByKey.size !== expectedRecords.length || storedRecords.length !== expectedRecords.length) {
    throw new BirthFingerprintIndexIntegrityError(
      "Birth fingerprint index cardinality does not exactly match Revision and CandidateSet records."
    );
  }

  for (const rawRecord of storedRecords) {
    if (!isExactBirthFingerprintRecord(rawRecord)) {
      throw new BirthFingerprintIndexIntegrityError(
        "Birth fingerprint index contains a malformed record."
      );
    }
    const expected = expectedByKey.get(rawRecord.key);
    if (
      expected === undefined ||
      rawRecord.sourceId !== expected.sourceId ||
      rawRecord.subjectId !== expected.subjectId ||
      rawRecord.recordType !== expected.recordType ||
      rawRecord.fingerprint !== expected.fingerprint
    ) {
      throw new BirthFingerprintIndexIntegrityError(
        `Birth fingerprint index record ${rawRecord.key} does not match its source record.`
      );
    }
    expectedByKey.delete(rawRecord.key);
  }
  if (expectedByKey.size !== 0) {
    throw new BirthFingerprintIndexIntegrityError(
      "Birth fingerprint index is missing one or more derived records."
    );
  }
}

type UserSourceMetadata = {
  sourceUrl?: string | null;
  publisher?: string;
  publicationYear?: number | null;
  acquiredAt?: string | null;
};

function createUserSourceRightsRecord(
  knowledgeDocument: KnowledgeDocumentRecord,
  source: UserSourceMetadata = {},
  timestamp = knowledgeDocument.createdAt
): SourceRightsRecord {
  return sourceRightsRecordSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    recordType: "knowledge_source_rights",
    documentId: knowledgeDocument.id,
    documentContentHash: knowledgeDocument.contentHash,
    origin: "user_import",
    source: {
      sourceUrl: source.sourceUrl ?? null,
      publisher: source.publisher ?? "",
      publicationYear: source.publicationYear ?? null,
      acquiredAt: source.acquiredAt === undefined ? timestamp : source.acquiredAt
    },
    rights: {
      status: "user_unverified",
      workStatus: "unknown",
      editionStatus: "unknown",
      basis: "user_declaration",
      jurisdiction: null,
      licenseId: null,
      copyrightNotice: "",
      evidenceRefs: [],
      distributionPolicy: "local_private_only"
    },
    review: {
      status: "unreviewed",
      attestations: [],
      note: ""
    },
    editVersion: 1,
    createdAt: timestamp,
    updatedAt: timestamp
  });
}

function citationTargetKey(target: CitationTarget): string {
  if (target.kind === "research_note") return `research_note:${target.noteId}`;
  if (target.kind === "event") return `event:${target.eventId}`;
  if (target.kind === "chart_field") {
    return `chart_field:${target.caseId}:${target.revisionId}:${target.field}`;
  }
  return `evidence_subject:${target.subjectId}`;
}

function citationTargetKeys(targets: readonly CitationTarget[]): string[] {
  return targets.map(citationTargetKey).sort();
}

export class ResearchDatabase extends Dexie {
  cases!: EntityTable<CaseRecord, "id">;
  revisions!: EntityTable<RevisionRecord, "id">;
  candidateSets!: EntityTable<CandidateSetRecord, "id">;
  researchNotes!: EntityTable<ResearchNoteRecord, "id">;
  events!: EntityTable<EventRecord, "id">;
  savedViews!: EntityTable<SavedViewRecord, "id">;
  knowledgeDocuments!: EntityTable<KnowledgeDocumentRecord, "id">;
  citations!: EntityTable<CitationRecord, "id">;
  sourceRights!: EntityTable<SourceRightsRecord, "documentId">;
  attachments!: EntityTable<LocalAttachmentRecord, "id">;
  researcherProfiles!: EntityTable<LocalResearcherProfileRecord, "id">;
  appSettings!: EntityTable<LocalAppSettingsRecord, "id">;
  ruleRegistry!: EntityTable<LocalRuleRegistryRecord, "id">;
  tzdbMigrationReceipts!: EntityTable<TzdbMigrationReceipt, "id">;
  eventTimeMigrationReceipts!: EntityTable<EventTimeMigrationReceipt, "id">;
  birthFingerprints!: EntityTable<BirthFingerprintRecord, "key">;
  revisionCalculationReceipts!: EntityTable<RevisionCalculationReceipt, "id">;
  /** @internal Operational metadata; deliberately excluded from every user backup payload. */
  mutationState!: EntityTable<ResearchDatabaseMutationState, "id">;
  readonly targetSchemaVersion: number;
  private releaseWritesLocked: boolean;
  private readonly controllerTakeoverWriteFences: readonly ReleaseControllerTakeoverWriteFence[];
  private readonly migrationWriteTransactions = new WeakSet<IDBTransaction>();

  constructor(
    name?: string,
    options: ResearchDatabaseOptions = {}
  ) {
    const runtime = configuredResearchDatabaseRuntime();
    const resolvedName = name ?? runtime?.databaseName;
    const targetSchema = options.targetSchema ?? runtime?.targetSchema;
    if (!resolvedName || targetSchema === undefined) {
      throw new ResearchDatabaseRuntimeConfigurationError();
    }
    super(resolvedName);
    if (
      !Number.isSafeInteger(targetSchema) ||
      targetSchema < 1 ||
      targetSchema > RESEARCH_DATABASE_MAX_SCHEMA_VERSION
    ) {
      throw new Error(`ResearchDatabase 不支持目标 Schema ${String(targetSchema)}。`);
    }
    this.targetSchemaVersion = targetSchema;
    this.releaseWritesLocked = options.releaseWritesLocked ?? runtime?.releaseWritesLocked ?? false;
    const controllerTakeoverWriteFences = [
      runtime?.controllerTakeoverWriteFence,
      options.controllerTakeoverWriteFence
    ].filter((fence): fence is ReleaseControllerTakeoverWriteFence => fence !== undefined);
    if (controllerTakeoverWriteFences.some((fence) => !isReleaseControllerTakeoverWriteFence(fence))) {
      throw new Error("ResearchDatabase 控制器接管写栅栏配置无效。");
    }
    // An explicit per-instance fence may add a stricter boundary, but it must
    // never replace the Web runtime's page-wide absolute fence.
    this.controllerTakeoverWriteFences = [...new Set(controllerTakeoverWriteFences)];
    const trackMutationEpoch = targetSchema >= 16;
    this.use({
      stack: "dbcore",
      name: "hakimi-release-write-lock-and-mutation-epoch",
      create: (down: DBCore) => {
        const epochBumps = new WeakMap<DBCoreTransaction, Promise<void>>();
        const bumpMutationEpoch = (transaction: DBCoreTransaction): Promise<void> => {
          const existing = epochBumps.get(transaction);
          if (existing) return existing;
          const mutationTable = down.table(RESEARCH_DATABASE_MUTATION_STATE_STORE);
          const bump = mutationTable
            .get({ trans: transaction, key: RESEARCH_DATABASE_MUTATION_STATE_ID })
            .then((raw) => mutationTable.mutate({
              type: "put",
              trans: transaction,
              values: [nextResearchDatabaseMutationState(raw)]
            }))
            .then((result) => {
              if (result.numFailures === 0) return;
              const failure = Object.values(result.failures)[0];
              throw failure ?? new ResearchDatabaseMutationStateError(
                "STATE_CORRUPT",
                "Research database mutation epoch could not be persisted."
              );
            });
          epochBumps.set(transaction, bump);
          return bump;
        };
        return {
          transaction: (stores, mode, options) => down.transaction(
            trackMutationEpoch && mode === "readwrite"
              ? [...new Set([...stores, RESEARCH_DATABASE_MUTATION_STATE_STORE])]
              : stores,
            mode,
            options
          ),
          table: (tableName: string) => {
            const table = down.table(tableName);
            return {
              ...table,
              mutate: (request) => {
                // A controller takeover is an absolute page-generation boundary.
                // It must also stop an already-authorized migration transaction;
                // only a newly booted page may obtain a fresh mutable fence.
                if (this.areControllerTakeoverWritesLocked()) {
                  return Promise.reject(new ReleaseDatabaseWriteLockedError());
                }
                if (
                  this.releaseWritesLocked &&
                  (
                    Dexie.currentTransaction === null ||
                    !this.migrationWriteTransactions.has(Dexie.currentTransaction.idbtrans)
                  )
                ) {
                  return Promise.reject(new ReleaseDatabaseWriteLockedError());
                }
                if (
                  trackMutationEpoch &&
                  tableName !== RESEARCH_DATABASE_MUTATION_STATE_STORE
                ) {
                  // Bump before forwarding the business mutation. A later abort
                  // rolls both writes back; a caught failed write may conservatively
                  // leave the transaction dirty, which is safe for cache admission.
                  return bumpMutationEpoch(request.trans).then(() => table.mutate(request));
                }
                return table.mutate(request);
              }
            };
          }
        };
      }
    });
    this.version(1).stores({
      cases: "id, updatedAt, *tags, latestRevisionId",
      revisions: "id, caseId, [caseId+revisionNumber], createdAt, manifest.resultHash"
    });
    this.version(2).stores({
      cases: "id, updatedAt, *tags, latestRevisionId",
      revisions: "id, caseId, [caseId+revisionNumber], createdAt, manifest.resultHash",
      researchNotes: "id, caseId, [caseId+lifecycle], anchor.kind, anchor.revisionId, updatedAt, *tags",
      events: "id, caseId, revisionId, datePrecision, startDate, deletedAt, updatedAt, *tags",
      savedViews: "id, name, updatedAt, createdAt"
    });
    this.version(3).stores({
      cases: "id, updatedAt, *tags, latestRevisionId",
      revisions: "id, caseId, [caseId+revisionNumber], createdAt, manifest.resultHash",
      candidateSets: "id, updatedAt, *tags, candidateSet.resultHash",
      researchNotes: "id, caseId, [caseId+lifecycle], anchor.kind, anchor.revisionId, updatedAt, *tags",
      events: "id, caseId, revisionId, datePrecision, startDate, deletedAt, updatedAt, *tags",
      savedViews: "id, name, updatedAt, createdAt"
    });
    this.version(4).stores({
      cases: "id, updatedAt, *tags, latestRevisionId",
      revisions: "id, caseId, [caseId+revisionNumber], createdAt, manifest.resultHash",
      candidateSets: "id, updatedAt, *tags, candidateSet.resultHash",
      researchNotes: "id, caseId, [caseId+lifecycle], anchor.kind, anchor.revisionId, updatedAt, *tags",
      events: "id, caseId, revisionId, datePrecision, startDate, deletedAt, updatedAt, *tags",
      savedViews: "id, name, updatedAt, createdAt",
      birthFingerprints: "key, fingerprint, sourceId, subjectId, recordType"
    }).upgrade(async (transaction) => {
      const [revisions, candidateSets] = await Promise.all([
        transaction.table("revisions").toArray() as Promise<RevisionRecord[]>,
        transaction.table("candidateSets").toArray() as Promise<CandidateSetRecord[]>
      ]);
      const records = await Dexie.waitFor(Promise.all([
        ...revisions.map((revision) => revisionFingerprintRecord(revision)),
        ...candidateSets.map((candidateSet) => candidateFingerprintRecord(candidateSet))
      ]));
      if (records.length > 0) await transaction.table("birthFingerprints").bulkPut(records);
    });
    this.version(5).stores({
      cases: "id, updatedAt, *tags, latestRevisionId",
      revisions: "id, caseId, [caseId+revisionNumber], createdAt, manifest.resultHash",
      candidateSets: "id, updatedAt, *tags, candidateSet.resultHash",
      researchNotes: "id, caseId, [caseId+lifecycle], anchor.kind, anchor.revisionId, updatedAt, *tags",
      events: "id, caseId, revisionId, datePrecision, startDate, deletedAt, updatedAt, *tags",
      savedViews: "id, name, updatedAt, createdAt",
      knowledgeDocuments: "id, contentHash, updatedAt, createdAt, format, fileName",
      citations: "id, documentId, documentContentHash, updatedAt, createdAt, status",
      birthFingerprints: "key, fingerprint, sourceId, subjectId, recordType"
    });
    this.version(6).stores({
      cases: "id, updatedAt, *tags, latestRevisionId",
      revisions: "id, caseId, [caseId+revisionNumber], createdAt, manifest.resultHash",
      candidateSets: "id, updatedAt, *tags, candidateSet.resultHash",
      researchNotes: "id, caseId, [caseId+lifecycle], anchor.kind, anchor.revisionId, updatedAt, *tags",
      events: "id, caseId, revisionId, datePrecision, startDate, deletedAt, updatedAt, *tags",
      savedViews: "id, name, updatedAt, createdAt",
      knowledgeDocuments: "id, contentHash, updatedAt, createdAt, format, fileName",
      citations: "id, documentId, documentContentHash, updatedAt, createdAt, status, *targetKeys",
      sourceRights: "documentId, documentContentHash, origin, rights.status, rights.distributionPolicy, review.status, updatedAt",
      birthFingerprints: "key, fingerprint, sourceId, subjectId, recordType"
    }).upgrade(async (transaction) => {
      const knowledgeTable = transaction.table("knowledgeDocuments");
      const citationTable = transaction.table("citations");
      const sourceRightsTable = transaction.table("sourceRights");
      const legacyDocuments = await knowledgeTable.toArray() as Array<KnowledgeDocumentRecord & { rightsStatus?: unknown }>;
      const legacyCitations = await citationTable.toArray() as Array<CitationRecord & {
        targetKeys?: unknown;
        reviewAttestations?: unknown;
        decisionNote?: unknown;
      }>;
      const documents = legacyDocuments.map((legacyDocument) => {
        const { rightsStatus: _legacyRightsStatus, ...document } = legacyDocument;
        return knowledgeDocumentRecordSchema.parse(document);
      });
      const rightsRecords = documents.map((knowledgeDocument) => createUserSourceRightsRecord(
        knowledgeDocument,
        { acquiredAt: null },
        knowledgeDocument.createdAt
      ));
      const citations = legacyCitations.map((legacyCitation) => {
        const current = {
          ...legacyCitation,
          targetKeys: citationTargetKeys(legacyCitation.targets),
          reviewAttestations: [],
          decisionNote: ""
        };
        return citationRecordSchema.parse(current);
      });
      if (documents.length > 0) await knowledgeTable.bulkPut(documents);
      if (rightsRecords.length > 0) await sourceRightsTable.bulkPut(rightsRecords);
      if (citations.length > 0) await citationTable.bulkPut(citations);
    });
    this.version(7).stores({
      cases: "id, updatedAt, deletedAt, *tags, latestRevisionId",
      revisions: "id, caseId, [caseId+revisionNumber], createdAt, manifest.resultHash",
      candidateSets: "id, updatedAt, deletedAt, *tags, candidateSet.resultHash",
      researchNotes: "id, caseId, [caseId+lifecycle], anchor.kind, anchor.revisionId, updatedAt, *tags",
      events: "id, caseId, revisionId, datePrecision, startDate, deletedAt, updatedAt, *tags",
      savedViews: "id, name, updatedAt, createdAt",
      knowledgeDocuments: "id, contentHash, updatedAt, createdAt, format, fileName",
      citations: "id, documentId, documentContentHash, updatedAt, createdAt, status, *targetKeys",
      sourceRights: "documentId, documentContentHash, origin, rights.status, rights.distributionPolicy, review.status, updatedAt",
      birthFingerprints: "key, fingerprint, sourceId, subjectId, recordType"
    }).upgrade(async (transaction) => {
      const caseTable = transaction.table("cases");
      const candidateSetTable = transaction.table("candidateSets");
      const [legacyCases, legacyCandidateSets] = await Promise.all([
        caseTable.toArray() as Promise<Array<Record<string, unknown>>>,
        candidateSetTable.toArray() as Promise<Array<Record<string, unknown>>>
      ]);
      const cases = legacyCases.map((record) => ({
        ...record,
        recordVersion: RESEARCH_SUBJECT_RECORD_VERSION,
        favorite: false,
        deletedAt: null
      }));
      const candidateSets = legacyCandidateSets.map((record) => ({
        ...record,
        recordVersion: RESEARCH_SUBJECT_RECORD_VERSION,
        favorite: false,
        deletedAt: null
      }));
      if (cases.length > 0) await caseTable.bulkPut(cases);
      if (candidateSets.length > 0) await candidateSetTable.bulkPut(candidateSets);
    });
    this.version(8).stores({
      cases: "id, updatedAt, deletedAt, *tags, latestRevisionId",
      revisions: "id, caseId, [caseId+revisionNumber], createdAt, manifest.resultHash",
      candidateSets: "id, updatedAt, deletedAt, *tags, candidateSet.resultHash",
      researchNotes: "id, caseId, [caseId+lifecycle], anchor.kind, anchor.revisionId, updatedAt, *tags",
      events: "id, caseId, revisionId, datePrecision, startDate, timeContext.kind, timeContext.start.canonicalUtc, deletedAt, updatedAt, *tags",
      savedViews: "id, name, updatedAt, createdAt",
      knowledgeDocuments: "id, contentHash, updatedAt, createdAt, format, fileName",
      citations: "id, documentId, documentContentHash, updatedAt, createdAt, status, *targetKeys",
      sourceRights: "documentId, documentContentHash, origin, rights.status, rights.distributionPolicy, review.status, updatedAt",
      birthFingerprints: "key, fingerprint, sourceId, subjectId, recordType"
    }).upgrade(async (transaction) => {
      const eventTable = transaction.table("events");
      const storedEvents = await eventTable.toArray() as Array<Record<string, unknown>>;
      const events = storedEvents.map((record) => (
        record.recordVersion === EVENT_RECORD_VERSION
          ? parseStoredEventRecord(record)
          : migrateLegacyEventRecordV1(record as LegacyEventRecordV1)
      ));
      if (events.length > 0) await eventTable.bulkPut(events);
    });
    this.version(9).stores({
      cases: "id, updatedAt, deletedAt, *tags, latestRevisionId",
      revisions: "id, caseId, [caseId+revisionNumber], createdAt, manifest.resultHash",
      candidateSets: "id, updatedAt, deletedAt, *tags, candidateSet.resultHash",
      researchNotes: "id, caseId, [caseId+lifecycle], anchor.kind, anchor.revisionId, updatedAt, *tags",
      events: "id, caseId, revisionId, datePrecision, startDate, timeContext.kind, timeContext.start.canonicalUtc, deletedAt, updatedAt, *tags",
      savedViews: "id, state, recordVersion, name, updatedAt, createdAt",
      knowledgeDocuments: "id, contentHash, updatedAt, createdAt, format, fileName",
      citations: "id, documentId, documentContentHash, updatedAt, createdAt, status, *targetKeys",
      sourceRights: "documentId, documentContentHash, origin, rights.status, rights.distributionPolicy, review.status, updatedAt",
      birthFingerprints: "key, fingerprint, sourceId, subjectId, recordType"
    }).upgrade(async (transaction) => {
      const savedViewTable = transaction.table("savedViews");
      const storedViews = await savedViewTable.toArray() as Array<Record<string, unknown>>;
      // Strictly parse every v1 record before writing any result. A malformed row throws,
      // aborting the whole Dexie upgrade transaction instead of partially migrating data.
      const migrated = storedViews.map((record) =>
        migrateLegacySavedViewRecordV1(record as LegacySavedViewRecordV1)
      );
      if (migrated.length > 0) await savedViewTable.bulkPut(migrated);
    });
    // v10 only adds three independent user-data partitions. No upgrade callback is
    // intentional: Dexie creates the empty stores while preserving every v9 row byte-for-byte.
    this.version(10).stores({
      cases: "id, updatedAt, deletedAt, *tags, latestRevisionId",
      revisions: "id, caseId, [caseId+revisionNumber], createdAt, manifest.resultHash",
      candidateSets: "id, updatedAt, deletedAt, *tags, candidateSet.resultHash",
      researchNotes: "id, caseId, [caseId+lifecycle], anchor.kind, anchor.revisionId, updatedAt, *tags",
      events: "id, caseId, revisionId, datePrecision, startDate, timeContext.kind, timeContext.start.canonicalUtc, deletedAt, updatedAt, *tags",
      savedViews: "id, state, recordVersion, name, updatedAt, createdAt",
      knowledgeDocuments: "id, contentHash, updatedAt, createdAt, format, fileName",
      citations: "id, documentId, documentContentHash, updatedAt, createdAt, status, *targetKeys",
      sourceRights: "documentId, documentContentHash, origin, rights.status, rights.distributionPolicy, review.status, updatedAt",
      attachments: "id, updatedAt, createdAt, mediaType, link.kind, link.subjectId, link.caseId, link.revisionId, link.noteId, link.eventId, link.documentId",
      researcherProfiles: "id, updatedAt",
      appSettings: "id, updatedAt",
      birthFingerprints: "key, fingerprint, sourceId, subjectId, recordType"
    });
    // v11 adds an independent rule-pack library plus its singleton active selector.
    // Existing v10 rows remain untouched; IndexedDB creates the new empty store.
    this.version(11).stores({
      cases: "id, updatedAt, deletedAt, *tags, latestRevisionId",
      revisions: "id, caseId, [caseId+revisionNumber], createdAt, manifest.resultHash",
      candidateSets: "id, updatedAt, deletedAt, *tags, candidateSet.resultHash",
      researchNotes: "id, caseId, [caseId+lifecycle], anchor.kind, anchor.revisionId, updatedAt, *tags",
      events: "id, caseId, revisionId, datePrecision, startDate, timeContext.kind, timeContext.start.canonicalUtc, deletedAt, updatedAt, *tags",
      savedViews: "id, state, recordVersion, name, updatedAt, createdAt",
      knowledgeDocuments: "id, contentHash, updatedAt, createdAt, format, fileName",
      citations: "id, documentId, documentContentHash, updatedAt, createdAt, status, *targetKeys",
      sourceRights: "documentId, documentContentHash, origin, rights.status, rights.distributionPolicy, review.status, updatedAt",
      attachments: "id, updatedAt, createdAt, mediaType, link.kind, link.subjectId, link.caseId, link.revisionId, link.noteId, link.eventId, link.documentId",
      researcherProfiles: "id, updatedAt",
      appSettings: "id, updatedAt",
      ruleRegistry: "id, recordType, packId, &[packId+profileVersion], profileDigest, importedAt",
      birthFingerprints: "key, fingerprint, sourceId, subjectId, recordType"
    });
    // v12 adds append-only tzdb migration receipts. Existing v11 partitions are
    // intentionally not rewritten; IndexedDB only creates the new empty store.
    this.version(12).stores({
      cases: "id, updatedAt, deletedAt, *tags, latestRevisionId",
      revisions: "id, caseId, [caseId+revisionNumber], createdAt, manifest.resultHash",
      candidateSets: "id, updatedAt, deletedAt, *tags, candidateSet.resultHash",
      researchNotes: "id, caseId, [caseId+lifecycle], anchor.kind, anchor.revisionId, updatedAt, *tags",
      events: "id, caseId, revisionId, datePrecision, startDate, timeContext.kind, timeContext.start.canonicalUtc, deletedAt, updatedAt, *tags",
      savedViews: "id, state, recordVersion, name, updatedAt, createdAt",
      knowledgeDocuments: "id, contentHash, updatedAt, createdAt, format, fileName",
      citations: "id, documentId, documentContentHash, updatedAt, createdAt, status, *targetKeys",
      sourceRights: "documentId, documentContentHash, origin, rights.status, rights.distributionPolicy, review.status, updatedAt",
      attachments: "id, updatedAt, createdAt, mediaType, link.kind, link.subjectId, link.caseId, link.revisionId, link.noteId, link.eventId, link.documentId",
      researcherProfiles: "id, updatedAt",
      appSettings: "id, updatedAt",
      ruleRegistry: "id, recordType, packId, &[packId+profileVersion], profileDigest, importedAt",
      tzdbMigrationReceipts: "id, operation, source.recordId, target.recordId, createdAt",
      birthFingerprints: "key, fingerprint, sourceId, subjectId, recordType"
    });
    // v13 adds an independent append-only Event time-semantics derivation ledger.
    // Existing Event rows and CandidateSet migration receipts remain byte-for-byte untouched.
    this.version(13).stores({
      cases: "id, updatedAt, deletedAt, *tags, latestRevisionId",
      revisions: "id, caseId, [caseId+revisionNumber], createdAt, manifest.resultHash",
      candidateSets: "id, updatedAt, deletedAt, *tags, candidateSet.resultHash",
      researchNotes: "id, caseId, [caseId+lifecycle], anchor.kind, anchor.revisionId, updatedAt, *tags",
      events: "id, caseId, revisionId, datePrecision, startDate, timeContext.kind, timeContext.start.canonicalUtc, deletedAt, updatedAt, *tags",
      savedViews: "id, state, recordVersion, name, updatedAt, createdAt",
      knowledgeDocuments: "id, contentHash, updatedAt, createdAt, format, fileName",
      citations: "id, documentId, documentContentHash, updatedAt, createdAt, status, *targetKeys",
      sourceRights: "documentId, documentContentHash, origin, rights.status, rights.distributionPolicy, review.status, updatedAt",
      attachments: "id, updatedAt, createdAt, mediaType, link.kind, link.subjectId, link.caseId, link.revisionId, link.noteId, link.eventId, link.documentId",
      researcherProfiles: "id, updatedAt",
      appSettings: "id, updatedAt",
      ruleRegistry: "id, recordType, packId, &[packId+profileVersion], profileDigest, importedAt",
      tzdbMigrationReceipts: "id, operation, source.recordId, target.recordId, createdAt",
      eventTimeMigrationReceipts: "id, operation, source.recordId, target.recordId, source.snapshotDigest, target.snapshotDigest, createdAt",
      birthFingerprints: "key, fingerprint, sourceId, subjectId, recordType"
    });
    // v14 only adds case-scoped recency indexes. Register it strictly for a
    // v14 target so a release intentionally pinned to v13 still opens and
    // materializes a physical v13 database without knowing about v14.
    if (targetSchema >= 14) {
      this.version(14).stores({
        cases: "id, updatedAt, deletedAt, *tags, latestRevisionId",
        revisions: "id, caseId, [caseId+revisionNumber], createdAt, manifest.resultHash",
        candidateSets: "id, updatedAt, deletedAt, *tags, candidateSet.resultHash",
        researchNotes: "id, caseId, [caseId+lifecycle], [caseId+updatedAt], anchor.kind, anchor.revisionId, updatedAt, *tags",
        events: "id, caseId, [caseId+updatedAt], revisionId, datePrecision, startDate, timeContext.kind, timeContext.start.canonicalUtc, deletedAt, updatedAt, *tags",
        savedViews: "id, state, recordVersion, name, updatedAt, createdAt",
        knowledgeDocuments: "id, contentHash, updatedAt, createdAt, format, fileName",
        citations: "id, documentId, documentContentHash, updatedAt, createdAt, status, *targetKeys",
        sourceRights: "documentId, documentContentHash, origin, rights.status, rights.distributionPolicy, review.status, updatedAt",
        attachments: "id, updatedAt, createdAt, mediaType, link.kind, link.subjectId, link.caseId, link.revisionId, link.noteId, link.eventId, link.documentId",
        researcherProfiles: "id, updatedAt",
        appSettings: "id, updatedAt",
        ruleRegistry: "id, recordType, packId, &[packId+profileVersion], profileDigest, importedAt",
        tzdbMigrationReceipts: "id, operation, source.recordId, target.recordId, createdAt",
        eventTimeMigrationReceipts: "id, operation, source.recordId, target.recordId, source.snapshotDigest, target.snapshotDigest, createdAt",
        birthFingerprints: "key, fingerprint, sourceId, subjectId, recordType"
      });
    }
    // v15 adds an empty append-only calculation receipt ledger. Existing v14
    // rows are never rewritten; baseline receipts begin with new Revisions.
    if (targetSchema >= 15) {
      this.version(15).stores({
        cases: "id, updatedAt, deletedAt, *tags, latestRevisionId",
        revisions: "id, caseId, [caseId+revisionNumber], createdAt, manifest.resultHash",
        candidateSets: "id, updatedAt, deletedAt, *tags, candidateSet.resultHash",
        researchNotes: "id, caseId, [caseId+lifecycle], [caseId+updatedAt], anchor.kind, anchor.revisionId, updatedAt, *tags",
        events: "id, caseId, [caseId+updatedAt], revisionId, datePrecision, startDate, timeContext.kind, timeContext.start.canonicalUtc, deletedAt, updatedAt, *tags",
        savedViews: "id, state, recordVersion, name, updatedAt, createdAt",
        knowledgeDocuments: "id, contentHash, updatedAt, createdAt, format, fileName",
        citations: "id, documentId, documentContentHash, updatedAt, createdAt, status, *targetKeys",
        sourceRights: "documentId, documentContentHash, origin, rights.status, rights.distributionPolicy, review.status, updatedAt",
        attachments: "id, updatedAt, createdAt, mediaType, link.kind, link.subjectId, link.caseId, link.revisionId, link.noteId, link.eventId, link.documentId",
        researcherProfiles: "id, updatedAt",
        appSettings: "id, updatedAt",
        ruleRegistry: "id, recordType, packId, &[packId+profileVersion], profileDigest, importedAt",
        tzdbMigrationReceipts: "id, operation, source.recordId, target.recordId, createdAt",
        eventTimeMigrationReceipts: "id, operation, source.recordId, target.recordId, source.snapshotDigest, target.snapshotDigest, createdAt",
        birthFingerprints: "key, fingerprint, sourceId, subjectId, recordType",
        revisionCalculationReceipts: "id, sourceRevision.caseId, sourceRevision.revisionId, captureKind, &requestFingerprint, createdAt, projection.projectionDigest"
      });
    }
    // v16 adds only an internal singleton mutation clock. It is operational
    // metadata, is never copied into user backup payloads, and starts empty so
    // the first verifier must establish the epoch-zero baseline explicitly.
    if (targetSchema >= 16) {
      this.version(16).stores({
        cases: "id, updatedAt, deletedAt, *tags, latestRevisionId",
        revisions: "id, caseId, [caseId+revisionNumber], createdAt, manifest.resultHash",
        candidateSets: "id, updatedAt, deletedAt, *tags, candidateSet.resultHash",
        researchNotes: "id, caseId, [caseId+lifecycle], [caseId+updatedAt], anchor.kind, anchor.revisionId, updatedAt, *tags",
        events: "id, caseId, [caseId+updatedAt], revisionId, datePrecision, startDate, timeContext.kind, timeContext.start.canonicalUtc, deletedAt, updatedAt, *tags",
        savedViews: "id, state, recordVersion, name, updatedAt, createdAt",
        knowledgeDocuments: "id, contentHash, updatedAt, createdAt, format, fileName",
        citations: "id, documentId, documentContentHash, updatedAt, createdAt, status, *targetKeys",
        sourceRights: "documentId, documentContentHash, origin, rights.status, rights.distributionPolicy, review.status, updatedAt",
        attachments: "id, updatedAt, createdAt, mediaType, link.kind, link.subjectId, link.caseId, link.revisionId, link.noteId, link.eventId, link.documentId",
        researcherProfiles: "id, updatedAt",
        appSettings: "id, updatedAt",
        ruleRegistry: "id, recordType, packId, &[packId+profileVersion], profileDigest, importedAt",
        tzdbMigrationReceipts: "id, operation, source.recordId, target.recordId, createdAt",
        eventTimeMigrationReceipts: "id, operation, source.recordId, target.recordId, source.snapshotDigest, target.snapshotDigest, createdAt",
        birthFingerprints: "key, fingerprint, sourceId, subjectId, recordType",
        revisionCalculationReceipts: "id, sourceRevision.caseId, sourceRevision.revisionId, captureKind, &requestFingerprint, createdAt, projection.projectionDigest",
        mutationState: "&id"
      });
    }
  }

  private requireMutationStateSchema(): void {
    if (this.targetSchemaVersion < 16) {
      throw new ResearchDatabaseMutationStateError(
        "SCHEMA_UNSUPPORTED",
        "Research database mutation state requires an explicit targetSchema of 16."
      );
    }
  }

  async readMutationState(): Promise<ResearchDatabaseMutationState | null> {
    this.requireMutationStateSchema();
    return this.transaction(
      "r",
      this.mutationState,
      () => readStrictResearchDatabaseMutationState(this.mutationState)
    );
  }

  /**
   * Metadata-only compare-and-set. The caller must have verified a payload and
   * epoch captured by one read transaction; a concurrent business write makes
   * this return null rather than blessing a stale snapshot.
   */
  async markMutationStateVerified(
    rawInput: MarkResearchDatabaseMutationStateVerifiedInput
  ): Promise<ResearchDatabaseMutationState | null> {
    this.requireMutationStateSchema();
    const input = validateMutationVerificationInput(rawInput);
    return this.transaction("rw", this.mutationState, async () => {
      const current = await readStrictResearchDatabaseMutationState(this.mutationState);
      const epoch = current?.epoch ?? 0;
      if (epoch !== input.expectedEpoch) return null;
      const next = parseResearchDatabaseMutationState({
        ...(current ?? emptyResearchDatabaseMutationState(epoch)),
        verifiedEpoch: epoch,
        verifiedPayloadDigest: input.payloadDigest,
        verifiedContractVersion: input.contractVersion,
        verifiedAt: input.verifiedAt
      });
      await this.mutationState.put(next);
      return next;
    });
  }

  areReleaseWritesLocked(): boolean {
    return this.releaseWritesLocked || this.areControllerTakeoverWritesLocked();
  }

  private areControllerTakeoverWritesLocked(): boolean {
    return this.controllerTakeoverWriteFences.some(releaseControllerTakeoverWriteFenceIsLocked);
  }

  /**
   * Establishes a storage-wide ordering barrier after the caller synchronously
   * closes its controller-takeover fence. The all-store readwrite transaction
   * queues behind every earlier conflicting transaction; the final lock check
   * prevents an ACK if the shared facade was corrupted or reopened meanwhile.
   */
  async drainControllerTakeoverWrites(): Promise<void> {
    if (!this.areControllerTakeoverWritesLocked()) {
      throw new ReleaseDatabaseWriteLockedError();
    }
    await Dexie.ignoreTransaction(() => this.transaction("rw", this.tables, async () => {
      await this.appSettings.count();
    }));
    if (!this.areControllerTakeoverWritesLocked()) {
      throw new ReleaseDatabaseWriteLockedError();
    }
  }

  lockReleaseWrites(): void {
    this.releaseWritesLocked = true;
  }

  unlockReleaseWrites(): void {
    this.releaseWritesLocked = false;
  }

  /**
   * Narrow capability for a verified shadow-generation materializer. UI and
   * ordinary repositories remain write-locked until the SW acknowledges BOOT_OK.
   */
  async withReleaseMigrationWriteAccess<T>(operation: () => Promise<T>): Promise<T> {
    return this.transaction("rw", this.tables, async (transaction) => {
      this.migrationWriteTransactions.add(transaction.idbtrans);
      try {
        // Dexie's transaction zone identifies this exact logical transaction
        // across awaited work. An unrelated ignoreTransaction() write has a
        // different zone and therefore cannot borrow this capability.
        return await Dexie.waitFor(operation(), Infinity);
      } finally {
        this.migrationWriteTransactions.delete(transaction.idbtrans);
      }
    });
  }
}

export type SaveCaseInput = {
  alias: string;
  tags?: string[];
  notes?: string;
  calculated: CalculatedChart;
  duplicateGuard?: DuplicateBirthGuard;
};

export type AppendRevisionCalculationReceiptInput = Readonly<{
  revisionId: string;
  request: RevisionDerivedReplayRequest;
}>;

export type RevisionCalculationReceiptStorageErrorCode =
  | "SCHEMA_UNSUPPORTED"
  | "REVISION_NOT_FOUND"
  | "CASE_TRASHED"
  | "DUPLICATE_REQUEST_FINGERPRINT"
  | "RECEIPT_SOURCE_MISMATCH";

export class RevisionCalculationReceiptStorageError extends Error {
  constructor(
    readonly code: RevisionCalculationReceiptStorageErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "RevisionCalculationReceiptStorageError";
  }
}

export type LegacyBackupReceiptBlockOperation =
  | "read_core"
  | "replace_core";

/**
 * Core-only backups cannot carry Schema 15 calculation receipts. Full backup
 * v1.2 does, so only the intentionally narrow core paths remain blocked.
 */
export class LegacyBackupOmitsCalculationReceiptsError extends Error {
  readonly code = "CALCULATION_RECEIPTS_OMITTED_BY_BACKUP_FORMAT" as const;

  constructor(
    readonly operation: LegacyBackupReceiptBlockOperation,
    readonly receiptCount: number
  ) {
    super(
      `Legacy ${operation} backup path cannot preserve ${receiptCount} Revision calculation receipt(s).`
    );
    this.name = "LegacyBackupOmitsCalculationReceiptsError";
  }
}

export type SaveCandidateSetInput = {
  alias: string;
  tags?: string[];
  notes?: string;
  candidateSet: UnknownHourCandidateResult;
  duplicateGuard?: DuplicateBirthGuard;
};

export type DeriveCandidateSetTzdbSnapshotInput = {
  sourceCandidateSetId: string;
  expectedSourceSnapshotDigest: string;
  /** Omitted legacy callers are constrained to the active bundled snapshot. */
  expectedTargetSnapshotId?: string;
  candidateSet: UnknownHourCandidateResult;
};

export type DeriveCandidateSetTzdbSnapshotResult = {
  source: CandidateSetRecord;
  target: CandidateSetRecord;
  receipt: TzdbMigrationReceipt;
};

export type CandidateSetTzdbMigrationErrorCode =
  | "SOURCE_NOT_FOUND"
  | "SOURCE_DELETED"
  | "SOURCE_SNAPSHOT_CHANGED"
  | "SAME_TZDB"
  | "INPUT_CHANGED"
  | "RULE_CHANGED"
  | "ALGORITHM_CHANGED"
  | "BINDING_CHANGED"
  | "TARGET_TZDB_EXPECTATION_MISMATCH"
  | "TARGET_TZDB_ARTIFACT_UNAVAILABLE"
  | "TARGET_TZDB_DESCRIPTOR_MISMATCH"
  | "TARGET_TZDB_LEGACY_UNIDENTIFIED"
  | "TARGET_TZDB_ALREADY_DERIVED"
  | "TARGET_RESULT_ALREADY_IN_LINEAGE"
  | "RECEIPT_RELATION_MISMATCH";

export class CandidateSetTzdbMigrationError extends Error {
  constructor(readonly code: CandidateSetTzdbMigrationErrorCode, message: string) {
    super(message);
    this.name = "CandidateSetTzdbMigrationError";
  }
}

export type DeriveLegacyEventTimeInput = {
  sourceEventId: string;
  expectedSourceRecordDigest: string;
  confirmed: true;
  interpretation: EventTimeMigrationInterpretation;
};

export type DeriveLegacyEventTimeResult = {
  source: EventRecord;
  target: EventRecord;
  receipt: EventTimeMigrationReceipt;
};

export type EventTimeMigrationErrorCode =
  | "CONFIRMATION_REQUIRED"
  | "SOURCE_NOT_FOUND"
  | "SOURCE_NOT_LEGACY_FLOATING"
  | "SOURCE_DELETED"
  | "SOURCE_RECORD_CHANGED"
  | "TARGET_KIND_MISMATCH"
  | "TARGET_INTERPRETATION_ALREADY_DERIVED"
  | "RECEIPT_RELATION_MISMATCH"
  | "EVENT_DERIVATION_LINEAGE_IMMUTABLE";

export class EventTimeMigrationError extends Error {
  constructor(readonly code: EventTimeMigrationErrorCode, message: string) {
    super(message);
    this.name = "EventTimeMigrationError";
  }
}

export type SaveResearcherProfileInput = {
  displayName: string;
  organization?: string;
  researchFocus?: string;
};

export type SaveAppSettingsInput = {
  defaultTimeZone: string;
  defaultCalendarType: LocalAppSettingsRecord["defaultCalendarType"];
  preferredDensity: LocalAppSettingsRecord["preferredDensity"];
};

export type CreateAttachmentInput = {
  fileName: string;
  mediaType: string;
  bytes: Uint8Array;
  description?: string;
  link?: LocalAttachmentLink | null;
};

export type CreateAttachmentOnceResult = {
  record: LocalAttachmentRecord;
  created: boolean;
};

export type UnlinkedLocalAttachmentExactIdentity = Readonly<{
  id: string;
  fileName: string;
  mediaType: string;
  byteLength: number;
  contentHash: string;
  description: string;
  link: null;
  createdAt: string;
  updatedAt: string;
}>;

export type LocalAttachmentMetadata = Readonly<
  Omit<LocalAttachmentRecord, "contentBase64"> & {
    /** Metadata and link target were checked, but stored content bytes were not decoded or hashed. */
    contentIntegrity: "unchecked";
  }
>;

export type LocalAttachmentMetadataPage = Readonly<{
  /** Exact count of the mediaType-indexed scan collection, not merely returned purpose matches. */
  totalCount: number;
  /** Offset into the mediaType-indexed scan collection (or the updatedAt index when unfiltered). */
  offset: number;
  items: readonly LocalAttachmentMetadata[];
  /** Offset of the first unscanned row; null only when this scan collection is exhausted. */
  nextOffset: number | null;
  /** Rows admitted within this call's bounded scan, including purpose-filtered rows. */
  scannedCount: number;
  /** Sum of contentBase64 UTF-16 code units for the admitted scan rows. */
  scannedEncodedCharacters: number;
  contentIntegrityVerified: false;
}>;

export type ReadAttachmentPurposeMetadataSnapshotOptions = Readonly<{
  mediaType: string;
  description: string;
  unlinkedOnly: true;
}>;

export type LocalAttachmentPurposeMetadataSnapshot = Readonly<{
  filter: ReadAttachmentPurposeMetadataSnapshotOptions;
  items: readonly LocalAttachmentMetadata[];
  scannedCount: number;
  scannedEncodedCharacters: number;
  matchedDeclaredBytes: number;
  contentIntegrityVerified: false;
  coverage: "complete";
  atomicStorageSnapshotVerified: true;
}>;

export type ReadAttachmentMetadataPageOptions = Readonly<{
  offset?: number;
  /** Scan rows per call, not a promise that this many purpose matches exist. */
  limit?: number;
  /** Uses the declared mediaType index before any attachment values are read. */
  mediaType?: string;
  /** Exact purpose filter applied before the full attachment Schema parse. */
  description?: string;
  /** When true, only records whose stored link value is exactly null are purpose matches. */
  unlinkedOnly?: boolean;
  /** Bounded work budget measured in contentBase64 UTF-16 code units. */
  maxEncodedCharacters?: number;
}>;

const LOCAL_ATTACHMENT_METADATA_PAGE_LIMIT = 16;
const LOCAL_ATTACHMENT_METADATA_PAGE_MAX_ENCODED_CHARACTERS = 32 * 1024 * 1024;
const LOCAL_ATTACHMENT_CONTRACT_MAX_ENCODED_CHARACTERS = 4 * Math.ceil(MAX_LOCAL_ATTACHMENT_BYTES / 3);
const LOCAL_ATTACHMENT_MEDIA_TYPE_PATTERN =
  /^[a-z0-9][a-z0-9!#$&^_.+-]{0,126}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,126}$/;

type NormalizedAttachmentMetadataPageOptions = Readonly<{
  offset: number;
  limit: number;
  mediaType: string | undefined;
  description: string | undefined;
  unlinkedOnly: boolean;
  maxEncodedCharacters: number;
}>;

function normalizeAttachmentMetadataPageOptions(
  options: ReadAttachmentMetadataPageOptions
): NormalizedAttachmentMetadataPageOptions {
  const offset = options.offset ?? 0;
  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw new RangeError("Attachment metadata page offset must be a non-negative safe integer.");
  }
  const limit = options.limit ?? LOCAL_ATTACHMENT_METADATA_PAGE_LIMIT;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > LOCAL_ATTACHMENT_METADATA_PAGE_LIMIT) {
    throw new RangeError(`Attachment metadata page limit must be an integer between 1 and ${LOCAL_ATTACHMENT_METADATA_PAGE_LIMIT}.`);
  }
  const maxEncodedCharacters = options.maxEncodedCharacters ??
    LOCAL_ATTACHMENT_METADATA_PAGE_MAX_ENCODED_CHARACTERS;
  if (
    !Number.isSafeInteger(maxEncodedCharacters) ||
    maxEncodedCharacters < 1 ||
    maxEncodedCharacters > LOCAL_ATTACHMENT_METADATA_PAGE_MAX_ENCODED_CHARACTERS
  ) {
    throw new RangeError(
      `Attachment metadata encoded-character budget must be an integer between 1 and ${LOCAL_ATTACHMENT_METADATA_PAGE_MAX_ENCODED_CHARACTERS}.`
    );
  }
  const { mediaType, description } = options;
  if (mediaType !== undefined && (
    typeof mediaType !== "string" ||
    !LOCAL_ATTACHMENT_MEDIA_TYPE_PATTERN.test(mediaType)
  )) {
    throw new TypeError("Attachment metadata mediaType filter must be a canonical MIME type.");
  }
  if (description !== undefined && (
    typeof description !== "string" ||
    description.length > 2_000 ||
    description !== description.trim()
  )) {
    throw new TypeError("Attachment metadata description filter must be canonical text of at most 2000 characters.");
  }
  const unlinkedOnly = options.unlinkedOnly ?? false;
  if (typeof unlinkedOnly !== "boolean") {
    throw new TypeError("Attachment metadata unlinkedOnly filter must be a boolean.");
  }
  return { offset, limit, mediaType, description, unlinkedOnly, maxEncodedCharacters };
}

function storedAttachmentEncodedCharacterLength(input: unknown): number {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new TypeError("Stored attachment must be an object.");
  }
  const descriptor = Object.getOwnPropertyDescriptor(input, "contentBase64");
  if (!descriptor || !("value" in descriptor) || typeof descriptor.value !== "string") {
    throw new TypeError("Stored attachment contentBase64 must be an own data string.");
  }
  const length = descriptor.value.length;
  if (length > LOCAL_ATTACHMENT_CONTRACT_MAX_ENCODED_CHARACTERS) {
    throw new RangeError("Stored attachment exceeds the contract Base64 character limit.");
  }
  return length;
}

function storedAttachmentMatchesMetadataPurpose(
  input: unknown,
  options: Pick<NormalizedAttachmentMetadataPageOptions, "description" | "unlinkedOnly">
): boolean {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  if (options.description !== undefined) {
    const descriptor = Object.getOwnPropertyDescriptor(input, "description");
    if (!descriptor || !("value" in descriptor) || descriptor.value !== options.description) return false;
  }
  if (options.unlinkedOnly) {
    const descriptor = Object.getOwnPropertyDescriptor(input, "link");
    if (!descriptor || !("value" in descriptor) || descriptor.value !== null) return false;
  }
  return true;
}

function localAttachmentMetadata(record: LocalAttachmentRecord): LocalAttachmentMetadata {
  const { contentBase64: _discardedContentBase64, ...metadata } = record;
  void _discardedContentBase64;
  return { ...metadata, contentIntegrity: "unchecked" };
}

async function prepareLocalAttachmentRecord(
  input: CreateAttachmentInput,
  now: () => string
): Promise<LocalAttachmentRecord> {
  if (!ArrayBuffer.isView(input.bytes) || Object.prototype.toString.call(input.bytes) !== "[object Uint8Array]") {
    throw new TypeError("Attachment bytes must be a Uint8Array.");
  }
  if (input.bytes.byteLength > MAX_LOCAL_ATTACHMENT_BYTES) {
    throw new RangeError(`Attachment cannot exceed ${MAX_LOCAL_ATTACHMENT_BYTES} bytes.`);
  }
  const bytes = Uint8Array.from(input.bytes);
  const [contentHash, contentBase64] = await Promise.all([
    sha256BytesHex(bytes),
    Promise.resolve(encodeCanonicalBase64(bytes))
  ]);
  const timestamp = now();
  return localAttachmentRecordSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    recordVersion: LOCAL_ATTACHMENT_RECORD_VERSION,
    recordType: "local_attachment",
    id: crypto.randomUUID(),
    fileName: input.fileName,
    mediaType: input.mediaType,
    byteLength: bytes.byteLength,
    contentBase64,
    contentHash,
    description: input.description ?? "",
    link: input.link ?? null,
    createdAt: timestamp,
    updatedAt: timestamp
  });
}

export class DuplicateBirthFingerprintError extends Error {
  readonly code = "DUPLICATE_BIRTH_FINGERPRINT" as const;

  constructor(readonly fingerprint: string) {
    super("A record with the same canonical birth input already exists.");
    this.name = "DuplicateBirthFingerprintError";
  }
}

export type RuleRegistryErrorCode =
  | "RULE_PACK_NOT_FOUND"
  | "RULE_PACK_VERSION_CONFLICT"
  | "RULE_PACK_DIGEST_COLLISION"
  | "ACTIVE_RULE_PACK_DANGLING_REFERENCE"
  | "ACTIVE_RULE_PACK_PROFILE_DIGEST_MISMATCH"
  | "ACTIVE_RULE_PACK_DELETE_FORBIDDEN"
  | "MULTIPLE_ACTIVE_RULE_PACK_RECORDS"
  | "RULE_REGISTRY_RECORD_TYPE_MISMATCH";

export class RuleRegistryError extends Error {
  constructor(readonly code: RuleRegistryErrorCode, message: string) {
    super(message);
    this.name = "RuleRegistryError";
  }
}

function parseInstalledRulePackRecord(input: unknown): InstalledRulePackRecord {
  const record = localRuleRegistryRecordSchema.parse(input);
  if (record.recordType !== "installed_rule_pack") {
    throw new RuleRegistryError(
      "RULE_REGISTRY_RECORD_TYPE_MISMATCH",
      `Rule registry record ${record.id} is not an installed rule pack.`
    );
  }
  return record;
}

function parseActiveRulePackRecord(input: unknown): ActiveRulePackRecord {
  const record = localRuleRegistryRecordSchema.parse(input);
  if (record.recordType !== "active_rule_pack") {
    throw new RuleRegistryError(
      "RULE_REGISTRY_RECORD_TYPE_MISMATCH",
      `Rule registry record ${record.id} is not an active rule-pack selector.`
    );
  }
  return record;
}

function sameInstalledRulePackContent(
  left: InstalledRulePackRecord,
  right: InstalledRulePackRecord
): boolean {
  return (
    left.schemaVersion === right.schemaVersion &&
    left.recordVersion === right.recordVersion &&
    left.id === right.id &&
    left.packDigest === right.packDigest &&
    left.profileDigest === right.profileDigest &&
    left.packId === right.packId &&
    left.profileId === right.profileId &&
    left.profileVersion === right.profileVersion &&
    left.canonicalJson === right.canonicalJson &&
    left.localTrust === right.localTrust
  );
}

function assertActiveRulePackTarget(
  active: ActiveRulePackRecord,
  installed: InstalledRulePackRecord | undefined
): void {
  if (!installed) {
    throw new RuleRegistryError(
      "ACTIVE_RULE_PACK_DANGLING_REFERENCE",
      `Active rule pack ${active.activeDigest} is not installed.`
    );
  }
  if (installed.profileDigest !== active.activeProfileDigest) {
    throw new RuleRegistryError(
      "ACTIVE_RULE_PACK_PROFILE_DIGEST_MISMATCH",
      `Active profile digest does not match installed rule pack ${active.activeDigest}.`
    );
  }
}

function parseAndValidateRuleRegistryRecords(
  records: readonly unknown[]
): LocalRuleRegistryRecord[] {
  const parsed = records.map((record) => localRuleRegistryRecordSchema.parse(record));
  const installedByDigest = new Map<string, InstalledRulePackRecord>();
  const installedByVersion = new Map<string, InstalledRulePackRecord>();
  let active: ActiveRulePackRecord | undefined;

  for (const record of parsed) {
    if (record.recordType === "active_rule_pack") {
      if (active) {
        throw new RuleRegistryError(
          "MULTIPLE_ACTIVE_RULE_PACK_RECORDS",
          "Rule registry contains more than one active selector."
        );
      }
      active = record;
      continue;
    }

    if (installedByDigest.has(record.packDigest)) {
      throw new RuleRegistryError(
        "RULE_PACK_DIGEST_COLLISION",
        `Rule registry contains duplicate digest ${record.packDigest}.`
      );
    }
    const versionKey = `${record.packId}\u0000${record.profileVersion}`;
    const sameVersion = installedByVersion.get(versionKey);
    if (sameVersion) {
      throw new RuleRegistryError(
        "RULE_PACK_VERSION_CONFLICT",
        `Rule pack ${record.packId}@${record.profileVersion} already uses digest ${sameVersion.packDigest}.`
      );
    }
    installedByDigest.set(record.packDigest, record);
    installedByVersion.set(versionKey, record);
  }

  if (active) assertActiveRulePackTarget(active, installedByDigest.get(active.activeDigest));
  return parsed;
}

export type LocalAttachmentIntegrityErrorCode =
  | "ATTACHMENT_NOT_FOUND"
  | "ATTACHMENT_CHANGED"
  | "CONTENT_HASH_MISMATCH"
  | "LINK_TARGET_NOT_FOUND"
  | "LINK_CONTEXT_MISMATCH";

export class LocalAttachmentIntegrityError extends Error {
  constructor(readonly code: LocalAttachmentIntegrityErrorCode, message: string) {
    super(message);
    this.name = "LocalAttachmentIntegrityError";
  }
}

export class DuplicateKnowledgeDocumentError extends Error {
  readonly code = "DUPLICATE_KNOWLEDGE_CONTENT" as const;

  constructor(readonly contentHash = "") {
    super(contentHash
      ? `A knowledge document with content hash ${contentHash} already exists.`
      : "The knowledge snapshot contains duplicate document content hashes.");
    this.name = "DuplicateKnowledgeDocumentError";
  }
}

export type KnowledgeRepositoryErrorCode =
  | "DOCUMENT_NOT_FOUND"
  | "CITATION_NOT_FOUND"
  | "KNOWLEDGE_INTEGRITY_COVERAGE_CONFLICT"
  | "KNOWLEDGE_INTEGRITY_DATABASE_NOT_OPEN"
  | "SOURCE_RIGHTS_NOT_FOUND"
  | "SOURCE_RIGHTS_CONFLICT"
  | "SOURCE_RIGHTS_UPDATE_FORBIDDEN"
  | "SOURCE_AWARE_RETRIEVAL_BOUNDARY_MISMATCH"
  | "SOURCE_AWARE_RETRIEVAL_DATABASE_NOT_OPEN"
  | "SOURCE_AWARE_RETRIEVAL_RESOURCE_LIMIT_EXCEEDED"
  | "SOURCE_AWARE_RETRIEVAL_SNAPSHOT_REVALIDATION_FAILED"
  | "SOURCE_AWARE_RETRIEVAL_SNAPSHOT_STALE"
  | "CITATION_REVIEW_WORKSET_BOUNDARY_MISMATCH"
  | "CITATION_REVIEW_WORKSET_TARGET_SCHEMA_MISMATCH"
  | "CITATION_REVIEW_WORKSET_SNAPSHOT_REVALIDATION_FAILED"
  | "CITATION_REVIEW_WORKSET_SNAPSHOT_STALE"
  | "EDIT_VERSION_CONFLICT"
  | "TARGET_NOT_FOUND"
  | "TARGET_CONTEXT_MISMATCH";

export class KnowledgeRepositoryError extends Error {
  constructor(readonly code: KnowledgeRepositoryErrorCode, message: string) {
    super(message);
    this.name = "KnowledgeRepositoryError";
  }
}

export type FormalComparisonSourceErrorCode =
  | "MISSING_CASE"
  | "MISSING_REVISION"
  | "CROSS_CASE_REVISION"
  | "CASE_BUNDLE_INTEGRITY_MISMATCH";

export class FormalComparisonSourceError extends Error {
  constructor(
    readonly code: FormalComparisonSourceErrorCode,
    message: string
  ) {
    super(message);
    this.name = "FormalComparisonSourceError";
  }
}

export type SingleChartExportSnapshot = {
  caseRecord: CaseRecord;
  revision: RevisionRecord;
  revisionCalculationReceiptLedgerStatus: "available" | "schema_unavailable";
  revisionCalculationReceipts: RevisionCalculationReceipt[];
  researchNotes: ResearchNoteRecord[];
  events: EventRecord[];
  eventTimeMigrationReceipts: EventTimeMigrationReceipt[];
  citations: CitationRecord[];
  knowledgeDocuments: KnowledgeDocumentRecord[];
  sourceRights: SourceRightsRecord[];
};

function isSingleChartNote(note: ResearchNoteRecord, revisionId: string): boolean {
  return note.anchor.kind === "case" || note.anchor.revisionId === revisionId;
}

function isSingleChartEvent(event: EventRecord, revisionId: string): boolean {
  return event.revisionId === null || event.revisionId === revisionId;
}

function isSingleChartCitationTarget(
  target: CitationTarget,
  caseId: string,
  revisionId: string,
  noteIds: ReadonlySet<string>,
  eventIds: ReadonlySet<string>
): boolean {
  if (target.kind === "research_note") return noteIds.has(target.noteId);
  if (target.kind === "event") return eventIds.has(target.eventId);
  if (target.kind === "chart_field") {
    return target.caseId === caseId && target.revisionId === revisionId;
  }
  if (isReservedSingleChartReportEvidenceSubjectId(target.subjectId)
    && !isSingleChartReportEvidenceSubjectId(target.subjectId)) {
    throw new KnowledgeRepositoryError(
      "TARGET_NOT_FOUND",
      `Citation references unknown reserved evidence subject ${target.subjectId}.`
    );
  }
  return isSingleChartReportEvidenceSubjectId(target.subjectId);
}

function assertCaseBundleRelationship(caseRecord: CaseRecord, revisions: readonly RevisionRecord[]): void {
  const ordered = [...revisions].sort((left, right) => left.revisionNumber - right.revisionNumber);
  if (
    ordered.length !== caseRecord.revisionCount ||
    ordered.some((revision, index) => revision.caseId !== caseRecord.id || revision.revisionNumber !== index + 1) ||
    ordered.at(-1)?.id !== caseRecord.latestRevisionId
  ) {
    throw new FormalComparisonSourceError(
      "CASE_BUNDLE_INTEGRITY_MISMATCH",
      `案例 ${caseRecord.id} 的修订数量、连续序号、归属或 latestRevisionId 不一致。`
    );
  }
}

const unsafePathSegments = new Set(["__proto__", "prototype", "constructor"]);

function hasOwnDataPath(root: unknown, path: string): boolean {
  let current: unknown = root;
  for (const segment of path.split(".")) {
    if (unsafePathSegments.has(segment) || current === null || typeof current !== "object") return false;
    if (!Object.prototype.hasOwnProperty.call(current, segment)) return false;
    current = (current as Record<string, unknown>)[segment];
  }
  return current !== undefined;
}

function sameJsonValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function candidateSetTzdbDerivationBoundaryMismatch(
  source: UnknownHourCandidateResult,
  target: UnknownHourCandidateResult
): Exclude<CandidateSetTzdbMigrationErrorCode, "SOURCE_NOT_FOUND" | "SOURCE_DELETED" | "SOURCE_SNAPSHOT_CHANGED" | "TARGET_TZDB_ALREADY_DERIVED" | "RECEIPT_RELATION_MISMATCH"> | null {
  if (target.tzdbVersion === source.tzdbVersion) return "SAME_TZDB";
  if (!sameJsonValue(target.input, source.input)) return "INPUT_CHANGED";
  if (
    !sameJsonValue(target.ruleProfile, source.ruleProfile) ||
    target.ruleProfileDigest !== source.ruleProfileDigest
  ) return "RULE_CHANGED";
  if (!sameJsonValue(target.rulePackBinding, source.rulePackBinding)) return "BINDING_CHANGED";
  if (!sameJsonValue({
    kind: target.kind,
    verificationStatus: target.verificationStatus,
    algorithmId: target.algorithmId,
    probeDefinitionVersion: target.probeDefinitionVersion,
    engine: target.engine,
    probeCount: target.probeCount
  }, {
    kind: source.kind,
    verificationStatus: source.verificationStatus,
    algorithmId: source.algorithmId,
    probeDefinitionVersion: source.probeDefinitionVersion,
    engine: source.engine,
    probeCount: source.probeCount
  })) return "ALGORITHM_CHANGED";
  return null;
}

function candidateSetTzdbBoundaryMessage(code: NonNullable<ReturnType<typeof candidateSetTzdbDerivationBoundaryMismatch>>): string {
  if (code === "SAME_TZDB") return "The target must use a different tzdb snapshot.";
  if (code === "INPUT_CHANGED") return "Tzdb derivation cannot change the birth input.";
  if (code === "RULE_CHANGED") return "Tzdb derivation cannot change the rule profile.";
  if (code === "BINDING_CHANGED") return "Tzdb derivation cannot change the rule-pack binding.";
  return "Tzdb derivation cannot change the probe algorithm.";
}

function candidateSetTargetSnapshotIssue(
  target: UnknownHourCandidateResult,
  expectedTargetSnapshotId: string
): {
  code: Extract<
    CandidateSetTzdbMigrationErrorCode,
    | "TARGET_TZDB_EXPECTATION_MISMATCH"
    | "TARGET_TZDB_ARTIFACT_UNAVAILABLE"
    | "TARGET_TZDB_DESCRIPTOR_MISMATCH"
    | "TARGET_TZDB_LEGACY_UNIDENTIFIED"
  >;
  message: string;
} | null {
  if (target.tzdbVersion !== expectedTargetSnapshotId) {
    return {
      code: "TARGET_TZDB_EXPECTATION_MISMATCH",
      message: `Expected target snapshot ${expectedTargetSnapshotId}, received ${target.tzdbVersion}.`
    };
  }
  const replayStatus = classifyStoredTimeZoneDatabaseForReplay(target);
  if (replayStatus === "legacy_unidentified") {
    return {
      code: "TARGET_TZDB_LEGACY_UNIDENTIFIED",
      message: "A tzdb derivation target must bind an identified bundled artifact."
    };
  }
  if (replayStatus === "artifact_unavailable") {
    return {
      code: "TARGET_TZDB_ARTIFACT_UNAVAILABLE",
      message: `Target snapshot ${target.tzdbVersion} is not retained in the bundled artifact registry.`
    };
  }
  if (replayStatus === "descriptor_mismatch") {
    return {
      code: "TARGET_TZDB_DESCRIPTOR_MISMATCH",
      message: `Target snapshot ${target.tzdbVersion} does not exactly match its bundled registry descriptor.`
    };
  }
  return null;
}

function connectedTzdbLineageRecordIds(
  startRecordId: string,
  receipts: readonly TzdbMigrationReceipt[]
): Set<string> {
  const adjacency = new Map<string, Set<string>>();
  for (const receipt of receipts) {
    const sourceEdges = adjacency.get(receipt.source.recordId) ?? new Set<string>();
    const targetEdges = adjacency.get(receipt.target.recordId) ?? new Set<string>();
    sourceEdges.add(receipt.target.recordId);
    targetEdges.add(receipt.source.recordId);
    adjacency.set(receipt.source.recordId, sourceEdges);
    adjacency.set(receipt.target.recordId, targetEdges);
  }
  const connected = new Set<string>([startRecordId]);
  const queue = [startRecordId];
  while (queue.length > 0) {
    const recordId = queue.shift()!;
    for (const neighbor of adjacency.get(recordId) ?? []) {
      if (connected.has(neighbor)) continue;
      connected.add(neighbor);
      queue.push(neighbor);
    }
  }
  return connected;
}

function assertTzdbLineageGraph(
  receipts: readonly TzdbMigrationReceipt[],
  candidateSetById: ReadonlyMap<string, CandidateSetRecord>
): void {
  const directed = new Map<string, string[]>();
  for (const receipt of receipts) {
    const targets = directed.get(receipt.source.recordId) ?? [];
    targets.push(receipt.target.recordId);
    directed.set(receipt.source.recordId, targets);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (recordId: string): void => {
    if (visiting.has(recordId)) {
      throw new CandidateSetTzdbMigrationError(
        "RECEIPT_RELATION_MISMATCH",
        `CandidateSet tzdb lineage contains a directed record cycle at ${recordId}.`
      );
    }
    if (visited.has(recordId)) return;
    visiting.add(recordId);
    for (const targetId of directed.get(recordId) ?? []) visit(targetId);
    visiting.delete(recordId);
    visited.add(recordId);
  };
  for (const recordId of directed.keys()) visit(recordId);

  const allLineageIds = new Set(receipts.flatMap((receipt) => [receipt.source.recordId, receipt.target.recordId]));
  const inspected = new Set<string>();
  for (const recordId of allLineageIds) {
    if (inspected.has(recordId)) continue;
    const component = connectedTzdbLineageRecordIds(recordId, receipts);
    const tzdbOwners = new Map<string, string>();
    const resultOwners = new Map<string, string>();
    const snapshotOwners = new Map<string, string>();
    for (const componentId of component) {
      inspected.add(componentId);
      const record = candidateSetById.get(componentId);
      if (!record) continue;
      for (const [identity, owners, label] of [
        [record.candidateSet.tzdbVersion, tzdbOwners, "tzdb snapshot"],
        [record.candidateSet.resultHash, resultOwners, "result hash"],
        [record.snapshotDigest, snapshotOwners, "snapshot digest"]
      ] as const) {
        const previous = owners.get(identity);
        if (previous) {
          throw new CandidateSetTzdbMigrationError(
            "RECEIPT_RELATION_MISMATCH",
            `CandidateSet tzdb lineage reuses ${label} ${identity} at ${previous} and ${componentId}.`
          );
        }
        owners.set(identity, componentId);
      }
    }
  }
}

async function verifyTzdbMigrationReceiptRelationships(
  rawReceipts: readonly unknown[],
  candidateSets: readonly CandidateSetRecord[]
): Promise<TzdbMigrationReceipt[]> {
  const candidateSetById = new Map(candidateSets.map((record) => [record.id, record]));
  const receipts = rawReceipts.map((rawReceipt) => tzdbMigrationReceiptSchema.parse(rawReceipt));
  const receiptByTargetId = new Map<string, string>();
  const receiptBySourceAndTargetTzdb = new Map<string, string>();
  for (const receipt of receipts) {
    const existingTargetReceipt = receiptByTargetId.get(receipt.target.recordId);
    if (existingTargetReceipt) {
      throw new CandidateSetTzdbMigrationError(
        "RECEIPT_RELATION_MISMATCH",
        `CandidateSet ${receipt.target.recordId} is the target of both ${existingTargetReceipt} and ${receipt.id}.`
      );
    }
    receiptByTargetId.set(receipt.target.recordId, receipt.id);
    const sourceTargetTzdbKey = `${receipt.source.recordId}\u0000${receipt.target.tzdbVersion}`;
    const existingSourceTargetReceipt = receiptBySourceAndTargetTzdb.get(sourceTargetTzdbKey);
    if (existingSourceTargetReceipt) {
      throw new CandidateSetTzdbMigrationError(
        "RECEIPT_RELATION_MISMATCH",
        `CandidateSet ${receipt.source.recordId} has duplicate ${receipt.target.tzdbVersion} migrations.`
      );
    }
    receiptBySourceAndTargetTzdb.set(sourceTargetTzdbKey, receipt.id);
  }
  const verified = await Promise.all(receipts.map(async (receipt) => {
    const source = candidateSetById.get(receipt.source.recordId);
    const target = candidateSetById.get(receipt.target.recordId);
    if (!source || !target) {
      throw new CandidateSetTzdbMigrationError(
        "RECEIPT_RELATION_MISMATCH",
        `Tzdb migration receipt ${receipt.id} references a missing CandidateSet.`
      );
    }
    for (const [endpoint, record] of [[receipt.source, source], [receipt.target, target]] as const) {
      if (
        endpoint.kind !== "candidate_set" ||
        endpoint.snapshotDigest !== record.snapshotDigest ||
        endpoint.resultHash !== record.candidateSet.resultHash ||
        endpoint.tzdbVersion !== record.candidateSet.tzdbVersion
      ) {
        throw new CandidateSetTzdbMigrationError(
          "RECEIPT_RELATION_MISMATCH",
          `Tzdb migration receipt ${receipt.id} does not match CandidateSet ${record.id}.`
        );
      }
    }
    const targetSnapshotIssue = candidateSetTargetSnapshotIssue(
      target.candidateSet,
      receipt.target.tzdbVersion
    );
    if (targetSnapshotIssue !== null) {
      throw new CandidateSetTzdbMigrationError(
        "RECEIPT_RELATION_MISMATCH",
        `Tzdb migration receipt ${receipt.id} has an unsafe target artifact: ${targetSnapshotIssue.code}.`
      );
    }
    const boundaryMismatch = candidateSetTzdbDerivationBoundaryMismatch(source.candidateSet, target.candidateSet);
    if (boundaryMismatch !== null) {
      throw new CandidateSetTzdbMigrationError(
        "RECEIPT_RELATION_MISMATCH",
        `Tzdb migration receipt ${receipt.id} crosses the immutable derivation boundary: ${boundaryMismatch}.`
      );
    }
    const comparison = receipt.comparison.formatVersion === "1.0.0"
      ? buildLegacyCandidateSetTzdbComparison(source.candidateSet, target.candidateSet)
      : buildCandidateSetTzdbComparison(source.candidateSet, target.candidateSet);
    const comparisonDigest = await sha256Hex(comparison);
    if (!sameJsonValue(receipt.comparison, comparison) || receipt.comparisonDigest !== comparisonDigest) {
      throw new CandidateSetTzdbMigrationError(
        "RECEIPT_RELATION_MISMATCH",
        `Tzdb migration receipt ${receipt.id} comparison cannot be reproduced.`
      );
    }
    return receipt;
  }));
  assertTzdbLineageGraph(receipts, candidateSetById);
  return verified;
}

function resolveEventTimeMigrationInterpretation(
  snapshot: EventTimeMigrationSnapshot,
  interpretation: EventTimeMigrationInterpretation
): EventRecord["timeContext"] {
  if (interpretation.kind === "calendar_date") {
    return resolveEventTimeContext({
      datePrecision: snapshot.datePrecision,
      startDate: snapshot.startDate,
      endDate: snapshot.endDate
    });
  }
  return resolveEventTimeContext({
    datePrecision: snapshot.datePrecision,
    startDate: snapshot.startDate,
    endDate: snapshot.endDate,
    timeZone: interpretation.timeZone,
    startDisambiguation: interpretation.startDisambiguation,
    endDisambiguation: interpretation.endDisambiguation ?? undefined
  });
}

function canonicalEventTimeMigrationInterpretation(
  timeContext: Exclude<EventRecord["timeContext"], { kind: "legacy_floating" }>
): EventTimeMigrationInterpretation {
  if (timeContext.kind === "calendar_date") return { kind: "calendar_date" };
  return {
    kind: "zoned_minute",
    timeZone: timeContext.timeZone,
    startDisambiguation: timeContext.start.resolution.policy,
    endDisambiguation: timeContext.end?.resolution.policy ?? null
  };
}

export type EventTimeMigrationReceiptReplayStatus = Readonly<{
  receiptId: string;
  targetStatus: EventTimeContextVerificationStatus;
}>;

export type EventTimeMigrationReceiptRelationshipVerification = Readonly<{
  receipts: EventTimeMigrationReceipt[];
  replayStatuses: EventTimeMigrationReceiptReplayStatus[];
}>;

/**
 * Verifies immutable endpoint relationships for stored receipts. A bundled
 * descriptor is replayed exactly through its own resolver; an unavailable or
 * unidentified artifact remains explicitly structural and is never retried
 * against the active resolver.
 */
export async function verifyEventTimeMigrationReceiptRelationshipsWithStatus(
  rawReceipts: readonly unknown[],
  events: readonly EventRecord[]
): Promise<EventTimeMigrationReceiptRelationshipVerification> {
  const eventById = new Map(events.map((record) => [record.id, record]));
  const receipts = rawReceipts.map((rawReceipt) =>
    storedEventTimeMigrationReceiptSchema.parse(rawReceipt)
  );
  const claimedTargets = new Map<string, string>();
  const claimedInterpretations = new Map<string, string>();
  const replayStatuses: EventTimeMigrationReceiptReplayStatus[] = [];

  for (const receipt of receipts) {
    const previousTarget = claimedTargets.get(receipt.target.recordId);
    if (previousTarget) {
      throw new EventTimeMigrationError(
        "RECEIPT_RELATION_MISMATCH",
        `Event ${receipt.target.recordId} is the target of both ${previousTarget} and ${receipt.id}.`
      );
    }
    claimedTargets.set(receipt.target.recordId, receipt.id);
    const interpretationKey = `${receipt.source.recordId}\u0000${receipt.target.snapshotDigest}`;
    const previousInterpretation = claimedInterpretations.get(interpretationKey);
    if (previousInterpretation) {
      throw new EventTimeMigrationError(
        "RECEIPT_RELATION_MISMATCH",
        `Event ${receipt.source.recordId} has duplicate semantic derivations ${previousInterpretation} and ${receipt.id}.`
      );
    }
    claimedInterpretations.set(interpretationKey, receipt.id);

    const source = eventById.get(receipt.source.recordId);
    const target = eventById.get(receipt.target.recordId);
    if (!source || !target) {
      throw new EventTimeMigrationError(
        "RECEIPT_RELATION_MISMATCH",
        `Event time migration receipt ${receipt.id} references a missing endpoint.`
      );
    }
    for (const [endpoint, record] of [[receipt.source, source], [receipt.target, target]] as const) {
      const liveSnapshot = buildEventTimeMigrationSnapshot(record);
      const storedDigest = await sha256Hex(endpoint.snapshot);
      if (
        storedDigest !== endpoint.snapshotDigest ||
        !sameJsonValue(liveSnapshot, endpoint.snapshot)
      ) {
        throw new EventTimeMigrationError(
          "RECEIPT_RELATION_MISMATCH",
          `Event time migration receipt ${receipt.id} does not match Event ${record.id}.`
        );
      }
    }
    if (target.createdAt !== receipt.createdAt) {
      throw new EventTimeMigrationError(
        "RECEIPT_RELATION_MISMATCH",
        `Event time migration receipt ${receipt.id} does not preserve its target creation boundary.`
      );
    }

    const targetTimeContext = receipt.target.snapshot.timeContext;
    if (targetTimeContext.kind === "legacy_floating") {
      throw new EventTimeMigrationError(
        "RECEIPT_RELATION_MISMATCH",
        `Event time migration receipt ${receipt.id} cannot target legacy_floating semantics.`
      );
    }
    if (!sameJsonValue(
      canonicalEventTimeMigrationInterpretation(targetTimeContext),
      receipt.interpretation
    )) {
      throw new EventTimeMigrationError(
        "RECEIPT_RELATION_MISMATCH",
        `Event time migration receipt ${receipt.id} interpretation does not match its frozen target fields and policies.`
      );
    }

    try {
      const verification = await verifyStoredEventTimeContextWithBundledArtifact({
        datePrecision: receipt.target.snapshot.datePrecision,
        startDate: receipt.target.snapshot.startDate,
        endDate: receipt.target.snapshot.endDate,
        timeContext: targetTimeContext
      });
      replayStatuses.push({ receiptId: receipt.id, targetStatus: verification.status });
    } catch (cause) {
      throw new EventTimeMigrationError(
        "RECEIPT_RELATION_MISMATCH",
        `Event time migration receipt ${receipt.id} cannot verify its stored target against the selected historical artifact.${cause instanceof Error ? ` ${cause.message}` : ""}`
      );
    }
  }
  return { receipts, replayStatuses };
}

async function verifyEventTimeMigrationReceiptRelationships(
  rawReceipts: readonly unknown[],
  events: readonly EventRecord[]
): Promise<EventTimeMigrationReceipt[]> {
  return (await verifyEventTimeMigrationReceiptRelationshipsWithStatus(rawReceipts, events)).receipts;
}

function canonicalFullDataSnapshotForDigest(snapshot: FullBackupPayload): FullBackupPayload {
  const compare = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;
  return {
    cases: [...snapshot.cases].sort((left, right) => compare(left.id, right.id)),
    revisions: [...snapshot.revisions].sort((left, right) =>
      compare(left.caseId, right.caseId) || left.revisionNumber - right.revisionNumber || compare(left.id, right.id)
    ),
    candidateSets: [...snapshot.candidateSets].sort((left, right) => compare(left.id, right.id)),
    researchNotes: [...snapshot.researchNotes].sort((left, right) =>
      compare(left.caseId, right.caseId) || compare(left.id, right.id)
    ),
    events: [...snapshot.events].sort((left, right) =>
      compare(left.caseId, right.caseId) || compare(left.id, right.id)
    ),
    savedViews: [...snapshot.savedViews].sort((left, right) => compare(left.id, right.id)),
    knowledgeDocuments: [...snapshot.knowledgeDocuments].sort((left, right) => compare(left.id, right.id)),
    citations: [...snapshot.citations].sort((left, right) =>
      compare(left.documentId, right.documentId) ||
      left.locator.startLine - right.locator.startLine ||
      left.locator.endLine - right.locator.endLine ||
      compare(left.id, right.id)
    ),
    sourceRights: [...snapshot.sourceRights].sort((left, right) => compare(left.documentId, right.documentId)),
    attachments: [...snapshot.attachments].sort((left, right) => compare(left.id, right.id)),
    researcherProfiles: [...snapshot.researcherProfiles].sort((left, right) => compare(left.id, right.id)),
    appSettings: [...snapshot.appSettings].sort((left, right) => compare(left.id, right.id)),
    ruleRegistry: [...snapshot.ruleRegistry].sort((left, right) => compare(left.id, right.id)),
    tzdbMigrationReceipts: [...snapshot.tzdbMigrationReceipts].sort((left, right) =>
      compare(left.createdAt, right.createdAt) || compare(left.id, right.id)
    ),
    eventTimeMigrationReceipts: [...snapshot.eventTimeMigrationReceipts].sort((left, right) =>
      compare(left.createdAt, right.createdAt) || compare(left.id, right.id)
    ),
    revisionCalculationReceipts: [...snapshot.revisionCalculationReceipts].sort((left, right) =>
      compare(left.createdAt, right.createdAt) || compare(left.id, right.id)
    )
  };
}

type DeclarativeSnapshotFrame = {
  target: object;
  entries: Array<readonly [string, unknown]>;
  nextEntry: number;
  state: { target: object; visiting: boolean };
  depth: number;
};

type DeclarativeCaptureLimits = Readonly<{
  maxDepth: number;
  maxTextCharacters: number;
  maxValueNodes: number;
}>;

function declarativeSnapshotPrimitive(value: unknown): value is null | boolean | number | string {
  return value === null
    || typeof value === "boolean"
    || typeof value === "string"
    || (typeof value === "number" && Number.isFinite(value));
}

/**
 * Takes an accessor-free synchronous own-data copy before validation can yield.
 * JavaScript cannot reliably identify a Proxy, so reflection traps may run;
 * ordinary accessor property values are never obtained through property access.
 */
function captureDeclarativeOwnData(
  input: unknown,
  subject: string,
  limits?: DeclarativeCaptureLimits
): unknown {
  if (declarativeSnapshotPrimitive(input) || typeof input !== "object") {
    throw new TypeError(`${subject} must be an ordinary JSON object.`);
  }

  const states = new WeakMap<object, { target: object; visiting: boolean }>();
  let textCharacters = 0;
  let valueNodes = 1;
  const assertResourceLimits = (): void => {
    if (!limits) return;
    if (textCharacters > limits.maxTextCharacters) {
      throw new TypeError(`${subject} exceeds ${limits.maxTextCharacters} text characters.`);
    }
    if (valueNodes > limits.maxValueNodes) {
      throw new TypeError(`${subject} exceeds ${limits.maxValueNodes} value nodes.`);
    }
  };
  const accountEntry = (key: string, value: unknown): void => {
    if (!limits) return;
    textCharacters += key.length + (typeof value === "string" ? value.length : 0);
    assertResourceLimits();
  };
  const createFrame = (source: object, depth: number): DeclarativeSnapshotFrame => {
    if (limits && depth > limits.maxDepth) {
      throw new TypeError(`${subject} exceeds maximum depth ${limits.maxDepth}.`);
    }
    const ownKeys = Reflect.ownKeys(source);
    if (limits) {
      const dataKeyCount = Array.isArray(source)
        ? ownKeys.reduce((count, key) => count + (key === "length" ? 0 : 1), 0)
        : ownKeys.length;
      valueNodes += dataKeyCount * 2;
      assertResourceLimits();
    }
    const descriptors = Object.getOwnPropertyDescriptors(source);
    const entries: Array<readonly [string, unknown]> = [];
    let target: object;

    if (Array.isArray(source)) {
      if (Object.getPrototypeOf(source) !== Array.prototype) {
        throw new TypeError(`${subject} arrays must have the ordinary Array prototype.`);
      }
      const lengthDescriptor = descriptors.length;
      if (!lengthDescriptor || !Object.hasOwn(lengthDescriptor, "value")) {
        throw new TypeError(`${subject} arrays must expose an own data length.`);
      }
      const length = lengthDescriptor.value as unknown;
      if (!Number.isSafeInteger(length) || (length as number) < 0 || (length as number) > 0xffff_ffff) {
        throw new TypeError(`${subject} arrays must have a valid array length.`);
      }
      target = new Array(length as number);
      for (const key of ownKeys) {
        if (key === "length") continue;
        if (typeof key !== "string" || !/^(?:0|[1-9]\d*)$/u.test(key)) {
          throw new TypeError(`${subject} arrays cannot contain symbols or named properties.`);
        }
        const index = Number(key);
        if (!Number.isSafeInteger(index) || index >= (length as number)) {
          throw new TypeError(`${subject} arrays contain an invalid index.`);
        }
        const descriptor = descriptors[key];
        if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
          throw new TypeError(`${subject} must contain only own enumerable data properties.`);
        }
        accountEntry(key, descriptor.value);
        entries.push([key, descriptor.value]);
      }
      if (entries.length !== length) {
        throw new TypeError(`${subject} arrays must be dense own-data arrays.`);
      }
    } else {
      const prototype = Object.getPrototypeOf(source);
      if (prototype !== Object.prototype && prototype !== null) {
        throw new TypeError(`${subject} objects must have an ordinary or null prototype.`);
      }
      target = Object.create(null) as object;
      for (const key of ownKeys) {
        if (typeof key !== "string") {
          throw new TypeError(`${subject} objects cannot contain symbol properties.`);
        }
        const descriptor = descriptors[key];
        if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
          throw new TypeError(`${subject} must contain only own enumerable data properties.`);
        }
        accountEntry(key, descriptor.value);
        entries.push([key, descriptor.value]);
      }
    }

    const state = { target, visiting: true };
    states.set(source, state);
    return { target, entries, nextEntry: 0, state, depth };
  };

  const root = createFrame(input, 1);
  const stack = [root];
  while (stack.length > 0) {
    const frame = stack[stack.length - 1]!;
    const entry = frame.entries[frame.nextEntry];
    if (!entry) {
      frame.state.visiting = false;
      stack.pop();
      continue;
    }
    frame.nextEntry += 1;
    const [key, value] = entry;
    if (declarativeSnapshotPrimitive(value)) {
      Object.defineProperty(frame.target, key, {
        configurable: true,
        enumerable: true,
        value,
        writable: true
      });
      continue;
    }
    if (typeof value !== "object" || value === null) {
      throw new TypeError(`${subject} must contain only ordinary JSON values.`);
    }
    const existing = states.get(value);
    if (existing?.visiting) {
      throw new TypeError(`${subject} cannot contain cycles.`);
    }
    const child = existing
      ? null
      : createFrame(value, frame.depth + 1);
    const target = existing?.target ?? child!.target;
    Object.defineProperty(frame.target, key, {
      configurable: true,
      enumerable: true,
      value: target,
      writable: true
    });
    if (child) stack.push(child);
  }

  return root.target;
}

/**
 * Full-backup arrays have no aggregate row limit, so this intentionally adds no
 * guessed total-record or total-text budget; the existing contracts remain the
 * only size/shape authority.
 */
function captureDeclarativeFullDataSnapshot(input: unknown): FullBackupPayload {
  return fullBackupPayloadSchema.parse(captureDeclarativeOwnData(input, "Full data snapshot"));
}

function captureExpectedCurrentPayloadDigest(
  options: { expectedCurrentPayloadDigest?: string }
): string | undefined {
  if (
    options === null
    || typeof options !== "object"
    || Array.isArray(options)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(options))
    || Reflect.ownKeys(options).some((key) => key !== "expectedCurrentPayloadDigest")
  ) {
    throw new TypeError("Full data replacement options must be a plain exact object.");
  }
  const descriptor = Object.getOwnPropertyDescriptor(options, "expectedCurrentPayloadDigest");
  if (descriptor && !Object.hasOwn(descriptor, "value")) {
    throw new TypeError("Full data replacement options cannot contain accessors.");
  }
  if (descriptor && !descriptor.enumerable) {
    throw new TypeError("Full data replacement options must use an own enumerable data property.");
  }
  if (!descriptor) return undefined;
  const expectedCurrentPayloadDigest = descriptor?.value as unknown;
  if (
    typeof expectedCurrentPayloadDigest !== "string"
    || !LOWERCASE_SHA256.test(expectedCurrentPayloadDigest)
  ) {
    throw new TypeError("Expected current full-data payload digest must be a lowercase SHA-256 digest.");
  }
  return expectedCurrentPayloadDigest;
}

function assertFullDataUniqueIds(snapshot: FullBackupPayload): void {
  const seen = new Set<string>();
  const conflictingIds = new Set<string>();
  const partitions = [
    snapshot.cases,
    snapshot.revisions,
    snapshot.candidateSets,
    snapshot.researchNotes,
    snapshot.events,
    snapshot.savedViews,
    snapshot.knowledgeDocuments,
    snapshot.citations,
    snapshot.attachments,
    snapshot.researcherProfiles,
    snapshot.appSettings,
    snapshot.ruleRegistry,
    snapshot.tzdbMigrationReceipts,
    snapshot.eventTimeMigrationReceipts,
    snapshot.revisionCalculationReceipts
  ] as const;
  for (const partition of partitions) {
    for (const record of partition) {
      if (seen.has(record.id)) conflictingIds.add(record.id);
      seen.add(record.id);
    }
  }
  if (conflictingIds.size > 0) {
    throw new FullDataIdentityConflictError([...conflictingIds].sort());
  }
}

export async function verifyLocalAttachmentIntegrity(input: unknown): Promise<LocalAttachmentRecord> {
  const record = localAttachmentRecordSchema.parse(input);
  const bytes = decodeCanonicalBase64(record.contentBase64);
  const actualHash = await sha256BytesHex(bytes);
  if (actualHash !== record.contentHash) {
    throw new LocalAttachmentIntegrityError(
      "CONTENT_HASH_MISMATCH",
      `Attachment ${record.id} content does not match its SHA-256 hash.`
    );
  }
  return record;
}

async function verifyLocalAttachmentRecordsSequentially(
  inputs: readonly unknown[],
  signal?: AbortSignal
): Promise<LocalAttachmentRecord[]> {
  const verified: LocalAttachmentRecord[] = [];
  for (const input of inputs) {
    signal?.throwIfAborted();
    verified.push(await verifyLocalAttachmentIntegrity(input));
  }
  signal?.throwIfAborted();
  return verified;
}

function canonicalLocalAttachmentLink(link: LocalAttachmentLink | null): string {
  if (link === null) return "null";
  if (link.kind === "research_subject") return `research_subject:${link.subjectId}`;
  if (link.kind === "revision") return `revision:${link.caseId}:${link.revisionId}`;
  if (link.kind === "research_note") return `research_note:${link.noteId}`;
  if (link.kind === "event") return `event:${link.eventId}`;
  return `knowledge_document:${link.documentId}`;
}

const UNLINKED_LOCAL_ATTACHMENT_EXACT_IDENTITY_KEYS = [
  "byteLength",
  "contentHash",
  "createdAt",
  "description",
  "fileName",
  "id",
  "link",
  "mediaType",
  "updatedAt"
] as const;
const CREATE_ATTACHMENT_INPUT_REQUIRED_KEYS = ["bytes", "fileName", "mediaType"] as const;
const CREATE_ATTACHMENT_INPUT_OPTIONAL_KEYS = ["description", "link"] as const;
const LOCAL_ATTACHMENT_EXACT_SOURCE_MAX = 16;
const UUID_TEXT_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const ISO_UTC_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u;
const TYPED_ARRAY_BYTE_LENGTH_GETTER = Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(Uint8Array.prototype) as object,
  "byteLength"
)?.get;
const LOCAL_UINT8_ARRAY_PROTOTYPE = Uint8Array.prototype;
const LOCAL_UINT8_ARRAY_CONSTRUCTOR = Uint8Array;
const UINT8_ARRAY_SET = Uint8Array.prototype.set;

function captureExactOwnDataObject(
  rawInput: unknown,
  subject: string,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[] = []
): Readonly<Record<string, unknown>> {
  if (typeof rawInput !== "object" || rawInput === null || Array.isArray(rawInput)) {
    throw new TypeError(`${subject} must be a plain exact object.`);
  }
  const prototype = Object.getPrototypeOf(rawInput);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${subject} must have the ordinary or null prototype.`);
  }
  const ownKeys = Reflect.ownKeys(rawInput);
  if (ownKeys.some((key) => typeof key !== "string")) {
    throw new TypeError(`${subject} cannot contain symbol properties.`);
  }
  const allowed = new Set<string>([...requiredKeys, ...optionalKeys]);
  const stringKeys = ownKeys as string[];
  if (
    stringKeys.some((key) => !allowed.has(key)) ||
    requiredKeys.some((key) => !stringKeys.includes(key))
  ) {
    throw new TypeError(`${subject} must contain exactly its declared keys.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(rawInput);
  const snapshot: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of stringKeys) {
    const descriptor = descriptors[key];
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError(`${subject} must contain only own enumerable data properties.`);
    }
    Object.defineProperty(snapshot, key, {
      configurable: false,
      enumerable: true,
      value: descriptor.value,
      writable: false
    });
  }
  return Object.freeze(snapshot);
}

function captureExactAttachmentBytes(rawBytes: unknown): Uint8Array {
  // ArrayBuffer.isView uses an internal-slot check and rejects Proxy wrappers
  // without consulting their getPrototypeOf traps.
  if (!ArrayBuffer.isView(rawBytes)) {
    throw new TypeError("Attachment bytes must be an ordinary Uint8Array.");
  }
  if (
    Object.getPrototypeOf(rawBytes) !== LOCAL_UINT8_ARRAY_PROTOTYPE ||
    TYPED_ARRAY_BYTE_LENGTH_GETTER === undefined
  ) {
    throw new TypeError("Attachment bytes must be an ordinary Uint8Array.");
  }
  // Typed-array indexes are intrinsic data slots, not accessor properties.
  // Enumerating their descriptors would allocate up to twenty million key
  // strings under the attachment contract. Treat the local-prototype view as
  // the binary leaf and copy only its indexed bytes. A captured native
  // constructor plus native set avoids consulting caller-controlled
  // constructor or Symbol.species properties.
  const byteLength = Reflect.apply(TYPED_ARRAY_BYTE_LENGTH_GETTER, rawBytes, []) as number;
  if (byteLength > MAX_LOCAL_ATTACHMENT_BYTES) {
    throw new RangeError(`Attachment cannot exceed ${MAX_LOCAL_ATTACHMENT_BYTES} bytes.`);
  }
  const copy = new LOCAL_UINT8_ARRAY_CONSTRUCTOR(byteLength);
  Reflect.apply(UINT8_ARRAY_SET, copy, [rawBytes]);
  return copy;
}

function captureExactUnlinkedAttachmentIdentity(
  rawIdentity: unknown,
  subject: string
): UnlinkedLocalAttachmentExactIdentity {
  const snapshot = captureExactOwnDataObject(
    rawIdentity,
    subject,
    UNLINKED_LOCAL_ATTACHMENT_EXACT_IDENTITY_KEYS
  );
  const {
    id,
    fileName,
    mediaType,
    byteLength,
    contentHash,
    description,
    link,
    createdAt,
    updatedAt
  } = snapshot;
  if (typeof id !== "string" || !UUID_TEXT_PATTERN.test(id)) {
    throw new TypeError(`${subject}.id must be a UUID.`);
  }
  if (
    typeof fileName !== "string" ||
    fileName.length < 1 ||
    fileName.length > 255 ||
    fileName !== fileName.trim() ||
    /[\\/\p{Cc}\p{Cf}]/u.test(fileName) ||
    fileName === "." ||
    fileName === ".."
  ) {
    throw new TypeError(`${subject}.fileName must be a canonical local attachment file name.`);
  }
  if (typeof mediaType !== "string" || !LOCAL_ATTACHMENT_MEDIA_TYPE_PATTERN.test(mediaType)) {
    throw new TypeError(`${subject}.mediaType must be a canonical MIME type.`);
  }
  if (!Number.isSafeInteger(byteLength) || Number(byteLength) < 0 || Number(byteLength) > MAX_LOCAL_ATTACHMENT_BYTES) {
    throw new TypeError(`${subject}.byteLength must be a valid local attachment byte length.`);
  }
  if (typeof contentHash !== "string" || !LOWERCASE_SHA256.test(contentHash)) {
    throw new TypeError(`${subject}.contentHash must be a lowercase SHA-256 digest.`);
  }
  if (
    typeof description !== "string" ||
    description.length > 2_000 ||
    description !== description.trim()
  ) {
    throw new TypeError(`${subject}.description must be canonical text of at most 2000 characters.`);
  }
  if (link !== null) {
    throw new TypeError(`${subject}.link must be null.`);
  }
  if (
    typeof createdAt !== "string" ||
    typeof updatedAt !== "string" ||
    !ISO_UTC_DATE_TIME_PATTERN.test(createdAt) ||
    !ISO_UTC_DATE_TIME_PATTERN.test(updatedAt) ||
    !Number.isFinite(Date.parse(createdAt)) ||
    !Number.isFinite(Date.parse(updatedAt)) ||
    Date.parse(updatedAt) < Date.parse(createdAt)
  ) {
    throw new TypeError(`${subject} timestamps must be ordered ISO UTC date-times.`);
  }
  return Object.freeze({
    id,
    fileName,
    mediaType,
    byteLength: Number(byteLength),
    contentHash,
    description,
    link: null,
    createdAt,
    updatedAt
  });
}

function captureExactUnlinkedAttachmentSources(
  rawSources: readonly UnlinkedLocalAttachmentExactIdentity[]
): readonly UnlinkedLocalAttachmentExactIdentity[] {
  if (!Array.isArray(rawSources) || Object.getPrototypeOf(rawSources) !== Array.prototype) {
    throw new TypeError("Attachment sources must be an ordinary exact array.");
  }
  const descriptors = Object.getOwnPropertyDescriptors(rawSources);
  const lengthDescriptor = Object.getOwnPropertyDescriptor(rawSources, "length");
  if (!lengthDescriptor || !Object.hasOwn(lengthDescriptor, "value")) {
    throw new TypeError("Attachment sources must expose an own data length.");
  }
  const length = lengthDescriptor.value as unknown;
  if (!Number.isSafeInteger(length) || Number(length) < 0 || Number(length) > LOCAL_ATTACHMENT_EXACT_SOURCE_MAX) {
    throw new RangeError(`Attachment sources must contain between 0 and ${LOCAL_ATTACHMENT_EXACT_SOURCE_MAX} identities.`);
  }
  const ownKeys = Reflect.ownKeys(rawSources);
  if (ownKeys.length !== Number(length) + 1) {
    throw new TypeError("Attachment sources must be a dense exact array without named properties.");
  }
  const sources: UnlinkedLocalAttachmentExactIdentity[] = [];
  const sourceIds = new Set<string>();
  for (let index = 0; index < Number(length); index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError("Attachment sources must be a dense own-data array.");
    }
    const source = captureExactUnlinkedAttachmentIdentity(
      descriptor.value,
      `Attachment source ${index}`
    );
    if (sourceIds.has(source.id)) {
      throw new TypeError(`Attachment sources cannot repeat id ${source.id}.`);
    }
    sourceIds.add(source.id);
    sources.push(source);
  }
  for (const key of ownKeys) {
    if (key === "length") continue;
    if (typeof key !== "string" || !/^(?:0|[1-9]\d*)$/u.test(key) || Number(key) >= Number(length)) {
      throw new TypeError("Attachment sources cannot contain symbols or named properties.");
    }
  }
  return Object.freeze(sources);
}

function captureExactUnlinkedCreateAttachmentInput(
  rawInput: CreateAttachmentInput
): CreateAttachmentInput {
  const snapshot = captureExactOwnDataObject(
    rawInput,
    "Attachment create input",
    CREATE_ATTACHMENT_INPUT_REQUIRED_KEYS,
    CREATE_ATTACHMENT_INPUT_OPTIONAL_KEYS
  );
  if (snapshot.link !== undefined && snapshot.link !== null) {
    throw new TypeError("Exact-source attachment successors must be unlinked.");
  }
  return Object.freeze({
    fileName: snapshot.fileName as string,
    mediaType: snapshot.mediaType as string,
    bytes: captureExactAttachmentBytes(snapshot.bytes),
    ...(Object.hasOwn(snapshot, "description")
      ? { description: snapshot.description as string | undefined }
      : {}),
    link: null
  });
}

function matchesExactUnlinkedAttachmentIdentity(
  record: LocalAttachmentRecord,
  identity: UnlinkedLocalAttachmentExactIdentity
): boolean {
  return record.id === identity.id &&
    record.fileName === identity.fileName &&
    record.mediaType === identity.mediaType &&
    record.byteLength === identity.byteLength &&
    record.contentHash === identity.contentHash &&
    record.description === identity.description &&
    record.link === null &&
    record.createdAt === identity.createdAt &&
    record.updatedAt === identity.updatedAt;
}

async function readVerifiedExactUnlinkedAttachment(
  table: EntityTable<LocalAttachmentRecord, "id">,
  identity: UnlinkedLocalAttachmentExactIdentity,
  operation: "source" | "delete"
): Promise<LocalAttachmentRecord> {
  const raw = await table.get(identity.id);
  if (raw === undefined) {
    throw new LocalAttachmentIntegrityError(
      "ATTACHMENT_NOT_FOUND",
      `Attachment ${identity.id} does not exist for exact ${operation}.`
    );
  }
  const verified = await Dexie.waitFor(verifyLocalAttachmentIntegrity(raw));
  if (!matchesExactUnlinkedAttachmentIdentity(verified, identity)) {
    throw new LocalAttachmentIntegrityError(
      "ATTACHMENT_CHANGED",
      `Attachment ${identity.id} changed after its exact identity was captured.`
    );
  }
  return verified;
}

async function findExistingAttachmentForIdempotentCreate(
  table: EntityTable<LocalAttachmentRecord, "id">,
  record: LocalAttachmentRecord
): Promise<LocalAttachmentRecord | null> {
  const candidateIds = await table
    .where("mediaType")
    .equals(record.mediaType)
    .limit(LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_SCAN_ROWS + 1)
    .primaryKeys();
  if (candidateIds.length > LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_SCAN_ROWS) {
    throw new LocalAttachmentPurposeMetadataSnapshotLimitError(
      "SCAN_ROW_LIMIT_EXCEEDED",
      `Attachment idempotency lookup cannot scan more than ${LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_SCAN_ROWS} same-media rows.`
    );
  }
  const targetLink = canonicalLocalAttachmentLink(record.link);
  let scannedEncodedCharacters = 0;
  let existing: LocalAttachmentRecord | null = null;
  for (const id of candidateIds) {
    const raw = await table.get(id);
    if (raw === undefined) {
      throw new LocalAttachmentIntegrityError(
        "ATTACHMENT_NOT_FOUND",
        `Attachment ${String(id)} disappeared inside a write transaction.`
      );
    }
    const encodedCharacters = storedAttachmentEncodedCharacterLength(raw);
    if (
      scannedEncodedCharacters + encodedCharacters >
      LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_ENCODED_CHARACTERS
    ) {
      throw new LocalAttachmentPurposeMetadataSnapshotLimitError(
        "SCAN_ENCODED_CHARACTER_LIMIT_EXCEEDED",
        "Attachment idempotency lookup exceeded its Base64 encoded-character scan budget."
      );
    }
    scannedEncodedCharacters += encodedCharacters;
    const hashDescriptor = Object.getOwnPropertyDescriptor(raw, "contentHash");
    if (!hashDescriptor || !("value" in hashDescriptor) || hashDescriptor.value !== record.contentHash) {
      continue;
    }
    const candidate = localAttachmentRecordSchema.parse(raw);
    if (
      candidate.description !== record.description ||
      canonicalLocalAttachmentLink(candidate.link) !== targetLink
    ) continue;
    if (
      existing === null ||
      candidate.createdAt < existing.createdAt ||
      (candidate.createdAt === existing.createdAt && candidate.id < existing.id)
    ) {
      existing = candidate;
    }
  }
  return existing === null
    ? null
    : Dexie.waitFor(verifyLocalAttachmentIntegrity(existing));
}

type ExactUnlinkedAttachmentCreateAdmission = Readonly<{
  existing: LocalAttachmentRecord | null;
  sameMediaRows: number;
  scannedEncodedCharacters: number;
  exactPurposeMatches: number;
  matchedDeclaredBytes: number;
}>;

async function inspectExactUnlinkedAttachmentCreateAdmission(
  table: EntityTable<LocalAttachmentRecord, "id">,
  record: LocalAttachmentRecord
): Promise<ExactUnlinkedAttachmentCreateAdmission> {
  const candidateIds = await table
    .where("mediaType")
    .equals(record.mediaType)
    .limit(LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_SCAN_ROWS + 1)
    .primaryKeys();
  assertLocalAttachmentPurposeCapacityTotals({
    sameMediaRows: candidateIds.length,
    scannedEncodedCharacters: 0,
    exactPurposeMatches: 0,
    matchedDeclaredBytes: 0
  });

  let scannedEncodedCharacters = 0;
  let exactPurposeMatches = 0;
  let matchedDeclaredBytes = 0;
  let existing: LocalAttachmentRecord | null = null;
  for (const id of candidateIds) {
    const raw = await table.get(id);
    if (raw === undefined) {
      throw new LocalAttachmentIntegrityError(
        "ATTACHMENT_NOT_FOUND",
        `Attachment ${String(id)} disappeared inside a write transaction.`
      );
    }
    const encodedCharacters = storedAttachmentEncodedCharacterLength(raw);
    const nextScannedEncodedCharacters = scannedEncodedCharacters + encodedCharacters;
    assertLocalAttachmentPurposeCapacityTotals({
      sameMediaRows: candidateIds.length,
      scannedEncodedCharacters: nextScannedEncodedCharacters,
      exactPurposeMatches,
      matchedDeclaredBytes
    });
    scannedEncodedCharacters = nextScannedEncodedCharacters;
    if (!storedAttachmentMatchesMetadataPurpose(raw, {
      description: record.description,
      unlinkedOnly: true
    })) continue;

    const candidate = localAttachmentRecordSchema.parse(raw);
    const nextExactPurposeMatches = exactPurposeMatches + 1;
    const nextMatchedDeclaredBytes = matchedDeclaredBytes + candidate.byteLength;
    assertLocalAttachmentPurposeCapacityTotals({
      sameMediaRows: candidateIds.length,
      scannedEncodedCharacters,
      exactPurposeMatches: nextExactPurposeMatches,
      matchedDeclaredBytes: nextMatchedDeclaredBytes
    });
    exactPurposeMatches = nextExactPurposeMatches;
    matchedDeclaredBytes = nextMatchedDeclaredBytes;
    if (candidate.contentHash !== record.contentHash) continue;
    if (
      existing === null ||
      candidate.createdAt < existing.createdAt ||
      (candidate.createdAt === existing.createdAt && candidate.id < existing.id)
    ) {
      existing = candidate;
    }
  }

  return Object.freeze({
    existing: existing === null
      ? null
      : await Dexie.waitFor(verifyLocalAttachmentIntegrity(existing)),
    sameMediaRows: candidateIds.length,
    scannedEncodedCharacters,
    exactPurposeMatches,
    matchedDeclaredBytes
  });
}

type LocalAttachmentReferenceIndex = {
  subjectIds: ReadonlySet<string>;
  caseIds: ReadonlySet<string>;
  revisionById: ReadonlyMap<string, RevisionRecord>;
  noteIds: ReadonlySet<string>;
  eventIds: ReadonlySet<string>;
  documentIds: ReadonlySet<string>;
};

function assertLocalAttachmentLink(
  attachment: Pick<LocalAttachmentRecord, "id" | "link">,
  references: LocalAttachmentReferenceIndex
): void {
  const link = attachment.link;
  if (link === null) return;
  if (link.kind === "research_subject") {
    if (references.subjectIds.has(link.subjectId)) return;
  } else if (link.kind === "revision") {
    const revision = references.revisionById.get(link.revisionId);
    if (revision && references.caseIds.has(link.caseId)) {
      if (revision.caseId === link.caseId) return;
      throw new LocalAttachmentIntegrityError(
        "LINK_CONTEXT_MISMATCH",
        `Attachment ${attachment.id} revision does not belong to case ${link.caseId}.`
      );
    }
  } else if (link.kind === "research_note" && references.noteIds.has(link.noteId)) {
    return;
  } else if (link.kind === "event" && references.eventIds.has(link.eventId)) {
    return;
  } else if (link.kind === "knowledge_document" && references.documentIds.has(link.documentId)) {
    return;
  }
  throw new LocalAttachmentIntegrityError(
    "LINK_TARGET_NOT_FOUND",
    `Attachment ${attachment.id} references a missing ${link.kind} target.`
  );
}

async function assertStoredLocalAttachmentLink(
  database: ResearchDatabase,
  attachment: Pick<LocalAttachmentRecord, "id" | "link">
): Promise<void> {
  const link = attachment.link;
  if (link === null) return;
  if (link.kind === "research_subject") {
    const [caseRecord, candidateSet] = await Promise.all([
      database.cases.get(link.subjectId),
      database.candidateSets.get(link.subjectId)
    ]);
    if (caseRecord || candidateSet) return;
  } else if (link.kind === "revision") {
    const [caseRecord, revision] = await Promise.all([
      database.cases.get(link.caseId),
      database.revisions.get(link.revisionId)
    ]);
    if (caseRecord && revision) {
      if (revision.caseId === link.caseId) return;
      throw new LocalAttachmentIntegrityError(
        "LINK_CONTEXT_MISMATCH",
        `Attachment ${attachment.id} revision does not belong to case ${link.caseId}.`
      );
    }
  } else if (link.kind === "research_note" && await database.researchNotes.get(link.noteId)) {
    return;
  } else if (link.kind === "event" && await database.events.get(link.eventId)) {
    return;
  } else if (link.kind === "knowledge_document" && await database.knowledgeDocuments.get(link.documentId)) {
    return;
  }
  throw new LocalAttachmentIntegrityError(
    "LINK_TARGET_NOT_FOUND",
    `Attachment ${attachment.id} references a missing ${link.kind} target.`
  );
}

type LocalAttachmentLinkDeleteSelection = Readonly<{
  researchSubjectIds?: readonly string[];
  revisionCaseIds?: readonly string[];
  revisionIds?: readonly string[];
  researchNoteIds?: readonly string[];
  eventIds?: readonly string[];
  knowledgeDocumentIds?: readonly string[];
}>;

function uniqueCodeUnitSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
}

async function deleteAttachmentsByLinkIndexes(
  table: EntityTable<LocalAttachmentRecord, "id">,
  selection: LocalAttachmentLinkDeleteSelection
): Promise<void> {
  const ids = new Set<string>();
  const collect = async (index: string, rawValues: readonly string[] | undefined): Promise<void> => {
    const values = uniqueCodeUnitSorted(rawValues ?? []);
    if (values.length === 0) return;
    const matchingIds = await table.where(index).anyOf(values).primaryKeys();
    for (const id of matchingIds) ids.add(id);
  };

  // These are declared attachment indexes in every supported local schema.
  // Querying primary keys avoids materializing Base64 bodies merely to decide
  // which linked records must be removed by an enclosing lifecycle transaction.
  await collect("link.subjectId", selection.researchSubjectIds);
  await collect("link.caseId", selection.revisionCaseIds);
  await collect("link.revisionId", selection.revisionIds);
  await collect("link.noteId", selection.researchNoteIds);
  await collect("link.eventId", selection.eventIds);
  await collect("link.documentId", selection.knowledgeDocumentIds);

  const sortedIds = uniqueCodeUnitSorted([...ids]);
  if (sortedIds.length > 0) await table.bulkDelete(sortedIds);
}

async function pruneCitationTargets(
  table: EntityTable<CitationRecord, "id">,
  shouldRemove: (target: CitationTarget) => boolean
): Promise<void> {
  const citations = (await table.toArray()).map((record) => citationRecordSchema.parse(record));
  for (const citation of citations) {
    const targets = citation.targets.filter((target) => !shouldRemove(target));
    if (targets.length === citation.targets.length) continue;
    if (targets.length === 0) {
      await table.delete(citation.id);
      continue;
    }
    const now = new Date().toISOString();
    await table.put(citationRecordSchema.parse({
      ...citation,
      targets,
      targetKeys: citationTargetKeys(targets),
      editVersion: citation.editVersion + 1,
      updatedAt: now >= citation.updatedAt ? now : citation.updatedAt
    }));
  }
}

async function deleteEventTimeMigrationReceiptsForEvents(
  table: EntityTable<EventTimeMigrationReceipt, "id">,
  eventIds: readonly string[]
): Promise<void> {
  if (eventIds.length === 0) return;
  const [sourceReceiptIds, targetReceiptIds] = await Promise.all([
    table.where("source.recordId").anyOf([...eventIds]).primaryKeys(),
    table.where("target.recordId").anyOf([...eventIds]).primaryKeys()
  ]);
  const receiptIds = [...new Set([...sourceReceiptIds, ...targetReceiptIds])];
  if (receiptIds.length > 0) await table.bulkDelete(receiptIds);
}

/**
 * Persists preflighted rule-pack records without importing rule-engine code.
 * Canonical JSON and compatibility verification belong to the caller; this
 * layer enforces immutability, version uniqueness, and selector referential integrity.
 */
export class RuleRegistryRepository {
  constructor(readonly database = new ResearchDatabase()) {}

  async listInstalledRulePacks(): Promise<InstalledRulePackRecord[]> {
    const records = await this.database.ruleRegistry
      .where("recordType")
      .equals("installed_rule_pack")
      .toArray();
    const installed = records.map((record) => parseInstalledRulePackRecord(record));
    return installed.sort((left, right) =>
      left.importedAt.localeCompare(right.importedAt) || left.id.localeCompare(right.id)
    );
  }

  async getInstalledRulePack(packDigest: string): Promise<InstalledRulePackRecord | null> {
    const record = await this.database.ruleRegistry.get(packDigest);
    return record ? parseInstalledRulePackRecord(record) : null;
  }

  async installRulePack(input: InstalledRulePackRecord): Promise<InstalledRulePackRecord> {
    const record = parseInstalledRulePackRecord(input);
    return this.database.transaction("rw", this.database.ruleRegistry, async () => {
      const existingByDigestRaw = await this.database.ruleRegistry.get(record.packDigest);
      if (existingByDigestRaw) {
        const existingByDigest = parseInstalledRulePackRecord(existingByDigestRaw);
        if (!sameInstalledRulePackContent(existingByDigest, record)) {
          throw new RuleRegistryError(
            "RULE_PACK_DIGEST_COLLISION",
            `Digest ${record.packDigest} is already bound to different rule-pack content.`
          );
        }
        // Content-addressed installs are idempotent. Keep the original import timestamp.
        return existingByDigest;
      }

      const existingVersionRaw = await this.database.ruleRegistry
        .where("[packId+profileVersion]")
        .equals([record.packId, record.profileVersion])
        .first();
      if (existingVersionRaw) {
        const existingVersion = parseInstalledRulePackRecord(existingVersionRaw);
        throw new RuleRegistryError(
          "RULE_PACK_VERSION_CONFLICT",
          `Rule pack ${record.packId}@${record.profileVersion} is already installed as ${existingVersion.packDigest}.`
        );
      }

      await this.database.ruleRegistry.add(record);
      return record;
    });
  }

  async getActiveRulePack(): Promise<ActiveRulePackRecord | null> {
    return this.database.transaction("r", this.database.ruleRegistry, async () => {
      const activeRaw = await this.database.ruleRegistry.get(ACTIVE_RULE_PACK_RECORD_ID);
      if (!activeRaw) return null;
      const active = parseActiveRulePackRecord(activeRaw);
      const installedRaw = await this.database.ruleRegistry.get(active.activeDigest);
      const installed = installedRaw ? parseInstalledRulePackRecord(installedRaw) : undefined;
      assertActiveRulePackTarget(active, installed);
      return active;
    });
  }

  async activateRulePack(input: ActiveRulePackRecord): Promise<ActiveRulePackRecord> {
    const active = parseActiveRulePackRecord(input);
    return this.database.transaction("rw", this.database.ruleRegistry, async () => {
      const installedRaw = await this.database.ruleRegistry.get(active.activeDigest);
      if (!installedRaw) {
        throw new RuleRegistryError(
          "RULE_PACK_NOT_FOUND",
          `Rule pack ${active.activeDigest} is not installed.`
        );
      }
      const installed = parseInstalledRulePackRecord(installedRaw);
      if (installed.profileDigest !== active.activeProfileDigest) {
        throw new RuleRegistryError(
          "ACTIVE_RULE_PACK_PROFILE_DIGEST_MISMATCH",
          `Active profile digest does not match installed rule pack ${active.activeDigest}.`
        );
      }
      await this.database.ruleRegistry.put(active);
      return active;
    });
  }

  async deactivateRulePack(): Promise<void> {
    await this.database.transaction("rw", this.database.ruleRegistry, () =>
      this.database.ruleRegistry.delete(ACTIVE_RULE_PACK_RECORD_ID)
    );
  }

  async deleteInstalledRulePack(packDigest: string): Promise<void> {
    await this.database.transaction("rw", this.database.ruleRegistry, async () => {
      const installedRaw = await this.database.ruleRegistry.get(packDigest);
      if (!installedRaw) {
        throw new RuleRegistryError(
          "RULE_PACK_NOT_FOUND",
          `Rule pack ${packDigest} is not installed.`
        );
      }
      parseInstalledRulePackRecord(installedRaw);

      const activeRaw = await this.database.ruleRegistry.get(ACTIVE_RULE_PACK_RECORD_ID);
      if (activeRaw) {
        const active = parseActiveRulePackRecord(activeRaw);
        const activeInstalledRaw = await this.database.ruleRegistry.get(active.activeDigest);
        const activeInstalled = activeInstalledRaw
          ? parseInstalledRulePackRecord(activeInstalledRaw)
          : undefined;
        assertActiveRulePackTarget(active, activeInstalled);
        if (active.activeDigest === packDigest) {
          throw new RuleRegistryError(
            "ACTIVE_RULE_PACK_DELETE_FORBIDDEN",
            `Deactivate rule pack ${packDigest} before deleting it.`
          );
        }
      }

      await this.database.ruleRegistry.delete(packDigest);
    });
  }
}

export class CaseRepository {
  constructor(
    readonly database = new ResearchDatabase(),
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  private async verifyCandidateSetRecord(raw: unknown): Promise<CandidateSetRecord> {
    return verifyCandidateSetRecordIntegrity(raw);
  }

  private requireRevisionCalculationReceiptSchema(): void {
    if (this.database.targetSchemaVersion < 15) {
      throw new RevisionCalculationReceiptStorageError(
        "SCHEMA_UNSUPPORTED",
        "Revision calculation receipts require an explicit targetSchema of 15."
      );
    }
  }

  private async assertLegacyBackupDoesNotOmitCalculationReceipts(
    operation: LegacyBackupReceiptBlockOperation
  ): Promise<void> {
    if (this.database.targetSchemaVersion < 15) return;
    const receiptCount = await this.database.revisionCalculationReceipts.count();
    if (receiptCount > 0) {
      throw new LegacyBackupOmitsCalculationReceiptsError(operation, receiptCount);
    }
  }

  private async verifyRevisionCalculationReceiptSource(
    rawReceipt: unknown,
    rawRevision: unknown
  ): Promise<RevisionCalculationReceipt> {
    const replay = await loadRevisionReplayModule();
    try {
      return await replay.verifyRevisionCalculationReceiptSourceBinding(rawReceipt, rawRevision);
    } catch (cause) {
      if (
        cause instanceof replay.RevisionCalculationReceiptError &&
        cause.code === "RECEIPT_SOURCE_MISMATCH"
      ) {
        throw new RevisionCalculationReceiptStorageError(
          "RECEIPT_SOURCE_MISMATCH",
          "Calculation receipt is not bound to its claimed Revision.",
          { cause }
        );
      }
      throw cause;
    }
  }

  private async countDependentData(): Promise<DependentDataCounts> {
    const [researchNotes, events, savedViews, citations, attachments] = await Promise.all([
      this.database.researchNotes.count(),
      this.database.events.count(),
      this.database.savedViews.count(),
      this.database.citations.count(),
      this.database.attachments.count()
    ]);
    return { researchNotes, events, savedViews, citations, attachments };
  }

  /** Exact sixteen-partition counts from one read transaction; no stored values are materialized. */
  async readLocalDataOverview(): Promise<LocalDataOverview> {
    return this.database.transaction(
      "r",
      [
        this.database.cases,
        this.database.revisions,
        this.database.candidateSets,
        this.database.researchNotes,
        this.database.events,
        this.database.savedViews,
        this.database.knowledgeDocuments,
        this.database.citations,
        this.database.sourceRights,
        this.database.researcherProfiles,
        this.database.appSettings,
        this.database.attachments,
        this.database.ruleRegistry,
        this.database.tzdbMigrationReceipts,
        this.database.eventTimeMigrationReceipts,
        ...(this.database.targetSchemaVersion >= 15
          ? [this.database.revisionCalculationReceipts]
          : [])
      ],
      async () => {
        const [
          cases,
          revisions,
          candidateSets,
          researchNotes,
          events,
          savedViews,
          knowledgeDocuments,
          citations,
          sourceRights,
          researcherProfiles,
          appSettings,
          attachments,
          ruleRegistry,
          tzdbMigrationReceipts,
          eventTimeMigrationReceipts,
          revisionCalculationReceipts
        ] = await Promise.all([
          this.database.cases.count(),
          this.database.revisions.count(),
          this.database.candidateSets.count(),
          this.database.researchNotes.count(),
          this.database.events.count(),
          this.database.savedViews.count(),
          this.database.knowledgeDocuments.count(),
          this.database.citations.count(),
          this.database.sourceRights.count(),
          this.database.researcherProfiles.count(),
          this.database.appSettings.count(),
          this.database.attachments.count(),
          this.database.ruleRegistry.count(),
          this.database.tzdbMigrationReceipts.count(),
          this.database.eventTimeMigrationReceipts.count(),
          this.database.targetSchemaVersion >= 15
            ? this.database.revisionCalculationReceipts.count()
            : Promise.resolve(0)
        ]);
        return {
          counts: {
            cases,
            revisions,
            candidateSets,
            researchNotes,
            events,
            savedViews,
            knowledgeDocuments,
            citations,
            sourceRights,
            researcherProfiles,
            appSettings,
            attachments,
            ruleRegistry,
            tzdbMigrationReceipts,
            eventTimeMigrationReceipts,
            revisionCalculationReceipts
          }
        };
      }
    );
  }

  /**
   * Captures exactly the partitions consumed by research-query execution.
   * Every read stays inside one readonly transaction; an AbortSignal aborts
   * that native transaction and is rechecked across the asynchronous capture
   * boundary. The research-query engine owns the single strict integrity and
   * relationship verification pass over this projection.
   */
  async readResearchQuerySnapshot(
    options: ReadResearchQuerySnapshotOptions = {}
  ): Promise<ResearchQueryStorageSnapshot> {
    const signal = options.signal;
    const receiptLedgerAvailable = this.database.targetSchemaVersion >= 15;
    let transaction: Transaction | null = null;
    const abortTransaction = () => transaction?.abort();
    signal?.throwIfAborted();
    signal?.addEventListener("abort", abortTransaction, { once: true });
    try {
      const snapshot = await this.database.transaction(
        "r",
        [
          this.database.cases,
          this.database.revisions,
          this.database.candidateSets,
          this.database.researchNotes,
          this.database.events,
          this.database.knowledgeDocuments,
          ...(receiptLedgerAvailable ? [this.database.revisionCalculationReceipts] : [])
        ],
        async () => {
          transaction = Dexie.currentTransaction;
          signal?.throwIfAborted();
          const [
            cases,
            revisions,
            candidateSets,
            researchNotes,
            events,
            knowledgeDocuments,
            revisionCalculationReceipts
          ] = await Promise.all([
            this.database.cases.toArray(),
            this.database.revisions.toArray(),
            this.database.candidateSets.toArray(),
            this.database.researchNotes.toArray(),
            this.database.events.toArray(),
            this.database.knowledgeDocuments.toArray(),
            receiptLedgerAvailable
              ? this.database.revisionCalculationReceipts.toArray()
              : Promise.resolve([])
          ]);
          signal?.throwIfAborted();
          return {
            cases,
            revisions,
            candidateSets,
            researchNotes,
            events,
            knowledgeDocuments,
            revisionCalculationReceiptLedgerStatus:
              receiptLedgerAvailable ? "available" as const : "schema_unavailable" as const,
            revisionCalculationReceipts
          };
        }
      );
      signal?.throwIfAborted();
      return snapshot;
    } catch (reason) {
      signal?.throwIfAborted();
      throw reason;
    } finally {
      signal?.removeEventListener("abort", abortTransaction);
    }
  }

  async readResearcherProfile(): Promise<LocalResearcherProfileRecord | null> {
    const record = await this.database.researcherProfiles.get(LOCAL_RESEARCHER_PROFILE_ID);
    return record ? localResearcherProfileRecordSchema.parse(record) : null;
  }

  async saveResearcherProfile(input: SaveResearcherProfileInput): Promise<LocalResearcherProfileRecord> {
    return this.database.transaction("rw", this.database.researcherProfiles, async () => {
      const currentRaw = await this.database.researcherProfiles.get(LOCAL_RESEARCHER_PROFILE_ID);
      const current = currentRaw ? localResearcherProfileRecordSchema.parse(currentRaw) : null;
      const timestamp = this.now();
      const record = localResearcherProfileRecordSchema.parse({
        schemaVersion: SCHEMA_VERSION,
        recordVersion: LOCAL_RESEARCHER_PROFILE_RECORD_VERSION,
        recordType: "local_researcher_profile",
        id: LOCAL_RESEARCHER_PROFILE_ID,
        displayName: input.displayName,
        organization: input.organization ?? "",
        researchFocus: input.researchFocus ?? "",
        createdAt: current?.createdAt ?? timestamp,
        updatedAt: timestamp
      });
      await this.database.researcherProfiles.put(record);
      return record;
    });
  }

  async readAppSettings(): Promise<LocalAppSettingsRecord | null> {
    const record = await this.database.appSettings.get(LOCAL_APP_SETTINGS_ID);
    return record ? localAppSettingsRecordSchema.parse(record) : null;
  }

  async saveAppSettings(input: SaveAppSettingsInput): Promise<LocalAppSettingsRecord> {
    return this.database.transaction("rw", this.database.appSettings, async () => {
      const currentRaw = await this.database.appSettings.get(LOCAL_APP_SETTINGS_ID);
      const current = currentRaw ? localAppSettingsRecordSchema.parse(currentRaw) : null;
      const timestamp = this.now();
      const record = localAppSettingsRecordSchema.parse({
        schemaVersion: SCHEMA_VERSION,
        recordVersion: LOCAL_APP_SETTINGS_RECORD_VERSION,
        recordType: "local_app_settings",
        id: LOCAL_APP_SETTINGS_ID,
        locale: "zh-CN",
        defaultTimeZone: input.defaultTimeZone,
        defaultCalendarType: input.defaultCalendarType,
        preferredDensity: input.preferredDensity,
        createdAt: current?.createdAt ?? timestamp,
        updatedAt: timestamp
      });
      await this.database.appSettings.put(record);
      return record;
    });
  }

  async listAttachments(): Promise<LocalAttachmentRecord[]> {
    return this.database.transaction(
      "r",
      [
        this.database.attachments,
        this.database.cases,
        this.database.revisions,
        this.database.candidateSets,
        this.database.researchNotes,
        this.database.events,
        this.database.knowledgeDocuments
      ],
      async () => {
        const records = await this.database.attachments.toArray();
        const verified = await Dexie.waitFor(verifyLocalAttachmentRecordsSequentially(records));
        for (const record of verified) await assertStoredLocalAttachmentLink(this.database, record);
        return verified.sort((left, right) =>
          right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id)
        );
      }
    );
  }

  /**
   * Bounded metadata scan over inline attachment records. IndexedDB still has to
   * clone each selected value because metadata and Base64 share one record, so
   * this method locates keys first and then reads values strictly one at a time.
   *
   * Unfiltered scans are ordered by updatedAt descending (and IndexedDB primary
   * key descending for equal index keys). A mediaType scan follows that exact
   * index and therefore uses primary-key ascending order within the equal key.
   */
  async readAttachmentMetadataPage(
    rawOptions: ReadAttachmentMetadataPageOptions = {}
  ): Promise<LocalAttachmentMetadataPage> {
    const options = normalizeAttachmentMetadataPageOptions(rawOptions);
    return this.database.transaction(
      "r",
      [
        this.database.attachments,
        this.database.cases,
        this.database.revisions,
        this.database.candidateSets,
        this.database.researchNotes,
        this.database.events,
        this.database.knowledgeDocuments
      ],
      async () => {
        const mediaType = options.mediaType;
        const createScanCollection = () => mediaType === undefined
          ? this.database.attachments.orderBy("updatedAt").reverse()
          : this.database.attachments.where("mediaType").equals(mediaType);
        const [totalCount, candidateIds] = await Promise.all([
          createScanCollection().count(),
          createScanCollection()
            .offset(options.offset)
            .limit(options.limit + 1)
            .primaryKeys()
        ]);

        const items: LocalAttachmentMetadata[] = [];
        let scannedCount = 0;
        let scannedEncodedCharacters = 0;
        for (const id of candidateIds.slice(0, options.limit)) {
          const raw = await this.database.attachments.get(id);
          if (raw === undefined) {
            throw new LocalAttachmentIntegrityError(
              "ATTACHMENT_NOT_FOUND",
              `Attachment ${String(id)} disappeared inside a read transaction.`
            );
          }
          const encodedCharacters = storedAttachmentEncodedCharacterLength(raw);
          if (scannedEncodedCharacters + encodedCharacters > options.maxEncodedCharacters) break;
          scannedCount += 1;
          scannedEncodedCharacters += encodedCharacters;
          if (!storedAttachmentMatchesMetadataPurpose(raw, options)) continue;
          const record = localAttachmentRecordSchema.parse(raw);
          await assertStoredLocalAttachmentLink(this.database, record);
          items.push(localAttachmentMetadata(record));
        }

        const scannedThroughOffset = options.offset + scannedCount;
        return {
          totalCount,
          offset: options.offset,
          items,
          nextOffset: scannedThroughOffset < totalCount ? scannedThroughOffset : null,
          scannedCount,
          scannedEncodedCharacters,
          contentIntegrityVerified: false
        };
      }
    );
  }

  /**
   * One-transaction, fail-closed purpose snapshot for consumers that must know
   * whether they covered the complete bounded mediaType collection. Inline
   * Base64 still enters JavaScript one record at a time under the legacy schema;
   * it is never returned, decoded, hashed, or retained by this projection.
   */
  async readAttachmentPurposeMetadataSnapshot(
    rawOptions: ReadAttachmentPurposeMetadataSnapshotOptions
  ): Promise<LocalAttachmentPurposeMetadataSnapshot> {
    if (!rawOptions || rawOptions.unlinkedOnly !== true) {
      throw new TypeError("Attachment purpose snapshots require unlinkedOnly=true.");
    }
    const normalized = normalizeAttachmentMetadataPageOptions({
      mediaType: rawOptions.mediaType,
      description: rawOptions.description,
      unlinkedOnly: true
    });
    if (normalized.mediaType === undefined || normalized.description === undefined) {
      throw new TypeError("Attachment purpose snapshots require exact mediaType and description filters.");
    }
    const filter = {
      mediaType: normalized.mediaType,
      description: normalized.description,
      unlinkedOnly: true
    } as const;

    return this.database.transaction("r", this.database.attachments, async () => {
      const candidateIds = await this.database.attachments
        .where("mediaType")
        .equals(filter.mediaType)
        .limit(LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_SCAN_ROWS + 1)
        .primaryKeys();
      if (candidateIds.length > LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_SCAN_ROWS) {
        throw new LocalAttachmentPurposeMetadataSnapshotLimitError(
          "SCAN_ROW_LIMIT_EXCEEDED",
          `Attachment purpose snapshot cannot scan more than ${LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_SCAN_ROWS} indexed rows.`
        );
      }

      const items: LocalAttachmentMetadata[] = [];
      let scannedEncodedCharacters = 0;
      let matchedDeclaredBytes = 0;
      for (const id of candidateIds) {
        const raw = await this.database.attachments.get(id);
        if (raw === undefined) {
          throw new LocalAttachmentIntegrityError(
            "ATTACHMENT_NOT_FOUND",
            `Attachment ${String(id)} disappeared inside a read transaction.`
          );
        }
        const encodedCharacters = storedAttachmentEncodedCharacterLength(raw);
        if (
          scannedEncodedCharacters + encodedCharacters >
          LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_ENCODED_CHARACTERS
        ) {
          throw new LocalAttachmentPurposeMetadataSnapshotLimitError(
            "SCAN_ENCODED_CHARACTER_LIMIT_EXCEEDED",
            "Attachment purpose snapshot exceeded its Base64 encoded-character scan budget."
          );
        }
        scannedEncodedCharacters += encodedCharacters;
        if (!storedAttachmentMatchesMetadataPurpose(raw, filter)) continue;

        const record = localAttachmentRecordSchema.parse(raw);
        if (items.length >= LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHES) {
          throw new LocalAttachmentPurposeMetadataSnapshotLimitError(
            "MATCH_LIMIT_EXCEEDED",
            `Attachment purpose snapshot cannot retain more than ${LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHES} matches.`
          );
        }
        if (
          matchedDeclaredBytes + record.byteLength >
          LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHED_BYTES
        ) {
          throw new LocalAttachmentPurposeMetadataSnapshotLimitError(
            "MATCHED_BYTE_LIMIT_EXCEEDED",
            "Attachment purpose snapshot exceeded its matched declared-byte budget."
          );
        }
        matchedDeclaredBytes += record.byteLength;
        items.push(localAttachmentMetadata(record));
      }

      return {
        filter,
        items,
        scannedCount: candidateIds.length,
        scannedEncodedCharacters,
        matchedDeclaredBytes,
        contentIntegrityVerified: false,
        coverage: "complete",
        atomicStorageSnapshotVerified: true
      };
    });
  }

  async createAttachment(input: CreateAttachmentInput): Promise<LocalAttachmentRecord> {
    const record = await prepareLocalAttachmentRecord(input, this.now);
    await this.database.transaction(
      "rw",
      [
        this.database.attachments,
        this.database.cases,
        this.database.revisions,
        this.database.candidateSets,
        this.database.researchNotes,
        this.database.events,
        this.database.knowledgeDocuments
      ],
      async () => {
        await assertStoredLocalAttachmentLink(this.database, record);
        await this.database.attachments.add(record);
      }
    );
    return record;
  }

  async createAttachmentOnce(input: CreateAttachmentInput): Promise<CreateAttachmentOnceResult> {
    // Byte copying, Base64 encoding and Web Crypto hashing intentionally happen
    // before opening IndexedDB. The write transaction only performs the atomic
    // bounded content-addressed lookup, relationship check and possible insertion.
    const record = await prepareLocalAttachmentRecord(input, this.now);
    return this.database.transaction(
      "rw",
      [
        this.database.attachments,
        this.database.cases,
        this.database.revisions,
        this.database.candidateSets,
        this.database.researchNotes,
        this.database.events,
        this.database.knowledgeDocuments
      ],
      async () => {
        const existing = await findExistingAttachmentForIdempotentCreate(
          this.database.attachments,
          record
        );
        if (existing) {
          await assertStoredLocalAttachmentLink(this.database, existing);
          return { record: existing, created: false };
        }

        await assertStoredLocalAttachmentLink(this.database, record);
        await this.database.attachments.add(record);
        return { record, created: true };
      }
    );
  }

  /**
   * Creates one immutable unlinked successor only while every caller-selected
   * unlinked source still has its complete captured metadata and byte digest.
   * Inputs are synchronously reduced to accessor-free exact snapshots before
   * hashing or opening IndexedDB. v13 uses only the existing attachment store;
   * no mutation-state capability is consulted or emulated here.
   */
  async createAttachmentOnceWithExactUnlinkedSources(
    rawInput: CreateAttachmentInput,
    rawSources: readonly UnlinkedLocalAttachmentExactIdentity[]
  ): Promise<CreateAttachmentOnceResult> {
    const input = captureExactUnlinkedCreateAttachmentInput(rawInput);
    const sources = captureExactUnlinkedAttachmentSources(rawSources);
    const record = await prepareLocalAttachmentRecord(input, this.now);
    return this.database.transaction("rw", this.database.attachments, async () => {
      for (const source of sources) {
        await readVerifiedExactUnlinkedAttachment(
          this.database.attachments,
          source,
          "source"
        );
      }

      const admission = await inspectExactUnlinkedAttachmentCreateAdmission(
        this.database.attachments,
        record
      );
      if (admission.existing) return { record: admission.existing, created: false };

      assertExactUnlinkedAttachmentCreateCapacity({
        sameMediaRows: admission.sameMediaRows,
        scannedEncodedCharacters: admission.scannedEncodedCharacters,
        exactPurposeMatches: admission.exactPurposeMatches,
        matchedDeclaredBytes: admission.matchedDeclaredBytes,
        successorEncodedCharacters: storedAttachmentEncodedCharacterLength(record),
        successorDeclaredBytes: record.byteLength
      });
      await this.database.attachments.add(record);
      return { record, created: true };
    });
  }

  async readAttachmentBytes(
    id: string,
    options: { expectedContentHash?: string } = {}
  ): Promise<Uint8Array | null> {
    return this.database.transaction(
      "r",
      [
        this.database.attachments,
        this.database.cases,
        this.database.revisions,
        this.database.candidateSets,
        this.database.researchNotes,
        this.database.events,
        this.database.knowledgeDocuments
      ],
      async () => {
        const raw = await this.database.attachments.get(id);
        if (!raw) return null;
        const record = await Dexie.waitFor(verifyLocalAttachmentIntegrity(raw));
        if (
          options.expectedContentHash !== undefined &&
          record.contentHash !== options.expectedContentHash
        ) {
          throw new LocalAttachmentIntegrityError(
            "ATTACHMENT_CHANGED",
            `Attachment ${id} changed after it was selected.`
          );
        }
        await assertStoredLocalAttachmentLink(this.database, record);
        return decodeCanonicalBase64(record.contentBase64);
      }
    );
  }

  async deleteAttachment(
    id: string,
    options: { expectedContentHash?: string } = {}
  ): Promise<void> {
    await this.database.transaction("rw", this.database.attachments, async () => {
      const raw = await this.database.attachments.get(id);
      if (!raw) {
        throw new LocalAttachmentIntegrityError("ATTACHMENT_NOT_FOUND", `Attachment ${id} does not exist.`);
      }
      if (
        options.expectedContentHash !== undefined &&
        raw.contentHash !== options.expectedContentHash
      ) {
        throw new LocalAttachmentIntegrityError(
          "ATTACHMENT_CHANGED",
          `Attachment ${id} changed after it was selected.`
        );
      }
      await this.database.attachments.delete(id);
    });
  }

  /** Deletes exactly one verified unlinked immutable copy, never merely an id/hash pair. */
  async deleteExactUnlinkedAttachment(
    rawIdentity: UnlinkedLocalAttachmentExactIdentity
  ): Promise<void> {
    const identity = captureExactUnlinkedAttachmentIdentity(
      rawIdentity,
      "Attachment delete identity"
    );
    await this.database.transaction("rw", this.database.attachments, async () => {
      await readVerifiedExactUnlinkedAttachment(
        this.database.attachments,
        identity,
        "delete"
      );
      await this.database.attachments.delete(identity.id);
    });
  }

  async createCase(input: SaveCaseInput): Promise<CaseBundle> {
    const calculated = await verifyCalculatedChartIntegrity(input.calculated);
    const now = new Date().toISOString();
    const caseId = crypto.randomUUID();
    const revisionId = crypto.randomUUID();
    const caseRecord = caseRecordSchema.parse({
      schemaVersion: SCHEMA_VERSION,
      recordVersion: RESEARCH_SUBJECT_RECORD_VERSION,
      id: caseId,
      alias: input.alias,
      tags: input.tags ?? [],
      notes: input.notes ?? "",
      favorite: false,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
      latestRevisionId: revisionId,
      revisionCount: 1
    });
    const revision = revisionRecordSchema.parse({
      schemaVersion: SCHEMA_VERSION,
      id: revisionId,
      caseId,
      revisionNumber: 1,
      createdAt: now,
      input: calculated.input,
      timeCalibration: calculated.timeCalibration,
      ruleProfile: calculated.ruleProfile,
      ...(calculated.rulePackBinding ? { rulePackBinding: calculated.rulePackBinding } : {}),
      luckCycleRuleSnapshot: calculated.luckCycleRuleSnapshot,
      facts: calculated.facts,
      manifest: calculated.manifest
    });
    const fingerprintRecord = await revisionFingerprintRecord(revision);
    const baselineReceipt = this.database.targetSchemaVersion >= 15
      ? await loadRevisionReplayModule().then((replay) => replay.createRevisionCalculationReceipt(
          revision,
          { profile: replay.CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE },
          {
            id: crypto.randomUUID(),
            createdAt: now,
            captureKind: "revision_creation_baseline"
          }
        ))
      : null;

    const persist = async () => {
      if (
        input.duplicateGuard === "reject" &&
        await this.database.birthFingerprints.where("fingerprint").equals(fingerprintRecord.fingerprint).first()
      ) {
        throw new DuplicateBirthFingerprintError(fingerprintRecord.fingerprint);
      }
      await this.database.cases.add(caseRecord);
      await this.database.revisions.add(revision);
      await this.database.birthFingerprints.add(fingerprintRecord);
      if (baselineReceipt) await this.database.revisionCalculationReceipts.add(baselineReceipt);
    };
    if (baselineReceipt) {
      await this.database.transaction(
        "rw",
        [
          this.database.cases,
          this.database.revisions,
          this.database.birthFingerprints,
          this.database.revisionCalculationReceipts
        ],
        persist
      );
    } else {
      await this.database.transaction(
        "rw",
        this.database.cases,
        this.database.revisions,
        this.database.birthFingerprints,
        persist
      );
    }
    return { caseRecord, revisions: [revision] };
  }

  /** Stores one unknown-hour candidate set without inventing a primary chart or representative birth time. */
  async createCandidateSet(input: SaveCandidateSetInput): Promise<CandidateSetRecord> {
    const timestamp = new Date().toISOString();
    const candidateSet = unknownHourCandidateResultSchema.parse(structuredClone(input.candidateSet));
    const record = candidateSetRecordSchema.parse({
      schemaVersion: SCHEMA_VERSION,
      recordVersion: RESEARCH_SUBJECT_RECORD_VERSION,
      recordType: "unknown_hour_candidate_set",
      id: crypto.randomUUID(),
      alias: input.alias,
      tags: input.tags ?? [],
      notes: input.notes ?? "",
      favorite: false,
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      candidateSet,
      snapshotDigest: await sha256Hex(candidateSet)
    });
    const verified = await verifyCandidateSetRecordIntegrity(record);
    const fingerprintRecord = await candidateFingerprintRecord(verified);
    await this.database.transaction("rw", this.database.candidateSets, this.database.birthFingerprints, async () => {
      if (
        input.duplicateGuard === "reject" &&
        await this.database.birthFingerprints.where("fingerprint").equals(fingerprintRecord.fingerprint).first()
      ) {
        throw new DuplicateBirthFingerprintError(fingerprintRecord.fingerprint);
      }
      await this.database.candidateSets.add(verified);
      await this.database.birthFingerprints.add(fingerprintRecord);
    });
    return verified;
  }

  async deriveCandidateSetTzdbSnapshot(
    input: DeriveCandidateSetTzdbSnapshotInput
  ): Promise<DeriveCandidateSetTzdbSnapshotResult> {
    return this.database.transaction(
      "rw",
      this.database.candidateSets,
      this.database.birthFingerprints,
      this.database.tzdbMigrationReceipts,
      async () => {
        const sourceRaw = await this.database.candidateSets.get(input.sourceCandidateSetId);
        if (!sourceRaw) {
          throw new CandidateSetTzdbMigrationError("SOURCE_NOT_FOUND", "The source CandidateSet does not exist.");
        }
        const source = await Dexie.waitFor(this.verifyCandidateSetRecord(sourceRaw));
        if (source.snapshotDigest !== input.expectedSourceSnapshotDigest) {
          throw new CandidateSetTzdbMigrationError(
            "SOURCE_SNAPSHOT_CHANGED",
            "The source CandidateSet changed after the migration review was opened."
          );
        }
        if (source.deletedAt !== null) {
          throw new CandidateSetTzdbMigrationError(
            "SOURCE_DELETED",
            "Restore the source CandidateSet before deriving a new tzdb snapshot."
          );
        }

        const structurallyStoredCandidateSet = storedUnknownHourCandidateResultSchema.parse(
          input.candidateSet
        );
        if (structurallyStoredCandidateSet.tzdbVersion === source.candidateSet.tzdbVersion) {
          throw new CandidateSetTzdbMigrationError(
            "SAME_TZDB",
            candidateSetTzdbBoundaryMessage("SAME_TZDB")
          );
        }
        const expectedTargetSnapshotId = input.expectedTargetSnapshotId ?? RUNTIME_TZDB_VERSION;
        const targetSnapshotIssue = candidateSetTargetSnapshotIssue(
          structurallyStoredCandidateSet,
          expectedTargetSnapshotId
        );
        if (targetSnapshotIssue !== null) {
          throw new CandidateSetTzdbMigrationError(targetSnapshotIssue.code, targetSnapshotIssue.message);
        }
        const candidateSet = await Dexie.waitFor(
          verifyUnknownHourCandidateResultIntegrity(structurallyStoredCandidateSet)
        );
        const boundaryMismatch = candidateSetTzdbDerivationBoundaryMismatch(source.candidateSet, candidateSet);
        if (boundaryMismatch !== null) {
          throw new CandidateSetTzdbMigrationError(
            boundaryMismatch,
            candidateSetTzdbBoundaryMessage(boundaryMismatch)
          );
        }
        const existingReceipts = (await this.database.tzdbMigrationReceipts.toArray())
          .map((rawReceipt) => tzdbMigrationReceiptSchema.parse(rawReceipt));
        const lineageIds = connectedTzdbLineageRecordIds(source.id, existingReceipts);
        const lineageReceipts = existingReceipts.filter((receipt) =>
          lineageIds.has(receipt.source.recordId) || lineageIds.has(receipt.target.recordId)
        );
        const lineageRaw = await this.database.candidateSets.bulkGet([...lineageIds]);
        const lineageRecords = await Dexie.waitFor(Promise.all(lineageRaw.map(async (record, index) => {
          if (!record) {
            throw new CandidateSetTzdbMigrationError(
              "RECEIPT_RELATION_MISMATCH",
              `CandidateSet tzdb lineage references missing record ${[...lineageIds][index]}.`
            );
          }
          return this.verifyCandidateSetRecord(record);
        })));
        await Dexie.waitFor(verifyTzdbMigrationReceiptRelationships(lineageReceipts, lineageRecords));
        if (lineageRecords.some((record) => record.candidateSet.tzdbVersion === candidateSet.tzdbVersion)) {
          throw new CandidateSetTzdbMigrationError(
            "TARGET_TZDB_ALREADY_DERIVED",
            `CandidateSet lineage for ${source.id} already contains ${candidateSet.tzdbVersion}.`
          );
        }
        if (lineageRecords.some((record) => record.candidateSet.resultHash === candidateSet.resultHash)) {
          throw new CandidateSetTzdbMigrationError(
            "TARGET_RESULT_ALREADY_IN_LINEAGE",
            `CandidateSet lineage for ${source.id} already contains result ${candidateSet.resultHash}.`
          );
        }

        const timestamp = this.now();
        const candidateSetSnapshotDigest = await Dexie.waitFor(sha256Hex(candidateSet));
        if (lineageRecords.some((record) => record.snapshotDigest === candidateSetSnapshotDigest)) {
          throw new CandidateSetTzdbMigrationError(
            "TARGET_RESULT_ALREADY_IN_LINEAGE",
            `CandidateSet lineage for ${source.id} already contains snapshot ${candidateSetSnapshotDigest}.`
          );
        }
        const target = await Dexie.waitFor(this.verifyCandidateSetRecord({
          ...source,
          id: crypto.randomUUID(),
          deletedAt: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          candidateSet,
          snapshotDigest: candidateSetSnapshotDigest
        }));
        const fingerprintRecord = await Dexie.waitFor(candidateFingerprintRecord(target));
        const comparison = buildCandidateSetTzdbComparison(source.candidateSet, target.candidateSet);
        const receipt = tzdbMigrationReceiptSchema.parse({
          schemaVersion: SCHEMA_VERSION,
          recordVersion: TZDB_MIGRATION_RECEIPT_RECORD_VERSION,
          id: crypto.randomUUID(),
          operation: "candidate_set_tzdb_recalculation",
          source: {
            kind: "candidate_set",
            recordId: source.id,
            snapshotDigest: source.snapshotDigest,
            resultHash: source.candidateSet.resultHash,
            tzdbVersion: source.candidateSet.tzdbVersion
          },
          target: {
            kind: "candidate_set",
            recordId: target.id,
            snapshotDigest: target.snapshotDigest,
            resultHash: target.candidateSet.resultHash,
            tzdbVersion: target.candidateSet.tzdbVersion
          },
          comparison,
          comparisonDigest: await Dexie.waitFor(sha256Hex(comparison)),
          createdAt: timestamp
        });

        await this.database.candidateSets.add(target);
        await this.database.birthFingerprints.add(fingerprintRecord);
        await this.database.tzdbMigrationReceipts.add(receipt);
        return { source, target, receipt };
      }
    );
  }

  async listTzdbMigrationReceiptsForCandidateSet(candidateSetId: string): Promise<TzdbMigrationReceipt[]> {
    return this.database.transaction("r", this.database.candidateSets, this.database.tzdbMigrationReceipts, async () => {
      const [asSource, asTarget] = await Promise.all([
        this.database.tzdbMigrationReceipts.where("source.recordId").equals(candidateSetId).toArray(),
        this.database.tzdbMigrationReceipts.where("target.recordId").equals(candidateSetId).toArray()
      ]);
      const receipts = [...new Map([...asSource, ...asTarget].map((receipt) => [receipt.id, receipt])).values()];
      const candidateSetIds = [...new Set(receipts.flatMap((receipt) => [receipt.source.recordId, receipt.target.recordId]))];
      const rawCandidateSets = await this.database.candidateSets.bulkGet(candidateSetIds);
      const candidateSets = await Dexie.waitFor(Promise.all(rawCandidateSets.map(async (record, index) => {
        if (!record) {
          throw new CandidateSetTzdbMigrationError(
            "RECEIPT_RELATION_MISMATCH",
            `Tzdb migration receipt references missing CandidateSet ${candidateSetIds[index]}.`
          );
        }
        return this.verifyCandidateSetRecord(record);
      })));
      const verified = await Dexie.waitFor(verifyTzdbMigrationReceiptRelationships(receipts, candidateSets));
      return verified.sort((left, right) =>
        left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)
      );
    });
  }

  async listBirthFingerprints(): Promise<string[]> {
    const records = await this.database.birthFingerprints.orderBy("fingerprint").uniqueKeys();
    return records.map(String);
  }

  async getCandidateSet(candidateSetId: string): Promise<CandidateSetRecord | null> {
    const record = await this.database.candidateSets.get(candidateSetId);
    return record ? this.verifyCandidateSetRecord(record) : null;
  }

  async listCandidateSets(options: ListResearchSubjectsOptions = {}): Promise<CandidateSetRecord[]> {
    const records = await this.database.candidateSets.orderBy("updatedAt").reverse().toArray();
    const verified = await Promise.all(records.map((record) => this.verifyCandidateSetRecord(record)));
    return verified.filter((record) => matchesResearchSubjectOptions(record, options));
  }

  async listResearchSubjects(options: ListResearchSubjectsOptions = {}): Promise<ResearchSubjectRecord[]> {
    const [cases, candidateSets] = await Promise.all([this.listCases(options), this.listCandidateSets(options)]);
    return [...cases, ...candidateSets].sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id)
    );
  }

  /**
   * Bounded, stable page over the existing v13-v15 stores. Without a compound
   * lifecycle/favorite index the tables must still be scanned, but this path
   * retains at most limit + 1 source records and fully verifies CandidateSets
   * only after they enter the returned page.
   */
  async listResearchSubjectsPage(
    options: ListResearchSubjectPageOptions = {}
  ): Promise<ResearchSubjectPage> {
    const normalized = normalizeResearchSubjectPageOptions(options);
    return this.database.transaction(
      "r",
      [this.database.cases, this.database.candidateSets],
      async () => {
        const finishPage = async (
          retained: PageableResearchSubject[],
          total: number
        ): Promise<ResearchSubjectPage> => {
          const hasMore = retained.length > normalized.limit;
          const pageCandidates = retained.slice(0, normalized.limit);
          const items = await Dexie.waitFor(Promise.all(pageCandidates.map((candidate) =>
            candidate.kind === "cases"
              ? Promise.resolve(caseRecordSchema.parse(candidate.record))
              : this.verifyCandidateSetRecord(candidate.record)
          )));
          const last = pageCandidates.at(-1);
          return {
            items,
            total,
            nextCursor: hasMore && last
              ? researchSubjectPageCursor(last, normalized.queryKey)
              : null
          };
        };

        // Favorite-only pages cannot use an existing index, so retain the
        // bounded scan fallback instead of materializing every matching row.
        if (normalized.favoritesOnly) {
          const retained: PageableResearchSubject[] = [];
          let total = 0;
          const inspect = (
            rawRecord: ResearchSubjectRecord,
            kind: StoredResearchSubjectKind
          ): void => {
            const candidate = assertPageableResearchSubject(rawRecord, kind);
            if (!matchesResearchSubjectOptions(candidate.record, normalized)) return;
            total += 1;
            if (!isResearchSubjectAfterCursor(candidate, normalized.cursor)) return;
            insertBoundedResearchSubject(retained, candidate, normalized.limit + 1);
          };

          const scans: Promise<unknown>[] = [];
          if (normalized.kind !== "candidate_sets") {
            scans.push(this.database.cases.each((record) => inspect(record, "cases")));
          }
          if (normalized.kind !== "cases") {
            scans.push(this.database.candidateSets.each((record) => inspect(record, "candidate_sets")));
          }
          await Promise.all(scans);
          return finishPage(retained, total);
        }

        const loadIndexedPartition = async <T extends ResearchSubjectRecord>(
          table: EntityTable<T, "id">,
          kind: StoredResearchSubjectKind
        ): Promise<{ retained: PageableResearchSubject[]; total: number }> => {
          const trashedCountPromise = normalized.lifecycle === "all"
            ? Promise.resolve(0)
            : table.orderBy("deletedAt").count();
          const allCountPromise = normalized.lifecycle === "trashed"
            ? Promise.resolve(0)
            : table.count();

          const retained: PageableResearchSubject[] = [];
          let boundaryUpdatedAt: string | null = null;
          const collection = normalized.cursor
            ? table.where("updatedAt").belowOrEqual(normalized.cursor.updatedAt).reverse()
            : table.orderBy("updatedAt").reverse();
          await collection
            // IndexedDB does not guarantee the required id order inside a
            // non-unique index key. Finish the complete boundary timestamp,
            // while bounded insertion retains only the best limit + 1 rows.
            .until((record) => boundaryUpdatedAt !== null && record.updatedAt !== boundaryUpdatedAt)
            .each((rawRecord) => {
              const candidate = assertPageableResearchSubject(rawRecord, kind);
              if (!matchesResearchSubjectOptions(candidate.record, normalized)) return;
              if (!isResearchSubjectAfterCursor(candidate, normalized.cursor)) return;
              insertBoundedResearchSubject(retained, candidate, normalized.limit + 1);
              if (retained.length >= normalized.limit + 1 && boundaryUpdatedAt === null) {
                boundaryUpdatedAt = candidate.record.updatedAt;
              }
            });

          const [allCount, trashedCount] = await Promise.all([allCountPromise, trashedCountPromise]);
          const total = normalized.lifecycle === "all"
            ? allCount
            : normalized.lifecycle === "trashed"
              ? trashedCount
              : allCount - trashedCount;
          return { retained, total };
        };

        const partitionPromises: Array<Promise<{ retained: PageableResearchSubject[]; total: number }>> = [];
        if (normalized.kind !== "candidate_sets") {
          partitionPromises.push(loadIndexedPartition(this.database.cases, "cases"));
        }
        if (normalized.kind !== "cases") {
          partitionPromises.push(loadIndexedPartition(this.database.candidateSets, "candidate_sets"));
        }
        const partitions = await Promise.all(partitionPromises);
        const retained: PageableResearchSubject[] = [];
        let total = 0;
        for (const partition of partitions) {
          total += partition.total;
          for (const candidate of partition.retained) {
            insertBoundedResearchSubject(retained, candidate, normalized.limit + 1);
          }
        }
        return finishPage(retained, total);
      }
    );
  }

  /** Exact lightweight counts from one IndexedDB snapshot; no full records are retained. */
  async getResearchSubjectOverview(): Promise<ResearchSubjectOverview> {
    return this.database.transaction(
      "r",
      [this.database.cases, this.database.candidateSets],
      async () => {
        const overview: ResearchSubjectOverview = {
          activeCaseCount: 0,
          activeCandidateSetCount: 0,
          activeSubjectCount: 0,
          trashedSubjectCount: 0,
          activeFavoriteSubjectCount: 0,
          activeRevisionCount: 0
        };
        await Promise.all([
          this.database.cases.each((record) => {
            const candidate = assertPageableResearchSubject(record, "cases").record as CaseRecord;
            if (!Number.isSafeInteger(candidate.revisionCount) || candidate.revisionCount < 1) {
              throw new TypeError("Stored case lacks a valid revisionCount.");
            }
            if (candidate.deletedAt === null) {
              overview.activeCaseCount += 1;
              overview.activeSubjectCount += 1;
              overview.activeRevisionCount += candidate.revisionCount;
              if (candidate.favorite) overview.activeFavoriteSubjectCount += 1;
            } else {
              overview.trashedSubjectCount += 1;
            }
          }),
          this.database.candidateSets.each((record) => {
            const candidate = assertPageableResearchSubject(record, "candidate_sets").record;
            if (candidate.deletedAt === null) {
              overview.activeCandidateSetCount += 1;
              overview.activeSubjectCount += 1;
              if (candidate.favorite) overview.activeFavoriteSubjectCount += 1;
            } else {
              overview.trashedSubjectCount += 1;
            }
          })
        ]);
        return overview;
      }
    );
  }

  async updateCaseMetadata(caseId: string, input: UpdateResearchSubjectMetadataInput): Promise<CaseRecord> {
    return this.database.transaction("rw", this.database.cases, async () => {
      const raw = await this.database.cases.get(caseId);
      if (!raw) throw new ResearchSubjectLifecycleError("SUBJECT_NOT_FOUND", "The case does not exist.");
      const current = caseRecordSchema.parse(raw);
      if (current.deletedAt !== null) {
        throw new ResearchSubjectLifecycleError("SUBJECT_IN_TRASH", "Restore the case before editing it.");
      }
      const next = caseRecordSchema.parse({
        ...current,
        alias: input.alias,
        tags: input.tags,
        notes: input.notes,
        updatedAt: new Date().toISOString()
      });
      await this.database.cases.put(next);
      return next;
    });
  }

  async updateCandidateSetMetadata(
    candidateSetId: string,
    input: UpdateResearchSubjectMetadataInput
  ): Promise<CandidateSetRecord> {
    return this.database.transaction("rw", this.database.candidateSets, async () => {
      const raw = await this.database.candidateSets.get(candidateSetId);
      if (!raw) throw new ResearchSubjectLifecycleError("SUBJECT_NOT_FOUND", "The candidate set does not exist.");
      const current = await Dexie.waitFor(this.verifyCandidateSetRecord(raw));
      if (current.deletedAt !== null) {
        throw new ResearchSubjectLifecycleError("SUBJECT_IN_TRASH", "Restore the candidate set before editing it.");
      }
      const next = await Dexie.waitFor(this.verifyCandidateSetRecord({
        ...current,
        alias: input.alias,
        tags: input.tags,
        notes: input.notes,
        updatedAt: new Date().toISOString()
      }));
      await this.database.candidateSets.put(next);
      return next;
    });
  }

  async setCaseFavorite(caseId: string, favorite: boolean): Promise<CaseRecord> {
    return this.database.transaction("rw", this.database.cases, async () => {
      const raw = await this.database.cases.get(caseId);
      if (!raw) throw new ResearchSubjectLifecycleError("SUBJECT_NOT_FOUND", "The case does not exist.");
      const current = caseRecordSchema.parse(raw);
      if (current.deletedAt !== null) {
        throw new ResearchSubjectLifecycleError("SUBJECT_IN_TRASH", "Restore the case before changing its favorite state.");
      }
      const next = caseRecordSchema.parse({
        ...current,
        favorite,
        updatedAt: new Date().toISOString()
      });
      await this.database.cases.put(next);
      return next;
    });
  }

  async setCandidateSetFavorite(candidateSetId: string, favorite: boolean): Promise<CandidateSetRecord> {
    return this.database.transaction("rw", this.database.candidateSets, async () => {
      const raw = await this.database.candidateSets.get(candidateSetId);
      if (!raw) throw new ResearchSubjectLifecycleError("SUBJECT_NOT_FOUND", "The candidate set does not exist.");
      const current = await Dexie.waitFor(this.verifyCandidateSetRecord(raw));
      if (current.deletedAt !== null) {
        throw new ResearchSubjectLifecycleError(
          "SUBJECT_IN_TRASH",
          "Restore the candidate set before changing its favorite state."
        );
      }
      const next = await Dexie.waitFor(this.verifyCandidateSetRecord({
        ...current,
        favorite,
        updatedAt: new Date().toISOString()
      }));
      await this.database.candidateSets.put(next);
      return next;
    });
  }

  async trashCase(caseId: string): Promise<CaseRecord> {
    return this.database.transaction("rw", this.database.cases, async () => {
      const raw = await this.database.cases.get(caseId);
      if (!raw) throw new ResearchSubjectLifecycleError("SUBJECT_NOT_FOUND", "The case does not exist.");
      const current = caseRecordSchema.parse(raw);
      if (current.deletedAt !== null) return current;
      const timestamp = new Date().toISOString();
      const next = caseRecordSchema.parse({ ...current, deletedAt: timestamp, updatedAt: timestamp });
      await this.database.cases.put(next);
      return next;
    });
  }

  async trashCandidateSet(candidateSetId: string): Promise<CandidateSetRecord> {
    return this.database.transaction("rw", this.database.candidateSets, async () => {
      const raw = await this.database.candidateSets.get(candidateSetId);
      if (!raw) throw new ResearchSubjectLifecycleError("SUBJECT_NOT_FOUND", "The candidate set does not exist.");
      const current = await Dexie.waitFor(this.verifyCandidateSetRecord(raw));
      if (current.deletedAt !== null) return current;
      const timestamp = new Date().toISOString();
      const next = await Dexie.waitFor(this.verifyCandidateSetRecord({
        ...current,
        deletedAt: timestamp,
        updatedAt: timestamp
      }));
      await this.database.candidateSets.put(next);
      return next;
    });
  }

  async restoreCase(caseId: string): Promise<CaseRecord> {
    return this.database.transaction("rw", this.database.cases, async () => {
      const raw = await this.database.cases.get(caseId);
      if (!raw) throw new ResearchSubjectLifecycleError("SUBJECT_NOT_FOUND", "The case does not exist.");
      const current = caseRecordSchema.parse(raw);
      if (current.deletedAt === null) {
        throw new ResearchSubjectLifecycleError("SUBJECT_NOT_TRASHED", "The case is not in the trash.");
      }
      const next = caseRecordSchema.parse({ ...current, deletedAt: null, updatedAt: new Date().toISOString() });
      await this.database.cases.put(next);
      return next;
    });
  }

  async restoreCandidateSet(candidateSetId: string): Promise<CandidateSetRecord> {
    return this.database.transaction("rw", this.database.candidateSets, async () => {
      const raw = await this.database.candidateSets.get(candidateSetId);
      if (!raw) throw new ResearchSubjectLifecycleError("SUBJECT_NOT_FOUND", "The candidate set does not exist.");
      const current = await Dexie.waitFor(this.verifyCandidateSetRecord(raw));
      if (current.deletedAt === null) {
        throw new ResearchSubjectLifecycleError("SUBJECT_NOT_TRASHED", "The candidate set is not in the trash.");
      }
      const next = await Dexie.waitFor(this.verifyCandidateSetRecord({
        ...current,
        deletedAt: null,
        updatedAt: new Date().toISOString()
      }));
      await this.database.candidateSets.put(next);
      return next;
    });
  }

  async addRevision(caseId: string, calculatedInput: CalculatedChart): Promise<CaseBundle> {
    const calculated = await verifyCalculatedChartIntegrity(calculatedInput);
    const persist = async (): Promise<CaseBundle> => {
      const caseRecord = await this.database.cases.get(caseId);
      if (!caseRecord) {
        throw new ResearchSubjectLifecycleError("SUBJECT_NOT_FOUND", "The case does not exist.");
      }
      if (caseRecord.deletedAt !== null) {
        throw new ResearchSubjectLifecycleError("SUBJECT_IN_TRASH", "Restore the case before adding a revision.");
      }
      const revisionId = crypto.randomUUID();
      const now = new Date().toISOString();
      const revision = revisionRecordSchema.parse({
        schemaVersion: SCHEMA_VERSION,
        id: revisionId,
        caseId,
        revisionNumber: caseRecord.revisionCount + 1,
        createdAt: now,
        input: calculated.input,
        timeCalibration: calculated.timeCalibration,
        ruleProfile: calculated.ruleProfile,
        ...(calculated.rulePackBinding ? { rulePackBinding: calculated.rulePackBinding } : {}),
        luckCycleRuleSnapshot: calculated.luckCycleRuleSnapshot,
        facts: calculated.facts,
        manifest: calculated.manifest
      });
      const updatedCase = caseRecordSchema.parse({
        ...caseRecord,
        updatedAt: now,
        latestRevisionId: revisionId,
        revisionCount: revision.revisionNumber
      });
      const fingerprintRecord = await Dexie.waitFor(revisionFingerprintRecord(revision));
      const baselineReceipt = this.database.targetSchemaVersion >= 15
        ? await Dexie.waitFor(loadRevisionReplayModule().then((replay) =>
            replay.createRevisionCalculationReceipt(
              revision,
              { profile: replay.CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE },
              {
                id: crypto.randomUUID(),
                createdAt: now,
                captureKind: "revision_creation_baseline"
              }
            )
          ))
        : null;
      await this.database.revisions.add(revision);
      await this.database.cases.put(updatedCase);
      await this.database.birthFingerprints.add(fingerprintRecord);
      if (baselineReceipt) await this.database.revisionCalculationReceipts.add(baselineReceipt);
      const storedRevisions = await this.database.revisions.where("caseId").equals(caseId).sortBy("revisionNumber");
      return {
        caseRecord: updatedCase,
        revisions: await Dexie.waitFor(Promise.all(storedRevisions.map((record) => verifyRevisionRecordIntegrity(record))))
      };
    };
    if (this.database.targetSchemaVersion >= 15) {
      return this.database.transaction(
        "rw",
        [
          this.database.cases,
          this.database.revisions,
          this.database.birthFingerprints,
          this.database.revisionCalculationReceipts
        ],
        persist
      );
    }
    return this.database.transaction(
      "rw",
      this.database.cases,
      this.database.revisions,
      this.database.birthFingerprints,
      persist
    );
  }

  async listCases(options: ListResearchSubjectsOptions = {}): Promise<CaseRecord[]> {
    const rows = await this.database.cases.orderBy("updatedAt").reverse().toArray();
    return rows
      .map((row) => caseRecordSchema.parse(row))
      .filter((record) => matchesResearchSubjectOptions(record, options));
  }

  async getCase(caseId: string): Promise<CaseBundle | null> {
    const caseRecord = await this.database.cases.get(caseId);
    if (!caseRecord) return null;
    const revisions = await this.database.revisions.where("caseId").equals(caseId).sortBy("revisionNumber");
    const parsedCase = caseRecordSchema.parse(caseRecord);
    const verifiedRevisions = await Promise.all(revisions.map((revision) => verifyRevisionRecordIntegrity(revision)));
    assertCaseBundleRelationship(parsedCase, verifiedRevisions);
    return {
      caseRecord: parsedCase,
      revisions: verifiedRevisions
    };
  }

  async getRevision(revisionId: string): Promise<RevisionRecord | null> {
    const revision = await this.database.revisions.get(revisionId);
    return revision ? verifyRevisionRecordIntegrity(revision) : null;
  }

  async listRevisionCalculationReceipts(
    revisionId: string
  ): Promise<RevisionCalculationReceipt[]> {
    this.requireRevisionCalculationReceiptSchema();
    return this.database.transaction(
      "r",
      [this.database.revisions, this.database.revisionCalculationReceipts],
      async () => {
        const revision = await this.database.revisions.get(revisionId);
        if (!revision) {
          throw new RevisionCalculationReceiptStorageError(
            "REVISION_NOT_FOUND",
            `Revision ${revisionId} does not exist.`
          );
        }
        const rawReceipts = await this.database.revisionCalculationReceipts
          .where("sourceRevision.revisionId")
          .equals(revisionId)
          .toArray();
        const receipts = await Dexie.waitFor(Promise.all(
          rawReceipts.map((receipt) => this.verifyRevisionCalculationReceiptSource(receipt, revision))
        ));
        return receipts.sort((left, right) =>
          left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)
        );
      }
    );
  }

  async getRevisionCalculationReceipt(
    receiptId: string
  ): Promise<RevisionCalculationReceipt | null> {
    this.requireRevisionCalculationReceiptSchema();
    return this.database.transaction(
      "r",
      [this.database.revisions, this.database.revisionCalculationReceipts],
      async () => {
        const rawReceipt = await this.database.revisionCalculationReceipts.get(receiptId);
        if (!rawReceipt) return null;
        const receipt = await Dexie.waitFor(loadRevisionReplayModule().then(
          ({ verifyRevisionCalculationReceiptIntegrity }) =>
            verifyRevisionCalculationReceiptIntegrity(rawReceipt)
        ));
        const revision = await this.database.revisions.get(receipt.sourceRevision.revisionId);
        if (!revision) {
          throw new RevisionCalculationReceiptStorageError(
            "RECEIPT_SOURCE_MISMATCH",
            `Calculation receipt ${receipt.id} references a missing Revision.`
          );
        }
        return Dexie.waitFor(this.verifyRevisionCalculationReceiptSource(receipt, revision));
      }
    );
  }

  async appendRevisionCalculationReceipt(
    input: AppendRevisionCalculationReceiptInput
  ): Promise<RevisionCalculationReceipt> {
    this.requireRevisionCalculationReceiptSchema();
    try {
      return await this.database.transaction(
        "rw",
        [this.database.cases, this.database.revisions, this.database.revisionCalculationReceipts],
        async () => {
          const rawRevision = await this.database.revisions.get(input.revisionId);
          if (!rawRevision) {
            throw new RevisionCalculationReceiptStorageError(
              "REVISION_NOT_FOUND",
              `Revision ${input.revisionId} does not exist.`
            );
          }
          const sourceCase = await this.database.cases.get(rawRevision.caseId);
          if (!sourceCase) {
            throw new RevisionCalculationReceiptStorageError(
              "RECEIPT_SOURCE_MISMATCH",
              `Revision ${input.revisionId} references a missing Case.`
            );
          }
          if (caseRecordSchema.parse(sourceCase).deletedAt !== null) {
            throw new RevisionCalculationReceiptStorageError(
              "CASE_TRASHED",
              "回收站中的案例保持只读；恢复后才能追加计算收据。"
            );
          }
          const receipt = await Dexie.waitFor(loadRevisionReplayModule().then((replay) =>
            replay.createRevisionCalculationReceipt(
              rawRevision,
              input.request,
              {
                id: crypto.randomUUID(),
                createdAt: this.now(),
                captureKind: "explicit_calculation_snapshot"
              }
            )
          ));
          const existing = await this.database.revisionCalculationReceipts
            .where("requestFingerprint")
            .equals(receipt.requestFingerprint)
            .first();
          if (existing) {
            throw new RevisionCalculationReceiptStorageError(
              "DUPLICATE_REQUEST_FINGERPRINT",
              `Revision calculation request ${receipt.requestFingerprint} was already captured.`
            );
          }
          await this.database.revisionCalculationReceipts.add(receipt);
          return receipt;
        }
      );
    } catch (cause) {
      if (cause instanceof Error && cause.name === "ConstraintError") {
        throw new RevisionCalculationReceiptStorageError(
          "DUPLICATE_REQUEST_FINGERPRINT",
          "The same Revision calculation request was appended concurrently.",
          { cause }
        );
      }
      throw cause;
    }
  }

  /**
   * Atomically reads one exact formal chart and all report evidence that belongs to it.
   * The named historical revision is never replaced by latestRevisionId. Every chart,
   * document and citation digest is verified before the snapshot leaves the transaction.
   */
  async readSingleChartExportSnapshot(caseId: string, revisionId: string): Promise<SingleChartExportSnapshot> {
    if (!caseId || !revisionId) throw new TypeError("案例与修订标识不能为空。");
    const receiptLedgerAvailable = this.database.targetSchemaVersion >= 15;
    return this.database.transaction(
      "r",
      [
        this.database.cases,
        this.database.revisions,
        this.database.researchNotes,
        this.database.events,
        this.database.eventTimeMigrationReceipts,
        this.database.citations,
        this.database.knowledgeDocuments,
        this.database.sourceRights,
        ...(receiptLedgerAvailable ? [this.database.revisionCalculationReceipts] : [])
      ],
      async () => {
        const [rawCase, rawRevisions, rawNotes, rawEvents, rawCitations] = await Promise.all([
          this.database.cases.get(caseId),
          this.database.revisions.where("caseId").equals(caseId).sortBy("revisionNumber"),
          this.database.researchNotes.where("caseId").equals(caseId).toArray(),
          this.database.events.where("caseId").equals(caseId).toArray(),
          this.database.citations.toArray()
        ]);
        if (!rawCase) {
          throw new FormalComparisonSourceError("MISSING_CASE", `找不到单盘导出案例 ${caseId}。`);
        }

        const caseRecord = caseRecordSchema.parse(rawCase);
        const revisions = await Dexie.waitFor(Promise.all(
          rawRevisions.map((record) => verifyRevisionRecordIntegrity(record))
        ));
        assertCaseBundleRelationship(caseRecord, revisions);
        const revision = revisions.find((record) => record.id === revisionId);
        if (!revision) {
          const existsElsewhere = await this.database.revisions.get(revisionId);
          throw new FormalComparisonSourceError(
            existsElsewhere ? "CROSS_CASE_REVISION" : "MISSING_REVISION",
            existsElsewhere
              ? `修订 ${revisionId} 不属于单盘导出案例 ${caseId}。`
              : `找不到单盘导出修订 ${revisionId}。`
          );
        }

        const rawRevisionCalculationReceipts = receiptLedgerAvailable
          ? await this.database.revisionCalculationReceipts
            .where("sourceRevision.revisionId")
            .equals(revisionId)
            .toArray()
          : [];
        const revisionCalculationReceipts = await Dexie.waitFor(Promise.all(
          rawRevisionCalculationReceipts.map((receipt) =>
            this.verifyRevisionCalculationReceiptSource(receipt, revision)
          )
        ));
        revisionCalculationReceipts.sort((left, right) =>
          left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)
        );

        const researchNotes = rawNotes
          .map((record) => researchNoteRecordSchema.parse(record))
          .filter((record) => isSingleChartNote(record, revisionId))
          .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
        const events = rawEvents
          .map((record) => parseStoredEventRecord(record))
          .filter((record) => isSingleChartEvent(record, revisionId))
          .sort((left, right) => (left.startDate ?? "9999").localeCompare(right.startDate ?? "9999")
            || left.createdAt.localeCompare(right.createdAt)
            || left.id.localeCompare(right.id));
        const noteIds = new Set(researchNotes.map((record) => record.id));
        const eventIds = new Set(events.map((record) => record.id));
        const rawEventTimeMigrationReceipts = eventIds.size === 0
          ? []
          : await this.database.eventTimeMigrationReceipts
            .where("source.recordId")
            .anyOf([...eventIds])
            .toArray();
        const eventTimeMigrationReceipts = await Dexie.waitFor(
          verifyEventTimeMigrationReceiptRelationships(
            rawEventTimeMigrationReceipts.filter((receipt) =>
              eventIds.has(receipt.source.recordId) && eventIds.has(receipt.target.recordId)
            ),
            events
          )
        );
        eventTimeMigrationReceipts.sort((left, right) =>
          left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)
        );
        const citations = rawCitations
          .map((record) => citationRecordSchema.parse(record))
          .filter((citation) => citation.targets.some((target) => isSingleChartCitationTarget(
            target,
            caseId,
            revisionId,
            noteIds,
            eventIds
          )));

        for (const citation of citations) {
          for (const target of citation.targets) {
            if (!isSingleChartCitationTarget(target, caseId, revisionId, noteIds, eventIds)) continue;
            if (target.kind === "chart_field" && !hasOwnDataPath(revision.facts, target.field)) {
              throw new KnowledgeRepositoryError(
                "TARGET_CONTEXT_MISMATCH",
                `引用 ${citation.id} 的命盘字段 ${target.field} 不存在于指定修订。`
              );
            }
            if (target.kind === "evidence_subject") {
              try {
                requireEvidenceSubject(target.subjectId);
              } catch {
                throw new KnowledgeRepositoryError(
                  "TARGET_NOT_FOUND",
                  `Citation ${citation.id} references unknown evidence subject ${target.subjectId}.`
                );
              }
            }
          }
        }

        const documentIds = [...new Set(citations.map((citation) => citation.documentId))].sort();
        const [rawDocuments, rawRights] = await Promise.all([
          this.database.knowledgeDocuments.bulkGet(documentIds),
          this.database.sourceRights.bulkGet(documentIds)
        ]);
        const knowledgeDocuments = await Dexie.waitFor(Promise.all(rawDocuments.map(async (record, index) => {
          if (!record) {
            throw new KnowledgeRepositoryError("DOCUMENT_NOT_FOUND", `引用资料不存在：${documentIds[index]}`);
          }
          return verifyKnowledgeDocumentIntegrity(record);
        })));
        const sourceRights = rawRights.map((record, index) => {
          if (!record) {
            throw new KnowledgeRepositoryError("SOURCE_RIGHTS_NOT_FOUND", `资料缺少来源权利记录：${documentIds[index]}`);
          }
          return sourceRightsRecordSchema.parse(record);
        });
        const documentById = new Map(knowledgeDocuments.map((record) => [record.id, record]));
        for (const rights of sourceRights) {
          const knowledgeDocument = documentById.get(rights.documentId);
          if (
            !knowledgeDocument
            || rights.documentContentHash !== knowledgeDocument.contentHash
            || (rights.origin === "user_import") !== (knowledgeDocument.recordType === "user_knowledge_document")
          ) {
            throw new KnowledgeRepositoryError(
              "SOURCE_RIGHTS_CONFLICT",
              `Source rights do not match document ${rights.documentId}.`
            );
          }
        }
        const verifiedCitations = await Dexie.waitFor(Promise.all(citations.map((citation) => {
          const knowledgeDocument = documentById.get(citation.documentId);
          if (!knowledgeDocument) {
            throw new KnowledgeRepositoryError("DOCUMENT_NOT_FOUND", `引用 ${citation.id} 的资料不存在。`);
          }
          return verifyCitationIntegrity(citation, knowledgeDocument);
        })));

        return {
          caseRecord,
          revision,
          revisionCalculationReceiptLedgerStatus: receiptLedgerAvailable
            ? "available"
            : "schema_unavailable",
          revisionCalculationReceipts,
          researchNotes,
          events,
          eventTimeMigrationReceipts,
          citations: verifiedCitations,
          knowledgeDocuments,
          sourceRights
        };
      }
    );
  }

  /**
   * Atomically reads exact formal Revision sources for the comparison desk.
   * It verifies complete chart digests plus the surrounding CaseBundle
   * relationship before exposing any column, so "latest" can never silently
   * replace the revision named in the request.
   */
  async readFormalComparisonSources(rawRequest: FormalComparisonRequest): Promise<FormalComparisonSource[]> {
    const request = formalComparisonRequestSchema.parse(structuredClone(rawRequest));
    const caseIds = [...new Set(request.slots.map((slot) => slot.caseId))];
    return this.database.transaction("r", this.database.cases, this.database.revisions, async () => {
      const [rawCases, rawRevisions] = await Promise.all([
        this.database.cases.bulkGet(caseIds),
        this.database.revisions.where("caseId").anyOf(caseIds).toArray()
      ]);
      const cases = rawCases.map((rawCase, index) => {
        if (!rawCase) {
          throw new FormalComparisonSourceError("MISSING_CASE", `找不到正式对照案例 ${caseIds[index]}。`);
        }
        return caseRecordSchema.parse(rawCase);
      });
      const revisions = await Dexie.waitFor(Promise.all(
        rawRevisions.map((revision) => verifyRevisionRecordIntegrity(revision))
      ));
      const caseById = new Map(cases.map((caseRecord) => [caseRecord.id, caseRecord]));
      const revisionById = new Map(revisions.map((revision) => [revision.id, revision]));
      for (const caseRecord of cases) {
        assertCaseBundleRelationship(
          caseRecord,
          revisions.filter((revision) => revision.caseId === caseRecord.id)
        );
      }

      return Dexie.waitFor(Promise.all(request.slots.map(async (slot): Promise<FormalComparisonSource> => {
        const caseRecord = caseById.get(slot.caseId);
        if (!caseRecord) {
          throw new FormalComparisonSourceError("MISSING_CASE", `找不到正式对照案例 ${slot.caseId}。`);
        }
        const revision = revisionById.get(slot.revisionId);
        if (!revision) {
          const existsElsewhere = await this.database.revisions.get(slot.revisionId);
          if (existsElsewhere) {
            throw new FormalComparisonSourceError(
              "CROSS_CASE_REVISION",
              `修订 ${slot.revisionId} 不属于请求中的案例 ${slot.caseId}。`
            );
          }
          throw new FormalComparisonSourceError("MISSING_REVISION", `找不到正式对照修订 ${slot.revisionId}。`);
        }
        if (revision.caseId !== slot.caseId) {
          throw new FormalComparisonSourceError(
            "CROSS_CASE_REVISION",
            `修订 ${slot.revisionId} 不属于请求中的案例 ${slot.caseId}。`
          );
        }
        return formalComparisonSourceSchema.parse({
          schemaVersion: "1.0.0",
          slotId: slot.slotId,
          caseRecord: { id: caseRecord.id, alias: caseRecord.alias },
          revision,
          revisionSnapshotDigest: await sha256Hex(revision)
        });
      })));
    });
  }

  async readPairStructureResearchSources(
    rawRequest: PairStructureResearchRequest
  ): Promise<FormalComparisonSource[]> {
    const request = pairStructureResearchRequestSchema.parse(structuredClone(rawRequest));
    return this.readFormalComparisonSources({
      schemaVersion: "1.0.0",
      baselineSlotId: "A",
      slots: request.subjects,
      transit: { mode: "same_instant", atInstant: request.atInstant }
    });
  }

  /** Permanently removes one candidate-set case and its case-level notes/events in one transaction. */
  async deleteCandidateSet(candidateSetId: string): Promise<void> {
    await this.database.transaction(
      "rw",
      [
        this.database.candidateSets,
        this.database.birthFingerprints,
        this.database.researchNotes,
        this.database.events,
        this.database.citations,
        this.database.attachments,
        this.database.tzdbMigrationReceipts,
        this.database.eventTimeMigrationReceipts
      ],
      async () => {
        const rawCandidateSet = await this.database.candidateSets.get(candidateSetId);
        if (!rawCandidateSet) {
          throw new ResearchSubjectLifecycleError("SUBJECT_NOT_FOUND", "The candidate set does not exist.");
        }
        const candidateSet = await Dexie.waitFor(this.verifyCandidateSetRecord(rawCandidateSet));
        if (candidateSet.deletedAt === null) {
          throw new ResearchSubjectLifecycleError(
            "SUBJECT_NOT_TRASHED",
            "Move the candidate set to the trash before permanently deleting it."
          );
        }
        const [noteIds, eventIds] = await Promise.all([
          this.database.researchNotes.where("caseId").equals(candidateSetId).primaryKeys(),
          this.database.events.where("caseId").equals(candidateSetId).primaryKeys()
        ]);
        const noteIdSet = new Set(noteIds);
        const eventIdSet = new Set(eventIds);
        await pruneCitationTargets(this.database.citations, (target) =>
          (target.kind === "research_note" && noteIdSet.has(target.noteId)) ||
          (target.kind === "event" && eventIdSet.has(target.eventId)) ||
          (target.kind === "chart_field" && target.caseId === candidateSetId)
        );
        await deleteAttachmentsByLinkIndexes(this.database.attachments, {
          researchSubjectIds: [candidateSetId],
          researchNoteIds: noteIds,
          eventIds
        });
        await deleteEventTimeMigrationReceiptsForEvents(this.database.eventTimeMigrationReceipts, eventIds);
        await this.database.researchNotes.where("caseId").equals(candidateSetId).delete();
        await this.database.events.where("caseId").equals(candidateSetId).delete();
        const [sourceReceiptIds, targetReceiptIds] = await Promise.all([
          this.database.tzdbMigrationReceipts.where("source.recordId").equals(candidateSetId).primaryKeys(),
          this.database.tzdbMigrationReceipts.where("target.recordId").equals(candidateSetId).primaryKeys()
        ]);
        const receiptIds = [...new Set([...sourceReceiptIds, ...targetReceiptIds])];
        if (receiptIds.length > 0) await this.database.tzdbMigrationReceipts.bulkDelete(receiptIds);
        await this.database.birthFingerprints.delete(`candidate_set:${candidateSetId}`);
        await this.database.candidateSets.delete(candidateSetId);
      }
    );
  }

  /** Atomic, read-only snapshot of the current core Case/Revision partition. */
  async readCoreDataSnapshot(): Promise<CoreBackupPayload> {
    const readSnapshot = async (): Promise<CoreBackupPayload> => {
      await this.assertLegacyBackupDoesNotOmitCalculationReceipts("read_core");
      const [cases, revisions] = await Promise.all([
        this.database.cases.toArray(),
        this.database.revisions.toArray()
      ]);
      // Preserve the exact stored representation; the backup preflight must reject,
      // rather than silently strip/trim/default, any non-canonical record.
      return { cases, revisions };
    };
    if (this.database.targetSchemaVersion >= 15) {
      return this.database.transaction(
        "r",
        [this.database.cases, this.database.revisions, this.database.revisionCalculationReceipts],
        readSnapshot
      );
    }
    return this.database.transaction("r", this.database.cases, this.database.revisions, readSnapshot);
  }

  async readMutationState(): Promise<ResearchDatabaseMutationState | null> {
    return this.database.readMutationState();
  }

  async markMutationStateVerified(
    input: MarkResearchDatabaseMutationStateVerifiedInput
  ): Promise<ResearchDatabaseMutationState | null> {
    return this.database.markMutationStateVerified(input);
  }

  /** Atomic, read-only snapshot of every partition in the current local data model. */
  async readFullDataSnapshot(options: { signal?: AbortSignal } = {}): Promise<FullBackupPayload> {
    return (await this.readFullDataSnapshotTransaction(false, options.signal)).payload;
  }

  /**
   * Boot-only atomic capture. Payload and epoch are read from the same native
   * readonly transaction, so callers must never reproduce this with two reads.
   */
  async readFullDataSnapshotWithMutationState(): Promise<FullDataSnapshotWithMutationState> {
    if (this.database.targetSchemaVersion < 16) {
      throw new ResearchDatabaseMutationStateError(
        "SCHEMA_UNSUPPORTED",
        "Atomic full-data mutation snapshots require an explicit targetSchema of 16."
      );
    }
    const { payload, mutationState } = await this.readFullDataSnapshotTransaction(true);
    return {
      payload,
      mutationState,
      epoch: mutationState?.epoch ?? 0
    };
  }

  private async readFullDataSnapshotTransaction(
    includeMutationState: boolean,
    signal?: AbortSignal
  ): Promise<{
    payload: FullBackupPayload;
    mutationState: ResearchDatabaseMutationState | null;
  }> {
    signal?.throwIfAborted();
    try {
      return await this.database.transaction(
        "r",
        [
        this.database.cases,
        this.database.revisions,
        this.database.candidateSets,
        this.database.researchNotes,
        this.database.events,
        this.database.savedViews,
        this.database.knowledgeDocuments,
        this.database.citations,
        this.database.sourceRights,
        this.database.attachments,
        this.database.researcherProfiles,
        this.database.appSettings,
        this.database.ruleRegistry,
        this.database.tzdbMigrationReceipts,
        this.database.eventTimeMigrationReceipts,
        ...(this.database.targetSchemaVersion >= 15
          ? [this.database.revisionCalculationReceipts]
          : []),
        ...(includeMutationState ? [this.database.birthFingerprints] : []),
        ...(includeMutationState ? [this.database.mutationState] : [])
        ],
        async () => {
        const transaction = Dexie.currentTransaction;
        const abortTransaction = () => transaction?.abort();
        signal?.addEventListener("abort", abortTransaction, { once: true });
        try {
        signal?.throwIfAborted();
        const [
          cases,
          revisions,
          candidateSets,
          researchNotes,
          events,
          savedViews,
          knowledgeDocuments,
          citations,
          sourceRights,
          attachments,
          researcherProfiles,
          appSettings,
          ruleRegistryRaw,
          tzdbMigrationReceiptsRaw,
          eventTimeMigrationReceiptsRaw,
          revisionCalculationReceiptsRaw,
          birthFingerprintsRaw
        ] = await Promise.all([
          this.database.cases.toArray(),
          this.database.revisions.toArray(),
          this.database.candidateSets.toArray(),
          this.database.researchNotes.toArray(),
          this.database.events.toArray(),
          this.database.savedViews.toArray(),
          this.database.knowledgeDocuments.toArray(),
          this.database.citations.toArray(),
          this.database.sourceRights.toArray(),
          this.database.attachments.toArray(),
          this.database.researcherProfiles.toArray(),
          this.database.appSettings.toArray(),
          this.database.ruleRegistry.toArray(),
          this.database.tzdbMigrationReceipts.toArray(),
          this.database.eventTimeMigrationReceipts.toArray(),
          this.database.targetSchemaVersion >= 15
            ? this.database.revisionCalculationReceipts.toArray()
            : Promise.resolve([]),
          includeMutationState
            ? this.database.birthFingerprints.toArray()
            : Promise.resolve([])
        ]);
        await Dexie.waitFor(Promise.all(savedViews.map((record) => parseVerifiedSavedViewRecord(record))));
        const verifiedAttachments = await Dexie.waitFor(
          verifyLocalAttachmentRecordsSequentially(attachments, signal)
        );
        const references: LocalAttachmentReferenceIndex = {
          subjectIds: new Set([...cases.map((record) => record.id), ...candidateSets.map((record) => record.id)]),
          caseIds: new Set(cases.map((record) => record.id)),
          revisionById: new Map(revisions.map((record) => [record.id, record])),
          noteIds: new Set(researchNotes.map((record) => record.id)),
          eventIds: new Set(events.map((record) => record.id)),
          documentIds: new Set(knowledgeDocuments.map((record) => record.id))
        };
        for (const attachment of verifiedAttachments) assertLocalAttachmentLink(attachment, references);
        if (researcherProfiles.length > 1 || appSettings.length > 1) {
          throw new Error("Local singleton partitions contain more than one record.");
        }
        researcherProfiles.forEach((record) => localResearcherProfileRecordSchema.parse(record));
        appSettings.forEach((record) => localAppSettingsRecordSchema.parse(record));
        const ruleRegistry = parseAndValidateRuleRegistryRecords(ruleRegistryRaw);
        const verifiedCandidateSets = await Dexie.waitFor(Promise.all(
          candidateSets.map((record) => this.verifyCandidateSetRecord(record))
        ));
        const tzdbMigrationReceipts = await Dexie.waitFor(
          verifyTzdbMigrationReceiptRelationships(tzdbMigrationReceiptsRaw, verifiedCandidateSets)
        );
        const verifiedEvents = events.map((record) => parseStoredEventRecord(record));
        const eventTimeMigrationReceipts = await Dexie.waitFor(
          verifyEventTimeMigrationReceiptRelationships(eventTimeMigrationReceiptsRaw, verifiedEvents)
        );
        const revisionById = new Map(revisions.map((record) => [record.id, record]));
        const revisionCalculationReceipts = await Dexie.waitFor(Promise.all(
          revisionCalculationReceiptsRaw.map((receipt) => {
            const revision = revisionById.get(receipt.sourceRevision.revisionId);
            if (!revision) {
              throw new RevisionCalculationReceiptStorageError(
                "RECEIPT_SOURCE_MISMATCH",
                `Calculation receipt ${receipt.id} references a missing Revision.`
              );
            }
            return this.verifyRevisionCalculationReceiptSource(receipt, revision);
          })
        ));
        if (includeMutationState) {
          await Dexie.waitFor(assertExactBirthFingerprintIndex(
            cases,
            revisions,
            verifiedCandidateSets,
            birthFingerprintsRaw
          ));
        }
        // Preserve exact stored values. Backup preflight owns strict shape and relationship checks.
        const payload: FullBackupPayload = {
          cases,
          revisions,
          candidateSets,
          researchNotes,
          events,
          savedViews,
          knowledgeDocuments,
          citations,
          sourceRights,
          attachments,
          researcherProfiles,
          appSettings,
          ruleRegistry,
          tzdbMigrationReceipts,
          eventTimeMigrationReceipts,
          revisionCalculationReceipts
        };
        const mutationState = includeMutationState
          ? await readStrictResearchDatabaseMutationState(this.database.mutationState)
          : null;
        signal?.throwIfAborted();
        return { payload, mutationState };
        } finally {
          signal?.removeEventListener("abort", abortTransaction);
        }
      }
      );
    } catch (reason) {
      signal?.throwIfAborted();
      throw reason;
    }
  }

  /** Atomic count used by backup/UI preflight before a destructive core restore. */
  async readDependentDataCounts(): Promise<DependentDataCounts> {
    return this.database.transaction(
      "r",
      [
        this.database.researchNotes,
        this.database.events,
        this.database.savedViews,
        this.database.knowledgeDocuments,
        this.database.citations,
        this.database.sourceRights,
        this.database.attachments,
        this.database.ruleRegistry,
        this.database.tzdbMigrationReceipts,
        this.database.eventTimeMigrationReceipts
      ],
      () => this.countDependentData()
    );
  }

  /**
   * Replaces only the Case/Revision partition in one Dexie transaction.
   * The operation refuses to proceed while any dependent research partition is non-empty.
   * Shape and relationship validation of the incoming snapshot belong to the core-backup package.
   */
  async replaceCoreDataSnapshot(snapshot: CoreBackupPayload): Promise<void> {
    const cases = snapshot.cases.map((record) => caseRecordSchema.parse(record));
    const revisions = await Promise.all(snapshot.revisions.map((record) => verifyRevisionRecordIntegrity(record)));
    const revisionFingerprints = await Promise.all(revisions.map((revision) => revisionFingerprintRecord(revision)));
    await this.database.transaction(
      "rw",
      [
        this.database.cases,
        this.database.revisions,
        this.database.candidateSets,
        this.database.birthFingerprints,
        this.database.researchNotes,
        this.database.events,
        this.database.savedViews,
        this.database.knowledgeDocuments,
        this.database.citations,
        this.database.sourceRights,
        this.database.attachments,
        this.database.ruleRegistry,
        this.database.tzdbMigrationReceipts,
        this.database.eventTimeMigrationReceipts,
        ...(this.database.targetSchemaVersion >= 15
          ? [this.database.revisionCalculationReceipts]
          : [])
      ],
      async () => {
        await this.assertLegacyBackupDoesNotOmitCalculationReceipts("replace_core");
        const dependentDataCounts = await this.countDependentData();
        if (Object.values(dependentDataCounts).some((count) => count > 0)) {
          throw new CoreDataReplaceBlockedError(dependentDataCounts);
        }
        const retainedIds = new Set([
          ...await this.database.candidateSets.toCollection().primaryKeys(),
          ...await this.database.knowledgeDocuments.toCollection().primaryKeys(),
          ...await this.database.citations.toCollection().primaryKeys(),
          ...await this.database.attachments.toCollection().primaryKeys(),
          ...await this.database.ruleRegistry.toCollection().primaryKeys(),
          ...await this.database.tzdbMigrationReceipts.toCollection().primaryKeys(),
          ...await this.database.eventTimeMigrationReceipts.toCollection().primaryKeys()
        ]);
        const conflictingIds = [...new Set([
          ...cases.map((record) => record.id),
          ...revisions.map((record) => record.id)
        ].filter((id) => retainedIds.has(id)))].sort();
        if (conflictingIds.length > 0) {
          throw new CoreDataIdentityConflictError(conflictingIds);
        }
        const retainedCandidateSets = await Dexie.waitFor(Promise.all(
          (await this.database.candidateSets.toArray()).map((record) => this.verifyCandidateSetRecord(record))
        ));
        const retainedCandidateFingerprints = await Dexie.waitFor(Promise.all(
          retainedCandidateSets.map((candidateSet) => candidateFingerprintRecord(candidateSet))
        ));
        await this.database.birthFingerprints.clear();
        await this.database.revisions.clear();
        await this.database.cases.clear();
        if (cases.length) await this.database.cases.bulkAdd(cases);
        if (revisions.length) await this.database.revisions.bulkAdd(revisions);
        const fingerprints = [...retainedCandidateFingerprints, ...revisionFingerprints];
        if (fingerprints.length) await this.database.birthFingerprints.bulkAdd(fingerprints);
      }
    );
  }

  /**
   * Atomically replaces every partition in the current local data model.
   * Unlike the legacy core-only restore, this intentionally replaces dependent
   * research data and therefore is not subject to CoreDataReplaceBlockedError.
   */
  async replaceFullDataSnapshot(
    callerOwnedSnapshot: FullBackupPayload,
    options: { expectedCurrentPayloadDigest?: string } = {}
  ): Promise<void> {
    const snapshot = captureDeclarativeFullDataSnapshot(callerOwnedSnapshot);
    const expectedCurrentPayloadDigest = captureExpectedCurrentPayloadDigest(options);
    if (
      this.database.targetSchemaVersion < 15 &&
      snapshot.revisionCalculationReceipts.length > 0
    ) {
      throw new RevisionCalculationReceiptStorageError(
        "SCHEMA_UNSUPPORTED",
        "A Schema 13/14 database cannot restore non-empty Revision calculation receipts."
      );
    }
    assertFullDataUniqueIds(snapshot);
    // Snapshot every stored Event and receipt before the first asynchronous
    // verification step so a caller cannot swap historical time semantics
    // while another partition is being checked.
    const events = snapshot.events.map((record) => parseStoredEventRecord(record));
    const structurallyStoredEventTimeMigrationReceipts =
      snapshot.eventTimeMigrationReceipts.map((record) =>
        storedEventTimeMigrationReceiptSchema.parse(record)
      );
    const ruleRegistry = parseAndValidateRuleRegistryRecords(snapshot.ruleRegistry);
    const cases = snapshot.cases.map((record) => caseRecordSchema.parse(record));
    const revisions = await Promise.all(snapshot.revisions.map((record) => verifyRevisionRecordIntegrity(record)));
    const receiptRevisionById = new Map(revisions.map((record) => [record.id, record]));
    const revisionCalculationReceipts = this.database.targetSchemaVersion >= 15
      ? await Promise.all(snapshot.revisionCalculationReceipts.map((receipt) => {
          const revision = receiptRevisionById.get(receipt.sourceRevision.revisionId);
          if (!revision) {
            throw new RevisionCalculationReceiptStorageError(
              "RECEIPT_SOURCE_MISMATCH",
              `Calculation receipt ${receipt.id} references a missing Revision.`
            );
          }
          return this.verifyRevisionCalculationReceiptSource(receipt, revision);
        }))
      : [];
    const requestFingerprints = new Set<string>();
    for (const receipt of revisionCalculationReceipts) {
      if (requestFingerprints.has(receipt.requestFingerprint)) {
        throw new RevisionCalculationReceiptStorageError(
          "DUPLICATE_REQUEST_FINGERPRINT",
          `Calculation request ${receipt.requestFingerprint} appears more than once.`
        );
      }
      requestFingerprints.add(receipt.requestFingerprint);
    }
    const candidateSets = await Promise.all(snapshot.candidateSets.map((record) => this.verifyCandidateSetRecord(record)));
    const tzdbMigrationReceipts = await verifyTzdbMigrationReceiptRelationships(
      snapshot.tzdbMigrationReceipts,
      candidateSets
    );
    const researchNotes = snapshot.researchNotes.map((record) => researchNoteRecordSchema.parse(record));
    await Promise.all(events.map((event) => verifyStoredEventTimeContextWithBundledArtifact({
      datePrecision: event.datePrecision,
      startDate: event.startDate,
      endDate: event.endDate,
      timeContext: event.timeContext
    })));
    const eventTimeMigrationReceipts = await verifyEventTimeMigrationReceiptRelationships(
      structurallyStoredEventTimeMigrationReceipts,
      events
    );
    const savedViews = await Promise.all(snapshot.savedViews.map((record) => parseVerifiedSavedViewRecord(record)));
    const attachments = await verifyLocalAttachmentRecordsSequentially(snapshot.attachments);
    if (snapshot.researcherProfiles.length > 1 || snapshot.appSettings.length > 1) {
      throw new Error("Local singleton partitions may contain at most one record each.");
    }
    const researcherProfiles = snapshot.researcherProfiles.map((record) =>
      localResearcherProfileRecordSchema.parse(record)
    );
    const appSettings = snapshot.appSettings.map((record) => localAppSettingsRecordSchema.parse(record));
    const knowledgeDocuments: KnowledgeDocumentRecord[] = [];
    const citationVerifierByDocumentId = new Map<
      string,
      Awaited<ReturnType<typeof createKnowledgeDocumentCitationIntegrityVerifier>>
    >();
    for (const record of snapshot.knowledgeDocuments) {
      const verifier = await createKnowledgeDocumentCitationIntegrityVerifier(record);
      const knowledgeDocument = knowledgeDocumentRecordSchema.parse(verifier.document);
      knowledgeDocuments.push(knowledgeDocument);
      citationVerifierByDocumentId.set(knowledgeDocument.id, verifier);
    }
    const documentById = new Map(knowledgeDocuments.map((record) => [record.id, record]));
    if (new Set(knowledgeDocuments.map((record) => record.contentHash)).size !== knowledgeDocuments.length) {
      throw new DuplicateKnowledgeDocumentError();
    }
    const sourceRights = snapshot.sourceRights.map((record) => sourceRightsRecordSchema.parse(record));
    const sourceRightsByDocumentId = new Map<string, SourceRightsRecord>();
    for (const rightsRecord of sourceRights) {
      if (sourceRightsByDocumentId.has(rightsRecord.documentId)) {
        throw new KnowledgeRepositoryError(
          "SOURCE_RIGHTS_CONFLICT",
          `Document ${rightsRecord.documentId} has more than one source-rights record.`
        );
      }
      const knowledgeDocument = documentById.get(rightsRecord.documentId);
      if (!knowledgeDocument || knowledgeDocument.contentHash !== rightsRecord.documentContentHash) {
        throw new KnowledgeRepositoryError(
          "SOURCE_RIGHTS_CONFLICT",
          `Source-rights record for ${rightsRecord.documentId} is orphaned or bound to a different content hash.`
        );
      }
      if (
        (rightsRecord.origin === "user_import") !==
        (knowledgeDocument.recordType === "user_knowledge_document")
      ) {
        throw new KnowledgeRepositoryError(
          "SOURCE_RIGHTS_CONFLICT",
          `Source-rights origin does not match KnowledgeDocument ${rightsRecord.documentId}.`
        );
      }
      sourceRightsByDocumentId.set(rightsRecord.documentId, rightsRecord);
    }
    for (const knowledgeDocument of knowledgeDocuments) {
      if (!sourceRightsByDocumentId.has(knowledgeDocument.id)) {
        throw new KnowledgeRepositoryError(
          "SOURCE_RIGHTS_NOT_FOUND",
          `KnowledgeDocument ${knowledgeDocument.id} is missing its source-rights record.`
        );
      }
    }
    const citations = snapshot.citations.map((record) => {
      const parsed = citationRecordSchema.parse(record);
      const verifier = citationVerifierByDocumentId.get(parsed.documentId);
      if (!verifier) throw new KnowledgeRepositoryError("DOCUMENT_NOT_FOUND", `引用 ${parsed.id} 的资料不存在。`);
      return citationRecordSchema.parse(verifier.verifyCitation(parsed));
    });
    const caseIds = new Set(cases.map((record) => record.id));
    const subjectIds = new Set([...caseIds, ...candidateSets.map((record) => record.id)]);
    const revisionById = new Map(revisions.map((record) => [record.id, record]));
    const noteIds = new Set(researchNotes.map((record) => record.id));
    const eventIds = new Set(events.map((record) => record.id));
    const attachmentReferences: LocalAttachmentReferenceIndex = {
      subjectIds,
      caseIds,
      revisionById,
      noteIds,
      eventIds,
      documentIds: new Set(knowledgeDocuments.map((record) => record.id))
    };
    for (const attachment of attachments) assertLocalAttachmentLink(attachment, attachmentReferences);
    for (const citation of citations) {
      for (const target of citation.targets) {
        if (target.kind === "research_note" && !noteIds.has(target.noteId)) {
          throw new KnowledgeRepositoryError("TARGET_NOT_FOUND", `引用 ${citation.id} 的研究笔记目标不存在。`);
        }
        if (target.kind === "event" && !eventIds.has(target.eventId)) {
          throw new KnowledgeRepositoryError("TARGET_NOT_FOUND", `引用 ${citation.id} 的事件目标不存在。`);
        }
        if (target.kind === "evidence_subject") {
          try {
            requireEvidenceSubject(target.subjectId);
          } catch (cause) {
            throw new KnowledgeRepositoryError(
              "TARGET_NOT_FOUND",
              `Citation ${citation.id} references unknown evidence subject ${target.subjectId}.`
            );
          }
          continue;
        }
        if (target.kind === "chart_field") {
          const revision = revisionById.get(target.revisionId);
          if (
            !caseIds.has(target.caseId) ||
            !revision ||
            revision.caseId !== target.caseId ||
            !hasOwnDataPath(revision.facts, target.field)
          ) {
            throw new KnowledgeRepositoryError("TARGET_CONTEXT_MISMATCH", `引用 ${citation.id} 的命盘字段目标上下文无效。`);
          }
        }
      }
    }
    const birthFingerprints = await Promise.all([
      ...revisions.map((revision) => revisionFingerprintRecord(revision)),
      ...candidateSets.map((candidateSet) => candidateFingerprintRecord(candidateSet))
    ]);

    await this.database.transaction(
      "rw",
      [
        this.database.cases,
        this.database.revisions,
        this.database.candidateSets,
        this.database.researchNotes,
        this.database.events,
        this.database.savedViews,
        this.database.knowledgeDocuments,
        this.database.citations,
        this.database.sourceRights,
        this.database.attachments,
        this.database.researcherProfiles,
        this.database.appSettings,
        this.database.ruleRegistry,
        this.database.tzdbMigrationReceipts,
        this.database.eventTimeMigrationReceipts,
        this.database.birthFingerprints,
        ...(this.database.targetSchemaVersion >= 15
          ? [this.database.revisionCalculationReceipts]
          : [])
      ],
      async () => {
        if (expectedCurrentPayloadDigest !== undefined) {
          const [
            currentCases,
            currentRevisions,
            currentCandidateSets,
            currentNotes,
            currentEvents,
            currentViews,
            currentDocuments,
            currentCitations,
            currentSourceRights,
            currentAttachments,
            currentResearcherProfiles,
            currentAppSettings,
            currentRuleRegistryRaw,
            currentTzdbMigrationReceipts,
            currentEventTimeMigrationReceipts,
            currentRevisionCalculationReceipts
          ] = await Promise.all([
            this.database.cases.toArray(),
            this.database.revisions.toArray(),
            this.database.candidateSets.toArray(),
            this.database.researchNotes.toArray(),
            this.database.events.toArray(),
            this.database.savedViews.toArray(),
            this.database.knowledgeDocuments.toArray(),
            this.database.citations.toArray(),
            this.database.sourceRights.toArray(),
            this.database.attachments.toArray(),
            this.database.researcherProfiles.toArray(),
            this.database.appSettings.toArray(),
            this.database.ruleRegistry.toArray(),
            this.database.tzdbMigrationReceipts.toArray(),
            this.database.eventTimeMigrationReceipts.toArray(),
            this.database.targetSchemaVersion >= 15
              ? this.database.revisionCalculationReceipts.toArray()
              : Promise.resolve([])
          ]);
          const currentRuleRegistry = parseAndValidateRuleRegistryRecords(currentRuleRegistryRaw);
          const currentDigest = await Dexie.waitFor(sha256Hex(canonicalFullDataSnapshotForDigest({
            cases: currentCases,
            revisions: currentRevisions,
            candidateSets: currentCandidateSets,
            researchNotes: currentNotes,
            events: currentEvents,
            savedViews: currentViews,
            knowledgeDocuments: currentDocuments,
            citations: currentCitations,
            sourceRights: currentSourceRights,
            attachments: currentAttachments,
            researcherProfiles: currentResearcherProfiles,
            appSettings: currentAppSettings,
            ruleRegistry: currentRuleRegistry,
            tzdbMigrationReceipts: currentTzdbMigrationReceipts,
            eventTimeMigrationReceipts: currentEventTimeMigrationReceipts,
            revisionCalculationReceipts: currentRevisionCalculationReceipts
          })));
          if (currentDigest !== expectedCurrentPayloadDigest) {
            throw new FullDataReplaceConflictError();
          }
        }
        await this.database.researchNotes.clear();
        await this.database.events.clear();
        await this.database.savedViews.clear();
        await this.database.citations.clear();
        await this.database.sourceRights.clear();
        await this.database.attachments.clear();
        await this.database.researcherProfiles.clear();
        await this.database.appSettings.clear();
        await this.database.ruleRegistry.clear();
        await this.database.tzdbMigrationReceipts.clear();
        await this.database.eventTimeMigrationReceipts.clear();
        if (this.database.targetSchemaVersion >= 15) {
          await this.database.revisionCalculationReceipts.clear();
        }
        await this.database.knowledgeDocuments.clear();
        await this.database.candidateSets.clear();
        await this.database.birthFingerprints.clear();
        await this.database.revisions.clear();
        await this.database.cases.clear();

        if (cases.length) await this.database.cases.bulkAdd(cases);
        if (revisions.length) await this.database.revisions.bulkAdd(revisions);
        if (candidateSets.length) await this.database.candidateSets.bulkAdd(candidateSets);
        if (researchNotes.length) await this.database.researchNotes.bulkAdd(researchNotes);
        if (events.length) await this.database.events.bulkAdd(events);
        if (savedViews.length) await this.database.savedViews.bulkAdd(savedViews);
        if (knowledgeDocuments.length) await this.database.knowledgeDocuments.bulkAdd(knowledgeDocuments);
        if (sourceRights.length) await this.database.sourceRights.bulkAdd(sourceRights);
        if (citations.length) await this.database.citations.bulkAdd(citations);
        if (attachments.length) await this.database.attachments.bulkAdd(attachments);
        if (researcherProfiles.length) await this.database.researcherProfiles.bulkAdd(researcherProfiles);
        if (appSettings.length) await this.database.appSettings.bulkAdd(appSettings);
        if (ruleRegistry.length) await this.database.ruleRegistry.bulkAdd(ruleRegistry);
        if (tzdbMigrationReceipts.length) {
          await this.database.tzdbMigrationReceipts.bulkAdd(tzdbMigrationReceipts);
        }
        if (eventTimeMigrationReceipts.length) {
          await this.database.eventTimeMigrationReceipts.bulkAdd(eventTimeMigrationReceipts);
        }
        if (revisionCalculationReceipts.length) {
          await this.database.revisionCalculationReceipts.bulkAdd(revisionCalculationReceipts);
        }
        if (birthFingerprints.length) await this.database.birthFingerprints.bulkAdd(birthFingerprints);
      }
    );
  }

  /** Permanently removes one case and every dependent revision, note, and event in one transaction. */
  async deleteCase(caseId: string): Promise<void> {
    await this.database.transaction(
      "rw",
      [
        this.database.cases,
        this.database.revisions,
        this.database.birthFingerprints,
        this.database.researchNotes,
        this.database.events,
         this.database.citations,
         this.database.attachments,
         this.database.eventTimeMigrationReceipts,
         ...(this.database.targetSchemaVersion >= 15
           ? [this.database.revisionCalculationReceipts]
           : [])
       ],
      async () => {
        const caseRecord = await this.database.cases.get(caseId);
        if (!caseRecord) throw new ResearchSubjectLifecycleError("SUBJECT_NOT_FOUND", "The case does not exist.");
        if (caseRecord.deletedAt === null) {
          throw new ResearchSubjectLifecycleError(
            "SUBJECT_NOT_TRASHED",
            "Move the case to the trash before permanently deleting it."
          );
        }
        const [revisionIds, noteIds, eventIds] = await Promise.all([
          this.database.revisions.where("caseId").equals(caseId).primaryKeys(),
          this.database.researchNotes.where("caseId").equals(caseId).primaryKeys(),
          this.database.events.where("caseId").equals(caseId).primaryKeys()
        ]);
        const revisionIdSet = new Set(revisionIds);
        const noteIdSet = new Set(noteIds);
        const eventIdSet = new Set(eventIds);
        await pruneCitationTargets(this.database.citations, (target) =>
          (target.kind === "research_note" && noteIdSet.has(target.noteId)) ||
          (target.kind === "event" && eventIdSet.has(target.eventId)) ||
          (target.kind === "chart_field" && (target.caseId === caseId || revisionIdSet.has(target.revisionId)))
        );
        await deleteAttachmentsByLinkIndexes(this.database.attachments, {
          researchSubjectIds: [caseId],
          revisionCaseIds: [caseId],
          revisionIds,
          researchNoteIds: noteIds,
          eventIds
        });
         await deleteEventTimeMigrationReceiptsForEvents(this.database.eventTimeMigrationReceipts, eventIds);
         if (this.database.targetSchemaVersion >= 15) {
           await this.database.revisionCalculationReceipts
             .where("sourceRevision.caseId")
             .equals(caseId)
             .delete();
         }
         await this.database.researchNotes.where("caseId").equals(caseId).delete();
        await this.database.events.where("caseId").equals(caseId).delete();
        await this.database.revisions.where("caseId").equals(caseId).delete();
        await this.database.birthFingerprints.bulkDelete(revisionIds.map((revisionId) => `revision:${revisionId}`));
        await this.database.cases.delete(caseId);
      }
    );
  }

  async clearAll(): Promise<void> {
    await this.database.transaction(
      "rw",
      [
        this.database.cases,
        this.database.revisions,
        this.database.candidateSets,
        this.database.researchNotes,
        this.database.events,
        this.database.savedViews,
        this.database.knowledgeDocuments,
        this.database.citations,
        this.database.sourceRights,
        this.database.attachments,
        this.database.researcherProfiles,
        this.database.appSettings,
        this.database.ruleRegistry,
         this.database.tzdbMigrationReceipts,
         this.database.eventTimeMigrationReceipts,
         this.database.birthFingerprints,
         ...(this.database.targetSchemaVersion >= 15
           ? [this.database.revisionCalculationReceipts]
           : []),
         ...(this.database.targetSchemaVersion >= 16
           ? [this.database.mutationState]
           : [])
       ],
      async () => {
        await this.database.researchNotes.clear();
        await this.database.events.clear();
        await this.database.savedViews.clear();
        await this.database.citations.clear();
        await this.database.sourceRights.clear();
        await this.database.attachments.clear();
        await this.database.researcherProfiles.clear();
        await this.database.appSettings.clear();
        await this.database.ruleRegistry.clear();
         await this.database.tzdbMigrationReceipts.clear();
         await this.database.eventTimeMigrationReceipts.clear();
         if (this.database.targetSchemaVersion >= 15) {
           await this.database.revisionCalculationReceipts.clear();
         }
         await this.database.knowledgeDocuments.clear();
        await this.database.candidateSets.clear();
        await this.database.birthFingerprints.clear();
        await this.database.cases.clear();
        await this.database.revisions.clear();
        // Operational metadata is not user backup data. Clear it last so this
        // privacy transaction commits with every physical v16 store empty and
        // the next boot must establish a fresh epoch-zero verification marker.
        if (this.database.targetSchemaVersion >= 16) {
          await this.database.mutationState.clear();
        }
      }
    );
  }
}

export type ResearchRepositoryErrorCode =
  | "CASE_NOT_FOUND"
  | "REVISION_NOT_FOUND"
  | "REVISION_CASE_MISMATCH"
  | "NOTE_NOT_FOUND"
  | "EVENT_NOT_FOUND"
  | "LEGACY_EVENT_TIME_MIGRATION_REQUIRED"
  | "HISTORICAL_EVENT_TIME_DERIVATION_REQUIRED"
  | "TRANSIT_CONTEXT_MISMATCH"
  | "SAVED_VIEW_NOT_FOUND"
  | "SAVED_VIEW_MIGRATION_REQUIRED"
  | "SAVED_VIEW_NOT_MIGRATION_REQUIRED"
  | "SAVED_VIEW_QUERY_DIGEST_MISMATCH"
  | "SAVED_VIEW_EDIT_VERSION_CONFLICT"
  | "EDIT_VERSION_CONFLICT";

export class ResearchRepositoryError extends Error {
  constructor(readonly code: ResearchRepositoryErrorCode, message: string) {
    super(message);
    this.name = "ResearchRepositoryError";
  }
}

export type CreateResearchNoteInput = {
  caseId: string;
  anchor: ResearchNoteAnchor;
  body: string;
  tags: string[];
  sourceRefs: string[];
  lifecycle: ResearchNoteRecord["lifecycle"];
};

export type UpdateResearchNoteInput = {
  expectedEditVersion: number;
  patch: Partial<Pick<ResearchNoteRecord, "body" | "tags" | "sourceRefs" | "lifecycle">>;
};

export type EventTimeWriteInput = {
  /** Required for every newly written minute event; never inferred from the chart or device. */
  timeZone?: string;
  /** Required when the start minute falls inside a DST overlap. */
  startDisambiguation?: DstDisambiguationPolicy;
  /** Required when the end minute falls inside a DST overlap. */
  endDisambiguation?: DstDisambiguationPolicy;
};

export type CreateEventInput = EventTimeWriteInput & {
  caseId: string;
  revisionId: string | null;
  transitNodeRef: TransitNodeRef | null;
  datePrecision: EventRecord["datePrecision"];
  startDate: string | null;
  endDate: string | null;
  title: string;
  tags: string[];
  sourceRefs: string[];
  feedback: EventRecord["feedback"];
  body: string;
};

export type UpdateEventInput = Partial<Pick<
  EventRecord,
  "revisionId" | "datePrecision" | "startDate" | "endDate" | "title" | "tags" | "sourceRefs" | "feedback" | "body"
>> & EventTimeWriteInput & { transitNodeRef?: TransitNodeRef | null };

function hasProtectedEventTimeSemanticChange(
  current: EventRecord,
  patch: UpdateEventInput,
  nextDates: Pick<EventRecord, "datePrecision" | "startDate" | "endDate">
): boolean {
  if (
    nextDates.datePrecision !== current.datePrecision ||
    nextDates.startDate !== current.startDate ||
    nextDates.endDate !== current.endDate
  ) {
    return true;
  }

  if (current.timeContext.kind === "legacy_floating") {
    if (nextDates.datePrecision !== "minute") return false;
    return patch.timeZone !== undefined ||
      patch.startDisambiguation !== undefined ||
      patch.endDisambiguation !== undefined;
  }

  if (current.timeContext.kind !== "zoned_minute") return false;
  return (
    patch.timeZone !== undefined && patch.timeZone !== current.timeContext.timeZone
  ) || (
    patch.startDisambiguation !== undefined &&
    patch.startDisambiguation !== current.timeContext.start.resolution.policy
  ) || (
    current.timeContext.end !== null &&
    patch.endDisambiguation !== undefined &&
    patch.endDisambiguation !== current.timeContext.end.resolution.policy
  );
}

function resolveUpdatedEventTimeContext(
  current: EventRecord,
  patch: UpdateEventInput,
  nextDates: Pick<EventRecord, "datePrecision" | "startDate" | "endDate">
): EventRecord["timeContext"] {
  if (current.timeContext.kind === "legacy_floating") {
    if (hasProtectedEventTimeSemanticChange(current, patch, nextDates)) {
      throw new ResearchRepositoryError(
        "LEGACY_EVENT_TIME_MIGRATION_REQUIRED",
        "Legacy floating event time must be migrated through the explicit migration workflow before editing."
      );
    }
    return current.timeContext;
  }

  if (
    current.timeContext.kind === "zoned_minute" &&
    classifyStoredTimeZoneDatabase(current.timeContext) !== "current_exact"
  ) {
    if (hasProtectedEventTimeSemanticChange(current, patch, nextDates)) {
      throw new ResearchRepositoryError(
        "HISTORICAL_EVENT_TIME_DERIVATION_REQUIRED",
        "Historical zoned Event time must be preserved and reinterpreted through a future new-ID derivation workflow."
      );
    }
    return current.timeContext;
  }

  const currentZoned = current.timeContext.kind === "zoned_minute" ? current.timeContext : null;
  return resolveEventTimeContext({
    ...nextDates,
    timeZone: patch.timeZone ?? currentZoned?.timeZone,
    startDisambiguation: patch.startDisambiguation ?? currentZoned?.start.resolution.policy,
    endDisambiguation: patch.endDisambiguation ?? currentZoned?.end?.resolution.policy
  });
}

export type CreateSavedViewInput = {
  name: string;
  query: ResearchQuery;
};

export type UpdateSavedViewInput = {
  expectedEditVersion: number;
  patch: Partial<Pick<CreateSavedViewInput, "name" | "query">>;
};

export type ResolveSavedViewMigrationInput = {
  expectedEditVersion: number;
  query: ResearchQuery;
  name?: string;
};

export type SavedViewState = Pick<ReadySavedViewRecord, "query">;

export type ResearchSearchHit = {
  caseRecord: ResearchSubjectRecord;
  matchedCaseMetadata: boolean;
  matchingNoteIds: string[];
};

export type SearchCasesAndNotesPageOptions = ListResearchSubjectPageOptions & {
  includeArchivedNotes?: boolean;
};

export type ResearchSearchPage = {
  items: ResearchSearchHit[];
  total: number;
  nextCursor: ResearchSubjectPageCursor | null;
};

const RESEARCH_JOURNAL_INDEX_RECORD_LIMIT = 10_000;
const RESEARCH_JOURNAL_RECEIPT_RECORD_LIMIT = 512;
const RESEARCH_JOURNAL_TARGET_KEY_BATCH_SIZE = 128;
const RESEARCH_JOURNAL_CITATION_INDEX_ENTRY_LIMIT = RESEARCH_JOURNAL_INDEX_RECORD_LIMIT * 100;
const RESEARCH_JOURNAL_RECEIPT_INDEX_ENTRY_LIMIT = RESEARCH_JOURNAL_RECEIPT_RECORD_LIMIT * 2;
const RESEARCH_JOURNAL_CITATION_KNOWLEDGE_UTF8_BUDGET = 64 * 1024 * 1024;
const RESEARCH_JOURNAL_RECEIPT_UTF8_BUDGET = 8 * 1024 * 1024;
const RESEARCH_JOURNAL_UUID = /^(?:00000000-0000-0000-0000-000000000000|[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/iu;

export const RESEARCH_JOURNAL_SNAPSHOT_PROFILE = Object.freeze({
  transactionMode: "readonly" as const,
  storeNames: Object.freeze([
    "cases",
    "candidateSets",
    "researchNotes",
    "events",
    "citations",
    "knowledgeDocuments",
    "eventTimeMigrationReceipts"
  ]),
  maxResearchNoteRecords: RESEARCH_JOURNAL_INDEX_RECORD_LIMIT,
  maxEventRecords: RESEARCH_JOURNAL_INDEX_RECORD_LIMIT,
  maxCitationRecords: RESEARCH_JOURNAL_INDEX_RECORD_LIMIT,
  maxEventTimeMigrationReceiptRecords: RESEARCH_JOURNAL_RECEIPT_RECORD_LIMIT,
  maxCitationIndexEntries: RESEARCH_JOURNAL_CITATION_INDEX_ENTRY_LIMIT,
  maxEventTimeMigrationReceiptIndexEntries: RESEARCH_JOURNAL_RECEIPT_INDEX_ENTRY_LIMIT,
  targetKeyBatchSize: RESEARCH_JOURNAL_TARGET_KEY_BATCH_SIZE,
  maxCitationAndKnowledgeUtf8Bytes: RESEARCH_JOURNAL_CITATION_KNOWLEDGE_UTF8_BUDGET,
  maxReceiptUtf8Bytes: RESEARCH_JOURNAL_RECEIPT_UTF8_BUDGET,
  maximumKnowledgeDocumentDigestConcurrency: 1 as const,
  citationDiscovery: "exact_target_keys_multi_entry_index" as const,
  citationIndexInvariantDependency: "startup_gate_verified_target_keys_index" as const,
  detectsOutOfBandPostStartupMissingCitationIndexWrites: false as const,
  receiptIndexInvariantDependency: "startup_gate_verified_event_time_receipt_endpoint_indexes" as const,
  detectsOutOfBandPostStartupMissingReceiptIndexWrites: false as const
});

export type ResearchJournalAuxiliaryErrorCode =
  | "CITATION_DATA_INVALID"
  | "CITATION_RESOURCE_LIMIT_EXCEEDED"
  | "RECEIPT_DATA_INVALID"
  | "RECEIPT_RESOURCE_LIMIT_EXCEEDED";

export type ResearchJournalAuxiliaryIndex<T> =
  | Readonly<{ status: "loaded"; records: readonly T[] }>
  | Readonly<{ status: "error"; code: ResearchJournalAuxiliaryErrorCode; message: string }>;

type ResearchJournalAuxiliaryError = Extract<
  ResearchJournalAuxiliaryIndex<never>,
  { status: "error" }
>;

export type ResearchJournalSnapshot = Readonly<{
  caseId: string;
  profile: typeof RESEARCH_JOURNAL_SNAPSHOT_PROFILE;
  notes: readonly ResearchNoteRecord[];
  events: readonly EventRecord[];
  citationIndex: ResearchJournalAuxiliaryIndex<CitationRecord>;
  receiptIndex: ResearchJournalAuxiliaryIndex<EventTimeMigrationReceipt>;
  boundary: Readonly<{
    atomicStorageSnapshotVerified: true;
    caseIdBound: true;
    transactionMode: "readonly";
    mutationEpochRead: false;
    mutationEpochRevalidationPerformed: false;
    storageMutationPerformed: false;
    schemaOrReleaseIdentityMutationPerformed: false;
    expertTruthClaimed: false;
    publicReleaseAuthorized: false;
    formalActivationAllowed: false;
  }>;
}>;

export type ReadResearchJournalSnapshotOptions = Readonly<{
  signal?: AbortSignal;
}>;

export type ResearchJournalSnapshotErrorCode =
  | "RESEARCH_JOURNAL_DATABASE_NOT_OPEN"
  | "RESEARCH_JOURNAL_CORE_RESOURCE_LIMIT_EXCEEDED"
  | "RESEARCH_JOURNAL_CORE_DATA_INVALID";

export class ResearchJournalSnapshotError extends Error {
  constructor(readonly code: ResearchJournalSnapshotErrorCode, message: string) {
    super(message);
    this.name = "ResearchJournalSnapshotError";
  }
}

function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x7f) bytes += 1;
    else if (codeUnit <= 0x7ff) bytes += 2;
    else if (codeUnit >= 0xd800 && codeUnit <= 0xdbff && index + 1 < value.length) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        index += 1;
      } else {
        bytes += 3;
      }
    } else bytes += 3;
  }
  return bytes;
}

function deepFreezeResearchJournalValue<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) return value;
  const object = value as object;
  if (seen.has(object)) return value;
  seen.add(object);
  for (const key of Reflect.ownKeys(object)) {
    deepFreezeResearchJournalValue(Reflect.get(object, key), seen);
  }
  return Object.freeze(value);
}

function researchJournalAuxiliaryError(
  code: ResearchJournalAuxiliaryErrorCode,
  message: string
): ResearchJournalAuxiliaryError {
  return Object.freeze({ status: "error" as const, code, message });
}

function compareJournalRecordRecency(
  left: { id: string; updatedAt: string },
  right: { id: string; updatedAt: string }
): number {
  return right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id);
}

export class ResearchRepository {
  constructor(
    readonly database = new ResearchDatabase(),
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  /**
   * Captures the complete default Research Journal projection for one Case from
   * one explicitly-opened readonly IndexedDB transaction. Citation discovery
   * intentionally depends on the startup-verified targetKeys index invariant;
   * this focused reader cannot discover an out-of-band missing-index write made
   * after that gate.
   */
  async readResearchJournalSnapshot(
    caseId: string,
    options: ReadResearchJournalSnapshotOptions = {}
  ): Promise<ResearchJournalSnapshot> {
    if (
      options === null
      || typeof options !== "object"
      || Array.isArray(options)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(options))
      || Reflect.ownKeys(options).some((key) => key !== "signal")
    ) {
      throw new TypeError("Research Journal snapshot options must be a plain exact object.");
    }
    const signalDescriptor = Object.getOwnPropertyDescriptor(options, "signal");
    if (
      signalDescriptor
      && (!Object.hasOwn(signalDescriptor, "value") || signalDescriptor.get || signalDescriptor.set)
    ) {
      throw new TypeError("Research Journal snapshot options cannot contain accessors.");
    }
    const signal = signalDescriptor?.value as AbortSignal | undefined;
    if (
      signal !== undefined
      && (
        signal === null
        || typeof signal !== "object"
        || typeof signal.throwIfAborted !== "function"
        || typeof signal.addEventListener !== "function"
        || typeof signal.removeEventListener !== "function"
      )
    ) {
      throw new TypeError("Research Journal snapshot signal must be an AbortSignal.");
    }
    if (!this.database.isOpen()) {
      throw new ResearchJournalSnapshotError(
        "RESEARCH_JOURNAL_DATABASE_NOT_OPEN",
        "研究日志快照要求数据库已由启动流程显式打开；本方法不会隐式建库或升级。"
      );
    }

    type CapturedCitationPartition =
      | Readonly<{
          status: "captured";
          citations: CitationRecord[];
          documents: KnowledgeDocumentRecord[];
        }>
      | ResearchJournalAuxiliaryError;
    type CapturedReceiptPartition =
      | Readonly<{
          status: "captured";
          receipts: EventTimeMigrationReceipt[];
          relatedEvents: EventRecord[];
        }>
      | ResearchJournalAuxiliaryError;

    let transaction: Transaction | null = null;
    const abortTransaction = () => {
      if (!transaction) return;
      try {
        transaction.abort();
      } catch {
        // A signal can arrive after native commit but before the Dexie promise is
        // delivered. The signal check below remains authoritative in that race.
      }
    };
    signal?.throwIfAborted();
    signal?.addEventListener("abort", abortTransaction, { once: true });
    try {
      const captured = await this.database.transaction(
        "r",
        [
          this.database.cases,
          this.database.candidateSets,
          this.database.researchNotes,
          this.database.events,
          this.database.citations,
          this.database.knowledgeDocuments,
          this.database.eventTimeMigrationReceipts
        ],
        async () => {
          transaction = Dexie.currentTransaction;
          signal?.throwIfAborted();
          await this.requireCase(caseId, { allowTrashed: true });

          const [rawNotes, rawEvents] = await Promise.all([
            this.database.researchNotes
              .where("caseId")
              .equals(caseId)
              .limit(RESEARCH_JOURNAL_INDEX_RECORD_LIMIT + 1)
              .toArray(),
            this.database.events
              .where("caseId")
              .equals(caseId)
              .limit(RESEARCH_JOURNAL_INDEX_RECORD_LIMIT + 1)
              .toArray()
          ]);
          signal?.throwIfAborted();
          if (
            rawNotes.length > RESEARCH_JOURNAL_INDEX_RECORD_LIMIT
            || rawEvents.length > RESEARCH_JOURNAL_INDEX_RECORD_LIMIT
          ) {
            throw new ResearchJournalSnapshotError(
              "RESEARCH_JOURNAL_CORE_RESOURCE_LIMIT_EXCEEDED",
              `研究日志拒绝读取超过 ${RESEARCH_JOURNAL_INDEX_RECORD_LIMIT} 条笔记或事件的 Case。`
            );
          }

          const noteIds = new Set<string>();
          const notes = rawNotes.map((raw, index) => {
            const parsed = researchNoteRecordSchema.safeParse(raw);
            if (!parsed.success || parsed.data.caseId !== caseId || noteIds.has(parsed.data.id)) {
              throw new ResearchJournalSnapshotError(
                "RESEARCH_JOURNAL_CORE_DATA_INVALID",
                `研究日志笔记索引第 ${index + 1} 条不符合当前 Case 的严格契约。`
              );
            }
            noteIds.add(parsed.data.id);
            return parsed.data;
          }).sort(compareJournalRecordRecency);
          const eventIds = new Set<string>();
          const events = rawEvents.map((raw, index) => {
            let parsed: EventRecord;
            try {
              parsed = parseStoredEventRecord(raw);
            } catch (cause) {
              throw new ResearchJournalSnapshotError(
                "RESEARCH_JOURNAL_CORE_DATA_INVALID",
                `研究日志事件索引第 ${index + 1} 条不符合当前契约。`
              );
            }
            if (parsed.caseId !== caseId || eventIds.has(parsed.id)) {
              throw new ResearchJournalSnapshotError(
                "RESEARCH_JOURNAL_CORE_DATA_INVALID",
                `研究日志事件索引第 ${index + 1} 条不属于当前 Case 或包含重复 ID。`
              );
            }
            eventIds.add(parsed.id);
            return parsed;
          }).sort(compareJournalRecordRecency);

          const targetKeys = [
            ...notes.map((note) => `research_note:${note.id}`),
            ...events.map((event) => `event:${event.id}`)
          ].sort(compareCanonicalCodeUnits);
          const exactTargetKeys = new Set(targetKeys);
          const citationIds = new Set<string>();
          let scannedCitationIndexEntries = 0;
          let citationPartitionError: ResearchJournalAuxiliaryError | null = null;
          for (
            let offset = 0;
            offset < targetKeys.length && citationPartitionError === null;
            offset += RESEARCH_JOURNAL_TARGET_KEY_BATCH_SIZE
          ) {
            signal?.throwIfAborted();
            const batch = targetKeys.slice(offset, offset + RESEARCH_JOURNAL_TARGET_KEY_BATCH_SIZE);
            const remainingEntries = RESEARCH_JOURNAL_CITATION_INDEX_ENTRY_LIMIT - scannedCitationIndexEntries;
            const rawIds = await this.database.citations
              .where("targetKeys")
              .anyOf(batch)
              .limit(remainingEntries + 1)
              .primaryKeys();
            if (rawIds.length > remainingEntries) {
              citationPartitionError = researchJournalAuxiliaryError(
                "CITATION_RESOURCE_LIMIT_EXCEEDED",
                "当前 Case 关联的知识引用索引扫描超过安全上限。"
              );
              break;
            }
            scannedCitationIndexEntries += rawIds.length;
            for (const rawId of rawIds) {
              if (typeof rawId !== "string" || !RESEARCH_JOURNAL_UUID.test(rawId)) {
                citationPartitionError = researchJournalAuxiliaryError(
                  "CITATION_DATA_INVALID",
                  "知识引用索引返回了不符合契约的主键。"
                );
                break;
              }
              citationIds.add(rawId);
              if (citationIds.size > RESEARCH_JOURNAL_INDEX_RECORD_LIMIT) {
                citationPartitionError = researchJournalAuxiliaryError(
                  "CITATION_RESOURCE_LIMIT_EXCEEDED",
                  `当前 Case 关联的知识引用超过 ${RESEARCH_JOURNAL_INDEX_RECORD_LIMIT} 条安全上限。`
                );
                break;
              }
            }
          }

          const citations: CitationRecord[] = [];
          const documents: KnowledgeDocumentRecord[] = [];
          let citationKnowledgeUtf8Bytes = 0;
          if (citationPartitionError === null) {
            for (const citationId of [...citationIds].sort(compareCanonicalCodeUnits)) {
              signal?.throwIfAborted();
              const rawCitation = await this.database.citations.get(citationId);
              if (!rawCitation) {
                citationPartitionError = researchJournalAuxiliaryError(
                  "CITATION_DATA_INVALID",
                  "知识引用索引主键无法在同一只读事务中复现。"
                );
                break;
              }
              const parsed = citationRecordSchema.safeParse(rawCitation);
              if (
                !parsed.success
                || !parsed.data.targetKeys.some((targetKey) => exactTargetKeys.has(targetKey))
              ) {
                citationPartitionError = researchJournalAuxiliaryError(
                  "CITATION_DATA_INVALID",
                  "知识引用不符合契约或没有当前 Case 的精确目标。"
                );
                break;
              }
              citationKnowledgeUtf8Bytes += utf8ByteLength(JSON.stringify(parsed.data));
              if (citationKnowledgeUtf8Bytes > RESEARCH_JOURNAL_CITATION_KNOWLEDGE_UTF8_BUDGET) {
                citationPartitionError = researchJournalAuxiliaryError(
                  "CITATION_RESOURCE_LIMIT_EXCEEDED",
                  "当前 Case 关联的知识引用超过引用与资料总文本预算。"
                );
                break;
              }
              citations.push(parsed.data);
            }
          }

          if (citationPartitionError === null) {
            const documentIds = [...new Set(citations.map((citation) => citation.documentId))]
              .sort(compareCanonicalCodeUnits);
            for (const documentId of documentIds) {
              signal?.throwIfAborted();
              const rawDocument = await this.database.knowledgeDocuments.get(documentId);
              if (!rawDocument) {
                citationPartitionError = researchJournalAuxiliaryError(
                  "CITATION_DATA_INVALID",
                  "当前 Case 的知识引用缺少绑定资料。"
                );
                break;
              }
              const parsed = knowledgeDocumentRecordSchema.safeParse(rawDocument);
              if (!parsed.success || parsed.data.id !== documentId) {
                citationPartitionError = researchJournalAuxiliaryError(
                  "CITATION_DATA_INVALID",
                  "当前 Case 的引用资料不符合严格契约。"
                );
                break;
              }
              citationKnowledgeUtf8Bytes += utf8ByteLength(JSON.stringify(parsed.data));
              if (citationKnowledgeUtf8Bytes > RESEARCH_JOURNAL_CITATION_KNOWLEDGE_UTF8_BUDGET) {
                citationPartitionError = researchJournalAuxiliaryError(
                  "CITATION_RESOURCE_LIMIT_EXCEEDED",
                  "当前 Case 关联的知识引用与资料正文超过 64 MiB 总预算。"
                );
                break;
              }
              documents.push(parsed.data);
            }
          }
          const citationCapture: CapturedCitationPartition = citationPartitionError ?? Object.freeze({
            status: "captured" as const,
            citations,
            documents
          });

          const receiptIds = new Set<string>();
          let scannedReceiptIndexEntries = 0;
          let receiptPartitionError: ResearchJournalAuxiliaryError | null = null;
          const sortedEventIds = [...eventIds].sort(compareCanonicalCodeUnits);
          for (const indexName of ["source.recordId", "target.recordId"] as const) {
            for (
              let offset = 0;
              offset < sortedEventIds.length && receiptPartitionError === null;
              offset += RESEARCH_JOURNAL_TARGET_KEY_BATCH_SIZE
            ) {
              signal?.throwIfAborted();
              const batch = sortedEventIds.slice(offset, offset + RESEARCH_JOURNAL_TARGET_KEY_BATCH_SIZE);
              const remainingEntries = RESEARCH_JOURNAL_RECEIPT_INDEX_ENTRY_LIMIT - scannedReceiptIndexEntries;
              const rawIds = await this.database.eventTimeMigrationReceipts
                .where(indexName)
                .anyOf(batch)
                .limit(remainingEntries + 1)
                .primaryKeys();
              if (rawIds.length > remainingEntries) {
                receiptPartitionError = researchJournalAuxiliaryError(
                  "RECEIPT_RESOURCE_LIMIT_EXCEEDED",
                  "当前 Case 关联的事件时间迁移凭证索引扫描超过安全上限。"
                );
                break;
              }
              scannedReceiptIndexEntries += rawIds.length;
              for (const rawId of rawIds) {
                if (typeof rawId !== "string" || !RESEARCH_JOURNAL_UUID.test(rawId)) {
                  receiptPartitionError = researchJournalAuxiliaryError(
                    "RECEIPT_DATA_INVALID",
                    "事件时间迁移凭证索引返回了不符合契约的主键。"
                  );
                  break;
                }
                receiptIds.add(rawId);
                if (receiptIds.size > RESEARCH_JOURNAL_RECEIPT_RECORD_LIMIT) {
                  receiptPartitionError = researchJournalAuxiliaryError(
                    "RECEIPT_RESOURCE_LIMIT_EXCEEDED",
                    `当前 Case 关联的事件时间迁移凭证超过 ${RESEARCH_JOURNAL_RECEIPT_RECORD_LIMIT} 条安全上限。`
                  );
                  break;
                }
              }
            }
          }

          const receipts: EventTimeMigrationReceipt[] = [];
          const relatedEventById = new Map(events.map((record) => [record.id, record]));
          let receiptUtf8Bytes = 0;
          if (receiptPartitionError === null) {
            for (const receiptId of [...receiptIds].sort(compareCanonicalCodeUnits)) {
              signal?.throwIfAborted();
              const rawReceipt = await this.database.eventTimeMigrationReceipts.get(receiptId);
              if (!rawReceipt) {
                receiptPartitionError = researchJournalAuxiliaryError(
                  "RECEIPT_DATA_INVALID",
                  "事件时间迁移凭证索引主键无法在同一只读事务中复现。"
                );
                break;
              }
              const parsed = storedEventTimeMigrationReceiptSchema.safeParse(rawReceipt);
              if (!parsed.success) {
                receiptPartitionError = researchJournalAuxiliaryError(
                  "RECEIPT_DATA_INVALID",
                  "事件时间迁移凭证不符合严格契约。"
                );
                break;
              }
              receiptUtf8Bytes += utf8ByteLength(JSON.stringify(parsed.data));
              if (receiptUtf8Bytes > RESEARCH_JOURNAL_RECEIPT_UTF8_BUDGET) {
                receiptPartitionError = researchJournalAuxiliaryError(
                  "RECEIPT_RESOURCE_LIMIT_EXCEEDED",
                  "当前 Case 关联的事件时间迁移凭证超过有界文本预算。"
                );
                break;
              }
              receipts.push(parsed.data);
              for (const endpointId of [parsed.data.source.recordId, parsed.data.target.recordId]) {
                if (relatedEventById.has(endpointId)) continue;
                const rawEndpoint = await this.database.events.get(endpointId);
                if (!rawEndpoint) {
                  receiptPartitionError = researchJournalAuxiliaryError(
                    "RECEIPT_DATA_INVALID",
                    "事件时间迁移凭证引用了缺失 Event。"
                  );
                  break;
                }
                let endpoint: EventRecord;
                try {
                  endpoint = parseStoredEventRecord(rawEndpoint);
                } catch (cause) {
                  receiptPartitionError = researchJournalAuxiliaryError(
                    "RECEIPT_DATA_INVALID",
                    "事件时间迁移凭证引用了无效 Event。"
                  );
                  break;
                }
                if (endpoint.caseId !== caseId) {
                  receiptPartitionError = researchJournalAuxiliaryError(
                    "RECEIPT_DATA_INVALID",
                    "事件时间迁移凭证跨越了不同 Case。"
                  );
                  break;
                }
                receiptPartitionError = researchJournalAuxiliaryError(
                  "RECEIPT_DATA_INVALID",
                  "事件时间迁移凭证的同 Case 端点未出现在严格 Event 索引中。"
                );
                break;
              }
              if (receiptPartitionError !== null) break;
            }
          }
          const receiptCapture: CapturedReceiptPartition = receiptPartitionError ?? Object.freeze({
            status: "captured" as const,
            receipts,
            relatedEvents: [...relatedEventById.values()]
          });

          signal?.throwIfAborted();
          return Object.freeze({ notes, events, citationCapture, receiptCapture });
        }
      );
      transaction = null;
      signal?.throwIfAborted();

      let citationIndex: ResearchJournalAuxiliaryIndex<CitationRecord>;
      if (captured.citationCapture.status === "error") {
        citationIndex = captured.citationCapture;
      } else {
        try {
          const verifierByDocumentId = new Map<string, Awaited<ReturnType<typeof createKnowledgeDocumentCitationIntegrityVerifier>>>();
          for (const document of captured.citationCapture.documents) {
            signal?.throwIfAborted();
            const verifier = await createKnowledgeDocumentCitationIntegrityVerifier(document);
            signal?.throwIfAborted();
            verifierByDocumentId.set(document.id, verifier);
          }
          const verifiedCitations = captured.citationCapture.citations.map((citation) => {
            const verifier = verifierByDocumentId.get(citation.documentId);
            if (!verifier) {
              throw new KnowledgeIntegrityError(
                "documentContentHash",
                `引用 ${citation.id} 缺少同一快照内的资料。`
              );
            }
            return verifier.verifyCitation(citation);
          }).sort(compareJournalRecordRecency);
          citationIndex = Object.freeze({ status: "loaded" as const, records: verifiedCitations });
        } catch (cause) {
          signal?.throwIfAborted();
          if (!(cause instanceof KnowledgeIntegrityError)) throw cause;
          citationIndex = researchJournalAuxiliaryError(
            "CITATION_DATA_INVALID",
            "当前 Case 的知识引用或资料正文完整性验证失败。"
          );
        }
      }

      let receiptIndex: ResearchJournalAuxiliaryIndex<EventTimeMigrationReceipt>;
      if (captured.receiptCapture.status === "error") {
        receiptIndex = captured.receiptCapture;
      } else {
        try {
          signal?.throwIfAborted();
          const verifiedReceipts = await verifyEventTimeMigrationReceiptRelationships(
            captured.receiptCapture.receipts,
            captured.receiptCapture.relatedEvents
          );
          signal?.throwIfAborted();
          verifiedReceipts.sort((left, right) => (
            right.createdAt.localeCompare(left.createdAt) || left.id.localeCompare(right.id)
          ));
          receiptIndex = Object.freeze({ status: "loaded" as const, records: verifiedReceipts });
        } catch (cause) {
          signal?.throwIfAborted();
          if (!(cause instanceof EventTimeMigrationError)) throw cause;
          receiptIndex = researchJournalAuxiliaryError(
            "RECEIPT_DATA_INVALID",
            "当前 Case 的事件时间迁移凭证关系验证失败。"
          );
        }
      }

      signal?.throwIfAborted();
      return deepFreezeResearchJournalValue({
        caseId,
        profile: RESEARCH_JOURNAL_SNAPSHOT_PROFILE,
        notes: captured.notes,
        events: captured.events,
        citationIndex,
        receiptIndex,
        boundary: {
          atomicStorageSnapshotVerified: true as const,
          caseIdBound: true as const,
          transactionMode: "readonly" as const,
          mutationEpochRead: false as const,
          mutationEpochRevalidationPerformed: false as const,
          storageMutationPerformed: false as const,
          schemaOrReleaseIdentityMutationPerformed: false as const,
          expertTruthClaimed: false as const,
          publicReleaseAuthorized: false as const,
          formalActivationAllowed: false as const
        }
      });
    } catch (reason) {
      signal?.throwIfAborted();
      throw reason;
    } finally {
      signal?.removeEventListener("abort", abortTransaction);
    }
  }

  private async requireCase(
    caseId: string,
    options: { allowTrashed?: boolean } = {}
  ): Promise<ResearchSubjectRecord> {
    const [caseRecord, candidateSet] = await Promise.all([
      this.database.cases.get(caseId),
      this.database.candidateSets.get(caseId)
    ]);
    const subject = caseRecord
      ? caseRecordSchema.parse(caseRecord)
      : candidateSet
        ? await Dexie.waitFor(verifyCandidateSetRecordIntegrity(candidateSet))
        : null;
    if (subject) {
      if (!options.allowTrashed && subject.deletedAt !== null) {
        throw new ResearchSubjectLifecycleError(
          "SUBJECT_IN_TRASH",
          "Restore the research subject before changing dependent data."
        );
      }
      return subject;
    }
    throw new ResearchRepositoryError("CASE_NOT_FOUND", `案例或候选组不存在：${caseId}`);
  }

  private async requireRevision(caseId: string, revisionId: string): Promise<RevisionRecord> {
    const revision = await this.database.revisions.get(revisionId);
    if (!revision) throw new ResearchRepositoryError("REVISION_NOT_FOUND", `修订不存在：${revisionId}`);
    if (revision.caseId !== caseId) {
      throw new ResearchRepositoryError("REVISION_CASE_MISMATCH", `修订 ${revisionId} 不属于案例 ${caseId}`);
    }
    return Dexie.waitFor(verifyRevisionRecordIntegrity(revision));
  }

  private async assertAnchor(caseId: string, anchor: ResearchNoteAnchor): Promise<void> {
    await this.requireCase(caseId);
    if (anchor.kind !== "case") await this.requireRevision(caseId, anchor.revisionId);
  }

  private assertTransitNodeRevision(revisionId: string | null, ref: AnyTransitNodeRef | null): void {
    if (!ref || ref.namespace !== "hakimi-transit-node") return;
    if (!revisionId || ref.revisionId !== revisionId) {
      throw new ResearchRepositoryError(
        "TRANSIT_CONTEXT_MISMATCH",
        "运限节点必须绑定到同一份案例修订。"
      );
    }
  }

  private async assertTransitNodeContext(
    revision: RevisionRecord | null,
    ref: AnyTransitNodeRef | null
  ): Promise<void> {
    if (!ref || ref.namespace !== "hakimi-transit-node") return;
    if (!revision) {
      throw new ResearchRepositoryError("TRANSIT_CONTEXT_MISMATCH", "运限节点缺少可核验的案例修订。");
    }
    try {
      // Keep the IndexedDB transaction alive while transit-core replays the
      // locked timeline and verifies the node's complete fact hash.
      await Dexie.waitFor(resolveTransitNodeRef(revision, ref));
    } catch (cause) {
      throw new ResearchRepositoryError(
        "TRANSIT_CONTEXT_MISMATCH",
        `运限节点无法按当前修订和锁版时间线完整复算，请重新选择节点。${cause instanceof Error ? ` ${cause.message}` : ""}`
      );
    }
  }

  async createResearchNote(input: CreateResearchNoteInput): Promise<ResearchNoteRecord> {
    const timestamp = this.now();
    const record = researchNoteRecordSchema.parse({
      schemaVersion: SCHEMA_VERSION,
      id: crypto.randomUUID(),
      caseId: input.caseId,
      anchor: input.anchor,
      bodyFormat: "markdown",
      body: input.body,
      tags: input.tags,
      sourceRefs: input.sourceRefs,
      lifecycle: input.lifecycle,
      editVersion: 1,
      createdAt: timestamp,
      updatedAt: timestamp
    });
    await this.database.transaction("rw", this.database.cases, this.database.revisions, this.database.candidateSets, this.database.researchNotes, async () => {
      await this.assertAnchor(record.caseId, record.anchor);
      await this.database.researchNotes.add(record);
    });
    return record;
  }

  async getResearchNote(noteId: string): Promise<ResearchNoteRecord | null> {
    const record = await this.database.researchNotes.get(noteId);
    return record ? researchNoteRecordSchema.parse(record) : null;
  }

  async listResearchNotesByCase(caseId: string, options: { includeArchived?: boolean } = {}): Promise<ResearchNoteRecord[]> {
    await this.requireCase(caseId, { allowTrashed: true });
    const hasCaseRecencyIndex = this.database.researchNotes.schema.indexes
      .some((index) => index.name === "[caseId+updatedAt]");
    if (this.database.targetSchemaVersion >= 14 && hasCaseRecencyIndex) {
      const records = await this.database.researchNotes
        .where("[caseId+updatedAt]")
        .between([caseId, Dexie.minKey], [caseId, Dexie.maxKey])
        .reverse()
        .toArray();
      return records
        .map((record) => researchNoteRecordSchema.parse(record))
        .filter((record) => options.includeArchived || record.lifecycle === "active");
    }
    const records = await this.database.researchNotes.where("caseId").equals(caseId).sortBy("updatedAt");
    return records
      .map((record) => researchNoteRecordSchema.parse(record))
      .filter((record) => options.includeArchived || record.lifecycle === "active")
      .reverse();
  }

  async updateResearchNote(noteId: string, input: UpdateResearchNoteInput): Promise<ResearchNoteRecord> {
    return this.database.transaction("rw", this.database.cases, this.database.candidateSets, this.database.researchNotes, async () => {
      const currentRaw = await this.database.researchNotes.get(noteId);
      if (!currentRaw) throw new ResearchRepositoryError("NOTE_NOT_FOUND", `研究笔记不存在：${noteId}`);
      const current = researchNoteRecordSchema.parse(currentRaw);
      await this.requireCase(current.caseId);
      if (current.editVersion !== input.expectedEditVersion) {
        throw new ResearchRepositoryError(
          "EDIT_VERSION_CONFLICT",
          `研究笔记版本冲突：期望 ${input.expectedEditVersion}，当前 ${current.editVersion}`
        );
      }
      const next = researchNoteRecordSchema.parse({
        ...current,
        body: input.patch.body ?? current.body,
        tags: input.patch.tags ?? current.tags,
        sourceRefs: input.patch.sourceRefs ?? current.sourceRefs,
        lifecycle: input.patch.lifecycle ?? current.lifecycle,
        editVersion: current.editVersion + 1,
        updatedAt: this.now()
      });
      await this.database.researchNotes.put(next);
      return next;
    });
  }

  async deleteResearchNote(noteId: string): Promise<void> {
    await this.database.transaction(
      "rw",
      this.database.cases,
      this.database.candidateSets,
      this.database.researchNotes,
      this.database.citations,
      this.database.attachments,
      async () => {
      const note = await this.database.researchNotes.get(noteId);
      if (!note) {
        throw new ResearchRepositoryError("NOTE_NOT_FOUND", `研究笔记不存在：${noteId}`);
      }
      await this.requireCase(note.caseId);
      await pruneCitationTargets(
        this.database.citations,
        (target) => target.kind === "research_note" && target.noteId === noteId
      );
      await deleteAttachmentsByLinkIndexes(this.database.attachments, {
        researchNoteIds: [noteId]
      });
      await this.database.researchNotes.delete(noteId);
      }
    );
  }

  async createEvent(input: CreateEventInput): Promise<EventRecord> {
    const timestamp = this.now();
    const transitNodeRef = transitNodeRefSchema.nullable().parse(input.transitNodeRef);
    this.assertTransitNodeRevision(input.revisionId, transitNodeRef);
    const timeContext = verifyEventTimeContext({
      datePrecision: input.datePrecision,
      startDate: input.startDate,
      endDate: input.endDate,
      timeContext: resolveEventTimeContext({
        datePrecision: input.datePrecision,
        startDate: input.startDate,
        endDate: input.endDate,
        timeZone: input.timeZone,
        startDisambiguation: input.startDisambiguation,
        endDisambiguation: input.endDisambiguation
      })
    });
    const record = parseCurrentEventRecord({
      schemaVersion: SCHEMA_VERSION,
      recordVersion: EVENT_RECORD_VERSION,
      id: crypto.randomUUID(),
      caseId: input.caseId,
      revisionId: input.revisionId,
      transitNodeRef,
      datePrecision: input.datePrecision,
      startDate: input.startDate,
      endDate: input.endDate,
      title: input.title,
      tags: input.tags,
      sourceRefs: input.sourceRefs,
      feedback: input.feedback,
      bodyFormat: "markdown",
      body: input.body,
      timeContext,
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp
    });
    await this.database.transaction("rw", this.database.cases, this.database.revisions, this.database.candidateSets, this.database.events, async () => {
      await this.requireCase(record.caseId);
      const revision = record.revisionId ? await this.requireRevision(record.caseId, record.revisionId) : null;
      await this.assertTransitNodeContext(revision, record.transitNodeRef);
      await this.database.events.add(record);
    });
    return record;
  }

  async getEvent(eventId: string): Promise<EventRecord | null> {
    const record = await this.database.events.get(eventId);
    return record ? parseStoredEventRecord(record) : null;
  }

  async listEventsByCase(caseId: string, options: { includeDeleted?: boolean } = {}): Promise<EventRecord[]> {
    await this.requireCase(caseId, { allowTrashed: true });
    const hasCaseRecencyIndex = this.database.events.schema.indexes
      .some((index) => index.name === "[caseId+updatedAt]");
    if (this.database.targetSchemaVersion >= 14 && hasCaseRecencyIndex) {
      const records = await this.database.events
        .where("[caseId+updatedAt]")
        .between([caseId, Dexie.minKey], [caseId, Dexie.maxKey])
        .reverse()
        .toArray();
      return records
        .map((record) => parseStoredEventRecord(record))
        .filter((record) => options.includeDeleted || record.deletedAt === null);
    }
    const records = await this.database.events.where("caseId").equals(caseId).sortBy("updatedAt");
    return records
      .map((record) => parseStoredEventRecord(record))
      .filter((record) => options.includeDeleted || record.deletedAt === null)
      .reverse();
  }

  /** Explicit, append-only new-ID derivation. The reviewed legacy source is never rewritten. */
  async deriveLegacyEventTime(input: DeriveLegacyEventTimeInput): Promise<DeriveLegacyEventTimeResult> {
    if (input.confirmed !== true) {
      throw new EventTimeMigrationError(
        "CONFIRMATION_REQUIRED",
        "Legacy Event time derivation requires explicit local user confirmation."
      );
    }
    return this.database.transaction(
      "rw",
      [
        this.database.cases,
        this.database.revisions,
        this.database.candidateSets,
        this.database.events,
        this.database.eventTimeMigrationReceipts
      ],
      async () => {
        const sourceRaw = await this.database.events.get(input.sourceEventId);
        if (!sourceRaw) {
          throw new EventTimeMigrationError("SOURCE_NOT_FOUND", `Legacy Event does not exist: ${input.sourceEventId}`);
        }
        const source = parseStoredEventRecord(sourceRaw);
        const sourceRecordDigest = await Dexie.waitFor(computeEventRecordDigest(source));
        if (sourceRecordDigest !== input.expectedSourceRecordDigest) {
          throw new EventTimeMigrationError(
            "SOURCE_RECORD_CHANGED",
            "The source Event changed after the migration review was opened."
          );
        }
        if (source.timeContext.kind !== "legacy_floating") {
          throw new EventTimeMigrationError(
            "SOURCE_NOT_LEGACY_FLOATING",
            "Only a legacy_floating Event can use this derivation workflow."
          );
        }
        if (source.deletedAt !== null) {
          throw new EventTimeMigrationError(
            "SOURCE_DELETED",
            "Restore the source Event before deriving a current time interpretation."
          );
        }
        const expectedTargetKind = source.datePrecision === "minute" ? "zoned_minute" : "calendar_date";
        if (input.interpretation.kind !== expectedTargetKind) {
          throw new EventTimeMigrationError(
            "TARGET_KIND_MISMATCH",
            `A ${source.datePrecision} Event can only derive ${expectedTargetKind} time semantics.`
          );
        }

        await this.requireCase(source.caseId);
        const revision = source.revisionId ? await this.requireRevision(source.caseId, source.revisionId) : null;
        this.assertTransitNodeRevision(source.revisionId, source.transitNodeRef);
        await this.assertTransitNodeContext(revision, source.transitNodeRef);

        const sourceSnapshot = buildEventTimeMigrationSnapshot(source);
        const targetTimeContext = resolveEventTimeMigrationInterpretation(sourceSnapshot, input.interpretation);
        if (targetTimeContext.kind === "legacy_floating") {
          throw new EventTimeMigrationError("TARGET_KIND_MISMATCH", "Derived Event time cannot remain legacy_floating.");
        }
        const timestamp = this.now();
        const target = parseCurrentEventRecord({
          ...source,
          id: crypto.randomUUID(),
          timeContext: targetTimeContext,
          deletedAt: null,
          createdAt: timestamp,
          updatedAt: timestamp
        });
        const targetSnapshot = buildEventTimeMigrationSnapshot(target);
        const [sourceSnapshotDigest, targetSnapshotDigest] = await Dexie.waitFor(Promise.all([
          sha256Hex(sourceSnapshot),
          sha256Hex(targetSnapshot)
        ]));
        const existingReceipts = await this.database.eventTimeMigrationReceipts
          .where("source.recordId")
          .equals(source.id)
          .toArray();
        if (existingReceipts.some((rawReceipt) =>
          storedEventTimeMigrationReceiptSchema.parse(rawReceipt).target.snapshotDigest === targetSnapshotDigest
        )) {
          throw new EventTimeMigrationError(
            "TARGET_INTERPRETATION_ALREADY_DERIVED",
            `Event ${source.id} already has this exact time interpretation.`
          );
        }
        const interpretation = canonicalEventTimeMigrationInterpretation(targetTimeContext);
        const receipt = eventTimeMigrationReceiptSchema.parse({
          schemaVersion: SCHEMA_VERSION,
          recordVersion: EVENT_TIME_MIGRATION_RECEIPT_RECORD_VERSION,
          id: crypto.randomUUID(),
          operation: "event_time_semantic_derivation",
          authorization: { kind: "explicit_local_user_confirmation" },
          source: {
            kind: "event",
            recordId: source.id,
            snapshot: sourceSnapshot,
            snapshotDigest: sourceSnapshotDigest
          },
          target: {
            kind: "event",
            recordId: target.id,
            snapshot: targetSnapshot,
            snapshotDigest: targetSnapshotDigest
          },
          interpretation,
          createdAt: timestamp
        });

        await this.database.events.add(target);
        await this.database.eventTimeMigrationReceipts.add(receipt);
        return { source, target, receipt };
      }
    );
  }

  async listEventTimeMigrationReceiptsForEvent(eventId: string): Promise<EventTimeMigrationReceipt[]> {
    return this.database.transaction("r", this.database.events, this.database.eventTimeMigrationReceipts, async () => {
      const [asSource, asTarget] = await Promise.all([
        this.database.eventTimeMigrationReceipts.where("source.recordId").equals(eventId).toArray(),
        this.database.eventTimeMigrationReceipts.where("target.recordId").equals(eventId).toArray()
      ]);
      const receipts = [...new Map([...asSource, ...asTarget].map((receipt) => [receipt.id, receipt])).values()];
      const eventIds = [...new Set(receipts.flatMap((receipt) => [receipt.source.recordId, receipt.target.recordId]))];
      const rawEvents = await this.database.events.bulkGet(eventIds);
      const events = rawEvents.map((record, index) => {
        if (!record) {
          throw new EventTimeMigrationError(
            "RECEIPT_RELATION_MISMATCH",
            `Event time migration receipt references missing Event ${eventIds[index]}.`
          );
        }
        return parseStoredEventRecord(record);
      });
      const verified = await Dexie.waitFor(verifyEventTimeMigrationReceiptRelationships(receipts, events));
      return verified.sort((left, right) =>
        left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)
      );
    });
  }

  async updateEvent(eventId: string, patch: UpdateEventInput): Promise<EventRecord> {
    return this.database.transaction("rw", this.database.cases, this.database.revisions, this.database.candidateSets, this.database.events, this.database.eventTimeMigrationReceipts, async () => {
      const currentRaw = await this.database.events.get(eventId);
      if (!currentRaw) throw new ResearchRepositoryError("EVENT_NOT_FOUND", `事件不存在：${eventId}`);
      const current = parseStoredEventRecord(currentRaw);
      const nextTransitNodeRef = patch.transitNodeRef === undefined
        ? current.transitNodeRef
        : transitNodeRefSchema.nullable().parse(patch.transitNodeRef);
      const nextRevisionId = patch.revisionId !== undefined ? patch.revisionId : current.revisionId;
      this.assertTransitNodeRevision(nextRevisionId, nextTransitNodeRef);
      const nextDates = {
        datePrecision: patch.datePrecision ?? current.datePrecision,
        startDate: patch.startDate !== undefined ? patch.startDate : current.startDate,
        endDate: patch.endDate !== undefined ? patch.endDate : current.endDate
      };
      const timeContext = resolveUpdatedEventTimeContext(current, patch, nextDates);
      const lineageChanged =
        nextRevisionId !== current.revisionId ||
        !sameJsonValue(nextTransitNodeRef, current.transitNodeRef) ||
        nextDates.datePrecision !== current.datePrecision ||
        nextDates.startDate !== current.startDate ||
        nextDates.endDate !== current.endDate ||
        !sameJsonValue(timeContext, current.timeContext);
      if (lineageChanged) {
        const [asSource, asTarget] = await Promise.all([
          this.database.eventTimeMigrationReceipts.where("source.recordId").equals(eventId).first(),
          this.database.eventTimeMigrationReceipts.where("target.recordId").equals(eventId).first()
        ]);
        if (asSource || asTarget) {
          throw new EventTimeMigrationError(
            "EVENT_DERIVATION_LINEAGE_IMMUTABLE",
            "Event time and Revision/transit lineage are immutable after an append-only derivation receipt exists."
          );
        }
        const historicalLineage = current.timeContext.kind === "legacy_floating" || (
          current.timeContext.kind === "zoned_minute" &&
          classifyStoredTimeZoneDatabase(current.timeContext) !== "current_exact"
        );
        if (historicalLineage) {
          throw new ResearchRepositoryError(
            current.timeContext.kind === "legacy_floating"
              ? "LEGACY_EVENT_TIME_MIGRATION_REQUIRED"
              : "HISTORICAL_EVENT_TIME_DERIVATION_REQUIRED",
            "Historical Event time and Revision/transit lineage cannot be rewritten under the same record ID."
          );
        }
      }
      const next = parseStoredEventRecord({
        ...current,
        revisionId: nextRevisionId,
        transitNodeRef: nextTransitNodeRef,
        ...nextDates,
        timeContext,
        title: patch.title ?? current.title,
        tags: patch.tags ?? current.tags,
        sourceRefs: patch.sourceRefs ?? current.sourceRefs,
        feedback: patch.feedback ?? current.feedback,
        body: patch.body ?? current.body,
        updatedAt: this.now()
      });
      await this.requireCase(next.caseId);
      const revision = next.revisionId ? await this.requireRevision(next.caseId, next.revisionId) : null;
      await this.assertTransitNodeContext(revision, next.transitNodeRef);
      await this.database.events.put(next);
      return next;
    });
  }

  private async setEventDeleted(eventId: string, deleted: boolean): Promise<EventRecord> {
    return this.database.transaction("rw", this.database.cases, this.database.candidateSets, this.database.events, async () => {
      const currentRaw = await this.database.events.get(eventId);
      if (!currentRaw) throw new ResearchRepositoryError("EVENT_NOT_FOUND", `事件不存在：${eventId}`);
      const current = parseStoredEventRecord(currentRaw);
      await this.requireCase(current.caseId);
      const timestamp = this.now();
      const next = parseStoredEventRecord({
        ...current,
        deletedAt: deleted ? timestamp : null,
        updatedAt: timestamp
      });
      await this.database.events.put(next);
      return next;
    });
  }

  async softDeleteEvent(eventId: string): Promise<EventRecord> {
    return this.setEventDeleted(eventId, true);
  }

  async restoreEvent(eventId: string): Promise<EventRecord> {
    return this.setEventDeleted(eventId, false);
  }

  async createSavedView(input: CreateSavedViewInput): Promise<ReadySavedViewRecord> {
    const timestamp = this.now();
    const query = researchQuerySchema.parse(input.query);
    const queryDigest = await sha256Hex(query);
    const record = savedViewRecordSchema.parse({
      schemaVersion: SCHEMA_VERSION,
      recordVersion: SAVED_VIEW_RECORD_VERSION,
      state: "ready",
      id: crypto.randomUUID(),
      name: input.name,
      query,
      queryDigest,
      editVersion: 1,
      createdAt: timestamp,
      updatedAt: timestamp
    }) as ReadySavedViewRecord;
    await this.database.savedViews.add(record);
    return record;
  }

  async getSavedView(viewId: string): Promise<SavedViewRecord | null> {
    const record = await this.database.savedViews.get(viewId);
    return record ? parseVerifiedSavedViewRecord(record) : null;
  }

  async listSavedViews(): Promise<SavedViewRecord[]> {
    const records = await this.database.savedViews.orderBy("updatedAt").reverse().toArray();
    return Promise.all(records.map((record) => parseVerifiedSavedViewRecord(record)));
  }

  /** Fixed-size dashboard projection; full SavedView management keeps using listSavedViews(). */
  async listRecentSavedViews(): Promise<SavedViewRecord[]> {
    const records = await this.database.savedViews.orderBy("updatedAt").reverse().limit(3).toArray();
    return Promise.all(records.map((record) => parseVerifiedSavedViewRecord(record)));
  }

  async updateSavedView(viewId: string, input: UpdateSavedViewInput): Promise<ReadySavedViewRecord> {
    return this.database.transaction("rw", this.database.savedViews, async () => {
      const currentRaw = await this.database.savedViews.get(viewId);
      if (!currentRaw) throw new ResearchRepositoryError("SAVED_VIEW_NOT_FOUND", `保存视图不存在：${viewId}`);
      const current = requireReadySavedView(await Dexie.waitFor(parseVerifiedSavedViewRecord(currentRaw)));
      if (current.editVersion !== input.expectedEditVersion) {
        throw new ResearchRepositoryError(
          "SAVED_VIEW_EDIT_VERSION_CONFLICT",
          `保存视图已被其他操作修改：expected=${input.expectedEditVersion}, actual=${current.editVersion}`
        );
      }
      const query = input.patch.query === undefined
        ? current.query
        : researchQuerySchema.parse(input.patch.query);
      const queryDigest = await Dexie.waitFor(sha256Hex(query));
      const next = savedViewRecordSchema.parse({
        ...current,
        name: input.patch.name ?? current.name,
        query,
        queryDigest,
        editVersion: current.editVersion + 1,
        updatedAt: this.now()
      }) as ReadySavedViewRecord;
      await this.database.savedViews.put(next);
      return next;
    });
  }

  async deleteSavedView(viewId: string): Promise<void> {
    await this.database.transaction("rw", this.database.savedViews, async () => {
      if (!(await this.database.savedViews.get(viewId))) {
        throw new ResearchRepositoryError("SAVED_VIEW_NOT_FOUND", `保存视图不存在：${viewId}`);
      }
      await this.database.savedViews.delete(viewId);
    });
  }

  async duplicateSavedView(viewId: string, newName: string): Promise<ReadySavedViewRecord> {
    const source = await this.getSavedView(viewId);
    if (!source) throw new ResearchRepositoryError("SAVED_VIEW_NOT_FOUND", `保存视图不存在：${viewId}`);
    const ready = requireReadySavedView(source);
    return this.createSavedView({
      name: newName,
      query: structuredClone(ready.query)
    });
  }

  async restoreSavedViewState(viewId: string): Promise<SavedViewState> {
    const source = await this.getSavedView(viewId);
    if (!source) throw new ResearchRepositoryError("SAVED_VIEW_NOT_FOUND", `保存视图不存在：${viewId}`);
    const ready = requireReadySavedView(source);
    return structuredClone({ query: ready.query });
  }

  /** Explicit human-review boundary: the supplied ResearchQuery is never inferred from legacy filters. */
  async resolveSavedViewMigration(
    viewId: string,
    input: ResolveSavedViewMigrationInput
  ): Promise<ReadySavedViewRecord> {
    return this.database.transaction("rw", this.database.savedViews, async () => {
      const currentRaw = await this.database.savedViews.get(viewId);
      if (!currentRaw) throw new ResearchRepositoryError("SAVED_VIEW_NOT_FOUND", `保存视图不存在：${viewId}`);
      const current = await Dexie.waitFor(parseVerifiedSavedViewRecord(currentRaw));
      if (current.state !== "migration_required") {
        throw new ResearchRepositoryError(
          "SAVED_VIEW_NOT_MIGRATION_REQUIRED",
          `保存视图不处于待迁移审核状态：${viewId}`
        );
      }
      if (current.editVersion !== input.expectedEditVersion) {
        throw new ResearchRepositoryError(
          "SAVED_VIEW_EDIT_VERSION_CONFLICT",
          `保存视图已被其他操作修改：expected=${input.expectedEditVersion}, actual=${current.editVersion}`
        );
      }
      const query = researchQuerySchema.parse(input.query);
      const queryDigest = await Dexie.waitFor(sha256Hex(query));
      const next = savedViewRecordSchema.parse({
        schemaVersion: current.schemaVersion,
        recordVersion: current.recordVersion,
        state: "ready",
        id: current.id,
        name: input.name ?? current.name,
        query,
        queryDigest,
        editVersion: current.editVersion + 1,
        createdAt: current.createdAt,
        updatedAt: this.now()
      }) as ReadySavedViewRecord;
      await this.database.savedViews.put(next);
      return next;
    });
  }

  async searchCasesAndNotesPage(
    rawQuery: string,
    options: SearchCasesAndNotesPageOptions = {}
  ): Promise<ResearchSearchPage> {
    const normalizedQuery = rawQuery.normalize("NFKC").trim().toLocaleLowerCase("zh-CN");
    const terms = normalizedQuery ? normalizedQuery.split(/\s+/).filter(Boolean) : [];
    const includeArchivedNotes = options.includeArchivedNotes ?? false;
    if (typeof includeArchivedNotes !== "boolean") {
      throw new TypeError("includeArchivedNotes must be a boolean.");
    }
    const normalized = normalizeResearchSubjectPageOptions(options, { terms, includeArchivedNotes });
    if (terms.length === 0) return { items: [], total: 0, nextCursor: null };

    return this.database.transaction(
      "r",
      [this.database.cases, this.database.candidateSets, this.database.researchNotes],
      async () => {
        // First pass keeps only a compact per-subject set of matched term positions.
        // Exact matching note IDs are collected in a second pass for the returned page.
        const noteTermMatchesByCase = new Map<string, Set<number>>();
        await this.database.researchNotes.each((rawNote) => {
          const note = researchNoteRecordSchema.parse(rawNote);
          if (!includeArchivedNotes && note.lifecycle === "archived") return;
          const noteText = `${note.body} ${note.tags.join(" ")}`.normalize("NFKC").toLocaleLowerCase("zh-CN");
          let positions = noteTermMatchesByCase.get(note.caseId);
          for (let index = 0; index < terms.length; index += 1) {
            if (!noteText.includes(terms[index])) continue;
            positions ??= new Set<number>();
            positions.add(index);
          }
          if (positions) noteTermMatchesByCase.set(note.caseId, positions);
        });

        const retained: Array<PageableResearchSubject & { matchedCaseMetadata: boolean }> = [];
        let total = 0;
        const inspect = (
          rawRecord: ResearchSubjectRecord,
          kind: StoredResearchSubjectKind
        ): void => {
          const candidate = assertPageableResearchSubject(rawRecord, kind);
          if (!matchesResearchSubjectOptions(candidate.record, normalized)) return;
          const metadataText = `${candidate.record.alias} ${candidate.record.tags.join(" ")} ${candidate.record.notes}`
            .normalize("NFKC")
            .toLocaleLowerCase("zh-CN");
          const noteMatches = noteTermMatchesByCase.get(candidate.record.id);
          if (!terms.every((term, index) => metadataText.includes(term) || noteMatches?.has(index))) return;
          total += 1;
          if (!isResearchSubjectAfterCursor(candidate, normalized.cursor)) return;
          insertBoundedResearchSubject(retained, {
            ...candidate,
            matchedCaseMetadata: terms.every((term) => metadataText.includes(term))
          }, normalized.limit + 1);
        };

        const scans: Promise<unknown>[] = [];
        if (normalized.kind !== "candidate_sets") {
          scans.push(this.database.cases.each((record) => inspect(record, "cases")));
        }
        if (normalized.kind !== "cases") {
          scans.push(this.database.candidateSets.each((record) => inspect(record, "candidate_sets")));
        }
        await Promise.all(scans);

        const hasMore = retained.length > normalized.limit;
        const pageCandidates = retained.slice(0, normalized.limit);
        const pageSubjectIds = new Set(pageCandidates.map((candidate) => candidate.record.id));
        const matchingNoteIdsByCase = new Map<string, string[]>();
        if (pageSubjectIds.size > 0) {
          await this.database.researchNotes.each((rawNote) => {
            const note = researchNoteRecordSchema.parse(rawNote);
            if (!pageSubjectIds.has(note.caseId)) return;
            if (!includeArchivedNotes && note.lifecycle === "archived") return;
            const noteText = `${note.body} ${note.tags.join(" ")}`.normalize("NFKC").toLocaleLowerCase("zh-CN");
            if (!terms.some((term) => noteText.includes(term))) return;
            const ids = matchingNoteIdsByCase.get(note.caseId) ?? [];
            ids.push(note.id);
            matchingNoteIdsByCase.set(note.caseId, ids);
          });
        }

        const verifiedRecords = await Dexie.waitFor(Promise.all(pageCandidates.map((candidate) =>
          candidate.kind === "cases"
            ? Promise.resolve(caseRecordSchema.parse(candidate.record))
            : verifyCandidateSetRecordIntegrity(candidate.record)
        )));
        const items = verifiedRecords.map((caseRecord, index): ResearchSearchHit => ({
          caseRecord,
          matchedCaseMetadata: pageCandidates[index].matchedCaseMetadata,
          matchingNoteIds: matchingNoteIdsByCase.get(caseRecord.id) ?? []
        }));
        const last = pageCandidates.at(-1);
        return {
          items,
          total,
          nextCursor: hasMore && last
            ? researchSubjectPageCursor(last, normalized.queryKey)
            : null
        };
      }
    );
  }

  async searchCasesAndNotes(
    rawQuery: string,
    options: { includeArchivedNotes?: boolean } & ListResearchSubjectsOptions = {}
  ): Promise<ResearchSearchHit[]> {
    const normalized = rawQuery.normalize("NFKC").trim().toLocaleLowerCase("zh-CN");
    if (!normalized) return [];
    const terms = normalized.split(/\s+/).filter(Boolean);
    return this.database.transaction("r", this.database.cases, this.database.candidateSets, this.database.researchNotes, async () => {
      const [caseRows, candidateSetRows, noteRows] = await Promise.all([
        this.database.cases.toArray(),
        this.database.candidateSets.toArray(),
        this.database.researchNotes.toArray()
      ]);
      const notesByCase = new Map<string, ResearchNoteRecord[]>();
      for (const rawNote of noteRows) {
        const note = researchNoteRecordSchema.parse(rawNote);
        if (!options.includeArchivedNotes && note.lifecycle === "archived") continue;
        const records = notesByCase.get(note.caseId) ?? [];
        records.push(note);
        notesByCase.set(note.caseId, records);
      }

      const verifiedCandidateSets = await Dexie.waitFor(Promise.all(
        candidateSetRows.map((row) => verifyCandidateSetRecordIntegrity(row))
      ));
      const hits: ResearchSearchHit[] = [];
      const subjects: ResearchSubjectRecord[] = [
        ...caseRows.map((row) => caseRecordSchema.parse(row)),
        ...verifiedCandidateSets
      ].filter((record) => matchesResearchSubjectOptions(record, options));
      for (const caseRecord of subjects) {
        const caseText = `${caseRecord.alias} ${caseRecord.tags.join(" ")} ${caseRecord.notes}`.normalize("NFKC").toLocaleLowerCase("zh-CN");
        const notes = notesByCase.get(caseRecord.id) ?? [];
        const noteTexts = notes.map((note) => `${note.body} ${note.tags.join(" ")}`.normalize("NFKC").toLocaleLowerCase("zh-CN"));
        const allText = `${caseText} ${noteTexts.join(" ")}`;
        if (!terms.every((term) => allText.includes(term))) continue;
        hits.push({
          caseRecord,
          matchedCaseMetadata: terms.every((term) => caseText.includes(term)),
          matchingNoteIds: notes
            .filter((_note, index) => terms.some((term) => noteTexts[index].includes(term)))
            .map((note) => note.id)
        });
      }
      return hits.sort((left, right) => right.caseRecord.updatedAt.localeCompare(left.caseRecord.updatedAt));
    });
  }
}

export type CreateKnowledgeDocumentInput = {
  title: string;
  author: string;
  edition: string;
  sourceNote: string;
  fileName: string;
  format: KnowledgeDocumentRecord["format"];
  content: string;
  byteSize: number;
  sourceUrl?: string | null;
  publisher?: string;
  publicationYear?: number | null;
  acquiredAt?: string | null;
};

export type UpdateUserSourceRightsInput = UserSourceMetadata & {
  expectedEditVersion: number;
  copyrightNotice?: string;
  evidenceRefs?: string[];
  reviewNote?: string;
};

export type CreateCitationInput = {
  documentId: string;
  locator: CitationLocator;
  annotation: string;
  targets: CitationTarget[];
};

const CREATE_CITATION_INPUT_CAPTURE_LIMITS = Object.freeze({
  maxDepth: 16,
  maxTextCharacters: 256_000,
  maxValueNodes: 2_000
});

function captureCreateCitationInput(input: unknown): CreateCitationInput {
  const captured = captureDeclarativeOwnData(
    input,
    "Citation creation input",
    CREATE_CITATION_INPUT_CAPTURE_LIMITS
  ) as Record<string, unknown>;
  const expectedKeys = ["annotation", "documentId", "locator", "targets"];
  const actualKeys = Object.keys(captured).sort(compareCanonicalCodeUnits);
  if (
    actualKeys.length !== expectedKeys.length
    || actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    throw new TypeError(
      "Citation creation input must contain exactly documentId, locator, annotation and targets."
    );
  }
  return captured as CreateCitationInput;
}

function countJsonValueNodes(value: unknown): number {
  const pending: unknown[] = [value];
  let count = 0;
  while (pending.length > 0) {
    const current = pending.pop();
    count += 1;
    if (Array.isArray(current)) {
      pending.push(...current);
    } else if (current !== null && typeof current === "object") {
      pending.push(...Object.values(current as Record<string, unknown>));
    }
  }
  return count;
}

function compareCanonicalCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sameOrderedStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export const LOCAL_KNOWLEDGE_INTEGRITY_SNAPSHOT_PROFILE = Object.freeze({
  snapshotVersion: "hakimi.storage.local_knowledge_integrity_snapshot/0.1.0",
  scope: "all_local_knowledge_documents_rights_and_citations" as const,
  transactionMode: "readonly" as const,
  documentTraversal: "primary_key_order" as const,
  citationTraversal: "document_id_index" as const,
  documentContentDigestPolicy: "one_recomputation_per_unique_document_sequential" as const,
  storeNames: Object.freeze([
    "knowledgeDocuments",
    "sourceRights",
    "citations"
  ] as const)
});

export type LocalKnowledgeIntegritySnapshot = Readonly<{
  profile: typeof LOCAL_KNOWLEDGE_INTEGRITY_SNAPSHOT_PROFILE;
  counts: Readonly<{
    knowledgeDocuments: number;
    sourceRights: number;
    citations: number;
  }>;
  boundary: Readonly<{
    atomicStorageSnapshotVerified: true;
    completeCoverageVerified: true;
    maximumDocumentContentDigestConcurrency: 1;
    uniqueDocumentContentHashesVerified: true;
    sourceRightsOneToOneVerified: true;
    citationDocumentBindingVerified: true;
    citationQuoteVerified: true;
    citationTargetKeysVerified: true;
    storageMutationPerformed: false;
    authenticityClaimed: false;
    expertTruthClaimed: false;
    publicReleaseAuthorized: false;
  }>;
}>;

export const LOCAL_KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_SNAPSHOT_PROFILE = Object.freeze({
  snapshotVersion: "hakimi.storage.local_knowledge_source_aware_retrieval_snapshot/0.1.0",
  useMode: "local_review" as const,
  targetScope: "one_registered_evidence_subject" as const,
  citationDiscovery: "bounded_full_table_schema_audit_then_canonical_target_filter" as const,
  maxAuditedCitationRecords: KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_LIMITS.maxInputCitations,
  citationAuditBatchSize: 64,
  maxAuditedCitationJsonCharacters: KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_LIMITS.maxInputTextCharacters,
  maxMatchingCitationRecords: KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_LIMITS.maxMatchingCitations,
  maxVerifiedCitationRecords: KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_LIMITS.maxVerifiedItems,
  maxCapturedPacketInputJsonCharacters: KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_LIMITS.maxInputTextCharacters,
  maxCapturedPacketInputValueNodes: KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_LIMITS.maxInputValueNodes,
  digestDomain: "hakimi.storage.local_knowledge_source_aware_retrieval_snapshot.sha256/1" as const,
  transactionMode: "readonly" as const,
  storeNames: Object.freeze([
    "citations",
    "knowledgeDocuments",
    "sourceRights"
  ])
});

export type LocalKnowledgeSourceAwareRetrievalStorageSnapshot = Readonly<{
  profile: typeof LOCAL_KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_SNAPSHOT_PROFILE;
  target: Readonly<{
    evidenceSubjectId: string;
    targetKey: string;
    registryVersion: string;
  }>;
  database: Readonly<{
    targetSchemaVersion: number;
  }>;
  bindings: Readonly<{
    matchingCitationIds: readonly string[];
    candidateCitationIds: readonly string[];
    verifiedCitationIds: readonly string[];
    rejectedCitationIds: readonly string[];
    documentIds: readonly string[];
    sourceRightsDocumentIds: readonly string[];
    packetProjectionVersion: string;
    packetPayloadSha256: string;
    matchingSourceSetSha256: string;
  }>;
  boundary: Readonly<{
    atomicStorageSnapshotVerified: true;
    nestedPacketAtomicStorageSnapshotVerified: false;
    mutationEpochRevalidationPerformed: false;
    nestedPacketMutationEpochRevalidationPerformed: false;
    externalProviderUseAuthorized: false;
    externalPurposeRightsReviewed: false;
    privacyReviewPerformed: false;
    sourceTextInstructionAuthority: false;
    promptInjectionScreeningPerformed: false;
    citationSetConflictReviewPerformed: false;
    citationSetConflictStatus: "unassessed";
    networkTransmissionPerformed: false;
    networkTransmissionAuthorized: false;
    publicExportAuthorized: false;
    expertTruthClaimed: false;
    scientificValidityClaimed: false;
    formalActivationAllowed: false;
    authenticityClaimed: false;
    snapshotCallStorageMutationPerformed: false;
    snapshotCallSchemaOrReleaseIdentityMutationPerformed: false;
  }>;
  snapshotSha256: string;
}>;

export type LocalKnowledgeSourceAwareRetrievalSnapshot = Readonly<{
  packet: KnowledgeSourceAwareRetrievalPacket;
  storageSnapshot: LocalKnowledgeSourceAwareRetrievalStorageSnapshot;
}>;

export type ReadLocalKnowledgeSourceAwareRetrievalSnapshotOptions = Readonly<{
  expectedSnapshotSha256?: string;
}>;

export const LOCAL_KNOWLEDGE_CITATION_REVIEW_WORKSET_SNAPSHOT_PROFILE = Object.freeze({
  snapshotVersion: "hakimi.storage.local_knowledge_citation_review_workset_snapshot/0.1.0",
  contentVersion: "0.1.0",
  scope: "one_registered_evidence_subject_local_source_set" as const,
  derivationPolicy: "packet_and_inventory_from_one_readonly_transaction_source_capture" as const,
  transactionMode: "readonly" as const,
  requiredTargetSchemaVersion: 13 as const,
  rawSourceRecordExposure: "none" as const,
  digestDomain: "hakimi.storage.local_knowledge_citation_review_workset_snapshot.sha256/1" as const
});

export type LocalKnowledgeCitationReviewWorksetStorageSnapshot = Readonly<{
  profile: typeof LOCAL_KNOWLEDGE_CITATION_REVIEW_WORKSET_SNAPSHOT_PROFILE;
  target: Readonly<{
    evidenceSubjectId: string;
    targetKey: string;
    registryVersion: string;
  }>;
  database: Readonly<{
    targetSchemaVersion: 13;
    matchesRequiredTargetSchema: true;
    dbGenerationVerified: false;
    migrationIdentityVerified: false;
  }>;
  storageBinding: Readonly<{
    snapshotVersion: string;
    snapshotSha256: string;
  }>;
  packetBinding: Readonly<{
    projectionVersion: string;
    payloadSha256: string;
    matchingSourceSetSha256: string;
  }>;
  inventoryBinding: Readonly<{
    projectionVersion: string;
    payloadSha256: string;
    pairCount: number;
  }>;
  citationLedger: Readonly<{
    matchingCitationIds: readonly string[];
    candidateCitationIds: readonly string[];
    verifiedCitationIds: readonly string[];
    rejectedCitationIds: readonly string[];
  }>;
  reviewGate: Readonly<{
    status: KnowledgeCitationSetConflictInventory["reviewGate"]["status"];
    pairwiseComparisonRequired: boolean;
    humanReviewRequired: boolean;
    candidateResolutionRequired: boolean;
    rejectedCitationAcknowledgementRequired: boolean;
    downstreamExternalUseGate: "blocked";
  }>;
  boundary: Readonly<{
    sourceInputsCapturedInOneReadonlyTransaction: true;
    packetDerivedOnlyFromCapturedSourceInputs: true;
    inventoryDerivedOnlyFromCapturedSourceInputs: true;
    nestedPacketAtomicStorageSnapshotVerified: false;
    nestedInventoryAtomicStorageSnapshotVerified: false;
    mutationEpochRevalidationPerformed: false;
    nestedPacketMutationEpochRevalidationPerformed: false;
    nestedInventoryMutationEpochRevalidationPerformed: false;
    worksetSnapshotRawSourceRecordsCopied: false;
    bindingSidecarContainsSourceText: false;
    returnedPacketMayContainLocalSourceText: true;
    sourceTextInstructionAuthority: false;
    promptInjectionScreeningPerformed: false;
    mechanicalPairInventoryBuilt: true;
    citationSetConflictReviewPerformed: false;
    citationSetConflictStatus: "unassessed";
    chartApplicabilityAssessed: false;
    externalProviderUseAuthorized: false;
    externalPurposeRightsReviewed: false;
    privacyReviewPerformed: false;
    networkTransmissionPerformed: false;
    networkTransmissionAuthorized: false;
    publicExportAuthorized: false;
    expertTruthClaimed: false;
    scientificValidityClaimed: false;
    formalActivationAllowed: false;
    authenticityClaimed: false;
    snapshotCallStorageMutationPerformed: false;
    snapshotCallSchemaOrReleaseIdentityMutationPerformed: false;
  }>;
  snapshotSha256: string;
}>;

export type LocalKnowledgeCitationReviewWorksetSnapshot = Readonly<{
  packet: KnowledgeSourceAwareRetrievalPacket;
  inventory: KnowledgeCitationSetConflictInventory;
  storageSnapshot: LocalKnowledgeSourceAwareRetrievalStorageSnapshot;
  worksetSnapshot: LocalKnowledgeCitationReviewWorksetStorageSnapshot;
}>;

export type ReadLocalKnowledgeCitationReviewWorksetSnapshotOptions = Readonly<{
  expectedWorksetSnapshotSha256?: string;
}>;

type LocalKnowledgeSourceAwareRetrievalSnapshotBuildContext = Readonly<{
  snapshot: LocalKnowledgeSourceAwareRetrievalSnapshot;
  packetInput: BuildKnowledgeSourceAwareRetrievalPacketInput;
}>;

export class KnowledgeRepository {
  constructor(
    readonly database = new ResearchDatabase(),
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  private async requireDocument(documentId: string): Promise<KnowledgeDocumentRecord> {
    const raw = await this.database.knowledgeDocuments.get(documentId);
    if (!raw) {
      throw new KnowledgeRepositoryError("DOCUMENT_NOT_FOUND", `研究资料不存在：${documentId}`);
    }
    return Dexie.waitFor(verifyKnowledgeDocumentIntegrity(raw));
  }

  private async requireSourceRights(
    knowledgeDocument: KnowledgeDocumentRecord
  ): Promise<SourceRightsRecord> {
    const raw = await this.database.sourceRights.get(knowledgeDocument.id);
    if (!raw) {
      throw new KnowledgeRepositoryError(
        "SOURCE_RIGHTS_NOT_FOUND",
        `Source-rights record does not exist for document ${knowledgeDocument.id}.`
      );
    }
    const rightsRecord = sourceRightsRecordSchema.parse(raw);
    if (
      rightsRecord.documentId !== knowledgeDocument.id ||
      rightsRecord.documentContentHash !== knowledgeDocument.contentHash
    ) {
      throw new KnowledgeRepositoryError(
        "SOURCE_RIGHTS_CONFLICT",
        `Source-rights record is not bound to the current content of document ${knowledgeDocument.id}.`
      );
    }
    return rightsRecord;
  }

  private async verifyTargets(targets: readonly CitationTarget[]): Promise<void> {
    for (const target of targets) {
      if (target.kind === "research_note") {
        const note = await this.database.researchNotes.get(target.noteId);
        if (!note) throw new KnowledgeRepositoryError("TARGET_NOT_FOUND", `研究笔记不存在：${target.noteId}`);
        researchNoteRecordSchema.parse(note);
        continue;
      }
      if (target.kind === "event") {
        const event = await this.database.events.get(target.eventId);
        if (!event) throw new KnowledgeRepositoryError("TARGET_NOT_FOUND", `事件不存在：${target.eventId}`);
        parseStoredEventRecord(event);
        continue;
      }
      if (target.kind === "evidence_subject") {
        try {
          requireEvidenceSubject(target.subjectId);
        } catch (cause) {
          throw new KnowledgeRepositoryError(
            "TARGET_NOT_FOUND",
            `Evidence subject does not exist: ${target.subjectId}`
          );
        }
        continue;
      }
      const [caseRecord, revision] = await Promise.all([
        this.database.cases.get(target.caseId),
        this.database.revisions.get(target.revisionId)
      ]);
      if (!caseRecord || !revision) {
        throw new KnowledgeRepositoryError("TARGET_NOT_FOUND", "引用的命盘案例或修订不存在。");
      }
      caseRecordSchema.parse(caseRecord);
      const parsedRevision = await Dexie.waitFor(verifyRevisionRecordIntegrity(revision));
      if (parsedRevision.caseId !== target.caseId || !hasOwnDataPath(parsedRevision.facts, target.field)) {
        throw new KnowledgeRepositoryError(
          "TARGET_CONTEXT_MISMATCH",
          `命盘字段 ${target.field} 不属于指定案例修订，或不是可引用的实际字段。`
        );
      }
    }
  }

  private async verifyCitations(
    records: CitationRecord[],
    requiredDocumentIds: readonly string[] = []
  ): Promise<CitationRecord[]> {
    const parsed = records.map((record) => citationRecordSchema.parse(record));
    const requiredDocumentIdSet = new Set(requiredDocumentIds);
    const documentIds = [...new Set([
      ...requiredDocumentIds,
      ...parsed.map((record) => record.documentId)
    ])].sort(compareCanonicalCodeUnits);
    const documents = await this.database.knowledgeDocuments.bulkGet(documentIds);
    const verifierByDocumentId = new Map<
      string,
      Awaited<ReturnType<typeof createKnowledgeDocumentCitationIntegrityVerifier>>
    >();
    for (let index = 0; index < documents.length; index += 1) {
      const raw = documents[index];
      const documentId = documentIds[index]!;
      if (!raw) {
        throw new KnowledgeRepositoryError(
          "DOCUMENT_NOT_FOUND",
          requiredDocumentIdSet.has(documentId)
            ? `研究资料不存在：${documentId}`
            : `引用资料不存在：${documentId}`
        );
      }
      const verifier = await Dexie.waitFor(
        createKnowledgeDocumentCitationIntegrityVerifier(raw)
      );
      verifierByDocumentId.set(documentId, verifier);
    }
    return parsed.map((citation) => citationRecordSchema.parse(
      verifierByDocumentId.get(citation.documentId)!.verifyCitation(citation)
    ));
  }

  /**
   * Verifies every local knowledge document, rights row and citation against one
   * readonly IndexedDB snapshot. Only bounded counts and explicit boundary facts
   * escape the transaction; document bodies and citation collections do not.
   */
  async verifyLocalKnowledgeIntegritySnapshot(): Promise<LocalKnowledgeIntegritySnapshot> {
    if (!this.database.isOpen()) {
      throw new KnowledgeRepositoryError(
        "KNOWLEDGE_INTEGRITY_DATABASE_NOT_OPEN",
        "本地知识完整性快照要求数据库已由启动流程显式打开；本方法不会隐式建库或升级。"
      );
    }

    return this.database.transaction(
      "r",
      [
        this.database.knowledgeDocuments,
        this.database.sourceRights,
        this.database.citations
      ],
      async () => {
        const [knowledgeDocumentCount, sourceRightsCount, citationCount, rawDocumentIds] = await Promise.all([
          this.database.knowledgeDocuments.count(),
          this.database.sourceRights.count(),
          this.database.citations.count(),
          this.database.knowledgeDocuments.toCollection().primaryKeys()
        ]);
        const documentIds = rawDocumentIds.map((documentId) => {
          if (typeof documentId !== "string") {
            throw new KnowledgeRepositoryError(
              "KNOWLEDGE_INTEGRITY_COVERAGE_CONFLICT",
              "本地知识资料表包含非字符串主键，无法完成全量完整性覆盖。"
            );
          }
          return documentId;
        }).sort(compareCanonicalCodeUnits);
        if (
          documentIds.length !== knowledgeDocumentCount
          || new Set(documentIds).size !== knowledgeDocumentCount
        ) {
          throw new KnowledgeRepositoryError(
            "KNOWLEDGE_INTEGRITY_COVERAGE_CONFLICT",
            "本地知识资料主键枚举与表计数不一致。"
          );
        }
        if (sourceRightsCount !== knowledgeDocumentCount) {
          throw new KnowledgeRepositoryError(
            "SOURCE_RIGHTS_CONFLICT",
            "Every knowledge document must have exactly one non-orphan source-rights record."
          );
        }

        const verifiedContentHashes = new Set<string>();
        let processedCitationCount = 0;
        for (const documentId of documentIds) {
          const rawDocument = await this.database.knowledgeDocuments.get(documentId);
          if (!rawDocument) {
            throw new KnowledgeRepositoryError(
              "KNOWLEDGE_INTEGRITY_COVERAGE_CONFLICT",
              `本地知识资料主键 ${documentId} 无法在同一只读事务中复现。`
            );
          }
          const citationVerifier = await Dexie.waitFor(
            createKnowledgeDocumentCitationIntegrityVerifier(rawDocument)
          );
          const knowledgeDocument = citationVerifier.document;
          if (knowledgeDocument.id !== documentId) {
            throw new KnowledgeRepositoryError(
              "KNOWLEDGE_INTEGRITY_COVERAGE_CONFLICT",
              `本地知识资料主键与记录身份不一致：${documentId}。`
            );
          }
          if (verifiedContentHashes.has(knowledgeDocument.contentHash)) {
            throw new KnowledgeRepositoryError(
              "KNOWLEDGE_INTEGRITY_COVERAGE_CONFLICT",
              `本地知识资料正文摘要重复：${knowledgeDocument.contentHash}。`
            );
          }
          verifiedContentHashes.add(knowledgeDocument.contentHash);

          const rawRights = await this.database.sourceRights.get(documentId);
          if (!rawRights) {
            throw new KnowledgeRepositoryError(
              "SOURCE_RIGHTS_CONFLICT",
              `Source-rights record does not exist for document ${documentId}.`
            );
          }
          const rights = sourceRightsRecordSchema.parse(rawRights);
          if (
            rights.documentId !== knowledgeDocument.id
            || rights.documentContentHash !== knowledgeDocument.contentHash
            || (rights.origin === "user_import") !== (knowledgeDocument.recordType === "user_knowledge_document")
          ) {
            throw new KnowledgeRepositoryError(
              "SOURCE_RIGHTS_CONFLICT",
              `Source rights do not match document ${documentId}.`
            );
          }

          let citationIntegrityFailure: unknown;
          await this.database.citations.where("documentId").equals(documentId).each((rawCitation) => {
            processedCitationCount += 1;
            if (citationIntegrityFailure !== undefined) return;
            try {
              citationVerifier.verifyCitation(rawCitation);
            } catch (cause) {
              // Dexie cursor callbacks are deliberately synchronous here. Capture
              // the first failure explicitly so no adapter can turn a callback
              // exception into a shortened iteration followed by a coverage error.
              citationIntegrityFailure = cause;
            }
          });
          if (citationIntegrityFailure !== undefined) throw citationIntegrityFailure;
        }

        if (processedCitationCount !== citationCount) {
          throw new KnowledgeRepositoryError(
            "KNOWLEDGE_INTEGRITY_COVERAGE_CONFLICT",
            "本地引用表包含孤儿记录、无索引记录，或无法按资料关联完整覆盖的记录。"
          );
        }

        return Object.freeze({
          profile: LOCAL_KNOWLEDGE_INTEGRITY_SNAPSHOT_PROFILE,
          counts: Object.freeze({
            knowledgeDocuments: knowledgeDocumentCount,
            sourceRights: sourceRightsCount,
            citations: citationCount
          }),
          boundary: Object.freeze({
            atomicStorageSnapshotVerified: true as const,
            completeCoverageVerified: true as const,
            maximumDocumentContentDigestConcurrency: 1 as const,
            uniqueDocumentContentHashesVerified: true as const,
            sourceRightsOneToOneVerified: true as const,
            citationDocumentBindingVerified: true as const,
            citationQuoteVerified: true as const,
            citationTargetKeysVerified: true as const,
            storageMutationPerformed: false as const,
            authenticityClaimed: false as const,
            expertTruthClaimed: false as const,
            publicReleaseAuthorized: false as const
          })
        });
      }
    );
  }

  /**
   * Reads one registered evidence subject and all of its citation/document/rights
   * inputs from a single readonly IndexedDB transaction. The nested packet stays
   * storage-agnostic and therefore keeps its atomic/mutation flags false; this
   * sidecar is the only layer that attests to the transaction-scoped snapshot.
   */
  async readLocalKnowledgeSourceAwareRetrievalSnapshot(
    evidenceSubjectId: string,
    options: ReadLocalKnowledgeSourceAwareRetrievalSnapshotOptions = {}
  ): Promise<LocalKnowledgeSourceAwareRetrievalSnapshot> {
    return (await this.readLocalKnowledgeSourceAwareRetrievalSnapshotBuildContext(
      evidenceSubjectId,
      options
    )).snapshot;
  }

  private async readLocalKnowledgeSourceAwareRetrievalSnapshotBuildContext(
    evidenceSubjectId: string,
    options: ReadLocalKnowledgeSourceAwareRetrievalSnapshotOptions
  ): Promise<LocalKnowledgeSourceAwareRetrievalSnapshotBuildContext> {
    const subject = requireEvidenceSubject(evidenceSubjectId);
    const targetKey = citationTargetKey({ kind: "evidence_subject", subjectId: subject.subjectId });
    if (
      options === null
      || typeof options !== "object"
      || Array.isArray(options)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(options))
      || Reflect.ownKeys(options).some((key) => key !== "expectedSnapshotSha256")
    ) {
      throw new TypeError("Source-aware retrieval snapshot options must be a plain exact object.");
    }
    const expectedDigestDescriptor = Object.getOwnPropertyDescriptor(options, "expectedSnapshotSha256");
    if (
      expectedDigestDescriptor
      && (!Object.hasOwn(expectedDigestDescriptor, "value") || expectedDigestDescriptor.get || expectedDigestDescriptor.set)
    ) {
      throw new TypeError("Source-aware retrieval snapshot options cannot contain accessors.");
    }
    const expectedSnapshotSha256 = expectedDigestDescriptor?.value as unknown;
    if (
      expectedSnapshotSha256 !== undefined
      && (typeof expectedSnapshotSha256 !== "string" || !LOWERCASE_SHA256.test(expectedSnapshotSha256))
    ) {
      throw new TypeError("Expected source-aware retrieval snapshot digest must be a lowercase SHA-256 digest.");
    }

    try {
      if (!this.database.isOpen()) {
        throw new KnowledgeRepositoryError(
          "SOURCE_AWARE_RETRIEVAL_DATABASE_NOT_OPEN",
          "来源感知检索快照要求数据库已由启动流程显式打开；本方法不会隐式建库或升级。"
        );
      }
      const captured = await this.database.transaction(
        "r",
        [
          this.database.citations,
          this.database.knowledgeDocuments,
          this.database.sourceRights
        ],
        async () => {
          let auditedCitationJsonCharacters = 0;
          let matchingCitationJsonCharacters = 0;
          let matchingCitationValueNodes = 0;
          let verifiedCitationCount = 0;
          const citations: CitationRecord[] = [];
          const citationIds = await this.database.citations
            .toCollection()
            .limit(LOCAL_KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_SNAPSHOT_PROFILE.maxAuditedCitationRecords + 1)
            .primaryKeys();
          if (
            citationIds.length
            > LOCAL_KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_SNAPSHOT_PROFILE.maxAuditedCitationRecords
          ) {
            throw new KnowledgeRepositoryError(
              "SOURCE_AWARE_RETRIEVAL_RESOURCE_LIMIT_EXCEEDED",
              `来源感知检索拒绝审计超过 ${LOCAL_KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_SNAPSHOT_PROFILE.maxAuditedCitationRecords} 条引用记录。`
            );
          }
          for (
            let offset = 0;
            offset < citationIds.length;
            offset += LOCAL_KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_SNAPSHOT_PROFILE.citationAuditBatchSize
          ) {
            const batchIds = citationIds.slice(
              offset,
              offset + LOCAL_KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_SNAPSHOT_PROFILE.citationAuditBatchSize
            );
            const records = await this.database.citations.bulkGet(batchIds);
            for (let index = 0; index < records.length; index += 1) {
              const record = records[index];
              if (!record) {
                throw new KnowledgeRepositoryError(
                  "SOURCE_AWARE_RETRIEVAL_BOUNDARY_MISMATCH",
                  `来源感知检索引用主键 ${String(batchIds[index])} 在同一只读事务内无法复现。`
                );
              }
              const citation = citationRecordSchema.parse(record);
              const citationJsonCharacters = JSON.stringify(citation).length;
              auditedCitationJsonCharacters += citationJsonCharacters;
              if (
                auditedCitationJsonCharacters
                > LOCAL_KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_SNAPSHOT_PROFILE.maxAuditedCitationJsonCharacters
              ) {
                throw new KnowledgeRepositoryError(
                  "SOURCE_AWARE_RETRIEVAL_RESOURCE_LIMIT_EXCEEDED",
                  "来源感知检索引用全表审计超过有界文本预算。"
                );
              }
              if (!citation.targetKeys.includes(targetKey)) continue;
              matchingCitationJsonCharacters += citationJsonCharacters;
              matchingCitationValueNodes += countJsonValueNodes(citation);
              citations.push(citation);
              if (citation.status === "verified") verifiedCitationCount += 1;
              if (
                citations.length
                > LOCAL_KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_SNAPSHOT_PROFILE.maxMatchingCitationRecords
                || verifiedCitationCount
                > LOCAL_KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_SNAPSHOT_PROFILE.maxVerifiedCitationRecords
              ) {
                throw new KnowledgeRepositoryError(
                  "SOURCE_AWARE_RETRIEVAL_RESOURCE_LIMIT_EXCEEDED",
                  "来源感知检索主题绑定的引用超过有界读取上限；不得在载入资料正文后再静默截断。"
                );
              }
            }
          }
          citations.sort((left, right) => compareCanonicalCodeUnits(left.id, right.id));

          const documentIds = [...new Set(citations.map((citation) => citation.documentId))]
            .sort(compareCanonicalCodeUnits);
          const documents: KnowledgeDocumentRecord[] = [];
          const sourceRights: SourceRightsRecord[] = [];
          let loadedJsonCharacters = 0;
          let loadedValueNodes = 0;
          for (const documentId of documentIds) {
            const [rawDocument, rawRights] = await Promise.all([
              this.database.knowledgeDocuments.get(documentId),
              this.database.sourceRights.get(documentId)
            ]);
            if (!rawDocument) {
              throw new KnowledgeRepositoryError(
                "DOCUMENT_NOT_FOUND",
                `来源感知检索引用资料不存在：${documentId}`
              );
            }
            if (!rawRights) {
              throw new KnowledgeRepositoryError(
                "SOURCE_RIGHTS_NOT_FOUND",
                `来源感知检索资料缺少权利记录：${documentId}`
              );
            }
            const document = knowledgeDocumentRecordSchema.parse(rawDocument);
            const rights = sourceRightsRecordSchema.parse(rawRights);
            loadedJsonCharacters += JSON.stringify(document).length + JSON.stringify(rights).length;
            loadedValueNodes += countJsonValueNodes(document) + countJsonValueNodes(rights);
            if (
              matchingCitationJsonCharacters + loadedJsonCharacters
              > LOCAL_KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_SNAPSHOT_PROFILE.maxCapturedPacketInputJsonCharacters
              || matchingCitationValueNodes + loadedValueNodes + 16
              > LOCAL_KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_SNAPSHOT_PROFILE.maxCapturedPacketInputValueNodes
            ) {
              throw new KnowledgeRepositoryError(
                "SOURCE_AWARE_RETRIEVAL_RESOURCE_LIMIT_EXCEEDED",
                "来源感知检索资料与权利记录超过有界文本或节点预算。"
              );
            }
            documents.push(document);
            sourceRights.push(rights);
          }
          return Object.freeze({
            citations: Object.freeze(citations),
            documentIds: Object.freeze(documentIds),
            documents: Object.freeze(documents),
            sourceRights: Object.freeze(sourceRights)
          });
        }
      );

      const packetInput: BuildKnowledgeSourceAwareRetrievalPacketInput = Object.freeze({
        evidenceSubjectId: subject.subjectId,
        useMode: "local_review" as const,
        documents: captured.documents,
        citations: captured.citations,
        sourceRights: captured.sourceRights
      });
      const packet = await buildKnowledgeSourceAwareRetrievalPacket(packetInput);
      if (
        packet.request.useMode !== "local_review"
        || packet.request.targetKey !== targetKey
        || packet.request.evidenceSubject.subjectId !== subject.subjectId
        || packet.request.evidenceSubject.registryVersion !== subject.registryVersion
        || packet.boundary.atomicStorageSnapshotVerified !== false
        || packet.boundary.mutationEpochRevalidationPerformed !== false
        || packet.boundary.semanticRankingPerformed !== false
        || packet.boundary.semanticConflictResolutionPerformed !== false
        || packet.boundary.citationSetConflictReviewPerformed !== false
        || packet.boundary.citationSetConflictStatus !== "unassessed"
        || packet.boundary.citationReviewEstablishesSemanticTruth !== false
        || packet.boundary.rightsReviewEstablishesSemanticTruth !== false
        || packet.boundary.sourceTextInstructionAuthority !== false
        || packet.boundary.promptInjectionScreeningPerformed !== false
        || packet.boundary.externalPurposeRightsReviewed !== false
        || packet.boundary.privacyReviewPerformed !== false
        || packet.boundary.externalProviderUseAuthorized !== false
        || packet.boundary.networkTransmissionPerformed !== false
        || packet.boundary.networkTransmissionAuthorized !== false
        || packet.boundary.publicExportAuthorized !== false
        || packet.boundary.expertTruthClaimed !== false
        || packet.boundary.scientificValidityClaimed !== false
        || packet.boundary.formalActivationAllowed !== false
        || packet.boundary.chartOrStorageMutationPerformed !== false
        || packet.boundary.downstreamExternalUseGate !== "blocked"
        || packet.integrity.authenticityClaimed !== false
        || packet.boundary.result !== null
      ) {
        throw new KnowledgeRepositoryError(
          "SOURCE_AWARE_RETRIEVAL_BOUNDARY_MISMATCH",
          "来源感知检索 packet 的本机只读或外部失败关闭边界不匹配。"
        );
      }

      const snapshotPayload = Object.freeze({
        profile: LOCAL_KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_SNAPSHOT_PROFILE,
        target: Object.freeze({
          evidenceSubjectId: subject.subjectId,
          targetKey,
          registryVersion: subject.registryVersion
        }),
        database: Object.freeze({
          targetSchemaVersion: this.database.targetSchemaVersion
        }),
        bindings: Object.freeze({
          matchingCitationIds: Object.freeze(captured.citations.map((citation) => citation.id)),
          candidateCitationIds: Object.freeze([...packet.candidateCitationIds]),
          verifiedCitationIds: Object.freeze([...packet.verifiedCitationIds]),
          rejectedCitationIds: Object.freeze([...packet.rejectedCitationIds]),
          documentIds: Object.freeze([...captured.documentIds]),
          sourceRightsDocumentIds: Object.freeze(captured.sourceRights.map((rights) => rights.documentId)),
          packetProjectionVersion: packet.profile.projectionVersion,
          packetPayloadSha256: packet.integrity.payloadSha256,
          matchingSourceSetSha256: packet.sourceSet.matchingSourceSetSha256
        }),
        boundary: Object.freeze({
          atomicStorageSnapshotVerified: true as const,
          nestedPacketAtomicStorageSnapshotVerified: false as const,
          mutationEpochRevalidationPerformed: false as const,
          nestedPacketMutationEpochRevalidationPerformed: false as const,
          externalProviderUseAuthorized: false as const,
          externalPurposeRightsReviewed: false as const,
          privacyReviewPerformed: false as const,
          sourceTextInstructionAuthority: false as const,
          promptInjectionScreeningPerformed: false as const,
          citationSetConflictReviewPerformed: false as const,
          citationSetConflictStatus: "unassessed" as const,
          networkTransmissionPerformed: false as const,
          networkTransmissionAuthorized: false as const,
          publicExportAuthorized: false as const,
          expertTruthClaimed: false as const,
          scientificValidityClaimed: false as const,
          formalActivationAllowed: false as const,
          authenticityClaimed: false as const,
          snapshotCallStorageMutationPerformed: false as const,
          snapshotCallSchemaOrReleaseIdentityMutationPerformed: false as const
        })
      });
      const snapshotSha256 = await sha256Hex({
        domain: LOCAL_KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_SNAPSHOT_PROFILE.digestDomain,
        payload: snapshotPayload
      });
      if (expectedSnapshotSha256 !== undefined && expectedSnapshotSha256 !== snapshotSha256) {
        throw new KnowledgeRepositoryError(
          "SOURCE_AWARE_RETRIEVAL_SNAPSHOT_STALE",
          "来源感知检索 target snapshot 已变化；旧摘要不能继续使用。"
        );
      }
      const storageSnapshot = Object.freeze({
        ...snapshotPayload,
        snapshotSha256
      });
      return Object.freeze({
        snapshot: Object.freeze({ packet, storageSnapshot }),
        packetInput
      });
    } catch (cause) {
      if (
        expectedSnapshotSha256 !== undefined
        && !(
          cause instanceof KnowledgeRepositoryError
          && cause.code === "SOURCE_AWARE_RETRIEVAL_SNAPSHOT_STALE"
        )
      ) {
        const error = new KnowledgeRepositoryError(
          "SOURCE_AWARE_RETRIEVAL_SNAPSHOT_REVALIDATION_FAILED",
          "来源感知检索旧摘要无法在新的原子只读事务中完整复现。"
        );
        Object.defineProperty(error, "cause", { value: cause, enumerable: false });
        throw error;
      }
      throw cause;
    }
  }

  /**
   * Derives the source-aware packet and the exhaustive mechanical conflict
   * inventory from the same private three-store capture. Raw database records
   * remain internal; the returned packet may still contain local quote text for
   * review, while the workset sidecar contains only identifiers and digests.
   */
  async readLocalKnowledgeCitationReviewWorksetSnapshot(
    evidenceSubjectId: string,
    options: ReadLocalKnowledgeCitationReviewWorksetSnapshotOptions = {}
  ): Promise<LocalKnowledgeCitationReviewWorksetSnapshot> {
    if (
      options === null
      || typeof options !== "object"
      || Array.isArray(options)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(options))
      || Reflect.ownKeys(options).some((key) => key !== "expectedWorksetSnapshotSha256")
    ) {
      throw new TypeError("Citation review workset snapshot options must be a plain exact object.");
    }
    const expectedDigestDescriptor = Object.getOwnPropertyDescriptor(
      options,
      "expectedWorksetSnapshotSha256"
    );
    if (
      expectedDigestDescriptor
      && (!Object.hasOwn(expectedDigestDescriptor, "value") || expectedDigestDescriptor.get || expectedDigestDescriptor.set)
    ) {
      throw new TypeError("Citation review workset snapshot options cannot contain accessors.");
    }
    const expectedWorksetSnapshotSha256 = expectedDigestDescriptor?.value as unknown;
    if (
      expectedWorksetSnapshotSha256 !== undefined
      && (
        typeof expectedWorksetSnapshotSha256 !== "string"
        || !LOWERCASE_SHA256.test(expectedWorksetSnapshotSha256)
      )
    ) {
      throw new TypeError("Expected citation review workset snapshot digest must be a lowercase SHA-256 digest.");
    }

    try {
      if (
        this.database.targetSchemaVersion
        !== LOCAL_KNOWLEDGE_CITATION_REVIEW_WORKSET_SNAPSHOT_PROFILE.requiredTargetSchemaVersion
      ) {
        throw new KnowledgeRepositoryError(
          "CITATION_REVIEW_WORKSET_TARGET_SCHEMA_MISMATCH",
          "引用复核工作集仅绑定当前 legacy-v13 路线的 targetSchema 13；不得跨代际复用。"
        );
      }
      const { snapshot, packetInput } = await this.readLocalKnowledgeSourceAwareRetrievalSnapshotBuildContext(
        evidenceSubjectId,
        {}
      );
      const { packet, storageSnapshot } = snapshot;
      const inventory = await buildKnowledgeCitationSetConflictInventory(packet, packetInput);

      if (
        storageSnapshot.database.targetSchemaVersion
        !== LOCAL_KNOWLEDGE_CITATION_REVIEW_WORKSET_SNAPSHOT_PROFILE.requiredTargetSchemaVersion
        || storageSnapshot.target.evidenceSubjectId !== inventory.binding.evidenceSubjectId
        || storageSnapshot.target.targetKey !== inventory.binding.targetKey
        || storageSnapshot.target.registryVersion !== inventory.binding.registryVersion
        || inventory.binding.retrievalUseMode !== "local_review"
        || storageSnapshot.bindings.packetProjectionVersion !== inventory.binding.retrievalProjectionVersion
        || storageSnapshot.bindings.packetPayloadSha256 !== inventory.binding.retrievalPayloadSha256
        || storageSnapshot.bindings.matchingSourceSetSha256 !== inventory.binding.matchingSourceSetSha256
        || !sameOrderedStrings(
          storageSnapshot.bindings.candidateCitationIds,
          inventory.binding.candidateCitationIds
        )
        || !sameOrderedStrings(
          storageSnapshot.bindings.verifiedCitationIds,
          inventory.binding.verifiedCitationIds
        )
        || !sameOrderedStrings(
          storageSnapshot.bindings.rejectedCitationIds,
          inventory.binding.rejectedCitationIds
        )
        || storageSnapshot.boundary.atomicStorageSnapshotVerified !== true
        || storageSnapshot.boundary.nestedPacketAtomicStorageSnapshotVerified !== false
        || packet.boundary.atomicStorageSnapshotVerified !== false
        || packet.boundary.mutationEpochRevalidationPerformed !== false
        || inventory.boundary.atomicStorageSnapshotVerified !== false
        || inventory.boundary.mutationEpochRevalidationPerformed !== false
        || inventory.boundary.rawSourceRecordsCopied !== false
        || inventory.boundary.containsSourceText !== false
        || inventory.reviewGate.citationSetConflictReviewPerformed !== false
        || inventory.reviewGate.citationSetConflictStatus !== "unassessed"
        || inventory.reviewGate.downstreamExternalUseGate !== "blocked"
        || inventory.counts.pairs !== inventory.pairs.length
      ) {
        throw new KnowledgeRepositoryError(
          "CITATION_REVIEW_WORKSET_BOUNDARY_MISMATCH",
          "引用复核工作集的原子来源、检索包、机械清单或失败关闭边界不一致。"
        );
      }

      const worksetPayload = Object.freeze({
        profile: LOCAL_KNOWLEDGE_CITATION_REVIEW_WORKSET_SNAPSHOT_PROFILE,
        target: Object.freeze({
          evidenceSubjectId: storageSnapshot.target.evidenceSubjectId,
          targetKey: storageSnapshot.target.targetKey,
          registryVersion: storageSnapshot.target.registryVersion
        }),
        database: Object.freeze({
          targetSchemaVersion: 13 as const,
          matchesRequiredTargetSchema: true as const,
          dbGenerationVerified: false as const,
          migrationIdentityVerified: false as const
        }),
        storageBinding: Object.freeze({
          snapshotVersion: storageSnapshot.profile.snapshotVersion,
          snapshotSha256: storageSnapshot.snapshotSha256
        }),
        packetBinding: Object.freeze({
          projectionVersion: packet.profile.projectionVersion,
          payloadSha256: packet.integrity.payloadSha256,
          matchingSourceSetSha256: packet.sourceSet.matchingSourceSetSha256
        }),
        inventoryBinding: Object.freeze({
          projectionVersion: inventory.profile.projectionVersion,
          payloadSha256: inventory.integrity.payloadSha256,
          pairCount: inventory.counts.pairs
        }),
        citationLedger: Object.freeze({
          matchingCitationIds: Object.freeze([...storageSnapshot.bindings.matchingCitationIds]),
          candidateCitationIds: Object.freeze([...inventory.binding.candidateCitationIds]),
          verifiedCitationIds: Object.freeze([...inventory.binding.verifiedCitationIds]),
          rejectedCitationIds: Object.freeze([...inventory.binding.rejectedCitationIds])
        }),
        reviewGate: Object.freeze({
          status: inventory.reviewGate.status,
          pairwiseComparisonRequired: inventory.reviewGate.pairwiseComparisonRequired,
          humanReviewRequired: inventory.reviewGate.humanReviewRequired,
          candidateResolutionRequired: inventory.reviewGate.candidateResolutionRequired,
          rejectedCitationAcknowledgementRequired: inventory.reviewGate.rejectedCitationAcknowledgementRequired,
          downstreamExternalUseGate: "blocked" as const
        }),
        boundary: Object.freeze({
          sourceInputsCapturedInOneReadonlyTransaction: true as const,
          packetDerivedOnlyFromCapturedSourceInputs: true as const,
          inventoryDerivedOnlyFromCapturedSourceInputs: true as const,
          nestedPacketAtomicStorageSnapshotVerified: false as const,
          nestedInventoryAtomicStorageSnapshotVerified: false as const,
          mutationEpochRevalidationPerformed: false as const,
          nestedPacketMutationEpochRevalidationPerformed: false as const,
          nestedInventoryMutationEpochRevalidationPerformed: false as const,
          worksetSnapshotRawSourceRecordsCopied: false as const,
          bindingSidecarContainsSourceText: false as const,
          returnedPacketMayContainLocalSourceText: true as const,
          sourceTextInstructionAuthority: false as const,
          promptInjectionScreeningPerformed: false as const,
          mechanicalPairInventoryBuilt: true as const,
          citationSetConflictReviewPerformed: false as const,
          citationSetConflictStatus: "unassessed" as const,
          chartApplicabilityAssessed: false as const,
          externalProviderUseAuthorized: false as const,
          externalPurposeRightsReviewed: false as const,
          privacyReviewPerformed: false as const,
          networkTransmissionPerformed: false as const,
          networkTransmissionAuthorized: false as const,
          publicExportAuthorized: false as const,
          expertTruthClaimed: false as const,
          scientificValidityClaimed: false as const,
          formalActivationAllowed: false as const,
          authenticityClaimed: false as const,
          snapshotCallStorageMutationPerformed: false as const,
          snapshotCallSchemaOrReleaseIdentityMutationPerformed: false as const
        })
      });
      const snapshotSha256 = await sha256Hex({
        domain: LOCAL_KNOWLEDGE_CITATION_REVIEW_WORKSET_SNAPSHOT_PROFILE.digestDomain,
        payload: worksetPayload
      });
      if (
        expectedWorksetSnapshotSha256 !== undefined
        && expectedWorksetSnapshotSha256 !== snapshotSha256
      ) {
        throw new KnowledgeRepositoryError(
          "CITATION_REVIEW_WORKSET_SNAPSHOT_STALE",
          "引用复核工作集已变化；旧摘要不能继续用于人工观察或后续上下文绑定。"
        );
      }
      const worksetSnapshot = Object.freeze({
        ...worksetPayload,
        snapshotSha256
      });
      return Object.freeze({ packet, inventory, storageSnapshot, worksetSnapshot });
    } catch (cause) {
      if (
        expectedWorksetSnapshotSha256 !== undefined
        && !(
          cause instanceof KnowledgeRepositoryError
          && cause.code === "CITATION_REVIEW_WORKSET_SNAPSHOT_STALE"
        )
      ) {
        const error = new KnowledgeRepositoryError(
          "CITATION_REVIEW_WORKSET_SNAPSHOT_REVALIDATION_FAILED",
          "引用复核工作集旧摘要无法从新的原子只读捕获中完整复现。"
        );
        Object.defineProperty(error, "cause", { value: cause, enumerable: false });
        throw error;
      }
      throw cause;
    }
  }

  async listDocuments(): Promise<KnowledgeDocumentRecord[]> {
    const records = await this.database.knowledgeDocuments.orderBy("updatedAt").reverse().toArray();
    return Promise.all(records.map((record) => verifyKnowledgeDocumentIntegrity(record)));
  }

  async getDocument(documentId: string): Promise<KnowledgeDocumentRecord | null> {
    const raw = await this.database.knowledgeDocuments.get(documentId);
    return raw ? verifyKnowledgeDocumentIntegrity(raw) : null;
  }

  async getSourceRights(documentId: string): Promise<SourceRightsRecord | null> {
    const rawDocument = await this.database.knowledgeDocuments.get(documentId);
    if (!rawDocument) return null;
    const document = await verifyKnowledgeDocumentIntegrity(rawDocument);
    return this.requireSourceRights(document);
  }

  async listSourceRights(): Promise<SourceRightsRecord[]> {
    return this.database.transaction(
      "r",
      this.database.knowledgeDocuments,
      this.database.sourceRights,
      async () => {
        const documents = await this.database.knowledgeDocuments.toArray();
        const verifiedDocuments = await Dexie.waitFor(Promise.all(
          documents.map((knowledgeDocument) => verifyKnowledgeDocumentIntegrity(knowledgeDocument))
        ));
        const documentById = new Map(verifiedDocuments.map((knowledgeDocument) => [knowledgeDocument.id, knowledgeDocument]));
        const rightsRecords = (await this.database.sourceRights.toArray()).map((record) => sourceRightsRecordSchema.parse(record));
        if (rightsRecords.length !== verifiedDocuments.length) {
          throw new KnowledgeRepositoryError("SOURCE_RIGHTS_CONFLICT", "Every knowledge document must have exactly one non-orphan source-rights record.");
        }
        for (const rights of rightsRecords) {
          const knowledgeDocument = documentById.get(rights.documentId);
          if (!knowledgeDocument || rights.documentContentHash !== knowledgeDocument.contentHash
            || (rights.origin === "user_import") !== (knowledgeDocument.recordType === "user_knowledge_document")) {
            throw new KnowledgeRepositoryError("SOURCE_RIGHTS_CONFLICT", `Source rights do not match document ${rights.documentId}.`);
          }
        }
        return rightsRecords.sort((left, right) =>
          right.updatedAt.localeCompare(left.updatedAt) || left.documentId.localeCompare(right.documentId)
        );
      }
    );
  }

  async updateUserSourceRights(
    documentId: string,
    input: UpdateUserSourceRightsInput
  ): Promise<SourceRightsRecord> {
    return this.database.transaction(
      "rw",
      this.database.knowledgeDocuments,
      this.database.sourceRights,
      async () => {
        const knowledgeDocument = await this.requireDocument(documentId);
        const current = await this.requireSourceRights(knowledgeDocument);
        if (
          knowledgeDocument.recordType !== "user_knowledge_document" ||
          current.origin !== "user_import" ||
          current.rights.status !== "user_unverified" ||
          current.rights.workStatus !== "unknown" ||
          current.rights.editionStatus !== "unknown" ||
          current.rights.distributionPolicy !== "local_private_only" ||
          current.review.status !== "unreviewed" ||
          current.review.attestations.length !== 0
        ) {
          throw new KnowledgeRepositoryError(
            "SOURCE_RIGHTS_UPDATE_FORBIDDEN",
            "The ordinary user API cannot modify reviewed, bundled, or redistributable rights records."
          );
        }
        if (current.editVersion !== input.expectedEditVersion) {
          throw new KnowledgeRepositoryError(
            "EDIT_VERSION_CONFLICT",
            `Source-rights edit version changed from ${input.expectedEditVersion} to ${current.editVersion}.`
          );
        }
        const timestamp = this.now();
        const updated = sourceRightsRecordSchema.parse({
          ...current,
          source: {
            sourceUrl: input.sourceUrl === undefined ? current.source.sourceUrl : input.sourceUrl,
            publisher: input.publisher === undefined ? current.source.publisher : input.publisher,
            publicationYear: input.publicationYear === undefined
              ? current.source.publicationYear
              : input.publicationYear,
            acquiredAt: input.acquiredAt === undefined ? current.source.acquiredAt : input.acquiredAt
          },
          rights: {
            ...current.rights,
            copyrightNotice: input.copyrightNotice === undefined
              ? current.rights.copyrightNotice
              : input.copyrightNotice,
            evidenceRefs: input.evidenceRefs === undefined
              ? current.rights.evidenceRefs
              : input.evidenceRefs
          },
          review: {
            ...current.review,
            note: input.reviewNote === undefined ? current.review.note : input.reviewNote
          },
          editVersion: current.editVersion + 1,
          updatedAt: timestamp
        });
        await this.database.sourceRights.put(updated);
        return updated;
      }
    );
  }

  async searchDocuments(rawQuery: string, options: { limit?: number } = {}): Promise<KnowledgeSearchHit[]> {
    return searchKnowledgeDocuments(await this.listDocuments(), rawQuery, options);
  }

  async createDocument(input: CreateKnowledgeDocumentInput): Promise<KnowledgeDocumentRecord> {
    if (!Number.isInteger(input.byteSize) || input.byteSize <= 0 || input.byteSize > MAX_KNOWLEDGE_DOCUMENT_BYTES) {
      throw new RangeError(`资料文件大小必须位于 1–${MAX_KNOWLEDGE_DOCUMENT_BYTES} 字节。`);
    }
    const snapshot = await buildKnowledgeContentSnapshot(input.content, input.format);
    const timestamp = this.now();
    const record = knowledgeDocumentRecordSchema.parse({
      schemaVersion: SCHEMA_VERSION,
      id: crypto.randomUUID(),
      recordType: "user_knowledge_document",
      title: input.title,
      author: input.author,
      edition: input.edition,
      sourceNote: input.sourceNote,
      fileName: input.fileName,
      format: input.format,
      byteSize: input.byteSize,
      ...snapshot,
      editVersion: 1,
      createdAt: timestamp,
      updatedAt: timestamp
    });
    const rightsRecord = createUserSourceRightsRecord(record, input, timestamp);
    await this.database.transaction("rw", this.database.knowledgeDocuments, this.database.sourceRights, async () => {
      const duplicate = await this.database.knowledgeDocuments.where("contentHash").equals(record.contentHash).first();
      if (duplicate) throw new DuplicateKnowledgeDocumentError(record.contentHash);
      await Dexie.waitFor(verifyKnowledgeDocumentIntegrity(record));
      await this.database.knowledgeDocuments.add(record);
      await this.database.sourceRights.add(rightsRecord);
    });
    return record;
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.database.transaction(
      "rw",
      this.database.knowledgeDocuments,
      this.database.citations,
      this.database.sourceRights,
      this.database.attachments,
      async () => {
        if (!(await this.database.knowledgeDocuments.get(documentId))) {
          throw new KnowledgeRepositoryError("DOCUMENT_NOT_FOUND", `研究资料不存在：${documentId}`);
        }
        await this.database.citations.where("documentId").equals(documentId).delete();
        await deleteAttachmentsByLinkIndexes(this.database.attachments, {
          knowledgeDocumentIds: [documentId]
        });
        await this.database.sourceRights.delete(documentId);
        await this.database.knowledgeDocuments.delete(documentId);
      }
    );
  }

  async listCitations(): Promise<CitationRecord[]> {
    return this.database.transaction(
      "r",
      [this.database.citations, this.database.knowledgeDocuments],
      async () => {
        const records = await this.database.citations.orderBy("updatedAt").reverse().toArray();
        return this.verifyCitations(records);
      }
    );
  }

  async listCitationsByDocument(documentId: string): Promise<CitationRecord[]> {
    return this.database.transaction(
      "r",
      [this.database.citations, this.database.knowledgeDocuments],
      async () => {
        const records = await this.database.citations.where("documentId").equals(documentId).sortBy("updatedAt");
        return (await this.verifyCitations(records, [documentId])).reverse();
      }
    );
  }

  async listCitationsByTargetKey(targetKey: string): Promise<CitationRecord[]> {
    if (targetKey.trim() !== targetKey || targetKey.length === 0 || targetKey.length > 500) {
      throw new TypeError("Citation target key must be a non-empty canonical string.");
    }
    return this.database.transaction(
      "r",
      [this.database.citations, this.database.knowledgeDocuments],
      async () => {
        const records = await this.database.citations.where("targetKeys").equals(targetKey).sortBy("updatedAt");
        return (await this.verifyCitations(records)).reverse();
      }
    );
  }

  async listCitationsByTarget(target: CitationTarget): Promise<CitationRecord[]> {
    return this.listCitationsByTargetKey(citationTargetKey(target));
  }

  async createCitation(input: CreateCitationInput): Promise<CitationRecord> {
    const capturedInput = captureCreateCitationInput(input);
    return this.database.transaction(
      "rw",
      [
        this.database.knowledgeDocuments,
        this.database.citations,
        this.database.cases,
        this.database.revisions,
        this.database.researchNotes,
        this.database.events
      ],
      async () => {
        const rawDocument = await this.database.knowledgeDocuments.get(capturedInput.documentId);
        if (!rawDocument) {
          throw new KnowledgeRepositoryError(
            "DOCUMENT_NOT_FOUND",
            `研究资料不存在：${capturedInput.documentId}`
          );
        }
        const citationVerifier = await Dexie.waitFor(
          createKnowledgeDocumentCitationIntegrityVerifier(rawDocument)
        );
        const knowledgeDocument = citationVerifier.document;
        const timestamp = this.now();
        const record = citationRecordSchema.parse({
          schemaVersion: SCHEMA_VERSION,
          id: crypto.randomUUID(),
          documentId: knowledgeDocument.id,
          documentContentHash: knowledgeDocument.contentHash,
          locator: capturedInput.locator,
          quote: extractKnowledgeQuote(
            knowledgeDocument.content,
            capturedInput.locator.startLine,
            capturedInput.locator.endLine
          ),
          annotation: capturedInput.annotation,
          targets: capturedInput.targets,
          targetKeys: citationTargetKeys(capturedInput.targets),
          status: "user_candidate",
          reviewAttestations: [],
          decisionNote: "",
          editVersion: 1,
          createdAt: timestamp,
          updatedAt: timestamp
        });
        await this.verifyTargets(record.targets);
        const verifiedRecord = citationRecordSchema.parse(citationVerifier.verifyCitation(record));
        await this.database.citations.add(verifiedRecord);
        return verifiedRecord;
      }
    );
  }

  async deleteCitation(citationId: string): Promise<void> {
    await this.database.transaction("rw", this.database.citations, async () => {
      if (!(await this.database.citations.get(citationId))) {
        throw new KnowledgeRepositoryError("CITATION_NOT_FOUND", `引用不存在：${citationId}`);
      }
      await this.database.citations.delete(citationId);
    });
  }
}

function lazyRuntimeSingleton<T extends object>(factory: () => T): T {
  let instance: T | undefined;
  const proxyTarget = Object.create(null) as T;
  const resolve = (): T => {
    instance ??= factory();
    return instance;
  };
  return new Proxy(proxyTarget, {
    get(target, property, receiver) {
      if (Object.prototype.hasOwnProperty.call(target, property)) {
        return Reflect.get(target, property, receiver) as unknown;
      }
      const resolved = resolve();
      const value = Reflect.get(resolved, property, resolved) as unknown;
      return typeof value === "function" ? value.bind(resolved) : value;
    },
    set(target, property, value, receiver) {
      if (Object.prototype.hasOwnProperty.call(target, property)) {
        return Reflect.set(target, property, value, receiver);
      }
      const resolved = resolve();
      return Reflect.set(resolved, property, value, resolved);
    },
    has(target, property) {
      return Reflect.has(target, property) || Reflect.has(resolve(), property);
    },
    ownKeys(target) {
      return [...new Set([...Reflect.ownKeys(target), ...Reflect.ownKeys(resolve())])];
    },
    getOwnPropertyDescriptor(target, property) {
      const targetDescriptor = Reflect.getOwnPropertyDescriptor(target, property);
      if (targetDescriptor) return targetDescriptor;
      const descriptor = Reflect.getOwnPropertyDescriptor(resolve(), property);
      return descriptor ? { ...descriptor, configurable: true } : undefined;
    },
    getPrototypeOf() {
      return Reflect.getPrototypeOf(resolve());
    }
  });
}

export const caseRepository = lazyRuntimeSingleton(() => new CaseRepository());
export const researchRepository = lazyRuntimeSingleton(
  () => new ResearchRepository(caseRepository.database)
);
export const knowledgeRepository = lazyRuntimeSingleton(
  () => new KnowledgeRepository(caseRepository.database)
);
export const ruleRegistryRepository = lazyRuntimeSingleton(
  () => new RuleRegistryRepository(caseRepository.database)
);
