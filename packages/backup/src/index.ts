import {
  CORE_BACKUP_DIGEST_ALGORITHM,
  BACKUP_DATA_SCHEMA_VERSION_V1,
  CORE_BACKUP_FORMAT,
  CORE_BACKUP_FORMAT_VERSION,
  CORE_BACKUP_SCOPE,
  LEGACY_CORE_BACKUP_FORMAT_VERSION,
  FULL_BACKUP_DIGEST_ALGORITHM,
  FULL_BACKUP_FORMAT,
  FULL_BACKUP_FORMAT_VERSION,
  FULL_BACKUP_SCOPE,
  EVENT_TIME_MIGRATION_FULL_BACKUP_FORMAT_VERSION,
  TZDB_MIGRATION_FULL_BACKUP_FORMAT_VERSION,
  RULE_REGISTRY_FULL_BACKUP_FORMAT_VERSION,
  LOCAL_USER_DATA_FULL_BACKUP_FORMAT_VERSION,
  EVENT_TIME_FULL_BACKUP_FORMAT_VERSION,
  EVENT_RECORD_VERSION,
  EVENT_TIME_MIGRATION_SNAPSHOT_FORMAT_VERSION,
  SAVED_VIEW_FULL_BACKUP_FORMAT_VERSION,
  KNOWLEDGE_FULL_BACKUP_FORMAT_VERSION,
  LEGACY_FULL_BACKUP_FORMAT_VERSION,
  LIFECYCLE_FULL_BACKUP_FORMAT_VERSION,
  LEGACY_UNIDENTIFIED_TZDB_VERSION,
  PREVIOUS_FULL_BACKUP_FORMAT_VERSION,
  RESEARCH_SUBJECT_RECORD_VERSION,
  SCHEMA_VERSION,
  SOURCE_RIGHTS_FULL_BACKUP_FORMAT_VERSION,
  coreBackupDigestsSchema,
  coreBackupEnvelopeSchema,
  coreBackupManifestSchema,
  coreBackupPayloadSchema,
  eventTimeFullBackupDigestsSchema,
  eventTimeFullBackupEnvelopeSchema,
  eventTimeFullBackupManifestSchema,
  eventTimeFullBackupPayloadSchema,
  eventTimeMigrationFullBackupDigestsSchema,
  eventTimeMigrationFullBackupEnvelopeSchema,
  eventTimeMigrationFullBackupManifestSchema,
  eventTimeMigrationFullBackupPayloadSchema,
  savedViewFullBackupDigestsSchema,
  savedViewFullBackupEnvelopeSchema,
  savedViewFullBackupManifestSchema,
  savedViewFullBackupPayloadSchema,
  fullBackupDigestsSchema,
  fullBackupEnvelopeSchema,
  fullBackupManifestSchema,
  fullBackupPayloadSchema,
  knowledgeFullBackupDigestsSchema,
  knowledgeFullBackupEnvelopeSchema,
  knowledgeFullBackupManifestSchema,
  knowledgeFullBackupPayloadSchema,
  lifecycleFullBackupDigestsSchema,
  lifecycleFullBackupEnvelopeSchema,
  lifecycleFullBackupManifestSchema,
  lifecycleFullBackupPayloadSchema,
  localUserDataFullBackupDigestsSchema,
  localUserDataFullBackupEnvelopeSchema,
  localUserDataFullBackupManifestSchema,
  localUserDataFullBackupPayloadSchema,
  ruleRegistryFullBackupDigestsSchema,
  ruleRegistryFullBackupEnvelopeSchema,
  ruleRegistryFullBackupManifestSchema,
  ruleRegistryFullBackupPayloadSchema,
  tzdbMigrationFullBackupDigestsSchema,
  tzdbMigrationFullBackupEnvelopeSchema,
  tzdbMigrationFullBackupManifestSchema,
  tzdbMigrationFullBackupPayloadSchema,
  legacyCoreBackupDigestsSchema,
  legacyCoreBackupEnvelopeSchema,
  legacyCoreBackupManifestSchema,
  legacyCoreBackupPayloadSchema,
  legacyFullBackupDigestsSchema,
  legacyFullBackupEnvelopeSchema,
  legacyFullBackupManifestSchema,
  legacyFullBackupPayloadSchema,
  previousFullBackupDigestsSchema,
  previousFullBackupEnvelopeSchema,
  previousFullBackupManifestSchema,
  previousFullBackupPayloadSchema,
  sourceRightsFullBackupDigestsSchema,
  sourceRightsFullBackupEnvelopeSchema,
  sourceRightsFullBackupManifestSchema,
  sourceRightsFullBackupPayloadSchema,
  type CoreBackupDigests,
  type CoreBackupEnvelope,
  type CoreBackupManifest,
  type CoreBackupPayload,
  type EventTimeFullBackupDigests,
  type EventTimeFullBackupEnvelope,
  type EventTimeFullBackupManifest,
  type EventTimeFullBackupPayload,
  type EventTimeMigrationFullBackupDigests,
  type EventTimeMigrationFullBackupEnvelope,
  type EventTimeMigrationFullBackupManifest,
  type EventTimeMigrationFullBackupPayload,
  type SavedViewFullBackupDigests,
  type SavedViewFullBackupEnvelope,
  type SavedViewFullBackupManifest,
  type SavedViewFullBackupPayload,
  type FullBackupDigests,
  type FullBackupEnvelope,
  type FullBackupManifest,
  type FullBackupPayload,
  type KnowledgeFullBackupDigests,
  type KnowledgeFullBackupEnvelope,
  type KnowledgeFullBackupManifest,
  type KnowledgeFullBackupPayload,
  type LifecycleFullBackupDigests,
  type LifecycleFullBackupEnvelope,
  type LifecycleFullBackupManifest,
  type LifecycleFullBackupPayload,
  type LocalUserDataFullBackupDigests,
  type LocalUserDataFullBackupEnvelope,
  type LocalUserDataFullBackupManifest,
  type LocalUserDataFullBackupPayload,
  type RuleRegistryFullBackupDigests,
  type RuleRegistryFullBackupEnvelope,
  type RuleRegistryFullBackupManifest,
  type RuleRegistryFullBackupPayload,
  type TzdbMigrationFullBackupDigests,
  type TzdbMigrationFullBackupEnvelope,
  type TzdbMigrationFullBackupManifest,
  type TzdbMigrationFullBackupPayload,
  type LegacyCoreBackupDigests,
  type LegacyCoreBackupEnvelope,
  type LegacyCoreBackupManifest,
  type LegacyCoreBackupPayload,
  type LegacyFullBackupDigests,
  type LegacyFullBackupEnvelope,
  type LegacyFullBackupManifest,
  type LegacyFullBackupPayload,
  type PreviousFullBackupDigests,
  type PreviousFullBackupEnvelope,
  type PreviousFullBackupManifest,
  type PreviousFullBackupPayload,
  type SourceRightsFullBackupDigests,
  type SourceRightsFullBackupEnvelope,
  type SourceRightsFullBackupManifest,
  type SourceRightsFullBackupPayload,
  type RevisionRecord,
  type EventRecord,
  type EventTimeMigrationSnapshot,
  type CitationRecord,
  type CitationV03Record,
  type KnowledgeDocumentRecord,
  type KnowledgeDocumentV03Record,
  type SourceRightsRecord,
  citationTargetKeys,
  migrateLegacyEventRecordV1,
  migrateLegacySavedViewRecordV1
} from "@hakimi/contracts";
import {
  canonicalStringify,
  decodeCanonicalBase64,
  sha256BytesHex,
  sha256Hex
} from "@hakimi/integrity";
import { verifyRulePackIntegrity } from "@hakimi/rule-packs";
import {
  KnowledgeCoreError,
  KnowledgeIntegrityError,
  requireEvidenceSubject,
  verifyCitationIntegrity,
  verifyKnowledgeDocumentIntegrity
} from "@hakimi/knowledge-core";
import { verifyCompatibleTransitNodeRef } from "@hakimi/transit-core";
import {
  classifyStoredTimeZoneDatabase,
  classifyStoredTimeZoneDatabaseForReplay,
  resolveEventTimeContext,
  verifyEventTimeContext
} from "@hakimi/time-core";
import {
  CalculatedChartIntegrityError,
  CandidateSetIntegrityError,
  verifyCandidateSetRecordIntegrity,
  verifyRevisionRecordIntegrity
} from "@hakimi/chart-integrity";
import {
  CoreDataIdentityConflictError,
  CoreDataReplaceBlockedError,
  FullDataReplaceConflictError,
  buildCandidateSetTzdbComparison,
  buildLegacyCandidateSetTzdbComparison
} from "../../storage/src/worker-safe";
import type { CaseRepository } from "@hakimi/storage";
import {
  DEFAULT_MAX_FULL_BACKUP_JSON_BYTES,
  FullBackupArchiveError,
  createFullBackupArchiveFromJson,
  looksLikeZip,
  readFullBackupArchiveJson
} from "./archive";

type RevisionReplayModule = typeof import("@hakimi/revision-replay");
let revisionReplayModulePromise: Promise<RevisionReplayModule> | undefined;

function loadRevisionReplayModule(): Promise<RevisionReplayModule> {
  revisionReplayModulePromise ??= import("@hakimi/revision-replay");
  return revisionReplayModulePromise;
}

export {
  DEFAULT_MAX_FULL_BACKUP_ARCHIVE_BYTES,
  DEFAULT_MAX_FULL_BACKUP_JSON_BYTES,
  FULL_BACKUP_ARCHIVE_ENTRY,
  FULL_BACKUP_ARCHIVE_MIME,
  FullBackupArchiveError,
  createFullBackupArchiveFromJson,
  looksLikeZip,
  readFullBackupArchiveJson,
  type FullBackupArchiveErrorCode
} from "./archive";

export type CoreBackupErrorCode =
  | "INVALID_JSON"
  | "UNSUPPORTED_FORMAT"
  | "UNSUPPORTED_FORMAT_VERSION"
  | "UNSUPPORTED_SCHEMA_VERSION"
  | "SCHEMA_INVALID"
  | "COUNT_MISMATCH"
  | "DIGEST_MISMATCH"
  | "DUPLICATE_ID"
  | "ORPHAN_REVISION"
  | "REVISION_SEQUENCE_INVALID"
  | "CASE_REVISION_SUMMARY_MISMATCH"
  | "CROSS_PARTITION_ID_CONFLICT"
  | "DEPENDENT_RESEARCH_DATA_EXISTS";

export class CoreBackupError extends Error {
  constructor(
    readonly code: CoreBackupErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "CoreBackupError";
  }
}

export type CreateCoreBackupOptions = {
  appVersion: string;
  exportedAt?: string;
};

export type CoreBackupPreflightResult = {
  scope: typeof CORE_BACKUP_SCOPE;
  manifest: CoreBackupManifest;
  payload: CoreBackupPayload;
  digests: CoreBackupDigests;
  migratedFromFormatVersion: typeof LEGACY_CORE_BACKUP_FORMAT_VERSION | null;
};

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalPayload(snapshot: CoreBackupPayload): CoreBackupPayload {
  return coreBackupPayloadSchema.parse({
    cases: [...snapshot.cases].sort((left, right) => compareText(left.id, right.id)),
    revisions: [...snapshot.revisions].sort((left, right) =>
      compareText(left.caseId, right.caseId) ||
      left.revisionNumber - right.revisionNumber ||
      compareText(left.id, right.id)
    )
  });
}

function canonicalLegacyCorePayload(snapshot: LegacyCoreBackupPayload): LegacyCoreBackupPayload {
  return legacyCoreBackupPayloadSchema.parse({
    cases: [...snapshot.cases].sort((left, right) => compareText(left.id, right.id)),
    revisions: [...snapshot.revisions].sort((left, right) =>
      compareText(left.caseId, right.caseId) ||
      left.revisionNumber - right.revisionNumber ||
      compareText(left.id, right.id)
    )
  });
}

export async function recomputeCoreBackupDigests(input: {
  manifest: CoreBackupManifest;
  payload: CoreBackupPayload;
}): Promise<CoreBackupDigests> {
  const manifest = coreBackupManifestSchema.parse(input.manifest);
  // Record arrays are a logical partition, so their digest uses one canonical order.
  // This keeps payload hashes stable across IndexedDB iteration order and round trips.
  const payload = canonicalPayload(input.payload);
  const cases = await sha256Hex(payload.cases);
  const revisions = await sha256Hex(payload.revisions);
  const payloadDigest = await sha256Hex(payload);
  const envelope = await sha256Hex({
    manifest,
    digests: { cases, revisions, payload: payloadDigest },
    payload
  });
  return coreBackupDigestsSchema.parse({ cases, revisions, payload: payloadDigest, envelope });
}

export async function recomputeLegacyCoreBackupDigests(input: {
  manifest: LegacyCoreBackupManifest;
  payload: LegacyCoreBackupPayload;
}): Promise<LegacyCoreBackupDigests> {
  const manifest = legacyCoreBackupManifestSchema.parse(input.manifest);
  const payload = canonicalLegacyCorePayload(input.payload);
  const cases = await sha256Hex(payload.cases);
  const revisions = await sha256Hex(payload.revisions);
  const payloadDigest = await sha256Hex(payload);
  const envelope = await sha256Hex({
    manifest,
    digests: { cases, revisions, payload: payloadDigest },
    payload
  });
  return legacyCoreBackupDigestsSchema.parse({ cases, revisions, payload: payloadDigest, envelope });
}

function assertUniqueIds(payload: CoreBackupPayload): void {
  const allIds = new Set<string>();
  for (const record of payload.cases) {
    if (allIds.has(record.id)) throw new CoreBackupError("DUPLICATE_ID", `Case ID 重复：${record.id}`);
    allIds.add(record.id);
  }
  for (const record of payload.revisions) {
    if (allIds.has(record.id)) throw new CoreBackupError("DUPLICATE_ID", `Revision ID 重复或与 Case ID 冲突：${record.id}`);
    allIds.add(record.id);
  }
}

function groupRevisions(payload: CoreBackupPayload): Map<string, RevisionRecord[]> {
  const caseIds = new Set(payload.cases.map((record) => record.id));
  const grouped = new Map<string, RevisionRecord[]>();
  for (const revision of payload.revisions) {
    if (!caseIds.has(revision.caseId)) {
      throw new CoreBackupError("ORPHAN_REVISION", `Revision ${revision.id} 引用了不存在的 Case ${revision.caseId}`);
    }
    const records = grouped.get(revision.caseId) ?? [];
    records.push(revision);
    grouped.set(revision.caseId, records);
  }
  return grouped;
}

function assertCaseRevisionSummaries(payload: CoreBackupPayload): void {
  const grouped = groupRevisions(payload);
  for (const caseRecord of payload.cases) {
    const revisions = [...(grouped.get(caseRecord.id) ?? [])].sort((left, right) => left.revisionNumber - right.revisionNumber);
    for (let index = 0; index < revisions.length; index += 1) {
      const expected = index + 1;
      if (revisions[index].revisionNumber !== expected) {
        throw new CoreBackupError(
          "REVISION_SEQUENCE_INVALID",
          `Case ${caseRecord.id} 的 revisionNumber 必须从 1 连续递增；期望 ${expected}，实际 ${revisions[index].revisionNumber}`
        );
      }
    }
    const latest = revisions.at(-1);
    if (
      revisions.length !== caseRecord.revisionCount ||
      !latest ||
      latest.id !== caseRecord.latestRevisionId
    ) {
      throw new CoreBackupError(
        "CASE_REVISION_SUMMARY_MISMATCH",
        `Case ${caseRecord.id} 的 revisionCount/latestRevisionId 与 Revision 分区不一致`
      );
    }
  }
}

function assertCoreRelationships(payload: CoreBackupPayload): void {
  assertUniqueIds(payload);
  assertCaseRevisionSummaries(payload);
}

async function assertCoreRevisionDigests(revisions: RevisionRecord[]): Promise<void> {
  try {
    await Promise.all(revisions.map((revision) => verifyRevisionRecordIntegrity(revision)));
  } catch (cause) {
    if (!(cause instanceof CalculatedChartIntegrityError)) throw cause;
    throw new CoreBackupError(
      "DIGEST_MISMATCH",
      `Revision ${cause.chartId} has a mismatched ${cause.mismatch} digest.`,
      { cause }
    );
  }
}

function parseRawEnvelope(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw) as unknown;
  } catch (cause) {
    throw new CoreBackupError("INVALID_JSON", "核心数据备份不是有效 JSON。", { cause });
  }
}

function readManifestForVersionCheck(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new CoreBackupError("SCHEMA_INVALID", "核心数据备份 envelope 必须是对象。 ");
  }
  const manifest = (raw as Record<string, unknown>).manifest;
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new CoreBackupError("SCHEMA_INVALID", "核心数据备份缺少 manifest。 ");
  }
  return manifest as Record<string, unknown>;
}

function assertSupportedVersions(
  raw: unknown
): typeof CORE_BACKUP_FORMAT_VERSION | typeof LEGACY_CORE_BACKUP_FORMAT_VERSION {
  const manifest = readManifestForVersionCheck(raw);
  if (manifest.format !== CORE_BACKUP_FORMAT) {
    throw new CoreBackupError("UNSUPPORTED_FORMAT", `不支持的备份格式：${String(manifest.format)}`);
  }
  if (
    manifest.formatVersion !== CORE_BACKUP_FORMAT_VERSION &&
    manifest.formatVersion !== LEGACY_CORE_BACKUP_FORMAT_VERSION
  ) {
    throw new CoreBackupError("UNSUPPORTED_FORMAT_VERSION", `不支持的核心备份格式版本：${String(manifest.formatVersion)}`);
  }
  if (manifest.schemaVersion !== SCHEMA_VERSION) {
    throw new CoreBackupError("UNSUPPORTED_SCHEMA_VERSION", `不支持的数据 Schema 版本：${String(manifest.schemaVersion)}`);
  }
  return manifest.formatVersion;
}

function parseStrictEnvelope(raw: unknown): CoreBackupEnvelope {
  const result = coreBackupEnvelopeSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .slice(0, 4)
      .map((issue) => `${issue.path.join(".") || "envelope"}: ${issue.message}`)
      .join("；");
    throw new CoreBackupError("SCHEMA_INVALID", `核心数据备份 Schema 校验失败：${details}`);
  }
  return result.data;
}

function parseStrictLegacyCoreEnvelope(raw: unknown): LegacyCoreBackupEnvelope {
  const result = legacyCoreBackupEnvelopeSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .slice(0, 4)
      .map((issue) => `${issue.path.join(".") || "envelope"}: ${issue.message}`)
      .join("; ");
    throw new CoreBackupError("SCHEMA_INVALID", `Legacy core-backup schema validation failed: ${details}`);
  }
  return result.data;
}

function assertCounts(envelope: CoreBackupEnvelope): void {
  const { counts } = envelope.manifest;
  if (counts.cases !== envelope.payload.cases.length || counts.revisions !== envelope.payload.revisions.length) {
    throw new CoreBackupError(
      "COUNT_MISMATCH",
      `记录计数不一致：manifest=${counts.cases}/${counts.revisions}，payload=${envelope.payload.cases.length}/${envelope.payload.revisions.length}`
    );
  }
}

function assertLegacyCoreCounts(envelope: LegacyCoreBackupEnvelope): void {
  const { counts } = envelope.manifest;
  if (counts.cases !== envelope.payload.cases.length || counts.revisions !== envelope.payload.revisions.length) {
    throw new CoreBackupError(
      "COUNT_MISMATCH",
      `Legacy core-backup counts differ: manifest=${counts.cases}/${counts.revisions}, payload=${envelope.payload.cases.length}/${envelope.payload.revisions.length}`
    );
  }
}

function assertDigests(
  actual: CoreBackupDigests | LegacyCoreBackupDigests,
  expected: CoreBackupDigests | LegacyCoreBackupDigests
): void {
  for (const partition of ["cases", "revisions", "payload", "envelope"] as const) {
    if (actual[partition] !== expected[partition]) {
      throw new CoreBackupError("DIGEST_MISMATCH", `${partition} 摘要不匹配，核心数据备份可能损坏或被修改。`);
    }
  }
}

function migrateLegacyCaseRecord<Record extends LegacyCoreBackupPayload["cases"][number]>(record: Record) {
  return {
    ...record,
    recordVersion: RESEARCH_SUBJECT_RECORD_VERSION,
    favorite: false,
    deletedAt: null
  } as const;
}

function migrateLegacyCorePayload(payload: LegacyCoreBackupPayload): CoreBackupPayload {
  return canonicalPayload({
    cases: payload.cases.map(migrateLegacyCaseRecord),
    revisions: payload.revisions
  });
}

async function migrateVerifiedLegacyCoreBackup(
  envelope: LegacyCoreBackupEnvelope
): Promise<CoreBackupPreflightResult> {
  assertLegacyCoreCounts(envelope);
  const legacyPayload = canonicalLegacyCorePayload(envelope.payload);
  const legacyDigests = await recomputeLegacyCoreBackupDigests({
    manifest: envelope.manifest,
    payload: legacyPayload
  });
  assertDigests(envelope.digests, legacyDigests);

  const payload = migrateLegacyCorePayload(legacyPayload);
  await assertCoreRevisionDigests(payload.revisions);
  assertCoreRelationships(payload);
  const manifest = coreBackupManifestSchema.parse({
    ...envelope.manifest,
    formatVersion: CORE_BACKUP_FORMAT_VERSION
  });
  const digests = await recomputeCoreBackupDigests({ manifest, payload });
  return {
    scope: CORE_BACKUP_SCOPE,
    manifest,
    payload,
    digests,
    migratedFromFormatVersion: LEGACY_CORE_BACKUP_FORMAT_VERSION
  };
}

export async function preflightCoreBackup(rawInput: unknown): Promise<CoreBackupPreflightResult> {
  const raw = parseRawEnvelope(rawInput);
  const formatVersion = assertSupportedVersions(raw);
  if (formatVersion === LEGACY_CORE_BACKUP_FORMAT_VERSION) {
    return migrateVerifiedLegacyCoreBackup(parseStrictLegacyCoreEnvelope(raw));
  }
  const envelope = parseStrictEnvelope(raw);
  assertCounts(envelope);
  const payload = canonicalPayload(envelope.payload);
  const recomputed = await recomputeCoreBackupDigests({ manifest: envelope.manifest, payload });
  assertDigests(envelope.digests, recomputed);
  await assertCoreRevisionDigests(payload.revisions);
  assertCoreRelationships(payload);
  return {
    scope: CORE_BACKUP_SCOPE,
    manifest: envelope.manifest,
    payload,
    digests: recomputed,
    migratedFromFormatVersion: null
  };
}

export async function createCoreBackup(
  repository: CaseRepository,
  options: CreateCoreBackupOptions
): Promise<CoreBackupEnvelope> {
  const payload = canonicalPayload(await repository.readCoreDataSnapshot());
  await assertCoreRevisionDigests(payload.revisions);
  assertCoreRelationships(payload);
  const manifest = coreBackupManifestSchema.parse({
    format: CORE_BACKUP_FORMAT,
    formatVersion: CORE_BACKUP_FORMAT_VERSION,
    schemaVersion: BACKUP_DATA_SCHEMA_VERSION_V1,
    scope: CORE_BACKUP_SCOPE,
    appVersion: options.appVersion,
    exportedAt: options.exportedAt ?? new Date().toISOString(),
    digestAlgorithm: CORE_BACKUP_DIGEST_ALGORITHM,
    counts: { cases: payload.cases.length, revisions: payload.revisions.length }
  });
  const digests = await recomputeCoreBackupDigests({ manifest, payload });
  return coreBackupEnvelopeSchema.parse({ manifest, digests, payload });
}

export function serializeCoreBackup(envelope: CoreBackupEnvelope): string {
  const parsed = coreBackupEnvelopeSchema.parse(envelope);
  return canonicalStringify({ ...parsed, payload: canonicalPayload(parsed.payload) });
}

export async function importCoreBackup(
  repository: CaseRepository,
  rawInput: unknown
): Promise<CoreBackupPreflightResult> {
  const verified = await preflightCoreBackup(rawInput);
  try {
    await repository.replaceCoreDataSnapshot(verified.payload);
  } catch (cause) {
    if (cause instanceof CoreDataReplaceBlockedError) {
      throw new CoreBackupError(
        "DEPENDENT_RESEARCH_DATA_EXISTS",
        "检测到研究笔记、事件或保存视图；当前核心备份不包含这些数据，因此已拒绝替换。",
        { cause }
      );
    }
    if (cause instanceof CoreDataIdentityConflictError) {
      throw new CoreBackupError(
        "CROSS_PARTITION_ID_CONFLICT",
        `核心备份中的 Case/Revision ID 与本地保留的未知时辰候选组冲突：${cause.conflictingIds.join("、")}`,
        { cause }
      );
    }
    throw cause;
  }
  return verified;
}

export type FullBackupErrorCode =
  | "INVALID_JSON"
  | "UNSUPPORTED_FORMAT"
  | "UNSUPPORTED_FORMAT_VERSION"
  | "UNSUPPORTED_SCHEMA_VERSION"
  | "SCHEMA_INVALID"
  | "COUNT_MISMATCH"
  | "DIGEST_MISMATCH"
  | "SAVED_VIEW_QUERY_DIGEST_MISMATCH"
  | "DUPLICATE_ID"
  | "ORPHAN_REVISION"
  | "ORPHAN_RESEARCH_NOTE"
  | "ORPHAN_EVENT"
  | "ORPHAN_CITATION_DOCUMENT"
  | "ORPHAN_CITATION_TARGET"
  | "DUPLICATE_SOURCE_RIGHTS"
  | "ORPHAN_SOURCE_RIGHTS"
  | "SOURCE_RIGHTS_NOT_FOUND"
  | "SOURCE_RIGHTS_CONTENT_HASH_MISMATCH"
  | "SOURCE_RIGHTS_ORIGIN_MISMATCH"
  | "KNOWLEDGE_DOCUMENT_INTEGRITY_MISMATCH"
  | "CITATION_INTEGRITY_MISMATCH"
  | "ATTACHMENT_INTEGRITY_MISMATCH"
  | "ORPHAN_ATTACHMENT_TARGET"
  | "TRANSIT_CONTEXT_MISMATCH"
  | "EVENT_TIME_CONTEXT_MISMATCH"
  | "REVISION_SEQUENCE_INVALID"
  | "CASE_REVISION_SUMMARY_MISMATCH"
  | "RULE_PACK_INTEGRITY_MISMATCH"
  | "RULE_REGISTRY_RELATIONSHIP_MISMATCH"
  | "ORPHAN_TZDB_MIGRATION"
  | "TZDB_MIGRATION_INTEGRITY_MISMATCH"
  | "TZDB_MIGRATION_CONTEXT_MISMATCH"
  | "ORPHAN_EVENT_TIME_MIGRATION"
  | "EVENT_TIME_MIGRATION_INTEGRITY_MISMATCH"
  | "EVENT_TIME_MIGRATION_CONTEXT_MISMATCH"
  | "ORPHAN_REVISION_CALCULATION_RECEIPT"
  | "REVISION_CALCULATION_RECEIPT_INTEGRITY_MISMATCH"
  | "REVISION_CALCULATION_RECEIPT_CONTEXT_MISMATCH"
  | "DUPLICATE_REVISION_CALCULATION_REQUEST"
  | "CURRENT_DATA_CHANGED";

export class FullBackupError extends Error {
  constructor(
    readonly code: FullBackupErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "FullBackupError";
  }
}

/**
 * v1.2 models every local v1 partition, including all append-only migration
 * and Revision calculation receipt ledgers plus the versioned rule registry,
 * attachment bytes and portable
 * preferences. Historical imports are strict today, but unchanged nested record
 * schemas still share source aliases with the current contracts. The committed
 * rich v0.7 fixture catches drift; source-level deep copies remain hardening work.
 */
export const FULL_BACKUP_P1_11_REMAINING_GAPS = [
  "historical-v0.1-v0.8-nested-record-schemas-still-share-current-aliases"
] as const;

export type FullBackupP111Gap = typeof FULL_BACKUP_P1_11_REMAINING_GAPS[number];

export type CreateFullBackupOptions = {
  appVersion: string;
  exportedAt?: string;
};

export type FullBackupPreflightResult = {
  scope: typeof FULL_BACKUP_SCOPE;
  manifest: FullBackupManifest;
  payload: FullBackupPayload;
  digests: FullBackupDigests;
  /** Set only when a verified older envelope was migrated in memory. */
  migratedFromFormatVersion:
    | typeof LEGACY_FULL_BACKUP_FORMAT_VERSION
    | typeof PREVIOUS_FULL_BACKUP_FORMAT_VERSION
    | typeof KNOWLEDGE_FULL_BACKUP_FORMAT_VERSION
    | typeof SOURCE_RIGHTS_FULL_BACKUP_FORMAT_VERSION
    | typeof LIFECYCLE_FULL_BACKUP_FORMAT_VERSION
    | typeof EVENT_TIME_FULL_BACKUP_FORMAT_VERSION
    | typeof SAVED_VIEW_FULL_BACKUP_FORMAT_VERSION
    | typeof LOCAL_USER_DATA_FULL_BACKUP_FORMAT_VERSION
    | typeof RULE_REGISTRY_FULL_BACKUP_FORMAT_VERSION
    | typeof TZDB_MIGRATION_FULL_BACKUP_FORMAT_VERSION
    | typeof EVENT_TIME_MIGRATION_FULL_BACKUP_FORMAT_VERSION
    | null;
  remainingP111Gaps: typeof FULL_BACKUP_P1_11_REMAINING_GAPS;
};

export type FullBackupImportPreparation = {
  incoming: FullBackupPreflightResult;
  /** Download this before calling applyPreparedFullBackup. */
  currentSafetyBackup: FullBackupEnvelope;
};

export type FullBackupImportResult = {
  imported: FullBackupPreflightResult;
  /** Exact current data captured before the destructive replacement began. */
  currentSafetyBackup: FullBackupEnvelope;
};

export type VerifiedFullBackupReplacement = {
  incoming: FullBackupPreflightResult;
  expectedCurrentPayloadDigest: string;
};

function canonicalFullPayload(snapshot: FullBackupPayload): FullBackupPayload {
  return fullBackupPayloadSchema.parse({
    cases: [...snapshot.cases].sort((left, right) => compareText(left.id, right.id)),
    revisions: [...snapshot.revisions].sort((left, right) =>
      compareText(left.caseId, right.caseId) ||
      left.revisionNumber - right.revisionNumber ||
      compareText(left.id, right.id)
    ),
    candidateSets: [...snapshot.candidateSets].sort((left, right) => compareText(left.id, right.id)),
    researchNotes: [...snapshot.researchNotes].sort((left, right) =>
      compareText(left.caseId, right.caseId) || compareText(left.id, right.id)
    ),
    events: [...snapshot.events].sort((left, right) =>
      compareText(left.caseId, right.caseId) || compareText(left.id, right.id)
    ),
    savedViews: [...snapshot.savedViews].sort((left, right) => compareText(left.id, right.id)),
    knowledgeDocuments: [...snapshot.knowledgeDocuments].sort((left, right) => compareText(left.id, right.id)),
    citations: [...snapshot.citations].sort((left, right) =>
      compareText(left.documentId, right.documentId) ||
      left.locator.startLine - right.locator.startLine ||
      left.locator.endLine - right.locator.endLine ||
      compareText(left.id, right.id)
    ),
    sourceRights: [...snapshot.sourceRights].sort((left, right) =>
      compareText(left.documentId, right.documentId)
    ),
    attachments: [...snapshot.attachments].sort((left, right) => compareText(left.id, right.id)),
    researcherProfiles: [...snapshot.researcherProfiles].sort((left, right) => compareText(left.id, right.id)),
    appSettings: [...snapshot.appSettings].sort((left, right) => compareText(left.id, right.id)),
    ruleRegistry: [...snapshot.ruleRegistry].sort((left, right) =>
      compareText(left.recordType, right.recordType) || compareText(left.id, right.id)
    ),
    tzdbMigrationReceipts: [...snapshot.tzdbMigrationReceipts].sort((left, right) =>
      compareText(left.createdAt, right.createdAt) || compareText(left.id, right.id)
    ),
    eventTimeMigrationReceipts: [...snapshot.eventTimeMigrationReceipts].sort((left, right) =>
      compareText(left.createdAt, right.createdAt) || compareText(left.id, right.id)
    ),
    revisionCalculationReceipts: [...snapshot.revisionCalculationReceipts].sort((left, right) =>
      compareText(left.createdAt, right.createdAt) || compareText(left.id, right.id)
    )
  });
}

/** v1.1's exact fifteen-partition order, before Revision calculation receipts existed. */
function canonicalEventTimeMigrationFullPayload(
  snapshot: EventTimeMigrationFullBackupPayload
): EventTimeMigrationFullBackupPayload {
  return eventTimeMigrationFullBackupPayloadSchema.parse({
    cases: [...snapshot.cases].sort((left, right) => compareText(left.id, right.id)),
    revisions: [...snapshot.revisions].sort((left, right) =>
      compareText(left.caseId, right.caseId) ||
      left.revisionNumber - right.revisionNumber ||
      compareText(left.id, right.id)
    ),
    candidateSets: [...snapshot.candidateSets].sort((left, right) => compareText(left.id, right.id)),
    researchNotes: [...snapshot.researchNotes].sort((left, right) =>
      compareText(left.caseId, right.caseId) || compareText(left.id, right.id)
    ),
    events: [...snapshot.events].sort((left, right) =>
      compareText(left.caseId, right.caseId) || compareText(left.id, right.id)
    ),
    savedViews: [...snapshot.savedViews].sort((left, right) => compareText(left.id, right.id)),
    knowledgeDocuments: [...snapshot.knowledgeDocuments].sort((left, right) => compareText(left.id, right.id)),
    citations: [...snapshot.citations].sort((left, right) =>
      compareText(left.documentId, right.documentId) ||
      left.locator.startLine - right.locator.startLine ||
      left.locator.endLine - right.locator.endLine ||
      compareText(left.id, right.id)
    ),
    sourceRights: [...snapshot.sourceRights].sort((left, right) => compareText(left.documentId, right.documentId)),
    attachments: [...snapshot.attachments].sort((left, right) => compareText(left.id, right.id)),
    researcherProfiles: [...snapshot.researcherProfiles].sort((left, right) => compareText(left.id, right.id)),
    appSettings: [...snapshot.appSettings].sort((left, right) => compareText(left.id, right.id)),
    ruleRegistry: [...snapshot.ruleRegistry].sort((left, right) =>
      compareText(left.recordType, right.recordType) || compareText(left.id, right.id)
    ),
    tzdbMigrationReceipts: [...snapshot.tzdbMigrationReceipts].sort((left, right) =>
      compareText(left.createdAt, right.createdAt) || compareText(left.id, right.id)
    ),
    eventTimeMigrationReceipts: [...snapshot.eventTimeMigrationReceipts].sort((left, right) =>
      compareText(left.createdAt, right.createdAt) || compareText(left.id, right.id)
    )
  });
}

/** v1.0's exact fourteen-partition order, before Event time migration receipts existed. */
function canonicalTzdbMigrationFullPayload(
  snapshot: TzdbMigrationFullBackupPayload
): TzdbMigrationFullBackupPayload {
  return tzdbMigrationFullBackupPayloadSchema.parse({
    cases: [...snapshot.cases].sort((left, right) => compareText(left.id, right.id)),
    revisions: [...snapshot.revisions].sort((left, right) =>
      compareText(left.caseId, right.caseId) ||
      left.revisionNumber - right.revisionNumber ||
      compareText(left.id, right.id)
    ),
    candidateSets: [...snapshot.candidateSets].sort((left, right) => compareText(left.id, right.id)),
    researchNotes: [...snapshot.researchNotes].sort((left, right) =>
      compareText(left.caseId, right.caseId) || compareText(left.id, right.id)
    ),
    events: [...snapshot.events].sort((left, right) =>
      compareText(left.caseId, right.caseId) || compareText(left.id, right.id)
    ),
    savedViews: [...snapshot.savedViews].sort((left, right) => compareText(left.id, right.id)),
    knowledgeDocuments: [...snapshot.knowledgeDocuments].sort((left, right) => compareText(left.id, right.id)),
    citations: [...snapshot.citations].sort((left, right) =>
      compareText(left.documentId, right.documentId) ||
      left.locator.startLine - right.locator.startLine ||
      left.locator.endLine - right.locator.endLine ||
      compareText(left.id, right.id)
    ),
    sourceRights: [...snapshot.sourceRights].sort((left, right) =>
      compareText(left.documentId, right.documentId)
    ),
    attachments: [...snapshot.attachments].sort((left, right) => compareText(left.id, right.id)),
    researcherProfiles: [...snapshot.researcherProfiles].sort((left, right) => compareText(left.id, right.id)),
    appSettings: [...snapshot.appSettings].sort((left, right) => compareText(left.id, right.id)),
    ruleRegistry: [...snapshot.ruleRegistry].sort((left, right) =>
      compareText(left.recordType, right.recordType) || compareText(left.id, right.id)
    ),
    tzdbMigrationReceipts: [...snapshot.tzdbMigrationReceipts].sort((left, right) =>
      compareText(left.createdAt, right.createdAt) || compareText(left.id, right.id)
    )
  });
}

/** v0.9's exact thirteen-partition order, before migration receipts existed. */
function canonicalRuleRegistryFullPayload(
  snapshot: RuleRegistryFullBackupPayload
): RuleRegistryFullBackupPayload {
  return ruleRegistryFullBackupPayloadSchema.parse({
    cases: [...snapshot.cases].sort((left, right) => compareText(left.id, right.id)),
    revisions: [...snapshot.revisions].sort((left, right) =>
      compareText(left.caseId, right.caseId) ||
      left.revisionNumber - right.revisionNumber ||
      compareText(left.id, right.id)
    ),
    candidateSets: [...snapshot.candidateSets].sort((left, right) => compareText(left.id, right.id)),
    researchNotes: [...snapshot.researchNotes].sort((left, right) =>
      compareText(left.caseId, right.caseId) || compareText(left.id, right.id)
    ),
    events: [...snapshot.events].sort((left, right) =>
      compareText(left.caseId, right.caseId) || compareText(left.id, right.id)
    ),
    savedViews: [...snapshot.savedViews].sort((left, right) => compareText(left.id, right.id)),
    knowledgeDocuments: [...snapshot.knowledgeDocuments].sort((left, right) => compareText(left.id, right.id)),
    citations: [...snapshot.citations].sort((left, right) =>
      compareText(left.documentId, right.documentId) ||
      left.locator.startLine - right.locator.startLine ||
      left.locator.endLine - right.locator.endLine ||
      compareText(left.id, right.id)
    ),
    sourceRights: [...snapshot.sourceRights].sort((left, right) => compareText(left.documentId, right.documentId)),
    attachments: [...snapshot.attachments].sort((left, right) => compareText(left.id, right.id)),
    researcherProfiles: [...snapshot.researcherProfiles].sort((left, right) => compareText(left.id, right.id)),
    appSettings: [...snapshot.appSettings].sort((left, right) => compareText(left.id, right.id)),
    ruleRegistry: [...snapshot.ruleRegistry].sort((left, right) =>
      compareText(left.recordType, right.recordType) || compareText(left.id, right.id)
    )
  });
}

/** v0.8's exact twelve-partition canonical order, before the rule registry existed. */
function canonicalLocalUserDataFullPayload(
  snapshot: LocalUserDataFullBackupPayload
): LocalUserDataFullBackupPayload {
  return localUserDataFullBackupPayloadSchema.parse({
    cases: [...snapshot.cases].sort((left, right) => compareText(left.id, right.id)),
    revisions: [...snapshot.revisions].sort((left, right) =>
      compareText(left.caseId, right.caseId) ||
      left.revisionNumber - right.revisionNumber ||
      compareText(left.id, right.id)
    ),
    candidateSets: [...snapshot.candidateSets].sort((left, right) => compareText(left.id, right.id)),
    researchNotes: [...snapshot.researchNotes].sort((left, right) =>
      compareText(left.caseId, right.caseId) || compareText(left.id, right.id)
    ),
    events: [...snapshot.events].sort((left, right) =>
      compareText(left.caseId, right.caseId) || compareText(left.id, right.id)
    ),
    savedViews: [...snapshot.savedViews].sort((left, right) => compareText(left.id, right.id)),
    knowledgeDocuments: [...snapshot.knowledgeDocuments].sort((left, right) => compareText(left.id, right.id)),
    citations: [...snapshot.citations].sort((left, right) =>
      compareText(left.documentId, right.documentId) ||
      left.locator.startLine - right.locator.startLine ||
      left.locator.endLine - right.locator.endLine ||
      compareText(left.id, right.id)
    ),
    sourceRights: [...snapshot.sourceRights].sort((left, right) => compareText(left.documentId, right.documentId)),
    attachments: [...snapshot.attachments].sort((left, right) => compareText(left.id, right.id)),
    researcherProfiles: [...snapshot.researcherProfiles].sort((left, right) => compareText(left.id, right.id)),
    appSettings: [...snapshot.appSettings].sort((left, right) => compareText(left.id, right.id))
  });
}

/** v0.7's exact nine-partition canonical order and SavedView v2 shape. */
function canonicalSavedViewFullPayload(snapshot: SavedViewFullBackupPayload): SavedViewFullBackupPayload {
  return savedViewFullBackupPayloadSchema.parse({
    cases: [...snapshot.cases].sort((left, right) => compareText(left.id, right.id)),
    revisions: [...snapshot.revisions].sort((left, right) =>
      compareText(left.caseId, right.caseId) ||
      left.revisionNumber - right.revisionNumber ||
      compareText(left.id, right.id)
    ),
    candidateSets: [...snapshot.candidateSets].sort((left, right) => compareText(left.id, right.id)),
    researchNotes: [...snapshot.researchNotes].sort((left, right) =>
      compareText(left.caseId, right.caseId) || compareText(left.id, right.id)
    ),
    events: [...snapshot.events].sort((left, right) =>
      compareText(left.caseId, right.caseId) || compareText(left.id, right.id)
    ),
    savedViews: [...snapshot.savedViews].sort((left, right) => compareText(left.id, right.id)),
    knowledgeDocuments: [...snapshot.knowledgeDocuments].sort((left, right) => compareText(left.id, right.id)),
    citations: [...snapshot.citations].sort((left, right) =>
      compareText(left.documentId, right.documentId) ||
      left.locator.startLine - right.locator.startLine ||
      left.locator.endLine - right.locator.endLine ||
      compareText(left.id, right.id)
    ),
    sourceRights: [...snapshot.sourceRights].sort((left, right) => compareText(left.documentId, right.documentId))
  });
}

/** v0.6's exact nine-partition canonical order and legacy SavedView v1 shape. */
function canonicalEventTimeFullPayload(snapshot: EventTimeFullBackupPayload): EventTimeFullBackupPayload {
  return eventTimeFullBackupPayloadSchema.parse({
    cases: [...snapshot.cases].sort((left, right) => compareText(left.id, right.id)),
    revisions: [...snapshot.revisions].sort((left, right) =>
      compareText(left.caseId, right.caseId) ||
      left.revisionNumber - right.revisionNumber ||
      compareText(left.id, right.id)
    ),
    candidateSets: [...snapshot.candidateSets].sort((left, right) => compareText(left.id, right.id)),
    researchNotes: [...snapshot.researchNotes].sort((left, right) =>
      compareText(left.caseId, right.caseId) || compareText(left.id, right.id)
    ),
    events: [...snapshot.events].sort((left, right) =>
      compareText(left.caseId, right.caseId) || compareText(left.id, right.id)
    ),
    savedViews: [...snapshot.savedViews].sort((left, right) => compareText(left.id, right.id)),
    knowledgeDocuments: [...snapshot.knowledgeDocuments].sort((left, right) => compareText(left.id, right.id)),
    citations: [...snapshot.citations].sort((left, right) =>
      compareText(left.documentId, right.documentId) ||
      left.locator.startLine - right.locator.startLine ||
      left.locator.endLine - right.locator.endLine ||
      compareText(left.id, right.id)
    ),
    sourceRights: [...snapshot.sourceRights].sort((left, right) => compareText(left.documentId, right.documentId))
  });
}

/** v0.5's exact nine-partition canonical order and Event v1 shape. */
function canonicalLifecycleFullPayload(snapshot: LifecycleFullBackupPayload): LifecycleFullBackupPayload {
  return lifecycleFullBackupPayloadSchema.parse({
    cases: [...snapshot.cases].sort((left, right) => compareText(left.id, right.id)),
    revisions: [...snapshot.revisions].sort((left, right) =>
      compareText(left.caseId, right.caseId) ||
      left.revisionNumber - right.revisionNumber ||
      compareText(left.id, right.id)
    ),
    candidateSets: [...snapshot.candidateSets].sort((left, right) => compareText(left.id, right.id)),
    researchNotes: [...snapshot.researchNotes].sort((left, right) =>
      compareText(left.caseId, right.caseId) || compareText(left.id, right.id)
    ),
    events: [...snapshot.events].sort((left, right) =>
      compareText(left.caseId, right.caseId) || compareText(left.id, right.id)
    ),
    savedViews: [...snapshot.savedViews].sort((left, right) => compareText(left.id, right.id)),
    knowledgeDocuments: [...snapshot.knowledgeDocuments].sort((left, right) => compareText(left.id, right.id)),
    citations: [...snapshot.citations].sort((left, right) =>
      compareText(left.documentId, right.documentId) ||
      left.locator.startLine - right.locator.startLine ||
      left.locator.endLine - right.locator.endLine ||
      compareText(left.id, right.id)
    ),
    sourceRights: [...snapshot.sourceRights].sort((left, right) => compareText(left.documentId, right.documentId))
  });
}

/** v0.3's exact eight-partition canonical order; never extend this after release. */
function canonicalKnowledgeFullPayload(snapshot: KnowledgeFullBackupPayload): KnowledgeFullBackupPayload {
  return knowledgeFullBackupPayloadSchema.parse({
    cases: [...snapshot.cases].sort((left, right) => compareText(left.id, right.id)),
    revisions: [...snapshot.revisions].sort((left, right) =>
      compareText(left.caseId, right.caseId) ||
      left.revisionNumber - right.revisionNumber ||
      compareText(left.id, right.id)
    ),
    candidateSets: [...snapshot.candidateSets].sort((left, right) => compareText(left.id, right.id)),
    researchNotes: [...snapshot.researchNotes].sort((left, right) =>
      compareText(left.caseId, right.caseId) || compareText(left.id, right.id)
    ),
    events: [...snapshot.events].sort((left, right) =>
      compareText(left.caseId, right.caseId) || compareText(left.id, right.id)
    ),
    savedViews: [...snapshot.savedViews].sort((left, right) => compareText(left.id, right.id)),
    knowledgeDocuments: [...snapshot.knowledgeDocuments].sort((left, right) => compareText(left.id, right.id)),
    citations: [...snapshot.citations].sort((left, right) =>
      compareText(left.documentId, right.documentId) ||
      left.locator.startLine - right.locator.startLine ||
      left.locator.endLine - right.locator.endLine ||
      compareText(left.id, right.id)
    )
  });
}

/** v0.4's exact nine-partition canonical order and pre-lifecycle subject shape. */
function canonicalSourceRightsFullPayload(
  snapshot: SourceRightsFullBackupPayload
): SourceRightsFullBackupPayload {
  return sourceRightsFullBackupPayloadSchema.parse({
    cases: [...snapshot.cases].sort((left, right) => compareText(left.id, right.id)),
    revisions: [...snapshot.revisions].sort((left, right) =>
      compareText(left.caseId, right.caseId) ||
      left.revisionNumber - right.revisionNumber ||
      compareText(left.id, right.id)
    ),
    candidateSets: [...snapshot.candidateSets].sort((left, right) => compareText(left.id, right.id)),
    researchNotes: [...snapshot.researchNotes].sort((left, right) =>
      compareText(left.caseId, right.caseId) || compareText(left.id, right.id)
    ),
    events: [...snapshot.events].sort((left, right) =>
      compareText(left.caseId, right.caseId) || compareText(left.id, right.id)
    ),
    savedViews: [...snapshot.savedViews].sort((left, right) => compareText(left.id, right.id)),
    knowledgeDocuments: [...snapshot.knowledgeDocuments].sort((left, right) => compareText(left.id, right.id)),
    citations: [...snapshot.citations].sort((left, right) =>
      compareText(left.documentId, right.documentId) ||
      left.locator.startLine - right.locator.startLine ||
      left.locator.endLine - right.locator.endLine ||
      compareText(left.id, right.id)
    ),
    sourceRights: [...snapshot.sourceRights].sort((left, right) => compareText(left.documentId, right.documentId))
  });
}

/** v0.2's exact six-partition canonical order; never extend this after release. */
function canonicalPreviousFullPayload(snapshot: PreviousFullBackupPayload): PreviousFullBackupPayload {
  return previousFullBackupPayloadSchema.parse({
    cases: [...snapshot.cases].sort((left, right) => compareText(left.id, right.id)),
    revisions: [...snapshot.revisions].sort((left, right) =>
      compareText(left.caseId, right.caseId) ||
      left.revisionNumber - right.revisionNumber ||
      compareText(left.id, right.id)
    ),
    candidateSets: [...snapshot.candidateSets].sort((left, right) => compareText(left.id, right.id)),
    researchNotes: [...snapshot.researchNotes].sort((left, right) =>
      compareText(left.caseId, right.caseId) || compareText(left.id, right.id)
    ),
    events: [...snapshot.events].sort((left, right) =>
      compareText(left.caseId, right.caseId) || compareText(left.id, right.id)
    ),
    savedViews: [...snapshot.savedViews].sort((left, right) => compareText(left.id, right.id))
  });
}

/**
 * v0.1 used exactly these five partitions and this ordering. Keep this
 * canonicalizer separate so legacy signatures are never checked with v0.2
 * semantics.
 */
function canonicalLegacyFullPayload(snapshot: LegacyFullBackupPayload): LegacyFullBackupPayload {
  return legacyFullBackupPayloadSchema.parse({
    cases: [...snapshot.cases].sort((left, right) => compareText(left.id, right.id)),
    revisions: [...snapshot.revisions].sort((left, right) =>
      compareText(left.caseId, right.caseId) ||
      left.revisionNumber - right.revisionNumber ||
      compareText(left.id, right.id)
    ),
    researchNotes: [...snapshot.researchNotes].sort((left, right) =>
      compareText(left.caseId, right.caseId) || compareText(left.id, right.id)
    ),
    events: [...snapshot.events].sort((left, right) =>
      compareText(left.caseId, right.caseId) || compareText(left.id, right.id)
    ),
    savedViews: [...snapshot.savedViews].sort((left, right) => compareText(left.id, right.id))
  });
}

export async function recomputeFullBackupDigests(input: {
  manifest: FullBackupManifest;
  payload: FullBackupPayload;
}): Promise<FullBackupDigests> {
  const manifest = fullBackupManifestSchema.parse(input.manifest);
  const payload = canonicalFullPayload(input.payload);
  const cases = await sha256Hex(payload.cases);
  const revisions = await sha256Hex(payload.revisions);
  const candidateSets = await sha256Hex(payload.candidateSets);
  const researchNotes = await sha256Hex(payload.researchNotes);
  const events = await sha256Hex(payload.events);
  const savedViews = await sha256Hex(payload.savedViews);
  const knowledgeDocuments = await sha256Hex(payload.knowledgeDocuments);
  const citations = await sha256Hex(payload.citations);
  const sourceRights = await sha256Hex(payload.sourceRights);
  const attachments = await sha256Hex(payload.attachments);
  const researcherProfiles = await sha256Hex(payload.researcherProfiles);
  const appSettings = await sha256Hex(payload.appSettings);
  const ruleRegistry = await sha256Hex(payload.ruleRegistry);
  const tzdbMigrationReceipts = await sha256Hex(payload.tzdbMigrationReceipts);
  const eventTimeMigrationReceipts = await sha256Hex(payload.eventTimeMigrationReceipts);
  const revisionCalculationReceipts = await sha256Hex(payload.revisionCalculationReceipts);
  const payloadDigest = await sha256Hex(payload);
  const envelope = await sha256Hex({
    manifest,
    digests: {
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
      revisionCalculationReceipts,
      payload: payloadDigest
    },
    payload
  });
  return fullBackupDigestsSchema.parse({
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
    revisionCalculationReceipts,
    payload: payloadDigest,
    envelope
  });
}

/** Recomputes a v1.1 signature with its frozen fifteen-partition semantics. */
export async function recomputeEventTimeMigrationFullBackupDigests(input: {
  manifest: EventTimeMigrationFullBackupManifest;
  payload: EventTimeMigrationFullBackupPayload;
}): Promise<EventTimeMigrationFullBackupDigests> {
  const manifest = eventTimeMigrationFullBackupManifestSchema.parse(input.manifest);
  const payload = canonicalEventTimeMigrationFullPayload(input.payload);
  const cases = await sha256Hex(payload.cases);
  const revisions = await sha256Hex(payload.revisions);
  const candidateSets = await sha256Hex(payload.candidateSets);
  const researchNotes = await sha256Hex(payload.researchNotes);
  const events = await sha256Hex(payload.events);
  const savedViews = await sha256Hex(payload.savedViews);
  const knowledgeDocuments = await sha256Hex(payload.knowledgeDocuments);
  const citations = await sha256Hex(payload.citations);
  const sourceRights = await sha256Hex(payload.sourceRights);
  const attachments = await sha256Hex(payload.attachments);
  const researcherProfiles = await sha256Hex(payload.researcherProfiles);
  const appSettings = await sha256Hex(payload.appSettings);
  const ruleRegistry = await sha256Hex(payload.ruleRegistry);
  const tzdbMigrationReceipts = await sha256Hex(payload.tzdbMigrationReceipts);
  const eventTimeMigrationReceipts = await sha256Hex(payload.eventTimeMigrationReceipts);
  const payloadDigest = await sha256Hex(payload);
  const envelope = await sha256Hex({
    manifest,
    digests: {
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
      payload: payloadDigest
    },
    payload
  });
  return eventTimeMigrationFullBackupDigestsSchema.parse({
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
    payload: payloadDigest,
    envelope
  });
}

/** Recomputes a v1.0 signature with its frozen fourteen-partition semantics. */
export async function recomputeTzdbMigrationFullBackupDigests(input: {
  manifest: TzdbMigrationFullBackupManifest;
  payload: TzdbMigrationFullBackupPayload;
}): Promise<TzdbMigrationFullBackupDigests> {
  const manifest = tzdbMigrationFullBackupManifestSchema.parse(input.manifest);
  const payload = canonicalTzdbMigrationFullPayload(input.payload);
  const cases = await sha256Hex(payload.cases);
  const revisions = await sha256Hex(payload.revisions);
  const candidateSets = await sha256Hex(payload.candidateSets);
  const researchNotes = await sha256Hex(payload.researchNotes);
  const events = await sha256Hex(payload.events);
  const savedViews = await sha256Hex(payload.savedViews);
  const knowledgeDocuments = await sha256Hex(payload.knowledgeDocuments);
  const citations = await sha256Hex(payload.citations);
  const sourceRights = await sha256Hex(payload.sourceRights);
  const attachments = await sha256Hex(payload.attachments);
  const researcherProfiles = await sha256Hex(payload.researcherProfiles);
  const appSettings = await sha256Hex(payload.appSettings);
  const ruleRegistry = await sha256Hex(payload.ruleRegistry);
  const tzdbMigrationReceipts = await sha256Hex(payload.tzdbMigrationReceipts);
  const payloadDigest = await sha256Hex(payload);
  const envelope = await sha256Hex({
    manifest,
    digests: {
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
      payload: payloadDigest
    },
    payload
  });
  return tzdbMigrationFullBackupDigestsSchema.parse({
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
    payload: payloadDigest,
    envelope
  });
}

/** Recomputes a v0.9 signature with its frozen thirteen-partition semantics. */
export async function recomputeRuleRegistryFullBackupDigests(input: {
  manifest: RuleRegistryFullBackupManifest;
  payload: RuleRegistryFullBackupPayload;
}): Promise<RuleRegistryFullBackupDigests> {
  const manifest = ruleRegistryFullBackupManifestSchema.parse(input.manifest);
  const payload = canonicalRuleRegistryFullPayload(input.payload);
  const cases = await sha256Hex(payload.cases);
  const revisions = await sha256Hex(payload.revisions);
  const candidateSets = await sha256Hex(payload.candidateSets);
  const researchNotes = await sha256Hex(payload.researchNotes);
  const events = await sha256Hex(payload.events);
  const savedViews = await sha256Hex(payload.savedViews);
  const knowledgeDocuments = await sha256Hex(payload.knowledgeDocuments);
  const citations = await sha256Hex(payload.citations);
  const sourceRights = await sha256Hex(payload.sourceRights);
  const attachments = await sha256Hex(payload.attachments);
  const researcherProfiles = await sha256Hex(payload.researcherProfiles);
  const appSettings = await sha256Hex(payload.appSettings);
  const ruleRegistry = await sha256Hex(payload.ruleRegistry);
  const payloadDigest = await sha256Hex(payload);
  const envelope = await sha256Hex({
    manifest,
    digests: {
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
      payload: payloadDigest
    },
    payload
  });
  return ruleRegistryFullBackupDigestsSchema.parse({
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
    payload: payloadDigest,
    envelope
  });
}

/** Recomputes a v0.8 signature with its frozen twelve-partition semantics. */
export async function recomputeLocalUserDataFullBackupDigests(input: {
  manifest: LocalUserDataFullBackupManifest;
  payload: LocalUserDataFullBackupPayload;
}): Promise<LocalUserDataFullBackupDigests> {
  const manifest = localUserDataFullBackupManifestSchema.parse(input.manifest);
  const payload = canonicalLocalUserDataFullPayload(input.payload);
  const cases = await sha256Hex(payload.cases);
  const revisions = await sha256Hex(payload.revisions);
  const candidateSets = await sha256Hex(payload.candidateSets);
  const researchNotes = await sha256Hex(payload.researchNotes);
  const events = await sha256Hex(payload.events);
  const savedViews = await sha256Hex(payload.savedViews);
  const knowledgeDocuments = await sha256Hex(payload.knowledgeDocuments);
  const citations = await sha256Hex(payload.citations);
  const sourceRights = await sha256Hex(payload.sourceRights);
  const attachments = await sha256Hex(payload.attachments);
  const researcherProfiles = await sha256Hex(payload.researcherProfiles);
  const appSettings = await sha256Hex(payload.appSettings);
  const payloadDigest = await sha256Hex(payload);
  const envelope = await sha256Hex({
    manifest,
    digests: {
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
      payload: payloadDigest
    },
    payload
  });
  return localUserDataFullBackupDigestsSchema.parse({
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
    payload: payloadDigest,
    envelope
  });
}

/** Recomputes a v0.7 signature with its frozen nine-partition/SavedView-v2 semantics. */
export async function recomputeSavedViewFullBackupDigests(input: {
  manifest: SavedViewFullBackupManifest;
  payload: SavedViewFullBackupPayload;
}): Promise<SavedViewFullBackupDigests> {
  const manifest = savedViewFullBackupManifestSchema.parse(input.manifest);
  const payload = canonicalSavedViewFullPayload(input.payload);
  const cases = await sha256Hex(payload.cases);
  const revisions = await sha256Hex(payload.revisions);
  const candidateSets = await sha256Hex(payload.candidateSets);
  const researchNotes = await sha256Hex(payload.researchNotes);
  const events = await sha256Hex(payload.events);
  const savedViews = await sha256Hex(payload.savedViews);
  const knowledgeDocuments = await sha256Hex(payload.knowledgeDocuments);
  const citations = await sha256Hex(payload.citations);
  const sourceRights = await sha256Hex(payload.sourceRights);
  const payloadDigest = await sha256Hex(payload);
  const envelope = await sha256Hex({
    manifest,
    digests: {
      cases,
      revisions,
      candidateSets,
      researchNotes,
      events,
      savedViews,
      knowledgeDocuments,
      citations,
      sourceRights,
      payload: payloadDigest
    },
    payload
  });
  return savedViewFullBackupDigestsSchema.parse({
    cases,
    revisions,
    candidateSets,
    researchNotes,
    events,
    savedViews,
    knowledgeDocuments,
    citations,
    sourceRights,
    payload: payloadDigest,
    envelope
  });
}

/** Recomputes a v0.6 signature with its frozen Event-v2/SavedView-v1 semantics. */
export async function recomputeEventTimeFullBackupDigests(input: {
  manifest: EventTimeFullBackupManifest;
  payload: EventTimeFullBackupPayload;
}): Promise<EventTimeFullBackupDigests> {
  const manifest = eventTimeFullBackupManifestSchema.parse(input.manifest);
  const payload = canonicalEventTimeFullPayload(input.payload);
  const cases = await sha256Hex(payload.cases);
  const revisions = await sha256Hex(payload.revisions);
  const candidateSets = await sha256Hex(payload.candidateSets);
  const researchNotes = await sha256Hex(payload.researchNotes);
  const events = await sha256Hex(payload.events);
  const savedViews = await sha256Hex(payload.savedViews);
  const knowledgeDocuments = await sha256Hex(payload.knowledgeDocuments);
  const citations = await sha256Hex(payload.citations);
  const sourceRights = await sha256Hex(payload.sourceRights);
  const payloadDigest = await sha256Hex(payload);
  const envelope = await sha256Hex({
    manifest,
    digests: {
      cases,
      revisions,
      candidateSets,
      researchNotes,
      events,
      savedViews,
      knowledgeDocuments,
      citations,
      sourceRights,
      payload: payloadDigest
    },
    payload
  });
  return eventTimeFullBackupDigestsSchema.parse({
    cases,
    revisions,
    candidateSets,
    researchNotes,
    events,
    savedViews,
    knowledgeDocuments,
    citations,
    sourceRights,
    payload: payloadDigest,
    envelope
  });
}

/** Recomputes a v0.5 signature with its frozen lifecycle/Event-v1 semantics. */
export async function recomputeLifecycleFullBackupDigests(input: {
  manifest: LifecycleFullBackupManifest;
  payload: LifecycleFullBackupPayload;
}): Promise<LifecycleFullBackupDigests> {
  const manifest = lifecycleFullBackupManifestSchema.parse(input.manifest);
  const payload = canonicalLifecycleFullPayload(input.payload);
  const cases = await sha256Hex(payload.cases);
  const revisions = await sha256Hex(payload.revisions);
  const candidateSets = await sha256Hex(payload.candidateSets);
  const researchNotes = await sha256Hex(payload.researchNotes);
  const events = await sha256Hex(payload.events);
  const savedViews = await sha256Hex(payload.savedViews);
  const knowledgeDocuments = await sha256Hex(payload.knowledgeDocuments);
  const citations = await sha256Hex(payload.citations);
  const sourceRights = await sha256Hex(payload.sourceRights);
  const payloadDigest = await sha256Hex(payload);
  const envelope = await sha256Hex({
    manifest,
    digests: {
      cases,
      revisions,
      candidateSets,
      researchNotes,
      events,
      savedViews,
      knowledgeDocuments,
      citations,
      sourceRights,
      payload: payloadDigest
    },
    payload
  });
  return lifecycleFullBackupDigestsSchema.parse({
    cases,
    revisions,
    candidateSets,
    researchNotes,
    events,
    savedViews,
    knowledgeDocuments,
    citations,
    sourceRights,
    payload: payloadDigest,
    envelope
  });
}

/** Recomputes a v0.3 signature with v0.3's frozen eight-partition semantics. */
async function recomputeKnowledgeFullBackupDigests(input: {
  manifest: KnowledgeFullBackupManifest;
  payload: KnowledgeFullBackupPayload;
}): Promise<KnowledgeFullBackupDigests> {
  const manifest = knowledgeFullBackupManifestSchema.parse(input.manifest);
  const payload = canonicalKnowledgeFullPayload(input.payload);
  const cases = await sha256Hex(payload.cases);
  const revisions = await sha256Hex(payload.revisions);
  const candidateSets = await sha256Hex(payload.candidateSets);
  const researchNotes = await sha256Hex(payload.researchNotes);
  const events = await sha256Hex(payload.events);
  const savedViews = await sha256Hex(payload.savedViews);
  const knowledgeDocuments = await sha256Hex(payload.knowledgeDocuments);
  const citations = await sha256Hex(payload.citations);
  const payloadDigest = await sha256Hex(payload);
  const envelope = await sha256Hex({
    manifest,
    digests: {
      cases,
      revisions,
      candidateSets,
      researchNotes,
      events,
      savedViews,
      knowledgeDocuments,
      citations,
      payload: payloadDigest
    },
    payload
  });
  return knowledgeFullBackupDigestsSchema.parse({
    cases,
    revisions,
    candidateSets,
    researchNotes,
    events,
    savedViews,
    knowledgeDocuments,
    citations,
    payload: payloadDigest,
    envelope
  });
}

/** Recomputes a v0.4 signature with v0.4's frozen nine-partition semantics. */
export async function recomputeSourceRightsFullBackupDigests(input: {
  manifest: SourceRightsFullBackupManifest;
  payload: SourceRightsFullBackupPayload;
}): Promise<SourceRightsFullBackupDigests> {
  const manifest = sourceRightsFullBackupManifestSchema.parse(input.manifest);
  const payload = canonicalSourceRightsFullPayload(input.payload);
  const cases = await sha256Hex(payload.cases);
  const revisions = await sha256Hex(payload.revisions);
  const candidateSets = await sha256Hex(payload.candidateSets);
  const researchNotes = await sha256Hex(payload.researchNotes);
  const events = await sha256Hex(payload.events);
  const savedViews = await sha256Hex(payload.savedViews);
  const knowledgeDocuments = await sha256Hex(payload.knowledgeDocuments);
  const citations = await sha256Hex(payload.citations);
  const sourceRights = await sha256Hex(payload.sourceRights);
  const payloadDigest = await sha256Hex(payload);
  const envelope = await sha256Hex({
    manifest,
    digests: {
      cases,
      revisions,
      candidateSets,
      researchNotes,
      events,
      savedViews,
      knowledgeDocuments,
      citations,
      sourceRights,
      payload: payloadDigest
    },
    payload
  });
  return sourceRightsFullBackupDigestsSchema.parse({
    cases,
    revisions,
    candidateSets,
    researchNotes,
    events,
    savedViews,
    knowledgeDocuments,
    citations,
    sourceRights,
    payload: payloadDigest,
    envelope
  });
}

/** Recomputes a v0.2 signature with v0.2's frozen six-partition semantics. */
async function recomputePreviousFullBackupDigests(input: {
  manifest: PreviousFullBackupManifest;
  payload: PreviousFullBackupPayload;
}): Promise<PreviousFullBackupDigests> {
  const manifest = previousFullBackupManifestSchema.parse(input.manifest);
  const payload = canonicalPreviousFullPayload(input.payload);
  const cases = await sha256Hex(payload.cases);
  const revisions = await sha256Hex(payload.revisions);
  const candidateSets = await sha256Hex(payload.candidateSets);
  const researchNotes = await sha256Hex(payload.researchNotes);
  const events = await sha256Hex(payload.events);
  const savedViews = await sha256Hex(payload.savedViews);
  const payloadDigest = await sha256Hex(payload);
  const envelope = await sha256Hex({
    manifest,
    digests: { cases, revisions, candidateSets, researchNotes, events, savedViews, payload: payloadDigest },
    payload
  });
  return previousFullBackupDigestsSchema.parse({
    cases,
    revisions,
    candidateSets,
    researchNotes,
    events,
    savedViews,
    payload: payloadDigest,
    envelope
  });
}

async function recomputeLegacyFullBackupDigests(input: {
  manifest: LegacyFullBackupManifest;
  payload: LegacyFullBackupPayload;
}): Promise<LegacyFullBackupDigests> {
  const manifest = legacyFullBackupManifestSchema.parse(input.manifest);
  const payload = canonicalLegacyFullPayload(input.payload);
  const cases = await sha256Hex(payload.cases);
  const revisions = await sha256Hex(payload.revisions);
  const researchNotes = await sha256Hex(payload.researchNotes);
  const events = await sha256Hex(payload.events);
  const savedViews = await sha256Hex(payload.savedViews);
  const payloadDigest = await sha256Hex(payload);
  const envelope = await sha256Hex({
    manifest,
    digests: { cases, revisions, researchNotes, events, savedViews, payload: payloadDigest },
    payload
  });
  return legacyFullBackupDigestsSchema.parse({
    cases,
    revisions,
    researchNotes,
    events,
    savedViews,
    payload: payloadDigest,
    envelope
  });
}

function parseRawFullEnvelope(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw) as unknown;
  } catch (cause) {
    throw new FullBackupError("INVALID_JSON", "Full backup is not valid JSON.", { cause });
  }
}

function readFullManifestForVersionCheck(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new FullBackupError("SCHEMA_INVALID", "Full backup envelope must be an object.");
  }
  const manifest = (raw as Record<string, unknown>).manifest;
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new FullBackupError("SCHEMA_INVALID", "Full backup manifest is missing.");
  }
  return manifest as Record<string, unknown>;
}

function assertSupportedFullVersions(
  raw: unknown
):
  | typeof FULL_BACKUP_FORMAT_VERSION
  | typeof EVENT_TIME_MIGRATION_FULL_BACKUP_FORMAT_VERSION
  | typeof TZDB_MIGRATION_FULL_BACKUP_FORMAT_VERSION
  | typeof RULE_REGISTRY_FULL_BACKUP_FORMAT_VERSION
  | typeof LOCAL_USER_DATA_FULL_BACKUP_FORMAT_VERSION
  | typeof SAVED_VIEW_FULL_BACKUP_FORMAT_VERSION
  | typeof EVENT_TIME_FULL_BACKUP_FORMAT_VERSION
  | typeof LIFECYCLE_FULL_BACKUP_FORMAT_VERSION
  | typeof SOURCE_RIGHTS_FULL_BACKUP_FORMAT_VERSION
  | typeof KNOWLEDGE_FULL_BACKUP_FORMAT_VERSION
  | typeof PREVIOUS_FULL_BACKUP_FORMAT_VERSION
  | typeof LEGACY_FULL_BACKUP_FORMAT_VERSION {
  const manifest = readFullManifestForVersionCheck(raw);
  if (manifest.format !== FULL_BACKUP_FORMAT) {
    throw new FullBackupError("UNSUPPORTED_FORMAT", `Unsupported full-backup format: ${String(manifest.format)}`);
  }
  if (
    manifest.formatVersion !== FULL_BACKUP_FORMAT_VERSION &&
    manifest.formatVersion !== EVENT_TIME_MIGRATION_FULL_BACKUP_FORMAT_VERSION &&
    manifest.formatVersion !== TZDB_MIGRATION_FULL_BACKUP_FORMAT_VERSION &&
    manifest.formatVersion !== RULE_REGISTRY_FULL_BACKUP_FORMAT_VERSION &&
    manifest.formatVersion !== LOCAL_USER_DATA_FULL_BACKUP_FORMAT_VERSION &&
    manifest.formatVersion !== SAVED_VIEW_FULL_BACKUP_FORMAT_VERSION &&
    manifest.formatVersion !== EVENT_TIME_FULL_BACKUP_FORMAT_VERSION &&
    manifest.formatVersion !== LIFECYCLE_FULL_BACKUP_FORMAT_VERSION &&
    manifest.formatVersion !== SOURCE_RIGHTS_FULL_BACKUP_FORMAT_VERSION &&
    manifest.formatVersion !== KNOWLEDGE_FULL_BACKUP_FORMAT_VERSION &&
    manifest.formatVersion !== PREVIOUS_FULL_BACKUP_FORMAT_VERSION &&
    manifest.formatVersion !== LEGACY_FULL_BACKUP_FORMAT_VERSION
  ) {
    throw new FullBackupError(
      "UNSUPPORTED_FORMAT_VERSION",
      `Unsupported full-backup format version: ${String(manifest.formatVersion)}`
    );
  }
  if (manifest.schemaVersion !== BACKUP_DATA_SCHEMA_VERSION_V1) {
    throw new FullBackupError(
      "UNSUPPORTED_SCHEMA_VERSION",
      `Unsupported data schema version: ${String(manifest.schemaVersion)}`
    );
  }
  return manifest.formatVersion;
}

function parseStrictFullEnvelope(raw: unknown): FullBackupEnvelope {
  const result = fullBackupEnvelopeSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .slice(0, 4)
      .map((issue) => `${issue.path.join(".") || "envelope"}: ${issue.message}`)
      .join("; ");
    throw new FullBackupError("SCHEMA_INVALID", `Full-backup schema validation failed: ${details}`);
  }
  return result.data;
}

function parseStrictEventTimeMigrationFullEnvelope(
  raw: unknown
): EventTimeMigrationFullBackupEnvelope {
  const result = eventTimeMigrationFullBackupEnvelopeSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .slice(0, 4)
      .map((issue) => `${issue.path.join(".") || "envelope"}: ${issue.message}`)
      .join("; ");
    throw new FullBackupError(
      "SCHEMA_INVALID",
      `Event-time-migration full-backup schema validation failed: ${details}`
    );
  }
  return result.data;
}

function parseStrictTzdbMigrationFullEnvelope(raw: unknown): TzdbMigrationFullBackupEnvelope {
  const result = tzdbMigrationFullBackupEnvelopeSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .slice(0, 4)
      .map((issue) => `${issue.path.join(".") || "envelope"}: ${issue.message}`)
      .join("; ");
    throw new FullBackupError("SCHEMA_INVALID", `Tzdb-migration full-backup schema validation failed: ${details}`);
  }
  return result.data;
}

function parseStrictRuleRegistryFullEnvelope(raw: unknown): RuleRegistryFullBackupEnvelope {
  const result = ruleRegistryFullBackupEnvelopeSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .slice(0, 4)
      .map((issue) => `${issue.path.join(".") || "envelope"}: ${issue.message}`)
      .join("; ");
    throw new FullBackupError("SCHEMA_INVALID", `Rule-registry full-backup schema validation failed: ${details}`);
  }
  return result.data;
}

function parseStrictLocalUserDataFullEnvelope(raw: unknown): LocalUserDataFullBackupEnvelope {
  const result = localUserDataFullBackupEnvelopeSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .slice(0, 4)
      .map((issue) => `${issue.path.join(".") || "envelope"}: ${issue.message}`)
      .join("; ");
    throw new FullBackupError("SCHEMA_INVALID", `Local-user-data full-backup schema validation failed: ${details}`);
  }
  return result.data;
}

function parseStrictSavedViewFullEnvelope(raw: unknown): SavedViewFullBackupEnvelope {
  const result = savedViewFullBackupEnvelopeSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .slice(0, 4)
      .map((issue) => `${issue.path.join(".") || "envelope"}: ${issue.message}`)
      .join("; ");
    throw new FullBackupError("SCHEMA_INVALID", `Saved-view full-backup schema validation failed: ${details}`);
  }
  return result.data;
}

function parseStrictEventTimeFullEnvelope(raw: unknown): EventTimeFullBackupEnvelope {
  const result = eventTimeFullBackupEnvelopeSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .slice(0, 4)
      .map((issue) => `${issue.path.join(".") || "envelope"}: ${issue.message}`)
      .join("; ");
    throw new FullBackupError("SCHEMA_INVALID", `Event-time full-backup schema validation failed: ${details}`);
  }
  return result.data;
}

function parseStrictLegacyFullEnvelope(raw: unknown): LegacyFullBackupEnvelope {
  const result = legacyFullBackupEnvelopeSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .slice(0, 4)
      .map((issue) => `${issue.path.join(".") || "envelope"}: ${issue.message}`)
      .join("; ");
    throw new FullBackupError("SCHEMA_INVALID", `Legacy full-backup schema validation failed: ${details}`);
  }
  return result.data;
}

function parseStrictPreviousFullEnvelope(raw: unknown): PreviousFullBackupEnvelope {
  const result = previousFullBackupEnvelopeSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .slice(0, 4)
      .map((issue) => `${issue.path.join(".") || "envelope"}: ${issue.message}`)
      .join("; ");
    throw new FullBackupError("SCHEMA_INVALID", `Previous full-backup schema validation failed: ${details}`);
  }
  return result.data;
}

function parseStrictKnowledgeFullEnvelope(raw: unknown): KnowledgeFullBackupEnvelope {
  const result = knowledgeFullBackupEnvelopeSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .slice(0, 4)
      .map((issue) => `${issue.path.join(".") || "envelope"}: ${issue.message}`)
      .join("; ");
    throw new FullBackupError("SCHEMA_INVALID", `Knowledge full-backup schema validation failed: ${details}`);
  }
  return result.data;
}

function parseStrictSourceRightsFullEnvelope(raw: unknown): SourceRightsFullBackupEnvelope {
  const result = sourceRightsFullBackupEnvelopeSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .slice(0, 4)
      .map((issue) => `${issue.path.join(".") || "envelope"}: ${issue.message}`)
      .join("; ");
    throw new FullBackupError("SCHEMA_INVALID", `Source-rights full-backup schema validation failed: ${details}`);
  }
  return result.data;
}

function parseStrictLifecycleFullEnvelope(raw: unknown): LifecycleFullBackupEnvelope {
  const result = lifecycleFullBackupEnvelopeSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .slice(0, 4)
      .map((issue) => `${issue.path.join(".") || "envelope"}: ${issue.message}`)
      .join("; ");
    throw new FullBackupError("SCHEMA_INVALID", `Lifecycle full-backup schema validation failed: ${details}`);
  }
  return result.data;
}

function assertFullCounts(envelope: FullBackupEnvelope): void {
  const actual = {
    cases: envelope.payload.cases.length,
    revisions: envelope.payload.revisions.length,
    candidateSets: envelope.payload.candidateSets.length,
    researchNotes: envelope.payload.researchNotes.length,
    events: envelope.payload.events.length,
    savedViews: envelope.payload.savedViews.length,
    knowledgeDocuments: envelope.payload.knowledgeDocuments.length,
    citations: envelope.payload.citations.length,
    sourceRights: envelope.payload.sourceRights.length,
    attachments: envelope.payload.attachments.length,
    researcherProfiles: envelope.payload.researcherProfiles.length,
    appSettings: envelope.payload.appSettings.length,
    ruleRegistry: envelope.payload.ruleRegistry.length,
    tzdbMigrationReceipts: envelope.payload.tzdbMigrationReceipts.length,
    eventTimeMigrationReceipts: envelope.payload.eventTimeMigrationReceipts.length,
    revisionCalculationReceipts: envelope.payload.revisionCalculationReceipts.length
  };
  for (const partition of Object.keys(actual) as Array<keyof typeof actual>) {
    if (envelope.manifest.counts[partition] !== actual[partition]) {
      throw new FullBackupError(
        "COUNT_MISMATCH",
        `${partition} count mismatch: manifest=${envelope.manifest.counts[partition]}, payload=${actual[partition]}`
      );
    }
  }
}

function assertEventTimeMigrationFullCounts(
  envelope: EventTimeMigrationFullBackupEnvelope
): void {
  const actual = {
    cases: envelope.payload.cases.length,
    revisions: envelope.payload.revisions.length,
    candidateSets: envelope.payload.candidateSets.length,
    researchNotes: envelope.payload.researchNotes.length,
    events: envelope.payload.events.length,
    savedViews: envelope.payload.savedViews.length,
    knowledgeDocuments: envelope.payload.knowledgeDocuments.length,
    citations: envelope.payload.citations.length,
    sourceRights: envelope.payload.sourceRights.length,
    attachments: envelope.payload.attachments.length,
    researcherProfiles: envelope.payload.researcherProfiles.length,
    appSettings: envelope.payload.appSettings.length,
    ruleRegistry: envelope.payload.ruleRegistry.length,
    tzdbMigrationReceipts: envelope.payload.tzdbMigrationReceipts.length,
    eventTimeMigrationReceipts: envelope.payload.eventTimeMigrationReceipts.length
  };
  for (const partition of Object.keys(actual) as Array<keyof typeof actual>) {
    if (envelope.manifest.counts[partition] !== actual[partition]) {
      throw new FullBackupError(
        "COUNT_MISMATCH",
        `Event-time-migration ${partition} count mismatch: manifest=${envelope.manifest.counts[partition]}, payload=${actual[partition]}`
      );
    }
  }
}

function assertTzdbMigrationFullCounts(envelope: TzdbMigrationFullBackupEnvelope): void {
  const actual = {
    cases: envelope.payload.cases.length,
    revisions: envelope.payload.revisions.length,
    candidateSets: envelope.payload.candidateSets.length,
    researchNotes: envelope.payload.researchNotes.length,
    events: envelope.payload.events.length,
    savedViews: envelope.payload.savedViews.length,
    knowledgeDocuments: envelope.payload.knowledgeDocuments.length,
    citations: envelope.payload.citations.length,
    sourceRights: envelope.payload.sourceRights.length,
    attachments: envelope.payload.attachments.length,
    researcherProfiles: envelope.payload.researcherProfiles.length,
    appSettings: envelope.payload.appSettings.length,
    ruleRegistry: envelope.payload.ruleRegistry.length,
    tzdbMigrationReceipts: envelope.payload.tzdbMigrationReceipts.length
  };
  for (const partition of Object.keys(actual) as Array<keyof typeof actual>) {
    if (envelope.manifest.counts[partition] !== actual[partition]) {
      throw new FullBackupError(
        "COUNT_MISMATCH",
        `Tzdb-migration ${partition} count mismatch: manifest=${envelope.manifest.counts[partition]}, payload=${actual[partition]}`
      );
    }
  }
}

function assertRuleRegistryFullCounts(envelope: RuleRegistryFullBackupEnvelope): void {
  const actual = {
    cases: envelope.payload.cases.length,
    revisions: envelope.payload.revisions.length,
    candidateSets: envelope.payload.candidateSets.length,
    researchNotes: envelope.payload.researchNotes.length,
    events: envelope.payload.events.length,
    savedViews: envelope.payload.savedViews.length,
    knowledgeDocuments: envelope.payload.knowledgeDocuments.length,
    citations: envelope.payload.citations.length,
    sourceRights: envelope.payload.sourceRights.length,
    attachments: envelope.payload.attachments.length,
    researcherProfiles: envelope.payload.researcherProfiles.length,
    appSettings: envelope.payload.appSettings.length,
    ruleRegistry: envelope.payload.ruleRegistry.length
  };
  for (const partition of Object.keys(actual) as Array<keyof typeof actual>) {
    if (envelope.manifest.counts[partition] !== actual[partition]) {
      throw new FullBackupError(
        "COUNT_MISMATCH",
        `Rule-registry ${partition} count mismatch: manifest=${envelope.manifest.counts[partition]}, payload=${actual[partition]}`
      );
    }
  }
}

function assertLocalUserDataFullCounts(envelope: LocalUserDataFullBackupEnvelope): void {
  const actual = {
    cases: envelope.payload.cases.length,
    revisions: envelope.payload.revisions.length,
    candidateSets: envelope.payload.candidateSets.length,
    researchNotes: envelope.payload.researchNotes.length,
    events: envelope.payload.events.length,
    savedViews: envelope.payload.savedViews.length,
    knowledgeDocuments: envelope.payload.knowledgeDocuments.length,
    citations: envelope.payload.citations.length,
    sourceRights: envelope.payload.sourceRights.length,
    attachments: envelope.payload.attachments.length,
    researcherProfiles: envelope.payload.researcherProfiles.length,
    appSettings: envelope.payload.appSettings.length
  };
  for (const partition of Object.keys(actual) as Array<keyof typeof actual>) {
    if (envelope.manifest.counts[partition] !== actual[partition]) {
      throw new FullBackupError(
        "COUNT_MISMATCH",
        `Local-user-data ${partition} count mismatch: manifest=${envelope.manifest.counts[partition]}, payload=${actual[partition]}`
      );
    }
  }
}

function assertSavedViewFullCounts(envelope: SavedViewFullBackupEnvelope): void {
  const actual = {
    cases: envelope.payload.cases.length,
    revisions: envelope.payload.revisions.length,
    candidateSets: envelope.payload.candidateSets.length,
    researchNotes: envelope.payload.researchNotes.length,
    events: envelope.payload.events.length,
    savedViews: envelope.payload.savedViews.length,
    knowledgeDocuments: envelope.payload.knowledgeDocuments.length,
    citations: envelope.payload.citations.length,
    sourceRights: envelope.payload.sourceRights.length
  };
  for (const partition of Object.keys(actual) as Array<keyof typeof actual>) {
    if (envelope.manifest.counts[partition] !== actual[partition]) {
      throw new FullBackupError(
        "COUNT_MISMATCH",
        `Saved-view ${partition} count mismatch: manifest=${envelope.manifest.counts[partition]}, payload=${actual[partition]}`
      );
    }
  }
}

function assertEventTimeFullCounts(envelope: EventTimeFullBackupEnvelope): void {
  const actual = {
    cases: envelope.payload.cases.length,
    revisions: envelope.payload.revisions.length,
    candidateSets: envelope.payload.candidateSets.length,
    researchNotes: envelope.payload.researchNotes.length,
    events: envelope.payload.events.length,
    savedViews: envelope.payload.savedViews.length,
    knowledgeDocuments: envelope.payload.knowledgeDocuments.length,
    citations: envelope.payload.citations.length,
    sourceRights: envelope.payload.sourceRights.length
  };
  for (const partition of Object.keys(actual) as Array<keyof typeof actual>) {
    if (envelope.manifest.counts[partition] !== actual[partition]) {
      throw new FullBackupError(
        "COUNT_MISMATCH",
        `Event-time ${partition} count mismatch: manifest=${envelope.manifest.counts[partition]}, payload=${actual[partition]}`
      );
    }
  }
}

function assertLifecycleFullCounts(envelope: LifecycleFullBackupEnvelope): void {
  const actual = {
    cases: envelope.payload.cases.length,
    revisions: envelope.payload.revisions.length,
    candidateSets: envelope.payload.candidateSets.length,
    researchNotes: envelope.payload.researchNotes.length,
    events: envelope.payload.events.length,
    savedViews: envelope.payload.savedViews.length,
    knowledgeDocuments: envelope.payload.knowledgeDocuments.length,
    citations: envelope.payload.citations.length,
    sourceRights: envelope.payload.sourceRights.length
  };
  for (const partition of Object.keys(actual) as Array<keyof typeof actual>) {
    if (envelope.manifest.counts[partition] !== actual[partition]) {
      throw new FullBackupError(
        "COUNT_MISMATCH",
        `Lifecycle ${partition} count mismatch: manifest=${envelope.manifest.counts[partition]}, payload=${actual[partition]}`
      );
    }
  }
}

function assertSourceRightsFullCounts(envelope: SourceRightsFullBackupEnvelope): void {
  const actual = {
    cases: envelope.payload.cases.length,
    revisions: envelope.payload.revisions.length,
    candidateSets: envelope.payload.candidateSets.length,
    researchNotes: envelope.payload.researchNotes.length,
    events: envelope.payload.events.length,
    savedViews: envelope.payload.savedViews.length,
    knowledgeDocuments: envelope.payload.knowledgeDocuments.length,
    citations: envelope.payload.citations.length,
    sourceRights: envelope.payload.sourceRights.length
  };
  for (const partition of Object.keys(actual) as Array<keyof typeof actual>) {
    if (envelope.manifest.counts[partition] !== actual[partition]) {
      throw new FullBackupError(
        "COUNT_MISMATCH",
        `Source-rights ${partition} count mismatch: manifest=${envelope.manifest.counts[partition]}, payload=${actual[partition]}`
      );
    }
  }
}

function assertKnowledgeFullCounts(envelope: KnowledgeFullBackupEnvelope): void {
  const actual = {
    cases: envelope.payload.cases.length,
    revisions: envelope.payload.revisions.length,
    candidateSets: envelope.payload.candidateSets.length,
    researchNotes: envelope.payload.researchNotes.length,
    events: envelope.payload.events.length,
    savedViews: envelope.payload.savedViews.length,
    knowledgeDocuments: envelope.payload.knowledgeDocuments.length,
    citations: envelope.payload.citations.length
  };
  for (const partition of Object.keys(actual) as Array<keyof typeof actual>) {
    if (envelope.manifest.counts[partition] !== actual[partition]) {
      throw new FullBackupError(
        "COUNT_MISMATCH",
        `Knowledge ${partition} count mismatch: manifest=${envelope.manifest.counts[partition]}, payload=${actual[partition]}`
      );
    }
  }
}

function assertPreviousFullCounts(envelope: PreviousFullBackupEnvelope): void {
  const actual = {
    cases: envelope.payload.cases.length,
    revisions: envelope.payload.revisions.length,
    candidateSets: envelope.payload.candidateSets.length,
    researchNotes: envelope.payload.researchNotes.length,
    events: envelope.payload.events.length,
    savedViews: envelope.payload.savedViews.length
  };
  for (const partition of Object.keys(actual) as Array<keyof typeof actual>) {
    if (envelope.manifest.counts[partition] !== actual[partition]) {
      throw new FullBackupError(
        "COUNT_MISMATCH",
        `Previous ${partition} count mismatch: manifest=${envelope.manifest.counts[partition]}, payload=${actual[partition]}`
      );
    }
  }
}

function assertLegacyFullCounts(envelope: LegacyFullBackupEnvelope): void {
  const actual = {
    cases: envelope.payload.cases.length,
    revisions: envelope.payload.revisions.length,
    researchNotes: envelope.payload.researchNotes.length,
    events: envelope.payload.events.length,
    savedViews: envelope.payload.savedViews.length
  };
  for (const partition of Object.keys(actual) as Array<keyof typeof actual>) {
    if (envelope.manifest.counts[partition] !== actual[partition]) {
      throw new FullBackupError(
        "COUNT_MISMATCH",
        `Legacy ${partition} count mismatch: manifest=${envelope.manifest.counts[partition]}, payload=${actual[partition]}`
      );
    }
  }
}

function assertFullDigests(actual: FullBackupDigests, expected: FullBackupDigests): void {
  for (const partition of [
    "cases",
    "revisions",
    "candidateSets",
    "researchNotes",
    "events",
    "savedViews",
    "knowledgeDocuments",
    "citations",
    "sourceRights",
    "attachments",
    "researcherProfiles",
    "appSettings",
    "ruleRegistry",
    "tzdbMigrationReceipts",
    "eventTimeMigrationReceipts",
    "revisionCalculationReceipts",
    "payload",
    "envelope"
  ] as const) {
    if (actual[partition] !== expected[partition]) {
      throw new FullBackupError("DIGEST_MISMATCH", `${partition} digest does not match.`);
    }
  }
}

function assertEventTimeMigrationFullDigests(
  actual: EventTimeMigrationFullBackupDigests,
  expected: EventTimeMigrationFullBackupDigests
): void {
  for (const partition of [
    "cases",
    "revisions",
    "candidateSets",
    "researchNotes",
    "events",
    "savedViews",
    "knowledgeDocuments",
    "citations",
    "sourceRights",
    "attachments",
    "researcherProfiles",
    "appSettings",
    "ruleRegistry",
    "tzdbMigrationReceipts",
    "eventTimeMigrationReceipts",
    "payload",
    "envelope"
  ] as const) {
    if (actual[partition] !== expected[partition]) {
      throw new FullBackupError(
        "DIGEST_MISMATCH",
        `Event-time-migration ${partition} digest does not match.`
      );
    }
  }
}

function assertTzdbMigrationFullDigests(
  actual: TzdbMigrationFullBackupDigests,
  expected: TzdbMigrationFullBackupDigests
): void {
  for (const partition of [
    "cases",
    "revisions",
    "candidateSets",
    "researchNotes",
    "events",
    "savedViews",
    "knowledgeDocuments",
    "citations",
    "sourceRights",
    "attachments",
    "researcherProfiles",
    "appSettings",
    "ruleRegistry",
    "tzdbMigrationReceipts",
    "payload",
    "envelope"
  ] as const) {
    if (actual[partition] !== expected[partition]) {
      throw new FullBackupError("DIGEST_MISMATCH", `Tzdb-migration ${partition} digest does not match.`);
    }
  }
}

function assertRuleRegistryFullDigests(
  actual: RuleRegistryFullBackupDigests,
  expected: RuleRegistryFullBackupDigests
): void {
  for (const partition of [
    "cases",
    "revisions",
    "candidateSets",
    "researchNotes",
    "events",
    "savedViews",
    "knowledgeDocuments",
    "citations",
    "sourceRights",
    "attachments",
    "researcherProfiles",
    "appSettings",
    "ruleRegistry",
    "payload",
    "envelope"
  ] as const) {
    if (actual[partition] !== expected[partition]) {
      throw new FullBackupError("DIGEST_MISMATCH", `Rule-registry ${partition} digest does not match.`);
    }
  }
}

function assertLocalUserDataFullDigests(
  actual: LocalUserDataFullBackupDigests,
  expected: LocalUserDataFullBackupDigests
): void {
  for (const partition of [
    "cases",
    "revisions",
    "candidateSets",
    "researchNotes",
    "events",
    "savedViews",
    "knowledgeDocuments",
    "citations",
    "sourceRights",
    "attachments",
    "researcherProfiles",
    "appSettings",
    "payload",
    "envelope"
  ] as const) {
    if (actual[partition] !== expected[partition]) {
      throw new FullBackupError("DIGEST_MISMATCH", `Local-user-data ${partition} digest does not match.`);
    }
  }
}

function assertSavedViewFullDigests(
  actual: SavedViewFullBackupDigests,
  expected: SavedViewFullBackupDigests
): void {
  for (const partition of [
    "cases",
    "revisions",
    "candidateSets",
    "researchNotes",
    "events",
    "savedViews",
    "knowledgeDocuments",
    "citations",
    "sourceRights",
    "payload",
    "envelope"
  ] as const) {
    if (actual[partition] !== expected[partition]) {
      throw new FullBackupError("DIGEST_MISMATCH", `Saved-view ${partition} digest does not match.`);
    }
  }
}

function assertSourceRightsFullDigests(
  actual: SourceRightsFullBackupDigests,
  expected: SourceRightsFullBackupDigests
): void {
  for (const partition of [
    "cases",
    "revisions",
    "candidateSets",
    "researchNotes",
    "events",
    "savedViews",
    "knowledgeDocuments",
    "citations",
    "sourceRights",
    "payload",
    "envelope"
  ] as const) {
    if (actual[partition] !== expected[partition]) {
      throw new FullBackupError("DIGEST_MISMATCH", `Source-rights ${partition} digest does not match.`);
    }
  }
}

function assertEventTimeFullDigests(
  actual: EventTimeFullBackupDigests,
  expected: EventTimeFullBackupDigests
): void {
  for (const partition of [
    "cases",
    "revisions",
    "candidateSets",
    "researchNotes",
    "events",
    "savedViews",
    "knowledgeDocuments",
    "citations",
    "sourceRights",
    "payload",
    "envelope"
  ] as const) {
    if (actual[partition] !== expected[partition]) {
      throw new FullBackupError("DIGEST_MISMATCH", `Event-time ${partition} digest does not match.`);
    }
  }
}

function assertLifecycleFullDigests(
  actual: LifecycleFullBackupDigests,
  expected: LifecycleFullBackupDigests
): void {
  for (const partition of [
    "cases",
    "revisions",
    "candidateSets",
    "researchNotes",
    "events",
    "savedViews",
    "knowledgeDocuments",
    "citations",
    "sourceRights",
    "payload",
    "envelope"
  ] as const) {
    if (actual[partition] !== expected[partition]) {
      throw new FullBackupError("DIGEST_MISMATCH", `Lifecycle ${partition} digest does not match.`);
    }
  }
}

function assertKnowledgeFullDigests(
  actual: KnowledgeFullBackupDigests,
  expected: KnowledgeFullBackupDigests
): void {
  for (const partition of [
    "cases",
    "revisions",
    "candidateSets",
    "researchNotes",
    "events",
    "savedViews",
    "knowledgeDocuments",
    "citations",
    "payload",
    "envelope"
  ] as const) {
    if (actual[partition] !== expected[partition]) {
      throw new FullBackupError("DIGEST_MISMATCH", `Knowledge ${partition} digest does not match.`);
    }
  }
}

function assertPreviousFullDigests(
  actual: PreviousFullBackupDigests,
  expected: PreviousFullBackupDigests
): void {
  for (const partition of [
    "cases",
    "revisions",
    "candidateSets",
    "researchNotes",
    "events",
    "savedViews",
    "payload",
    "envelope"
  ] as const) {
    if (actual[partition] !== expected[partition]) {
      throw new FullBackupError("DIGEST_MISMATCH", `Previous ${partition} digest does not match.`);
    }
  }
}

function assertLegacyFullDigests(actual: LegacyFullBackupDigests, expected: LegacyFullBackupDigests): void {
  for (const partition of [
    "cases",
    "revisions",
    "researchNotes",
    "events",
    "savedViews",
    "payload",
    "envelope"
  ] as const) {
    if (actual[partition] !== expected[partition]) {
      throw new FullBackupError("DIGEST_MISMATCH", `Legacy ${partition} digest does not match.`);
    }
  }
}

function assertFullUniqueIds(payload: FullBackupPayload): void {
  const allIds = new Map<string, string>();
  const partitions = [
    ["Case", payload.cases],
    ["Revision", payload.revisions],
    ["CandidateSet", payload.candidateSets],
    ["ResearchNote", payload.researchNotes],
    ["Event", payload.events],
    ["SavedView", payload.savedViews],
    ["KnowledgeDocument", payload.knowledgeDocuments],
    ["Citation", payload.citations],
    ["Attachment", payload.attachments],
    ["TzdbMigrationReceipt", payload.tzdbMigrationReceipts],
    ["EventTimeMigrationReceipt", payload.eventTimeMigrationReceipts],
    ["RevisionCalculationReceipt", payload.revisionCalculationReceipts]
  ] as const;
  for (const [partition, records] of partitions) {
    for (const record of records) {
      const previous = allIds.get(record.id);
      if (previous) {
        throw new FullBackupError(
          "DUPLICATE_ID",
          `${partition} ID ${record.id} duplicates an ID from ${previous}.`
        );
      }
      allIds.set(record.id, partition);
    }
  }
}

function assertRuleRegistryRelationships(payload: FullBackupPayload): void {
  const installedByDigest = new Map<string, Extract<FullBackupPayload["ruleRegistry"][number], {
    recordType: "installed_rule_pack";
  }>>();
  const activeRecords = payload.ruleRegistry.filter((record) => record.recordType === "active_rule_pack");
  if (activeRecords.length > 1) {
    throw new FullBackupError(
      "RULE_REGISTRY_RELATIONSHIP_MISMATCH",
      "Rule registry contains more than one active-rule-pack singleton."
    );
  }

  for (const record of payload.ruleRegistry) {
    if (record.recordType !== "installed_rule_pack") continue;
    if (installedByDigest.has(record.packDigest)) {
      throw new FullBackupError(
        "RULE_REGISTRY_RELATIONSHIP_MISMATCH",
        `Rule registry contains duplicate installed digest ${record.packDigest}.`
      );
    }
    installedByDigest.set(record.packDigest, record);
  }

  const active = activeRecords[0];
  if (!active) return;
  const installed = installedByDigest.get(active.activeDigest);
  if (!installed) {
    throw new FullBackupError(
      "RULE_REGISTRY_RELATIONSHIP_MISMATCH",
      `Active rule-pack digest ${active.activeDigest} does not reference an installed record.`
    );
  }
  if (active.activeProfileDigest !== installed.profileDigest) {
    throw new FullBackupError(
      "RULE_REGISTRY_RELATIONSHIP_MISMATCH",
      `Active rule-pack profile digest does not match installed digest ${active.activeDigest}.`
    );
  }
}

async function assertInstalledRulePackIntegrity(payload: FullBackupPayload): Promise<void> {
  for (const record of payload.ruleRegistry) {
    if (record.recordType !== "installed_rule_pack") continue;
    let verified: Awaited<ReturnType<typeof verifyRulePackIntegrity>>;
    try {
      verified = await verifyRulePackIntegrity(record.canonicalJson);
    } catch (cause) {
      throw new FullBackupError(
        "RULE_PACK_INTEGRITY_MISMATCH",
        `Installed rule pack ${record.packDigest} failed declarative-envelope integrity verification.`,
        { cause }
      );
    }
    if (
      verified.canonicalJson !== record.canonicalJson ||
      verified.digest !== record.packDigest ||
      verified.profileDigest !== record.profileDigest ||
      verified.envelope.metadata.packId !== record.packId ||
      verified.envelope.profile.profileId !== record.profileId ||
      verified.envelope.profile.profileVersion !== record.profileVersion
    ) {
      throw new FullBackupError(
        "RULE_PACK_INTEGRITY_MISMATCH",
        `Installed rule pack ${record.packDigest} does not match its canonical envelope identity indexes.`
      );
    }
  }
}

const FORBIDDEN_CITATION_PATH_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);

function hasOwnSafePath(root: unknown, path: string): boolean {
  let current: unknown = root;
  for (const segment of path.split(".")) {
    if (FORBIDDEN_CITATION_PATH_SEGMENTS.has(segment) || (typeof current !== "object" && typeof current !== "function") || current === null) {
      return false;
    }
    if (!Object.prototype.hasOwnProperty.call(current, segment)) return false;
    current = (current as Record<string, unknown>)[segment];
  }
  return true;
}

async function assertTzdbMigrationReceiptRelationships(payload: FullBackupPayload): Promise<void> {
  const candidateSets = new Map(payload.candidateSets.map((record) => [record.id, record]));
  const claimedTargets = new Set<string>();
  const claimedSourceSnapshots = new Set<string>();

  for (const receipt of payload.tzdbMigrationReceipts) {
    const source = candidateSets.get(receipt.source.recordId);
    const target = candidateSets.get(receipt.target.recordId);
    if (!source || !target) {
      throw new FullBackupError(
        "ORPHAN_TZDB_MIGRATION",
        `Tzdb migration receipt ${receipt.id} references a missing source or target CandidateSet.`
      );
    }
    if (claimedTargets.has(target.id)) {
      throw new FullBackupError(
        "TZDB_MIGRATION_CONTEXT_MISMATCH",
        `CandidateSet ${target.id} is claimed as the target of more than one tzdb migration receipt.`
      );
    }
    const sourceSnapshotKey = `${source.id}:${receipt.target.tzdbVersion}`;
    if (claimedSourceSnapshots.has(sourceSnapshotKey)) {
      throw new FullBackupError(
        "TZDB_MIGRATION_CONTEXT_MISMATCH",
        `CandidateSet ${source.id} has duplicate migration receipts for target snapshot ${receipt.target.tzdbVersion}.`
      );
    }
    claimedTargets.add(target.id);
    claimedSourceSnapshots.add(sourceSnapshotKey);

    if (
      receipt.source.snapshotDigest !== source.snapshotDigest ||
      receipt.source.resultHash !== source.candidateSet.resultHash ||
      receipt.source.tzdbVersion !== source.candidateSet.tzdbVersion ||
      receipt.target.snapshotDigest !== target.snapshotDigest ||
      receipt.target.resultHash !== target.candidateSet.resultHash ||
      receipt.target.tzdbVersion !== target.candidateSet.tzdbVersion
    ) {
      throw new FullBackupError(
        "TZDB_MIGRATION_INTEGRITY_MISMATCH",
        `Tzdb migration receipt ${receipt.id} does not match its source or target CandidateSet digests.`
      );
    }
    const targetArtifactStatus = classifyStoredTimeZoneDatabaseForReplay(target.candidateSet);
    if (
      targetArtifactStatus === "legacy_unidentified" ||
      targetArtifactStatus === "artifact_unavailable" ||
      targetArtifactStatus === "descriptor_mismatch"
    ) {
      throw new FullBackupError(
        "TZDB_MIGRATION_CONTEXT_MISMATCH",
        `Tzdb migration receipt ${receipt.id} target artifact is not an exact bundled registry entry: ${targetArtifactStatus}.`
      );
    }

    const sourceContext = {
      input: source.candidateSet.input,
      algorithmId: source.candidateSet.algorithmId,
      probeDefinitionVersion: source.candidateSet.probeDefinitionVersion,
      engine: source.candidateSet.engine,
      ruleProfile: source.candidateSet.ruleProfile,
      ruleProfileDigest: source.candidateSet.ruleProfileDigest,
      rulePackBinding: source.candidateSet.rulePackBinding
    };
    const targetContext = {
      input: target.candidateSet.input,
      algorithmId: target.candidateSet.algorithmId,
      probeDefinitionVersion: target.candidateSet.probeDefinitionVersion,
      engine: target.candidateSet.engine,
      ruleProfile: target.candidateSet.ruleProfile,
      ruleProfileDigest: target.candidateSet.ruleProfileDigest,
      rulePackBinding: target.candidateSet.rulePackBinding
    };
    if (canonicalStringify(sourceContext) !== canonicalStringify(targetContext)) {
      throw new FullBackupError(
        "TZDB_MIGRATION_CONTEXT_MISMATCH",
        `Tzdb migration receipt ${receipt.id} changes non-tzdb calculation context.`
      );
    }

    const expectedComparison = receipt.comparison.formatVersion === "1.0.0"
      ? buildLegacyCandidateSetTzdbComparison(source.candidateSet, target.candidateSet)
      : buildCandidateSetTzdbComparison(source.candidateSet, target.candidateSet);
    if (canonicalStringify(receipt.comparison) !== canonicalStringify(expectedComparison)) {
      throw new FullBackupError(
        "TZDB_MIGRATION_INTEGRITY_MISMATCH",
        `Tzdb migration receipt ${receipt.id} comparison does not reproduce from its bound CandidateSets.`
      );
    }
    if (await sha256Hex(receipt.comparison) !== receipt.comparisonDigest) {
      throw new FullBackupError(
        "TZDB_MIGRATION_INTEGRITY_MISMATCH",
        `Tzdb migration receipt ${receipt.id} comparison digest does not match.`
      );
    }
  }
}

function eventTimeMigrationSnapshotForEvent(record: EventRecord): EventTimeMigrationSnapshot {
  return {
    formatVersion: EVENT_TIME_MIGRATION_SNAPSHOT_FORMAT_VERSION,
    eventRecordVersion: EVENT_RECORD_VERSION,
    caseId: record.caseId,
    revisionId: record.revisionId,
    transitNodeRef: record.transitNodeRef,
    datePrecision: record.datePrecision,
    startDate: record.startDate,
    endDate: record.endDate,
    timeContext: record.timeContext
  };
}

async function assertEventTimeMigrationReceiptRelationships(payload: FullBackupPayload): Promise<void> {
  const events = new Map(payload.events.map((record) => [record.id, record]));
  const claimedSourceInterpretations = new Set<string>();
  const claimedTargets = new Set<string>();

  for (const receipt of payload.eventTimeMigrationReceipts) {
    const source = events.get(receipt.source.recordId);
    const target = events.get(receipt.target.recordId);
    if (!source || !target) {
      throw new FullBackupError(
        "ORPHAN_EVENT_TIME_MIGRATION",
        `Event time migration receipt ${receipt.id} references a missing source or target Event.`
      );
    }
    const sourceInterpretationKey = `${source.id}\u0000${receipt.target.snapshotDigest}`;
    if (claimedSourceInterpretations.has(sourceInterpretationKey)) {
      throw new FullBackupError(
        "EVENT_TIME_MIGRATION_CONTEXT_MISMATCH",
        `Event ${source.id} has duplicate receipts for target interpretation ${receipt.target.snapshotDigest}.`
      );
    }
    if (claimedTargets.has(target.id)) {
      throw new FullBackupError(
        "EVENT_TIME_MIGRATION_CONTEXT_MISMATCH",
        `Event ${target.id} is the target of more than one Event time migration receipt.`
      );
    }
    claimedSourceInterpretations.add(sourceInterpretationKey);
    claimedTargets.add(target.id);

    const sourceSnapshot = eventTimeMigrationSnapshotForEvent(source);
    const targetSnapshot = eventTimeMigrationSnapshotForEvent(target);
    const [sourceSnapshotDigest, targetSnapshotDigest] = await Promise.all([
      sha256Hex(sourceSnapshot),
      sha256Hex(targetSnapshot)
    ]);
    if (
      canonicalStringify(receipt.source.snapshot) !== canonicalStringify(sourceSnapshot) ||
      canonicalStringify(receipt.target.snapshot) !== canonicalStringify(targetSnapshot) ||
      receipt.source.snapshotDigest !== sourceSnapshotDigest ||
      receipt.target.snapshotDigest !== targetSnapshotDigest
    ) {
      throw new FullBackupError(
        "EVENT_TIME_MIGRATION_INTEGRITY_MISMATCH",
        `Event time migration receipt ${receipt.id} does not match its bound Event snapshots.`
      );
    }
    if (target.createdAt !== receipt.createdAt) {
      throw new FullBackupError(
        "EVENT_TIME_MIGRATION_INTEGRITY_MISMATCH",
        `Event time migration receipt ${receipt.id} does not preserve its target creation boundary.`
      );
    }

    if (
      target.timeContext.kind === "zoned_minute" &&
      classifyStoredTimeZoneDatabase(target.timeContext) === "different_snapshot"
    ) {
      const expectedInterpretation = {
        kind: "zoned_minute" as const,
        timeZone: target.timeContext.timeZone,
        startDisambiguation: target.timeContext.start.resolution.policy,
        endDisambiguation: target.timeContext.end?.resolution.policy ?? null
      };
      if (canonicalStringify(receipt.interpretation) !== canonicalStringify(expectedInterpretation)) {
        throw new FullBackupError(
          "EVENT_TIME_MIGRATION_INTEGRITY_MISMATCH",
          `Event time migration receipt ${receipt.id} interpretation does not match its frozen target fields and policies.`
        );
      }
      continue;
    }

    let expectedTargetTimeContext: EventRecord["timeContext"];
    try {
      expectedTargetTimeContext = receipt.interpretation.kind === "calendar_date"
        ? resolveEventTimeContext({
            datePrecision: source.datePrecision,
            startDate: source.startDate,
            endDate: source.endDate
          })
        : resolveEventTimeContext({
            datePrecision: source.datePrecision,
            startDate: source.startDate,
            endDate: source.endDate,
            timeZone: receipt.interpretation.timeZone,
            startDisambiguation: receipt.interpretation.startDisambiguation,
            endDisambiguation: receipt.interpretation.endDisambiguation ?? undefined
          });
    } catch (cause) {
      throw new FullBackupError(
        "EVENT_TIME_MIGRATION_INTEGRITY_MISMATCH",
        `Event time migration receipt ${receipt.id} interpretation cannot be resolved.`,
        { cause }
      );
    }
    if (
      canonicalStringify(target.timeContext) !== canonicalStringify(expectedTargetTimeContext)
    ) {
      throw new FullBackupError(
        "EVENT_TIME_MIGRATION_INTEGRITY_MISMATCH",
        `Event time migration receipt ${receipt.id} target cannot be reproduced from its source interpretation.`
      );
    }
  }
}

async function assertRevisionCalculationReceiptRelationships(
  payload: FullBackupPayload
): Promise<void> {
  if (payload.revisionCalculationReceipts.length === 0) return;
  const replay = await loadRevisionReplayModule();
  const revisions = new Map(payload.revisions.map((record) => [record.id, record]));
  const requestFingerprints = new Set<string>();

  for (const rawReceipt of payload.revisionCalculationReceipts) {
    const revision = revisions.get(rawReceipt.sourceRevision.revisionId);
    if (!revision) {
      throw new FullBackupError(
        "ORPHAN_REVISION_CALCULATION_RECEIPT",
        `Revision calculation receipt ${rawReceipt.id} references a missing Revision.`
      );
    }

    let receipt: Awaited<ReturnType<
      typeof replay.verifyRevisionCalculationReceiptSourceBinding
    >>;
    try {
      receipt = await replay.verifyRevisionCalculationReceiptSourceBinding(rawReceipt, revision);
    } catch (cause) {
      if (
        cause instanceof replay.RevisionCalculationReceiptError &&
        cause.code === "RECEIPT_SOURCE_MISMATCH"
      ) {
        throw new FullBackupError(
          "REVISION_CALCULATION_RECEIPT_CONTEXT_MISMATCH",
          `Revision calculation receipt ${rawReceipt.id} does not match its frozen source Revision.`,
          { cause }
        );
      }
      throw new FullBackupError(
        "REVISION_CALCULATION_RECEIPT_INTEGRITY_MISMATCH",
        `Revision calculation receipt ${rawReceipt.id} failed stored-content integrity verification.`,
        { cause }
      );
    }

    if (requestFingerprints.has(receipt.requestFingerprint)) {
      throw new FullBackupError(
        "DUPLICATE_REVISION_CALCULATION_REQUEST",
        `Revision calculation request ${receipt.requestFingerprint} appears more than once.`
      );
    }
    requestFingerprints.add(receipt.requestFingerprint);
  }
}

async function assertFullRelationships(payload: FullBackupPayload): Promise<void> {
  assertFullUniqueIds(payload);
  assertRuleRegistryRelationships(payload);
  await assertInstalledRulePackIntegrity(payload);
  await assertTzdbMigrationReceiptRelationships(payload);
  await assertEventTimeMigrationReceiptRelationships(payload);
  await assertRevisionCalculationReceiptRelationships(payload);
  for (const savedView of payload.savedViews) {
    if (savedView.state !== "ready") continue;
    const queryDigest = await sha256Hex(savedView.query);
    if (queryDigest !== savedView.queryDigest) {
      throw new FullBackupError(
        "SAVED_VIEW_QUERY_DIGEST_MISMATCH",
        `SavedView ${savedView.id} has a queryDigest that does not match its canonical ResearchQuery.`
      );
    }
  }
  try {
    assertCaseRevisionSummaries(payload);
  } catch (cause) {
    if (cause instanceof CoreBackupError) {
      if (cause.code === "ORPHAN_REVISION") {
        throw new FullBackupError("ORPHAN_REVISION", cause.message, { cause });
      }
      if (cause.code === "REVISION_SEQUENCE_INVALID") {
        throw new FullBackupError("REVISION_SEQUENCE_INVALID", cause.message, { cause });
      }
      if (cause.code === "CASE_REVISION_SUMMARY_MISMATCH") {
        throw new FullBackupError("CASE_REVISION_SUMMARY_MISMATCH", cause.message, { cause });
      }
    }
    throw cause;
  }

  const chartCaseIds = new Set(payload.cases.map((record) => record.id));
  const candidateSetIds = new Set(payload.candidateSets.map((record) => record.id));
  const subjectIds = new Set([...chartCaseIds, ...candidateSetIds]);
  const revisions = new Map(payload.revisions.map((record) => [record.id, record]));
  for (const note of payload.researchNotes) {
    if (!subjectIds.has(note.caseId)) {
      throw new FullBackupError(
        "ORPHAN_RESEARCH_NOTE",
        `ResearchNote ${note.id} references missing research subject ${note.caseId}.`
      );
    }
    if (note.anchor.kind !== "case") {
      const revision = revisions.get(note.anchor.revisionId);
      if (!revision || revision.caseId !== note.caseId) {
        throw new FullBackupError(
          "ORPHAN_RESEARCH_NOTE",
          `ResearchNote ${note.id} has an invalid revision anchor ${note.anchor.revisionId}.`
        );
      }
    }
  }
  for (const event of payload.events) {
    try {
      verifyEventTimeContext({
        datePrecision: event.datePrecision,
        startDate: event.startDate,
        endDate: event.endDate,
        timeContext: event.timeContext
      });
    } catch (cause) {
      throw new FullBackupError(
        "EVENT_TIME_CONTEXT_MISMATCH",
        `Event ${event.id} has a time context that cannot be reproduced from its wall time, IANA zone and DST decision.`,
        { cause }
      );
    }
    if (!subjectIds.has(event.caseId)) {
      throw new FullBackupError("ORPHAN_EVENT", `Event ${event.id} references missing research subject ${event.caseId}.`);
    }
    let revision: RevisionRecord | undefined;
    if (event.revisionId !== null) {
      revision = revisions.get(event.revisionId);
      if (!revision || revision.caseId !== event.caseId) {
        throw new FullBackupError(
          "ORPHAN_EVENT",
          `Event ${event.id} has an invalid Revision ${event.revisionId}.`
        );
      }
    }

    const ref = event.transitNodeRef;
    if (ref?.namespace === "hakimi-transit-node") {
      if (!revision) {
        throw new FullBackupError(
          "TRANSIT_CONTEXT_MISMATCH",
          `Event ${event.id} has a transit node reference that does not match its Revision context.`
        );
      }
      if (
        ref.revisionId !== revision.id ||
        ref.chartResultHash !== revision.manifest.resultHash ||
        ref.ruleProfileDigest !== revision.manifest.ruleProfileDigest ||
        (revision.manifest.luckCycleRuleDigest !== undefined &&
          ref.luckCycleRuleDigest !== revision.manifest.luckCycleRuleDigest)
      ) {
        throw new FullBackupError(
          "TRANSIT_CONTEXT_MISMATCH",
          `Event ${event.id} has a transit node reference whose locked Revision digests do not match.`
        );
      }
      if (revision.manifest.tzdbVersion === LEGACY_UNIDENTIFIED_TZDB_VERSION) {
        // The original browser tzdb is unknowable. Preserve the already signed
        // historical reference, but never replay it under the current 2026c
        // resolver and pretend that the result came from the old environment.
        continue;
      }
      try {
        // A re-signed envelope can still carry a self-consistent forgery. Replay
        // the locked timeline before restore so algorithm, direction, interval
        // identity and nodeId's fact hash all have to match transit-core output.
        await verifyCompatibleTransitNodeRef(revision, ref);
      } catch (cause) {
        throw new FullBackupError(
          "TRANSIT_CONTEXT_MISMATCH",
          `Event ${event.id} has a transit node reference that cannot be reproduced from its Revision.`,
          { cause }
        );
      }
    }
  }

  const documents = new Map(payload.knowledgeDocuments.map((record) => [record.id, record]));
  for (const knowledgeDocument of payload.knowledgeDocuments) {
    try {
      await verifyKnowledgeDocumentIntegrity(knowledgeDocument);
    } catch (cause) {
      if (!(cause instanceof KnowledgeIntegrityError) && !(cause instanceof KnowledgeCoreError)) throw cause;
      const detail = cause instanceof KnowledgeIntegrityError ? cause.mismatch : cause.code;
      throw new FullBackupError(
        "KNOWLEDGE_DOCUMENT_INTEGRITY_MISMATCH",
        `KnowledgeDocument ${knowledgeDocument.id} failed ${detail} verification.`,
        { cause }
      );
    }
  }

  const sourceRightsByDocument = new Map<string, SourceRightsRecord>();
  for (const sourceRights of payload.sourceRights) {
    if (sourceRightsByDocument.has(sourceRights.documentId)) {
      throw new FullBackupError(
        "DUPLICATE_SOURCE_RIGHTS",
        `KnowledgeDocument ${sourceRights.documentId} has more than one SourceRights record.`
      );
    }
    const knowledgeDocument = documents.get(sourceRights.documentId);
    if (!knowledgeDocument) {
      throw new FullBackupError(
        "ORPHAN_SOURCE_RIGHTS",
        `SourceRights references missing KnowledgeDocument ${sourceRights.documentId}.`
      );
    }
    if (sourceRights.documentContentHash !== knowledgeDocument.contentHash) {
      throw new FullBackupError(
        "SOURCE_RIGHTS_CONTENT_HASH_MISMATCH",
        `SourceRights for ${sourceRights.documentId} is bound to a different document content hash.`
      );
    }
    const expectedOrigin = knowledgeDocument.recordType === "user_knowledge_document" ? "user_import" : "bundled";
    if (sourceRights.origin !== expectedOrigin) {
      throw new FullBackupError(
        "SOURCE_RIGHTS_ORIGIN_MISMATCH",
        `SourceRights origin ${sourceRights.origin} does not match ${knowledgeDocument.recordType}.`
      );
    }
    sourceRightsByDocument.set(sourceRights.documentId, sourceRights);
  }
  for (const knowledgeDocument of payload.knowledgeDocuments) {
    if (!sourceRightsByDocument.has(knowledgeDocument.id)) {
      throw new FullBackupError(
        "SOURCE_RIGHTS_NOT_FOUND",
        `KnowledgeDocument ${knowledgeDocument.id} is missing its SourceRights record.`
      );
    }
  }

  const notes = new Set(payload.researchNotes.map((record) => record.id));
  const events = new Set(payload.events.map((record) => record.id));
  for (const attachment of payload.attachments) {
    let bytes: Uint8Array;
    try {
      bytes = decodeCanonicalBase64(attachment.contentBase64);
    } catch (cause) {
      throw new FullBackupError(
        "ATTACHMENT_INTEGRITY_MISMATCH",
        `Attachment ${attachment.id} does not contain canonical Base64 bytes.`,
        { cause }
      );
    }
    if (bytes.byteLength !== attachment.byteLength || await sha256BytesHex(bytes) !== attachment.contentHash) {
      throw new FullBackupError(
        "ATTACHMENT_INTEGRITY_MISMATCH",
        `Attachment ${attachment.id} byte length or content hash does not match its stored bytes.`
      );
    }
    const link = attachment.link;
    if (!link) continue;
    let valid = false;
    if (link.kind === "research_subject") valid = subjectIds.has(link.subjectId);
    else if (link.kind === "revision") {
      const revision = revisions.get(link.revisionId);
      valid = chartCaseIds.has(link.caseId) && Boolean(revision && revision.caseId === link.caseId);
    } else if (link.kind === "research_note") valid = notes.has(link.noteId);
    else if (link.kind === "event") valid = events.has(link.eventId);
    else valid = documents.has(link.documentId);
    if (!valid) {
      throw new FullBackupError(
        "ORPHAN_ATTACHMENT_TARGET",
        `Attachment ${attachment.id} references a missing or mismatched ${link.kind} target.`
      );
    }
  }
  for (const citation of payload.citations) {
    const knowledgeDocument = documents.get(citation.documentId);
    if (!knowledgeDocument) {
      throw new FullBackupError(
        "ORPHAN_CITATION_DOCUMENT",
        `Citation ${citation.id} references missing KnowledgeDocument ${citation.documentId}.`
      );
    }
    try {
      await verifyCitationIntegrity(citation, knowledgeDocument);
    } catch (cause) {
      if (!(cause instanceof KnowledgeIntegrityError) && !(cause instanceof KnowledgeCoreError)) throw cause;
      const detail = cause instanceof KnowledgeIntegrityError ? cause.mismatch : cause.code;
      throw new FullBackupError(
        "CITATION_INTEGRITY_MISMATCH",
        `Citation ${citation.id} failed ${detail} verification.`,
        { cause }
      );
    }

    for (const target of citation.targets) {
      if (target.kind === "research_note") {
        if (!notes.has(target.noteId)) {
          throw new FullBackupError(
            "ORPHAN_CITATION_TARGET",
            `Citation ${citation.id} references missing ResearchNote ${target.noteId}.`
          );
        }
        continue;
      }
      if (target.kind === "event") {
        if (!events.has(target.eventId)) {
          throw new FullBackupError(
            "ORPHAN_CITATION_TARGET",
            `Citation ${citation.id} references missing Event ${target.eventId}.`
          );
        }
        continue;
      }

      if (target.kind === "evidence_subject") {
        try {
          requireEvidenceSubject(target.subjectId);
        } catch (cause) {
          throw new FullBackupError(
            "ORPHAN_CITATION_TARGET",
            `Citation ${citation.id} references unknown evidence subject ${target.subjectId}.`,
            { cause }
          );
        }
        continue;
      }

      const revision = revisions.get(target.revisionId);
      if (!chartCaseIds.has(target.caseId) || !revision || revision.caseId !== target.caseId) {
        throw new FullBackupError(
          "ORPHAN_CITATION_TARGET",
          `Citation ${citation.id} has an invalid chart-field target ${target.caseId}/${target.revisionId}.`
        );
      }
      if (!hasOwnSafePath(revision.facts, target.field)) {
        throw new FullBackupError(
          "ORPHAN_CITATION_TARGET",
          `Citation ${citation.id} references missing or unsafe chart field ${target.field} on Revision ${target.revisionId}.`
        );
      }
    }
  }
}

async function assertCandidateSetSnapshotDigests(
  payload: Pick<FullBackupPayload, "candidateSets">
): Promise<void> {
  for (const record of payload.candidateSets) {
    try {
      await verifyCandidateSetRecordIntegrity(record);
    } catch (cause) {
      if (!(cause instanceof CandidateSetIntegrityError)) throw cause;
      throw new FullBackupError(
        "DIGEST_MISMATCH",
        `CandidateSet ${record.id} has a mismatched ${cause.mismatch} digest.`,
        { cause }
      );
    }
  }
}

async function assertFullRevisionDigests(revisions: RevisionRecord[]): Promise<void> {
  try {
    await Promise.all(revisions.map((revision) => verifyRevisionRecordIntegrity(revision)));
  } catch (cause) {
    if (!(cause instanceof CalculatedChartIntegrityError)) throw cause;
    throw new FullBackupError(
      "DIGEST_MISMATCH",
      `Revision ${cause.chartId} has a mismatched ${cause.mismatch} digest.`,
      { cause }
    );
  }
}

function createMigratedUserSourceRights(
  knowledgeDocument: KnowledgeDocumentRecord
): SourceRightsRecord {
  const timestamp = knowledgeDocument.createdAt;
  return {
    schemaVersion: SCHEMA_VERSION,
    recordType: "knowledge_source_rights",
    documentId: knowledgeDocument.id,
    documentContentHash: knowledgeDocument.contentHash,
    origin: "user_import",
    source: {
      sourceUrl: null,
      publisher: "",
      publicationYear: null,
      acquiredAt: timestamp
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
  };
}

function migrateKnowledgeDocumentV03(document: KnowledgeDocumentV03Record): KnowledgeDocumentRecord {
  const { rightsStatus: _legacyRightsStatus, ...current } = document;
  return current;
}

function migrateCitationV03(citation: CitationV03Record): CitationRecord {
  return {
    ...citation,
    targetKeys: citationTargetKeys(citation.targets),
    reviewAttestations: [],
    decisionNote: ""
  };
}

function migrateLegacyCandidateSetRecord(
  record: PreviousFullBackupPayload["candidateSets"][number]
) {
  return {
    ...record,
    recordVersion: RESEARCH_SUBJECT_RECORD_VERSION,
    favorite: false,
    deletedAt: null
  } as const;
}

function projectKnowledgePayloadForRelationshipChecks(
  payload: KnowledgeFullBackupPayload
): FullBackupPayload {
  const knowledgeDocuments = payload.knowledgeDocuments.map(migrateKnowledgeDocumentV03);
  return {
    cases: payload.cases.map(migrateLegacyCaseRecord),
    revisions: payload.revisions,
    candidateSets: payload.candidateSets.map(migrateLegacyCandidateSetRecord),
    researchNotes: payload.researchNotes,
    events: payload.events.map(migrateLegacyEventRecordV1),
    savedViews: payload.savedViews.map(migrateLegacySavedViewRecordV1),
    knowledgeDocuments,
    citations: payload.citations.map(migrateCitationV03),
    sourceRights: knowledgeDocuments.map(createMigratedUserSourceRights),
    attachments: [],
    researcherProfiles: [],
    appSettings: [],
    ruleRegistry: [],
    tzdbMigrationReceipts: [],
    eventTimeMigrationReceipts: [],
    revisionCalculationReceipts: []
  };
}

async function assertKnowledgeFullRelationships(payload: KnowledgeFullBackupPayload): Promise<void> {
  // This compatibility projection only supplies fields that did not exist in
  // v0.3. The old envelope's exact schema, counts, and signature are checked
  // first; relationship and content checks still operate on its original IDs,
  // hashes, locators, targets, and quotes before a current payload is returned.
  await assertFullRelationships(projectKnowledgePayloadForRelationshipChecks(payload));
}

function migrateLegacyPayload(payload: LegacyFullBackupPayload): FullBackupPayload {
  return canonicalFullPayload({
    cases: payload.cases.map(migrateLegacyCaseRecord),
    revisions: payload.revisions,
    candidateSets: [],
    researchNotes: payload.researchNotes,
    events: payload.events.map(migrateLegacyEventRecordV1),
    savedViews: payload.savedViews.map(migrateLegacySavedViewRecordV1),
    knowledgeDocuments: [],
    citations: [],
    sourceRights: [],
    attachments: [],
    researcherProfiles: [],
    appSettings: [],
    ruleRegistry: [],
    tzdbMigrationReceipts: [],
    eventTimeMigrationReceipts: [],
    revisionCalculationReceipts: []
  });
}

function migratePreviousPayload(payload: PreviousFullBackupPayload): FullBackupPayload {
  return canonicalFullPayload({
    cases: payload.cases.map(migrateLegacyCaseRecord),
    revisions: payload.revisions,
    candidateSets: payload.candidateSets.map(migrateLegacyCandidateSetRecord),
    researchNotes: payload.researchNotes,
    events: payload.events.map(migrateLegacyEventRecordV1),
    savedViews: payload.savedViews.map(migrateLegacySavedViewRecordV1),
    knowledgeDocuments: [],
    citations: [],
    sourceRights: [],
    attachments: [],
    researcherProfiles: [],
    appSettings: [],
    ruleRegistry: [],
    tzdbMigrationReceipts: [],
    eventTimeMigrationReceipts: [],
    revisionCalculationReceipts: []
  });
}

function migrateKnowledgePayload(payload: KnowledgeFullBackupPayload): FullBackupPayload {
  return canonicalFullPayload(projectKnowledgePayloadForRelationshipChecks(payload));
}

function migrateSourceRightsPayload(payload: SourceRightsFullBackupPayload): FullBackupPayload {
  return canonicalFullPayload({
    cases: payload.cases.map(migrateLegacyCaseRecord),
    revisions: payload.revisions,
    candidateSets: payload.candidateSets.map(migrateLegacyCandidateSetRecord),
    researchNotes: payload.researchNotes,
    events: payload.events.map(migrateLegacyEventRecordV1),
    savedViews: payload.savedViews.map(migrateLegacySavedViewRecordV1),
    knowledgeDocuments: payload.knowledgeDocuments,
    citations: payload.citations,
    sourceRights: payload.sourceRights,
    attachments: [],
    researcherProfiles: [],
    appSettings: [],
    ruleRegistry: [],
    tzdbMigrationReceipts: [],
    eventTimeMigrationReceipts: [],
    revisionCalculationReceipts: []
  });
}

function migrateLifecyclePayload(payload: LifecycleFullBackupPayload): FullBackupPayload {
  return canonicalFullPayload({
    cases: payload.cases,
    revisions: payload.revisions,
    candidateSets: payload.candidateSets,
    researchNotes: payload.researchNotes,
    events: payload.events.map(migrateLegacyEventRecordV1),
    savedViews: payload.savedViews.map(migrateLegacySavedViewRecordV1),
    knowledgeDocuments: payload.knowledgeDocuments,
    citations: payload.citations,
    sourceRights: payload.sourceRights,
    attachments: [],
    researcherProfiles: [],
    appSettings: [],
    ruleRegistry: [],
    tzdbMigrationReceipts: [],
    eventTimeMigrationReceipts: [],
    revisionCalculationReceipts: []
  });
}

function migrateEventTimePayload(payload: EventTimeFullBackupPayload): FullBackupPayload {
  return canonicalFullPayload({
    cases: payload.cases,
    revisions: payload.revisions,
    candidateSets: payload.candidateSets,
    researchNotes: payload.researchNotes,
    events: payload.events,
    savedViews: payload.savedViews.map(migrateLegacySavedViewRecordV1),
    knowledgeDocuments: payload.knowledgeDocuments,
    citations: payload.citations,
    sourceRights: payload.sourceRights,
    attachments: [],
    researcherProfiles: [],
    appSettings: [],
    ruleRegistry: [],
    tzdbMigrationReceipts: [],
    eventTimeMigrationReceipts: [],
    revisionCalculationReceipts: []
  });
}

function migrateSavedViewPayload(payload: SavedViewFullBackupPayload): FullBackupPayload {
  return canonicalFullPayload({
    ...payload,
    attachments: [],
    researcherProfiles: [],
    appSettings: [],
    ruleRegistry: [],
    tzdbMigrationReceipts: [],
    eventTimeMigrationReceipts: [],
    revisionCalculationReceipts: []
  });
}

function migrateLocalUserDataPayload(payload: LocalUserDataFullBackupPayload): FullBackupPayload {
  return canonicalFullPayload({
    ...payload,
    ruleRegistry: [],
    tzdbMigrationReceipts: [],
    eventTimeMigrationReceipts: [],
    revisionCalculationReceipts: []
  });
}

function migrateRuleRegistryPayload(payload: RuleRegistryFullBackupPayload): FullBackupPayload {
  return canonicalFullPayload({
    ...payload,
    tzdbMigrationReceipts: [],
    eventTimeMigrationReceipts: [],
    revisionCalculationReceipts: []
  });
}

function migrateTzdbMigrationPayload(payload: TzdbMigrationFullBackupPayload): FullBackupPayload {
  return canonicalFullPayload({
    ...payload,
    eventTimeMigrationReceipts: [],
    revisionCalculationReceipts: []
  });
}

function migrateEventTimeMigrationPayload(
  payload: EventTimeMigrationFullBackupPayload
): FullBackupPayload {
  return canonicalFullPayload({
    ...payload,
    revisionCalculationReceipts: []
  });
}

function currentFullCounts(payload: FullBackupPayload): FullBackupManifest["counts"] {
  return {
    cases: payload.cases.length,
    revisions: payload.revisions.length,
    candidateSets: payload.candidateSets.length,
    researchNotes: payload.researchNotes.length,
    events: payload.events.length,
    savedViews: payload.savedViews.length,
    knowledgeDocuments: payload.knowledgeDocuments.length,
    citations: payload.citations.length,
    sourceRights: payload.sourceRights.length,
    attachments: payload.attachments.length,
    researcherProfiles: payload.researcherProfiles.length,
    appSettings: payload.appSettings.length,
    ruleRegistry: payload.ruleRegistry.length,
    tzdbMigrationReceipts: payload.tzdbMigrationReceipts.length,
    eventTimeMigrationReceipts: payload.eventTimeMigrationReceipts.length,
    revisionCalculationReceipts: payload.revisionCalculationReceipts.length
  };
}

async function migrateVerifiedLegacyFullBackup(
  envelope: LegacyFullBackupEnvelope
): Promise<FullBackupPreflightResult> {
  assertLegacyFullCounts(envelope);
  const legacyPayload = canonicalLegacyFullPayload(envelope.payload);
  const legacyDigests = await recomputeLegacyFullBackupDigests({
    manifest: envelope.manifest,
    payload: legacyPayload
  });
  assertLegacyFullDigests(envelope.digests, legacyDigests);

  // Relationship checks intentionally happen only after v0.1's exact five-partition
  // signature has been verified, and before the migrated current envelope is produced.
  const payload = migrateLegacyPayload(legacyPayload);
  await assertFullRevisionDigests(payload.revisions);
  await assertFullRelationships(payload);
  const manifest = fullBackupManifestSchema.parse({
    ...envelope.manifest,
    formatVersion: FULL_BACKUP_FORMAT_VERSION,
    counts: currentFullCounts(payload)
  });
  const digests = await recomputeFullBackupDigests({ manifest, payload });
  return {
    scope: FULL_BACKUP_SCOPE,
    manifest,
    payload,
    digests,
    migratedFromFormatVersion: LEGACY_FULL_BACKUP_FORMAT_VERSION,
    remainingP111Gaps: FULL_BACKUP_P1_11_REMAINING_GAPS
  };
}

async function migrateVerifiedPreviousFullBackup(
  envelope: PreviousFullBackupEnvelope
): Promise<FullBackupPreflightResult> {
  assertPreviousFullCounts(envelope);
  const previousPayload = canonicalPreviousFullPayload(envelope.payload);
  const previousDigests = await recomputePreviousFullBackupDigests({
    manifest: envelope.manifest,
    payload: previousPayload
  });
  assertPreviousFullDigests(envelope.digests, previousDigests);

  // Do not add v0.3's empty partitions until the exact v0.2 envelope has passed
  // its own schema, count and digest checks.
  const payload = migratePreviousPayload(previousPayload);
  await assertCandidateSetSnapshotDigests(payload);
  await assertFullRevisionDigests(payload.revisions);
  await assertFullRelationships(payload);
  const manifest = fullBackupManifestSchema.parse({
    ...envelope.manifest,
    formatVersion: FULL_BACKUP_FORMAT_VERSION,
    counts: currentFullCounts(payload)
  });
  const digests = await recomputeFullBackupDigests({ manifest, payload });
  return {
    scope: FULL_BACKUP_SCOPE,
    manifest,
    payload,
    digests,
    migratedFromFormatVersion: PREVIOUS_FULL_BACKUP_FORMAT_VERSION,
    remainingP111Gaps: FULL_BACKUP_P1_11_REMAINING_GAPS
  };
}

async function migrateVerifiedKnowledgeFullBackup(
  envelope: KnowledgeFullBackupEnvelope
): Promise<FullBackupPreflightResult> {
  assertKnowledgeFullCounts(envelope);
  const knowledgePayload = canonicalKnowledgeFullPayload(envelope.payload);
  const knowledgeDigests = await recomputeKnowledgeFullBackupDigests({
    manifest: envelope.manifest,
    payload: knowledgePayload
  });
  assertKnowledgeFullDigests(envelope.digests, knowledgeDigests);

  // Never accept v0.3 by merely parsing it as today's shape. Its frozen eight
  // partitions are signed and relationship-checked before the deterministic
  // addition of citation review metadata and conservative local-only rights.
  await assertFullRevisionDigests(knowledgePayload.revisions);
  await assertKnowledgeFullRelationships(knowledgePayload);
  const payload = migrateKnowledgePayload(knowledgePayload);
  await assertCandidateSetSnapshotDigests(payload);
  const manifest = fullBackupManifestSchema.parse({
    ...envelope.manifest,
    formatVersion: FULL_BACKUP_FORMAT_VERSION,
    counts: currentFullCounts(payload)
  });
  const digests = await recomputeFullBackupDigests({ manifest, payload });
  return {
    scope: FULL_BACKUP_SCOPE,
    manifest,
    payload,
    digests,
    migratedFromFormatVersion: KNOWLEDGE_FULL_BACKUP_FORMAT_VERSION,
    remainingP111Gaps: FULL_BACKUP_P1_11_REMAINING_GAPS
  };
}

async function migrateVerifiedSourceRightsFullBackup(
  envelope: SourceRightsFullBackupEnvelope
): Promise<FullBackupPreflightResult> {
  assertSourceRightsFullCounts(envelope);
  const sourceRightsPayload = canonicalSourceRightsFullPayload(envelope.payload);
  const sourceRightsDigests = await recomputeSourceRightsFullBackupDigests({
    manifest: envelope.manifest,
    payload: sourceRightsPayload
  });
  assertSourceRightsFullDigests(envelope.digests, sourceRightsDigests);

  // The v0.4 shape and signature are verified before lifecycle defaults are introduced.
  const payload = migrateSourceRightsPayload(sourceRightsPayload);
  await assertCandidateSetSnapshotDigests(payload);
  await assertFullRevisionDigests(payload.revisions);
  await assertFullRelationships(payload);
  const manifest = fullBackupManifestSchema.parse({
    ...envelope.manifest,
    formatVersion: FULL_BACKUP_FORMAT_VERSION,
    counts: currentFullCounts(payload)
  });
  const digests = await recomputeFullBackupDigests({ manifest, payload });
  return {
    scope: FULL_BACKUP_SCOPE,
    manifest,
    payload,
    digests,
    migratedFromFormatVersion: SOURCE_RIGHTS_FULL_BACKUP_FORMAT_VERSION,
    remainingP111Gaps: FULL_BACKUP_P1_11_REMAINING_GAPS
  };
}

async function migrateVerifiedLifecycleFullBackup(
  envelope: LifecycleFullBackupEnvelope
): Promise<FullBackupPreflightResult> {
  assertLifecycleFullCounts(envelope);
  const lifecyclePayload = canonicalLifecycleFullPayload(envelope.payload);
  const lifecycleDigests = await recomputeLifecycleFullBackupDigests({
    manifest: envelope.manifest,
    payload: lifecyclePayload
  });
  assertLifecycleFullDigests(envelope.digests, lifecycleDigests);

  // v0.5 already had lifecycle-safe subjects and all nine partitions, but its
  // Event records predate recordVersion/timeContext. Never infer a zone while
  // adding the explicit legacy_floating marker after its old signature passes.
  const payload = migrateLifecyclePayload(lifecyclePayload);
  await assertCandidateSetSnapshotDigests(payload);
  await assertFullRevisionDigests(payload.revisions);
  await assertFullRelationships(payload);
  const manifest = fullBackupManifestSchema.parse({
    ...envelope.manifest,
    formatVersion: FULL_BACKUP_FORMAT_VERSION,
    counts: currentFullCounts(payload)
  });
  const digests = await recomputeFullBackupDigests({ manifest, payload });
  return {
    scope: FULL_BACKUP_SCOPE,
    manifest,
    payload,
    digests,
    migratedFromFormatVersion: LIFECYCLE_FULL_BACKUP_FORMAT_VERSION,
    remainingP111Gaps: FULL_BACKUP_P1_11_REMAINING_GAPS
  };
}

async function migrateVerifiedEventTimeFullBackup(
  envelope: EventTimeFullBackupEnvelope
): Promise<FullBackupPreflightResult> {
  assertEventTimeFullCounts(envelope);
  const eventTimePayload = canonicalEventTimeFullPayload(envelope.payload);
  const eventTimeDigests = await recomputeEventTimeFullBackupDigests({
    manifest: envelope.manifest,
    payload: eventTimePayload
  });
  assertEventTimeFullDigests(envelope.digests, eventTimeDigests);

  // The exact v0.6 schema, counts and signature are verified before legacy SavedView v1
  // records are losslessly wrapped as non-executable migration_required records.
  const payload = migrateEventTimePayload(eventTimePayload);
  await assertCandidateSetSnapshotDigests(payload);
  await assertFullRevisionDigests(payload.revisions);
  await assertFullRelationships(payload);
  const manifest = fullBackupManifestSchema.parse({
    ...envelope.manifest,
    formatVersion: FULL_BACKUP_FORMAT_VERSION,
    counts: currentFullCounts(payload)
  });
  const digests = await recomputeFullBackupDigests({ manifest, payload });
  return {
    scope: FULL_BACKUP_SCOPE,
    manifest,
    payload,
    digests,
    migratedFromFormatVersion: EVENT_TIME_FULL_BACKUP_FORMAT_VERSION,
    remainingP111Gaps: FULL_BACKUP_P1_11_REMAINING_GAPS
  };
}

async function migrateVerifiedSavedViewFullBackup(
  envelope: SavedViewFullBackupEnvelope
): Promise<FullBackupPreflightResult> {
  assertSavedViewFullCounts(envelope);
  const savedViewPayload = canonicalSavedViewFullPayload(envelope.payload);
  const savedViewDigests = await recomputeSavedViewFullBackupDigests({
    manifest: envelope.manifest,
    payload: savedViewPayload
  });
  assertSavedViewFullDigests(envelope.digests, savedViewDigests);

  // v0.7 is verified with its frozen nine-partition envelope before the three
  // v0.8 local-data partitions and v0.9 rule registry are introduced as empty arrays.
  const payload = migrateSavedViewPayload(savedViewPayload);
  await assertCandidateSetSnapshotDigests(payload);
  await assertFullRevisionDigests(payload.revisions);
  await assertFullRelationships(payload);
  const manifest = fullBackupManifestSchema.parse({
    ...envelope.manifest,
    formatVersion: FULL_BACKUP_FORMAT_VERSION,
    counts: currentFullCounts(payload)
  });
  const digests = await recomputeFullBackupDigests({ manifest, payload });
  return {
    scope: FULL_BACKUP_SCOPE,
    manifest,
    payload,
    digests,
    migratedFromFormatVersion: SAVED_VIEW_FULL_BACKUP_FORMAT_VERSION,
    remainingP111Gaps: FULL_BACKUP_P1_11_REMAINING_GAPS
  };
}

async function migrateVerifiedLocalUserDataFullBackup(
  envelope: LocalUserDataFullBackupEnvelope
): Promise<FullBackupPreflightResult> {
  assertLocalUserDataFullCounts(envelope);
  const localUserDataPayload = canonicalLocalUserDataFullPayload(envelope.payload);
  const localUserDataDigests = await recomputeLocalUserDataFullBackupDigests({
    manifest: envelope.manifest,
    payload: localUserDataPayload
  });
  assertLocalUserDataFullDigests(envelope.digests, localUserDataDigests);

  // Verify the exact v0.8 twelve-partition signature before introducing the
  // v0.9 rule registry as an empty, deterministic partition.
  const payload = migrateLocalUserDataPayload(localUserDataPayload);
  await assertCandidateSetSnapshotDigests(payload);
  await assertFullRevisionDigests(payload.revisions);
  await assertFullRelationships(payload);
  const manifest = fullBackupManifestSchema.parse({
    ...envelope.manifest,
    formatVersion: FULL_BACKUP_FORMAT_VERSION,
    counts: currentFullCounts(payload)
  });
  const digests = await recomputeFullBackupDigests({ manifest, payload });
  return {
    scope: FULL_BACKUP_SCOPE,
    manifest,
    payload,
    digests,
    migratedFromFormatVersion: LOCAL_USER_DATA_FULL_BACKUP_FORMAT_VERSION,
    remainingP111Gaps: FULL_BACKUP_P1_11_REMAINING_GAPS
  };
}

async function migrateVerifiedRuleRegistryFullBackup(
  envelope: RuleRegistryFullBackupEnvelope
): Promise<FullBackupPreflightResult> {
  assertRuleRegistryFullCounts(envelope);
  const ruleRegistryPayload = canonicalRuleRegistryFullPayload(envelope.payload);
  const ruleRegistryDigests = await recomputeRuleRegistryFullBackupDigests({
    manifest: envelope.manifest,
    payload: ruleRegistryPayload
  });
  assertRuleRegistryFullDigests(envelope.digests, ruleRegistryDigests);

  // v0.9 is verified byte-for-byte before the new append-only migration ledger
  // is introduced as an empty partition. No historical relationship is inferred.
  const payload = migrateRuleRegistryPayload(ruleRegistryPayload);
  await assertCandidateSetSnapshotDigests(payload);
  await assertFullRevisionDigests(payload.revisions);
  await assertFullRelationships(payload);
  const manifest = fullBackupManifestSchema.parse({
    ...envelope.manifest,
    formatVersion: FULL_BACKUP_FORMAT_VERSION,
    counts: currentFullCounts(payload)
  });
  const digests = await recomputeFullBackupDigests({ manifest, payload });
  return {
    scope: FULL_BACKUP_SCOPE,
    manifest,
    payload,
    digests,
    migratedFromFormatVersion: RULE_REGISTRY_FULL_BACKUP_FORMAT_VERSION,
    remainingP111Gaps: FULL_BACKUP_P1_11_REMAINING_GAPS
  };
}

async function migrateVerifiedTzdbMigrationFullBackup(
  envelope: TzdbMigrationFullBackupEnvelope
): Promise<FullBackupPreflightResult> {
  assertTzdbMigrationFullCounts(envelope);
  const tzdbMigrationPayload = canonicalTzdbMigrationFullPayload(envelope.payload);
  const tzdbMigrationDigests = await recomputeTzdbMigrationFullBackupDigests({
    manifest: envelope.manifest,
    payload: tzdbMigrationPayload
  });
  assertTzdbMigrationFullDigests(envelope.digests, tzdbMigrationDigests);

  // v1.0's strict fourteen-partition schema, counts and signature pass before
  // the new Event receipt ledger is introduced as an empty partition. Existing
  // CandidateSet receipts and every old relationship remain fully verified.
  const payload = migrateTzdbMigrationPayload(tzdbMigrationPayload);
  await assertCandidateSetSnapshotDigests(payload);
  await assertFullRevisionDigests(payload.revisions);
  await assertFullRelationships(payload);
  const manifest = fullBackupManifestSchema.parse({
    ...envelope.manifest,
    formatVersion: FULL_BACKUP_FORMAT_VERSION,
    counts: currentFullCounts(payload)
  });
  const digests = await recomputeFullBackupDigests({ manifest, payload });
  return {
    scope: FULL_BACKUP_SCOPE,
    manifest,
    payload,
    digests,
    migratedFromFormatVersion: TZDB_MIGRATION_FULL_BACKUP_FORMAT_VERSION,
    remainingP111Gaps: FULL_BACKUP_P1_11_REMAINING_GAPS
  };
}

async function migrateVerifiedEventTimeMigrationFullBackup(
  envelope: EventTimeMigrationFullBackupEnvelope
): Promise<FullBackupPreflightResult> {
  assertEventTimeMigrationFullCounts(envelope);
  const legacyPayload = canonicalEventTimeMigrationFullPayload(envelope.payload);
  const legacyDigests = await recomputeEventTimeMigrationFullBackupDigests({
    manifest: envelope.manifest,
    payload: legacyPayload
  });
  assertEventTimeMigrationFullDigests(envelope.digests, legacyDigests);

  // Verify v1.1's exact fifteen-partition signature and relationships before
  // introducing the empty Revision calculation-receipt ledger. Historical
  // Revisions are never backfilled or reinterpreted during this migration.
  const payload = migrateEventTimeMigrationPayload(legacyPayload);
  await assertCandidateSetSnapshotDigests(payload);
  await assertFullRevisionDigests(payload.revisions);
  await assertFullRelationships(payload);
  const manifest = fullBackupManifestSchema.parse({
    ...envelope.manifest,
    formatVersion: FULL_BACKUP_FORMAT_VERSION,
    counts: currentFullCounts(payload)
  });
  const digests = await recomputeFullBackupDigests({ manifest, payload });
  return {
    scope: FULL_BACKUP_SCOPE,
    manifest,
    payload,
    digests,
    migratedFromFormatVersion: EVENT_TIME_MIGRATION_FULL_BACKUP_FORMAT_VERSION,
    remainingP111Gaps: FULL_BACKUP_P1_11_REMAINING_GAPS
  };
}

export async function preflightFullBackup(rawInput: unknown): Promise<FullBackupPreflightResult> {
  const raw = parseRawFullEnvelope(rawInput);
  const formatVersion = assertSupportedFullVersions(raw);
  if (formatVersion === EVENT_TIME_MIGRATION_FULL_BACKUP_FORMAT_VERSION) {
    return migrateVerifiedEventTimeMigrationFullBackup(
      parseStrictEventTimeMigrationFullEnvelope(raw)
    );
  }
  if (formatVersion === TZDB_MIGRATION_FULL_BACKUP_FORMAT_VERSION) {
    return migrateVerifiedTzdbMigrationFullBackup(parseStrictTzdbMigrationFullEnvelope(raw));
  }
  if (formatVersion === RULE_REGISTRY_FULL_BACKUP_FORMAT_VERSION) {
    return migrateVerifiedRuleRegistryFullBackup(parseStrictRuleRegistryFullEnvelope(raw));
  }
  if (formatVersion === LOCAL_USER_DATA_FULL_BACKUP_FORMAT_VERSION) {
    return migrateVerifiedLocalUserDataFullBackup(parseStrictLocalUserDataFullEnvelope(raw));
  }
  if (formatVersion === SAVED_VIEW_FULL_BACKUP_FORMAT_VERSION) {
    return migrateVerifiedSavedViewFullBackup(parseStrictSavedViewFullEnvelope(raw));
  }
  if (formatVersion === LEGACY_FULL_BACKUP_FORMAT_VERSION) {
    return migrateVerifiedLegacyFullBackup(parseStrictLegacyFullEnvelope(raw));
  }
  if (formatVersion === PREVIOUS_FULL_BACKUP_FORMAT_VERSION) {
    return migrateVerifiedPreviousFullBackup(parseStrictPreviousFullEnvelope(raw));
  }
  if (formatVersion === KNOWLEDGE_FULL_BACKUP_FORMAT_VERSION) {
    return migrateVerifiedKnowledgeFullBackup(parseStrictKnowledgeFullEnvelope(raw));
  }
  if (formatVersion === SOURCE_RIGHTS_FULL_BACKUP_FORMAT_VERSION) {
    return migrateVerifiedSourceRightsFullBackup(parseStrictSourceRightsFullEnvelope(raw));
  }
  if (formatVersion === LIFECYCLE_FULL_BACKUP_FORMAT_VERSION) {
    return migrateVerifiedLifecycleFullBackup(parseStrictLifecycleFullEnvelope(raw));
  }
  if (formatVersion === EVENT_TIME_FULL_BACKUP_FORMAT_VERSION) {
    return migrateVerifiedEventTimeFullBackup(parseStrictEventTimeFullEnvelope(raw));
  }
  const envelope = parseStrictFullEnvelope(raw);
  assertFullCounts(envelope);
  const payload = canonicalFullPayload(envelope.payload);
  const recomputed = await recomputeFullBackupDigests({ manifest: envelope.manifest, payload });
  assertFullDigests(envelope.digests, recomputed);
  await assertCandidateSetSnapshotDigests(payload);
  await assertFullRevisionDigests(payload.revisions);
  await assertFullRelationships(payload);
  return {
    scope: FULL_BACKUP_SCOPE,
    manifest: envelope.manifest,
    payload,
    digests: recomputed,
    migratedFromFormatVersion: null,
    remainingP111Gaps: FULL_BACKUP_P1_11_REMAINING_GAPS
  };
}

export async function createFullBackupFromSnapshot(
  snapshot: FullBackupPayload,
  options: CreateFullBackupOptions
): Promise<FullBackupEnvelope> {
  const payload = canonicalFullPayload(snapshot);
  await assertCandidateSetSnapshotDigests(payload);
  await assertFullRevisionDigests(payload.revisions);
  await assertFullRelationships(payload);
  const manifest = fullBackupManifestSchema.parse({
    format: FULL_BACKUP_FORMAT,
    formatVersion: FULL_BACKUP_FORMAT_VERSION,
    schemaVersion: BACKUP_DATA_SCHEMA_VERSION_V1,
    scope: FULL_BACKUP_SCOPE,
    appVersion: options.appVersion,
    exportedAt: options.exportedAt ?? new Date().toISOString(),
    digestAlgorithm: FULL_BACKUP_DIGEST_ALGORITHM,
    counts: currentFullCounts(payload)
  });
  const digests = await recomputeFullBackupDigests({ manifest, payload });
  return fullBackupEnvelopeSchema.parse({ manifest, digests, payload });
}

export async function createFullBackup(
  repository: CaseRepository,
  options: CreateFullBackupOptions
): Promise<FullBackupEnvelope> {
  return createFullBackupFromSnapshot(await repository.readFullDataSnapshot(), options);
}

export function serializeFullBackup(envelope: FullBackupEnvelope): string {
  const parsed = fullBackupEnvelopeSchema.parse(envelope);
  return canonicalStringify({ ...parsed, payload: canonicalFullPayload(parsed.payload) });
}

export function createFullBackupArchive(envelope: FullBackupEnvelope): Uint8Array {
  return createFullBackupArchiveFromJson(serializeFullBackup(envelope));
}

export type DecodedFullBackupFile = {
  json: string;
  container: "zip" | "json";
  jsonByteLength: number;
};

/**
 * Decodes the current ZIP container or strict UTF-8 compatibility JSON without
 * parsing the envelope. Browser callers run this inside the disposable backup
 * Worker so inflation and UTF-8 decoding cannot monopolize the UI thread.
 */
export function decodeFullBackupFile(input: string | Uint8Array): DecodedFullBackupFile {
  if (typeof input === "string") {
    return {
      json: input,
      container: "json",
      jsonByteLength: new TextEncoder().encode(input).byteLength
    };
  }
  if (looksLikeZip(input)) {
    const json = readFullBackupArchiveJson(input);
    return {
      json,
      container: "zip",
      jsonByteLength: new TextEncoder().encode(json).byteLength
    };
  }
  if (input.byteLength > DEFAULT_MAX_FULL_BACKUP_JSON_BYTES) {
    throw new FullBackupArchiveError(
      "ARCHIVE_CONTENT_TOO_LARGE",
      `备份 JSON 超过 ${Math.round(DEFAULT_MAX_FULL_BACKUP_JSON_BYTES / 1024 / 1024)} MB 安全上限。`
    );
  }
  try {
    return {
      json: new TextDecoder("utf-8", { fatal: true }).decode(input),
      container: "json",
      jsonByteLength: input.byteLength
    };
  } catch (cause) {
    throw new FullBackupArchiveError("ARCHIVE_CONTENT_INVALID", "备份 JSON 不是严格 UTF-8。", {
      cause
    });
  }
}

/** Accepts either the current ZIP container or a backward-compatible JSON envelope. */
export async function preflightFullBackupFile(
  input: string | Uint8Array
): Promise<FullBackupPreflightResult> {
  return preflightFullBackup(decodeFullBackupFile(input).json);
}

/**
 * Performs every read-only check and captures the exact data that would be replaced.
 * UI callers should download currentSafetyBackup, then pass this preparation to
 * applyPreparedFullBackup only after the user confirms the destructive restore.
 */
export async function prepareFullBackupImport(
  repository: CaseRepository,
  rawInput: unknown,
  options: CreateFullBackupOptions
): Promise<FullBackupImportPreparation> {
  const incoming = await preflightFullBackup(rawInput);
  const currentSafetyBackup = await createFullBackup(repository, options);
  return { incoming, currentSafetyBackup };
}

/** File-oriented preflight used by Web and the future Android file adapter. */
export async function prepareFullBackupFileImport(
  repository: CaseRepository,
  input: string | Uint8Array,
  options: CreateFullBackupOptions
): Promise<FullBackupImportPreparation> {
  return prepareFullBackupImport(repository, decodeFullBackupFile(input).json, options);
}

export async function verifyPreparedFullBackup(
  preparation: FullBackupImportPreparation
): Promise<VerifiedFullBackupReplacement> {
  const verifiedIncoming = await preflightFullBackup({
    manifest: preparation.incoming.manifest,
    digests: preparation.incoming.digests,
    payload: preparation.incoming.payload
  });
  const incoming: FullBackupPreflightResult = {
    ...verifiedIncoming,
    migratedFromFormatVersion: preparation.incoming.migratedFromFormatVersion
  };
  const safety = await preflightFullBackup(preparation.currentSafetyBackup);
  return {
    incoming,
    expectedCurrentPayloadDigest: safety.digests.payload
  };
}

export async function applyVerifiedFullBackup(
  repository: CaseRepository,
  verified: VerifiedFullBackupReplacement
): Promise<FullBackupPreflightResult> {
  try {
    await repository.replaceFullDataSnapshot(verified.incoming.payload, {
      expectedCurrentPayloadDigest: verified.expectedCurrentPayloadDigest
    });
  } catch (cause) {
    if (!(cause instanceof FullDataReplaceConflictError)) throw cause;
    throw new FullBackupError(
      "CURRENT_DATA_CHANGED",
      "Current data changed after import preparation; create and download a fresh safety backup before restoring.",
      { cause }
    );
  }
  return verified.incoming;
}

export async function applyPreparedFullBackup(
  repository: CaseRepository,
  preparation: FullBackupImportPreparation
): Promise<FullBackupPreflightResult> {
  return applyVerifiedFullBackup(repository, await verifyPreparedFullBackup(preparation));
}

/** Convenience API; interactive UI should prefer prepare + download + apply. */
export async function importFullBackup(
  repository: CaseRepository,
  rawInput: unknown,
  options: CreateFullBackupOptions
): Promise<FullBackupImportResult> {
  const preparation = await prepareFullBackupImport(repository, rawInput, options);
  const imported = await applyPreparedFullBackup(repository, preparation);
  return { imported, currentSafetyBackup: preparation.currentSafetyBackup };
}
