import type { LocalAttachmentRecord } from "@hakimi/contracts";
import {
  createTransitQueryReviewPreflightContext,
  inspectTransitQueryAuditArtifact,
  preflightTransitQueryAdjudicationInContext,
  preflightTransitQueryIndependentReviewInContext,
  type TransitQueryAuditArtifactInspection,
  type TransitQueryReviewPreflightContext
} from "@hakimi/research-query/transit-review";
import {
  LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_ENCODED_CHARACTERS,
  LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHED_BYTES,
  LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHES,
  LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_SCAN_ROWS,
  LocalAttachmentPurposeMetadataSnapshotLimitError,
  caseRepository
} from "@hakimi/storage";

export const TRANSIT_REVIEW_INBOX_ATTACHMENT_DESCRIPTION =
  "哈基米运限审核收件箱 · 本地未核验 · v1";
export const MAX_TRANSIT_REVIEW_INBOX_ARTIFACT_BYTES = 2 * 1024 * 1024;
export const MAX_TRANSIT_REVIEW_INBOX_SCAN_ROWS =
  LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_SCAN_ROWS;
export const MAX_TRANSIT_REVIEW_INBOX_SCAN_BASE64_CODE_UNITS =
  LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_ENCODED_CHARACTERS;
export const MAX_TRANSIT_REVIEW_INBOX_STORED_ARTIFACTS =
  LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHES;
export const MAX_TRANSIT_REVIEW_INBOX_TOTAL_RAW_BYTES =
  LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHED_BYTES;

const JSON_MEDIA_TYPE = "application/json";
const MAX_FAILURE_MESSAGE_CHARACTERS = 1_000;
const MAX_FAILURE_CODE_CHARACTERS = 128;
const MAX_ATTACHMENT_FILE_NAME_CHARACTERS = 240;
const MAX_CONCURRENT_INBOX_TASKS = 4;

export type TransitReviewInboxErrorCode =
  | "INVALID_UTF8"
  | "ARTIFACT_TOO_LARGE"
  | "LOCAL_RECORD_INVALID"
  | "LOCAL_RAW_DIGEST_MISMATCH"
  | "INBOX_COVERAGE_LIMIT_EXCEEDED";

export class TransitReviewInboxError extends Error {
  constructor(public readonly code: TransitReviewInboxErrorCode, message: string) {
    super(message);
    this.name = "TransitReviewInboxError";
  }
}

export type TransitReviewInboxArtifactStatus =
  | "bundle_current"
  | "waiting_for_review_bundle"
  | "waiting_for_independent_reviews"
  | "review_structure_passed_unverified"
  | "adjudication_structure_passed_unverified"
  | "preflight_failed"
  | "local_record_corrupt";

export type TransitReviewInboxArtifactKind =
  | TransitQueryAuditArtifactInspection["kind"]
  | "unknown";

export type TransitReviewInboxArtifact = {
  attachmentId: string;
  fileName: string;
  byteLength: number;
  rawContentHash: string;
  importedAt: string;
  kind: TransitReviewInboxArtifactKind;
  artifactDigest: string | null;
  reviewBundleDigest: string | null;
  candidateId: string | null;
  candidateDigest: string | null;
  status: TransitReviewInboxArtifactStatus;
  errorCode: string | null;
  errorMessage: string | null;
};

export type TransitReviewInboxCandidate = {
  candidateId: string;
  candidateDigest: string;
  title: string;
  nodeType: string;
  reviewArtifactIds: string[];
  passedReviewCount: number;
  adjudicationArtifactIds: string[];
  passedAdjudicationCount: number;
};

export type TransitReviewInboxBatch = {
  reviewBundleDigest: string;
  bundleArtifactIds: string[];
  currentBundle: boolean;
  candidates: TransitReviewInboxCandidate[];
  orphanArtifactIds: string[];
};

export type TransitReviewInboxProjection = {
  refreshedAt: string;
  evidenceBoundary: "local_unverified";
  identityVerified: false;
  sourceAuthenticityVerified: false;
  eligibleForFixtureIntegration: false;
  countsAsVerifiedGold: false;
  verifiedTransitFactsDelta: 0;
  verifiedQueryAdjudicationsDelta: 0;
  artifacts: TransitReviewInboxArtifact[];
  batches: TransitReviewInboxBatch[];
  summary: {
    storedArtifacts: number;
    currentBundles: number;
    passedIndependentReviews: number;
    passedAdjudications: number;
    waitingDependencies: number;
    failedOrCorrupt: number;
  };
};

type TransitReviewInboxAttachmentMetadata = Omit<LocalAttachmentRecord, "contentBase64"> & {
  contentIntegrity: "unchecked";
};

type TransitReviewInboxAttachmentMetadataSnapshot = {
  filter: {
    mediaType: string;
    description: string;
    unlinkedOnly: true;
  };
  items: readonly TransitReviewInboxAttachmentMetadata[];
  scannedCount: number;
  scannedEncodedCharacters: number;
  matchedDeclaredBytes: number;
  contentIntegrityVerified: false;
  coverage: "complete";
  atomicStorageSnapshotVerified: true;
};

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

export type TransitReviewInboxAttachmentRepository = {
  readAttachmentPurposeMetadataSnapshot(options: {
    mediaType: string;
    description: string;
    unlinkedOnly: true;
  }): Promise<TransitReviewInboxAttachmentMetadataSnapshot>;
  createAttachmentOnce(input: {
    fileName: string;
    mediaType: string;
    bytes: Uint8Array;
    description?: string;
    link?: null;
  }): Promise<{ record: LocalAttachmentRecord; created: boolean }>;
  readAttachmentBytes(
    id: string,
    options?: { expectedContentHash?: string }
  ): Promise<Uint8Array | null>;
  deleteAttachment(
    id: string,
    options?: { expectedContentHash?: string }
  ): Promise<void>;
};

type LoadedArtifact = {
  record: TransitReviewInboxAttachmentMetadata;
  raw: string | null;
  inspection: TransitQueryAuditArtifactInspection | null;
  view: TransitReviewInboxArtifact;
};

type ValidLoadedArtifact = LoadedArtifact & {
  raw: string;
  inspection: TransitQueryAuditArtifactInspection;
};

type LoadedArtifactOfKind<Kind extends TransitQueryAuditArtifactInspection["kind"]> =
  LoadedArtifact & {
    raw: string;
    inspection: Extract<TransitQueryAuditArtifactInspection, { kind: Kind }>;
  };

type BundleContext = {
  context: TransitQueryReviewPreflightContext | null;
  error: unknown;
};

function isInboxAttachment(record: TransitReviewInboxAttachmentMetadata): boolean {
  return record.description === TRANSIT_REVIEW_INBOX_ATTACHMENT_DESCRIPTION &&
    record.mediaType === JSON_MEDIA_TYPE &&
    record.link === null;
}

function decodeUtf8(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new TransitReviewInboxError("INVALID_UTF8", "审核工件不是有效 UTF-8 文本。");
  }
}

function boundedVisibleText(value: unknown, fallback: string, limit: number): string {
  if (typeof value !== "string") return fallback;
  const normalized = value
    .normalize("NFC")
    .replace(/[\p{Cc}\p{Cf}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  if (!normalized) return fallback;
  const characters = Array.from(normalized);
  return characters.length <= limit
    ? normalized
    : `${characters.slice(0, limit).join("")}…`;
}

async function mapInboxTasks<Input, Output>(
  items: readonly Input[],
  mapper: (item: Input, index: number) => Promise<Output>
): Promise<Output[]> {
  const results = new Array<Output>(items.length);
  let nextIndex = 0;
  const worker = async (): Promise<void> => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]!, index);
    }
  };
  await Promise.all(Array.from(
    { length: Math.min(MAX_CONCURRENT_INBOX_TASKS, items.length) },
    () => worker()
  ));
  return results;
}

function reasonCode(reason: unknown): string | null {
  try {
    if (!reason || typeof reason !== "object") return null;
    const descriptor = Object.getOwnPropertyDescriptor(reason, "code");
    const code = descriptor && "value" in descriptor && typeof descriptor.value === "string"
      ? descriptor.value
      : null;
    const normalized = code?.trim() ?? "";
    return normalized.length > 0 &&
      normalized.length <= MAX_FAILURE_CODE_CHARACTERS &&
      /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/u.test(normalized)
      ? normalized
      : null;
  } catch {
    return null;
  }
}

function reasonMessage(reason: unknown, fallback: string): string {
  try {
    if (reason instanceof Error) {
      const message = reason.message;
      if (typeof message === "string" && message.trim().length > 0) {
        return boundedVisibleText(message, fallback, MAX_FAILURE_MESSAGE_CHARACTERS);
      }
    }
  } catch {
    // Hostile error-like values must remain ordinary preflight failures.
  }
  return fallback;
}

function initialArtifactView(record: TransitReviewInboxAttachmentMetadata): TransitReviewInboxArtifact {
  return {
    attachmentId: record.id,
    fileName: boundedVisibleText(
      record.fileName,
      "未命名审核工件",
      MAX_ATTACHMENT_FILE_NAME_CHARACTERS
    ),
    byteLength: record.byteLength,
    rawContentHash: record.contentHash,
    importedAt: record.createdAt,
    kind: "unknown",
    artifactDigest: null,
    reviewBundleDigest: null,
    candidateId: null,
    candidateDigest: null,
    status: "preflight_failed",
    errorCode: null,
    errorMessage: null
  };
}

function applyInspection(
  view: TransitReviewInboxArtifact,
  inspection: TransitQueryAuditArtifactInspection
): void {
  view.kind = inspection.kind;
  view.artifactDigest = inspection.artifactDigest;
  view.reviewBundleDigest = inspection.reviewBundleDigest;
  view.candidateId = inspection.candidateId;
  view.candidateDigest = inspection.candidateDigest;
}

function applyFailure(
  artifact: LoadedArtifact,
  reason: unknown,
  status: Extract<TransitReviewInboxArtifactStatus, "preflight_failed" | "local_record_corrupt"> = "preflight_failed"
): void {
  artifact.view.status = status;
  artifact.view.errorCode = reasonCode(reason);
  artifact.view.errorMessage = reasonMessage(reason, "审核工件预检失败。");
}

async function loadArtifact(
  record: TransitReviewInboxAttachmentMetadata,
  repository: TransitReviewInboxAttachmentRepository
): Promise<LoadedArtifact> {
  const loaded: LoadedArtifact = {
    record,
    raw: null,
    inspection: null,
    view: initialArtifactView(record)
  };
  try {
    if (!Number.isSafeInteger(record.byteLength) || record.byteLength < 0) {
      throw new TransitReviewInboxError(
        "LOCAL_RECORD_INVALID",
        "审核工件附件记录包含无效字节长度。"
      );
    }
    if (record.byteLength > MAX_TRANSIT_REVIEW_INBOX_ARTIFACT_BYTES) {
      throw new TransitReviewInboxError(
        "ARTIFACT_TOO_LARGE",
        "审核工件附件记录超过本地安全读取上限。"
      );
    }
    const bytes = await repository.readAttachmentBytes(record.id, {
      expectedContentHash: record.contentHash
    });
    if (!bytes) {
      throw new TransitReviewInboxError(
        "LOCAL_RECORD_INVALID",
        "审核工件元数据存在，但原始字节已经缺失。"
      );
    }
    if (bytes.byteLength > MAX_TRANSIT_REVIEW_INBOX_ARTIFACT_BYTES) {
      throw new TransitReviewInboxError(
        "ARTIFACT_TOO_LARGE",
        "审核工件原始字节超过本地安全读取上限。"
      );
    }
    if (bytes.byteLength !== record.byteLength) {
      throw new TransitReviewInboxError(
        "LOCAL_RAW_DIGEST_MISMATCH",
        "审核工件读取长度与附件记录不一致。"
      );
    }
    loaded.raw = decodeUtf8(bytes);
    loaded.inspection = await inspectTransitQueryAuditArtifact(loaded.raw);
    applyInspection(loaded.view, loaded.inspection);
  } catch (reason) {
    applyFailure(loaded, reason, loaded.raw === null ? "local_record_corrupt" : "preflight_failed");
  }
  return loaded;
}

function inboxCoverageLimit(message: string): TransitReviewInboxError {
  return new TransitReviewInboxError("INBOX_COVERAGE_LIMIT_EXCEEDED", message);
}

function strictOwnDataRecord(
  input: unknown,
  expectedKeys: readonly string[],
  label: string
): Record<string, unknown> {
  try {
    if (
      typeof input !== "object" || input === null || Array.isArray(input) ||
      Object.getPrototypeOf(input) !== Object.prototype ||
      Object.getOwnPropertySymbols(input).length > 0
    ) throw new TypeError();
    const actualKeys = Object.getOwnPropertyNames(input).sort();
    const sortedExpectedKeys = [...expectedKeys].sort();
    if (
      actualKeys.length !== sortedExpectedKeys.length ||
      actualKeys.some((key, index) => key !== sortedExpectedKeys[index])
    ) throw new TypeError();
    const output: Record<string, unknown> = {};
    for (const key of expectedKeys) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) throw new TypeError();
      output[key] = descriptor.value;
    }
    return output;
  } catch {
    throw new TransitReviewInboxError("LOCAL_RECORD_INVALID", `${label}必须是严格的自有数据对象。`);
  }
}

function strictDenseOwnDataArray(input: unknown, label: string): unknown[] {
  try {
    if (
      !Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype ||
      Object.getOwnPropertySymbols(input).length > 0 ||
      input.length > MAX_TRANSIT_REVIEW_INBOX_STORED_ARTIFACTS
    ) throw new TypeError();
    const names = Object.getOwnPropertyNames(input);
    if (names.length !== input.length + 1 || !names.includes("length")) throw new TypeError();
    const output: unknown[] = [];
    for (let index = 0; index < input.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) throw new TypeError();
      output.push(descriptor.value);
    }
    return output;
  } catch {
    throw new TransitReviewInboxError("LOCAL_RECORD_INVALID", `${label}必须是有界、稠密的自有数据数组。`);
  }
}

function snapshotAttachmentPurposeMetadataReceipt(
  input: unknown
): TransitReviewInboxAttachmentMetadataSnapshot {
  const rawSnapshot = strictOwnDataRecord(input, PURPOSE_SNAPSHOT_KEYS, "审核收件箱 purpose 快照回执");
  const rawFilter = strictOwnDataRecord(rawSnapshot.filter, PURPOSE_FILTER_KEYS, "审核收件箱 purpose 过滤器");
  const items = strictDenseOwnDataArray(rawSnapshot.items, "审核收件箱附件元数据").map((item) => {
    const rawItem = strictOwnDataRecord(item, ATTACHMENT_METADATA_KEYS, "审核收件箱附件元数据项");
    return Object.freeze({ ...rawItem }) as unknown as TransitReviewInboxAttachmentMetadata;
  });
  return Object.freeze({
    filter: Object.freeze({ ...rawFilter }),
    items: Object.freeze(items),
    scannedCount: rawSnapshot.scannedCount,
    scannedEncodedCharacters: rawSnapshot.scannedEncodedCharacters,
    matchedDeclaredBytes: rawSnapshot.matchedDeclaredBytes,
    contentIntegrityVerified: rawSnapshot.contentIntegrityVerified,
    coverage: rawSnapshot.coverage,
    atomicStorageSnapshotVerified: rawSnapshot.atomicStorageSnapshotVerified
  }) as unknown as TransitReviewInboxAttachmentMetadataSnapshot;
}

async function readTransitReviewInboxAttachmentMetadata(
  repository: TransitReviewInboxAttachmentRepository
): Promise<TransitReviewInboxAttachmentMetadata[]> {
  let snapshot: TransitReviewInboxAttachmentMetadataSnapshot;
  try {
    const rawSnapshot = await repository.readAttachmentPurposeMetadataSnapshot({
      mediaType: JSON_MEDIA_TYPE,
      description: TRANSIT_REVIEW_INBOX_ATTACHMENT_DESCRIPTION,
      unlinkedOnly: true
    });
    snapshot = snapshotAttachmentPurposeMetadataReceipt(rawSnapshot);
  } catch (reason) {
    if (reason instanceof LocalAttachmentPurposeMetadataSnapshotLimitError) {
      throw inboxCoverageLimit(reason.message);
    }
    throw reason;
  }

  let matchedRawBytes = 0;
  const seenIds = new Set<string>();
  if (
    snapshot.coverage !== "complete" ||
    snapshot.atomicStorageSnapshotVerified !== true ||
    snapshot.contentIntegrityVerified !== false ||
    snapshot.filter?.mediaType !== JSON_MEDIA_TYPE ||
    snapshot.filter?.description !== TRANSIT_REVIEW_INBOX_ATTACHMENT_DESCRIPTION ||
    snapshot.filter?.unlinkedOnly !== true ||
    !Array.isArray(snapshot.items) ||
    snapshot.items.length > MAX_TRANSIT_REVIEW_INBOX_STORED_ARTIFACTS ||
    !Number.isSafeInteger(snapshot.scannedCount) ||
    snapshot.scannedCount < snapshot.items.length ||
    snapshot.scannedCount > MAX_TRANSIT_REVIEW_INBOX_SCAN_ROWS ||
    !Number.isSafeInteger(snapshot.scannedEncodedCharacters) ||
    snapshot.scannedEncodedCharacters < 0 ||
    snapshot.scannedEncodedCharacters > MAX_TRANSIT_REVIEW_INBOX_SCAN_BASE64_CODE_UNITS ||
    !Number.isSafeInteger(snapshot.matchedDeclaredBytes) ||
    snapshot.matchedDeclaredBytes < 0 ||
    snapshot.matchedDeclaredBytes > MAX_TRANSIT_REVIEW_INBOX_TOTAL_RAW_BYTES
  ) {
    throw new TransitReviewInboxError(
      "LOCAL_RECORD_INVALID",
      "审核收件箱附件 purpose 快照回执无效。"
    );
  }
  for (const record of snapshot.items) {
    if (
      !isInboxAttachment(record) ||
      "contentBase64" in record ||
      record.schemaVersion !== "1.0.0" ||
      record.recordVersion !== 1 ||
      record.recordType !== "local_attachment" ||
      record.contentIntegrity !== "unchecked" ||
      typeof record.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(record.id) ||
      typeof record.fileName !== "string" || record.fileName.length < 1 || record.fileName.length > 255 ||
      typeof record.contentHash !== "string" || !/^[0-9a-f]{64}$/u.test(record.contentHash) ||
      typeof record.createdAt !== "string" || record.createdAt.length > 64 ||
      typeof record.updatedAt !== "string" || record.updatedAt.length > 64 ||
      !Number.isSafeInteger(record.byteLength) ||
      record.byteLength < 0 ||
      seenIds.has(record.id)
    ) {
      throw new TransitReviewInboxError(
        "LOCAL_RECORD_INVALID",
        "审核收件箱 purpose 快照包含无效或重复附件元数据。"
      );
    }
    seenIds.add(record.id);
    matchedRawBytes += record.byteLength;
  }
  if (
    matchedRawBytes !== snapshot.matchedDeclaredBytes ||
    matchedRawBytes > MAX_TRANSIT_REVIEW_INBOX_TOTAL_RAW_BYTES
  ) {
    throw new TransitReviewInboxError(
      "LOCAL_RECORD_INVALID",
      "审核收件箱 purpose 快照的匹配字节汇总不一致。"
    );
  }
  return [...snapshot.items];
}

export async function importTransitReviewInboxArtifact(
  input: { fileName: string; bytes: Uint8Array },
  repository: TransitReviewInboxAttachmentRepository = caseRepository
): Promise<{
  artifact: TransitQueryAuditArtifactInspection;
  attachment: LocalAttachmentRecord;
  created: boolean;
}> {
  if (input.bytes.byteLength > MAX_TRANSIT_REVIEW_INBOX_ARTIFACT_BYTES) {
    throw new TransitReviewInboxError(
      "ARTIFACT_TOO_LARGE",
      `单个运限审核工件不能超过 ${MAX_TRANSIT_REVIEW_INBOX_ARTIFACT_BYTES / 1024 / 1024} MiB。`
    );
  }
  const bytes = Uint8Array.from(input.bytes);
  const raw = decodeUtf8(bytes);
  const artifact = await inspectTransitQueryAuditArtifact(raw);
  const stored = await repository.createAttachmentOnce({
    fileName: input.fileName,
    mediaType: JSON_MEDIA_TYPE,
    bytes,
    description: TRANSIT_REVIEW_INBOX_ATTACHMENT_DESCRIPTION,
    link: null
  });
  return { artifact, attachment: stored.record, created: stored.created };
}

export async function readTransitReviewInboxArtifactBytes(
  artifact: Pick<TransitReviewInboxArtifact, "attachmentId" | "rawContentHash">,
  repository: TransitReviewInboxAttachmentRepository = caseRepository
): Promise<Uint8Array> {
  const bytes = await repository.readAttachmentBytes(artifact.attachmentId, {
    expectedContentHash: artifact.rawContentHash
  });
  if (!bytes) {
    throw new TransitReviewInboxError("LOCAL_RECORD_INVALID", "审核工件原始字节不存在。");
  }
  if (bytes.byteLength > MAX_TRANSIT_REVIEW_INBOX_ARTIFACT_BYTES) {
    throw new TransitReviewInboxError("ARTIFACT_TOO_LARGE", "审核工件原始字节超过本地安全读取上限。");
  }
  return bytes;
}

export async function deleteTransitReviewInboxArtifact(
  artifact: Pick<TransitReviewInboxArtifact, "attachmentId" | "rawContentHash">,
  repository: TransitReviewInboxAttachmentRepository = caseRepository
): Promise<void> {
  await repository.deleteAttachment(artifact.attachmentId, {
    expectedContentHash: artifact.rawContentHash
  });
}

export async function readTransitReviewInboxProjection(
  repository: TransitReviewInboxAttachmentRepository = caseRepository
): Promise<TransitReviewInboxProjection> {
  const records = await readTransitReviewInboxAttachmentMetadata(repository);
  const loaded = await mapInboxTasks(records, (record) => loadArtifact(record, repository));
  const valid = loaded.filter((artifact): artifact is ValidLoadedArtifact =>
    artifact.raw !== null && artifact.inspection !== null);

  const bundlesByDigest = new Map<string, typeof valid>();
  for (const artifact of valid) {
    if (artifact.inspection.kind !== "review_bundle") continue;
    const list = bundlesByDigest.get(artifact.inspection.reviewBundleDigest) ?? [];
    list.push(artifact);
    bundlesByDigest.set(artifact.inspection.reviewBundleDigest, list);
  }

  const contextByDigest = new Map<string, BundleContext>();
  await mapInboxTasks([...bundlesByDigest.entries()], async ([digest, artifacts]) => {
    try {
      const context = await createTransitQueryReviewPreflightContext(artifacts[0]!.raw);
      contextByDigest.set(digest, { context, error: null });
      for (const artifact of artifacts) artifact.view.status = "bundle_current";
    } catch (reason) {
      contextByDigest.set(digest, { context: null, error: reason });
      for (const artifact of artifacts) applyFailure(artifact, reason);
    }
  });

  const reviews = valid.filter((artifact): artifact is LoadedArtifactOfKind<"independent_review"> =>
    artifact.inspection.kind === "independent_review");
  const passedReviewsByDigest = new Map<string, LoadedArtifactOfKind<"independent_review">>();
  await mapInboxTasks(reviews, async (artifact) => {
    const contextState = contextByDigest.get(artifact.inspection.reviewBundleDigest);
    if (!contextState) {
      artifact.view.status = "waiting_for_review_bundle";
      return;
    }
    if (!contextState.context) {
      applyFailure(artifact, contextState.error);
      return;
    }
    try {
      await preflightTransitQueryIndependentReviewInContext(artifact.raw, contextState.context);
      artifact.view.status = "review_structure_passed_unverified";
    } catch (reason) {
      applyFailure(artifact, reason);
    }
  });
  for (const artifact of reviews) {
    if (artifact.view.status !== "review_structure_passed_unverified") continue;
    if (!passedReviewsByDigest.has(artifact.inspection.artifactDigest)) {
      passedReviewsByDigest.set(artifact.inspection.artifactDigest, artifact);
    }
  }

  const adjudications = valid.filter((artifact): artifact is LoadedArtifactOfKind<"adjudication"> =>
    artifact.inspection.kind === "adjudication");
  await mapInboxTasks(adjudications, async (artifact) => {
    const contextState = contextByDigest.get(artifact.inspection.reviewBundleDigest);
    if (!contextState) {
      artifact.view.status = "waiting_for_review_bundle";
      return;
    }
    if (!contextState.context) {
      applyFailure(artifact, contextState.error);
      return;
    }
    const reviewDigests = artifact.inspection.envelope.payload.independentReviewDigests;
    const reviewA = passedReviewsByDigest.get(reviewDigests[0]);
    const reviewB = passedReviewsByDigest.get(reviewDigests[1]);
    if (!reviewA || !reviewB) {
      artifact.view.status = "waiting_for_independent_reviews";
      return;
    }
    try {
      await preflightTransitQueryAdjudicationInContext(
        artifact.raw,
        contextState.context,
        [reviewA.raw, reviewB.raw]
      );
      artifact.view.status = "adjudication_structure_passed_unverified";
    } catch (reason) {
      applyFailure(artifact, reason);
    }
  });

  const batchDigests = new Set(valid.map((artifact) => artifact.inspection.reviewBundleDigest));
  const batches: TransitReviewInboxBatch[] = [...batchDigests].sort().map((reviewBundleDigest) => {
    const bundleArtifacts = valid.filter((artifact) =>
      artifact.inspection.kind === "review_bundle" &&
      artifact.inspection.reviewBundleDigest === reviewBundleDigest
    );
    const batchArtifacts = valid.filter((artifact) =>
      artifact.inspection.reviewBundleDigest === reviewBundleDigest &&
      artifact.inspection.kind !== "review_bundle"
    );
    const bundle = bundleArtifacts[0]?.inspection.kind === "review_bundle"
      ? bundleArtifacts[0].inspection.envelope
      : null;
    const candidates = (bundle?.payload.candidates ?? []).map((candidate) => {
      const candidateArtifacts = batchArtifacts.filter((artifact) =>
        artifact.inspection.candidateId === candidate.id &&
        artifact.inspection.candidateDigest === candidate.candidateDigest
      );
      const reviewArtifacts = candidateArtifacts.filter((artifact) => artifact.inspection.kind === "independent_review");
      const adjudicationArtifacts = candidateArtifacts.filter((artifact) => artifact.inspection.kind === "adjudication");
      return {
        candidateId: candidate.id,
        candidateDigest: candidate.candidateDigest,
        title: candidate.title,
        nodeType: candidate.nodeType,
        reviewArtifactIds: reviewArtifacts.map((artifact) => artifact.record.id),
        passedReviewCount: new Set(reviewArtifacts
          .filter((artifact) => artifact.view.status === "review_structure_passed_unverified")
          .map((artifact) => artifact.inspection.artifactDigest)).size,
        adjudicationArtifactIds: adjudicationArtifacts.map((artifact) => artifact.record.id),
        passedAdjudicationCount: new Set(adjudicationArtifacts
          .filter((artifact) => artifact.view.status === "adjudication_structure_passed_unverified")
          .map((artifact) => artifact.inspection.artifactDigest)).size
      } satisfies TransitReviewInboxCandidate;
    });
    const modeledIds = new Set(candidates.flatMap((candidate) => [
      ...candidate.reviewArtifactIds,
      ...candidate.adjudicationArtifactIds
    ]));
    return {
      reviewBundleDigest,
      bundleArtifactIds: bundleArtifacts.map((artifact) => artifact.record.id),
      currentBundle: bundleArtifacts.some((artifact) => artifact.view.status === "bundle_current"),
      candidates,
      orphanArtifactIds: batchArtifacts
        .filter((artifact) => !modeledIds.has(artifact.record.id))
        .map((artifact) => artifact.record.id)
    };
  });

  const artifacts = loaded.map((artifact) => artifact.view);
  const uniquePassedDigests = (status: TransitReviewInboxArtifactStatus): number => new Set(
    artifacts
      .filter((artifact) => artifact.status === status && artifact.artifactDigest !== null)
      .map((artifact) => artifact.artifactDigest)
  ).size;
  return {
    refreshedAt: new Date().toISOString(),
    evidenceBoundary: "local_unverified",
    identityVerified: false,
    sourceAuthenticityVerified: false,
    eligibleForFixtureIntegration: false,
    countsAsVerifiedGold: false,
    verifiedTransitFactsDelta: 0,
    verifiedQueryAdjudicationsDelta: 0,
    artifacts,
    batches,
    summary: {
      storedArtifacts: artifacts.length,
      currentBundles: uniquePassedDigests("bundle_current"),
      passedIndependentReviews: uniquePassedDigests("review_structure_passed_unverified"),
      passedAdjudications: uniquePassedDigests("adjudication_structure_passed_unverified"),
      waitingDependencies: artifacts.filter((artifact) =>
        artifact.status === "waiting_for_review_bundle" ||
        artifact.status === "waiting_for_independent_reviews").length,
      failedOrCorrupt: artifacts.filter((artifact) =>
        artifact.status === "preflight_failed" || artifact.status === "local_record_corrupt").length
    }
  };
}
