import type { LocalAttachmentRecord } from "@hakimi/contracts";
import {
  createTransitQueryReviewPreflightContext,
  inspectTransitQueryAuditArtifact,
  preflightTransitQueryAdjudicationInContext,
  preflightTransitQueryIndependentReviewInContext,
  type TransitQueryAuditArtifactInspection,
  type TransitQueryReviewPreflightContext
} from "@hakimi/research-query/transit-review";
import { caseRepository } from "@hakimi/storage";

export const TRANSIT_REVIEW_INBOX_ATTACHMENT_DESCRIPTION =
  "哈基米运限审核收件箱 · 本地未核验 · v1";
export const MAX_TRANSIT_REVIEW_INBOX_ARTIFACT_BYTES = 2 * 1024 * 1024;

const JSON_MEDIA_TYPE = "application/json";

export type TransitReviewInboxErrorCode =
  | "INVALID_UTF8"
  | "ARTIFACT_TOO_LARGE"
  | "LOCAL_RECORD_INVALID"
  | "LOCAL_RAW_DIGEST_MISMATCH";

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

export type TransitReviewInboxAttachmentRepository = {
  listAttachments(): Promise<LocalAttachmentRecord[]>;
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
  record: LocalAttachmentRecord;
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

function isInboxAttachment(record: LocalAttachmentRecord): boolean {
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

function reasonCode(reason: unknown): string | null {
  if (!reason || typeof reason !== "object") return null;
  const descriptor = Object.getOwnPropertyDescriptor(reason, "code");
  return descriptor && "value" in descriptor && typeof descriptor.value === "string"
    ? descriptor.value
    : null;
}

function reasonMessage(reason: unknown, fallback: string): string {
  return reason instanceof Error && reason.message ? reason.message : fallback;
}

function initialArtifactView(record: LocalAttachmentRecord): TransitReviewInboxArtifact {
  return {
    attachmentId: record.id,
    fileName: record.fileName,
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
  record: LocalAttachmentRecord,
  repository: TransitReviewInboxAttachmentRepository
): Promise<LoadedArtifact> {
  const loaded: LoadedArtifact = {
    record,
    raw: null,
    inspection: null,
    view: initialArtifactView(record)
  };
  try {
    const bytes = await repository.readAttachmentBytes(record.id, {
      expectedContentHash: record.contentHash
    });
    if (!bytes) {
      throw new TransitReviewInboxError(
        "LOCAL_RECORD_INVALID",
        "审核工件元数据存在，但原始字节已经缺失。"
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
  const records = (await repository.listAttachments()).filter(isInboxAttachment);
  const loaded = await Promise.all(records.map((record) => loadArtifact(record, repository)));
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
  await Promise.all([...bundlesByDigest.entries()].map(async ([digest, artifacts]) => {
    try {
      const context = await createTransitQueryReviewPreflightContext(artifacts[0]!.raw);
      contextByDigest.set(digest, { context, error: null });
      for (const artifact of artifacts) artifact.view.status = "bundle_current";
    } catch (reason) {
      contextByDigest.set(digest, { context: null, error: reason });
      for (const artifact of artifacts) applyFailure(artifact, reason);
    }
  }));

  const reviews = valid.filter((artifact): artifact is LoadedArtifactOfKind<"independent_review"> =>
    artifact.inspection.kind === "independent_review");
  const passedReviewsByDigest = new Map<string, LoadedArtifactOfKind<"independent_review">>();
  await Promise.all(reviews.map(async (artifact) => {
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
      passedReviewsByDigest.set(artifact.inspection.artifactDigest, artifact);
    } catch (reason) {
      applyFailure(artifact, reason);
    }
  }));

  const adjudications = valid.filter((artifact): artifact is LoadedArtifactOfKind<"adjudication"> =>
    artifact.inspection.kind === "adjudication");
  await Promise.all(adjudications.map(async (artifact) => {
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
  }));

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
