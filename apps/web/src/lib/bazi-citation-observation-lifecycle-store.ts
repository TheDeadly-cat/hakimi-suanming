import type { LocalAttachmentRecord } from "@hakimi/contracts";
import { sha256BytesHex } from "@hakimi/integrity";
import {
  LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_ENCODED_CHARACTERS,
  LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHED_BYTES,
  LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHES,
  LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_SCAN_ROWS,
  LocalAttachmentPurposeMetadataSnapshotLimitError,
  caseRepository
} from "@hakimi/storage";
import { CURRENT_RELEASE_ENGINEERING_IDENTITY } from "./current-release";
import {
  reopenCurrentLocalBaziCitationApplicabilityObservationPairLifecycle,
  verifyLocalBaziCitationApplicabilityObservationPairLifecycleRoundTrip,
  type LocalBaziCitationApplicabilityObservationPairLifecycleReopen
} from "./bazi-citation-review-context";
import {
  BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_DESCRIPTION,
  BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_MEDIA_TYPE
} from "./bazi-citation-observation-lifecycle-attachment-purpose";

export {
  BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_DESCRIPTION,
  BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_MEDIA_TYPE
} from "./bazi-citation-observation-lifecycle-attachment-purpose";
export const MAX_BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_BYTES = 2 * 1024 * 1024;
export const MAX_BAZI_CITATION_OBSERVATION_LIFECYCLE_SELECTED_COPIES = 16;

export const BAZI_CITATION_OBSERVATION_LIFECYCLE_STORE_PROFILE = Object.freeze({
  adapterVersion: "hakimi.web.bazi_citation_observation_lifecycle_store/0.1.0",
  contentVersion: "0.1.0",
  scope: "explicit_local_attachment_governance_for_sensitive_bazi_observation_lifecycle_sidecars" as const,
  releasePolicy: "legacy_v13_target_schema_13_migration_null_only" as const,
  catalogPolicy: "exact_purpose_complete_atomic_metadata_snapshot_with_unchecked_content_integrity" as const,
  contentPolicy: "canonical_package_sidecar_and_exact_raw_sha256_readback" as const,
  persistencePolicy: "explicit_unlinked_local_attachment_included_in_plaintext_full_backup" as const,
  deletePolicy: "one_exact_current_store_copy_without_physical_erasure_or_old_copy_recall_attestation" as const,
  requiredSharePolicy: "blocked_sensitive" as const,
  reviewerIdentityVerified: false as const,
  reviewerIndependenceVerified: false as const,
  reviewerWithdrawalAuthorityVerified: false as const,
  expertTruthClaimed: false as const,
  scientificValidityClaimed: false as const,
  formalActivationAllowed: false as const,
  publicReleaseAuthorized: false as const
});

export type BaziCitationObservationLifecycleStoreErrorCode =
  | "INVALID_INPUT"
  | "RELEASE_IDENTITY_MISMATCH"
  | "REPOSITORY_IDENTITY_MISMATCH"
  | "REPOSITORY_NOT_READY"
  | "RELEASE_WRITES_LOCKED"
  | "CATALOG_INVALID"
  | "CATALOG_LIMIT_EXCEEDED"
  | "SIDECAR_INVALID"
  | "ATTACHMENT_INVALID"
  | "ATTACHMENT_CONTENT_MISMATCH"
  | "INVALID_UTF8"
  | "ATTACHMENT_NOT_FOUND"
  | "READ_FAILED"
  | "COMMIT_RECONCILIATION_REQUIRED";

export type BaziCitationObservationLifecycleStoreErrorPhase =
  | "input"
  | "release_gate"
  | "catalog_read"
  | "content_read"
  | "prewrite"
  | "write_call_or_postwrite_reinspection"
  | "delete_call_or_postdelete_reinspection";

export class BaziCitationObservationLifecycleStoreError extends Error {
  constructor(
    readonly code: BaziCitationObservationLifecycleStoreErrorCode,
    readonly phase: BaziCitationObservationLifecycleStoreErrorPhase,
    readonly commitReconciliationRequired: boolean,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "BaziCitationObservationLifecycleStoreError";
  }
}

export type BaziCitationObservationLifecycleAttachmentExactIdentity = Readonly<{
  id: string;
  fileName: string;
  mediaType: typeof BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_MEDIA_TYPE;
  byteLength: number;
  contentHash: string;
  description: typeof BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_DESCRIPTION;
  link: null;
  createdAt: string;
  updatedAt: string;
}>;

type AttachmentMetadataReceipt = BaziCitationObservationLifecycleAttachmentExactIdentity & Readonly<{
  schemaVersion: "1.0.0";
  recordVersion: 1;
  recordType: "local_attachment";
  contentIntegrity: "unchecked";
}>;

type AttachmentPurposeMetadataSnapshotReceipt = Readonly<{
  filter: Readonly<{
    mediaType: string;
    description: string;
    unlinkedOnly: true;
  }>;
  items: readonly AttachmentMetadataReceipt[];
  scannedCount: number;
  scannedEncodedCharacters: number;
  matchedDeclaredBytes: number;
  contentIntegrityVerified: false;
  coverage: "complete";
  atomicStorageSnapshotVerified: true;
}>;

export interface BaziCitationObservationLifecycleAttachmentRepository {
  database: Readonly<{
    name: string;
    targetSchemaVersion: number;
    verno: number;
    isOpen(): boolean;
    areReleaseWritesLocked(): boolean;
  }>;
  readAttachmentPurposeMetadataSnapshot(options: {
    mediaType: string;
    description: string;
    unlinkedOnly: true;
  }): Promise<unknown>;
  createAttachmentOnce(input: {
    fileName: string;
    mediaType: string;
    bytes: Uint8Array;
    description: string;
    link: null;
  }): Promise<unknown>;
  createAttachmentOnceWithExactUnlinkedSources(input: {
    fileName: string;
    mediaType: string;
    bytes: Uint8Array;
    description: string;
    link: null;
  }, sources: readonly BaziCitationObservationLifecycleAttachmentExactIdentity[]): Promise<unknown>;
  readAttachmentBytes(
    id: string,
    options: { expectedContentHash: string }
  ): Promise<Uint8Array | null>;
  deleteExactUnlinkedAttachment(
    identity: BaziCitationObservationLifecycleAttachmentExactIdentity
  ): Promise<void>;
}

type ReleaseIdentity = Readonly<{
  dbGeneration: string;
  databaseName: string;
  targetSchema: number;
  migrationId: string | null;
}>;

export interface BaziCitationObservationLifecycleStoreDependencies {
  releaseIdentity: ReleaseIdentity;
  repository: BaziCitationObservationLifecycleAttachmentRepository;
  reopenLifecycle(
    rawLocator: unknown,
    rawExpectedPriorContextPayloadSha256: unknown,
    rawSidecarTexts: unknown
  ): Promise<LocalBaziCitationApplicabilityObservationPairLifecycleReopen>;
}

export type BaziCitationObservationLifecycleSafeSummary = Readonly<{
  ledgerId: string;
  recordSetSha256: string;
  sidecarSha256: string;
  records: readonly [
    Readonly<{ recordSha256: string; state: "recorded_current_context_unchecked" | "withheld_by_local_user" }>,
    Readonly<{ recordSha256: string; state: "recorded_current_context_unchecked" | "withheld_by_local_user" }>
  ];
  counts: Readonly<{
    recordedNotWithheld: 0 | 1 | 2;
    withheld: 0 | 1 | 2;
  }>;
}>;

export interface BaziCitationObservationLifecycleAttachmentCatalog {
  profile: typeof BAZI_CITATION_OBSERVATION_LIFECYCLE_STORE_PROFILE;
  items: readonly BaziCitationObservationLifecycleAttachmentExactIdentity[];
  summary: Readonly<{
    storedCopies: number;
    matchedDeclaredBytes: number;
    scannedRows: number;
    scannedEncodedCharacters: number;
  }>;
  boundary: Readonly<{
    exactPurposeFilterUsed: true;
    completeCoverageVerified: true;
    atomicMetadataSnapshotVerified: true;
    contentIntegrityVerified: false;
    itemOrderingUsesContentHashThenId: true;
    timestampOrderingUsed: false;
    storageReadPerformed: true;
    storageMutationPerformed: false;
    mutationEpochRevalidationPerformed: false;
    mutationEpochBypassed: false;
    networkTransmissionPerformed: false;
    reviewerIdentityVerified: false;
    reviewerIndependenceVerified: false;
    reviewerWithdrawalAuthorityVerified: false;
    publicReleaseAuthorized: false;
    expertTruthClaimed: false;
    scientificValidityClaimed: false;
  }>;
}

export interface BaziCitationObservationLifecycleStoredReceipt {
  profile: typeof BAZI_CITATION_OBSERVATION_LIFECYCLE_STORE_PROFILE;
  attachment: BaziCitationObservationLifecycleAttachmentExactIdentity;
  lifecycle: BaziCitationObservationLifecycleSafeSummary;
  created: boolean;
  sourceIdentityCount: number;
  boundary: Readonly<{
    explicitSaveIntentConfirmed: true;
    sensitiveContentAcknowledged: true;
    plaintextFullBackupInclusionAcknowledged: true;
    unlinkedNonCascadeAcknowledged: true;
    oldAndExternalCopiesCannotBeRecalledAcknowledged: true;
    packageInspectionPerformed: true;
    canonicalTextExactMatchVerified: true;
    exactRawBytesReadBack: true;
    rawContentHashMatched: true;
    lifecycleRoundTripDigestMatched: true;
    exactPurposeCatalogCapacityAtomicallyAdmitted: true;
    sourceIdentitiesAtomicallyRevalidatedDuringCreate: boolean;
    containsDerivedSensitiveChartBinding: true;
    containsUntrustedReviewerFreeformText: true;
    includedInPlaintextFullBackup: true;
    attachmentLinkedToCaseOrRevision: false;
    caseDeletionCascadeEnabled: false;
    requiredSharePolicy: "blocked_sensitive";
    storageReadPerformed: true;
    storageWriteCallPerformed: true;
    newAttachmentRecordCreated: boolean;
    storageMutationPerformed: boolean;
    mutationEpochRevalidationPerformed: false;
    mutationEpochBypassed: false;
    networkTransmissionPerformed: false;
    physicalDeletionAttested: false;
    priorExportsRecalled: false;
    priorPlaintextBackupsRecalled: false;
    otherBrowserProfilesRecalled: false;
    otherDevicesRecalled: false;
    reviewerIdentityVerified: false;
    reviewerIndependenceVerified: false;
    reviewerWithdrawalAuthorityVerified: false;
    publicExportAuthorized: false;
    publicReleaseAuthorized: false;
    expertTruthClaimed: false;
    scientificValidityClaimed: false;
    formalActivationAllowed: false;
  }>;
}

export interface BaziCitationObservationLifecycleStoredCopiesReopen {
  profile: typeof BAZI_CITATION_OBSERVATION_LIFECYCLE_STORE_PROFILE;
  sources: readonly Readonly<{
    attachment: BaziCitationObservationLifecycleAttachmentExactIdentity;
    lifecycle: BaziCitationObservationLifecycleSafeSummary;
  }>[];
  /** Private-leaf-only payload; its content field contains sensitive canonical text. */
  privateLeafPayload: LocalBaziCitationApplicabilityObservationPairLifecycleReopen;
  boundary: Readonly<{
    selectedCopyCount: number;
    selectedCopiesReadSerially: true;
    eachReadUsedExpectedRawContentHash: true;
    eachRawContentHashRecomputed: true;
    eachLifecycleCanonicalDigestReinspected: true;
    freshContextReopenPerformed: true;
    catalogWideAtomicContentSnapshotClaimed: false;
    currentAtReturnAttested: false;
    storageReadPerformed: true;
    storageMutationPerformed: false;
    mutationEpochRevalidationPerformed: false;
    mutationEpochBypassed: false;
    networkTransmissionPerformed: false;
    reviewerIdentityVerified: false;
    reviewerIndependenceVerified: false;
    reviewerWithdrawalAuthorityVerified: false;
    publicReleaseAuthorized: false;
    expertTruthClaimed: false;
    scientificValidityClaimed: false;
  }>;
}

export interface BaziCitationObservationLifecycleOriginalBytesExport {
  profile: typeof BAZI_CITATION_OBSERVATION_LIFECYCLE_STORE_PROFILE;
  attachment: BaziCitationObservationLifecycleAttachmentExactIdentity;
  lifecycle: BaziCitationObservationLifecycleSafeSummary;
  /** A detached copy of the exact stored bytes. It is intentionally private-leaf-owned and mutable. */
  bytes: Uint8Array;
  boundary: Readonly<{
    exactStoredBytesReturned: true;
    jsonReserializationPerformed: false;
    expectedRawContentHashUsed: true;
    rawContentHashRecomputed: true;
    lifecycleDigestReinspected: true;
    callerByteMutationAffectsStoredCopy: false;
    requiredSharePolicy: "blocked_sensitive";
    storageReadPerformed: true;
    storageMutationPerformed: false;
    mutationEpochRevalidationPerformed: false;
    mutationEpochBypassed: false;
    networkTransmissionPerformed: false;
    publicExportAuthorized: false;
    publicReleaseAuthorized: false;
    expertTruthClaimed: false;
    scientificValidityClaimed: false;
  }>;
}

export interface BaziCitationObservationLifecycleDeleteReceipt {
  profile: typeof BAZI_CITATION_OBSERVATION_LIFECYCLE_STORE_PROFILE;
  attachment: BaziCitationObservationLifecycleAttachmentExactIdentity;
  lifecycle: BaziCitationObservationLifecycleSafeSummary;
  boundary: Readonly<{
    explicitDeleteIntentConfirmed: true;
    exactIdentityPreReadAndInspected: true;
    fullIdentityCasDeleteRequested: true;
    exactPurposeSnapshotConfirmedIdAbsent: true;
    currentStoreAttachmentCopyAbsentVerified: true;
    physicalDeletionAttested: false;
    priorExportsRecalled: false;
    priorPlaintextBackupsRecalled: false;
    otherBrowserProfilesRecalled: false;
    otherDevicesRecalled: false;
    sameLedgerOtherCopiesDeleted: false;
    reviewerWithdrawalAuthorityVerified: false;
    storageReadPerformed: true;
    storageMutationPerformed: true;
    mutationEpochRevalidationPerformed: false;
    mutationEpochBypassed: false;
    networkTransmissionPerformed: false;
    publicReleaseAuthorized: false;
    expertTruthClaimed: false;
    scientificValidityClaimed: false;
  }>;
}

type PlainRecord = Record<string, unknown>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const LOWERCASE_SHA256 = /^[a-f0-9]{64}$/u;
const EVIDENCE_SUBJECT_ID = /^[a-z][A-Za-z0-9.-]{2,159}$/u;
const FIELD_PATH = /^pillars\.(year|month|day|hour)\.(ganZhi|hiddenStems|stemTenGod|branchTenGods|wuXing|nayin|twelveGrowth|xun|voidBranches)$/u;
const TEXT_ENCODER = new TextEncoder();
const FATAL_TEXT_DECODER = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

const PURPOSE_SNAPSHOT_KEYS = [
  "filter",
  "items",
  "scannedCount",
  "scannedEncodedCharacters",
  "matchedDeclaredBytes",
  "contentIntegrityVerified",
  "coverage",
  "atomicStorageSnapshotVerified"
] as const;
const PURPOSE_FILTER_KEYS = ["mediaType", "description", "unlinkedOnly"] as const;
const ATTACHMENT_METADATA_KEYS = [
  "schemaVersion",
  "recordVersion",
  "recordType",
  "id",
  "fileName",
  "mediaType",
  "byteLength",
  "contentHash",
  "description",
  "link",
  "createdAt",
  "updatedAt",
  "contentIntegrity"
] as const;
const FULL_ATTACHMENT_RECORD_KEYS = [
  "schemaVersion",
  "recordVersion",
  "recordType",
  "id",
  "fileName",
  "mediaType",
  "byteLength",
  "contentBase64",
  "contentHash",
  "description",
  "link",
  "createdAt",
  "updatedAt"
] as const;
const EXACT_IDENTITY_KEYS = [
  "id",
  "fileName",
  "mediaType",
  "byteLength",
  "contentHash",
  "description",
  "link",
  "createdAt",
  "updatedAt"
] as const;

function fail(
  code: BaziCitationObservationLifecycleStoreErrorCode,
  phase: BaziCitationObservationLifecycleStoreErrorPhase,
  message: string,
  options?: ErrorOptions
): never {
  throw new BaziCitationObservationLifecycleStoreError(code, phase, false, message, options);
}

function commitUnknown(
  phase: Extract<BaziCitationObservationLifecycleStoreErrorPhase,
    "write_call_or_postwrite_reinspection" | "delete_call_or_postdelete_reinspection">,
  message: string,
  cause: unknown
): never {
  throw new BaziCitationObservationLifecycleStoreError(
    "COMMIT_RECONCILIATION_REQUIRED",
    phase,
    true,
    message,
    { cause }
  );
}

function deepFreeze<T>(value: T): T {
  if (
    value === null
    || typeof value !== "object"
    || Object.isFrozen(value)
    || ArrayBuffer.isView(value)
  ) return value;
  Object.freeze(value);
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if ("value" in descriptor) deepFreeze(descriptor.value);
  }
  return value;
}

function strictOwnDataRecord(
  input: unknown,
  expectedKeys: readonly string[],
  label: string,
  code: BaziCitationObservationLifecycleStoreErrorCode = "INVALID_INPUT",
  phase: BaziCitationObservationLifecycleStoreErrorPhase = "input"
): PlainRecord {
  try {
    if (
      input === null
      || typeof input !== "object"
      || Array.isArray(input)
      || Object.getPrototypeOf(input) !== Object.prototype
      || Object.getOwnPropertySymbols(input).length > 0
    ) throw new TypeError();
    const actualKeys = Object.getOwnPropertyNames(input).sort();
    const expected = [...expectedKeys].sort();
    if (
      actualKeys.length !== expected.length
      || actualKeys.some((key, index) => key !== expected[index])
    ) throw new TypeError();
    const result: PlainRecord = {};
    for (const key of expectedKeys) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
        throw new TypeError();
      }
      result[key] = descriptor.value;
    }
    return result;
  } catch (cause) {
    fail(code, phase, `${label}必须是精确的自有可枚举数据对象。`, { cause });
  }
}

function strictDenseOwnDataArray(
  input: unknown,
  minimum: number,
  maximum: number,
  label: string,
  code: BaziCitationObservationLifecycleStoreErrorCode = "INVALID_INPUT",
  phase: BaziCitationObservationLifecycleStoreErrorPhase = "input"
): readonly unknown[] {
  try {
    if (
      !Array.isArray(input)
      || Object.getPrototypeOf(input) !== Array.prototype
      || Object.getOwnPropertySymbols(input).length > 0
      || input.length < minimum
      || input.length > maximum
    ) throw new TypeError();
    const names = Object.getOwnPropertyNames(input);
    if (names.length !== input.length + 1 || !names.includes("length")) throw new TypeError();
    const result: unknown[] = [];
    for (let index = 0; index < input.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
      if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
        throw new TypeError();
      }
      result.push(descriptor.value);
    }
    return Object.freeze(result);
  } catch (cause) {
    fail(code, phase, `${label}必须是 ${minimum} 至 ${maximum} 项的稠密自有数据数组。`, { cause });
  }
}

function isCanonicalIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 64) return false;
  const epoch = Date.parse(value);
  return Number.isFinite(epoch) && new Date(epoch).toISOString() === value;
}

function isCanonicalAttachmentFileName(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= 255
    && value === value.trim()
    && value !== "."
    && value !== ".."
    && !/[\\/\p{Cc}\p{Cf}]/u.test(value);
}

function compareText(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

const PURPOSE_SNAPSHOT_LIMIT_CODES = new Set([
  "SCAN_ROW_LIMIT_EXCEEDED",
  "SCAN_ENCODED_CHARACTER_LIMIT_EXCEEDED",
  "MATCH_LIMIT_EXCEEDED",
  "MATCHED_BYTE_LIMIT_EXCEEDED"
]);

function isPurposeSnapshotLimitError(cause: unknown): boolean {
  return cause instanceof LocalAttachmentPurposeMetadataSnapshotLimitError
    && PURPOSE_SNAPSHOT_LIMIT_CODES.has(cause.code);
}

function snapshotExactIdentity(
  rawInput: unknown,
  label: string,
  code: BaziCitationObservationLifecycleStoreErrorCode = "INVALID_INPUT",
  phase: BaziCitationObservationLifecycleStoreErrorPhase = "input"
): BaziCitationObservationLifecycleAttachmentExactIdentity {
  const raw = strictOwnDataRecord(rawInput, EXACT_IDENTITY_KEYS, label, code, phase);
  if (
    typeof raw.id !== "string"
    || !UUID.test(raw.id)
    || !isCanonicalAttachmentFileName(raw.fileName)
    || raw.mediaType !== BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_MEDIA_TYPE
    || !Number.isSafeInteger(raw.byteLength)
    || Number(raw.byteLength) < 1
    || Number(raw.byteLength) > MAX_BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_BYTES
    || typeof raw.contentHash !== "string"
    || !LOWERCASE_SHA256.test(raw.contentHash)
    || raw.description !== BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_DESCRIPTION
    || raw.link !== null
    || !isCanonicalIsoTimestamp(raw.createdAt)
    || !isCanonicalIsoTimestamp(raw.updatedAt)
    || raw.updatedAt < raw.createdAt
  ) {
    fail(code, phase, `${label}不是当前 lifecycle exact-purpose 的规范附件身份。`);
  }
  return deepFreeze({
    id: raw.id,
    fileName: raw.fileName,
    mediaType: raw.mediaType,
    byteLength: raw.byteLength,
    contentHash: raw.contentHash,
    description: raw.description,
    link: null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt
  } as BaziCitationObservationLifecycleAttachmentExactIdentity);
}

function snapshotMetadataItem(rawInput: unknown): AttachmentMetadataReceipt {
  const raw = strictOwnDataRecord(
    rawInput,
    ATTACHMENT_METADATA_KEYS,
    "lifecycle attachment catalog item",
    "CATALOG_INVALID",
    "catalog_read"
  );
  const identity = snapshotExactIdentity({
    id: raw.id,
    fileName: raw.fileName,
    mediaType: raw.mediaType,
    byteLength: raw.byteLength,
    contentHash: raw.contentHash,
    description: raw.description,
    link: raw.link,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt
  }, "lifecycle attachment catalog identity", "CATALOG_INVALID", "catalog_read");
  if (
    raw.schemaVersion !== "1.0.0"
    || raw.recordVersion !== 1
    || raw.recordType !== "local_attachment"
    || raw.contentIntegrity !== "unchecked"
  ) {
    fail("CATALOG_INVALID", "catalog_read", "lifecycle attachment catalog item 合同不匹配。");
  }
  return deepFreeze({
    schemaVersion: "1.0.0" as const,
    recordVersion: 1 as const,
    recordType: "local_attachment" as const,
    ...identity,
    contentIntegrity: "unchecked" as const
  });
}

function snapshotPurposeReceipt(rawInput: unknown): AttachmentPurposeMetadataSnapshotReceipt {
  const raw = strictOwnDataRecord(
    rawInput,
    PURPOSE_SNAPSHOT_KEYS,
    "lifecycle attachment purpose snapshot",
    "CATALOG_INVALID",
    "catalog_read"
  );
  const filter = strictOwnDataRecord(
    raw.filter,
    PURPOSE_FILTER_KEYS,
    "lifecycle attachment purpose filter",
    "CATALOG_INVALID",
    "catalog_read"
  );
  const rawItems = strictDenseOwnDataArray(
    raw.items,
    0,
    LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHES,
    "lifecycle attachment purpose items",
    "CATALOG_INVALID",
    "catalog_read"
  );
  const items = rawItems.map(snapshotMetadataItem);
  const seenIds = new Set<string>();
  let matchedDeclaredBytes = 0;
  for (const item of items) {
    if (seenIds.has(item.id)) {
      fail("CATALOG_INVALID", "catalog_read", "lifecycle attachment catalog 包含重复 ID。");
    }
    seenIds.add(item.id);
    matchedDeclaredBytes += item.byteLength;
  }
  if (
    filter.mediaType !== BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_MEDIA_TYPE
    || filter.description !== BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_DESCRIPTION
    || filter.unlinkedOnly !== true
    || raw.coverage !== "complete"
    || raw.atomicStorageSnapshotVerified !== true
    || raw.contentIntegrityVerified !== false
    || !Number.isSafeInteger(raw.scannedCount)
    || Number(raw.scannedCount) < items.length
    || Number(raw.scannedCount) > LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_SCAN_ROWS
    || !Number.isSafeInteger(raw.scannedEncodedCharacters)
    || Number(raw.scannedEncodedCharacters) < 0
    || Number(raw.scannedEncodedCharacters) > LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_ENCODED_CHARACTERS
    || !Number.isSafeInteger(raw.matchedDeclaredBytes)
    || Number(raw.matchedDeclaredBytes) !== matchedDeclaredBytes
    || matchedDeclaredBytes > LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHED_BYTES
  ) {
    fail("CATALOG_INVALID", "catalog_read", "lifecycle attachment purpose snapshot 回执不一致。");
  }
  return deepFreeze({
    filter: {
      mediaType: BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_MEDIA_TYPE,
      description: BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_DESCRIPTION,
      unlinkedOnly: true as const
    },
    items: Object.freeze(items),
    scannedCount: raw.scannedCount,
    scannedEncodedCharacters: raw.scannedEncodedCharacters,
    matchedDeclaredBytes: raw.matchedDeclaredBytes,
    contentIntegrityVerified: false as const,
    coverage: "complete" as const,
    atomicStorageSnapshotVerified: true as const
  } as AttachmentPurposeMetadataSnapshotReceipt);
}

function assertReleaseAndRepository(
  dependencies: BaziCitationObservationLifecycleStoreDependencies,
  write: boolean
): void {
  const identity = dependencies.releaseIdentity;
  if (
    identity.dbGeneration !== "legacy-v13"
    || identity.targetSchema !== 13
    || identity.migrationId !== null
  ) {
    fail(
      "RELEASE_IDENTITY_MISMATCH",
      "release_gate",
      "lifecycle attachment store 只允许 legacy-v13 / targetSchema 13 / migrationId null。"
    );
  }
  const database = dependencies.repository.database;
  if (
    database.name !== identity.databaseName
    || database.targetSchemaVersion !== 13
    || database.verno !== 13
  ) {
    fail(
      "REPOSITORY_IDENTITY_MISMATCH",
      "release_gate",
      "lifecycle attachment repository 没有绑定当前 legacy-v13 数据库。"
    );
  }
  if (!database.isOpen()) {
    fail("REPOSITORY_NOT_READY", "release_gate", "legacy-v13 数据库尚未显式打开。");
  }
  if (write && database.areReleaseWritesLocked()) {
    fail("RELEASE_WRITES_LOCKED", "release_gate", "当前 Release 仍处于仓储写锁状态。");
  }
}

function currentDependencies(): BaziCitationObservationLifecycleStoreDependencies {
  return {
    releaseIdentity: CURRENT_RELEASE_ENGINEERING_IDENTITY,
    repository: caseRepository as unknown as BaziCitationObservationLifecycleAttachmentRepository,
    reopenLifecycle: reopenCurrentLocalBaziCitationApplicabilityObservationPairLifecycle
  };
}

function lifecycleSummary(
  inspection: Awaited<ReturnType<
    typeof import("@hakimi/bazi-review-context")["inspectBaziCitationApplicabilityObservationPairLifecycleSidecar"]
  >>
): BaziCitationObservationLifecycleSafeSummary {
  return deepFreeze({
    ledgerId: inspection.sidecar.ledgerId,
    recordSetSha256: inspection.sidecar.contextBinding.recordSetSha256,
    sidecarSha256: inspection.sidecar.integrity.sidecarSha256,
    records: inspection.sidecar.records.map((record) => ({
      recordSha256: record.recordSha256,
      state: record.state
    })) as [
      { recordSha256: string; state: "recorded_current_context_unchecked" | "withheld_by_local_user" },
      { recordSha256: string; state: "recorded_current_context_unchecked" | "withheld_by_local_user" }
    ],
    counts: {
      recordedNotWithheld: inspection.recordedNotWithheldCount,
      withheld: inspection.withheldRecordCount
    }
  });
}

async function canonicalLifecycleText(
  rawText: unknown,
  expectedSidecarSha256: string | null,
  phase: Extract<BaziCitationObservationLifecycleStoreErrorPhase, "prewrite" | "content_read">
): Promise<Readonly<{
  text: string;
  bytes: Uint8Array;
  summary: BaziCitationObservationLifecycleSafeSummary;
}>> {
  if (
    typeof rawText !== "string"
    || rawText.length < 1
    || rawText.length > MAX_BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_BYTES
    || (expectedSidecarSha256 !== null && !LOWERCASE_SHA256.test(expectedSidecarSha256))
  ) {
    fail("SIDECAR_INVALID", phase, "lifecycle sidecar 文本或预期摘要格式无效。");
  }
  const bytes = TEXT_ENCODER.encode(rawText);
  if (
    bytes.byteLength < 1
    || bytes.byteLength > MAX_BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_BYTES
  ) {
    fail("SIDECAR_INVALID", phase, "lifecycle sidecar UTF-8 字节超过 2 MiB 上限。");
  }
  try {
    const lifecycleModule = await import("@hakimi/bazi-review-context");
    const inspection = await lifecycleModule
      .inspectBaziCitationApplicabilityObservationPairLifecycleSidecar(rawText);
    const canonical = lifecycleModule
      .serializeBaziCitationApplicabilityObservationPairLifecycleSidecar(inspection.sidecar);
    if (
      canonical !== rawText
      || (
        expectedSidecarSha256 !== null
        && inspection.sidecar.integrity.sidecarSha256 !== expectedSidecarSha256
      )
    ) {
      fail("SIDECAR_INVALID", phase, "lifecycle sidecar 不是预期的精确 canonical 内容。");
    }
    return deepFreeze({ text: rawText, bytes, summary: lifecycleSummary(inspection) });
  } catch (cause) {
    if (cause instanceof BaziCitationObservationLifecycleStoreError) throw cause;
    fail("SIDECAR_INVALID", phase, "lifecycle sidecar package inspection 失败关闭。", { cause });
  }
}

function decodeFatalUtf8(bytes: Uint8Array): string {
  try {
    return FATAL_TEXT_DECODER.decode(bytes);
  } catch (cause) {
    fail("INVALID_UTF8", "content_read", "lifecycle attachment 原始字节不是严格 UTF-8。", { cause });
  }
}

async function readVerifiedAttachment(
  identity: BaziCitationObservationLifecycleAttachmentExactIdentity,
  repository: BaziCitationObservationLifecycleAttachmentRepository,
  expectedSidecarSha256: string | null
): Promise<Readonly<{
  identity: BaziCitationObservationLifecycleAttachmentExactIdentity;
  bytes: Uint8Array;
  text: string;
  summary: BaziCitationObservationLifecycleSafeSummary;
}>> {
  let rawBytes: Uint8Array | null;
  try {
    rawBytes = await repository.readAttachmentBytes(identity.id, {
      expectedContentHash: identity.contentHash
    });
  } catch (cause) {
    fail("READ_FAILED", "content_read", "无法按冻结摘要读取 lifecycle attachment。", { cause });
  }
  if (rawBytes === null) {
    fail("ATTACHMENT_NOT_FOUND", "content_read", "所选 lifecycle attachment 已不存在。");
  }
  if (
    !ArrayBuffer.isView(rawBytes)
    || Object.prototype.toString.call(rawBytes) !== "[object Uint8Array]"
    || rawBytes.byteLength !== identity.byteLength
    || rawBytes.byteLength < 1
    || rawBytes.byteLength > MAX_BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_BYTES
  ) {
    fail("ATTACHMENT_CONTENT_MISMATCH", "content_read", "lifecycle attachment 回读字节长度不匹配。");
  }
  const bytes = Uint8Array.from(rawBytes);
  if (await sha256BytesHex(bytes) !== identity.contentHash) {
    fail("ATTACHMENT_CONTENT_MISMATCH", "content_read", "lifecycle attachment 原始字节摘要不匹配。");
  }
  const text = decodeFatalUtf8(bytes);
  const canonical = await canonicalLifecycleText(text, expectedSidecarSha256, "content_read");
  return deepFreeze({ identity, bytes, text, summary: canonical.summary });
}

function snapshotCreatedAttachmentResult(rawResult: unknown): Readonly<{
  record: BaziCitationObservationLifecycleAttachmentExactIdentity;
  created: boolean;
}> {
  const result = strictOwnDataRecord(
    rawResult,
    ["record", "created"],
    "lifecycle attachment create receipt",
    "ATTACHMENT_INVALID",
    "write_call_or_postwrite_reinspection"
  );
  const rawRecord = strictOwnDataRecord(
    result.record,
    FULL_ATTACHMENT_RECORD_KEYS,
    "lifecycle attachment created record",
    "ATTACHMENT_INVALID",
    "write_call_or_postwrite_reinspection"
  );
  if (
    rawRecord.schemaVersion !== "1.0.0"
    || rawRecord.recordVersion !== 1
    || rawRecord.recordType !== "local_attachment"
    || typeof rawRecord.contentBase64 !== "string"
    || typeof result.created !== "boolean"
  ) {
    fail(
      "ATTACHMENT_INVALID",
      "write_call_or_postwrite_reinspection",
      "lifecycle attachment create receipt 合同不匹配。"
    );
  }
  return deepFreeze({
    record: snapshotExactIdentity({
      id: rawRecord.id,
      fileName: rawRecord.fileName,
      mediaType: rawRecord.mediaType,
      byteLength: rawRecord.byteLength,
      contentHash: rawRecord.contentHash,
      description: rawRecord.description,
      link: rawRecord.link,
      createdAt: rawRecord.createdAt,
      updatedAt: rawRecord.updatedAt
    }, "created lifecycle attachment identity", "ATTACHMENT_INVALID", "write_call_or_postwrite_reinspection"),
    created: result.created
  });
}

function snapshotIdentityArray(
  rawInput: unknown,
  minimum: number,
  maximum: number,
  label: string
): readonly BaziCitationObservationLifecycleAttachmentExactIdentity[] {
  const values = strictDenseOwnDataArray(rawInput, minimum, maximum, label);
  const identities = values.map((value, index) => snapshotExactIdentity(value, `${label}[${index}]`));
  if (new Set(identities.map((identity) => identity.id)).size !== identities.length) {
    fail("INVALID_INPUT", "input", `${label}包含重复附件 ID。`);
  }
  return Object.freeze(identities.sort((left, right) => (
    compareText(left.contentHash, right.contentHash) || compareText(left.id, right.id)
  )));
}

function snapshotLocator(rawInput: unknown): Readonly<{
  caseId: string;
  revisionId: string;
  evidenceSubjectId: string;
  fieldPath: string;
}> {
  const raw = strictOwnDataRecord(
    rawInput,
    ["caseId", "revisionId", "evidenceSubjectId", "fieldPath"],
    "lifecycle store locator"
  );
  if (
    typeof raw.caseId !== "string"
    || !UUID.test(raw.caseId)
    || typeof raw.revisionId !== "string"
    || !UUID.test(raw.revisionId)
    || typeof raw.evidenceSubjectId !== "string"
    || !EVIDENCE_SUBJECT_ID.test(raw.evidenceSubjectId)
    || typeof raw.fieldPath !== "string"
    || !FIELD_PATH.test(raw.fieldPath)
  ) {
    fail("INVALID_INPUT", "input", "lifecycle store locator 格式无效。");
  }
  return deepFreeze({
    caseId: raw.caseId,
    revisionId: raw.revisionId,
    evidenceSubjectId: raw.evidenceSubjectId,
    fieldPath: raw.fieldPath
  } as const);
}

export async function readBaziCitationObservationLifecycleAttachmentCatalog(
  dependencies: BaziCitationObservationLifecycleStoreDependencies = currentDependencies()
): Promise<BaziCitationObservationLifecycleAttachmentCatalog> {
  assertReleaseAndRepository(dependencies, false);
  let rawSnapshot: unknown;
  try {
    rawSnapshot = await dependencies.repository.readAttachmentPurposeMetadataSnapshot({
      mediaType: BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_MEDIA_TYPE,
      description: BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_DESCRIPTION,
      unlinkedOnly: true
    });
  } catch (cause) {
    fail(
      isPurposeSnapshotLimitError(cause) ? "CATALOG_LIMIT_EXCEEDED" : "READ_FAILED",
      "catalog_read",
      "无法取得 lifecycle attachment 完整 purpose snapshot。",
      { cause }
    );
  }
  const snapshot = snapshotPurposeReceipt(rawSnapshot);
  const items = snapshot.items
    .map(({ schemaVersion: _schema, recordVersion: _version, recordType: _type, contentIntegrity: _integrity, ...identity }) => {
      void _schema;
      void _version;
      void _type;
      void _integrity;
      return deepFreeze(identity);
    })
    .sort((left, right) => compareText(left.contentHash, right.contentHash) || compareText(left.id, right.id));
  return deepFreeze({
    profile: BAZI_CITATION_OBSERVATION_LIFECYCLE_STORE_PROFILE,
    items,
    summary: {
      storedCopies: items.length,
      matchedDeclaredBytes: snapshot.matchedDeclaredBytes,
      scannedRows: snapshot.scannedCount,
      scannedEncodedCharacters: snapshot.scannedEncodedCharacters
    },
    boundary: {
      exactPurposeFilterUsed: true,
      completeCoverageVerified: true,
      atomicMetadataSnapshotVerified: true,
      contentIntegrityVerified: false,
      itemOrderingUsesContentHashThenId: true,
      timestampOrderingUsed: false,
      storageReadPerformed: true,
      storageMutationPerformed: false,
      mutationEpochRevalidationPerformed: false,
      mutationEpochBypassed: false,
      networkTransmissionPerformed: false,
      reviewerIdentityVerified: false,
      reviewerIndependenceVerified: false,
      reviewerWithdrawalAuthorityVerified: false,
      publicReleaseAuthorized: false,
      expertTruthClaimed: false,
      scientificValidityClaimed: false
    }
  });
}

export async function saveBaziCitationObservationLifecycleCanonicalSession(
  rawInput: unknown,
  dependencies: BaziCitationObservationLifecycleStoreDependencies = currentDependencies()
): Promise<BaziCitationObservationLifecycleStoredReceipt> {
  const input = strictOwnDataRecord(
    rawInput,
    ["content", "expectedSidecarSha256", "sourceIdentities", "confirmation"],
    "lifecycle attachment save input"
  );
  const confirmation = strictOwnDataRecord(input.confirmation, [
    "explicitSaveIntent",
    "sensitiveReviewerAndDerivedChartContentAcknowledged",
    "plaintextFullBackupInclusionAcknowledged",
    "unlinkedAttachmentWillNotCascadeWithCaseDeletionAcknowledged",
    "priorAndExternalCopiesCannotBeRecalledAcknowledged"
  ], "lifecycle attachment save confirmation");
  if (
    confirmation.explicitSaveIntent !== true
    || confirmation.sensitiveReviewerAndDerivedChartContentAcknowledged !== true
    || confirmation.plaintextFullBackupInclusionAcknowledged !== true
    || confirmation.unlinkedAttachmentWillNotCascadeWithCaseDeletionAcknowledged !== true
    || confirmation.priorAndExternalCopiesCannotBeRecalledAcknowledged !== true
  ) {
    fail("INVALID_INPUT", "input", "lifecycle attachment 保存需要五项显式确认。" );
  }
  if (typeof input.expectedSidecarSha256 !== "string" || !LOWERCASE_SHA256.test(input.expectedSidecarSha256)) {
    fail("INVALID_INPUT", "input", "lifecycle attachment 预期 sidecar 摘要无效。");
  }
  const sourceIdentities = snapshotIdentityArray(
    input.sourceIdentities,
    0,
    MAX_BAZI_CITATION_OBSERVATION_LIFECYCLE_SELECTED_COPIES,
    "lifecycle attachment source identities"
  );
  assertReleaseAndRepository(dependencies, true);
  const canonical = await canonicalLifecycleText(input.content, input.expectedSidecarSha256, "prewrite");
  if (sourceIdentities.length > 0) {
    const sourceTexts: string[] = [];
    for (const source of sourceIdentities) {
      sourceTexts.push((await readVerifiedAttachment(source, dependencies.repository, null)).text);
    }
    try {
      const lifecycleModule = await import("@hakimi/bazi-review-context");
      const reconciled = await lifecycleModule
        .reconcileBaziCitationApplicabilityObservationPairLifecycleSidecars([
          ...sourceTexts,
          canonical.text
        ]);
      if (
        lifecycleModule.serializeBaziCitationApplicabilityObservationPairLifecycleSidecar(reconciled)
        !== canonical.text
      ) {
        fail("SIDECAR_INVALID", "prewrite", "保存内容不是所选源副本的确定性 successor 或合并结果。");
      }
    } catch (cause) {
      if (cause instanceof BaziCitationObservationLifecycleStoreError) throw cause;
      fail("SIDECAR_INVALID", "prewrite", "保存内容无法与所选源副本严格 reconciliation。", { cause });
    }
  }
  const rawContentHash = await sha256BytesHex(canonical.bytes);
  const createInput = {
    fileName: "hakimi-bazi-citation-applicability-observation-pair-lifecycle-v01.json",
    mediaType: BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_MEDIA_TYPE,
    bytes: Uint8Array.from(canonical.bytes),
    description: BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_DESCRIPTION,
    link: null
  } as const;
  try {
    const rawCreated = await dependencies.repository.createAttachmentOnceWithExactUnlinkedSources(
      createInput,
      sourceIdentities
    );
    const created = snapshotCreatedAttachmentResult(rawCreated);
    if (
      created.record.contentHash !== rawContentHash
      || created.record.byteLength !== canonical.bytes.byteLength
    ) {
      commitUnknown(
        "write_call_or_postwrite_reinspection",
        "lifecycle attachment 写入返回，但附件身份与准备字节不一致，需要只读重核。",
        new Error("created attachment identity mismatch")
      );
    }
    const readback = await readVerifiedAttachment(
      created.record,
      dependencies.repository,
      canonical.summary.sidecarSha256
    );
    if (
      readback.bytes.length !== canonical.bytes.length
      || readback.bytes.some((value, index) => value !== canonical.bytes[index])
      || readback.text !== canonical.text
    ) {
      commitUnknown(
        "write_call_or_postwrite_reinspection",
        "lifecycle attachment 写入已返回，但原字节 readback 不一致，需要只读重核。",
        new Error("postwrite byte mismatch")
      );
    }
    await verifyLocalBaziCitationApplicabilityObservationPairLifecycleRoundTrip(
      readback.text,
      canonical.summary.sidecarSha256
    );
    return deepFreeze({
      profile: BAZI_CITATION_OBSERVATION_LIFECYCLE_STORE_PROFILE,
      attachment: created.record,
      lifecycle: readback.summary,
      created: created.created,
      sourceIdentityCount: sourceIdentities.length,
      boundary: {
        explicitSaveIntentConfirmed: true,
        sensitiveContentAcknowledged: true,
        plaintextFullBackupInclusionAcknowledged: true,
        unlinkedNonCascadeAcknowledged: true,
        oldAndExternalCopiesCannotBeRecalledAcknowledged: true,
        packageInspectionPerformed: true,
        canonicalTextExactMatchVerified: true,
        exactRawBytesReadBack: true,
        rawContentHashMatched: true,
        lifecycleRoundTripDigestMatched: true,
        exactPurposeCatalogCapacityAtomicallyAdmitted: true,
        sourceIdentitiesAtomicallyRevalidatedDuringCreate: sourceIdentities.length > 0,
        containsDerivedSensitiveChartBinding: true,
        containsUntrustedReviewerFreeformText: true,
        includedInPlaintextFullBackup: true,
        attachmentLinkedToCaseOrRevision: false,
        caseDeletionCascadeEnabled: false,
        requiredSharePolicy: "blocked_sensitive",
        storageReadPerformed: true,
        storageWriteCallPerformed: true,
        newAttachmentRecordCreated: created.created,
        storageMutationPerformed: created.created,
        mutationEpochRevalidationPerformed: false,
        mutationEpochBypassed: false,
        networkTransmissionPerformed: false,
        physicalDeletionAttested: false,
        priorExportsRecalled: false,
        priorPlaintextBackupsRecalled: false,
        otherBrowserProfilesRecalled: false,
        otherDevicesRecalled: false,
        reviewerIdentityVerified: false,
        reviewerIndependenceVerified: false,
        reviewerWithdrawalAuthorityVerified: false,
        publicExportAuthorized: false,
        publicReleaseAuthorized: false,
        expertTruthClaimed: false,
        scientificValidityClaimed: false,
        formalActivationAllowed: false
      }
    });
  } catch (cause) {
    if (isPurposeSnapshotLimitError(cause)) {
      fail(
        "CATALOG_LIMIT_EXCEEDED",
        "prewrite",
        "exact-purpose lifecycle attachment 目录容量不足；事务已在新增前失败关闭。",
        { cause }
      );
    }
    if (
      cause instanceof BaziCitationObservationLifecycleStoreError
      && cause.commitReconciliationRequired
    ) throw cause;
    commitUnknown(
      "write_call_or_postwrite_reinspection",
      "lifecycle attachment 写调用已发出；当前不能证明提交或 readback 状态，需要 exact-purpose 只读重核。",
      cause
    );
  }
}

export async function reopenBaziCitationObservationLifecycleStoredCopies(
  rawInput: unknown,
  dependencies: BaziCitationObservationLifecycleStoreDependencies = currentDependencies()
): Promise<BaziCitationObservationLifecycleStoredCopiesReopen> {
  const input = strictOwnDataRecord(
    rawInput,
    ["locator", "expectedPriorContextPayloadSha256", "copies"],
    "stored lifecycle reopen input"
  );
  const locator = snapshotLocator(input.locator);
  if (
    typeof input.expectedPriorContextPayloadSha256 !== "string"
    || !LOWERCASE_SHA256.test(input.expectedPriorContextPayloadSha256)
  ) {
    fail("INVALID_INPUT", "input", "stored lifecycle reopen 的此前上下文摘要无效。");
  }
  const copies = snapshotIdentityArray(
    input.copies,
    1,
    MAX_BAZI_CITATION_OBSERVATION_LIFECYCLE_SELECTED_COPIES,
    "stored lifecycle reopen copies"
  );
  assertReleaseAndRepository(dependencies, false);
  const loaded: Array<Readonly<{
    attachment: BaziCitationObservationLifecycleAttachmentExactIdentity;
    lifecycle: BaziCitationObservationLifecycleSafeSummary;
    text: string;
  }>> = [];
  for (const copy of copies) {
    const verified = await readVerifiedAttachment(copy, dependencies.repository, null);
    loaded.push({ attachment: copy, lifecycle: verified.summary, text: verified.text });
  }
  let privateLeafPayload: LocalBaziCitationApplicabilityObservationPairLifecycleReopen;
  try {
    privateLeafPayload = await dependencies.reopenLifecycle(
      locator,
      input.expectedPriorContextPayloadSha256,
      loaded.map((item) => item.text)
    );
  } catch (cause) {
    fail("READ_FAILED", "content_read", "stored lifecycle copies 的 fresh-context reopen 失败关闭。", { cause });
  }
  return deepFreeze({
    profile: BAZI_CITATION_OBSERVATION_LIFECYCLE_STORE_PROFILE,
    sources: loaded.map(({ text: _privateText, ...source }) => {
      void _privateText;
      return deepFreeze(source);
    }),
    privateLeafPayload,
    boundary: {
      selectedCopyCount: copies.length,
      selectedCopiesReadSerially: true,
      eachReadUsedExpectedRawContentHash: true,
      eachRawContentHashRecomputed: true,
      eachLifecycleCanonicalDigestReinspected: true,
      freshContextReopenPerformed: true,
      catalogWideAtomicContentSnapshotClaimed: false,
      currentAtReturnAttested: false,
      storageReadPerformed: true,
      storageMutationPerformed: false,
      mutationEpochRevalidationPerformed: false,
      mutationEpochBypassed: false,
      networkTransmissionPerformed: false,
      reviewerIdentityVerified: false,
      reviewerIndependenceVerified: false,
      reviewerWithdrawalAuthorityVerified: false,
      publicReleaseAuthorized: false,
      expertTruthClaimed: false,
      scientificValidityClaimed: false
    }
  });
}

export async function readBaziCitationObservationLifecycleOriginalBytes(
  rawInput: unknown,
  dependencies: BaziCitationObservationLifecycleStoreDependencies = currentDependencies()
): Promise<BaziCitationObservationLifecycleOriginalBytesExport> {
  const input = strictOwnDataRecord(
    rawInput,
    ["attachment", "expectedSidecarSha256"],
    "lifecycle original bytes input"
  );
  const attachment = snapshotExactIdentity(input.attachment, "lifecycle original bytes attachment");
  if (typeof input.expectedSidecarSha256 !== "string" || !LOWERCASE_SHA256.test(input.expectedSidecarSha256)) {
    fail("INVALID_INPUT", "input", "lifecycle original bytes 的预期 sidecar 摘要无效。");
  }
  assertReleaseAndRepository(dependencies, false);
  const verified = await readVerifiedAttachment(
    attachment,
    dependencies.repository,
    input.expectedSidecarSha256
  );
  const bytes = Uint8Array.from(verified.bytes);
  return deepFreeze({
    profile: BAZI_CITATION_OBSERVATION_LIFECYCLE_STORE_PROFILE,
    attachment,
    lifecycle: verified.summary,
    bytes,
    boundary: {
      exactStoredBytesReturned: true,
      jsonReserializationPerformed: false,
      expectedRawContentHashUsed: true,
      rawContentHashRecomputed: true,
      lifecycleDigestReinspected: true,
      callerByteMutationAffectsStoredCopy: false,
      requiredSharePolicy: "blocked_sensitive",
      storageReadPerformed: true,
      storageMutationPerformed: false,
      mutationEpochRevalidationPerformed: false,
      mutationEpochBypassed: false,
      networkTransmissionPerformed: false,
      publicExportAuthorized: false,
      publicReleaseAuthorized: false,
      expertTruthClaimed: false,
      scientificValidityClaimed: false
    }
  });
}

export async function deleteBaziCitationObservationLifecycleExactCopy(
  rawInput: unknown,
  dependencies: BaziCitationObservationLifecycleStoreDependencies = currentDependencies()
): Promise<BaziCitationObservationLifecycleDeleteReceipt> {
  const input = strictOwnDataRecord(
    rawInput,
    ["attachment", "expectedSidecarSha256", "confirmation"],
    "lifecycle exact-copy delete input"
  );
  const confirmation = strictOwnDataRecord(input.confirmation, [
    "explicitDeleteIntent",
    "currentStoreSingleCopyOnlyAcknowledged",
    "physicalErasureNotAttestedAcknowledged",
    "priorAndExternalCopiesCannotBeRecalledAcknowledged"
  ], "lifecycle exact-copy delete confirmation");
  if (
    confirmation.explicitDeleteIntent !== true
    || confirmation.currentStoreSingleCopyOnlyAcknowledged !== true
    || confirmation.physicalErasureNotAttestedAcknowledged !== true
    || confirmation.priorAndExternalCopiesCannotBeRecalledAcknowledged !== true
  ) {
    fail("INVALID_INPUT", "input", "lifecycle exact-copy 删除需要四项显式确认。");
  }
  const attachment = snapshotExactIdentity(input.attachment, "lifecycle exact-copy delete attachment");
  if (typeof input.expectedSidecarSha256 !== "string" || !LOWERCASE_SHA256.test(input.expectedSidecarSha256)) {
    fail("INVALID_INPUT", "input", "lifecycle exact-copy 删除的预期 sidecar 摘要无效。");
  }
  assertReleaseAndRepository(dependencies, true);
  const verified = await readVerifiedAttachment(
    attachment,
    dependencies.repository,
    input.expectedSidecarSha256
  );
  try {
    await dependencies.repository.deleteExactUnlinkedAttachment(attachment);
    const catalog = await readBaziCitationObservationLifecycleAttachmentCatalog(dependencies);
    if (catalog.items.some((item) => item.id === attachment.id)) {
      commitUnknown(
        "delete_call_or_postdelete_reinspection",
        "lifecycle attachment 删除调用已返回，但 exact-purpose snapshot 仍包含同一 ID。",
        new Error("deleted attachment still present")
      );
    }
    return deepFreeze({
      profile: BAZI_CITATION_OBSERVATION_LIFECYCLE_STORE_PROFILE,
      attachment,
      lifecycle: verified.summary,
      boundary: {
        explicitDeleteIntentConfirmed: true,
        exactIdentityPreReadAndInspected: true,
        fullIdentityCasDeleteRequested: true,
        exactPurposeSnapshotConfirmedIdAbsent: true,
        currentStoreAttachmentCopyAbsentVerified: true,
        physicalDeletionAttested: false,
        priorExportsRecalled: false,
        priorPlaintextBackupsRecalled: false,
        otherBrowserProfilesRecalled: false,
        otherDevicesRecalled: false,
        sameLedgerOtherCopiesDeleted: false,
        reviewerWithdrawalAuthorityVerified: false,
        storageReadPerformed: true,
        storageMutationPerformed: true,
        mutationEpochRevalidationPerformed: false,
        mutationEpochBypassed: false,
        networkTransmissionPerformed: false,
        publicReleaseAuthorized: false,
        expertTruthClaimed: false,
        scientificValidityClaimed: false
      }
    });
  } catch (cause) {
    if (
      cause instanceof BaziCitationObservationLifecycleStoreError
      && cause.commitReconciliationRequired
    ) throw cause;
    commitUnknown(
      "delete_call_or_postdelete_reinspection",
      "lifecycle attachment 删除调用已发出；当前不能证明该副本是否仍存在，需要 exact-purpose 只读重核。",
      cause
    );
  }
}
